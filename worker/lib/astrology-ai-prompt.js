import { buildFortuneQuestionPromptPackage } from "./fortune-question-prompt.js";

const DEFAULT_TEXT = "제공되지 않음";

export const ASTROLOGY_AI_PROMPT_FEATURE_KEY = "astrology_ai_prompt_generator";
export const ASTROLOGY_AI_PROMPT_PRICE = 100;

const QUESTION_TYPE_RULES = Object.freeze({
  compatibility: ["궁합", "시나스트리", "상대", "연인", "배우자", "결혼 가능성", "재회"],
  love: ["연애", "썸", "호감", "소개팅", "고백", "관계"],
  career: ["직업", "진로", "커리어", "이직", "사업", "창업", "승진"],
  money: ["돈", "재물", "수익", "투자", "재정", "부자", "매출"],
  health: ["건강", "스트레스", "불안", "멘탈", "수면", "회복"],
  life_direction: ["인생", "방향", "운명", "미래", "목표", "성장"],
  relationship: ["인간관계", "친구", "가족", "동료", "갈등", "소통"],
});

const QUESTION_TYPE_LABELS = Object.freeze({
  compatibility: "궁합/시나스트리",
  love: "연애/관계",
  career: "직업/커리어",
  money: "돈/재정",
  health: "건강/멘탈",
  life_direction: "인생 방향",
  relationship: "인간관계",
  general: "일반",
});

const ASTROLOGY_CORE_ANGLES = Object.freeze([
  "태양·달·상승궁·MC의 심리/행동 축 해석",
  "개인행성(수성·금성·화성)과 사회행성(목성·토성) 상호작용",
  "세대행성(천왕성·해왕성·명왕성)의 장기 변곡점 영향",
  "하우스 축과 핵심 어스펙트 기반 현실 선택 전략",
  "트랜싯·프로그레션·타임로드를 통한 시기별 실행 우선순위",
  "강점 활용/리스크 완충을 분리한 행동 설계",
]);

