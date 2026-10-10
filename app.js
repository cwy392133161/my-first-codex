(() => {
  'use strict';
  const {topics,bank,shuffle}=GardenQuestions;
  const app=document.querySelector('#app'), key='learning-garden-v1';
  let state={attempts:[],sessions:[],wrong:[]}, count=5, run=null, storageWarning='', importBusy=false;
  try { const saved=JSON.parse(localStorage.getItem(key)); if(saved && Array.isArray(saved.attempts) && Array.isArray(saved.sessions) && Array.isArray(saved.wrong)) state=saved; }
  catch { storageWarning='浏览器记录暂时无法读取。本次仍可练习，请确认浏览器允许本地存储。'; }
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const topicName=id=>topics.find(t=>t.id===id)?.name || id;
  const resolve=id=>{const topic=topics.find(t=>id.startsWith(t.id+'-'));return topic ? bank(topic.id).find(q=>q.id===id) : null;};
  function save(nextState=state){try{localStorage.setItem(key,JSON.stringify(nextState));state=nextState;storageWarning='';return true;}catch{storageWarning='记录未能保存，可能是浏览器存储受限或已满。离开页面后本次记录可能丢失。';return false;}}
  function draw(html){app.innerHTML=html+(storageWarning?`<p class="notice" role="alert">${escape(storageWarning)}</p>`:'');}
  function back(){return '<button class="back" data-action="home">← 回到首页</button>';}
  function home(){run=null;draw(`<section class="hero"><span class="flower" aria-hidden="true">🌼</span><div class="eyebrow">一年级 · 上学期基础练习</div><h1>今天，学一点新本领</h1><p>慢慢想，勇敢试。每一次练习都算进步。</p></section><div class="grid"><button class="tile" data-action="subject" data-id="math"><span class="icon">🍎</span><strong>数学练习</strong><small>分与合 · 加减法 · 比大小</small></button><button class="tile peach" data-action="subject" data-id="chinese"><span class="icon">📚</span><strong>语文练习</strong><small>基础拼音 · 字词搭配</small></button><button class="tile lavender" data-action="review"><span class="icon">🌷</span><strong>错题复习</strong><small>${state.wrong.length ? `${state.wrong.length} 道题，陪你再试一试` : '一步一步，把知识学牢'}</small></button><button class="tile blue" data-action="records"><span class="icon">🌿</span><strong>学习记录</strong><small>家长查看 · 发现小进步</small></button></div>`);}
  function subject(id){draw(`${back()}<h1>${id==='math'?'数学练习':'语文练习'}</h1><p>选一个知识点，开始今天的小练习。</p><div class="row count" aria-label="每次题数"><span>每次练习</span>${[5,10].map(n=>`<button data-action="count" data-id="${id}" data-count="${n}" aria-pressed="${count===n}">${n} 题</button>`).join('')}</div><div class="grid">${topics.filter(t=>t.subject===id).map(t=>`<button class="tile" data-action="start" data-id="${t.id}"><span class="icon">${t.icon}</span><strong>${t.name}</strong><small>${t.description}</small></button>`).join('')}</div><p class="muted">原创基础题库，可按孩子的教材调整。</p>`);}
  function review(){const ids=state.wrong.filter(id=>resolve(id));draw(`${back()}<h1>错题复习</h1><p>错题是学习的小脚印。我们一起再试一试。</p>${ids.length?`<div class="panel"><h2>还有 ${ids.length} 道题等你复习</h2><p>复习时，第一次答对就会从错题本移除。提示后答对的题保留，方便下次再练。</p><div class="row count">${[5,10].map(n=>`<button data-action="review-count" data-count="${n}" aria-pressed="${count===n}">${n} 题</button>`).join('')}</div><p class="muted">本次练习 ${Math.min(count,ids.length)} 道，不重复凑题。</p><button class="primary" data-action="start-review">开始复习</button></div>`:'<div class="panel empty"><div class="icon">🌼</div><h2>还没有错题</h2><p>先选一个知识点练习吧！</p><button class="primary" data-action="home">去练习</button></div>'}`);}
  function start(topic,reviewing=false){const pool=reviewing?state.wrong.map(resolve).filter(Boolean):bank(topic);run={id:`${Date.now()}-${Math.random()}`,questions:shuffle(pool).slice(0,count).map(q=>({...q,choices:shuffle(q.choices)})),index:0,firstCorrect:0,recovered:0,reviewing,tries:0,phase:'answer',selected:null};if(!run.questions.length){review();return;}question();}
  function question(){const q=run.questions[run.index];draw(`<button class="back" data-action="leave">← 结束这次练习</button><div class="row"><strong>${run.reviewing?'错题复习':topicName(q.topic)}</strong><span class="muted">第 ${run.index+1} / ${run.questions.length} 题</span></div><div class="progress" aria-label="练习进度"><div style="width:${(run.index/run.questions.length)*100}%"></div></div><section class="panel"><div class="question">${escape(q.prompt)}</div><div class="choices">${q.choices.map(c=>`<button data-action="answer" data-answer="${escape(c)}" ${run.phase!=='answer'?'disabled':''} class="${run.selected===c?'selected':''}">${escape(c)}</button>`).join('')}</div><div id="feedback" aria-live="polite">${feedback(q)}</div></section><p class="muted">不着急，认真想一想。</p>`);}
  function feedback(q){if(run.phase==='answer')return '';if(run.phase==='retry')return `<div class="feedback"><strong>再想一想，你可以的 🌱</strong><div>${escape(q.hint)}</div><button class="secondary" data-action="retry">再试一次</button></div>`;const correct=run.selected===q.answer;return `<div class="feedback ${correct?'good':''}"><strong>${correct?(run.tries===1?'答对啦！🌟':'这次答对啦！🌷'):`答案是 ${escape(q.answer)}`}</strong><div>${escape(q.explanation)}</div><button class="primary" data-action="next">${run.index+1===run.questions.length?'看看练习总结':'下一题 →'}</button></div>`;}
  function answer(value){if(!run || run.phase!=='answer')return;const q=run.questions[run.index];if(!q.choices.includes(value))return;run.phase='locked';run.selected=value;run.tries++;const correct=value===q.answer;
    if(run.tries===1){state.attempts.push({session:run.id,topic:q.topic,question:q.id,correct,review:run.reviewing,time:Date.now()});if(correct){run.firstCorrect++;if(run.reviewing)state.wrong=state.wrong.filter(id=>id!==q.id);}else if(!state.wrong.includes(q.id))state.wrong.push(q.id);save();}
    if(correct && run.tries===2)run.recovered++;run.phase=correct||run.tries===2?'done':'retry';question();}
  function next(){if(!run||run.phase!=='done')return;run.phase='locked';if(run.index+1===run.questions.length){state.sessions.push({id:run.id,time:Date.now(),total:run.questions.length,correct:run.firstCorrect,review:run.reviewing});save();summary();}else{run.index++;run.tries=0;run.phase='answer';run.selected=null;question();}}
  function summary(){const r=run;run=null;draw(`<section class="panel empty"><div class="icon">🌻</div><h1>这次练习完成啦！</h1><p>认真思考的你，又向前走了一小步。</p><div class="stats"><div class="stat"><strong>${r.questions.length}</strong>完成题数</div><div class="stat"><strong>${r.firstCorrect}</strong>首次答对</div><div class="stat"><strong>${r.recovered}</strong>再试答对</div></div><p>不会的题可以慢慢练，学习不必着急。</p><div class="row"><button class="primary" data-action="home">回到小乐园</button><button class="secondary" data-action="review">看看错题</button></div></section>`);}
  function records(message=''){draw(`${back()}<h1>学习记录</h1><p>给家长的小窗口：看看孩子的进步，也找到需要陪伴的地方。</p><div class="stats"><div class="stat"><strong>${state.sessions.length}</strong>完整练习</div><div class="stat"><strong>${state.attempts.length}</strong>已答题数</div><div class="stat"><strong>${state.wrong.length}</strong>待复习错题</div></div><section class="panel">${topics.map(t=>{const a=state.attempts.filter(a=>a.topic===t.id);const times=new Set(a.map(a=>a.session)).size;return `<div class="record"><strong>${t.icon} ${t.name}</strong><p>练习 ${times} 次 · 首次作答正确率 ${a.length?Math.round(a.filter(a=>a.correct).length/a.length*100)+'%':'暂无'}</p><small class="muted">${a.length?`${a.length} 题中首次答对 ${a.filter(a=>a.correct).length} 题`:'还没有练习记录'}</small></div>`;}).join('')}</section><p class="muted">练习次数按已作答的练习统计，含错题复习和未完成练习。正确率只计每题首次作答，重试不覆盖原结果。记录仅在当前浏览器保存，暂不支持跨设备同步。</p><section class="panel"><h2>备份与恢复</h2><p>把练习统计和错题保存成文件，换浏览器或设备时可以手动恢复。</p><div class="row backup-actions"><button class="primary" data-action="export">导出备份</button><button class="secondary" data-action="import">导入恢复</button></div><input id="backup-file" type="file" accept=".json,application/json" aria-label="选择学习记录备份" hidden><p class="muted">导入会合并现有记录，相同记录只计一次。不会清空原记录，也不会自动同步。</p><p id="backup-status" role="${message.includes('失败')?'alert':'status'}" aria-live="polite">${escape(message)}</p></section><button class="danger" data-action="clear">清空学习记录</button>`);}
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
    if (e.target.id === 'backup-file') importBackup(e.target);
  });
  app.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;
    if(a==='home')home();if(a==='subject')subject(b.dataset.id);if(a==='count'){count=Number(b.dataset.count);subject(b.dataset.id);}if(a==='start')start(b.dataset.id);if(a==='review')review();if(a==='review-count'){count=Number(b.dataset.count);review();}if(a==='start-review')start(null,true);if(a==='records')records();if(a==='export')exportBackup();if(a==='import'&&!importBusy)document.querySelector('#backup-file').click();if(a==='answer')answer(b.dataset.answer);if(a==='retry'&&run?.phase==='retry'){run.phase='answer';run.selected=null;question();}if(a==='next')next();if(a==='leave')confirmDialog('结束这次练习？','已经作答的题目记录会保留。','结束练习',home);if(a==='clear')confirmDialog('确定清空所有学习记录？','练习统计和错题都会删除，清空后无法恢复。','确认清空',()=>{state={attempts:[],sessions:[],wrong:[]};save();records();});
  });
  document.querySelector('#home-link').addEventListener('click',e=>{e.preventDefault();if(run)confirmDialog('结束这次练习？','已经作答的题目记录会保留。','回到首页',home);else home();});
  home();
})();
