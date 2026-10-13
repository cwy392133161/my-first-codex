'use strict';

// node tests/audio.test.js
// node tests/audio.test.js --decode  (also needs FFmpeg; decodes every MP3)
// --allow-pending explicitly verifies delivered audio plus the pending registry.
// Without this flag, every current reading must have a real delivered MP3.
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
const unit3 = require('../data/english-unit3.js');
const questions = require('../data/questions.js');
const speechText = require('../speech-text.js');
const manifest = require('../data/audio-manifest.js');
const audio = require('../audio-player.js');
const audit = require('../data/audio-audit.json');
const collect = require('../scripts/audio-texts.js').collect;
const allowPending = process.argv.includes('--allow-pending');
const collected = collect({ includeUnit3: !allowPending });
const fullInputs = collect();
const pendingRegistry = allowPending ? require('../data/audio-pending.json') : null;
const pendingKeys = new Set(pendingRegistry?.clips.map(clip => clip.key) || []);

const repository = path.resolve(__dirname, '..');
const normalize = text => text.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ')
  .trim().replace(/[.!?]+$/, '').toLowerCase();
const plain = value => JSON.parse(JSON.stringify(value));
const staticSources = [];
const expectedKeys = new Set();
let sourceCount = 0;

function spokenPieces(text) {
  // Enumerate the actual bilingual data, including explicitly taught expansions.
  // A line is a reading boundary; punctuation-only pieces are not recordings.
  const shortForms = {
    "Who's = Who is": "Who's means who is.",
    "He's = He is": "He's means he is.",
    "She's = She is": "She's means she is."
  };
  let spoken = text.replace(/[\u2018\u2019]/g, "'");
  for (const [display, reading] of Object.entries(shortForms)) spoken = spoken.replaceAll(display, reading);
  return spoken.replace(/\s*\/\s*/g, ', ').split(/[.!?;]/)
    .map(piece => piece.trim()).filter(Boolean);
}

function lessonReading(card) {
  // Keep each distinct displayed word/sentence separate without merging vocab
  // into the following sentence, such as "bag This is my bag".
  return card.lines.map(line => /[.!?]$/.test(line.english.trim())
    ? line.english.trim() : line.english.trim() + '.').join(' ');
}

function checkPlan(text, label, remember = false) {
  assert.equal(typeof text, 'string', `${label} 有英文朗读文本`);
  assert(text.trim(), `${label} 朗读文本非空`);
  const pieces = spokenPieces(text);
  if (allowPending && pieces.some(piece => !Object.hasOwn(manifest.clips, normalize(piece)))) {
    for (const piece of pieces) {
      const key = normalize(piece);
      assert(Object.hasOwn(manifest.clips, key) || pendingKeys.has(key), `${label} 缺口必须在待生成清单中：${piece}`);
    }
    assert.deepEqual(audio.plan(text), [], `${label} 未录制完成时不虚报可播放`);
    sourceCount++;
    if (remember) staticSources.push({ text, label });
    return;
  }
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

assert.equal(manifest.version, 3);
assert.equal(manifest.voice.language, 'en-US');
assert.equal(manifest.voice.name, 'en-US-JennyNeural');
assert.equal(manifest.voice.kind, 'pre-generated');
assert.match(manifest.voice.profile, /^azure-jenny-v1-[a-f0-9]{12}$/, '新版音频配置包含实际生成配置指纹');
assert.equal(manifest.voice.source, 'Azure Speech', '说明生成音频来源');
assert.equal(manifest.voice.style, 'default');
assert.equal(manifest.voice.rate, 'normal');
assert.equal(manifest.voice.format, 'audio-24khz-96kbitrate-mono-mp3');
const configuration = {
  provider: 'Azure Speech', voice: 'en-US-JennyNeural', language: 'en-US',
  style: 'default', rate: 'normal', format: 'audio-24khz-96kbitrate-mono-mp3', pipeline: 1
};
assert.deepEqual(audit.configuration, configuration, '公开审核数据对应当前 Azure 默认风格和正常语速');
assert.equal(audit.region, 'eastus');
assert.equal(audit.version, 1);
function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  }
  return value;
}
const hashJSON = value => crypto.createHash('sha256').update(JSON.stringify(ordered(value)), 'utf8').digest('hex');
assert.equal(manifest.voice.profile, 'azure-jenny-v1-' + hashJSON(configuration).slice(0, 12));
// Independently reconstruct the actual SSML, including the taught word meanings.
// A canonical playback key alone cannot detect a changed punctuation or reading.
const readings = { close: 'kloʊz', read: 'riːd', reads: 'riːdz', minute: 'ˈmɪnɪt', minutes: 'ˈmɪnɪts' };
const escapeXML = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
function expectedSSML(text) {
  const spoken = text.split(/(\b(?:close|read|reads|minute|minutes)\b)/i).map(part => {
    const reading = readings[part.toLowerCase()];
    return reading ? `<phoneme alphabet="ipa" ph="${reading}">${escapeXML(part)}</phoneme>` : escapeXML(part);
  }).join('');
  return '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">'
    + '<voice name="en-US-JennyNeural">' + spoken + '</voice></speak>';
}
assert.equal(audit.clips.length, collected.clips.length,
  `全量录音尚未完成：当前需要 ${collected.clips.length} 段，已交付 ${audit.clips.length} 段；开发审查请显式使用 --allow-pending。`);
