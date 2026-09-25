import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__kindTest={rows:new Map(),calls:0};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:filter=>({lean:async()=>({updatedAt:null,birth:{year:filter.profileId==='partner'?1994:1997,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},gender:'F',location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const saveAskAnalysis=async()=>{throw new Error("unexpected analysis checkpoint")};export const ownerId=x=>x;export const createRequest=async(e,u,id,v)=>{const m=globalThis.__kindTest.rows;if(!m.has(id))m.set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[]});return m.get(id)};export const readRequest=async(e,u,id)=>{if(globalThis.__kindTest.readError)throw Object.assign(new Error('database unavailable'),{code:'RESULT_STORAGE_UNAVAILABLE'});const row=globalThis.__kindTest.rows.get(id);if(!row)throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return row;};export const attachPayment=async()=>{};export const claimChapter=async()=>({row:globalThis.__kindTest.claim,token:'lease'});export const finishChapter=async()=>{};export const failChapter=async()=>{};`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(){globalThis.__kindTest.calls++;throw new Error('UNEXPECTED_PROVIDER_CALL')}}`,
};
const bundle=await build({stdin:{contents:"export * from './worker/yeongnyangi/service'; export * from './worker/yeongnyangi/fortune/consultation-kinds'; export {products} from './worker/yeongnyangi/payments/catalog'; export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {validateChapter} from './worker/yeongnyangi/providers/chapter';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('spirit-service-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {prepareFortune,presentFortune,generateNextChapter}=loaded.exports;

const {consultationKinds,consultationDomain,consultationManifest,supportsKind,resolveConsultationKind,products,selectChapterFacts}=loaded.exports;
const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
const body={productId:'saju_mackerel',profileId:'self',timezone:'Asia/Seoul',topicId:'general'};
test('all offered modes preserve paid chapter depth and have complete unique titles',()=>{
 for(const p of products)for(const k of consultationKinds[consultationDomain(p)]){
  if(!supportsKind(p,k)){assert.throws(()=>resolveConsultationKind(p,k.id));continue;}
  const rows=consultationManifest(p,k);
  assert.equal(rows.length,p.chapterCount,`${p.id}/${k.id}`);
  assert.equal(new Set(rows.map(r=>r.title)).size,rows.length);
  assert.ok(rows.every(r=>r.title&&r.focus&&r.minimumChars>0));
 }
});
test('mode snapshots isolate intents and discard hidden free questions',async()=>{
 const personal=await prepareFortune(env,'owner',{...body,consultationKind:'personal',question:'숨겨진 이전 질문'});
 const work=await prepareFortune(env,'owner',{...body,consultationKind:'work'});
 const ask=await prepareFortune(env,'owner',{...body,consultationKind:'ask',question:'일을 바꿀까요?'});
 assert.equal(personal.snapshot.analysis.consultation.question,'');
 assert.equal(personal.snapshot.analysis.consultation.consultationKind,'personal');
 assert.equal(new Set([personal._id,work._id,ask._id]).size,3);
 assert.ok(work.snapshot.manifest[0].title.includes('재능'));
 assert.equal(ask.snapshot.analysis.consultation.questions.length,1);
 assert.equal(personal.amountKRW,work.amountKRW);
 personal.paymentId='original';personal.state='COMPLETED';personal.chapters=[{summary:'original'}];
 const replay=await prepareFortune(env,'owner',{...body,consultationKind:'personal'});
 assert.equal(replay.paymentId,'original');assert.equal(replay.chapters[0].summary,'original');
 assert.equal(globalThis.__kindTest.calls,0);
});
test('compatibility owns two actual saju calculations and no invented relationship score',async()=>{
 const row=await prepareFortune(env,'owner',{...body,consultationKind:'compatibility',partnerProfileId:'partner'});
 const facts=selectChapterFacts(row.snapshot.analysis.contexts.saju,row.snapshot.manifest[0]);
 const partner=facts.find(f=>f.label==='partnerChart');assert.ok(partner?.value.pillars);
 assert.notDeepEqual(partner.value.pillars,facts.find(f=>f.label==='pillars').value);
 assert.ok(facts.find(f=>f.label==='relationshipComparison'));
 assert.equal(row.snapshot.analysis.contexts.sukuyo,undefined);
 assert.ok(presentFortune({...row,paymentId:'paid',state:'COMPLETED'}).charts[0].groups.some(g=>g.label==='상대 일주'));
});
test('invalid modes, missing questions/partners and unsupported tiers fail before purchase',async()=>{
 for(const extra of [{consultationKind:'bad'},{consultationKind:'ask'},{consultationKind:'compatibility'},{consultationKind:'compatibility',partnerProfileId:'self'},{consultationKind:'timing'},{consultationKind:'personal',partnerProfileId:'partner'}])await assert.rejects(()=>prepareFortune(env,'owner',{...body,...extra}));
 const timing=await prepareFortune(env,'owner',{...body,productId:'saju_tuna',consultationKind:'timing'});
 assert.ok(selectChapterFacts(timing.snapshot.analysis.contexts.saju,timing.snapshot.manifest[0]).some(f=>f.label==='majorLuck'));
 await assert.rejects(()=>prepareFortune(env,'owner',{...body,productId:'saju_tuna',consultationKind:'timing',timeUnknown:true}));
});
test('old requests retain legacy shape and question behavior',async()=>{
 const row=await prepareFortune(env,'owner',{...body,question:'기존 질문'});
 assert.equal(row.snapshot.analysis.consultation.consultationKind,undefined);
 assert.equal(row.snapshot.analysis.consultation.question,'기존 질문');
 assert.equal(row.generationCheckpoint,undefined);
});

test('only explicit question menus save private evidence packets without changing paid manifests',async()=>{
 for(const productId of ['saju_mackerel','ziwei_mackerel','vedic_mackerel','astrology_mackerel','sukuyo_mackerel','tarot_mackerel','fusion_saju_ziwei']) {
  const product=products.find(p=>p.id===productId);
  const request={...body,productId,consultationKind:productId.startsWith('tarot')?'choice':'ask',
   question:'첫 질문의 근거를 확인해 주세요.',locale:'ja'};
  const row=await prepareFortune(env,'evidence-owner',request);
  const packet=row.generationCheckpoint.evidence;
  assert.equal(row.generationCheckpoint.version,'ask-generation-v1');
  assert.equal(row.snapshot.askEvidence,undefined,'purchase snapshot stays unchanged');
  assert.equal(packet.packet_version,'ask-evidence-v1');
  assert.equal(packet.locale,'ja');
  assert.ok(packet.facts.length);
  assert.equal(row.amountKRW,product.priceKRW);
  assert.equal(row.snapshot.manifest.length,product.chapterCount);
  assert.equal(presentFortune(row).askEvidence,undefined,'raw packet is not a public API field');
  assert.deepEqual(await prepareFortune(env,'evidence-owner',request),row);
 }
 assert.equal(globalThis.__kindTest.calls,0);
});

test('tarot retries reuse the first stored draw; storage uncertainty blocks a new draw',async()=>{
 const request={...body,productId:'tarot_mackerel',consultationKind:'choice',question:'저장된 카드를 다시 확인해 주세요.'};
 const row=await prepareFortune(env,'tarot-owner',request);
 const before=structuredClone(row.snapshot);
 const rng=crypto.getRandomValues;
 crypto.getRandomValues=()=>{throw new Error('unexpected redraw');};
 try {
  assert.equal(await prepareFortune(env,'tarot-owner',request),row);
  assert.deepEqual(row.snapshot,before);
  globalThis.__kindTest.readError=true;
  await assert.rejects(()=>prepareFortune(env,'tarot-owner',request),error=>error.code==='RESULT_STORAGE_UNAVAILABLE');
 } finally {crypto.getRandomValues=rng;delete globalThis.__kindTest.readError;}
});

test('v6 intent cannot reuse a paid v5 snapshot and old reads retain their purchased depth',async()=>{
 const product=products.find(p=>p.id===body.productId),current=structuredClone(product);
 let legacy;
 try{
  product.manifestVersion='destiny-book-v5';
  legacy=await prepareFortune(env,'version-owner',{...body,consultationKind:'personal'});
  legacy.snapshot=structuredClone(legacy.snapshot);
  legacy.paymentId='legacy-paid';legacy.state='COMPLETED';legacy.chapters=[{summary:'saved v5 prose'}];
 }finally{Object.assign(product,current);}
 const before=structuredClone(legacy);
 const fresh=await prepareFortune(env,'version-owner',{...body,consultationKind:'personal'});
 assert.notEqual(fresh._id,legacy._id);
 assert.equal(fresh.snapshot.product.manifestVersion,'destiny-book-v6');
 assert.equal(fresh.snapshot.manifest[0].version,'destiny-book-v6');
 assert.deepEqual(legacy,before);
 assert.equal(presentFortune(legacy).manifest[0].version,'destiny-book-v5');
 assert.equal(presentFortune(legacy).chapters[0].summary,'saved v5 prose');
 assert.equal(globalThis.__kindTest.calls,0);
});

test('new paid compatibility and timing chapters satisfy existing v5 quality and source validation',async()=>{
 for(const [consultationKind,productId,partnerProfileId] of [['compatibility','saju_mackerel','partner'],['timing','saju_tuna',undefined]]){
  const row=await prepareFortune(env,'owner',{...body,consultationKind,productId,partnerProfileId});
  const previous=[];
  for(const chapter of row.snapshot.manifest){const input={chapter,analysis:row.snapshot.analysis,previous};const result=await new loaded.exports.MockChapterProvider().generateChapter(input);loaded.exports.validateChapter(result,input);previous.push(result);}
  assert.equal(previous.length,row.snapshot.manifest.length);
 }
});
