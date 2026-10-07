import {jest} from '@jest/globals';
import mongoose from 'mongoose';
import {CHAPTER_DELIVERY_VERSION as deliveryVersion} from '../../worker/yeongnyangi/chapter-delivery-contract.js';
const owner='507f1f77bcf86cd799439011', other='507f1f77bcf86cd799439022';
let loseStoredDraftAtClaim=false;
let loseDraftAcknowledgement=false;
let requests=[],payments=[],evidences=[],accounts=[],familyUser=null,failWrite=false,failFinalRead=false,failFinalComplete=false,refundBeforeFinalization=false,tail=Promise.resolve(),activeOperations=0;
const consumePass=jest.fn(),refundPass=jest.fn(),refundMoonstone=jest.fn(),verifyPerUse=jest.fn();
const get=(row,key)=>key.split('.').reduce((v,k)=>v?.[k],row);
function expr(row,e) {
  if(typeof e==='string'&&e.startsWith('$'))return get(row,e.slice(1));
  if(!e||typeof e!=='object')return e;
  const [[op,args]]=Object.entries(e),v=args.map(a=>expr(row,a));
  if(op==='$lt')return v[0]<v[1];
  if(op==='$eq')return v[0]===v[1];
  if(op==='$add')return v.reduce((a,b)=>a+b,0);
  if(op==='$min')return Math.min(...v);
  if(op==='$ifNull')return v[0]??v[1];
  throw new Error(`unsupported expr ${op}`);
}
const same=(value,want)=>Array.isArray(value)?value.map(String).includes(String(want)):String(value)===String(want);
function matches(row,query) {
  return Object.entries(query).every(([key,want])=>{
    if(key==='$expr') return expr(row,want);
    if(key==='$nor') return !want.some(q=>matches(row,q));
    if(key==='$or') return want.some(q=>matches(row,q));
    if(key==='$and') return want.every(q=>matches(row,q));
    const value=get(row,key);
    if(want && typeof want==='object' && !(want instanceof Date) && !(want instanceof mongoose.Types.ObjectId)) {
      return Object.entries(want).every(([op,target])=>{
        if(op==='$in')return target.includes(value);
        if(op==='$nin')return !target.includes(value);
        if(op==='$gte')return value>=target;
        if(op==='$size')return Array.isArray(value)&&value.length===target;
        if(op==='$ne')return !same(value,target);
        if(op==='$gt')return value>target;
        if(op==='$exists')return (value!==undefined)===target;
        if(op==='$lte')return value<=target;
        if(op==='$lt')return value<target;
        if(op==='$regex')return target.test(String(value));
        throw new Error(`unsupported ${op}`);
      });
    }
    return want===null?value==null:same(value,want);
  });
}
function set(row,key,value) {
  const keys=key.split('.');let current=row;
  for(const part of keys.slice(0,-1))current=current[part]??=( {} );
  current[keys.at(-1)]=value;
}
function query(fn) {
  const chain={session:()=>chain,select:()=>chain,sort:()=>chain,limit:()=>chain,lean:async()=>fn(),then:(a,b)=>Promise.resolve().then(fn).then(a,b)};
  return chain;
}
function model(source,kind) {
  return {
    find:filter=>query(()=>source().filter(row=>matches(row,filter))),
    findOne:filter=>query(()=>{
      if(kind==='request'&&failFinalRead&&filter.completedChapters!==undefined){failFinalRead=false;throw new Error('final reread failed');}
      if(kind==='request'&&refundBeforeFinalization&&filter.completedChapters!==undefined){refundBeforeFinalization=false;payments[0].status='refunded';}
      return source().find(row=>matches(row,filter))||null;
    }),
    findOneAndUpdate:(filter,update,options={})=>query(()=>{
      if(kind==='request'&&failWrite&&update.$set?.paymentId)throw new Error('write failed');
      if(kind==='request'&&failFinalComplete&&update.$set?.state==='COMPLETED'){failFinalComplete=false;throw new Error('completion write failed');}
      if(kind==='request'&&loseStoredDraftAtClaim&&update.$set?.leaseToken){loseStoredDraftAtClaim=false;delete requests[0].generationCheckpoint.chapterDrafts[requests[0].chapters.length];}
      let row=source().find(row=>matches(row,filter));
      if(!row&&options.upsert){row={...filter,...update.$setOnInsert};source().push(row);}
      if(!row)return null;
      for(const [key,value] of Object.entries(update.$set||{}))set(row,key,value);
      for(const [key,value] of Object.entries(update.$inc||{}))set(row,key,(get(row,key)||0)+value);
      for(const [key,value] of Object.entries(update.$push||{}))(row[key]??=[]).push(value);
      for(const [key,value] of Object.entries(update.$addToSet||{}))if(!(row[key]??=[]).includes(value))row[key].push(value);
      for(const [key,value] of Object.entries(update.$pull||{}))row[key]=(row[key]||[]).filter(item=>item!==value);
      return {...row,chapters:row.chapters?[...row.chapters]:undefined};
    }),
    updateOne:(filter,update)=>query(()=>{
      const row=source().find(r=>matches(r,filter));
      if(row){
        for(const [key,value] of Object.entries(update.$set||{}))set(row,key,value);
        for(const [key,value] of Object.entries(update.$inc||{}))set(row,key,(get(row,key)||0)+value);
        for(const [key,value] of Object.entries(update.$push||{}))(row[key]??=[]).push(value);
      }
      if(loseDraftAcknowledgement && Object.keys(update.$set||{}).some(key=>key.startsWith('generationCheckpoint.chapterDrafts.'))){
        loseDraftAcknowledgement=false;throw Object.assign(new Error('lost draft acknowledgement'),{transientDraft:true});
      }
      return {modifiedCount:row?1:0};
    }),
  };
}
const RequestModel=model(()=>requests,'request'), Payment=model(()=>payments,'payment');
const User={findById:()=>query(()=>familyUser),findOne:filter=>query(()=>familyUser&&matches(familyUser,filter)?familyUser:null),collection:{}}, PointHistory=model(()=>evidences,'history');
const txOptions={maxCommitTimeMS:12000};
const startSession=async()=>{
  expect(activeOperations).toBeGreaterThan(0);
  return {endSession:async()=>{expect(activeOperations).toBeGreaterThan(0);},withTransaction:async(callback,options)=>{
  expect(options).toEqual(txOptions);
  const previous=tail;let release;tail=new Promise(r=>{release=r;});await previous;
  const backup=JSON.parse(JSON.stringify({requests,payments,accounts}));
  try{return await callback();}catch(error){requests=backup.requests;payments=backup.payments;accounts=backup.accounts;throw error;}finally{release();}
}};};
jest.unstable_mockModule('../../worker/lib/db.js',()=>({
  mongoose:{...mongoose,models:{YeongnyangiRequest:RequestModel},startSession},
  connectDb:async()=>{},withMongoRetry:async(_env,fn,options={})=>{
    activeOperations++;try{return await fn();}catch(error){
      if(error.transientDraft && options.retries!==0)return await fn();throw error;
    }finally{activeOperations--;}
  },mongoTransactionOptions:()=>txOptions,
  isTransientMongoError:()=>false,
}));
const AccountUsage=model(()=>accounts,'account'),unused=model(()=>[],'unused');
jest.unstable_mockModule('../../worker/lib/models.js',()=>({Payment,User,PointHistory,MonthlyCreditLedger:model(()=>[],'monthly-ledger'),
  GuardianFortuneAccountUsage:AccountUsage,GuardianFortuneAnonymousMerge:unused,GuardianFortuneGenerationAttempt:unused,GuardianFortuneGuestUsage:unused}));
jest.unstable_mockModule('../../worker/lib/entitlement-policy.js',()=>({resolveCanonicalEntitlement:user=>user?.profileSubscription || {}}));
jest.unstable_mockModule('../../worker/lib/pass-consumption.js',()=>({consumePassForFeature:consumePass,refundPassCoverage:refundPass,refundYeongnyangiMoonstone:refundMoonstone,
  consultationRefundDb:session=>{expect(activeOperations).toBeGreaterThan(0);expect(session.withTransaction).toEqual(expect.any(Function));return {session};}}));
jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({verifyPerUsePayment:verifyPerUse}));
jest.unstable_mockModule('../../worker/payments/passes.js',()=>({passUsageEvidenceId:()=> '507f1f77bcf86cd799439099'}));
let repo;
beforeAll(async()=>{repo=await import('../../worker/yeongnyangi/repository.js');});
const values={profileId:'p1',productId:'saju_mackerel',featureKey:'yeongnyangi-saju-mackerel',amountKRW:1000,fingerprint:'fixed',snapshot:{manifest:[{},{}]}};
test('tuna stops at item 9 of 15 and resumes from item 9 under concurrent recovery',async()=>{
  const tuna={...values,productId:'saju_tuna',featureKey:'yeongnyangi-saju-tuna',amountKRW:10000,snapshot:{manifest:Array.from({length:15},()=>({}))}};
  payments[0].featureKey=tuna.featureKey;payments[0].paymentAmount=tuna.amountKRW;
  await repo.createRequest({},owner,'id',tuna);
  await repo.attachPayment({},owner,'id',tuna.amountKRW);
  for(let ordinal=0;ordinal<8;ordinal++){
    const claim=await repo.claimChapter({},owner,'id');
    await repo.finishChapter({},owner,'id',claim.token,ordinal,{summary:`saved-${ordinal}`},15);
  }
  const saved=structuredClone(requests[0].chapters);
  const ninth=await repo.claimChapter({},owner,'id');
  await repo.failChapter({},owner,'id',ninth.token,'FORTUNE_PROVIDER_TIMEOUT',1,'provider');
  requests[0].nextAttemptAt=null;
  const claims=await Promise.all([repo.claimChapter({},owner,'id'),repo.claimChapter({},owner,'id')]);
  expect(claims.filter(row=>row.token)).toHaveLength(1);
  const resumed=claims.find(row=>row.token);
  expect(resumed.row.chapters).toEqual(saved);
  await repo.finishChapter({},owner,'id',resumed.token,8,{summary:'recovered-9'},15);
  for(let ordinal=9;ordinal<15;ordinal++){
    const claim=await repo.claimChapter({},owner,'id');
    await repo.finishChapter({},owner,'id',claim.token,ordinal,{summary:`saved-${ordinal}`},15);
  }
  expect(requests[0].chapters.slice(0,8)).toEqual(saved);
  expect(requests[0].state).toBe('COMPLETED');
  expect(requests[0].chapterAttempts[8]).toBe(2);
  expect(payments).toHaveLength(1);
  expect(consumePass).not.toHaveBeenCalled();
});
beforeEach(()=>{
  loseStoredDraftAtClaim=false;requests=[];payments=[{_id:'pay1',requestId:'yn-id',userId:owner,featureKey:values.featureKey,paymentType:'digital_content',status:'paid',paymentAmount:1000,metadata:{}}];
  evidences=[];accounts=[];familyUser=null;consumePass.mockReset();refundPass.mockReset();refundMoonstone.mockReset();verifyPerUse.mockReset();
  failWrite=false;failFinalRead=false;failFinalComplete=false;refundBeforeFinalization=false;tail=Promise.resolve();
});
test('ask generation evidence is stored separately and an intent replay cannot replace it',async()=>{
  const generationCheckpoint={version:'ask-generation-v1',evidence:{packet_version:'ask-evidence-v1',facts:[{id:'F001',value:'first draw'}]}};
  const first=await repo.createRequest({},owner,'id',{...values,generationCheckpoint});
  const replay=await repo.createRequest({},owner,'id',{...values,generationCheckpoint:{version:'replacement'}});
  expect(first.snapshot).toEqual(values.snapshot);
  expect(replay.generationCheckpoint).toEqual(generationCheckpoint);
  expect(requests).toHaveLength(1);
});

test('question-sky first result waits for one atomic follow-up instead of queueing chapter two',async()=>{
  const sky={...values,productId:'saju_flounder',featureKey:'yeongnyangi-saju-flounder',amountKRW:5000,
    snapshot:{manifest:[{},{}],questionSkyStage:{version:'question-sky-flounder-3'}}};
  payments[0].featureKey=sky.featureKey;payments[0].paymentAmount=sky.amountKRW;
  await repo.createRequest({},owner,'id',sky);await repo.attachPayment({},owner,'id',sky.amountKRW);
  const first=await repo.claimChapter({},owner,'id');
  await repo.finishChapter({},owner,'id',first.token,0,{summary:'첫 답',followUpSuggestions:['첫 심화 질문입니다.','둘째 심화 질문입니다.','셋째 심화 질문입니다.']},2);
  expect(requests[0].state).toBe('AWAITING_FOLLOWUP');
  expect((await repo.claimChapter({},owner,'id')).token).toBeNull();
  const submitted=await repo.reserveQuestionSkyFollowup({},owner,'id','첫 심화 질문입니다.');
  expect(submitted.state).toBe('PAID');expect(submitted.generationCheckpoint.followup.used).toBe(true);
  await expect(repo.reserveQuestionSkyFollowup({},owner,'id','다른 심화 질문입니다.')).rejects.toMatchObject({code:'FOLLOWUP_ALREADY_USED'});
  const second=await repo.claimChapter({},owner,'id');
  await repo.finishChapter({},owner,'id',second.token,1,{summary:'심화 답'},2);
  expect(requests[0].state).toBe('COMPLETED');
});

async function claimedAsk() {
  await repo.createRequest({},owner,'id',{...values,generationCheckpoint:{version:'ask-generation-v1',evidence:{facts:[]}}});
  await repo.attachPayment({},owner,'id',1000);
  return repo.claimChapter({},owner,'id');
}
test('ask analysis persists independently, rereads and cannot be replaced',async()=>{
  const {token}=await claimedAsk();
  const analysis={version:'ask-analysis-v1',source:'rules',questions:[{questionId:'q1',category:'career',needsTiming:false}]};
  expect(await repo.saveAskAnalysis({},owner,'id',token,analysis)).toEqual(analysis);
  expect(await repo.saveAskAnalysis({},owner,'id',token,{version:'replacement'})).toEqual(analysis);
  expect(requests[0].snapshot).toEqual(values.snapshot);
  expect(requests[0].generationCheckpoint.evidence).toEqual({facts:[]});
});
test('ask checkpoint rejects other owner, stale lease, refunded and pending refund',async()=>{
  const {token}=await claimedAsk();
  await expect(repo.saveAskAnalysis({},other,'id',token,{})).rejects.toThrow();
  await expect(repo.saveAskAnalysis({},owner,'id','old',{})).rejects.toThrow();
  payments[0].metadata.yeongnyangiRefundPending=true;
  await expect(repo.saveAskAnalysis({},owner,'id',token,{})).rejects.toThrow();
  payments[0].metadata.yeongnyangiRefundPending=false;payments[0].status='refunded';
  await expect(repo.saveAskAnalysis({},owner,'id',token,{})).rejects.toThrow();
  expect(requests[0].generationCheckpoint.analysis).toBeUndefined();
});

test('limited ask review keeps payment and saved chapters without another claim',async()=>{
  const first=await claimedAsk();
  await repo.failChapter({},owner,'id',first.token,'ASK_EVIDENCE_INCOMPLETE',1,'quality',3);
  requests[0].nextAttemptAt=new Date(0);
  const second=await repo.claimChapter({},owner,'id');
  expect(second.token).toBeTruthy();
  await repo.failChapter({},owner,'id',second.token,'ASK_LIMITED_REVIEW_REQUIRED',2,'quality',3,'ASK_EVIDENCE_INCOMPLETE');
  expect(requests[0]).toMatchObject({state:'FORTUNE_FAILED',errorCode:'ASK_LIMITED_REVIEW_REQUIRED',paymentId:'pay1',nextAttemptAt:null});
  expect(requests[0].recoveryAudit.at(-1)).toMatchObject({kind:'review_required',detail:'ASK_EVIDENCE_INCOMPLETE'});
  await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
  expect(requests[0].chapters).toHaveLength(0);
});

test('limited ask review preserves Family proof for support without restoring quota',async()=>{
  requests.push({_id:'family-ask',userId:owner,...values,state:'GENERATING',
    accessMethod:'FAMILY',passEvidenceId:'507f1f77bcf86cd799439099',passCycleKey:'cycle',
    passCoinCost:10,completedChapters:0,chapters:[],leaseToken:'lease',
    generationCheckpoint:{version:'ask-generation-v1'}});
  evidences.push({_id:'507f1f77bcf86cd799439099',userId:owner,featureKey:values.featureKey,
    metadata:{requestId:'family-ask',accessMethod:'FAMILY'}});
  await repo.failChapter({},owner,'family-ask','lease','ASK_LIMITED_REVIEW_REQUIRED',2,'quality',3);
  expect(refundPass).not.toHaveBeenCalled();
  expect(requests[0]).toMatchObject({state:'FORTUNE_FAILED',errorCode:'ASK_LIMITED_REVIEW_REQUIRED',
    accessMethod:'FAMILY',passEvidenceId:'507f1f77bcf86cd799439099'});
  expect((await repo.readRequest({},owner,'family-ask')).state).toBe('FORTUNE_FAILED');
});

test('ask checkpoint requires active Family evidence and an unexpired lease',async()=>{
  await repo.createRequest({},owner,'id',{...values,generationCheckpoint:{version:'ask-generation-v1'}});
  Object.assign(requests[0],{accessMethod:'FAMILY',passEvidenceId:'507f1f77bcf86cd799439099',state:'PAID'});
  evidences.push({_id:'507f1f77bcf86cd799439099',userId:owner,featureKey:values.featureKey,metadata:{requestId:'id',accessMethod:'FAMILY'}});
  const {token}=await repo.claimChapter({},owner,'id');
  const analysis={version:'ask-analysis-v1',source:'rules',questions:[]};
  expect(await repo.saveAskAnalysis({},owner,'id',token,analysis)).toEqual(analysis);
  evidences[0].metadata.refundedForServiceExecution=true;
  await expect(repo.saveAskAnalysis({},owner,'id',token,analysis)).rejects.toThrow();
  evidences[0].metadata.refundedForServiceExecution=false;
  requests[0].leaseUntil=new Date(0);
  await expect(repo.saveAskAnalysis({},owner,'id',token,analysis)).rejects.toThrow();
});

