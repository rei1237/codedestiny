function buildLongBody(topic, keyword, angle) {
  return [
    `${topic}을 검색하는 사용자는 단순 정의보다 실제로 어떻게 읽고 활용할 수 있는지를 원합니다. ${keyword}의 핵심은 결과를 맹신하는 것이 아니라 반복되는 패턴을 구조적으로 이해해 선택의 질을 높이는 데 있습니다. Code Destiny는 사주·타로·자미두수·점성술 데이터를 연결해 같은 질문을 여러 관점에서 검증할 수 있도록 설계했습니다.`,
    `${angle} 관점에서 보면 가장 중요한 것은 순서입니다. 먼저 현재 질문을 기간과 영역으로 구체화하고, 다음으로 해석 결과에서 공통 신호를 추출한 뒤, 마지막으로 오늘 실행할 행동 한 줄을 남겨야 합니다. 이 순서를 지키면 운세 콘텐츠가 막연한 예언이 아니라 의사결정 도구로 작동합니다.`,
    `실전 적용에서는 과장 표현을 배제해야 합니다. 운세 결과는 100% 확정 답안이 아니며, 의료·법률·투자 판단을 대체할 수 없습니다. 대신 사용자에게 필요한 것은 리스크를 줄이는 체크리스트와 우선순위 재정렬입니다. ${topic} 콘텐츠가 품질을 갖추려면 개념 설명, 사례, 실행 루틴, 면책 고지가 함께 있어야 합니다.`,
    `SEO 관점에서도 ${keyword}는 희소 키워드와 결합될 때 경쟁력이 커집니다. 단일 키워드 반복보다 연관 질의(초보자 질문, 비교 질문, 적용 질문)를 함께 다루면 검색 의도를 넓게 포착할 수 있습니다. Code Destiny는 랜딩 페이지와 인사이트를 연결해 사용자가 검색 후 즉시 기능 체험으로 이동하도록 내부링크 구조를 강화했습니다.`,
  ].join(" ");
}

function createSections(topic, keyword, angle, ctaTitle) {
  return [
    {
      heading: `${topic} 핵심 개념 정리`,
      body: buildLongBody(topic, keyword, angle),
    },
    {
      heading: `${topic}를 실제로 읽는 순서`,
      body: `${keyword}를 처음 보는 사용자라면 1) 질문 구체화 2) 핵심 지표 확인 3) 비교 해석 4) 실행 계획 작성 순서로 접근해야 합니다. 먼저 질문을 "언제/어디서/무엇을" 구조로 바꾸면 해석 정확도가 높아집니다. 그다음 결과에서 반복되는 단어를 모아 공통 신호를 찾고, 마지막으로 오늘 실행할 행동을 한 줄로 기록하세요. 이 방식은 초보자도 재현 가능하고, 한 달 뒤 복기할 때도 데이터가 남습니다.`,
    },
    {
      heading: `${topic} 초보자 체크리스트`,
      body: `초보자 체크리스트는 간단할수록 지속됩니다. 첫째, 입력 정보 정확도(생년월일시, 기준 시간대)를 확인합니다. 둘째, 결과를 길흉으로 단정하지 않고 "강점/주의/보완"으로 구분합니다. 셋째, 같은 질문을 짧은 시간에 반복하지 않고 최소 3일 간격으로 복기합니다. 넷째, 결과를 타인에게 강요하지 않습니다. 다섯째, 중요한 결정은 전문가 자문을 함께 사용합니다.`,
    },
    {
      heading: `${topic} 고급 해석 포인트`,
      body: `고급 사용자는 단일 도구보다 교차 해석을 사용합니다. ${topic} 결과를 사주/타로/점성술과 비교하면 공통으로 강조되는 영역이 보입니다. 공통 신호가 2회 이상 반복되면 그 영역을 이번 달 우선 과제로 설정합니다. 반대로 서로 상충하는 결과가 나오면 환경 변수(피로, 관계, 일정 압박)를 먼저 점검하고 해석을 보수적으로 적용해야 합니다.`,
    },
    {
      heading: `${topic} 활용 시 주의사항`,
      body: `운세 콘텐츠는 자기이해와 선택 정리를 위한 참고 정보입니다. 법률·의료·투자 판단은 반드시 해당 분야 전문가와 상담해야 합니다. 불안 유발형 문구, 확정 예언형 문구, 관계 단절을 조장하는 문구는 피해야 하며, 결과를 생활 루틴 개선에 연결하는 방식이 가장 안전합니다.`,
    },
    {
      heading: `${ctaTitle}로 바로 연결하기`,
      body: `이론을 이해했다면 실제 기능에서 확인해 보세요. 검색 의도는 결국 실행으로 이어질 때 충족됩니다. Code Destiny의 인사이트 허브에서는 무료 기능으로 빠르게 테스트하고, 필요 시 프리미엄 리포트로 장기 계획을 확장할 수 있습니다.`,
    },
  ];
}

