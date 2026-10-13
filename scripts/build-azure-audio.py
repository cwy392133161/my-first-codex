"""Pre-generate Azure Speech MP3s. Never loaded by the website.

Credentials come only from SPEECH_KEY in the secure execution environment.
Output stays in .audio-build/azure until generation and review are complete.
"""
import argparse
import array
from contextlib import contextmanager
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import hashlib
from html import escape
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
VOICE = 'en-US-JennyNeural'
LANGUAGE = 'en-US'
REGION = 'eastus'
ENDPOINT = 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1'
OUTPUT_FORMAT = 'audio-24khz-96kbitrate-mono-mp3'
MAX_AUDIO_BYTES = 10 * 1024 * 1024
REQUEST_INTERVAL = 4.0
WINDOW_SECONDS = 60.0
WINDOW_REQUESTS = 20
DEFAULT_BUDGET = 500_000  # Local conservative ceiling; not the Azure remaining balance.
CONFIG = {'provider': 'Azure Speech', 'voice': VOICE, 'language': LANGUAGE,
          'style': 'default', 'rate': 'normal', 'format': OUTPUT_FORMAT, 'pipeline': 1}
# These readings are the meanings taught by the current independent question bank.
READINGS = {'close': 'kloʊz', 'read': 'riːd', 'reads': 'riːdz',
            'minute': 'ˈmɪnɪt', 'minutes': 'ˈmɪnɪts'}


class SafeError(Exception):
    """Only locally constructed, credential-free messages may reach the terminal."""


def json_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()


def make_ssml(text):
    if not isinstance(text, str) or not text.strip():
        raise SafeError('朗读文本不能为空。')
    if any(ord(char) < 32 and char not in '\t\n\r' for char in text):
        raise SafeError('朗读文本包含不支持的控制字符。')
    pieces = []
    for part in re.split(r'(\b(?:close|read|reads|minute|minutes)\b)', text, flags=re.IGNORECASE):
        reading = READINGS.get(part.lower())
        if reading:
            pieces.append(f'<phoneme alphabet="ipa" ph="{reading}">{escape(part)}</phoneme>')
        else:
            pieces.append(escape(part))
    ssml = ('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xml:lang="{LANGUAGE}"><voice name="{VOICE}">' + ''.join(pieces) + '</voice></speak>')
    if len(ssml.encode()) > 64_000:
        raise SafeError('单段朗读文本过长，请先分句。')
    return ssml


def fingerprint(ssml):
    # A new question must not invalidate every other recording in the bank.
    return hashlib.sha256(json_bytes({'ssml': ssml, 'format': OUTPUT_FORMAT, 'pipeline': 1})).hexdigest()


def prepare_clips(clips):
    result, keys, paths = [], {}, {}
    for clip in clips:
        key, text = clip['key'], clip['text']
        if not isinstance(key, str) or not key:
            raise SafeError('朗读索引不能为空。')
        ssml = make_ssml(text)
        digest = fingerprint(ssml)
        path = 'assets/audio/' + digest[:20] + '.mp3'
        if path in paths and paths[path] != digest:
            raise SafeError('音频文件名发生冲突。')
        paths[path] = digest
        if key in keys:
            if keys[key]['digest'] != digest:
                raise SafeError('同一朗读索引对应不同文本，请先检查题库。')
            continue
        item = {'key': key, 'text': text, 'ssml': ssml, 'digest': digest,
                'path': path, 'sources': clip.get('sources', [])}
        keys[key] = item
        result.append(item)
    if not result:
        raise SafeError('题库没有可生成的朗读文本。')
    return result


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as file:
        for block in iter(lambda: file.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def subprocess_environment():
    # Text collection and decoding do not need access to the synthesis credential.
    return {name: os.environ[name] for name in os.environ if name != 'SPEECH_KEY'}


def validate_audio(path):
    path = Path(path)
    if not path.is_file() or not 200 <= path.stat().st_size <= MAX_AUDIO_BYTES:
        raise SafeError('音频文件缺失或大小异常。')
    with path.open('rb') as file:
        header = file.read(3)
    if not (header == b'ID3' or (len(header) >= 2 and header[0] == 255 and header[1] & 224 == 224)):
        raise SafeError('服务返回的内容不是 MP3。')
    if not shutil.which('ffmpeg'):
        raise SafeError('请先安装 FFmpeg，再进行音频验证。')
    decoded = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-xerror',
                              '-i', str(path), '-t', '601', '-f', 's16le', '-ac', '1',
                              '-ar', '24000', '-'], capture_output=True, timeout=45,
                             env=subprocess_environment())
    if decoded.returncode or decoded.stderr or len(decoded.stdout) % 2:
        raise SafeError('MP3 完整解码检查失败，未接受这段音频。')
    samples = array.array('h', decoded.stdout)
    if sys.byteorder != 'little':
        samples.byteswap()
    duration = len(samples) / 24000
    if not .08 <= duration <= 600 or not samples or max(abs(n) for n in samples) <= 164:
        raise SafeError('音频时长或声音检查失败，未接受这段音频。')
    return {'bytes': path.stat().st_size, 'sha256': sha256_file(path), 'duration': round(duration, 4)}


