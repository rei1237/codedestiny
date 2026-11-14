import assert from 'node:assert/strict';
import {TOSS_SUKUYO_TOOLS} from '../../../lib/fortune/toss-sukuyo-tools.mjs';
export async function verifyPrivateSukuyo(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(20000);
 const home=async title=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(title);await page.locator('.directory-list button').filter({hasText:title}).first().click();};
 try{
  await home('숙요점');await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await page.getByRole('button',{name:'본명숙 살펴보기'}).click();await page.locator('.sukuyo-basic-result').waitFor();
  await page.getByLabel('태어난 시각을 몰라요').check();await page.getByRole('button',{name:'본명숙 살펴보기'}).click();await page.locator('.sukuyo-basic-result').getByText(/정오 기준/).first().waitFor();
  await page.getByRole('button',{name:'관계·본성 풀이'}).click();
  for(const [key,title] of Object.entries(TOSS_SUKUYO_TOOLS).filter(([key])=>key!=='sukuyo-extreme-t-relationship')){
   await page.getByLabel('살펴볼 주제').selectOption(key);await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await page.getByRole('button',{name:'풀이 펼치기'}).click();await page.getByRole('heading',{name:title,exact:true}).first().waitFor();
   if(key==='sukuyo-relationship-encyclopedia'){const frame=page.frameLocator('iframe[title="'+title+'"]');await frame.locator('.sy-dogam-entry').first().waitFor();assert.equal(await frame.locator('.sy-dogam-entry').count(),27);const filters=frame.locator('[data-sy-dogam-filter]');assert.ok(await filters.count()>1);await filters.nth(1).click();assert.ok(await frame.locator('.sy-dogam-entry:visible').count()<27);}
   for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),title);}
   await page.getByRole('button',{name:'입력으로 돌아가기'}).click();
  }
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(ledger?.orders?.length||0,0);assert.equal(ledger?.loggedIn||false,false);
  console.log('PASS private Sukuyo: known/unknown guest, original four tools and 27-entry filter, 360/390/430px, no purchase');
 }finally{await page.close();}
}
