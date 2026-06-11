import { FEATURE_KEY_PRICE_TABLE, normalizePaidFeatureKey } from "../../worker/lib/paid-feature-registry.js";

export type FeatureAccessType = "free" | "login_required" | "paid" | "premium_report";

export type ServiceFeatureCategory =
  | "saju"
  | "ziwei"
  | "astrology"
  | "tarot"
  | "face"
  | "palm"
  | "fun"
  | "love"
  | "premium";

export type ServiceFeature = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: ServiceFeatureCategory;
  image: string;
  heroImageAlt: string;
  detailRoute: string;
  launchRoute: string;
  accessType: FeatureAccessType;
  featureKey?: string;
  priceLabel?: string;
  coinPrice?: number;
  tags: string[];
  highlights: string[];
  howItWorks: { title: string; description: string }[];
  resultExamples: { title: string; description: string }[];
  premiumOptions?: {
    title: string;
    description: string;
    featureKey: string;
    coinPrice?: number;
    launchRoute: string;
  }[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
};

export const DEFAULT_SERVICE_IMAGE = "/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp";

type PriceSpec = { cost?: number };

function lookupServerCoinPrice(featureKey?: string): number | undefined {
  if (!featureKey) return undefined;
  const normalized = normalizePaidFeatureKey(featureKey);
  const direct = (FEATURE_KEY_PRICE_TABLE as Record<string, PriceSpec>)[normalized] || (FEATURE_KEY_PRICE_TABLE as Record<string, PriceSpec>)[featureKey];
  const value = Number(direct?.cost);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function withServerPrice(feature: ServiceFeature): ServiceFeature {
  const coinPrice = feature.coinPrice ?? lookupServerCoinPrice(feature.featureKey);
  const premiumOptions = (feature.premiumOptions || []).map((option) => ({
    ...option,
    coinPrice: option.coinPrice ?? lookupServerCoinPrice(option.featureKey),
  }));

  return {
    ...feature,
    coinPrice,
    premiumOptions,
  };
}

const FEATURES: ServiceFeature[] = ([
  {
    slug: "saju",
    title: "사주 정밀 분석",
    subtitle: "오행, 십성, 대운/세운 흐름까지 한 번에 읽는 핵심 명식 리딩",
    description:
      "생년월일과 태어난 시간을 기반으로 사주팔자 구조를 계산하고, 성격/연애/진로/재물 흐름을 이해하기 쉽게 정리합니다.",
    category: "saju",
    image: "/fuctionassets/saju.webp",
    heroImageAlt: "사주 정밀 분석 대표 이미지",
    detailRoute: "/services/saju",
    launchRoute: "/saju/basic/play",
    accessType: "free",
    tags: ["사주팔자", "오행", "십성", "대운", "세운"],
    highlights: ["기본 분석 무료", "입력 후 즉시 분석", "결과 저장 및 재확인 가능"],
    howItWorks: [
      { title: "출생 정보 입력", description: "생년월일, 출생 시간, 성별 정보를 입력합니다." },
      { title: "명식 계산", description: "내부 명리 엔진이 사주팔자와 핵심 지표를 계산합니다." },
      { title: "결과 확인", description: "기본 해석을 확인하고 필요 시 프리미엄 리포트로 확장합니다." },
    ],
    resultExamples: [
      { title: "나의 오행 밸런스", description: "목/화/토/금/수의 강약과 보완 포인트 요약" },
      { title: "연애 성향", description: "관계에서 강점과 주의해야 할 패턴" },
      { title: "진로 키워드", description: "직무 적성, 성장 방식, 협업 스타일" },
      { title: "시기 흐름", description: "대운/세운 기준의 기회 구간과 리스크 구간" },
    ],
    premiumOptions: [],
    seo: {
      title: "사주 정밀 분석 소개 | Code Destiny",
      description: "사주팔자, 오행, 십성, 대운/세운 흐름을 읽는 사주 정밀 분석 서비스 소개 페이지입니다.",
      keywords: ["사주", "사주팔자", "오행", "십성", "대운", "세운", "만세력"],
    },
  },
  {
    slug: "ziwei",
    title: "자미두수 명반 분석",
    subtitle: "명궁, 신궁, 12궁 구조를 해석하는 동양 운명 지도",
    description:
      "자미두수의 12궁 구조와 주요 성군 조합을 기반으로 인생 테마, 관계 패턴, 진로 흐름을 입체적으로 분석합니다.",
    category: "ziwei",
    image: "/fuctionassets/jami.webp",
    heroImageAlt: "자미두수 명반 분석 대표 이미지",
    detailRoute: "/services/ziwei",
    launchRoute: "/index.html?action=openZiweiModal",
    accessType: "free",
    tags: ["자미두수", "12궁", "명궁", "신궁", "주성"],
    highlights: ["기본 명반 무료", "궁합 확장 가능"],
    howItWorks: [
      { title: "출생 정보 입력", description: "생년월일시 입력으로 명반 계산 준비" },
      { title: "12궁 배치 계산", description: "명궁/신궁/주성 배치를 내부 엔진으로 계산" },
      { title: "해석 확인", description: "핵심 궁 해석과 프리미엄 확장 옵션 확인" },
    ],
    resultExamples: [
      { title: "핵심 궁 요약", description: "명궁·재백궁·관록궁의 핵심 포인트" },
      { title: "관계 흐름", description: "인연 패턴과 커뮤니케이션 스타일" },
      { title: "직업 적성", description: "성군 조합 기반 역할/직무 힌트" },
    ],
    premiumOptions: [],
    seo: {
      title: "자미두수 명반 분석 소개 | Code Destiny",
      description: "자미두수 12궁 기반으로 성향과 인생 흐름을 읽는 명반 분석 서비스 소개 페이지입니다.",
      keywords: ["자미두수", "紫微斗數", "12궁", "명반", "명궁", "신궁"],
    },
  },
  {
    slug: "sukyo",
    title: "숙요점 27숙 분석",
    subtitle: "27수 기반 성향, 관계, 운의 리듬을 읽는 동양 점성 리딩",
    description:
      "숙요 27수 체계를 바탕으로 성향, 인연, 운의 주기를 해석하고 관계 흐름을 이해하기 쉬운 형태로 제공합니다.",
    category: "astrology",
    image: "/fuctionassets/sukyo.webp",
    heroImageAlt: "숙요점 27숙 분석 대표 이미지",
    detailRoute: "/services/sukyo",
    launchRoute: "/index.html?action=openSukuyoModal",
    accessType: "free",
    tags: ["숙요점", "27수", "궁합", "관계 흐름"],
    highlights: ["기본 분석 무료", "관계 해석 확장 가능"],
    howItWorks: [
      { title: "출생 정보 입력", description: "생년월일 기반 27수 산출" },
      { title: "숙성 계산", description: "기본 성향/관계 리듬 계산" },
      { title: "결과 확인", description: "관계 해석과 확장 리포트 옵션 확인" },
    ],
    resultExamples: [
      { title: "기본 숙성 해석", description: "핵심 성향과 행동 리듬" },
      { title: "관계 궁합 포인트", description: "잘 맞는 상호작용과 주의 포인트" },
      { title: "운의 주기", description: "에너지 상승/정체 구간 가이드" },
    ],
    premiumOptions: [],
    seo: {
      title: "숙요점 27숙 분석 소개 | Code Destiny",
      description: "숙요점 27숙 체계로 성향, 궁합, 운의 흐름을 분석하는 서비스 소개 페이지입니다.",
      keywords: ["숙요점", "27수", "숙요", "궁합", "동양 점성술"],
    },
  },
  {
    slug: "vedic",
    title: "베다 점성술 분석",
    subtitle: "라그나, 다샤, 행성 배치로 읽는 인생 흐름",
    description:
      "인도 전통 조티쉬(Jyotish) 체계를 기반으로 라그나/나크샤트라/다샤를 해석해 인생의 장기 흐름을 읽습니다.",
    category: "astrology",
    image: "/fuctionassets/veda.webp",
    heroImageAlt: "베다 점성술 분석 대표 이미지",
    detailRoute: "/services/vedic",
    launchRoute: "/index.html?action=navigateToVedic",
    accessType: "free",
    tags: ["베다 점성술", "Jyotish", "라그나", "다샤"],
    highlights: ["기본 명반 무료", "심화 해석 확장 가능"],
    howItWorks: [
      { title: "출생 정보 입력", description: "출생 정보를 기준으로 베다 차트 계산" },
      { title: "행성/주기 분석", description: "라그나, 다샤, 나크샤트라 구조 해석" },
      { title: "결과 확인", description: "기본 해석과 프리미엄 확장 선택" },
    ],
    resultExamples: [
      { title: "라그나 중심 성향", description: "인생 운영 방식의 핵심 축" },
      { title: "다샤 주기", description: "시기별 테마와 전환 포인트" },
      { title: "관계/직업 힌트", description: "행성 배치 기반 실전 가이드" },
    ],
    premiumOptions: [],
    seo: {
      title: "베다 점성술 분석 소개 | Code Destiny",
      description: "라그나와 다샤 중심으로 인생 흐름을 해석하는 베다 점성술 서비스 소개 페이지입니다.",
      keywords: ["베다 점성술", "Jyotish", "라그나", "다샤", "나크샤트라"],
    },
  },
  {
    slug: "astrology",
    title: "서양 점성술 차트 분석",
    subtitle: "태양, 달, 상승궁과 하우스 기반의 코즈믹 리딩",
    description:
      "태양궁, 달궁, 상승궁과 하우스 구조를 중심으로 성향과 시기 흐름을 읽는 서양 점성술 분석 서비스입니다.",
    category: "astrology",
    image: "/fuctionassets/jumsung.webp",
    heroImageAlt: "서양 점성술 차트 분석 대표 이미지",
    detailRoute: "/services/astrology",
    launchRoute: "/index.html?action=openAstroModal",
    accessType: "free",
    tags: ["점성술", "태양궁", "달궁", "상승궁", "하우스"],
    highlights: ["기본 차트 무료", "궁합 50코인", "심화 해석 가능"],
    howItWorks: [
      { title: "출생 정보 입력", description: "출생 시간을 포함해 차트 계산" },
      { title: "코즈믹 차트 생성", description: "행성/하우스 기반 핵심 축 계산" },
      { title: "해석 확인", description: "성향/관계/시기 흐름을 단계별 확인" },
    ],
    resultExamples: [
      { title: "기본 3축", description: "태양·달·상승궁의 기본 성향" },
      { title: "관계 패턴", description: "감정/표현/소통 방식" },
      { title: "관심 영역", description: "하우스 기반 삶의 우선순위" },
    ],
    premiumOptions: [],
    seo: {
      title: "서양 점성술 차트 분석 소개 | Code Destiny",
      description: "태양, 달, 상승궁 기반으로 성향과 흐름을 읽는 서양 점성술 서비스 소개 페이지입니다.",
      keywords: ["점성술", "서양 점성술", "태양궁", "달궁", "상승궁", "코즈믹"],
    },
  },
  {
    slug: "tarot",
    title: "타로 리딩",
    subtitle: "연애, 선택, 감정 흐름을 카드 상징으로 읽는 핵심 리딩",
    description:
      "타로 상징과 스프레드 구조를 활용해 현재 상황과 선택의 방향을 읽고, 필요한 행동 힌트를 제공합니다.",
    category: "tarot",
    image: "/fuctionassets/ai%20tarrot.webp",
    heroImageAlt: "타로 리딩 대표 이미지",
    detailRoute: "/services/tarot",
    launchRoute: "/index.html?action=openTarotModal",
    accessType: "free",
    tags: ["타로", "연애", "선택", "리딩"],
    highlights: ["기본 리딩 무료", "심화 스프레드는 코인 과금"],
    howItWorks: [
      { title: "질문 설정", description: "현재 고민과 질문을 정리합니다." },
      { title: "카드 전개", description: "스프레드 규칙에 따라 카드가 열립니다." },
      { title: "상징 해석", description: "핵심 메시지와 실행 힌트를 확인합니다." },
    ],
    resultExamples: [
      { title: "현재 흐름", description: "지금 상황의 핵심 정리" },
      { title: "막히는 포인트", description: "의사결정을 방해하는 패턴" },
      { title: "실행 제안", description: "오늘 적용할 수 있는 1~2개 행동 힌트" },
    ],
    seo: {
      title: "타로 리딩 소개 | Code Destiny",
      description: "연애, 선택, 관계 흐름을 카드 상징으로 해석하는 타로 리딩 서비스 소개 페이지입니다.",
      keywords: ["타로", "타로 리딩", "연애 타로", "운세", "카드 리딩"],
    },
  },
  {
    slug: "tarot-prompt-maker",
    title: "타로 프롬프트 라이브러리",
    subtitle: "질문, 스프레드 선택, 카드 드로우를 묶어 Oracle Prompt까지 완성",
    description:
      "사용자의 질문을 카테고리로 분석하고, 상황에 맞는 스프레드를 추천한 뒤 직접 카드를 뽑아 포지션 의미와 해석 지침을 결합한 Oracle Prompt를 완성합니다.",
    category: "tarot",
    image: "/fuctionassets/연애 재회 타로 프롬프트 메이커.webp",
    heroImageAlt: "타로 프롬프트 라이브러리 대표 이미지",
    detailRoute: "/services/tarot-prompt-maker",
    launchRoute: "/tarot/prompt-maker",
    accessType: "paid",
    featureKey: "tarot-prompt-maker",
    tags: ["타로", "프롬프트", "스프레드", "AI 리딩"],
    highlights: ["질문 자동 분류", "63개 스프레드 라이브러리", "1회 50코인"],
    howItWorks: [
      { title: "질문 입력", description: "지금 궁금한 상황을 자연어로 입력합니다." },
      { title: "스프레드 선택", description: "질문 의도에 맞는 스프레드를 고르고 카드 수만큼 직접 드로우합니다." },
      { title: "프롬프트 생성", description: "카드 포지션, 방향, 해석 규칙이 포함된 Oracle Prompt를 완성합니다." },
    ],
    resultExamples: [
      { title: "질문 분석", description: "질문의 핵심 의도와 카테고리 요약" },
      { title: "스프레드 보드", description: "질문 맞춤 스프레드와 포지션 구조 미리보기" },
      { title: "완성 프롬프트", description: "AI에 바로 붙여넣을 수 있는 구조형 Oracle Prompt" },
    ],
    seo: {
      title: "타로 프롬프트 라이브러리 소개 | Code Destiny",
      description: "질문 기반 스프레드 선택과 카드 드로우를 통해 Oracle Prompt를 완성하는 타로 프롬프트 라이브러리 소개 페이지입니다.",
      keywords: ["타로 프롬프트", "AI 타로", "타로 프롬프트 라이브러리", "타로 질문 생성기"],
    },
  },
  {
    slug: "palm-reading",
    title: "AI 손금 분석",
    subtitle: "생명선, 감정선, 두뇌선, 운명선 기반 이미지 리딩",
    description:
      "손바닥 이미지를 바탕으로 핵심 손금 라인을 읽어 성향, 관계, 재물, 진로 흐름을 분석합니다.",
    category: "palm",
    image: "/fuctionassets/%EC%86%90%EA%B8%88.webp",
    heroImageAlt: "AI 손금 분석 대표 이미지",
    detailRoute: "/services/palm-reading",
    launchRoute: "/palm-reading",
    accessType: "paid",
    priceLabel: "부분 유료",
    tags: ["손금", "AI 이미지 분석", "생명선", "감정선"],
    highlights: ["기본 진입 가능", "상세 리딩은 코인 기반"],
    howItWorks: [
      { title: "손바닥 업로드", description: "안내에 따라 손바닥 이미지를 업로드합니다." },
      { title: "라인 분석", description: "핵심 손금 라인과 패턴을 추출합니다." },
      { title: "결과 확인", description: "카테고리별 해석 결과를 확인합니다." },
    ],
    resultExamples: [
      { title: "생명선 상태", description: "기본 에너지와 회복 패턴" },
      { title: "감정선 해석", description: "관계 반응과 애정 표현 방식" },
      { title: "직업/재물 흐름", description: "실행 스타일과 자원 운용 패턴" },
    ],
    seo: {
      title: "AI 손금 분석 소개 | Code Destiny",
      description: "손바닥 이미지를 기반으로 생명선, 감정선, 운명선을 읽는 AI 손금 분석 서비스 소개 페이지입니다.",
      keywords: ["손금", "손금 분석", "AI 손금", "생명선", "운명선"],
    },
  },
  {
    slug: "face-reading",
    title: "AI 관상 분석",
    subtitle: "얼굴 이미지 기반 인상/기질/관계 성향 리딩",
    description:
      "얼굴 이미지를 바탕으로 인상, 기질, 관계 성향, 커뮤니케이션 특성을 분석하는 AI 관상 서비스입니다.",
    category: "face",
    image: "/fuctionassets/ai%20animal.webp",
    heroImageAlt: "AI 관상 분석 대표 이미지",
    detailRoute: "/services/face-reading",
    launchRoute: "/saju-picture",
    accessType: "free",
    tags: ["관상", "AI 분석", "얼굴형", "기질"],
    highlights: ["셀카 기반", "초보자 친화 안내"],
    howItWorks: [
      { title: "이미지 업로드", description: "셀카를 업로드합니다." },
      { title: "특징 추출", description: "얼굴형/이목구비 패턴을 분석합니다." },
      { title: "리포트 확인", description: "성향과 관계 패턴을 카드로 확인합니다." },
    ],
    resultExamples: [
      { title: "인상 키워드", description: "첫인상/분위기 중심 키워드" },
      { title: "관계 스타일", description: "소통/경계/친밀도 형성 패턴" },
      { title: "강점 요약", description: "일상과 업무에서의 강점" },
    ],
    seo: {
      title: "AI 관상 분석 소개 | Code Destiny",
      description: "얼굴 이미지를 기반으로 인상과 성향을 읽는 AI 관상 분석 서비스 소개 페이지입니다.",
      keywords: ["관상", "AI 관상", "얼굴 분석", "성향 분석"],
    },
  },
  {
    slug: "bias-destiny",
    title: "최애운명",
    subtitle: "나의 사주 에너지와 최애 상징 에너지를 연결한 포토카드형 리딩",
    description:
      "사주 기반 에너지 지표를 활용해 최애와의 공명 포인트를 시각적으로 제시하는 팬덤 특화 운세 콘텐츠입니다.",
    category: "love",
    image: "/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp",
    heroImageAlt: "최애운명 대표 이미지",
    detailRoute: "/services/bias-destiny",
    launchRoute: "/saju/destiny-bias",
    accessType: "paid",
    featureKey: "destiny-bias-analyze",
    tags: ["최애운명", "팬덤", "포토카드", "사주 공명"],
    highlights: ["1회 분석형", "포토카드 스타일 결과"],
    howItWorks: [
      { title: "프로필 입력", description: "나와 최애의 기본 정보를 입력합니다." },
      { title: "공명 계산", description: "내부 엔진으로 에너지 공명을 계산합니다." },
      { title: "카드 확인", description: "요약 카드와 행동 힌트를 확인합니다." },
    ],
    resultExamples: [
      { title: "공명 점수", description: "현재 공명 강도와 의미" },
      { title: "보완 포인트", description: "관계/덕질 루틴 보완 가이드" },
      { title: "오늘의 액션", description: "실행 가능한 1일 미션" },
    ],
    seo: {
      title: "최애운명 소개 | Code Destiny",
      description: "사주 에너지 기반으로 최애와의 공명 포인트를 읽는 최애운명 서비스 소개 페이지입니다.",
      keywords: ["최애운명", "팬덤 운세", "사주 공명", "포토카드 운세"],
    },
  },
  {
    slug: "love-code",
    title: "러브 코드",
    subtitle: "상대 사주 기반 연애 시뮬레이션과 궁합 흐름 분석",
    description:
      "상대의 생년월일 정보를 바탕으로 연애 페르소나를 구성하고, 시뮬레이션형으로 관계 흐름을 체험하는 기능입니다.",
    category: "love",
    image: "/fuctionassets/love code.webp",
    heroImageAlt: "러브 코드 대표 이미지",
    detailRoute: "/services/love-code",
    launchRoute: "/index.html?action=openLoveSimulation",
    accessType: "paid",
    featureKey: "loveSimulation",
    tags: ["러브 코드", "연애 시뮬레이션", "궁합", "사주"],
    highlights: ["시뮬레이션형 체험", "코인 기반 실행"],
    howItWorks: [
      { title: "상대 정보 입력", description: "상대 생년월일로 기본 사주 정보를 구성합니다." },
      { title: "페르소나 생성", description: "연애 반응 패턴을 시뮬레이션용으로 생성합니다." },
      { title: "시나리오 체험", description: "선택지에 따른 반응 흐름을 확인합니다." },
    ],
    resultExamples: [
      { title: "연애 페르소나", description: "상대의 관계 반응 스타일" },
      { title: "상호작용 지점", description: "잘 맞는 대화/충돌 패턴" },
      { title: "데이트 이벤트", description: "선택지 기반 결과 변화" },
    ],
    seo: {
      title: "러브 코드 소개 | Code Destiny",
      description: "상대 사주 기반으로 연애 시뮬레이션을 제공하는 러브 코드 서비스 소개 페이지입니다.",
      keywords: ["러브 코드", "연애 시뮬레이션", "사주 연애", "궁합"],
    },
  },
  {
    slug: "omikuji",
    title: "이모이 오미쿠지",
    subtitle: "일본 신사 감성의 라이트 운세 뽑기",
    description:
      "오늘의 기분과 고민을 바탕으로 간단한 운세 메시지와 행동 힌트를 제공하는 감성형 오미쿠지 콘텐츠입니다.",
    category: "fun",
    image: "/fuctionassets/%EC%98%A4%EB%AF%B8%EC%BF%A0%EC%A7%80.webp",
    heroImageAlt: "이모이 오미쿠지 대표 이미지",
    detailRoute: "/services/omikuji",
    launchRoute: "/emoi_omikuji_v2.html",
    accessType: "free",
    tags: ["오미쿠지", "감성 운세", "라이트 리딩"],
    highlights: ["무료", "빠른 결과", "공유 친화"],
    howItWorks: [
      { title: "분위기 선택", description: "현재 고민/분위기를 가볍게 선택합니다." },
      { title: "운세 추첨", description: "오미쿠지 결과를 즉시 생성합니다." },
      { title: "행동 힌트 확인", description: "오늘 적용할 짧은 가이드를 확인합니다." },
    ],
    resultExamples: [
      { title: "오늘의 기류", description: "총운 요약 한 줄" },
      { title: "행운 키워드", description: "추천 행동/회피 행동" },
      { title: "감정 리마인더", description: "관계/일상에서의 주의점" },
    ],
    seo: {
      title: "이모이 오미쿠지 소개 | Code Destiny",
      description: "일본 신사 감성으로 오늘의 운세를 가볍게 확인하는 이모이 오미쿠지 소개 페이지입니다.",
      keywords: ["오미쿠지", "오늘의 운세", "감성 운세", "일본 운세"],
    },
  },
  {
    slug: "saju-animal",
    title: "사주 가디언 아트",
    subtitle: "내 사주 속 수호동물을 소환하는 사주 캐릭터 테스트",
    description:
      "일간, 월지, 오행 균형, 십성 흐름을 계산해 나를 지켜주는 수호동물과 운명 보호 스타일을 카드형으로 안내합니다.",
    category: "fun",
    image: "/fuctionassets/%EB%8F%99%EB%AC%BC%EC%A0%90%ED%85%8C%EC%8A%A4%ED%8A%B8.webp",
    heroImageAlt: "사주 가디언 아트 수호동물 카드 이미지",
    detailRoute: "/services/saju-animal",
    launchRoute: "/saju/animal-destiny",
    accessType: "paid",
    featureKey: "animal-destiny-unlock",
    tags: ["사주 가디언", "수호동물", "오행 테스트", "성향 분석"],
    highlights: ["수호동물 카드", "사주 근거", "공유 카드"],
    howItWorks: [
      { title: "출생 정보 입력", description: "기본 사주 입력값을 등록합니다." },
      { title: "사주 에너지 분석", description: "일간, 월지, 오행 균형, 십성 흐름을 함께 계산합니다." },
      { title: "가디언 카드 확인", description: "수호동물 카드와 사주 근거, 수호력 메시지를 확인합니다." },
    ],
    resultExamples: [
      { title: "수호동물", description: "내 사주에 배정된 가디언 캐릭터" },
      { title: "사주 근거", description: "일간·월지·오행·십성 기반 배정 이유" },
      { title: "오늘의 메시지", description: "지금 필요한 수호동물의 한 줄 조언" },
    ],
    seo: {
      title: "사주 가디언 아트 소개 | Code Destiny",
      description: "사주 오행과 십성 흐름으로 내 수호동물과 운명 보호 스타일을 확인하는 사주 가디언 테스트입니다.",
      keywords: ["사주 가디언", "수호동물", "오행 테스트", "사주 성향 테스트"],
    },
  },
  {
    slug: "destiny-meeting-place",
    title: "사주로 보는 인연의 장소",
    subtitle: "사주 에너지로 만남 장소·도시·시기를 추천하는 독립 리포트",
    description:
      "생년월일 입력만으로 사주 에너지 흐름을 분석해 인연이 열리는 장소 TOP5, 국가/도시, 타이밍, 스타일 아이템을 제안합니다.",
    category: "fun",
    image: "/fuctionassets/%EC%82%AC%EC%A3%BC%EB%A1%9C%EB%B3%B4%EB%8A%94%20%EC%9D%B8%EC%97%B0%EC%9D%98%20%EC%9E%A5%EC%86%8C.webp",
    heroImageAlt: "사주로 보는 인연의 장소 대표 이미지",
    detailRoute: "/services/destiny-meeting-place",
    launchRoute: "/saju/destiny-meeting-place",
    accessType: "paid",
    featureKey: "destiny_meeting_place",
    tags: ["인연 장소", "사주 오행", "만남 타이밍", "국가 추천"],
    highlights: ["독립 실행", "장소/도시/시기 통합 리포트"],
    howItWorks: [
      { title: "출생 정보 입력", description: "생년월일과 시간을 입력합니다." },
      { title: "사주 에너지 계산", description: "일간과 오행 흐름을 기반으로 만남 패턴을 분석합니다." },
      { title: "장소 리포트 확인", description: "인연 장소 TOP5, 도시, 시기, 실천 플랜을 확인합니다." },
    ],
    resultExamples: [
      { title: "인연 장소 TOP5", description: "공간 유형별 만남 확률과 행동 팁" },
      { title: "국가/도시 추천", description: "오행 흐름에 맞는 도시와 여행 무드" },
      { title: "타이밍/스타일", description: "만남운 시즌과 실전 스타일 가이드" },
    ],
    seo: {
      title: "사주로 보는 인연의 장소 소개 | Code Destiny",
      description: "사주 에너지로 인연 장소, 도시, 시기를 추천하는 독립 실행 리포트 서비스 소개 페이지입니다.",
      keywords: ["사주 인연 장소", "인연운", "사주 장소 추천", "만남 타이밍"],
    },
  },
  {
    slug: "saju-lifebook",
    title: "사주 인생의 책 PDF",
    subtitle: "사주 핵심 지표를 13챕터로 재구성한 프리미엄 인생 전략서",
    description:
      "출생 정보를 기반으로 로컬 사주 계산 결과를 먼저 정리한 뒤, 13개 챕터 구조로 확장해 PDF 저장에 적합한 리포트를 생성합니다.",
    category: "premium",
    image: "/fuctionassets/lifebook.webp",
    heroImageAlt: "사주 인생의 책 PDF 대표 이미지",
    detailRoute: "/services/saju-lifebook",
    launchRoute: "/premium/saju-lifebook",
    accessType: "premium_report",
    featureKey: "saju_life_book_pdf",
    priceLabel: "500코인",
    tags: ["사주", "인생 전략", "13챕터", "PDF"],
    highlights: ["13챕터 고정 구조", "로컬 계산 우선", "PDF 저장용 결과"],
    howItWorks: [
      { title: "출생 정보 입력", description: "생년월일시와 기본 프로필을 입력합니다." },
      { title: "사주 계산", description: "로컬 계산 엔진으로 핵심 지표를 먼저 구성합니다." },
      { title: "리포트 생성", description: "13챕터 구조로 정리된 프리미엄 리포트를 생성합니다." },
    ],
    resultExamples: [
      { title: "핵심 사주 요약", description: "일간/오행/용희기신 중심 해석" },
      { title: "13챕터 구조", description: "관계·커리어·재물·건강·전환점까지 고정 목차" },
      { title: "실행 제안", description: "챕터별 실전 액션 플랜" },
    ],
    seo: {
      title: "사주 인생의 책 PDF 소개 | Code Destiny",
      description: "사주 핵심 지표를 13챕터로 정리해 PDF로 저장하는 프리미엄 인생 전략 리포트 소개 페이지입니다.",
      keywords: ["사주 인생의 책", "사주 PDF", "13챕터 사주", "인생 전략 리포트"],
    },
  },
  {
    slug: "ziwei-premium-pdf",
    title: "자미두수 프리미엄 PDF",
    subtitle: "명궁과 12궁으로 읽는 운명의 별자리",
    description:
      "자미두수 명반을 바탕으로 명궁, 신궁, 사화, 14주성, 12궁, 대한과 유년 흐름을 15챕터로 깊이 있게 해석합니다.",
    category: "premium",
    image: "/fuctionassets/jamipremiun.webp",
    heroImageAlt: "자미두수 프리미엄 PDF 대표 이미지",
    detailRoute: "/services/ziwei",
    launchRoute: "/index.html?action=gotoZiweiPremium",
    accessType: "premium_report",
    featureKey: "premium_pdf_ziwei",
    priceLabel: "590코인",
    tags: ["ZIWEI", "PREMIUM", "15 CHAPTERS", "PDF"],
    highlights: ["15챕터 고정 구조", "명궁·신궁·12궁 기반", "대한·유년 종합 전략"],
    howItWorks: [
      { title: "출생 정보 입력", description: "생년월일시와 기본 프로필을 입력합니다." },
      { title: "자미두수 명반 계산", description: "로컬 자미두수 엔진으로 명궁, 신궁, 12궁, 사화, 대운 데이터를 먼저 계산합니다." },
      { title: "프리미엄 PDF 생성", description: "계산된 명반을 15챕터 구조로 정리해 PDF 저장용 리포트를 생성합니다." },
    ],
    resultExamples: [
      { title: "명궁·신궁 해석", description: "선천 기질과 후천적으로 완성되는 나의 방향" },
      { title: "12궁 심층 리포트", description: "사랑, 재물, 직업, 건강, 관계, 복덕의 궁별 해석" },
      { title: "대운·유년 전략", description: "앞으로 열리는 운의 흐름과 선택 기준" },
    ],
    seo: {
      title: "자미두수 프리미엄 PDF 소개 | Code Destiny",
      description: "자미두수 명반을 바탕으로 명궁, 신궁, 12궁, 대한과 유년 흐름을 15챕터로 해석하는 프리미엄 PDF 리포트 소개 페이지입니다.",
      keywords: ["자미두수 프리미엄 PDF", "자미두수 PDF", "명궁 해석", "15챕터 자미두수"],
    },
  },
  {
    slug: "stonehenge-rune",
    title: "스톤헨지 룬점",
    subtitle: "고대 룬 상징으로 읽는 선택/시기 신탁",
    description:
      "1/3/5/12 룬 스프레드를 통해 현재 질문의 흐름과 선택의 방향을 정교하게 안내하는 룬 오라클입니다.",
    category: "premium",
    image: "/fuctionassets/rune.webp",
    heroImageAlt: "스톤헨지 룬점 대표 이미지",
    detailRoute: "/services/stonehenge-rune",
    launchRoute: "/index.html?action=openRuneOracle",
    accessType: "paid",
    featureKey: "stonehengeRunes",
    priceLabel: "30~120코인",
    tags: ["룬", "오라클", "스톤헨지", "선택 리딩"],
    highlights: ["다중 스프레드", "질문형 리딩"],
    howItWorks: [
      { title: "질문 설정", description: "현재 가장 중요한 질문을 정리합니다." },
      { title: "룬 전개", description: "선택한 스프레드로 룬을 뽑습니다." },
      { title: "상징 해석", description: "룬 상징과 조합 의미를 확인합니다." },
    ],
    resultExamples: [
      { title: "현재 신호", description: "지금 알아야 할 핵심 메시지" },
      { title: "행동 가이드", description: "진행/보류/전환 판단 포인트" },
      { title: "장기 흐름", description: "시기별 주의 구간과 기회 구간" },
    ],
    seo: {
      title: "스톤헨지 룬점 소개 | Code Destiny",
      description: "고대 룬 상징으로 선택과 시기를 해석하는 스톤헨지 룬 오라클 소개 페이지입니다.",
      keywords: ["룬", "스톤헨지 룬", "룬 오라클", "룬 점"],
    },
  },
  {
    slug: "animal-totem",
    title: "애니멀 토템",
    subtitle: "수호 동물 메시지를 읽는 카드형 리딩",
    description:
      "현재 상태에 맞는 수호 동물 상징을 기반으로 경고/행운/실행 힌트를 제공하는 토템 리딩입니다.",
    category: "fun",
    image: "/fuctionassets/animaltotem.webp",
    heroImageAlt: "애니멀 토템 대표 이미지",
    detailRoute: "/services/animal-totem",
    launchRoute: "/index.html?action=openAnimalTotemModal",
    accessType: "paid",
    featureKey: "animal-totem-basic",
    priceLabel: "30~60코인",
    tags: ["토템", "수호 동물", "카드 리딩"],
    highlights: ["기본/심화 모드", "상징형 메시지"],
    howItWorks: [
      { title: "의도 설정", description: "지금 필요한 질문을 정리합니다." },
      { title: "토템 추출", description: "현재 상태에 맞는 동물 상징을 선택합니다." },
      { title: "메시지 확인", description: "경고/행운/실행 힌트를 확인합니다." },
    ],
    resultExamples: [
      { title: "오늘의 수호 동물", description: "핵심 에너지와 심리 상태 요약" },
      { title: "경고 메시지", description: "피해야 할 패턴" },
      { title: "행운 행동", description: "오늘 시도하면 좋은 루틴" },
    ],
    seo: {
      title: "애니멀 토템 소개 | Code Destiny",
      description: "수호 동물 상징으로 현재 흐름을 읽는 애니멀 토템 서비스 소개 페이지입니다.",
      keywords: ["애니멀 토템", "수호 동물", "토템 리딩"],
    },
  },
] as ServiceFeature[]).map(withServerPrice);

export const SERVICE_FEATURES: ServiceFeature[] = FEATURES;

export const SERVICE_FEATURE_BY_SLUG: Record<string, ServiceFeature> = Object.freeze(
  FEATURES.reduce<Record<string, ServiceFeature>>((acc, feature) => {
    acc[feature.slug] = feature;
    return acc;
  }, {}),
);

export function listServiceFeatures(): ServiceFeature[] {
  return SERVICE_FEATURES;
}

export function listServiceSlugs(): string[] {
  return SERVICE_FEATURES.map((feature) => feature.slug);
}

export function getServiceFeatureBySlug(slug: string): ServiceFeature | null {
  return SERVICE_FEATURE_BY_SLUG[slug] || null;
}

export function getServiceDetailRouteByLaunchRoute(launchRoute: string): string | null {
  const matched = SERVICE_FEATURES.find((feature) => feature.launchRoute === launchRoute);
  return matched ? matched.detailRoute : null;
}
