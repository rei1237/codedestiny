#!/usr/bin/env node
/**
 * 절기(節氣) 축 단일 출처 가드 — "사주의 월건·세차 경계는 한국 음양력 코어 하나에서만 나온다".
 *
 *   node scripts/verify-saju-solar-term-core.mjs [--report]
 *
 * 🔴 LLM 실호출 없음. 네트워크 없음.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * `lunar-javascript` 의 절기 시각은 **중국 표준시(CST, UTC+8) 벽시계**다. 이 서비스는 KST 용이라
 * 소비자마다 `+3600 * 1000` 이나 `SOLAR_TERM_BASE_OFFSET_MINUTES = 480` 같은 애드혹 보정을
 * 각자 달고 있었다. 애드혹이라 하나가 빠지면 그 엔진만 1시간 이른 경계를 쓰고,
 * 그 1시간 창에 태어난 사람은 **월건이 통째로 한 칸 밀린 채로** 결과를 받는다.
 *
 * 이 가드는 두 가지를 본다:
 *   ① 절기를 다루는 소스에 CST 애드혹 보정이 되살아나지 않았는지 — **손 목록이 아니라 전수 발견**
 *   ② 로컬 절기를 만드는 소비자 5벌이 코어와 **분 단위로 같은 12節** 을 내는지 — 실제로 실행해서
 *   ⑤ 절기 프레임 간지를 아직 lunar-javascript 로 잡는 파일 전수 — 미분류가 있으면 실패
 *   ⑥⑦⑧ 인생책·신년운세·주간월간 소비자를 실제로 돌려 코어와 대조
 *
 * ① 은 검사 대상이 0개면 실패한다. 발견이 0이라는 것은 규칙이 지켜졌다는 뜻이 아니라
 * 발견 방식이 깨졌다는 뜻이다(CLAUDE.md 코딩 원칙 10).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatPillar, ganji, nodeTerms, solarTerms, TERM_NAME_KO } from "../lib/korean-calendar/index.js";
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

/** 표본 연도 — 자정 등기부에 걸린 해와 이 작업의 발단이 된 해를 반드시 포함한다. */
const SAMPLE_YEARS = [1950, 1964, 1990, 1997, 2026, 2030, 2098];

// ── ① 절기를 다루는 소스에서 CST 애드혹 보정을 전수 발견한다 ────────────────
//
// 대상은 열거하지 않는다. `js/`·`worker/`·`app/` 아래에서 절기를 실제로 다루는 파일을
// 내용으로 골라내고(아래 SOLAR_TERM_MARKERS), 그 안에서만 금지 패턴을 찾는다.
const SCAN_DIRS = ["js", "worker", "app", "lib"];
const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "out", ".wrangler"]);

/** 이 중 하나라도 들어 있으면 "절기를 다루는 파일"이다. */
const SOLAR_TERM_MARKERS = [
  "getJieQiTable",
  "getPrevJie",
  "getNextJie",
  "nodeTerms",
  "solarTerms",
  "JIE_BOUNDARY_NAMES",
  "절기", // 절기
];

/**
 * 금지 패턴 — 절기 시각에 붙는 중국 표준시 애드혹 보정.
 * 🔴 주석은 검사 대상에서 뺀다. 이 작업이 남긴 "예전에는 +1시간을 더했다" 설명이
 * 자기 자신을 잡으면 가드가 문서를 못 쓰게 만든다.
 */
const FORBIDDEN_PATTERNS = [
  { label: "SOLAR_TERM_BASE_OFFSET_MINUTES", re: /SOLAR_TERM_BASE_OFFSET_MINUTES/ },
  { label: "절기 시각 +1시간(3600 * 1000)", re: /\+\s*3600\s*\*\s*1000\b/ },
  { label: "절기 시각 +1시간(3600000)", re: /\+\s*3600000\b/ },
  { label: "CST 오프셋 480분", re: /\b480\s*\*\s*60000\b/ },
];

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const solarTermFiles = [];
const offenders = [];
for (const dirName of SCAN_DIRS) {
  const dir = path.join(root, dirName);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir, [])) {
    const source = fs.readFileSync(file, "utf8");
    if (!SOLAR_TERM_MARKERS.some((marker) => source.includes(marker))) continue;
    const relative = path.relative(root, file).split(path.sep).join("/");
    solarTermFiles.push(relative);
    const code = stripComments(source);
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.re.test(code)) offenders.push(`${relative} — ${pattern.label}`);
    }
  }
}

