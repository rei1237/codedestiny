// Default is offline mock. A DRAFT plan never loads keys or performs live I/O.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'dotenv';
import {benchmarkCallCaps,BenchmarkBudget,BENCHMARK_MODEL} from './lib/yeongnyangi-benchmark-budget.mjs';
import {buildBenchmarkRuntime,runProductionBenchmarkCall,benchmarkHash,benchmarkExecutorSourceHash} from './lib/yeongnyangi-benchmark-runtime.mjs';
const arg=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const live=process.argv.includes('--live'),planPath=arg('--plan-file'),out=arg('--out');
assert.ok(planPath&&path.isAbsolute(planPath),'Absolute --plan-file required');
assert.ok(out&&path.isAbsolute(out),'Absolute --out required');
if(!live)await import('./lib/mock-network-guard.cjs');
const bytes=fs.readFileSync(planPath),plan=JSON.parse(bytes),planHash=benchmarkHash(bytes);
const caps=benchmarkCallCaps(plan),base=path.dirname(planPath);
if(live){
 assert.equal(plan.status,'READY_FOR_SEPARATE_APPROVAL','DRAFT plans cannot execute');
 assert.equal(arg('--approved-plan-sha256'),planHash,'Explicit approved plan hash required');
 assert.equal(plan.approvedPlanPath,fs.realpathSync(planPath),'Approval cannot move to another folder');
 assert.ok(arg('--env-file')&&path.isAbsolute(arg('--env-file')),'Explicit absolute --env-file required');
}
const previews=plan.books.map(book=>{
 assert.equal(path.basename(book.artifact),book.artifact,'Local fixture names only');
 const data=fs.readFileSync(path.join(base,book.artifact));
 assert.equal(benchmarkHash(data),book.previewSha256,'Fixture changed');
 const value=JSON.parse(data);
 assert.equal(benchmarkHash(value.snapshot),book.snapshotSha256,'Snapshot changed');
 if(book.analysisCalls)assert.ok(value.generationCheckpoint?.evidence,'Stored ask evidence required');
 return {book,value};
});
const {runtime,sha256}=await buildBenchmarkRuntime();
const executorSourceSha256=benchmarkExecutorSourceHash();
if(live){assert.equal(plan.executionBundleSha256,sha256,'Execution code changed');assert.equal(plan.executorSourceSha256,executorSourceSha256,'Runner or budget enforcement changed');}
fs.mkdirSync(out,{recursive:true});
const outputMarker=path.join(out,'execution-used.json');
fs.writeFileSync(outputMarker,JSON.stringify({mode:live?'live':'mock',planHash,runtimeBundleSha256:sha256}),{flag:'wx'});
let apiKey;
if(live){
 // A second output folder cannot reuse this plan's one-time authorization.
 fs.writeFileSync(path.join(base,`approval-used-${planHash}.json`),JSON.stringify({out,reservedAt:new Date().toISOString()}),{flag:'wx'});
 const env=parse(fs.readFileSync(arg('--env-file')));
 apiKey=env.GEMINIF_API_KEY;assert.ok(apiKey,'Gemini key unavailable');
}
const summary={mode:live?'live':'mock',planHash,runtimeBundleSha256:sha256,executorSourceSha256,model:BENCHMARK_MODEL,paidCalls:0,databaseCalls:0,paymentCalls:0,retries:0,books:[]};
const write=(name,value)=>{
 const file=path.join(out,name),temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2));fs.renameSync(temp,file);
};
const budget=new BenchmarkBudget(caps,state=>write('budget.json',state));
const nativeFetch=globalThis.fetch;
let fetchHandler,currentInput,currentPreview;
globalThis.fetch=(...args)=>{assert.ok(fetchHandler,'Unexpected external request');return fetchHandler(...args);};
const mockResponse=async(id)=>{
 let result;
 if(id.endsWith(':analysis'))result=runtime.ruleAnalysis(currentPreview.snapshot.analysis.consultation);
 else{
  const consultation=currentInput.analysis.consultation;
  const assigned=consultation.questions.filter(q=>q.chapterId===currentInput.chapter.id);
  result=await new runtime.MockChapterProvider().generateChapter({...currentInput,ask:undefined,analysis:{...currentInput.analysis,consultation:{...consultation,questions:consultation.questions.filter(q=>!assigned.includes(q))}}});
  result.questionAnswers=assigned.map(q=>({questionId:q.id,answer:'업무에서 확인된 조건을 기록하고 선택지와 부담을 나란히 비교해 보세요.',reason:'제공된 계산 근거는 가능한 성향을 설명하며 실제 행동을 단정하지 않습니다.',timing:'사건 시점의 보장이 아닌 관찰할 조건을 살펴보세요.',action:'오늘 실천할 행동 하나와 점검할 신호를 적어 보세요.',...(currentInput.ask?{factIds:[],timingIds:[],evidenceStatus:'limited'}:{})}));
 }
 return {candidates:[{content:{parts:[{text:JSON.stringify(result)}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:100,thoughtsTokenCount:0}};
};
const call=async(id,invoke)=>runProductionBenchmarkCall({budget,id,outputTokens:caps.find(cap=>cap.id===id).outputTokens,invoke,
 setFetchHandler:handler=>{fetchHandler=handler;},saveRequest:body=>write(id.replaceAll(':','-')+'-request.json',JSON.parse(body)),saveResponse:body=>write(id.replaceAll(':','-')+'-response.json',body),
 exchange:async(kind,url,options)=>{
  if(live){
   if(kind==='generateContent'){summary.paidCalls++;write('summary.json',summary);}
   // Preserve the production request, headers and AbortSignal; prohibit redirects.
   return nativeFetch(url,{...options,redirect:'error'});
  }
  return new Response(JSON.stringify(kind==='countTokens'?{totalTokens:100}:await mockResponse(id)),{status:200,headers:{'Content-Type':'application/json'}});
 }});
try{
 for(const {book,value} of previews){
   currentPreview=value;
   const result={domain:book.domain,expectedChapters:book.chapters,chapters:[],complete:false};summary.books.push(result);
   const shared=new runtime.CodeDestinyProvider({GEMINIF_API_KEY:live?apiKey:'mock-never-sent',GEMINI_MODEL:BENCHMARK_MODEL,WORKERS_AI_ENABLED:'false',LLM_DRY_RUN:'false'});
   let askAnalysis;
   if(book.analysisCalls)askAnalysis=await runtime.analyzeAsk(value.snapshot.analysis.consultation,(system,data)=>call(`${book.domain}:analysis`,()=>shared.analyzeQuestion(system,data)));
   const previous=[];
   for(const [ordinal,chapter] of value.snapshot.manifest.entries()){
     const active=`${book.domain}:chapter:${ordinal}`;
     currentInput={locale:value.snapshot.locale||'ko',outputContext:value.snapshot.outputContext,chapter,analysis:value.snapshot.analysis,previous,
       ...(ordinal===0&&askAnalysis?{ask:{analysis:askAnalysis,evidence:value.generationCheckpoint.evidence}}:{})};
     try{
       const generated=await call(active,()=>new runtime.StructuredChapterProvider(shared).generateChapter(currentInput));
       const delivered=runtime.deliverChapter(generated,currentInput);
       const natalFacts=currentInput.analysis.contexts?.saju?.facts.find(f=>f.label==='pillars')?.value;
       if(natalFacts)runtime.assertSajuPillarClaims(delivered,natalFacts);
       write(active.replaceAll(':','-')+'-delivered.json',delivered);previous.push(delivered);
       result.chapters.push({ordinal,delivered:true});
     }catch(error){result.chapters.push({ordinal,delivered:false,errorType:String(error?.name||'Error'),code:String(error?.code||'BENCHMARK_FAILED')});break;}
     finally{write('summary.json',summary);}
   }
   result.complete=previous.length===book.chapters;write('summary.json',summary);
 }
}finally{
 fetchHandler=undefined;globalThis.fetch=nativeFetch;
 summary.reservedMaximumUsd=budget.state.reservedNanoUsd/1e9;summary.generationCalls=budget.state.generationCalls;summary.tokenizerCalls=budget.state.tokenizerCalls;
 summary.complete=summary.books.length===6&&summary.books.every(book=>book.complete);
 summary.reportedTokenCostUsd=budget.state.records.reduce((sum,row)=>sum+((row.usage?.promptTokenCount||0)*.30+((row.usage?.candidatesTokenCount||0)+(row.usage?.thoughtsTokenCount||0))*2.50)/1e6,0);
 summary.costComplete=budget.state.records.every(row=>row.status==='received'&&row.usage);
 write('summary.json',summary);console.log(JSON.stringify(summary));
}
if(!summary.complete)process.exitCode=1;
