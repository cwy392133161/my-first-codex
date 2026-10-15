'use strict';

// node tests/speech-text.test.js
// Reading boundaries are checked independently of the MP3 build and playback.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const speech = require('../speech-text.js');
const hello = require('../data/english-hello.js');
const unit1 = require('../data/english-unit1.js');
const unit2 = require('../data/english-unit2.js');
const unit4 = require('../data/english-unit4.js');
const english = require('../data/english.js');
const { collect } = require('../scripts/audio-texts.js');

test('Hello 和 Hi 保持完整问候词，所有问候入口使用同一个词音', () => {
  assert.equal(speech.text('Hello!'), 'Hello!');
  assert.equal(speech.text('Hi!'), 'Hi!');
  assert.deepEqual(speech.sentences("Hello! I'm Jim."), ['Hello!', "I'm Jim."]);
  assert.deepEqual(speech.sentences("Hi! I'm Jenny."), ['Hi!', "I'm Jenny."]);
  for (const greeting of ['hello', 'hi']) {
    const clip = collect().clips.find(item => item.key === greeting);
    assert.equal(clip.text, greeting === 'hello' ? 'Hello!' : 'Hi!');
    assert(clip.sources.some(source => source.startsWith('question:hello-greetings-listen-')));
    assert(clip.sources.some(source => source.startsWith('model:hello-lesson-greet-')));
    for (const question of hello.bank('hello-greetings')) {
      for (const value of [question.speech, question.answerSpeech].filter(Boolean)) {
        const expected = /^(Hello|Hi)!/.exec(value)?.[1];
        if (expected) assert.equal(speech.sentences(value)[0], `${expected}!`);
      }
    }
  }
});

test('34 张曾缺少边界的学习卡把词条和例句分开，原学习内容保持不变', () => {
  const cards = [];
  for (const group of [hello, unit1, unit2]) {
    const topics = group.reviewTopic ? [...group.topics, group.reviewTopic] : group.topics;
    for (const topic of topics) {
      if (topic.id.endsWith('-phonics')) continue;
      for (const card of group.lesson(topic.id)) {
        if (card.lines.length > 1 && !/[.!?]$/.test(card.lines[0].english)) cards.push(card);
      }
    }
  }
  assert.equal(cards.length, 34);
  assert.equal(cards.filter(card => card.id.startsWith('unit1-lesson-school-')).length, 20);
  assert.equal(cards.filter(card => card.id.startsWith('unit2-lesson-family-')).length, 7);
  assert.equal(cards.filter(card => card.id.startsWith('unit2-lesson-senses-')).length, 5);
  const aliases = {
    'unit2-lesson-family-father': 'father, dad.',
    'unit2-lesson-family-mother': 'mother, mum.',
    'unit2-lesson-family-grandfather': 'grandfather, grandpa.',
    'unit2-lesson-family-grandmother': 'grandmother, grandma.'
  };
  for (const card of cards) {
    const before = JSON.stringify(card);
    const sentences = speech.sentences(speech.lesson(card, false));
    if (card.id === 'unit2-lesson-who-short') {
      assert.deepEqual(sentences, ["Who's means who is.", "He's means he is.", "She's means she is."]);
    } else {
      assert.equal(sentences.length, 2, `${card.id} 的词条与例句各一段`);
      assert.equal(sentences[0], aliases[card.id] || card.lines[0].english + '.');
      assert.equal(sentences[1], card.lines[1].english === 'feet' ? 'feet.' : card.lines[1].english);
    }
    assert.equal(JSON.stringify(card), before, '朗读处理不会改动原卡片、题号或语义');
  }
});

