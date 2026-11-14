import assert from 'node:assert/strict';
import {TOSS_ASTRO_SECTIONS} from '../../../lib/fortune/toss-astro-sections.mjs';
export async function verifyPrivateAstro(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(20000);
 try{
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('서양 점성술');await page.locator('.directory-list button').filter({hasText:'서양 점성술'}).first().click();
  await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await page.getByLabel('태어난 날짜',{exact:true}).fill('1990-02-04');await page.getByRole('button',{name:'출생차트 펼치기'}).click();await page.getByRole('alert').filter({hasText:'지원하지 않아요'}).waitFor();
  await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await page.getByRole('button',{name:'출생차트 펼치기'}).click();await page.locator('.toss-astro-wheel svg').waitFor();
  for(const title of Object.values(TOSS_ASTRO_SECTIONS)){
   await page.getByRole('navigation',{name:'점성술 풀이 선택'}).getByRole('button',{name:title,exact:true}).click();await page.getByRole('heading',{name:title,exact:true}).first().waitFor();
   const body=page.frameLocator('iframe[title="'+title+'"]').locator('main');await body.locator(':scope > *').first().waitFor();assert.ok((await body.innerText()).length>100,title+' original body');
   for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),title);assert.ok(await body.evaluate(el=>el.ownerDocument.documentElement.scrollWidth<=el.ownerDocument.defaultView.innerWidth+1),title+' frame overflow');}
  }
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(ledger?.orders?.length||0,0);assert.equal(ledger?.loggedIn||false,false);
  console.log('PASS private astrology: guest home, example rejection, original wheel and ten sections, 360/390/430px, no purchase');
 }finally{await page.close();}
}
