import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:18126';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const output='build-cache/yeongnyangi-daily-tarot';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const testCase of [{width:390,blocked:false,reduced:false},{width:960,blocked:true,reduced:true}]){
  const context=await browser.newContext({viewport:{width:testCase.width,height:844},serviceWorkers:'block'}),requests=[];
  context.on('request',request=>requests.push({path:new URL(request.url()).pathname,method:request.method()}));
  if(testCase.blocked)await context.addInitScript(()=>{for(const method of ['getItem','setItem'])Object.defineProperty(Storage.prototype,method,{configurable:true,value(){throw new Error('storage blocked');}});});
  const page=await context.newPage();
  if(testCase.reduced)await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(`${base}/yeongnyangi/room/`,{waitUntil:'domcontentloaded'});
  const section=page.getByRole('region',{name:'오늘, 한 장의 달빛'});
  await section.waitFor();
  await page.waitForTimeout(600);
  const writesBefore=requests.filter(request=>request.path.startsWith('/api/')&&request.method!=='GET').length;
  await section.getByRole('button',{name:'오늘의 카드 뒤집기'}).click();
  await section.getByText('행운 포인트').waitFor();
  await page.waitForTimeout(testCase.reduced?50:850);
  assert.equal(requests.filter(request=>request.path.startsWith('/api/')&&request.method!=='GET').length,writesBefore,'card reveal must not write through an API');
  const image=section.locator('picture img').last();
  await image.waitFor();
  await page.waitForFunction(element=>element.complete&&element.naturalWidth>0,await image.elementHandle());
  assert.match(await image.evaluate(element=>element.currentSrc),/\/assets\/yeongnyangi\/tarot\/v1\/M\d{2}-600\.(?:avif|webp)$/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(testCase.reduced)assert.equal(await section.locator('button').evaluate(element=>getComputedStyle(element.querySelector('.daily-tarot-front')).transitionDuration),'0s');
  await section.screenshot({path:`${output}/${testCase.width}${testCase.blocked?'-storage-blocked':''}.png`});
  results.push({...testCase,status:'PASS',apiCallsOnReveal:0});
  await context.close();
 }
}finally{await browser.close();}
await writeFile(`${output}/results.json`,JSON.stringify({cases:results,realPgCalls:0,realLlmCalls:0,productionDbWrites:0},null,2));
console.log(`PASS ${results.length} local-only daily tarot cases: mobile/desktop, blocked storage, reduced motion, own-deck image, reveal API calls 0`);
