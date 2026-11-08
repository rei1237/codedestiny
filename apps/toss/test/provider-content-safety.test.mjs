import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {callLLM} from '../../../lib/llm-client.ts';

const request={prompt:'오늘 업무의 흐름을 살펴봐 주세요.',maxTokens:120,maxProviderAttempts:3};
const blocked=error=>error.code==='LLM_CONTENT_BLOCKED'&&error.status===422;
const reply=body=>({ok:true,status:200,json:async()=>body});

test('Gemini blocks are terminal even when partial text or a fallback provider is available',async t=>{
  let verdict,generations=0,fallbacks=0;
  t.mock.method(globalThis,'fetch',async url=>{
    if(String(url).includes(':countTokens'))return reply({totalTokens:16});
    generations++;return reply(verdict);
  });
  const env={GEMINIF_API_KEY:'test-key',WORKERS_AI_ENABLED:'true',AI:{run:async()=>{fallbacks++;return {response:'alternate'};}}};
  const partial={parts:[{text:'partial fixture text'}]};
  for(const body of [{promptFeedback:{blockReason:'SAFETY'}},
    {candidates:[{finishReason:'PROHIBITED_CONTENT',content:partial}]},
    {candidates:[{finishReason:'STOP',safetyRatings:[{blocked:true}],content:partial}]}]){
    verdict=body;const before=generations;
    await assert.rejects(callLLM(request,env),blocked);
    assert.equal(generations,before+1);
    assert.equal(fallbacks,0);
  }
  verdict={candidates:[{finishReason:'STOP',safetyRatings:[{blocked:false}],content:partial}]};
  assert.equal((await callLLM(request,env)).text,'partial fixture text');
});

test('cached response with a safety termination is withheld without a provider call',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('unexpected provider');});
  const cache={deterministic:true,store:{get:async()=>({provider:'gemini',model:'test',text:'old partial',finishReason:'SAFETY'}),set:async()=>assert.fail('unexpected write')}};
  await assert.rejects(callLLM({...request,cache},{GEMINIF_API_KEY:'test-key'}),blocked);
  assert.equal(calls,0);
});

test('a Workers AI content filter never falls through to the next model',async t=>{
  t.mock.method(globalThis,'fetch',async url=>String(url).includes(':countTokens')?reply({totalTokens:16}):({ok:false,status:400,json:async()=>({error:{message:'test failure'}})}));
  let calls=0;
  const env={GEMINIF_API_KEY:'test-key',WORKERS_AI_ENABLED:'true',AI:{run:async()=>{calls++;return {choices:[{finish_reason:'content_filter',message:{content:'partial fixture text'}}]};}}};
  await assert.rejects(callLLM(request,env),blocked);assert.equal(calls,1);
});