test('foot 和 feet 可分别对比，颜色短语与同义词都有清晰边界', () => {
  const foot = unit2.lesson('unit2-body').find(card => card.id === 'unit2-lesson-body-foot');
  assert.equal(speech.lesson(foot, false), 'foot. feet.');
  assert.equal(speech.lesson(foot, true), 'foot, feet');
  assert.equal(speech.text('father/dad'), 'father, dad');
  assert.equal(speech.text('grandmother / grandma'), 'grandmother, grandma');
  const cards = unit2.lesson('unit2-havegot');
  assert.deepEqual(speech.sentences(speech.lesson(cards.find(card => card.id.endsWith('-hair')), false)), [
    "I've got brown hair.", 'black hair.', 'brown hair.', 'blond hair.'
  ]);
  assert.deepEqual(speech.sentences(speech.lesson(cards.find(card => card.id.endsWith('-eyes')), false)), [
    "I've got blue eyes.", 'blue eyes.', 'brown eyes.', 'green eyes.'
  ]);
  for (const word of english.vocabulary('english2').filter(word => word.english.includes('/'))) {
    assert.equal(speech.text(word.english), word.speech, '词表与学习卡使用相同的同义词朗读');
  }
});

test('缩写比较是三条说明，普通英语缩写不展开，不读等号或重复标点', () => {
  const expected = "Who's means who is. He's means he is. She's means she is.";
  assert.equal(speech.text('Who’s = Who is He’s = He is; She’s = She is'), expected);
  assert.equal(speech.text("Who's = Who is. He's = He is; She's = She is."), expected);
  for (const sentence of ["I'm Jim.", "I've got brown hair.", "They've got green eyes.",
    "I haven't got black hair.", "It isn't on the chair.", "What's your name?", "Who's she?"]) {
    assert.equal(speech.text(sentence), sentence);
  }
  assert.equal(speech.text('I’m Jim. I’ve got brown hair.'), "I'm Jim. I've got brown hair.");
  assert.equal(speech.text('  foot;   feet  '), 'foot. feet');
  assert.equal(speech.text(speech.text(expected)), expected, '规范化可重复应用');
});

test('p/b 和 th/t 始终读完整示例词，不朗读字母名、括号或缺字标记', () => {
  const cards = [...unit1.lesson('unit1-phonics'), ...unit2.lesson('unit2-phonics')];
  assert.equal(cards.length, 8);
  for (const card of cards) {
    assert.equal(speech.lesson(card, true), card.sayModel);
    assert(!/[\[\]_→=]/.test(speech.lesson(card, true)));
    assert(!/\b(?:p|b|th|t)\b/i.test(speech.lesson(card, true)), '完整词示范不替换为字母名');
  }
  assert.equal(speech.lesson(cards.find(card => card.id === 'unit2-lesson-phonics-spell'), true), 'mother, cat, sister');
  assert.equal(speech.lesson(cards.find(card => card.id === 'unit1-lesson-phonics-look'), true), 'pen, bag');
});

