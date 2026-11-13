import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin='http://127.0.0.1:4329';
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
 const requests=[];
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  requests.push(url.pathname);
  return route.continue();
 });
 const page=await context.newPage();
 await page.goto(origin);
 await page.locator('.world-entry-ggulggul').click();
 await page.getByRole('button',{name:/오늘의 운세/}).first().click();
 const sign=page.getByLabel('별자리·띠');
 await sign.waitFor();
 assert.equal(await sign.locator('option').count(),24);
 await sign.selectOption('pig');
 await page.getByLabel('살펴볼 기간').selectOption('weekly');
 assert.equal(await page.locator('article.paper li').count(),7);
 assert.match(await page.locator('article.paper').innerText(),/돼지띠의 한 주/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
 await page.getByRole('button',{name:'토스 로그인하고 카드 펼치기'}).click();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByRole('button',{name:'오늘의 세 장 펼치기'}).click();
 for(let slot=1;slot<=3;slot++)await page.getByRole('button',{name:slot+'번째 카드 고르기',exact:true}).click();
 for(const label of ['오늘의 마음','마주할 흐름','작은 실천'])await page.getByRole('button',{name:label+' 자리의 카드 펼치기',exact:true}).click();
 const verdict=page.getByText('오늘 · 세 장을 모두 읽은 결론',{exact:true});
 await verdict.waitFor();
 const result=await verdict.locator('..').innerText();
 assert.equal(await page.locator('#daily-tarot a').count(),0);
 assert.equal(await page.locator('#daily-tarot img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),true);
 await page.reload();
 await verdict.waitFor();
 assert.equal(await verdict.locator('..').innerText(),result);
 assert.equal(requests.some(path=>path.includes('/orders/grant')||path.includes('/checkout')),false);
 console.log('PASS 360px home → 24 public signs → 7 weekly scores → mock login → three original cards → saved KST reading. No checkout.');
}finally{await browser.close();}