ok(
  "① 절기를 다루는 파일을 실제로 발견했다(발견 0 = 가드가 깨진 것)",
  solarTermFiles.length >= 5,
  `발견 ${solarTermFiles.length}개`,
);
ok(
  "① 절기 소스에 CST 애드혹 보정이 없다",
  offenders.length === 0,
  offenders.join("\n      "),
);

// ── ② 로컬 절기 생성기들이 코어와 같은 12節 을 낸다 ─────────────────────────
//
// 세 벌(워커 라우트 · 정적 셸 · kasi-calendar-service)은 모듈 표면이 없으므로
// 소스에서 정본 함수를 그대로 잘라 실행한다(정본 패턴: scripts/verify-hour-pillar-parity.mjs).
function cut(source, pattern, label) {
  const m = source.match(pattern);
  if (!m) throw new Error(`${label}: 소스에서 함수를 찾지 못함 — ${pattern}`);
  return m[0];
}

/** `{month,day,hour,minute}` 12개(節)로 정규화. 비교는 항상 이 모양 위에서 한다. */
function normalize(rows) {
  return rows.map((r) => `${r.month}/${r.day} ${String(r.hour).padStart(2, "0")}:${String(r.minute).padStart(2, "0")}`);
}

function coreNodes(year) {
  const nodes = nodeTerms(year);
  if (!nodes) throw new Error(`코어에 ${year} 절기가 없다`);
  return normalize(nodes);
}

// A. 워커 라우트 — worker/routes/kasi.js computeLocalSolarTerms
const workerSrc = fs.readFileSync(path.join(root, "worker/routes/kasi.js"), "utf8");
const workerLocalTerms = new Function("solarTerms", "TERM_NAME_KO", `${[
  cut(workerSrc, /^function pad2[\s\S]*?^}/m, "worker pad2"),
  cut(workerSrc, /^function toInt[\s\S]*?^}/m, "worker toInt"),
  cut(workerSrc, /^function computeLocalSolarTerms[\s\S]*?^}/m, "worker computeLocalSolarTerms"),
].join("\n")}
return computeLocalSolarTerms;`)(solarTerms, TERM_NAME_KO);

// B. 정적 셸 — js/saju-engine.js computeSolarTermsForYear
const shellSrc = fs.readFileSync(path.join(root, "js/saju-engine.js"), "utf8");
const shellTermsForYear = new Function("_koreanCalendar", `${
  cut(shellSrc, /^function computeSolarTermsForYear[\s\S]*?^}/m, "shell computeSolarTermsForYear")
}
return computeSolarTermsForYear;`)(() => ({ solarTerms, TERM_NAME_KO }));

// C. 셸 서비스 — js/core/kasi-calendar-service.js _fallbackSolarTerms
const serviceSrc = fs.readFileSync(path.join(root, "js/core/kasi-calendar-service.js"), "utf8");
const serviceFallbackTerms = new Function("w", `${[
  cut(serviceSrc, /^ {2}function _toInt[\s\S]*?^ {2}}/m, "service _toInt"),
  cut(serviceSrc, /^ {2}function _pad2[\s\S]*?^ {2}}/m, "service _pad2"),
  cut(serviceSrc, /^ {2}function _fallbackSolarTerms[\s\S]*?^ {2}}/m, "service _fallbackSolarTerms"),
].join("\n")}
return _fallbackSolarTerms;`)({ KoreanCalendar: { solarTerms, TERM_NAME_KO } });

