'use strict';

// Run with: node tests/unit3.browser.test.js
// Real Chromium tests gameplay and local data. No speech mock is a pronunciation claim.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const unit3 = require('../data/english-unit3.js');
const questionAPI = require('../data/questions.js');
const audio = require('../audio-player.js');

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

    const pendingListening = newQuestions.find(q => q.kind === 'listening' && audio.plan(q.speech).length === 0);
    assert(pendingListening, '当前新增听辨确有待生成 MP3 的情境供验证');
    await overview(); await prefer(pendingListening.id); await start(pendingListening.topic);
    assert.equal((await displayed()).id, pendingListening.id);
    assert.equal(await page.locator('.listening-text').isVisible(), true, '没有新 MP3 时立即显示文字，不等待语音超时');
    assert((await page.locator('.listening-text').innerText()).includes(pendingListening.fallbackPrompt));
    assert.equal(await page.locator('button[data-action="listen"]').isDisabled(), true, '待准备音频按钮禁用');
    assert((await page.locator('.speech-status').innerText()).includes('准备'));
    await choice(pendingListening.answer).click(); await leave();
    const reading = newQuestions.find(q => q.topic === 'unit3-reading' && q.passage);
    await overview(); await prefer(reading.id); await start(reading.topic);
    for (const line of reading.passage) assert((await page.locator('.reading-passage').innerText()).includes(line));
    assert.equal(await page.locator('button[data-action="read-passage"]').isDisabled(), true);
    await choice(reading.answer).click(); await leave();
    passed.push('华为无系统语音模拟：缺 MP3 即时文字听辨，阅读原文可用，未把原生合成当已验证发音');

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
    await click('farm-say-done');
    assert.equal(await page.locator('button[data-action="farm-say-done"]').isDisabled(), true);
    assert.deepEqual(await current(), beforeFarm, '展示与自愿介绍农场不计答题成绩');
    const shown = await sheet.textContent();
    await click('farm-edit');
    for (const [i, item] of selected.entries()) assert.equal(await page.locator(`select[data-farm-animal="${i}"]`).inputValue(), item.key);
    await click('farm-show'); assert.equal(await sheet.textContent(), shown, '修改返回保留内存草稿');
    await click('unit3-goals');
    assert.deepEqual(await current(), beforeFarm, '取消并返回学习目标不写记录');
    passed.push('小农场三组选择、真实数量图、单复数描述、产品句、中文切换、草稿返回及不计分');

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
    assert.deepEqual(errors, [], '浏览器无脚本错误');
    assert(requests.every(request => request.method === 'GET' && new URL(request.url).origin === origin), '仅本地静态读取，没有外部上传或语音接口');
    passed.push('390px 手机和 1024px 平板目标、卡片、题目、农场均不溢出，无外部请求');

    const nativeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await nativeContext.addInitScript(initialize, { nativeSpeech: true });
    const nativePage = await nativeContext.newPage();
    await nativePage.goto(origin);
    await nativePage.evaluate(id => sessionStorage.setItem('unit3PreferredQuestion', id), pendingListening.id);
    await nativePage.locator('button[data-action="subject"][data-id="english"]').click();
    await nativePage.locator('button[data-action="unit3-goals"]').click();
    await nativePage.locator(`.goal-unit[data-topic="${pendingListening.topic}"] button[data-action="start"]`).click();
    assert.equal(await nativePage.locator('.listening-text').isVisible(), true);
    assert.equal(await nativePage.locator('button[data-action="listen"]').isDisabled(), true);
    assert.equal(await nativePage.evaluate(() => window.unit3NativeCalls), 0, '有 native API 也不冒用未经确认的系统声线朗读 Unit 3');
    passed.push('缺 Unit 3 MP3 且设备有原生语音时仍使用文字，不静默切换已拒绝的发音');
    for (const group of passed) console.log(`通过：${group}`);
    console.log(`Unit 3 浏览器检查通过：${passed.length} 组。`);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
