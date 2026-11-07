import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServiceFetch} from '../service/transport.mjs';
import serviceCompat,{screenDeckManifest,localBrandFonts,sampleIntroductionArt,responsiveIntroductionArt,isTea640Reference,isYeongnyangi640Reference} from '../service/vite-service.mjs';
import {readFile} from 'node:fs/promises';
import {geocodePlace} from '../../../worker/lib/geocode.js';

test('release fonts retain original families while resolving identical local bytes',async()=>{
 const plugin=localBrandFonts();
 const korean={prop:'src',value:'url("https://assets.code-destiny.com/fonts/serif-kr/d27595de3940.woff2")'};
 await plugin.Declaration(korean);assert.match(korean.value,/\/assets\/yeongnyangi\/fonts\/nanum-myeongjo/);
 const latin={prop:'src',value:'url("https://assets.code-destiny.com/fonts/serif-latin/09941fb1c169.woff2")'};
 await plugin.Declaration(latin);assert.equal(latin.value,'url("/fonts/serif-latin/09941fb1c169.woff2")');
 const bytes=await readFile(new URL('../public/fonts/serif-latin/09941fb1c169.woff2',import.meta.url));
 assert.ok(bytes.length>0);
});

test('release deck preserves the exact displayed artwork and does not include unused resolution variants',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../../../public/assets/yeongnyangi/tarot/v1/manifest.json',import.meta.url),'utf8'));
 const compact=screenDeckManifest(manifest);
 for(const [index,card] of compact.cards.entries()){
  assert.equal(card.files.std,manifest.cards[index].files.std);
  assert.equal(card.avifFiles.std,undefined);
  assert.equal(card.contentHash,manifest.cards[index].contentHash);
  assert.deepEqual(Object.keys(card.files),['std']);
 }
 assert.equal(compact.back.files.std,manifest.back.files.std);
 assert.equal(compact.back.avifFiles.std,undefined);
 for(const card of [...compact.cards,compact.back])assert.ok((await readFile(new URL('../../../public'+card.files.std,import.meta.url))).length>0);
 assert.ok(manifest.cards[0].files.hi,'the shared source manifest remains untouched');
});

test('only the known tea 640px dynamic path is narrowed',()=>{
 assert.equal(isTea640Reference('/images/service-introductions/tea-${mode}-640.webp'),true);
 assert.equal(isTea640Reference('/images/service-introductions/tea-${mode}-960.webp'),false);
 assert.equal(isTea640Reference('/images/service-introductions/tea-saju-640.webp'),false);
});

test('only the known Yeongnyangi 640px template is narrowed',()=>{
 assert.equal(isYeongnyangi640Reference('/images/service-introductions/yeongnyangi-${e.id.replaceAll(`_`,`-`)}-640.webp`'),true);
 assert.equal(isYeongnyangi640Reference('/images/service-introductions/yeongnyangi-${id}-960.webp`'),false);
 assert.equal(isYeongnyangi640Reference('/images/service-introductions/yeongnyangi-saju-640.webp`'),false);
});

