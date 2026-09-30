import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
process.env.TZ='UTC';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__invariance={rows:new Map()};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:filter=>({lean:async()=>({updatedAt:null,birth:{year:filter.profileId==='partner'?1994:1997,month:2,day:10,hour:12,minute:0,timeUnknown:filter.profileId==='notime',calType:'solar'},gender:'F',location:filter.profileId==='noplace'?{}:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`
  const db=()=>globalThis.__invariance.rows;
  export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected')};
  export const allowedChapterAttempts=()=>3; export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const ownerId=x=>x;
  export const createRequest=async(e,u,id,v)=>{if(!db().has(id))db().set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[],chapterAttempts:{}});return db().get(id)};
  export const readRequest=async(e,u,id)=>{if(!db().has(id))throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return db().get(id)};
  export const attachPayment=async()=>{throw new Error('no payment in test')};
  export const claimChapter=async(e,u,id)=>{const row=await readRequest(e,u,id);if(row.state==='COMPLETED')return {row};const i=row.chapters.length;if((row.chapterAttempts[i]||0)>=3)return {row};row.chapterAttempts[i]=(row.chapterAttempts[i]||0)+1;row.state='GENERATING';row.leaseToken='mock-lease';return {row,token:row.leaseToken}};
  export const saveChapterDraft=async(e,u,id,t,i,d)=>{const r=await readRequest(e,u,id);r.generationCheckpoint||={};r.generationCheckpoint.chapterDrafts||={};r.generationCheckpoint.chapterDrafts[i]=structuredClone(d)};
  export const saveAskAnalysis=async(e,u,id,t,a)=>{(await readRequest(e,u,id)).generationCheckpoint.analysis=a};
  export const finishChapter=async(e,u,id,t,i,body,total)=>{if(globalThis.__failStoreOnce){globalThis.__failStoreOnce=false;throw new Error('mock storage interruption')}const r=await readRequest(e,u,id);r.chapters.push(structuredClone(body));r.state=r.chapters.length===total?'COMPLETED':'PAID';return r};
  export const failChapter=async(e,u,id,t,code,n,stage)=>{const r=await readRequest(e,u,id);r.state='FORTUNE_FAILED';r.lastFailure={code,stage}};`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(request){return globalThis.__fusionGenerate(request)}}`,
};
const bundle=await build({stdin:{contents:"export {prepareFortune,generateNextChapter,presentFortune} from './worker/yeongnyangi/service'; export * from './worker/yeongnyangi/fortune/consultation-kinds'; export {products} from './worker/yeongnyangi/payments/catalog'; export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts'; export {topicIds} from './worker/yeongnyangi/fortune/topics'; export {readingLocale} from './worker/yeongnyangi/fortune/reading-locale'; export {analyzeAsk} from './worker/yeongnyangi/fortune/ask/analysis'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('reading-invariance-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const m=loaded.exports;


// Real calculators, manifests, prompt construction, validation and delivery; only I/O is replaced.
const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
const ids=['fusion_saju_ziwei','fusion_sukuyo_vedic','fusion_astrology_tarot','fusion_all'];
for(const productId of ids)test(`${productId}: engine -> snapshot -> every prompt -> durable resume`,async()=>{
 globalThis.__invariance.rows=new Map();
 const row=await m.prepareFortune(env,'owner',{productId,profileId:'self',timezone:'Asia/Seoul',consultationKind:'personal'});
 const snapshot=structuredClone(row.snapshot),product=row.snapshot.product;
 assert.deepEqual(Object.keys(snapshot.analysis.contexts).sort(),[...product.systems].sort());
 for(const system of product.systems){const c=snapshot.analysis.contexts[system];assert.equal(c.domain,system);assert.ok(c.engineVersion);assert.ok(c.facts.length);assert.ok(c.facts.every(f=>f.id.startsWith(system+'.')));}
 assert.equal(snapshot.manifest.length,productId==='fusion_all'?29:19);
 assert.equal(snapshot.manifest.at(-1).key,'prevention');
 assert.deepEqual(snapshot.manifest.at(-1).systems,product.systems);
 const seen=[],outputs=[];
 globalThis.__fusionGenerate=async request=>{
  const chapter=row.snapshot.manifest[row.chapters.length];
  const facts=request.calculatedData.facts;
  assert.deepEqual([...new Set(facts.map(f=>f.id.split('.')[0]))].sort(),[...chapter.systems].sort(),chapter.title);
  const rules=JSON.parse(request.domainRules);
  assert.deepEqual(rules.chapter.factSelectors,chapter.factSelectors);
  for(const system of chapter.systems){
   const selected=m.selectChapterFacts(snapshot.analysis.contexts[system],chapter);
   assert.ok(selected.length,`${chapter.title}: ${system} facts`);
   assert.ok(facts.some(f=>selected.some(s=>s.id===f.id)),`${chapter.title}: ${system} prompt`);
  }
  seen.push(chapter.id);
  const input={chapter,analysis:row.snapshot.analysis,previous:row.chapters};
  const body=await new m.MockChapterProvider().generateChapter(input);
  outputs.push(body);
  return {provider:'mock',model:'fixture',result:body};
 };
 row.paymentId='mock-access';row.state='PAID';
 // Fail after durable draft, before final chapter commit. Resume must reuse it without a provider call.
 globalThis.__failStoreOnce=true;
 await assert.rejects(()=>m.generateNextChapter(env,'owner',row._id),/storage interruption/);
 assert.equal(row.chapters.length,0);assert.ok(row.generationCheckpoint.chapterDrafts[0]);
 await m.generateNextChapter(env,'owner',row._id);
 assert.equal(seen.length,1);assert.equal(row.chapters.length,1);
 for(let i=1;i<snapshot.manifest.length;i++)await m.generateNextChapter(env,'owner',row._id);
 assert.equal(row.state,'COMPLETED');assert.equal(new Set(seen).size,snapshot.manifest.length);assert.equal(seen.length,snapshot.manifest.length);
 assert.equal(new Set(row.chapters.map(c=>c.summary)).size,snapshot.manifest.length);
 const count=seen.length;await m.generateNextChapter(env,'owner',row._id);assert.equal(seen.length,count);
 assert.deepEqual(row.snapshot,snapshot);
 assert.deepEqual(m.presentFortune(row).chapters,row.chapters);
 assert.equal(m.presentFortune(row).recovery.nextAction,'reread');
 // Same-body and foreign/missing-system evidence cannot pass as a new chapter.
 const c=snapshot.manifest.at(-1),input={chapter:c,analysis:snapshot.analysis,previous:[]};
 const good=outputs.at(-1);
 assert.throws(()=>m.validateChapter({...good,sources:['invented.fact']},input),/INVALID_EVIDENCE/);
 assert.throws(()=>m.validateChapter(good,{...input,previous:[good]}),/DUPLICATE_CHAPTER/);
 const missing=structuredClone(good);missing.blocks.find(b=>b.id==='evidence').sources=good.sources.filter(id=>!id.startsWith(product.systems.at(-1)+'.'));
 assert.throws(()=>m.validateChapter(missing,input),/CHAPTER_EVIDENCE_INCOMPLETE/);
});
for(const productId of ids)test(`${productId}: ask retry keeps the original snapshot and tarot draw`,async()=>{
 globalThis.__invariance.rows=new Map();
 const body={productId,profileId:'self',timezone:'Asia/Seoul',consultationKind:'ask',question:'일과 관계에서 무엇부터 살펴볼까요?'};
 const row=await m.prepareFortune(env,'owner',body),snapshot=structuredClone(row.snapshot);
 assert.equal(row.generationCheckpoint.version,'ask-generation-v1');
 const repeated=await m.prepareFortune(env,'owner',body);
 assert.equal(repeated._id,row._id);assert.deepEqual(repeated.snapshot,snapshot);
 assert.deepEqual(repeated.snapshot.manifest[0].systems,repeated.snapshot.product.systems);
 if(snapshot.analysis.contexts.tarot){
  const cards=snapshot.analysis.contexts.tarot.facts.find(f=>f.label==='cards');
  assert.ok(cards.value.length);assert.deepEqual(repeated.snapshot.analysis.contexts.tarot.facts.find(f=>f.label==='cards'),cards);
 }
});
