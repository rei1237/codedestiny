// 시주(時柱) 시각 보정 정책 패리티 가드
//
// 이 레포에는 사주 계산 엔진이 런타임별로 3벌 있고(브라우저 정적 스크립트 / Worker ESM / Next.js TS),
// 공유 모듈을 넣을 빌드 배관이 없어 각자 복제돼 있다. 예전에는 세 벌의 시주 시각 보정이 서로 달라
// 같은 생년월일시가 기능마다 다른 시주를 냈다:
//   - 정적 셸: 경도 + 균시차
//   - 워커:    경도 + 균시차 (정책 기본값)
//   - Next.js: 보정 없음 (호출부가 경도·플래그를 아예 안 넘김)
//
// 확정 정책은 평균태양시(LOCAL_MEAN_TIME) — 경도 보정만 쓰고 균시차는 쓰지 않는다.
// 균시차(±16분)까지 더하면 서울 2022-10-25 13:20 출생이 13:04(未시)가 되어 오시(午時)를 놓치고,
// 프로필 카드·입력 미리보기가 표시하는 보정 시각(경도만, 12:48)과도 어긋난다.
//
// 이 스크립트는 세 엔진을 실제로 돌려 같은 시주가 나오는지 단언한다.
// 정적 엔진은 소스에서 함수 본문을 그대로 추출해 쓰므로 복제 공식이 아니라 정본을 검사한다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./lib/load-ts-module.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let failures = 0;

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    failures++;
    console.error(`  ✗ ${label}: expected ${expected}, got ${actual}`);
    return false;
  }
  return true;
}

// ── A. 정적 셸 엔진 (js/saju-engine.js 소스에서 정본 함수를 추출) ─────────────
const engineSrc = fs.readFileSync(path.join(root, "js/saju-engine.js"), "utf8");
function extractTopLevel(pattern) {
  const m = engineSrc.match(pattern);
  if (!m) throw new Error(`정적 엔진에서 코드 조각을 찾지 못함: ${pattern}`);
  return m[0];
}
const shell = new Function(`${[
  extractTopLevel(/^var _CD_STEMS_HANJA = .*$/m),
  extractTopLevel(/^var _CD_BRANCHES_HANJA = .*$/m),
  extractTopLevel(/^function _shiftDatePartsByDays[\s\S]*?^}/m),
  extractTopLevel(/^function _applyTrueSolarTimeCorrection[\s\S]*?^}/m),
  extractTopLevel(/^function _cdCivilDayPillar[\s\S]*?^}/m),
  extractTopLevel(/^function _cdHourPillarFromDayStem[\s\S]*?^}/m),
].join("\n")}
return { _applyTrueSolarTimeCorrection, _cdCivilDayPillar, _cdHourPillarFromDayStem };`)();

// 정적 엔진에 균시차 항이 남아 있지 않은지(= 정책이 조용히 되돌아가지 않았는지) 직접 확인한다.
if (/equationOfTime/i.test(extractTopLevel(/^function _applyTrueSolarTimeCorrection[\s\S]*?^}/m))) {
  failures++;
  console.error("  ✗ js/saju-engine.js _applyTrueSolarTimeCorrection 에 균시차 항이 되살아났다 (정책: 경도 보정만)");
}

function shellHourPillar({ year, month, day, hour, minute, longitude }) {
  const corr = shell._applyTrueSolarTimeCorrection({
    year, month, day, hour, minute,
    longitude,
    standardMeridian: 135,
  });
  const civilDay = shell._cdCivilDayPillar(year, month, day, hour);
  const hourPillar = shell._cdHourPillarFromDayStem(civilDay.g, corr.correctedHour);
  return {
    hour: hourPillar.g + hourPillar.j,
    day: civilDay.g + civilDay.j,
    correctedTime: `${String(corr.correctedHour).padStart(2, "0")}:${String(corr.correctedMinute).padStart(2, "0")}`,
  };
}

// ── B. 워커 엔진 ────────────────────────────────────────────────────────────
const { buildSajuProfile } = await import("../worker/lib/destiny-bias-engine.js");

function workerHourPillar({ year, month, day, hour, minute, longitude, latitude, policy }) {
  const profile = buildSajuProfile({
    name: "패리티",
    gender: "M",
    calendarType: "solar",
    timezone: "Asia/Seoul",
    ...(policy ? { hourPillarTimePolicy: policy } : {}),
    birth: { year, month, day, hour, minute, calendarType: "solar" },
    location: { name: "출생지", latitude, longitude, timezone: "Asia/Seoul" },
  });
  return {
    hour: profile?.pillars?.hour?.ganji || "",
    day: profile?.pillars?.day?.ganji || "",
    correctedTime: profile?.timeCorrection?.correctedDateTime || "",
    equationOfTimeMinutes: profile?.timeCorrection?.equationOfTimeMinutes,
  };
}

