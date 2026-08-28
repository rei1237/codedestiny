#!/usr/bin/env node
/**
 * 셸 간지 표면의 **회귀 증명기** — 로컬 Date 를 벽시계 부품으로 옮기는 작업(PR-C~E)의 before-image.
 *
 * 실행:
 *   node scripts/verify-ganji-surface-parity.mjs            기본 — 픽스처 전건 대조 + TZ 매트릭스
 *   node scripts/verify-ganji-surface-parity.mjs --report   통과 항목까지 전부 찍는다
 *   node scripts/verify-ganji-surface-parity.mjs --emit     🔴 픽스처 갱신 전용(값이 바뀌는 PR 에서만)
 *   node scripts/verify-ganji-surface-parity.mjs --tz-matrix  TZ 매트릭스만
 *
 * ── 무엇을 지키는가 ────────────────────────────────────────────────────────
 *
 * 브라우저에서 사주 간지를 계산할 때 **KST 벽시계 부품으로 로컬 `Date` 를 조립**한다.
 * 그 벽시계가 그 타임존에 **존재하지 않으면**(서머타임 시계 앞당김 구간) JS 가 조용히 다른
 * 시각으로 접고, 되읽은 부품이 입력과 달라져 시주·일주·월주가 틀어진다.
 * 🔴 존재하지 않는 벽시계를 담을 수 있는 로컬 `Date` 는 없다 — 그래서 "조립 후 보정"은 불가능하고
 * 간지 경로에서 로컬 `Date` 를 캐리어로 쓰는 것 자체를 그만두는 것이 유일한 정답이다.
 * 계획 전문: docs/handoff/ganji-wallclock-parts-migration.md
 *
 * 이 가드는 그 전환이 **KST 에서 무손실**임을 증명하는 저울이다. 그래서 네 가지를 동시에 본다.
 *
 *   ① `TZ=Asia/Seoul` 산출물이 픽스처와 **전건** 같다        (정본 축이 안 움직였다)
 *   ② 버린 표본이 6개 존 전부 0 이고, 접힌 벽시계 수는 census 와 같다
 *   ③ **제외 없이** 모든 TZ 가 KST 와 같다                   (타임존 무관성)
 *   ⑭ 공개 표면에 Date 를 받는 함수가 하나도 없다            (어댑터가 되살아나는 것을 막는다)
 *
 * ✅ **②의 "총계 0" 은 PR-E 에서 달성됐다.** PR-B~D 동안 이 가드는 로컬 `Date` 를 캐리어로 받는
 * 옛 진입점 12벌을 따로 재고 있었고, 그 캐리어에 담기지 않는 벽시계 표본을 `DST-GAP` 으로
 * **버렸다** — 그래서 구멍을 만드는 것은 셸이 아니라 이 가드 자신이었고, 호출부를 전부 부품으로
 * 옮겨도(PR-D) 그 숫자는 안 움직였다(실측: 전후 완전 동일). PR-E 가 그 진입점들을 소스에서
 * 지우면서 표면 목록도 부품 축 하나로 합쳤고, 버릴 표본이 없어져 0 은 값이 아니라 **구조**가 됐다.
 * 🔴 그 대신 "그 존에 존재하지 않는 벽시계 표본 수"(`foldedWallClocks`)를 계속 세서 **0 이 아님**을
 * 요구한다. 그것이 매트릭스가 UTC 를 여섯 번 재고 있지 않다는 유일한 증거다.
 *
 * ── 🔴 값이 아니라 `isNull` 지도를 본다 ────────────────────────────────────
 *
 * terms 없이 부르는 갈래(`computeGanjiFromParts(parts)`)는 검증캐시(1990 한 해)만 보기 때문에
 * **1990년 말고 전부 `null`** 이다(실측).
 * 그래서 **값 대조만으로는 그 표면이 통째로 `null == null` 로 통과한다.** 전환 중에 실수로
 * 그 표면이 답하기 시작하면 13개 호출부가 한꺼번에 절기 프레임 세차로 갈아타는데,
 * 어떤 값 대조도 그것을 못 잡는다. 그래서 `isNull` 을 **값과 별도 필드**로 찍고 따로 단언한다.
 *
 * 🔴 픽스처는 **정답이 아니라 현행**이다. 그 null 지도는 알려진 결함이며 별건이다
 * (scripts/fixtures/README-ganji-surface.md). 회귀 없음이 최우선이라 의도적으로 그렇게 고정한다.
 */

// 🔴 다른 import 보다 먼저. Node 는 존 데이터를 처음 쓸 때 캐시하므로 핀이 늦으면 안 먹는다.
import { pinTimezone, childEnvWithTimezone } from "./lib/kst-clock.mjs";

const CHILD_TZ = process.env.CD_GANJI_SURFACE_TZ || "";
const IS_CHILD = process.env.CD_GANJI_SURFACE_PROBE === "1";
const PINNED = pinTimezone(IS_CHILD && CHILD_TZ ? CHILD_TZ : "Asia/Seoul");

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REPORT = process.argv.includes("--report");
const EMIT = process.argv.includes("--emit");
const TZ_ONLY = process.argv.includes("--tz-matrix");

const FIXTURE = "scripts/fixtures/ganji-surface-kst.json";
const CENSUS = "scripts/fixtures/ganji-dst-gap-census.json";

/**
 * 🔴 **고정 리터럴**이다. 탐지 대상에서 유도하면 동어반복이 된다.
 *
 * `Asia/Seoul`  정본 축이자 재현성의 기준(개발 머신이 이미 이것이다)
 * `UTC`         CI 러너가 이것이다 — 정본과 CI 가 다른 것을 재던 구멍을 닫는다
 * 나머지 넷은 **접힘의 네 가지 모양**을 하나씩 대표한다. 하나라도 빼면 그 모양을 못 본다:
 *   America/New_York    시각만 민다        1974-01-06 02:19 → 03:19 (연중 서머타임)
 *   Pacific/Apia        날짜가 통째로 없다  2011-12-30 → 12-31   (일부변경선 이동, 일주가 밀린다)
 *   Pacific/Kiritimati  해가 넘어간다      1994-12-31 → 1995-01-01 (세차까지)
 *   Australia/Lord_Howe 30분 서머타임      2024-10-06 02:15 → 02:45 ("±1시간" 가정을 깬다)
 */
