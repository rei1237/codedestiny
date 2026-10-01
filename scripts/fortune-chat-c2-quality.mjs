// Fortune-chat (Yeoni/Neo) C-2 quality check: one approved live run of two persona books.
// Default is offline mock. A DRAFT plan never loads keys or performs live I/O.
// Reuses the mackerel benchmark budget and production-call boundary; only the persona and caps differ.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'dotenv';
import {BenchmarkBudget,BENCHMARK_MODEL} from './lib/yeongnyangi-benchmark-budget.mjs';
import {buildBenchmarkRuntime,runProductionBenchmarkCall,benchmarkHash} from './lib/yeongnyangi-benchmark-runtime.mjs';

export const C2_MAX_CALLS=11;
export const C2_MAX_USD=0.40;
const C2_BOOKS=[{persona:'yeoni',domain:'saju'},{persona:'neo',domain:'tarot'}];
// Same reservation as the benchmark budget: full input cap at $0.30/M, output incl. thinking at $2.50/M.
const reservationNano=outputTokens=>50000*300+outputTokens*2500;
export function c2CallCaps(plan){
  assert.equal(plan.model,BENCHMARK_MODEL);
  assert.deepEqual(plan.books.map(({persona,domain})=>({persona,domain})),C2_BOOKS);
  const caps=plan.books.flatMap(book=>{
    assert.equal(book.chapters,5);assert.equal(book.providerOutputCaps.length,5);
    assert.equal(book.analysisCalls,book.domain==='tarot'?0:1);
    const rows=book.providerOutputCaps.map((outputTokens,index)=>({id:`${book.persona}-${book.domain}:chapter:${index}`,outputTokens}));
    if(book.analysisCalls){assert.equal(book.analysisOutputCap,1024);rows.unshift({id:`${book.persona}-${book.domain}:analysis`,outputTokens:1024});}
    return rows;
  });
  assert.equal(caps.length,C2_MAX_CALLS);
  assert.ok(caps.every(cap=>Number.isSafeInteger(cap.outputTokens)&&cap.outputTokens>0));
  assert.ok(caps.reduce((sum,cap)=>sum+reservationNano(cap.outputTokens),0)<=Math.round(C2_MAX_USD*1e9),'Reservation exceeds the C-2 limit');
  return caps;
}
export function c2ExecutorSourceHash(root=process.cwd()){
  const files=['scripts/fortune-chat-c2-quality.mjs','scripts/lib/yeongnyangi-benchmark-budget.mjs','scripts/lib/yeongnyangi-benchmark-runtime.mjs'];
  return benchmarkHash(files.map(file=>({file,sha256:benchmarkHash(fs.readFileSync(path.join(root,file)))})));
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
if(isMain){
const arg=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const live=process.argv.includes('--live'),planPath=arg('--plan-file'),out=arg('--out');
assert.ok(planPath&&path.isAbsolute(planPath),'Absolute --plan-file required');
assert.ok(out&&path.isAbsolute(out),'Absolute --out required');
if(!live)await import('./lib/mock-network-guard.cjs');
const bytes=fs.readFileSync(planPath),plan=JSON.parse(bytes),planHash=benchmarkHash(bytes);
const caps=c2CallCaps(plan),base=path.dirname(planPath);
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
 assert.equal(value.snapshot.persona,book.persona,'Snapshot persona differs from the plan');
 if(book.analysisCalls)assert.ok(value.generationCheckpoint?.evidence,'Stored ask evidence required');
 return {book,value};
});
const {runtime,sha256}=await buildBenchmarkRuntime();
const executorSourceSha256=c2ExecutorSourceHash();
if(live){assert.equal(plan.executionBundleSha256,sha256,'Execution code changed');assert.equal(plan.executorSourceSha256,executorSourceSha256,'Runner or budget enforcement changed');}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'execution-used.json'),JSON.stringify({mode:live?'live':'mock',planHash,runtimeBundleSha256:sha256}),{flag:'wx'});
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
   const key=`${book.persona}-${book.domain}`;
   const result={persona:book.persona,domain:book.domain,expectedChapters:book.chapters,chapters:[],complete:false};summary.books.push(result);
   const shared=new runtime.CodeDestinyProvider({GEMINIF_API_KEY:live?apiKey:'mock-never-sent',GEMINI_MODEL:BENCHMARK_MODEL,WORKERS_AI_ENABLED:'false',LLM_DRY_RUN:'false'});
   let askAnalysis;
   if(book.analysisCalls)askAnalysis=await runtime.analyzeAsk(value.snapshot.analysis.consultation,(system,data)=>call(`${key}:analysis`,()=>shared.analyzeQuestion(system,data)));
   const previous=[];
   for(const [ordinal,chapter] of value.snapshot.manifest.entries()){
     const active=`${key}:chapter:${ordinal}`;
     // service.ts passes the stored persona to every chapter; this is the axis C-2 checks.
     currentInput={locale:value.snapshot.locale||'ko',outputContext:value.snapshot.outputContext,chapter,analysis:value.snapshot.analysis,previous,persona:value.snapshot.persona,
       ...(ordinal===0&&askAnalysis?{ask:{analysis:askAnalysis,evidence:value.generationCheckpoint.evidence}}:{})};
     try{
       const generated=await call(active,()=>new runtime.StructuredChapterProvider(shared).generateChapter(currentInput));
       const delivered=runtime.deliverChapter(generated,currentInput);
       const natalFacts=currentInput.analysis.contexts?.saju?.facts.find(f=>f.label==='pillars')?.value;
       if(natalFacts)runtime.assertSajuPillarClaims(delivered,natalFacts);
       write(active.replaceAll(':','-')+'-delivered.json',delivered);previous.push(delivered);
       result.chapters.push({ordinal,delivered:true});
     }catch(error){result.chapters.push({ordinal,delivered:false,errorType:String(error?.name||'Error'),code:String(error?.code||'C2_FAILED'),message:String(error?.message||'').slice(0,300)});break;}
     finally{write('summary.json',summary);}
   }
   result.complete=previous.length===book.chapters;write('summary.json',summary);
 }
}finally{
 fetchHandler=undefined;globalThis.fetch=nativeFetch;
 summary.reservedMaximumUsd=budget.state.reservedNanoUsd/1e9;summary.generationCalls=budget.state.generationCalls;summary.tokenizerCalls=budget.state.tokenizerCalls;
 summary.complete=summary.books.length===C2_BOOKS.length&&summary.books.every(book=>book.complete);
 summary.reportedTokenCostUsd=budget.state.records.reduce((sum,row)=>sum+((row.usage?.promptTokenCount||0)*.30+((row.usage?.candidatesTokenCount||0)+(row.usage?.thoughtsTokenCount||0))*2.50)/1e6,0);
 summary.costComplete=budget.state.records.every(row=>row.status==='received'&&row.usage);
 write('summary.json',summary);console.log(JSON.stringify(summary));
}
if(!summary.complete)process.exitCode=1;
}