// D. Next.js 구성기학 — app/fortune/prompt-hub/kusei-calc.ts
const { getSolarTermsForYear } = loadTsModule("app/fortune/prompt-hub/kusei-calc.ts");

// E. Next.js 사주 — app/saju/animal-destiny/engine/localSajuCalculator.ts
const { calculateLocalSaju } = loadTsModule("app/saju/animal-destiny/engine/localSajuCalculator.ts");

const NODE_TERM_INDEXES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

for (const year of SAMPLE_YEARS) {
  const expected = coreNodes(year);

  // A — 24절기 전체를 내므로 節만 추린다.
  // 🔴 `locdate`·`kst`·`time` 을 함께 본다. KASI 응답을 읽는 쪽이 셋을 나눠 쓰므로
  // 한 필드만 대조하면 나머지가 조용히 어긋난 채로 통과한다.
  const workerRows = workerLocalTerms(year) || [];
  const workerNodes = NODE_TERM_INDEXES.map((termIndex) => {
    const row = workerRows.find((r) => r.dateName === TERM_NAME_KO[termIndex]);
    if (!row) return "없음";
    const fromTime = `${Number(row.solMonth)}/${Number(row.solDay)} ${row.time}`;
    const fromKst = `${Number(row.locdate.slice(4, 6))}/${Number(row.locdate.slice(6, 8))} ${row.kst.slice(0, 2)}:${row.kst.slice(2, 4)}`;
    return fromTime === fromKst ? fromTime : `필드불일치(time=${fromTime} kst=${fromKst})`;
  });
  ok(`② 워커 라우트 ${year} 12節`, workerNodes.join("|") === expected.join("|"), `${workerNodes.join(", ")}\n      기대 ${expected.join(", ")}`);

  // B
  const shellRows = shellTermsForYear(year) || [];
  const shellNodes = normalize(
    NODE_TERM_INDEXES.map((termIndex) => shellRows.find((r) => r.name === TERM_NAME_KO[termIndex]) || { month: 0, day: 0, hour: 0, minute: 0 }),
  );
  ok(`② 정적 셸 ${year} 12節`, shellNodes.join("|") === expected.join("|"), `${shellNodes.join(", ")}\n      기대 ${expected.join(", ")}`);

  // C — atLocal ISO 문자열을 낸다.
  const serviceRows = serviceFallbackTerms(year) || [];
  const serviceNodes = NODE_TERM_INDEXES.map((termIndex) => {
    const row = serviceRows.find((r) => r.name === TERM_NAME_KO[termIndex]);
    if (!row) return "없음";
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(row.atLocal);
    return m ? `${Number(m[2])}/${Number(m[3])} ${m[4]}:${m[5]}` : "형식오류";
  });
  ok(`② kasi-calendar-service ${year} 12節`, serviceNodes.join("|") === expected.join("|"), `${serviceNodes.join(", ")}\n      기대 ${expected.join(", ")}`);

  // D — 구성기학. 이미 節 12개만 낸다.
  const kusei = getSolarTermsForYear(year, "Asia/Seoul");
  const kuseiNodes = Object.values(kusei).map((term) => `${term.at.month}/${term.at.day} ${String(term.at.hour).padStart(2, "0")}:${String(term.at.minute).padStart(2, "0")}`);
  ok(`② 구성기학 ${year} 12節`, kuseiNodes.join("|") === expected.join("|"), `${kuseiNodes.join(", ")}\n      기대 ${expected.join(", ")}`);

  // E — 사주 엔진은 "그 시각이 지나온 節" 을 근거로 실어 보낸다. 節 +1분에서 그 節이 잡혀야 한다.
  const localNodes = nodeTerms(year).map((node) => {
    const at = new Date(Date.UTC(node.year, node.month - 1, node.day, node.hour, node.minute) + 60000);
    const result = calculateLocalSaju({
      hasTime: true,
      calendarType: "solar",
      timezone: "Asia/Seoul",
      hourPillarTimePolicy: "KST_CLOCK_TIME",
      year: at.getUTCFullYear(),
      month: at.getUTCMonth() + 1,
      day: at.getUTCDate(),
      hour: at.getUTCHours(),
      minute: at.getUTCMinutes(),
      gender: "male",
    });
    const active = result?.calculationEvidence?.solarTerms?.active;
    return active ? `${active.month}/${active.day} ${String(active.hour).padStart(2, "0")}:${String(active.minute).padStart(2, "0")}` : "없음";
  });
  ok(`② 사주(animal-destiny) ${year} 12節`, localNodes.join("|") === expected.join("|"), `${localNodes.join(", ")}\n      기대 ${expected.join(", ")}`);
}

