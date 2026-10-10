'use strict';

// Run with: node tests/backup.browser.test.js
// A real Chromium browser verifies downloaded files, persistent storage and UI actions.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { bank } = require('../data/questions.js');

const KEY = 'learning-garden-v1';
const root = path.resolve(__dirname, '..');
const baseTime = Date.UTC(2026, 8, 1, 9);
const empty = () => ({ attempts: [], sessions: [], wrong: [] });
const clone = value => JSON.parse(JSON.stringify(value));
const backup = data => ({
  format: 'learning-garden-backup',
  version: 1,
  exportedAt: new Date(baseTime + 100000).toISOString(),
  data: clone(data)
});
const attempt = (session, topic, question, correct, offset, review = false) => ({
  session, topic, question, correct, review, time: baseTime + offset
});

// These fixtures use the unchanged v1 storage format and real question IDs.
// A normal completed exercise contains five first attempts; unfinished exercises
// deliberately have no entry in sessions.
const original = {
  attempts: [
    ...Array.from({ length: 5 }, (_, i) => attempt('original-pinyin', 'pinyin', `pinyin-${i}`, i !== 0, i)),
    attempt('unfinished-math', 'arithmetic', 'arithmetic-2-1-+', false, 200)
  ],
  sessions: [{ id: 'original-pinyin', time: baseTime + 100, total: 5, correct: 4, review: false }],
  wrong: ['pinyin-0', 'arithmetic-2-1-+']
};
const independent = {
  attempts: Array.from({ length: 5 }, (_, i) => attempt('independent-words', 'words', `words-${i}`, i > 1, 1000 + i)),
  sessions: [{ id: 'independent-words', time: baseTime + 1100, total: 5, correct: 3, review: false }],
  wrong: ['words-0', 'words-1']
};

const anotherTab = {
  attempts: Array.from({ length: 5 }, (_, i) => attempt('another-tab-compare', 'compare', `compare-0-${i}-`, i !== 1, 2000 + i)),
  sessions: [{ id: 'another-tab-compare', time: baseTime + 2100, total: 5, correct: 4, review: false }],
  wrong: ['compare-0-1-']
};

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
      if (!file.startsWith(`${root}${path.sep}`)) {
        res.writeHead(403).end();
        return;
      }
      const body = await fs.readFile(file);
      const contentType = file.endsWith('.js') ? 'text/javascript; charset=utf-8'
        : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