test('Family access consumes once, persists proof, and remains readable after pass expiry',async()=>{
  payments=[];familyUser={_id:owner,profileSubscription:{tier:'family',passTier:'family',isActive:true,expiresAt:'2026-10-23T00:00:00.000Z'}};
  consumePass.mockImplementation(async()=>{
    if(!evidences.length)evidences.push({_id:'507f1f77bcf86cd799439099',userId:owner,featureKey:values.featureKey,metadata:{requestId:'id',accessMethod:'FAMILY'}});
    return {covered:true,replayed:evidences.length>1,coverage:{cycleKey:'2026-10-23T00:00:00.000Z'}};
  });
  await repo.createRequest({},owner,'id',values);
  const [a,b]=await Promise.all([repo.attachPayment({},owner,'id',1000),repo.attachPayment({},owner,'id',1000)]);
  expect(a.accessMethod||b.accessMethod).toBe('FAMILY');
  expect(requests[0]).toMatchObject({accessMethod:'FAMILY',passCoinCost:10,passCycleKey:'2026-10-23T00:00:00.000Z',state:'PAID'});
  familyUser.profileSubscription={tier:'free',isActive:false,expiresAt:'2026-09-23T00:00:00.000Z'};
  expect((await repo.readRequest({},owner,'id')).accessMethod).toBe('FAMILY');
});

test('a tarot order awaiting its draw cannot be funded, and the draw commits once',async()=>{
  familyUser={_id:owner,profileSubscription:{tier:'family',passTier:'family',isActive:true}};
  const tarot={...values,snapshot:{manifest:[{}],analysis:{contexts:{tarot:{facts:[]}}}}};
  await repo.createRequest({},owner,'id',tarot,{initialState:'AWAITING_DRAW'});
  await expect(repo.createRequest({},owner,'x',tarot,{initialState:'PAID'})).rejects.toMatchObject({status:500});
  for(const charge of [1000,1000])await expect(repo.attachPayment({},owner,'id',charge)).rejects.toMatchObject({status:409,code:'TAROT_DRAW_REQUIRED'});
  expect(consumePass).not.toHaveBeenCalled();
  expect(requests[0]).toMatchObject({state:'AWAITING_DRAW'});expect(requests[0].accessMethod).toBeFalsy();
  const draw={method:'manual',picks:[1]},context={facts:[{label:'cards'}]};
  const [a,b]=await Promise.all([repo.commitTarotDraw({},owner,'id',{context,draw}),repo.commitTarotDraw({},owner,'id',{context:{facts:[]},draw:{method:'auto',picks:[2]}})]);
  expect(a.snapshot.tarotDraw).toEqual(draw);expect(b.snapshot.tarotDraw).toEqual(draw);
  expect(requests[0]).toMatchObject({state:'CREATED',snapshot:{tarotDraw:draw,analysis:{contexts:{tarot:context}}}});
  await expect(repo.commitTarotDraw({},other,'id',{context,draw})).rejects.toMatchObject({status:404});
});

test('Family confirmed terminal failure with no chapter restores quota, but a partial result does not',async()=>{
  requests.push({_id:'empty',userId:owner,...values,state:'GENERATING',accessMethod:'FAMILY',passEvidenceId:'507f1f77bcf86cd799439099',passCycleKey:'cycle',passCoinCost:10,completedChapters:0,chapters:[],leaseToken:'lease'});
  evidences.push({_id:'507f1f77bcf86cd799439099',userId:owner,featureKey:values.featureKey,metadata:{requestId:'empty',accessMethod:'FAMILY'}});
  refundPass.mockResolvedValue({refunded:true});
  await repo.failChapter({},owner,'empty','lease','GENERATION_REVIEW_REQUIRED',1,'provider');
  expect(refundPass).toHaveBeenCalledWith(expect.objectContaining({cycleKey:'cycle',cost:10,refundId:'yeongnyangi:empty'}));
  expect(requests[0]).toMatchObject({state:'REFUNDED',errorCode:'PASS_QUOTA_RESTORED'});
  requests.push({_id:'partial',userId:owner,...values,state:'GENERATING',accessMethod:'FAMILY',passEvidenceId:'507f1f77bcf86cd799439098',passCycleKey:'cycle',passCoinCost:10,completedChapters:1,chapters:[{}],leaseToken:'lease2'});
  await repo.failChapter({},owner,'partial','lease2','GENERATION_REVIEW_REQUIRED',1,'provider');
  expect(refundPass).toHaveBeenCalledTimes(1);
  expect(requests[1].state).toBe('FORTUNE_FAILED');
});
test('same intent is restored; altered payload conflicts',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.createRequest({},owner,'id',values);
  expect(requests).toHaveLength(1);
  await expect(repo.createRequest({},owner,'id',{...values,fingerprint:'changed'})).rejects.toMatchObject({status:409});
});
test('another owner cannot read or activate a request',async()=>{
  await repo.createRequest({},owner,'id',values);
  await expect(repo.readRequest({},other,'id')).rejects.toMatchObject({status:404});
  await expect(repo.attachPayment({},other,'id',1000)).rejects.toMatchObject({status:404});
});
test.each(['pending','failed','refunded'])('payment %s never creates access',async status=>{
  payments[0].status=status;await repo.createRequest({},owner,'id',values);
  await expect(repo.attachPayment({},owner,'id',1000)).rejects.toMatchObject({status:402});
});
test('foreign or wrong amount proof never creates access',async()=>{
  await repo.createRequest({},owner,'id',values);payments[0].userId=other;
  await expect(repo.attachPayment({},owner,'id',1000)).rejects.toMatchObject({status:402});
  payments[0].userId=owner;payments[0].paymentAmount=1;
  await expect(repo.attachPayment({},owner,'id',1000)).rejects.toMatchObject({status:402});
});

test('verified discounted cash plus reserved stones attaches once at the original consultation price',async()=>{
  await repo.createRequest({},owner,'id',{...values,amountKRW:9900});
  Object.assign(payments[0],{paymentAmount:4900,pricingSnapshot:{moonstoneDiscount:{listPriceKRW:9900,discountKRW:5000,quantity:500}},metadata:{moonstoneDiscountReserved:true}});
  expect((await repo.attachPayment({},owner,'id',9900)).accessMethod).toBe('DIRECT_KRW');
  expect((await repo.attachPayment({},owner,'id',9900)).paymentId).toBe('pay1');
  expect(consumePass).not.toHaveBeenCalled();
});

test.each(['missing-reservation','released','wrong-sum','unpaid'])('discount proof %s cannot open a consultation',async kind=>{
  await repo.createRequest({},owner,'id',{...values,amountKRW:9900});
  Object.assign(payments[0],{paymentAmount:4900,pricingSnapshot:{moonstoneDiscount:{listPriceKRW:9900,discountKRW:5000,quantity:500}},metadata:{moonstoneDiscountReserved:true}});
  if(kind==='missing-reservation')delete payments[0].metadata.moonstoneDiscountReserved;
  if(kind==='released')payments[0].metadata.moonstoneDiscountReleasedAt=new Date();
  if(kind==='wrong-sum')payments[0].paymentAmount=1;
  if(kind==='unpaid')payments[0].status='pending';
  await expect(repo.attachPayment({},owner,'id',9900)).rejects.toMatchObject({status:402});
});
test('already paid legacy price is preserved while an unpaid stale request must confirm the new price',async()=>{
  await repo.createRequest({},owner,'id',values);
  expect((await repo.attachPayment({},owner,'id',1000,{currentAmountKRW:5000})).accessMethod).toBe('DIRECT_KRW');
  requests=[];payments=[];familyUser={_id:owner,profileSubscription:{tier:'family',passTier:'family',isActive:true}};
  await repo.createRequest({},owner,'stale',values);
  await expect(repo.attachPayment({},owner,'stale',1000,{currentAmountKRW:5000})).rejects.toMatchObject({status:409,code:'PRICE_CHANGED'});
  expect(consumePass).not.toHaveBeenCalled();
});
test('two intents cannot consume the same proof',async()=>{
  payments[0].requestId='yn-a';
  await repo.createRequest({},owner,'a',values);await repo.createRequest({},owner,'b',values);
  const result=await Promise.allSettled([repo.attachPayment({},owner,'a',1000),repo.attachPayment({},owner,'b',1000)]);
  expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  // 🔴 consumedBy 는 마지막 겹이다 — 요청 행이 새로 만들어져 paymentId 가 비어도 이미 소비된 증빙은 다시 붙지 않는다(결제 1건 = 결과 1회).
  requests=requests.filter(r=>r._id!=='a');await repo.createRequest({},owner,'a',values);
  await expect(repo.attachPayment({},owner,'a',1000)).rejects.toMatchObject({status:402});
});
test('failed request write rolls back proof consumption',async()=>{
  await repo.createRequest({},owner,'id',values);failWrite=true;
  await expect(repo.attachPayment({},owner,'id',1000)).rejects.toThrow('write failed');
  expect(payments[0].metadata.consumedBy).toBeUndefined();
  failWrite=false;expect((await repo.attachPayment({},owner,'id',1000)).state).toBe('PAID');
});
test('duplicate generation claims and late completions cannot append twice',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  const a=await repo.claimChapter({},owner,'id');const b=await repo.claimChapter({},owner,'id');
  expect(a.token).toBeTruthy();expect(b.token).toBeNull();
  await repo.finishChapter({},owner,'id',a.token,0,{summary:'first'},2);
  expect(await repo.finishChapter({},owner,'id',a.token,0,{summary:'duplicate'},2)).toBeNull();
  const next=await repo.claimChapter({},owner,'id');
  await repo.failChapter({},owner,'id',next.token,'PROVIDER_FAILED');
  expect((await repo.attachPayment({},owner,'id',1000)).state).toBe('FORTUNE_FAILED');
  expect((await repo.claimChapter({},owner,'id')).token).toBeNull();
  requests[0].nextAttemptAt=new Date(Date.now()-1);
  const retry=await repo.claimChapter({},owner,'id');
  await repo.finishChapter({},owner,'id',retry.token,1,{summary:'second'},2);
  const restored=await repo.readRequest({},owner,'id');
  expect(restored.state).toBe('COMPLETED');expect(restored.chapters).toHaveLength(2);
});

