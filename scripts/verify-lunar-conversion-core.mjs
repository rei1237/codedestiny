#!/usr/bin/env node
/**
 * 음력↔양력 변환 단일 출처 가드 — "달력 변환은 한국 음양력 코어 하나에서만 나온다".
 *
 *   node scripts/verify-lunar-conversion-core.mjs [--report]
 *
 * 🔴 LLM 실호출 없음. 네트워크 없음. DB 없음.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * `lunar-javascript` 는 **중국 표준시(CST, UTC+8) 기준 중국 음력**이다. 삭이 CST 23시대에 들면
 * 그 음력 달 전체(약 29.5일)가 하루 밀린다. 실측 2026-08-27(1950~2035):
 *   · 양력→음력  28,896일 중 1,060일(3.67%)
 *   · 음력→양력  29,928건 중 1,102건(3.68%)
 *   · 일진        28,896일 중 **0일** — 이 축은 원래부터 같다(그래서 옮겨도 값이 안 움직인다)
 *
 * 하루가 밀리면 자미두수는 자미성이 옆 칸으로 가고, 숙요는 본명숙이 바뀌고, 휴먼디자인은
 * 행성 황경이 다른 게이트를 가리킨다. **화면도 콘솔도 조용하다.**
 *
 * ── 이 가드가 보는 것 ───────────────────────────────────────────────────────
 *   ① 달력 변환 API 를 부르는 소스를 **전수 발견**하고, 잔존 분류에 없으면 실패한다.
 *      발견 방식이 깨져 0개가 나와도 실패한다(CLAUDE.md 코딩 원칙 10).
 *   ② 소비자를 **실제로 실행해** 코어와 같은 날짜를 내는지 본다. 표본은 **값이 실제로 갈리는
 *      날짜(밴드 안)** 를 반드시 포함한다 — 밴드 밖만 보면 되돌려도 초록불이다.
 *   ③ 소비자들끼리 서로 같은 날짜를 내는지. 이 작업의 발단이 "엔진마다 달력이 다르다" 였다.
 *   ④ KASI 로컬 폴백이 코어다. 🔴 이 라우트는 레포 전체가 "권위 있는 한국 달력"으로 삼는
 *      지점이라, 여기가 중국 음력이면 업스트림이 죽는 동안에만 조용히 틀린다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Lunar, Solar } from "lunar-javascript";

import { lunarToSolar, solarToLunar } from "../lib/korean-calendar/index.js";
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

const ymd = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// ── 밴드 안 표본 — 손으로 날짜를 적지 않는다 ────────────────────────────────
//
// 🔴 두 달력이 실제로 갈리는 날을 **찾아서** 쓴다. 밴드가 바뀌면 표본이 따라 움직이고,
// "밴드 밖만 골라 통과하는" 가드가 되지 않는다.
function findSolarDivergent(limit) {
  const found = [];
  for (let year = 1950; year <= 2030 && found.length < limit; year += 1) {
    for (let month = 1; month <= 12 && found.length < limit; month += 1) {
      for (let day = 1; day <= 28 && found.length < limit; day += 1) {
        const core = solarToLunar(year, month, day);
        if (!core) continue;
        const lj = Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar();
        const ljMonth = Number(lj.getMonth());
        if (Math.abs(ljMonth) === core.lunarMonth && Number(lj.getDay()) === core.lunarDay) continue;
        found.push({
          year,
          month,
          day,
          ymd: ymd(year, month, day),
          core: { month: core.lunarMonth, day: core.lunarDay, year: core.lunarYear, isLeap: core.isLeapMonth },
          chinese: { month: Math.abs(ljMonth), day: Number(lj.getDay()), year: Number(lj.getYear()), isLeap: ljMonth < 0 },
        });
      }
    }
  }
  return found;
}

function findLunarDivergent(limit) {
  const found = [];
  for (let year = 1950; year <= 2030 && found.length < limit; year += 1) {
    for (let month = 1; month <= 12 && found.length < limit; month += 1) {
      for (let day = 1; day <= 28 && found.length < limit; day += 1) {
        const core = lunarToSolar(year, month, day, false);
        if (!core) continue;
        let chinese;
        try {
          chinese = Lunar.fromYmd(year, month, day).getSolar();
        } catch {
          continue;
        }
        if (chinese.getYear() === core.year && chinese.getMonth() === core.month && chinese.getDay() === core.day) continue;
        found.push({
          lunarYear: year,
          lunarMonth: month,
          lunarDay: day,
          lunarYmd: ymd(year, month, day),
          core: { year: core.year, month: core.month, day: core.day, ymd: ymd(core.year, core.month, core.day) },
          chinese: { ymd: chinese.toYmd() },
        });
      }
    }
  }
  return found;
}

const ALL_SOLAR_DIVERGENT = findSolarDivergent(4000);
const ALL_LUNAR_DIVERGENT = findLunarDivergent(4000);
// 해를 흩어서 고른다 — 한 달에 몰리면 한 삭월만 보게 된다.
const SOLAR_SAMPLES = ALL_SOLAR_DIVERGENT.filter((_, index) => index % 89 === 0).slice(0, 10);
const LUNAR_SAMPLES = ALL_LUNAR_DIVERGENT.filter((_, index) => index % 89 === 0).slice(0, 10);

ok(
  "표본: 양력→음력이 갈리는 날짜를 실제로 찾았다(0 이면 가드가 깨진 것)",
  SOLAR_SAMPLES.length >= 6,
  `${ALL_SOLAR_DIVERGENT.length}일 중 표본 ${SOLAR_SAMPLES.length}일`,
);
ok(
  "표본: 음력→양력이 갈리는 날짜를 실제로 찾았다(0 이면 가드가 깨진 것)",
  LUNAR_SAMPLES.length >= 6,
  `${ALL_LUNAR_DIVERGENT.length}건 중 표본 ${LUNAR_SAMPLES.length}건`,
);

// ── ① 달력 변환 호출을 전수 발견한다 ────────────────────────────────────────
//
// 🔴 `scripts/` 는 일부러 안 본다. 검증 스크립트는 **두 달력을 비교하는 것이 일**이라 전부
// 잔존 분류에 올라야 하는데, 그러면 이 파일이 `scripts/verify-*.mjs` 경로를 문자열로 갖게 되고
// `verify:guard-wiring` 이 그 문자열을 **배선 간선으로** 읽어 미배선 검증기를 배선된 것으로
// 오판한다(실제로 verify:love-compat 이 그렇게 뒤집혔다, 2026-08-27).
// 지켜야 할 것은 배포되는 코드이므로 제품 소스만 본다.
const SCAN_DIRS = ["js", "worker", "app", "lib", "src"];
const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);
const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "out", ".wrangler", "build-cache"]);

/** 중국 음력 프레임으로 날짜를 만드는 호출. 주석은 제외하고 본다. */
const CONVERSION_APIS = [
  "Solar.fromYmd",
  "Solar.fromYmdHms",
  "Solar.fromDate",
  "Lunar.fromYmd",
  "Lunar.fromYmdHms",
  ".getLunar(",
  ".getSolar(",
];

