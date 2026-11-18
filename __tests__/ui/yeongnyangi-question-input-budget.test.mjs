import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
// 2026-11-18 사주 질문 상담(참치 이상): 질문 장이 대운 10개 주기와 그 해석 전부를 questionTiming·majorLuck 으로 두 번 받아
// 장당 추정 최대 74k 토큰이 되었고 Gemini 50k 입력 상한(LLM_INPUT_TOKEN_LIMIT_EXCEEDED)에서 결정적으로 실패했다.
// Mock only: the chapter request is captured before any network.
process.env.TZ='UTC';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__invariance={rows:new Map()};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:()=>({lean:async()=>({updatedAt:null,birth:{year:1997,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},gender:'F',location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`
  const db=()=>globalThis.__invariance.rows;
  export const commitTarotDraw=async()=>{throw new Error('unexpected tarot draw');};export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected')};
  export const allowedChapterAttempts=()=>3;export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const ownerId=x=>x;
  export const createRequest=async(e,u,id,v)=>{if(!db().has(id))db().set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[],chapterAttempts:{}});return db().get(id)};
  export const readRequest=async(e,u,id)=>{if(!db().has(id))throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return db().get(id)};
  export const attachPayment=async()=>{throw new Error('no payment in test')};
  export const claimChapter=0,saveChapterDraft=0,saveAskAnalysis=0,finishChapter=0,failChapter=0;`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(){throw new Error('no provider in test')}}`,
};
const bundle=await build({stdin:{contents:[
  "export {prepareFortune} from './worker/yeongnyangi/service';",
  "export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts';",
  "export {buildLuckOverlap} from './worker/yeongnyangi/fortune/saju/luck-overlap';",
  "export {askPromptView} from './worker/yeongnyangi/fortune/ask/prompt';",
  "export {analyzeAsk} from './worker/yeongnyangi/fortune/ask/analysis';",
  "export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter';",
  "export {fitChapterFacts,estimateRequestTokens,CHAPTER_INPUT_TOKEN_TARGET} from './worker/yeongnyangi/providers/input-budget';",
  "export {readerEvidence} from './worker/yeongnyangi/prompts/domain/reader-counsel';",
  "export {ASK_PERIOD_GUIDE} from './worker/yeongnyangi/fortune/ask/prompt';",
  "export {preventionFacts} from './worker/yeongnyangi/fortune/prevention';",
  "export {tarotTimeFrame} from './worker/yeongnyangi/fortune/tarot/time-frame';",
  "export {QUESTION_POLICY_VERSION} from './worker/yeongnyangi/fortune/ask/question-policy';",
 ].join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},
 plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const p=args.path.replaceAll('\\','/');const key=Object.keys(replacements).find(k=>p.endsWith(k)||p.endsWith(k+'.ts')||p.endsWith(k.replace(/\.js$/,'.ts')));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('question-input-budget-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const m=loaded.exports;
const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
const QUESTION_PERIOD='앞으로 5년';
const prepareQuestion=async(productId,horizon)=>{globalThis.__invariance.rows=new Map();
 return m.prepareFortune(env,'owner',{productId,profileId:'self',timezone:'Asia/Seoul',topicId:'general',consultationKind:'personal',
  questionDecision:{version:m.QUESTION_POLICY_VERSION,category:'timing',target:'self',horizon,situation:'일의 방향을 바꾸려 해요',options:'',period:QUESTION_PERIOD,constraints:'',confirmed:true},
  question:'앞으로 5년 일의 흐름과 이직 시기가 궁금해요'});};
const fact=(facts,label)=>facts.find(f=>f.label===label)?.value;
async function capture(row,chapter){
 let sent;
 await new m.StructuredChapterProvider({generate:async request=>{sent=request;throw new Error('captured');}})
  .generateChapter({deliveryContract:'chapter-delivery-v1',locale:'ko',chapter,analysis:row.snapshot.analysis,previous:[]}).catch(error=>{if(error.message!=='captured')throw error;});
 return sent;
}
const IDENTITY=['index','pillar','startYear','endYear','label','startDate','endDate','isCurrent'];
const pick=(c,keys)=>Object.fromEntries(keys.filter(k=>c?.[k]!==undefined).map(k=>[k,c[k]]));

for(const horizon of ['transition','current'])for(const productId of ['saju_mackerel','saju_salmon','saju_flounder','saju_tuna']){
 test(`${productId} ${horizon} question: every chapter request stays at or under 40,000 estimated tokens and keeps the period facts`,async()=>{
  const row=await prepareQuestion(productId,horizon);
  const ctx=row.snapshot.analysis.contexts.saju;
  const major=fact(ctx.facts,'majorLuck'),timing=fact(ctx.facts,'questionTiming');
  assert.equal(Boolean(timing),horizon==='transition','questionTiming exists only for a transition question');
  const current=major.currentCycle;
  assert.ok(current?.interpretation?.annual?.length,'fixture has a current cycle with yearly interpretation rows');
  const over=[];
  for(const chapter of row.snapshot.manifest){
   const request=await capture(row,chapter);
   assert.ok(request,`${chapter.key} reached the provider`);
   const tokens=m.estimateRequestTokens(request);
   if(tokens>m.CHAPTER_INPUT_TOKEN_TARGET)over.push(`${chapter.key}:${tokens}`);
   const facts=request.calculatedData.facts.filter(f=>f.id.startsWith('saju.'));
   const qt=facts.find(f=>f.label==='questionTiming')?.value,ml=facts.find(f=>f.label==='majorLuck')?.value;
   if(qt){
    // Every calculated period stays named with its pillar, years and dates.
    assert.deepEqual(qt.periods.map(p=>pick(p,IDENTITY)),timing.periods.map(p=>pick(p,IDENTITY)),`${chapter.key} questionTiming identities`);
    assert.equal(qt.requestedPeriod,timing.requestedPeriod);
    assert.ok(qt.rule.startsWith(timing.rule),`${chapter.key} questionTiming rule`);
    // The current cycle and every cycle with calculated yearly rows keep their full interpretation.
    for(const p of timing.periods.filter(p=>p.index===current.index||p.interpretation?.annual?.length))
     assert.deepEqual(qt.periods.find(x=>x.index===p.index).interpretation,p.interpretation,`${chapter.key} cycle ${p.index} interpretation`);
   }
   if(ml){
    assert.equal(ml.direction,major.direction);
    assert.equal(ml.daeunNumber,major.daeunNumber);
    assert.deepEqual(pick(ml.currentCycle,IDENTITY),pick(current,IDENTITY),`${chapter.key} majorLuck current cycle`);
    // Without questionTiming in the same request, majorLuck carries the current cycle's interpretation itself.
    if(!qt)assert.deepEqual(ml.currentCycle.interpretation,current.interpretation,`${chapter.key} majorLuck interpretation`);
   }
  }
  assert.deepEqual(over,[],`chapters over ${m.CHAPTER_INPUT_TOKEN_TARGET}`);
 });
}


test('input ladder compacts 대운 interpretation after the fact rungs and never drops the fact or a cycle name',()=>{
 const cycle=(index,isCurrent,size)=>({index,pillar:'乙巳',startYear:2014+index*10,endYear:2023+index*10,isCurrent,
  interpretation:{tombAnalysis:{events:'t'.repeat(size)},annual:[{year:2026,note:'a'.repeat(size)}]}});
 const facts={facts:[
  {id:'saju.pillars',label:'pillars',value:'p'},
  {id:'saju.questionTiming',label:'questionTiming',value:{rule:'r',requestedPeriod:'앞으로 5년',periods:[cycle(0,false,30000),cycle(1,true,30000),cycle(2,false,30000)]}},
 ]};
 const build=f=>({system:'s',domainRules:'{}',calculatedData:f,outputSchema:{}});
 const fitted=m.fitChapterFacts(facts,build);
 assert.deepEqual(fitted.dropped,['saju.questionTiming#pastAndFutureCycleInterpretation']);
 const periods=fitted.request.calculatedData.facts.find(f=>f.label==='questionTiming').value.periods;
 assert.deepEqual(periods.map(p=>[p.index,p.pillar,p.startYear,p.endYear]),[[0,'乙巳',2014,2023],[1,'乙巳',2024,2033],[2,'乙巳',2034,2043]]);
 assert.deepEqual(periods[1].interpretation,facts.facts[1].value.periods[1].interpretation,'the current cycle keeps its interpretation');
 assert.ok(fitted.estimatedTokens<=m.CHAPTER_INPUT_TOKEN_TARGET);
 // A current cycle still too large loses its 세운 rows next, not the fact.
 const huge={facts:[facts.facts[0],{...facts.facts[1],value:{...facts.facts[1].value,periods:[cycle(1,true,120000)]}}]};
 const second=m.fitChapterFacts(huge,build);
 assert.deepEqual(second.dropped,['saju.questionTiming#cycleAnnual']);
 assert.equal(second.request.calculatedData.facts.find(f=>f.label==='questionTiming').value.periods[0].interpretation.tombAnalysis.events.length,120000);
});

test('the luck judgement gives way — headlines, then period rows, then the fact — before a monthlyLuck row is dropped',()=>{
 const monthly={id:'saju.monthlyLuck',label:'monthlyLuck',value:[{pillar:'丙子',note:'m'.repeat(50000)}]};
 const judged=value=>({facts:[{id:'saju.pillars',label:'pillars',value:'p'},monthly,{id:'saju.luckJudgement',label:'luckJudgement',value}]});
 const build=f=>({system:'s',domainRules:'{}',calculatedData:f,outputSchema:{}});
 const judgementOf=fitted=>fitted.request.calculatedData.facts.find(f=>f.label==='luckJudgement')?.value;
 const row=(label,headline)=>({label,verdict:'조심할 흐름',...(headline?{headline}:{})});
 const first=m.fitChapterFacts(judged({natal:{climate:{summary:'c'}},months:[row('2026-12',`h${'h'.repeat(60000)}`)]}),build);
 assert.deepEqual(first.dropped,['saju.luckJudgement#judgementVerdicts']);
 assert.deepEqual(judgementOf(first).months,[row('2026-12')]);
 const second=m.fitChapterFacts(judged({natal:{climate:{summary:'c'}},months:[row('x'.repeat(60000))]}),build);
 assert.deepEqual(second.dropped,['saju.luckJudgement#judgementPeriods']);
 assert.deepEqual(judgementOf(second),{natal:{climate:{summary:'c'}}});
 const third=m.fitChapterFacts(judged({natal:{climate:{summary:'c'.repeat(60000)}}}),build);
 assert.deepEqual(third.dropped,['saju.luckJudgement']);
 for(const fitted of [first,second,third])assert.ok(fitted.request.calculatedData.facts.some(f=>f.label==='monthlyLuck'));
});
