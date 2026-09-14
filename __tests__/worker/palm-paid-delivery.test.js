/** @jest-environment node */
import { jest } from '@jest/globals';
let save, read, route, deep, vision, docs, fault, proof, revoked, userId, ai, visionReply;
const owner = '64b7f2a1c3d4e5f601234567';
const query = value => ({ sort() { return this; }, lean: async () => structuredClone(value) });
const match = (row, filter) => Object.entries(filter).every(([key, value]) => row[key] === value);
const payment = jest.fn(async () => ({ proven: proof, source: 'payment' }));
beforeAll(async () => {
  const db = await import('../../worker/lib/db.js'), models = await import('../../worker/lib/models.js'), auth = await import('../../worker/lib/auth.js'), gemini = await import('../../worker/lib/gemini.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {} }));
  jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ ...auth, requireAuth: async () => ({ userId }) }));
  jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js', () => ({ verifyPerUsePayment: payment }));
  jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js', () => ({ isPaidResultRevoked: async () => revoked }));
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ ...gemini, callGeminiText: async () => ai }));
  jest.unstable_mockModule('../../worker/lib/structured-consultation.js', () => ({ callGeminiJsonWithRetry: async () => visionReply }));
  jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ...models, ServiceExecutionTransaction: {
    findOne: filter => { if (fault === 'confirm') { fault = ''; return query(null); } return query(docs.find(row => match(row, filter)) || null); },
    findOneAndUpdate: (filter, update) => {
      if (fault === 'throw') throw Error('storage');
      if (fault === 'null') return query(null);
      let row = docs.find(row => match(row, filter));
      if (!row) { row = structuredClone(update.$setOnInsert); docs.push(row); }
      return query(row);
    },
  } }));
  ({ savePalmAnalysis: save, readPaidPalmAnalysis: read } = await import('../../worker/lib/palm-result-delivery.js'));
  ({ buildPalmDeepConsult: deep, analyzeHandWithGeminiVision: vision } = await import('../../worker/lib/palm-vision.js'));
  ({ handlePalmRoutes: route } = await import('../../worker/routes/palm.js'));
});
beforeEach(() => { docs = []; fault = ''; proof = true; revoked = false; userId = owner; ai = { ok: true, text: '계산한 선의 방향을 바탕으로 생활 속 선택을 살펴봅니다. '.repeat(70), provider: 'gemini' }; visionReply = { ok: true, text: JSON.stringify({ palmDetected: true, imageQuality: { brightness: 'good', sharpness: 'good', palmCoverage: 0.95 }, majorLines: { lifeLine: { detected: true, summary: '선 확인' } } }), provider: 'gemini' }; payment.mockClear(); });
const result = { interpretation: { consultText: '원래 손금 본문 마지막 문장입니다.' }, mode: 'full' };
test('save and reopen original paid analysis, even after response loss', async () => {
  await save({}, owner, 'palm-original', result);
  expect(await save({}, owner, 'palm-original', { interpretation: 'changed' })).toMatchObject(result);
  expect(await read({}, owner, 'palm-original')).toMatchObject({ ...result, saved: true });
  expect(payment.mock.calls[0][1]).toMatchObject({ requestId: 'palm-original', requireExisting: true });
  expect(docs).toHaveLength(1);
});
test.each(['throw', 'null', 'confirm'])('storage %s blocks payment readiness', async failure => {
  fault = failure; await expect(save({}, owner, 'palm-original', result)).rejects.toMatchObject({ status: 503 });
  expect(payment).not.toHaveBeenCalled();
  fault = ''; expect(await save({}, owner, 'palm-original', result)).toMatchObject({ analysisSaved: true });
});
test('unpaid, revoked and foreign accounts cannot reopen', async () => {
  await save({}, owner, 'palm-original', result);
  proof = false; await expect(read({}, owner, 'palm-original')).rejects.toMatchObject({ status: 403 });
  proof = true; revoked = true; await expect(read({}, owner, 'palm-original')).rejects.toMatchObject({ status: 403 });
  await expect(read({}, 'other', 'palm-original')).rejects.toMatchObject({ status: 404 });
  proof = null; revoked = false; await expect(read({}, owner, 'palm-original')).rejects.toMatchObject({ status: 503 });
});
test('actual GET route returns the owned snapshot without generating', async () => {
  await save({}, owner, 'palm-original', result);
  const response = await route(new Request('https://mock.test/api/palm/result?requestId=palm-original'), {});
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ saved: true });
  userId = 'other'; expect((await route(new Request('https://mock.test/api/palm/result?requestId=palm-original'), {})).status).toBe(404);
});
test('full deep interpretation passes existing 1200 character contract', async () => { expect(await deep({}, {})).toMatchObject({ text: ai.text.trim() }); });
test.each(['short', 'truncated', 'mock', 'unfinished'])('deep %s output cannot become a paid-ready result', async kind => {
  if (kind === 'short') ai.text = '짧습니다.';
  if (kind === 'truncated') ai.truncated = true;
  if (kind === 'mock') ai.isMock = true;
  if (kind === 'unfinished') ai.text += '그러나';
  expect(await deep({}, {})).toBeNull();
});
test('vision mock is rejected and failed photo analysis does not offer payment', async () => {
  visionReply.isMock = true;
  ai = { ok: false, error: 'MOCK_PROVIDER_FAILURE' };
  expect(await vision({}, 'data:image/png;base64,AAAAAAAA', 'left')).toBeNull();
  const response = await route(new Request('https://mock.test/api/palm/analyze', { method: 'POST', body: JSON.stringify({ requestId: 'palm-original', leftPalmImage: 'data:image/png;base64,' + 'A'.repeat(80), dominantHand: 'right', analysisPurpose: 'general' }) }), {});
  expect(response.status).toBe(422); expect(docs).toHaveLength(0); expect(payment).not.toHaveBeenCalled();
});
test('actual analysis saves before payment and missing deep text stops readiness', async () => {
  const request = () => new Request('https://mock.test/api/palm/analyze', { method: 'POST', body: JSON.stringify({ requestId: 'palm-original', leftPalmImage: 'data:image/png;base64,' + 'A'.repeat(80), dominantHand: 'right', analysisPurpose: 'general' }) });
  ai.text = ''; expect((await route(request(), {})).status).toBe(503); expect(docs).toHaveLength(0);
  ai.text = '사진에서 확인된 선을 토대로 선택을 살펴봅니다. '.repeat(90);
  const response = await route(request(), {}); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ analysisSaved: true });
  expect(JSON.stringify(docs)).not.toContain('data:image'); expect(payment).not.toHaveBeenCalled();
});
