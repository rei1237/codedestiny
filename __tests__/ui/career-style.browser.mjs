// Local fixture-only browser regression. Usage: node __tests__/ui/career-style.browser.mjs http://127.0.0.1:PORT
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin=process.argv[2];
if(!origin||!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Local mock origin required');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
await context.addCookies([{name:'cd_cookie_consent',value:'essential',url:origin}]);
const page=await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(60000);
const requests=[],featureRequests=[],errors=[];
let guest=false,fail=false;
let profiles=[{profileId:'card-a',name:'테스트 하나',birthDate:'2000-03-15',birthTime:'12:30',calendarType:'solar'},{profileId:'card-b',name:'테스트 둘',birthDate:'2001-08-21',birthTimeUnknown:true,calendarType:'solar'}];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.origin!==origin)return route.abort();
 if(!u.pathname.startsWith('/api/'))return route.continue();
 requests.push(u.pathname);
 if(new URL(page.url()).pathname.replace(/\/$/, "") === "/saju/career-style")featureRequests.push(u.pathname);
 const json=(status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(u.pathname==='/api/yeongnyangi/profiles'){
  if(guest)return json(401,{ok:false});
  if(fail)return json(503,{ok:false,message:'프로필 조회 실패'});
  if(route.request().method()==='POST'){const body=route.request().postDataJSON();profiles.push(body.profile);return json(200,{ok:true,profile:body.profile});}
  return json(200,{ok:true,profiles,currentId:profiles[0]?.profileId});
 }
 if(u.pathname==='/api/auth/refresh')return json(401,{ok:false});
 if(u.pathname==='/api/auth/me')return json(guest?401:200,{ok:!guest,user:{id:'mock-user',name:'테스트'}});
 return json(404,{ok:false,error:'UNEXPECTED_MOCK_REQUEST'});
});
await page.addInitScript(()=>{localStorage.setItem('fortune_auth_user',JSON.stringify({id:'mock-user',name:'테스트'}));});
const report=page.getByRole('article',{name:'나의 일 스타일 리포트'});
async function auth(event='login'){await page.evaluate(event=>window.dispatchEvent(new CustomEvent('cd:auth-changed',{detail:{event}})),event);}
async function open(){await page.getByRole('button',{name:'내 프로필로 결과 보기',exact:true}).click();await report.waitFor();}
try{
 await page.goto(`${origin}/saju/career-style/`,{waitUntil:'domcontentloaded'});
 const cookie=page.getByRole('button',{name:'필수만 사용',exact:true});if(await cookie.isVisible())await cookie.click();
 assert.equal(await page.locator('h1').count(),1);
 await open();
 const first=await report.locator('header h2').innerText();
 assert.equal(await report.locator('section[id^="career-chapter-"]').count(),8);
 const extra=report.locator('summary').filter({hasText:'이 이야기의 사주 단서'});
 for(const summary of await extra.all())await summary.click();
 assert.ok(await report.getByText('해석의 근거',{exact:true}).count()>8);
 assert.ok(await report.getByText('이렇게 확인해 보세요',{exact:true}).count()>8);
 for(const summary of await extra.all())await summary.click();
 await page.getByRole('button',{name:/테스트 둘/}).click();
 await page.waitForFunction(first=>document.querySelector('article header h2')?.textContent!==first,first);
 await report.getByText('계산 근거와 해석 범위 확인').click();
 assert.match(await report.innerText(),/시간 미상/);
 // Native sharing, clipboard fallback, manual fallback, all with allowlisted payloads.
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__careerShare=data;}}));
 await page.getByRole('button',{name:'일 스타일 소개 공유하기'}).click();
 const share=await page.evaluate(()=>window.__careerShare);
 assert.equal(share.url,'https://code-destiny.com/saju/career-style/');assert.doesNotMatch(JSON.stringify(share),/테스트|2001|card-b/);
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__careerClipboard=text;}}});});
 await page.getByRole('button',{name:'일 스타일 소개 공유하기'}).click();assert.match(await page.evaluate(()=>window.__careerClipboard),/https:\/\/code-destiny.com\/saju\/career-style\//);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
 await page.getByRole('button',{name:'일 스타일 소개 공유하기'}).click();await page.getByLabel('직접 복사할 공개 주소').waitFor();
 fs.mkdirSync('.tmp/career-style',{recursive:true});
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:0,behavior:'instant'});});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow ${width}: ${JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll("body *")].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right}))))}`);
  await page.screenshot({path:`.tmp/career-style/landing-${width}.png`});
  await report.locator(':scope > header').scrollIntoViewIfNeeded();await page.screenshot({path:`.tmp/career-style/report-${width}.png`});
  for(const img of await report.locator('img').all()){
   await img.scrollIntoViewIfNeeded();
   await img.evaluate(async el=>{await el.decode();if(!el.naturalWidth)throw Error('Report image failed to load');});
  }
  await page.locator('#career-chapter-3').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`report image overflow ${width}`);
  await page.screenshot({path:`.tmp/career-style/chapter-art-${width}.png`});
  const combination=page.locator('#career-chapter-4');
  await combination.scrollIntoViewIfNeeded();
  await combination.screenshot({path:`.tmp/career-style/combinations-${width}.png`});
  await page.locator('#career-chapter-5').scrollIntoViewIfNeeded();
  await page.screenshot({path:`.tmp/career-style/axes-${width}.png`});
 }
 await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
 // Logout, changed account, empty cards, errors and no stale report after invalidation.
 guest=true;await auth('logout');await report.waitFor({state:'detached'});
 console.log('report, card switch, share, responsive, logout: PASS');
 const loginButton=page.getByRole('button',{name:'가입하고 무료로 알아보기'});await loginButton.waitFor();
 await loginButton.click();await page.waitForURL(/\/login\//);assert.match(page.url(),/next=%2Fsaju%2Fcareer-style%2F/);
 guest=false;profiles=[];await page.goto(`${origin}/saju/career-style/`,{waitUntil:'domcontentloaded'});
 assert.equal(await report.count(),0);assert.equal(await page.getByRole('button',{name:'내 프로필로 결과 보기'}).isDisabled(),true);
 await page.getByRole('button',{name:'새 프로필 만들기',exact:true}).click();
 await page.locator('input[name="name"]').fill('새 테스트 카드');
 await page.locator('input[name="date"]').fill('2000-03-15');
 await page.getByLabel('출생시간을 몰라요',{exact:true}).check();
 await page.getByRole('button',{name:'프로필 저장하기',exact:true}).click();
 await open();await report.getByText('계산 근거와 해석 범위 확인').click();assert.match(await report.innerText(),/시주 미상: 시주에 따라 갈리는 판정은 보류/);
 fail=true;await auth();await page.getByText('프로필 조회 실패').waitFor();assert.equal(await report.count(),0);
 fail=false;profiles=[{profileId:'new-account-card',name:'새 계정 카드',birthDate:'1999-11-12',birthTime:'09:00'}];
 await page.evaluate(()=>localStorage.setItem('fortune_auth_user',JSON.stringify({id:'second-user'})));await auth();await open();
 assert.doesNotMatch(await report.innerText(),/테스트 하나|테스트 둘/);
 await page.evaluate(()=>window.dispatchEvent(new Event('cd:auth-session-invalidated')));await report.waitFor({state:'detached'});
 await page.getByRole('button',{name:'가입하고 무료로 알아보기'}).waitFor();
 assert.deepEqual(errors,[]);
 const forbidden=featureRequests.filter(p=>/payment|billing|checkout|\/saju\/section|\/ai\/|\/llm\//.test(p));assert.deepEqual(forbidden,[]);
 console.log(JSON.stringify({status:'PASS',widths:[360,390,430,1280],featureRequests:[...new Set(featureRequests)],allFlowRequests:[...new Set(requests)],screenshots:'.tmp/career-style'},null,2));
}catch(error){console.error({url:page.url(),buttons:await page.getByRole('button').allTextContents(),alerts:await page.getByRole('alert').allTextContents(),requests:[...new Set(requests)]});throw error;}finally{await browser.close();}
