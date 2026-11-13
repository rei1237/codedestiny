import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import daily from '../../../worker/yeongnyangi/fortune/free/categories.json' with {type:'json'};

const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const ctx=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
ctx.setDefaultTimeout(15000);
await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const page=await ctx.newPage();
async function room(){
 await page.goto(origin);
 await page.locator('.world-entry-yeongnyangi').click();
}
try{
 await room();await page.getByRole('button',{name:/분야별 리포트/}).click();
 const systems=page.getByRole('group',{name:'운세 종류'}).getByRole('button');
 const tiers=page.getByRole('group',{name:'생선 상품'}).getByRole('button');
 await systems.first().waitFor();assert.equal(await systems.count(),7);
 const selected=new Set();
 for(let index=0;index<7;index++){
  await systems.nth(index).click();assert.equal(await tiers.count(),4);
  for(let tier=0;tier<4;tier++){
   await tiers.nth(tier).click();assert.equal(await tiers.nth(tier).getAttribute('aria-pressed'),'true');
   selected.add(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('yeongnyangi:consultation-login-draft')).productId));
  }
 }
 assert.equal(selected.size,28);
 await page.reload();await tiers.nth(3).waitFor();
 assert.equal(await systems.nth(6).getAttribute('aria-pressed'),'true');
 assert.equal(await tiers.nth(3).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'로그인하고 상담 이어가기'}).click();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 await systems.nth(6).waitFor();
 const time=page.locator('#consultation-time'),place=page.locator('#consultation-place');
 for(const [field,label,value] of [[time,'태어난 시간','0835'],[place,'출생 지역','서울']]){
  if(!await field.count())continue;
  if(!await field.isVisible())await page.locator('summary').filter({hasText:label}).first().click();
  await field.fill(value);await field.blur();
 }
 await page.getByRole('button',{name:'결제 내용 확인하기'}).click();
 const checkout=page.locator('[data-yn-checkout]');await checkout.getByRole('button',{name:'단건 결제로 상담 시작하기'}).click();
 const chapter=page.getByText(/이 문단은 화면과 구매 후 열람/).first();await chapter.waitFor();
 const fusionId=new URL(page.url()).searchParams.get('id'),fusionText=await chapter.textContent();
 await room();await page.getByRole('link',{name:'영냥이 보관함'}).click();
 await page.locator('a[href*="'+fusionId+'"]').first().click();assert.equal(await chapter.textContent(),fusionText);
 await room();await page.getByRole('button',{name:/오늘의 운세와 출석/}).click();
 await page.getByRole('button',{name:'오늘 출석하기'}).click();
 await page.getByRole('button',{name:/마리로 오늘의 운세 열기/}).click();
 const dailyOptions=page.getByRole('group',{name:'오늘의 운세 종류'});
 const categories=daily.filter(c=>c.id!=='horary');assert.equal(await dailyOptions.getByRole('button').count(),categories.length);
 const result=page.locator('article.daily-result'),first=new Map();
 for(const category of categories){
  await dailyOptions.getByRole('button',{name:category.label,exact:true}).click();
  const form=page.locator('.daily-form');
  await form.getByRole('heading',{name:category.label+' 준비하기'}).waitFor();
  if(await form.getByLabel('태어난 날짜').count()){
   await form.getByLabel('태어난 날짜').fill('1997-02-10');
   await form.getByLabel('태어난 시각을 몰라요').check();
   await form.getByLabel('계산에 사용하는 성별').selectOption('F');
   await form.getByLabel('출생 도시').selectOption({index:1});
  }
  await form.getByRole('button',{name:'이 정보로 오늘의 이야기 보기'}).click();
  await result.getByRole('heading',{name:'[테스트 전용] '+category.label,exact:true}).waitFor();
  first.set(category.id,await result.innerText());
 }
 await room();await page.getByRole('button',{name:/오늘의 운세와 출석/}).click();
 for(const category of categories){
  await dailyOptions.getByRole('button',{name:category.label,exact:true}).click();
  await result.getByRole('heading',{name:'[테스트 전용] '+category.label,exact:true}).waitFor();
  assert.equal(await result.innerText(),first.get(category.id));
 }
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')));
 assert.equal(Object.keys(state.daily.readings).length,15);assert.equal(state.daily.balance,0);assert.equal(state.orders.length,1);assert.equal(state.fortunes[0][1].fortune.product.id,'fusion_all');
 console.log('PASS 360px 홈 → 영냥이 리포트 28개 선택과 재진입, 복합 전체 원문 보관함, 출석 → 15종 입력 → 당일 저장 원문 15개, 당일 운세 추가 결제 0건');
}catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(0,2400));throw error;}finally{await browser.close();}
