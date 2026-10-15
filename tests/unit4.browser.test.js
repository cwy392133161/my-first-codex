'use strict';

// Run with: node tests/unit4.browser.test.js
// Chromium exercises real controls and downloaded backups. This is not an iOS 12 engine test.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const unit4 = require('../data/english-unit4.js');
const questions = require('../data/questions.js');
const manifest = require('../data/audio-manifest.js');
const root = path.resolve(__dirname, '..'), KEY = 'learning-garden-v1';
const goals = unit4.topics.map(topic => topic.id), reviewId = unit4.reviewTopic.id;
const all = questions.topics.flatMap(topic => questions.bank(topic.id));
const oldQuestions = ['pinyin', 'arithmetic', 'english4', 'hello-name-age', 'unit1-position', 'unit2-havegot', 'unit3-hasgot', 'review02-mixed'].map(id => questions.bank(id)[0]);
const legacy = { attempts: oldQuestions.map((q, index) => ({ session: `published-${index}`, topic: q.topic, question: q.id, correct: false, review: false, time: 1000 + index })), sessions: [], wrong: oldQuestions.map(q => q.id) };
const exact = value => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
function initialize() {
  let api;
  Object.defineProperty(window, 'GardenQuestions', { configurable: true, get: () => api, set(value) {
    const original = value.shuffle;
    value.shuffle = list => {
      const wanted = sessionStorage.getItem('unit4PreferredQuestion');
      const first = list.find(item => item && typeof item === 'object' && item.id === wanted);
      return first ? [first, ...original(list.filter(item => item !== first))] : original(list);
    };
    api = value;
  } });
  window.unit4NativeCalls = 0;
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => [{ name: 'Available system voice', lang: 'en-US' }], addEventListener() {}, removeEventListener() {}, cancel() {},
    speak() { window.unit4NativeCalls++; }
  } });
  const play = HTMLMediaElement.prototype.play, observed = new WeakSet(), samples = new WeakMap();
  window.unit4Audio = [];
  HTMLMediaElement.prototype.play = function (...args) {
    const sample = { src: this.src, rate: this.playbackRate, events: [], duration: 0, progressed: false };
    window.unit4Audio.push(sample); samples.set(this, sample);
    if (!observed.has(this)) {
      observed.add(this);
      for (const event of ['loadedmetadata', 'playing', 'timeupdate', 'ended', 'error']) this.addEventListener(event, () => {
        const active = samples.get(this); if (!active) return;
        if (!active.events.includes(event)) active.events.push(event);
        if (Number.isFinite(this.duration)) active.duration = this.duration;
        if (this.currentTime > 0) active.progressed = true;
      }, true);
    }
    return play.apply(this, args);
  };
}
async function serve() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const file = path.resolve(root, url.pathname === '/' ? 'index.html' : `.${decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
      const type = file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.mp3') ? 'audio/mpeg' : 'text/html; charset=utf-8';
      const body = await fs.readFile(file);
      response.writeHead(200, { 'Content-Type': type }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}
(async () => {
  const server = await serve(), origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const passed = [], errors = [], requests = [];
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 414, height: 736 }, acceptDownloads: true });
    await context.addInitScript(initialize);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    await page.goto(origin);
    const click = action => page.locator(`button[data-action="${action}"]`).first().click();
    const current = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const home = () => page.locator('#home-link').click();
    const overview = async (review = false) => {
      await home(); await page.locator('button[data-action="subject"][data-id="english"]').click();
      await click(review ? 'review34-goals' : 'unit4-goals');
    };
    const goal = id => page.locator(`.goal-unit[data-topic="${id}"]`);
    const learn = id => goal(id).locator('button[data-action="goal-learn"]').click();
    const start = id => goal(id).locator('button[data-action="start"]').click();
    const count = value => page.locator(`button[data-action="count"][data-count="${value}"]`).first().click();
    const choice = answer => page.locator('button[data-action="answer"]').filter({ hasText: exact(answer) });
    const prefer = id => page.evaluate(id => sessionStorage.setItem('unit4PreferredQuestion', id), id);
    const displayed = async () => {
      assert.equal(await page.locator('.question').count(), 1);
      const id = await page.locator('.question').getAttribute('data-question-id'), q = all.find(q => q.id === id);
      assert(q, `真实题库题号：${id}`); return q;
    };
    const leave = async () => { await click('leave'); await page.locator('dialog[open] [data-confirm]').click(); };
    const noOverflow = async label => {
      const size = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, width: innerWidth }));
      assert(size.actual <= size.width, `${label}：${size.actual} > ${size.width}，不应横向滚动`);
      for (const button of await page.locator('.choices button').all()) assert(await button.evaluate(el => el.scrollWidth <= el.clientWidth), `${label} 按钮文字完整`);
    };

    await overview(); assert.equal(await page.locator('.goal-unit').count(), 7);
    assert.equal(await current(), null, '空记录浏览学习目标不写入数据');
    await overview(true); assert.equal(await page.locator('.goal-unit').count(), 1); assert.equal(await goal(reviewId).count(), 1);
    await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: legacy });
    await page.reload();
    for (const id of [...goals, reviewId]) {
      await overview(id === reviewId); await learn(id);
      const cards = unit4.lesson(id);
      for (const [index, card] of cards.entries()) {
        assert.equal(await page.locator('.goal-title').innerText(), card.title);
        const text = await page.locator('.goal-card').innerText();
        for (const line of card.lines) { assert(text.includes(line.english)); assert(text.includes(line.chinese)); }
        for (const button of await page.locator('button[data-action="speak"]').all()) assert.equal(await button.getAttribute('data-recorded-only'), 'true', 'Unit 4 和复习卡均只用已确认录音');
        assert.equal(await page.locator('.say-model').isVisible(), false);
        await click('show-model'); assert((await page.locator('.say-model').innerText()).includes(card.sayModel));
        await click('say-done'); assert.equal(await page.locator('button[data-action="say-done"]').isDisabled(), true);
        if (index === 0) assert.equal(await page.locator('button[data-action="goal-prev"]').isDisabled(), true);
        if (index + 1 < cards.length) await click('goal-next');
        else assert.equal(await page.locator('button[data-action="goal-next"]').isDisabled(), true);
      }
      assert.deepEqual(await current(), legacy, '学习和自愿练说保留全部旧数据，不计分');
    }
    passed.push('Unit 4 七个目标、独立 3～4 复习、全部双语学习卡和翻页边界');

    let retryWrong, twiceWrong;
    for (const [index, id] of [...goals, reviewId].entries()) {
      await overview(id === reviewId); await count(5); await start(id);
      for (let number = 0; number < 5; number++) {
        const q = await displayed(); assert.equal(q.topic, id);
        if (number === 0 && index < 2) {
          const prior = (await current()).attempts.length, wrong = q.choices.find(item => item !== q.answer);
          await choice(wrong).evaluate(button => { button.click(); button.click(); });
          assert.equal((await current()).attempts.length, prior + 1);
          const feedback = await page.locator('#feedback').innerText();
          assert(feedback.includes(q.hint)); assert(!feedback.includes(`答案是 ${q.answer}`));
          await click('retry');
          if (index === 0) { retryWrong = q; await choice(q.answer).click(); }
          else {
            twiceWrong = q; await choice(wrong).click();
            assert((await page.locator('#feedback').innerText()).includes(`答案是 ${q.answer}`));
            assert((await page.locator('#feedback').innerText()).includes(q.explanation));
          }
          assert.equal((await current()).attempts.length, prior + 1, '重试不覆盖首次结果');
          assert.equal((await current()).attempts.at(-1).correct, false);
        } else await choice(q.answer).click();
        await page.locator('button[data-action="next"]').evaluate(button => { button.click(); button.click(); });
      }
      assert((await page.locator('#app').innerText()).includes('这次练习完成啦'));
      const state = await current();
      assert.equal(state.sessions.at(-1).total, 5); assert.equal(state.sessions.at(-1).correct, index < 2 ? 4 : 5);
      assert.deepEqual(state.attempts.slice(0, legacy.attempts.length), legacy.attempts);
    }
    for (const id of ['unit4-likes', 'unit4-recipes', reviewId]) {
      await overview(id === reviewId); await count(10); await start(id);
      for (let number = 0; number < 10; number++) { const q = await displayed(); assert.equal(q.topic, id); await choice(q.answer).click(); await click('next'); }
      assert.equal((await current()).sessions.at(-1).total, 10); assert.equal((await current()).sessions.at(-1).correct, 10);
    }
    passed.push('各目标 5 题、喜好/食谱/综合复习 10 题，提示和第二次反馈、双击锁、首次正确率');

    await overview(); const beforePicnic = await current(); await click('picnic');
    const initial = await page.locator('select[data-picnic-food]').evaluateAll(selects => selects.map(select => select.value));
    assert.equal(initial.length, 3); assert.equal(new Set(initial).size, 3);
    for (const [index, own] of initial.entries()) for (const other of initial.filter(item => item !== own)) {
      assert.equal(await page.locator(`select[data-picnic-food="${index}"] option[value="${other}"]`).evaluate(option => option.disabled), true);
    }
    await page.locator('select[data-picnic-food="0"]').evaluate((select, value) => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }, initial[1]);
    assert.equal(await page.locator('select[data-picnic-food="0"]').inputValue(), initial[0], '脚本模拟重复选择也会被拒绝');
    // Move first slot to a spare key so subsequent legitimate edits cannot collide.
    const selected = ['apple', 'grape', 'salad'];
    for (const [index, key] of selected.entries()) {
      const occupied = await page.locator(`select[data-picnic-food="${index}"] option[value="${key}"]`).evaluate(option => option.disabled);
      if (occupied) {
        const slot = (await page.locator('select[data-picnic-food]').evaluateAll(selects => selects.map(select => select.value))).indexOf(key);
        const available = await page.locator(`select[data-picnic-food="${slot}"] option:not([disabled])`).evaluateAll(options => options.map(option => option.value));
        await page.locator(`select[data-picnic-food="${slot}"]`).selectOption(available.find(value => !selected.includes(value)));
      }
      await page.locator(`select[data-picnic-food="${index}"]`).selectOption(key);
      await page.locator(`select[data-picnic-reply="${index}"]`).selectOption(index === 1 ? 'no' : 'yes');
    }
    await page.locator('#picnic-drink').selectOption('lemonade'); await click('picnic-show');
    assert.equal(await page.locator('[data-picnic-slot]').count(), 3);
    for (const [index, noun] of ['apples', 'grapes', 'salad'].entries()) {
      const text = await page.locator(`[data-picnic-slot="${index}"]`).innerText();
      assert(text.includes(`We have got some ${noun}.`)); assert(text.includes(`Would you like some ${noun}?`));
      assert(text.includes(index === 1 ? 'No, thank you.' : 'Yes, please.'));
      assert.equal(text.includes('Here you are.'), index !== 1, '婉拒后不强迫接受');
    }
    assert((await page.locator('.picnic-drink').innerText()).includes('Can I have some lemonade, please?'));
    await page.locator('#picnic-chinese').setChecked(false);
    for (const line of await page.locator('[data-picnic-chinese]').all()) assert.equal(await line.isVisible(), false);
    await page.locator('#picnic-chinese').setChecked(true);
    await click('picnic-say-done'); assert.equal(await page.locator('button[data-action="picnic-say-done"]').isDisabled(), true);
    const sheet = await page.locator('#picnic-sheet').textContent();
    await click('picnic-edit');
    for (const [index, key] of selected.entries()) assert.equal(await page.locator(`select[data-picnic-food="${index}"]`).inputValue(), key);
    assert.equal(await page.locator('select[data-picnic-reply="1"]').inputValue(), 'no');
    assert.equal(await page.locator('#picnic-drink').inputValue(), 'lemonade');
    await click('picnic-show'); assert.equal(await page.locator('#picnic-sheet').textContent(), sheet);
    assert.equal(await page.locator('button[data-action="read-picnic"]').getAttribute('data-recorded-only'), 'true');
    assert.deepEqual(await current(), beforePicnic, '野餐草稿、展示、中文开关和练说均不写学习记录');
    passed.push('野餐三食物不重复、some 后名词形式、邀请接受和婉拒、饮料请求、中英开关与重编辑');

    // Missing new audio is explicit text practice, never the previously rejected device voice.
    const missing = [...goals, reviewId].flatMap(unit4.bank).find(q => q.kind === 'listening' && !manifest.clips[q.speech.replace(/[‘’]/g, "'").trim().replace(/[.!?]+$/, '').toLowerCase()]);
    assert(missing, '当前开发版有待生成录音的完整听辨文本');
    await overview(missing.topic === reviewId); await prefer(missing.id); await start(missing.topic);
    assert.equal((await displayed()).id, missing.id);
    assert.equal(await page.locator('button[data-action="listen"]').isDisabled(), true);
    assert.equal(await page.locator('.listening-text').isVisible(), true);
    assert((await page.locator('.listening-text').innerText()).includes(missing.fallbackPrompt));
    assert.equal(await page.evaluate(() => window.unit4NativeCalls), 0);
    await leave();
    const wordListening = unit4.bank('unit4-food').find(q => q.id === 'unit4-food-listen-banana');
    assert(wordListening);
    await overview(); await prefer(wordListening.id); await start(wordListening.topic);
    assert.equal((await displayed()).id, wordListening.id);
    const audioButton = page.locator('button[data-action="listen"]');
    assert.equal(await audioButton.isDisabled(), false, '已交付核心词录音可复用');
    const priorPlay = await page.evaluate(() => window.unit4Audio.length);
    await audioButton.click();
    await page.waitForFunction(prior => window.unit4Audio.slice(prior).some(sample => sample.events.includes('ended')), priorPlay, { timeout: 15000 });
    const samples = await page.evaluate(prior => window.unit4Audio.slice(prior), priorPlay);
    assert(samples.length > 0);
    for (const sample of samples) { assert.equal(sample.rate, 1); assert(sample.duration > 0 && sample.progressed); assert(sample.events.includes('playing')); assert(!sample.events.includes('error')); }
    assert.equal(await page.evaluate(() => window.unit4NativeCalls), 0);
    const beforeFailedAudio = await current();
    await page.route('**/assets/audio/*.mp3', route => route.fulfill({ status: 404, body: 'Unavailable test recording' }));
    // The reused Audio element has completed playback; a forced load failure must not select system TTS.
    await page.evaluate(() => { performance.clearResourceTimings(); });
    await audioButton.click();
    await page.waitForFunction(() => [...document.querySelectorAll('.speech-status')].some(el => el.textContent.includes('暂时无法播放')), null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.unit4NativeCalls), 0);
    assert.equal(await page.locator('.listening-text').isVisible(), true, 'MP3 404 后自动露出文字备用');
    assert.deepEqual(await current(), beforeFailedAudio);
    await page.unroute('**/assets/audio/*.mp3');
    await leave();
    passed.push('缺少新音频时立即显示文字、禁用按钮且不回退系统发音；已交付 MP3 在真实点击后正常 1 倍速解码播放');

    for (const q of [retryWrong, twiceWrong, oldQuestions.at(-2)]) {
      await home(); await click('review'); await prefer(q.id); await click('start-review');
      assert.equal((await displayed()).id, q.id); await choice(q.answer).click();
      const state = await current(); assert(!state.wrong.includes(q.id)); assert.equal(state.attempts.at(-1).review, true); await leave();
    }
    await home(); await click('records');
    for (const topic of [...unit4.topics, unit4.reviewTopic]) {
      const state = await current(), attempts = state.attempts.filter(attempt => attempt.topic === topic.id);
      const percent = Math.round(attempts.filter(attempt => attempt.correct).length / attempts.length * 100);
      const row = page.locator('.record').filter({ has: page.locator('strong').filter({ hasText: exact(`${topic.icon} ${topic.name}`) }) });
      assert.equal(await row.count(), 1); assert((await row.innerText()).includes(`${percent}%`));
    }
    const beforeBackup = await current();
    const [download] = await Promise.all([page.waitForEvent('download'), click('export')]);
    const payload = JSON.parse(await fs.readFile(await download.path(), 'utf8')); assert.deepEqual(payload.data, beforeBackup);
    await click('clear'); assert.deepEqual(await current(), beforeBackup, '清空前必须确认'); await page.locator('dialog[open] [data-cancel]').click();
    await click('clear'); await page.locator('dialog[open] [data-confirm]').click(); assert.deepEqual(await current(), { attempts: [], sessions: [], wrong: [] });
    for (let i = 0; i < 2; i++) {
      await page.locator('#backup-file').setInputFiles({ name: 'unit4-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
      await page.locator('dialog[open] [data-confirm]').click(); await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.deepEqual(await current(), beforeBackup, '实际文件导入恢复全部新旧记录，重复导入幂等');
    }
    await page.reload(); assert.deepEqual(await current(), beforeBackup);
    await click('records'); await page.locator('.backup-text-options summary').click(); await click('backup-text');
    assert.deepEqual(JSON.parse(await page.locator('#backup-text').inputValue()).data, beforeBackup);
    await page.locator('#restore-text').fill(JSON.stringify(payload)); await click('restore-text'); await page.locator('dialog[open] [data-confirm]').click();
    assert.deepEqual(await current(), beforeBackup);
    passed.push('新旧错题重练、首次率、刷新保留、确认清空、真实 JSON 下载/两次恢复和 iOS 备用文字恢复');

    for (const viewport of [{ width: 414, height: 736 }, { width: 736, height: 414 }, { width: 390, height: 844 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(viewport);
      const label = `${viewport.width}×${viewport.height}`;
      await overview(); await noOverflow(`${label} 目标`);
      if (viewport.width === 414) await page.screenshot({ path: '/tmp/unit4-goals-414.png', fullPage: true });
      await learn('unit4-requests'); await noOverflow(`${label} 句型卡`);
      await overview(); await start('unit4-recipes'); await noOverflow(`${label} 食谱题`); await leave();
      await overview(true); await noOverflow(`${label} 综合复习`);
      await overview(); await click('picnic'); await noOverflow(`${label} 野餐编辑`); await click('picnic-show'); await noOverflow(`${label} 野餐展示`);
      if (viewport.width === 414) await page.screenshot({ path: '/tmp/unit4-picnic-414.png', fullPage: true });
    }
    passed.push('414×736 竖屏、736×414 横屏、390 手机和 1024 平板所有新增页面无横向溢出');
    assert.deepEqual(errors, []); assert(requests.every(url => url.startsWith(origin)), '无外部依赖或请求');
    console.log(passed.map((message, index) => `${index + 1}. 通过：${message}`).join('\n'));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
