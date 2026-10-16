import fs from 'node:fs';
import ts from 'typescript';
// Bundles the paid saju summary/daewun/quantum/extreme-T/sukuyo-encyclopedia/energy/villain/health renderers (worker/lib/saju-section/*.src.js) with the
// shell helpers they call, copied verbatim from the browser sources. No formula is edited here:
// --check fails when js/saju-engine.js, the tarot-chunk helpers, the entertain-engine helpers, the personas copy table
// or the KASI service drift.
const OUT = 'worker/lib/saju-section/runtime.generated.mjs';
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const parse = (file, text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const iifeBody = (ast) => { let body; (function find(n) { if (body) return; if (ts.isFunctionExpression(n)) { body = n.body; return; } ts.forEachChild(n, find); })(ast); return body.statements; };
function ownNames(n) {
  if (ts.isFunctionDeclaration(n) && n.name) return [n.name.text];
  if (ts.isVariableStatement(n)) return n.declarationList.declarations.filter(d => ts.isIdentifier(d.name)).map(d => d.name.text);
  return [];
}
function refs(node) {
  const out = new Set();
  (function visit(n) {
    if (ts.isIdentifier(n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n)) out.add(n.text);
    ts.forEachChild(n, visit);
  })(node);
  return out;
}
// Top-level `NAME = ...` statements (ENERGY_COORD_DB is rebuilt from the destination table after its declaration).
function assignedName(n) {
  return ts.isExpressionStatement(n) && ts.isBinaryExpression(n.expression) && n.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.expression.left) ? n.expression.left.text : '';
}
// Returns the statements (source order, verbatim) that `startRefs` need from `statements`.
function closure(ast, statements, startRefs, stop) {
  const byName = new Map(); const reassigned = new Map();
  for (const n of statements) {
    for (const k of ownNames(n)) byName.set(k, n);
    const k = assignedName(n); if (k) reassigned.set(k, [...(reassigned.get(k) || []), n]);
  }
  const picked = new Set(); const queue = [...startRefs];
  while (queue.length) {
    const k = queue.pop(); const n = byName.get(k);
    if (!n || stop.has(k) || picked.has(n)) continue;
    for (const m of [n, ...(reassigned.get(k) || [])]) { picked.add(m); for (const r of refs(m)) queue.push(r); }
  }
  return statements.filter(n => picked.has(n)).map(n => n.getText(ast));
}
const declared = (ast) => new Set(ast.statements.flatMap(ownNames));

const paidPath = 'worker/lib/saju-section/paid-renderers.src.js';
const cyclePath = 'worker/lib/saju-section/paid-cycle.src.js';
const paidSrc = read(paidPath); const paidAst = parse(paidPath, paidSrc);
const cycleSrc = read(cyclePath); const cycleAst = parse(cyclePath, cycleSrc);
const quantumPath = 'worker/lib/saju-section/paid-quantum.src.js';
const quantumSrc = read(quantumPath); const quantumAst = parse(quantumPath, quantumSrc);
// 극T 관계 회로 유료 패널: 자기 IIFE 안에서 w.GAN·w.JI·w.getTenGod 만 바깥에서 읽는다.
const extremeTPath = 'worker/lib/saju-section/paid-extreme-t.src.js';
const extremeTSrc = read(extremeTPath);
// 유료 문장의 다국어 번역은 public/i18n 에 두지 않는다(정적 파일은 누구나 받는다) — 서버 전용 사본에서 읽는다.
const extremeTI18n = JSON.parse(read('worker/lib/saju-section/paid-extreme-t.i18n.json'));
// 숙요 인연 도감 27숙 전체: 타로 파일의 숙요 헬퍼(27숙 표·관계 엔진)를 아래 tarot 클로저로 함께 가져온다.
const encyclopediaPath = 'worker/lib/saju-section/paid-encyclopedia.src.js';
const encyclopediaSrc = read(encyclopediaPath); const encyclopediaAst = parse(encyclopediaPath, encyclopediaSrc);
const energyPath = 'worker/lib/saju-section/paid-energy.src.js';
const energySrc = read(energyPath); const energyAst = parse(energyPath, energySrc);
const villainPath = 'worker/lib/saju-section/paid-villain.src.js';
const villainSrc = read(villainPath); const villainAst = parse(villainPath, villainSrc);
const healthPath = 'worker/lib/saju-section/paid-health.src.js';
const healthSrc = read(healthPath); const healthAst = parse(healthPath, healthSrc);
const paidNames = declared(paidAst); const cycleNames = declared(cycleAst); const quantumNames = declared(quantumAst); const encyclopediaNames = declared(encyclopediaAst); const energyNames = declared(energyAst); const villainNames = declared(villainAst); const healthNames = declared(healthAst);

