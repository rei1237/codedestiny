import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root=process.cwd(), dir=path.join(root,'.tmp/astro-basic-delivery-check');
await fs.mkdir(dir,{recursive:true});
const fixture=JSON.parse(await fs.readFile('__tests__/fixtures/astro-natal-charts.json','utf8')).b1;
const paid=require('../worker/lib/astro-natal-reading.cjs');
const model=paid.build(fixture.chart,{timeKnown:true,birth:fixture.birth,today:'2026-10-06'});
const html=paid.render(model)+paid.renderDeep(model);
const browser=await chromium.launch();
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
let mode=402;const calls=[],errors=[],warnings=[];
try {
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.startsWith('/api/')) {
   if(url.pathname==='/api/astro/basic-deep'){
    calls.push(route.request().postDataJSON());
    return route.fulfill({status:mode,contentType:'application/json',body:JSON.stringify(mode===200?{ok:true,unlocked:true,featureKey:'astro_basic_deep_pack',html}:{ok:false,featureKey:'astro_basic_deep_pack',coinPrice:30,amountKRW:3000})});
   }
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,authenticated:false,profiles:[],unlocked:false,data:[]})});
  }
  if(url.hostname!=='127.0.0.1')return route.abort();
  const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).slice(1);
  for(const candidate of [path.resolve(root,relative),path.resolve(root,'public',relative)]){
   if(!candidate.startsWith(root+path.sep))continue;
   try{return await route.fulfill({status:200,contentType:mime[path.extname(candidate)]||'application/octet-stream',body:await fs.readFile(candidate)});}catch{}
  }
  return route.fulfill({status:404,body:'Local fixture not found'});
 });
 await context.addInitScript(()=>{window.print=()=>parent.postMessage('mock-astro-print','*');window.focus=()=>{};window.addEventListener('message',e=>{if(e.data==='mock-astro-print')window.__astroPrintCalled=true;});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
 await page.goto('http://127.0.0.1:47831/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  await window.__cdEnsureDestinyProfileLoaded();
  const p={id:'mock-reader',name:'서연',gender:'F',birth:{year:1990,month:10,day:14,hour:14,minute:30,calType:'solar'},location:{lat:37.5665,lng:126.978,tzOffset:9,name:'서울'}};
  window.DestinyProfileManager.storage.save([p]);window.DestinyProfileManager.storage.setCurrent(p.id);
  await window.__cdEnsureBirthModalDepsLoaded();
  window.openAstroModal();
 });
 await page.locator('[data-astro-server-detail] button[data-unlock-key="astro_basic_deep_pack"]:visible').waitFor({timeout:45000});
 assert.equal(await page.locator('.as-authorized-detail').textContent(),'');
 assert.ok(await page.locator('[data-astro-public-summary]').count());
 assert.ok(await page.locator('#asChart svg').count());
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:900});
  await page.locator('[data-astro-server-detail]').scrollIntoViewIfNeeded();
  const box=await page.locator('[data-astro-server-detail]').evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth,buttons:[...e.querySelectorAll('button:not([hidden])')].map(b=>b.getBoundingClientRect().height)}));
  assert.ok(box.scroll<=box.client+1,JSON.stringify({width,box}));assert.ok(box.buttons.every(h=>h>=44));
  await page.screenshot({path:path.join(dir,`locked-${width}.png`)});
 }
 assert.equal(await page.locator('#astroModalOverlay').getAttribute('aria-hidden'),'false');
 mode=200;
 await page.getByRole('button',{name:'상세 해석 다시 보기',exact:true}).click();
 await page.locator('#asAuthorizedStory .as-cats').waitFor();
 assert.ok(await page.locator('.as-authorized-detail #asDeep').count());
 await page.setViewportSize({width:390,height:844});await page.locator('.as-authorized-detail').scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(dir,'purchased-390.png')});
 await page.evaluate(()=>window.__cdLazyActionLoaders.shareAstroKakao());
 const shares=await page.evaluate(async()=>{
  let data;window.shareWithReward=fn=>fn();navigator.share=async d=>{data=d;};window.shareAstroKakao();return data;
 });
 assert.ok(shares?.text);assert.ok(!shares.text.includes('삶의 여섯 갈래'));
 await page.getByRole('button',{name:'PDF 저장하기',exact:true}).click();
 await page.waitForFunction(()=>window.__astroPrintCalled===true);
 assert.ok((await page.locator('iframe.as-detail-print-frame').getAttribute('srcdoc')).includes('삶의 여섯 갈래'));
 mode=503;await page.getByRole('button',{name:'PDF 저장하기',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-astro-server-detail] [role="status"]').textContent.includes('불러오지'));
 assert.equal(await page.locator('iframe.as-detail-print-frame').count(),0);
 assert.equal(await page.locator('.as-authorized-detail').textContent(),'');
 // Throw from the old renderer to exercise the real fallback, not a replacement test renderer.
 await page.evaluate(()=>{window.renderAstroInsightLegacyNeon=()=>{throw new Error('mock fallback');};window.renderAstroInsight();});
 await page.waitForFunction(()=>document.querySelector('[data-astro-server-detail] [role="status"]').textContent.includes('불러오지'));
 assert.equal(await page.locator('.as-authorized-detail').textContent(),'');assert.ok(await page.locator('[data-astro-public-summary]').count());
 const result={calls:calls.length,errors,warnings:warnings.filter(s=>/astro/i.test(s)),widths:[360,390,430,1280],checks:['free chart','locked detail','purchased detail','free-only share','successful PDF print invocation','failed PDF recheck','legacy renderer failure fallback']};
 await fs.writeFile(path.join(dir,'browser-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
