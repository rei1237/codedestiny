import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../../../worker/routes/fortune-tea-house.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('fortune-tea-house.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = name => {
  const node = ast.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `missing ${name}`);
  return node.getText(ast);
};

async function generate({ tossNative, attempts = 0 }) {
  const calls = [];
  const saves = [];
  const store = { name: 'shared cache' };
  const context = {
    Promise, Date, setTimeout, clearTimeout,
    PAID_LLM_PARTS_PER_REQUEST: 1,
    FORTUNE_TEA_GROUP_MAX_OUTPUT_TOKENS: 1024,
    FORTUNE_TEA_PROMPT_REV: 1,
    hasGeminiKey: () => true,
    saveTeaCheckpoint: async (...args) => saves.push(args),
    runWithAiLocale: (_locale, fn) => fn(),
    pinAnswerVoice: () => null,
    buildUserPrompt: () => 'synthetic prompt',
    buildSystemPrompt: () => 'synthetic system prompt',
    appendAnswerVoice: prompt => prompt,
    fortuneTeaGroupResponseSchema: () => ({}),
    clampSyncLlmTimeoutMs: value => value,
    createLlmCacheStore: () => store,
    isSajuFamilyMode: () => false,
    cleanText: value => String(value || ''),
    callGeminiText: async (_env, _prompt, options) => {
      calls.push(options);
      return { ok: false, error: 'synthetic provider failure' };
    },
    teaCheckpointProgress: (state, resultId) => ({ resultId, attempts: state.attempts.first }),
  };
  vm.createContext(context);
  vm.runInContext(['generateFortuneTeaGroup', 'generateTeaCheckpoint'].map(declaration).join('\n'), context);
  const checkpoint = {
    request: { consultationMode: 'tarot' }, fallback: {}, locale: 'ko',
    groups: [{ key: 'first', minChars: 100 }], parts: {}, attempts: { first: attempts }, repairs: [],
  };
  const result = await context.generateTeaCheckpoint({}, {}, {}, {
    auth: { userId: 'synthetic-owner', ...(tossNative ? { tossNative: true } : {}) },
    resultId: 'synthetic-result', lockToken: 'synthetic-lock', checkpoint, body: {},
  });
  return { calls, saves, store, result };
}

test('Toss checkpoint and retry never use the shared response cache', async () => {
  for (const attempts of [0, 1]) {
    const { calls, saves, result } = await generate({ tossNative: true, attempts });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].cache, undefined);
    assert.equal(calls[0].fallbackToWorkersAI, false);
    assert.equal(saves.length, 1);
    assert.equal(result.partial.attempts, attempts + 1);
  }
});

test('ordinary web checkpoints retain their existing shared cache policy', async () => {
  const { calls, saves, store } = await generate({ tossNative: false });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cache.store, store);
  assert.equal(calls[0].cache.deterministic, true);
  assert.equal(calls[0].cache.ttlSeconds, 30 * 24 * 60 * 60);
  assert.equal(calls[0].fallbackToWorkersAI, false);
  assert.equal(saves.length, 1);
});
