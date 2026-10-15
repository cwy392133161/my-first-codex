'use strict';

// node tests/ios12.test.js
// ES2019 is the syntax ceiling used here; unsupported Safari APIs are checked
// separately. This is not a substitute for testing an iPhone running iOS 12.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = 'b635fe06715c9d2f4d775c33646a8ae4ca89b2de';
const read = file => fs.readFileSync(path.join(ROOT, file));
const old = file => execFileSync('git', ['show', `${BASELINE}:${file}`], { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 });
const plain = value => JSON.parse(JSON.stringify(value));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function parser() {
  try { return require('acorn'); }
  catch {
    // Node distributes Acorn for its own runtime. Use it only in this test,
    // without adding a dependency or generated bundle to the website.
    const source = process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'];
    assert(source, '运行此检查需要 Acorn（或包含内置 Acorn 的 Node 版本）');
    const scope = { module: { exports: {} } };
    scope.exports = scope.module.exports;
    vm.runInNewContext(source, scope);
    return scope.module.exports;
  }
}
const acorn = parser();
for (const code of ['value?.name', 'value ?? 0']) {
  assert.throws(() => acorn.parse(code, { ecmaVersion: 2019 }), 'parser 应拒绝新版语法');
}
acorn.parse('try { Array.from([1]).flatMap(x => [x]); } catch {}', { ecmaVersion: 2019 });

const htmlFiles = ['index.html', 'audio-review.html'];
if (fs.existsSync(path.join(ROOT, 'pronunciation-preview/index.html'))) {
  htmlFiles.push('pronunciation-preview/index.html', 'pronunciation-preview/audio-review.html');
}
const browserFiles = new Set();
for (const filename of htmlFiles) {
  if (!fs.existsSync(path.join(ROOT, filename))) continue;
  const html = read(filename).toString('utf8');
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)) {
    const source = match[1].split('?')[0];
    assert(!source.startsWith('/') && !/^\w+:/.test(source), `${filename} 使用相对脚本路径`);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(filename), source));
    assert(fs.existsSync(path.join(ROOT, resolved)), `${resolved} 脚本存在`);
    browserFiles.add(resolved);
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
    acorn.parse(match[2], { ecmaVersion: 2019, sourceType: 'script' });
  }
}
const unsupportedCalls = new Set(['replaceAll', 'fromEntries', 'hasOwn', 'matchAll', 'allSettled', 'any', 'at', 'replaceChildren', 'with', 'toSorted', 'toReversed', 'toSpliced']);
function walk(node, callback) {
  if (!node || typeof node !== 'object') return;
  if (node.type) callback(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, callback));
    else if (value && typeof value === 'object') walk(value, callback);
  }
}
for (const filename of browserFiles) {
  const source = read(filename).toString('utf8');
  let ast;
  try { ast = acorn.parse(source, { ecmaVersion: 2019, sourceType: 'script', locations: true }); }
  catch (error) { assert.fail(`${filename}: ${error.message}`); }
  if (filename.startsWith('pronunciation-preview/')) continue; // Historical preview: syntax only.
  walk(ast, node => {
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const property = node.callee.computed ? node.callee.property.value : node.callee.property.name;
      assert(!unsupportedCalls.has(property), `${filename}:${node.loc.start.line} 不调用 iOS 12 缺失 API ${property}`);
      if (property === 'text' && node.callee.object.type === 'Identifier') {
        assert(!/^(file|blob)$/i.test(node.callee.object.name), `${filename} 文件导入使用 FileReader`);
      }
    }
    if (node.type === 'Literal' && node.regex) {
      assert(!/\(\?<([=!])/.test(node.regex.pattern), `${filename} 不使用 Safari 12 缺失的正则后行断言`);
    }
  });
}

