// Read-only public-adapter comparison. No production selector or engine changes.
import '../next-delivery/guard.cjs';
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = fs.realpathSync(process.cwd());
const forbidden = /swiss|sweph|swisseph|jyotish|ephemeris|(?:^|\/)(?:node_modules|routes|api|\.env[^/]*)(?:\/|$)/i;
const sources = {};
const compiled = await build({
  stdin: { contents: `export {computeNatalFromInput as natal} from './app/saju/animal-destiny/lib/sajuAdapter.ts';
    export {natalCoreFromPillarRows as core, buildGyeokgukAnalysis as view} from './worker/lib/saju-gyeokguk.js';`, resolveDir: root },
  bundle: true, write: false, platform: 'neutral', format: 'cjs', target: 'es2022', tsconfigRaw: '{}',
  plugins: [{ name: 'local-adapter-only', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => {
      if ((!args.path.startsWith('.') && !args.path.startsWith('@/')) || forbidden.test(args.path)) throw new Error('BLOCKED_IMPORT: ' + args.path);
      const base = args.path.startsWith('@/') ? path.resolve(root, args.path.slice(2)) : path.resolve(args.resolveDir, args.path);
      const resolved = [base, ...['.ts', '.js', '.mjs', '.json', '/index.ts', '/index.js'].map(suffix => base + suffix)]
        .find(file => fs.existsSync(file) && fs.statSync(file).isFile());
      if (!resolved) throw new Error('MISSING_IMPORT: ' + args.path);
      const real = fs.realpathSync(resolved), rel = path.relative(root, real).replaceAll('\\', '/');
      if (rel.startsWith('../') || path.isAbsolute(rel) || forbidden.test(rel)) throw new Error('BLOCKED_PATH: ' + rel);
      return { path: real };
    });
    builder.onLoad({ filter: /\.(?:ts|js|mjs|json)$/ }, args => {
      const contents = fs.readFileSync(args.path, 'utf8');
      sources[path.relative(root, args.path).replaceAll('\\', '/')] = createHash('sha256').update(contents.replaceAll('\r\n', '\n')).digest('hex');
      return { contents, loader: args.path.endsWith('.ts') ? 'ts' : args.path.endsWith('.json') ? 'json' : 'js', resolveDir: path.dirname(args.path) };
    });
  } }],
});
const context = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } });
vm.runInContext(`globalThis.module={exports:{}};globalThis.exports=module.exports;
  const RealDate=Date;globalThis.Date=class extends RealDate { constructor(...a){super(...(a.length?a:['2026-11-02T00:00:00Z']));}static now(){return 1793577600000;} };
  globalThis.ioAttempts=0;const deny=()=>{ioAttempts++;throw new Error('IO_BLOCKED');};
  globalThis.fetch=deny;globalThis.setTimeout=deny;globalThis.WebSocket=deny;`, context);
