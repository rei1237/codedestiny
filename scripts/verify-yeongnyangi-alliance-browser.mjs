import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3139';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const compiled=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog'; export {paymentAllianceCopy} from './app/checkout/payment-alliance-copy'; export {getCheckoutCopy} from './app/checkout/checkout-copy';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const {products,paymentAllianceCopy,getCheckoutCopy}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const product=products.find(item=>item.id==='saju_mackerel');
const directory='build-cache/yeongnyangi-alliance';await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true}),report=[];
try{
 for(const [width,locale] of [[360,'ko'],[390,'ko'],[430,'ko'],[1280,'ko'],[360,'de'],[360,'hi']]){
  const fixture=await fixtures(browser,base,product,width);
  const {page,context,state,row}=fixture;
  try{
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.goto(base+'/checkout/?featureKey='+product.cdFeatureKey+'&requestId='+row.id+'&lang='+locale);
   const button=page.getByRole('button',{name:getCheckoutCopy(locale).payAction('')});await button.waitFor();
   await page.getByRole('heading',{name:paymentAllianceCopy(locale).title}).waitFor();
   await page.getByText(paymentAllianceCopy(locale).moonstones('500'),{exact:true}).waitFor();
   await page.getByText(paymentAllianceCopy(locale).moonstoneValue(5),{exact:true}).waitFor();
   const artwork=page.locator('img[src$="/payment-alliance/yeoni-alliance-v1.webp"]');
   await artwork.evaluate(image=>image.decode());assert.equal(await artwork.evaluate(image=>image.naturalWidth),1200);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'checkout must not overflow');
   assert.ok((await button.boundingBox()).height>=44,'payment action remains touch-sized');
   await page.screenshot({path:directory+'/checkout-'+locale+'-'+width+'.png',fullPage:true});
   await button.click();
   await page.locator('[data-mode="monthly"]').waitFor();
   for(const mode of ['pass-store','direct','monthly'])assert.equal(await page.locator('[data-mode="'+mode+'"]').count(),1,'one shared payment choice for '+mode);
   assert.equal(await page.getByText('yeongnyangi-checkout',{exact:true}).count(),0,'internal resume identifiers are not product labels');
   const stones=page.locator('[data-mode="monthly"]');assert.match(await stones.innerText(),/500/,'shared modal uses the same 500-stone price');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'shared payment modal must not overflow');
   await page.screenshot({path:directory+'/choices-'+locale+'-'+width+'.png',fullPage:true});
   assert.equal(state.orders.size,0,'opening choices does not create a payment order');assert.equal(state.sdk.length,0,'opening choices does not invoke PG');
   assert.deepEqual(state.errors,[]);assert.deepEqual(state.unknown,[]);
   report.push({width,locale,status:'PASS',paymentChoices:3,moonstones:500});
  }finally{await context.close();}
 }
 // One actual UI purchase path: the fixed request is funded once, then resumed and reread.
 const paidFixture=await fixtures(browser,base,product,360,{monthlyBalance:500});
 const {page,context,state,row}=paidFixture;
 const originalRequestId=row.id;
 const checkout=base+'/checkout/?featureKey='+product.cdFeatureKey+'&requestId='+row.id+'&lang=ko';
 try{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(checkout);
  await page.getByRole('button',{name:getCheckoutCopy('ko').payAction('')}).click();
  const monthly=page.locator('[data-mode="monthly"]');
  await monthly.waitFor();assert.equal(await monthly.isEnabled(),true,'500 stones can pay the canonical 500-stone price');
  assert.match(await monthly.innerText(),/500/);
  await page.screenshot({path:directory+'/monthly-funded-360.png',fullPage:true});
  await monthly.click();
  await page.waitForURL(url=>url.pathname==='/yeongnyangi/result/'&&url.searchParams.get('id')===originalRequestId);
  await page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
  assert.equal(row.paid,true);assert.equal(row.state,'COMPLETED');
  assert.equal(state.monthlyBalance,0);assert.equal(state.monthlyDeductions,1);assert.equal(state.monthlyRequests.length,1);
  assert.equal(state.monthlySpends.size,1);assert.equal(state.monthlyRequests[0].requestId,`yn-${originalRequestId}`);
  assert.equal(state.sdk.length,0);assert.equal(state.orders.size,0);assert.equal(state.confirm,0);
  assert.equal(state.creates,0,'monthly payment must use the prepared consultation');
  const completedChapters=state.generates;
  await page.reload();
  await page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
  await page.goto(checkout);
  await page.waitForURL(url=>url.pathname==='/yeongnyangi/result/'&&url.searchParams.get('id')===originalRequestId);
  await page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
  assert.equal(row.id,originalRequestId);assert.equal(state.creates,0);
  assert.equal(state.monthlyRequests.length,1,'result reload and checkout reentry never resubmit the spend');
  assert.equal(state.monthlyDeductions,1);assert.equal(state.generates,completedChapters,'reread reuses stored chapters');
  assert.equal(state.sdk.length,0);assert.equal(state.orders.size,0);
  assert.deepEqual(state.unknown,[]);assert.deepEqual(state.errors,[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:directory+'/monthly-reread-360.png',fullPage:true});
  report.push({scenario:'monthly-consume-resume-reread',width:360,locale:'ko',status:'PASS',requestId:originalRequestId,spent:500,remaining:state.monthlyBalance,spendRequests:state.monthlyRequests.length,deductions:state.monthlyDeductions,createdConsultations:state.creates,pgCalls:state.sdk.length,storedChapters:completedChapters});
 }catch(error){
  report.push({scenario:'monthly-consume-resume-reread',status:'FAIL',error:error.message,requests:state.http,unknown:state.unknown,errors:state.errors});
  await page.screenshot({path:directory+'/monthly-failure-360.png',fullPage:true});
  throw error;
 }finally{await context.close();}
}finally{await browser.close();await writeFile(directory+'/verification.json',JSON.stringify({cases:report,realPayments:0,realLlmCalls:0,productionWrites:0},null,2));}
console.log(JSON.stringify({status:'PASS',cases:report}));
