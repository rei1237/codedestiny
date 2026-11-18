import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  PRODUCTION_LLM_FLAGS,
  STAGING_MASKED_LLM_KEY_NAMES,
  STAGING_REAL_LLM_ALLOWLIST_KEY,
  isStagingRealLlmUser,
  maskStagingLlmEnv,
  parseStagingRealLlmAllowlist,
  scrubStagingProcessEnvLlmKeys,
  stagingLlmEnvForUser,
  withProductionLlmEnv,
  withStagingLlmRouting,
} from '../../worker/lib/staging-real-llm.js';
import { isStagingLlmMockEnabled } from '../../worker/lib/staging-llm-mock.js';
import { getEnv, installProcessEnv } from '../../worker/lib/env.js';

// 실제 값이 아닌 테스트 전용 문자열. 네트워크 호출은 하지 않는다.
const FAKE_KEY = 'test-only-not-a-real-gemini-key';
const ALLOWED = 'a1b2c3d4e5f6a1b2c3d4e5f6';
const OTHER = 'ffffffffffffffffffffffff';
const AI_BINDING = Object.freeze({ run: async () => { throw new Error('Workers AI must not run in tests'); } });

function stagingEnv(extra = {}) {
  return {
    APP_ENV: 'staging',
    STAGING_LLM_MOCK_ENABLED: 'true',
    WORKERS_AI_ENABLED: 'false',
    GUARDIAN_FORTUNE_LLM_PROVIDER: 'mock',
    ENABLE_FUSION_FORTUNE_MOCK_FLOW: 'true',
    PAYMENT_TEST_AMOUNT_KRW: '1000',
    GEMINIF_API_KEY: FAKE_KEY,
    [STAGING_REAL_LLM_ALLOWLIST_KEY]: ALLOWED,
    AI: AI_BINDING,
    ...extra,
  };
}

function productionEnv() {
  return { WORKERS_AI_ENABLED: 'true', GUARDIAN_FORTUNE_LLM_PROVIDER: 'gemini', GEMINIF_API_KEY: FAKE_KEY, [STAGING_REAL_LLM_ALLOWLIST_KEY]: ALLOWED };
}

// 스크럽은 isolate 전역 process.env 를 건드린다. 테스트마다 원래 값으로 되돌린다.
function withProcessEnvSnapshot(fn) {
  return async () => {
    const before = { ...process.env };
    try {
      await fn();
    } finally {
      for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
      Object.assign(process.env, before);
    }
  };
}

test('allowlist parsing is strict: one malformed entry disables the whole list', () => {
  assert.deepEqual([...parseStagingRealLlmAllowlist(`${ALLOWED.toUpperCase()}, ${OTHER}\n`)], [ALLOWED, OTHER]);
  assert.equal(parseStagingRealLlmAllowlist('').size, 0);
  assert.equal(parseStagingRealLlmAllowlist(undefined).size, 0);
  assert.equal(parseStagingRealLlmAllowlist(`${ALLOWED},not-an-id`).size, 0);
  assert.equal(parseStagingRealLlmAllowlist(`${ALLOWED},${'a'.repeat(23)}`).size, 0);
  assert.equal(parseStagingRealLlmAllowlist('*').size, 0);
});

test('isStagingRealLlmUser is true only on staging for a listed ObjectId', () => {
  assert.equal(isStagingRealLlmUser(stagingEnv(), ALLOWED), true);
  assert.equal(isStagingRealLlmUser(stagingEnv(), ALLOWED.toUpperCase()), true);
  assert.equal(isStagingRealLlmUser(stagingEnv(), OTHER), false);
  assert.equal(isStagingRealLlmUser(stagingEnv(), ''), false);
  assert.equal(isStagingRealLlmUser(stagingEnv(), null), false);
  assert.equal(isStagingRealLlmUser(stagingEnv({ [STAGING_REAL_LLM_ALLOWLIST_KEY]: `${ALLOWED},bad` }), ALLOWED), false);
  assert.equal(isStagingRealLlmUser(stagingEnv({ [STAGING_REAL_LLM_ALLOWLIST_KEY]: undefined }), ALLOWED), false);
  assert.equal(isStagingRealLlmUser(productionEnv(), ALLOWED), false);
  assert.equal(isStagingRealLlmUser(stagingEnv({ APP_ENV: 'production' }), ALLOWED), false);
});

