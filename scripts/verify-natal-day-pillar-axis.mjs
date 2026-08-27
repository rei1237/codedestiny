#!/usr/bin/env node
/**
 * 원국 일주·시주 축 가드 — "야자시 축을 각 소비자가 **명시**하고, 그 값이 코어에서 나온다".
 *
 *   node scripts/verify-natal-day-pillar-axis.mjs [--report] [--self-test]
 *
 * 🔴 LLM 실호출 없음. 네트워크 없음. DB 없음.
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────────────
 * 23시대(23:00~23:59) 출생의 일진을 어느 날로 볼 것인가는 **유파 결정**이고, 이 레포는
 * 표면마다 답이 다르다(2026-08-28 실측):
 *
 *   정적 셸 `_cdCivilDayPillar`            shift-day  (하드코딩)
 *   App Router `localSajuCalculator`       keep-day   (zashiMode 기본 "late", 사용자 선택 가능)
 *   worker/lib/life-book-ai-saju.js        keep-day   ← 이 가드가 지킨다
 *   worker/routes/new-year-ai.js           keep-day   ← 이 가드가 지킨다
 *   worker/lib/destiny-bias-engine.js      dayChangePolicy 가 정한다(기본 MIDNIGHT=keep-day)
 *
 * 이관 전 워커 2곳은 lunar-javascript sect 2 의 **혼종**이었다 — 일진은 안 밀면서(keep-day)
 * 시주 천간만 민 날의 일간으로 뽑았다(shift-day). 인정된 유파가 아니라 구현 특성이고, 어느
 * 정책으로도 그대로 재현되지 않아 PR-F2 에서 keep-day 로 정리했다.
 *
 * 🔴 그래서 이 가드가 지키는 것은 "어느 축이 옳은가"가 아니다. **축이 코드에 명시돼 있고,
 * 코어 기본값에 기대지 않으며, 실행 결과가 그 축과 일치한다**는 세 가지다. 코어 기본값
 * (shift-day)에 기대면 그 기본값이 바뀌는 날 이 값들이 조용히 따라간다.
 *
 *   ① 세 소비자가 nightZiPolicy 를 **소스에 명시**한다(기본값 의존 0)
 *   ② life-book·new-year 를 **실제로 실행**해 네 기둥이 코어 keep-day 와 전건 같다
 *   ③ destiny-bias 의 정책 3종이 코어 정책과 1:1 로 대응한다(실행 대조)
 *   ④ 23시대에서 두 정책이 **실제로 갈린다**(안 갈리면 이 가드가 아무것도 안 지킨다)
 *   ⑤ 제품 소스에 lunar-javascript import 가 0건이다(fail-closed)
 *
 * 🔴 `scripts/` 는 스캔하지 않는다 — 이 파일이 가진 스크립트 경로 문자열을 verify:guard-wiring
 * 이 배선 간선으로 오독한다(verify:lunar-conversion-core 와 같은 이유).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BRANCH_HANJA,
  NIGHT_ZI_POLICY,
  STEM_HANJA,
  ganji,
} from "../lib/korean-calendar/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const REPORT = process.argv.includes("--report");
const SELF_TEST = process.argv.includes("--self-test");

const failures = [];
let checks = 0;
function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
}

const pad2 = (v) => String(v).padStart(2, "0");
const pill = (p) => STEM_HANJA[p.stemIndex] + BRANCH_HANJA[p.branchIndex];
const HANJA_TO_KO = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};
const toKo = (value) => String(value || "").split("").map((c) => HANJA_TO_KO[c] || c).join("");

function corePillars(at, policy) {
  const core = ganji(at, { nightZiPolicy: policy });
  if (!core) return null;
  return { year: pill(core.year), month: pill(core.month), day: pill(core.day), hour: pill(core.hour) };
}

/** 표본 생시. 23시대를 **반드시** 포함한다 — 두 정책이 거기서만 갈린다. */
function* birthMoments({ fromYear = 1930, toYear = 2030, yearStep = 1 } = {}) {
  for (let year = fromYear; year <= toYear; year += yearStep) {
    for (const month of [2, 6, 10]) {
      const day = ((year + month) % 27) + 1;
      for (const hour of [0, 8, 17, 23]) {
        yield { year, month, day, hour, minute: (year + month) % 60 };
      }
    }
  }
}

