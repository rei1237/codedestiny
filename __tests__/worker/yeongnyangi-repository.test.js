import {jest} from '@jest/globals';
import mongoose from 'mongoose';
const owner='507f1f77bcf86cd799439011', other='507f1f77bcf86cd799439022';
let requests=[],payments=[],failWrite=false,tail=Promise.resolve();
const get=(row,key)=>key.split('.').reduce((v,k)=>v?.[k],row);
function matches(row,query) {
  return Object.entries(query).every(([key,want])=>{
    if(key==='$or') return want.some(q=>matches(row,q));
    const value=get(row,key);
    if(want && typeof want==='object' && !(want instanceof Date) && !(want instanceof mongoose.Types.ObjectId)) {
      return Object.entries(want).every(([op,target])=>{
        if(op==='$in')return target.includes(value);
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
    findOne:filter=>query(()=>source().find(row=>matches(row,filter))||null),
    findOneAndUpdate:(filter,update,options={})=>query(()=>{
      if(kind==='request'&&failWrite&&update.$set?.paymentId)throw new Error('write failed');
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
      if(row)for(const [key,value] of Object.entries(update.$set||{}))set(row,key,value);
      return {modifiedCount:row?1:0};
    }),
  };
}
const RequestModel=model(()=>requests,'request'), Payment=model(()=>payments,'payment');
const txOptions={maxCommitTimeMS:12000};
const startSession=async()=>({endSession:async()=>{},withTransaction:async(callback,options)=>{
  expect(options).toEqual(txOptions);
  const previous=tail;let release;tail=new Promise(r=>{release=r;});await previous;
  const backup=JSON.parse(JSON.stringify({requests,payments}));
  try{return await callback();}catch(error){requests=backup.requests;payments=backup.payments;throw error;}finally{release();}
}});
jest.unstable_mockModule('../../worker/lib/db.js',()=>({
  mongoose:{...mongoose,models:{YeongnyangiRequest:RequestModel},startSession},
  connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn(),mongoTransactionOptions:()=>txOptions,
  isTransientMongoError:()=>false,
}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({Payment}));
let repo;
beforeAll(async()=>{repo=await import('../../worker/yeongnyangi/repository.js');});
const values={profileId:'p1',productId:'saju_mackerel',featureKey:'yeongnyangi-saju-mackerel',amountKRW:1000,fingerprint:'fixed',snapshot:{manifest:[{},{}]}};
beforeEach(()=>{
  requests=[];payments=[{_id:'pay1',requestId:'yn-id',userId:owner,featureKey:values.featureKey,paymentType:'digital_content',status:'paid',paymentAmount:1000,metadata:{}}];
  failWrite=false;tail=Promise.resolve();
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
  const retry=await repo.claimChapter({},owner,'id');
  await repo.finishChapter({},owner,'id',retry.token,1,{summary:'second'},2);
  const restored=await repo.readRequest({},owner,'id');
  expect(restored.state).toBe('COMPLETED');expect(restored.chapters).toHaveLength(2);
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
