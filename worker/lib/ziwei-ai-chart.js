// 🔴 음양력 변환은 한국 음양력 코어(KST 기준)만 쓴다. lunar-javascript 는 중국 표준시(UTC+8)
// 기준이라 삭이 CST 23시대에 들면 그 달 전체의 음력일이 하루 밀리고, 음력일이 밀리면 자미성이
// 밀려 14주성이 통째로 어긋난다(1900~2100 전수 4.08% — verify:korean-calendar-divergence).
import { sexagenaryYearIndexes, solarToLunar, lunarToSolar } from "../../lib/korean-calendar/index.js";
// 소한 상수·계산은 셸 엔진과 공유한다(lib/ziwei-minor-limit.js 머리말 참고).
import { buildMinorLimitEntries, describeMinorLimit } from "../../lib/ziwei-minor-limit.js";
// 화성·영성 기점도 같은 이유로 공유한다(lib/ziwei-fire-bell.js 머리말 참고).
import { placeFireAndBell } from "../../lib/ziwei-fire-bell.js";
// 별 강약은 정본 하나만 읽는다(lib/ziwei-star-strength.js 머리말 참고).
import { normalizeZiweiStrengthNotation, starStrength } from "../../lib/ziwei-star-strength.js";
// 출생 시각 보정(경도·과거 서머타임)은 셸·앱 진입점과 같은 정본을 쓴다(lib/ziwei-birth-clock.js 머리말 참고).
import { ziweiBirthClock } from "../../lib/ziwei-birth-clock.js";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const PALACE_NAMES = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
const MAIN_STARS = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
const ASSISTANT_STARS = ["문창", "문곡", "좌보", "우필", "천괴", "천월", "녹존", "천마", "함지", "천요"];
const MALEFIC_STARS = ["경양", "타라", "화성", "영성", "지공", "지겁"];

// 천간 → 사화 표. Threads 자미두수 발행(유월·유일 사화)도 이 표를 그대로 import 한다 — 복제 금지.
export const FOUR_TRANSFORMATIONS = {
  갑: { huaLu: "염정", huaQuan: "파군", huaKe: "무곡", huaJi: "태양" },
  을: { huaLu: "천기", huaQuan: "천량", huaKe: "자미", huaJi: "태음" },
  병: { huaLu: "천동", huaQuan: "천기", huaKe: "문창", huaJi: "염정" },
  정: { huaLu: "태음", huaQuan: "천동", huaKe: "천기", huaJi: "거문" },
  무: { huaLu: "탐랑", huaQuan: "태음", huaKe: "우필", huaJi: "천기" },
  기: { huaLu: "무곡", huaQuan: "탐랑", huaKe: "천량", huaJi: "문곡" },
  경: { huaLu: "태양", huaQuan: "무곡", huaKe: "태음", huaJi: "천동" },
  신: { huaLu: "거문", huaQuan: "태양", huaKe: "문곡", huaJi: "문창" },
  임: { huaLu: "천량", huaQuan: "자미", huaKe: "좌보", huaJi: "무곡" },
  계: { huaLu: "파군", huaQuan: "거문", huaKe: "태음", huaJi: "탐랑" },
};

export const TRANSFORMATION_LABELS = {
  huaLu: "화록",
  huaQuan: "화권",
  huaKe: "화과",
  huaJi: "화기",
};

// 별 강약 — 정본 lib/ziwei-star-strength.js(『全書』 권3 원전 + 현대 보충, 7등급)를 읽는다.
// 2026-10-01 S5: 옛 28성 표(원전 기재 126칸 중 49칸만 일치)와 5단 접기(왕→묘, 약→리, 불·한→평)를 걷었다.
// 강약은 길흉이 아니라 그 별의 성질이 얼마나 또렷하게 드러나는가다. 원전에 강약 줄이 없는 별
// (좌보·우필·녹존·천괴·천월·천마·지공·지겁·함지·천요)은 brightness 키를 만들지 않는다.
// glyph 는 화면 표기(셸·앱 명반)와 같은 한자 한 글자다.
const ZIWEI_STRENGTH_GLYPH = Object.freeze({ 묘: "廟", 왕: "旺", 득: "得", 리: "利", 평: "平", 불: "不", 함: "陷" });

