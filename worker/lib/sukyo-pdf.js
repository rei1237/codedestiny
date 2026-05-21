const UNKNOWN = "unknown";

const SUKYO_PDF_CHAPTERS = [
  {
    key: "solo_ch_01",
    title: "Chapter I. 나의 숙명 총론 — 27숙이 말하는 인생의 첫인상",
    goal: "사용자의 27숙을 기반으로 인생의 기본 분위기와 핵심 욕구를 정의한다.",
    targetChars: 4500,
    minChars: 3825,
    sections: ["나의 숙이 가진 기본 기운", "타고난 인상과 외부 이미지", "인생을 움직이는 핵심 욕구", "내 숙명의 핵심 문장"],
  },
  {
    key: "solo_ch_02",
    title: "Chapter II. 성격과 내면 구조 — 내가 나를 이해하는 법",
    goal: "겉과 속의 성격 구조, 스트레스 반응, 성격 활용 전략을 분리해 해석한다.",
    targetChars: 4200,
    minChars: 3570,
    sections: ["겉으로 드러나는 성격", "가까운 사람에게만 보이는 내면", "스트레스 상황에서 드러나는 반응", "내 성격을 장점으로 쓰는 법"],
  },
  {
    key: "solo_ch_03",
    title: "Chapter III. 인간관계와 인연의 결 — 누구와 가까워지고 멀어지는가",
    goal: "인연 형성 방식과 반복되는 관계 문제를 구조적으로 정리한다.",
    targetChars: 4200,
    minChars: 3570,
    sections: ["사람을 끌어들이는 방식", "편안한 인연과 불편한 인연", "반복되는 관계 문제", "관계를 건강하게 운영하는 법"],
  },
  {
    key: "solo_ch_04",
    title: "Chapter IV. 사랑의 방식 — 나는 어떻게 사랑하는가",
    goal: "사랑의 진입, 욕구, 강점/약점, 장기 유지 전략을 현실적으로 제시한다.",
    targetChars: 4500,
    minChars: 3825,
    sections: ["좋아하는 마음이 생기는 방식", "사랑에서 원하는 것", "연애할 때의 장점과 약점", "좋은 사랑을 만들기 위한 전략"],
  },
  {
    key: "solo_ch_05",
    title: "Chapter V. 운명의 상대상 — 어떤 사람과 깊어지는가",
    goal: "안정형/위험형/장기관계형 상대상을 구분해 관계 선택 기준을 제시한다.",
    targetChars: 4000,
    minChars: 3400,
    sections: ["나를 안정시키는 상대", "강하게 끌리지만 위험한 상대", "장기 관계에 맞는 상대", "피해야 할 관계 패턴"],
  },
  {
    key: "solo_ch_06",
    title: "Chapter VI. 일과 재능 — 내 숙이 빛나는 자리",
    goal: "타고난 재능과 업무 작동 방식, 성과 전략을 직무 관점으로 해석한다.",
    targetChars: 4300,
    minChars: 3655,
    sections: ["타고난 재능과 감각", "잘 맞는 일의 구조", "조직형·독립형·창작형·상담형 작동 방식", "성과를 만드는 실전 전략"],
  },
  {
    key: "solo_ch_07",
    title: "Chapter VII. 재물과 현실 감각 — 돈이 모이고 새는 방식",
    goal: "수익/손실 패턴을 분리해 실전 재정 운영 원칙을 만든다.",
    targetChars: 3800,
    minChars: 3230,
    sections: ["돈을 대하는 기본 태도", "수익이 생기는 방식", "손실이 생기는 패턴", "재물을 안정시키는 운영법"],
  },
  {
    key: "solo_ch_08",
    title: "Chapter VIII. 가족과 뿌리 — 오래된 감정의 원형",
    goal: "가족 내 역할감, 결핍, 독립 과제를 정리하고 회복 문장을 제시한다.",
    targetChars: 3800,
    minChars: 3230,
    sections: ["가족 안에서의 역할감", "인정 욕구와 결핍", "독립과 거리두기의 과제", "내면 회복 문장"],
  },
  {
    key: "solo_ch_09",
    title: "Chapter IX. 위기와 전환점 — 무너질 때 다시 서는 법",
    goal: "위기 패턴, 전환 신호, 재기 전략을 단계적으로 제시한다.",
    targetChars: 4000,
    minChars: 3400,
    sections: ["위기가 오는 패턴", "감정적으로 흔들리는 순간", "인생의 전환 신호", "다시 일어서는 실전 방법"],
  },
  {
    key: "solo_ch_10",
    title: "Chapter X. 운의 흐름과 기회 — 내 숙이 살아나는 타이밍",
    goal: "기회/주의 흐름을 구분해 관계와 일에서 운을 현실로 전환하는 법을 안내한다.",
    targetChars: 4100,
    minChars: 3485,
    sections: ["기회가 열리는 조건", "조심해야 할 흐름", "관계와 일에서 운을 살리는 법", "운을 현실로 바꾸는 준비"],
  },
  {
    key: "solo_ch_11",
    title: "Chapter XI. 실전 생활 전략 — 숙명을 매일의 선택으로 바꾸는 법",
    goal: "루틴 기반 실천 전략으로 성향을 생활 시스템으로 전환한다.",
    targetChars: 4000,
    minChars: 3400,
    sections: ["하루 루틴", "관계 루틴", "일과 돈의 루틴", "감정 관리 루틴"],
  },
  {
    key: "solo_ch_12",
    title: "Chapter XII. 최종 숙명 선언문 — 내 삶을 다시 쓰는 문장",
    goal: "전체 숙요 구조를 통합해 개인 맞춤 선언문으로 마무리한다.",
    targetChars: 4600,
    minChars: 3910,
    sections: ["전체 숙요 구조 요약", "반드시 살려야 할 강점", "버려야 할 반복 패턴", "개인 맞춤 숙명 선언문"],
  },
];

