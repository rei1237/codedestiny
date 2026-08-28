#!/usr/bin/env node
/**
 * `getGanjiFromParts` **null 전환 영향 측정기** — 측정 전용. 소스도 픽스처도 고치지 않는다.
 *
 * 실행: npm run measure:ganji-null-transition
 *
 * ── 무엇을 재는가 ──────────────────────────────────────────────────────────
 *
 * 셸의 `KasiEngine.getGanjiFromParts` 는 지금 **1990년 말고 전부 `null`** 이다(실측).
 * terms 없이 부르는 갈래가 서비스의 검증캐시(`_VALIDATED_SOLAR_TERMS_BY_YEAR`)만 보는데
 * 거기에 1990 한 해뿐이라 `_countMonthBoundaryTerms < 12` 로 떨어지기 때문이다.
 * 알려진 결함이고, 고치는 것은 이 스크립트의 일이 아니다.
 *
 * 🔴 위험은 고치는 순간에 있다(계획 §7 R1): 그 표면이 **답하기 시작하면 호출부가 한꺼번에**
 * 절기 프레임을 갈아탄다. 호출부 대부분이 `_coreEightChar`(한국 음양력 코어)로 계산해 둔
 * 기둥을 `_gj` 가 있을 때만 **덮어쓰는** 모양이라, null 이 값이 되는 순간 화면의 세차·월건·
 * 일진·시간이 통째로 다른 축으로 바뀔 수 있다. 그 폭이 얼마인지는 아무도 재 본 적이 없다.
 * 이 스크립트가 그 숫자다.
 *
 *   축 A  표면 3벌의 **전환 지도** — null→값 / 값→같은 값 / 값→다른 값 / 값→null
 *   축 B  전환된 값이 **지금 화면의 값(`_coreEightChar`)과 다른가** — 기둥 4축 각각
 *   축 C  다른 행의 **분포** — 표본 갈래별 · 해별
 *
 * ── 어떻게 흉내 내는가 ─────────────────────────────────────────────────────
 *
 * 🔴 야자시 시프트를 여기서 **베끼지 않는다.** 검증캐시가 전 해를 덮는 상태를 만들기 위해
 * `KasiCalendarService.computeGanjiFromParts` 를 감싸 terms 를 안 받은 호출에만 코어 절기표를
 * 채워 넣고, 진입점은 **프로덕션 코드 그대로**(`KasiEngine.getGanjiFromParts`) 부른다.
 * 엔진이 `window.KasiCalendarService` 를 호출 시점에 찾으므로 이 래핑이 그대로 먹는다.
 * 그래서 23시대 하루 밀기·시주 조립 같은 규약이 사본이 아니라 원본으로 측정된다.
 *
 * 코어 절기표는 서비스의 `_fallbackSolarTerms` 와 같은 모양이다(scripts/lib/ganji-samples.mjs
 * 의 `coreTermRows`) — 즉 이 시뮬레이션은 "검증캐시를 코어 표로 채웠을 때"를 잰다.
 * 🔴 KASI 실응답으로 채우는 경우는 **이것과 다를 수 있다** — 1990 한 해에서 코어와 검증캐시가
 * 최대 1분 다르다(실측 2026-08-27). 그 차이의 크기도 축 A 의 "값→다른 값" 이 잰다.
 *
 * ── 한계 (부정 단언 금지) ──────────────────────────────────────────────────
 *
 * · 표본은 `verify:ganji-surface-parity` 와 **같은 생성기**를 쓴다. 절기·야자시·설날·윤달·
 *   서머타임 구멍에 집중된 목록이라 **일반 인구 분포가 아니다**. "몇 %의 사용자"로 읽지 말 것.
 * · 화면 도달 여부는 여기서 안 잰다 — 호출부가 그 값을 실제로 쓰는지는 소스 재고이며
 *   docs/handoff/ganji-wallclock-parts-migration.md 의 PR-5 절 표에 있다.
 */

// 🔴 다른 import 보다 먼저. Node 는 존 데이터를 처음 쓸 때 캐시하므로 핀이 늦으면 안 먹는다.
import { pinTimezone } from "./lib/kst-clock.mjs";

const PINNED = pinTimezone("Asia/Seoul");

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  buildSamples, cacheYearsFrom, coreTermRows, sampleYears,
} from "./lib/ganji-samples.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = "scripts/fixtures/ganji-surface-kst.json";

