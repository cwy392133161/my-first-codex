'use strict';

// Run after rebuilding recordings: node tests/audio-review.browser.test.js
// Real playback checks do not certify pronunciation by human listening.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const manifest=require('../data/audio-manifest.js');
const root=path.resolve(__dirname,'..');
const recordKey='learning-garden-v1';
const audioCache='azure-jenny-unit4-v1-20261015';
const originalRecords='{"attempts":[{"question":"pinyin-59","correct":false}],"sessions":[],"wrong":["pinyin-59"]}';
const exact=value=>new RegExp('^'+value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$');

async function serverStart(){
  const server=http.createServer(async(request,response)=>{
    try{
      const url=new URL(request.url,'http://localhost');
      const file=path.resolve(root,url.pathname==='/'?'audio-review.html':'.'+decodeURIComponent(url.pathname));
      if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
      const body=await fs.readFile(file);
      const type=file.endsWith('.mp3')?'audio/mpeg':file.endsWith('.js')?'text/javascript; charset=utf-8'
        :file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8';
      response.writeHead(200,{'Content-Type':type,'Content-Length':body.length}).end(body);
    }catch{response.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return server;
}

function initialize({recordKey,originalRecords}){
  localStorage.setItem(recordKey,originalRecords);
  localStorage.setItem('unrelated-setting','keep-me');
  window.reviewStorageWrites=[];
  for(const method of ['setItem','removeItem','clear']){
    const original=Storage.prototype[method];
    Storage.prototype[method]=function(...args){window.reviewStorageWrites.push({method,args});return original.apply(this,args);};
  }
  window.reviewNativeCalls=0;
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    speak(){window.reviewNativeCalls++;throw new Error('The audition page must use bundled recordings');},
    cancel(){window.reviewNativeCalls++;},getVoices(){window.reviewNativeCalls++;return [];}
  }});
  const originalPlay=HTMLMediaElement.prototype.play;
  const originalPause=HTMLMediaElement.prototype.pause;
  const observed=new WeakSet();
  window.reviewAudio=[];
  window.reviewPlayCalls=[];
  window.reviewPlaybackChecks=[];
  window.reviewPauseCalls=0;
  window.reviewMaxPlaying=0;
  HTMLMediaElement.prototype.play=function(...args){
    if(!observed.has(this)){
      observed.add(this);
      const row={node:this,playing:0,ended:0,maxTime:0,duration:0,currentCall:null};window.reviewAudio.push(row);
      this.addEventListener('playing',()=>{
        row.playing++;window.reviewMaxPlaying=Math.max(window.reviewMaxPlaying,window.reviewAudio.filter(item=>!item.node.paused&&!item.node.ended).length);
      });
      for(const event of ['loadedmetadata','canplay','playing','ended'])this.addEventListener(event,()=>{
        if(row.currentCall&&row.currentCall.src===this.currentSrc){
          row.currentCall.events.push(event);
          if(Number.isFinite(this.duration))row.currentCall.duration=this.duration;
          if(Number.isFinite(this.currentTime))row.currentCall.maxTime=Math.max(row.currentCall.maxTime,this.currentTime);
        }
      // Observe this clip before the player's onended switches/removes src.
      },true);
      this.addEventListener('loadedmetadata',()=>{if(Number.isFinite(this.duration))row.duration=this.duration;});
      this.addEventListener('ended',()=>{row.ended++;});
      this.addEventListener('timeupdate',()=>{
        if(Number.isFinite(this.currentTime)){
          row.maxTime=Math.max(row.maxTime,this.currentTime);
          if(row.currentCall&&row.currentCall.src===this.currentSrc)row.currentCall.maxTime=Math.max(row.currentCall.maxTime,this.currentTime);
        }
      },true);
    }
    window.reviewPlayCalls.push(this.src);
    const call={src:this.src,events:[],duration:0,maxTime:0,playbackRate:this.playbackRate};
    window.reviewPlaybackChecks.push(call);
    window.reviewAudio.find(row=>row.node===this).currentCall=call;
    return originalPlay.apply(this,args);
  };
  HTMLMediaElement.prototype.pause=function(...args){window.reviewPauseCalls++;return originalPause.apply(this,args);};
}

(async()=>{
  assert.equal(manifest.version,3,'试听检查必须使用 Azure Jenny 音频');
  assert.equal(Object.keys(manifest.clips).length,613,'试听页交付完整 613 段可朗读录音');
  const server=await serverStart();
  const origin='http://127.0.0.1:'+server.address().port;
  let browser;
  const contexts=[],requests=[],errors=[];
  let passed=0;
  const pass=description=>console.log(`✓ ${++passed}. ${description}`);
  try{
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    async function fresh(options={}){
      const context=await browser.newContext({viewport:{width:390,height:844}});contexts.push(context);
      await context.addInitScript(initialize,{recordKey,originalRecords});
      if(options.missingAudio)await context.route('**/assets/audio/*.mp3',route=>route.fulfill({status:404,body:'Missing audio'}));
      if(options.missingManifest)await context.route('**/data/audio-manifest.js?*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'window.GardenAudioManifest = {version:3,clips:{}};'}));
      const page=await context.newPage();
      page.on('pageerror',error=>errors.push(error.message));
      page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
      await page.goto(origin+'/audio-review.html');
      return page;
    }
    // Use the data attribute instead of an English label to avoid accidental substring matches.
    const findClip=(page,key)=>page.locator('button[data-clip]').filter({has:page.locator('span[lang=en]',{hasText:exact(key)})}).first();
    async function finished(page){await page.waitForFunction(()=>document.getElementById('playback-status').textContent.includes('播放完了'),null,{timeout:20000});}
    async function recordsUnchanged(page){
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),recordKey),originalRecords);
      assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-setting')),'keep-me');
      assert.deepEqual(await page.evaluate(()=>window.reviewStorageWrites),[],'试听页不写入或清空学习结果及其他存储');
      assert.equal(await page.evaluate(()=>window.reviewNativeCalls),0,'即使系统语音存在，也不调用');
    }

    const page=await fresh();
    assert.equal(await page.locator('#all-clips button').count(),Object.keys(manifest.clips).length);
    assert((await page.locator('#audio-version').innerText()).includes(String(Object.keys(manifest.clips).length)));
    for(const label of ['Azure Jenny','美式英语','默认风格','正常语速','待人工听辨'])assert((await page.locator('#audio-version').innerText()).includes(label));
    assert((await page.locator('.note').innerText()).includes('不能代替逐条人工听辨'));
    for(const key of ['hello','hi']){
      await findClip(page,key).click();await finished(page);
      assert.equal(await page.locator('#current-clip').innerText(),key);
      assert.equal((await page.evaluate(()=>window.reviewPlayCalls)).at(-1),origin+'/'+manifest.clips[key]);
      assert.equal(await findClip(page,key).isDisabled(),false,'播放结束可以再次试听');
    }
    assert(await page.evaluate(()=>window.reviewAudio.some(row=>row.ended>=2&&row.maxTime>0&&row.duration>0)), 'Hello 和 Hi 真实解码，有播放进度和完成事件');
    assert.equal(await page.locator('#stop-audio').isDisabled(),true);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'手机页面不横向溢出');
    await recordsUnchanged(page);
    pass('Hello / Hi 真实 MP3 播放、修正版清单与手机布局正确，不调用系统语音、不修改记录');

    await page.locator('#audio-search').fill('  FAMILY  ');
    const matched=Object.keys(manifest.clips).filter(key=>key.includes('family'));
    assert.equal(await page.locator('#all-clips button').count(),matched.length);
    assert((await page.locator('#result-count').innerText()).includes(String(matched.length)));
    await page.locator('#audio-search').fill('I’m');
    const apostrophes=Object.keys(manifest.clips).filter(key=>key.includes("i'm"));
    assert.equal(await page.locator('#all-clips button').count(),apostrophes.length,'弯引号搜索同样找到缩写');
    await page.locator('#audio-search').fill('zzzz-does-not-exist');
    assert.equal(await page.locator('#all-clips button').count(),0);
    assert.equal(await page.locator('#no-results').isVisible(),true);
    await page.locator('#audio-search').fill('');
    assert.equal(await page.locator('#all-clips button').count(),Object.keys(manifest.clips).length);
    pass('可搜索全部音频，大小写、空格、缩写与空结果提示正确');

    const unit3Keys=['donkey','duck','cat, cow','chicken, duck','it has got long ears',"it hasn't got a long tail",
      'has it got long ears','yes, it has',"no, it hasn't",'a baby sheep is a lamb','our farm has got two sheep'];
    const unit3Heading=page.locator('#priority-clips h3').filter({hasText:exact('Unit 3 农场与问答')});
    assert.equal(await unit3Heading.count(),1,'家长试听入口明确包含新的 Unit 3 优先组');
    const unit3Priority=page.locator('#priority-clips h3:text-is("Unit 3 农场与问答") + .priority-list');
    assert.deepEqual(await unit3Priority.locator('button[data-clip]').evaluateAll(buttons=>buttons.map(button=>button.dataset.clip)),
      unit3Keys,'优先试听组覆盖新增语法、完整词、宝宝与农场句子');
    for(const key of ['cat, cow','donkey','chicken, duck','has it got long ears',"no, it hasn't",
      'a baby sheep is a lamb','our farm has got two sheep']){
      await unit3Priority.locator('button[data-clip]').filter({has:page.locator('span[lang=en]',{hasText:exact(key)})}).click();
      await finished(page);
      assert.equal(await page.locator('#current-clip').innerText(),key);
      const call=await page.evaluate(()=>window.reviewPlaybackChecks.at(-1));
      assert.equal(call.src,origin+'/'+manifest.clips[key],'优先按钮实际播放对应本地 MP3');
      assert(Number.isFinite(call.duration)&&call.duration>0&&call.maxTime>0
        &&['loadedmetadata','canplay','playing','ended'].every(event=>call.events.includes(event)),
      '每段优先试听真实解码，有播放进度和结束事件');
      assert.equal(call.playbackRate,1,'优先试听使用正常一倍速度');
    }
    const unit4Keys=['i like apples',"i don't like mangoes",'she likes bread',"he doesn't like chocolate",
      'do you like grapes','yes, i do',"no, i don't",'can i have some water, please','here you are',
      'would you like some cake','yes, please','no, thank you'];
    const unit4PhonicsKeys=['mango','salad','cat','bag','cake','lemonade','paper','first, wash your hands',
      'next, put the prepared fruit in a bowl','then, add some juice and mix','last, share the fruit salad'];
    const unit4Priority=page.locator('#priority-clips h3:text-is("Unit 4 喜好与礼貌") + .priority-list');
    const unit4Phonics=page.locator('#priority-clips h3:text-is("Unit 4 字母 a 的完整例词与食谱") + .priority-list');
    assert.deepEqual(await unit4Priority.locator('button[data-clip]').evaluateAll(buttons=>buttons.map(button=>button.dataset.clip)),
      unit4Keys,'Unit 4 优先试听覆盖喜好、请求、邀请及接受和谢绝');
    assert.deepEqual(await unit4Phonics.locator('button[data-clip]').evaluateAll(buttons=>buttons.map(button=>button.dataset.clip)),
      unit4PhonicsKeys,'字母 a 示例保持完整词，食谱优先组包含完整步骤');
    // Eight normal-speed media checks include six newly generated sentences;
    // mango and cake exercise both kinds of a without inventing phoneme audio.
    for(const key of ["i don't like mangoes",'do you like grapes','can i have some water, please',
      'no, thank you','mango','cake','next, put the prepared fruit in a bowl','then, add some juice and mix']){
      const group=unit4Keys.includes(key)?unit4Priority:unit4Phonics;
      await group.locator('button[data-clip]').filter({has:page.locator('span[lang=en]',{hasText:exact(key)})}).click();
      await finished(page);
      assert.equal(await page.locator('#current-clip').innerText(),key);
      const call=await page.evaluate(()=>window.reviewPlaybackChecks.at(-1));
      assert.equal(call.src,origin+'/'+manifest.clips[key],'Unit 4 试听按钮实际播放其清单对应 MP3');
      assert(Number.isFinite(call.duration)&&call.duration>0&&call.maxTime>0
        &&['loadedmetadata','canplay','playing','ended'].every(event=>call.events.includes(event)),
      'Unit 4 每段代表音频都实际解码、有播放进度并正常结束');
      assert.equal(call.playbackRate,1,'Unit 4 代表音频使用正常一倍速度');
    }
    await page.locator('#audio-search').fill(' DON’T ');
    const dont=Object.keys(manifest.clips).filter(key=>key.includes("don't"));
    assert.equal(await page.locator('#all-clips button').count(),dont.length,'Unit 4 弯引号缩写可以搜索');
    assert.equal(await page.locator('#all-clips button[data-clip="i don\'t like mangoes"]').count(),1);
    await page.locator('#audio-search').fill(' HASN’T ');
    const negatives=Object.keys(manifest.clips).filter(key=>key.includes("hasn't"));
    assert.equal(await page.locator('#all-clips button').count(),negatives.length,'Unit 3 弯引号否定句可以搜索');
    assert.equal(await page.locator('#all-clips button[data-clip="it hasn\'t got a long tail"]').count(),1);
    await page.locator('#audio-search').fill('baby');
    const babies=Object.keys(manifest.clips).filter(key=>key.includes('baby'));
    assert.equal(await page.locator('#all-clips button').count(),babies.length);
    assert.equal(await page.locator('#all-clips button[data-clip="a baby sheep is a lamb"]').count(),1);
    await page.locator('#audio-search').fill('');
    await recordsUnchanged(page);
    pass('Unit 3 与 Unit 4 优先组真实一倍速播放；喜好、礼貌、a 的整词和食谱映射及缩写搜索正确');

    const before=await page.evaluate(()=>window.reviewPlayCalls.length);
    await findClip(page,'hello').evaluate(button=>{button.click();button.click();button.click();});
    assert.equal(await page.evaluate(()=>window.reviewPlayCalls.length),before+1,'同一按钮连续点击只启动一次');
    await findClip(page,'hi').click();
    assert.equal(await page.locator('#current-clip').innerText(),'hi');
    assert.equal(await findClip(page,'hello').isDisabled(),false);
    assert.equal(await findClip(page,'hi').isDisabled(),true);
    await page.waitForFunction(()=>window.reviewAudio.some(row=>!row.node.paused),null,{timeout:10000});
    await page.locator('#stop-audio').click();
    assert(await page.evaluate(()=>window.reviewAudio.every(row=>row.node.paused||row.node.ended)));
    const stopped=await page.locator('#playback-status').innerText();
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#playback-status').innerText(),stopped);
    assert.equal(await page.evaluate(()=>window.reviewMaxPlaying),1,'换音频不会叠加声音');
    await recordsUnchanged(page);
    pass('连续点击不会叠放，换片段和停止控制正确，取消后状态不被旧播放覆盖');

    await findClip(page,'hello').click();
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
    assert(await page.evaluate(()=>window.reviewAudio.every(row=>row.node.paused||row.node.ended)));
    assert.equal(await page.locator('#stop-audio').isDisabled(),true);
    await findClip(page,'hi').click();
    await page.evaluate(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,value:true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert(await page.evaluate(()=>window.reviewAudio.every(row=>row.node.paused||row.node.ended)));
    assert((await page.locator('#playback-status').innerText()).includes('重新试听'));
    assert.equal(await page.locator('header a').getAttribute('href'),'index.html');
    await recordsUnchanged(page);
    pass('离开页面或退到后台立即停止播放，返回首页链接可用');

    const failing=await fresh({missingAudio:true});
    await findClip(failing,'hello').click();
    await failing.waitForFunction(()=>document.getElementById('playback').classList.contains('error'),null,{timeout:15000});
    const failedStatus=await failing.locator('#playback-status').innerText();
    for(const instruction of ['媒体音量','网络','刷新页面','完整解压'])assert(failedStatus.includes(instruction));
    assert.equal(await failing.locator('#stop-audio').isDisabled(),true);
    await recordsUnchanged(failing);
    const missing=await fresh({missingManifest:true});
    assert.equal(await missing.locator('#all-clips button').count(),0);
    assert.equal(await missing.locator('#audio-search').isDisabled(),true);
    assert((await missing.locator('#playback-status').innerText()).includes('清单没有加载成功'));
    assert.equal(await missing.evaluate(()=>window.reviewPlayCalls.length),0);
    await recordsUnchanged(missing);
    assert.deepEqual(errors,[]);
    for(const source of ['speech-text.js','data/audio-manifest.js','audio-player.js','audio-review.js']){
      const loaded=requests.filter(request=>new URL(request.url).pathname==='/'+source);
      const version=source==='audio-player.js'?'ios12-webapp-v1-20261014':audioCache;
      assert(loaded.length>0&&loaded.every(request=>new URL(request.url).searchParams.get('v')===version),source+' 使用新版缓存参数');
    }
    assert(requests.every(request=>request.method==='GET'&&new URL(request.url).origin===origin),'只读取同源文件，不调用外部接口');
    pass('音频 404 和空清单明确提示，不偷偷换成系统语音；所有场景无脚本异常和外部请求');

    const offlineContext=await browser.newContext({viewport:{width:1024,height:768}});contexts.push(offlineContext);
    await offlineContext.addInitScript(initialize,{recordKey,originalRecords});
    const offline=await offlineContext.newPage();
    const offlineRequests=[];
    offline.on('pageerror',error=>errors.push(error.message));
    offline.on('request',request=>offlineRequests.push(request.url()));
    let fileAccess=true;
    try{await offline.goto(pathToFileURL(path.join(root,'audio-review.html')).href);}
    catch(error){
      if(!error.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR'))throw error;
      fileAccess=false;
      console.log('○ 环境的浏览器管理策略禁止 file:// 导航，本地双击播放检查已跳过。');
    }
    if(fileAccess){
      await findClip(offline,'hello').click();await finished(offline);
      assert.equal((await offline.evaluate(()=>window.reviewPlayCalls)).at(-1),pathToFileURL(path.join(root,manifest.clips.hello)).href);
      assert(await offline.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'平板布局不横向溢出');
      assert(offlineRequests.every(url=>url.startsWith(pathToFileURL(root+path.sep).href)),'本地打开仅使用压缩包内的文件');
      await recordsUnchanged(offline);
      assert.deepEqual(errors,[]);
      pass('file:// 本地直接打开也能播放真实 Hello，平板布局正常，仅使用项目内文件');
    }
    console.log(`通过 ${passed} 组家长试听页检查。`);
    console.log('以上为真实 MP3 播放及对应关系检查，不能代替逐条人工发音听辨。');
  }finally{
    await Promise.all(contexts.map(context=>context.close().catch(()=>{})));
    await browser?.close();await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
