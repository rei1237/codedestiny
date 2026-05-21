const UNKNOWN = "unknown";

const SUKYO_PDF_CHAPTERS = [
  {
    key: "destiny_essence",
    title: "Chapter 1. 나의 별이 말하는 운명의 본질",
    goal: "타고난 성향의 원형, 겉과 속의 욕망, 반복되는 인생 방향, 강점/오해의 패턴을 통합해 운명의 본질을 정의한다.",
  },
  {
    key: "personality_inner_texture",
    title: "Chapter 2. 타고난 성격과 내면의 결",
    goal: "감정 표현, 사고 방식, 대인 태도, 예민함과 자존심의 결을 섬세하게 풀고 성향을 활용하는 방향을 제시한다.",
  },
  {
    key: "talent_success",
    title: "Chapter 3. 재능과 성공 가능성",
    goal: "재능 유형과 성공 조건, 맞는 환경과 막히는 환경, 커리어/창작/사업/프리랜서 현실성을 구체적으로 해석한다.",
  },
  {
    key: "work_social_destiny",
    title: "Chapter 4. 일과 사회적 운명",
    goal: "사회적 역할, 조직/독립 적합성, 인정/오해 패턴, 반복 실패와 회피해야 할 구조, 장기 커리어 전략을 제시한다.",
  },
  {
    key: "money_reality",
    title: "Chapter 5. 돈과 현실 감각",
    goal: "돈을 다루는 심리와 습관, 수입 구조 적합성, 감정과 재물의 상호작용, 실행 가능한 재정 전략을 설명한다.",
  },
  {
    key: "love_destiny_pattern",
    title: "Chapter 6. 사랑과 인연의 방식",
    goal: "사랑에 빠지는 방식, 끌림과 적합성의 차이, 반복 문제, 경계선, 오래 가는 관계 운영법을 제시한다.",
  },
  {
    key: "relationships_benefactors",
    title: "Chapter 7. 인간관계와 귀인운",
    goal: "사람을 끌어들이고 밀어내는 패턴, 귀인/소모 관계 구분, 오해/이용 리스크, 인맥을 운으로 바꾸는 전략을 제시한다.",
  },
  {
    key: "emotion_shadow_recovery",
    title: "Chapter 8. 감정의 그림자와 마음의 회복",
    goal: "불안·외로움·분노 반응, 소진 패턴, 회복 조건(시간/공간/사람/리듬), 실전 회복법을 안내한다.",
  },
  {
    key: "turning_points_flow",
    title: "Chapter 9. 인생의 전환점과 운의 흐름",
    goal: "시기별 인생 분위기, 막힘/개방 신호, 관계·일·돈·거주·마음 변화의 패턴, 밀어붙임/대기 기준을 제시한다.",
  },
  {
    key: "healthy_rhythm_energy",
    title: "Chapter 10. 건강한 생활 리듬과 에너지 관리",
    goal: "의학적 단정 없이 생활 리듬 관점에서 소모/회복 구조를 분석하고 수면·식사·운동·휴식 루틴을 제안한다.",
  },
  {
    key: "near_future_strategy",
    title: "Chapter 11. 올해와 가까운 미래의 운용 전략",
    goal: "올해 집중 축, 확장/정비 시기 판단, 기회 신호, 주의 선택, 월별/분기별 실행 기준을 설계한다.",
  },
  {
    key: "life_master_plan",
    title: "Chapter 12. 숙요점 인생 마스터플랜",
    goal: "앞선 챕터를 통합해 핵심 성향 한 줄 정의, 강점/약점, 사랑·일·돈·관계·마음의 최종 전략을 봉서형 결론으로 제시한다.",
  },
];

const SUKYO_PDF_COMPAT_CHAPTERS = [
  {
    key: "compat_origin",
    title: "Chapter 1. 두 별의 본질과 관계의 시작",
    goal: "두 사람의 기본 기질, 첫 끌림, 관계의 핵심 테마를 압축해 설정한다.",
  },
  {
    key: "compat_emotion_dialogue",
    title: "Chapter 2. 감정 온도차와 대화 방식",
    goal: "감정 속도 차이, 애정 표현, 오해 패턴, 대화 복구법을 해석한다.",
  },
  {
    key: "compat_roles_balance",
    title: "Chapter 3. 사랑의 역할과 관계 균형",
    goal: "주도권과 책임, 기대 충돌, 역할 분담의 균형 전략을 제시한다.",
  },
  {
    key: "compat_reality",
    title: "Chapter 4. 현실 궁합",
    goal: "일·돈·생활 조건에서의 현실 적합성과 장기 운영 가능성을 분석한다.",
  },
  {
    key: "compat_surroundings_rhythm",
    title: "Chapter 5. 주변 사람과 생활 리듬",
    goal: "가족/친구/사회 관계의 영향, 회복 방식, 동거 리듬 적합성을 해석한다.",
  },
  {
    key: "compat_conflict_breakup",
    title: "Chapter 6. 갈등과 이별 위기",
    goal: "상처 트리거, 갈등 반응, 이별 위기 신호, 회복 조건을 구체화한다.",
  },
  {
    key: "compat_marriage_longterm",
    title: "Chapter 7. 결혼과 장기 파트너 가능성",
    goal: "결혼·동반자 구조의 현실 조건과 오래가기 위한 합의 원칙을 제시한다.",
  },
  {
    key: "compat_yearly_final",
    title: "Chapter 8. 올해 흐름과 최종 궁합 봉서",
    goal: "올해 관계 흐름, 강점/약점 총정리, 최종 궁합 봉서 조언을 완성한다.",
  },
];

function normalizeSukyoReportMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "compatibility" || mode === "couple" || mode === "compat") return "compatibility";
  return "personal";
}

function getSukyoPdfChapters(reportMode = "personal") {
  return normalizeSukyoReportMode(reportMode) === "compatibility"
    ? SUKYO_PDF_COMPAT_CHAPTERS
    : SUKYO_PDF_CHAPTERS;
}

const SUKYO_GENERAL_MEANINGS = {
  system:
    "숙요점은 달의 움직임과 27숙을 바탕으로 인간의 정서, 관계, 성향, 인연의 거리감을 해석하는 동양 점성술 체계다.",
  mainStar:
    "본명숙은 한 사람의 기본 정체성, 타고난 반응 방식, 무의식적 성향, 인연을 맺는 방식을 보여준다.",
  moonPhase:
    "월상은 감정의 리듬과 회복 방식, 관계에서 마음이 차오르고 비워지는 패턴을 보여준다.",
  relationship:
    "숙요점의 관계 해석은 사람과 사람 사이의 거리, 끌림, 충돌, 보완, 반복 패턴을 읽는 데 강점이 있다.",
  fallback:
    "세부 계산 데이터가 부족한 경우 본명숙, 기본 결과 요약, 달의 주기, 관계 성향 키워드를 바탕으로 보완 해석한다.",
};

const SUKYO_27_STARS_GENERAL = {
  meaning:
    "27숙은 달이 지나가는 27개의 별자리 구간으로 각 숙은 고유한 기질, 관계 패턴, 감정 반응, 운의 리듬을 상징한다.",
  fourDirections: {
    east: "동방칠수는 시작, 성장, 추진력, 생명력의 흐름과 연결된다.",
    north: "북방칠수는 깊은 감정, 저장, 인내, 내면의 생존력과 연결된다.",
    west: "서방칠수는 정리, 관계, 미감, 성숙, 수확의 흐름과 연결된다.",
    south: "남방칠수는 표현, 명예, 열정, 사회적 발산과 연결된다.",
  },
  fallback:
    "특정 본명숙 상세 데이터가 없으면 27숙 전체 원리와 기본 결과의 키워드를 중심으로 해석한다.",
};

const SUKYO_MOON_PHASE_MEANINGS = {
  newMoon: "삭에 가까운 달은 시작, 씨앗, 내면화, 잠재 가능성을 상징한다.",
  waxing: "차오르는 달은 성장, 확장, 감정의 상승, 외부로 향하는 의지를 상징한다.",
  fullMoon: "망에 가까운 달은 완성, 드러남, 관계의 반영, 감정의 극대화를 상징한다.",
  waning: "기우는 달은 정리, 비움, 회복, 내면으로 돌아가는 힘을 상징한다.",
  illumination:
    "조도는 감정이 외부로 얼마나 드러나는지, 자기 에너지가 얼마나 표현되는지 해석하는 보조 지표다.",
  elongation:
    "삭망각은 태양과 달의 거리감으로 의식과 무의식의 간격, 감정의 차오름과 비워짐을 읽는 보조 지표다.",
  missingFallback:
    "월상, 삭망각, 조도 데이터가 없으면 본명숙과 기본 정서 키워드를 중심으로 감정 리듬을 보완 해석한다.",
};

const SUKYO_RELATIONSHIP_MEANINGS = {
  upTae: {
    ko: "업태",
    meaning:
      "업태 관계는 깊은 인연감과 반복 과제를 동반하는 관계로 서로에게 강한 영향을 주지만 감정 소모도 생기기 쉽다.",
  },
  anGoe: {
    ko: "안괴",
    meaning:
      "안괴 관계는 강한 끌림과 긴장을 동시에 만들며 서로의 약점과 그림자를 자극하기 쉽다.",
  },
  youngChin: {
    ko: "영친",
    meaning:
      "영친 관계는 보호와 친밀감, 가족 같은 안정감을 만들기 쉬우나 의존성도 함께 관리해야 한다.",
  },
  seongWi: {
    ko: "성위",
    meaning:
      "성위 관계는 역할과 위치, 존중과 균형의 문제가 중요하게 작동하는 관계다.",
  },
  missingFallback:
    "상대 숙이나 관계 유형 데이터가 없으면 개인의 관계 감지력, 거리 조절 방식, 애착 패턴 중심으로 해석한다.",
};