function brightnessFor(starName, branchIndex) {
  const strength = starStrength(starName, branchIndex);
  return strength.status === "rated" ? strength.rawKo : "";
}

/**
 * 강약 등급 → { level(묘·왕·득·리·평·불·함), symbol(한자 한 글자), meaning(정본 풀이) }. 모르는 표기·빈 값이면 null.
 * 이 변경 전에 저장된 명반의 brightness 는 접힌 5단(묘·득·리·평·함)이라 같은 이름으로 그대로 읽힌다.
 */
export function describeBrightness(level) {
  const notation = normalizeZiweiStrengthNotation(level);
  const symbol = notation.status === "mapped" ? ZIWEI_STRENGTH_GLYPH[notation.rawKo] : "";
  return symbol ? { level: notation.rawKo, symbol, meaning: notation.label } : null;
}

/** "자미(묘)" 형태의 표기. 강약 정보가 없으면 별 이름만 반환(가짜 근거 생성 금지). */
export function formatStarWithBrightness(starName, level) {
  const desc = describeBrightness(level);
  return desc ? `${starName}(${desc.level})` : starName;
}

function mod(value, size = 12) {
  return ((Number(value) % size) + size) % size;
}

function clean(value, max = 0) {
  const text = String(value ?? "").trim();
  return max > 0 ? text.slice(0, max) : text;
}

function parseDate(dateText, lunar = false) {
  const match = clean(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (lunar) return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 30
    ? { year, month, day } : null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || year > 2100) return null;
  return { year, month, day };
}

function parseTime(timeText, unknown) {
  if (unknown) return { hour: 12, minute: 0, unknown: true };
  const match = clean(timeText).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]), unknown: false };
}

/**
 * 명반의 음력 날짜.
 * 🔴 자미두수의 년간지는 **음력 프레임**이다 — 세차가 설날에 바뀐다. 코어의 ganji() 는
 * 절기 프레임(입춘 경계)이라 여기서 쓰면 안 된다. 음력해에서 직접 유도한다.
 */
function getLunarDate(parts, calendarType, isLeapMonth, nextDay = false) {
  if (calendarType === "lunar") {
    const leap = Boolean(isLeapMonth);
    const solar = lunarToSolar(parts.year, parts.month, parts.day, leap);
    if (!solar) {
      const error = new Error("INVALID_LUNAR_BIRTH_DATE");
      error.code = "INVALID_INPUT";
      throw error;
    }
    if (nextDay) return lunarOfSolarDay(solar, true);
    return {
      lunarYear: parts.year,
      lunarMonth: Math.abs(parts.month),
      lunarDay: parts.day,
      isLeapMonth: leap,
      source: "user-lunar-input",
    };
  }

  return lunarOfSolarDay(parts, nextDay);
}

/**
 * 23시대(23:00~23:59) 출생은 다음 날 子時로 친다(子初換日). iztro 2.6.1 기본값(dayDivide forward)과
 * 사이트 사주 공개 방법론(보정 시각 23시 이후는 다음 날)이 같다. 『全書』 卷三의 子時 설명
 * ("上午刻属昨夜亥时，下午刻属今日子时")은 모호해 유파 선택으로 기록한다.
 * 음력 변환에 넣는 날짜만 민다 — 소한 기준 연도 탐색과 씨앗 연도는 입력 날짜 그대로 쓴다.
 */
function lunarOfSolarDay({ year, month, day }, nextDay) {
  const civil = new Date(Date.UTC(year, month - 1, day + (nextDay ? 1 : 0)));
  const lunar = solarToLunar(civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate());
  if (!lunar) {
    const error = new Error("UNSUPPORTED_BIRTH_DATE");
    error.code = "INVALID_INPUT";
    throw error;
  }
  return {
    lunarYear: lunar.lunarYear,
    lunarMonth: lunar.lunarMonth,
    lunarDay: lunar.lunarDay,
    isLeapMonth: lunar.isLeapMonth,
    source: "korean-calendar-core",
  };
}

