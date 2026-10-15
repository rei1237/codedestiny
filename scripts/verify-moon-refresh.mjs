import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.MOON_BASE || 'http://127.0.0.1:15734';
const dir='docs/design/moon-library-refresh';
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try {
 const page=await browser.newPage({reducedMotion:'reduce'});
 for(const [name,path] of [['famous','/insights/famous-saju/'],['insights','/insights/'],['home','/ggulggul/'],['article','/insights/rescene-members-saju-reading-guide/']]){
  const response=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:120000});
  assert.equal(response.status(),200,path);
  await page.locator(name==='home'?'#cdHomeFunnel':'h1').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);
  for(const width of [320,360,390,430,1280]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.screenshot({path:`${dir}/${name}-${width}.png`});
   const metric=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,nav:document.querySelector('.cd-mnav, #cdMobileBottomNav') && getComputedStyle(document.querySelector('.cd-mnav, #cdMobileBottomNav')).backgroundColor,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),firstCard:document.querySelector('.moon-person')?.getBoundingClientRect().top}));
   results.push({name,width,...metric});
   assert.equal(metric.overflow,false,`${name} ${width} overflow`);
  }
 }
 await page.goto(base+'/insights/famous-saju/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByRole('searchbox').fill('RESCENE');
 assert.equal(await page.locator('.moon-person').count(),5);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('input[type=search]')?.value==='RESCENE');
 assert.equal(await page.locator('.moon-person').count(),5);
 await page.locator('.moon-person').first().click();
 await page.waitForURL(/rescene-/);await page.locator('h1').waitFor();
 assert.ok((await page.locator('h1').innerText()).includes('리센느'));
 await page.goBack({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('input[type=search]')?.value==='RESCENE');
 fs.writeFileSync(`${dir}/browser-results.json`,JSON.stringify({environment:'Chromium desktop emulation, mock APIs; physical devices unverified',results,search:'RESCENE: five unique profiles; URL reload and back restored'},null,2));
 console.log('PASS: four routes, five widths, RESCENE search/reload/back, HTTP 200');
} finally {await browser.close();}