// ── ③ 경계가 실제로 코어를 따르는지 — 節 ±1분에서 월건이 갈린다 ─────────────
//
// ②가 시각을 보는 검사라면 이것은 그 시각이 **판정에 쓰이는지** 보는 검사다.
// 표에는 반영됐는데 비교가 다른 값을 쓰면 ②만 통과하고 사용자 화면은 그대로 틀린다.
{
  const year = 1990;
  const ipchun = nodeTerms(year)[1];
  const probe = (deltaMinutes) => {
    const at = new Date(Date.UTC(ipchun.year, ipchun.month - 1, ipchun.day, ipchun.hour, ipchun.minute) + deltaMinutes * 60000);
    return calculateLocalSaju({
      hasTime: true,
      calendarType: "solar",
      timezone: "Asia/Seoul",
      hourPillarTimePolicy: "KST_CLOCK_TIME",
      year: at.getUTCFullYear(),
      month: at.getUTCMonth() + 1,
      day: at.getUTCDate(),
      hour: at.getUTCHours(),
      minute: at.getUTCMinutes(),
      gender: "male",
    }).pillars;
  };
  const before = probe(-1);
  const after = probe(1);
  ok("③ 1990 입춘 -1분은 전년 세차(기사)·정축월", before.year.ganji === "기사" && before.month.ganji === "정축", `${before.year.ganji}/${before.month.ganji}`);
  ok("③ 1990 입춘 +1분은 당년 세차(경오)·무인월", after.year.ganji === "경오" && after.month.ganji === "무인", `${after.year.ganji}/${after.month.ganji}`);
}

