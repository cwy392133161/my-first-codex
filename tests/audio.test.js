'use strict';

// node tests/audio.test.js
// node tests/audio.test.js --decode  (also needs FFmpeg; decodes every MP3)
// Enumerate real reading sources independently of the audio build helper.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const english = require('../data/english.js');
const hello = require('../data/english-hello.js');
const unit1 = require('../data/english-unit1.js');
const unit2 = require('../data/english-unit2.js');
const questions = require('../data/questions.js');
const manifest = require('../data/audio-manifest.js');
const audio = require('../audio-player.js');

const repository = path.resolve(__dirname, '..');
const normalize = text => text.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ')
  .trim().replace(/[.!?]+$/, '').toLowerCase();
const plain = value => JSON.parse(JSON.stringify(value));
const staticSources = [];
const expectedKeys = new Set();
let sourceCount = 0;

function checkPlan(text, label, remember = false) {
  assert.equal(typeof text, 'string', `${label} 有英文朗读文本`);
  assert(text.trim(), `${label} 朗读文本非空`);
  const pieces = text.split(/(?<=[.!?])\s*/u).filter(piece => piece.trim());
  const expected = pieces.map(piece => {
    const key = normalize(piece);
    assert(key, `${label} 不包含空片段`);
    expectedKeys.add(key);
    assert(Object.hasOwn(manifest.clips, key), `${label} 缺少音频：${piece}`);
    return manifest.clips[key];
  });
  assert.deepEqual(audio.plan(text), expected, `${label} 的整个朗读按顺序映射到本地音频`);
  sourceCount++;
  if (remember) staticSources.push({ text, label });
}

assert.equal(manifest.version, 1);
assert.equal(manifest.voice.language, 'en-GB');
assert.equal(manifest.voice.name, 'bf_emma');
assert.equal(manifest.voice.kind, 'offline-generated');
assert(manifest.voice.source.includes('Kokoro'), '说明生成音频来源');
assert(manifest.clips && typeof manifest.clips === 'object');

// Word aliases include all optional extension words, not only the home defaults.
let wordCount = 0;
for (const unit of english.units) {
  for (const word of unit.words) {
    checkPlan(word.speech || word.english, `词条 ${unit.id}/${word.key}`, true);
    wordCount++;
  }
}
assert.equal(wordCount, 158, '158 个已发布词条含拓展词的发音均已覆盖');
for (const character of hello.characters) checkPlan(character.name, `朋友名字 ${character.name}`, true);
assert.equal(hello.characters.length, 8);

// Do not read distractors, Chinese explanations or hidden correct answers early.
for (const topic of questions.topics) {
  for (const question of questions.bank(topic.id)) {
    if (question.speech) checkPlan(question.speech, `题目 ${question.id}`, true);
    if (question.answerSpeech) checkPlan(question.answerSpeech, `答后示范 ${question.id}`, true);
    if (question.passage?.length) checkPlan(question.passage.join(' '), `故事全文 ${question.id}`, true);
  }
}
for (const api of [hello, unit1, unit2]) {
  const topics = api.reviewTopic ? [...api.topics, api.reviewTopic] : api.topics;
  for (const topic of topics) {
    for (const card of api.lesson(topic.id)) {
      checkPlan(card.sayModel, `开口示范 ${card.id}`, true);
      // Phonics buttons use whole-word sayModel rather than reading IPA/letters.
      if (!['unit1-phonics', 'unit2-phonics'].includes(topic.id)) {
        checkPlan(card.lines.map(line => line.english).join(' '), `学习卡英文 ${card.id}`, true);
      }
    }
  }
}
const staticCount = sourceCount;

