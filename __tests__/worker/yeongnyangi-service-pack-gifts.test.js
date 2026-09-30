/** @jest-environment node */
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';
import {Payment,User} from '../../worker/lib/models.js';
import {Gift,GiftGrant} from '../../worker/lib/gift-models.js';
import {YeongnyangiRequest} from '../../worker/lib/yeongnyangi-models.js';
import {PurchaseEntitlement} from '../../worker/payments/purchase-entitlement-model.js';
import {resolveServicePackProduct} from '../../worker/payments/service-pack-policy.js';
import {createServicePackRoutes} from '../../worker/payments/service-pack-routes.js';
import {createServicePackOrder,consumeServicePack,restoreFailedServicePackUse,
 listOwnedServicePacks,findServicePackUseEvidence,grantServicePack} from '../../worker/payments/service-packs.js';
import {giftDraftFor,ensureGiftForOrder,claimGift,issueGiftLink,hashGiftToken} from '../../worker/payments/gifts.js';
import {createPassOrder} from '../../worker/payments/passes.js';
import {currentPassPlan,CURRENT_PASS_POLICY_VERSION} from '../../lib/payment/pass-policy.js';
import {handleGiftRoute} from '../../worker/payments/gift-routes.js';
import {signAuthToken} from '../../worker/lib/auth.js';
import {__paymentsContextTestUtils as payments} from '../../worker/payments/index.js';
const BUYER='507f1f77bcf86cd799439011',RECIPIENT='507f1f77bcf86cd799439022',OTHER='507f1f77bcf86cd799439033';
const PLAN='yeongnyangi-service-pack-mackerel-fixture',NOW=new Date('2026-09-30T00:00:00Z');
const plans={[PLAN]:{name:'모의 선물 고등어',fishId:'mackerel',priceKRW:9900,totalUses:13,validityDays:90,policyVersion:'fixture-only'}};
const product=resolveServicePackProduct(PLAN,plans);
const subscription={tier:'family',isActive:true,expiresAt:new Date('2099-01-01'),monthlySpendCoin:17,membershipCreditBalance:500};
// Keep one snapshot/transaction engine while separating Mongo collections and
// their unique indexes. BSON ids become stable string values in this fixture.
const values=v=>v?._bsontype==='ObjectId'?String(v):v instanceof Date?v:Array.isArray(v)?v.map(values):
 v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,values(x)])):v;
function fixture(){
 const raw=makeFakePaymentDb({uniqueKeys:[['__collection','_id'],['__collection','giftId'],['__collection','merchantUid']]});
 const db={get rows(){return raw.rows},ctx:raw.ctx,transaction:fn=>raw.transaction(()=>fn(db)),
  indexes:async()=>['giftId','orderId','claimTokenHash','contextHash'].map(key=>({key:{[key]:1},unique:true}))};
 const filter=(Model,q)=>({$and:[values(q),{__collection:Model.modelName}]});
 for(const name of ['findOne','find','countDocuments','deleteOne'])db[name]=(Model,q,...rest)=>raw[name](Model,filter(Model,q),...rest);
 db.insertOne=(Model,doc)=>raw.insertOne(Model,{...values(doc),__collection:Model.modelName});
 for(const name of ['updateOne','findOneAndUpdate'])db[name]=(Model,q,update,...rest)=>raw[name](Model,filter(Model,q),
  {...values(update),...(update.$setOnInsert?{$setOnInsert:{...values(update.$setOnInsert),__collection:Model.modelName}}:{})},...rest);
 for(const id of [BUYER,RECIPIENT,OTHER])raw.rows.push({_id:id,__collection:User.modelName,points:0,profileSubscription:structuredClone(subscription)});
 return {db,rows:Model=>db.rows.filter(r=>r.__collection===Model.modelName),
  user:id=>db.rows.find(r=>r.__collection===User.modelName&&r._id===id)};
}
function routes(){return createServicePackRoutes({resolvePlan:id=>resolveServicePackProduct(id,plans),
 listPlans:()=>[product.packSnapshot],prepareOrder:args=>payments.ROUTES['POST /prepare'].handle(args)});}
