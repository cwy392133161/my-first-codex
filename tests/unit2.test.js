'use strict';

// Run with: node tests/unit2.test.js
// Check Unit 2 learning rules, original reading facts and published-data safety.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const unit2 = require('../data/english-unit2.js');
const english = require('../data/english.js');
const hello = require('../data/english-hello.js');
const unit1 = require('../data/english-unit1.js');
const questions = require('../data/questions.js');
const backup = require('../record-backup.js');

const repository = path.resolve(__dirname, '..');
const BASELINE = '854e4d2';
const plain = value => JSON.parse(JSON.stringify(value));
const read = file => fs.readFileSync(path.join(repository, file), 'utf8');
function baseline(file, dependencies = {}) {
  const sandbox = {
    module: { exports: {} },
    require(name) {
      assert(Object.hasOwn(dependencies, name), `未提供发布基线依赖 ${name}`);
      return dependencies[name];
    }
  };
  const source = execFileSync('git', ['show', `${BASELINE}:${file}`], { cwd: repository, encoding: 'utf8' });
  new vm.Script(source, { filename: `baseline-${file}` }).runInNewContext(sandbox, { timeout: 1000 });
  return sandbox.module.exports;
}
const oldEnglish = baseline('data/english.js');
const oldHello = baseline('data/english-hello.js');
const oldUnit1 = baseline('data/english-unit1.js');
const oldQuestions = baseline('data/questions.js', {
  './english.js': oldEnglish, './english-hello.js': oldHello, './english-unit1.js': oldUnit1
});
const oldBackup = baseline('record-backup.js', { './data/questions.js': oldQuestions });
const goals = ['unit2-family', 'unit2-body', 'unit2-who', 'unit2-havegot', 'unit2-phonics', 'unit2-senses', 'unit2-reading'];
const reviewId = 'review02-mixed';
const newIds = [...goals, reviewId];
const canonicalEnglish = value => value.toLowerCase().replace(/[’‘]/g, "'")
  .replace(/\bi've\b/g, 'i have').replace(/\bthey've\b/g, 'they have')
  .replace(/\bwe've\b/g, 'we have').replace(/\bhaven't\b/g, 'have not')
  .replace(/\bhe's\b/g, 'he is').replace(/\bshe's\b/g, 'she is')
  .replace(/\bit's\b/g, 'it is').replace(/\bthey're\b/g, 'they are')
  .replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();

assert.deepEqual(unit2.topics.map(topic => topic.id), goals, 'Unit 2 七个学习目标可独立选择');
assert.equal(unit2.reviewTopic.id, reviewId, 'Hello 至 Unit 2 复习使用独立知识点');
for (const topic of [...unit2.topics, unit2.reviewTopic]) {
  assert.equal(topic.subject, 'english');
  for (const field of ['name', 'description', 'goal', 'focus']) assert(topic[field]?.trim(), `${topic.id} ${field} 非空`);
}

// Published objects, not only counts or IDs, are protected by the release baseline.
assert.deepEqual(english.units, plain(oldEnglish.units), '已发布 158 个词条完整对象保持不变');
assert.equal(english.units.reduce((sum, unit) => sum + unit.words.length, 0), 158);
for (const [current, previous, label] of [[hello, oldHello, 'Hello'], [unit1, oldUnit1, 'Unit 1']]) {
  assert.deepEqual(current.topics, plain(previous.topics), `${label} 已发布目标 metadata 完整不变`);
  for (const topic of previous.topics) {
    assert.deepEqual(current.bank(topic.id), plain(previous.bank(topic.id)), `${topic.id} 全部原题完整不变`);
    assert.deepEqual(current.lesson(topic.id), plain(previous.lesson(topic.id)), `${topic.id} 全部学习卡完整不变`);
  }
}
assert.deepEqual(unit1.poster, plain(oldUnit1.poster), '已发布教室海报配置完整保持不变');
assert.equal(hello.topics.reduce((sum, topic) => sum + hello.bank(topic.id).length, 0), 94);
assert.equal(hello.topics.reduce((sum, topic) => sum + hello.lesson(topic.id).length, 0), 28);
assert.equal(unit1.topics.reduce((sum, topic) => sum + unit1.bank(topic.id).length, 0), 124);
assert.equal(unit1.topics.reduce((sum, topic) => sum + unit1.lesson(topic.id).length, 0), 43);
assert.deepEqual(questions.topics.filter(topic => !newIds.includes(topic.id)), plain(oldQuestions.topics), '全部旧知识点完整 metadata 保留');
const counts = { vocabulary: 0, hello: 0, unit1: 0, chinese: 0, math: 0 };
const ids = new Set();
for (const topic of oldQuestions.topics) {
  const published = plain(oldQuestions.bank(topic.id));
  assert.deepEqual(questions.bank(topic.id), published, `${topic.id} 已发布题目与 ID 不变`);
  for (const question of published) ids.add(question.id);
  const type = topic.subject === 'math' ? 'math' : topic.subject === 'chinese' ? 'chinese'
    : topic.id.startsWith('hello-') ? 'hello' : topic.id.startsWith('unit1-') ? 'unit1' : 'vocabulary';
  counts[type] += published.length;
}
assert.deepEqual(counts, { vocabulary: 316, hello: 94, unit1: 124, chinese: 120, math: 760 });