test('Toss sample and Ziwei artwork projections preserve every original referenced record',async()=>{
 const registry=JSON.parse(await readFile(new URL('../../../lib/marketing/service-introduction-art.json',import.meta.url),'utf8'));
 const samples=JSON.parse(await readFile(new URL('../../../lib/marketing/result-samples.json',import.meta.url),'utf8'));
 const compact=sampleIntroductionArt(registry,samples),visuals=new Set(samples.map(sample=>sample.visual));
 for(const [id,art] of Object.entries(registry))if(id==='fortune-tea-house'||visuals.has(art.image))assert.deepEqual(compact[id],art);
 assert.ok(Object.keys(compact).length<Object.keys(registry).length);
 const plugin=serviceCompat(),id='./service-introduction-art.json';
 const sampleId=plugin.resolveId(id,'/repo/lib/marketing/render-result-samples.mjs');
 const ziweiId=plugin.resolveId('@/lib/marketing/service-introduction-art.json','/repo/app/ziwei-ai/ZiweiAiClient.tsx');
 const readModule=async name=>(await import('data:text/javascript;base64,'+Buffer.from(await plugin.load(name)).toString('base64'))).default;
 assert.deepEqual(await readModule(sampleId),compact);
 assert.deepEqual(await readModule(ziweiId),{'ziwei-ai':registry['ziwei-ai']});
 assert.equal(plugin.resolveId(id,'/repo/other-consumer.mjs'),undefined);
 const refs=responsiveIntroductionArt(registry,samples);
 for(const ref of refs)assert.ok((await readFile(new URL('../../../public'+ref,import.meta.url))).length>0,ref);
 assert.ok(refs.includes(registry['ziwei-ai'].cardImage.replace('-320','-480')));
 assert.ok(refs.includes(registry['fortune-tea-house'].image.replace('.webp','-480.webp')));
});

test('shared birthplace lookup preserves timezone and explicit fallback semantics without live calls',async()=>{
 assert.equal((await geocodePlace('')).status,400);
 const found=await geocodePlace('  서울   ',async url=>{assert.equal(new URL(url).searchParams.get('q'),'서울');return Response.json([{lat:'37.5665',lon:'126.978',display_name:'서울'}]);});
 assert.equal(found.data.timezone,'Asia/Seoul');assert.equal(found.data.fallback,false);
 assert.equal((await geocodePlace('없는 장소',async()=>Response.json([]))).data.fallback,true);
 assert.equal((await geocodePlace('없는 장소',async()=>{throw new Error('offline');})).data.fallback,true);
});

test('release transport preserves input, query, cancellation and never falls back to web APIs',async()=>{
 const calls=[],native=[];
 const controller=new AbortController();
 const fetch=createServiceFetch({origin:'https://miniapp.example',nativeFetch:async(...args)=>{native.push(args);return Response.json({});},send:async(path,request)=>{calls.push({path,method:request.method,body:await request.text(),signal:request.signal});return Response.json({fortune:{id:'saved'}});}});
 const response=await fetch(new Request('https://code-destiny.com/api/yeongnyangi/requests?lang=ko',{method:'POST',body:JSON.stringify({question:'내 질문',profileId:'owned',consultationAttemptId:'same-attempt'}),signal:controller.signal}));
 assert.equal((await response.json()).fortune.id,'saved');
 assert.equal(calls[0].path,'/canonical/yeongnyangi/requests?lang=ko');assert.equal(calls[0].method,'POST');assert.equal(JSON.parse(calls[0].body).question,'내 질문');
 controller.abort();assert.equal(calls[0].signal.aborted,true);
 await assert.rejects(()=>fetch('https://unapproved.example/api/payment'),/Unsupported/);assert.equal(native.length,0);
 const unavailable=createServiceFetch({origin:'https://miniapp.example',nativeFetch:()=>{throw new Error('must not fall back');},send:()=>{throw Object.assign(new Error(),{code:'TOSS_RELEASE_PENDING',status:503});}});
 assert.equal((await unavailable('/api/billing/charge',{method:'POST',body:'{}'})).status,503);
});

