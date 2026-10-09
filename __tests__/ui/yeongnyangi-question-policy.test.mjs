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
  // D7/D8: new layouts repair below 55% of the chapter target; the legacy manifest keeps no minimum.
  const row=p.questionManifest('saju',fish,decision)[0];
  assert.equal(row.minimumChars,Math.ceil(row.targetChars[0]*.55));
  assert.equal(p.questionManifest('saju',fish,decision,undefined,'',false)[0].minimumChars,0);
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

test('every system explains its own foundation and routes question chapters by intent',()=>{
 const titles={saju:/사주.*오행/,ziwei:/자미두수.*명궁/,sukuyo:/본명숙/,vedic:/베다.*라그나/,astrology:/출생 차트/,tarot:/카드.*마음/};
 for(const [domain,title] of Object.entries(titles))for(const category of ['reunion','job_change','money','compatibility']){
  const fish=category==='compatibility'?'flounder':category==='reunion'?'mackerel':'salmon';
  const decision=d({category,target:category==='compatibility'?'pair':'self'});
  const rows=p.questionManifest(domain,fish,decision,undefined,'내 상황에 맞는 선택은?');
  assert.match(rows[0].title,title);assert.equal(rows[0].theme,'self');
  assert.equal(rows[3].theme,{reunion:'love',job_change:'career',money:'wealth',compatibility:'relations'}[category]);
  assert.equal(rows.at(-1).theme,'action');assert.equal(rows[3].part,'내 상황에 맞는 선택은?');
  assert.match(rows[3].focus,/질문 원문.*상황.*기간.*선택지.*제약/);
  assert.ok(rows.every(row=>row.factSelectors[domain].length));
  assert.equal(new Set(rows.map(row=>row.title)).size,rows.length);
 }
 const saju=p.questionManifest('saju','mackerel',d())[0];
 assert.match(saju.sections.find(s=>s.id==='nature').instruction,/일간.*오행.*십성/);
 const legacy=p.questionManifest('saju','mackerel',d(),undefined,'',false);
 assert.equal(legacy.length,1);assert.equal(legacy[0].title,'이 질문을 함께 살펴보기');
});

test('all included followups remain available until every saved answer is used',()=>{
 for(const limit of [1,2,4,5,7]){
  let c;
  for(let i=0;i<limit;i++){
   const reserved=p.reserveConversation(c,limit,'q'+i,'질문 '+i,0,'token'+i);
   assert.equal(reserved.used,i);assert.equal(reserved.closed,false);
   c=p.finishConversation(reserved,'token'+i,{kind:'answer',text:'실제 근거와 행동',sources:['saju.pillars']},limit);
   assert.equal(c.used,i+1);assert.equal(c.closed,i+1===limit);
   assert.equal(c.exchanges.length,i+1);
   assert.equal(p.reserveConversation(c,limit,'q'+i,'질문 '+i,0,'replay'),c);
  }
  assert.throws(()=>p.reserveConversation(c,limit,'extra','한도 밖의 질문',0,'extra'),/QUESTION_CONVERSATION_CLOSED/);
 }
});
test('D5: a ziwei job change reads career palaces without the business basis; other questions keep it',()=>{
 for(const expanded of [true,false]){
  const sel=category=>p.questionManifest('ziwei','salmon',d({category}),undefined,'',expanded).flatMap(row=>row.factSelectors.ziwei||[]);
  assert.ok(!sel('job_change').includes('businessBasis'),`expanded=${expanded}`);
  assert.ok(sel('job_change').includes('palaces'));
  assert.ok(sel('money').includes('businessBasis'),`expanded=${expanded}`);
 }
});
