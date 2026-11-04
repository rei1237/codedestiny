import test from 'node:test';
import assert from 'node:assert/strict';
import {LIBRARY_PAGE_SIZE,libraryFilter,libraryPage as realLibraryPage} from '../../../worker/toss/library.js';
import {TossError} from '../../../worker/toss/policy.js';
const libraryPage=(rows,read,readTarot,readNative)=>realLibraryPage(rows,read,readTarot,readNative,async()=>{});
const date=new Date('2026-10-08T00:00:00.000Z');
const row=index=>({_id:`01900000-1111-7111-8111-${String(index).padStart(12,'0')}`,identityId:'owner',environment:'DEFAULT',productId:'saju_mackerel',serviceId:'yeongnyangi',requestId:'saved',approvedPriceKRW:3000,status:'PURCHASED',grantedAt:date});
const saved={_id:'saved',paymentClaimOrderId:row(1)._id,accessMethod:'TOSS_IAP',amountKRW:3000,productId:'saju_mackerel',state:'COMPLETED',chapters:[{}],snapshot:{manifest:[{}]}};
test('only the order that actually funded the matching request can expose a result',async()=>{
 for(const invalid of [{accessMethod:null},{paymentClaimOrderId:row(2)._id},{_id:'another'},{amountKRW:3001}]){
  const item=(await libraryPage([row(1)],async()=>({...saved,...invalid}))).purchases[0];
  assert.equal(item.state,'READ_FAILED');assert.equal(item.completedSections,0);
 }
 assert.equal((await libraryPage([row(1)],async()=>saved)).purchases[0].state,'COMPLETED');
});
test('cursor preserves authenticated owner and environment with a stable date/order tie-break',async()=>{
 const rows=Array.from({length:LIBRARY_PAGE_SIZE+1},(_,i)=>row(100-i));
 const page=await libraryPage(rows,async()=>saved);
 assert.equal(page.purchases.length,LIBRARY_PAGE_SIZE);assert.equal(page.nextCursor,`${date.toISOString()},${rows[LIBRARY_PAGE_SIZE-1]._id}`);
 const filter=libraryFilter({_id:'different-owner',environment:'SANDBOX'},page.nextCursor);
 assert.equal(filter.identityId,'different-owner');assert.equal(filter.environment,'SANDBOX');
 assert.deepEqual(filter.$or,[{grantedAt:{$lt:date}},{grantedAt:date,_id:{$lt:rows[LIBRARY_PAGE_SIZE-1]._id}}]);
 assert.equal((await libraryPage(rows.slice(-1),async()=>saved)).nextCursor,null);
});
test('malformed cursor cannot inject identity or Mongo operators',()=>{
 for(const cursor of ['{"$ne":null}',`${date.toISOString()},evil`,`${'x'.repeat(24)},${row(1)._id}`,{identityId:'other'}])assert.throws(()=>libraryFilter({_id:'owner',environment:'DEFAULT'},cursor));
});
test('read failure keeps paid row and cannot appear as a new unassigned consultation',async()=>{
 const page=await libraryPage([row(1)],async()=>{throw new Error('private database details');});
 assert.equal(page.purchases[0].state,'READ_FAILED');assert.equal(page.purchases[0].requestId,'saved');
 assert.ok(!JSON.stringify(page).includes('private database'));
});
test('authorization errors remain distinct for consultation, tarot and native records',async()=>{
 const denied=async()=>{throw new TossError('ACCESS_DENIED',403);};
 const expired=async()=>{throw new TossError('SESSION_EXPIRED',401);};
 for(const errorReader of [denied,expired]){
  await assert.rejects(libraryPage([row(1)],errorReader),error=>error.status===401||error.status===403);
  await assert.rejects(libraryPage([{...row(2),tarotFlowId:'tarot-mindscan'}],async()=>null,errorReader),error=>error.status===401||error.status===403);
  await assert.rejects(libraryPage([{...row(3),nativeService:'tea'}],async()=>null,async()=>null,errorReader),error=>error.status===401||error.status===403);
 }
});
test('wrong persona evidence is hidden; refunded purchases stay refunded despite a stale complete result',async()=>{
 const mismatch=await libraryPage([row(1)],async()=>({...saved,persona:'neo'}));
 assert.equal(mismatch.purchases[0].state,'READ_FAILED');assert.equal(mismatch.purchases[0].completedSections,0);
 const refund=await libraryPage([{...row(1),status:'REFUNDED'}],async()=>saved);
 assert.equal(refund.purchases[0].state,'REFUNDED');
});
test('tarot library purchase reads its paid execution and never reopens it as an unassigned consultation',async()=>{
 const tarot={...row(2),productId:'tarot-library:tarot-mindscan',tarotFlowId:'tarot-mindscan',featureKey:'tarot-mindscan',requestId:'toss-tarot:01900000-1111-7111-8111-000000000002'};
 const page=await libraryPage([tarot],async()=>assert.fail('tarot library must not read a Yeongnyangi request'),async item=>({requestId:item.requestId,status:'completed'}));
 assert.equal(page.purchases[0].serviceId,'tarot-library');
 assert.equal(page.purchases[0].selectionId,'tarot-mindscan');
 assert.equal(page.purchases[0].state,'completed');
 assert.equal(page.purchases[0].completedSections,1);
});

test('original tea records retain their native result link and never use the generic reader',async()=>{
 const native={...row(3),nativeService:'tea',serviceId:'yeoni'};
 const forbidden=async()=>assert.fail('original tea must not use another result store');
 const read=async()=>({state:'COMPLETED',href:'/fortune-tea-house/?resultId=original'});
 const result=(await libraryPage([native],forbidden,forbidden,read)).purchases[0];
 assert.equal(result.nativeService,'tea');assert.equal(result.completedSections,1);assert.equal(result.href,'/fortune-tea-house/?resultId=original');
 const failed=(await libraryPage([native],forbidden,forbidden,async()=>{throw Error('unavailable');})).purchases[0];
 assert.equal(failed.state,'READ_FAILED');assert.equal(failed.requestId,'saved');
 const refunded=(await libraryPage([{...native,status:'REFUNDED'}],forbidden,forbidden,read)).purchases[0];
 assert.equal(refunded.state,'REFUNDED');assert.equal(refunded.href,undefined);
});

test('native life-fortune retains its feature key for the original purchased title',async()=>{
 const native={...row(4),nativeService:'life-book',featureKey:'life-fortune-ai-consultation'};
 const result=(await libraryPage([native],async()=>null,async()=>null,async()=>({state:'COMPLETED',href:'/life-book-ai/result/'}))).purchases[0];
 assert.equal(result.featureKey,'life-fortune-ai-consultation');assert.equal(result.nativeService,'life-book');
});

test('missing order verifier fails closed before reading a saved result',async()=>{let reads=0;const page=await realLibraryPage([row(1)],async()=>{reads++;return saved;});assert.equal(page.purchases[0].state,'READ_FAILED');assert.equal(reads,0);});

test('partner verification is bounded while every purchased row is checked',async()=>{let active=0,max=0,calls=0;const rows=Array.from({length:20},(_,i)=>row(i));const verify=async()=>{active++;max=Math.max(max,active);calls++;await new Promise(resolve=>setTimeout(resolve,5));active--;};const page=await realLibraryPage(rows,async()=>saved,undefined,undefined,verify);assert.equal(calls,20);assert.equal(max,4);assert.equal(page.purchases.length,20);});