const SUKYO_CHAPTER_FOCUS = {
  identity: "본명숙은 27숙 정체성, 타고난 기질, 세상에 반응하는 원형을 보여준다.",
  emotion: "달의 주기와 정서 리듬은 감정의 차오름/비움 방식과 회복법을 보여준다.",
  persona: "페르소나는 타인이 나를 기억하는 방식과 외부에서 보이는 에너지다.",
  wealth: "자산 감각은 돈을 모으고 쓰는 태도, 안정감을 얻는 방식, 생활 기반 습관을 보여준다.",
  work: "협업과 조직 적응은 타인과 맞물려 일할 때의 장점과 갈등 패턴을 보여준다.",
  relationship: "관계 감지력은 친밀감/경계/거리 조절 능력을 보여준다.",
  crisis: "위기와 전환은 무너질 때 다시 살아나는 방식과 내면 생존력을 보여준다.",
  family: "가족과 뿌리는 정서적 기반, 소속감, 유년기 감정 패턴을 보여준다.",
  desire: "욕망과 추진력은 행동의 내적 동기, 경쟁심, 성취 욕구를 보여준다.",
  spirituality: "내면 회복과 영성은 고독의 질, 마음 정화 방식, 보이지 않는 감각을 보여준다.",
};

const SUKYO_PDF_KNOWLEDGE_BASE = {
  general: SUKYO_GENERAL_MEANINGS,
  stars27: SUKYO_27_STARS_GENERAL,
  moon: SUKYO_MOON_PHASE_MEANINGS,
  relationship: SUKYO_RELATIONSHIP_MEANINGS,
  chapterFocus: SUKYO_CHAPTER_FOCUS,
};

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStringOrNull(value) {
  const v = value == null ? "" : String(value).trim();
  return v ? v : null;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeWaxing(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return UNKNOWN;
  if (v.includes("wax") || v.includes("차")) return "waxing";
  if (v.includes("wan") || v.includes("기")) return "waning";
  if (v.includes("new") || v.includes("삭")) return "new";
  if (v.includes("full") || v.includes("망") || v.includes("보름")) return "full";
  return UNKNOWN;
}

function normalizeGroup(value) {
  const v = String(value || "").trim();
  if (!v) return "unknown";
  if (v.includes("동")) return "동방칠수";
  if (v.includes("북")) return "북방칠수";
  if (v.includes("서")) return "서방칠수";
  if (v.includes("남")) return "남방칠수";
  return "unknown";
}

function pushMissing(list, path, condition) {
  if (!condition) list.push(path);
}

function pickFirst(...values) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string") {
      if (value.trim()) return value;
      continue;
    }
    return value;
  }
  return null;
}

function buildDomainScores(source = {}, fallbackKeywords = []) {
  const domains = [
    "identity",
    "emotion",
    "persona",
    "wealth",
    "work",
    "relationship",
    "crisis",
    "family",
    "desire",
    "spirituality",
  ];

  return domains.map((domain) => {
    const row = source?.[domain] || {};
    const summary = toStringOrNull(
      pickFirst(
        row.summary,
        row.description,
        row.theme,
        row.note,
      ),
    );
    const keywords = toArray(
      pickFirst(
        row.keywords,
        row.tags,
        row.points,
      ),
    )
      .map((v) => String(v || "").trim())
      .filter(Boolean);

    const finalKeywords = keywords.length ? keywords : fallbackKeywords.slice(0, 3);

    return {
      domain,
      score: toNumberOrNull(row.score),
      keywords: finalKeywords,
      summary,
      fallbackUsed: !summary && finalKeywords.length === 0,
    };
  });
}

