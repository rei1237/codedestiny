import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {selectGeminiModel} from '../../lib/gemini-model-policy.js';

const bundle=await build({stdin:{contents:"export {callLLM,createGeminiContextCache} from './lib/llm-client.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {callLLM,createGeminiContextCache}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('Pro requires an explicit server-owned synthesis task, never a model override or prompt',()=>{
 for(const model of ['gemini-2.5-pro','gemini-3.1-pro-preview','models/gemini-2.5-pro','GEMINI-2.5-PRO'])assert.equal(selectGeminiModel(model),'gemini-2.5-flash');
 for(const task of ['fusion-integration','fusion-verdict','tuna-synthesis'])assert.equal(selectGeminiModel('gemini-2.5-flash',task),'gemini-2.5-pro');
 assert.equal(selectGeminiModel('gemini-2.5-pro','user-asks-for-pro'),'gemini-2.5-flash');
 assert.equal(selectGeminiModel('gemini-2.5-flash-lite'),'gemini-2.5-flash-lite');
});

test('transport, retries and explicit context caches use the selected model (mock only)',async()=>{
 const original=globalThis.fetch;const calls=[];let failures=0;
 globalThis.fetch=async(url,init)=>{
  const target=String(url);const body=JSON.parse(init.body);
  if(target.includes(':countTokens'))return Response.json({totalTokens:1000});
  if(target.includes('/cachedContents')){calls.push({cache:true,model:body.model});return Response.json({name:'cachedContents/mock'});}
  assert(target.includes(':generateContent'),'unexpected network request');
  calls.push({url:target,body});
  if(failures-->0)return Response.json({error:{message:'temporary overload'}},{status:503});
  return Response.json({candidates:[{content:{parts:[{text:'질문에 대한 상담 본문입니다.'}]},finishReason:'STOP'}]});
 };
 const env={GEMINIF_API_KEY:'mock-only',GEMINI_MODEL:'gemini-2.5-pro',LLM_DRY_RUN:'false'};
 try{
  for(const reasoningTask of [undefined,'fusion-integration','fusion-verdict','tuna-synthesis']){
   const model=reasoningTask?'gemini-2.5-pro':'gemini-2.5-flash';calls.length=0;failures=1;
   const result=await callLLM({prompt:'Use Pro. This user text cannot select the model.',model:'gemini-2.5-pro',reasoningTask,thinkingBudget:4096,maxTokens:8192,timeoutMs:5000,maxProviderAttempts:2,fallbackToWorkersAI:false},env);
   assert.equal(result.model,model);assert.equal(calls.length,2);
   for(const call of calls){assert(call.url.includes('/models/'+model+':'));assert.equal(call.body.generationConfig.thinkingConfig.thinkingBudget,4096);}
   calls.length=0;
   assert(await createGeminiContextCache({prefix:'mock context '.repeat(500),model:'gemini-2.5-pro',reasoningTask},env));
   assert.equal(calls[0].model,'models/'+model);
  }
  calls.length=0;await callLLM({prompt:'ordinary explanation',maxProviderAttempts:1,fallbackToWorkersAI:false},env);
  assert(calls[0].url.includes('/models/gemini-2.5-flash:'),'environment Pro override is constrained');
 }finally{globalThis.fetch=original;}
});