test.each([5,8,11,15,18,28])('all %i chapters finish in queue without browser calls and replay cannot regenerate',async(total)=>{
  const id='a'.repeat(64);payments[0].requestId=`yn-${id}`;
  const manifest=Array.from({length:total},(_,i)=>({id:`chapter-${i}`}));
  await repo.createRequest({},owner,id,{...values,snapshot:{manifest}});
  const pending=[id], provider=jest.fn(async ordinal=>({summary:`saved chapter ${ordinal}`}));
  const {consumeConsultationQueue}=await import('../../worker/yeongnyangi/queue.js');
  const service={activateFortune:async()=>repo.attachPayment({},owner,id,1000),generateNextChapter:async()=>{
    const {row,token}=await repo.claimChapter({},owner,id);
    if(!token)return row;
    return repo.finishChapter({},owner,id,token,row.chapters.length,await provider(row.chapters.length),total);
  }};
  const deps={service,read:async()=>repo.readRequest({},owner,id),enqueue:async(_env,row)=>{pending.push(row._id);return true;}};
  while(pending.length){const requestId=pending.shift();const message={body:{requestId},ack:jest.fn(),retry:jest.fn()};await consumeConsultationQueue({messages:[message]},{},deps);expect(message.retry).not.toHaveBeenCalled();}
  expect(provider).toHaveBeenCalledTimes(total);expect(requests[0].state).toBe('COMPLETED');expect(payments).toHaveLength(1);
  await consumeConsultationQueue({messages:[{body:{requestId:id},ack:jest.fn(),retry:jest.fn()}]},{},deps);
  expect(provider).toHaveBeenCalledTimes(total);expect((await repo.readRequest({},owner,id)).chapters).toHaveLength(total);
});

test('paid relationship snapshots and drawn cards survive failed chapter recovery on the original order',async()=>{
 const snapshot={manifest:[{id:'relationship-1'},{id:'relationship-2'}],analysis:{consultation:{consultationKind:'compatibility',relationship:{version:'relationship-v1',participants:{self:'나비',partner:'달'}}},contexts:{tarot:{facts:[{label:'cards',value:[{cardId:'M00',positionKey:'self_heart',orientation:'upright'},{cardId:'M01',positionKey:'other_heart',orientation:'reversed'}]}]}}}};
 const before=JSON.parse(JSON.stringify(snapshot));
 await repo.createRequest({},owner,'id',{...values,snapshot});
 await repo.attachPayment({},owner,'id',1000);
 const first=await repo.claimChapter({},owner,'id');
 await repo.finishChapter({},owner,'id',first.token,0,{summary:'saved relationship opening'},2);
 const failed=await repo.claimChapter({},owner,'id');
 await repo.failChapter({},owner,'id',failed.token,'PROVIDER_FAILED');
 requests[0].nextAttemptAt=new Date(Date.now()-1);
 const retry=await repo.claimChapter({},owner,'id');
 expect(retry.row.chapters[0].summary).toBe('saved relationship opening');
 await repo.finishChapter({},owner,'id',retry.token,1,{summary:'saved relationship advice'},2);
 const restored=await repo.readRequest({},owner,'id');
 expect(restored.snapshot).toEqual(before);expect(restored.state).toBe('COMPLETED');expect(payments).toHaveLength(1);
 expect((await repo.claimChapter({},owner,'id')).token).toBeNull();
});

test('three legacy chapter failures exhaust one immutable budget despite historical grants',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  await failCurrent(3,'FORTUNE_PROVIDER_FAILED');
  expect(requests[0].errorCode).toBe('AUTOMATIC_RECOVERY_STOPPED');
  await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
  await expect(repo.resumeRequest({},owner,'id')).rejects.toMatchObject({status:409});
  requests[0].manualRecoveryGrants={0:20};requests[0].systemRecoveryGrants={0:20};
  expect(repo.allowedChapterAttempts(requests[0],0)).toBe(3);
  expect(requests[0].chapterAttempts[0]).toBe(3);expect(payments).toHaveLength(1);
});

const book=total=>({...values,snapshot:{manifest:Array.from({length:total},(_,i)=>({id:`chapter-${i}`}))}});
async function saveThrough(count,total){
  for(let ordinal=requests[0].chapters.length;ordinal<count;ordinal++){
    requests[0].nextAttemptAt=null;
    const claim=await repo.claimChapter({},owner,'id','queue');
    await repo.finishChapter({},owner,'id',claim.token,ordinal,{summary:`chapter ${ordinal}`},total);
  }
}
async function failCurrent(times,code='CHAPTER_SECTION_TOO_SHORT'){
  for(let i=0;i<times;i++){
    requests[0].nextAttemptAt=null;
    const claim=await repo.claimChapter({},owner,'id','queue');
    const ordinal=claim.row.chapters.length;
    await repo.failChapter({},owner,'id',claim.token,code,requests[0].chapterAttempts[ordinal],'quality',repo.allowedChapterAttempts(requests[0],ordinal),'section:example:90/121',ordinal);
  }
}

test.each(['CHAPTER_TRUNCATED','INVALID_CHAPTER','FORTUNE_PROVIDER_RATE_LIMIT'])('versioned recovery preserves saved chapters through %s and grants two scheduled calls atomically',async code=>{
  await repo.createRequest({},owner,'id',book(3));await repo.attachPayment({},owner,'id',1000);
  await saveThrough(1,3);
  requests[0].generationCheckpoint={recoveryPolicy:deliveryVersion};
  const saved=JSON.stringify(requests[0].chapters);
  await failCurrent(3,code);
  expect(requests[0].errorCode).toBe('AUTOMATIC_RECOVERY_STOPPED');
  await Promise.all([repo.escalateStopped({},requests[0]),repo.escalateStopped({},requests[0])]);
  expect(requests[0].systemRecoveryGrants[1]).toBe(2);
  expect(repo.allowedChapterAttempts(requests[0],1)).toBe(5);
  await failCurrent(2,code);await repo.escalateStopped({},requests[0]);
  expect(requests[0].errorCode).toBe('GENERATION_REVIEW_REQUIRED');
  expect(JSON.stringify(requests[0].chapters)).toBe(saved);
  await Promise.all([repo.resumeHeldByUser({},owner,'id'),repo.resumeHeldByUser({},owner,'id')]);
  expect(requests[0].manualRecoveryGrants[1]).toBe(1);
  expect(repo.allowedChapterAttempts(requests[0],1)).toBe(6);
  await saveThrough(3,3);
  expect(requests[0].state).toBe('COMPLETED');
  expect(JSON.stringify(requests[0].chapters.slice(0,1))).toBe(saved);
  expect(requests[0].chapterAttempts).toEqual({0:1,1:6,2:1});
  expect(payments[0]).toMatchObject({status:'paid',paymentAmount:1000});
  expect(consumePass).not.toHaveBeenCalled();expect(refundPass).not.toHaveBeenCalled();
});

test('three initial, two system and three explicit attempts stop at eight under concurrent resumes',async()=>{
  await repo.createRequest({},owner,'id',book(2));await repo.attachPayment({},owner,'id',1000);
  await saveThrough(1,2);requests[0].generationCheckpoint={recoveryPolicy:deliveryVersion};
  const saved=JSON.stringify(requests[0].chapters),paymentBefore=JSON.stringify(payments[0]);
  await failCurrent(3,'FORTUNE_PROVIDER_RATE_LIMIT');
  await Promise.all([repo.escalateStopped({},requests[0]),repo.escalateStopped({},requests[0])]);
  await failCurrent(2,'FORTUNE_PROVIDER_RATE_LIMIT');
  for(let grant=1;grant<=3;grant++){
    await Promise.all([repo.resumeRequest({},owner,'id'),repo.resumeRequest({},owner,'id')]);
    expect(requests[0].manualRecoveryGrants[1]).toBe(grant);
    await failCurrent(1,'FORTUNE_PROVIDER_RATE_LIMIT');
  }
  await Promise.allSettled([repo.resumeRequest({},owner,'id'),repo.escalateStopped({},requests[0])]);
  expect(repo.allowedChapterAttempts(requests[0],1)).toBe(8);
  expect(requests[0].chapterAttempts[1]).toBe(8);
  expect(requests[0].errorCode).toBe('GENERATION_REVIEW_REQUIRED');
  expect(repo.userCanRetry(requests[0])).toBe(false);
  await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
  expect(JSON.stringify(requests[0].chapters)).toBe(saved);
  expect(JSON.stringify(payments[0])).toBe(paymentBefore);
});

test('an existing one-call system grant is topped up once without resetting attempts',async()=>{
  await repo.createRequest({},owner,'id',book(2));await repo.attachPayment({},owner,'id',1000);
  await saveThrough(1,2);requests[0].generationCheckpoint={recoveryPolicy:deliveryVersion};
  Object.assign(requests[0],{state:'FORTUNE_FAILED',errorCode:'AUTOMATIC_RECOVERY_STOPPED',chapterAttempts:{0:1,1:4},attempts:5,systemRecoveryGrants:{1:1}});
  await Promise.all([repo.escalateStopped({},requests[0]),repo.escalateStopped({},requests[0])]);
  expect(requests[0].systemRecoveryGrants[1]).toBe(2);
  expect(requests[0].chapterAttempts[1]).toBe(4);expect(requests[0].attempts).toBe(5);
  expect(repo.allowedChapterAttempts(requests[0],1)).toBe(5);
});