const currentInputs = new Map(collected.clips.map(clip => [clip.key, clip]));
const auditedClips = new Map();
for (const clip of audit.clips) {
  assert(!auditedClips.has(clip.key), '公开审核数据没有重复索引');
  const input = currentInputs.get(clip.key);
  assert(input, `${clip.key} 有当前题库来源`);
  assert.equal(clip.text, input.text, `${clip.key} 使用当前实际朗读文本及标点`);
  assert.deepEqual(clip.sources, input.sources, `${clip.key} 对应当前朗读入口`);
  assert.equal(normalize(clip.text), clip.key);
  const ssml = expectedSSML(clip.text);
  const digest = hashJSON({ ssml, format: configuration.format, pipeline: 1 });
  assert.equal(clip.digest, digest, `${clip.key} 的完整指纹包含真实 SSML、输出格式与规则版本`);
  assert.equal(clip.path, `assets/audio/${digest.slice(0, 20)}.mp3`);
  assert.equal(manifest.clips[clip.key], clip.path, `${clip.key} 清单与生成输入一致`);
  auditedClips.set(clip.key, clip);
}
const prepared = audit.clips.map(clip => ({
  key: clip.key, text: clip.text, ssml: expectedSSML(clip.text),
  digest: clip.digest, path: clip.path, sources: clip.sources
}));
assert.equal(audit.datasetSha256, hashJSON(prepared), '审核数据完整对应当前数据集和逐段 SSML');
assert(manifest.clips && typeof manifest.clips === 'object');
if (allowPending) {
  const completePrepared = fullInputs.clips.map(clip => {
    const ssml = expectedSSML(clip.text);
    const digest = hashJSON({ ssml, format: configuration.format, pipeline: 1 });
    return { key: clip.key, text: clip.text, ssml, digest,
      path: `assets/audio/${digest.slice(0, 20)}.mp3`, sources: clip.sources };
  });
  const missing = completePrepared.filter(clip => {
    const existing = auditedClips.get(clip.key);
    if (existing) assert.equal(existing.digest, clip.digest, `复用 ${clip.key} 的真实 SSML 不改变`);
    return !existing;
  }).map(({ssml, ...clip}) => clip);
  assert.equal(pendingRegistry.status, 'pending');
  assert.deepEqual(pendingRegistry.configuration, configuration);
  assert.equal(pendingRegistry.region, 'eastus');
  assert.equal(pendingRegistry.totalClips, fullInputs.clips.length);
  assert.equal(pendingRegistry.availableClips, audit.clips.length);
  assert.equal(pendingRegistry.pendingClips, missing.length);
  assert.equal(pendingRegistry.textSources, fullInputs.texts.length);
  assert.equal(pendingRegistry.datasetSha256, hashJSON(completePrepared));
  assert.deepEqual(pendingRegistry.clips, missing, '待生成清单精确对应全量当前文本，不允许遗漏或重复');
  assert.equal(pendingKeys.size, missing.length);
}

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
for (const api of [hello, unit1, unit2, unit3]) {
  const topics = api.reviewTopic ? [...api.topics, api.reviewTopic] : api.topics;
  for (const topic of topics) {
    for (const card of api.lesson(topic.id)) {
      checkPlan(card.sayModel, `开口示范 ${card.id}`, true);
      // Phonics buttons use whole-word sayModel rather than reading IPA/letters.
      if (!['unit1-phonics', 'unit2-phonics', 'unit3-phonics'].includes(topic.id)) {
        checkPlan(lessonReading(card), `学习卡英文 ${card.id}`, true);
      }
    }
  }
}
const staticCount = sourceCount;

