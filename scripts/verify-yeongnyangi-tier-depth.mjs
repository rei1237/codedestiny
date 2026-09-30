import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3139';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const bundle=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';export {readingDepthCopy,readingTierDepth} from './app/yeongnyangi/_lib/reading-depth-copy';export {consultationManifest,consultationKinds} from './worker/yeongnyangi/fortune/consultation-kinds';export {conciseReadingManifest} from './worker/yeongnyangi/fortune/concise-reading';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const directory='build-cache/yeongnyangi-tier-depth';await mkdir(directory,{recursive:true});const browser=await chromium.launch({headless:true}),report=[];
try{for(const [width,locale] of [[360,'ko'],[1280,'ko'],[360,'de'],[360,'hi']]){
 const product=m.products.find(p=>p.id==='saju_mackerel');const f=await fixtures(browser,base,product,width);const {row,page,state,context}=f;state.products=m.products;
 try{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base+'/yeongnyangi/fortune/?domain=saju&fish=mackerel&lang='+locale);
  await page.getByText(m.readingDepthCopy(locale).sharedTopics,{exact:true}).waitFor();
  for(const tier of ['mackerel','salmon','flounder','tuna'])assert.equal(await page.locator('[data-reading-tier-depth="'+tier+'"]').innerText(),m.readingTierDepth(tier,locale));
  await page.getByRole('button').filter({has:page.locator('[data-reading-tier-depth="tuna"]')}).click();
  assert.equal(await page.locator('button[aria-pressed="true"] [data-reading-tier-depth="tuna"]').count(),1);
  await page.locator('[data-reading-depth-note]').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:directory+'/selection-'+locale+'-'+width+'.png'});
  await page.goto(base+'/yeongnyangi/readings/saju/?lang='+locale);await page.getByText(m.readingDepthCopy(locale).sharedTopics,{exact:true}).waitFor();
  await page.locator('[data-reading-depth-note]').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:directory+'/guide-'+locale+'-'+width+'.png'});
  row.locale=locale;row.manifest=m.conciseReadingManifest(m.consultationManifest(product,m.consultationKinds.saju[0]));
  const checkout=base+'/checkout/?featureKey='+product.cdFeatureKey+'&requestId='+row.id+'&lang='+locale;
  await page.goto(checkout);await page.getByText(m.readingDepthCopy(locale).sharedTopics,{exact:true}).waitFor();
  assert.equal(await page.locator('[data-reading-tier-depth="mackerel"]').innerText(),m.readingTierDepth('mackerel',locale));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:directory+'/checkout-'+locale+'-'+width+'.png',fullPage:true});
  row.manifest=row.manifest.map(({outputBudgetVersion,...chapter})=>chapter);await page.reload();await page.locator('[data-reading-output-locale]').waitFor();
  assert.equal(await page.locator('[data-reading-depth-note]').count(),0,'historical purchase keeps its original writing contract');
  assert.equal(state.generates,0);assert.equal(state.orders.size,0);assert.equal(state.sdk.length,0);assert.deepEqual(state.errors,[]);assert.deepEqual(state.unknown,[]);
  report.push({width,locale,status:'PASS',surfaces:3,historicalContractPreserved:true});
 }finally{await context.close();}
}}finally{await browser.close();await writeFile(directory+'/verification.json',JSON.stringify({cases:report,realPayments:0,realLlmCalls:0,productionWrites:0},null,2));}
console.log(JSON.stringify({status:'PASS',cases:report}));
