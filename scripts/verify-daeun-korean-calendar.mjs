#!/usr/bin/env node
/**
 * 대운 단일 출처 가드 — "대운도 한국 음양력 코어 하나에서만 나온다".
 *
 *   node scripts/verify-daeun-korean-calendar.mjs [--report]
 *
 * 🔴 LLM 실호출 없음. 네트워크 없음. DB 없음.
 *
 * ── 이 가드의 핵심은 검사 ① 하나다 ──────────────────────────────────────────
 * 대운의 기운 나이는 **유파마다 절사 관례가 갈린다.** 그래서 이 이관은 "더 정확한 계산으로
 * 바꾸는 것"이 아니라 **관례를 그대로 재현하고 달력만 바꾸는 것**이어야 한다. 그러지 않으면
 * 기존 사용자의 대운 나이가 이유 없이 전부 움직인다.
 *
 * 그 사실을 주장이 아니라 **측정**으로 남긴다. `daeunFromFrame` 은 표를 안 읽고 절기를 인자로
 * 받으므로, **같은 함수에 lunar-javascript 자신의 절기·세차·월주를 먹이면** 그 라이브러리와
 * 한 글자도 다르지 않아야 한다. 잔차가 1건이라도 나오면 그것은 포팅 버그다.
 * (verify:korean-calendar-divergence 가 음력에서 하는 것과 같은 구조다.)
 *
 * ② 그 다음에 KST 절기로 바꾸면 값이 **실제로** 움직이는지 잰다. 안 움직이면 이관이 무의미하고,
 *    움직이는 폭을 모르면 회귀와 구분할 수 없다.
 * ③④ 소비자(정적 셸 · 워커 2벌)를 **실제로 실행해** 코어와 같은 대운을 내는지 본다.
 *
 * 🔴 왜 CST 쪽이 틀렸나: 사용자의 생시는 KST 벽시계인데 lunar-javascript 의 절기는 CST 벽시계다.
 * 대운은 그 둘 사이의 **시진(2시간) 수**를 세므로, 두 축이 60분 어긋난 채로 세고 있었다.
 * PR-D2 가 월건에서 고친 것과 같은 결함이 대운에 남아 있던 것이다.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { Solar } from "lunar-javascript";

import { daeun, daeunFromFrame } from "../lib/korean-calendar/index.js";

const require = createRequire(import.meta.url);
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

const STEM_HANJA = "甲乙丙丁戊己庚辛壬癸";
const BRANCH_HANJA = "子丑寅卯辰巳午未申酉戌亥";
const pad2 = (v) => String(v).padStart(2, "0");
const pillarOf = (cycle) =>
  cycle.stemIndex === null ? "" : STEM_HANJA[cycle.stemIndex] + BRANCH_HANJA[cycle.branchIndex];
const solarParts = (s) => ({
  year: s.getYear(), month: s.getMonth(), day: s.getDay(),
  hour: s.getHour(), minute: s.getMinute(), second: s.getSecond(),
});

/**
 * 표본은 손으로 안 적는다 — 해·달·시각·성별을 훑어 만든다.
 * 🔴 **말일(1/31 · 2/29 · 3/31 · 5/31)을 반드시 넣는다.** 기운 시작일은 생일에 년·월·일을
 * 순서대로 더해 구하는데 그 순서와 월말 보정이 관례의 일부다 — 말일 표본이 없으면 그 줄을
 * 통째로 지워도 가드가 초록으로 통과한다(음성 테스트에서 실제로 그랬다).
 */
function* birthMoments({ fromYear, toYear, yearStep }) {
  const exists = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDate() === d;
  for (let year = fromYear; year <= toYear; year += yearStep) {
    for (const [month, day] of [[1, 5], [1, 31], [2, 4], [2, 29], [3, 20], [3, 31], [5, 5], [5, 31], [8, 7], [11, 7], [12, 21]]) {
      if (!exists(year, month, day)) continue;
      for (const hour of [0, 3, 11, 22, 23]) {
        for (const gender of ["M", "F"]) {
          yield { year, month, day, hour, minute: (hour * 7 + day) % 60, gender };
        }
      }
    }
  }
}