test('构建覆盖新规范片段，Hello/Hi 优先，没有粘连词条或符号输入', () => {
  const data = collect();
  const previous = collect({includeUnit3:false,includeUnit4:false});
  const published = collect({includeUnit4:false});
  assert.equal(previous.texts.length, 1517, '原有朗读入口都保留');
  assert.equal(previous.clips.length, 398, '原有完整词与例句的去重片段');
  assert.equal(published.texts.length, 2029, '当前已发布朗读入口保持 2029 个');
  assert.equal(published.clips.length, 501, '当前已发布录音保持 501 段');
  assert.deepEqual(data.texts.slice(0,published.texts.length),published.texts, 'Unit 4 在全部已发布输入后追加');
  for (const clip of published.clips) {
    const current = data.clips.find(item=>item.key===clip.key);
    assert.equal(current.text,clip.text, '所有已发布录音的实际文本与标点完全保留');
    assert.deepEqual(current.sources.slice(0,clip.sources.length),clip.sources, '已发布录音的旧来源顺序保留');
  }
  assert.deepEqual(data.texts.slice(0, previous.texts.length), previous.texts, '新增单元在原有入口后追加');
  assert(data.texts.length > previous.texts.length);
  for (const clip of previous.clips) assert.equal(data.clips.find(item=>item.key===clip.key).text, clip.text, '复用时原有真实朗读文本不改变');
  assert.deepEqual(data.clips.slice(0, 3).map(clip => clip.key), ['hello', 'hi', 'wall']);
  assert.equal(new Set(data.clips.map(clip => clip.key)).size, data.clips.length);
  for (const clip of data.clips) {
    assert.equal(clip.key, speech.canonical(clip.text));
    assert.equal(speech.text(clip.text), clip.text, '构建只接收已规范化的英文');
    assert(!/[\[\]_→/=;]/.test(clip.text), '不把可见拼写标记、斜杠、等号或列表符号交给朗读器');
    assert(!/^[a-z][A-Za-z ',/-]* [A-Z]/.test(clip.text), '词条后不粘连一个完整例句');
  }
  for (const key of ['foot', 'feet', "who's means who is", "he's means he is", "she's means she is", 'read', 'close', 'minute']) {
    assert(data.clips.some(clip => clip.key === key), `校对重点 ${key} 有独立音频入口`);
  }
});

test('Unit 4 与 3～4 复习的所有实际朗读入口纳入默认计划，拼读只示范完整词', () => {
  const data=collect();
  const inputs=new Map(data.texts.map(input=>[input.source,input.text]));
  const topics=[...unit4.topics,unit4.reviewTopic];
  for(const topic of topics) {
    for(const q of unit4.bank(topic.id)) {
      if(q.speech)assert.equal(inputs.get('question:'+q.id),speech.text(q.speech));
      if(q.answerSpeech)assert.equal(inputs.get('answer:'+q.id),speech.text(q.answerSpeech));
      if(q.passage&&q.passage.length)assert.equal(inputs.get('reading:'+q.id),speech.text(q.passage.join(' ')));
    }
    for(const card of unit4.lesson(topic.id)) {
      assert.equal(inputs.get('model:'+card.id),speech.text(card.sayModel));
      if(topic.id.endsWith('-phonics')) {
        assert.equal(inputs.has('lesson:'+card.id),false, '不朗读拼读卡里的音标和高亮字母');
        assert(!/[\[\]_→=\/]/.test(card.sayModel), '朗读器只接收完整示例词');
        assert(!/\b[aA]\b/.test(card.sayModel), '不把目标字母 a 当字母名单独朗读');
      } else assert.equal(inputs.get('lesson:'+card.id),speech.lesson(card,false));
    }
  }
  assert(data.texts.some(input=>input.source==='picnic'), '野餐可选对话进入新增音频计划');
  assert(data.clips.length>501, '新增朗读需求独立统计，不能把已发布数量当成已生成总量');
});

test('同一无外部依赖脚本可由浏览器和 Node 使用', () => {
  const source = fs.readFileSync(path.join(__dirname, '../speech-text.js'), 'utf8');
  assert(!/\b(?:require|fetch|import|XMLHttpRequest)\s*\(/.test(source));
  const sandbox = {};
  sandbox.window = sandbox;
  new vm.Script(source, { filename: 'speech-text.js' }).runInNewContext(sandbox);
  for (const value of ['Hello!', 'Hi!', 'father / dad', 'foot; feet', 'Who’s = Who is He’s = He is; She’s = She is']) {
    assert.equal(sandbox.GardenSpeechText.text(value), speech.text(value));
    assert.deepEqual(Array.from(sandbox.GardenSpeechText.sentences(value)), speech.sentences(value));
    assert.equal(sandbox.GardenSpeechText.canonical(value), speech.canonical(value));
  }
  const card = unit1.lesson('unit1-school')[0];
  assert.equal(sandbox.GardenSpeechText.lesson(card, false), speech.lesson(card, false));
  assert.deepEqual(speech.sentences(''), []);
  assert.equal(speech.text(null), '');
});
