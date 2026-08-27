#!/usr/bin/env node
/**
 * 숙요(27수) 음력 축 단일 출처 가드 — "본명숙의 음력 월·일은 한국 음양력 코어 하나에서만 나온다".
 *
 *   node scripts/verify-sukuyo-korean-calendar.mjs [--report]
 *
 * 🔴 LLM 실호출 없음. 네트워크 없음. DB 없음.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * 27수는 **음력 월·일로 직접** 결정된다(`SUKUYO_MONTH_START[월-1] + 일 - 1`). 그래서 음력일이
 * 하루 밀리면 본명숙이 통째로 옆 칸으로 간다 — 다른 축을 거치지 않는 직결이다.
 *
 * `lunar-javascript` 는 **중국 표준시(CST, UTC+8) 기준 중국 음력**이라 삭이 CST 23시대에 들면
 * 그 음력 달 전체의 음력일이 하루 밀린다. 실측 2026-08-27:
 *   · 음력일 이동   1950~2030 29,585일 중 1,079일(3.65%)
 *   · **27수 이동   같은 구간 1,055일(3.57%)**  (예: 1950-03-19 루 → 규)
 *
 * ── 이 가드가 보는 것 ───────────────────────────────────────────────────────
 *   ① 숙요를 다루는 소스에서 lunar-javascript 를 **전수 발견**하고, 잔존 분류에 없으면 실패한다.
 *      발견 방식이 깨져 0개가 나와도 실패한다(CLAUDE.md 코딩 원칙 10).
 *   ② 소비자 5벌을 **실제로 실행해** 코어와 같은 본명숙을 내는지 본다. 표본은 **값이 실제로
 *      갈리는 날짜(밴드 안)** 를 반드시 포함한다 — 밴드 밖만 보면 되돌려도 초록불이다.
 *   ③ 소비자들끼리 **서로 같은 본명숙**을 내는지. 이 작업의 발단이 "엔진마다 달력이 다르다" 였다.
 *   ④ `calcSukuyoForServer` 의 세차가 **음력 프레임**(설날 경계)이고 코어 음력해에서 나오는지.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Solar } from "lunar-javascript";

import {
  BRANCH_HANJA,
  STEM_HANJA,
  sexagenaryYearIndexes,
  solarToLunar,
} from "../lib/korean-calendar/index.js";
import { buildSukuyoFromLunar } from "../worker/lib/sukuyo-ai-calculation.js";
import { loadTsModule } from "./lib/load-ts-module.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const REPORT = process.argv.includes("--report");

const failures = [];
let checks = 0;
function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
}

/** 27수 한글 이름 → 인덱스. 정본(`buildSukuyoFromLunar`)에서 만든다 — 손으로 적지 않는다. */
const MANSION_NAME_TO_INDEX = new Map();
for (let day = 1; day <= 27; day += 1) {
  const mansion = buildSukuyoFromLunar(1, day, {});
  if (mansion) MANSION_NAME_TO_INDEX.set(mansion.nameKo, mansion.index);
}

// ── 밴드 안 표본을 만든다 — 값이 실제로 움직이는 날짜 ────────────────────────
//
// 🔴 손으로 날짜를 적지 않는다. 중국 음력과 한국 음력이 갈리는 날을 **찾아서** 쓴다.
// 그래야 밴드가 바뀌어도 표본이 따라 움직이고, "밴드 밖만 골라 통과하는" 가드가 되지 않는다.
function findDivergentDates(limit) {
  const found = [];
  for (let year = 1950; year <= 2030 && found.length < limit; year += 1) {
    for (let month = 1; month <= 12 && found.length < limit; month += 1) {
      for (let day = 1; day <= 28 && found.length < limit; day += 1) {
        const core = solarToLunar(year, month, day);
        if (!core) continue;
        const lj = Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar();
        const ljMonth = Number(lj.getMonth());
        if (Math.abs(ljMonth) === core.lunarMonth && Number(lj.getDay()) === core.lunarDay) continue;
        const chinese = buildSukuyoFromLunar(Math.abs(ljMonth), Number(lj.getDay()), { isLeapMonth: ljMonth < 0 });
        const korean = buildSukuyoFromLunar(core.lunarMonth, core.lunarDay, { isLeapMonth: core.isLeapMonth });
        if (!chinese || !korean || chinese.index === korean.index) continue;
        found.push({
          year,
          month,
          day,
          ymd: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          koreanIndex: korean.index,
          koreanName: korean.nameKo,
          chineseIndex: chinese.index,
          chineseName: chinese.nameKo,
        });
      }
    }
  }
  return found;
}

