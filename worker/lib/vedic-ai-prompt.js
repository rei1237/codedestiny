import { buildFortuneQuestionPromptPackage } from "./fortune-question-prompt.js";

const DEFAULT_TEXT = "제공되지 않음";

export const VEDIC_AI_PROMPT_FEATURE_KEY = "vedic_ai_prompt_generator";
export const VEDIC_AI_PROMPT_PRICE = 100;

const QUESTION_TYPE_RULES = Object.freeze({
  compatibility: ["궁합", "상대", "상대방", "커플", "재회", "배우자", "우리 둘", "인연"],
  love: ["연애", "결혼", "썸", "호감", "관계", "만남", "이별"],
  career: ["직업", "진로", "커리어", "이직", "사업", "창업", "승진"],
  money: ["재물", "돈", "수입", "투자", "매출", "자산", "부"],
  relationship: ["인간관계", "가족", "친구", "동료", "소통", "갈등"],
  life_direction: ["인생", "방향", "운명", "미래", "사명", "목표"],
  current_fortune: ["현재 운", "이번 달", "이번주", "요즘", "당장", "언제"],
  dasha: ["다샤", "대운", "세운", "안타르", "vimshottari"],
  yoga: ["요가", "수련", "asana", "명상 루틴"],
  chakra: ["차크라", "에너지", "막힘", "힐링", "만트라"],
  spirituality: ["영성", "영적", "의식", "명상", "깨달음"],
  karma: ["카르마", "업", "숙명", "전생", "업보"],
  personality: ["성격", "기질", "강점", "약점", "본성"],
});

const QUESTION_TYPE_LABELS = Object.freeze({
  compatibility: "궁합/관계",
  love: "연애/결혼",
  career: "직업/진로",
  money: "재물/자산",
  relationship: "인간관계",
  life_direction: "인생 방향",
  current_fortune: "현재 운세",
  dasha: "다샤 타이밍",
  yoga: "요가/수련",
  chakra: "차크라/에너지",
  spirituality: "영성",
  karma: "카르마",
  personality: "성향/기질",
  general: "일반",
});

const VEDIC_CORE_ANGLES = Object.freeze([
  "라그나/라그나 로드와 문 사인·낙샤트라의 기질 축",
  "아트마카라카 중심의 다르마/아르타/카마/목샤 균형",
  "2·6·10·11하우스와 직업·재물 카르마의 연결",
  "다샤(마하다샤/안타르다샤) 전환 시기별 선택 전략",
  "요가·라후/케투 축의 기회와 부작용 동시 점검",
  "관계 카르마(7H)와 확장 카르마(9H), 소모/해소(12H) 분석",
]);

function toText(value, fallback = DEFAULT_TEXT) {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDateLike(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value == null ? "" : value).trim();
  return text || DEFAULT_TEXT;
}

function toArray(values) {
  if (!Array.isArray(values)) return [];
  return values.filter((item) => item != null);
}

function toArrayText(values, fallback = DEFAULT_TEXT) {
  const normalized = toArray(values)
    .map((item) => toText(item, ""))
    .filter(Boolean);
  return normalized.length ? normalized.join(", ") : fallback;
}

function safeOneLine(value) {
  return toText(value).replace(/\s+/g, " ").trim();
}

function ensureValidQuestion(question) {
  const normalized = String(question || "").trim();
  if (!normalized || normalized.length < 5 || normalized.length > 1000) {
    throw new Error("INVALID_QUESTION");
  }
  return normalized;
}

function ensureVedicResult(vedicResult) {
  if (!vedicResult || typeof vedicResult !== "object") {
    throw new Error("MISSING_VEDIC_RESULT");
  }
}