// The four editable scenes have fixed positions; item/count and rule are free.
// Check every complete poster, not just the initial picture or a set of words.
const positions = [['on', 'desk'], ['in', 'bag'], ['under', 'chair'], ['next to', 'pencil case']];
const sceneChoices = positions.map(([relation, anchor], index) => {
  return unit1.poster.objects.flatMap(object => [1, 2, 3].map(count => {
    const sentence = `The ${count === 1 ? object.english : object.plural} ${count === 1 ? 'is' : 'are'} ${relation} the ${anchor}.`;
    checkPlan(sentence, `海报第 ${index + 1} 格 ${object.key}/${count}`);
    return sentence;
  }));
});
const sceneLines = [];
let posterCount = 0;
function posters(index) {
  if (index < sceneChoices.length) {
    for (const sentence of sceneChoices[index]) {
      sceneLines[index] = sentence;
      posters(index + 1);
    }
    return;
  }
  for (const rule of unit1.poster.rules) {
    checkPlan(`This is our classroom poster. ${sceneLines.join(' ')} Our classroom rule: ${rule.english}`, `完整海报 ${posterCount + 1}`);
    posterCount++;
  }
}
posters(0);
assert.equal(posterCount, (unit1.poster.objects.length * 3) ** 4 * unit1.poster.rules.length);

// Exhaust the booklet's selectable names, ages, features, two roles and object.
const booklet = unit2.booklet;
const numbers = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
let bookletCount = 0;
for (const person of booklet.names) for (const age of booklet.ages) {
  for (const hair of booklet.hairColours) for (const eyes of booklet.eyeColours) {
    for (const first of booklet.family) for (const second of booklet.family) {
      for (const favourite of booklet.favourites) {
        const introduction = `All about me. I'm ${person.name}. I'm ${numbers[age - 1]}. My hair and eyes. I've got ${hair.english} hair. I've got ${eyes.english} eyes. My family. ${first.pronoun === 'he' ? "He's" : "She's"} my ${first.english}. ${second.pronoun === 'he' ? "He's" : "She's"} my ${second.english}. My favourite. This is my ${favourite.english}.`;
        checkPlan(introduction, `完整小手册 ${bookletCount + 1}`);
        bookletCount++;
      }
    }
  }
}
assert.equal(bookletCount, booklet.names.length * booklet.ages.length * booklet.hairColours.length
  * booklet.eyeColours.length * booklet.family.length ** 2 * booklet.favourites.length);

// Verify the physical delivery, not just the promise of a manifest entry.
const entries = Object.entries(manifest.clips);
assert(entries.length >= 425, '覆盖本版本全部英语音频片段');
assert.deepEqual(new Set(entries.map(([key]) => key)), expectedKeys, '所有音频都有实际教学朗读来源');
const files = new Set();
let totalBytes = 0;
for (const [key, filename] of entries) {
  assert.equal(key, normalize(key), `映射键已规范化：${key}`);
  assert.match(filename, /^assets\/audio\/[a-f0-9]{20}\.mp3$/, '只播放压缩包内相对路径，无外部地址或目录逃逸');
  const expected = crypto.createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 20);
  assert.equal(filename, `assets/audio/${expected}.mp3`, '文件名对应本段实际英文内容');
  assert(!files.has(filename), '不同音频片段没有文件名冲突');
  files.add(filename);
  const location = path.join(repository, filename);
  const stat = fs.statSync(location);
  assert(stat.isFile() && stat.size > 200, `${filename} 是完整的非空文件`);
  const beginning = fs.readFileSync(location).subarray(0, 3);
  assert(beginning.toString('ascii') === 'ID3' || (beginning[0] === 0xff && (beginning[1] & 0xe0) === 0xe0), `${filename} 有 MP3 文件头`);
  totalBytes += stat.size;
}
const actualFiles = fs.readdirSync(path.join(repository, 'assets/audio'))
  .filter(filename => filename.endsWith('.mp3')).map(filename => 'assets/audio/' + filename);
assert.deepEqual(new Set(actualFiles), files, '全部交付的 MP3 均被清单引用，没有漏带或旧音频残留');
assert.deepEqual(audio.plan(''), []);
assert.deepEqual(audio.plan('This is deliberately unpackaged audio xyzzy.'), [], '未准备的文本不会虚报有语音');
assert.deepEqual(audio.plan('wall. This is deliberately unpackaged audio xyzzy.'), [], '任一句缺音频时拒绝整个不完整朗读');