/**
 * 아직 이 축을 lunar-javascript 로 잡는 것이 **알려져 있는** 파일과 그 이유.
 * 🔴 여기에 올린다고 옳아지는 것이 아니다 — 남은 이관 목록이다. 줄어들기만 해야 한다.
 */
// 🔴 2026-08-28(PR-F2) 로 워커 3개가, 같은 날(PR-F6) 정적 셸 2개가 빠졌다.
// 셸 2개는 값이 아니라 **가용성 검사**(`typeof Solar`)로만 걸려 있었고, CDN 로더를 걷어내면서
// 그 검사가 통째로 사라졌다. 이제 남은 것은 로드되지 않는 죽은 사본 하나뿐이다.
const KNOWN_REMAINING = new Map([
  ["js/core/kasi/calendar.js", "죽은 사본 — 어느 HTML 도 로드하지 않는다(3면 grep 2026-08-27). 삭제 판단은 사용자에게"],
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

// 🔴 주석은 검사에서 뺀다 — 안 그러면 "예전에는 Lunar.fromYmd 를 썼다"는 설명이 자기 자신을 잡는다.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    // 🔴 `$` 앵커를 쓰지 않는다 — CRLF 파일에서는 행 끝 \r 이 `.` 에 안 잡혀 앵커가 막히고
    //    주석 한 줄이 통째로 코드로 취급된다(실제로 scripts/gen-daily.mjs 가 그렇게 잡혔다).
    .map((line) => line.replace(/(^|[^:])\/\/.*/, "$1"))
    .join("\n");
}

const found = [];
const unclassified = [];
let scannedFiles = 0;
for (const dirName of SCAN_DIRS) {
  const dir = path.join(root, dirName);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir, [])) {
    scannedFiles += 1;
    const relative = path.relative(root, file).split(path.sep).join("/");
    const code = stripComments(fs.readFileSync(file, "utf8"));
    const hits = CONVERSION_APIS.filter((api) => code.includes(api));
    if (!hits.length) continue;
    found.push(`${relative} — ${hits.join(", ")}`);
    if (!KNOWN_REMAINING.has(relative)) unclassified.push(`${relative} — ${hits.join(", ")}`);
  }
}