const TZ_MATRIX = Object.freeze([
  "Asia/Seoul",
  "UTC",
  "America/New_York",
  "Pacific/Apia",
  "Pacific/Kiritimati",
  "Australia/Lord_Howe",
]);

const BASE_TZ = TZ_MATRIX[0];

let checks = 0;
const failures = [];
function ok(label, passed, detail) {
  checks += 1;
  if (!passed) {
    failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  } else if (REPORT) {
    console.log(`  ok  ${label}`);
  }
}

const pad2 = (v) => String(v).padStart(2, "0");

// ── 셸 로드 ────────────────────────────────────────────────────────────────
const harness = require(path.join(root, "scripts/lib/shell-ganji-harness.cjs"));
const win = harness.loadShell(harness.SHELL_CHAIN);

/**
 * 셸이 실제로 쓰는 절기 목록을 코어에서 만든다.
 * 🔴 `_fallbackSolarTerms` 와 **같은 모양**이어야 한다 — 다르면 terms 를 받는 표면이
 * 브라우저와 다른 것을 먹는다.
 */
function coreTermRows(year) {
  const core = win.KoreanCalendar;
  return core.solarTerms(year).map((t) => ({
    name: core.TERM_NAME_KO[t.index],
    atLocal: `${t.year}-${pad2(t.month)}-${pad2(t.day)}T${pad2(t.hour)}:${pad2(t.minute)}:00`,
    source: "korean-calendar-core",
  }));
}

const termCache = new Map();
function termsFor(year) {
  if (!termCache.has(year)) termCache.set(year, coreTermRows(year));
  return termCache.get(year);
}

// ── 표본 — 손으로 날짜를 적지 않는다 ───────────────────────────────────────
//
// 🔴 전부 코어에서 **유도**한다. 절기표나 음력표가 움직이면 표본도 따라 움직여야 한다.
// 손으로 적은 목록은 표가 바뀐 뒤에도 옛 자리를 계속 재고, 그러면 가드가 조용히 무력해진다.

/** 표본을 만드는 해. 고정 리터럴이지만 **간격**이라 표가 바뀌어도 자리는 표에서 나온다. */
const SAMPLE_YEARS = Object.freeze([1960, 1967, 1974, 1981, 1988, 1995, 2002, 2009, 2016, 2023, 2030]);
/** 윤달은 전수로 훑는다 — 간격 표본으로는 대부분 놓친다. */
const LEAP_SCAN_FROM = 1960;
const LEAP_SCAN_TO = 2030;

// ── 서머타임 구멍을 **매트릭스에서 유도**한다 ──────────────────────────────
//
// 🔴 손으로 날짜를 적지 않는다. 절기·음력에서 유도한 표본만으로는 뉴욕 3건 말고 전부 0 이었다
// (실측) — 존이 매트릭스에 있어도 그 존의 구멍을 한 번도 안 밟으면 이 가드는 그 존에 대해
// 아무것도 재지 않는다. IANA 존 데이터에서 **시계가 앞당겨지는 전이**를 직접 찾아 그 안의 분을 쓴다.
//
// 부모 프로세스가 만들어야 한다 — 표본 목록이 6개 프로세스에서 **인덱스까지 같아야** 대조가 되는데,
// 자식은 자기 존만 알기 때문이다. `Intl` 로 존별 오프셋을 물으면 러너 TZ 와 무관하게 답이 같다.

const zoneFormatters = new Map();
function zoneOffsetMinutes(tz, utcMs) {
  if (!zoneFormatters.has(tz)) {
    zoneFormatters.set(tz, new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }));
  }
  const p = {};
  for (const part of zoneFormatters.get(tz).formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (wall - utcMs) / 60000;
}

/**
 * 그 존에서 **시계가 앞당겨지는** 전이를 찾는다. 되돌리는 전이(중복 시각)는 이 가드의 축이 아니다 —
 * 접힘은 값을 조용히 바꾸지만 되돌림은 로컬 Date 가 어느 쪽이든 담을 수 있기 때문이다.
 * @returns {{gapStartWallMs:number, gapEndWallMs:number, deltaMin:number}[]}
 */
function forwardTransitions(tz, fromYear, toYear) {
  const DAY = 86400000;
  const start = Date.UTC(fromYear, 0, 1);
  const end = Date.UTC(toYear + 1, 0, 1);
  const out = [];
  let prev = zoneOffsetMinutes(tz, start);
  for (let t = start + DAY; t <= end; t += DAY) {
    const off = zoneOffsetMinutes(tz, t);
    if (off === prev) continue;
    // 하루 안으로 좁혔으니 분 단위로 이분한다.
    let lo = t - DAY;
    let hi = t;
    while (hi - lo > 60000) {
      const mid = lo + Math.round((hi - lo) / 120000) * 60000;
      if (mid <= lo || mid >= hi) break;
      if (zoneOffsetMinutes(tz, mid) === prev) lo = mid; else hi = mid;
    }
    if (off > prev) {
      // 전이 직후의 실제 벽시계는 hi+off 이고, 직전 규칙대로라면 hi+prev 였다.
      // 그 사이가 **이 존에 존재하지 않는 벽시계**다.
      out.push({ gapStartWallMs: hi + prev * 60000, gapEndWallMs: hi + off * 60000, deltaMin: off - prev });
    }
    prev = off;
  }
  return out;
}

