import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';
import {createRequire} from 'node:module';
import serviceCompat from '../service/vite-service.mjs';
const require=createRequire(import.meta.url),Module=require('node:module'),root=path.resolve(import.meta.dirname,'../../..');
const state={calls:[],paid:true,unavailable:false};globalThis.__fusionBilling=state;
const bundle=await build({entryPoints:[path.join(root,'apps/toss/service/billing.jsx')],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{name:'offline',setup(b){
 b.onResolve({filter:/^@\/app\/hooks\/usePaidResume$/},()=>({path:'resume',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const unpackPaidResumeArg=JSON.parse;',loader:'js'}));
 b.onLoad({filter:/app[\\/]_lib[\\/]billing-client\.ts$/},()=>({contents:'export const runPaidAccessGate=()=>{throw Error("WEB_GATE_FORBIDDEN")};',loader:'js'}));
 b.onLoad({filter:/apps[\\/]toss[\\/]src[\\/]platform\.ts$/},()=>({contents:`const s=globalThis.__fusionBilling;export const api=async(path,body)=>{s.calls.push({path,body});if(s.unavailable)throw Object.assign(Error('unavailable'),{code:'TOSS_RELEASE_PENDING',status:503});return {id:'intent',paid:s.paid,amountKRW:50000,orderId:'original-order'};};export const nativeSaleProducts=async()=>[];export const purchase=()=>{throw Error('LIVE_PURCHASE_FORBIDDEN')};`,loader:'js'}));
}}]});
const loaded=new Module(path.join(root,'fusion-billing-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);

test('original useCoinGate imports resolve to Toss progress and paid-access adapters',()=>{
 const plugin=serviceCompat(),importer=path.join(root,'app/hooks/useCoinGate.ts');
 assert.match(plugin.resolveId('./usePayment',importer),/payment-state.jsx$/);
 assert.match(plugin.resolveId('../_lib/billing-client',importer),/service[\\/]billing.jsx$/);
 assert.equal(plugin.resolveId('../../../app/_lib/billing-client.ts',path.join(root,'apps/toss/service/billing.jsx')),undefined);
});

test('Fusion paid-access alias carries original body and request ID, and returns usable failure metadata',async()=>{
 globalThis.location={search:''};
 const input={birthDate:'1990-01-01',birthTime:'08:00',concern:'원본 질문'},options={featureKey:'fusion-fortune-consultation',requestId:'same-request',resume:{args:{body:JSON.stringify(input)}}};
 const result=await loaded.exports.runPaidAccessGate(options);assert.equal(result.ok,true);
 assert.deepEqual(state.calls[0],{path:'/native/fusion/prepare',body:{input:{...input,requestId:'same-request'}}});
 assert.equal(state.calls[1].path,'/native/fusion/intents/intent');assert.equal(result.data.consume.transactionId,'original-order');assert.equal(result.data.consume.chargedCoins,0);
 state.unavailable=true;const failed=await loaded.exports.runPaidAccessGate(options);assert.equal(failed.status,503);assert.deepEqual(failed.raw,{});assert.equal(failed.error.code,'TOSS_RELEASE_PENDING');
 delete globalThis.location;
});

for(const featureKey of ['life-book-ai-consultation','life-fortune-ai-consultation'])test(featureKey+' retains payload and request ID',async()=>{
 globalThis.location={search:''};state.unavailable=false;state.calls=[];
 const input={birthDate:'1990-01-01',focusArea:'overall'};
 const result=await loaded.exports.runBillingCoinGate({featureKey,requestId:'original-life-request',resume:{args:{payload:JSON.stringify(input)}}});
 assert.equal(result.ok,true);
 assert.deepEqual(state.calls[0],{path:'/native/life-book/prepare',body:{input:{...input,requestId:'original-life-request'}}});
 delete globalThis.location;
});
