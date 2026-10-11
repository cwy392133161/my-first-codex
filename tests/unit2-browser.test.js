'use strict';

// Run with: node tests/unit2-browser.test.js
// Real Chromium checks Unit 2 goals, independent 0–2 review, booklet delivery and record recovery.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const unit2 = require('../data/english-unit2.js');
const questionAPI = require('../data/questions.js');

const root = path.resolve(__dirname, '..');
const KEY = 'learning-garden-v1';
const goalIds = ['unit2-family', 'unit2-body', 'unit2-who', 'unit2-havegot', 'unit2-phonics', 'unit2-senses', 'unit2-reading'];
const reviewId = 'review02-mixed';
const newQuestions = [...goalIds, reviewId].flatMap(unit2.bank);
const allQuestions = questionAPI.topics.flatMap(topic => questionAPI.bank(topic.id));
const oldQuestions = ['pinyin', 'arithmetic', 'english2', 'hello-name-age', 'unit1-position'].map(topic => questionAPI.bank(topic)[0]);
const oldRecords = {
  attempts: oldQuestions.map((q, i) => ({ session: `published-${i}`, topic: q.topic, question: q.id, correct: false, review: false, time: 1000 + i })),
  sessions: [], wrong: oldQuestions.map(q => q.id)
};
const exact = value => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const word = value => new RegExp(`\\b${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
const normalize = value => value.replace(/\s+/g, ' ').trim();
const backupFile = data => ({
  name: 'learning-garden-backup.json', mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({ format: 'learning-garden-backup', version: 1, exportedAt: '2026-10-11T10:00:00.000Z', data }))
});

async function serverStart() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const file = path.resolve(root, url.pathname === '/' ? 'index.html' : `.${decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
      const body = await fs.readFile(file);
      const type = file.endsWith('.js') ? 'text/javascript; charset=utf-8'
        : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
      response.writeHead(200, { 'Content-Type': type }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

function initBrowser(options = {}) {
  let api;
  Object.defineProperty(window, 'GardenQuestions', {
    configurable: true,
    get: () => api,
    set(value) {
      const original = value.shuffle;
      value.shuffle = list => {
        const wanted = sessionStorage.getItem('unit2PreferredQuestion');
        const selected = list.find(item => item && typeof item === 'object' && item.id === wanted);
        return selected ? [selected, ...original(list.filter(item => item !== selected))] : original(list);
      };
      api = value;
    }
  });
  window.unit2SpeechCalls = [];
  window.unit2SpeechCancels = 0;
  window.unit2PrintCalls = 0;
  window.print = () => { window.unit2PrintCalls++; };
  if (options.noSpeech) {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
    return;
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true, value: class { constructor(text) { this.text = text; } }
  });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true, value: {
      getVoices: () => [{ name: 'Test British voice', lang: 'en-GB' }],
      addEventListener() {}, removeEventListener() {},
      cancel() { window.unit2SpeechCancels++; },
      speak(utterance) {
        window.unit2SpeechCalls.push({ text: utterance.text, lang: utterance.lang });
        if (options.failedSpeech) utterance.onerror?.({ error: 'language-unavailable' });
      }
    }
  });
}

