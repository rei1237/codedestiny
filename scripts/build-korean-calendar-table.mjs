#!/usr/bin/env node
/**
 * 한국 음양력 표 생성기 — KST 기준 정삭(定朔)·무중치윤(無中置閏)으로 1900~2100 을 세운다.
 *
 *   node scripts/build-korean-calendar-table.mjs [--check]
 *
 * 🔴 LLM 실호출 없음. astronomy-engine 순수 계산이다.
 *
 * ── 이것이 "로직"이다 ───────────────────────────────────────────────────────
 * 사용자가 요구한 것은 하드코딩이 아니라 정확한 로직이다. 이 파일이 그 로직이고,
 * 산출물(표)은 그 로직을 매 요청 다시 돌리지 않으려는 캐시일 뿐이다.
 * verify:korean-calendar-table-fresh 가 표를 다시 생성해 바이트 비교하므로
 * **표를 손으로 고쳐 가드를 침묵시키는 길은 없다.**
 *
 * ── 알고리즘 ────────────────────────────────────────────────────────────────
 * 블록 Y = S11(Y-1) 부터 S11(Y)-1 까지. S11(Y) 는 **Y년 동지가 든 삭월의 삭**이다.
 * 블록의 삭월이 12개면 윤달 없음, 13개면 **중기가 하나도 안 든 첫 달**이 윤달이다.
 * 블록 안 인덱스 0 이 11월이고, 윤달을 건너뛴 순번 o 로 월 번호를 매긴다.
 *
 * 🔴 모든 비교는 순간(ms)이 아니라 **KST 민용일 정수**로 한다. lib/korean-calendar/ephemeris.js
 * 머리말의 1984년 사례를 볼 것 — 순간으로 비교하면 그 해 이후 모든 달이 한 칸 밀린다.
 *
 * ── 산출물 ──────────────────────────────────────────────────────────────────
 *   lib/korean-calendar/table.generated.js   ESM 표 (워커·앱·스크립트)
 *   js/core/korean-calendar.js               클래식 스크립트 (정적 셸 — import 불가라서)
 * 클래식판은 표뿐 아니라 코어 소스 자체를 모듈 구문만 걷어내 실은 것이라, 셸이 읽는 코드는
 * 워커·앱이 읽는 코드와 글자 단위로 같다. 세 엔진이 같은 숫자를 보는 근거가 그것이다.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  findNewMoons,
  isMidTermIndex,
  kstDayIndex,
  kstParts,
  secondsFromKstMidnight,
  solarTermInstants,
  winterSolstice,
} from "../lib/korean-calendar/ephemeris.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAY_MS = 86400000;

/** 지원 양력 범위. 레포 전반이 이미 1900~2100 을 검증한다(worker/lib/ziwei-ai-chart.js:157 등). */
export const SUPPORTED_MIN_YEAR = 1900;
export const SUPPORTED_MAX_YEAR = 2100;

/**
 * 🔴 블록 범위는 지원 범위보다 넓어야 한다.
 * 양력 1900-01-01 은 음력 1899년 12월이라 S11(1899) 까지 내려가야 하고(= 블록 1900),
 * 양력 2100-12-31 은 음력 2100년 12월이라 블록 2101 에 있다.
 * 이 범위를 1900..2100 으로 끊으면 2100년 11~12월생이 조용히 null 이 된다.
 */
const FIRST_BLOCK_YEAR = 1900;
const LAST_BLOCK_YEAR = 2101;

/** 절기표 범위. 블록이 S11(1899) 부터 시작하므로 중기도 1899년치가 필요하다. */
const FIRST_TERM_YEAR = 1899;
const LAST_TERM_YEAR = 2101;

/** 자정에서 이만큼 안쪽이면 위험 등기부에 올린다 — 천체력 오차가 민용일을 뒤집을 수 있는 구간. */
const MIDNIGHT_RISK_SECONDS = 300;

const pad = (value, width) => String(value).padStart(width, "0");

function assert(condition, message) {
  if (!condition) throw new Error(`[build-korean-calendar-table] ${message}`);
}

function astronomyEngineVersion() {
  const lock = JSON.parse(readFileSync(join(REPO_ROOT, "package-lock.json"), "utf8"));
  const entry = lock.packages?.["node_modules/astronomy-engine"];
  assert(entry?.version, "astronomy-engine version not found in package-lock.json");
  return entry.version;
}

