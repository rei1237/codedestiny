/** @jest-environment node */
import {jest} from '@jest/globals';
import mongoose from 'mongoose';
import {MonthlyCreditLedger,User,Payment} from '../../worker/lib/models.js';
import {YeongnyangiRequest} from '../../worker/lib/yeongnyangi-models.js';
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';
import {spendMoonstone} from '../../worker/payments/moonstone.js';
import {resolveProduct} from '../../worker/payments/catalog.js';
import {refundTerminalMoonstone} from '../../worker/yeongnyangi/moonstone-refund.js';
import {reserveDeliveryRefund} from '../../worker/yeongnyangi/terminal-refund.js';
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
async function withFixture(run,chat=null) {
 const db=makeFakePaymentDb({uniqueKeys:[['userId','type','sourceId']]}),saved=[];
 const expiresAt=new Date('2099-10-30');
 db.rows.push({_id:USER,recentConsumeRequestIds:[],profileSubscription:{
  membershipCreditBalance:500,membershipCreditUsed:0,membershipCreditLotsVersion:0,
  membershipCreditLots:[{lotId:'signup',amount:500,remaining:500,grantedAt:new Date(),expiresAt}]}},
 {_id:ID,userId:USER,featureKey:(chat||product).featureKey,amountKRW:chat?3000:1000,state:'CREATED',paymentId:null,
  accessMethod:null,paymentClaimOrderId:'',chapters:[],completedChapters:0,chapterAttempts:{},attempts:0,
  leaseUntil:null,nextAttemptAt:null,snapshot:{manifest:[{},{}]}});
 active={db,get row(){return db.rows.find(r=>r._id===ID)},get user(){return db.rows.find(r=>String(r._id)===USER)}};
 for(const Model of [MonthlyCreditLedger,User,Payment,YeongnyangiRequest]) {
  for(const name of ['find','findOne','findOneAndUpdate','updateOne','findById'])saved.push([Model,name,Model[name]]);
  Model.find=(filter)=>chain(()=>db.find(Model,filter));
  Model.findOne=(filter)=>chain(()=>db.findOne(Model,filter));
  Model.findById=id=>chain(()=>db.findOne(Model,{_id:id}));
  Model.findOneAndUpdate=(filter,update,options)=>chain(()=>db.findOneAndUpdate(Model,filter,update,{...options,returnDocument:'after'}));
  Model.updateOne=(filter,update)=>chain(()=>db.updateOne(Model,filter,update));
 }
 try {
  const spent=await spendMoonstone(db,{userId:USER,product:chat||product,purchaseId:chat?'fc-'+ID:RID});
  if(chat)Object.assign(active.row,{accessMethod:'PER_USE',perUseSource:'ledger',perUseEvidenceId:spent.ledgerId});
  return await run(active,await repository);
 }finally{for(const [Model,name,value] of saved)Model[name]=value;active=null;}
}
const terminal=f=>Object.assign(f.row,{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',leaseToken:'',leaseUntil:null});
const refund=f=>refundTerminalMoonstone(f.db,{userId:USER,requestId:ID});

test('a reserved partial final failure restores original stones exactly once and blocks a new lease',()=>withFixture(async(f,repo)=>{
 const claim=await repo.claimChapter({},USER,ID);await repo.finishChapter({},USER,ID,claim.token,0,{summary:'saved'},2);
 terminal(f);await reserveDeliveryRefund(f.db,f.row);
 await expect(repo.claimChapter({},USER,ID)).rejects.toMatchObject({code:'DELIVERY_REFUND_PENDING'});
 expect((await refundTerminalMoonstone(f.db,{userId:USER,requestId:ID,terminal:true})).refunded).toBe(true);
 expect((await refundTerminalMoonstone(f.db,{userId:USER,requestId:ID,terminal:true})).replayed).toBe(true);
 expect(f.row.chapters).toHaveLength(1);expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
}));

test.each(['claim','reconcile'])('refund reservation wins over a stale %s CAS',kind=>withFixture(async(f,repo)=>{
 const first=await repo.claimChapter({},USER,ID);await repo.finishChapter({},USER,ID,first.token,0,{summary:'saved'},2);
 if(kind==='reconcile')f.row.chapterAttempts[1]=2;
 const write=f.db.findOneAndUpdate;let entered,resume,pausedOnce=false;
 const ready=new Promise(resolve=>{entered=resolve}),paused=new Promise(resolve=>{resume=resolve});
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>{
  if(!pausedOnce&&Model===YeongnyangiRequest&&(kind==='claim'?update.$set?.state==='GENERATING':update.$set?.errorCode==='AUTOMATIC_RECOVERY_STOPPED')){
   pausedOnce=true;entered();await paused;
  }
  return write(Model,filter,update,...rest);
 };
 const delayed=repo.claimChapter({},USER,ID);await ready;
 terminal(f);await reserveDeliveryRefund(f.db,f.row);resume();
 expect((await delayed).token).toBeNull();expect(f.row.errorCode).toBe('DELIVERY_REFUND_PENDING');
 expect(f.row.state).toBe('FORTUNE_FAILED');expect(f.row.chapters).toHaveLength(1);
}));
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
 terminal(f);await refund(f);resume();
 expect((await claim).token).toBeNull();
 expect(f.row.attempts).toBe(0);
 expect(f.row.state).toBe('REFUNDED');
}));
test('a committed first chapter prevents any terminal zero-result refund',()=>withFixture(async(f,repo)=>{
 const claim=await repo.claimChapter({},USER,ID);
 const body={summary:'durable'};
 expect(await repo.finishChapter({},USER,ID,claim.token,0,body,2)).not.toBeNull();
 // A late terminal failure marker cannot remove the saved chapter condition.
 terminal(f);
 expect((await refund(f)).refunded).toBe(false);
 expect(f.row.chapters).toEqual([body]);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(0);
}));
test('terminal update racing chapter transaction rolls back late content before refund',()=>withFixture(async(f,repo)=>{
 const claim=await repo.claimChapter({},USER,ID);
 const write=f.db.findOneAndUpdate;let entered,resume,pausedOnce=false;
 const ready=new Promise(r=>{entered=r}),paused=new Promise(r=>{resume=r});
 f.db.findOneAndUpdate=async(Model,filter,update,...rest)=>{
  if(!pausedOnce&&Model===MonthlyCreditLedger&&String(update.$set?.['metadata.yeongnyangiCommit']).startsWith('chapter:')){
   pausedOnce=true;entered();await paused;
  }
  return write(Model,filter,update,...rest);
 };
 const finish=repo.finishChapter({},USER,ID,claim.token,0,{summary:'late'},2);await ready;
 terminal(f);
 const restored=refund(f);resume();
 expect(await finish).toBeNull();
 expect((await restored).refunded).toBe(true);
 expect(f.row.state).toBe('REFUNDED');
 expect(f.row.chapters).toHaveLength(0);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
}));
test('a fortune-chat consultation paid with stones gets them back once when it delivered nothing',()=>withFixture(async f=>{
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(200);
 terminal(f);
 const first=await refundTerminalMoonstone(f.db,{userId:USER,requestId:ID,perUse:true});
 expect(first).toMatchObject({refunded:true,replayed:false,amount:300});
 expect(f.row).toMatchObject({state:'REFUNDED',errorCode:'MONTHLY_CREDIT_RESTORED'});
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
 const receipt=f.db.rows.find(r=>r.type==='MONTHLY_CREDIT_GRANT');
 expect(receipt.metadata.requestId).toBe('fc-'+ID);
 expect((await refundTerminalMoonstone(f.db,{userId:USER,requestId:ID,perUse:true})).replayed).toBe(true);
 expect(f.user.profileSubscription.membershipCreditBalance).toBe(500);
 // The Yeongnyangi stone restore never touches a per-use consultation.
 expect((await refund(f)).refunded).toBe(false);
},resolveProduct({featureKey:'fortune-chat-consultation'})));
