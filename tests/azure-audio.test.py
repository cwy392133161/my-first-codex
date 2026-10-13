"""Azure builder regression checks; no Azure key, network or F0 quota is used.

Run with: python3 tests/azure-audio.test.py
The fixture is a locally generated sine wave, not a pronunciation assessment.
"""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts/build-azure-audio.py"
SECRET = "test-only-secret-never-log-abcdefgh"


def load_builder():
    spec = importlib.util.spec_from_file_location("garden_azure_audio_builder", SCRIPT)
    builder = importlib.util.module_from_spec(spec)
    # Dataclasses need their module registered while decorators are evaluated.
    import sys
    sys.modules[spec.name] = builder
    spec.loader.exec_module(builder)
    return builder


def snapshot(directory):
    """Include metadata so an apparently harmless rewrite is also detected."""
    result = {}
    for location in sorted(directory.rglob("*")):
        relative = str(location.relative_to(directory))
        stat = location.stat()
        result[relative] = ("directory" if location.is_dir() else location.read_bytes(),
                            stat.st_mtime_ns)
    return result


class FakeClock:
    def __init__(self):
        self.now = 1_700_000_000.0
        self.sleeps = []

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        if seconds < 0:
            raise AssertionError("Negative retry/rate limit wait")
        self.sleeps.append(seconds)
        self.now += seconds


def http_error(status, retry_after=None):
    headers = {} if retry_after is None else {"Retry-After": str(retry_after)}
    # A compromised or verbose service can echo a credential anywhere. The
    # builder must report its own safe status message, not the exception body.
    return urllib.error.HTTPError(
        "https://eastus.tts.speech.microsoft.com/" + SECRET,
        status, "Service reason echoed " + SECRET, headers,
        io.BytesIO(("Service body echoed " + SECRET).encode()),
    )


class AzureAudioBuilderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.builder = load_builder()
        cls.fixture_temp = tempfile.TemporaryDirectory(prefix="garden-azure-test-")
        cls.fixture_path = Path(cls.fixture_temp.name) / "fixture.mp3"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=0.30",
            "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k",
            "-map_metadata", "-1", str(cls.fixture_path),
        ], check=True, capture_output=True)
        cls.mp3 = cls.fixture_path.read_bytes()

    @classmethod
    def tearDownClass(cls):
        cls.fixture_temp.cleanup()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="garden-azure-run-")
        self.root = Path(self.temp.name)
        self.addCleanup(self.temp.cleanup)
        self.clock = FakeClock()

    def clips(self, *texts):
        return [{"key": text.rstrip(".!?").lower(), "text": text,
                 "sources": ["question:fixture-" + str(index)]}
                for index, text in enumerate(texts or ("Hello!", "Hi!"))]

    def build(self, clips=None, transport=None, **kwargs):
        with mock.patch.dict(os.environ, {"SPEECH_KEY": SECRET,
                                          "SPEECH_REGION": "eastus"}):
            return self.builder.build(
                self.root, self.clips() if clips is None else clips,
                transport=(lambda request: self.mp3) if transport is None else transport,
                clock=self.clock.monotonic, sleep=self.clock.sleep, **kwargs,
            )

    def stage_manifest(self):
        return self.root / ".audio-build/azure/data/audio-manifest.js"

    def staged_file(self, clip):
        return self.root / ".audio-build/azure" / clip["path"]

    def install_live_manifest(self):
        (self.root / "data").mkdir()
        path = self.root / "data/audio-manifest.js"
        path.write_text("/* unchanged production manifest */\n", encoding="utf-8")
        return path

    def install_committed_audio(self):
        """Simulate a fresh checkout of verified public artifacts, without a key."""
        self.build()
        stage = self.root / '.audio-build/azure'
        shutil.copytree(stage / 'assets', self.root / 'assets')
        shutil.copytree(stage / 'data', self.root / 'data')
        shutil.rmtree(self.root / '.audio-build')

    def no_key_build(self, clips=None, **kwargs):
        environment = {name: value for name, value in os.environ.items() if name != 'SPEECH_KEY'}
        with mock.patch.dict(os.environ, environment, clear=True):
            return self.builder.build(
                self.root, self.clips() if clips is None else clips,
                transport=lambda request: self.fail('Committed cache contacted Azure'),
                clock=self.clock.monotonic, sleep=self.clock.sleep, **kwargs,
            )

    def capture_failure(self, transport, **kwargs):
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            with self.assertRaises(self.builder.SafeError) as raised:
                self.build(transport=transport, **kwargs)
        output = stdout.getvalue() + stderr.getvalue() + str(raised.exception)
        self.assertNotIn(SECRET, output)
        self.assertNotIn("Service body echoed", output)
        self.assertNotIn("Service reason echoed", output)
        return output

    def test_ssml_jenny_defaults_and_escaping(self):
        message = 'Hello <friend> & "family"!'
        ssml = self.builder.make_ssml(message)
        document = ET.fromstring(ssml)
        self.assertEqual(document.tag.rsplit("}", 1)[-1], "speak")
        self.assertEqual(document.attrib["{http://www.w3.org/XML/1998/namespace}lang"], "en-US")
        voices = [node for node in document.iter()
                  if node.tag.rsplit("}", 1)[-1] == "voice"]
        self.assertEqual(len(voices), 1)
        self.assertEqual(voices[0].attrib["name"], "en-US-JennyNeural")
        self.assertEqual("".join(voices[0].itertext()), message)
        self.assertFalse(any(node.tag.rsplit("}", 1)[-1]
                             in {"prosody", "express-as"} for node in document.iter()),
                         "Use the confirmed default style and ordinary speaking rate")

    def test_semantic_homographs_are_deliberate(self):
        document = ET.fromstring(self.builder.make_ssml(
            "Close the door. We read a book. She reads a book. One minute. Two minutes."))
        phonemes = {"".join(node.itertext()).lower(): node.attrib.get("ph")
                    for node in document.iter()
                    if node.tag.rsplit("}", 1)[-1] == "phoneme"}
        self.assertEqual(set(phonemes), {"close", "read", "reads", "minute", "minutes"})
        self.assertRegex(phonemes["close"], "z$")
        self.assertIn("i", phonemes["read"], "read means present-tense /riːd/")
        self.assertIn("i", phonemes["reads"])
        self.assertIn("ɪ", phonemes["minute"], "minute is the unit of time")
        self.assertIn("ɪ", phonemes["minutes"])
        self.assertFalse(any("eɪ" in value for value in phonemes.values()))

    def test_content_address_does_not_depend_on_whole_question_bank(self):
        original = self.builder.prepare_clips(self.clips())
        expanded = self.builder.prepare_clips(self.clips("Hello!", "Hi!", "Goodbye!"))
        changed = self.builder.prepare_clips(self.clips("Hello?", "Hi!"))
        with_more_sources = self.clips()
        with_more_sources[0]["sources"].append("question:another-identical-reading")
        shared = self.builder.prepare_clips(with_more_sources)
        self.assertEqual(original[0]["digest"], expanded[0]["digest"])
        self.assertEqual(original[1]["digest"], expanded[1]["digest"])
        self.assertEqual(original[1]["digest"], changed[1]["digest"])
        self.assertNotEqual(original[0]["digest"], changed[0]["digest"],
                            "Question punctuation changes must invalidate actual audio")
        self.assertEqual(original[0]["digest"], shared[0]["digest"],
                         "An additional use of the same text reuses the same recording")
        for clip in original:
            self.assertRegex(clip["digest"], "^[0-9a-f]{64}$")
            self.assertEqual(clip["path"], "assets/audio/" + clip["digest"][:20] + ".mp3")
        self.assertNotEqual(original[0]["digest"], original[1]["digest"])

    def test_identical_text_used_by_different_indexes_is_synthesized_only_once(self):
        clips = [{"key": "hello", "text": "Hello!", "sources": ["question:a"]},
                 {"key": "hello-alias", "text": "Hello!", "sources": ["lesson:b"]}]
        prepared = self.builder.prepare_clips(clips)
        self.assertEqual(prepared[0]["path"], prepared[1]["path"])
        requested = []
        self.build(clips=clips, transport=lambda request: requested.append(request.data) or self.mp3)
        self.assertEqual(len(requested), 1)
        manifest = self.stage_manifest().read_text()
        self.assertEqual(manifest.count(prepared[0]["path"]), 2,
                         "Both playback lookup indexes share the same physical MP3")

    def test_valid_mp3_is_fully_decoded_and_bad_or_silent_cache_rejected(self):
        report = self.builder.validate_audio(self.fixture_path)
        self.assertEqual(report["bytes"], len(self.mp3))
        self.assertEqual(report["sha256"], hashlib.sha256(self.mp3).hexdigest())
        self.assertGreater(report["duration"], 0.20)
        malformed = self.root / "header-only.mp3"
        malformed.write_bytes(b"ID3" + bytes(1500))
        with self.assertRaises(self.builder.SafeError):
            self.builder.validate_audio(malformed)
        silent = self.root / "silent.mp3"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.30",
            "-c:a", "libmp3lame", "-b:a", "96k", str(silent),
        ], check=True, capture_output=True)
        with self.assertRaises(self.builder.SafeError):
            self.builder.validate_audio(silent)

    def test_repeat_build_reuses_files_and_modifying_one_text_requests_one(self):
        requested = []
        def transport(request):
            requested.append(request.data.decode("utf-8"))
            return self.mp3
        result = self.build(transport=transport)
        self.assertIsInstance(result, dict)
        self.assertEqual(len(requested), 2)
        audit = json.loads((self.root / '.audio-build/azure/data/audio-audit.json').read_text())
        for clip in audit['clips']:
            self.assertEqual({name: clip[name] for name in ('bytes', 'sha256', 'duration')},
                             self.builder.validate_audio(self.root / '.audio-build/azure' / clip['path']))
        manifest_before = self.stage_manifest().read_bytes()
        original = self.builder.prepare_clips(self.clips())
        hello_before = self.staged_file(original[0]).stat().st_mtime_ns
        self.build(transport=lambda request: self.fail("A cached recording hit Azure"))
        self.assertEqual(self.staged_file(original[0]).stat().st_mtime_ns, hello_before)
        self.assertEqual(self.stage_manifest().read_bytes(), manifest_before)
        requested.clear()
        self.build(clips=self.clips("Hello!", "Hi?"), transport=transport)
        self.assertEqual(len(requested), 1)
        self.assertIn("Hi?", requested[0])
        self.assertEqual(self.staged_file(original[0]).stat().st_mtime_ns, hello_before)

    def test_committed_audio_dry_run_and_verify_are_read_only_without_key_access(self):
        self.install_committed_audio()
        before = snapshot(self.root)
        original_get = os.environ.get
        def guarded_get(name, *args):
            if name == 'SPEECH_KEY':
                self.fail('Read-only cache inspection read the Speech key')
            return original_get(name, *args)
        with mock.patch.object(os.environ, 'get', side_effect=guarded_get):
            report = self.no_key_build(dry_run=True)
            verified = self.no_key_build(verify_only=True)
            expanded = self.no_key_build(clips=self.clips('Hello!', 'Hi!', 'Goodbye!'),
                                         dry_run=True)
        self.assertEqual(report['newRequests'], 0)
        self.assertEqual(report['reusedClips'], 2)
        self.assertEqual(report['committedReusedClips'], 2)
        self.assertTrue(verified['complete'])
        self.assertEqual(verified['verifiedClips'], 2)
        self.assertEqual(expanded['newRequests'], 1)
        self.assertEqual(expanded['committedReusedClips'], 2)
        self.assertEqual(snapshot(self.root), before)
        self.assertFalse((self.root / '.audio-build').exists())

    def test_committed_audio_imports_without_key_requests_or_reconstructed_quota(self):
        self.install_committed_audio()
        before = snapshot(self.root)
        report = self.no_key_build()
        self.assertTrue(report['complete'])
        self.assertEqual(report['importedClips'], 2)
        self.assertEqual(report['sentRequests'], 0)
        self.assertEqual(report['reservedCharacters'], 0)
        self.assertFalse((self.root / '.audio-build/azure/ledger.json').exists(),
                         'Old Azure usage cannot be reconstructed from public MP3 files')
        after = {path: data for path, data in snapshot(self.root).items()
                 if not path.startswith('.audio-build')}
        self.assertEqual(after, before, 'Import must leave all live files and metadata untouched')
        prepared = self.builder.prepare_clips(self.clips())
        for clip in prepared:
            self.assertEqual(self.staged_file(clip).read_bytes(), (self.root / clip['path']).read_bytes())
            self.assertIsNotNone(self.builder.cache_info(self.root / '.audio-build/azure', clip))
        self.assertTrue(self.stage_manifest().is_file())

    def test_missing_new_audio_without_key_never_imports_or_writes_partial_artifact(self):
        self.install_committed_audio()
        before = snapshot(self.root)
        expanded = self.clips('Hello!', 'Hi!', 'Goodbye!')
        with self.assertRaises(self.builder.SafeError):
            self.no_key_build(clips=expanded)
        self.assertEqual(snapshot(self.root), before)
        with self.assertRaises(self.builder.SafeError):
            self.no_key_build(clips=expanded, verify_only=True)
        self.assertEqual(snapshot(self.root), before)

    def test_committed_changed_text_same_index_generates_only_changed_recording(self):
        self.install_committed_audio()
        live = self.root / 'data/audio-manifest.js'
        before = live.read_bytes()
        changed = self.clips('Hello!', 'Hi?')
        requested = []
        report = self.build(clips=changed,
                            transport=lambda request: requested.append(request.data) or self.mp3)
        self.assertEqual(report['committedReusedClips'], 1)
        self.assertEqual(report['importedClips'], 1)
        self.assertEqual(report['sentRequests'], 1)
        self.assertEqual(len(requested), 1)
        self.assertIn(b'Hi?', requested[0])
        self.assertEqual(live.read_bytes(), before)

    def test_committed_identical_text_new_index_reuses_verified_original_recording(self):
        self.install_committed_audio()
        clips = self.clips() + [{'key': 'hello-new-alias', 'text': 'Hello!',
                                 'sources': ['new-question:same-greeting']}]
        report = self.no_key_build(clips=clips)
        self.assertEqual(report['newRequests'], 0)
        self.assertEqual(report['reusedClips'], 3)
        self.assertEqual(report['committedReusedClips'], 3)
        self.assertEqual(report['importedClips'], 2)
        self.assertEqual(report['sentRequests'], 0)

    def test_committed_cache_rejects_wrong_provider_configuration_mapping_and_text(self):
        self.install_committed_audio()
        audit_path = self.root / 'data/audio-audit.json'
        manifest_path = self.root / 'data/audio-manifest.js'
        audit_original = audit_path.read_bytes()
        manifest_original = manifest_path.read_bytes()
        mutations = [
            ('provider', lambda audit: audit['configuration'].update(provider='Kokoro')),
            ('voice', lambda audit: audit['configuration'].update(voice='en-US-OtherNeural')),
            ('rate', lambda audit: audit['configuration'].update(rate='slow')),
            ('actual-text', lambda audit: audit['clips'][0].update(text='Something else!')),
            ('digest', lambda audit: audit['clips'][0].update(digest='0' * 64)),
            ('path', lambda audit: audit['clips'][0].update(path='pronunciation-preview/assets/audio/old.mp3')),
            ('sha256', lambda audit: audit['clips'][0].update(sha256='0' * 64)),
            ('bytes', lambda audit: audit['clips'][0].update(bytes=500)),
            ('duration', lambda audit: audit['clips'][0].update(duration=123)),
        ]
        for name, mutate in mutations:
            with self.subTest(mutation=name):
                audit = json.loads(audit_original)
                mutate(audit)
                audit_path.write_text(json.dumps(audit))
                report = self.no_key_build(dry_run=True)
                self.assertGreaterEqual(report['newRequests'], 1)
                with self.assertRaises(self.builder.SafeError):
                    self.no_key_build(verify_only=True)
                audit_path.write_bytes(audit_original)
        for old, replacement in [('en-US-JennyNeural', 'bf_emma'),
                                 ('"source":"Azure Speech"', '"source":"Kokoro"'),
                                 ('azure-jenny-v1-', 'wrong-profile-')]:
            with self.subTest(manifest_change=old):
                manifest_path.write_bytes(manifest_original.replace(old.encode(), replacement.encode()))
                self.assertEqual(self.no_key_build(dry_run=True)['newRequests'], 2)
                manifest_path.write_bytes(manifest_original)
        self.assertFalse((self.root / '.audio-build').exists())

    def test_committed_corrupt_audio_with_matching_hash_still_requires_full_decode(self):
        self.install_committed_audio()
        prepared = self.builder.prepare_clips(self.clips())
        corrupted = self.root / prepared[0]['path']
        corrupted.write_bytes(b'ID3' + bytes(1000))
        audit_path = self.root / 'data/audio-audit.json'
        audit = json.loads(audit_path.read_text())
        audit['clips'][0].update(bytes=corrupted.stat().st_size,
                                 sha256=hashlib.sha256(corrupted.read_bytes()).hexdigest())
        audit_path.write_text(json.dumps(audit))
        before = snapshot(self.root)
        self.assertEqual(self.no_key_build(dry_run=True)['newRequests'], 1)
        with self.assertRaises(self.builder.SafeError):
            self.no_key_build(verify_only=True)
        self.assertEqual(snapshot(self.root), before)

    def test_cache_tampering_and_truncated_audio_are_regenerated(self):
        self.build()
        prepared = self.builder.prepare_clips(self.clips())
        damaged = self.staged_file(prepared[0])
        damaged.write_bytes(b"ID3" + bytes(500))
        requested = []
        self.build(transport=lambda request: requested.append(request.data) or self.mp3)
        self.assertEqual(len(requested), 1)
        self.assertEqual(damaged.read_bytes(), self.mp3)
        # Valid MP3 bytes are still rejected when the sidecar's stored digest
        # differs. This detects silent accidental replacement of a cached file.
        damaged.write_bytes(self.mp3 + b"unexpected extra bytes")
        requested.clear()
        self.build(transport=lambda request: requested.append(request.data) or self.mp3)
        self.assertEqual(len(requested), 1)
        self.assertEqual(damaged.read_bytes(), self.mp3)

    def test_cache_invalidated_after_lock_reloads_key_before_new_request(self):
        self.build()
        original = self.builder.cache_info
        checks, requests = 0, []
        def cache_changed(stage, clip):
            nonlocal checks
            checks += 1
            return None if checks == 3 else original(stage, clip)
        def transport(request):
            headers = {name.lower(): value for name, value in request.header_items()}
            self.assertEqual(headers["ocp-apim-subscription-key"], SECRET)
            requests.append(request)
            return self.mp3
        with mock.patch.object(self.builder, "cache_info", side_effect=cache_changed):
            self.build(transport=transport)
        self.assertEqual(len(requests), 1)

    def test_malformed_sidecar_only_regenerates_its_own_clip(self):
        self.build()
        prepared = self.builder.prepare_clips(self.clips())
        cache = self.root / ".audio-build/azure/cache"
        damaged = cache / (prepared[0]["digest"] + ".json")
        preserved = cache / (prepared[1]["digest"] + ".json")
        preserved_bytes = preserved.read_bytes()
        preserved_mtime = preserved.stat().st_mtime_ns
        preserved_audio_mtime = self.staged_file(prepared[1]).stat().st_mtime_ns
        for content in ("[]", "null", '{"unterminated":'):
            with self.subTest(sidecar=content):
                damaged.write_text(content)
                requests = []
                self.build(transport=lambda request: requests.append(request.data) or self.mp3)
                self.assertEqual(len(requests), 1)
                self.assertIn(b"Hello!", requests[0])
                repaired = json.loads(damaged.read_text())
                self.assertIsInstance(repaired, dict)
                self.assertEqual(repaired["digest"], prepared[0]["digest"])
                self.assertEqual(preserved.read_bytes(), preserved_bytes)
                self.assertEqual(preserved.stat().st_mtime_ns, preserved_mtime)
                self.assertEqual(self.staged_file(prepared[1]).stat().st_mtime_ns,
                                 preserved_audio_mtime)

    def test_cache_invalidated_after_lock_without_key_does_not_charge_or_request(self):
        self.build()
        ledger = self.root / ".audio-build/azure/ledger.json"
        before = ledger.read_bytes()
        original = self.builder.cache_info
        checks, requests = 0, []
        def cache_changed(stage, clip):
            nonlocal checks
            checks += 1
            return None if checks == 3 else original(stage, clip)
        environment = {name: value for name, value in os.environ.items() if name != "SPEECH_KEY"}
        with mock.patch.dict(os.environ, environment, clear=True), \
                mock.patch.object(self.builder, "cache_info", side_effect=cache_changed):
            with self.assertRaises(self.builder.SafeError):
                self.builder.build(self.root, self.clips(),
                                   transport=lambda request: requests.append(request) or self.mp3,
                                   clock=self.clock.monotonic, sleep=self.clock.sleep)
        self.assertEqual(requests, [])
        self.assertEqual(ledger.read_bytes(), before)

    def test_failure_keeps_complete_manifest_and_resume_reuses_successful_clips(self):
        live = self.install_live_manifest()
        production_before = live.read_bytes()
        self.build(clips=self.clips("Hello!"))
        stage_before = self.stage_manifest().read_bytes()
        count = 0
        def failing(request):
            nonlocal count
            count += 1
            if count == 2:
                raise http_error(401)
            return self.mp3
        with self.assertRaises(self.builder.SafeError):
            self.build(clips=self.clips("Hello!", "Hi!", "Goodbye!"), transport=failing)
        self.assertEqual(count, 2, "401 is not retried")
        self.assertEqual(self.stage_manifest().read_bytes(), stage_before)
        self.assertEqual(live.read_bytes(), production_before)
        requested = []
        self.build(clips=self.clips("Hello!", "Hi!", "Goodbye!"),
                   transport=lambda request: requested.append(request.data) or self.mp3)
        self.assertEqual(len(requested), 1, "The successfully saved Hi clip is resumed")
        self.assertIn(b"Goodbye!", requested[0])
        self.assertEqual(live.read_bytes(), production_before)
        self.assertNotEqual(self.stage_manifest().read_bytes(), stage_before)

    def test_abort_retains_completed_cache_and_releases_single_instance_lock(self):
        calls = 0
        def interrupted(request):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise KeyboardInterrupt()
            return self.mp3
        with self.assertRaises(KeyboardInterrupt):
            self.build(transport=interrupted)
        self.assertFalse(self.stage_manifest().exists())
        resumed = []
        self.build(transport=lambda request: resumed.append(request.data) or self.mp3)
        self.assertEqual(len(resumed), 1)
        self.assertIn(b"Hi!", resumed[0])
        self.assertTrue(self.stage_manifest().is_file())

    def test_second_instance_is_rejected_without_consuming_another_request(self):
        outer_calls = []
        def transport(request):
            outer_calls.append(request)
            with self.assertRaises(self.builder.SafeError):
                self.build(clips=self.clips("Hello!"), transport=lambda inner:
                           self.fail("A concurrent builder made a synthesis request"))
            return self.mp3
        self.build(clips=self.clips("Hello!"), transport=transport)
        self.assertEqual(len(outer_calls), 1)
        self.assertTrue(self.stage_manifest().is_file())
        self.build(clips=self.clips("Hello!"), transport=lambda request:
                   self.fail("The lock should be released and completed cache reused"))

    def test_limit_only_produces_sample_and_does_not_publish_partial_manifest(self):
        live = self.install_live_manifest()
        before = live.read_bytes()
        requested = []
        self.build(limit=1, transport=lambda request: requested.append(request.data) or self.mp3)
        self.assertEqual(len(requested), 1)
        self.assertFalse(self.stage_manifest().exists())
        self.assertEqual(live.read_bytes(), before)
        self.build(transport=lambda request: requested.append(request.data) or self.mp3)
        self.assertEqual(len(requested), 2)
        self.assertTrue(self.stage_manifest().is_file())

    def test_dry_run_without_secret_network_or_any_filesystem_changes(self):
        live = self.install_live_manifest()
        (self.root / "unrelated.json").write_text('{"keep":"existing data"}')
        before = snapshot(self.root)
        with mock.patch.dict(os.environ, {}, clear=True):
            result = self.builder.build(
                self.root, self.clips(), dry_run=True,
                transport=lambda request: self.fail("dry-run used the network"),
                clock=self.clock.monotonic, sleep=self.clock.sleep,
            )
        self.assertIsInstance(result, dict)
        self.assertEqual(snapshot(self.root), before)
        self.assertFalse((self.root / ".audio-build").exists())
        self.assertEqual(self.clock.sleeps, [])
        self.assertTrue(live.is_file())

    def test_dry_run_with_existing_cache_does_not_rewrite_any_metadata(self):
        self.build()
        before = snapshot(self.root)
        with mock.patch.dict(os.environ, {}, clear=True):
            self.builder.build(
                self.root, self.clips(), dry_run=True,
                transport=lambda request: self.fail("cached dry-run used the network"),
                clock=self.clock.monotonic, sleep=self.clock.sleep,
            )
        self.assertEqual(snapshot(self.root), before)

    def test_verify_mode_needs_no_secret_and_never_requests_or_rewrites(self):
        self.build()
        before = snapshot(self.root)
        with mock.patch.dict(os.environ, {}, clear=True):
            result = self.builder.build(
                self.root, self.clips(), verify_only=True,
                transport=lambda request: self.fail("verify mode contacted Azure"),
                clock=self.clock.monotonic, sleep=self.clock.sleep,
            )
        self.assertTrue(result["complete"])
        self.assertEqual(result["verifiedClips"], 2)
        self.assertEqual(snapshot(self.root), before)
        self.staged_file(self.builder.prepare_clips(self.clips())[0]).write_bytes(b"broken")
        before_damaged_verify = snapshot(self.root)
        with self.assertRaises(self.builder.SafeError):
            self.build(verify_only=True, transport=lambda request:
                       self.fail("verify must refuse damaged audio without spending quota"))
        self.assertEqual(snapshot(self.root), before_damaged_verify)

    def test_f0_requests_are_serial_limited_and_persist_between_builds(self):
        starts = []
        depth = 0
        def transport(request):
            nonlocal depth
            depth += 1
            self.assertEqual(depth, 1, "F0 synthesis must not run concurrently")
            starts.append(self.clock.now)
            depth -= 1
            return self.mp3
        texts = ["Word number " + str(index) + "." for index in range(23)]
        self.build(clips=self.clips(*texts), transport=transport)
        self.assertEqual(len(starts), 23)
        self.assertTrue(all(b - a >= 4 for a, b in zip(starts, starts[1:])))
        for end in starts:
            self.assertLessEqual(sum(end - 60 < item <= end for item in starts), 20)
        self.build(clips=self.clips(*texts, "New word."), transport=transport)
        self.assertEqual(len(starts), 24)
        self.assertGreaterEqual(starts[-1] - starts[-2], 4,
                                "Restarting the builder does not reset its quota ledger")

    def test_character_budget_refuses_before_any_service_request(self):
        requests = []
        self.capture_failure(
            lambda request: requests.append(request) or self.mp3,
            clips=self.clips("Hello!"), budget=1,
        )
        self.assertEqual(requests, [])
        self.assertFalse(self.stage_manifest().exists())

    def test_failed_requests_count_toward_conservative_character_budget(self):
        requests = []
        clips = self.clips("Hello!")
        ssml = self.builder.make_ssml(clips[0]["text"])
        self.capture_failure(
            lambda request: requests.append(request) or (_ for _ in ()).throw(http_error(500)),
            clips=clips, budget=len(ssml), max_attempts=4,
        )
        self.assertEqual(len(requests), 1,
                         "Failed attempts also consume the conservative local budget")
        self.capture_failure(
            lambda request: requests.append(request) or self.mp3,
            clips=clips, budget=len(ssml), max_attempts=4,
        )
        self.assertEqual(len(requests), 1, "Restarting does not forget accounted attempts")

    def test_429_and_5xx_retries_are_bounded_and_also_rate_limited(self):
        starts = []
        responses = [http_error(429, 9), http_error(503, 2), self.mp3]
        def transport(request):
            starts.append(self.clock.now)
            result = responses.pop(0)
            if isinstance(result, Exception):
                raise result
            return result
        self.build(clips=self.clips("Hello!"), transport=transport)
        self.assertEqual(len(starts), 3)
        self.assertGreaterEqual(starts[1] - starts[0], 9)
        self.assertGreaterEqual(starts[2] - starts[1], 4)
        failures = []
        self.capture_failure(
            lambda request: failures.append(self.clock.now) or (_ for _ in ()).throw(http_error(500)),
            clips=self.clips("A new sentence."), max_attempts=3,
        )
        self.assertEqual(len(failures), 3)
        self.assertTrue(all(b - a >= 4 for a, b in zip(failures, failures[1:])))
        self.assertNotIn(SECRET, json.dumps(snapshot_json(self.root)))

    def test_auth_failure_and_network_exception_are_safe(self):
        for status in (401, 403):
            with self.subTest(status=status):
                calls = []
                self.capture_failure(
                    lambda request: calls.append(request) or (_ for _ in ()).throw(http_error(status)))
                self.assertEqual(len(calls), 1)
                self.assertFalse(self.stage_manifest().exists())
        self.capture_failure(
            lambda request: (_ for _ in ()).throw(urllib.error.URLError(SECRET)),
            max_attempts=1,
        )
        self.assertNotIn(SECRET, json.dumps(snapshot_json(self.root)))

    def test_long_retry_after_is_not_shortened_and_survives_restart(self):
        calls = []
        self.capture_failure(
            lambda request: calls.append(self.clock.now) or (_ for _ in ()).throw(http_error(429, 600)),
            clips=self.clips("Hello!"), max_wait=30,
        )
        self.assertEqual(len(calls), 1)
        self.assertFalse(self.stage_manifest().exists())
        self.assertLess(self.clock.now - calls[0], 600,
                        "Long service waits should stop cleanly, retaining notBefore")
        calls.clear()
        self.capture_failure(
            lambda request: calls.append(self.clock.now) or self.mp3,
            clips=self.clips("Hello!"), max_wait=30,
        )
        self.assertEqual(calls, [], "A restart must honor the persisted Azure Retry-After")

    def test_request_only_uses_eastus_jenny_and_never_logs_credential(self):
        requests = []
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            self.build(transport=lambda request: requests.append(request) or self.mp3)
        self.assertNotIn(SECRET, stdout.getvalue() + stderr.getvalue())
        for request in requests:
            self.assertEqual(request.full_url,
                             "https://eastus.tts.speech.microsoft.com/cognitiveservices/v1")
            headers = {name.lower(): value for name, value in request.header_items()}
            self.assertEqual(headers["ocp-apim-subscription-key"], SECRET)
            self.assertEqual(headers["x-microsoft-outputformat"],
                             "audio-24khz-96kbitrate-mono-mp3")
            self.assertIn("application/ssml+xml", headers["content-type"])
            self.assertEqual(request.get_method(), "POST")
            self.assertIn("en-US-JennyNeural", request.data.decode("utf-8"))
        self.assertNotIn(SECRET, json.dumps(snapshot_json(self.root)))

    def test_node_collector_and_ffmpeg_do_not_inherit_speech_key(self):
        original_run = subprocess.run
        with mock.patch.dict(os.environ, {"SPEECH_KEY": SECRET}), \
                mock.patch.object(self.builder.subprocess, "run", wraps=original_run) as called:
            self.builder.validate_audio(self.fixture_path)
            self.assertNotIn("SPEECH_KEY", called.call_args.kwargs["env"])
            self.builder.collect_clips(ROOT)
            self.assertNotIn("SPEECH_KEY", called.call_args.kwargs["env"])
        self.assertEqual(len(called.call_args_list), 2)

    def test_redirect_is_refused_before_forwarding_credential(self):
        request = urllib.request.Request(self.builder.ENDPOINT, data=b"<speak>Hello</speak>",
                                         headers={"Ocp-Apim-Subscription-Key": SECRET})
        handler = self.builder.NoRedirect()
        with self.assertRaises(self.builder.SafeError) as rejected:
            handler.redirect_request(request, None, 302, SECRET, {},
                                     "https://attacker.invalid/" + SECRET)
        self.assertNotIn(SECRET, str(rejected.exception))
        self.assertNotIn("attacker.invalid", str(rejected.exception))


def snapshot_json(directory):
    """Inspect persistent public/private build text without decoding MP3 noise."""
    return {str(path.relative_to(directory)): path.read_text(encoding="utf-8")
            for path in directory.rglob("*")
            if path.is_file() and path.suffix in {".json", ".js", ".txt"}}


if __name__ == "__main__":
    unittest.main(verbosity=2)
