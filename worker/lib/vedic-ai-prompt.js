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

  const prompt = [
    "# 베다 점성술 기반 AI 상담 프롬프트",
    "",
    "너는 베다 점성술(Jyotish) 실전 상담가다.",
    "아래의 계산 완료 데이터를 근거로 질문에 답하고, 차트를 다시 계산하거나 임의 데이터로 대체하지 마라.",
    "",
    "## 1) 사용자 질문",
    normalizedQuestion,
    "",
    "## 2) 질문 유형",
    `- 분류: ${questionTypeLabel}`,
    `- 궁합 데이터 사용 여부: ${compatibility ? "사용" : "미사용"}`,
    `- 출생시간 신뢰도: ${profile.birthTimeKnown ? "확보" : "불확실(보수 해석 필요)"}`,
    "",
    "## 3) 출생/기본 시그니처",
    `- 이름: ${profile.name}`,
    `- 성별: ${profile.gender}`,
    `- 생년월일: ${profile.birthDate}`,
    `- 출생시간: ${profile.birthTime}`,
    `- 시간대: ${profile.timezone}`,
    `- 위도/경도: ${Number.isFinite(profile.latitude) ? profile.latitude : DEFAULT_TEXT} / ${Number.isFinite(profile.longitude) ? profile.longitude : DEFAULT_TEXT}`,
    `- 라그나: ${lagna.signKo} (${lagna.sign}) ${Number.isFinite(lagna.degree) ? `${lagna.degree}°` : ""}`.trim(),
    `- 라그나 로드: ${lagna.lord}`,
    `- 문 낙샤트라: ${moonNak.name} Pada ${Number.isFinite(moonNak.pada) ? moonNak.pada : "?"} / Lord ${moonNak.lord}`,
    `- 낙샤트라 신성 축: ${moonNak.deity} · ${moonNak.motive}`,
    "",
    "## 4) 자이미니 카라카",
    `- 아트마카라카: ${karakas.atmakaraka}`,
    `- 아마티야카라카: ${karakas.amatyakaraka}`,
    `- 다라카라카: ${karakas.darakaraka}`,
    "",
    "## 5) 핵심 요가/행성/하우스",
    `- 주요 요가: ${yogas.length ? yogas.join(", ") : DEFAULT_TEXT}`,
    `- 행성 집중 하우스: ${topBhava.length ? topBhava.join(" · ") : DEFAULT_TEXT}`,
    "- 행성 배치 요약:",
    ...planets.map((row) => `  - ${row.graha}: ${row.rashi} · ${Number.isFinite(row.bhava) ? `${row.bhava}H` : "?H"} · ${row.nakshatra} P${Number.isFinite(row.pada) ? row.pada : "?"} · ${row.dignity}${row.retrograde ? " (역행)" : ""}`),
    "- 하우스 요약:",
    ...bhavas.map((row) => `  - ${row.number}H ${row.sign} / Lord ${row.lord} / Planets ${row.planets.length ? row.planets.join(", ") : "공실"}`),
    "",
    "## 6) 다샤 타임라인",
    `- 현재 활성 대운: ${activeDasha ? `${activeDasha.planet} (${activeDasha.start} ~ ${activeDasha.end})` : DEFAULT_TEXT}`,
    "- 주요 다샤 목록:",
    ...dasha.map((row) => `  - ${row.planet}: ${row.start} ~ ${row.end} (${Number.isFinite(row.years) ? row.years : "?"}년)${row.active ? " [진행 중]" : ""}`),
    "",
    "## 7) 주제별 인사이트",
    `- 성향/연애: ${domain.romance.join(" | ")}`,
    `- 재물: ${domain.wealth.join(" | ")}`,
    `- 직업: ${domain.career.join(" | ")}`,
    `- 차크라: ${domain.chakra.join(" | ")}`,
    `- 처방/루틴: ${domain.remedies.join(" | ")}`,
    "",
    "## 8) 궁합 컨텍스트",
    ...compatibilityLines,
    "",
    "## 9) 답변 작성 지시",
    ...guidanceLines,
    "- 출력 구조를 다음 순서로 고정:",
    "  1. 질문 요약(핵심 의도 2문장)",
    "  2. 베다 근거 해석(핵심 지표 5개 이상 인용)",
    "  3. 강점 3개 / 리스크 3개",
    "  4. 2주~6주 실행 계획(행동 5개)",
    "  5. 궁합 질문이면 관계 대화 가이드 3문장",
    "  6. 한 줄 결론",
    "",
    "## 10) 금지 규칙",
    "- 의료/법률/투자 확정 조언 금지",
    "- 공포 유발 문장 금지",
    "- 데이터 불충분 영역은 추가 입력 요청으로 처리",
  ].join("\n");

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
  ].join("\n");

  return {
    prompt,
    questionType,
    digestSource,
    compatibilityUsed: Boolean(compatibility),
    compatibilityHint,
  };
}
