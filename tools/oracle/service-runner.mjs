import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ROOT, FORBIDDEN, verifyLicenses } from './verify-licenses.mjs';
import { blockNetwork } from './network-guard.mjs';
import { readInput, envelope, unsupported, checkOptions } from './contract.mjs';

export const REPO = path.resolve(ROOT, '../..');
export const ENTRYPOINTS = Object.freeze({
  saju: ['app/saju/animal-destiny/lib/sajuAdapter.ts', 'computeNatalFromInput'],
  ziwei: ['worker/lib/guardian-fortune/adapters/ziwei.js', 'buildZiweiAdapter'],
});
export const BLOCKED = new Set(['vedic', 'nakshatra', 'sukuyo', 'astrology', 'western']);
function normalizePillars(pillars) {
  const stems = Object.fromEntries([...'갑을병정무기경신임계'].map((key, i) => [key, [...'甲乙丙丁戊己庚辛壬癸'][i]]));
  const branches = Object.fromEntries([...'자축인묘진사오미신유술해'].map((key, i) => [key, [...'子丑寅卯辰巳午未申酉戌亥'][i]]));
  return Object.fromEntries(['year', 'month', 'day', 'hour'].map(key => {
    const value = pillars[key];
    if (!value) return [key, null];
    if (!stems[value.stem] || !branches[value.branch]) throw new Error('SERVICE_PILLAR_SCHEMA_CHANGED');
    return [key, stems[value.stem] + branches[value.branch]];
  }));
}
const slash = value => value.replaceAll('\\', '/');
const deniedPath = value => FORBIDDEN.test(value) || /(?:^|\/)(?:node_modules|api|routes|\.env[^/]*)(?:\/|$)|(?:portone|inicis|ephemeris|swiss|payment-exec)/i.test(value);

