import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__paidRecovery={row:null,providerCalls:[],claims:[],finishes:[],failures:[],failOnce:false};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const allowedChapterAttempts=(r,n)=>3+Number(r?.manualRecoveryGrants?.[n]||0)+Number(r?.systemRecoveryGrants?.[n]||0);export const holdAutoResumes=()=>false;export const userCanRetry=r=>globalThis.__paidRecovery.canRetry??r.errorCode==='AUTOMATIC_RECOVERY_STOPPED';
export const saveAskAnalysis=async(e,u,id,token,analysis)=>{const f=globalThis.__paidRecovery;if(!f)throw new Error("unexpected analysis");f.row.generationCheckpoint.analysis=analysis;if(f.storageFailure)throw new Error("storage uncertain");return analysis;};export const ownerId=x=>x;export const createRequest=async()=>{};export const readRequest=async()=>globalThis.__paidRecovery.row;export const attachPayment=async()=>globalThis.__paidRecovery.row;
export const claimChapter=async(e,u,id,source)=>{const f=globalThis.__paidRecovery,r=f.row;f.claims.push({id,source,chapter:r.chapters.length});if(r.state==='COMPLETED')return {row:r,token:null};r.state='GENERATING';const n=r.chapters.length;r.chapterAttempts[n]=(r.chapterAttempts[n]||0)+1;r.leaseToken='lease-'+n;return {row:r,token:r.leaseToken};};
export const finishChapter=async(e,u,id,token,ordinal,body,total)=>{const f=globalThis.__paidRecovery,r=f.row;f.finishes.push({id,token,ordinal});assertOrdinal(r.chapters.length,ordinal);r.chapters.push(body);r.completedChapters=r.chapters.length;r.state=r.chapters.length===total?'COMPLETED':'PAID';return r;};
export const failChapter=async(e,u,id,token,code,attempt,stage,allowedAttempts)=>{const f=globalThis.__paidRecovery;f.failures.push({id,code,attempt,stage,allowedAttempts});f.row.state='FORTUNE_FAILED';f.row.errorCode=code;f.row.lastFailure={code,stage};};
function assertOrdinal(actual,expected){if(actual!==expected)throw new Error('ordinal mismatch');}
`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>true;`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{constructor(env){this.env=env}async analyzeQuestion(){const f=globalThis.__paidRecovery;f.analysisCalls=(f.analysisCalls||0)+1;return JSON.stringify({questions:[{questionId:"q1",category:"career",needsTiming:false}]});}}`,
  'worker/yeongnyangi/providers/chapter':`
export class StructuredChapterProvider{async generateChapter(input){const f=globalThis.__paidRecovery,n=input.previous.length;f.lastInput=input;f.providerCalls.push(n);if(f.failOnce){f.failOnce=false;throw new Error('temporary provider failure')}return {summary:'generated-'+n,analysis:'analysis',example:'example',advice:'advice',persona:'persona',highlights:[],topics:[],blocks:[],sources:[]};}}
export const validateChapter=value=>{const f=globalThis.__paidRecovery;if(f.rejectQuality>0){f.rejectQuality--;throw new Error('invalid answer evidence');}return value;};
`,
};
const bundle=await build({stdin:{contents:"export {generateNextChapter,presentFortune} from './worker/yeongnyangi/service';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'recovery-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const normalized=args.path.replaceAll('\\','/');const key=Object.keys(replacements).find(item=>normalized.endsWith(item)||normalized.endsWith(item+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('yeongnyangi-paid-recovery-contract.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {generateNextChapter,presentFortune}=loaded.exports;
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
