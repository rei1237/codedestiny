const HIGH_VALUE_CONTENT_TEXT_TRANSLATIONS = {
  ko: {
    "highValueContent.001": "사주팔자, 만세력, 오행, 십성을 처음 보는 분을 위한 기본 개념입니다.",
    "highValueContent.002": "타로 질문을 정리하고 카드 해석을 현실의 선택지로 연결하는 방법입니다.",
    "highValueContent.003": "연애운, 재회, 궁합을 불안이 아니라 관계 점검의 언어로 읽는 가이드입니다.",
    "highValueContent.004": "하루 운세를 과장 없이 일정, 감정, 선택의 우선순위로 활용하는 방법입니다.",
    "highValueContent.005": "출생차트, 12궁, 별자리 상징을 입문자가 이해하기 쉽게 정리합니다.",
    "highValueContent.006": "운세 콘텐츠를 안전하고 균형 있게 읽기 위한 기준과 면책 고지입니다.",
    "highValueContent.007": "사주팔자 입문 가이드",
    "highValueContent.008": "무료 만세력 사주 분석",
    "highValueContent.009": "사주 만세력 기본 해석",
    "highValueContent.010": "타로 리딩은 어떻게 작동하나요",
    "highValueContent.011": "무료 타로 카드 리딩",
    "highValueContent.012": "재회 타로 리딩",
    "highValueContent.013": "운명 해석을 현실적으로 읽는 법",
    "highValueContent.014": "운세 콘텐츠 방법론",
    "highValueContent.015": "운세 인사이트 가이드",
    "highValueContent.016": "생년월일로 보는 성향 해석",
    "highValueContent.017": "무료 점성술 출생차트",
    "highValueContent.018": "자미두수 12궁 명반",
    "highValueContent.019": "좋은 궁합을 알아보는 핵심 신호",
    "highValueContent.020": "사주 궁합 무료 해석",
    "highValueContent.021": "연애운 무료 보기",
    "highValueContent.022": "운세 서비스를 안전하게 이용하는 FAQ",
    "highValueContent.023": "오늘의 운세 무료 보기",
    "highValueContent.024": "Code Destiny 자주 묻는 질문",
  },
};