/** 전이 목록에서 고르게 최대 `limit` 개를 뽑는다(결정적 — 인덱스 산술만 쓴다). */
function spread(list, limit) {
  if (list.length <= limit) return list;
  const out = [];
  for (let i = 0; i < limit; i += 1) out.push(list[Math.floor((i * list.length) / limit)]);
  return out;
}

function partsOfWallMs(ms) {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hour: d.getUTCHours(), minute: d.getUTCMinutes(),
  };
}

function buildSamples() {
  const core = win.KoreanCalendar;
  const seen = new Set();
  const out = [];
  const add = (at, kind) => {
    const key = `${at.year}-${pad2(at.month)}-${pad2(at.day)} ${pad2(at.hour)}:${pad2(at.minute)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, at, kind });
  };

  for (const year of SAMPLE_YEARS) {
    const terms = core.solarTerms(year);

    // ① 節·中氣 경계 ±1분·±540분. 540 은 KST↔UTC 시차라 "존을 옮기면 넘어가는" 자리를 정확히 친다.
    for (const t of terms) {
      const base = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute);
      for (const offset of [-540, -1, 0, 1, 540]) add(partsOfWallMs(base + offset * 60000), "term");
    }

    // ② 야자시 경계 — 23:00 / 23:29 / 23:30 / 23:59. 날짜는 그 해 입춘에서 가져온다(표가 움직이면 따라간다).
    const ipchun = terms[2];
    if (ipchun) {
      for (const [hh, mi] of [[23, 0], [23, 29], [23, 30], [23, 59]]) {
        add({ year: ipchun.year, month: ipchun.month, day: ipchun.day, hour: hh, minute: mi }, "yaja");
      }
    }

    // ③ 1월 1일 ~ 소한 사이 — 세차·월건이 아직 전해에 속한 구간이다.
    add({ year, month: 1, day: 1, hour: 12, minute: 0 }, "newyear");
    const sohan = terms[0];
    if (sohan) {
      const prev = partsOfWallMs(Date.UTC(sohan.year, sohan.month - 1, sohan.day, 12, 0) - 86400000);
      add(prev, "newyear");
    }

    // ④ 설날 ±1일 — 음력 프레임 세차가 바뀌는 자리.
    const seol = core.lunarToSolar(year, 1, 1, false);
    if (seol) {
      const base = Date.UTC(seol.year, seol.month - 1, seol.day, 12, 0);
      for (const d of [-1, 0, 1]) add(partsOfWallMs(base + d * 86400000), "seollal");
    }
  }

  // ⑤ 윤달 전수 — 그 달 초하루 정오.
  for (let year = LEAP_SCAN_FROM; year <= LEAP_SCAN_TO; year += 1) {
    for (let m = 1; m <= 12; m += 1) {
      const leap = core.lunarToSolar(year, m, 1, true);
      if (!leap) continue;
      const plain = core.lunarToSolar(year, m, 1, false);
      // 🔴 그 해에 그 윤달이 없으면 코어가 평달을 돌려주기도 한다. 같은 날이면 윤달이 아니다.
      if (plain && plain.year === leap.year && plain.month === leap.month && plain.day === leap.day) continue;
      add({ year: leap.year, month: leap.month, day: leap.day, hour: 12, minute: 0 }, "leap");
    }
  }

  // ⑥ 🔴 서머타임 구멍 — 6개 존 전부에서 유도한다. `Asia/Seoul` 도 뺀 리스트가 아니다:
  // 한국도 1948~51 · 1955~60 · 1987~88 에 서머타임이 있었고, **정본 축에도 구멍이 있는지**가
  // 이 축에서 가장 알아야 할 사실이다.
  for (const tz of TZ_MATRIX) {
    const transitions = spread(forwardTransitions(tz, LEAP_SCAN_FROM, LEAP_SCAN_TO), 6);
    for (const tr of transitions) {
      const last = tr.gapEndWallMs - 60000;
      const mid = tr.gapStartWallMs + Math.floor((tr.gapEndWallMs - tr.gapStartWallMs) / 120000) * 60000;
      for (const ms of new Set([tr.gapStartWallMs, mid, last])) add(partsOfWallMs(ms), "dst-gap");
    }
  }

  out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return out;
}

const SAMPLES = buildSamples();

// ── 표면 12벌 — 전부 **부품 진입점**이다 ───────────────────────────────────
//
// 🔴 브라우저에서 실제로 불리는 진입점만 담는다. 각 표면은 `null` 을 낼 수 있고,
// 그 `null` 여부가 값과 **따로** 기록된다(위 머리말 참조).
//
// 🔴 PR-E 이전에는 여기에 로컬 `Date` 를 캐리어로 받는 옛 진입점 12벌이 따로 있었고, 그
// 캐리어가 존재하지 않는 벽시계를 담지 못해 가드가 표본을 `DST-GAP` 으로 **버렸다**.
// PR-E 가 그 진입점들을 소스에서 지웠으므로 버릴 표본도 함께 사라졌다 — 그래서 아래 대조는
// 전부 **구멍 제외 없이 전 표본**이다. 그것이 census 총계 0 의 실체다(구조적으로 0).
const g = (o, ...keys) => {
  if (!o || typeof o !== "object") return null;
  for (const k of keys) if (o[k]) return String(o[k]);
  return null;
};
const pill = (o) => (o ? [g(o, "secha", "year"), g(o, "weolgeon", "month"), g(o, "iljin", "day"), g(o, "sigan", "hour")].join("/") : null);

const SURFACES = Object.freeze([
  ["getGanjiFromParts", (at, p) => pill(win.KasiEngine.getGanjiFromParts(p))],
  ["getGanjiFromParts:noYaja", (at, p) => pill(win.KasiEngine.getGanjiFromParts(p, { yaja: false }))],
  ["solarToLunarFromParts", (at, p) => {
    const l = win.KasiEngine.solarToLunarFromParts(p);
    return l ? `${l.year}-${pad2(l.month)}-${pad2(l.day)}${l.isLeap ? "L" : ""}` : null;
  }],
  ["computeGanjiFromParts:noTerms", (at, p) => pill(win.KasiCalendarService.computeGanjiFromParts(p))],
  ["computeGanjiFromParts:terms", (at, p) => pill(win.KasiCalendarService.computeGanjiFromParts(p, termsFor(at.year)))],
  ["buildGanjiRepairCandidateFromParts", (at, p) => pill(win.buildGanjiRepairCandidateFromParts(p, termsFor(at.year)))],
  ["_calculateMonthBranchBySolarTermFromParts", (at, p) => {
    const r = win._calculateMonthBranchBySolarTermFromParts(p);
    return typeof r === "string" ? r : pill(r);
  }],
  // 아래 4벌은 처음부터 스칼라 인자다 — Date 를 만든 적이 없어 PR-C~E 로 한 글자도 안 바뀌었다.
  // 🔴 그래서 이 줄들이 움직이면 그것이 곧 회귀 신호다.
  ["_cdCivilDayPillar", (at) => {
    const r = win._cdCivilDayPillar(at.year, at.month, at.day, at.hour);
    return typeof r === "string" ? r : pill(r);
  }],
  ["_cdHourPillarFromDayStem", (at) => {
    const day = win._cdCivilDayPillar(at.year, at.month, at.day, at.hour);
    const stem = typeof day === "string" ? day.charAt(0) : g(day, "day", "iljin");
    const r = stem ? win._cdHourPillarFromDayStem(stem, at.hour) : null;
    return typeof r === "string" ? r : pill(r);
  }],
  ["getGanZhiForDate", (at) => {
    const r = win.getGanZhiForDate(at.year, at.month, at.day, at.hour);
    return typeof r === "string" ? r : pill(r);
  }],
  ["getMonthGanZhi", (at) => {
    const r = win.getMonthGanZhi(at.year, at.month);
    return typeof r === "string" ? r : pill(r);
  }],
  ["calcZiweiPalaces:calcMeta", (at) => {
    win.GENDER = "M";
    const chart = win.calcZiweiPalaces(at.year, at.month, at.day, at.hour, at.minute);
    const meta = chart && chart.calcMeta;
    // 🔴 객체 전체를 찍으면 무관한 필드가 흔들려 가드가 못 쓰게 된다. 간지 축만 집는다.
    if (!meta) return null;
    return [meta.yearGanji, meta.monthGanji, meta.dayGanji, meta.hourGanji, meta.lunarDay, meta.isLeapMonth]
      .map((v) => (v === undefined || v === null ? "" : String(v))).join("/");
  }],
]);

/** 표본 하나를 12벌 표면에 통과시킨다. 🔴 로컬 `Date` 를 **한 번도 안 만든다**. */
function probeSample(sample) {
  const at = sample.at;
  const p = { year: at.year, month: at.month, day: at.day, hour: at.hour, minute: at.minute, second: 0 };
  const values = [];
  const nulls = [];
  for (const [, fn] of SURFACES) {
    let v = null;
    try { v = fn(at, { ...p }); } catch (err) { v = `THROW:${String(err && err.message).slice(0, 60)}`; }
    const isNull = v === null || v === undefined || v === "";
    values.push(isNull ? "" : String(v));
    nulls.push(isNull ? "1" : "0");
  }
  return { values: values.join("\t"), nulls: nulls.join("") };
}

/**
 * 🔴 이 표본의 벽시계가 **이 프로세스의 타임존에 존재하는가**만 본다. 출력 경로가 아니다.
 *
 * PR-E 이전에는 이 되읽기가 표본을 버리는 조건이었고(`DST-GAP`), 그 건수가 census 였다.
 * 지금은 아무것도 안 버린다 — 표면이 부품을 받으므로 캐리어가 없기 때문이다. 그래도 이 수를
 * 계속 재는 이유는 **매트릭스가 살아 있다는 유일한 증거**이기 때문이다: 이 수가 0 이면 그 존이
 * 죽었거나 TZ 핀이 안 먹은 것이고, 그러면 아래 전건 대조는 UTC 를 여섯 번 재는 셈이 된다.
 * 🔴 그러니 census 의 `gaps`(=버린 표본 0)와 `foldedWallClocks`(=존이 살아 있다)를 헷갈리지 말 것.
 */
function wallClockFolds(sample) {
  const at = sample.at;
  const d = new Date(at.year, at.month - 1, at.day, at.hour, at.minute, 0);
  return d.getFullYear() !== at.year || d.getMonth() + 1 !== at.month || d.getDate() !== at.day
    || d.getHours() !== at.hour || d.getMinutes() !== at.minute;
}

/** 이 프로세스의 타임존에서 전 표본을 훑는다. */
function sweep() {
  const rows = [];
  const nullMap = [];
  const foldedKeys = [];
  for (const sample of SAMPLES) {
    const r = probeSample(sample);
    rows.push(`${sample.key}\t${r.values}`);
    nullMap.push(`${sample.key}\t${r.nulls}`);
    if (wallClockFolds(sample)) foldedKeys.push(sample.key);
  }
  // 🔴 `gaps` 는 **대조에서 버린 표본 수**다. 이제 버리는 갈래가 없으므로 구조적으로 0 이다.
  return {
    rows, nullMap, gaps: 0, foldedKeys,
    tz: PINNED.tz, offsetMinutes: PINNED.offsetMinutes,
  };
}

// ── 자식 프로세스 모드 ─────────────────────────────────────────────────────
//
// 🔴 `process.exit(0)` 을 write **직후**에 부르지 않는다. POSIX 에서 파이프로 나가는 stdout 은
// **비동기**라 아직 안 나간 바이트가 그대로 버려진다. 이 봉투는 약 250KB 라 파이프 버퍼(64KB)를
// 훌쩍 넘어 잘린다. Windows 는 파이프 쓰기가 동기라 **로컬에서는 멀쩡하고 CI 에서만** 터졌다
// (실측 2026-08-28: 로컬 37건 통과 / CI 는 자식 5개 전부 "파싱 실패").
// 콜백은 플러시가 끝난 뒤에 온다.
if (IS_CHILD) {
  // 🔴 콜백에 process.exit 만 걸면, 그 콜백이 돌기 전에 **아래 부모 모드 코드가 이 자식에서
  // 그대로 실행된다** — 그 안의 spawnSync 가 손자 5명을 또 띄워 프로세스가 지수로 터진다
  // (실측 2026-08-28: 폴스루 재현). 그래서 top-level await 로 플러시를 기다린 뒤 끝낸다.
  await new Promise((resolve) => process.stdout.write(JSON.stringify(sweep()), resolve));
  process.exit(0);
}

// ── ⓪ 핀·하네스 자기검사 ──────────────────────────────────────────────────
ok(
  `⓪ 러너 타임존이 ${BASE_TZ} 로 고정됐다`,
  PINNED.tz === BASE_TZ && PINNED.offsetMinutes === -540,
  `tz=${PINNED.tz} offset=${PINNED.offsetMinutes} — process.env.TZ 가 이 런타임에서 안 먹는다`,
);
// 🔴 이름으로 전역을 찾지 않는다 — `getGanjiFromParts` 는 `window.KasiEngine` 아래에 있고
// 전역에는 없다. 표면을 **실제로 한 번 돌려** 던지지 않는지 본다. 이름 검사는 배선이 끊긴 것을
// 못 잡는다.
{
  const probe = { year: 1990, month: 6, day: 15, hour: 12, minute: 0, second: 0 };
  const threw = [];
  for (const [name, fn] of SURFACES) {
    try {
      fn(probe, { ...probe });
    } catch (err) {
      threw.push(`${name}: ${String(err && err.message).slice(0, 80)}`);
    }
  }
  ok("⓪ 하네스에서 12벌 표면이 전부 실제로 돈다", threw.length === 0, threw.join("\n      "));
  ok("⓪ 표면 목록이 12벌이다", SURFACES.length === 12, `${SURFACES.length}벌`);
}
// 🔴 하네스에서 kasi-calendar-service.js 가 빠지는 것을 잡는 **유일한** 프로브다.
// 다른 해로 만들면 null==null 로 통과한다 — terms 없이 부르는 갈래는 1990 말고 전부 null 이다.
{
  // 🔴 스택 트레이스로 죽지 않게 감싼다. 이 자리에서 죽는 이유는 거의 항상 하나(체인에서
  // 서비스가 빠졌다)인데, 그 사실이 TypeError 뒤에 숨으면 다음 사람이 원인을 다시 찾아야 한다.
  let probe = null;
  let why = "";
  try {
    probe = win.KasiCalendarService.computeGanjiFromParts({ year: 1990, month: 6, day: 15, hour: 12, minute: 0 });
  } catch (err) {
    why = `: ${String(err && err.message).slice(0, 120)}`;
  }
  ok(
    "⓪ 🔴 1990 프로브가 값을 낸다(서비스가 체인에서 빠지면 여기서 죽는다)",
    !!probe,
    `computeGanjiFromParts(1990-06-15 12:00) 가 값을 못 냈다${why}\n      `
    + "→ shell-ganji-harness.cjs 의 SHELL_CHAIN 에 js/core/kasi-calendar-service.js 가 있는지 확인하라.\n      "
    + "🔴 다른 해로 프로브를 만들지 말 것 — terms 없는 갈래는 1990 말고 전부 null 이라 null==null 로 통과한다.",
  );
}
ok("⓪ 표본을 실제로 만들었다(0 이면 가드가 깨진 것)", SAMPLES.length >= 600, `${SAMPLES.length}건`);
{
  const kinds = new Set(SAMPLES.map((s) => s.kind));
  ok(
    "⓪ 표본 갈래가 6종 전부 있다(한 갈래가 죽어도 총계는 그럴듯하다)",
    ["term", "yaja", "newyear", "seollal", "leap", "dst-gap"].every((k) => kinds.has(k)),
    `${[...kinds].join(",")}`,
  );
}
ok("⓪ TZ 매트릭스가 6종이다", TZ_MATRIX.length === 6, `${TZ_MATRIX.length}종`);

// ── 기준 산출물 ────────────────────────────────────────────────────────────
const base = sweep();

if (EMIT) {
  const payload = {
    note: "🔴 이 파일은 **정답이 아니라 현행**이다. scripts/fixtures/README-ganji-surface.md 를 읽을 것.",
    generatedBy: "scripts/verify-ganji-surface-parity.mjs --emit",
    tz: BASE_TZ,
    surfaces: SURFACES.map(([n]) => n),
    sampleCount: SAMPLES.length,
    dstGaps: base.gaps,
    rows: base.rows,
    nullMap: base.nullMap,
  };
  fs.writeFileSync(path.join(root, FIXTURE), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[--emit] ${FIXTURE} (표본 ${SAMPLES.length} · 표면 ${SURFACES.length} · 버린 표본 ${base.gaps})`);
}