export function classifyVedicPromptQuestionType(question) {
  const text = String(question || "").trim().toLowerCase();
  if (!text) return "general";

  const ordered = [
    "compatibility",
    "dasha",
    "career",
    "money",
    "love",
    "relationship",
    "current_fortune",
    "chakra",
    "yoga",
    "spirituality",
    "karma",
    "personality",
    "life_direction",
  ];

  for (let i = 0; i < ordered.length; i += 1) {
    const type = ordered[i];
    const keywords = QUESTION_TYPE_RULES[type] || [];
    if (keywords.some((keyword) => text.includes(String(keyword).toLowerCase()))) {
      return type;
    }
  }

  return "general";
}

function normalizeProfile(vedicResult) {
  const profile = vedicResult.profile && typeof vedicResult.profile === "object" ? vedicResult.profile : {};
  const birth = profile.birth && typeof profile.birth === "object" ? profile.birth : {};

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

  const birthTimeKnown = birthTime !== DEFAULT_TEXT && !Boolean(birth.timeUnknown);

  return {
    name: toText(profile.name, "사용자"),
    gender: toText(birth.gender),
    birthDate,
    birthTime,
    birthTimeKnown,
    timezone: toText(birth.timezone),
    latitude: toNumber(birth.lat),
    longitude: toNumber(birth.lon),
  };
}

function normalizeLagna(vedicResult) {
  const lagna = vedicResult.lagna && typeof vedicResult.lagna === "object" ? vedicResult.lagna : {};
  return {
    signKo: toText(lagna.signKo || lagna.sign),
    sign: toText(lagna.sign),
    degree: toNumber(lagna.degree),
    lord: toText(lagna.lord),
  };
}

function normalizeMoonNakshatra(vedicResult) {
  const moonNakshatra = vedicResult.moonNakshatra && typeof vedicResult.moonNakshatra === "object"
    ? vedicResult.moonNakshatra
    : {};
  return {
    name: toText(moonNakshatra.name),
    pada: toNumber(moonNakshatra.pada),
    lord: toText(moonNakshatra.lord),
    deity: toText(moonNakshatra.deity),
    motive: toText(moonNakshatra.motive),
  };
}

function normalizeKarakas(vedicResult) {
  const karakas = vedicResult.karakas && typeof vedicResult.karakas === "object" ? vedicResult.karakas : {};
  return {
    atmakaraka: toText(karakas.atmakaraka),
    amatyakaraka: toText(karakas.amatyakaraka),
    darakaraka: toText(karakas.darakaraka),
  };
}

