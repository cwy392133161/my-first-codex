'use strict';

// Run with: node tests/unit3.browser.test.js
// Real Chromium tests gameplay, local data and delivered MP3 playback at normal 1x.
// Media events establish decoding/playback, never pronunciation accuracy.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const unit3 = require('../data/english-unit3.js');
const questionAPI = require('../data/questions.js');
const manifest = require('../data/audio-manifest.js');

const root = path.resolve(__dirname, '..');
const KEY = 'learning-garden-v1';
const goals = unit3.topics.map(topic => topic.id);
const allQuestions = questionAPI.topics.flatMap(topic => questionAPI.bank(topic.id));
const newQuestions = goals.flatMap(unit3.bank);
const legacyQuestions = ['pinyin', 'arithmetic', 'english3', 'hello-name-age', 'unit1-position', 'unit2-havegot', 'review02-mixed']
  .map(topic => questionAPI.bank(topic)[0]);
const legacy = {
  attempts: legacyQuestions.map((q, i) => ({ session: `published-${i}`, topic: q.topic, question: q.id, correct: false, review: false, time: 1000 + i })),
  sessions: [], wrong: legacyQuestions.map(q => q.id)
};
const exact = value => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
function initialize(options = {}) {
  let api;
  Object.defineProperty(window, 'GardenQuestions', {
    configurable: true,
    get: () => api,
    set(value) {
      const original = value.shuffle;
      value.shuffle = list => {
        const wanted = sessionStorage.getItem('unit3PreferredQuestion');
        const first = list.find(item => item && typeof item === 'object' && item.id === wanted);
        return first ? [first, ...original(list.filter(item => item !== first))] : original(list);
      };
      api = value;
    }
  });
  window.unit3NativeCalls = 0;
  if (options.nativeSpeech) {
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'Existing native English voice', lang: 'en-GB' }],
      addEventListener() {}, removeEventListener() {}, cancel() {},
      speak() { window.unit3NativeCalls++; }
    } });
  } else {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
  }
  const originalPlay = HTMLMediaElement.prototype.play;
  const observed = new WeakSet(), current = new WeakMap();
  window.unit3PlayCalls = [];
  window.unit3AudioNodes = [];
  window.unit3MaxPlaying = 0;
  HTMLMediaElement.prototype.play = function (...args) {
    const row = { src: this.src, rate: this.playbackRate, events: [], duration: 0, maximumTime: 0 };
    current.set(this, row);window.unit3PlayCalls.push(row);
    if (!observed.has(this)) {
      observed.add(this);window.unit3AudioNodes.push(this);
      for (const name of ['loadedmetadata', 'canplay', 'playing', 'timeupdate', 'ended', 'error']) {
        this.addEventListener(name, () => {
          const sample = current.get(this);
          if (!sample.events.includes(name)) sample.events.push(name);
          if (Number.isFinite(this.duration)) sample.duration = this.duration;
          sample.maximumTime = Math.max(sample.maximumTime, this.currentTime);
          if (name === 'playing') window.unit3MaxPlaying = Math.max(window.unit3MaxPlaying,
            window.unit3AudioNodes.filter(node => !node.paused && !node.ended).length);
        }, true); // Observe ended before the player's next-sentence callback.
      }
    }
    return originalPlay.apply(this, args);
  };
}
async function serve() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const file = path.resolve(root, url.pathname === '/' ? 'index.html' : `.${decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
      const body = await fs.readFile(file);
      const contentType = file.endsWith('.js') ? 'text/javascript; charset=utf-8'
        : file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.mp3') ? 'audio/mpeg' : 'text/html; charset=utf-8';
      response.writeHead(200, { 'Content-Type': contentType }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

(async () => {
  assert.equal(manifest.version, 3, '完成版使用 Azure v3 清单');
  assert.equal(manifest.voice.name, 'en-US-JennyNeural');
  assert.equal(Object.keys(manifest.clips).length, 501, '完成版必须交付全部 501 段，不能用旧 398 段代替');
  const server = await serve(), origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const passed = [];
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    await context.addInitScript(initialize);
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push({ method: request.method(), url: request.url() }));
    await page.goto(origin);
    const click = action => page.locator(`button[data-action="${action}"]`).first().click();
    const current = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const home = () => page.locator('#home-link').click();
    const overview = async () => {
      await home();
      await page.locator('button[data-action="subject"][data-id="english"]').click();
      await page.locator('.english-unit[data-topic="english3"] button[data-action="unit3-goals"]').click();
    };
    const goal = topic => page.locator(`.goal-unit[data-topic="${topic}"]`);
    const start = topic => goal(topic).locator(`button[data-action="start"][data-id="${topic}"]`).click();
    const learn = topic => goal(topic).locator(`button[data-action="goal-learn"][data-id="${topic}"]`).click();
    const count = n => page.locator(`button[data-action="count"][data-count="${n}"]`).first().click();
    const choice = answer => page.locator('button[data-action="answer"]').filter({ hasText: exact(answer) });
    const prefer = id => page.evaluate(id => sessionStorage.setItem('unit3PreferredQuestion', id), id);
    const displayed = async () => {
      assert.equal(await page.locator('.question').count(), 1, '每屏只显示一道题');
      const id = await page.locator('.question').getAttribute('data-question-id');
      const q = allQuestions.find(item => item.id === id);
      assert(q, `浏览器显示真实题库题号：${id}`);
      return q;
    };
    const leave = async () => { await click('leave'); await page.locator('dialog[open] [data-confirm]').click(); };
    const audioKey = text => text.replace(/[‘’]/g, "'").trim().replace(/[.!?]+$/, '').toLowerCase();
    const playToEnd = async (action, expectedTexts) => {
      const before = await current();
      const prior = await page.evaluate(() => window.unit3PlayCalls.length);
      assert.equal(await page.locator(`button[data-action="${action}"]`).first().isDisabled(), false, '已交付录音的按钮可以播放');
      await click(action);
      await page.waitForFunction(({ prior, length }) => {
        const calls = window.unit3PlayCalls.slice(prior);
        return calls.length === length && calls.every(call => call.events.includes('ended'))
          && /读完/.test(document.querySelector('.speech-status')?.textContent || '');
      }, { prior, length: expectedTexts.length }, { timeout: 75000 });
      const calls = await page.evaluate(prior => window.unit3PlayCalls.slice(prior), prior);
      assert.deepEqual(calls.map(call => new URL(call.src).pathname),
        expectedTexts.map(text => '/' + manifest.clips[audioKey(text)]), '实际播放地址按朗读句子的顺序对应清单');
      for (const call of calls) {
        assert.equal(call.rate, 1, '教学示范正常 1 倍速播放');
        assert(call.duration > 0 && call.maximumTime > 0);
        for (const event of ['loadedmetadata', 'canplay', 'playing', 'timeupdate', 'ended']) assert(call.events.includes(event));
        assert(!call.events.includes('error'));
      }
      assert.equal(await page.evaluate(() => window.unit3MaxPlaying), 1, '朗读片段不能叠放');
      assert.equal(await page.evaluate(() => window.unit3NativeCalls), 0);
      assert.deepEqual(await current(), before, '实际听读不能写入或覆盖首次记录');
      return calls;
    };
    const noOverflow = async label => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label} 没有横向溢出`);
      for (const button of await page.locator('.choices button').all()) {
        assert(await button.evaluate(element => element.scrollWidth <= element.clientWidth), `${label} 选项完整显示`);
      }
    };
    await home();
    await click('records');
    assert((await page.locator('#app').innerText()).includes('暂无'), '空记录正常展示');
    await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: legacy });
    await page.reload();
    await overview();
    assert.equal(await page.locator('.goal-unit').count(), 7);
    for (const topic of goals) assert.equal(await goal(topic).count(), 1);
    assert.deepEqual(await current(), legacy, '进入 Unit 3 保留所有旧科目记录');
    passed.push('空记录、七个独立学习目标、新入口及全部旧记录保留');

    for (const topic of goals) {
      await overview();
      const cards = unit3.lesson(topic);
      await learn(topic);
      for (const [index, card] of cards.entries()) {
        assert.equal(await page.locator('.goal-card').count(), 1);
        assert.equal(await page.locator('.goal-title').innerText(), card.title);
        for (const line of card.lines) {
          assert((await page.locator('.goal-card').innerText()).includes(line.english));
          assert((await page.locator('.goal-card').innerText()).includes(line.chinese));
        }
        if (index === 0) assert.equal(await page.locator('button[data-action="goal-prev"]').isDisabled(), true);
        assert.equal(await page.locator('.say-model').isVisible(), false);
        await click('show-model');
        assert((await page.locator('.say-model').innerText()).includes(card.sayModel));
        await click('say-done');
        assert.equal(await page.locator('button[data-action="say-done"]').isDisabled(), true);
        assert.deepEqual(await current(), legacy, '学习卡浏览和开口鼓励不写答题记录');
        if (index + 1 < cards.length) await click('goal-next');
        else assert.equal(await page.locator('button[data-action="goal-next"]').isDisabled(), true);
      }
    }
    passed.push('七目标全部卡片、中英内容、翻页边界及不计分的自愿练说');

    let retryWrong, twiceWrong;
    for (const [index, topic] of goals.entries()) {
      await overview(); await count(5); await start(topic);
      for (let i = 0; i < 5; i++) {
        const q = await displayed();
        assert.equal(q.topic, topic, '按知识点练习不混入其他题库');
        if (i === 0 && index < 2) {
          const before = (await current()).attempts.length;
          const wrong = q.choices.find(option => option !== q.answer);
          await choice(wrong).evaluate(button => { button.click(); button.click(); });
          assert.equal((await current()).attempts.length, before + 1, '重复点击只记录一次首次结果');
          const feedback = await page.locator('#feedback').innerText();
          assert(feedback.includes(q.hint));
          assert(!feedback.includes(`答案是 ${q.answer}`), '第一次答错先给提示');
          await click('retry');
          if (index === 0) { retryWrong = q; await choice(q.answer).click(); }
          else {
            twiceWrong = q; await choice(wrong).click();
            assert((await page.locator('#feedback').innerText()).includes(`答案是 ${q.answer}`));
            assert((await page.locator('#feedback').innerText()).includes(q.explanation));
          }
          assert.equal((await current()).attempts.length, before + 1, '重试不覆盖首次错答');
          assert.equal((await current()).attempts.at(-1).correct, false);
        } else await choice(q.answer).click();
        await page.locator('button[data-action="next"]').evaluate(button => { button.click(); button.click(); });
      }
      assert((await page.locator('#app').innerText()).includes('这次练习完成啦'));
      const saved = await current();
      assert.equal(saved.sessions.at(-1).total, 5);
      assert.equal(saved.sessions.at(-1).correct, index < 2 ? 4 : 5);
      assert.equal(saved.sessions.at(-1).review, false);
      assert.deepEqual(saved.attempts.slice(0, legacy.attempts.length), legacy.attempts);
    }
    for (const topic of ['unit3-hasgot', 'unit3-spelling']) {
      await overview(); await count(10); await start(topic);
      for (let i = 0; i < 10; i++) {
        const q = await displayed(); assert.equal(q.topic, topic);
        await choice(q.answer).click(); await click('next');
      }
      assert.equal((await current()).sessions.at(-1).total, 10);
      assert.equal((await current()).sessions.at(-1).correct, 10);
    }
    passed.push('真实七目标逐题 5 题及 10 题总结、答错两步反馈、重复点击锁与首次正确率');

    const grammarExamples = [
      ['unit3-hasgot-listen-ears', ['It has got long ears.']],
      ['unit3-hasgot-listen-no-tail', ["It hasn't got a long tail."]],
      ['unit3-hasgot-listen-yes', ['Has it got wings?', 'Yes, it has.']],
      ['unit3-hasgot-listen-no', ['Has it got a tail?', "No, it hasn't."]]
    ];
    const listening = newQuestions.find(q => q.id === grammarExamples[1][0]);
    for (const [id, texts] of grammarExamples) {
      const q = newQuestions.find(question => question.id === id);
      await overview(); await prefer(q.id); await start(q.topic);
      assert.equal((await displayed()).id, q.id);
      assert.equal(await page.locator('.listening-text').isVisible(), false, 'MP3 可用时听辨答案默认隐藏');
      assert(!(await page.locator('.question').innerText()).includes(q.speech));
      await playToEnd('listen', texts);
      assert.equal(await page.locator('.listening-text').isVisible(), false, '听完也不自动泄漏听辨文字');
      await click('show-listening-text');
      assert((await page.locator('.listening-text').innerText()).includes(q.fallbackPrompt));
      await choice(q.answer).click(); await leave();
    }
    passed.push('has / hasn’t got 陈述和 Yes / No 问答真实 MP3 正常播放、句子地址顺序对应、听辨隐藏答案');

    await overview(); await learn('unit3-phonics');
    for (const [index, text] of ['cat, cow', 'donkey', 'chicken, duck', 'cat, cow, donkey, chicken, duck'].entries()) {
      if (index) await click('goal-next');
      assert.equal(await page.locator('button[data-action="speak"]').first().getAttribute('data-text'), text);
      await playToEnd('speak', [text]);
    }
    passed.push('c / k / ck 卡片播放完整 cat、cow、donkey、chicken、duck 示例词，不读字母名或括号');

    const readingIds = ['unit3-reading-chick-name', 'unit3-reading-duckling-name', 'unit3-reading-lamb-name', 'unit3-reading-calf-and-baby-name'];
    const reading = newQuestions.find(q => q.id === readingIds[0]);
    for (const id of readingIds) {
      const q = newQuestions.find(question => question.id === id);
      await overview(); await prefer(q.id); await start(q.topic);
      for (const line of q.passage) assert((await page.locator('.reading-passage').innerText()).includes(line));
      await playToEnd('read-passage', q.passage);
      await choice(q.answer).click(); await leave();
    }
    passed.push('四篇 chick / duckling / lamb / calf 与 human baby 阅读原文完整真实 MP3 连续播放、作答正确对应');

    await overview();
    const beforeFarm = await current();
    await click('farm');
    const initialAnimals = ['cow', 'sheep', 'chicken'];
    for (const [i, animal] of initialAnimals.entries()) {
      const select = page.locator(`select[data-farm-animal="${i}"]`);
      assert.equal(await select.inputValue(), animal);
      assert.equal(await select.locator(`option[value="${animal}"]`).evaluate(option => option.disabled), false);
      for (const other of initialAnimals.filter(key => key !== animal)) {
        assert.equal(await select.locator(`option[value="${other}"]`).evaluate(option => option.disabled), true, '其他组已经选择的动物不可重复选择');
      }
    }
    await page.locator('select[data-farm-animal="0"]').evaluate(select => {
      select.value = 'sheep';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.locator('select[data-farm-animal="0"]').inputValue(), 'cow', '程序触发重复选项也应被拒绝并恢复旧值');
    assert.deepEqual(await current(), beforeFarm, '无效农场变更不写记录');
    const selected = [
      { key: 'sheep', count: 3, description: 'small' },
      { key: 'donkey', count: 1, description: 'big' },
      { key: 'chicken', count: 2, description: 'happy' }
    ];
    for (const i of [1, 0, 2]) {
      const item = selected[i];
      await page.locator(`select[data-farm-animal="${i}"]`).selectOption(item.key);
      await page.locator(`select[data-farm-count="${i}"]`).selectOption(String(item.count));
      await page.locator(`select[data-farm-description="${i}"]`).selectOption(item.description);
    }
    for (const [i, item] of selected.entries()) {
      for (const other of selected.filter(other => other !== item)) {
        assert.equal(await page.locator(`select[data-farm-animal="${i}"] option[value="${other.key}"]`).evaluate(option => option.disabled), true, '合法编辑后，其他组的禁用选项立即同步');
      }
    }
    assert.deepEqual(await current(), beforeFarm, '编辑农场草稿不写学习记录');
    await click('farm-show');
    const sheet = page.locator('#farm-sheet');
    assert.equal(await sheet.isVisible(), true);
    assert.equal(await page.locator('.farm-plot').count(), 3);
    const expected = [
      ['Our farm has got three sheep.', 'They are small.', 'They have got tails.', 'Sheep give us wool.'],
      ['Our farm has got one donkey.', 'It is big.', 'It has got a tail.'],
      ['Our farm has got two chickens.', 'They are happy.', 'They have got wings.', 'Chickens give us eggs.']
    ];
    for (const [i, item] of selected.entries()) {
      const plot = page.locator(`.farm-plot[data-farm-plot="${i}"]`);
      assert.equal(await plot.locator('.farm-animal-row span').count(), item.count, '图中动物数量与选择一致');
      for (const line of expected[i]) assert((await plot.innerText()).includes(line), `实际农场描述正确：${line}`);
    }
    assert(!/\bsheeps\b/.test(await sheet.innerText()), 'sheep 复数不加 s');
    await page.locator('#farm-chinese').setChecked(false);
    for (const line of await page.locator('[data-farm-chinese]').all()) assert.equal(await line.isVisible(), false);
    await page.locator('#farm-chinese').setChecked(true);
    await playToEnd('read-farm', [...expected.flat(), 'We are kind to animals.']);
    const priorFarm = await page.evaluate(() => window.unit3PlayCalls.length);
    await click('read-farm');
    await page.waitForFunction(prior => window.unit3PlayCalls[prior]?.events.includes('playing'), priorFarm);
    await click('read-farm');
    await page.waitForFunction(prior => window.unit3PlayCalls[prior + 1]?.events.includes('playing'), priorFarm);
    assert.equal(await page.evaluate(() => window.unit3MaxPlaying), 1, '连续点击农场介绍会先停止旧声音');
    await click('farm-edit');
    assert(await page.evaluate(() => window.unit3AudioNodes.every(node => node.paused || node.ended)), '编辑或离开立即停止介绍');
    const cancelledFarm = await page.evaluate(() => window.unit3PlayCalls.length);
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => window.unit3PlayCalls.length), cancelledFarm, '取消后不继续后续句子');
    await click('farm-show');
    await click('farm-say-done');
    assert.equal(await page.locator('button[data-action="farm-say-done"]').isDisabled(), true);
    assert.deepEqual(await current(), beforeFarm, '展示与自愿介绍农场不计答题成绩');
    const shown = await sheet.textContent();
    await click('farm-edit');
    for (const [i, item] of selected.entries()) assert.equal(await page.locator(`select[data-farm-animal="${i}"]`).inputValue(), item.key);
    await click('farm-show'); assert.equal(await sheet.textContent(), shown, '修改返回保留内存草稿');
    await click('unit3-goals');
    assert.deepEqual(await current(), beforeFarm, '取消并返回学习目标不写记录');
    passed.push('小农场三组选择、数量/单复数/产品句、完整 MP3 介绍、连续点击和切页停止、草稿返回及不计分');

    await page.reload();
    assert((await current()).wrong.includes(retryWrong.id) && (await current()).wrong.includes(twiceWrong.id));
    for (const q of [retryWrong, twiceWrong, legacyQuestions[5]]) {
      await home(); await click('review'); await prefer(q.id); await click('start-review');
      assert.equal((await displayed()).id, q.id);
      const before = (await current()).attempts.length;
      await choice(q.answer).evaluate(button => { button.click(); button.click(); });
      const saved = await current();
      assert.equal(saved.attempts.length, before + 1);
      assert(!saved.wrong.includes(q.id)); assert.equal(saved.attempts.at(-1).review, true);
      await leave();
    }
    await home(); await click('records');
    for (const topic of unit3.topics) {
      const recorded = (await current()).attempts.filter(a => a.topic === topic.id);
      const percent = Math.round(recorded.filter(a => a.correct).length / recorded.length * 100);
      const record = page.locator('.record').filter({ has: page.locator('strong').filter({ hasText: exact(`${topic.icon} ${topic.name}`) }) });
      assert.equal(await record.count(), 1);
      assert((await record.innerText()).includes(`${percent}%`), '家长页面显示 Unit 3 实际首次正确率');
    }
    const beforeBackup = await current();
    const [download] = await Promise.all([page.waitForEvent('download'), click('export')]);
    const exported = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    assert.deepEqual(exported.data, beforeBackup);
    await click('clear'); await page.locator('dialog[open] [data-confirm]').click();
    assert.deepEqual(await current(), { attempts: [], sessions: [], wrong: [] });
    for (let i = 0; i < 2; i++) {
      await page.locator('#backup-file').setInputFiles({ name: 'unit3-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
      await page.locator('dialog[open] [data-confirm]').click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.deepEqual(await current(), beforeBackup, '实际导入恢复混合新旧记录，重复导入幂等');
    }
    await page.reload(); assert.deepEqual(await current(), beforeBackup);
    passed.push('刷新保存、新旧错题重练移除、首次率按目标显示、真实备份下载/确认清空/导入恢复');

    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await overview(); await noOverflow(`${width}px 目标页`);
      await learn('unit3-hasgot'); await noOverflow(`${width}px 语法卡`);
      await overview(); await start('unit3-describe'); await noOverflow(`${width}px 图示题`); await leave();
      await overview(); await click('farm'); await noOverflow(`${width}px 农场选择`);
      await click('farm-show'); await noOverflow(`${width}px 农场展示`);
      await page.screenshot({ path: `/tmp/unit3-farm-${width}.png`, fullPage: true });
    }
    passed.push('390px 手机和 1024px 平板目标、卡片、题目、农场均不溢出，无外部请求');

    const nativeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await nativeContext.addInitScript(initialize, { nativeSpeech: true });
    await nativeContext.route('**/assets/audio/*.mp3', route => route.fulfill({ status: 404, body: 'Unavailable test audio' }));
    const nativePage = await nativeContext.newPage();
    nativePage.on('pageerror', error => errors.push(error.message));
    nativePage.on('request', request => requests.push({ method: request.method(), url: request.url() }));
    await nativePage.goto(origin);
    await nativePage.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: legacy });
    await nativePage.reload();
    const nativeClick = action => nativePage.locator(`button[data-action="${action}"]`).first().click();
    const nativeOverview = async () => {
      await nativePage.locator('#home-link').click();
      const confirmation = nativePage.locator('dialog[open] [data-confirm]');
      if (await confirmation.count()) await confirmation.click();
      await nativePage.locator('button[data-action="subject"][data-id="english"]').click();
      await nativeClick('unit3-goals');
    };
    const nativeStart = async q => {
      await nativeOverview();
      await nativePage.evaluate(id => sessionStorage.setItem('unit3PreferredQuestion', id), q.id);
      await nativePage.locator(`.goal-unit[data-topic="${q.topic}"] button[data-action="start"]`).click();
    };
    const failWithoutNative = async action => {
      assert.equal(await nativePage.locator(`button[data-action="${action}"]`).first().isDisabled(), false);
      await nativeClick(action);
      await nativePage.waitForFunction(() => [...document.querySelectorAll('.speech-status')].some(status => status.textContent.includes('暂时无法播放')), null, { timeout: 15000 });
      assert.equal(await nativePage.evaluate(() => window.unit3NativeCalls), 0, 'Unit 3 MP3 报错也不能改用未经确认的系统发音');
      assert.deepEqual(await nativePage.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY), legacy, '失败不能改写已有学习记录');
    };
    await nativeStart(listening);
    assert.equal(await nativePage.locator('.listening-text').isVisible(), false);
    await failWithoutNative('listen');
    assert.equal(await nativePage.locator('.listening-text').isVisible(), true);
    assert((await nativePage.locator('.listening-text').innerText()).includes(listening.fallbackPrompt));
    await nativeOverview();
    await nativePage.locator('.goal-unit[data-topic="unit3-hasgot"] button[data-action="goal-learn"]').click();
    await failWithoutNative('speak');
    await nativeStart(reading);await failWithoutNative('read-passage');
    await nativeOverview();await nativeClick('farm');await nativeClick('farm-show');await failWithoutNative('read-farm');
    // A missing manifest entry is different from a failed media download.
    // Redraw the question after removing only its local test-context entries.
    await nativePage.evaluate(() => { for (const key of Object.keys(GardenAudioManifest.clips)) delete GardenAudioManifest.clips[key]; });
    await nativeStart(listening);
    assert.equal(await nativePage.locator('.listening-text').isVisible(), true);
    assert.equal(await nativePage.locator('button[data-action="listen"]').isDisabled(), true);
    assert.equal(await nativePage.evaluate(() => window.unit3NativeCalls), 0);
    assert.deepEqual(await nativePage.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY), legacy);
    passed.push('Unit 3 听辨/卡片/阅读/农场 MP3 404 和清单缺项明确文字降级，即使系统语音存在也不回退、不改记录');

    const lifecycleContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await lifecycleContext.addInitScript(initialize);
    const lifecyclePage = await lifecycleContext.newPage();
    lifecyclePage.on('pageerror', error => errors.push(error.message));
    lifecyclePage.on('request', request => requests.push({ method: request.method(), url: request.url() }));
    await lifecyclePage.goto(origin);
    await lifecyclePage.evaluate(({ key, data, id }) => {
      localStorage.setItem(key, JSON.stringify(data));sessionStorage.setItem('unit3PreferredQuestion', id);
    }, { key: KEY, data: legacy, id: reading.id });
    await lifecyclePage.reload();
    await lifecyclePage.locator('button[data-action="subject"][data-id="english"]').click();
    await lifecyclePage.locator('button[data-action="unit3-goals"]').click();
    await lifecyclePage.locator('.goal-unit[data-topic="unit3-reading"] button[data-action="start"]').click();
    for (const event of ['pagehide', 'visibilitychange']) {
      const prior = await lifecyclePage.evaluate(() => window.unit3PlayCalls.length);
      await lifecyclePage.locator('button[data-action="read-passage"]').click();
      await lifecyclePage.waitForFunction(prior => window.unit3PlayCalls[prior]?.events.includes('playing'), prior);
      await lifecyclePage.evaluate(event => {
        if (event === 'pagehide') window.dispatchEvent(new Event(event));
        else {
          Object.defineProperty(document, 'hidden', { configurable: true, value: true });
          Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
          document.dispatchEvent(new Event(event));
        }
      }, event);
      assert(await lifecyclePage.evaluate(() => window.unit3AudioNodes.every(node => node.paused || node.ended)));
      const stopped = await lifecyclePage.evaluate(() => window.unit3PlayCalls.length);
      await lifecyclePage.waitForTimeout(800);
      assert.equal(await lifecyclePage.evaluate(() => window.unit3PlayCalls.length), stopped, '离开或后台后不继续阅读下一句');
      assert.deepEqual(await lifecyclePage.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY), legacy);
    }
    passed.push('真实 Unit 3 阅读播放遇 pagehide 或隐藏 visibilitychange 立即停止，不继续后句且历史记录不变');
    assert.deepEqual(errors, [], '浏览器无脚本错误');
    assert(requests.every(request => request.method === 'GET' && new URL(request.url).origin === origin), '仅本地静态读取，没有外部上传或语音接口');
    for (const group of passed) console.log(`通过：${group}`);
    console.log(`Unit 3 浏览器检查通过：${passed.length} 组。`);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
