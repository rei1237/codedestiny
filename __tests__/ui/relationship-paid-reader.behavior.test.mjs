import test from 'node:test';
import assert from 'node:assert/strict';
import {runRelationshipReader} from '../../lib/relationship-paid-reader.js';
function harness(replies){const calls=[],saved=[],shown=[];return {calls,saved,shown,options:{active:()=>true,visible:()=>true,wait:async()=>{},persist:value=>saved.push(value),show:value=>shown.push(value),get:async()=>{calls.push('GET');return replies.shift();},post:async body=>{calls.push(body);const value=replies.shift();if(value instanceof Error)throw value;return value;}}};}
test('server-only partial recovery continues the same session and preserves paid evidence on storage failure',async()=>{
 const h=harness([{status:202,data:{sessionId:'same',resumeBody:{resumeSessionId:'same'},sections:[]}},{status:503,data:{retryable:true}},{status:200,data:{ok:true,sessionId:'same',sections:[]}}]);
 assert.equal(await runRelationshipReader(null,h.options),true);assert.deepEqual(h.calls,['GET',{resumeSessionId:'same'},{resumeSessionId:'same'}]);assert.equal(h.shown.at(-1).status,'completed');
});
test('lost first response retries the exact original request without another payment gate',async()=>{
 const initial={idempotencyKey:'original',paymentEvidence:{paymentId:'paid'}};
 const h=harness([new Error('network'),{status:200,data:{ok:true,sessionId:'stored'}}]);assert.equal(await runRelationshipReader(initial,h.options),true);assert.equal(h.calls[0],initial);assert.equal(h.calls[1],initial);
});
test('account switch and offline state discard late work; pending cannot acknowledge payment completion',async()=>{
 const h=harness([]);let active=true;h.options.active=()=>active;h.options.post=async()=>{active=false;return {status:200,data:{ok:true,sessionId:'foreign'}};};assert.equal(await runRelationshipReader({},h.options),false);assert.equal(h.shown.length,0);
 const hidden=harness([]);hidden.options.visible=()=>false;assert.equal(await runRelationshipReader({},hidden.options),false);assert.equal(hidden.calls.length,0);
 for(const reply of [{status:403,data:{retryable:false}},{status:202,data:{sessionId:'same',resumeBody:{resumeSessionId:'same'},retryable:false}}])await assert.rejects(runRelationshipReader({},harness([reply]).options));
});
