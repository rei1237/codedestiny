import { buildFortuneQuestionPromptPackage } from "./fortune-question-prompt.js";

const DEFAULT_TEXT = "제공되지 않음";

export const ZIWEI_AI_PROMPT_FEATURE_KEY = "ziwei_ai_prompt_generator";
export const ZIWEI_AI_PROMPT_PRICE = 100;

const QUESTION_TYPE_RULES = Object.freeze({
  love: ["연애", "결혼", "재회", "상대", "남자", "여자", "배우자", "인연"],
  career: ["직업", "진로", "코딩", "사업", "서비스", "상담", "창업", "일", "회사"],
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

function toText(value, fallback = DEFAULT_TEXT) {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
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
  const strength = toText(star.strengthSymbol || star.symbol || "", "");
  return strength ? `${name}${strength}` : name;
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
    return {
      name,
      strengthSymbol: toText(star.strengthSymbol || star.symbol, ""),
    };
  }
  const raw = String(star == null ? "" : star)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return null;
  const symbolMatch = raw.match(/[◎○△×]/);
  const strengthSymbol = symbolMatch ? symbolMatch[0] : "";
  const name = raw
    .replace(/[◎○△×]/g, "")
    .replace(/\(차성\)/g, "")
    .trim();
  if (!name) return null;
  return { name, strengthSymbol };
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
    const palaceName = Array.isArray(chart?.palacesByIndex) ? chart.palacesByIndex[index] : "";
    return {
      palaceId: palaceIdFromName(palaceName),
      range: toText(range, ""),
    };
  });
}

function summarizePalace(palace) {
  if (!palace || typeof palace !== "object") return DEFAULT_TEXT;
  const name = toText(palace.name || PALACE_LABELS[String(palace.id || "")], DEFAULT_TEXT);
  const branch = toText(palace.branch || palace.earthlyBranch, DEFAULT_TEXT);
  const mainStars = starsToText(palace.mainStars);
  const auxStars = starsToText(palace.auxiliaryStars);
  const weakStars = starsToText(palace?.strengthSummary?.weakStars);
  return `${name}(${branch}) | 주성: ${mainStars} | 보조성: ${auxStars} | 약세: ${weakStars}`;
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

  const annualFlow = chart.annualFlow && typeof chart.annualFlow === "object" ? chart.annualFlow : {};
  const majorPeriods = Array.isArray(chart.majorPeriods) && chart.majorPeriods.length
    ? chart.majorPeriods
    : buildLegacyMajorPeriods(chart);

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
    hualu: toText(chart?.sihua?.hualu),
    huaquan: toText(chart?.sihua?.huaquan),
    huake: toText(chart?.sihua?.huake),
    huaji: toText(chart?.sihua?.huaji),
    majorPeriods: majorPeriods.length
      ? majorPeriods.map((period) => `${toText(PALACE_LABELS[period?.palaceId] || period?.palaceId)} ${toText(period?.range)}`)
      : [DEFAULT_TEXT],
    annualFlow: {
      yearLabel: toText(annualFlow.yearLabel),
      keyPalaces: Array.isArray(annualFlow.keyPalaces) && annualFlow.keyPalaces.length
        ? annualFlow.keyPalaces.map((palaceId) => toText(PALACE_LABELS[String(palaceId)] || palaceId))
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

export function buildZiweiAIPrompt({ question, chartResult }) {
  const normalizedQuestion = ensureValidQuestion(question);
  ensureChartPresence(chartResult);

  const questionType = classifyZiweiPromptQuestionType(normalizedQuestion);
  const normalizedChart = normalizeChart(chartResult);
  const questionTypeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;
  const relatedPalaceLines = buildRelatedPalaceLines(normalizedChart, questionType);

  const domainDataLines = [
    `질문 유형: ${questionTypeLabel}`,
    `명궁/신궁: ${normalizedChart.mingGong} / ${normalizedChart.shenGong}`,
    `명궁 주성/신궁 주성: ${normalizedChart.mingMainStars} / ${normalizedChart.shenMainStars}`,
    `강세궁/약세궁: ${normalizedChart.strongestPalace} / ${normalizedChart.weakestPalace}`,
    `사화: 화록 ${normalizedChart.hualu}, 화권 ${normalizedChart.huaquan}, 화과 ${normalizedChart.huake}, 화기 ${normalizedChart.huaji}`,
    `대한/대운 요약: ${normalizedChart.majorPeriods.join(" | ")}`,
    `세운: ${normalizedChart.annualFlow.yearLabel} / 핵심궁 ${normalizedChart.annualFlow.keyPalaces.join(", ")}`,
    `핵심 궁 참조: ${relatedPalaceLines.join(" || ")}`,
  ];

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
    analysisAngles: buildZiweiAngles(questionType),
    recommendedFollowUpQuestions: buildZiweiFollowUps(questionType),
    caution: "궁/별 해석은 경향성 기반이며 실제 결정은 현재 환경과 함께 판단해야 합니다.",
    domainDataLines,
    minPromptLength: 1700,
  });

  const digestSource = [
    normalizedQuestion,
    questionType,
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
    digestSource,
  };
}
