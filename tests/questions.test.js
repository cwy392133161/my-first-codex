'use strict';
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const vm = require('node:vm');
const {topics, bank} = require('../data/questions.js');
const {createBackup, parseBackup} = require('../record-backup.js');

// 从发布基线读取真实旧题库，避免扩充题库时悄悄改动原题及历史记录的含义。
const BASELINE = '3f1188fa4facfb5413361cfec94aa01b44a97bbb';
const repository = path.resolve(__dirname, '..');
function baselineSource(file) {
  return execFileSync('git', ['show', `${BASELINE}:${file}`], {
    cwd: repository, encoding: 'utf8'
  });
}
function loadIsolated(source, filename, dependencies = {}) {
  const sandbox = {
    module: {exports: {}},
    require(name) {
      assert(Object.hasOwn(dependencies, name), `未支持的基线依赖：${name}`);
      return dependencies[name];
    }
  };
  new vm.Script(source, {filename}).runInNewContext(sandbox, {timeout: 1000});
  return sandbox.module.exports;
}
// VM 中的对象属于不同上下文，转成普通 JSON 对象后比较内容。
const plain = value => JSON.parse(JSON.stringify(value));
const previousQuestions = loadIsolated(baselineSource('data/questions.js'), 'baseline-questions.js');
const previousBackup = loadIsolated(baselineSource('record-backup.js'), 'baseline-record-backup.js', {
  './data/questions.js': previousQuestions
});
assert.deepEqual(topics, plain(previousQuestions.topics), '已有知识点及标识应保持不变');

const fixedCounts = {pinyin: 60, words: 60};
const dynamicCounts = {parts: 45, arithmetic: 132, compare: 121, advanced: 462};
const fixedPrompts = new Set();
let fixedTotal = 0;
let dynamicTotal = 0;
for (const topic of topics) {
  const questions = bank(topic.id);
  assert.equal(new Set(questions.map(question => question.id)).size, questions.length, `${topic.id} 题目 ID 必须唯一`);
  const isFixed = Object.hasOwn(fixedCounts, topic.id);
  assert.equal(questions.length, isFixed ? fixedCounts[topic.id] : dynamicCounts[topic.id], `${topic.id} 题量应符合预期`);

  if (isFixed) {
    fixedTotal += questions.length;
    const previous = plain(previousQuestions.bank(topic.id));
    assert.equal(previous.length, 12, `${topic.id} 发布基线应有 12 道原题`);
    const byId = new Map(questions.map(question => [question.id, question]));
    for (const oldQuestion of previous) {
      assert.deepEqual(byId.get(oldQuestion.id), oldQuestion, `${oldQuestion.id} 的编号及完整内容不能改变`);
    }
    assert.deepEqual(questions.slice(0, previous.length), previous, `${topic.id} 新题必须追加到原题之后`);
    questions.forEach((question, index) => {
      assert.equal(question.id, `${topic.id}-${index}`, '保留按序编号，以兼容已有错题记录');
      assert(!fixedPrompts.has(question.prompt), `固定题出现重复题干：${question.prompt}`);
      fixedPrompts.add(question.prompt);
    });
  } else {
    dynamicTotal += questions.length;
    assert.deepEqual(questions, plain(previousQuestions.bank(topic.id)), `${topic.id} 数学题池必须与发布基线完全相同`);
  }

  for (const question of questions) {
    assert.equal(question.topic, topic.id);
    assert.equal(typeof question.prompt, 'string');
    assert(question.prompt.trim(), `${question.id} 题干不能为空`);
    assert.equal(question.choices.length, 3, `${question.id} 应有三个选项`);
    assert.equal(new Set(question.choices).size, 3, `${question.id} 的选项不能重复`);
    assert.equal(question.choices.filter(choice => choice === question.answer).length, 1, `${question.id} 答案应在选项中唯一出现`);
    for (const field of ['hint', 'explanation']) {
      assert.equal(typeof question[field], 'string', `${question.id} ${field} 必须是文字`);
      assert(question[field].trim(), `${question.id} ${field} 不能为空`);
    }
    if (question.math) {
      const {a, b, op} = question.math;
      const expected = topic.id === 'parts' ? a - b : topic.id === 'compare' ?
        (a === b ? '=' : a > b ? '>' : '<') : op === '+' ? a + b : a - b;
      assert.equal(question.answer, String(expected), `${question.id} 数学答案须由计算校验`);
      if (topic.id !== 'compare') {
        assert(Number(question.answer) >= 0 && Number(question.answer) <= (topic.id === 'advanced' ? 20 : 10));
      }
    }
  }
}
assert.equal(fixedPrompts.size, 120, '全部语文固定题跨知识点去重后应为 120 道');

function records(questionIds, prefix) {
  return {
    attempts: questionIds.map((question, index) => ({
      session: `${prefix}-${index}`, topic: question.split('-')[0], question,
      correct: false, review: false, time: 1000 + index
    })),
    sessions: [],
    wrong: [...questionIds]
  };
}
const originalRecords = records(['pinyin-0', 'words-0'], 'old-version');
const originalCopy = JSON.stringify(originalRecords);
const oldExport = JSON.stringify(previousBackup.createBackup(originalRecords));
assert.deepEqual(parseBackup(oldExport), originalRecords, '扩充后必须能恢复旧版拼音及字词错题备份');
assert.equal(JSON.stringify(originalRecords), originalCopy, '兼容性验证不能改变原学习记录');

const appendedRecords = records(['pinyin-59', 'words-59'], 'expanded-version');
const appendedCopy = JSON.stringify(appendedRecords);
assert.deepEqual(parseBackup(JSON.stringify(createBackup(appendedRecords))), appendedRecords, '新题库最后一道拼音及字词题必须能导出恢复');
assert.equal(JSON.stringify(appendedRecords), appendedCopy, '新题备份不能改变现有学习记录');

console.log(`通过：语文固定题 ${fixedTotal} 道（拼音 ${fixedCounts.pinyin}、字词 ${fixedCounts.words}），跨知识点去重后 ${fixedPrompts.size} 道。`);
console.log(`通过：数学动态组合 ${dynamicTotal} 个（分与合 ${dynamicCounts.parts}、10以内加减 ${dynamicCounts.arithmetic}、比较 ${dynamicCounts.compare}、20以内加减 ${dynamicCounts.advanced}），题池与发布基线一致。`);
console.log('通过：原有 24 道固定题完整内容与编号不变；三唯一选项、唯一答案、非空提示与讲解；旧记录备份恢复及新题记录导出恢复。');