// ── ④ 워커·앱 사주 엔진의 년주·월주가 節 경계에서 코어와 같이 갈린다 ────────
//
// 🔴 이것이 이 가드의 본론이다. ②·③ 은 절기 **시각**을 보지만, 사용자가 받는 것은 **기둥**이다.
// 워커 엔진은 lunar-javascript EightChar 로 년·월주를 잡고 있었는데, 그 라이브러리는 생시도
// 절기도 CST 벽시계로 보므로 월건 경계가 **정확히 60분 이르렀다**(실측 2026-08-27, 1960~2030
// 節 경계 ±150분 창 13,632건 중 월주 5,553건 · 년주 459건 불일치, 전부 -60~-1분 구간).
// `verify:hour-pillar-parity` 는 시주·일주만 대조해서 이걸 못 잡는다.
{
  const { buildSajuProfile } = await import("../worker/lib/destiny-bias-engine.js");

  const KO_TO_HANJA = {
    갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
    자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 유: "酉", 술: "戌", 해: "亥",
  };
  // 신(辛/申)은 천간·지지에 같은 한글이 겹치므로 자리별로 변환한다.
  const koGanjiToHanja = (ganjiKo) => {
    const stem = String(ganjiKo || "").charAt(0);
    const branch = String(ganjiKo || "").charAt(1);
    return `${KO_TO_HANJA[stem] || ""}${branch === "신" ? "申" : KO_TO_HANJA[branch] || ""}`;
  };

  // 🔴 경계 자체(±0분)는 쓰지 않는다. 표가 분 해상도라 그 1분은 어느 쪽으로도 읽힐 수 있고,
  // 가드가 잡아야 할 것은 "경계가 60분 밀렸는가" 이지 "경계 그 분에 어느 쪽인가" 가 아니다.
  const PROBE_OFFSETS = [-61, -30, -1, 1, 30, 61];
  // 절기 경계 근처를 전부 훑으므로 표본 연도는 셋이면 충분하다(엔진 두 벌 × 12節 × 6오프셋 × 3해).
  const PARITY_YEARS = [1964, 1990, 2026];

  let parityProbes = 0;
  const parityRows = [];

  for (const year of PARITY_YEARS) {
    for (const node of nodeTerms(year)) {
      for (const offset of PROBE_OFFSETS) {
        const at = new Date(Date.UTC(node.year, node.month - 1, node.day, node.hour, node.minute) + offset * 60000);
        const birth = {
          year: at.getUTCFullYear(),
          month: at.getUTCMonth() + 1,
          day: at.getUTCDate(),
          hour: at.getUTCHours(),
          minute: at.getUTCMinutes(),
        };

        const core = ganji(birth);
        if (!core) continue;
        const expected = {
          year: formatPillar(core.year.stemIndex, core.year.branchIndex, "hanja"),
          month: formatPillar(core.month.stemIndex, core.month.branchIndex, "hanja"),
        };

        const worker = buildSajuProfile({
          name: "패리티",
          gender: "M",
          calendarType: "solar",
          timezone: "Asia/Seoul",
          hourPillarTimePolicy: "KST_CLOCK_TIME",
          birth: { ...birth, calendarType: "solar" },
          location: { name: "서울", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
        });

        const app = calculateLocalSaju({
          hasTime: true,
          calendarType: "solar",
          timezone: "Asia/Seoul",
          hourPillarTimePolicy: "KST_CLOCK_TIME",
          ...birth,
          gender: "male",
        });

        parityProbes += 1;
        const workerPair = `${worker?.pillars?.year?.ganji || ""}/${worker?.pillars?.month?.ganji || ""}`;
        const appPair = `${koGanjiToHanja(app?.pillars?.year?.ganji)}/${koGanjiToHanja(app?.pillars?.month?.ganji)}`;
        const expectedPair = `${expected.year}/${expected.month}`;
        if (workerPair !== expectedPair || appPair !== expectedPair) {
          const stamp = `${birth.year}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")} ${String(birth.hour).padStart(2, "0")}:${String(birth.minute).padStart(2, "0")} (節 ${offset >= 0 ? "+" : ""}${offset}분)`;
          if (parityRows.length < 10) parityRows.push(`${stamp} 코어 ${expectedPair} · 워커 ${workerPair} · 앱 ${appPair}`);
        }
      }
    }
  }

  ok("④ 년주·월주 패리티 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", parityProbes >= 200, `표본 ${parityProbes}건`);
  ok("④ 節 경계 ±61분에서 워커·앱의 년주·월주가 코어와 같다", parityRows.length === 0, parityRows.join("\n      "));
}

// ── ⑤ 절기 프레임 간지를 아직 lunar-javascript 로 잡는 곳을 전수 발견한다 ────
//
// ④ 는 엔진 두 벌을 실제로 돌려 본다. ⑤ 는 그 밖에서 같은 결함이 되살아나거나 **남아 있는 것**을
// 소스에서 전수로 세운다. 이 축의 API 는 전부 CST 벽시계로 판정하므로 KST 로는 경계가 60분 이르다.
//
// 🔴 손으로 적는 것은 "발견 목록"이 아니라 "잔존 분류"다. 발견은 소스에서 하고, 발견됐는데
// 분류에 없는 파일이 하나라도 있으면 실패한다(CLAUDE.md 코딩 원칙 10). 이관이 끝나면 목록이 준다.
{
  const CST_GANJI_APIS = [
    "getMonthInGanZhiExact",
    "getMonthInGanZhi",
    "getYearInGanZhiExact",
    "getPrevJieQi",
    "getNextJieQi",
    "getEightChar",
  ];

  /**
   * 아직 이 축을 lunar-javascript 로 잡는 것이 **알려져 있는** 파일과 그 이유.
   * 🔴 여기에 올린다고 옳아지는 것이 아니다 — 남은 이관 목록이다. 줄어들기만 해야 한다.
   */
  const KNOWN_REMAINING = new Map([
    ["js/saju-engine.js", "대운 브리지(attachKasiDaewunBridge)의 EightChar 한 자리뿐 — PR-F"],
    ["js/core/kasi/calendar.js", "죽은 사본 — 어느 HTML 도 로드하지 않는다(3면 grep 2026-08-27). 삭제 판단은 사용자에게"],
    ["worker/lib/destiny-bias-engine.js", "일주·시주 전용 EightChar. 년·월주는 이미 코어다(PR-D2)"],
    ["worker/lib/life-book-ai-saju.js", "일주·시주 전용 EightChar + 대운 getYun. 년·월주는 코어다"],
    ["scripts/verify-korean-calendar-solar-terms.mjs", "코어와 대조하는 가드 자신 — 대조 대상이라 남아야 한다"],
    ["scripts/verify-saju-solar-term-core.mjs", "이 파일. 위 목록의 문자열이 자기 자신에 잡힌다"],
    ["scripts/verify-shell-korean-calendar.mjs", "정적 셸을 코어와 대조하는 가드 — 대조 대상이라 남아야 한다"],
    ["scripts/verify-daeun-korean-calendar.mjs", "대운 관례 재현을 lunar-javascript 와 대조하는 가드 — 대조 대상이라 남아야 한다"],
    ["scripts/test-saju-solar-term-regression.mjs", "회귀 대조 스크립트 — 대조 대상이라 남아야 한다"],
    ["scripts/lib/ziwei-engine-harness.cjs", "자미 하네스의 브라우저 전역 스텁"],
    ["scripts/ziwei-autotune-report.cjs", "미배선 튜닝 리포트"],
    ["scripts/test-saju-regression.js", "미배선 회귀 스크립트"],
    ["scripts/validate-phase4.mjs", "미배선 검증 스크립트"],
  ]);

  const GANJI_SCAN_DIRS = ["js", "worker", "app", "lib", "src", "scripts"];
  const found = [];
  const unclassified = [];
  for (const dirName of GANJI_SCAN_DIRS) {
    const dir = path.join(root, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir, [])) {
      const relative = path.relative(root, file).split(path.sep).join("/");
      const code = stripComments(fs.readFileSync(file, "utf8"));
      const hits = CST_GANJI_APIS.filter((api) => code.includes(`${api}(`));
      if (!hits.length) continue;
      found.push(`${relative} — ${hits.join(", ")}`);
      if (!KNOWN_REMAINING.has(relative)) unclassified.push(`${relative} — ${hits.join(", ")}`);
    }
  }

  // 🔴 이관이 끝날 때마다 이 숫자를 내린다. 올라가는 방향으로 움직이면 새로 생긴 것이다.
  ok(
    "⑤ 절기 프레임 간지 호출을 실제로 발견했다(발견 0 = 가드가 깨진 것)",
    found.length >= 4,
    `발견 ${found.length}개`,
  );
  ok(
    "⑤ 발견된 파일이 전부 잔존 분류에 있다(미분류 = 새로 생긴 것)",
    unclassified.length === 0,
    unclassified.join("\n      "),
  );

  // 잔존 목록이 늘어나기만 하는 것을 막는다 — 실제로 존재하지 않는 파일을 올려 두면 실패한다.
  const stale = [...KNOWN_REMAINING.keys()].filter((relative) => !fs.existsSync(path.join(root, relative)));
  ok("⑤ 잔존 분류에 유령 경로가 없다", stale.length === 0, stale.join(", "));
}