function routeByCategory(category) {
  if (category === "자미두수") return "/ziwei/chart";
  if (category === "숙요점") return "/sukuyo/compatibility";
  if (category === "사주") return "/saju";
  if (category === "타로") return "/tarot";
  if (category === "점성술") return "/astrology";
  if (category === "베다점성술") return "/vedic";
  return "/insights";
}

function buildInternalLinks(category) {
  if (category === "자미두수") {
    return [
      { href: "/ziwei", label: "자미두수 무료 명반 보기" },
      { href: "/ziwei/chart", label: "자미두수 12궁 분석하기" },
      { href: "/premium", label: "자미두수 프리미엄 PDF 보기" },
        { href: "/premium", label: "자미두수 프리미엄 리포트 보기" },
        article({ slug: "ziwei-wealth-career", title: "자미두수 재물운과 직업운: 재백궁·관록궁 보는 법", description: "재백궁과 관록궁을 중심으로 재물·직업 흐름을 읽습니다.", category: "자미두수", keywords: ["자미두수 재물운", "자미두수 직업운", "재백궁", "관록궁"], topic: "재백궁·관록궁", angle: "커리어와 수입", ctaTitle: "자미두수 프리미엄 리포트 보기" }),
      { href: "/saju", label: "사주와 함께 비교 분석하기" },
      { href: "/insights/ziwei", label: "자미두수 인사이트 허브 더 보기" },
    ];
  }

  if (category === "숙요점") {
    return [
      { href: "/sukuyo", label: "숙요점 27숙 관계 해석 보기" },
      { href: "/sukuyo/compatibility", label: "숙요점 궁합 바로 보기" },
      { href: "/compatibility", label: "사주 궁합과 함께 비교 분석하기" },
      { href: "/daily-fortune", label: "오늘의 운세 흐름 확인하기" },
      { href: "/insights/sukuyo", label: "숙요점 인사이트 허브 더 보기" },
    ];
  }

  if (category === "사주") {
    return [
      { href: "/saju", label: "무료 사주풀이 시작하기" },
      { href: "/manse", label: "꿀꿀 만세력으로 명식 확인하기" },
      { href: "/compatibility", label: "사주 궁합 분석하기" },
      { href: "/daily-fortune", label: "오늘의 운세 확인하기" },
      { href: "/insights/saju", label: "사주 인사이트 허브 더 보기" },
    ];
  }

  if (category === "타로") {
    return [
      { href: "/tarot", label: "무료 타로 리딩 시작하기" },
      { href: "/tarot/love", label: "연애운 타로 보기" },
      { href: "/tarot/reunion", label: "재회운 타로 해석하기" },
      { href: "/saju", label: "사주 연애운과 함께 비교하기" },
      { href: "/insights/tarot", label: "타로 인사이트 허브 더 보기" },
    ];
  }

  if (category === "점성술") {
    return [
      { href: "/astrology", label: "점성술 출생 차트 보기" },
      { href: "/vedic", label: "베다점성술 라그나 차트 보기" },
      { href: "/ziwei", label: "자미두수 명반과 교차 해석하기" },
      { href: "/saju", label: "사주와 함께 비교 분석하기" },
      { href: "/insights/astrology", label: "점성술 인사이트 허브 더 보기" },
    ];
  }

  if (category === "베다점성술") {
    return [
      { href: "/vedic", label: "베다점성술 차트 보기" },
      { href: "/astrology", label: "서양 점성술 차트와 비교하기" },
      { href: "/ziwei", label: "자미두수 명반과 함께 읽기" },
      { href: "/premium", label: "심화 프리미엄 리포트 보기" },
      { href: "/insights/vedic", label: "베다점성술 인사이트 허브 더 보기" },
    ];
  }

  return [{ href: "/insights", label: "운세 인사이트 허브 보기" }];
}

