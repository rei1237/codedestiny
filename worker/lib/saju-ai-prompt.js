import { buildFortuneQuestionPromptPackage } from "./fortune-question-prompt.js";

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

const SAJU_SPECIAL_ANGLES = Object.freeze([
  "일간의 강약과 재성/관성/식상 수용력",
  "월지 중심의 계절성 및 조후 균형",
  "격국 성립 여부와 일반격/특수격의 실전 의미",
  "용신/희신/기신이 질문 주제에 작동하는 방식",
  "십성 구조(재성·관성·식상·인성·비겁)의 역할 분담",
  "천간/지지의 흐름과 합·충·형·파·해의 변동성",
  "지장간의 잠재 자원과 표면 행동의 불일치",
  "대운·세운·월운의 타이밍에서 기회/리스크 분리",
  "신살/공망의 보조적 해석과 과대해석 방지",
  "종격 가능성(전왕격·종재격·종관격·종살격·종아격) 검토",
  "신강/신약 판정 불확실성 구간과 대안 시나리오",
  "반복되는 인생 패턴과 현재 시점의 전략 전환 포인트",
]);

const SAJU_MONEY_ANGLES = Object.freeze([
  "재성을 단순 보유가 아니라 실제 작동 구조(유통/회수/축적)로 해석",
  "식상생재 구조의 유무와 지속 가능한 매출화 경로",
  "관성과 재성의 연결로 사회적 성취가 현금흐름으로 이어지는지 점검",
  "비겁 과다 시 재탈/동업 리스크와 경쟁 소모 구조 분석",
  "인성 과다 시 실행력 저하/의사결정 지연 리스크 분석",
  "대운·세운에서 재성이 열리는 시기와 현금흐름 강화 시점 제시",
  "십성 구조와 용신 흐름 기반으로 적합 수익 모델 3~5개 추천",
  "직접사업형/콘텐츠지식형/상담교육형/기술자동화형/투자운용형/영업브랜딩형/전문직형/구독플랫폼형 적합도 비교",
  "피해야 할 돈 버는 방식(투자 습관·동업 구조·소비 패턴) 명시",
]);

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

function includesAny(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase()));
}

function buildSajuAnalysisAngles(questionType, question) {
  const angles = SAJU_SPECIAL_ANGLES.slice();

  if (questionType === "money" || includesAny(question, ["재물", "돈", "수익", "사업", "창업", "부자", "투자"])) {
    return angles.concat(SAJU_MONEY_ANGLES);
  }

  if (questionType === "career") {
    angles.push(
      "관성/식상/인성 배치로 조직형·전문직형·자영업형 커리어 적합도 비교",
      "이직/전환 시기에서 손실 최소화 전략",
      "직업 선택 시 피해야 할 업무 환경과 관계 패턴",
    );
  }

  if (questionType === "love" || questionType === "relationship") {
    angles.push(
      "일지/배우자성/관성·재성의 관계 패턴과 감정 반응 분석",
      "갈등 유발 트리거와 회복을 위한 소통 프로토콜 제안",
      "결혼/동거/장기관계에서 안정성과 리스크 분리",
    );
  }

  if (questionType === "health") {
    angles.push(
      "오행 편중과 생활 리듬 불균형의 신호 해석",
      "대운·세운 변화 시기별 컨디션 관리 포인트",
      "과로/수면/스트레스 관리 우선순위 제안",
    );
  }

  return angles;
}