// ── ⑥ 워커 AI 사주 두 벌(인생책·신년운세)의 년주·월주가 節 경계에서 코어를 따른다 ──
//
// ④ 가 보는 destiny-bias-engine·앱 엔진과 **다른 파일**이다. 이 둘은 EightChar 가 아니라
// `getYearInGanZhi()`/`getMonthInGanZhi()` 를 직접 불러서 ④ 의 grep 에 안 걸렸다.
// 🔴 신년운세의 년주는 그 위에 **음력 프레임(설날 경계)** 이기까지 했다 — 사주는 입춘 경계다
// (실측 2026-08-27: 정오 표본 6,804건 중 129건 1.90% 가 갈렸다).
{
  const { calculateLifeBookAiSaju } = await import("../worker/lib/life-book-ai-saju.js");
  const { __newYearAiTestUtils } = await import("../worker/routes/new-year-ai.js");
  const { calculateNewYearFortuneData } = __newYearAiTestUtils;

  const HANJA_TO_KO = {
    甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
    子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
  };
  const toKo = (value) => String(value || "").split("").map((c) => HANJA_TO_KO[c] || c).join("");

  const OFFSETS = [-61, -30, -1, 1, 30, 61];
  const YEARS = [1964, 1990, 2026];
  let probes = 0;
  const rows = [];

  for (const year of YEARS) {
    for (const node of nodeTerms(year)) {
      for (const offset of OFFSETS) {
        const at = new Date(Date.UTC(node.year, node.month - 1, node.day, node.hour, node.minute) + offset * 60000);
        const y = at.getUTCFullYear();
        const m = at.getUTCMonth() + 1;
        const d = at.getUTCDate();
        const hh = at.getUTCHours();
        const mm = at.getUTCMinutes();
        const core = ganji({ year: y, month: m, day: d, hour: hh, minute: mm });
        if (!core) continue;
        const expected = `${formatPillar(core.year.stemIndex, core.year.branchIndex, "hanja")}/${formatPillar(core.month.stemIndex, core.month.branchIndex, "hanja")}`;

        const birthDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const birthTime = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

        const lifeBook = calculateLifeBookAiSaju({ birthDate, birthTime, calendarType: "solar", gender: "male" });
        const lifeBookPair = `${lifeBook?.pillarDetails?.year?.pillar || ""}/${lifeBook?.pillarDetails?.month?.pillar || ""}`;

        const newYear = calculateNewYearFortuneData({
          targetYear: 2026,
          birthInfo: { birthDate, birthTime, calendarType: "solar", gender: "male" },
        });
        const newYearPair = `${newYear?.saju?.yearPillar || ""}/${newYear?.saju?.monthPillar || ""}`;

        probes += 1;
        if (lifeBookPair !== expected || newYearPair !== toKo(expected)) {
          const stamp = `${birthDate} ${birthTime} (節 ${offset >= 0 ? "+" : ""}${offset}분)`;
          if (rows.length < 10) rows.push(`${stamp} 코어 ${expected} · 인생책 ${lifeBookPair} · 신년운세 ${newYearPair}`);
        }
      }
    }
  }

  ok("⑥ 인생책·신년운세 패리티 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", probes >= 200, `표본 ${probes}건`);
  ok("⑥ 節 경계 ±61분에서 인생책·신년운세의 년주·월주가 코어와 같다", rows.length === 0, rows.join("\n      "));
}