def atomic_bytes(path, body):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.pending-', delete=False) as file:
            temporary = Path(file.name)
            file.write(body)
        temporary.replace(path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def atomic_json(path, data):
    atomic_bytes(path, json.dumps(data, ensure_ascii=False, indent=2).encode() + b'\n')


def cache_info(stage, clip):
    file, metadata = stage / clip['path'], stage / 'cache' / (clip['digest'] + '.json')
    try:
        record = json.loads(metadata.read_text())
        if not isinstance(record, dict):
            return None
        if record.get('digest') != clip['digest'] or record.get('configuration') != CONFIG:
            return None
        if record.get('sha256') != sha256_file(file):
            return None
        actual = validate_audio(file)
        if actual != {key: record[key] for key in ('bytes', 'sha256', 'duration')}:
            return None
        return actual
    except (OSError, ValueError, KeyError, SafeError, subprocess.SubprocessError):
        return None


def manifest_voice():
    profile = 'azure-jenny-v1-' + hashlib.sha256(json_bytes(CONFIG)).hexdigest()[:12]
    return {'name': VOICE, 'language': LANGUAGE, 'source': 'Azure Speech',
            'kind': 'pre-generated', 'profile': profile, 'style': 'default',
            'rate': 'normal', 'format': OUTPUT_FORMAT}


def committed_catalog(root):
    """Read public Azure provenance without executing JavaScript or trusting old MP3s.

    A checkout does not contain the private stage cache. The committed manifest
    and audit can supply it, but only for this exact provider and configuration.
    Archived pronunciation previews and other providers are never searched.
    """
    try:
        source = (root / 'data/audio-manifest.js').read_text(encoding='utf-8')
        match = re.search(r'\bconst\s+manifest\s*=\s*(\{.*\});\s*\n', source, re.DOTALL)
        if not match:
            return None
        manifest = json.loads(match.group(1))
        audit = json.loads((root / 'data/audio-audit.json').read_text(encoding='utf-8'))
        if (not isinstance(manifest, dict) or manifest.get('version') != 3
                or manifest.get('voice') != manifest_voice()
                or not isinstance(manifest.get('clips'), dict)
                or not isinstance(audit, dict) or audit.get('version') != 1
                or audit.get('configuration') != CONFIG or audit.get('region') != REGION
                or not isinstance(audit.get('clips'), list)):
            return None
        records = {}
        for record in audit['clips']:
            if isinstance(record, dict) and isinstance(record.get('digest'), str):
                records.setdefault(record['digest'], []).append(record)
        return {'clips': manifest['clips'], 'records': records}
    except (OSError, ValueError, TypeError):
        return None


def committed_cache_info(root, clip, catalog):
    """Require matching text, SSML digest, live mapping, hash and full decode."""
    if not catalog:
        return None
    for record in catalog['records'].get(clip['digest'], []):
        try:
            # A new lookup alias may reuse an identical recording. Its original
            # index must still be represented by the committed live manifest.
            if (record.get('text') != clip['text'] or record.get('path') != clip['path']
                    or catalog['clips'].get(record['key']) != clip['path']
                    or fingerprint(make_ssml(record['text'])) != clip['digest']):
                continue
            file = root / clip['path']
            if record.get('bytes') != file.stat().st_size or record.get('sha256') != sha256_file(file):
                continue
            actual = validate_audio(file)
            if actual == {key: record[key] for key in ('bytes', 'sha256', 'duration')}:
                return actual
        except (OSError, ValueError, KeyError, TypeError, SafeError, subprocess.SubprocessError):
            continue
    return None


def import_committed_clip(root, stage, clip, info):
    """Copy a verified public recording atomically, without inventing quota usage."""
    folder = stage / 'assets/audio'
    folder.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        body = (root / clip['path']).read_bytes()
        if len(body) != info['bytes'] or hashlib.sha256(body).hexdigest() != info['sha256']:
            raise SafeError('已提交音频在导入期间发生变化；已停止，请重新检查后续跑。')
        with tempfile.NamedTemporaryFile(dir=folder, suffix='.mp3', prefix='.pending-', delete=False) as file:
            temporary = Path(file.name)
            file.write(body)
        if validate_audio(temporary) != info:
            raise SafeError('已提交音频导入验证失败；没有接受这段录音。')
        temporary.replace(stage / clip['path'])
        atomic_json(stage / 'cache' / (clip['digest'] + '.json'), {
            'digest': clip['digest'], 'configuration': CONFIG.copy(), **info,
        })
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


@contextmanager
def single_instance(stage):
    stage.mkdir(parents=True, exist_ok=True)
    lock = (stage / '.generation.lock').open('a+b')
    acquired = False
    try:
        try:
            if os.name == 'nt':
                import msvcrt
                lock.seek(0)
                if not lock.read(1):
                    lock.write(b'0'); lock.flush()
                lock.seek(0)
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            acquired = True
        except OSError:
            raise SafeError('另一个生成进程正在运行，请等待它结束。') from None
        yield
    finally:
        if acquired:
            if os.name == 'nt':
                import msvcrt
                lock.seek(0); msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
        lock.close()


class RateLedger:
    def __init__(self, path, clock, sleep, budget, max_wait):
        self.path, self.clock, self.sleep = path, clock, sleep
        self.budget, self.max_wait = budget, max_wait
        try:
            self.data = json.loads(path.read_text())
        except FileNotFoundError:
            self.data = {'version': 1, 'month': '', 'characters': 0, 'requests': [], 'notBefore': 0}
        except (OSError, ValueError):
            raise SafeError('本地限流记录损坏；请检查记录后再生成，不能自动忽略额度。') from None
        try:
            valid = (self.data['version'] == 1
                     and type(self.data['characters']) is int and self.data['characters'] >= 0
                     and isinstance(self.data['requests'], list) and len(self.data['requests']) <= 20
                     and all(type(n) in (int, float) and math.isfinite(n) and n >= 0
                             for n in self.data['requests'])
                     and self.data['requests'] == sorted(self.data['requests'])
                     and type(self.data['notBefore']) in (int, float)
                     and math.isfinite(self.data['notBefore']) and self.data['notBefore'] >= 0
                     and isinstance(self.data['month'], str))
            if not valid:
                raise ValueError('invalid ledger')
        except (KeyError, TypeError, ValueError):
            raise SafeError('本地限流记录格式异常。') from None
        self.requests_sent, self.reserved_characters = 0, 0

    def wait_until(self, target):
        wait = max(0.0, target - self.clock())
        if wait > self.max_wait:
            raise SafeError('所需等待超过本次上限；进度已保留，请稍后续跑。')
        if wait:
            self.sleep(wait)

    def before_request(self, characters):
        now = self.clock()
        times = [t for t in self.data['requests'] if now - t < WINDOW_SECONDS]
        target = self.data['notBefore']
        if times:
            target = max(target, times[-1] + REQUEST_INTERVAL)
        if len(times) >= WINDOW_REQUESTS:
            target = max(target, times[0] + WINDOW_SECONDS + .01)
        self.wait_until(target)
        now = self.clock()
        month = datetime.fromtimestamp(now, timezone.utc).strftime('%Y-%m')
        if self.data['month'] != month:
            self.data['month'], self.data['characters'] = month, 0
        if self.data['characters'] + characters > self.budget:
            raise SafeError('达到本地字符预算，已保留进度。请核对 Azure 本月剩余额度。')
        self.data['requests'] = [t for t in times if now - t < WINDOW_SECONDS] + [now]
        self.data['characters'] += characters  # Failures/timeouts may also consume quota.
        atomic_json(self.path, self.data)
        self.requests_sent += 1
        self.reserved_characters += characters

    def defer(self, seconds):
        self.data['notBefore'] = max(self.data['notBefore'], self.clock() + seconds)
        atomic_json(self.path, self.data)
        self.wait_until(self.data['notBefore'])


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, newurl):
        raise SafeError('Azure 接口返回重定向，已停止以避免转发密钥。')


