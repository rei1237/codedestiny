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
 b.onLoad({filter:/apps[\\/]toss[\\/]src[\\/]platform\.ts$/},()=>({contents:`const s=globalThis.__fusionBilling;export const api=async(path,body)=>{s.calls.push({path,body});if(s.unavailable)throw Object.assign(Error('unavailable'),{code:'TOSS_RELEASE_PENDING',status:503});if(s.denied)throw Object.assign(Error('ORDER_OWNERSHIP_MISMATCH'),{code:'ORDER_OWNERSHIP_MISMATCH',status:403});return {id:'intent',sku:'mock-sku',paid:s.paid,amountKRW:50000,orderId:'original-order'};};export const nativeSaleProducts=async()=>(s.recoveryBusy||s.cancelled||s.paymentError)?[{sku:'mock-sku',featureKey:s.cancelled?'love-secret-ai-consultation':'life-book-ai-consultation',displayAmount:'테스트 금액',approvedPriceKRW:50000}]:[];export const purchase=()=>{if(s.paymentError==='NULL_ERROR')throw null;if(s.paymentError)throw Object.assign(Error(s.paymentMessage||s.paymentError),{code:s.paymentError});if(s.cancelled)throw Object.assign(Error('USER_CANCELED'),{code:'USER_CANCELED'});if(s.recoveryBusy)throw Object.assign(Error('RECOVERY_IN_PROGRESS'),{code:'RECOVERY_IN_PROGRESS'});throw Error('LIVE_PURCHASE_FORBIDDEN')};`,loader:'js'}));
}}]});
const loaded=new Module(path.join(root,'fusion-billing-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);

test('original useCoinGate imports resolve to Toss progress and paid-access adapters',()=>{
 const plugin=serviceCompat(),importer=path.join(root,'app/hooks/useCoinGate.ts');
 assert.match(plugin.resolveId('./usePayment',importer),/payment-state.jsx$/);
 for(const id of ['@/app/components/ReviewRewardBanner',path.join(root,'app/components/ReviewRewardBanner.tsx'),'../components/ReviewRewardBanner'])assert.match(plugin.resolveId(id,importer),/WebReviewReward.jsx$/);
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

test('Love Secret keeps original payload and idempotency key in its own intent',async()=>{
 globalThis.location={search:''};state.unavailable=false;state.calls=[];
 const input={myInfo:{birthDate:'1990-01-01'},topic:'relationship',idempotencyKey:'original-love-request',requestId:'original-love-request'};
 const result=await loaded.exports.runBillingCoinGate({featureKey:'love-secret-ai-consultation',requestId:input.requestId,resume:{args:{payload:JSON.stringify(input)}}});
 assert.equal(result.ok,true);assert.deepEqual(state.calls[0],{path:'/native/love-secret/prepare',body:{input}});
 delete globalThis.location;
});
test('Ziwei billing retains the original prepared input and request ID',async()=>{
 globalThis.location={search:''};state.unavailable=false;state.calls=[];
 const input={birthDate:'1990-01-01',calendarType:'lunar',isLeapMonth:true,calculationProtocol:'ziwei-prepared-v1'};
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'ziwei-ai-consultation',requestId:'original-ziwei-request',resume:{args:{payload:JSON.stringify(input)}}});assert.equal(result.ok,true);assert.deepEqual(state.calls[0],{path:'/native/ziwei/prepare',body:{input:{...input,idempotencyKey:'original-ziwei-request'}}});assert.equal(state.calls[1].path,'/native/ziwei/intents/intent');}
 finally{delete globalThis.location;}
});
test('new year billing retains the original input, year and request ID',async()=>{
 globalThis.location={search:''};state.unavailable=false;state.calls=[];
 const input={birthDate:'1990-01-01',calendarType:'solar',targetYear:2027,question:'흐름을 알고 싶어요'};
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'new-year-ai-consultation',requestId:'original-year-request',resume:{args:{payload:JSON.stringify(input)}}});assert.equal(result.ok,true);assert.deepEqual(state.calls[0],{path:'/native/new-year/prepare',body:{input:{...input,idempotencyKey:'original-year-request'}}});assert.equal(state.calls[1].path,'/native/new-year/intents/intent');}
 finally{delete globalThis.location;}
});
test('Karma billing retains the original input and request ID',async()=>{
 globalThis.location={search:''};state.unavailable=false;state.calls=[];
 const input={birthDate:'1990-01-01',calendarType:'lunar',isLeapMonth:true,question:'관계의 흐름'};
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'karma-destiny-ai-consultation',requestId:'original-karma-request',resume:{args:{payload:JSON.stringify(input)}}});assert.equal(result.ok,true);assert.deepEqual(state.calls[0],{path:'/native/karma/prepare',body:{input:{...input,idempotencyKey:'original-karma-request'}}});assert.equal(state.calls[1].path,'/native/karma/intents/intent');}
 finally{delete globalThis.location;}
});

test('native billing presents recovery-in-progress guidance before purchase',async()=>{
 globalThis.location={search:''};globalThis.window={addEventListener:()=>{},removeEventListener:()=>{}};state.unavailable=false;state.paid=false;state.recoveryBusy=true;
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'life-book-ai-consultation',requestId:'original-life-request',resume:{args:{payload:JSON.stringify({birthDate:'1990-01-01'})}}});assert.equal(result.error.code,'RECOVERY_IN_PROGRESS');assert.match(result.error.message,/구매 내역을 확인/);}
 finally{state.recoveryBusy=false;state.paid=true;delete globalThis.location;delete globalThis.window;}
});

