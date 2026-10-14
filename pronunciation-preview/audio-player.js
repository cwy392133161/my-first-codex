/* Finished MP3 playback. No microphone, remote TTS service or runtime model. */
(function(root){
  'use strict';
  const manifest=typeof module!=='undefined' && module.exports?require('./data/audio-manifest.js'):root.GardenAudioManifest;
  const speechText=typeof module!=='undefined' && module.exports?require('./speech-text.js'):root.GardenSpeechText;
  let audio=null,ticket=0,loadTimer=null,endTimer=null;
  function plan(text){
    const parts=speechText.sentences(speechText.text(text));
    const files=parts.map(part=>manifest && manifest.clips && manifest.clips[speechText.canonical(part)]);
    return files.length && files.every(file=>/^assets\/audio\/[a-f0-9]{20}\.mp3$/.test(file || ''))?files:[];
  }
  function has(text){return typeof root.Audio==='function' && plan(text).length>0;}
  function clearTimers(){clearTimeout(loadTimer);clearTimeout(endTimer);loadTimer=null;endTimer=null;}
  function silence(){
    clearTimers();
    if(!audio)return;
    audio.onplaying=audio.onended=audio.onerror=audio.onwaiting=audio.onstalled=null;
    try{audio.pause();audio.currentTime=0;audio.removeAttribute('src');audio.load();}catch{/* Already stopped. */}
  }
  function stop(){ticket++;silence();}
  function play(text,callbacks={}){
    stop();
    const token=ticket,files=plan(text);
    let index=0,finished=false;
    const current=()=>token===ticket && !finished;
    const fail=reason=>{
      if(!current())return;
      finished=true;silence();if(typeof callbacks.onFailure==='function')callbacks.onFailure(new Error(reason));
    };
    if(!has(text)){fail('missing-audio');return false;}
    try{
      if(!audio){audio=new root.Audio();audio.preload='none';audio.setAttribute('playsinline','');}
      const load=()=>{
        if(!current())return;
        clearTimers();
        audio.src=files[index];
        if(typeof callbacks.onStatus==='function')callbacks.onStatus('正在加载音频……');
        loadTimer=setTimeout(()=>fail('audio-start-timeout'),8000);
        audio.onplaying=()=>{
          if(!current())return;
          clearTimers();if(typeof callbacks.onStatus==='function')callbacks.onStatus('正在播放，可以跟着读一遍。');
          const duration=Number.isFinite(audio.duration)?audio.duration:20;
          endTimer=setTimeout(()=>fail('audio-end-timeout'),Math.max(10000,Math.min(90000,duration*2000+5000)));
        };
        audio.onwaiting=audio.onstalled=()=>{
          if(!current())return;
          // Repeated stalls must not postpone the original start/stall deadline.
          if(loadTimer===null)loadTimer=setTimeout(()=>fail('audio-load-timeout'),8000);
        };
        audio.onerror=()=>fail('audio-load-error');
        audio.onended=()=>{
          if(!current() || !audio.ended)return;
          clearTimers();index++;
          if(index<files.length){load();return;}
          finished=true;silence();if(typeof callbacks.onEnd==='function')callbacks.onEnd();
        };
        // First play happens synchronously inside the user's click; later clips
        // reuse this unlocked audio element so mobile browsers allow the sequence.
        try{const result=audio.play();if(result && typeof result.catch==='function')result.catch(()=>fail('audio-play-blocked'));}
        catch{fail('audio-play-blocked');}
      };
      load();return true;
    }catch{fail('audio-not-supported');return false;}
  }
  const api={has,plan,play,stop};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  else root.GardenAudio=api;
})(typeof window!=='undefined'?window:globalThis);