const problems = [];
function need(label, passed, detail) {
  if (passed) return true;
  problems.push(`${label}${detail ? ` — ${detail}` : ""}`);
  return false;
}

// ── 셸 로드 ────────────────────────────────────────────────────────────────
const harness = require(path.join(root, "scripts/lib/shell-ganji-harness.cjs"));
const win = harness.loadShell(harness.SHELL_CHAIN);
const core = win.KoreanCalendar;
const svc = win.KasiCalendarService;
const eng = win.KasiEngine;

const termCache = new Map();
function termsFor(year) {
  if (!termCache.has(year)) termCache.set(year, coreTermRows(core, year));
  return termCache.get(year);
}

// ── 표본 — 회귀 증명기와 **같은 생성기** ───────────────────────────────────
const CACHE_YEARS = cacheYearsFrom(svc);
const YEARS = sampleYears(CACHE_YEARS.used);
const SAMPLES = buildSamples(core, YEARS);

/**
 * 검증캐시가 전 해를 덮는 상태를 만든다. 🔴 terms 를 **안 받은 호출에만** 채운다 —
 * 호출자가 준 terms 를 덮으면 그것은 다른 실험이 된다.
 */
function withFilledCache(run) {
  const real = svc.computeGanjiFromParts;
  svc.computeGanjiFromParts = function (parts, terms) {
    if (terms && terms.length) return real.call(svc, parts, terms);
    const year = parts && parts.year;
    if (!year || year < 1900 || year > 2100) return real.call(svc, parts, terms);
    return real.call(svc, parts, termsFor(year));
  };
  try { return run(); } finally { svc.computeGanjiFromParts = real; }
}

// ── 투영기 ─────────────────────────────────────────────────────────────────
const P = (o, ...keys) => {
  if (!o || typeof o !== "object") return null;
  for (const k of keys) if (o[k]) return String(o[k]);
  return null;
};
/** 네 기둥을 `세차/월건/일진/시간` 으로 편다. 엔진(`secha`…)과 서비스(`year`…) 두 이름을 모두 읽는다. */
const pillars = (o) => (o
  ? [P(o, "secha", "year"), P(o, "weolgeon", "month"), P(o, "iljin", "day"), P(o, "sigan", "hour")]
  : null);
const joinP = (arr) => (arr ? arr.map((v) => v || "").join("/") : null);

const SURFACES = Object.freeze([
  ["getGanjiFromParts", (p) => pillars(eng.getGanjiFromParts(p))],
  ["getGanjiFromParts:noYaja", (p) => pillars(eng.getGanjiFromParts(p, { yaja: false }))],
  ["computeGanjiFromParts:noTerms", (p) => pillars(svc.computeGanjiFromParts(p))],
]);

/** 지금 화면에 있는 값 — 호출부 6곳이 덮이기 **전에** 계산해 두는 것이 이것이다. */
function corePillars(at) {
  try {
    const bazi = win._coreEightChar(at.year, at.month, at.day, at.hour, at.minute);
    return [bazi.getYear(), bazi.getMonth(), bazi.getDay(), bazi.getTime()];
  } catch { return null; }
}

const partsOf = (at) => ({ year: at.year, month: at.month, day: at.day, hour: at.hour, minute: at.minute, second: 0 });
const safe = (fn) => { try { return fn(); } catch { return null; } };

// ── ⓪ 전제 자기검사 — 깨져 있으면 아래 숫자는 전부 무의미하다 ─────────────
need(`⓪ 러너 타임존이 Asia/Seoul 로 고정됐다`, PINNED.tz === "Asia/Seoul" && PINNED.offsetMinutes === -540,
  `tz=${PINNED.tz} offset=${PINNED.offsetMinutes}`);
