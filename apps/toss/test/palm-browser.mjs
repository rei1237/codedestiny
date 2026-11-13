import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import sharp from 'sharp';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
context.setDefaultTimeout(25000);
await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
const sample={name:'solid-local-fixture.png',mimeType:'image/png',buffer:await sharp({create:{width:480,height:620,channels:3,background:'#987c75'}}).png().toBuffer()};
const text='[테스트 전용] 저장된 손금 판독 원문입니다.';
async function home(p){await p.goto(origin);await p.locator('.world-entry-ggulggul').click();}
async function open(p){await home(p);await p.getByRole('button',{name:'내 손금 리포트',exact:true}).click();}
async function login(p){await p.getByRole('link',{name:'토스로 로그인하기'}).click();await p.getByRole('button',{name:'토스로 로그인하기'}).click();}
try{
 const p=await context.newPage();p.on('pageerror',e=>console.error(e.message));
 await open(p);await login(p);await p.locator('#palm-right-gallery-input').setInputFiles(sample);
 await p.locator('fieldset').filter({hasText:'주로 쓰는 손 선택'}).getByRole('button',{name:/오른손/}).click();
 const start=p.getByRole('button',{name:'손바닥 운명 지도 열기'});
 const override=p.getByRole('button',{name:'이 사진 그대로 분석하기'}).last();
 if(!await start.isEnabled()&&await override.isVisible())await override.click();
 if(!new URL(p.url()).searchParams.has('intentId'))await start.click();
 await p.getByText(text,{exact:false}).first().waitFor();const href=p.url();
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.close();const q=await context.newPage();await home(q);
 await q.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();await q.locator('article').filter({hasText:'내 손금 리포트'}).getByRole('link').last().click();
 await q.getByText(text,{exact:false}).first().waitFor();assert.equal(q.url(),href);
 const state=await q.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')));
 assert.deepEqual([state.orders.length,state.intents.length,state.intents[0][1].generationCount],[1,1,1]);
 assert.doesNotMatch(JSON.stringify(state),/data:image|HandLandmarks|LineCandidates/);
 await q.goto(origin);await q.getByRole('button',{name:'내 정보',exact:true}).click();await q.getByRole('button',{name:'로그아웃',exact:true}).click();await q.getByText('로그아웃했어요.').waitFor();
 await q.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));await open(q);await login(q);await q.waitForFunction(()=>JSON.parse(localStorage.getItem('toss-offline-fixture-2')||'{}').loggedIn===true);
 await q.goto(href);await q.getByRole('heading',{name:'구매 기록 확인'}).waitFor();assert.equal(await q.getByText(text).count(),0);
 console.log('PASS 합성 손금 입력·품질 확인, 가상 판독 후 구매, 원문 재열람·다른 계정 차단, 사진 미저장');
}catch(e){for(const p of context.pages())console.error(p.url(),(await p.locator('body').innerText()).slice(0,1000));throw e;}finally{await browser.close();}
