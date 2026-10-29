import test from 'node:test';
import assert from 'node:assert/strict';
import {LIBRARY_PAGE_SIZE,libraryFilter,libraryPage} from '../../../worker/toss/library.js';
const date=new Date('2026-10-08T00:00:00.000Z');
const row=index=>({_id:`01900000-1111-7111-8111-${String(index).padStart(12,'0')}`,identityId:'owner',environment:'DEFAULT',productId:'saju_mackerel',serviceId:'yeongnyangi',requestId:'saved',status:'PURCHASED',grantedAt:date});
const saved={productId:'saju_mackerel',state:'COMPLETED',chapters:[{}],snapshot:{manifest:[{}]}};
test('cursor preserves authenticated owner and environment with a stable date/order tie-break',async()=>{
 const rows=Array.from({length:LIBRARY_PAGE_SIZE+1},(_,i)=>row(100-i));
 const page=await libraryPage(rows,async()=>saved);
 assert.equal(page.purchases.length,50);assert.equal(page.nextCursor,`${date.toISOString()},${rows[49]._id}`);
 const filter=libraryFilter({_id:'different-owner',environment:'SANDBOX'},page.nextCursor);
 assert.equal(filter.identityId,'different-owner');assert.equal(filter.environment,'SANDBOX');
 assert.deepEqual(filter.$or,[{grantedAt:{$lt:date}},{grantedAt:date,_id:{$lt:rows[49]._id}}]);
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
