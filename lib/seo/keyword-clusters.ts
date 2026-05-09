export type SeoPageType = "service" | "guide" | "insight" | "faq" | "comparison";

export type SeoKeywordCluster = {
  mainKeyword: string;
  relatedKeywords: string[];
  searchIntent: string;
  targetRoute: string;
  pageType: SeoPageType;
  titleTemplate: string;
  descriptionTemplate: string;
  h1: string;
  intro: string;
  internalLinks: string[];
  ctaServiceRoute: string;
};

export const SEO_KEYWORD_CLUSTERS: SeoKeywordCluster[] = [
  {
    mainKeyword: "무료 사주",
    relatedKeywords: ["사주팔자", "사주풀이", "만세력", "오늘의 운세", "신년운세"],
    searchIntent: "사주를 무료로 확인하고 기본 해석 방법까지 알고 싶은 초보자 의도",
    targetRoute: "/saju",
    pageType: "service",
    titleTemplate: "무료 사주풀이 · 사주팔자 만세력 분석 | Code Destiny",
    descriptionTemplate: "무료 사주와 사주팔자 해석을 만세력 기반으로 정리한 서비스 페이지",
    h1: "무료 사주풀이와 사주팔자 만세력 분석",
    intro: "무료 사주 결과를 즉시 보고, 만세력 기반으로 핵심 해석 포인트를 빠르게 이해할 수 있습니다.",
    internalLinks: ["/daily-fortune", "/compatibility", "/ziwei", "/insights/saju"],
    ctaServiceRoute: "/saju",
  },
  {
    mainKeyword: "자미두수",
    relatedKeywords: ["자미두수 무료", "자미두수 명반", "자미두수 12궁", "자미두수 보는 법", "자미두수 궁합"],
    searchIntent: "자미두수 개념 학습과 명반 실전 사용을 동시에 원하는 정보+기능 의도",
    targetRoute: "/ziwei",
    pageType: "service",
    titleTemplate: "자미두수 무료 명반 · 12궁 운명 분석 | Code Destiny",
    descriptionTemplate: "자미두수 명반과 12궁 해석을 초보자 관점으로 정리한 자미두수 허브",
    h1: "자미두수 무료 명반과 12궁 운명 분석",
    intro: "자미두수는 명궁과 12궁 구조를 통해 인생 패턴을 읽는 체계입니다. 이 페이지에서 바로 명반을 시작할 수 있습니다.",
    internalLinks: ["/ziwei/chart", "/insights/ziwei", "/compatibility", "/premium"],
    ctaServiceRoute: "/ziwei/chart",
  },
  {
    mainKeyword: "숙요점",
    relatedKeywords: ["숙요점 궁합", "27숙", "본명숙", "영친관계", "업태관계", "안괴관계"],
    searchIntent: "숙요 27숙 관계 유형을 이해하고 궁합을 바로 확인하려는 희소 키워드 의도",
    targetRoute: "/sukuyo",
    pageType: "service",
    titleTemplate: "숙요점 무료 궁합 · 27숙 관계 분석 | Code Destiny",
    descriptionTemplate: "숙요점 궁합과 27숙 관계 유형을 실전 대화 규칙까지 포함해 해석",
    h1: "숙요점으로 보는 27숙 궁합과 관계의 흐름",
    intro: "숙요점은 27숙 관계 리듬을 읽어 관계 갈등과 끌림 패턴을 분석하는 동양 관계 해석 체계입니다.",
    internalLinks: ["/sukuyo/compatibility", "/insights/sukuyo", "/compatibility", "/daily-fortune"],
    ctaServiceRoute: "/sukuyo/compatibility",
  },
  {
    mainKeyword: "베다점성술",
    relatedKeywords: ["베다점", "라그나", "나크샤트라", "다샤", "인도 점성술"],
    searchIntent: "한국어로 베다점성술 핵심 개념과 실전 적용법을 찾는 학습 의도",
    targetRoute: "/vedic",
    pageType: "service",
    titleTemplate: "베다점성술 무료 분석 · 라그나와 카르마 차트 | Code Destiny",
    descriptionTemplate: "베다점성술 핵심 키워드를 한국어로 정리하고 즉시 서비스로 연결",
    h1: "베다점성술로 보는 라그나와 카르마 블루프린트",
    intro: "베다점성술은 라그나와 다샤를 통해 인생 시기성과 카르마 과제를 읽는 인도 점성 체계입니다.",
    internalLinks: ["/astrology", "/insights/vedic", "/ziwei", "/premium"],
    ctaServiceRoute: "/vedic",
  },
  {
    mainKeyword: "점성술 차트",
    relatedKeywords: ["점성술", "무료 점성술", "출생 차트", "상승궁", "달궁", "태양궁"],
    searchIntent: "출생차트 해석 기초를 배우고 내 차트를 확인하려는 기능 의도",
    targetRoute: "/astrology",
    pageType: "service",
    titleTemplate: "무료 점성술 차트 · 태양궁·달궁·상승궁 해석 | Code Destiny",
    descriptionTemplate: "점성술 차트 기본 구조를 이해하고 바로 분석 기능으로 이동",
    h1: "무료 점성술 차트와 나의 별자리 지도",
    intro: "점성술 차트는 태양궁, 달궁, 상승궁의 상호작용으로 성향과 선택 패턴을 읽는 도구입니다.",
    internalLinks: ["/vedic", "/insights/astrology", "/daily-fortune", "/ziwei"],
    ctaServiceRoute: "/astrology",
  },
  {
    mainKeyword: "무료 타로",
    relatedKeywords: ["연애 타로", "재회운 타로", "상대방 속마음 타로", "오늘의 타로", "AI 타로"],
    searchIntent: "당장 타로를 보고 질문법과 해석 기준을 함께 확인하려는 의도",
    targetRoute: "/tarot",
    pageType: "service",
    titleTemplate: "무료 타로 리딩 · 연애운·재회운·상대방 속마음 | Code Destiny",
    descriptionTemplate: "무료 타로 기능과 실전 질문 설계를 함께 제공하는 랜딩",
    h1: "무료 타로 리딩으로 보는 지금의 마음과 선택",
    intro: "무료 타로는 질문 설계가 핵심입니다. 질문의 초점을 좁혀 해석을 행동으로 연결할 수 있습니다.",
    internalLinks: ["/insights/tarot", "/compatibility", "/daily-fortune", "/saju"],
    ctaServiceRoute: "/tarot",
  },
  {
    mainKeyword: "궁합 보기",
    relatedKeywords: ["사주 궁합", "숙요점 궁합", "자미두수 궁합", "연애운", "결혼운"],
    searchIntent: "두 사람 관계 분석을 여러 체계로 비교해 보고 싶은 의도",
    targetRoute: "/compatibility",
    pageType: "comparison",
    titleTemplate: "무료 궁합 보기 · 사주·숙요점·자미두수 관계 분석 | Code Destiny",
    descriptionTemplate: "사주·숙요점·자미두수 관점의 궁합을 교차 비교해 해석",
    h1: "무료 궁합 보기와 두 사람의 관계 분석",
    intro: "궁합은 점수보다 관계 리듬을 이해하는 도구입니다. 사주·숙요점·자미두수 결과를 함께 비교하세요.",
    internalLinks: ["/sukuyo/compatibility", "/insights/compatibility", "/ziwei", "/saju"],
    ctaServiceRoute: "/compatibility",
  },
  {
    mainKeyword: "꿈해몽",
    relatedKeywords: ["무료 꿈해몽", "돼지꿈 해몽", "연애꿈 해몽", "꿈 상징"],
    searchIntent: "꿈 상징을 빠르게 해석하고 일상 의미로 연결하려는 의도",
    targetRoute: "/dream",
    pageType: "service",
    titleTemplate: "무료 꿈해몽 · 꿈의 상징과 운세 해석 | Code Destiny",
    descriptionTemplate: "꿈 상징 해석과 기록 루틴을 제공하는 꿈해몽 랜딩",
    h1: "무료 꿈해몽으로 보는 무의식의 메시지",
    intro: "꿈해몽은 불안을 키우는 예언이 아니라 내 감정 상태와 미해결 과제를 점검하는 참고 도구입니다.",
    internalLinks: ["/insights/dream", "/daily-fortune", "/tarot", "/saju"],
    ctaServiceRoute: "/dream",
  },
  {
    mainKeyword: "동물관상",
    relatedKeywords: ["관상 보기", "얼굴 관상", "AI 관상", "얼굴 운세"],
    searchIntent: "관상 기능을 체험하고 성향 해석 맥락을 알고 싶은 의도",
    targetRoute: "/physiognomy",
    pageType: "service",
    titleTemplate: "동물관상 · 얼굴 관상과 성향 분석 | Code Destiny",
    descriptionTemplate: "동물관상 결과를 자기표현 전략으로 연결하는 페이지",
    h1: "동물관상으로 보는 나의 인상과 성향",
    intro: "동물관상은 외모 판정이 아니라 표정과 소통 습관을 해석해 자기이해를 돕는 도구로 활용해야 합니다.",
    internalLinks: ["/saju", "/tarot", "/insights", "/premium"],
    ctaServiceRoute: "/physiognomy",
  },
];
