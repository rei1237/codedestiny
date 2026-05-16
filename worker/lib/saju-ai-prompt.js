const DEFAULT_TEXT = "제공되지 않음";

export const SAJU_AI_PROMPT_FEATURE_KEY = "saju_ai_prompt_generator";
export const SAJU_AI_PROMPT_PRICE = 100;

const QUESTION_TYPE_RULES = Object.freeze({
  love: ["연애", "결혼", "재회", "상대", "배우자", "인연", "썸"],
  career: ["직업", "진로", "회사", "이직", "사업", "창업", "커리어"],
  money: ["돈", "재물", "수익", "매출", "투자", "부자"],
  relationship: ["인간관계", "친구", "가족", "동료", "고객", "갈등"],
  health: ["건강", "몸", "멘탈", "불안", "스트레스", "질병"],
  life_direction: ["인생", "방향", "미래", "운명", "목표", "성공"],
});

const QUESTION_TYPE_LABELS = Object.freeze({
  love: "연애/결혼",
  career: "직업/진로",
  money: "돈/재물",
  relationship: "인간관계",
  health: "건강/멘탈",
  life_direction: "인생 방향",
  general: "일반",
});

function toText(value, fallback = DEFAULT_TEXT) {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function toArrayText(values, fallback = DEFAULT_TEXT) {
  if (!Array.isArray(values)) return fallback;
  const normalized = values
    .map((item) => String(item == null ? "" : item).trim())
    .filter(Boolean);
  return normalized.length ? normalized.join(", ") : fallback;
}

function toGenderLabel(gender) {
  const v = String(gender || "").trim().toUpperCase();
  if (v === "M") return "남성";
  if (v === "F") return "여성";
  return DEFAULT_TEXT;
}

function normalizeBirthInfo(profile, snapshot) {
  const p = profile && typeof profile === "object" ? profile : {};
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const pb = p.birth && typeof p.birth === "object" ? p.birth : {};
  const sb = s.birth && typeof s.birth === "object" ? s.birth : {};
  const birth = {
    year: Number(pb.year || sb.year || 0) || null,
    month: Number(pb.month || sb.month || 0) || null,
    day: Number(pb.day || sb.day || 0) || null,
    hour: Number(pb.hour || sb.hour || 0) || null,
    minute: Number(pb.minute || sb.minute || 0) || null,
    calType: String(pb.calType || "solar").trim() || "solar",
  };

  const location = p.location && typeof p.location === "object" ? p.location : {};
  return {
    name: toText(p.name, "사용자"),
    gender: toGenderLabel(p.gender || s.gender),
    birthDate: (birth.year && birth.month && birth.day)
      ? `${String(birth.year).padStart(4, "0")}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}`
      : DEFAULT_TEXT,
    birthTime: Number.isFinite(birth.hour) && Number.isFinite(birth.minute)
      ? `${String(Math.trunc(birth.hour)).padStart(2, "0")}:${String(Math.trunc(birth.minute)).padStart(2, "0")}`
      : DEFAULT_TEXT,
    calendarType: birth.calType === "lunar" || birth.calType === "lunar_leap" ? "음력" : "양력",
    birthPlace: toText(location.label, DEFAULT_TEXT),
    timezone: toText(location.tz, DEFAULT_TEXT),
  };
}

function normalizePillars(pillars) {
  const p = pillars && typeof pillars === "object" ? pillars : {};
  const y = p.y && typeof p.y === "object" ? p.y : {};
  const m = p.m && typeof p.m === "object" ? p.m : {};
  const d = p.d && typeof p.d === "object" ? p.d : {};
  const h = p.h && typeof p.h === "object" ? p.h : {};

  const yearPillar = `${toText(y.g, "-")}${toText(y.j, "-")}`;
  const monthPillar = `${toText(m.g, "-")}${toText(m.j, "-")}`;
  const dayPillar = `${toText(d.g, "-")}${toText(d.j, "-")}`;
  const hourPillar = `${toText(h.g, "-")}${toText(h.j, "-")}`;

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayStem: toText(d.g, DEFAULT_TEXT),
    dayStemElement: toText(d.gE, DEFAULT_TEXT),
  };
}

function normalizeElementWeights(sajuResult, snapshot) {
  const result = sajuResult && typeof sajuResult === "object" ? sajuResult : {};
  const natal = result.natal && typeof result.natal === "object" ? result.natal : {};
  const counts = natal.counts && typeof natal.counts === "object" ? natal.counts : {};
  const fromSnapshot = snapshot && snapshot.elementWeights && typeof snapshot.elementWeights === "object"
    ? snapshot.elementWeights
    : {};

  const wood = Number(counts.wood || fromSnapshot.wood || 0) || 0;
  const fire = Number(counts.fire || fromSnapshot.fire || 0) || 0;
  const earth = Number(counts.earth || fromSnapshot.earth || 0) || 0;
  const metal = Number(counts.metal || fromSnapshot.metal || 0) || 0;
  const water = Number(counts.water || fromSnapshot.water || 0) || 0;
  const dominant = toText(natal.dominant || snapshot?.analysis?.dayStemElement, DEFAULT_TEXT);

  return {
    wood,
    fire,
    earth,
    metal,
    water,
    dominant,
  };
}

function ensureValidQuestion(question) {
  const normalized = String(question || "").trim();
  if (!normalized || normalized.length < 5 || normalized.length > 1000) {
    throw new Error("INVALID_QUESTION");
  }
  return normalized;
}

