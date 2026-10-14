'use strict';

// Run with: node tests/audio-player.test.js
// Deterministic deadlines and cancellation complement real MP3 browser tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(path.resolve(__dirname, '../audio-player.js'), 'utf8');
const speechSource = fs.readFileSync(path.resolve(__dirname, '../speech-text.js'), 'utf8');
const clips = {
  wall: 'assets/audio/aaaaaaaaaaaaaaaaaaaa.mp3',
  blue: 'assets/audio/bbbbbbbbbbbbbbbbbbbb.mp3'
};

function browser() {
  let now = 0, nextId = 0;
  const timers = new Map(), elements = [];
  class FakeAudio {
    constructor() {
      this.duration = 60;
      this.ended = false;
      this.paused = true;
      this.currentTime = 0;
      this.rejections = [];
      elements.push(this);
    }
    set src(value) { this.currentSource = value; this.ended = false; }
    get src() { return this.currentSource; }
    setAttribute() {}
    removeAttribute(name) { if (name === 'src') this.src = ''; }
    pause() { this.paused = true; }
    load() {}
    play() {
      this.paused = false;
      // Retain each pending play rejection so cancelled attempts can settle late.
      return { catch: callback => this.rejections.push(callback) };
    }
  }
  const sandbox = {
    Audio: FakeAudio,
    GardenAudioManifest: { clips },
    setTimeout(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  new vm.Script(speechSource, { filename: 'speech-text.js' }).runInContext(context);
  new vm.Script(source, { filename: 'audio-player.js' }).runInContext(context);
  function advance(ms) {
    const target = now + ms;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.due <= target)
        .sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      timers.delete(next[0]);
      now = next[1].due;
      next[1].callback();
    }
    now = target;
  }
  return { player: sandbox.GardenAudio, elements, timers, advance };
}

function observer() {
  const result = { statuses: [], failures: [], ends: 0 };
  result.callbacks = {
    onStatus: status => result.statuses.push(status),
    onFailure: error => result.failures.push(error.message),
    onEnd: () => result.ends++
  };
  return result;
}

function queued(audio) {
  return {
    playing: audio.onplaying, stalled: audio.onstalled,
    ended: audio.onended, error: audio.onerror,
    reject: audio.rejections.at(-1)
  };
}

test('持续 stalled 不延长首次 8 秒期限，失败及迟到事件只处理一次', () => {
  const b = browser(), result = observer();
  b.player.play('wall', result.callbacks);
  const audio = b.elements[0], late = queued(audio);
  b.advance(7000);
  audio.onstalled();
  b.advance(999);
  assert.deepEqual(result.failures, []);
  b.advance(1);
  assert.deepEqual(result.failures, ['audio-start-timeout']);
  assert.equal(audio.paused, true);
  assert.equal(audio.src, '');
  const statusCount = result.statuses.length;
  audio.ended = true;
  late.playing(); late.stalled(); late.ended(); late.error(); late.reject();
  b.advance(70000);
  assert.deepEqual(result.failures, ['audio-start-timeout']);
  assert.equal(result.ends, 0);
  assert.equal(result.statuses.length, statusCount);
  assert.equal(b.timers.size, 0);
});

test('开始播放后连续卡顿满 8 秒降级，重复 waiting/stalled 不续期', () => {
  const b = browser(), result = observer();
  b.player.play('wall', result.callbacks);
  const audio = b.elements[0];
  audio.onplaying();
  b.advance(1000);
  audio.onwaiting();
  b.advance(7000);
  audio.onstalled(); audio.onwaiting();
  b.advance(999);
  assert.deepEqual(result.failures, []);
  b.advance(1);
  assert.deepEqual(result.failures, ['audio-load-timeout']);
  assert.equal(audio.paused, true);
  b.advance(90000);
  assert.equal(result.failures.length, 1);
  assert.equal(result.ends, 0);
  assert.equal(b.timers.size, 0);
});

test('卡顿恢复播放会撤销旧期限，下一次卡顿重新计时', () => {
  const b = browser(), result = observer();
  b.player.play('wall', result.callbacks);
  const audio = b.elements[0];
  audio.onplaying();
  b.advance(1000);
  audio.onwaiting();
  b.advance(7000);
  audio.onplaying();
  b.advance(7000);
  assert.deepEqual(result.failures, []);
  audio.onstalled();
  b.advance(8000);
  assert.deepEqual(result.failures, ['audio-load-timeout']);
});

test('重复点击复用播放器，stop 后旧回调、拒绝与超时不能恢复或降级', () => {
  const b = browser(), old = observer(), current = observer();
  b.player.play('wall', old.callbacks);
  const audio = b.elements[0], stale = queued(audio);
  const staleTimeout = [...b.timers.values()][0].callback;
  b.player.play('blue', current.callbacks);
  assert.equal(b.elements.length, 1);
  assert.equal(audio.src, clips.blue);
  audio.ended = true;
  stale.playing(); stale.stalled(); stale.ended(); stale.error(); stale.reject(); staleTimeout();
  assert.deepEqual(old.failures, []);
  assert.equal(old.ends, 0);
  assert.equal(old.statuses.length, 1);
  assert.deepEqual(current.failures, []);
  assert.equal(current.statuses.length, 1);
  audio.ended = false;
  audio.onplaying();
  const cancelled = queued(audio), cancelledTimeout = [...b.timers.values()][0].callback;
  b.player.stop();
  const statusCount = current.statuses.length;
  audio.ended = true;
  cancelled.playing(); cancelled.stalled(); cancelled.ended(); cancelled.error();
  cancelled.reject(); cancelledTimeout();
  b.advance(90000);
  assert.equal(audio.paused, true);
  assert.equal(audio.src, '');
  assert.deepEqual(current.failures, []);
  assert.equal(current.ends, 0);
  assert.equal(current.statuses.length, statusCount);
  assert.equal(b.timers.size, 0);
});