function buildFaq(topic, keyword) {
  return [
    {
      question: `${topic}을 처음 시작할 때 가장 먼저 무엇을 보면 좋나요?`,
      answer:
        `${keyword}의 핵심 지표를 먼저 확인하고, 결과를 강점·주의·보완 항목으로 나눠 읽으면 초보자도 빠르게 이해할 수 있습니다.`,
    },
    {
      question: `${topic} 결과를 얼마나 자주 확인해야 하나요?`,
      answer:
        "같은 질문을 짧은 간격으로 반복하기보다 일정 간격으로 복기하면서 생활 데이터와 함께 해석하는 것이 더 정확합니다.",
    },
    {
      question: `${topic} 해석을 일상에서 어떻게 활용하면 좋나요?`,
      answer:
        "결과를 확정 예언으로 보지 말고 일정, 관계, 우선순위 조정에 쓰는 체크리스트로 활용하면 실질적인 도움이 됩니다.",
    },
    {
      question: `${topic} 결과가 불안하게 느껴질 때는 어떻게 해야 하나요?`,
      answer:
        "불안을 키우는 해석보다 현재 내가 조정할 수 있는 행동 1~2개로 축소해 적용하고, 중요한 의사결정은 전문가 자문을 병행하세요.",
    },
    {
      question: `${topic}은 의료·법률·투자 결정을 대신할 수 있나요?`,
      answer:
        "아니요. 운세 콘텐츠는 자기이해와 선택 정리를 돕는 참고 정보이며, 의료·법률·투자 판단은 각 분야 전문가 자문이 우선입니다.",
    },
  ];
}

function article({ slug, title, description, category, keywords, topic, angle, ctaTitle }) {
  const targetRoute = routeByCategory(category);
  const internalLinks = buildInternalLinks(category);

  return {
    slug,
    title,
    description,
    category,
    mainKeyword: keywords[0] || topic,
    relatedKeywords: keywords.slice(1),
    searchIntent: `${topic} 개념을 이해하고 실제 서비스 기능으로 바로 연결하려는 탐색 의도`,
    targetRoute,
    pageType: "insight",
    intro: `${topic} 핵심 개념을 빠르게 이해하고 바로 실행으로 연결할 수 있도록 만든 실전형 가이드입니다.`,
    updatedAt: "2026-05-10",
    publishedAt: "2026-05-10",
    author: "Code Destiny Editorial Team",
    readingTime: 8,
    heroImage: "https://code-destiny.com/og/code-destiny-og.png",
    keywords,
    sections: createSections(topic, keywords[0] || topic, angle, ctaTitle),
    faq: buildFaq(topic, keywords[0] || topic),
    internalLinks,
    ctaServiceRoute: targetRoute,
    cta: {
      title: ctaTitle,
      links: internalLinks,
    },
  };
}

