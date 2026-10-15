'use strict';

// Run with: node tests/unit4.test.js
// Objective language facts and published records are checked independently of UI rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const unit4 = require('../data/english-unit4.js');
const questions = require('../data/questions.js');
const backup = require('../record-backup.js');
const speech = require('../speech-text.js');
const root = path.resolve(__dirname, '..');
const BASELINE = '66dae811c0328fa40384bf8299a4c84b3039a7b6';
const goalIds = ['unit4-food', 'unit4-likes', 'unit4-requests', 'unit4-phonics', 'unit4-recipes', 'unit4-reading', 'unit4-strategies'];
const reviewId = 'review34-mixed';
const plain = value => JSON.parse(JSON.stringify(value));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const previousSource = file => execFileSync('git', ['show', `${BASELINE}:${file}`], { cwd: root });
function oldModule(file, dependencies = {}) {
  const sandbox = { module: { exports: {} }, require(name) {
    assert(Object.hasOwn(dependencies, name), `基线依赖存在：${name}`);
    return dependencies[name];
  } };
  new vm.Script(previousSource(file).toString(), { filename: `published-${file}` }).runInNewContext(sandbox, { timeout: 5000 });
  return sandbox.module.exports;
}
const originalModules = ['english.js', 'english-hello.js', 'english-unit1.js', 'english-unit2.js', 'english-unit3.js'];
const originalQuestions = oldModule('data/questions.js', Object.fromEntries(originalModules.map(file => [`./${file}`, oldModule(`data/${file}`)])));
const originalBackup = oldModule('record-backup.js', { './data/questions.js': originalQuestions });
const originalTopics = new Set(originalQuestions.topics.map(topic => topic.id));
assert.deepEqual(questions.topics.filter(topic => originalTopics.has(topic.id)), plain(originalQuestions.topics));
const ids = new Set();
for (const topic of originalQuestions.topics) {
  const before = plain(originalQuestions.bank(topic.id));
  assert.deepEqual(questions.bank(topic.id), before, `${topic.id} 全部旧题及题号完整保留`);
  for (const q of before) { assert(!ids.has(q.id)); ids.add(q.id); }
}
assert.equal(ids.size, 1742, '1742 个原有固定或数学动态组合题对象不变，未把运行次数算成题库数');
for (const file of [...originalModules.map(file => `data/${file}`), 'record-backup.js', 'data/audio-manifest.js', 'data/audio-audit.json']) {
  assert.deepEqual(fs.readFileSync(path.join(root, file)), previousSource(file), `${file} 已发布数据和协议逐字节不变`);
}
assert.match(read('app.js'), /['"]learning-garden-v1['"]/, '不重置已有浏览器记录键');
assert.deepEqual(unit4.topics.map(topic => topic.id), goalIds);
assert.equal(unit4.reviewTopic.id, reviewId);
assert.deepEqual(questions.topics.filter(topic => !originalTopics.has(topic.id)).map(topic => topic.id), [...goalIds, reviewId], '只追加 Unit 4 和独立 3～4 复习目标');

const equivalent = text => text.toLowerCase().replace(/[’‘]/g, "'")
  .replace(/\bi'm\b/g, 'i am').replace(/\bit's\b/g, 'it is').replace(/\bshe's\b/g, 'she is')
  .replace(/\bhe's\b/g, 'he is').replace(/\bthey're\b/g, 'they are')
  .replace(/\bdon't\b/g, 'do not').replace(/\bdoesn't\b/g, 'does not')
  .replace(/\bhasn't\b/g, 'has not').replace(/[.!?,]/g, '').replace(/\s+/g, ' ').trim();
const added = [], cards = [], cardIds = new Set(), signatures = new Set();
for (const topic of [...unit4.topics, unit4.reviewTopic]) {
  assert.equal(topic.subject, 'english');
  for (const key of ['name', 'description', 'goal', 'focus']) assert(topic[key]?.trim(), `${topic.id} 有 ${key}`);
  const bank = unit4.bank(topic.id), lesson = unit4.lesson(topic.id);
  assert(bank.length >= 10, '所有目标都能独立完成 5/10 题');
  assert.deepEqual(questions.bank(topic.id), bank);
  const mutable = unit4.bank(topic.id);
  mutable[0].choices[0] = '外部修改';
  assert.deepEqual(unit4.bank(topic.id), bank, '返回题目是独立副本');
  for (const q of bank) {
    assert.equal(q.topic, topic.id);
    assert(q.id.startsWith(topic.id + '-'));
    assert.match(q.id, /^[a-z0-9_-]+$/);
    assert(!ids.has(q.id), `所有新旧题号唯一：${q.id}`); ids.add(q.id);
    assert.equal(q.choices.length, 3);
    assert.equal(new Set(q.choices).size, 3);
    assert.equal(new Set(q.choices.map(equivalent)).size, 3, '同一道题不把缩写和等义展开作为不同答案');
    assert.equal(q.choices.filter(choice => choice === q.answer).length, 1);
    const signature = JSON.stringify([q.topic, q.prompt, q.kind || '', q.speech || '', q.passage || [], [...q.choices].sort(), q.answer]);
    assert(!signatures.has(signature), '不同题号不能重复存放完全相同的题目'); signatures.add(signature);
    for (const key of ['prompt', 'hint', 'explanation', 'answerSpeech']) assert(q[key]?.trim(), `${q.id} 有 ${key}`);
    if (q.kind === 'listening') {
      assert(q.speech?.trim() && q.fallbackPrompt?.includes(q.speech), '听辨有完整英文和缺音频的文字备用');
      assert(!q.prompt.toLowerCase().includes(q.speech.toLowerCase()), '听辨题干不泄漏录音全文');
    }
    if (q.passage) {
      assert(q.passage.length >= 1 && q.passage.every(line => typeof line === 'string' && line.trim()));
      if (['unit4-reading', 'unit4-recipes'].includes(q.topic)) assert(q.passage.length > 1, '完整食谱和阅读短文具有上下文');
      assert(q.glossary?.length > 0, '阅读新词有中文词典');
    }
    assert(!/\b(?:sheeps|chocolateses|breadses)\b|\b(?:I likes|he don't|she don't|They has)\b/i.test(q.answerSpeech), '反馈示范主谓一致');
  }
  assert(lesson.length > 0);
  const changed = unit4.lesson(topic.id);
  changed[0].lines[0].english = '外部修改';
  assert.deepEqual(unit4.lesson(topic.id), lesson, '返回学习卡是独立副本');
  for (const card of lesson) {
    assert(!cardIds.has(card.id)); cardIds.add(card.id);
    for (const key of ['id', 'title', 'sayPrompt', 'sayModel']) assert(card[key]?.trim());
    assert(card.lines.length > 0 && card.lines.every(line => line.english?.trim() && line.chinese?.trim()));
    assert(speech.lesson(card, topic.id === 'unit4-phonics').trim());
  }
  added.push(...bank); cards.push(...lesson);
}
assert.deepEqual(unit4.bank('not-a-goal'), []);
assert.deepEqual(unit4.lesson('not-a-goal'), []);

// The photo lists 19 focus food terms; synonyms in another unit do not add entries here.
const foodMeanings = { banana: '香蕉', bread: '面包', burger: '汉堡包', cake: '蛋糕', chicken: '鸡肉', chocolate: '巧克力', lemonade: '柠檬水', mango: '芒果', salad: '沙拉', water: '水', apple: '苹果', bean: '豆', fruit: '水果', grape: '葡萄', juice: '果汁', meat: '肉', meatball: '肉丸', orange: '橙子', sausage: '香肠' };
assert.equal(Object.keys(foodMeanings).length, 19);
const byId = id => { const q = added.find(q => q.id === id); assert(q, `学习重点有对应题：${id}`); return q; };
const countByTopic = { 'unit4-food': 57, 'unit4-likes': 24, 'unit4-requests': 22, 'unit4-phonics': 18, 'unit4-recipes': 18, 'unit4-reading': 16, 'unit4-strategies': 12, 'review34-mixed': 24 };
for (const [id, count] of Object.entries(countByTopic)) assert.equal(unit4.bank(id).length, count);
assert.equal(added.length, 191, '167 道 Unit 4 和 24 道独立复习题，不把学习卡、野餐组合或抽题次数计入固定题数');
assert.equal(cards.length, 54);
const foodBank = unit4.bank('unit4-food');
assert.equal(foodBank.length, 57, '19 词各有词义、选英文、听辨三个固定题号');
for (const [word, meaning] of Object.entries(foodMeanings)) {
  const meaningQ = foodBank.find(q => q.id === `unit4-food-meaning-${word}`);
  const wordQ = foodBank.find(q => q.id === `unit4-food-word-${word}`);
  const listeningQ = foodBank.find(q => q.id === `unit4-food-listen-${word}`);
  assert(meaningQ && wordQ && listeningQ, `核心词三种练习完整：${word}`);
  assert.equal(meaningQ.answer, meaning); assert.equal(wordQ.answer, word);
  assert.equal(listeningQ.speech, word); assert.equal(listeningQ.answer, meaning);
  if (wordQ.visual?.label) assert(!new RegExp(`\\b${word}\\b`, 'i').test(wordQ.visual.label), '看中文选英文时图示不泄漏英文');
}

const language = {
  'unit4-likes-self-yes': 'like', 'unit4-likes-self-no': "I don't like mangoes.",
  'unit4-likes-she-yes': 'likes', 'unit4-likes-he-yes': 'likes', 'unit4-likes-she-no': "doesn't",
  'unit4-likes-he-no-verb': 'like', 'unit4-likes-ask': 'Do you like grapes?', 'unit4-likes-ask-do': 'Do',
  'unit4-likes-yes-context': 'Yes, I do.', 'unit4-likes-no-context': "No, I don't.",
  'unit4-likes-apples-plural': 'apples', 'unit4-likes-bread-mass': 'bread', 'unit4-likes-mangoes-form': 'mangoes',
  'unit4-likes-negative-full': 'do not', 'unit4-likes-doesnt-full': 'does not', 'unit4-likes-they-yes': 'like',
  'unit4-requests-ask-water': 'Can I have some water, please?', 'unit4-requests-ask-bread': 'Can',
  'unit4-requests-please': 'please', 'unit4-requests-giver': 'Here you are.', 'unit4-requests-thanks': 'Thank you.',
  'unit4-requests-offer': 'Would you like some cake?', 'unit4-requests-offer-would': 'Would',
  'unit4-requests-accept': 'Yes, please.', 'unit4-requests-decline': 'No, thank you.',
  'unit4-requests-invitation-v-like': 'Yes, please.', 'unit4-requests-some-apples': 'apples',
  'unit4-requests-some-bread': 'bread', 'unit4-requests-some-chicken': 'chicken', 'unit4-requests-some-meatballs': 'meatballs',
  'unit4-requests-respect-no': '尊重朋友的选择',
  'review34-mixed-animal-duck': '鸭', 'review34-mixed-animal-sheep': 'sheep', 'review34-mixed-animal-donkey': 'donkey',
  'review34-mixed-describe-order': 'a little duck', 'review34-mixed-describe-is': 'is', 'review34-mixed-describe-are': 'are',
  'review34-mixed-hasgot-yes': 'Yes, it has.', 'review34-mixed-hasgot-no': "hasn't",
  'review34-mixed-resource-milk': 'milk', 'review34-mixed-resource-wool': 'sheep',
  'review34-mixed-food-chicken': '鸡肉', 'review34-mixed-food-orange': '一个橙子',
  'review34-mixed-like-self': 'like', 'review34-mixed-like-she': 'likes', 'review34-mixed-like-he-no': 'like',
  'review34-mixed-like-answer': "No, I don't.", 'review34-mixed-request-water': 'Can I have some water, please?',
  'review34-mixed-request-give': 'Thank you.', 'review34-mixed-invitation-yes': 'Yes, please.',
  'review34-mixed-invitation-no': 'No, thank you.', 'review34-mixed-phonics-ck': '2 个',
  'review34-mixed-phonics-a': '/eɪ/', 'review34-mixed-recipe-last': '分享水果沙拉',
  'review34-mixed-care-choice': '尊重朋友选择，也友善照顾动物'
};
for (const [id, answer] of Object.entries(language)) assert.equal(byId(id).answer, answer, `${id} 主谓、可数性、场景、应答角色与单复数正确`);
assert(byId('unit4-likes-yes-context').prompt.includes('明确喜欢'), '喜好短答依据虚构人物事实，不判断孩子真实喜好');
assert(byId('unit4-likes-no-context').prompt.includes('明确不喜欢'));
assert(byId('unit4-requests-accept').prompt.includes('愿意接受'));
assert(byId('unit4-requests-decline').prompt.includes('不想吃'));
assert(byId('unit4-food-meaning-chicken').explanation.includes('鸡肉') && byId('unit4-food-meaning-chicken').explanation.includes('不是活的鸡'));
assert(byId('unit4-food-meaning-orange').explanation.includes('不是在说橙色'));

// Complete-word phonics models must not pronounce IPA, [a] markup or an isolated letter name.
const phonicsCards = unit4.lesson('unit4-phonics');
for (const card of phonicsCards) {
  const text = speech.lesson(card, true);
  assert.equal(text, speech.text(card.sayModel));
  assert(!/[\[\]_→æə]|\/eɪ\/|^a[.!]?$/i.test(text), '示范只读完整例词');
}
const phonicsText = unit4.bank('unit4-phonics').map(q => `${q.prompt} ${q.explanation}`).join(' ');
for (const word of ['mango', 'salad', 'cat', 'bag', 'cake', 'lemonade', 'paper']) assert(phonicsText.includes(word), `覆盖图片自然拼读例词 ${word}`);
const saladNotes = [...phonicsCards.map(card => `${card.title} ${card.note || ''} ${card.lines.map(line => line.english).join(' ')}`), ...unit4.bank('unit4-phonics').filter(q => q.prompt.includes('salad')).map(q => `${q.prompt} ${q.explanation}`)].join(' ');
assert(/第一个 a|首个 a|第一个字母 a|第一个字母a|开头.*a|首.*a/.test(saladNotes), 'salad 明确只分析第一个 a，不能混淆后一个弱读 a');
for (const [word, sound] of Object.entries({ mango: '/æ/', salad: '/æ/', cat: '/æ/', bag: '/æ/', cake: '/eɪ/', lemonade: '/eɪ/', paper: '/eɪ/' })) {
  const q = byId(`unit4-phonics-sound-${word}`);
  assert.equal(q.answer, sound); assert.equal(q.answerSpeech, word, '反馈音频读完整例词，不读 IPA 或字母名');
}
assert.equal(byId('unit4-phonics-salad-first').answer, '第一个 a');
assert.equal(byId('unit4-phonics-not-always').answer, 'a 在不同单词中可能有不同声音');

const recipe = ['We have got apples, bananas and grapes.', 'First, wash your hands.', 'Next, put the prepared fruit in a bowl.', 'Then, add some juice and mix.', 'Last, share the fruit salad.'];
const recipeAnswers = { 'fruit-ingredients': '苹果、香蕉和葡萄', juice: '果汁', bowl: '碗里', first: '洗手', next: '把准备好的水果放进碗里', then: '加入果汁并拌一拌', last: '分享水果沙拉', mix: '拌一拌', prepared: '已经准备好的水果', 'ingredient-or-tool': 'grapes', 'not-listed': 'meatballs', order: '洗手 → 水果进碗 → 加果汁拌匀 → 分享' };
for (const [suffix, answer] of Object.entries(recipeAnswers)) {
  const q = byId(`unit4-recipes-${suffix}`); assert.equal(q.answer, answer); assert.deepEqual(q.passage, recipe, '步骤题完整展示同一份原创配方');
}
assert.equal(byId('unit4-recipes-order').answerSpeech, recipe.slice(1).join(' '));
assert(!/knife|cut|boil|heat|fry/i.test(recipe.join(' ')), '儿童虚拟配方使用准备好的食材，没有刀具或加热步骤');
assert.equal(byId('unit4-recipes-culture-place').answer, '意大利');
const readingFacts = {
  'picnic-basket-mia': ['Mia has got some bread and apples.', '面包和苹果'],
  'picnic-basket-ben': ['Ben has got some chicken and grapes.', 'Ben'],
  'picnic-basket-water': ['The water is in the basket.', '篮子里'],
  'picnic-basket-activity': ['Mia and Ben have a picnic.', '野餐'],
  'different-tastes-nora': ['Nora likes mangoes.', '芒果'],
  'different-tastes-eli-not': ['Eli does not like mangoes.', '芒果'],
  'different-tastes-he': ['He likes apples.', 'Eli'],
  'different-tastes-together': ['They listen to each other.', '听取彼此的想法'],
  'ask-for-water-request': ['Ava says, "Can I have some water, please?"', '水'],
  'ask-for-water-giver': ['Sam says, "Here you are."', 'Sam'],
  'ask-for-water-thanks': ['Ava says, "Thank you."', 'Thank you.'],
  'ask-for-water-place': ['The water is on the picnic table.', '野餐桌上'],
  'polite-choice-first': ['Lina says, "Would you like some cake?"', '蛋糕'],
  'polite-choice-decline': ['Owen says, "No, thank you."', '礼貌谢绝'],
  'polite-choice-accept': ['Owen says, "Yes, please."', '葡萄'],
  'polite-choice-who': ['Lina says, "Would you like some grapes?"', 'Lina']
};
for (const [suffix, [fact, answer]] of Object.entries(readingFacts)) { const q = byId(`unit4-reading-${suffix}`); assert(q.passage.includes(fact)); assert.equal(q.answer, answer, '阅读答案有明确原文事实'); }
assert.equal(new Set(unit4.bank('unit4-reading').map(q => q.passage.join(' '))).size, 4, '四篇原创短文，不能拿答题次数冒充篇数');
const strategies = { 'ask-food': '食物', 'ask-person': 'Ben', 'ask-place': 'in the basket', negative: '香蕉', 'check-prediction': '她做了一份水果沙拉', 'not-enough': '不能确定，要继续读', 'same-object': '桌子上', 'not-like-offer': '询问喜好', 'decline-clue': 'No, thank you.', 'ingredient-eliminate': 'chair', 'check-person': '回到 Mia 那一句找 mangoes', 'unknown-like': '不能，拥有不等于喜欢' };
for (const [suffix, answer] of Object.entries(strategies)) assert.equal(byId(`unit4-strategies-${suffix}`).answer, answer, '预测与排除题以原文事实和问题类型评分');
assert.deepEqual(byId('unit4-strategies-not-enough').passage, ['Ava has got a bowl and some fruit.']);
assert.deepEqual(byId('unit4-strategies-unknown-like').passage, ['Ben has got a banana.']);
assert(byId('unit4-strategies-check-prediction').passage.includes('She makes a fruit salad.'));

// The virtual picnic is finite, accepts a polite refusal and never requests personal data.
const foodNouns = { bread: 'bread', banana: 'bananas', apple: 'apples', grape: 'grapes', burger: 'burgers', cake: 'cake', chicken: 'chicken', salad: 'salad' };
assert.deepEqual(new Set(unit4.picnic.foods.map(item => item.key)), new Set(Object.keys(foodNouns)));
assert.deepEqual(new Set(unit4.picnic.drinks.map(item => item.key)), new Set(['water', 'juice', 'lemonade']));
const taskLines = new Set();
for (const [key, noun] of Object.entries(foodNouns)) {
  for (const reply of ['yes', 'no']) {
    for (const drink of ['water', 'juice', 'lemonade']) {
      const other = Object.keys(foodNouns).filter(candidate => candidate !== key).slice(0, 2);
      const selection = { foods: [{ key, reply }, ...other.map(key => ({ key, reply: 'yes' }))], drink };
      const before = JSON.stringify(selection), lines = unit4.picnicSentences(selection);
      assert(lines.includes(`We have got some ${noun}.`));
      const invitation = lines.indexOf(`Would you like some ${noun}?`);
      assert(invitation >= 0);
      assert.equal(lines[invitation + 1], reply === 'yes' ? 'Yes, please.' : 'No, thank you.');
      if (reply === 'yes') assert.equal(lines[invitation + 2], 'Here you are.');
      else assert.notEqual(lines[invitation + 2], 'Here you are.', '拒绝后尊重回答，不继续强塞食物');
      assert(lines.includes(`Can I have some ${drink}, please?`));
      assert.equal(JSON.stringify(selection), before, '生成任务语言不修改草稿');
      for (const line of lines) taskLines.add(line);
    }
  }
}
const valid = { foods: [{ key: 'bread', reply: 'yes' }, { key: 'apple', reply: 'no' }, { key: 'cake', reply: 'yes' }], drink: 'water' };
for (const invalid of [null, {}, { foods: [], drink: 'water' }, { ...valid, drink: 'tea' }, { ...valid, foods: [{ key: 'other', reply: 'yes' }] }, { ...valid, foods: [{ key: 'bread', reply: 'maybe' }] }, { ...valid, foods: [{ key: 'bread', reply: 'yes' }, { key: 'bread', reply: 'no' }] }]) {
  assert.deepEqual(unit4.picnicSentences(invalid), [], '无效或重复食物不能生成错误的任务语言');
}

// New classic scripts work from local files without fetch/module resolution.
const scripts = [...read('index.html').matchAll(/<script\b([^>]*)\bsrc=["']([^"']+)["'][^>]*>/g)].map(match => ({ attributes: match[1], file: match[2].split(/[?#]/)[0] }));
const dependencies = [...originalModules.map(file => `data/${file}`), 'data/english-unit4.js', 'data/questions.js', 'record-backup.js'];
assert.deepEqual(scripts.filter(script => dependencies.includes(script.file)).map(script => script.file), dependencies);
for (const script of scripts) {
  assert(!/^(?:[a-z]+:|\/)/i.test(script.file));
  assert(!/\btype\s*=\s*["']module["']/.test(script.attributes));
  assert(fs.statSync(path.join(root, script.file)).isFile());
}
const sandbox = {}, context = vm.createContext(sandbox);
for (const file of dependencies) new vm.Script(read(file), { filename: file }).runInContext(context, { timeout: 5000 });
assert.deepEqual(plain(sandbox.GardenUnit4.topics), unit4.topics);
for (const id of [...goalIds, reviewId]) assert.deepEqual(plain(sandbox.GardenQuestions.bank(id)), unit4.bank(id));

// Every new ID participates in the existing v1 export/merge/review protocol.
const oldQ = originalQuestions.bank('unit3-hasgot')[0];
const legacy = { attempts: [{ session: 'published', topic: oldQ.topic, question: oldQ.id, correct: false, review: false, time: 1000 }], sessions: [], wrong: [oldQ.id] };
assert.deepEqual(backup.parseBackup(JSON.stringify(originalBackup.createBackup(legacy))), legacy);
const incoming = { attempts: added.map((q, index) => ({ session: `new-${index}`, topic: q.topic, question: q.id, correct: false, review: false, time: 2000 + index })), sessions: [], wrong: added.map(q => q.id) };
assert.deepEqual(backup.parseBackup(JSON.stringify(backup.createBackup(incoming))), incoming);
const merged = backup.merge(legacy, incoming).data;
assert.deepEqual(merged.attempts[0], legacy.attempts[0]);
assert.deepEqual(backup.merge(merged, incoming).data, merged, '再次恢复不重复计算');
for (const topic of [...goalIds, reviewId]) {
  for (const total of [5, 10]) {
    const session = `complete-${topic}-${total}`, chosen = unit4.bank(topic).slice(0, total);
    const state = { attempts: chosen.map((q, index) => ({ session, topic, question: q.id, correct: index > 0, review: false, time: 5000 + index })), sessions: [{ id: session, time: 5010, total, correct: total - 1, review: false }], wrong: [chosen[0].id] };
    assert.deepEqual(backup.parseBackup(JSON.stringify(backup.createBackup(state))), state);
  }
  const q = unit4.bank(topic)[0];
  const review = { attempts: [{ session: `review-${topic}`, topic, question: q.id, correct: true, review: true, time: 6000 }], sessions: [], wrong: [] };
  const after = backup.merge(merged, review).data;
  assert(!after.wrong.includes(q.id)); assert(after.wrong.includes(oldQ.id));
  assert.equal(after.attempts.filter(attempt => attempt.question === q.id).length, 2);
}
console.log(`Unit 4 数据检查通过：${added.length} 道新增原创固定题、${cards.length} 张卡、${taskLines.size} 种野餐任务句；原 1742 个题对象、501 段录音和 v1 备份兼容性保留。`);