function normalizeYogas(vedicResult) {
  return toArray(vedicResult.yogas)
    .map((item) => toText(item, ""))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizePlanets(vedicResult) {
  const rows = toArray(vedicResult.planets);
  if (!rows.length) return [];

  return rows
    .map((row) => {
      const item = row && typeof row === "object" ? row : {};
      const graha = toText(item.grahaKo || item.graha, "");
      if (!graha) return null;
      return {
        graha,
        rashi: toText(item.rashiKo || item.rashi),
        bhava: toNumber(item.bhava),
        nakshatra: toText(item.nakshatra),
        pada: toNumber(item.pada),
        dignity: toText(item.dignity),
        retrograde: Boolean(item.retrograde),
      };
    })
    .filter(Boolean)
    .slice(0, 9);
}

function normalizeBhavas(vedicResult) {
  const rows = toArray(vedicResult.bhavas);
  if (!rows.length) return [];

  return rows
    .map((row) => {
      const item = row && typeof row === "object" ? row : {};
      const number = toNumber(item.number);
      if (!Number.isFinite(number)) return null;
      return {
        number,
        sign: toText(item.rashiKo || item.rashi),
        lord: toText(item.lord),
        planets: toArray(item.planets).map((planet) => toText(planet, "")).filter(Boolean).slice(0, 5),
      };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeDasha(vedicResult) {
  const rows = toArray(vedicResult.dasha);
  if (!rows.length) return [];

  return rows
    .map((row) => {
      const item = row && typeof row === "object" ? row : {};
      const planet = toText(item.planet);
      if (planet === DEFAULT_TEXT) return null;
      return {
        planet,
        start: toDateLike(item.start),
        end: toDateLike(item.end),
        years: toNumber(item.years),
        active: Boolean(item.active),
      };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeDomainSummary(vedicResult) {
  const romance = vedicResult.romance && typeof vedicResult.romance === "object" ? vedicResult.romance : {};
  const wealth = vedicResult.wealth && typeof vedicResult.wealth === "object" ? vedicResult.wealth : {};
  const career = vedicResult.career && typeof vedicResult.career === "object" ? vedicResult.career : {};
  const chakra = vedicResult.chakra && typeof vedicResult.chakra === "object" ? vedicResult.chakra : {};
  const remedies = vedicResult.remedies && typeof vedicResult.remedies === "object" ? vedicResult.remedies : {};

  const romancePoints = [];
  if (romance.h7sign) romancePoints.push(`7하우스 ${toText(romance.h7sign)}`);
  if (romance.karakaSign) romancePoints.push(`관계 카라카 ${toText(romance.karakaSign)}`);
  if (Array.isArray(romance.challenges) && romance.challenges.length) romancePoints.push(`관계 리스크 ${toText(romance.challenges[0])}`);

  const wealthPoints = [];
  if (Number.isFinite(toNumber(wealth.score))) wealthPoints.push(`재물 점수 ${toNumber(wealth.score)}/100`);
  if (Array.isArray(wealth.yogas) && wealth.yogas.length) wealthPoints.push(`재물 요가 ${toText(wealth.yogas[0])}`);
  if (wealth.advice) wealthPoints.push(`재물 조언 ${toText(wealth.advice)}`);

  const careerPoints = [];
  if (Array.isArray(career.primary) && career.primary.length) {
    careerPoints.push(`직업 축 ${career.primary.slice(0, 3).map((item) => toText(item, "")).filter(Boolean).join(", ")}`);
  }
  if (Array.isArray(career.yogas) && career.yogas.length) careerPoints.push(`직업 요가 ${toText(career.yogas[0])}`);
  if (career.best) careerPoints.push(`적기 ${toText(career.best)}`);

  const chakraPoints = [];
  if (Number.isFinite(toNumber(chakra.overall))) chakraPoints.push(`차크라 균형 ${toNumber(chakra.overall)}/100`);
  if (chakra.blocked) chakraPoints.push(`정체 차크라 ${toText(chakra.blocked)}`);
  if (Array.isArray(chakra.advice) && chakra.advice.length) chakraPoints.push(`치유 루틴 ${toText(chakra.advice[0])}`);

  const remedyPoints = [];
  const dosha = remedies.dosha && typeof remedies.dosha === "object" ? remedies.dosha : {};
  if (dosha.type) remedyPoints.push(`도샤 ${toText(dosha.type)}`);
  if (remedies.mantra) remedyPoints.push(`만트라 ${toText(remedies.mantra)}`);
  if (remedies.day) remedyPoints.push(`추천 요일 ${toText(remedies.day)}`);

  return {
    romance: romancePoints.length ? romancePoints : [DEFAULT_TEXT],
    wealth: wealthPoints.length ? wealthPoints : [DEFAULT_TEXT],
    career: careerPoints.length ? careerPoints : [DEFAULT_TEXT],
    chakra: chakraPoints.length ? chakraPoints : [DEFAULT_TEXT],
    remedies: remedyPoints.length ? remedyPoints : [DEFAULT_TEXT],
  };
}

function normalizeCompatibility(compatibilityResult) {
  if (!compatibilityResult || typeof compatibilityResult !== "object") return null;

  const partner = compatibilityResult.partner && typeof compatibilityResult.partner === "object"
    ? compatibilityResult.partner
    : {};
  const ashtakoota = compatibilityResult.ashtakoota && typeof compatibilityResult.ashtakoota === "object"
    ? compatibilityResult.ashtakoota
    : compatibilityResult;

  const total = toNumber(ashtakoota.total);
  const totalMax = toNumber(ashtakoota.totalMax, 36);
  const pct = toNumber(ashtakoota.pct);
  if (!Number.isFinite(total) || !Number.isFinite(totalMax)) return null;

  const breakdownRaw = toArray(ashtakoota.breakdown || compatibilityResult.kutaBreakdown);
  const breakdown = breakdownRaw
    .map((row) => {
      const item = row && typeof row === "object" ? row : {};
      const name = toText(item.name || item.n, "");
      if (!name) return null;
      return {
        name,
        score: toNumber(item.score || item.sc),
        max: toNumber(item.max),
        label: toText(item.label || item.desc),
      };
    })
    .filter(Boolean)
    .slice(0, 8);

  return {
    partnerName: toText(partner.name, "상대"),
    partnerBirth: partner.birth && typeof partner.birth === "object" ? partner.birth : null,
    total,
    totalMax,
    pct: Number.isFinite(pct) ? pct : Math.round((total / totalMax) * 100),
    verdict: toText(ashtakoota.verdict),
    strengths: toArray(compatibilityResult.strengths).map((item) => toText(item, "")).filter(Boolean).slice(0, 4),
    challenges: toArray(compatibilityResult.challenges).map((item) => toText(item, "")).filter(Boolean).slice(0, 4),
    advice: toText(compatibilityResult.advice),
    overallReason: toText(compatibilityResult.overallReason),
    breakdown,
  };
}

function createGuidanceByQuestionType(questionType, compatibilityUsed, birthTimeKnown) {
  const focusMap = {
    compatibility: "궁합 점수와 8쿠타 breakdown을 핵심 근거로 사용",
    love: "7하우스, 다라카라카, 달 낙샤트라 감정 패턴을 우선 반영",
    career: "10하우스/다샴샤/Dasha 타이밍을 우선 해석",
    money: "2·11하우스, 재물 요가, 목성 상태를 우선 해석",
    relationship: "달·수성·7하우스 기반 소통 패턴을 중심으로 설명",
    life_direction: "아트마카라카·다샤·카르마 테마를 중심으로 장기 방향 제시",
    current_fortune: "현재 마하다샤/안타르다샤와 단기 실행 전략을 우선 제시",
    dasha: "진행 중 대운/세운과 이후 전환 시점 중심으로 답변",
    yoga: "원소 불균형과 차크라 정체를 기준으로 수련 루틴 제안",
    chakra: "차크라 지표·정체 부위·실행 가능한 힐링 루틴 중심",
    spirituality: "낙샤트라 상징·카르마·명상 실천 지침 중심",
    karma: "반복 패턴의 업적 원인과 해소 행동을 구체적으로 제시",
    personality: "라그나/달낙샤트라/카라카를 활용한 성향 구조 분석",
    general: "핵심 차트 시그니처와 현재 다샤 흐름을 균형 있게 반영",
  };

  const guidance = [
    `- 핵심 해석 축: ${focusMap[questionType] || focusMap.general}`,
    "- 과장, 공포 조장, 단정적 예언을 금지하고 전략적 조언 중심으로 작성",
    "- 데이터에 없는 사실은 추정으로 명시하고 확정하지 않기",
    "- 답변 마지막에 2주~6주 실행 체크리스트를 포함",
  ];

  if (!compatibilityUsed) {
    guidance.push("- 궁합 데이터가 없으므로 개인 차트 기반 관계 패턴으로 안내하고, 필요 시 상대 정보 입력을 요청");
  }

  if (!birthTimeKnown) {
    guidance.push("- 출생시간 미상/불확실 전제로 하우스·분차트 해석은 보수적으로 제시");
  }

  return guidance;
}

function buildVedicAngles(questionType) {
  const angles = VEDIC_CORE_ANGLES.slice();

  if (questionType === "money") {
    angles.push(
      "라그나/라그나 로드 + 2H·6H·10H·11H + 다샤 흐름으로 재물 구조 분석",
      "단순 금전운이 아닌 카르마적 역할 기반 수익화 경로 제시",
      "재물 형성에 기여하는 요가와 손실 유발 패턴 분리",
    );
  }

  if (questionType === "career") {
    angles.push(
      "직업 카르마 축(10H·아마티야카라카·다샴샤) 기반 역할 정의",
      "조직형/전문가형/사업형 진로 적합도 비교",
    );
  }

  if (questionType === "compatibility" || questionType === "love") {
    angles.push(
      "7H·다라카라카·아쉬타쿠타 breakdown 기반 관계 안정성 분석",
      "관계 카르마의 반복 상처 패턴과 완화 전략 제안",
    );
  }

  return angles;
}

function buildVedicFollowUps(questionType) {
  const common = [
    "현재 다샤 구간에서 가장 먼저 실행할 행동 3가지는 무엇인가요?",
    "제 카르마 패턴에서 반복 손실을 줄이려면 무엇을 멈춰야 하나요?",
    "2주~6주 단기 실천 체크리스트를 제시해주세요.",
  ];

  if (questionType === "money") {
    return common.concat([
      "재물 카르마에 맞는 수익 모델 3~5개를 우선순위로 제시해주세요.",
      "손실 가능성이 큰 투자/협업 방식은 무엇인가요?",
    ]);
  }

  if (questionType === "compatibility") {
    return common.concat([
      "갈등을 줄이기 위한 관계 규칙 3가지를 제시해주세요.",
      "장기 관계 유지 가능성을 높이는 생활 리듬 조정법은 무엇인가요?",
    ]);
  }

  return common;
}

export function buildVedicAIPrompt({ question, vedicResult, compatibilityResult }) {
  const normalizedQuestion = ensureValidQuestion(question);
  ensureVedicResult(vedicResult);

  const questionType = classifyVedicPromptQuestionType(normalizedQuestion);
  const questionTypeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;

  const profile = normalizeProfile(vedicResult);
  const lagna = normalizeLagna(vedicResult);
  const moonNak = normalizeMoonNakshatra(vedicResult);
  const karakas = normalizeKarakas(vedicResult);
  const yogas = normalizeYogas(vedicResult);
  const planets = normalizePlanets(vedicResult);
  const bhavas = normalizeBhavas(vedicResult);
  const dasha = normalizeDasha(vedicResult);
  const domain = normalizeDomainSummary(vedicResult);
  const compatibility = normalizeCompatibility(compatibilityResult);

  if (questionType === "compatibility" && !compatibility) {
    throw new Error("MISSING_COMPATIBILITY_RESULT");
  }

  const activeDasha = dasha.find((row) => row.active) || null;
  const topBhava = bhavas
    .map((row) => ({ ...row, occupancy: row.planets.length }))
    .sort((a, b) => b.occupancy - a.occupancy)
    .slice(0, 3)
    .map((row) => `${row.number}H ${row.sign} (${row.occupancy}성)`);

  const compatibilityHint = compatibility
    ? "상대 궁합 데이터가 제공되어 관계 상호작용을 함께 해석합니다."
    : "궁합 데이터가 없어 개인 차트 중심으로 해석합니다. 상대 데이터를 추가하면 궁합 정밀도가 올라갑니다.";

  const compatibilityLines = compatibility
    ? [
      `- 상대 이름: ${compatibility.partnerName}`,
      compatibility.partnerBirth ? `- 상대 생년월일: ${toText(compatibility.partnerBirth.year, "")}-${toText(compatibility.partnerBirth.month, "")}-${toText(compatibility.partnerBirth.day, "")}` : "- 상대 생년월일: 미제공",
      `- 아쉬타쿠타 점수: ${compatibility.total}/${compatibility.totalMax} (${compatibility.pct}%)`,
      `- 판정: ${compatibility.verdict}`,
      `- 종합 사유: ${compatibility.overallReason}`,
      `- 강점: ${compatibility.strengths.length ? compatibility.strengths.join(", ") : DEFAULT_TEXT}`,
      `- 주의점: ${compatibility.challenges.length ? compatibility.challenges.join(", ") : DEFAULT_TEXT}`,
      `- 조언: ${compatibility.advice}`,
      ...compatibility.breakdown.map((row) => `- ${row.name}: ${Number.isFinite(row.score) ? row.score : "?"}/${Number.isFinite(row.max) ? row.max : "?"} (${row.label})`),
    ]
    : [
      "- 궁합 데이터: 미제공",
      `- 안내: ${compatibilityHint}`,
    ];

  const guidanceLines = createGuidanceByQuestionType(questionType, Boolean(compatibility), profile.birthTimeKnown);

  const domainDataLines = [
    `질문 유형: ${questionTypeLabel}`,
    `라그나/로드: ${lagna.signKo}(${lagna.sign}) / ${lagna.lord}`,
    `문 낙샤트라: ${moonNak.name} P${Number.isFinite(moonNak.pada) ? moonNak.pada : "?"} (Lord ${moonNak.lord})`,
    `카라카: AK ${karakas.atmakaraka}, AmK ${karakas.amatyakaraka}, DK ${karakas.darakaraka}`,
    `주요 요가: ${yogas.length ? yogas.join(", ") : DEFAULT_TEXT}`,
    `행성 집중 하우스: ${topBhava.length ? topBhava.join(" · ") : DEFAULT_TEXT}`,
    `활성 다샤: ${activeDasha ? `${activeDasha.planet} ${activeDasha.start}~${activeDasha.end}` : DEFAULT_TEXT}`,
    `주제 인사이트(재물/직업/관계): ${domain.wealth.join(" | ")} / ${domain.career.join(" | ")} / ${domain.romance.join(" | ")}`,
    `궁합 컨텍스트: ${compatibilityLines.join(" | ")}`,
    `추가 가이드: ${guidanceLines.join(" | ")}`,
  ];

  const promptPackage = buildFortuneQuestionPromptPackage({
    fortuneType: "vedic",
    fortuneLabel: "베다 점성술",
    expertLabel: "베다 점성술(Jyotish) 실전 상담 전문가",
    userQuestion: normalizedQuestion,
    analysisResult: vedicResult,
    profile,
    compatibilityTarget: compatibility || undefined,
    mode: questionType,
    questionTypeLabel,
    analysisAngles: buildVedicAngles(questionType),
    recommendedFollowUpQuestions: buildVedicFollowUps(questionType),
    caution: "베다 해석은 카르마 경향 분석이며 의료/법률/투자 결정을 대체하지 않습니다.",
    domainDataLines,
    minPromptLength: 1800,
  });

  const digestSource = [
    normalizedQuestion,
    questionType,
    profile.birthDate,
    profile.birthTime,
    profile.timezone,
    lagna.sign,
    lagna.lord,
    moonNak.name,
    moonNak.lord,
    karakas.atmakaraka,
    karakas.amatyakaraka,
    karakas.darakaraka,
    yogas.join("|"),
    planets.map((row) => `${row.graha}:${row.rashi}:${row.bhava}:${row.nakshatra}:${row.pada}:${row.dignity}:${row.retrograde ? 1 : 0}`).join("|"),
    bhavas.map((row) => `${row.number}:${row.sign}:${row.lord}:${row.planets.join(",")}`).join("|"),
    dasha.map((row) => `${row.planet}:${row.start}:${row.end}:${row.active ? 1 : 0}`).join("|"),
    compatibility ? `compat:${compatibility.partnerName}:${compatibility.total}:${compatibility.pct}:${compatibility.verdict}` : "compat:none",
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
    compatibilityUsed: Boolean(compatibility),
    compatibilityHint,
  };
}
