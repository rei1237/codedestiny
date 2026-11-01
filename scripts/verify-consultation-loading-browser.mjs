// Local compiled UI and fixture requests only; never starts a consultation or payment.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';

const output=resolve('.tmp/round2/ui'),compiled=resolve('out');
await readFile(resolve(compiled,'index.html'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const leaf=decodeURIComponent(path.slice(1))+(path.endsWith('/')?'index.html':'');
 for(const base of [compiled,resolve('public')]){
  const file=resolve(base,leaf);if(!file.startsWith(base+sep))continue;
  try{const bytes=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(bytes);return;}catch{/* Same workspace fallback. */}
 }res.writeHead(404);res.end();
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
const proof=[];
let activePage;
try{
 await mkdir(output,{recursive:true});
 for(const width of [360,390,430,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  let products=0,mutations=0,account=null;
  const apiRequests=[];
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==origin)return route.abort();
   if(!url.pathname.startsWith('/api/'))return route.continue();
   apiRequests.push(url.pathname);
   if(!['GET','HEAD'].includes(request.method())&&!url.pathname.startsWith('/api/auth/'))mutations++;
   const send=(json,status=200)=>route.fulfill({json,status});
   if(url.pathname==='/api/yeongnyangi/products'){
    products++;return send({ok:true,products:['saju','ziwei','sukuyo','vedic','astrology','tarot'].flatMap(domain=>['anchovy','mackerel','salmon','flounder','tuna'].map(fish=>({id:domain+'_'+fish,available:true})))});
   }
   // Match the existing no-auth-hint guest response. A server-confirmed 401
   // intentionally invalidates the session and clears private drafts.
   if(url.pathname.startsWith('/api/auth/'))return account?send({ok:true,authenticated:true,user:account,token:'fixture-only'}):send({authenticated:false,guest:true,reason:'no_auth_hint'});
   if(url.pathname==='/api/yeongnyangi/profiles')return account?send({ok:true,profiles:[]}):send({ok:false,code:'UNAUTHORIZED'},401);
   if(url.pathname.startsWith('/api/activation-rewards/'))return send({ok:false,code:'UNAUTHORIZED'},401);
   return send({ok:false,code:'MOCK_ROUTE_NOT_IMPLEMENTED'},503);
  });
  await context.addInitScript(()=>{
   sessionStorage.setItem('privacyAgreed','true');
   window.__inputEvents=[];
   new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.interactionId)window.__inputEvents.push({name:entry.name,start:entry.startTime,duration:entry.duration});}).observe({type:'event',durationThreshold:16,buffered:true});
  });
  const page=await context.newPage();activePage=page;page.setDefaultTimeout(30000);
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto(origin+'/yeongnyangi/fortune/',{waitUntil:'load'});
  const question=page.getByLabel('상담 질문',{exact:true});await question.waitFor();
  const essential=page.getByRole('button',{name:'필수만 사용',exact:true});if(await essential.isVisible())await essential.click();
  assert.equal(products,0,'the first question must not wait for the consultation catalogue');
  await page.locator('link[data-cd-payment-runtime-prefetch]').waitFor({state:'attached'});
  assert.equal(await page.locator('script[src^="/js/destiny-profile.js"]').count(),0,'entry prefetch must not execute the legacy runtime');
  await question.focus();await page.keyboard.press('a');
  await page.waitForTimeout(150);
  const inputEvents=await page.evaluate(()=>window.__inputEvents.filter(entry=>entry.name.startsWith('key')));
  // Preserve target misses in the report without skipping the remaining behavior checks.
  const inputTargetMet=inputEvents.every(entry=>entry.duration<=200);
  await question.fill('지금 준비하는 일을 계속할까요?');
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('yeongnyangi:consultation-login-draft')));
  assert.equal(stored.question,'지금 준비하는 일을 계속할까요?');assert.equal(stored.chatStep,'question');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:resolve(output,`entry-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'상담과 결제 확인하기',exact:true}).click();
  await page.getByText('질문 수정하기',{exact:true}).waitFor();
  await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('yeongnyangi:consultation-login-draft')||'null')?.chatStep==='checkout');
  assert(products>0);
  assert.equal(await page.locator('textarea').first().inputValue(),'지금 준비하는 일을 계속할까요?');
  assert.equal(mutations,0,'preparation must never create a paid request or spend rights');
  await page.screenshot({path:resolve(output,`prepared-${width}.png`),fullPage:true});
  // A reload and an explicit legacy link must reuse the existing draft/route handling.
  await page.reload({waitUntil:'load'});await page.getByText('질문 수정하기',{exact:true}).waitFor();
  assert.equal(await page.locator('textarea').first().inputValue(),'지금 준비하는 일을 계속할까요?');
  await page.goto(origin+'/yeongnyangi/fortune/?flow=legacy&domain=saju',{waitUntil:'load'});
  await page.getByRole('group',{name:'운세 종류',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'지금, 어떤 마음이 궁금하세요?',exact:true}).count(),0);
  assert.equal(mutations,0);
  if(width===390){
   account={id:'fixture-owner-a',email:'owner-a@example.test'};
   await page.evaluate(user=>{sessionStorage.removeItem('yeongnyangi:consultation-login-draft');localStorage.setItem('fortune_auth_user',JSON.stringify(user));localStorage.setItem('fortune_auth_token','fixture-only');},account);
   await page.goto(origin+'/yeongnyangi/fortune/',{waitUntil:'load'});await question.waitFor();await question.fill('이전 계정의 개인 질문');
   account={id:'fixture-owner-b',email:'owner-b@example.test'};
   await page.evaluate(user=>{localStorage.setItem('fortune_auth_user',JSON.stringify(user));window.dispatchEvent(new CustomEvent('cd:auth-changed',{detail:{event:'login'}}));},account);
   await page.waitForFunction(()=>document.querySelector('#yn-question')?.value==='');
   assert.equal(await question.inputValue(),'');assert.equal(mutations,0);
  }
  proof.push({width,products,mutations,firstQuestionReady:true,draftRetained:true,legacyEntryPreserved:true,accountIsolation:width===390?true:undefined,overflow:false,inputTargetMet,inputEvents,apiRequests});
  await context.close();
 }
 await writeFile(resolve(output,'proof.json'),JSON.stringify(proof,null,2));
 await Promise.all(['failure.png','failure.json'].map(name=>rm(resolve(output,name),{force:true})));
 console.log(JSON.stringify(proof.map(({apiRequests,...row})=>row)));
}catch(error){
 if(activePage){await activePage.screenshot({path:resolve(output,'failure.png'),fullPage:true}).catch(()=>{});await writeFile(resolve(output,'failure.json'),JSON.stringify({error:String(error),url:activePage.url(),text:await activePage.locator('body').innerText(),state:await activePage.evaluate(()=>({draft:sessionStorage.getItem('yeongnyangi:consultation-login-draft'),inputEvents:window.__inputEvents}))},null,2));}
 throw error;
}finally{await browser.close();await new Promise(done=>server.close(done));}
