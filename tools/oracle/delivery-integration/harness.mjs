import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';

export const wire = value => JSON.parse(JSON.stringify(value));
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
// Check the previously approved, Swiss-free calculation graph BEFORE importing it.
const pins = JSON.parse(read('tools/oracle/delivery-integration/consumer-source-pins.json'));
for (const [file, hash] of Object.entries(pins.domains.ziwei)) {
  assert.equal(createHash('sha256').update(read(file).replaceAll('\r\n', '\n')).digest('hex'), hash, file);
}
const preparation = await import('../../../worker/lib/ziwei-calculation-preparation.js');
const adapter = await import('../../../worker/lib/ziwei-execution-adapter.js');
const calculator = await import('../../../worker/lib/ziwei-ai-chart.js');
const routeFile = 'worker/routes/ziwei-ai.js';
const clientFile = 'app/ziwei-ai/ZiweiAiClient.tsx';
const resumeFile = 'app/hooks/usePaidResume.ts';

function parse(file) { return ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function find(file, predicate) {
  const ast = parse(file); let found;
  function visit(node) { if (predicate(node)) found = node; else ts.forEachChild(node, visit); }
  visit(ast); assert.ok(found, file); return found.getText(ast);
}
function evaluate(context, source) {
  const ast = ts.createSourceFile('isolated.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function guard(node) {
    assert.ok(!ts.isImportDeclaration(node) && node.kind !== ts.SyntaxKind.ImportKeyword, 'No module loading in VM');
    if (ts.isIdentifier(node)) assert.ok(!['require', 'process', 'eval', 'WebAssembly'].includes(node.text), `Blocked: ${node.text}`);
    ts.forEachChild(node, guard);
  }
  guard(ast);
  return vm.runInContext(ts.transpileModule(source.replace(/^export /gm, ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText, context);
}
// Select actual declarations and their local dependencies. Imports are never followed.
// Overrides are explicit test boundaries; omitted external symbols fail closed.
function load(context, file, roots, isolate = true) {
  const ast = parse(file), declarations = new Map(), chosen = new Set();
  for (const node of ast.statements) {
    if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node);
    if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) {
      if (ts.isIdentifier(d.name)) declarations.set(d.name.text, node);
    }
  }
  function visitName(name) {
    if (Object.hasOwn(context, name)) return;
    const node = declarations.get(name);
    if (!node || chosen.has(node)) return;
    chosen.add(node);
    function visit(child) { if (ts.isIdentifier(child)) visitName(child.text); ts.forEachChild(child, visit); }
    ts.forEachChild(node, visit);
  }
  roots.forEach(visitName);
  const source = ast.statements.filter(n => chosen.has(n)).map(n => n.getText(ast)).join('\n');
  // Preserve private module scope (e.g. basis.clean is NOT route.clean).
  if (isolate) Object.assign(context, evaluate(context, `(() => {\n${source.replace(/^export /gm, '')}\nreturn { ${roots.join(', ')} };\n})()`));
  else evaluate(context, source);
  return [...declarations].filter(([, node]) => chosen.has(node)).map(([name]) => name);
}

const get = (row, key) => key.split('.').reduce((v, k) => v?.[k], row);
export function matches(row, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some(q => matches(row, q));
    if (key === '$and') return expected.every(q => matches(row, q));
    if (key === '$nor') return !expected.some(q => matches(row, q));
    const actual = get(row, key);
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      return Object.entries(expected).every(([op, value]) => {
        if (op === '$in') return value.includes(actual);
        if (op === '$nin') return !value.includes(actual);
        if (op === '$ne') return actual !== value;
        if (op === '$exists') return (actual !== undefined) === value;
        if (op === '$lt') return new Date(actual).getTime() < new Date(value).getTime();
        throw new Error(`Unsupported mock predicate: ${op}`);
      });
    }
    return expected == null ? actual == null : actual === expected;
  });
}
function model(state, name) {
  const rows = state[name] = [];
  const query = action => {
    let limit = Infinity;
    const q = { lean: async () => { const value = action(); return structuredClone(Array.isArray(value) ? value.slice(0, limit) : value); }, select: () => q, sort: () => q,
      limit: count => { limit = count; return q; },
      then: (ok, fail) => q.lean().then(ok, fail), catch: fail => q.lean().catch(fail) };
    return q;
  };
  const update = (filter, change) => {
    const row = rows.find(r => matches(r, filter));
    if (!row) return null;
    if (name === 'consultations' && change.$set?.status === 'completed' && state.failCompletion) {
      state.failCompletion = false; throw new Error('mock completion write unavailable');
    }
    if (change.$set?.usageAppliedAt && !row.usageAppliedAt) state.usageApplications++;
    for (const [key, value] of Object.entries(change.$set || {})) row[key] = structuredClone(value);
    for (const [key, value] of Object.entries(change.$inc || {})) row[key] = (row[key] || 0) + value;
    state.writes.push({ collection: name, id: row.id || row._id, fields: Object.keys(change.$set || {}) });
    return row;
  };
  return {
    find: filter => query(() => rows.filter(row => matches(row, filter))),
    findOne: filter => query(() => rows.find(row => matches(row, filter)) || null),
    findById: id => query(() => rows.find(row => row._id === id) || null),
    create: async data => {
      const unique = name === 'preparations' ? row => row._id === data._id
        : row => row.userId === data.userId && row.idempotencyKey === data.idempotencyKey;
      if (rows.some(unique)) throw Object.assign(new Error('duplicate synthetic record'), { code: 11000 });
      const row = structuredClone({ _id: `mock-${name}-${rows.length}`, createdAt: new Date(state.time), updatedAt: new Date(state.time), ...data });
      rows.push(row); return structuredClone(row);
    },
    findOneAndUpdate: (filter, change) => query(() => update(filter, change)),
    findByIdAndUpdate: (id, change) => query(() => update({ _id: id }, change)),
    updateOne: async (filter, change) => ({ matchedCount: update(filter, change) ? 1 : 0 }),
  };
}