function highValueContentText(key) {
  return HIGH_VALUE_CONTENT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
export const HIGH_VALUE_CATEGORIES = [
  {
    slug: "saju-beginner",
    name: "사주 입문",
    description: highValueContentText("highValueContent.001"),
  },
  {
    slug: "tarot-reading",
    name: "타로 리딩",
    description: highValueContentText("highValueContent.002"),
  },
  {
    slug: "compatibility-relationship",
    name: "궁합과 관계",
    description: highValueContentText("highValueContent.003"),
  },
  {
    slug: "daily-fortune",
    name: "오늘의 운세",
    description: highValueContentText("highValueContent.004"),
  },
  {
    slug: "astrology-ziwei",
    name: "점성술과 자미두수",
    description: highValueContentText("highValueContent.005"),
  },
  {
    slug: "methodology",
    name: "운세 콘텐츠 방법론",
    description: highValueContentText("highValueContent.006"),
  },
];

export const HIGH_VALUE_PAGES = [
  {
    slug: "complete-guide-to-saju",
    title: highValueContentText("highValueContent.007"),
    category: "사주 입문",
    categorySlug: "saju-beginner",
    summary: "만세력 위에 세워진 네 기둥과 오행, 십성, 대운의 흐름을 차례로 살피며 사주의 첫 결을 정돈합니다.",
    publishedAt: "2026-04-13",
    updatedAt: "2026-06-14",
    author: "Code Destiny 편집팀",
    disclaimer: "사주 해석은 마음의 흐름을 비추는 참고 자료에 머무릅니다. 건강, 법률, 재무처럼 중요한 현실 결정은 해당 분야 전문가의 조언과 함께 살펴야 합니다.",
    serviceLinks: [
      { href: "/manse", label: highValueContentText("highValueContent.008") },
      { href: "/saju/basic", label: highValueContentText("highValueContent.009") },
    ],
    faq: [
      {
        question: "사주팔자는 어디서부터 보면 좋나요?",
        answer: "연월일시 네 기둥을 먼저 세우고 오행의 분포, 일간, 십성, 대운을 차례로 살피면 흐름이 또렷하게 드러납니다.",
      },
      {
        question: "오행이 부족하면 무조건 나쁜가요?",
        answer: "부족함만으로 길흉이 정해지지는 않습니다. 계절의 기운, 글자의 조합, 생활의 환경을 함께 보아야 균형이 보입니다.",
      },
      {
        question: "만세력 결과는 매번 같아야 하나요?",
        answer: "생년월일시와 달력 기준이 같다면 명식의 뼈대는 같습니다. 다만 어떤 질문을 품고 보느냐에 따라 읽히는 장면은 달라질 수 있습니다.",
      },
    ],
    sections: [
      {
        h2: "사주는 먼저 네 기둥의 흐름을 살핍니다",
        paragraphs: [
          "사주팔자는 태어난 연, 월, 일, 시를 네 기둥으로 세우고 그 안의 천간과 지지를 살피는 흐름입니다. 처음에는 좋고 나쁨을 서두르기보다 어떤 기운이 반복되고 어디에서 비어 있는지가 먼저 드러납니다.",
          "일간은 해석의 중심에 머무르고, 오행은 기질과 에너지의 분포를 비춥니다. 십성은 관계, 일, 책임, 표현 방식처럼 현실에서 자주 마주치는 장면을 읽는 언어가 됩니다.",
        ],
      },
      {
        h2: "해석은 오늘의 선택을 정돈하는 데 머뭅니다",
        paragraphs: [
          "사주를 읽은 뒤에는 오늘 바로 옮길 수 있는 관찰 한 가지를 남겨두는 것이 좋습니다. 이를테면 이번 달에는 감정 소모가 큰 약속을 줄이고 회복 시간을 먼저 확보한다는 식으로 흐름을 생활에 연결합니다.",
          "사주는 결정을 대신하지 않습니다. 다만 선택 앞에서 반복되는 기운과 무리하기 쉬운 지점을 비추어, 스스로의 기준을 조금 더 차분히 세우게 합니다.",
        ],
      },
    ],
  },
  {
    slug: "how-tarot-actually-works",
    title: highValueContentText("highValueContent.010"),
    category: "타로 리딩",
    categorySlug: "tarot-reading",
    summary: "타로를 확정 예언이 아니라 질문을 구조화하고 선택지를 정리하는 상징 리딩으로 이해하는 방법입니다.",
    publishedAt: "2026-04-13",
    updatedAt: "2026-06-14",
    author: "Code Destiny 편집팀",
    disclaimer: "타로 결과는 현재 상황을 돌아보기 위한 참고 자료이며 특정 선택을 강요하지 않습니다.",
    serviceLinks: [
      { href: "/tarot", label: highValueContentText("highValueContent.011") },
      { href: "/tarot/reunion", label: highValueContentText("highValueContent.012") },
    ],
    faq: [
      {
        question: "타로는 미래를 확정하나요?",
        answer: "타로는 고정된 미래보다 현재 질문의 맥락, 반복되는 감정, 가능한 선택지를 읽는 데 적합합니다.",
      },
      {
        question: "좋은 질문은 어떻게 만들 수 있나요?",
        answer: "상대가 어떻게 될까요보다 내가 지금 조정할 수 있는 행동은 무엇인가처럼 주체와 기간이 있는 질문이 좋습니다.",
      },
      {
        question: "같은 질문을 반복해도 되나요?",
        answer: "짧은 간격의 반복 리딩은 불안을 키울 수 있어, 실제 행동이나 상황 변화가 생긴 뒤 다시 보는 편이 좋습니다.",
      },
    ],
    sections: [
      {
        h2: "타로는 상징을 통해 질문을 정리합니다",
        paragraphs: [
          "타로 카드는 질문자가 이미 느끼고 있지만 말로 정리하지 못한 감정과 선택지를 상징으로 드러냅니다. 카드 한 장의 의미보다 질문, 배열, 주변 카드의 관계가 더 중요합니다.",
          "리딩의 목적은 불안을 확인하는 것이 아니라 다음 행동의 기준을 세우는 것입니다. 결과를 읽은 뒤에는 오늘 할 수 있는 작고 구체적인 선택을 하나 정해보는 것이 좋습니다.",
        ],
      },
      {
        h2: "건강한 타로 사용법",
        paragraphs: [
          "불안을 줄이려면 같은 질문을 반복하기보다 질문의 범위를 좁히고 관찰 기간을 정해야 합니다. 일주일, 한 달처럼 기간이 있으면 결과를 현실과 비교하기 쉽습니다.",
          "타로가 강하게 경고하는 듯 보일 때도 결론을 단정하지 말고 리스크를 줄일 행동으로 바꾸어 읽는 것이 안전합니다.",
        ],
      },
    ],
  },
  {
    slug: "understanding-your-destiny",
    title: highValueContentText("highValueContent.013"),
    category: "운세 콘텐츠 방법론",
    categorySlug: "methodology",
    summary: "운명을 고정된 결말이 아니라 반복되는 패턴, 환경, 선택의 상호작용으로 읽는 관점을 설명합니다.",
    publishedAt: "2026-04-13",
    updatedAt: "2026-06-14",
    author: "Code Destiny 편집팀",
    disclaimer: "운세 해석은 자기 이해를 돕는 참고 자료이며 현실의 책임 있는 선택을 대신하지 않습니다.",
    serviceLinks: [
      { href: "/methodology", label: highValueContentText("highValueContent.014") },
      { href: "/high-value", label: highValueContentText("highValueContent.015") },
    ],
    faq: [
      {
        question: "운명은 이미 정해져 있나요?",
        answer: "Code Destiny는 운명을 고정 결말보다 반복되는 성향과 선택 환경의 상호작용으로 설명합니다.",
      },
      {
        question: "운세를 현실에 적용할 때 가장 중요한 점은 무엇인가요?",
        answer: "결과를 단정으로 받아들이지 않고 관찰 포인트와 실행 가능한 선택으로 바꾸는 것입니다.",
      },
      {
        question: "불안할 때 운세를 봐도 괜찮나요?",
        answer: "불안을 키우는 반복 확인은 피하고, 필요한 경우 주변 사람이나 전문가의 도움을 함께 받는 것이 좋습니다.",
      },
    ],
    sections: [
      {
        h2: "운명을 패턴으로 바라보기",
        paragraphs: [
          "운세가 유용해지는 순간은 미래를 맞히는 때가 아니라 반복되는 선택과 감정의 구조를 알아차릴 때입니다. 같은 문제를 반복한다면 환경, 관계, 판단 기준을 함께 살펴야 합니다.",
          "이 관점에서는 운세 결과가 결론이 아니라 질문이 됩니다. 지금 반복되는 장면은 무엇이고, 내가 바꿀 수 있는 조건은 무엇인지 묻는 출발점입니다.",
        ],
      },
      {
        h2: "단정 대신 기록하기",
        paragraphs: [
          "결과를 읽은 뒤 실제 사건과 감정 변화를 기록하면 해석의 과장 여부를 판단하기 쉽습니다. 기록은 불안을 낮추고 현실적인 선택 기준을 만드는 데 도움이 됩니다.",
          "중요한 결정은 운세 하나에 기대지 않고 정보, 상담, 경험, 일정, 비용을 함께 놓고 판단해야 합니다.",
        ],
      },
    ],
  },
  {
    slug: "what-your-birth-date-says-about-you",
    title: highValueContentText("highValueContent.016"),
    category: "점성술과 자미두수",
    categorySlug: "astrology-ziwei",
    summary: "생년월일 기반 해석이 성격을 단정하는 도구가 아니라 성향과 리듬을 살피는 참고 자료임을 설명합니다.",
    publishedAt: "2026-04-13",
    updatedAt: "2026-06-14",
    author: "Code Destiny 편집팀",
    disclaimer: "생년월일 해석은 성격 진단이나 전문 상담을 대체하지 않습니다.",
    serviceLinks: [
      { href: "/astrology", label: highValueContentText("highValueContent.017") },
      { href: "/ziwei", label: highValueContentText("highValueContent.018") },
    ],
    faq: [
      {
        question: "생년월일만으로 성격을 알 수 있나요?",
        answer: "일부 상징적 경향을 참고할 수 있지만 개인의 환경, 경험, 선택을 함께 보아야 합니다.",
      },
      {
        question: "점성술과 자미두수는 같은 체계인가요?",
        answer: "둘 다 출생 정보를 사용하지만 별자리와 궁 배치, 해석 언어가 서로 다릅니다.",
      },
      {
        question: "결과가 나와 맞지 않으면 어떻게 보나요?",
        answer: "맞지 않는 부분은 단정하지 말고 질문의 맥락이나 입력값, 현재 상황을 다시 확인하는 것이 좋습니다.",
      },
    ],
    sections: [
      {
        h2: "출생 정보는 상징적 좌표입니다",
        paragraphs: [
          "생년월일 해석은 한 사람을 한 문장으로 규정하기보다 성향, 리듬, 반복되는 관심사를 살피는 데 도움이 됩니다. 출생차트나 명반은 자기 이해를 위한 지도처럼 사용할 수 있습니다.",
          "중요한 것은 결과가 맞는지 틀리는지만 묻는 것이 아니라 어떤 장면에서 그 설명이 도움이 되는지 확인하는 것입니다.",
        ],
      },
      {
        h2: "현실과 함께 읽기",
        paragraphs: [
          "성향 해석은 생활 패턴, 관계 방식, 일의 리듬과 연결될 때 실용성이 높아집니다. 단점으로 보이는 요소도 환경을 조정하면 강점으로 작동할 수 있습니다.",
          "결과를 읽은 뒤에는 자신의 실제 경험과 비교해 유효한 부분만 남기는 태도가 필요합니다.",
        ],
      },
    ],
  },
  {
    slug: "top-10-signs-of-compatibility",
    title: highValueContentText("highValueContent.019"),
    category: "궁합과 관계",
    categorySlug: "compatibility-relationship",
    summary: "궁합을 점수보다 대화 방식, 갈등 회복, 생활 리듬, 책임 분담의 관점에서 읽는 관계 가이드입니다.",
    publishedAt: "2026-04-13",
    updatedAt: "2026-06-14",
    author: "Code Destiny 편집팀",
    disclaimer: "궁합 결과는 관계를 점검하는 참고 자료이며 상대의 마음이나 행동을 단정하지 않습니다.",
    serviceLinks: [
      { href: "/saju/compatibility", label: highValueContentText("highValueContent.020") },
      { href: "/love", label: highValueContentText("highValueContent.021") },
    ],
    faq: [
      {
        question: "궁합 점수가 낮으면 관계가 어렵나요?",
        answer: "점수만으로 관계를 판단하기보다 갈등을 조율하는 방식과 서로의 기대를 확인하는 것이 중요합니다.",
      },
      {
        question: "좋은 궁합의 핵심은 무엇인가요?",
        answer: "대화의 안전감, 생활 리듬의 조율, 책임 분담, 갈등 뒤 회복 방식이 중요합니다.",
      },
      {
        question: "재회운도 궁합과 함께 볼 수 있나요?",
        answer: "재회운은 감정의 거리와 대화 가능성을 보는 관점이며, 궁합은 관계 운영의 장단점을 보는 관점입니다.",
      },
    ],
    sections: [
      {
        h2: "점수보다 중요한 관계 신호",
        paragraphs: [
          "좋은 궁합은 갈등이 없는 관계가 아니라 갈등 뒤에 다시 대화할 수 있는 관계입니다. 서로의 속도, 책임감, 감정 표현 방식이 조율될 때 관계는 오래 유지됩니다.",
          "사주나 타로의 궁합 결과는 이 조율 포인트를 찾는 참고 자료로 보는 것이 안전합니다.",
        ],
      },
      {
        h2: "관계 해석을 행동으로 바꾸기",
        paragraphs: [
          "결과를 읽은 뒤에는 상대를 단정하기보다 내가 확인해야 할 대화 주제를 정리하는 것이 좋습니다. 예를 들어 연락 빈도, 약속 방식, 갈등 시 휴식 시간 같은 구체적인 항목입니다.",
          "관계의 방향은 상징 해석보다 실제 대화와 선택에 의해 더 크게 달라집니다.",
        ],
      },
    ],
  },
  {
    slug: "common-user-questions-faq",
    title: highValueContentText("highValueContent.022"),
    category: "오늘의 운세",
    categorySlug: "daily-fortune",
    summary: "무료 운세, 오늘의 운세, 개인정보, 결제, 결과 해석에 관한 자주 묻는 질문을 사용자 관점에서 정리합니다.",
    publishedAt: "2026-04-13",
    updatedAt: "2026-06-14",
    author: "Code Destiny 편집팀",
    disclaimer: "운세 서비스 이용 안내는 일반 정보이며 개별 결제나 계정 문제는 고객센터 안내를 따릅니다.",
    serviceLinks: [
      { href: "/today", label: highValueContentText("highValueContent.023") },
      { href: "/faq", label: highValueContentText("highValueContent.024") },
    ],
    faq: [
      {
        question: "오늘의 운세는 매일 달라지나요?",
        answer: "일일 운세는 하루의 흐름을 가볍게 점검하도록 제공되며, 실제 선택과 생활 리듬에 따라 체감은 달라질 수 있습니다.",
      },
      {
        question: "개인화 결과 페이지는 검색에 노출되나요?",
        answer: "개인화 결과, 로그인, 결제, 프로필 페이지는 검색 색인 대상이 아니도록 관리합니다.",
      },
      {
        question: "무료 기능과 유료 리포트는 어떻게 구분되나요?",
        answer: "무료 기능은 즉시 이용 가능한 기본 해석을 제공하고, 유료 리포트는 결제와 권한 확인 뒤 문서형 결과를 제공합니다.",
      },
    ],
    sections: [
      {
        h2: "오늘의 운세를 가볍게 활용하기",
        paragraphs: [
          "오늘의 운세는 하루의 우선순위와 감정 리듬을 점검하는 짧은 참고 자료입니다. 중요한 결정을 운세 하나로 정하기보다 일정, 체력, 주변 상황과 함께 보는 것이 좋습니다.",
          "결과가 좋게 나오면 실행할 수 있는 계획을 하나 정하고, 조심하라는 메시지가 나오면 위험을 줄이는 행동으로 바꾸어 읽어보세요.",
        ],
      },
      {
        h2: "개인정보와 결제 안내",
        paragraphs: [
          "개인 입력값이 필요한 기능은 결과 제공 목적에 맞춰 사용됩니다. 결제나 이용권이 필요한 기능은 권한 확인 뒤 실행되며, 공개 검색 페이지에는 개인 결과가 포함되지 않아야 합니다.",
          "궁금한 정책은 FAQ, 개인정보처리방침, 이용약관에서 함께 확인할 수 있습니다.",
        ],
      },
    ],
  },
];

export function getHighValuePageBySlug(slug) {
  return HIGH_VALUE_PAGES.find((item) => item.slug === String(slug || "")) || null;
}

export function getHighValuePagesByCategory(categorySlug) {
  const slug = String(categorySlug || "").toLowerCase();
  return HIGH_VALUE_PAGES.filter((item) => item.categorySlug === slug);
}

export function getHighValueCategoryBySlug(categorySlug) {
  const slug = String(categorySlug || "").toLowerCase();
  return HIGH_VALUE_CATEGORIES.find((item) => item.slug === slug) || null;
}