// ── ⑦ 인생책의 년·월주 파생 필드가 기둥과 같은 축에 있다 ─────────────────────
//
// 년·월주는 코어(KST)에서 오는데 納音·旬空·十二運星·지지 십신은 lunar-javascript 의 EightChar 가
// **CST 기둥**에 붙여 만든 값이었다. 두 기둥이 같은 날짜에서는 파생 필드도 같아야 한다 —
// 다르면 다리(pillarFacts)가 EightChar 를 재현하지 못한다는 뜻이고, 갈리는 60분 창에서
// 한 응답에 두 축이 섞인다.
{
  const { Solar } = await import("lunar-javascript");
  const { calculateLifeBookAiSaju } = await import("../worker/lib/life-book-ai-saju.js");

  let compared = 0;
  const mismatches = [];
  for (const year of [1955, 1978, 1990, 2003, 2019]) {
    for (let month = 1; month <= 12; month += 1) {
      for (const day of [9, 21]) {
        const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const eightChar = Solar.fromYmdHms(year, month, day, 10, 30, 0).getLunar().getEightChar();
        const result = calculateLifeBookAiSaju({ birthDate, birthTime: "10:30", calendarType: "solar", gender: "female" });
        for (const key of ["year", "month"]) {
          const detail = result?.pillarDetails?.[key];
          const prefix = key === "year" ? "Year" : "Month";
          // 이 날짜들은 節 경계에서 멀어 코어와 lunar-javascript 의 기둥이 같다. 같지 않으면 비교 대상이 아니다.
          if (!detail || detail.pillar !== eightChar[`get${prefix}`]()) continue;
          compared += 1;
          const actual = [detail.naYin, detail.xun, detail.xunKong, detail.twelveStage, detail.elementPair].join("|");
          const expected = [
            eightChar[`get${prefix}NaYin`](),
            eightChar[`get${prefix}Xun`](),
            eightChar[`get${prefix}XunKong`](),
            eightChar[`get${prefix}DiShi`](),
            eightChar[`get${prefix}WuXing`](),
          ].join("|");
          if (actual !== expected && mismatches.length < 8) {
            mismatches.push(`${birthDate} ${key} 기둥 ${detail.pillar} — 다리 ${actual} · EightChar ${expected}`);
          } else if (actual !== expected) {
            mismatches.push("…");
          }
        }
      }
    }
  }

  ok("⑦ 파생 필드 비교 표본을 실제로 돌렸다(0 이면 가드가 깨진 것)", compared >= 100, `표본 ${compared}건`);
  ok("⑦ 코어 기둥에서 만든 파생 필드가 EightChar 의 것과 같다", mismatches.length === 0, mismatches.join("\n      "));
}

