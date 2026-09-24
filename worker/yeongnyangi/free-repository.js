import {mongoose,mongoTransactionOptions,withMongoRetry} from '../lib/db.js';
import {createHttpError} from '../lib/http.js';
import {YeongnyangiAnchovyAccount,YeongnyangiAnchovyLedger,YeongnyangiFreeReading} from '../lib/yeongnyangi-models.js';
import {ownerId} from './repository.js';
import {scopeConnection} from '../lib/db-scope-connection.js';

const failure=(status,code)=>createHttpError(status,code,{code});
export const kstDay=(now=new Date())=>new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
const ledgerId=(owner,day,kind)=>`${owner.toString()}:${day}:${kind}`;

export async function attendanceStatus(env,userId,now=new Date()) {
  const owner=ownerId(userId),day=kstDay(now);
  const [account,attendance,unlock]=await withMongoRetry(env,()=>Promise.all([
    YeongnyangiAnchovyAccount.findById(owner).select('balance').lean(),
    YeongnyangiAnchovyLedger.findById(ledgerId(owner,day,'attendance')).select('_id').lean(),
    YeongnyangiAnchovyLedger.findById(ledgerId(owner,day,'unlock')).select('_id').lean(),
  ]));
  return {day,balance:Number(account?.balance||0),attended:Boolean(attendance),unlocked:Boolean(unlock)};
}

function isDuplicate(error){return Number(error?.code)===11000;}

export async function attend(env,userId,now=new Date()) {
  const owner=ownerId(userId),day=kstDay(now),_id=ledgerId(owner,day,'attendance');
  let awarded=false;
  try{
    await withMongoRetry(env,async()=>{
      const session=await (scopeConnection()||mongoose).startSession();
      try{await session.withTransaction(async()=>{
        if(await YeongnyangiAnchovyLedger.findById(_id).session(session).lean())return;
        await YeongnyangiAnchovyLedger.create([{_id,userId:owner,day,kind:'attendance',amount:1}],{session});
        await YeongnyangiAnchovyAccount.findOneAndUpdate({_id:owner},{$inc:{balance:1}},
          {upsert:true,new:true,setDefaultsOnInsert:true,session}).lean();
        awarded=true;
      },mongoTransactionOptions(env));}finally{await session.endSession();}
    });
  }catch(error){if(!isDuplicate(error))throw error;}
  return {...await attendanceStatus(env,userId,now),awarded};
}

export async function unlockToday(env,userId,now=new Date()) {
  const owner=ownerId(userId),day=kstDay(now),_id=ledgerId(owner,day,'unlock');
  let newlyUnlocked=false;
  try{
    await withMongoRetry(env,async()=>{
      const session=await (scopeConnection()||mongoose).startSession();
      try{await session.withTransaction(async()=>{
        if(await YeongnyangiAnchovyLedger.findById(_id).session(session).lean())return;
        const account=await YeongnyangiAnchovyAccount.findOneAndUpdate({_id:owner,balance:{$gte:1}},{$inc:{balance:-1}},
          {new:true,session}).lean();
        if(!account)throw failure(409,'ANCHOVY_REQUIRED');
        await YeongnyangiAnchovyLedger.create([{_id,userId:owner,day,kind:'unlock',amount:-1}],{session});
        newlyUnlocked=true;
      },mongoTransactionOptions(env));}finally{await session.endSession();}
    });
  }catch(error){if(!isDuplicate(error))throw error;}
  const state=await attendanceStatus(env,userId,now);
  if(!state.unlocked)throw failure(409,'ANCHOVY_REQUIRED');
  return {...state,newlyUnlocked};
}

export async function requireDailyPass(env,userId,now=new Date()) {
  const state=await attendanceStatus(env,userId,now);
  if(!state.unlocked)throw failure(403,'DAILY_PASS_REQUIRED');
  return state;
}

export async function readFreeResult(env,userId,day,category) {
  const id=await freeReadingId(userId,day,category);
  const row=await withMongoRetry(env,()=>YeongnyangiFreeReading.findOne({_id:id,userId:ownerId(userId),day,category}).lean());
  return row?.result||null;
}

export async function freeReadingId(userId,day,category) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${userId}:${day}:${category}`));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

export async function claimFreeReading(env,userId,day,category,profileId,input,now=new Date()) {
  const _id=await freeReadingId(userId,day,category),owner=ownerId(userId),claim=crypto.randomUUID();
  const filter={_id,userId:owner,day,category};
  let row;
  try{
    row=await withMongoRetry(env,()=>YeongnyangiFreeReading.findOneAndUpdate(filter,
      {$setOnInsert:{...filter,profileId:profileId||'',input,result:null,claim,leaseUntil:new Date(now.getTime()+120000)}},
      {upsert:true,new:true,setDefaultsOnInsert:true}).lean());
  }catch(error){
    if(Number(error?.code)!==11000)throw error;
    row=await withMongoRetry(env,()=>YeongnyangiFreeReading.findOne(filter).lean());
  }
  if(row?.result)return {row,claim:null};
  if(row?.claim===claim)return {row,claim};
  const taken=await withMongoRetry(env,()=>YeongnyangiFreeReading.findOneAndUpdate({...filter,result:null,leaseUntil:{$lte:now}},
    {$set:{claim,leaseUntil:new Date(now.getTime()+120000)}},{new:true}).lean());
  if(!taken)throw failure(409,'FREE_READING_PENDING');
  return {row:taken,claim};
}

export async function finishFreeReading(env,userId,id,claim,result) {
  return withMongoRetry(env,()=>YeongnyangiFreeReading.findOneAndUpdate({_id:id,userId:ownerId(userId),claim,result:null},
    {$set:{result,claim:'',leaseUntil:null}},{new:true}).lean());
}

export async function releaseFreeReading(env,userId,id,claim) {
  return withMongoRetry(env,()=>YeongnyangiFreeReading.updateOne({_id:id,userId:ownerId(userId),claim,result:null},
    {$set:{claim:'',leaseUntil:new Date(0)}}));
}