/**
 * 윤달 배치 월 — 윤달 15일까지는 그 달, 16일부터는 다음 달로 친다(15일 분할).
 * 『紫微斗數全書』 安身命例는 윤달 전체를 다음 달로 보고("闰月正月生者要在二月内起安身命"),
 * iztro 2.6.1 기본값(fixLeap)은 15일 분할이다. 16일 이후는 두 출처가 함께 다음 달이라 고치고,
 * 15일까지는 출처가 갈려 기존 값(그 달)을 유지한다. 보고하는 음력 날짜(월·윤달 여부)는 그대로다.
 */
function placementMonth({ lunarMonth, lunarDay, isLeapMonth }) {
  return isLeapMonth && lunarDay > 15 ? (lunarMonth % 12) + 1 : lunarMonth;
}

function hourIndex(hour) {
  return hour === 23 || hour === 0 ? 0 : Math.floor((hour + 1) / 2);
}

function createPalaceShells() {
  return BRANCHES.map((branch, index) => ({
    branchIndex: index,
    name: "",
    earthlyBranch: branch,
    stem: "",
    mainStars: [],
    assistantStars: [],
    maleficStars: [],
    transformations: [],
    selfTransformations: [],
    brightness: {},
    majorLuck: null,
  }));
}

// 별 강약은 정본 표(lib/ziwei-star-strength.js)가 등급을 매긴 별·지지만 산출한다.
// (이전에는 별 이름 해시 기반 의사난수를 넣어 가짜 근거로 해석을 유도하는 문제가 있었음 — 표에 없는 별은 절대 추정하지 않는다)
function addStar(palaces, palaceIndex, starName, type) {
  const index = mod(palaceIndex);
  const palace = palaces[index];
  const key = type === "main" ? "mainStars" : type === "assistant" ? "assistantStars" : "maleficStars";
  if (!palace[key].includes(starName)) palace[key].push(starName);
  const level = brightnessFor(starName, palace.branchIndex);
  if (level) palace.brightness[starName] = level;
}

function placePalaces(mingIndex, shells) {
  for (let i = 0; i < PALACE_NAMES.length; i += 1) {
    shells[mod(mingIndex - i)].name = PALACE_NAMES[i];
  }
}

function placeMainStars(shells, lunarDay, bureau) {
  let q = Math.floor(lunarDay / bureau);
  const r = lunarDay % bureau;
  let add = 0;
  if (r !== 0) {
    add = bureau - r;
    q = Math.floor((lunarDay + add) / bureau);
  }

  let pos = q;
  if (add > 0) pos = add % 2 === 1 ? q - add : q + add;
  while (pos <= 0) pos += 12;
  while (pos > 12) pos -= 12;

  const ziwei = mod(pos + 1);
  const tianfu = mod(16 - ziwei);

  [
    [ziwei, "자미"],
    [ziwei + 11, "천기"],
    [ziwei + 9, "태양"],
    [ziwei + 8, "무곡"],
    [ziwei + 7, "천동"],
    [ziwei + 4, "염정"],
    [tianfu, "천부"],
    [tianfu + 1, "태음"],
    [tianfu + 2, "탐랑"],
    [tianfu + 3, "거문"],
    [tianfu + 4, "천상"],
    [tianfu + 5, "천량"],
    [tianfu + 6, "칠살"],
    [tianfu + 10, "파군"],
  ].forEach(([index, star]) => addStar(shells, index, star, "main"));
}

