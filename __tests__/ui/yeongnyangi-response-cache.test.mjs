import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export {chapterResponseCache} from './worker/yeongnyangi/providers/response-cache'; export {withLLMCache,buildCacheKey} from './lib/llm-cache';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,
 plugins:[{name:'mock-cache-db',setup(b){b.onResolve({filter:/llm-cache-store\.js$/},()=>({path:'cache',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'const data=new Map(); export const createLlmCacheStore=()=>({get:async key=>data.get(key)||null,set:async(key,value)=>{data.set(key,value);}});'}));}}]});
const {chapterResponseCache,withLLMCache,buildCacheKey}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const request={prompt:'private original input',systemPrompt:'chapter',taskType:'yeongnyangi-chapter',responseSchema:{type:'object'}};
const response={text:'{"summary":"saved provider response"}',provider:'gemini',model:'fixture'};
test('storage retries reuse a response without another provider call; rejected quality retries replace it',async()=>{
 let calls=0; const generate=async()=>{calls++;return {...response,text:JSON.stringify({summary:`result ${calls}`})};};
 const config=chapterResponseCache({},'owner','storage','1');
 const first=await withLLMCache(request,generate,config);
 assert.deepEqual(await withLLMCache(request,generate,config),first);assert.equal(calls,1);
 const repaired=await withLLMCache(request,generate,chapterResponseCache({},'owner','storage','1',true));
 assert.equal(calls,2);assert.notDeepEqual(repaired,first);
 assert.deepEqual(await withLLMCache(request,generate,config),repaired);assert.equal(calls,2);
});
test('owner, request, chapter, original input and schema are isolated',async()=>{
 const keys=[];
 for(const [owner,id,section,prompt,schema] of [['a','r','1','input','object'],['b','r','1','input','object'],['a','other','1','input','object'],['a','r','2','input','object'],['a','r','1','changed','object'],['a','r','1','input','array']]){
  keys.push(await buildCacheKey({...request,prompt,responseSchema:{type:schema}},chapterResponseCache({},owner,id,section).keyExtra));
 }
 assert.equal(new Set(keys).size,6);
 assert.equal(chapterResponseCache({},undefined,'r','1'),undefined);
});
test('malformed, truncated and mock responses never become reusable cache entries',async()=>{
 for(const [index,invalid] of [{...response,text:'broken'},{...response,truncated:true},{...response,finishReason:'MAX_TOKENS'},{...response,isMock:true}].entries()){
  let calls=0;const config=chapterResponseCache({},'owner',`invalid-${index}`,'1');
  await withLLMCache(request,async()=>{calls++;return invalid;},config);
  await withLLMCache(request,async()=>{calls++;return response;},config);
  assert.equal(calls,2);
 }
});
test('simultaneous identical calls deduplicate without sharing other purchases',async()=>{
 let calls=0;
 const generate=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,10));return response;};
 const config=chapterResponseCache({},'owner','parallel','1');
 await Promise.all([withLLMCache(request,generate,config),withLLMCache(request,generate,config)]);
 assert.equal(calls,1);
 await withLLMCache(request,generate,chapterResponseCache({},'owner','separate','1'));assert.equal(calls,2);
});