// ── TZ 매트릭스 ────────────────────────────────────────────────────────────
const matrix = new Map([[BASE_TZ, base]]);
for (const tz of TZ_MATRIX.slice(1)) {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    env: childEnvWithTimezone(tz, { CD_GANJI_SURFACE_PROBE: "1", CD_GANJI_SURFACE_TZ: tz }),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (child.status !== 0) {
    ok(`② TZ=${tz} 자식이 돌았다`, false, String(child.stderr || child.error || "").slice(0, 500));
    continue;
  }
  let parsed = null;
  let parseError = "";
  try { parsed = JSON.parse(child.stdout); } catch (err) { parseError = String(err && err.message).slice(0, 80); }
  ok(
    `② TZ=${tz} 자식이 같은 표본 수를 냈다`,
    !!parsed && Array.isArray(parsed.rows) && parsed.rows.length === base.rows.length,
    parsed && parsed.rows
      ? `${parsed.rows.length}건 / 기준 ${base.rows.length}건`
      // 🔴 길이를 함께 찍는다. 잘린 것과 오염된 것은 고치는 곳이 다르다 —
      //    잘렸으면 stdout 플러시, 오염됐으면 자식이 JSON 앞에 뭘 찍은 것이다.
      : `JSON 파싱 실패(${parseError}) · stdout ${String(child.stdout || "").length} bytes`
        + `\n      stderr: ${String(child.stderr || "").slice(0, 200)}`,
  );
  if (parsed && Array.isArray(parsed.rows)) matrix.set(tz, parsed);
}

