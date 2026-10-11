'use strict';

// Run with: node tests/unit1.browser.test.js
// Real Chromium verifies Unit 1 goals, position pictures, reading, poster export and existing records.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const unit1 = require('../data/english-unit1.js');
const hello = require('../data/english-hello.js');
const english = require('../data/english.js');

const root = path.resolve(__dirname, '..');
const KEY = 'learning-garden-v1';
const goalIds = ['unit1-school', 'unit1-position', 'unit1-plurals', 'unit1-phonics', 'unit1-reading', 'unit1-kindness'];
const questions = goalIds.flatMap(unit1.bank);
const helloQuestions = hello.topics.flatMap(topic => hello.bank(topic.id));
const oldHelloWrong = helloQuestions.find(q => q.topic === 'hello-name-age');
const originalEnglish = ['englishhello', 'english1', 'english2', 'english3', 'english4'].flatMap(english.bank);
const originalWrong = originalEnglish.find(q => q.topic === 'englishhello' && q.direction === 'meaning');
const oldRecords = {
  attempts: [
    { session: 'old-pinyin', topic: 'pinyin', question: 'pinyin-59', correct: false, review: false, time: 1000 },
    { session: 'old-english', topic: originalWrong.topic, question: originalWrong.id, correct: false, review: false, time: 1001 },
    { session: 'old-english-food', topic: 'english4', question: english.bank('english4')[0].id, correct: true, review: false, time: 1002 },
    { session: 'old-hello', topic: oldHelloWrong.topic, question: oldHelloWrong.id, correct: false, review: false, time: 1003 }
  ], sessions: [], wrong: ['pinyin-59', originalWrong.id, oldHelloWrong.id]
};
const regex = value => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const regexAnywhere = value => new RegExp(`\\b${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
const backupFile = data => ({
  name: 'learning-garden-backup.json', mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({
    format: 'learning-garden-backup', version: 1,
    exportedAt: '2026-10-11T09:00:00.000Z', data
  }))
});

async function serverStart() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const file = path.resolve(root, url.pathname === '/' ? 'index.html' : `.${decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
      const body = await fs.readFile(file);
      const type = file.endsWith('.js') ? 'text/javascript; charset=utf-8'
        : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
      res.writeHead(200, { 'Content-Type': type }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

// Select a stable real question while retaining the original option shuffle.
function initBrowser(options = {}) {
  // Keep this suite focused on native speech and the final text fallback.
  // The default bundled MP3 path is covered separately in audio.browser.test.js.
  Object.defineProperty(window, 'GardenAudio', {
    configurable: true, get: () => undefined, set() {}
  });
  let api;
  Object.defineProperty(window, 'GardenQuestions', {
    configurable: true,
    get: () => api,
    set: value => {
      const shuffle = value.shuffle;
      value.shuffle = list => {
        const desired = sessionStorage.getItem('unit1PreferredQuestion');
        const first = list.find(item => item && typeof item === 'object' && item.id === desired);
        return first ? [first, ...shuffle(list.filter(item => item !== first))] : shuffle(list);
      };
      api = value;
    }
  });
  window.unit1SpeechCalls = [];
  window.unit1SpeechCancels = 0;
  window.unit1PrintCalls = 0;
  window.print = () => { window.unit1PrintCalls++; };
  if (options.noSpeech) {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
    return;
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true, value: class { constructor(text) { this.text = text; } }
  });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => [{ name: 'Test British voice', lang: 'en-GB' }],
      cancel() { window.unit1SpeechCancels++; },
      addEventListener() {}, removeEventListener() {},
      speak(utterance) {
        window.unit1SpeechCalls.push({ text: utterance.text, lang: utterance.lang });
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
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    await context.addInitScript(initBrowser);
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push({ method: request.method(), url: request.url() }));
    await page.goto(origin);
    const click = action => page.locator(`button[data-action="${action}"]`).first().click();
    const current = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const home = () => page.locator('#home-link').click();
    const units = async () => {
      await home();
      await page.locator('button[data-action="subject"][data-id="english"]').click();
    };
    const goals = async () => {
      await units();
      await page.locator('.english-unit[data-topic="english1"] button[data-action="unit1-goals"]').click();
    };
    const goal = topic => page.locator(`.goal-unit[data-topic="${topic}"]`);
    const start = topic => goal(topic).locator(`button[data-action="start"][data-id="${topic}"]`).click();
    const learn = topic => goal(topic).locator(`button[data-action="goal-learn"][data-id="${topic}"]`).click();
    const chooseCount = n => page.locator(`button[data-action="count"][data-id="unit1"][data-count="${n}"]`).click();
    const choice = answer => page.locator('button[data-action="answer"]').filter({ hasText: regex(answer) });
    const prefer = id => page.evaluate(id => sessionStorage.setItem('unit1PreferredQuestion', id), id);
    const displayed = async () => {
      const prompt = await page.locator('.question').innerText();
      const stableId = await page.locator('.question').getAttribute('data-question-id');
      const choices = (await page.locator('button[data-action="answer"]').allTextContents()).sort();
      const found = [...questions, ...originalEnglish, ...helloQuestions].find(q =>
        stableId ? q.id === stableId : q.prompt.replace(/\s+/g, ' ').trim() === prompt.replace(/\s+/g, ' ').trim() && JSON.stringify([...q.choices].sort()) === JSON.stringify(choices));
      assert(found, `应显示已知 Unit 1 / Hello / 英语题：${prompt}`);
      return found;
    };
    const leave = async () => {
      await click('leave');
      await page.locator('dialog[open] [data-confirm]').click();
    };
    const noOverflow = async label => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label} 不应横向溢出`);
      for (const button of await page.locator('.choices button').all()) {
        assert(await button.evaluate(element => element.scrollWidth <= element.clientWidth), `${label} 选项应完整容纳`);
      }
    };
    await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: oldRecords });
    await page.reload();
    await goals();
    assert.equal(await page.locator('.goal-unit').count(), 6);
    for (const topic of goalIds) assert.equal(await goal(topic).count(), 1, '六个目标均可独立选择');
    assert.equal(english.units.flatMap(unit => unit.words).length, 158, '原词表词条完整保留');
    assert.equal(originalEnglish.length, 316, '原双向选择题完整保留');
    assert.deepEqual(await current(), oldRecords, '打开目标页保留旧记录');
    passed.push('Unit 1 新入口、六个学习目标、原 158 词条和 316 双向题及旧记录保留');

    // Cards support looking, listening and speaking without grading a child.
    for (const topic of goalIds) {
      const cards = unit1.lesson(topic);
      assert(cards.length, `${topic} 应有学习卡`);
      await learn(topic);
      for (let i = 0; i < cards.length; i++) {
        assert.equal(await page.locator('.goal-card').count(), 1);
        assert.equal(await page.locator('.goal-title').innerText(), cards[i].title, '学习卡顺序和标题与目标一致');
        if (i === 0) {
          const previous = page.locator('button[data-action="goal-prev"]');
          assert.equal(await previous.isDisabled(), true, '第一张卡不能往前越界');
        }
        const speak = page.locator('button[data-action="speak"]');
        if (await speak.count()) {
          const before = await page.evaluate(() => window.unit1SpeechCalls.length);
          await speak.first().click();
          const calls = await page.evaluate(() => window.unit1SpeechCalls);
          assert.equal(calls.length, before + 1);
          assert.equal(calls.at(-1).lang, 'en-GB');
          assert(calls.at(-1).text.trim(), '示范发音包含可听英文');
          if (topic === 'unit1-phonics') {
            assert.equal(await speak.first().innerText(), '🔊 听示例词', '词首音示范明确说明听的是单词');
            assert.equal(calls.at(-1).text, cards[i].sayModel, 'p / b 听示范只读完整示例词，不朗读字母名和拼写箭头');
            assert(!/[→_;]/.test(calls.at(-1).text), '词首音示范不读视觉拼写标记');
          }
        }
        const model = page.locator('button[data-action="show-model"]');
        assert.equal(await page.locator('.say-model').isVisible(), false, '先鼓励孩子自己说，再查看示范说法');
        await model.first().click();
        assert.equal(await page.locator('.say-model').isVisible(), true);
        assert((await page.locator('.say-model').innerText()).includes(cards[i].sayModel));
        const say = page.locator('button[data-action="say-done"]');
        await say.first().click();
        assert((await page.locator('.practice-status').innerText()).includes('进步'), '开口之后给温和鼓励');
        assert.equal(await say.first().isDisabled(), true, '开口鼓励按钮避免重复触发');
        assert.deepEqual(await current(), oldRecords, '看、听和自己开口只鼓励，不写答题分数');
        if (i + 1 < cards.length) await click('goal-next');
        else assert.equal(await page.locator('button[data-action="goal-next"]').isDisabled(), true, '最后一张卡不能往后越界');
      }
      if (cards.length > 1) {
        const title = await page.locator('.goal-title').innerText();
        await click('goal-prev');
        assert.notEqual(await page.locator('.goal-title').innerText(), title, '可以返回上一张卡');
      }
      await click('unit1-goals');
    }
    passed.push('六目标学习卡遍历、边界与返回、英文示范、开口鼓励不计分也不修改旧记录');

    // English vocabulary direction / extension toggles must not remove Unit 1 goals.
    await units();
    await page.locator('button[data-action="english-mode"][data-mode="word"]').click();
    await page.locator('#include-extra').setChecked(false);
    await page.locator('.english-unit[data-topic="english1"] button[data-action="unit1-goals"]').click();
    await chooseCount(5);
    let retryWrong, twiceWrong;
    for (const [index, topic] of goalIds.entries()) {
      await start(topic);
      for (let i = 0; i < 5; i++) {
        const q = await displayed();
        assert.equal(q.topic, topic, '每个目标只抽取自己的题目');
        if (i === 0 && index < 2) {
          const before = (await current()).attempts.length;
          const wrong = q.choices.find(option => option !== q.answer);
          await choice(wrong).evaluate(button => { button.click(); button.click(); });
          assert.equal((await current()).attempts.length, before + 1, '快速重复点选只记录首次作答一次');
          assert((await page.locator('#feedback').innerText()).includes(q.hint), '首次答错先给简单提示');
          await click('retry');
          if (index === 0) {
            retryWrong = q;
            await choice(q.answer).click();
          } else {
            twiceWrong = q;
            await choice(wrong).click();
            assert((await page.locator('#feedback').innerText()).includes(`答案是 ${q.answer}`));
            assert((await page.locator('#feedback').innerText()).includes(q.explanation));
          }
          assert.equal((await current()).attempts.length, before + 1, '重试不覆盖首次结果');
        } else await choice(q.answer).click();
        await click('next');
      }
      const saved = await current();
      assert.equal(saved.sessions.at(-1).total, 5);
      assert.equal(saved.sessions.at(-1).correct, index < 2 ? 4 : 5);
      assert.deepEqual(saved.attempts.slice(0, oldRecords.attempts.length), oldRecords.attempts);
      await goals();
    }
    assert((await current()).wrong.includes(retryWrong.id));
    assert((await current()).wrong.includes(twiceWrong.id));
    await chooseCount(10);
    await start('unit1-position');
    for (let i = 0; i < 10; i++) {
      const q = await displayed();
      assert.equal(q.topic, 'unit1-position');
      await choice(q.answer).click();
      await click('next');
    }
    assert.equal((await current()).sessions.at(-1).total, 10);
    assert.equal((await current()).sessions.at(-1).correct, 10);
    passed.push('六目标独立 5 题、10 题完整总结、词汇模式不影响目标练习、重复点击锁和两次答错讲解');

    const listening = questions.find(q => q.kind === 'listening');
    assert(listening, 'Unit 1 题库有真实听辨题');
    await goals();
    await prefer(listening.id);
    await start(listening.topic);
    assert.equal((await displayed()).id, listening.id);
    assert.equal(await page.locator('.listening-text').isVisible(), false, '听辨英文默认隐藏');
    assert(!(await page.locator('.question').innerText()).includes(listening.speech), '提示不提前显示待听英文');
    const speechBefore = await page.evaluate(() => window.unit1SpeechCalls.length);
    const cancelBefore = await page.evaluate(() => window.unit1SpeechCancels);
    await click('listen');
    await click('listen');
    const calls = await page.evaluate(() => window.unit1SpeechCalls);
    assert.equal(calls.length, speechBefore + 2);
    assert.equal(calls.at(-1).text, listening.speech);
    assert((await page.evaluate(() => window.unit1SpeechCancels)) >= cancelBefore + 2, '重复朗读先取消旧播放，不堆积');
    await click('show-listening-text');
    assert.equal(await page.locator('.listening-text').isVisible(), true);
    assert((await page.locator('.listening-text').innerText()).includes(listening.fallbackPrompt));
    await choice(listening.answer).click();
    await leave();
    const silentQuestion = questions.find(q => q.kind !== 'listening' && q.answerSpeech);
    assert(silentQuestion, '有答案后才能朗读的非听辨题');
    await goals();
    await prefer(silentQuestion.id);
    await start(silentQuestion.topic);
    assert.equal((await displayed()).id, silentQuestion.id);
    assert.equal(await page.locator('button[data-action="speak"]').count(), 0, '作答前不朗读答案');
    await choice(silentQuestion.answer).click();
    await click('speak');
    assert.equal((await page.evaluate(() => window.unit1SpeechCalls)).at(-1).text, silentQuestion.answerSpeech);
    await leave();
    passed.push('听辨先听再选、英文默认隐藏与手动文字提示、重复播放不堆积、非听辨作答前不泄漏答案');

    const visualType = q => typeof q.visual === 'string' ? q.visual : q.visual?.type;
    for (const type of ['position', 'objects']) {
      const q = questions.find(item => visualType(item) === type);
      assert(q, `题库有 ${type} 图示题`);
      await goals();
      await prefer(q.id);
      await start(q.topic);
      assert.equal((await displayed()).id, q.id);
      assert.equal(await page.locator('.question-visual').count(), 1, '位置或单复数有实际可见图示');
      assert.equal(await page.locator('.question-visual').isVisible(), true);
      if (type === 'position') {
        assert.equal(await page.locator('.question-visual .position-picture svg').count(), 1, '方位示意图包含真正的 SVG 图形');
        assert((await page.locator('.question-visual svg').innerHTML()).length > 100, '图示不是空 SVG 占位');
      } else {
        assert.equal(await page.locator('.question-visual .objects-picture > span').count(), q.visual.count, '单复数图示按实际数量显示物品');
        assert((await page.locator('.question-visual .objects-picture').innerText()).includes(q.visual.word), '图示保留物品英文标签');
      }
      await noOverflow(`${type} 图示`);
      await leave();
    }
    passed.push('位置 SVG 与单复数实物数量图示实际显示并可作答');
    for (const relation of ['on', 'in', 'under', 'next to']) {
      const q = questions.find(item => item.visual?.type === 'position' && item.visual.relation === relation);
      assert(q, `题库用图示覆盖 ${relation}`);
      await goals();
      await prefer(q.id);
      await start(q.topic);
      assert.equal((await displayed()).id, q.id);
      const svg = page.locator('.question-visual .position-picture svg');
      assert.equal(await svg.isVisible(), true);
      assert((await svg.getAttribute('aria-label')).includes(q.visual.object), '图示标明题干中的物品');
      assert((await svg.getAttribute('aria-label')).includes(q.visual.anchor), '图示标明题干中的参照物');
      await choice(q.answer).click();
      assert((await page.locator('#feedback').innerText()).includes(q.explanation));
      await leave();
    }
    passed.push('四种方位 on / in / under / next to 均有可见图示和对应题目讲解');

    const readingQuestions = questions.filter(q => Array.isArray(q.passage) && q.passage.length);
    assert(readingQuestions.length, 'Unit 1 提供原创短文理解题');
    for (const q of readingQuestions) {
      await goals();
      await prefer(q.id);
      await start(q.topic);
      assert.equal((await displayed()).id, q.id);
      assert.equal(await page.locator('.reading-passage').count(), 1);
      for (const sentence of q.passage) {
        assert((await page.locator('.reading-passage').innerText()).includes(sentence), '阅读题须完整显示与答案相关的英文原文');
      }
      const before = await page.evaluate(() => window.unit1SpeechCalls.length);
      await click('read-passage');
      const speech = await page.evaluate(() => window.unit1SpeechCalls);
      assert.equal(speech.length, before + 1);
      assert.equal(speech.at(-1).text.replace(/\s+/g, ' ').trim(), q.passage.join(' ').replace(/\s+/g, ' ').trim(), '阅读朗读只读原文');
      const beforeAttempts = (await current()).attempts.length;
      await choice(q.answer).click();
      assert.equal((await current()).attempts.length, beforeAttempts + 1);
      await noOverflow('短文理解');
      await leave();
    }
    passed.push('每道原创阅读题显示完整短文、听全文只读原文、理解题可作答并记录');

    // A classroom poster is a separate craft activity, never a learning-record backup.
    await goals();
    const beforePoster = await current();
    await click('poster');
    assert.equal(await page.locator('#classroom-poster').isVisible(), true, '海报有即时可见预览');
    for (let index = 0; index < 4; index++) {
      assert.equal(await page.locator(`select[data-poster-item="${index}"]`).count(), 1);
      assert.equal(await page.locator(`select[data-poster-count="${index}"]`).count(), 1);
    }
    const posterPreview = page.locator('#classroom-poster');
    assert.equal(await posterPreview.locator('svg').count(), 4, '海报四个位置均有本地 SVG 图示');
    const initialPoster = await posterPreview.textContent();
    await page.locator('select[data-poster-item="0"]').selectOption('book');
    await page.locator('select[data-poster-count="0"]').selectOption('2');
    assert.match(await posterPreview.locator('.poster-scenes article p').first().innerText(), /^The books are on the desk\.$/, '海报两本书应使用 books are');
    await page.locator('select[data-poster-count="0"]').selectOption('1');
    assert.match(await posterPreview.locator('.poster-scenes article p').first().innerText(), /^The book is on the desk\.$/, '切回一本书使用 book is');
    await page.locator('select[data-poster-count="0"]').selectOption('3');
    await page.locator('select[data-poster-item="1"]').selectOption('pencil');
    await page.locator('select[data-poster-count="1"]').selectOption('2');
    await page.locator('select[data-poster-item="2"]').selectOption('ruler');
    await page.locator('select[data-poster-count="2"]').selectOption('1');
    await page.locator('select[data-poster-item="3"]').selectOption('crayon');
    await page.locator('select[data-poster-count="3"]').selectOption('3');
    const rules = await page.locator('#poster-rule option').evaluateAll(options => options.map(option => ({ value: option.value, text: option.textContent })));
    assert(rules.length >= 2, '海报可选择不同校园规则');
    const selectedRule = rules.at(-1);
    await page.locator('#poster-rule').selectOption(selectedRule.value);
    assert.equal(await posterPreview.locator('.poster-classroom-rule small').innerText(), selectedRule.text, '新课堂规则即时反映到海报预览');
    const posterText = await posterPreview.textContent();
    const posterSentences = await posterPreview.locator('.poster-scenes article p, .poster-classroom-rule p').allTextContents();
    assert.equal(posterSentences.length, 5, '海报包含四句位置介绍和一条规则');
    assert.notEqual(posterText, initialPoster, '改变物品、数量和规则后立即更新预览');
    for (const word of ['books', 'pencils', 'ruler', 'crayons']) assert.match(posterText, regexAnywhere(word), '数量和物品都反映到海报中');
    assert.match(posterText, /\bon\b/i);
    assert.match(posterText, /\bin\b/i);
    assert.match(posterText, /\bunder\b/i);
    assert.match(posterText, /next to/i);
    assert.deepEqual(await current(), beforePoster, '制作海报不修改答题、错题或历史记录');
    const [posterDownload] = await Promise.all([page.waitForEvent('download'), click('download-poster')]);
    assert.match(posterDownload.suggestedFilename(), /\.svg$/i, '独立图句文件使用 SVG 扩展名');
    const posterFile = await fs.readFile(await posterDownload.path(), 'utf8');
    assert(posterFile.length > 1000, '下载海报含完整图形与文字');
    const parsedPoster = await page.evaluate(content => {
      const doc = new DOMParser().parseFromString(content, 'image/svg+xml');
      return {
        error: !!doc.querySelector('parsererror'),
        root: doc.documentElement.localName,
        namespace: doc.documentElement.namespaceURI,
        text: [...doc.querySelectorAll('text')].map(element => element.textContent).join(' '),
        unsafe: doc.querySelectorAll('script, foreignObject, image').length,
        external: [...doc.querySelectorAll('*')].flatMap(element => [...element.attributes]).some(attribute => /href$/i.test(attribute.name) && /^https?:/i.test(attribute.value))
      };
    }, posterFile);
    assert.equal(parsedPoster.error, false, '海报文件 XML 完整且可解析');
    assert.equal(parsedPoster.root, 'svg');
    assert.equal(parsedPoster.namespace, 'http://www.w3.org/2000/svg');
    assert.equal(parsedPoster.unsafe, 0, '海报由本地矢量绘图组成');
    assert.equal(parsedPoster.external, false, '下载的海报不依赖外部文件');
    for (const sentence of posterSentences) {
      assert(parsedPoster.text.replace(/\s+/g, ' ').includes(sentence.replace(/\s+/g, ' ')), '下载包含与即时预览一致的完整图句');
    }
    assert(!posterFile.includes(KEY) && !posterFile.includes(originalWrong.id) && !posterFile.includes('old-pinyin'), '海报文件不包含旧学习记录');
    const printBefore = await page.evaluate(() => window.unit1PrintCalls);
    await click('print-poster');
    assert.equal(await page.evaluate(() => window.unit1PrintCalls), printBefore + 1, '打印按钮调用原生打印');
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#classroom-poster').isVisible(), true, '打印保留海报');
    assert.equal(await page.locator('select[data-poster-item="0"]').isVisible(), false, '打印隐藏物品操作控件');
    assert.equal(await page.locator('button[data-action="download-poster"]').isVisible(), false, '打印隐藏操作按钮');
    assert.equal(await page.locator('button[data-action="print-poster"]').isVisible(), false);
    assert.equal(await page.locator('#home-link').isVisible(), false, '打印隐藏导航');
    await page.emulateMedia({ media: 'screen' });
    assert.deepEqual(await current(), beforePoster, '下载和打印海报不改变记录');
    await click('unit1-goals');
    passed.push('海报实时更换四位置物品与单复数、规则、真实完整 SVG 下载及仅打印海报、不改变学习记录');

    await page.reload();
    const saved = await current();
    assert(saved.wrong.includes(retryWrong.id), '刷新后 Unit 1 提示重试错题保留');
    assert(saved.wrong.includes(originalWrong.id), '旧英语错题保留');
    await click('review');
    await prefer(originalWrong.id);
    await click('start-review');
    assert.equal((await displayed()).id, originalWrong.id, '新增目标后仍能复习旧词汇错题');
    await choice(originalWrong.answer).evaluate(button => { button.click(); button.click(); });
    assert(!(await current()).wrong.includes(originalWrong.id));
    await leave();
    await click('review');
    await prefer(oldHelloWrong.id);
    await click('start-review');
    assert.equal((await displayed()).id, oldHelloWrong.id, '新增 Unit 1 后仍能重练 Hello 目标错题');
    await choice(oldHelloWrong.answer).click();
    assert(!(await current()).wrong.includes(oldHelloWrong.id));
    await leave();
    await click('review');
    await prefer(retryWrong.id);
    await click('start-review');
    assert.equal((await displayed()).id, retryWrong.id);
    await choice(retryWrong.answer).evaluate(button => { button.click(); button.click(); });
    assert(!(await current()).wrong.includes(retryWrong.id), 'Unit 1 错题复习首次正确后移除');
    assert.equal((await current()).attempts.at(-1).review, true);
    await leave();
    passed.push('刷新保留新旧错题、既有词汇与 Hello 错题仍可重练、Unit 1 错题复习首次答对移除');

    await click('records');
    const beforeBackup = await current();
    const [download] = await Promise.all([page.waitForEvent('download'), click('export')]);
    const downloaded = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    assert.deepEqual(downloaded.data, beforeBackup);
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
    assert.deepEqual(await current(), oldRecords, '既有英语词汇备份恢复');
    await importFile(downloaded.data);
    assert.deepEqual(await current(), beforeBackup, 'Unit 1 与 Hello 及既有科目混合备份合并恢复');
    await importFile(downloaded.data);
    assert.deepEqual(await current(), beforeBackup, '重复导入不重复计数');
    await page.reload();
    assert.deepEqual(await current(), beforeBackup, '导入后刷新保留');
    passed.push('真实备份下载、新旧英语与原有科目混合恢复、重复导入不计重与刷新保存');

    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await goals();
      await noOverflow(`${width}px 目标页`);
      await learn('unit1-position');
      await noOverflow(`${width}px 位置学习卡`);
      await click('unit1-goals');
      await prefer(listening.id);
      await start(listening.topic);
      await click('show-listening-text');
      await noOverflow(`${width}px 听辨文字提示`);
      await leave();
      await goals();
      await prefer(readingQuestions[0].id);
      await start(readingQuestions[0].topic);
      await noOverflow(`${width}px 英文短文`);
      await leave();
      await goals();
      await click('poster');
      await noOverflow(`${width}px 海报制作与预览`);
      const bounds = await page.locator('#classroom-poster').boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, '海报预览完整容纳当前屏幕');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await goals();
    await page.screenshot({ path: '/tmp/learning-garden-unit1-goals-mobile.png', fullPage: true });
    await learn('unit1-position');
    await page.screenshot({ path: '/tmp/learning-garden-unit1-card-mobile.png', fullPage: true });
    await click('unit1-goals');
    await click('poster');
    await page.screenshot({ path: '/tmp/learning-garden-unit1-poster-mobile.png', fullPage: true });
    assert.deepEqual(errors, [], '目标学习页面无浏览器脚本错误');
    assert(requests.every(request => request.method === 'GET' && new URL(request.url).origin === origin), '只读取本地静态资源，无录音上传或 AI 外部请求');
    passed.push('320px / 390px 手机与电脑目标、学习卡、听辨、阅读和海报布局、无脚本错误及外部请求');

    for (const options of [{ noSpeech: true }, { failedSpeech: true }]) {
      const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await fallbackContext.addInitScript(initBrowser, options);
      const fallback = await fallbackContext.newPage();
      const fallbackErrors = [];
      fallback.on('pageerror', error => fallbackErrors.push(error.message));
      await fallback.goto(origin);
      await fallback.evaluate(id => sessionStorage.setItem('unit1PreferredQuestion', id), listening.id);
      await fallback.locator('button[data-action="subject"][data-id="english"]').click();
      await fallback.locator('.english-unit[data-topic="english1"] button[data-action="unit1-goals"]').click();
      await fallback.locator(`.goal-unit[data-topic="${listening.topic}"] button[data-action="start"]`).click();
      if (options.failedSpeech) await fallback.locator('button[data-action="listen"]').click();
      assert.equal(await fallback.locator('.listening-text').isVisible(), true, '发音不可用时自动显示文字降级提示');
      assert((await fallback.locator('.listening-text').innerText()).includes(listening.fallbackPrompt));
      await fallback.locator('button[data-action="answer"]').filter({ hasText: regex(listening.answer) }).click();
      assert.equal((await fallback.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).attempts.length, 1, '无发音仍能作答和保存');
      assert.deepEqual(fallbackErrors, []);
      await fallbackContext.close();
    }
    passed.push('无 speechSynthesis 和实际语音失败自动文字降级，作答保存仍可使用');

    await context.close();
    for (const description of passed) console.log(`通过：${description}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
