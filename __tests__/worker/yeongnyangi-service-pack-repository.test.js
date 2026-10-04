/** @jest-environment node */
import {jest} from '@jest/globals';
import mongoose from 'mongoose';
import {MonthlyCreditLedger,PointHistory,User,Payment} from '../../worker/lib/models.js';
import {YeongnyangiRequest} from '../../worker/lib/yeongnyangi-models.js';
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';
import {resolveServicePackProduct} from '../../worker/payments/service-pack-policy.js';
import {PurchaseEntitlement} from '../../worker/payments/purchase-entitlement-model.js';
import {createServicePackOrder,grantServicePack,consumeServicePack,restoreFailedServicePackUse} from '../../worker/payments/service-packs.js';
import {resolveProduct} from '../../worker/payments/catalog.js';

let active;
const mockDbExports={mongoose:{...mongoose,startSession:async()=>({
 endSession:async()=>{},withTransaction:fn=>active.db.transaction(fn)
})},withMongoRetry:async(_env,fn)=>fn(),mongoTransactionOptions:()=>({})};
jest.unstable_mockModule('../../worker/lib/db.js',()=>mockDbExports);
const repository=import('../../worker/yeongnyangi/repository.js');
const USER='507f1f77bcf86cd799439011',ID='d'.repeat(64),RID='yn-'+ID;
const product=resolveProduct({featureKey:'yeongnyangi-saju-mackerel'});
function chain(run) {
 const query={session:()=>query,select:()=>query,sort:()=>query,limit:()=>query,
  lean:run,then:(yes,no)=>Promise.resolve().then(run).then(yes,no)};
 return query;
}
async function withFixture(run) {
 const db=makeFakePaymentDb({uniqueKeys:[['userId','type','sourceId']]}),saved=[];
 const expiresAt=new Date('2099-10-30');
 db.rows.push({_id:USER,recentConsumeRequestIds:[],profileSubscription:{
  membershipCreditBalance:500,membershipCreditUsed:0,membershipCreditLotsVersion:0,
  membershipCreditLots:[{lotId:'signup',amount:500,remaining:500,grantedAt:new Date(),expiresAt}]}},
 {_id:ID,userId:USER,featureKey:product.featureKey,amountKRW:product.priceKRW,state:'CREATED',paymentId:null,
  accessMethod:null,paymentClaimOrderId:'',chapters:[],completedChapters:0,chapterAttempts:{},attempts:0,
  leaseUntil:null,nextAttemptAt:null,snapshot:{manifest:[{},{}]}});
 active={db,get row(){return db.rows.find(r=>r._id===ID)},get user(){return db.rows.find(r=>String(r._id)===USER)}};
 const oldStartSession=mongoose.connection.startSession;
 mongoose.connection.startSession=mockDbExports.mongoose.startSession;
 for(const Model of [MonthlyCreditLedger,PointHistory,User,Payment,YeongnyangiRequest,PurchaseEntitlement]) {
  for(const name of ['find','findOne','findOneAndUpdate','updateOne'])saved.push([Model.collection,name,Model.collection[name]]);
  Model.collection.find=(filter,options)=>({toArray:()=>db.find(Model,filter,options)});
  Model.collection.findOne=(filter,options)=>db.findOne(Model,filter,options);
  Model.collection.findOneAndUpdate=(filter,update,options)=>db.findOneAndUpdate(Model,filter,update,options);
  Model.collection.updateOne=(filter,update,options)=>db.updateOne(Model,filter,update,options);
  for(const name of ['find','findOne','findOneAndUpdate','updateOne','findById'])saved.push([Model,name,Model[name]]);
  Model.find=(filter)=>chain(()=>db.find(Model,filter));
  Model.findOne=(filter)=>chain(()=>db.findOne(Model,filter));
  Model.findById=id=>chain(()=>db.findOne(Model,{_id:id}));
  Model.findOneAndUpdate=(filter,update,options)=>chain(()=>db.findOneAndUpdate(Model,filter,update,{...options,returnDocument:'after'}));
  Model.updateOne=(filter,update)=>chain(()=>db.updateOne(Model,filter,update));
 }
 try {
  const pack=resolveServicePackProduct('pack-fixture',{'pack-fixture':{name:'모의 고등어',fishId:'mackerel',
    priceKRW:9900,totalUses:13,validityDays:90,policyVersion:'fixture'}});
  const order=await createServicePackOrder(db,{userId:USER,product:pack,idempotencyKey:'one',env:{}});
  order.status='paid';order.paidAt=new Date();
  const right=await grantServicePack(db,order);
  await consumeServicePack(db,{userId:USER,requestId:RID,entitlementId:String(right._id)});
  return await run(active,await repository);
 }finally{for(const [Model,name,value] of saved)Model[name]=value;mongoose.connection.startSession=oldStartSession;active=null;}
}
const terminal=f=>Object.assign(f.row,{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',leaseToken:'',leaseUntil:null});
const refund=f=>restoreFailedServicePackUse(f.db,{userId:USER,requestId:RID});
test('refunded request reread is terminal and blocks lease, draft, analysis and chapter writes',()=>withFixture(async(f,repo)=>{
 terminal(f);await refund(f);
 expect((await repo.readRequest({},USER,ID)).state).toBe('REFUNDED');
 await expect(repo.claimChapter({},USER,ID)).rejects.toMatchObject({code:'PAYMENT_NOT_ACTIVE'});
 await expect(repo.saveChapterDraft({},USER,ID,'old',0,{body:{summary:'late'}})).rejects.toMatchObject({code:'RESULT_STORAGE_UNAVAILABLE'});
 await expect(repo.saveAskAnalysis({},USER,ID,'old',{summary:'late'})).rejects.toMatchObject({code:'GENERATION_LEASE_LOST'});
 expect(await repo.finishChapter({},USER,ID,'old',0,{summary:'late'},2)).toBeNull();
 expect(f.row.chapters).toHaveLength(0);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
}));
test('refund between proof read and lease CAS prevents a new attempt',()=>withFixture(async(f,repo)=>{
 const write=f.db.findOneAndUpdate;let entered,resume;
 const ready=new Promise(r=>{entered=r}),paused=new Promise(r=>{resume=r});
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>{
  if(Model===YeongnyangiRequest&&update.$set?.state==='GENERATING'){entered();await paused;}
  return write(Model,filter,update,...rest);
 };
 const claim=repo.claimChapter({},USER,ID);await ready;
 terminal(f);const restored=refund(f);resume();
 expect((await claim).token).toBeNull();
 expect((await restored).restored).toBe(true);
 expect(f.row.attempts).toBe(0);
 expect(f.row.state).toBe('REFUNDED');
}));
test('a committed first chapter prevents any terminal zero-result refund',()=>withFixture(async(f,repo)=>{
 const claim=await repo.claimChapter({},USER,ID);
 const body={summary:'durable'};
 expect(await repo.finishChapter({},USER,ID,claim.token,0,body,2)).not.toBeNull();
 // A late terminal failure marker cannot remove the saved chapter condition.
 terminal(f);
 expect((await refund(f)).restored).toBe(false);
 expect(f.row.chapters).toEqual([body]);
 expect(f.db.rows.find(r=>r.type==='service_pack').remainingUses).toBe(12);
}));
test('terminal update racing chapter transaction rolls back late content before refund',()=>withFixture(async(f,repo)=>{
 const claim=await repo.claimChapter({},USER,ID);
 const write=f.db.findOneAndUpdate;let entered,resume,pausedOnce=false;
 const ready=new Promise(r=>{entered=r}),paused=new Promise(r=>{resume=r});
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>{
  if(!pausedOnce&&Model===PointHistory&&String(update.$set?.['metadata.yeongnyangiCommit']).startsWith('chapter:')){
   pausedOnce=true;entered();await paused;
  }
  return write(Model,filter,update,...rest);
 };
 const finish=repo.finishChapter({},USER,ID,claim.token,0,{summary:'late'},2);await ready;
 terminal(f);
 const restored=refund(f);resume();
 expect(await finish).toBeNull();
 expect((await restored).restored).toBe(true);
 expect(f.row.state).toBe('REFUNDED');
 expect(f.row.chapters).toHaveLength(0);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
}));

test('a committed original-order refund hold before lease commit prevents a new generation attempt',()=>withFixture(async(f,repo)=>{
 const write=f.db.findOneAndUpdate;let entered,resume,pausedOnce=false;
 const ready=new Promise(r=>{entered=r}),paused=new Promise(r=>{resume=r});
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>{
  if(!pausedOnce&&Model===YeongnyangiRequest&&update.$set?.state==='GENERATING'){
   pausedOnce=true;entered();await paused;
  }
  return write(Model,filter,update,...rest);
 };
 const claim=repo.claimChapter({},USER,ID);
 const rejected=expect(claim).rejects.toMatchObject({code:'PAYMENT_NOT_ACTIVE'});
 await ready;
 f.db.rows.find(r=>r.merchantUid).metadata.yeongnyangiRefundPending=true;
 resume();await rejected;
 expect(f.row.attempts).toBe(0);
 expect(f.row.state).toBe('PAID');
 expect(f.row.leaseToken).toBeUndefined();
}));
