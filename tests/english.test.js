'use strict';

// Run with: node tests/english.test.js
// Counts below describe stored vocabulary and fixed exercise variants, not runs.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const vm = require('node:vm');
const english = require('../data/english.js');
const questions = require('../data/questions.js');
const backup = require('../record-backup.js');

const repository = path.resolve(__dirname, '..');
const BASELINE = 'e06e8d2';
const expected = {
  englishhello: { words: 21, extra: 0 },
  english1: { words: 34, extra: 6 },
  english2: { words: 32, extra: 7 },
  english3: { words: 38, extra: 8 },
  english4: { words: 33, extra: 6 }
};
const plain = value => JSON.parse(JSON.stringify(value));
const compact = value => value.toLowerCase().replace(/\s/g, '');
function source(file) {
  return execFileSync('git', ['show', `${BASELINE}:${file}`], { cwd: repository, encoding: 'utf8' });
}
function isolated(file, dependencies = {}) {
  const sandbox = {
    module: { exports: {} },
    require(name) {
      assert(Object.hasOwn(dependencies, name), `未提供基线依赖 ${name}`);
      return dependencies[name];
    }
  };
  new vm.Script(source(file), { filename: `baseline-${file}` }).runInNewContext(sandbox, { timeout: 1000 });
  return sandbox.module.exports;
}
const oldQuestions = isolated('data/questions.js');
const oldBackup = isolated('record-backup.js', { './data/questions.js': oldQuestions });

assert.deepEqual(english.units.map(unit => unit.id), Object.keys(expected), '五个单元使用稳定标识');
assert.deepEqual(english.topics.map(topic => topic.id), Object.keys(expected));
assert(english.topics.every(topic => topic.subject === 'english'));
assert.deepEqual(questions.topics.filter(topic => topic.subject !== 'english'), plain(oldQuestions.topics), '原有知识点不变');
for (const topic of oldQuestions.topics) {
  assert.deepEqual(questions.bank(topic.id), plain(oldQuestions.bank(topic.id)), `${topic.id} 已有完整题目对象必须与发布基线一致`);
}

const allIds = new Set();
let wordsTotal = 0, coreTotal = 0, exercisesTotal = 0;
for (const [topic, count] of Object.entries(expected)) {
  const words = english.vocabulary(topic);
  assert.equal(words.length, count.words, `${topic} 词条数量`);
  assert.equal(words.filter(word => word.extended).length, count.extra, `${topic} 拓展词标识应与图片一致`);
  assert.equal(new Set(words.map(word => word.key)).size, words.length, `${topic} 单词 key 不重复`);
  assert.equal(new Set(words.map(word => compact(word.english))).size, words.length, `${topic} 单元内词条不重复`);
  for (const word of words) {
    assert.match(word.key, /^[a-z0-9_-]+$/, '单词 key 应为稳定 ASCII');
    assert.equal(typeof word.extended, 'boolean');
    for (const field of ['english', 'meaning', 'hint', 'speech']) {
      assert.equal(typeof word[field], 'string', `${topic}/${word.key} ${field} 类型`);
      assert(word[field].trim(), `${topic}/${word.key} ${field} 不为空`);
    }
    assert(!word.speech.includes('/'), '朗读文本应正确处理同义别称');
  }
  const bank = english.bank(topic);
  assert.equal(bank.length, words.length * 2, `${topic} 每词两道固定练习`);
  assert.deepEqual(bank, english.bank(topic), '重复调用不改变固定题 ID 或内容');
  assert.deepEqual(questions.bank(topic), bank, '统一题库应包含英语');
  for (const word of words) {
    const variants = bank.filter(question => question.wordKey === word.key);
    assert.deepEqual(new Set(variants.map(question => question.direction)), new Set(['meaning', 'word']), '每词双方向各一道');
    for (const question of variants) {
      assert.equal(question.id, `${topic}-${word.key}-${question.direction}`);
      assert(!allIds.has(question.id), `全局题目 ID 不重复：${question.id}`);
      allIds.add(question.id);
      assert.equal(question.topic, topic);
      assert.equal(question.extended, word.extended);
      assert.equal(question.answer, question.direction === 'meaning' ? word.meaning : word.english);
      assert.equal(question.choices.length, 3, '三个选项');
      assert.equal(new Set(question.choices).size, 3, '选项不能重复');
      assert.equal(question.choices.filter(choice => choice === question.answer).length, 1, '正确答案唯一');
      for (const field of ['prompt', 'hint', 'explanation']) assert(question[field]?.trim(), `${question.id} ${field} 非空`);
      assert.equal(question.answerSpeech, word.speech, '答题后朗读单词而非中文解释');
      if (question.direction === 'meaning') assert.equal(question.speech, word.speech, '英文题干可朗读');
    }
  }
  wordsTotal += words.length;
  coreTotal += words.filter(word => !word.extended).length;
  exercisesTotal += bank.length;
}
assert.equal(wordsTotal, 158);
assert.equal(coreTotal, 131);
assert.equal(exercisesTotal, 316);
assert.equal(allIds.size, 316);

