import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__paidRecovery={row:null,providerCalls:[],claims:[],finishes:[],failures:[],failOnce:false};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:()=>({lean:async()=>globalThis.__paidRecovery.profile})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const commitTarotDraw=async()=>{throw new Error('unexpected tarot draw');};export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected followup in this fixture');};export const allowedChapterAttempts=(r,n)=>3+Number(r?.manualRecoveryGrants?.[n]||0)+Number(r?.systemRecoveryGrants?.[n]||0);export const holdAutoResumes=()=>false;export const userCanRetry=r=>globalThis.__paidRecovery.canRetry??r.errorCode==='AUTOMATIC_RECOVERY_STOPPED';
export const saveChapterDraft=async(e,u,id,token,ordinal,draft,slot='chapterDrafts')=>{const r=globalThis.__paidRecovery.row;r.generationCheckpoint||={};r.generationCheckpoint[slot]||={};r.generationCheckpoint[slot][ordinal]=draft;};export const saveAskAnalysis=async(e,u,id,token,analysis)=>{const f=globalThis.__paidRecovery;if(!f)throw new Error("unexpected analysis");f.row.generationCheckpoint.analysis=analysis;if(f.storageFailure)throw new Error("storage uncertain");return analysis;};export const ownerId=x=>x;export const createRequest=async(e,u,id,values)=>{const row={_id:id,userId:u,...values,state:'CREATED',chapters:[]};globalThis.__paidRecovery.prepared=structuredClone(row);return row;};export const readRequest=async()=>globalThis.__paidRecovery.row;export const attachPayment=async()=>globalThis.__paidRecovery.row;
export const claimChapter=async(e,u,id,source)=>{const f=globalThis.__paidRecovery,r=f.row;f.claims.push({id,source,chapter:r.chapters.length});if(r.state==='COMPLETED')return {row:r,token:null};r.state='GENERATING';const n=r.chapters.length;r.chapterAttempts[n]=(r.chapterAttempts[n]||0)+1;r.leaseToken='lease-'+n;return {row:r,token:r.leaseToken};};
export const finishChapter=async(e,u,id,token,ordinal,body,total)=>{const f=globalThis.__paidRecovery,r=f.row;f.finishes.push({id,token,ordinal});assertOrdinal(r.chapters.length,ordinal);r.chapters.push(body);r.completedChapters=r.chapters.length;r.state=r.chapters.length===total?'COMPLETED':'PAID';return r;};
export const failChapter=async(e,u,id,token,code,attempt,stage,allowedAttempts)=>{const f=globalThis.__paidRecovery;f.failures.push({id,code,attempt,stage,allowedAttempts});f.row.state='FORTUNE_FAILED';f.row.errorCode=code;f.row.lastFailure={code,stage};};
function assertOrdinal(actual,expected){if(actual!==expected)throw new Error('ordinal mismatch');}
`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>true;`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{constructor(env,log,cache,timeoutMs){this.env=env;globalThis.__paidRecovery.timeoutMs=timeoutMs}async analyzeQuestion(){const f=globalThis.__paidRecovery;f.analysisCalls=(f.analysisCalls||0)+1;return JSON.stringify({questions:[{questionId:"q1",category:"career",needsTiming:false}]});}}`,
  'worker/yeongnyangi/providers/delivery':`export {validateChapter as deliverChapter} from './chapter';`,
  'worker/yeongnyangi/providers/chapter':`