// These independent examples protect the specific speaking boundaries that
// previously caused adjacent vocabulary and comparison marks to be read badly.
const bagCard = unit1.lesson('unit1-school').find(card => card.id.endsWith('-bag'));
assert.deepEqual(audio.plan(speechText.lesson(bagCard, false)),
  ['bag', 'this is my bag'].map(key => manifest.clips[key]), '校园词和示例句分别听读');
const feetCard = unit2.lesson('unit2-body').find(card => card.lines.some(line => line.english === 'feet'));
assert(feetCard, '一只脚和多只脚有可独立听读的词条');
const feetPlan = audio.plan(speechText.lesson(feetCard, false));
assert.equal(feetPlan[0], manifest.clips.foot);
assert.equal(feetPlan[1], manifest.clips.feet, 'foot 与 feet 不拼成一句含糊的文本');
const shortFormCard = unit2.lesson('unit2-who').find(card => card.id.endsWith('-short'));
assert.deepEqual(audio.plan(speechText.lesson(shortFormCard, false)),
  ["who's means who is", "he's means he is", "she's means she is"].map(key => manifest.clips[key]),
  '缩写对照用 means 示范，不将等号读入正文');
assert.deepEqual(audio.plan('Hello! Hi!'), [manifest.clips.hello, manifest.clips.hi], '问候词使用两个独立新版片段');

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

// The farm's finite lines cover every possible slot and complete introduction.
for (const animal of unit3.farm.animals) for (const count of unit3.farm.counts)
  for (const description of unit3.farm.descriptions) {
    const selection = { animals: [{key: animal.key, count, description: description.key}], care: 'kind' };
    checkPlan(unit3.farmSentences(selection).join(' '), `农场 ${animal.key}/${count}/${description.key}`);
  }
checkPlan(unit3.farmSentences({ animals: [
  {key:'sheep',count:2,description:'small'}, {key:'duck',count:1,description:'happy'},
  {key:'donkey',count:3,description:'big'}], care:'kind' }).join(' '), '三组动物完整农场');

