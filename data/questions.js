/* 独立题库：可在这里调整知识点和原创语文示例。数学答案由程序计算。 */
(function (root) {
  const topics = [
    { id: 'parts', subject: 'math', name: '10以内分与合', icon: '🧩', description: '把一个数分成两部分' },
    { id: 'arithmetic', subject: 'math', name: '10以内加减法', icon: '🍎', description: '数一数，加一加，减一减' },
    { id: 'compare', subject: 'math', name: '比较大小', icon: '⚖️', description: '比一比，谁大谁小' },
    { id: 'advanced', subject: 'math', name: '20以内加减法', icon: '🚀', description: '可选进阶 · 准备好了再挑战' },
    { id: 'pinyin', subject: 'chinese', name: '基础拼音辨认', icon: '🎵', description: '认识声母和韵母' },
    { id: 'words', subject: 'chinese', name: '常见字词搭配', icon: '📖', description: '读一读，找到合适的字' }
  ];
  const pinyin = [
    ['“妈妈”的“妈”，声母是哪一个？','m',['m','n','b'],'读 mā 时，先闭上嘴唇。','“妈”的拼音是 mā，声母是 m。'],
    ['“爸爸”的“爸”，声母是哪一个？','b',['d','b','p'],'读 bà 时，双唇先闭合再打开。','“爸”的拼音是 bà，声母是 b。'],
    ['“大”的拼音是 dà，声母是哪一个？','d',['t','d','l'],'声母在拼音的前面。','dà 的声母是 d，韵母是 a。'],
    ['“米”的拼音是 mǐ，韵母是哪一个？','i',['a','i','u'],'去掉前面的 m，再看看。','mǐ 的韵母是 i。'],
    ['“书”的拼音是 shū，韵母是哪一个？','u',['o','e','u'],'去掉前面的 sh，再看看。','shū 的韵母是 u。'],
    ['“河”的拼音是 hé，韵母是哪一个？','e',['e','a','i'],'去掉前面的 h，再看看。','hé 的韵母是 e。'],
    ['哪一个是声母？','p',['a','p','o'],'a 和 o 都是韵母。','p 是声母；a、o 是韵母。'],
    ['哪一个是韵母？','a',['b','a','m'],'b 和 m 都是声母。','a 是韵母；b、m 是声母。'],
    ['“你”的拼音是 nǐ，声母是哪一个？','n',['m','l','n'],'声母在拼音的前面。','nǐ 的声母是 n。'],
    ['“土”的拼音是 tǔ，声母是哪一个？','t',['d','t','b'],'找拼音最前面的字母。','tǔ 的声母是 t。'],
    ['“火”的拼音是 huǒ，声母是哪一个？','h',['h','f','k'],'找拼音最前面的字母。','huǒ 的声母是 h。'],
    ['“八”的拼音是 bā，韵母是哪一个？','a',['u','o','a'],'去掉前面的 b，再看看。','bā 的韵母是 a。']
  ];
  const words = [
    ['太阳从东边升起，也叫“日”。补完整：日（ ）。','出',['出','入','下'],'太阳升起来了。','“日出”就是太阳升起。'],
    ['妈妈在田里种粮食。补完整：农（ ）。','田',['田','天','白'],'种粮食的土地叫什么？','种庄稼的田地叫“农田”。'],
    ['我们用眼睛看东西。补完整：眼（ ）。','睛',['睛','清','青'],'这个字左边有“目”。','“眼睛”帮助我们看东西。'],
    ['一只小鸟在天空中飞。补完整：小（ ）。','鸟',['鱼','鸟','马'],'想想什么动物有翅膀。','“小鸟”有翅膀，能飞翔。'],
    ['下雨时，用它挡雨。补完整：雨（ ）。','伞',['伞','火','土'],'它撑开像一顶小屋。','“雨伞”可以挡雨。'],
    ['小河里的水，叫河（ ）。','水',['水','山','木'],'小河里流动的是什么？','“河水”是河里的水。'],
    ['夜晚天空中弯弯的月（ ）。','亮',['亮','日','木'],'它在夜空中发亮。','“月亮”是我们熟悉的夜空伙伴。'],
    ['上课时，我们坐在教（ ）里。','室',['室','树','水'],'这是一个房间。','“教室”是上课的地方。'],
    ['我们在学（ ）里读书上课。','校',['校','河','云'],'这是学习的地方。','“学校”是我们读书学习的地方。'],
    ['吃饭前，要把双（ ）洗干净。','手',['手','口','山'],'它们能拿东西、写字。','“双手”就是两只手。'],
    ['冬天飘下白白的雪（ ）。','花',['花','火','石'],'它像小花一样轻轻飘落。','“雪花”是空中飘下的雪。'],
    ['走路时，要看清道（ ）。','路',['路','雨','月'],'这是供人行走的地方。','“道路”是我们行走的路。']
  ];
  function mathQuestion(topic, a, b, op) {
    let answer, prompt, hint, explanation;
    if (topic === 'parts') { answer = a-b; prompt = `${a} 可以分成 ${b} 和几？`; hint = `先数出 ${a} 个小圆点，拿走 ${b} 个，再数剩下的。`; explanation = `${b} + ${answer} = ${a}，所以 ${a} 可以分成 ${b} 和 ${answer}。`; }
    else if (topic === 'compare') { answer = a === b ? '=' : a > b ? '>' : '<'; prompt = `${a} ○ ${b}`; hint = '开口朝着大数，尖尖朝着小数；一样多就用等号。'; explanation = a === b ? `${a} 和 ${b} 一样大，用 =。` : `${Math.max(a,b)} 比 ${Math.min(a,b)} 大，所以 ${a} ${answer} ${b}。`; }
    else { answer = op === '+' ? a+b : a-b; prompt = `${a} ${op === '-' ? '−' : '+'} ${b} = ?`; hint = op === '+' ? `从 ${a} 开始，再往后数 ${b} 步。` : `从 ${a} 开始，往前数 ${b} 步。`; explanation = `${a} ${op === '-' ? '−' : '+'} ${b} = ${answer}。${op === '+' ? '加法把两部分合起来。' : '减法算拿走后还剩多少。'}`; }
    const choices = topic === 'compare' ? ['>','=','<'] : [answer, answer === 0 ? 1 : answer-1, answer === 0 ? 2 : answer+1];
    return {id:`${topic}-${a}-${b}-${op || ''}`,topic,prompt,answer:String(answer),choices:choices.map(String),hint,explanation,math:{a,b,op:op||null}};
  }
  function bank(topic) {
    if (topic === 'pinyin' || topic === 'words') return (topic === 'pinyin' ? pinyin : words).map((q,i)=>({id:`${topic}-${i}`,topic,prompt:q[0],answer:q[1],choices:q[2],hint:q[3],explanation:q[4]}));
    const items = [], max = topic === 'advanced' ? 20 : 10;
    for(let a=0;a<=max;a++) for(let b=0;b<=max;b++) {
      if(topic === 'parts') {if(a>=2 && b>=1 && b<a) items.push(mathQuestion(topic,a,b));}
      else if(topic === 'compare') items.push(mathQuestion(topic,a,b));
      else {if(a+b<=max) items.push(mathQuestion(topic,a,b,'+')); if(a>=b) items.push(mathQuestion(topic,a,b,'-'));}
    }
    return items;
  }
  function shuffle(list) {const result=[...list]; for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];} return result;}
  root.GardenQuestions = {topics,bank,shuffle,mathQuestion};
  if(typeof module !== 'undefined') module.exports = root.GardenQuestions;
})(typeof window !== 'undefined' ? window : globalThis);