// ── 절기 ────────────────────────────────────────────────────────────────────
function buildSolarTerms() {
  const byYear = new Map();
  const midnightRisks = [];
  let previousMs = -Infinity;

  for (let year = FIRST_TERM_YEAR; year <= LAST_TERM_YEAR; year += 1) {
    const terms = solarTermInstants(year);
    for (const term of terms) {
      // 🔴 절기는 전 구간에서 단조 증가해야 한다. 탐색 시작점이 밀리면 여기서 잡힌다.
      assert(term.ms > previousMs, `solar terms out of order at ${year}/${term.index}`);
      const gapDays = previousMs === -Infinity ? 15 : (term.ms - previousMs) / DAY_MS;
      assert(gapDays > 13.5 && gapDays < 17, `solar term gap ${gapDays.toFixed(2)}d at ${year}/${term.index}`);
      previousMs = term.ms;

      const parts = kstParts(term.ms);
      // 🔴 인덱스 0=소한 … 23=동지 는 모두 같은 양력 해 안에 닫힌다. 아니면 연도별 저장이 깨진다.
      assert(parts.year === year, `term ${year}/${term.index} fell into ${parts.year}`);

      const seconds = secondsFromKstMidnight(term.ms);
      if (seconds <= MIDNIGHT_RISK_SECONDS) {
        midnightRisks.push({
          kind: "term",
          termIndex: term.index,
          kst: `${parts.year}-${pad(parts.month, 2)}-${pad(parts.day, 2)}T${pad(parts.hour, 2)}:${pad(parts.minute, 2)}:${pad(parts.second, 2)}`,
          secondsFromMidnight: Number(seconds.toFixed(1)),
        });
      }
    }
    byYear.set(
      year,
      terms
        .map((term) => {
          // 🔴 분 반올림. 절사가 아니다 — 표의 분은 월건 경계 비교에 그대로 쓰이므로
          // 절사하면 경계가 최대 59초 이르고, 그 1분 창에 태어난 사람이 다음 달 월건을 받는다.
          // 실측(2026-08-27): 1990 입춘 실제 11:13:58 → 절사 11:13 이라 11:13 출생이 경오로 넘어갔다
          // (scripts/test-saju-solar-term-regression.mjs 의 입춘 ±1분 케이스가 잡았다).
          // 반올림하면 최대 오차가 30초로 반감한다. 4,872건 중 분이 바뀌는 것 2,430건이고
          // 민용일이 바뀌는 것은 2건뿐인데(1950 대한 23:59:58 · 2030 우수 23:59:38)
          // 둘 다 節이 아닌 氣라 월건 경계가 아니며, 이미 자정 등기부에 올라 있다.
          const p = kstParts(term.ms + 30000);
          return `${pad(p.month, 2)}${pad(p.day, 2)}${pad(p.hour, 2)}${pad(p.minute, 2)}`;
        })
        .join(","),
    );
  }

  const encoded = [...byYear.entries()].map(([year, row]) => `${year}:${row}`).join(";");
  return { encoded, count: byYear.size * 24, midnightRisks };
}