const all = [];
const cardIds = new Set();
for (const goal of newIds) {
  const bank = unit2.bank(goal);
  assert(bank.length >= (goal === reviewId ? 30 : 10), `${goal} 有足够独立练习题`);
  assert.deepEqual(unit2.bank(goal), bank, '内容及编号固定，不把运行次数计入题库');
  const edited = unit2.bank(goal);
  edited[0].choices[0] = '外部意外修改';
  assert.deepEqual(unit2.bank(goal), bank, '调用方修改不会污染题库');
  assert.deepEqual(questions.bank(goal), bank, '统一题库可查询新目标题及独立复习题');
  assert(questions.topics.some(topic => topic.id === goal), '统计及备份认识新知识点');
  for (const question of bank) {
    assert.equal(question.topic, goal);
    assert.match(question.id, /^[a-z0-9_-]+$/);
    assert(question.id.startsWith(`${question.topic}-`), '题号保留完整知识点前缀，错题解析能找到对应题库');
    assert(!ids.has(question.id), `完整新旧题库题号唯一：${question.id}`);
    ids.add(question.id);
    assert.equal(question.choices.length, 3, '每题三个选项');
    assert.equal(new Set(question.choices).size, 3, '选项没有重复');
    assert.equal(new Set(question.choices.map(canonicalEnglish)).size, 3, '不能把缩写与同义完整写法同时当不同答案');
    assert.equal(question.choices.filter(choice => choice === question.answer).length, 1, '正确答案在选项中且唯一');
    for (const field of ['prompt', 'hint', 'explanation', 'answerSpeech']) assert(question[field]?.trim(), `${question.id} ${field} 非空`);
    if (question.kind === 'listening') {
      assert(question.speech?.trim(), '听辨题有朗读文本');
      assert(question.fallbackPrompt?.trim(), '语音不可用时可改为读文字');
      assert(!question.prompt.toLowerCase().includes(question.speech.toLowerCase()), '听辨题干不显示全部朗读内容');
      assert(!question.prompt.includes(question.answer), '听辨题干不显示答案');
      assert(question.fallbackPrompt.includes(question.speech), '文字备用内容与原朗读一致');
    }
  }
  const cards = unit2.lesson(goal);
  assert(cards.length >= (goal === reviewId ? 4 : 1), `${goal} 有先学后练的学习卡`);
  const editedCards = unit2.lesson(goal);
  editedCards[0].lines[0].english = '外部意外修改';
  assert.deepEqual(unit2.lesson(goal), cards, '学习卡不被调用方污染');
  for (const card of cards) {
    for (const field of ['id', 'title', 'sayPrompt', 'sayModel']) assert(card[field]?.trim(), `${goal} 学习卡 ${field} 非空`);
    assert(!cardIds.has(card.id), `学习卡 ID 唯一：${card.id}`);
    cardIds.add(card.id);
    assert(Array.isArray(card.lines) && card.lines.length > 0, '学习卡有中英对照');
    for (const line of card.lines) assert(line.english?.trim() && line.chinese?.trim());
  }
  all.push(...bank);
}
assert.deepEqual(unit2.bank('not-a-goal'), []);
assert.deepEqual(unit2.lesson('not-a-goal'), []);