function findWord(topic, spelling) {
  const word = english.vocabulary(topic).find(item => compact(item.english) === compact(spelling));
  assert(word, `${topic} 应有 ${spelling}`);
  return word;
}
// Do not offer two equally plausible answers for near synonyms or aliases.
const synonymGroups = [
  ['little', 'small'], ['father / dad'], ['mother / mum'],
  ['grandfather / grandpa'], ['grandmother / grandma']
];
for (const group of synonymGroups) {
  const matches = Object.keys(expected).flatMap(topic => english.vocabulary(topic)
    .filter(word => group.some(spelling => compact(word.english) === compact(spelling)))
    .map(word => ({ topic, word })));
  for (const { topic, word } of matches) {
    for (const question of english.bank(topic).filter(q => q.wordKey === word.key)) {
      for (const other of matches.filter(item => item.word !== word)) {
        const ambiguous = question.direction === 'word' ? other.word.english : other.word.meaning;
        if (ambiguous !== question.answer) assert(!question.choices.includes(ambiguous), `${question.id} 不应以近义词作干扰`);
      }
    }
  }
}
const helloOrange = findWord('englishhello', 'orange');
const foodOrange = findWord('english4', 'orange');
assert.match(helloOrange.meaning, /橙色/);
assert.match(foodOrange.meaning, /橙子|橘子/);
const animalChicken = findWord('english3', 'chicken');
const foodChicken = findWord('english4', 'chicken');
assert.equal(animalChicken.meaning, '鸡');
assert.match(foodChicken.meaning, /鸡肉/);
for (const [topic, word, context] of [
  ['englishhello', helloOrange, /颜色|橙色/], ['english4', foodOrange, /水果|食物|橙子|橘子/],
  ['english3', animalChicken, /动物|农场|鸡/], ['english4', foodChicken, /食物|食材|鸡肉/]
]) {
  for (const question of english.bank(topic).filter(q => q.wordKey === word.key)) {
    assert.match(question.prompt, context, '多义词题干须提供单元情景');
  }
}

const oldState = {
  attempts: [
    { session: 'pre-english-1', topic: 'pinyin', question: 'pinyin-59', correct: false, review: false, time: 1000 },
    { session: 'pre-english-2', topic: 'words', question: 'words-59', correct: true, review: false, time: 1001 },
    { session: 'pre-english-3', topic: 'arithmetic', question: 'arithmetic-2-1-+', correct: false, review: false, time: 1002 }
  ], sessions: [], wrong: ['pinyin-59', 'arithmetic-2-1-+']
};
const originalState = JSON.stringify(oldState);
assert.deepEqual(backup.parseBackup(JSON.stringify(oldBackup.createBackup(oldState))), oldState, '英语版继续恢复发布版的完整旧备份');
assert.equal(JSON.stringify(oldState), originalState, '验证不能改变现有数据');
for (const topic of Object.keys(expected)) {
  for (const question of english.bank(topic)) {
    const data = {
      attempts: [{ session: 'english-backup-check', topic, question: question.id, correct: false, review: false, time: 2000 }],
      sessions: [], wrong: [question.id]
    };
    assert.deepEqual(backup.parseBackup(JSON.stringify(backup.createBackup(data))), data, `${question.id} 已注册为可恢复的题目`);
    const merged = backup.merge(oldState, data).data;
    assert.deepEqual(merged.attempts.slice(0, oldState.attempts.length), oldState.attempts, '英语恢复保留旧首次结果');
    assert.equal(backup.merge(merged, data).addedAttempts, 0, '英语备份重复导入不重复统计');
  }
}
console.log('通过：英语 158 个独立词条（131 核心、27 拓展），316 道双方向固定题，全部 ID 与选项唯一，多义词情景和近义干扰校验。');
console.log('通过：原数学及全部 120 道语文题的完整对象与 e06e8d2 基线不变；旧备份和每道英语新题可恢复、可合并、重复导入不重计。');
