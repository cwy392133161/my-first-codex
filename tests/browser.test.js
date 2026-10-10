const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {bank}=require('../data/questions.js');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const server=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1);const file=path.resolve(__dirname,'..',name);if(!file.startsWith(path.resolve(__dirname,'..')+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html');res.end(data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 const click=action=>page.locator(`[data-action="${action}"]`).first().click();
 const data=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('learning-garden-v1')));
 await click('review');assert((await page.locator('main').innerText()).includes('还没有错题'));await click('home');
 await page.locator('[data-id="math"]').click();await page.locator('[data-action="start"][data-id="arithmetic"]').click();
 const prompt=await page.locator('.question').innerText();const q=bank('arithmetic').find(q=>q.prompt===prompt);assert(q);
 const wrong=q.choices.find(c=>c!==q.answer);
 await page.locator(`[data-answer="${wrong}"]`).evaluate(b=>{b.click();b.click();});
 assert.equal((await data()).attempts.length,1);assert.equal((await data()).wrong.length,1);assert((await page.locator('#feedback').innerText()).includes(q.hint));
 await click('retry');await page.locator(`[data-answer="${wrong}"]`).click();assert((await page.locator('#feedback').innerText()).includes('答案是'));assert.equal((await data()).attempts.length,1);
 await page.reload();assert.equal((await data()).wrong.length,1);await click('review');await click('start-review');
 await page.locator(`[data-answer="${q.answer}"]`).evaluate(b=>{b.click();b.click();});assert.equal((await data()).attempts.length,2);assert.equal((await data()).wrong.length,0);
 await page.locator('[data-action="next"]').evaluate(b=>{b.click();b.click();});assert.equal((await data()).sessions.length,1);assert((await page.locator('main').innerText()).includes('这次练习完成啦'));
 await click('home');await click('records');assert((await page.locator('main').innerText()).includes('50%'));
 await click('clear');await page.locator('dialog [data-cancel]').click();assert.equal((await data()).attempts.length,2);
 await click('clear');await page.locator('dialog [data-confirm]').click();assert.equal((await data()).attempts.length,0);await page.reload();await click('records');assert((await page.locator('main').innerText()).includes('暂无'));
 await click('home');await page.locator('[data-id="chinese"]').click();await page.locator('[data-action="count"][data-count="10"]').click();await page.locator('[data-action="start"][data-id="pinyin"]').click();
 for(let i=0;i<10;i++){const text=await page.locator('.question').innerText();const question=bank('pinyin').find(q=>q.prompt===text);await page.locator(`[data-answer="${question.answer}"]`).click();await click('next');}
 assert.equal((await data()).attempts.length,10);assert.equal((await data()).sessions[0].correct,10);
 await click('home');await page.locator('[data-id="chinese"]').click();await page.locator('[data-action="start"][data-id="words"]').click();
 const wordPrompt=await page.locator('.question').innerText();const word=bank('words').find(q=>q.prompt===wordPrompt);await page.locator(`[data-answer="${word.choices.find(c=>c!==word.answer)}"]`).click();await click('retry');await page.locator(`[data-answer="${word.answer}"]`).click();assert.equal((await data()).wrong.length,1);
 await click('leave');await page.locator('dialog [data-confirm]').click();await click('review');await click('start-review');await page.locator(`[data-answer="${word.choices.find(c=>c!==word.answer)}"]`).click();await click('retry');await page.locator(`[data-answer="${word.answer}"]`).click();await click('next');assert.equal((await data()).wrong.length,1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/learning-garden-mobile.png',fullPage:true});
 await page.setViewportSize({width:1280,height:900});await click('home');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log('通过：手机和电脑布局、空记录、5/10题、首次结果、重复点击、提示与第二次答案、完整总结、错题移除/保留、刷新保存、统计及二次清空确认。');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
