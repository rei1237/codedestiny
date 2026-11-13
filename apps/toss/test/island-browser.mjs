import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {handleZiweiIslandRoutes} from '../../../worker/routes/ziwei-island.js';
import {readTossIsland} from '../../../worker/toss/island.js';

const origin=process.env.TOSS_PUBLIC_TEST_ORIGIN||'http://127.0.0.1:4363';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
 const payloads=[],unexpected=[],results=[];
 await ctx.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.origin===origin)return route.continue();
  if(u.pathname!=='/api/toss/canonical/ziwei-island/blueprint'){if(r.method()==='POST')unexpected.push(u.pathname);return route.abort();}
  const body=r.postData();payloads.push(JSON.parse(body));
  const options={method:'POST',body,headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com','Content-Type':'application/json'}};
  const response=await readTossIsland(JSON.parse(body),{},'test-client');
  const json=await response.json();assert.equal(response.status,200,JSON.stringify(json));
  const original=await handleZiweiIslandRoutes(new Request('https://localhost/api/ziwei-island/blueprint',options),{});
  assert.deepEqual(json,await original.json());results.push(json.blueprint);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(json)});
 });
 const p=await ctx.newPage();p.setDefaultTimeout(15000);
 async function open(){await p.goto(origin);await p.locator('.world-entry-ggulggul').click();
  await p.getByRole('button',{name:/자미두수 상세 풀이/}).click();
  await p.getByRole('button',{name:'운명의 섬 탐험하기'}).click();return p.frameLocator('iframe[title="운명의 섬"]');}
 let f=await open();
 await f.locator('#btnEnterNew').click();await f.locator('#fDate').fill('19911118');await f.locator('#fTimeUnknown').check();await f.locator('#birthForm button[type=submit]').click();
 await f.locator('#palaceDock button').first().waitFor();
 assert.equal(await f.locator('#palaceDock button').count(),12);
 for(const item of results[0].palaces){
  await f.locator('[data-destination="'+item.name+'"]').click();
  await f.locator('#sheetPalaceDesc.on').waitFor();assert.equal(await f.locator('.reading-lead').textContent(),results[0].reading.palaces[item.name].focus);
  const img=f.locator('.reading-host img');await img.evaluate(i=>i.decode());
  await f.locator('#sheetPalaceDesc button[data-close]').click();
 }
 assert.equal(await f.locator('#visitCount').innerText(),'12/12');
 await f.locator('#btnQuest').click();await f.locator('#questList .qbtn').first().click();
 await f.locator('#sheetQuest button[data-close]').click();
 await f.locator('#palaceDock button').first().click();await f.locator('#readingTiming').click();
 const year=results[0].timing.year+1;await f.locator('#timingYear').selectOption(String(year));
 await f.locator('#pdContent h3').filter({hasText:String(year)}).first().waitFor();assert.equal(results.at(-1).timing.year,year);
 await p.evaluate(()=>window.dispatchEvent(new Event('code-destiny:toss-back',{cancelable:true})));
 await f.locator('#sheetPalaceDesc.on').waitFor({state:'hidden'});
 const calls=payloads.length;f=await open();await f.locator('#gateCards button').first().click();await f.locator('#palaceDock button').first().waitFor();
 assert.equal(await f.locator('#visitCount').innerText(),'12/12');assert.equal(await f.locator('#questCnt').innerText(),'1/3');
 assert.equal(payloads.length,calls,'restores from original daily blueprint cache');assert.deepEqual(unexpected,[]);
 console.log('PASS 360px guest home, 12 original readings and portraits, next year, quest EXP and relaunch with unknown time. Toss HTTP == web response.');
}finally{await browser.close();}