const index = read('index.html').toString('utf8');
function meta(name) {
  const match = [...index.matchAll(/<meta\b[^>]*>/gi)].find(row => new RegExp(`\\bname=["']${name}["']`, 'i').test(row[0]));
  assert(match, `存在 ${name}`);
  return /\bcontent=["']([^"']*)["']/i.exec(match[0])[1];
}
assert.equal(meta('apple-mobile-web-app-capable'), 'yes');
assert.equal(meta('apple-mobile-web-app-title'), '学习小乐园');
assert.equal(meta('apple-mobile-web-app-status-bar-style'), 'default', '默认状态栏不会覆盖页面内容');
assert.match(meta('viewport'), /width=device-width/);
assert.match(meta('viewport'), /initial-scale=1(?:[,;\s]|$)/);
assert(!/user-scalable\s*=\s*(?:no|0)/i.test(meta('viewport')), '保留孩子/家长缩放能力');
const iconTag = [...index.matchAll(/<link\b[^>]*>/gi)].find(row => /rel=["']apple-touch-icon["']/i.test(row[0]));
assert(iconTag, '提供 Apple Touch Icon');
const iconPath = /href=["']([^"']+)["']/i.exec(iconTag[0])[1].split('?')[0];
assert(!iconPath.startsWith('/') && !/^\w+:/.test(iconPath), '图标适配 GitHub Pages 子目录');
const icon = read(iconPath);
assert.equal(icon.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', '主屏幕图标是实际 PNG');
assert.equal(icon.toString('ascii', 12, 16), 'IHDR');
assert.equal(icon.readUInt32BE(16), 180);
assert.equal(icon.readUInt32BE(20), 180);
for (const file of ['style.css', 'app.js', 'speech-text.js', 'audio-player.js']) {
  const version = ['style.css','app.js'].includes(file) ? 'unit4-food-v1' : 'ios12-webapp-v1-20261014';
  assert(index.includes(`${file}?v=${version}`), `${file} 更新缓存版本`);
}

// New Unit 4 content is appended; existing learning content is immutable.
// A curriculum extension cannot silently change the old content,
// cloud recordings, question identities, or the persisted backup protocol.
const unchanged = ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js',
  'data/english-unit3.js', 'data/audio-manifest.js', 'data/audio-audit.json', 'record-backup.js'];
for (const file of unchanged) assert.deepEqual(read(file), old(file), `${file} 与当前音频交付基线完全一致`);
const cache = new Map();
function baselineModule(file) {
  if (cache.has(file)) return cache.get(file);
  const sandbox = { module: { exports: {} }, require(name) {
    return baselineModule(path.posix.normalize(path.posix.join(path.posix.dirname(file), name)));
  } };
  vm.runInNewContext(old(file).toString('utf8'), sandbox, { filename: `baseline:${file}`, timeout: 1000 });
  cache.set(file, sandbox.module.exports);
  return sandbox.module.exports;
}
const beforeQuestions = baselineModule('data/questions.js');
const questions = require('../data/questions.js');
assert.deepEqual(questions.topics.slice(0,beforeQuestions.topics.length), plain(beforeQuestions.topics), '原有主题完整保留，新主题追加');
let count = 0;
const ids = new Set();
for (const topic of beforeQuestions.topics) {
  const bank = questions.bank(topic.id);
  assert.deepEqual(bank, plain(beforeQuestions.bank(topic.id)), `${topic.id} 完整题目及稳定题号保留`);
  count += bank.length;
  bank.forEach(question => { assert(!ids.has(question.id)); ids.add(question.id); });
}
assert.equal(count, 1742, '全部题对象保留（包括动态数学组合，不称其为固定题数量）');
const manifest = require('../data/audio-manifest.js');
const audit = JSON.parse(read('data/audio-audit.json'));
assert.equal(Object.keys(manifest.clips).length, 501);
assert.equal(audit.clips.length, 501);
assert.equal(manifest.voice.name, 'en-US-JennyNeural');
for (const clip of audit.clips) {
  assert.equal(manifest.clips[clip.key], clip.path);
  assert.match(clip.path, /^assets\/audio\/[a-f0-9]{20}\.mp3$/);
  const bytes = read(clip.path);
  assert.equal(bytes.length, clip.bytes);
  assert.equal(sha256(bytes), clip.sha256, `${clip.key} MP3 完整校验`);
}
const audioFiles = fs.readdirSync(path.join(ROOT, 'assets/audio')).filter(file => file.endsWith('.mp3'));
assert.equal(audioFiles.length, 501, '保留全部现有 501 段发音，不混入其它录音');
assert.match(read('app.js').toString('utf8'), /['"]learning-garden-v1['"]/, '本地记录键不变');
console.log(`通过：${browserFiles.size} 个前端脚本的 ES2019 语法、主站旧 API 检查、Apple 全屏元数据/180px 图标/子目录路径、1742 个完整题对象、501 段 MP3 SHA256 与原备份协议保留。无法以这些自动化检查证明 iOS 12 实机兼容性。`);
