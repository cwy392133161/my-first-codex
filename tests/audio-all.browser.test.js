'use strict';

// Run with: node tests/audio-all.browser.test.js
// Every MP3 completes real Chromium playback at 4x speed, muted, in eight lanes.
// This checks browser media operation, never the correctness of pronunciation.
// Optional AUDIO_BROWSER_REPORT=/path/to/report.json saves only public clip data.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=require('../data/audio-manifest.js');

(async()=>{
  assert.equal(manifest.version,3);
  assert.equal(manifest.voice.name,'en-US-JennyNeural');
  assert.equal(Object.keys(manifest.clips).length,613);
  const paths=new Set(Object.values(manifest.clips));
  const server=http.createServer(async(req,res)=>{
    try{
      const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1));
      if(!relative){
        res.writeHead(200,{'Content-Type':'text/html'}).end('<button id="run">Check all audio</button>');
        return;
      }
      if(!paths.has(relative)){res.writeHead(404).end();return;}
      const body=await fs.readFile(path.join(root,relative));
      res.writeHead(200,{'Content-Type':'audio/mpeg','Content-Length':body.length}).end(body);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const started=Date.now();
  try{
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(clips=>{
      window.complete=false;
      window.results=[];
      document.getElementById('run').onclick=()=>{
        let cursor=0;
        const run=async()=>{
          while(cursor<clips.length){
            const [key,src]=clips[cursor++];
            const audio=new Audio(src);
            audio.preload='auto';
            audio.playbackRate=4;
            audio.muted=true;
            const result={key,src,events:[],duration:null,maximumTime:0};
            window.results.push(result);
            const completed=new Promise(resolve=>{
              const timer=setTimeout(()=>{result.failure='timeout';audio.pause();resolve();},15000);
              for(const name of ['loadedmetadata','canplay','playing','timeupdate','ended','error']){
                audio.addEventListener(name,()=>{
                  if(!result.events.includes(name))result.events.push(name);
                  // Resetting src after ended emits another timeupdate with NaN
                  // duration; retain the duration observed during playback.
                  if(Number.isFinite(audio.duration))result.duration=audio.duration;
                  result.maximumTime=Math.max(result.maximumTime,audio.currentTime);
                  if(name==='ended'||name==='error'){clearTimeout(timer);resolve();}
                });
              }
              audio.play().catch(error=>{result.failure=error.name;clearTimeout(timer);resolve();});
            });
            await completed;
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
          }
        };
        Promise.all(Array.from({length:8},run)).then(()=>{window.complete=true;});
      };
    },Object.entries(manifest.clips));
    await page.locator('#run').click();
    await page.waitForFunction(()=>window.complete,null,{timeout:240000});
    const results=await page.evaluate(()=>window.results);
    assert.equal(results.length,613);
    assert.deepEqual(errors,[]);
    const failed=results.filter(result=>result.failure||result.events.includes('error')
      ||!(result.duration>0)||!(result.maximumTime>0)
      ||!['loadedmetadata','canplay','playing','timeupdate','ended'].every(event=>result.events.includes(event)));
    if(process.env.AUDIO_BROWSER_REPORT){
      await fs.writeFile(process.env.AUDIO_BROWSER_REPORT,JSON.stringify({
        voice:manifest.voice,playbackRate:4,muted:true,parallelLanes:8,
        humanPronunciationReviewed:false,elapsedSeconds:(Date.now()-started)/1000,results
      },null,2));
    }
    assert.deepEqual(failed,[]);
    console.log(`通过：613 段在真实 Chromium 中有 metadata、canplay、playing、timeupdate 和 ended，无媒体错误（4倍速、静音、8路并行，${((Date.now()-started)/1000).toFixed(1)} 秒）。这是播放与解码检查，不是逐条发音确认。`);
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
