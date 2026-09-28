import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3146';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const built=await build({stdin:{contents:"export {productOffers} from './app/yeongnyangi/_lib/product-offers'; export {productCuriosity} from './app/yeongnyangi/_lib/product-curiosity';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const {productOffers,productCuriosity}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const out='build-cache/product-curiosity';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const width of [390,360,430,1280]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await context.addInitScript(()=>{window.__productEvents=[];window.cdTrack=(name,params)=>window.__productEvents.push({name,params});});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/');
  const card=page.locator('[data-product-domain="saju"]');await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${out}/cards-${width}.png`});
  await card.click();
  const dialog=page.getByRole('dialog');await dialog.waitFor({state:'visible'});
  assert.equal(await dialog.locator('ol li').count(),productOffers.saju[0].chapters.length);
  await page.screenshot({path:`${out}/saju-${width}.png`});
  await dialog.getByRole('button',{name:/참치/}).click();
  assert.equal(await dialog.locator('ol li').count(),productOffers.saju[3].chapters.length);
  assert.match(await dialog.getByRole('link',{name:'이 구성으로 상담 준비하기 →'}).getAttribute('href'),/fish=tuna/);
  await dialog.locator('summary').click();assert.ok(await dialog.getByText(/가상의 편집 예시/).isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await dialog.getByRole('button',{name:'닫기',exact:true}).click();
  assert.equal(await card.evaluate(el=>el===document.activeElement),true);
  const events=await page.evaluate(()=>window.__productEvents);
  assert.ok(events.some(e=>e.name==='product_card_impression'));
  assert.ok(events.some(e=>e.name==='product_card_click'));
  assert.ok(events.some(e=>e.name==='product_detail_view'));
  assert.ok(events.every(e=>Object.keys(e.params).every(k=>['service','domain','item_id','content_id','locale','surface'].includes(k))));
  if(width===390){
   for(const [domain,copy] of Object.entries(productCuriosity)){
    await page.goto(`${base}/yeongnyangi/readings/${domain}/`);
    await page.getByRole('heading',{name:copy.question,exact:true}).waitFor();
    assert.ok((await page.locator('meta[property="og:title"]').getAttribute('content')).includes(copy.question));
    assert.ok((await page.locator('meta[property="og:url"]').getAttribute('content')).endsWith(`/readings/${domain}/`));
    assert.equal(await page.locator('ol li').count(),productOffers[domain][0].chapters.length);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${out}/${domain}-guide-390.png`,fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);results.push({width,pass:true});await context.close();
 }
 await writeFile(`${out}/verification.json`,JSON.stringify({results,realPgCalls:0,realLlmCalls:0,scope:'local mock UI; not production delivery proof'},null,2));
 console.log('PASS: pilot then six product guides, 4 widths, tier/manifest/CTA parity, example disclosure, focus restore, impression/click/detail events, public OG, no horizontal overflow; external requests blocked.');
}finally{await browser.close();}
