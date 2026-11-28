import '../..//scripts/lib/mock-network-guard.cjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// 2026-11-18 사용자 요청: "오래 걸리더라도 확실하게 생성되는게 좋고 보조 모델보다도 제미나이로
// 생성되도록해줘 정 안되면 보조 모델을 쓰도록하고". 호출부가 finalProviderAttempt 로
// 그 작업 단위의 마지막 시도인지 알려 주면, 그 전 시도는 Gemini 만 쓰고 마지막 시도만
// Gemini 실패 뒤 Workers AI 로 내려간다. 미지정은 종전 동작이다.
const built = await build({ entryPoints: ['lib/llm-client.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { callLLM } = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const workerBuilt = await build({ stdin: { contents: "export * from './worker/lib/gemini.js';export * from './worker/lib/structured-consultation.js';export * from './worker/lib/paid-generation-context.js';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const { callGeminiText, callGeminiJsonWithRetry, runWithPaidGenerationContext } = await import('data:text/javascript;base64,' + Buffer.from(workerBuilt.outputFiles[0].text).toString('base64'));

const BODY = '사용할 수 있는 상담 본문입니다.';
const success = { candidates: [{ content: { parts: [{ text: BODY }] }, finishReason: 'STOP' }] };

function harness({ tokenizer = () => Response.json({ totalTokens: 100 }), generate, fallbackText = '보조 모델 본문입니다.' } = {}) {
  const counts = { tokenizer: 0, generations: 0, fallback: 0 };
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).includes(':countTokens')) { counts.tokenizer++; return tokenizer(counts.tokenizer); }
    counts.generations++;
    return generate(counts.generations);
  };
  const env = { GEMINIF_API_KEY: 'fixture-only', AI: { run: async () => { counts.fallback++; return { response: fallbackText }; } } };
  return { counts, env, restore: () => { globalThis.fetch = original; } };
}
const overloaded = () => Response.json({ error: { message: 'overloaded' } }, { status: 503 });
const invalid = () => Response.json({ error: { message: 'bad request' } }, { status: 400 });

test('early attempt: a Gemini failure is thrown for the next Gemini attempt, Workers AI is not called', async () => {
  const h = harness({ generate: invalid });
  try {
    await assert.rejects(callLLM({ prompt: 'fixture', maxProviderAttempts: 2, finalProviderAttempt: false }, h.env));
    assert.equal(h.counts.generations, 1); assert.equal(h.counts.fallback, 0);
  } finally { h.restore(); }
});

test('early attempt: a tokenizer outage does not jump to Workers AI before Gemini was tried', async () => {
  const h = harness({ tokenizer: overloaded, generate: () => Response.json(success) });
  try {
    await assert.rejects(callLLM({ prompt: 'fixture', maxProviderAttempts: 2, finalProviderAttempt: false }, h.env),
      error => error.code === 'LLM_INPUT_TOKEN_COUNT_UNAVAILABLE');
    assert.equal(h.counts.fallback, 0); assert.equal(h.counts.generations, 0);
  } finally { h.restore(); }
});

test('a transient tokenizer failure is retried on Gemini before any fallback', async () => {
  const h = harness({ tokenizer: n => n === 1 ? overloaded() : Response.json({ totalTokens: 100 }), generate: () => Response.json(success) });
  try {
    const response = await callLLM({ prompt: 'fixture', maxProviderAttempts: 2 }, h.env);
    assert.equal(response.provider, 'gemini'); assert.equal(response.text, BODY);
    assert.equal(h.counts.tokenizer, 2); assert.equal(h.counts.generations, 1); assert.equal(h.counts.fallback, 0);
  } finally { h.restore(); }
});

test('final attempt: a transient Gemini failure gets one Gemini retry before Workers AI', async () => {
  const h = harness({ generate: n => n === 1 ? overloaded() : Response.json(success) });
  try {
    const response = await callLLM({ prompt: 'fixture', maxProviderAttempts: 1, finalProviderAttempt: true }, h.env);
    assert.equal(response.provider, 'gemini'); assert.equal(h.counts.generations, 2); assert.equal(h.counts.fallback, 0);
  } finally { h.restore(); }
});

test('final attempt: Gemini failing for good falls back to Workers AI exactly once', async () => {
  const h = harness({ generate: overloaded });
  try {
    const response = await callLLM({ prompt: 'fixture', maxProviderAttempts: 1, finalProviderAttempt: true }, h.env);
    assert.equal(response.provider, 'cloudflare'); assert.equal(h.counts.generations, 2); assert.equal(h.counts.fallback, 1);
  } finally { h.restore(); }
});