// 🔴 예전에는 여기에 `found.length >= 3` 이 있었다. 그건 "스캐너가 살아 있나"를 재려던 것인데
// **잔존 개수로는 그걸 못 잰다** — 잔존이 줄어들수록 임계값이 공허해지고(2026-08-28 에 셸 2개가
// 빠져 발견이 1개로 떨어졌다), 반대로 CONVERSION_APIS 원소 하나를 오타내도 나머지가 임계값을
// 채워 조용히 통과한다. 그래서 목적을 직접 잰다 — ㉮ 스캐너가 실제로 파일을 훑었는가,
// ㉯ 탐지기가 API 7종을 전부 잡는가. 잔존 목록은 포함(unclassified)·역포함(neverFound)이
// 양방향으로 잠그므로 개수 단언이 따로 필요 없다.
ok("① 스캔이 실제로 소스를 읽었다(0 이면 경로가 바뀐 것)", scannedFiles >= 500, `${scannedFiles}개 파일`);
{
  // 🔴 프로브를 CONVERSION_APIS 에서 **만들면 안 된다** — 오타 난 원소가 자기 프로브를 그대로
  // 잡아 동어반복이 된다(2026-08-28 에 실제로 그렇게 썼다가 음성 테스트에서 드러났다).
  // 게다가 문자열이 서로 접두사라(`Solar.fromYmd` ⊂ `Solar.fromYmdHms`) 프로브 한 줄로는
  // 어느 원소가 잡았는지 가릴 수도 없다. 그래서 목록 자체를 고정 리터럴에 못박는다.
  const EXPECTED_APIS = [
    "Solar.fromYmd",
    "Solar.fromYmdHms",
    "Solar.fromDate",
    "Lunar.fromYmd",
    "Lunar.fromYmdHms",
    ".getLunar(",
    ".getSolar(",
  ];
  ok(
    "① 탐지 대상 API 목록이 그대로다(오타·삭제가 조용히 지나가지 않는다)",
    JSON.stringify(CONVERSION_APIS) === JSON.stringify(EXPECTED_APIS),
    `현재 ${JSON.stringify(CONVERSION_APIS)}\n      기대 ${JSON.stringify(EXPECTED_APIS)}`,
  );

  // 주석 제거기가 살아 있는지는 따로 본다 — 이쪽이 실제 오탐/누락의 원천이다.
  const catches = (line) => CONVERSION_APIS.some((api) => stripComments(line).includes(api));
  const positive = [
    "  const s = Solar.fromYmdHms(1990, 5, 15, 12, 0, 0);",
    "  const l = solar.getLunar();",
  ].filter(catches);
  const negative = [
    "  // const s = Solar.fromYmd(1990, 5, 15);",
    "  const p = core.solarToLunar({ year: 1990, month: 5, day: 15 });",
  ].filter(catches);
  ok(
    "① 주석 제거기가 살아 있다(코드는 잡고 줄 주석·코어 호출은 안 잡는다)",
    positive.length === 2 && negative.length === 0,
    `양성 ${positive.length}/2 · 위양성 ${negative.length}`,
  );
}
ok("① 발견된 파일이 전부 잔존 분류에 있다(미분류 = 새로 생긴 것)", unclassified.length === 0, unclassified.join("\n      "));

