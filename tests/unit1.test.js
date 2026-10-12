'use strict';

// Run with: node tests/unit1.test.js
// Check real learning rules and compatibility with the complete published bank.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const unit1 = require('../data/english-unit1.js');
const english = require('../data/english.js');
const hello = require('../data/english-hello.js');
const questions = require('../data/questions.js');
const backup = require('../record-backup.js');

const repository = path.resolve(__dirname, '..');
const BASELINE = 'ddaaf5d';
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
const oldQuestions = baseline('data/questions.js', { './english.js': oldEnglish, './english-hello.js': oldHello });
const oldBackup = baseline('record-backup.js', { './data/questions.js': oldQuestions });
const goals = ['unit1-school', 'unit1-position', 'unit1-plurals', 'unit1-phonics', 'unit1-reading', 'unit1-kindness'];

assert.deepEqual(unit1.topics.map(topic => topic.id), goals, 'Unit 1 的六个学习目标可独立选择');
assert(unit1.topics.every(topic => topic.subject === 'english'));
for (const topic of unit1.topics) {
  for (const field of ['name', 'description', 'goal', 'focus']) assert(topic[field]?.trim(), `${topic.id} ${field} 非空`);
}
assert.deepEqual(english.units, plain(oldEnglish.units), '已发布 158 个词条完整对象保持不变');
assert.equal(english.units.reduce((sum, unit) => sum + unit.words.length, 0), 158);
assert.deepEqual(hello.topics, plain(oldHello.topics), '已发布 Hello 学习目标保持不变');
for (const topic of hello.topics) {
  assert.deepEqual(hello.bank(topic.id), plain(oldHello.bank(topic.id)), `${topic.id} 原有题目完整对象不变`);
  assert.deepEqual(hello.lesson(topic.id), plain(oldHello.lesson(topic.id)), `${topic.id} 原有学习卡完整对象不变`);
}
assert.equal(hello.topics.reduce((sum, topic) => sum + hello.bank(topic.id).length, 0), 94);
assert.equal(hello.topics.reduce((sum, topic) => sum + hello.lesson(topic.id).length, 0), 28);
assert.deepEqual(questions.topics.filter(topic => oldQuestions.topics.some(previous => previous.id === topic.id)), plain(oldQuestions.topics), '所有旧知识点完整对象保持不变');
const counts = { vocabulary: 0, hello: 0, chinese: 0, math: 0 };
const ids = new Set();
for (const topic of oldQuestions.topics) {
  const published = plain(oldQuestions.bank(topic.id));
  assert.deepEqual(questions.bank(topic.id), published, `${topic.id} 原有题目、ID 与发布版一致`);
  for (const question of published) ids.add(question.id);
  const type = topic.subject === 'math' ? 'math' : topic.subject === 'chinese' ? 'chinese'
    : topic.id.startsWith('hello-') ? 'hello' : 'vocabulary';
  counts[type] += published.length;
}
assert.deepEqual(counts, { vocabulary: 316, hello: 94, chinese: 120, math: 760 });

