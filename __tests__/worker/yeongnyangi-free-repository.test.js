import {jest} from '@jest/globals';
import mongoose from 'mongoose';

const owner='507f1f77bcf86cd799439011',other='507f1f77bcf86cd799439022';
let accounts,ledgers,readings,tail,activeOperations;
const clone=value=>value==null?value:structuredClone(value);
const same=(a,b)=>String(a)===String(b);
const get=(row,key)=>key.split('.').reduce((value,part)=>value?.[part],row);
function matches(row,filter){
  return Object.entries(filter).every(([key,want])=>{
    const value=get(row,key);
    if(want&&typeof want==='object'&&!(want instanceof Date)&&!(want instanceof mongoose.Types.ObjectId)){
      return Object.entries(want).every(([op,target])=>op==='$gte'?value>=target:op==='$lte'?value<=target:false);
    }
    return want===null?value==null:same(value,want);
  });
}
function chain(run){
  const query={select:()=>query,session:()=>query,lean:()=>Promise.resolve().then(run),then:(yes,no)=>Promise.resolve().then(run).then(yes,no)};
  return query;
}
function model(source){
  return {
    findById:id=>chain(()=>clone(source().find(row=>same(row._id,id))||null)),
    findOne:filter=>chain(()=>clone(source().find(row=>matches(row,filter))||null)),
    findOneAndUpdate:(filter,update,options={})=>chain(()=>{
      let row=source().find(item=>matches(item,filter));
      if(!row&&options.upsert){
        row={...clone(update.$setOnInsert||{}),...Object.fromEntries(Object.entries(filter).filter(([,value])=>!value||typeof value!=='object'||value instanceof mongoose.Types.ObjectId))};
        source().push(row);
      }
      if(!row)return null;
      for(const [key,value] of Object.entries(update.$inc||{}))row[key]=(row[key]||0)+value;
      for(const [key,value] of Object.entries(update.$set||{}))row[key]=clone(value);
      return clone(row);
    }),
    create:async rows=>{
      for(const row of rows){if(source().some(item=>same(item._id,row._id))){const error=new Error('duplicate');error.code=11000;throw error;}source().push(clone(row));}
      return rows;
    },
    updateOne:(filter,update)=>chain(()=>{
      const row=source().find(item=>matches(item,filter));
      if(row)for(const [key,value] of Object.entries(update.$set||{}))row[key]=clone(value);
      return {modifiedCount:row?1:0};
    }),
  };
}
const Account=model(()=>accounts),Ledger=model(()=>ledgers),Reading=model(()=>readings);
const txOptions={maxCommitTimeMS:12000};
const mongooseMock={...mongoose,startSession:async()=>({
  endSession:async()=>{},
  withTransaction:async callback=>{
    const previous=tail;let release;tail=new Promise(resolve=>{release=resolve;});await previous;
    const backup=clone({accounts,ledgers,readings});
    try{return await callback();}catch(error){accounts=backup.accounts;ledgers=backup.ledgers;readings=backup.readings;throw error;}finally{release();}
  },
})};
jest.unstable_mockModule('../../worker/lib/db.js',()=>({
  mongoose:mongooseMock,mongoTransactionOptions:()=>txOptions,
  withMongoRetry:async(_env,run)=>{activeOperations++;try{return await run();}finally{activeOperations--;}}
}));
jest.unstable_mockModule('../../worker/lib/yeongnyangi-models.js',()=>({
  YeongnyangiRequest:{},YeongnyangiAnchovyAccount:Account,YeongnyangiAnchovyLedger:Ledger,YeongnyangiFreeReading:Reading,
}));
let repo;
beforeAll(async()=>{repo=await import('../../worker/yeongnyangi/free-repository.js');});
beforeEach(()=>{accounts=[];ledgers=[];readings=[];tail=Promise.resolve();activeOperations=0;});

test('KST attendance is awarded once even under concurrent requests',async()=>{
  const at=new Date('2026-09-15T15:00:00.000Z');
  const results=await Promise.all([repo.attend({},owner,at),repo.attend({},owner,at)]);
  expect(repo.kstDay(at)).toBe('2026-09-16');
  expect(accounts).toMatchObject([{balance:1}]);expect(ledgers).toHaveLength(1);
  expect(results.filter(result=>result.awarded)).toHaveLength(1);
});

test('one anchovy unlocks all categories for the day and repeat unlock does not debit again',async()=>{
  const at=new Date('2026-09-16T03:00:00.000Z');await repo.attend({},owner,at);
  const results=await Promise.all([repo.unlockToday({},owner,at),repo.unlockToday({},owner,at)]);
  expect(accounts[0].balance).toBe(0);expect(ledgers.filter(row=>row.kind==='unlock')).toHaveLength(1);
  expect(results.filter(result=>result.newlyUnlocked)).toHaveLength(1);
  await expect(repo.requireDailyPass({},owner,at)).resolves.toMatchObject({unlocked:true});
  await expect(repo.requireDailyPass({},other,at)).rejects.toMatchObject({status:403});
});

test('insufficient balance never creates an unlock ledger or negative balance',async()=>{
  await expect(repo.unlockToday({},owner,new Date('2026-09-16T03:00:00Z'))).rejects.toMatchObject({status:409});
  expect(accounts).toHaveLength(0);expect(ledgers).toHaveLength(0);
});

test('first reading input is frozen and only the owner claim can complete it',async()=>{
  const day='2026-09-16',at=new Date('2026-09-16T03:00:00Z');
  const first=await repo.claimFreeReading({},owner,day,'basic','p1',{draft:{question:'first'}},at);
  await expect(repo.claimFreeReading({},owner,day,'basic','p2',{draft:{question:'changed'}},at)).rejects.toMatchObject({status:409});
  const second=await repo.claimFreeReading({},owner,day,'basic','p2',{draft:{question:'changed'}},new Date(at.getTime()+121000));
  expect(first.row.input.draft.question).toBe('first');expect(second.row.input.draft.question).toBe('first');
  expect(await repo.finishFreeReading({},other,first.row._id,first.claim,{title:'foreign'})).toBeNull();
  expect(await repo.finishFreeReading({},owner,first.row._id,first.claim,{title:'stale'})).toBeNull();
  const completed=await repo.finishFreeReading({},owner,first.row._id,second.claim,{title:'fixed'});
  expect(completed.result).toEqual({title:'fixed'});
  await expect(repo.readFreeResult({},owner,day,'basic')).resolves.toEqual({title:'fixed'});
  await expect(repo.readFreeResult({},other,day,'basic')).resolves.toBeNull();
});