// ── ⑧ 주간·월간 운세 범위 데이터가 코어를 따른다 ────────────────────────────
//
// `/fortune` 월간 화면은 절기 이름을 **그대로 사용자에게 보여준다**. 예전에는 lunar-javascript 가
// 내는 중국 간체(处暑·白露)가 한국어 화면에 나갔고, 절기 날짜도 CST 라 하루 어긋나는 달이 있었다
// (실측 2026-08-27: 2026 우수 = lj 02-18 23:51 vs 코어 02-19 00:52).
{
  const rangeData = await loadTsModule("lib/fortune/range-data.ts");
  const month = rangeData.loadMonthRange();
  const [ay, am, ad] = String(month.anchorYmd).split("-").map(Number);
  const anchorCore = ganji({ year: ay, month: am, day: ad, hour: 0, minute: 0 });

  ok(
    "⑧ 월간 월건이 코어와 같다",
    Boolean(anchorCore) && month.monthGanji === formatPillar(anchorCore.month.stemIndex, anchorCore.month.branchIndex, "hanja"),
    `월건 ${month.monthGanji} · 앵커 ${month.anchorYmd}`,
  );
  ok(
    "⑧ 절기 이름이 코어의 한글 표기다(중국 간체가 화면에 나가지 않는다)",
    [month.termFrom, month.termTo].every((term) => !term || TERM_NAME_KO.includes(term.name)),
    `termFrom=${month.termFrom?.name || "-"} termTo=${month.termTo?.name || "-"}`,
  );
  ok(
    "⑧ 일별 간지를 실제로 채웠다",
    Array.isArray(month.days) && month.days.length >= 28 && month.days.every((day) => Array.from(String(day.ganji || "")).length === 2),
    `일수 ${month.days?.length || 0}`,
  );
}

// ── 결과 ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n[verify:saju-solar-term-core] 실패 ${failures.length}건 / 검사 ${checks}건`);
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`[verify:saju-solar-term-core] 통과 — 검사 ${checks}건 · 절기 소스 ${solarTermFiles.length}개 · 소비자 5벌 · 표본 ${SAMPLE_YEARS.length}개 연도`);
