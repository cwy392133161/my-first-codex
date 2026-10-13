'use strict';

// Run with: node tests/unit3.test.js
// Independent checks for Unit 3 objectives, language/science facts and record compatibility.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const unit3 = require('../data/english-unit3.js');
const questions = require('../data/questions.js');
const backup = require('../record-backup.js');
const speech = require('../speech-text.js');

const repository = path.resolve(__dirname, '..');
const BASELINE = '637ada4';
const goalIds = ['unit3-animals', 'unit3-describe', 'unit3-hasgot', 'unit3-phonics', 'unit3-gifts', 'unit3-reading', 'unit3-spelling'];
const plain = value => JSON.parse(JSON.stringify(value));
const source = file => fs.readFileSync(path.join(repository, file), 'utf8');
function oldModule(file, dependencies = {}) {
  const sandbox = {
    module: { exports: {} },
    require(name) {
      assert(Object.hasOwn(dependencies, name), `发布基线依赖不存在：${name}`);
      return dependencies[name];
    }
  };
  const code = execFileSync('git', ['show', `${BASELINE}:${file}`], { cwd: repository, encoding: 'utf8' });
  new vm.Script(code, { filename: `baseline-${file}` }).runInNewContext(sandbox, { timeout: 1000 });
  return sandbox.module.exports;
}
const previousQuestions = oldModule('data/questions.js', Object.fromEntries([
  ['english', 'english.js'], ['hello', 'english-hello.js'], ['unit1', 'english-unit1.js'], ['unit2', 'english-unit2.js']
].map(([, file]) => [`./${file}`, oldModule(`data/${file}`)])));
const previousBackup = oldModule('record-backup.js', { './data/questions.js': previousQuestions });
const oldTopicIds = new Set(previousQuestions.topics.map(topic => topic.id));
assert.deepEqual(questions.topics.filter(topic => oldTopicIds.has(topic.id)), plain(previousQuestions.topics), '原有全部知识点完整 metadata 保留');
const allIds = new Set();
for (const topic of previousQuestions.topics) {
  const before = plain(previousQuestions.bank(topic.id));
  assert.deepEqual(questions.bank(topic.id), before, `${topic.id} 原有题号及完整题目保留`);
  for (const q of before) {
    assert(!allIds.has(q.id), `发布基线题号唯一：${q.id}`);
    allIds.add(q.id);
  }
}
assert.equal(allIds.size, 1602, '发布基线共 1602 个固定或动态组合题对象，不能改写旧数据');
for (const file of ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js', 'record-backup.js']) {
  const before = execFileSync('git', ['show', `${BASELINE}:${file}`], { cwd: repository });
  assert.deepEqual(fs.readFileSync(path.join(repository, file)), before, `${file} 原始文件完整保留`);
}
assert.match(source('app.js'), /['"]learning-garden-v1['"]/, '沿用原浏览器记录键');
assert.deepEqual(unit3.topics.map(topic => topic.id), goalIds, '七个学习目标可独立选择');
assert.deepEqual(questions.topics.filter(topic => !oldTopicIds.has(topic.id)).map(topic => topic.id), goalIds, '统一题库只新增 Unit 3 七个目标');

const equivalent = value => value.toLowerCase().replace(/[’‘]/g, "'")
  .replace(/\bit's\b/g, 'it is').replace(/\bhe's\b/g, 'he is').replace(/\bshe's\b/g, 'she is')
  .replace(/\bthey're\b/g, 'they are').replace(/\bhasn't\b/g, 'has not').replace(/\bisn't\b/g, 'is not')
  .replace(/\baren't\b/g, 'are not').replace(/[.!?,]/g, '').replace(/\s+/g, ' ').trim();
const newQuestions = [], cardIds = new Set();
for (const topic of unit3.topics) {
  assert.equal(topic.subject, 'english');
  for (const field of ['name', 'description', 'goal', 'focus']) assert(topic[field]?.trim(), `${topic.id} ${field} 非空`);
  const bank = unit3.bank(topic.id);
  assert(bank.length >= 10, `${topic.id} 支持 5 题和 10 题独立练习`);
  assert.deepEqual(questions.bank(topic.id), bank, '统一入口完整查询 Unit 3 题目');
  assert.deepEqual(unit3.bank(topic.id), bank, '多次查询不随机改写题库或题号');
  const modified = unit3.bank(topic.id);
  modified[0].choices[0] = '调用方修改';
  assert.deepEqual(unit3.bank(topic.id), bank, '外部调用不能污染题库');
  for (const q of bank) {
    assert.equal(q.topic, topic.id);
    assert(q.id.startsWith(`${topic.id}-`), '稳定题号包含完整知识点前缀');
    assert.match(q.id, /^[a-z0-9_-]+$/);
    assert(!allIds.has(q.id), `全部新旧题号唯一：${q.id}`);
    allIds.add(q.id);
    assert.equal(q.choices.length, 3, '每题三个大按钮选项');
    assert.equal(new Set(q.choices).size, 3, '三个选项不重复');
    assert.equal(new Set(q.choices.map(equivalent)).size, 3, '选项不能把缩写与等义完整写法当不同答案');
    assert.equal(q.choices.filter(option => option === q.answer).length, 1, '正确答案唯一且在选项中');
    for (const field of ['prompt', 'hint', 'explanation', 'answerSpeech']) assert(q[field]?.trim(), `${q.id} ${field} 非空`);
    if (q.kind === 'listening') {
      assert(q.speech?.trim() && q.fallbackPrompt?.trim(), '听辨具有英文朗读与文字备用');
      assert(q.fallbackPrompt.includes(q.speech), '备用文字包含实际英文题目');
      assert(!q.prompt.toLowerCase().includes(q.speech.toLowerCase()), '听辨题干不会提前显示英文内容');
      if (topic.id !== 'unit3-phonics') assert(!q.prompt.includes(q.answer), '听辨题干不暴露答案');
    }
    if (q.passage) {
      assert(Array.isArray(q.passage) && q.passage.length > 1);
      assert(q.passage.every(line => typeof line === 'string' && line.trim()));
    }
  }
  const cards = unit3.lesson(topic.id);
  assert(cards.length > 0, '每个目标都有先学后练卡');
  const changed = unit3.lesson(topic.id);
  changed[0].lines[0].english = '调用方修改';
  assert.deepEqual(unit3.lesson(topic.id), cards, '外部调用不能污染学习卡');
  for (const card of cards) {
    assert(!cardIds.has(card.id), `新学习卡 ID 唯一：${card.id}`);
    cardIds.add(card.id);
    for (const field of ['id', 'title', 'sayPrompt', 'sayModel']) assert(card[field]?.trim(), `${card.id} ${field} 非空`);
    assert(card.lines.length > 0);
    for (const line of card.lines) assert(line.english?.trim() && line.chinese?.trim(), '中英对照完整');
    assert(speech.lesson(card, topic.id === 'unit3-phonics').trim(), '学习卡有可规范化朗读文本');
  }
  newQuestions.push(...bank);
}
assert.deepEqual(unit3.bank('not-a-goal'), []);
assert.deepEqual(unit3.lesson('not-a-goal'), []);

// Photo focus is checked against independent language and science expectations.
const counts = { 'unit3-animals': 30, 'unit3-describe': 26, 'unit3-hasgot': 18, 'unit3-phonics': 18, 'unit3-gifts': 14, 'unit3-reading': 12, 'unit3-spelling': 22 };
for (const [topic, count] of Object.entries(counts)) assert.equal(unit3.bank(topic).length, count, '公开题量与实际独立固定题一致');
assert.equal(newQuestions.length, 140);
assert.equal(cardIds.size, 45);
const find = id => {
  const q = newQuestions.find(question => question.id === id);
  assert(q, `学习重点有对应题：${id}`);
  return q;
};
const animalMeanings = { cat: '猫', chicken: '鸡', cow: '奶牛', dog: '狗', donkey: '驴', duck: '鸭', goat: '山羊', horse: '马', sheep: '绵羊', spider: '蜘蛛' };
for (const [word, meaning] of Object.entries(animalMeanings)) {
  assert.equal(find(`unit3-animals-meaning-${word}`).answer, meaning);
  assert.equal(find(`unit3-animals-word-${word}`).answer, word);
  const heard = find(`unit3-animals-listen-${word}`);
  assert.equal(heard.answer, meaning); assert.equal(heard.speech, word);
  const pictured = find(`unit3-animals-word-${word}`);
  assert(!new RegExp(`\\b${word}\\b`, 'i').test(pictured.visual.label), '选英文的图示标签不提前给出英文答案');
  assert.equal(find(`unit3-spelling-count-${word}`).answer, `${word.length} 个`, '按实际英文字母数量校验');
  const completion = find(`unit3-spelling-complete-${word}`);
  const gap = completion.prompt.split('：').at(-1);
  assert.equal(gap.replace(/_+/, completion.answer), word, '补字后还原实际完整动物词');
  assert.equal(completion.answerSpeech, word, '拼写反馈读完整词而非字母名称');
}
const adjectiveMeanings = { angry: '生气的', beautiful: '美丽的', funny: '滑稽的', happy: '高兴的', little: '小的', sad: '伤心的', tired: '疲倦的', ugly: '丑陋的' };
for (const [word, meaning] of Object.entries(adjectiveMeanings)) assert.equal(find(`unit3-describe-meaning-${word}`).answer, meaning);
const language = {
  'unit3-describe-language-is-happy': 'is', 'unit3-describe-language-are-tired': 'are',
  'unit3-describe-language-singular-sad': 'It is sad.', 'unit3-describe-language-plural-happy': 'They are happy.',
  'unit3-describe-language-order-little': 'little', 'unit3-describe-language-order-funny': 'a funny toy dog',
  'unit3-describe-language-order-plural': 'They are little ducks.',
  'unit3-hasgot-language-complete-has': 'has', 'unit3-hasgot-language-negative': "It hasn't got a long tail.",
  'unit3-hasgot-language-ask': 'Has it got long ears?', 'unit3-hasgot-language-yes': 'Yes, it has.',
  'unit3-hasgot-language-no': "No, it hasn't.", 'unit3-hasgot-language-ask-order': 'Has',
  'unit3-hasgot-language-short-has': 'It has got', 'unit3-hasgot-language-short-not': 'has not',
  'unit3-hasgot-language-ears': 'ears', 'unit3-hasgot-language-feet': 'feet',
  'unit3-hasgot-language-tail': 'a', 'unit3-hasgot-language-has-versus-is': 'is',
  'unit3-spelling-plural-sheep': 'sheep', 'unit3-spelling-plural-chicken': 'chickens'
};
for (const [id, answer] of Object.entries(language)) assert.equal(find(id).answer, answer, `${id} 人称、单复数、词序或短答正确`);
assert(find('unit3-hasgot-language-yes').prompt.includes('有翅膀'), '肯定短答有明确文字事实');
assert(find('unit3-hasgot-language-no').prompt.includes('没有翅膀'), '否定短答有明确文字事实');
for (const q of newQuestions) {
  assert(!/\b(?:sheeps|foots)\b/i.test(q.answerSpeech), '正确示范不会朗读错误复数');
  assert(!/\bIt (?:have|are)\b|\bThey (?:has|is)\b/i.test(q.answerSpeech), '正确示范保持主谓一致');
}
const phonics = { cat: 'c', cow: 'c', donkey: 'k', chicken: 'ck', duck: 'ck' };
for (const [word, group] of Object.entries(phonics)) {
  assert.equal(find(`unit3-phonics-group-${word}`).answer, group);
  assert.equal(find(`unit3-phonics-complete-${word}`).answer, group);
  const q = find(`unit3-phonics-listen-${word}`);
  assert.equal(q.speech, word, '/k/ 例词播放完整词');
}
for (const card of unit3.lesson('unit3-phonics')) {
  const text = speech.lesson(card, true);
  assert.equal(text, speech.text(card.sayModel));
  assert(!/[\[\]_→]/.test(text), '示范音频不读视觉分块或空白记号');
  assert(!/^(?:c|k|ck)$/i.test(text), '示范不把字母名称当音素');
}
const phonicsNotes = unit3.lesson('unit3-phonics').map(card => card.note || '').join(' ');
assert(phonicsNotes.includes('不是所有 c'), '不把当前 /k/ 例词规则推广到所有 c');
assert(phonicsNotes.includes('中间') && phonicsNotes.includes('开头 ch'), '区分 donkey 词中 k 和 chicken 开头 ch/中间 ck');
const resources = { milk: ['cow', 'Cows give us milk.'], eggs: ['chicken', 'Chickens give us eggs.'], wool: ['sheep', 'Sheep give us wool.'], honey: ['bee', 'Bees give us honey.'] };
for (const [product, [, sentence]] of Object.entries(resources)) {
  assert.equal(find(`unit3-gifts-match-${product}`).answer, product);
  assert.equal(find(`unit3-gifts-match-${product}`).answerSpeech, sentence);
  assert.equal(find(`unit3-gifts-listen-${product}`).speech, sentence);
}
const readingFacts = {
  'chick-name': ['A baby chicken is a chick.', 'chick'],
  'chick-egg': ['A chick comes out of an egg.', '蛋里'],
  'chick-care': ['It needs care.', '照顾'],
  'duckling-name': ['A baby duck is a duckling.', 'duckling'],
  'duckling-egg': ['A duckling comes out of an egg.', '从蛋里孵出来'],
  'duckling-size': ['The duckling is little.', 'little'],
  'lamb-name': ['A baby sheep is a lamb.', 'lamb'],
  'lamb-born': ['A lamb is born from its mother.', '从妈妈身体里出生'],
  'lamb-different': ['It does not come out of an egg.', '羊宝宝不从蛋里孵出来'],
  'calf-and-baby-name': ['A baby cow is a calf.', 'calf'],
  'calf-and-baby-same': ['A human baby is born from a mother, too.', '都从妈妈身体里出生'],
  'calf-and-baby-care': ['Calves and babies need care.', '不同的宝宝都需要照顾']
};
for (const [suffix, [fact, answer]] of Object.entries(readingFacts)) {
  const q = find(`unit3-reading-${suffix}`);
  assert(q.passage.includes(fact), '答案有对应原文事实');
  assert.equal(q.answer, answer);
  assert(q.glossary.length > 0, '宝宝名称和新词有中文小词典');
}
assert.equal(new Set(unit3.bank('unit3-reading').map(q => q.passage.join(' '))).size, 4, '四篇原创短文，运行次数不是题量');
for (const card of unit3.lesson('unit3-spelling')) {
  const text = speech.lesson(card, false);
  assert(!/\b[a-z](?:,|\s*-\s*)\s*[a-z]\b|[_\[\]→]/i.test(text), '普通拼写卡也只朗读完整词，不读视觉拆块或逐字母提示');
}
assert(!find('unit3-spelling-plural-sheep').visual.label.includes('sheep'), '复数选择题的图片标签不泄露答案');

// Farm sentences use supplied choices, not the screen or a randomly generated expected value.
const plural = { cow: 'cows', sheep: 'sheep', chicken: 'chickens', duck: 'ducks', donkey: 'donkeys', goat: 'goats' };
assert.deepEqual(unit3.farm.counts, [1, 2, 3]);
assert.deepEqual(unit3.farm.descriptions.map(item => item.key), ['small', 'big', 'happy']);
assert.deepEqual(unit3.farm.animals.map(item => item.key), Object.keys(plural));
for (const [animal, pluralWord] of Object.entries(plural)) {
  for (const count of [1, 2, 3]) {
    for (const description of ['small', 'big', 'happy']) {
      const selection = { animals: [{ key: animal, count, description }], care: 'kind' };
      const before = JSON.stringify(selection), lines = unit3.farmSentences(selection);
      assert.equal(lines[0], `Our farm has got ${['', 'one', 'two', 'three'][count]} ${count === 1 ? animal : pluralWord}.`);
      assert.equal(lines[1], `${count === 1 ? 'It is' : 'They are'} ${description}.`);
      const wings = animal === 'chicken' || animal === 'duck';
      assert.equal(lines[2], count === 1 ? `It has got ${wings ? 'wings' : 'a tail'}.` : `They have got ${wings ? 'wings' : 'tails'}.`);
      const product = Object.values(resources).find(([provider]) => provider === animal);
      if (product) assert.equal(lines[3], product[1]);
      assert.equal(lines.at(-1), 'We are kind to animals.');
      assert.equal(JSON.stringify(selection), before, '制作农场不会修改调用方草稿');
    }
  }
}
for (const selection of [null, {}, { animals: [] }, { animals: [{ key: 'sheep', count: '2', description: 'small' }] }, { animals: [{ key: 'sheep', count: 0, description: 'small' }] }, { animals: [{ key: 'sheep', count: 4, description: 'small' }] }, { animals: [{ key: 'other', count: 1, description: 'small' }] }, { animals: [{ key: 'sheep', count: 1, description: '<script>' }] }]) assert.deepEqual(unit3.farmSentences(selection), [], '无效农场输入不能生成错误句子');
const extra = unit3.farmSentences({ animals: Array.from({ length: 4 }, () => ({ key: 'sheep', count: 1, description: 'small' })), care: 'kind' });
assert.equal(extra.filter(line => line.startsWith('Our farm')).length, 3, '农场限定三个位置');

// Data modules are classic local scripts: Windows double-click must not require module fetches.
const scripts = [...source('index.html').matchAll(/<script\b([^>]*)\bsrc=["']([^"']+)["'][^>]*>/g)]
  .map(match => ({ attributes: match[1], file: match[2].split(/[?#]/)[0] }));
const dependencies = ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js', 'data/english-unit3.js', 'data/questions.js', 'record-backup.js'];
assert.deepEqual(scripts.filter(script => dependencies.includes(script.file)).map(script => script.file), dependencies);
for (const script of scripts) {
  assert(!/^(?:[a-z]+:|\/)/i.test(script.file), '运行时脚本采用相对本地路径');
  assert(!/\btype\s*=\s*["']module["']/.test(script.attributes), '使用经典脚本兼容本地打开');
  assert(fs.statSync(path.join(repository, script.file)).isFile());
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(source(script.file)), '学习页面无外部 AI 或上传请求');
}
const sandbox = {}, context = vm.createContext(sandbox);
for (const file of dependencies) new vm.Script(source(file), { filename: file }).runInContext(context, { timeout: 5000 });
assert.deepEqual(plain(sandbox.GardenUnit3.topics), unit3.topics);
for (const id of goalIds) assert.deepEqual(plain(sandbox.GardenQuestions.bank(id)), unit3.bank(id));

// Existing backup files and mixed new records retain chronology and first-attempt results.
const legacyQuestions = ['pinyin', 'arithmetic', 'english3', 'hello-name-age', 'unit1-position', 'unit2-havegot', 'review02-mixed']
  .map(topic => previousQuestions.bank(topic)[0]);
const legacy = {
  attempts: legacyQuestions.map((q, i) => ({ session: `published-${i}`, topic: q.topic, question: q.id, correct: false, review: false, time: 1000 + i })),
  sessions: [], wrong: legacyQuestions.map(q => q.id)
};
const oldCopy = JSON.stringify(legacy);
assert.deepEqual(backup.parseBackup(JSON.stringify(previousBackup.createBackup(legacy))), legacy, '旧备份完整恢复');
const incoming = {
  attempts: newQuestions.map((q, i) => ({ session: `unit3-${i}`, topic: q.topic, question: q.id, correct: false, review: false, time: 2000 + i })),
  sessions: [], wrong: newQuestions.map(q => q.id)
};
const restored = backup.parseBackup(JSON.stringify(backup.createBackup(incoming)));
assert.deepEqual(restored, incoming, '全部新增题可导出恢复');
assert.deepEqual(plain(sandbox.GardenBackup.parseBackup(JSON.stringify(sandbox.GardenBackup.createBackup(incoming)))), incoming);
const merged = backup.merge(legacy, restored).data;
assert.deepEqual(merged.attempts.slice(0, legacy.attempts.length), legacy.attempts, '合并保留旧首次结果');
assert.deepEqual(new Set(merged.wrong), new Set([...legacy.wrong, ...incoming.wrong]));
assert.deepEqual(backup.merge(merged, incoming).data, merged, '重复导入不重复累计');
for (const topic of goalIds) {
  const bank = unit3.bank(topic);
  for (const total of [5, 10]) {
    const id = `complete-${topic}-${total}`;
    const session = {
      attempts: bank.slice(0, total).map((q, i) => ({ session: id, topic, question: q.id, correct: i > 0, review: false, time: 5000 + i })),
      sessions: [{ id, time: 5010, total, correct: total - 1, review: false }], wrong: [bank[0].id]
    };
    assert.deepEqual(backup.parseBackup(JSON.stringify(backup.createBackup(session))), session, `${topic} ${total} 题首次结果和总结可恢复`);
  }
  const q = bank[0];
  const review = { attempts: [{ session: `review-${topic}`, topic, question: q.id, correct: true, review: true, time: 6000 }], sessions: [], wrong: [] };
  const after = backup.merge(merged, review).data;
  assert(!after.wrong.includes(q.id), 'Unit 3 错题重练首次正确后移除');
  assert(legacy.wrong.every(id => after.wrong.includes(id)), '新题复习不删除旧错题');
  assert.equal(after.attempts.filter(a => a.question === q.id).length, 2, '首次错答与复习答对分开保存');
}
assert.equal(JSON.stringify(legacy), oldCopy, '输入数据完整保留');

console.log(`Unit 3 数据与兼容检查通过：七个独立目标，${newQuestions.length} 道原创固定题，${cardIds.size} 张学习卡；原 1602 个题对象、旧记录与备份格式完整保留。`);
