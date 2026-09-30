import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export {products} from './worker/yeongnyangi/payments/catalog';export {consultationManifest,consultationKinds} from './worker/yeongnyangi/fortune/consultation-kinds';export {conciseReadingManifest} from './worker/yeongnyangi/fortune/concise-reading';export {conciseReadingPrompt} from './worker/yeongnyangi/fortune/concise-reading-prompt';export {productOffers} from './app/yeongnyangi/_lib/product-offers';export {readingDepthCopy,readingTierDepth} from './app/yeongnyangi/_lib/reading-depth-copy';export {readingLocales} from './worker/yeongnyangi/fortune/reading-locale';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('public product comparisons use the same default consultation chapters as preparation',()=>{
 for(const [domain,offers] of Object.entries(m.productOffers))for(const offer of offers){
  const product=m.products.find(p=>p.id===offer.id);
  assert.deepEqual(offer.chapters,m.consultationManifest(product,m.consultationKinds[domain][0]).map(ch=>ch.title),offer.id);
  assert.equal(offer.price,product.priceKRW);
 }
});
test('every described tier has a distinct writing contract without raising the shared chapter budget',()=>{
 const targets=[];const approaches=[];
 for(const tier of ['mackerel','salmon','flounder','tuna']){
  const p=m.products.find(p=>p.id==='saju_'+tier);
  const chapter=m.conciseReadingManifest(m.consultationManifest(p,m.consultationKinds.saju[0]))[0];
  const before=JSON.stringify(chapter);const contract=m.conciseReadingPrompt(chapter).conciseReading.tierDepth;
  assert.equal(contract.tier,tier);assert.ok(contract.approach);assert.ok(contract.boundary);assert.ok(m.readingTierDepth(tier));
  approaches.push(contract.approach);if(tier!=='mackerel')targets.push(chapter.targetChars);
  assert.equal(JSON.stringify(chapter),before,'describing depth must not mutate generation targets');
 }
 assert.equal(new Set(approaches).size,4);assert.deepEqual(targets[0],targets[1]);assert.deepEqual(targets[1],targets[2]);
});
test('all twelve locales explain shared topics and distinct tier depth without numeric promises',()=>{
 for(const locale of m.readingLocales){
  const copy=m.readingDepthCopy(locale);assert.ok(copy.sharedTopics.trim());
  const texts=['mackerel','salmon','flounder','tuna'].map(tier=>m.readingTierDepth(tier,locale));
  assert.equal(new Set(texts).size,4);for(const text of [copy.sharedTopics,...texts]){assert.ok(text.trim());assert.doesNotMatch(text,/[0-9]/);if(locale!=='ko')assert.doesNotMatch(text,/[가-힣]/);}
 }
 assert.equal(m.readingTierDepth('assorted'),undefined,'fusion retains its own contract');
});
