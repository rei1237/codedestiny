#!/usr/bin/env node
/**
 * 🔴 한국 음양력 코어의 **회귀 증명** 가드.
 *
 *   node scripts/verify-korean-calendar-divergence.mjs [--report] [--explain YYYY-MM-DD]
 *
 * 🔴 LLM 실호출 없음. 순수 계산이다.
 *
 * ── 무엇을 증명하는가 ───────────────────────────────────────────────────────
 * 새 코어(KST)와 `lunar-javascript`(중국 음력)를 **1900~2100 전수**로 비교하고,
 * 나타난 모든 차이가 **타임존 재구성으로 설명되는지** 본다.
 *
 * 설명이란 이렇다: 그 날에 대해 **같은 astronomy-engine 천체력을 다른 UTC 오프셋으로 다시 접어**
 * lunar-javascript 의 답을 재현할 수 있으면 설명된 것이다. 재현 못 하면 우리 알고리즘이 틀린 것이다.
 *
 * 허용하는 오프셋은 둘뿐이다:
 *   UTC+8:00:00   중국 표준시(1929~)
 *   UTC+7:45:40   북경 지방평균시(~1929) — lunar-javascript 가 옛 구간에 쓰는 기준
 * 이 둘로도 재현이 안 되는 차이가 **한 건이라도** 있으면 실패한다.
 *
 * 이 가드가 초록이면 "바뀌는 것은 정확히 타임존 결함이 있던 날들뿐이고, 그 밖에는 아무것도
 * 바뀌지 않는다" 가 기계로 증명된 것이다. 마이그레이션 PR 은 이 문장을 근거로 삼는다.
 *
 * ── 왜 fail-closed 인가 (CLAUDE.md 원칙 10) ─────────────────────────────────
 * 대상 날짜를 손으로 적지 않는다. 전 범위를 훑고, 검사 일수에 하한을 건다(대상이 0이면
 * 통과하는 가드는 가드가 아니다). 설명 실패 잔차는 0 이어야 한다.
 *
 * ── --explain ───────────────────────────────────────────────────────────────
 * 마이그레이션 PR 이 기존 고정값을 판정할 때 쓴다. 그 날짜가 차이 밴드 안인지 밖인지 답한다.
 * 밴드 밖인데 값이 움직였다면 그 PR 의 버그다.
 */

import { Solar } from "lunar-javascript";

import { solarToLunar, TABLE_META } from "../lib/korean-calendar/core.js";
import { findNewMoons, findSunLongitude, solarTermInstants } from "../lib/korean-calendar/ephemeris.js";

const DAY_MS = 86400000;
const REPORT = process.argv.includes("--report");

/** 허용되는 설명 오프셋. 🔴 여기에 오프셋을 더 넣는 것으로 잔차를 없애면 안 된다. */
const EXPLANATION_OFFSETS = Object.freeze([
  { key: "CST", label: "중국 표준시 UTC+8:00:00", ms: 8 * 3600 * 1000 },
  { key: "LMT", label: "북경 지방평균시 UTC+7:45:40", ms: (7 * 3600 + 45 * 60 + 40) * 1000 },
]);

const failures = [];
let checks = 0;
const ok = (label, condition, detail = "") => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
};