// ── 음력 블록 ───────────────────────────────────────────────────────────────
function buildLunarBlocks(midnightRisks) {
  // 중기 순간을 민용일로 미리 접어 둔다. 무중치윤 판정은 이 집합 조회로 끝난다.
  const midTermDays = new Set();
  for (let year = FIRST_TERM_YEAR; year <= LAST_TERM_YEAR; year += 1) {
    for (const term of solarTermInstants(year)) {
      if (isMidTermIndex(term.index)) midTermDays.add(kstDayIndex(term.ms));
    }
  }

  // 🔴 삭은 **한 번만** 전역으로 열거한다. 같은 삭을 두 번 탐색하면 반복 해법의 수렴 차이로
  // 몇 ms 다른 값이 나오고, 그 둘을 `>=` 로 비교하는 순간 그 달이 통째로 사라진다(1966년 사례).
  const newMoons = findNewMoons(Date.UTC(FIRST_BLOCK_YEAR - 3, 0, 1), Date.UTC(LAST_BLOCK_YEAR + 2, 0, 1));
  const newMoonDays = newMoons.map(kstDayIndex);
  for (let i = 1; i < newMoonDays.length; i += 1) {
    const gap = newMoonDays[i] - newMoonDays[i - 1];
    assert(gap === 29 || gap === 30, `new moon gap ${gap} at index ${i}`);
  }

  /** S11(year) 의 **삭 인덱스** — year 년 동지가 든 삭월. 🔴 민용일로 비교한다. */
  const s11Cache = new Map();
  function s11Index(year) {
    if (s11Cache.has(year)) return s11Cache.get(year);
    const solsticeDay = kstDayIndex(winterSolstice(year));
    let chosen = -1;
    for (let i = 0; i < newMoonDays.length; i += 1) {
      if (newMoonDays[i] <= solsticeDay) chosen = i;
      else break;
    }
    assert(chosen > 0, `S11 not found for ${year}`);
    s11Cache.set(year, chosen);
    return chosen;
  }

  const rows = [];
  const leapMonths = [];
  let totalMonths = 0;
  let previousEndDay = null;

  for (let blockYear = FIRST_BLOCK_YEAR; blockYear <= LAST_BLOCK_YEAR; blockYear += 1) {
    const from = s11Index(blockYear - 1);
    const to = s11Index(blockYear); // 다음 블록의 첫 달. 이 블록에는 포함되지 않는다.
    const count = to - from;
    assert(count === 12 || count === 13, `block ${blockYear} has ${count} months`);

    const starts = newMoons.slice(from, to);
    const startDays = newMoonDays.slice(from, to);
    // 🔴 마지막 달의 끝은 다음 블록의 첫 달 하루 전이다. 배열 안에서 이미 알 수 있다.
    const endDay = newMoonDays[to];
    const lengths = startDays.map((day, i) => (i + 1 < count ? startDays[i + 1] : endDay) - day);
    for (const length of lengths) assert(length === 29 || length === 30, `block ${blockYear} month length ${length}`);

    if (previousEndDay !== null) assert(startDays[0] === previousEndDay, `block ${blockYear} does not abut the previous block`);
    previousEndDay = endDay;

    let leapIndex = -1;
    if (count === 13) {
      for (let i = 0; i < count; i += 1) {
        const from = startDays[i];
        const to = from + lengths[i] - 1;
        let hasMidTerm = false;
        for (let day = from; day <= to; day += 1) {
          if (midTermDays.has(day)) { hasMidTerm = true; break; }
        }
        if (!hasMidTerm) { leapIndex = i; break; }
      }
      // 🔴 13개월인데 무중월이 없으면 중기표가 블록을 못 덮은 것이다. 조용히 넘기면 안 된다.
      assert(leapIndex > 0, `block ${blockYear} has 13 months but no leap candidate (leapIndex=${leapIndex})`);
      // 🔴 인덱스 0 은 동지(중기)가 든 11월이라 절대 윤달이 될 수 없다.
      const ordinal = leapIndex - 1;
      leapMonths.push({ blockYear, leapIndex, monthNumber: ((ordinal + 10) % 12) + 1 });
    }

    for (const ms of starts) {
      const seconds = secondsFromKstMidnight(ms);
      if (seconds <= MIDNIGHT_RISK_SECONDS) {
        const p = kstParts(ms);
        midnightRisks.push({
          kind: "newMoon",
          termIndex: null,
          kst: `${p.year}-${pad(p.month, 2)}-${pad(p.day, 2)}T${pad(p.hour, 2)}:${pad(p.minute, 2)}:${pad(p.second, 2)}`,
          secondsFromMidnight: Number(seconds.toFixed(1)),
        });
      }
    }

    totalMonths += count;
    rows.push(`${startDays[0]},${count},${lengths.map((l) => (l === 30 ? "1" : "0")).join("")},${leapIndex}`);
  }

  return { encoded: rows.join(";"), blockCount: rows.length, totalMonths, leapMonths };
}

// ── 산출 ────────────────────────────────────────────────────────────────────
function fingerprintOf(lunarBlocks, solarTerms, midnightRisks) {
  const canonical = JSON.stringify({ lunarBlocks, solarTerms, midnightRisks });
  return `kc1:${createHash("sha256").update(canonical).digest("hex").slice(0, 12)}`;
}

export function buildTable() {
  const midnightRisks = [];
  const terms = buildSolarTerms();
  midnightRisks.push(...terms.midnightRisks);
  const lunar = buildLunarBlocks(midnightRisks);
  midnightRisks.sort((a, b) => (a.kst < b.kst ? -1 : a.kst > b.kst ? 1 : 0));

  const meta = {
    format: "kc1",
    firstBlockYear: FIRST_BLOCK_YEAR,
    lastBlockYear: LAST_BLOCK_YEAR,
    firstTermYear: FIRST_TERM_YEAR,
    lastTermYear: LAST_TERM_YEAR,
    supportedMinYear: SUPPORTED_MIN_YEAR,
    supportedMaxYear: SUPPORTED_MAX_YEAR,
    timezone: "Asia/Seoul",
    utcOffsetMinutes: 540,
    // 🔴 astronomy-engine 은 `./package.json` 을 exports 로 열어 주지 않는다. 체크인된
    // 잠금 파일에서 읽는다 — 어차피 실제로 설치되는 버전이 그것이고 결정론적이다.
    astronomyEngine: astronomyEngineVersion(),
    blockCount: lunar.blockCount,
    monthCount: lunar.totalMonths,
    termCount: terms.count,
    leapMonthCount: lunar.leapMonths.length,
    midnightRiskSeconds: MIDNIGHT_RISK_SECONDS,
  };

  return {
    meta,
    lunarBlocks: lunar.encoded,
    solarTerms: terms.encoded,
    midnightRisks,
    leapMonths: lunar.leapMonths,
    fingerprint: fingerprintOf(lunar.encoded, terms.encoded, midnightRisks),
  };
}