const stale = [...KNOWN_REMAINING.keys()].filter((relative) => !fs.existsSync(path.join(root, relative)));
ok("① 잔존 분류에 유령 경로가 없다", stale.length === 0, stale.join(", "));

const neverFound = [...KNOWN_REMAINING.keys()].filter(
  (relative) => !found.some((row) => row.startsWith(`${relative} —`)),
);
ok(
  "① 잔존 분류에 이미 이관된 항목이 남아 있지 않다(줄어들기만 해야 한다)",
  neverFound.length === 0,
  neverFound.join(", "),
);

// ── ①-b 브라우저가 이 라이브러리를 **받아 오지 않는다** ────────────────────
//
// 🔴 위 ① 은 "값이 어디서 나오는가" 만 본다. 그것만으로는 누가 체인에
// `https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.js` 를 되넣어도 **모든 가드가
// 초록이다** — 값은 여전히 코어에서 나오니까. 그런데 그건 핀 없는 서드파티 실행 코드를 첫
// 계산 경로에 다시 들이는 일이고, 2026-08-28 이전에 실제로 그 상태였다.
//
// 그때 무슨 일이 있었나(제거 전 실측): __cdEnsureSajuCoreLoaded 의 체인은 순차 reduce 에
// 전체 .catch 라, CDN 이 막힌 사용자는 그 원소에서 체인이 죽어 saju-engine 이하 10개가 안 뜨고
// **run-btn 이 조용히 무반응**이었다. 숙요 모달을 먼저 연 경우에는 saju-engine 은 떠 있고
// Solar 만 없어서 `typeof Solar` 게이트에 걸렸고, CDN 6개 × 6초를 다 시도한 뒤(최대 36초)
// 버튼 라벨과 FREE pill 이 textContent 로 파괴됐다. 값 계산에 그 라이브러리를 한 글자도
// 안 쓰는데 그랬다.
//
// 그래서 "URL 로 받아 오는 지점" 을 따로 센다. 판정 신호는 **문자열 리터럴 안의 http URL 이
// lunar 를 담고 있는가** 다 — 산문(`calculationBasis: "… lunar-javascript sect 1 관례 재현"`)이나
// 주석은 안 잡고, astronomy-engine 같은 다른 CDN 도 안 잡는다.
{
  // 🔴 public/js 를 함께 본다. 미러가 아닌 원본이 거기 살 수 있다 —
  // public/js/services/saju-library-loader.js 가 정확히 그랬다(js/ 에 대응물이 없었다).
  const CDN_SCAN_DIRS = [...SCAN_DIRS, "public/js"];
  const LUNAR_CDN_URL = /["'`][^"'`\n]*https?:\/\/[^"'`\n]*lunar[^"'`\n]*["'`]/i;

  const offenders = [];
  let cdnScanned = 0;
  for (const dirName of CDN_SCAN_DIRS) {
    const dir = path.join(root, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir, [])) {
      cdnScanned += 1;
      const relative = path.relative(root, file).split(path.sep).join("/");
      const lines = stripComments(fs.readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, index) => {
        if (LUNAR_CDN_URL.test(line)) offenders.push(`${relative}:${index + 1} — ${line.trim().slice(0, 100)}`);
      });
    }
  }
  ok("①-b CDN 스캔이 실제로 소스를 읽었다(0 이면 경로가 바뀐 것)", cdnScanned >= 500, `${cdnScanned}개 파일`);
  ok(
    "①-b 제품 소스에 lunar-javascript CDN 로드 지점이 하나도 없다",
    offenders.length === 0,
    offenders.slice(0, 10).join("\n      "),
  );

  // 발견 0 이 "탐지기가 죽었다" 를 뜻하지 않도록 스텁으로 자기검사한다.
  const probe = [
    "  'https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.js',",
    "    'https://cdn.jsdelivr.net/npm/lunar-javascript@1.7.7/lunar.min.js',",
    '  var u = "https://unpkg.com/lunar-javascript/lunar.js";',
  ].filter((line) => LUNAR_CDN_URL.test(line));
  const negative = [
    '  calculationBasis: "대운은 코어 daeun(lunar-javascript sect 1 관례 재현)",',
    "  const core = require('../lib/korean-calendar/index.js');",
    "  'https://cdn.jsdelivr.net/npm/astronomy-engine/esm/astronomy.js',",
  ].filter((line) => LUNAR_CDN_URL.test(line));
  ok(
    "①-b 탐지기가 살아 있다(CDN URL 3종을 잡고 산문·다른 라이브러리 URL 은 안 잡는다)",
    probe.length === 3 && negative.length === 0,
    `양성 ${probe.length}/3 · 위양성 ${negative.length}`,
  );
}

