import './lib/mock-network-guard.cjs';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3139';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const bundle=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const {products}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const user={id:'507f1f77bcf86cd799439011',_id:'507f1f77bcf86cd799439011',name:'검증 사용자',email:'qa@example.invalid',role:'user'};
const profiles=['self','partner'].map((id,i)=>({profileId:id,id,name:i?'상대 프로필':'내 프로필',gender:'F',birth:{year:1994+i*3,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}}));
const browser=await chromium.launch({headless:true});const context=await browser.newContext();
const errors=[];let posted;let successfulPrepare=false;let libraryCalls=0,failLibrary=false,holdLibrary=false,held=false;
const attempts=new Set();
await context.addInitScript(user=>{localStorage.setItem('fortune_auth_user',JSON.stringify(user));},user);
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname.startsWith('/api/')){
  let data={ok:true,user,authenticated:true};let status=200;
  if(url.pathname.endsWith('/profiles'))data={ok:true,profiles,currentId:'self'};
  else if(url.pathname.endsWith('/products'))data={ok:true,products:products.map(p=>({...p,available:true}))};
  else if(url.pathname==='/api/yeongnyangi/requests'){
   if(route.request().method()==='POST'){posted=route.request().postDataJSON();status=successfulPrepare?201:503;data=successfulPrepare?{fortune:{id:'a'.repeat(64),paid:false,product:products.find(p=>p.id===posted.productId)}}:{code:'FIXTURE_PREPARED',message:'검증 완료',retryable:false};}
   else {libraryCalls++;if(holdLibrary){holdLibrary=false;held=true;await new Promise(resolve=>setTimeout(resolve,400));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fortunes:[{id:'old',product:products[0],createdAt:'2026-09-23',kindLabel:'이전 계정 기록',state:'COMPLETED'}],nextCursor:null})}).catch(()=>{});}if(failLibrary){status=503;data={code:'SERVICE_UNAVAILABLE',retryable:true};}else data={fortunes:Array.from({length:url.searchParams.has('cursor')?1:30},(_,i)=>({id:(url.searchParams.has('cursor')?'f':i.toString(16)).padStart(64,'0'),product:products[0],createdAt:'2026-09-23',state:'COMPLETED',paid:true,completedChapters:5})),nextCursor:url.searchParams.has('cursor')?null:'next'};}
  }
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 }
 if(url.origin===base)return route.continue();
 return route.abort();
});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await mkdir('.codex-consultation-shots',{recursive:true});
try{
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/yeongnyangi/fortune/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'사주 해석',exact:false}).waitFor();
  await page.getByRole('button',{name:'결제 내용 확인하기'}).waitFor();
  assert.equal(await page.locator('#consultation-question').count(),0);
  await page.getByRole('button',{name:'궁합 두 사람의 명식과 관계의 차이'}).click();
  await page.getByLabel('궁합 상대 (필수)').selectOption('partner');
  await page.getByRole('button',{name:'결제 내용 확인하기'}).click();
  await page.getByText('검증 완료',{exact:true}).waitFor();assert.equal(posted.consultationKind,'compatibility');assert.equal(posted.partnerProfileId,'partner');assert.equal(posted.question,'');
  const attempt=posted.consultationAttemptId;
  assert.match(attempt,/^[a-f0-9-]{36}$/);assert.ok(!attempts.has(attempt));attempts.add(attempt);
  await page.getByRole('button',{name:'결제 내용 확인하기'}).click();
  await page.getByText('검증 완료',{exact:true}).waitFor();assert.equal(posted.consultationAttemptId,attempt);
  await page.getByRole('button',{name:'대운 현재 대운과 다음 전환'}).click();
  assert.equal(await page.getByRole('group',{name:'생선 상품'}).getByRole('button').count(),1);
  await page.getByRole('button',{name:'무엇이든 물어보기 선택한 운세로 궁금한 이야기 살펴보기'}).click();
  await page.getByLabel('영냥이에게 궁금한 이야기').fill('앞으로 일의 방향을 어떻게 정할까요?');
  assert.ok(await page.locator('#consultation-topic').isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`.codex-consultation-shots/ask-${width}.png`,fullPage:true});
 }
 for(const [domain,label] of [['sukuyo','본명숙'],['vedic','베다 차트'],['astrology','출생 차트'],['ziwei','명반 해석'],['tarot','지금의 선택'],['fusion','종합 해석']]){await page.goto(base+`/yeongnyangi/fortune/?domain=${domain}`,{waitUntil:'domcontentloaded'});await page.getByRole('group',{name:'상담 종류'}).getByRole('button',{name:new RegExp(label)}).waitFor();assert.equal(await page.locator('#consultation-question').count(),domain==='tarot'?1:0);}
 successfulPrepare=true;
 await page.goto(base+'/yeongnyangi/fortune/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'결제 내용 확인하기'}).click();await page.waitForURL('**/checkout/**');
 const completedAttempt=posted.consultationAttemptId;
 await page.goBack();await page.getByRole('button',{name:'결제 내용 확인하기'}).click();await page.waitForURL('**/checkout/**');
 assert.notEqual(posted.consultationAttemptId,completedAttempt,'returning to the form starts a new consultation');
 await page.goto(base+'/yeongnyangi/library/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'이전 상담 더 보기'}).waitFor();
 const initialCalls=libraryCalls;
 failLibrary=true;await page.getByRole('button',{name:'이전 상담 더 보기'}).click();
 await page.getByRole('button',{name:'다시 불러오기'}).waitFor();
 assert.equal(await page.locator('a[href*="source=library"]').count(),30);
 failLibrary=false;await page.getByRole('button',{name:'다시 불러오기'}).click();
 await page.waitForFunction(()=>!document.querySelector('button[disabled]'));
 await page.getByRole('button',{name:'다시 불러오기'}).waitFor({state:'hidden'});
 assert.equal(await page.locator('a[href*="source=library"]').count(),30); // duplicate IDs are merged
 assert.equal(libraryCalls-initialCalls,3);
 await page.screenshot({path:'.codex-consultation-shots/library.png',fullPage:true});
 holdLibrary=true;await page.evaluate(()=>window.dispatchEvent(new Event('cd:auth-changed')));
 while(!held)await new Promise(resolve=>setTimeout(resolve,10));
 await page.evaluate(()=>{localStorage.setItem('fortune_auth_user',JSON.stringify({id:'507f1f77bcf86cd799439012'}));window.dispatchEvent(new Event('cd:auth-changed'));});
 await page.getByRole('button',{name:'이전 상담 더 보기'}).waitFor();await page.waitForTimeout(500);assert.equal(await page.getByText('이전 계정 기록').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: 4 viewport consultation flows, tier restriction, prepare payload, library retry/pagination/deduplication; all API calls mocked.');
}finally{await browser.close();}