// ── C. Next.js 엔진 ────────────────────────────────────────────────────────
const { calculateLocalSaju } = loadTsModule("app/saju/animal-destiny/engine/localSajuCalculator.ts");

const KO_TO_HANJA = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 유: "酉", 술: "戌", 해: "亥",
};
// 신(辛/申)은 천간·지지에 같은 한글이 겹치므로 자리별로 변환한다.
function koGanjiToHanja(ganji) {
  const stem = String(ganji || "").charAt(0);
  const branch = String(ganji || "").charAt(1);
  const branchHanja = branch === "신" ? "申" : KO_TO_HANJA[branch];
  return `${KO_TO_HANJA[stem] || ""}${branchHanja || ""}`;
}

function localHourPillar({ year, month, day, hour, minute, longitude, latitude, policy }) {
  const result = calculateLocalSaju({
    hasTime: true,
    calendarType: "solar",
    timezone: "Asia/Seoul",
    year, month, day, hour, minute,
    gender: "male",
    ...(policy ? { hourPillarTimePolicy: policy } : {}),
    ...(longitude == null ? {} : { longitude, latitude }),
  });
  const corrected = result.calculationEvidence?.correctedClock;
  return {
    hour: koGanjiToHanja(result.pillars?.hour?.ganji),
    day: koGanjiToHanja(result.pillars?.day?.ganji),
    correctedTime: corrected
      ? `${String(corrected.hour).padStart(2, "0")}:${String(corrected.minute).padStart(2, "0")}`
      : "",
    policy: result.hourPillarTimePolicy,
  };
}

// ── 케이스 ─────────────────────────────────────────────────────────────────
const SEOUL = { longitude: 126.978, latitude: 37.5665 };
const DAEGU = { longitude: 128.6014, latitude: 35.8714 };

const CASES = [
  {
    label: "본 건 — 2022-10-25 13:20 서울 (미시→오시 전환)",
    birth: { year: 2022, month: 10, day: 25, hour: 13, minute: 20, ...SEOUL },
    expectHour: "甲午",
    expectDay: "辛亥",
    expectCorrected: "12:48",
  },
  {
    label: "오시 하단 경계 — 2022-10-25 11:05 서울 (보정 후 사시)",
    birth: { year: 2022, month: 10, day: 25, hour: 11, minute: 5, ...SEOUL },
    expectHour: "癸巳",
    expectDay: "辛亥",
    expectCorrected: "10:33",
  },
  {
    // 2022-01-01 은 갑인(甲寅)일, 전날 2021-12-31 은 계축(癸丑)일.
    // 보정이 전날 23:43 으로 넘어가도 일주가 갑인으로 남아야 한다(계축이면 하루 밀림 버그).
    label: "자정 역월 — 2022-01-01 00:15 서울 (보정이 전날로 넘어가도 일주는 그대로)",
    birth: { year: 2022, month: 1, day: 1, hour: 0, minute: 15, ...SEOUL },
    expectHour: "甲子",
    expectDay: "甲寅",
    expectCorrected: "23:43",
  },
  {
    // 10월(균시차 +16분)과 달리 7월은 균시차가 −5분대다. 두 날짜의 보정량이 모두 −32분으로
    // 같아야 균시차가 실제로 빠졌다는 증거가 된다.
    label: "여름(균시차 부호 반대) — 2022-07-15 13:20 서울",
    birth: { year: 2022, month: 7, day: 15, hour: 13, minute: 20, ...SEOUL },
    expectHour: "庚午",
    expectDay: "己巳",
    expectCorrected: "12:48",
  },
  {
    label: "기존 일주 회귀 케이스 — 1981-01-27 00:30 대구",
    birth: { year: 1981, month: 1, day: 27, hour: 0, minute: 30, ...DAEGU },
    expectHour: "丙子",
    expectDay: "乙巳",
    expectCorrected: "00:04",
  },
  {
    label: "정책 명시 TRUE_SOLAR_TIME — 2022-10-25 13:20 서울 (균시차 포함, 미시 유지)",
    birth: { year: 2022, month: 10, day: 25, hour: 13, minute: 20, ...SEOUL },
    policy: "TRUE_SOLAR_TIME",
    expectHour: "乙未",
    expectDay: "辛亥",
    expectCorrected: "13:04",
  },
];

