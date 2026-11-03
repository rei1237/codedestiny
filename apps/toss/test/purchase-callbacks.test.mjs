import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const Module=createRequire(import.meta.url)('node:module');
const sdk=`const create=options=>{const s=globalThis.__purchaseCallbacks;s.options=options;return ()=>{s.cleaned++}};create.isSupported=()=>true; export const IAP={createOneTimePurchaseOrder:create};export const Environment={environment:'sandbox'};export const TossAuth={},Storage={},Share={};`;
const bundle=await build({entryPoints:[path.join(root,'apps/toss/src/platform.ts')],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'mock-sdk',setup(b){
 b.onResolve({filter:/^@apps-in-toss\/web-framework$/},()=>({path:'sdk',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:sdk,loader:'js'}));
 b.onLoad({filter:/[\\/]release\.ts$/},()=>({contents:'export const SERVICE_AVAILABLE=true;',loader:'ts'}));
}}]});
const loaded=new Module(path.join(root,'toss-purchase-callback-test.cjs'));
loaded._compile(bundle.outputFiles[0].text,loaded.id);
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
