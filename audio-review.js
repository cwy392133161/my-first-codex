/* Parent audition page: bundled recordings only; no learning-record access. */
(function(root){
  'use strict';
  const manifest=root.GardenAudioManifest;
  const player=root.GardenAudio;
  const normalize=root.GardenSpeechText?.canonical;
  const clips=manifest?.clips || {};
  const keys=Object.keys(clips).filter(key=>/^assets\/audio\/[a-f0-9]{20}\.mp3$/.test(clips[key])).sort();
  const elements={
    version:document.getElementById('audio-version'),
    priority:document.getElementById('priority-clips'),
    list:document.getElementById('all-clips'),
    search:document.getElementById('audio-search'),
    count:document.getElementById('result-count'),
    empty:document.getElementById('no-results'),
    current:document.getElementById('current-clip'),
    status:document.getElementById('playback-status'),
    playback:document.getElementById('playback'),
    stop:document.getElementById('stop-audio')
  };
  let active='',generation=0;

  function status(message,error=false){
    elements.status.textContent=message;
    elements.playback.classList.toggle('error',error);
  }
  function syncButtons(){
    for(const button of document.querySelectorAll('button[data-clip]')){
      const selected=button.dataset.clip===active;
      button.setAttribute('aria-pressed',String(selected));
      button.disabled=selected;
    }
    elements.stop.disabled=!active;
  }
  function stop(message='已停止播放。'){
    generation++;
    player?.stop();
    active='';
    syncButtons();
    status(message);
  }
  function play(key){
    if(active===key)return;
    const token=++generation;
    player?.stop();
    active='';
    elements.current.textContent=key;
    if(!player?.has(key)){
      syncButtons();
      status('这段录音暂时无法读取，请刷新页面重试。此页不会改用设备的系统发音。',true);
      return;
    }
    active=key;
    syncButtons();
    player.play(key,{
      onStatus(message){if(token===generation)status(message);},
      onEnd(){
        if(token!==generation)return;
        active='';syncButtons();status('播放完了。可以再听一次，或选择下一段。');
      },
      onFailure(){
        if(token!==generation)return;
        active='';syncButtons();
        status('暂时无法播放。请检查媒体音量和网络，刷新页面后再试；离线使用时请确认音频文件已完整解压。',true);
      }
    });
  }
  function button(key){
    const node=document.createElement('button');
    node.type='button';node.className='clip-button';node.dataset.clip=key;
    node.setAttribute('aria-pressed',String(active===key));
    node.disabled=active===key;
    const icon=document.createElement('span');
    icon.className='listen-icon';icon.setAttribute('aria-hidden','true');icon.textContent='▶';
    const label=document.createElement('span');label.lang='en';label.textContent=key;
    node.append(icon,label);
    return node;
  }
  function group(title,words){
    const available=words.filter(word=>keys.includes(word));
    if(!available.length)return;
    const heading=document.createElement('h3');heading.textContent=title;
    const list=document.createElement('div');list.className='priority-list';
    list.append(...available.map(button));
    elements.priority.append(heading,list);
  }
  function search(){
    const query=normalize?normalize(elements.search.value):elements.search.value.trim().toLowerCase();
    const found=keys.filter(key=>key.includes(query));
    elements.list.replaceChildren(...found.map(button));
    elements.count.textContent=query?`找到 ${found.length} 段，共 ${keys.length} 段。`:`共 ${keys.length} 段，点一个按钮试听。`;
    elements.empty.hidden=found.length>0;
  }

  if(manifest?.version>=2){
    elements.version.textContent=`新版音频试听 · 待听辨确认 · 英式英语 · 共 ${keys.length} 段录音`;
  }else{
    elements.version.textContent=`当前清单为旧版 · 共 ${keys.length} 段录音。修正版发布后，请刷新本页。`;
  }
  group('问候与发音重点',['hello','hi','wall','close','read','minute','mother, father, brother','three']);
  group('数字',['one','two','three','four','five','six','seven','eight','nine','ten']);
  group('颜色',['black','blue','brown','green','grey','orange','pink','purple','red','white','yellow']);
  if(!keys.length){
    status('音频清单没有加载成功，请刷新页面。离线使用时请先完整解压项目文件。',true);
    elements.search.disabled=true;
  }
  search();
  elements.search.addEventListener('input',search);
  document.addEventListener('click',event=>{
    const clicked=event.target.closest?.('button[data-clip]');
    if(clicked && !clicked.disabled)play(clicked.dataset.clip);
  });
  elements.stop.addEventListener('click',()=>stop());
  root.addEventListener('pagehide',()=>stop('页面已离开，播放已停止。'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('已停止播放。回到本页后，可以重新试听。');});
})(window);
