// 사주 일주(日柱) 날짜 경계 회귀 테스트
//
// 정책: 일주는 KST 민용일(달력 날짜) 기준으로 판정하고,
//       시주 시각 보정(기본 평균태양시 = 경도만, 명시하면 진태양시 = 경도+균시차)은
//       시주(時柱)에만 적용한다. 보정이 자정을 넘겨도 일주는 밀리지 않는다.
//
// 재현 버그: 1981-01-27 00:30 대구(경도 128.60°E)에서 진태양시 보정이
//           자정을 넘겨(00:30 → 전날 23:52) 일주를 을사(乙巳) 대신 갑진(甲辰)으로 냈다.
//
// 이 테스트는 (a) 특정 도시 하드코딩이 아니라 일주 경계 로직이
// 모든 한국 지역에서 민용일 기준으로 동작하는지, (b) 각 도시 경도가
// 시주 보정 증거에는 서로 다르게 반영되는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Solar } from "lunar-javascript";
import { loadTsModule } from "./lib/load-ts-module.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assert(condition, label) {
  if (!condition) throw new Error(label);
}

// 진태양시(경도 + 균시차) 보정 — 이 테스트가 재현하려는 "자정을 넘겨 일주가 밀리는" 상황을
// 만들려면 균시차까지 더한 최대 보정이 필요하다. 런타임 기본 정책은 평균태양시(경도만)이며
// 세 엔진의 정책 일치는 scripts/verify-hour-pillar-parity.mjs 가 따로 검사한다.
function getDayOfYearUtc(year, month, day) {
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
}
function equationOfTimeMinutes(year, month, day) {
  const n = getDayOfYearUtc(year, month, day);
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}
function shiftDatePartsByDays(year, month, day, dayOffset) {
  const s = new Date(Date.UTC(year, month - 1, day) + dayOffset * 86400000);
  return { year: s.getUTCFullYear(), month: s.getUTCMonth() + 1, day: s.getUTCDate() };
}
function applyTrueSolarTimeCorrection({ year, month, day, hour, minute, longitude, standardMeridian }) {
  const correctedTotal = hour * 60 + minute + (longitude - standardMeridian) * 4 + equationOfTimeMinutes(year, month, day);
  const roundedTotal = Math.round(correctedTotal);
  const dayOffset = Math.floor(roundedTotal / 1440);
  const minuteOfDay = ((roundedTotal % 1440) + 1440) % 1440;
  const shifted = shiftDatePartsByDays(year, month, day, dayOffset);
  return { ...shifted, hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60, dayOffset };
}

// 특정 달력 날짜의 일진(정오 기준 — 자시 경계와 무관하게 그 날의 일간지 고정값)
function dayGanZhiOf(year, month, day) {
  return Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar().getDayInGanZhi();
}

// BIRTH_PLACE_GROUPS 좌표(js/saju-engine.js / public/js/birth-place-groups.js 와 동일)
const CITIES = [
  { name: "서울", lon: 126.9780, lat: 37.5665 },
  { name: "인천", lon: 126.7052, lat: 37.4563 },
  { name: "대구", lon: 128.6014, lat: 35.8714 },
  { name: "부산", lon: 129.0756, lat: 35.1796 },
  { name: "광주", lon: 126.8526, lat: 35.1595 },
  { name: "제주", lon: 126.5312, lat: 33.4996 },
];

const STD_MERIDIAN = 135;