function normalizeSukyoResultForPdf(input = {}) {
  const canonical = input?.canonical || {};
  const requestBody = input?.requestBody || {};
  const rawBasicResult = input?.rawBasicResult || null;

  const isCompatibility = Boolean(canonical?.personA || canonical?.personB);
  const reportMode = normalizeSukyoReportMode(
    pickFirst(
      requestBody?.mode,
      requestBody?.reportMode,
      requestBody?.reportType,
      isCompatibility ? "compatibility" : "personal",
    ),
  );
  const profileSource = isCompatibility ? (canonical?.personA || {}) : canonical;
  const natal = canonical?.natalSukuyo || {};
  const personASukuyo = canonical?.personA?.sukuyo || {};
  const moon = canonical?.lunarPhase || {};
  const attrs = canonical?.sukuyoAttributes || {};

  const userProfile = {
    name: toStringOrNull(pickFirst(profileSource?.name, canonical?.profile?.name, requestBody?.name)),
    gender: toStringOrNull(pickFirst(canonical?.profile?.gender, requestBody?.gender)),
    solarBirthDate: toStringOrNull(pickFirst(canonical?.profile?.birth?.solarDate, canonical?.profile?.birth?.date, profileSource?.birth?.solarDate)),
    lunarBirthDate: toStringOrNull(pickFirst(canonical?.profile?.birth?.lunarDate, profileSource?.birth?.lunarDate)),
    birthTime: toStringOrNull(pickFirst(canonical?.profile?.birth?.time, profileSource?.birth?.time)),
    birthPlace: toStringOrNull(pickFirst(requestBody?.birthPlace, requestBody?.place, requestBody?.city)),
    timezone: toStringOrNull(pickFirst(canonical?.profile?.birth?.timezone, requestBody?.timezone, requestBody?.timezoneName)),
  };

  const mainStarMissing = [];
  const mainStarName = toStringOrNull(pickFirst(natal?.nameKo, personASukuyo?.nameKo));
  const mainStarKey = toStringOrNull(
    pickFirst(
      natal?.nameKo,
      personASukuyo?.nameKo,
      natal?.index != null ? `idx-${natal.index}` : null,
      personASukuyo?.index != null ? `idx-${personASukuyo.index}` : null,
    ),
  );

  const mainStar = {
    key: mainStarKey,
    nameKo: mainStarName,
    nameHanja: toStringOrNull(pickFirst(natal?.nameHan, personASukuyo?.nameHan)),
    nameJp: toStringOrNull(pickFirst(natal?.nameJp, personASukuyo?.nameJp)),
    group: normalizeGroup(pickFirst(natal?.group, personASukuyo?.group, personASukuyo?.category)),
    animalSymbol: toStringOrNull(pickFirst(natal?.animalSymbol, personASukuyo?.animalSymbol)),
    coreKeyword: toStringOrNull(pickFirst(natal?.coreNature, toArray(natal?.keywords)[0], toArray(personASukuyo?.keywords)[0])),
    temperament: toStringOrNull(pickFirst(toArray(attrs?.temperament)[0], toArray(personASukuyo?.keywords)[0])),
    strength: toStringOrNull(pickFirst(toArray(natal?.strengths)[0], toArray(personASukuyo?.strengths)[0])),
    shadow: toStringOrNull(pickFirst(toArray(natal?.cautions)[0], toArray(personASukuyo?.shadows)[0])),
    fallbackUsed: false,
    missingFields: mainStarMissing,
  };

  pushMissing(mainStarMissing, "mainStar.key", Boolean(mainStar.key));
  pushMissing(mainStarMissing, "mainStar.nameKo", Boolean(mainStar.nameKo));
  pushMissing(mainStarMissing, "mainStar.coreKeyword", Boolean(mainStar.coreKeyword));
  mainStar.fallbackUsed = mainStarMissing.length > 0;

  const moonMissing = [];
  const moonData = {
    moonPhaseName: toStringOrNull(pickFirst(moon?.phaseName, moon?.label, canonical?.cycleData?.phaseName)),
    moonAge: toNumberOrNull(pickFirst(moon?.moonAge, canonical?.cycleData?.moonAge)),
    elongationAngle: toNumberOrNull(pickFirst(moon?.elongationAngle, moon?.phaseAngle, canonical?.cycleData?.phaseAngle)),
    illumination: toNumberOrNull(pickFirst(moon?.illumination, canonical?.cycleData?.illumination)),
    waxingOrWaning: normalizeWaxing(pickFirst(moon?.waxingOrWaning, moon?.phaseName, moon?.label)),
    lunarDay: toNumberOrNull(pickFirst(canonical?.profile?.birth?.lunarDay, profileSource?.birth?.lunarDay)),
    fallbackUsed: false,
    missingFields: moonMissing,
  };

  pushMissing(moonMissing, "moon.moonPhaseName", Boolean(moonData.moonPhaseName));
  pushMissing(moonMissing, "moon.elongationAngle", moonData.elongationAngle != null);
  pushMissing(moonMissing, "moon.illumination", moonData.illumination != null);
  moonData.fallbackUsed = moonMissing.length > 0;

  const personaMissing = [];
  const persona = {
    ascLikePattern: toStringOrNull(pickFirst(toArray(attrs?.temperament)[0], canonical?.lifeDomains?.persona?.archetypeTitle)),
    firstImpressionKeyword: toStringOrNull(pickFirst(toArray(attrs?.relationshipStyle)[0], toArray(natal?.keywords)[0])),
    rememberedAs: toStringOrNull(pickFirst(canonical?.lifeDomains?.persona?.archetypeTitle, natal?.archetypeTitle)),
    socialMask: toStringOrNull(pickFirst(canonical?.lifeDomains?.persona?.summary, canonical?.lifeDomains?.persona?.description)),
    fallbackUsed: false,
    missingFields: personaMissing,
  };

  pushMissing(personaMissing, "persona.firstImpressionKeyword", Boolean(persona.firstImpressionKeyword));
  pushMissing(personaMissing, "persona.rememberedAs", Boolean(persona.rememberedAs));
  persona.fallbackUsed = personaMissing.length > 0;

  const relationSource = canonical?.compatibility || {};
  const relationshipMissing = [];
  const relationship = {
    relationType: toStringOrNull(pickFirst(relationSource?.relationType, relationSource?.relationshipType)),
    distance: toNumberOrNull(pickFirst(relationSource?.shortestDistance, relationSource?.distance)),
    partnerStar: toStringOrNull(pickFirst(canonical?.personB?.sukuyo?.nameKo, relationSource?.partnerStar)),
    compatibilityIndex: toNumberOrNull(relationSource?.compatibilityIndex),
    relationVariant: toStringOrNull(relationSource?.relationVariant),
    distanceMetrics: relationSource?.distanceMetrics && typeof relationSource.distanceMetrics === "object" ? relationSource.distanceMetrics : null,
    roleActionGuide: relationSource?.roleActionGuide && typeof relationSource.roleActionGuide === "object" ? relationSource.roleActionGuide : null,
    elementHarmony: relationSource?.elementHarmony && typeof relationSource.elementHarmony === "object" ? relationSource.elementHarmony : null,
    strengthShadowMap: relationSource?.strengthShadowMap && typeof relationSource.strengthShadowMap === "object" ? relationSource.strengthShadowMap : null,
    emotionalPattern: toStringOrNull(pickFirst(canonical?.relationshipMatrix?.emotionalPattern?.summary, relationSource?.emotionalCompatibility)),
    conflictPattern: toStringOrNull(pickFirst(canonical?.relationshipMatrix?.conflictPattern?.summary, relationSource?.conflictPattern)),
    fallbackUsed: false,
    missingFields: relationshipMissing,
  };

  pushMissing(relationshipMissing, "relationship.relationType", Boolean(relationship.relationType));
  pushMissing(relationshipMissing, "relationship.distance", relationship.distance != null);
  relationship.fallbackUsed = relationshipMissing.length > 0;

  const domainScores = buildDomainScores(canonical?.lifeDomains || {}, [
    toStringOrNull(mainStar.coreKeyword),
    toStringOrNull(mainStar.temperament),
    toStringOrNull(mainStar.strength),
  ].filter(Boolean));

  const missingSummary = [];
  if (!userProfile.solarBirthDate) missingSummary.push("userProfile.solarBirthDate");
  if (!mainStar.nameKo) missingSummary.push("mainStar.nameKo");
  if (!moonData.moonPhaseName && moonData.elongationAngle == null && moonData.illumination == null) {
    missingSummary.push("moon.phaseData");
  }
  if (!relationship.relationType) missingSummary.push("relationship.relationType");

  const chartMeta = {
    calculationSource: toStringOrNull(
      pickFirst(
        canonical?.calculationMeta?.engine,
        canonical?.calculationMeta?.calendarSource,
        canonical?.calculationMeta?.calculationSource,
        input?.calculationSource,
      ),
    ) || "fallback",
    lunarCalendarSource: toStringOrNull(pickFirst(canonical?.calculationMeta?.calendarSource, canonical?.calculationMeta?.source)),
    generatedAt: new Date().toISOString(),
  };

  return {
    reportMode,
    userProfile,
    chartMeta,
    mainStar,
    moon: moonData,
    persona,
    relationship,
    domainScores,
    rawBasicResult,
    missingSummary,
    knowledgeBase: SUKYO_PDF_KNOWLEDGE_BASE,
  };
}