export function server() {
  const state = { time: Date.parse('2026-11-02T00:00:00Z'), year: 2026, userId: 'mock-owner',
    uuid: 0, pgCalls: [], llmInputs: [], writes: [], usageApplications: 0, externalCalls: 0,
    refunds: 0, partialOnce: false, requests: [], receipts: new Set(), errors: [] };
  const block = () => { state.externalCalls++; throw new Error('External calls forbidden'); };
  const context = vm.createContext({
    Error, TypeError, URL, Headers, structuredClone, createHash,
    mongoose: { isValidObjectId: mongoose.isValidObjectId, Types: { ObjectId: mongoose.Types.ObjectId } },
    console: { log() {}, warn() {}, error: (...args) => state.errors.push(args.map(String)) },
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [state.time])); } static now() { return state.time; } getFullYear() { return state.year; } },
    randomUUID: () => `mock-uuid-${++state.uuid}`, fetch: block,
    ...preparation, ...adapter, ...calculator,
    ZiweiCalculationPreparation: model(state, 'preparations'), ZiweiAiConsultation: model(state, 'consultations'),
    Payment: model(state, 'payments'), PaidExecutionRecord: model(state, 'evidence'),
    PointHistory: model(state, 'points'), MonthlyCreditLedger: model(state, 'credits'),
    User: { findById: block }, consumePassForFeature: block,
    json: (body, options = {}) => ({ status: options.status || 200, data: wire(body) }),
    notFound: () => ({ status: 404, data: { ok: false, reason: 'NOT_FOUND' } }),
    readJson: async req => wire(req.body), connectDb: async () => {},
    getOptionalUserFromRequest: async () => state.userId ? { userId: state.userId } : null,
    peekAccessTokenUserId: async () => state.userId, isAuthDbInfraError: () => false,
    withMongoRetry: async (_env, fn) => fn(), isAdmin: () => false,
    loadBillingUser: async () => ({ _id: state.userId }),
    resolveServerAccess: async () => ({ ok: false }), resolveBillingGateAccess: async () => ({ ok: false }),
    getPricing: () => ({ amountKRW: 30000, coinPrice: 300, membershipCreditCost: 300, pricing: {} }),
    getPortOnePublicConfig: () => ({ configured: true, storeId: 'mock-store', channelKey: 'mock-channel' }),
    buildPaymentId: () => `mock-order-${++state.uuid}`, customerFromUser: () => ({ customerId: state.userId }),
    verifyAccessToken: block, createAccessToken: block,
    normalizeConsultAccessType: v => v, isAllowedConsultTokenAccessType: v => ['admin', 'pass', 'paid', 'subscription'].includes(v),
    neverPaidExpiredOrder: () => ({ status: 'cancelled', failureCode: 'expired', paidAt: null }),
    isStoredPaidResultRevoked: async () => state.revoked === true,
    verifyPgPayment: async (_env, options) => {
      state.pgCalls.push(wire(options));
      assert.ok(state.receipts.has(options.orderId), 'Mock PG has no successful receipt');
      assert.equal(options.expectedAmountKRW, 30000);
      return { paidAt: new Date(state.time), summary: { channelCheck: 'mock-only' } };
    },
    claimRequestBillingEvidence: async () => ({ ok: true }), releaseRequestBillingEvidence: async () => {},
    runWithAiLocale: (_locale, fn) => fn(), storedAiLocale: () => 'ko',
    generateInitialConsultation: async (_env, options) => {
      state.llmInputs.push(wire({ chart: options.chart, input: options.input, groups: options.groups }));
      if (state.holdGeneration) await state.holdGeneration;
      const groups = { foundation: { structure_core: `합성 검증 ${digest(options.chart)}` } };
      await options.checkpoint({ groups, attempts: { foundation: 1 }, meta: { synthetic: true }, rawResponses: {} });
      const complete = !state.partialOnce; state.partialOnce = false;
      return { complete, text: JSON.stringify({ meta: { synthetic: true }, sections: groups.foundation }), meta: { groups } };
    },
    restorePrepaidAccessOnFailure: async () => { state.refunds++; return {}; },
    refundCardPaymentOnFailure: async () => { state.refunds++; return {}; },
    logZiweiAi() {}, safeLogPayload: value => value,
  }, { codeGeneration: { strings: false, wasm: false } });
  load(context, 'worker/lib/fortune-glossary.js', ['lookupTerm']);
  load(context, 'worker/lib/analysis-basis-contract.js', ['basisGroup', 'basisItem', 'basisStage', 'buildAnalysisBasisPayload']);
  load(context, 'worker/lib/ziwei-hanja.js', ['stripEmptyParens', 'applyZiweiHanjaToStructuredText']);
  load(context, 'worker/lib/result-storage.js', ['resultStorageUnavailable', 'resultStorageFailurePayload']);
  load(context, 'lib/ziwei-star-strength.js', ['ZIWEI_STRENGTH_LEGEND']);
  state.declarations = load(context, routeFile, ['handleEnsureAccess', 'handleBasis', 'handleStart', 'handleResult', 'buildCanonicalZiweiFacts'], false);
  state.context = context;
  state.request = async (path, body = {}, method = 'POST') => {
    const url = new URL(path, 'https://mock.invalid');
    const handlers = { '/api/ziwei-ai/prepare': 'handleEnsureAccess', '/api/ziwei-ai/basis': 'handleBasis',
      '/api/ziwei-ai/generate': 'handleStart', '/api/ziwei-ai/result': 'handleResult' };
    assert.ok(handlers[url.pathname], 'Only four in-memory endpoints allowed');
    state.requests.push({ path: url.pathname, method, body: wire(body) });
    const result = await context[handlers[url.pathname]]({ body: wire(body), method, url: url.href, headers: new Headers() }, state.env || {});
    return wire(result);
  };
  return state;
}