function placeAssistantAndMaleficStars(shells, lunarMonth, hourIdx, stemIndex, branchIndex) {
  addStar(shells, 10 - hourIdx, "문창", "assistant");
  addStar(shells, 4 + hourIdx, "문곡", "assistant");
  addStar(shells, 4 + lunarMonth - 1, "좌보", "assistant");
  addStar(shells, 10 - (lunarMonth - 1), "우필", "assistant");

  const kuiYue = [
    [1, 7],
    [0, 8],
    [11, 9],
    [11, 9],
    [1, 7],
    [0, 8],
    [1, 7],
    [2, 6],
    [3, 5],
    [3, 5],
  ][stemIndex] || [1, 7];
  addStar(shells, kuiYue[0], "천괴", "assistant");
  addStar(shells, kuiYue[1], "천월", "assistant");

  const luCunMap = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  const luCun = luCunMap[stemIndex] ?? 2;
  addStar(shells, luCun, "녹존", "assistant");
  addStar(shells, luCun + 1, "경양", "malefic");
  addStar(shells, luCun - 1, "타라", "malefic");

  // 천마(天馬) — 역마 규칙. 申子辰→寅(2), 巳酉丑→亥(11), 寅午戌→申(8), 亥卯未→巳(5).
  // 천마는 원전에 강약 줄이 없어 등급을 매기지 않는다(옛 28성 표의 '천마' 행은 S5 에서 걷었다).
  addStar(shells, [2, 11, 8, 5][branchIndex % 4], "천마", "assistant");

  // 🔴 예전에는 영성을 화성 기점에서 `- hourIdx` 로 역행시켰다. 그러면 자시·오시 출생에서
  // 화성과 영성이 같은 궁에 겹친다(2 × hourIdx ≡ 0 mod 12). 두 별은 각자의 기점에서 순행한다.
  const fireBell = placeFireAndBell({ yearBranchIndex: branchIndex, hourIndex: hourIdx });
  addStar(shells, fireBell.fireBranchIndex, "화성", "malefic");
  addStar(shells, fireBell.bellBranchIndex, "영성", "malefic");
  addStar(shells, 11 - hourIdx, "지공", "malefic");
  addStar(shells, 11 + hourIdx, "지겁", "malefic");

  const peach = [9, 6, 3, 0][branchIndex % 4] ?? 9;
  addStar(shells, peach, "함지", "assistant");
  // 천요(天姚) — 『紫微斗數全書』 卷二 安天刑天姚星诀 "天姚星从丑上起正月顺至本生月即安之".
  // 정월이 丑(1)이므로 생월 m 은 지지 인덱스 m 이다. 예전 식 lunarMonth + 1 은 한 달 밀려 있었다(iztro 2.6.1 도 丑起正月).
  addStar(shells, lunarMonth, "천요", "assistant");
}

// 오호둔(五虎遁) — 생년간으로 인궁(寅宮)의 천간을 잡고 12지지를 순행으로 채운다.
// 셸 엔진 js/saju-engine.js 의 gongGan 과 같은 식이다(셸은 한자 천간, 여기는 한글 천간).
// 예전에는 calculateBureau 안에서 명궁 궁간 하나만 만들고 버렸다 — 그래서 상담 프롬프트가
// 대한사화도 자화도 읽지 못했다. 이제 12궁 전부를 만들어 명반에 싣는다.
function computePalaceStems(stemIndex) {
  const stemStart = [2, 4, 6, 8, 0][mod(stemIndex, 5)];
  return BRANCHES.map((_, branchIndex) => STEMS[mod(stemStart + mod(branchIndex - 2), 10)]);
}

function calculateBureau(palaceStems, mingIndex) {
  const mingStem = palaceStems[mod(mingIndex)];
  const stemElement = { 갑: 1, 을: 1, 병: 2, 정: 2, 무: 3, 기: 3, 경: 4, 신: 4, 임: 5, 계: 5 };
  const branchElement = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 3 };
  let elementValue = (stemElement[mingStem] || 3) + (branchElement[mingIndex] || 3);
  if (elementValue > 5) elementValue -= 5;
  const bureauByElement = { 1: 3, 2: 4, 3: 2, 4: 6, 5: 5 };
  // 오국 명칭은 국수에 고정된다: 2국=수이국, 3국=목삼국, 4국=금사국, 5국=토오국, 6국=화육국
  const bureauName = { 2: "수이국", 3: "목삼국", 4: "금사국", 5: "토오국", 6: "화육국" };
  const bureau = bureauByElement[elementValue] || 4;
  return { bureau, bureauName: bureauName[bureau] || "금사국" };
}

function applyTransformations(shells, fourTransformations) {
  for (const palace of shells) {
    const stars = new Set([...palace.mainStars, ...palace.assistantStars, ...palace.maleficStars]);
    palace.transformations = Object.entries(fourTransformations)
      .filter(([, star]) => stars.has(star))
      .map(([key, star]) => `${TRANSFORMATION_LABELS[key]}:${star}`);
  }
}

