import { solarToLunar } from "../../lib/korean-calendar/index.js";
import { buildAstroLocalChartJson, normalizeAstroPremiumBirthInput, toSwissChartInputFromBirthInput } from "./astro-premium-generator.js";
import { calculateLifeBookAiSaju } from "./life-book-ai-saju.js";
import { buildSukuyoFromLunar, getSukuyoByIndex, relationFromForwardDistance } from "./sukuyo-premium.js";
import { getSwissVedicPlanets, getSwissWesternChart } from "./swiss-ephemeris.js";
import { buildVimshottariDasha } from "./vedic-derived-calculations.js";
import { buildVedicLocalChartJson } from "./vedic-premium-generator.js";
import { calculateZiweiAiChart } from "./ziwei-ai-chart.js";

// ─────────────────────────────────────────────────────────────────────────────
// 다섯 렌즈(관점) 정의
//
// 이 기능의 핵심은 "다섯 개의 운세를 각각 보는 것"이 아니라 "하나의 운명을 다섯 개의
// 렌즈로 보는 것"이다. 그 분업은 프롬프트 지시로는 강제되지 않는다(LLM 은 표현만 바꿔
// 반복한다). 실효 장치는 **입력 데이터 차등 공급**이다 — 그 장의 주도 렌즈 데이터만
// 두껍게 주고 나머지는 한 줄 요약만 준다. 데이터가 없으면 그 렌즈로 말할 수 없다.
//
// 이 파일은 그 차등 공급의 재료를 만든다: 렌즈별로 shape 가 통일된 블록 + 필드 우선순위.
// 실제 예산 배분과 프롬프트 조립은 worker/routes/karma-destiny-ai.js 가 담당한다.
// ─────────────────────────────────────────────────────────────────────────────

export const LENS_IDS = Object.freeze(["saju", "ziwei", "western", "vedic", "sukuyo"]);

export const LENS_ROLES = Object.freeze({
  saju: { label: "사주명리", role: "현실·기질·오행·행동과 결정의 구조" },
  ziwei: { label: "자미두수", role: "인생의 큰 흐름·사회적 역할·명궁과 12궁" },
  western: { label: "서양 점성술", role: "심리·감정·무의식·대인관계" },
  vedic: { label: "베다 점성술", role: "영혼·업·다르마·성장 방향" },
  sukuyo: { label: "숙요 27수", role: "인연·관계·인간관계 패턴" },
});

// 렌즈별 프롬프트 필드 우선순위. 예산이 부족하면 뒤쪽부터 **버린다**(자르지 않는다).
// 문자열 절삭은 JSON 문법을 깨뜨리므로 절대 쓰지 않는다.
export const LENS_FIELD_PRIORITY = Object.freeze({
  saju: Object.freeze([
    "dayMaster", "pillars", "fiveElements", "strength", "usefulGod", "unfavorableGod",
    "seasonalBalance", "tenGods", "tenGodsByPillar", "majorLuckActive", "natalInteractions",
    "relationSummary", "yearlyLuck", "majorLuckTimeline", "fortuneFacts",
  ]),
  ziwei: Object.freeze([
    "lifePalace", "bodyPalace", "bureau", "transformationPlacement", "keyPalaces",
    "sanFangSiZheng", "majorLuckActive", "strongestPalaces", "yearlyLuck", "majorLuckTimeline", "lunar",
  ]),
  western: Object.freeze([
    "sun", "moon", "ascendant", "mc", "chartRuler", "elementBalance", "modalityBalance",
    "nodes", "corePlanets", "tightAspects", "houseCusps",
  ]),
  vedic: Object.freeze([
    "lagna", "moon", "nakshatra", "pada", "dashaCurrent", "rahuKetu", "dashaNext",
    "keyPlanets", "houseLords", "yogas",
  ]),
  sukuyo: Object.freeze([
    "nameKo", "nameHan", "archetypeTitle", "element", "direction", "category",
    "keywords", "strengths", "shadows", "relationAxis", "lunar",
  ]),
});

// 출생시간에 직접 의존해, 시간 미상일 때 값이 그럴듯하게 나오지만 **틀리는** 자미두수 경로.
// ziwei-ai-chart.js 는 시지(hIdx)로 명궁 인덱스를 잡고(:413) 명궁으로 국을 잡는다(:415).
// 즉 시간을 모르면 정오 기준으로 계산된 명궁 자체가 어긋나며, uncertainty 플래그만으로는
// LLM 이 이를 단정 서술하는 것을 막지 못한다.
const ZIWEI_TIME_DEPENDENT_PATHS = Object.freeze([
  "lifePalace", "bodyPalace", "bureau", "keyPalaces", "sanFangSiZheng",
  "majorLuckActive", "majorLuckTimeline", "strongestPalaces", "yearlyLuck",
]);

// 자미 렌즈가 "영역 배치"를 수행하는 데 필요한 궁만 추린다.
// 12궁 전체 + 성요 카탈로그를 실으면 예산이 다른 렌즈를 밀어낸다.
const ZIWEI_KEY_PALACES = Object.freeze([
  "명궁", "부부궁", "재백궁", "관록궁", "천이궁", "복덕궁", "질액궁", "노복궁",
]);

const WESTERN_CORE_PLANETS = Object.freeze([
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Saturn", "Chiron", "Jupiter",
]);

const VEDIC_KEY_PLANETS = Object.freeze([
  "Sun", "Moon", "Jupiter", "Saturn", "Venus", "Rahu", "Ketu",
]);