const ZIWEI = [
  article({ slug: "ziwei-what-is", title: "자미두수란? 사주와 다른 12궁 운명 분석법", description: "자미두수의 기본 구조와 사주와의 차이를 초보자 관점에서 설명합니다.", category: "자미두수", keywords: ["자미두수란", "자미두수", "자미두수 보는 법"], topic: "자미두수", angle: "12궁 구조", ctaTitle: "자미두수 무료 명반 보기" }),
  article({ slug: "ziwei-chart-guide", title: "자미두수 명반 보는 법: 명궁부터 12궁까지 초보자 가이드", description: "자미두수 명반에서 명궁과 12궁을 읽는 순서를 제공합니다.", category: "자미두수", keywords: ["자미두수 명반", "자미두수 보는 법", "자미두수 12궁"], topic: "자미두수 명반", angle: "명궁·궁위 해석", ctaTitle: "자미두수 12궁 분석하기" }),
  article({ slug: "ziwei-life-palaces", title: "자미두수 12궁 해석: 명궁·재백궁·관록궁·부처궁 의미", description: "12궁 핵심 궁위를 관계·재물·직업 관점에서 정리합니다.", category: "자미두수", keywords: ["자미두수 12궁", "명궁", "재백궁", "관록궁", "부처궁"], topic: "자미두수 12궁", angle: "궁위별 기능", ctaTitle: "자미두수 무료 명반 보기" }),
  article({ slug: "ziwei-minggong", title: "자미두수 명궁 해석: 내 인생의 주인공 캐릭터", description: "명궁 해석의 기준과 실제 적용 순서를 안내합니다.", category: "자미두수", keywords: ["자미두수 명궁", "명궁 해석"], topic: "명궁 해석", angle: "자기 정체성", ctaTitle: "자미두수 12궁 분석하기" }),
  article({ slug: "ziwei-wealth-career", title: "자미두수 재물운과 직업운: 재백궁·관록궁 보는 법", description: "재백궁과 관록궁을 중심으로 재물·직업 흐름을 읽습니다.", category: "자미두수", keywords: ["자미두수 재물운", "자미두수 직업운", "재백궁", "관록궁"], topic: "재백궁·관록궁", angle: "커리어와 수입", ctaTitle: "자미두수 프리미엄 PDF 보기" }),
  article({ slug: "ziwei-love-compatibility", title: "자미두수 궁합 보는 법: 부처궁과 관계 패턴 해석", description: "부처궁 기반 자미두수 궁합 해석의 핵심을 설명합니다.", category: "자미두수", keywords: ["자미두수 궁합", "자미두수 연애운", "부처궁"], topic: "자미두수 궁합", angle: "관계 리듬", ctaTitle: "사주와 함께 비교 분석하기" }),
  article({ slug: "ziwei-sihua", title: "자미두수 사화 해석: 화록·화권·화과·화기의 의미", description: "사화의 의미와 적용법을 실제 해석 흐름으로 설명합니다.", category: "자미두수", keywords: ["자미두수 사화", "화록", "화권", "화과", "화기"], topic: "사화", angle: "에너지 이동", ctaTitle: "자미두수 무료 명반 보기" }),
  article({ slug: "ziwei-star-brightness", title: "자미두수 별의 세기: 묘·왕·리·평·함 해석법", description: "묘왕리평함의 실전 해석법과 주의사항을 다룹니다.", category: "자미두수", keywords: ["자미두수 묘왕리평함", "자미두수 별 세기"], topic: "별의 세기", angle: "강약 판단", ctaTitle: "자미두수 프리미엄 PDF 보기" }),
    article({ slug: "ziwei-star-brightness", title: "자미두수 별의 세기: 묘·왕·리·평·함 해석법", description: "묘왕리평함의 실전 해석법과 주의사항을 다룹니다.", category: "자미두수", keywords: ["자미두수 묘왕리평함", "자미두수 별 세기"], topic: "별의 세기", angle: "강약 판단", ctaTitle: "자미두수 프리미엄 리포트 보기" }),
  article({ slug: "ziwei-career-palace-action", title: "자미두수 관록궁 실전: 직업 전환 타이밍 체크리스트", description: "관록궁 신호로 직업 전환 시점을 점검하는 실전 글입니다.", category: "자미두수", keywords: ["자미두수 관록궁", "자미두수 직업운", "직업 전환"], topic: "관록궁", angle: "커리어 전략", ctaTitle: "자미두수 12궁 분석하기" }),
  article({ slug: "ziwei-vs-saju", title: "자미두수와 사주의 차이: 무엇을 언제 함께 봐야 할까", description: "자미두수와 사주의 차이와 병행 사용 전략을 정리합니다.", category: "자미두수", keywords: ["자미두수와 사주의 차이", "자미두수", "사주"], topic: "자미두수 vs 사주", angle: "교차 해석", ctaTitle: "사주와 함께 비교 분석하기" }),
];

