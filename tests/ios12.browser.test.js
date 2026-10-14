'use strict';

// node tests/ios12.browser.test.js
// Chromium with missing Safari-12 APIs tests fallbacks and device-size layouts.
// The user-agent and standalone simulation do NOT emulate iOS WebKit or hide
// a real Safari address bar; an iOS 12.5.x device remains the final check.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const questions = require('../data/questions.js');
const backup = require('../record-backup.js');
const manifest = require('../data/audio-manifest.js');
const ROOT = path.resolve(__dirname, '..');
const PREFIX = '/my-first-codex/';
const KEY = 'learning-garden-v1';
const IOS12 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1';
const empty = () => ({ attempts: [], sessions: [], wrong: [] });
const original = {
  attempts: [{ session: 'before-ios12', topic: 'pinyin', question: 'pinyin-59', correct: false, review: false, time: 1 }],
  sessions: [], wrong: ['pinyin-59']
};
const incoming = {
  attempts: [{ session: 'incoming-ios12', topic: 'words', question: 'words-0', correct: false, review: false, time: Date.UTC(2026, 9, 14) }],
  sessions: [], wrong: ['words-0']
};
const anotherTab = {
  attempts: [{ session: 'other-ios12-tab', topic: 'pinyin', question: 'pinyin-0', correct: true, review: false, time: Date.UTC(2026, 9, 14) + 1 }],
  sessions: [], wrong: []
};

function safari12Capabilities() {
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  for (const prototype of [Blob.prototype, File.prototype]) Object.defineProperty(prototype, 'text', { configurable: true, value: undefined });
  if (window.HTMLDialogElement) {
    for (const name of ['showModal', 'show', 'close']) Object.defineProperty(HTMLDialogElement.prototype, name, { configurable: true, value: undefined });
  }
  for (const prototype of [Element.prototype, Document.prototype, DocumentFragment.prototype]) {
    Object.defineProperty(prototype, 'replaceChildren', { configurable: true, value: undefined });
  }
  document.execCommand = () => false; // Exercise manual selection when copying is denied.
  const setItem = Storage.prototype.setItem;
  window.iosRecordWrites = 0;
  Storage.prototype.setItem = function (key, value) {
    if (key === 'learning-garden-v1') window.iosRecordWrites++;
    return setItem.call(this, key, value);
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
  window.iosMedia = [];
  window.iosMediaCalls = [];
  let inGesture = false;
  document.addEventListener('click', event => {
    inGesture = event.isTrusted;
  }, true);
  // A microtask can run between event listeners, so reset at the document's
  // bubble phase after the app's delegated main click handler has finished.
  document.addEventListener('click', () => { inGesture = false; });
  const nativePlay = HTMLMediaElement.prototype.play;
  const observed = new WeakSet();
  HTMLMediaElement.prototype.play = function () {
    if (!observed.has(this)) {
      observed.add(this);
      const sample = { node: this, events: [], duration: 0, maxTime: 0 };
      window.iosMedia.push(sample);
      for (const name of ['loadedmetadata', 'playing', 'ended', 'error']) this.addEventListener(name, () => {
        sample.events.push(name);
        if (name === 'loadedmetadata') sample.duration = this.duration;
      });
      this.addEventListener('timeupdate', () => { sample.maxTime = Math.max(sample.maxTime, this.currentTime); });
    }
    window.iosMediaCalls.push({ src: this.src, inGesture });
    return nativePlay.call(this); // Keep real decoding, promises, and media events.
  };
}

async function startServer() {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    requests.push(pathname);
    if (!pathname.startsWith(PREFIX)) { response.writeHead(404).end(); return; }
    const name = pathname.slice(PREFIX.length) || 'index.html';
    const filename = path.resolve(ROOT, name);
    if (!filename.startsWith(ROOT + path.sep)) { response.writeHead(403).end(); return; }
    try {
      let bytes = await fs.readFile(filename);
      if (filename.endsWith('.css') && /iPhone OS 12_/.test(request.headers['user-agent'] || '')) {
        // Exercise the actual fallback declarations rather than letting modern
        // Chromium use clamp(), flex gap, or overflow-wrap:anywhere. Safari 12
        // supports grid-gap, which intentionally remains in this stylesheet.
        const legacy = bytes.toString('utf8')
          .replace(/font-size\s*:\s*clamp\([^;{}]*\)\s*;?/g, '')
          .replace(/(^|[;{])\s*gap\s*:[^;}]*;?/g, '$1')
          .replace(/overflow-wrap\s*:\s*anywhere\s*;?/g, '')
          .replace(/accent-color\s*:[^;}]*;?/g, '');
        bytes = Buffer.from(legacy);
      }
      const type = filename.endsWith('.mp3') ? 'audio/mpeg' : filename.endsWith('.png') ? 'image/png'
        : filename.endsWith('.js') ? 'text/javascript; charset=utf-8' : filename.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
      response.writeHead(200, { 'Content-Type': type, 'Content-Length': bytes.length }).end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, requests };
}