// The uploaded family and body vocabulary is checked independently of the bank.
const familyWords = {
  family: /家庭|家人/, 'father / dad': /爸爸|父亲/, 'mother / mum': /妈妈|母亲/,
  'grandfather / grandpa': /祖父|爷爷|外公/, 'grandmother / grandma': /祖母|奶奶|外婆/,
  brother: /哥哥|弟弟/, sister: /姐姐|妹妹/
};
const bodyWords = {
  arm: /手臂/, body: /躯干|身体/, ear: /耳/, eye: /眼/, face: /脸|面部/,
  foot: /脚/, feet: /脚/, hair: /头发/, hand: /手/, head: /头/,
  leg: /腿/, mouth: /嘴/, nose: /鼻/, tail: /尾巴/
};
function vocabularyLines(topic) { return unit2.lesson(topic).flatMap(card => card.lines); }
function exactWordLine(lines, word) {
  const normalized = value => value.toLowerCase().replace(/\s*\/\s*/g, '/');
  return lines.find(line => normalized(line.english) === normalized(word)
    || (word === 'feet' && /\bfoot\s*→\s*feet\b/.test(line.english)));
}
for (const [word, meaning] of Object.entries(familyWords)) {
  const line = exactWordLine(vocabularyLines('unit2-family'), word);
  assert(line, `照片家人重点词 ${word} 有专门中英学习内容`);
  assert.match(line.chinese, meaning, `${word} 中文含义正确`);
}
for (const [word, meaning] of Object.entries(bodyWords)) {
  const line = exactWordLine(vocabularyLines('unit2-body'), word);
  assert(line, `照片身体重点词 ${word} 有专门中英学习内容`);
  assert.match(line.chinese, meaning, `${word} 中文含义正确`);
}
assert(unit2.bank('unit2-body').some(question => question.answer === 'foot'), '脚的单数有练习');
assert(unit2.bank('unit2-body').some(question => question.answer === 'feet'), '脚的复数有练习');
for (const question of all) {
  assert(!/\b(?:a|an|two|three) hairs?\b/i.test(question.answerSpeech), '整头的头发使用不可数 hair');
  if (question.visual?.type === 'person') {
    const person = question.visual;
    assert(person.name?.trim() && person.label?.trim(), '人物图有名字与明确文字设定');
    assert(['he', 'she'].includes(person.pronoun));
    assert(['black', 'brown', 'blond'].includes(person.hair));
    assert(['blue', 'brown', 'green'].includes(person.eyes));
    assert(/男孩|女孩|男性|女性|\bhe\b|\bshe\b/.test(`${person.label} ${question.prompt}`), '代词按明确人物设定判断，不能从外观猜');
  }
  if (question.visual?.type === 'body') assert(Object.hasOwn(bodyWords, question.visual.part), '身体图只显示已学部位');
}

const familyEntries = [
  ['family', 'family', '家庭；家人', 'This is my family.'],
  ['father', 'father / dad', '爸爸', 'This is my dad.'],
  ['mother', 'mother / mum', '妈妈', 'This is my mum.'],
  ['grandfather', 'grandfather / grandpa', '爷爷或外公', 'This is my grandpa.'],
  ['grandmother', 'grandmother / grandma', '奶奶或外婆', 'This is my grandma.'],
  ['brother', 'brother', '哥哥或弟弟', 'This is my brother.'],
  ['sister', 'sister', '姐姐或妹妹', 'This is my sister.']
];
const familyBank = unit2.bank('unit2-family');
assert.equal(familyBank.length, 21, '照片 7 个家庭词各有词义、听辨与介绍理解练习');
for (const [key, word, chinese, sentence] of familyEntries) {
  assert.equal(familyBank.find(q => q.id === `unit2-family-word-${key}`).answer, word);
  const heard = familyBank.find(q => q.id === `unit2-family-listen-${key}`);
  assert.equal(heard.answer, chinese);
  assert.equal(heard.speech, word.replace(/ \/ /g, ', '), '同义家庭称呼用完整词朗读');
  const introduction = familyBank.find(q => q.id === `unit2-family-sentence-${key}`);
  assert(introduction.prompt.includes(sentence));
  assert.equal(introduction.answer, chinese, '介绍句中的家庭关系与中文答案一致');
}
const bodyMeanings = {
  arm: '手臂', body: '躯干', ear: '耳朵', eye: '眼睛', face: '脸；面部', foot: '一只脚',
  hair: '头发', hand: '手', head: '头', leg: '腿', mouth: '嘴', nose: '鼻子', tail: '尾巴'
};
const bodyBank = unit2.bank('unit2-body');
assert.equal(Object.keys(bodyMeanings).length, 13, 'foot 和 feet 是同一词条的两个形式，不重复计词');
assert.equal(bodyBank.length, 28);
for (const [word, chinese] of Object.entries(bodyMeanings)) {
  const pictured = bodyBank.find(q => q.id === `unit2-body-picture-${word}`);
  assert.equal(pictured.visual.type, 'body');
  assert.equal(pictured.visual.part, word);
  assert.equal(pictured.answer, word, '红色身体区域与英文答案一致');
  const heard = bodyBank.find(q => q.id === `unit2-body-listen-${word}`);
  assert.equal(heard.speech, word);
  assert.equal(heard.answer, chinese);
  assert(!heard.visual, '身体听辨不显示能暴露目标部位的图');
}
for (const [count, word] of [[1, 'foot'], [2, 'feet']]) {
  const question = bodyBank.find(q => q.id === `unit2-body-foot-count-${count}`);
  assert.equal(question.visual.part, word);
  assert.equal(question.answer, word, '单脚与双脚图正确对应 foot／feet');
  assert(question.prompt.includes(count === 1 ? '一只脚' : '两只脚'));
}

