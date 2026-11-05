import '../../scripts/lib/mock-network-guard.cjs';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const fixtures = `
export const state = globalThis.__chapterCache = { creates: [], calls: [], records: new Map(), reads: 0, createResult: undefined, createDelayMs: 0, respond: () => ({ ok: true, text: '{}', provider: 'gemini' }), storeThrows: false };
export async function callGeminiText(env, prompt, options) { state.calls.push({ prompt, options }); return state.respond(options, state.calls.length); }
export async function createGeminiContextCache(env, options) {
  state.creates.push(options);
  if (state.createDelayMs) await new Promise((resolve) => setTimeout(resolve, state.createDelayMs));
  if (state.createResult !== undefined) return state.createResult;
  return { name: 'cachedContents/' + state.creates.length, prefix: options.prefix, systemPrompt: options.systemPrompt };
}
export function restoreGeminiContextCache(options) { return { name: options.name, prefix: options.prefix, systemPrompt: options.systemPrompt, restored: true }; }
export const pickGeminiKeys = () => ['GEMINIF_API_KEY'];
export const createLlmCacheStore = () => ({
  async get(key) { state.reads++; if (state.storeThrows) throw new Error('store down'); return state.records.get(key) || null; },
  async set(key, value) { if (state.storeThrows) throw new Error('store down'); state.records.set(key, value); },
});`;

const compiled = await build({
  stdin: { contents: "export {CodeDestinyProvider} from './worker/yeongnyangi/providers/code-destiny'; export {state} from 'fixture-state';", resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'chapter-cache-fixtures', setup(b) {
    b.onResolve({ filter: /^fixture-state$|llm-cache-store\.js$|\/gemini\.js$/ }, () => ({ path: 'fixture', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: fixtures }));
  } }],
});
const { CodeDestinyProvider, state } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));

const env = { GEMINIF_API_KEY: 'fixture-not-used', LLM_DRY_RUN: 'false' };
const facts = (label) => ({ domain: 'saju', facts: [{ id: `sys.${label}`, value: label.repeat(5000) }] });
const request = (label = 'a', chapter = 'one') => ({
  system: 'rules', locale: 'ko', deliveryContract: 'v1', domainRules: JSON.stringify({ chapter }),
  calculatedData: facts(label), userQuestion: 'question', outputSchema: { type: 'object' }, sectionTitles: [chapter],
});
const provider = ({ attempt = 1, owner = 'owner', timeoutMs = 120000, model, task, testEnv = env } = {}) =>
  new CodeDestinyProvider(testEnv, { requestId: 'order', sectionGroup: '1', attempt }, { owner }, timeoutMs, model, task);

beforeEach(() => {
  state.creates.length = 0; state.calls.length = 0; state.records.clear(); state.reads = 0;
  state.createResult = undefined; state.createDelayMs = 0; state.storeThrows = false;
  state.respond = () => ({ ok: true, text: '{}', provider: 'gemini' });
});

const last = () => state.calls.at(-1);

test('the payload keeps every field and leads with the facts so chapters can share a prefix', async () => {
  await provider().generate(request('a', 'one'));
  await provider().generate(request('a', 'two'));
  const [first, second] = state.calls.map((call) => call.prompt);
  assert.deepEqual(Object.keys(JSON.parse(first)), ['CALCULATED_DATA', 'DOMAIN_CONTEXT', 'USER_QUESTION', 'SECTION_TITLES']);
  assert.deepEqual(JSON.parse(first).CALCULATED_DATA, facts('a'));
  assert.deepEqual(JSON.parse(first).DOMAIN_CONTEXT, { chapter: 'one' });
  const prefix = last().options.geminiCachedContent.prefix;
  assert.ok(first.startsWith(prefix) && second.startsWith(prefix));
  assert.ok(prefix.includes('sys.a'));
  assert.equal(prefix.includes('DOMAIN_CONTEXT'), false);
});

test('the first chapter pays no cache cost, the second creates, and later chapters reuse the handle', async () => {
  await provider().generate(request('a', 'one'));
  assert.equal(state.creates.length, 0);
  assert.equal(last().options.geminiCachedContent, undefined);

  await provider().generate(request('a', 'two'));
  assert.equal(state.creates.length, 1);
  assert.equal(last().options.geminiCachedContent.name, 'cachedContents/1');
  assert.equal(state.creates[0].outputRegister, 'persona');
  assert.equal(state.creates[0].locale, 'ko');
  assert.equal(state.creates[0].systemPrompt, 'rules');

  await provider().generate(request('a', 'three'));
  assert.equal(state.creates.length, 1);
  assert.equal(last().options.geminiCachedContent.name, 'cachedContents/1');
  assert.equal(last().options.geminiCachedContent.restored, true);
});

test('chapters with different facts never share a handle', async () => {
  await provider().generate(request('a', 'one'));
  await provider().generate(request('b', 'two'));
  assert.equal(state.creates.length, 0);
  assert.equal(last().options.geminiCachedContent, undefined);
  await provider().generate(request('b', 'three'));
  assert.ok(state.creates[0].prefix.includes('sys.b'));
});

