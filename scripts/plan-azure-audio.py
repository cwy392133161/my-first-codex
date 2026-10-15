"""Record the exact missing Azure inputs without credentials or network calls.

Run ``python3 scripts/plan-azure-audio.py`` after editing English content. This
does not synthesize audio, edit the live manifest, or mark pending MP3s delivered.
Use ``--check`` in review to reject an out-of-date pending registry.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location('garden_azure_build', ROOT / 'scripts/build-azure-audio.py')
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)


def collect(*arguments):
    # The child process has no reason to receive the synthesis credential.
    process = subprocess.run(['node', 'scripts/audio-texts.js', *arguments], cwd=ROOT,
                             env=BUILD.subprocess_environment(), capture_output=True,
                             check=False, timeout=30)
    if process.returncode:
        raise BUILD.SafeError('读取当前英语朗读输入失败，请先检查题库模块。')
    return json.loads(process.stdout)


def prepare_plan():
    catalog = BUILD.committed_catalog(ROOT)
    if not catalog:
        raise BUILD.SafeError('当前 Azure 公开音频清单或来源配置无效，请先核对已交付文件。')
    audit = json.loads((ROOT / 'data/audio-audit.json').read_text(encoding='utf-8'))
    delivered = collect('--without-unit4')
    baseline = BUILD.prepare_clips(delivered['clips'])
    audited = {record['key']: record for record in audit['clips']}
    audited_inputs = BUILD.prepare_clips(audit['clips'])
    audit_hash = hashlib.sha256(BUILD.json_bytes(audited_inputs)).hexdigest()
    if audit_hash != audit.get('datasetSha256'):
        raise BUILD.SafeError('已交付音频的公开输入指纹不一致，请先检查来源清单。')
    for clip in baseline:
        record = audited.get(clip['key'])
        if (record is None or any(record.get(key) != clip[key]
                                  for key in ('text', 'digest', 'path'))
                or record.get('sources', [])[:len(clip['sources'])] != clip['sources']):
            raise BUILD.SafeError('已发布的朗读输入发生变化，不能把它作为未改动的音频基线。')
    current = collect()
    prepared = BUILD.prepare_clips(current['clips'])
    pending, available = [], 0
    for clip in prepared:
        filename = catalog['clips'].get(clip['key'])
        if filename is None:
            pending.append({key: clip[key] for key in ('key', 'text', 'digest', 'path', 'sources')})
            continue
        records = catalog['records'].get(clip['digest'], [])
        record = next((item for item in records if item.get('key') == clip['key']), None)
        location = ROOT / clip['path']
        if (record is None or filename != clip['path'] or record.get('text') != clip['text']
                or record.get('path') != clip['path'] or not location.is_file()
                or record.get('bytes') != location.stat().st_size
                or record.get('sha256') != BUILD.sha256_file(location)):
            raise BUILD.SafeError('已发布 MP3 的文本、指纹或实际文件不一致，请先修复后再规划。')
        available += 1
    return {
        'version': 1,
        'status': 'pending' if pending else 'complete',
        'configuration': BUILD.CONFIG.copy(),
        'region': BUILD.REGION,
        'datasetSha256': hashlib.sha256(BUILD.json_bytes(prepared)).hexdigest(),
        'totalClips': len(prepared),
        'availableClips': available,
        'pendingClips': len(pending),
        'sourceCount': len(current['texts']),
        'reason': '新增录音尚未生成；本清单仅规划缺少的 MP3，不代表音频已交付。',
        'clips': pending,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='只核对待生成清单，不写文件')
    arguments = parser.parse_args()
    registry = prepare_plan()
    destination = ROOT / 'data/audio-pending.json'
    if arguments.check:
        if not destination.is_file() or json.loads(destination.read_text(encoding='utf-8')) != registry:
            raise BUILD.SafeError('待生成清单与当前题库不一致，请重新运行计划脚本。')
    else:
        BUILD.atomic_json(destination, registry)
    print('音频计划已' + ('核对' if arguments.check else '保存') + '：共 '
          + str(registry['totalClips']) + ' 段，可复用 ' + str(registry['availableClips'])
          + ' 段，待生成 ' + str(registry['pendingClips']) + ' 段；没有调用 Azure。')


if __name__ == '__main__':
    try:
        main()
    except BUILD.SafeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, subprocess.SubprocessError):
        # Do not echo unexpected child errors or configuration/environment data.
        print('音频计划检查失败；未调用 Azure，也未更改网站音频清单。请检查题库、已交付 MP3 与待生成清单。', file=sys.stderr)
        sys.exit(1)
