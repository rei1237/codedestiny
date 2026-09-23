import {jest} from '@jest/globals';
import mongoose from 'mongoose';
const owner='507f1f77bcf86cd799439011', other='507f1f77bcf86cd799439022';
let requests=[],payments=[],failWrite=false,failFinalRead=false,failFinalComplete=false,refundBeforeFinalization=false,tail=Promise.resolve(),activeOperations=0;
const get=(row,key)=>key.split('.').reduce((v,k)=>v?.[k],row);
function matches(row,query) {
  return Object.entries(query).every(([key,want])=>{
    if(key==='$or') return want.some(q=>matches(row,q));
    if(key==='$and') return want.every(q=>matches(row,q));
    const value=get(row,key);
    if(want && typeof want==='object' && !(want instanceof Date) && !(want instanceof mongoose.Types.ObjectId)) {
      return Object.entries(want).every(([op,target])=>{
        if(op==='$in')return target.includes(value);
        if(op==='$nin')return !target.includes(value);
        if(op==='$gte')return value>=target;
        if(op==='$size')return Array.isArray(value)&&value.length===target;
        if(op==='$ne')return String(value)!==String(target);
        if(op==='$exists')return (value!==undefined)===target;
        if(op==='$lte')return value<=target;
        throw new Error(`unsupported ${op}`);
      });
    }
    return want===null?value==null:String(value)===String(want);
  });
}
function set(row,key,value) {
  const keys=key.split('.');let current=row;
  for(const part of keys.slice(0,-1))current=current[part]??=( {} );
  current[keys.at(-1)]=value;
}
function query(fn) {
  const chain={session:()=>chain,select:()=>chain,lean:async()=>fn(),then:(a,b)=>Promise.resolve().then(fn).then(a,b)};
  return chain;
}
function model(source,kind) {
  return {
    findOne:filter=>query(()=>{
      if(kind==='request'&&failFinalRead&&filter.completedChapters!==undefined){failFinalRead=false;throw new Error('final reread failed');}
      if(kind==='request'&&refundBeforeFinalization&&filter.completedChapters!==undefined){refundBeforeFinalization=false;payments[0].status='refunded';}
      return source().find(row=>matches(row,filter))||null;
    }),
    findOneAndUpdate:(filter,update,options={})=>query(()=>{
      if(kind==='request'&&failWrite&&update.$set?.paymentId)throw new Error('write failed');
      if(kind==='request'&&failFinalComplete&&update.$set?.state==='COMPLETED'){failFinalComplete=false;throw new Error('completion write failed');}
      let row=source().find(row=>matches(row,filter));
      if(!row&&options.upsert){row={...filter,...update.$setOnInsert};source().push(row);}
      if(!row)return null;
      for(const [key,value] of Object.entries(update.$set||{}))set(row,key,value);
      for(const [key,value] of Object.entries(update.$inc||{}))set(row,key,(get(row,key)||0)+value);
      for(const [key,value] of Object.entries(update.$push||{}))row[key].push(value);
      return {...row,chapters:row.chapters?[...row.chapters]:undefined};
    }),
    updateOne:(filter,update)=>query(()=>{
      const row=source().find(r=>matches(r,filter));
      if(row){
        for(const [key,value] of Object.entries(update.$set||{}))set(row,key,value);
        for(const [key,value] of Object.entries(update.$push||{}))(row[key]??=[]).push(value);
      }
      return {modifiedCount:row?1:0};
    }),
  };
}
const RequestModel=model(()=>requests,'request'), Payment=model(()=>payments,'payment');
const txOptions={maxCommitTimeMS:12000};
const startSession=async()=>{
  expect(activeOperations).toBeGreaterThan(0);
  return {endSession:async()=>{expect(activeOperations).toBeGreaterThan(0);},withTransaction:async(callback,options)=>{
  expect(options).toEqual(txOptions);
  const previous=tail;let release;tail=new Promise(r=>{release=r;});await previous;
  const backup=JSON.parse(JSON.stringify({requests,payments}));
  try{return await callback();}catch(error){requests=backup.requests;payments=backup.payments;throw error;}finally{release();}
}};};
jest.unstable_mockModule('../../worker/lib/db.js',()=>({
  mongoose:{...mongoose,models:{YeongnyangiRequest:RequestModel},startSession},
  connectDb:async()=>{},withMongoRetry:async(_env,fn)=>{
    activeOperations++;try{return await fn();}finally{activeOperations--;}
  },mongoTransactionOptions:()=>txOptions,
  isTransientMongoError:()=>false,
}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({Payment}));
let repo;
beforeAll(async()=>{repo=await import('../../worker/yeongnyangi/repository.js');});
const values={profileId:'p1',productId:'saju_mackerel',featureKey:'yeongnyangi-saju-mackerel',amountKRW:1000,fingerprint:'fixed',snapshot:{manifest:[{},{}]}};
beforeEach(()=>{
  requests=[];payments=[{_id:'pay1',requestId:'yn-id',userId:owner,featureKey:values.featureKey,paymentType:'digital_content',status:'paid',paymentAmount:1000,metadata:{}}];
  failWrite=false;failFinalRead=false;failFinalComplete=false;refundBeforeFinalization=false;tail=Promise.resolve();
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
test('two intents cannot consume the same proof',async()=>{
  payments[0].requestId='yn-a';
  await repo.createRequest({},owner,'a',values);await repo.createRequest({},owner,'b',values);
  const result=await Promise.allSettled([repo.attachPayment({},owner,'a',1000),repo.attachPayment({},owner,'b',1000)]);
  expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
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

test.each([15,28])('all %i chapters finish in queue without browser calls and replay cannot regenerate',async(total)=>{
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

test('three chapter failures stop automatically; explicit resume preserves total budget and payment',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  for(let attempt=1;attempt<=3;attempt++){
    requests[0].nextAttemptAt=null;
    const claim=await repo.claimChapter({},owner,'id');
    await repo.failChapter({},owner,'id',claim.token,'FORTUNE_PROVIDER_FAILED',attempt);
    if(attempt<3)expect(requests[0].nextAttemptAt.getTime()-Date.now()).toBeGreaterThan(attempt===1?29000:119000);
  }
  expect(requests[0].errorCode).toBe('AUTOMATIC_RECOVERY_STOPPED');
  await expect(repo.claimChapter({},owner,'id')).rejects.toMatchObject({status:409});
  const resumed=await repo.resumeRequest({},owner,'id');expect(resumed.attempts).toBe(3);expect(resumed.paymentId).toBe('pay1');
  expect(resumed.chapterAttempts[0]).toBe(3);expect(resumed.manualRecoveryGrants[0]).toBe(1);expect(resumed.state).toBe('PAID');
  let claim=await repo.claimChapter({},owner,'id','queue');
  await repo.failChapter({},owner,'id',claim.token,'FORTUNE_PROVIDER_FAILED',4,'provider',4);
  expect(requests[0].errorCode).toBe('AUTOMATIC_RECOVERY_STOPPED');
  await repo.resumeRequest({},owner,'id');expect(requests[0].manualRecoveryGrants[0]).toBe(2);
  claim=await repo.claimChapter({},owner,'id','queue');
  await repo.failChapter({},owner,'id',claim.token,'FORTUNE_PROVIDER_FAILED',5,'provider',5);
  await expect(repo.resumeRequest({},owner,'id')).rejects.toMatchObject({status:409,payload:{code:'GENERATION_REVIEW_REQUIRED'}});
  expect(requests[0]).toMatchObject({attempts:5,state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
});

test('expired final lease can finalize a saved checkpoint without another provider claim',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  requests[0].snapshot={manifest:[{}]};const claim=await repo.claimChapter({},owner,'id');
  failFinalRead=true;await expect(repo.finishChapter({},owner,'id',claim.token,0,{summary:'stored'},1)).rejects.toThrow();
  requests[0].leaseUntil=new Date(Date.now()-1);
  const resumed=await repo.claimChapter({},owner,'id');expect(resumed.token).toBeNull();expect(resumed.row.state).toBe('COMPLETED');expect(resumed.row.attempts).toBe(1);
});

test('duplicate explicit recovery returns the same paid request without losing the response',async()=>{
  await repo.createRequest({},owner,'id',values);await repo.attachPayment({},owner,'id',1000);
  requests[0].errorCode='AUTOMATIC_RECOVERY_STOPPED';requests[0].state='FORTUNE_FAILED';requests[0].attempts=3;
  const rows=await Promise.all([repo.resumeRequest({},owner,'id'),repo.resumeRequest({},owner,'id')]);
  for(const row of rows){expect(row.state).toBe('PAID');expect(row.paymentId).toBe('pay1');expect(row.attempts).toBe(3);}
  expect(requests[0].manualRecoveryGrants[0]).toBe(1);
  expect(requests[0].recoveryAudit.filter(event=>event.kind==='manual_retry_requested')).toHaveLength(1);
  expect(payments).toHaveLength(1);
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