console.log("=== [진단] 정적 엔진 _applyTrueSolarTimeCorrection → 일진 (1981-01-27 00:30) ===");
for (const city of CITIES) {
  const corr = applyTrueSolarTimeCorrection({
    year: 1981, month: 1, day: 27, hour: 0, minute: 30,
    longitude: city.lon, standardMeridian: STD_MERIDIAN,
  });
  const correctedIljin = dayGanZhiOf(corr.year, corr.month, corr.day);
  const civilIljin = dayGanZhiOf(1981, 1, 27);
  console.log(
    `${city.name}(${city.lon}°E): 보정일=${corr.year}-${corr.month}-${corr.day} ${String(corr.hour).padStart(2, "0")}:${String(corr.minute).padStart(2, "0")} ` +
    `dayOffset=${corr.dayOffset} | 보정일 일진=${correctedIljin} | 민용일(1/27) 일진=${civilIljin}`,
  );
  // 정책 검증: 민용일 일진은 을사(乙巳) 여야 한다(모든 도시 공통).
  assertEqual(civilIljin, "乙巳", `${city.name} 민용일(1/27) 일진`);
}

console.log("\n=== [회귀] 모던 엔진 calculateLocalSaju 일주 (1981-01-27 00:30, 도시별) ===");
const { calculateLocalSaju } = loadTsModule("app/saju/animal-destiny/engine/localSajuCalculator.ts");

for (const city of CITIES) {
  const result = calculateLocalSaju({
    hasTime: true,
    calendarType: "solar",
    timezone: "Asia/Seoul",
    year: 1981, month: 1, day: 27, hour: 0, minute: 30,
    gender: "male",
    longitude: city.lon,
    latitude: city.lat,
    useTrueSolarTime: true,
  });
  const day = result.pillars.day.ganji;
  const hour = result.pillars.hour?.ganji;
  const corrClock = result.calculationEvidence.correctedClock;
  console.log(
    `${city.name}(${city.lon}°E): 일주=${day} 시주=${hour} | 보정시각=${corrClock.year}-${corrClock.month}-${corrClock.day} ` +
    `${String(corrClock.hour).padStart(2, "0")}:${String(corrClock.minute).padStart(2, "0")} | trueSolarUsed=${result.trueSolarTimeUsed}`,
  );
  // 정책 검증: 일주=을사, 시주=병자(을일 자시), 모든 도시 동일해야 한다.
  assertEqual(day, "을사", `${city.name} 모던 엔진 일주`);
  assertEqual(hour, "병자", `${city.name} 모던 엔진 시주(을일 자시 = 병자)`);
  // 경도가 실제로 보정 증거에 반영되는지(도시가 서로 다른 처리를 받는지) 확인
  assertEqual(result.trueSolarTimeUsed, true, `${city.name} 진태양시 적용 플래그`);
}

