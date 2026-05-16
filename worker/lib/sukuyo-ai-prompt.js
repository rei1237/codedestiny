const DEFAULT_TEXT = "미상";

export const SUKUYO_AI_PROMPT_FEATURE_KEY = "sukuyo_ai_prompt_generator";
export const SUKUYO_AI_PROMPT_PRICE = 100;

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

function toText(value, fallback = DEFAULT_TEXT) {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function toSafeNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
    icon: toText(raw.icon),
    talent: toSafeNumber(raw.talent, null),
    traits: normalizeTraits(raw.traits),
    moonTone: toText(raw?.daily?.moon?.label || raw?.daily?.moonLabel),
    moonInsight: toText(raw?.daily?.insight),
    summaryTone: toText(raw?.summaryTone),
  };
}

function normalizeCompatibilityResult(raw, basicResult) {
  if (!raw || typeof raw !== "object") return null;

  const myIdx = toSafeNumber(raw.myIdx, null);
  const partnerIdx = toSafeNumber(raw.partnerIdx, null);
  if (myIdx === null || partnerIdx === null) return null;

  if (basicResult && toSafeNumber(basicResult.mansionIdx, null) !== null && myIdx !== basicResult.mansionIdx) {
    return null;
  }

  return {
    myIdx,
    partnerIdx,
    partnerMansion: toText(raw.partnerMansion),
    relationType: toText(raw.relationType),
    distanceLabel: toText(raw.distanceLabel),
    temperature: toSafeNumber(raw.temperature, null),
    score: toSafeNumber(raw.score, null),
    magnetism: toSafeNumber(raw.magnetism, null),
    stamp: toText(raw.stamp),
    partnerGender: toText(raw.partnerGender),
  };
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
    "1. 질문 요약",
    "2. 핵심 해석 (근거 포함)",
    "3. 이번 달 실행 전략 3가지",
    "4. 피해야 할 패턴 2가지",
    "5. 한 줄 결론",
  );

  return lines.join("\n");
}

export function buildSukuyoAIPrompt({ question, basicResult, compatibilityResult }) {
  const normalizedQuestion = ensureValidQuestion(question);
  const normalizedType = classifyQuestionType(normalizedQuestion);
  const normalizedBasic = normalizeBasicResult(basicResult);
  const normalizedCompat = normalizeCompatibilityResult(compatibilityResult, normalizedBasic);

  const compatibilityHint = normalizedCompat
    ? "궁합 데이터가 제공되어 관계 상호작용까지 반영합니다."
    : "상대 데이터가 없어 본인 숙요 리듬 중심으로 답합니다. 궁합 질문이면 상대 생년월일/시간을 추가하면 정확도가 높아집니다.";

  const prompt = buildPromptBody({
    question: normalizedQuestion,
    questionType: normalizedType,
    basicResult: normalizedBasic,
    compatibilityResult: normalizedCompat,
    compatibilityHint,
  });

  const digestSource = [
    normalizedQuestion,
    normalizedType,
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
  ].join("\n");

  return {
    prompt,
    questionType: normalizedType,
    digestSource,
    compatibilityUsed: Boolean(normalizedCompat),
    compatibilityHint,
  };
}
