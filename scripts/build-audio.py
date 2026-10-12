"""Development-only MP3 builder using official Misaki British model phonemes."""
import argparse
import hashlib
import importlib.metadata
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OVERRIDES = {
    'close': 'klˈQz',  # Verb: 关闭.
    'read': 'ɹˈiːd', 'reads': 'ɹˈiːdz',  # Current examples are present tense.
    'minute': 'mˈɪnɪt', 'minutes': 'mˈɪnɪts',  # Time, not the adjective tiny.
}


def digest_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def json_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()


def make_g2p():
    from misaki import en, espeak
    assert importlib.metadata.version('misaki') == '0.9.4', 'Install misaki[en]==0.9.4'
    assert importlib.metadata.version('en-core-web-sm') == '3.8.0', 'Install en_core_web_sm 3.8.0'
    g2p = en.G2P(british=True, fallback=espeak.EspeakFallback(british=True), unk='❓')
    for word, phonemes in OVERRIDES.items():
        for variant in (word, word.capitalize(), word.upper()):
            g2p.lexicon.golds[variant] = phonemes
    return g2p


def prepare_clips(g2p, clips, vocab):
    prepared = []
    for clip in clips:
        phonemes, tokens = g2p(clip['text'])
        if not phonemes or '❓' in phonemes or set(phonemes) - set(vocab):
            raise ValueError(f'Unknown model phonemes: {clip["text"]!r} {phonemes!r}')
        if len(phonemes) > 510:
            raise ValueError(f'Split this long sentence: {clip["text"]!r}')
        prepared.append({**clip, 'phonemes': phonemes, 'tokens': [
            {'text': token.text, 'phonemes': token.phonemes} for token in tokens
        ]})
    return prepared


def clip_path(profile, key):
    name = hashlib.sha256((profile + '\0' + key).encode()).hexdigest()[:20] + '.mp3'
    return 'assets/audio/' + name