function ensureSajuResultPresence(sajuResult) {
  if (!sajuResult || typeof sajuResult !== "object") {
    throw new Error("MISSING_SAJU_RESULT");
  }
  const pillars = sajuResult.pillars;
  if (!pillars || typeof pillars !== "object" || !pillars.d) {
    throw new Error("MISSING_SAJU_RESULT");
  }
}

export function classifySajuPromptQuestionType(question) {
  const text = String(question || "").trim().toLowerCase();
  if (!text) return "general";

  const ordered = ["career", "money", "love", "relationship", "health", "life_direction"];
  for (let i = 0; i < ordered.length; i += 1) {
    const type = ordered[i];
    const keywords = QUESTION_TYPE_RULES[type] || [];
    if (keywords.some((keyword) => text.includes(String(keyword).toLowerCase()))) {
      return type;
    }
  }
  return "general";
}

export function buildSajuAIPrompt({ question, sajuResult }) {
  const normalizedQuestion = ensureValidQuestion(question);
  ensureSajuResultPresence(sajuResult);

  const questionType = classifySajuPromptQuestionType(normalizedQuestion);
  const questionTypeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;

  const profile = normalizeBirthInfo(sajuResult.profile, sajuResult.snapshot);
  const pillars = normalizePillars(sajuResult.pillars);
  const weights = normalizeElementWeights(sajuResult, sajuResult.snapshot);
  const johu = sajuResult.johu && typeof sajuResult.johu === "object" ? sajuResult.johu : {};
  const power = sajuResult.power && typeof sajuResult.power === "object" ? sajuResult.power : {};
  const jong = sajuResult.jong && typeof sajuResult.jong === "object" ? sajuResult.jong : {};

  const prompt = [
    "# 사주팔자 기반 AI 상담 프롬프트",
    "",
    "너는 실전 명리 상담 경험이 풍부한 전문가다.",
    "아래 사주 분석 결과를 근거로 사용자의 질문에 현실적인 전략 중심 답변을 작성해라.",
    "데이터에 없는 내용은 단정하지 말고 가능성/조건부로 설명해라.",
    "",
    "## 1. 사용자 질문",
    normalizedQuestion,
    "",
    "## 2. 질문 유형",
    `- 분류: ${questionTypeLabel}`,
    "",
    "## 3. 기본 정보",
    `- 이름: ${profile.name}`,
    `- 성별: ${profile.gender}`,
    `- 달력 기준: ${profile.calendarType}`,
    `- 생년월일: ${profile.birthDate}`,
    `- 출생 시간: ${profile.birthTime}`,
    `- 출생지: ${profile.birthPlace}`,
    `- 시간대: ${profile.timezone}`,
    "",
    "## 4. 사주 원국(사주팔자)",
    `- 연주: ${pillars.yearPillar}`,
    `- 월주: ${pillars.monthPillar}`,
    `- 일주: ${pillars.dayPillar}`,
    `- 시주: ${pillars.hourPillar}`,
    `- 일간: ${pillars.dayStem}`,
    `- 일간 오행: ${pillars.dayStemElement}`,
    "",
    "## 5. 오행 분포 및 핵심 상태",
    `- 목: ${weights.wood}`,
    `- 화: ${weights.fire}`,
    `- 토: ${weights.earth}`,
    `- 금: ${weights.metal}`,
    `- 수: ${weights.water}`,
    `- 우세 오행: ${weights.dominant}`,
    `- 조후 타입: ${toText(johu.type)}`,
    `- 조후 점수: ${toText(johu.score)}`,
    `- 신강/신약: ${typeof power.isStrong === "boolean" ? (power.isStrong ? "신강" : "신약") : DEFAULT_TEXT}`,
    `- 용신 후보: ${toArrayText(power.yongshin)}`,
    `- 기신 후보: ${toArrayText(power.kijishin)}`,
    `- 종격 여부: ${jong.isJong ? `예 (${toText(jong.name, "종격")})` : "아니오"}`,
    "",
    "## 6. 답변 작성 지시",
    "아래 순서를 반드시 지켜 작성하라.",
    "1) 질문과 원국 연결 해석",
    "2) 현재 강점 3가지",
    "3) 리스크/주의점 3가지",
    "4) 지금 당장 실행할 액션 3가지",
    "5) 이번 달 체크포인트 3가지",
    "6) 한 줄 결론",
    "",
    "## 7. 답변 톤",
    "- 과장/공포 조장 없이 현실적인 조언",
    "- 명리 용어를 쓰더라도 일반인이 이해 가능하게 설명",
    "- 확정 예언이 아닌 선택 가능한 전략 중심",
    "- 즉시 행동 가능한 문장으로 마무리",
  ].join("\n");

  const digestSource = [
    normalizedQuestion,
    questionType,
    profile.gender,
    profile.birthDate,
    profile.birthTime,
    pillars.yearPillar,
    pillars.monthPillar,
    pillars.dayPillar,
    pillars.hourPillar,
    pillars.dayStem,
    pillars.dayStemElement,
    String(weights.wood),
    String(weights.fire),
    String(weights.earth),
    String(weights.metal),
    String(weights.water),
    weights.dominant,
    toText(johu.type),
    toText(johu.score),
    typeof power.isStrong === "boolean" ? (power.isStrong ? "strong" : "weak") : "unknown",
    toArrayText(power.yongshin, ""),
    toArrayText(power.kijishin, ""),
    jong.isJong ? "jong" : "normal",
    toText(jong.name, ""),
  ].join("\n");

  return {
    prompt,
    questionType,
    digestSource,
  };
}