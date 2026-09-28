import '../..//scripts/lib/mock-network-guard.cjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const built = await build({entryPoints:['lib/llm-client.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {callLLM} = await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const success = { candidates:[{ content:{parts:[{text:'사용할 수 있는 상담 본문입니다.'}]},finishReason:'STOP'}] };
for (const limit of [1,2,20]) test(`cache recovery and fallback share generation limit ${limit}`, async () => {
  const original = globalThis.fetch;
  let generations=0, fallback=0;
  globalThis.fetch = async url => {
    if (String(url).includes(':countTokens')) return Response.json({totalTokens:100});
    assert.match(String(url), /:generateContent/);
    generations++;
    return Response.json({error:{message:'invalid cache'}},{status:400});
  };
  try {
    await assert.rejects(callLLM({prompt:'prefix question',maxProviderAttempts:limit,geminiCachedContent:{name:'cachedContents/mock',prefix:'prefix',model:'gemini-2.5-flash',systemPrompt:''}},
      {GEMINIF_API_KEY:'fixture-only',AI:{run:async()=>{fallback++;throw Error('unavailable');}}}));
    assert.equal(generations+fallback,Math.min(2,limit));
  } finally { globalThis.fetch=original; }
});
test('one transient retry succeeds and stops without fallback', async()=>{
  const original=globalThis.fetch; let generations=0;
  globalThis.fetch=async url=>String(url).includes(':countTokens')?Response.json({totalTokens:100}):
    ++generations===1?Response.json({error:{message:'overloaded'}},{status:503}):Response.json(success);
  try {
    const result=await callLLM({prompt:'fixture'}, {GEMINIF_API_KEY:'fixture-only',AI:{run:async()=>{throw Error('must not fall back');}}});
    assert.equal(result.text,success.candidates[0].content.parts[0].text);assert.equal(generations,2);
  } finally { globalThis.fetch=original; }
});
test('first success spends one generation', async()=>{
  const original=globalThis.fetch; let generations=0;
  globalThis.fetch=async url=>{if(String(url).includes(':countTokens'))return Response.json({totalTokens:100});generations++;return Response.json(success);};
  try { await callLLM({prompt:'fixture'},{GEMINIF_API_KEY:'fixture-only'});assert.equal(generations,1); }
  finally { globalThis.fetch=original; }
});