vm.runInContext(compiled.outputFiles[0].text, context, { timeout: 10000 });
function call(symbol, input) {
  context.inputJson = JSON.stringify(input);
  return JSON.parse(vm.runInContext(`JSON.stringify(module.exports.${symbol}(JSON.parse(inputJson)))`, context, { timeout: 10000 }));
}
const positions = ['year', 'month', 'day', 'hour'];
const rows = text => (text.match(/../g) || []).map((pillar, i) => ({ position: positions[i], stem: pillar[0], branch: pillar[1] }));
// Expectations describe the documented service profile, not universal school truth.
const contracts = [
  ['辛酉庚寅甲辰己巳', '건록격', 'general'],
  ['甲寅丁丑戊辰己未', '월겁격', 'general'],
  ['戊辰己未甲寅戊辰', '정재격', 'general'],
  ['戊申辛酉乙未庚辰', '편관격', 'general'],
  ['戊戌辛酉乙酉', '편관격', 'pending'],
  ['戊戌辛酉乙酉丁丑', '가종살격(假從殺格)', 'special'],
  ['戊戌辛酉乙酉辛巳', '종살격(從殺格)', 'special'],
  ['戊辰己未戊戌丁巳', '가색격(稼穡格)', 'special'],
  ['丙戌戊戌戊午丁巳', '정인격', 'pending'],
  ['戊辰己未辛丑戊戌', '종강격(從强格)', 'special'],
  ['丙午戊戌甲戌己巳', '화토격(化土格)', 'special'],
  ['癸未乙卯甲寅乙亥', '곡직격(曲直格)', 'special'],
  ['丙寅甲午壬午丁未', '종재격(從財格)', 'special'],
  ['丁卯丙午甲午己巳', '종아격(從兒格)', 'special'],
  ['壬寅丙午甲午己巳', '상관격', 'general'],
  ['庚寅丙午丙戌甲午', '염상격(炎上格)', 'special'],
  ['丙巳辛酉庚丑庚申', '종혁격(從革格)', 'special'],
  ['庚申壬子壬辰癸亥', '윤하격(潤下格)', 'special'],
  ['甲寅甲卯甲寅癸亥', '종왕격(從旺格)', 'special'],
];
const contractResults = contracts.map(([pillars, name, decision]) => {
  const input = rows(pillars), before = JSON.stringify(input);
  const core = call('core', input), view = call('view', { pillarRows: input });
  assert.equal(core.gyeokguk.name, name, pillars);
  assert.equal(core.special.decision, decision, pillars);
  assert.equal(view.finalGyeokguk, name, 'adapter projection: ' + pillars);
  assert.deepEqual(view.pendingSpecial, core.gyeokguk.pendingSpecial || []);
  assert.equal(JSON.stringify(input), before);
  return { pillars, name, decision, rule: core.gyeokguk.ruleId, status: 'pass' };
});
const samples = [];
const stemHan = Object.fromEntries([...'갑을병정무기경신임계'].map((key, i) => [key, [...'甲乙丙丁戊己庚辛壬癸'][i]]));
const branchHan = Object.fromEntries([...'자축인묘진사오미신유술해'].map((key, i) => [key, [...'子丑寅卯辰巳午未申酉戌亥'][i]]));
for (const year of [1960, 1988, 1990, 2000, 2023, 2026]) for (const month of ['02', '05', '08', '11']) {
  for (const birthTime of ['08:30', '']) {
    const input = { birthDate: `${year}-${month}-15`, birthTime, gender: 'male', calendarType: 'solar' };
    const local = call('natal', input);
    // Convert only the returned pillars; do not recalculate the calendar.
    const pillarRows = positions.filter(key => local.pillars[key] && !(key === 'hour' && local.timeUnknown))
      .map(key => ({ position: key, stem: stemHan[local.pillars[key].stem], branch: branchHan[local.pillars[key].branch] }));
    assert.ok(pillarRows.every(row => row.stem && row.branch), 'Unexpected public pillar schema');
    const core = call('core', pillarRows), view = call('view', { pillarRows });
    const app = local.natalAnalysis.gyeokgukAnalysis;
    const normalized = name => String(name).replace(/\([^)]*\)/g, '').replace('종관살격', '종살격');
    const differs = normalized(app.finalGyeokguk) !== normalized(view.finalGyeokguk) || app.finalType !== view.finalType;
    samples.push({ input, pillars: pillarRows, app: { name: app.finalGyeokguk, type: app.finalType, reason: app.judgmentReason, candidates: app.candidates },
      common: { name: view.finalGyeokguk, type: view.finalType, pending: view.pendingSpecial, reason: view.judgmentReason, rule: view.ruleId, candidates: core.special.candidates },
      classification: differs ? 'B' : 'match', limitation: 'Same pillars; different service rule profiles. Neither result is an independent oracle.' });
  }
}
assert.equal(context.ioAttempts, 0);
const report = { referenceDate: '2026-11-02', profile: 'rok-yangin-strictjong-v1', contractResults, samples,
  summary: { contracts: contractResults.length, samples: samples.length, schoolDifferences: samples.filter(row => row.classification === 'B').length },
  protections: { productionChanges: false, storedResultWrites: 0, ioAttempts: context.ioAttempts, swiss: 'blocked', engineFlags: 'unchanged/OFF' }, sources };
fs.mkdirSync('.tmp/gyeokguk-audit', { recursive: true });
fs.writeFileSync('.tmp/gyeokguk-audit/report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
