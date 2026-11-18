import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
process.env.TZ='UTC';
const require=createRequire(import.meta.url),Module=require('node:module');
// S9-Y: a 45-chapter omakase (fusion_all) order through the real service, chapter provider, delivery repair and
// refund policy. Only storage, the queue and the Gemini call are replaced. The repository keeps the real budget:
// AUTOMATIC_CHAPTER_ATTEMPTS, two system grants, then a review hold, and UNBILLED_ATTEMPT_RETURNS per chapter.
const replacements={
 'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:()=>({lean:async()=>({updatedAt:null,birth:{year:1997,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},gender:'F',location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
 'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
 'worker/yeongnyangi/repository.js':`
import {AUTOMATIC_CHAPTER_ATTEMPTS,SYSTEM_CHAPTER_RETRY_GRANT,UNBILLED_ATTEMPT_RETURNS} from './chapter-retry-policy.js';
const sim=()=>globalThis.__sim;
export const commitTarotDraw=async()=>{throw new Error('unexpected tarot draw');};export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected');};
export const allowedChapterAttempts=(row,n)=>AUTOMATIC_CHAPTER_ATTEMPTS+(row.systemGrants?.[n]||0);
export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const ownerId=x=>x;
export const createRequest=async(e,u,id,v)=>{sim().row??={...v,_id:id,userId:u,state:'CREATED',chapters:[],chapterAttempts:{},systemGrants:{},unbilledReturns:{}};return sim().row;};
export const readRequest=async()=>sim().row;
export const attachPayment=async()=>{throw new Error('no payment in test');};
export const claimChapter=async()=>{const row=sim().row;if(row.chapters.length>=row.snapshot.manifest.length){row.state='COMPLETED';return {row};}
 if(!['PAID','GENERATING'].includes(row.state))return {row};const i=row.chapters.length;
 row.chapterAttempts[i]=(row.chapterAttempts[i]||0)+1;row.state='GENERATING';row.leaseToken='lease';return {row,token:'lease'};};
export const saveChapterDraft=async(e,u,id,t,i,d,kind='chapterDrafts')=>{const r=sim().row;r.generationCheckpoint||={};r.generationCheckpoint[kind]||={};r.generationCheckpoint[kind][i]=structuredClone(d);};
export const saveAskAnalysis=async()=>{throw new Error('unexpected ask analysis');};
// finishChapter drops the chapter's draft with the commit (d4a0ec481), so the refund gate never sees a stale draft.
export const finishChapter=async(e,u,id,t,i,body,total)=>{const r=sim().row;r.chapters.push(structuredClone(body));delete r.generationCheckpoint?.chapterDrafts?.[i];
 r.state=r.chapters.length===total?'COMPLETED':'PAID';r.leaseToken='';r.errorCode='';return r;};
export const failChapter=async(e,u,id,t,code,attempt,stage,allowed,detail,i,receipt)=>{const r=sim().row;sim().failures.push({i,code,stage,unbilled:!!receipt?.unbilled});
 r.leaseToken='';r.lastFailure={code,stage};
 if(receipt?.unbilled&&(r.unbilledReturns[i]||0)<UNBILLED_ATTEMPT_RETURNS){r.unbilledReturns[i]=(r.unbilledReturns[i]||0)+1;r.chapterAttempts[i]--;r.state='PAID';return;}
 if(attempt<allowed){r.state='PAID';return;}
 // AUTOMATIC_RECOVERY_STOPPED: the recovery cron grants the system retries, then holds the order for the refund settlement.
 if((r.systemGrants[i]||0)<SYSTEM_CHAPTER_RETRY_GRANT){r.systemGrants[i]=(r.systemGrants[i]||0)+1;r.state='PAID';return;}
 r.state='FORTUNE_FAILED';r.errorCode='GENERATION_REVIEW_REQUIRED';r.leaseUntil=null;};`,
 'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
 'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(request){return globalThis.__simGenerate(this,request);}}`,
};
const bundle=await build({stdin:{contents:"export {prepareFortune,generateNextChapter} from './worker/yeongnyangi/service'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {FortuneError} from './worker/yeongnyangi/fortune/shared/contracts'; export {canReserveDeliveryRefund} from './worker/yeongnyangi/terminal-refund-policy.js';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts',resolveDir:path.dirname(args.path)}:undefined;});}}]});
const loaded=new Module(path.resolve('omakase-delivery-simulation.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const m=loaded.exports;
const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};

// plan(chapter, call) -> 'ok' | 'misordered' | 'repeat-summary' | 'truncated' | '429' | 'garbage'
async function run(plan){
 globalThis.__sim={row:null,failures:[],calls:{}};
 const s=globalThis.__sim;
 globalThis.__simGenerate=async(provider,request)=>{
  const row=s.row,i=row.chapters.length,chapter=row.snapshot.manifest[i],n=s.calls[i]=(s.calls[i]||0)+1,kind=plan(i,n);
  if(kind==='429'){provider.receipt={provider:'gemini',model:'gemini-2.5-flash',finishReason:'',status:429,unbilled:true};throw new m.FortuneError('FORTUNE_PROVIDER_FAILED',502);}
  provider.receipt={provider:'gemini',model:'gemini-2.5-flash',finishReason:'STOP',status:200};
  if(kind==='garbage')return {provider:'gemini',model:'gemini-2.5-flash',result:'{"chapterId":"'+chapter.id+'","blocks":[{"id":'};
  const body=await new m.MockChapterProvider().generateChapter({chapter,analysis:row.snapshot.analysis,previous:row.chapters});
  let out={chapterId:chapter.id,complete:true,...body};
  if(kind==='misordered')out={...out,blocks:[...out.blocks].reverse()};
  if(kind==='repeat-summary'&&row.chapters.length)out={...out,summary:row.chapters.at(-1).summary};
  // Cut at the token cap inside the last field, after every section block closed.
  if(kind==='truncated'){const text=JSON.stringify({...out,closing:'다음 장으로 이어지는 마무리 문장이 길게 이어진다'});
   throw Object.assign(new m.FortuneError('CHAPTER_TRUNCATED',502),{truncatedText:text.slice(0,-10)});}
  return {provider:'gemini',model:'gemini-2.5-flash',result:JSON.stringify(out)};
 };
 const row=await m.prepareFortune(env,'owner',{productId:'fusion_all',profileId:'self',timezone:'Asia/Seoul',consultationKind:'personal'});
 assert.equal(row.snapshot.product.fishId,'omakase');assert.equal(row.snapshot.manifest.length,45);
 row.paymentId='mock-access';row.state='PAID';
 // The queue consumer: every message runs one chapter step until the order completes or is held. Never stuck.
 let steps=0;
 while(!['COMPLETED','FORTUNE_FAILED'].includes(row.state)&&steps<400){steps++;try{await m.generateNextChapter(env,'owner',row._id);}catch{/* failChapter already recorded it */}}
 assert.ok(steps<400,'the order must reach a terminal state');
 return {row,steps,failures:s.failures,calls:s.calls};
}

test('S9-Y: a 45-chapter omakase order with misordered blocks, repeated summaries, cut replies and 429s is delivered in full',async()=>{
 const kinds=['ok','misordered','repeat-summary','truncated','429x2','429x3'];
 const plan=(i,n)=>{const k=kinds[i%kinds.length];if(k.startsWith('429x'))return n<=Number(k.slice(4))?'429':'ok';return n===1?k:'ok';};
 const {row,failures,calls}=await run(plan);
 assert.equal(row.state,'COMPLETED');assert.equal(row.chapters.length,45);
 // Format problems are repaired locally: misordered blocks and a repeated summary never buy another call.
 for(let i=0;i<45;i++){
  const k=kinds[i%kinds.length];
  if(['ok','misordered','repeat-summary'].includes(k))assert.equal(calls[i],1,`chapter ${i} (${k})`);
  if(k==='truncated')assert.ok(calls[i]<=2,`chapter ${i} truncated`);
  if(k.startsWith('429x'))assert.equal(calls[i],Number(k.slice(4))+1,`chapter ${i} (${k})`);
 }
 const manifest=row.snapshot.manifest;
 row.chapters.forEach((chapter,i)=>{
  if(manifest[i].sections?.length)assert.deepEqual(chapter.blocks.map(b=>b.id),manifest[i].sections.map(s=>s.id),`chapter ${i} section order`);
  if(i)assert.notEqual(chapter.summary,row.chapters[i-1].summary,`chapter ${i} summary repeats the previous chapter`);
 });
 // Gemini's unbilled refusals handed every attempt back: no chapter used more than one billed attempt for them.
 assert.ok(failures.filter(f=>f.code==='FORTUNE_PROVIDER_FAILED').every(f=>f.unbilled));
 for(let i=0;i<45;i++)if(kinds[i%kinds.length].startsWith('429x'))assert.equal(row.chapterAttempts[i],1,`chapter ${i} billed attempts`);
 assert.deepEqual(row.generationCheckpoint.chapterDrafts||{},{},'committed chapters leave no draft behind');
});

test('S9-Y: an omakase chapter that never yields a usable reply stops within its budget and reaches the automatic refund',async()=>{
 const broken=20;
 const {row,failures,calls}=await run((i,n)=>i===broken?(n<=3?'429':'garbage'):i%5===1?'misordered':'ok');
 assert.equal(row.state,'FORTUNE_FAILED');assert.equal(row.errorCode,'GENERATION_REVIEW_REQUIRED');
 assert.equal(row.chapters.length,broken,'chapters before the broken one are delivered and kept');
 // 3 unbilled 429s are handed back, then 3 automatic + 2 system billed attempts. Nothing more is bought.
 assert.equal(calls[broken],3+3+2);
 assert.equal(failures.filter(f=>f.i===broken&&!f.unbilled).length,5);
 // The refund settlement accepts it: no draft is pending and the order is a supported paid hold.
 assert.equal(m.canReserveDeliveryRefund(row,{retryable:false}),true);
});
