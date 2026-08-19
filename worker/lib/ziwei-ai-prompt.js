import { buildFortuneQuestionPromptPackage } from "./fortune-question-prompt.js";
import {
  classifyQuestionToZiweiDomain,
  getZiweiPromptTemplate,
} from "./ziwei-ai-prompt-templates.mjs";
import { buildZiweiPersonalityContextLines } from "./ziwei-personality-context.js";

const DEFAULT_TEXT = "제공되지 않음";

export const ZIWEI_AI_PROMPT_FEATURE_KEY = "ziwei_ai_prompt_generator";
export const ZIWEI_AI_PROMPT_PRICE = 100;
export { classifyQuestionToZiweiDomain, getZiweiPromptTemplate };

const QUESTION_TYPE_RULES = Object.freeze({
  love: ["연애", "결혼", "재회", "상대", "남자", "여자", "배우자", "인연"],
  career: ["직업", "진로", "이직", "전직", "퇴사", "직장", "커리어", "코딩", "사업", "서비스", "상담", "창업", "일", "회사"],
  money: ["돈", "재물", "수익", "매출", "부자", "경제", "투자"],
  lawsuit: ["소송", "고소", "재판", "판사", "경찰", "검찰", "법", "송사"],
  relationship: ["인간관계", "친구", "가족", "사람", "내담자", "고객"],
  health: ["건강", "멘탈", "우울", "불안", "몸", "질병"],
  life_direction: ["인생", "방향", "운명", "성공", "미래", "살아갈 길"],
});

const QUESTION_TYPE_LABELS = Object.freeze({
  love: "연애/결혼",
  career: "직업/사업",
  money: "돈/재물",
  lawsuit: "소송/분쟁",
  relationship: "인간관계",
  health: "건강/멘탈",
  life_direction: "인생 방향",
  general: "일반",
});

const PALACE_LABELS = Object.freeze({
  ming: "명궁",
  siblings: "형제궁",
  spouse: "부부궁",
  children: "자녀궁",
  wealth: "재백궁",
  health: "질액궁",
  travel: "천이궁",
  friends: "교우궁",
  career: "관록궁",
  property: "전택궁",
  fortune: "복덕궁",
  parents: "부모궁",
});

const PALACE_NAME_ALIASES = Object.freeze({
  "부처궁": "spouse",
  "노복궁": "friends",
});

const QUESTION_TYPE_PALACES = Object.freeze({
  love: ["spouse", "fortune", "ming", "travel"],
  career: ["career", "wealth", "ming", "travel"],
  lawsuit: ["career", "travel", "friends", "health", "ming"],
  money: ["wealth", "property", "career"],
  relationship: ["friends", "siblings", "spouse", "travel"],
  health: ["health", "fortune", "ming"],
  life_direction: ["ming", "career", "fortune", "travel"],
  general: ["ming", "career", "wealth", "fortune"],
});

const ZIWEI_CORE_ANGLES = Object.freeze([
  "명궁/신궁의 기질 축과 질문 주제의 연결성",
  "재백궁·관록궁·복덕궁·천이궁의 삼방사정 상호작용",
  "주성·보조성·살성의 균형과 공궁 여부",
  "화록·화권·화과·화기의 작동 방향과 역효과",
  "궁간 연결과 대한·유년 흐름의 타이밍 차이",
  "현실 선택(직업/관계/자원배분)으로 연결되는 실행 전략",
]);

const ZIWEI_STRENGTH_META = Object.freeze({
  "◎": { name: "묘", meaning: "가장 강함" },
  "O": { name: "득", meaning: "강함" },
  "▲": { name: "리", meaning: "이로움" },
  "△": { name: "평", meaning: "보통 중간" },
  "X": { name: "함", meaning: "약함" },
});

const ZIWEI_ACTION_TERMS = Object.freeze([
  "실행",
  "행동",
  "우선순위",
  "점검",
  "조정",
  "선택",
]);

const ZIWEI_VAGUE_GUARD_TERMS = Object.freeze([
  "좋은 운",
  "나쁜 운",
  "노력하면",
  "마음먹기에",
  "상황에 따라",
  "무난",
]);