function validateSukyoPdfInput(context = {}) {
  const missingFields = [];
  const hasBirthInfo = Boolean(context?.userProfile?.solarBirthDate || context?.userProfile?.name);
  const hasBasicText = Boolean(
    context?.mainStar?.nameKo
    || context?.mainStar?.coreKeyword
    || toArray(context?.domainScores).some((row) => Boolean(row?.summary) || toArray(row?.keywords).length > 0),
  );

  if (!hasBirthInfo) missingFields.push("userProfile");
  if (!hasBasicText) missingFields.push("basicResultText");

  return {
    canGenerate: hasBirthInfo || hasBasicText,
    hasBirthInfo,
    hasBasicText,
    missingFields,
  };
}

function buildSukyoPdfContext(input = {}) {
  return normalizeSukyoResultForPdf(input);
}

function extractLongSentences(text, minLength = 30) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength);
}

function collectPreviousSentenceBanList(previousTexts = [], limit = 12) {
  const freq = new Map();
  (previousTexts || []).forEach((txt) => {
    extractLongSentences(txt, 30).forEach((line) => {
      const count = freq.get(line) || 0;
      freq.set(line, count + 1);
    });
  });
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([line]) => line);
}

function buildSukyoGeminiPrompt({ context, chapter, previousChapterTexts = [] }) {
  const safeContext = context || {};
  const reportMode = normalizeSukyoReportMode(safeContext.reportMode);
  const chapterTitle = chapter?.title || "Sukyo Chapter";
  const chapterGoal = chapter?.goal || "숙요 해석";
  const previousBanList = collectPreviousSentenceBanList(previousChapterTexts, 12);
  const chapterCatalog = getSukyoPdfChapters(reportMode)
    .map((row, idx) => `${idx + 1}. ${row.title}`)
    .join("\n");

  const modeSpecificRules = reportMode === "compatibility"
    ? [
      "궁합 리포트에서는 관계 해석에 필요한 범위를 넘는 개인 인생 총론 반복을 금지한다.",
      "반드시 다음 요소만으로 챕터를 구성한다: 두 사람 기질, 첫 끌림, 감정 온도차, 애정 표현, 성격 충돌, 대화 방식, 역할 분담, 주도권/책임, 일·돈 현실 궁합, 주변 사람 영향, 생활 리듬/동거 가능성, 갈등/상처 패턴, 이별 위기/회복 조건, 결혼/장기 파트너 가능성, 올해 흐름, 강점/약점, 최종 궁합 봉서.",
      "A/B 개인 성향은 관계 해석에 필요한 만큼만 압축해 넣고 장문 개인 운세를 확장하지 않는다.",
      "본문에서 계산 근거, 내부 JSON 키, 내부 데이터 구조를 직접 노출하지 않는다.",
    ]
    : [
      "개인 리포트는 운명의 본질 → 성향 → 재능 → 사회/일 → 돈 → 사랑 → 인간관계 → 감정 회복 → 전환점 → 생활 리듬 → 올해 전략 → 마스터플랜 순서로 전개한다.",
      "강점과 그림자를 동시에 다루고, 단정 예언 대신 실행 가능한 현실 전략으로 마무리한다.",
      "본문에서 계산 근거, 내부 JSON 키, 내부 데이터 구조를 직접 노출하지 않는다.",
    ];

  const systemPrompt = [
    "너는 30년차 숙요점 전문가이자 27숙과 달의 리듬을 현대어로 해석하는 프리미엄 숙요점 PDF 작가다.",
    "계산은 하지 않는다. 제공된 숙요점 JSON과 knowledgeBase만 사용한다.",
    "본명숙/월상/삭망각/조도/관계유형/관계거리를 임의로 만들지 않는다.",
    "데이터가 부족하면 부족하다고 명시하되 생성을 중단하지 않는다.",
    "건강/가족/관계/위기/재물은 단정 예언이 아니라 경향과 전략으로 쓴다.",
    "이전 챕터와 동일 문장/동일 해석 프레이밍 재사용을 금지한다.",
    "챕터는 반드시 단계적으로 쓴다: (1) 핵심 진단 (2) 패턴 해석 (3) 현실 적용 전략 (4) 행동 기준 요약.",
    ...modeSpecificRules,
    "반드시 JSON 하나로만 응답한다.",
  ].join("\n");

  const userPrompt = [
    "다음은 프리미엄 숙요점 PDF 생성을 위한 정규화된 데이터다.",
    `[리포트 모드] ${reportMode}`,
    "[모드별 챕터 구성표]",
    chapterCatalog,
    "[사용자 정보]",
    JSON.stringify(safeContext.userProfile || {}, null, 2),
    "[차트 메타 정보]",
    JSON.stringify(safeContext.chartMeta || {}, null, 2),
    "[본명숙 정보]",
    JSON.stringify(safeContext.mainStar || {}, null, 2),
    "[달의 주기 정보]",
    JSON.stringify(safeContext.moon || {}, null, 2),
    "[페르소나 정보]",
    JSON.stringify(safeContext.persona || {}, null, 2),
    "[관계 정보]",
    JSON.stringify(safeContext.relationship || {}, null, 2),
    "[영역별 요약 점수 및 키워드]",
    JSON.stringify(safeContext.domainScores || [], null, 2),
    "[기본 숙요점 원본 결과]",
    JSON.stringify(safeContext.rawBasicResult || {}, null, 2),
    "[누락 데이터 요약]",
    JSON.stringify(safeContext.missingSummary || [], null, 2),
    previousBanList.length ? "[이전 챕터와 중복 금지 문장]" : null,
    previousBanList.length ? JSON.stringify(previousBanList, null, 2) : null,
    "[숙요점 Knowledge Base]",
    JSON.stringify(safeContext.knowledgeBase || {}, null, 2),
    "[작성할 챕터]",
    chapterTitle,
    "[챕터 작성 목표]",
    chapterGoal,
    "[작성 제한]",
    "- 본문은 완성형 상담문으로 작성한다.",
    "- 본문에 계산 근거/내부 데이터/JSON 키를 직접 출력하지 않는다.",
    "- 궁합 모드에서는 개인 인생 총론을 길게 반복하지 않는다.",
    "[출력 형식]",
    "{",
    '  "chapterKey": "string",',
    '  "chapterTitle": "string",',
    '  "chapterSubtitle": "string",',
    '  "summary": "string",',
    '  "coreReading": "string",',
    '  "sections": [{ "heading": "string", "body": "string" }],',
    '  "practicalAdvice": ["string"],',
    '  "cautions": ["string"],',
    '  "ritualOrRoutine": ["string"],',
    '  "masterKeyword": "string",',
    '  "missingDataNotice": "string | null"',
    "}",
  ].join("\n");

  return [systemPrompt, "", userPrompt].join("\n\n");
}

