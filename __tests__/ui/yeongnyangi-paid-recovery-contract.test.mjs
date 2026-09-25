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
  'worker/yeongnyangi/repository.js':`
export const saveAskAnalysis=async(e,u,id,token,analysis)=>{const f=globalThis.__paidRecovery;if(!f)throw new Error("unexpected analysis");f.row.generationCheckpoint.analysis=analysis;if(f.storageFailure)throw new Error("storage uncertain");return analysis;};export const ownerId=x=>x;export const createRequest=async()=>{};export const readRequest=async()=>globalThis.__paidRecovery.row;export const attachPayment=async()=>globalThis.__paidRecovery.row;
export const claimChapter=async(e,u,id,source)=>{const f=globalThis.__paidRecovery,r=f.row;f.claims.push({id,source,chapter:r.chapters.length});if(r.state==='COMPLETED')return {row:r,token:null};r.state='GENERATING';const n=r.chapters.length;r.chapterAttempts[n]=(r.chapterAttempts[n]||0)+1;r.leaseToken='lease-'+n;return {row:r,token:r.leaseToken};};
export const finishChapter=async(e,u,id,token,ordinal,body,total)=>{const f=globalThis.__paidRecovery,r=f.row;f.finishes.push({id,token,ordinal});assertOrdinal(r.chapters.length,ordinal);r.chapters.push(body);r.completedChapters=r.chapters.length;r.state=r.chapters.length===total?'COMPLETED':'PAID';return r;};
export const failChapter=async(e,u,id,token,code,attempt,stage,allowedAttempts)=>{const f=globalThis.__paidRecovery;f.failures.push({id,code,attempt,stage,allowedAttempts});f.row.state='FORTUNE_FAILED';f.row.errorCode=code;};
function assertOrdinal(actual,expected){if(actual!==expected)throw new Error('ordinal mismatch');}
`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>true;`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{constructor(env){this.env=env}async analyzeQuestion(){const f=globalThis.__paidRecovery;f.analysisCalls=(f.analysisCalls||0)+1;return JSON.stringify({questions:[{questionId:"q1",category:"career",needsTiming:false}]});}}`,
  'worker/yeongnyangi/providers/chapter':`
export class StructuredChapterProvider{async generateChapter(input){const f=globalThis.__paidRecovery,n=input.previous.length;f.lastInput=input;f.providerCalls.push(n);if(f.failOnce){f.failOnce=false;throw new Error('temporary provider failure')}return {summary:'generated-'+n,analysis:'analysis',example:'example',advice:'advice',persona:'persona',highlights:[],topics:[],blocks:[],sources:[]};}}
export const validateChapter=value=>value;
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
