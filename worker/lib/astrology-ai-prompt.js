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

  const prompt = [
    "# 서양 점성술 기반 AI 상담 프롬프트",
    "",
    "너는 실전 상담 경험이 풍부한 서양 점성술 전문가다.",
    "아래 데이터(네이탈/타임로드/트랜짓/시나스트리)를 근거로 현실적인 조언을 작성해라.",
    "불확실한 내용은 단정하지 말고 조건부로 설명해라.",
    "",
    "## 1. 사용자 질문",
    normalizedQuestion,
    "",
    "## 2. 질문 유형",
    `- 분류: ${questionTypeLabel}`,
    "",
    "## 3. 출생 기본 정보",
    `- 생년월일: ${birth.birthDate}`,
    `- 출생시간: ${birth.birthTime}`,
    `- 시간대: ${birth.timezone}`,
    `- 위도/경도: ${Number.isFinite(birth.latitude) ? birth.latitude : DEFAULT_TEXT} / ${Number.isFinite(birth.longitude) ? birth.longitude : DEFAULT_TEXT}`,
    "",
    "## 4. 네이탈 핵심 시그니처",
    `- 태양: ${signs.sun}`,
    `- 달: ${signs.moon}`,
    `- 상승궁: ${signs.asc}`,
    `- MC: ${signs.mc}`,
    `- Desc: ${signs.desc}`,
    "",
    "## 5. 원소/양식 밸런스",
    `- 원소 분포(개수): 불 ${elements.counts.fire}, 흙 ${elements.counts.earth}, 공기 ${elements.counts.air}, 물 ${elements.counts.water}`,
    `- 원소 분포(%): 불 ${elements.percentages.fire}%, 흙 ${elements.percentages.earth}%, 공기 ${elements.percentages.air}%, 물 ${elements.percentages.water}%`,
    `- 우세 원소: ${elements.dominant}`,
    `- 보완 원소: ${elements.weakest}`,
    `- 우세 양식: ${modalities.dominant}`,
    `- 양식 분포: 활동 ${modalities.counts.cardinal}, 고정 ${modalities.counts.fixed}, 변통 ${modalities.counts.mutable}`,
    `- 양식 운용 팁: ${modalities.advice}`,
    "",
    "## 6. 현재 집중 하우스/트랜짓/타임로드",
    `- 집중 하우스: ${focus.topHouse}`,
    `- 집중 주제: ${focus.topHouseTopic}`,
    `- 집중 행성 수: ${focus.focusCount}`,
    `- 목성 트랜짓: ${transit.jupiterTransit} (idx: ${transit.jupiterIndex})`,
    `- 트랜짓 메시지: ${transit.message}`,
    `- 피르다리아 메인/서브: ${timelord.firdariaMain} / ${timelord.firdariaSub}`,
    `- 피르다리아 잔여 연도: ${timelord.firdariaYearsLeft}`,
    `- 프로펙션: ${timelord.profectionHouse} · ${timelord.profectionSign} · ${timelord.profectionRuler}`,
    `- 프로펙션 테마: ${timelord.profectionTheme}`,
    "",
    "## 7. 주요 행성 배치",
    ...placements.map((line) => `- ${line}`),
    "",
    "## 8. 주요 어스펙트",
    ...majorAspects.map((line) => `- ${line}`),
    "",
    "## 9. 시나스트리 컨텍스트",
    ...compatibilityLines,
    "",
    "## 10. 답변 작성 지시",
    "아래 순서를 반드시 지켜 작성해라.",
    "1) 질문-차트 연결 핵심 3문장",
    "2) 강점 3가지(실행 근거 포함)",
    "3) 리스크 3가지(회피/완충 전략 포함)",
    "4) 오늘~4주 액션 플랜 5개",
    "5) 관계 질문인 경우: 대화 스크립트 예시 3문장",
    "6) 마지막 한 줄 결론",
    "",
    "## 11. 톤 가이드",
    "- 단정적 예언 금지, 선택 가능한 전략 중심",
    "- 전문 용어는 짧게 풀어서 설명",
    "- 불안을 키우지 말고 실행 가능성을 높이는 문장 사용",
  ].join("\n");

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
  ].join("\n");

  return {
    prompt,
    questionType,
    compatibilityUsed: Boolean(compatibility),
    digestSource,
  };
}
