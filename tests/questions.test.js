const assert=require('node:assert/strict');
const {topics,bank}=require('../data/questions.js');
let total=0;
for(const topic of topics){const qs=bank(topic.id);assert(qs.length>=10);assert.equal(new Set(qs.map(q=>q.id)).size,qs.length);for(const q of qs){total++;assert.equal(q.choices.filter(c=>c===q.answer).length,1);assert.equal(new Set(q.choices).size,q.choices.length);assert(q.hint&&q.explanation);if(q.math){const {a,b,op}=q.math;let expected=topic.id==='parts'?a-b:topic.id==='compare'?(a===b?'=':a>b?'>':'<'):op==='+'?a+b:a-b;assert.equal(q.answer,String(expected));if(topic.id!=='compare')assert(Number(q.answer)>=0&&Number(q.answer)<=(topic.id==='advanced'?20:10));}}}
console.log(`通过：${total} 道题的答案、唯一选项和题目 ID 检查。`);
