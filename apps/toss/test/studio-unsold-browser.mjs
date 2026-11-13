// The loopback-only devtools fixture supplies non-console SKUs at a test price.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();
 page.setDefaultTimeout(25000);
 for(const [domain,title] of [['astrology','서양 점성술'],['vedic','베다점'],['ziwei','자미두수'],['sukuyo','숙요점']]){
  await page.goto(origin);
  await page.locator('.world-entry-yeongnyangi').click();
  await page.getByRole('button',{name:title+' 상담',exact:false}).first().click();
  await page.locator('#yn-question').fill('새로운 직장에서 어떤 장점을 먼저 살려보면 좋을까요?');
  await page.getByRole('button',{name:'상담과 결제 확인하기'}).click();
  if(domain==='astrology'){
   await page.getByRole('button',{name:'토스로 로그인하기'}).click();
   await page.getByRole('button',{name:'토스로 로그인하기'}).click();
   await page.waitForURL(/yeongnyangi\/fortune/);
  }
  const checkout=page.locator('[data-yn-checkout]');
  await checkout.waitFor();
  const time=page.locator('#consultation-time');
  const place=page.locator('#consultation-place');
  for(const [field,label,value] of [[time,'태어난 시간','0835'],[place,'출생 지역','서울']]){
   if(!await field.count())continue;
   if(!await field.isVisible())await page.locator('summary').filter({hasText:label}).first().click();
   await field.fill(value);
   await field.blur();
  }
  await checkout.locator('aside').getByText('1원',{exact:true}).waitFor();
  await checkout.getByRole('button',{name:'단건 결제로 상담 시작하기'}).click();
  await page.waitForURL(/yeongnyangi\/result/);
  const chapter=page.getByText(/이 문단은 화면과 구매 후 열람/).first();
  await chapter.waitFor();
  const resultUrl=page.url(),text=await chapter.textContent();
  await page.goto(origin);
  await page.locator('.world-entry-yeongnyangi').click();
  await page.getByRole('link',{name:'영냥이 보관함'}).click();
  const id=new URL(resultUrl).searchParams.get('id');
  await page.locator('a[href*="'+id+'"]').first().click();
  await chapter.waitFor();
  assert.equal(await chapter.textContent(),text);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem('toss-offline-fixture')).fortunes.find(([id])=>id===key)[1],id);
  assert.equal(saved.sku,'mock-unregistered-'+domain);
  assert.equal(saved.generationCount,1);
  console.log('PASS',title,'home, original question input, virtual order, stored result and library reopen');
 }
}finally{await browser.close();}
