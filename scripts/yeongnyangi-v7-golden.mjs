// Phase 4: synthetic saju, three books only. Default is mock; no service/repository/DB imports.
// Live use requires a new explicit user approval. A persisted attempt is never called again.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {parse} from 'dotenv';
import {goldenMetrics} from './lib/yeongnyangi-golden-metrics.mjs';
import {importGoldenCheckpoint,assertGoldenGenerationAllowed,goldenHash} from './lib/v7-golden-checkpoint.mjs';

const arg=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const live=process.argv.includes('--live'),plan=process.argv.includes('--plan');
const summaryOnly=process.argv.includes('--summary-only');
const revalidateOnly=process.argv.includes('--revalidate-only');
const importPath=arg('--import-checkpoint');
assert.ok(!(importPath&&(live||plan||summaryOnly||revalidateOnly)),'Import is offline and exclusive');
assert.ok(!((summaryOnly||revalidateOnly)&&live),'offline modes never use --live or an API key');
assert.ok(!(summaryOnly&&revalidateOnly),'Select one offline mode');
assert.ok(!(live&&plan),'--plan and --live are exclusive');
const root=process.cwd();
const out=arg('--out');
if(!plan)assert.ok(out&&path.isAbsolute(out),'--out must be an absolute local directory');
const bundle=await build({stdin:{contents:`
export {domains} from './worker/yeongnyangi/fortune/index';
export {products} from './worker/yeongnyangi/payments/catalog';
export {readingManifestV7,READING_V7_ENABLED} from './worker/yeongnyangi/fortune/reading-v7';
export {resolveV7Ledger,selectV7Facts} from './worker/yeongnyangi/fortune/reading-v7-ledger';
export {buildV7TimingMatrix,withV7Timing,v7TimingSummaries} from './worker/yeongnyangi/fortune/reading-v7-timing';
export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter';
export {FortuneError} from './worker/yeongnyangi/fortune/shared/contracts';
export {CodeDestinyProvider} from './worker/yeongnyangi/providers/code-destiny';
export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';
export {auditV7Chapter} from './worker/yeongnyangi/fortune/reading-v7-quality';
export {V7_COST,v7BookCostKRW} from './worker/yeongnyangi/fortune/reading-v7-cost';
export {CONSULTATION_QUALITY_VERSION,CONSULTATION_QUALITY_POLICY} from './worker/yeongnyangi/prompts/domain/consultation-quality';
`,resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const Module=createRequire(import.meta.url)('node:module');
const filename=path.join(root,'v7-golden-memory.cjs');
const loaded=new Module(filename);loaded.filename=filename;loaded.paths=Module._nodeModulePaths(root);
loaded._compile(bundle.outputFiles[0].text,filename);
const m=loaded.exports;
// Golden manifests are explicit and offline replay remains valid after the production rollout.
assert.equal(typeof m.READING_V7_ENABLED,'boolean');
const asOf='2026-09-29T03:00:00Z',today=asOf.slice(0,10);
const engine=m.domains.saju;
const inputFor=date=>engine.validateInput({personA:{birthDate:date,birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}},readingMode:'personal'});
// Select an actual engine-calculated absence fixture, never edit a chart to manufacture absence.
let fixture;
for(let day=1;day<=730;day++){
 const date=new Date(Date.UTC(1997,0,day)).toISOString().slice(0,10);
 const input=inputFor(date),base=engine.buildContext(await engine.calculate(input,{asOf}));
 const facts=Object.fromEntries(base.facts.map(f=>[f.label,f.value]));
 const wealth=Number(facts.tenGods?.정재||0)+Number(facts.tenGods?.편재||0);
 const benefactors=['천을귀인','문창귀인'].map(key=>facts.shinsal?.byName?.[key]);
 const absent=benefactors.every(v=>!v||!v.present);
 if(wealth===0&&absent){fixture={id:'synthetic-no-wealth-no-benefactor',date,input,base,absence:{wealth,benefactors:benefactors.map(v=>v?.present??false)}};break;}
}
assert.ok(fixture,'No verified absence fixture found');
// The engine's calculatedAt is wall-clock metadata. Pin it to this fixture's approved asOf so the
// same calculation has the same resume identity across processes; facts/manifest/mode still bind it.
const context={...m.withV7Timing(fixture.base,await m.buildV7TimingMatrix(fixture.base,fixture.input,today)),calculatedAt:asOf};
const tariff=JSON.parse(fs.readFileSync(path.join(root,'config/llm-tariffs-20260921.json'),'utf8'))['gemini/gemini-2.5-flash'];
const books=['salmon','flounder','tuna'].map(tier=>{
 const product=m.products.find(p=>p.domain==='saju'&&p.fishId===tier&&p.readingKind==='single');
 const manifest=m.v7TimingSummaries(m.resolveV7Ledger(m.readingManifestV7(product,{id:'personal'}),context));
 assert.ok(manifest.every(chapter=>m.selectV7Facts(context,chapter).length>0));
 return {tier,product,manifest};
});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const quality={version:m.CONSULTATION_QUALITY_VERSION,hash:hash(m.CONSULTATION_QUALITY_POLICY)};
// Keep the original golden scope flag for immutable historical checkpoint identities.
const scope={domain:'saju',kind:'personal',asOf,fixture:{id:fixture.id,date:fixture.date,absence:fixture.absence},books:books.map(b=>({tier:b.tier,chapters:b.manifest.length,priceKRW:b.product.priceKRW})),provider:'gemini',model:'gemini-2.5-flash',maxAttemptsPerChapter:2,timeoutMs:150000,flag:false};
console.log(JSON.stringify({scope,estimatedBaseKRW:books.reduce((sum,b)=>sum+m.v7BookCostKRW(b.manifest.length,tariff),0)}));
if(plan)process.exit(0);
// Read-only replay: never reserve an attempt, load credentials, call a provider, or overwrite paid evidence.
if(revalidateOnly){
 const saved=JSON.parse(fs.readFileSync(path.join(out,'checkpoint.json'),'utf8'));
 assert.equal(hash(saved.scope),hash(scope),'Checkpoint scope changed');
 const replay=books.map(book=>{
  const previous=[],failures=[];
  let recovered=0,stoppedAt=null;
  for(const chapter of book.manifest){
   const existing=saved.chapters.find(row=>row.tier===book.tier&&row.ordinal===chapter.ordinal);
   if(existing){previous.push(existing.body);continue;}
   const history=saved.attempts.filter(row=>row.tier===book.tier&&row.ordinal===chapter.ordinal&&row.raw);
   let accepted=false;
   for(const record of [...history].reverse()){
    try{
     const body=m.validateChapter(record.raw,{locale:'ko',chapter,analysis:{contexts:{saju:context},themes:[],signals:[]},previous});
     previous.push(body);recovered++;accepted=true;break;
    }catch(error){failures.push({ordinal:chapter.ordinal,attempt:record.attempt,code:error.code||'GOLDEN_REPLAY_FAILED'});}
   }
   if(!accepted){stoppedAt=chapter.ordinal;break;}
  }
  return {tier:book.tier,expectedChapters:book.manifest.length,savedChapters:saved.chapters.filter(row=>row.tier===book.tier).length,
   revalidatedChapters:previous.length,recovered,stoppedAt,failures,complete:previous.length===book.manifest.length};
 });
 console.log(JSON.stringify({mode:'read-only-revalidation',networkCalls:0,checkpointWritten:false,books:replay}));
 process.exit(replay.some(book=>!book.complete)?1:0);
}
fs.mkdirSync(out,{recursive:true});
const lock=path.join(out,'running.lock');
fs.writeFileSync(lock,String(process.pid),{flag:'wx'});
process.on('exit',()=>{try{fs.unlinkSync(lock);}catch{}});
const statePath=path.join(out,'checkpoint.json');
const identityFor=mode=>hash({scope,manifests:books.map(b=>b.manifest),context,mode,quality});
if(importPath){
 assert.ok(path.isAbsolute(importPath),'Absolute source checkpoint required');
 assert.ok(!fs.existsSync(statePath),'Refuse to overwrite a checkpoint');
 assert.notEqual(path.resolve(importPath),path.resolve(statePath),'Source must be preserved');
 const expectedHash=arg('--source-sha256');assert.match(expectedHash||'',/^[a-f0-9]{64}$/,'Explicit source hash required');
 const bytes=fs.readFileSync(importPath),source=JSON.parse(bytes);
 const editsPath=arg('--edited-chapters');
 if(source.mode==='live')assert.ok(editsPath,'Live import requires reviewed editorial copy');
 if(editsPath)assert.ok(path.isAbsolute(editsPath),'Absolute editorial file required');
 const imported=importGoldenCheckpoint({bytes,expectedHash,scope,books,mode:source.mode,identity:identityFor(source.mode),
  edits:editsPath?JSON.parse(fs.readFileSync(editsPath,'utf8')):undefined,
  validate:(body,chapter,previous,options)=>m.validateChapter(body,{locale:'ko',chapter,analysis:{contexts:{saju:context},themes:[],signals:[]},previous,
   ...(options?.lengthRepair?{repair:{code:'CHAPTER_SECTION_TOO_SHORT'}}:{})})});
 imported.quality=quality;
 fs.writeFileSync(statePath+'.tmp',JSON.stringify(imported,null,2));fs.renameSync(statePath+'.tmp',statePath);
 assert.equal(goldenHash(fs.readFileSync(importPath)),expectedHash,'Source changed during import');
 console.log(JSON.stringify({mode:'offline-import',networkCalls:0,quality,chapters:imported.chapters.length,approval:imported.approval}));
 process.exit(0);
}
const identity=identityFor(live?'live':'mock');
const state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{identity,scope,mode:live?'live':'mock',quality,attempts:[],chapters:[]};
if (summaryOnly) {
 assert.ok(fs.existsSync(statePath),'Existing checkpoint required');
 assert.equal(hash(state.scope),hash(scope),'Checkpoint scope changed');
} else assert.equal(state.identity,identity,'Scope/fixture/manifest changed; cannot resume existing paid run');
if(live){
 assert.ok(state.migration?.edited,'Live continuation requires explicit reviewed checkpoint import');
 assert.equal(state.mode,'live');
 assert.equal(state.quality?.hash,quality.hash,'Counseling prompt changed');
}
const persist=()=>{fs.writeFileSync(statePath+'.tmp',JSON.stringify(state,null,2));fs.renameSync(statePath+'.tmp',statePath);};
persist();
const nativeFetch=globalThis.fetch;
let active;
globalThis.fetch=async(url,options)=>{
 assert.ok(live&&active,'External network forbidden outside approved generation');
 const target=new URL(String(url));
 assert.equal(target.origin,'https://generativelanguage.googleapis.com');
 assert.ok(['/v1beta/models/gemini-2.5-flash:generateContent','/v1beta/models/gemini-2.5-flash:countTokens'].includes(target.pathname));
 assert.equal(options?.method,'POST');
 const generating=target.pathname.endsWith(':generateContent');
 if(generating){
  assert.equal(active.networkCalls,0,'Provider retries forbidden');
  assert.ok(state.attempts.length-state.migration.baselineAttempts<=28,'New call budget exhausted');
  assert.equal(active.tier,'tuna');assert.ok(active.ordinal>=10&&active.ordinal<=23,'Unapproved live chapter');
  active.networkCalls++;
 }
 else active.tokenizerCalls=(active.tokenizerCalls||0)+1;
 persist();
 const response=await nativeFetch(url,options);
 const payload=await response.clone().json().catch(()=>({}));
 if(generating){active.status=response.status;active.usage=payload.usageMetadata||null;active.finishReason=payload.candidates?.[0]?.finishReason||null;}
 else active.tokenizerStatus=response.status;
 persist();
 return response;
};
const output=console.log.bind(console);
for(const level of ['log','info','warn','error'])console[level]=(...args)=>{
 if(args[0]==='[llm token_usage]'&&active){active.tokenLog=args[1];persist();}
 if(args[0]==='[yeongnyangi-v7-audit]'&&active){active.prune=JSON.parse(args[1]);persist();}
 if(args[0]==='[yeongnyangi-provider]'&&active){active.providerError=JSON.parse(args[1]);persist();}
};
let env={LLM_PROVIDER_CALL_LOG:'true',LLM_DRY_RUN:'false',WORKERS_AI_ENABLED:'false'};
if(live){
 const envFile=arg('--env-file');assert.ok(envFile&&path.isAbsolute(envFile),'Explicit --env-file required for live');
 const parsed=parse(fs.readFileSync(envFile));
 const key=process.env.GEMINIF_API_KEY||parsed.GEMINIF_API_KEY;
 assert.ok(key,'GEMINIF_API_KEY unavailable');
 env={...env,GEMINIF_API_KEY:key}; // Never install DB/payment secrets into process.env.
}
for(const book of summaryOnly?[]:books){
 const previous=state.chapters.filter(row=>row.tier===book.tier).sort((a,b)=>a.ordinal-b.ordinal).map(row=>row.body);
 for(const chapter of book.manifest){
  if(state.chapters.some(row=>row.tier===book.tier&&row.ordinal===chapter.ordinal))continue;
  const history=state.attempts.filter(row=>row.tier===book.tier&&row.ordinal===chapter.ordinal).sort((a,b)=>a.attempt-b.attempt);
  let complete=false;
  // Replay every paid raw before spending any remaining attempt. Earlier validators may have rejected
  // an editable draft; a recorded error spends the call budget, not the right to reuse its stored body.
  for(const record of [...history].reverse()){
   if(!record.raw)continue;
   const prior=history.find(row=>row.attempt===record.attempt-1);
   const request={locale:'ko',chapter,analysis:{contexts:{saju:context},themes:[],signals:[]},previous,
    ...(prior?.stage==='quality'?{repair:{code:prior.error}}:{})};
   let body;
   try{
    active=record;
    body=m.validateChapter(record.raw,request);
   }catch(error){
    // Only a rejected draft is skipped. Storage or programming errors must stop instead of buying a call.
    if(!(error instanceof m.FortuneError))throw error;
    continue;
   }
   finally{active=undefined;}
   record.finalAudit=m.auditV7Chapter({body,chapter,previous});
   record.validated=true;record.revalidated=true;
   state.chapters.push({tier:book.tier,ordinal:chapter.ordinal,key:chapter.key,body});previous.push(body);persist();
   output(JSON.stringify({tier:book.tier,chapter:chapter.ordinal+1,total:book.manifest.length,
    attempt:record.attempt,status:'revalidated',pruned:record.prune?.sentences||0}));
   complete=true;break;
  }
  if(complete){
   if(state.stopped?.tier===book.tier&&state.stopped.ordinal===chapter.ordinal){delete state.stopped;persist();}
   continue;
  }
  for(let index=0;index<2;index++){
   let record=history.find(row=>row.attempt===index+1);
   if(record?.validated){throw new Error('Checkpoint inconsistent');}
   if(record?.error)continue; // A failed attempt is spent, including timeouts.
   const prior=history.find(row=>row.attempt===index);
   const request={locale:'ko',chapter,analysis:{contexts:{saju:context},themes:[],signals:[]},previous,...(prior?.stage==='quality'?{repair:{code:prior.error}}:{})};
   if(!record){
    assertGoldenGenerationAllowed(state,book.tier,chapter.ordinal);
    record={tier:book.tier,ordinal:chapter.ordinal,key:chapter.key,attempt:index+1,networkCalls:0,startedAt:new Date().toISOString()};
    state.attempts.push(record);history.push(record);persist();
   }else if(!record.raw){throw new Error('Interrupted paid attempt without saved body: refuse automatic re-call');}
   active=record;
   const started=Date.now();
   try{
    if(!record.raw){
     record.stage='provider';persist();
     const provider=live?new m.StructuredChapterProvider(new m.CodeDestinyProvider(env,{serviceId:'yeongnyangi-v7-golden',sectionGroup:book.tier+'/'+chapter.key,attempt:index+1})):new m.MockChapterProvider();
     record.raw=await provider.generateChapter(request);persist();
    }
    record.stage='quality';persist();
    let body=typeof record.raw==='string'?JSON.parse(record.raw):record.raw;
    record.rawAudit=m.auditV7Chapter({body,chapter,previous});
    body=m.validateChapter(record.raw,request);
    record.finalAudit=m.auditV7Chapter({body,chapter,previous});
    record.validated=true;record.elapsedMs=Date.now()-started;
    state.chapters.push({tier:book.tier,ordinal:chapter.ordinal,key:chapter.key,body});previous.push(body);persist();
    output(JSON.stringify({tier:book.tier,chapter:chapter.ordinal+1,total:book.manifest.length,attempt:index+1,status:'validated',pruned:record.prune?.sentences||0}));
    complete=true;break;
   }catch(error){
    record.error=String(error.code||'GOLDEN_ATTEMPT_FAILED').replace(/[^A-Z0-9_]/g,'').slice(0,80);
    record.elapsedMs=Date.now()-started;persist();
    output(JSON.stringify({tier:book.tier,chapter:chapter.ordinal+1,attempt:index+1,stage:record.stage,error:record.error}));
   }finally{active=undefined;}
  }
  if(!complete){state.stopped={tier:book.tier,ordinal:chapter.ordinal};persist();break;}
  if(state.stopped?.tier===book.tier&&state.stopped.ordinal===chapter.ordinal){delete state.stopped;persist();}
 }
}
const summary={scope,mode:state.mode,quality:state.quality,migration:state.migration,approval:state.approval,
 newAttempts:state.migration?state.attempts.length-state.migration.baselineAttempts:state.attempts.length,
 newNetworkCalls:state.attempts.slice(state.migration?.baselineAttempts||0).reduce((n,a)=>n+a.networkCalls,0),
 sourceSHA:arg('--source-sha')||null,books:books.map(book=>{
 const rows=state.chapters.filter(row=>row.tier===book.tier),attempts=state.attempts.filter(row=>row.tier===book.tier);
 const tokens=attempts.reduce((sum,a)=>({input:sum.input+(a.usage?.promptTokenCount||0),output:sum.output+(a.usage?.candidatesTokenCount||0),thinking:sum.thinking+(a.usage?.thoughtsTokenCount||0),cached:sum.cached+(a.usage?.cachedContentTokenCount||0)}),{input:0,output:0,thinking:0,cached:0});
 const costKRW=((tokens.input-tokens.cached)*tariff.inputUsdPerMillion+tokens.cached*tariff.cachedInputUsdPerMillion+(tokens.output+tokens.thinking)*tariff.outputUsdPerMillion)/1e6*m.V7_COST.krwPerUsd;
 const networkCalls=attempts.reduce((n,a)=>n+a.networkCalls,0);
 return {tier:book.tier,expectedChapters:book.manifest.length,completedChapters:rows.length,attempts:attempts.length,networkCalls,preGenerationFailures:attempts.filter(a=>a.error&&!a.networkCalls).length,tokens,costKRW,costRatio:costKRW/book.product.priceKRW,retryFactor:rows.length?networkCalls/rows.length:null,complete:rows.length===book.manifest.length,usageComplete:state.mode!=='live'||attempts.filter(a=>a.networkCalls).every(a=>a.usage),errors:attempts.filter(a=>a.error).map(a=>({ordinal:a.ordinal,code:a.error})),prunedSentences:attempts.reduce((n,a)=>n+(a.prune?.sentences||0),0),restoredBlocks:attempts.reduce((n,a)=>n+(a.prune?.restored||0),0),remainingViolations:attempts.filter(a=>a.validated).reduce((n,a)=>n+(a.finalAudit?.violations.length||0),0),metrics:goldenMetrics(rows.map(row=>row.body))};
})};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
output(JSON.stringify(summary));
if(summary.books.some(book=>!book.complete||!book.usageComplete))process.exitCode=1;