function buildSajuFollowUps(questionType) {
  const common = [
    "현재 대운 10년 구간에서 가장 강한 기회 테마는 무엇인가요?",
    "실패 확률을 줄이기 위해 먼저 검증해야 할 선택지는 무엇인가요?",
    "지금부터 90일 동안 실행할 우선순위 3가지를 제안해주세요.",
  ];

  if (questionType === "money") {
    return common.concat([
      "제 사주에서 현금흐름을 가장 빨리 만드는 수익모델 3가지는 무엇인가요?",
      "동업/투자/레버리지 중 가장 위험한 선택은 무엇이며 이유는 무엇인가요?",
      "재물운이 열리는 시기에 맞춰 준비해야 할 역량은 무엇인가요?",
    ]);
  }

  if (questionType === "career") {
    return common.concat([
      "조직 내 성장과 독립형 커리어 중 어떤 축이 더 유리한가요?",
      "이직 타이밍을 판단할 핵심 신호 3가지를 알려주세요.",
    ]);
  }

  if (questionType === "love" || questionType === "relationship") {
    return common.concat([
      "관계에서 반복되는 갈등 패턴을 끊기 위한 행동 교정 포인트는 무엇인가요?",
      "장기적으로 안정적인 관계를 위해 피해야 할 선택은 무엇인가요?",
    ]);
  }

  return common;
}

export function buildSajuAIPrompt({ question, sajuResult, profile: profileOverride, compatibilityTarget, mode } = {}) {
  const normalizedQuestion = ensureValidQuestion(question);
  ensureSajuResultPresence(sajuResult);

  const questionType = classifySajuPromptQuestionType(normalizedQuestion);
  const questionTypeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;

  const normalizedProfile = normalizeBirthInfo(profileOverride || sajuResult.profile, sajuResult.snapshot);
  const pillars = normalizePillars(sajuResult.pillars);
  const weights = normalizeElementWeights(sajuResult, sajuResult.snapshot);
  const johu = sajuResult.johu && typeof sajuResult.johu === "object" ? sajuResult.johu : {};
  const power = sajuResult.power && typeof sajuResult.power === "object" ? sajuResult.power : {};
  const jong = sajuResult.jong && typeof sajuResult.jong === "object" ? sajuResult.jong : {};

  const domainDataLines = [
    `질문 유형: ${questionTypeLabel}`,
    `이름/성별: ${normalizedProfile.name} / ${normalizedProfile.gender}`,
    `생년월일/시간: ${normalizedProfile.birthDate} ${normalizedProfile.birthTime}`,
    `사주 원국: 연주 ${pillars.yearPillar}, 월주 ${pillars.monthPillar}, 일주 ${pillars.dayPillar}, 시주 ${pillars.hourPillar}`,
    `일간/일간오행: ${pillars.dayStem} / ${pillars.dayStemElement}`,
    `오행 분포: 목 ${weights.wood}, 화 ${weights.fire}, 토 ${weights.earth}, 금 ${weights.metal}, 수 ${weights.water}`,
    `우세 오행: ${weights.dominant}`,
    `조후: ${toText(johu.type)} (점수 ${toText(johu.score)})`,
    `신강/신약: ${typeof power.isStrong === "boolean" ? (power.isStrong ? "신강" : "신약") : DEFAULT_TEXT}`,
    `용신/기신 후보: ${toArrayText(power.yongshin)} / ${toArrayText(power.kijishin)}`,
    `종격 여부: ${jong.isJong ? `예 (${toText(jong.name, "종격")})` : "아니오"}`,
  ];

  const promptPackage = buildFortuneQuestionPromptPackage({
    fortuneType: "saju",
    fortuneLabel: "사주",
    expertLabel: "30년 경력의 명리학 전문가",
    userQuestion: normalizedQuestion,
    analysisResult: sajuResult,
    profile: normalizedProfile,
    compatibilityTarget,
    mode,
    questionTypeLabel,
    analysisAngles: buildSajuAnalysisAngles(questionType, normalizedQuestion),
    recommendedFollowUpQuestions: buildSajuFollowUps(questionType),
    caution: "사주는 확률적 경향 해석이며 법률/의료/투자 결정을 대체하지 않습니다.",
    domainDataLines,
    minPromptLength: 1800,
  });

  const digestSource = [
    normalizedQuestion,
    questionType,
    normalizedProfile.gender,
    normalizedProfile.birthDate,
    normalizedProfile.birthTime,
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