def azure_transport(request):
    opener = urllib.request.build_opener(NoRedirect())
    with opener.open(request, timeout=35) as response:
        if response.status != 200:
            raise SafeError('Azure 接口未返回成功状态。')
        body = response.read(MAX_AUDIO_BYTES + 1)
    if len(body) > MAX_AUDIO_BYTES:
        raise SafeError('服务返回的音频超过大小上限。')
    return body


def retry_seconds(headers, attempt, clock):
    header = headers.get('Retry-After') if headers else None
    if header is not None:
        try:
            seconds = float(header)
            if math.isfinite(seconds) and seconds >= 0:
                return seconds
        except (ValueError, TypeError):
            pass
        try:
            date = parsedate_to_datetime(header)
            return max(0.0, date.timestamp() - clock())
        except (ValueError, TypeError, OverflowError):
            pass
    return min(60.0, 4.0 * 2 ** attempt)


def synthesize(clip, key, ledger, transport, max_attempts):
    for attempt in range(max_attempts):
        ledger.before_request(len(clip['ssml']))  # Deliberate conservative upper bound.
        request = urllib.request.Request(ENDPOINT, data=clip['ssml'].encode(), method='POST', headers={
            'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': OUTPUT_FORMAT, 'User-Agent': 'LearningGardenAudioBuilder/1.0',
        })
        delay = None
        try:
            body = transport(request)
            if not isinstance(body, bytes) or len(body) > MAX_AUDIO_BYTES:
                raise SafeError('服务返回的音频数据异常。')
            return body
        except urllib.error.HTTPError as error:
            code = error.code if isinstance(error.code, int) else 0
            if code in (401, 403):
                raise SafeError(f'Azure HTTP {code}：认证或资源额度检查失败，请核对密钥、区域和 F0 额度。') from None
            if code not in (429, 500, 502, 503, 504) or attempt + 1 == max_attempts:
                raise SafeError(f'Azure HTTP {code}：生成失败，已保留完成的文件。') from None
            delay = retry_seconds(error.headers, attempt, ledger.clock)
        except urllib.error.URLError as error:
            if 'Tunnel connection failed: 403' in str(error.reason):
                raise SafeError('网络代理拒绝 Azure 连接（403）；请应用环境网络配置。') from None
            if attempt + 1 == max_attempts:
                raise SafeError('Azure 网络连接失败，已保留进度；请检查网络后续跑。') from None
            delay = retry_seconds(None, attempt, ledger.clock)
        except (TimeoutError, ConnectionError):
            if attempt + 1 == max_attempts:
                raise SafeError('Azure 请求超时，已保留进度；请稍后续跑。') from None
            delay = retry_seconds(None, attempt, ledger.clock)
        ledger.defer(delay)
    raise SafeError('生成重试次数已用完。')


