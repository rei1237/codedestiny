import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ENGINE_ROLLOUT_FLAGS, engineRolloutEnv, withEngineRollout, shinsalFactsOn, selectShinsalFacts, shinsalFactsPinned, SHINSAL_FACTS_META, remedyFactsOn, selectRemedyFacts, remedyFactsPinned, REMEDY_FACTS_META } from '../../worker/lib/engine-rollout.js';

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
  assert.match(fs.readFileSync('worker/index.js', 'utf8'), /export default withEngineRollout\(withStagingLlmRouting\(withDbScopes\(app\)\)\);/);
});

test('shinsal facts open for the approved consumer ids by default, per consumer id or all at once, and an empty var turns them off', () => {
  const approved = ['prompt-hub', 'free-saju', 'natal-static', 'saju-ai', 'new-year', 'life-book', 'heukwol', 'neo', 'tea-house', 'love-codex', 'karma', 'guardian', 'fusion', 'saju-compat'];
  assert.equal(ENGINE_ROLLOUT_FLAGS.SAJU_SHINSAL_FACTS_V1, approved.join(','));
  for (const id of approved) assert.equal(shinsalFactsOn(engineRolloutEnv({}), id), true);
  assert.equal(shinsalFactsOn(engineRolloutEnv({}), 'naming'), false);
  assert.equal(shinsalFactsOn(engineRolloutEnv({ SAJU_SHINSAL_FACTS_V1: '' }), 'saju-ai'), false);
  assert.equal(shinsalFactsOn(undefined, 'saju-ai'), false);
  const some = engineRolloutEnv({ SAJU_SHINSAL_FACTS_V1: ' saju-ai , new-year ' });
  assert.equal(shinsalFactsOn(some, 'saju-ai'), true);
  assert.equal(shinsalFactsOn(some, 'new-year'), true);
  assert.equal(shinsalFactsOn(some, 'saju'), false);
  assert.equal(shinsalFactsOn(some, ''), false);
  const all = engineRolloutEnv({ SAJU_SHINSAL_FACTS_V1: 'true' });
  assert.equal(shinsalFactsOn(all, 'anything'), true);
});

test('the shinsal pin goes on new records only, legacy records stay off and the flag is a kill switch', () => {
  const on = engineRolloutEnv({ SAJU_SHINSAL_FACTS_V1: 'saju-ai,new-year' });
  assert.equal(SHINSAL_FACTS_META, 'shinsal-facts-v1');
  assert.equal(selectShinsalFacts(on, 'new-year'), SHINSAL_FACTS_META);
  assert.equal(selectShinsalFacts(on, 'life-book'), null);
  assert.equal(selectShinsalFacts(engineRolloutEnv({ SAJU_SHINSAL_FACTS_V1: '' }), 'new-year'), null);
  const pinned = { shinsalFacts: SHINSAL_FACTS_META };
  assert.equal(shinsalFactsPinned(pinned, on, 'new-year'), true);
  for (const legacy of [undefined, null, {}, { shinsalFacts: null }, { shinsalFacts: 'shinsal-facts-v2' }]) assert.equal(shinsalFactsPinned(legacy, on, 'new-year'), false);
  assert.equal(shinsalFactsPinned(pinned, engineRolloutEnv({ SAJU_SHINSAL_FACTS_V1: '' }), 'new-year'), false);
  assert.equal(shinsalFactsPinned(pinned, on, 'life-book'), false);
});

test('remedy facts stay off by default, open per consumer id or all at once, and the pin keeps legacy records off', () => {
  assert.equal(ENGINE_ROLLOUT_FLAGS.SAJU_REMEDY_FACTS_V1, '');
  for (const id of ['today-saju', 'natal-static', 'samjae', 'new-year', 'heukwol', 'tea-house', 'ziwei-ai']) assert.equal(remedyFactsOn(engineRolloutEnv({}), id), false);
  assert.equal(remedyFactsOn(undefined, 'new-year'), false);
  const some = engineRolloutEnv({ SAJU_REMEDY_FACTS_V1: ' today-saju , samjae ' });
  assert.equal(remedyFactsOn(some, 'today-saju'), true);
  assert.equal(remedyFactsOn(some, 'samjae'), true);
  assert.equal(remedyFactsOn(some, 'new-year'), false);
  assert.equal(remedyFactsOn(some, ''), false);
  assert.equal(remedyFactsOn(engineRolloutEnv({ SAJU_REMEDY_FACTS_V1: 'true' }), 'anything'), true);
  const on = engineRolloutEnv({ SAJU_REMEDY_FACTS_V1: 'new-year,heukwol' });
  assert.equal(REMEDY_FACTS_META, 'remedy-facts-v1');
  assert.equal(selectRemedyFacts(on, 'new-year'), REMEDY_FACTS_META);
  assert.equal(selectRemedyFacts(on, 'tea-house'), null);
  const pinned = { remedyFacts: REMEDY_FACTS_META };
  assert.equal(remedyFactsPinned(pinned, on, 'heukwol'), true);
  for (const legacy of [undefined, null, {}, { remedyFacts: null }, { shinsalFacts: 'shinsal-facts-v1' }, { remedyFacts: 'remedy-facts-v2' }]) assert.equal(remedyFactsPinned(legacy, on, 'heukwol'), false);
  assert.equal(remedyFactsPinned(pinned, engineRolloutEnv({ SAJU_REMEDY_FACTS_V1: '' }), 'heukwol'), false);
  assert.equal(remedyFactsPinned(pinned, on, 'tea-house'), false);
});
