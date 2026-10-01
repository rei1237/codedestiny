import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=fileURLToPath(new URL('../../',import.meta.url)).replaceAll('\\','/').replace(/\/$/,'');
const require=createRequire(root+'/package.json'),{build}=require('esbuild');
require(root+'/scripts/lib/mock-network-guard.cjs');
const source=await readFile(root+'/app/components/service-packs/service-pack-client.ts','utf8');
const result=await build({stdin:{contents:source,loader:'ts',resolveDir:root},bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'mock-boundaries',setup(b){b.onResolve({filter:/^@\//},args=>args.path.endsWith('checkout-entry.js')?{path:root+'/js/core/checkout-entry.js'}:{path:args.path,namespace:'mock'});b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path.endsWith('auth-client')?'export const authFetch=(...args)=>globalThis.__packFetch(...args);export const isMobileAppRuntime=()=>false;':args.path.endsWith('api-config')?'export const getApiBaseUrl=()=>"";':'export const requestPortOneSinglePayment=(order)=>globalThis.__packSdk(order);',loader:'js'}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const catalog={planId:'qa-mackerel',label:'QA 고등어 세트',fishId:'mackerel',policyVersion:'qa-only',priceKRW:4100,totalUses:7,validityDays:37,unitPriceKRW:1000,eligibleFeatureKeys:['saju','ziwei','sukuyo','astrology','vedic','tarot'].map(system=>'yeongnyangi-'+system+'-mackerel'),autoRenew:false};
const {autoRenew,...snapshot}=catalog;

async function scenario(name,options={},run){
 return test(name,async()=>{
 const storage=new Map(),calls=[],sdk=[],redirects=[];let current=true,paid=Boolean(options.paid),prepareAttempts=0;
 globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 globalThis.window={location:{assign:url=>redirects.push(url)},...(options.kakaoClosed?{__cdDirectPayMethodAvailability:{KAKAOPAY:false}}:{})};
 const purchaseType=options.gift?'GIFT':'SELF';
 const pending={planId:catalog.planId,idempotencyKey:'original-key',orderId:'original-order',purchaseType,...(options.method?{payMethod:options.method}:{}),packSnapshot:snapshot,...(options.gift?{gift:{senderName:'보낸이',recipientName:'받는이',giftMessage:'선물'}}:{})};
 if(options.corruptKey)pending.idempotencyKey='damaged-key';
 if(options.noSnapshot)delete pending.packSnapshot;
 api.savePendingPack('owner-a',pending);
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 globalThis.__packSdk=async order=>{sdk.push(order);paid=true;return {ok:true,paymentId:order.paymentId};};
 globalThis.__packFetch=async(path,init)=>{
  const body=init?.body?JSON.parse(init.body):null;calls.push({path,body});
  if(path.endsWith('/confirm')){
   if(options.ownerSwitch)current=false;
   if(options.confirmLoss)throw new TypeError('mock response lost');
   if(options.confirmError)return reply({ok:false,code:options.confirmError},options.confirmError==='DATABASE_UNAVAILABLE'?503:409);
   return paid?reply({ok:true,entitlementStatus:'granted'}):reply({ok:false,code:'PG_PAYMENT_NOT_PAID'},409);
  }
  if(path.endsWith('/catalog'))return reply({ok:true,plans:options.planRemoved?[]:[{...catalog,...(options.catalogDrift?{totalUses:8}:{})}],giftEnabled:!options.giftDisabled});
  if(path.endsWith('/prepare')){
   prepareAttempts++;assert.equal(body.idempotencyKey,options.corruptKey?'damaged-key':'original-key');assert.equal(body.expectedOrderId,options.newPurchase?undefined:'original-order');assert.equal(body.paymentMethod,options.method==='KAKAOPAY'&&!options.kakaoClosed?'kakaopay':'card_general');assert.equal(body.refundConsent,true);assert.equal(body.purchaseType,purchaseType);assert.equal(body.planId,catalog.planId);
   assert.deepEqual(Object.keys(body).sort(),['planId','idempotencyKey','paymentMethod','refundConsent','purchaseType',...(options.gift?['gift']:[]),...(options.newPurchase?[]:['expectedOrderId'])].sort());
   if(options.corruptKey)return reply({ok:false,code:'ORDER_NOT_CONFIRMABLE'},409);
   if(options.prepareLoss&&prepareAttempts===1)throw new TypeError('mock prepare response lost');
   if(options.paidDuringPrepare)paid=true;
   return reply({order:{merchantUid:options.orderMismatch?'different-order':'original-order',paymentAmount:catalog.priceKRW,productName:catalog.label,customer:{customerId:'owner-a',fullName:'QA',email:'qa@example.invalid'},storeId:'fixture',channelKey:'fixture',status:paid?'PAID':'PENDING',purchaseType,...(options.gift?{giftId:'gift_original-order'}:{}),packSnapshot:{...snapshot,...(options.returnedDrift?{validityDays:38}:{})}}});
  }
  if(path.endsWith('/status'))return reply({ok:true,verified:paid,entitlementGranted:paid});
  throw Error('Unexpected mock endpoint '+path);
 };
 await run({resume:()=>api.resumePendingPackPurchase(options.otherOwner?'owner-b':'owner-a',options.consent!==false,()=>current),calls,sdk,redirects,pending});
 assert.deepEqual(api.readPendingPack('owner-a'),pending,'resume never replaces the original order/key/snapshot');
 });
}
for(const gift of [false,true])await scenario('same order resumes '+(gift?'GIFT':'SELF'),{gift},async({resume,calls,sdk,redirects})=>{assert.equal(await resume(),!gift);assert.equal(calls[0].path,'/api/payments/service-packs/orders/original-order/confirm');assert.equal(sdk.length,1);assert.equal(sdk[0].paymentId,'original-order');if(gift)assert.equal(redirects[0],'/gift/complete/?orderId=original-order');});
await scenario('prepare response lost then explicit retry keeps original key', {prepareLoss:true},async({resume,sdk})=>{await assert.rejects(resume(),e=>e.code==='REQUEST_UNCERTAIN');assert.equal(sdk.length,0);assert.equal(await resume(),true);assert.equal(sdk.length,1);});
for(const gift of [false,true])await scenario('already paid '+(gift?'GIFT':'SELF')+' never opens SDK',{gift,paid:true},async({resume,calls,sdk})=>{assert.equal(await resume(),!gift);assert.equal(calls.length,1);assert.equal(sdk.length,0);});
await scenario('new purchase omits resume-only expectedOrderId',{newPurchase:true},async({calls,sdk})=>{await api.preparePackPurchase(catalog.planId,'original-key',true);assert.equal(calls.length,1);assert.equal(sdk.length,0);});
await scenario('damaged key sends original expectedOrderId and stops on server rejection',{corruptKey:true},async({resume,calls,sdk})=>{await assert.rejects(resume(),e=>e.code==='ORDER_NOT_CONFIRMABLE');const prepare=calls.find(call=>call.path.endsWith('/prepare'));assert.equal(prepare.body.expectedOrderId,'original-order');assert.equal(prepare.body.idempotencyKey,'damaged-key');assert.equal(sdk.length,0);});
await scenario('payment settles between confirm and prepare',{paidDuringPrepare:true},async({resume,sdk})=>{assert.equal(await resume(),true);assert.equal(sdk.length,0);});
for(const [name,options,code]of [
 ['another account',{otherOwner:true},'PENDING_ORDER_UNAVAILABLE'],
 ['owner changes during confirmation',{ownerSwitch:true},'AUTH_SCOPE_CHANGED'],
 ['merchantUid differs',{orderMismatch:true},'ORDER_MISMATCH'],
 ['confirmed 503',{confirmError:'DATABASE_UNAVAILABLE'},'DATABASE_UNAVAILABLE'],
 ['unknown response',{confirmLoss:true},'REQUEST_UNCERTAIN'],
 ['confirmed cancelled',{confirmError:'PG_PAYMENT_CANCELLED'},'PG_PAYMENT_CANCELLED'],
 ['confirmed failed',{confirmError:'PG_PAYMENT_FAILED'},'PG_PAYMENT_FAILED'],
 ['plan removed',{planRemoved:true},'PENDING_ORDER_UNAVAILABLE'],
 ['catalog snapshot changed',{catalogDrift:true},'PENDING_ORDER_UNAVAILABLE'],
 ['response snapshot changed',{returnedDrift:true},'ORDER_MISMATCH'],
 ['fresh consent absent',{consent:false},'PENDING_ORDER_UNAVAILABLE'],
 ['old cache without snapshot',{noSnapshot:true},'PENDING_ORDER_UNAVAILABLE'],
 ['gift sales disabled',{gift:true,giftDisabled:true},'PENDING_ORDER_UNAVAILABLE'],
])await scenario(name,options,async({resume,sdk})=>{await assert.rejects(resume(),e=>e.code===code);assert.equal(sdk.length,0);});
await test('12 locales preserve resume conditions',async()=>{
const copySource=await readFile(root+'/app/components/service-packs/service-pack-copy.ts','utf8');
const start=copySource.indexOf('const COPY=')+11,end=copySource.indexOf('\n};',start)+2;
const copies=JSON.parse(copySource.slice(start,end));
assert.equal(Object.keys(copies).length,12);for(const copy of Object.values(copies))for(const key of ['resumePayment','resumeNotice','resumeConsent','resumeAtShop'])assert.ok(copy[key]);
});
// 카카오페이는 checkout-entry 표에서 EASY_PAY·전용 채널 필드 이름을 받고, 꺼져 있으면 같은 주문을 카드(종전 경로)로 이어간다.
await scenario('KakaoPay resume uses the table channel and never the Inicis fallback',{method:'KAKAOPAY'},async({resume,sdk})=>{assert.equal(await resume(),true);assert.deepEqual(sdk[0].payFields,{payMethod:'EASY_PAY',channelKeyName:'kakaopayChannelKey'});assert.equal(globalThis.window.__cdSelectedDirectPayMethod??null,null);});
await scenario('closed KakaoPay resumes the same order on the card path',{method:'KAKAOPAY',kakaoClosed:true},async({resume,sdk})=>{assert.equal(await resume(),true);assert.equal(sdk[0].payFields,undefined);assert.equal(sdk[0].paymentId,'original-order');});
// 웹훅 지급이 결제 복귀보다 늦으면 '미지급' 확인만 2·4·8초(여기선 1ms) 간격으로 다시 묻고, 오류·취소에는 바로 멈춘다.
async function recheck(grantOn,{error,abortAfter,...options}={}){
 const calls=[],controller=new AbortController(),confirms=()=>calls.filter(path=>path.endsWith('/confirm')).length;
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 globalThis.__packFetch=async path=>{
  calls.push(path);
  if(path.endsWith('/status'))return reply({ok:true,verified:false,entitlementGranted:false});
  if(error)return reply({ok:false,code:error},error==='UNAUTHORIZED'?401:409);
  if(abortAfter===confirms())controller.abort();
  return reply({ok:true,entitlementStatus:confirms()>=grantOn?'granted':'pending'});
 };
 return {result:api.confirmPackOrderWithRecheck('late-order',controller.signal,{delays:[1,1,1],...options}),confirms};
}
await test('recheck schedule stays 2·4·8 seconds',()=>assert.deepEqual(api.PACK_RECHECK_DELAYS,[2000,4000,8000]));
await test('late webhook grant completes on a recheck',async()=>{const r=await recheck(3);assert.equal(await r.result,true);assert.equal(r.confirms(),3);});
await test('still ungranted after 3 rechecks hands back to the manual button',async()=>{const r=await recheck(99);assert.equal(await r.result,false);assert.equal(r.confirms(),4);});
for(const code of ['PG_PAYMENT_NOT_PAID','UNAUTHORIZED'])await test(code+' never rechecks',async()=>{const r=await recheck(1,{error:code});await assert.rejects(r.result,e=>e.code===code);assert.equal(r.confirms(),1);});
await test('cancel stops the pending timers',async()=>{const r=await recheck(99,{abortAfter:1});assert.equal(await r.result,false);assert.equal(r.confirms(),1);});
await test('purchase path skips the duplicate immediate confirm',async()=>{const r=await recheck(1,{immediate:false});assert.equal(await r.result,true);assert.equal(r.confirms(),1);});