// ── ① 축을 소스에 명시했는가 ───────────────────────────────────────────────
//
// 🔴 "코어를 쓴다"로는 부족하다. nightZiPolicy 를 안 넘기면 코어 기본값(shift-day)이 적용되고,
// 그러면 이 파일들의 23시대 값이 코어 기본값 변경에 조용히 끌려간다.
{
  const CONSUMERS = [
    ["worker/lib/life-book-ai-saju.js", "NIGHT_ZI_POLICY.KEEP_DAY"],
    ["worker/routes/new-year-ai.js", "NIGHT_ZI_POLICY.KEEP_DAY"],
    // destiny-bias 는 사용자가 고르는 정책이라 두 값을 다 갖는다.
    ["worker/lib/destiny-bias-engine.js", "NIGHT_ZI_POLICY.SHIFT_DAY"],
    ["worker/lib/destiny-bias-engine.js", "NIGHT_ZI_POLICY.KEEP_DAY"],
  ];
  let read = 0;
  const missing = [];
  for (const [relative, needle] of CONSUMERS) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) { missing.push(`${relative} 파일 없음`); continue; }
    const code = fs.readFileSync(file, "utf8");
    read += 1;
    if (!code.includes(needle)) missing.push(`${relative} 에 ${needle} 없음`);
    // ganji( 를 부르면서 nightZiPolicy 를 한 번도 안 넘기면 기본값에 기댄 것이다.
    if (code.includes("ganji(") && !code.includes("nightZiPolicy")) {
      missing.push(`${relative} 가 ganji() 를 부르면서 nightZiPolicy 를 명시하지 않는다`);
    }
  }
  ok("① 소비자 소스를 실제로 읽었다(0 이면 가드가 깨진 것)", read === CONSUMERS.length, `${read}/${CONSUMERS.length}`);
  ok("① 세 소비자가 야자시 축을 소스에 명시한다", missing.length === 0, missing.join("\n      "));
}

// ── ② life-book · new-year 를 실제로 실행한다 ──────────────────────────────
{
  const { calculateLifeBookAiSaju } = await import("../worker/lib/life-book-ai-saju.js");
  const { __newYearAiTestUtils } = await import("../worker/routes/new-year-ai.js");
  const { calculateNewYearFortuneData } = __newYearAiTestUtils;

  const rows = [];
  let probes = 0;
  let nightProbes = 0;
  for (const at of birthMoments({ yearStep: 2 })) {
    const want = corePillars(at, NIGHT_ZI_POLICY.KEEP_DAY);
    if (!want) continue;
    const birthDate = `${at.year}-${pad2(at.month)}-${pad2(at.day)}`;
    const birthTime = `${pad2(at.hour)}:${pad2(at.minute)}`;
    probes += 1;
    if (at.hour >= 23) nightProbes += 1;

    const life = calculateLifeBookAiSaju({ birthDate, birthTime, calendarType: "solar", gender: "male" });
    const lifeGot = [life?.yearPillar, life?.monthPillar, life?.dayPillar, life?.hourPillar].join("/");
    const lifeWant = [want.year, want.month, want.day, want.hour].join("/");
    if (lifeGot !== lifeWant) rows.push(`${birthDate} ${birthTime} life-book ${lifeGot} vs 코어 ${lifeWant}`);

    const ny = calculateNewYearFortuneData({
      targetYear: 2026,
      birthInfo: { birthDate, birthTime, calendarType: "solar", gender: "male" },
    });
    const nyGot = [ny?.saju?.yearPillar, ny?.saju?.monthPillar, ny?.saju?.dayPillar, ny?.saju?.hourPillar].join("/");
    if (nyGot !== toKo(lifeWant)) rows.push(`${birthDate} ${birthTime} new-year ${nyGot} vs 코어 ${toKo(lifeWant)}`);
  }
  ok("② 원국 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 500, `표본 ${probes}건`);
  ok("② 표본에 23시대가 들어 있다(없으면 이 가드가 축을 안 지킨다)", nightProbes >= 100, `23시대 ${nightProbes}건`);
  ok("② life-book·new-year 의 네 기둥이 코어 keep-day 와 전건 같다", rows.length === 0, rows.slice(0, 10).join("\n      "));
}

// ── ③ destiny-bias 의 정책 3종이 코어와 1:1 로 대응한다 ────────────────────
{
  const { buildSajuProfile, DAY_CHANGE_POLICIES } = await import("../worker/lib/destiny-bias-engine.js");
  const EXPECTED = new Map([
    [DAY_CHANGE_POLICIES.MIDNIGHT, NIGHT_ZI_POLICY.KEEP_DAY],
    [DAY_CHANGE_POLICIES.LATE_ZI_NEXT_DAY, NIGHT_ZI_POLICY.SHIFT_DAY],
  ]);
  const rows = [];
  let probes = 0;
  for (const at of birthMoments({ fromYear: 1940, toYear: 2025, yearStep: 3 })) {
    for (const [dayPolicy, nightZi] of EXPECTED) {
      const want = corePillars(at, nightZi);
      if (!want) continue;
      probes += 1;
      const profile = buildSajuProfile({
        birth: { ...at, longitude: 126.978, latitude: 37.5665 },
        gender: "male",
        dayChangePolicy: dayPolicy,
        hourPillarTimePolicy: "KST_CLOCK_TIME",
      });
      const got = profile?.pillars?.day?.ganji || "";
      if (got !== want.day) {
        rows.push(`${at.year}-${at.month}-${at.day} ${pad2(at.hour)}시 ${dayPolicy} 일주 ${got} vs 코어 ${want.day}`);
      }
    }
  }
  ok("③ destiny-bias 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 300, `표본 ${probes}건`);
  ok("③ 정책 3종이 코어 야자시 정책과 1:1 로 대응한다", rows.length === 0, rows.slice(0, 10).join("\n      "));
}

// ── ④ 두 정책이 23시대에서 실제로 갈린다 ───────────────────────────────────
//
// 안 갈리면 위 검사들이 전부 통과하면서도 아무것도 안 지킨다(대상이 없을 때 통과시키는 가드).
{
  let night = 0;
  let split = 0;
  let daySplit = 0;
  let hourSplit = 0;
  let sameOutsideNight = 0;
  let outside = 0;
  for (const at of birthMoments({ yearStep: 1 })) {
    const keep = corePillars(at, NIGHT_ZI_POLICY.KEEP_DAY);
    const shift = corePillars(at, NIGHT_ZI_POLICY.SHIFT_DAY);
    if (!keep || !shift) continue;
    if (at.hour >= 23) {
      night += 1;
      if (keep.day !== shift.day) daySplit += 1;
      if (keep.hour !== shift.hour) hourSplit += 1;
      if (keep.day !== shift.day || keep.hour !== shift.hour) split += 1;
    } else {
      outside += 1;
      if (JSON.stringify(keep) === JSON.stringify(shift)) sameOutsideNight += 1;
    }
  }
  ok("④ 23시대 표본이 있다", night >= 100, `${night}건`);
  ok("④ 23시대에서 두 정책이 전건 갈린다(일주·시주 모두)", split === night && daySplit === night && hourSplit === night,
    `갈림 ${split}/${night} (일주 ${daySplit} · 시주 ${hourSplit})`);
  ok("④ 23시 밖에서는 두 정책이 전건 같다(축 선택이 그 구간을 안 건드린다)", sameOutsideNight === outside,
    `동일 ${sameOutsideNight}/${outside}`);
}

// ── ⑤ 잔존 스캔 — 제품 소스에 lunar-javascript import 가 없다 ──────────────
{
  const SCAN_DIRS = ["worker", "app", "lib", "src"];
  const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
  const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "out", ".wrangler", "build-cache"]);
  const IMPORT_PATTERN = /from\s+["']lunar-javascript["']|require\(\s*["']lunar-javascript["']\s*\)|import\(\s*["']lunar-javascript["']\s*\)/;

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
      scanned += 1;
      if (IMPORT_PATTERN.test(stripComments(fs.readFileSync(file, "utf8")))) found.push(relative);
    }
  }
  ok("⑤ 스캔이 실제로 소스를 읽었다(0 이면 가드가 깨진 것)", scanned >= 200, `${scanned}개 파일`);
  ok("⑤ 워커·앱·lib 에 lunar-javascript import 가 없다", found.length === 0, found.join("\n      "));

  const probe = [
    'import { Solar } from "lunar-javascript";',
    'const { Lunar } = require("lunar-javascript");',
    'await import("lunar-javascript");',
  ].filter((line) => IMPORT_PATTERN.test(stripComments(line)));
  const negative = [
    '// import { Solar } from "lunar-javascript";',
    'import { ganji } from "../../lib/korean-calendar/index.js";',
  ].filter((line) => IMPORT_PATTERN.test(stripComments(line)));
  ok("⑤ 탐지기가 살아 있다(스텁 3종을 잡고 주석·코어 import 는 안 잡는다)",
    probe.length === 3 && negative.length === 0, `양성 ${probe.length}/3 · 위양성 ${negative.length}`);
}