test('every retry of a chapter sends the full prompt and never touches the cache', async () => {
  await provider().generate(request('a', 'one'));
  await provider().generate(request('a', 'two'));
  const reads = state.reads, creates = state.creates.length;
  await provider({ attempt: 2 }).generate(request('a', 'two'));
  assert.equal(last().options.geminiCachedContent, undefined);
  assert.equal(state.reads, reads);
  assert.equal(state.creates.length, creates);
});

test('a failed cache creation still generates the chapter', async () => {
  await provider().generate(request('a', 'one'));
  state.createResult = null;
  const result = await provider().generate(request('a', 'two'));
  assert.equal(result.result, '{}');
  assert.equal(last().options.geminiCachedContent, undefined);
});

test('a thrown cache creation still generates the chapter', async () => {
  await provider().generate(request('a', 'one'));
  state.createResult = Promise.reject(new Error('create exploded'));
  state.createResult.catch(() => {});
  const result = await provider().generate(request('a', 'two'));
  assert.equal(result.result, '{}');
  assert.equal(last().options.geminiCachedContent, undefined);
});

test('a broken handle store still generates the chapter', async () => {
  state.storeThrows = true;
  const result = await provider().generate(request('a', 'one'));
  assert.equal(result.result, '{}');
  assert.equal(last().options.geminiCachedContent, undefined);
  assert.equal(state.creates.length, 0);
});

test('an expired handle is replaced instead of being referenced', async () => {
  await provider().generate(request('a', 'one'));
  await provider().generate(request('a', 'two'));
  for (const [key, value] of state.records) state.records.set(key, { ...value, text: JSON.stringify({ ...JSON.parse(value.text), expiresAt: Date.now() + 1000 }) });
  await provider().generate(request('a', 'three'));
  assert.equal(state.creates.length, 2);
  assert.equal(last().options.geminiCachedContent.name, 'cachedContents/2');
});

test('the kill switch stops stored handles as well as new caches', async () => {
  await provider().generate(request('a', 'one'));
  await provider().generate(request('a', 'two'));
  const creates = state.creates.length;
  await provider({ testEnv: { ...env, GEMINI_CONTEXT_CACHE: 'off' } }).generate(request('a', 'three'));
  assert.equal(last().options.geminiCachedContent, undefined);
  assert.equal(state.creates.length, creates);
});

test('orders without an owner and small prefixes stay outside the cache', async () => {
  await provider({ owner: '' }).generate(request('a', 'one'));
  await provider({ owner: '' }).generate(request('a', 'two'));
  assert.equal(state.reads, 0);
  const small = { ...request(), calculatedData: { facts: [] } };
  await provider().generate(small);
  await provider().generate(small);
  assert.equal(state.reads, 0);
  assert.equal(last().options.geminiCachedContent, undefined);
});

test('Pro and Flash chapters keep separate caches', async () => {
  const pro = { model: 'gemini-2.5-pro', task: 'tuna-synthesis' };
  await provider(pro).generate(request('a', 'one'));
  await provider().generate(request('a', 'two'));
  assert.equal(state.creates.length, 0);
  await provider(pro).generate(request('a', 'three'));
  assert.equal(state.creates[0].model, 'gemini-2.5-pro');
  assert.equal(state.creates[0].reasoningTask, 'tuna-synthesis');
});

test('the Flash recovery after a Pro refusal does not reference the Pro cache', async () => {
  const pro = { model: 'gemini-2.5-pro', task: 'tuna-synthesis' };
  await provider(pro).generate(request('a', 'one'));
  state.respond = (options) => options.model === 'gemini-2.5-pro'
    ? { ok: false, error: 'overloaded', status: 503, providerCode: 'GEMINI_UNAVAILABLE' }
    : { ok: true, text: '{}', provider: 'gemini', model: options.model };
  await provider(pro).generate(request('a', 'two'));
  const [refused, recovered] = state.calls.slice(-2);
  assert.equal(refused.options.geminiCachedContent?.name, 'cachedContents/1');
  assert.notEqual(recovered.options.model, 'gemini-2.5-pro');
  assert.equal(recovered.options.geminiCachedContent, undefined);
});

test('time spent creating a cache comes out of the attempt, not the chapter lease', async () => {
  await provider({ timeoutMs: 120000 }).generate(request('a', 'one'));
  state.createDelayMs = 40;
  await provider({ timeoutMs: 120000 }).generate(request('a', 'two'));
  assert.ok(last().options.timeoutMs <= 120000 - 30, String(last().options.timeoutMs));
  assert.ok(Number(state.creates[0].timeoutMs) <= 5000);
});

test('the response cache key input stays the complete prompt', async () => {
  await provider().generate(request('a', 'one'));
  await provider().generate(request('a', 'two'));
  assert.ok(last().prompt.includes('DOMAIN_CONTEXT') && last().prompt.includes('sys.a'));
  assert.deepEqual(JSON.parse(last().options.cache?.keyExtra || '[]').slice(1), ['owner', 'order', '1']);
});
