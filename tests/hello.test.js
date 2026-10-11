'use strict';

// Run with: node tests/hello.test.js
// Baseline comparisons protect stored records and all published question IDs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const hello = require('../data/english-hello.js');
const english = require('../data/english.js');
const questions = require('../data/questions.js');
const backup = require('../record-backup.js');

const repository = path.resolve(__dirname, '..');
const BASELINE = 'ad48e05';
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
  const source = execFileSync('git', ['show', `${BASELINE}:${file}`], {
    cwd: repository, encoding: 'utf8'
  });
  new vm.Script(source, { filename: `baseline-${file}` }).runInNewContext(sandbox, { timeout: 1000 });
  return sandbox.module.exports;
}
const oldEnglish = baseline('data/english.js');
const oldQuestions = baseline('data/questions.js', { './english.js': oldEnglish });
const oldBackup = baseline('record-backup.js', { './data/questions.js': oldQuestions });
const goals = ['hello-greetings', 'hello-numbers', 'hello-name-age', 'hello-colours'];
const numberWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const colourWords = ['black', 'blue', 'brown', 'green', 'grey', 'orange', 'pink', 'purple', 'red', 'white', 'yellow'];

assert.deepEqual(hello.topics.map(topic => topic.id), goals, '提供图片中的四个可独立选择的学习目标');
assert(hello.topics.every(topic => topic.subject === 'english'));
assert(hello.topics.every(topic => topic.goal?.trim() && topic.focus?.trim()), '每个目标同时提供学习目标和学习重点');
assert.deepEqual(english.units, plain(oldEnglish.units), '已发布的 158 个词条内容完全保留');
assert.equal(english.units.reduce((total, unit) => total + unit.words.length, 0), 158);
assert.deepEqual(questions.topics.filter(topic => oldQuestions.topics.some(previous => previous.id === topic.id)), plain(oldQuestions.topics), '全部已发布知识点完整对象保持不变');
let oldVocabularyCount = 0, oldChineseCount = 0, oldMathCount = 0;
const oldIds = new Set();
for (const topic of oldQuestions.topics) {
  const published = plain(oldQuestions.bank(topic.id));
  assert.deepEqual(questions.bank(topic.id), published, `${topic.id} 全部原题内容及 ID 与发布版一致`);
  for (const question of published) oldIds.add(question.id);
  if (topic.subject === 'english') oldVocabularyCount += published.length;
  else if (topic.subject === 'chinese') oldChineseCount += published.length;
  else if (topic.subject === 'math') oldMathCount += published.length;
}
assert.equal(oldVocabularyCount, 316);
assert.equal(oldChineseCount, 120);
assert.equal(oldMathCount, 760);

const all = [];
const ids = new Set(oldIds);
for (const goal of goals) {
  const bank = hello.bank(goal);
  assert(bank.length >= 10, `${goal} 可以独立完成 10 题练习`);
  assert.deepEqual(hello.bank(goal), bank, '固定题重复调用内容与 ID 稳定');
  const changedBank = hello.bank(goal);
  changedBank[0].choices[0] = '外部意外修改';
  assert.deepEqual(hello.bank(goal), bank, '调用方调整题目不能破坏固定题库');
  assert.deepEqual(questions.bank(goal), bank, '统一题库能查到新目标题');
  assert(questions.topics.some(topic => topic.id === goal), '统计和备份应认识新目标');
  for (const question of bank) {
    assert.equal(question.topic, goal);
    assert.match(question.id, /^[a-z0-9_-]+$/);
    assert(!ids.has(question.id), `全局题目 ID 不重复：${question.id}`);
    ids.add(question.id);
    assert.equal(question.choices.length, 3, '孩子每题只需比较三个选项');
    assert.equal(new Set(question.choices).size, 3, '三个选项不同');
    assert.equal(question.choices.filter(choice => choice === question.answer).length, 1, '唯一答案必须在选项中');
    for (const field of ['prompt', 'hint', 'explanation', 'answerSpeech']) {
      assert.equal(typeof question[field], 'string');
      assert(question[field].trim(), `${question.id} ${field} 非空`);
    }
    if (question.kind === 'listening') {
      assert(question.speech?.trim(), '听辨题有可朗读的英文');
      assert(question.fallbackPrompt?.trim(), '设备无语音时可改用阅读');
      assert(!question.prompt.toLowerCase().includes(question.speech.toLowerCase()), '听辨题干不直接显示完整朗读内容');
      assert(!question.prompt.includes(question.answer), '听辨题干不直接显示答案');
      assert(!question.visual, '听辨题不通过图片先揭示答案');
    }
  }
  const cards = hello.lesson(goal);
  assert(cards.length > 0, `${goal} 有先学后练的卡片`);
  assert.equal(new Set(cards.map(card => card.id)).size, cards.length, '学习卡片 ID 在目标内唯一');
  const changedCards = hello.lesson(goal);
  changedCards[0].lines[0].english = '外部意外修改';
  assert.deepEqual(hello.lesson(goal), cards, '学习卡切换和渲染不能污染原内容');
  for (const card of cards) {
    for (const field of ['id', 'title', 'sayPrompt', 'sayModel']) {
      assert(card[field]?.trim(), `${goal} 学习卡 ${field} 非空`);
    }
    assert(Array.isArray(card.lines) && card.lines.length > 0, '卡片有双语示范');
    for (const line of card.lines) {
      assert(line.english?.trim());
      assert(line.chinese?.trim());
    }
  }
  all.push(...bank);
}
assert.deepEqual(hello.bank('not-a-goal'), [], '未知目标安全返回空题库');
assert.deepEqual(hello.lesson('not-a-goal'), [], '未知目标安全返回空学习卡');