// ── 음성 테스트 — 파일을 안 건드리고 판정 함수만 뒤집는다 ──────────────────
if (SELF_TEST) {
  const cases = [];
  const at = { year: 2024, month: 3, day: 10, hour: 23, minute: 30 };
  const keep = corePillars(at, NIGHT_ZI_POLICY.KEEP_DAY);
  const shift = corePillars(at, NIGHT_ZI_POLICY.SHIFT_DAY);
  cases.push(["23시대에서 두 정책의 일주가 다르다", keep.day !== shift.day]);
  cases.push(["23시대에서 두 정책의 시주가 다르다", keep.hour !== shift.hour]);
  cases.push(["23시대에서 두 정책의 년·월주는 같다", keep.year === shift.year && keep.month === shift.month]);
  const noon = { ...at, hour: 12 };
  cases.push([
    "정오에는 두 정책이 완전히 같다",
    JSON.stringify(corePillars(noon, NIGHT_ZI_POLICY.KEEP_DAY)) === JSON.stringify(corePillars(noon, NIGHT_ZI_POLICY.SHIFT_DAY)),
  ]);
  const red = cases.filter(([, held]) => held).length;
  for (const [label, held] of cases) {
    if (REPORT || !held) console.log(`  ${held ? "ok  " : "✗   "}음성 ${label}`);
  }
  ok("음성 테스트 전건 성립", red === cases.length, `${red}/${cases.length}`);
}

if (failures.length) {
  console.error(`[verify:natal-day-pillar-axis] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(
  `[verify:natal-day-pillar-axis] OK — 검사 ${checks}건 · 원국 축 keep-day 명시 확인 · ` +
    "제품 소스 lunar-javascript import 0건",
);
