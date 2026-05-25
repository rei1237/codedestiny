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
    title: "I. 두 사람의 숙요 궁합 총론 — 인연의 기본 구조",
    goal: "두 사람의 기본 출생/본명숙/관계축을 기반으로 관계 전체 강도를 도출한다.",
    targetChars: 4600,
    minChars: 3910,
    sections: ["기본 출생 정보", "A의 본명숙", "B의 본명숙", "관계 유형 요약", "근거리/중거리/원거리 판단", "궁합 전체 강도", "끌림 강도", "안정성", "갈등 가능성", "장기 인연 가능성", "핵심 키워드", "한 줄 총평"],
  },
  {
    key: "compat_ch_02",
    title: "Chapter 2. 성쇠(成衰) 역학이 지배하는 두 사람의 숙명적 궁합",
    goal: "근거리 성쇠 관계의 심리적 자석 현상, 갈등 소모 메커니즘, 관계 유지 4축 실행 가이드를 정밀 해석한다.",
    targetChars: 4800,
    minChars: 4080,
    sections: [
      "1. 근거리 성쇠(成衰)가 만드는 심리적 자석 현상과 초반 끌림의 진짜 이유",
      "2. '성(成)의 고집(Neo)'과 '쇠(衰)의 집념(상대방)'이 격돌할 때 발생하는 에너지 소모점과 갈등 메커니즘",
      "3. 주도권 밸런스 붕괴 방지를 위한 현대적 파트너십 및 관계 유지 4축 실행 심화 가이드",
    ],
  },
  {
    key: "compat_ch_03",
    title: "III. 숙요 관계 유형 분석 — 명·업태·영친·우쇠·안괴·위성",
    goal: "relationType 및 role을 기준으로 감정 체감과 반복 사건 패턴을 해석한다.",
    targetChars: 3800,
    minChars: 3230,
    sections: ["숙요 관계 유형", "명 관계 여부", "업태 관계 여부", "영친 관계 여부", "우쇠 관계 여부", "안괴 관계 여부", "위성 관계 여부", "유형별 기본 의미", "감정적 체감", "반복 사건 패턴", "연애 영향", "결혼 영향", "이별/재회 영향"],
  },
  {
    key: "compat_ch_04",
    title: "IV. 거리 관계 분석 — 가까운 인연인가, 먼 인연인가",
    goal: "distanceType 기반으로 끌림/안정/갈등의 변화를 구조적으로 설명한다.",
    targetChars: 4300,
    minChars: 3655,
    sections: ["근거리 해석", "중거리 해석", "원거리 해석", "거리와 끌림 영향", "거리와 안정성 영향", "거리와 갈등 영향", "가까워질수록 강해지는 부분", "멀어질수록 약해지는 부분", "재회 가능성과 거리", "장기 관계 거리 조절", "실제 연애 거리 패턴"],
  },
  {
    key: "compat_ch_05",
    title: "V. 첫 끌림과 운명적 인연감 — 왜 서로에게 끌리는가",
    goal: "초기 끌림과 운명감/집착 구분 포인트를 도출한다.",
    targetChars: 4300,
    minChars: 3655,
    sections: ["첫인상 궁합", "본능적 끌림", "외모/분위기 매력", "말투/태도 매력", "정서적 친숙함", "낯선데 끌리는 이유", "관계 초반 속도", "빠르게 가까워지는 조건", "경계심 조건", "인연감이 강해지는 순간", "착각하기 쉬운 운명감", "진짜 인연감과 집착 구분"],
  },
  {
    key: "compat_ch_06",
    title: "VI. 감정 궁합 — 마음이 통하는 방식과 어긋나는 방식",
    goal: "감정 흐름과 충돌/회복 언어를 분리해 실전 대응 규칙을 제공한다.",
    targetChars: 4200,
    minChars: 3570,
    sections: ["A 감정 흐름", "B 감정 흐름", "감정 표현 차이", "애정 확인 방식", "서운함 원인", "침묵/회피 패턴", "감정 폭발 패턴", "위로받고 싶은 방식", "안정시키는 말", "불안하게 만드는 말", "감정 싸움 원인", "감정 회복 방법", "편안해지는 조건"],
  },
  {
    key: "compat_ch_07",
    title: "VII. 연애 궁합 — 사랑의 속도와 관계 운영 방식",
    goal: "연애 운영 전반(연락/주도권/권태/유지전략)을 맞춤형으로 설계한다.",
    targetChars: 4300,
    minChars: 3655,
    sections: ["연애 시작 가능성", "연애 초반 흐름", "관계가 깊어지는 속도", "연락 스타일 궁합", "데이트 스타일 궁합", "애정 표현 궁합", "질투와 소유욕", "밀당과 거리두기", "관계 주도권", "권태기 가능성", "오래 연애 조건", "피해야 할 행동", "맞는 연애 방식"],
  },
  {
    key: "compat_ch_08",
    title: "VIII. 결혼 궁합 — 함께 살아갈 수 있는 관계인가",
    goal: "결혼/동거 관점의 현실 안정성과 리스크를 입체적으로 평가한다.",
    targetChars: 4000,
    minChars: 3400,
    sections: ["결혼 인연 가능성", "현실적 안정성", "생활 습관 궁합", "돈 관리 궁합", "가족관계 궁합", "책임감/역할 분담", "결혼 후 갈등 포인트", "결혼 후 안정되는 부분", "결혼 후 약해지는 부분", "장기 동거 가능성", "부부 성장 가능성", "서두를 때 문제", "결혼 전 확인 기준"],
  },
  {
    key: "compat_ch_09",
    title: "IX. 갈등 구조 분석 — 왜 싸우고 어디서 무너지는가",
    goal: "반복 충돌의 본질 원인과 대화 기반 완충 전략을 제시한다.",
    targetChars: 3800,
    minChars: 3230,
    sections: ["가장 큰 갈등 원인", "자존심 충돌 지점", "말다툼 패턴", "오해 반복 이유", "신뢰 흔들리는 순간", "질투/의심 구조", "회피형 갈등", "폭발형 갈등", "상대를 지치게 하는 행동", "내가 모르게 상처 주는 방식", "위험 신호", "갈등 줄이는 대화법", "관계를 망치지 않는 싸움법"],
  },
  {
    key: "compat_ch_10",
    title: "X. 안괴·위험 관계 집중 분석 — 강한 끌림과 파괴성",
    goal: "안괴/위성 위험 신호를 조기 진단하고 안전한 거리 전략을 제시한다.",
    targetChars: 4000,
    minChars: 3400,
    sections: ["안괴 관계 여부", "안괴 관계 끌림", "안괴 관계 상처 구조", "안괴 약자", "안괴 강자", "위성 관계 여부", "위성 불안정성", "무너지는 조건", "집착 전환 지점", "감정 소모 이유", "계속해도 되는 조건", "멈춰야 하는 위험 신호", "건강한 거리두기"],
  },
  {
    key: "compat_ch_11",
    title: "XI. 영친·업태·우쇠 관계 집중 분석 — 오래 가는 인연의 조건",
    goal: "장기형 관계 유형의 강점/피로/성숙 전략을 분리해 제시한다.",
    targetChars: 4100,
    minChars: 3485,
    sections: ["영친 관계 여부", "영친 안정성", "영친 성장 포인트", "업태 관계 여부", "업태 전생 인연감", "업태 반복 숙제", "우쇠 관계 여부", "우쇠 감정 기복", "우쇠 헌신/피로", "오래 가기 쉬운 조건", "멀어지기 쉬운 조건", "서로에게 도움 되는 방식", "성숙 전략"],
  },
  {
    key: "compat_ch_12",
    title: "XII. 속궁합과 친밀감 — 몸과 마음의 밀착도",
    goal: "신체/정서 친밀감의 속도와 오해 지점을 파악해 안정 전략을 만든다.",
    targetChars: 4100,
    minChars: 3485,
    sections: ["신체적 끌림", "스킨십 성향", "친밀감 형성 속도", "감정적 친밀감", "육체적 친밀감", "원하는 애정 온도", "부담스러운 표현", "거절 반응", "깊어질수록 드러나는 욕구", "친밀감 오해", "안정적 친밀감 유지법", "식지 않는 관계 조건"],
  },
  {
    key: "compat_ch_13",
    title: "XIII. 재회·이별·미련 분석 — 끊어지는 인연인가, 돌아오는 인연인가",
    goal: "이별 리스크와 재회 가능성, 재접속 조건을 현실 기반으로 평가한다.",
    targetChars: 4500,
    minChars: 3825,
    sections: ["이별 가능성", "이별 주요 원인", "갑작스러운 단절 가능성", "서서히 멀어지는 패턴", "미련이 남는 쪽", "먼저 돌아오는 쪽", "재회 가능성", "재회 후 반복 문제", "재회해도 되는 조건", "재회하면 안 되는 조건", "관계 정리 신호", "미련 끊는 방법", "인연 다시 살리는 방법"],
  },
  {
    key: "compat_ch_14",
    title: "XIV. 관계의 시기와 흐름 — 가까워질 때와 조심할 때",
    goal: "관계 사이클의 강화/약화 구간을 분리해 타이밍 전략을 제시한다.",
    targetChars: 4200,
    minChars: 3570,
    sections: ["관계가 강해지는 시기", "관계가 약해지는 시기", "고백/시작 좋은 흐름", "공식화 좋은 흐름", "갈등이 커지는 흐름", "이별수 강해지는 흐름", "재회 가능성 높은 흐름", "결혼 논의 적합 흐름", "서로 여유 필요한 시기", "관계 속도 조절법", "시기별 주의점", "시기별 운영 전략"],
  },
  {
    key: "compat_ch_15",
    title: "XV. 현실 궁합 — 돈, 일, 생활, 가족 문제",
    goal: "현실 생활 전반의 충돌/조율 항목을 명확히 정리한다.",
    targetChars: 4200,
    minChars: 3570,
    sections: ["돈 가치관 차이", "소비 습관 궁합", "일과 사랑의 균형", "바쁜 시기 대처", "가족 문제 태도", "친구/인맥 문제", "생활 패턴 차이", "약속과 책임감", "현실 충돌 지점", "현실적으로 잘 맞는 부분", "현실 조율 필요 부분", "장기 관계 규칙", "함께 살 때 주의점"],
  },
  {
    key: "compat_ch_16",
    title: "XVI. 최종 궁합 리포트 — 이 관계를 어떻게 다뤄야 하는가",
    goal: "전체 분석을 통합해 최종 유지전략과 관계 조언을 제시한다.",
    targetChars: 4600,
    minChars: 3910,
    sections: ["궁합 핵심 요약", "가장 큰 장점", "가장 큰 약점", "사랑이 깊어지는 조건", "무너지는 조건", "상대 이해 핵심 포인트", "내가 바꿔야 할 태도", "상대에게 기대해도 되는 부분", "기대하면 안 되는 부분", "연애 유지 전략", "결혼 가능성 종합 판단", "재회 가능성 종합 판단", "최종 관계 조언", "한 줄 궁합 키워드"],
  },
];

function normalizeSukyoReportMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "compatibility" || mode === "couple" || mode === "compat") return "compatibility";
  return "compatibility";
}

function getSukyoPdfChapters(reportMode = "personal") {
  return normalizeSukyoReportMode(reportMode) === "compatibility"
    ? SUKYO_PDF_COMPAT_CHAPTERS
    : SUKYO_PDF_COMPAT_CHAPTERS;
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
