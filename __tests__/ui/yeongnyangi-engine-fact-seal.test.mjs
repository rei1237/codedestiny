import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {ENGINE_ROLLOUT_FLAGS} from '../../worker/lib/engine-rollout.js';
import {engineFactResealPlan} from '../../scripts/lib/engine-fact-reseal-plan.mjs';

// Real prepare flow under the production flag table: a purchase must never reach payment with facts generation refuses.
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__sealTest={rows:new Map()};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:filter=>({lean:async()=>({updatedAt:null,birth:filter.profileId==='partner'?{year:2000,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'}:{year:2001,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},gender:'F',location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const commitTarotDraw=async()=>{throw new Error('unexpected tarot draw');};export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected followup');};export const allowedChapterAttempts=()=>3;export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const saveChapterDraft=async()=>{};export const saveAskAnalysis=async()=>{};export const ownerId=x=>x;export const createRequest=async(e,u,id,v)=>{const m=globalThis.__sealTest.rows;if(!m.has(id))m.set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[]});return m.get(id)};export const readRequest=async(e,u,id)=>{const row=globalThis.__sealTest.rows.get(id);if(!row)throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return row;};export const attachPayment=async()=>{};export const claimChapter=async()=>({row:null,token:''});export const finishChapter=async()=>{};export const failChapter=async()=>{};`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(){throw new Error('UNEXPECTED_PROVIDER_CALL')}}`,
};
const bundle=await build({stdin:{contents:"export * from './worker/yeongnyangi/service'; export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationKinds,consultationDomain} from './worker/yeongnyangi/fortune/consultation-kinds'; export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts'; export {validateDomainFacts} from './worker/yeongnyangi/fortune/shared/consumer-facts'; export {withSajuCycleEvidence} from './worker/yeongnyangi/fortune/saju/cycle-evidence'; export {QUESTION_POLICY_VERSION} from './worker/yeongnyangi/fortune/ask/question-policy'; export {SPIRIT_MODE} from './worker/yeongnyangi/fortune/spirit-contract';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('engine-fact-seal-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {prepareFortune,snapshotAnalysis,products,consultationKinds,selectChapterFacts,validateDomainFacts,withSajuCycleEvidence,QUESTION_POLICY_VERSION,SPIRIT_MODE}=loaded.exports;
const env={...ENGINE_ROLLOUT_FLAGS,GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
const clone=x=>JSON.parse(JSON.stringify(x));
const base={profileId:'self',timezone:'Asia/Seoul',topicId:'general'};

// Generation reads the row after a storage round-trip, so check the JSON form.
function assertDeliverable(row,label){
  const stored=clone(row.snapshot);
  for(const analysis of [stored.analysis,snapshotAnalysis(stored)]){
    for(const context of Object.values(analysis.contexts)){
      validateDomainFacts(context);
      for(const chapter of stored.manifest)selectChapterFacts(context,chapter,analysis.topicId);
    }
  }
  return label;
}

test('saju_mackerel with the production flags stays deliverable after prepare enrichment',async()=>{
  const row=await prepareFortune(env,'seal-owner',{...base,productId:'saju_mackerel'});
  assert.equal(row.snapshot.analysis.contexts.saju.engineFactProtocol,'engine-facts-v1');
  assertDeliverable(row,'saju_mackerel');
});

test('every catalog product and consultation kind prepares a deliverable snapshot',async()=>{
  const failures=[],skipped={};let prepared=0;
  for(const product of products){
    const domains=[...new Set(product.systems)];
    const kinds=domains.length===1?(consultationKinds[domains[0]]||[]):[];
    for(const kind of [undefined,...kinds]){
      const body={...base,productId:product.id,...(kind?{consultationKind:kind.id}:{}),
        ...(kind?.question||kind?.id==='ask'?{question:'올해 일과 관계에서 무엇을 먼저 정리할까요?'}:{}),
        ...(kind?.partner?{partnerProfileId:'partner',participants:{self:'나비',partner:'별'}}:{})};
      const label=`${product.id}/${kind?.id||'default'}`;
      try{assertDeliverable(await prepareFortune(env,'seal-owner',body),label);prepared++;}
      catch(error){
        // Input rules reject a combination before any purchase exists; they are not this contract.
        if(error?.status>=400&&error.status<500&&!/ENGINE_FACT/.test(error.code||''))skipped[error.code]=(skipped[error.code]||0)+1;
        else failures.push(`${label}: ${error?.code||error?.message}`);
      }
    }
  }
  assert.deepEqual(failures,[]);
  assert.ok(prepared>=products.length,`prepared only ${prepared}; skipped ${JSON.stringify(skipped)}`);
});

const decision=fields=>({version:QUESTION_POLICY_VERSION,category:'love',target:'self',horizon:'current',situation:'연락이 뜸해졌어요',options:'',period:'',constraints:'',confirmed:true,...fields});
const question='연락이 뜸해진 사람에게 먼저 말을 걸어도 될까요?';
for(const [label,body,options] of [
  ['question-first self',{...base,productId:'saju_mackerel',question,questionDecision:decision()}],
  ['question-first pair',{...base,productId:'saju_flounder',question,partnerProfileId:'partner',questionDecision:decision({target:'pair',relationshipType:'romantic_adults'})}],
  ['question-first long horizon',{...base,productId:'saju_tuna',question:'앞으로의 흐름이 궁금해요',questionDecision:decision({category:'timing',horizon:'transition',period:'앞으로 5년'})}],
  ['question-first ziwei',{...base,productId:'ziwei_mackerel',question,questionDecision:decision()}],
  ['spirit',{...base,productId:'saju_mackerel',mode:SPIRIT_MODE,question,spirit:{relationship:'친구',topic:'contact',situation:'연락이 뜸해졌어요'}}],
  ['chat persona',{...base,domain:'saju',question},{persona:'yeoni'}],
  ['chat persona question',{...base,domain:'saju',fishId:'mackerel',question,questionDecision:decision()},{persona:'neo'}],
])test(`${label} prepares a deliverable snapshot`,async()=>{
  assertDeliverable(await prepareFortune(env,'seal-owner',body,options),label);
});

test('a v7 snapshot stays valid after the stored timing matrix is re-applied',async()=>{
  const row=await prepareFortune(env,'seal-owner',{...base,productId:'saju_tuna',consultationKind:'personal'});
  assert.ok(row.snapshot.v7Timing,'expected a v7 order');
  assertDeliverable(row,'v7');
});

test('the seal does not tolerate changes to a stored snapshot',async()=>{
  const row=await prepareFortune(env,'seal-owner',{...base,productId:'saju_mackerel'});
  const changed=clone(row.snapshot.analysis.contexts.saju);
  changed.facts.find(fact=>fact.label==='advancedFactors').value.gyeokguk.finalGyeokguk='변경됨';
  assert.throws(()=>validateDomainFacts(changed),error=>error.code==='ENGINE_FACT_CONTEXT_MISMATCH'&&/^[\w.:-]+$/.test(error.detail));
  const tampered=clone(row.snapshot.analysis.contexts.saju);
  tampered.engineFacts.digest='0'.repeat(64);
  assert.throws(()=>validateDomainFacts(tampered),error=>error.code==='ENGINE_FACT_SNAPSHOT_INVALID');
  const unpinned=clone(row.snapshot.analysis.contexts.saju);
  delete unpinned.engineFacts;
  assert.throws(()=>validateDomainFacts(unpinned),error=>error.code==='ENGINE_FACT_SNAPSHOT_REQUIRED');
});

test('reseal plan repairs only prepare enrichment on an unstarted order',async()=>{
  const {snapshot}=await prepareFortune(env,'seal-owner',{...base,productId:'saju_mackerel'});
  const stale=()=>{const copy=clone(snapshot);copy.analysis.contexts.saju.facts.find(fact=>fact.label==='advancedFactors').value.gyeokguk.breakFactors=[];return {state:'CREATED',chapters:[],completedChapters:0,snapshot:copy};};
  const plan=engineFactResealPlan(stale());
  assert.deepEqual(plan.labels,['advancedFactors']);
  const row=stale();row.snapshot.analysis.contexts.saju.engineFacts=plan.replacements.saju;
  validateDomainFacts(row.snapshot.analysis.contexts.saju);
  assert.equal(engineFactResealPlan(row).blocked,'NOTHING_TO_SEAL');
  const judged=stale();judged.snapshot.analysis.contexts.saju.facts.find(fact=>fact.label==='advancedFactors').value.gyeokguk.finalGyeokguk='변경됨';
  assert.equal(engineFactResealPlan(judged).blocked,'JUDGMENT_CHANGED');
  const other=stale();other.snapshot.analysis.contexts.saju.facts.find(fact=>fact.label==='pillars').value={};
  assert.equal(engineFactResealPlan(other).blocked,'UNEXPECTED_FACT_CHANGE');
  assert.equal(engineFactResealPlan({...stale(),state:'REFUNDED'}).blocked,'CLOSED_ORDER');
  assert.equal(engineFactResealPlan({...stale(),chapters:[{}]}).blocked,'CHAPTERS_SAVED');
});

test('cycle evidence keeps the calculated gyeokguk judgment over its own recalculation',async()=>{
  const row=await prepareFortune(env,'seal-owner',{...base,productId:'saju_mackerel'});
  const context=clone(row.snapshot.analysis.contexts.saju);
  const advanced=context.facts.find(fact=>fact.label==='advancedFactors').value;
  const judged={finalGyeokguk:'승인된격',finalType:'특수격',judgmentReason:'승인 엔진의 판정',confident:false,monthBranch:'승인지지',monthHiddenStems:['승인'],candidates:[{name:'승인후보'}]};
  Object.assign(advanced.gyeokguk,judged);
  const result=withSajuCycleEvidence(context,row.snapshot.analysis.asOf).facts.find(fact=>fact.label==='advancedFactors').value.gyeokguk;
  assert.deepEqual(Object.fromEntries(Object.keys(judged).map(key=>[key,result[key]])),judged);
});
