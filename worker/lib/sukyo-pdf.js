const UNKNOWN = "unknown";

const SUKYO_PDF_CHAPTERS = [
  {
    key: "solo_ch_01",
    title: "1장. 본명숙과 인생 원형",
    goal: "본명숙, 27숙 그룹, 핵심 기질을 통해 삶의 기본 원형을 해석한다.",
    targetChars: 6400,
    minChars: 4800,
    sections: ["본명숙의 핵심 정체성", "타고난 강점과 그림자", "관계에서 먼저 드러나는 반응", "삶 전체를 관통하는 운의 주제"],
  },
  {
    key: "solo_ch_02",
    title: "2장. 감정 리듬과 마음의 회복법",
    goal: "달의 흐름과 정서 패턴을 통해 감정 리듬과 회복 루틴을 읽는다.",
    targetChars: 6200,
    minChars: 4700,
    sections: ["감정이 차오르고 식는 방식", "불안과 예민함을 자극하는 포인트", "혼자 회복할 때 필요한 조건", "정서 에너지를 안정시키는 루틴"],
  },
  {
    key: "solo_ch_03",
    title: "3장. 사회적 페르소나와 인간관계",
    goal: "타인이 기억하는 인상과 사회적 상호작용 패턴을 정리한다.",
    targetChars: 6200,
    minChars: 4700,
    sections: ["첫인상과 존재감의 구조", "신뢰를 쌓는 방식", "오해받기 쉬운 지점", "관계에서 지켜야 할 경계선"],
  },
  {
    key: "solo_ch_04",
    title: "4장. 사랑, 애착, 친밀감의 작동 방식",
    goal: "연애와 친밀감에서 반복되는 패턴을 해석한다.",
    targetChars: 6400,
    minChars: 4800,
    sections: ["사랑을 시작하는 방식", "가까워질수록 드러나는 그림자", "애착과 거리 조절 습관", "오래 가는 관계를 만드는 조건"],
  },
  {
    key: "solo_ch_05",
    title: "5장. 일, 돈, 현실 감각",
    goal: "일과 재정에서 숙요가 만드는 현실 운영 감각을 해석한다.",
    targetChars: 6200,
    minChars: 4700,
    sections: ["일할 때 강해지는 재능", "스트레스가 커지는 업무 환경", "돈을 다루는 기본 태도", "성과를 안정화하는 실행 전략"],
  },
  {
    key: "solo_ch_06",
    title: "6장. 위기 대응과 전환기 전략",
    goal: "위기 상황의 반응, 회복력, 전환기 의사결정 원칙을 정리한다.",
    targetChars: 6200,
    minChars: 4700,
    sections: ["무너질 때 드러나는 본능", "반복되는 위기 패턴", "회복 속도를 높이는 조건", "전환기 결정을 잘하는 방법"],
  },
  {
    key: "solo_ch_07",
    title: "7장. 가족, 뿌리, 내적 기반",
    goal: "가족 정서와 내적 안전기반이 삶에 미치는 영향을 읽는다.",
    targetChars: 6200,
    minChars: 4700,
    sections: ["가족 안에서 맡게 되는 역할", "정서적 기반의 강점과 취약점", "반복되는 보호 본능", "안정감을 지키는 생활 구조"],
  },
  {
    key: "solo_ch_08",
    title: "8장. 향후 90일 실행 로드맵",
    goal: "핵심 해석을 삶의 운영 전략으로 종합한다.",
    targetChars: 6600,
    minChars: 5000,
    sections: ["지금 가장 먼저 손봐야 할 습관", "관계에서 기억해야 할 규칙", "일과 성취를 위한 우선순위", "향후 90일 실행 계획"],
  },
];

const SUKYO_PDF_COMPAT_CHAPTERS = [
  {
    key: "compat_ch_01",
    title: "1장. 두 사람의 본명숙과 첫 끌림의 구조",
    goal: "A/B 본명숙, 기본 기질, 첫 인상과 초반 흡인력을 해석한다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["A의 본명숙과 관계 반응", "B의 본명숙과 관계 반응", "처음 끌림이 생기는 이유", "서로를 오해하기 쉬운 첫 포인트", "관계의 출발선 정리"],
  },
  {
    key: "compat_ch_02",
    title: "2장. 관계 유형과 거리감이 만드는 운명의 구조",
    goal: "relationType과 distance를 중심으로 두 사람의 핵심 궁합 구조를 해석한다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["관계 유형의 본질", "거리감이 만드는 심리 메커니즘", "A가 B에게 주는 영향", "B가 A에게 주는 영향", "이 관계를 지배하는 기본 규칙"],
  },
  {
    key: "compat_ch_03",
    title: "3장. 감정선과 애착 온도차",
    goal: "감정 리듬, 애착 속도, 서운함이 쌓이는 경로를 읽는다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["감정 표현 속도의 차이", "서운함이 쌓이는 메커니즘", "안정감을 느끼는 조건", "정서 회복 방식의 차이", "감정 조율법"],
  },
  {
    key: "compat_ch_04",
    title: "4장. 갈등과 그림자의 충돌 패턴",
    goal: "갈등 촉발점과 그림자 반응, 회복 프로토콜을 구체화한다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["갈등의 점화 포인트", "서로의 그림자가 충돌하는 순간", "싸움이 길어지는 이유", "관계를 망치지 않는 대화 규칙", "갈등 후 회복 프로토콜"],
  },
  {
    key: "compat_ch_05",
    title: "5장. 사랑의 몰입도와 현실 적합성",
    goal: "연애 몰입, 생활 궁합, 장기 유지 가능성을 현실적으로 점검한다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["연애 초반 몰입도", "현실 생활 궁합", "함께 있을 때 강해지는 영역", "생활 패턴 충돌 포인트", "장기 유지 가능성"],
  },
  {
    key: "compat_ch_06",
    title: "6장. 소통, 신뢰, 경계선의 협상",
    goal: "대화 습관과 신뢰 형성, 경계선 조율 방식을 해석한다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["말이 잘 통하는 순간", "오해가 커지는 언어 습관", "신뢰를 만드는 행동", "서로의 경계선 이해", "건강한 합의 방식"],
  },
  {
    key: "compat_ch_07",
    title: "7장. 재회, 이별, 반복 인연의 가능성",
    goal: "반복 인연과 재회 가능성, 놓아야 할 시그널을 읽는다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["헤어짐이 반복되는 이유", "재회의 조건", "놓아야 할 시그널", "다시 만난다면 필요한 변화", "인연의 학습 과제"],
  },
  {
    key: "compat_ch_08",
    title: "8장. 결혼, 동거, 장기 파트너십 적합성",
    goal: "장기 생활과 책임 분배, 안정화 조건을 분석한다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["장기 파트너십의 장점", "생활 운영에서 부딪히는 지점", "책임과 역할 분배", "같이 살 때 필요한 규칙", "장기 안정화 조건"],
  },
  {
    key: "compat_ch_09",
    title: "9장. 서로를 성장시키는 힘과 위험 신호",
    goal: "성장 자극과 에너지 소모, 관계 보호 장치를 정리한다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["서로를 성장시키는 자극", "에너지 소모 패턴", "피해야 할 행동 고리", "보완이 잘 되는 순간", "관계를 지키는 핵심 장치"],
  },
  {
    key: "compat_ch_10",
    title: "10장. 두 사람을 위한 실행형 궁합 로드맵",
    goal: "전체 궁합을 행동 규칙과 실행 계획으로 종합한다.",
    targetChars: 7600,
    minChars: 6000,
    sections: ["핵심 궁합 결론", "지금 당장 바꿔야 할 행동", "감정 소모를 줄이는 습관", "장기 관계 운영 규칙", "향후 90일 실행 로드맵"],
  },
];

function normalizeSukyoReportMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "compatibility" || mode === "couple" || mode === "compat") return "compatibility";
  if (mode === "personal" || mode === "solo" || mode === "single") return "personal";
  return "personal";
}

function getSukyoPdfChapters(reportMode = "personal") {
  const mode = normalizeSukyoReportMode(reportMode);
  const source = mode === "compatibility" ? SUKYO_PDF_COMPAT_CHAPTERS : SUKYO_PDF_CHAPTERS;
  return source.map((chapter) => ({
    ...chapter,
    sections: Array.isArray(chapter.sections) ? chapter.sections.slice() : [],
  }));
}

function toCalendarType(value) {
  const token = String(value || "").trim().toLowerCase();
  if (token.includes("lunar") || token.includes("음")) return "lunar";
  if (token.includes("solar") || token.includes("양")) return "solar";
  return "solar";
}

function collectAvailableFields(bookContext) {
  const available = [];
  const push = (path, condition) => {
    if (condition) available.push(path);
  };
  push("user.profile.birthDate", Boolean(bookContext?.user?.profile?.birthDate));
  push("user.profile.calendarType", Boolean(bookContext?.user?.profile?.calendarType));
  push("user.profile.gender", Boolean(bookContext?.user?.profile?.gender));
  push("user.sukuyo.mansion", Boolean(bookContext?.user?.sukuyo?.mansion));
  push("user.sukuyo.mansionNumber", Number.isFinite(Number(bookContext?.user?.sukuyo?.mansionNumber)));
  push("user.sukuyo.personalitySummary", Boolean(bookContext?.user?.sukuyo?.personalitySummary));
  push("user.sukuyo.loveStyle", Boolean(bookContext?.user?.sukuyo?.loveStyle));
  push("user.sukuyo.relationshipStyle", Boolean(bookContext?.user?.sukuyo?.relationshipStyle));
  push("user.sukuyo.careerStyle", Boolean(bookContext?.user?.sukuyo?.careerStyle));
  push("user.sukuyo.moneyStyle", Boolean(bookContext?.user?.sukuyo?.moneyStyle));
  push("user.sukuyo.fortuneFlow", Boolean(bookContext?.user?.sukuyo?.fortuneFlow));
  push("partner.profile.birthDate", Boolean(bookContext?.partner?.profile?.birthDate));
  push("partner.sukuyo.mansion", Boolean(bookContext?.partner?.sukuyo?.mansion));
  push("compatibility.relationType", Boolean(bookContext?.compatibility?.relationType));
  push("compatibility.distanceType", Boolean(bookContext?.compatibility?.distanceType));
  push("compatibility.score", bookContext?.compatibility?.score != null);
  push("compatibility.grade", Boolean(bookContext?.compatibility?.grade));
  return available;
}

function collectMissingFields(bookContext) {
  const missing = [];
  const mode = normalizeSukyoReportMode(bookContext?.mode);
  const requireField = (path, condition) => {
    if (!condition) missing.push(path);
  };

  requireField("user.profile.birthDate", Boolean(bookContext?.user?.profile?.birthDate));
  requireField("user.sukuyo.mansion", Boolean(bookContext?.user?.sukuyo?.mansion));
  if (mode === "compatibility") {
    requireField("partner.profile.birthDate", Boolean(bookContext?.partner?.profile?.birthDate));
    requireField("partner.sukuyo.mansion", Boolean(bookContext?.partner?.sukuyo?.mansion));
  }
  return missing;
}

