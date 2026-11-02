import '../next-delivery/guard.cjs';
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createHash, webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fs.realpathSync(process.cwd());
const baseline = '276d112dcb85adcf0c392b6ab3c76858a4c42bce';
const calculator = 'app/saju/animal-destiny/engine/localSajuCalculator.ts';
const forbidden = /swiss|sweph|swisseph|jyotish|ephemeris|(?:^|\/)(?:node_modules|routes|api|\.env[^/]*)(?:\/|$)/i;
const sources = {};
const baselineCalculator = execFileSync('git', ['show', `${baseline}:${calculator}`], { encoding: 'utf8', maxBuffer: 2e6, windowsHide: true });
async function sandbox(old = false) {
  const entry = old ? `export {computeNatalFromInput as natal} from './app/saju/animal-destiny/lib/sajuAdapter.ts';`
    : `export * from './app/saju/animal-destiny/lib/approvedSajuAnalysis.ts';
       export * from './lib/saju/gyeokguk-authority.mjs';
       export {computeNatalFromInput as natal} from './app/saju/animal-destiny/lib/sajuAdapter.ts';`;
  const compiled = await build({ stdin: { contents: entry, resolveDir: root }, bundle: true, write: false,
    platform: 'neutral', format: 'cjs', target: 'es2022', tsconfigRaw: '{}', plugins: [{ name: 'blocked-io-graph', setup(b) {
      b.onResolve({ filter: /.*/ }, args => {
        if ((!args.path.startsWith('.') && !args.path.startsWith('@/')) || forbidden.test(args.path)) throw new Error('BLOCKED_IMPORT:' + args.path);
        const base = args.path.startsWith('@/') ? path.resolve(root, args.path.slice(2)) : path.resolve(args.resolveDir, args.path);
        const file = [base, ...['.ts', '.js', '.mjs', '.json', '/index.ts', '/index.js'].map(s => base + s)].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
        if (!file) throw new Error('MISSING_IMPORT:' + args.path);
        const real = fs.realpathSync(file), rel = path.relative(root, real).replaceAll('\\', '/');
        if (rel.startsWith('../') || path.isAbsolute(rel) || forbidden.test(rel)) throw new Error('BLOCKED_PATH:' + rel);
        return { path: real };
      });
      b.onLoad({ filter: /\.(?:ts|js|mjs|json)$/ }, args => {
        const rel = path.relative(root, args.path).replaceAll('\\', '/');
        const contents = old && rel === calculator ? baselineCalculator : fs.readFileSync(args.path, 'utf8');
        if (!old) sources[rel] = createHash('sha256').update(contents.replaceAll('\r\n', '\n')).digest('hex');
        return { contents, loader: args.path.endsWith('.ts') ? 'ts' : args.path.endsWith('.json') ? 'json' : 'js', resolveDir: path.dirname(args.path) };
      });
    } }] });
  const context = vm.createContext({ crypto: webcrypto, TextEncoder }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(`globalThis.module={exports:{}};globalThis.exports=module.exports;
    const RealDate=Date;globalThis.Date=class extends RealDate { constructor(...a){super(...(a.length?a:['2026-11-02T00:00:00Z']));}static now(){return 1793577600000;} };
    globalThis.ioAttempts=0; const deny=()=>{ioAttempts++;throw new Error('IO_BLOCKED')};
    globalThis.fetch=deny;globalThis.WebSocket=deny;globalThis.setTimeout=deny;`, context);
  vm.runInContext(compiled.outputFiles[0].text, context, { timeout: 10000 });
  return { api: context.module.exports, context };
}
const clean = x => JSON.parse(JSON.stringify(x));
const { api, context } = await sandbox(), { api: old, context: oldContext } = await sandbox(true);
const on = { gyeokgukAuthorityV2: true };
const sample = { birthDate: '1988-05-15', birthTime: '08:30', gender: 'male', calendarType: 'solar' };
assert.equal(api.GYEOKGUK_AUTHORITY_DEFAULT, false);
let off = 0, onCount = 0;
for (const year of [1960, 1988, 1990, 2000, 2023, 2026]) for (const month of ['02', '05', '08', '11']) for (const birthTime of ['08:30', '']) {
  const input = Object.freeze({ ...sample, birthDate: `${year}-${month}-15`, birthTime });
  const expected = clean(old.natal(input));
  for (const result of [api.natal(input), api.computeNewSajuAnalysis(input), api.computeNewSajuAnalysis(input, { gyeokgukAuthorityV2: false }),
    api.computeNewSajuAnalysis(input, { gyeokgukAuthorityV2: 'true' })]) assert.deepEqual(clean(result), expected);
  off++;
  const updated = clean(api.computeNewSajuAnalysis(input, on));
  for (const key of ['pillars', 'fourPillars', 'solarTermBoundary', 'daewoonStart', 'daewoonDirection', 'timezone', 'trueSolarTimeUsed', 'timeUnknown']) assert.deepEqual(updated[key], expected[key], key);
  const a = updated.natalAnalysis, id = a.evidence.natalAnalysisId;
  for (const row of [a.gyeokgukAnalysis, a.yongshinAnalysis, a.careerAnalysis, a.usefulElements, updated.finalAdvancedReport,
    updated.structuredAdvancedReport.metadata, updated.structuredAdvancedReport.gyeokguk, updated.structuredAdvancedReport.yongshin]) assert.equal(row.natalAnalysisId, id);
  assert.equal(a.yongshinAnalysis.coreYongshin, null);
  assert.deepEqual(a.usefulElements.finalPriority, []);
  assert.deepEqual(a.scoringAnalysis.items, []);
  assert.equal(updated.finalAdvancedReport.reference.defaultCollapsed, true);
  if (!birthTime) { assert.equal(a.yongshinAnalysis.status, 'pending'); assert.deepEqual(a.yongshinAnalysis.usefulCandidates, []); assert.equal(updated.pillars.hour, null); }
  onCount++;
}
assert.equal(api.computeNewSajuAnalysis(sample, on).natalAnalysis.gyeokgukAnalysis.finalGyeokguk, '편인격');
assert.equal(old.natal(sample).natalAnalysis.gyeokgukAnalysis.finalGyeokguk, '전왕격');

const positions = ['year', 'month', 'day', 'hour'];
const chart = text => Object.fromEntries((text.match(/../g) || []).map((s, i) => [positions[i], { stem: s[0], branch: s[1], ganji: s }]));
// Inherited approved profile fixtures, not claims of universal school truth.
const contracts = [
  ['辛酉庚寅甲辰己巳', '건록격'], ['甲寅丁丑戊辰己未', '월겁격'], ['戊辰己未甲寅戊辰', '정재격'],
  ['戊申辛酉乙未庚辰', '편관격'], ['戊戌辛酉乙酉丁丑', '가종살격(假從殺格)'],
  ['戊戌辛酉乙酉辛巳', '종살격(從殺格)'], ['戊辰己未戊戌丁巳', '가색격(稼穡格)'],
  ['戊辰己未辛丑戊戌', '종강격(從强格)'], ['丙午戊戌甲戌己巳', '화토격(化土格)'],
  ['癸未乙卯甲寅乙亥', '곡직격(曲直格)'], ['丙寅甲午壬午丁未', '종재격(從財格)'],
  ['丁卯丙午甲午己巳', '종아격(從兒格)'], ['壬寅丙午甲午己巳', '상관격'],
  ['庚寅丙午丙戌甲午', '염상격(炎上格)'], ['丁巳辛酉辛丑庚申', '종혁격(從革格)'],
  ['庚申壬子壬辰癸亥', '윤하격(潤下格)'], ['甲寅乙卯甲寅癸亥', '종왕격(從旺格)'],
  ['辛酉乙卯甲辰己巳', '양인격'], ['丙午戊戌甲戌丁丑', '가종재격(假從財格)'],
  ['丙午戊戌甲戌己丑', '화토격(化土格)'],
  ['戊申庚申乙酉己酉', '화금격(化金格)'], ['癸酉辛亥丙子癸丑', '화수격(化水格)'],
  ['乙酉乙卯丁亥壬子', '화목격(化木格)'], ['丙午戊午癸巳丙午', '화화격(化火格)'],
  ['壬申辛亥丙子癸丑', '편관격'], ['丙午戊午癸巳丁巳', '편재격'],
];
let variants = 0, rejectedPairs = 0;
for (const [text, expected] of contracts) {
  const original = chart(text), projection = api.projectApprovedGyeokguk(original);
  assert.equal(projection.gyeokgukAnalysis.finalGyeokguk, expected);
  assert.deepEqual(clean(projection.gyeokgukAnalysis.specialCandidates), clean(projection.core.special.candidates));
  if (projection.core.special.decision === 'special') {
    assert.equal(projection.yongshinAnalysis.primaryAxis, 'special');
    assert.deepEqual(clean(projection.useful), [...new Set(projection.core.yongshin.special.follow.filter(Boolean))]);
  }
  // One stem/branch change at a time, plus a missing hour. No replacement
  // charter rules: pass/fail/unknown and adopted-only selection must survive.
  for (const position of positions) for (const [field, values] of [['stem', [...'甲乙丙丁戊己庚辛壬癸']], ['branch', [...'子丑寅卯辰巳午未申酉戌亥']]]) {
    for (const value of values) {
      const modified = clean(original); modified[position][field] = value;
      const changed = modified[position];
      if ([...'甲乙丙丁戊己庚辛壬癸'].indexOf(changed.stem) % 2 !== [...'子丑寅卯辰巳午未申酉戌亥'].indexOf(changed.branch) % 2) {
        assert.throws(() => api.projectApprovedGyeokguk(modified), /INVALID_AUTHORITY_PILLAR_PAIR/);
        rejectedPairs++; continue;
      }
      const p = api.projectApprovedGyeokguk(modified), g = p.gyeokgukAnalysis;
      assert.deepEqual(clean(g.specialCandidates), clean(p.core.special.candidates));
      const adopted = g.specialCandidates.find(c => c.id === g.adoptedSpecialId);
      if (adopted) assert.equal(adopted.status, 'pass');
      assert.equal(p.yongshinAnalysis.natalAnalysisId, g.natalAnalysisId);
      variants++;
    }
  }
  const unknown = { ...original, hour: null }, p = api.projectApprovedGyeokguk(unknown);
  assert.equal(p.yongshinAnalysis.status, 'pending'); assert.deepEqual(clean(p.useful), []);
}
assert.equal(api.projectApprovedGyeokguk(chart('丙戌戊戌戊午丁巳')).gyeokgukAnalysis.specialDecision, 'pending');
for (const text of ['壬申辛亥丙子癸丑', '丙午戊午癸巳丁巳']) {
  const hua = api.projectApprovedGyeokguk(chart(text)).gyeokgukAnalysis.specialCandidates.find(c => c.id === 'HUA-01');
  assert.equal(hua.status, 'fail');
  assert.equal(hua.checks.find(c => c.id === 'HUA-NO-CLASH').ok, false);
}
assert.throws(() => api.projectApprovedGyeokguk(chart('甲?乙卯丙午丁巳')), /INVALID_AUTHORITY_PILLAR/);
assert.throws(() => api.projectApprovedGyeokguk({ day: chart('甲寅').year }), /INCOMPLETE_AUTHORITY_CHART/);

const rows = new Map(); let writes = 0;
const store = { async get(key) { return rows.get(key) || null; }, async insertIfAbsent(key, candidate) {
  if (!rows.has(key)) { rows.set(key, clean(candidate)); writes++; } return clean(rows.get(key));
} };
const attempts = await Promise.all(Array.from({ length: 16 }, (_, i) => api.prepareNewSajuAnalysis('new-saju-1', sample, store, i % 2 ? {} : on)));
assert.equal(writes, 1);
for (const p of attempts) assert.deepEqual(clean(p), clean(attempts[0]));
const prepared = await api.prepareNewSajuAnalysis('explicit-on', sample, store, on);
const bytes = JSON.stringify(rows.get('explicit-on'));
const afterOff = await api.prepareNewSajuAnalysis('explicit-on', sample, store, {});
assert.deepEqual(clean(afterOff), clean(prepared));
for (const _phase of ['payment-return', 'generate', 'retry', 'reopen']) assert.deepEqual(clean(await api.resumePreparedSajuAnalysis(clean(prepared))), clean(prepared.result));
const prompt = clean(await api.preparedSajuPromptFacts(clean(prepared)));
assert.deepEqual(prompt.pillars, clean(prepared.result.pillars));
assert.equal(prompt.analysis.gyeokgukAnalysis.natalAnalysisId, prompt.report.metadata.natalAnalysisId);
const mutablePin = clean(prepared), promptPending = api.preparedSajuPromptFacts(mutablePin);
mutablePin.calculationVersion = 'changed-during-await';
assert.equal((await promptPending).calculationVersion, prepared.calculationVersion);
assert.equal(JSON.stringify(rows.get('explicit-on')), bytes);
const options = { ...on }, mutableInput = { ...sample };
const inFlight = api.prepareNewSajuAnalysis('capture-before-await', mutableInput, store, options);
options.gyeokgukAuthorityV2 = false; mutableInput.birthTime = '15:30';
const captured = await inFlight;
assert.equal(captured.calculationVersion, api.GYEOKGUK_AUTHORITY_VERSION);
assert.equal(captured.input.birthTime, sample.birthTime);
assert.equal(Object.isFrozen(captured.result.natalAnalysis.gyeokgukAnalysis), true);
// An insert response can be lost after the atomic write. Retry returns the
// existing winner and must not insert again or reselect the OFF version.
let lost = false;
const responseLoss = { get: store.get, async insertIfAbsent(key, candidate) {
  const winner = await store.insertIfAbsent(key, candidate);
  if (!lost) { lost = true; throw new Error('MOCK_LOST_RESPONSE'); }
  return winner;
} };
await assert.rejects(api.prepareNewSajuAnalysis('lost-response', sample, responseLoss, on), /MOCK_LOST_RESPONSE/);
const writesBeforeRetry = writes;
const recovered = await api.prepareNewSajuAnalysis('lost-response', sample, responseLoss, {});
assert.equal(writes, writesBeforeRetry);
assert.equal(recovered.calculationVersion, api.GYEOKGUK_AUTHORITY_VERSION);
await assert.rejects(api.prepareNewSajuAnalysis('explicit-on', { ...sample, birthTime: '09:30' }, store, on), /INPUT_MISMATCH/);
for (const mutate of [p => p.result.pillars.day.stem = '갑', p => p.calculationVersion = 'future-unsupported', p => p.digest = 'broken']) {
  const tampered = clean(prepared); mutate(tampered);
  await assert.rejects(api.resumePreparedSajuAnalysis(tampered), /MISMATCH|UNSUPPORTED/);
}
const storedLegacy = clean(old.natal(sample)), saved = JSON.stringify(storedLegacy);
let legacyWrites = 0;
// Accidental preparation of an existing, unversioned record must fail closed,
// not treat it as a new request or overwrite its original paid content.
const legacyStore = { async get() { return storedLegacy; }, async insertIfAbsent() { legacyWrites++; throw new Error('MUST_NOT_WRITE'); } };
await assert.rejects(api.prepareNewSajuAnalysis('existing-paid', sample, legacyStore, on), /UNSUPPORTED_SAJU_PREPARATION/);
assert.equal(legacyWrites, 0);
assert.equal(JSON.stringify(storedLegacy), saved);
const conflicting = await Promise.allSettled([
  api.prepareNewSajuAnalysis('conflicting-birth', sample, store, on),
  api.prepareNewSajuAnalysis('conflicting-birth', { ...sample, birthTime: '15:30' }, store, on),
]);
assert.equal(conflicting.filter(r => r.status === 'fulfilled').length, 1);
assert.match(conflicting.find(r => r.status === 'rejected').reason.message, /INPUT_MISMATCH/);
let failureWrites = 0;
await assert.rejects(api.prepareNewSajuAnalysis('read-failure', sample, {
  async get() { throw new Error('MOCK_READ_FAILURE'); }, async insertIfAbsent() { failureWrites++; },
}, on), /MOCK_READ_FAILURE/);
assert.equal(failureWrites, 0);

// Protected existing files/engines remain byte-identical to the integration base.
for (const file of ['app/saju/animal-destiny/lib/sajuAdapter.ts', 'app/saju/love-simulation/_engine/normalizeSaju.ts',
  'package.json', 'package-lock.json', ...Object.keys(sources).filter(f => f.startsWith('lib/saju/natal-core/') || f.startsWith('lib/korean-calendar/') || f === 'worker/lib/saju-gyeokguk.js')]) {
  const previous = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', maxBuffer: 4e6, windowsHide: true });
  assert.equal(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), previous.replaceAll('\r\n', '\n'), file);
}
assert.equal(context.ioAttempts + oldContext.ioAttempts, 0);
const report = { baseline, profile: api.APPROVED_GYEOKGUK_PROFILE, version: api.GYEOKGUK_AUTHORITY_VERSION,
  offDeepEqual: off, onConsistent: onCount, namedContracts: contracts.length, singleFieldProjectionVariants: variants, rejectedPairs,
  concurrentRequests: attempts.length, concurrentInsertions: 1, lifecycle: 'pass', integrity: 'pass', ioAttempts: 0,
  swiss: 'blocked', productionFlag: false, sources,
  limitations: ['Profile regression, not independent classical truth', 'Single useful element unresolved by design', 'Real DB/PG/LLM and deployed integration not tested'] };
fs.mkdirSync('.tmp/gyeokguk-authority', { recursive: true });
fs.writeFileSync('.tmp/gyeokguk-authority/same-pillars-input.json', JSON.stringify([
  { pillars: '戊辰丁巳庚午己卯', expected: '편인격' },
  ...contracts.map(([pillars, expected]) => ({ pillars, expected })),
], null, 2) + '\n');
fs.writeFileSync('.tmp/gyeokguk-authority/report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, sources: Object.keys(sources).length }));
