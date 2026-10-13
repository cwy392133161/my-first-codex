'use strict';

// Run with: node tests/audio.browser.test.js
// Real MP3 decoding/playback covers browsers without speechSynthesis.
// Browser playback and file correspondence do not confirm human pronunciation.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { execFile } = require('node:child_process');
const audit = require('../data/audio-audit.json');
const questions = require('../data/questions.js');
const unit2 = require('../data/english-unit2.js');
const unit3 = require('../data/english-unit3.js');
const manifest = require('../data/audio-manifest.js');
const speechText = require('../speech-text.js');

const root = path.resolve(__dirname, '..');
const KEY = 'learning-garden-v1';
const AUDIO_CACHE = 'azure-jenny-unit3-v1-20261013';
const APP_CACHE = 'unit3-farm-audio-v2-20261013';
const exact = value => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const wall = questions.bank('english1').find(q => q.id === 'english1-wall-meaning');
const listen = questions.bank('hello-numbers').find(q => q.kind === 'listening');
const story = questions.bank('unit2-reading').find(q => q.passage);
const oldRecords = {
  attempts: [{ session: 'before-huawei-audio', topic: 'pinyin', question: 'pinyin-59', correct: false, review: false, time: 1000 }],
  sessions: [], wrong: ['pinyin-59']
};

