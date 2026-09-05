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
 *   ② 소비자 7벌을 **실제로 실행해** 코어와 같은 본명숙을 내는지 본다. 표본은 **값이 실제로
 *      갈리는 날짜(밴드 안)** 를 반드시 포함한다 — 밴드 밖만 보면 되돌려도 초록불이다.
 *   ③ 소비자들끼리 **서로 같은 본명숙**을 내는지. 이 작업의 발단이 "엔진마다 달력이 다르다" 였다.
 *   ④ `calcSukuyoForServer` 의 세차가 **음력 프레임**(설날 경계)이고 코어 음력해에서 나오는지.
 *   ⑤ 베다 어댑터의 **음력→양력**(반대 방향)이 코어를 타는지. 하루가 밀리면 요일이 밀리고
 *      그대로 다른 바라(지배 행성)가 된다 — 실측 1950~2030 28,188건 중 1,044건(3.70%)이 갈린다.
 *   ⑥ 🔴 **셸(js/) 음력일 축**. ②~⑤ 의 소비자는 전부 `lib/`·`worker/`·`app/` 이라 셸은
 *      ①의 문자열 스캔 대상일 뿐 **실행 대상이 아니었다.** ⑥ 은 셸 소비자를 브라우저와 같은
 *      로드 체인에서 실제로 돌린다(자식 프로세스 — scripts/lib/sukuyo-shell-probe.cjs).
 *      🔴 ⑥ 의 계약은 **갈래 1** 이다 — 시각과 무관하게 셸 소비자 전원이 코어와 같은 값을
 *      낸다. 세우던 날(PR-1)에는 23시대 갈래가 2 였다: 서비스 컨텍스트를 거치면 안 밀고
 *      `solarToLunarFromParts` 를 직접 부르면 밀었다. 그 기본값을 OFF 로 뒤집어(PR-3)
 *      앱·워커(이미 안 미는 쪽)에 맞췄고, 이 절이 그것을 되돌리지 못하게 못박는다.
 *      🔴 간지 축은 반대로 ON 이 정본이다 — ⑥-f 가 그 비대칭을 값으로 지킨다.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Lunar, Solar } from "lunar-javascript";

import {
  BRANCH_HANJA,
  STEM_HANJA,
  lunarToSolar,
  sexagenaryYearIndexes,
  solarToLunar,
} from "../lib/korean-calendar/index.js";
import { buildSukuyoFromLunar } from "../worker/lib/sukuyo-ai-calculation.js";
import { stripComments } from "./lib/js-source-slice.mjs";
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

/**
 * 낙샤트라 3라우트의 검증 표면을 esbuild 로 번들해 돌린다.
 * 🔴 node 로 직접 import 하면 죽는다 — Swiss WASM(`.wasm`)과 `@/` TS 모듈을 끌고 오기 때문이다.
 * 레포의 다른 낙샤트라 가드(verify-nakshatra-flow·-premium)와 같은 방식이다.
 */
async function loadNakshatraRoutes() {
  const { build } = await import("esbuild");
  const { createRequire } = await import("node:module");
  const { tmpdir } = await import("node:os");
  const entry = [
    `export { __nakshatraTestUtils } from ${JSON.stringify(path.join(root, "worker/routes/nakshatra.js"))};`,
    `export { __nakshatraAiTestUtils } from ${JSON.stringify(path.join(root, "worker/routes/nakshatra-ai.js"))};`,
    `export { __nakshatraPremiumTestUtils } from ${JSON.stringify(path.join(root, "worker/routes/nakshatra-premium.js"))};`,
  ].join("\n");
  const bundled = await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: "sukuyo-nakshatra-entry.js" },
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    logLevel: "silent",
    loader: { ".wasm": "empty" }, // Swiss WASM 은 이 가드가 쓰지 않는다(달 황경 미사용).
  });
  const tmpFile = path.join(tmpdir(), `sukuyo-nakshatra-${process.pid}.cjs`);
  fs.writeFileSync(tmpFile, bundled.outputFiles[0].text);
  const m = createRequire(import.meta.url)(tmpFile);
  fs.rmSync(tmpFile, { force: true });
  return { free: m.__nakshatraTestUtils, ai: m.__nakshatraAiTestUtils, premium: m.__nakshatraPremiumTestUtils };
}

/**
 * 27수 한글 이름 → 인덱스. 정본(`buildSukuyoFromLunar`)에서 만든다 — 손으로 적지 않는다.
 *
 * 🔴 **이 맵은 한 칸을 잃는다** — 한글 이름이 겹치는 짝이 있다: 위(危, 10) 와 위(胃, 15).
 * 뒤에 오는 것이 앞의 것을 덮으므로 `MANSION_NAME_TO_INDEX.get("위")` 는 15 만 돌려준다.
 * ②의 prompt-facts 파서가 한글만 보는 것도 같은 함정 위에 있다(별건 — 여기서 안 고친다).
 * ⑥ 의 셸 축은 그래서 한글이 아니라 **`"위(胃)"` 꼴의 한자 포함 이름**으로 대조한다.
 */
