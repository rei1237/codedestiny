import '../../tools/oracle/next-delivery/guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import ts from 'typescript';
import { expertSubchapterPromptLines } from '../../worker/lib/expert-subchapter-prompt.js';

const root = process.cwd(), baseline = '692080c4e';
const clone = v => JSON.parse(JSON.stringify(v));
const files = ['saju-ai-prompt.js', 'life-book-ai-saju.js', 'guardian-fortune/adapters/saju.js', 'fusion-fortune-prompt.js', 'guardian-fortune-prompt.js'];
async function sandbox(old = false) {
  const entry = files.map(f => `export * from './worker/lib/${f}';`).join('\n')
    + (old ? '' : "\nexport * from './worker/lib/saju-authority-consumer.js';\nexport * from './lib/saju/gyeokguk-authority.mjs';");
  const compiled = await build({ stdin: { contents: entry, resolveDir: root }, bundle: true, write: false,
    platform: 'node', format: 'cjs', target: 'es2022', plugins: [{ name: 'no-swiss-db-provider', setup(b) {
      b.onResolve({ filter: /.*/ }, args => {
        if (args.path === 'node:crypto') return { path: args.path, external: true };
        // This optional lab helper is never invoked. Do not even traverse its six-engine graph.
        if (args.kind === 'dynamic-import' && args.path === './fusion-fortune.js') return { path: 'blocked-fusion', namespace: 'blocked' };
        if (!args.path.startsWith('.') || /swiss|sweph|ephemeris|jyotish|(?:^|\/)(?:routes|models|db|api)(?:[./]|$)/i.test(args.path)) throw Error('BLOCKED_IMPORT:' + args.path);
        return null;
      });
      b.onLoad({ filter: /.*/, namespace: 'blocked' }, () => ({ contents: "throw Error('SWISS_PATH_BLOCKED')", loader: 'js' }));
      b.onLoad({ filter: /\.(?:m?js|ts|json)$/ }, args => {
        const rel = path.relative(root, args.path).replaceAll('\\', '/');
        if (rel.startsWith('../') || /node_modules|swiss|sweph|ephemeris|jyotish/.test(rel)) throw Error('BLOCKED_FILE:' + rel);
        const contents = old && files.some(f => rel === `worker/lib/${f}`)
          ? execFileSync('git', ['show', `${baseline}:${rel}`], { encoding: 'utf8', windowsHide: true }) : fs.readFileSync(args.path, 'utf8');
        return { contents, loader: rel.endsWith('.json') ? 'json' : rel.endsWith('.ts') ? 'ts' : 'js' };
      });
    } }] });
  const ctx = vm.createContext({ module: { exports: {} }, TextEncoder,
    require: name => { assert.equal(name, 'node:crypto'); return { createHash }; },
    fetch: () => { throw Error('NETWORK_BLOCKED'); } }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(`const D=Date;Date=class extends D {constructor(...a){super(...(a.length?a:['2026-11-02T00:00:00Z']))}static now(){return 1793577600000}};`, ctx);
  vm.runInContext(compiled.outputFiles[0].text, ctx, { timeout: 10000 });
  return ctx.module.exports;
}
const api = await sandbox(), old = await sandbox(true);
const sample = { birthDate: '1988-05-15', birthTime: '08:30', gender: 'male', calendarType: 'solar' };
const raw = api.calculateLifeBookAiSaju(sample);
const promptInput = data => ({ pillars: api.lifeBookPillars(data), calculationMeta: data.calculationMeta });
const input = promptInput(raw), on = { enabled: true };
const pin = api.selectSajuPromptAuthority(input, on);
const args = { question: '이직과 현재 일을 유지하는 선택을 어떻게 비교하면 좋을까요?', domain: 'life_direction', sajuResult: input };

function load(ctx, file, names, constants = []) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const name of constants) {
    const row = ast.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === name));
    assert.ok(row, name); vm.runInContext(row.getText(ast).replace(/^export /, ''), ctx);
  }
  for (const name of names) {
    const row = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.ok(row, name); vm.runInContext(row.getText(ast).replace(/^export /, ''), ctx);
  }
}

