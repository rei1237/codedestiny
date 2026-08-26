#!/usr/bin/env node
/**
 * 자미두수 별 배치 정합 가드 — 셸·워커·앱 세 엔진이 같은 사람에게 같은 별을 같은 궁에 놓는지 본다.
 *
 *   node scripts/verify-ziwei-star-parity.mjs [--report]
 *
 * 🔴 LLM 실호출 없음. 순수 계산 함수만 돌린다(CLAUDE.md 절대 규칙 1).
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * 2026-08-27 이전에는 세 엔진의 별 목록이 조용히 갈려 있었다.
 *   · 앱(심화 명반)은 천괴·천월·천마·화성·영성 5개를 아예 배치하지 않아, "심화"를 표방하면서
 *     셸의 기본 명반보다 별이 5개 적었다. 그런데 LUCKY_STAR_SET 은 배치하지도 않는 천괴·천월·천마를
 *     행운성으로 분류하고 있었다.
 *   · 앱만 `록존`, 셸·워커는 `녹존` 이라 고전 명암표 조회가 빗나가 지지 인덱스 폴백으로 떨어졌다.
 *   · 워커는 영성 기점 표가 없어 화성 기점에서 역행시켰다 — 자시·오시 출생에서 두 별이 겹쳤다.
 *   · 워커는 천마 명암표 행만 갖고 배치가 없었다.
 * 전부 "화면마다 같은 사람의 명반이 다르게 나온다"로 이어진다.
 *
 * ── 어떻게 fail-closed 인가 (CLAUDE.md 원칙 10) ─────────────────────────────
 * 검사 대상 별 목록을 손으로 적지 않는다. 세 엔진 **소스에서 배치 호출을 전수 발견**하고,
 * 아래 STAR_REGISTRY 에 분류되지 않은 별이 하나라도 나오면 실패시킨다.
 * 그래서 새 별을 한 엔진에만 추가하면 이 가드가 즉시 빨간불이 된다.
 *
 * 대조 근거는 셸(js/saju-engine.js)이다 — verify:ziwei-sohan 이 셸을 외부 명반과 글자 단위로
 * 맞춰 두었으므로, 나머지 둘을 셸에 맞추면 외부 명반까지 이어진다.
 * 🔴 표기 축이 다르다(셸 한자 '寅' / 워커·앱 한글 '인'). 전부 **인덱스로** 대조한다.
 *
 * ── 음성 테스트 (2026-08-27 실측, 9종 전부 빨간불 확인) ─────────────────────
 * 규칙을 하나씩 되돌려 이 가드가 실제로 실패하는지 봤다. 복원은 메모리 버퍼로만 했다.
 *   워커 영성을 옛 규칙(화성 기점 역행)으로 원복        → ④ 화성·영성 겹침
 *   워커에서 천마 배치 제거                              → ① 공용 별 누락
 *   워커 카탈로그에서만 천마 제거                        → ② 배치 전용
 *   앱에서 천괴 배치 제거 / 화성 배치 제거               → ① 공용 별 누락
 *   앱 녹존을 옛 표기 록존으로 원복                      → ① 등록부 미분류
 *   공용 기점표 한 칸 오기 / 셸 hlStart 한 칸 오기       → ③ 리터럴 불일치
 *   앱 오행국 라벨을 옛 값으로 원복                      → ⑥ 국 명칭 불일치
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

import { calculateZiweiAiChart, __ziweiAiChartTestUtils } from "../worker/lib/ziwei-ai-chart.js";
import { FIRE_BELL_START_BY_YEAR_BRANCH } from "../lib/ziwei-fire-bell.js";

const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = process.argv.includes("--report");
const { calcChart } = require(path.join(REPO_ROOT, "scripts/lib/ziwei-engine-harness.cjs"));

const BRANCH_HANGUL = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const branchIndexOf = (value) => {
  const raw = String(value || "").trim();
  const hangul = BRANCH_HANGUL.indexOf(raw);
  return hangul >= 0 ? hangul : BRANCH_HANJA.indexOf(raw);
};

const failures = [];
let checks = 0;
const ok = (label, condition, detail = "") => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
};

// ── 별 등록부 ───────────────────────────────────────────────────────────────
// 🔴 여기는 "검사 대상 목록"이 아니라 **분류표**다. 세 엔진 소스에서 전수 발견한 별 중
// 여기에 없는 것이 하나라도 있으면 실패한다. 손으로 적은 목록이 가드를 대신하지 않게 하려는 것이다.
const SHARED_STARS = Object.freeze([
  // 14주성
  "자미", "천기", "태양", "무곡", "천동", "염정",
  "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군",
  // 보좌성 8
  "문창", "문곡", "좌보", "우필", "녹존", "천괴", "천월", "천마",
  // 살성 6
  "경양", "타라", "지공", "지겁", "화성", "영성",
]);

/**
 * 워커에만 있는 별. 셸·앱은 이 둘을 배치하지 않는다.
 * 🔴 지우거나 다른 엔진에 옮기는 판단은 이 가드의 몫이 아니다 — 여기서는 "알고 있는 차이"로만 둔다.
 * 두 별은 앱의 고전 명암표(app/_lib/ziwei-strength.ts)에도 행이 없어서, 앱에 넣으면
 * 지지 인덱스 폴백으로 떨어진다. 넣으려면 명암표부터 세워야 한다.
 */