const SUKUYO = [
  article({ slug: "sukuyo-what-is", title: "숙요점이란? 27숙으로 보는 관계와 궁합의 흐름", description: "숙요점 기본 개념과 27숙 관계 해석 구조를 설명합니다.", category: "숙요점", keywords: ["숙요점", "숙요점이란", "27숙"], topic: "숙요점", angle: "27숙 관계 구조", ctaTitle: "숙요점 궁합 바로 보기" }),
  article({ slug: "sukuyo-compatibility-guide", title: "숙요점 궁합 보는 법: 영친·업태·안괴 관계 총정리", description: "숙요점 궁합 핵심 관계 유형을 정리합니다.", category: "숙요점", keywords: ["숙요점 궁합", "숙요 궁합", "영친관계", "업태관계", "안괴관계"], topic: "숙요점 궁합", angle: "관계 유형", ctaTitle: "숙요점 궁합 바로 보기" }),
  article({ slug: "sukuyo-27-mansions", title: "27숙 전체 해석: 본명숙으로 보는 나의 관계 본능", description: "27숙 전체 해석 접근법과 본명숙 활용법을 안내합니다.", category: "숙요점", keywords: ["27숙", "본명숙", "숙요점 27숙"], topic: "27숙", angle: "본명숙 해석", ctaTitle: "숙요점 궁합 바로 보기" }),
  article({ slug: "sukuyo-eishin", title: "영친관계란? 숙요점에서 가장 끌리는 인연의 구조", description: "영친관계의 장점과 리스크를 균형 있게 설명합니다.", category: "숙요점", keywords: ["영친관계", "숙요점 영친", "영친 궁합"], topic: "영친관계", angle: "끌림과 안정", ctaTitle: "숙요점 궁합 바로 보기" }),
  article({ slug: "sukuyo-antai", title: "업태관계란? 숙요점에서 반복되는 인연과 성장의 관계", description: "업태관계 해석을 실제 소통 전략으로 변환합니다.", category: "숙요점", keywords: ["업태관계", "숙요점 업태", "업태 궁합"], topic: "업태관계", angle: "반복 학습", ctaTitle: "숙요점 궁합 바로 보기" }),
  article({ slug: "sukuyo-ankai", title: "안괴관계란? 강한 끌림과 충돌이 함께 오는 숙요 궁합", description: "안괴관계의 강한 인력과 갈등 관리 포인트를 설명합니다.", category: "숙요점", keywords: ["안괴관계", "숙요점 안괴", "안괴 궁합"], topic: "안괴관계", angle: "끌림과 충돌", ctaTitle: "숙요점 궁합 바로 보기" }),
  article({ slug: "sukuyo-love", title: "숙요점 연애 궁합: 오래 가는 관계와 조심해야 할 관계", description: "연애 관점에서 숙요 궁합을 해석하는 실전 글입니다.", category: "숙요점", keywords: ["숙요점 연애", "숙요점 궁합", "숙요 궁합"], topic: "숙요 연애", angle: "연애 운영", ctaTitle: "숙요점 궁합 바로 보기" }),
  article({ slug: "sukuyo-marriage", title: "숙요점 결혼 궁합: 안정적인 관계를 보는 27숙 해석", description: "결혼 관점에서 보는 숙요점 궁합 체크리스트를 제공합니다.", category: "숙요점", keywords: ["숙요점 결혼", "숙요점 궁합", "27숙 궁합"], topic: "숙요 결혼", angle: "장기 안정성", ctaTitle: "숙요점 궁합 바로 보기" }),
  article({ slug: "sukuyo-bonmyeongsuk-vs-wolmyeongsuk", title: "본명숙과 월명숙 차이: 숙요점 해석에서 무엇이 더 중요할까", description: "본명숙/월명숙 차이와 사용 시점을 설명합니다.", category: "숙요점", keywords: ["본명숙", "월명숙", "숙요점"], topic: "본명숙과 월명숙", angle: "해석 우선순위", ctaTitle: "숙요점 궁합 바로 보기" }),
  article({ slug: "sukuyo-vs-saju-compatibility", title: "숙요점과 사주 궁합의 차이: 관계를 더 입체적으로 보는 법", description: "숙요점 궁합과 사주 궁합의 차이를 비교 분석합니다.", category: "숙요점", keywords: ["숙요점과 사주 궁합의 차이", "숙요점 궁합", "사주 궁합"], topic: "숙요 vs 사주", angle: "비교 해석", ctaTitle: "사주와 함께 비교 분석하기" }),
];