async function serverStart() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const file = path.resolve(root, url.pathname === '/' ? 'index.html' : `.${decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
      const relative = url.pathname === '/' ? '/index.html' : url.pathname;
      const body = server.legacyFiles?.get(relative) || await fs.readFile(file);
      const type = file.endsWith('.mp3') ? 'audio/mpeg'
        : file.endsWith('.js') ? 'text/javascript; charset=utf-8'
        : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
      server.servedRequests.push(request.url);
      response.writeHead(200, {
        'Content-Type': type, 'Content-Length': body.length,
        'Cache-Control': /\.(?:js|mp3)$/.test(file) ? 'public, max-age=31536000' : 'no-cache'
      }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  server.servedRequests = [];
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function legacyAudioFiles() {
  // Retain the real previous resources in browser HTTP cache before switching
  // the same origin to the candidate. Playwright routing would disable cache.
  const read = filename => new Promise((resolve, reject) => {
    execFile('git', ['show', `15992d8:${filename}`],
      { cwd: root, encoding: 'buffer', maxBuffer: 1024 * 1024 }, (error, body) => {
        if (error) { reject(new Error(`无法读取交接提交中的缓存升级检查文件：${filename}`)); return; }
        resolve(body);
      });
  });
  const index = await read('index.html');
  const manifestSource = await read('data/audio-manifest.js');
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(manifestSource.toString('utf8'), sandbox);
  const previous = sandbox.module.exports;
  assert.equal(previous.version, 3, '增量升级从真实 Azure Jenny v3 清单开始');
  assert.equal(Object.keys(previous.clips).length, 398, '升级检查加载真实原有 398 段清单');
  // Serve a coherent historical page, including its bank and app. Combining
  // the old HTML with new scripts is not a real snapshot.
  const historical = new Map([['/index.html', index], ['/data/audio-manifest.js', manifestSource],
    ['/' + previous.clips.hello, await read(previous.clips.hello)]]);
  const assets = [...index.toString('utf8').matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^" ]*)?)"/g)]
    .map(match => match[1].split('?')[0]);
  for (const filename of new Set(assets)) historical.set('/' + filename, await read(filename));
  return {
    previous,
    files: historical
  };
}

function initialize(options) {
  let questionAPI;
  Object.defineProperty(window, 'GardenQuestions', {
    configurable: true,
    get: () => questionAPI,
    set(api) {
      const original = api.shuffle;
      api.shuffle = list => {
        const wanted = sessionStorage.getItem('audio-preferred-question');
        const first = list.find(q => q && typeof q === 'object' && q.id === wanted);
        return first ? [first, ...original(list.filter(q => q !== first))] : original(list);
      };
      questionAPI = api;
    }
  });
  window.audioNativeCalls = [];
  window.audioNativeCancels = 0;
  if (options.native === 'none') {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
  } else {
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true, value: class { constructor(text) { this.text = text; } }
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true, value: {
        getVoices: () => options.native === 'empty' ? [] : [{ name: 'Test English voice', lang: 'en-GB' }],
        addEventListener() {}, removeEventListener() {},
        cancel() { window.audioNativeCancels++; },
        speak(utterance) {
          window.audioNativeCalls.push(utterance);
          if (options.native === 'throw') throw new Error('Test: native speech is unavailable');
          if (options.native === 'error') { setTimeout(() => utterance.onerror?.({ error: 'synthesis-failed' }), 25); return; }
          if (options.native === 'hang') return;
          utterance.onstart?.();
          setTimeout(() => utterance.onend?.(), 75);
        }
      }
    });
  }

  // Observe native HTMLAudioElement methods/events, retaining real decoding and autoplay rules.
  const realPlay = HTMLMediaElement.prototype.play;
  const realPause = HTMLMediaElement.prototype.pause;
  const observed = new WeakSet();
  window.audioMedia = [];
  window.audioPlayCalls = [];
  window.audioMaxActive = 0;
  window.audioPauseCalls = 0;
  HTMLMediaElement.prototype.play = function (...args) {
    if (!observed.has(this)) {
      observed.add(this);
      const sample = { node: this, events: [], maximumTime: 0, duration: 0, playingCount: 0, currentCall: null };
      window.audioMedia.push(sample);
      for (const name of ['loadedmetadata', 'canplay', 'playing', 'ended', 'pause', 'error']) {
        this.addEventListener(name, () => {
          sample.events.push(name);
          if (sample.currentCall && sample.currentCall.src === this.currentSrc) {
            sample.currentCall.events.push(name);
            if (Number.isFinite(this.duration)) sample.currentCall.duration = this.duration;
            if (Number.isFinite(this.currentTime)) {
              sample.currentCall.maximumTime = Math.max(sample.currentCall.maximumTime, this.currentTime);
            }
          }
          if (name === 'loadedmetadata' && Number.isFinite(this.duration)) sample.duration = this.duration;
          if (name === 'playing') {
            sample.playingCount++;
            const active = window.audioMedia.filter(item => !item.node.paused && !item.node.ended).length;
            window.audioMaxActive = Math.max(window.audioMaxActive, active);
          }
        // Capture before audio-player's onended switches src/currentCall to the
        // next clip, or removes src after the last clip.
        }, true);
      }
      this.addEventListener('timeupdate', () => {
        if (Number.isFinite(this.currentTime)) {
          sample.maximumTime = Math.max(sample.maximumTime, this.currentTime);
          if (sample.currentCall && sample.currentCall.src === this.currentSrc) {
            sample.currentCall.maximumTime = Math.max(sample.currentCall.maximumTime, this.currentTime);
          }
        }
      }, true);
    }
    const mediaIndex = window.audioMedia.findIndex(sample => sample.node === this);
    const call = { src: this.src, time: performance.now(), mediaIndex,
      playingCountBefore: window.audioMedia[mediaIndex].playingCount,
      events: [], duration: 0, maximumTime: 0, playbackRate: this.playbackRate };
    window.audioPlayCalls.push(call);
    window.audioMedia[mediaIndex].currentCall = call;
    return realPlay.apply(this, args);
  };
  HTMLMediaElement.prototype.pause = function (...args) {
    window.audioPauseCalls++;
    return realPause.apply(this, args);
  };
}

(async () => {
  assert.equal(Object.keys(manifest.clips).length, 501, '交付版必须包含全部 501 段录音');
  const server = await serverStart();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const passed = [], contexts = [], requests = [], pageErrors = [];
  const pass = message => { passed.push(message); console.log(`✓ ${passed.length}. ${message}`); };
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    async function fresh(native = 'none', audioFailure = false) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      contexts.push(context);
      await context.addInitScript(initialize, { native });
      if (audioFailure) await context.route('**/assets/audio/*.mp3', route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Missing test audio' }));
      const page = await context.newPage();
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('request', request => requests.push({ method: request.method(), url: request.url() }));
      await page.goto(origin);
      await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: oldRecords });
      await page.reload();
      return page;
    }
    const click = (page, action) => page.locator(`button[data-action="${action}"]`).first().click();
    const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const prefer = (page, id) => page.evaluate(id => sessionStorage.setItem('audio-preferred-question', id), id);
    async function home(page) {
      await page.locator('#home-link').click();
      const confirmation = page.locator('dialog[open] [data-confirm]');
      if (await confirmation.count()) await confirmation.click();
    }
    async function units(page) {
      await home(page);
      await page.locator('button[data-action="subject"][data-id="english"]').click();
    }
    async function goals(page, group) {
      await units(page);
      await click(page, group + '-goals');
    }
    async function start(page, question) {
      await prefer(page, question.id);
      if (question.topic.startsWith('english')) {
        await units(page);
        await page.locator(`.english-unit[data-topic="${question.topic}"] button[data-action="start"]`).click();
      } else {
        await goals(page, question.topic.startsWith('hello-') ? 'hello' : question.topic.startsWith('unit1-') ? 'unit1'
          : question.topic.startsWith('unit3-') ? 'unit3' : 'unit2');
        await page.locator(`.goal-unit[data-topic="${question.topic}"] button[data-action="start"]`).click();
      }
      assert.equal(await page.locator('.question').getAttribute('data-question-id'), question.id);
    }
    const choice = (page, answer) => page.locator('button[data-action="answer"]').filter({ hasText: exact(answer) });
    const media = page => page.evaluate(() => window.audioMedia.map(sample => ({
      src: sample.node.src, duration: sample.duration, paused: sample.node.paused,
      ended: sample.node.ended, events: sample.events, maximumTime: sample.maximumTime
    })));
    async function begun(page, prior) {
      await page.waitForFunction(prior => {
        const call = window.audioPlayCalls[prior];
        return call && window.audioMedia[call.mediaIndex].playingCount > call.playingCountBefore;
      }, prior, { timeout: 15000 });
    }
    async function complete(page, prior, timeout = 45000) {
      await page.waitForFunction(prior => {
        const calls = window.audioPlayCalls;
        return calls.length > prior && calls.slice(prior).every(call => call.events.includes('ended'))
          && window.audioMedia.every(sample => sample.node.paused || sample.node.ended)
          && /读完|听完|播放完/.test(document.querySelector('.speech-status')?.textContent || '');
      }, prior, { timeout });
    }
    async function playToEnd(page, action, timeout) {
      const prior = await page.evaluate(() => window.audioPlayCalls.length);
      await click(page, action);
      await begun(page, prior);
      await complete(page, prior, timeout);
      return (await page.evaluate(() => window.audioPlayCalls)).slice(prior);
    }
    async function playMappedToEnd(page, action, text, timeout) {
      const expected = speechText.sentences(text).map(part => manifest.clips[speechText.canonical(part)]);
      assert(expected.length > 0 && expected.every(Boolean), '每个完整句子或示例词都有真实清单映射');
      assert.equal(await page.locator(`button[data-action="${action}"]`).first().isDisabled(), false,
        '已有录音的 Unit 3 播放按钮启用');
      const calls = await playToEnd(page, action, timeout);
      assert.deepEqual(calls.map(call => new URL(call.src).pathname), expected.map(file => '/' + file),
        '实际浏览器请求与英文句子按顺序一一对应');
      for (const call of calls) {
        assert(Number.isFinite(call.duration) && call.duration > 0 && call.maximumTime > 0
          && ['loadedmetadata', 'canplay', 'playing', 'ended'].every(event => call.events.includes(event)),
        '每个 MP3 均真实解码、产生播放进度并完整结束');
        assert.equal(call.playbackRate, 1, '浏览器以正常一倍速度播放');
      }
      return calls;
    }
    const status = page => page.locator('.speech-status').first().innerText();
    async function lifecycle() {
      const background = await fresh();
      await start(background, story);
      let prior = await background.evaluate(() => window.audioPlayCalls.length);
      await click(background, 'read-passage');
      await begun(background, prior);
      await background.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      assert((await media(background)).every(sample => sample.paused || sample.ended), 'pagehide 立即停止音频');
      const hiddenCalls = await background.evaluate(() => window.audioPlayCalls.length);
      await background.waitForTimeout(1500);
      assert.equal(await background.evaluate(() => window.audioPlayCalls.length), hiddenCalls, '页面离开后不继续播放下一句');
      assert.deepEqual(await saved(background), oldRecords);
      prior = hiddenCalls;
      await click(background, 'read-passage');
      await begun(background, prior);
      await background.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert((await media(background)).every(sample => sample.paused || sample.ended), '切到后台立即停止音频');
      const backgroundCalls = await background.evaluate(() => window.audioPlayCalls.length);
      await background.waitForTimeout(1500);
      assert.equal(await background.evaluate(() => window.audioPlayCalls.length), backgroundCalls, '后台不继续播放下一句');
      assert.deepEqual(await saved(background), oldRecords, '页面离开与后台取消均不修改成绩');
    }
    if (process.env.AUDIO_LIFECYCLE_ONLY === '1') {
      await lifecycle();
      console.log('✓ pagehide 和隐藏 visibilitychange 停止实际 MP3，无后续句子且记录不变。');
      return;
    }

    // 1: The exact reported wall question produces a genuine, decoded MP3.
    const page = await fresh();
    await start(page, wall);
    await choice(page, wall.answer).click();
    const afterAnswer = await saved(page);
    assert.equal(afterAnswer.attempts.length, oldRecords.attempts.length + 1);
    const wallClips = await playToEnd(page, 'speak');
    assert(wallClips.length > 0 && wallClips.every(call => /\/assets\/audio\/[^/]+\.mp3$/.test(call.src)));
    const wallMedia = await media(page);
    assert(wallMedia.some(sample => Number.isFinite(sample.duration) && sample.duration > 0 && sample.maximumTime > 0
      && sample.events.includes('canplay') && sample.events.includes('playing') && sample.events.includes('ended')),
    '无语音 API 时，真实 MP3 有 metadata、可播放、播放进度和结束事件');
    assert(!(await status(page)).includes('不支持'));
    assert.deepEqual(await saved(page), afterAnswer, '听读不重复记录 wall 的首次作答');
    assert.equal(await page.evaluate(() => window.audioNativeCalls.length), 0);
    await goals(page, 'hello');
    await page.locator('.goal-unit[data-topic="hello-greetings"] button[data-action="goal-learn"]').click();
    assert.equal(await page.evaluate(() => GardenAudioManifest.version), 3);
    assert.match(manifest.voice.profile, /^azure-jenny-v1-[a-f0-9]{12}$/);
    assert.equal(await page.evaluate(() => GardenAudioManifest.voice.profile), manifest.voice.profile);
    for (const [index, greeting] of ['hello', 'hi'].entries()) {
      if (index) await click(page, 'goal-next');
      assert.equal((await page.locator('button[data-action="speak"]').first().getAttribute('data-text'))
        .trim().replace(/[.!?]+$/, '').toLowerCase(), greeting, '问候卡保持 Hello 和 Hi 两个独立示范');
      const greetingClips = await playToEnd(page, 'speak');
      const corrected = audit.clips.find(clip => clip.key === greeting).digest.slice(0, 20);
      const old = crypto.createHash('sha256').update(greeting).digest('hex').slice(0, 20);
      assert.equal(manifest.clips[greeting], `assets/audio/${corrected}.mp3`);
      assert.equal(greetingClips.length, 1, '每个问候只播放相应的新版片段');
      assert.equal(new URL(greetingClips[0].src).pathname, '/assets/audio/' + corrected + '.mp3');
      assert(!greetingClips[0].src.includes(old), '请求新地址，不重复播放旧缓存中的 Hello / Hi');
    }
    assert.deepEqual(await saved(page), afterAnswer, 'Hello / Hi 的听读不修改旧记录或英语首次作答');
    assert.equal(await page.evaluate(() => window.audioNativeCalls.length), 0, '新版问候不依赖系统语音 API');
    for (const source of ['speech-text.js', 'data/audio-manifest.js', 'audio-player.js', 'app.js',
      'data/questions.js', 'data/english-unit3.js', 'style.css']) {
      const sourceRequests = requests.filter(request => new URL(request.url).pathname === '/' + source);
      assert(sourceRequests.length > 0, '真实页面确实加载新版脚本 ' + source);
      const version = ['app.js', 'data/questions.js', 'data/english-unit3.js', 'style.css'].includes(source) ? APP_CACHE : AUDIO_CACHE;
      assert(sourceRequests.every(request => new URL(request.url).searchParams.get('v') === version),
        source + ' 带新版缓存参数，避免平板继续使用旧逻辑');
    }
    pass('wall、Hello / Hi 真实播放新版 MP3，使用更新后的缓存地址，无系统语音且记录不变');

    // 2: Word learning and a listening question use audio without revealing its answer.
    await units(page);
    await page.locator('.english-unit[data-topic="englishhello"] button[data-action="learn"]').click();
    await playToEnd(page, 'speak');
    assert.deepEqual(await saved(page), afterAnswer, '学单词的听读不计成绩');
    await start(page, listen);
    assert.equal(await page.locator('.listening-text').isVisible(), false, 'MP3 可用时听辨不自动显示答案文字');
    assert(!(await page.locator('.question').innerText()).includes(listen.speech));
    await playToEnd(page, 'listen');
    assert.equal(await page.locator('.listening-text').isVisible(), false, '听完仍不泄露答案');
    const wrong = listen.choices.find(answer => answer !== listen.answer);
    await choice(page, wrong).evaluate(button => { button.click(); button.click(); });
    const firstWrong = await saved(page);
    assert.equal(firstWrong.attempts.length, afterAnswer.attempts.length + 1);
    assert.equal(firstWrong.attempts.at(-1).correct, false);
    await click(page, 'retry');
    await choice(page, listen.answer).click();
    assert.deepEqual(await saved(page), firstWrong, '音频听辨的重试不覆盖首次错答');
    await click(page, 'show-listening-text');
    assert.equal(await page.locator('.listening-text').isVisible(), true, '孩子可以主动看文字提示');
    assert((await page.locator('.listening-text').innerText()).includes(listen.fallbackPrompt));
    const afterListening = await saved(page);
    pass('学词音频、听辨隐藏答案、主动文字提示、重复点击和首次错答重试正确');

    // 3: Longer playback is cancelled before repeated playback or navigation.
    await start(page, story);
    const prior = await page.evaluate(() => window.audioPlayCalls.length);
    await click(page, 'read-passage');
    await begun(page, prior);
    await click(page, 'read-passage');
    await begun(page, prior + 1);
    assert.equal(await page.evaluate(() => window.audioMaxActive), 1, '重复点击不会叠加两段声音');
    assert((await page.evaluate(() => window.audioPauseCalls)) > 0, '重复点击停止旧声音');
    await home(page);
    assert((await media(page)).every(sample => sample.paused || sample.ended), '离开题目立即停止声音');
    await start(page, story);
    await playToEnd(page, 'read-passage');
    assert.deepEqual(await saved(page), afterListening);
    await lifecycle();
    pass('原创故事完整听读、连续点击与离开/退到后台取消播放，无后续句子且不计答题成绩');

    // 4: The phonics card reads whole example words with genuine playback.
    await goals(page, 'unit2');
    await page.locator('.goal-unit[data-topic="unit2-phonics"] button[data-action="goal-learn"]').click();
    const phonics = unit2.lesson('unit2-phonics')[0];
    assert.equal(await page.locator('button[data-action="speak"]').first().getAttribute('data-text'), phonics.sayModel);
    assert((await page.locator('button[data-action="speak"]').first().innerText()).includes('听示例词'));
    await playToEnd(page, 'speak');
    await click(page, 'goal-next');
    assert(!/读完|听完|播放完/.test(await status(page)), '上一张播放结束状态不会串到下一张');
    assert.deepEqual(await saved(page), afterListening);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '手机音频界面不横向溢出');
    pass('th / t 使用整词录音，换卡取消旧状态，手机界面可用');

    // 5: Every sentence in changed posters/booklets resolves to a local MP3 sequence.
    await goals(page, 'unit1');
    await click(page, 'poster');
    await page.locator('select[data-poster-item="0"]').selectOption('ruler');
    await page.locator('select[data-poster-count="0"]').selectOption('3');
    await page.locator('#poster-rule').selectOption('help');
    const posterCalls = await playToEnd(page, 'read-poster', 75000);
    assert(posterCalls.length >= 4, '动态海报由多个本地句子片段连续介绍');
    assert((await page.locator('#classroom-poster').innerText()).includes('The rulers are on the desk.'));
    await goals(page, 'unit2');
    await click(page, 'booklet');
    await page.locator('#booklet-name').selectOption('Ben');
    await page.locator('#booklet-age').selectOption('10');
    await page.locator('#booklet-hair').selectOption('blond');
    await page.locator('#booklet-eyes').selectOption('green');
    await page.locator('select[data-booklet-family="0"]').selectOption('grandpa');
    await page.locator('select[data-booklet-family="1"]').selectOption('sister');
    await page.locator('#booklet-favourite').selectOption('cat');
    const bookletCalls = await playToEnd(page, 'read-booklet', 75000);
    assert(bookletCalls.length >= 4, '四页小手册的选项组合可以连续听读');
    assert.equal(await page.locator('.booklet-page').count(), 4);
    assert.equal(await page.evaluate(() => window.audioMaxActive), 1);
    assert.deepEqual(await saved(page), afterListening, '作品听读不改变旧科目或英语成绩');
    pass('修改后的海报与四页小手册完整连续听读，句子不叠加且不修改记录');

    // 6: Bundled audio wins even where a native API exists or has no installed voices.
    for (const native of ['ok', 'empty']) {
      const compatible = await fresh(native);
      await start(compatible, listen);
      assert.equal(await compatible.locator('.listening-text').isVisible(), false);
      await playToEnd(compatible, 'listen');
      assert.equal(await compatible.evaluate(() => window.audioNativeCalls.length), 0, '已打包音频优先，不依赖系统英文声音');
      assert.deepEqual(await saved(compatible), oldRecords);
    }
    pass('系统有语音 API 或没有英文语音包时，仍优先播放已打包的真实 MP3');

    // 7: Missing media and a missing manifest fall back to visible text, not silence.
    const failing = await fresh('none', true);
    await start(failing, listen);
    assert.equal(await failing.locator('.listening-text').isVisible(), false);
    await click(failing, 'listen');
    await failing.locator('.listening-text').waitFor({ state: 'visible', timeout: 15000 });
    assert((await failing.locator('.listening-text').innerText()).includes(listen.fallbackPrompt));
    assert(await failing.evaluate(() => window.audioMedia.some(sample => sample.events.includes('error'))));
    assert.deepEqual(await saved(failing), oldRecords);
    const missing = await fresh('none');
    await missing.evaluate(() => { for (const key of Object.keys(GardenAudioManifest.clips)) delete GardenAudioManifest.clips[key]; });
    await start(missing, listen);
    await missing.locator('.listening-text').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await missing.evaluate(() => window.audioPlayCalls.length), 0, '清单缺失不发起不存在的音频请求');
    assert.deepEqual(await saved(missing), oldRecords);
    pass('录音 404 或清单缺失且系统无语音时，自动提供文字提示并保留旧记录');

    // 8: Native fallback, API failures, timeout and cancelled callbacks remain safe.
    const nativeFallback = await fresh('ok', true);
    await start(nativeFallback, listen);
    await click(nativeFallback, 'listen');
    await nativeFallback.waitForFunction(() => window.audioNativeCalls.length === 1, null, { timeout: 15000 });
    await nativeFallback.waitForFunction(() => /读完|听完|播放完/.test(document.querySelector('.speech-status')?.textContent || ''));
    assert.equal(await nativeFallback.locator('.listening-text').isVisible(), false, '录音失败但原生成功时不泄露听辨答案');
    assert.equal(await nativeFallback.evaluate(() => window.audioNativeCalls[0].text), listen.speech);
    await home(nativeFallback);
    await units(nativeFallback);
    await nativeFallback.locator('.english-unit[data-topic="englishhello"] button[data-action="learn"]').click();
    const newStatus = await status(nativeFallback);
    await nativeFallback.evaluate(() => window.audioNativeCalls[0].onend?.());
    assert.equal(await status(nativeFallback), newStatus, '取消后旧原生回调不会改变新页面状态');
    for (const native of ['throw', 'error', 'hang']) {
      const unavailable = await fresh(native, true);
      await start(unavailable, listen);
      await click(unavailable, 'listen');
      await unavailable.locator('.listening-text').waitFor({ state: 'visible', timeout: 15000 });
      assert((await unavailable.locator('.listening-text').innerText()).includes(listen.fallbackPrompt));
      assert.equal(await unavailable.evaluate(() => window.audioNativeCalls.length), 1);
      if (native === 'hang') {
        const failedStatus = await status(unavailable);
        await unavailable.evaluate(() => {
          window.audioNativeCalls[0].onstart?.();
          window.audioNativeCalls[0].onend?.();
        });
        assert.equal(await status(unavailable), failedStatus, '超时后迟到的原生回调不能把失败状态改成成功');
      }
      assert.deepEqual(await saved(unavailable), oldRecords);
    }
    pass('录音失败后原生兜底可用；原生抛错、报错、超时与旧回调安全降级；仅同源文件读取');

    // 9: Refresh the same origin with prior 398-clip Azure resources cached. Existing
    // Chinese/English first answers, mistakes and unrelated settings survive.
    const legacy = await legacyAudioFiles();
    server.legacyFiles = legacy.files;
    const upgrading = await fresh();
    await upgrading.evaluate(({ key, records }) => {
      localStorage.setItem(key, JSON.stringify(records));
      localStorage.setItem('audio-upgrade-setting', 'keep-me');
    }, { key: KEY, records: afterListening });
    await upgrading.reload();
    assert.equal(await upgrading.evaluate(() => GardenAudioManifest.version), 3);
    assert.equal(await upgrading.evaluate(() => Object.keys(GardenAudioManifest.clips).length), 398);
    const newlyRecorded = questions.bank('unit3-hasgot').find(q => q.id === 'unit3-hasgot-listen-no-tail');
    await start(upgrading, newlyRecorded);
    assert.equal(await upgrading.locator('button[data-action="listen"]').isDisabled(), true,
      '真实旧版清单缺少新增 Unit 3 录音时明确禁用');
    assert.equal(await upgrading.locator('.listening-text').isVisible(), true);
    assert((await status(upgrading)).includes('准备'));
    await goals(upgrading, 'hello');
    await upgrading.locator('.goal-unit[data-topic="hello-greetings"] button[data-action="goal-learn"]').click();
    const oldPlayback = await playToEnd(upgrading, 'speak');
    assert.equal(oldPlayback.length, 1);
    assert.equal(new URL(oldPlayback[0].src).pathname, '/' + legacy.previous.clips.hello);
    assert(server.servedRequests.includes('/data/audio-manifest.js?v=azure-jenny-v3-20261012'), '真实原 398 段清单曾下载并可进入 HTTP 缓存');
    assert(server.servedRequests.includes('/' + legacy.previous.clips.hello), '真实旧 Hello 曾下载并播放');
    const oldHelloRequests = () => server.servedRequests.filter(url => url === '/' + legacy.previous.clips.hello).length;
    const cachedHelloRequests = oldHelloRequests();
    await playToEnd(upgrading, 'speak');
    assert.equal(oldHelloRequests(), cachedHelloRequests, '再次播放旧 Hello 命中浏览器缓存，没有向服务端重复下载');
    assert.deepEqual(await saved(upgrading), afterListening);
    const beforeUpgrade = server.servedRequests.length;
    server.legacyFiles = null;
    await upgrading.reload();
    assert.equal(await upgrading.evaluate(() => GardenAudioManifest.version), 3, '增量升级继续使用 Azure v3 音频格式');
    assert.equal(await upgrading.evaluate(() => Object.keys(GardenAudioManifest.clips).length), 501,
      '同源刷新加载完整 501 段清单，没有沿用已缓存的 398 段清单');
    assert.equal(await upgrading.evaluate(() => GardenAudioManifest.voice.name), 'en-US-JennyNeural');
    assert(await upgrading.evaluate(() => GardenQuestions.topics.some(topic=>topic.id==='unit3-hasgot')),
      '同源升级获取包含 Unit 3 的题库，而不是旧缓存');
    assert.deepEqual(await saved(upgrading), afterListening, '刷新升级原样保留中文、英语首次记录与错题');
    assert.equal(await upgrading.evaluate(() => localStorage.getItem('audio-upgrade-setting')), 'keep-me');
    await goals(upgrading, 'hello');
    await upgrading.locator('.goal-unit[data-topic="hello-greetings"] button[data-action="goal-learn"]').click();
    const newPlayback = await playToEnd(upgrading, 'speak');
    assert.equal(newPlayback.length, 1);
    assert.equal(new URL(newPlayback[0].src).pathname, '/' + manifest.clips.hello);
    assert.equal(manifest.clips.hello, legacy.previous.clips.hello, '原 398 段录音的 Hello 地址继续复用');
    assert.equal(oldHelloRequests(), cachedHelloRequests, '升级后播放复用同一 Hello HTTP 缓存，不重复下载');
    const oldHelloBytes = legacy.files.get('/' + legacy.previous.clips.hello);
    assert.deepEqual(await fs.readFile(path.join(root, manifest.clips.hello)), oldHelloBytes,
      '原有 Hello 的实际 MP3 字节保持不变');
    await start(upgrading, newlyRecorded);
    assert.equal(await upgrading.locator('.listening-text').isVisible(), false, '新录音可用后不再显示准备中文字兜底');
    await playMappedToEnd(upgrading, 'listen', newlyRecorded.speech);
    assert.equal(await upgrading.locator('.listening-text').isVisible(), false);
    const upgradeRequests = server.servedRequests.slice(beforeUpgrade);
    assert(upgradeRequests.includes('/data/audio-manifest.js?v=' + AUDIO_CACHE), '新缓存参数请求当前 501 段清单');
    for (const source of ['app.js', 'data/questions.js', 'data/english-unit3.js', 'style.css']) {
      assert(upgradeRequests.includes('/' + source + '?v=' + APP_CACHE), source + ' 使用新版缓存参数');
    }
    assert(upgradeRequests.includes('/' + manifest.clips[speechText.canonical(newlyRecorded.speech)]),
      '刷新后实际下载并播放新增 Unit 3 MP3');
    assert.deepEqual(await saved(upgrading), afterListening, '新声音播放不改首次作答或错题，也没有清空数据');
    pass('同源原 398 段与 MP3 已缓存时，刷新切换 501 段并启用新 Unit 3 录音，Hello 缓存与学习记录和错题保留');

    // 10: New Unit 3 listening prompts and answer models are real Jenny MP3s.
    const farmPage = await fresh('ok');
    for (const id of ['ears', 'no-tail', 'yes', 'no']) {
      const q = questions.bank('unit3-hasgot').find(item => item.id === 'unit3-hasgot-listen-' + id);
      await start(farmPage, q);
      assert.equal(await farmPage.locator('.listening-text').isVisible(), false, 'Unit 3 听辨不提前揭示英文文字');
      await playMappedToEnd(farmPage, 'listen', q.speech);
      assert.equal(await farmPage.locator('.listening-text').isVisible(), false, '真实 MP3 听完也不泄露答案');
      assert.deepEqual(await saved(farmPage), oldRecords, 'Unit 3 只听题不写学习成绩');
    }
    let unit3Records = oldRecords;
    for (const id of ['complete-has', 'negative', 'ask', 'yes', 'no']) {
      const q = questions.bank('unit3-hasgot').find(item => item.id === 'unit3-hasgot-language-' + id);
      await start(farmPage, q);
      await choice(farmPage, q.answer).click();
      const answered = await saved(farmPage);
      assert.equal(answered.attempts.length, unit3Records.attempts.length + 1);
      assert.equal(answered.attempts.at(-1).question, q.id);
      assert.equal(answered.attempts.at(-1).correct, true);
      assert.equal(await farmPage.locator('button[data-action="speak"]').first().getAttribute('data-text'), q.answerSpeech);
      await playMappedToEnd(farmPage, 'speak', q.answerSpeech);
      assert.deepEqual(await saved(farmPage), answered, '肯定、否定、疑问和 Yes/No 示范播放不重复记分');
      unit3Records = answered;
    }
    await home(farmPage);
    await farmPage.reload();
    assert.deepEqual(await saved(farmPage), unit3Records, '新语法作答和旧错题在刷新后原样保存');
    assert.equal(await farmPage.evaluate(() => window.audioNativeCalls.length), 0,
      '即使设备原生声音可用，全部新 Unit 3 播放仍使用 Jenny MP3');
    pass('Unit 3 has/hasn’t got 听题及疑问、Yes/No 答后示范逐句真实播放，隐藏答案且首次成绩刷新保存');

    // 11: c/k/ck are complete-word audio, never letter names or bracketed spelling.
    await goals(farmPage, 'unit3');
    await farmPage.locator('.goal-unit[data-topic="unit3-phonics"] button[data-action="goal-learn"]').click();
    for (const [index, card] of unit3.lesson('unit3-phonics').slice(0, 3).entries()) {
      if (index) await click(farmPage, 'goal-next');
      const button = farmPage.locator('button[data-action="speak"]').first();
      assert.equal(await button.getAttribute('data-text'), card.sayModel);
      assert(!/[\[\]]/.test(await button.getAttribute('data-text')), '拼写方括号不进入朗读');
      assert((await button.innerText()).includes('听示例词'));
      await playMappedToEnd(farmPage, 'speak', card.sayModel);
    }
    assert.deepEqual(await saved(farmPage), unit3Records);
    pass('Unit 3 c / k / ck 分别播放 cat/cow、donkey、chicken/duck 完整词，与清单准确对应');

    // 12: The original baby story plays every sentence in order.
    const babyStory = questions.bank('unit3-reading').find(q => q.id === 'unit3-reading-lamb-name');
    await start(farmPage, babyStory);
    for (const line of babyStory.passage) assert((await farmPage.locator('.reading-passage').innerText()).includes(line));
    const babyCalls = await playMappedToEnd(farmPage, 'read-passage', babyStory.passage.join(' '));
    assert.equal(babyCalls.length, babyStory.passage.length);
    assert.deepEqual(await saved(farmPage), unit3Records, '完整宝宝故事不改变成绩或错题');
    pass('Unit 3 绵羊宝宝原创短文四句按原文顺序完整播放，包含出生方式和否定句');

    // 13: Edited farm sentences, plural sheep and the care promise play completely.
    await farmPage.setViewportSize({ width: 1024, height: 768 });
    await goals(farmPage, 'unit3');
    await click(farmPage, 'farm');
    const farmSelection = {
      animals: [{ key: 'sheep', count: 2, description: 'small' },
        { key: 'donkey', count: 1, description: 'big' },
        { key: 'duck', count: 3, description: 'happy' }], care: 'kind'
    };
    // Free the default sheep slot before selecting it in slot 0.
    for (const index of [1, 0, 2]) {
      const slot = farmSelection.animals[index];
      await farmPage.locator(`select[data-farm-animal="${index}"]`).selectOption(slot.key);
      await farmPage.locator(`select[data-farm-count="${index}"]`).selectOption(String(slot.count));
      await farmPage.locator(`select[data-farm-description="${index}"]`).selectOption(slot.description);
    }
    assert.deepEqual(await saved(farmPage), unit3Records, '编辑农场草稿不写学习记录');
    await click(farmPage, 'farm-show');
    const farmText = unit3.farmSentences(farmSelection);
    assert.deepEqual(await farmPage.locator('#farm-sheet p[lang="en"]').allTextContents(), farmText,
      '展示内容和编辑的三组动物、单复数、产品句与约定一致');
    const farmCalls = await playMappedToEnd(farmPage, 'read-farm', farmText.join(' '), 75000);
    assert.equal(farmCalls.length, farmText.length, '完整农场介绍每句都真实播放到结束');
    assert(!/\bsheeps\b/.test(farmText.join(' ')));
    assert.equal(farmText.at(-1), 'We are kind to animals.');
    assert.equal(await farmPage.evaluate(() => window.audioMaxActive), 1, '完整农场介绍逐句衔接且不叠音');
    await click(farmPage, 'farm-edit');
    await farmPage.locator('select[data-farm-count="0"]').selectOption('3');
    await click(farmPage, 'farm-show');
    const changedSelection = { animals: farmSelection.animals.map((slot, i) => i ? slot : { ...slot, count: 3 }), care: 'kind' };
    const changedText = unit3.farmSentences(changedSelection);
    const changedCalls = await playMappedToEnd(farmPage, 'read-farm', changedText.join(' '), 75000);
    assert.equal(changedCalls.length, changedText.length);
    assert.equal(new URL(changedCalls[0].src).pathname, '/' + manifest.clips['our farm has got three sheep'],
      '修改后播放新的三只绵羊句子，没有沿用旧草稿录音');
    assert(await farmPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '平板农场音频界面不溢出');
    assert.deepEqual(await saved(farmPage), unit3Records, '两次完整农场介绍和再编辑均保留全部记录与错题');
    pass('可编辑完整农场介绍真实播放单/复数、sheep、产品句及照顾约定，修改数量后使用对应 MP3');

    // 14: Unit 3 must not silently use a different system voice when media fails.
    const unit3Failure = await fresh('ok', true);
    await start(unit3Failure, newlyRecorded);
    await click(unit3Failure, 'listen');
    await unit3Failure.locator('.listening-text').waitFor({ state: 'visible', timeout: 15000 });
    assert((await unit3Failure.locator('.listening-text').innerText()).includes(newlyRecorded.fallbackPrompt));
    assert.equal(await unit3Failure.evaluate(() => window.audioNativeCalls.length), 0);
    assert.deepEqual(await saved(unit3Failure), oldRecords);
    pass('新增 Unit 3 MP3 失败时提供明确文字提示，有系统语音也不替换已指定 Jenny 声线');

    assert.deepEqual(pageErrors, [], '所有设备和失败场景均没有未捕获脚本异常');
    assert(requests.every(request => request.method === 'GET' && new URL(request.url).origin === origin),
      '运行时只读取项目本身的文件，不发送文字或资料到外部语音接口');
    assert(requests.some(request => /\/assets\/audio\/[^/]+\.mp3$/.test(request.url)), '确实请求了项目内的录音文件');

    console.log(`通过 ${passed.length} 组真实浏览器音频检查。`);
    console.log('以上验证实际 MP3 播放与文本对应，不等同于全部发音已人工确认。');
  } finally {
    await Promise.all(contexts.map(context => context.close().catch(() => {})));
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
