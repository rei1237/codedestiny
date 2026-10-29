import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/order-reconciliation.js')],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline',setup(b){
 b.onLoad({filter:/worker[\\/]lib[\\/]db\.js$/},()=>({contents:"export const withMongoRetry=()=>{throw Error('unexpected DB')};"}));
 b.onLoad({filter:/worker[\\/]toss[\\/]models\.js$/},()=>({contents:'export const TossIdentity={};export const TossPurchase={};'}));
 b.onLoad({filter:/worker[\\/]toss[\\/]purchases\.js$/},()=>({contents:"export const recordTossRefund=()=>{throw Error('unexpected refund')};"}));
}}]});
const loaded=new Module(path.join(root,'toss-order-check.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {reconcileTossOrders,runTossOrderReconciliation}=loaded.exports;
const now=new Date('2026-10-08T00:00:00Z');
function fixture(rows){const finished=[],revoked=[];return {finished,revoked,store:{claim:async()=>rows.shift(),identity:async row=>row.inactive?null:{_id:'owner',ownerId:'internal'},finish:async(row,state,next)=>finished.push({id:row._id,state,next})},refund:async(identity,order)=>revoked.push({identity,order})};}
test('disabled release never touches DB or partner API',async()=>assert.deepEqual(await runTossOrderReconciliation({}),{skipped:true}));
test('only authoritative matched refunds revoke; unknown/mismatched/offline responses retain rights',async()=>{
 const rows=['refund','paid','mismatch','pending','offline'].map(_id=>({_id,sku:'same'}));const f=fixture(rows);
 const counts=await reconcileTossOrders({...f,now,lookup:async(_identity,id)=>{
  if(id==='offline')throw Error('private provider body');
  return {orderId:id,sku:id==='mismatch'?'other':'same',status:id==='refund'?'REFUNDED':id==='pending'?'ORDER_IN_PROGRESS':'PURCHASED'};
 }});
 assert.deepEqual(counts,{checked:2,refunded:1,deferred:3,inactive:0});assert.equal(f.revoked.length,1);assert.equal(f.revoked[0].order.orderId,'refund');
 assert.equal(f.finished.find(x=>x.id==='offline').next.toISOString(),'2026-10-08T00:15:00.000Z');
 assert.ok(!JSON.stringify(f.finished).includes('private provider'));
});
test('inactive users never trigger partner reads; batch cannot exceed ten orders',async()=>{
 const f=fixture(Array.from({length:20},(_,i)=>({_id:String(i),sku:'same',inactive:true})));
 const counts=await reconcileTossOrders({...f,now,limit:500,lookup:async()=>assert.fail()});
 assert.equal(counts.inactive,10);assert.equal(f.finished.length,10);assert.equal(f.revoked.length,0);
});
test('failed refund persistence is retried instead of marked verified',async()=>{
 const f=fixture([{_id:'refund',sku:'same'}]);
 const counts=await reconcileTossOrders({...f,now,lookup:async()=>({orderId:'refund',sku:'same',status:'REFUNDED'}),refund:async()=>{throw Error('transaction failed');}});
 assert.equal(counts.checked,0);assert.equal(counts.refunded,0);assert.equal(counts.deferred,1);assert.equal(f.finished[0].state,'retry');
});
