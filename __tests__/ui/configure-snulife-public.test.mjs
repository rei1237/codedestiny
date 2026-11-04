import test from 'node:test';
import assert from 'node:assert/strict';
import { configureSnulifePublic } from '../../scripts/configure-snulife-public.mjs';

const env = { GITHUB_ACTIONS: 'true', RELEASE_MODE: 'production', CLOUDFLARE_API_TOKEN: 'test-token', CLOUDFLARE_ACCOUNT_ID: 'test-account', SNULIFE_BENEFIT_CODE: 'SNU-GIFT-' + 'A'.repeat(22) };
const configText = 'name = "code-destiny-web"\n[vars]\nEXAMPLE="x"\n';

test('rejects unsafe execution and existing public settings without writes', async () => {
  for (const change of [{ GITHUB_ACTIONS: 'false' }, { RELEASE_MODE: 'preview' }, { SNULIFE_BENEFIT_CODE: 'short' }, { CF_WORKER_NAME: 'other' }]) {
    await assert.rejects(configureSnulifePublic({ env: { ...env, ...change }, configText, fetchImpl: () => { throw Error('unexpected request'); } }));
  }
  for (const name of ['SNULIFE_STARTS_AT', 'SNULIFE_ENDS_AT', 'SNULIFE_BENEFIT_CODE']) {
    let count = 0;
    await assert.rejects(configureSnulifePublic({ env, configText, fetchImpl: async () => { count++; return Response.json({ success: true, result: [{ name }] }); } }), /already exist/);
    assert.equal(count, 1);
  }
});

test('preserves review settings and enables public code last with approved window', async () => {
  const writes = [];
  const result = await configureSnulifePublic({ env, configText, fetchImpl: async (_url, options) => {
    if (options.method === 'PUT') writes.push(JSON.parse(options.body));
    return Response.json({ success: true, result: [{ name: 'SNULIFE_REVIEW_CODE' }] });
  } });
  assert.deepEqual(writes.map(item => item.name), ['SNULIFE_STARTS_AT', 'SNULIFE_ENDS_AT', 'SNULIFE_BENEFIT_CODE']);
  assert.equal(writes[2].text, env.SNULIFE_BENEFIT_CODE);
  assert.deepEqual(result, { startsAt: '2026-11-03T15:00:00.000Z', endsAt: '2027-02-03T15:00:00.000Z', limit: 1000 });
  assert.ok(!JSON.stringify(result).includes(env.SNULIFE_BENEFIT_CODE));
});

test('partial failures stop without enabling code', async () => {
  const writes = [];
  await assert.rejects(configureSnulifePublic({ env, configText, fetchImpl: async (_url, options) => {
    if (options.method !== 'PUT') return Response.json({ success: true, result: [] });
    writes.push(JSON.parse(options.body).name);
    return Response.json({ success: writes.length < 2 });
  } }), /Preserve partial settings/);
  assert.deepEqual(writes, ['SNULIFE_STARTS_AT', 'SNULIFE_ENDS_AT']);
});
