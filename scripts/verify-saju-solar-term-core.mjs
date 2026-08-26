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
 *
 * ① 은 검사 대상이 0개면 실패한다. 발견이 0이라는 것은 규칙이 지켜졌다는 뜻이 아니라
 * 발견 방식이 깨졌다는 뜻이다(CLAUDE.md 코딩 원칙 10).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { nodeTerms, solarTerms, TERM_NAME_KO } from "../lib/korean-calendar/index.js";
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

// ── 결과 ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n[verify:saju-solar-term-core] 실패 ${failures.length}건 / 검사 ${checks}건`);
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`[verify:saju-solar-term-core] 통과 — 검사 ${checks}건 · 절기 소스 ${solarTermFiles.length}개 · 소비자 5벌 · 표본 ${SAMPLE_YEARS.length}개 연도`);