test('final attempt: both providers failing keeps the terminal failure shape', async () => {
  const h = harness({ generate: invalid });
  h.env.AI.run = async () => { h.counts.fallback++; throw Error('unavailable'); };
  try {
    await assert.rejects(callLLM({ prompt: 'fixture', maxProviderAttempts: 1, finalProviderAttempt: true }, h.env),
      error => error.fallbackCode === 'WORKERS_AI_UNAVAILABLE');
    // 400 은 일시 오류가 아니라 Gemini 재시도 없음. 보조 모델 체인(기본 2개)은 각 1회씩.
    assert.equal(h.counts.generations, 1); assert.equal(h.counts.fallback, 2);
  } finally { h.restore(); }
});

test('final attempt still honours an explicit fallbackToWorkersAI:false and never retries a timeout', async () => {
  const h = harness({ generate: invalid });
  try {
    await assert.rejects(callLLM({ prompt: 'fixture', finalProviderAttempt: true, fallbackToWorkersAI: false }, h.env));
    assert.equal(h.counts.fallback, 0);
  } finally { h.restore(); }
  const t = harness({ generate: () => Response.json({}, { status: 504 }) });
  try {
    await assert.rejects(callLLM({ prompt: 'fixture', finalProviderAttempt: true }, t.env), error => error.code === 'LLM_GENERATION_TIMEOUT');
    assert.equal(t.counts.generations, 1); assert.equal(t.counts.fallback, 0);
  } finally { t.restore(); }
});

test('worker wrapper forwards finalProviderAttempt (paid context included) and keeps the short-fallback gate', async () => {
  const h = harness({ generate: overloaded, fallbackText: '짧음' });
  try {
    const early = await callGeminiText(h.env, 'fixture', { finalProviderAttempt: false, fallbackMinChars: 2 });
    assert.equal(early.ok, false); assert.equal(h.counts.fallback, 0);
    const final = await runWithPaidGenerationContext({ requestId: 'mock' }, () =>
      callGeminiText(h.env, 'fixture', { finalProviderAttempt: true, fallbackMinChars: 2 }));
    assert.equal(final.ok, true); assert.equal(final.provider, 'workers-ai'); assert.equal(h.counts.fallback, 1);
    const tooShort = await callGeminiText(h.env, 'fixture', { finalProviderAttempt: true, fallbackMinChars: 50 });
    assert.equal(tooShort.ok, false); assert.equal(tooShort.error, 'fallback_output_too_short');
  } finally { h.restore(); }
});

test('structured wrapper passes finalProviderAttempt through to the provider call', async () => {
  const h = harness({ generate: invalid, fallbackText: '{"body":"보조 모델 본문입니다."}' });
  try {
    const early = await callGeminiJsonWithRetry(h.env, 'fixture', { attempts: 1, baseTokens: 1000, finalProviderAttempt: false });
    assert.equal(early.ok, false); assert.equal(h.counts.fallback, 0);
    const final = await callGeminiJsonWithRetry(h.env, 'fixture', { attempts: 1, baseTokens: 1000, finalProviderAttempt: true });
    assert.equal(final.ok, true); assert.equal(final.provider, 'workers-ai'); assert.equal(h.counts.fallback, 1);
  } finally { h.restore(); }
});

// 2026-11-28 S9 고객센터: primaryProvider 'cloudflare' 는 Workers AI 를 먼저 1회 쓰고, 실패에만 Gemini 를 1회 쓴다.
test('primaryProvider cloudflare: Workers AI answers first and Gemini is not called', async () => {
  const h = harness({ generate: () => Response.json(success) });
  try {
    const result = await callLLM({ prompt: 'fixture', primaryProvider: 'cloudflare', maxProviderAttempts: 1 }, h.env);
    assert.equal(result.provider, 'cloudflare'); assert.equal(h.counts.fallback, 1);
    assert.equal(h.counts.generations, 0); assert.equal(h.counts.tokenizer, 0);
  } finally { h.restore(); }
});

test('primaryProvider cloudflare: a Workers AI failure goes to Gemini once, never back to Workers AI', async () => {
  const h = harness({ generate: () => Response.json(success) });
  h.env.AI.run = async () => { h.counts.fallback++; throw new Error('workers ai down'); };
  try {
    const result = await callLLM({ prompt: 'fixture', primaryProvider: 'cloudflare', maxProviderAttempts: 1 }, h.env);
    assert.equal(result.text, BODY); assert.equal(h.counts.generations, 1); assert.equal(h.counts.fallback, 1);
  } finally { h.restore(); }
  const both = harness({ generate: invalid });
  both.env.AI.run = async () => { both.counts.fallback++; throw new Error('workers ai down'); };
  try {
    await assert.rejects(callLLM({ prompt: 'fixture', primaryProvider: 'cloudflare', maxProviderAttempts: 1 }, both.env));
    assert.equal(both.counts.generations, 1); assert.equal(both.counts.fallback, 1);
  } finally { both.restore(); }
});
