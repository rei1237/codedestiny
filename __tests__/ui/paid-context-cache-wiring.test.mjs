import '../../scripts/lib/mock-network-guard.cjs';
import { test, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const fixtures = `
export const state = globalThis.__wiringCache = { creates: [], calls: [], records: new Map(), createResult: undefined, respond: () => ({ ok: false, error: 'fixture' }) };
export async function callGeminiText(env, prompt, options) { state.calls.push({ prompt, options }); return state.respond(prompt, options); }
export async function createGeminiContextCache(env, options) {
  state.creates.push(options);
  if (state.createResult !== undefined) return state.createResult;
  return { name: 'cachedContents/' + state.creates.length, prefix: options.prefix, systemPrompt: options.systemPrompt };
}
export function restoreGeminiContextCache(options) { return { name: options.name, prefix: options.prefix, systemPrompt: options.systemPrompt, restored: true }; }
export const callGeminiWithRetry = callGeminiText;
export const createLlmCacheStore = () => ({
  async get(key) { return state.records.get(key) || null; },
  async set(key, value) { state.records.set(key, value); },
});
const chain = () => ({ sort: chain, lean: async () => null });
export const ServiceExecutionTransaction = { findOne: chain, findOneAndUpdate: chain };
export const withMongoRetry = (env, work) => work();
export const connectDb = async () => {};
class Schema { constructor() {} index() {} }
export const mongoose = { Schema, models: {}, model: () => ServiceExecutionTransaction };`;

const compiled = await build({
  stdin: {
    contents: `
export {state} from 'fixture-state';
export {runWithPaidGenerationContext} from './worker/lib/paid-generation-context.js';
export {contextCacheOptions} from './worker/lib/resumable-context-cache.js';
export {generateDefaultNarrativePart} from './worker/lib/paid-narrative-delivery.js';
export {loveTarotNarrativeAdapter} from './worker/lib/love-tarot-delivery.js';
export {mindscanNarrativeAdapter} from './worker/lib/mindscan-delivery.js';
export {tarotOracleNarrativeAdapter} from './worker/lib/tarot-oracle-delivery.js';`,
    resolveDir: process.cwd(), loader: 'js',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
  plugins: [{ name: 'wiring-fixtures', setup(b) {
    b.onResolve({ filter: /^fixture-state$|llm-cache-store\.js$|\/gemini\.js$|\/models\.js$|\/db\.js$/ }, () => ({ path: 'fixture', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: fixtures, loader: 'js' }));
  } }],
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const { state, runWithPaidGenerationContext, contextCacheOptions } = mod;

const env = { GEMINIF_API_KEY: 'fixture-not-used' };
const shared = 'P'.repeat(5000);
const last = () => state.calls.at(-1);

beforeEach(() => {
  state.creates.length = 0; state.calls.length = 0; state.records.clear();
  state.createResult = undefined;
  state.respond = () => ({ ok: false, error: 'fixture' });
});

describe('contextCacheOptions', () => {
  const inContext = (attempt, work) => runWithPaidGenerationContext({ serviceId: 's', requestId: 'exec-1', sectionGroup: 'g', attempt }, work);
  const input = { prompt: `${shared}\npart`, prefix: shared, systemPrompt: 'sys', timeoutMs: 45000 };

  test('takes the order scope and the attempt from the paid generation context', async () => {
    assert.equal((await inContext(1, () => contextCacheOptions(env, input))).geminiCachedContent, undefined);
    const second = await inContext(1, () => contextCacheOptions(env, input));
    assert.equal(second.geminiCachedContent.name, 'cachedContents/1');
    assert.equal(state.creates[0].systemPrompt, 'sys');
  });

  test('a retry from the context is plain and keeps its whole timeout', async () => {
    await inContext(1, () => contextCacheOptions(env, input));
    assert.deepEqual(await inContext(2, () => contextCacheOptions(env, input)), { timeoutMs: 45000 });
    assert.equal(state.creates.length, 0);
  });

  test('an explicit scope and attempt work outside the paid context', async () => {
    const explicit = { ...input, scope: ['user', 'session'], attempt: 1 };
    await contextCacheOptions(env, explicit);
    assert.equal((await contextCacheOptions(env, explicit)).geminiCachedContent.name, 'cachedContents/1');
  });

  test('a call with no known order or attempt stays outside the cache', async () => {
    assert.deepEqual(await contextCacheOptions(env, input), { timeoutMs: 45000 });
    assert.deepEqual(await contextCacheOptions(env, { ...input, scope: ['user'] }), { timeoutMs: 45000 });
    assert.equal(state.records.size, 0);
  });

  test('different orders never share a handle', async () => {
    await inContext(1, () => contextCacheOptions(env, input));
    const other = await runWithPaidGenerationContext({ serviceId: 's', requestId: 'exec-2', attempt: 1 }, () => contextCacheOptions(env, input));
    assert.equal(other.geminiCachedContent, undefined);
    assert.equal(state.creates.length, 0);
  });
});

// Every route below sends several parts of one order. run(part, attempt) sends one part
// through the real route code, so the prompt under test is the one the route really built.
const narrativeState = { prompt: shared, systemPrompt: undefined, evidenceHash: 'hash', parts: {}, input: { cards: [] }, locale: 'ko' };
const task = (part) => ({ id: part, title: part, prompt: `write ${part}`, minChars: 10 });
const paidContext = (part, attempt, work) => runWithPaidGenerationContext({ serviceId: 's', requestId: 'exec-1', sectionGroup: part, attempt }, work);

const routes = {
  'paid narrative default': {
    run: (part, attempt) => paidContext(part, attempt, () => mod.generateDefaultNarrativePart(env, { ...narrativeState, systemPrompt: 'sys' }, `${shared}\n\n[이번 호출 범위]\n${part}`, 45000)),
    systemPrompt: 'sys',
  },
  'love tarot': { run: (part, attempt) => paidContext(part, attempt, () => mod.loveTarotNarrativeAdapter(env).produce(task(part), narrativeState)) },
  mindscan: { run: (part, attempt) => paidContext(part, attempt, () => mod.mindscanNarrativeAdapter(env).produce(task(part), narrativeState)) },
  'tarot oracle': {
    run: (part, attempt) => paidContext(part, attempt, () => mod.tarotOracleNarrativeAdapter(env).produce(task(part), { ...narrativeState, systemPrompt: 'sys' })),
    systemPrompt: 'sys',
  },
};

for (const [name, route] of Object.entries(routes)) {
  describe(`${name} parts`, () => {
    test('the first part pays nothing, the second creates, later parts reuse the handle', async () => {
      await route.run('a', 1);
      assert.equal(state.creates.length, 0);
      assert.equal(last().options.geminiCachedContent, undefined);

      await route.run('b', 1);
      assert.equal(state.creates.length, 1);
      const handle = last().options.geminiCachedContent;
      assert.equal(handle.name, 'cachedContents/1');
      assert.ok(last().prompt.startsWith(handle.prefix), 'the prompt must begin with the cached prefix');
      assert.ok(last().prompt.length > handle.prefix.length, 'the part instruction stays outside the cache');
      assert.equal(handle.systemPrompt, route.systemPrompt);
      assert.equal(last().options.systemPrompt, route.systemPrompt);

      await route.run('c', 1);
      assert.equal(state.creates.length, 1);
      assert.equal(last().options.geminiCachedContent.restored, true);
    });

    test('a retry sends the whole prompt without a handle', async () => {
      await route.run('a', 1);
      await route.run('b', 1);
      await route.run('b', 2);
      assert.equal(last().options.geminiCachedContent, undefined);
      assert.equal(state.creates.length, 1);
    });

    test('a failed cache creation still sends the part', async () => {
      await route.run('a', 1);
      state.createResult = null;
      const before = state.calls.length;
      await route.run('b', 1);
      assert.equal(state.calls.length, before + 1);
      assert.equal(last().options.geminiCachedContent, undefined);
    });
  });
}
