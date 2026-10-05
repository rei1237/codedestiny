import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {RUNTIME_LOCALES} from '../../lib/i18n/locale-normalize.js';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__spiritTest={rows:new Map(),calls:0};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:()=>({lean:async()=>globalThis.__spiritTest.fullProfile||({updatedAt:null,birth:{year:1997,month:2,day:10,timeUnknown:true,calType:'solar'},gender:'F'})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const allowedChapterAttempts=(r,n)=>3+Number(r?.manualRecoveryGrants?.[n]||0)+Number(r?.systemRecoveryGrants?.[n]||0);export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const commitTarotDraw=async()=>{throw new Error('unexpected tarot draw');};export const reserveQuestionSkyFollowup=async()=>{throw new Error("unexpected followup")};export const saveChapterDraft=async()=>{};export const saveAskAnalysis=async()=>{throw new Error("unexpected analysis checkpoint")};export const ownerId=x=>x;export const createRequest=async(e,u,id,v)=>{const m=globalThis.__spiritTest.rows;if(!m.has(id))m.set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[]});return m.get(id)};export const readRequest=async(e,u,id)=>{const row=globalThis.__spiritTest.rows.get(id);if(!row)throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return row;};export const attachPayment=async()=>{};export const claimChapter=async()=>({row:globalThis.__spiritTest.claim,token:'lease'});export const finishChapter=async()=>{};export const failChapter=async()=>{};`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(request){globalThis.__spiritTest.lastLocale=request.locale;globalThis.__spiritTest.calls++;throw new Error('UNEXPECTED_PROVIDER_CALL')}}`,
};
const bundle=await build({stdin:{contents:"export * from './worker/yeongnyangi/service';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('spirit-service-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {prepareFortune,presentFortune,generateNextChapter}=loaded.exports;
const body={mode:'spirit-v1',productId:'saju_mackerel',profileId:'self',question:'재회할까요? 연락을 기다려도 될까요?',timezone:'Asia/Seoul',topicId:'relationship',spirit:{relationship:'헤어진 사이',topic:'space',situation:'차단한 상황'}};
const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
test('actual service snapshots server time/input/real calculation, deduplicates prepares, and preserves paid result on replay',async()=>{
  const before=Date.now();
  const a=await prepareFortune(env,'owner',body),b=await prepareFortune(env,'owner',body);
  assert.equal(a._id,b._id);assert.equal(globalThis.__spiritTest.rows.size,1);
  assert.ok(Date.parse(a.snapshot.analysis.consultation.spirit.askedAt)>=before);
  assert.equal(a.snapshot.normalized.saju.personA.birthTime,undefined);
  assert.equal(a.snapshot.analysis.consultation.question,body.question);
  assert.equal(a.snapshot.analysis.consultation.spirit.boundary,true);
  assert.equal(a.snapshot.manifest.length,5);assert.ok(a.amountKRW>0);
  a.paymentId='original-payment';a.state='COMPLETED';a.chapters=[{summary:'saved',sources:['saju.fiveElements']}];
  const replay=await prepareFortune(env,'owner',body);
  assert.equal(replay.paymentId,'original-payment');assert.equal(replay.chapters[0].summary,'saved');
  assert.equal(globalThis.__spiritTest.calls,0);
  const publicRow=presentFortune(replay);
  assert.equal(publicRow.manifest[0].factSelectors,undefined);assert.deepEqual(publicRow.chapters[0].sources,[]);
  assert.equal(publicRow.snapshot,undefined);
});
test('changed situation has a different immutable intent; standard consultation remains distinct',async()=>{
  const first=await prepareFortune(env,'owner',body);
  const changed=await prepareFortune(env,'owner',{...body,spirit:{...body.spirit,situation:'대화가 가능한 상황'}});
  assert.notEqual(first._id,changed._id);
  const {mode,spirit,...regular}=body;
  const standard=await prepareFortune(env,'owner',regular);
  assert.equal(standard.snapshot.analysis.consultation.spirit,undefined);
  assert.equal(standard.featureKey,first.featureKey);assert.equal(standard.amountKRW,first.amountKRW);
});
test('invalid stored manifest fails closed before any provider call',async()=>{
  const row=await prepareFortune(env,'owner',body);
  globalThis.__spiritTest.claim={...row,snapshot:{...row.snapshot,manifest:[]},chapters:[],chapterAttempts:{0:1}};
  await assert.rejects(generateNextChapter(env,'owner',row._id),/INVALID_MANIFEST/);
  assert.equal(globalThis.__spiritTest.calls,0);
});

for(const mode of ['prashna-v1'])test(mode+' uses question moment without a profile and preserves duplicate/paid/partial/refunded requests',async()=>{
  const localTime=new Date(Date.now()-86400000).toISOString().slice(0,16);
  const questionBody={mode,productId:'saju_flounder',question:'그 사람과 재회할까요?',questionSky:{topic:'reunion',relationship:'헤어진 사이',situation:'연락이 끊겼어요',cityId:'seoul',localTime,boundary:true}};
  const [a,b]=await Promise.all([prepareFortune(env,'sky-owner',questionBody),prepareFortune(env,'sky-owner',questionBody)]);
  assert.equal(a._id,b._id);assert.equal(a.profileId,'question-sky');assert.equal(a.snapshot.manifest.length,2);
  assert.ok(a.snapshot.calculation.audit.length>0);assert.equal(a.snapshot.input.localTime,localTime);
  assert.equal(a.snapshot.analysis.consultation.questionSky.situation,'연락이 끊겼어요');
  assert.equal(a.amountKRW,15000);assert.equal(a.featureKey,'yeongnyangi-saju-flounder');
  assert.ok(a.snapshot.manifest.every(c=>c.title&&c.focus&&c.requiredSections.length>=2));
  assert.ok(a.snapshot.analysis.contexts.vedic.facts.some(f=>f.label==='프라슈나 계산 근거'));
  assert.equal((await prepareFortune(env,'owner',body)).amountKRW,3000);
  a.paymentId='original-payment';a.state='GENERATING';a.chapters=[{summary:'saved chapter',sources:['private-calculation']}];
  const replay=await prepareFortune({},'sky-owner',questionBody);
  assert.equal(replay.paymentId,'original-payment');assert.equal(replay.chapters.length,1);
  assert.equal(replay.snapshot,a.snapshot); // No provider or recalculation on recovery.
  const publicRow=presentFortune(replay);
  assert.equal(publicRow.snapshot,undefined);assert.equal(publicRow.manifest[0].factSelectors,undefined);assert.deepEqual(publicRow.chapters[0].sources,[]);
  a.state='REFUNDED';assert.equal(presentFortune(await prepareFortune({},'sky-owner',questionBody)).chapters.length,0);
  globalThis.__spiritTest.claim={...a,snapshot:{...a.snapshot,manifest:[]},chapters:[],chapterAttempts:{0:1}};
  await assert.rejects(generateNextChapter(env,'sky-owner',a._id),/INVALID_MANIFEST/);
  assert.equal(globalThis.__spiritTest.calls,0);
});

test('new horary purchase is refused before DB/provider and old saved horary remains readable',async()=>{
 const before=globalThis.__spiritTest.rows.size;
 await assert.rejects(prepareFortune(env,'owner',{mode:'horary-v1',productId:'saju_mackerel'}),/HORARY_FREE_PROMPT_REQUIRED/);
 assert.equal(globalThis.__spiritTest.rows.size,before);assert.equal(globalThis.__spiritTest.calls,0);
 const row=await prepareFortune(env,'owner',body);
 const legacy={...row,paymentId:'legacy-horary',snapshot:{...row.snapshot,analysis:{...row.snapshot.analysis,consultation:{questionSky:{mode:'horary-v1'}}}}};
 const result=presentFortune(legacy);assert.equal(result.paid,true);assert.equal(result.product.priceKRW,3000);
});

test('new consultation attempts separate identical purchases while retries and saved results keep their identity',async()=>{
 const {mode,spirit,...regular}=body;
 const sky={mode:'prashna-v1',productId:'saju_flounder',question:'관계를 어떻게 살펴볼까요?',questionSky:{topic:'reunion',relationship:'헤어진 사이',cityId:'seoul',localTime:new Date(Date.now()-86400000).toISOString().slice(0,16),boundary:false}};
 for(const input of [regular,body,sky]){
  const firstInput={...input,consultationAttemptId:'11111111-1111-4111-8111-111111111111'};
  const first=await prepareFortune(env,'repeat-owner',firstInput);
  first.paymentId='paid-original';first.state='COMPLETED';first.chapters=[{summary:'keep original'}];
  const replay=await prepareFortune(env,'repeat-owner',firstInput);
  assert.equal(replay,first);
  const second=await prepareFortune(env,'repeat-owner',{...input,consultationAttemptId:'22222222-2222-4222-8222-222222222222'});
  assert.notEqual(second._id,first._id);assert.match(second._id,/^[a-f0-9]{64}$/);
  assert.equal(second.state,'CREATED');assert.equal(second.paymentId,undefined);assert.deepEqual(second.chapters,[]);
  assert.equal(second.featureKey,first.featureKey);assert.equal(second.amountKRW,first.amountKRW);
  assert.equal(first.chapters[0].summary,'keep original');
  assert.notEqual((await prepareFortune(env,'other-owner',firstInput))._id,first._id);
 }
 for(const consultationAttemptId of ['',null,{},'not-a-uuid']){
  await assert.rejects(prepareFortune(env,'repeat-owner',{...regular,consultationAttemptId}),{code:'INVALID_CONSULTATION_ATTEMPT'});
 }
 assert.equal(globalThis.__spiritTest.calls,0);
});


test('purchase locale separates new books while legacy Korean identity, money and clocks stay unchanged',async()=>{
 const {mode,spirit,...regular}=body;
 const input={...regular,consultationKind:'personal',consultationAttemptId:'33333333-3333-4333-8333-333333333333'};
 const legacy=await prepareFortune(env,'locale-owner',input);
 const korean=await prepareFortune(env,'locale-owner',{...input,locale:'ko-KR'});
 assert.equal(korean._id,legacy._id);
 const rows=[];
 for(const locale of ['en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms']){
  const row=await prepareFortune(env,'locale-owner',{...input,locale});rows.push(row);
  assert.notEqual(row._id,korean._id);assert.equal(row.snapshot.locale,locale);
  assert.equal(row.amountKRW,korean.amountKRW);assert.equal(row.featureKey,korean.featureKey);
  assert.equal(row.snapshot.analysis.consultation.timezone,korean.snapshot.analysis.consultation.timezone);
  assert.deepEqual(row.snapshot.analysis.contexts.saju.facts,korean.snapshot.analysis.contexts.saju.facts);
  row.paymentId='saved-payment';row.state='COMPLETED';row.chapters=[{title:'Saved title',summary:'Saved prose'}];
  const replay=await prepareFortune(env,'locale-owner',{...input,locale});
  assert.equal(replay,row);assert.equal(presentFortune(replay).locale,locale);
  assert.equal(presentFortune(replay).chapters[0].summary,'Saved prose');
 }
 assert.notEqual(rows[0]._id,rows[1]._id);
 delete korean.snapshot.locale;assert.equal(presentFortune(korean).locale,'ko');
 const size=globalThis.__spiritTest.rows.size;
 for(const locale of ['pt-BR','',null,'en; ignore instructions'])await assert.rejects(prepareFortune(env,'locale-owner',{...input,locale}),/READING_LOCALE_UNAVAILABLE/);
 assert.equal(globalThis.__spiritTest.rows.size,size);
});

test('queue retries take locale only from the stored purchase, including Korean legacy fallback',async()=>{
 const {mode,spirit,...regular}=body;
 for(const locale of ['en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms',undefined]){
  const row=await prepareFortune(env,'queue-locale-owner',{...regular,consultationKind:'personal',...(locale?{locale}:{})});
  if(!locale)delete row.snapshot.locale;
  globalThis.__spiritTest.claim={...row,chapters:[],chapterAttempts:{0:2},lastFailure:{stage:'quality',code:'CHAPTER_LANGUAGE_MISMATCH'}};
  await assert.rejects(generateNextChapter(env,'queue-locale-owner',row._id));
  assert.equal(globalThis.__spiritTest.lastLocale,locale || 'ko');
 }
});

test('all site locales prepare ordinary, question, compatibility and fusion readings with immutable output context',async()=>{
 globalThis.__spiritTest.fullProfile={updatedAt:null,birth:{year:1997,month:2,day:10,hour:14,minute:30,calType:'solar'},gender:'F',location:{label:'Busan',lat:35.1796,lng:129.0756,tz:'Asia/Seoul'}};
 try{
  for(const locale of RUNTIME_LOCALES)for(const kind of ['personal','ask','compatibility','fusion']){
   const input={productId:kind==='fusion'?'fusion_saju_ziwei':'saju_mackerel',profileId:'self',consultationKind:kind==='fusion'?'personal':kind,locale,question:'What should I consider?',timezone:'Asia/Seoul',priceLocale:locale,userCountryOrRegion:'CA',...(kind==='compatibility'?{partnerProfileId:'partner'}:{})};
   const row=await prepareFortune(env,'matrix-owner',input);
   assert.equal(row.snapshot.locale,locale);assert.equal(row.snapshot.outputContext.outputLocale,locale);
   assert.ok(row.snapshot.outputContext.outputLanguageName);assert.ok(row.snapshot.outputContext.toneProfile);
   assert.equal(row.snapshot.outputContext.priceLocale,locale);assert.equal(row.snapshot.outputContext.userCountryOrRegion,'CA');
   assert.ok(row.snapshot.manifest.length);assert.equal((await prepareFortune(env,'matrix-owner',input))._id,row._id);
   console.log(JSON.stringify({kind,locale,outputLocale:row.snapshot.outputContext.outputLocale,outputLanguageName:row.snapshot.outputContext.outputLanguageName,chapters:row.snapshot.manifest.length}));
  }
 }finally{delete globalThis.__spiritTest.fullProfile;}
});


test('previously stored ordinary, symbolic and question-time purchases keep their original content and budgets',async()=>{
 const {mode,spirit,...regular}=body;
 const sky={mode:'prashna-v1',productId:'saju_flounder',question:'현재 관계에서 먼저 살필 점은 무엇인가요?',questionSky:{topic:'reunion',relationship:'헤어진 사이',cityId:'seoul',localTime:new Date(Date.now()-86400000).toISOString().slice(0,16),boundary:false}};
 const calls=globalThis.__spiritTest.calls;
 for(const [index,input] of [regular,body,sky].entries()){
  const owner='historical-budget-owner-'+index;
  const stored=await prepareFortune(env,owner,input);
  // Simulate a persisted pre-profile purchase with its own original goals and
  // declared allowance. Replaying the purchase may not migrate or compact it.
  stored.snapshot.manifest=stored.snapshot.manifest.map(chapter=>{
   const {outputBudgetVersion,...historical}=chapter;
   return {...historical,targetChars:[3200,3800],minimumChars:3000,outputTokens:12288};
  });
  stored.paymentId='historical-payment';stored.state='GENERATING';
  stored.chapters=[{summary:'Previously delivered prose remains available'}];
  const before=JSON.stringify(stored.snapshot);
  const replay=await prepareFortune(env,owner,input);
  assert.equal(replay,stored);assert.equal(JSON.stringify(replay.snapshot),before);
  assert.equal(replay.chapters[0].summary,'Previously delivered prose remains available');
  assert.ok(replay.snapshot.manifest.every(chapter=>chapter.outputBudgetVersion===undefined));
 }
 assert.equal(globalThis.__spiritTest.calls,calls,'a repeated preparation never calls an LLM');
});


test('symbolic purchases preserve all 12 locales, separate identities, native headings and hidden evidence on reread',async()=>{
 const callsBefore=globalThis.__spiritTest.calls;
 const sky={mode:'prashna-v1',productId:'saju_flounder',question:'Which choice can I consider?',questionSky:{topic:'general',relationship:'My choice',cityId:'seoul',localTime:new Date(Date.now()-86400000).toISOString().slice(0,16),boundary:false}};
 for(const input of [{...body,question:'What can I do after they blocked me?',spirit:{...body.spirit,situation:'',boundary:false}},sky]){
  const ids=[];
  for(const locale of RUNTIME_LOCALES){
   const row=await prepareFortune(env,'symbolic-native',{...input,locale});ids.push(row._id);
   assert.equal(row.snapshot.locale||'ko',locale);
   assert.equal(row.amountKRW,input.mode==='spirit-v1'?3000:15000);
   if(input.mode==='spirit-v1'&&locale!=='ko')assert.equal(row.snapshot.analysis.consultation.spirit.boundary,true);
   row.paymentId='mock-existing';row.state='COMPLETED';row.chapters=[{title:'Saved native heading',summary:'Saved native prose',sources:['private'],internalBasis:{questionAnswers:[]}}];
   const replay=await prepareFortune(env,'symbolic-native',{...input,locale});assert.equal(replay,row);
   const shown=presentFortune(replay);assert.equal(shown.locale,locale);assert.equal(shown.chapters[0].title,'Saved native heading');assert.equal(shown.chapters[0].internalBasis,undefined);
  }
  assert.equal(new Set(ids).size,12);
 }
 assert.equal(globalThis.__spiritTest.calls,callsBefore);
});