const all = [];
const cardIds = new Set();
for (const goal of goals) {
  const bank = unit1.bank(goal);
  assert(bank.length >= 10, `${goal} 足够完成单次 10 题`);
  assert.deepEqual(unit1.bank(goal), bank, '固定题内容与编号稳定');
  const edited = unit1.bank(goal);
  edited[0].choices[0] = '外部意外修改';
  assert.deepEqual(unit1.bank(goal), bank, '调用方不能污染题库');
  assert.deepEqual(questions.bank(goal), bank, '统一题库能够查到新目标题');
  assert(questions.topics.some(topic => topic.id === goal), '统计和备份应认识新目标');
  for (const question of bank) {
    assert.equal(question.topic, goal);
    assert.match(question.id, /^[a-z0-9_-]+$/);
    assert(!ids.has(question.id), `题目 ID 在完整新旧题库中唯一：${question.id}`);
    ids.add(question.id);
    assert.equal(question.choices.length, 3, '题目只有三个选项');
    assert.equal(new Set(question.choices).size, 3, '选项不重复');
    assert.equal(question.choices.filter(choice => choice === question.answer).length, 1, '正确答案唯一且在选项中');
    for (const field of ['prompt', 'hint', 'explanation', 'answerSpeech']) {
      assert.equal(typeof question[field], 'string');
      assert(question[field].trim(), `${question.id} ${field} 非空`);
    }
    if (question.kind === 'listening') {
      assert(question.speech?.trim(), '听辨题有朗读文本');
      assert(question.fallbackPrompt?.trim(), '听辨题在无语音设备上可改用阅读');
      assert(!question.prompt.toLowerCase().includes(question.speech.toLowerCase()), '听辨题干不泄露完整朗读内容');
      assert(!question.prompt.includes(question.answer), '听辨题干不显示答案');
    }
  }
  const cards = unit1.lesson(goal);
  assert(cards.length > 0, `${goal} 提供先学后练的学习卡`);
  const editedCards = unit1.lesson(goal);
  editedCards[0].lines[0].english = '外部意外修改';
  assert.deepEqual(unit1.lesson(goal), cards, '学习卡不被外部修改污染');
  for (const card of cards) {
    for (const field of ['id', 'title', 'sayPrompt', 'sayModel']) assert(card[field]?.trim(), `${goal} 学习卡 ${field} 非空`);
    assert(!cardIds.has(card.id), `学习卡 ID 唯一：${card.id}`);
    cardIds.add(card.id);
    assert(Array.isArray(card.lines) && card.lines.length > 0, '学习卡有中英对照');
    for (const line of card.lines) assert(line.english?.trim() && line.chinese?.trim());
  }
  all.push(...bank);
}
assert.deepEqual(unit1.bank('not-a-goal'), [], '未知目标返回空题库');
assert.deepEqual(unit1.lesson('not-a-goal'), [], '未知目标返回空学习卡');

const schoolWords = ['bag', 'book', 'chair', 'classroom', 'crayon', 'desk', 'pen', 'pencil', 'pencil case', 'rubber', 'teacher', 'board', 'bookcase', 'cupboard', 'door', 'paper', 'playground', 'ruler', 'wall', 'window'];
const schoolMeanings = {
  bag: /包/, book: /书/, chair: /椅/, classroom: /教室/, crayon: /蜡笔/, desk: /书桌|课桌|桌子/,
  pen: /钢笔|墨水笔/, pencil: /铅笔/, 'pencil case': /笔袋|笔盒/, rubber: /橡皮/, teacher: /老师/,
  board: /白板/, bookcase: /书架|书柜/, cupboard: /柜/, door: /门/, paper: /纸/, playground: /操场/,
  ruler: /尺/, wall: /墙/, window: /窗/
};
const schoolCards = unit1.lesson('unit1-school');
const schoolBank = unit1.bank('unit1-school');
for (const word of schoolWords) {
  const exactLine = schoolCards.flatMap(card => card.lines).find(line => line.english.toLowerCase() === word);
  assert(exactLine, `照片重点词 ${word} 有专门学习卡`);
  assert.match(exactLine.chinese, schoolMeanings[word], `${word} 中文含义与照片一致`);
  assert(schoolBank.some(question => question.answer === word), `${word} 有选英文的巩固练习`);
  assert(schoolBank.some(question => question.prompt.includes(word) || question.speech === word), `${word} 有理解英文词义的巩固练习`);
}
assert.equal(schoolWords.length, 20, '图片中的学校重点词是 20 个，不重复计数');

const phonics = unit1.bank('unit1-phonics');
for (const letter of ['p', 'b']) {
  assert(phonics.some(question => question.soundLetter === letter), `同时练习字母 ${letter} 的首音`);
}
for (const question of phonics) {
  assert(['p', 'b'].includes(question.soundLetter), '语音题只练照片中的 p 与 b');
  assert(Array.isArray(question.exampleWords) && question.exampleWords.length > 0, '音素题以完整示例词提供首音');
  for (const word of question.exampleWords) {
    assert.equal(word[0].toLowerCase(), question.soundLetter, `${word} 首字母对应 ${question.soundLetter}`);
    assert(word.length > 1, '音素示例应为单词，不是字母名');
  }
  for (const speech of [question.speech, question.answerSpeech].filter(Boolean)) {
    assert(!/^[pb]$/i.test(speech.trim()), '浏览器朗读词首音示例，不把字母名当作音素');
  }
}
const phonicsText = phonics.flatMap(question => question.exampleWords);
for (const word of ['pen', 'pencil', 'bag', 'book', 'boy']) assert(phonicsText.includes(word), `图片中的首音示例 ${word} 被覆盖`);

