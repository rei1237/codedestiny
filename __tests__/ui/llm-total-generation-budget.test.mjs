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

const workerBuilt = await build({stdin:{contents:"export * from './worker/lib/gemini.js';export * from './worker/lib/paid-generation-context.js';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {callGeminiText,runWithPaidGenerationContext,getPaidGenerationRaw,getPaidGenerationContext} = await import('data:text/javascript;base64,'+Buffer.from(workerBuilt.outputFiles[0].text).toString('base64'));
test('two durable worker reservations cannot multiply provider, cache and fallback calls', async()=>{
  const original=globalThis.fetch; let generations=0, fallback=0;
  globalThis.fetch=async url=>{
    if(String(url).includes(':countTokens'))return Response.json({totalTokens:100});
    generations++;return Response.json({error:{message:'overloaded'}},{status:503});
  };
  try {
    const env={GEMINIF_API_KEY:'fixture-only',AI:{run:async()=>{fallback++;throw Error('unavailable');}}};
    for(let attempt=0;attempt<2;attempt++){
      const response=await callGeminiText(env,'fixture',{fallbackToWorkersAI:true});
      assert.equal(response.ok,false);
    }
    assert.equal(generations,2);assert.equal(fallback,0);
  } finally {globalThis.fetch=original;}
});

test('paid worker captures exact raw text outside log metadata for checkpoint persistence',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async url=>Response.json(String(url).includes(':countTokens')?{totalTokens:100}:success);
  try {
    await runWithPaidGenerationContext({requestId:'mock'},async()=>{
      await callGeminiText({GEMINIF_API_KEY:'fixture-only'},'fixture');
      assert.equal(getPaidGenerationRaw(),success.candidates[0].content.parts[0].text);
      assert.deepEqual(getPaidGenerationContext(),{requestId:'mock'});
    });
    assert.equal(getPaidGenerationRaw(),'');
  }finally{globalThis.fetch=original;}
});


for (const fixture of [
  { label: 'HTTP 504 with empty body', status: 504, payload: {} },
  { label: 'HTTP 408 with generic message', status: 408, payload: { error: { message: 'request failed' } } },
  { label: 'provider deadline before local deadline', status: 500, payload: { error: { message: 'upstream deadline exceeded' } } },
  { label: 'AbortError before local deadline', thrown: Object.assign(Error('transport stopped'), { name: 'AbortError' }) },
  { label: 'TimeoutError before local deadline', thrown: Object.assign(Error('transport stopped'), { name: 'TimeoutError' }) },
]) test(fixture.label + ' cannot trigger cache replay, retry or fallback', async () => {
  const original = globalThis.fetch; let generations = 0, fallback = 0;
  globalThis.fetch = async url => {
    if (String(url).includes(':countTokens')) return Response.json({ totalTokens: 100 });
    generations++;
    if (fixture.thrown) throw fixture.thrown;
    return Response.json(fixture.payload, { status: fixture.status });
  };
  try {
    await assert.rejects(callLLM({
      prompt: 'prefix fixture', timeoutMs: 30000, maxProviderAttempts: 2,
      geminiCachedContent: { name: 'cachedContents/mock', prefix: 'prefix', systemPrompt: '' },
    }, { GEMINIF_API_KEY: 'fixture-only', AI: { run: async () => { fallback++; return { response: 'unused' }; } } }),
    error => error.code === 'LLM_GENERATION_TIMEOUT');
    assert.equal(generations, 1); assert.equal(fallback, 0);
  } finally { globalThis.fetch = original; }
});

test('tokenizer timeout before generation retains the allowed fallback', async () => {
  const original = globalThis.fetch; let generations = 0, fallback = 0;
  globalThis.fetch = async url => {
    if (String(url).includes(':countTokens')) throw Object.assign(Error('tokenizer timed out'), { name: 'TimeoutError' });
    generations++; throw Error('generation must not run without token verification');
  };
  try {
    const response = await callLLM({ prompt: 'fixture', maxProviderAttempts: 2 },
      { GEMINIF_API_KEY: 'fixture-only', AI: { run: async () => { fallback++; return { response: '사용할 수 있는 상담 본문입니다.' }; } } });
    assert.equal(response.provider, 'cloudflare'); assert.equal(generations, 0); assert.equal(fallback, 1);
  } finally { globalThis.fetch = original; }
});

test('Workers AI timeout cannot start another model even with budget remaining', async () => {
  let fallback = 0;
  await assert.rejects(callLLM({ prompt: 'fixture', maxProviderAttempts: 2 },
    { AI: { run: async () => { fallback++; throw Object.assign(Error('request failed'), { status: 504 }); } } }),
    error => error.code === 'LLM_GENERATION_TIMEOUT');
  assert.equal(fallback, 1);
});

test('HTTP 429 can still use its one remaining retry', async () => {
  const original = globalThis.fetch; let generations = 0;
  globalThis.fetch = async url => String(url).includes(':countTokens') ? Response.json({ totalTokens: 100 }) :
    ++generations === 1 ? Response.json({ error: { message: 'rate limited' } }, { status: 429 }) : Response.json(success);
  try {
    assert.equal((await callLLM({ prompt: 'fixture' }, { GEMINIF_API_KEY: 'fixture-only' })).text, success.candidates[0].content.parts[0].text);
    assert.equal(generations, 2);
  } finally { globalThis.fetch = original; }
});

const structuredBuilt = await build({ entryPoints: ['worker/lib/structured-consultation.js'], bundle: true, platform: 'node', format: 'esm', write: false });
const { callGeminiJsonWithRetry } = await import('data:text/javascript;base64,' + Buffer.from(structuredBuilt.outputFiles[0].text).toString('base64'));
test('structured wrapper does not buy a second generation after generic HTTP 504', async () => {
  const original = globalThis.fetch; let generations = 0;
  globalThis.fetch = async url => {
    if (String(url).includes(':countTokens')) return Response.json({ totalTokens: 100 });
    generations++; return Response.json({}, { status: 504 });
  };
  try {
    const response = await callGeminiJsonWithRetry({ GEMINIF_API_KEY: 'fixture-only' }, 'fixture',
      { attempts: 2, baseTokens: 1000, capTokens: 1000, timeoutMs: 30000 });
    assert.equal(response.ok, false); assert.equal(response.error, 'LLM_GENERATION_TIMEOUT'); assert.equal(generations, 1);
  } finally { globalThis.fetch = original; }
});


test('a confirmed cached result remains readable after an uncertain generation timeout', async () => {
  const original = globalThis.fetch; let generations = 0, cached = null;
  globalThis.fetch = async url => {
    if (String(url).includes(':countTokens')) return Response.json({ totalTokens: 100 });
    generations++; return Response.json({}, { status: 504 });
  };
  const request = { prompt: 'same saved consultation', maxProviderAttempts: 2, cache: {
    deterministic: true, store: { get: async () => cached, set: async () => assert.fail('failed generation must not replace saved text') },
  } };
  try {
    await assert.rejects(callLLM(request, { GEMINIF_API_KEY: 'fixture-only' }), error => error.code === 'LLM_GENERATION_TIMEOUT');
    assert.equal(generations, 1);
    cached = { text: '저장 확인된 상담 본문입니다.', provider: 'gemini', model: 'gemini-2.5-flash' };
    const restored = await callLLM(request, { GEMINIF_API_KEY: 'fixture-only' });
    assert.equal(restored, cached); assert.equal(generations, 1);
  } finally { globalThis.fetch = original; }
});
