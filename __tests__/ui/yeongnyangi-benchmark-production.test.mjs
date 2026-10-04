import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BenchmarkBudget} from '../../scripts/lib/yeongnyangi-benchmark-budget.mjs';
import {buildBenchmarkRuntime,runProductionBenchmarkCall} from '../../scripts/lib/yeongnyangi-benchmark-runtime.mjs';
const {runtime}=await buildBenchmarkRuntime();
const env={GEMINIF_API_KEY:'mock-never-sent',GEMINI_MODEL:'gemini-2.5-flash',WORKERS_AI_ENABLED:'false',LLM_DRY_RUN:'false'};
const request={system:'Explain the calculated facts without inventing events.',domainRules:JSON.stringify({facts:['original']}),userQuestion:'What should I observe?',calculatedData:{},outputSchema:{type:'object',properties:{summary:{type:'string'}},required:['summary']},sectionTitles:[],maxOutputTokens:4096,outputBudgetVersion:'concise-reading-20260930'};
const response=()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"summary":"Preserve useful text without another generation."'}]},finishReason:'MAX_TOKENS'}],usageMetadata:{promptTokenCount:120,candidatesTokenCount:80,thoughtsTokenCount:10}}),{status:200});
for(const locale of ['ko','en'])test(`budget bridge preserves production ${locale} request bytes and rejects clipped paid output`,async()=>{
 const original=globalThis.fetch,reference=[];
 try{
  globalThis.fetch=async(url,options)=>{
   reference.push({kind:String(url).includes(':countTokens')?'count':'generate',body:options.body});
   return String(url).includes(':countTokens')?new Response('{"totalTokens":120}',{status:200}):response();
  };
  const provider=new runtime.CodeDestinyProvider(env);
  await assert.rejects(provider.generate({...request,locale}),e=>e.code==='CHAPTER_TRUNCATED');
  assert.equal(provider.receipt.finishReason,'MAX_TOKENS');
  assert.equal(reference.length,2);
  const actual=[],budget=new BenchmarkBudget([{id:'chapter',outputTokens:5120}],async()=>{});
  await assert.rejects(runProductionBenchmarkCall({budget,id:'chapter',outputTokens:5120,
   invoke:()=>new runtime.CodeDestinyProvider(env).generate({...request,locale}),
   setFetchHandler:handler=>{globalThis.fetch=handler||original;},saveRequest:async()=>{},saveResponse:async()=>{},
   exchange:async(kind,url,options)=>{
    actual.push({kind:kind==='countTokens'?'count':'generate',body:options.body});
    assert.equal(new URL(url).pathname,`/v1beta/models/gemini-2.5-flash:${kind}`);
    return kind==='countTokens'?new Response('{"totalTokens":120}',{status:200}):response();
   }}),e=>e.code==='CHAPTER_TRUNCATED');
  assert.deepEqual(actual,reference,'Every production count/generation byte, including locale/schema/defaults, must survive');
  assert.equal(budget.state.generationCalls,1);
  assert.equal(JSON.parse(actual[1].body).generationConfig.thinkingConfig.thinkingBudget,1024);
  if(locale==='en')assert.match(actual[1].body,/English/);
 }finally{globalThis.fetch=original;}
});

test('production timeout is spent once with no second provider or fallback request',async()=>{
 const original=globalThis.fetch,budget=new BenchmarkBudget([{id:'chapter',outputTokens:5120}],async()=>{});
 const exchanges=[];
 const run=()=>runProductionBenchmarkCall({budget,id:'chapter',outputTokens:5120,
  invoke:()=>new runtime.CodeDestinyProvider(env).generate({...request,locale:'ko'}),
  setFetchHandler:handler=>{globalThis.fetch=handler||original;},saveRequest:async()=>{},saveResponse:async()=>{},
  exchange:async(kind)=>{exchanges.push(kind);if(kind==='countTokens')return new Response('{"totalTokens":120}',{status:200});throw Object.assign(new Error('simulated timeout'),{name:'AbortError'});}});
 try{
  await assert.rejects(run());const reserved=budget.state.reservedNanoUsd;
  await assert.rejects(run(),/Spent call/);
  assert.deepEqual(exchanges,['countTokens','generateContent']);assert.equal(budget.state.generationCalls,1);
  assert.equal(budget.state.reservedNanoUsd,reserved);
 }finally{globalThis.fetch=original;}
});