const positionMeanings = { on: '在……上面', in: '在……里面', under: '在……下面', 'next to': '紧挨着' };
const position = unit1.bank('unit1-position');
for (const relation of Object.keys(positionMeanings)) {
  assert(position.some(question => question.visual?.relation === relation), `${relation} 有看图位置练习`);
  assert(position.some(question => question.kind === 'listening' && question.speech.includes(` is ${relation} the `)), `${relation} 有听辨位置练习`);
}
for (const question of position) {
  if (question.kind === 'listening') {
    const relation = question.speech.match(/\bis (on|in|under|next to) the\b/)?.[1];
    assert(relation, '位置听辨朗读完整且使用本单元四种关系');
    assert.equal(question.answer, positionMeanings[relation], '听到的关系与中文答案相符');
    assert(!question.visual, '位置听辨不先显示揭露答案的图示');
    assert(question.fallbackPrompt.includes(question.speech), '无语音时的完整句子与听辨内容相同');
  } else {
    const diagram = question.visual;
    assert.equal(diagram?.type, 'position');
    assert(Object.hasOwn(positionMeanings, diagram.relation));
    assert(schoolWords.includes(diagram.object) && schoolWords.includes(diagram.anchor), '位置图中的物品都是本单元校园词');
    assert.equal(question.answer, diagram.relation, '填空答案与实际图示关系一致');
    assert(question.prompt.includes(`The ${diagram.object} is ___ the ${diagram.anchor}.`), '位置题的英文主语、参照物与图示对应');
    assert(question.answerSpeech.includes(`Where's the ${diagram.object}?`), '答题后练习 Where 对图示物品提问');
    assert(question.answerSpeech.includes(`It's ${diagram.relation} the ${diagram.anchor}.`) || question.answerSpeech.includes(`The ${diagram.object} is ${diagram.relation} the ${diagram.anchor}.`), '答题后的示范句和图示一致');
    if (diagram.relation === 'in') assert(['bag', 'pencil case', 'cupboard', 'bookcase'].includes(diagram.anchor), 'in 的参照物是可以装物品的容器');
    if (['on', 'under'].includes(diagram.relation)) assert(['desk', 'chair'].includes(diagram.anchor), '表面和下方位置图使用桌椅参照');
  }
}
for (const card of unit1.lesson('unit1-position')) {
  assert(card.sayModel.includes(`Where's the ${card.visual.object}?`), '位置学习卡示范询问物品位置');
  assert(card.sayModel.includes(`It's ${card.visual.relation} the ${card.visual.anchor}.`) || card.sayModel.includes(`The ${card.visual.object} is ${card.visual.relation} the ${card.visual.anchor}.`), '位置学习卡说法与图示一致');
}

const plurals = unit1.bank('unit1-plurals');
const pluralForms = { book: 'books', window: 'windows', chair: 'chairs', pencil: 'pencils', crayon: 'crayons', bookcase: 'bookcases' };
for (const question of plurals) {
  const diagram = question.visual;
  assert.equal(diagram?.type, 'objects');
  assert(Object.hasOwn(pluralForms, diagram.word), '只使用已学且可数的校园物品做单复数');
  assert([1, 2].includes(diagram.count), '图示数量为一个或两个');
  assert(diagram.icon?.trim() && diagram.label?.trim(), '数量图有图标与文字说明');
  assert(!question.prompt.includes('paper') && !question.answer.includes('paper'), '不可数 paper 不用于基础单复数问答');
  const singular = diagram.count === 1;
  const ask = singular ? "What's this?" : 'What are these?';
  const answer = singular ? `It's a ${diagram.word}.` : `They're ${pluralForms[diagram.word]}.`;
  if (question.id.includes('-ask-')) {
    assert.equal(question.answer, ask, 'this／these 提问与一个／多个的图示数量一致');
    assert.equal(question.answerSpeech, `${ask} ${answer}`, '提问后的完整问答语法正确');
  } else {
    assert.equal(question.answer, answer, 'It’s a 单数／They’re 复数与图示数量一致');
    assert(question.prompt.includes(ask), '问句与图示数量一致');
    assert.equal(question.answerSpeech, answer, '朗读正确问答，不朗读错误干扰句');
  }
}
for (const [word, plural] of Object.entries(pluralForms)) {
  assert(plurals.some(question => question.visual.word === word && question.visual.count === 1 && question.answer === `It's a ${word}.`));
  assert(plurals.some(question => question.visual.word === word && question.visual.count === 2 && question.answer === `They're ${plural}.`));
}