test('OFF preserves complete legacy prompt, life-book and guardian outputs across 24 charts', async () => {
  for (const year of [1960, 1988, 2000]) for (const month of ['02', '05', '08', '11']) for (const birthTime of ['08:30', '']) {
    const birth = { ...sample, birthDate: `${year}-${month}-15`, birthTime, birthTimeUnknown: !birthTime };
    const current = api.calculateLifeBookAiSaju(birth), previous = old.calculateLifeBookAiSaju(birth);
    assert.deepEqual(clone(current), clone(previous));
    assert.equal(api.connectLifeBookSajuAuthority(current), current);
    const request = { ...args, sajuResult: promptInput(current) };
    assert.deepEqual(clone(api.buildSajuAIPromptWithDomain(request)), clone(old.buildSajuAIPromptWithDomain(request)));
    const guardianInput = { ...birth, hasBirthTime: Boolean(birthTime) };
    assert.deepEqual(clone(await api.buildSajuAdapter(guardianInput)), clone(await old.buildSajuAdapter(guardianInput)));
  }
});

test('new LLM prompt uses exactly the approved chart/version and preserves candidates, never legacy useful-god claims', () => {
  const poisoned = { ...input, usefulGod: 'LEGACY_SENTINEL', power: { yongshin: 'LEGACY_SENTINEL' }, advancedFactors: { gyeokguk: 'LEGACY_SENTINEL' } };
  const built = api.buildSajuAIPromptWithDomain({ ...args, sajuResult: poisoned, sajuAuthority: pin });
  const expected = api.buildApprovedNatalAnalysis(pin.pillars);
  assert.deepEqual(clone(built.factSnapshot.majorStructures.yongshin), clone(expected.yongshinAnalysis));
  assert.equal(built.factSnapshot.natalAnalysisId, expected.evidence.natalAnalysisId);
  assert.equal(built.factSnapshot.majorStructures.yongshin.coreYongshin, null);
  assert.match(built.prompt, /후보는 확정 용신이 아닙니다/);
  assert.doesNotMatch(built.prompt, /LEGACY_SENTINEL/);
  assert.equal(built.sajuAuthority.digest, pin.digest);
  assert.deepEqual(clone(built.factSnapshot.majorStructures.gyeokguk), clone(expected.gyeokgukAnalysis));
});

test('unknown birth time remains pending in every consumer and cannot acquire invented hour or final useful element', async () => {
  const unknown = api.calculateLifeBookAiSaju({ ...sample, birthTime: '', birthTimeUnknown: true });
  const connected = api.connectLifeBookSajuAuthority(unknown, on), pinned = connected.sajuAuthority;
  const prompt = api.buildSajuAIPromptWithDomain({ ...args, sajuResult: promptInput(unknown), sajuAuthority: pinned });
  const guardian = await api.buildSajuAdapter({}, { sajuAuthoritySnapshot: pinned, calculator: () => { throw Error('RECALCULATION'); } });
  for (const a of [pinned.analysis.yongshinAnalysis, prompt.factSnapshot.majorStructures.yongshin, guardian.expertEvidence.yongshin]) {
    assert.equal(a.status, 'pending'); assert.equal(a.coreYongshin, null); assert.deepEqual(clone(a.usefulCandidates), []);
  }
  assert.equal(pinned.pillars.hour, null);
  assert.equal(guardian.pillars.hour, null);
});

