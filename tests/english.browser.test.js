'use strict';

// Run with: node tests/english.browser.test.js
// Real Chromium covers page interactions, downloads, speech fallback and storage.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const english = require('../data/english.js');
const { bank } = require('../data/questions.js');

const root = path.resolve(__dirname, '..');
const KEY = 'learning-garden-v1';
const ids = ['englishhello', 'english1', 'english2', 'english3', 'english4'];
const allQuestions = ids.flatMap(english.bank);
const oldRecords = {
  attempts: [
    { session: 'old-pinyin', topic: 'pinyin', question: 'pinyin-59', correct: false, review: false, time: 1000 },
    { session: 'old-words', topic: 'words', question: 'words-59', correct: true, review: false, time: 1001 }
  ], sessions: [], wrong: ['pinyin-59']
};
const backupFile = data => ({
  name: 'learning-garden-backup.json', mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({
    format: 'learning-garden-backup', version: 1,
    exportedAt: '2026-10-10T09:00:00.000Z', data
  }))
});
const regex = value => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

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

(async () => {
  const server = await serverStart();
  const url = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const passed = [];
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    await context.addInitScript(() => {
      let questions;
      // Force one known question first without changing its data or the UI.
      Object.defineProperty(window, 'GardenQuestions', {
        configurable: true,
        get: () => questions,
        set: api => {
          const original = api.shuffle;
          api.shuffle = list => {
            const desired = sessionStorage.getItem('englishPreferredQuestion');
            const first = list.find(item => item && typeof item === 'object' && item.id === desired);
            return first ? [first, ...original(list.filter(item => item !== first))] : original(list);
          };
          questions = api;
        }
      });
      window.englishSpeechCalls = [];
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: class { constructor(text) { this.text = text; } }
      });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => [{ name: 'Test British voice', lang: 'en-GB' }],
          cancel() {}, addEventListener() {}, removeEventListener() {},
          speak(utterance) { window.englishSpeechCalls.push({ text: utterance.text, lang: utterance.lang }); }
        }
      });
    });
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push({ method: request.method(), url: request.url() }));
    await page.goto(url);
    const click = action => page.locator(`button[data-action="${action}"]`).first().click();
    const current = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const setRecords = async data => {
      await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data });
      await page.reload();
    };
    const prefer = id => page.evaluate(id => sessionStorage.setItem('englishPreferredQuestion', id), id);
    const home = () => page.locator('#home-link').click();
    const units = async () => {
      await home();
      await page.locator('button[data-action="subject"][data-id="english"]').click();
    };
    const unit = topic => page.locator(`.english-unit[data-topic="${topic}"]`);
    const learn = topic => unit(topic).locator(`button[data-action="learn"][data-id="${topic}"]`).click();
    const start = topic => unit(topic).locator(`button[data-action="start"][data-id="${topic}"]`).click();
    const chooseCount = n => page.locator(`button[data-action="count"][data-count="${n}"]`).click();
    const choice = answer => page.locator('button[data-action="answer"]').filter({ hasText: regex(answer) });
    const displayed = async () => {
      const prompt = await page.locator('.question').innerText();
      const question = allQuestions.find(q => q.prompt === prompt);
      assert(question, `应显示题库内英语题：${prompt}`);
      return question;
    };
    const leave = async () => {
      await click('leave');
      await page.locator('dialog[open] [data-confirm]').click();
    };
    const noOverflow = async label => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label} 页面不应横向溢出`);
      for (const button of await page.locator('.choices button').all()) {
        assert(await button.evaluate(element => element.scrollWidth <= element.clientWidth), `${label} 选项文字完整显示`);
      }
    };

    await setRecords(oldRecords);
    await units();
    assert.equal(await page.locator('.english-unit').count(), 5, 'Hello 与 Unit 1–4 均可独立选择');
    for (const id of ids) assert.equal(await unit(id).count(), 1);
    assert.equal(await page.locator('#include-extra').isChecked(), false, '默认只学核心词');
    await learn('englishhello');
    const hello = english.vocabulary('englishhello');
    assert.equal(await page.locator('.vocab-word').innerText(), hello[0].english);
    assert.equal(await page.locator('.vocab-meaning').innerText(), hello[0].meaning);
    const beforeSpeech = await page.evaluate(() => window.englishSpeechCalls.length);
    await click('speak');
    const speeches = await page.evaluate(() => window.englishSpeechCalls);
    assert.equal(speeches.length, beforeSpeech + 1);
    assert.deepEqual(speeches.at(-1), { text: hello[0].speech, lang: 'en-GB' }, '使用英式英文朗读');
    await click('study-next');
    assert.equal(await page.locator('.vocab-word').innerText(), hello[1].english);
    await click('study-prev');
    assert.equal(await page.locator('.vocab-word').innerText(), hello[0].english);
    const previous = page.locator('button[data-action="study-prev"]');
    if (await previous.isEnabled()) await previous.click();
    assert.equal(await page.locator('.vocab-word').innerText(), hello[0].english, '第一页不能越界');
    assert.deepEqual(await current(), oldRecords, '学习卡与朗读不计练习次数或改动旧数据');
    passed.push('首页英语入口、五个单元、默认核心词、学习分页、英式朗读、学习不计答题');

    await page.locator('button[data-action="subject"][data-id="english"]').click();
    const words1 = english.vocabulary('english1');
    async function walkWords(includeExtra) {
      await page.locator('#include-extra').setChecked(includeExtra);
      await learn('english1');
      const expected = words1.filter(word => includeExtra || !word.extended);
      for (let i = 0; i < expected.length; i++) {
        assert.equal(await page.locator('.vocab-word').innerText(), expected[i].english, '学习词表按拓展开关过滤');
        if (i < expected.length - 1) await click('study-next');
      }
      const next = page.locator('button[data-action="study-next"]');
      if (await next.isEnabled()) await next.click();
      assert.equal(await page.locator('.vocab-word').innerText(), expected.at(-1).english, '最后一词不能越界');
      await page.locator('button[data-action="subject"][data-id="english"]').click();
    }
    await walkWords(false);
    await walkWords(true);
    assert.deepEqual(await current(), oldRecords, '拓展学习也不计练习记录');
    passed.push('核心与含拓展词表完整遍历、分页边界、学习不影响旧记录');

    // Choosing a single direction must filter the pool before random sampling.
    for (const mode of ['meaning', 'word']) {
      await page.locator(`button[data-action="english-mode"][data-mode="${mode}"]`).click();
      const excluded = english.bank('englishhello').find(q => q.direction !== mode);
      await prefer(excluded.id);
      await start('englishhello');
      assert.equal((await displayed()).direction, mode, `${mode} 练习只抽取该方向`);
      await leave();
      await units();
    }
    await page.locator('button[data-action="english-mode"][data-mode="mixed"]').click();
    assert.deepEqual(await current(), oldRecords, '单独选择方向但未作答不增加记录');
    passed.push('选中文、选英文与综合模式，抽题过滤且未作答不计记录');

    const extra = english.bank('english1').find(q => q.extended && q.direction === 'meaning');
    await page.locator('#include-extra').setChecked(false);
    await chooseCount(5);
    await prefer(extra.id);
    await start('english1');
    let firstWrong;
    for (let i = 0; i < 5; i++) {
      const question = await displayed();
      assert.equal(question.extended, false, '默认练习不得抽到拓展词');
      if (i === 0) {
        firstWrong = question;
        const wrong = question.choices.find(answer => answer !== question.answer);
        const before = (await current()).attempts.length;
        await choice(wrong).evaluate(button => { button.click(); button.click(); });
        assert.equal((await current()).attempts.length, before + 1, '连续点击只记一次首次作答');
        assert((await page.locator('#feedback').innerText()).includes(question.hint));
        await click('retry');
        await choice(question.answer).click();
        assert.equal((await current()).attempts.length, before + 1, '重试不覆盖首次结果');
        assert((await current()).wrong.includes(question.id));
      } else await choice(question.answer).click();
      await click('next');
    }
    let saved = await current();
    assert.equal(saved.attempts.length, oldRecords.attempts.length + 5);
    assert.equal(saved.sessions.length, 1);
    assert.equal(saved.sessions[0].total, 5);
    assert.equal(saved.sessions[0].correct, 4);
    assert(saved.wrong.includes(firstWrong.id));
    assert.deepEqual(saved.attempts.slice(0, oldRecords.attempts.length), oldRecords.attempts);
    await page.reload();
    assert.deepEqual(await current(), saved, '刷新保存英语首次结果和旧资料');
    await click('records');
    assert((await page.locator('main').innerText()).includes('80%'), '英语知识点按首次结果显示正确率');
    passed.push('5题核心练习、提示重试、重复点击锁定、首次正确率、总结、刷新保存与旧数据兼容');

    await units();
    await page.locator('#include-extra').setChecked(true);
    await chooseCount(10);
    await prefer(extra.id);
    await start('english1');
    for (let i = 0; i < 10; i++) {
      const question = await displayed();
      if (i === 0) {
        assert.equal(question.id, extra.id, '开启拓展可抽到标星词');
        const wrong = question.choices.find(answer => answer !== question.answer);
        await choice(wrong).click();
        await click('retry');
        await choice(wrong).click();
        assert((await page.locator('#feedback').innerText()).includes(`答案是 ${question.answer}`));
        assert((await page.locator('#feedback').innerText()).includes(question.explanation));
      } else await choice(question.answer).click();
      await click('next');
    }
    saved = await current();
    assert.equal(saved.sessions.at(-1).total, 10);
    assert.equal(saved.sessions.at(-1).correct, 9);
    assert(saved.wrong.includes(extra.id));
    await units();
    await page.locator('#include-extra').setChecked(false);
    await home();
    await click('review');
    await prefer(extra.id);
    await click('start-review');
    assert.equal((await displayed()).id, extra.id, '关闭拓展后，已存在的拓展错题仍可复习');
    await choice(extra.answer).evaluate(button => { button.click(); button.click(); });
    saved = await current();
    assert(!saved.wrong.includes(extra.id), '复习首次答对移除英语错题');
    assert.equal(saved.attempts.at(-1).review, true);
    assert.equal(saved.attempts.at(-1).correct, true);
    await leave();
    passed.push('10题含拓展练习、二次答错答案讲解、关闭拓展仍可复习旧拓展错题、复习首次答对移除');

    // Use actual generated JSON, then clear and restore both old/new backups.
    await click('records');
    const beforeBackup = await current();
    const [download] = await Promise.all([page.waitForEvent('download'), click('export')]);
    const downloaded = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    assert.deepEqual(downloaded.data, beforeBackup, '真实下载包含英语和原有记录');
    await click('clear');
    await page.locator('dialog[open] [data-confirm]').click();
    assert.deepEqual(await current(), { attempts: [], sessions: [], wrong: [] });
    async function importFile(payload) {
      await page.locator('#backup-file').setInputFiles(payload);
      await page.locator('dialog[open]').waitFor();
      await page.locator('dialog[open] [data-confirm]').click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert((await page.locator('#backup-status').innerText()).includes('导入成功'));
    }
    await importFile(backupFile(oldRecords));
    assert.deepEqual(await current(), oldRecords, '恢复旧备份无需英语记录');
    await importFile({ name: download.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(downloaded)) });
    assert.deepEqual(await current(), beforeBackup, '英语备份合并保留旧记录并恢复首次答题与错题');
    await importFile(backupFile(beforeBackup));
    assert.deepEqual(await current(), beforeBackup, '重复英语备份不重复计数');
    await page.reload();
    assert.deepEqual(await current(), beforeBackup, '导入结果刷新后保留');
    passed.push('真实 JSON 下载、旧备份导入、英语备份合并恢复、重复导入和刷新保存');

    const family = english.vocabulary('english2').find(word => word.english.replace(/\s/g, '') === 'grandfather/grandpa');
    assert(family);
    const longQuestion = english.bank('english2').find(q => q.wordKey === family.key && q.direction === 'word');
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await units();
      await page.locator('#include-extra').setChecked(false);
      await learn('english2');
      const core = english.vocabulary('english2').filter(word => !word.extended);
      for (let i = 0; i < core.findIndex(word => word.key === family.key); i++) await click('study-next');
      assert.equal(await page.locator('.vocab-word').innerText(), family.english);
      await noOverflow(`${width}px 长词学习卡`);
      await page.locator('button[data-action="subject"][data-id="english"]').click();
      await prefer(longQuestion.id);
      await start('english2');
      assert.equal((await displayed()).id, longQuestion.id);
      await noOverflow(`${width}px grandfather / grandpa 选项`);
      await leave();
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await units();
    await noOverflow('电脑单元选择');
    assert.deepEqual(errors, [], '英语 UI 无浏览器脚本错误');
    assert(requests.every(request => request.method === 'GET' && new URL(request.url).origin === url), '只读取本地静态资源，不上传音频或调用 AI');
    passed.push('320px/390px长词学习卡与选项、电脑布局、无上传音频或 AI 网络请求');

    // A browser without speech support must keep all learning and exercises usable.
    const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await fallbackContext.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
    });
    const fallback = await fallbackContext.newPage();
    const fallbackErrors = [];
    fallback.on('pageerror', error => fallbackErrors.push(error.message));
    await fallback.goto(url);
    await fallback.locator('button[data-action="subject"][data-id="english"]').click();
    await fallback.locator('button[data-action="learn"][data-id="englishhello"]').click();
    assert((await fallback.locator('.speech-status').innerText()).trim(), '无朗读支持时提供文字提示');
    const speakButton = fallback.locator('button[data-action="speak"]');
    if (await speakButton.isEnabled()) await speakButton.click();
    assert.match(await fallback.locator('.speech-status').innerText(), /不支持|无法播放/, '无朗读支持时说明原因');
    await fallback.locator('button[data-action="study-next"]').click();
    assert.equal(await fallback.locator('.vocab-word').innerText(), hello[1].english);
    await fallback.locator('button[data-action="subject"][data-id="english"]').click();
    await fallback.locator('button[data-action="start"][data-id="englishhello"]').click();
    const fallbackPrompt = await fallback.locator('.question').innerText();
    const fallbackQuestion = bank('englishhello').find(question => question.prompt === fallbackPrompt);
    assert(fallbackQuestion);
    await fallback.locator('button[data-action="answer"]').filter({ hasText: regex(fallbackQuestion.answer) }).click();
    assert.equal((await fallback.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).attempts.length, 1, '无朗读支持仍可练习保存');
    assert.deepEqual(fallbackErrors, []);
    await fallbackContext.close();
    passed.push('无 speechSynthesis 时清晰降级提示，单词学习、分页、练习与保存均可用');

    await context.close();
    for (const description of passed) console.log(`通过：${description}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