// 해를 흩어서 고른다 — 한 달에 몰리면 한 삭월만 보게 된다.
const ALL_DIVERGENT = findDivergentDates(4000);
const SAMPLES = ALL_DIVERGENT.filter((_, index) => index % 97 === 0).slice(0, 12);

ok(
  "표본: 중국 음력과 27수가 갈리는 날짜를 실제로 찾았다(0 이면 가드가 깨진 것)",
  SAMPLES.length >= 8,
  `발견 ${ALL_DIVERGENT.length}일 중 표본 ${SAMPLES.length}일`,
);

// ── ① 숙요 소스에서 lunar-javascript 를 전수 발견한다 ───────────────────────
const SCAN_DIRS = ["js", "worker", "app", "lib", "src"];
const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "out", ".wrangler"]);

/** 이 중 하나라도 들어 있으면 "숙요를 다루는 파일"이다. */
const SUKUYO_MARKERS = [
  "buildSukuyoFromLunar",
  "calcSukuyoForServer",
  "SUKUYO_MONTH_START",
  "buildSukuyoAiCompatibility",
  "숙요",
];

/**
 * 숙요를 다루면서 아직 lunar-javascript 를 import 하는 것이 **알려져 있는** 파일과 그 이유.
 * 🔴 남은 이관 목록이다 — 줄어들기만 해야 한다. 여기 올린다고 옳아지지 않는다.
 */
const KNOWN_REMAINING = new Map([
  ["worker/routes/nakshatra.js", "낙샤트라 — PR-E3"],
  ["worker/routes/nakshatra-ai.js", "낙샤트라 — PR-E3"],
  ["worker/routes/nakshatra-premium.js", "낙샤트라 — PR-E3"],
  ["app/destiny-compass/_engine/adapters/vedicAdapter.ts", "베다 어댑터 — PR-E3"],
  ["app/fortune/prompt-hub/lite-prompt-tools.ts", "프롬프트 허브 라이트 도구 — PR-E4"],
  ["worker/routes/admin.js", "관리자 프롬프트 랩 — PR-E4"],
  ["worker/lib/karma-destiny-ai-calculations.js", "카르마 — PR-E4"],
]);

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const IMPORT_RE = /(?:from\s*["']lunar-javascript["']|require\(\s*["']lunar-javascript["']\s*\)|import\(\s*["']lunar-javascript["']\s*\))/;

const sukuyoFiles = [];
const stillImporting = [];
const unclassified = [];
for (const dirName of SCAN_DIRS) {
  const dir = path.join(root, dirName);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir, [])) {
    const source = fs.readFileSync(file, "utf8");
    if (!SUKUYO_MARKERS.some((marker) => source.includes(marker))) continue;
    const relative = path.relative(root, file).split(path.sep).join("/");
    sukuyoFiles.push(relative);
    if (!IMPORT_RE.test(source)) continue;
    stillImporting.push(relative);
    if (!KNOWN_REMAINING.has(relative)) unclassified.push(relative);
  }
}

ok(
  "① 숙요를 다루는 파일을 실제로 발견했다(발견 0 = 가드가 깨진 것)",
  sukuyoFiles.length >= 10,
  `발견 ${sukuyoFiles.length}개 · 그중 lunar-javascript 잔존 ${stillImporting.length}개`,
);
ok(
  "① lunar-javascript 를 아직 쓰는 숙요 파일이 전부 잔존 분류에 있다(미분류 = 새로 생긴 것)",
  unclassified.length === 0,
  unclassified.join("\n      "),
);
const stale = [...KNOWN_REMAINING.keys()].filter((relative) => !stillImporting.includes(relative));
ok(
  "① 잔존 분류에 이미 이관된 항목이 남아 있지 않다(줄어들기만 해야 한다)",
  stale.length === 0,
  stale.join(", "),
);

