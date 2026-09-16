export type DomainId =
  | "saju"
  | "ziwei"
  | "sukuyo"
  | "vedic"
  | "astrology"
  | "tarot";

export type DomainRegistryEntry = {
  domain: DomainId;
  label: string;
  slug: string;
  shortDescription: string;
  seoIntent: string;
  requiredInput: string;
  availableProducts: string[];
  freeEntry: {
    href: string;
    label: string;
  };
  paidEntry: {
    href: string;
    label: string;
    starterProductId: string;
  };
};

const singleProducts = (domain: DomainId) =>
  ["mackerel", "salmon", "flounder", "tuna"].map((fish) => `${domain}_${fish}`);

export const domainRegistry = {
  saju: {
    domain: "saju",
    label: "사주",
    slug: "saju",
    shortDescription:
      "생년월일과 태어난 시간에 담긴 기질, 관계, 일과 재물의 반복 패턴을 차분하게 풀어봅니다.",
    seoIntent:
      "사주 잘보는 사이트를 찾는 방문자가 과장된 단정 대신 이해 가능한 해석과 현실적인 조언을 확인하도록 돕습니다.",
    requiredInput: "생년월일, 태어난 시간, 성별, 태어난 지역",
    availableProducts: singleProducts("saju"),
    freeEntry: { href: "/yeongnyangi/free-fortune/?category=saju", label: "무료 사주 흐름 보기" },
    paidEntry: {
      href: "/yeongnyangi/fortune/?domain=saju&fish=mackerel",
      label: "단건 사주 상담 시작하기",
      starterProductId: "saju_mackerel",
    },
  },
  sukuyo: {
    domain: "sukuyo",
    label: "숙요점",
    slug: "sukuyo",
    shortDescription:
      "27숙의 관계 흐름으로 나와 상대의 거리, 끌림, 오래 맞춰갈 방법을 살펴봅니다.",
    seoIntent:
      "숙요점과 숙요 궁합을 처음 접한 방문자에게 관계 유형을 쉽게 설명하고 실제 상담 진입점을 제공합니다.",
    requiredInput: "본인 생년월일, 궁합은 상대 생년월일",
    availableProducts: singleProducts("sukuyo"),
    freeEntry: { href: "/yeongnyangi/free-fortune/?category=sukuyo", label: "무료 숙요 흐름 보기" },
    paidEntry: {
      href: "/yeongnyangi/fortune/?domain=sukuyo&fish=mackerel",
      label: "단건 숙요 상담 시작하기",
      starterProductId: "sukuyo_mackerel",
    },
  },
  ziwei: {
    domain: "ziwei",
    label: "자미두수",
    slug: "ziwei",
    shortDescription:
      "명궁과 열두 궁의 배치를 통해 삶의 중심, 일, 재물, 관계의 흐름을 입체적으로 읽습니다.",
    seoIntent:
      "자미두수 잘보는 사이트를 찾는 방문자가 명반 기반 해석의 구조와 상담 범위를 이해하도록 돕습니다.",
    requiredInput: "생년월일, 태어난 시간, 성별",
    availableProducts: singleProducts("ziwei"),
    freeEntry: { href: "/yeongnyangi/free-fortune/?category=ziwei", label: "무료 자미두수 흐름 보기" },
    paidEntry: {
      href: "/yeongnyangi/fortune/?domain=ziwei&fish=mackerel",
      label: "단건 자미두수 상담 시작하기",
      starterProductId: "ziwei_mackerel",
    },
  },
  vedic: {
    domain: "vedic",
    label: "베다점",
    slug: "vedic",
    shortDescription:
      "라그나, 라시, 나크샤트라와 시기 흐름을 바탕으로 마음의 결을 읽는 인도 점성술입니다.",
    seoIntent:
      "베다점과 베다 점성술을 검색한 방문자에게 서양 점성술과 다른 기준을 분명히 설명합니다.",
    requiredInput: "생년월일, 태어난 시간, 태어난 지역",
    availableProducts: singleProducts("vedic"),
    freeEntry: { href: "/yeongnyangi/free-fortune/?category=vedic", label: "무료 베다점 흐름 보기" },
    paidEntry: {
      href: "/yeongnyangi/fortune/?domain=vedic&fish=mackerel",
      label: "단건 베다점 상담 시작하기",
      starterProductId: "vedic_mackerel",
    },
  },
  astrology: {
    domain: "astrology",
    label: "점성술",
    slug: "astrology",
    shortDescription:
      "태양, 달, 상승점과 행성의 배치를 연결해 성격과 관계, 일의 방향을 살펴봅니다.",
    seoIntent:
      "점성술 잘보는 사이트를 찾는 방문자가 별자리 하나를 넘어 차트 기반 해석을 경험하도록 안내합니다.",
    requiredInput: "생년월일, 태어난 시간, 태어난 지역",
    availableProducts: singleProducts("astrology"),
    freeEntry: {
      href: "/yeongnyangi/free-fortune/?category=astrology",
      label: "무료 점성술 흐름 보기",
    },
    paidEntry: {
      href: "/yeongnyangi/fortune/?domain=astrology&fish=mackerel",
      label: "단건 점성술 상담 시작하기",
      starterProductId: "astrology_mackerel",
    },
  },
  tarot: {
    domain: "tarot",
    label: "타로",
    slug: "tarot",
    shortDescription:
      "카드 상징으로 지금의 감정, 선택지, 관계의 간격을 이야기처럼 풀어봅니다.",
    seoIntent:
      "출생 정보 없이 바로 질문하고 싶은 방문자에게 불안을 키우지 않는 타로 상담을 제공합니다.",
    requiredInput: "상담 질문",
    availableProducts: singleProducts("tarot"),
    freeEntry: { href: "/yeongnyangi/free-fortune/?category=tarot", label: "무료 타로 흐름 보기" },
    paidEntry: {
      href: "/yeongnyangi/fortune/?domain=tarot&fish=mackerel",
      label: "단건 타로 상담 시작하기",
      starterProductId: "tarot_mackerel",
    },
  },
} as const satisfies Record<DomainId, DomainRegistryEntry>;

export const domainEntries = Object.values(domainRegistry);