need("⓪ 표본을 실제로 만들었다", SAMPLES.length >= 600, `${SAMPLES.length}건`);
{
  const kinds = new Set(SAMPLES.map((s) => s.kind));
  need("⓪ 표본 갈래가 6종 전부 있다", ["term", "yaja", "newyear", "seollal", "leap", "dst-gap"].every((k) => kinds.has(k)),
    [...kinds].join(","));
}
{
  // 🔴 회귀 증명기의 픽스처와 **같은 표본**인지 못박는다. 어긋나면 이 측정값은 그 픽스처의
  //    어느 행과도 대응하지 않아 근거가 되지 못한다.
  let fixture = null;
  try { fixture = JSON.parse(fs.readFileSync(path.join(root, FIXTURE), "utf8")); } catch {}
  need(`⓪ 표본 수가 ${FIXTURE} 와 같다`, !!fixture && fixture.sampleCount === SAMPLES.length,
    `픽스처 ${fixture && fixture.sampleCount} / 지금 ${SAMPLES.length}`);
}
{
  // 🔴 이 측정의 전제 그 자체 — 지금은 캐시 밖 해가 null 이고, 시뮬레이션에서는 답한다.
  //    2000년은 검증캐시에 없다(위 cacheYearsFrom 이 그것을 실측으로 확인해 준다).
  const probe = { year: 2000, month: 6, day: 15, hour: 12, minute: 0, second: 0 };
  const before = safe(() => eng.getGanjiFromParts(probe));
  const during = withFilledCache(() => safe(() => eng.getGanjiFromParts(probe)));
  const after = safe(() => eng.getGanjiFromParts(probe));
  need("⓪ 🔴 캐시 밖 해가 지금은 null 이다(아니면 결함이 이미 고쳐진 것이라 이 측정은 낡았다)",
    !before && !CACHE_YEARS.all.includes(2000), `2000년 → ${JSON.stringify(before)}`);
  need("⓪ 🔴 시뮬레이션이 실제로 먹는다(안 먹으면 아래 전환 0 은 침묵이지 측정이 아니다)",
    !!during, `2000년 시뮬레이션 → ${JSON.stringify(during)}`);
  need("⓪ 시뮬레이션이 원상복구된다", !after, `복구 후 2000년 → ${JSON.stringify(after)}`);
}

