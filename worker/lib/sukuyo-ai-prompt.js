import { buildFortuneQuestionPromptPackage } from "./fortune-question-prompt.js";
import {
  classifyQuestionToSukuyoDomain,
  getSukuyoPromptTemplate,
} from "./sukuyo-ai-prompt-templates.mjs";
import {
  SUKUYO_ROLE_PROFILES,
  relationFromForwardDistance,
} from "./sukuyo-relation-core.js";

const DEFAULT_TEXT = "미상";

export const SUKUYO_AI_PROMPT_FEATURE_KEY = "sukuyo_ai_prompt_generator";
export const SUKUYO_AI_PROMPT_PRICE = 100;
export { classifyQuestionToSukuyoDomain, getSukuyoPromptTemplate };

const QUESTION_TYPE_RULES = Object.freeze({
  compatibility: ["궁합", "상대", "재회", "썸", "연애", "결혼", "인연", "관계"],
  love: ["연애", "썸", "결혼", "재회", "소개팅", "이별"],
  career: ["직업", "진로", "이직", "커리어", "사업", "직장", "승진"],
  money: ["돈", "재물", "수입", "투자", "저축", "매출"],
  relationship: ["인간관계", "가족", "친구", "동료", "갈등"],
  health: ["건강", "멘탈", "불안", "우울", "스트레스", "회복"],
  life_direction: ["인생", "방향", "미래", "운명", "선택", "전환"],
  personality: ["성격", "기질", "강점", "약점", "본성", "패턴"],
});

const QUESTION_TYPE_LABELS = Object.freeze({
  compatibility: "궁합/관계",
  love: "연애",
  career: "직업/진로",
  money: "재물",
  relationship: "인간관계",
  health: "건강/멘탈",
  life_direction: "인생 방향",
  personality: "성향/기질",
  general: "일반",
});

const SUKUYO_CORE_ANGLES = Object.freeze([
  "본명숙 기반 기질과 27숙 성향의 핵심 동인",
  "관계 유형에서 거리감·끌림 강도·정서 소모 구조",
  "업태/안괴/영친/우쇠/성위/명 관계의 장점과 위험성 동시 해석",
  "상처를 주고받는 반복 패턴과 회복 루틴",
  "장기 관계 안정성 조건과 현실적 조율 전략",
  "관계/커리어/재물 질문별 행동 우선순위 재설계",
]);

const SUKUYO_COMPATIBILITY_ANGLES = Object.freeze([
  "나/상대 본명숙의 상호작용을 분리해 해석하고 충돌 지점을 특정",
  "관계 유형과 거리감의 체감 강도 분석",
  "관계 역할의 비대칭성과 기대 충돌 구조 파악",
  "카르마 점수·인연 온도·자력(磁力)을 끌림/안정/긴장 축으로 재해석",
  "감정 패턴·갈등 패턴·회복 루틴을 연결 분석",
  "장기 가능성과 소통 난이도 기반 실행 전략 제시",
  "관계 외 주제 확장은 배제하고 궁합 질문 맥락에만 집중",
]);