test('native billing preserves permission denial and provides account guidance',async()=>{
 globalThis.location={search:''};state.unavailable=false;state.denied=true;
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'life-book-ai-consultation',requestId:'same-request',resume:{args:{payload:JSON.stringify({birthDate:'1990-01-01'})}}});assert.equal(result.status,403);assert.equal(result.error.code,'ORDER_OWNERSHIP_MISMATCH');assert.match(result.error.message,/구매한 계정과 주문 내역/);}
 finally{state.denied=false;delete globalThis.location;}
});

test('native billing retains the SDK cancellation code and gives cancellation guidance',async()=>{
 globalThis.location={search:''};globalThis.window={addEventListener:()=>{},removeEventListener:()=>{}};state.unavailable=false;state.paid=false;state.cancelled=true;
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'love-secret-ai-consultation',requestId:'same-request',resume:{args:{payload:JSON.stringify({birthDate:'1990-01-01'})}}});assert.equal(result.error.code,'USER_CANCELED');assert.match(result.error.message,/결제를 취소/);}
 finally{state.cancelled=false;state.paid=true;delete globalThis.location;delete globalThis.window;}
});

for(const [code,message] of [['PAYMENT_IN_PROGRESS',/결제 진행 중/],['PAYMENT_STATUS_UNCERTAIN',/다시 결제하지 말고 구매 내역.*고객지원/],['LOGIN_REQUIRED',/토스 로그인이 필요/],['SESSION_CHECK_FAILED',/로그인 상태를 확인하지 못했어요/],['SESSION_CHANGED',/로그인 상태가 바뀌었어요/]])test('native billing keeps '+code+' guidance',async()=>{
 globalThis.location={search:''};globalThis.window={addEventListener:()=>{},removeEventListener:()=>{}};state.unavailable=false;state.paid=false;state.paymentError=code;
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'life-book-ai-consultation',requestId:'original-life-request',resume:{args:{payload:JSON.stringify({birthDate:'1990-01-01'})}}});assert.equal(result.error.code,code);assert.match(result.error.message,message);}
 finally{state.paymentError=null;state.paid=true;delete globalThis.location;delete globalThis.window;}
});

test('native billing preserves SDK update guidance',async()=>{
 globalThis.location={search:''};globalThis.window={addEventListener:()=>{},removeEventListener:()=>{}};state.unavailable=false;state.paid=false;state.paymentError='UNSUPPORTED_APP_VERSION';state.paymentMessage='토스 앱을 최신 버전으로 업데이트해 주세요.';
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'life-book-ai-consultation',requestId:'original-life-request',resume:{args:{payload:JSON.stringify({birthDate:'1990-01-01'})}}});assert.equal(result.error.code,'UNSUPPORTED_APP_VERSION');assert.equal(result.error.message,state.paymentMessage);}
 finally{state.paymentError=null;state.paymentMessage=null;state.paid=true;delete globalThis.location;delete globalThis.window;}
});


test('native billing preserves a permission code without an HTTP status',async()=>{
 globalThis.location={search:''};globalThis.window={addEventListener:()=>{},removeEventListener:()=>{}};state.unavailable=false;state.paid=false;state.paymentError='ACCESS_DENIED';
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'life-book-ai-consultation',requestId:'same-request',resume:{args:{payload:JSON.stringify({birthDate:'1990-01-01'})}}});assert.equal(result.status,403);assert.equal(result.error.code,'ACCESS_DENIED');assert.match(result.error.message,/권한/);}
 finally{state.paymentError=null;state.paid=true;delete globalThis.location;delete globalThis.window;}
});

test('native billing preserves an expired session code without HTTP status',async()=>{
 globalThis.location={search:''};globalThis.window={addEventListener:()=>{},removeEventListener:()=>{}};state.unavailable=false;state.paid=false;state.paymentError='SESSION_EXPIRED';
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'life-book-ai-consultation',requestId:'same-request',resume:{args:{payload:JSON.stringify({birthDate:'1990-01-01'})}}});assert.equal(result.status,401);assert.equal(result.error.code,'SESSION_EXPIRED');assert.match(result.error.message,/로그인/);}
 finally{state.paymentError=null;state.paid=true;delete globalThis.location;delete globalThis.window;}
});


test('an empty SDK error becomes a retryable failure instead of throwing',async()=>{
 globalThis.location={search:''};globalThis.window={addEventListener:()=>{},removeEventListener:()=>{}};state.unavailable=false;state.paid=false;state.paymentError='NULL_ERROR';
 try{const result=await loaded.exports.runBillingCoinGate({featureKey:'life-book-ai-consultation',requestId:'same-request',resume:{args:{payload:JSON.stringify({birthDate:'1990-01-01'})}}});assert.equal(result.ok,false);assert.equal(result.error.code,'PURCHASE_FAILED');assert.match(result.error.message,/확인/);}
 finally{state.paymentError=null;state.paid=true;delete globalThis.location;delete globalThis.window;}
});