function stripMarkdownFences(text) {
  const raw = String(text || "").trim();
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function tryRepairJson(text) {
  const src = String(text || "");
  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let body = src.slice(start, end + 1);
  body = body.replace(/,\s*([}\]])/g, "$1");
  return body;
}

function parseSukyoGeminiChapterResponse(text) {
  const cleaned = stripMarkdownFences(text);
  if (!cleaned) {
    return {
      ok: false,
      error: "EMPTY_RESPONSE",
      parsed: null,
    };
  }

  try {
    return { ok: true, parsed: JSON.parse(cleaned), repaired: false };
  } catch (_) {
    const repaired = tryRepairJson(cleaned);
    if (!repaired) {
      return { ok: false, error: "JSON_PARSE_FAILED", parsed: null };
    }
    try {
      return { ok: true, parsed: JSON.parse(repaired), repaired: true };
    } catch {
      return { ok: false, error: "JSON_REPAIR_FAILED", parsed: null };
    }
  }
}

function sanitizeList(list, fallback = []) {
  if (!Array.isArray(list)) return fallback;
  const out = list.map((v) => String(v || "").trim()).filter(Boolean);
  return out.length ? out : fallback;
}

function sanitizeSections(sections, fallbackSummary) {
  if (!Array.isArray(sections)) {
    return fallbackSummary
      ? [{ heading: "핵심 해석", body: String(fallbackSummary) }]
      : [];
  }
  return sections
    .map((item) => ({
      heading: String(item?.heading || "").trim(),
      body: String(item?.body || "").trim(),
    }))
    .filter((item) => item.heading && item.body);
}

