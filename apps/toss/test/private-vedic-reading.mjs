import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
export async function verifyPrivateVedic(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(45000);await page.emulateMedia({reducedMotion:'reduce'});
 const capture=async name=>{for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' overflow');if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'vedic-'+name+'-'+width+'.png'),fullPage:true});}}};
 try{
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('베다점 출생차트');await page.locator('.directory-list button').filter({hasText:'베다점 출생차트'}).first().click();
  await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await page.getByLabel('태어난 날짜',{exact:true}).fill('1990-02-04');await page.getByRole('button',{name:'출생차트와 해석 펼치기'}).click();await page.getByRole('alert').filter({hasText:'지원하지 않아요'}).waitFor();
  await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await page.getByRole('button',{name:'출생차트와 해석 펼치기'}).click();await page.getByRole('heading',{name:'나의 베다 명반',exact:true}).waitFor();
  await capture('south');await page.getByRole('button',{name:'북인도 명반'}).click();await page.locator('.toss-vedic-reading svg').waitFor();await capture('north');
  const tabs=page.getByRole('navigation',{name:'베다 해석 주제'}).getByRole('button');assert.equal(await tabs.count(),7);
  for(let index=0;index<7;index++){await tabs.nth(index).click();assert.equal(await tabs.nth(index).getAttribute('aria-pressed'),'true');assert.ok((await page.locator('.toss-vedic-reading').innerText()).length>200);}
  let checkedTerm=false;
  for(const title of ['성향 심층','재물 상세','직업 상세','연애 상세','차크라 상세','요가 상세','처방 상세','빔쇼타리 다샤']){
   await page.getByRole('button',{name:title,exact:true}).click();await page.getByRole('heading',{name:title,exact:true}).waitFor();assert.ok((await page.locator('.toss-vedic-reading').innerText()).length>150);
   const accordion=page.locator('[data-vedic-action^="toggleAcc"]');if(await accordion.count()){await accordion.first().click();if(await accordion.first().getAttribute('aria-expanded')==='false')await accordion.first().click();assert.equal(await accordion.first().getAttribute('aria-expanded'),'true');}
   const term=page.locator('[data-vedic-action^="openBhavaMeaning"]');if(!checkedTerm&&await term.count()){for(let i=0;i<await accordion.count();i++){const header=accordion.nth(i);if(!await header.evaluate(el=>el.parentElement.querySelector('.acc-body')?.classList.contains('open')))await header.click();}await term.first().click();await page.locator('[data-vedic-action="closeBhavaMeaning()"]').waitFor();await page.evaluate(()=>window.dispatchEvent(new Event('code-destiny:toss-back',{cancelable:true})));await page.locator('[data-vedic-action="closeBhavaMeaning()"]').waitFor({state:'detached'});checkedTerm=true;}
   await capture(title);await page.evaluate(()=>window.dispatchEvent(new Event('code-destiny:toss-back',{cancelable:true})));await page.getByRole('heading',{name:'나의 베다 명반',exact:true}).waitFor();
  }
  assert.ok(checkedTerm,'original Bhava explanation can open and close with native back');
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(ledger?.orders?.length||0,0);assert.equal(ledger?.loggedIn||false,false);
  console.log('PASS private Vedic: non-example rejected, exact local Swiss example, south/north charts, 7 original topics, 8 original details, accordions/native back, 360/390/430px, no login/orders');
 }catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(-2200));throw error;}finally{await page.close();}
}