// ── 임의의 오프셋으로 음력을 다시 세운다 ────────────────────────────────────
// 코어와 **같은 규칙·같은 천체력**을 쓰되 민용일만 다른 오프셋으로 접는다.
// 그래서 재현에 성공하면 "알고리즘은 같고 타임존만 달랐다" 가 증명된다.
function buildCalendarForOffset(offsetMs, firstBlockYear, lastBlockYear) {
  const dayIndex = (ms) => Math.floor((ms + offsetMs) / DAY_MS);

  const midTermDays = new Set();
  for (let year = firstBlockYear - 1; year <= lastBlockYear; year += 1) {
    for (const term of solarTermInstants(year)) {
      if (term.index % 2 === 1) midTermDays.add(dayIndex(term.ms));
    }
  }

  const newMoons = findNewMoons(Date.UTC(firstBlockYear - 3, 0, 1), Date.UTC(lastBlockYear + 2, 0, 1));
  const newMoonDays = newMoons.map(dayIndex);

  const s11 = new Map();
  const s11IndexOf = (year) => {
    if (s11.has(year)) return s11.get(year);
    const solsticeDay = dayIndex(findSunLongitude(270, Date.UTC(year, 11, 1), 60));
    let chosen = -1;
    for (let i = 0; i < newMoonDays.length; i += 1) {
      if (newMoonDays[i] <= solsticeDay) chosen = i;
      else break;
    }
    s11.set(year, chosen);
    return chosen;
  };

  const months = [];
  for (let blockYear = firstBlockYear; blockYear <= lastBlockYear; blockYear += 1) {
    const from = s11IndexOf(blockYear - 1);
    const to = s11IndexOf(blockYear);
    const count = to - from;
    if (count !== 12 && count !== 13) return null;

    const startDays = newMoonDays.slice(from, to);
    const lengths = startDays.map((d, i) => (i + 1 < count ? startDays[i + 1] : newMoonDays[to]) - d);

    let leapIndex = -1;
    if (count === 13) {
      for (let i = 0; i < count; i += 1) {
        let has = false;
        for (let d = startDays[i]; d < startDays[i] + lengths[i]; d += 1) {
          if (midTermDays.has(d)) { has = true; break; }
        }
        if (!has) { leapIndex = i; break; }
      }
    }

    for (let i = 0; i < count; i += 1) {
      const ordinal = i - (leapIndex >= 0 && i >= leapIndex ? 1 : 0);
      months.push({
        startDay: startDays[i],
        length: lengths[i],
        isLeap: i === leapIndex,
        monthNumber: ((11 + ordinal - 1) % 12) + 1,
        lunarYear: ordinal <= 1 ? blockYear - 1 : blockYear,
      });
    }
  }

  return (targetDay) => {
    let lo = 0;
    let hi = months.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (months[mid].startDay <= targetDay) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (found < 0) return null;
    const m = months[found];
    if (targetDay >= m.startDay + m.length) return null;
    return { lunarYear: m.lunarYear, lunarMonth: m.monthNumber, lunarDay: targetDay - m.startDay + 1, isLeapMonth: m.isLeap };
  };
}

const sameLunar = (a, b) =>
  Boolean(a) && Boolean(b) &&
  a.lunarYear === b.lunarYear && a.lunarMonth === b.lunarMonth &&
  a.lunarDay === b.lunarDay && Boolean(a.isLeapMonth) === Boolean(b.isLeapMonth);

const show = (v) => (v ? `${v.lunarYear}/${v.isLeapMonth ? "윤" : ""}${v.lunarMonth}/${v.lunarDay}` : "null");

function fromLunarJs(year, month, day) {
  const L = Solar.fromYmd(year, month, day).getLunar();
  const raw = L.getMonth();
  return { lunarYear: L.getYear(), lunarMonth: Math.abs(raw), lunarDay: L.getDay(), isLeapMonth: raw < 0 };
}

// ── 실행 ────────────────────────────────────────────────────────────────────
const MIN_YEAR = TABLE_META.supportedMinYear;
const MAX_YEAR = TABLE_META.supportedMaxYear;

const startedAt = Date.now();
const alternates = EXPLANATION_OFFSETS.map((offset) => ({
  ...offset,
  lookup: buildCalendarForOffset(offset.ms, TABLE_META.firstBlockYear, TABLE_META.lastBlockYear),
}));
for (const alternate of alternates) {
  ok(`설명 달력을 세웠다 (${alternate.key})`, typeof alternate.lookup === "function", alternate.label);
}