function createFallbackSukyoChapter(chapter, context, reason = "") {
  const reportMode = normalizeSukyoReportMode(context?.reportMode);
  const subtitle = reportMode === "compatibility"
    ? "궁합 리포트용 보완 해석"
    : "기본 숙요점 결과 기반 보완 해석";
  return {
    chapterKey: String(chapter?.key || "unknown"),
    chapterTitle: String(chapter?.title || "숙요점 챕터"),
    chapterSubtitle: subtitle,
    summary:
      "이 챕터의 일부 세부 데이터가 확인되지 않아, 제공된 기본 숙요점 결과와 27숙 해석 체계를 바탕으로 보완 해석을 제공합니다.",
    coreReading:
      "현재 확인 가능한 본명숙, 달의 리듬, 기본 성향 키워드를 중심으로 이 영역의 핵심 흐름을 해석합니다.",
    sections: [
      {
        heading: "확인 가능한 숙요점 정보 중심 해석",
        body:
          "일부 확장 데이터가 없더라도 기본 숙요점 결과는 개인의 정서, 관계 감각, 삶의 리듬을 읽는 데 충분한 단서를 제공합니다. 이 챕터는 확인 가능한 숙요점 정보를 중심으로 작성되었습니다.",
      },
    ],
    practicalAdvice: [
      "현재 확인 가능한 숙요점 키워드에서 반복적으로 강조되는 정서 패턴과 관계 습관을 우선 점검하세요.",
    ],
    cautions: [
      "확장 데이터가 없는 경우 특정 관계 유형, 월상 수치, 사건 시기를 단정하지 않는 것이 좋습니다.",
    ],
    ritualOrRoutine: [
      "하루 중 혼자 감정을 정리하는 시간을 두고, 관계에서 느낀 신호를 짧게 기록하세요.",
    ],
    masterKeyword: "기본 숙요점 기반 보완",
    missingDataNotice:
      reportMode === "compatibility"
        ? "일부 확장 데이터가 없어 관계 핵심 신호 중심으로 보완 생성된 궁합 챕터입니다."
        : "일부 확장 데이터가 없어 기본 숙요점 결과 중심으로 생성된 챕터입니다.",
    fallbackUsed: true,
    fallbackReason: reason || "CHAPTER_FALLBACK",
    contextHint: {
      missingSummary: toArray(context?.missingSummary),
    },
  };
}