test('production is a strict no-op: same env object, synchronous pass-through, process.env untouched', withProcessEnvSnapshot(async () => {
  const env = productionEnv();
  assert.equal(maskStagingLlmEnv(env), env);
  assert.equal(withProductionLlmEnv(env), env);
  assert.equal(stagingLlmEnvForUser(env, ALLOWED), env);
  process.env.GEMINIF_API_KEY = FAKE_KEY;
  scrubStagingProcessEnvLlmKeys(env);
  assert.equal(process.env.GEMINIF_API_KEY, FAKE_KEY);

  let peeks = 0;
  const seen = [];
  const handlers = withStagingLlmRouting({ fetch: (_r, e, c) => { seen.push([e, c]); return 'response'; } }, { peekUserId: async () => { peeks += 1; return ALLOWED; } });
  const ctx = { waitUntil() {} };
  assert.equal(handlers.fetch(new Request('https://api.example/api/x'), env, ctx), 'response');
  assert.equal(seen[0][0], env);
  assert.equal(seen[0][1], ctx);
  assert.equal(peeks, 0);
}));

test('masked view drops every LLM credential (also odd spellings) and the allowlist, keeps staging locks', withProcessEnvSnapshot(async () => {
  const env = stagingEnv({ 'geminif-api-key': FAKE_KEY, GOOGLE_GEMINI_API_KEY: FAKE_KEY, ANTHROPIC_API_KEY: FAKE_KEY, OPENAI_API_KEY: FAKE_KEY, AI_GATEWAY_TOKEN: FAKE_KEY });
  const masked = maskStagingLlmEnv(env);
  assert.notEqual(masked, env);
  assert.equal(maskStagingLlmEnv(env), masked, 'memoized per env');
  assert.equal(maskStagingLlmEnv(masked), masked, 'a view resolves back to its base');
  for (const name of [...STAGING_MASKED_LLM_KEY_NAMES, 'geminif-api-key', STAGING_REAL_LLM_ALLOWLIST_KEY]) assert.equal(name in masked, false, name);
  assert.equal(masked.APP_ENV, 'staging');
  assert.equal(masked.PAYMENT_TEST_AMOUNT_KRW, '1000');
  assert.equal(masked.AI, AI_BINDING);
  assert.equal(isStagingLlmMockEnabled(masked), true);
  assert.equal(env.GEMINIF_API_KEY, FAKE_KEY, 'base env is never mutated');

  // nodejs_compat 이 채운 process.env 사본으로 새지 않는다.
  process.env.GEMINIF_API_KEY = FAKE_KEY;
  process.env.Gemini_Api_Key = FAKE_KEY;
  assert.equal(getEnv(masked, 'GEMINIF_API_KEY'), FAKE_KEY, 'precondition: getEnv falls back to process.env');
  scrubStagingProcessEnvLlmKeys(env);
  assert.equal(getEnv(masked, 'GEMINIF_API_KEY'), '');
  assert.equal(getEnv(masked, 'GEMINI_API_KEY'), '');
  assert.equal(process.env.Gemini_Api_Key, '');
}));

test('allowlisted view carries production LLM flags and the key; no key means mock', withProcessEnvSnapshot(async () => {
  const env = stagingEnv();
  const prod = withProductionLlmEnv(env);
  for (const [name, value] of Object.entries(PRODUCTION_LLM_FLAGS)) assert.equal(prod[name], value, name);
  assert.equal(prod.GEMINIF_API_KEY, FAKE_KEY);
  assert.equal(prod.APP_ENV, 'staging', 'payment test amount and other staging behavior stay');
  assert.equal(prod.PAYMENT_TEST_AMOUNT_KRW, '1000');
  assert.equal(prod.AI, AI_BINDING);
  assert.equal(STAGING_REAL_LLM_ALLOWLIST_KEY in prod, false);
  assert.equal(isStagingLlmMockEnabled(prod), false);
  assert.equal(withProductionLlmEnv(env), prod, 'memoized per env');
  assert.equal(withProductionLlmEnv(maskStagingLlmEnv(env)), prod, 'a masked view resolves to the keyed base');
  assert.equal(stagingLlmEnvForUser(maskStagingLlmEnv(env), ALLOWED), prod, 'queue rows can re-route from the masked batch env');
  assert.equal(stagingLlmEnvForUser(prod, OTHER), maskStagingLlmEnv(env));

  const keyless = stagingEnv({ GEMINIF_API_KEY: '  ' });
  assert.equal(withProductionLlmEnv(keyless), maskStagingLlmEnv(keyless));
  assert.equal(isStagingLlmMockEnabled(stagingLlmEnvForUser(keyless, ALLOWED)), true);

  // 허용 view 를 installProcessEnv 에 넘겨도 키가 전역으로 다시 심기지 않는다.
  delete process.env.GEMINIF_API_KEY;
  scrubStagingProcessEnvLlmKeys(env);
  installProcessEnv(prod);
  assert.equal(process.env.GEMINIF_API_KEY, '');
  assert.equal(getEnv(maskStagingLlmEnv(env), 'GEMINIF_API_KEY'), '');
  assert.equal(getEnv(prod, 'GEMINIF_API_KEY'), FAKE_KEY);
}));