// ── ① 관례 재현 — 중국 표준시 프레임을 먹이면 lunar-javascript 와 잔차 0 ─────
{
  const rows = [];
  let probes = 0;
  for (const at of birthMoments({ fromYear: 1902, toYear: 2098, yearStep: 1 })) {
    const lunar = Solar.fromYmdHms(at.year, at.month, at.day, at.hour, at.minute, 0).getLunar();
    const yun = lunar.getEightChar().getYun(at.gender === "M" ? 1 : 0);
    const monthGz = lunar.getMonthInGanZhiExact();

    const mine = daeunFromFrame({
      birth: { year: at.year, month: at.month, day: at.day, hour: at.hour, minute: at.minute },
      yearStemIndex: lunar.getYearGanIndexExact(),
      monthPillar: {
        stemIndex: STEM_HANJA.indexOf(monthGz[0]),
        branchIndex: BRANCH_HANJA.indexOf(monthGz[1]),
      },
      prevNode: solarParts(lunar.getPrevJie().getSolar()),
      nextNode: solarParts(lunar.getNextJie().getSolar()),
      gender: at.gender,
    });
    probes += 1;

    const stamp = `${at.year}-${pad2(at.month)}-${pad2(at.day)} ${pad2(at.hour)}:${pad2(at.minute)} ${at.gender}`;
    if (!mine) { rows.push(`${stamp} → null`); continue; }
    if (mine.forward !== yun.isForward()) { rows.push(`${stamp} 순역 ${mine.forward} vs ${yun.isForward()}`); continue; }
    if (mine.start.years !== yun.getStartYear() || mine.start.months !== yun.getStartMonth() || mine.start.days !== yun.getStartDay()) {
      rows.push(`${stamp} 기운 ${mine.start.years}/${mine.start.months}/${mine.start.days} vs ${yun.getStartYear()}/${yun.getStartMonth()}/${yun.getStartDay()}`);
      continue;
    }
    /* 🔴 기운 **시작일**까지 본다. years/months/days 만 대조하면 그 셋을 생일에 더하는
       순서와 월말 보정(2/29 → 2/28)을 통째로 지워도 통과한다 — 음성 테스트에서 실제로 그랬다.
       그 보정이 값을 바꾸는 것은 2/29 출생처럼 말일에서 달을 옮길 때뿐이고, 그때도 바뀌는 것은
       시작 '일' 이라 연도만 보는 대운 칸에는 대개 안 드러난다. */
    const mineStart = `${mine.startSolar.year}-${pad2(mine.startSolar.month)}-${pad2(mine.startSolar.day)}`;
    if (mineStart !== yun.getStartSolar().toYmd()) {
      rows.push(`${stamp} 기운 시작일 ${mineStart} vs ${yun.getStartSolar().toYmd()}`);
      continue;
    }
    const list = yun.getDaYun();
    for (let i = 0; i < 10; i += 1) {
      const a = mine.cycles[i];
      const b = list[i];
      if (a.startYear !== b.getStartYear() || a.endYear !== b.getEndYear() ||
          a.startAge !== b.getStartAge() || a.endAge !== b.getEndAge() ||
          pillarOf(a) !== b.getGanZhi()) {
        rows.push(`${stamp} #${i} 코어 ${a.startYear}-${a.endYear}/${a.startAge}-${a.endAge}/${pillarOf(a) || "''"} vs lunar ${b.getStartYear()}-${b.getEndYear()}/${b.getStartAge()}-${b.getEndAge()}/${b.getGanZhi() || "''"}`);
        break;
      }
    }
  }
  ok("① 관례 재현 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 10000, `표본 ${probes}건`);
  ok(
    "① 🔴 중국 표준시 프레임을 먹이면 lunar-javascript 와 **잔차 0** 이다(포팅이 관례 재현임의 증명)",
    rows.length === 0,
    rows.slice(0, 10).join("\n      "),
  );
}

// ── ② KST 로 바꾸면 값이 실제로 움직인다 ────────────────────────────────────
//
// 움직이는 것이 이 이관의 목적이다. 0 이면 아무것도 안 고친 것이고, 폭을 안 재면 회귀와 구분이 안 된다.
let divergence = null;
{
  let probes = 0;
  let moved = 0;
  let forwardFlips = 0;
  let entryAgeMoved = 0;
  for (const at of birthMoments({ fromYear: 1950, toYear: 2035, yearStep: 1 })) {
    const mine = daeun(at, { gender: at.gender });
    const yun = Solar.fromYmdHms(at.year, at.month, at.day, at.hour, at.minute, 0)
      .getLunar().getEightChar().getYun(at.gender === "M" ? 1 : 0);
    probes += 1;
    const flipped = mine.forward !== yun.isForward();
    const startMoved = mine.start.years !== yun.getStartYear()
      || mine.start.months !== yun.getStartMonth()
      || mine.start.days !== yun.getStartDay();
    const ageMoved = mine.cycles[1].startAge !== yun.getDaYun()[1].getStartAge();
    if (flipped) forwardFlips += 1;
    if (ageMoved) entryAgeMoved += 1;
    if (flipped || startMoved || ageMoved) moved += 1;
  }
  divergence = { probes, moved, forwardFlips, entryAgeMoved };
  ok("② 이관 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 5000, `표본 ${probes}건`);
  ok(
    "② KST 절기로 바꾸면 값이 실제로 움직인다(0 이면 이관이 무의미하다)",
    moved > 0,
    `${moved}/${probes}건`,
  );
}

// ── ③ 정적 셸 — lunar-javascript 전역 **없이** 대운을 낸다 ──────────────────
{
  let evalError = null;
  try {
    const harness = require(path.join(root, "scripts/lib/ziwei-engine-harness.cjs"));
    harness.bootstrapDom();
    delete globalThis.Solar;
    delete globalThis.Lunar;
    for (const relative of ["js/core/korean-calendar.js", "js/saju-engine.js"]) {
      const abs = path.join(root, relative);
      vm.runInThisContext(fs.readFileSync(abs, "utf8"), { filename: abs });
    }
  } catch (err) {
    evalError = err;
  }
  ok("③ 셸이 lunar-javascript 전역 없이 평가된다", !evalError, evalError ? String(evalError?.message || evalError) : "");

  const attach = globalThis.attachKasiDaewunBridge;
  ok("③ attachKasiDaewunBridge 가 전역에 있다", typeof attach === "function", `typeof=${typeof attach}`);

  if (typeof attach === "function") {
    const rows = [];
    let probes = 0;
    for (const at of birthMoments({ fromYear: 1950, toYear: 2035, yearStep: 3 })) {
      const bazi = {};
      attach(bazi, { year: at.year, month: at.month, day: at.day, hour: at.hour, minute: at.minute });
      probes += 1;
      if (typeof bazi.getYun !== "function") { rows.push(`${at.year}-${at.month}-${at.day} 브리지 미부착`); continue; }
      const yun = bazi.getYun(at.gender === "M" ? 1 : 0);
      const core = daeun(at, { gender: at.gender });
      const list = yun?.getDaYun?.() || [];
      for (let i = 1; i < 10; i += 1) {
        if (list[i]?.getGanZhi() !== pillarOf(core.cycles[i]) || list[i]?.getStartAge() !== core.cycles[i].startAge) {
          rows.push(`${at.year}-${at.month}-${at.day} ${at.gender} #${i} 셸 ${list[i]?.getGanZhi()}/${list[i]?.getStartAge()} vs 코어 ${pillarOf(core.cycles[i])}/${core.cycles[i].startAge}`);
          break;
        }
      }
    }
    ok("③ 셸 대운 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 500, `표본 ${probes}건`);
    ok("③ 셸의 대운이 코어와 전건 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
  }
}

// ── ④ 워커 소비자 — 실제로 실행한다 ────────────────────────────────────────
{
  const { calculateLifeBookAiSaju } = await import("../worker/lib/life-book-ai-saju.js");
  const rows = [];
  let probes = 0;
  for (const at of birthMoments({ fromYear: 1950, toYear: 2035, yearStep: 5 })) {
    const result = calculateLifeBookAiSaju({
      birthDate: `${at.year}-${pad2(at.month)}-${pad2(at.day)}`,
      birthTime: `${pad2(at.hour)}:${pad2(at.minute)}`,
      gender: at.gender === "M" ? "male" : "female",
      calendarType: "solar",
    });
    const core = daeun(at, { gender: at.gender });
    probes += 1;
    const luck = result?.majorLuck;
    if (!luck?.available) { rows.push(`${at.year}-${at.month}-${at.day} majorLuck 미제공: ${luck?.reason || "?"}`); continue; }
    if ((luck.direction === "순행") !== core.forward) {
      rows.push(`${at.year}-${at.month}-${at.day} ${at.gender} 순역 ${luck.direction} vs 코어 ${core.forward ? "순행" : "역행"}`);
      continue;
    }
    if (luck.startAfterBirth.years !== core.start.years || luck.startAfterBirth.months !== core.start.months || luck.startAfterBirth.days !== core.start.days) {
      rows.push(`${at.year}-${at.month}-${at.day} ${at.gender} 기운 ${JSON.stringify(luck.startAfterBirth)} vs 코어 ${JSON.stringify(core.start)}`);
      continue;
    }
    const cycle = luck.cycles?.[1];
    if (!cycle || cycle.startAge !== core.cycles[1].startAge || cycle.pillar !== pillarOf(core.cycles[1])) {
      rows.push(`${at.year}-${at.month}-${at.day} ${at.gender} #1 ${cycle?.pillar}/${cycle?.startAge} vs 코어 ${pillarOf(core.cycles[1])}/${core.cycles[1].startAge}`);
    }
  }
  ok("④ 워커 소비자 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 200, `표본 ${probes}건`);
  ok("④ life-book 의 대운이 코어와 전건 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
}

// ── ⑤ 잔존 발견 — lunar-javascript 를 아직 import 하는 제품 소스 ────────────
//
// 🔴 `.getYun(` 을 세지 않는다. 셸의 attachKasiDaewunBridge 가 **코어 대운을 그 이름으로**
// 붙여 주므로(소비자 4곳의 호출부를 안 건드리려고 그렇게 했다) 이름만으로는 두 출처를 못 가른다.
// 대신 **import 축**을 센다 — 이 라이브러리를 아직 끌어오는 파일이 곧 남은 일감이다.
// ③④ 가 소비자를 실제로 실행해 값이 코어에서 나오는지는 이미 증명했다.
//
// 🔴 `scripts/` 는 안 본다(verify:lunar-conversion-core 와 같은 이유 — 이 파일이 가진
// scripts/verify-*.mjs 문자열을 verify:guard-wiring 이 배선 간선으로 오독한다).
{
  const SCAN_DIRS = ["js", "worker", "app", "lib", "src"];
  const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
  const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "out", ".wrangler", "build-cache"]);
  // 🔴 정규식은 매 호출마다 새로 만든다 — /g 플래그가 없어 lastIndex 문제는 없지만, 한 곳에 모아
  // 두어야 아래 탐지기 자기검사(detectorProbe)가 **같은 패턴**을 검사한다.
  const IMPORT_PATTERN = /from\s+["']lunar-javascript["']|require\(\s*["']lunar-javascript["']\s*\)|import\(\s*["']lunar-javascript["']\s*\)/;

  // 🔴 2026-08-28(PR-F2) 부터 **제품 소스의 lunar-javascript import 는 0 이어야 한다.**
  // 예전에는 여기에 잔존 목록(KNOWN_REMAINING)이 있었고 "줄어들기만 해야 한다" 를 지켰다.
  // 이제 목표에 도달했으므로 단언을 뒤집는다 — 하나라도 되살아나면 그 자리에서 빨간불이다.
  // 🔴 라이브러리 자체를 지우지는 않았다. 이 가드를 포함한 달력 가드 5개가 **대조 대상**으로 읽는다.

  function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || SKIP_DIR_NAMES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
    }
    return out;
  }
  function stripComments(source) {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      // 🔴 `$` 앵커를 쓰지 않는다 — CRLF 파일에서 행 끝 \r 이 `.` 에 안 잡혀 앵커가 막힌다.
      .map((line) => line.replace(/(^|[^:])\/\/.*/, "$1"))
      .join("\n");
  }

  const found = [];
  let scanned = 0;
  for (const dirName of SCAN_DIRS) {
    const dir = path.join(root, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir, [])) {
      const relative = path.relative(root, file).split(path.sep).join("/");
      if (relative === "js/core/korean-calendar.js") continue; // 코어 생성물
      scanned += 1;
      const code = stripComments(fs.readFileSync(file, "utf8"));
      if (!IMPORT_PATTERN.test(code)) continue;
      found.push(relative);
    }
  }
  ok("⑤ 스캔이 실제로 소스를 읽었다(0 이면 가드가 깨진 것)", scanned >= 200, `${scanned}개 파일`);
  ok(
    "⑤ 제품 소스에 lunar-javascript import 가 하나도 없다",
    found.length === 0,
    found.join("\n      "),
  );
  // 🔴 탐지가 살아 있는지 확인한다 — 정규식이 깨져 0 을 내는 것과 실제로 0 인 것은 다르다.
  const detectorProbe = [
    'import { Solar } from "lunar-javascript";',
    'const { Lunar } = require("lunar-javascript");',
    'await import("lunar-javascript");',
  ].filter((line) => IMPORT_PATTERN.test(stripComments(line)));
  ok("⑤ import 탐지기가 살아 있다(스텁 3종을 실제로 잡는다)", detectorProbe.length === 3, `${detectorProbe.length}/3`);
}

if (failures.length) {
  console.error(`[verify:daeun-korean-calendar] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(
  `[verify:daeun-korean-calendar] OK — 검사 ${checks}건 · 관례 재현 잔차 0 · ` +
    `KST 전환으로 ${divergence.moved}/${divergence.probes}건(${(divergence.moved / divergence.probes * 100).toFixed(2)}%) 이동 ` +
    `(순역 ${divergence.forwardFlips} · 1번 대운 시작나이 ${divergence.entryAgeMoved})`,
);