function starSetOf(palace) {
  return new Set([...(palace.mainStars || []), ...(palace.assistantStars || []), ...(palace.maleficStars || [])]);
}

// 궁간사화(宮干四化) — 한 궁의 궁간이 만드는 사화 4성이 어느 궁에 앉았는지. 생년간 사화와 별개다.
// 대한(大限)은 그 궁의 궁간을 쓰므로 이 함수가 곧 대한사화 계산이다.
//
// 표기는 같은 파일의 palace.transformations 와 맞춘 "화록:무곡(재백궁)" 문자열이다.
// 🔴 {label,star,palace} 객체로 두면 안 된다 — worker/routes/ziwei-ai.js 가 명반을
// JSON.stringify(chart) 로 프롬프트에 싣고 섹션 그룹마다 반복 전송하는데,
// 12궁×4 를 객체로 실으면 명반 JSON 이 2,386자 늘어난다(실측 2026-08-27).
function resolveStemTransformations(stem, palaces) {
  const table = FOUR_TRANSFORMATIONS[stem] || {};
  const entries = [];
  for (const [key, star] of Object.entries(table)) {
    if (!star) continue;
    const host = palaces.find((item) => starSetOf(item).has(star));
    const label = TRANSFORMATION_LABELS[key] || key;
    entries.push(`${label}:${star}${host?.name ? `(${host.name})` : ""}`);
  }
  return entries;
}

// 자화(自化) — 그 궁의 궁간사화가 그 궁 자신이 품은 별에 떨어진 경우.
// 밖으로 비입(飛入)하지 않고 제자리에서 흩어지는 힘이라 해석이 달라진다.
function applySelfTransformations(shells) {
  for (const palace of shells) {
    const own = starSetOf(palace);
    const table = FOUR_TRANSFORMATIONS[palace.stem] || {};
    palace.selfTransformations = Object.entries(table)
      .filter(([, star]) => star && own.has(star))
      .map(([key, star]) => `${TRANSFORMATION_LABELS[key]}:${star}`);
  }
}

// 성별 판정 — 대한(음양남녀)과 소한(남순여역)이 모두 이 신호 하나에 걸린다.
// 호출부가 정규화 없이 원본을 넘기는 경로가 있다(worker/routes/ziwei-deep-report.js 의
// clean(src.gender), worker/lib/guardian-fortune/adapters/ziwei.js). 예전에는 여기서
// gender === "M" 을 봤는데 calculateZiweiAiChart 가 이미 소문자화한 뒤라 도달할 수 없었다.
function isMaleGender(gender) {
  const text = String(gender || "").trim().toLowerCase();
  return ["m", "male", "man", "남", "남성", "남자"].includes(text);
}

function applyMajorLuck(shells, mingIndex, stemIndex, gender, bureau) {
  const yangStem = [0, 2, 4, 6, 8].includes(stemIndex);
  const male = isMaleGender(gender);
  const direction = yangStem === male ? 1 : -1;
  for (let i = 0; i < 12; i += 1) {
    const index = mod(mingIndex + i * direction);
    const startAge = bureau + i * 10;
    shells[index].majorLuck = {
      range: `${startAge}-${startAge + 9}`,
      startAge,
      endAge: startAge + 9,
      direction: direction > 0 ? "순행" : "역행",
    };
  }
}

// 상담 프롬프트에 실을 소한 구간의 폭(대상 연도 앞뒤 몇 해까지).
// 🔴 셸처럼 1~100세를 전부 실으면 안 된다 — worker/routes/ziwei-ai.js 가 명반을
// JSON.stringify(chart) 로 프롬프트에 통째로 싣고 그것을 섹션 그룹마다 반복 전송한다.
// 실측 2026-08-27: 100세분을 실으면 명반 JSON 이 9,937자 → 18,418자로 늘었다.
const MINOR_LUCK_PROMPT_SPAN_YEARS = 5;