test('life-book, guardian and fusion prompt projections retain the same ID and candidate arrays', async () => {
  const connected = api.connectLifeBookSajuAuthority(raw, on);
  assert.equal(connected.sajuAuthority.digest, pin.digest);
  const ctx = vm.createContext({ SAJU_AUTHORITY_PROMPT_RULES: api.SAJU_AUTHORITY_PROMPT_RULES, clean: (v, max = 100000) => String(v || '').trim().slice(0, max) });
  load(ctx, 'worker/routes/life-book-ai.js', ['evidenceRefRoot', 'pickSajuSlice'], ['SECTION_SAJU_BASE_ROOTS', 'CALCULATION_META_PROMPT_KEYS']);
  const slice = ctx.pickSajuSlice(connected, ['advancedFactors', 'usefulGod', 'fortuneFacts']);
  assert.equal(slice.sajuAuthority.digest, pin.digest);
  assert.doesNotMatch(JSON.stringify(slice), /1988-05-15|08:30/);
  ctx.isLifeFortuneInput = () => false;
  ctx.expertSubchapterPromptLines = expertSubchapterPromptLines;
  ctx.sajuTemperamentPromptLines =() => { throw Error('LEGACY_REJUDGEMENT'); };
  load(ctx, 'worker/routes/life-book-ai.js', ['buildSectionSchema', 'buildSectionPrompt']);
  const chapter = ctx.buildSectionPrompt({ birthInfo: sample }, slice, { kind: 'chapter', index: 0, title: '일의 방향', minChars: 100, targetChars: 150, minAdvice: 1 });
  assert.match(chapter, /후보는 확정 용신이 아닙니다/);
  assert.match(chapter, new RegExp(pin.analysis.evidence.natalAnalysisId));
  const adapter = await api.buildSajuAdapter({}, { sajuAuthoritySnapshot: pin, calculator: () => { throw Error('RECALCULATION'); } });
  const guardianContext = vm.createContext({}); load(guardianContext, 'worker/lib/guardian-fortune-context.js', ['projectSaju']);
  const projected = guardianContext.projectSaju(adapter);
  const guardian = JSON.parse(api.formatGuardianFortuneContextForPrompt({ availableSystems: ['saju'], saju: projected, inputSummary: { category: 'saju' } }));
  assert.match(JSON.stringify(guardian), new RegExp(pin.analysis.evidence.natalAnalysisId));
  const context = { systems: { saju: adapter, ziwei: { lifePalaceSummary: '독립 자미 해석' } } };
  const fusion = api.projectFusionFortuneContextForPrompt(context);
  assert.deepEqual(clone(fusion.systems.saju.sajuAuthority.yongshin), clone(pin.analysis.yongshinAnalysis));
  assert.deepEqual(clone(fusion.systems.ziwei), clone(old.projectFusionFortuneContextForPrompt(context).systems.ziwei));
});

test('stored records stay legacy, pinned retries survive OFF, mutation and crossed charts fail closed', () => {
  assert.equal(api.selectSajuPromptAuthority(input, { enabled: true, hasExistingRecord: true }), null);
  for (const enabled of [undefined, false, 'true']) assert.equal(api.selectSajuPromptAuthority(input, { enabled }), null);
  assert.equal(api.connectLifeBookSajuAuthority(raw, { enabled: true, hasExistingRecord: true }), raw);
  assert.equal(api.selectSajuPromptAuthority(input, { stored: pin, enabled: false, hasExistingRecord: true }).digest, pin.digest);
  const altered = clone(pin); altered.analysis.yongshinAnalysis.coreYongshin = '금';
  assert.throws(() => api.readSajuAuthority(altered), /PIN_INVALID/);
  assert.throws(() => api.readSajuAuthority(null), /PIN_INVALID/);
  const crossed = clone(input); crossed.pillars.day = { stem: '甲', branch: '子', ganji: '甲子' };
  assert.throws(() => api.selectSajuPromptAuthority(crossed, { stored: pin }), /CHART_MISMATCH/);
  assert.equal(Object.isFrozen(pin.analysis.yongshinAnalysis), true);
  const before = JSON.stringify(raw); api.connectLifeBookSajuAuthority(raw, on); assert.equal(JSON.stringify(raw), before);
});

function executionFixture() {
  let doc = null;
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const matches = filter => doc && Object.entries(filter).every(([key, value]) => {
    const actual = key.split('.').reduce((at, part) => at?.[part], doc);
    return value && typeof value === 'object' && '$exists' in value ? (actual !== undefined) === value.$exists : equal(actual, value);
  });
  const ctx = vm.createContext({ Date, JSON, console, SAJU_AI_PROMPT_FEATURE_KEY: 'saju', SAJU_AI_PROMPT_ACCESS_MODE: 'paid', SAJU_AI_PROMPT_AMOUNT_KRW: 1,
    withMongoRetry: async (_env, fn) => fn(), normalizeSajuAIPromptAccessMethod: () => 'single',
    buildSajuAIPromptExecutionId: ({ userId, requestId }) => `${userId}:${requestId}`, buildSajuAIProgress: () => ({}),
    PaidExecutionRecord: { findOneAndUpdate(filter, update, options) {
      const run = async () => {
        if (!matches(filter)) {
          if (!options.upsert) return null;
          if (doc) throw Object.assign(Error('duplicate'), { code: 11000 });
          doc = clone(update.$setOnInsert);
        }
        Object.assign(doc, clone(update.$set), { updatedAt: 'mock-revision' }); return clone(doc);
      };
      return { then: (a, b) => run().then(a, b), lean: run };
    }, findOne: filter => ({ lean: async () => matches(filter) ? clone(doc) : null }) },
  });
  load(ctx, 'worker/routes/fortune.js', ['beginSajuAIConsultationGeneratingRecord', 'saveSajuAIConsultationResultRecord', 'sajuStorageError']);
  return { ctx, get doc() { return doc; } };
}

