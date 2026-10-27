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
  t.row.snapshot.manifest[0].factSelectors.saju.push('tenGods');
  t.row.snapshot.analysis.contexts.saju.facts.push({id:'saju.tenGods',label:'tenGods',value:{비견:2.35,겁재:1}});
  t.row.generationCheckpoint=undefined;
  await questionConversation({},user,id,body);
  assert.ok(t.sent.input.recognition.lenses.length);
  assert.equal(t.sent.input.recognition.version,'grounded-recognition-20261007');
  assert.match(t.sent.options.systemPrompt,/전체 성향 분석을 반복하지 않고/);
  assert.match(t.sent.options.systemPrompt,/다른 주제도 저장된 체계와 근거가 뒷받침하면 답한다/);
  assert.match(t.sent.options.systemPrompt,/새로운 차트·카드·시기 계산이 반드시 필요하면 new_consultation/);
  assert.doesNotMatch(JSON.stringify(t.sent.input.evidence),/2\.35/);
  assert.equal(t.row.snapshot.analysis.contexts.saju.facts.find(f=>f.label==='tenGods').value.비견,2.35);
  assert.ok(t.sent.options.systemPrompt.includes(persona==='yeoni'?'연이':persona==='neo'?'네오':'영냥이'));
  if(persona)assert.ok(!t.sent.options.systemPrompt.includes('너는 영냥이'));
  assert.equal(t.sent.options.maxProviderAttempts,1);
  assert.equal(t.row.generationCheckpoint.conversation.used,1);
  assert.equal(t.sent.input.recognition.placement,'followup');
  assert.ok(t.sent.options.systemPrompt.includes('계산 사실 → 쉬운 의미'));
  const rules=t.sent.options.systemPrompt.split('계산 사실 → 쉬운 의미')[1];
  if(common)assert.equal(rules,common);else common=rules;
 }
});

test('separate chapters retain their own fact IDs for a different follow-up concern',async()=>{
 const t=globalThis.__conversationTest;
 t.row.snapshot.manifest[0].factIds=['saju.pillars'];
 t.row.snapshot.manifest.push({...t.row.snapshot.manifest[0],factIds:['saju.tenGodsByPillar'],factSelectors:{saju:['tenGodsByPillar']}});
 t.row.snapshot.analysis.contexts.saju.facts.push({id:'saju.tenGodsByPillar',label:'tenGodsByPillar',value:{month:'정관'}});
 await questionConversation({},user,id,{...body,question:'다른 고민인 직장에서는 무엇을 살펴볼까요?'});
 assert.ok(t.sent.input.evidence.some(f=>f.id==='saju.pillars'));
 assert.ok(t.sent.input.evidence.some(f=>f.id==='saju.tenGodsByPillar'));
});

for(const limit of [5,7])test('fusion '+limit+' followups use all saved chapter evidence and the stored total budget',async()=>{
 const t=globalThis.__conversationTest;
 t.row.snapshot.questionContract={...t.row.snapshot.questionContract,followups:limit,readingBudget:{followup:[2400,3000]}};
 t.row.snapshot.manifest.push({...t.row.snapshot.manifest[0],factSelectors:{saju:['tenGodsByPillar']}});
 t.row.snapshot.analysis.contexts.saju.facts.push({id:'saju.tenGodsByPillar',label:'tenGodsByPillar',value:{month:'정관'}});
 for(let i=0;i<limit;i++)await questionConversation({},user,id,{...body,id:crypto.randomUUID(),question:'실행 계획의 '+(i+1)+'번째 조건을 구체적으로 설명해 주세요.'});
 assert.deepEqual(t.sent.input.answerTargetChars,[2400,3000]);
 assert.ok(t.sent.input.evidence.some(f=>f.id==='saju.tenGodsByPillar'));
 assert.equal(t.row.generationCheckpoint.conversation.used,limit);
 assert.equal(t.sent.options.maxProviderAttempts,1);
 await assert.rejects(questionConversation({},user,id,{...body,id:crypto.randomUUID()}));
 assert.equal(t.calls,limit);
});

const COPIED='일간 갑목은 곧게 뻗는 나무처럼 원칙을 먼저 세우고 그 안에서 움직이려는 성향을 보여 줍니다.';
const REASON='월지 정관은 정해진 질서 안에서 인정을 받을 때 힘이 난다는 뜻이라 범위를 정하면 판단이 쉬워집니다.';
const repeatReply=(text,reason=REASON)=>({kind:'answer',answered:true,text,reason,action:'오늘은 부탁할 일을 한 문장으로 적고 상대가 바로 답할 수 있게 마감까지 함께 말해 보세요.',sources:['saju.pillars']});
function repeatOrder(t,repeatPolicy){
 t.row.chapters=[{summary:'저장된 기본 답변',blocks:[{title:'성향',paragraphs:[COPIED+' 짧은 맺음.']}]}];
 t.row.snapshot.questionContract={...t.row.snapshot.questionContract,followups:2,readingBudget:{followup:[100,200]}};
 if(repeatPolicy)t.row.snapshot.manifest[0].repeatPolicy=repeatPolicy;
 t.reply=repeatReply(COPIED+' 그래서 이번 질문에서는 부탁할 범위를 먼저 정해 두는 편이 마음을 덜 소모하게 해 줍니다.');
}
test('sentence-v1 followups drop sentences copied from chapters and earlier answers, keeping every paragraph and the floor',async()=>{
 const t=globalThis.__conversationTest;repeatOrder(t,'sentence-v1');
 await questionConversation({},user,id,body);
 t.reply=repeatReply('두 번째 질문에서는 상대의 속도를 먼저 확인하고 그 속도에 맞춰 요청 시점을 고르는 쪽이 편합니다.','앞선 기준은 그대로 두되 시점만 조정하면 됩니다. '+REASON);
 await questionConversation({},user,id,{...body,id:crypto.randomUUID(),question:'언제 말하면 좋을까?'});
 const [first,second]=t.row.generationCheckpoint.conversation.exchanges.map(e=>e.reply);
 assert.equal(t.calls,2);
 assert.equal(first.kind,'answer');assert.deepEqual(first.sources,['saju.pillars']);
 assert.ok(!first.text.includes(COPIED));assert.match(first.text,/부탁할 범위를 먼저 정해/);
 assert.equal(second.text.split(REASON).length,1);assert.match(second.text,/시점만 조정하면 됩니다\./);
 for(const reply of [first,second]){
  assert.equal(reply.text.split('\n\n').length,3);
  assert.ok(Array.from(reply.text.replace(/\s+/g,' ')).length>=70);
 }
});
test('followups of orders without repeatPolicy are stored byte for byte',async()=>{
 const t=globalThis.__conversationTest;repeatOrder(t);
 await questionConversation({},user,id,body);
 const saved=t.row.generationCheckpoint.conversation.exchanges[0].reply;
 assert.equal(saved.text,[t.reply.text,t.reply.reason,t.reply.action].join('\n\n'));
 assert.equal(t.calls,1);
});

test('D8: single-system follow-ups keep the 60-second timeout; assorted and omakase follow-ups get 90 seconds',async()=>{
 const t=globalThis.__conversationTest;
 for(const [fishId,ms] of [[undefined,60000],['mackerel',60000],['tuna',60000],['assorted',90000],['omakase',90000]]){
  t.row.snapshot.product={...t.row.snapshot.product,fishId};t.row.generationCheckpoint=undefined;
  await questionConversation({},user,id,{...body,id:crypto.randomUUID()});
  assert.equal(t.sent.options.timeoutMs,ms,String(fishId));
 }
});
