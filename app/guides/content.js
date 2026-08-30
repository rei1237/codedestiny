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
      { href: "/guides", label: highValueContentText("highValueContent.015") },
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
      {
        h2: "해석이 어긋나 보일 때 확인하는 순서",
        paragraphs: [
          "결과가 낯설게 느껴진다면 해석을 의심하기 전에 입력값을 먼저 확인하는 편이 빠릅니다. 음력과 양력을 바꿔 넣었는지, 출생 시각을 기록이 아니라 기억에 의존해 적었는지, 태어난 지역의 표준시가 지금 쓰는 기준과 같은지에 따라 명반이나 출생차트의 일부가 통째로 달라집니다.",
          "입력값이 맞는데도 설명이 겉돈다면 그다음은 체계의 차이를 봅니다. 같은 사람을 두고도 점성술은 행성의 각도로, 자미두수는 열두 궁의 배치로 이야기하기 때문에 강조하는 지점이 다를 수밖에 없습니다. 두 결과가 어긋난다고 해서 한쪽이 틀린 것은 아니며, 지금의 고민을 어느 쪽 언어가 더 잘 설명하는지 고르는 문제에 가깝습니다.",
          "마지막으로 시간 축을 확인합니다. 출생 정보에서 나오는 설명은 평생에 걸친 성향에 가깝고, 오늘의 컨디션이나 이번 달에 벌어진 사건과는 축이 다릅니다. 어제와 오늘이 달라진 이유를 출생차트에서 찾으면 대개 답이 나오지 않습니다.",
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
      {
        h2: "점수가 같아도 관계가 다르게 흘러가는 이유",
        paragraphs: [
          "같은 궁합 점수를 받은 두 커플이 전혀 다른 결말을 맞는 일은 흔합니다. 점수는 여러 항목을 하나의 숫자로 압축한 요약값이라, 어느 항목 덕분에 그 점수가 나왔는지는 알려 주지 않기 때문입니다. 대화가 잘 통해서 나온 점수와 생활 리듬이 잘 맞아서 나온 점수는 흔들리는 지점이 서로 다릅니다.",
          "그래서 총점보다 항목별 편차를 보는 편이 실용적입니다. 여러 신호 가운데 유독 낮은 항목이 하나 있다면 평소에는 문제가 되지 않다가 이사, 이직, 가족 행사처럼 부담이 몰리는 시기에 그 항목부터 무너집니다. 반대로 낮은 항목 없이 전체가 고르게 중간이라면 극적인 순간은 적지만 회복도 빠릅니다.",
          "궁합 해석을 상대를 평가하는 도구로 쓰면 대화가 닫힙니다. 같은 결과를 두고 “너는 이런 사람이라 안 맞는다”고 말하는 것과 “우리는 이 항목에서 자주 어긋나는데 어떻게 하면 좋을까”라고 묻는 것은 완전히 다른 대화입니다. 결과지는 판정문이 아니라 대화의 목차로 쓰일 때 가장 쓸모가 있습니다.",
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
  {
    slug: "how-fusion-fortune-works",
    title: "AI 운세 통합 해석은 어떻게 읽을까",
    category: "운세 콘텐츠 방법론",
    categorySlug: "methodology",
    keywords: ["AI 운세 통합 해석", "초융합 운세 해석 방식", "운세 종합 분석"],
    summary: "사주·자미두수·숙요점·점성술·타로를 한 문장으로 섞지 않고, 공통 신호와 체계별 차이를 비교해 읽는 AI 운세 통합 해석 방법을 안내합니다.",
    publishedAt: "2026-08-04",
    updatedAt: "2026-08-04",
    author: "Code Destiny 편집팀",
    disclaimer: "통합 운세 해석은 자기 이해를 위한 참고 자료이며, 중요한 건강·법률·재무·관계 결정은 현실의 정보와 전문가 조언을 함께 확인해야 합니다.",
    serviceLinks: [
      { href: "/fusion-fortune", label: "초융합 운세 AI 통합 해석" },
      { href: "/methodology", label: "운세 콘텐츠 방법론" },
    ],
    faq: [
      { question: "초융합 운세는 여러 결과를 단순 합산하나요?", answer: "아닙니다. 각 체계가 보는 기준이 다르므로 공통으로 나타나는 흐름과 서로 다른 맥락을 나누어 설명합니다." },
      { question: "AI 운세 통합 해석에 출생시가 꼭 필요한가요?", answer: "사주만으로도 일부 흐름을 볼 수 있지만, 출생시·출생지를 전제로 하는 명반과 차트는 정보가 없을 때 해석 범위를 분명히 제한합니다." },
      { question: "통합 결과는 어떻게 활용하면 좋나요?", answer: "결론으로 받아들이기보다 반복되는 패턴 하나와 현실에서 점검할 행동 하나를 남기는 방식이 좋습니다." },
    ],
    sections: [
      {
        h2: "통합 해석은 같은 말을 반복하는 방식이 아닙니다",
        paragraphs: [
          "사주는 오행과 십성으로 기질과 흐름을, 자미두수는 삶의 영역과 별의 배치로 주제를, 숙요점은 관계의 리듬으로 장면을 읽습니다. 베다 점성술과 서양 점성술, 타로 역시 출발점과 언어가 다릅니다.",
          "그래서 AI 운세 통합 해석은 용어를 억지로 같은 뜻으로 바꾸지 않습니다. 여러 관점에서 반복되는 신호는 핵심 질문으로, 다르게 보이는 부분은 상황과 선택에 따라 달라질 수 있는 맥락으로 정리합니다.",
        ],
      },
      {
        h2: "결과를 현실의 선택으로 연결하는 법",
        paragraphs: [
          "리포트를 읽을 때는 연애, 일, 돈, 마음 중 지금 가장 중요한 질문을 하나 정하는 편이 좋습니다. 같은 해석도 질문이 달라지면 필요한 행동과 확인할 조건이 달라지기 때문입니다.",
          "결과가 조심스럽게 보인다면 불안을 키우는 예언으로 읽지 말고, 일정·대화·지출처럼 조정할 수 있는 항목으로 바꿔 보세요. 통합 해석은 판단을 대신하는 답이 아니라 선택의 우선순위를 정돈하는 도구입니다.",
        ],
      },
    ],
  },
  {
    slug: "saju-and-ziwei-reading",
    title: "사주와 자미두수는 무엇이 다를까",
    category: "점성술과 자미두수",
    categorySlug: "astrology-ziwei",
    keywords: ["사주와 자미두수 차이", "사주 자미두수 함께 보기", "자미두수 명반"],
    summary: "사주의 오행·십성과 자미두수의 12궁·별 배치가 무엇을 다르게 보는지, 두 체계를 함께 읽을 때 질문을 어떻게 정리하면 좋은지 설명합니다.",
    publishedAt: "2026-08-04",
    updatedAt: "2026-08-04",
    author: "Code Destiny 편집팀",
    disclaimer: "사주와 자미두수는 서로 다른 해석 체계입니다. 결과는 성격이나 미래를 확정하지 않으며, 현실의 선택을 점검하는 참고 자료로 활용하세요.",
    serviceLinks: [
      { href: "/saju", label: "사주 흐름 살펴보기" },
      { href: "/ziwei", label: "자미두수 명반 보기" },
      { href: "/fusion-fortune", label: "초융합 운세로 함께 읽기" },
    ],
    faq: [
      { question: "사주와 자미두수는 같은 운세인가요?", answer: "아닙니다. 사주는 간지와 오행의 관계를, 자미두수는 명반의 궁과 별의 배치를 중심으로 읽는 별도 체계입니다." },
      { question: "두 결과가 다르게 느껴지면 무엇을 믿어야 하나요?", answer: "어느 하나를 정답으로 고르기보다 각 결과가 말하는 삶의 영역과 현재 질문을 분리해 확인하는 편이 좋습니다." },
      { question: "자미두수는 출생시가 필요한가요?", answer: "명반의 궁과 별 배치에 출생시가 영향을 줄 수 있으므로, 정보가 불확실하면 해석의 범위를 좁혀야 합니다." },
    ],
    sections: [
      {
        h2: "사주는 기질과 에너지의 흐름을 읽습니다",
        paragraphs: [
          "사주는 태어난 연·월·일·시의 간지와 오행 관계를 바탕으로, 어떤 기질이 쉽게 드러나고 어떤 환경에서 균형이 흔들리는지 살핍니다. 십성은 책임, 표현, 관계, 일의 방식처럼 현실에서 반복되는 장면을 이해하는 언어가 됩니다.",
          "사주를 볼 때는 오행 하나가 많거나 적다는 말만으로 좋고 나쁨을 정하지 않습니다. 계절, 글자의 조합, 생활 환경을 함께 놓고 어떤 선택 습관으로 나타나는지 살피는 것이 중요합니다.",
        ],
      },
      {
        h2: "자미두수는 삶의 영역별 질문을 비춥니다",
        paragraphs: [
          "자미두수는 12궁과 별의 배치를 통해 일, 관계, 재물, 이동처럼 삶의 영역별 주제를 읽습니다. 같은 성향이라도 어느 영역에서 두드러지는지를 살피는 데 도움이 됩니다.",
          "두 체계를 함께 볼 때는 사주가 비추는 기질을 자미두수의 특정 궁과 바로 동일시하지 않는 것이 좋습니다. 대신 지금의 질문에 공통으로 드러나는 패턴이 있는지 확인하면 해석이 더 현실적으로 이어집니다.",
        ],
      },
    ],
  },
  {
    slug: "saju-and-sukuyo-compatibility",
    title: "사주 궁합과 숙요 궁합은 어떻게 다를까",
    category: "궁합과 관계",
    categorySlug: "compatibility-relationship",
    keywords: ["사주 궁합 숙요 궁합 차이", "숙요점 궁합", "사주 궁합 보는 법"],
    summary: "사주 궁합이 기질과 관계 운영 방식을 살피는 방식, 숙요 궁합이 27숙의 관계 리듬을 읽는 방식을 비교해 관계 해석을 현실적으로 활용하는 법을 안내합니다.",
    publishedAt: "2026-08-04",
    updatedAt: "2026-08-04",
    author: "Code Destiny 편집팀",
    disclaimer: "궁합은 상대의 마음이나 관계의 결말을 단정하지 않습니다. 실제 대화, 동의, 안전, 생활 조건을 우선으로 판단하세요.",
    serviceLinks: [
      { href: "/saju/compatibility", label: "사주 궁합 살펴보기" },
      { href: "/sukuyo", label: "숙요점 궁합 보기" },
      { href: "/fusion-fortune", label: "초융합 운세로 관계 흐름 정리" },
    ],
    faq: [
      { question: "사주 궁합과 숙요 궁합 중 무엇이 더 정확한가요?", answer: "두 체계는 보는 기준이 다르므로 우열보다 질문에 맞는 관점을 선택하는 편이 안전합니다." },
      { question: "궁합이 낮으면 관계를 끝내야 하나요?", answer: "아닙니다. 궁합은 갈등 지점과 대화 방식을 점검하는 참고 자료일 뿐, 관계의 결정을 대신하지 않습니다." },
      { question: "숙요점은 무엇을 보는 데 도움이 되나요?", answer: "숙요점은 본명숙과 두 사람의 관계성으로 가까워지는 속도, 거리감, 반복되는 반응을 살피는 관점으로 활용할 수 있습니다." },
    ],
    sections: [
      {
        h2: "사주 궁합은 두 사람의 기질과 운영 방식을 봅니다",
        paragraphs: [
          "사주 궁합은 각자의 오행 분포와 관계에서 드러나는 표현·책임·거리 조절의 경향을 참고합니다. 중요한 것은 누가 좋고 나쁘다는 판정이 아니라, 갈등이 생길 때 어떤 방식으로 반응하고 회복하는지 살피는 일입니다.",
          "서로 다른 기질은 문제만 뜻하지 않습니다. 한 사람이 시작을 잘하고 다른 사람이 마무리를 잘하는 식으로 보완될 수 있으며, 생활 리듬과 기대를 말로 확인할 때 장점이 살아납니다.",
        ],
      },
      {
        h2: "숙요 궁합은 관계의 리듬을 관찰합니다",
        paragraphs: [
          "숙요점은 태어난 날의 27숙을 바탕으로 인연의 거리와 반응 패턴을 읽습니다. 친밀감이 빠르게 생기는지, 간격이 필요한지처럼 관계에서 체감되는 리듬을 돌아보는 데 쓸 수 있습니다.",
          "두 결과를 함께 보더라도 상대의 속마음이나 재회 가능성을 확정하지 않는 것이 중요합니다. 대신 대화할 시점, 서로에게 필요한 공간, 반복되는 오해를 점검하는 질문으로 바꾸면 더 건강한 관계 해석이 됩니다.",
        ],
      },
    ],
  },
  {
    slug: "vedic-and-western-astrology",
    title: "베다 점성술과 서양 점성술의 차이",
    category: "점성술과 자미두수",
    categorySlug: "astrology-ziwei",
    keywords: ["베다 점성술 서양 점성술 차이", "인도 점성술 Jyotish", "베다점성술"],
    summary: "인도 점성술 Jyotish와 서양 점성술이 출생 정보와 행성·차트를 어떻게 다르게 읽는지, 두 체계를 혼동하지 않고 활용하는 기본 기준을 설명합니다.",
    publishedAt: "2026-08-04",
    updatedAt: "2026-08-04",
    author: "Code Destiny 편집팀",
    disclaimer: "점성술 해석은 자기성찰을 위한 상징적 참고 자료입니다. 출생시·출생지 정보가 불확실하면 시간과 위치에 의존하는 해석은 제한될 수 있습니다.",
    serviceLinks: [
      { href: "/vedic", label: "베다 점성술 조티쉬 보기" },
      { href: "/astrology", label: "서양 점성술 출생차트 보기" },
      { href: "/fusion-fortune", label: "초융합 운세로 관점 비교" },
    ],
    faq: [
      { question: "베다 점성술과 서양 점성술은 같은 별자리를 쓰나요?", answer: "둘 다 천체의 위치를 참고하지만 사용하는 기준과 해석 전통이 달라 같은 출생 정보에서도 표현이 달라질 수 있습니다." },
      { question: "Jyotish는 무엇인가요?", answer: "Jyotish는 인도 점성술을 가리키는 말로, 라그나·라시·나크샤트라·다샤 같은 개념을 활용합니다." },
      { question: "두 차트를 같이 보면 더 확실해지나요?", answer: "확실한 예언이 되는 것은 아닙니다. 공통으로 떠오르는 관심사와 각 체계가 달리 보는 맥락을 비교하는 데 의미가 있습니다." },
    ],
    sections: [
      {
        h2: "베다 점성술은 라그나와 다샤의 흐름을 봅니다",
        paragraphs: [
          "베다 점성술, 또는 Jyotish는 출생 시점의 라그나와 라시, 나크샤트라, 행성의 관계를 바탕으로 성향과 시기 흐름을 읽습니다. 다샤는 특정 행성의 주제가 두드러지는 기간을 살피는 데 쓰이는 대표적인 언어입니다.",
          "전문용어가 많아도 한 사람을 고정된 성격으로 규정하는 도구는 아닙니다. 현재의 생활과 관계에서 어떤 주제가 반복되는지 확인하는 방식으로 해석하는 편이 좋습니다.",
        ],
      },
      {
        h2: "서양 점성술은 차트의 상징과 관계를 읽습니다",
        paragraphs: [
          "서양 점성술은 태양, 달, 상승궁과 행성이 하우스·별자리에서 맺는 관계를 통해 성향과 삶의 주제를 살핍니다. 태양 별자리 하나만으로 전부를 판단하기보다 차트 전체의 균형을 보는 것이 일반적입니다.",
          "베다 점성술의 개념을 서양 점성술의 하우스나 별자리와 같은 뜻으로 번역하면 해석이 흐려질 수 있습니다. 각 체계의 언어를 유지한 채, 지금 질문에 도움이 되는 관찰만 남기는 태도가 중요합니다.",
        ],
      },
    ],
  },
  {
    slug: "how-to-read-manse",
    title: "만세력 보는 법: 명식부터 오행까지",
    category: "사주 입문",
    categorySlug: "saju-beginner",
    keywords: ["만세력 보는 법", "무료 만세력", "사주 명식 오행 십성"],
    summary: "만세력에서 연월일시 네 기둥을 확인한 뒤 일간, 오행, 십성, 대운을 어떤 순서로 읽으면 좋은지 초보자를 위해 정리합니다.",
    publishedAt: "2026-08-04",
    updatedAt: "2026-08-04",
    author: "Code Destiny 편집팀",
    disclaimer: "만세력은 출생 정보를 바탕으로 한 상징적 지도입니다. 건강·법률·재무처럼 중요한 판단은 해당 분야의 사실과 전문가 의견을 우선하세요.",
    serviceLinks: [
      { href: "/manse", label: "만세력 사주 분석" },
      { href: "/saju", label: "사주 해석 가이드" },
      { href: "/fusion-fortune", label: "초융합 운세로 흐름 연결" },
    ],
    faq: [
      { question: "만세력에서 가장 먼저 볼 것은 무엇인가요?", answer: "연·월·일·시 네 기둥을 확인한 뒤, 해석의 중심이 되는 일간과 오행의 분포를 차례로 살피는 것이 좋습니다." },
      { question: "오행이 부족하면 나쁜가요?", answer: "부족함만으로 길흉을 정할 수 없습니다. 계절과 글자의 관계, 다른 기운과의 균형, 실제 환경을 함께 봐야 합니다." },
      { question: "출생시를 모르면 만세력을 볼 수 없나요?", answer: "연·월·일 기준의 기본 흐름은 볼 수 있지만, 시주가 필요한 세부 해석은 단정하지 않는 편이 정확합니다." },
    ],
    sections: [
      {
        h2: "명식의 네 기둥을 차분히 확인합니다",
        paragraphs: [
          "만세력은 태어난 연, 월, 일, 시를 네 기둥으로 적은 명식에서 시작합니다. 각 기둥의 천간과 지지는 계절의 기운, 가족·사회 환경, 자기 기질, 시간대의 흐름을 살피는 출발점이 됩니다.",
          "처음부터 길흉을 찾기보다 입력한 양력·음력, 윤달, 출생시가 맞는지 먼저 확인하세요. 기초 정보가 달라지면 명식의 일부가 달라질 수 있으므로 해석보다 입력값 검토가 앞섭니다.",
        ],
      },
      {
        h2: "일간·오행·십성은 생활 장면으로 풀어 읽습니다",
        paragraphs: [
          "일간은 해석의 중심이 되는 기운이고, 오행은 에너지의 분포를 보여주는 하나의 언어입니다. 예를 들어 어떤 기운이 강하다는 말은 특정 성향이 잘 드러날 수 있다는 뜻이지, 그 사람의 가능성을 제한하는 판정이 아닙니다.",
          "십성은 관계, 표현, 책임, 일의 방식처럼 일상에서 체감할 수 있는 장면을 이해하는 데 쓸 수 있습니다. 한 요소만 떼어 보기보다 전체 조합과 실제 경험을 함께 기록하면 만세력을 더 현실적으로 활용할 수 있습니다.",
        ],
      },
    ],
  },
  {
    slug: "ai-fortune-reading-guide",
    title: "AI 운세를 현실적으로 활용하는 법",
    category: "운세 콘텐츠 방법론",
    categorySlug: "methodology",
    keywords: ["AI 운세 활용법", "AI 사주", "AI 상담", "운세 AI"],
    summary: "AI 운세와 AI 상담을 확정적인 답이 아니라 질문을 정리하고 행동을 점검하는 보조 도구로 활용하는 안전하고 현실적인 기준을 안내합니다.",
    publishedAt: "2026-08-04",
    updatedAt: "2026-08-04",
    author: "Code Destiny 편집팀",
    disclaimer: "AI 운세는 의료·정신건강·법률·재무의 전문 조언을 대체하지 않습니다. 위기 상황이나 중요한 결정에서는 신뢰할 수 있는 사람과 전문가의 도움을 먼저 구하세요.",
    serviceLinks: [
      { href: "/fusion-fortune", label: "AI 초융합 운세 보기" },
      { href: "/tarot", label: "타로로 현재 질문 정리" },
      { href: "/methodology", label: "콘텐츠 방법론 확인" },
    ],
    faq: [
      { question: "AI 운세는 미래를 맞히나요?", answer: "AI 운세는 미래를 보장하거나 확정하지 않습니다. 입력 정보와 질문을 바탕으로 해석의 관점을 정리하는 참고 자료로 보는 것이 적절합니다." },
      { question: "AI에게 어떤 질문을 하면 좋은가요?", answer: "상대의 마음을 단정해 달라는 질문보다, 내가 확인할 관계의 신호나 이번 달 조정할 행동처럼 주체와 범위가 분명한 질문이 좋습니다." },
      { question: "결과가 불안하게 느껴지면 어떻게 하나요?", answer: "반복해서 확인하기보다 잠시 거리를 두고, 실제 사실과 감정을 구분해 적어 보세요. 불안이 지속되면 신뢰할 수 있는 사람이나 전문가와 상의하세요." },
    ],
    sections: [
      {
        h2: "좋은 AI 운세 질문은 선택지를 선명하게 합니다",
        paragraphs: [
          "AI 운세는 질문의 범위가 구체적일수록 더 도움이 됩니다. 예를 들어 '올해 잘될까요'보다 '새로운 일을 시작하기 전 내가 점검할 리듬은 무엇일까'처럼 기간과 내가 조정할 수 있는 행동을 포함해 보세요.",
          "사주, 타로, 점성술의 결과도 같은 방식으로 읽을 수 있습니다. 결과가 말하는 상징을 현재의 일정, 관계, 감정과 비교하면 막연한 불안 대신 관찰할 지점이 남습니다.",
        ],
      },
      {
        h2: "결과를 기록하고 현실의 정보와 함께 봅니다",
        paragraphs: [
          "리딩 뒤에는 핵심 문장 하나와 이번 주에 해볼 행동 하나만 기록해 보세요. 시간이 지난 뒤 실제 경험과 비교하면, 내게 유효한 해석과 과장되게 느껴지는 해석을 구분하는 데 도움이 됩니다.",
          "중요한 선택은 AI 운세 하나로 정하지 않습니다. 비용, 건강, 계약, 안전처럼 사실 확인이 필요한 문제는 관련 자료와 전문가 조언을 먼저 놓고, 운세는 자신의 우선순위를 돌아보는 보조 관점으로만 활용하세요.",
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