test('actual atomic claim and completion functions: 16 races, OFF retry, stale lease, save confirmation and old paid preservation', async () => {
  const f = executionFixture(), request = { auth: { userId: 'owner' }, body: { sajuResult: input }, profileId: 'p', requestId: 'mock-request', resultId: 'result', env: {}, payloadHash: 'same', sajuAuthority: pin };
  const outcomes = await Promise.all(Array.from({ length: 16 }, (_, i) => f.ctx.beginSajuAIConsultationGeneratingRecord({ ...request, leaseToken: String(i) })));
  assert.equal(outcomes.filter(Boolean).length, 1);
  const stored = clone(f.doc), selected = api.selectSajuPromptAuthority(input, { enabled: false, stored: stored.result.sajuAuthority, hasExistingRecord: true });
  const builtPrompt = api.buildSajuAIPromptWithDomain({ ...args, sajuAuthority: selected });
  f.doc.status = 'delivery_pending';
  const complete = { ...request, builtPrompt, resultPayload: { resultText: 'mock LLM 상담 원문', personaSummaries: { neo: '선택의 기준을 정리하세요.' } }, promptDigest: 'digest' };
  await assert.rejects(f.ctx.saveSajuAIConsultationResultRecord({ ...complete, leaseToken: 'stale' }), /저장/);
  await f.ctx.saveSajuAIConsultationResultRecord({ ...complete, leaseToken: stored.result.leaseToken });
  assert.equal(f.doc.result.sajuAuthority.digest, pin.digest);
  assert.equal(f.doc.result.factSnapshot.natalAnalysisId, pin.analysis.evidence.natalAnalysisId);
  const saved = JSON.stringify(f.doc);
  assert.equal(await f.ctx.beginSajuAIConsultationGeneratingRecord({ ...request, leaseToken: 'retry' }), null);
  await assert.rejects(f.ctx.saveSajuAIConsultationResultRecord({ ...complete, leaseToken: stored.result.leaseToken }), /저장/);
  assert.equal(JSON.stringify(f.doc), saved);
});

