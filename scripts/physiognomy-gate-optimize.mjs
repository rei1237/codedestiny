// 관상 동물상 보너스/억제 임계값 재튜닝 하네스 (개발 전용 · 배포되지 않음)
//
// AnalysisEngine.js 의 축 가중치(6개)와 성별별 보너스/억제 사다리(217개 게이트 + 매그니튜드)는
// 전부 손으로 적힌 상수다. calibration/.measurements.json(실제 사진 157장의 랜드마크 캐시)을
// 바로 재생(physio:replay)해 적중률을 잴 수 있으므로, 그 수치를 목적함수로 삼아 국소 탐색으로
// 상수를 다시 찾는다. 코드 구조(if/else, crushList 등)는 건드리지 않고 숫자 리터럴만 바꾼다.
//
// 🔴 첫 시도(무제약 담금질)는 적중률만 올리고 임계값을 물리적으로 말이 안 되는 값(예: faceRatio
// <= 0.057, eyeSlant >= -0.352 처럼 실측 대역을 벗어나 항상/전혀 발화하지 않는 게이트)으로
// 무너뜨렸다 — 표본 157장에 과적합된 잡음일 뿐 일반화되는 개선이 아니었다. 그래서 두 가지를
// 강제한다: (1) 축 연동 임계값은 PHY_AXIS_CLAMP 실측 대역을 벗어날 수 없다, (2) 그 외 상수는
// "이번 탐색 전체 기준" 원래 값의 0.3~3배를 벗어날 수 없다(반복마다 원값을 다시 기준 삼지
// 않는다 — 안 그러면 수만 번 반복에 걸쳐 복리로 폭주한다). (3) 성별 분기 컷오프
// (femininityScore >= 40)는 성별 오버라이드 배선과 얽혀 있어 튜닝 대상에서 제외한다.
//
// 사용법: npm run physio:optimize -- --json=<calibration/.measurements.json 경로> [--iterations=4000]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const measPath = resolve(root, opt('json', 'calibration/.measurements.json'));
const iterations = Number(opt('iterations', 4000));
const seed = Number(opt('seed', 1));

