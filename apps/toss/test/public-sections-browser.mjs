// Start the ordinary Toss home or serve an unpacked AIT on loopback.
// POSTs to the public endpoint run the real web calculation in this process.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readTossPublicSection} from '../../../worker/toss/public-section.js';
import {TOSS_PUBLIC_SECTIONS} from '../../../lib/fortune/toss-public-sections.mjs';

const origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4363';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 const calls=[],unexpected=[];
 await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===origin)return route.continue();
   if(url.pathname!=='/api/toss/canonical/saju/section'||req.method()!=='POST'){
     if(req.method()==='POST')unexpected.push(url.pathname);
     return route.abort();
   }
   const body=req.postDataJSON();calls.push(body);
   const result=await readTossPublicSection(body,{});
   return route.fulfill({status:result.status,contentType:'application/json',body:await result.text()});
 });
 const page=await context.newPage();
 page.setDefaultTimeout(30000);
 async function tap(control){
   await control.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   const box=await control.boundingBox();assert.ok(box&&box.width&&box.height);
   await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
 }
 for(const [prefix,title] of [['rpt_','사주 리포트'],['ziwei_','자미두수 상세 풀이']]){
   await page.goto(origin);
   await page.locator('.world-entry-ggulggul').click();
   await page.getByRole('button',{name:new RegExp(title)}).click();
   await page.getByLabel('태어난 날짜',{exact:true}).fill('1990-05-15');
   await page.getByLabel('태어난 시각',{exact:true}).fill('14:30');
   await page.getByLabel('계산에 사용하는 성별').selectOption('F');
   await page.getByLabel('출생 도시').selectOption('서울');
   for(const [key,label] of Object.entries(TOSS_PUBLIC_SECTIONS).filter(([k])=>k.startsWith(prefix))){
     await page.getByLabel('풀이 선택').selectOption(key);
     await page.getByRole('button',{name:'선택한 풀이 보기'}).click();
     const frame=page.frameLocator('iframe[title="'+label+'"]');
     await frame.locator('main > div > :first-child').first().waitFor({state:'attached'});
     assert.ok((await frame.locator('main').innerText()).length>150,key);
     const details=frame.locator('details').first();
     if(await details.count()){
       const open=await details.evaluate(el=>el.open);
       const summary=details.locator(':scope > summary');
       await summary.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
       await summary.focus();
       await summary.press('Enter');
       assert.equal(await details.evaluate(el=>el.open),!open);
     }
     if(key==='rpt_energyCoordCard'){
       for(const mode of ['domestic','global','monthly','mixed']){
         await tap(frame.locator('[data-energy-roulette-mode="'+mode+'"]'));
         const repeat=frame.locator('#energyRouletteResult [data-energy-roulette-reroll="'+mode+'"]');
         await repeat.waitFor();
         await tap(repeat);
         await page.waitForFunction(()=>!document.querySelector('iframe').contentDocument.querySelector('[data-energy-roulette-mode]').disabled);
       }
     }
     if(key==='rpt_villainCard'){
       const box=frame.locator('.villain-checklist-wrap').first();
       const ancestor=box.locator('xpath=ancestor::details[1]');
       if(await ancestor.count()&&!await ancestor.evaluate(el=>el.open))await ancestor.locator(':scope > summary').click();
       const checks=box.locator('input[type=checkbox]');
       for(let i=0;i<4;i++)await checks.nth(i).check();
       await box.locator('.villain-submit-btn').click();
       assert.match(await box.locator('.villain-feedback').innerText(),/4\/5/);
     }
     if(key==='ziwei_decade_luck'){
       await frame.getByText('대한 상세표',{exact:true}).click();
       assert.ok(await frame.getByText('대한 상세표',{exact:true}).evaluate(el=>el.parentElement.open));
     }
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     console.log('PASS',key);
     await page.getByRole('button',{name:'다른 풀이 보기'}).click();
     assert.equal(await page.getByLabel('태어난 날짜',{exact:true}).inputValue(),'1990-05-15');
   }
 }
 assert.equal(new Set(calls.map(c=>c.featureKey)).size,10);
 const spins=calls.filter(c=>c.energy?.roulette);
 assert.equal(spins.length,8);
 assert.deepEqual(spins.map(c=>c.energy.roulette.spin),[1,2,3,4,5,6,7,8]);
 assert.ok(spins.slice(1).every(c=>c.energy.roulette.recent.length>0));
 assert.deepEqual(unexpected,[]);
}finally{await browser.close();}
