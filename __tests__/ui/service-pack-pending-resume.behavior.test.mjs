import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=fileURLToPath(new URL('../../',import.meta.url)).replaceAll('\\','/').replace(/\/$/,'');
const require=createRequire(root+'/package.json'),{build}=require('esbuild');
require(root+'/scripts/lib/mock-network-guard.cjs');
const source=await readFile(root+'/app/components/service-packs/service-pack-client.ts','utf8');
const result=await build({stdin:{contents:source,loader:'ts',resolveDir:root},bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'mock-boundaries',setup(b){b.onResolve({filter:/^@\//},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path.endsWith('auth-client')?'export const authFetch=(...args)=>globalThis.__packFetch(...args);export const isMobileAppRuntime=()=>false;':args.path.endsWith('api-config')?'export const getApiBaseUrl=()=>"";':'export const requestPortOneSinglePayment=(order)=>globalThis.__packSdk(order);',loader:'js'}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const catalog={planId:'qa-mackerel',label:'QA 고등어 세트',fishId:'mackerel',policyVersion:'qa-only',priceKRW:4100,totalUses:7,validityDays:37,unitPriceKRW:1000,eligibleFeatureKeys:['saju','ziwei','sukuyo','astrology','vedic','tarot'].map(system=>'yeongnyangi-'+system+'-mackerel'),autoRenew:false};
const {autoRenew,...snapshot}=catalog;

async function scenario(name,options={},run){
 return test(name,async()=>{
 const storage=new Map(),calls=[],sdk=[],redirects=[];let current=true,paid=Boolean(options.paid),prepareAttempts=0;
 globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 globalThis.window={location:{assign:url=>redirects.push(url)}};
 const purchaseType=options.gift?'GIFT':'SELF';
 const pending={planId:catalog.planId,idempotencyKey:'original-key',orderId:'original-order',purchaseType,packSnapshot:snapshot,...(options.gift?{gift:{senderName:'보낸이',recipientName:'받는이',giftMessage:'선물'}}:{})};
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
   prepareAttempts++;assert.equal(body.idempotencyKey,'original-key');assert.equal(body.paymentMethod,'card_general');assert.equal(body.refundConsent,true);assert.equal(body.purchaseType,purchaseType);assert.equal(body.planId,catalog.planId);
   assert.deepEqual(Object.keys(body).sort(),['planId','idempotencyKey','paymentMethod','refundConsent','purchaseType',...(options.gift?['gift']:[])].sort());
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
