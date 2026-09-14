const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('../../js/core/paid-narrative-reader.js');
function harness(replies){const calls=[],shown=[],saved=[];return {calls,shown,saved,options:{active:()=>true,visible:()=>true,wait:async()=>{},persist:value=>saved.push(value),show:value=>shown.push(value),get:async()=>{calls.push('GET');return replies.shift();},post:async value=>{calls.push(value);const reply=replies.shift();if(reply instanceof Error)throw reply;return reply;}}};}
test('partial GET is shown and storage retry uses the same saved execution',async()=>{
 const h=harness([{status:202,payload:{ok:true,resultId:'saved',resumeBody:{resumeResultId:'saved'},status:'partial'}},{status:503,payload:{retryable:true}},{status:200,payload:{ok:true,saved:true,status:'completed'}}]);
 assert.equal(await run(null,h.options),true);assert.deepEqual(h.calls,['GET',{resumeResultId:'saved'},{resumeResultId:'saved'}]);assert.deepEqual(h.shown.map(v=>v.status),['partial','completed']);
});
test('lost original response retains exact request and payment identity',async()=>{
 const original={requestId:'original',transactionId:'paid'},h=harness([new Error('lost'),{status:200,payload:{ok:true,saved:true}}]);assert.equal(await run(original,h.options),true);assert.equal(h.calls[0],original);assert.equal(h.calls[1],original);
});
test('reload waits through an existing lease with bounded polling and the same saved identity',async()=>{
 const busy={status:202,payload:{ok:true,busy:true,retryAfterMs:5000,resumeBody:{resumeResultId:'same'}}};
 const h=harness([...Array.from({length:25},()=>busy),{status:200,payload:{ok:true,saved:true}}]),waits=[];
 h.options.wait=async ms=>waits.push(ms);assert.equal(await run({resumeResultId:'same'},h.options),true);
 assert.equal(h.calls.length,26);assert.ok(h.calls.every(body=>body.resumeResultId==='same'));assert.deepEqual(waits,Array(25).fill(5000));
});
test('account switch, offline, storage not confirmed and revoked proof never complete',async()=>{
 let active=true;const h=harness([]);h.options.active=()=>active;h.options.post=async()=>{active=false;return {status:200,payload:{ok:true,saved:true}};};assert.equal(await run({},h.options),false);assert.equal(h.shown.length,0);
 const offline=harness([]);offline.options.visible=()=>false;assert.equal(await run({},offline.options),false);assert.equal(offline.calls.length,0);
 for(const reply of [{status:200,payload:{ok:true,saved:false}},{status:403,payload:{retryable:false}},{status:202,payload:{resumeBody:{resumeResultId:'same'},retryable:false}}])await assert.rejects(run({},harness([reply]).options));
});