test('actual saju handler: new ON request, mock payment/LLM, OFF partial resume, final delivery and reread retain one pin', async () => {
  const f = executionFixture(), consumed = new Set(), seen = [];
  const json = (body, init) => new Response(JSON.stringify(body), init);
  Object.assign(f.ctx, { Request, Response, Headers, crypto: webcrypto,
    toAiLocale: () => 'ko', getAmbientAiLocale: () => 'ko', readJson: request => request.json(), json,
    console: { info() {}, warn() {}, error(...a) { throw Error(a.map(String).join(' ')); } },
    primePromptTemplateOverrides: async () => {}, buildSajuAIPrompt: api.buildSajuAIPrompt, buildSajuAIPromptWithDomain: api.buildSajuAIPromptWithDomain,
    selectSajuPromptAuthority: api.selectSajuPromptAuthority, SAJU_AI_PROMPT_VERSION: api.SAJU_AI_PROMPT_VERSION,
    SAJU_AI_PROMPT_PRICE: 1, FEATURE_AI_LLM_BUDGET_MS: 60000, NATAL_CORE_VERSION: 'mock-existing',
    sha256Hex: async value => createHash('sha256').update(value).digest('hex'), readAIPromptRequestId: body => body.requestId,
    resolveSajuAIProfileIdForConsultation: () => 'p', buildSajuAIResultId: () => 'result',
    findAIPromptPaidAccessEvidence: async () => ({ ok: true }), validateSajuNatalPayload: () => {},
    normalizeSajuAIStoredResult: record => record.result.consultation,
    findSajuAIExecutionForRead: async () => f.doc && clone(f.doc),
    buildSajuAIPromptError: (code, message, status, extra) => json({ code, message, ...extra }, { status }),
    buildSajuAIPromptPaymentRequiredError: () => json({ code: 'PAID_REQUIRED' }, { status: 403 }),
    handlePigCoinConsume: async request => { consumed.add((await request.json()).requestId); return json({ ok: true, chargedCoins: 0 }); },
    readSajuAIPromptPaymentIdentity: () => ({ paymentId: 'mock-receipt' }),
    isSajuAIPromptStaleGeneratingExecution: () => false,
    buildSajuAIStatusPayload: record => ({ status: record.status, jobId: record.executionId }),
    logSajuAIPromptStage() {}, resolveSajuAIPromptFailureBilling: () => ({ refundOnFailure: false, skipCacheRead: false }),
    createLlmCacheStore: () => null, SAJU_AI_SECTION_GROUPS: [{ key: 'summary' }, { key: 'life_domains' }],
    validateSajuAISection: text => Boolean(text), cmsPromptText: async () => 'mock system', SAJU_AI_RESULT_SYSTEM_PROMPT: 'mock',
    buildSajuAISectionRetryLines: () => [],
    saveSajuAISectionCheckpoint: async ({ leaseToken, sections, status }) => {
      assert.equal(leaseToken, f.doc.result.leaseToken); f.doc.result.sections = clone(sections);
      if (status) f.doc.status = status; return clone(f.doc);
    },
    runSajuAISectionWaves: async (_env, options) => {
      seen.push(clone(options.builtPrompt));
      await options.onSection({ ok: true, text: options.groups[0].key + ' mock 상담 원문', ai: { ok: true, model: 'mock', provider: 'mock' } });
    },
    extractSajuAIPersonaSummaries: text => ({ resultText: text, personaSummaries: {} }),
    hasRepeatedReportPassage: () => false, countSajuAIVisibleChars: text => text.length,
    validateSajuAIResultText: text => ({ ok: true, text }),
    buildSajuAIPromptResultPayload: ({ builtPrompt, resultText }) => ({ resultText, factSnapshot: builtPrompt.factSnapshot }),
    readSajuAIPromptPointRefundContext: () => ({}),
    buildSajuAILlmRetryableError: () => { throw Error(f.ctx.failureMessage || 'unexpected generation failure'); },
  });
  f.ctx.PaidExecutionRecord.updateOne = async (_filter, update) => { f.ctx.failureMessage = update.$set.error.message; };
  load(f.ctx, 'worker/routes/fortune.js', ['handleSajuAIPrompt']);
  const env = { SAJU_GYEOKGUK_AUTHORITY_V2: 'true' };
  const post = body => f.ctx.handleSajuAIPrompt(new Request('https://mock.test/saju', { method: 'POST', body: JSON.stringify(body) }), { userId: 'owner' }, env);
  const first = await post({ ...args, requestId: 'actual-route', sajuAuthority: { forged: true } });
  assert.equal(first.status, 202, await first.text());
  const pinned = clone(f.doc.result.sajuAuthority);
  assert.equal(pinned.digest, pin.digest);
  env.SAJU_GYEOKGUK_AUTHORITY_V2 = 'false';
  const complete = await post({ resumeJobId: f.doc.executionId });
  assert.equal(complete.status, 200, await complete.text());
  assert.equal(f.doc.status, 'completed');
  assert.equal(seen.length, 2);
  for (const built of seen) { assert.equal(built.sajuAuthority.digest, pinned.digest); assert.equal(built.factSnapshot.natalAnalysisId, pinned.analysis.evidence.natalAnalysisId); }
  assert.equal(consumed.size, 1);
  const saved = JSON.stringify(f.doc);
  const reread = await post({ resumeJobId: f.doc.executionId });
  assert.equal(reread.status, 200);
  assert.equal((await reread.json()).resultText, f.doc.result.consultation.resultText);
  assert.equal(seen.length, 2); assert.equal(JSON.stringify(f.doc), saved);
});