const HEADER = [
  "// 🔴 이 파일은 생성물이다. 손으로 고치지 말 것.",
  "// 생성: node scripts/build-korean-calendar-table.mjs",
  "// 검사: npm run verify:korean-calendar-table-fresh (다시 생성해 바이트 비교한다)",
  "//",
  "// KST(UTC+9) 기준 한국 음양력·절기표. 삭과 절기는 astronomy-engine 으로 계산하고,",
  "// 민용일은 전부 KST 로 가른다. lunar-javascript 는 중국 표준시(UTC+8) 기준이라",
  "// 삭이 CST 23시대에 들면 음력일이 하루 밀린다 — 그것이 이 표가 존재하는 이유다.",
].join("\n");

function renderEsm(table) {
  return [
    HEADER,
    "",
    `export const TABLE_META = ${JSON.stringify(table.meta, null, 2)};`,
    "",
    "/** 블록당 `시작일인덱스,달수,대소월비트,윤달인덱스`. 블록 = S11(Y-1) ~ S11(Y)-1. */",
    `export const LUNAR_BLOCKS = ${JSON.stringify(table.lunarBlocks)};`,
    "",
    "/** 연도당 `YYYY:MMDDhhmm×24`(KST 벽시계, 분 반올림). 인덱스 0=소한 … 23=동지. */",
    `export const SOLAR_TERMS = ${JSON.stringify(table.solarTerms)};`,
    "",
    "/** KST 자정 ±5분 안에 든 절기·삭. 천체력 오차가 민용일을 뒤집을 수 있는 유일한 구간이다. */",
    `export const MIDNIGHT_RISKS = ${JSON.stringify(table.midnightRisks, null, 2)};`,
    "",
    `export const TABLE_FINGERPRINT = ${JSON.stringify(table.fingerprint)};`,
    "",
  ].join("\n");
}

export const OUTPUT_FILES = Object.freeze({
  esm: "lib/korean-calendar/table.generated.js",
  classic: "js/core/korean-calendar.js",
});

// ── 정적 셸용 클래식 스크립트 ───────────────────────────────────────────────
// 정적 셸(js/saju-engine.js)은 브라우저 클래식 스크립트라 import 가 불가능하다.
// 🔴 그렇다고 코어 로직을 손으로 한 벌 더 쓰면 그 순간 두 벌이 갈라진다 — 이 작업의 시작점이
// 바로 "엔진마다 달력이 다르다" 였다. 그래서 표뿐 아니라 **코어 소스 자체를 여기서 변환**한다.
// 모듈 구문(import/export)만 걷어내고 한 IIFE 로 감싸므로, 셸이 읽는 코드는 워커·앱이 읽는
// 코드와 글자 단위로 같은 것이다. 변환이 모듈 구문을 하나라도 남기면 빌드가 실패한다.

/** 변환 순서. const 는 호이스팅되지 않으므로 정책 → 표기 → 코어 → 간지 순이어야 한다. */
const CLASSIC_MODULES = Object.freeze([
  "lib/korean-calendar/policy.js",
  "lib/korean-calendar/labels.js",
  "lib/korean-calendar/core.js",
  "lib/korean-calendar/ganji.js",
  "lib/korean-calendar/daeun.js",
]);

/** 모듈 구문을 걷어낸다. 남으면 던진다 — 조용히 반쪽짜리 파일을 내는 것이 최악이다. */
function stripModuleSyntax(rel, source) {
  const out = source
    .replace(/^import\s[^;]*;[ \t]*\n/gm, "")
    .replace(/^export\s*\{[^}]*\}\s*;[ \t]*\n/gm, "")
    .replace(/^export\s+(const|let|function|class)\b/gm, "$1");
  const leftover = out.match(/^(?:import|export)\b.*$/m);
  if (leftover) throw new Error(`${rel}: 클래식 변환이 모듈 구문을 남겼다 — ${leftover[0].trim()}`);
  return out;
}