(async () => {
  const { server, requests } = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = origin + PREFIX;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    for (const viewport of [{ width: 414, height: 736 }, { width: 736, height: 414 }]) {
      const context = await browser.newContext({ viewport, userAgent: IOS12, acceptDownloads: true, isMobile: true, hasTouch: true });
      await context.addInitScript(safari12Capabilities);
      const page = await context.newPage();
      const errors = [];
      const failedResources = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) failedResources.push(response.url()); });
      await page.goto(url);
      const click = action => page.locator(`[data-action="${action}"]`).first().click();
      const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      const home = () => page.locator('#home-link').click();
      const noOverflow = async label => {
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${viewport.width}px ${label} 不应横向溢出`);
      };
      const currentQuestion = async () => {
        const id = await page.locator('.question').getAttribute('data-question-id');
        const topic = questions.topics.find(topic => id.startsWith(topic.id + '-'));
        const question = questions.bank(topic.id).find(question => question.id === id);
        assert(question, `实际题号可查询 ${id}`);
        return question;
      };
      const dialog = () => page.locator('.legacy-dialog[role="dialog"]');
      const cancel = async () => { await dialog().locator('[data-cancel]').click(); assert.equal(await dialog().count(), 0); };
      const confirm = async () => {
        const writes = await page.evaluate(() => window.iosRecordWrites);
        await dialog().locator('[data-confirm]').evaluate(button => { button.click(); button.click(); });
        await page.waitForFunction(() => !document.querySelector('.legacy-dialog'));
        assert.equal(await page.evaluate(() => window.iosRecordWrites), writes + 1, '连续点击确认只保存一次');
      };
      await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: original });
      await page.reload();
      assert.equal(await page.evaluate(() => navigator.standalone), true);
      assert.equal(await page.evaluate(async () => {
        const icon = document.querySelector('link[rel="apple-touch-icon"]');
        return (await fetch(icon.href)).status;
      }), 200, 'Apple 主屏幕图标也能从子目录读取');
      assert.deepEqual(await state(), original, '主屏幕模拟启动不重置旧学习记录');
      assert.equal(await page.locator('[data-action="subject"]').count(), 3);
      await noOverflow('首页');
      assert(await page.evaluate(() => innerWidth >= 414 && innerWidth <= 736), 'viewport 使用设备逻辑宽度');
      for (const button of await page.locator('main button').all()) {
        const bounds = await button.boundingBox();
        assert(bounds.height >= 44 && bounds.width >= 44, '主页按钮满足最低触控尺寸');
      }
      await click('records');
      assert((await page.locator('main').innerText()).includes('首次作答正确率'));
      await noOverflow('旧学习记录');
      await home(); await click('review');
      assert((await page.locator('main').innerText()).includes('1 道题'));
      await home();

      // Complete a five-question maths drill, a ten-question Chinese drill,
      // and an English drill. Check real question IDs rather than fixed RNG.
      for (const [subject, topic, total] of [['math', 'arithmetic', 5], ['chinese', 'pinyin', 10], ['english', 'hello-greetings', 5]]) {
        await home(); await page.locator(`[data-action="subject"][data-id="${subject}"]`).click();
        if (subject === 'english') await click('hello-goals');
        await page.locator(`[data-action="count"][data-count="${total}"]`).click();
        await page.locator(`[data-action="start"][data-id="${topic}"]`).click();
        const countBefore = (await state()).attempts.length;
        for (let index = 0; index < total; index++) {
          const question = await currentQuestion();
          await noOverflow(`${subject} 逐题作答`);
          if (subject === 'math' && index === 0) {
            const wrong = question.choices.find(choice => choice !== question.answer);
            await page.locator('[data-answer]').filter({ hasText: new RegExp(`^${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).evaluate(button => { button.click(); button.click(); });
            assert.equal((await state()).attempts.length, countBefore + 1, '重复点击只记一次首次结果');
            assert((await page.locator('#feedback').innerText()).includes(question.hint));
            await click('retry');
            await page.locator('[data-answer]').filter({ hasText: wrong }).click();
            assert((await page.locator('#feedback').innerText()).includes('答案是'));
            assert((await state()).wrong.includes(question.id));
          } else {
            await page.locator('[data-answer]').filter({ hasText: new RegExp(`^${question.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
          }
          await page.locator('[data-action="next"]').evaluate(button => { button.click(); button.click(); });
        }
        assert.equal((await state()).attempts.length, countBefore + total);
        assert.equal((await state()).sessions.at(-1).total, total);
        assert((await page.locator('main').innerText()).includes('这次练习完成啦'));
        await noOverflow(`${subject} 总结`);
      }
      await page.reload();
      const afterReload = await state();
      assert.equal(afterReload.attempts.length, 21);
      assert.equal(afterReload.sessions.length, 3);
      assert(afterReload.attempts.some(item => item.session === original.attempts[0].session));
      await click('review'); await click('start-review');
      for (let index = 0; index < afterReload.wrong.length; index++) {
        const question = await currentQuestion();
        await page.locator('[data-answer]').filter({ hasText: new RegExp(`^${question.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
        await click('next');
      }
      assert.deepEqual((await state()).wrong, []);
      await home(); await click('review');
      assert((await page.locator('main').innerText()).includes('还没有错题'));

      // A real click must start real Azure MP3 playback inside its gesture.
      await home(); await page.locator('[data-action="subject"][data-id="english"]').click(); await click('hello-goals');
      await page.locator('[data-action="goal-learn"][data-id="hello-greetings"]').click();
      await click('speak');
      await page.waitForFunction(() => window.iosMedia.some(sample => sample.events.includes('ended')), null, { timeout: 15000 });
      const media = await page.evaluate(() => ({ samples: iosMedia.map(sample => ({ events: sample.events, duration: sample.duration, maxTime: sample.maxTime })), calls: iosMediaCalls }));
      assert(media.calls[0].inGesture, '第一次 play() 同步处于用户点击手势内');
      assert.equal(media.calls[0].src, origin + PREFIX + manifest.clips.hello);
      assert(media.samples.some(sample => sample.events.includes('playing') && sample.events.includes('ended') && sample.duration > 0 && sample.maxTime > 0), '实际 MP3 解码并播放到结束');
      assert(media.samples.every(sample => !sample.events.includes('error')));
      assert((await page.locator('.speech-status').first().innerText()).includes('读完啦'));
      await noOverflow('Hello 学习卡');
      await home(); await page.locator('[data-action="subject"][data-id="english"]').click(); await click('unit3-goals');
      await page.locator('[data-action="goal-learn"][data-id="unit3-phonics"]').click();
      await noOverflow('Unit 3 拼写卡');
      await home(); await page.locator('[data-action="subject"][data-id="english"]').click(); await click('unit3-goals'); await click('farm'); await click('farm-show');
      await noOverflow('农场任务');
      await home(); await click('records');

      const saved = await state();
      await click('export');
      assert(await page.locator('details.backup-text-options').getAttribute('open') !== null, 'iOS 12 导出展示完整 JSON 文本');
      const text = await page.locator('#backup-text').inputValue();
      const exported = JSON.parse(text);
      assert.deepEqual(exported.data, saved);
      assert.equal(exported.version, 1);
      await click('copy-backup');
      const selection = await page.locator('#backup-text').evaluate(element => ({ start: element.selectionStart, end: element.selectionEnd, length: element.value.length }));
      assert.equal(selection.start, 0); assert.equal(selection.end, selection.length, '无法复制时保留完整选中以便手动复制');
      assert((await page.locator('#backup-status').innerText()).includes('复制'));
      assert.deepEqual(await state(), saved);
      await noOverflow('备份文字');

      const importFile = () => page.locator('#backup-file').setInputFiles({ name: 'old-records.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup.createBackup(incoming))) });
      await importFile(); await dialog().waitFor({ state: 'visible' });
      await noOverflow('导入确认窗口');
      assert.equal(await dialog().getAttribute('aria-modal'), 'true');
      assert.deepEqual(await state(), saved, '预览阶段尚未写学习记录');
      await cancel(); assert.deepEqual(await state(), saved, '取消 FileReader 导入保留原数据');
      await importFile(); await dialog().waitFor({ state: 'visible' });
      const secondTab = await context.newPage(); await secondTab.goto(url);
      const concurrentlySaved = backup.merge(saved, anotherTab).data;
      await secondTab.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: concurrentlySaved });
      await confirm();
      const merged = backup.merge(concurrentlySaved, incoming).data;
      assert.deepEqual(await state(), merged, '确认时保留另一个标签页新增记录');
      await secondTab.close();
      assert.equal(await page.locator('#backup-file').inputValue(), '', 'FileReader 导入后可重新选相同文件');

      await page.locator('details.backup-text-options').evaluate(element => { element.open = true; });
      await page.locator('#restore-text').fill('this is not JSON'); await click('restore-text');
      assert((await page.locator('#backup-status').innerText()).includes('失败'));
      assert.deepEqual(await state(), merged, '非法粘贴不会破坏记录');
      await page.locator('#restore-text').fill(text); await click('restore-text'); await dialog().waitFor({ state: 'visible' });
      await cancel(); assert.deepEqual(await state(), merged, '取消粘贴恢复保留记录');
      await page.locator('#restore-text').fill(text); await click('restore-text'); await dialog().waitFor({ state: 'visible' }); await confirm();
      assert.deepEqual(await state(), merged, '恢复旧备份不重置新记录或重复计数');
      await page.reload(); await click('records'); assert.deepEqual(await state(), merged);
      assert(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight), '长记录页可正常纵向滚动');
      await click('clear'); await dialog().waitFor({ state: 'visible' });
      const underneath = await page.locator('main').innerHTML();
      const writesBeforeBlockedNavigation = await page.evaluate(() => window.iosRecordWrites);
      await page.evaluate(() => {
        document.querySelector('#home-link').click();
        document.querySelector('main [data-action="home"]').click();
      });
      assert.equal(await dialog().count(), 1, '遮罩中点击顶栏或下层按钮不会绕过确认');
      assert.equal(await page.locator('main').innerHTML(), underneath, '确认未结束时不跳转底层页面');
      assert.equal(await page.evaluate(() => window.iosRecordWrites), writesBeforeBlockedNavigation);
      await cancel(); assert.deepEqual(await state(), merged);
      await click('clear'); await dialog().waitFor({ state: 'visible' }); await confirm(); assert.deepEqual(await state(), empty());
      await page.reload(); await click('records'); assert.deepEqual(await state(), empty());
      await noOverflow('空学习记录');
      assert.deepEqual(errors, []);
      assert.deepEqual(failedResources, []);
      await page.screenshot({ path: `/tmp/learning-garden-ios12-${viewport.width}x${viewport.height}.png`, fullPage: true });
      console.log(`通过：${viewport.width}×${viewport.height} iOS12 能力及 CSS 降级模拟，学习/错题/保存/FileReader/文字备份/确认及真实点击 MP3。`);
      await context.close();
    }
    // A larger, valid existing v1 state tests full text retention, selection,
    // duplicate-safe restore and storage preservation without 50,000-row work.
    const large = {
      attempts: Array.from({ length: 1000 }, (_, index) => ({
        session: `ios12-large-${index}`, topic: 'pinyin', question: `pinyin-${index % 60}`,
        correct: true, review: false, time: Date.UTC(2026, 9, 14) + index
      })), sessions: [], wrong: []
    };
    backup.createBackup(large);
    const largeContext = await browser.newContext({ viewport: { width: 414, height: 736 }, userAgent: IOS12, isMobile: true, hasTouch: true });
    await largeContext.addInitScript(safari12Capabilities);
    const largePage = await largeContext.newPage(); await largePage.goto(url);
    await largePage.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: large });
    await largePage.reload(); await largePage.locator('[data-action="records"]').click(); await largePage.locator('[data-action="export"]').click();
    const largeText = await largePage.locator('#backup-text').inputValue();
    assert(Buffer.byteLength(largeText) > 150000, '验证实际超过 150 KB 的完整 JSON 文字');
    assert.deepEqual(JSON.parse(largeText).data, large);
    await largePage.locator('[data-action="copy-backup"]').click();
    const largeSelection = await largePage.locator('#backup-text').evaluate(element => element.selectionEnd - element.selectionStart);
    assert.equal(largeSelection, largeText.length, '较大备份文字也完整选中，未截断');
    assert.deepEqual(await largePage.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY), large);
    assert(await largePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await largePage.locator('details.backup-text-options').evaluate(element => { element.open = true; });
    assert(await largePage.locator('#restore-text').isVisible());
    // Simulate a single large clipboard paste; small real fill() interactions
    // above already cover editing. Avoid the driver's large-text fill timeout.
    await largePage.locator('#restore-text').evaluate((element, text) => {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, largeText);
    await largePage.locator('[data-action="restore-text"]').click();
    await largePage.locator('.legacy-dialog').waitFor({ state: 'visible' });
    const largeWrites = await largePage.evaluate(() => window.iosRecordWrites);
    await largePage.locator('.legacy-dialog [data-confirm]').evaluate(button => { button.click(); button.click(); });
    await largePage.waitForFunction(() => !document.querySelector('.legacy-dialog'));
    assert.equal(await largePage.evaluate(() => window.iosRecordWrites), largeWrites + 1);
    assert.deepEqual(await largePage.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY), large, '恢复原1000条记录不会重置或重复计数');
    await largePage.reload(); assert.deepEqual(await largePage.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY), large);
    await largeContext.close();
    console.log(`通过：1000 条现有记录（${Buffer.byteLength(largeText)} 字节）的完整大文本导出、手动选择、重复确认恢复、去重和刷新保存。`);
    const modern = await browser.newContext({ acceptDownloads: true });
    const page = await modern.newPage(); await page.goto(url); await page.locator('[data-action="records"]').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-action="export"]').click()]);
    const parsed = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    assert.deepEqual(parsed.data, empty(), '现代浏览器继续使用真实 JSON 下载');
    await modern.close();
    assert(requests.some(name => name === PREFIX + 'audio-player.js'));
    assert(requests.some(name => name === PREFIX + manifest.clips.hello));
    // Chromium can independently probe /favicon.ico even without a site link;
    // that browser probe is not an app resource or the Apple Touch Icon.
    const appRequests = requests.filter(name => name !== '/favicon.ico');
    assert(appRequests.every(name => name.startsWith(PREFIX)), '所有页面与必需资源请求适配 GitHub Pages 子目录');
    console.log('通过：保留现代 JSON 文件下载。上述测试使用 Chromium；没有旧版 Safari/iOS 12 实机，也不能验证真实主屏幕浏览器栏隐藏。');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
