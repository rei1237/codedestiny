import test from 'node:test';
import assert from 'node:assert/strict';
import {teaTarotRequest,readMockTeaDraw} from './offline/tea-tarot-fixture.mjs';
import {teaModeInput} from './tea-mode-test-input.mjs';
for(const mode of ['tarot','tarotFive'])test('committed '+mode+' cards survive retries and reject changed questions/owners',async()=>{
 const state={teaDrafts:new Map()};let saves=0;
 const request=(action,input,target=state)=>teaTarotRequest(new Request('https://local.invalid',{method:'POST',body:JSON.stringify(input)}),'/canonical/fortune-tea-house/tarot/'+action,target,()=>saves++);
 const input={...teaModeInput(mode),question:'관계를 돌아보고 다음 대화를 준비하고 싶어요.'};
 assert.equal((await request('prepare',input)).status,200);assert.equal((await request('prepare',{...input,question:'다른 질문입니다.'})).status,409);
 assert.throws(()=>readMockTeaDraw(state,input),{code:'TAROT_DRAW_REQUIRED'});
 assert.equal((await request('draw',{attemptId:input.attemptId,picks:[0,0,0]})).status,400);
 const draft=(await (await request('draw',{attemptId:input.attemptId,auto:true})).json()).draft;
 assert.equal(draft.cards.length,mode==='tarot'?3:5);assert.equal(new Set(draft.cards.map(c=>c.cardId)).size,draft.cards.length);
 assert.deepEqual((await (await request('draw',{attemptId:input.attemptId,picks:[1,2,3]})).json()).draft,draft);
 assert.deepEqual(readMockTeaDraw(state,input).cards,draft.cards);
 assert.throws(()=>readMockTeaDraw(state,{...input,tarotSpread:mode==='tarot'?'five':'three'}),{code:'TAROT_PRODUCT_MISMATCH'});
 assert.throws(()=>readMockTeaDraw(state,{...input,question:'다른 질문입니다.'}),{code:'TAROT_DRAFT_CHANGED'});
 assert.equal((await request('draw',{attemptId:input.attemptId,auto:true},{teaDrafts:new Map()})).status,404);assert.equal(saves,2);
});