// ── ② 소비자를 실제로 실행한다 ──────────────────────────────────────────────
const normalizeZiwei = loadTsModule("app/_lib/normalize-ziwei-input.ts");
const kusei = loadTsModule("app/fortune/prompt-hub/kusei-calc.ts");
const lite = loadTsModule("app/fortune/prompt-hub/lite-prompt-tools.ts");
const dangsaju = loadTsModule("app/fortune/prompt-hub/dangsaju-calc.ts");
const localSaju = loadTsModule("app/saju/animal-destiny/engine/localSajuCalculator.ts");
const nakshatraBirth = loadTsModule("app/nakshatra/nakshatra-birth.ts");
const { resolveBirthMoment } = await import("../worker/lib/human-design-ephemeris.js");
const { __karmaDestinyCalculationTestUtils: karma } = await import("../worker/lib/karma-destiny-ai-calculations.js");
const { __kasiTestUtils: kasi } = await import("../worker/routes/kasi.js");
const { __adminSukuyoTestUtils: admin } = await import("../worker/routes/admin.js");

/** 음력→양력 소비자 — 이름과 "그 음력 날짜의 양력 YYYY-MM-DD 를 내는 방법". */
const LUNAR_TO_SOLAR = [
  {
    name: "app/_lib/normalize-ziwei-input.ts normalizeZiweiInput",
    solarOf: (s) => {
      const result = normalizeZiwei.normalizeZiweiInput({
        birthYear: s.lunarYear, birthMonth: s.lunarMonth, birthDay: s.lunarDay,
        birthHour: 12, birthMinute: 0, gender: "M", calendarType: "lunar", isLeapMonth: false,
      });
      if (!result.input) return `errors:${result.errors.map((e) => e.code).join(",")}`;
      return ymd(result.input.birthYear, result.input.birthMonth, result.input.birthDay);
    },
  },
  {
    name: "app/fortune/prompt-hub/kusei-calc.ts convertLunarToSolar",
    solarOf: (s) => {
      const solar = kusei.convertLunarToSolar(s.lunarYmd, false);
      return ymd(solar.year, solar.month, solar.day);
    },
  },
  {
    name: "app/fortune/prompt-hub/lite-prompt-tools.ts calculateLiteSajuPrompt",
    solarOf: (s) => lite.calculateLiteSajuPrompt({
      mode: "saju", birthDate: s.lunarYmd, calendarType: "lunar", birthTime: "12:00", timeUnknown: false, question: "",
    }).normalized.solarDate,
  },
  {
    name: "app/fortune/prompt-hub/dangsaju-calc.ts calculateDangsajuChart",
    solarOf: (s) => dangsaju.calculateDangsajuChart({
      birthDate: s.lunarYmd, calendarType: "lunar", birthTime: "12:00", timeUnknown: false, gender: "male", question: "",
    }).normalizedBirth.solarDate,
  },
  {
    name: "app/saju/animal-destiny/engine/localSajuCalculator.ts calculateLocalSaju",
    solarOf: (s) => {
      const result = localSaju.calculateLocalSaju({
        year: s.lunarYear, month: s.lunarMonth, day: s.lunarDay,
        hour: 12, minute: 0, hasTime: true, gender: "male", calendarType: "lunar", lunarLeap: false,
      });
      // 🔴 해소된 양력일은 최상위가 아니라 calculationEvidence 에 실린다.
      const solar = result.calculationEvidence?.solarDate;
      if (!solar) return "no-evidence";
      return ymd(solar.year, solar.month, solar.day);
    },
  },
  {
    name: "app/nakshatra/nakshatra-birth.ts toSolarYmd",
    solarOf: async (s) => {
      const solar = await nakshatraBirth.toSolarYmd(s.lunarYear, s.lunarMonth, s.lunarDay, "lunar");
      return ymd(solar.year, solar.month, solar.day);
    },
  },
  {
    name: "worker/lib/human-design-ephemeris.js resolveBirthMoment",
    solarOf: (s) => {
      const moment = resolveBirthMoment({
        birthDate: s.lunarYmd, birthTime: "12:00", timezone: "Asia/Seoul", calendar: "lunar",
      });
      return ymd(moment.solarDate.year, moment.solarDate.month, moment.solarDate.day);
    },
  },
  {
    name: "worker/routes/kasi.js computeLocalCalendarFallback(getSolCalInfo)",
    solarOf: (s) => {
      const [row] = kasi.computeLocalCalendarFallback("getSolCalInfo", {
        lunYear: s.lunarYear, lunMonth: s.lunarMonth, lunDay: s.lunarDay, lunLeapmonth: "평",
      }) || [];
      return row ? `${row.solYear}-${row.solMonth}-${row.solDay}` : "null";
    },
  },
];

