import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
// Yeoni and Neo share the Yeongnyangi chapter pipeline. Only the speaking-voice segment of the system prompt may differ.
// All calls are mocks: the chapter provider captures the request and never reaches an LLM.
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__personaTest={rows:new Map()};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:()=>({lean:async()=>({updatedAt:null,birth:{year:1997,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},gender:'F',location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected followup');};export const allowedChapterAttempts=()=>3;export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const saveChapterDraft=async()=>{};export const saveAskAnalysis=async()=>{};export const ownerId=x=>x;export const createRequest=async(e,u,id,v)=>{const m=globalThis.__personaTest.rows;if(!m.has(id))m.set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[]});return m.get(id)};export const readRequest=async(e,u,id)=>globalThis.__personaTest.rows.get(id);export const attachPayment=async()=>{};export const claimChapter=async()=>{throw new Error('unexpected claim');};export const finishChapter=async()=>{};export const failChapter=async()=>{};`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(){throw new Error('UNEXPECTED_PROVIDER_CALL')}}`,
};
const bundle=await build({stdin:{contents:"export {prepareFortune} from './worker/yeongnyangi/service'; export {StructuredChapterProvider,personaPrompt} from './worker/yeongnyangi/providers/chapter'; export {persona as yeongnyangiPersona} from './worker/yeongnyangi/prompts/persona/yeongnyangi'; export {persona as yeoniPersona} from './worker/yeongnyangi/prompts/persona/yeoni'; export {persona as neoPersona} from './worker/yeongnyangi/prompts/persona/neo';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('persona-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const m=loaded.exports;
const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
const voices={undefined:m.yeongnyangiPersona,yeoni:m.yeoniPersona,neo:m.neoPersona};

async function capture(input){
 let sent;
 try{await new m.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}}).generateChapter(input);}catch{}
 assert.ok(sent,'request reached the provider');
 return sent;
}

test('persona selector falls back to Yeongnyangi and the chat voices stay free of cat speech',()=>{
 assert.equal(m.personaPrompt(),m.yeongnyangiPersona);
 assert.equal(m.personaPrompt('yeoni'),m.yeoniPersona);
 assert.equal(m.personaPrompt('neo'),m.neoPersona);
 assert.equal(m.personaPrompt('other'),m.yeongnyangiPersona);
 for(const voice of [m.yeoniPersona,m.neoPersona]){
  assert.doesNotMatch(voice,/냥|영냥|생선/);
  assert.match(voice,/결론의 방향을 바꾸지 않는다/);
  assert.match(voice,/확정 예언은 금지/);
 }
});

test('every chapter request differs only in the persona segment of the system prompt',async()=>{
 const row=await m.prepareFortune(env,'persona-owner',{productId:'saju_mackerel',profileId:'self',timezone:'Asia/Seoul',topicId:'general',question:'올해 이직을 준비해도 될까요?'});
 assert.equal(row.snapshot.manifest.length,5);
 for(const chapter of row.snapshot.manifest){
  const base={locale:'ko',chapter,analysis:row.snapshot.analysis,previous:[]};
  const sent=Object.fromEntries(await Promise.all(Object.keys(voices).map(async id=>[id,await capture(id==='undefined'?base:{...base,persona:id})])));
  for(const id of ['yeoni','neo']){
   const {system:a,...restA}=sent.undefined,{system:b,...restB}=sent[id];
   assert.deepEqual(restB,restA,`${chapter.id}/${id}`);
   assert.ok(a.includes(voices.undefined)&&b.includes(voices[id]));
   assert.equal(b.replace(voices[id],'<persona>'),a.replace(voices.undefined,'<persona>'),`${chapter.id}/${id}`);
   assert.doesNotMatch(b,/영냥이/);
  }
 }
});
