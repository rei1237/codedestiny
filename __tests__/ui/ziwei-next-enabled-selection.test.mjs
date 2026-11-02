import test from 'node:test';
import assert from 'node:assert/strict';
import { server, client, digest, wire } from '../../tools/oracle/delivery-integration/harness.mjs';
import { installTestSelection, IMPROVED_VERSION } from '../../tools/oracle/next-delivery/selection.mjs';

const request = s => {
  const c = client(s);
  return wire(c.context.buildConsultationPayload(c.context.form, c.context.idempotencyRef.current));
};

test('test selection defaults OFF and ignores browser supplied opt-in', async () => {
  const s = server(); installTestSelection(s);
  const result = await s.request('/api/ziwei-ai/prepare', { ...request(s), calendarAuthorityV2: true });
  assert.equal(result.status, 402);
  assert.equal(s.preparations[0].authorityVersion, 'legacy');
  assert.equal(s.context.DEFAULT_ZIWEI_EXECUTION_OPTIONS.calendarAuthorityV2, false);
});

test('test ON preparation stays fixed across retry, concurrent preparation and OFF; new OFF request stays legacy', async () => {
  const s = server(), toggle = installTestSelection(s, true), body = request(s);
  const replies = await Promise.all([s.request('/api/ziwei-ai/prepare', body), s.request('/api/ziwei-ai/prepare', body)]);
  assert.ok(replies.every(reply => reply.status === 402));
  assert.equal(s.preparations.length, 1); assert.equal(s.payments.length, 1);
  assert.equal(s.preparations[0].authorityVersion, IMPROVED_VERSION);
  const before = digest(wire(s.preparations));
  toggle.setEnabled(false); s.year++;
  assert.equal((await s.request('/api/ziwei-ai/prepare', body)).status, 402);
  assert.equal(digest(wire(s.preparations)), before);
  assert.equal((await s.request('/api/ziwei-ai/prepare', { ...body, idempotencyKey: 'mock-new-after-off-0002' })).status, 402);
  assert.equal(s.preparations[1].authorityVersion, 'legacy');
  assert.equal(s.llmInputs.length + s.pgCalls.length, 0);
});

test('ON unsupported inputs stop before mock PG, order creation or LLM with no fallback', async () => {
  for (const change of [{ birthDate: '1999-02-04' }, { birthTimeUnknown: true }, { timezone: 'Asia/Tokyo' }]) {
    const s = server(); installTestSelection(s, true);
    const body = request(s);
    Object.assign(body, change); Object.assign(body.birthInfo, change);
    const reply = await s.request('/api/ziwei-ai/prepare', body);
    assert.equal(reply.status, 422);
    assert.equal(reply.data.reason, 'CALCULATION_PREPARATION_INVALID');
    assert.equal(s.preparations.length + s.payments.length + s.llmInputs.length + s.pgCalls.length, 0);
  }
});

test('test ON cannot overwrite legacy preparation and rejects corrupted or missing v2 on resume', async () => {
  const s = server(), toggle = installTestSelection(s), body = request(s);
  await s.request('/api/ziwei-ai/prepare', body);
  const old = digest(wire(s.preparations)); toggle.setEnabled(true);
  await s.request('/api/ziwei-ai/prepare', body);
  assert.equal(digest(wire(s.preparations)), old);
  for (const fault of ['missing', 'corrupt']) {
    const isolated = server(); installTestSelection(isolated, true);
    const c = client(isolated, { redirect: true }); await c.submit();
    if (fault === 'missing') isolated.preparations.length = 0;
    else isolated.preparations[0].chartSnapshot.lifePalace = 'invalid';
    assert.equal(await client(isolated).restore(c.descriptor.args, { payload: c.grant }), false);
    assert.equal(isolated.llmInputs.length + isolated.pgCalls.length + isolated.consultations.length, 0);
  }
});

test('simultaneous prepare returns one existing order for OFF and ON without approval or overwrite', async () => {
  for (const enabled of [false, true]) {
    const s = server(); installTestSelection(s, enabled); const body = request(s);
    const replies = await Promise.all([s.request('/api/ziwei-ai/prepare', body), s.request('/api/ziwei-ai/prepare', body)]);
    assert.ok(replies.every(reply => reply.status === 402));
    assert.equal(replies[0].data.paymentPayload.paymentId, replies[1].data.paymentPayload.paymentId);
    assert.equal(s.payments.length, 1); assert.equal(s.preparations.length, 1);
    assert.equal(s.writes.length + s.pgCalls.length + s.llmInputs.length + s.usageApplications, 0);
  }
});

test('prepare race reads only the matching winner and never retries payment creation', async () => {
  for (const fault of ['missing', 'wrong-owner', 'wrong-feature', 'wrong-input', 'write-failure']) {
    const s = server(); installTestSelection(s, true); const body = request(s);
    const create = s.context.Payment.create;
    let creates = 0;
    s.context.Payment.create = async data => {
      creates++;
      if (fault === 'write-failure') throw new Error('mock uncertain write');
      if (fault !== 'missing') await create({ ...data,
        ...(fault === 'wrong-owner' ? { userId: 'another-owner' } : {}),
        ...(fault === 'wrong-feature' ? { featureKey: 'another-feature' } : {}),
        ...(fault === 'wrong-input' ? { pricingSnapshot: { ...data.pricingSnapshot, inputHash: 'another-input' } } : {}),
      });
      throw Object.assign(new Error('mock unique winner'), { code: 11000 });
    };
    if (['wrong-feature', 'wrong-input'].includes(fault)) {
      const result = await s.request('/api/ziwei-ai/prepare', body);
      assert.notEqual(result.status, 402);
      assert.equal(result.data.paymentPayload, undefined);
    } else await assert.rejects(s.request('/api/ziwei-ai/prepare', body), /mock unique winner|mock uncertain write/);
    assert.equal(creates, 1);
    assert.equal(s.writes.length + s.pgCalls.length + s.llmInputs.length, 0);
  }
});
