import { lookupServerCoinPrice } from "./serviceCoinPrice";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

// 가격 조회만 필요한 클라이언트는 ./serviceCoinPrice 를 직접 import 할 것.
// 여기서 가져오면 아래 12로케일 카피 표(약 9,000줄)까지 번들에 실린다.
export { lookupServerCoinPrice };

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

const stableServiceAsset = (publicPath: string) => getAssetUrlFromPublicPath(publicPath);

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

type ServiceFeatureLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "hi" | "es" | "fr" | "de" | "nl" | "ms";

type ServiceFeatureCopy = Pick<
  ServiceFeature,
  "title" | "subtitle" | "description" | "heroImageAlt" | "tags" | "highlights" | "howItWorks" | "resultExamples" | "seo"
> & {
  priceLabel?: string;
  premiumOptions?: ServiceFeature["premiumOptions"];
};

type ServiceFeatureDefinition = Omit<ServiceFeature, keyof ServiceFeatureCopy | "priceLabel" | "premiumOptions"> & {
  copyKey: keyof typeof SERVICE_FEATURE_TRANSLATIONS.ko;
};

const SERVICE_FEATURE_LOCALES: ServiceFeatureLocale[] = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"];

const SERVICE_FEATURE_TRANSLATIONS = {
  "ko": {
    "saju": {
      "title": "사주 정밀 분석",
      "subtitle": "오행, 십성, 대운/세운 흐름까지 한 번에 읽는 핵심 명식 리딩",
      "description": "생년월일과 태어난 시간을 기반으로 사주팔자 구조를 계산하고, 성격/연애/진로/재물 흐름을 이해하기 쉽게 정리합니다.",
      "heroImageAlt": "사주 정밀 분석 대표 이미지",
      "tags": ["사주팔자", "오행", "십성", "대운", "세운"],
      "highlights": ["기본 분석 무료", "입력 후 즉시 분석", "결과 저장 및 재확인 가능"],
      "howItWorks": [
        {
          "title": "출생 정보 입력",
          "description": "생년월일, 출생 시간, 성별 정보를 입력합니다."
        },
        {
          "title": "명식 계산",
          "description": "내부 명리 엔진이 사주팔자와 핵심 지표를 계산합니다."
        },
        {
          "title": "결과 확인",
          "description": "기본 해석을 확인하고 필요 시 프리미엄 리포트로 확장합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "나의 오행 밸런스",
          "description": "목/화/토/금/수의 강약과 보완 포인트 요약"
        },
        {
          "title": "연애 성향",
          "description": "관계에서 강점과 주의해야 할 패턴"
        },
        {
          "title": "진로 키워드",
          "description": "직무 적성, 성장 방식, 협업 스타일"
        },
        {
          "title": "시기 흐름",
          "description": "대운/세운 기준의 기회 구간과 리스크 구간"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "사주 정밀 분석 소개 | Code Destiny",
        "description": "사주팔자, 오행, 십성, 대운/세운 흐름을 읽는 사주 정밀 분석 서비스 소개 페이지입니다.",
        "keywords": ["사주", "사주팔자", "오행", "십성", "대운", "세운", "만세력"]
      }
    },
    "ziwei": {
      "title": "심화 자미두수 12궁 상담",
      "subtitle": "명궁, 신궁, 사화와 12궁 구조를 해석하는 동양 운명 지도",
      "description": "자미두수의 12궁 구조와 주요 성요 조합을 기반으로 인생 테마, 관계 패턴, 진로 흐름을 입체적으로 분석합니다.",
      "heroImageAlt": "심화 자미두수 12궁 상담 대표 이미지",
      "tags": ["자미두수", "12궁", "명궁", "신궁", "사화"],
      "highlights": ["명궁~복덕궁 12궁 인생 전체 해석", "사화·삼방사정·대한 흐름 심층", "전문가 심층 PDF 리포트 (15챕터·3~4만자)"],
      "howItWorks": [
        {
          "title": "출생 정보 입력",
          "description": "생년월일시 입력으로 명반 계산 준비"
        },
        {
          "title": "12궁 배치 계산",
          "description": "명궁·신궁·주성 배치를 내부 엔진으로 계산"
        },
        {
          "title": "해석 확인",
          "description": "핵심 궁 해석과 심화 리포트 확장 옵션 확인"
        }
      ],
      "resultExamples": [
        {
          "title": "핵심 궁 요약",
          "description": "명궁·재백궁·관록궁의 핵심 포인트"
        },
        {
          "title": "관계 흐름",
          "description": "인연 패턴과 커뮤니케이션 스타일"
        },
        {
          "title": "직업 적성",
          "description": "성요 조합 기반 역할·직무 힌트"
        }
      ],
      "priceLabel": "20,000원",
      "premiumOptions": [],
      "seo": {
        "title": "심화 자미두수 12궁 상담 소개 | Code Destiny",
        "description": "자미두수 12궁과 명궁, 신궁, 사화 흐름으로 성향과 인생 흐름을 읽는 심화 상담 서비스 소개 페이지입니다.",
        "keywords": ["자미두수", "紫微斗數", "12궁", "명반", "명궁", "신궁", "사화"]
      }
    },
    "sukyo": {
      "title": "숙요 인연 레이더",
      "subtitle": "27숙 관계법으로 끌림, 안정감, 소모도, 장기 인연 가능성을 비추는 관계 리딩",
      "description": "내 본명숙과 상대 본명숙을 바탕으로 관계 타입, 거리, 레이더 지수, 관계 목적별 조언을 엽니다.",
      "heroImageAlt": "숙요 인연 레이더 대표 이미지",
      "tags": ["숙요점", "27숙", "궁합", "인연 레이더"],
      "highlights": ["본명숙 무료", "인연 레이더 확장"],
      "howItWorks": [
        {
          "title": "출생 정보 입력",
          "description": "생년월일 기반 27수 산출"
        },
        {
          "title": "숙성 계산",
          "description": "기본 성향/관계 리듬 계산"
        },
        {
          "title": "결과 확인",
          "description": "관계 해석과 확장 리포트 옵션 확인"
        }
      ],
      "resultExamples": [
        {
          "title": "기본 숙성 해석",
          "description": "핵심 성향과 행동 리듬"
        },
        {
          "title": "관계 궁합 포인트",
          "description": "잘 맞는 상호작용과 주의 포인트"
        },
        {
          "title": "운의 주기",
          "description": "에너지 상승/정체 구간 가이드"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "숙요점 27숙 분석 소개 | Code Destiny",
        "description": "숙요점 27숙 체계로 성향, 궁합, 운의 흐름을 분석하는 서비스 소개 페이지입니다.",
        "keywords": ["숙요점", "27수", "숙요", "궁합", "동양 점성술"]
      }
    },
    "vedic": {
      "title": "베다 점성술 분석",
      "subtitle": "라그나, 다샤, 행성 배치로 읽는 인생 흐름",
      "description": "인도 전통 조티쉬(Jyotish)의 라그나와 나크샤트라, 다샤 위로 인생의 장기 흐름이 드러납니다.",
      "heroImageAlt": "베다 점성술 분석 대표 이미지",
      "tags": ["베다 점성술", "Jyotish", "라그나", "다샤"],
      "highlights": ["기본 명반 무료", "심화 해석 확장 가능"],
      "howItWorks": [
        {
          "title": "출생 정보 입력",
          "description": "출생 정보를 기준으로 베다 차트 계산"
        },
        {
          "title": "행성/주기 분석",
          "description": "라그나, 다샤, 나크샤트라 구조 해석"
        },
        {
          "title": "결과 확인",
          "description": "기본 해석과 프리미엄 확장 선택"
        }
      ],
      "resultExamples": [
        {
          "title": "라그나 중심 성향",
          "description": "인생 운영 방식의 핵심 축"
        },
        {
          "title": "다샤 주기",
          "description": "시기별 테마와 전환 포인트"
        },
        {
          "title": "관계/직업 힌트",
          "description": "행성 배치 기반 실전 가이드"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "베다 점성술 분석 소개 | Code Destiny",
        "description": "라그나와 다샤 중심으로 인생 흐름을 해석하는 베다 점성술 서비스 소개 페이지입니다.",
        "keywords": ["베다 점성술", "Jyotish", "라그나", "다샤", "나크샤트라"]
      }
    },
    "astrology": {
      "title": "서양 점성술 차트 분석",
      "subtitle": "태양, 달, 상승궁과 하우스 기반의 코즈믹 리딩",
      "description": "태양궁, 달궁, 상승궁과 하우스 구조를 중심으로 성향과 시기 흐름을 읽는 서양 점성술 분석 서비스입니다.",
      "heroImageAlt": "서양 점성술 차트 분석 대표 이미지",
      "tags": ["점성술", "태양궁", "달궁", "상승궁", "하우스"],
      "highlights": ["기본 차트 무료", "궁합 5,000원", "심화 해석 가능"],
      "howItWorks": [
        {
          "title": "출생 정보 입력",
          "description": "출생 시간을 포함해 차트 계산"
        },
        {
          "title": "코즈믹 차트 생성",
          "description": "행성/하우스 기반 핵심 축 계산"
        },
        {
          "title": "해석 확인",
          "description": "성향/관계/시기 흐름을 단계별 확인"
        }
      ],
      "resultExamples": [
        {
          "title": "기본 3축",
          "description": "태양·달·상승궁의 기본 성향"
        },
        {
          "title": "관계 패턴",
          "description": "감정/표현/소통 방식"
        },
        {
          "title": "관심 영역",
          "description": "하우스 기반 삶의 우선순위"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "서양 점성술 차트 분석 소개 | Code Destiny",
        "description": "태양, 달, 상승궁 기반으로 성향과 흐름을 읽는 서양 점성술 서비스 소개 페이지입니다.",
        "keywords": ["점성술", "서양 점성술", "태양궁", "달궁", "상승궁", "코즈믹"]
      }
    },
    "tarot": {
      "title": "타로 리딩",
      "subtitle": "연애, 선택, 감정 흐름을 카드 상징으로 읽는 핵심 리딩",
      "description": "타로 상징과 스프레드의 흐름 속에서 현재의 감정과 선택의 실마리가 강하게 떠오릅니다.",
      "heroImageAlt": "타로 리딩 대표 이미지",
      "tags": ["타로", "연애", "선택", "리딩"],
      "highlights": ["기본 리딩 무료", "심화 스프레드는 원화 단건 결제"],
      "howItWorks": [
        {
          "title": "질문 설정",
          "description": "현재 고민과 질문을 정리합니다."
        },
        {
          "title": "카드 전개",
          "description": "스프레드 규칙에 따라 카드가 열립니다."
        },
        {
          "title": "상징 해석",
          "description": "핵심 메시지와 실행 힌트를 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "현재 흐름",
          "description": "지금 상황의 핵심 정리"
        },
        {
          "title": "막히는 포인트",
          "description": "의사결정을 방해하는 패턴"
        },
        {
          "title": "실행 제안",
          "description": "오늘 적용할 수 있는 1~2개 행동 힌트"
        }
      ],
      "seo": {
        "title": "타로 리딩 소개 | Code Destiny",
        "description": "연애, 선택, 관계 흐름을 카드 상징으로 해석하는 타로 리딩 서비스 소개 페이지입니다.",
        "keywords": ["타로", "타로 리딩", "연애 타로", "운세", "카드 리딩"]
      },
      "premiumOptions": []
    },
    "tarot-prompt-maker": {
      "title": "타로 프롬프트 라이브러리",
      "subtitle": "질문, 스프레드 선택, 카드 드로우를 묶어 Oracle Prompt까지 완성",
      "description": "사용자의 질문을 카테고리로 분석하고, 상황에 맞는 스프레드를 추천한 뒤 직접 카드를 뽑아 포지션 의미와 해석 지침을 결합한 Oracle Prompt를 완성합니다.",
      "heroImageAlt": "타로 프롬프트 라이브러리 대표 이미지",
      "tags": ["타로", "프롬프트", "스프레드", "전문가 리딩"],
      "highlights": ["질문 자동 분류", "63개 스프레드 라이브러리", "1회 5,000원"],
      "howItWorks": [
        {
          "title": "질문 입력",
          "description": "지금 궁금한 상황을 자연어로 입력합니다."
        },
        {
          "title": "스프레드 선택",
          "description": "질문 의도에 맞는 스프레드를 고르고 카드 수만큼 직접 드로우합니다."
        },
        {
          "title": "프롬프트 생성",
          "description": "카드 포지션, 방향, 해석 규칙이 포함된 Oracle Prompt를 완성합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "질문 분석",
          "description": "질문의 핵심 의도와 카테고리 요약"
        },
        {
          "title": "스프레드 보드",
          "description": "질문 맞춤 스프레드와 포지션 구조 미리보기"
        },
        {
          "title": "완성 프롬프트",
          "description": "AI에 바로 붙여넣을 수 있는 구조형 Oracle Prompt"
        }
      ],
      "seo": {
        "title": "타로 프롬프트 라이브러리 소개 | Code Destiny",
        "description": "질문 기반 스프레드 선택과 카드 드로우를 통해 Oracle Prompt를 완성하는 타로 프롬프트 라이브러리 소개 페이지입니다.",
        "keywords": ["타로 프롬프트", "AI 타로", "타로 프롬프트 라이브러리", "타로 질문 생성기"]
      },
      "premiumOptions": []
    },
    "palm-reading": {
      "title": "전문가 손금 분석",
      "subtitle": "생명선, 감정선, 두뇌선, 운명선 기반 이미지 리딩",
      "description": "손바닥 이미지를 바탕으로 핵심 손금 라인을 읽어 성향, 관계, 재물, 진로 흐름을 분석합니다.",
      "heroImageAlt": "전문가 손금 분석 대표 이미지",
      "tags": ["손금", "전문가 이미지 분석", "생명선", "감정선"],
      "highlights": ["기본 진입 가능", "상세 리딩은 원화 기준"],
      "howItWorks": [
        {
          "title": "손바닥 업로드",
          "description": "안내에 따라 손바닥 이미지를 업로드합니다."
        },
        {
          "title": "라인 분석",
          "description": "핵심 손금 라인과 패턴을 추출합니다."
        },
        {
          "title": "결과 확인",
          "description": "카테고리별 해석 결과를 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "생명선 상태",
          "description": "기본 에너지와 회복 패턴"
        },
        {
          "title": "감정선 해석",
          "description": "관계 반응과 애정 표현 방식"
        },
        {
          "title": "직업/재물 흐름",
          "description": "실행 스타일과 자원 운용 패턴"
        }
      ],
      "priceLabel": "부분 유료",
      "seo": {
        "title": "전문가 손금 분석 소개 | Code Destiny",
        "description": "손바닥 이미지를 기반으로 생명선, 감정선, 운명선을 읽는 전문가 손금 분석 서비스 소개 페이지입니다.",
        "keywords": ["손금", "손금 분석", "전문가 손금", "생명선", "운명선"]
      },
      "premiumOptions": []
    },
    "face-reading": {
      "title": "전문가 관상 분석",
      "subtitle": "얼굴 이미지 기반 인상/기질/관계 성향 리딩",
      "description": "얼굴 이미지를 바탕으로 인상, 기질, 관계 성향, 커뮤니케이션 특성을 분석하는 전문가 관상 서비스입니다.",
      "heroImageAlt": "전문가 관상 분석 대표 이미지",
      "tags": ["관상", "전문가 분석", "얼굴형", "기질"],
      "highlights": ["셀카 기반", "초보자 친화 안내"],
      "howItWorks": [
        {
          "title": "이미지 업로드",
          "description": "셀카를 업로드합니다."
        },
        {
          "title": "특징 추출",
          "description": "얼굴형/이목구비 패턴을 분석합니다."
        },
        {
          "title": "리포트 확인",
          "description": "성향과 관계 패턴을 카드로 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "인상 키워드",
          "description": "첫인상/분위기 중심 키워드"
        },
        {
          "title": "관계 스타일",
          "description": "소통/경계/친밀도 형성 패턴"
        },
        {
          "title": "강점 요약",
          "description": "일상과 업무에서의 강점"
        }
      ],
      "seo": {
        "title": "전문가 관상 분석 소개 | Code Destiny",
        "description": "얼굴 이미지를 기반으로 인상과 성향을 읽는 전문가 관상 분석 서비스 소개 페이지입니다.",
        "keywords": ["관상", "전문가 관상", "얼굴 분석", "성향 분석"]
      },
      "premiumOptions": []
    },
    "bias-destiny": {
      "title": "최애운명",
      "subtitle": "나의 사주 에너지와 최애 상징 에너지를 연결한 포토카드형 리딩",
      "description": "사주 기반 에너지 지표를 활용해 최애와의 공명 포인트를 시각적으로 제시하는 팬덤 특화 운세 콘텐츠입니다.",
      "heroImageAlt": "최애운명 대표 이미지",
      "tags": ["최애운명", "팬덤", "포토카드", "사주 공명"],
      "highlights": ["1회 분석형", "포토카드 스타일 결과"],
      "howItWorks": [
        {
          "title": "프로필 입력",
          "description": "나와 최애의 기본 정보를 입력합니다."
        },
        {
          "title": "공명 계산",
          "description": "내부 엔진으로 에너지 공명을 계산합니다."
        },
        {
          "title": "카드 확인",
          "description": "요약 카드와 행동 힌트를 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "공명 점수",
          "description": "현재 공명 강도와 의미"
        },
        {
          "title": "보완 포인트",
          "description": "관계/덕질 루틴 보완 가이드"
        },
        {
          "title": "오늘의 액션",
          "description": "실행 가능한 1일 미션"
        }
      ],
      "seo": {
        "title": "최애운명 소개 | Code Destiny",
        "description": "사주 에너지 기반으로 최애와의 공명 포인트를 읽는 최애운명 서비스 소개 페이지입니다.",
        "keywords": ["최애운명", "팬덤 운세", "사주 공명", "포토카드 운세"]
      },
      "premiumOptions": []
    },
    "love-code": {
      "title": "러브 코드",
      "subtitle": "상대 사주 기반 연애 시뮬레이션과 궁합 흐름 분석",
      "description": "상대의 생년월일 정보를 바탕으로 연애 페르소나를 구성하고, 시뮬레이션형으로 관계 흐름을 체험하는 기능입니다.",
      "heroImageAlt": "러브 코드 대표 이미지",
      "tags": ["러브 코드", "연애 시뮬레이션", "궁합", "사주"],
      "highlights": ["시뮬레이션형 체험", "원화 기준 실행"],
      "howItWorks": [
        {
          "title": "상대 정보 입력",
          "description": "상대 생년월일로 기본 사주 정보를 구성합니다."
        },
        {
          "title": "페르소나 생성",
          "description": "연애 반응 패턴을 시뮬레이션용으로 생성합니다."
        },
        {
          "title": "시나리오 체험",
          "description": "선택지에 따른 반응 흐름을 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "연애 페르소나",
          "description": "상대의 관계 반응 스타일"
        },
        {
          "title": "상호작용 지점",
          "description": "잘 맞는 대화/충돌 패턴"
        },
        {
          "title": "데이트 이벤트",
          "description": "선택지 기반 결과 변화"
        }
      ],
      "seo": {
        "title": "러브 코드 소개 | Code Destiny",
        "description": "상대 사주 기반으로 연애 시뮬레이션을 제공하는 러브 코드 서비스 소개 페이지입니다.",
        "keywords": ["러브 코드", "연애 시뮬레이션", "사주 연애", "궁합"]
      },
      "premiumOptions": []
    },
    "omikuji": {
      "title": "이모이 오미쿠지",
      "subtitle": "일본 신사 감성의 라이트 운세 뽑기",
      "description": "오늘의 기분과 고민을 바탕으로 간단한 운세 메시지와 행동 힌트를 제공하는 감성형 오미쿠지 콘텐츠입니다.",
      "heroImageAlt": "이모이 오미쿠지 대표 이미지",
      "tags": ["오미쿠지", "감성 운세", "라이트 리딩"],
      "highlights": ["무료", "빠른 결과", "공유 친화"],
      "howItWorks": [
        {
          "title": "분위기 선택",
          "description": "현재 고민/분위기를 가볍게 선택합니다."
        },
        {
          "title": "운세 추첨",
          "description": "오미쿠지 결과를 즉시 생성합니다."
        },
        {
          "title": "행동 힌트 확인",
          "description": "오늘 적용할 짧은 가이드를 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "오늘의 기류",
          "description": "총운 요약 한 줄"
        },
        {
          "title": "행운 키워드",
          "description": "추천 행동/회피 행동"
        },
        {
          "title": "감정 리마인더",
          "description": "관계/일상에서의 주의점"
        }
      ],
      "seo": {
        "title": "이모이 오미쿠지 소개 | Code Destiny",
        "description": "일본 신사 감성으로 오늘의 운세를 가볍게 확인하는 이모이 오미쿠지 소개 페이지입니다.",
        "keywords": ["오미쿠지", "오늘의 운세", "감성 운세", "일본 운세"]
      },
      "premiumOptions": []
    },
    "saju-animal": {
      "title": "사주 가디언 아트",
      "subtitle": "일주가 부르는 60갑자 가디언 카드",
      "description": "십이운성 동물점이 아닌, 생년월일의 일주와 오행 기운으로 지금 나를 지키는 가디언 상징을 카드형으로 안내합니다.",
      "heroImageAlt": "사주 가디언 아트 수호동물 카드 이미지",
      "tags": ["사주 가디언", "일주 가디언", "60갑자", "오행 카드"],
      "highlights": ["60갑자 가디언 카드", "일주 기반 메시지", "무료 결과"],
      "howItWorks": [
        {
          "title": "출생 정보 입력",
          "description": "기본 사주 입력값을 등록합니다."
        },
        {
          "title": "일주 계산",
          "description": "생년월일에서 60갑자 가디언 좌표를 엽니다."
        },
        {
          "title": "가디언 카드 확인",
          "description": "현재 필요한 수호 메시지와 해석 카드를 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "일주 가디언",
          "description": "내 일주가 부르는 가디언 상징"
        },
        {
          "title": "오행 기운",
          "description": "가디언 카드에 깃든 원소의 흐름"
        },
        {
          "title": "현재 메시지",
          "description": "지금 필요한 수호의 한 줄 조언"
        }
      ],
      "seo": {
        "title": "사주 가디언 아트 소개 | Code Destiny",
        "description": "생년월일의 일주와 오행 기운으로 60갑자 가디언 카드를 확인하는 무료 사주 가디언 아트입니다.",
        "keywords": ["사주 가디언", "일주 가디언", "60갑자", "사주 가디언 아트"]
      },
      "premiumOptions": []
    },
    "destiny-meeting-place": {
      "title": "사주로 보는 인연의 장소",
      "subtitle": "사주 에너지로 만남 장소·도시·시기를 추천하는 독립 리포트",
      "description": "생년월일 입력만으로 사주 에너지 흐름을 분석해 인연이 열리는 장소 TOP5, 국가/도시, 타이밍, 스타일 아이템을 제안합니다.",
      "heroImageAlt": "사주로 보는 인연의 장소 대표 이미지",
      "tags": ["인연 장소", "사주 오행", "만남 타이밍", "국가 추천"],
      "highlights": ["독립 실행", "장소/도시/시기 통합 리포트"],
      "howItWorks": [
        {
          "title": "출생 정보 입력",
          "description": "생년월일과 시간을 입력합니다."
        },
        {
          "title": "사주 에너지 계산",
          "description": "일간과 오행 흐름을 기반으로 만남 패턴을 분석합니다."
        },
        {
          "title": "장소 리포트 확인",
          "description": "인연 장소 TOP5, 도시, 시기, 실천 플랜을 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "인연 장소 TOP5",
          "description": "공간 유형별 만남 확률과 행동 팁"
        },
        {
          "title": "국가/도시 추천",
          "description": "오행 흐름에 맞는 도시와 여행 무드"
        },
        {
          "title": "타이밍/스타일",
          "description": "만남운 시즌과 실전 스타일 가이드"
        }
      ],
      "seo": {
        "title": "사주로 보는 인연의 장소 소개 | Code Destiny",
        "description": "사주 에너지로 인연 장소, 도시, 시기를 추천하는 독립 실행 리포트 서비스 소개 페이지입니다.",
        "keywords": ["사주 인연 장소", "인연운", "사주 장소 추천", "만남 타이밍"]
      },
      "premiumOptions": []
    },
    "saju-lifebook": {
      "title": "인생의 책 전문가 상담",
      "subtitle": "명식과 지금의 질문으로 읽는 나의 인생 서사",
      "description": "생년월일, 성별, 출생시간, 상담 주제를 바탕으로 삶의 흐름과 반복 패턴을 따뜻한 1:1 상담처럼 풀어드립니다.",
      "heroImageAlt": "인생의 책 전문가 상담 대표 이미지",
      "priceLabel": "50,000원",
      "tags": ["전문가 상담", "명리학", "인생 서사"],
      "highlights": ["명식 기반 상담", "삶의 핵심 주제", "추가 질문 대화"],
      "howItWorks": [
        {
          "title": "상담 정보 입력",
          "description": "이름 또는 닉네임, 성별, 생년월일, 출생시간, 달력 기준과 상담 주제를 입력합니다."
        },
        {
          "title": "삶의 흐름 계산",
          "description": "입력된 정보 기준으로 명식 구조와 오행 흐름을 정리합니다."
        },
        {
          "title": "상담 이어가기",
          "description": "첫 답변을 받은 뒤 마음에 남은 질문을 이어서 묻습니다."
        }
      ],
      "resultExamples": [
        {
          "title": "인생 책 제목",
          "description": "삶을 관통하는 주제와 핵심 키워드"
        },
        {
          "title": "반복되는 흐름",
          "description": "성향, 관계, 일과 돈에서 되풀이되는 패턴"
        },
        {
          "title": "지금의 조언",
          "description": "현재 전환점에서 현실적으로 살려야 할 방향"
        }
      ],
      "seo": {
        "title": "인생의 책 전문가 상담 | Code Destiny",
        "description": "명식과 상담 주제를 바탕으로 삶의 흐름을 따뜻하게 읽어주는 인생의 책 전문가 상담입니다.",
        "keywords": ["인생의 책 전문가 상담", "명리학 상담", "사주 상담", "인생 상담"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "자미두수 전문가 상담",
      "subtitle": "명궁과 12궁으로 여는 운명의 궁위",
      "description": "자미두수 명반을 바탕으로 명궁, 신궁, 사화, 14주성, 12궁, 대한과 유년 흐름을 상담형으로 깊이 있게 풀어냅니다.",
      "heroImageAlt": "자미두수 전문가 상담 대표 이미지",
      "tags": ["ZIWEI", "EXPERT CONSULTATION", "12 PALACES", "STAR CHART"],
      "highlights": ["명반 기반 1:1 상담", "명궁·신궁·12궁 기반", "대한·유년 흐름 조언"],
      "howItWorks": [
        {
          "title": "출생 정보 입력",
          "description": "생년월일시와 기본 프로필을 입력합니다."
        },
        {
          "title": "자미두수 명반 계산",
          "description": "로컬 자미두수 엔진으로 명궁, 신궁, 12궁, 사화, 대한 데이터를 먼저 계산합니다."
        },
        {
          "title": "전문가 상담 시작",
          "description": "계산된 명반을 바탕으로 지금의 질문에 맞는 상담 답변을 엽니다."
        }
      ],
      "resultExamples": [
        {
          "title": "명궁·신궁 해석",
          "description": "선천 기질과 후천적으로 완성되는 나의 방향"
        },
        {
          "title": "12궁 심층 리포트",
          "description": "사랑, 재물, 직업, 건강, 관계, 복덕의 궁별 해석"
        },
        {
          "title": "대한·유년 전략",
          "description": "앞으로 열리는 운의 흐름과 선택 기준"
        }
      ],
      "priceLabel": "30,000원",
      "seo": {
        "title": "자미두수 전문가 상담 소개 | Code Destiny",
        "description": "자미두수 명반을 바탕으로 명궁, 신궁, 12궁, 대한과 유년 흐름을 상담형으로 풀어주는 자미두수 전문가 상담 소개 페이지입니다.",
        "keywords": ["자미두수 전문가 상담", "자미두수 명반 상담", "명궁 해석", "자미두수 상담"]
      },
      "premiumOptions": []
    },
    "stonehenge-rune": {
      "title": "스톤헨지 룬점",
      "subtitle": "고대 룬 상징으로 읽는 선택/시기 신탁",
      "description": "1/3/5/12 룬 스프레드를 통해 현재 질문의 흐름과 선택의 방향을 정교하게 안내하는 룬 오라클입니다.",
      "heroImageAlt": "스톤헨지 룬점 대표 이미지",
      "tags": ["룬", "오라클", "스톤헨지", "선택 리딩"],
      "highlights": ["다중 스프레드", "질문형 리딩"],
      "howItWorks": [
        {
          "title": "질문 설정",
          "description": "현재 가장 중요한 질문을 정리합니다."
        },
        {
          "title": "룬 전개",
          "description": "선택한 스프레드로 룬을 뽑습니다."
        },
        {
          "title": "상징 해석",
          "description": "룬 상징과 조합 의미를 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "현재 신호",
          "description": "지금 알아야 할 핵심 메시지"
        },
        {
          "title": "행동 가이드",
          "description": "진행/보류/전환 판단 포인트"
        },
        {
          "title": "장기 흐름",
          "description": "시기별 주의 구간과 기회 구간"
        }
      ],
      "priceLabel": "3,000원~12,000원",
      "seo": {
        "title": "스톤헨지 룬점 소개 | Code Destiny",
        "description": "고대 룬 상징으로 선택과 시기를 해석하는 스톤헨지 룬 오라클 소개 페이지입니다.",
        "keywords": ["룬", "스톤헨지 룬", "룬 오라클", "룬 점"]
      },
      "premiumOptions": []
    },
    "animal-totem": {
      "title": "애니멀 토템",
      "subtitle": "수호 동물 메시지를 읽는 카드형 리딩",
      "description": "현재 상태에 맞는 수호 동물 상징을 기반으로 경고/행운/실행 힌트를 제공하는 토템 리딩입니다.",
      "heroImageAlt": "애니멀 토템 대표 이미지",
      "tags": ["토템", "수호 동물", "카드 리딩"],
      "highlights": ["기본/심화 모드", "상징형 메시지"],
      "howItWorks": [
        {
          "title": "의도 설정",
          "description": "지금 필요한 질문을 정리합니다."
        },
        {
          "title": "토템 추출",
          "description": "현재 상태에 맞는 동물 상징을 선택합니다."
        },
        {
          "title": "메시지 확인",
          "description": "경고/행운/실행 힌트를 확인합니다."
        }
      ],
      "resultExamples": [
        {
          "title": "오늘의 수호 동물",
          "description": "핵심 에너지와 심리 상태 요약"
        },
        {
          "title": "경고 메시지",
          "description": "피해야 할 패턴"
        },
        {
          "title": "행운 행동",
          "description": "오늘 시도하면 좋은 루틴"
        }
      ],
      "priceLabel": "3,000원~6,000원",
      "seo": {
        "title": "애니멀 토템 소개 | Code Destiny",
        "description": "수호 동물 상징으로 현재 흐름을 읽는 애니멀 토템 서비스 소개 페이지입니다.",
        "keywords": ["애니멀 토템", "수호 동물", "토템 리딩"]
      },
      "premiumOptions": []
    }
  },
  "en": {
    "saju": {
      "title": "Precise Saju Reading",
      "subtitle": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "heroImageAlt": "Precise Saju Reading symbolic preview",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Precise Saju Reading | Code Destiny",
        "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
        "keywords": ["Precise Saju Reading", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel",
      "subtitle": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "heroImageAlt": "Advanced Zi Wei Dou Shu 12-Palace Counsel symbolic preview",
      "priceLabel": "KRW 20,000",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel | Code Destiny",
        "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
        "keywords": ["Advanced Zi Wei Dou Shu 12-Palace Counsel", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "Sukuyo Relationship Radar",
      "subtitle": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "heroImageAlt": "Sukuyo Relationship Radar symbolic preview",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Sukuyo Relationship Radar | Code Destiny",
        "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
        "keywords": ["Sukuyo Relationship Radar", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "Vedic Astrology Reading",
      "subtitle": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "heroImageAlt": "Vedic Astrology Reading symbolic preview",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Vedic Astrology Reading | Code Destiny",
        "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
        "keywords": ["Vedic Astrology Reading", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "Western Astrology Chart Reading",
      "subtitle": "Read personality, relationships, work, and timing through a Western natal chart.",
      "description": "Read personality, relationships, work, and timing through a Western natal chart.",
      "heroImageAlt": "Western Astrology Chart Reading symbolic preview",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Western Astrology Chart Reading | Code Destiny",
        "description": "Read personality, relationships, work, and timing through a Western natal chart.",
        "keywords": ["Western Astrology Chart Reading", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "Tarot Reading",
      "subtitle": "Cards reveal the texture of the present question and the next standard for choice.",
      "description": "Cards reveal the texture of the present question and the next standard for choice.",
      "heroImageAlt": "Tarot Reading symbolic preview",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Reading | Code Destiny",
        "description": "Cards reveal the texture of the present question and the next standard for choice.",
        "keywords": ["Tarot Reading", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "Tarot Prompt Library",
      "subtitle": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "heroImageAlt": "Tarot Prompt Library symbolic preview",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Prompt Library | Code Destiny",
        "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
        "keywords": ["Tarot Prompt Library", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "Expert Palm Reading",
      "subtitle": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "heroImageAlt": "Expert Palm Reading symbolic preview",
      "priceLabel": "Partly paid",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Palm Reading | Code Destiny",
        "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
        "keywords": ["Expert Palm Reading", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "Expert Face Reading",
      "subtitle": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "heroImageAlt": "Expert Face Reading symbolic preview",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Face Reading | Code Destiny",
        "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
        "keywords": ["Expert Face Reading", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "Favorite-Person Destiny",
      "subtitle": "See the resonance between your chart and the person who keeps drawing your heart.",
      "description": "See the resonance between your chart and the person who keeps drawing your heart.",
      "heroImageAlt": "Favorite-Person Destiny symbolic preview",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Favorite-Person Destiny | Code Destiny",
        "description": "See the resonance between your chart and the person who keeps drawing your heart.",
        "keywords": ["Favorite-Person Destiny", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "heroImageAlt": "LOVE CODE symbolic preview",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi Omikuji",
      "subtitle": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "heroImageAlt": "Emoi Omikuji symbolic preview",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi Omikuji | Code Destiny",
        "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
        "keywords": ["Emoi Omikuji", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "Saju Guardian Art",
      "subtitle": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "heroImageAlt": "Saju Guardian Art symbolic preview",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Saju Guardian Art | Code Destiny",
        "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
        "keywords": ["Saju Guardian Art", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "Destined Meeting Place by Saju",
      "subtitle": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "heroImageAlt": "Destined Meeting Place by Saju symbolic preview",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Destined Meeting Place by Saju | Code Destiny",
        "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
        "keywords": ["Destined Meeting Place by Saju", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "Zi Wei Expert Consultation",
      "subtitle": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "heroImageAlt": "Zi Wei Expert Consultation symbolic preview",
      "priceLabel": "KRW 30,000",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Zi Wei Expert Consultation | Code Destiny",
        "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
        "keywords": ["Zi Wei Expert Consultation", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "Stonehenge Rune Oracle",
      "subtitle": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "heroImageAlt": "Stonehenge Rune Oracle symbolic preview",
      "priceLabel": "KRW 3,000~12,000",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Stonehenge Rune Oracle | Code Destiny",
        "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
        "keywords": ["Stonehenge Rune Oracle", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "Animal Totem",
      "subtitle": "A guardian-animal message that reflects the current state of your heart and path.",
      "description": "A guardian-animal message that reflects the current state of your heart and path.",
      "heroImageAlt": "Animal Totem symbolic preview",
      "priceLabel": "KRW 3,000~6,000",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Animal Totem | Code Destiny",
        "description": "A guardian-animal message that reflects the current state of your heart and path.",
        "keywords": ["Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "ja": {
    "saju": {
      "title": "四柱推命 精密鑑定",
      "subtitle": "五行・十神・時期運・人生の流れを一つにつなげて読む命式リーディング。",
      "description": "五行・十神・時期運・人生の流れを一つにつなげて読む命式リーディング。",
      "heroImageAlt": "四柱推命 精密鑑定の象徴イメージ",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "四柱推命 精密鑑定 | Code Destiny",
        "description": "五行・十神・時期運・人生の流れを一つにつなげて読む命式リーディング。",
        "keywords": ["四柱推命 精密鑑定", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "紫微斗数 12宮 詳細鑑定",
      "subtitle": "命宮・身宮・四化・十二宮から人生の地図を実用的に読み解きます。",
      "description": "命宮・身宮・四化・十二宮から人生の地図を実用的に読み解きます。",
      "heroImageAlt": "紫微斗数 12宮 詳細鑑定の象徴イメージ",
      "priceLabel": "20,000ウォン",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "紫微斗数 12宮 詳細鑑定 | Code Destiny",
        "description": "命宮・身宮・四化・十二宮から人生の地図を実用的に読み解きます。",
        "keywords": ["紫微斗数 12宮 詳細鑑定", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "宿曜 ご縁レーダー",
      "subtitle": "二十七宿の月の相から、距離感・相性・タイミングを見ます。",
      "description": "二十七宿の月の相から、距離感・相性・タイミングを見ます。",
      "heroImageAlt": "宿曜 ご縁レーダーの象徴イメージ",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "宿曜 ご縁レーダー | Code Destiny",
        "description": "二十七宿の月の相から、距離感・相性・タイミングを見ます。",
        "keywords": ["宿曜 ご縁レーダー", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "ヴェーダ占星術鑑定",
      "subtitle": "惑星、ハウス、人生のリズムをジョーティシュの視点で読みます。",
      "description": "惑星、ハウス、人生のリズムをジョーティシュの視点で読みます。",
      "heroImageAlt": "ヴェーダ占星術鑑定の象徴イメージ",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "ヴェーダ占星術鑑定 | Code Destiny",
        "description": "惑星、ハウス、人生のリズムをジョーティシュの視点で読みます。",
        "keywords": ["ヴェーダ占星術鑑定", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "西洋占星術チャート鑑定",
      "subtitle": "出生図から性格、関係性、仕事、タイミングを読み解きます。",
      "description": "出生図から性格、関係性、仕事、タイミングを読み解きます。",
      "heroImageAlt": "西洋占星術チャート鑑定の象徴イメージ",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "西洋占星術チャート鑑定 | Code Destiny",
        "description": "出生図から性格、関係性、仕事、タイミングを読み解きます。",
        "keywords": ["西洋占星術チャート鑑定", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "タロットリーディング",
      "subtitle": "カードが今の問いの質感と、次に選ぶ基準を照らします。",
      "description": "カードが今の問いの質感と、次に選ぶ基準を照らします。",
      "heroImageAlt": "タロットリーディングの象徴イメージ",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "タロットリーディング | Code Destiny",
        "description": "カードが今の問いの質感と、次に選ぶ基準を照らします。",
        "keywords": ["タロットリーディング", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "タロットプロンプトライブラリ",
      "subtitle": "スプレッド、カード、神託文を整え、深い相談につなげます。",
      "description": "スプレッド、カード、神託文を整え、深い相談につなげます。",
      "heroImageAlt": "タロットプロンプトライブラリの象徴イメージ",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "タロットプロンプトライブラリ | Code Destiny",
        "description": "スプレッド、カード、神託文を整え、深い相談につなげます。",
        "keywords": ["タロットプロンプトライブラリ", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "専門家手相鑑定",
      "subtitle": "手のひら画像から主要線とサインを丁寧に読み解きます。",
      "description": "手のひら画像から主要線とサインを丁寧に読み解きます。",
      "heroImageAlt": "専門家手相鑑定の象徴イメージ",
      "priceLabel": "一部有料",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "専門家手相鑑定 | Code Destiny",
        "description": "手のひら画像から主要線とサインを丁寧に読み解きます。",
        "keywords": ["専門家手相鑑定", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "専門家観相鑑定",
      "subtitle": "顔立ちと印象のサインを専門家観相の流れで読みます。",
      "description": "顔立ちと印象のサインを専門家観相の流れで読みます。",
      "heroImageAlt": "専門家観相鑑定の象徴イメージ",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "専門家観相鑑定 | Code Destiny",
        "description": "顔立ちと印象のサインを専門家観相の流れで読みます。",
        "keywords": ["専門家観相鑑定", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "推し運命",
      "subtitle": "あなたの命式と心惹かれる相手の共鳴を読みます。",
      "description": "あなたの命式と心惹かれる相手の共鳴を読みます。",
      "heroImageAlt": "推し運命の象徴イメージ",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "推し運命 | Code Destiny",
        "description": "あなたの命式と心惹かれる相手の共鳴を読みます。",
        "keywords": ["推し運命", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "四柱推命ベースで恋の引力、摩擦、タイミングを読みます。",
      "description": "四柱推命ベースで恋の引力、摩擦、タイミングを読みます。",
      "heroImageAlt": "LOVE CODEの象徴イメージ",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "四柱推命ベースで恋の引力、摩擦、タイミングを読みます。",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "エモいおみくじ",
      "subtitle": "今日の気分と小さな兆しを軽やかに開きます。",
      "description": "今日の気分と小さな兆しを軽やかに開きます。",
      "heroImageAlt": "エモいおみくじの象徴イメージ",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "エモいおみくじ | Code Destiny",
        "description": "今日の気分と小さな兆しを軽やかに開きます。",
        "keywords": ["エモいおみくじ", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "四柱守護アニマルアート",
      "subtitle": "命式のリズムから目覚める守護動物を描きます。",
      "description": "命式のリズムから目覚める守護動物を描きます。",
      "heroImageAlt": "四柱守護アニマルアートの象徴イメージ",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "四柱守護アニマルアート | Code Destiny",
        "description": "命式のリズムから目覚める守護動物を描きます。",
        "keywords": ["四柱守護アニマルアート", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "四柱で見るご縁の場所",
      "subtitle": "意味ある出会いが開きやすい場所、都市、時期を読みます。",
      "description": "意味ある出会いが開きやすい場所、都市、時期を読みます。",
      "heroImageAlt": "四柱で見るご縁の場所の象徴イメージ",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "四柱で見るご縁の場所 | Code Destiny",
        "description": "意味ある出会いが開きやすい場所、都市、時期を読みます。",
        "keywords": ["四柱で見るご縁の場所", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "紫微斗数プレミアムPDF",
      "subtitle": "十二宮の命盤を実用的な人生戦略の本に整えます。",
      "description": "十二宮の命盤を実用的な人生戦略の本に整えます。",
      "heroImageAlt": "紫微斗数プレミアムPDFの象徴イメージ",
      "priceLabel": "30,000ウォン",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "紫微斗数プレミアムPDF | Code Destiny",
        "description": "十二宮の命盤を実用的な人生戦略の本に整えます。",
        "keywords": ["紫微斗数プレミアムPDF", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "ストーンヘンジ ルーン神託",
      "subtitle": "古代ルーンの象徴が、今の問いに短く深い答えを開きます。",
      "description": "古代ルーンの象徴が、今の問いに短く深い答えを開きます。",
      "heroImageAlt": "ストーンヘンジ ルーン神託の象徴イメージ",
      "priceLabel": "3,000~12,000ウォン",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "ストーンヘンジ ルーン神託 | Code Destiny",
        "description": "古代ルーンの象徴が、今の問いに短く深い答えを開きます。",
        "keywords": ["ストーンヘンジ ルーン神託", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "アニマルトーテム",
      "subtitle": "守護動物のメッセージが今の心と道筋を映します。",
      "description": "守護動物のメッセージが今の心と道筋を映します。",
      "heroImageAlt": "アニマルトーテムの象徴イメージ",
      "priceLabel": "3,000~6,000ウォン",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["案内つき入力フロー", "見やすい鑑定結果", "次の一歩まで整える助言"],
      "howItWorks": [
        {
          "title": "情報を入力",
          "description": "鑑定に必要な内容だけを丁寧に受け取ります。"
        },
        {
          "title": "鑑定を開く",
          "description": "選んだ占術と問いを合わせて流れを整えます。"
        },
        {
          "title": "結果を読む",
          "description": "核心メッセージ、注意点、実践の一歩を確認します。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心サイン",
          "description": "今もっとも強く浮かぶテーマをまとめます。"
        },
        {
          "title": "時期と注意点",
          "description": "動きやすい時期と慎重に扱う点を分けて読みます。"
        },
        {
          "title": "次の一歩",
          "description": "今日から使える実践の方向を添えます。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "アニマルトーテム | Code Destiny",
        "description": "守護動物のメッセージが今の心と道筋を映します。",
        "keywords": ["アニマルトーテム", "Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "zh-CN": {
    "saju": {
      "title": "八字精密分析",
      "subtitle": "从五行、十神、时运与人生方向读出完整命盘。",
      "description": "从五行、十神、时运与人生方向读出完整命盘。",
      "heroImageAlt": "八字精密分析象征图像",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "八字精密分析 | Code Destiny",
        "description": "从五行、十神、时运与人生方向读出完整命盘。",
        "keywords": ["八字精密分析", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "紫微斗数十二宫深度咨询",
      "subtitle": "以命宫、身宫、四化与十二宫整理一张实用的人生命盘。",
      "description": "以命宫、身宫、四化与十二宫整理一张实用的人生命盘。",
      "heroImageAlt": "紫微斗数十二宫深度咨询象征图像",
      "priceLabel": "20,000韩元",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "紫微斗数十二宫深度咨询 | Code Destiny",
        "description": "以命宫、身宫、四化与十二宫整理一张实用的人生命盘。",
        "keywords": ["紫微斗数十二宫深度咨询", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "宿曜缘分雷达",
      "subtitle": "通过二十七宿月相读取距离感、相性与时机。",
      "description": "通过二十七宿月相读取距离感、相性与时机。",
      "heroImageAlt": "宿曜缘分雷达象征图像",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "宿曜缘分雷达 | Code Destiny",
        "description": "通过二十七宿月相读取距离感、相性与时机。",
        "keywords": ["宿曜缘分雷达", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "吠陀占星分析",
      "subtitle": "以 Jyotish 视角解读行星、宫位与生命节奏。",
      "description": "以 Jyotish 视角解读行星、宫位与生命节奏。",
      "heroImageAlt": "吠陀占星分析象征图像",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "吠陀占星分析 | Code Destiny",
        "description": "以 Jyotish 视角解读行星、宫位与生命节奏。",
        "keywords": ["吠陀占星分析", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "西洋占星星盘分析",
      "subtitle": "从出生星盘读取性格、关系、事业与时间节奏。",
      "description": "从出生星盘读取性格、关系、事业与时间节奏。",
      "heroImageAlt": "西洋占星星盘分析象征图像",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "西洋占星星盘分析 | Code Destiny",
        "description": "从出生星盘读取性格、关系、事业与时间节奏。",
        "keywords": ["西洋占星星盘分析", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "塔罗解读",
      "subtitle": "牌面照亮当下问题的质地和下一步选择标准。",
      "description": "牌面照亮当下问题的质地和下一步选择标准。",
      "heroImageAlt": "塔罗解读象征图像",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "塔罗解读 | Code Destiny",
        "description": "牌面照亮当下问题的质地和下一步选择标准。",
        "keywords": ["塔罗解读", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "塔罗提示词资料库",
      "subtitle": "选择牌阵、抽牌，并整理适合深度咨询的神谕提示词。",
      "description": "选择牌阵、抽牌，并整理适合深度咨询的神谕提示词。",
      "heroImageAlt": "塔罗提示词资料库象征图像",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "塔罗提示词资料库 | Code Destiny",
        "description": "选择牌阵、抽牌，并整理适合深度咨询的神谕提示词。",
        "keywords": ["塔罗提示词资料库", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "专家手相分析",
      "subtitle": "从手掌图像读取主要掌纹与手相讯号。",
      "description": "从手掌图像读取主要掌纹与手相讯号。",
      "heroImageAlt": "专家手相分析象征图像",
      "priceLabel": "部分付费",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "专家手相分析 | Code Destiny",
        "description": "从手掌图像读取主要掌纹与手相讯号。",
        "keywords": ["专家手相分析", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "专家面相分析",
      "subtitle": "以专家面相流程读取五官结构与第一印象讯号。",
      "description": "以专家面相流程读取五官结构与第一印象讯号。",
      "heroImageAlt": "专家面相分析象征图像",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "专家面相分析 | Code Destiny",
        "description": "以专家面相流程读取五官结构与第一印象讯号。",
        "keywords": ["专家面相分析", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "本命偏爱运",
      "subtitle": "读取你的命盘与牵动内心之人的共鸣。",
      "description": "读取你的命盘与牵动内心之人的共鸣。",
      "heroImageAlt": "本命偏爱运象征图像",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "本命偏爱运 | Code Destiny",
        "description": "读取你的命盘与牵动内心之人的共鸣。",
        "keywords": ["本命偏爱运", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "以八字模拟恋爱吸引、摩擦与时机。",
      "description": "以八字模拟恋爱吸引、摩擦与时机。",
      "heroImageAlt": "LOVE CODE象征图像",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "以八字模拟恋爱吸引、摩擦与时机。",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi御神签",
      "subtitle": "打开今日心情、魅力和一个小小征兆。",
      "description": "打开今日心情、魅力和一个小小征兆。",
      "heroImageAlt": "Emoi御神签象征图像",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi御神签 | Code Destiny",
        "description": "打开今日心情、魅力和一个小小征兆。",
        "keywords": ["Emoi御神签", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "八字守护动物艺术",
      "subtitle": "唤醒藏在八字节奏中的守护动物。",
      "description": "唤醒藏在八字节奏中的守护动物。",
      "heroImageAlt": "八字守护动物艺术象征图像",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "八字守护动物艺术 | Code Destiny",
        "description": "唤醒藏在八字节奏中的守护动物。",
        "keywords": ["八字守护动物艺术", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "八字看缘分地点",
      "subtitle": "读取更容易开启重要缘分的地点、城市与时机。",
      "description": "读取更容易开启重要缘分的地点、城市与时机。",
      "heroImageAlt": "八字看缘分地点象征图像",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "八字看缘分地点 | Code Destiny",
        "description": "读取更容易开启重要缘分的地点、城市与时机。",
        "keywords": ["八字看缘分地点", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "紫微斗数高级PDF",
      "subtitle": "将十二宫命盘整理成实用的人生策略书。",
      "description": "将十二宫命盘整理成实用的人生策略书。",
      "heroImageAlt": "紫微斗数高级PDF象征图像",
      "priceLabel": "30,000韩元",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "紫微斗数高级PDF | Code Destiny",
        "description": "将十二宫命盘整理成实用的人生策略书。",
        "keywords": ["紫微斗数高级PDF", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "巨石阵卢恩神谕",
      "subtitle": "古老卢恩符号为眼前的问题开启简洁而深刻的答案。",
      "description": "古老卢恩符号为眼前的问题开启简洁而深刻的答案。",
      "heroImageAlt": "巨石阵卢恩神谕象征图像",
      "priceLabel": "3,000~12,000韩元",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "巨石阵卢恩神谕 | Code Destiny",
        "description": "古老卢恩符号为眼前的问题开启简洁而深刻的答案。",
        "keywords": ["巨石阵卢恩神谕", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "动物图腾",
      "subtitle": "守护动物讯息映照此刻的心境与道路。",
      "description": "守护动物讯息映照此刻的心境与道路。",
      "heroImageAlt": "动物图腾象征图像",
      "priceLabel": "3,000~6,000韩元",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["引导式输入流程", "清晰的解读结果", "整理下一步行动建议"],
      "howItWorks": [
        {
          "title": "输入资料",
          "description": "只收集本次解读所需的内容。"
        },
        {
          "title": "开启解读",
          "description": "系统会把所选占术与问题对齐。"
        },
        {
          "title": "查看结果",
          "description": "确认核心讯息、注意点与实际下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心信号",
          "description": "整理此刻最强的主题。"
        },
        {
          "title": "时机与提醒",
          "description": "把适合行动的时机和需要谨慎的点分开呈现。"
        },
        {
          "title": "下一步",
          "description": "给出今天就能使用的行动方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "动物图腾 | Code Destiny",
        "description": "守护动物讯息映照此刻的心境与道路。",
        "keywords": ["动物图腾", "Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "zh-TW": {
    "saju": {
      "title": "八字精密分析",
      "subtitle": "從五行、十神、時運與人生方向讀出完整命盤。",
      "description": "從五行、十神、時運與人生方向讀出完整命盤。",
      "heroImageAlt": "八字精密分析象徵圖像",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "八字精密分析 | Code Destiny",
        "description": "從五行、十神、時運與人生方向讀出完整命盤。",
        "keywords": ["八字精密分析", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "紫微斗數十二宮深度諮詢",
      "subtitle": "以命宮、身宮、四化與十二宮整理一張實用的人生命盤。",
      "description": "以命宮、身宮、四化與十二宮整理一張實用的人生命盤。",
      "heroImageAlt": "紫微斗數十二宮深度諮詢象徵圖像",
      "priceLabel": "20,000韓元",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "紫微斗數十二宮深度諮詢 | Code Destiny",
        "description": "以命宮、身宮、四化與十二宮整理一張實用的人生命盤。",
        "keywords": ["紫微斗數十二宮深度諮詢", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "宿曜緣分雷達",
      "subtitle": "透過二十七宿月相讀取距離感、相性與時機。",
      "description": "透過二十七宿月相讀取距離感、相性與時機。",
      "heroImageAlt": "宿曜緣分雷達象徵圖像",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "宿曜緣分雷達 | Code Destiny",
        "description": "透過二十七宿月相讀取距離感、相性與時機。",
        "keywords": ["宿曜緣分雷達", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "吠陀占星分析",
      "subtitle": "以 Jyotish 視角解讀行星、宮位與生命節奏。",
      "description": "以 Jyotish 視角解讀行星、宮位與生命節奏。",
      "heroImageAlt": "吠陀占星分析象徵圖像",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "吠陀占星分析 | Code Destiny",
        "description": "以 Jyotish 視角解讀行星、宮位與生命節奏。",
        "keywords": ["吠陀占星分析", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "西洋占星星盤分析",
      "subtitle": "從出生星盤讀取性格、關係、事業與時間節奏。",
      "description": "從出生星盤讀取性格、關係、事業與時間節奏。",
      "heroImageAlt": "西洋占星星盤分析象徵圖像",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "西洋占星星盤分析 | Code Destiny",
        "description": "從出生星盤讀取性格、關係、事業與時間節奏。",
        "keywords": ["西洋占星星盤分析", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "塔羅解讀",
      "subtitle": "牌面照亮當下問題的質地和下一步選擇標準。",
      "description": "牌面照亮當下問題的質地和下一步選擇標準。",
      "heroImageAlt": "塔羅解讀象徵圖像",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "塔羅解讀 | Code Destiny",
        "description": "牌面照亮當下問題的質地和下一步選擇標準。",
        "keywords": ["塔羅解讀", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "塔羅提示詞資料庫",
      "subtitle": "選擇牌陣、抽牌，並整理適合深度諮詢的神諭提示詞。",
      "description": "選擇牌陣、抽牌，並整理適合深度諮詢的神諭提示詞。",
      "heroImageAlt": "塔羅提示詞資料庫象徵圖像",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "塔羅提示詞資料庫 | Code Destiny",
        "description": "選擇牌陣、抽牌，並整理適合深度諮詢的神諭提示詞。",
        "keywords": ["塔羅提示詞資料庫", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "專家手相分析",
      "subtitle": "從手掌圖像讀取主要掌紋與手相訊號。",
      "description": "從手掌圖像讀取主要掌紋與手相訊號。",
      "heroImageAlt": "專家手相分析象徵圖像",
      "priceLabel": "部分付費",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "專家手相分析 | Code Destiny",
        "description": "從手掌圖像讀取主要掌紋與手相訊號。",
        "keywords": ["專家手相分析", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "專家面相分析",
      "subtitle": "以專家面相流程讀取五官結構與第一印象訊號。",
      "description": "以專家面相流程讀取五官結構與第一印象訊號。",
      "heroImageAlt": "專家面相分析象徵圖像",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "專家面相分析 | Code Destiny",
        "description": "以專家面相流程讀取五官結構與第一印象訊號。",
        "keywords": ["專家面相分析", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "本命偏愛運",
      "subtitle": "讀取你的命盤與牽動內心之人的共鳴。",
      "description": "讀取你的命盤與牽動內心之人的共鳴。",
      "heroImageAlt": "本命偏愛運象徵圖像",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "本命偏愛運 | Code Destiny",
        "description": "讀取你的命盤與牽動內心之人的共鳴。",
        "keywords": ["本命偏愛運", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "以八字模擬戀愛吸引、摩擦與時機。",
      "description": "以八字模擬戀愛吸引、摩擦與時機。",
      "heroImageAlt": "LOVE CODE象徵圖像",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "以八字模擬戀愛吸引、摩擦與時機。",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi御神籤",
      "subtitle": "打開今日心情、魅力和一個小小徵兆。",
      "description": "打開今日心情、魅力和一個小小徵兆。",
      "heroImageAlt": "Emoi御神籤象徵圖像",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi御神籤 | Code Destiny",
        "description": "打開今日心情、魅力和一個小小徵兆。",
        "keywords": ["Emoi御神籤", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "八字守護動物藝術",
      "subtitle": "喚醒藏在八字節奏中的守護動物。",
      "description": "喚醒藏在八字節奏中的守護動物。",
      "heroImageAlt": "八字守護動物藝術象徵圖像",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "八字守護動物藝術 | Code Destiny",
        "description": "喚醒藏在八字節奏中的守護動物。",
        "keywords": ["八字守護動物藝術", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "八字看緣分地點",
      "subtitle": "讀取更容易開啟重要緣分的地點、城市與時機。",
      "description": "讀取更容易開啟重要緣分的地點、城市與時機。",
      "heroImageAlt": "八字看緣分地點象徵圖像",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "八字看緣分地點 | Code Destiny",
        "description": "讀取更容易開啟重要緣分的地點、城市與時機。",
        "keywords": ["八字看緣分地點", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "紫微斗數高級PDF",
      "subtitle": "將十二宮命盤整理成實用的人生策略書。",
      "description": "將十二宮命盤整理成實用的人生策略書。",
      "heroImageAlt": "紫微斗數高級PDF象徵圖像",
      "priceLabel": "30,000韓元",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "紫微斗數高級PDF | Code Destiny",
        "description": "將十二宮命盤整理成實用的人生策略書。",
        "keywords": ["紫微斗數高級PDF", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "巨石陣盧恩神諭",
      "subtitle": "古老盧恩符號為眼前的問題開啟簡潔而深刻的答案。",
      "description": "古老盧恩符號為眼前的問題開啟簡潔而深刻的答案。",
      "heroImageAlt": "巨石陣盧恩神諭象徵圖像",
      "priceLabel": "3,000~12,000韓元",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "巨石陣盧恩神諭 | Code Destiny",
        "description": "古老盧恩符號為眼前的問題開啟簡潔而深刻的答案。",
        "keywords": ["巨石陣盧恩神諭", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "動物圖騰",
      "subtitle": "守護動物訊息映照此刻的心境與道路。",
      "description": "守護動物訊息映照此刻的心境與道路。",
      "heroImageAlt": "動物圖騰象徵圖像",
      "priceLabel": "3,000~6,000韓元",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["引導式輸入流程", "清晰的解讀結果", "整理下一步行動建議"],
      "howItWorks": [
        {
          "title": "輸入資料",
          "description": "只收集本次解讀所需的內容。"
        },
        {
          "title": "開啟解讀",
          "description": "系統會把所選占術與問題對齊。"
        },
        {
          "title": "查看結果",
          "description": "確認核心訊息、注意點與實際下一步。"
        }
      ],
      "resultExamples": [
        {
          "title": "核心訊號",
          "description": "整理此刻最強的主題。"
        },
        {
          "title": "時機與提醒",
          "description": "把適合行動的時機和需要謹慎的點分開呈現。"
        },
        {
          "title": "下一步",
          "description": "給出今天就能使用的行動方向。"
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "動物圖騰 | Code Destiny",
        "description": "守護動物訊息映照此刻的心境與道路。",
        "keywords": ["動物圖騰", "Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "vi": {
    "saju": {
      "title": "Precise Saju Reading",
      "subtitle": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "heroImageAlt": "Precise Saju Reading symbolic preview",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Precise Saju Reading | Code Destiny",
        "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
        "keywords": ["Precise Saju Reading", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel",
      "subtitle": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "heroImageAlt": "Advanced Zi Wei Dou Shu 12-Palace Counsel symbolic preview",
      "priceLabel": "KRW 20,000",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel | Code Destiny",
        "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
        "keywords": ["Advanced Zi Wei Dou Shu 12-Palace Counsel", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "Sukuyo Relationship Radar",
      "subtitle": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "heroImageAlt": "Sukuyo Relationship Radar symbolic preview",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Sukuyo Relationship Radar | Code Destiny",
        "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
        "keywords": ["Sukuyo Relationship Radar", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "Vedic Astrology Reading",
      "subtitle": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "heroImageAlt": "Vedic Astrology Reading symbolic preview",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Vedic Astrology Reading | Code Destiny",
        "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
        "keywords": ["Vedic Astrology Reading", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "Western Astrology Chart Reading",
      "subtitle": "Read personality, relationships, work, and timing through a Western natal chart.",
      "description": "Read personality, relationships, work, and timing through a Western natal chart.",
      "heroImageAlt": "Western Astrology Chart Reading symbolic preview",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Western Astrology Chart Reading | Code Destiny",
        "description": "Read personality, relationships, work, and timing through a Western natal chart.",
        "keywords": ["Western Astrology Chart Reading", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "Tarot Reading",
      "subtitle": "Cards reveal the texture of the present question and the next standard for choice.",
      "description": "Cards reveal the texture of the present question and the next standard for choice.",
      "heroImageAlt": "Tarot Reading symbolic preview",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Reading | Code Destiny",
        "description": "Cards reveal the texture of the present question and the next standard for choice.",
        "keywords": ["Tarot Reading", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "Tarot Prompt Library",
      "subtitle": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "heroImageAlt": "Tarot Prompt Library symbolic preview",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Prompt Library | Code Destiny",
        "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
        "keywords": ["Tarot Prompt Library", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "Expert Palm Reading",
      "subtitle": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "heroImageAlt": "Expert Palm Reading symbolic preview",
      "priceLabel": "Partly paid",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Palm Reading | Code Destiny",
        "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
        "keywords": ["Expert Palm Reading", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "Expert Face Reading",
      "subtitle": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "heroImageAlt": "Expert Face Reading symbolic preview",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Face Reading | Code Destiny",
        "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
        "keywords": ["Expert Face Reading", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "Favorite-Person Destiny",
      "subtitle": "See the resonance between your chart and the person who keeps drawing your heart.",
      "description": "See the resonance between your chart and the person who keeps drawing your heart.",
      "heroImageAlt": "Favorite-Person Destiny symbolic preview",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Favorite-Person Destiny | Code Destiny",
        "description": "See the resonance between your chart and the person who keeps drawing your heart.",
        "keywords": ["Favorite-Person Destiny", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "heroImageAlt": "LOVE CODE symbolic preview",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi Omikuji",
      "subtitle": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "heroImageAlt": "Emoi Omikuji symbolic preview",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi Omikuji | Code Destiny",
        "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
        "keywords": ["Emoi Omikuji", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "Saju Guardian Art",
      "subtitle": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "heroImageAlt": "Saju Guardian Art symbolic preview",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Saju Guardian Art | Code Destiny",
        "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
        "keywords": ["Saju Guardian Art", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "Destined Meeting Place by Saju",
      "subtitle": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "heroImageAlt": "Destined Meeting Place by Saju symbolic preview",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Destined Meeting Place by Saju | Code Destiny",
        "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
        "keywords": ["Destined Meeting Place by Saju", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "Zi Wei Expert Consultation",
      "subtitle": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "heroImageAlt": "Zi Wei Expert Consultation symbolic preview",
      "priceLabel": "KRW 30,000",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Zi Wei Expert Consultation | Code Destiny",
        "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
        "keywords": ["Zi Wei Expert Consultation", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "Stonehenge Rune Oracle",
      "subtitle": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "heroImageAlt": "Stonehenge Rune Oracle symbolic preview",
      "priceLabel": "KRW 3,000~12,000",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Stonehenge Rune Oracle | Code Destiny",
        "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
        "keywords": ["Stonehenge Rune Oracle", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "Animal Totem",
      "subtitle": "A guardian-animal message that reflects the current state of your heart and path.",
      "description": "A guardian-animal message that reflects the current state of your heart and path.",
      "heroImageAlt": "Animal Totem symbolic preview",
      "priceLabel": "KRW 3,000~6,000",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Animal Totem | Code Destiny",
        "description": "A guardian-animal message that reflects the current state of your heart and path.",
        "keywords": ["Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "hi": {
    "saju": {
      "title": "Precise Saju Reading",
      "subtitle": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "heroImageAlt": "Precise Saju Reading symbolic preview",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Precise Saju Reading | Code Destiny",
        "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
        "keywords": ["Precise Saju Reading", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel",
      "subtitle": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "heroImageAlt": "Advanced Zi Wei Dou Shu 12-Palace Counsel symbolic preview",
      "priceLabel": "KRW 20,000",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel | Code Destiny",
        "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
        "keywords": ["Advanced Zi Wei Dou Shu 12-Palace Counsel", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "Sukuyo Relationship Radar",
      "subtitle": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "heroImageAlt": "Sukuyo Relationship Radar symbolic preview",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Sukuyo Relationship Radar | Code Destiny",
        "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
        "keywords": ["Sukuyo Relationship Radar", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "Vedic Astrology Reading",
      "subtitle": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "heroImageAlt": "Vedic Astrology Reading symbolic preview",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Vedic Astrology Reading | Code Destiny",
        "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
        "keywords": ["Vedic Astrology Reading", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "Western Astrology Chart Reading",
      "subtitle": "Read personality, relationships, work, and timing through a Western natal chart.",
      "description": "Read personality, relationships, work, and timing through a Western natal chart.",
      "heroImageAlt": "Western Astrology Chart Reading symbolic preview",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Western Astrology Chart Reading | Code Destiny",
        "description": "Read personality, relationships, work, and timing through a Western natal chart.",
        "keywords": ["Western Astrology Chart Reading", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "Tarot Reading",
      "subtitle": "Cards reveal the texture of the present question and the next standard for choice.",
      "description": "Cards reveal the texture of the present question and the next standard for choice.",
      "heroImageAlt": "Tarot Reading symbolic preview",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Reading | Code Destiny",
        "description": "Cards reveal the texture of the present question and the next standard for choice.",
        "keywords": ["Tarot Reading", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "Tarot Prompt Library",
      "subtitle": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "heroImageAlt": "Tarot Prompt Library symbolic preview",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Prompt Library | Code Destiny",
        "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
        "keywords": ["Tarot Prompt Library", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "Expert Palm Reading",
      "subtitle": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "heroImageAlt": "Expert Palm Reading symbolic preview",
      "priceLabel": "Partly paid",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Palm Reading | Code Destiny",
        "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
        "keywords": ["Expert Palm Reading", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "Expert Face Reading",
      "subtitle": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "heroImageAlt": "Expert Face Reading symbolic preview",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Face Reading | Code Destiny",
        "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
        "keywords": ["Expert Face Reading", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "Favorite-Person Destiny",
      "subtitle": "See the resonance between your chart and the person who keeps drawing your heart.",
      "description": "See the resonance between your chart and the person who keeps drawing your heart.",
      "heroImageAlt": "Favorite-Person Destiny symbolic preview",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Favorite-Person Destiny | Code Destiny",
        "description": "See the resonance between your chart and the person who keeps drawing your heart.",
        "keywords": ["Favorite-Person Destiny", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "heroImageAlt": "LOVE CODE symbolic preview",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi Omikuji",
      "subtitle": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "heroImageAlt": "Emoi Omikuji symbolic preview",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi Omikuji | Code Destiny",
        "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
        "keywords": ["Emoi Omikuji", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "Saju Guardian Art",
      "subtitle": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "heroImageAlt": "Saju Guardian Art symbolic preview",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Saju Guardian Art | Code Destiny",
        "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
        "keywords": ["Saju Guardian Art", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "Destined Meeting Place by Saju",
      "subtitle": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "heroImageAlt": "Destined Meeting Place by Saju symbolic preview",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Destined Meeting Place by Saju | Code Destiny",
        "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
        "keywords": ["Destined Meeting Place by Saju", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "Zi Wei Expert Consultation",
      "subtitle": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "heroImageAlt": "Zi Wei Expert Consultation symbolic preview",
      "priceLabel": "KRW 30,000",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Zi Wei Expert Consultation | Code Destiny",
        "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
        "keywords": ["Zi Wei Expert Consultation", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "Stonehenge Rune Oracle",
      "subtitle": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "heroImageAlt": "Stonehenge Rune Oracle symbolic preview",
      "priceLabel": "KRW 3,000~12,000",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Stonehenge Rune Oracle | Code Destiny",
        "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
        "keywords": ["Stonehenge Rune Oracle", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "Animal Totem",
      "subtitle": "A guardian-animal message that reflects the current state of your heart and path.",
      "description": "A guardian-animal message that reflects the current state of your heart and path.",
      "heroImageAlt": "Animal Totem symbolic preview",
      "priceLabel": "KRW 3,000~6,000",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Animal Totem | Code Destiny",
        "description": "A guardian-animal message that reflects the current state of your heart and path.",
        "keywords": ["Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "es": {
    "saju": {
      "title": "Precise Saju Reading",
      "subtitle": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "heroImageAlt": "Precise Saju Reading symbolic preview",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Precise Saju Reading | Code Destiny",
        "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
        "keywords": ["Precise Saju Reading", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel",
      "subtitle": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "heroImageAlt": "Advanced Zi Wei Dou Shu 12-Palace Counsel symbolic preview",
      "priceLabel": "KRW 20,000",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel | Code Destiny",
        "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
        "keywords": ["Advanced Zi Wei Dou Shu 12-Palace Counsel", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "Sukuyo Relationship Radar",
      "subtitle": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "heroImageAlt": "Sukuyo Relationship Radar symbolic preview",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Sukuyo Relationship Radar | Code Destiny",
        "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
        "keywords": ["Sukuyo Relationship Radar", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "Vedic Astrology Reading",
      "subtitle": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "heroImageAlt": "Vedic Astrology Reading symbolic preview",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Vedic Astrology Reading | Code Destiny",
        "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
        "keywords": ["Vedic Astrology Reading", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "Western Astrology Chart Reading",
      "subtitle": "Read personality, relationships, work, and timing through a Western natal chart.",
      "description": "Read personality, relationships, work, and timing through a Western natal chart.",
      "heroImageAlt": "Western Astrology Chart Reading symbolic preview",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Western Astrology Chart Reading | Code Destiny",
        "description": "Read personality, relationships, work, and timing through a Western natal chart.",
        "keywords": ["Western Astrology Chart Reading", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "Tarot Reading",
      "subtitle": "Cards reveal the texture of the present question and the next standard for choice.",
      "description": "Cards reveal the texture of the present question and the next standard for choice.",
      "heroImageAlt": "Tarot Reading symbolic preview",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Reading | Code Destiny",
        "description": "Cards reveal the texture of the present question and the next standard for choice.",
        "keywords": ["Tarot Reading", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "Tarot Prompt Library",
      "subtitle": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "heroImageAlt": "Tarot Prompt Library symbolic preview",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Prompt Library | Code Destiny",
        "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
        "keywords": ["Tarot Prompt Library", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "Expert Palm Reading",
      "subtitle": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "heroImageAlt": "Expert Palm Reading symbolic preview",
      "priceLabel": "Partly paid",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Palm Reading | Code Destiny",
        "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
        "keywords": ["Expert Palm Reading", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "Expert Face Reading",
      "subtitle": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "heroImageAlt": "Expert Face Reading symbolic preview",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Face Reading | Code Destiny",
        "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
        "keywords": ["Expert Face Reading", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "Favorite-Person Destiny",
      "subtitle": "See the resonance between your chart and the person who keeps drawing your heart.",
      "description": "See the resonance between your chart and the person who keeps drawing your heart.",
      "heroImageAlt": "Favorite-Person Destiny symbolic preview",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Favorite-Person Destiny | Code Destiny",
        "description": "See the resonance between your chart and the person who keeps drawing your heart.",
        "keywords": ["Favorite-Person Destiny", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "heroImageAlt": "LOVE CODE symbolic preview",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi Omikuji",
      "subtitle": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "heroImageAlt": "Emoi Omikuji symbolic preview",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi Omikuji | Code Destiny",
        "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
        "keywords": ["Emoi Omikuji", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "Saju Guardian Art",
      "subtitle": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "heroImageAlt": "Saju Guardian Art symbolic preview",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Saju Guardian Art | Code Destiny",
        "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
        "keywords": ["Saju Guardian Art", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "Destined Meeting Place by Saju",
      "subtitle": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "heroImageAlt": "Destined Meeting Place by Saju symbolic preview",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Destined Meeting Place by Saju | Code Destiny",
        "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
        "keywords": ["Destined Meeting Place by Saju", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "Zi Wei Expert Consultation",
      "subtitle": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "heroImageAlt": "Zi Wei Expert Consultation symbolic preview",
      "priceLabel": "KRW 30,000",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Zi Wei Expert Consultation | Code Destiny",
        "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
        "keywords": ["Zi Wei Expert Consultation", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "Stonehenge Rune Oracle",
      "subtitle": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "heroImageAlt": "Stonehenge Rune Oracle symbolic preview",
      "priceLabel": "KRW 3,000~12,000",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Stonehenge Rune Oracle | Code Destiny",
        "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
        "keywords": ["Stonehenge Rune Oracle", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "Animal Totem",
      "subtitle": "A guardian-animal message that reflects the current state of your heart and path.",
      "description": "A guardian-animal message that reflects the current state of your heart and path.",
      "heroImageAlt": "Animal Totem symbolic preview",
      "priceLabel": "KRW 3,000~6,000",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Animal Totem | Code Destiny",
        "description": "A guardian-animal message that reflects the current state of your heart and path.",
        "keywords": ["Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "fr": {
    "saju": {
      "title": "Precise Saju Reading",
      "subtitle": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "heroImageAlt": "Precise Saju Reading symbolic preview",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Precise Saju Reading | Code Destiny",
        "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
        "keywords": ["Precise Saju Reading", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel",
      "subtitle": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "heroImageAlt": "Advanced Zi Wei Dou Shu 12-Palace Counsel symbolic preview",
      "priceLabel": "KRW 20,000",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel | Code Destiny",
        "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
        "keywords": ["Advanced Zi Wei Dou Shu 12-Palace Counsel", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "Sukuyo Relationship Radar",
      "subtitle": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "heroImageAlt": "Sukuyo Relationship Radar symbolic preview",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Sukuyo Relationship Radar | Code Destiny",
        "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
        "keywords": ["Sukuyo Relationship Radar", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "Vedic Astrology Reading",
      "subtitle": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "heroImageAlt": "Vedic Astrology Reading symbolic preview",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Vedic Astrology Reading | Code Destiny",
        "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
        "keywords": ["Vedic Astrology Reading", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "Western Astrology Chart Reading",
      "subtitle": "Read personality, relationships, work, and timing through a Western natal chart.",
      "description": "Read personality, relationships, work, and timing through a Western natal chart.",
      "heroImageAlt": "Western Astrology Chart Reading symbolic preview",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Western Astrology Chart Reading | Code Destiny",
        "description": "Read personality, relationships, work, and timing through a Western natal chart.",
        "keywords": ["Western Astrology Chart Reading", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "Tarot Reading",
      "subtitle": "Cards reveal the texture of the present question and the next standard for choice.",
      "description": "Cards reveal the texture of the present question and the next standard for choice.",
      "heroImageAlt": "Tarot Reading symbolic preview",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Reading | Code Destiny",
        "description": "Cards reveal the texture of the present question and the next standard for choice.",
        "keywords": ["Tarot Reading", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "Tarot Prompt Library",
      "subtitle": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "heroImageAlt": "Tarot Prompt Library symbolic preview",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Prompt Library | Code Destiny",
        "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
        "keywords": ["Tarot Prompt Library", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "Expert Palm Reading",
      "subtitle": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "heroImageAlt": "Expert Palm Reading symbolic preview",
      "priceLabel": "Partly paid",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Palm Reading | Code Destiny",
        "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
        "keywords": ["Expert Palm Reading", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "Expert Face Reading",
      "subtitle": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "heroImageAlt": "Expert Face Reading symbolic preview",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Face Reading | Code Destiny",
        "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
        "keywords": ["Expert Face Reading", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "Favorite-Person Destiny",
      "subtitle": "See the resonance between your chart and the person who keeps drawing your heart.",
      "description": "See the resonance between your chart and the person who keeps drawing your heart.",
      "heroImageAlt": "Favorite-Person Destiny symbolic preview",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Favorite-Person Destiny | Code Destiny",
        "description": "See the resonance between your chart and the person who keeps drawing your heart.",
        "keywords": ["Favorite-Person Destiny", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "heroImageAlt": "LOVE CODE symbolic preview",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi Omikuji",
      "subtitle": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "heroImageAlt": "Emoi Omikuji symbolic preview",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi Omikuji | Code Destiny",
        "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
        "keywords": ["Emoi Omikuji", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "Saju Guardian Art",
      "subtitle": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "heroImageAlt": "Saju Guardian Art symbolic preview",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Saju Guardian Art | Code Destiny",
        "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
        "keywords": ["Saju Guardian Art", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "Destined Meeting Place by Saju",
      "subtitle": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "heroImageAlt": "Destined Meeting Place by Saju symbolic preview",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Destined Meeting Place by Saju | Code Destiny",
        "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
        "keywords": ["Destined Meeting Place by Saju", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "Zi Wei Expert Consultation",
      "subtitle": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "heroImageAlt": "Zi Wei Expert Consultation symbolic preview",
      "priceLabel": "KRW 30,000",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Zi Wei Expert Consultation | Code Destiny",
        "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
        "keywords": ["Zi Wei Expert Consultation", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "Stonehenge Rune Oracle",
      "subtitle": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "heroImageAlt": "Stonehenge Rune Oracle symbolic preview",
      "priceLabel": "KRW 3,000~12,000",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Stonehenge Rune Oracle | Code Destiny",
        "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
        "keywords": ["Stonehenge Rune Oracle", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "Animal Totem",
      "subtitle": "A guardian-animal message that reflects the current state of your heart and path.",
      "description": "A guardian-animal message that reflects the current state of your heart and path.",
      "heroImageAlt": "Animal Totem symbolic preview",
      "priceLabel": "KRW 3,000~6,000",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Animal Totem | Code Destiny",
        "description": "A guardian-animal message that reflects the current state of your heart and path.",
        "keywords": ["Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "de": {
    "saju": {
      "title": "Precise Saju Reading",
      "subtitle": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "heroImageAlt": "Precise Saju Reading symbolic preview",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Precise Saju Reading | Code Destiny",
        "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
        "keywords": ["Precise Saju Reading", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel",
      "subtitle": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "heroImageAlt": "Advanced Zi Wei Dou Shu 12-Palace Counsel symbolic preview",
      "priceLabel": "KRW 20,000",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel | Code Destiny",
        "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
        "keywords": ["Advanced Zi Wei Dou Shu 12-Palace Counsel", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "Sukuyo Relationship Radar",
      "subtitle": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "heroImageAlt": "Sukuyo Relationship Radar symbolic preview",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Sukuyo Relationship Radar | Code Destiny",
        "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
        "keywords": ["Sukuyo Relationship Radar", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "Vedic Astrology Reading",
      "subtitle": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "heroImageAlt": "Vedic Astrology Reading symbolic preview",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Vedic Astrology Reading | Code Destiny",
        "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
        "keywords": ["Vedic Astrology Reading", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "Western Astrology Chart Reading",
      "subtitle": "Read personality, relationships, work, and timing through a Western natal chart.",
      "description": "Read personality, relationships, work, and timing through a Western natal chart.",
      "heroImageAlt": "Western Astrology Chart Reading symbolic preview",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Western Astrology Chart Reading | Code Destiny",
        "description": "Read personality, relationships, work, and timing through a Western natal chart.",
        "keywords": ["Western Astrology Chart Reading", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "Tarot Reading",
      "subtitle": "Cards reveal the texture of the present question and the next standard for choice.",
      "description": "Cards reveal the texture of the present question and the next standard for choice.",
      "heroImageAlt": "Tarot Reading symbolic preview",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Reading | Code Destiny",
        "description": "Cards reveal the texture of the present question and the next standard for choice.",
        "keywords": ["Tarot Reading", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "Tarot Prompt Library",
      "subtitle": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "heroImageAlt": "Tarot Prompt Library symbolic preview",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Prompt Library | Code Destiny",
        "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
        "keywords": ["Tarot Prompt Library", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "Expert Palm Reading",
      "subtitle": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "heroImageAlt": "Expert Palm Reading symbolic preview",
      "priceLabel": "Partly paid",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Palm Reading | Code Destiny",
        "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
        "keywords": ["Expert Palm Reading", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "Expert Face Reading",
      "subtitle": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "heroImageAlt": "Expert Face Reading symbolic preview",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Face Reading | Code Destiny",
        "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
        "keywords": ["Expert Face Reading", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "Favorite-Person Destiny",
      "subtitle": "See the resonance between your chart and the person who keeps drawing your heart.",
      "description": "See the resonance between your chart and the person who keeps drawing your heart.",
      "heroImageAlt": "Favorite-Person Destiny symbolic preview",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Favorite-Person Destiny | Code Destiny",
        "description": "See the resonance between your chart and the person who keeps drawing your heart.",
        "keywords": ["Favorite-Person Destiny", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "heroImageAlt": "LOVE CODE symbolic preview",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi Omikuji",
      "subtitle": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "heroImageAlt": "Emoi Omikuji symbolic preview",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi Omikuji | Code Destiny",
        "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
        "keywords": ["Emoi Omikuji", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "Saju Guardian Art",
      "subtitle": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "heroImageAlt": "Saju Guardian Art symbolic preview",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Saju Guardian Art | Code Destiny",
        "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
        "keywords": ["Saju Guardian Art", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "Destined Meeting Place by Saju",
      "subtitle": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "heroImageAlt": "Destined Meeting Place by Saju symbolic preview",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Destined Meeting Place by Saju | Code Destiny",
        "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
        "keywords": ["Destined Meeting Place by Saju", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "Zi Wei Expert Consultation",
      "subtitle": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "heroImageAlt": "Zi Wei Expert Consultation symbolic preview",
      "priceLabel": "KRW 30,000",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Zi Wei Expert Consultation | Code Destiny",
        "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
        "keywords": ["Zi Wei Expert Consultation", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "Stonehenge Rune Oracle",
      "subtitle": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "heroImageAlt": "Stonehenge Rune Oracle symbolic preview",
      "priceLabel": "KRW 3,000~12,000",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Stonehenge Rune Oracle | Code Destiny",
        "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
        "keywords": ["Stonehenge Rune Oracle", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "Animal Totem",
      "subtitle": "A guardian-animal message that reflects the current state of your heart and path.",
      "description": "A guardian-animal message that reflects the current state of your heart and path.",
      "heroImageAlt": "Animal Totem symbolic preview",
      "priceLabel": "KRW 3,000~6,000",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Animal Totem | Code Destiny",
        "description": "A guardian-animal message that reflects the current state of your heart and path.",
        "keywords": ["Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "nl": {
    "saju": {
      "title": "Precise Saju Reading",
      "subtitle": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "heroImageAlt": "Precise Saju Reading symbolic preview",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Precise Saju Reading | Code Destiny",
        "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
        "keywords": ["Precise Saju Reading", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel",
      "subtitle": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "heroImageAlt": "Advanced Zi Wei Dou Shu 12-Palace Counsel symbolic preview",
      "priceLabel": "KRW 20,000",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel | Code Destiny",
        "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
        "keywords": ["Advanced Zi Wei Dou Shu 12-Palace Counsel", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "Sukuyo Relationship Radar",
      "subtitle": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "heroImageAlt": "Sukuyo Relationship Radar symbolic preview",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Sukuyo Relationship Radar | Code Destiny",
        "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
        "keywords": ["Sukuyo Relationship Radar", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "Vedic Astrology Reading",
      "subtitle": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "heroImageAlt": "Vedic Astrology Reading symbolic preview",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Vedic Astrology Reading | Code Destiny",
        "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
        "keywords": ["Vedic Astrology Reading", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "Western Astrology Chart Reading",
      "subtitle": "Read personality, relationships, work, and timing through a Western natal chart.",
      "description": "Read personality, relationships, work, and timing through a Western natal chart.",
      "heroImageAlt": "Western Astrology Chart Reading symbolic preview",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Western Astrology Chart Reading | Code Destiny",
        "description": "Read personality, relationships, work, and timing through a Western natal chart.",
        "keywords": ["Western Astrology Chart Reading", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "Tarot Reading",
      "subtitle": "Cards reveal the texture of the present question and the next standard for choice.",
      "description": "Cards reveal the texture of the present question and the next standard for choice.",
      "heroImageAlt": "Tarot Reading symbolic preview",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Reading | Code Destiny",
        "description": "Cards reveal the texture of the present question and the next standard for choice.",
        "keywords": ["Tarot Reading", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "Tarot Prompt Library",
      "subtitle": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "heroImageAlt": "Tarot Prompt Library symbolic preview",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Prompt Library | Code Destiny",
        "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
        "keywords": ["Tarot Prompt Library", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "Expert Palm Reading",
      "subtitle": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "heroImageAlt": "Expert Palm Reading symbolic preview",
      "priceLabel": "Partly paid",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Palm Reading | Code Destiny",
        "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
        "keywords": ["Expert Palm Reading", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "Expert Face Reading",
      "subtitle": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "heroImageAlt": "Expert Face Reading symbolic preview",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Face Reading | Code Destiny",
        "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
        "keywords": ["Expert Face Reading", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "Favorite-Person Destiny",
      "subtitle": "See the resonance between your chart and the person who keeps drawing your heart.",
      "description": "See the resonance between your chart and the person who keeps drawing your heart.",
      "heroImageAlt": "Favorite-Person Destiny symbolic preview",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Favorite-Person Destiny | Code Destiny",
        "description": "See the resonance between your chart and the person who keeps drawing your heart.",
        "keywords": ["Favorite-Person Destiny", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "heroImageAlt": "LOVE CODE symbolic preview",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi Omikuji",
      "subtitle": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "heroImageAlt": "Emoi Omikuji symbolic preview",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi Omikuji | Code Destiny",
        "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
        "keywords": ["Emoi Omikuji", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "Saju Guardian Art",
      "subtitle": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "heroImageAlt": "Saju Guardian Art symbolic preview",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Saju Guardian Art | Code Destiny",
        "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
        "keywords": ["Saju Guardian Art", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "Destined Meeting Place by Saju",
      "subtitle": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "heroImageAlt": "Destined Meeting Place by Saju symbolic preview",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Destined Meeting Place by Saju | Code Destiny",
        "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
        "keywords": ["Destined Meeting Place by Saju", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "Zi Wei Expert Consultation",
      "subtitle": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "heroImageAlt": "Zi Wei Expert Consultation symbolic preview",
      "priceLabel": "KRW 30,000",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Zi Wei Expert Consultation | Code Destiny",
        "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
        "keywords": ["Zi Wei Expert Consultation", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "Stonehenge Rune Oracle",
      "subtitle": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "heroImageAlt": "Stonehenge Rune Oracle symbolic preview",
      "priceLabel": "KRW 3,000~12,000",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Stonehenge Rune Oracle | Code Destiny",
        "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
        "keywords": ["Stonehenge Rune Oracle", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "Animal Totem",
      "subtitle": "A guardian-animal message that reflects the current state of your heart and path.",
      "description": "A guardian-animal message that reflects the current state of your heart and path.",
      "heroImageAlt": "Animal Totem symbolic preview",
      "priceLabel": "KRW 3,000~6,000",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Animal Totem | Code Destiny",
        "description": "A guardian-animal message that reflects the current state of your heart and path.",
        "keywords": ["Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  },
  "ms": {
    "saju": {
      "title": "Precise Saju Reading",
      "subtitle": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
      "heroImageAlt": "Precise Saju Reading symbolic preview",
      "tags": ["Saju", "Five Elements", "Ten Gods", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Precise Saju Reading | Code Destiny",
        "description": "A complete birth-chart reading of Five Elements, Ten Gods, timing, and life direction.",
        "keywords": ["Precise Saju Reading", "Saju", "Five Elements", "Ten Gods", "Timing"]
      }
    },
    "ziwei": {
      "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel",
      "subtitle": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
      "heroImageAlt": "Advanced Zi Wei Dou Shu 12-Palace Counsel symbolic preview",
      "priceLabel": "KRW 20,000",
      "tags": ["Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Advanced Zi Wei Dou Shu 12-Palace Counsel | Code Destiny",
        "description": "Read the Life Palace, Body Palace, transformations, and the twelve palaces as a practical destiny map.",
        "keywords": ["Advanced Zi Wei Dou Shu 12-Palace Counsel", "Zi Wei", "12 Palaces", "Life Palace", "Four Transformations"]
      }
    },
    "sukyo": {
      "title": "Sukuyo Relationship Radar",
      "subtitle": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
      "heroImageAlt": "Sukuyo Relationship Radar symbolic preview",
      "tags": ["Sukuyo", "Compatibility", "Moon Mansions"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Sukuyo Relationship Radar | Code Destiny",
        "description": "Trace emotional distance, affinity, and timing through the twenty-seven lunar mansions.",
        "keywords": ["Sukuyo Relationship Radar", "Sukuyo", "Compatibility", "Moon Mansions"]
      }
    },
    "vedic": {
      "title": "Vedic Astrology Reading",
      "subtitle": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
      "heroImageAlt": "Vedic Astrology Reading symbolic preview",
      "tags": ["Vedic Astrology", "Jyotish", "Natal Chart"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Vedic Astrology Reading | Code Destiny",
        "description": "Open a Jyotish-style chart reading that follows planets, houses, and life rhythm.",
        "keywords": ["Vedic Astrology Reading", "Vedic Astrology", "Jyotish", "Natal Chart"]
      }
    },
    "astrology": {
      "title": "Western Astrology Chart Reading",
      "subtitle": "Read personality, relationships, work, and timing through a Western natal chart.",
      "description": "Read personality, relationships, work, and timing through a Western natal chart.",
      "heroImageAlt": "Western Astrology Chart Reading symbolic preview",
      "tags": ["Astrology", "Natal Chart", "Planets"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Western Astrology Chart Reading | Code Destiny",
        "description": "Read personality, relationships, work, and timing through a Western natal chart.",
        "keywords": ["Western Astrology Chart Reading", "Astrology", "Natal Chart", "Planets"]
      }
    },
    "tarot": {
      "title": "Tarot Reading",
      "subtitle": "Cards reveal the texture of the present question and the next standard for choice.",
      "description": "Cards reveal the texture of the present question and the next standard for choice.",
      "heroImageAlt": "Tarot Reading symbolic preview",
      "tags": ["Tarot", "Cards", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Reading | Code Destiny",
        "description": "Cards reveal the texture of the present question and the next standard for choice.",
        "keywords": ["Tarot Reading", "Tarot", "Cards", "Oracle"]
      }
    },
    "tarot-prompt-maker": {
      "title": "Tarot Prompt Library",
      "subtitle": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
      "heroImageAlt": "Tarot Prompt Library symbolic preview",
      "tags": ["Tarot Prompt", "Spread", "Oracle Text"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Tarot Prompt Library | Code Destiny",
        "description": "Choose a spread, draw cards, and organize a polished oracle prompt for deeper reading.",
        "keywords": ["Tarot Prompt Library", "Tarot Prompt", "Spread", "Oracle Text"]
      }
    },
    "palm-reading": {
      "title": "Expert Palm Reading",
      "subtitle": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
      "heroImageAlt": "Expert Palm Reading symbolic preview",
      "priceLabel": "Partly paid",
      "tags": ["Palm Reading", "Expert", "Hand Lines"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Palm Reading | Code Destiny",
        "description": "Read the major lines and hand signs from a palm image with guided expert interpretation.",
        "keywords": ["Expert Palm Reading", "Palm Reading", "Expert", "Hand Lines"]
      }
    },
    "face-reading": {
      "title": "Expert Face Reading",
      "subtitle": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
      "heroImageAlt": "Expert Face Reading symbolic preview",
      "tags": ["Face Reading", "Expert", "Impression"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Expert Face Reading | Code Destiny",
        "description": "Read facial structure and impression signals through a careful expert face-reading flow.",
        "keywords": ["Expert Face Reading", "Face Reading", "Expert", "Impression"]
      }
    },
    "bias-destiny": {
      "title": "Favorite-Person Destiny",
      "subtitle": "See the resonance between your chart and the person who keeps drawing your heart.",
      "description": "See the resonance between your chart and the person who keeps drawing your heart.",
      "heroImageAlt": "Favorite-Person Destiny symbolic preview",
      "tags": ["Favorite Person", "Resonance", "Saju"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Favorite-Person Destiny | Code Destiny",
        "description": "See the resonance between your chart and the person who keeps drawing your heart.",
        "keywords": ["Favorite-Person Destiny", "Favorite Person", "Resonance", "Saju"]
      }
    },
    "love-code": {
      "title": "LOVE CODE",
      "subtitle": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
      "heroImageAlt": "LOVE CODE symbolic preview",
      "tags": ["Love", "Compatibility", "Simulation"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "LOVE CODE | Code Destiny",
        "description": "A Saju-based love simulation that reveals attraction rhythm, friction, and timing.",
        "keywords": ["LOVE CODE", "Love", "Compatibility", "Simulation"]
      }
    },
    "omikuji": {
      "title": "Emoi Omikuji",
      "subtitle": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
      "heroImageAlt": "Emoi Omikuji symbolic preview",
      "tags": ["Omikuji", "Daily Omen", "Mood"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Emoi Omikuji | Code Destiny",
        "description": "Open a light daily omen with charm, mood, and a small sign for the day.",
        "keywords": ["Emoi Omikuji", "Omikuji", "Daily Omen", "Mood"]
      }
    },
    "saju-animal": {
      "title": "Saju Guardian Art",
      "subtitle": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
      "heroImageAlt": "Saju Guardian Art symbolic preview",
      "tags": ["Guardian Animal", "Saju", "Art"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Saju Guardian Art | Code Destiny",
        "description": "Meet the guardian animal awakened by your Saju rhythm and twelve growth stars.",
        "keywords": ["Saju Guardian Art", "Guardian Animal", "Saju", "Art"]
      }
    },
    "destiny-meeting-place": {
      "title": "Destined Meeting Place by Saju",
      "subtitle": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
      "heroImageAlt": "Destined Meeting Place by Saju symbolic preview",
      "tags": ["Destined Place", "Relationship", "Timing"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Destined Meeting Place by Saju | Code Destiny",
        "description": "Read places, cities, and timing where meaningful connection is more likely to open.",
        "keywords": ["Destined Meeting Place by Saju", "Destined Place", "Relationship", "Timing"]
      }
    },
    "saju-lifebook": {
      "title": "Life Book Expert Consultation",
      "subtitle": "A one-on-one reading that follows your life as a living story.",
      "description": "Enter birth details and a life theme, then receive a warm consultation shaped by chart structure, recurring patterns, strengths, relationships, work, money, and the choice in front of you.",
      "heroImageAlt": "Life Book Expert Consultation representative image",
      "priceLabel": "KRW 50,000",
      "tags": ["Expert Consultation", "Saju", "Life Story"],
      "highlights": ["Chart-based counsel", "Core life theme", "Follow-up questions"],
      "howItWorks": [
        {
          "title": "Enter your details",
          "description": "Share your name or nickname, gender, birth date, optional birth time, calendar type, and topic."
        },
        {
          "title": "Read the flow",
          "description": "The consultation uses the entered information to organize the chart structure and life pattern."
        },
        {
          "title": "Continue the conversation",
          "description": "Ask follow-up questions from the same consultation thread."
        }
      ],
      "resultExamples": [
        {
          "title": "Your life book title",
          "description": "The central theme and three keywords of your story"
        },
        {
          "title": "Recurring patterns",
          "description": "How temperament, relationships, work, and money tend to repeat"
        },
        {
          "title": "Advice for now",
          "description": "A grounded direction for the turning point you are standing in"
        }
      ],
      "seo": {
        "title": "Life Book Expert Consultation | Code Destiny",
        "description": "A warm Life Book Expert consultation that reads your life flow from birth details and your chosen theme.",
        "keywords": ["Life Book Expert Consultation", "Saju consultation", "life reading", "Code Destiny"]
      },
      "premiumOptions": []
    },
    "ziwei-ai": {
      "title": "Zi Wei Expert Consultation",
      "subtitle": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
      "heroImageAlt": "Zi Wei Expert Consultation symbolic preview",
      "priceLabel": "KRW 30,000",
      "tags": ["Expert Consultation", "Zi Wei", "12 Palaces"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Zi Wei Expert Consultation | Code Destiny",
        "description": "A Zi Wei Expert consultation that reads your twelve-palace chart as a practical life conversation.",
        "keywords": ["Zi Wei Expert Consultation", "Expert Consultation", "Zi Wei", "12 Palaces"]
      }
    },
    "stonehenge-rune": {
      "title": "Stonehenge Rune Oracle",
      "subtitle": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
      "heroImageAlt": "Stonehenge Rune Oracle symbolic preview",
      "priceLabel": "KRW 3,000~12,000",
      "tags": ["Runes", "Oracle", "Stonehenge"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Stonehenge Rune Oracle | Code Destiny",
        "description": "Ancient rune symbols open a compact oracle reading for the question in front of you.",
        "keywords": ["Stonehenge Rune Oracle", "Runes", "Oracle", "Stonehenge"]
      }
    },
    "animal-totem": {
      "title": "Animal Totem",
      "subtitle": "A guardian-animal message that reflects the current state of your heart and path.",
      "description": "A guardian-animal message that reflects the current state of your heart and path.",
      "heroImageAlt": "Animal Totem symbolic preview",
      "priceLabel": "KRW 3,000~6,000",
      "tags": ["Animal Totem", "Guardian Message", "Oracle"],
      "highlights": ["Guided input flow", "Clear result reading", "Follow-up guidance for the next step"],
      "howItWorks": [
        {
          "title": "Enter details",
          "description": "Share only the details needed for this reading."
        },
        {
          "title": "Open the reading",
          "description": "The system aligns the selected tradition with your question."
        },
        {
          "title": "Read the result",
          "description": "Review the core message, cautions, and practical next step."
        }
      ],
      "resultExamples": [
        {
          "title": "Core signal",
          "description": "The reading summarizes the strongest theme now."
        },
        {
          "title": "Timing and caution",
          "description": "Helpful timing and points to handle carefully are separated."
        },
        {
          "title": "Next step",
          "description": "A practical action is offered so the reading can be used immediately."
        }
      ],
      "premiumOptions": [],
      "seo": {
        "title": "Animal Totem | Code Destiny",
        "description": "A guardian-animal message that reflects the current state of your heart and path.",
        "keywords": ["Animal Totem", "Guardian Message", "Oracle"]
      }
    }
  }
} as const satisfies Record<ServiceFeatureLocale, Record<string, ServiceFeatureCopy>>;

const FEATURE_DEFINITIONS: ServiceFeatureDefinition[] = ([
  {
    slug: "saju",
    copyKey: "saju",
    category: "saju",
    image: stableServiceAsset("/fuctionassets/saju.webp"),
    detailRoute: "/services/saju",
    launchRoute: "/saju/basic/play",
    accessType: "free",
  },
  {
    slug: "ziwei",
    copyKey: "ziwei",
    category: "ziwei",
    image: stableServiceAsset("/fuctionassets/jami.webp"),
    detailRoute: "/services/ziwei",
    launchRoute: "/ziwei/chart",
    accessType: "paid",
    featureKey: "premium-ziwei",
  },
  {
    slug: "sukyo",
    copyKey: "sukyo",
    category: "astrology",
    image: stableServiceAsset("/fuctionassets/sukyo.webp"),
    detailRoute: "/services/sukyo",
    launchRoute: "/index.html?action=openSukuyoModal",
    accessType: "free",
  },
  {
    slug: "vedic",
    copyKey: "vedic",
    category: "astrology",
    image: stableServiceAsset("/fuctionassets/veda.webp"),
    detailRoute: "/services/vedic",
    launchRoute: "/index.html?action=navigateToVedic",
    accessType: "free",
  },
  {
    slug: "astrology",
    copyKey: "astrology",
    category: "astrology",
    image: stableServiceAsset("/fuctionassets/jumsung.webp"),
    detailRoute: "/services/astrology",
    launchRoute: "/index.html?action=openAstroModal",
    accessType: "free",
  },
  {
    slug: "tarot",
    copyKey: "tarot",
    category: "tarot",
    image: "/fuctionassets/ai%20tarrot.webp",
    detailRoute: "/services/tarot",
    launchRoute: "/index.html?action=openTarotModal",
    accessType: "free",
  },
  {
    slug: "tarot-prompt-maker",
    copyKey: "tarot-prompt-maker",
    category: "tarot",
    image: "/fuctionassets/연애 재회 타로 프롬프트 메이커.webp",
    detailRoute: "/services/tarot-prompt-maker",
    launchRoute: "/tarot/prompt-maker",
    accessType: "paid",
    featureKey: "tarot-prompt-maker",
  },
  {
    slug: "palm-reading",
    copyKey: "palm-reading",
    category: "palm",
    image: "/fuctionassets/%EC%86%90%EA%B8%88.webp",
    detailRoute: "/services/palm-reading",
    launchRoute: "/palm-reading",
    accessType: "paid",
  },
  {
    slug: "face-reading",
    copyKey: "face-reading",
    category: "face",
    image: "/fuctionassets/ai%20animal.webp",
    detailRoute: "/services/face-reading",
    launchRoute: "/saju-guardian",
    accessType: "free",
  },
  {
    slug: "bias-destiny",
    copyKey: "bias-destiny",
    category: "love",
    image: stableServiceAsset("/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp"),
    detailRoute: "/services/bias-destiny",
    launchRoute: "/saju/destiny-bias",
    accessType: "paid",
    featureKey: "destiny-bias-analyze",
  },
  {
    slug: "love-code",
    copyKey: "love-code",
    category: "love",
    image: stableServiceAsset("/fuctionassets/love code.webp"),
    detailRoute: "/services/love-code",
    launchRoute: "/index.html?action=openLoveSimulation",
    accessType: "paid",
    featureKey: "loveSimulation",
  },
  {
    slug: "omikuji",
    copyKey: "omikuji",
    category: "fun",
    image: "/fuctionassets/%EC%98%A4%EB%AF%B8%EC%BF%A0%EC%A7%80.webp",
    detailRoute: "/services/omikuji",
    launchRoute: "/emoi_omikuji_v2.html",
    accessType: "free",
  },
  {
    slug: "saju-animal",
    copyKey: "saju-animal",
    category: "fun",
    image: "/fuctionassets/Who%20am%20I%20with%20saju.webp",
    detailRoute: "/services/saju-animal",
    launchRoute: "/saju-guardian",
    accessType: "free",
  },
  {
    slug: "destiny-meeting-place",
    copyKey: "destiny-meeting-place",
    category: "fun",
    image: "/fuctionassets/%EC%82%AC%EC%A3%BC%EB%A1%9C%EB%B3%B4%EB%8A%94%20%EC%9D%B8%EC%97%B0%EC%9D%98%20%EC%9E%A5%EC%86%8C.webp",
    detailRoute: "/services/destiny-meeting-place",
    launchRoute: "/saju/destiny-meeting-place",
    accessType: "paid",
    featureKey: "destiny_meeting_place",
  },
  {
    slug: "saju-lifebook",
    copyKey: "saju-lifebook",
    category: "premium",
    image: stableServiceAsset("/fuctionassets/lifebook.webp"),
    detailRoute: "/services/saju-lifebook",
    launchRoute: "/life-book-ai",
    accessType: "paid",
    featureKey: "life-book-ai-consultation",
  },
  {
    slug: "ziwei-ai",
    copyKey: "ziwei-ai",
    category: "premium",
    image: "/fuctionassets/jamipremiun.webp",
    detailRoute: "/services/ziwei",
    launchRoute: "/ziwei-ai",
    accessType: "paid",
    featureKey: "ziwei-ai-consultation",
  },
  {
    slug: "stonehenge-rune",
    copyKey: "stonehenge-rune",
    category: "premium",
    image: "/fuctionassets/rune.webp",
    detailRoute: "/services/stonehenge-rune",
    launchRoute: "/index.html?action=openRuneOracle",
    accessType: "paid",
    featureKey: "stonehengeRunes",
  },
  {
    slug: "animal-totem",
    copyKey: "animal-totem",
    category: "fun",
    image: "/fuctionassets/animaltotem.webp",
    detailRoute: "/services/animal-totem",
    launchRoute: "/index.html?action=openAnimalTotemModal",
    accessType: "paid",
    featureKey: "animal-totem-basic",
  },
]);

function normalizeServiceFeatureLocale(locale?: string | null): ServiceFeatureLocale {
  const normalized = String(locale || "ko").trim().replace("_", "-").toLowerCase();
  if (!normalized || normalized === "ko" || normalized === "kr" || normalized === "ko-kr") return "ko";
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant") return "zh-TW";
  const matched = SERVICE_FEATURE_LOCALES.find((item) => item.toLowerCase() === normalized);
  return matched || "en";
}

function resolveServiceFeatureCopy(copyKey: keyof typeof SERVICE_FEATURE_TRANSLATIONS.ko, locale?: string | null): ServiceFeatureCopy {
  const activeLocale = normalizeServiceFeatureLocale(locale);
  const copy = SERVICE_FEATURE_TRANSLATIONS[activeLocale]?.[copyKey] || SERVICE_FEATURE_TRANSLATIONS.en[copyKey];

  if (!copy && process.env.NODE_ENV !== "production") {
    console.warn("[i18n] Missing service feature copy: " + String(copyKey) + " (" + activeLocale + ")");
  }

  return copy || SERVICE_FEATURE_TRANSLATIONS.en[copyKey];
}

function materializeServiceFeature(feature: ServiceFeatureDefinition, locale?: string | null): ServiceFeature {
  const { copyKey, ...baseFeature } = feature;
  const copy = resolveServiceFeatureCopy(copyKey, locale);

  return withServerPrice({
    ...baseFeature,
    ...copy,
    premiumOptions: copy.premiumOptions ? [...copy.premiumOptions] : [],
  });
}

const FEATURES: ServiceFeature[] = FEATURE_DEFINITIONS.map((feature) => materializeServiceFeature(feature, "ko"));

export const SERVICE_FEATURES: ServiceFeature[] = FEATURES;

export const SERVICE_FEATURE_BY_SLUG: Record<string, ServiceFeature> = Object.freeze(
  FEATURES.reduce<Record<string, ServiceFeature>>((acc, feature) => {
    acc[feature.slug] = feature;
    return acc;
  }, {}),
);

export function listServiceFeatures(locale?: string | null): ServiceFeature[] {
  const activeLocale = normalizeServiceFeatureLocale(locale);
  if (activeLocale === "ko") return SERVICE_FEATURES;
  return FEATURE_DEFINITIONS.map((feature) => materializeServiceFeature(feature, activeLocale));
}

export function listServiceSlugs(): string[] {
  return FEATURE_DEFINITIONS.map((feature) => feature.slug);
}

export function getServiceFeatureBySlug(slug: string, locale?: string | null): ServiceFeature | null {
  const activeLocale = normalizeServiceFeatureLocale(locale);
  if (activeLocale === "ko") return SERVICE_FEATURE_BY_SLUG[slug] || null;
  const matched = FEATURE_DEFINITIONS.find((feature) => feature.slug === slug);
  return matched ? materializeServiceFeature(matched, activeLocale) : null;
}

export function getServiceDetailRouteByLaunchRoute(launchRoute: string): string | null {
  const matched = FEATURE_DEFINITIONS.find((feature) => feature.launchRoute === launchRoute);
  return matched ? matched.detailRoute : null;
}