test('versioned completion cannot commit a missing or invalid chapter, and durable resume consumes no new attempt',async()=>{
  const manifest=[0,1].map(i=>({id:'c'+i,minimumChars:120,sections:[{id:'section'}]}));
  await repo.createRequest({},owner,'id',{...values,snapshot:{manifest,deliveryContract:deliveryVersion}});
  await repo.attachPayment({},owner,'id',1000);
  const body=i=>({chapterId:'c'+i,complete:true,deliveryVersion,blocks:[{id:'section',title:'제목',paragraphs:['검증에 충분한 본문입니다. '.repeat(20)]}]});
  const first=await repo.claimChapter({},owner,'id');
  await expect(repo.finishChapter({},owner,'id',first.token,0,{...body(0),complete:false},2)).rejects.toThrow();
  expect(requests[0].chapters).toHaveLength(0);
  await repo.saveChapterDraft({},owner,'id',first.token,0,{body:body(0)});
  requests[0].leaseUntil=new Date(0);
  const resumed=await repo.claimChapter({},owner,'id');
  expect(requests[0].chapterAttempts[0]).toBe(1);
  await repo.finishChapter({},owner,'id',resumed.token,0,body(0),2);
  expect(requests[0].state).not.toBe('COMPLETED');
  const second=await repo.claimChapter({},owner,'id');
  await repo.finishChapter({},owner,'id',second.token,1,body(1),2);
  const saved=JSON.stringify(requests[0].chapters);
  expect(requests[0].state).toBe('COMPLETED');
  expect((await repo.claimChapter({},owner,'id')).token).toBeNull();
  expect(JSON.stringify(requests[0].chapters)).toBe(saved);
});

test('a tuna book preserves nine saved chapters when the unusable tenth exhausts its budget',async()=>{
  await repo.createRequest({},owner,'id',book(15));await repo.attachPayment({},owner,'id',1000);
  await saveThrough(9,15);const saved=JSON.stringify(requests[0].chapters);
  await failCurrent(3);await repo.escalateStopped({},requests[0]);
  expect(requests[0]).toMatchObject({state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
  requests[0].hold.epoch=repo.GENERATION_FIX_EPOCH-1;
  expect(await repo.resumeHeldAfterFix({},requests[0])).toBeNull();
  expect(JSON.stringify(requests[0].chapters)).toBe(saved);expect(payments).toHaveLength(1);
});

test('buyer retries and fix epochs do not mint a new generation budget',async()=>{
  await repo.createRequest({},owner,'id',book(2));await repo.attachPayment({},owner,'id',1000);
  await failCurrent(3);await repo.escalateStopped({},requests[0]);
  for(let i=0;i<3;i++){
    expect(repo.userCanRetry(requests[0])).toBe(false);
    expect(repo.userCanRetryHold(requests[0])).toBe(false);
    await repo.resumeHeldByUser({},owner,'id');
    requests[0].hold.epoch=0;expect(await repo.resumeHeldAfterFix({},requests[0])).toBeNull();
  }
  expect(requests[0].chapterAttempts[0]).toBe(3);expect(payments).toHaveLength(1);
});

test('concurrent buyer hold retries do not change a spent ledger',async()=>{
  await repo.createRequest({},owner,'id',book(2));await repo.attachPayment({},owner,'id',1000);
  Object.assign(requests[0],{state:'FORTUNE_FAILED',chapterAttempts:{0:2},errorCode:'GENERATION_REVIEW_REQUIRED',hold:{reason:'SYSTEM_RECOVERY_EXHAUSTED',chapter:0,epoch:repo.GENERATION_FIX_EPOCH}});
  await Promise.all([repo.resumeHeldByUser({},owner,'id'),repo.resumeHeldByUser({},owner,'id')]);
  expect(requests[0].chapterAttempts).toEqual({0:2});expect(requests[0].systemRecoveryGrants?.[0]).toBeUndefined();
});

test('historical retry grants cannot reopen a spent chapter on a new fix epoch',async()=>{
  await repo.createRequest({},owner,'id',book(15));await repo.attachPayment({},owner,'id',1000);await saveThrough(9,15);
  Object.assign(requests[0],{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',attempts:27,chapterAttempts:{9:5},manualRecoveryGrants:{9:2},systemRecoveryGrants:{9:3}});
  requests[0].recoveryAudit.push({kind:'review_required',source:'user',chapter:9,code:'MANUAL_RECOVERY_LIMIT_REACHED'});
  expect(repo.canResumeAfterFix(requests[0])).toBe(false);
  expect(await Promise.all([repo.resumeHeldAfterFix({},requests[0]),repo.resumeHeldAfterFix({},requests[0])])).toEqual([null,null]);
  expect(repo.allowedChapterAttempts(requests[0],9)).toBe(3);expect(requests[0].chapters).toHaveLength(9);
});

test('holds that a fix cannot help are stamped out of the scan and never auto-resumed',async()=>{
  await repo.createRequest({},owner,'id',book(2));await repo.attachPayment({},owner,'id',1000);
  Object.assign(requests[0],{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
  requests[0].recoveryAudit.push({kind:'review_required',source:'storage_verification',chapter:1,at:new Date()});
  expect(repo.canResumeAfterFix(requests[0])).toBe(false);
  expect(requests.filter(row=>matches(row,repo.heldForFixFilter()))).toHaveLength(1);
  await repo.keepHold({},requests[0]);
  expect(requests[0].hold).toMatchObject({epoch:repo.GENERATION_FIX_EPOCH,reason:'UNKNOWN',alertPending:true});
  expect(requests.filter(row=>matches(row,repo.pendingAlertFilter()))).toHaveLength(1);
  expect(requests.filter(row=>matches(row,repo.heldForFixFilter()))).toHaveLength(0);
  expect(await repo.resumeHeldAfterFix({},requests[0])).toBeNull();
});

test.each(['refunded','cancelled','refund pending'])('a %s order is never retried or resumed by the server',async status=>{
  await repo.createRequest({},owner,'id',book(3));await repo.attachPayment({},owner,'id',1000);
  await failCurrent(2);
  const stopped={...requests[0]};
  if(status==='refund pending')payments[0].metadata.yeongnyangiRefundPending=true;else payments[0].status=status;
  if(status==='refund pending')await expect(repo.escalateStopped({},stopped)).rejects.toMatchObject({status:409});
  else expect((await repo.escalateStopped({},stopped)).state).toBe('REFUNDED');
  expect(requests[0].systemRecoveryGrants?.[0]).toBeUndefined();
  Object.assign(requests[0],{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
  requests[0].recoveryAudit.push({kind:'review_required',source:'user',chapter:0,at:new Date(),code:'MANUAL_RECOVERY_LIMIT_REACHED'});
  if(status==='refund pending')await expect(repo.resumeHeldAfterFix({},requests[0])).rejects.toMatchObject({status:409});
  else expect(await repo.resumeHeldAfterFix({},requests[0])).toBeNull();
  expect(requests[0].hold?.resumes).toBeUndefined();expect(requests[0].chapters).toHaveLength(0);
});

test('the total attempt ceiling holds the order for operators instead of spinning',async()=>{
  await repo.createRequest({},owner,'id',book(2));await repo.attachPayment({},owner,'id',1000);
  Object.assign(requests[0],{attempts:6,chapterAttempts:{0:1}});
  await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
  expect(requests[0]).toMatchObject({errorCode:'GENERATION_REVIEW_REQUIRED',hold:{reason:'ATTEMPT_LIMIT_REACHED',chapter:0,alertPending:true}});
  expect(repo.holdAutoResumes(requests[0])).toBe(false);
});

test('an alert clears only the hold it reported',async()=>{
  await repo.createRequest({},owner,'id',book(2));
  const first=new Date('2026-09-26T00:00:00Z');
  requests[0].hold={reason:'SYSTEM_RECOVERY_EXHAUSTED',alertPending:true,at:first};
  const reported={...requests[0],hold:{...requests[0].hold}};
  requests[0].hold.at=new Date('2026-09-26T01:00:00Z');
  await repo.markHoldAlerted({},reported);
  expect(requests[0].hold.alertPending).toBe(true);
  requests[0].hold.at=first;
  await repo.markHoldAlerted({},reported);
  expect(requests[0].hold).toMatchObject({alertPending:false,alertedAt:expect.any(Date)});
});

test('a rejected draft is retried within seconds under the three-attempt cap; the audit keeps the block detail',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  for(let attempt=1;attempt<=3;attempt++){
    requests[0].nextAttemptAt=null;
    const claim=await repo.claimChapter({},owner,'id');
    await repo.failChapter({},owner,'id',claim.token,'INVALID_CHAPTER_BLOCKS',attempt,'quality',undefined,'paragraph_too_long:action');
    if(attempt<3){const wait=requests[0].nextAttemptAt.getTime()-Date.now();expect(wait).toBeGreaterThan(4000);expect(wait).toBeLessThanOrEqual(5000);}
  }
  expect(requests[0]).toMatchObject({errorCode:'AUTOMATIC_RECOVERY_STOPPED',nextAttemptAt:null,lastFailure:{code:'INVALID_CHAPTER_BLOCKS',stage:'quality'}});
  expect(requests[0].recoveryAudit.at(-1)).toMatchObject({kind:'automatic_recovery_stopped',code:'INVALID_CHAPTER_BLOCKS',detail:'paragraph_too_long:action'});
});

test('a lost draft acknowledgement retries the same checkpoint without spending another chapter attempt',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  const claim=await repo.claimChapter({},owner,'id');
  const attempts=JSON.stringify(requests[0].chapterAttempts);
  const draft={raw:'original provider response',body:{summary:'original saved result'}};
  loseDraftAcknowledgement=true;
  await repo.saveChapterDraft({},owner,'id',claim.token,0,draft);
  expect(requests[0].generationCheckpoint.chapterDrafts[0]).toEqual(draft);
  expect(JSON.stringify(requests[0].chapterAttempts)).toBe(attempts);
  expect(requests[0].leaseToken).toBe(claim.token);
});

test.each(['queue','scheduled'])('a durable draft survives storage interruption via %s without a new generation reservation',async source=>{
  await repo.createRequest({},owner,'id',book(2));await repo.attachPayment({},owner,'id',1000);
  const first=await repo.claimChapter({},owner,'id',source);
  const draft={raw:'provider raw',body:{summary:'saved local edit'}};
  await repo.saveChapterDraft({},owner,'id',first.token,0,draft);
  requests[0].leaseUntil=new Date(0);
  const resumed=await repo.claimChapter({},owner,'id',source);
  expect(resumed.token).toBeTruthy();expect(resumed.row.chapterAttempts[0]).toBe(1);
  expect(resumed.row.generationCheckpoint.chapterDrafts[0]).toEqual(draft);
  await repo.finishChapter({},owner,'id',resumed.token,0,draft.body,2);await saveThrough(2,2);
  expect(requests[0].state).toBe('COMPLETED');expect(payments).toHaveLength(1);
});

test('the last allowed attempt keeps its active lease until it finishes',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  requests[0].chapterAttempts={0:1};requests[0].attempts=1;
  const last=await repo.claimChapter({},owner,'id');
  const duplicate=await repo.claimChapter({},owner,'id');
  expect(duplicate.token).toBeNull();expect(requests[0].state).toBe('GENERATING');
  expect(requests[0].leaseToken).toBe(last.token);expect(requests[0].errorCode).toBe('');
});

test('expired final lease can finalize a saved checkpoint without another provider claim',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  requests[0].snapshot={manifest:[{}]};const claim=await repo.claimChapter({},owner,'id');
  failFinalRead=true;await expect(repo.finishChapter({},owner,'id',claim.token,0,{summary:'stored'},1)).rejects.toThrow();
  requests[0].leaseUntil=new Date(Date.now()-1);
  const resumed=await repo.claimChapter({},owner,'id');expect(resumed.token).toBeNull();expect(resumed.row.state).toBe('COMPLETED');expect(resumed.row.attempts).toBe(1);
});

test('duplicate explicit recovery cannot reopen an exhausted paid request',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  Object.assign(requests[0],{errorCode:'AUTOMATIC_RECOVERY_STOPPED',state:'FORTUNE_FAILED',attempts:2,chapterAttempts:{0:2}});
  await Promise.allSettled([repo.resumeRequest({},owner,'id'),repo.resumeRequest({},owner,'id')]);
  expect(requests[0]).toMatchObject({state:'FORTUNE_FAILED',paymentId:'pay1',attempts:2});
  expect(requests[0].manualRecoveryGrants[0]).toBeUndefined();expect(payments).toHaveLength(1);
});

test('refund after final checkpoint but before completion cannot expose a completed result',async()=>{
  await repo.createRequest({},owner,'id',{...values,snapshot:{manifest:[{}]}});await repo.attachPayment({},owner,'id',1000);
  const claim=await repo.claimChapter({},owner,'id','queue');refundBeforeFinalization=true;
  const result=await repo.finishChapter({},owner,'id',claim.token,0,{summary:'durable'},1);
  expect(result).toMatchObject({state:'REFUNDED',errorCode:'PAYMENT_NOT_ACTIVE'});
  expect(requests[0].chapters).toEqual([{summary:'durable'}]);expect(requests[0].state).not.toBe('COMPLETED');
});

test.each(['reread','completion'])('last checkpoint survives %s failure and completes without another provider claim',async fault=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  const claim=await repo.claimChapter({},owner,'id');
  // Use a one-chapter manifest to exercise the exact final checkpoint order.
  requests[0].snapshot={...requests[0].snapshot,manifest:[{}]};
  if(fault==='reread')failFinalRead=true;else failFinalComplete=true;
  await expect(repo.finishChapter({},owner,'id',claim.token,0,{summary:'durable'},1)).rejects.toThrow();
  expect(requests[0]).toMatchObject({state:'GENERATING',completedChapters:1});expect(requests[0].chapters).toEqual([{summary:'durable'}]);
  await repo.failChapter({},owner,'id',claim.token,'RESULT_STORAGE_UNAVAILABLE');
  const resumed=await repo.claimChapter({},owner,'id');
  expect(resumed.token).toBeNull();expect(resumed.row.state).toBe('COMPLETED');expect(resumed.row.chapters).toEqual([{summary:'durable'}]);
});

test('a paid order for another consultation never unlocks this request',async()=>{
  await repo.createRequest({},owner,'id',values);
  payments[0].requestId='yn-another';
  await expect(repo.attachPayment({},owner,'id',1000)).rejects.toMatchObject({status:402});
  expect(payments[0].metadata.consumedBy).toBeUndefined();
});
test('a refund after activation stops further generation',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  payments[0].status='refunded';
  await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
  expect((await repo.readRequest({},owner,'id')).state).toBe('REFUNDED');
});

test.each(['refunded','cancelled'])('refund %s during generation prevents the final chapter commit',async status=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  const claim=await repo.claimChapter({},owner,'id');
  payments[0].status=status;
  expect(await repo.finishChapter({},owner,'id',claim.token,0,{summary:'late'},1)).toBeNull();
  await repo.failChapter({},owner,'id',claim.token,'GENERATION_LEASE_LOST');
  const row=await repo.readRequest({},owner,'id');
  expect(row.state).toBe('REFUNDED');expect(row.chapters).toHaveLength(0);
});

