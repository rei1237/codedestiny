const test = require('node:test');
const assert = require('node:assert/strict');

const env = { PII_ENC_KEY: Buffer.alloc(32, 7).toString('base64') }; // synthetic test key
const input = { originPath: '/fortune-tea-house', resume: { kind: 'fortune-tea-house', action: '', args: { question: 'private question', cards: '[1,4,7]' } } };
const modulePromise = import('../../worker/payments/resume-context.js');

test('server context encrypts inputs and restores them without any browser storage', async () => {
  const { prepareResumeContext, readOrderResumeContext } = await modulePromise;
  const stored = await prepareResumeContext(input, { userId: 'u', requestId: 'r', featureKey: 'tea', env });
  assert.equal(JSON.stringify(stored).includes('private question'), false);
  const context = await readOrderResumeContext({ userId: 'u', merchantUid: 'payment', status: 'paid', featureKey: 'tea', requestId: 'r', metadata: { paidResume: stored } }, env);
  assert.equal(context.resume.args.question, 'private question');
  assert.equal(context.confirmBody.requestId, 'r');
  assert.equal(context.originPath, '/fortune-tea-house');
});

test('tampered ciphertext and wrong key cannot restore a context', async () => {
  const { prepareResumeContext, readOrderResumeContext } = await modulePromise;
  const stored = await prepareResumeContext(input, { userId: 'u', requestId: 'r', featureKey: 'tea', env });
  const order = { userId: 'u', featureKey: 'tea', requestId: 'r', status: 'paid', metadata: { paidResume: stored } };
  await assert.rejects(readOrderResumeContext(order, { PII_ENC_KEY: Buffer.alloc(32, 8).toString('base64') }));
  stored.binding = 'different-account';
  await assert.rejects(readOrderResumeContext(order, env));
});

test('pending TTL differs from approved incomplete recovery TTL', async () => {
  const { prepareResumeContext, readOrderResumeContext, RESUME_APPROVED_TTL_MS } = await modulePromise;
  const created = Date.now() - 60 * 60 * 1000;
  const stored = await prepareResumeContext(input, { userId: 'u', requestId: 'r', featureKey: 'tea', env, now: created });
  const order = { userId: 'u', featureKey: 'tea', requestId: 'r', status: 'pending', metadata: { paidResume: stored } };
  assert.equal(await readOrderResumeContext(order, env), null);
  order.status = 'paid';
  assert.ok(await readOrderResumeContext(order, env));
  assert.equal(await readOrderResumeContext(order, env, created + RESUME_APPROVED_TTL_MS + 1), null);
  order.status = 'refunded';
  assert.equal(await readOrderResumeContext(order, env), null);
});

test('no encryption key blocks preparation instead of persisting plaintext', async () => {
  const { prepareResumeContext } = await modulePromise;
  await assert.rejects(prepareResumeContext(input, { userId: 'u', requestId: 'r', featureKey: 'tea', env: {} }));
});

test('open redirects, object payloads and oversized payloads are rejected before checkout', async () => {
  const { validateResumeContext } = await modulePromise;
  for (const originPath of ['//attacker.example/', '/\\attacker.example/', 'https://attacker.example/']) {
    assert.throws(() => validateResumeContext({ ...input, originPath }));
  }
  assert.throws(() => validateResumeContext({ ...input, resume: { ...input.resume, args: { x: {} } } }));
  assert.throws(() => validateResumeContext({ ...input, resume: { ...input.resume, args: { x: 'x'.repeat(300000) } } }));
});


test('copied ciphertext and binding cannot restore under another owner, request or feature', async () => {
  const { prepareResumeContext, readOrderResumeContext } = await modulePromise;
  const stored = await prepareResumeContext(input, { userId: 'u', requestId: 'r', featureKey: 'tea', env });
  const order = { userId: 'u', requestId: 'r', featureKey: 'tea', status: 'paid', metadata: { paidResume: stored } };
  for (const changed of [{ userId: 'other' }, { requestId: 'other' }, { featureKey: 'other' }, { userId: null }]) {
    await assert.rejects(readOrderResumeContext({ ...order, ...changed }, env));
  }
  assert.ok(await readOrderResumeContext(order, env));
});

test('membership pass original and regenerated orders retain their recovery binding', async () => {
  const { prepareResumeContext, readOrderResumeContext } = await modulePromise;
  const stored = await prepareResumeContext(input, { userId: 'u', requestId: 'pass-attempt', featureKey: 'standard_1m', env });
  const order = { userId: 'u', paymentType: 'membership_pass', productId: 'standard_1m', status: 'paid', metadata: { paidResume: stored } };
  for (const idempotencyKey of ['pass-attempt', 'pass-attempt#1', 'pass-attempt#x0123456789ab']) {
    assert.ok(await readOrderResumeContext({ ...order, idempotencyKey }, env));
  }
  await assert.rejects(readOrderResumeContext({ ...order, idempotencyKey: 'other#1' }, env));
  await assert.rejects(readOrderResumeContext({ ...order, idempotencyKey: 'pass-attempt', productId: 'family_1m' }, env));
});