function buildSukuyoPdfSeed(input = {}) {
  const reportMode = normalizeSukyoReportMode(input?.reportMode || input?.mode || input?.reportType);
  const chapterPlan = getSukyoPdfChapters(reportMode);
  const selectedProfile = input?.selectedProfile && typeof input.selectedProfile === "object"
    ? input.selectedProfile
    : (input?.profile && typeof input.profile === "object" ? input.profile : (input?.userProfile && typeof input.userProfile === "object" ? input.userProfile : {}));
  const partnerProfile = input?.partnerProfile && typeof input.partnerProfile === "object"
    ? input.partnerProfile
    : (input?.partner && typeof input.partner === "object" ? input.partner : {});
  const birthInput = input?.birthInput && typeof input.birthInput === "object"
    ? input.birthInput
    : (input?.birth && typeof input.birth === "object" ? input.birth : {});
  const partnerInput = input?.partnerInput && typeof input.partnerInput === "object"
    ? input.partnerInput
    : (input?.partnerBirth && typeof input.partnerBirth === "object" ? input.partnerBirth : {});
  const calendarType = toCalendarType(pickFirst(
    selectedProfile?.calendarType,
    selectedProfile?.calType,
    birthInput?.calendarType,
    birthInput?.calType,
    input?.calendarType,
    input?.calType,
    "solar",
  ));
  const partnerCalendarType = toCalendarType(pickFirst(
    partnerProfile?.calendarType,
    partnerProfile?.calType,
    partnerInput?.calendarType,
    partnerInput?.calType,
    input?.partnerCalendarType,
    input?.partnerCalType,
    "solar",
  ));
  const selectedProfileId = toStringOrNull(pickFirst(
    selectedProfile?.profileId,
    selectedProfile?.id,
    input?.selectedProfileId,
    input?.profileId,
  ));
  const partnerProfileId = toStringOrNull(pickFirst(
    partnerProfile?.profileId,
    partnerProfile?.id,
    input?.partnerProfileId,
  ));
  const reportPayload = {
    reportMode,
    mode: reportMode,
    selectedProfileId,
    selectedProfileName: toStringOrNull(pickFirst(selectedProfile?.name, input?.profileName, input?.name)),
    selectedProfileGender: toStringOrNull(pickFirst(selectedProfile?.gender, input?.gender)),
    birthInput: {
      year: toNumberOrNull(pickFirst(birthInput?.year, input?.year)),
      month: toNumberOrNull(pickFirst(birthInput?.month, input?.month)),
      day: toNumberOrNull(pickFirst(birthInput?.day, input?.day)),
      hour: toNumberOrNull(pickFirst(birthInput?.hour, input?.hour)),
      minute: toNumberOrNull(pickFirst(birthInput?.minute, input?.minute)),
      calendarType,
      calType: calendarType,
      isLunar: calendarType === "lunar",
      isLeap: Boolean(pickFirst(birthInput?.isLeap, input?.isLeap)),
      timeUnknown: Boolean(pickFirst(birthInput?.timeUnknown, input?.timeUnknown, input?.birthTimeUnknown)),
      timezone: toStringOrNull(pickFirst(birthInput?.timezone, input?.timezone, input?.timezoneName)) || "Asia/Seoul",
      lat: toNumberOrNull(pickFirst(birthInput?.lat, input?.lat)),
      lon: toNumberOrNull(pickFirst(birthInput?.lon, input?.lon)),
    },
    partnerInput: reportMode === "compatibility" ? {
      partnerProfileId,
      partnerName: toStringOrNull(pickFirst(partnerProfile?.name, input?.partnerName)),
      partnerGender: toStringOrNull(pickFirst(partnerProfile?.gender, input?.partnerGender)),
      year: toNumberOrNull(pickFirst(partnerInput?.year, input?.partnerYear)),
      month: toNumberOrNull(pickFirst(partnerInput?.month, input?.partnerMonth)),
      day: toNumberOrNull(pickFirst(partnerInput?.day, input?.partnerDay)),
      hour: toNumberOrNull(pickFirst(partnerInput?.hour, input?.partnerHour)),
      minute: toNumberOrNull(pickFirst(partnerInput?.minute, input?.partnerMinute)),
      calendarType: partnerCalendarType,
      calType: partnerCalendarType,
      isLunar: partnerCalendarType === "lunar",
      isLeap: Boolean(pickFirst(partnerInput?.isLeap, input?.partnerIsLeap)),
      timeUnknown: Boolean(pickFirst(partnerInput?.timeUnknown, input?.partnerTimeUnknown)),
      timezone: toStringOrNull(pickFirst(partnerInput?.timezone, input?.partnerTimezone)) || "Asia/Seoul",
    } : null,
    selectedProfile: selectedProfile && typeof selectedProfile === "object" ? selectedProfile : {},
    partnerProfile: reportMode === "compatibility" && partnerProfile && typeof partnerProfile === "object" ? partnerProfile : null,
    chapterCount: chapterPlan.length,
    chapterKeys: chapterPlan.map((chapter) => String(chapter?.key || "")).filter(Boolean),
    chapterCatalog: chapterPlan.map((chapter, idx) => ({
      index: idx + 1,
      key: String(chapter?.key || `chapter_${idx + 1}`),
      title: String(chapter?.title || `Chapter ${idx + 1}`),
      goal: String(chapter?.goal || ""),
      targetChars: Number(chapter?.targetChars || 0),
      minChars: Number(chapter?.minChars || 0),
      categories: Array.isArray(chapter?.sections)
        ? chapter.sections.map((row) => String(row || "").trim()).filter(Boolean)
        : [],
    })),
    generatedAt: new Date().toISOString(),
  };

  return {
    reportMode,
    selectedProfile,
    partnerProfile,
    birthInput: reportPayload.birthInput,
    partnerInput: reportPayload.partnerInput,
    chapterPlan,
    reportPayload,
  };
}

