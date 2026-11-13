import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>console.error(e.message));
 async function open(){await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('button',{name:/자미두수 명반/}).click();}
 async function chart(){await page.getByLabel('태어난 날짜').fill('1991-05-12');await page.getByLabel('태어난 시각',{exact:true}).fill('14:10');await page.getByLabel('계산에 사용하는 성별').selectOption('F');await page.getByLabel('출생 도시').selectOption({index:1});await page.getByRole('button',{name:'명반 펼치기'}).click();}
 const question='다음 이직 준비에서 먼저 살펴볼 것은 무엇인가요';
 await open();await chart();assert.equal(await page.locator('.ziwei-palace').count(),12);
 const focus=page.getByLabel('관심 분야');assert.equal(await focus.locator('option').count(),8);await focus.selectOption('custom');await page.getByLabel('궁금한 질문').fill(question);
 await page.getByRole('button',{name:/토스 로그인하고 심층/}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByLabel('궁금한 질문').waitFor();assert.equal(await page.getByLabel('궁금한 질문').inputValue(),question);
 await open();await page.getByRole('button',{name:'명반 펼치기'}).click();assert.equal(await page.getByLabel('궁금한 질문').inputValue(),question);
 await page.evaluate(()=>localStorage.setItem('toss-offline-generation-delay-ms','700'));
 await page.getByRole('button',{name:/심층 리포트 열기/}).click();await page.waitForURL(/ziwei\/chart\?resultId=/);const result=page.url();
 await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:/기록 보관함|구매 기록/}).first().click();await page.locator('button.record').first().click();
 await page.waitForURL(result);await page.getByText('15 / 15개 장 저장').waitFor();
 assert.equal(await page.locator('[data-ziwei-pdf-section]').count(),15);
 await page.locator('[data-ziwei-pdf-section] summary').last().click();const last=await page.locator('[data-ziwei-pdf-section] details p').last().innerText();
 await page.reload();await page.getByText('15 / 15개 장 저장').waitFor();await page.locator('[data-ziwei-pdf-section] summary').last().click();
 assert.equal(await page.locator('[data-ziwei-pdf-section] details p').last().innerText(),last);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length),1);
 await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();
 await page.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));await open();await chart();await page.getByRole('button',{name:/토스 로그인하고 심층/}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByRole('button',{name:/심층 리포트 열기/}).waitFor();await page.goto(result);await page.getByRole('heading',{name:'구매 기록 확인'}).waitFor();assert.equal(await page.locator('[data-ziwei-pdf-section]').count(),0);
 console.log('PASS 360px Ziwei: guest 12 palaces → eight focus options and draft → mock login and one IAP → interrupted job → 15 saved chapters → second account denied.');
}finally{await browser.close();}