const people = [
  ['mum', 'Nina', 'she', 'mum', '妈妈'], ['dad', 'Sam', 'he', 'dad', '爸爸'],
  ['grandma', 'Rosa', 'she', 'grandma', '奶奶'], ['grandpa', 'Ben', 'he', 'grandpa', '爷爷'],
  ['brother', 'Leo', 'he', 'brother', '弟弟'], ['sister', 'Mia', 'she', 'sister', '姐姐']
];
const whoBank = unit2.bank('unit2-who');
assert.equal(whoBank.length, 20);
for (const [key, name, pronoun, role, chinese] of people) {
  const ask = `Who is ${pronoun}?`;
  const answer = `${pronoun === 'he' ? 'He' : 'She'}'s my ${role}.`;
  for (const direction of ['ask', 'answer']) {
    const question = whoBank.find(q => q.id === `unit2-who-${direction}-${key}`);
    assert.equal(question.visual.name, name);
    assert.equal(question.visual.pronoun, pronoun);
    assert(question.prompt.includes(`${name} 是我的${chinese}`), '关系由文字明确给出，不根据外貌猜');
    assert(question.prompt.includes(`用 ${pronoun} 指代`));
    assert.equal(question.answer, direction === 'ask' ? ask : answer);
    assert(question.answerSpeech.includes(direction === 'ask' ? ask : answer));
  }
  const heard = whoBank.find(q => q.id === `unit2-who-listen-${key}`);
  assert.equal(heard.speech, answer);
  const genericRelationship = { grandma: '奶奶或外婆', grandpa: '爷爷或外公', brother: '哥哥或弟弟', sister: '姐姐或妹妹' };
  assert.equal(heard.answer, genericRelationship[key] || chinese, '只听英文关系时保留哥哥／弟弟等全部语义，不推断具体亲属关系');
  assert(!heard.visual, '听人物关系时不显示可推断关系的图');
}
for (const [key, pronoun, noun] of [['boy', 'he', 'boy'], ['girl', 'she', 'girl']]) {
  const question = whoBank.find(q => q.id === `unit2-who-person-${key}`);
  assert(question.prompt.includes(`用 ${pronoun} 指代`));
  assert.equal(question.answer, `${pronoun === 'he' ? 'He' : 'She'}'s a ${noun}.`);
}