const explainArgIndex = process.argv.indexOf("--explain");
const explainTarget = explainArgIndex >= 0 ? process.argv[explainArgIndex + 1] : null;

let compared = 0;
let differing = 0;
const explainedBy = new Map(EXPLANATION_OFFSETS.map((o) => [o.key, 0]));
let residualCount = 0;
const residualSamples = [];
const differingDays = new Set();

for (let t = Date.UTC(MIN_YEAR, 0, 1); t <= Date.UTC(MAX_YEAR, 11, 31); t += DAY_MS) {
  const d = new Date(t);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const dayIndexKst = t / DAY_MS;

  const mine = solarToLunar(year, month, day);
  const theirs = fromLunarJs(year, month, day);
  compared += 1;
  if (sameLunar(mine, theirs)) continue;

  differing += 1;
  differingDays.add(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);

  // 🔴 민용일 번호는 오프셋과 무관하게 같다 — 오프셋은 "어느 순간이 그 날에 드느냐"만 바꾼다.
  // 그래서 대체 달력도 같은 일 인덱스로 조회한다.
  let explained = null;
  for (const alternate of alternates) {
    if (!alternate.lookup) continue;
    if (sameLunar(alternate.lookup(dayIndexKst), theirs)) { explained = alternate.key; break; }
  }

  if (explained) explainedBy.set(explained, explainedBy.get(explained) + 1);
  else {
    residualCount += 1;
    if (residualSamples.length < 20) {
      residualSamples.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}  코어=${show(mine)}  lj=${show(theirs)}`);
    }
  }
}

// 🔴 실측값을 고정한다(2026-08-27, astronomy-engine 2.1.19, lunar-javascript 1.7.7).
// 이 숫자가 움직였다는 것은 누군가의 음력일이 바뀌었다는 뜻이다 — 리뷰어가 봐야 할 사건이다.
// 특히 astronomy-engine 을 올리면 KST 자정 ±5분에 걸린 삭·절기가 민용일을 넘나들 수 있다
// (그 목록은 verify:korean-calendar-midnight-register 가 따로 지킨다).
const EXPECTED = Object.freeze({ compared: 73414, differing: 2997, CST: 2877, LMT: 120 });

ok("검사 일수가 실측값과 같다", compared === EXPECTED.compared, `compared=${compared} expected=${EXPECTED.compared}`);
ok("차이 일수가 실측값과 같다", differing === EXPECTED.differing, `differing=${differing} expected=${EXPECTED.differing}`);
for (const [key, expected] of [["CST", EXPECTED.CST], ["LMT", EXPECTED.LMT]]) {
  ok(`${key} 로 설명된 일수가 실측값과 같다`, explainedBy.get(key) === expected, `${key}=${explainedBy.get(key)} expected=${expected}`);
}
ok("범위 양끝이 null 이 아니다", Boolean(solarToLunar(MIN_YEAR, 1, 1)) && Boolean(solarToLunar(MAX_YEAR, 12, 31)));
ok(
  "🔴 설명되지 않는 차이가 없다",
  residualCount === 0,
  residualCount ? `잔차 ${residualCount}건 (최대 20건 표시)\n      ${residualSamples.join("\n      ")}` : "",
);

if (explainTarget) {
  const inBand = differingDays.has(explainTarget);
  console.log(`[--explain ${explainTarget}] in-band: ${inBand ? "yes — 이 날짜는 바뀐다" : "no — 이 날짜는 바뀌면 안 된다"}`);
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
const breakdown = [...explainedBy.entries()].map(([key, count]) => `${key} ${count}`).join(" · ");

if (failures.length) {
  console.error(`[verify:korean-calendar-divergence] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `[verify:korean-calendar-divergence] 통과 — ${compared}일 비교 · 차이 ${differing}일 (${((100 * differing) / compared).toFixed(2)}%) · 설명 ${breakdown} · 잔차 0 · ${elapsed}s`,
);