// Independent bilingual facts: the correct answer must follow an actual English
// sentence in the passage, rather than relying on its explanation field.
const readingFacts = {
  'tidy-room-book': [/The book is on the desk\./, '在书桌上'],
  'tidy-room-bag': [/The bag is under the chair\./, '在椅子下面'],
  'tidy-room-place': [/This is our classroom\./, '教室'],
  'share-crayons-number': [/Mia has two crayons\./, '2 支'],
  'share-crayons-place': [/The crayons are in her pencil case\./, '在笔袋里'],
  'share-crayons-kind': [/Mia shares her crayons with Ben\./, '和本分享蜡笔'],
  'books-and-ruler-furniture': [/This is a bookcase\./, '书柜'],
  'books-and-ruler-number': [/Three books are on it\./, '3 本'],
  'books-and-ruler-ruler': [/A ruler is next to the books\./, '紧挨着书'],
  'listen-together-name': [/Leo is our teacher\./, 'Leo'],
  'listen-together-teacher': [/He reads a book\./, '读书'],
  'listen-together-children': [/We listen to him\./, '认真倾听']
};
const reading = unit1.bank('unit1-reading');
assert.equal(reading.length, Object.keys(readingFacts).length, '每个原创阅读问题均有独立语义校验');
for (const question of reading) {
  assert(Array.isArray(question.passage) && question.passage.length >= 2, '阅读题展示英文小段落');
  for (const sentence of question.passage) {
    assert.equal(typeof sentence, 'string');
    assert(sentence.trim());
    assert(!/[\u3400-\u9fff]/.test(sentence), '阅读练习中不显示完整中文翻译直接揭露答案');
  }
  const fact = readingFacts[question.id.replace('unit1-reading-', '')];
  assert(fact, `${question.id} 有独立英语事实断言`);
  assert(question.passage.some(sentence => fact[0].test(sentence)), '正确答案所依据的英文信息确实出现在阅读正文中');
  assert.equal(question.answer, fact[1], '阅读答案与英文事实相符');
  assert(question.passage.includes(question.answerSpeech), '答案示范朗读直接支持答案的英文句子');
  if (question.glossary) {
    assert(Array.isArray(question.glossary));
    for (const entry of question.glossary) assert(entry.english?.trim() && entry.chinese?.trim(), '辅助词义有中英文');
  }
}

const kindness = unit1.bank('unit1-kindness');
const kindAnswers = {
  share: 'Share your crayons.', help: 'Help.', listen: 'Listen to your teacher.', together: 'Work together.',
  thanks: 'Thank you.', 'here-you-are': 'Thank you.', 'are-you-ok': 'Yes, thank you.', tidy: 'Put your books in your bag.',
  'listen-share': '一起分享蜡笔', 'listen-together': '一起合作', 'listen-listen': '一起听老师说话', 'listen-help': '一起帮助朋友'
};
assert.equal(kindness.length, Object.keys(kindAnswers).length, '友善与规则问题覆盖帮助、倾听、分享、合作、礼貌和整理');
for (const question of kindness) assert.equal(question.answer, kindAnswers[question.id.replace('unit1-kindness-', '')], '友善行为和英文表达含义正确');