function validateSukuyoPdfPayload(reportPayload = {}) {
  const payload = reportPayload && typeof reportPayload === "object" ? reportPayload : {};
  const reportMode = normalizeSukyoReportMode(payload.reportMode || payload.mode);
  const birthInput = payload.birthInput && typeof payload.birthInput === "object" ? payload.birthInput : {};
  const partnerInput = payload.partnerInput && typeof payload.partnerInput === "object" ? payload.partnerInput : {};
  const missingFields = [];
  const selectedProfileId = toStringOrNull(payload.selectedProfileId || payload.profileId || payload.selectedProfile?.profileId || payload.selectedProfile?.id);
  const year = toNumberOrNull(birthInput.year ?? payload.year);
  const month = toNumberOrNull(birthInput.month ?? payload.month);
  const day = toNumberOrNull(birthInput.day ?? payload.day);
  const hour = toNumberOrNull(birthInput.hour ?? payload.hour);
  const minute = toNumberOrNull(birthInput.minute ?? payload.minute);
  const calendarType = toCalendarType(pickFirst(birthInput.calendarType, birthInput.calType, payload.calendarType, payload.calType, "solar"));
  const timezone = toStringOrNull(birthInput.timezone || payload.timezone) || "Asia/Seoul";

  pushMissing(missingFields, "birthInput.year", Number.isFinite(year));
  pushMissing(missingFields, "birthInput.month", Number.isFinite(month));
  pushMissing(missingFields, "birthInput.day", Number.isFinite(day));
  pushMissing(missingFields, "birthInput.calendarType", Boolean(calendarType));
  pushMissing(missingFields, "birthInput.timezone", Boolean(timezone));

  if (reportMode === "compatibility") {
    const partnerYear = toNumberOrNull(partnerInput.year ?? payload.partnerYear);
    const partnerMonth = toNumberOrNull(partnerInput.month ?? payload.partnerMonth);
    const partnerDay = toNumberOrNull(partnerInput.day ?? payload.partnerDay);
    const partnerCalendarType = toCalendarType(pickFirst(partnerInput.calendarType, partnerInput.calType, payload.partnerCalendarType, payload.partnerCalType, "solar"));
    pushMissing(missingFields, "partnerInput.year", Number.isFinite(partnerYear));
    pushMissing(missingFields, "partnerInput.month", Number.isFinite(partnerMonth));
    pushMissing(missingFields, "partnerInput.day", Number.isFinite(partnerDay));
    pushMissing(missingFields, "partnerInput.calendarType", Boolean(partnerCalendarType));
  }

  return {
    ok: missingFields.length === 0,
    reportMode,
    chapterCount: getSukyoPdfChapters(reportMode).length,
    selectedProfileId,
    birthInput: {
      year,
      month,
      day,
      hour,
      minute,
      calendarType,
      timezone,
    },
    missingFields,
  };
}

