const test=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../../js/core/celestial-paid-reader.js');
function harness(replies){const calls=[],saved=[],shown=[];return {calls,saved,shown,options:{active:()=>true,visible:()=>true,wait:async()=>{},persist:value=>saved.push(value),show:value=>shown.push(value),post:async body=>{calls.push(body);const value=replies.shift();if(value instanceof Error)throw value;return value;}}};}
test('partial results and storage failure resume the same server result',async()=>{
 const initial={requestId:'original',paymentId:'paid'};
 const h=harness([{status:202,data:{resumeBody:{resumeResultId:'stored'},result:{meta:{deliveryStatus:'partial'}}}},{status:503,data:{retryable:true}},{status:200,data:{ok:true,archiveSaved:true,result:{meta:{deliveryStatus:'completed'}}}}]);
 assert.equal((await run(initial,h.options)).meta.deliveryStatus,'completed');assert.equal(h.calls[0],initial);
 assert.deepEqual(h.calls.slice(1),[{resumeResultId:'stored'},{resumeResultId:'stored'}]);assert.equal(h.shown.length,1);assert.equal(h.saved.length,1);
});
test('account switch ignores late results and offline starts no new call',async()=>{
 const h=harness([]);let active=true;h.options.active=()=>active;h.options.post=async()=>{active=false;return {status:200,data:{ok:true,result:{}}};};
 await assert.rejects(run({},h.options),/ACCOUNT_CHANGED/);assert.equal(h.shown.length,0);
 const hidden=harness([]);hidden.options.visible=()=>false;await assert.rejects(run({},hidden.options),/DELIVERY_PAUSED/);assert.equal(hidden.calls.length,0);
});
test('failed save, revoked payment and exhausted provider attempts never return a completed body',async()=>{
 for(const reply of [{status:200,data:{ok:true,archiveSaved:false,result:{}}},{status:403,data:{code:'PAYMENT_REVOKED'}},{status:202,data:{retryable:false,resumeBody:{resumeResultId:'stored'},result:{}}}]){
  const h=harness([reply]);await assert.rejects(run({},h.options));assert.equal(h.calls.length,1);
 }
 const lost=harness(Array.from({length:4},()=>new Error('offline')));await assert.rejects(run({},lost.options),/offline/);assert.equal(lost.calls.length,4);
});
