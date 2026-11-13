import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readTossPublicSection} from '../../../worker/toss/public-section.js';
const origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4363';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
 const requests=[],unexpected=[];
 await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===origin)return route.continue();
   if(url.pathname!=='/api/toss/canonical/saju/section'){if(req.method()==='POST')unexpected.push(url.pathname);return route.abort();}
   const body=req.postDataJSON();
   assert.equal(body.featureKey,'rpt_secretHouseEntryCard');requests.push(body.house);
   const response=await readTossPublicSection(body,{});
   return route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
 });
 const p=await context.newPage();p.setDefaultTimeout(18000);
 await p.goto(origin);await p.locator('.world-entry-ggulggul').click();
 await p.getByRole('button',{name:/^사주 리포트/}).click();
 await p.getByLabel('풀이 선택').selectOption('rpt_secretHouseEntryCard');
 assert.equal(await p.getByLabel('태어난 날짜',{exact:true}).count(),0);
 await p.getByRole('button',{name:'선택한 풀이 보기'}).click();
 const f=p.frameLocator('iframe[title="시크릿 하우스 합숙"]');
 await f.getByRole('button',{name:/나의 운명 찾기/}).click();
 await f.locator('.stem-card').first().click();await f.locator('#stemConfBtn').click();
 assert.equal(await f.locator('.char-card').count(),5);
 await f.locator('.char-portrait img').first().evaluate(img=>img.decode());
 await f.getByRole('button',{name:/합숙 시작하기/}).click();
 await f.locator('#screen-scene.active').waitFor();
 for(let step=0;step<170;step++){
   if(await f.locator('#screen-final.active').count())break;
   const active=f.locator('#rxnOverlay.show button, #screen-scene.active #choices .choice-btn:not(:disabled), #screen-scene.active #sceneQ.typing');
   const focus=active.first();
   await focus.waitFor({state:'visible'});
   await focus.click();
   const final=f.locator('#screen-final .final-card');
   if(await final.count())break;
 }
 await f.locator('#screen-final.active .final-card').first().click();
 await f.locator('#revealBtn').click();
 await f.locator('#screen-result.active #resCard').waitFor();
 assert.ok((await f.locator('#resCard').innerText()).length>100);
 assert.ok(requests.length>5);assert.ok(requests.at(-1).finalCharId);
 assert.equal(requests.at(-1).history.length,requests.length-2);
 await f.getByRole('button',{name:/다시 도전/}).click();
 await f.getByRole('button',{name:/나의 운명 찾기/}).waitFor();
 assert.deepEqual(unexpected,[]);
 console.log('PASS 360px guest home → stem → five original portraits → choices, reactions and ending → restart.',requests.length,'canonical requests');
}finally{await browser.close();}
