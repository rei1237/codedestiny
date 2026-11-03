import assert from 'node:assert/strict';
import test from 'node:test';
import {buildFollowupContextInput,compactFollowupHistory,compactFollowupMessages} from '../../worker/lib/followup-context.js';
import {FOLLOWUP_FEATURE_REGISTRY} from '../../worker/lib/followup-feature-registry.js';

test('older prose is compacted while the latest two exchanges and source ids stay intact',()=>{
 const exchanges=Array.from({length:5},(_,index)=>({id:`q${index}`,question:`질문 ${index} `+'가'.repeat(800),reply:{kind:'answer',text:`답변 ${index} `+'나'.repeat(3000),sources:[`fact.${index}`]}}));
 const rows=compactFollowupHistory(exchanges,{maxChars:12000,recent:2});
 assert.equal(rows.at(-1).compacted,false);assert.equal(rows.at(-2).compacted,false);
 assert.equal(rows.at(-1).text.length,3005);assert.deepEqual(rows[0].sources,['fact.0']);
 assert.ok(rows.slice(0,-2).every(row=>row.compacted&&row.text.length<600));
});

test('message compaction retains role order and context budget fails closed',()=>{
 const messages=Array.from({length:12},(_,index)=>({role:index%2?'assistant':'user',content:'문장 '.repeat(1000)}));
 const compacted=compactFollowupMessages(messages,{maxChars:9000,recent:2});
 assert.ok(compacted.length>=4);assert.equal(compacted.at(-2).role,'user');assert.equal(compacted.at(-1).role,'assistant');
 assert.equal(buildFollowupContextInput({large:'x'.repeat(51000)}).requiresContinuation,true);
 assert.equal(buildFollowupContextInput({small:'x'.repeat(1000)}).requiresContinuation,false);
});

test('every deployed follow-up surface declares empathy and context behavior',()=>{
 const ids=FOLLOWUP_FEATURE_REGISTRY.map(row=>row.id);
 assert.deepEqual(ids,['yeongnyangi','fortune-chat','love-secret','karma-destiny','fortune-tea-house','neo-operation-room']);
 assert.ok(FOLLOWUP_FEATURE_REGISTRY.every(row=>row.prompt&&row.context&&row.route&&row.source));
});