/**
 * 클래식 번들의 공개 표면은 lib/korean-calendar/index.js 에서 **읽어 온다**.
 * 손으로 두 벌 적으면 한쪽에만 심볼이 늘어난다(원칙 10 — 손으로 쓴 목록은 가드가 아니다).
 */
function classicSurface() {
  const source = readFileSync(join(REPO_ROOT, "lib/korean-calendar/index.js"), "utf8");
  const names = [];
  for (const m of source.matchAll(/export\s*\{([^}]*)\}\s*from\s*"[^"]+"/g)) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim();
      if (name) names.push(name);
    }
  }
  if (names.length < 10) throw new Error(`index.js 에서 공개 표면을 못 읽었다 (${names.length}개)`);
  return names.sort();
}

const CLASSIC_HEADER = [
  "//",
  "// 정적 셸(클래식 스크립트) 판. lib/korean-calendar/*.js 를 모듈 구문만 걷어내 그대로 실었다.",
  "// 🔴 셸·워커·앱이 같은 답을 내는 근거가 이 파일이다 — 손으로 고치면 그 근거가 사라진다.",
  "// 전역 하나만 만든다: window.KoreanCalendar",
].join("\n");

/**
 * 이어 붙인 소스의 최상위 선언 이름을 모은다.
 * 🔴 두 모듈이 같은 이름을 최상위에 선언하면 한 스코프로 합칠 때 SyntaxError 가 난다.
 * 실제로 core.js 와 ganji.js 가 `DAY_MS` 를 각자 선언하고 있었다(2026-08-27).
 * 그래서 빌드가 그 자리에서 죽게 만든다 — 뒤늦게 브라우저에서 발견할 일이 아니다.
 */
function topLevelNames(rel, source, seen, clashes) {
  for (const m of source.matchAll(/^(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = m[1];
    if (seen.has(name)) clashes.push(`${name} — ${seen.get(name)} 와 ${rel}`);
    else seen.set(name, rel);
  }
}

function renderClassic(table) {
  const seen = new Map();
  const clashes = [];
  const tableBody = stripModuleSyntax(OUTPUT_FILES.esm, renderEsm(table).slice(HEADER.length));
  topLevelNames(OUTPUT_FILES.esm, tableBody, seen, clashes);
  const modules = CLASSIC_MODULES.map((rel) => {
    const source = readFileSync(join(REPO_ROOT, rel), "utf8").replace(/\r\n/g, "\n");
    const stripped = stripModuleSyntax(rel, source);
    topLevelNames(rel, stripped, seen, clashes);
    return `// ── ${rel} ${"─".repeat(Math.max(3, 62 - rel.length))}\n${stripped}`;
  });
  if (clashes.length) {
    throw new Error(`클래식 번들: 최상위 이름이 겹친다 (${clashes.length}건)\n  ${clashes.join("\n  ")}`);
  }
  return [
    HEADER,
    CLASSIC_HEADER,
    "",
    "(function (root) {",
    '"use strict";',
    tableBody.trimStart(),
    "",
    ...modules,
    "",
    "root.KoreanCalendar = Object.freeze({",
    ...classicSurface().map((name) => `  ${name}: ${name},`),
    "});",
    '})(typeof globalThis !== "undefined" ? globalThis : window);',
    "",
  ].join("\n");
}

export function renderOutputs(table) {
  return {
    [OUTPUT_FILES.esm]: renderEsm(table),
    [OUTPUT_FILES.classic]: renderClassic(table),
  };
}

function main() {
  const startedAt = Date.now();
  const table = buildTable();
  const outputs = renderOutputs(table);
  const check = process.argv.includes("--check");

  let stale = 0;
  for (const [rel, content] of Object.entries(outputs)) {
    const abs = join(REPO_ROOT, rel);
    if (check) {
      let current = null;
      try { current = readFileSync(abs, "utf8"); } catch { current = null; }
      if (current !== content) { stale += 1; console.error(`  stale: ${rel}`); }
    } else {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    }
  }

  const summary = `블록 ${table.meta.blockCount} · 달 ${table.meta.monthCount} · 절기 ${table.meta.termCount} · 윤달 ${table.meta.leapMonthCount} · 자정위험 ${table.midnightRisks.length} · ${table.fingerprint} · ${Date.now() - startedAt}ms`;
  if (check) {
    if (stale) { console.error(`[build-korean-calendar-table] 표가 낡았다 (${stale}개 파일). ${summary}`); process.exit(1); }
    console.log(`[build-korean-calendar-table] 최신 — ${summary}`);
    return;
  }
  console.log(`[build-korean-calendar-table] 생성 완료 — ${summary}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-korean-calendar-table.mjs")) {
  main();
}