test('refund in progress suspends generation without discarding earlier chapters',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  const first=await repo.claimChapter({},owner,'id');
  await repo.finishChapter({},owner,'id',first.token,0,{summary:'saved'},2);
  const next=await repo.claimChapter({},owner,'id');
  payments[0].metadata.yeongnyangiRefundPending=true;
  expect(await repo.finishChapter({},owner,'id',next.token,1,{summary:'late'},2)).toBeNull();
  expect(requests[0].state).toBe('FORTUNE_FAILED');expect(requests[0].chapters).toHaveLength(1);
  await expect(repo.readRequest({},owner,'id')).rejects.toMatchObject({status:409});
  await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
});

test('stored-only claim with no draft preserves the entire generation budget',async()=>{
  await repo.createRequest({},owner,'id',book(1));await repo.attachPayment({},owner,'id',1000);
  await expect(repo.claimChapter({},owner,'id','scheduled',{storedOnly:true})).rejects.toMatchObject({code:'LLM_NOT_CONFIGURED'});
  expect(requests[0].attempts).toBe(0);expect(requests[0].chapterAttempts?.[0]).toBeUndefined();
});
test('concurrent stored-only recovery has one lease and keeps attempt two unchanged',async()=>{
  await repo.createRequest({},owner,'id',book(1));await repo.attachPayment({},owner,'id',1000);
  requests[0].attempts=2;requests[0].chapterAttempts={0:2};
  const body={summary:'durable paid result'};
  requests[0].generationCheckpoint={chapterDrafts:{0:{raw:'raw',body}}};
  const claims=await Promise.all([repo.claimChapter({},owner,'id','scheduled',{storedOnly:true}),repo.claimChapter({},owner,'id','scheduled',{storedOnly:true})]);
  expect(claims.filter(claim=>claim.token)).toHaveLength(1);
  expect(requests[0].attempts).toBe(2);expect(requests[0].chapterAttempts[0]).toBe(2);
  const claim=claims.find(claim=>claim.token);
  await repo.finishChapter({},owner,'id',claim.token,0,body,1);
  expect((await repo.readRequest({},owner,'id')).state).toBe('COMPLETED');
});
test('stored-only claim CAS rejects a draft removed after its read without consuming an attempt',async()=>{
  await repo.createRequest({},owner,'id',book(1));await repo.attachPayment({},owner,'id',1000);
  requests[0].attempts=2;requests[0].chapterAttempts={0:2};
  requests[0].generationCheckpoint={chapterDrafts:{0:{raw:'raw',body:{summary:'saved'}}}};
  loseStoredDraftAtClaim=true;
  const claim=await repo.claimChapter({},owner,'id','scheduled',{storedOnly:true});
  expect(claim.token).toBeNull();expect(requests[0].attempts).toBe(2);expect(requests[0].state).toBe('PAID');
});
test('stored-only completion keeps the existing paid proof and does not claim another attempt',async()=>{
  await repo.createRequest({},owner,'id',book(1));await repo.attachPayment({},owner,'id',1000);
  const claim=await repo.claimChapter({},owner,'id');
  failFinalRead=true;
  await expect(repo.finishChapter({},owner,'id',claim.token,0,{summary:'stored'},1)).rejects.toThrow();
  requests[0].leaseUntil=new Date(0);
  const restored=await repo.claimChapter({},owner,'id','scheduled',{storedOnly:true});
  expect(restored.token).toBeNull();expect(restored.row.state).toBe('COMPLETED');expect(restored.row.attempts).toBe(1);
});