/** 양력→음력 소비자 — 이름과 "그 양력 날짜의 음력 월/일을 내는 방법". */
const SOLAR_TO_LUNAR = [
  {
    name: "worker/lib/karma-destiny-ai-calculations.js toLunarParts",
    lunarOf: (s) => {
      const parts = karma.toLunarParts({ birthDate: s.ymd, birthTime: "12:00", calendarType: "solar" });
      return parts ? `${parts.lunarMonth}/${parts.lunarDay}` : "null";
    },
  },
  {
    name: "worker/routes/admin.js resolveAdminSukuyoStar",
    lunarOf: (s) => {
      const star = admin.resolveAdminSukuyoStar({
        year: s.year, month: s.month, day: s.day, hour: 12, minute: 0, timeUnknown: false, calendarType: "solar",
      });
      return `${star.lunarMonth}/${star.lunarDay}`;
    },
  },
  {
    name: "worker/routes/kasi.js computeLocalCalendarFallback(getLunCalInfo)",
    lunarOf: (s) => {
      const [row] = kasi.computeLocalCalendarFallback("getLunCalInfo", {
        solYear: s.year, solMonth: s.month, solDay: s.day,
      }) || [];
      return row ? `${Number(row.lunMonth)}/${Number(row.lunDay)}` : "null";
    },
  },
  {
    name: "app/fortune/prompt-hub/dangsaju-calc.ts calculateDangsajuChart(lunarDate)",
    lunarOf: (s) => {
      const text = dangsaju.calculateDangsajuChart({
        birthDate: s.ymd, calendarType: "solar", birthTime: "12:00", timeUnknown: false, gender: "male", question: "",
      }).normalizedBirth.lunarDate;
      const matched = /(\d{4})-(\d{2})-(\d{2})/.exec(String(text));
      return matched ? `${Number(matched[2])}/${Number(matched[3])}` : String(text);
    },
  },
  {
    name: "app/fortune/prompt-hub/lite-prompt-tools.ts calculateLiteSajuPrompt(lunarDate)",
    lunarOf: (s) => {
      const text = lite.calculateLiteSajuPrompt({
        mode: "saju", birthDate: s.ymd, calendarType: "solar", birthTime: "12:00", timeUnknown: false, question: "",
      }).normalized.lunarDate;
      const matched = /(\d{4})-(\d{2})-(\d{2})/.exec(String(text));
      return matched ? `${Number(matched[2])}/${Number(matched[3])}` : String(text);
    },
  },
];

for (const consumer of LUNAR_TO_SOLAR) {
  const wrong = [];
  let ran = 0;
  for (const sample of LUNAR_SAMPLES) {
    let actual;
    try {
      actual = await consumer.solarOf(sample);
    } catch (error) {
      wrong.push(`${sample.lunarYmd} 던짐: ${String(error?.message || error).slice(0, 90)}`);
      continue;
    }
    ran += 1;
    if (actual !== sample.core.ymd) {
      wrong.push(`음력 ${sample.lunarYmd} 코어 ${sample.core.ymd} · 실제 ${actual}${actual === sample.chinese.ymd ? " = 중국 음력" : ""}`);
    }
  }
  ok(`② ${consumer.name} 를 표본 전건 실행했다`, ran === LUNAR_SAMPLES.length, `${ran}/${LUNAR_SAMPLES.length}`);
  ok(`② ${consumer.name} 가 갈리는 음력 날짜에서 코어 쪽 양력일을 낸다`, wrong.length === 0, wrong.join("\n      "));
}