test('entry routing: fetch picks per user, everything else and every failure is masked', withProcessEnvSnapshot(async () => {
  const env = stagingEnv();
  const masked = maskStagingLlmEnv(env);
  const prod = withProductionLlmEnv(env);
  let peekResult = ALLOWED;
  let peeks = 0;
  const seen = [];
  const record = (_input, e, ...rest) => { seen.push({ env: e, rest }); return 'ok'; };
  const handlers = withStagingLlmRouting({ fetch: record, queue: record, scheduled: record }, {
    peekUserId: async (request, baseEnv) => {
      peeks += 1;
      assert.equal(baseEnv, env, 'peek sees the base env (JWT secret)');
      if (peekResult instanceof Error) throw peekResult;
      return peekResult;
    },
  });
  const ctx = { waitUntil() {} };
  const get = () => new Request('https://staging-api.example/api/life-book', { method: 'POST' });

  assert.equal(await handlers.fetch(get(), env, ctx), 'ok');
  assert.equal(seen.at(-1).env, prod);
  assert.equal(seen.at(-1).rest[0], ctx, 'ctx (and its waitUntil) passes through untouched');

  peekResult = OTHER;
  await handlers.fetch(get(), env, ctx);
  assert.equal(seen.at(-1).env, masked);

  peekResult = '';
  await handlers.fetch(get(), env, ctx);
  assert.equal(seen.at(-1).env, masked, 'guest / toss native token');

  peekResult = new Error('jwt secret missing');
  await handlers.fetch(get(), env, ctx);
  assert.equal(seen.at(-1).env, masked, 'peek failure is fail-closed');

  const before = peeks;
  peekResult = ALLOWED;
  await handlers.fetch(new Request('https://staging-api.example/api/x', { method: 'OPTIONS' }), env, ctx);
  assert.equal(seen.at(-1).env, masked);
  await handlers.queue({ messages: [] }, env, ctx);
  assert.equal(seen.at(-1).env, masked, 'queue batch is masked; rows re-route with stagingLlmEnvForUser');
  await handlers.scheduled({ cron: '*/10 * * * *' }, env, ctx);
  assert.equal(seen.at(-1).env, masked);
  assert.equal(peeks, before, 'OPTIONS, queue and scheduled never peek');

  // 허용목록이 없거나 키가 없으면 토큰을 보지도 않는다.
  const noList = stagingEnv({ [STAGING_REAL_LLM_ALLOWLIST_KEY]: undefined });
  await handlers.fetch(get(), noList, ctx);
  assert.equal(seen.at(-1).env, maskStagingLlmEnv(noList));
  const noKey = stagingEnv({ GEMINIF_API_KEY: undefined });
  await handlers.fetch(get(), noKey, ctx);
  assert.equal(seen.at(-1).env, maskStagingLlmEnv(noKey));
  assert.equal(peeks, before);

  // 진입마다 process.env 사본이 지워진다.
  process.env.GEMINIF_API_KEY = FAKE_KEY;
  await handlers.queue({ messages: [] }, env, ctx);
  assert.equal(process.env.GEMINIF_API_KEY, '');
}));

test('worker export wraps every entry with staging LLM routing inside engine rollout and outside DB scopes', () => {
  const source = fs.readFileSync('worker/index.js', 'utf8');
  assert.match(source, /^import \{ withStagingLlmRouting \} from "\.\/lib\/staging-real-llm\.js";$/m);
  assert.match(source, /^export default withEngineRollout\(withStagingLlmRouting\(withDbScopes\(app\)\)\);$/m);
  assert.equal((source.match(/^export default /gm) || []).length, 1);
});