(async () => {
  const server = await startServer();
  let browser;
  const passed = [];
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const click = action => page.locator(`button[data-action="${action}"]`).first().click();
    const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const setData = async data => {
      await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data });
      await page.reload();
      await click('records');
    };
    const file = (value, name = 'learning-garden-backup.json') => ({
      name, mimeType: 'application/json',
      buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
    });
    const choose = async payload => page.locator('#backup-file').setInputFiles(payload);
    const chooseBackup = async data => choose(file(backup(data)));
    const dialog = () => page.locator('dialog[open]');
    const waitForDialog = () => dialog().waitFor({ state: 'visible' });
    const confirmImport = async () => {
      await waitForDialog();
      await dialog().locator('[data-confirm]').click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.equal(await page.locator('#backup-file').inputValue(), '', '处理后应重置文件选择，允许再次选择同一文件');
    };
    const rejectFile = async (payload, description) => {
      const before = await stored();
      await choose(payload);
      await page.waitForFunction(() => {
        const alert = document.querySelector('[role="alert"]');
        return alert && alert.textContent.trim().length > 0;
      });
      assert.equal(await dialog().count(), 0, `${description}: 不应进入确认恢复`);
      assert.deepEqual(await stored(), before, `${description}: 不应修改已保存记录`);
    };
    const assertNoOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '手机页面不应横向溢出');

    await setData(original);
    assert((await page.locator('main').innerText()).includes('6'), '应读取既有六次首次作答记录');
    const [download] = await Promise.all([page.waitForEvent('download'), click('export')]);
    assert.match(download.suggestedFilename(), /\.json$/i);
    const downloadPath = await download.path();
    const exported = JSON.parse(await fs.readFile(downloadPath, 'utf8'));
    assert.equal(exported.format, 'learning-garden-backup');
    assert.equal(exported.version, 1);
    assert.equal(new Date(exported.exportedAt).toISOString(), exported.exportedAt);
    assert.deepEqual(exported.data, original, '导出应完整保留旧格式记录和错题');
    assert.deepEqual(await stored(), original);
    passed.push('旧版记录兼容、真实 JSON 下载及完整备份内容');

    // Use the actual import button once to verify that it opens a chooser.
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), click('import')]);
    await chooser.setFiles(file(exported));
    await waitForDialog();
    await dialog().locator('[data-cancel]').click();
    assert.deepEqual(await stored(), original, '取消恢复必须保持已有数据');
    assert.equal(await page.locator('#backup-file').inputValue(), '', '取消后也应允许重新选择同一文件');
    passed.push('导入文件选择按钮、导入前确认与取消');

    await click('clear');
    await dialog().locator('[data-confirm]').click();
    assert.deepEqual(await stored(), empty());
    await choose(file(exported));
    await confirmImport();
    assert.deepEqual(await stored(), original, '清空后可用真实导出备份恢复全部记录');
    await page.reload();
    await click('records');
    assert.deepEqual(await stored(), original, '恢复后刷新仍保留记录');
    passed.push('清空后恢复、未完成练习保留、刷新保存');

    await chooseBackup(original);
    await confirmImport();
    await chooseBackup(original);
    await confirmImport();
    assert.deepEqual(await stored(), original, '连续选同一个文件和重复导入不得重复统计');
    passed.push('连续选择同一文件、重复恢复幂等');

    await chooseBackup(independent);
    await confirmImport();
    const merged = await stored();
    assert.equal(merged.attempts.length, original.attempts.length + independent.attempts.length);
    assert.equal(merged.sessions.length, 2);
    for (const row of [...original.attempts, ...independent.attempts]) {
      const savedAttempt = merged.attempts.find(item => item.session === row.session && item.question === row.question);
      assert.deepEqual(savedAttempt, row, '合并应完整保留每道题的首次结果');
    }
    assert.deepEqual(new Set(merged.wrong), new Set([...original.wrong, ...independent.wrong]));
    passed.push('两份独立记录合并而且保留已有记录');

    // A backup taken after two questions shares the same session/question IDs
    // with its later completed version. Test both import directions.
    const halfway = {
      attempts: clone(original.attempts.slice(0, 2)),
      sessions: [],
      wrong: ['pinyin-0']
    };
    await setData(original);
    await chooseBackup(halfway);
    await confirmImport();
    assert.deepEqual(await stored(), original, '中途备份导入已完成状态不能重复作答或丢失总结');
    await setData(halfway);
    await chooseBackup(original);
    await confirmImport();
    assert.deepEqual(await stored(), original, '已完成备份导入中途状态应补齐题目与总结');
    await page.reload();
    await click('records');
    assert.deepEqual(await stored(), original, '补齐后的完成记录刷新后仍保留');
    passed.push('同次练习的中途和完成备份双向合并，保留总结且不重复统计');

    // Read storage again when the user confirms, since another tab can save
    // an exercise while the confirmation dialog is open. The stale-writer
    // variant deliberately omits current in-memory records from storage.
    const threeWayExpected = {
      attempts: [...clone(original.attempts), ...clone(independent.attempts), ...clone(anotherTab.attempts)],
      sessions: [...clone(original.sessions), ...clone(independent.sessions), ...clone(anotherTab.sessions)],
      wrong: [...original.wrong, ...independent.wrong, ...anotherTab.wrong]
    };
    const latestAdditive = {
      attempts: [...clone(original.attempts), ...clone(anotherTab.attempts)],
      sessions: [...clone(original.sessions), ...clone(anotherTab.sessions)],
      wrong: [...original.wrong, ...anotherTab.wrong]
    };
    for (const latest of [latestAdditive, anotherTab]) {
      await setData(original);
      await chooseBackup(independent);
      await waitForDialog();
      await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: latest });
      await confirmImport();
      assert.deepEqual(await stored(), threeWayExpected, '确认时必须保留原页面、最新存储和导入文件三方数据');
      const [threeWayDownload] = await Promise.all([page.waitForEvent('download'), click('export')]);
      const threeWayExport = JSON.parse(await fs.readFile(await threeWayDownload.path(), 'utf8'));
      assert.deepEqual(threeWayExport.data, threeWayExpected, '三方合并结果在当前页面也应立即生效');
    }
    passed.push('确认时重读其他标签页新增记录，三方合并且防止旧标签页写入丢失');

    await setData(original);
    await chooseBackup(independent);
    await waitForDialog();
    const changedIndependent = clone(independent);
    changedIndependent.attempts[0].correct = true;
    changedIndependent.sessions[0].correct = 4;
    changedIndependent.wrong = ['words-1'];
    const conflictingLatest = {
      attempts: [...clone(original.attempts), ...changedIndependent.attempts],
      sessions: [...clone(original.sessions), ...changedIndependent.sessions],
      wrong: [...original.wrong, ...changedIndependent.wrong]
    };
    await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: conflictingLatest });
    await confirmImport();
    await page.locator('[role="alert"]').last().waitFor({ state: 'visible' });
    assert((await page.locator('[role="alert"]').last().innerText()).includes('冲突'), '确认前出现冲突应明确提示');
    assert.deepEqual(await stored(), conflictingLatest, '确认前出现冲突必须保留另一标签页的最新数据');
    assert.deepEqual(await page.locator('.stats .stat strong').allTextContents(), ['1', '6', '2'], '失败时当前页面不应采用部分合并结果');
    await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: original });
    const [conflictDownload] = await Promise.all([page.waitForEvent('download'), click('export')]);
    const afterConcurrentConflict = JSON.parse(await fs.readFile(await conflictDownload.path(), 'utf8'));
    assert.deepEqual(afterConcurrentConflict.data, original, '确认前出现冲突后内存记录应保持原样');
    passed.push('确认前其他标签页出现冲突会完整拒绝，当前页面和最新存储均保持原样');

    await setData(original);
    const oldBackup = backup(original);
    await click('home');
    await click('review');
    await click('start-review');
    while (await page.locator('.question').count()) {
      const prompt = await page.locator('.question').innerText();
      const question = ['pinyin', 'arithmetic'].flatMap(bank).find(item => item.prompt === prompt);
      assert(question, `应找到真实复习题: ${prompt}`);
      await page.locator(`[data-answer="${question.answer}"]`).click();
      await click('next');
    }
    const afterReview = await stored();
    assert.deepEqual(afterReview.wrong, [], '首次答对复习后应移出错题');
    await click('home');
    await click('records');
    await choose(file(oldBackup));
    await confirmImport();
    assert.deepEqual(await stored(), afterReview, '导入较早备份不能让已掌握的错题复活');
    passed.push('真实错题重练、已掌握错题不会被旧备份重新加入');

    await setData(original);
    await chooseBackup(empty());
    await confirmImport();
    assert.deepEqual(await stored(), original, '空备份不能擦除现有数据');
    await setData(empty());
    const [emptyDownload] = await Promise.all([page.waitForEvent('download'), click('export')]);
    const emptyExport = JSON.parse(await fs.readFile(await emptyDownload.path(), 'utf8'));
    assert.deepEqual(emptyExport.data, empty());
    await choose(file(emptyExport));
    await confirmImport();
    assert.deepEqual(await stored(), empty());
    passed.push('空记录导出、空备份导入');

    const malformed = [
      ['错误 JSON', file('{broken-json')],
      ['错误格式标记', file({ ...backup(independent), format: 'unrelated-backup' })],
      ['不支持的版本', file({ ...backup(independent), version: 2 })],
      ['缺少记录结构', file({ ...backup(independent), data: { attempts: [], sessions: [] } })],
      ['错误布尔字段', file(backup({ ...independent, attempts: [{ ...independent.attempts[0], correct: 'false' }] }))],
      ['未知题目 ID', file(backup({ attempts: [attempt('bad-id', 'pinyin', 'pinyin-9999', false, 300)], sessions: [], wrong: ['pinyin-9999'] }))],
      ['伪造已完成练习统计', file(backup({ ...independent, sessions: [{ ...independent.sessions[0], correct: 5 }] }))],
      ['空文件', file('')]
    ];
    for (const [description, payload] of malformed) {
      await setData(original);
      await rejectFile(payload, description);
    }
    passed.push('错误 JSON、格式、版本、结构、题目 ID、统计和空文件拒绝');

    await setData(original);
    const conflict = clone(original);
    conflict.attempts[0].correct = true;
    conflict.sessions[0].correct = 5;
    conflict.wrong = ['arithmetic-2-1-+'];
    await rejectFile(file(backup(conflict)), '同次练习同题有冲突结果');
    await setData(original);
    // Trailing JSON whitespace is valid, so rejection must come from size.
    const oversized = JSON.stringify(backup(independent)) + ' '.repeat(5 * 1024 * 1024);
    await rejectFile(file(oversized), '超过 5 MiB 文件');
    passed.push('冲突记录和超大文件拒绝，现有数据保持不变');

    await setData(original);
    await chooseBackup(independent);
    await waitForDialog();
    await page.evaluate(key => {
      const realSetItem = Storage.prototype.setItem;
      window.restoreBackupTestStorage = () => { Storage.prototype.setItem = realSetItem; };
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException('Test quota failure', 'QuotaExceededError');
        return realSetItem.call(this, name, value);
      };
    }, KEY);
    await confirmImport();
    await page.locator('[role="alert"]').last().waitFor({ state: 'visible' });
    assert.deepEqual(await stored(), original, '导入写入失败必须保留持久化数据');
    await page.evaluate(() => window.restoreBackupTestStorage());
    // Export the in-memory state before reloading to detect an accidental state mutation.
    const [afterFailureDownload] = await Promise.all([page.waitForEvent('download'), click('export')]);
    const afterFailure = JSON.parse(await fs.readFile(await afterFailureDownload.path(), 'utf8'));
    assert.deepEqual(afterFailure.data, original, '导入写入失败必须保留当前页面内存状态');
    passed.push('localStorage 写入失败会提示且不改变持久化或内存状态');

    await setData(original);
    await assertNoOverflow();
    for (const action of ['export', 'import', 'clear']) {
      const button = page.locator(`button[data-action="${action}"]`);
      const bounds = await button.boundingBox();
      assert(bounds && bounds.height >= 44, `${action}: 手机按钮高度至少 44px`);
    }
    await chooseBackup(independent);
    await waitForDialog();
    await assertNoOverflow();
    const dialogBounds = await dialog().boundingBox();
    assert(dialogBounds.x >= 0 && dialogBounds.x + dialogBounds.width <= 390, '手机恢复确认框应在屏幕以内');
    await dialog().locator('[data-cancel]').click();
    await page.screenshot({ path: '/tmp/learning-garden-backup-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await assertNoOverflow();
    assert.deepEqual(errors, [], '浏览器不应出现未捕获 JavaScript 异常');
    passed.push('手机和电脑布局、触摸按钮尺寸、无浏览器脚本异常');

    for (const result of passed) console.log(`通过：${result}`);
    console.log(`学习记录备份浏览器测试全部通过（${passed.length} 组场景）。`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