export class StructuredChapterProvider{async generateChapter(input){const f=globalThis.__paidRecovery,n=input.previous.length;f.lastInput=input;f.providerCalls.push(n);if(f.failOnce){f.failOnce=false;throw new Error('temporary provider failure')}return {summary:'generated-'+n,analysis:'analysis',example:'example',advice:'advice',persona:'persona',highlights:[],topics:[],blocks:[],sources:[]};}}
export const validateChapter=value=>{const f=globalThis.__paidRecovery;if(f.rejectQuality>0){f.rejectQuality--;throw new Error('invalid answer evidence');}
// D8: shortChars queues each reply's outcome: 0 full, -1 empty/cut-off, n a length-only shortfall of n characters.
const n=f.shortChars?.shift();if(n===-1)throw new Error('empty reply');if(n>0)throw Object.assign(new Error('CHAPTER_TOO_SHORT'),{shortCandidate:{...value,blocks:[{id:'b',title:'t',paragraphs:['흐'.repeat(n)]}]}});return value;};
`,
};
const bundle=await build({stdin:{contents:"export {generateNextChapter,presentFortune,prepareFortune} from './worker/yeongnyangi/service';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'recovery-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const normalized=args.path.replaceAll('\\','/');const key=Object.keys(replacements).find(item=>normalized.endsWith(item)||normalized.endsWith(item+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('yeongnyangi-paid-recovery-contract.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {generateNextChapter,presentFortune,prepareFortune}=loaded.exports;
const env={GEMINIF_API_KEY:'fixture-only',LLM_DRY_RUN:'false'};
function row(chapters=[]){return {_id:'a'.repeat(64),userId:'owner',profileId:'profile',productId:'saju_mackerel',paymentId:'original-payment',state:'PAID',errorCode:'',chapters:[...chapters],completedChapters:chapters.length,chapterAttempts:{},manualRecoveryGrants:{},snapshot:{product:{id:'saju_mackerel'},analysis:{consultation:{}},manifest:[{id:'first'},{id:'second'},{id:'third'}]}};}
function reset(chapters=[]){globalThis.__paidRecovery={row:row(chapters),providerCalls:[],claims:[],finishes:[],failures:[],failOnce:false};return globalThis.__paidRecovery;}

test('ask analysis is reused after chapter failure and uncertain checkpoint write',async()=>{
 for(const failure of ['failOnce','storageFailure']){
  const f=reset();f[failure]=true;
  f.row.generationCheckpoint={version:'ask-generation-v1',evidence:{}};
  f.row.snapshot.analysis.consultation={topicId:'work',questions:[{id:'q1',text:'취업?',chapterId:'first'}]};
  const snapshot=JSON.stringify(f.row.snapshot);
  await assert.rejects(generateNextChapter(env,'owner',f.row._id));
  if(failure==='storageFailure')assert.equal(f.providerCalls.length,0);
  f.storageFailure=false;
  await generateNextChapter(env,'owner',f.row._id);
  assert.equal(f.analysisCalls,1);
  assert.deepEqual(f.lastInput.ask,{analysis:f.row.generationCheckpoint.analysis,evidence:f.row.generationCheckpoint.evidence});
  assert.equal(JSON.stringify(f.row.snapshot),snapshot);
 }
});

test('service resumes at the first missing chapter and never regenerates stored chapters',async()=>{
 const fixture=reset([{summary:'stored-first'}]);
 await generateNextChapter(env,'owner',fixture.row._id,'queue');
 await generateNextChapter(env,'owner',fixture.row._id,'scheduled');
 assert.deepEqual(fixture.providerCalls,[1,2]);assert.deepEqual(fixture.finishes.map(item=>item.ordinal),[1,2]);
 assert.equal(fixture.row.chapters[0].summary,'stored-first');assert.equal(fixture.row.state,'COMPLETED');
 await generateNextChapter(env,'owner',fixture.row._id,'queue');assert.deepEqual(fixture.providerCalls,[1,2]);
 assert.deepEqual(fixture.claims.map(item=>item.source),['queue','scheduled','queue']);
});

test('temporary provider failure records a retryable checkpoint without replacing payment identity',async()=>{
 const fixture=reset([]);fixture.failOnce=true;
 await assert.rejects(generateNextChapter(env,'owner',fixture.row._id,'queue'),/temporary provider failure/);
 assert.equal(fixture.row.paymentId,'original-payment');assert.equal(fixture.row.chapters.length,0);
 assert.deepEqual(fixture.failures,[{id:fixture.row._id,code:'GENERATION_FAILED',attempt:1,stage:'provider',allowedAttempts:3}]);
 const publicRow=presentFortune(fixture.row);assert.equal(publicRow.recovery.requestId,fixture.row._id);assert.equal(publicRow.recovery.providerNeeded,true);
});

test('ask quality has one regeneration, then keeps paid access and saved chapters for support',async()=>{
 const fixture=reset();fixture.rejectQuality=2;
 fixture.row.generationCheckpoint={version:'ask-generation-v1',evidence:{},analysis:{version:'ask-analysis-v1',questions:[]}};
 fixture.row.snapshot.analysis.consultation={topicId:'work',questions:[]};
 await assert.rejects(generateNextChapter(env,'owner',fixture.row._id));
 assert.equal(fixture.failures[0].stage,'quality');
 assert.equal(fixture.row.chapters.length,0);
 await assert.rejects(generateNextChapter(env,'owner',fixture.row._id));
 assert.equal(fixture.failures[1].code,'ASK_LIMITED_REVIEW_REQUIRED');
 assert.equal(fixture.row.paymentId,'original-payment');
 assert.equal(fixture.row.state,'FORTUNE_FAILED');
 assert.equal(fixture.providerCalls.length,2);
 const presented=presentFortune(fixture.row);
 assert.equal(presented.errorCode,'GENERATION_REVIEW_REQUIRED');
 // Held, not a dead end: saved chapters stay readable and the server keeps the order.
 assert.equal(presented.recovery.nextAction,'held');
 assert.equal(presented.recovery.retryable,false);
 assert.equal(presentFortune({...fixture.row,state:'REFUNDED',errorCode:'PAYMENT_NOT_ACTIVE'}).recovery.nextAction,'support');
 assert.equal(presented.recovery.providerNeeded,true);
});

test('a held order offers the buyer retry only while the repository still allows one',async()=>{
 const fixture=reset([{summary:'stored-first'}]);
 Object.assign(fixture.row,{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
 fixture.canRetry=true;
 const retry=presentFortune(fixture.row).recovery;
 assert.equal(retry.canRetryNow,true);assert.equal(retry.nextAction,'retry');assert.equal(retry.retryable,false);
 fixture.canRetry=false;
 const held=presentFortune(fixture.row).recovery;
 assert.equal(held.canRetryNow,false);assert.equal(held.nextAction,'held');
 assert.equal(presentFortune({...fixture.row,state:'REFUNDED',errorCode:'PAYMENT_NOT_ACTIVE'}).recovery.nextAction,'support');
});

test('quality retries tell the provider what failed without leaking that correction into the next chapter',async()=>{
 const fixture=reset([{summary:'stored-first'}]);
 fixture.row.chapterAttempts[1]=1;
 fixture.row.lastFailure={stage:'quality',code:'CHAPTER_SECTION_TOO_SHORT'};
 await generateNextChapter(env,'owner',fixture.row._id);
 assert.deepEqual(fixture.lastInput.repair,{code:'CHAPTER_SECTION_TOO_SHORT'});
 await generateNextChapter(env,'owner',fixture.row._id);
 assert.equal(fixture.lastInput.repair,undefined);
 assert.deepEqual(fixture.providerCalls,[1,2]);
});

test('historical duplicate failures classified as provider errors still supply a corrective retry prompt',async()=>{
 const fixture=reset([{summary:'preserved-first'}]);
 fixture.row.chapterAttempts[1]=2;
 fixture.row.lastFailure={stage:'provider',code:'DUPLICATE_CHAPTER'};
 await generateNextChapter(env,'owner',fixture.row._id);
 assert.deepEqual(fixture.lastInput.repair,{code:'DUPLICATE_CHAPTER'});
 assert.equal(fixture.row.chapters[0].summary,'preserved-first');
 await generateNextChapter(env,'owner',fixture.row._id);
 assert.equal(fixture.lastInput.repair,undefined);
});

test('question-analysis checkpoints keep purchase locale through chapter retry and completion',async()=>{
 for(const locale of ['en','ja']){
  const f=reset();f.failOnce=true;f.row.snapshot.locale=locale;
  f.row.generationCheckpoint={version:'ask-generation-v1',evidence:{locale}};
  f.row.snapshot.analysis.consultation={topicId:'work',questions:[{id:'q1',text:locale==='en'?'How can I prepare for work?':'仕事に向けて何を準備すればいいですか？',chapterId:'first'}]};
  await assert.rejects(generateNextChapter(env,'owner',f.row._id));
  for(let i=0;i<3;i++){
   await generateNextChapter(env,'owner',f.row._id);
   assert.equal(f.lastInput.locale,locale);
   if(f.lastInput.chapter.id==='first')assert.deepEqual(f.lastInput.ask.evidence,{locale});
   else assert.equal(f.lastInput.ask,undefined);
  }
  assert.equal(f.analysisCalls,1);assert.equal(f.row.state,'COMPLETED');
  assert.equal(presentFortune(f.row).locale,locale);
  const calls=f.providerCalls.length;
  await generateNextChapter(env,'owner',f.row._id);
  assert.equal(f.providerCalls.length,calls);
 }
});

test('monthly questions reuse saved timing evidence in every chapter without additional analysis',async()=>{
 const f=reset();
 const evidence={locale:'ko',timing:[{id:'T001',value:{year:2027,month:1}}]};
 f.row.generationCheckpoint={version:'ask-generation-v1',evidence};
 f.row.snapshot.analysis.consultation={topicId:'money',questions:[{id:'q1',text:'2027년 1월부터 12월까지 월별 재물운',chapterId:'first'}]};
 for(let i=0;i<3;i++){
  await generateNextChapter(env,'owner',f.row._id);
  assert.deepEqual(f.lastInput.ask.evidence,evidence);
 }
 assert.equal(f.analysisCalls,1);assert.equal(f.row.state,'COMPLETED');
 const calls=f.providerCalls.length;
 await generateNextChapter(env,'owner',f.row._id);
 assert.equal(f.providerCalls.length,calls);
});

test('actual paid preparation stores authoritative pillars and preserves unlabeled birthplace',async()=>{
 const f=reset();f.profile={updatedAt:'2026-01-01T00:00:00Z',gender:'F',birth:{year:1988,month:1,day:7,hour:23,minute:26,calType:'solar'},location:{lat:37.5665,lng:126.978,tz:'Asia/Seoul',label:''}};
 const r=await prepareFortune(env,'owner',{profileId:'profile',productId:'saju_mackerel',question:'타고난 성향과 일의 방향을 알려주세요.'});
 const facts=Object.fromEntries(r.snapshot.analysis.contexts.saju.facts.map(f=>[f.label,f.value]));
 assert.deepEqual(facts.pillars,{year:'丁卯',month:'癸丑',day:'辛酉',hour:'己亥'});
 assert.equal(r.snapshot.natalInput.personA.birthTime,'23:26');
 assert.equal(r.snapshot.natalInput.personA.birthPlace.longitude,126.978);
 assert.deepEqual(f.prepared.snapshot.analysis.contexts.saju.facts,r.snapshot.analysis.contexts.saju.facts);
 f.profile.location={lat:35.1796,lng:129.0756,tz:'Asia/Seoul',label:''};
 const busan=await prepareFortune(env,'owner',{profileId:'profile',productId:'saju_mackerel',question:'타고난 성향과 일의 방향을 알려주세요.'});
 assert.equal(busan.snapshot.natalInput.personA.birthPlace.longitude,129.0756);
 assert.notEqual(busan.fingerprint,r.fingerprint);
 assert.equal(f.providerCalls.length,0);
});

const prior=()=>[{summary:'first'},{summary:'second'}];
const kept=f=>f.row.generationCheckpoint?.shortDrafts?.[2]?.body?.blocks?.[0]?.paragraphs[0].length;
test('D8: a length-only shortfall twice still completes the paid order with the longer draft',async()=>{
 const f=reset(prior());f.shortChars=[700,600];
 await assert.rejects(generateNextChapter(env,'owner',f.row._id),e=>e.code==='CHAPTER_TOO_SHORT');
 assert.deepEqual(f.failures,[{id:f.row._id,code:'CHAPTER_TOO_SHORT',attempt:1,stage:'quality',allowedAttempts:3}]);
 assert.equal(kept(f),700);assert.equal(f.row.generationCheckpoint.chapterDrafts,undefined,'a short draft is not a stored chapter');
 const done=await generateNextChapter(env,'owner',f.row._id);
 assert.equal(f.lastInput.repair.code,'CHAPTER_TOO_SHORT');assert.equal(f.providerCalls.length,2);
 assert.equal(done.state,'COMPLETED');
 assert.equal(f.row.chapters[2].shortDelivery,true);assert.equal(f.row.chapters[2].blocks[0].paragraphs[0].length,700);
 assert.equal(presentFortune(f.row).chapters[2].shortDelivery,undefined,'the operator flag is not public');
});

test('D8: a failed repair delivers the kept draft; an empty or cut-off reply with nothing kept is still held back',async()=>{
 let f=reset(prior());f.shortChars=[650];
 await assert.rejects(generateNextChapter(env,'owner',f.row._id));
 f.failOnce=true;
 assert.equal((await generateNextChapter(env,'owner',f.row._id)).state,'COMPLETED');
 assert.equal(f.row.chapters[2].blocks[0].paragraphs[0].length,650);assert.equal(f.row.chapters[2].shortDelivery,true);
 f=reset(prior());f.shortChars=[-1,-1,-1];
 for(let i=0;i<3;i++)await assert.rejects(generateNextChapter(env,'owner',f.row._id),/empty reply/);
 assert.equal(f.row.chapters.length,2);assert.equal(f.finishes.length,0);assert.equal(f.row.generationCheckpoint?.shortDrafts,undefined);
 assert.deepEqual(f.failures.map(x=>x.attempt),[1,2,3]);
});

test('D8: the last attempt delivers a short reply with nothing kept, and a full repair replaces a kept short draft',async()=>{
 let f=reset(prior());f.row.chapterAttempts[2]=2;f.shortChars=[500];
 assert.equal((await generateNextChapter(env,'owner',f.row._id)).state,'COMPLETED');
 assert.equal(f.row.chapters[2].shortDelivery,true);assert.equal(f.row.chapters[2].blocks[0].paragraphs[0].length,500);
 f=reset(prior());f.shortChars=[500,0];
 await assert.rejects(generateNextChapter(env,'owner',f.row._id));
 await generateNextChapter(env,'owner',f.row._id);
 assert.equal(f.row.chapters[2].shortDelivery,undefined);assert.deepEqual(f.row.chapters[2].blocks,[]);
});

test('D8: the chapter call gets the tier timeout only when the order carries the timeout policy',async()=>{
 for(const [policy,fishId,ms] of [['chapter-timeout-20261010','mackerel',120000],['chapter-timeout-20261010','flounder',180000],[undefined,'mackerel',240000]]){
  const f=reset([]);f.row.snapshot.product.fishId=fishId;if(policy)f.row.snapshot.chapterTimeoutPolicy=policy;
  await generateNextChapter(env,'owner',f.row._id);
  assert.equal(f.timeoutMs,ms,fishId);
 }
});