// ── ② 소비자를 실제로 실행해 코어 쪽 본명숙을 내는지 본다 ────────────────────
const sukuyoCalendar = await loadTsModule("lib/sukuyo-calendar.ts");
const sukuyoEngineServer = await loadTsModule("lib/sukuyo-engine-server.ts");
const promptFacts = await loadTsModule("app/fortune/prompt-hub/sukuyo-prompt-facts.ts");
const teaHouseAdapter = await loadTsModule("src/features/fortune-tea-house/lib/sukuyoCompatibilityAdapter.ts");
const { buildSukuyoAdapter } = await import("../worker/lib/guardian-fortune/adapters/sukuyo.js");

/** 소비자 5벌 — 이름과 "그 날짜의 27수 인덱스를 내는 방법". */
const CONSUMERS = [
  {
    name: "lib/sukuyo-calendar.ts buildSukuyoCalendarDay",
    indexOf: (sample) => sukuyoCalendar.buildSukuyoCalendarDay(sample.year, sample.month, sample.day, "1970-01-01").mansionIndex,
  },
  {
    name: "lib/sukuyo-engine-server.ts calcSukuyoForServer",
    indexOf: (sample) => sukuyoEngineServer.calcSukuyoForServer(sample.year, sample.month, sample.day, 12).mansionIdx,
  },
  {
    name: "worker/lib/guardian-fortune/adapters/sukuyo.js buildSukuyoAdapter",
    // 🔴 계산기를 주입해 **어떤 음력 월·일이 넘어갔는지**를 직접 본다.
    //    문구를 읽는 것보다 정확하고, 문구가 바뀌어도 가드가 안 흔들린다.
    indexOf: (sample) => {
      let captured = null;
      buildSukuyoAdapter(
        { birthDate: sample.ymd, targetDate: sample.ymd, calendarType: "solar", topic: "love" },
        {
          calculator: (lunarMonth, lunarDay, options) => {
            const mansion = buildSukuyoFromLunar(lunarMonth, lunarDay, options);
            if (captured === null) captured = mansion.index;
            return mansion;
          },
        },
      );
      return captured;
    },
  },
  {
    name: "app/fortune/prompt-hub/sukuyo-prompt-facts.ts buildSukuyoPromptFacts",
    // 프롬프트 문자열에 실린 본명숙 이름을 **정확히 잘라** 인덱스로 되돌린다.
    // 🔴 부분 문자열 검색(text.includes("진"))은 못 쓴다 — 27수 이름이 한 글자라
    // 본문 아무 데나 있는 같은 글자에 걸린다(이 가드를 쓰다 실제로 한 번 오탐이 났다).
    indexOf: (sample) => {
      const text = promptFacts.buildSukuyoPromptFacts({ birthDate: sample.ymd, calendarType: "solar" });
      const match = /- 나의 본명숙: (.+?)숙\(/.exec(text);
      if (!match) return -1;
      return MANSION_NAME_TO_INDEX.get(match[1]) ?? -1;
    },
  },
  {
    name: "src/features/fortune-tea-house/lib/sukuyoCompatibilityAdapter.ts buildFortuneTeaSukuyoCompatibility",
    indexOf: (sample) => {
      const snapshot = teaHouseAdapter.buildFortuneTeaSukuyoCompatibility({
        sukuyo: {
          relationshipType: "연인",
          user: { birthDate: sample.ymd, calendarType: "solar" },
          partner: { birthDate: sample.ymd, calendarType: "solar" },
        },
      });
      return snapshot?.user?.mansionIndex ?? snapshot?.user?.index ?? (snapshot?.user?.mansion?.includes(sample.koreanName) ? sample.koreanIndex : -1);
    },
  },
];

for (const consumer of CONSUMERS) {
  const wrong = [];
  let ran = 0;
  for (const sample of SAMPLES) {
    let actual;
    try {
      actual = consumer.indexOf(sample);
    } catch (error) {
      wrong.push(`${sample.ymd} 던짐: ${String(error?.message || error).slice(0, 90)}`);
      continue;
    }
    ran += 1;
    if (actual !== sample.koreanIndex) {
      wrong.push(`${sample.ymd} 코어 ${sample.koreanName}(${sample.koreanIndex}) · 실제 ${actual}${actual === sample.chineseIndex ? ` = 중국 음력 ${sample.chineseName}` : ""}`);
    }
  }
  ok(`② ${consumer.name} 를 표본 전건 실행했다`, ran === SAMPLES.length, `${ran}/${SAMPLES.length}`);
  ok(`② ${consumer.name} 가 갈리는 날짜에서 코어 쪽 본명숙을 낸다`, wrong.length === 0, wrong.join("\n      "));
}

// ── ③ 소비자들끼리 같은 본명숙을 낸다 ────────────────────────────────────────
{
  const disagreements = [];
  for (const sample of SAMPLES) {
    const seen = new Map();
    for (const consumer of CONSUMERS) {
      let value;
      try {
        value = consumer.indexOf(sample);
      } catch {
        value = "throw";
      }
      seen.set(consumer.name, value);
    }
    const distinct = new Set(seen.values());
    if (distinct.size > 1) {
      disagreements.push(`${sample.ymd} — ${[...seen].map(([name, value]) => `${name.split(" ")[0]}:${value}`).join(" · ")}`);
    }
  }
  ok("③ 숙요 소비자 5벌이 같은 날짜에 같은 본명숙을 낸다", disagreements.length === 0, disagreements.join("\n      "));
}

// ── ④ calcSukuyoForServer 의 세차가 음력 프레임이고 코어에서 나온다 ──────────
//
// 🔴 숙요의 세차는 **설날 경계(음력 프레임)** 다. 사주의 입춘 경계와 다르다 —
// 두 프레임이 있다는 것이 문제가 아니라, 한쪽이 다른 쪽 것을 쓰는 것이 문제다(PR-C 가 그랬다).
{
  const wrong = [];
  let compared = 0;
  for (const sample of SAMPLES) {
    const core = solarToLunar(sample.year, sample.month, sample.day);
    const indexes = sexagenaryYearIndexes(core.lunarYear);
    const expected = `${STEM_HANJA[indexes.stemIndex]}${BRANCH_HANJA[indexes.branchIndex]}`;
    const result = sukuyoEngineServer.calcSukuyoForServer(sample.year, sample.month, sample.day, 12);
    compared += 1;
    const actual = `${result.yearGan}${result.yearZhi}`;
    if (actual !== expected) wrong.push(`${sample.ymd} 코어 음력해 ${core.lunarYear} → ${expected} · 실제 ${actual}`);
  }
  ok("④ 세차 비교를 실제로 돌렸다(0 이면 가드가 깨진 것)", compared === SAMPLES.length, `${compared}/${SAMPLES.length}`);
  ok("④ 숙요 세차가 코어의 음력해에서 나온 음력 프레임 값이다", wrong.length === 0, wrong.join("\n      "));

  // 시각은 음력일을 바꾸지 않는다 — 그래서 hour 인자를 버려도 안전하다는 근거를 여기 박아 둔다.
  const hourDrift = [];
  for (const sample of SAMPLES) {
    const noon = sukuyoEngineServer.calcSukuyoForServer(sample.year, sample.month, sample.day, 12).mansionIdx;
    for (const hour of [0, 23]) {
      const other = sukuyoEngineServer.calcSukuyoForServer(sample.year, sample.month, sample.day, hour).mansionIdx;
      if (other !== noon) hourDrift.push(`${sample.ymd} ${hour}시 ${other} ≠ 정오 ${noon}`);
    }
  }
  ok("④ 생시가 본명숙을 바꾸지 않는다(0·23시 = 정오)", hourDrift.length === 0, hourDrift.join("\n      "));
}

// ── 결과 ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n[verify:sukuyo-korean-calendar] 실패 ${failures.length}건 / 검사 ${checks}건`);
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log(
  `[verify:sukuyo-korean-calendar] 통과 — 검사 ${checks}건 · 숙요 소스 ${sukuyoFiles.length}개 · `
  + `소비자 ${CONSUMERS.length}벌 · 갈리는 날 ${ALL_DIVERGENT.length}일 중 표본 ${SAMPLES.length}일`,
);