// Build only; never import service modules into the host process. Every resolved
// file is reviewed and pinned separately before evaluateBundle can run it.
export async function buildAdapter(domain, repo = REPO, publicSymbol) {
  if (!Object.hasOwn(ENTRYPOINTS, domain)) throw new Error('SERVICE_DOMAIN_BLOCKED');
  verifyLicenses();
  const { build } = await import('esbuild');
  const [entry, defaultSymbol] = ENTRYPOINTS[domain];
  if (publicSymbol && !(domain === 'saju' && publicSymbol === 'resolveAnimalTwelveResult')) throw new Error('SERVICE_SYMBOL_BLOCKED');
  const symbol = publicSymbol ?? defaultSymbol;
  const sourceFiles = new Map();
  const result = await build({
    stdin: { contents: `export { ${symbol} as run } from './${entry}';`, resolveDir: repo, sourcefile: 'audit-entry.js' },
    absWorkingDir: repo, bundle: true, write: false, platform: 'neutral', format: 'cjs', target: 'es2022',
    tsconfigRaw: '{}', logLevel: 'silent', treeShaking: true,
    plugins: [{ name: 'audit-read-only-graph', setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        if (deniedPath(args.path) || (!args.path.startsWith('.') && !args.path.startsWith('@/'))) throw new Error(`SERVICE_IMPORT_BLOCKED: ${args.path}`);
        const base = args.path.startsWith('@/') ? path.join(repo, args.path.slice(2)) : path.resolve(args.resolveDir, args.path);
        const resolved = [base, ...['.ts', '.js', '.mjs', '.json', '/index.ts', '/index.js'].map(ext => base + ext)]
          .find(file => fs.existsSync(file) && fs.statSync(file).isFile());
        if (!resolved) throw new Error(`SERVICE_IMPORT_MISSING: ${args.path}`);
        const real = fs.realpathSync(resolved), rel = slash(path.relative(fs.realpathSync(repo), real));
        if (rel.startsWith('../') || path.isAbsolute(rel) || deniedPath(rel)) throw new Error(`SERVICE_IMPORT_BLOCKED: ${rel}`);
        return { path: real };
      });
      build.onLoad({ filter: /\.(?:ts|js|mjs|json)$/ }, args => {
        const contents = fs.readFileSync(args.path, 'utf8');
        const relative = slash(path.relative(repo, args.path));
        sourceFiles.set(relative, createHash('sha256').update(contents.replaceAll('\r\n', '\n')).digest('hex'));
        return { contents, loader: args.path.endsWith('.json') ? 'json' : args.path.endsWith('.ts') ? 'ts' : 'js', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  return { code: result.outputFiles[0].text, sources: Object.fromEntries([...sourceFiles].sort()), entry, symbol };
}

export function verifyServiceSources(domain, sources) {
  const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'service-source-pins.json'), 'utf8'));
  if (JSON.stringify(pins.domains[domain]) !== JSON.stringify(sources)) throw new Error('SERVICE_SOURCE_CHANGED: review graph and pins before running');
  return pins.baseCommit;
}

const compiledBundles = new Map();
export async function evaluateBundle(code, input, referenceDate, options) {
  // Accidental I/O guard, not a security boundary for hostile source code.
  const epoch = Date.parse(`${referenceDate}T00:00:00Z`);
  const context = vm.createContext({ __inputJSON: JSON.stringify(input), __optionsJSON: JSON.stringify(options ?? null), __epoch: epoch }, { codeGeneration: { strings: false, wasm: false } });
  new vm.Script(`
    globalThis.__ioAttempts = 0;
    const deny = () => { __ioAttempts++; throw new Error('SERVICE_IO_BLOCKED'); };
    globalThis.fetch = deny; globalThis.WebSocket = deny; globalThis.XMLHttpRequest = deny;
    globalThis.setTimeout = deny; globalThis.setInterval = deny;
    const RealDate = Date;
    globalThis.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [__epoch])); }
      static now() { return __epoch; }
    };
    globalThis.console = { log() {}, warn() {}, error() {}, info() {} };
    globalThis.module = { exports: {} }; globalThis.exports = module.exports;
  `).runInContext(context, { timeout: 1000 });
  if (!compiledBundles.has(code)) compiledBundles.set(code, new vm.Script(code, { filename: 'read-only-adapter.cjs' }));
  compiledBundles.get(code).runInContext(context, { timeout: 10000 });
  await new vm.Script('globalThis.__result = module.exports.run(JSON.parse(__inputJSON), JSON.parse(__optionsJSON) ?? undefined); __result').runInContext(context, { timeout: 10000 });
  if (context.__ioAttempts) throw new Error('SERVICE_IO_BLOCKED');
  // Promise resolution and serialization remain in the isolated context.
  await new vm.Script('Promise.resolve(__result).then(value => { globalThis.__outputJSON = JSON.stringify(value); })').runInContext(context, { timeout: 10000 });
  return JSON.parse(context.__outputJSON);
}

export async function prepareServiceRunner(domain) {
  if (!Object.hasOwn(ENTRYPOINTS, domain)) throw new Error('SERVICE_DOMAIN_BLOCKED');
  const bundle = await buildAdapter(domain);
  verifyServiceSources(domain, bundle.sources);
  return input => runService(domain, input, bundle);
}

export async function runService(domain, input, preparedBundle) {
  if (BLOCKED.has(domain)) return envelope(`service:${domain}`, 'not-loaded', input, {
    status: 'blocked', reason: 'SWISS_CONNECTED_SERVICE_PATH', limitations: ['No import, bundle or engine execution was attempted.'],
  });
  if (!Object.hasOwn(ENTRYPOINTS, domain)) return unsupported(`service:${domain}`, 'not-loaded', input, 'No approved public adapter for this domain');
  checkOptions(input, []);
  if (input.place.utcOffsetMinutes != null) return unsupported(`service:${domain}`, 'not-loaded', input, 'Public adapter has no UTC offset override');
  if (domain === 'ziwei' && (input.timeUnknown || input.gender === 'unknown')) return unsupported('service:ziwei', 'not-loaded', input, 'Known birth time and gender required');
  if (domain === 'saju' && input.place.timezone !== 'Asia/Seoul') return unsupported('service:saju', 'not-loaded', input, 'Public adapter does not forward timezone');
  const bundle = preparedBundle ?? await buildAdapter(domain);
  const commit = verifyServiceSources(domain, bundle.sources);
  const adapterInput = domain === 'saju' ? {
    birthDate: input.date, birthTime: input.time ?? '', gender: input.gender,
    calendarType: input.calendar, lunarLeap: input.leapMonth,
  } : {
    birthDate: input.date, birthTime: input.time, hasBirthTime: true,
    calendarType: input.calendar, isLeapMonth: input.leapMonth, gender: input.gender,
    birthPlace: input.place, targetDate: input.referenceDate, topic: 'daily',
  };
  const raw = await evaluateBundle(bundle.code, adapterInput, input.referenceDate, domain === 'ziwei' ? { fusionExpert: true } : undefined);
  return envelope(`service:${domain}`, commit, input, {
    policy: { publicInterface: `${bundle.entry}::${bundle.symbol}`, referenceDate: input.referenceDate, kasiPrefetch: false,
      adapterInput, sourceFiles: bundle.sources },
    facts: domain === 'ziwei' ? { ziwei: raw.expertEvidence } : { pillars: normalizePillars(raw.pillars) },
    raw,
    limitations: domain === 'saju' ? ['computeNatalFromInput does not forward gender, location or timezone into its calculator. Major-luck output cannot verify the supplied gender.', 'No external KASI values were injected. Only this adapter surface was exercised.']
      : ['Public guardian projection, not all raw engine fields.', 'Existing service birth-clock and fallback policy retained.'],
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('USAGE: node service-runner.mjs <saju|ziwei|vedic|sukuyo|astrology>');
    process.env.TZ = 'UTC';
    const input = await readInput();
    blockNetwork();
    console.log(JSON.stringify(await runService(process.argv[2], input)));
  } catch (error) { console.log(JSON.stringify({ schemaVersion: 1, status: 'error', error: error.message })); process.exitCode = 1; }
}
