(() => {
  'use strict';
  const {topics,bank,shuffle}=GardenQuestions;
  const app=document.querySelector('#app'), key='learning-garden-v1';
  let state={attempts:[],sessions:[],wrong:[]}, count=5, run=null, storageWarning='', importBusy=false, includeExtra=false, englishMode='mixed', study=null, speechToken=0, speechStartTimer=null, speechEndTimer=null, posterDraft=null, bookletDraft=null, farmDraft=null;
  try { const saved=JSON.parse(localStorage.getItem(key)); if(saved && Array.isArray(saved.attempts) && Array.isArray(saved.sessions) && Array.isArray(saved.wrong)) state=saved; }
  catch { storageWarning='浏览器记录暂时无法读取。本次仍可练习，请确认浏览器允许本地存储。'; }
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const topicName=id=>topics.find(t=>t.id===id)?.name || id;
  const resolve=id=>{const topic=topics.find(t=>id.startsWith(t.id+'-'));return topic ? bank(topic.id).find(q=>q.id===id) : null;};
  function save(nextState=state){try{localStorage.setItem(key,JSON.stringify(nextState));state=nextState;storageWarning='';return true;}catch{storageWarning='记录未能保存，可能是浏览器存储受限或已满。离开页面后本次记录可能丢失。';return false;}}
  function draw(html){stopSpeech();app.innerHTML=html+(storageWarning?`<p class="notice" role="alert">${escape(storageWarning)}</p>`:'');}
  function back(){return '<button class="back" data-action="home">← 回到首页</button>';}
  function home(){run=null;study=null;draw(`<section class="hero"><span class="flower" aria-hidden="true">🌼</span><div class="eyebrow">一年级 · 上学期基础练习</div><h1>今天，学一点新本领</h1><p>慢慢想，勇敢试。每一次练习都算进步。</p></section><div class="grid"><button class="tile" data-action="subject" data-id="math"><span class="icon">🍎</span><strong>数学练习</strong><small>分与合 · 加减法 · 比大小</small></button><button class="tile peach" data-action="subject" data-id="chinese"><span class="icon">📚</span><strong>语文练习</strong><small>基础拼音 · 字词搭配</small></button><button class="tile mint" data-action="subject" data-id="english"><span class="icon">🌍</span><strong>英语学习</strong><small>Power Up · Hello 与 Unit 1–4</small></button><button class="tile lavender" data-action="review"><span class="icon">🌷</span><strong>错题复习</strong><small>${state.wrong.length ? `${state.wrong.length} 道题，陪你再试一试` : '一步一步，把知识学牢'}</small></button><button class="tile blue" data-action="records"><span class="icon">🌿</span><strong>学习记录</strong><small>家长查看 · 发现小进步</small></button></div>`);}
  function subject(id){study=null;if(id==='hello'){helloGoals();return;}if(id==='unit1'){unit1Goals();return;}if(['unit2','unit3','review02'].includes(id)){goalOverview(id);return;}if(id==='english'){englishUnits();return;}draw(`${back()}<h1>${id==='math'?'数学练习':'语文练习'}</h1><p>选一个知识点，开始今天的小练习。</p><div class="row count" aria-label="每次题数"><span>每次练习</span>${[5,10].map(n=>`<button data-action="count" data-id="${id}" data-count="${n}" aria-pressed="${count===n}">${n} 题</button>`).join('')}</div><div class="grid">${topics.filter(t=>t.subject===id).map(t=>`<button class="tile" data-action="start" data-id="${t.id}"><span class="icon">${t.icon}</span><strong>${t.name}</strong><small>${t.description}</small>${t.subject==='chinese'?`<small>固定题 ${bank(t.id).length} 道</small>`:''}</button>`).join('')}</div><p class="muted">原创基础题库，可按孩子的教材调整。</p>`);}
  function review(){const ids=state.wrong.filter(id=>resolve(id));draw(`${back()}<h1>错题复习</h1><p>错题是学习的小脚印。我们一起再试一试。</p>${ids.length?`<div class="panel"><h2>还有 ${ids.length} 道题等你复习</h2><p>复习时，第一次答对就会从错题本移除。提示后答对的题保留，方便下次再练。</p><div class="row count">${[5,10].map(n=>`<button data-action="review-count" data-count="${n}" aria-pressed="${count===n}">${n} 题</button>`).join('')}</div><p class="muted">本次练习 ${Math.min(count,ids.length)} 道，不重复凑题。</p><button class="primary" data-action="start-review">开始复习</button></div>`:'<div class="panel empty"><div class="icon">🌼</div><h2>还没有错题</h2><p>先选一个知识点练习吧！</p><button class="primary" data-action="home">去练习</button></div>'}`);}
  function start(topic,reviewing=false){study=null;const pool=reviewing?state.wrong.map(resolve).filter(Boolean):topic.startsWith('english')?englishPool(topic):bank(topic);run={id:`${Date.now()}-${Math.random()}`,questions:shuffle(pool).slice(0,count).map(q=>({...q,choices:shuffle(q.choices)})),index:0,firstCorrect:0,recovered:0,reviewing,tries:0,phase:'answer',selected:null};if(!run.questions.length){review();return;}question();}
  function question() {
    const q=run.questions[run.index], listening=q.kind==='listening', recordedOnly=q.topic.startsWith('unit3-');
    const englishQuestion=topics.find(t=>t.id===q.topic)?.subject==='english';
    const audio=listening
      ? `<div class="audio-tools"><button class="primary" data-action="listen" ${audioButtonAttrs(q.speech,recordedOnly)}>🔊 听题目</button><button class="secondary" data-action="show-listening-text">显示文字提示</button><p class="speech-status muted" role="status" aria-live="polite">${audioPreparation(q.speech,recordedOnly)}</p><p class="listening-text" ${run.listeningText?'':'hidden'}>${escape(q.fallbackPrompt)}</p></div>`
      : q.speech || (run.phase==='done' && q.answerSpeech)
        ? `<div class="audio-tools"><button class="secondary" data-action="speak" data-text="${escape(q.speech || q.answerSpeech)}" ${audioButtonAttrs(q.speech || q.answerSpeech,recordedOnly)}>🔊 听一听</button><p class="speech-status muted" role="status" aria-live="polite">${audioPreparation(q.speech || q.answerSpeech,recordedOnly)}</p></div>` : '';
    draw(`<button class="back" data-action="leave">← 结束这次练习</button><div class="row"><strong>${run.reviewing?'错题复习':topicName(q.topic)}</strong><span class="muted">第 ${run.index+1} / ${run.questions.length} 题</span></div><div class="progress" aria-label="练习进度"><div style="width:${(run.index/run.questions.length)*100}%"></div></div><section class="panel"><div class="question" data-question-id="${escape(q.id)}">${escape(q.prompt)}</div>${q.visual?'<div class="question-visual">'+visual(q.visual)+'</div>':''}${reading(q)}${listening?audio:''}<div class="choices ${englishQuestion?'english-choices':''}">${q.choices.map(c=>`<button data-action="answer" data-answer="${escape(c)}" ${run.phase!=='answer'?'disabled':''} class="${run.selected===c?'selected':''} ${c.length>2?'long-answer':''}">${escape(c)}</button>`).join('')}</div>${listening?'':audio}<div id="feedback" aria-live="polite">${feedback(q)}</div></section><p class="muted">不着急，认真想一想。</p>`);
    if (listening && !window.GardenAudio?.has(q.speech) && (recordedOnly || !speechAvailable())) {
      showListeningText();
      app.querySelector('.speech-status').textContent=recordedOnly?'这段新朗读正在准备，已显示文字提示，可以继续练习。':'当前没有可用音频，已显示文字提示，可以继续练习。';
    }
  }
  function visual(item) {
    if (!item) return '';
    if (item.type==='number') return `<div class="number-picture learning-visual" aria-label="数字 ${escape(item.value)}">${escape(item.value)}</div>`;
    if (item.type==='count') return `<div class="count-picture learning-visual" role="img" aria-label="${escape(item.count)} 个物品">${Array.from({length:item.count},()=>`<span aria-hidden="true">${escape(item.icon || '⭐')}</span>`).join('')}</div>`;
    if (item.type==='colour') return `<div class="colour-picture learning-visual" role="img" aria-label="${escape(item.label || '颜色图')}" style="background-color:${escape(item.value)}"></div>`;
    if (item.type==='position') return `<div class="position-picture learning-visual">${positionSvg(item)}</div>`;
    if (item.type==='person') return `<div class="person-picture learning-visual">${personSvg(item)}</div>`;
    if (item.type==='body') return `<div class="body-picture learning-visual">${bodySvg(item.part)}</div>`;
    if (item.type==='sense') return `<div class="sense-picture learning-visual" role="img" aria-label="${escape(item.label || '感官图示')}"><span aria-hidden="true">${escape(item.icon)}</span></div>`;
    if (item.type==='farm-animal') return farmVisual(item);
    if (item.type==='objects') return `<div class="objects-picture learning-visual" role="img" aria-label="${escape(item.count)} 个${escape(item.word)}">${Array.from({length:item.count},()=>`<span aria-hidden="true">${escape(item.icon || '📚')}</span>`).join('')}<small>${escape(item.word)}</small></div>`;
    return '';
  }
  function reading(q) {
    if (!q.passage?.length) return q.glossary?.length?`<details class="goal-glossary"><summary>看看词语帮助</summary><p>${q.glossary.map(word=>`${escape(word.english)}：${escape(word.chinese)}`).join('；')}</p></details>`:'';
    const audio=q.passage.join(' '), recordedOnly=q.topic.startsWith('unit3-');
    return `<section class="reading-passage"><strong>读一读 · 原创小故事</strong>${q.passage.map(line=>`<p lang="en">${escape(line)}</p>`).join('')}<button class="secondary" data-action="read-passage" data-text="${escape(audio)}" ${audioButtonAttrs(audio,recordedOnly)}>🔊 听故事</button><p class="speech-status muted" role="status" aria-live="polite">${audioPreparation(audio,recordedOnly)}</p>${q.glossary?.length?`<details><summary>看看词语帮助</summary><p>${q.glossary.map(word=>`${escape(word.english)}：${escape(word.chinese)}`).join('；')}</p></details>`:''}</section>`;
  }
  function audioButtonAttrs(text,recordedOnly=false) {
    return recordedOnly?`data-recorded-only="true" ${window.GardenAudio?.has(GardenSpeechText.text(text))?'':'disabled aria-label="这段新朗读正在准备"'}`:'';
  }
  function audioPreparation(text,recordedOnly=false) {
    return recordedOnly && !window.GardenAudio?.has(GardenSpeechText.text(text))?'这段新朗读正在准备，先看文字练习。':'';
  }
  function farmVisual(item) {
    const icons={cat:'🐈',chicken:'🐔',cow:'🐄',dog:'🐕',donkey:'🫏',duck:'🦆',goat:'🐐',horse:'🐎',sheep:'🐑',spider:'🕷️',bee:'🐝'};
    const n=Math.min(3,Math.max(1,Number(item.count) || 1)), icon=icons[item.animal] || item.icon || '🐾';
    const size={small:'小的',big:'大的',little:'小的',long:'长的',short:'短的'}[item.size];
    const mood={angry:'生气的',beautiful:'美丽的',funny:'滑稽的',happy:'高兴的',sad:'伤心的',tired:'困倦的',ugly:'故事中描述为“丑的”'}[item.mood];
    const label=item.label || [size,mood].filter(Boolean).join(' · ') || '动物示意图';
    // The donkey emoji is new and can be missing on older tablets. This small
    // original drawing also keeps that animal visible without external assets.
    const drawing=item.animal==='donkey'?'<svg viewBox="0 0 112 112" aria-hidden="true"><path d="M36 81v22M53 83v20M78 81v22M92 78v25" stroke="#7a8790" stroke-width="7" stroke-linecap="round"/><path d="M95 64q12 1 12 18" fill="none" stroke="#7a8790" stroke-width="5"/><ellipse cx="65" cy="68" rx="34" ry="20" fill="#a5aeb3"/><path d="M25 53L13 18q-2-7 3-8t8 7l12 29M37 49l4-36q1-7 6-6t4 9l-4 36" fill="#a5aeb3" stroke="#7a8790" stroke-width="3"/><ellipse cx="31" cy="55" rx="15" ry="24" fill="#a5aeb3"/><ellipse cx="26" cy="72" rx="19" ry="11" fill="#d0d6d7"/><circle cx="23" cy="51" r="3" fill="#30463d"/><circle cx="15" cy="71" r="2" fill="#7a8790"/><path d="M29 36l7 5 6-4 5 5" fill="none" stroke="#56636c" stroke-width="5"/></svg>':escape(icon);
    return `<div class="farm-animal-picture learning-visual ${item.size==='small' || item.size==='little'?'farm-small':''}" role="img" aria-label="${escape(label)}，${n} 只动物"><div class="farm-animal-row">${Array.from({length:n},()=>`<span aria-hidden="true">${drawing}</span>`).join('')}</div><div class="farm-visual-label">${escape(label)}</div>${item.trait?`<div class="farm-trait-label">${escape(item.trait)}</div>`:''}</div>`;
  }
  function personSvg(item) {
    const hair={black:'#34383b',brown:'#805438',blond:'#e5bd58'}[item.hair] || '#805438';
    const eyes={blue:'#4a8aba',brown:'#855238',green:'#549276'}[item.eyes] || '#4a8aba';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" role="img" aria-label="${escape(item.label || '原创示例人物')}"><rect x="10" y="10" width="260" height="260" rx="28" fill="#f0f5eb"/><path d="M76 265v-27q0-59 64-59t64 59v27" fill="#8bb5bb"/><circle cx="74" cy="119" r="14" fill="#f1caa6"/><circle cx="206" cy="119" r="14" fill="#f1caa6"/><ellipse cx="140" cy="119" rx="66" ry="79" fill="#f1caa6"/><path d="M74 110V72q0-44 66-44t66 44v39l-16-34-21 13-22-23-25 23-29-12Z" fill="${hair}"/><ellipse cx="115" cy="123" rx="12" ry="14" fill="white"/><ellipse cx="165" cy="123" rx="12" ry="14" fill="white"/><circle cx="115" cy="124" r="9" fill="${eyes}"/><circle cx="165" cy="124" r="9" fill="${eyes}"/><circle cx="115" cy="124" r="4" fill="#2d3935"/><circle cx="165" cy="124" r="4" fill="#2d3935"/><path d="M138 136l-5 17h10M117 168q23 17 46 0" fill="none" stroke="#a76650" stroke-width="3" stroke-linecap="round"/></svg>`;
  }
  function bodySvg(part) {
    if (part==='tail') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 290" role="img" aria-label="看红圈标出的动物部位"><rect x="10" y="10" width="300" height="270" rx="24" fill="#f1f5eb"/><ellipse cx="149" cy="168" rx="65" ry="44" fill="#ccae88"/><path d="M96 186v48M134 200v34M173 200v34M199 186v48" stroke="#a58362" stroke-width="17" stroke-linecap="round"/><circle cx="82" cy="137" r="35" fill="#ccae88"/><path d="M52 111l3-30 22 23M88 104l20-23 2 33" fill="#a58362"/><circle cx="70" cy="132" r="4" fill="#30463d"/><circle cx="89" cy="132" r="4" fill="#30463d"/><path d="M79 143l7 0-3 6Z" fill="#a1665b"/><path d="M205 159q63-7 54-78" fill="none" stroke="#a58362" stroke-width="16" stroke-linecap="round"/><ellipse cx="251" cy="116" rx="36" ry="54" fill="none" stroke="#ce6265" stroke-width="5"/><text x="160" y="264" text-anchor="middle" font-size="17" fill="#627368">看红圈标出的部位</text></svg>`;
    const marks={
      arm:[[105,147,21,30]],body:[[160,166,37,38]],ear:[[108,85,13,17]],eye:[[142,81,12,11]],face:[[160,88,34,29]],
      foot:[[139,250,20,13]],feet:[[139,250,20,13],[181,250,20,13]],hair:[[160,49,41,19]],hand:[[86,179,17,19]],
      head:[[160,78,53,52]],leg:[[143,220,15,27]],mouth:[[160,108,17,10]],nose:[[160,92,11,12]]
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 290" role="img" aria-label="看红圈标出的人物部位"><rect x="10" y="10" width="300" height="270" rx="24" fill="#f1f5eb"/><path d="M124 132L94 170M196 132l30 38" stroke="#f0caa6" stroke-width="20" stroke-linecap="round"/><path d="M142 193v48M179 193v48" stroke="#80a4b4" stroke-width="21" stroke-linecap="round"/><path d="M139 249h-12M181 249h12" stroke="#546c7e" stroke-width="18" stroke-linecap="round"/><rect x="126" y="126" width="68" height="74" rx="18" fill="#9ebead"/><circle cx="111" cy="85" r="10" fill="#f0caa6"/><circle cx="209" cy="85" r="10" fill="#f0caa6"/><ellipse cx="160" cy="80" rx="46" ry="49" fill="#f0caa6"/><path d="M114 76V49q6-31 46-27t46 27v27l-14-19-20 6-18-11-22 12-13-6Z" fill="#785943"/><circle cx="142" cy="81" r="4" fill="#30463d"/><circle cx="179" cy="81" r="4" fill="#30463d"/><path d="M160 86l-3 10h6M147 107q13 9 26 0" fill="none" stroke="#a76958" stroke-width="3" stroke-linecap="round"/><path d="M81 178v-10M86 176v-11M91 179v-9M77 182l-5-6" stroke="#f0caa6" stroke-width="5" stroke-linecap="round"/><circle cx="86" cy="179" r="10" fill="#f0caa6"/><circle cx="234" cy="179" r="10" fill="#f0caa6"/>${(marks[part] || marks.body).map(([x,y,rx,ry])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="#ce6265" stroke-width="5"/>`).join('')}<text x="160" y="276" text-anchor="middle" font-size="15" fill="#627368">看红圈标出的部位</text></svg>`;
  }
  function objectShape(key) {
    const shapes={
      book:'<rect x="1" y="1" width="40" height="28" rx="3" fill="#529374" stroke="#315841" stroke-width="2"/><path d="M7 2v25M8 25h31" stroke="#f8f6ee" stroke-width="3"/>',
      pen:'<path d="M4 24L28 1l8 7L12 31Z" fill="#3879b5" stroke="#31506c" stroke-width="2"/><path d="M4 24l-2 9 10-2" fill="#ddc29b"/>',
      pencil:'<path d="M4 24L28 1l8 7L12 31Z" fill="#f4c758" stroke="#947631" stroke-width="2"/><path d="M4 24l-2 9 10-2" fill="#cfad79"/><path d="M2 33l2-7 5 5" fill="#394139"/>',
      crayon:'<path d="M4 23L27 1l8 7L12 30Z" fill="#e76f74" stroke="#934448" stroke-width="2"/><path d="M4 23l-3 10 11-3" fill="#ad515b"/><path d="M12 16l8 8M24 4l8 8" stroke="#f8cccc" stroke-width="4"/>',
      rubber:'<rect x="2" y="8" width="37" height="20" rx="4" fill="#e8a8bc" stroke="#9c6d7e" stroke-width="2"/><path d="M26 8v20" stroke="#f8d9e2" stroke-width="5"/>',
      ruler:'<rect x="1" y="10" width="41" height="16" rx="2" fill="#99cad1" stroke="#4b7b83" stroke-width="2"/><path d="M7 11v8M14 11v5M21 11v8M28 11v5M35 11v8" stroke="#3f6a74" stroke-width="2"/>',
      bag:'<path d="M12 9V5q8-7 16 0v4" fill="none" stroke="#54816a" stroke-width="3"/><rect x="3" y="9" width="34" height="26" rx="7" fill="#b0d0ac" stroke="#54816a" stroke-width="2"/><rect x="11" y="19" width="19" height="11" rx="3" fill="#88b795" stroke="#54816a"/>'
    };
    return shapes[key] || shapes.book;
  }
  function positionSvg(item) {
    const anchorKey=item.anchor.replace(/ /g,'_');
    const anchors={
      desk:'<rect x="70" y="86" width="180" height="18" rx="4" fill="#ba8e65"/><path d="M85 104v58M231 104v58" stroke="#8d674c" stroke-width="12"/>',
      chair:'<rect x="116" y="106" width="96" height="15" rx="4" fill="#97b5c1"/><rect x="185" y="53" width="19" height="58" rx="5" fill="#97b5c1"/><path d="M127 121v45M200 121v45" stroke="#678994" stroke-width="10"/>',
      bag:'<path d="M143 72V59q21-26 42 0v13" fill="none" stroke="#5f856d" stroke-width="7"/><rect x="120" y="72" width="89" height="90" rx="18" fill="#d8e8d4" stroke="#6a9379" stroke-width="3"/><path d="M126 85h77" stroke="#6a9379" stroke-width="3"/>',
      pencil_case:'<rect x="94" y="100" width="134" height="51" rx="13" fill="#ead5bb" stroke="#a78964" stroke-width="3"/><path d="M102 111h118" stroke="#a78964" stroke-width="3"/>'
    };
    const count=item.count || 1;
    const height={book:29,pen:33,pencil:33,crayon:33,rubber:28,ruler:26,bag:36}[item.object] || 29;
    const left={desk:70,chair:116,bag:120,pencil_case:94}[anchorKey] || 70;
    const coords=item.relation==='next to' ? [Math.max(10,left-(42*.8+(count-1)*10)-10),116,.8]
      : item.relation==='in' ? (anchorKey==='pencil_case'?[143,117,.65]:[144,100,.65])
      : item.relation==='under' ? [139,137,.8]
      : [140,(anchorKey==='chair'?106:86)-height*.8,.8];
    const objects=Array.from({length:count},(_,i)=>`<g transform="translate(${coords[0]+i*10} ${coords[1]}) scale(${coords[2]})">${objectShape(item.object)}</g>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 210" role="img" aria-label="${escape(item.object)} 与 ${escape(item.anchor)} 的位置图"><rect x="10" y="8" width="300" height="168" rx="20" fill="#f4f6ec"/>${anchors[anchorKey] || anchors.desk}${objects}<text x="160" y="199" text-anchor="middle" font-size="17" fill="#426052" font-family="Arial, sans-serif">${escape(item.object)} · ${escape(item.anchor.replace(/_/g,' '))}</text></svg>`;
  }
  function showListeningText() {
    if (!run || run.questions[run.index].kind!=='listening') return;
    run.listeningText=true;
    const text=app.querySelector('.listening-text');
    if (text) text.hidden=false;
  }
  function feedback(q){if(run.phase==='answer')return '';if(run.phase==='retry')return `<div class="feedback"><strong>再想一想，你可以的 🌱</strong><div>${escape(q.hint)}</div><button class="secondary" data-action="retry">再试一次</button></div>`;const correct=run.selected===q.answer;return `<div class="feedback ${correct?'good':''}"><strong>${correct?(run.tries===1?'答对啦！🌟':'这次答对啦！🌷'):`答案是 ${escape(q.answer)}`}</strong><div>${escape(q.explanation)}</div><button class="primary" data-action="next">${run.index+1===run.questions.length?'看看练习总结':'下一题 →'}</button></div>`;}
  function answer(value){if(!run || run.phase!=='answer')return;const q=run.questions[run.index];if(!q.choices.includes(value))return;run.phase='locked';run.selected=value;run.tries++;const correct=value===q.answer;
    if(run.tries===1){state.attempts.push({session:run.id,topic:q.topic,question:q.id,correct,review:run.reviewing,time:Date.now()});if(correct){run.firstCorrect++;if(run.reviewing)state.wrong=state.wrong.filter(id=>id!==q.id);}else if(!state.wrong.includes(q.id))state.wrong.push(q.id);save();}
    if(correct && run.tries===2)run.recovered++;run.phase=correct||run.tries===2?'done':'retry';question();}
  function next(){if(!run||run.phase!=='done')return;run.phase='locked';if(run.index+1===run.questions.length){state.sessions.push({id:run.id,time:Date.now(),total:run.questions.length,correct:run.firstCorrect,review:run.reviewing});save();summary();}else{run.index++;run.tries=0;run.phase='answer';run.selected=null;run.listeningText=false;question();}}
  function summary(){const r=run;run=null;draw(`<section class="panel empty"><div class="icon">🌻</div><h1>这次练习完成啦！</h1><p>认真思考的你，又向前走了一小步。</p><div class="stats"><div class="stat"><strong>${r.questions.length}</strong>完成题数</div><div class="stat"><strong>${r.firstCorrect}</strong>首次答对</div><div class="stat"><strong>${r.recovered}</strong>再试答对</div></div><p>不会的题可以慢慢练，学习不必着急。</p><div class="row"><button class="primary" data-action="home">回到小乐园</button><button class="secondary" data-action="review">看看错题</button></div></section>`);}
  function records(message=''){draw(`${back()}<h1>学习记录</h1><p>给家长的小窗口：看看孩子的进步，也找到需要陪伴的地方。</p><div class="stats"><div class="stat"><strong>${state.sessions.length}</strong>完整练习</div><div class="stat"><strong>${state.attempts.length}</strong>已答题数</div><div class="stat"><strong>${state.wrong.length}</strong>待复习错题</div></div><section class="panel">${topics.map(t=>{const a=state.attempts.filter(a=>a.topic===t.id);const times=new Set(a.map(a=>a.session)).size;return `<div class="record"><strong>${t.icon} ${t.name}</strong><p>练习 ${times} 次 · 首次作答正确率 ${a.length?Math.round(a.filter(a=>a.correct).length/a.length*100)+'%':'暂无'}</p><small class="muted">${a.length?`${a.length} 题中首次答对 ${a.filter(a=>a.correct).length} 题`:'还没有练习记录'}</small></div>`;}).join('')}</section><p class="muted">练习次数按已作答的练习统计，含错题复习和未完成练习。正确率只计每题首次作答，重试不覆盖原结果。记录仅在当前浏览器保存，暂不支持跨设备同步。</p><section class="panel"><h2>备份与恢复</h2><p>把练习统计和错题保存成文件，换浏览器或设备时可以手动恢复。</p><div class="row backup-actions"><button class="primary" data-action="export">导出备份</button><button class="secondary" data-action="import">导入恢复</button></div><input id="backup-file" type="file" accept=".json,application/json" aria-label="选择学习记录备份" hidden><p class="muted">导入会合并现有记录，相同记录只计一次。不会清空原记录，也不会自动同步。</p><p id="backup-status" role="${message.includes('失败')?'alert':'status'}" aria-live="polite">${escape(message)}</p></section><button class="danger" data-action="clear">清空学习记录</button>`);}
  function englishPool(topic) {
    return bank(topic).filter(q => (includeExtra || !q.extended) && (englishMode==='mixed' || q.direction===englishMode));
  }
  function englishUnits() {
    draw(`${back()}<div class="eyebrow">Power Up · 图片词表</div><h1>英语学习</h1><p>看词听读 → 选择练习 → 错题巩固</p><p class="muted">先按你提供的 Hello 和 Unit 1–4 词表学习，题目为原创练习。</p><div class="row count" aria-label="每次题数"><span>每次练习</span>${[5,10].map(n=>`<button data-action="count" data-id="english" data-count="${n}" aria-pressed="${count===n}">${n} 题</button>`).join('')}</div><div class="row count" aria-label="练习方式">${[['mixed','综合练习'],['meaning','选中文'],['word','选英文']].map(([mode,name])=>`<button data-action="english-mode" data-mode="${mode}" aria-pressed="${englishMode===mode}">${name}</button>`).join('')}</div><label class="extension-toggle"><input id="include-extra" type="checkbox" ${includeExtra?'checked':''}> 包含拓展词（词表标 *）</label><div class="grid english-units">${GardenEnglish.units.map(unit=>{const all=GardenEnglish.vocabulary(unit.id);const words=all.filter(w=>includeExtra || !w.extended);return `<article class="tile english-unit" data-topic="${unit.id}"><span class="icon" aria-hidden="true">${unit.icon}</span><strong>${unit.label} · ${unit.name}</strong><small>${all.filter(w=>!w.extended).length} 个核心词 · ${all.filter(w=>w.extended).length} 个拓展词</small><small>本次可学 ${words.length} 词 · ${englishPool(unit.id).length} 道原创选择题</small>${unit.id==='englishhello'?'<button class="goal-entry secondary" data-action="hello-goals">按学习目标学 Hello →</button>':''}${unit.id==='english1'?'<button class="goal-entry secondary" data-action="unit1-goals">按学习目标学 Unit 1 →</button>':''}${unit.id==='english2'?'<button class="goal-entry secondary" data-action="unit2-goals">按学习目标学 Unit 2 →</button>':''}${unit.id==='english3'?'<button class="goal-entry secondary" data-action="unit3-goals">按学习目标学 Unit 3 →</button>':''}<div class="row unit-actions"><button class="secondary" data-action="learn" data-id="${unit.id}">学单词</button><button class="primary" data-action="start" data-id="${unit.id}">开始练习</button></div></article>`;}).join('')}</div><section class="panel review-entry"><h2>Hello～Unit 2 综合复习</h2><p>一起练名字、年龄、颜色、学校物品和家人。</p><button class="primary" data-action="review02-goals">我来复习 0～2 单元 →</button></section><p class="muted">单词学习不计入答题统计；练习按单元记录首次作答结果。点击发音按钮可听示范音频，播放时请打开媒体音量。</p>`);
  }
  function learnWords(topic) {
    const words=GardenEnglish.vocabulary(topic).filter(w=>includeExtra || !w.extended);
    if (!words.length) { subject('english');return; }
    study={topic,words,index:0};
    wordCard();
  }
  function wordCard() {
    const word=study.words[study.index];
    draw(`<button class="back" data-action="subject" data-id="english">← 返回英语单元</button><div class="row"><strong>${escape(topicName(study.topic))}</strong><span class="muted">第 ${study.index+1} / ${study.words.length} 个词</span></div><section class="panel word-card">${word.extended?'<span class="eyebrow">拓展词 *</span>':''}<div class="vocab-word" lang="en">${escape(word.english)}</div><div class="vocab-meaning">${escape(word.meaning)}</div><p>${escape(word.hint)}</p><button class="primary" data-action="speak" data-text="${escape(word.speech || word.english)}">🔊 听单词</button><p class="speech-status muted" role="status" aria-live="polite">听完后，自己跟着读一遍。</p><div class="row vocab-nav"><button class="secondary" data-action="study-prev" ${study.index===0?'disabled':''}>← 上一个</button><button class="secondary" data-action="study-next" ${study.index+1===study.words.length?'disabled':''}>下一个 →</button></div></section><button class="primary" data-action="start" data-id="${study.topic}">我来练一练</button><p class="muted">认一认、听一听、读一读，学会了再去做题。</p>`);
  }
  function course(id) {
    const groups={
      hello:{id:'hello',api:GardenHello,label:'Hello',shortLabel:'Hello',title:'认识朋友，说说自己',backAction:'hello-goals'},
      unit1:{id:'unit1',api:GardenUnit1,label:'Unit 1 · Our new school',shortLabel:'Unit 1',title:'我的新学校',backAction:'unit1-goals'},
      unit2:{id:'unit2',api:GardenUnit2,label:'Unit 2 · All about us',shortLabel:'Unit 2',title:'认识家人，介绍自己',backAction:'unit2-goals'},
      unit3:{id:'unit3',api:GardenUnit3,label:'Unit 3 · Fun on the farm',shortLabel:'Unit 3',title:'农场趣事，认识动物',backAction:'unit3-goals'},
      review02:{id:'review02',api:{topics:[GardenUnit2.reviewTopic],lesson:GardenUnit2.lesson},label:'0–2 · 综合复习',shortLabel:'0–2',title:'把学过的本领连起来',backAction:'review02-goals'}
    };
    return groups[id] || groups.hello;
  }
  function helloGoals() { goalOverview('hello'); }
  function unit1Goals() { goalOverview('unit1'); }
  function goalOverview(id) {
    study=null;
    const group=course(id);
    const extras=id==='hello'
      ? `<details class="panel character-list"><summary>认一认词表中的 8 位朋友</summary><p class="muted">看名字，点一下听读。小图标帮助记忆。</p><div class="character-grid">${GardenHello.characters.map(c=>`<button class="secondary" data-action="speak" data-text="${escape(c.name)}"><span aria-hidden="true">${c.icon}</span><strong lang="en">${escape(c.name)}</strong><small>${escape(c.chinese)}</small></button>`).join('')}</div><p class="speech-status muted" role="status" aria-live="polite"></p></details>`
      : id==='unit1' ? `<section class="panel poster-entry"><div class="icon" aria-hidden="true">🖼️</div><h2>做一张教室海报</h2><p>选物品和数量，用英文介绍位置，再选一条课堂规则。</p><button class="primary" data-action="poster">我来做海报</button><p class="muted">制作后可以下载或打印，也可以请家人听你介绍。</p></section>`
      : id==='unit2' ? `<section class="panel booklet-entry"><h2>做一本 All about me 小手册</h2><p>选一个示例人物，介绍年龄、外貌、家人和喜欢的东西。</p><button class="primary" data-action="booklet">我来做小手册</button><p class="muted">不需要填写真实个人资料，做好后可下载或打印。</p></section><section class="panel review-entry"><h2>0～2 单元综合复习</h2><p>把打招呼、学校和家人的知识连起来练。</p><button class="secondary" data-action="review02-goals">开始综合复习 →</button></section>`
      : id==='unit3' ? `<section class="panel farm-entry"><div class="icon" aria-hidden="true">🌾</div><h2>创建我的小农场</h2><p>选动物和数量，说说它们的样子，再想一想怎样友善地照顾动物。</p><button class="primary" data-action="farm">我来创建农场</button><p class="muted">作品只在本页制作，不计答题成绩。</p></section>` : '';
    draw(`<button class="back" data-action="subject" data-id="english">← 返回英语单元</button><div class="eyebrow">Power Up · ${escape(group.label)}</div><h1>${escape(group.title)}</h1><p>先看示范、听一听，再自己开口，最后练一练。</p><div class="row count" aria-label="每次题数"><span>每次练习</span>${[5,10].map(n=>`<button data-action="count" data-id="${id}" data-count="${n}" aria-pressed="${count===n}">${n} 题</button>`).join('')}</div><div class="grid goal-units">${group.api.topics.map(t=>{
      const attempts=state.attempts.filter(a=>a.topic===t.id);
      return `<article class="tile goal-unit" data-topic="${t.id}"><span class="icon" aria-hidden="true">${t.icon}</span><strong>${escape(t.name.replace(group.shortLabel+' · ',''))}</strong><p class="goal-text">${escape(t.goal)}</p><small>学习重点：${escape(t.focus)}</small><small>${bank(t.id).length} 道原创练习 · ${attempts.length?`首次答对 ${Math.round(attempts.filter(a=>a.correct).length/attempts.length*100)}%`:'还没有作答记录'}</small><div class="row unit-actions"><button class="secondary" data-action="goal-learn" data-id="${t.id}">先学一学</button><button class="primary" data-action="start" data-id="${t.id}">练一练</button></div></article>`;
    }).join('')}</div>${extras}<p class="muted">开口练习由孩子自行练说，不计答题成绩。各个目标的首次作答结果会分别记录；原有单词练习仍可使用。</p>`);
  }
  function learnGoal(topic) {
    const group=course(topic.startsWith('unit3-')?'unit3':topic.startsWith('unit2-')?'unit2':topic.startsWith('unit1-')?'unit1':topic===GardenUnit2.reviewTopic.id?'review02':'hello');
    const cards=group.api.lesson(topic);
    if (!cards.length) {goalOverview(group.id);return;}
    study={topic,cards,index:0,group:group.id};
    goalCard();
  }
  function goalCard() {
    const card=study.cards[study.index], group=course(study.group);
    const lines=card.lines.map(line=>`<div class="sentence-line"><div lang="en">${escape(line.english)}</div><small>${escape(line.chinese)}</small></div>`).join('');
    const phonics=['unit1-phonics','unit2-phonics','unit3-phonics'].includes(study.topic), audio=GardenSpeechText.lesson(card,phonics), recordedOnly=group.id==='unit3';
    const glossary=card.glossary?.length?`<details class="goal-glossary"><summary>看看词语小帮助</summary><p>${card.glossary.map(word=>`${escape(word.english)}：${escape(word.chinese)}`).join('；')}</p></details>`:'';
    draw(`<button class="back" data-action="${group.backAction}">← 返回 ${escape(group.shortLabel)} 学习目标</button><div class="row"><strong>${escape(topicName(study.topic))}</strong><span class="muted">第 ${study.index+1} / ${study.cards.length} 张</span></div><section class="panel goal-card"><h1 class="goal-title">${escape(card.title)}</h1>${visual(card.visual)}<div class="sentence-example">${lines}</div>${glossary}${card.note?`<p class="phonics-note">${escape(card.note)}</p>`:''}<button class="secondary" data-action="speak" data-text="${escape(audio)}" ${audioButtonAttrs(audio,recordedOnly)}>🔊 ${phonics?'听示例词':'听示范'}</button><p class="speech-status muted" role="status" aria-live="polite">${audioPreparation(audio,recordedOnly) || '听一听，然后自己试着说。'}</p><div class="speaking-practice"><h2>我来说一说</h2><p>${escape(card.sayPrompt)}</p><button class="secondary" data-action="show-model">看看说法</button><div class="say-model" hidden><p lang="en">${escape(card.sayModel)}</p><button class="secondary" data-action="speak" data-text="${escape(card.sayModel)}" ${audioButtonAttrs(card.sayModel,recordedOnly)}>🔊 听说法</button>${audioPreparation(card.sayModel,recordedOnly)?`<p class="muted">${audioPreparation(card.sayModel,recordedOnly)}</p>`:''}</div><button class="primary" data-action="say-done">我试着说了 🌱</button><p class="practice-status muted" role="status" aria-live="polite">自己练说，不计答题成绩。</p></div><div class="row vocab-nav"><button class="secondary" data-action="goal-prev" ${study.index===0?'disabled':''}>← 上一张</button><button class="secondary" data-action="goal-next" ${study.index+1===study.cards.length?'disabled':''}>下一张 →</button></div></section><button class="primary" data-action="start" data-id="${study.topic}">练一练这个目标</button>`);
  }
  function farmEditor() {
    study=null;
    if (!farmDraft) farmDraft={animals:[{key:'cow',count:1,description:'big'},{key:'sheep',count:2,description:'small'},{key:'chicken',count:3,description:'happy'}],care:'kind',showChinese:true};
    const c=GardenUnit3.farm;
    draw(`<button class="back" data-action="unit3-goals">← 返回 Unit 3 学习目标</button><div class="eyebrow">Unit 3 · 我的作品</div><h1>创建我的小农场</h1><p>选三种不同的动物，再选数量和一个描述词。</p><section class="panel farm-controls">${farmDraft.animals.map((item,index)=>`<fieldset class="farm-choice"><legend>第 ${index+1} 组动物</legend><label>动物<select data-farm-animal="${index}" aria-label="第 ${index+1} 组动物">${c.animals.map(a=>`<option value="${a.key}" ${a.key===item.key?'selected':''} ${farmDraft.animals.some((selected,slot)=>slot!==index && selected.key===a.key)?'disabled':''}>${escape(a.chinese)} · ${escape(a.english)}</option>`).join('')}</select></label><label>数量<select data-farm-count="${index}" aria-label="第 ${index+1} 组数量">${c.counts.map(n=>`<option value="${n}" ${n===item.count?'selected':''}>${n} 只</option>`).join('')}</select></label><label>描述词<select data-farm-description="${index}" aria-label="第 ${index+1} 组描述词">${c.descriptions.map(d=>`<option value="${d.key}" ${d.key===item.description?'selected':''}>${escape(d.chinese)} · ${escape(d.english)}</option>`).join('')}</select></label></fieldset>`).join('')}<div class="farm-care"><strong>我的照顾约定</strong><p lang="en">${escape(c.care.english)}</p><p>${escape(c.care.chinese)}</p></div></section><button class="primary farm-show-button" data-action="farm-show">展示我的农场 🌱</button><p class="muted">这是示例农场。草稿只在本页保留，刷新后重新制作。制作和开口介绍不计答题成绩。</p>`);
  }
  function farmShow() {
    if (!farmDraft) {farmEditor();return;}
    const c=GardenUnit3.farm, audio=GardenUnit3.farmSentences(farmDraft).join(' ');
    draw(`<button class="back" data-action="unit3-goals">← 返回 Unit 3 学习目标</button><div class="eyebrow">Unit 3 · 我的作品</div><h1>我的小农场</h1><p>看一看动物，试着用英语介绍自己的农场。</p><label class="extension-toggle"><input id="farm-chinese" type="checkbox" ${farmDraft.showChinese?'checked':''}> 显示中文帮助</label><section id="farm-sheet" class="farm-sheet"><h2 lang="en">Our farm</h2><div class="farm-plots">${farmDraft.animals.map((item,index)=>{
      const animal=c.animals.find(a=>a.key===item.key), description=c.descriptions.find(d=>d.key===item.description);
      const lines=GardenUnit3.farmSentences({animals:[item],care:'kind'}).filter(line=>line!==c.care.english);
      const plural=item.count>1;
      const chinese=[`我们的农场有 ${item.count} 只${animal.chinese}。`,`${plural?'它们':'它'}是${description.chinese}。`,(animal.traitChinese || '').replace(/^它/,plural?'它们':'它')];
      if (animal.productChinese) chinese.push(`${animal.chinese}给我们${animal.productChinese}。`);
      return `<article class="farm-plot" data-farm-plot="${index}"><small>第 ${index+1} 组 · ${item.count} 只</small>${farmVisual({animal:animal.key,icon:animal.icon,count:item.count,size:['small','big'].includes(item.description)?item.description:null,mood:item.description==='happy'?'happy':null,label:description.english})}${lines.map((line,i)=>`<p lang="en">${escape(line)}</p>${chinese[i]?`<p class="farm-chinese" data-farm-chinese ${farmDraft.showChinese?'':'hidden'}>${escape(chinese[i])}</p>`:''}`).join('')}</article>`;
    }).join('')}</div><div class="farm-care"><strong>我的照顾约定</strong><p lang="en">${escape(c.care.english)}</p><p class="farm-chinese" data-farm-chinese ${farmDraft.showChinese?'':'hidden'}>${escape(c.care.chinese)}</p></div></section><section class="panel farm-actions"><h2>我来介绍农场</h2><p>可以先看中文帮助，再试着说一两句。</p><button class="secondary" data-action="read-farm" ${audioButtonAttrs(audio,true)}>🔊 听农场介绍</button><p class="speech-status muted" role="status" aria-live="polite">${audioPreparation(audio,true) || '听一听，然后自己试着说。'}</p><button class="primary" data-action="farm-say-done">我试着介绍了 🌱</button><p class="practice-status muted" role="status" aria-live="polite">愿意尝试，就是进步。制作和练说不计答题成绩。</p><button class="secondary" data-action="farm-edit">再改一改</button></section>`);
  }
  function posterEditor() {
    if (!posterDraft) posterDraft={items:[
      {key:'book',count:1,relation:'on',anchor:'desk'},
      {key:'pencil',count:1,relation:'in',anchor:'bag'},
      {key:'rubber',count:1,relation:'under',anchor:'chair'},
      {key:'pen',count:1,relation:'next to',anchor:'pencil_case'}
    ],rule:GardenUnit1.poster.rules[0].key};
    const config=GardenUnit1.poster;
    draw(`<button class="back" data-action="unit1-goals">← 返回 Unit 1 学习目标</button><h1>我的教室海报</h1><p>选物品、选数量，再选一条课堂规则。做好后，试着用英语介绍。</p><section class="panel poster-controls">${posterDraft.items.map((item,index)=>{
      const anchor=config.anchors.find(a=>a.key===item.anchor);
      const relation=config.relations.find(r=>r.id===item.relation);
      const place={on:`在${anchor.chinese}上面`,in:`在${anchor.chinese}里面`,under:`在${anchor.chinese}下面`,'next to':`紧挨着${anchor.chinese}`}[relation.id];
      return `<fieldset class="poster-choice"><legend>第 ${index+1} 格 · ${escape(place)}</legend><label>物品<select data-poster-item="${index}" aria-label="第 ${index+1} 格物品">${config.objects.map(object=>`<option value="${object.key}" ${object.key===item.key?'selected':''}>${escape(object.label)}</option>`).join('')}</select></label><label>数量<select data-poster-count="${index}" aria-label="第 ${index+1} 格数量">${[1,2,3].map(n=>`<option value="${n}" ${n===item.count?'selected':''}>${n} 个</option>`).join('')}</select></label></fieldset>`;
    }).join('')}<label class="poster-rule-label">课堂规则<select id="poster-rule">${config.rules.map(rule=>`<option value="${rule.key}" ${rule.key===posterDraft.rule?'selected':''}>${escape(rule.chinese)}</option>`).join('')}</select></label></section><section id="classroom-poster" class="poster-sheet"></section><section class="panel poster-actions"><h2>介绍我的海报</h2><p>听一听示范，再请家人听你介绍物品和课堂规则。</p><button class="secondary" data-action="read-poster">🔊 听海报介绍</button><p class="speech-status muted" role="status" aria-live="polite"></p><div class="row"><button class="primary" data-action="download-poster">下载海报</button><button class="secondary" data-action="print-poster">打印海报</button></div><p id="poster-status" class="muted" role="status" aria-live="polite">海报在本页编辑，刷新后重新制作。需要保留时，请下载海报文件。制作和听读不计答题成绩。</p></section>`);
    updatePoster();
  }
  function posterScene(item) {
    const config=GardenUnit1.poster, object=config.objects.find(o=>o.key===item.key);
    const anchor=config.anchors.find(a=>a.key===item.anchor), relation=config.relations.find(r=>r.id===item.relation);
    const sentence=`The ${item.count===1?object.english:object.plural} ${item.count===1?'is':'are'} ${relation.english} the ${anchor.english}.`;
    return {sentence,visual:{type:'position',object:object.key,relation:relation.english,anchor:anchor.english,count:item.count}};
  }
  function updatePoster() {
    stopSpeech();
    const rule=GardenUnit1.poster.rules.find(r=>r.key===posterDraft.rule);
    const sheet=document.querySelector('#classroom-poster');
    if (!sheet) return;
    sheet.innerHTML=`<div class="eyebrow">Unit 1 · 我的作品</div><h2 lang="en">Our classroom</h2><div class="poster-scenes">${posterDraft.items.map(item=>{const scene=posterScene(item);return `<article>${visual(scene.visual)}<p lang="en">${escape(scene.sentence)}</p></article>`;}).join('')}</div><div class="poster-classroom-rule"><strong lang="en">Our classroom rule</strong><p lang="en">${escape(rule.english)}</p><small>${escape(rule.chinese)}</small></div>`;
  }
  function posterSpeech() {
    const rule=GardenUnit1.poster.rules.find(r=>r.key===posterDraft.rule);
    return `This is our classroom poster. ${posterDraft.items.map(item=>posterScene(item).sentence).join(' ')} Our classroom rule: ${rule.english}`;
  }
  function downloadPoster() {
    const rule=GardenUnit1.poster.rules.find(r=>r.key===posterDraft.rule);
    const cells=posterDraft.items.map((item,index)=>{
      const scene=posterScene(item), x=30+(index%2)*390, y=110+Math.floor(index/2)*310;
      const drawing=positionSvg(scene.visual).replace('<svg ',`<svg x="${x+15}" y="${y+8}" width="340" height="225" `);
      // 两行文字让长句在 Windows 和手机查看器中都能完整显示。
      const object=GardenUnit1.poster.objects.find(o=>o.key===item.key);
      const anchor=GardenUnit1.poster.anchors.find(a=>a.key===item.anchor);
      return `<g><title>${escape(scene.sentence)}</title><rect x="${x}" y="${y}" width="370" height="290" rx="20" fill="white"/>${drawing}<text x="${x+185}" y="${y+245}" text-anchor="middle" font-size="19" fill="#30463d">The ${escape(item.count===1?object.english:object.plural)} ${item.count===1?'is':'are'}</text><text x="${x+185}" y="${y+272}" text-anchor="middle" font-size="19" fill="#30463d">${escape(item.relation)} the ${escape(anchor.english)}.</text></g>`;
    }).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="840" height="900" viewBox="0 0 840 900" font-family="Arial, Microsoft YaHei, sans-serif"><rect width="840" height="900" rx="24" fill="#eef4e7"/><text x="420" y="65" text-anchor="middle" font-size="38" font-weight="bold" fill="#345648">Our classroom</text>${cells}<text x="420" y="777" text-anchor="middle" font-size="22" fill="#30463d">Our classroom rule</text><text x="420" y="816" text-anchor="middle" font-size="26" fill="#345648">${escape(rule.english)}</text><text x="420" y="855" text-anchor="middle" font-size="20" fill="#617465">${escape(rule.chinese)}</text></svg>`;
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='学习小乐园-我的教室海报.svg';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    app.querySelector('#poster-status').textContent='海报文件已生成，请在下载列表中查看。用浏览器打开 SVG 文件，也可以打印出来。';
  }
  function bookletEditor() {
    study=null;
    const config=GardenUnit2.booklet;
    if (!bookletDraft) bookletDraft={name:config.names[0].name,age:6,hair:'brown',eyes:'blue',family:[config.family[0].key,config.family[1].key],favourite:config.favourites[0].key};
    const select=(id,label,items,value)=>`<label>${label}<select id="${id}">${items.map(item=>`<option value="${escape(item.key)}" ${item.key===String(value)?'selected':''}>${escape(item.label)}</option>`).join('')}</select></label>`;
    draw(`<button class="back" data-action="unit2-goals">← 返回 Unit 2 学习目标</button><h1>我的 All about me 小手册</h1><p>选一个示例人物，做四页英文介绍，再请家人听你说。</p><p class="muted">示例人物都是虚构的，不需要填写真实姓名或家庭资料。</p><section class="panel booklet-controls"><div class="booklet-selects">${select('booklet-name','示例名字',config.names.map(n=>({key:n.name,label:n.name})),bookletDraft.name)}${select('booklet-age','示例年龄',config.ages.map(age=>({key:String(age),label:age+' 岁'})),bookletDraft.age)}${select('booklet-hair','头发颜色',config.hairColours.map(c=>({...c,label:c.chinese})),bookletDraft.hair)}${select('booklet-eyes','眼睛颜色',config.eyeColours.map(c=>({...c,label:c.chinese})),bookletDraft.eyes)}${bookletDraft.family.map((member,index)=>`<label>家人 ${index+1}<select data-booklet-family="${index}">${config.family.map(f=>`<option value="${f.key}" ${f.key===member?'selected':''}>${escape(f.chinese)}</option>`).join('')}</select></label>`).join('')}${select('booklet-favourite','喜欢的东西',config.favourites.map(f=>({...f,label:f.chinese})),bookletDraft.favourite)}</div></section><section id="about-me-booklet"></section><section class="panel booklet-actions"><h2>我来介绍小手册</h2><p>先听完整介绍，再一页一页试着说。</p><button class="secondary" data-action="read-booklet">🔊 听小手册介绍</button><p class="speech-status muted" role="status" aria-live="polite"></p><div class="row"><button class="primary" data-action="download-booklet">下载小手册</button><button class="secondary" data-action="print-booklet">打印小手册</button></div><p id="booklet-status" class="muted" role="status" aria-live="polite">草稿在本页保留，刷新后重新制作。需要保留作品时，请先下载。制作、听读和开口不计答题成绩。</p></section>`);
    updateBooklet();
  }
  function bookletPages() {
    const c=GardenUnit2.booklet,d=bookletDraft;
    const person=c.names.find(n=>n.name===d.name),hair=c.hairColours.find(h=>h.key===d.hair),eyes=c.eyeColours.find(e=>e.key===d.eyes);
    const favourite=c.favourites.find(f=>f.key===d.favourite),numbers=['','one','two','three','four','five','six','seven','eight','nine','ten'];
    const portrait=personSvg({name:person.name,pronoun:person.pronoun,hair:hair.key,eyes:eyes.key,label:'虚构示例人物 '+person.name});
    const family=d.family.map(key=>c.family.find(f=>f.key===key));
    const favouriteSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" role="img" aria-label="${escape(favourite.chinese)}"><rect x="10" y="10" width="260" height="260" rx="28" fill="#f0f5eb"/>${['book','pencil','pen','ruler'].includes(favourite.key)?`<g transform="translate(66 76) scale(3.4)">${objectShape(favourite.key)}</g>`:`<text x="140" y="174" text-anchor="middle" font-size="108">${escape(favourite.icon)}</text>`}</svg>`;
    const familySvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" role="img" aria-label="虚构家庭角色"><rect x="10" y="10" width="260" height="260" rx="28" fill="#f0f5eb"/>${family.map((member,i)=>`<g transform="translate(${i*132} 35)">${personSvg({hair:i?'black':'brown',eyes:'brown',label:member.chinese}).replace('<svg ', '<svg width="146" height="146" ')}<text x="73" y="190" text-anchor="middle" fill="#426052" font-size="18">${escape(member.chinese)}</text></g>`).join('')}</svg>`;
    return [
      {title:'All about me',drawing:portrait,lines:[`I'm ${person.name}.`,`I'm ${numbers[d.age]}.`]},
      {title:'My hair and eyes',drawing:portrait,lines:[`I've got ${hair.english} hair.`,`I've got ${eyes.english} eyes.`]},
      {title:'My family',drawing:familySvg,lines:family.map(member=>`${member.pronoun==='he'?"He's":"She's"} my ${member.english}.`)},
      {title:'My favourite',drawing:favouriteSvg,lines:[`This is my ${favourite.english}.`]}
    ];
  }
  function updateBooklet() {
    stopSpeech();
    const sheet=app.querySelector('#about-me-booklet');
    if (!sheet) return;
    sheet.innerHTML=bookletPages().map((page,index)=>`<article class="booklet-page"><small>第 ${index+1} 页 · 我的作品</small><h2 lang="en">${escape(page.title)}</h2><div class="booklet-picture">${page.drawing}</div>${page.lines.map(line=>`<p lang="en">${escape(line)}</p>`).join('')}</article>`).join('');
  }
  function bookletSpeech() {
    return bookletPages().map(page=>`${page.title}. ${page.lines.join(' ')}`).join(' ');
  }
  function downloadBooklet() {
    const cells=bookletPages().map((page,index)=>{
      const x=20+(index%2)*420,y=20+Math.floor(index/2)*470;
      const drawing=page.drawing.replace('<svg ',`<svg x="${x+80}" y="${y+62}" width="240" height="240" `);
      return `<g><rect x="${x}" y="${y}" width="400" height="450" rx="22" fill="white"/><text x="${x+200}" y="${y+43}" text-anchor="middle" font-size="27" font-weight="bold" fill="#345648">${escape(page.title)}</text>${drawing}${page.lines.map((line,i)=>`<text x="${x+200}" y="${y+347+i*38}" text-anchor="middle" font-size="22" fill="#30463d">${escape(line)}</text>`).join('')}<text x="${x+200}" y="${y+426}" text-anchor="middle" font-size="16" fill="#627368">${index+1} / 4</text></g>`;
    }).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="860" height="960" viewBox="0 0 860 960" font-family="Arial, Microsoft YaHei, sans-serif"><title>All about me · 四页小手册</title><rect width="860" height="960" fill="#eef4e7"/>${cells}</svg>`;
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='学习小乐园-All-about-me小手册.svg';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    app.querySelector('#booklet-status').textContent='四页小手册图片已生成，请在下载列表中查看。用 Edge 或 Chrome 打开 SVG 文件即可查看或打印。也可点击“打印小手册”，逐页打印或另存为 PDF。';
  }
  function englishVoices() {
    try{return window.speechSynthesis?.getVoices().filter(v=>v.lang.toLowerCase().startsWith('en')) || [];}catch{return [];}
  }
  function speechAvailable() {
    return Boolean(window.speechSynthesis && typeof window.SpeechSynthesisUtterance==='function' && englishVoices().length);
  }
  function stopSpeech() {
    speechToken++;
    clearTimeout(speechStartTimer);clearTimeout(speechEndTimer);
    try { window.GardenAudio?.stop(); } catch { /* 文字练习始终可用。 */ }
    try { window.speechSynthesis?.cancel(); } catch { /* 文字练习始终可用。 */ }
  }
  function speak(text,onFailure,recordedOnly=false) {
    text=GardenSpeechText.text(text);
    const status=app.querySelector('.speech-status');
    stopSpeech();
    const token=speechToken;
    let complete=false;
    const current=()=>!complete && token===speechToken && status?.isConnected;
    const show=message=>{if(current())status.textContent=message;};
    const fail=()=>{
      if(!current())return;
      clearTimeout(speechStartTimer);clearTimeout(speechEndTimer);
      show('音频暂时无法播放。请检查媒体音量和网络，再点一次；也可以看文字继续学习。');
      complete=true;
      try{window.speechSynthesis?.cancel();}catch{/* Continue with text. */}
      onFailure?.();
    };
    const native=()=>{
      if(!current())return;
      if(recordedOnly){fail();return;}
      if(!speechAvailable()){fail();return;}
      try{
        const utterance=new SpeechSynthesisUtterance(text);
        utterance.lang='en-GB';utterance.rate=0.8;
        const voices=englishVoices();
        utterance.voice=voices.find(v=>v.lang.toLowerCase().replace('_','-')==='en-gb') || voices[0];
        utterance.onstart=()=>{
          if(!current())return;
          clearTimeout(speechStartTimer);show('正在读，可以跟着读一遍。');
          speechEndTimer=setTimeout(fail,Math.max(12000,Math.min(90000,String(text).length*100+6000)));
        };
        utterance.onend=()=>{
          if(!current())return;
          clearTimeout(speechStartTimer);clearTimeout(speechEndTimer);
          show('读完啦，你也试着读一遍。');
          complete=true;
        };
        utterance.onerror=event=>{if(current() && !['canceled','interrupted'].includes(event.error))fail();};
        show('正在准备设备语音……');
        speechStartTimer=setTimeout(fail,4000);
        window.speechSynthesis.speak(utterance);
      }catch{fail();}
    };
    // Prefer the shipped recordings: tablets can play MP3 even when their browser
    // has no working English speechSynthesis implementation.
    if(window.GardenAudio?.has(text))window.GardenAudio.play(text,{
      onStatus:show,
      onEnd:()=>{if(current()){show('读完啦，你也试着读一遍。');complete=true;}},
      onFailure:recordedOnly?fail:native
    });
    else if(recordedOnly){show('这段新朗读正在准备，先看文字练习。');complete=true;onFailure?.();}
    else native();
  }
  function currentForImport() {
    // 确认时重新读取，保留其他标签页刚写入的记录以及当前未保存的内存记录。
    const saved = localStorage.getItem(key);
    return saved === null ? state : GardenBackup.merge(state, JSON.parse(saved)).data;
  }
  function exportBackup() {
    try {
      const current = currentForImport();
      const payload = JSON.stringify(GardenBackup.createBackup(current), null, 2);
      const blob = new Blob([payload], {type:'application/json;charset=utf-8'});
      if (blob.size > GardenBackup.MAX_FILE_BYTES) throw new Error('记录超过 5 MB，暂时无法生成可恢复的备份。');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `学习小乐园-学习记录-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      records('备份文件已生成，请在浏览器下载列表中查看并妥善保存。');
    } catch (error) { records(`导出失败：${error.message}`); }
  }
  async function importBackup(input) {
    const file = input.files[0];
    input.value = ''; // 同一文件可以再次选择。
    if (!file || importBusy) return;
    importBusy = true;
    document.querySelectorAll('.backup-actions button').forEach(button => button.disabled=true);
    try {
      if (file.size > GardenBackup.MAX_FILE_BYTES) throw new Error('备份文件超过 5 MB，请选择正确的备份文件。');
      const imported = GardenBackup.parseBackup(await file.text());
      if (!input.isConnected) return;
      const preview = GardenBackup.merge(currentForImport(), imported);
      const body = `备份包含 ${imported.attempts.length} 条作答、${imported.sessions.length} 次完整练习。合并后新增 ${preview.addedAttempts} 条作答、${preview.addedSessions} 次完整练习，待复习错题共 ${preview.data.wrong.length} 道。现有记录会保留。`;
      confirmDialog('确认导入学习记录？', body, '确认导入', () => {
        try {
          const result = GardenBackup.merge(currentForImport(), imported);
          if (!save(result.data)) throw new Error('浏览器未能保存备份，原记录未修改。请检查存储空间或浏览器设置后重试。');
          records(`导入成功：新增 ${result.addedAttempts} 条作答、${result.addedSessions} 次完整练习。重复记录不重复计数，原记录已保留。`);
        } catch (error) { records(`导入失败：${error.message}`); }
      });
    } catch (error) {
      if (input.isConnected) records(`导入失败：${error.message} 现有记录未修改。`);
    } finally {
      importBusy = false;
      document.querySelectorAll('.backup-actions button').forEach(button => button.disabled=false);
    }
  }
  function confirmDialog(title,body,confirm,onConfirm) {
    if (document.querySelector('dialog[open]')) return;
    const d=document.createElement('dialog');
    d.innerHTML=`<h2>${escape(title)}</h2><p>${escape(body)}</p><div class="row"><button data-cancel>取消</button><button class="danger" data-confirm>${escape(confirm)}</button></div>`;
    document.body.append(d);
    d.querySelector('[data-cancel]').onclick=()=>d.close();
    d.querySelector('[data-confirm]').onclick=()=>{d.querySelector('[data-confirm]').disabled=true;d.close();onConfirm();};
    d.addEventListener('close',()=>d.remove());
    d.showModal();
  }
  app.addEventListener('change', e => {
    if (farmDraft && e.target.closest('.farm-controls')) {
      const c=GardenUnit3.farm, value=e.target.value;
      const fields=[['farmAnimal','key',c.animals.map(a=>a.key)],['farmCount','count',c.counts.map(String)],['farmDescription','description',c.descriptions.map(d=>d.key)]];
      for (const [attribute,field,allowed] of fields) {
        const index=Number(e.target.dataset[attribute]);
        if (e.target.dataset[attribute]!==undefined && Number.isInteger(index) && farmDraft.animals[index] && allowed.includes(value)) {
          if (field==='key' && farmDraft.animals.some((slot,i)=>i!==index && slot.key===value)) {e.target.value=farmDraft.animals[index].key;return;}
          stopSpeech();farmDraft.animals[index][field]=field==='count'?Number(value):value;
          if (field==='key') app.querySelectorAll('[data-farm-animal]').forEach(select=>{
            const slotIndex=Number(select.dataset.farmAnimal);
            [...select.options].forEach(option=>option.disabled=farmDraft.animals.some((slot,i)=>i!==slotIndex && slot.key===option.value));
          });
        }
      }
    }
    if (e.target.id==='farm-chinese' && farmDraft) {
      farmDraft.showChinese=e.target.checked;
      app.querySelectorAll('[data-farm-chinese]').forEach(line=>line.hidden=!farmDraft.showChinese);
    }
    if (e.target.dataset.posterItem!==undefined && posterDraft) {
      const index=Number(e.target.dataset.posterItem);
      if (GardenUnit1.poster.objects.some(o=>o.key===e.target.value)) {posterDraft.items[index].key=e.target.value;updatePoster();}
    }
    if (e.target.dataset.posterCount!==undefined && posterDraft) {
      const index=Number(e.target.dataset.posterCount), value=Number(e.target.value);
      if ([1,2,3].includes(value)) {posterDraft.items[index].count=value;updatePoster();}
    }
    if (e.target.id==='poster-rule' && posterDraft) {
      if (GardenUnit1.poster.rules.some(r=>r.key===e.target.value)) {posterDraft.rule=e.target.value;updatePoster();}
    }
    if (bookletDraft && e.target.matches('.booklet-controls select')) {
      const c=GardenUnit2.booklet,value=e.target.value;
      const list={
        'booklet-name':['name',c.names,'name'],
        'booklet-age':['age',c.ages.map(age=>({key:String(age)})),'key'],
        'booklet-hair':['hair',c.hairColours,'key'],
        'booklet-eyes':['eyes',c.eyeColours,'key'],
        'booklet-favourite':['favourite',c.favourites,'key']
      }[e.target.id];
      if (list && list[1].some(item=>item[list[2]]===value)) bookletDraft[list[0]]=list[0]==='age'?Number(value):value;
      if (e.target.dataset.bookletFamily!==undefined && c.family.some(f=>f.key===value)) bookletDraft.family[Number(e.target.dataset.bookletFamily)]=value;
      updateBooklet();
    }
    if (e.target.id === 'backup-file') importBackup(e.target);
    if (e.target.id === 'include-extra') {includeExtra=e.target.checked;englishUnits();}
  });
  app.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;
    if(a==='hello-goals')helloGoals();
    if(a==='unit1-goals')unit1Goals();
    if(a==='unit2-goals')goalOverview('unit2');
    if(a==='unit3-goals')goalOverview('unit3');
    if(a==='farm' || a==='farm-edit')farmEditor();
    if(a==='farm-show')farmShow();
    if(a==='read-farm' && farmDraft)speak(GardenUnit3.farmSentences(farmDraft).join(' '),null,true);
    if(a==='farm-say-done'){app.querySelector('.practice-status').textContent='愿意介绍就是进步！下次也可以换几种动物再试一试。';b.disabled=true;}
    if(a==='review02-goals')goalOverview('review02');
    if(a==='booklet')bookletEditor();
    if(a==='download-booklet')downloadBooklet();
    if(a==='print-booklet')window.print();
    if(a==='read-booklet')speak(bookletSpeech());
    if(a==='poster')posterEditor();
    if(a==='download-poster')downloadPoster();
    if(a==='print-poster')window.print();
    if(a==='read-passage')speak(b.dataset.text,null,b.dataset.recordedOnly==='true');
    if(a==='read-poster')speak(posterSpeech());
    if(a==='goal-learn')learnGoal(b.dataset.id);
    if(a==='goal-next'&&study?.cards&&study.index+1<study.cards.length){study.index++;goalCard();}
    if(a==='goal-prev'&&study?.cards&&study.index>0){study.index--;goalCard();}
    if(a==='show-model'){app.querySelector('.say-model').hidden=false;b.disabled=true;}
    if(a==='say-done'){app.querySelector('.practice-status').textContent='愿意开口就是进步！慢慢说，多试几次。';b.disabled=true;}
    if(a==='listen'&&run?.questions[run.index].kind==='listening')speak(run.questions[run.index].speech,showListeningText,b.dataset.recordedOnly==='true');
    if(a==='show-listening-text')showListeningText();
    if(a==='learn')learnWords(b.dataset.id);if(a==='study-next'&&study&&study.index+1<study.words.length){study.index++;wordCard();}if(a==='study-prev'&&study&&study.index>0){study.index--;wordCard();}if(a==='english-mode'){englishMode=b.dataset.mode;englishUnits();}if(a==='speak')speak(b.dataset.text,null,b.dataset.recordedOnly==='true');if(a==='home')home();if(a==='subject')subject(b.dataset.id);if(a==='count'){count=Number(b.dataset.count);subject(b.dataset.id);}if(a==='start')start(b.dataset.id);if(a==='review')review();if(a==='review-count'){count=Number(b.dataset.count);review();}if(a==='start-review')start(null,true);if(a==='records')records();if(a==='export')exportBackup();if(a==='import'&&!importBusy)document.querySelector('#backup-file').click();if(a==='answer')answer(b.dataset.answer);if(a==='retry'&&run?.phase==='retry'){run.phase='answer';run.selected=null;question();}if(a==='next')next();if(a==='leave')confirmDialog('结束这次练习？','已经作答的题目记录会保留。','结束练习',home);if(a==='clear')confirmDialog('确定清空所有学习记录？','练习统计和错题都会删除，清空后无法恢复。','确认清空',()=>{state={attempts:[],sessions:[],wrong:[]};save();records();});
  });
  document.querySelector('#home-link').addEventListener('click',e=>{e.preventDefault();if(run)confirmDialog('结束这次练习？','已经作答的题目记录会保留。','回到首页',home);else home();});
  window.addEventListener('pagehide',stopSpeech);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSpeech();});
  home();
})();