function toText(value, fallback = DEFAULT_TEXT) {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function toSafeNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toOptionalText(value) {
  return String(value == null ? "" : value).trim();
}

function firstFiniteNumber(...values) {
  for (let i = 0; i < values.length; i += 1) {
    const n = Number(values[i]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function firstOptionalText(...values) {
  for (let i = 0; i < values.length; i += 1) {
    const text = toOptionalText(values[i]);
    if (text) return text;
  }
  return "";
}

function normalizeSukuyoDisplayIndex(mansionIdx, displayIndex) {
  const shown = toSafeNumber(displayIndex, null);
  if (shown !== null && shown >= 1 && shown <= 27) return shown;
  const idx = toSafeNumber(mansionIdx, null);
  if (idx === null) return null;
  if (idx >= 0 && idx <= 26) return idx + 1;
  if (idx >= 1 && idx <= 27) return idx;
  return idx;
}

function formatMetric(value, suffix = "") {
  const n = Number(value);
  if (Number.isFinite(n)) return `${Math.round(n)}${suffix}`;
  return DEFAULT_TEXT;
}

function formatScoreOrText(value) {
  const text = toOptionalText(value);
  const n = Number(text);
  if (Number.isFinite(n)) return `${Math.round(n)}/100`;
  return text || DEFAULT_TEXT;
}

function formatMansionLine(result) {
  const displayIndex = normalizeSukuyoDisplayIndex(result?.mansionIdx, result?.displayIndex);
  return displayIndex ? `${result.mansion} · ${displayIndex}/27` : result.mansion;
}

function ensureValidQuestion(question) {
  const normalized = String(question || "").trim();
  if (!normalized || normalized.length < 5 || normalized.length > 1000) {
    throw new Error("INVALID_QUESTION");
  }
  return normalized;
}

function classifyQuestionType(question) {
  const text = String(question || "").trim().toLowerCase();
  if (!text) return "general";

  const ordered = ["compatibility", "love", "career", "money", "relationship", "health", "life_direction", "personality"];
  for (let i = 0; i < ordered.length; i += 1) {
    const type = ordered[i];
    const keywords = QUESTION_TYPE_RULES[type] || [];
    if (keywords.some((keyword) => text.includes(String(keyword).toLowerCase()))) {
      return type;
    }
  }

  return "general";
}

function questionTypeFromDomain(domain) {
  switch (String(domain || "").trim()) {
    case "compatibility":
    case "reconciliation":
    case "breakup":
      return "compatibility";
    case "love":
      return "love";
    case "career":
      return "career";
    case "money":
      return "money";
    case "relationship":
      return "relationship";
    case "health":
      return "health";
    case "life_direction":
      return "life_direction";
    case "personality":
      return "personality";
    default:
      return "";
  }
}

function normalizeTraits(rawTraits) {
  const traits = rawTraits && typeof rawTraits === "object" ? rawTraits : {};
  return {
    core: toText(traits.core || traits.desc),
    hidden: toText(traits.hidden),
    love: toText(traits.love),
    work: toText(traits.work),
    wealth: toText(traits.wealth),
    karma: toText(traits.karma),
    mantra: toText(traits.mantra),
  };
}

function normalizeBasicResult(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("MISSING_BASIC_RESULT");
  }

  const mansion = toText(raw.mansion, "");
  const mansionIdx = toSafeNumber(raw.mansionIdx, null);
  if (!mansion || mansionIdx === null) {
    throw new Error("MISSING_BASIC_RESULT");
  }

  return {
    mansion,
    mansionIdx,
    displayIndex: normalizeSukuyoDisplayIndex(mansionIdx, raw.displayIndex),
    icon: toText(raw.icon),
    talent: toSafeNumber(raw.talent, null),
    traits: normalizeTraits(raw.traits),
    moonTone: toText(raw?.daily?.moon?.label || raw?.daily?.moonLabel),
    moonInsight: toText(raw?.daily?.insight),
    summaryTone: toText(raw?.summaryTone),
  };
}

// "안(安) · 안심과 편안함을 건네는 자리" 형태의 자리 라벨. 정본에 없는 자리면 null.
function sukuyoRoleLabel(role) {
  const profile = SUKUYO_ROLE_PROFILES[role];
  if (!profile) return null;
  return `${role}(${profile.han}) · ${profile.meaning}`;
}

// 별칭 체인이 '안' 같은 맨 자리 이름을 주면 정본 라벨로 넓힌다. 정본에 없는 문자열은
// 손대지 않고 그대로 돌려준다(구버전 클라가 넣던 자유 문구 보존).
function expandSukuyoRole(value) {
  const text = toOptionalText(value);
  if (!text) return "";
  return sukuyoRoleLabel(text) || text;
}

function normalizeCompatibilityResult(raw, basicResult) {
  if (!raw || typeof raw !== "object") return null;

  const myIdx = firstFiniteNumber(raw.myIdx, raw?.personA?.mansionIdx, raw?.my?.mansionIdx, raw?.my?.idx, raw?.my?.index);
  const partnerIdx = firstFiniteNumber(raw.partnerIdx, raw?.personB?.mansionIdx, raw?.partner?.mansionIdx, raw?.partner?.idx, raw?.partner?.index);
  if (myIdx === null || partnerIdx === null) return null;

  if (basicResult && toSafeNumber(basicResult.mansionIdx, null) !== null && myIdx !== basicResult.mansionIdx) {
    return null;
  }

  // 구버전 클라·캐시 payload 는 자리와 방향을 안 싣는다. 지수 두 개만 있으면 정본으로
  // 되살릴 수 있으므로, 별칭 체인이 전부 빈 경우의 마지막 폴백으로 여기서 파생한다.
  const forwardDistance = (partnerIdx - myIdx + 27) % 27;
  const reverseDistance = (myIdx - partnerIdx + 27) % 27;
  const derivedRelation = relationFromForwardDistance(forwardDistance);

  const partnerProfile = raw?.partner && typeof raw.partner === "object" ? raw.partner : (raw?.personB && typeof raw.personB === "object" ? raw.personB : {});
  const distanceMetrics = raw?.distanceMetrics && typeof raw.distanceMetrics === "object" ? raw.distanceMetrics : {};
  const roleActionGuide = raw?.roleActionGuide && typeof raw.roleActionGuide === "object" ? raw.roleActionGuide : {};
  const elementHarmony = raw?.elementHarmony && typeof raw.elementHarmony === "object" ? raw.elementHarmony : {};
  const strengthShadowMap = raw?.strengthShadowMap && typeof raw.strengthShadowMap === "object" ? raw.strengthShadowMap : {};
  const enhanced = raw?.enhanced && typeof raw.enhanced === "object" ? raw.enhanced : {};
  const enhancedChemistry = enhanced?.chemistry && typeof enhanced.chemistry === "object" ? enhanced.chemistry : {};
  const relationStory = raw?.relationStory && typeof raw.relationStory === "object" ? raw.relationStory : {};

  return {
    myIdx,
    partnerIdx,
    partnerDisplayIndex: normalizeSukuyoDisplayIndex(partnerIdx, raw.partnerDisplayIndex || partnerProfile?.displayIndex),
    partnerMansion: toText(raw.partnerMansion || partnerProfile?.mansion || partnerProfile?.nameKo || partnerProfile?.name),
    relationType: toText(raw.relationType || raw.relationTypeKo || enhanced.relationTypeKo),
    relationTypeHan: toOptionalText(raw.relationTypeHan),
    distanceLabel: toText(raw.distanceLabel || enhanced.distanceKo),
    shortestDistance: firstFiniteNumber(raw.shortestDistance, raw.distance, distanceMetrics.shortestDistance),
    myRole: firstOptionalText(
      expandSukuyoRole(firstOptionalText(raw.myRole, raw.aRole, roleActionGuide.myRole, roleActionGuide.aRole, roleActionGuide.roleA, raw?.ankaiRole?.me, enhanced.roleA)),
      sukuyoRoleLabel(derivedRelation?.aRole)
    ),
    partnerRole: firstOptionalText(
      expandSukuyoRole(firstOptionalText(raw.partnerRole, raw.bRole, roleActionGuide.partnerRole, roleActionGuide.bRole, roleActionGuide.roleB, raw?.ankaiRole?.other, enhanced.roleB)),
      sukuyoRoleLabel(derivedRelation?.bRole)
    ),
    directionFromAToB: firstOptionalText(raw.directionFromAToB, raw.forwardDirection, distanceMetrics.forwardDirection, `순행 +${forwardDistance}`),
    directionFromBToA: firstOptionalText(raw.directionFromBToA, raw.reverseDirection, distanceMetrics.reverseDirection, `역행 +${reverseDistance}`),
    temperature: toSafeNumber(raw.temperature, null),
    score: toSafeNumber(raw.score, null),
    magnetism: toSafeNumber(raw.magnetism, null),
    communicationScore: firstFiniteNumber(raw.communicationScore, raw.communicationChemistry, enhanced.communicationChemistry, enhancedChemistry.communication),
    stabilityScore: firstFiniteNumber(raw.stabilityScore, raw.dailyLifeChemistry, enhanced.dailyLifeChemistry, enhancedChemistry.dailyLife),
    growthScore: firstFiniteNumber(raw.growthScore, raw.recoveryPotential, enhanced.recoveryPotential, enhancedChemistry.recoveryPotential),
    conflictScore: firstFiniteNumber(raw.conflictScore, raw.conflictRisk, enhanced.conflictRisk, enhancedChemistry.conflictRisk),
    emotionalPattern: firstOptionalText(raw.emotionalPattern, raw.emotionalCompatibility, strengthShadowMap.emotionalPattern, strengthShadowMap.complementSummary, enhanced.tempBand),
    conflictPattern: firstOptionalText(raw.conflictPattern, roleActionGuide.warningLine, roleActionGuide.avoidLine, roleActionGuide.cautionLine, strengthShadowMap.shadowSummary, enhanced.difficulty),
    longTermPotential: firstOptionalText(raw.longTermPotential, enhanced.longTermPotential, enhancedChemistry.longTermPotential),
    summary: firstOptionalText(raw.summary, raw.relationSummary, raw.oneLine, relationStory.lead, strengthShadowMap.complementSummary, elementHarmony.summary, roleActionGuide.resetLine),
    stamp: toText(raw.stamp),
    partnerGender: toText(raw.partnerGender || partnerProfile?.gender),
    partnerName: toOptionalText(raw.partnerName || partnerProfile?.name),
    partnerCore: toOptionalText(raw?.partnerTraits?.core || partnerProfile?.traits?.core || partnerProfile?.core),
    partnerHidden: toOptionalText(raw?.partnerTraits?.hidden || partnerProfile?.traits?.hidden || partnerProfile?.hidden),
    partnerLove: toOptionalText(raw?.partnerTraits?.love || partnerProfile?.traits?.love || partnerProfile?.love),
    partnerMoonTone: toOptionalText(raw?.partnerTraits?.moonTone || partnerProfile?.moonTone || partnerProfile?.moonLabel),
    relationVariant: firstOptionalText(raw.relationVariant, enhanced.relationshipName),
    distanceResonance: firstOptionalText(distanceMetrics.resonanceCode, distanceMetrics.tensionBand),
    roleGuideText: firstOptionalText(roleActionGuide.resetLine, roleActionGuide.actionLine, roleActionGuide.summary, roleActionGuide.advice),
    elementHarmonyText: firstOptionalText(elementHarmony.summary, elementHarmony.harmony, elementHarmony.advice),
    strengthShadowText: firstOptionalText(strengthShadowMap.complementSummary, strengthShadowMap.strengthSummary, strengthShadowMap.shadowSummary),
  };
}

function buildSukuyoAngles(questionType, compatibilityUsed) {
  if (questionType === "compatibility") {
    return SUKUYO_COMPATIBILITY_ANGLES.slice();
  }

  if (questionType === "love") {
    const loveAngles = SUKUYO_COMPATIBILITY_ANGLES.slice();
    if (!compatibilityUsed) {
      loveAngles.push("상대 데이터가 없는 경우 개인 연애 패턴까지만 해석하고 궁합 단정은 보류");
    }
    return loveAngles;
  }

  const angles = SUKUYO_CORE_ANGLES.slice();

  if (questionType === "money") {
    angles.push(
      "숙요 기질 기반 수익 습관과 소비 리스크 패턴",
      "관계형 협업과 단독 실행 중 손익 효율 비교",
    );
  }

  if (questionType === "career") {
    angles.push(
      "숙 성향에 맞는 일 리듬(집중/휴식/협업) 설계",
      "대인 스트레스가 성과에 미치는 영향과 완충 전략",
    );
  }

  return angles;
}

function buildSukuyoFollowUps(questionType) {
  const common = [
    "제가 반복하는 감정 반응 패턴을 끊으려면 무엇부터 바꿔야 하나요?",
    "다음 4주 동안 실천할 관계/일상 루틴 3가지를 제안해주세요.",
    "지금 피해야 할 선택과 그 이유를 명확히 알려주세요.",
  ];

  if (questionType === "compatibility" || questionType === "love") {
    return [
      "관계 유형과 거리 기준으로 지금 가장 위험한 갈등 트리거 2개를 알려주세요.",
      "나/상대 각각 어떤 말투를 쓰면 갈등이 완화되는지 예문으로 제시해주세요.",
      "2주~6주 실행 가능한 관계 회복 루틴을 일정표 형태로 만들어주세요.",
      "상대와의 갈등 시 사용할 대화 문장 3개를 제안해주세요.",
      "관계 유지에 유리한 거리감 조절 방법을 알려주세요.",
    ];
  }

  return common;
}

function buildSukuyoPromptCaution(questionType, compatibilityUsed) {
  if (questionType === "compatibility" || questionType === "love") {
    if (compatibilityUsed) {
      return "궁합 질문에서는 관계 역학 해석에만 집중하고, 커리어/재물/건강 단독 운세로 주제를 확장하지 마세요.";
    }
    return "상대 궁합 데이터가 없으므로 개인 연애 패턴 범위까지만 답하고 궁합 단정은 피하세요.";
  }
  return "숙요 해석은 관계의 경향성을 보여주며, 상대 의사와 현실 환경을 함께 고려해야 합니다.";
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

function fillPatternVariables(text, ctx) {
  const source = String(text || "");
  return source
    .replace(/\{myMansion\}/g, String(ctx?.myMansion || DEFAULT_TEXT))
    .replace(/\{partnerMansion\}/g, String(ctx?.partnerMansion || DEFAULT_TEXT))
    .replace(/\{relationType\}/g, String(ctx?.relationType || DEFAULT_TEXT));
}

function buildPromptBody({ question, questionType, basicResult, compatibilityResult, compatibilityHint }) {
  const typeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;

  const lines = [
    "# 숙요점 상담 프롬프트",
    "",
    "너는 숙요점(27숙)과 관계 심리 해석을 함께 다루는 전문 상담가다.",
    "아래 데이터는 이미 계산된 결과이며, 계산 자체를 다시 시도하지 말고 해석에만 집중해라.",
    "과장/공포 조장 없이 현실적이고 실행 가능한 조언을 제공해라.",
    "",
    "## 1) 사용자 질문",
    question,
    `- 질문 유형: ${typeLabel}`,
    "",
    "## 2) 기본 숙요점 결과 (필수 데이터)",
    `- 본인 숙: ${basicResult.mansion}`,
    `- 숙 인덱스: ${basicResult.mansionIdx}`,
    `- 상징 아이콘: ${basicResult.icon}`,
    `- 재능 지수: ${basicResult.talent != null ? basicResult.talent : DEFAULT_TEXT}`,
    `- 핵심 성향: ${basicResult.traits.core}`,
    `- 내면/그림자 패턴: ${basicResult.traits.hidden}`,
    `- 연애 리듬: ${basicResult.traits.love}`,
    `- 일/커리어 리듬: ${basicResult.traits.work}`,
    `- 재물 리듬: ${basicResult.traits.wealth}`,
    `- 카르마 키워드: ${basicResult.traits.karma}`,
    `- 수호 문장: ${basicResult.traits.mantra}`,
    `- 달빛 톤: ${basicResult.moonTone}`,
    `- 오늘 인사이트: ${basicResult.moonInsight}`,
    "",
    "## 3) 궁합 데이터 (있으면 심화 반영)",
  ];

  if (compatibilityResult) {
    lines.push(
      "- 궁합 데이터 상태: 제공됨",
      `- 상대 숙: ${compatibilityResult.partnerMansion}`,
      `- 관계 유형: ${compatibilityResult.relationType}`,
      `- 관계 거리: ${compatibilityResult.distanceLabel}`,
      `- 카르마 점수: ${compatibilityResult.score != null ? compatibilityResult.score : DEFAULT_TEXT}`,
      `- 인연 온도: ${compatibilityResult.temperature != null ? compatibilityResult.temperature : DEFAULT_TEXT}`,
      `- 자력(磁力): ${compatibilityResult.magnetism != null ? compatibilityResult.magnetism : DEFAULT_TEXT}`,
      `- 관계 낙인: ${compatibilityResult.stamp}`,
      `- 상대 성별 정보: ${compatibilityResult.partnerGender}`,
    );
  } else {
    lines.push(
      "- 궁합 데이터 상태: 없음",
      `- 안내: ${compatibilityHint}`,
    );
  }

  lines.push(
    "",
    "## 4) 해석 가이드",
    "1. 질문의 핵심 의도를 먼저 한 문장으로 재정의한다.",
    "2. 기본 숙요 결과를 근거로 현재 패턴(강점/리스크)을 구체적으로 해석한다.",
    "3. 궁합 데이터가 있으면 관계 역학과 상호작용을 심화 분석한다.",
    "4. 궁합 데이터가 없으면 1인 리듬 중심으로 답하고, 필요한 추가 정보(상대 생년월일 등)를 제안한다.",
    "5. 막연한 운세 문장이 아니라 실제 행동 가능한 전략을 제시한다.",
    "",
    "## 5) 출력 형식 (Markdown)",
    "1. 타고난 성향 총론 (본명숙으로 보는 기본 기질을 먼저 전반적으로 짚어 신뢰를 세운다. 궁합이면 두 사람 각자의 성향)",
    "2. 질문 요약",
    "3. 핵심 해석 (근거 포함)",
    "4. 이번 달 실행 전략 3가지",
    "5. 피해야 할 패턴 2가지",
    "6. 한 줄 결론",
  );

  return lines.join("\n");
}

function buildSukuyoExpertPrompt({
  question,
  questionType,
  domainLabel,
  basicResult,
  compatibilityResult,
  compatibilityHint,
  analysisAngles,
  recommendedFollowUpQuestions,
  caution,
}) {
  const typeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;
  const lines = [
    "당신은 숙요점 27숙과 관계 심리의 결을 함께 읽는 전문 상담가입니다.",
    "아래의 본명숙과 궁합 흐름은 이미 계산된 결과이므로 다시 계산하지 말고, 해석과 조율에 집중해 주세요.",
    "",
    "[사용자 질문]",
    question,
    "",
    "[상담 초점]",
    `- 주제: ${domainLabel}`,
    `- 질문 결: ${typeLabel}`,
    "",
    "[본명숙 자료]",
    `- 본인 본명숙: ${formatMansionLine(basicResult)}`,
    `- 핵심 성향: ${basicResult.traits.core}`,
    `- 그림자 패턴: ${basicResult.traits.hidden}`,
    `- 연애 리듬: ${basicResult.traits.love}`,
    `- 일의 리듬: ${basicResult.traits.work}`,
    `- 재물 리듬: ${basicResult.traits.wealth}`,
    `- 카르마 키워드: ${basicResult.traits.karma}`,
    `- 오늘의 달빛: ${basicResult.moonTone}`,
    `- 오늘의 신호: ${basicResult.moonInsight}`,
    "",
    "[궁합 자료]",
  ];

  if (compatibilityResult) {
    const partnerDisplayIndex = normalizeSukuyoDisplayIndex(compatibilityResult.partnerIdx, compatibilityResult.partnerDisplayIndex);
    lines.push(
      `- 상대 본명숙: ${compatibilityResult.partnerMansion}${partnerDisplayIndex ? ` · ${partnerDisplayIndex}/27` : ""}`,
      `- 관계 유형: ${compatibilityResult.relationType}${compatibilityResult.relationTypeHan ? `(${compatibilityResult.relationTypeHan})` : ""}`,
      `- 관계 거리: ${compatibilityResult.distanceLabel}${compatibilityResult.shortestDistance != null ? ` · 최단 거리 ${compatibilityResult.shortestDistance}` : ""}`,
      `- 역할 흐름: 본인 ${compatibilityResult.myRole || DEFAULT_TEXT} / 상대 ${compatibilityResult.partnerRole || DEFAULT_TEXT}`,
      `- 방향 흐름: 본인에서 상대 ${compatibilityResult.directionFromAToB || DEFAULT_TEXT} / 상대에서 본인 ${compatibilityResult.directionFromBToA || DEFAULT_TEXT}`,
      `- 관계 지표: 카르마 ${formatMetric(compatibilityResult.score, "/100")}, 온도 ${formatMetric(compatibilityResult.temperature, "/100")}, 끌림 ${formatMetric(compatibilityResult.magnetism, "/100")}`,
      `- 조율 지표: 소통 ${formatMetric(compatibilityResult.communicationScore, "/100")}, 안정 ${formatMetric(compatibilityResult.stabilityScore, "/100")}, 회복 ${formatMetric(compatibilityResult.growthScore, "/100")}, 갈등 ${formatMetric(compatibilityResult.conflictScore, "/100")}`,
      `- 감정 흐름: ${compatibilityResult.emotionalPattern || DEFAULT_TEXT}`,
      `- 갈등 흐름: ${compatibilityResult.conflictPattern || DEFAULT_TEXT}`,
      `- 장기 흐름: ${formatScoreOrText(compatibilityResult.longTermPotential)}`,
      `- 관계 한 줄: ${compatibilityResult.summary || DEFAULT_TEXT}`,
      `- 역할 조율문: ${compatibilityResult.roleGuideText || DEFAULT_TEXT}`,
      `- 오행/상성 보조: ${compatibilityResult.elementHarmonyText || DEFAULT_TEXT}`,
      `- 강점과 그림자: ${compatibilityResult.strengthShadowText || DEFAULT_TEXT}`,
    );
  } else {
    lines.push(`- ${compatibilityHint}`);
  }

  lines.push(
    "",
    "[정밀 해석 축]",
    ...(Array.isArray(analysisAngles) && analysisAngles.length
      ? analysisAngles.map((angle) => `- ${angle}`)
      : ["- 본명숙의 기질, 그림자, 관계 리듬을 질문과 직접 연결해 주세요."]),
    "",
    "[답변 원칙]",
    "1. 첫 문장에서 질문의 진짜 초점을 한 문장으로 정리해 주세요.",
    "2. 본명숙의 강점과 그림자를 분리해 읽고, 질문과 직접 연결해 주세요.",
    "3. 궁합 자료가 있을 때는 관계 유형, 거리, 역할 흐름을 먼저 해석해 주세요.",
    "4. 불안이나 공포를 키우지 말고, 가능성과 위험을 균형 있게 말해 주세요.",
    "5. 마지막에는 오늘 바로 실행할 수 있는 말, 행동, 거리 조절 기준을 제시해 주세요.",
    "",
    "[답변 구성]",
    "1. 타고난 성향 총론 (본명숙으로 보는 기본 기질을 먼저 전반적으로 짚어 신뢰를 세운다. 궁합이면 두 사람 각자의 성향)",
    "2. 질문의 핵심",
    "3. 숙요 근거 해석",
    "4. 관계 또는 현실 상황의 강점",
    "5. 반복되는 위험 패턴",
    "6. 2주 실행 조율법",
    "7. 한 줄 결론",
  );

  if (Array.isArray(recommendedFollowUpQuestions) && recommendedFollowUpQuestions.length) {
    lines.push(
      "",
      "[후속 질문 제안]",
      ...recommendedFollowUpQuestions.map((followUp) => `- ${followUp}`),
    );
  }

  if (toOptionalText(caution)) {
    lines.push("", `[주의] ${toOptionalText(caution)}`);
  }

  return lines.join("\n");
}

export function buildSukuyoAIPromptWithDomain({ question, basicResult, compatibilityResult, domain }) {
  const normalizedQuestion = ensureValidQuestion(question);
  const resolvedDomain = String(domain || "").trim() || classifyQuestionToSukuyoDomain(normalizedQuestion);
  const normalizedType = questionTypeFromDomain(resolvedDomain) || classifyQuestionType(normalizedQuestion);
  const domainTemplate = getSukuyoPromptTemplate(resolvedDomain);
  if (!domainTemplate) {
    throw new Error("UNKNOWN_SUKUYO_DOMAIN");
  }
  const normalizedBasic = normalizeBasicResult(basicResult);
  const normalizedCompat = normalizeCompatibilityResult(compatibilityResult, normalizedBasic);
  const compatibilityFocus = domainTemplate.requiresCompatibility
    || normalizedType === "compatibility"
    || normalizedType === "love";

  if ((normalizedType === "compatibility" || domainTemplate.requiresCompatibility) && !normalizedCompat) {
    throw new Error("MISSING_COMPATIBILITY_RESULT");
  }

  const compatibilityHint = normalizedCompat
    ? "궁합 데이터가 제공되어 관계 상호작용까지 반영합니다."
    : "상대 데이터가 없어 본인 숙요 리듬 중심으로 답합니다. 궁합 질문이면 상대 생년월일/시간을 추가하면 정확도가 높아집니다.";

  const domainDataLines = compatibilityFocus
    ? [
      `요청 도메인: ${domainTemplate.domainKo} (${resolvedDomain})`,
      `질문 유형: ${QUESTION_TYPE_LABELS[normalizedType] || QUESTION_TYPE_LABELS.general}`,
      `상황별 가중 키워드:\n${buildKeywordWeightLines(domainTemplate.keywordWeights).join("\n")}`,
      `나의 숙요 데이터: ${normalizedBasic.mansion} (${normalizedBasic.mansionIdx}), 핵심성향=${normalizedBasic.traits.core}, 그림자=${normalizedBasic.traits.hidden}, 연애리듬=${normalizedBasic.traits.love}, 달빛톤=${normalizedBasic.moonTone}`,
      normalizedCompat
        ? `상대 숙요 데이터: ${normalizedCompat.partnerMansion} (${normalizedCompat.partnerIdx}), 이름=${normalizedCompat.partnerName || DEFAULT_TEXT}, 성별=${normalizedCompat.partnerGender}`
        : `상대 숙요 데이터: 없음 (${compatibilityHint})`,
      normalizedCompat
        ? `관계 핵심: 유형=${normalizedCompat.relationType}${normalizedCompat.relationTypeHan ? `(${normalizedCompat.relationTypeHan})` : ""}, 거리=${normalizedCompat.distanceLabel}, 최단거리=${normalizedCompat.shortestDistance != null ? normalizedCompat.shortestDistance : DEFAULT_TEXT}`
        : "관계 핵심: 궁합 데이터 없음",
      normalizedCompat
        ? `역할/방향: 나역할=${normalizedCompat.myRole || DEFAULT_TEXT}, 상대역할=${normalizedCompat.partnerRole || DEFAULT_TEXT}, A→B=${normalizedCompat.directionFromAToB || DEFAULT_TEXT}, B→A=${normalizedCompat.directionFromBToA || DEFAULT_TEXT}`
        : "역할/방향: 궁합 데이터 없음",
      normalizedCompat
        ? `관계 점수 축: 카르마=${normalizedCompat.score != null ? normalizedCompat.score : DEFAULT_TEXT}, 온도=${normalizedCompat.temperature != null ? normalizedCompat.temperature : DEFAULT_TEXT}, 자력=${normalizedCompat.magnetism != null ? normalizedCompat.magnetism : DEFAULT_TEXT}, 소통=${normalizedCompat.communicationScore != null ? normalizedCompat.communicationScore : DEFAULT_TEXT}, 안정=${normalizedCompat.stabilityScore != null ? normalizedCompat.stabilityScore : DEFAULT_TEXT}, 성장=${normalizedCompat.growthScore != null ? normalizedCompat.growthScore : DEFAULT_TEXT}, 갈등=${normalizedCompat.conflictScore != null ? normalizedCompat.conflictScore : DEFAULT_TEXT}`
        : "관계 점수 축: 궁합 데이터 없음",
      normalizedCompat
        ? `관계 패턴: 감정=${normalizedCompat.emotionalPattern || DEFAULT_TEXT}, 갈등=${normalizedCompat.conflictPattern || DEFAULT_TEXT}, 장기=${normalizedCompat.longTermPotential || DEFAULT_TEXT}, 요약=${normalizedCompat.summary || DEFAULT_TEXT}`
        : "관계 패턴: 궁합 데이터 없음",
      normalizedCompat && (normalizedCompat.partnerCore || normalizedCompat.partnerHidden || normalizedCompat.partnerLove || normalizedCompat.partnerMoonTone)
        ? `상대 성향 보조: core=${normalizedCompat.partnerCore || DEFAULT_TEXT}, hidden=${normalizedCompat.partnerHidden || DEFAULT_TEXT}, love=${normalizedCompat.partnerLove || DEFAULT_TEXT}, moonTone=${normalizedCompat.partnerMoonTone || DEFAULT_TEXT}`
        : "상대 성향 보조: 제공되지 않음",
      `상황별 후속 질문 템플릿: ${(domainTemplate.questionPatterns || []).map((p) => fillPatternVariables(p, {
        myMansion: normalizedBasic.mansion,
        partnerMansion: normalizedCompat?.partnerMansion,
        relationType: normalizedCompat?.relationType,
      })).join(" | ")}`,
    ]
    : [
      `요청 도메인: ${domainTemplate.domainKo} (${resolvedDomain})`,
      `질문 유형: ${QUESTION_TYPE_LABELS[normalizedType] || QUESTION_TYPE_LABELS.general}`,
      `상황별 가중 키워드:\n${buildKeywordWeightLines(domainTemplate.keywordWeights).join("\n")}`,
      `본명숙: ${normalizedBasic.mansion} (${normalizedBasic.mansionIdx})`,
      `핵심 성향: ${normalizedBasic.traits.core}`,
      `연애/일/재물 리듬: ${normalizedBasic.traits.love} / ${normalizedBasic.traits.work} / ${normalizedBasic.traits.wealth}`,
      `달빛 톤/오늘 인사이트: ${normalizedBasic.moonTone} / ${normalizedBasic.moonInsight}`,
      normalizedCompat
        ? `궁합: ${normalizedCompat.partnerMansion}, 관계유형 ${normalizedCompat.relationType}, 점수 ${normalizedCompat.score != null ? normalizedCompat.score : DEFAULT_TEXT}`
        : `궁합 데이터 없음: ${compatibilityHint}`,
      `상황별 후속 질문 템플릿: ${(domainTemplate.questionPatterns || []).join(" | ")}`,
    ];

  const analysisAngles = [
    ...buildSukuyoAngles(normalizedType, Boolean(normalizedCompat)),
    ...(Array.isArray(domainTemplate.analysisAngles) ? domainTemplate.analysisAngles : []),
  ];
  const recommendedFollowUpQuestions = [
    ...buildSukuyoFollowUps(normalizedType),
    ...((domainTemplate.questionPatterns || []).map((p) => fillPatternVariables(p, {
      myMansion: normalizedBasic.mansion,
      partnerMansion: normalizedCompat?.partnerMansion,
      relationType: normalizedCompat?.relationType,
    }))),
  ];
  const caution = buildSukuyoPromptCaution(normalizedType, Boolean(normalizedCompat));
  const expertPrompt = buildSukuyoExpertPrompt({
    question: normalizedQuestion,
    questionType: normalizedType,
    domainLabel: domainTemplate.domainKo,
    basicResult: normalizedBasic,
    compatibilityResult: normalizedCompat,
    compatibilityHint,
    analysisAngles,
    recommendedFollowUpQuestions,
    caution,
  });

  const promptPackage = buildFortuneQuestionPromptPackage({
    fortuneType: "sukyo",
    fortuneLabel: "숙요점",
    expertLabel: "숙요점(27숙) 관계 해석 전문가",
    userQuestion: normalizedQuestion,
    analysisResult: {
      basicResult,
      compatibilityResult,
    },
    profile: {
      mansion: normalizedBasic.mansion,
      mansionIdx: normalizedBasic.mansionIdx,
      icon: normalizedBasic.icon,
      talent: normalizedBasic.talent,
    },
    compatibilityTarget: normalizedCompat
      ? {
        partnerMansion: normalizedCompat.partnerMansion,
        relationType: normalizedCompat.relationType,
        score: normalizedCompat.score,
      }
      : undefined,
    mode: normalizedType === "compatibility"
      ? "compatibility"
      : (normalizedType === "love" && normalizedCompat ? "compatibility" : (normalizedType === "love" ? "love" : "personal")),
    questionTypeLabel: QUESTION_TYPE_LABELS[normalizedType] || QUESTION_TYPE_LABELS.general,
    analysisAngles,
    recommendedFollowUpQuestions,
    caution,
    domainDataLines,
    customPrompt: expertPrompt,
    minPromptLength: 1600,
  });

  const digestSource = [
    normalizedQuestion,
    normalizedType,
    resolvedDomain,
    normalizedBasic.mansion,
    String(normalizedBasic.mansionIdx),
    normalizedBasic.traits.core,
    normalizedBasic.traits.love,
    normalizedBasic.traits.work,
    normalizedBasic.traits.wealth,
    normalizedBasic.moonTone,
    normalizedCompat ? normalizedCompat.partnerMansion : "no-compat",
    normalizedCompat ? normalizedCompat.relationType : "no-compat",
    normalizedCompat ? String(normalizedCompat.score ?? "") : "",
    normalizedCompat ? String(normalizedCompat.temperature ?? "") : "",
    normalizedCompat ? String(normalizedCompat.magnetism ?? "") : "",
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
    questionType: normalizedType,
    domain: resolvedDomain,
    domainLabel: domainTemplate.domainKo,
    keywordWeights: domainTemplate.keywordWeights,
    digestSource,
    compatibilityUsed: Boolean(normalizedCompat),
    compatibilityHint,
  };
}

export function buildSukuyoAIPrompt({ question, basicResult, compatibilityResult }) {
  return buildSukuyoAIPromptWithDomain({
    question,
    basicResult,
    compatibilityResult,
  });
}