function buildSukuyoBookContextFromNormalized(normalized, canonical = {}, requestBody = {}) {
  const mode = normalizeSukyoReportMode(normalized?.reportMode || requestBody?.mode || requestBody?.reportMode);
  const personA = canonical?.personA || {};
  const personB = canonical?.personB || {};
  const relation = canonical?.compatibility || {};
  const distanceLabel = String(relation?.distanceLabel || "").trim().toLowerCase();
  const distanceType = distanceLabel.includes("근")
    ? "near"
    : distanceLabel.includes("원")
      ? "far"
      : distanceLabel.includes("중")
        ? "middle"
        : null;

  const bookContext = {
    mode,
    user: {
      profile: {
        name: normalized?.userProfile?.name || null,
        gender: normalized?.userProfile?.gender || null,
        birthDate: normalized?.userProfile?.solarBirthDate || personA?.birth?.solarDate || null,
        calendarType: toCalendarType(requestBody?.calendarType || requestBody?.calendar || "solar"),
        birthTime: normalized?.userProfile?.birthTime || personA?.birth?.time || null,
      },
      sukuyo: {
        mansion: normalized?.mainStar?.nameKo || canonical?.natalSukuyo?.nameKo || personA?.sukuyo?.nameKo || null,
        mansionNumber: Number.isFinite(Number(canonical?.natalSukuyo?.index))
          ? Number(canonical.natalSukuyo.index)
          : (Number.isFinite(Number(personA?.sukuyo?.index)) ? Number(personA.sukuyo.index) : null),
        mansionGroup: normalized?.mainStar?.group || canonical?.natalSukuyo?.group || personA?.sukuyo?.category || null,
        mansionKeywords: Array.isArray(canonical?.natalSukuyo?.keywords)
          ? canonical.natalSukuyo.keywords
          : (Array.isArray(personA?.sukuyo?.keywords) ? personA.sukuyo.keywords : []),
        personalitySummary: normalized?.mainStar?.temperament || null,
        loveStyle: normalized?.relationship?.emotionalPattern || null,
        relationshipStyle: normalized?.persona?.socialMask || null,
        careerStyle: normalized?.domainScores?.find((row) => row?.domain === "work")?.summary || null,
        moneyStyle: normalized?.domainScores?.find((row) => row?.domain === "wealth")?.summary || null,
        lifeTheme: normalized?.persona?.rememberedAs || canonical?.natalSukuyo?.lifeTheme || null,
        cautionPattern: normalized?.mainStar?.shadow || null,
        fortuneFlow: canonical?.cycleData || null,
      },
    },
    partner: mode === "compatibility"
      ? {
        profile: {
          name: personB?.name || requestBody?.partnerName || null,
          gender: requestBody?.partnerGender || null,
          birthDate: personB?.birth?.solarDate || requestBody?.partnerBirthDate || null,
          calendarType: toCalendarType(requestBody?.partnerCalendarType || requestBody?.partnerCalendar || "solar"),
          birthTime: personB?.birth?.time || requestBody?.partnerBirthTime || null,
        },
        sukuyo: {
          mansion: personB?.sukuyo?.nameKo || null,
          mansionNumber: Number.isFinite(Number(personB?.sukuyo?.index)) ? Number(personB.sukuyo.index) : null,
          mansionGroup: personB?.sukuyo?.category || null,
          mansionKeywords: Array.isArray(personB?.sukuyo?.keywords) ? personB.sukuyo.keywords : [],
          personalitySummary: personB?.sukuyo?.archetypeTitle || null,
          loveStyle: canonical?.relationshipMatrix?.emotionalPattern?.summary || null,
          relationshipStyle: canonical?.relationshipMatrix?.attractionPattern?.summary || null,
        },
      }
      : undefined,
    compatibility: mode === "compatibility"
      ? {
        relationType: relation?.relationType || null,
        relationLabel: relation?.relationTypeHan || relation?.relationType || null,
        distanceType,
        attractionPattern: canonical?.relationshipMatrix?.attractionPattern?.summary || null,
        conflictPattern: canonical?.relationshipMatrix?.conflictPattern?.summary || relation?.conflictPattern || null,
        emotionalDynamic: canonical?.relationshipMatrix?.emotionalPattern?.summary || normalized?.relationship?.emotionalPattern || null,
        longTermPotential: canonical?.relationshipMatrix?.longTermPotential?.summary || relation?.longTermPotential || null,
        marriagePotential: canonical?.relationshipMatrix?.marriagePotential?.summary || null,
        reunionPotential: relation?.reunionPotential || null,
        riskPattern: relation?.strengthShadowMap?.complementSummary || null,
        adviceSummary: relation?.roleActionGuide?.resetLine || null,
        score: Number.isFinite(Number(relation?.compatibilityIndex)) ? Number(relation.compatibilityIndex) : null,
        grade: Number.isFinite(Number(relation?.compatibilityIndex))
          ? (Number(relation.compatibilityIndex) >= 85 ? "A" : Number(relation.compatibilityIndex) >= 70 ? "B" : "C")
          : null,
      }
      : undefined,
    promptContext: {
      generatedQuestionPrompt: requestBody?.questionPrompt || requestBody?.prompt || null,
      engineSummary: normalized?.rawBasicResult?.summary || relation?.summary || null,
      userQuestion: requestBody?.question || requestBody?.userQuestion || null,
    },
    meta: {
      missingFields: [],
      availableFields: [],
      generatedAt: new Date().toISOString(),
    },
  };

  bookContext.meta.availableFields = collectAvailableFields(bookContext);
  bookContext.meta.missingFields = collectMissingFields(bookContext);
  return bookContext;
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
  if (reportMode === "compatibility" && !relationship.relationType) missingSummary.push("relationship.relationType");

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

  const normalized = {
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

  normalized.sukuyoBookContext = buildSukuyoBookContextFromNormalized(normalized, canonical, requestBody);
  return normalized;
}

function validateSukyoPdfInput(context = {}) {
  const hardMissingFields = [];
  const softMissingFields = [];
  const mode = normalizeSukyoReportMode(context?.reportMode || context?.sukuyoBookContext?.mode);
  const book = context?.sukuyoBookContext || {};
  const chapterPlan = getSukyoPdfChapters(mode);
  const seed = context?.sukuyoPdfSeed && typeof context.sukuyoPdfSeed === "object"
    ? context.sukuyoPdfSeed
    : buildSukuyoPdfSeed(context);
  const payloadValidation = validateSukuyoPdfPayload(seed?.reportPayload || context?.reportPayload || context);

  const hasBirthInfo = Boolean(book?.user?.profile?.birthDate || context?.userProfile?.solarBirthDate);
  const hasMainMansion = Boolean(book?.user?.sukuyo?.mansion || context?.mainStar?.nameKo);
  const hasMansionNumber = Number.isFinite(Number(book?.user?.sukuyo?.mansionNumber || context?.mainStar?.number || context?.mainStar?.index));
  const hasChapterPlan = Array.isArray(chapterPlan) && chapterPlan.length > 0;
  const hasChapterSeed = hasChapterPlan && chapterPlan.some((row) => Array.isArray(row?.sections) && row.sections.length > 0);
  const hasBasicText = Boolean(
    hasMainMansion
    || context?.mainStar?.coreKeyword
    || toArray(context?.domainScores).some((row) => Boolean(row?.summary) || toArray(row?.keywords).length > 0),
  );

  if (!hasBirthInfo) hardMissingFields.push("user.profile.birthDate");
  if (!hasMainMansion) hardMissingFields.push("user.sukuyo.mansion");
  if (!hasMansionNumber) hardMissingFields.push("user.sukuyo.mansionNumber");
  if (!hasChapterPlan) hardMissingFields.push("chapterPlan");
  if (!hasChapterSeed) hardMissingFields.push("chapterSeed");
  if (!payloadValidation.ok) hardMissingFields.push(...payloadValidation.missingFields.filter((field) => !hardMissingFields.includes(field)));

  if (!book?.user?.profile?.birthTime && !context?.userProfile?.birthTime) {
    softMissingFields.push("user.profile.birthTime");
  }
  if (!book?.user?.profile?.birthPlace && !context?.userProfile?.birthPlace) {
    softMissingFields.push("user.profile.birthPlace");
  }

  let hasCompatibilityCore = true;
  if (mode === "compatibility") {
    const hasPartnerBirth = Boolean(book?.partner?.profile?.birthDate);
    const hasPartnerMansion = Boolean(book?.partner?.sukuyo?.mansion);
    const hasRelationType = Boolean(book?.compatibility?.relationType || context?.relationship?.relationType);
    if (!hasPartnerBirth) hardMissingFields.push("partner.profile.birthDate");
    if (!hasPartnerMansion) hardMissingFields.push("partner.sukuyo.mansion");
    if (!hasRelationType) hardMissingFields.push("compatibility.relationType");
    hasCompatibilityCore = hasPartnerBirth && hasPartnerMansion;
    if (!book?.partner?.profile?.birthTime && !context?.partner?.profile?.birthTime) {
      softMissingFields.push("partner.profile.birthTime");
    }
  }

  return {
    canGenerate: hardMissingFields.length === 0 && hasBasicText && hasCompatibilityCore,
    mode,
    hasBirthInfo,
    hasMansionNumber,
    hasBasicText,
    hasCompatibilityCore,
    hasChapterPlan,
    chapterCount: Array.isArray(chapterPlan) ? chapterPlan.length : 0,
    payloadValidation,
    hardMissingFields,
    softMissingFields,
    missingFields: hardMissingFields,
  };
}

function buildSukyoPdfContext(input = {}) {
  const normalized = normalizeSukyoResultForPdf(input);
  const seed = buildSukuyoPdfSeed({
    ...input,
    reportMode: normalized?.reportMode || input?.reportMode || input?.mode,
    selectedProfile: input?.selectedProfile || input?.profile || normalized?.userProfile || {},
    partnerProfile: input?.partnerProfile || input?.partner || normalized?.sukuyoBookContext?.partner?.profile || {},
  });

  return {
    ...normalized,
    sukuyoPdfSeed: seed,
    reportPayload: seed.reportPayload,
    reportPayloadValidation: validateSukuyoPdfPayload(seed.reportPayload),
  };
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
  const chapterSections = Array.isArray(chapter?.sections) ? chapter.sections.map((row) => String(row || "").trim()).filter(Boolean) : [];
  const targetChars = Number(chapter?.targetChars || 4200);
  const minChars = Number(chapter?.minChars || Math.floor(targetChars * 0.85));
  const previousBanList = collectPreviousSentenceBanList(previousChapterTexts, 12);
  const previousChapterSummaries = (previousChapterTexts || [])
    .map((text, idx) => {
      const lines = String(text || "").split(/\n+/).map((row) => row.trim()).filter(Boolean);
      const title = lines.find((row) => row.startsWith("# ")) || `Chapter ${idx + 1}`;
      const summary = lines.slice(0, 8).join(" ").slice(0, 700);
      return { chapterId: idx + 1, title: title.replace(/^#\s+/, ""), summary };
    })
    .filter((row) => row.summary);
  const chapterCatalog = getSukyoPdfChapters(reportMode)
    .map((row, idx) => `${idx + 1}. ${row.title}`)
    .join("\n");
  const sukuyoBookContext = safeContext?.sukuyoBookContext && typeof safeContext.sukuyoBookContext === "object"
    ? safeContext.sukuyoBookContext
    : null;
  const chapterContract = context?.chapterContract && typeof context.chapterContract === "object"
    ? context.chapterContract
    : {};
  const requiredHeadings = Array.isArray(chapterContract?.requiredHeadings)
    ? chapterContract.requiredHeadings.map((row) => String(row || "").trim()).filter(Boolean)
    : [];
  const requiredJsonFields = Array.isArray(chapterContract?.requiredJsonFields)
    ? chapterContract.requiredJsonFields.map((row) => String(row || "").trim()).filter(Boolean)
    : [];
  const isCompatChapter2 = reportMode === "compatibility" && String(chapter?.key || "") === "compat_ch_02";

  const modeSpecificRules = reportMode === "compatibility"
    ? [
      "궁합 모드에서는 두 사람의 관계를 중심으로만 작성하고 개인 인생 총론 반복을 금지한다.",
      "두 사람의 relationType, distanceType, 관계 다이내믹을 우선 해석하되, 없는 관계값은 임의 생성하지 않는다.",
      "상대 데이터가 부족한 항목은 단정하지 말고 확보된 범위에서만 해석한다.",
    ]
    : [
      "솔로 모드에서는 나의 숙명, 성격, 관계, 일, 사랑, 운의 흐름 중심으로 작성한다.",
      "강점과 그림자를 동시에 다루고, 단정 예언 대신 실행 가능한 현실 전략으로 마무리한다.",
    ];

  const systemPrompt = [
    "너는 30년차 숙요점 상담가이자 프리미엄 숙요점 PDF 전문 작가다.",
    "제공된 SukuyoBookContext와 계산 완료 데이터 범위만 사용한다. 계산을 다시 만들지 않는다.",
    "없는 숙, 관계 유형, 거리 구분, 궁합 점수는 절대 임의 생성하지 않는다.",
    "본문에는 JSON, 계산표, 내부 키명, payload, API 응답 원문, 디버그 로그를 노출하지 않는다.",
    "운명론적 단정 대신 현실적인 선택, 행동 전략, 관계 운영법으로 연결한다.",
    "이전 챕터 문장/비유/결론을 반복하지 않는다.",
    requiredHeadings.length ? `chapterContract.requiredHeadings를 모두 sections.heading에 반영: ${requiredHeadings.join(", ")}` : "",
    requiredJsonFields.length ? `chapterContract.requiredJsonFields 키를 응답 JSON에 모두 포함: ${requiredJsonFields.join(", ")}` : "",
    chapterSections.length ? `다음 세부 카테고리를 모두 포함하고 sections.heading에 반영: ${chapterSections.join(" | ")}` : "",
    isCompatChapter2 ? "compat_ch_02는 반드시 성쇠(成衰) 역학 전용 JSON 스키마를 사용한다. subChapters는 정확히 3개이며 각 sub 항목에 analysisText와 strategicGuidance를 채운다." : "",
    isCompatChapter2 ? "analysisText는 각 sub마다 최소 3~4문단의 고밀도 분석으로 작성하고, 두 사람의 상호 역학(A->B, B->A)을 모두 포함한다." : "",
    isCompatChapter2 ? "템플릿 반복 문장, 루프 문장, 앞선 챕터 문장 재사용을 금지한다." : "",
    ...modeSpecificRules,
    "반드시 JSON 하나로만 응답한다.",
  ].join("\n");

  const userPrompt = [
    "다음은 프리미엄 숙요점 PDF 생성을 위한 정규화된 데이터다.",
    `[리포트 모드] ${reportMode}`,
    "[모드별 챕터 구성표]",
    chapterCatalog,
    `[목표 글자 수] ${targetChars}`,
    `[최소 글자 수] ${minChars}`,
    chapterSections.length ? "[세부 카테고리]" : null,
    chapterSections.length ? JSON.stringify(chapterSections, null, 2) : null,
    "[SukuyoBookContext]",
    JSON.stringify(sukuyoBookContext || {}, null, 2),
    "[정규화된 보조 데이터]",
    JSON.stringify({
      userProfile: safeContext.userProfile || {},
      mainStar: safeContext.mainStar || {},
      moon: safeContext.moon || {},
      relationship: safeContext.relationship || {},
      domainScores: safeContext.domainScores || [],
      missingSummary: safeContext.missingSummary || [],
    }, null, 2),
    previousChapterSummaries.length ? "[이전 챕터 요약]" : null,
    previousChapterSummaries.length ? JSON.stringify(previousChapterSummaries, null, 2) : null,
    previousBanList.length ? "[이전 챕터와 중복 금지 문장]" : null,
    previousBanList.length ? JSON.stringify(previousBanList, null, 2) : null,
    "[숙요점 Knowledge Base]",
    JSON.stringify(safeContext.knowledgeBase || {}, null, 2),
    "[작성할 챕터]",
    chapterTitle,
    "[챕터 작성 목표]",
    chapterGoal,
    requiredHeadings.length ? "[chapterContract.requiredHeadings]" : null,
    requiredHeadings.length ? JSON.stringify(requiredHeadings, null, 2) : null,
    requiredJsonFields.length ? "[chapterContract.requiredJsonFields]" : null,
    requiredJsonFields.length ? JSON.stringify(requiredJsonFields, null, 2) : null,
    isCompatChapter2 ? "[compat_ch_02 전용 출력 스키마]" : null,
    isCompatChapter2 ? "{ chapterId, chapterTitle, metaData, subChapters(3), compatibilityEngineSummary } 형식을 정확히 따른다." : null,
    "[작성 제한]",
    "- 본문은 완성형 상담문으로 작성한다.",
    "- 본문에 계산 근거/내부 데이터/JSON 키를 직접 출력하지 않는다.",
    "- 궁합 모드에서는 개인 인생 총론을 길게 반복하지 않는다.",
    "[출력 형식]",
    isCompatChapter2
      ? "{\n  \"chapterId\": \"sukyo_comp_ch_2\",\n  \"chapterTitle\": \"Chapter 2. 성쇠(成衰) 역학이 지배하는 두 사람의 숙명적 궁합\",\n  \"metaData\": {\n    \"relationType\": \"근거리 성쇠\",\n    \"distanceType\": \"근거리 (가장 밀접하고 즉각적인 영향력)\",\n    \"neoRole\": \"成 (성장 및 서포트 지표)\",\n    \"targetRole\": \"衰 (에너지 소비 및 수혜 지표)\"\n  },\n  \"subChapters\": [\n    {\n      \"subId\": \"sub_2_1\",\n      \"subTitle\": \"1. 근거리 성쇠(成衰)가 만드는 심리적 자석 현상과 초반 끌림의 진짜 이유\",\n      \"analysisText\": \"string\",\n      \"strategicGuidance\": \"string\"\n    },\n    {\n      \"subId\": \"sub_2_2\",\n      \"subTitle\": \"2. '성(成)의 고집(Neo)'과 '쇠(衰)의 집념(상대방)'이 격돌할 때 발생하는 에너지 소모점과 갈등 메커니즘\",\n      \"analysisText\": \"string\",\n      \"strategicGuidance\": \"string\"\n    },\n    {\n      \"subId\": \"sub_2_3\",\n      \"subTitle\": \"3. 주도권 밸런스 붕괴 방지를 위한 현대적 파트너십 및 관계 유지 4축 실행 심화 가이드\",\n      \"analysisText\": \"string\",\n      \"strategicGuidance\": \"string\"\n    }\n  ],\n  \"compatibilityEngineSummary\": {\n    \"relationshipCoreVibe\": \"string\",\n    \"actionPriority\": {\n      \"immediate\": \"string\",\n      \"stop\": \"string\",\n      \"review\": \"string\"\n    }\n  }\n}"
      : "{\n  \"chapterKey\": \"string\",\n  \"chapterTitle\": \"string\",\n  \"chapterSubtitle\": \"string\",\n  \"summary\": \"string\",\n  \"coreReading\": \"string\",\n  \"sections\": [{ \"heading\": \"string\", \"body\": \"string\" }],\n  \"practicalAdvice\": [\"string\"],\n  \"cautions\": [\"string\"],\n  \"ritualOrRoutine\": [\"string\"],\n  \"masterKeyword\": \"string\",\n  \"missingDataNotice\": \"string | null\"\n}",
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

function sanitizeNarrativeText(value) {
  let text = String(value || "").trim();
  if (!text) return "";
  text = text
    .replace(/\b(missingFields|availableFields|reportPayload|payload|raw\s*engine\s*data|api\s*response|debug\s*log)\b/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{\s*"[^"]+"\s*:/g, "");
  return text.replace(/\s{2,}/g, " ").trim();
}

function sanitizeSections(sections, fallbackSummary, requiredHeadings = []) {
  if (!Array.isArray(sections)) {
    const fallbackRows = [];
    if (!requiredHeadings.length) return fallbackRows;
    return requiredHeadings.map((heading) => ({
      heading,
      body: "",
    }));
  }
  const normalized = sections
    .map((item) => ({
      heading: String(item?.heading || "").trim(),
      body: String(item?.body || "").trim(),
    }))
    .filter((item) => item.heading && item.body);

  if (!requiredHeadings.length) return normalized;

  const bucket = new Map(normalized.map((row) => [row.heading, row.body]));
  return requiredHeadings.map((heading) => ({
    heading,
    body: bucket.get(heading) || "",
  }));
}

function createFallbackSukyoChapter(chapter, context, reason = "") {
  const reportMode = normalizeSukyoReportMode(context?.reportMode);
  const sectionHeadings = Array.isArray(chapter?.sections)
    ? chapter.sections.map((row) => String(row || "").trim()).filter(Boolean)
    : [];
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
    sections: (sectionHeadings.length ? sectionHeadings : ["확인 가능한 숙요점 정보 중심 해석"]).map((heading) => ({
      heading,
      body:
        "일부 확장 데이터가 없더라도 기본 숙요점 결과는 개인의 정서, 관계 감각, 삶의 리듬을 읽는 데 충분한 단서를 제공합니다. 이 카테고리는 확인 가능한 숙요점 구조를 중심으로 해석되었습니다.",
    })),
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
    missingDataNotice: null,
    fallbackUsed: true,
    fallbackReason: reason || "CHAPTER_FALLBACK",
    contextHint: {
      missingSummary: toArray(context?.missingSummary),
    },
  };
}

function sanitizeSukyoChapterJson(chapter, rawJson, context) {
  const source = rawJson && typeof rawJson === "object" ? rawJson : {};
  const isCompatChapter2 = String(chapter?.key || "") === "compat_ch_02";

  if (isCompatChapter2 && Array.isArray(source?.subChapters)) {
    const rawSubRows = source.subChapters.slice(0, 3);
    const subRows = rawSubRows.map((row, idx) => {
      const defaultTitle = idx === 0
        ? "1. 근거리 성쇠(成衰)가 만드는 심리적 자석 현상과 초반 끌림의 진짜 이유"
        : idx === 1
          ? "2. '성(成)의 고집(Neo)'과 '쇠(衰)의 집념(상대방)'이 격돌할 때 발생하는 에너지 소모점과 갈등 메커니즘"
          : "3. 주도권 밸런스 붕괴 방지를 위한 현대적 파트너십 및 관계 유지 4축 실행 심화 가이드";
      const analysisText = sanitizeNarrativeText(String(row?.analysisText || "").trim());
      const strategicGuidance = sanitizeNarrativeText(String(row?.strategicGuidance || "").trim());
      return {
        subId: toStringOrNull(row?.subId) || `sub_2_${idx + 1}`,
        subTitle: toStringOrNull(row?.subTitle) || defaultTitle,
        analysisText,
        strategicGuidance,
      };
    });

    const relationshipCoreVibe = sanitizeNarrativeText(
      String(source?.compatibilityEngineSummary?.relationshipCoreVibe || "").trim(),
    );
    const actionPriority = source?.compatibilityEngineSummary?.actionPriority && typeof source.compatibilityEngineSummary.actionPriority === "object"
      ? source.compatibilityEngineSummary.actionPriority
      : {};

    const sections = subRows.map((row) => ({
      heading: row.subTitle,
      body: [row.analysisText, row.strategicGuidance ? `실행 가이드: ${row.strategicGuidance}` : ""]
        .filter(Boolean)
        .join("\n\n"),
    }));

    return {
      chapterId: toStringOrNull(source.chapterId) || "sukyo_comp_ch_2",
      chapterKey: String(chapter?.key || "compat_ch_02"),
      chapterTitle: toStringOrNull(source.chapterTitle) || String(chapter?.title || "Chapter 2. 성쇠(成衰) 역학이 지배하는 두 사람의 숙명적 궁합"),
      chapterSubtitle: "근거리 성쇠 역학 심층 분석",
      summary: relationshipCoreVibe || sanitizeNarrativeText(String(subRows[0]?.analysisText || "").slice(0, 320)),
      coreReading: relationshipCoreVibe || "",
      sections,
      practicalAdvice: [
        sanitizeNarrativeText(String(actionPriority?.immediate || "")),
        sanitizeNarrativeText(String(actionPriority?.stop || "")),
        sanitizeNarrativeText(String(actionPriority?.review || "")),
      ].filter(Boolean),
      cautions: [],
      ritualOrRoutine: [],
      masterKeyword: "근거리 성쇠 밸런스",
      missingDataNotice: null,
      fallbackUsed: false,
      fallbackReason: "",
      metaData: source?.metaData && typeof source.metaData === "object" ? source.metaData : {},
      subChapters: subRows,
      compatibilityEngineSummary: {
        relationshipCoreVibe: relationshipCoreVibe || "",
        actionPriority: {
          immediate: sanitizeNarrativeText(String(actionPriority?.immediate || "")),
          stop: sanitizeNarrativeText(String(actionPriority?.stop || "")),
          review: sanitizeNarrativeText(String(actionPriority?.review || "")),
        },
      },
    };
  }

  const summary = sanitizeNarrativeText(toStringOrNull(source.summary) || "");
  const coreReading = sanitizeNarrativeText(toStringOrNull(source.coreReading) || summary || "");
  const requiredHeadings = Array.isArray(chapter?.sections)
    ? chapter.sections.map((row) => String(row || "").trim()).filter(Boolean)
    : [];
  const sections = sanitizeSections(source.sections, summary, requiredHeadings);

  return {
    chapterKey: toStringOrNull(source.chapterKey) || String(chapter?.key || ""),
    chapterTitle: toStringOrNull(source.chapterTitle) || String(chapter?.title || ""),
    chapterSubtitle: toStringOrNull(source.chapterSubtitle) || "",
    summary,
    coreReading,
    sections: sections.length ? sections : [],
    practicalAdvice: sanitizeList(source.practicalAdvice, []).map(sanitizeNarrativeText).filter(Boolean),
    cautions: sanitizeList(source.cautions, []).map(sanitizeNarrativeText).filter(Boolean),
    ritualOrRoutine: sanitizeList(source.ritualOrRoutine, []).map(sanitizeNarrativeText).filter(Boolean),
    masterKeyword: toStringOrNull(source.masterKeyword) || "",
    missingDataNotice: null,
    fallbackUsed: false,
    fallbackReason: "",
  };
}

function renderSukyoChapterMarkdown(chapterJson, chapterFallbackMeta = null) {
  const c = chapterJson || {};
  const title = sanitizeNarrativeText(String(c.chapterTitle || chapterFallbackMeta?.title || "숙요점 챕터"));
  const subtitle = sanitizeNarrativeText(String(c.chapterSubtitle || "").trim());
  const summary = sanitizeNarrativeText(String(c.summary || c.coreReading || "").trim());
  const coreReading = sanitizeNarrativeText(String(c.coreReading || "").trim());

  const lines = [];
  lines.push(`# ${title}`);
  if (subtitle) lines.push(`> ${subtitle}`);
  if (summary) lines.push("", summary);
  if (coreReading && coreReading !== summary) lines.push("", `## 핵심 리딩`, coreReading);

  const sections = Array.isArray(c.sections) ? c.sections : [];
  for (const section of sections) {
    const heading = sanitizeNarrativeText(String(section?.heading || "").trim());
    const body = sanitizeNarrativeText(String(section?.body || "").trim());
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
  buildSukuyoPdfSeed,
  validateSukuyoPdfPayload,
  buildSukuyoBookContextFromNormalized,
  normalizeSukyoResultForPdf,
  validateSukyoPdfInput,
  buildSukyoPdfContext,
  buildSukyoGeminiPrompt,
  parseSukyoGeminiChapterResponse,
  createFallbackSukyoChapter,
  sanitizeSukyoChapterJson,
  renderSukyoChapterMarkdown,
};
