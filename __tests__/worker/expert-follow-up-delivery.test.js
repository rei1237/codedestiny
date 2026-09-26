/** @jest-environment node */
import { jest } from '@jest/globals';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let deliver, recover, docs, report, revoked, fault, provider;
const owner = '64b7f2a1c3d4e5f601234567';
const at = (obj, key) => key.split('.').reduce((v, k) => v?.[k], obj);
const matches = (row, filter) => Object.entries(filter).every(([key, value]) => {
  if (key === '$or') return value.some(candidate => matches(row, candidate));
  if (value && typeof value === 'object' && '$ne' in value) return at(row, key) !== value.$ne;
  if (value && typeof value === 'object' && '$gt' in value) return new Date(at(row, key)) > new Date(value.$gt);
  return at(row, key) === value;
});
const query = value => ({ sort() { return this; }, lean: async () => structuredClone(value) });
const listQuery = value => ({ sort() { return this; }, limit() { return this; }, lean: async () => structuredClone(value) });
function assign(row, fields) { for (const [key, value] of Object.entries(fields)) { const parts = key.split('.'); let target = row; for (const part of parts.slice(0, -1)) target = target[part] ??= {}; target[parts.at(-1)] = structuredClone(value); } }
const model = {
  findOne: filter => query(docs.find(row => matches(row, filter)) || null),
  find: filter => listQuery(docs.filter(row => matches(row, filter))),
  findOneAndUpdate: (filter, update, options = {}) => {
    let row = docs.find(row => matches(row, filter));
    if (!row && options.upsert) { row = structuredClone(update.$setOnInsert); docs.push(row); }
    if (row) assign(row, update.$set || {}); return query(row || null);
  },
  updateOne: async (filter, update) => { const row = docs.find(row => matches(row, filter)); if (row) assign(row, update.$set); return { modifiedCount: row ? 1 : 0 }; },
};
const reportModel = {
  findOne: filter => { if (fault === 'read') { fault = ''; throw Error('read'); } return query(report && matches(report, filter) ? report : null); },
  findOneAndUpdate: (filter, update) => {
    if (fault === 'throw') { fault = ''; throw Error('save'); }
    if (fault === 'null') { fault = ''; return query(null); }
    if (!matches(report, filter)) return query(null);
    report.messages.push(...structuredClone(update.$push.messages.$each)); assign(report, update.$set);
    if (fault === 'lost') { fault = ''; throw Error('response lost'); }
    return query(report);
  },
};
beforeAll(async () => {
  const db = await import('../../worker/lib/db.js'), models = await import('../../worker/lib/models.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {} }));
  jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ...models, ServiceExecutionTransaction: model }));
  jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js', () => ({ isPaidResultRevoked: async () => revoked }));
  ({ deliverExpertFollowUp: deliver, recoverSavedExpertFollowUps: recover } = await import('../../worker/lib/expert-follow-up-delivery.js'));
});
beforeEach(() => {
  docs = []; revoked = false; fault = '';
  report = { id: 'original-report', userId: owner, status: 'completed', idempotencyKey: 'original-payment', messages: [{ role: 'assistant', content: '원래 긴 리포트' }], llmMeta: { delivery: { original: true } } };
  provider = jest.fn(async original => ({ provider: 'gemini', text: Array.from({ length: 8 }, (_, i) => `${i + 1}번째 조언은 원래 상담에서 확인한 강점을 작은 실천으로 이어 가는 것입니다.`).join('\n') + ' 기존 근거를 존중해 주세요.' }));
});
const start = (extra = {}) => deliver({ request: new Request('https://mock.test/api/karma-destiny-ai/message', { method: 'POST' }), env: {}, auth: { userId: owner }, consultation: structuredClone(report), message: '다음 선택은 어떻게 할까요?', featureKey: 'karma-destiny-ai-consultation', model: reportModel, generate: provider, render: value => ({ ok: true, messages: value.messages }), ...extra });
test('repeated same question reuses the answer and appends once', async () => {
  expect((await start()).status).toBe(200); expect((await start()).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(1); expect(report.messages).toHaveLength(3); expect(report.llmMeta.delivery.original).toBe(true);
});
test.each(['throw', 'null', 'read', 'lost'])('transcript %s retries the saved answer without regeneration', async value => {
  fault = value; expect((await start()).status).toBe(503); expect((await start()).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(1); expect(report.messages).toHaveLength(3);
});
test('the actual Karma result GET recovers an answer saved before the parent transcript update', async () => {
  fault = 'throw';
  expect((await start()).status).toBe(503);
  expect(report.messages).toHaveLength(1);
  const source = fs.readFileSync('worker/routes/karma-destiny-ai.js', 'utf8'), tree = ts.createSourceFile('route.js', source, 99, true, 1);
  const handler = tree.statements.find(node => node.name?.text === 'handleResult').getText(tree);
  const context = vm.createContext({
    URL, clean: value => String(value || ''), getOptionalUserFromRequest: async () => ({ userId: owner }), connectDb: async () => {},
    KarmaDestinyAiConsultation: reportModel, buildResultLookup: () => ({ id: report.id, userId: owner }), resolveStartAccess: async () => ({ ok: true }),
    paymentVerifyFailed: () => new Response('{}', { status: 403 }), loginRequired: () => new Response('{}', { status: 401 }),
    invalidInput: () => new Response('{}', { status: 404 }), FEATURE_KEY: 'karma-destiny-ai-consultation', recoverSavedExpertFollowUps: recover,
    isStoredPaidResultRevoked: async () => revoked,
    publicSession: value => ({ ok: true, messages: value.messages, status: value.status }), json: (value, init) => Response.json(value, init),
  });
  vm.runInContext(handler, context);
  const response = await context.handleResult(new Request(`https://mock.test/api/karma-destiny-ai/result?sessionId=${report.id}`), {}, '/result');
  const restored = await response.json();
  expect(restored.messages.at(-1).content).toContain('기존 근거를 존중해 주세요.');
  expect(provider).toHaveBeenCalledTimes(1);
  expect(report.messages).toHaveLength(3);
});
test('a revoked result reload does not attach the saved follow-up answer', async () => {
  fault = 'throw';
  expect((await start()).status).toBe(503);
  revoked = true;
  const restored = await recover({ auth: { userId: owner }, consultation: structuredClone(report), featureKey: 'karma-destiny-ai-consultation', model: reportModel });
  expect(restored.messages).toHaveLength(1);
  expect(report.messages).toHaveLength(1);
  expect(provider).toHaveBeenCalledTimes(1);
});
test('revoked purchase cannot generate or reopen a follow-up', async () => { await start(); revoked = true; expect((await start()).status).toBe(403); expect(provider).toHaveBeenCalledTimes(1); });
test('quality failure keeps original report and bounded attempts', async () => {
  provider.mockResolvedValue({ text: '짧고 잘림', provider: 'gemini' });
  for (let i = 0; i < 4; i++) expect((await start()).status).toBe(202);
  expect(provider).toHaveBeenCalledTimes(3); expect(report.messages).toHaveLength(1);
});
test('two concurrent submissions attach only one answer', async () => {
  let release; const wait = new Promise(resolve => release = resolve), original = provider.getMockImplementation();
  provider.mockImplementation(async (...args) => { await wait; return original(...args); });
  const first = start(); for (let i = 0; i < 30 && !provider.mock.calls.length; i++) await new Promise(resolve => setImmediate(resolve));
  expect((await start()).status).toBe(202); release(); expect((await first).status).toBe(200); expect(report.messages).toHaveLength(3);
});
test.each(['karma-destiny-ai', 'love-secret-ai'])('actual %s message handler rejects a foreign account and uses saved follow-up delivery', async kind => {
  const source = fs.readFileSync(`worker/routes/${kind}.js`, 'utf8'), tree = ts.createSourceFile('route.js', source, 99, true, 1);
  const handler = tree.statements.find(node => node.name?.text === 'handleMessage').getText(tree);
  let userId = owner;
  const context = vm.createContext({ readJson: req => req.json(), clean: value => String(value || ''), invalidInput: () => new Response('{}', { status: 404 }), loginRequired: () => new Response('{}', { status: 401 }), getOptionalUserFromRequest: async () => ({ userId }), connectDb: async () => {}, KarmaDestinyAiConsultation: reportModel, LoveSecretAiConsultation: reportModel, FEATURE_KEY: `${kind}-consultation`, deliverExpertFollowUp: deliver, generateFollowUp: async (_env, original) => provider(original), generateConsultationText: async () => provider(report), buildFollowUpPrompt: () => '', publicSession: value => ({ ok: true, messages: value.messages }) });
  vm.runInContext(handler, context);
  const request = () => new Request('https://mock.test/api/message', { method: 'POST', body: JSON.stringify({ sessionId: report.id, message: '다음 선택은 어떻게 할까요?' }) });
  expect((await context.handleMessage(request(), {})).status).toBe(200);
  userId = 'other'; expect((await context.handleMessage(request(), {})).status).toBe(404); expect(provider).toHaveBeenCalledTimes(1);
});
