import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const origin='http://127.0.0.1:4194';
const out='build-cache/yehwa-next';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:401,contentType:'application/json',body:'{"ok":false,"authenticated":false}'});
   return route.continue();
  });
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.locator('[data-yh-mounted]').waitFor();
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.yh-art img').evaluate(image=>image.decode());
  await page.screenshot({path:`${out}/home-${width}.png`});
  await page.locator('[data-yh-concern=work]').click();
  assert.equal(await page.locator('[data-yh-concern=work]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-yh-start]').click();
  await page.locator('[data-yh-next]').click();
  assert.equal(await page.locator('.yh-portrait img').evaluate(image=>image.getBoundingClientRect().width/image.parentElement.getBoundingClientRect().width),4);
  assert.ok(await page.locator('[data-yh-guide]').evaluate(guide=>{
    const cookie=document.querySelector('[aria-labelledby="analytics-consent-title"]');
    return !cookie || guide.getBoundingClientRect().bottom<=cookie.getBoundingClientRect().top;
  }),'cookie panel does not cover tutorial controls');
  await page.screenshot({path:`${out}/tutorial-${width}.png`});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-yh-guide]').isVisible(),false);
  const essential=page.getByRole('button',{name:'필수만 사용',exact:true});
  if(await essential.isVisible())await essential.click();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${out}/home-clear-${width}.png`});
  await page.goto(origin+'/yeongnyangi/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'영냥이 이용 안내 열기',exact:true}).click();
  await page.locator('dialog[open] img[src*="hero-480.webp"]').evaluate(image=>image.decode());
  await page.screenshot({path:`${out}/cat-guide-${width}.png`});
  await page.getByRole('button',{name:'첫 이용 안내 닫기',exact:true}).click();
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Next home: 390/1440px, hydration, concern selection, tutorial, no page errors — PASS');
} finally {await browser.close();}