// Verify the physical delivery, not just the promise of a manifest entry.
const entries = Object.entries(manifest.clips);
assert.equal(entries.length, expectedKeys.size, '题库、学习卡和全部作品实际需要的每个片段都已覆盖');
assert.deepEqual(new Set(entries.map(([key]) => key)), expectedKeys, '所有音频都有实际教学朗读来源');
const files = new Set();
let totalBytes = 0;
for (const [key, filename] of entries) {
  assert.equal(key, normalize(key), `映射键已规范化：${key}`);
  assert.match(filename, /^assets\/audio\/[a-f0-9]{20}\.mp3$/, '只播放压缩包内相对路径，无外部地址或目录逃逸');
  const expected = auditedClips.get(key).digest.slice(0, 20);
  assert.equal(filename, `assets/audio/${expected}.mp3`, '文件名对应本段真实 SSML 指纹');
  const previous = crypto.createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 20);
  assert.notEqual(expected, previous, '改正发音后更换地址，平板不会继续命中旧音频文件');
  assert(!files.has(filename), '不同音频片段没有文件名冲突');
  files.add(filename);
  const location = path.join(repository, filename);
  const stat = fs.statSync(location);
  assert(stat.isFile() && stat.size > 200, `${filename} 是完整的非空文件`);
  const body = fs.readFileSync(location);
  const metadata = auditedClips.get(key);
  assert.equal(metadata.bytes, stat.size, `${key} 文件大小与生成时的公开验证结果一致`);
  assert.match(metadata.sha256, /^[a-f0-9]{64}$/);
  assert.equal(crypto.createHash('sha256').update(body).digest('hex'), metadata.sha256,
    `${key} 实际 MP3 的 SHA-256 与生成时完整解码接受的文件一致`);
  assert(Number.isFinite(metadata.duration) && metadata.duration >= 0.08 && metadata.duration <= 600,
    `${key} 公开时长来自实际解码结果`);
  const beginning = body.subarray(0, 3);
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
const sources = scripts.map(match => match[2]);
const paths = sources.map(source => source.split(/[?#]/)[0]);
for (const [index, match] of scripts.entries()) {
  assert(!/\btype\s*=\s*["']module["']/i.test(match[0]), `${paths[index]} 是双击 HTML 可加载的经典脚本`);
  assert(!/^(?:[a-z]+:|\/)/i.test(paths[index]), '必需脚本都采用相对本地路径');
  assert(fs.statSync(path.join(repository, paths[index])).isFile(), `${paths[index]} 随项目交付`);
}
for (const required of ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js', 'data/english-unit3.js', 'data/questions.js', 'record-backup.js', 'speech-text.js', 'data/audio-manifest.js', 'audio-player.js', 'app.js']) {
  assert.equal(paths.filter(filename => filename === required).length, 1, `${required} 加载一次`);
}
for (const changed of ['speech-text.js', 'data/audio-manifest.js', 'audio-player.js']) {
  assert.equal(sources.find(source => source.split(/[?#]/)[0] === changed), changed + '?v=azure-jenny-v3-20261012',
    `${changed} 有缓存版本，避免平板沿用旧脚本`);
}
assert(sources.includes('app.js?v=unit3-farm-v1-20261013'), '新增课程脚本有自己的缓存版本');
assert(sources.includes('data/questions.js?v=unit3-farm-v1-20261013'), '题库新依赖和新编号不能继续命中旧版缓存');
assert(html.includes('style.css?v=unit3-farm-v1-20261013'), '新增课程样式有缓存版本');
assert(paths.indexOf('speech-text.js') < paths.indexOf('data/audio-manifest.js'));
assert(paths.indexOf('data/audio-manifest.js') < paths.indexOf('audio-player.js'));
assert(paths.indexOf('audio-player.js') < paths.indexOf('app.js'));
for (const prerequisite of ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js', 'data/english-unit3.js']) {
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
const notice = fs.readFileSync(path.join(repository, 'assets/audio/NOTICE.md'), 'utf8');
for (const required of ['Azure Speech', 'en-US-JennyNeural', '美式英语', '默认风格', '正常语速', '人工']) {
  assert(notice.includes(required), `来源说明包含 ${required}`);
}
assert(!notice.includes('发音修正版使用 Kokoro'), '当前来源说明不再把 Azure 成品归属到旧声线');
const reviewHTML = fs.readFileSync(path.join(repository, 'audio-review.html'), 'utf8');
for (const source of ['speech-text.js', 'data/audio-manifest.js', 'audio-player.js', 'audio-review.js']) {
  assert(reviewHTML.includes(`src="${source}?v=azure-jenny-v3-20261012"`), '试听页使用新版脚本缓存地址');
}

console.log(`音频静态检查通过：${entries.length} 段，${staticCount} 个固定朗读入口，${posterCount} 种海报、${bookletCount} 种小手册，${(totalBytes / 1024 / 1024).toFixed(2)} MiB。`);
if (allowPending) console.log(`审查分支模式：保留的 ${entries.length} 段成品已核验；另有 ${pendingKeys.size} 段待生成，不代表全量音频完成。`);

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
      const metadata = audit.clips.find(clip => clip.path === filename);
      assert(Math.abs(duration - metadata.duration) < 0.00011, `${filename} 完整解码时长与公开审核数据一致`);
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
