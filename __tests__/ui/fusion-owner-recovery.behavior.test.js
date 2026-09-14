const test = require('node:test');
const assert = require('node:assert/strict');
const store = import('../../lib/fusion-paid-request-store.js');
function memory() { const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}; }
test('fusion recovery isolates owners and does not expire undelivered account records',async()=>{
 const api=await store,local=memory();
 api.writeFusionPaidRequest({requestId:'a-paid',body:{birthDate:'1995-04-18'}},{local,ownerId:'a',now:1});
 assert.equal(api.readFusionPaidRequest({local,ownerId:'b',now:2}),null);
 assert.equal(api.readFusionPaidRequest({local,ownerId:'',now:2}),null);
 assert.equal(api.readFusionPaidRequest({local,ownerId:'a',now:30*86400000}).requestId,'a-paid');
 api.clearFusionPaidRequest({local,ownerId:'b'});
 assert.equal(api.readFusionPaidRequest({local,ownerId:'a'}).requestId,'a-paid');
 api.clearFusionPaidRequest({local,ownerId:'a'});
 assert.equal(api.readFusionPaidRequest({local,ownerId:'a'}),null);
});
test('fusion never assigns an unscoped legacy receipt to the next account',async()=>{
 const api=await store,local=memory(),session=memory();
 api.writeFusionPaidRequest({requestId:'unknown-owner',body:{concern:'private'}},{local,now:1});
 session.setItem(api.FUSION_PAID_REQUEST_LEGACY_KEY,'legacy');
 assert.equal(api.readFusionPaidRequest({local,session,ownerId:'new-user',now:2}),null);
 assert.ok(local.getItem(api.FUSION_PAID_REQUEST_KEY));
 assert.equal(session.getItem(api.FUSION_PAID_REQUEST_LEGACY_KEY),'legacy');
});
