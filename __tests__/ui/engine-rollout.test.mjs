import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ENGINE_ROLLOUT_FLAGS, engineRolloutEnv, withEngineRollout } from '../../worker/lib/engine-rollout.js';

test('approved flags reach every entry point, an explicit var wins and env identity stays stable', async () => {
  const env = { APP_ENV: 'staging', ZIWEI_CONSUMER_FACTS_V1: 'false' };
  assert.equal(engineRolloutEnv(env), engineRolloutEnv(env));
  const seen = [];
  const handlers = withEngineRollout({ fetch: (_i, e) => seen.push(e), queue: (_i, e) => seen.push(e), scheduled: (_i, e) => seen.push(e) });
  await handlers.fetch({}, env, {}); await handlers.queue({}, env, {}); await handlers.scheduled({}, env, {});
  for (const e of seen) {
    assert.equal(e.SAJU_GYEOKGUK_AUTHORITY_V2, 'true');
    assert.equal(e.SUKUYO_IMD_NEW_ORDERS_V1, undefined);
    assert.equal(e.CONSULTATION_ANSWER_VOICE_V1, 'true');
    assert.equal(e.ZIWEI_CONSUMER_FACTS_V1, 'false');
    assert.equal(e.APP_ENV, 'staging');
  }
});

test('unverified astronomy systems stay off and the worker export is wired', () => {
  for (const key of ['ASTROLOGY_CONSUMER_FACTS_V1', 'VEDIC_CONSUMER_FACTS_V1', 'SUKUYO_CONSUMER_FACTS_V1']) assert.equal(key in ENGINE_ROLLOUT_FLAGS, false);
  assert.match(fs.readFileSync('worker/index.js', 'utf8'), /export default withEngineRollout\(withDbScopes\(app\)\);/);
});