test('canonical catalog is fail-closed; profiles use owner-scoped immutable retries',async()=>{
 const saved=new Map(),writes=[];
 globalThis.__canonicalProfileStore={findOneAndUpdate(filter,update){writes.push({filter,update});const key=String(filter.userId)+':'+filter.profileId;if(!saved.has(key))saved.set(key,update.$setOnInsert);return {lean:async()=>saved.get(key)};},find(filter){return {sort:()=>({lean:async()=>[...saved.values()].filter(row=>row.userId===filter.userId)})};}};
 const compiled=await build({entryPoints:[fileURLToPath(new URL('../../../worker/toss/canonical-yeongnyangi.js',import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'no-db-or-llm',setup(build){
  build.onResolve({filter:/\/yeongnyangi\/service\.ts$/},()=>({path:'service',namespace:'isolate'}));
  build.onResolve({filter:/\/lib\/models\.js$/},()=>({path:'models',namespace:'isolate'}));
  build.onResolve({filter:/\/routes\/profile\.js$/},()=>({path:'profile',namespace:'isolate'}));
  build.onLoad({filter:/.*/,namespace:'isolate'},({path})=>({contents:path==='service'?'export const prepareFortune=()=>{throw Error("No provider allowed")}; export const presentFortune=x=>x; export const drawTarotSpread=prepareFortune;':path==='models'?'export const ProfileCard=globalThis.__canonicalProfileStore;':'export const normalizeIncomingProfile=x=>x; export const validateRequiredBirth=x=>({ok:!!x?.birth,birth:x?.birth}); export const toClientProfile=x=>x;'}));
 }}]});
 try{
  const canonicalModule=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  assert.ok(canonicalModule.canonicalProducts().every(row=>!row.available));
  const product=canonicalModule.canonicalProducts().find(row=>row.id==='saju_mackerel');
  const approved=[{productId:product.id,sku:'test-only-sku',approved:true,approvedPriceKRW:product.priceKRW,priceEvidence:'injected-test',serviceId:'yeongnyangi'}];
  assert.equal(canonicalModule.canonicalProducts(approved).filter(row=>row.available).length,1);
  assert.equal(canonicalModule.canonicalProducts([{...approved[0],approvedPriceKRW:product.priceKRW+1}]).filter(row=>row.available).length,0);
  assert.throws(()=>canonicalModule.canonicalSale(product.id,[]),/TOSS_PRODUCT_NOT_APPROVED/);
  const profile={profileId:'same-id',name:'first',birth:{year:1990}};
  await canonicalModule.canonicalProfiles({ownerId:'owner-a'},{profile,userId:'owner-b'});
  await canonicalModule.canonicalProfiles({ownerId:'owner-a'},{profile:{...profile,name:'overwrite'}});
  await canonicalModule.canonicalProfiles({ownerId:'owner-b'},{profile:{...profile,name:'second'}});
  assert.equal((await canonicalModule.canonicalProfiles({ownerId:'owner-a'})).profiles[0].name,'first');
  assert.equal((await canonicalModule.canonicalProfiles({ownerId:'owner-b'})).profiles[0].name,'second');
  assert.ok(writes.every(row=>row.filter.userId&&row.update.$set===undefined));
  const row={_id:'01900000-1111-7111-8111-000000000042',requestId:'a'.repeat(64),productId:product.id,approvedPriceKRW:product.priceKRW,serviceId:'yeongnyangi',status:'GRANTED',grantedAt:new Date().toISOString()};
  const original={...product,name:'구매 당시 상품명',priceKRW:1234};
  let reads=0;
  const page=await canonicalModule.canonicalLibraryPage([row],async id=>{reads++;assert.equal(id,row.requestId);return {_id:id,paymentClaimOrderId:row._id,accessMethod:'TOSS_IAP',amountKRW:row.approvedPriceKRW,productId:product.id,state:'COMPLETED',chapters:[{}],snapshot:{product:original,locale:'en',manifest:[{}]}};},async()=>{});
  assert.equal(reads,1);assert.deepEqual(page.fortunes[0].product,original);assert.equal(page.fortunes[0].locale,'en');assert.equal(page.fortunes[0].canRetry,false);
  const refunded=await canonicalModule.canonicalLibraryPage([{...row,status:'REFUNDED'}],async()=>({productId:product.id,state:'COMPLETED',snapshot:{product:original}}));
  assert.deepEqual(refunded.fortunes,[]);
 }finally{delete globalThis.__canonicalProfileStore;}
});
