import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/ask/question-policy';export * from './worker/yeongnyangi/fortune/ask/conversation';export * from './worker/yeongnyangi/fortune/ask/question-evidence';export {products} from './worker/yeongnyangi/payments/catalog';export {validateReadingQuality} from './worker/yeongnyangi/fortune/reading-quality';export {sajuCompatibilityEvidence} from './worker/yeongnyangi/fortune/saju/compatibility-evidence';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const loaded=new Module(path.resolve('question-policy-test.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const p=loaded.exports;
const d=(patch={})=>({version:p.QUESTION_POLICY_VERSION,category:'self',target:'self',horizon:'current',situation:'현재 상황',options:'현 직장 유지 또는 이동',period:'2026년',constraints:'없음',confirmed:true,...patch});
test('approved scope, prices and followups share one registry contract',()=>{
 const cases=[['self','self','current','mackerel',3000,0],['job_change','self','current','salmon',9000,1],['compatibility','pair','current','flounder',15000,2],['timing','self','transition','tuna',30000,4]];
 for(const [category,target,horizon,fish,price,limit] of cases){
  const decision=d({category,target,horizon,relationshipType:'romantic_adults'}),plan=p.recommendQuestion('saju',decision);
  assert.equal(plan.fish,fish);assert.equal(p.FOLLOWUP_LIMITS[fish],limit);
  for(const product of p.products.filter(x=>x.readingKind==='single'&&x.fishId===fish))assert.equal(product.priceKRW,price);
  assert.equal(p.questionManifest('saju',fish,decision)[0].minimumChars,0);
 }
});
test('short career questions are checked by subject and decision, not length or emotion',()=>{
 for(const q of ['올해 이직을 준비해도 괜찮을까?','직장을 옮겨도 될까?','회사를 바꾸는 것을 고민 중이에요.'])assert.equal(p.questionCandidate(q),'job_change');
 assert.ok(p.recommendQuestion('saju',d(),'이직해도 될까?').missing.length);
 for(const q of ['이직한 친구에게 연락할 때 어떻게 말할까?','불안해서 긴 이야기를 들어주었으면 해요.'])assert.equal(p.questionCandidate(q),undefined);
 assert.equal(p.recommendQuestion('tarot',d({category:'reunion'})).fish,'mackerel');
});
test('mixed comparison/timing and unsupported long-term calculations never select automatic paid upgrades',()=>{
 assert.ok(p.recommendQuestion('saju',d({target:'pair',horizon:'transition'})).unsupported);
 for(const domain of ['astrology','tarot','sukuyo'])assert.ok(p.recommendQuestion(domain,d({horizon:'transition'})).unsupported);
 assert.throws(()=>p.assertQuestionOrder({domain:'saju',readingKind:'single',fishId:'tuna'},d()),/QUESTION_PRODUCT_MISMATCH/);
});
test('one intent survives clarification, failures and duplicates; limit is used only on saved answers',()=>{
 let c=p.reserveConversation(undefined,1,'one','첫 질문',0,'a');
 assert.equal(c.used,0);
 assert.throws(()=>p.reserveConversation(c,1,'two','동시 질문',1,'b'),/QUESTION_FOLLOWUP_BUSY/);
 c=p.finishConversation(c,'a',{kind:'clarification',text:'상황을 알려 주세요.',sources:[]},1);
 assert.equal(c.used,0);
 let next=p.reserveConversation(c,1,'two','확인 답변',1,'b');
 assert.equal(next.pending.intentId,'one');
 next=p.finishConversation(next,'b',{kind:'answer',text:'실제 근거와 행동',sources:['saju.pillars']},1);
 assert.equal(next.used,1);assert.equal(next.closed,true);
 assert.equal(p.reserveConversation(next,1,'two','확인 답변',2,'c'),next);
 assert.throws(()=>p.reserveConversation(next,1,'three','다른 질문',2,'c'),/QUESTION_CONVERSATION_CLOSED/);
 assert.throws(()=>p.reserveConversation(undefined,0,'one','질문',0,'a'),/QUESTION_CONVERSATION_CLOSED/);
});
test('provider retries cannot become unlimited free regeneration',()=>{
 let c=p.reserveConversation(undefined,4,'one','같은 질문',0,'a');
 c=p.reserveConversation(c,4,'one','같은 질문',90001,'b');
 assert.equal(c.used,0);assert.equal(c.pending.attempts,2);
 assert.throws(()=>p.reserveConversation(c,4,'one','같은 질문',180002,'c'),/QUESTION_FOLLOWUP_SUPPORT/);
 for(const kind of ['clarification','insufficient','correction','support','new_consultation']){
  const first=p.reserveConversation(undefined,1,'one','질문',0,'a');
  assert.equal(p.finishConversation(first,'a',{kind,text:'안내',sources:[]},1).used,0);
 }
 assert.throws(()=>p.validateFollowup({kind:'answer',text:'근거가 없어요',sources:[],answered:false},new Set()),/INVALID_FOLLOWUP/);
 assert.throws(()=>p.validateFollowup({kind:'answer',text:'답',sources:['invented'],answered:true},new Set()),/INVALID_FOLLOWUP/);
});
test('saju cross-chart combinations and clashes use existing calculations without success scores',()=>{
 const a={dayMaster:'甲',pillars:{year:'甲子',month:'丙寅',day:'甲子',hour:'丁卯'},fiveElements:{목:3,화:2,토:1,금:1,수:1}};
 const b={dayMaster:'己',pillars:{year:'庚午',month:'辛丑',day:'己午',hour:'壬申'},fiveElements:{목:1,화:2,토:2,금:2,수:1}};
 const evidence=p.sajuCompatibilityEvidence(a,b);
 assert.ok(evidence.dayStemRelation);assert.ok(evidence.branchRelations);
 assert.ok(JSON.stringify(evidence.branchRelations).includes('충'));
 assert.equal(evidence.axisScores,undefined);
 assert.match(evidence.interpretationRule,/자동 합화/);
});
test('basic result reopening is independent of unused followups',()=>{
 const row={state:'COMPLETED',accessMethod:'FAMILY',snapshot:{questionContract:{version:p.QUESTION_POLICY_VERSION,followups:1}},generationCheckpoint:{conversation:{revision:2,used:1,closed:true,calls:1,exchanges:[]}}};
 assert.equal(p.conversationView(row).remaining,0);assert.equal(p.conversationView(row).ready,true);
 assert.equal(p.conversationView({...row,snapshot:{}}),undefined);
});


test('followup answers require explanation and action and reject guaranteed claims',()=>{
 const valid={kind:'answer',answered:true,text:'내가 가능한 범위를 먼저 말해 보세요.',reason:'저장된 근거의 표현 패턴을 참고하되 실제 상황에 맞춰 조정해요.',action:'오늘은 가능한 시간과 어려운 범위를 한 문장씩 적어 보세요.',sources:['saju.pillars']};
 assert.match(p.validateFollowup(valid,new Set(valid.sources)).text,/한 문장씩/);
 for(const patch of [{reason:''},{action:''},{text:'무조건 재회 성공합니다.'}])assert.throws(()=>p.validateFollowup({...valid,...patch},new Set(valid.sources)));
});
