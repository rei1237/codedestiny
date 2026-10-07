import '../../scripts/lib/mock-network-guard.cjs';
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__conversationTest={};
const mocks={
 'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,f)=>f();`,
 'worker/yeongnyangi/repository.js':`export const ownerId=x=>x;export const readRequest=async(e,u,id)=>{const t=globalThis.__conversationTest;if(u!==t.row.userId||id!==t.row._id)throw Error('NOT_FOUND');if(t.revoked)throw Error('PAYMENT_NOT_ACTIVE');return structuredClone(t.row);};export const YeongnyangiRequest={findOneAndUpdate:(q,update)=>({lean:async()=>{const t=globalThis.__conversationTest,c=t.row.generationCheckpoint?.conversation,rev=q['generationCheckpoint.conversation.revision'];if(q.userId!==t.row.userId||q.state!==t.row.state||(typeof rev==='number'?c?.revision!==rev:c!==undefined))return null;const after=update.$set['generationCheckpoint.conversation'];if(t.failBeforeSave&&after.exchanges.length)throw Error('STORAGE_FAILED');t.row.generationCheckpoint={conversation:structuredClone(after)};if(t.failAfterSave&&after.exchanges.length)throw Error('WRITE_RESPONSE_LOST');return structuredClone(t.row);}})};`,
 'worker/lib/gemini.js':`export const callGeminiText=async(e,input,options)=>{const t=globalThis.__conversationTest;t.sent={input:JSON.parse(input),options};t.calls++;if(t.barrier)await t.barrier;if(t.providerFailed)throw Error('PROVIDER_FAILED');return {ok:true,text:JSON.stringify(t.reply),finishReason:'STOP'};};`,
};
const bundle=await build({stdin:{contents:"export {questionConversation} from './worker/yeongnyangi/question-followup';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'isolated-paid-boundaries',setup(b){b.onLoad({filter:/worker[\\/]/},args=>{const key=Object.keys(mocks).find(k=>args.path.replaceAll('\\','/').endsWith(k));return key?{contents:mocks[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('question-storage-test.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {questionConversation}=loaded.exports;
const id='a'.repeat(64),user='owner',body={id:'11111111-1111-4111-8111-111111111111',question:'이 조언을 어떻게 표현할까?'};
beforeEach(()=>{globalThis.__conversationTest={calls:0,reply:{kind:'answer',answered:true,text:'계산된 근거를 행동으로 옮기는 답변입니다.',reason:'저장된 일간은 표현의 방식을 살펴볼 근거입니다.',action:'오늘은 부탁의 범위를 정리해서 말해 보세요.',sources:['saju.pillars']},row:{_id:id,userId:user,state:'COMPLETED',accessMethod:'FAMILY',chapters:[{summary:'저장된 기본 답변'}],snapshot:{questionContract:{version:'question-consultation-20261007',followups:1},manifest:[{version:'reading-v6',questionPolicy:'question-consultation-20261007',systems:['saju'],factSelectors:{saju:['pillars']}}],analysis:{contexts:{saju:{domain:'saju',facts:[{id:'saju.pillars',label:'pillars',value:{day:'甲子'}}],limitations:[]}}}}}};});
test('concurrent posts reserve one slot; duplicate retry returns saved answer without a call',async()=>{
 const t=globalThis.__conversationTest;let release;t.barrier=new Promise(r=>release=r);
 const first=questionConversation({},user,id,body);
 await new Promise(r=>setImmediate(r));
 await assert.rejects(questionConversation({},user,id,{...body,id:'22222222-2222-4222-8222-222222222222'}),/QUESTION_FOLLOWUP_BUSY/);
 release();await first;
 assert.equal(t.row.generationCheckpoint.conversation.used,1);
 const original=structuredClone(t.row.chapters);
 await questionConversation({},user,id,body);
 assert.equal(t.calls,1);assert.deepEqual(t.row.chapters,original);
});
test('a lost save response rereads durable answer and does not charge twice',async()=>{
 const t=globalThis.__conversationTest;t.failAfterSave=true;
 const saved=await questionConversation({},user,id,body);
 assert.equal(saved.generationCheckpoint.conversation.used,1);
 await questionConversation({},user,id,body);assert.equal(t.calls,1);
});
test('generation and storage failure retain quota; only same pending request may retry',async()=>{
 for(const failure of ['providerFailed','failBeforeSave']){
  const t=globalThis.__conversationTest;t[failure]=true;
  await assert.rejects(questionConversation({},user,id,body));
  assert.equal(t.row.generationCheckpoint.conversation.used,0);
  t[failure]=false;t.row.generationCheckpoint.conversation.pending.until=0;
  await questionConversation({},user,id,body);
  assert.equal(t.row.generationCheckpoint.conversation.used,1);
  // New iteration starts another isolated saved consultation.
  t.row.generationCheckpoint=undefined;t.calls=0;
 }
});
test('insufficient evidence and clarification are persisted without spending a question',async()=>{
 const t=globalThis.__conversationTest;
 t.reply={kind:'clarification',answered:false,text:'현재 상황 중 어느 부분을 먼저 적용할까요?',sources:[]};
 await questionConversation({},user,id,body);
 assert.equal(t.row.generationCheckpoint.conversation.used,0);
 t.reply={kind:'insufficient',answered:false,text:'이 계산만으로 핵심 질문에 답할 수 없어요.',sources:[]};
 await questionConversation({},user,id,{...body,id:'33333333-3333-4333-8333-333333333333',question:'요청한 정보의 보충이에요'});
 assert.equal(t.row.generationCheckpoint.conversation.used,0);
 assert.equal(t.row.generationCheckpoint.conversation.exchanges[1].intentId,body.id);
});
test('owner and historical funding proof protect followups; close never removes original result',async()=>{
 const t=globalThis.__conversationTest;
 await assert.rejects(questionConversation({},'other',id,body),/NOT_FOUND/);assert.equal(t.calls,0);
 t.revoked=true;await assert.rejects(questionConversation({},user,id,body),/PAYMENT_NOT_ACTIVE/);assert.equal(t.calls,0);
 t.revoked=false;await questionConversation({},user,id,{action:'close'});
 assert.equal(t.row.generationCheckpoint.conversation.used,0);assert.equal(t.row.chapters.length,1);
 await assert.rejects(questionConversation({},user,id,body),/QUESTION_CONVERSATION_CLOSED/);
});


test('pending refund and revocation during generation never store or consume a followup',async()=>{
 const t=globalThis.__conversationTest;
 t.row.generationCheckpoint={deliveryRefund:{status:'pending'}};
 await assert.rejects(questionConversation({},user,id,body),/FOLLOWUP_NOT_AVAILABLE/);assert.equal(t.calls,0);
 delete t.row.generationCheckpoint;
 let release;t.barrier=new Promise(r=>release=r);
 const pending=questionConversation({},user,id,body);await new Promise(r=>setImmediate(r));
 t.row.state='REFUNDED';release();
 await assert.rejects(pending,/FOLLOWUP_NOT_AVAILABLE/);
 assert.equal(t.row.generationCheckpoint.conversation.used,0);assert.equal(t.row.generationCheckpoint.conversation.exchanges.length,0);
});


test('stored persona and grounded recognition reach followups without changing the quota contract',async()=>{
 const t=globalThis.__conversationTest;let common;
 for(const persona of [undefined,'yeoni','neo']){
  t.row.snapshot.persona=persona;
  t.row.snapshot.manifest[0].factSelectors.saju.push('tenGodsByPillar');
  t.row.snapshot.analysis.contexts.saju.facts.push({id:'saju.tenGodsByPillar',label:'tenGodsByPillar',value:{month:'정관'}});
  t.row.generationCheckpoint=undefined;
  await questionConversation({},user,id,body);
  assert.ok(t.sent.input.recognition.lenses.length);
  assert.equal(t.sent.input.recognition.version,'grounded-recognition-20261007');
  assert.ok(t.sent.options.systemPrompt.includes(persona==='yeoni'?'연이':persona==='neo'?'네오':'영냥이'));
  if(persona)assert.ok(!t.sent.options.systemPrompt.includes('너는 영냥이'));
  assert.equal(t.sent.options.maxProviderAttempts,1);
  assert.equal(t.row.generationCheckpoint.conversation.used,1);
  if(common)assert.equal(t.sent.input.recognition.contract,common);else common=t.sent.input.recognition.contract;
 }
});