if (!existsSync(measPath)) {
  console.error(`[physio-optimize] ${measPath} 가 없습니다. 먼저: npm run physio:measure`);
  process.exit(1);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(seed);

const enginePath = resolve(root, 'AnalysisEngine.js');
const publicEnginePath = resolve(root, 'public/AnalysisEngine.js');
const origSrc = readFileSync(enginePath, 'utf8');
const origLines = origSrc.split('\n');

// ── PHY_AXIS_CLAMP 를 소스에서 직접 읽는다 (손으로 다시 적으면 드리프트한다) ──
const clampBlock = /const PHY_AXIS_CLAMP = \{([\s\S]*?)\};/.exec(origSrc)[1];
const AXIS_CLAMP = {};
for (const m of clampBlock.matchAll(/(\w+):\s*\[(-?[\d.]+),\s*(-?[\d.]+)\]/g)) {
  AXIS_CLAMP[m[1]] = [parseFloat(m[2]), parseFloat(m[3])];
}
console.log('[physio-optimize] 축 대역(PHY_AXIS_CLAMP):', JSON.stringify(AXIS_CLAMP));

// archetypes 표(중심좌표)도 튜닝 대상에 포함한다. 재계측 median 값은 "그 동물상 사진들의
// 중앙값"일 뿐 "이 가중 거리식으로 27종을 가장 잘 가르는 좌표"라는 보장이 없다 — 실제로
// geoScore(기하 거리)만으로 본 라벨 랭킹이 이미 TOP3 54%였는데 보너스 사다리를 아무리
// 재튜닝해도 51~52%를 못 넘겼다(오히려 소폭 하락). 병목이 보너스가 아니라 중심좌표 자체라는
// 뜻이라 이번엔 같이 푼다.
const ARCHETYPE_REGION = [1472, 1533];
const REGIONS = [[1555, 1560], [1853, 2062], ARCHETYPE_REGION];
const AXIS_NAMES = Object.keys(AXIS_CLAMP);
const OP_RE = /(\*|<=|>=|\+=|-=)\s*(-?\d+\.?\d*)/g;
// 🔴 원래 (0\.\d+) 로 "0."으로 시작하는 값만 잡았는데, rate 파라미터가 상한 1.0 까지 튜닝
// 가능해서 값이 "1.0"이 되는 순간 재추출에서 통째로 사라졌다(실제로 겪은 버그) — 임의 소수를
// 받도록 넓힌다.
const MIN_RE = /Math\.min\((\d+\.?\d*),\s*(\d+\.?\d*)\s*\+/g;
// archetypes 표 전용: 'dog': { face: 0.838, slant: -1.6, ... } 형태는 <=/>=/+= 연산자가 아니라
// "key: value" 이므로 별도 패턴이 필요하다.
const ARCH_RE = /\b(face|slant|dist|nose|mouth|eye):\s*(-?\d+\.?\d*)/g;
const ARCH_KEY_TO_AXIS = { face: 'faceRatio', slant: 'eyeSlant', dist: 'eyeDistRatio', nose: 'noseWidthRatio', mouth: 'mouthRatio', eye: 'eyeRatio' };
const EXCLUDE_LINE_RE = /femininityScore/;

// param.kind: 'axis'(clamp=AXIS_CLAMP[axis]) | 'rate'(clamp=[0,1], 상대창도 적용) | 'magnitude'(상대창만)
function extractParams(lines) {
  const params = [];
  const seen = new Set();
  const push = (line, start, len, kind, axis) => {
    const key = `${line}:${start}`;
    if (seen.has(key)) return;
    seen.add(key);
    const text = lines[line].slice(start, start + len);
    params.push({ line, start, len, value: parseFloat(text), kind, axis });
  };
  for (const [from, to] of REGIONS) {
    for (let li = from; li <= to && li < lines.length; li++) {
      const line = lines[li];
      if (EXCLUDE_LINE_RE.test(line)) continue;
      let m;
      OP_RE.lastIndex = 0;
      while ((m = OP_RE.exec(line))) {
        const numStart = m.index + m[0].length - m[2].length;
        // 이 숫자 앞에 "features.AXIS 연산자" 가 있으면 축 연동 임계값으로 분류한다.
        let axis = null;
        const ctxBefore = line.slice(Math.max(0, m.index - 40), m.index) + m[1];
        const axisCtx = /features\.(\w+)\s*(?:<=|>=)\s*$/.exec(ctxBefore);
        if (axisCtx && AXIS_NAMES.includes(axisCtx[1])) axis = axisCtx[1];
        push(li, numStart, m[2].length, axis ? 'axis' : 'magnitude', axis);
      }
      MIN_RE.lastIndex = 0;
      while ((m = MIN_RE.exec(line))) {
        const idx1 = m.index + m[0].indexOf(m[1]);
        push(li, idx1, m[1].length, 'rate', null);
        const idx2 = m.index + m[0].lastIndexOf(m[2]);
        push(li, idx2, m[2].length, 'rate', null);
      }
      if (li >= ARCHETYPE_REGION[0] && li <= ARCHETYPE_REGION[1]) {
        ARCH_RE.lastIndex = 0;
        while ((m = ARCH_RE.exec(line))) {
          const numStart = m.index + m[0].length - m[2].length;
          push(li, numStart, m[2].length, 'axis', ARCH_KEY_TO_AXIS[m[1]]);
        }
      }
    }
  }
  return params;
}

const baseParams = extractParams(origLines);
console.log(`[physio-optimize] 튜닝 대상 숫자 리터럴 ${baseParams.length}개 (구간 ${REGIONS.map(r => r.join('-')).join(', ')}, femininityScore 컷오프 제외)`);
const axisCount = baseParams.filter((p) => p.kind === 'axis').length;
const rateCount = baseParams.filter((p) => p.kind === 'rate').length;
console.log(`  축 연동 임계값 ${axisCount}개 · 억제율 ${rateCount}개 · 그 외(가중치·매그니튜드) ${baseParams.length - axisCount - rateCount}개`);

// 원래 값 기준 절대 상한/하한을 (line, occurrence순서) 로 고정한다. 매 반복 re-extract 해도
// 같은 줄에서 같은 순서로 매치되므로 인덱스로 정렬하면 원본과 안정적으로 짝지어진다.
const boundsByIndex = baseParams.map((p) => {
  if (p.kind === 'axis') return AXIS_CLAMP[p.axis];
  const lo = p.value >= 0 ? p.value * 0.3 : p.value * 3;
  const hi = p.value >= 0 ? p.value * 3 : p.value * 0.3;
  if (p.kind === 'rate') return [Math.max(0, lo), Math.min(1, hi)];
  return [lo, hi];
});

function clamp(v, [lo, hi]) { return Math.max(lo, Math.min(hi, v)); }

function applyParam(lines, p, newValue) {
  const out = lines.slice();
  const line = out[p.line];
  // 정수 원본은 정수로, 소수 원본은 항상 소수점 뒤 최소 한 자리를 유지한 채로 적는다 — 끝자리를
  // 지우다 "1.0"이 "1"로 바뀌면 Math.min(0.95, ...) 같은 "0.으로 시작" 정규식이 재추출 때 그
  // 줄을 놓쳐서 파라미터 개수가 흔들린다(실제로 겪은 버그).
  let text;
  if (Number.isInteger(p.value)) {
    text = String(Math.round(newValue));
  } else {
    text = newValue.toFixed(4).replace(/0+$/, '');
    if (text.endsWith('.')) text += '0';
  }
  out[p.line] = line.slice(0, p.start) + text + line.slice(p.start + p.len);
  return out;
}

function mutate(value, bounds) {
  const span = bounds[1] - bounds[0];
  const step = Math.max(span * 0.06, 0.01);
  const next = value + (rand() * 2 - 1) * step;
  return Math.round(clamp(next, bounds) * 1000) / 1000;
}

// ── else-if 사슬 순서 복구 ──
// 임계값을 서로 독립적으로 담금질하면 같은 축을 보는 if/else-if 사슬의 상대 순서가 뒤집혀
// 뒤쪽 분기가 영영 발화 못 하는 죽은 코드가 생긴다(실측: 19곳). 같은 축·같은 연산자로 이어지는
// 연속된 if/else-if 사슬을 찾아 임계값 기준으로 재정렬한다 — 보너스 값·임계값의 짝, 딸린
// 주석은 그대로 이동시키고 발화 순서만 바로잡는다.
const CHAIN_LINE_RE = /^(\s*)(if|else if) \(features\.(\w+) (<=|>=) (-?[\d.]+)\) bonus \+= ([\d.]+);(.*)$/;

function repairChains(lines) {
  const out = lines.slice();
  for (const [from, to] of REGIONS) {
    let li = from;
    while (li <= to && li < out.length) {
      const m = CHAIN_LINE_RE.exec(out[li]);
      if (!m || m[2] !== 'if') { li++; continue; }
      const axis = m[3], op = m[4];
      const chain = [{ line: li, indent: m[1], threshold: parseFloat(m[5]), bonus: m[6], tail: m[7] }];
      let j = li + 1;
      while (j <= to && j < out.length) {
        const mj = CHAIN_LINE_RE.exec(out[j]);
        if (!mj || mj[2] !== 'else if' || mj[3] !== axis || mj[4] !== op) break;
        chain.push({ line: j, indent: mj[1], threshold: parseFloat(mj[5]), bonus: mj[6], tail: mj[7] });
        j++;
      }
      if (chain.length >= 2) {
        const sorted = chain.slice().sort((a, b) => (op === '<=' ? a.threshold - b.threshold : b.threshold - a.threshold));
        chain.forEach((slot, idx) => {
          const src = sorted[idx];
          const kw = idx === 0 ? 'if' : 'else if';
          out[slot.line] = `${slot.indent}${kw} (features.${axis} ${op} ${src.threshold}) bonus += ${src.bonus};${src.tail}`;
        });
      }
      li = j;
    }
  }
  return out;
}

const dom = new JSDOM('<!doctype html><body></body>');
function loadEngine(src) {
  const engine = new Function('window', 'document', src + '\nreturn window.faceAnalysisEngine;')(dom.window, dom.window.document);
  if (!engine || typeof engine.analyze !== 'function') throw new Error('engine load failed');
  return engine;
}

const { rows } = JSON.parse(readFileSync(measPath, 'utf8'));
const samples = rows.filter((r) => r.label && r.label !== '(라벨없음)' && Array.isArray(r.landmarks))
  .map((r) => ({ label: r.label, aspect: r.aspect ?? 1, landmarks: r.landmarks.map(([x, y, z]) => ({ x, y, z })) }));
console.log(`[physio-optimize] 평가 표본 ${samples.length}장`);

const norm = (s) => String(s || '').replace(/상$/, '');

async function evaluate(src) {
  let engine;
  try { engine = loadEngine(src); } catch { return null; }
  await engine.loadDatabase();
  const results = [];
  for (const s of samples) {
    let out;
    try { out = await engine.analyze(s.landmarks, null, s.aspect); } catch { return null; }
    results.push({ label: s.label, winner: out.primaryAnimal, top3: (out.top3 || []).map((t) => t.animal.name) });
  }
  const n = results.length;
  const top1 = results.filter((r) => norm(r.winner) === norm(r.label)).length;
  const top3 = results.filter((r) => r.top3.some((t) => norm(t) === norm(r.label))).length;
  const wins = {};
  results.forEach((r) => { wins[r.winner] = (wins[r.winner] || 0) + 1; });
  const reached = Object.keys(wins).length;
  const topCount = Math.max(...Object.values(wins));
  const concentration = topCount / n;
  const snakeTop3 = results.filter((r) => r.label === '뱀상' && r.top3.some((t) => norm(t) === '뱀')).length;
  return { top1, top3, reached, concentration, snakeTop3, n };
}

function objective(m) {
  if (!m) return -Infinity;
  if (m.concentration > 0.20) return -Infinity;
  if (m.reached < 15) return -Infinity;
  if (m.snakeTop3 < 5) return -Infinity;
  return m.top1 * 3 + m.top3;
}

const baseMetrics = await evaluate(origSrc);
const baseObjective = objective(baseMetrics);
console.log('[physio-optimize] 시작점:', JSON.stringify(baseMetrics));

let bestLines = origLines;
let bestObjective = baseObjective;
let bestMetrics = baseMetrics;
let curLines = origLines;
let curObjective = baseObjective;

const T0 = 6, T1 = 0.05;
const startedAt = Date.now();
let accepted = 0;
let rejectedOutOfBounds = 0;

for (let iter = 0; iter < iterations; iter++) {
  const curParams = extractParams(curLines);
  if (curParams.length !== baseParams.length) {
    // 방어적 처리: 서식 변환 경계 사례로 매치가 흔들리면 이번 반복만 건너뛴다(전체 중단 금지).
    rejectedOutOfBounds++;
    continue;
  }
  const idx = Math.floor(rand() * curParams.length);
  const p = curParams[idx];
  const bounds = boundsByIndex[idx];
  const newValue = mutate(p.value, bounds);
  const candLines = applyParam(curLines, p, newValue);
  const candSrc = candLines.join('\n');
  const m = await evaluate(candSrc);
  const o = objective(m);

  const T = T0 * Math.pow(T1 / T0, iter / iterations);
  const delta = o - curObjective;
  const accept = delta >= 0 || rand() < Math.exp(delta / T);
  if (accept && o > -Infinity) {
    curLines = candLines;
    curObjective = o;
    accepted++;
    if (o > bestObjective) {
      bestObjective = o;
      bestLines = candLines;
      bestMetrics = m;
    }
  }
  if ((iter + 1) % 500 === 0) {
    console.log(`  iter ${iter + 1}/${iterations}  cur=${curObjective.toFixed(1)}  best=${bestObjective.toFixed(1)} (top1=${bestMetrics.top1} top3=${bestMetrics.top3} reached=${bestMetrics.reached})  accept=${accepted}  fmt오류=${rejectedOutOfBounds}  ${((Date.now() - startedAt) / 1000).toFixed(0)}s`);
  }
}

console.log('\n[physio-optimize] 담금질 완료');
console.log('시작:', JSON.stringify(baseMetrics));
console.log('담금질 직후:', JSON.stringify(bestMetrics));

const repairedLines = repairChains(bestLines);
const repairedMetrics = await evaluate(repairedLines.join('\n'));
const repairedObjective = objective(repairedMetrics);
console.log('사슬 복구 후:', JSON.stringify(repairedMetrics));

let finalLines = bestLines, finalMetrics = bestMetrics;
if (repairedObjective >= bestObjective) {
  finalLines = repairedLines;
  finalMetrics = repairedMetrics;
} else {
  console.log('[physio-optimize] 사슬 복구가 회귀 가드 기준으로 성능을 낮춰 복구 전 상태를 그대로 씁니다');
}

const outSrc = finalLines.join('\n');
writeFileSync(enginePath, outSrc, 'utf8');
writeFileSync(publicEnginePath, outSrc, 'utf8');
console.log('최종 반영:', JSON.stringify(finalMetrics));
console.log(`[physio-optimize] AnalysisEngine.js / public/AnalysisEngine.js 갱신 완료 (${((Date.now() - startedAt) / 1000).toFixed(0)}s, 채택 ${accepted}/${iterations})`);