// 공유 모듈이 돌려주는 인덱스를 이 엔진의 한글 표기와 궁 이름으로 옮긴다.
// 셸은 같은 인덱스를 한자 표기로 옮긴다 — 표기 축이 갈리는 자리를 여기 한 곳으로 몰아 둔다.
function buildMinorLuck({ yearStemIndex, yearBranchIndex, seedYear, isMale, outputPalaces, targetYear }) {
  const summary = describeMinorLimit({
    yearStemIndex,
    yearBranchIndex,
    solarBirthYear: seedYear,
    isMale,
  });
  if (!summary) return null;
  const palaceNameByBranchIndex = new Map(outputPalaces.map((palace) => [palace.branchIndex, palace.name]));
  const entries = buildMinorLimitEntries({
    yearStemIndex,
    yearBranchIndex,
    solarBirthYear: seedYear,
    isMale,
  }).map((entry) => ({
    age: entry.age,
    year: entry.year,
    ganji: `${STEMS[entry.stemIndex]}${BRANCHES[entry.branchIndex]}`,
    branchIndex: entry.palaceBranchIndex,
    branch: BRANCHES[entry.palaceBranchIndex],
    palaceName: palaceNameByBranchIndex.get(entry.palaceBranchIndex) || "",
  }));
  const window = entries.filter((entry) => Math.abs(entry.year - targetYear) <= MINOR_LUCK_PROMPT_SPAN_YEARS);
  return {
    startBranchIndex: summary.startBranchIndex,
    startBranch: BRANCHES[summary.startBranchIndex],
    direction: summary.direction > 0 ? "순행" : "역행",
    baseYear: summary.baseYear,
    current: entries.find((entry) => entry.year === targetYear) || null,
    entries: window,
  };
}

function summarizeSanFangSiZheng(outputPalaces) {
  const byBranch = new Map(outputPalaces.map((palace) => [palace.branchIndex, palace]));
  const byName = new Map(outputPalaces.map((palace) => [palace.name, palace]));
  const result = {};

  for (const palace of outputPalaces) {
    const triadA = byBranch.get(mod(palace.branchIndex + 4));
    const triadB = byBranch.get(mod(palace.branchIndex + 8));
    const opposite = byBranch.get(mod(palace.branchIndex + 6));
    result[palace.name] = {
      self: palace.name,
      palaceNames: [palace, triadA, triadB, opposite].filter(Boolean).map((item) => item.name),
      mainStars: [palace, triadA, triadB, opposite].filter(Boolean).flatMap((item) => item.mainStars),
      transformations: [palace, triadA, triadB, opposite].filter(Boolean).flatMap((item) => item.transformations),
      opposite: opposite?.name || "",
    };
  }

  const life = byName.get("명궁");
  const career = byName.get("관록궁");
  const wealth = byName.get("재백궁");
  const spouse = byName.get("부부궁");
  return {
    byPalace: result,
    core: {
      lifeCareerWealth: [life, career, wealth].filter(Boolean).map((item) => item.name),
      relationshipAxis: [life, spouse].filter(Boolean).map((item) => item.name),
    },
  };
}

function yearlyLuckFor(year, outputPalaces) {
  const branch = BRANCHES[mod(Number(year) - 4, 12)];
  const palace = outputPalaces.find((item) => item.earthlyBranch === branch) || outputPalaces[0];
  return {
    year,
    earthlyBranch: branch,
    palaceName: palace?.name || "",
    mainStars: palace?.mainStars || [],
    transformations: palace?.transformations || [],
  };
}

function buildSummary(outputPalaces, lifePalace, bodyPalace, fourTransformations) {
  const starCounts = new Map();
  for (const palace of outputPalaces) {
    for (const star of palace.mainStars) starCounts.set(star, (starCounts.get(star) || 0) + 1);
  }
  const keyStars = [...starCounts.keys()].slice(0, 4);
  const transformStars = Object.values(fourTransformations).filter(Boolean);
  return [
    `명궁은 ${lifePalace || "입력 기준 명궁"}에 놓이고 신궁은 ${bodyPalace || "입력 기준 신궁"}에 놓입니다.`,
    keyStars.length ? `핵심 주성은 ${keyStars.join(", ")}의 흐름이 두드러집니다.` : "주성의 배치는 궁의 연결을 중심으로 읽어야 합니다.",
    transformStars.length ? `사화는 ${transformStars.join(", ")}를 중심으로 삶의 방향성을 강하게 움직입니다.` : "사화 정보는 입력 기준으로 확인 가능한 범위에서 반영되었습니다.",
  ].join(" ");
}

