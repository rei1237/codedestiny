import '../../../scripts/lib/mock-network-guard.cjs';
import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const Module=createRequire(import.meta.url)('node:module');
const sdk=`const create=options=>{const s=globalThis.__purchaseCallbacks;if(s.throwOnCreate)throw Error('SDK unavailable');s.options=options;return ()=>{s.cleaned++}};create.isSupported=()=>true;const pending=async()=>({orders:[]});pending.isSupported=()=>true;const complete=async()=>true;complete.isSupported=()=>true;export const IAP={createOneTimePurchaseOrder:create,getPendingOrders:pending,completeProductGrant:complete};export const Environment={environment:'sandbox'};export const TossAuth={login:async()=>({authorizationCode:'mock'})},Storage={setItem:async()=>{}},Share={};`;
const bundle=await build({entryPoints:[path.join(root,'apps/toss/src/platform.ts')],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'mock-sdk',setup(b){
 b.onResolve({filter:/^@apps-in-toss\/web-framework$/},()=>({path:'sdk',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:sdk,loader:'js'}));
 b.onLoad({filter:/[\\/]release\.ts$/},()=>({contents:'export const SERVICE_AVAILABLE=true;',loader:'ts'}));
}}]});
let loaded;
beforeEach(async()=>{
 loaded=new Module(path.join(root,'toss-purchase-callback-test.cjs'));
 loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({token:'fixture-token'});try{await loaded.exports.login();}finally{globalThis.fetch=previous;}
 await loaded.exports.restorePurchases();
});
const product={sku:'test-only'};

for(const kind of ['consultation','tarot'])test(`${kind} grant failure is reported once despite later SDK events`,async()=>{
 const state=globalThis.__purchaseCallbacks={cleaned:0};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>{throw new Error('offline grant failure');};
 const errors=[];let completed=0;
 try{
  if(kind==='tarot')loaded.exports.purchaseTarotLibrary(product,{},()=>completed++,error=>errors.push(error));
  else loaded.exports.purchase(product,'request',()=>completed++,error=>errors.push(error));
  assert.equal(await state.options.options.processProductGrant({orderId:'order'}),false);
  state.options.onEvent({});state.options.onError(new Error('late SDK error'));
  assert.equal(errors.length,1);assert.equal(errors[0].message,'offline grant failure');
  assert.equal(completed,0);assert.equal(state.cleaned,1);
 }finally{globalThis.fetch=originalFetch;delete globalThis.__purchaseCallbacks;}
});

test('media resumes if the SDK cannot open the purchase sheet',()=>{
 globalThis.__purchaseCallbacks={cleaned:0,throwOnCreate:true};
 const originalDocument=globalThis.document;
 const media={paused:false,isConnected:true,plays:0,pause(){this.paused=true;},play(){this.plays++;this.paused=false;return Promise.resolve();}};
 globalThis.document={visibilityState:'visible',querySelectorAll:()=>[media]};
 try{assert.throws(()=>loaded.exports.purchase(product,'request',()=>{},()=>{}),/SDK unavailable/);assert.equal(media.plays,1);}
 finally{globalThis.document=originalDocument;delete globalThis.__purchaseCallbacks;}
});

test('media resumes after a durable grant and is not restarted twice',async()=>{
 const state=globalThis.__purchaseCallbacks={cleaned:0};
 const originalDocument=globalThis.document,originalFetch=globalThis.fetch;
 const media={paused:false,isConnected:true,plays:0,pause(){this.paused=true;},play(){this.plays++;this.paused=false;return Promise.resolve();}};
 globalThis.document={visibilityState:'visible',querySelectorAll:()=>[media]};
 globalThis.fetch=async()=>Response.json({orderId:'order',requestId:'request',entitlement:'granted',durable:true});
 try{
  let done=0;loaded.exports.purchase(product,'request',()=>done++,()=>assert.fail('unexpected error'));
  assert.equal(await state.options.options.processProductGrant({orderId:'order'}),true);
  state.options.onEvent({});state.options.onEvent({});assert.equal(done,1);assert.equal(media.plays,1);
 }finally{globalThis.document=originalDocument;globalThis.fetch=originalFetch;delete globalThis.__purchaseCallbacks;}
});

test('media waits for the app to become visible before resuming',()=>{
 const state=globalThis.__purchaseCallbacks={cleaned:0},originalDocument=globalThis.document;
 const media={paused:false,isConnected:true,plays:0,pause(){this.paused=true;},play(){this.plays++;this.paused=false;return Promise.resolve();}};
 let listener;
 const document={visibilityState:'visible',querySelectorAll:()=>[media],addEventListener:(_event,fn)=>{listener=fn;},removeEventListener:()=>{listener=null;}};
 globalThis.document=document;
 try{
  loaded.exports.purchase(product,'request',()=>{},()=>{});document.visibilityState='hidden';state.options.onError(new Error('cancelled'));
  assert.equal(media.plays,0);assert.equal(typeof listener,'function');
  document.visibilityState='visible';listener();assert.equal(media.plays,1);assert.equal(listener,null);
 }finally{globalThis.document=originalDocument;delete globalThis.__purchaseCallbacks;}
});

for(const kind of ['consultation','tarot'])test(`${kind} pauses playing media until the payment flow ends`,()=>{
 const state=globalThis.__purchaseCallbacks={cleaned:0};
 const originalDocument=globalThis.document;
 const media=(paused)=>({paused,isConnected:true,pauses:0,plays:0,pause(){this.pauses++;this.paused=true;},play(){this.plays++;this.paused=false;return Promise.resolve();}});
 const playing=media(false),alreadyPaused=media(true);
 globalThis.document={visibilityState:'visible',querySelectorAll:()=>[playing,alreadyPaused]};
 try{
  const errors=[];
  if(kind==='tarot')loaded.exports.purchaseTarotLibrary(product,{},()=>assert.fail('unexpected success'),error=>errors.push(error));
  else loaded.exports.purchase(product,'request',()=>assert.fail('unexpected success'),error=>errors.push(error));
  assert.equal(playing.pauses,1);assert.equal(playing.plays,0);assert.equal(alreadyPaused.pauses,0);
  state.options.onError(new Error('cancelled'));state.options.onError(new Error('duplicate'));
  assert.equal(playing.plays,1);assert.equal(alreadyPaused.plays,0);assert.equal(errors.length,1);
 }finally{globalThis.document=originalDocument;delete globalThis.__purchaseCallbacks;}
});
