// Local mocks only; unknown external requests are blocked, including payment providers.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {listBillingFeatures} from '../../worker/lib/billing-feature-registry.js';
import {buildCareerReport,careerNatalInput} from '../../lib/saju/career-style/report.mjs';
const origin=process.argv[2];
if(!origin||!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Local mock origin required');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
await context.addCookies([{name:'cd_cookie_consent',value:'essential',url:origin}]);
const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(120000);
const errors=[],calls=[],unlocks=[],saved=new Map(),owned=new Set();
let guest=false,broken=false,balance=29,failRead=false;
const profiles=[{profileId:'card-a',name:'테스트 하나',birthDate:'2000-03-15',birthTime:'12:30',calendarType:'solar'},{profileId:'card-b',name:'테스트 둘',birthDate:'2001-08-21',birthTimeUnknown:true,calendarType:'solar'}];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin!==origin)return route.abort();
 if(!url.pathname.startsWith('/api/'))return route.continue();
 calls.push(url.pathname);
 const reply=(status,body)=>route.fulfill({status,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify(body)});
 if(url.pathname==='/api/yeongnyangi/profiles')return reply(guest?401:broken?503:200,{ok:!guest&&!broken,profiles,currentId:'card-a',message:broken?'프로필 조회 실패':''});
 if(url.pathname==='/api/billing/features')return reply(200,{ok:true,...listBillingFeatures()});
 if(url.pathname==='/api/auth/me')return reply(guest?401:200,{ok:!guest,user:{id:'mock-user',name:'테스트'}});
 if(url.pathname==='/api/auth/refresh')return reply(401,{ok:false});
 if(url.pathname==='/api/saju/career-style'){
  if(guest)return reply(401,{ok:false,message:'로그인이 필요해요.'});
  const pid=route.request().method()==='POST'?route.request().postDataJSON().profileId:url.searchParams.get('profileId');
  const result={ok:true,profileId:pid,featureKey:'saju-career-style',unlocked:owned.has(pid),priceKRW:5000,honeyCost:30};
  if(route.request().method()==='GET')return reply(200,result);
  if(!owned.has(pid))return reply(402,{ok:false,message:'리포트를 해금한 뒤 확인해 주세요.'});
  if(failRead){failRead=false;return reply(503,{ok:false,message:'결과를 저장하지 못했어요. 다시 시도해 주세요.'});}
  if(!saved.has(pid))saved.set(pid,buildCareerReport(careerNatalInput(profiles.find(p=>p.profileId===pid))));
  return reply(200,{...result,report:saved.get(pid)});
 }
 if(url.pathname==='/api/honey/unlocks'){
  const body=route.request().postDataJSON();unlocks.push(body);
  if(!owned.has(body.profileId)){
   if(balance<30)return reply(402,{ok:false,message:'꿀방울 30개가 필요해요. 출석하고 모아보세요.'});
   balance-=30;owned.add(body.profileId);await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cd:auth-changed',{detail:{source:'subscription-sync',event:'subscription'}})));
  }
  return reply(200,{ok:true,unlocked:true,featureKey:'saju-career-style'});
 }
 return reply(404,{ok:false,message:'UNEXPECTED_MOCK_REQUEST'});
});
await page.addInitScript(()=>{localStorage.setItem('fortune_auth_user',JSON.stringify({id:'mock-user',name:'테스트'}));localStorage.setItem('cd_tile_locks',JSON.stringify({'saju-career-style':true}));});
const report=page.getByRole('article',{name:'나의 일 스타일 리포트'});
const open=()=>page.getByRole('button',{name:'결과 확인하기',exact:true}).click();
try{
 await page.goto(origin+'/saju/career-style/',{waitUntil:'domcontentloaded'});
 const cookie=page.getByRole('button',{name:'필수만 사용',exact:true});if(await cookie.isVisible())await cookie.click();
 assert.equal(await page.locator('h1').count(),1);assert.match(await page.locator('title').innerText(),/진로·적성/);
 assert.equal(await report.count(),0); // A forged local unlock never reveals the paid text.
 const honey=()=>page.getByRole('button',{name:'꿀방울 30개로 열기',exact:true});
 fs.mkdirSync('.tmp/career-style',{recursive:true});
 for(const width of [360,1280]){
  await page.setViewportSize({width,height:1100});
  await page.locator('#start-title').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
  await page.screenshot({path:'.tmp/career-style/locked-actions-'+width+'.png'});
  assert.ok(await honey().isVisible());
 }
 await page.getByRole('button',{name:'이용권·단건 결제로 열기',exact:true}).click();
 await page.getByText('이번 콘텐츠만 · 5,000원',{exact:true}).waitFor();
 assert.equal(await report.count(),0);
 await page.getByRole('button',{name:'취소',exact:true}).click();
 await page.locator('[data-paid-feature-gate-status=cancelled]').getByRole('button',{name:/닫기/}).click();
 await page.getByRole('button',{name:'이용권·단건 결제로 열기',exact:true}).waitFor();
 await honey().click();await page.getByRole('alert').filter({hasText:'꿀방울 30개가 필요'}).waitFor();assert.equal(balance,29);assert.equal(await report.count(),0);
 balance=60;failRead=true;await honey().click();await page.getByRole('alert').filter({hasText:'결과를 저장하지'}).waitFor();assert.equal(balance,30);
 const requestId=unlocks[0].requestId;assert.equal(unlocks[1].requestId,requestId);
 await honey().click();await report.waitFor();assert.equal(balance,30);assert.equal(unlocks.length,2);
 assert.equal(await report.locator('section[id^="career-chapter-"]').count(),8);
 const first=await report.locator('header h2').innerText();
 // Relogin/reload reads the same original without a second unlock.
 await page.reload({waitUntil:'domcontentloaded'});await open();await report.waitFor();assert.equal(unlocks.length,2);assert.equal(balance,30);assert.equal(await report.locator('header h2').innerText(),first);
 await page.getByRole('button',{name:/테스트 둘/}).click();await report.waitFor({state:'detached'});await honey().click();await report.waitFor();assert.equal(balance,0);
 await report.getByText('계산 근거와 해석 범위 확인').click();assert.match(await report.innerText(),/시간 미상/);
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__careerShare=data;}}));
 await page.getByRole('button',{name:'일 스타일 소개 공유하기'}).click();
 const share=await page.evaluate(()=>window.__careerShare);assert.equal(share.url,'https://code-destiny.com/saju/career-style/');assert.doesNotMatch(JSON.stringify(share),/테스트|2001|card-b/);
 fs.mkdirSync('.tmp/career-style',{recursive:true});
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:0,behavior:'instant'});});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'landing overflow '+width);
  await page.screenshot({path:'.tmp/career-style/landing-'+width+'.png'});
  await page.locator('#start-title').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:'.tmp/career-style/unlocked-'+width+'.png'});
 }
 await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
 guest=true;await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cd:auth-changed',{detail:{event:'logout'}})));await report.waitFor({state:'detached'});
 await page.getByRole('button',{name:'로그인하고 리포트 확인하기'}).waitFor();
 guest=false;broken=true;await page.reload({waitUntil:'domcontentloaded'});await page.getByText('프로필 조회 실패').waitFor();assert.equal(await report.count(),0);
 assert.deepEqual(errors,[]);
 const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(node=>node.src));
 for(const src of scripts){const source=await (await context.request.get(src)).text();assert.ok(!source.includes('function buildCareerReport('),'Paid engine found in client JS');assert.ok(!source.includes('일주일 뒤 남길 나만의 판단 기준'),'Paid manuscript found in client JS');}
 console.log(JSON.stringify({status:'PASS',widths:[360,390,430,1280],honeyDebits:2,balance,requestReuse:true,relogin:true,serverFailureRetry:true,calls:[...new Set(calls)],clientBundlePaidEngine:false}));
}catch(error){console.error(error);console.error({url:page.url(),calls:[...new Set(calls)]});throw error;}finally{await browser.close();}
