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

  const prompt = [
    "# 자미두수 명반 기반 상담 요청 프롬프트",
    "",
    "너는 30년 경력의 자미두수 전문가이자 현실적인 인생 전략 상담가다.",
    "아래 명반 정보를 바탕으로 사용자의 질문에 대해 구체적이고 현실적인 답변을 해줘.",
    "데이터가 누락된 항목은 억지 단정 없이 보수적으로 해석해줘.",
    "",
    "## 1. 사용자의 질문",
    normalizedQuestion,
    "",
    "## 2. 기본 정보",
    `- 성별: ${normalizedChart.gender}`,
    `- 달력 기준: ${normalizedChart.calendarType}`,
    `- 생년월일: ${normalizedChart.birthDate}`,
    `- 출생 시간: ${normalizedChart.birthTime}`,
    `- 출생지: ${normalizedChart.birthPlace}`,
    `- 시간대: ${normalizedChart.timezone}`,
    `- 명반 기준 연도 정보: ${normalizedChart.chartYear}`,
    `- 음력/윤달 정보: ${normalizedChart.lunarInfo}`,
    "",
    "## 3. 명반 핵심 요약",
    `- 명궁: ${normalizedChart.mingGong}`,
    `- 신궁: ${normalizedChart.shenGong}`,
    `- 명궁 주성: ${normalizedChart.mingMainStars}`,
    `- 신궁 주성: ${normalizedChart.shenMainStars}`,
    `- 주요 국세 정보(局): ${normalizedChart.juInfo}`,
    `- 강하게 작동하는 궁: ${normalizedChart.strongestPalace}`,
    `- 보수적으로 점검할 궁: ${normalizedChart.weakestPalace}`,
    `- 핵심 방향성: ${normalizedChart.direction}`,
    `- 강점 요약: ${normalizedChart.strengths}`,
    `- 약점/주의 요약: ${normalizedChart.weaknesses}`,
    `- 사화(화록/화권/화과/화기): 화록 ${normalizedChart.hualu}, 화권 ${normalizedChart.huaquan}, 화과 ${normalizedChart.huake}, 화기 ${normalizedChart.huaji}`,
    `- 대한/대운 요약: ${normalizedChart.majorPeriods.join(" | ")}`,
    `- 세운 연도: ${normalizedChart.annualFlow.yearLabel}`,
    `- 세운 핵심 궁: ${normalizedChart.annualFlow.keyPalaces.join(", ")}`,
    `- 세운 메모: ${normalizedChart.annualFlow.notes.join(" | ")}`,
    "",
    "## 4. 질문과 관련된 핵심 궁",
    `이번 질문은 ${questionTypeLabel}에 해당하므로 아래 궁을 중심으로 분석해줘.`,
    "",
    ...relatedPalaceLines,
    "",
    "## 5. 전체 12궁 참고 데이터",
    ...normalizedChart.allPalaceLines.map((line) => `- ${line}`),
    "",
    "## 6. 분석 요청 방식",
    "다음 항목을 반드시 나누어 설명해줘.",
    "1. 이 명반에서 이 질문이 중요하게 드러나는 이유",
    "2. 유리한 점",
    "3. 불리하거나 조심해야 할 점",
    "4. 올해 또는 현재 운에서 작동하는 흐름",
    "5. 현실적으로 취해야 할 전략",
    "6. 피해야 할 행동",
    "7. 결론",
    "",
    "## 7. 답변 톤",
    "- 막연한 위로나 공포 조장은 하지 말 것",
    "- 자미두수 용어를 쓰되 일반인도 이해할 수 있게 풀어줄 것",
    "- 운세를 단정하지 말고 가능성과 전략 중심으로 설명할 것",
    "- 사용자가 실제 행동으로 옮길 수 있는 조언을 줄 것",
  ].join("\n");

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
  ].join("\n");

  return {
    prompt,
    questionType,
    digestSource,
  };
}