// 서양 12사인 → 원소·모드. swiss 경유 planet 노드에는 element/mode 필드가 없어
// (astro-premium-generator.js:767 toSafePlanetNode) 기존 countBy(planet.element) 는
// 항상 빈 객체를 만들었다. 사인 이름에서 결정론적으로 유도한다.
const WESTERN_SIGN_TRAITS = Object.freeze({
  "양자리": { element: "불", modality: "활동" },
  "황소자리": { element: "흙", modality: "고정" },
  "쌍둥이자리": { element: "공기", modality: "변통" },
  "게자리": { element: "물", modality: "활동" },
  "사자자리": { element: "불", modality: "고정" },
  "처녀자리": { element: "흙", modality: "변통" },
  "천칭자리": { element: "공기", modality: "활동" },
  "전갈자리": { element: "물", modality: "고정" },
  "사수자리": { element: "불", modality: "변통" },
  "염소자리": { element: "흙", modality: "활동" },
  "물병자리": { element: "공기", modality: "고정" },
  "물고기자리": { element: "물", modality: "변통" },
});

// 서양 4원소 ↔ 동양 오행의 **모호하지 않은** 대응만 인정한다.
// 공기(풍)는 오행에 대응이 없으므로(목/금 양쪽으로 해석된다) 교차 검증에서 제외한다.
// 억지로 맞추면 그것이 곧 "계산되지 않은 데이터"가 된다.
const WESTERN_TO_WUXING = Object.freeze({ "불": "화", "흙": "토", "물": "수" });