function toText(value, fallback = DEFAULT_TEXT) {
  if (value && typeof value === "object") {
    const objectText = objectToText(value);
    return objectText || fallback;
  }
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function objectToText(value) {
  if (!value || typeof value !== "object") return "";
  const startAge = Number(value.startAge != null ? value.startAge : value.start);
  const endAge = Number(value.endAge != null ? value.endAge : value.end);
  if (Number.isFinite(startAge) && Number.isFinite(endAge)) {
    return `${Math.trunc(startAge)}~${Math.trunc(endAge)}세`;
  }
  const candidates = [
    value.label,
    value.range,
    value.text,
    value.value,
    value.name,
    value.title,
    value.palaceName,
    value.palace,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (candidate && typeof candidate === "object") {
      const nested = objectToText(candidate);
      if (nested) return nested;
      continue;
    }
    const text = String(candidate == null ? "" : candidate).trim();
    if (text && text !== "[object Object]") return text;
  }
  if (value.star || value.starName || value.type || value.label) {
    return [value.star || value.starName, value.type || value.label].map((item) => toText(item, "")).filter(Boolean).join(" ");
  }
  return "";
}

function toGenderLabel(gender) {
  if (String(gender || "").toUpperCase() === "M") return "남성";
  if (String(gender || "").toUpperCase() === "F") return "여성";
  return DEFAULT_TEXT;
}

function toCalendarLabel(calendarType) {
  if (calendarType === "solar") return "양력";
  if (calendarType === "lunar") return "음력";
  return DEFAULT_TEXT;
}

function toBirthDateText(user) {
  if (!user || typeof user !== "object") return DEFAULT_TEXT;
  const year = Number(user.birthYear);
  const month = Number(user.birthMonth);
  const day = Number(user.birthDay);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return DEFAULT_TEXT;
  const yyyy = String(Math.trunc(year)).padStart(4, "0");
  const mm = String(Math.trunc(month)).padStart(2, "0");
  const dd = String(Math.trunc(day)).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toBirthTimeText(user) {
  if (!user || typeof user !== "object") return DEFAULT_TEXT;
  const unknownHour = user.unknownHour === true;
  const hour = Number(user.birthHour);
  const minute = Number(user.birthMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return unknownHour ? "제공되지 않음(정오 12시 fallback)" : DEFAULT_TEXT;
  }
  const hh = String(Math.trunc(hour)).padStart(2, "0");
  const mm = String(Math.trunc(minute)).padStart(2, "0");
  return unknownHour ? `${hh}:${mm} (출생시간 미상 fallback)` : `${hh}:${mm}`;
}

function toCommaText(values, fallback = DEFAULT_TEXT) {
  if (!Array.isArray(values)) return fallback;
  const normalized = values
    .map((item) => toText(item, ""))
    .filter(Boolean);
  return normalized.length ? normalized.join(", ") : fallback;
}

function starLabel(star) {
  if (!star || typeof star !== "object") return "";
  const name = toText(star.name, "");
  if (!name) return "";
  const strength = normalizeStrengthSymbolToken(star.strengthSymbol || star.symbol || "", star.strengthName || "");
  if (!strength) return name;
  const meta = ZIWEI_STRENGTH_META[strength];
  return meta ? `${name}${strength}(${meta.name})` : `${name}${strength}`;
}

function starsToText(stars) {
  if (!Array.isArray(stars) || !stars.length) return DEFAULT_TEXT;
  const labels = stars
    .map((star) => starLabel(star))
    .filter(Boolean);
  return labels.length ? labels.join(", ") : DEFAULT_TEXT;
}

function normalizeStar(star) {
  if (star && typeof star === "object") {
    const name = toText(star.name, "");
    if (!name) return null;
    const strengthSymbol = normalizeStrengthSymbolToken(star.strengthSymbol || star.symbol, star.strengthName || star.strength || star.brightness || "");
    const strengthMeta = strengthSymbol ? ZIWEI_STRENGTH_META[strengthSymbol] : null;
    return {
      name,
      strengthSymbol,
      strengthName: strengthMeta?.name || "",
      strengthMeaning: strengthMeta?.meaning || "",
    };
  }
  const raw = String(star == null ? "" : star)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return null;
  const symbolMatch = raw.match(/◎|○|▲|△|×|X|O|함/);
  const strengthSymbol = normalizeStrengthSymbolToken(symbolMatch ? symbolMatch[0] : "", raw);
  const strengthMeta = strengthSymbol ? ZIWEI_STRENGTH_META[strengthSymbol] : null;
  const name = raw
    .replace(/◎|○|▲|△|×|X|O|함/g, "")
    .replace(/묘|득|왕|리|평|실/g, "")
    .replace(/\(차성\)/g, "")
    .trim();
  if (!name) return null;
  return {
    name,
    strengthSymbol,
    strengthName: strengthMeta?.name || "",
    strengthMeaning: strengthMeta?.meaning || "",
  };
}

function normalizeStrengthSymbolToken(rawSymbol, rawStrengthName = "") {
  const symbol = String(rawSymbol == null ? "" : rawSymbol).trim();
  const name = String(rawStrengthName == null ? "" : rawStrengthName).trim();
  if (symbol === "◎") return "◎";
  if (symbol === "○" || symbol === "O" || symbol === "◉") return "O";
  if (symbol === "▲") return "▲";
  if (symbol === "△") return "△";
  if (symbol === "함" || symbol === "×" || symbol === "X") return "X";
  if (/묘|廟/.test(name)) return "◎";
  if (/득|왕|旺/.test(name)) return "O";
  if (/리|利|이로|유리|득/.test(name)) return "▲";
  if (/평|平|보통/.test(name)) return "△";
  if (/함|실|陷|약|쇠/.test(name)) return "X";
  return "";
}

function starsStrengthEvidenceToText(stars) {
  if (!Array.isArray(stars) || !stars.length) return DEFAULT_TEXT;
  const labels = stars
    .map((star) => {
      if (!star || typeof star !== "object") return "";
      const name = toText(star.name, "");
      if (!name) return "";
      const symbol = normalizeStrengthSymbolToken(star.strengthSymbol || star.symbol || "", star.strengthName || "");
      if (!symbol) return name;
      const meta = ZIWEI_STRENGTH_META[symbol];
      if (!meta) return `${name}${symbol}`;
      return `${name}${symbol}(${meta.meaning})`;
    })
    .filter(Boolean)
    .slice(0, 10);
  return labels.length ? labels.join(", ") : DEFAULT_TEXT;
}

function normalizeStarList(stars) {
  if (!Array.isArray(stars)) return [];
  return stars
    .map((star) => normalizeStar(star))
    .filter(Boolean);
}

function palaceIdFromName(name) {
  const normalized = String(name || "").trim();
  if (!normalized) return "";
  if (PALACE_NAME_ALIASES[normalized]) return PALACE_NAME_ALIASES[normalized];
  const entries = Object.entries(PALACE_LABELS);
  for (let i = 0; i < entries.length; i += 1) {
    if (entries[i][1] === normalized) return entries[i][0];
  }
  return "";
}

function findPalace(palaces, palaceIdOrName) {
  if (!Array.isArray(palaces) || !palaces.length) return null;
  const target = String(palaceIdOrName || "").trim();
  if (!target) return null;
  return (
    palaces.find((palace) => String(palace?.id || "") === target)
    || palaces.find((palace) => String(palace?.name || "") === target)
    || null
  );
}

function buildLegacyPalaces(chart) {
  const rows = Array.isArray(chart?.palaceStarData) ? chart.palaceStarData : [];
  return rows
    .map((row, index) => {
      const name = toText(row?.palace, "");
      if (!name) return null;
      return {
        id: palaceIdFromName(name),
        name,
        branch: toText(row?.branch, ""),
        mainStars: normalizeStarList(row?.stars),
        auxiliaryStars: normalizeStarList(row?.auxStars),
        strengthSummary: {
          weakStars: normalizeStarList(row?.badStars),
        },
        index: Number.isFinite(Number(row?.index)) ? Number(row.index) : index,
      };
    })
    .filter(Boolean);
}

function buildLegacyMajorPeriods(chart) {
  if (!Array.isArray(chart?.daHanList) || !chart.daHanList.length) return [];
  return chart.daHanList.map((range, index) => {
    const periodIndex = Number.isFinite(Number(range?.idx)) ? Number(range.idx) : index;
    const palaceName = toText(range?.palaceName, "")
      || (Array.isArray(chart?.palacesByIndex) ? chart.palacesByIndex[periodIndex] : "")
      || (Array.isArray(chart?.palacesByIndex) ? chart.palacesByIndex[index] : "");
    return {
      palaceId: palaceIdFromName(palaceName),
      range: toText(range, ""),
    };
  });
}

function sihuaTypeMatches(rawType, expectedType) {
  const type = toText(rawType, "");
  if (!type) return false;
  const aliases = {
    hualu: ["화록", "록", "祿", "禄", "hualu", "luk"],
    huaquan: ["화권", "권", "權", "权", "huaquan", "quan"],
    huake: ["화과", "과", "科", "huake", "ke"],
    huaji: ["화기", "기", "忌", "huaji", "ji"],
  };
  return (aliases[expectedType] || []).some((alias) => type === alias || type.toLowerCase() === alias.toLowerCase());
}

function starNameFromTransform(value) {
  if (!value) return "";
  if (typeof value !== "object") return toText(value, "");
  return toText(value.name || value.starName || value.star || value.sourceStar || value.value, "");
}

function extractSihuaValue(chart, keys, expectedType) {
  const sihua = chart?.sihua && typeof chart.sihua === "object" ? chart.sihua : {};
  for (let i = 0; i < keys.length; i += 1) {
    const value = toText(sihua[keys[i]], "");
    if (value) return value;
  }

  const transformations = chart?.fourTransformations;
  if (transformations && typeof transformations === "object" && !Array.isArray(transformations)) {
    for (let i = 0; i < keys.length; i += 1) {
      const value = starNameFromTransform(transformations[keys[i]]);
      if (value) return value;
    }
  }
  if (Array.isArray(transformations)) {
    const found = transformations.find((item) => sihuaTypeMatches(item?.type || item?.label || item?.transformation, expectedType));
    const value = starNameFromTransform(found);
    if (value) return value;
  }

  const sihuaData = chart?.sihuaData && typeof chart.sihuaData === "object" ? chart.sihuaData : {};
  const starNames = Object.keys(sihuaData);
  for (let i = 0; i < starNames.length; i += 1) {
    const item = sihuaData[starNames[i]] || {};
    if (!sihuaTypeMatches(item.type || item.label, expectedType)) continue;
    const palaceName = toText(item.palaceName || item.palace, "");
    return `${starNames[i]}${palaceName ? ` (${palaceName})` : ""}`;
  }
  return "";
}

function normalizeAnnualFlowSource(chart) {
  const candidates = [
    chart?.annualFlow,
    chart?.yearlyLuck,
    chart?.annualLuck,
    chart?.luck?.annual,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    if (candidates[i] && typeof candidates[i] === "object") return candidates[i];
  }
  return {};
}

function normalizeAnnualKeyPalaces(source, chart) {
  const raw = Array.isArray(source.keyPalaces) ? source.keyPalaces
    : Array.isArray(source.corePalaces) ? source.corePalaces
      : Array.isArray(source.palaces) ? source.palaces
        : [];
  const values = raw
    .map((item) => {
      if (item && typeof item === "object") return item.palaceId || item.id || item.palaceKey || item.name || item.palaceName || item.palace;
      return item;
    })
    .map((item) => toText(item, ""))
    .filter(Boolean);
  if (values.length) return values;

  const sihuaData = chart?.sihuaData && typeof chart.sihuaData === "object" ? chart.sihuaData : {};
  return Object.keys(sihuaData)
    .map((star) => toText(sihuaData[star]?.palaceName || sihuaData[star]?.palace, ""))
    .filter(Boolean);
}

function summarizePalace(palace) {
  if (!palace || typeof palace !== "object") return DEFAULT_TEXT;
  const name = toText(palace.name || PALACE_LABELS[String(palace.id || "")], DEFAULT_TEXT);
  const branch = toText(palace.branch || palace.earthlyBranch, DEFAULT_TEXT);
  const mainStars = starsToText(palace.mainStars);
  const auxStars = starsToText(palace.auxiliaryStars);
  const weakStars = starsToText(palace?.strengthSummary?.weakStars);
  const strengthEvidence = starsStrengthEvidenceToText(
    []
      .concat(Array.isArray(palace.mainStars) ? palace.mainStars : [])
      .concat(Array.isArray(palace.auxiliaryStars) ? palace.auxiliaryStars : [])
      .concat(Array.isArray(palace?.strengthSummary?.weakStars) ? palace.strengthSummary.weakStars : []),
  );
  return `${name}(${branch}) | 주성: ${mainStars} | 보조성: ${auxStars} | 약세: ${weakStars} | 강약근거: ${strengthEvidence}`;
}

function normalizeChart(chartResult) {
  const chart = chartResult && typeof chartResult === "object" ? chartResult : {};
  const user = chart.user && typeof chart.user === "object" ? chart.user : {};
  const palaces = Array.isArray(chart.palaces) && chart.palaces.length ? chart.palaces : buildLegacyPalaces(chart);

  const mingPalace = findPalace(palaces, "ming") || findPalace(palaces, chart.mingGong);
  const shenId = palaceIdFromName(chart.shenGong);
  const shenPalace = findPalace(palaces, shenId || chart.shenGong);

  const strongestPalace = findPalace(palaces, chart?.summary?.strongestPalaceId);
  const weakestPalace = findPalace(palaces, chart?.summary?.weakestPalaceId);

  const annualFlow = normalizeAnnualFlowSource(chart);
  const majorPeriods = Array.isArray(chart.majorPeriods) && chart.majorPeriods.length
    ? chart.majorPeriods
    : Array.isArray(chart.majorLuck) && chart.majorLuck.length
      ? chart.majorLuck
      : Array.isArray(chart?.luck?.decadeLuck) && chart.luck.decadeLuck.length
        ? chart.luck.decadeLuck
        : buildLegacyMajorPeriods(chart);
  const annualKeyPalaces = normalizeAnnualKeyPalaces(annualFlow, chart);

  const allPalaceLines = palaces
    .slice()
    .sort((a, b) => Number(a?.index || 0) - Number(b?.index || 0))
    .map((palace) => summarizePalace(palace));

  return {
    gender: toGenderLabel(user.gender),
    calendarType: toCalendarLabel(user.calendarType),
    birthDate: toBirthDateText(user),
    birthTime: toBirthTimeText(user),
    birthPlace: toText(user.birthPlace),
    timezone: toText(user.timezone),
    chartYear: toText(
      [
        chart.birthYearStem,
        chart.yearGan,
        chart.yearZhi,
      ].filter(Boolean).join(" "),
      DEFAULT_TEXT,
    ),
    lunarInfo: user.calendarType === "lunar"
      ? `음력 입력${user.isLeapMonth ? " (윤달)" : ""}`
      : "양력 입력",
    mingGong: toText(chart.mingGong),
    shenGong: toText(chart.shenGong),
    mingMainStars: starsToText(mingPalace?.mainStars),
    shenMainStars: starsToText(shenPalace?.mainStars),
    strongestPalace: toText(strongestPalace?.name),
    weakestPalace: toText(weakestPalace?.name),
    direction: toText(chart?.summary?.direction),
    strengths: toCommaText(chart?.summary?.strengths),
    weaknesses: toCommaText(chart?.summary?.weaknesses),
    juInfo: toText(chart.juInfo),
    hualu: toText(extractSihuaValue(chart, ["hualu", "luk", "lu"], "hualu")),
    huaquan: toText(extractSihuaValue(chart, ["huaquan", "quan"], "huaquan")),
    huake: toText(extractSihuaValue(chart, ["huake", "ke"], "huake")),
    huaji: toText(extractSihuaValue(chart, ["huaji", "ji"], "huaji")),
    majorPeriods: majorPeriods.length
      ? majorPeriods.map((period) => {
        const palaceLabel = toText(PALACE_LABELS[period?.palaceId] || period?.palaceName || period?.name || period?.palaceId, "");
        const rangeLabel = toText(period?.range || period, "");
        return [palaceLabel, rangeLabel].filter(Boolean).join(" ") || DEFAULT_TEXT;
      })
      : [DEFAULT_TEXT],
    annualFlow: {
      yearLabel: toText(annualFlow.yearLabel || annualFlow.year || annualFlow.label),
      keyPalaces: annualKeyPalaces.length
        ? annualKeyPalaces.map((palaceId) => toText(PALACE_LABELS[String(palaceId)] || palaceId))
        : [DEFAULT_TEXT],
      notes: Array.isArray(annualFlow.notes) && annualFlow.notes.length
        ? annualFlow.notes.map((note) => toText(note))
        : [DEFAULT_TEXT],
    },
    palaces,
    allPalaceLines: allPalaceLines.length ? allPalaceLines : [DEFAULT_TEXT],
  };
}

export function classifyZiweiPromptQuestionType(question) {
  const text = String(question || "").trim().toLowerCase();
  if (!text) return "general";

  const orderedTypes = ["lawsuit", "career", "money", "love", "relationship", "health", "life_direction"];
  for (let i = 0; i < orderedTypes.length; i += 1) {
    const type = orderedTypes[i];
    const keywords = QUESTION_TYPE_RULES[type] || [];
    if (keywords.some((keyword) => text.includes(String(keyword).toLowerCase()))) {
      return type;
    }
  }
  return "general";
}

function buildRelatedPalaceLines(normalizedChart, questionType) {
  const palaceIds = QUESTION_TYPE_PALACES[questionType] || QUESTION_TYPE_PALACES.general;
  const lines = [];
  for (let i = 0; i < palaceIds.length; i += 1) {
    const palaceId = palaceIds[i];
    const palace = findPalace(normalizedChart.palaces, palaceId);
    const label = PALACE_LABELS[palaceId] || palaceId;
    lines.push(`- ${label}: ${summarizePalace(palace)}`);
  }
  return lines;
}

function buildZiweiAngles(questionType) {
  const angles = ZIWEI_CORE_ANGLES.slice();

  if (questionType === "money") {
    angles.push(
      "재백궁 단독 해석이 아닌 명궁·신궁·관록궁·복덕궁·천이궁 연동 분석",
      "재백궁 주성/보조성/살성과 화록·화권·화과·화기의 재물 작동 방식 구분",
      "직접 수익과 사회활동 누적 수익의 경로 분리",
      "전문기술형/조직직장형/사업창업형/콘텐츠브랜드형/상담교육형/투자운용형/해외이동형 수익 적합도 비교",
    );
  }

  if (questionType === "career") {
    angles.push(
      "관록궁 중심의 직무 구조와 천이궁 기반 외부 확장 가능성",
      "명궁·복덕궁 정서 에너지와 직업 지속성의 정합성",
    );
  }

  if (questionType === "love" || questionType === "relationship") {
    angles.push(
      "부부궁/복덕궁/천이궁 연결로 관계 안정성과 갈등 촉발 지점 분석",
      "관계에서 집착·거리두기 패턴의 원인과 조정 전략",
    );
  }

  return angles;
}

function buildZiweiFollowUps(questionType) {
  const common = [
    "현재 대한/유년에서 우선적으로 강화해야 할 궁은 어디인가요?",
    "제가 놓치기 쉬운 리스크 신호를 궁 단위로 알려주세요.",
    "실행 전략을 단기(4주)와 중기(6개월)로 나눠 제안해주세요.",
  ];

  if (questionType === "money") {
    return common.concat([
      "재백궁 기준으로 돈이 새는 패턴을 끊기 위한 행동 규칙은 무엇인가요?",
      "관록궁과 연결된 현실적인 수익 모델 3가지를 제안해주세요.",
    ]);
  }

  if (questionType === "love") {
    return common.concat([
      "부부궁 기준으로 관계를 안정시키는 소통 방식은 무엇인가요?",
      "갈등이 반복될 때 반드시 피해야 할 반응 패턴은 무엇인가요?",
    ]);
  }

  return common;
}

function collectZiweiPromptEvidence(normalizedChart) {
  const palaces = Array.isArray(normalizedChart?.palaces) ? normalizedChart.palaces : [];
  const palaceNames = palaces
    .map((palace) => toText(palace?.name, ""))
    .filter(Boolean)
    .slice(0, 12);

  const starNames = [];
  const pushStar = (name) => {
    const n = toText(name, "");
    if (!n) return;
    if (starNames.includes(n)) return;
    starNames.push(n);
  };

  for (let i = 0; i < palaces.length; i += 1) {
    const palace = palaces[i] || {};
    const main = Array.isArray(palace.mainStars) ? palace.mainStars : [];
    const aux = Array.isArray(palace.auxiliaryStars) ? palace.auxiliaryStars : [];
    const weak = Array.isArray(palace?.strengthSummary?.weakStars) ? palace.strengthSummary.weakStars : [];
    main.forEach((star) => pushStar(star?.name));
    aux.forEach((star) => pushStar(star?.name));
    weak.forEach((star) => pushStar(star?.name));
  }

  return {
    palaceNames: palaceNames.slice(0, 12),
    starNames: starNames.slice(0, 18),
    sihuaTerms: [normalizedChart?.hualu, normalizedChart?.huaquan, normalizedChart?.huake, normalizedChart?.huaji]
      .map((value) => toText(value, ""))
      .filter(Boolean),
    timingTerms: []
      .concat(Array.isArray(normalizedChart?.majorPeriods) ? normalizedChart.majorPeriods : [])
      .concat(Array.isArray(normalizedChart?.annualFlow?.notes) ? normalizedChart.annualFlow.notes : [])
      .map((value) => toText(value, ""))
      .filter(Boolean)
      .slice(0, 8),
  };
}

function buildZiweiSpecificityGuardLines(normalizedChart, questionType) {
  const evidence = collectZiweiPromptEvidence(normalizedChart);
  const mustPalaces = (QUESTION_TYPE_PALACES[questionType] || QUESTION_TYPE_PALACES.general)
    .map((id) => PALACE_LABELS[id] || id)
    .filter(Boolean);

  return [
    `심화 출력 강제 규칙: 반드시 ${mustPalaces.slice(0, 3).join(", ")} 중 2개 이상을 근거 궁으로 명시`,
    `심화 출력 강제 규칙: 반드시 seed에 있는 별 이름 2개 이상 직접 인용 (${evidence.starNames.slice(0, 6).join(", ") || "주성 2개 이상"})`,
    "심화 출력 강제 규칙: 사화(화록/화권/화과/화기) 또는 대한·세운 타이밍 근거를 반드시 포함",
    `심화 출력 강제 규칙: 액션 플랜은 ${ZIWEI_ACTION_TERMS.join("/")} 중 2개 이상 단어를 포함`,
    `모호표현 금지: ${ZIWEI_VAGUE_GUARD_TERMS.join(", ")}`,
    "답변 순서 고정: [근거 궁/별/사화] -> [해석] -> [단기 4주 행동] -> [중기 6개월 행동]",
  ];
}

function ensureValidQuestion(question) {
  const normalized = String(question || "").trim();
  if (!normalized || normalized.length < 5) {
    throw new Error("INVALID_QUESTION");
  }
  if (normalized.length > 1000) {
    throw new Error("INVALID_QUESTION");
  }
  return normalized;
}

function ensureChartPresence(chartResult) {
  if (!chartResult || typeof chartResult !== "object") {
    throw new Error("MISSING_CHART_RESULT");
  }
  const palaces = Array.isArray(chartResult?.palaces) && chartResult.palaces.length
    ? chartResult.palaces
    : buildLegacyPalaces(chartResult);
  if (!palaces.length) {
    throw new Error("MISSING_CHART_RESULT");
  }
}

function buildKeywordWeightLines(keywordWeights) {
  const entries = keywordWeights && typeof keywordWeights === "object"
    ? Object.entries(keywordWeights)
    : [];
  return entries.map(([keyword, meta]) => {
    const weight = Number(meta?.weight);
    const depth = String(meta?.depth || "일반").trim() || "일반";
    const markers = Array.isArray(meta?.markers) ? meta.markers.filter(Boolean) : [];
    const markerText = markers.length ? `, markers=${markers.join("/")}` : "";
    return `- ${keyword}: weight=${Number.isFinite(weight) ? weight.toFixed(2) : "0.70"}, depth=${depth}${markerText}`;
  });
}

export function buildZiweiAIPromptWithDomain({ question, chartResult, domain }) {
  const normalizedQuestion = ensureValidQuestion(question);
  ensureChartPresence(chartResult);

  const questionType = classifyZiweiPromptQuestionType(normalizedQuestion);
  const resolvedDomain = String(domain || "").trim() || classifyQuestionToZiweiDomain(normalizedQuestion);
  const domainTemplate = getZiweiPromptTemplate(resolvedDomain);
  if (!domainTemplate) {
    throw new Error("UNKNOWN_ZIWEI_DOMAIN");
  }
  const normalizedChart = normalizeChart(chartResult);
  const questionTypeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;
  const relatedPalaceLines = buildRelatedPalaceLines(normalizedChart, questionType);
  const evidence = collectZiweiPromptEvidence(normalizedChart);
  const specificityGuardLines = buildZiweiSpecificityGuardLines(normalizedChart, questionType);

  const domainDataLines = [
    `요청 도메인: ${domainTemplate.domainKo} (${resolvedDomain})`,
    `질문 유형: ${questionTypeLabel}`,
    `상황별 가중 키워드:\n${buildKeywordWeightLines(domainTemplate.keywordWeights).join("\n")}`,
    "강약 판정 기준: ◎=묘(가장 강함), O=득(강함), ▲=리(이로움), △=평(보통 중간), X=함/실(약함)",
    `명궁/신궁: ${normalizedChart.mingGong} / ${normalizedChart.shenGong}`,
    `명궁 주성/신궁 주성: ${normalizedChart.mingMainStars} / ${normalizedChart.shenMainStars}`,
    `강세궁/약세궁: ${normalizedChart.strongestPalace} / ${normalizedChart.weakestPalace}`,
    `사화: 화록 ${normalizedChart.hualu}, 화권 ${normalizedChart.huaquan}, 화과 ${normalizedChart.huake}, 화기 ${normalizedChart.huaji}`,
    `대한/대운 요약: ${normalizedChart.majorPeriods.join(" | ")}`,
    `세운: ${normalizedChart.annualFlow.yearLabel} / 핵심궁 ${normalizedChart.annualFlow.keyPalaces.join(", ")}`,
    `핵심 궁 참조: ${relatedPalaceLines.join(" || ")}`,
    `seed 궁 목록: ${evidence.palaceNames.join(", ") || DEFAULT_TEXT}`,
    `seed 별 목록: ${evidence.starNames.join(", ") || DEFAULT_TEXT}`,
    `seed 사화 근거: ${evidence.sihuaTerms.join(", ") || DEFAULT_TEXT}`,
    `seed 타이밍 근거: ${evidence.timingTerms.join(" | ") || DEFAULT_TEXT}`,
    `상황별 후속 질문 템플릿: ${(domainTemplate.questionPatterns || []).join(" | ")}`,
    ...specificityGuardLines,
    // 맨 끝에 둔다 — 이 배열의 앞 두 줄은 buildQuestionContextLine의 "참조 기류" 힌트에도 쓰이는데,
    // 성향 Context를 앞에 두면 그 힌트가 실제 명반 사실 대신 이 지침의 머리말을 인용하게 된다.
    ...buildZiweiPersonalityContextLines(chartResult),
  ];

  const analysisAngles = buildZiweiAngles(questionType).concat(
    Array.isArray(domainTemplate.analysisAngles) ? domainTemplate.analysisAngles : [],
    [
    "각 핵심 문단은 '① 한 줄 핵심(은유·이미지) → ② 근거(궁·별·강약·사화·삼방사정 회조) → ③ 지금 실행할 행동 조언' 3단으로 자연스럽게 이어 서술",
    "별 하나로 단정하지 말고, 근거 궁 2개 이상·근거 별 2개 이상을 명시하며 삼방사정 회조를 반드시 포함",
    "별·용어는 한자를 한 번 병기(예: 자미(紫微), 화기(化忌))하고 그 자리에서 한 번은 쉬운 말로 풀이",
    "화기(化忌)가 앉은 궁은 공포 조장 없이 주의점과 대처법을 함께 제시",
    "사화/대한/세운 근거를 행동 타이밍으로 변환해 단기·중기 전략으로 분리",
    "모호 표현 없이 질문 주제에 대한 결론을 선택 단위(무엇을/언제/어떻게)로 제시",
    ],
  );

  const followUps = buildZiweiFollowUps(questionType).concat(
    Array.isArray(domainTemplate.questionPatterns) ? domainTemplate.questionPatterns : [],
    [
    "근거로 사용한 궁과 별 각각 2개를 다시 짚어 설명해 주세요.",
    "4주 실행 체크리스트 5개와 6개월 조정 포인트 3개를 제시해 주세요.",
    ],
  );

  const promptPackage = buildFortuneQuestionPromptPackage({
    fortuneType: "ziwei",
    fortuneLabel: "자미두수",
    expertLabel: "자미두수 명반 해석 전문가",
    userQuestion: normalizedQuestion,
    analysisResult: chartResult,
    profile: {
      gender: normalizedChart.gender,
      calendarType: normalizedChart.calendarType,
      birthDate: normalizedChart.birthDate,
      birthTime: normalizedChart.birthTime,
      birthPlace: normalizedChart.birthPlace,
      timezone: normalizedChart.timezone,
    },
    questionTypeLabel,
    analysisAngles,
    recommendedFollowUpQuestions: followUps,
    caution: "궁/별 해석은 경향성 기반이며 실제 결정은 현재 환경과 함께 판단해야 합니다.",
    domainDataLines,
    minPromptLength: 1700,
  });

  const digestSource = [
    normalizedQuestion,
    questionType,
    resolvedDomain,
    normalizedChart.gender,
    normalizedChart.calendarType,
    normalizedChart.birthDate,
    normalizedChart.birthTime,
    normalizedChart.mingGong,
    normalizedChart.shenGong,
    normalizedChart.mingMainStars,
    normalizedChart.shenMainStars,
    normalizedChart.hualu,
    normalizedChart.huaquan,
    normalizedChart.huake,
    normalizedChart.huaji,
    normalizedChart.majorPeriods.join("|"),
    normalizedChart.annualFlow.yearLabel,
    normalizedChart.annualFlow.keyPalaces.join("|"),
    normalizedChart.allPalaceLines.join("|"),
    promptPackage.summaryIntent,
    promptPackage.analysisAngles.join("|"),
  ].join("\n");

  return {
    prompt: promptPackage.generatedPrompt,
    generatedPrompt: promptPackage.generatedPrompt,
    title: promptPackage.title,
    summaryIntent: promptPackage.summaryIntent,
    analysisAngles: promptPackage.analysisAngles,
    recommendedFollowUpQuestions: promptPackage.recommendedFollowUpQuestions,
    caution: promptPackage.caution,
    questionType,
    domain: resolvedDomain,
    domainLabel: domainTemplate.domainKo,
    keywordWeights: domainTemplate.keywordWeights,
    digestSource,
  };
}

export function buildZiweiAIPrompt({ question, chartResult }) {
  return buildZiweiAIPromptWithDomain({
    question,
    chartResult,
  });
}

export function buildZiweiCounselingToneProfile({ question, chartResult, domain } = {}) {
  const resolvedDomain = String(domain || "").trim() || "life_direction";
  const resolvedQuestion = String(question || "").trim() || "이 자미두수 명반을 상담하는 가장 정확하고 신비한 톤을 정리해 주세요.";
  const builtPrompt = buildZiweiAIPromptWithDomain({
    question: resolvedQuestion,
    chartResult,
    domain: resolvedDomain,
  });

  return {
    domain: builtPrompt.domain,
    domainLabel: builtPrompt.domainLabel,
    questionType: builtPrompt.questionType,
    questionTypeLabel: QUESTION_TYPE_LABELS[builtPrompt.questionType] || QUESTION_TYPE_LABELS.general,
    summaryIntent: builtPrompt.summaryIntent,
    analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles.slice(0, 8) : [],
    recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
      ? builtPrompt.recommendedFollowUpQuestions.slice(0, 8)
      : [],
    caution: builtPrompt.caution,
    toneQuestion: resolvedQuestion,
    toneRules: [
      "한 줄 핵심(은유)으로 문단을 열고",
      "궁·별·강약·사화·삼방사정 회조 근거를 논리로 노출하되 한자는 한 번 병기 후 쉬운 말로 풀며",
      "해석은 상담자의 현재 선택으로 좁히고",
      "실행은 4주와 6개월 단위로 나누어 안내",
    ],
    toneLead: `${builtPrompt.domainLabel} 상담의 기본 어조를 ${builtPrompt.questionType} 축으로 정렬한 프로필입니다.`,
    toneDigest: String(builtPrompt.digestSource || "").slice(0, 240),
  };
}
