import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4395';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},locale:'ko-KR',reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',error=>console.error(error.message));
 const open=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('button',{name:/사주 FPTI/}).first().click();await page.getByRole('heading',{name:'나의 운명 성향'}).waitFor().catch(async error=>{console.error(page.url(),(await page.locator('body').innerText()).slice(0,350));throw error;});};
 await open();
 await page.locator('input[type=date]').fill('1990-01-01');await page.getByLabel('태어난 시간을 몰라요').check();
 await page.getByRole('button',{name:'성향 분석 시작하기'}).click();
 await page.getByText('로그인 후 저장한 출생 프로필을 선택해 분석하면', {exact:false}).waitFor();
 assert.equal(await page.getByRole('button',{name:'심층 리포트 무료로 보기'}).count(),0);
 await page.getByRole('link',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.waitForURL('**/saju-fpti/');
 const report=async()=>{
  await page.locator('#fpti-profile').selectOption('mock-profile');
  await page.getByRole('button',{name:'성향 분석 시작하기'}).click();
  await page.getByRole('button',{name:'심층 리포트 무료로 보기'}).click();
  await page.getByText('무료 리포트를 불러왔어요',{exact:false}).first().waitFor();
  const chapters=page.locator('.fpti-deep article[data-fpti-pdf-section]');
  assert.equal(await chapters.count(),7);
  await chapters.last().getByRole('button').first().click();
  const text=await chapters.last().innerText();
  assert.ok(text.length>600);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  return text;
 };
 const first=await report();await page.reload();const second=await report();assert.equal(second,first);
 await page.getByText('기존 FPTI 구매 기록',{exact:true}).click();
 assert.equal(await page.getByRole('link',{name:'웹 보관함 열기'}).getAttribute('href'),'https://code-destiny.com/records/');
 console.log('PASS 360px FPTI home, guest basic, saved profile free chapters 1–7, reload and re-read, original website archive');
}finally{await browser.close();}