function prepareArgs(f,{key='gift-one',env={GIFTS_ENABLED:'1'},app='',gift={senderName:'연이',recipientName:'친구',giftMessage:'좋은 하루'},purchaseType='GIFT'}={}){
 return {request:new Request('https://example.test/api/payments/service-packs/prepare',{method:'POST',headers:{'X-CD-App':app,Origin:'https://example.test'}}),
  env,ctx:{},userId:BUYER,withDb:(_env,_ctx,fn)=>fn(f.db),body:{planId:PLAN,idempotencyKey:key,purchaseType,gift,
   priceKRW:1,totalUses:999,validityDays:999,paymentMethod:'card_general'}};
}
async function purchase(f,{key='gift-one',paidAt=new Date('2026-09-01T00:00:00Z')}={}){
 const order=await createServicePackOrder(f.db,{userId:BUYER,product,idempotencyKey:key,purchaseType:'GIFT',
  giftDraft:giftDraftFor({senderName:'연이'},product),env:{}});
 await ensureGiftForOrder(f.db,order);
 const settled=await payments.settleVerifiedOrder(f.db,{},{
  order,pg:{pgTransactionId:'mock-'+key,paidAt,summary:{mock:true}}});
 expect(settled.granted).toBe(true);
 const gift=f.rows(Gift).find(r=>r.orderId===order.merchantUid);
 const tokenHash='token-'+key;gift.claimTokenHash=tokenHash;
 return {order:f.rows(Payment)[0],gift,tokenHash};
}
async function receive(f,g,{userId=RECIPIENT,now=NOW}={}){
 return claimGift(f.db,{userId,tokenHash:g.tokenHash,now});
}
function fortune(f,userId=RECIPIENT,id='f'.repeat(64),featureKey='yeongnyangi-saju-mackerel'){
 const row={_id:id,__collection:YeongnyangiRequest.modelName,userId,featureKey,amountKRW:1000,state:'CREATED',
  paymentClaimOrderId:'',paymentId:null,accessMethod:null,chapters:[],completedChapters:0,leaseUntil:null};
 f.db.rows.push(row);return {row,requestId:'yn-'+id};
}
test.each(['off','app'])('gift %s gate rejects preparation without creating an order',async mode=>{
 const f=fixture(),args=prepareArgs(f,{env:{GIFTS_ENABLED:mode==='off'?'0':'1'},app:mode==='app'?'1':''});
 expect((await (await routes()['GET /service-packs/catalog'].handle(args)).json()).giftEnabled).toBe(false);
 await expect(routes()['POST /service-packs/prepare'].handle(args)).rejects.toMatchObject({code:'GIFT_UNAVAILABLE'});
 expect(f.rows(Payment)).toHaveLength(0);
});
test('gift prepare returns a pending gift discriminator and trusts only the server snapshot',async()=>{
 const f=fixture(),args=prepareArgs(f),out=await (await routes()['POST /service-packs/prepare'].handle(args)).json();
 expect(out.order.purchaseType).toBe('GIFT');expect(out.order.giftId).toBe('gift_'+out.order.orderId);
 expect(out.order.paymentAmount).toBe(9900);expect(out.order.packSnapshot.totalUses).toBe(13);
 expect(f.rows(Gift)).toHaveLength(1);expect(f.rows(Gift)[0].status).toBe('PENDING_PAYMENT');
 expect(f.rows(Gift)[0].productSnapshot).toMatchObject({productType:'service_pack',name:'모의 선물 고등어',validityDays:90,totalUses:13});
 expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
});
test('gift prepare idempotency rejects SELF switch and changed gift message',async()=>{
 const f=fixture();await routes()['POST /service-packs/prepare'].handle(prepareArgs(f));
 await expect(routes()['POST /service-packs/prepare'].handle(prepareArgs(f,{purchaseType:'SELF'}))).rejects.toBeDefined();
 await expect(routes()['POST /service-packs/prepare'].handle(prepareArgs(f,{gift:{giftMessage:'changed'}}))).rejects.toBeDefined();
 expect(f.rows(Payment)).toHaveLength(1);expect(f.rows(Gift)).toHaveLength(1);
});
test('verified gift payment grants no buyer pack or subscription and allows one hashed sharing link',async()=>{
 const f=fixture(),g=await purchase(f),before=structuredClone(f.user(BUYER).profileSubscription);
 expect(g.gift.status).toBe('PAID');expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
 expect(f.user(BUYER).profileSubscription).toEqual(before);
 const link=await issueGiftLink(f.db,{giftId:g.gift.giftId,userId:BUYER,version:0});
 const raw=link.claimPath.split('=')[1];
 expect(f.rows(Gift)[0].claimTokenHash).toBe(await hashGiftToken(raw));
 expect(JSON.stringify(f.rows(Gift)[0])).not.toContain(raw);
 await expect(grantServicePack(f.db,g.order)).rejects.toMatchObject({code:'INVALID_REQUEST'});
});
test('recipient claim starts pack validity at acceptance and leaves both Family subscriptions unchanged',async()=>{
 const f=fixture(),g=await purchase(f),result=await receive(f,g),right=f.rows(PurchaseEntitlement)[0];
 expect(result.grant.after.servicePack.entitlementId).toBe(String(right._id));
 expect(right.userId).toBe(RECIPIENT);expect(right.grantedAt).toEqual(NOW);
 expect(right.expiresAt).toEqual(new Date(NOW.getTime()+90*86400000));
 expect(g.order.userId).toBe(BUYER);
 expect(f.user(BUYER).profileSubscription).toEqual(subscription);expect(f.user(RECIPIENT).profileSubscription).toEqual(subscription);
 const wallet=await listOwnedServicePacks(f.db,{userId:RECIPIENT,now:NOW});
 expect(wallet.packs[0].available).toBe(true);expect((await listOwnedServicePacks(f.db,{userId:BUYER,now:NOW})).packs).toHaveLength(0);
});
test('concurrent recipient claims grant one pack; replay returns current remaining uses without reset',async()=>{
 const f=fixture(),g=await purchase(f);
 const results=await Promise.all([receive(f,g),receive(f,g)]);
 expect(results.filter(r=>!r.replayed)).toHaveLength(1);
 expect(f.rows(GiftGrant)).toHaveLength(1);expect(f.rows(PurchaseEntitlement)).toHaveLength(1);
 const right=f.rows(PurchaseEntitlement)[0],reading=fortune(f);
 await consumeServicePack(f.db,{userId:RECIPIENT,entitlementId:String(right._id),requestId:reading.requestId,now:NOW});
 const replay=await receive(f,g);
 expect(replay.grant.after.servicePack.remainingUses).toBe(12);
 expect(f.rows(PurchaseEntitlement)[0].remainingUses).toBe(12);
 await expect(receive(f,g,{userId:OTHER})).rejects.toMatchObject({code:'GIFT_CLAIMED'});
});
test('competing recipient accounts have exactly one winner and buyer cannot consume recipient rights',async()=>{
 const f=fixture(),g=await purchase(f),results=await Promise.allSettled([receive(f,g),receive(f,g,{userId:OTHER})]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(f.rows(GiftGrant)).toHaveLength(1);
 const right=f.rows(PurchaseEntitlement)[0],reading=fortune(f,BUYER);
 await expect(consumeServicePack(f.db,{userId:BUYER,entitlementId:String(right._id),requestId:reading.requestId,now:NOW}))
 .rejects.toMatchObject({code:'SERVICE_PACK_NOT_COVERED'});
 expect(right.remainingUses).toBe(13);
});
test.each(['pending','refund-hold','expired'])('unclaimed %s gift cannot issue a recipient pack',async state=>{
 const f=fixture(),g=await purchase(f);
 if(state==='pending')g.gift.status='PENDING_PAYMENT';
 if(state==='refund-hold')g.order.metadata.yeongnyangiRefundPending=true;
 if(state==='expired')g.gift.expiresAt=new Date(NOW.getTime()-1);
 await expect(receive(f,g)).rejects.toMatchObject({code:'GIFT_UNCLAIMABLE'});
 expect(f.rows(PurchaseEntitlement)).toHaveLength(0);expect(f.rows(GiftGrant)).toHaveLength(0);
});
test('GiftGrant write failure atomically rolls back recipient pack, claim and payment marker',async()=>{
 const f=fixture(),g=await purchase(f),insert=f.db.insertOne;
 f.db.insertOne=(Model,...args)=>{if(Model===GiftGrant)throw Error('grant unavailable');return insert(Model,...args);};
 await expect(receive(f,g)).rejects.toThrow('grant unavailable');
 expect(f.rows(Gift)[0].status).toBe('PAID');expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
 expect(f.rows(Payment)[0].metadata.giftClaimVersion).toBeUndefined();
 f.db.insertOne=insert;await receive(f,g);expect(f.rows(PurchaseEntitlement)).toHaveLength(1);
});
test.each(['Transaction.Cancelled','Transaction.PartialCancelled'])('unclaimed %s blocks later acceptance',async eventType=>{
 const f=fixture(),g=await purchase(f);
 await payments.applyNonPaidPgEvent(f.db,{eventType,orderId:g.order.merchantUid});
 await expect(receive(f,g)).rejects.toMatchObject({code:'GIFT_UNCLAIMABLE'});
 expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
});
test.each(['Transaction.Cancelled','Transaction.PartialCancelled'])('claimed %s retains recipient access for existing operator review policy',async eventType=>{
 const f=fixture(),g=await purchase(f);await receive(f,g);
 const right=f.rows(PurchaseEntitlement)[0],first=fortune(f);
 await consumeServicePack(f.db,{userId:RECIPIENT,entitlementId:String(right._id),requestId:first.requestId,now:NOW});
 await payments.applyNonPaidPgEvent(f.db,{eventType,orderId:g.order.merchantUid});
 expect(f.rows(Gift)[0].status).toBe('CLAIMED');expect(f.rows(Gift)[0].reviewRequired).toBe(true);
 expect((await listOwnedServicePacks(f.db,{userId:RECIPIENT,now:NOW})).packs[0].available).toBe(true);
 expect(await findServicePackUseEvidence(f.db,{userId:RECIPIENT,requestId:first.requestId,featureKey:first.row.featureKey})).not.toBeNull();
 const next=fortune(f,RECIPIENT,'a'.repeat(64),'yeongnyangi-tarot-mackerel');
 await consumeServicePack(f.db,{userId:RECIPIENT,entitlementId:String(right._id),requestId:next.requestId,now:NOW});
 expect(f.rows(PurchaseEntitlement)[0].remainingUses).toBe(11);
});
test.each(['buyer','recipient','snapshot','grant'])('claimed gift with invalid %s linkage fails proof and new use',async kind=>{
 const f=fixture(),g=await purchase(f);await receive(f,g);
 const right=f.rows(PurchaseEntitlement)[0],first=fortune(f);
 await consumeServicePack(f.db,{userId:RECIPIENT,entitlementId:String(right._id),requestId:first.requestId,now:NOW});
 if(kind==='buyer')f.rows(Payment)[0].userId=OTHER;
 if(kind==='recipient')f.rows(Gift)[0].recipientUserId=OTHER;
 if(kind==='snapshot')f.rows(Gift)[0].productSnapshot={...f.rows(Gift)[0].productSnapshot,totalUses:999};
 if(kind==='grant')f.rows(GiftGrant)[0].after.servicePack.entitlementId='0'.repeat(24);
 expect(await findServicePackUseEvidence(f.db,{userId:RECIPIENT,requestId:first.requestId,featureKey:first.row.featureKey})).toBeNull();
 expect((await listOwnedServicePacks(f.db,{userId:RECIPIENT,now:NOW})).packs[0].available).toBe(false);
 const next=fortune(f,RECIPIENT,'a'.repeat(64));
 await expect(consumeServicePack(f.db,{userId:RECIPIENT,entitlementId:String(right._id),requestId:next.requestId,now:NOW})).rejects.toBeDefined();
 expect(f.rows(PurchaseEntitlement)[0].remainingUses).toBe(12);expect(next.row.state).toBe('CREATED');
});
test('gift consultation empty failure restores one use once after cancellation review without extending validity',async()=>{
 const f=fixture(),g=await purchase(f);await receive(f,g);
 const right=f.rows(PurchaseEntitlement)[0],first=fortune(f),expiresAt=right.expiresAt;
 await consumeServicePack(f.db,{userId:RECIPIENT,entitlementId:String(right._id),requestId:first.requestId,now:NOW});
 await payments.applyNonPaidPgEvent(f.db,{eventType:'Transaction.Cancelled',orderId:g.order.merchantUid});
 Object.assign(first.row,{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',leaseUntil:null});
 const out=await Promise.all([restoreFailedServicePackUse(f.db,{userId:RECIPIENT,requestId:first.requestId,now:NOW}),
  restoreFailedServicePackUse(f.db,{userId:RECIPIENT,requestId:first.requestId,now:NOW})]);
 expect(out.filter(r=>!r.replayed)).toHaveLength(1);
 expect(f.rows(PurchaseEntitlement)[0].remainingUses).toBe(13);expect(f.rows(PurchaseEntitlement)[0].expiresAt).toEqual(expiresAt);
});

test('pack gift allows self acceptance under the existing gift policy',async()=>{
 const f=fixture(),g=await purchase(f);await receive(f,g,{userId:BUYER});
 expect(f.rows(PurchaseEntitlement)[0].userId).toBe(BUYER);
 expect(f.user(BUYER).profileSubscription).toEqual(subscription);
});
test('gift claim HTTP returns the pack DTO and never an applied profile subscription',async()=>{
 const f=fixture(),g=await purchase(f),raw='b'.repeat(64);
 g.gift.claimTokenHash=await hashGiftToken(raw);
 const env={JWT_ACCESS_SECRET:'mock-access-secret-service-pack-gifts-1234'},token=await signAuthToken({_id:RECIPIENT,role:'user'},env);
 const request=new Request('https://example.test/api/payments/gifts/claim',{method:'POST',
  headers:{Authorization:'Bearer '+token,Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({token:raw})});
 const response=await handleGiftRoute({request,env,ctx:{requestId:'mock-gift-claim'},path:'/claim',withDb:(_e,_c,fn)=>fn(f.db)});
 const data=await response.json();expect(response.status).toBe(200);
 expect(data.grant.servicePack).toMatchObject({planId:PLAN,totalUses:13,remainingUses:13});
 expect(data.grant.appliedSubscription).toBeUndefined();expect(data.gift.product.productType).toBe('service_pack');
});
test('a committed refund hold during claim rolls back all recipient grant writes',async()=>{
 const f=fixture(),g=await purchase(f),write=f.db.findOneAndUpdate;
 let release,entered,paused=false;const gate=new Promise(r=>{release=r}),signal=new Promise(r=>{entered=r});
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>{
  const result=await write(Model,filter,update,...rest);
  if(!paused&&Model===Payment&&update.$inc?.['metadata.giftClaimVersion']){paused=true;entered();await gate;}
  return result;
 };
 const pending=receive(f,g);await signal;
 f.rows(Payment)[0].metadata.yeongnyangiRefundPending=true;release();
 await expect(pending).rejects.toMatchObject({code:'GIFT_UNCLAIMABLE'});
 expect(f.rows(Gift)[0].status).toBe('PAID');expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
 expect(f.rows(GiftGrant)).toHaveLength(0);
});
async function generalGift(f,key='general-gift'){
 const plan=currentPassPlan('standard');
 const order=await createPassOrder(f.db,{userId:BUYER,plan,idempotencyKey:key,purchaseType:'GIFT',giftDraft:giftDraftFor({},plan)});
 const stored=f.rows(Payment).find(r=>r.merchantUid===order.merchantUid);stored.status='paid';stored.paidAt=NOW;
 const gift=await ensureGiftForOrder(f.db,stored);gift.claimTokenHash='general-token';
 return {order:stored,gift,tokenHash:'general-token'};
}
test('existing profile gift still blocks a different active tier',async()=>{
 const f=fixture(),g=await generalGift(f);
 await expect(receive(f,g)).rejects.toMatchObject({code:'GIFT_TIER_CONFLICT'});
 expect(f.rows(Gift)[0].status).toBe('PAID');expect(f.user(RECIPIENT).profileSubscription).toEqual(subscription);
 expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
});
test('existing profile gift still extends same tier and preserves spend',async()=>{
 const f=fixture(),expiry=new Date(NOW.getTime()+10*86400000);
 f.user(RECIPIENT).profileSubscription={tier:'standard',passPolicyVersion:CURRENT_PASS_POLICY_VERSION,expiresAt:expiry,premiumUseCycleKey:expiry.toISOString(),
  monthlyLimitCoin:600,monthlySpendCoin:120,premiumUseCount:3};
 const g=await generalGift(f),result=await receive(f,g);
 expect(new Date(result.grant.after.expiresAt).getTime()).toBe(expiry.getTime()+30*86400000);
 expect(result.grant.after.monthlySpendCoin).toBe(120);
 expect(result.grant.after.monthlyLimitCoin).toBeGreaterThan(600);
 expect(result.grant.after.servicePack).toBeUndefined();expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
 const before=structuredClone(f.user(RECIPIENT).profileSubscription);
 await payments.applyNonPaidPgEvent(f.db,{eventType:'Transaction.Cancelled',orderId:g.order.merchantUid});
 expect(f.rows(Gift)[0].status).toBe('CLAIMED');expect(f.rows(Gift)[0].reviewRequired).toBe(true);
 expect(f.user(RECIPIENT).profileSubscription).toEqual(before);
});

test.each(['missing','foreign'])('gift prepare rejects %s Origin before any payment write',async mode=>{
 const f=fixture(),args=prepareArgs(f);
 if(mode==='missing')args.request.headers.delete('Origin');
 else args.request.headers.set('Origin','https://attacker.invalid');
 await expect(routes()['POST /service-packs/prepare'].handle(args)).rejects.toMatchObject({code:'ORDER_FORBIDDEN'});
 expect(f.rows(Payment)).toHaveLength(0);expect(f.rows(Gift)).toHaveLength(0);
});

test.each(['missing','foreign','allowed'])('pack HTTP confirm checks %s Origin through both public aliases',async mode=>{
 for(const key of ['POST /orders/:id/confirm','POST /confirm']){
  const f=fixture(),g=await purchase(f);
  const request=new Request('https://example.test/api/payments/confirm',{method:'POST',
   headers:mode==='missing'?{}:{Origin:mode==='allowed'?'https://example.test':'https://attacker.invalid'}});
  const args={request,env:{},ctx:{},userId:BUYER,params:{id:g.order.merchantUid},
   body:{merchantUid:g.order.merchantUid},withDb:(_e,_c,fn)=>fn(f.db)};
  if(mode==='allowed'){
   const response=await payments.ROUTES[key].handle(args);expect(response.status).toBe(200);
  }else await expect(payments.ROUTES[key].handle(args)).rejects.toMatchObject({code:'ORDER_FORBIDDEN'});
  expect(f.rows(PurchaseEntitlement)).toHaveLength(0);expect(f.rows(Gift)[0].status).toBe('PAID');
 }
});
test('internal gift confirm recovery needs no browser Origin and grants no buyer rights',async()=>{
 const f=fixture(),g=await purchase(f);
 const result=await payments.confirmOrder({}, {},{orderId:g.order.merchantUid},
  {withDb:(_e,_c,fn)=>fn(f.db),deps:{fetchPayment:()=>{throw Error('paid replay must not call provider')}}});
 expect(result.granted).toBe(true);expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
});

test.each(['MOONLIGHT_STONE','monthly_credit','membership_credit','MEMBERSHIP_PASS','subscription_pass','FAMILY',
 'family_pass','coin','balance','entitlement','credit','unknown','custom_free'])('%s cannot fund a SELF or GIFT pack order',async paymentMethod=>{
 for(const purchaseType of ['SELF','GIFT']){
  const f=fixture(),args=prepareArgs(f,{purchaseType});args.body.paymentMethod=paymentMethod;
  await expect(routes()['POST /service-packs/prepare'].handle(args)).rejects.toMatchObject({code:'DIRECT_ONLY_PAYMENT_REQUIRED'});
  await expect(createServicePackOrder(f.db,{userId:BUYER,product,idempotencyKey:'blocked',paymentMethod,purchaseType,
   giftDraft:purchaseType==='GIFT'?giftDraftFor({},product):null})).rejects.toMatchObject({code:'DIRECT_ONLY_PAYMENT_REQUIRED'});
  expect(f.rows(Payment)).toHaveLength(0);expect(f.rows(Gift)).toHaveLength(0);expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
  expect(f.user(BUYER).profileSubscription).toEqual(subscription);
 }
});
test.each(['card_general','transfer','kakaopay','gift_cultureland'])('%s prepares SELF and GIFT as PG-only purchases without granting or spending balances',async paymentMethod=>{
 for(const purchaseType of ['SELF','GIFT']){
  const f=fixture(),args=prepareArgs(f,{purchaseType});
  Object.assign(args.body,{paymentMethod,paymentType:'membership_pass',paymentMode:'MOONLIGHT_STONE',freeBySubscription:true});
  const out=await (await routes()['POST /service-packs/prepare'].handle(args)).json();
  expect(out.order.paymentAmount).toBe(product.priceKRW);expect(out.order.status).toBe('PENDING');
  expect(f.rows(Payment)[0].paymentType).toBe('digital_content');
  expect(f.rows(PurchaseEntitlement)).toHaveLength(0);expect(f.user(BUYER).profileSubscription).toEqual(subscription);
 }
});

test('a server pack id without a yeongnyangi prefix retains its gift through prepare, verified confirm and claim',async()=>{
 const f=fixture(),planId='fish-pack-fixture';
 const plainProduct=resolveServicePackProduct(planId,{[planId]:plans[PLAN]});
 const handler=createServicePackRoutes({resolvePlan:id=>{expect(id).toBe(planId);return plainProduct;},
  prepareOrder:args=>payments.ROUTES['POST /prepare'].handle(args)});
 const args=prepareArgs(f,{key:'non-prefixed-gift'});
 args.body.planId=planId;
 Object.assign(args.env,{PORTONE_API_SECRET:'fixture-secret',PORTONE_STORE_ID:'fixture-store',PORTONE_CHANNEL_KEY:'fixture-channel'});
 const prepared=await (await handler['POST /service-packs/prepare'].handle(args)).json();
 expect(f.rows(Payment)[0].metadata.giftDraft.productSnapshot.planId).toBe(planId);
 expect(f.rows(Gift)[0].productSnapshot.productType).toBe('service_pack');
 const orderId=prepared.order.orderId;
 const confirmed=await payments.confirmOrder(args.env,{}, {orderId,actorUserId:BUYER},{
  withDb:(_e,_c,fn)=>fn(f.db),request:args.request,
  deps:{fetchPayment:async()=>({paymentId:orderId,status:'paid',amount:plainProduct.priceKRW,
   currency:'KRW',paid_at:NOW.getTime()/1000})}
 });
 expect(confirmed.granted).toBe(true);expect(f.rows(PurchaseEntitlement)).toHaveLength(0);
 const gift=f.rows(Gift)[0];expect(gift.status).toBe('PAID');gift.claimTokenHash='non-prefix-token';
 const claimed=await claimGift(f.db,{userId:RECIPIENT,tokenHash:'non-prefix-token',now:NOW});
 expect(claimed.grant.after.servicePack.planId).toBe(planId);
 expect(f.rows(PurchaseEntitlement)[0].userId).toBe(RECIPIENT);
 expect(f.rows(PurchaseEntitlement)[0].remainingUses).toBe(plainProduct.packSnapshot.totalUses);
});