const WORKER_ONLY_STARS = Object.freeze(["함지", "천요"]);

const CLASSIFIED = new Set([...SHARED_STARS, ...WORKER_ONLY_STARS]);

// ── 소스에서 배치 호출 전수 발견 ────────────────────────────────────────────
const readSource = (rel) => readFileSync(path.join(REPO_ROOT, rel), "utf8");

/**
 * 셸: stars[...].main|aux|bad.push('별이름')
 * 🔴 첨자에 `yangMap[yearGan]` 처럼 대괄호가 중첩되므로 `stars[...]` 부분을 패턴에 넣지 않는다.
 * 넣었다가 경양·타라 두 개를 놓쳤다(2026-08-27).
 */
function discoverShellStars() {
  const src = readSource("js/saju-engine.js");
  const found = new Set();
  for (const m of src.matchAll(/\.(?:main|aux|bad)\.push\('([^']+)'\)/g)) found.add(m[1]);
  return found;
}

/** 워커: addStar(shells, <어떤 식이든>, "별이름", "type") */
function discoverWorkerStars() {
  const src = readSource("worker/lib/ziwei-ai-chart.js");
  const found = new Set();
  for (const m of src.matchAll(/addStar\(shells,[^;]*?"([^"]+)",\s*"(?:main|assistant|malefic)"\)/g)) found.add(m[1]);
  for (const m of src.matchAll(/\[\s*\w+\s*\+?\s*\d*\s*,\s*"([^"]+)"\s*\]/g)) found.add(m[1]);
  return found;
}

/** 앱: addStar(<어떤 식이든>, "별이름", "main"|"aux"|"bad") */
function discoverAppStars() {
  const src = readSource("app/_lib/ziwei-engine.ts");
  const found = new Set();
  for (const m of src.matchAll(/addStar\([^;]*?"([^"]+)",\s*"(?:main|aux|bad)"\)/g)) found.add(m[1]);
  return found;
}

// ── 앱 엔진(TS)을 node 에서 돌린다 ──────────────────────────────────────────
// 이 레포는 package.json type=commonjs 라 TS 를 직접 로드하지 못한다.
// scripts/verify-nakshatra-flow.mjs 와 같은 방식으로 esbuild 로 CJS 번들을 만들어 require 한다.
async function loadAppEngine() {
  const entry = `export { calcZiweiPalaces } from ${JSON.stringify(path.join(REPO_ROOT, "app/_lib/ziwei-engine.ts"))};`;
  const bundled = await build({
    stdin: { contents: entry, resolveDir: REPO_ROOT, sourcefile: "ziwei-app-engine-entry.ts", loader: "ts" },
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    logLevel: "silent",
    alias: { "@": REPO_ROOT },
  });
  const tmpFile = path.join(tmpdir(), `ziwei-app-engine-${process.pid}.cjs`);
  writeFileSync(tmpFile, bundled.outputFiles[0].text);
  return require(tmpFile).calcZiweiPalaces;
}

// ── 대조 인물 ───────────────────────────────────────────────────────────────
// 12 생년지 × 시지 두 축을 덮는다. 🔴 오시(hourIndex 6)·자시(hourIndex 0)를 반드시 포함한다 —
// 워커의 옛 영성 규칙(화성 기점 역행)이 화성·영성을 같은 궁에 겹쳐 놓던 시각이 바로 그 둘이다.
//
// 🔴 1997-02-10 은 일부러 뺐다. 그 날짜만 세 엔진의 **음력일이 갈린다** — 셸에는
// js/saju-engine.js 의 KASI_LOCAL_PATCH_SEED 에 그 하루짜리 덮어쓰기(음력 1월 3일)가 있고,
// 워커·앱은 lunar-javascript(음력 1월 4일)를 쓴다. 음력일이 다르면 자미 위치가 밀려 14주성이
// 통째로 어긋나므로, 그 케이스로는 **배치 규칙을 검사할 수 없다**(달력을 검사하게 된다).
// 어느 달력이 맞는지는 자미두수가 아니라 역법 문제이고 이 가드의 판정 범위 밖이다.
// 대신 아래 ⑤ 가 케이스 전체에서 셸·워커의 음력월·음력일 일치를 요구하므로,
// 시드가 하나라도 케이스 범위 안으로 들어오면 그때 빨간불이 된다.
const CASES = [
  { label: "1980-01-01 14:10 M (외부 명반 대조본)", gender: "M", year: 1980, month: 1, day: 1, hour: 14, minute: 10 },
  { label: "1991-02-20 08:30 M", gender: "M", year: 1991, month: 2, day: 20, hour: 8, minute: 30 },
  { label: "1991-09-02 11:45 F", gender: "F", year: 1991, month: 9, day: 2, hour: 11, minute: 45 },
  { label: "2000-01-01 12:00 F", gender: "F", year: 2000, month: 1, day: 1, hour: 12, minute: 0 },
];
// 1980~1991 = 12 생년지 전부, 정오(오시). 1992~2003 = 다시 12 생년지, 자정 직후(자시).
for (let year = 1980; year <= 1991; year += 1) {
  CASES.push({ label: `${year}-06-15 12:00 M`, gender: "M", year, month: 6, day: 15, hour: 12, minute: 0 });
}
for (let year = 1992; year <= 2003; year += 1) {
  CASES.push({ label: `${year}-10-08 00:20 F`, gender: "F", year, month: 10, day: 8, hour: 0, minute: 20 });
}

// ── 엔진별 별 → 지지 인덱스 ────────────────────────────────────────────────
function shellPlacement(subject) {
  const chart = calcChart({ gender: subject.gender, year: subject.year, month: subject.month, day: subject.day, hour: subject.hour, minute: subject.minute });
  const map = new Map();
  for (const palace of chart.palaceStarData) {
    const index = branchIndexOf(palace.branch);
    for (const row of [...palace.stars, ...palace.auxStars, ...palace.badStars]) {
      // 차성(借星)은 이웃 궁에서 빌려 온 표시일 뿐 실제 배치가 아니다.
      if (row.borrowed) continue;
      map.set(row.name, index);
    }
  }
  return { map, lunarMonth: Math.abs(Number(chart.lunarMonth)), lunarDay: Number(chart.lunarDay), bureau: bureauNumberOf(chart.juInfo) };
}

function workerPlacement(subject) {
  const pad = (n) => String(n).padStart(2, "0");
  const chart = calculateZiweiAiChart({
    birthInfo: {
      birthDate: `${subject.year}-${pad(subject.month)}-${pad(subject.day)}`,
      birthTime: `${pad(subject.hour)}:${pad(subject.minute)}`,
      gender: subject.gender === "M" ? "male" : "female",
      calendarType: "solar",
    },
  }, { year: 2026 });
  const map = new Map();
  for (const palace of chart.palaces) {
    for (const name of [...palace.mainStars, ...palace.assistantStars, ...palace.maleficStars]) {
      map.set(name, palace.branchIndex);
    }
  }
  return { map, lunarMonth: Math.abs(Number(chart.lunar?.month)), lunarDay: Number(chart.lunar?.day), bureau: bureauNumberOf(chart.bureau?.name) };
}

/** '목3국(木三局)'·'목삼국'·'목3국' → 국수 3. 세 엔진이 표기를 달리 쓰므로 숫자만 뽑는다. */
const BUREAU_NUMBER_BY_ELEMENT = { 수: 2, 목: 3, 금: 4, 토: 5, 화: 6 };
function bureauNumberOf(label) {
  const element = String(label || "").trim().charAt(0);
  return BUREAU_NUMBER_BY_ELEMENT[element] ?? -1;
}

function appPlacement(calcAppPalaces, subject) {
  const chart = calcAppPalaces(subject.year, subject.month, subject.day, subject.hour, subject.minute, subject.gender);
  const map = new Map();
  for (const palace of chart.palaceStarData) {
    const index = branchIndexOf(palace.branch);
    for (const row of [...palace.stars, ...palace.auxStars, ...palace.badStars]) {
      map.set(row.name, index);
    }
  }
  // 대한 시작 나이는 국수와 같다(목3국 → 3세 시작). 라벨과 대한이 어긋나면 명반이 자기모순이다.
  const mingDahan = chart.palaceStarData.find((palace) => palace.palace === "명궁")?.dahan || "";
  return { map, bureau: bureauNumberOf(chart.juInfo), dahanStartAge: Number(String(mingDahan).split("-")[0]) };
}

// ══ 검사 시작 ══════════════════════════════════════════════════════════════
const calcAppPalaces = await loadAppEngine();

// ── ① 소스에서 발견한 별이 전부 등록부에 분류돼 있다 (fail-closed) ─────────
{
  const discovered = {
    셸: discoverShellStars(),
    워커: discoverWorkerStars(),
    앱: discoverAppStars(),
  };
  for (const [engine, names] of Object.entries(discovered)) {
    ok(`① ${engine} 소스에서 별 배치를 실제로 발견했다`, names.size >= 20, `발견 ${names.size}개`);
    const unclassified = [...names].filter((name) => !CLASSIFIED.has(name));
    ok(
      `① ${engine} 에 등록부 미분류 별이 없다`,
      unclassified.length === 0,
      `미분류=${JSON.stringify(unclassified)} — SHARED_STARS 나 WORKER_ONLY_STARS 에 사유와 함께 등록할 것`,
    );
  }
  for (const [engine, names] of Object.entries(discovered)) {
    const missing = SHARED_STARS.filter((name) => !names.has(name));
    ok(`① ${engine} 이 공용 별 ${SHARED_STARS.length}개를 모두 배치한다`, missing.length === 0, `누락=${JSON.stringify(missing)}`);
  }
  ok(
    "① 셸·앱은 워커 전용 별을 배치하지 않는다",
    WORKER_ONLY_STARS.every((name) => !discovered.셸.has(name) && !discovered.앱.has(name)),
    `셸=${JSON.stringify([...discovered.셸].filter((n) => WORKER_ONLY_STARS.includes(n)))} 앱=${JSON.stringify([...discovered.앱].filter((n) => WORKER_ONLY_STARS.includes(n)))}`,
  );
}

// ── ② 워커 카탈로그가 실제 배치와 일치한다 ─────────────────────────────────
// 워커는 출력 직전에 카탈로그로 필터링한다. 카탈로그에 없는 별은 조용히 사라지고,
// 카탈로그에만 있고 배치가 없는 별은(예전 천마) 명암표만 살아 있는 유령이 된다.
{
  const { MAIN_STARS, ASSISTANT_STARS, MALEFIC_STARS } = __ziweiAiChartTestUtils;
  const catalog = new Set([...MAIN_STARS, ...ASSISTANT_STARS, ...MALEFIC_STARS]);
  const placed = discoverWorkerStars();
  const onlyInCatalog = [...catalog].filter((name) => !placed.has(name));
  const onlyInPlacement = [...placed].filter((name) => !catalog.has(name));
  ok("② 워커 카탈로그에만 있고 배치가 없는 별이 없다", onlyInCatalog.length === 0, `카탈로그 전용=${JSON.stringify(onlyInCatalog)}`);
  ok("② 워커 배치에만 있고 카탈로그에 없는 별이 없다", onlyInPlacement.length === 0, `배치 전용=${JSON.stringify(onlyInPlacement)}`);
}

// ── ③ 셸의 화성·영성 기점 리터럴이 공용 상수와 같다 ────────────────────────
// 셸은 브라우저 클래식 스크립트라 lib/ 을 import 하지 못한다. 그래서 리터럴을 파싱해 대조한다.
{
  const src = readSource("js/saju-engine.js");
  const block = /var hlStart = \{([\s\S]*?)\};/.exec(src);
  ok("③ 셸에서 hlStart 표를 찾았다", Boolean(block), "js/saju-engine.js 의 화성·영성 기점 리터럴이 사라졌거나 형태가 바뀌었다");
  if (block) {
    const shellTable = new Array(12).fill(null);
    for (const m of block[1].matchAll(/'(.)'\s*:\s*\{\s*h:\s*(\d+)\s*,\s*l:\s*(\d+)\s*\}/g)) {
      const index = branchIndexOf(m[1]);
      if (index >= 0) shellTable[index] = [Number(m[2]), Number(m[3])];
    }
    ok("③ 셸 hlStart 가 12 생년지를 모두 덮는다", shellTable.every(Boolean), JSON.stringify(shellTable));
    const shared = FIRE_BELL_START_BY_YEAR_BRANCH.map((pair) => [...pair]);
    ok(
      "③ 셸 hlStart = lib/ziwei-fire-bell.js 의 FIRE_BELL_START_BY_YEAR_BRANCH",
      JSON.stringify(shellTable) === JSON.stringify(shared),
      `셸=${JSON.stringify(shellTable)}\n      공용=${JSON.stringify(shared)}`,
    );
  }
}

// ── ④ 케이스별 3-엔진 배치 대조 ────────────────────────────────────────────
{
  const mismatches = [];
  const collisions = [];
  const missing = [];
  const calendarDrift = [];
  const bureauDrift = [];
  for (const subject of CASES) {
    const shellChart = shellPlacement(subject);
    const workerChart = workerPlacement(subject);
    // ⑤ 음력월·음력일이 갈리면 자미 위치가 밀려 14주성이 통째로 어긋난다.
    // 그건 배치 규칙이 아니라 달력 문제이므로 별도로 잡아 낸다(위 CASES 머리말 참고).
    if (shellChart.lunarMonth !== workerChart.lunarMonth || shellChart.lunarDay !== workerChart.lunarDay) {
      calendarDrift.push(
        `${subject.label} · 셸=${shellChart.lunarMonth}월 ${shellChart.lunarDay}일 · 워커=${workerChart.lunarMonth}월 ${workerChart.lunarDay}일`,
      );
    }
    const appChart = appPlacement(calcAppPalaces, subject);
    // ⑥ 오국 명칭은 국수에 고정된다. 앱은 오래 2·3·6 이 서로 밀려 있어서, 대한이 3세에 시작하는
    // 목3국 명반에 "화6국"이라 적혀 있었다 — 자기 출력끼리 모순인 상태였다.
    if (!(shellChart.bureau === workerChart.bureau && workerChart.bureau === appChart.bureau && appChart.bureau > 0)) {
      bureauDrift.push(`${subject.label} · 셸=${shellChart.bureau}국 워커=${workerChart.bureau}국 앱=${appChart.bureau}국`);
    }
    if (appChart.bureau !== appChart.dahanStartAge) {
      bureauDrift.push(`${subject.label} · 앱 라벨=${appChart.bureau}국 인데 명궁 대한은 ${appChart.dahanStartAge}세 시작`);
    }
    const engines = {
      셸: shellChart.map,
      워커: workerChart.map,
      앱: appChart.map,
    };
    for (const [engine, map] of Object.entries(engines)) {
      // 화성·영성은 서로 다른 궁에 앉아야 한다. 겹치면 기점 규칙이 무너진 것이다.
      if (map.has("화성") && map.has("영성") && map.get("화성") === map.get("영성")) {
        collisions.push(`${subject.label} · ${engine} · 화성=영성=${BRANCH_HANJA[map.get("화성")]}`);
      }
      for (const name of SHARED_STARS) {
        if (!map.has(name)) missing.push(`${subject.label} · ${engine} · ${name} 미배치`);
      }
    }
    for (const name of SHARED_STARS) {
      const shell = engines.셸.get(name);
      if (shell === undefined) continue;
      for (const engine of ["워커", "앱"]) {
        const actual = engines[engine].get(name);
        if (actual === undefined) continue;
        if (actual !== shell) {
          mismatches.push(`${subject.label} · ${name} · 셸=${BRANCH_HANJA[shell]} ${engine}=${BRANCH_HANJA[actual]}`);
        }
      }
    }
  }
  ok(`④ ${CASES.length}건 전부에서 공용 별이 세 엔진에 모두 있다`, missing.length === 0, missing.slice(0, 12).join("\n      "));
  ok(`④ ${CASES.length}건 전부에서 화성·영성이 같은 궁에 겹치지 않는다`, collisions.length === 0, collisions.slice(0, 12).join("\n      "));
  ok(
    `④ ${CASES.length}건 전부에서 워커·앱의 별 위치가 셸과 일치한다`,
    mismatches.length === 0,
    `불일치 ${mismatches.length}건\n      ${mismatches.slice(0, 20).join("\n      ")}`,
  );
  ok(
    `⑤ ${CASES.length}건 전부에서 셸·워커의 음력월·음력일이 같다`,
    calendarDrift.length === 0,
    `달력 드리프트 ${calendarDrift.length}건 — js/saju-engine.js 의 KASI_LOCAL_PATCH_SEED 를 볼 것\n      ${calendarDrift.slice(0, 12).join("\n      ")}`,
  );
  ok(
    `⑥ ${CASES.length}건 전부에서 오행국이 세 엔진에 같고, 앱의 국 명칭이 자기 대한과 맞는다`,
    bureauDrift.length === 0,
    `불일치 ${bureauDrift.length}건\n      ${bureauDrift.slice(0, 12).join("\n      ")}`,
  );
}

if (failures.length) {
  console.error(`[verify:ziwei-star-parity] 실패 ${failures.length}건 / 검사 ${checks}건 · 대조 인물 ${CASES.length}명`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[verify:ziwei-star-parity] 통과 — 검사 ${checks}건 · 대조 인물 ${CASES.length}명 · 공용 별 ${SHARED_STARS.length}개`);
