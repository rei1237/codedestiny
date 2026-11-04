import '../../scripts/lib/mock-network-guard.cjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const built = await build({ entryPoints: ['lib/llm-client.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { callLLM, createGeminiContextCache, restoreGeminiContextCache } = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));

const success = { candidates: [{ content: { parts: [{ text: '사용할 수 있는 상담 본문입니다.' }] }, finishReason: 'STOP' }] };
const env = { GEMINIF_API_KEY: 'fixture-only' };
const PREFIX = 'p'.repeat(4000);

async function withFetch(handler, run) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  try { return await run(); } finally { globalThis.fetch = original; }
}

function generationRecorder(respond) {
  const bodies = [];
  const handler = async (url, options) => {
    if (String(url).includes(':countTokens')) return Response.json({ totalTokens: 100 });
    if (String(url).includes('/cachedContents')) { bodies.push({ create: JSON.parse(options.body) }); return Response.json({ name: 'cachedContents/fixture' }); }
    const body = JSON.parse(options.body);
    bodies.push(body);
    return respond(body, bodies.length);
  };
  return { bodies, handler };
}

// A paid call has exactly one generation attempt, so a stale handle must not spend it.
test('an expired cache handle recovers with the full prompt on a one-attempt paid call', async () => {
  const { bodies, handler } = generationRecorder((body) => body.cachedContent
    ? Response.json({ error: { message: 'CachedContent not found (or permission denied)' } }, { status: 403 })
    : Response.json(success));
  const response = await withFetch(handler, () => callLLM({
    prompt: `${PREFIX} question`, systemPrompt: 'rules', maxProviderAttempts: 1, fallbackToWorkersAI: false,
    geminiCachedContent: restoreGeminiContextCache({ name: 'cachedContents/expired', prefix: PREFIX, systemPrompt: 'rules' }),
  }, env));
  assert.equal(response.text, success.candidates[0].content.parts[0].text);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].cachedContent, 'cachedContents/expired');
  assert.equal(bodies[1].cachedContent, undefined);
  assert.match(bodies[1].systemInstruction.parts[0].text, /^rules/);
  assert.ok(bodies[1].contents[0].parts[0].text.startsWith(`${PREFIX} question`));
});

// Only a rejected reference is free: anything that may have generated stays inside the one attempt.
for (const [label, status, message] of [
  ['an outage', 503, 'overloaded'],
  ['an unrelated bad request', 400, 'invalid argument'],
]) test(`${label} does not earn a second generation on a one-attempt call`, async () => {
  const { bodies, handler } = generationRecorder(() => Response.json({ error: { message } }, { status }));
  await assert.rejects(withFetch(handler, () => callLLM({
    prompt: `${PREFIX} question`, maxProviderAttempts: 1, fallbackToWorkersAI: false,
    geminiCachedContent: restoreGeminiContextCache({ name: 'cachedContents/fixture', prefix: PREFIX }),
  }, env)));
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].cachedContent, 'cachedContents/fixture');
});

test('a rejected handle without a usable full-prompt success still reports the failure', async () => {
  const { bodies, handler } = generationRecorder(() => Response.json({ error: { message: 'CachedContent not found' } }, { status: 403 }));
  await assert.rejects(withFetch(handler, () => callLLM({
    prompt: `${PREFIX} question`, maxProviderAttempts: 1, fallbackToWorkersAI: false,
    geminiCachedContent: restoreGeminiContextCache({ name: 'cachedContents/expired', prefix: PREFIX }),
  }, env)));
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].cachedContent, 'cachedContents/expired');
  assert.equal(bodies[1].cachedContent, undefined);
});

// The persona register changes the directive. A cache baked with the default register never matches the call.
test('a persona-register cache is referenced by a persona-register call', async () => {
  const { bodies, handler } = generationRecorder(() => Response.json(success));
  await withFetch(handler, async () => {
    const cache = await createGeminiContextCache({ prefix: PREFIX, systemPrompt: 'rules', locale: 'ko', outputRegister: 'persona' }, env);
    assert.ok(cache);
    await callLLM({ prompt: `${PREFIX} question`, systemPrompt: 'rules', locale: 'ko', outputRegister: 'persona', maxProviderAttempts: 1, geminiCachedContent: cache }, env);
  });
  const generation = bodies.find((body) => !body.create);
  assert.equal(generation.cachedContent, 'cachedContents/fixture');
  assert.equal(generation.systemInstruction, undefined);
});

// Staging answers from a mock, so a cache there would spend real provider money for nothing.
test('the staging mock never creates a provider cache', async () => {
  const { bodies, handler } = generationRecorder(() => Response.json(success));
  const cache = await withFetch(handler, () => createGeminiContextCache({ prefix: PREFIX }, {
    ...env, APP_ENV: 'staging', STAGING_LLM_MOCK_ENABLED: 'true', WORKERS_AI_ENABLED: 'false',
  }));
  assert.equal(cache, null);
  assert.equal(bodies.length, 0);
});

// A queue message rebuilds the handle from the stored name plus the prompt it is about to send.
test('a restored handle matches the call exactly as a created one does', async () => {
  const { bodies, handler } = generationRecorder(() => Response.json(success));
  await withFetch(handler, async () => {
    const created = await createGeminiContextCache({ prefix: PREFIX, systemPrompt: 'rules', locale: 'en', outputRegister: 'persona' }, env);
    const restored = restoreGeminiContextCache({ name: created.name, prefix: PREFIX, systemPrompt: 'rules', locale: 'en', outputRegister: 'persona' });
    assert.deepEqual(restored, created);
    await callLLM({ prompt: `${PREFIX} question`, systemPrompt: 'rules', locale: 'en', outputRegister: 'persona', maxProviderAttempts: 1, geminiCachedContent: restored }, env);
  });
  assert.equal(bodies.find((body) => !body.create).cachedContent, 'cachedContents/fixture');
});