export function calculateZiweiAiChart(input = {}, options = {}) {
  const birthInfo = input.birthInfo && typeof input.birthInfo === "object" ? input.birthInfo : input;
  const dateParts = parseDate(birthInfo.birthDate, clean(birthInfo.calendarType).toLowerCase() === "lunar");
  const timeParts = parseTime(birthInfo.birthTime, birthInfo.birthTimeUnknown === true);
  if (!dateParts || !timeParts) {
    const error = new Error("INVALID_BIRTH_INFO");
    error.code = "INVALID_INPUT";
    throw error;
  }

  const calendarType = clean(birthInfo.calendarType).toLowerCase() === "lunar" ? "lunar" : "solar";
  const gender = clean(birthInfo.gender).toLowerCase();
  // 입력 시계 → 출생지 경도·과거 서머타임 보정 시계(출생지 미입력 = 서울). 이미 보정한 시계(해외
  // 진태양시·검증 하네스)는 options.birthClock === "corrected" 로 넘겨 이중 보정을 막는다.
  // 소한 씨앗 연도(seedYear)는 입력 날짜 그대로 둔다 — 보정은 시지·날짜 경계에만 쓴다.
  const clock = timeParts.unknown || options.birthClock === "corrected" ? null : ziweiBirthClock({
    ...dateParts,
    hour: timeParts.hour,
    minute: timeParts.minute,
    calendarType,
    isLeapMonth: birthInfo.isLeapMonth === true,
    birthPlace: birthInfo.birthPlace,
  });
  const chartTime = clock ? { hour: clock.corrected.hour, minute: clock.corrected.minute, unknown: false } : timeParts;
  const nightZi = chartTime.hour === 23 && !chartTime.unknown;
  // 보정이 자정을 넘겨 날짜가 바뀐 경우(00:00~00:31 출생 등)만 보정 날짜에서 음력을 다시 찾는다.
  const dayMoved = clock && (clock.corrected.year !== clock.civil.year || clock.corrected.month !== clock.civil.month || clock.corrected.day !== clock.civil.day);
  const lunarInfo = dayMoved
    ? lunarOfSolarDay(clock.corrected, nightZi)
    : getLunarDate(dateParts, calendarType, birthInfo.isLeapMonth === true, nightZi);
  // 세차는 음력해에서 바로 나온다(甲=0 / 子=0). 예전에는 lunar-javascript 의 getYearGan/getYearZhi
  // 를 읽고 실패 시 같은 식으로 폴백했다 — 값은 그대로이고 근거만 코어로 옮겼다.
  const yearIndexes = sexagenaryYearIndexes(lunarInfo.lunarYear);
  const yearStem = STEMS[yearIndexes.stemIndex];
  const yearBranch = BRANCHES[yearIndexes.branchIndex];
  const stemIndex = STEMS.indexOf(yearStem);
  const branchIndex = BRANCHES.indexOf(yearBranch);
  const hIdx = hourIndex(chartTime.hour);
  const placeMonth = placementMonth(lunarInfo);
  const baseIndex = mod(2 + placeMonth - 1);
  const mingIndex = mod(baseIndex - hIdx);
  const shenIndex = mod(baseIndex + hIdx);
  const palaceStems = computePalaceStems(stemIndex);
  const { bureau, bureauName } = calculateBureau(palaceStems, mingIndex);
  const shells = createPalaceShells();
  for (const shell of shells) shell.stem = palaceStems[shell.branchIndex];

  placePalaces(mingIndex, shells);
  placeMainStars(shells, lunarInfo.lunarDay, bureau);
  placeAssistantAndMaleficStars(shells, placeMonth, hIdx, stemIndex, branchIndex);
  const fourTransformations = FOUR_TRANSFORMATIONS[yearStem] || {};
  applyTransformations(shells, fourTransformations);
  applyMajorLuck(shells, mingIndex, stemIndex, gender, bureau);
  applySelfTransformations(shells);

  const outputPalaces = PALACE_NAMES
    .map((name) => shells.find((palace) => palace.name === name))
    .filter(Boolean)
    .map((palace) => ({
      name: palace.name,
      earthlyBranch: palace.earthlyBranch,
      branchIndex: palace.branchIndex,
      stem: palace.stem,
      mainStars: palace.mainStars.filter((star) => MAIN_STARS.includes(star)),
      assistantStars: palace.assistantStars.filter((star) => ASSISTANT_STARS.includes(star)),
      maleficStars: palace.maleficStars.filter((star) => MALEFIC_STARS.includes(star)),
      transformations: palace.transformations,
      selfTransformations: palace.selfTransformations,
      brightness: palace.brightness,
      majorLuck: palace.majorLuck,
    }));

  const lifePalace = shells[mingIndex]?.name || "명궁";
  const bodyPalace = shells[shenIndex]?.name || "";
  const sanFangSiZheng = summarizeSanFangSiZheng(outputPalaces);

  const rawTargetYear = Number(options.year || new Date().getFullYear());
  const targetYear = Number.isFinite(rawTargetYear) ? rawTargetYear : new Date().getFullYear();

  // 소한(小限) — 대한 안에서 한 해씩 옮겨 앉는 자리. 상수·계산은 셸 엔진과 공유한다.
  // 🔴 방향 규칙이 대한과 다르다(남순여역). applyMajorLuck 의 direction 을 재사용하지 말 것.
  const minorLuck = buildMinorLuck({
    yearStemIndex: stemIndex,
    yearBranchIndex: branchIndex,
    seedYear: dateParts.year,
    isMale: isMaleGender(gender),
    outputPalaces,
    targetYear,
  });
  const yearlyLuck = yearlyLuckFor(targetYear, outputPalaces);
  const strongest = outputPalaces
    .map((palace) => ({ palace: palace.name, score: palace.mainStars.length * 3 + palace.assistantStars.length - palace.maleficStars.length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const uncertainty = {
    birthTimeUnknown: timeParts.unknown,
    brightnessUnavailable: false,
    note: timeParts.unknown ? "birth_time_unknown_noon_basis" : "",
  };
  if (timeParts.unknown) {
    console.warn("[ziwei-ai-chart] birth time unknown; calculated on noon basis", {
      birthDate: birthInfo.birthDate,
      calendarType,
    });
  }

  return {
    lifePalace,
    bodyPalace,
    palaces: outputPalaces,
    fourTransformations,
    majorLuck: outputPalaces.map((palace) => ({
      palaceName: palace.name,
      earthlyBranch: palace.earthlyBranch,
      // 대한은 그 궁의 궁간을 쓴다 — 생년간 사화(fourTransformations)와 다른 벌이다.
      stem: palace.stem,
      transformations: resolveStemTransformations(palace.stem, outputPalaces),
      ...palace.majorLuck,
    })),
    minorLuck,
    yearlyLuck,
    sanFangSiZheng,
    chartSummary: buildSummary(outputPalaces, lifePalace, bodyPalace, fourTransformations),
    mainStars: MAIN_STARS,
    assistantStarCatalog: ASSISTANT_STARS,
    maleficStarCatalog: MALEFIC_STARS,
    bureau: { number: bureau, name: bureauName },
    lunar: {
      year: lunarInfo.lunarYear,
      month: lunarInfo.lunarMonth,
      day: lunarInfo.lunarDay,
      isLeapMonth: lunarInfo.isLeapMonth,
      yearStem,
      yearBranch,
      source: lunarInfo.source,
    },
    keyFeatures: {
      strongestPalaces: strongest,
      keyStars: outputPalaces.flatMap((palace) => palace.mainStars).slice(0, 6),
      transformationStars: fourTransformations,
    },
    uncertainty,
  };
}

export const __ziweiAiChartTestUtils = {
  PALACE_NAMES,
  MAIN_STARS,
  ASSISTANT_STARS,
  MALEFIC_STARS,
  FOUR_TRANSFORMATIONS,
  TRANSFORMATION_LABELS,
  computePalaceStems,
  parseDate,
  parseTime,
};