(async () => {
  const server = await serverStart();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const passed = [];
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, acceptDownloads: true });
    await context.addInitScript(initBrowser);
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push({ method: request.method(), url: request.url() }));
    await page.goto(origin);
    const click = action => page.locator(`button[data-action="${action}"]`).first().click();
    const current = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const home = () => page.locator('#home-link').click();
    const units = async () => { await home(); await page.locator('button[data-action="subject"][data-id="english"]').click(); };
    const goals = async () => {
      await units();
      await page.locator('.english-unit[data-topic="english2"] button[data-action="unit2-goals"]').click();
    };
    const reviewGoals = async () => {
      await goals();
      await click('review02-goals');
    };
    const goal = topic => page.locator(`.goal-unit[data-topic="${topic}"]`);
    const start = topic => goal(topic).locator(`button[data-action="start"][data-id="${topic}"]`).click();
    const learn = topic => goal(topic).locator(`button[data-action="goal-learn"][data-id="${topic}"]`).click();
    const count = n => page.locator(`button[data-action="count"][data-count="${n}"]`).first().click();
    const choice = answer => page.locator('button[data-action="answer"]').filter({ hasText: exact(answer) });
    const prefer = id => page.evaluate(id => sessionStorage.setItem('unit2PreferredQuestion', id), id);
    const displayed = async () => {
      const id = await page.locator('.question').getAttribute('data-question-id');
      const found = allQuestions.find(q => q.id === id);
      assert(found, `应显示真实题库中的固定题：${id}`);
      return found;
    };
    const leave = async () => { await click('leave'); await page.locator('dialog[open] [data-confirm]').click(); };
    const noOverflow = async label => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label} 不应横向溢出`);
      for (const button of await page.locator('.choices button').all()) {
        assert(await button.evaluate(element => element.scrollWidth <= element.clientWidth), `${label} 答案应完整容纳`);
      }
    };
    await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: oldRecords });
    await page.reload();
    await goals();
    assert.equal(await page.locator('.goal-unit').count(), 7);
    for (const topic of goalIds) assert.equal(await goal(topic).count(), 1, '七个目标可独立选择');
    assert.deepEqual(await current(), oldRecords, '进入 Unit 2 保留语文、数学、词汇、Hello 和 Unit 1 记录');
    await reviewGoals();
    assert.equal(await goal(reviewId).count(), 1, '0–2 复习有独立知识点入口');
    assert.deepEqual(await current(), oldRecords);
    passed.push('Unit 2 七目标与 0–2 复习入口可用，旧科目和已发布英语记录完整保留');

    // View every new card, including whole-word phonics, without grading speech.
    for (const topic of [...goalIds, reviewId]) {
      if (topic === reviewId) await reviewGoals(); else await goals();
      const cards = unit2.lesson(topic);
      await learn(topic);
      for (const [index, card] of cards.entries()) {
        assert.equal(await page.locator('.goal-card').count(), 1);
        assert.equal(await page.locator('.goal-title').innerText(), card.title);
        if (index === 0) assert.equal(await page.locator('button[data-action="goal-prev"]').isDisabled(), true);
        if (index === 0 || topic === 'unit2-phonics') {
          const before = await page.evaluate(() => window.unit2SpeechCalls.length);
          const audio = page.locator('button[data-action="speak"]').first();
          await audio.click();
          const calls = await page.evaluate(() => window.unit2SpeechCalls);
          assert.equal(calls.length, before + 1);
          assert.equal(calls.at(-1).lang, 'en-GB');
          if (topic === 'unit2-phonics') {
            assert((await audio.innerText()).includes('听示例词'));
            assert.equal(calls.at(-1).text, card.sayModel, 'th / t 播放整词，不朗读字母名或视觉拼写标记');
            assert(!/[→_;]/.test(calls.at(-1).text));
          }
          assert.equal(await page.locator('.say-model').isVisible(), false);
          await click('show-model');
          assert.equal(await page.locator('.say-model').isVisible(), true);
          assert((await page.locator('.say-model').innerText()).includes(card.sayModel));
          await click('say-done');
          assert((await page.locator('.practice-status').innerText()).includes('进步'));
          assert.equal(await page.locator('button[data-action="say-done"]').isDisabled(), true);
        }
        assert.deepEqual(await current(), oldRecords, '学习卡和开口鼓励不改学习记录');
        if (index + 1 < cards.length) await click('goal-next');
        else assert.equal(await page.locator('button[data-action="goal-next"]').isDisabled(), true);
      }
      if (cards.length > 1) {
        await click('goal-prev');
        assert.equal(await page.locator('.goal-title').innerText(), cards.at(-2).title);
      }
    }
    passed.push('七目标和复习学习卡完整浏览、边界与返回、th / t 整词示范、开口鼓励不计分');

    await units();
    await page.locator('button[data-action="english-mode"][data-mode="word"]').click();
    await page.locator('#include-extra').setChecked(false);
    await page.locator('.english-unit[data-topic="english2"] button[data-action="unit2-goals"]').click();
    await count(5);
    let retryWrong, twiceWrong, reviewWrong;
    for (const [index, topic] of [...goalIds, reviewId].entries()) {
      if (topic === reviewId) await reviewGoals(); else await goals();
      await count(5);
      await start(topic);
      for (let i = 0; i < 5; i++) {
        const q = await displayed();
        assert.equal(q.topic, topic, '独立目标和综合复习均不混入别的统计知识点');
        if (i === 0 && (index < 2 || topic === reviewId)) {
          const before = (await current()).attempts.length;
          const wrong = q.choices.find(option => option !== q.answer);
          await choice(wrong).evaluate(button => { button.click(); button.click(); });
          assert.equal((await current()).attempts.length, before + 1, '连续双击只记一次首次作答');
          assert((await page.locator('#feedback').innerText()).includes(q.hint));
          await click('retry');
          if (index === 0 || topic === reviewId) {
            if (topic === reviewId) reviewWrong = q; else retryWrong = q;
            await choice(q.answer).click();
          }
          else {
            twiceWrong = q;
            await choice(wrong).click();
            const feedback = await page.locator('#feedback').innerText();
            assert(feedback.includes(`答案是 ${q.answer}`) && feedback.includes(q.explanation));
          }
          assert.equal((await current()).attempts.length, before + 1, '再试一次不覆盖首次结果');
        } else await choice(q.answer).click();
        await click('next');
      }
      const saved = await current();
      assert.equal(saved.sessions.at(-1).total, 5);
      assert.equal(saved.sessions.at(-1).correct, index < 2 || topic === reviewId ? 4 : 5);
      assert.equal(saved.sessions.at(-1).review, false, '综合复习是独立知识点练习，并非错题重练');
      assert.deepEqual(saved.attempts.slice(0, oldRecords.attempts.length), oldRecords.attempts);
    }
    for (const topic of ['unit2-havegot', reviewId]) {
      if (topic === reviewId) await reviewGoals(); else await goals();
      await count(10);
      await start(topic);
      for (let i = 0; i < 10; i++) {
        const q = await displayed();
        assert.equal(q.topic, topic);
        await choice(q.answer).click();
        await click('next');
      }
      assert.equal((await current()).sessions.at(-1).total, 10);
      assert.equal((await current()).sessions.at(-1).correct, 10);
    }
    passed.push('七目标和综合复习均可完成 5 题、10 题总结，旧词汇模式不干扰、双击锁与答错两步反馈正确');

    const listening = newQuestions.find(q => q.kind === 'listening' && q.topic !== reviewId);
    assert(listening, 'Unit 2 有听辨题');
    await goals();
    await prefer(listening.id);
    await start(listening.topic);
    assert.equal((await displayed()).id, listening.id);
    assert.equal(await page.locator('.listening-text').isVisible(), false);
    assert(!(await page.locator('.question').innerText()).includes(listening.speech));
    const speechBefore = await page.evaluate(() => window.unit2SpeechCalls.length);
    const cancelsBefore = await page.evaluate(() => window.unit2SpeechCancels);
    await click('listen');
    await click('listen');
    const calls = await page.evaluate(() => window.unit2SpeechCalls);
    assert.equal(calls.length, speechBefore + 2);
    assert.equal(calls.at(-1).text, listening.speech);
    assert((await page.evaluate(() => window.unit2SpeechCancels)) >= cancelsBefore + 2);
    await click('show-listening-text');
    assert((await page.locator('.listening-text').innerText()).includes(listening.fallbackPrompt));
    await choice(listening.answer).click();
    await leave();
    const silentQuestion = newQuestions.find(q => q.kind !== 'listening' && q.answerSpeech && !q.speech && !q.passage);
    await goals();
    await prefer(silentQuestion.id);
    await start(silentQuestion.topic);
    assert.equal(await page.locator('button[data-action="speak"]').count(), 0, '非听辨题作答前不会朗读答案');
    await choice(silentQuestion.answer).click();
    await click('speak');
    assert.equal((await page.evaluate(() => window.unit2SpeechCalls)).at(-1).text, silentQuestion.answerSpeech);
    await leave();
    passed.push('真实听辨默认隐藏文字、可手动看提示、重复播放取消旧声、普通题答后才听答案');

    // Exercise new body/person/sense pictures without English answer labels.
    for (const type of ['body', 'person', 'sense']) {
      const candidates = newQuestions.filter(q => q.visual?.type === type && q.topic !== reviewId);
      assert(candidates.length, `Unit 2 有 ${type} 图示题`);
      const samples = type === 'body'
        ? [...new Set(candidates.map(q => q.visual.part))].map(part => candidates.find(q => q.visual.part === part))
        : type === 'sense'
          ? [...new Set(candidates.map(q => q.visual.sense))].map(sense => candidates.find(q => q.visual.sense === sense))
          : [candidates[0]];
      for (const q of samples) {
        await goals();
        await prefer(q.id);
        await start(q.topic);
        assert.equal((await displayed()).id, q.id);
        const image = page.locator(`.question-visual .${type}-picture`);
        assert.equal(await image.isVisible(), true);
        if (type !== 'sense') {
          assert.equal(await image.locator('svg').count(), 1);
          assert((await image.locator('svg').innerHTML()).length > 100, '图示含真正矢量绘图');
        }
        if (['body', 'sense'].includes(type) && /^[a-z ]+$/i.test(q.answer)) {
          const labels = await image.evaluate(element => {
            const descriptions = [...element.querySelectorAll('[aria-label], [title]')].flatMap(child => [child.getAttribute('aria-label') || '', child.getAttribute('title') || '']);
            return [element.textContent, element.getAttribute('aria-label') || '', ...descriptions].join(' ');
          });
          assert(!word(q.answer).test(labels), '看图选英文题不把英文答案放在图片文字或无障碍标签里');
        }
        if (type === 'body' && q.visual.part === 'feet') await page.screenshot({ path: '/tmp/unit2-body.png', fullPage: true });
        await choice(q.answer).click();
        assert((await page.locator('#feedback').innerText()).includes(q.explanation));
        await noOverflow(`${type} 图示`);
        await leave();
      }
    }
    passed.push('人物、身体部位和五感图示均可见可答，身体和感官图片不提前标注英文答案');

    const readings = newQuestions.filter(q => q.passage?.length && q.topic === 'unit2-reading');
    assert(readings.length, 'Unit 2 有原创短文理解题');
    for (const q of readings) {
      await goals();
      await prefer(q.id);
      await start(q.topic);
      for (const line of q.passage) assert((await page.locator('.reading-passage').innerText()).includes(line));
      await click('read-passage');
      assert.equal(normalize((await page.evaluate(() => window.unit2SpeechCalls)).at(-1).text), normalize(q.passage.join(' ')));
      await choice(q.answer).click();
      await leave();
    }
    passed.push('全部原创阅读题显示相关短文、可听全文、按原文事实作答');

    await goals();
    const beforeBooklet = await current();
    await click('booklet');
    const preview = page.locator('#about-me-booklet');
    assert.equal(await preview.isVisible(), true);
    assert.equal(await preview.locator('.booklet-page').count(), 4, 'All about me 有四页即时预览');
    const initialBooklet = await preview.textContent();
    const selected = {};
    for (const id of ['booklet-name', 'booklet-age', 'booklet-hair', 'booklet-eyes', 'booklet-favourite']) {
      const select = page.locator(`#${id}`);
      const options = await select.locator('option').evaluateAll(elements => elements.map(element => ({ value: element.value, text: element.textContent })));
      assert(options.length >= 2, `${id} 有可用示例供孩子选择`);
      selected[id] = options.at(-1);
      await select.selectOption(options.at(-1).value);
    }
    for (let i = 0; i < 2; i++) {
      const select = page.locator(`select[data-booklet-family="${i}"]`);
      const values = await select.locator('option').evaluateAll(elements => elements.map(element => element.value));
      assert(values.length >= 2);
      await select.selectOption(values[values.length - 1 - i]);
    }
    const changedText = await preview.textContent();
    await page.screenshot({ path: '/tmp/unit2-booklet.png', fullPage: true });
    assert.notEqual(changedText, initialBooklet, '示例名字、年龄、外貌、家人和喜爱物品即时改变预览');
    assert(changedText.includes(selected['booklet-name'].value), '预览采用选定示例名字');
    assert.match(changedText, /I've got /, '外貌页面使用 have got 自我描述');
    assert(!/\ba hair\b|\bhairs\b/i.test(changedText), '手册把整头头发作为不可数 hair');
    assert.equal(await page.locator('#app input:not([type="hidden"]):not([type="file"])').count(), 0, '使用示例选择，不需要提交真实个人资料');
    assert.deepEqual(await current(), beforeBooklet, '制作小手册不写答题和错题记录');
    await click('read-booklet');
    const bookletSpeech = (await page.evaluate(() => window.unit2SpeechCalls)).at(-1);
    assert.equal(bookletSpeech.lang, 'en-GB');
    assert(bookletSpeech.text.includes(selected['booklet-name'].value));
    const previewEnglish = (await preview.locator('[lang="en"]').allTextContents()).map(normalize).filter(Boolean);
    const [download] = await Promise.all([page.waitForEvent('download'), click('download-booklet')]);
    assert.match(download.suggestedFilename(), /\.svg$/i);
    const content = await fs.readFile(await download.path(), 'utf8');
    assert(content.length > 1000, '下载包含完整图片与四页文字');
    const parsed = await page.evaluate(svg => {
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      return {
        error: !!doc.querySelector('parsererror'), root: doc.documentElement.localName,
        namespace: doc.documentElement.namespaceURI,
        text: [...doc.querySelectorAll('text')].map(element => element.textContent).join(' '),
        unsafe: doc.querySelectorAll('script, foreignObject, image').length,
        external: [...doc.querySelectorAll('*')].flatMap(element => [...element.attributes]).some(attribute => /href$/i.test(attribute.name) && /^https?:/i.test(attribute.value))
      };
    }, content);
    assert.equal(parsed.error, false);
    assert.equal(parsed.root, 'svg');
    assert.equal(parsed.namespace, 'http://www.w3.org/2000/svg');
    assert.equal(parsed.unsafe, 0);
    assert.equal(parsed.external, false, '下载后的手册全部内容在文件内，不依赖网络或其他图片');
    for (const sentence of previewEnglish) assert(normalize(parsed.text).includes(sentence), `下载与预览一致：${sentence}`);
    assert(!content.includes(KEY) && !content.includes('published-0'), '手册文件不泄露学习记录');
    const printBefore = await page.evaluate(() => window.unit2PrintCalls);
    await click('print-booklet');
    assert.equal(await page.evaluate(() => window.unit2PrintCalls), printBefore + 1);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await preview.isVisible(), true);
    assert.equal(await page.locator('#booklet-name').isVisible(), false);
    assert.equal(await page.locator('button[data-action="download-booklet"]').isVisible(), false);
    assert.equal(await page.locator('button[data-action="print-booklet"]').isVisible(), false);
    assert.equal(await page.locator('#home-link').isVisible(), false);
    const bookletPDF = await page.pdf({ path: '/tmp/unit2-booklet.pdf', preferCSSPageSize: true, printBackground: true });
    assert.equal((bookletPDF.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 4, '原生打印生成实际四页 PDF，不出现空白或额外分页');
    await page.emulateMedia({ media: 'screen' });
    await click('unit2-goals');
    await click('booklet');
    assert.equal(await preview.textContent(), changedText, '本次页面内返回再打开保留制作草稿');
    assert.deepEqual(await current(), beforeBooklet, '听读、下载、打印手册都不改变学习记录');
    passed.push('四页手册选择即时预览、草稿返回保留、真实独立 SVG 下载与仅打印手册、不索取资料或计分');

    await page.reload();
    assert((await current()).wrong.includes(retryWrong.id) && (await current()).wrong.includes(twiceWrong.id));
    assert((await current()).wrong.includes(reviewWrong.id), '综合复习首次答错题刷新后保留');
    for (const q of [oldQuestions[2], oldQuestions[3], oldQuestions[4], retryWrong, reviewWrong]) {
      await home();
      await click('review');
      await prefer(q.id);
      await click('start-review');
      assert.equal((await displayed()).id, q.id, '新旧错题都能重练');
      await choice(q.answer).evaluate(button => { button.click(); button.click(); });
      const state = await current();
      assert(!state.wrong.includes(q.id));
      assert.equal(state.attempts.at(-1).review, true);
      await leave();
    }
    passed.push('刷新保留新旧记录，原词汇、Hello、Unit 1 及 Unit 2 错题复习首次正确后移除');

    await home();
    await click('records');
    const beforeBackup = await current();
    const [backupDownload] = await Promise.all([page.waitForEvent('download'), click('export')]);
    const exported = JSON.parse(await fs.readFile(await backupDownload.path(), 'utf8'));
    assert.deepEqual(exported.data, beforeBackup);
    await click('clear');
    await page.locator('dialog[open] [data-confirm]').click();
    assert.deepEqual(await current(), { attempts: [], sessions: [], wrong: [] });
    const importFile = async data => {
      await page.locator('#backup-file').setInputFiles(backupFile(data));
      await page.locator('dialog[open]').waitFor();
      await page.locator('dialog[open] [data-confirm]').click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert((await page.locator('#backup-status').innerText()).includes('导入成功'));
    };
    await importFile(oldRecords);
    assert.deepEqual(await current(), oldRecords, '已发布旧备份仍可恢复');
    await importFile(exported.data);
    const restored = await current();
    // A backup merge preserves first attempts and reviewed removals by chronology.
    assert.deepEqual(restored, beforeBackup, '新旧科目与独立综合复习混合备份完整恢复');
    await importFile(exported.data);
    assert.deepEqual(await current(), beforeBackup, '重复导入不重复计数');
    await page.reload();
    assert.deepEqual(await current(), beforeBackup, '导入后刷新仍保留');
    passed.push('实际备份下载、已发布备份兼容、Unit 2 / 综合复习混合合并、重复导入幂等与刷新保存');

    for (const width of [320, 375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await goals();
      await noOverflow(`${width}px 目标页`);
      await learn('unit2-who');
      await noOverflow(`${width}px 人物学习卡`);
      await goals();
      await click('booklet');
      await noOverflow(`${width}px 手册操作与预览`);
      const bounds = await preview.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      await reviewGoals();
      await noOverflow(`${width}px 综合复习目标`);
      await start(reviewId);
      await noOverflow(`${width}px 综合题目`);
      await leave();
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await goals();
    await page.screenshot({ path: '/tmp/learning-garden-unit2-goals-mobile.png', fullPage: true });
    await learn('unit2-body');
    await page.screenshot({ path: '/tmp/learning-garden-unit2-body-mobile.png', fullPage: true });
    await goals();
    await click('booklet');
    await page.screenshot({ path: '/tmp/learning-garden-unit2-booklet-mobile.png', fullPage: true });
    assert.deepEqual(errors, [], '新增页面没有浏览器脚本错误');
    assert(requests.every(request => request.method === 'GET' && new URL(request.url).origin === origin), '只读取本地静态文件，无录音、个人资料上传或外部 AI 请求');
    passed.push('320px / 375px 手机和电脑布局正常、完整预览与可用选项、无脚本错误和外部请求');

    for (const options of [{ noSpeech: true }, { failedSpeech: true }]) {
      const fallbackContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
      await fallbackContext.addInitScript(initBrowser, options);
      const fallback = await fallbackContext.newPage();
      const fallbackErrors = [];
      fallback.on('pageerror', error => fallbackErrors.push(error.message));
      await fallback.goto(origin);
      await fallback.evaluate(id => sessionStorage.setItem('unit2PreferredQuestion', id), listening.id);
      await fallback.locator('button[data-action="subject"][data-id="english"]').click();
      await fallback.locator('.english-unit[data-topic="english2"] button[data-action="unit2-goals"]').click();
      await fallback.locator(`.goal-unit[data-topic="${listening.topic}"] button[data-action="start"]`).click();
      if (options.failedSpeech) await fallback.locator('button[data-action="listen"]').click();
      assert.equal(await fallback.locator('.listening-text').isVisible(), true);
      assert((await fallback.locator('.listening-text').innerText()).includes(listening.fallbackPrompt));
      await fallback.locator('button[data-action="answer"]').filter({ hasText: exact(listening.answer) }).click();
      assert.equal((await fallback.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).attempts.length, 1);
      assert.deepEqual(fallbackErrors, []);
      await fallbackContext.close();
    }
    passed.push('设备无朗读能力及实际播放错误均显示文字备用提示，作答和记录正常');
    await context.close();
    for (const description of passed) console.log(`通过：${description}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