if (EMIT) {
  const census = {
    note: "🔴 `gaps` 는 **대조에서 버린 표본 수**다. PR-E 가 Date 진입점을 지워 버리는 갈래 자체가 사라졌으므로 이제 구조적으로 전부 0 이다 — 값이 아니라 구조가 0 을 만든다. 옆의 `foldedWallClocks` 는 그 존에 **존재하지 않는 벽시계 표본 수**로, 0 이 아니어야 정상이다(존이 살아 있다는 증거). 둘을 헷갈리지 말 것.",
    generatedBy: "scripts/verify-ganji-surface-parity.mjs --emit",
    sampleCount: SAMPLES.length,
    gaps: Object.fromEntries(TZ_MATRIX.map((tz) => [tz, matrix.get(tz) ? matrix.get(tz).gaps : null])),
    foldedWallClocks: Object.fromEntries(TZ_MATRIX.map((tz) => [tz, matrix.get(tz) ? (matrix.get(tz).foldedKeys || []).length : null])),
  };
  fs.writeFileSync(path.join(root, CENSUS), `${JSON.stringify(census, null, 2)}\n`);
  console.log(`[--emit] ${CENSUS} — 버린 표본 ${TZ_MATRIX.map((tz) => `${tz}:${matrix.get(tz)?.gaps}`).join(" · ")}`);
  console.log(`[--emit] ${CENSUS} — 접힌 벽시계 ${TZ_MATRIX.map((tz) => `${tz}:${(matrix.get(tz)?.foldedKeys || []).length}`).join(" · ")}`);
  console.log("[--emit] 🔴 픽스처를 갱신했다. 이어서 기본 모드를 돌려 전건 대조를 확인하라.");
  process.exit(failures.length ? 1 : 0);
}