const SAJU = [
  article({ slug: "saju-free-guide", title: "무료 사주풀이 보는 법: 초보자 7단계 실행 가이드", description: "무료 사주 결과를 읽는 순서를 정리한 실전 가이드입니다.", category: "사주", keywords: ["무료 사주풀이", "사주 보는 법", "사주"], topic: "무료 사주", angle: "초보 실행", ctaTitle: "무료 사주풀이 시작하기" }),
  article({ slug: "manseoryeok-what-is", title: "만세력이란? 생년월일시로 사주를 읽는 데이터 지도", description: "만세력의 구조와 실전 입력 체크포인트를 설명합니다.", category: "사주", keywords: ["만세력이란", "만세력", "사주"], topic: "만세력", angle: "데이터 구조", ctaTitle: "무료 사주풀이 시작하기" }),
  article({ slug: "day-master-personality-guide", title: "일간으로 보는 성격: 갑을병정무기경신임계 해석 기초", description: "일간 기반 성격 해석의 핵심 흐름을 정리합니다.", category: "사주", keywords: ["일간", "사주 성격", "사주"], topic: "일간", angle: "성격 패턴", ctaTitle: "무료 사주풀이 시작하기" }),
  article({ slug: "ten-gods-career-relationship", title: "십성으로 보는 관계와 직업: 비겁·식상·재성·관성·인성", description: "십성 해석을 관계·직업 의사결정에 적용합니다.", category: "사주", keywords: ["십성", "관계", "직업운", "사주"], topic: "십성", angle: "역할 분류", ctaTitle: "무료 사주풀이 시작하기" }),
  article({ slug: "five-elements-balance-practical", title: "오행 균형 보는 법: 목화토금수 실전 보완 루틴", description: "오행 과부족을 생활 루틴으로 보완하는 방법을 제공합니다.", category: "사주", keywords: ["오행 균형", "목화토금수", "사주"], topic: "오행 균형", angle: "생활 보완", ctaTitle: "무료 사주풀이 시작하기" }),
  article({ slug: "daewoon-vs-sewoon", title: "대운과 세운 차이: 10년 흐름과 연간 흐름을 함께 읽는 법", description: "대운·세운 차이를 실전 일정 계획으로 연결합니다.", category: "사주", keywords: ["대운", "세운", "사주"], topic: "대운과 세운", angle: "시기 해석", ctaTitle: "무료 사주풀이 시작하기" }),
  article({ slug: "saju-compatibility-how-to", title: "사주 궁합 보는 법: 오행·일주·관계 리듬 해석", description: "사주 궁합을 점수보다 관계 운영 기준으로 읽는 법을 안내합니다.", category: "사주", keywords: ["사주 궁합", "궁합 보는 법", "연애운"], topic: "사주 궁합", angle: "관계 운영", ctaTitle: "사주와 함께 비교 분석하기" }),
  article({ slug: "new-year-fortune-framework", title: "신년운세 보는 법: 연간 목표와 월간 실행을 연결하는 프레임", description: "신년운세를 계획 수립 도구로 활용하는 방법을 설명합니다.", category: "사주", keywords: ["신년운세", "연간운세", "사주"], topic: "신년운세", angle: "연간 계획", ctaTitle: "오늘의 운세 확인하기" }),
];

