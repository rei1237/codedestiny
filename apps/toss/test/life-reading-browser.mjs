import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',request=>new URL(request.request().url()).origin===origin?request.continue():request.abort());
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const reportLinks=[];
 for(const title of ['인생 총운','인생의 책']){
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
  await page.getByRole('searchbox').fill(title);
  await page.locator('.directory-list button').filter({hasText:title}).first().click();
  const form=page.locator('#life-book-form');
  await form.locator('button[type=submit]').waitFor();
  if(!reportLinks.length){
   assert.equal(await form.locator('button[type=submit]').isDisabled(),true);
   await form.locator('a[href*="/login/"]').click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
  }
  await form.getByRole('button',{name:'여성',exact:true}).click();
  await form.getByLabel(/생년월일/).fill('19910512');
  await form.locator('input[type=checkbox]').check();
  await form.locator('button[type=submit]').click();
  await page.waitForURL(/\/life-book-ai\/result\/?\?attemptId=/);
  const body='[테스트 전용] '+title+'에 저장된 상담 원문입니다.';
  await page.getByText(body,{exact:false}).first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
  reportLinks.push({url:page.url(),body,title});
 }
 for(const {body,title} of reportLinks){
  await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();
  await page.getByRole('button',{name:/기록 보관함|구매 기록/}).first().click();
  await page.locator('button.record').filter({hasText:title}).first().click();await page.getByText(body,{exact:false}).first().waitFor();
 }
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length),2);
 await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();
 await page.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
 await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('인생 총운');await page.locator('.directory-list button').first().click();
 await page.locator('#life-book-form a[href*="/login/"]').click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.locator('#life-book-form').waitFor();
 await page.locator('#life-book-form button[type=submit]:enabled').waitFor();
 for(const {url,body} of reportLinks){
  await page.goto(url);await page.getByText(/구매 기록 확인|구매한 계정|찾을 수 없|불러오지 못/).first().waitFor();
  assert.equal(await page.getByText(body,{exact:false}).count(),0);
 }
 console.log('PASS 360px life book and life fortune, two mode-specific checkouts, original saved reports and second-account denial');
}finally{await browser.close();}
