import '../../scripts/lib/mock-network-guard.cjs';
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const repository=`
const state=()=>globalThis.__storedChapterTest;
export const ownerId=x=>x,allowedChapterAttempts=()=>2,holdAutoResumes=()=>false,userCanRetry=()=>false;
export const createRequest=async()=>{},attachPayment=async()=>{},reserveQuestionSkyFollowup=async()=>{},commitTarotDraw=async()=>{};
export const saveAskAnalysis=async()=>{state().analysisCalls++;throw Error('unexpected analysis');};
export const saveChapterDraft=async()=>{state().draftWrites++;};
export const readRequest=async()=>{const s=state();s.reads++;if(s.readError)throw s.readError;return s.row;};
export const claimChapter=async(_e,_u,_r,_source,options)=>{
 const s=state();s.claims++;s.claimOptions=options;
 if(s.row.chapters.length>=s.row.snapshot.manifest.length){s.row.state='COMPLETED';return {row:s.row,token:null};}
 if(s.removeDraftOnClaim)s.row.generationCheckpoint.chapterDrafts={};
 s.row.state='GENERATING';return {row:s.row,token:'lease'};
};
export const finishChapter=async(_e,_u,_r,_t,_n,body)=>{
 const s=state();s.finishes++;s.row.chapters.push(body);s.row.state='COMPLETED';
 if(s.loseFinishResponse)throw Error('response lost after commit');
 return s.row;
};
export const failChapter=async()=>{state().failures++;};
`;
const replacements={
 'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={};`,
 'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
 'worker/yeongnyangi/repository.js':repository,
 'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
 'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{constructor(){globalThis.__storedChapterTest.providerInstances++;}async generate(){globalThis.__storedChapterTest.providerCalls++;throw Error('unexpected provider');}async analyzeQuestion(){globalThis.__storedChapterTest.analysisCalls++;throw Error('unexpected analysis');}}`,
};
const bundle=await build({stdin:{contents:"export {generateNextChapter} from './worker/yeongnyangi/service';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-stored-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('stored-chapter-service-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {generateNextChapter}=loaded.exports;
const body={summary:'Already validated paid chapter',sections:[{id:'action',text:'A saved action.'}]};
beforeEach(()=>{
 globalThis.__storedChapterTest={claims:0,finishes:0,failures:0,reads:0,analysisCalls:0,providerInstances:0,providerCalls:0,draftWrites:0,row:{
  _id:'id',userId:'owner',state:'PAID',featureKey:'yeongnyangi-saju-mackerel',productId:'saju_mackerel',
  chapters:[],chapterAttempts:{0:2},attempts:2,snapshot:{manifest:[{id:'first'}]},
  generationCheckpoint:{version:'ask-generation-v1',chapterDrafts:{0:{raw:'saved raw',body:structuredClone(body)}}}
 }};
});
const disabled={LLM_DRY_RUN:'true'};
test('provider disabled with attempt two restores saved body without analysis, construction, calls or attempts',async()=>{
 const state=globalThis.__storedChapterTest;
 const result=await generateNextChapter(disabled,'owner','id');
 assert.equal(result.state,'COMPLETED');assert.deepEqual(result.chapters,[body]);
 assert.equal(state.row.attempts,2);assert.equal(state.row.chapterAttempts[0],2);
 assert.deepEqual(state.claimOptions,{storedOnly:true});
 for(const field of ['analysisCalls','providerInstances','providerCalls','draftWrites','failures'])assert.equal(state[field],0,field);
});
test('complete stored chapters recover their final marker with zero provider calls',async()=>{
 const state=globalThis.__storedChapterTest;state.row.chapters=[structuredClone(body)];state.row.state='GENERATING';
 const result=await generateNextChapter(disabled,'owner','id');
 assert.equal(result.state,'COMPLETED');assert.equal(state.finishes,0);assert.equal(state.providerCalls,0);assert.equal(state.row.attempts,2);
});
test('an empty draft cannot reserve a generation attempt while disabled',async()=>{
 const state=globalThis.__storedChapterTest;state.row.generationCheckpoint.chapterDrafts[0].body={};state.row.attempts=0;state.row.chapterAttempts={};
 await assert.rejects(generateNextChapter(disabled,'owner','id'),error=>error.code==='LLM_NOT_CONFIGURED');
 assert.equal(state.claims,0);assert.equal(state.row.attempts,0);assert.equal(state.providerCalls,0);
});
test('a changed claim never falls through to a provider call',async()=>{
 const state=globalThis.__storedChapterTest;state.removeDraftOnClaim=true;
 await assert.rejects(generateNextChapter(disabled,'owner','id'),error=>error.code==='LLM_NOT_CONFIGURED');
 assert.equal(state.providerInstances,0);assert.equal(state.providerCalls,0);assert.equal(state.row.attempts,2);
});
test('lost finish response rereads the durable result without another call or failure checkpoint',async()=>{
 const state=globalThis.__storedChapterTest;state.loseFinishResponse=true;
 const result=await generateNextChapter(disabled,'owner','id');
 assert.equal(result.state,'COMPLETED');assert.deepEqual(result.chapters,[body]);
 assert.equal(state.finishes,1);assert.equal(state.reads,2);assert.equal(state.failures,0);assert.equal(state.providerCalls,0);
});
test('paid proof failure blocks even a stored draft',async()=>{
 const state=globalThis.__storedChapterTest;state.readError=Object.assign(Error('payment proof'),{code:'PAYMENT_NOT_ACTIVE'});
 await assert.rejects(generateNextChapter(disabled,'owner','id'),error=>error.code==='PAYMENT_NOT_ACTIVE');
 assert.equal(state.claims,0);assert.equal(state.finishes,0);assert.equal(state.providerCalls,0);
});