const MANSION_NAME_TO_INDEX = new Map();
/** `"위(胃)"` 꼴 → 인덱스. 한자를 담아 위(危)·위(胃) 충돌이 없다. */
const MANSION_FULL_TO_INDEX = new Map();
for (let day = 1; day <= 27; day += 1) {
  const mansion = buildSukuyoFromLunar(1, day, {});
  if (!mansion) continue;
  MANSION_NAME_TO_INDEX.set(mansion.nameKo, mansion.index);
  MANSION_FULL_TO_INDEX.set(`${mansion.nameKo}(${mansion.nameHan})`, mansion.index);
}
/** 음력 → 셸이 쓰는 `"위(胃)"` 꼴 이름. 코어 쪽 기대값을 만드는 데 쓴다. */
function coreMansionFull(lunarMonth, lunarDay, isLeapMonth) {
  const mansion = buildSukuyoFromLunar(lunarMonth, lunarDay, { isLeapMonth: !!isLeapMonth });
  return mansion ? `${mansion.nameKo}(${mansion.nameHan})` : null;
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
// 🔴 2026-08-27(PR-E4) 부로 **비었다.** 숙요를 다루는 소스 중 lunar-javascript 를 import 하는
// 것이 하나도 없다는 뜻이다. 비어 있는 것이 통과 조건이 아니라, 아래 ① 의 "발견 0 = 실패" 가
// 가드를 fail-closed 로 잡는다.
const KNOWN_REMAINING = new Map([]);

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
const { __sukuyoYearlyTestUtils: sukuyoRoute } = await import("../worker/routes/sukuyo.js");

// 🔴 낙샤트라 3라우트는 node 로 직접 import 되지 않는다 — Swiss WASM 과 `@/` TS 모듈을 끌고 온다.
//    그래서 레포의 다른 낙샤트라 가드와 같은 방식으로 esbuild 번들해 **실제로 돌린다**.
const nakshatra = await loadNakshatraRoutes();
const vedicAdapterModule = loadTsModule("app/destiny-compass/_engine/adapters/vedicAdapter.ts");

/**
 * 소비자 7벌 — 이름과 "그 날짜의 27수 인덱스를 내는 방법".
 * 🔴 라우트 안의 순수 함수는 표면이 없으면 ①(import 수준)로만 보인다. 그 상태로 이관하다
 * 죽은 참조를 놓쳤으므로(2026-08-27) `__sukuyoYearlyTestUtils` 로 표면을 열고 여기에 넣었다.
 */
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
    // 🔴 라우트 안의 순수 함수다. 표면이 없어 import 수준으로만 보던 동안 이관이 남긴
    // 죽은 참조를 놓쳤다(CI 의 verify:worker-no-undef 가 대신 잡았다). 이제 실제로 돌린다.
    name: "worker/routes/sukuyo.js buildSukuyoCalendarDay",
    indexOf: (sample) => sukuyoRoute.buildSukuyoCalendarDay(sample.year, sample.month, sample.day, "1970-01-01").mansionIndex,
  },
  {
    name: "worker/routes/sukuyo.js resolveSukuyoLunarFromProfile",
    indexOf: (sample) => {
      const lunar = sukuyoRoute.resolveSukuyoLunarFromProfile({
        birth: { year: sample.year, month: sample.month, day: sample.day, calType: "solar" },
      });
      if (!lunar) return -1;
      return buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: lunar.isLeap }).index;
    },
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
  {
    name: "worker/routes/nakshatra.js lunarFromInput",
    indexOf: (sample) => {
      const lunar = nakshatra.free.lunarFromInput({ year: sample.year, month: sample.month, day: sample.day, hour: 12, minute: 0 });
      return buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: lunar.isLeap }).index;
    },
  },
  {
    name: "worker/routes/nakshatra-ai.js lunarFromInput",
    indexOf: (sample) => {
      const lunar = nakshatra.ai.lunarFromInput({ year: sample.year, month: sample.month, day: sample.day, hour: 12, minute: 0 });
      return buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: lunar.isLeap }).index;
    },
  },
  {
    name: "worker/routes/nakshatra-premium.js sukuyoFromSolarDate",
    indexOf: (sample) => nakshatra.premium.sukuyoFromSolarDate(sample.year, sample.month, sample.day).index,
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
  ok(`③ 숙요 소비자 ${CONSUMERS.length}벌이 같은 날짜에 같은 본명숙을 낸다`, disagreements.length === 0, disagreements.join("\n      "));
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

// ── ⑤ 베다 어댑터의 음력→양력이 코어를 탄다 ─────────────────────────────────
//
// 🔴 이 어댑터는 27수를 안 쓰지만 **같은 달력 축의 반대 방향**이다. 음력 생일이 하루 밀리면
// 요일이 밀리고 그대로 다른 바라(지배 행성)가 나온다. 표본은 손으로 적지 않고 실제로 갈리는
// 음력 날짜를 찾아서 쓴다 — 밴드 밖만 보는 표본은 되돌려도 초록불이다.
{
  const divergent = [];
  for (let lunarYear = 1950; lunarYear <= 2030 && divergent.length < 8; lunarYear += 1) {
    for (let lunarMonth = 1; lunarMonth <= 12 && divergent.length < 8; lunarMonth += 1) {
      for (let lunarDay = 1; lunarDay <= 28 && divergent.length < 8; lunarDay += 1) {
        const core = lunarToSolar(lunarYear, lunarMonth, lunarDay, false);
        if (!core) continue;
        let chinese;
        try {
          chinese = Lunar.fromYmd(lunarYear, lunarMonth, lunarDay).getSolar();
        } catch {
          continue;
        }
        if (chinese.getYear() === core.year && chinese.getMonth() === core.month && chinese.getDay() === core.day) continue;
        divergent.push({ lunarYear, lunarMonth, lunarDay, core, chinese });
      }
    }
  }
  ok(
    "⑤ 음력→양력이 갈리는 날짜를 실제로 찾았다(0 이면 가드가 깨진 것)",
    divergent.length >= 4,
    `발견 ${divergent.length}건`,
  );

  // 어댑터는 바라(요일 지배성)를 내므로, 코어 양력일의 요일에서 나온 행성과 대조한다.
  const PLANET_BY_WEEKDAY = ["Surya", "Chandra", "Mangala", "Budha", "Guru", "Shukra", "Shani"];
  const wrong = [];
  let ran = 0;
  for (const row of divergent) {
    const input = {
      birth: {
        birthDate: `${row.lunarYear}-${String(row.lunarMonth).padStart(2, "0")}-${String(row.lunarDay).padStart(2, "0")}`,
        calendarType: "lunar",
        lunarLeap: false,
      },
    };
    let contribution;
    try {
      contribution = await vedicAdapterModule.vedicAdapter.contribute(input);
    } catch (error) {
      wrong.push(`${input.birth.birthDate} 던짐: ${String(error?.message || error).slice(0, 90)}`);
      continue;
    }
    ran += 1;
    const expected = PLANET_BY_WEEKDAY[new Date(Date.UTC(row.core.year, row.core.month - 1, row.core.day)).getUTCDay()];
    const chineseExpected = PLANET_BY_WEEKDAY[new Date(Date.UTC(row.chinese.getYear(), row.chinese.getMonth() - 1, row.chinese.getDay())).getUTCDay()];
    const actual = String(contribution?.evidence?.[0]?.detail || "");
    if (!actual.includes(expected)) {
      wrong.push(
        `음력 ${input.birth.birthDate} 코어 양력 ${row.core.year}-${row.core.month}-${row.core.day} → ${expected} · 실제 "${actual}"`
        + (actual.includes(chineseExpected) ? ` = 중국 음력 ${chineseExpected}` : ""),
      );
    }
  }
  ok("⑤ 베다 어댑터를 표본 전건 실행했다", ran === divergent.length, `${ran}/${divergent.length}`);
  ok("⑤ 베다 어댑터의 바라가 코어 양력일의 요일에서 나온다", wrong.length === 0, wrong.join("\n      "));
}

// ── ⑥ 셸(js/) 음력일 축 — 소비자를 실제로 실행해 현행 불일치를 고정한다 ──────
//
// 🔴 **이 절의 계약은 "시각과 무관하게 갈래 1"** 이다. 셸 소비자 전원이 코어와 같은 음력일을
// 내야 하고, 23시대도 예외가 아니다.
//
//   · 서비스 컨텍스트를 거치는 소비자 → 안 민다
//   · `KasiEngine.solarToLunarFromParts` 를 직접 부르는 소비자 → 안 민다(기본값 OFF, PR-3)
//   · 앱·워커(`app/_lib/ziwei-engine.ts` · `worker/lib/ziwei-ai-chart.js` · `lib/sukuyo-calendar.ts`)
//     → 3인자 호출이라 야자시 개념이 없다 = 안 민다
//
// 🔴 PR-1 때는 23시대 갈래가 2 였고 이 절은 그 불일치를 **박제**하고 있었다. PR-3 이 셸의
// 기본값을 OFF 로 뒤집어 앱·워커에 맞췄다 — 그때 ⑥-b 가 2→1 로, ⑥-e 가 아래처럼 바뀌었다.
// 🔴 그 전에는 `_applyCoreCalendarCorrection`(js/core/kasi-calendar-service.js:193)이 밀린
// 폴백 값을 코어 값으로 되돌리며 `korean-calendar-core-correction` 진단을 남겼다. 지금은
// 폴백이 애초에 코어와 같은 값을 내므로 그 보정이 **no-op** 이고 진단도 안 찍힌다 —
// ⑥-e 가 그 no-op 을 값으로 못박는다(다시 밀기 시작하면 진단이 되살아나 빨강이 된다).
//
// 자식 프로세스로 도는 이유·fetch 를 던지게 두는 이유는 scripts/lib/sukuyo-shell-probe.cjs
// 머리주석에 있다. 여기서는 **판정만** 한다.
const SHELL_AXIS_REPORT = { consumers: 0, unreachable: 0, rows: 0, controlGroups: "-", yajaGroups: "-" };
{
  const require_ = createRequire(import.meta.url);
  const probeModule = require_("./lib/sukuyo-shell-probe.cjs");
  const PROBE_PATH = path.join(root, "scripts/lib/sukuyo-shell-probe.cjs");
  const FIXTURE_PATH = path.join(root, "scripts/fixtures/sukuyo-shell-axis.json");
  const EMIT = process.argv.includes("--emit");

  /** 대조군 3 + 야자시 경계 4. 🔴 23:29/23:30 은 간지 축의 `min>=30` 갈래와 대칭을 이룬다 —
   *  음력 축에는 30분 하위 경계가 **없다**는 사실을 값으로 박아 둔다. */
  const SHELL_TIMES = Object.freeze(["00:00", "12:00", "22:00", "23:00", "23:29", "23:30", "23:59"]);
  const CONTROL_TIMES = new Set(["00:00", "12:00", "22:00"]);

  function runProbe(request) {
    let stdout;
    try {
      stdout = execFileSync(process.execPath, [PROBE_PATH], {
        input: JSON.stringify(request),
        encoding: "utf8",
        // 🔴 stderr 는 버린다 — index-inline-runtime.js 가 DOM 스텁에서 던지며 내는
        //    `[SibylGuard]` 소음이 이 가드의 초록/빨강 출력에 섞이면 오독한다.
        stdio: ["pipe", "pipe", "ignore"],
        maxBuffer: 64 * 1024 * 1024,
        // 🔴 정본 축은 Asia/Seoul 이다. 부모의 머신 타임존에 맡기면 CI(UTC)와 개발(KST)이
        //    서로 다른 것을 재고 둘 다 초록이 된다.
        env: { ...process.env, TZ: "Asia/Seoul" },
      });
    } catch (error) {
      return { ok: false, error: `프로브가 죽었다: ${String((error && error.message) || error).slice(0, 200)}` };
    }
    const line = stdout.split(/\r?\n/).find((l) => l.startsWith(probeModule.ENVELOPE_PREFIX));
    if (!line) return { ok: false, error: "프로브 봉투가 stdout 에 없다(잘렸거나 안 찍혔다)" };
    try {
      return JSON.parse(line.slice(probeModule.ENVELOPE_PREFIX.length));
    } catch (error) {
      return { ok: false, error: `봉투 JSON 파싱 실패: ${String((error && error.message) || error).slice(0, 200)}` };
    }
  }

  // ── ⑥-0 호출부 전수 발견 (CLAUDE.md 코딩 원칙 10) ─────────────────────────
  //
  // 🔴 대상을 손으로 열거하지 않는다. `js/**` 에서 `solarToLunarFromParts(` 호출을 전부 찾아
  // **파일 + 직전 함수 선언 이름**을 키로 분류한다(줄 번호는 무관한 편집에 흔들린다).
  // 셋 다 실패다 — 발견이 목록보다 적다 / 미분류가 있다 / 목록에만 있고 소스에 없다.
  const SHELL_LUNAR_CALLSITES = new Map([
    ["js/core/index-inline-runtime.js#_dfExtractSukuyoLiveData", { consumer: "indexInlineRuntime._dfExtractSukuyoLiveData" }],
    ["js/core/kasi-calendar-service.js#_fallbackLunarFromSolar", { consumer: "resolvePrimaryCalendarContext" }],
    ["js/core/saju/modalProfileState.js#_resolveSukuyoLunarObj", { consumer: "modalProfileState._resolveSukuyoLunarObj" }],
    ["js/saju-engine-tarot-sukuyo-quantum.js#syRadarResolveLunar", { consumer: "quantum.syRadarResolveLunar" }],
    ["js/saju-engine-tarot-sukuyo-quantum.js#syBuildMonthlySukuyoLunar", { consumer: "quantum.syBuildMonthlySukuyoLunar" }],
    ["js/saju-engine.js#safeSolarToLunar", { consumer: "buildFallbackDateContext" }],
    ["js/saju-engine.js#calcZiweiPalaces", { consumer: "calcZiweiPalaces:calcMeta" }],
    // 🔴 아래 셋은 렌더러·핸들러 안이라 하네스에서 **실행이 안 닿는다**. 값으로는 못 재고
    //    발견으로만 지킨다 — 여기서 빠지면 미분류로 실패한다.
    ["js/saju-engine-tarot-sukuyo-quantum.js#renderSukuyo", { unreachable: "Lunar Nexus 렌더러 안 — window._ziweiBirth + DOM 의존" }],
    ["js/saju-engine-tarot-sukuyo-quantum.js#_triggerSynergyCheckCore", { unreachable: "숙요 3 궁합 계산 코어 안 — 폼 DOM 의존" }],
    ["js/saju-engine.js#_resetDashboardBeforeCalc", { unreachable: "히어로 카드 innerHTML 조립 안 — 문서 전체 + birthCountry select 필요" }],
  ]);

  const CALL_RE = /solarToLunarFromParts\s*\(/g;
  /* 🔴 선언(`function f(`)뿐 아니라 **대입된 함수 표현식**(`window.f = function(`)도 이름으로 친다.
     선언만 보면 표현식 안의 호출이 그 앞의 무관한 선언에 붙어, 사이에 함수를 하나 끼우는 것만으로
     키가 바뀐다(실측 2026-09-06: `_triggerSynergyCheckCore` 안의 호출이 `syOpenAiChat` 으로
     분류돼 있었고, 앞에 함수를 넣자 또 다른 이름으로 옮겨 갔다). 이름이 참값이어야 분류가 산다. */
  const FN_DECL_RE = /(?:function\s+([A-Za-z0-9_$]+)\s*\(|([A-Za-z0-9_$.]+)\s*=\s*(?:async\s+)?function\s*\()/g;
  const discovered = new Map();
  for (const file of walk(path.join(root, "js"), [])) {
    if (path.extname(file) !== ".js") continue;
    const source = fs.readFileSync(file, "utf8");
    if (!source.includes("solarToLunarFromParts")) continue;
    const relative = path.relative(root, file).split(path.sep).join("/");
    for (const match of source.matchAll(CALL_RE)) {
      let nearest = "(top-level)";
      // 대입 형태는 `window.foo`·`obj.foo` 로 잡히므로 마지막 조각만 이름으로 쓴다.
      for (const decl of source.slice(0, match.index).matchAll(FN_DECL_RE)) nearest = String(decl[1] || decl[2] || "").split(".").pop();
      const key = `${relative}#${nearest}`;
      discovered.set(key, (discovered.get(key) || 0) + 1);
    }
  }

  ok(
    "⑥ 셸에서 solarToLunarFromParts 호출부를 실제로 발견했다(발견 0 = 발견 방식이 깨진 것)",
    discovered.size >= SHELL_LUNAR_CALLSITES.size,
    `발견 ${discovered.size}곳 / 분류 ${SHELL_LUNAR_CALLSITES.size}곳`,
  );
  const unclassifiedCallsites = [...discovered.keys()].filter((key) => !SHELL_LUNAR_CALLSITES.has(key));
  ok(
    "⑥ 발견한 호출부가 전부 분류돼 있다(미분류 = 새로 생긴 것)",
    unclassifiedCallsites.length === 0,
    unclassifiedCallsites.join("\n      "),
  );
  const staleCallsites = [...SHELL_LUNAR_CALLSITES.keys()].filter((key) => !discovered.has(key));
  ok(
    "⑥ 분류에 소스에서 사라진 항목이 없다(stale = 이름이 바뀌었거나 지워졌다)",
    staleCallsites.length === 0,
    staleCallsites.join("\n      "),
  );

  // ── ⑥-0c 날짜 밀기 유틸 전수 발견 (R-c) ───────────────────────────────────
  //
  // 🔴 `solarToLunarFromParts` 만 지키면 구멍이 남는다 — 그 함수를 **안 거치고** 부품을 직접
  // 미는 자리가 있기 때문이다. 실제로 숙요 3 폼의 음력 입력 갈래가 그랬다(PR-3 이 지웠다).
  // 그래서 `_kasiShiftPartsByDays(` 호출을 전부 찾아 축별로 분류하고, 미분류·stale 을 실패시킨다.
  const SHIFT_CALLSITES = new Map([
    ["js/saju-engine.js#solarToLunarFromParts", { axis: "lunar", note: "기본값 OFF — options.yaja 를 명시해야만 민다" }],
    // 🔴 여기에 "js/saju-engine.js#getGanjiFromParts" 가 있었다(축 ganji). 후속-2 가 그 자리를
    //    지웠다 — 간지 축 야자시는 부품을 미는 것이 아니라 **일진만** 미는 것이고, 그 적용 자리는
    //    js/core/kasi-calendar-service.js 의 _dayGanjiFromParts 다. 부품을 통째로 밀면 節 프레임이
    //    따라 움직여 23시대 출생의 세차·월건이 코어와 갈렸다(실측 2026-08-28: 1,645건 중 19건).
    //    되돌리면 위 "미분류" 검사가, 되돌리면서 여기 다시 등재하면 아래 "간지 축 0곳" 이 잡는다.
    // 🔴 키의 이름은 **직전 함수 선언**이라 실제 감싸는 스코프(qDailyFlow IIFE)와 다르다 —
    //    이름이 아니라 "소스에 이 자리가 있다" 를 지키는 앵커다.
    ["js/saju-engine-tarot-sukuyo-quantum.js#rank", { axis: "util", note: "주간 일운 7칸의 날짜 산술(qDailyFlow) — 야자시와 무관" }],
  ]);
  const SHIFT_RE = /_kasiShiftPartsByDays\s*\(/g;
  // 🔴 `function 이름(` 뿐 아니라 `이름: function(` 도 잡는다 — 밀기 호출 둘이 KasiEngine 객체
  // 리터럴의 메서드 안에 있어서, 선언형만 보면 둘 다 바로 위의 `function _kasiShiftPartsByDays`
  // 로 뭉쳐 한 칸이 된다(그러면 두 축을 구분하는 이 검사가 무의미해진다).
  const ANY_FN_DECL_RE = /function\s+([A-Za-z0-9_$]+)\s*\(|([A-Za-z0-9_$]+)\s*:\s*function\s*\(/g;
  const shiftFound = new Map();
  for (const file of walk(path.join(root, "js"), [])) {
    if (path.extname(file) !== ".js") continue;
    const raw = fs.readFileSync(file, "utf8");
    if (!raw.includes("_kasiShiftPartsByDays")) continue;
    // 🔴 주석을 걷어낸 뒤 센다 — "예전에는 _kasiShiftPartsByDays(…) 로 밀었다" 같은 설명 주석이
    //    호출로 잡히면 미분류로 헛빨강이 난다(실측: PR-3 이 남긴 주석 1건).
    const source = stripComments(raw);
    const relative = path.relative(root, file).split(path.sep).join("/");
    for (const match of source.matchAll(SHIFT_RE)) {
      // 정의 자신(`function _kasiShiftPartsByDays(`)은 호출이 아니다.
      if (/function\s+$/.test(source.slice(Math.max(0, match.index - 12), match.index))) continue;
      let nearest = "(top-level)";
      for (const decl of source.slice(0, match.index).matchAll(ANY_FN_DECL_RE)) nearest = decl[1] || decl[2];
      const key = `${relative}#${nearest}`;
      shiftFound.set(key, (shiftFound.get(key) || 0) + 1);
    }
  }
  ok(
    "⑥ 날짜 밀기 유틸 호출부를 실제로 발견했다(발견 0 = 발견 방식이 깨진 것)",
    shiftFound.size >= SHIFT_CALLSITES.size,
    `발견 ${shiftFound.size}곳 / 분류 ${SHIFT_CALLSITES.size}곳`,
  );
  const unclassifiedShift = [...shiftFound.keys()].filter((key) => !SHIFT_CALLSITES.has(key));
  ok(
    "⑥ 날짜 밀기 호출부가 전부 축별로 분류돼 있다(미분류 = 음력일을 몰래 미는 새 자리)",
    unclassifiedShift.length === 0,
    unclassifiedShift.join("\n      "),
  );
  const staleShift = [...SHIFT_CALLSITES.keys()].filter((key) => !shiftFound.has(key));
  ok(
    "⑥ 날짜 밀기 분류에 소스에서 사라진 항목이 없다",
    staleShift.length === 0,
    staleShift.join("\n      "),
  );
  ok(
    "⑥ 음력 축에서 날짜를 미는 자리가 solarToLunarFromParts 하나뿐이다(옵션 뒤에 있다)",
    [...SHIFT_CALLSITES.entries()].filter(([, v]) => v.axis === "lunar").length === 1,
    [...SHIFT_CALLSITES.entries()].filter(([, v]) => v.axis === "lunar").map(([k]) => k).join(", "),
  );
  // 🔴 후속-2 계약. 간지 축은 부품을 밀어서 야자시를 표현하지 않는다 — 일진 하나만 민다.
  ok(
    "⑥ 간지 축에서 부품을 미는 자리가 0곳이다(후속-2 — 야자시는 일진에만 적용된다)",
    [...SHIFT_CALLSITES.entries()].filter(([, v]) => v.axis === "ganji").length === 0,
    [...SHIFT_CALLSITES.entries()].filter(([, v]) => v.axis === "ganji").map(([k]) => k).join(", "),
  );

  // ── ⑥-0b 표본 — 간지 축이 살아 있는 해를 셸에 물어 넣는다 ─────────────────
  //
  // 🔴 `getGanjiFromParts` 는 검증캐시에 있는 해(현재 1990) 말고는 전부 null 이다. 그 해가
  // 표본에 없으면 ⑥-f 가 `null == null` 로 조용히 통과한다 — PR-F 가 닫은 그 함정이다.
  // 손으로 1990 을 적지 않고 **셸에 묻는다**(캐시가 늘면 표본도 따라 는다).
  const discovery = runProbe({ discover: true });
  ok("⑥ 프로브 발견 모드가 봉투를 돌려줬다", discovery.ok === true, discovery.error || "");
  const ganjiYears = discovery.ganjiAnsweringYears || [];
  ok("⑥ 간지 축이 값을 내는 해를 셸에서 찾았다(0 이면 ⑥-f 가 무의미해진다)", ganjiYears.length >= 1, `해 ${ganjiYears.join(",")}`);

  const shellSamples = SAMPLES.map((s) => ({ year: s.year, month: s.month, day: s.day }));
  for (const year of ganjiYears) {
    if (shellSamples.some((s) => s.year === year)) continue;
    // 그 해의 갈리는 날을 먼저 쓰고, 없으면 그 해의 고정 날짜를 쓴다(둘 다 유도값이다).
    const inYear = ALL_DIVERGENT.find((row) => row.year === year);
    shellSamples.push(inYear ? { year: inYear.year, month: inYear.month, day: inYear.day } : { year, month: 6, day: 15 });
  }
  ok(
    "⑥ 표본이 간지 축이 살아 있는 해를 담는다",
    ganjiYears.every((year) => shellSamples.some((s) => s.year === year)),
    `표본 해 ${[...new Set(shellSamples.map((s) => s.year))].join(",")}`,
  );

  const probe = runProbe({ samples: shellSamples, times: [...SHELL_TIMES] });
  ok("⑥ 프로브가 봉투를 돌려줬다", probe.ok === true, probe.error || "");

  if (probe.ok) {
    const self = probe.selfCheck;
    const consumers = probe.consumers;

    // ── ⑥ 프로브 자기검사 — "안 돌아서 통과" 를 막는다 ─────────────────────
    ok("⑥ 프로브가 Asia/Seoul 로 고정돼 돌았다", probe.offsetMinutes === -540, `오프셋 ${probe.offsetMinutes}분`);
    ok("⑥ 프로브가 표본 전건을 실제로 돌았다", self.ran === self.expectedRuns && self.threw === 0, `실행 ${self.ran}/${self.expectedRuns} · 던짐 ${self.threw}`);
    ok(
      "⑥ 던지며 평가되는 파일에서도 소비자 선언이 살아남았다",
      self.resolveSukuyoLunarObj === "function" && self.dfExtractSukuyoLiveData === "function"
      && self.syRadarResolveLunar === "function" && self.syBuildMonthlySukuyoLunar === "function"
      && self.calcSukuyoData === "function",
      JSON.stringify({
        _resolveSukuyoLunarObj: self.resolveSukuyoLunarObj,
        _dfExtractSukuyoLiveData: self.dfExtractSukuyoLiveData,
        syRadarResolveLunar: self.syRadarResolveLunar,
        syBuildMonthlySukuyoLunar: self.syBuildMonthlySukuyoLunar,
        calcSukuyoData: self.calcSukuyoData,
      }),
    );
    // 프로브가 더 싣는 파일이 전수 발견 결과 안에 있어야 한다 — 임의의 파일을 싣지 못하게.
    const extraOutside = probe.extraScripts.filter((file) => ![...discovered.keys()].some((key) => key.startsWith(`${file}#`)));
    ok(
      "⑥ 프로브가 더 싣는 파일이 전부 호출부 발견 결과에서 나왔다",
      extraOutside.length === 0,
      extraOutside.join(", "),
    );

    // ⑥-e 서비스 갈래가 실제로 음력 변환을 돌았다 — "네트워크가 없어서 통과" 를 막는다.
    ok(
      "⑥-e 서비스 갈래가 로컬 음력 폴백을 실제로 돌았다",
      (self.diagnostics || []).includes("lunar conversion fallback"),
      (self.diagnostics || []).join(" · "),
    );
    // 🔴 PR-3 계약. 폴백이 이미 코어와 같은 값을 내므로 `_applyCoreCalendarCorrection` 은
    // no-op 이고 진단을 안 남긴다. 음력 축 야자시가 되살아나면 보정이 다시 돌아 진단이
    // 찍히고 이 검사가 빨강이 된다.
    ok(
      "⑥-e 코어 보정이 no-op 이다(폴백이 이미 코어와 같은 음력일을 낸다)",
      !(self.diagnostics || []).includes("korean-calendar-core-correction"),
      (self.diagnostics || []).join(" · "),
    );

    // ⑥-g 같은 프로세스에서 한 바퀴 더 돌아도 값이 같다(순서 오염 탐지).
    const repeatMismatch = probe.rows
      .map((row, index) => [row.key, JSON.stringify(row.values), JSON.stringify(probe.repeat[index] && probe.repeat[index].values)])
      .filter(([, a, b]) => a !== b);
    ok(
      "⑥-g 같은 프로세스에서 두 바퀴를 돌아도 값이 같다(순서 오염 없음)",
      repeatMismatch.length === 0,
      repeatMismatch.map(([key]) => key).join(", "),
    );

    // ── ⑥-a/b/c 갈래 수 ────────────────────────────────────────────────────
    const mansionsOf = (row) => row.values.map((v) => (v ? v.mansion : null));
    const groupCount = (row) => new Set(mansionsOf(row).filter(Boolean)).size;

    const controlRows = probe.rows.filter((row) => CONTROL_TIMES.has(row.key.slice(-5)));
    const yajaRows = probe.rows.filter((row) => row.hour === 23);

    const wrongVsCore = (rows) => rows.filter((row) => {
      const core = solarToLunar(row.year, row.month, row.day);
      const expected = core ? coreMansionFull(core.lunarMonth, core.lunarDay, core.isLeapMonth) : null;
      return mansionsOf(row).some((m) => m !== expected);
    });
    const controlWrong = wrongVsCore(controlRows);
    ok(
      "⑥-a 대조군 시각에서 셸 소비자 전원이 코어와 같은 본명숙을 낸다",
      controlRows.length > 0 && controlWrong.length === 0,
      controlWrong.map((row) => `${row.key} — ${mansionsOf(row).join(" · ")}`).join("\n      "),
    );
    // 🔴 PR-3 계약의 본체. 갈래 수만 보면 소비자 전원이 **같이** 밀어도 1 이라 통과한다 —
    // 그래서 23시대도 코어 값과 직접 대조한다.
    const yajaWrong = wrongVsCore(yajaRows);
    ok(
      "⑥-a 23시대에도 셸 소비자 전원이 코어와 같은 본명숙을 낸다(전원이 같이 미는 것을 막는다)",
      yajaRows.length > 0 && yajaWrong.length === 0,
      yajaWrong.map((row) => `${row.key} — ${mansionsOf(row).join(" · ")}`).join("\n      "),
    );
    ok(
      "⑥-c 대조군 시각의 갈래 수가 1 이다",
      controlRows.length > 0 && controlRows.every((row) => groupCount(row) === 1),
      controlRows.filter((row) => groupCount(row) !== 1).map((row) => `${row.key} 갈래 ${groupCount(row)}`).join(", "),
    );
    // 🔴 PR-3 의 계약. PR-1 때는 이 숫자가 **2** 였다(서비스 경로는 안 밀고 직접 호출은 밀었다).
    const wrongYaja = yajaRows.filter((row) => groupCount(row) !== 1);
    ok(
      "⑥-b 23시대 갈래 수가 1 이다(PR-3 이 2→1 로 통일했다 — 되돌리면 여기서 잡힌다)",
      yajaRows.length > 0 && wrongYaja.length === 0,
      wrongYaja.map((row) => `${row.key} 갈래 ${groupCount(row)} — ${[...new Set(mansionsOf(row))].join(" · ")}`).join("\n      "),
    );

    // ⑥-d 야자시 축 자체 — 명시 옵션으로 잰다(기본값이 바뀌어도 이 검사는 같은 것을 잰다).
    const axis23 = probe.yajaAxis.filter((row) => row.hour === 23);
    const axisControl = probe.yajaAxis.filter((row) => row.hour !== 23);
    const moved = axis23.filter((row) => row.moved).length;
    ok(
      "⑥-d 야자시를 끄면 23시대 본명숙이 옮겨간다(축이 살아 있다는 증거)",
      axis23.length > 0 && moved / axis23.length >= 0.8,
      `23시대 ${moved}/${axis23.length} 이동`,
    );
    ok(
      "⑥-d 23시대 밖에서는 야자시가 본명숙을 안 바꾼다",
      axisControl.length > 0 && axisControl.every((row) => !row.moved),
      axisControl.filter((row) => row.moved).map((row) => row.key).join(", "),
    );

    // ⑥-f 간지(일주) 축은 ON 이 정본이다 — 음력 축을 통일하는 PR 의 안전벨트.
    const ganjiLive = probe.ganjiAxis.filter((row) => row.hour === 23 && row.on && row.off);
    ok(
      "⑥-f 간지 축의 23시대 비교 대상이 0 이 아니다(전부 null 이면 다음 검사가 무의미하다)",
      ganjiLive.length > 0,
      `살아 있는 행 ${ganjiLive.length} / 23시대 ${probe.ganjiAxis.filter((r) => r.hour === 23).length}`,
    );
    ok(
      "⑥-f 간지 축은 23시에 여전히 하루를 민다(음력 축과 규약이 다른 것이 의도다)",
      ganjiLive.length > 0 && ganjiLive.every((row) => row.on !== row.off),
      ganjiLive.filter((row) => row.on === row.off).map((row) => `${row.key} ${row.on}`).join(", "),
    );

    // ④ 상수 열 금지 이식 — 열이 태어날 때부터 죽어 있으면 접어도 안 움직인다.
    const constantColumns = consumers
      .map((name, index) => [name, new Set(probe.rows.map((row) => JSON.stringify(row.values[index]))).size])
      .filter(([, distinct]) => distinct < 2);
    ok(
      "⑥ 상수 열이 없다(서로 다른 값이 2 미만인 소비자 = 재고 있지 않다)",
      constantColumns.length === 0,
      constantColumns.map(([name, distinct]) => `${name} 값 ${distinct}종`).join(", "),
    );
    ok(
      "⑥ 월간 숙요 표면이 값을 낸다(시각 축이 없는 소비자)",
      probe.monthly.length > 0 && probe.monthly.every((row) => row.lunar),
      probe.monthly.filter((row) => !row.lunar).map((row) => row.key).join(", "),
    );

    SHELL_AXIS_REPORT.consumers = consumers.length;
    SHELL_AXIS_REPORT.unreachable = [...SHELL_LUNAR_CALLSITES.values()].filter((v) => v.unreachable).length;
    SHELL_AXIS_REPORT.rows = probe.rows.length;
    SHELL_AXIS_REPORT.controlGroups = [...new Set(controlRows.map(groupCount))].sort().join("/");
    SHELL_AXIS_REPORT.yajaGroups = [...new Set(yajaRows.map(groupCount))].sort().join("/");

    // ── ⑥ 픽스처 — 현행을 박제한다 ─────────────────────────────────────────
    const snapshot = {
      note: "🔴 PR-3(야자시 OFF 통일) 이후의 계약이다 — 시각과 무관하게 groupCounts 가 전 행 1 이다. PR-1 때는 23시대가 2 였다. 자세한 것은 README-sukuyo-shell-axis.md.",
      generatedBy: "node scripts/verify-sukuyo-korean-calendar.mjs --emit",
      tz: "Asia/Seoul",
      consumers,
      times: [...SHELL_TIMES],
      sampleCount: probe.rows.length,
      rows: probe.rows.map((row) => `${row.key}\t${row.values.map((v) => (v ? v.mansion : "")).join("\t")}`),
      // 🔴 값과 **따로** 적는다. 값만 대조하면 죽은 열이 `null == null` 로 조용히 통과한다.
      nullMap: probe.rows.map((row) => `${row.key}\t${row.values.map((v) => (v ? "0" : "1")).join("")}`),
      // 🔴 규약이 되돌아가는지 한눈에 보는 칸 — 전 행 1 이다(PR-1 때는 23시대만 2 였다).
      groupCounts: probe.rows.map((row) => `${row.key}\t${groupCount(row)}`),
      monthly: probe.monthly.map((row) => `${row.key}\t${row.lunar}`),
    };

    if (EMIT) {
      fs.writeFileSync(FIXTURE_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      console.log(`[verify:sukuyo-korean-calendar] --emit → ${path.relative(root, FIXTURE_PATH)} (표본 ${snapshot.sampleCount}행)`);
    } else {
      const exists = fs.existsSync(FIXTURE_PATH);
      ok("⑥ 픽스처 파일을 읽었다", exists, FIXTURE_PATH);
      if (exists) {
        const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
        ok("⑥ 소비자 목록이 픽스처와 같다", JSON.stringify(fixture.consumers) === JSON.stringify(consumers), `픽스처 ${(fixture.consumers || []).length}벌 · 지금 ${consumers.length}벌`);
        ok("⑥ 시각 축이 픽스처와 같다", JSON.stringify(fixture.times) === JSON.stringify([...SHELL_TIMES]), `${(fixture.times || []).join(",")}`);
        ok("⑥ 표본 수가 픽스처와 같다", fixture.sampleCount === snapshot.sampleCount, `픽스처 ${fixture.sampleCount} · 지금 ${snapshot.sampleCount}`);
        for (const field of ["rows", "nullMap", "groupCounts", "monthly"]) {
          const before = fixture[field] || [];
          const after = snapshot[field];
          const diff = after.filter((line, index) => line !== before[index]);
          ok(
            `⑥ ${field} 가 픽스처와 전건 같다`,
            before.length === after.length && diff.length === 0,
            diff.slice(0, 6).map((line, index) => `지금 ${line}\n      전에 ${before[index] ?? "(없음)"}`).join("\n      "),
          );
        }
      }
    }
  }
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
console.log(
  `  셸 음력일 축 — 실행 소비자 ${SHELL_AXIS_REPORT.consumers}벌 · 정적 도달 ${SHELL_AXIS_REPORT.unreachable}곳 · `
  + `표본 ${SHELL_AXIS_REPORT.rows}행 · 대조군 갈래 ${SHELL_AXIS_REPORT.controlGroups} · 23시대 갈래 ${SHELL_AXIS_REPORT.yajaGroups}`,
);