console.log("\n=== [회귀] 자시 경계 (23:30 / 00:30 / 01:30, 대구, 민용일 기준) ===");
// 민용일 기준(야자시 기본 off = late): 23:30은 그 날, 00:30/01:30은 그 날.
const daegu = CITIES.find((c) => c.name === "대구");
for (const [h, m, expectedDay] of [[23, 30, "1/26 야자시"], [0, 30, "1/27 자시"], [1, 30, "1/27 축시"]]) {
  const result = calculateLocalSaju({
    hasTime: true, calendarType: "solar", timezone: "Asia/Seoul",
    year: 1981, month: 1, day: 27, hour: h, minute: m, gender: "male",
    longitude: daegu.lon, latitude: daegu.lat, useTrueSolarTime: true,
  });
  console.log(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} (${expectedDay}): 일주=${result.pillars.day.ganji} 시주=${result.pillars.hour?.ganji}`);
}
// 1981-01-27 은 을사일, 1981-01-26 은 갑진일. late(기본) 야자시에서 23:30(1/27)은 1/27 을사여야 한다.
{
  const r2330 = calculateLocalSaju({
    hasTime: true, calendarType: "solar", timezone: "Asia/Seoul",
    year: 1981, month: 1, day: 27, hour: 23, minute: 30, gender: "male",
    longitude: daegu.lon, latitude: daegu.lat, useTrueSolarTime: true,
  });
  assertEqual(r2330.pillars.day.ganji, "을사", "1981-01-27 23:30 대구 일주(민용일 을사, 진태양시가 다음날로 넘기지 않음)");
}

// 정책 미지정(런타임 기본 = 평균태양시)에서도 자정을 넘기는 보정이 일주를 밀지 않는지.
// 대구 경도 보정 -25.6분이라 00:15 출생이 전날 23:49 가 된다.
{
  const lmt = calculateLocalSaju({
    hasTime: true, calendarType: "solar", timezone: "Asia/Seoul",
    year: 1981, month: 1, day: 27, hour: 0, minute: 15, gender: "male",
    longitude: daegu.lon, latitude: daegu.lat,
  });
  const corr = lmt.calculationEvidence.correctedClock;
  console.log(
    `기본 정책(${lmt.hourPillarTimePolicy}) 대구 00:15: 일주=${lmt.pillars.day.ganji} 시주=${lmt.pillars.hour?.ganji} ` +
    `| 보정시각=${corr.year}-${corr.month}-${corr.day} ${String(corr.hour).padStart(2, "0")}:${String(corr.minute).padStart(2, "0")}`,
  );
  assertEqual(lmt.hourPillarTimePolicy, "LOCAL_MEAN_TIME", "정책 미지정 시 기본값은 평균태양시");
  assertEqual(corr.day, 26, "평균태양시 보정도 자정을 넘기는지(재현 전제)");
  assertEqual(lmt.pillars.day.ganji, "을사", "기본 정책 대구 00:15 일주(민용일 을사)");
  assertEqual(lmt.pillars.hour?.ganji, "병자", "기본 정책 대구 00:15 시주(오자둔 병자)");
}

console.log("\n=== [검증] 정적 엔진 js/saju-engine.js 헬퍼(_cdCivilDayPillar / _cdHourPillarFromDayStem) ===");
// 실제 엔진 소스에서 순수 헬퍼를 추출해 lunar-javascript 및 오자둔 기준값과 대조한다.
const engineSrc = fs.readFileSync(path.join(root, "js/saju-engine.js"), "utf8");
function extractTopLevel(pattern) {
  const m = engineSrc.match(pattern);
  if (!m) throw new Error(`정적 엔진에서 코드 조각을 찾지 못함: ${pattern}`);
  return m[0];
}
const helperSrc = [
  extractTopLevel(/^var _CD_STEMS_HANJA = .*$/m),
  extractTopLevel(/^var _CD_BRANCHES_HANJA = .*$/m),
  extractTopLevel(/^function _shiftDatePartsByDays[\s\S]*?^}/m),
  extractTopLevel(/^function _applyTrueSolarTimeCorrection[\s\S]*?^}/m),
  extractTopLevel(/^function _cdCivilDayPillar[\s\S]*?^}/m),
  extractTopLevel(/^function _cdHourPillarFromDayStem[\s\S]*?^}/m),
].join("\n");
const engineHelpers = new Function(`${helperSrc}\nreturn { _applyTrueSolarTimeCorrection, _cdCivilDayPillar, _cdHourPillarFromDayStem };`)();

// (1) 민용일 일주가 lunar-javascript 일진과 모든 날짜에서 일치하는지 (에포크 오프셋 정합성)
{
  let checked = 0;
  const start = Date.UTC(1900, 0, 1);
  for (let i = 0; i < 200 * 366; i += 37) { // 1900~2100 범위를 성기게 스윕
    const dt = new Date(start + i * 86400000);
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const engine = engineHelpers._cdCivilDayPillar(y, m, d, 12); // 정오: 야자시 미적용
    const expected = dayGanZhiOf(y, m, d);
    assertEqual(engine.g + engine.j, expected, `_cdCivilDayPillar ${y}-${m}-${d}`);
    checked++;
  }
  console.log(`민용일 일주 ↔ lunar-javascript 일진 정합: ${checked}개 날짜 OK`);
}

// (2) 야자시(23시대) → 익일 일진
{
  const yaja = engineHelpers._cdCivilDayPillar(1981, 1, 27, 23); // 1/27 23시 → 1/28 일진
  const nextDay = dayGanZhiOf(1981, 1, 28);
  assertEqual(yaja.g + yaja.j, nextDay, "_cdCivilDayPillar 야자시(23시)→익일");
  console.log(`야자시 23시 → 익일 일진(${nextDay}) OK`);
}

// (3) 오자둔(五鼠遁) 시주: 일간별 자시 천간
{
  const cases = [
    ["甲", "甲子"], ["己", "甲子"], // 갑기 → 갑자시
    ["乙", "丙子"], ["庚", "丙子"], // 을경 → 병자시
    ["丙", "戊子"], ["辛", "戊子"], // 병신 → 무자시
    ["丁", "庚子"], ["壬", "庚子"], // 정임 → 경자시
    ["戊", "壬子"], ["癸", "壬子"], // 무계 → 임자시
  ];
  for (const [dayStem, ziHour] of cases) {
    const h = engineHelpers._cdHourPillarFromDayStem(dayStem, 0); // 00시 = 자시
    assertEqual(h.g + h.j, ziHour, `오자둔 ${dayStem}일 자시`);
  }
  // 시지 경계: 을일 축시(01:30 보정 전제) = 정축, 을일 해시(22:xx) = 정해
  assertEqual((() => { const h = engineHelpers._cdHourPillarFromDayStem("乙", 2); return h.g + h.j; })(), "丁丑", "을일 축시(02시)");
  assertEqual((() => { const h = engineHelpers._cdHourPillarFromDayStem("乙", 22); return h.g + h.j; })(), "丁亥", "을일 해시(22시)");
  console.log(`오자둔 시주 파생(자/축/해시) OK`);
}

// (4) 정적 엔진 버그 케이스 end-to-end: 1981-01-27 00:30 대구 (진태양시 = 경도+균시차, 최대 보정)
{
  const daeguLon = 128.6014;
  const corr = applyTrueSolarTimeCorrection({
    year: 1981, month: 1, day: 27, hour: 0, minute: 30,
    longitude: daeguLon, standardMeridian: STD_MERIDIAN,
  });
  // (수정 전) 보정일 기준이면 갑진, (수정 후) 민용일 기준이면 을사
  const day = engineHelpers._cdCivilDayPillar(1981, 1, 27, 0); // 민용일
  const hour = engineHelpers._cdHourPillarFromDayStem(day.g, corr.hour); // 보정 시각(23:52)
  assertEqual(corr.dayOffset, -1, "진태양시 보정이 자정을 넘겨 전날로 밀렸는지(재현 전제)");
  assertEqual(day.g + day.j, "乙巳", "정적 엔진 대구 00:30 일주(민용일 을사)");
  assertEqual(hour.g + hour.j, "丙子", "정적 엔진 대구 00:30 시주(오자둔 병자)");
  console.log(`정적 엔진 대구 00:30 진태양시 → 일주=乙巳 시주=丙子 OK (보정시각 ${corr.hour}:${String(corr.minute).padStart(2, "0")})`);
}

// (5) 현행 정적 엔진(평균태양시)로도 자정을 넘기는 케이스에서 일주가 밀리지 않는지
//     대구 경도 보정은 -25.6분이라 00:15 출생이 전날 23:49 가 된다.
{
  const corr = engineHelpers._applyTrueSolarTimeCorrection({
    year: 1981, month: 1, day: 27, hour: 0, minute: 15,
    longitude: 128.6014, standardMeridian: STD_MERIDIAN,
  });
  const day = engineHelpers._cdCivilDayPillar(1981, 1, 27, 0);
  const hour = engineHelpers._cdHourPillarFromDayStem(day.g, corr.correctedHour);
  assertEqual(corr.dayOffset, -1, "평균태양시 보정도 자정을 넘기는지(재현 전제)");
  assertEqual(day.g + day.j, "乙巳", "정적 엔진 대구 00:15 일주(민용일 을사 — 전날 갑진으로 밀리면 실패)");
  assertEqual(hour.g + hour.j, "丙子", "정적 엔진 대구 00:15 시주(오자둔 병자)");
  console.log(`정적 엔진 대구 00:15 평균태양시 → 일주=乙巳 시주=丙子 OK (보정시각 ${corr.correctedHour}:${String(corr.correctedMinute).padStart(2, "0")})`);
}

console.log("\n=== [검증] 출생지 복원 최근접 매칭(_dpSelectBirthPlaceOption) — 대구/부산 및 전 지역 ===");
// destiny-profile.js 의 실제 헬퍼를 추출해 목(mock) 드롭다운으로 검증한다.
const dpSrc = fs.readFileSync(path.join(root, "js/destiny-profile.js"), "utf8");
const dpHelperMatch = dpSrc.match(/^ {2}function _dpSelectBirthPlaceOption[\s\S]*?^ {2}}/m);
if (!dpHelperMatch) throw new Error("destiny-profile.js에서 _dpSelectBirthPlaceOption을 찾지 못함");
const selectBirthPlaceOption = new Function(`${dpHelperMatch[0]}\nreturn _dpSelectBirthPlaceOption;`)();

// 실제 BIRTH_PLACE_GROUPS 순서(부산이 대구보다 앞) — 과거 버그는 이 순서에서 대구→부산으로 오선택했다.
const LIST_ORDER = [
  { name: "서울", lon: 126.9780, lat: 37.5665 },
  { name: "부산", lon: 129.0756, lat: 35.1796 },
  { name: "인천", lon: 126.7052, lat: 37.4563 },
  { name: "대구", lon: 128.6014, lat: 35.8714 },
  { name: "광주", lon: 126.8526, lat: 35.1595 },
  { name: "대전", lon: 127.3845, lat: 36.3504 },
  { name: "제주", lon: 126.5312, lat: 33.4996 },
];
function makeMockSelect(cities) {
  return {
    selectedIndex: -1,
    dispatchEvent() { return true; },
    options: cities.map((c) => ({
      value: "Asia/Seoul",
      text: c.name,
      getAttribute(attr) {
        if (attr === "data-long") return String(c.lon);
        if (attr === "data-lat") return String(c.lat);
        return null;
      },
    })),
  };
}
// 모든 도시: 저장된 좌표로 복원 시 정확히 그 도시가 선택돼야 한다(하드코딩 없이 전 지역).
for (const city of LIST_ORDER) {
  const sel = makeMockSelect(LIST_ORDER);
  selectBirthPlaceOption(sel, "Asia/Seoul", city.lon, city.lat);
  const picked = sel.options[sel.selectedIndex].text;
  assertEqual(picked, city.name, `출생지 복원 ${city.name}(${city.lon}°E)`);
}
console.log(`출생지 복원: ${LIST_ORDER.map((c) => c.name).join("/")} 각각 정확 선택 OK`);
// 회귀 핵심: 대구(128.60) 저장값이 부산(129.08)으로 새지 않는다(경도차 0.47<1도 함정).
{
  const sel = makeMockSelect(LIST_ORDER);
  selectBirthPlaceOption(sel, "Asia/Seoul", 128.6014, 35.8714);
  assertEqual(sel.options[sel.selectedIndex].text, "대구", "대구 좌표가 부산으로 오선택되지 않음(Bug1 회귀)");
  console.log(`대구 좌표(128.60°E) → 대구 선택(부산 아님) OK`);
}
// 좌표 없이 tz만 있을 때: tz 일치 첫 옵션 폴백
{
  const sel = makeMockSelect(LIST_ORDER);
  const ok = selectBirthPlaceOption(sel, "Asia/Seoul");
  assertEqual(ok, true, "좌표 없음 tz 폴백 성공");
  assertEqual(sel.options[sel.selectedIndex].text, "서울", "좌표 없음 → tz 일치 첫 옵션(서울)");
}

console.log("\nPASS saju day-pillar civil-date regression");
