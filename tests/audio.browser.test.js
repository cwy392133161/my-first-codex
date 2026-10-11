'use strict';

// Run with: node tests/audio.browser.test.js
// Real MP3 decoding/playback covers Huawei-style browsers without speechSynthesis.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const questions = require('../data/questions.js');
const unit2 = require('../data/english-unit2.js');

const root = path.resolve(__dirname, '..');
const KEY = 'learning-garden-v1';
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
      const body = await fs.readFile(file);
      const type = file.endsWith('.mp3') ? 'audio/mpeg'
        : file.endsWith('.js') ? 'text/javascript; charset=utf-8'
        : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
      response.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
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
      const sample = { node: this, events: [], maximumTime: 0, duration: 0, playingCount: 0 };
      window.audioMedia.push(sample);
      for (const name of ['loadedmetadata', 'canplay', 'playing', 'ended', 'pause', 'error']) {
        this.addEventListener(name, () => {
          sample.events.push(name);
          if (name === 'loadedmetadata') sample.duration = this.duration;
          if (name === 'playing') {
            sample.playingCount++;
            const active = window.audioMedia.filter(item => !item.node.paused && !item.node.ended).length;
            window.audioMaxActive = Math.max(window.audioMaxActive, active);
          }
        });
      }
      this.addEventListener('timeupdate', () => { sample.maximumTime = Math.max(sample.maximumTime, this.currentTime); });
    }
    const mediaIndex = window.audioMedia.findIndex(sample => sample.node === this);
    window.audioPlayCalls.push({ src: this.src, time: performance.now(), mediaIndex,
      playingCountBefore: window.audioMedia[mediaIndex].playingCount });
    return realPlay.apply(this, args);
  };
  HTMLMediaElement.prototype.pause = function (...args) {
    window.audioPauseCalls++;
    return realPause.apply(this, args);
  };
}

(async () => {
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
        await goals(page, question.topic.startsWith('hello-') ? 'hello' : question.topic.startsWith('unit1-') ? 'unit1' : 'unit2');
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
        return calls.length > prior && window.audioMedia.some(sample => sample.events.includes('ended'))
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
    pass('截图中的 wall 在无系统语音的浏览器中真实播放 MP3，首次作答记录不变');

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
    assert.deepEqual(pageErrors, [], '所有设备和失败场景均没有未捕获脚本异常');
    assert(requests.every(request => request.method === 'GET' && new URL(request.url).origin === origin),
      '运行时只读取项目本身的文件，不发送文字或资料到外部语音接口');
    assert(requests.some(request => /\/assets\/audio\/[^/]+\.mp3$/.test(request.url)), '确实请求了项目内的录音文件');
    pass('录音失败后原生兜底可用；原生抛错、报错、超时与旧回调安全降级；仅同源文件读取');

    console.log(`通过 ${passed.length} 组真实浏览器音频检查。`);
  } finally {
    await Promise.all(contexts.map(context => context.close().catch(() => {})));
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