def build(root, clips, *, dry_run=False, limit=0, transport=None, clock=time.time, sleep=time.sleep,
          max_attempts=4, max_wait=120, budget=DEFAULT_BUDGET, verify_only=False):
    root = Path(root)
    if limit < 0 or not 1 <= max_attempts <= 6 or not 0 <= max_wait <= 300 or not 0 < budget <= DEFAULT_BUDGET:
        raise SafeError('生成参数超出支持范围。')
    prepared = prepare_clips(clips)
    stage = root / '.audio-build/azure'
    selected = prepared[:limit] if limit else prepared
    catalog = committed_catalog(root)
    cached, committed = {}, set()
    for clip in selected:
        if clip['digest'] not in cached:
            info = cache_info(stage, clip)
            if not info:
                info = committed_cache_info(root, clip, catalog)
                if info:
                    committed.add(clip['digest'])
            cached[clip['digest']] = info
    missing = {clip['digest']: clip for clip in selected if not cached[clip['digest']]}
    summary = {'totalClips': len(prepared), 'selectedClips': len(selected),
               'newRequests': len(missing),
               'reusedClips': sum(bool(cached[c['digest']]) for c in selected),
               'committedReusedClips': sum(c['digest'] in committed for c in selected),
               'spokenCharacters': sum(len(c['text']) for c in missing.values()),
               'conservativeCharacters': sum(len(c['ssml']) for c in missing.values()),
               'configuration': CONFIG.copy(), 'stage': '.audio-build/azure', 'complete': False}
    if dry_run:
        return {**summary, 'dryRun': True}
    if verify_only:
        if missing:
            raise SafeError('有音频缺失或验证失败，验证模式不会调用 Azure；请先完成生成。')
        return {**summary, 'verifiedClips': len(selected), 'complete': not limit}
    if not shutil.which('ffmpeg'):
        raise SafeError('请先安装 FFmpeg。')
    if os.environ.get('SPEECH_REGION', REGION).strip().lower() != REGION:
        raise SafeError('此项目使用 eastus，请设置 SPEECH_REGION=eastus。')
    key = os.environ.get('SPEECH_KEY') if missing else None
    if missing and not key:
        raise SafeError('未配置 SPEECH_KEY。请在云环境设置的密钥区域安全填写，不要发在聊天里。')
    with single_instance(stage):
        ledger = RateLedger(stage / 'ledger.json', clock, sleep, budget, max_wait)
        catalog = committed_catalog(root)  # Re-read provenance after acquiring the lock.
        verified = {}
        imported = set()
        for index, clip in enumerate(selected):
            # Check again while holding the lock, because an earlier process may have finished.
            info = cache_info(stage, clip)
            if not info:
                info = committed_cache_info(root, clip, catalog)
                if info:
                    import_committed_clip(root, stage, clip, info)
                    imported.add(clip['digest'])
            if not info:
                key = os.environ.get('SPEECH_KEY')
                if not key:
                    raise SafeError('未配置 SPEECH_KEY。请在云环境设置的密钥区域安全填写，不要发在聊天里。')
                body = synthesize(clip, key, ledger, transport or azure_transport, max_attempts)
                folder = stage / 'assets/audio'; folder.mkdir(parents=True, exist_ok=True)
                temporary = None
                try:
                    with tempfile.NamedTemporaryFile(dir=folder, suffix='.mp3', prefix='.pending-', delete=False) as file:
                        temporary = Path(file.name); file.write(body)
                    info = validate_audio(temporary)
                    temporary.replace(stage / clip['path'])
                    atomic_json(stage / 'cache' / (clip['digest'] + '.json'), {
                        'digest': clip['digest'], 'configuration': CONFIG, **info,
                    })
                finally:
                    if temporary and temporary.exists(): temporary.unlink()
            verified[clip['digest']] = info
            print(f'音频 {index + 1}/{len(selected)} 已验证。', flush=True)
        if limit:
            return {**summary, 'sampleOnly': True, 'verifiedClips': len(selected),
                    'importedClips': len(imported),
                    'sentRequests': ledger.requests_sent,
                    'reservedCharacters': ledger.reserved_characters}
        # All current clips have passed full decode before preparing an inert site artifact.
        manifest = {'version': 3, 'voice': manifest_voice(),
                    'clips': {clip['key']: clip['path'] for clip in prepared}}
        audit = {'version': 1, 'configuration': CONFIG, 'region': REGION,
                 'datasetSha256': hashlib.sha256(json_bytes(prepared)).hexdigest(),
                 'clips': [{**{k: v for k, v in clip.items() if k != 'ssml'},
                            **verified[clip['digest']]} for clip in prepared],
                 'verification': 'Every cached MP3 passed a full non-silent decode; human pronunciation review is separate.'}
        source = ('/* Pre-generated Azure MP3 mapping; no credentials or runtime API calls. */\n'
                  '(function(root){\n const manifest=' + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n'
                  ' if(typeof module!=="undefined" && module.exports)module.exports=manifest;\n'
                  ' else root.GardenAudioManifest=manifest;\n})(typeof window!=="undefined"?window:globalThis);\n')
        atomic_json(stage / 'data/audio-audit.json', audit)
        atomic_bytes(stage / 'data/audio-manifest.js', source.encode())
        summary.update(complete=True, verifiedClips=len(prepared),
                       importedClips=len(imported),
                       sentRequests=ledger.requests_sent,
                       reservedCharacters=ledger.reserved_characters)
        atomic_json(stage / 'report.json', summary)
    return summary


