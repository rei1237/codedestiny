import test from 'node:test';
import assert from 'node:assert/strict';
import { configureSnulifeReview } from '../../scripts/configure-snulife-review.mjs';
const env = { GITHUB_ACTIONS: 'true', RELEASE_MODE: 'production', CLOUDFLARE_API_TOKEN: 'test-token', CLOUDFLARE_ACCOUNT_ID: 'test-account', SNULIFE_REVIEW_CODE: 'SNU-REVIEW-' + 'A'.repeat(22) };
const configText = 'name = "code-destiny-web"\n[vars]\nEXAMPLE="x"\n';
const now = new Date('2026-10-31T12:00:00Z');
test('local, preview and malformed codes never write settings', async () => {
  let called = false;
  for (const change of [{ GITHUB_ACTIONS: 'false' }, { RELEASE_MODE: 'preview' }, { SNULIFE_REVIEW_CODE: 'short' }, { CF_WORKER_NAME: 'other-worker' }]) {
    await assert.rejects(configureSnulifeReview({ env: { ...env, ...change }, configText, fetchImpl: async () => { called = true; } }));
  }
  assert.equal(called, false);
});
test('existing public or review settings prevent replacement', async () => {
  for (const name of ['SNULIFE_BENEFIT_CODE', 'SNULIFE_REVIEW_STARTS_AT']) {
    const calls = [];
    await assert.rejects(configureSnulifeReview({ env, configText, fetchImpl: async (_url, options) => { calls.push(options); return Response.json({ success: true, result: [{ name }] }); } }), /already exist/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, undefined);
  }
});
test('approved setup writes only review fields, code last, for exactly 14 days', async () => {
  const writes = [];
  const result = await configureSnulifeReview({ env, configText, now, fetchImpl: async (_url, options) => {
    if (options.method === 'PUT') writes.push(JSON.parse(options.body));
    return Response.json({ success: true, result: [] });
  } });
  assert.deepEqual(writes.map(item => item.name), ['SNULIFE_REVIEW_STARTS_AT', 'SNULIFE_REVIEW_ENDS_AT', 'SNULIFE_REVIEW_CODE']);
  assert.equal(writes[2].text, env.SNULIFE_REVIEW_CODE);
  assert.equal(new Date(result.endsAt) - new Date(result.startsAt), 14 * 86400000);
  assert.equal(result.limit, 3);
  assert.equal(result.publicCampaignEnabled, false);
  assert.ok(!JSON.stringify(result).includes(env.SNULIFE_REVIEW_CODE));
});
test('partial configuration failure stops before enabling the code', async () => {
  const writes = [];
  await assert.rejects(configureSnulifeReview({ env, configText, now, fetchImpl: async (_url, options) => {
    if (options.method !== 'PUT') return Response.json({ success: true, result: [] });
    writes.push(JSON.parse(options.body).name);
    return Response.json({ success: writes.length < 2 });
  } }), /Preserve partial settings/);
  assert.deepEqual(writes, ['SNULIFE_REVIEW_STARTS_AT', 'SNULIFE_REVIEW_ENDS_AT']);
});