// ── ① KST 전건 대조 ────────────────────────────────────────────────────────
const fixture = readJson(FIXTURE);
const census = readJson(CENSUS);

function readJson(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return null;
  try { return JSON.parse(fs.readFileSync(abs, "utf8")); } catch { return null; }
}

if (!TZ_ONLY) {
  ok(`① 픽스처를 읽었다(${FIXTURE})`, !!fixture, `${FIXTURE} 없음 또는 파싱 실패 — --emit 으로 만들어라`);
  if (fixture) {
    ok(
      "① 표면 목록이 픽스처와 같다",
      Array.isArray(fixture.surfaces) && fixture.surfaces.join("|") === SURFACES.map(([n]) => n).join("|"),
      `픽스처 ${(fixture.surfaces || []).length}벌 / 지금 ${SURFACES.length}벌`,
    );
    ok(
      "① 표본 수가 픽스처와 같다",
      fixture.sampleCount === SAMPLES.length,
      `픽스처 ${fixture.sampleCount} / 지금 ${SAMPLES.length}`,
    );

    const diff = [];
    (fixture.rows || []).forEach((row, i) => {
      if (row !== base.rows[i]) diff.push(`${row}\n        →  ${base.rows[i]}`);
    });
    ok(
      "① 🔴 TZ=Asia/Seoul 산출물이 픽스처와 전건 같다",
      diff.length === 0 && (fixture.rows || []).length === base.rows.length,
      `${diff.length}건 다름\n      ${diff.slice(0, 5).join("\n      ")}`,
    );

    // 🔴 값과 **따로** 본다. 값 대조는 null==null 로 통과하지만 이것은 안 통과한다.
    const nullDiff = [];
    (fixture.nullMap || []).forEach((row, i) => {
      if (row !== base.nullMap[i]) nullDiff.push(`${row}\n        →  ${base.nullMap[i]}`);
    });
    ok(
      "① 🔴 isNull 지도가 픽스처와 한 칸도 안 다르다",
      nullDiff.length === 0 && (fixture.nullMap || []).length === base.nullMap.length,
      `${nullDiff.length}건 다름\n      ${nullDiff.slice(0, 5).join("\n      ")}`,
    );
  }
}