// The quantum/energy cards' ganji/fortune/text helpers live in the tarot chunk. Its copy table is trimmed to
// the keys the cards use (the rest is other cards' copy); every other statement is verbatim.
const tarotAst = parse('saju-engine-tarot-sukuyo-quantum.js', read('js/saju-engine-tarot-sukuyo-quantum.js'));
const Q_TEXT = 'SAJU_QUANTUM_TEXT_TRANSLATIONS';
const tarotPicked = closure(tarotAst, tarotAst.statements, [...refs(quantumAst), ...refs(encyclopediaAst), ...refs(energyAst)], new Set([...quantumNames, ...encyclopediaNames, ...energyNames, Q_TEXT]));
const tarotNames = new Set(tarotPicked.flatMap(t => [...declared(parse('t.js', t))]));
const Q_KEYS = [...new Set([quantumSrc, encyclopediaSrc, energySrc, ...tarotPicked].join('\n').match(/_sajuQuantumText\("([^"]+)"\)/g).map(m => m.slice(18, -2)))].sort();
const qTextNode = tarotAst.statements.find(n => ownNames(n).includes(Q_TEXT));
const qTextKo = new Function(`return (${qTextNode.declarationList.declarations[0].initializer.getText(tarotAst)});`)().ko;
for (const k of Q_KEYS) if (!qTextKo[k]) throw new Error(`Missing quantum text: ${k}`);
const ET_KEYS = [...new Set(extremeTSrc.match(/_extremeTText\("([^"]+)"\)/g).map(m => m.slice(15, -2)))].sort();
const qText = `var ${Q_TEXT} = ${JSON.stringify({ ko: Object.fromEntries(Q_KEYS.map(k => [k, qTextKo[k]])) })};`;

const engineAst = parse('saju-engine.js', read('js/saju-engine.js'));
const SEEDS = ['GENDER', 'USER_NAME', 'BIRTH_YEAR', 'DAY_GAN', 'JOHU_TYPE', 'JOHU_SCORE', 'CURRENT_AGE', 'G_POWER', 'G_JONG', 'G_JOHU', 'G_PILLARS', 'G_NATAL', 'G_BAZI'];
const SERVER_ROOTS = ['attachKasiDaewunBridge', '_sajuDaewunRowsFromList', '_sajuApplyJongDecision', 'resetEvalDaewunMemo', 'parseKasiGanjiPair', 'GAN', 'JI', 'getTenGod', 'SHENG', ...SEEDS];
const shellRoots = [...refs(paidAst), ...refs(quantumAst), ...refs(energyAst), ...refs(villainAst), ...tarotPicked.flatMap(t => [...refs(parse('t.js', t))]), ...SERVER_ROOTS];
const shared = closure(engineAst, engineAst.statements, shellRoots, new Set([...paidNames, ...quantumNames, ...encyclopediaNames, ...energyNames, ...villainNames, ...tarotNames]));
const sharedNames = new Set(shared.flatMap(t => [...declared(parse('s.js', t))]));
for (const k of SERVER_ROOTS) if (!sharedNames.has(k)) throw new Error(`Missing shell declaration: ${k}`);

const personasAst = parse('reading-personas.js', read('js/core/saju/reading-personas.js'));
const personas = closure(personasAst, iifeBody(personasAst), refs(cycleAst), cycleNames);
const kasiAst = parse('kasi-calendar-service.js', read('js/core/kasi-calendar-service.js'));
const kasi = closure(kasiAst, iifeBody(kasiAst), ['_computeGanjiFromParts', '_clone'], new Set());
// The health card lives inside the js/entertain-engine.js IIFE. Its text helpers and element labels come along; the copy
// table is trimmed to the keys the health block and those helpers use (other entertain cards stay in the browser).
const entAst = parse('entertain-engine.js', read('js/entertain-engine.js'));
const EE_TEXT = 'ENTERTAIN_ENGINE_TEXT_TRANSLATIONS';
const entPicked = closure(entAst, iifeBody(entAst), refs(healthAst), new Set([...healthNames, EE_TEXT]));
const EE_KEYS = [...new Set([healthSrc, ...entPicked].join('\n').match(/_entertainText\("([^"]+)"\)/g).map(m => m.slice(16, -2)))].sort();
const eeTextNode = iifeBody(entAst).find(n => ownNames(n).includes(EE_TEXT));
const eeTextKo = new Function(`return (${eeTextNode.declarationList.declarations[0].initializer.getText(entAst)});`)().ko;
for (const k of EE_KEYS) if (!eeTextKo[k]) throw new Error(`Missing entertain text: ${k}`);
const eeText = `var ${EE_TEXT} = ${JSON.stringify({ ko: Object.fromEntries(EE_KEYS.map(k => [k, eeTextKo[k]])) })};`;

// Every bundled body may call _sajuEngineText (the quantum card's daewun notes come from shell helpers).
const I18N_KEYS = [...new Set([paidSrc, quantumSrc, energySrc, villainSrc, ...shared, ...tarotPicked].join('\n').match(/_sajuEngineText\("([^"]+)"\)/g).map(m => m.slice(17, -2)))].sort();
const i18n = {};
for (const file of fs.readdirSync('public/i18n').filter(f => f.endsWith('.json')).sort()) {
  const json = JSON.parse(fs.readFileSync(`public/i18n/${file}`, 'utf8'));
  const table = json.sajuEngine || {}; const qTable = json.sajuQuantum || {}; const etTable = extremeTI18n[file.slice(0, -5)] || {}; const eeTable = json.entertainEngine || {};
  i18n[file.slice(0, -5)] = Object.fromEntries([...I18N_KEYS.map(k => [k, table[k] || '']), ...Q_KEYS.map(k => [`sajuQuantum.${k}`, qTable[k] || '']), ...ET_KEYS.map(k => [`extremeT.${k}`, etTable[k] || '']), ...EE_KEYS.map(k => [`entertainEngine.${k}`, eeTable[k] || ''])]);
}
// Bodies are pasted unindented: re-indenting would change multi-line string literals.
const text = `// Generated by scripts/extract-saju-section-runtime.mjs — do not edit. Paid renderers live in
// worker/lib/saju-section/paid-*.src.js; shell helpers are copied verbatim from the browser sources.
// ctx.now (a Date) is the request time the quantum/energy/health cards read instead of Date.now().
// ctx.setTimeout lets the server run the energy roulette's 520ms result step synchronously.
import * as KoreanCalendar from '../../../lib/korean-calendar/index.js';
import * as SajuReadingDepth from '../../../lib/saju/reading-depth.mjs';

const I18N = ${JSON.stringify(i18n)};

// Every call builds fresh shell globals, so no request sees another request's chart.
export function createSajuSectionRuntime(ctx) {
  const window = ctx.window, document = ctx.document, localStorage = ctx.localStorage;
  const setTimeout = ctx.setTimeout || globalThis.setTimeout;
  var NEO_MODE = !!ctx.neo;
  window.KoreanCalendar = KoreanCalendar;
  window.SajuReadingDepth = SajuReadingDepth;
  window.cdTranslate = function (key) {
    var table = I18N[String(ctx.lang || 'ko').toLowerCase()] || {};
    return table[String(key).replace(/^sajuEngine\\./, '')] || 'Translation pending';
  };
  window.KasiCalendarService = (function (w) {
    'use strict';
${kasi.join('\n')}
    return { computeGanjiFromParts: function (parts, terms, options) { return _clone(_computeGanjiFromParts(parts, terms, options)); } };
  })(window);
  window.SajuReadingPresentation = (function (root) {
    'use strict';
${personas.join('\n')}
${cycleSrc.trim()}
    return { buildCycle: buildCycle, cycleMarkup: cycleMarkup };
  })(window);

  // ── js/saju-engine.js shell helpers ──
${shared.join('\n')}

  // ── js/saju-engine-tarot-sukuyo-quantum.js helpers (quantum copy table trimmed to the cards' keys) ──
${qText}
${tarotPicked.join('\n')}

  // ── paid renderers ──
${paidSrc.trim()}

  // ── paid quantum card ──
${quantumSrc.trim()}

  // ── paid extreme-T relationship panels ──
  window.GAN = GAN; window.JI = JI; window.getTenGod = getTenGod;
${extremeTSrc.trim()}

  // ── paid sukuyo relationship encyclopedia ──
${encyclopediaSrc.trim()}

  // ── paid energy card ──
${energySrc.trim()}

  // ── paid villain card ──
${villainSrc.trim()}

  // ── paid health card: js/entertain-engine.js IIFE helpers (copy table trimmed) + the health block ──
  (function (w) {
    'use strict';
${eeText}
${entPicked.join('\n')}
${healthSrc.trim()}
  })(window);

  return {
    renderSummary: renderSummary,
    buildDaewunDetailHtml: buildDaewunDetailHtml,
    renderQuantumStrategy: renderQuantumStrategy,
    renderExtremeTPaidPanels: window.renderExtremeTPaidPanels,
    renderSukuyoEncyclopediaPaid: renderSukuyoEncyclopediaPaid,
    renderEnergyCoord: renderEnergyCoord,
    renderVillain: renderVillain,
    renderHealthReport: window.renderHealthReport,
    attachKasiDaewunBridge: attachKasiDaewunBridge,
    daewunRows: _sajuDaewunRowsFromList,
    applyJongDecision: _sajuApplyJongDecision,
    parsePillar: parseKasiGanjiPair,
    GAN: GAN,
    JI: JI,
    SHENG: SHENG,
    window: window,
    seed: function (state) {
${SEEDS.map(k => `      if ('${k}' in state) ${k} = state.${k};`).join('\n')}
      resetEvalDaewunMemo();
    }
  };
}
`;
if (process.argv.includes('--write')) {
  fs.writeFileSync(OUT, text);
  console.log(`Wrote ${OUT}: ${shared.length} shell + ${tarotPicked.length} tarot + ${entPicked.length} entertain + ${kasi.length} KASI + ${personas.length} personas statements, ${paidNames.size + quantumNames.size + encyclopediaNames.size + energyNames.size + villainNames.size + healthNames.size} paid declarations.`);
} else {
  if (read(OUT) !== text) throw new Error('Saju section runtime drift: run node scripts/extract-saju-section-runtime.mjs --write');
  console.log(`PASS saju section runtime matches its sources (${shared.length} shell statements).`);
}