// 오행에 속하는 숙요 원소만 교차 검증에 쓴다(일/월은 오행이 아니다).
const WUXING_SET = Object.freeze(new Set(["목", "화", "토", "금", "수"]));

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function parseBirthDate(value) {
  const raw = clean(value, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseBirthTime(value) {
  const raw = clean(value, 5);
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 12, minute: 0, valid: false };
  return { hour: Number(match[1]), minute: Number(match[2]), valid: true };
}

function hasUsablePlace(birthPlace = {}) {
  return Number.isFinite(Number(birthPlace.latitude))
    && Number.isFinite(Number(birthPlace.longitude))
    && clean(birthPlace.timezone);
}

function normalizeTimezoneOffset(timezone) {
  const raw = clean(timezone).toLowerCase();
  if (!raw) return NaN;
  const direct = Number(raw);
  if (Number.isFinite(direct)) return direct;
  const aliases = {
    "asia/seoul": 9,
    "asia/tokyo": 9,
    "asia/shanghai": 8,
    "asia/taipei": 8,
    "asia/bangkok": 7,
    "asia/kolkata": 5.5,
    "europe/london": 0,
    "europe/paris": 1,
    "america/new_york": -5,
    "america/chicago": -6,
    "america/denver": -7,
    "america/los_angeles": -8,
  };
  if (aliases[raw] !== undefined) return aliases[raw];
  const offset = raw.match(/^utc([+-]\d{1,2})(?::?(\d{2}))?$/);
  if (!offset) return NaN;
  const hour = Number(offset[1]);
  const minute = Number(offset[2] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
  return hour + (Math.sign(hour || 1) * (minute / 60));
}

function buildAstroBirthInput(birthInfo = {}) {
  const birthDate = parseBirthDate(birthInfo.birthDate);
  const birthTime = parseBirthTime(birthInfo.birthTime);
  const birthPlace = asObject(birthInfo.birthPlace);
  const timezoneOffsetHours = normalizeTimezoneOffset(birthPlace.timezone);
  return normalizeAstroPremiumBirthInput({
    name: birthInfo.name,
    gender: birthInfo.gender,
    birthDate: birthInfo.birthDate,
    // 시간 미상이어도 정오 기준으로 행성 사인·어스펙트는 계산한다(앵글은 뒤에서 제거).
    birthTime: birthTime.valid ? birthInfo.birthTime : "12:00",
    birthYear: birthDate?.year,
    birthMonth: birthDate?.month,
    birthDay: birthDate?.day,
    birthHour: birthTime.valid ? birthTime.hour : 12,
    birthMinute: birthTime.valid ? birthTime.minute : 0,
    calendarType: birthInfo.calendarType,
    birthPlace: [birthPlace.city, birthPlace.country].filter(Boolean).join(", "),
    latitude: birthPlace.latitude,
    longitude: birthPlace.longitude,
    timezone: birthPlace.timezone,
    timezoneOffsetHours,
  });
}

function countBy(items, pick) {
  return safeArray(items).reduce((acc, item) => {
    const key = clean(pick(item));
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topKey(distribution) {
  const entries = Object.entries(asObject(distribution))
    .filter(([, value]) => Number.isFinite(Number(value)))
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  return entries.length ? clean(entries[0][0]) : "";
}

function currentAgeFrom(birthDate) {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.year;
  const passed = (now.getMonth() + 1) > birthDate.month
    || ((now.getMonth() + 1) === birthDate.month && now.getDate() >= birthDate.day);
  if (!passed) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * 렌즈 블록 — 다섯 체계의 제각각인 리턴을 하나의 shape 로 통일한다.
 *
 * confidence:
 *   "full"        계산이 온전하다
 *   "provisional" 값은 있으나 단정하면 안 된다(provisionalFields 참조)
 *   "none"        계산되지 않았다 — 이 관점의 용어로 서술하면 안 된다
 *
 * omittedFields 는 프롬프트에 **명시**된다. 없는 것을 명시해야 LLM 이 지어내지 않는다.
 */
function lensBlock(id, { confidence, data = null, provisionalFields = [], omittedFields = [], patternSummary = "" } = {}) {
  return {
    id,
    label: LENS_ROLES[id]?.label || id,
    role: LENS_ROLES[id]?.role || "",
    confidence,
    data,
    provisionalFields: safeArray(provisionalFields).map((item) => clean(item, 80)).filter(Boolean),
    omittedFields: safeArray(omittedFields).map((item) => clean(item, 80)).filter(Boolean),
    patternSummary: clean(patternSummary, 400),
  };
}

/**
 * 양력 → 음력 변환. worker/routes/sukuyo.js:491-519 `toLunarBirth` 와 **같은 규약**이다.
 * 규약이 미묘하므로(음력 입력은 변환 없이 통과, 시간 미상은 정오, 윤달은 getMonth() 음수)
 * 임의로 바꾸지 말 것 — 어긋나면 같은 사람이 기능마다 다른 본명숙을 받는다.
 */
function toLunarParts(birthInfo = {}) {
  const date = parseBirthDate(birthInfo.birthDate);
  if (!date) return null;

  if (clean(birthInfo.calendarType).toLowerCase() === "lunar") {
    return {
      lunarYear: date.year,
      lunarMonth: date.month,
      lunarDay: date.day,
      isLeapMonth: birthInfo.isLeapMonth === true,
      source: "user-lunar-input",
    };
  }

  // 🔴 음력은 한국 음양력 코어(KST 삭 기준)가 낸다. 중국 음력(lunar-javascript)은 삭이 CST 23시대에
  //    들면 그 달 전체가 하루 밀린다 — 실측(2026-08-27, 1950~2035 28,896일) 3.67% 가 갈리고
  //    27수 본명숙이 그대로 옆 칸으로 간다. 생시는 음력일을 바꾸지 않으므로 코어는 날짜만 받는다.
  const lunar = solarToLunar(date.year, date.month, date.day);
  if (!lunar) return null; // 코어 지원 범위(1900~2100) 밖 — 숙요 렌즈가 통째로 빠진다.
  return {
    lunarYear: lunar.lunarYear,
    lunarMonth: lunar.lunarMonth,
    lunarDay: lunar.lunarDay,
    isLeapMonth: lunar.isLeapMonth,
    source: "korean-calendar-core",
  };
}

// ─── 요약기 (한 줄 patternSummary) ──────────────────────────────────────────

function summarizeSaju(saju = {}) {
  const element = topKey(saju.fiveElements || saju.fiveElementDistribution);
  const tenGod = topKey(saju.tenGods || saju.tenGodDistribution);
  const parts = [];
  if (clean(saju.dayMaster)) parts.push(`${saju.dayMaster} 일간`);
  if (element) parts.push(`${element} 기운`);
  if (tenGod) parts.push(`${tenGod} 성향`);
  return parts.length
    ? `${parts.join(", ")}이 반복 선택의 중심에 놓입니다.`
    : "입력된 사주 정보 기준으로 반복되는 선택의 흐름을 살핍니다.";
}

function summarizeZiwei(chart = {}, { birthTimeUnknown = false } = {}) {
  // chart.lifePalace 는 궁의 "이름"이라 언제나 "명궁"이다. 의미가 있는 것은 그 궁이
  // 앉은 지지와 거기 든 주성이므로 그것으로 요약한다.
  const lifeShell = safeArray(chart.palaces).find((palace) => clean(palace?.name) === "명궁");
  const life = [clean(lifeShell?.earthlyBranch), safeArray(lifeShell?.mainStars).join("·")]
    .filter(Boolean).join(" ");
  const body = clean(chart.bodyPalace);
  const bureau = clean(chart.bureau?.name);
  const parts = [life && `명궁 ${life}`, body && `신궁이 ${body}`, bureau].filter(Boolean);
  if (!parts.length) return "자미두수 배치 정보가 제한되어 영역 흐름은 다른 관점으로 봅니다.";
  return birthTimeUnknown
    ? `${parts.join(", ")} 배치는 출생시간 미상이라 가능성으로만 둡니다.`
    : `${parts.join(", ")} 배치가 삶의 무대와 사회적 역할을 가릅니다.`;
}

function summarizeWestern(compact = {}) {
  const sun = clean(compact.sun?.sign);
  const moon = clean(compact.moon?.sign);
  const asc = clean(compact.ascendant?.sign);
  const parts = [sun && `태양 ${sun}`, moon && `달 ${moon}`, asc && `상승 ${asc}`].filter(Boolean);
  return parts.length
    ? `${parts.join(", ")} 흐름이 욕구와 감정의 반복 방식을 비춥니다.`
    : "시간 또는 장소 정보 제한으로 심리적 반복 흐름을 가능한 범위에서만 살핍니다.";
}

function summarizeVedic(compact = {}) {
  const lagna = clean(compact.lagna?.sign);
  const moon = clean(compact.moon?.sign);
  const nakshatra = clean(compact.nakshatra);
  const dasha = clean(compact.dashaCurrent?.lord);
  const parts = [
    lagna && `라그나 ${lagna}`,
    moon && `달 ${moon}`,
    nakshatra && `나크샤트라 ${nakshatra}`,
    dasha && `${dasha} 다샤`,
  ].filter(Boolean);
  return parts.length
    ? `${parts.join(", ")} 축에서 익숙한 습관과 낯선 성장 과제가 함께 드러납니다.`
    : "정밀 차트 정보가 제한되어 영혼의 과제는 입력된 정보 기준으로만 살핍니다.";
}

function summarizeSukuyo(natal = {}) {
  const name = clean(natal.nameKo);
  const han = clean(natal.nameHan);
  const archetype = clean(natal.archetypeTitle);
  if (!name) return "본명숙을 확정할 수 없어 인연 패턴은 다른 관점으로 봅니다.";
  return `본명숙 ${name}${han ? `(${han})` : ""}수, ${archetype} 원형이 사람과의 거리 조절 방식을 결정합니다.`;
}

// ─── 압축기 ─────────────────────────────────────────────────────────────────

function compactSaju(calculated = {}, { birthTimeUnknown = false, age = null } = {}) {
  const cycles = safeArray(calculated.majorLuck?.cycles);
  const activeCycles = cycles.filter((cycle) => cycle?.isCurrent === true);
  return {
    pillars: {
      year: clean(calculated.yearPillar),
      month: clean(calculated.monthPillar),
      day: clean(calculated.dayPillar),
      hour: birthTimeUnknown ? "" : clean(calculated.hourPillar),
    },
    dayMaster: clean(calculated.dayMaster),
    fiveElements: calculated.fiveElements,
    tenGods: calculated.tenGods,
    tenGodsByPillar: calculated.tenGodsByPillar,
    strength: calculated.strength,
    usefulGod: clean(calculated.usefulGod),
    unfavorableGod: clean(calculated.unfavorableGod),
    // 조후(계절 균형)와 합충형파해 — 사주 렌즈가 "현실·행동"을 담당하려면 반드시 필요한데
    // 개편 전에는 계산해 놓고 버리고 있었다.
    seasonalBalance: calculated.seasonalBalance,
    natalInteractions: calculated.natalInteractions,
    relationSummary: calculated.relationSummary,
    majorLuckActive: activeCycles.length
      ? activeCycles
      : (Number.isFinite(age) ? cycles.filter((cycle) => Number(cycle?.startAge) <= age && age <= Number(cycle?.endAge)) : []),
    majorLuckTimeline: cycles.map((cycle) => ({
      pillar: clean(cycle?.pillar || cycle?.ganZhi),
      startAge: Number(cycle?.startAge) || 0,
      endAge: Number(cycle?.endAge) || 0,
      startYear: Number(cycle?.startYear) || 0,
      endYear: Number(cycle?.endYear) || 0,
    })),
    yearlyLuck: safeArray(calculated.yearlyLuck).slice(0, 3),
    fortuneFacts: calculated.fortuneFacts,
    calculationMeta: calculated.calculationMeta,
  };
}

function compactZiwei(chart = {}, { age = null } = {}) {
  const palaces = safeArray(chart.palaces);
  const byName = new Map(palaces.map((palace) => [clean(palace?.name), palace]));

  // 사화(化祿/化權/化科/化忌)가 **어느 궁에 떨어졌는가**. 자미 렌즈가 "어느 영역에서
  // 벌어지는지"를 지정하려면 별 이름만으로는 부족하고 이 역인덱싱이 있어야 한다.
  const transformationPlacement = Object.entries(asObject(chart.fourTransformations))
    .map(([kind, star]) => {
      const starName = clean(star);
      if (!starName) return null;
      const host = palaces.find((palace) => safeArray(palace?.mainStars).includes(starName)
        || safeArray(palace?.assistantStars).includes(starName));
      return {
        kind,
        star: starName,
        palace: clean(host?.name),
        branch: clean(host?.earthlyBranch),
      };
    })
    .filter(Boolean);

  const majorLuck = safeArray(chart.majorLuck);
  const lifeShell = byName.get("명궁");
  return {
    // 궁 이름("명궁")만 주면 정보가 0이다. 명궁이 앉은 지지와 주성이 실제 근거다.
    lifePalace: {
      name: clean(chart.lifePalace) || "명궁",
      branch: clean(lifeShell?.earthlyBranch),
      mainStars: safeArray(lifeShell?.mainStars),
    },
    bodyPalace: clean(chart.bodyPalace),
    bureau: chart.bureau,
    transformationPlacement,
    keyPalaces: ZIWEI_KEY_PALACES.map((name) => {
      const palace = byName.get(name);
      if (!palace) return null;
      return {
        name,
        branch: clean(palace.earthlyBranch),
        mainStars: safeArray(palace.mainStars),
        assistantStars: safeArray(palace.assistantStars),
        maleficStars: safeArray(palace.maleficStars),
        transformations: palace.transformations,
        brightness: palace.brightness,
      };
    }).filter(Boolean),
    sanFangSiZheng: asObject(chart.sanFangSiZheng).core || chart.sanFangSiZheng || null,
    majorLuckActive: Number.isFinite(age)
      ? majorLuck.filter((luck) => Number(luck?.startAge) <= age && age <= Number(luck?.endAge))
      : [],
    majorLuckTimeline: majorLuck.map((luck) => ({
      palaceName: clean(luck?.palaceName),
      startAge: Number(luck?.startAge) || 0,
      endAge: Number(luck?.endAge) || 0,
    })),
    yearlyLuck: chart.yearlyLuck,
    strongestPalaces: safeArray(chart.keyFeatures?.strongestPalaces),
    lunar: chart.lunar,
  };
}

/**
 * 본명숙 기준 27수 관계축.
 *
 * 숙요 렌즈가 "인연·관계 패턴"을 담당하려면 본명숙 하나로는 부족하다. 상대가 어느 수일 때
 * 내가 어떤 자리에 서는지가 곧 반복되는 관계 패턴이며, 그것은 순행 거리에서 결정론적으로
 * 나온다(sukuyo-relation-core.js:26 정본).
 */
function buildSukuyoRelationAxis(natalIndex) {
  if (!Number.isFinite(Number(natalIndex))) return [];
  const grouped = new Map();
  for (let distance = 0; distance < 27; distance += 1) {
    const relation = relationFromForwardDistance(distance);
    if (!relation) continue;
    const target = getSukuyoByIndex((Number(natalIndex) + distance) % 27);
    if (!grouped.has(relation.relationType)) {
      grouped.set(relation.relationType, {
        relationType: relation.relationType,
        relationTypeHan: relation.relationTypeHan,
        myRoles: [],
        mansions: [],
      });
    }
    const bucket = grouped.get(relation.relationType);
    if (!bucket.myRoles.includes(relation.aRole)) bucket.myRoles.push(relation.aRole);
    bucket.mansions.push({
      nameKo: clean(target?.nameKo),
      forwardDistance: distance,
      myRole: relation.aRole,
      theirRole: relation.bRole,
    });
  }
  // 예산상 관계 유형당 대표 3수까지만 싣는다.
  return [...grouped.values()].map((row) => ({ ...row, mansions: row.mansions.slice(0, 3) }));
}

function compactSukuyo(natal = {}) {
  return {
    index: Number(natal.index),
    nameKo: clean(natal.nameKo),
    nameHan: clean(natal.nameHan),
    archetypeTitle: clean(natal.archetypeTitle),
    element: clean(natal.element),
    direction: clean(natal.direction),
    category: clean(natal.category),
    keywords: safeArray(natal.keywords),
    strengths: safeArray(natal.strengths),
    shadows: safeArray(natal.shadows),
    relationAxis: buildSukuyoRelationAxis(natal.index),
    lunar: {
      month: Number(natal.lunarMonth) || 0,
      day: Number(natal.lunarDay) || 0,
      isLeapMonth: natal.isLeapMonth === true,
      source: clean(natal.source),
    },
  };
}

function westernTraits(sign) {
  return WESTERN_SIGN_TRAITS[clean(sign)] || null;
}

function compactWestern(localChartJson = {}, { dropAngles = false } = {}) {
  const chart = asObject(localChartJson.chart);
  const planets = safeArray(chart.planets);
  const findPlanet = (name) => planets.find((planet) => clean(planet?.name) === name) || null;

  const slim = (planet) => (planet ? {
    name: clean(planet.name),
    sign: clean(planet.sign),
    degree: planet.degree,
    house: dropAngles ? undefined : planet.house,
    retrograde: planet.retrograde === true,
  } : null);

  // orb 가 좁은 어스펙트만 남긴다. 전체 배열은 다섯 렌즈 예산에서 감당할 수 없고,
  // 넓은 오브 어스펙트는 해석 가치도 낮다.
  const tightAspects = safeArray(chart.aspects)
    .filter((aspect) => Number.isFinite(Number(aspect?.orb)) && Math.abs(Number(aspect.orb)) <= 4)
    .sort((a, b) => Math.abs(Number(a.orb)) - Math.abs(Number(b.orb)))
    .slice(0, 12)
    .map((aspect) => ({
      planetA: clean(aspect.planetA),
      planetB: clean(aspect.planetB),
      type: clean(aspect.type),
      orb: Number(aspect.orb),
    }));

  const ascendant = (!dropAngles && clean(chart.ascendantSign))
    ? { sign: clean(chart.ascendantSign), degree: chart.ascendantDegree }
    : null;
  const mc = (!dropAngles && clean(chart.midheavenSign))
    ? { sign: clean(chart.midheavenSign), degree: chart.midheavenDegree }
    : null;

  const compact = {
    sun: slim(findPlanet("Sun")),
    moon: slim(findPlanet("Moon")),
    ascendant,
    mc,
    chartRuler: clean(chart.chartRuler || chart.ascendantRuler || localChartJson?.interpretationSeeds?.chartRuler),
    elementBalance: countBy(planets, (planet) => westernTraits(planet?.sign)?.element),
    modalityBalance: countBy(planets, (planet) => westernTraits(planet?.sign)?.modality),
    nodes: {
      north: slim(planets.find((planet) => /north/i.test(clean(planet?.name)))) || null,
      south: slim(planets.find((planet) => /south/i.test(clean(planet?.name)))) || null,
    },
    corePlanets: WESTERN_CORE_PLANETS.map((name) => slim(findPlanet(name))).filter(Boolean),
    tightAspects,
    houseCusps: dropAngles
      ? []
      : safeArray(chart.houses)
        .map((house) => ({ house: Number(house?.house) || 0, sign: clean(house?.sign) }))
        .filter((house) => house.house),
  };
  compact.patternSummary = summarizeWestern(compact);
  return compact;
}

function birthUtcFromSwissInput(swissInput = {}) {
  const { year, month, day, hour, minute, timezone } = swissInput;
  if (![year, month, day].every((value) => Number.isFinite(Number(value)))) return null;
  const offsetHours = Number.isFinite(Number(timezone)) ? Number(timezone) : 0;
  const midnightUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
  const localMinutes = (Number(hour) || 0) * 60 + (Number(minute) || 0);
  return new Date(midnightUtc + (localMinutes - offsetHours * 60) * 60_000);
}

function compactVedic(localChartJson = {}, { dropAngles = false, dasha = null } = {}) {
  const chart = asObject(localChartJson.chart);
  const planets = safeArray(chart.planets);
  const findPlanet = (name) => planets.find((planet) => clean(planet?.name) === name) || null;

  const slim = (planet) => (planet ? {
    name: clean(planet.name),
    nameKo: clean(planet.nameKo),
    sign: clean(planet.sign),
    signEn: clean(planet.signEn),
    house: dropAngles ? undefined : planet.house,
    nakshatra: clean(planet.nakshatra) || undefined,
    dignity: clean(planet.dignity),
    retrograde: planet.retrograde === true,
  } : null);

  const timeline = safeArray(dasha?.timeline);
  const currentIndex = timeline.findIndex((period) => clean(period?.lord) === clean(dasha?.currentMahadasha));
  const next = currentIndex >= 0 ? timeline[currentIndex + 1] : null;

  const compact = {
    lagna: (!dropAngles && clean(chart.lagnaSign))
      ? { sign: clean(chart.lagnaSign), signEn: clean(chart.lagnaSignEn) }
      : null,
    moon: slim(findPlanet("Moon")),
    nakshatra: clean(chart.nakshatra?.name || findPlanet("Moon")?.nakshatra),
    pada: Number.isFinite(Number(chart.nakshatra?.pada)) ? Number(chart.nakshatra.pada) : null,
    dashaCurrent: dasha?.current
      ? {
        lord: clean(dasha.current.lord),
        startDate: clean(dasha.current.startDate),
        endDate: clean(dasha.current.endDate),
        antar: clean(dasha.currentAntardasha),
      }
      : null,
    dashaNext: next
      ? { lord: clean(next.lord), startDate: clean(next.startDate), endDate: clean(next.endDate) }
      : null,
    rahuKetu: { rahu: slim(findPlanet("Rahu")), ketu: slim(findPlanet("Ketu")) },
    keyPlanets: VEDIC_KEY_PLANETS.map((name) => slim(findPlanet(name))).filter(Boolean),
    houseLords: dropAngles
      ? []
      : safeArray(chart.houses)
        .filter((house) => [1, 9, 10, 12].includes(Number(house?.house)))
        .map((house) => ({ house: Number(house.house), sign: clean(house?.sign), lord: clean(house?.lord || house?.signLord) })),
    yogas: safeArray(localChartJson.insights)
      .filter((item) => /yoga|요가/i.test(clean(item?.id) + clean(item?.title)))
      .slice(0, 6)
      .map((item) => ({ title: clean(item?.title, 80), summary: clean(item?.summary || item?.description, 200) })),
  };
  compact.patternSummary = summarizeVedic(compact);
  return compact;
}

// ─── 교차 검증 ──────────────────────────────────────────────────────────────

/**
 * 두 렌즈 이상이 같은 방향을 가리키는 **계산상 사실**만 모은다.
 *
 * 도메인 해석(예: "자미 부부궁 흉성 ↔ 서양 7하우스 하드어스펙트")은 넣지 않는다.
 * 그건 판단이지 계산이 아니며, 그 순간 이 블록은 "계산 근거"라는 라벨을 단 추측이 된다.
 * 각 항목은 basis(어느 렌즈의 어느 경로에서 나온 값인지)를 반드시 동반한다.
 */
function detectConvergence(lenses = {}) {
  const rows = [];

  // (a) 원소 축 — 대응이 모호하지 않은 경우에만.
  const sajuElement = topKey(lenses.saju?.data?.fiveElements);
  const westernElement = topKey(lenses.western?.data?.elementBalance);
  const westernAsWuxing = WESTERN_TO_WUXING[westernElement] || "";
  const rawSukuyoElement = clean(lenses.sukuyo?.data?.element);
  const sukuyoElement = WUXING_SET.has(rawSukuyoElement) ? rawSukuyoElement : "";

  const elementBasis = [];
  if (sajuElement) elementBasis.push({ lens: "saju", path: "saju.fiveElements", value: sajuElement });
  if (westernAsWuxing) elementBasis.push({ lens: "western", path: "western.elementBalance", value: `${westernElement}(${westernAsWuxing})` });
  if (sukuyoElement) elementBasis.push({ lens: "sukuyo", path: "sukuyo.element", value: sukuyoElement });

  const elementValues = [sajuElement, westernAsWuxing, sukuyoElement].filter(Boolean);
  if (elementValues.length >= 2 && new Set(elementValues).size === 1) {
    rows.push({
      axis: "element",
      label: `${elementValues[0]} 기운이 서로 다른 관점에서 함께 두드러집니다.`,
      basis: elementBasis,
    });
  }

  // (b) 시기 축 — 대운·대한·다샤의 전환 연도가 ±2년 안에 겹치는가.
  const transitions = [];
  for (const cycle of safeArray(lenses.saju?.data?.majorLuckTimeline)) {
    if (Number(cycle?.startYear) > 0) {
      transitions.push({ lens: "saju", path: "saju.majorLuckTimeline", year: Number(cycle.startYear) });
    }
  }
  // 자미 대한 경계는 나이 기준이라 출생연도가 있어야 연도로 환산된다. 시간 미상이면
  // 대한 자체가 어긋나므로(명궁 의존) full 일 때만 교차 검증에 쓴다.
  const ziweiBirthYear = Number(lenses.ziwei?.data?.lunar?.year) || 0;
  if (ziweiBirthYear > 0 && lenses.ziwei?.confidence === "full") {
    for (const luck of safeArray(lenses.ziwei?.data?.majorLuckTimeline)) {
      if (Number(luck?.startAge) > 0) {
        transitions.push({ lens: "ziwei", path: "ziwei.majorLuckTimeline", year: ziweiBirthYear + Number(luck.startAge) });
      }
    }
  }
  const dashaNextYear = Number(clean(lenses.vedic?.data?.dashaNext?.startDate).slice(0, 4));
  if (Number.isFinite(dashaNextYear) && dashaNextYear > 0) {
    transitions.push({ lens: "vedic", path: "vedic.dashaNext", year: dashaNextYear });
  }

  const thisYear = new Date().getFullYear();
  const upcoming = transitions.filter((row) => row.year >= thisYear - 1 && row.year <= thisYear + 12);
  const seenKeys = new Set();
  for (const row of upcoming) {
    const partners = upcoming.filter((other) => other.lens !== row.lens && Math.abs(other.year - row.year) <= 2);
    if (!partners.length) continue;
    const basis = [row, ...partners].map((item) => ({ lens: item.lens, path: item.path, value: String(item.year) }));
    const key = basis.map((item) => `${item.lens}:${item.value}`).sort().join("|");
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    rows.push({
      axis: "timing",
      label: `${row.year}년 무렵 전환 구간이 서로 다른 관점에서 함께 표시됩니다.`,
      basis,
    });
  }

  return rows.slice(0, 5);
}

function detectDivergence(lenses = {}) {
  const rows = [];
  const sajuElement = topKey(lenses.saju?.data?.fiveElements);
  const westernAsWuxing = WESTERN_TO_WUXING[topKey(lenses.western?.data?.elementBalance)] || "";
  if (sajuElement && westernAsWuxing && sajuElement !== westernAsWuxing) {
    rows.push({
      axis: "element",
      label: `현실에서 두드러지는 기운(${sajuElement})과 심리에서 두드러지는 기운(${westernAsWuxing})이 서로 다릅니다.`,
      basis: [
        { lens: "saju", path: "saju.fiveElements", value: sajuElement },
        { lens: "western", path: "western.elementBalance", value: westernAsWuxing },
      ],
    });
  }
  return rows;
}

function buildLensAvailability(lenses = {}) {
  return Object.fromEntries(LENS_IDS.map((id) => [id, {
    label: LENS_ROLES[id].label,
    confidence: lenses[id]?.confidence || "none",
    provisionalFields: safeArray(lenses[id]?.provisionalFields),
  }]));
}

function buildSynthesis(lenses = {}, limitations = []) {
  return {
    lensAvailability: buildLensAvailability(lenses),
    convergence: detectConvergence(lenses),
    divergence: detectDivergence(lenses),
    patternSummaries: LENS_IDS
      .map((id) => ({ lens: id, label: LENS_ROLES[id].label, summary: clean(lenses[id]?.patternSummary) }))
      .filter((row) => row.summary),
    limitationCount: safeArray(limitations).length,
  };
}

/**
 * 체계 기여도 — 레이더 차트용. **LLM 관여 0, 완전 결정론.**
 *
 * "어느 체계가 더 강한가"는 척도가 다른 다섯을 같은 축에 놓는 것이라 그 자체가 지어낸
 * 수치다. 대신 축의 의미를 "이 리포트에서 각 렌즈가 실제로 얼마나 근거를 제공했는가"로
 * 정의하면 전부 계산값에서 나온다.
 *
 * usageWeights 는 리포트의 장 정의(어느 장의 주도/보조 렌즈인가)에서 나오므로 라우트가
 * 넘겨준다. 계산기가 라우트를 import 하면 순환 참조가 된다.
 */
export function computeLensContribution(lenses = {}, usageWeights = null) {
  const raw = asObject(usageWeights);
  const maxRaw = Math.max(1, ...LENS_IDS.map((id) => Number(raw[id]) || 0));
  const hasUsage = LENS_IDS.some((id) => Number(raw[id]) > 0);

  return Object.fromEntries(LENS_IDS.map((id) => {
    const block = lenses[id];
    const coverage = block?.confidence === "full" ? 1 : block?.confidence === "provisional" ? 0.55 : 0;
    const usage = hasUsage ? (Number(raw[id]) || 0) / maxRaw : 0;
    const keys = LENS_FIELD_PRIORITY[id] || [];
    const density = (keys.length && block?.data)
      ? keys.filter((key) => block.data[key] !== undefined && block.data[key] !== null).length / keys.length
      : 0;
    // usageWeights 가 없으면 그 몫(0.35)을 coverage 로 넘겨 총점 스케일을 유지한다.
    const score = hasUsage
      ? (0.45 * coverage) + (0.35 * usage) + (0.20 * density)
      : (0.80 * coverage) + (0.20 * density);
    return [id, {
      label: LENS_ROLES[id].label,
      role: LENS_ROLES[id].role,
      score: Math.round(100 * score),
      basis: {
        coverage: Number(coverage.toFixed(3)),
        usageWeight: Number(usage.toFixed(3)),
        density: Number(density.toFixed(3)),
        confidence: block?.confidence || "none",
      },
      formula: hasUsage
        ? "0.45×계산 가용성 + 0.35×리포트 내 비중 + 0.20×데이터 충실도"
        : "0.80×계산 가용성 + 0.20×데이터 충실도",
    }];
  }));
}

// ─── 통합 계산 ──────────────────────────────────────────────────────────────

export async function buildKarmaDestinyIntegratedResult(env, birthInfo = {}, options = {}) {
  const limitations = [];
  const birthTimeUnknown = birthInfo.birthTimeUnknown === true || !clean(birthInfo.birthTime);
  const birthPlace = asObject(birthInfo.birthPlace);
  const placeAvailable = hasUsablePlace(birthPlace);
  const age = currentAgeFrom(parseBirthDate(birthInfo.birthDate));
  const lenses = {};

  // ── 사주 — 시간 미상이어도 시주만 빠지고 나머지는 온전하다 ──────────────
  try {
    const calculated = calculateLifeBookAiSaju(birthInfo);
    lenses.saju = lensBlock("saju", {
      confidence: "full",
      data: compactSaju(calculated, { birthTimeUnknown, age }),
      omittedFields: birthTimeUnknown ? ["pillars.hour", "tenGodsByPillar.hour"] : [],
      patternSummary: summarizeSaju(calculated),
    });
    if (birthTimeUnknown) {
      limitations.push({ system: "saju", code: "TIME_UNKNOWN", message: "출생시간을 모르는 입력이어서 시주는 제외했습니다." });
    }
  } catch (error) {
    limitations.push({ system: "saju", code: clean(error?.code || "SAJU_CALCULATION_FAILED"), message: clean(error?.message || error, 240) });
    lenses.saju = lensBlock("saju", { confidence: "none", omittedFields: ["all"] });
  }

  // ── 숙요 — 출생시간·출생지와 완전 무관하므로 항상 온전하다 ──────────────
  try {
    const lunarParts = toLunarParts(birthInfo);
    const natal = lunarParts
      ? buildSukuyoFromLunar(lunarParts.lunarMonth, lunarParts.lunarDay, {
        isLeapMonth: lunarParts.isLeapMonth,
        source: lunarParts.source,
      })
      : null;
    if (natal) {
      lenses.sukuyo = lensBlock("sukuyo", {
        confidence: "full",
        data: compactSukuyo(natal),
        patternSummary: summarizeSukuyo(natal),
      });
    } else {
      limitations.push({ system: "sukuyo", code: "SUKUYO_LUNAR_UNAVAILABLE", message: "생년월일에서 음력 일자를 구하지 못해 본명숙을 확정하지 못했습니다." });
      lenses.sukuyo = lensBlock("sukuyo", { confidence: "none", omittedFields: ["all"] });
    }
  } catch (error) {
    limitations.push({ system: "sukuyo", code: clean(error?.code || "SUKUYO_CALCULATION_FAILED"), message: clean(error?.message || error, 240) });
    lenses.sukuyo = lensBlock("sukuyo", { confidence: "none", omittedFields: ["all"] });
  }

  // ── 자미두수 — 시간 미상이면 명궁 자체가 어긋나므로 provisional ─────────
  try {
    const chart = calculateZiweiAiChart({ birthInfo });
    lenses.ziwei = lensBlock("ziwei", {
      confidence: birthTimeUnknown ? "provisional" : "full",
      data: compactZiwei(chart, { age }),
      provisionalFields: birthTimeUnknown ? ZIWEI_TIME_DEPENDENT_PATHS : [],
      patternSummary: summarizeZiwei(chart, { birthTimeUnknown }),
    });
    if (birthTimeUnknown) {
      limitations.push({
        system: "ziwei",
        code: "TIME_UNKNOWN",
        message: "출생시간을 모르는 입력이어서 명궁과 12궁 배치는 가능성으로만 다룹니다.",
      });
    }
  } catch (error) {
    limitations.push({ system: "ziwei", code: clean(error?.code || "ZIWEI_CALCULATION_FAILED"), message: clean(error?.message || error, 240) });
    lenses.ziwei = lensBlock("ziwei", { confidence: "none", omittedFields: ["all"] });
  }

  // ── 서양 / 베다 — 좌표가 없을 때만 계산 불가 ────────────────────────────
  //
  // 개편 전에는 출생시간을 몰라도 두 렌즈를 통째로 스킵했다. 그러면 심리 렌즈와 영혼
  // 렌즈가 함께 사라져 다섯 렌즈 구조가 무너진다. 시간 미상이어도 좌표가 있으면 정오
  // 기준 행성 사인·어스펙트는 유효하므로, 앵글(상승점·MC·하우스)만 떼고 살린다.
  if (!placeAvailable) {
    limitations.push({
      system: "astrology",
      code: "PLACE_INCOMPLETE",
      message: "출생지 좌표 또는 시간대가 부족해 서양·베다 점성술 계산을 제한했습니다.",
    });
    lenses.western = lensBlock("western", { confidence: "none", omittedFields: ["all"] });
    lenses.vedic = lensBlock("vedic", { confidence: "none", omittedFields: ["all"] });
  } else {
    const astroBirthInput = buildAstroBirthInput(birthInfo);
    const swissInput = toSwissChartInputFromBirthInput(astroBirthInput);
    const angleOmissions = birthTimeUnknown ? ["ascendant", "mc", "houseCusps", "planets.house"] : [];
    if (birthTimeUnknown) {
      limitations.push({
        system: "astrology",
        code: "TIME_UNKNOWN",
        message: "출생시간을 모르는 입력이어서 상승점과 하우스 해석은 제외하고 행성 배치만 봅니다.",
      });
    }

    try {
      const westernChart = await getSwissWesternChart(env, swissInput, { strictSwiss: true, allowFallback: false });
      const data = compactWestern(
        buildAstroLocalChartJson(astroBirthInput, westernChart, null, { strictPremium: true }),
        { dropAngles: birthTimeUnknown },
      );
      lenses.western = lensBlock("western", {
        confidence: birthTimeUnknown ? "provisional" : "full",
        data,
        // 달은 하루에 최대 13도를 움직여 정오 기준 사인이 경계에서 어긋날 수 있다.
        provisionalFields: birthTimeUnknown ? ["moon"] : [],
        omittedFields: angleOmissions,
        patternSummary: data.patternSummary,
      });
    } catch (error) {
      limitations.push({ system: "western", code: clean(error?.code || "WESTERN_CALCULATION_FAILED"), message: clean(error?.message || error, 240) });
      lenses.western = lensBlock("western", { confidence: "none", omittedFields: ["all"] });
    }

    try {
      const vedicChartSource = await getSwissVedicPlanets(env, swissInput, { strictSwiss: true, allowFallback: false });
      // buildVedicLocalChartJson 의 chart.dashas 는 start/end 가 빈 자리표라 시기 해석에
      // 쓸 수 없다(vedic-premium-generator.js:654 buildVimshottariFromMoon). 이미 받은
      // 사이데리얼 달 황경으로 실제 다샤를 직접 만든다 — 추가 에페메리스 호출 없음.
      const moonLongitude = Number(asObject(vedicChartSource.planets).Moon);
      const birthUtc = birthUtcFromSwissInput(swissInput);
      const dasha = (Number.isFinite(moonLongitude) && birthUtc)
        ? buildVimshottariDasha(moonLongitude, birthUtc, new Date())
        : null;
      const data = compactVedic(
        buildVedicLocalChartJson({ ...astroBirthInput, chartSource: vedicChartSource }, { strictPremium: true }),
        { dropAngles: birthTimeUnknown, dasha },
      );
      lenses.vedic = lensBlock("vedic", {
        confidence: birthTimeUnknown ? "provisional" : "full",
        data,
        provisionalFields: birthTimeUnknown ? ["moon"] : [],
        omittedFields: [...angleOmissions, ...(dasha ? [] : ["dashaCurrent", "dashaNext"])],
        patternSummary: data.patternSummary,
      });
    } catch (error) {
      limitations.push({ system: "vedic", code: clean(error?.code || "VEDIC_CALCULATION_FAILED"), message: clean(error?.message || error, 240) });
      lenses.vedic = lensBlock("vedic", { confidence: "none", omittedFields: ["all"] });
    }
  }

  const integrated = {
    schemaVersion: 2,
    lenses,
    lensAvailability: buildLensAvailability(lenses),
    lensContribution: computeLensContribution(lenses, options?.lensUsageWeights),
    synthesis: buildSynthesis(lenses, limitations),
    limitations,
    // 하위 호환 별칭 — 구 3체계 이름을 읽는 프론트/검증 코드를 깨뜨리지 않는다.
    saju: lenses.saju?.data || null,
    westernAstrology: lenses.western?.data || null,
    vedicAstrology: lenses.vedic?.data || null,
  };

  if (limitations.length && options?.log !== false) {
    console.warn("[karma-destiny-ai:calculation-limit]", JSON.stringify(limitations));
  }

  return integrated;
}

export const __karmaDestinyCalculationTestUtils = {
  toLunarParts,
  buildSukuyoRelationAxis,
  detectConvergence,
  westernTraits,
  currentAgeFrom,
  compactSukuyo,
};