export function client(server, { redirect = false, key = 'mock-integration-request-0001', form = {} } = {}) {
  const state = { errors: [], phases: [], basis: null, consultation: null, descriptor: null, gateCalls: 0, pending: [] };
  const authFetch = async (path, options = {}) => {
    const result = await server.request(path, options.body ? JSON.parse(options.body) : {}, options.method || 'GET');
    return { status: result.status, ok: result.status >= 200 && result.status < 300, json: async () => wire(result.data) };
  };
  const context = vm.createContext({
    Error, TypeError, URL, console, consultation: null, busyRef: { current: false }, idempotencyRef: { current: key },
    form: { name: '합성 검증', birthDate: '2023-02-04', birthTime: '11:42', calendarType: 'solar', gender: 'male',
      birthTimeUnknown: false, isLeapMonth: false, focusArea: 'overall', question: '', ...form },
    authFetch, postJson: (path, body) => server.request(path, body),
    captureOwner: () => { const owner = server.userId; return () => owner === server.userId; },
    setError: value => state.errors.push(value), setNotice() {}, setPhase: value => state.phases.push(value),
    setBasis: value => { state.basis = wire(value); },
    setConsultation: value => { state.consultation = wire(value); context.consultation = wire(value); },
    rememberConsultationUrl: id => { state.urlId = id; },
    sleep: async () => { if (state.onSleep) await state.onSleep(); }, document: { visibilityState: 'visible' },
    toDisplayText: value => String(value ?? ''), readDevPreviewState: () => null,
    beginPaidFeatureGateCheck() {}, holdPaidFeatureGateOpen() {}, completePaidFeatureGateCheck() {},
    failPaidFeatureGateCheck() {}, releasePaidFeatureGate() {}, primePaymentEligibility: async () => {},
    runAccessCheckWithTransientRetry: fn => fn(), isRetriableResultPollFailure: status => status === 503,
    buildResume: args => ({ kind: 'ziwei-ai-consultation', action: '', args: wire(args), locale: 'ko' }),
    runBillingCoinGate: async options => {
      state.gateCalls++; state.descriptor = wire(options.resume);
      const order = server.payments.find(p => p.idempotencyKey === key);
      assert.ok(order); server.receipts.add(order.merchantUid);
      state.grant = { ok: true, status: 'paid', paymentId: order.merchantUid };
      if (redirect) throw new Error('MOCK_DOCUMENT_REDIRECT');
      return state.grant;
    },
    fetch: () => { throw new Error('Network forbidden'); },
  }, { codeGeneration: { strings: false, wasm: false } });
  load(context, resumeFile, ['packPaidResumeArg', 'unpackPaidResumeArg']);
  load(context, 'lib/fortune/analysis-basis.ts', ['fetchAnalysisBasis']);
  const fetchBasis = context.fetchAnalysisBasis;
  context.fetchAnalysisBasis = (...args) => { const promise = fetchBasis(...args); state.pending.push(promise); return promise; };
  load(context, clientFile, ['buildConsultationPayload', 'validateForm', 'mapError', 'extractPayment', 'isPaymentGranted', 'buildBillingGateInput', 'pollZiweiResult'], false);
  for (const name of ['generateConsultation', 'handleSubmit']) {
    evaluate(context, find(clientFile, n => ts.isFunctionDeclaration(n) && n.name?.text === name));
  }
  const callback = find(clientFile, n => ts.isCallExpression(n) && n.expression.getText() === 'usePaidResume');
  const ast = ts.createSourceFile('callback.tsx', callback, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  state.restore = evaluate(context, `const resumeCallback = ${ast.statements[0].expression.arguments[1].getText(ast)}; resumeCallback;`);
  state.submit = async () => { await context.handleSubmit({ preventDefault() {} }); await Promise.all(state.pending); };
  state.context = context;
  return state;
}
