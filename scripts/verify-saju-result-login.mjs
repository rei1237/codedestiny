import './lib/mock-network-guard.cjs';
import { openFreeSajuForm } from './lib/open-free-saju-form.mjs';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),out='build-cache/signup-result-gate';
await mkdir(out,{recursive:true});
// W2(2026-11-21): FREE_RESULT_GUEST_ENABLED 를 끈 원본(로그인 벽)과 켠 동작(비회원 무료 결과)을 같은 셸에서 둘 다 확인한다.
// 끈 경우는 saju-engine.js 응답의 상수만 false 로 바꿔 내려 준다(나머지 코드는 같은 파일).
const FLAG_ON='var FREE_RESULT_GUEST_ENABLED = true;',FLAG_OFF='var FREE_RESULT_GUEST_ENABLED = false;';
const engineSource=await readFile(resolve(root,'js/saju-engine.js'),'utf8');
assert.ok(engineSource.includes(FLAG_ON)||engineSource.includes(FLAG_OFF),'saju-engine.js 에 FREE_RESULT_GUEST_ENABLED 상수가 있어야 한다');
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const pathname=['/','/ggulggul/'].includes(url.pathname)?'/index.html':url.pathname;
 const file=resolve(root,'.'+pathname);
 if(!file.startsWith(root+'\\')&&!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try{const data=await readFile(file);res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch();
const evidence=[];
async function openContext(width,guestFlag){
 const state={signedIn:false,authCalls:0};
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.startsWith('/api/')){
   if(url.pathname==='/api/auth/me'){state.authCalls++;await route.fulfill({status:state.signedIn?200:401,json:state.signedIn?{ok:true,authenticated:true,user:{id:'mock-result-user',name:'검증'}}:{ok:false,error:'unauthorized'}});return;}
   await route.fulfill({status:200,json:{ok:true,profiles:[],unlocks:[],data:{}}});return;
  }
  if(url.origin!==origin){await route.abort();return;}
  if(url.pathname.replace(/\/$/,'')==='/login'){await route.fulfill({contentType:'text/html',body:'<p>Mock OAuth boundary</p>'});return;}
  if(url.pathname==='/js/saju-engine.js'){
   const body=engineSource.replace(guestFlag?FLAG_OFF:FLAG_ON,guestFlag?FLAG_ON:FLAG_OFF);
   assert.ok(body.includes(guestFlag?FLAG_ON:FLAG_OFF));
   await route.fulfill({contentType:'text/javascript',body});return;
  }
  await route.continue();
 });
 await context.addInitScript(()=>sessionStorage.setItem('privacyAgreed','true'));
 const page=await context.newPage();page.on('dialog',d=>d.dismiss());
 return {context,page,state};
}
try{
 // 플래그 끔: 이전 계약(로그인 벽) 그대로.
 for(const width of [360,390,430,1280]){
  const {context,page,state}=await openContext(width,false);
  await openFreeSajuForm(page,origin);
  await page.locator('#birthDate').fill('19900515');
  await page.locator('#nameInput').fill('입력복원검증');
  await page.locator('#run-btn').click();
  await page.locator('#cdLoginRequiredModal.is-open').waitFor();
  assert.equal(await page.locator('#resultPage').isVisible(),false);
  assert.ok(state.authCalls>0,'server session checked');
  const draft=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('cd:saju-login-draft:v1')));
  assert.equal(draft.fields.birthDate.replaceAll('-',''),'19900515');
  assert.equal('guestResult' in draft,false);
  assert.match(await page.locator('#cdLoginRequiredDesc').textContent(),/회원가입/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${out}/gate-${width}.png`,animations:'disabled'});
  await page.locator('[data-cd-login-close="1"]').click();
  assert.equal(await page.locator('#resultPage').isVisible(),false);
  // Reload after cancelled login retains the input, but does not redirect again.
  await page.reload({waitUntil:'domcontentloaded'});
  await openFreeSajuForm(page);
  await page.waitForFunction(()=>document.getElementById('birthDate').value.replaceAll('-','')==='19900515');
  assert.equal(await page.locator('#cdLoginRequiredModal.is-open').count(),0);
  await page.locator('#run-btn').click();
  await page.locator('#cdLoginRequiredModal.is-open [data-cd-login-action="login"]').click();
  await page.waitForURL('**/login?**');
  const returnPath=new URL(page.url()).searchParams.get('next');
  assert.ok(returnPath.includes('action=cdOneStepFreeSajuEntry'));
  assert.ok(!returnPath.includes('1990'));
  // Mock the completed OAuth session; the real bootstrap, draft and engine resume.
  state.signedIn=true;
  await page.goto(origin+returnPath,{waitUntil:'domcontentloaded'});
  await page.locator('#resultPage').waitFor({state:'visible',timeout:60000});
  await page.waitForFunction(()=>sessionStorage.getItem('cd:saju-login-draft:v1')===null);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('cd:saju-login-draft:v1')),null);
  await page.screenshot({path:`${out}/resumed-${width}.png`});
  evidence.push({flag:'off',width,guestBlocked:true,cancelRestored:true,mockLoginResumed:true,authCalls:state.authCalls});
  await context.close();
 }
 // 플래그 켬: 비회원이 동의 뒤 로그인 없이 무료 결과를 보고, 상세 풀이·저장의 로그인 뒤 같은 결과로 돌아온다.
 for(const width of [360,960]){
  const {context,page,state}=await openContext(width,true);
  await openFreeSajuForm(page,origin);
  await page.locator('#birthDate').fill('19900515');
  await page.locator('#nameInput').fill('비회원결과검증');
  await page.locator('#run-btn').click();
  await page.locator('#resultPage').waitFor({state:'visible',timeout:60000});
  await page.waitForFunction(()=>!(document.getElementById('sajuFormStatus')?.textContent||'').trim()&&!document.getElementById('sajuCalcLoadingOverlay')?.classList.contains('saju-calc-loading-overlay--visible'),null,{timeout:60000});
  assert.equal(await page.locator('#cdLoginRequiredModal.is-open').count(),0,'guest is not walled');
  assert.ok(state.authCalls>0,'server session still checked (no auth bypass for members)');
  const draft=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('cd:saju-login-draft:v1')));
  assert.equal(draft.guestResult,true);assert.equal(draft.fields.birthDate.replaceAll('-',''),'19900515');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${out}/guest-result-${width}.png`});
  // 상세 풀이·저장 같은 로그인 필요 기능은 공용 로그인 모달을 현재 주소로 연다(destiny-profile.js 와 같은 인자).
  await page.evaluate(()=>window.__cdOpenLoginRequiredModal({reason:'로그인 후 이용할 수 있는 기능입니다.',redirectTo:location.pathname+location.search+location.hash}));
  await page.locator('#cdLoginRequiredModal.is-open [data-cd-login-action="login"]').click();
  await page.waitForURL('**/login?**');
  const returnPath=new URL(page.url()).searchParams.get('next');
  assert.ok(returnPath.includes('action=cdOneStepFreeSajuEntry'),'guest result login returns to the free saju entry');assert.ok(!returnPath.includes('1990'));
  state.signedIn=true;
  await page.goto(origin+returnPath,{waitUntil:'domcontentloaded'});
  await page.locator('#resultPage').waitFor({state:'visible',timeout:60000});
  await page.waitForFunction(()=>sessionStorage.getItem('cd:saju-login-draft:v1')===null);
  assert.equal(await page.locator('#cdLoginRequiredModal.is-open').count(),0);
  await page.screenshot({path:`${out}/guest-login-returned-${width}.png`});
  evidence.push({flag:'on',width,guestResultShown:true,loginReturnedToResult:true,authCalls:state.authCalls});
  await context.close();
 }
 await writeFile(`${out}/results.json`,JSON.stringify({mode:'mock browser; no real OAuth, payments or LLM',evidence},null,2));
 console.log(JSON.stringify(evidence));
}finally{await browser.close();await new Promise(r=>server.close(r));}