const characterNames = ['Jenny', 'Jim', 'Cameron', 'Gracie', 'Harry', 'Henrietta', 'Rocky', 'Shelly'];
assert.deepEqual(hello.characters.map(character => character.name), characterNames, '图片上的八个名字完整、拼写正确');
assert.equal(new Set(hello.characters.map(character => character.id)).size, 8);
for (const character of hello.characters) {
  assert(character.chinese?.trim(), '角色有中文名字');
  assert(character.icon?.trim(), '角色有简单图示');
}

// Visual questions must teach the value that is actually shown on screen.
const numbers = hello.bank('hello-numbers');
for (const [index, word] of numberWords.entries()) {
  const value = index + 1;
  const printed = numbers.filter(question => question.visual?.type === 'number' && question.visual.value === value);
  const counted = numbers.filter(question => question.visual?.type === 'count' && question.visual.count === value);
  assert(printed.some(question => question.answer === word), `数字 ${value} 和 ${word} 对应`);
  assert(counted.some(question => question.answer === word), `${value} 个实物和 ${word} 对应`);
  assert(numbers.some(question => question.kind === 'listening' && question.speech === word && question.answer === String(value)), `听 ${word} 选择 ${value}`);
}
for (const question of numbers) {
  const visual = question.visual;
  if (!visual) continue;
  const value = visual.type === 'number' ? visual.value : visual.count;
  assert(Number.isInteger(value) && value >= 1 && value <= 10, 'Hello 数量只在 1–10 范围');
  assert.equal(question.answer, numberWords[value - 1], '数图和数字题的答案由显示的数量校验');
  if (visual.type === 'count') assert(visual.icon?.trim(), '数量图片有可数的符号');
}
const colours = hello.bank('hello-colours');
const helloVocabulary = new Map(english.vocabulary('englishhello').map(word => [word.english, word.meaning]));
const colourLooks = {
  black: ([r, g, b]) => Math.max(r, g, b) < 70,
  blue: ([r, g, b]) => b > g && b > r * 2,
  brown: ([r, g, b]) => r > g && g > b && r < 180,
  green: ([r, g, b]) => g > r && g > b,
  grey: ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) < 20 && r > 70 && r < 190,
  orange: ([r, g, b]) => r > 220 && g > 80 && g < 180 && b < 80,
  pink: ([r, g, b]) => r > 200 && g > 100 && b > 160 && r > b,
  purple: ([r, g, b]) => r > g && b > g && r < 210,
  red: ([r, g, b]) => r > g * 1.8 && r > b * 1.8,
  white: ([r, g, b]) => Math.min(r, g, b) > 240,
  yellow: ([r, g, b]) => r > 200 && g > 180 && b < 80
};
for (const word of colourWords) {
  const seen = colours.filter(question => question.visual?.type === 'colour' && question.answer === word);
  assert(seen.length > 0, `${word} 有看图识色练习`);
  for (const question of seen) {
    assert.match(question.visual.value, /^#[0-9a-f]{6}$/i, '色块使用离线 CSS 颜色');
    assert(question.visual.label?.trim(), '色块有辅助说明');
    const rgb = question.visual.value.slice(1).match(/.{2}/g).map(channel => parseInt(channel, 16));
    assert(colourLooks[word](rgb), `${word} 的色块实际颜色与英文相符`);
    assert(question.visual.label.includes(helloVocabulary.get(word)), '色块辅助说明和已有颜色词义一致');
  }
  assert(colours.some(question => question.kind === 'listening' && question.speech === word && question.answer === helloVocabulary.get(word)), `${word} 有中文答案正确的听音辨色练习`);
}

const greetings = hello.bank('hello-greetings');
for (const question of greetings.filter(item => item.kind !== 'listening')) {
  if (/^(Hello|Hi)(?:!|$)/.test(question.answer)) {
    assert.equal(question.choices.filter(choice => /^(Hello|Hi)(?:!|$)/.test(choice)).length, 1, '同一道问好选择题不能同时提供 Hello 和 Hi 两个都正确的回答');
  } else {
    assert.equal(question.answer, '你好！', 'Hello 和 Hi 的中文含义正确');
  }
}
for (const question of greetings.filter(item => item.kind === 'listening')) {
  assert.match(question.speech, /^(Hello|Hi)!/);
  assert.equal(question.answer, /I'm /.test(question.speech) ? '先问好，再说名字' : '你好！', '问候听辨区分单纯问好和问好后自我介绍');
}
const nameAge = hello.bank('hello-name-age');
for (const question of nameAge) {
  if (question.prompt.includes('对话中的名字是')) {
    const saidName = question.prompt.match(/I'm ([A-Za-z]+)\./)?.[1];
    assert(characterNames.includes(saidName), '姓名阅读题使用图片中已知的角色名字');
    assert.equal(question.answer, saidName, '回答的名字与对话完全相同');
  } else if (question.prompt.includes('对话中的小朋友几岁')) {
    const saidNumber = question.prompt.match(/I'm ([a-z]+)\./)?.[1];
    assert.equal(question.answer, String(numberWords.indexOf(saidNumber) + 1), '年龄答案和英文数字对应');
    assert(question.prompt.includes('原创例子'), '年龄题明确标为例子');
    assert(!characterNames.some(name => question.prompt.includes(name)), '不擅自设定教材人物的年龄');
  } else if (question.kind === 'listening') {
    const intent = question.speech.startsWith("What's your name?") ? '问名字'
      : question.speech.startsWith('How old are you?') ? '问年龄'
      : /I'm (?:Jim|Jenny)\./.test(question.speech) ? '介绍名字' : '说自己的年龄';
    assert.equal(question.answer, intent, '听辨问姓名、问年龄和两种回答的意思正确');
  }
}
const dialogueAnswers = {
  'ask-name': "What's your name?", 'ask-age': 'How old are you?',
  'reply-name': "I'm Jim.", 'reply-age': "I'm six.",
  'name-question-meaning': '名字', 'age-question-meaning': '年龄',
  'finish-name': 'Jenny', 'finish-age': 'three'
};
for (const [id, answer] of Object.entries(dialogueAnswers)) {
  assert.equal(nameAge.find(question => question.id === `hello-name-age-dialogue-${id}`)?.answer, answer, '姓名和年龄问答使用正确句式与回答类别');
}

// Run the same data and backup scripts without CommonJS, fetch or a server.
const scriptSources = [...read('index.html').matchAll(/<script\b([^>]*)>/g)]
  .map(match => ({ attributes: match[1], source: match[1].match(/\bsrc=["']([^"']+)["']/)?.[1] }))
  .filter(script => script.source);
for (const script of scriptSources) {
  assert(!/^https?:|^\/\//i.test(script.source), '必需脚本保存在项目内');
  assert(!/\btype\s*=\s*["']module["']/.test(script.attributes), '保持双击打开可用的经典脚本');
  assert(fs.existsSync(path.join(repository, script.source)), `脚本文件已包含：${script.source}`);
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(read(script.source)), '学习内容和备份不依赖网络接口');
}
const dependencies = ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js', 'data/questions.js', 'record-backup.js'];
const actualOrder = scriptSources.filter(script => dependencies.includes(script.source)).map(script => script.source);
assert.deepEqual(actualOrder, dependencies, '双击运行时题库与备份依赖加载顺序正确');
const sandbox = {};
const context = vm.createContext(sandbox);
for (const file of dependencies) new vm.Script(read(file), { filename: file }).runInContext(context, { timeout: 1000 });
assert.deepEqual(plain(sandbox.GardenHello.topics), hello.topics, '经典脚本暴露同一组新目标');
for (const goal of goals) {
  assert.deepEqual(plain(sandbox.GardenQuestions.bank(goal)), hello.bank(goal), '经典脚本获得完整新题');
}

const oldState = {
  attempts: [
    { session: 'published-chinese', topic: 'pinyin', question: 'pinyin-59', correct: false, review: false, time: 1000 },
    { session: 'published-english', topic: 'englishhello', question: english.bank('englishhello')[0].id, correct: false, review: false, time: 1001 }
  ], sessions: [], wrong: ['pinyin-59', english.bank('englishhello')[0].id]
};
const oldCopy = JSON.stringify(oldState);
assert.deepEqual(backup.parseBackup(JSON.stringify(oldBackup.createBackup(oldState))), oldState, '新版本能恢复发布版旧英语及语文错题');
const incoming = {
  attempts: all.map((question, index) => ({ session: `new-goal-${index}`, topic: question.topic, question: question.id, correct: false, review: false, time: 2000 + index })),
  sessions: [], wrong: all.map(question => question.id)
};
const incomingCopy = JSON.stringify(incoming);
for (const goal of goals) {
  const completed = {
    attempts: hello.bank(goal).slice(0, 5).map((question, index) => ({ session: `complete-${goal}`, topic: goal, question: question.id, correct: index >= 2, review: false, time: 4000 + index })),
    sessions: [{ id: `complete-${goal}`, total: 5, correct: 3, review: false, time: 4005 }],
    wrong: hello.bank(goal).slice(0, 2).map(question => question.id)
  };
  assert.deepEqual(backup.parseBackup(JSON.stringify(backup.createBackup(completed))), completed, `${goal} 完整五题总结和首次正确率可恢复`);
}
const restored = backup.parseBackup(JSON.stringify(backup.createBackup(incoming)));
assert.deepEqual(restored, incoming, '所有新目标题首次错答均可导出恢复');
assert.deepEqual(plain(sandbox.GardenBackup.parseBackup(JSON.stringify(sandbox.GardenBackup.createBackup(incoming)))), incoming, '离线经典脚本同样认识全部新题');
const merged = backup.merge(oldState, restored);
assert.equal(merged.addedAttempts, all.length);
assert.deepEqual(merged.data.attempts.slice(0, oldState.attempts.length), oldState.attempts, '导入保留已有首次作答结果');
assert.deepEqual(new Set(merged.data.wrong), new Set([...oldState.wrong, ...incoming.wrong]), '旧错题和新错题均保留');
const duplicated = backup.merge(merged.data, incoming);
assert.equal(duplicated.addedAttempts, 0, '重复导入不增加首次作答次数');
assert.equal(duplicated.addedSessions, 0, '重复导入不增加完成练习次数');
assert.deepEqual(duplicated.data, merged.data, '重复导入后记录完整一致');
const reviewed = all[0];
const reviewState = {
  attempts: [{ session: 'goal-review', topic: reviewed.topic, question: reviewed.id, correct: true, review: true, time: 3000 }],
  sessions: [{ id: 'goal-review', total: 1, correct: 1, review: true, time: 3000 }], wrong: []
};
const afterReview = backup.merge(merged.data, backup.parseBackup(JSON.stringify(backup.createBackup(reviewState)))).data;
assert(!afterReview.wrong.includes(reviewed.id), '新目标错题复习首次答对后从错题移出');
assert(oldState.wrong.every(id => afterReview.wrong.includes(id)), '复习新题不删除原错题');
assert.equal(afterReview.attempts.filter(attempt => attempt.question === reviewed.id).length, 2, '原错答和复习结果都保留');
assert.equal(JSON.stringify(oldState), oldCopy, '操作不改写原旧记录');
assert.equal(JSON.stringify(incoming), incomingCopy, '操作不改写导入记录');

console.log(`通过：Hello 四目标 ${all.length} 道固定练习，1–10 数字／数量／听辨、11 种颜色、8 个角色；问候和姓名年龄问答无歧义，卡片不被外部修改污染。`);
console.log('通过：ad48e05 已发布 158 词条、316 道单词练习、120 道语文题和 760 道数学题完整对象不变；新旧备份可合并、复习和去重。');
console.log('通过：必需文件均在项目内，经典脚本加载顺序正确，题库及备份可在无 CommonJS 和网络接口的环境运行。');