console.log("=== 시주 시각 보정 패리티: 정적 셸 / 워커 / Next.js 엔진 ===\n");

for (const testCase of CASES) {
  const args = { ...testCase.birth, policy: testCase.policy };
  const results = {
    "정적 셸": testCase.policy === "TRUE_SOLAR_TIME" ? null : shellHourPillar(testCase.birth),
    "워커": workerHourPillar(args),
    "Next.js": localHourPillar(args),
  };

  console.log(`[${testCase.label}]`);
  for (const [engine, out] of Object.entries(results)) {
    if (!out) {
      // 정적 셸은 정책 인자가 없는 단일 정책 엔진이라 TRUE_SOLAR_TIME 케이스에서는 제외한다.
      console.log(`  ${engine.padEnd(8)} (정책 인자 없음 — 검사 제외)`);
      continue;
    }
    console.log(`  ${engine.padEnd(8)} 보정=${out.correctedTime} 일주=${out.day} 시주=${out.hour}`);
    assertEqual(out.hour, testCase.expectHour, `${testCase.label} / ${engine} 시주`);
    assertEqual(out.day, testCase.expectDay, `${testCase.label} / ${engine} 일주`);
  }

  // 보정 시각은 정적 셸·Next.js 만 분 단위로 노출한다(워커 증거는 날짜까지 붙은 문자열이라 포함 여부만 본다).
  if (results["정적 셸"]) {
    assertEqual(results["정적 셸"].correctedTime, testCase.expectCorrected, `${testCase.label} / 정적 셸 보정 시각`);
  }
  assertEqual(results["Next.js"].correctedTime, testCase.expectCorrected, `${testCase.label} / Next.js 보정 시각`);
  if (!String(results["워커"].correctedTime).includes(testCase.expectCorrected)) {
    failures++;
    console.error(`  ✗ ${testCase.label} / 워커 보정 시각: ${testCase.expectCorrected} 를 포함해야 하는데 ${results["워커"].correctedTime}`);
  }
  // 안 쓴 균시차를 보정 내역에 실어 보내면 읽는 쪽이 적용된 것으로 오해한다(신고의 원인이었던 착시).
  if (testCase.policy !== "TRUE_SOLAR_TIME") {
    assertEqual(results["워커"].equationOfTimeMinutes, 0, `${testCase.label} / 워커 보정 내역의 균시차는 0 이어야 한다`);
  }
  console.log("");
}

// 경도가 없는 비한국 표준시 입력은 서울 경도를 먹지 않고 보정을 건너뛰어야 한다(fail-safe).
{
  console.log("[fail-safe — 경도 없는 비KST 입력은 보정하지 않는다]");
  const noCoords = calculateLocalSaju({
    hasTime: true, calendarType: "solar", timezone: "America/New_York",
    year: 2022, month: 10, day: 25, hour: 13, minute: 20, gender: "male",
  });
  const corrected = noCoords.calculationEvidence?.correctedClock;
  console.log(`  Next.js  정책=${noCoords.hourPillarTimePolicy} 보정적용=${noCoords.trueSolarTimeUsed} 시각=${corrected.hour}:${String(corrected.minute).padStart(2, "0")}`);
  assertEqual(noCoords.trueSolarTimeUsed, false, "비KST + 경도 없음 → 보정 미적용");
  assertEqual(corrected.hour, 13, "비KST + 경도 없음 → 시각 원본 유지");
  console.log("");
}

// 경도가 없는 한국 표준시 입력은 서울 기본 경도로 보정돼 정적 셸과 같은 시주를 내야 한다.
{
  console.log("[경도 없는 KST 입력은 서울 기본 경도로 보정한다]");
  const noCoordsKst = localHourPillar({ year: 2022, month: 10, day: 25, hour: 13, minute: 20, longitude: null });
  console.log(`  Next.js  정책=${noCoordsKst.policy} 보정=${noCoordsKst.correctedTime} 시주=${noCoordsKst.hour}`);
  assertEqual(noCoordsKst.hour, "甲午", "KST + 경도 없음 → 서울 기본 경도 보정");
  assertEqual(noCoordsKst.correctedTime, "12:48", "KST + 경도 없음 → 보정 시각");
  console.log("");
}

if (failures > 0) {
  console.error(`\n실패 ${failures}건 — 세 엔진의 시주 시각 보정 정책이 어긋났다.`);
  process.exit(1);
}
console.log("모든 케이스 통과 — 세 엔진의 시주가 일치한다.");