for (const consumer of SOLAR_TO_LUNAR) {
  const wrong = [];
  let ran = 0;
  for (const sample of SOLAR_SAMPLES) {
    const expected = `${sample.core.month}/${sample.core.day}`;
    const chinese = `${sample.chinese.month}/${sample.chinese.day}`;
    let actual;
    try {
      actual = await consumer.lunarOf(sample);
    } catch (error) {
      wrong.push(`${sample.ymd} 던짐: ${String(error?.message || error).slice(0, 90)}`);
      continue;
    }
    ran += 1;
    if (actual !== expected) {
      wrong.push(`${sample.ymd} 코어 음력 ${expected} · 실제 ${actual}${actual === chinese ? " = 중국 음력" : ""}`);
    }
  }
  ok(`② ${consumer.name} 를 표본 전건 실행했다`, ran === SOLAR_SAMPLES.length, `${ran}/${SOLAR_SAMPLES.length}`);
  ok(`② ${consumer.name} 가 갈리는 날짜에서 코어 쪽 음력일을 낸다`, wrong.length === 0, wrong.join("\n      "));
}

// ── ③ 소비자들끼리 같은 날짜를 낸다 ─────────────────────────────────────────
{
  const disagreements = [];
  for (const sample of LUNAR_SAMPLES) {
    const seen = new Map();
    for (const consumer of LUNAR_TO_SOLAR) {
      try {
        seen.set(consumer.name, await consumer.solarOf(sample));
      } catch {
        seen.set(consumer.name, "throw");
      }
    }
    if (new Set(seen.values()).size > 1) {
      disagreements.push(`음력 ${sample.lunarYmd} — ${[...seen].map(([name, v]) => `${name.split("/").pop().split(" ")[0]}:${v}`).join(" · ")}`);
    }
  }
  ok(`③ 음력→양력 소비자 ${LUNAR_TO_SOLAR.length}벌이 같은 음력 날짜에 같은 양력일을 낸다`, disagreements.length === 0, disagreements.join("\n      "));
}

// ── ④ 일진은 원래부터 같다 — 이 축은 이관해도 안 움직인다는 근거를 박아 둔다 ──
//
// 🔴 love-secret-ai-calendar 를 코어로 옮긴 근거다. "안 움직인다"고 적어 두기만 하면
// 다음 사람이 확인할 길이 없으므로, 여기서 매번 다시 잰다.
{
  const { formatPillar, ganji } = await import("../lib/korean-calendar/index.js");
  let compared = 0;
  const wrong = [];
  for (let year = 1950; year <= 2030; year += 7) {
    for (let month = 1; month <= 12; month += 1) {
      for (const day of [1, 13, 27]) {
        const pillars = ganji({ year, month, day, hour: 0, minute: 0 });
        if (!pillars) continue;
        compared += 1;
        const mine = formatPillar(pillars.day.stemIndex, pillars.day.branchIndex, "hanja");
        const theirs = String(Solar.fromYmd(year, month, day).getLunar().getDayInGanZhi() || "");
        if (mine !== theirs) wrong.push(`${ymd(year, month, day)} 코어 ${mine} ≠ ${theirs}`);
      }
    }
  }
  ok("④ 일진 비교를 실제로 돌렸다(0 이면 가드가 깨진 것)", compared >= 300, `${compared}건`);
  ok("④ 정자시 일진은 두 달력이 같다(이 축은 이관해도 값이 안 움직인다)", wrong.length === 0, wrong.slice(0, 5).join("\n      "));
}

// ── 결과 ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n[verify:lunar-conversion-core] 실패 ${failures.length}건 / 검사 ${checks}건`);
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log(
  `[verify:lunar-conversion-core] 통과 — 검사 ${checks}건 · 변환 소스 ${found.length}개 · `
  + `소비자 ${LUNAR_TO_SOLAR.length + SOLAR_TO_LUNAR.length}벌 · `
  + `갈리는 날 양력 ${ALL_SOLAR_DIVERGENT.length}일 / 음력 ${ALL_LUNAR_DIVERGENT.length}건`,
);