const TAROT = [
  article({ slug: "tarot-how-to-read", title: "타로 카드 보는 법: 초보자를 위한 질문-해석-행동 프레임", description: "타로 카드 리딩의 기본 구조를 실전 중심으로 안내합니다.", category: "타로", keywords: ["타로 카드 보는 법", "타로", "무료 타로"], topic: "타로 리딩", angle: "질문 설계", ctaTitle: "연애운 타로 보기" }),
  article({ slug: "tarot-love-question-design", title: "연애 타로 질문법: 모호한 질문을 정확한 해석으로 바꾸는 법", description: "연애 타로 질문 품질을 높이는 프레임을 제공합니다.", category: "타로", keywords: ["연애 타로", "타로 질문법", "타로"], topic: "연애 타로", angle: "질문 정밀화", ctaTitle: "연애운 타로 보기" }),
  article({ slug: "tarot-reunion-reading", title: "재회운 타로 해석법: 기대와 현실을 함께 읽는 기준", description: "재회운 타로 결과를 안전하게 해석하는 방법을 다룹니다.", category: "타로", keywords: ["재회운 타로", "타로 해석", "타로"], topic: "재회운 타로", angle: "현실 점검", ctaTitle: "연애운 타로 보기" }),
  article({ slug: "tarot-partner-mind-reading", title: "상대방 속마음 타로: 관계 질문을 다루는 안전한 방식", description: "상대방 속마음 질문에서 과잉 해석을 피하는 원칙을 설명합니다.", category: "타로", keywords: ["상대방 속마음 타로", "타로", "연애 타로"], topic: "속마음 타로", angle: "관계 윤리", ctaTitle: "연애운 타로 보기" }),
  article({ slug: "today-tarot-routine", title: "오늘의 타로 활용법: 하루 계획에 연결하는 10분 루틴", description: "오늘의 타로 결과를 실행 계획으로 전환하는 루틴을 제공합니다.", category: "타로", keywords: ["오늘의 타로", "타로 루틴", "무료 타로"], topic: "오늘의 타로", angle: "하루 루틴", ctaTitle: "오늘의 운세 확인하기" }),
  article({ slug: "tarot-vs-saju", title: "타로와 사주의 차이: 언제 어떤 도구를 함께 써야 할까", description: "타로와 사주를 상황별로 병행하는 방법을 설명합니다.", category: "타로", keywords: ["타로와 사주의 차이", "타로", "사주"], topic: "타로 vs 사주", angle: "도구 선택", ctaTitle: "사주와 함께 비교 분석하기" }),
];

const ASTRO_VEDIC = [
  article({ slug: "astrology-birth-chart-guide", title: "점성술 출생 차트 보는 법: 태양·달·상승궁 해석 입문", description: "출생 차트의 핵심 축을 초보자 관점으로 정리합니다.", category: "점성술", keywords: ["점성술 출생 차트", "태양궁", "달궁", "상승궁"], topic: "출생 차트", angle: "핵심 축", ctaTitle: "베다점성술 차트 보기" }),
  article({ slug: "sun-moon-rising-difference", title: "태양궁·달궁·상승궁 차이: 성향 해석의 3축 이해", description: "태양궁, 달궁, 상승궁의 차이를 실전 예시로 설명합니다.", category: "점성술", keywords: ["태양궁 달궁 상승궁 차이", "점성술", "출생 차트"], topic: "태양·달·상승", angle: "3축 분석", ctaTitle: "점성술 차트 보기" }),
  article({ slug: "astrology-houses-what-is", title: "하우스란? 점성술에서 삶의 영역을 읽는 12하우스 기초", description: "점성술 하우스의 기본 의미와 활용법을 안내합니다.", category: "점성술", keywords: ["하우스란", "점성술 하우스", "점성술"], topic: "점성술 하우스", angle: "영역 해석", ctaTitle: "점성술 차트 보기" }),
  article({ slug: "vedic-what-is", title: "베다점성술이란? 인도 점성술의 핵심 구조 이해", description: "베다점성술의 기본 개념과 읽는 순서를 설명합니다.", category: "베다점성술", keywords: ["베다점성술이란", "베다점성술", "베다점"], topic: "베다점성술", angle: "인도 전통", ctaTitle: "베다점성술 차트 보기" }),
  article({ slug: "vedic-lagna-what-is", title: "라그나란? 베다점성술에서 삶의 시작점을 읽는 법", description: "라그나 개념과 실전 적용 포인트를 제공합니다.", category: "베다점성술", keywords: ["라그나란", "베다점성술", "라그나"], topic: "라그나", angle: "시작점 해석", ctaTitle: "베다점성술 차트 보기" }),
  article({ slug: "nakshatra-what-is", title: "나크샤트라란? 베다점에서 달의 별자리를 해석하는 방법", description: "나크샤트라의 의미와 관계·감정 해석 활용법을 설명합니다.", category: "베다점성술", keywords: ["나크샤트라란", "나크샤트라", "베다점"], topic: "나크샤트라", angle: "달의 리듬", ctaTitle: "베다점성술 차트 보기" }),
];

export const SEO_GROWTH_ARTICLES = [
  ...ZIWEI,
  ...SUKUYO,
  ...SAJU,
  ...TAROT,
  ...ASTRO_VEDIC,
];
