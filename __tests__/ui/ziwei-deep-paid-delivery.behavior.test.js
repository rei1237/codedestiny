const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const get = (value, key) => key.split('.').reduce((at, part) => at?.[part], value);
function set(value, key, data) {
  const parts = key.split('.'); const last = parts.pop();
  for (const part of parts) value = value[part] ||= {};
  value[last] = clone(data);
}
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(row => matches(doc, row));
    if (key === '$and') return value.every(row => matches(doc, row));
    const actual = get(doc, key);
    if (value && typeof value === 'object' && '$in' in value) return value.$in.includes(actual);
    if (value && typeof value === 'object' && '$nin' in value) return !value.$nin.includes(actual);
    if (value && typeof value === 'object' && '$ne' in value) return actual !== value.$ne;
    if (value && typeof value === 'object' && '$lt' in value) return actual < value.$lt;
    if (value && typeof value === 'object' && '$gt' in value) return actual > value.$gt;
    if (value && typeof value === 'object' && '$lte' in value) return actual <= value.$lte;
    if (value && typeof value === 'object' && '$exists' in value) return (actual !== undefined) === value.$exists;
    if (value === null) return actual == null;
    return String(actual) === String(value);
  });
}
function load(ctx, file, names) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const name of names) {
    const fn = ast.statements.find(row => ts.isFunctionDeclaration(row) && row.name?.text === name);
    assert.ok(fn, name); vm.runInContext(fn.getText(ast).replace(/^export /, ''), ctx);
  }
}