// ── ② census — 버린 표본 0 · 존은 살아 있다 ────────────────────────────────
ok(`② census 를 읽었다(${CENSUS})`, !!census, `${CENSUS} 없음 또는 파싱 실패`);
if (census) {
  ok(
    "② census 가 6개 존을 전부 담았다",
    TZ_MATRIX.every((tz) => Object.prototype.hasOwnProperty.call(census.gaps || {}, tz)),
    `${Object.keys(census.gaps || {}).join(",")}`,
  );
  ok(
    "② census 의 표본 수가 지금과 같다",
    census.sampleCount === SAMPLES.length,
    `census ${census.sampleCount} / 지금 ${SAMPLES.length}`,
  );
  for (const tz of TZ_MATRIX) {
    const got = matrix.get(tz);
    if (!got) continue;
    ok(
      `② TZ=${tz} 버린 표본 수가 census 와 같다`,
      got.gaps === (census.gaps || {})[tz],
      `실측 ${got.gaps} / census ${(census.gaps || {})[tz]}`,
    );
  }
  // 🔴 PR-E 졸업 조건. Date 진입점이 사라져 표본을 버리는 갈래 자체가 없으므로 **구조적으로** 0 이다.
  const total = TZ_MATRIX.reduce((sum, tz) => sum + ((census.gaps || {})[tz] || 0), 0);
  ok(
    "② 🔴 서머타임 구멍 총계가 0 이다(PR-E 졸업 조건)",
    total === 0,
    `총계 ${total} — ${TZ_MATRIX.map((tz) => `${tz}:${(census.gaps || {})[tz]}`).join(" · ")}`,
  );
  // 🔴 위 0 만으로는 아무것도 안 지킨다 — 표면이 전부 죽어도 0 이기 때문이다. 그래서 "그 존에
  // 존재하지 않는 벽시계 표본"의 수를 따로 세고, 그것이 **0 이 아님**을 여기서 요구한다.
  // 그것이 이 매트릭스가 UTC 를 여섯 번 재고 있지 않다는 유일한 증거다(PR-E 이전에는 ②의
  // "구멍 ≥1" 이 그 역할을 했고, 구멍이 0 이 되면서 이 자리로 옮겼다).
  const dstZones = TZ_MATRIX.filter((tz) => tz !== "UTC" && tz !== "Asia/Seoul");
  for (const tz of TZ_MATRIX) {
    const got = matrix.get(tz);
    if (!got) continue;
    ok(
      `② TZ=${tz} 접힌 벽시계 수가 census 와 같다`,
      (got.foldedKeys || []).length === (census.foldedWallClocks || {})[tz],
      `실측 ${(got.foldedKeys || []).length} / census ${(census.foldedWallClocks || {})[tz]}`,
    );
  }
  ok(
    "② 🔴 서머타임 존이 전부 최소 1건의 접힌 벽시계를 낸다(0 이면 존이 죽은 것)",
    dstZones.every((tz) => ((census.foldedWallClocks || {})[tz] || 0) >= 1),
    dstZones.map((tz) => `${tz}:${(census.foldedWallClocks || {})[tz]}`).join(" · "),
  );
  ok(
    "② UTC 에는 접힌 벽시계가 없다(핀이 안 먹으면 여기가 0 이 아니다)",
    ((census.foldedWallClocks || {}).UTC || 0) === 0,
    `UTC:${(census.foldedWallClocks || {}).UTC}`,
  );
}

// ── ③ 모든 TZ 가 KST 와 같다 — 🔴 제외 없이 전 표본 ────────────────────────
//
// PR-E 이전에는 여기서 구멍 표본을 뺐다. 옛 진입점에 그 벽시계를 담을 로컬 Date 가 없었기
// 때문이다. 지금은 표면이 부품을 받으므로 뺄 표본이 없다 — 그 차이가 이 작업의 결과다.
for (const tz of TZ_MATRIX.slice(1)) {
  const other = matrix.get(tz);
  if (!other) continue;
  const diff = [];
  base.rows.forEach((row, i) => {
    if (row !== other.rows[i]) diff.push(`${row}\n        →  ${other.rows[i]}`);
  });
  ok(
    `③ TZ=${tz} 대조 대상이 표본 전부다(제외 없음)`,
    other.rows.length === SAMPLES.length && base.rows.length === SAMPLES.length,
    `${tz} ${other.rows.length}건 / KST ${base.rows.length}건 / 표본 ${SAMPLES.length}건`,
  );
  ok(
    `③ 🔴 TZ=${tz} 에서도 셸의 간지가 KST 와 같다`,
    diff.length === 0,
    `${diff.length}건 다름\n      ${diff.slice(0, 3).join("\n      ")}`,
  );
  // 🔴 접힌 벽시계 표본을 **따로** 다시 본다. 위 전건 대조에 이미 들어 있지만, 그 표본이
  // 표본 목록에서 조용히 빠지면 위 검사는 그대로 통과한다. 이것이 이 PR 의 결과 그 자체다.
  const folded = new Set(other.foldedKeys || []);
  let foldedSeen = 0;
  let foldedDiff = 0;
  base.rows.forEach((row, i) => {
    if (!folded.has(row.split("\t")[0])) return;
    foldedSeen += 1;
    if (row !== other.rows[i]) foldedDiff += 1;
  });
  ok(
    `③ 🔴 TZ=${tz} 의 접힌 벽시계 ${folded.size}건도 KST 와 같다`,
    foldedSeen === folded.size && foldedDiff === 0,
    `표본 매치 ${foldedSeen}/${folded.size} · 불일치 ${foldedDiff}건`,
  );
}

// ── ④ 값이 실제로 나온다 — 빈 값끼리 대조하지 않는다 ──────────────────────
{
  const emptyRows = base.rows.filter((r) => r.split("\t").slice(1).every((v) => v === "")).length;
  ok(
    "④ 🔴 산출물이 전부 비어 있는 행이 없다(빈 값끼리 대조하면 아무것도 안 지킨다)",
    emptyRows === 0,
    `전부 빈 행 ${emptyRows}건`,
  );
  const svc = win.KasiCalendarService;
  const eng = win.KasiEngine;
  ok(
    "④ 부품 진입점 3벌이 전부 함수다",
    typeof svc.computeGanjiFromParts === "function"
      && typeof eng.getGanjiFromParts === "function"
      && typeof eng.solarToLunarFromParts === "function",
    `computeGanjiFromParts=${typeof svc.computeGanjiFromParts}`
    + ` getGanjiFromParts=${typeof eng.getGanjiFromParts}`
    + ` solarToLunarFromParts=${typeof eng.solarToLunarFromParts}`,
  );
}