const poster = unit1.poster;
assert(poster.title?.trim(), '主题任务有海报标题');
assert(poster.objects.length > 0 && poster.anchors.length > 0 && poster.rules.length > 0);
for (const field of ['objects', 'anchors', 'rules']) {
  assert.equal(new Set(poster[field].map(item => item.key)).size, poster[field].length, `海报 ${field} key 唯一`);
}
assert.deepEqual(poster.relations.map(relation => relation.id), Object.keys(positionMeanings), '海报实践覆盖四种位置关系');
const anchors = new Map(poster.anchors.map(anchor => [anchor.key, anchor]));
for (const anchor of poster.anchors) {
  assert(schoolWords.includes(anchor.english), '海报参照物是校园重点词');
  assert(anchor.chinese?.trim());
}
for (const object of poster.objects) {
  assert(schoolWords.includes(object.english), '海报中的小物品都是已学校园词');
  assert(object.label?.trim() && object.icon?.trim());
  assert.match(object.label, schoolMeanings[object.english]);
  assert.equal(object.plural, `${object.english}s`, '海报的可数文具和书本复数正确');
  assert(Array.isArray(object.validInAnchors));
  for (const key of object.validInAnchors) {
    assert(anchors.has(key));
    assert(['bag', 'pencil case'].includes(anchors.get(key).english), 'in 只允许可以放进物品的容器');
    assert(!(object.english === 'book' && key === 'pencil_case'), '一本书不会被生成为装进笔袋的句子');
  }
}
for (const relation of poster.relations) {
  assert.equal(relation.english, relation.id);
  assert.equal(relation.chinese, positionMeanings[relation.id]);
  assert(relation.anchors.length > 0);
  for (const key of relation.anchors) assert(anchors.has(key), '海报所有位置关系的参照物可查到');
  if (relation.id === 'in') assert(relation.anchors.every(key => ['bag', 'pencil_case'].includes(key)));
  if (['on', 'under'].includes(relation.id)) assert(relation.anchors.every(key => ['desk', 'chair'].includes(key)));
}
const posterRules = {
  share: ['Share your crayons.', '分享'], listen: ['Listen to your teacher.', '听'],
  help: ['Help your friends.', '帮助'], together: ['Work together.', '合作'], tidy: ['Put your books in your bag.', '书包']
};
assert.deepEqual(new Set(poster.rules.map(rule => rule.key)), new Set(Object.keys(posterRules)), '海报规则涵盖照片中的友善行为和自我管理');
for (const rule of poster.rules) {
  assert.equal(rule.english, posterRules[rule.key][0]);
  assert(rule.chinese.includes(posterRules[rule.key][1]), '海报规则的英文和中文含义一致');
}

