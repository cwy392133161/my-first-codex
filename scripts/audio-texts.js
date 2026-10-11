'use strict';
// Development helper. The website loads the finished MP3 files and needs no Node.
const english=require('../data/english.js');
const hello=require('../data/english-hello.js');
const unit1=require('../data/english-unit1.js');
const unit2=require('../data/english-unit2.js');
const questions=require('../data/questions.js');
const canonical=text=>String(text).replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'').toLowerCase();
const sentences=text=>(String(text).match(/[^.!?]+[.!?]*/g)||[]).map(s=>s.trim()).filter(Boolean);

function collect() {
  const texts=[];
  const add=(text,source)=>{if(text)texts.push({text,source});};
  for(const unit of english.units) for(const word of english.vocabulary(unit.id)) add(word.speech||word.english,'word:'+unit.id+':'+word.key);
  for(const person of hello.characters) add(person.name,'character');
  for(const topic of questions.topics.filter(t=>t.subject==='english')) for(const q of questions.bank(topic.id)) {
    add(q.speech,'question:'+q.id);
    add(q.answerSpeech,'answer:'+q.id);
    if(q.passage?.length)add(q.passage.join(' '),'reading:'+q.id);
  }
  for(const group of [hello,unit1,unit2]) for(const topic of group===unit2?[...group.topics,group.reviewTopic]:group.topics) for(const card of group.lesson(topic.id)) {
    add(card.sayModel,'model:'+card.id);
    if(!topic.id.endsWith('-phonics'))add(card.lines.map(line=>line.english).join(' '),'lesson:'+card.id);
  }
  add('This is our classroom poster.','poster');
  const positions=[['on','desk'],['in','bag'],['under','chair'],['next to','pencil case']];
  for(const object of unit1.poster.objects) for(const [relation,anchor] of positions) for(const plural of [false,true]) add(`The ${plural?object.plural:object.english} ${plural?'are':'is'} ${relation} the ${anchor}.`,'poster');
  for(const rule of unit1.poster.rules)add('Our classroom rule: '+rule.english,'poster-rule');
  for(const title of ['All about me','My hair and eyes','My family','My favourite'])add(title+'.','booklet-title');
  for(const person of unit2.booklet.names)add(`I'm ${person.name}.`,'booklet-name');
  const numbers=['','one','two','three','four','five','six','seven','eight','nine','ten'];
  for(const age of unit2.booklet.ages)add(`I'm ${numbers[age]}.`,'booklet-age');
  for(const colour of unit2.booklet.hairColours)add(`I've got ${colour.english} hair.`,'booklet-hair');
  for(const colour of unit2.booklet.eyeColours)add(`I've got ${colour.english} eyes.`,'booklet-eyes');
  for(const person of unit2.booklet.family)add(`${person.pronoun==='he'?"He's":"She's"} my ${person.english}.`,'booklet-family');
  for(const item of unit2.booklet.favourites)add(`This is my ${item.english}.`,'booklet-favourite');
  const clips=new Map();
  for(const {text,source} of texts) for(const sentence of sentences(text)) {
    const key=canonical(sentence);
    if(!clips.has(key))clips.set(key,{key,text:sentence,sources:[]});
    const clip=clips.get(key);
    if(!clip.sources.includes(source))clip.sources.push(source);
  }
  // Build common playback checks first; this affects build order only, not IDs.
  const priority=new Set([
    'wall','black','one','This is my family.','My mum is Nina.','My brother is Leo.','We share a book.',
    'mother, father, brother','This is our classroom poster.','The rulers are on the desk.',
    'The pencil is in the bag.','The rubber is under the chair.','The pen is next to the pencil case.',
    'Our classroom rule: Help your friends.','All about me.','I\'m Ben.','I\'m ten.','My hair and eyes.',
    'I\'ve got blond hair.','I\'ve got green eyes.','My family.','He\'s my grandpa.','She\'s my sister.',
    'My favourite.','This is my cat.'
  ].map(canonical));
  return {texts,clips:[...clips.values()].sort((a,b)=>Number(priority.has(b.key))-Number(priority.has(a.key)) || a.key.localeCompare(b.key))};
}
module.exports={canonical,sentences,collect};
if(require.main===module)process.stdout.write(JSON.stringify(collect(),null,2)+'\n');