test('actual guardian paid seed selects only new saju; stored context resumes OFF and other systems stay unchanged', async () => {
  let seed, saved = null, generated = 0;
  const ctx = vm.createContext({ Request, Response, JSON, featureKey: 'guardian', executionId: () => 'turn', unavailable: () => ({ status: 503 }),
    connectDb: async () => {}, GUARDIAN_FORTUNE_RESULT_LENGTH: { min: 1 },
    ServiceExecutionTransaction: { findOne: () => ({ sort: () => ({ lean: async () => saved }) }) },
    guardianNarrativeAdapter: () => ({}),
    runPaidNarrativeDelivery: async (_request, _env, _auth, body, options) => {
      if (!saved) { await options.verify(body); seed = await options.seed(body); saved = { executionKey: 'turn' }; }
      generated++; return new Response(JSON.stringify({ ok: true, result: seed.context }));
    },
  });
  load(ctx, 'worker/lib/guardian-paid-delivery.js', ['deliverGuardianPaid']);
  const env = { NODE_ENV: 'test', SAJU_GYEOKGUK_AUTHORITY_V2: 'true' }, optionsSeen = [];
  const request = { env, userId: 'owner', requestId: 'turn', input: { ...sample, category: 'saju', hasBirthTime: true },
    resolvePaidAccess: async () => ({ ok: true }), generator: () => { throw Error('REAL_LLM_FORBIDDEN'); },
    contextBuilder: async (input, options) => { optionsSeen.push(options); return { ok: true, context: { availableSystems: [input.category], [input.category]: input.category === 'saju' ? await api.buildSajuAdapter(input, options) : { unchanged: true } } }; } };
  assert.equal((await ctx.deliverGuardianPaid(request)).status, 200);
  assert.equal(seed.context.saju.sajuAuthority.digest, pin.digest);
  env.SAJU_GYEOKGUK_AUTHORITY_V2 = 'false';
  assert.equal((await ctx.deliverGuardianPaid({ ...request, resumeOnly: true })).status, 200);
  assert.equal(optionsSeen.length, 1); assert.equal(generated, 2);
  saved = null; env.SAJU_GYEOKGUK_AUTHORITY_V2 = 'true';
  await ctx.deliverGuardianPaid({ ...request, input: { ...request.input, category: 'tarot' } });
  assert.equal(optionsSeen.at(-1).gyeokgukAuthorityV2, false);
});

test('fusion forwards all six pinned fixture systems without promoting or recalculating them', async () => {
  const { createEngineFactSnapshot } = await import('../../worker/lib/engine-fact-snapshot.js');
  for (const system of ['saju', 'ziwei', 'tarot', 'vedic', 'astrology', 'sukuyo']) {
    const pinned = createEngineFactSnapshot(system, { status: 'pending', candidate: ['unresolved'], final: null }, { locale: 'ko', question: 'fixture' });
    const output = api.projectFusionFortuneContextForPrompt({ systems: { [system]: { engineFacts: pinned } } });
    assert.equal(output.systems[system].engineFacts.digest, pinned.digest);
    assert.equal(output.systems[system].engineFacts.facts.final, null);
    assert.deepEqual(clone(output.systems[system].engineFacts.facts.candidate), ['unresolved']);
  }
});


test('new authority guardian keeps computed major/yearly luck through saved context and prompts without filling old records', async () => {
  const birth = { ...sample, hasBirthTime: true };
  const adapter = await api.buildSajuAdapter(birth, { gyeokgukAuthorityV2: true });
  assert.equal(adapter.timingFacts.majorLuck.available, true);
  assert.deepEqual(clone(adapter.timingFacts.majorLuck), clone(raw.majorLuck));
  assert.deepEqual(clone(adapter.timingFacts.yearlyLuck), clone(raw.yearlyLuck));
  const ctx = vm.createContext({}); load(ctx, 'worker/lib/guardian-fortune-context.js', ['projectSaju']);
  const saved = clone(ctx.projectSaju(adapter));
  const prompt = JSON.parse(api.formatGuardianFortuneContextForPrompt({ availableSystems: ['saju'], saju: saved, inputSummary: { category: 'saju' } }));
  assert.match(JSON.stringify(prompt), /saju-timing-facts-v1/);
  assert.match(JSON.stringify(prompt), new RegExp(raw.majorLuck.currentCycle.pillar));
  const fusion = api.projectFusionFortuneContextForPrompt({ systems: { saju: saved } });
  assert.deepEqual(clone(fusion.systems.saju.timingFacts), clone(adapter.timingFacts));
  const unknown = await api.buildSajuAdapter({ ...birth, birthTime: '', hasBirthTime: false }, { gyeokgukAuthorityV2: true });
  assert.equal(unknown.timingFacts.majorLuck.available, false);
  assert.equal(unknown.timingFacts.majorLuck.currentCycle, undefined);
  const oldPin = await api.buildSajuAdapter({}, { sajuAuthoritySnapshot: adapter.sajuAuthority, calculator: () => { throw Error('RECALCULATION'); } });
  assert.equal(oldPin.timingFacts, undefined);
});