const SUKYO_PDF_COMPAT_CHAPTERS = [
  {
    key: "compat_ch_01",
    title: "Chapter I. 두 사람의 숙요 궁합 총론 — 왜 끌렸고 왜 흔들리는가",
    goal: "두 사람의 숙요 기본 성향과 관계 핵심 문장을 도출한다.",
    targetChars: 4600,
    minChars: 3910,
    sections: ["두 사람의 숙 기본 성향", "첫 끌림의 이유", "관계의 전체 분위기", "이 관계의 핵심 문장"],
  },
  {
    key: "compat_ch_02",
    title: "Chapter II. 숙요 관계 유형 분석 — 명·업태·영친·우쇠·안괴·위성·성위의 의미",
    goal: "실제 relationType 기반으로 선물/시험/실전 전략을 구체화한다.",
    targetChars: 4800,
    minChars: 4080,
    sections: ["두 사람의 관계 유형", "이 관계가 주는 선물", "이 관계가 주는 시험", "관계 유형을 현실에서 쓰는 법"],
  },
  {
    key: "compat_ch_03",
    title: "Chapter III. 거리감 분석 — 근거리·중거리·원거리의 실제 체감",
    goal: "distanceType과 실제 체감의 간극을 설명하고 거리 조절 전략을 제시한다.",
    targetChars: 3800,
    minChars: 3230,
    sections: ["두 사람의 거리감", "가까워질 때 생기는 변화", "멀어질 때 드러나는 불안", "건강한 거리 조절법"],
  },
  {
    key: "compat_ch_04",
    title: "Chapter IV. 감정 궁합 — 마음이 통하는 지점과 막히는 지점",
    goal: "감정 소통/오해/싸움/회복 대화법을 분리해 해석한다.",
    targetChars: 4300,
    minChars: 3655,
    sections: ["감정이 잘 통하는 부분", "오해가 생기는 부분", "싸울 때의 감정 패턴", "감정을 회복시키는 대화법"],
  },
  {
    key: "compat_ch_05",
    title: "Chapter V. 연애 궁합 — 설렘, 집착, 안정감의 균형",
    goal: "설렘/불안/안정의 삼각 균형을 관계 운영 규칙으로 변환한다.",
    targetChars: 4300,
    minChars: 3655,
    sections: ["설렘이 생기는 이유", "집착이나 불안이 생기는 이유", "안정감을 만드는 조건", "연애를 오래 유지하는 법"],
  },
  {
    key: "compat_ch_06",
    title: "Chapter VI. 결혼과 장기 관계 — 함께 살아갈 수 있는가",
    goal: "생활 궁합과 책임감, 장기 리스크를 현실적 합의 중심으로 제시한다.",
    targetChars: 4200,
    minChars: 3570,
    sections: ["생활 궁합", "책임감과 현실 감각", "장기 관계에서 강해지는 부분", "장기 관계에서 조심해야 할 부분"],
  },
  {
    key: "compat_ch_07",
    title: "Chapter VII. 갈등 구조 — 반복되는 싸움의 진짜 원인",
    goal: "갈등 트리거와 붕괴 패턴을 명확히 하고 분쟁 감소 규칙을 설계한다.",
    targetChars: 4300,
    minChars: 3655,
    sections: ["갈등이 시작되는 지점", "서로의 약점을 건드리는 방식", "관계가 무너지는 패턴", "싸움을 줄이는 실전 규칙"],
  },
  {
    key: "compat_ch_08",
    title: "Chapter VIII. 이별과 재회 가능성 — 다시 이어질 수 있는 인연인가",
    goal: "이별 구조와 재회 조건, 재접속 시 리스크를 현실적으로 분석한다.",
    targetChars: 4000,
    minChars: 3400,
    sections: ["이별이 생기는 구조", "미련이 남는 이유", "재회가 가능한 조건", "다시 만나면 조심해야 할 점"],
  },
  {
    key: "compat_ch_09",
    title: "Chapter IX. 운명적 인연성 — 깊은 인연인가, 지나가는 인연인가",
    goal: "인연 깊이와 상호 영향을 성장형/소모형 축으로 구분한다.",
    targetChars: 3800,
    minChars: 3230,
    sections: ["인연의 깊이", "서로에게 남기는 영향", "성장형 인연인지 소모형 인연인지", "이 관계에서 배워야 할 것"],
  },
  {
    key: "compat_ch_10",
    title: "Chapter X. 현실 문제 궁합 — 돈, 일, 가족, 생활 리듬",
    goal: "현실 이슈(돈/일/가족/리듬)에서의 운영 적합성과 조율법을 제시한다.",
    targetChars: 4000,
    minChars: 3400,
    sections: ["돈과 소비 감각", "일과 목표에 대한 태도", "가족과 주변 사람의 영향", "생활 리듬을 맞추는 법"],
  },
  {
    key: "compat_ch_11",
    title: "Chapter XI. 관계 운영 전략 — 이 관계를 살리는 구체적 방법",
    goal: "연락/사과/회복/장기 운영의 실행 프로토콜을 구체화한다.",
    targetChars: 4100,
    minChars: 3485,
    sections: ["연락과 거리두기 전략", "대화와 사과 전략", "갈등 후 회복 전략", "장기 관계 운영 전략"],
  },
  {
    key: "compat_ch_12",
    title: "Chapter XII. 최종 궁합 선언문 — 두 사람이 선택해야 할 방향",
    goal: "전체 궁합을 요약해 지킬 것/버릴 것/최종 선언문으로 마무리한다.",
    targetChars: 4100,
    minChars: 3485,
    sections: ["전체 궁합 핵심 요약", "이 관계에서 지켜야 할 것", "이 관계에서 버려야 할 것", "두 사람을 위한 최종 선언문"],
  },
];

function normalizeSukyoReportMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "compatibility" || mode === "couple" || mode === "compat") return "compatibility";
  return "solo";
}

function getSukyoPdfChapters(reportMode = "personal") {
  return normalizeSukyoReportMode(reportMode) === "compatibility"
    ? SUKYO_PDF_COMPAT_CHAPTERS
    : SUKYO_PDF_CHAPTERS;
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
  const missingFields = [];
  const mode = normalizeSukyoReportMode(context?.reportMode || context?.sukuyoBookContext?.mode);
  const book = context?.sukuyoBookContext || {};

  const hasBirthInfo = Boolean(book?.user?.profile?.birthDate || context?.userProfile?.solarBirthDate);
  const hasMainMansion = Boolean(book?.user?.sukuyo?.mansion || context?.mainStar?.nameKo);
  const hasBasicText = Boolean(
    hasMainMansion
    || context?.mainStar?.coreKeyword
    || toArray(context?.domainScores).some((row) => Boolean(row?.summary) || toArray(row?.keywords).length > 0),
  );

  if (!hasBirthInfo) missingFields.push("user.profile.birthDate");
  if (!hasMainMansion) missingFields.push("user.sukuyo.mansion");

  let hasCompatibilityCore = true;
  if (mode === "compatibility") {
    const hasPartnerBirth = Boolean(book?.partner?.profile?.birthDate);
    const hasPartnerMansion = Boolean(book?.partner?.sukuyo?.mansion);
    if (!hasPartnerBirth) missingFields.push("partner.profile.birthDate");
    if (!hasPartnerMansion) missingFields.push("partner.sukuyo.mansion");
    hasCompatibilityCore = hasPartnerBirth && hasPartnerMansion;
  }

  return {
    canGenerate: hasBirthInfo && hasBasicText && hasCompatibilityCore,
    mode,
    hasBirthInfo,
    hasBasicText,
    hasCompatibilityCore,
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
    const fallbackRows = fallbackSummary
      ? [{ heading: "핵심 해석", body: String(fallbackSummary) }]
      : [];
    if (!requiredHeadings.length) return fallbackRows;
    return requiredHeadings.map((heading) => ({
      heading,
      body: fallbackSummary || "확보된 숙요 데이터 범위에서 이 카테고리를 해석합니다.",
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
    body: bucket.get(heading) || fallbackSummary || "확보된 숙요 구조를 기준으로 현실 적용 전략을 정리합니다.",
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
  const fallback = createFallbackSukyoChapter(chapter, context, "SANITIZE_FALLBACK");
  const source = rawJson && typeof rawJson === "object" ? rawJson : {};

  const summary = sanitizeNarrativeText(toStringOrNull(source.summary) || fallback.summary);
  const coreReading = sanitizeNarrativeText(toStringOrNull(source.coreReading) || summary || fallback.coreReading);
  const requiredHeadings = Array.isArray(chapter?.sections)
    ? chapter.sections.map((row) => String(row || "").trim()).filter(Boolean)
    : [];
  const sections = sanitizeSections(source.sections, summary, requiredHeadings);

  return {
    chapterKey: toStringOrNull(source.chapterKey) || String(chapter?.key || fallback.chapterKey),
    chapterTitle: toStringOrNull(source.chapterTitle) || String(chapter?.title || fallback.chapterTitle),
    chapterSubtitle: toStringOrNull(source.chapterSubtitle) || fallback.chapterSubtitle,
    summary,
    coreReading,
    sections: sections.length ? sections : fallback.sections,
    practicalAdvice: sanitizeList(source.practicalAdvice, fallback.practicalAdvice).map(sanitizeNarrativeText).filter(Boolean),
    cautions: sanitizeList(source.cautions, fallback.cautions).map(sanitizeNarrativeText).filter(Boolean),
    ritualOrRoutine: sanitizeList(source.ritualOrRoutine, fallback.ritualOrRoutine).map(sanitizeNarrativeText).filter(Boolean),
    masterKeyword: toStringOrNull(source.masterKeyword) || fallback.masterKeyword,
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