function toText(value, fallback = DEFAULT_TEXT) {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toArrayText(values, fallback = DEFAULT_TEXT) {
  if (!Array.isArray(values)) return fallback;
  const lines = values
    .map((item) => toText(item, ""))
    .filter(Boolean);
  return lines.length ? lines.join(", ") : fallback;
}

function ensureValidQuestion(question) {
  const normalized = String(question || "").trim();
  if (!normalized || normalized.length < 5 || normalized.length > 1000) {
    throw new Error("INVALID_QUESTION");
  }
  return normalized;
}

function ensureAstrologyResultPresence(astrologyResult) {
  if (!astrologyResult || typeof astrologyResult !== "object") {
    throw new Error("MISSING_ASTROLOGY_RESULT");
  }
}

export function classifyAstrologyPromptQuestionType(question) {
  const text = String(question || "").trim().toLowerCase();
  if (!text) return "general";

  const ordered = ["compatibility", "career", "money", "love", "relationship", "health", "life_direction"];
  for (let i = 0; i < ordered.length; i += 1) {
    const type = ordered[i];
    const rules = QUESTION_TYPE_RULES[type] || [];
    if (rules.some((keyword) => text.includes(String(keyword).toLowerCase()))) {
      return type;
    }
  }
  return "general";
}

function normalizeBirth(astrologyResult) {
  const birth = astrologyResult.birth && typeof astrologyResult.birth === "object" ? astrologyResult.birth : {};
  const year = toNumber(birth.year);
  const month = toNumber(birth.month);
  const day = toNumber(birth.day);
  const hour = toNumber(birth.hour);
  const minute = toNumber(birth.minute);

  const birthDate = year && month && day
    ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : DEFAULT_TEXT;
  const birthTime = Number.isFinite(hour) && Number.isFinite(minute)
    ? `${String(Math.trunc(hour)).padStart(2, "0")}:${String(Math.trunc(minute)).padStart(2, "0")}`
    : DEFAULT_TEXT;

  return {
    birthDate,
    birthTime,
    timezone: toText(birth.timezone),
    latitude: toNumber(birth.latitude),
    longitude: toNumber(birth.longitude),
  };
}

function normalizeCoreSigns(astrologyResult) {
  const core = astrologyResult.coreSigns && typeof astrologyResult.coreSigns === "object" ? astrologyResult.coreSigns : {};
  return {
    sun: toText(core.sun || astrologyResult.sunSign),
    moon: toText(core.moon || astrologyResult.moonSign),
    asc: toText(core.asc || core.ascendant || astrologyResult.ascSign),
    mc: toText(core.mc || astrologyResult.mcSign),
    desc: toText(core.desc || astrologyResult.descSign),
  };
}

function normalizeElements(astrologyResult) {
  const elements = astrologyResult.elements && typeof astrologyResult.elements === "object" ? astrologyResult.elements : {};
  const counts = elements.counts && typeof elements.counts === "object" ? elements.counts : {};
  const percentages = elements.percentages && typeof elements.percentages === "object" ? elements.percentages : {};

  return {
    dominant: toText(elements.dominant),
    weakest: toText(elements.weakest),
    counts: {
      fire: toNumber(counts.fire, 0),
      earth: toNumber(counts.earth, 0),
      air: toNumber(counts.air, 0),
      water: toNumber(counts.water, 0),
    },
    percentages: {
      fire: toNumber(percentages.fire, 0),
      earth: toNumber(percentages.earth, 0),
      air: toNumber(percentages.air, 0),
      water: toNumber(percentages.water, 0),
    },
  };
}

function normalizeModalities(astrologyResult) {
  const modalities = astrologyResult.modalities && typeof astrologyResult.modalities === "object" ? astrologyResult.modalities : {};
  const counts = modalities.counts && typeof modalities.counts === "object" ? modalities.counts : {};

  return {
    dominant: toText(modalities.dominant),
    counts: {
      cardinal: toNumber(counts.cardinal, 0),
      fixed: toNumber(counts.fixed, 0),
      mutable: toNumber(counts.mutable, 0),
    },
    advice: toText(modalities.advice),
  };
}

function normalizeFocus(astrologyResult) {
  const focus = astrologyResult.focus && typeof astrologyResult.focus === "object" ? astrologyResult.focus : {};
  return {
    topHouse: toText(focus.topHouse),
    topHouseTopic: toText(focus.topHouseTopic),
    focusCount: toNumber(focus.focusCount, 0),
  };
}

function normalizeTransit(astrologyResult) {
  const transits = astrologyResult.transits && typeof astrologyResult.transits === "object" ? astrologyResult.transits : {};
  return {
    jupiterTransit: toText(transits.jupiterTransit),
    jupiterIndex: toNumber(transits.jupiterIndex, 0),
    message: toText(transits.message),
  };
}

function normalizeTimelord(astrologyResult) {
  const timelord = astrologyResult.timelord && typeof astrologyResult.timelord === "object" ? astrologyResult.timelord : {};
  const firdaria = timelord.firdaria && typeof timelord.firdaria === "object" ? timelord.firdaria : {};
  const profection = timelord.profection && typeof timelord.profection === "object" ? timelord.profection : {};

  return {
    firdariaMain: toText(firdaria.main),
    firdariaSub: toText(firdaria.sub),
    firdariaYearsLeft: toNumber(firdaria.yearsLeft, 0),
    profectionHouse: toText(profection.house),
    profectionSign: toText(profection.sign),
    profectionRuler: toText(profection.ruler),
    profectionTheme: toText(profection.theme),
  };
}

function normalizePlacements(astrologyResult) {
  const rows = Array.isArray(astrologyResult.placements) ? astrologyResult.placements : [];
  if (!rows.length) return [DEFAULT_TEXT];

  return rows.slice(0, 12).map((row) => {
    const planet = toText(row?.planet, "행성");
    const sign = toText(row?.sign, DEFAULT_TEXT);
    const house = toText(row?.house, DEFAULT_TEXT);
    const degree = toText(row?.degree, "-");
    return `${planet}: ${sign} / ${house} / ${degree}`;
  });
}

function normalizeMajorAspects(astrologyResult) {
  const rows = Array.isArray(astrologyResult.majorAspects) ? astrologyResult.majorAspects : [];
  if (!rows.length) return [DEFAULT_TEXT];

  return rows.slice(0, 12).map((row) => {
    const pair = toText(row?.pair, "각도");
    const aspect = toText(row?.aspect, "-");
    const orb = toText(row?.orb, "-");
    return `${pair} | ${aspect} | orb ${orb}`;
  });
}

function normalizeCompatibility(compatibilityResult) {
  if (!compatibilityResult || typeof compatibilityResult !== "object") return null;

  const partner = compatibilityResult.partner && typeof compatibilityResult.partner === "object" ? compatibilityResult.partner : {};
  const houses = compatibilityResult.houseOverlay && typeof compatibilityResult.houseOverlay === "object"
    ? compatibilityResult.houseOverlay
    : {};

  return {
    source: toText(compatibilityResult.source, "unknown"),
    score: toNumber(compatibilityResult.score, 0),
    relationType: toText(compatibilityResult.relationType),
    loveDesc: toText(compatibilityResult.loveDesc),
    workDesc: toText(compatibilityResult.workDesc),
    spiritDesc: toText(compatibilityResult.spiritDesc),
    bestSupport: toText(compatibilityResult.bestSupport),
    bestChallenge: toText(compatibilityResult.bestChallenge),
    partnerName: toText(partner.name),
    partnerGender: toText(partner.gender),
    partnerSun: toText(partner.sun),
    partnerMoon: toText(partner.moon),
    partnerVenus: toText(partner.venus),
    partnerMars: toText(partner.mars),
    mySunInPartnerHouse: toText(houses.mySunInPartnerHouse),
    partnerSunInMyHouse: toText(houses.partnerSunInMyHouse),
    myMoonInPartnerHouse: toText(houses.myMoonInPartnerHouse),
    partnerMoonInMyHouse: toText(houses.partnerMoonInMyHouse),
    myVenusInPartnerHouse: toText(houses.myVenusInPartnerHouse),
    partnerVenusInMyHouse: toText(houses.partnerVenusInMyHouse),
  };
}

function buildAstrologyAngles(questionType) {
  const angles = ASTROLOGY_CORE_ANGLES.slice();

  if (questionType === "money" || questionType === "career") {
    angles.push(
      "2H·6H·10H·11H를 중심으로 돈/직업 구조 해석",
      "금성·목성·토성·MC·2하우스 주인·10하우스 주인의 상태 비교",
      "안정적 직장형/창작브랜드형/기술분석형/대중영향형/플랫폼커뮤니티형 적합도 판단",
    );
  }

  if (questionType === "love" || questionType === "compatibility") {
    angles.push(
      "금성·화성·달·7하우스 기반 관계 욕구와 갈등 트리거 분석",
      "시나스트리 상호작용에서 감정 안전지대와 충돌 지점 분리",
    );
  }

  if (questionType === "health") {
    angles.push(
      "6하우스·달·토성·해왕성 관점의 스트레스/회복 리듬 분석",
      "생활 루틴 조정으로 증상 악화를 줄이는 전략 제시",
    );
  }

  return angles;
}

function buildAstrologyFollowUps(questionType) {
  const common = [
    "지금 차트 기준으로 우선순위가 가장 높은 행동 3가지는 무엇인가요?",
    "제가 과도하게 낙관/비관하기 쉬운 영역은 어디인가요?",
    "다음 3개월 계획을 차트 흐름에 맞게 재배치해 주세요.",
  ];

  if (questionType === "money" || questionType === "career") {
    return common.concat([
      "2H·10H 기준으로 수익화 속도를 높이는 실무 전략은 무엇인가요?",
      "이직/확장 시 가장 리스크가 큰 시기와 회피 전략을 알려주세요.",
    ]);
  }

  if (questionType === "love" || questionType === "compatibility") {
    return common.concat([
      "관계를 안정시키는 대화 방식과 금지 패턴을 알려주세요.",
      "감정 소모를 줄이기 위한 경계선 설정 방법을 제안해주세요.",
    ]);
  }

  return common;
}

export function buildAstrologyAIPrompt({ question, astrologyResult, compatibilityResult }) {
  const normalizedQuestion = ensureValidQuestion(question);
  ensureAstrologyResultPresence(astrologyResult);

  const questionType = classifyAstrologyPromptQuestionType(normalizedQuestion);
  const questionTypeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;

  const compatibility = normalizeCompatibility(compatibilityResult);
  if (questionType === "compatibility" && !compatibility) {
    throw new Error("COMPATIBILITY_CONTEXT_REQUIRED");
  }

  const birth = normalizeBirth(astrologyResult);
  const signs = normalizeCoreSigns(astrologyResult);
  const elements = normalizeElements(astrologyResult);
  const modalities = normalizeModalities(astrologyResult);
  const focus = normalizeFocus(astrologyResult);
  const transit = normalizeTransit(astrologyResult);
  const timelord = normalizeTimelord(astrologyResult);
  const placements = normalizePlacements(astrologyResult);
  const majorAspects = normalizeMajorAspects(astrologyResult);

  const compatibilityLines = compatibility
    ? [
      `- 시나스트리 점수: ${compatibility.score}/100`,
      `- 관계 타입: ${compatibility.relationType}`,
      `- 상대 이름: ${compatibility.partnerName}`,
      `- 상대 성별: ${compatibility.partnerGender}`,
      `- 상대 핵심 사인: 태양 ${compatibility.partnerSun}, 달 ${compatibility.partnerMoon}, 금성 ${compatibility.partnerVenus}, 화성 ${compatibility.partnerMars}`,
      `- 강점 각도: ${compatibility.bestSupport}`,
      `- 보완 각도: ${compatibility.bestChallenge}`,
      `- 투사 하우스: 내 태양→상대 ${compatibility.mySunInPartnerHouse}, 상대 태양→나 ${compatibility.partnerSunInMyHouse}`,
      `- 투사 하우스: 내 달→상대 ${compatibility.myMoonInPartnerHouse}, 상대 달→나 ${compatibility.partnerMoonInMyHouse}`,
      `- 투사 하우스: 내 금성→상대 ${compatibility.myVenusInPartnerHouse}, 상대 금성→나 ${compatibility.partnerVenusInMyHouse}`,
      `- 연애 요약: ${compatibility.loveDesc}`,
      `- 협업 요약: ${compatibility.workDesc}`,
      `- 성장 요약: ${compatibility.spiritDesc}`,
    ]
    : ["- 없음(궁합 계산 결과 미제공)"];

  const domainDataLines = [
    `질문 유형: ${questionTypeLabel}`,
    `핵심 시그니처: 태양 ${signs.sun}, 달 ${signs.moon}, ASC ${signs.asc}, MC ${signs.mc}`,
    `원소 분포: 불 ${elements.counts.fire}, 흙 ${elements.counts.earth}, 공기 ${elements.counts.air}, 물 ${elements.counts.water}`,
    `우세/보완 원소: ${elements.dominant} / ${elements.weakest}`,
    `양식 분포: 활동 ${modalities.counts.cardinal}, 고정 ${modalities.counts.fixed}, 변통 ${modalities.counts.mutable}`,
    `집중 하우스/테마: ${focus.topHouse} / ${focus.topHouseTopic}`,
    `트랜싯/타임로드: ${transit.jupiterTransit}, Firdaria ${timelord.firdariaMain}/${timelord.firdariaSub}, Profection ${timelord.profectionHouse}`,
    `주요 행성 배치: ${toArrayText(placements)}`,
    `주요 어스펙트: ${toArrayText(majorAspects)}`,
    `시나스트리: ${compatibility ? `${compatibility.relationType} (${compatibility.score}/100)` : "미제공"}`,
    `시나스트리 상세: ${compatibilityLines.join(" | ")}`,
  ];

  const promptPackage = buildFortuneQuestionPromptPackage({
    fortuneType: "astrology",
    fortuneLabel: "서양 점성술",
    expertLabel: "서양 점성술 차트 해석 전문가",
    userQuestion: normalizedQuestion,
    analysisResult: astrologyResult,
    profile: birth,
    compatibilityTarget: compatibility || undefined,
    mode: questionType,
    questionTypeLabel,
    analysisAngles: buildAstrologyAngles(questionType),
    recommendedFollowUpQuestions: buildAstrologyFollowUps(questionType),
    caution: "점성술 해석은 방향성 참고용이며 투자/의료/법률의 확정 판단으로 사용하면 안 됩니다.",
    domainDataLines,
    minPromptLength: 1700,
  });

  const digestSource = [
    normalizedQuestion,
    questionType,
    birth.birthDate,
    birth.birthTime,
    birth.timezone,
    signs.sun,
    signs.moon,
    signs.asc,
    signs.mc,
    signs.desc,
    elements.dominant,
    elements.weakest,
    String(elements.counts.fire),
    String(elements.counts.earth),
    String(elements.counts.air),
    String(elements.counts.water),
    modalities.dominant,
    focus.topHouse,
    focus.topHouseTopic,
    transit.jupiterTransit,
    timelord.firdariaMain,
    timelord.firdariaSub,
    timelord.profectionHouse,
    timelord.profectionSign,
    timelord.profectionRuler,
    toArrayText(placements, ""),
    toArrayText(majorAspects, ""),
    compatibility ? compatibility.source : "no-compatibility",
    compatibility ? String(compatibility.score) : "0",
    compatibility ? compatibility.partnerName : "",
    compatibility ? compatibility.relationType : "",
    compatibility ? compatibility.bestSupport : "",
    compatibility ? compatibility.bestChallenge : "",
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
    compatibilityUsed: Boolean(compatibility),
    digestSource,
  };
}
