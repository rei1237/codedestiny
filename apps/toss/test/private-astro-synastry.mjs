import assert from 'node:assert/strict';
import example from '../private-simulation/astro-synastry-example.json' with {type:'json'};
export async function verifyPrivateSynastry(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(25000);
 try{
  const open=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('서양 점성술');await page.locator('.directory-list button').filter({hasText:'서양 점성술'}).first().click();};
  for(const [label,key] of [['두 사람의 궁합','compat-astro-direct-synastry'],['유명인과 궁합','compat-astro-synastry']]){
   await open();await page.getByRole('button',{name:label,exact:true}).click();await page.getByRole('button',{name:'모의 예시 입력하기'}).click();
   if(key==='compat-astro-synastry'){await page.getByLabel('이름 검색').fill(example.celeb.name);await page.getByRole('button',{name:example.celeb.name,exact:true}).click();}
   await page.getByRole('button',{name:'별자리 궁합 펼치기'}).click();const body=page.frameLocator('iframe[title="서양 점성술 시너스트리"]').locator('main');await body.locator(':scope > *').first().waitFor();
   assert.equal(await body.innerHTML(),await page.evaluate(html=>{const node=document.createElement('main');node.innerHTML=html;return node.innerHTML;},example.results[key].html));for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await body.evaluate(el=>el.ownerDocument.documentElement.scrollWidth<=el.ownerDocument.defaultView.innerWidth+1));}
   await page.getByRole('button',{name:'출생정보 다시 보기'}).click();await page.getByRole('button',{name:'별자리 궁합 펼치기'}).click();await body.locator(':scope > *').first().waitFor();
  }
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}'));assert.equal(saved.orders?.length||0,0);assert.equal(saved.loggedIn||false,false);
  console.log('PASS private guest synastry two original modes, catalogue, 3 widths, no login or purchase');
 }finally{await page.close();}
}