function fixture(accessType = 'pass') {
  let doc = null, calls = 0, starts = 0, refunds = 0, fault = '', permitted = true, revoked = false, owner = 'owner', tick = 0;
  const chain = value => ({ lean: async () => clone(value), sort() { return this; }, limit() { return this; } });
  const model = {
    findOne: filter => {
      if (fault === 'confirm_completed' && doc?.status === 'completed') { fault = ''; return chain(null); }
      return chain(doc && matches(doc, filter) ? doc : null);
    },
    find: filter => chain(doc && matches(doc, filter) ? [doc] : []),
    create: async value => { if (doc) throw Object.assign(new Error('duplicate'), { code: 11000 }); doc = clone(value); },
    findOneAndUpdate: (filter, update) => ({ lean: async () => {
      const tag = update.$set.status || (Object.keys(update.$set).some(k => k.startsWith('llmMeta.checkpoints.')) ? 'checkpoint' : 'attempt');
      if (fault === tag + '_throw') { fault = ''; throw new Error('mock storage throw'); }
      if (fault === tag) { fault = ''; return null; }
      if (!doc || !matches(doc, filter)) return null;
      for (const [key, value] of Object.entries(update.$set)) set(doc, key, value);
      return clone(doc);
    } }),
    updateOne: async (filter, update) => { if (doc && matches(doc, filter)) for (const [key, value] of Object.entries(update.$set)) set(doc, key, value); },
  };
  const definitions = Array.from({ length: 15 }, (_, i) => ({ id: `chapter${i}`, title: `${i + 1}장`, minChars: 2200 }));
  const ctx = vm.createContext({ Request, Response, Headers, URL, Date, JSON, Map, Math, crypto: webcrypto, console,
    fetch: async () => { throw new Error('EXTERNAL_FETCH_BLOCKED'); },
    clean: (v, max = 100000) => String(v || '').trim().slice(0, max),
    readJson: request => request.json(), json: (body, init) => new Response(JSON.stringify(body), init),
    getRoutePath: request => new URL(request.url).pathname.replace('/api/ziwei-deep-report', ''),
    getOptionalUserFromRequest: async () => ({ userId: owner }), connectDb: async () => {}, PAID_FEATURE_ACCESS_USER_PROJECTION: {},
    withMongoRetry: async (_env, work) => work(),
    isStoredPaidResultRevoked: async () => revoked,
    resolveAiLocaleFromRequest: () => 'ko', sha256: () => `hash${++tick}`, getPricing: () => ({}),
    normalizeInput: body => ({ ok: true, inputHash: body.inputHash || 'original', birthInfo: {}, consultation: {}, input: {} }),
    resolveGenerateAccess: async () => ({ ok: permitted, accessType }), calculateZiweiAiChart: () => ({ lifePalace: 'fixed' }),
    loginRequired: () => new Response('', { status: 401 }), notFound: () => new Response('', { status: 404 }),
    invalidInput: (_message, status = 422) => new Response('', { status }), paymentVerifyFailed: () => new Response('', { status: 402 }), serverError: () => new Response('', { status: 500 }),
    GENERATING_FRESHNESS_MS: 150000, CHAPTER_MAX_ATTEMPTS: 3, CHAPTER_BATCH_SIZE: 4, CHAPTER_CONCURRENCY: 4, MIN_DELIVERABLE_CHARS: 20000, MIN_DELIVERABLE_CHAPTERS: 15,
    ZIWEI_DEEP_CHAPTERS: definitions, ZIWEI_DEEP_PDF_META: { minTotalChars: 34000 }, FEATURE_KEY: 'ziwei-deep-pdf', TITLE: '심화', MESSAGES: {},
    ZiweiDeepReport: model, resolveSourceTransactionId: () => 'original-receipt',
    startRefundableExecution: async (_env, _owner, receipt, key) => { assert.equal(receipt, 'original-receipt'); assert.equal(key, 'original-paid-key'); starts++; },
    completeRefundableExecution: async () => { assert.equal(doc.status, 'completed'); return true; }, refundExecution: async () => { refunds++; return true; },
    generateChapter: async (_env, chart, _birth, definition) => {
      calls++; assert.equal(chart.lifePalace, 'fixed');
      const body = Array.from({ length: 70 }, (_, i) => `${definition.id}의 ${i}번째 흐름은 계산한 명반의 조건을 바탕으로 현실에서 선택할 수 있는 행동을 구체적으로 설명합니다.`).join('\n');
      return { id: definition.id, title: definition.title, body, chars: body.length, provider: 'fixture', ok: true };
    },
  });
  load(ctx, 'worker/lib/result-storage.js', ['resultStorageUnavailable', 'resultStorageFailurePayload']);
  load(ctx, 'worker/lib/paid-report-quality.js', ['paidReportBody', 'countPaidReportBodyChars', 'hasRepeatedReportPassage']);
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['handleZiweiDeepReportRoutes', 'handleGenerate', 'runZiweiDeepReportDeliveryBatch', 'handleResult', 'loadStoredReport', 'buildReportId', 'chaptersForDb', 'mergeChapters', 'publicStoredReport', 'accumulatedFromStored', 'reusableDeepChapters', 'isDeepChapterComplete', 'saveDeepCheckpoint', 'finishDeepDelivery', 'syncDeepExecution', 'replayCompletedDeepReport', 'runWithConcurrency', 'judgeDeliverable']);
  const post = body => ctx.handleZiweiDeepReportRoutes(new Request('https://mock.test/api/ziwei-deep-report/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idempotencyKey: 'original-paid-key', ...body }) }), {});
  return { ctx, post, get doc() { return doc; }, get calls() { return calls; }, get starts() { return starts; }, get refunds() { return refunds; }, fault: value => { fault = value; }, owner: value => { owner = value; }, permitted: value => { permitted = value; }, revoked: value => { revoked = value; } };
}

test('완료 실행에는 실제 공용 PDF 검증기가 읽을 수 있는 저장된 장 본문을 전달한다', async () => {
  const { validatePaidServiceResult } = await import('../../worker/lib/service-execution-task.js');
  const f = fixture(); let verdict;
  Object.assign(f.ctx, { executionKeyOf: key => key, SERVICE_KEY: 'ziwei-deep-report',
    completeServiceExecution: async (_env, _owner, payload) => {
      verdict = validatePaidServiceResult('ziwei-deep-pdf', payload.result || { reportId: payload.reportId });
      return { ok: verdict.ok };
    },
  });
  load(f.ctx, 'worker/routes/ziwei-deep-report.js', ['completeRefundableExecution']);
  for (let i = 0; i < 4; i++) {
    const response = await f.post();
    assert.equal(response.status, i === 3 ? 200 : 202, await response.text());
  }
  assert.equal(f.doc.status, 'completed'); assert.equal(verdict?.ok, true, JSON.stringify(verdict));
});

for (const resume of [false, true]) test(`전액 취소된 완료본은 POST ${resume ? '저장 ID' : '원래 구매 키'} 재열람도 차단한다`, async () => {
  const f = fixture(); for (let i = 0; i < 4; i++) await f.post();
  f.revoked(true);
  const response = await f.post(resume ? { resumeReportId: f.doc.id } : {});
  assert.equal(response.status, 403); assert.equal(f.calls, 15); assert.equal(f.refunds, 0);
});

test('심화 화면은 pageshow와 focus만 발생해도 저장된 원래 구매를 다시 조회한다', () => {
  const file = 'app/components/ziwei/ZiweiDeepPdfPanel.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('setResumeEpoch(value => value + 1)')) effect = node.arguments[0]; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(effect);
  const handlers = new Map(), surface = name => ({ addEventListener: (key, fn) => handlers.set(name + key, fn), removeEventListener: key => handlers.delete(name + key) });
  let epoch = 0;
  const ctx = { window: surface('window:'), document: { ...surface('document:'), hidden: false }, navigator: { onLine: true }, setResumeEpoch: fn => { epoch = fn(epoch); } };
  const cleanup = vm.runInNewContext('(' + effect.getText(ast) + ')()', ctx);
  for (const key of ['window:pageshow', 'window:focus']) { assert.equal(typeof handlers.get(key), 'function', key); handlers.get(key)(); }
  assert.equal(epoch, 2); cleanup(); assert.equal(handlers.size, 0);
});

test('실제 scheduled tick은 첫 네 장 저장 후 닫힌 문서를 원래 구매로 15장까지 이어간다', async () => {
  const f = fixture(); await f.post(); assert.equal(f.doc.status, 'partial');
  const ctx = f.ctx, pending = [];
  Object.assign(ctx, {
    PAYMENT_RECONCILE_CRON: '*/10 * * * *',
    ABANDONED_AFTER_MS: 300000, TASK_BUDGET_MS: 240000, BATCH_BUDGET_MS: 65000, MAX_PER_TICK: 3,
    RESUME_APPROVED_TTL_MS: 604800000, PAID: ['paid', 'success', 'fulfilled'],
    Payment: { find: () => ({ sort() { return this; }, limit() { return this; }, lean: async () => [] }) },
    verifyPerUsePayment: async (_env, proof) => { assert.equal(proof.requestId, 'original-paid-key'); assert.equal(proof.featureKey, 'ziwei-deep-pdf'); assert.equal(proof.requireExisting, true); return { proven: true }; },
    __import: async spec => {
      if (spec === './lib/ziwei-deep-report-recovery-task.js') {
        load(ctx, 'worker/lib/ziwei-deep-report-recovery-task.js', ['buildAbandonedZiweiDeepFilter', 'bootstrapApprovedZiweiDeepOrders', 'runZiweiDeepReportRecovery']);
        return { runZiweiDeepReportRecovery: ctx.runZiweiDeepReportRecovery };
      }
      return { runPaymentReconcileTask: async () => {}, runPaymentsV2Reconcile: async () => {}, runSnsDailyPostRecovery: async () => {}, runThreadsDailyJobs: async () => {}, runMasterLoveCodexRecovery: async () => {}, runFusionFortuneRecovery: async () => {} };
    },
  });
  const ast = ts.createSourceFile('worker/index.js', fs.readFileSync('worker/index.js', 'utf8'), ts.ScriptTarget.Latest, true);
  let scheduled; function visit(node) { if (ts.isMethodDeclaration(node) && node.name?.getText(ast) === 'scheduled') scheduled = node; ts.forEachChild(node, visit); } visit(ast); assert.ok(scheduled);
  vm.runInContext(scheduled.getText(ast).replace(/^async scheduled/, 'async function scheduled').replace(/\bimport\(/g, '__import('), ctx);
  for (let i = 0; i < 3; i++) {
    f.doc.updatedAt = new Date(Date.now() - 600000);
    await ctx.scheduled({ cron: '*/10 * * * *' }, {}, { waitUntil: work => pending.push(work) });
    await Promise.all(pending);
  }
  assert.equal(f.doc.status, 'completed'); assert.equal(f.calls, 15); assert.equal(f.starts, 1); assert.equal(f.refunds, 0);
});

test('완료 저장 재조회 유실도 원래 실행 기록을 재생성 없이 마무리한다', async () => {
  const f = fixture(); let completed = 0;
  f.ctx.completeRefundableExecution = async () => { completed++; return true; };
  for (let i = 0; i < 3; i++) await f.post();
  f.fault('confirm_completed'); assert.equal((await f.post()).status, 503);
  assert.equal(f.doc.status, 'completed'); assert.equal(completed, 0);
  assert.equal((await f.post()).status, 200); assert.equal(completed, 1); assert.equal(f.calls, 15); assert.equal(f.starts, 1);
});

async function approvedFixture(change = {}) {
  const { prepareResumeContext, readOrderResumeContext } = await import('../../worker/payments/resume-context.js');
  const f = fixture(), ctx = f.ctx, now = Date.now(), env = { PII_ENC_KEY: Buffer.alloc(32, 9).toString('base64') };
  const body = { birthInfo: { birthDate: '1995-04-18', birthTime: '08:30' }, focusArea: 'career', question: 'original question', locale: 'ko' };
  const paidResume = await prepareResumeContext({ originPath: '/ziwei/chart/', resume: { kind: change.kind || 'ziwei-deep-pdf', args: { idempotencyKey: change.key || 'original-paid-key', payload: JSON.stringify(body) } } },
    { userId: 'owner', requestId: 'original-paid-key', featureKey: 'ziwei-deep-pdf', env, now: now - 600000 });
  const order = { merchantUid: 'original-order', userId: 'owner', requestId: 'original-paid-key', featureKey: 'ziwei-deep-pdf', paymentType: 'digital_content', status: 'paid', createdAt: new Date(now - 600000), metadata: { paidResume }, ...change.order };
  if (change.noInput) delete order.metadata.paidResume;
  const chain = rows => ({ sort() { return this; }, limit() { return this; }, lean: async () => rows });
  Object.assign(ctx, { ABANDONED_AFTER_MS: 300000, TASK_BUDGET_MS: 240000, BATCH_BUDGET_MS: 65000, MAX_PER_TICK: 3,
    RESUME_APPROVED_TTL_MS: 604800000, PAID: ['paid', 'success', 'fulfilled'], readOrderResumeContext,
    Payment: { find: filter => chain(matches(order, filter) ? [order] : []), updateOne: async (_filter, update) => { for (const [key, value] of Object.entries(update.$set)) set(order, key, value); } },
    verifyPerUsePayment: async (_env, proof) => { assert.equal(proof.requestId, 'original-paid-key'); assert.equal(proof.requireExisting, true); return { proven: true }; },
  });
  load(ctx, 'worker/lib/ziwei-deep-report-recovery-task.js', ['buildAbandonedZiweiDeepFilter', 'bootstrapApprovedZiweiDeepOrders', 'runZiweiDeepReportRecovery']);
  return { f, ctx, order, env, body };
}

test('승인 후 generate 전 문서 종료·복귀 URL 미도착도 암호화된 원래 질문으로 시작한다', async () => {
  const { f, ctx, order, env, body } = await approvedFixture();
  await ctx.runZiweiDeepReportRecovery(env);
  assert.equal(f.doc.status, 'partial'); assert.equal(f.calls, 4); assert.equal(f.starts, 1);
  assert.equal(f.doc.llmMeta.resumeBody.question, body.question); assert.equal(f.doc.idempotencyKey, 'original-paid-key');
  assert.equal(order.metadata.ziweiDeepRecovery.status, 'started');
});

for (const change of [{ order: { status: 'pending' } }, { order: { status: 'refunded' } }, { order: { purchaseType: 'GIFT' } }, { order: { userId: 'other-owner' } }, { kind: 'other-feature' }, { key: 'other-purchase' }, { noInput: true }]) {
  test(`승인 bootstrap은 다른 회차·유형·미승인·입력 없음에서 생성하지 않는다 ${JSON.stringify(change)}`, async () => {
    const { f, ctx, env, order } = await approvedFixture(change); await ctx.runZiweiDeepReportRecovery(env);
    assert.equal(f.doc, null); assert.equal(f.calls, 0); assert.equal(f.refunds, 0);
    if (change.noInput) assert.equal(order.metadata.ziweiDeepRecovery.status, 'input_required');
  });
}

test('서버 복구는 원래 증빙이 없으면 다른 이용권 소비나 생성으로 폴백하지 않는다', async () => {
  const f = fixture(); await f.post(); f.ctx.verifyPerUsePayment = async (_env, proof) => { assert.equal(proof.requireExisting, true); return { proven: false }; };
  const response = await f.ctx.runZiweiDeepReportDeliveryBatch(new Request('https://mock.test'), {}, { resumeReportId: f.doc.id }, { userId: 'owner' }, { requireExisting: true });
  assert.equal(response.status, 402); assert.equal(f.calls, 4); assert.equal(f.starts, 1);
});

for (const kind of ['live-lock', 'exhausted']) test(`크론 복구는 활성 락과 공유 챕터 예산을 지킨다 ${kind}`, async () => {
  const { f, ctx, env } = await approvedFixture(); await ctx.runZiweiDeepReportRecovery(env);
  f.doc.updatedAt = new Date(Date.now() - 600000);
  if (kind === 'live-lock') { f.doc.status = 'generating'; f.doc.llmMeta.lockedAt = new Date().toISOString(); }
  else f.doc.llmMeta.attempts.chapter4 = 3;
  const result = await ctx.runZiweiDeepReportRecovery(env);
  assert.equal(f.calls, 4); assert.equal(f.refunds, 0);
  if (kind === 'exhausted') { assert.equal(f.doc.llmMeta.recovery.reviewRequired, true); assert.equal(result.outcomes[0].outcome, 'budget_exhausted'); }
  await ctx.runZiweiDeepReportRecovery(env); assert.equal(f.calls, 4);
});

test('이전 소유자의 챕터 저장과 finally는 새 락 소유자를 덮거나 해제하지 않는다', async () => {
  const f = fixture(); await f.post(); const generate = f.ctx.generateChapter; let replace = true;
  f.ctx.generateChapter = async (...args) => { const result = await generate(...args); if (replace) { replace = false; f.doc.llmMeta.lockToken = 'new-owner'; } return result; };
  assert.equal((await f.post()).status, 503); assert.equal(f.doc.llmMeta.lockToken, 'new-owner');
  assert.equal(Object.keys(f.doc.llmMeta.checkpoints).length, 4); assert.equal(f.refunds, 0);
});

test('실제 챕터 저장 throw도 다른 병렬 장을 보존하고 원래 구매로 재개한다', async () => {
  const f = fixture(); f.fault('checkpoint_throw'); assert.equal((await f.post()).status, 503);
  assert.equal(Object.keys(f.doc.llmMeta.checkpoints).length, 3); assert.equal(f.refunds, 0);
  assert.equal((await f.post()).status, 202); assert.equal(Object.keys(f.doc.llmMeta.checkpoints).length, 7); assert.equal(f.starts, 1);
});

test('앞 장 실패·뒤 장 성공이면 성공 장을 다시 호출하지 않는다', async () => {
  const f = fixture(), generate = f.ctx.generateChapter, calls = [];
  f.ctx.generateChapter = async (...args) => { const definition = args[3]; calls.push(definition.id); const result = await generate(...args); return definition.id === 'chapter0' && calls.filter(id => id === 'chapter0').length === 1 ? { ...result, body: 'provider unavailable', ok: false } : result; };
  assert.equal((await f.post()).status, 202); assert.equal((await f.post()).status, 202);
  for (const id of ['chapter1', 'chapter2', 'chapter3']) assert.equal(calls.filter(chapter => chapter === id).length, 1);
  assert.equal(calls.filter(id => id === 'chapter0').length, 2);
});

for (const code of ['HTTP_429', 'HTTP_503', 'PROVIDER_REFUSED', 'LLM_TIMEOUT']) test(`실제 챕터 생성기의 ${code} 뒤 원래 구매의 실패 장만 복구한다`, async () => {
  const f = fixture(), calls = new Map();
  Object.assign(f.ctx, { buildZiweiDeepChapterPrompt: (_chart, _birth, definition) => definition.id, createLlmCacheStore: () => ({}),
    callGeminiText: async (_env, id) => {
      calls.set(id, (calls.get(id) || 0) + 1);
      if (id === 'chapter0' && calls.get(id) === 1) throw Object.assign(new Error(code), { code });
      return { ok: true, provider: 'gemini', text: Array.from({ length: 70 }, (_, i) => `${id}의 ${i}번째 흐름은 계산한 명반의 조건을 바탕으로 현실에서 선택할 수 있는 행동을 구체적으로 설명합니다.`).join('\n') };
    },
  });
  load(f.ctx, 'worker/routes/ziwei-deep-report.js', ['generateChapter']);
  for (let i = 0; i < 4; i++) assert.equal((await f.post()).status, i === 3 ? 200 : 202);
  assert.equal(calls.get('chapter0'), 2); for (const id of ['chapter1', 'chapter2', 'chapter3']) assert.equal(calls.get(id), 1);
  assert.equal(f.doc.status, 'completed'); assert.equal(f.starts, 1); assert.equal(f.refunds, 0);
});

test('완료 저장본의 fresh GET은 생성·원래 실행 시작 0회이며 계정과 환불을 재확인한다', async () => {
  const f = fixture(); for (let i = 0; i < 4; i++) await f.post();
  const read = () => f.ctx.handleZiweiDeepReportRoutes(new Request('https://mock.test/api/ziwei-deep-report/result?id=' + f.doc.id), {});
  f.permitted(false); assert.equal((await read()).status, 200); assert.equal(f.calls, 15); assert.equal(f.starts, 1);
  f.owner('other'); assert.equal((await read()).status, 404); f.owner('owner'); f.revoked(true); assert.equal((await read()).status, 403);
});

test('차단된 선택 프로필 Storage는 화면을 깨거나 다른 계정 global 프로필로 폴백하지 않는다', () => {
  const source = fs.readFileSync('app/_lib/profile-card-storage.ts', 'utf8');
  const ast = ts.createSourceFile('profiles.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const code = ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(ast)).join('\n');
  const blocked = { getItem() { throw new Error('SecurityError: blocked'); } };
  const exports = {}, ctx = vm.createContext({ exports, window: { localStorage: blocked, sessionStorage: blocked, __cdCurrentDestinyProfile: { id: 'other-account-profile', birthDate: '1992-05-17' } } });
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, ctx);
  assert.equal(exports.readCurrentDestinyProfile(), null);
  ctx.window.localStorage.getItem = key => key === 'fortune_auth_user' ? JSON.stringify({ id: 'owner' }) : blocked.getItem();
  assert.equal(exports.readCurrentDestinyProfile(), null);
  ctx.window.localStorage.getItem = key => key === 'fortune_auth_user' ? JSON.stringify({ id: 'owner' }) : key.endsWith('::owner') ? JSON.stringify({ id: 'owned-profile', birthDate: '1995-04-18' }) : null;
  assert.equal(exports.readCurrentDestinyProfile().id, 'owned-profile');
});

test('실제 생시 미상 계산은 정오 기준의 한계를 모든 심층 장 프롬프트에 유지한다', async () => {
  const { __ziweiDeepReportTestUtils: utils } = await import('../../worker/routes/ziwei-deep-report.js');
  const { calculateZiweiAiChart } = await import('../../worker/lib/ziwei-ai-chart.js');
  const { ZIWEI_DEEP_CHAPTERS, buildZiweiDeepChapterPrompt } = await import('../../worker/lib/ziwei-deep-report-prompt.mjs');
  const normalized = utils.normalizeInput({ birthInfo: { birthDate: '1995-04-18', birthTimeUnknown: true, gender: 'female', calendarType: 'solar' }, question: 'original question' });
  assert.equal(normalized.ok, true);
  const chart = calculateZiweiAiChart(normalized.input, { year: 2026 });
  assert.equal(chart.uncertainty.birthTimeUnknown, true); assert.equal(chart.palaces.length, 12);
  for (const chapter of ZIWEI_DEEP_CHAPTERS) {
    const prompt = buildZiweiDeepChapterPrompt(chart, normalized.birthInfo, chapter, normalized.consultation);
    assert.ok(prompt.includes('출생시간 모름(정오 기준)')); assert.ok(prompt.includes('original question'));
  }
});
for (const access of ['pass', 'subscription', 'paid']) {
  test(`${access}: 서버 체크포인트로 15장을 완성하고 원래 결제를 한 번만 사용한다`, async () => {
    const f = fixture(access);
    for (let i = 0; i < 4; i++) {
      const response = await f.post(i ? { resumeReportId: f.doc.id, startIndex: 999 } : { startIndex: 999 });
      assert.equal(response.status, i === 3 ? 200 : 202, await response.text());
      assert.equal(f.calls, Math.min(15, (i + 1) * 4));
    }
    assert.equal(f.starts, 1); assert.equal(f.refunds, 0);
    assert.equal((await f.post()).status, 200); assert.equal(f.calls, 15);
  });
  test(`${access}: 완료 저장 null은 환불 없이 보존하고 재생성 없이 전달한다`, async () => {
    const f = fixture(access); for (let i = 0; i < 3; i++) await f.post();
    f.fault('completed'); const response = await f.post();
    assert.equal(response.status, 503); assert.equal((await response.json()).reason, 'RESULT_STORAGE_UNAVAILABLE');
    assert.equal(f.doc.status, 'delivery_pending'); assert.equal(f.refunds, 0);
    assert.equal((await f.post({ resumeReportId: f.doc.id })).status, 200); assert.equal(f.calls, 15); assert.equal(f.starts, 1);
  });
}
test('한 챕터 저장 실패에도 같은 병렬 묶음의 정상 챕터를 보존한다', async () => {
  const f = fixture(); f.fault('checkpoint'); assert.equal((await f.post()).status, 503);
  assert.equal(Object.keys(f.doc.llmMeta.checkpoints).length, 3); assert.equal(f.refunds, 0);
  assert.equal((await f.post()).status, 202); assert.equal(Object.keys(f.doc.llmMeta.checkpoints).length, 7);
});
test('동시 요청, 소유권 변경, 입력 변경, 취소 증빙을 차단한다', async () => {
  const f = fixture(); await f.post();
  const responses = await Promise.all([f.post(), f.post()]); assert.ok(responses.every(r => r.status === 202)); assert.equal(f.calls, 8);
  assert.equal((await f.post({ inputHash: 'other' })).status, 409);
  f.owner('other'); assert.equal((await f.post({ resumeReportId: f.doc.id })).status, 404);
  f.owner('owner'); f.permitted(false); assert.equal((await f.post()).status, 402); assert.equal(f.calls, 8);
});
test('짧은 챕터는 완료하지 않고 저장된 호출 한도로 멈춘다', async () => {
  const f = fixture(); f.ctx.generateChapter = async (_e, _c, _b, definition) => ({ ...definition, body: '짧은 본문', ok: true });
  for (let i = 0; i < 3; i++) assert.equal((await f.post()).status, 202);
  assert.equal((await f.post()).status, 503); assert.equal(f.doc.status, 'generation_failed'); assert.equal(f.refunds, 1);
});
test('기존 완료 구매본은 새 분량 기준으로 차단하지 않는다', async () => {
  const f = fixture(); await f.post(); f.doc.status = 'completed'; f.doc.chapters = [{ id: 'old', body: '과거 본문' }]; f.doc.llmMeta.checkpoints = {};
  f.permitted(false); const response = await f.post(); assert.equal(response.status, 200); assert.equal((await response.json()).done, true);
});
for (const blockedAt of [0, 1, 2, 3]) test(`실제 접근 판정은 취소·환불 저장소 ${blockedAt + 1}을 재확인한다`, async () => {
  const f = fixture(); const ctx = f.ctx;
  Object.assign(ctx, { asObject: v => v || {}, verifyAccessToken: async () => ({ userId: 'owner', idempotencyKey: 'original-paid-key', inputHash: 'original' }), isAdmin: () => false,
    findMoonstoneSpendEvidence: async () => { throw new Error('revoked must stop'); }, canAccessPaidFeature: async () => { throw new Error('revoked must stop'); } });
  ['PaidExecutionRecord', 'Payment', 'PointHistory', 'MonthlyCreditLedger'].forEach((name, i) => { ctx[name] = { findOne: () => ({ lean: async () => i === blockedAt ? { id: 'revoked' } : null }) }; });
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['resolveGenerateAccess']);
  assert.equal((await ctx.resolveGenerateAccess(new Request('https://mock.test'), {}, { userId: 'owner' }, { accessToken: 'token' }, { inputHash: 'original' }, 'original-paid-key')).ok, false);
});
test('월정석은 차감된 원래 원장으로 확인하며 잔액을 다시 요구하지 않는다', async () => {
  const ctx = fixture().ctx;
  Object.assign(ctx, { asObject: v => v || {}, isAdmin: () => false, findMoonstoneSpendEvidence: async (_env, options) => { assert.ok(options.tokens.includes('original-paid-key')); return { ledgerId: 'receipt' }; }, canAccessPaidFeature: async () => { throw new Error('must use spent evidence'); } });
  ['PaidExecutionRecord', 'Payment', 'PointHistory', 'MonthlyCreditLedger'].forEach(name => { ctx[name] = { findOne: () => ({ lean: async () => null }) }; });
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['resolveGenerateAccess']);
  assert.equal((await ctx.resolveGenerateAccess(new Request('https://mock.test'), {}, { userId: 'owner' }, {}, { inputHash: 'original' }, 'original-paid-key')).accessType, 'subscription');
});
test('실제 챕터 생성은 짧거나 잘린 본문을 완료하지 않고 보완 요청은 캐시를 재사용하지 않는다', async () => {
  const ctx = fixture().ctx; const observed = [];
  Object.assign(ctx, { buildZiweiDeepChapterPrompt: () => 'fixed facts', createLlmCacheStore: () => ({}), callGeminiText: async (_env, _prompt, options) => { observed.push(options); return { ok: true, text: '가'.repeat(2400), truncated: true }; } });
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['generateChapter']);
  const definition = ctx.ZIWEI_DEEP_CHAPTERS[0];
  assert.equal((await ctx.generateChapter({}, {}, {}, definition, {}, 'ko', 1)).ok, false);
  ctx.callGeminiText = async (_e, _p, options) => { observed.push(options); return { ok: true, text: '가'.repeat(2400) }; };
  assert.equal((await ctx.generateChapter({}, {}, {}, definition, {}, 'ko', 2)).ok, true);
  assert.ok(observed[0].cache); assert.equal(observed[1].cache, undefined); assert.equal(observed[1].maxOutputTokens, 9000);
});
for (const metadata of [{ isMock: true }, { provider: 'staging-mock' }, { provider: 'fallback' }, { finishReason: 'MAX_TOKENS' }, { finishReason: 'length' }]) test(`공급자 완료 표시 ${JSON.stringify(metadata)}는 충분한 본문이어도 실패 장이다`, async () => {
  const ctx = fixture().ctx;
  const text = Array.from({ length: 90 }, (_, i) => `${i + 1}번째 관찰은 계산한 명반의 근거를 생활 속 선택과 연결하고, 조건이 달라질 때 다시 확인할 행동을 구체적으로 설명합니다.`).join('\n');
  Object.assign(ctx, { buildZiweiDeepChapterPrompt: () => 'fixed facts', createLlmCacheStore: () => ({}), callGeminiText: async () => ({ ok: true, text, provider: 'gemini', truncated: false, ...metadata }) });
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['generateChapter']);
  assert.equal((await ctx.generateChapter({}, {}, {}, ctx.ZIWEI_DEEP_CHAPTERS[0], {}, 'ko', 1)).ok, false);
});
test('정상 Workers AI 공급자의 충분한 본문은 기존대로 완료한다', async () => {
  const ctx = fixture().ctx;
  Object.assign(ctx, { buildZiweiDeepChapterPrompt: () => 'fixed facts', createLlmCacheStore: () => ({}), callGeminiText: async () => ({ ok: true, text: '가'.repeat(2400), provider: 'workers-ai', isMock: false, truncated: false, finishReason: 'stop' }) });
  load(ctx, 'worker/routes/ziwei-deep-report.js', ['generateChapter']);
  assert.equal((await ctx.generateChapter({}, {}, {}, ctx.ZIWEI_DEEP_CHAPTERS[0], {}, 'ko', 1)).ok, true);
});
test('실제 심화 화면은 저장된 챕터를 보여주고 같은 결과 ID로 이어간다', async () => {
  const file = 'app/components/ziwei/ZiweiDeepPdfPanel.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn; function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'generate') fn = node; ts.forEachChild(node, visit); } visit(ast); assert.ok(fn);
  const requests = [], states = [], pendingGenerationRef = { current: null };
  const ctx = vm.createContext({ document: { hidden: false }, captureDeliveryScope: () => () => true, payload: {}, pendingGenerationRef,
    setPhase() {}, setGenProgress() {}, cycleSteps: () => () => {}, TOTAL_CHAPTERS: 15, MAX_BATCHES: 20,
    applyReport: (_chapters, _meta, _restored, complete) => states.push(complete), mapError: () => 'error',
    postJson: async (_path, body, key) => { requests.push({ body, key }); const done = requests.length === 4; return { status: done ? 200 : 202, data: { ok: true, status: done ? 'completed' : 'partial', done, saved: done, reportId: 'original-result', chapters: [{ id: 'saved', body: '저장 본문', ok: true }] } }; },
  });
  vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  assert.equal(await ctx.generate('original-paid-key', { receipt: 'original-proof' }), true);
  assert.deepEqual(states, [false, false, false, true]); assert.equal(pendingGenerationRef.current, null);
  assert.equal(requests[0].body.receipt, 'original-proof');
  requests.slice(1).forEach(row => { assert.equal(row.body.resumeReportId, 'original-result'); assert.equal(row.key, 'original-paid-key'); });
});
test('숙요의 긴 결과 카드도 화면 진입 비율 없이 본문을 표시한다', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const file = 'app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'SukuyoReveal'); assert.ok(fn);
  const ctx = vm.createContext({ React });
  vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, ctx);
  const content = '긴숙요결과본문'.repeat(3000); const html = renderToStaticMarkup(ctx.SukuyoReveal({ children: content }));
  assert.ok(html.includes(content)); assert.doesNotMatch(html, /opacity|visibility|display:none|transform/);
});