describe('fortune-chat per-use access',()=>{
  test.each([['mackerel',3000],['salmon',9000],['flounder',15000],['tuna',30000]])('tier %s pins its own paid evidence and amount',async(fish,amount)=>{
    const featureKey='fortune-chat-question-'+fish;
    payments.push({_id:'pay-tier',requestId:'fc-id',userId:owner,featureKey,status:'paid',metadata:{}});
    verifyPerUse.mockResolvedValue({proven:true,source:'payment',transactionId:'pay-tier'});
    await repo.createRequest({},owner,'id',{...values,productId:'chat_saju_'+fish,featureKey,amountKRW:amount,persona:'neo'});
    expect(await repo.attachPayment({},owner,'id',amount,{currentAmountKRW:amount,access:'checkout'})).toMatchObject({accessMethod:'PER_USE',perUseEvidenceId:'pay-tier',state:'PAID'});
    expect(verifyPerUse).toHaveBeenCalledWith({},{userId:owner,featureKey,coinPrice:amount/100,requestId:'fc-id',requireExisting:true});
    expect((await repo.claimChapter({},owner,'id')).token).toBeTruthy();
  });
  const chat={...values,productId:'chat_saju',featureKey:'fortune-chat-consultation',amountKRW:3000,persona:'yeoni'};
  const chatPayment={_id:'pay-fc',requestId:'fc-id',userId:owner,featureKey:chat.featureKey,status:'paid',metadata:{}};
  const passReceipt={_id:'507f1f77bcf86cd799439099',userId:owner,featureKey:chat.featureKey,kind:'deduct',metadata:{requestId:'fc-id',accessMethod:'FAMILY'}};
  const activate=(access,id='id')=>repo.attachPayment({},owner,id,3000,{currentAmountKRW:3000,...(access?{access}:{})});

  test('an existing fc- payment is pinned, generates, and a later refund stops it',async()=>{
    payments.push({...chatPayment});
    verifyPerUse.mockResolvedValue({proven:true,source:'payment',reason:'',transactionId:'pay-fc'});
    await repo.createRequest({},owner,'id',chat);
    const row=await activate();
    expect(row).toMatchObject({accessMethod:'PER_USE',perUseSource:'payment',perUseEvidenceId:'pay-fc',state:'PAID'});
    expect(row.paymentId).toBeFalsy();
    expect(verifyPerUse).toHaveBeenCalledTimes(1);
    expect(verifyPerUse).toHaveBeenCalledWith({},{userId:owner,featureKey:chat.featureKey,coinPrice:30,requestId:'fc-id',requireExisting:true});
    expect((await repo.claimChapter({},owner,'id')).token).toBeTruthy();
    expect(payments.find(p=>p._id==='pay1').metadata.consumedBy).toBeUndefined();
    payments.find(p=>p._id==='pay-fc').status='refunded';
    await expect(repo.readRequest({},owner,'id')).rejects.toMatchObject({status:409});
  });

  test('a pass is consumed once at activation and its restore record is kept; Family Yeongnyangi paths stay untouched',async()=>{
    familyUser={_id:owner,profileSubscription:{tier:'family',passTier:'family',isActive:true}};
    verifyPerUse.mockResolvedValueOnce({proven:false,source:'',reason:'NO_EXISTING_CONSUMPTION'})
      .mockImplementationOnce(async()=>{evidences.push({...passReceipt,metadata:{...passReceipt.metadata}});return {proven:true,source:'pass',reason:'',passRefund:{cycleKey:'c1',cost:30}};});
    await repo.createRequest({},owner,'id',chat);
    expect(await activate('pass')).toMatchObject({accessMethod:'PER_USE',perUseSource:'point',perUseEvidenceId:passReceipt._id,perUsePassRefund:{cycleKey:'c1',cost:30}});
    expect(verifyPerUse.mock.calls.map(([,input])=>input.requireExisting)).toEqual([true,undefined]);
    expect(consumePass).not.toHaveBeenCalled();
    expect((await activate('pass')).accessMethod).toBe('PER_USE');
    expect(verifyPerUse).toHaveBeenCalledTimes(2);
    evidences[0].metadata.refundedForServiceExecution=true;
    await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
  });

  test('card return: checkout waits for the record, then opens once, generates to the end and stays open',async()=>{
    verifyPerUse.mockImplementation(async()=>payments.some(p=>p._id==='pay-fc')
      ? {proven:true,source:'payment',reason:'',transactionId:'pay-fc'} : {proven:false,source:'',reason:'NO_RECORD'});
    await repo.createRequest({},owner,'id',chat);
    // The browser came back before the webhook stored the payment: nothing opens, nothing is spent.
    await expect(activate('checkout')).rejects.toMatchObject({status:503,code:'PAYMENT_EVIDENCE_PENDING'});
    expect(requests[0].accessMethod).toBeFalsy();
    payments.push({...chatPayment});
    const [a,b]=await Promise.all([activate('checkout'),activate('checkout')]);
    expect([a.accessMethod,b.accessMethod]).toEqual(['PER_USE','PER_USE']);
    expect(requests[0]).toMatchObject({perUseSource:'payment',perUseEvidenceId:'pay-fc'});
    for(let ordinal=0;ordinal<2;ordinal++){
      const claim=await repo.claimChapter({},owner,'id');
      await repo.finishChapter({},owner,'id',claim.token,ordinal,{summary:`saved-${ordinal}`},2);
    }
    expect(requests[0].state).toBe('COMPLETED');
    expect((await activate('checkout')).state).toBe('COMPLETED');
    expect(consumePass).not.toHaveBeenCalled();expect(accounts).toHaveLength(0);
    expect(verifyPerUse.mock.calls.every(([,input])=>input.requireExisting===true)).toBe(true);
  });

  test('a retry that finds the pass already spent rebuilds its restore record from the use record',async()=>{
    evidences.push({...passReceipt,metadata:{...passReceipt.metadata,passCycleKey:'c1',coinCost:30}});
    verifyPerUse.mockResolvedValue({proven:true,source:'pass',reason:''});
    await repo.createRequest({},owner,'id',chat);
    expect(await activate()).toMatchObject({accessMethod:'PER_USE',perUseSource:'point',perUsePassRefund:{cycleKey:'c1',cost:30}});
    expect(verifyPerUse.mock.calls.every(([,input])=>input.requireExisting===true)).toBe(true);
  });

  const failEmpty=async()=>{
    const claim=await repo.claimChapter({},owner,'id');
    await repo.failChapter({},owner,'id',claim.token,'GENERATION_REVIEW_REQUIRED',1,'quality');
  };
  test('a pass consultation that delivered nothing restores the quota once and closes the request',async()=>{
    evidences.push({...passReceipt,metadata:{...passReceipt.metadata,passCycleKey:'c1',coinCost:30}});
    verifyPerUse.mockResolvedValue({proven:true,source:'pass',reason:''});
    refundPass.mockResolvedValue({refunded:true});
    await repo.createRequest({},owner,'id',chat);
    await activate();
    await failEmpty();
    expect(refundPass).toHaveBeenCalledTimes(1);
    expect(refundPass.mock.calls[0][0]).toMatchObject({userId:owner,cycleKey:'c1',cost:30,refundId:'yeongnyangi:id',restorePass:null});
    expect(requests[0]).toMatchObject({state:'REFUNDED',errorCode:'PASS_QUOTA_RESTORED',accessMethod:'PER_USE'});
    expect(evidences[0].metadata.refundedForServiceExecution).toBe(true);
    await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
  });

  test('a pass consultation with a delivered chapter keeps the quota spent',async()=>{
    evidences.push({...passReceipt,metadata:{...passReceipt.metadata,passCycleKey:'c1',coinCost:30}});
    verifyPerUse.mockResolvedValue({proven:true,source:'pass',reason:''});
    await repo.createRequest({},owner,'id',chat);
    await activate();
    const first=await repo.claimChapter({},owner,'id');
    await repo.finishChapter({},owner,'id',first.token,0,{summary:'delivered'},2);
    await failEmpty();
    expect(refundPass).not.toHaveBeenCalled();
    expect(requests[0]).toMatchObject({state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
  });

  test('a moonlight-stone consultation that delivered nothing goes to the stone restore',async()=>{
    requests.push({_id:'id',userId:owner,...chat,state:'GENERATING',accessMethod:'PER_USE',perUseSource:'ledger',perUseEvidenceId:'ledger1',
      completedChapters:0,chapters:[],leaseToken:'lease'});
    refundMoonstone.mockResolvedValue({refunded:true});
    await repo.failChapter({},owner,'id','lease','GENERATION_REVIEW_REQUIRED',1,'provider');
    expect(refundMoonstone).toHaveBeenCalledWith({userId:owner,requestId:'id',perUse:true});
    expect(refundPass).not.toHaveBeenCalled();
  });

  test.each(['payment','admin'])('a %s consultation that delivered nothing stays for support review',async source=>{
    requests.push({_id:'id',userId:owner,...chat,state:'GENERATING',accessMethod:'PER_USE',perUseSource:source,perUseEvidenceId:'pay-fc',
      completedChapters:0,chapters:[],leaseToken:'lease'});
    await repo.failChapter({},owner,'id','lease','GENERATION_REVIEW_REQUIRED',1,'provider');
    expect(refundPass).not.toHaveBeenCalled();expect(refundMoonstone).not.toHaveBeenCalled();
    expect(requests[0]).toMatchObject({state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
  });

  test.each([
    [null,503,'PAYMENT_EVIDENCE_PENDING'],
    [false,402,'PAYMENT_REQUIRED'],
  ])('proof %s answers %s without storing access; the Yeongnyangi payment never applies',async(proven,status,code)=>{
    familyUser={_id:owner,profileSubscription:{tier:'family',passTier:'family',isActive:true}};
    verifyPerUse.mockResolvedValue({proven,source:'',reason:'NO_RECORD'});
    await repo.createRequest({},owner,'id',chat);
    const error=await activate().catch(e=>e);
    expect(error).toMatchObject({status,code});
    if(status===402)expect(error.payload).toMatchObject({paidFeatureKey:chat.featureKey,paymentRequestId:'fc-id'});
    expect(requests[0].accessMethod).toBeFalsy();
    expect(payments.find(p=>p._id==='pay1').metadata.consumedBy).toBeUndefined();
    expect(consumePass).not.toHaveBeenCalled();
  });

  test('proof without a readable durable record stays retryable and grants nothing',async()=>{
    verifyPerUse.mockResolvedValue({proven:true,source:'payment',reason:'',transactionId:'pay-missing'});
    await repo.createRequest({},owner,'id',chat);
    await expect(activate()).rejects.toMatchObject({status:503,code:'PAYMENT_EVIDENCE_PENDING'});
    expect(requests[0].accessMethod).toBeFalsy();
  });

  test('a changed chat price is confirmed before any proof is read',async()=>{
    await repo.createRequest({},owner,'id',chat);
    await expect(repo.attachPayment({},owner,'id',3000,{currentAmountKRW:5000})).rejects.toMatchObject({status:409,code:'PRICE_CHANGED'});
    expect(verifyPerUse).not.toHaveBeenCalled();
  });

  const nothingYet=()=>verifyPerUse.mockResolvedValue({proven:false,source:'',reason:'NO_EXISTING_CONSUMPTION'});
  const onlyExistingChecks=()=>verifyPerUse.mock.calls.every(([,input])=>input.requireExisting===true);

  test('without the pass choice nothing is spent: no choice asks for payment, checkout waits for its record',async()=>{
    familyUser={_id:owner,profileSubscription:{tier:'family',passTier:'family',isActive:true}};
    nothingYet();
    await repo.createRequest({},owner,'id',chat);
    await expect(activate()).rejects.toMatchObject({status:402,code:'PAYMENT_REQUIRED'});
    await expect(activate('checkout')).rejects.toMatchObject({status:503,code:'PAYMENT_EVIDENCE_PENDING'});
    expect(onlyExistingChecks()).toBe(true);
    expect(requests[0].accessMethod).toBeFalsy();
    expect(accounts).toHaveLength(0);
  });

  test.each(['pass'])('an open card payment window for the consultation blocks spending by %s',async access=>{
    payments.push({_id:'pay-open',requestId:'fc-id',userId:owner,featureKey:chat.featureKey,paymentType:'digital_content',status:'pending',metadata:{}});
    nothingYet();
    await repo.createRequest({},owner,'id',chat);
    await expect(activate(access)).rejects.toMatchObject({status:409,code:'PG_PAYMENT_NOT_PAID'});
    expect(onlyExistingChecks()).toBe(true);
    expect(accounts[0]?.freeUsed || 0).toBe(0);
    expect(requests[0].accessMethod).toBeFalsy();
  });

  // Card prepare reserves the consultation before its order is written; the open-checkout read sees nothing yet.
  test.each(['pass'])('a card window reserved before its order is visible still blocks %s',async access=>{
    nothingYet();
    await repo.createRequest({},owner,'id',chat);
    requests[0].paymentClaimOrderId='card:fc-id';
    await expect(activate(access)).rejects.toMatchObject({status:409,code:'PG_PAYMENT_NOT_PAID'});
    expect(onlyExistingChecks()).toBe(true);
    expect(accounts[0]?.freeUsed || 0).toBe(0);
    expect(requests[0]).toMatchObject({paymentClaimOrderId:'card:fc-id',state:'CREATED'});
    expect(requests[0].accessMethod).toBeFalsy();
  });

  test('a pass activation holds the consultation while it spends and gives it back only when nothing was spent',async()=>{
    nothingYet();
    await repo.createRequest({},owner,'id',chat);
    await expect(activate('pass')).rejects.toMatchObject({status:402,code:'PAYMENT_REQUIRED'});
    expect(requests[0].paymentClaimOrderId).toBe('');
    verifyPerUse.mockReset();
    verifyPerUse.mockResolvedValueOnce({proven:false,source:'',reason:'NO_EXISTING_CONSUMPTION'}).mockResolvedValueOnce({proven:null});
    await expect(activate('pass')).rejects.toMatchObject({status:503,code:'PAYMENT_EVIDENCE_PENDING'});
    expect(requests[0].paymentClaimOrderId).toBe('access:pass:fc-id');
    familyUser={_id:owner,profileSubscription:{tier:'family',passTier:'family',isActive:true}};
    verifyPerUse.mockReset();
    verifyPerUse.mockResolvedValueOnce({proven:false,source:'',reason:'NO_EXISTING_CONSUMPTION'})
      .mockImplementationOnce(async()=>{evidences.push({...passReceipt,metadata:{...passReceipt.metadata}});return {proven:true,source:'pass',reason:'',passRefund:{cycleKey:'c1',cost:30}};});
    expect(await activate('pass')).toMatchObject({accessMethod:'PER_USE',paymentClaimOrderId:'access:pass:fc-id'});
  });

  test('historical free evidence resumes only its original request',async()=>{
    nothingYet();
    await repo.createRequest({},owner,'id',chat);
    accounts.push({userId:owner,freeLimit:1,freeUsed:1,reserved:0,trialRequestIds:['fc-id']});
    expect(await activate('free_trial')).toMatchObject({accessMethod:'ACCOUNT_FREE_TRIAL',state:'PAID'});
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({freeUsed:1,reserved:0,trialRequestIds:['fc-id']});
    // The access write was lost: a retry without a choice finds the use this request already spent.
    requests[0].accessMethod=undefined;requests[0].state='CREATED';
    expect((await activate()).accessMethod).toBe('ACCOUNT_FREE_TRIAL');
    expect(accounts[0].freeUsed).toBe(1);
    expect(onlyExistingChecks()).toBe(true);
    expect((await repo.claimChapter({},owner,'id')).token).toBeTruthy();
    await repo.createRequest({},owner,'id2',chat);
    const error=await activate('free_trial','id2').catch(e=>e);
    expect(error).toMatchObject({status:402,code:'PAYMENT_REQUIRED'});
    expect(error.payload).toMatchObject({paidFeatureKey:chat.featureKey,paymentRequestId:'fc-id2'});
    expect(requests[1].accessMethod).toBeFalsy();
    expect(accounts[0]).toMatchObject({freeUsed:1,trialRequestIds:['fc-id']});
  });

  test('a legacy fortune-chat reservation in flight holds the same free use',async()=>{
    accounts.push({userId:owner,freeLimit:3,freeUsed:0,reserved:1});
    nothingYet();
    await repo.createRequest({},owner,'id',chat);
    await expect(activate('free_trial')).rejects.toMatchObject({status:402,code:'PAYMENT_REQUIRED'});
    expect(accounts[0]).toMatchObject({freeUsed:0,reserved:1});
    expect(accounts[0].trialRequestIds).toBeUndefined();
  });

  test('a free consultation that delivered nothing gives the free use back exactly once',async()=>{
    nothingYet();
    await repo.createRequest({},owner,'id',chat);
    accounts.push({userId:owner,freeLimit:1,freeUsed:1,reserved:0,trialRequestIds:['fc-id']});
    await activate('free_trial');
    const claim=await repo.claimChapter({},owner,'id');
    await repo.failChapter({},owner,'id',claim.token,'GENERATION_REVIEW_REQUIRED',1,'quality');
    expect(requests[0]).toMatchObject({state:'REFUNDED',errorCode:'FREE_TRIAL_RESTORED'});
    expect(accounts[0]).toMatchObject({freeUsed:0,trialRequestIds:[]});
    await repo.failChapter({},owner,'id',claim.token,'GENERATION_REVIEW_REQUIRED',1,'quality');
    expect(accounts[0].freeUsed).toBe(0);
    await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
    await repo.createRequest({},owner,'id2',chat);
    await expect(activate('free_trial','id2')).rejects.toMatchObject({status:402,code:'PAYMENT_REQUIRED'});
    expect(accounts[0]).toMatchObject({freeUsed:0,trialRequestIds:[]});
  });

  test('a free consultation that delivered a chapter keeps the free use spent',async()=>{
    nothingYet();
    await repo.createRequest({},owner,'id',chat);
    accounts.push({userId:owner,freeLimit:1,freeUsed:1,reserved:0,trialRequestIds:['fc-id']});
    await activate('free_trial');
    const first=await repo.claimChapter({},owner,'id');
    await repo.finishChapter({},owner,'id',first.token,0,{summary:'delivered'},2);
    const second=await repo.claimChapter({},owner,'id');
    await repo.failChapter({},owner,'id',second.token,'GENERATION_REVIEW_REQUIRED',1,'quality');
    expect(requests[0]).toMatchObject({state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
    expect(accounts[0]).toMatchObject({freeUsed:1,trialRequestIds:['fc-id']});
  });
});