def atomic_text(path, text):
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                     prefix='.build-', delete=False) as temporary:
        temporary.write(text)
        name = Path(temporary.name)
    name.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True)
    parser.add_argument('--voices', required=True)
    parser.add_argument('--voice', default='bf_emma')
    parser.add_argument('--speed', type=float, default=0.88)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--shard-index', type=int, default=0)
    parser.add_argument('--shard-count', type=int, default=1)
    parser.add_argument('--threads', type=int, default=1)
    args = parser.parse_args()
    assert args.shard_count > 0 and 0 <= args.shard_index < args.shard_count
    assert args.limit >= 0 and 0.5 <= args.speed <= 1.5 and args.threads > 0
    assert args.voice.startswith('bf_') or args.voice.startswith('bm_'), 'Use a British voice'
    import numpy as np
    import onnxruntime as ort
    import soundfile as sf
    from kokoro_onnx.trim import trim
    ort.disable_telemetry_events()
    settings = ort.SessionOptions()
    settings.intra_op_num_threads = args.threads
    settings.inter_op_num_threads = 1
    settings.log_severity_level = 3
    model = ort.InferenceSession(args.model, sess_options=settings, providers=['CPUExecutionProvider'])
    vocab = json.loads(model.get_modelmeta().custom_metadata_map['kokoro_config'])['vocab']
    assert {item.name: item.type for item in model.get_inputs()} == {
        'input_ids': 'tensor(int64)', 'style': 'tensor(float)', 'speed': 'tensor(float)'
    }, 'Unsupported model input format'
    with np.load(args.voices) as packs:
        assert args.voice in packs, f'Voice not found: {args.voice}'
        styles = packs[args.voice].copy()
    assert styles.shape == (510, 1, 256), 'Unsupported style pack'
    data = json.loads(subprocess.check_output(['node', str(ROOT / 'scripts/audio-texts.js')]))
    clips = prepare_clips(make_g2p(), data['clips'], vocab)
    config = {
        'modelSha256': digest_file(args.model), 'voicesSha256': digest_file(args.voices),
        'voice': args.voice, 'speed': args.speed, 'language': 'en-GB',
        'misaki': importlib.metadata.version('misaki'),
        'spacy': importlib.metadata.version('spacy'), 'spacyModel': 'en_core_web_sm-3.8.0',
        'normalizerSha256': digest_file(ROOT / 'speech-text.js'),
        'phonemesSha256': hashlib.sha256(json_bytes([
            {key: clip[key] for key in ('key', 'text', 'phonemes')} for clip in clips
        ])).hexdigest(),
        'overrides': OVERRIDES, 'encoder': 'mp3-mono-24000-96k',
        'pipeline': 'misaki-style-length-minus-one-conservative-trim-v1',
    }
    profile = 'uk-misaki-v1-' + hashlib.sha256(json_bytes(config)).hexdigest()[:12]
    mapping = {clip['key']: clip_path(profile, clip['key']) for clip in clips}
    selected = clips[:args.limit] if args.limit else clips
    selected = [clip for index, clip in enumerate(selected) if index % args.shard_count == args.shard_index]
    assets = ROOT / 'assets/audio'
    assets.mkdir(parents=True, exist_ok=True)
    print(f'Profile {profile}; checked {len(clips)} phoneme sequences; shard {args.shard_index + 1}/{args.shard_count}', flush=True)
    with tempfile.TemporaryDirectory(prefix='.build-', dir=assets) as directory:
        wav, encoded = Path(directory) / 'voice.wav', Path(directory) / 'voice.mp3'
        for index, clip in enumerate(selected):
            destination = ROOT / mapping[clip['key']]
            if not destination.is_file():
                phonemes = clip['phonemes']
                # Official Kokoro style index is phoneme length minus one.
                samples = model.run(None, {
                    'input_ids': np.array([[0, *[vocab[p] for p in phonemes], 0]], dtype=np.int64),
                    'style': styles[len(phonemes) - 1].astype(np.float32),
                    'speed': np.array([args.speed], dtype=np.float32),
                })[0].reshape(-1)
                assert np.isfinite(samples).all() and len(samples) > 24000 * .08
                assert np.max(np.abs(samples)) > .005, f'Silent clip: {clip["text"]}'
                # Retain quiet onsets/codas, especially /h/, with generous padding.
                _, edges = trim(samples, top_db=70, frame_length=1024, hop_length=128)
                samples = samples[max(0, edges[0] - 3600):min(len(samples), edges[1] + 3600)]
                samples = np.concatenate([np.zeros(2400), samples, np.zeros(3600)])
                sf.write(wav, samples, 24000, subtype='PCM_16')
                subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                                '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k',
                                '-map_metadata', '-1', str(encoded)], check=True)
                encoded.replace(destination)
            if index % 10 == 0 or index + 1 == len(selected):
                print(f'Audio {index + 1}/{len(selected)}: {clip["text"]}', flush=True)
    if args.limit:
        print('Sample build only; the full manifest was not changed.', flush=True)
        return
    if not all((ROOT / file).is_file() for file in mapping.values()):
        print('Shard complete; other shards must finish before the manifest is updated.', flush=True)
        return
    audit = {'version': 1, 'profile': profile, 'configuration': config, 'clips': [
        {**clip, 'file': mapping[clip['key']]} for clip in clips
    ], 'check': 'All source phonemes are nonempty and in the model vocabulary; not a human pronunciation rating.'}
    atomic_text(ROOT / 'data/audio-audit.json', json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
    manifest = {'version': 2, 'voice': {
        'name': args.voice, 'language': 'en-GB', 'source': 'Kokoro-82M',
        'kind': 'offline-generated', 'profile': profile, 'g2p': 'Misaki 0.9.4',
    }, 'clips': mapping}
    source = ('/* Generated by scripts/build-audio.py; no network service is needed. */\n'
              '(function(root){\n  const manifest=' + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n'
              '  if(typeof module!=="undefined" && module.exports)module.exports=manifest;\n'
              '  else root.GardenAudioManifest=manifest;\n})(typeof window!=="undefined"?window:globalThis);\n')
    atomic_text(ROOT / 'data/audio-manifest.js', source)
    size = sum((ROOT / file).stat().st_size for file in mapping.values()) / 1024 / 1024
    print(f'Complete: {len(mapping)} clips, {size:.2f} MiB. Run full decode tests before publishing.', flush=True)


if __name__ == '__main__':
    main()
