import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.MOON_BASE || 'http://127.0.0.1:15734';
const browser=await chromium.launch({headless:true});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(page.url()+" "+e.stack));
 await page.goto(base+'/insights/famous-saju/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.locator('.moon-person').first().waitFor();
 for(const width of [320,360,390,430,768,1440]){
  await page.setViewportSize({width,height:900});
  await page.screenshot({path:`docs/design/moon-library/famous-${width}.png`});
  const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,firstCard:document.querySelector('.moon-person').getBoundingClientRect().top,images:[...document.querySelectorAll('.moon-library img')].filter(x=>x.complete && !x.naturalWidth).length}));
  assert.equal(metrics.overflow,false,`overflow ${width}`);assert.equal(metrics.images,0);results.push({width,...metrics});
 }
 await page.getByRole('searchbox').fill('아이유');assert.equal(await page.locator('.moon-person').count(),1);assert.match(page.url(),/q=/);
 await page.reload();await page.getByRole('searchbox').waitFor();await page.waitForFunction(()=>document.querySelector('input[type=search]').value==='아이유');assert.equal(await page.locator('.moon-person').count(),1);
 const detailResponse=page.waitForResponse(r=>r.url().includes('/famous-saju/iu/') && r.request().isNavigationRequest());await page.locator('.moon-person').click();assert.equal((await detailResponse).status(),200,'person detail HTTP status');await page.waitForURL(/\/iu\//);await page.setViewportSize({width:390,height:900});await page.screenshot({path:'docs/design/moon-library/person-390.png'});await page.goBack();await page.waitForFunction(()=>document.querySelector('input[type=search]')?.value==='아이유');
 await page.getByRole('button',{name:'초기화'}).click();await page.getByRole('button',{name:'60일주',exact:true}).click();await page.getByRole('button',{name:'병 일간',exact:true}).click();
 assert.equal(await page.locator('.moon-chips button').filter({hasText:/^병[자인진오신술] /}).count(),6);
 await page.getByRole('button',{name:/^병술 /}).click();await page.getByRole('link',{name:'병술일주 해설과 계산 후보 읽기'}).click();await page.locator('.moon-ilju-cover').waitFor();
 await page.setViewportSize({width:390,height:900});await page.screenshot({path:'docs/design/moon-library/ilju-390.png'});
 assert.ok(await page.locator('meta[name=robots]').getAttribute('content').then(x=>x.includes('noindex')));
 await page.goto(base+'/insights/',{waitUntil:'domcontentloaded',timeout:120000});await page.getByLabel('무엇이 궁금한가요?').waitFor();await page.screenshot({path:'docs/design/moon-library/insights-390.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 fs.writeFileSync('docs/design/moon-library/browser-results.json',JSON.stringify({results,errors,environment:'Chromium desktop emulation; mock dev APIs; not physical devices'},null,2));
 assert.deepEqual(errors,[]);console.log('PASS: six widths, search+URL+reload+back, exact six pillars, noindex, insight search');
}finally{await browser.close();}