// Load the real HTML's classic scripts without require/fetch/server APIs.
const html = fs.readFileSync(path.join(repository, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"[^>]*>/g)];
const paths = scripts.map(match => match[2]);
for (const [index, match] of scripts.entries()) {
  assert(!/\btype\s*=\s*["']module["']/i.test(match[0]), `${paths[index]} 是双击 HTML 可加载的经典脚本`);
  assert(!/^(?:[a-z]+:|\/)/i.test(paths[index]), '必需脚本都采用相对本地路径');
  assert(fs.statSync(path.join(repository, paths[index])).isFile(), `${paths[index]} 随项目交付`);
}
for (const required of ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js', 'data/questions.js', 'record-backup.js', 'data/audio-manifest.js', 'audio-player.js', 'app.js']) {
  assert.equal(paths.filter(filename => filename === required).length, 1, `${required} 加载一次`);
}
assert(paths.indexOf('data/audio-manifest.js') < paths.indexOf('audio-player.js'));
assert(paths.indexOf('audio-player.js') < paths.indexOf('app.js'));
for (const prerequisite of ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js']) {
  assert(paths.indexOf(prerequisite) < paths.indexOf('data/questions.js'), '题库依赖先加载');
}
const sandbox = { Audio: function Audio() {}, setTimeout, clearTimeout };
sandbox.window = sandbox;
const context = vm.createContext(sandbox);
for (const filename of paths.filter(filename => filename !== 'app.js')) {
  new vm.Script(fs.readFileSync(path.join(repository, filename), 'utf8'), { filename }).runInContext(context, { timeout: 1000 });
}
assert.equal(typeof sandbox.GardenAudio.plan, 'function');
assert.equal(sandbox.speechSynthesis, undefined);
assert.equal(sandbox.GardenAudio.has('wall'), true, '没有系统语音 API 时仍可播放准备好的音频');
for (const { text, label } of staticSources) {
  assert.deepEqual(plain(sandbox.GardenAudio.plan(text)), audio.plan(text), `${label} 经典脚本与 Node 中的音频映射一致`);
}
for (const notice of ['NOTICE.md', 'LICENSE-Kokoro', 'LICENSE-kokoro-onnx']) {
  assert(fs.statSync(path.join(repository, 'assets/audio', notice)).size > 100, '音频归属与许可证随项目交付');
}

console.log(`音频静态检查通过：${entries.length} 段，${staticCount} 个固定朗读入口，${posterCount} 种海报、${bookletCount} 种小手册，${(totalBytes / 1024 / 1024).toFixed(2)} MiB。`);

async function decodeEveryFile() {
  let next = 0;
  const durations = [];
  async function worker() {
    while (next < entries.length) {
      const [, filename] = entries[next++];
      const pcm = await new Promise((resolve, reject) => {
        execFile('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-xerror', '-i', path.join(repository, filename),
          '-map', '0:a:0', '-ar', '24000', '-ac', '1', '-f', 's16le', 'pipe:1'],
        { encoding: 'buffer', maxBuffer: 8 * 1024 * 1024, timeout: 20000 }, (error, output, stderr) => {
          if (error) { reject(new Error(`${filename} 无法完整解码：${error.message}`)); return; }
          if (stderr.length) { reject(new Error(`${filename} 解码报错：${stderr.toString('utf8')}`)); return; }
          resolve(output);
        });
      });
      const duration = pcm.length / (24000 * 2);
      assert(duration > 0.08 && duration < 90, `${filename} 实际音频时长合理：${duration}s`);
      assert.equal(pcm.length % 2, 0, '16 位 PCM 样本没有截断');
      let peak = 0;
      for (let offset = 0; offset < pcm.length; offset += 2) peak = Math.max(peak, Math.abs(pcm.readInt16LE(offset)));
      assert(peak > 64, `${filename} 包含实际声音，不是静音文件`);
      durations.push(duration);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  assert.equal(durations.length, entries.length, '每个音频都完成实际解码检查');
  console.log(`全部 ${durations.length} 段 MP3 解码、非静音和时长检查通过：${Math.min(...durations).toFixed(2)}～${Math.max(...durations).toFixed(2)} 秒。`);
}
if (process.argv.includes('--decode')) {
  decodeEveryFile().catch(error => { console.error(error); process.exitCode = 1; });
}