// Run the data and backup modules without CommonJS or network capabilities.
const scripts = [...read('index.html').matchAll(/<script\b([^>]*)>/g)]
  .map(match => ({ attributes: match[1], source: match[1].match(/\bsrc=["']([^"']+)["']/)?.[1]?.split(/[?#]/)[0] }))
  .filter(script => script.source);
for (const script of scripts) {
  assert(!/^https?:|^\/\//i.test(script.source), '必需脚本已保存在项目内');
  assert(!/\btype\s*=\s*["']module["']/.test(script.attributes), '经典脚本保持本地打开兼容性');
  assert(fs.existsSync(path.join(repository, script.source)), `项目包含 ${script.source}`);
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(read(script.source)), '学习与备份不依赖网络接口');
}
const dependencies = ['data/english.js', 'data/english-hello.js', 'data/english-unit1.js', 'data/english-unit2.js', 'data/questions.js', 'record-backup.js'];
assert.deepEqual(scripts.filter(script => dependencies.includes(script.source)).map(script => script.source), dependencies, '新增模块经典脚本加载顺序正确');
const sandbox = {};
const context = vm.createContext(sandbox);
for (const file of dependencies) new vm.Script(read(file), { filename: file }).runInContext(context, { timeout: 1000 });
assert.deepEqual(plain(sandbox.GardenUnit1.topics), unit1.topics, '经典脚本提供相同目标');
for (const goal of goals) assert.deepEqual(plain(sandbox.GardenQuestions.bank(goal)), unit1.bank(goal), '经典脚本有完整新题');

const legacyIds = ['pinyin-59', 'arithmetic-2-1-+', english.bank('english1')[0].id, hello.bank('hello-colours')[0].id];
const oldState = {
  attempts: legacyIds.map((id, index) => ({ session: `published-${index}`, topic: oldQuestions.topics.find(topic => oldQuestions.bank(topic.id).some(question => question.id === id)).id, question: id, correct: false, review: false, time: 1000 + index })),
  sessions: [], wrong: legacyIds
};
const oldCopy = JSON.stringify(oldState);
assert.deepEqual(backup.parseBackup(JSON.stringify(oldBackup.createBackup(oldState))), oldState, '旧语文、数学、英语词条和 Hello 目标备份完整恢复');
const incoming = {
  attempts: all.map((question, index) => ({ session: `unit1-new-${index}`, topic: question.topic, question: question.id, correct: false, review: false, time: 2000 + index })),
  sessions: [], wrong: all.map(question => question.id)
};
const incomingCopy = JSON.stringify(incoming);
const restored = backup.parseBackup(JSON.stringify(backup.createBackup(incoming)));
assert.deepEqual(restored, incoming, '所有 Unit 1 新题均可导出恢复');
assert.deepEqual(plain(sandbox.GardenBackup.parseBackup(JSON.stringify(sandbox.GardenBackup.createBackup(incoming)))), incoming, '经典脚本的备份同样认识所有新题');
const merged = backup.merge(oldState, restored);
assert.equal(merged.addedAttempts, all.length);
assert.deepEqual(merged.data.attempts.slice(0, oldState.attempts.length), oldState.attempts, '导入保留旧首次结果');
assert.deepEqual(new Set(merged.data.wrong), new Set([...oldState.wrong, ...incoming.wrong]), '新旧错题均保留');
const duplicated = backup.merge(merged.data, incoming);
assert.equal(duplicated.addedAttempts, 0);
assert.equal(duplicated.addedSessions, 0);
assert.deepEqual(duplicated.data, merged.data, '重复导入不重复计数或改变数据');
for (const goal of goals) {
  const bank = unit1.bank(goal);
  for (const total of [5, 10]) {
    const id = `complete-${goal}-${total}`;
    const complete = {
      attempts: bank.slice(0, total).map((question, index) => ({ session: id, topic: goal, question: question.id, correct: index >= 2, review: false, time: 5000 + index })),
      sessions: [{ id, total, correct: total - 2, review: false, time: 5010 }],
      wrong: bank.slice(0, 2).map(question => question.id)
    };
    assert.deepEqual(backup.parseBackup(JSON.stringify(backup.createBackup(complete))), complete, `${goal} ${total} 题总结与首次正确率可恢复`);
  }
  const reviewed = bank[0];
  const review = {
    attempts: [{ session: `review-${goal}`, topic: goal, question: reviewed.id, correct: true, review: true, time: 6000 }],
    sessions: [{ id: `review-${goal}`, total: 1, correct: 1, review: true, time: 6000 }], wrong: []
  };
  const after = backup.merge(merged.data, backup.parseBackup(JSON.stringify(backup.createBackup(review)))).data;
  assert(!after.wrong.includes(reviewed.id), '新目标错题复习首次答对后移出');
  assert(legacyIds.every(id => after.wrong.includes(id)), '新目标复习不删除原错题');
  assert.equal(after.attempts.filter(attempt => attempt.question === reviewed.id).length, 2, '原错答和复习结果都保留');
}
assert.equal(JSON.stringify(oldState), oldCopy, '操作不改写原旧记录');
assert.equal(JSON.stringify(incoming), incomingCopy, '操作不改写导入数据');

console.log(`通过：Unit 1 六目标 ${all.length} 道固定题、${cardIds.size} 张双语卡，ID、唯一选项、稳定内容与学习卡隔离检查。`);
console.log('通过：图片 20 校园词、四种位置图与听辨、this／these 单复数、p／b 首音与拼写、原创阅读事实、友善表达与海报有效配置。');
console.log('通过：ddaaf5d 已发布 158 词条／316 单词练习、94 道 Hello 题／28 卡、120 语文题和 760 数学题完整对象不变。');
console.log('通过：新旧备份恢复、合并、重复导入去重、每个目标 5／10 题完整记录及错题复习；无网络经典脚本可运行。');