if (problems.length) {
  console.error(`[measure:ganji-null-transition] 전제가 깨졌다 — ${problems.length}건`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

// ── 측정 ───────────────────────────────────────────────────────────────────
const CLASSES = ["null→null", "null→값", "값→같은 값", "값→다른 값", "값→null"];
const stats = new Map(SURFACES.map(([name]) => [name, {
  counts: Object.fromEntries(CLASSES.map((c) => [c, 0])),
  changed: [],
}]));

/** 축 B — 전환된 값 vs 코어 기둥. 기둥 4축을 따로 센다. */
const AXES = ["세차", "월건", "일진", "시간"];
const vsCore = new Map([["getGanjiFromParts", null], ["getGanjiFromParts:noYaja", null]]
  .map(([name]) => [name, {
    compared: 0,
    mismatch: Object.fromEntries(AXES.map((a) => [a, 0])),
    rows: [],
    // 🔴 원인을 두 축으로 가른다. 23시대 행은 **야자시 규약의 차이**이고(엔진은 부품 전체를
    //    하루 밀어 節 프레임까지 움직이는데 코어는 일진만 민다), 그 밖의 행이 있다면 그것이
    //    비로소 **절기표 차이**다. 섞어 세면 둘 다 못 고친다.
    night: 0,
    day: 0,
    byKind: new Map(),
    byYear: new Map(),
  }]));

const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1);

for (const sample of SAMPLES) {
  const at = sample.at;
  const now = SURFACES.map(([, fn]) => safe(() => fn(partsOf(at))));
  const then = withFilledCache(() => SURFACES.map(([, fn]) => safe(() => fn(partsOf(at)))));

  SURFACES.forEach(([name], i) => {
    const a = joinP(now[i]);
    const b = joinP(then[i]);
    const st = stats.get(name);
    if (!a && !b) st.counts["null→null"] += 1;
    else if (!a && b) st.counts["null→값"] += 1;
    else if (a && !b) st.counts["값→null"] += 1;
    else if (a === b) st.counts["값→같은 값"] += 1;
    else {
      st.counts["값→다른 값"] += 1;
      st.changed.push(`${sample.key} [${sample.kind}]  ${a}  →  ${b}`);
    }
  });

  const cp = corePillars(at);
  if (!cp) continue;
  for (const name of vsCore.keys()) {
    const idx = SURFACES.findIndex(([n]) => n === name);
    const t = then[idx];
    if (!t) continue;
    const v = vsCore.get(name);
    v.compared += 1;
    const diffAxes = AXES.filter((_, i) => (t[i] || "") !== (cp[i] || ""));
    if (!diffAxes.length) continue;
    for (const ax of diffAxes) v.mismatch[ax] += 1;
    if (at.hour >= 23) v.night += 1; else v.day += 1;
    bump(v.byKind, sample.kind);
    bump(v.byYear, at.year);
    v.rows.push(`${sample.key} [${sample.kind}]  코어 ${cp.join("/")}  →  전환 ${t.map((x) => x || "").join("/")}  (${diffAxes.join(",")})`);
  }
}

// ── 보고 ───────────────────────────────────────────────────────────────────
const EXAMPLES = 10;
const pct = (n) => `${((n / SAMPLES.length) * 100).toFixed(1)}%`;

console.log(`[measure:ganji-null-transition] TZ=${PINNED.tz} · 표본 ${SAMPLES.length}건`
  + ` · 표본 해 ${YEARS.join(",")} · 검증캐시 해 ${CACHE_YEARS.all.join(",") || "없음"}`);

console.log("\n── 축 A · 표면별 전환 지도 ────────────────────────────────────────────");
for (const [name] of SURFACES) {
  const st = stats.get(name);
  console.log(`  ${name}`);
  for (const c of CLASSES) console.log(`      ${c.padEnd(12, " ")} ${String(st.counts[c]).padStart(5)}  (${pct(st.counts[c])})`);
  if (st.changed.length) {
    console.log(`      ↳ 값이 바뀌는 행 ${st.changed.length}건 (검증캐시 ↔ 코어 절기표 차이):`);
    for (const row of st.changed.slice(0, EXAMPLES)) console.log(`         ${row}`);
    if (st.changed.length > EXAMPLES) console.log(`         … 외 ${st.changed.length - EXAMPLES}건`);
  }
}

console.log("\n── 축 B · 전환된 값 vs 지금 화면 값(_coreEightChar) ────────────────────");
for (const [name, v] of vsCore) {
  const rows = v.rows.length;
  console.log(`  ${name} — 대조 ${v.compared}건 · 어긋난 행 ${rows}건 (${pct(rows)})`);
  console.log(`      기둥별: ${AXES.map((a) => `${a} ${v.mismatch[a]}`).join(" · ")}`);
  console.log(`      시각축: 23시대 ${v.night}건(야자시 규약 차이) · 그 밖 ${v.day}건(절기표 차이)`);
  if (!rows) continue;
  console.log(`      갈래별: ${[...v.byKind].map(([k, n]) => `${k} ${n}`).join(" · ")}`);
  console.log(`      해별:   ${[...v.byYear].sort((a, b) => a[0] - b[0]).map(([y, n]) => `${y} ${n}`).join(" · ")}`);
  for (const row of v.rows.slice(0, EXAMPLES)) console.log(`         ${row}`);
  if (rows > EXAMPLES) console.log(`         … 외 ${rows - EXAMPLES}건`);
}

// ── 축 D · 인자 모양이 **고정된** 호출부 두 종 ─────────────────────────────
//
// 위 축 A·B 는 표본(절기·야자시 경계)을 본다. 그런데 호출부 중 넷은 사용자의 생시가 아니라
// **박아 둔 인자**로 부른다 — 그 자리는 표본에 안 걸릴 수 있는데 영향은 전 사용자에게 간다.
//   · `zwFlowGanji`(js/saju-engine.js, 자미 유년)       → `(year, 6, 15, 12:00)`
//   · 대운 세운·연운(js/saju-engine.js)                 → `(year, 6, 15, 12:00)`
// 🔴 `zwFlowGanji` 는 원래 `(year, 2, 4, 12:00)` 이었고 그 프로브는 1960~2030 중 **40해**에서
//    입춘보다 일러 세차가 한 해 뒤로 밀렸다. 그 40해와 '입춘이 2/4 정오보다 늦은 해'가 정확히
//    같아 원인이 갈렸다. 아래 **대조군** 이 그 옛 프로브를 그대로 돌려 정정을 재현한다 —
//    verify:shell-korean-calendar 검사 ⑯ 이 소스 쪽에서 같은 경계를 못박는다.
// 그래서 1960~2030 전 해를 그 모양 그대로 돌린다.
{
  const FROM = 1960;
  const TO = 2030;

  // 🔴 이 산술식은 js/saju-engine.js 의 `zwFlowGanji` **폴백 사본**이다(1984=甲子 기준).
  //    그 함수가 중첩 지역 함수라 밖에서 부를 수 없어 베꼈다 — 저쪽이 바뀌면 여기도 바뀌어야 한다.
  const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const arithSecha = (year) => {
    const offset = year - 1984;
    return GAN[((offset % 10) + 10) % 10] + ZHI[((offset % 12) + 12) % 12];
  };

  const flow = [];
  const luck = [];
  const legacy = [];
  let legacyOneYearBack = 0;
  let ipchunAfterNoon = 0;
  withFilledCache(() => {
    for (let year = FROM; year <= TO; year += 1) {
      // 🔴 원인 축을 따로 잰다 — 그 해 입춘이 2월 4일 정오보다 늦으면 옛 프로브 시각은 아직
      //    전해 세차다. 그 해 수가 아래 대조군의 어긋난 해 수와 같으면 원인이 확정된다.
      const ipchun = core.solarTerms(year)[2];
      if (ipchun && (ipchun.month > 2 || ipchun.day > 4 || (ipchun.day === 4 && ipchun.hour >= 12))) ipchunAfterNoon += 1;

      const now = arithSecha(year);
      const gj = safe(() => eng.getGanjiFromParts({ year, month: 6, day: 15, hour: 12, minute: 0, second: 0 }));
      const then = P(gj, "secha");
      if (then && then !== now) flow.push(`${year}  산술 ${now}  →  전환 ${then}`);

      // 대조군 — 정정 전 프로브. 이 줄이 0 을 내면 측정이 판별력을 잃은 것이다.
      const lgj = safe(() => eng.getGanjiFromParts({ year, month: 2, day: 4, hour: 12, minute: 0, second: 0 }));
      const lthen = P(lgj, "secha");
      if (lthen && lthen !== now) {
        legacy.push(`${year}  산술 ${now}  →  옛 프로브 ${lthen}`);
        if (lthen === arithSecha(year - 1)) legacyOneYearBack += 1;
      }

      const sj = safe(() => eng.getGanjiFromParts({ year, month: 6, day: 15, hour: 12, minute: 0, second: 0 }));
      const thenY = P(sj, "secha");
      const cp = corePillars({ year, month: 6, day: 15, hour: 12, minute: 0 });
      if (thenY && cp && thenY !== cp[0]) luck.push(`${year}  코어 ${cp[0]}  →  전환 ${thenY}`);
    }
  });

  console.log("\n── 축 D · 인자가 고정된 호출부 (1960~2030 전 해) ──────────────────────");
  console.log(`  zwFlowGanji(자미 유년) — (year,6,15,12:00) 세차 · 지금은 1984 기준 산술식`);
  console.log(`      어긋난 해 ${flow.length}건 / ${TO - FROM + 1}건`);
  for (const row of flow.slice(0, EXAMPLES)) console.log(`         ${row}`);
  if (flow.length > EXAMPLES) console.log(`         … 외 ${flow.length - EXAMPLES}건`);
  console.log(`  🔴 대조군 · 정정 전 프로브 — (year,2,4,12:00)`);
  console.log(`      어긋난 해 ${legacy.length}건 / ${TO - FROM + 1}건`
    + ` · 그중 정확히 한 해 뒤로 밀린 것 ${legacyOneYearBack}건`
    + ` · 입춘이 2/4 정오보다 늦은 해 ${ipchunAfterNoon}건`);
  for (const row of legacy.slice(0, EXAMPLES)) console.log(`         ${row}`);
  if (legacy.length > EXAMPLES) console.log(`         … 외 ${legacy.length - EXAMPLES}건`);
  console.log(`  대운 세운·연운 — (year,6,15,12:00) 세차 · 지금은 _coreEightChar`);
  console.log(`      어긋난 해 ${luck.length}건 / ${TO - FROM + 1}건`);
  for (const row of luck.slice(0, EXAMPLES)) console.log(`         ${row}`);
  if (luck.length > EXAMPLES) console.log(`         … 외 ${luck.length - EXAMPLES}건`);
}

console.log("\n🔴 이 표본은 절기·야자시·설날·윤달·서머타임 경계에 집중돼 있다 — 인구 분포가 아니다.");
console.log("   호출부가 그 값을 화면까지 나르는지는 docs/handoff/ganji-wallclock-parts-migration.md 의 PR-5 절 표를 볼 것.");