def collect_clips(root):
    try:
        output = subprocess.run(['node', str(root / 'scripts/audio-texts.js')],
                                capture_output=True, check=True, timeout=30,
                                env=subprocess_environment())
        return json.loads(output.stdout)['clips']
    except (OSError, subprocess.SubprocessError, ValueError, KeyError):
        raise SafeError('无法汇总朗读文本，请确认已安装 Node 并在完整项目中运行。') from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true', help='Plan only; no key, request or file changes')
    parser.add_argument('--limit', type=int, default=0, help='Generate first N sample clips without preparing a full manifest')
    parser.add_argument('--verify', action='store_true', help='Verify existing clips without contacting Azure')
    parser.add_argument('--budget', type=int, default=DEFAULT_BUDGET, help='Local conservative monthly character ceiling, not Azure remaining balance')
    parser.add_argument('--max-attempts', type=int, default=4)
    parser.add_argument('--max-wait', type=float, default=120)
    args = parser.parse_args()
    try:
        summary = build(ROOT, collect_clips(ROOT), dry_run=args.dry_run, limit=args.limit,
                        verify_only=args.verify, budget=args.budget,
                        max_attempts=args.max_attempts, max_wait=args.max_wait)
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except SafeError as error:
        print(str(error), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print('已停止；成功验证的音频和限流进度保留，可以续跑。', file=sys.stderr)
        return 130
    except Exception:
        # Never dump request objects, service response bodies, environment or raw exceptions.
        print('生成未完成。已保留进度；请检查文件权限、开发工具或安全配置。', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