const haveBank = unit2.bank('unit2-havegot');
assert.equal(haveBank.length, 28);
for (const question of haveBank.filter(q => q.visual?.type === 'person')) {
  const person = question.visual;
  const feature = question.id.includes('-hair-') ? 'hair' : 'eyes';
  assert.equal(question.answer, `I've got ${person[feature]} ${feature}.`, '人物实际颜色与第一人称特征句对应');
  assert.equal(question.answerSpeech, question.answer, '反馈朗读正确句，不朗读干扰项');
}
const languageAnswers = {
  'complete-i': 'have', 'complete-they': 'have',
  'negative-i': "I haven't got black hair.", 'negative-they': "They haven't got green eyes.",
  ask: 'Have you got red hair?', yes: 'Yes, I have.', no: "No, I haven't.",
  'hair-form': 'hair', 'eyes-form': 'eyes', 'short-have': 'I have got',
  'short-they': 'They have got', 'short-not': 'have not'
};
for (const [key, answer] of Object.entries(languageAnswers)) {
  assert.equal(haveBank.find(q => q.id === `unit2-havegot-language-${key}`).answer, answer, 'have got 人称、否定、缩写、短答和名词形式正确');
}
const yes = haveBank.find(q => q.id === 'unit2-havegot-language-yes');
const no = haveBank.find(q => q.id === 'unit2-havegot-language-no');
assert(yes.prompt.includes('有蓝色眼睛') && yes.prompt.includes('Have you got blue eyes?'));
assert(no.prompt.includes('没有红色头发') && no.prompt.includes('Have you got red hair?'));
const heardLanguageFacts = {
  'they-yes': ["They've got blue eyes.", '他们有蓝色眼睛'],
  'they-no': ["They haven't got green eyes.", '他们没有绿色眼睛'],
  'i-no': ["I haven't got black hair.", '我没有黑色头发'],
  ask: ['Have you got red hair?', '问有没有红色头发']
};
for (const [key, [speech, answer]] of Object.entries(heardLanguageFacts)) {
  const question = haveBank.find(q => q.id === `unit2-havegot-listen-language-${key}`);
  assert.equal(question.speech, speech);
  assert.equal(question.answer, answer, '肯定、否定、I／They 与疑问意义相符');
}
const colourMeanings = { black: '黑色', brown: '棕色', blue: '蓝色', green: '绿色', blond: '金色' };
for (const question of haveBank.filter(q => q.id.includes('-listen-hair-'))) {
  const colour = question.speech.match(/^I've got (black|brown) hair\.$/)?.[1];
  assert(colour);
  assert.equal(question.answer, colourMeanings[colour], '听到的头发颜色与中文答案一致');
  assert(!question.visual, '听特征时不显示暴露目标颜色的图');
}

const phonicsBank = unit2.bank('unit2-phonics');
const phonicsGroups = {
  mother: 'th', father: 'th', brother: 'th', grandfather: 'th', grandmother: 'th',
  cat: 't', sister: 't'
};
assert.equal(phonicsBank.length, 20);
for (const [word, group] of Object.entries(phonicsGroups)) {
  for (const direction of ['group', 'spell']) {
    const question = phonicsBank.find(q => q.id === `unit2-phonics-${direction}-${word}`);
    assert.equal(question.answer, group);
    assert.deepEqual(question.exampleWords, [word]);
    assert.equal(question.answerSpeech, word, '完整词示范，不把字母名当音素');
    if (direction === 'group') assert(question.prompt.includes(word.replace(group, `[${group}]`)), '标出的词中拼写与答案一致');
    else assert(question.prompt.includes(word.replace(group, '__')), '拼写补空的位置与原词正确对应');
  }
}
for (const question of phonicsBank) {
  assert(['th', 't'].includes(question.soundLetter));
  assert(question.exampleWords.length > 0);
  for (const word of question.exampleWords) assert.equal(phonicsGroups[word], question.soundLetter, '词中／词尾示例所属音素组正确');
  for (const speech of [question.speech, question.answerSpeech].filter(Boolean)) assert(!/^(?:th|t)$/i.test(speech), '不播放孤立的字母名冒充音素');
  if (question.kind === 'listening') assert.equal(question.answer, question.soundLetter);
}
const phonicsCardsText = unit2.lesson('unit2-phonics').map(card => `${card.sayPrompt} ${card.note || ''}`).join(' ');
assert(phonicsCardsText.includes('/ð/') && phonicsCardsText.includes('/t/'), '本课 th 正确说明为这些例词中的浊音 /ð/，t 为 /t/');
assert(phonicsCardsText.includes('cat 的词尾') && phonicsCardsText.includes('sister 的词中'), '明确词中／词尾音，未误当首音');

const senseFacts = {
  see: ['看', 'eyes'], hear: ['听', 'ears'], smell: ['闻', 'nose'],
  taste: ['尝', 'tongue'], touch: ['摸；触摸', 'hands']
};
const sensesBank = unit2.bank('unit2-senses');
assert.equal(sensesBank.length, 23);
for (const [sense, [chinese, part]] of Object.entries(senseFacts)) {
  const action = sensesBank.find(q => q.id === `unit2-senses-action-${sense}`);
  assert.equal(action.answer, sense);
  assert.equal(action.visual.type, 'sense');
  assert.equal(action.visual.sense, sense);
  assert(!action.visual.label.includes(sense), '可见图注不泄漏待选英文动作');
  const match = sensesBank.find(q => q.id === `unit2-senses-match-${sense}`);
  assert.equal(match.answer, part);
  assert.equal(match.answerSpeech, `We use our ${part} to ${sense}.`, '五感与常见部位配对正确');
  const heard = sensesBank.find(q => q.id === `unit2-senses-listen-${sense}`);
  assert.equal(heard.speech, sense);
  assert.equal(heard.answer, chinese);
  assert(!heard.visual, '感官听辨不显示揭露意思的动作图');
  const context = sensesBank.find(q => q.id === `unit2-senses-context-${sense}`);
  assert.equal(context.answer, sense);
  assert(context.prompt.includes(chinese.split('；')[0]), '原创图示情境明确动作而不强制身体体验');
}
assert(sensesBank.find(q => q.id === 'unit2-senses-context-taste').prompt.includes('家人已确认安全的熟悉食物'));
assert(sensesBank.find(q => q.id === 'unit2-senses-context-touch').prompt.includes('常温的柔软布料'));
const careAnswers = {
  respect: '询问需要什么帮助，选能一起参与的方式',
  'safe-taste': '看图认识词，不尝陌生物品', 'safe-touch': '不触摸，用安全图示练习'
};
for (const [key, answer] of Object.entries(careAnswers)) assert.equal(sensesBank.find(q => q.id === `unit2-senses-care-${key}`).answer, answer);

// Answers are grounded in independent English facts in original passages.
const readingFacts = {
  'family-book-mum-name': [/My mum is Nina\./, 'Nina'],
  'family-book-leo-role': [/My brother is Leo\./, '哥哥或弟弟'],
  'family-book-share-book': [/We share a book\./, '一本书'],
  'mia-features-hair': [/I've got black hair and blue eyes\./, '黑色'],
  'mia-features-eyes': [/I've got black hair and blue eyes\./, '蓝色'],
  'mia-features-share': [/We share our crayons\./, '蜡笔'],
  'help-grandpa-name': [/His name is Ben\./, 'Ben'],
  'help-grandpa-together': [/We read a book together\./, '读书'],
  'help-grandpa-help': [/I help him find his glasses\./, '眼镜'],
  'picture-friends-relationship': [/Ana and Noah are friends\./, '朋友'],
  'picture-friends-hear': [/Ana cannot hear\./, 'Ana'],
  'picture-friends-help': [/They look at the picture together\./, '一起看图画']
};
const reading = unit2.bank('unit2-reading');
assert.equal(reading.length, Object.keys(readingFacts).length);
const stories = new Set();
for (const question of reading) {
  assert(Array.isArray(question.passage) && question.passage.length >= 2);
  for (const sentence of question.passage) assert(typeof sentence === 'string' && sentence.trim() && !/[\u3400-\u9fff]/.test(sentence), '阅读正文是英文短句，不先显示答案的中文译文');
  stories.add(JSON.stringify(question.passage));
  const [fact, answer] = readingFacts[question.id.replace('unit2-reading-', '')];
  assert(question.passage.some(sentence => fact.test(sentence)), '答案依据在英语正文中确实存在');
  assert.equal(question.answer, answer, '阅读答案符合正文事实，而非只比较讲解字段');
  if (question.glossary) for (const entry of question.glossary) assert(entry.english?.trim() && entry.chinese?.trim());
}
assert.equal(stories.size, 4, '四篇原创家庭与友爱短文各三问');

const reviewBank = unit2.bank(reviewId);
assert.equal(reviewBank.length, 36, '0～2 复习是独立原创的 36 个题号，不把抽题次数当数量');
const suffix = question => question.id.slice(`${reviewId}-`.length);
const helloReview = reviewBank.filter(q => /^(?:greeting|name|age|number-|colour-)/.test(suffix(q)));
const unit1Review = reviewBank.filter(q => /^(?:position-|plural-)/.test(suffix(q)));
const unit2Review = reviewBank.filter(q => /^(?:who-|havegot-)/.test(suffix(q)));
assert.deepEqual([helloReview.length, unit1Review.length, unit2Review.length], [13, 12, 11], '复习覆盖 Hello、Unit 1 和 Unit 2，按独立知识点记首次结果');
const numbers = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const colours = { red: '#df343f', blue: '#267bd8', green: '#278645', yellow: '#f4cd27', purple: '#853eaa' };
for (const question of reviewBank) {
  if (question.visual?.type === 'count') assert.equal(question.answer, numbers[question.visual.count - 1], '复习数字答案按实际图示数量校验');
  if (question.visual?.type === 'colour') assert.equal(question.visual.value, colours[question.answer], '复习色块实际色值与英文答案匹配');
  if (question.visual?.type === 'position') assert.equal(question.answer, `It's ${question.visual.relation} the ${question.visual.anchor}.`, '复习位置答案与位置图相同');
  if (question.visual?.type === 'objects') {
    const object = question.visual;
    assert(['book', 'pencil'].includes(object.word));
    assert.equal(question.answer, object.count === 1 ? `It's a ${object.word}.` : `They're ${object.word}s.`, '复习单复数正确使用名词形式');
    assert(question.prompt.includes(object.count === 1 ? "What's this?" : 'What are these?'));
  }
  if (suffix(question).startsWith('position-listen-')) {
    assert.equal(question.speech, `It's ${question.answer} the ${question.answer === 'on' ? 'desk' : question.answer === 'under' ? 'chair' : 'bag'}.`);
    assert(!question.visual, '复习听辨也不先显示位置图');
  }
}
for (const [key, name, pronoun, role, chinese] of people) {
  const question = reviewBank.find(q => suffix(q) === `who-${key}`);
  assert.equal(question.visual.name, name);
  assert(question.prompt.includes(`${name} 是我的${chinese}`));
  assert.equal(question.answer, `${pronoun === 'he' ? 'He' : 'She'}'s my ${role}.`);
}
const reviewLanguageFacts = {
  greeting: 'Hi!', name: 'Ava', age: '7 岁', 'havegot-hair': "I've got brown hair.",
  'havegot-eyes': "They've got green eyes.", 'havegot-no-hair': "I haven't got black hair.",
  'havegot-yes-answer': 'Yes, I have.', 'havegot-no-answer': "No, I haven't."
};
for (const [key, answer] of Object.entries(reviewLanguageFacts)) assert.equal(reviewBank.find(q => suffix(q) === key).answer, answer);

const booklet = unit2.booklet;
assert(booklet.title?.trim());
assert.deepEqual(booklet.ages, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], '主题任务年龄选择对应已学 1～10');
assert.deepEqual(booklet.names, [{ name: 'Mia', pronoun: 'she' }, { name: 'Leo', pronoun: 'he' }, { name: 'Ava', pronoun: 'she' }, { name: 'Ben', pronoun: 'he' }], '小手册使用示例身份，代词明确');
for (const field of ['hairColours', 'eyeColours', 'family', 'favourites']) {
  assert(booklet[field].length > 0);
  assert.equal(new Set(booklet[field].map(entry => entry.key)).size, booklet[field].length, '小手册选项 key 唯一');
  for (const entry of booklet[field]) assert(entry.english?.trim() && entry.chinese?.trim());
}
assert.deepEqual(booklet.hairColours.map(entry => entry.key), ['black', 'brown', 'blond']);
assert.deepEqual(booklet.eyeColours.map(entry => entry.key), ['blue', 'brown', 'green']);
for (const entry of [...booklet.hairColours, ...booklet.eyeColours]) {
  assert.equal(entry.english, entry.key);
  assert.equal(entry.chinese, colourMeanings[entry.key]);
  assert.match(entry.value, /^#[a-f\d]{6}$/i);
}
assert.deepEqual(booklet.family.map(entry => entry.key), ['mum', 'dad', 'grandma', 'grandpa', 'brother', 'sister']);
for (const entry of booklet.family) {
  assert.equal(entry.english, entry.key);
  assert.equal(entry.pronoun, ['dad', 'grandpa', 'brother'].includes(entry.key) ? 'he' : 'she');
}
assert.deepEqual(booklet.favourites.map(entry => entry.key), ['book', 'pencil', 'dog', 'cat']);
for (const entry of booklet.favourites) assert(entry.icon?.trim() && entry.english === entry.key);

// Run required data as classic scripts in a sandbox with no network APIs.
const scripts = [...read('index.html').matchAll(/<script\b([^>]*)>/g)]
  .map(match => ({ attributes: match[1], source: match[1].match(/\bsrc=["']([^"']+)["']/)?.[1]?.split(/[?#]/)[0] }))
  .filter(script => script.source);
for (const script of scripts) {
  assert(!/^https?:|^\/\//i.test(script.source), '必需脚本全部保存在项目内');
  assert(!/\btype\s*=\s*["']module["']/.test(script.attributes), '经典脚本兼容本地直接打开');
  assert(fs.existsSync(path.join(repository, script.source)), `项目内存在 ${script.source}`);
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(read(script.source)), '学习及备份没有外部网络加载');
}
const dependencies = ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js', 'data/questions.js', 'record-backup.js'];
assert.deepEqual(scripts.filter(script => dependencies.includes(script.source)).map(script => script.source), dependencies, '新旧数据经典脚本顺序正确');
const sandbox = {};
const context = vm.createContext(sandbox);
for (const file of dependencies) new vm.Script(read(file), { filename: file }).runInContext(context, { timeout: 1000 });
assert.deepEqual(plain(sandbox.GardenUnit2.topics), unit2.topics);
assert.deepEqual(plain(sandbox.GardenUnit2.reviewTopic), unit2.reviewTopic);
for (const goal of newIds) assert.deepEqual(plain(sandbox.GardenQuestions.bank(goal)), unit2.bank(goal));

// Recover existing records and add new results without replacing old first tries.
const legacyTopics = ['pinyin', 'arithmetic', 'english2', 'hello-colours', 'unit1-position'];
const legacyQuestions = legacyTopics.map(topic => oldQuestions.bank(topic)[0]);
const oldState = {
  attempts: legacyQuestions.map((question, index) => ({ session: `published-${index}`, topic: question.topic, question: question.id, correct: false, review: false, time: 1000 + index })),
  sessions: [], wrong: legacyQuestions.map(question => question.id)
};
const oldCopy = JSON.stringify(oldState);
assert.deepEqual(backup.parseBackup(JSON.stringify(oldBackup.createBackup(oldState))), oldState, '旧语文、数学、英语词条、Hello 和 Unit 1 首次结果完整恢复');
const incoming = {
  attempts: all.map((question, index) => ({ session: `unit2-new-${index}`, topic: question.topic, question: question.id, correct: false, review: false, time: 2000 + index })),
  sessions: [], wrong: all.map(question => question.id)
};
const incomingCopy = JSON.stringify(incoming);
const restored = backup.parseBackup(JSON.stringify(backup.createBackup(incoming)));
assert.deepEqual(restored, incoming, '全部 Unit 2 与独立复习题可导出恢复');
assert.deepEqual(plain(sandbox.GardenBackup.parseBackup(JSON.stringify(sandbox.GardenBackup.createBackup(incoming)))), incoming, '经典脚本备份认识全部新题');
const merged = backup.merge(oldState, restored);
assert.equal(merged.addedAttempts, all.length);
assert.deepEqual(merged.data.attempts.slice(0, oldState.attempts.length), oldState.attempts, '导入保留原有首次结果');
assert.deepEqual(new Set(merged.data.wrong), new Set([...oldState.wrong, ...incoming.wrong]), '新旧错题均保留');
const duplicate = backup.merge(merged.data, incoming);
assert.equal(duplicate.addedAttempts, 0);
assert.equal(duplicate.addedSessions, 0);
assert.deepEqual(duplicate.data, merged.data, '重复导入不重复统计');
for (const goal of newIds) {
  const bank = unit2.bank(goal);
  for (const total of [5, 10]) {
    const id = `complete-${goal}-${total}`;
    const complete = {
      attempts: bank.slice(0, total).map((question, index) => ({ session: id, topic: goal, question: question.id, correct: index >= 2, review: false, time: 5000 + index })),
      sessions: [{ id, total, correct: total - 2, review: false, time: 5010 }],
      wrong: bank.slice(0, 2).map(question => question.id)
    };
    assert.deepEqual(backup.parseBackup(JSON.stringify(backup.createBackup(complete))), complete, `${goal} 逐题首次结果与 ${total} 题总结可恢复`);
  }
  const reviewed = bank[0];
  const review = {
    attempts: [{ session: `review-${goal}`, topic: goal, question: reviewed.id, correct: true, review: true, time: 6000 }],
    sessions: [{ id: `review-${goal}`, total: 1, correct: 1, review: true, time: 6000 }], wrong: []
  };
  const after = backup.merge(merged.data, backup.parseBackup(JSON.stringify(backup.createBackup(review)))).data;
  assert(!after.wrong.includes(reviewed.id), '新目标及混合复习错题在错题重练首次答对后移出');
  assert(legacyQuestions.every(question => after.wrong.includes(question.id)), '复习新题不会删除旧错题');
  assert.equal(after.attempts.filter(attempt => attempt.question === reviewed.id).length, 2, '首次错答及复习答对分别保留');
}
assert.equal(JSON.stringify(oldState), oldCopy, '备份操作不修改旧输入');
assert.equal(JSON.stringify(incoming), incomingCopy, '备份操作不修改导入输入');

console.log(`通过：Unit 2 七目标与独立 0～2 复习 ${all.length} 道题、${cardIds.size} 张卡，固定编号、唯一选项与模块隔离。`);
console.log('通过：图片家人、身体、foot／feet、Who 问答、have／haven’t got、th／t、五感与原创阅读事实。');
console.log('通过：854e4d2 已发布 158 词条／316 双向练习、Hello 94 题／28 卡、Unit 1 124 题／43 卡、120 语文题和 760 数学题完整对象不变。');
console.log('通过：新旧首次结果与错题备份往返、合并、去重、每个目标 5／10 题总结、错题复习，以及无网络经典脚本。');