// ── ⑭ 🔴 공개 표면에 Date 를 받는 함수가 하나도 없다 ───────────────────────
//
// PR-C 가 남긴 하위 호환 어댑터(로컬 Date 를 읽는 유일한 지점)를 PR-E 가 지웠다. 이 검사는
// 그것이 **다시 들어오는 것**을 막는다.
// 🔴 `fn.length` 로 재지 않는다 — 인자 개수는 Date 를 받는지와 무관하고, 어댑터가 되살아나도
// 그대로다. **실제로 `new Date(...)` 를 넘겨 보고** 값이 나오면 실패로 친다.
{
  const svc = win.KasiCalendarService;
  const eng = win.KasiEngine;

  // ① 지운 이름이 실제로 없다.
  const removed = [
    ["KasiCalendarService.computeGanjiFromDate", svc.computeGanjiFromDate],
    ["KasiCalendarService.__test.computeGanjiFromDate", svc.__test && svc.__test.computeGanjiFromDate],
    ["KasiEngine.getGanji", eng.getGanji],
    ["KasiEngine.solarToLunar", eng.solarToLunar],
    ["globalThis.buildGanjiRepairCandidate", win.buildGanjiRepairCandidate],
    ["globalThis._calculateMonthBranchBySolarTerm", win._calculateMonthBranchBySolarTerm],
  ].filter(([, v]) => v !== undefined);
  ok(
    "⑭ 🔴 Date 를 받던 진입점 6벌이 전부 사라졌다",
    removed.length === 0,
    `${removed.length}벌 남아 있다: ${removed.map(([n]) => n).join(", ")}`,
  );

  // ② 살아남은 부품 표면에 Date 를 넘기면 전부 null 이다(입구 가드가 같은 강도로 옮겨졌다).
  const d = new Date(1990, 5, 15, 12, 0, 0);
  const dateProbes = [
    ["KasiCalendarService.computeGanjiFromParts", () => svc.computeGanjiFromParts(d)],
    ["KasiCalendarService.computeGanjiFromParts:terms", () => svc.computeGanjiFromParts(d, termsFor(1990))],
    ["KasiEngine.getGanjiFromParts", () => eng.getGanjiFromParts(d)],
    ["KasiEngine.solarToLunarFromParts", () => eng.solarToLunarFromParts(d)],
    ["buildGanjiRepairCandidateFromParts", () => win.buildGanjiRepairCandidateFromParts(d, termsFor(1990))],
    ["_calculateMonthBranchBySolarTermFromParts", () => win._calculateMonthBranchBySolarTermFromParts(d)],
  ];
  const answered = [];
  // 🔴 셸이 나쁜 입력에 대해 console 로 우는 것은 **정상 동작**이다. 그 소음이 가드 출력에
  // 섞이면 실패로 오해되므로 이 프로브 동안만 막는다(프로브 밖에서는 그대로 둔다).
  const quiet = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  try {
    for (const [name, fn] of dateProbes) {
      let v;
      try { v = fn(); } catch { v = null; } // 던지는 것도 "값을 안 낸다"로 친다
      if (v !== null && v !== undefined && v !== "") answered.push(`${name} → ${JSON.stringify(v).slice(0, 80)}`);
    }
  } finally {
    console.log = quiet.log; console.warn = quiet.warn; console.error = quiet.error;
  }
  ok("⑭ Date 프로브를 실제로 돌렸다(0 이면 가드가 깨진 것)", dateProbes.length === 6, `${dateProbes.length}벌`);
  ok(
    "⑭ 🔴 부품 표면에 Date 를 넘기면 전부 값을 안 낸다",
    answered.length === 0,
    `${answered.length}벌이 답했다\n      ${answered.join("\n      ")}`,
  );
  // ③ 같은 표면이 **부품에는** 답한다 — 위 검사가 "전부 죽어서 통과"가 아님을 증명한다.
  const p = { year: 1990, month: 6, day: 15, hour: 12, minute: 0, second: 0 };
  const silent = [
    ["computeGanjiFromParts:terms", svc.computeGanjiFromParts(p, termsFor(1990))],
    ["getGanjiFromParts", eng.getGanjiFromParts(p)],
    ["solarToLunarFromParts", eng.solarToLunarFromParts(p)],
    ["buildGanjiRepairCandidateFromParts", win.buildGanjiRepairCandidateFromParts(p, termsFor(1990))],
  ].filter(([, v]) => !v);
  ok(
    "⑭ 🔴 같은 표면이 부품에는 답한다(전부 죽어서 통과하는 것을 막는다)",
    silent.length === 0,
    `${silent.length}벌이 null: ${silent.map(([n]) => n).join(", ")}`,
  );

  // ④ 로컬 Date 독출 계측 전역이 아예 없다. PR-C 가 심고 PR-E 가 지운 카운터다.
  ok(
    "⑭ 🔴 로컬 Date 독출 계측 전역이 남아 있지 않다",
    win.__CD_GANJI_LOCAL_DATE_READS__ === undefined,
    `__CD_GANJI_LOCAL_DATE_READS__ = ${JSON.stringify(win.__CD_GANJI_LOCAL_DATE_READS__)}`
    + " — 어댑터가 되살아났거나 계측만 남은 데드코드다",
  );
}

if (failures.length) {
  console.error(`[verify:ganji-surface-parity] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  `[verify:ganji-surface-parity] 통과 — 검사 ${checks}건 · 표본 ${SAMPLES.length}건 · TZ ${TZ_MATRIX.length}종`
  + `\n  부품 축(정본) 표면 ${SURFACES.length}벌 · 구멍 제외 없이 6개 존 전건 일치 · 버린 표본 0`
  + `\n  접힌 벽시계 ${TZ_MATRIX.map((tz) => `${tz.split("/").pop()}:${(matrix.get(tz)?.foldedKeys || []).length}`).join(" ")}`,
);