function sanitizeSukyoChapterJson(chapter, rawJson, context) {
  const fallback = createFallbackSukyoChapter(chapter, context, "SANITIZE_FALLBACK");
  const source = rawJson && typeof rawJson === "object" ? rawJson : {};

  const summary = toStringOrNull(source.summary) || fallback.summary;
  const coreReading = toStringOrNull(source.coreReading) || summary || fallback.coreReading;
  const sections = sanitizeSections(source.sections, summary);

  return {
    chapterKey: toStringOrNull(source.chapterKey) || String(chapter?.key || fallback.chapterKey),
    chapterTitle: toStringOrNull(source.chapterTitle) || String(chapter?.title || fallback.chapterTitle),
    chapterSubtitle: toStringOrNull(source.chapterSubtitle) || fallback.chapterSubtitle,
    summary,
    coreReading,
    sections: sections.length ? sections : fallback.sections,
    practicalAdvice: sanitizeList(source.practicalAdvice, fallback.practicalAdvice),
    cautions: sanitizeList(source.cautions, fallback.cautions),
    ritualOrRoutine: sanitizeList(source.ritualOrRoutine, fallback.ritualOrRoutine),
    masterKeyword: toStringOrNull(source.masterKeyword) || fallback.masterKeyword,
    missingDataNotice: toStringOrNull(source.missingDataNotice),
    fallbackUsed: false,
    fallbackReason: "",
  };
}

function renderSukyoChapterMarkdown(chapterJson, chapterFallbackMeta = null) {
  const c = chapterJson || {};
  const title = String(c.chapterTitle || chapterFallbackMeta?.title || "숙요점 챕터");
  const subtitle = String(c.chapterSubtitle || "").trim();
  const summary = String(c.summary || c.coreReading || "").trim();
  const coreReading = String(c.coreReading || "").trim();

  const lines = [];
  lines.push(`# ${title}`);
  if (subtitle) lines.push(`> ${subtitle}`);
  if (summary) lines.push("", summary);
  if (coreReading && coreReading !== summary) lines.push("", `## 핵심 리딩`, coreReading);

  const sections = Array.isArray(c.sections) ? c.sections : [];
  for (const section of sections) {
    const heading = String(section?.heading || "").trim();
    const body = String(section?.body || "").trim();
    if (!heading || !body) continue;
    lines.push("", `## ${heading}`, body);
  }

  const practicalAdvice = sanitizeList(c.practicalAdvice);
  if (practicalAdvice.length) {
    lines.push("", "## 실천 조언");
    practicalAdvice.forEach((item) => lines.push(`- ${item}`));
  }

  const cautions = sanitizeList(c.cautions);
  if (cautions.length) {
    lines.push("", "## 주의 포인트");
    cautions.forEach((item) => lines.push(`- ${item}`));
  }

  const routine = sanitizeList(c.ritualOrRoutine);
  if (routine.length) {
    lines.push("", "## 회복 루틴");
    routine.forEach((item) => lines.push(`- ${item}`));
  }

  const keyword = toStringOrNull(c.masterKeyword);
  if (keyword) {
    lines.push("", `## 마스터 키워드`, keyword);
  }

  const notice = toStringOrNull(c.missingDataNotice);
  if (notice) {
    lines.push("", "## 데이터 안내", notice);
  }

  return lines.join("\n").trim();
}

export {
  SUKYO_PDF_CHAPTERS,
  SUKYO_PDF_COMPAT_CHAPTERS,
  SUKYO_GENERAL_MEANINGS,
  SUKYO_27_STARS_GENERAL,
  SUKYO_MOON_PHASE_MEANINGS,
  SUKYO_RELATIONSHIP_MEANINGS,
  SUKYO_CHAPTER_FOCUS,
  SUKYO_PDF_KNOWLEDGE_BASE,
  getSukyoPdfChapters,
  normalizeSukyoResultForPdf,
  validateSukyoPdfInput,
  buildSukyoPdfContext,
  buildSukyoGeminiPrompt,
  parseSukyoGeminiChapterResponse,
  createFallbackSukyoChapter,
  sanitizeSukyoChapterJson,
  renderSukyoChapterMarkdown,
};
