import type { DestinyMeetingPlaceResult } from "./destinyMeetingPlaceTypes";

export type DestinyMeetingPlacePremiumNarrative = {
  profile: {
    dayMaster: string;
    majorElements: string[];
    keywords: string[];
  };
  headline: string;
  oneLineSummary: string;
  energyNarrative: {
    title: string;
    body: string;
    psychologyLink: string;
  };
  timingNarrative: {
    seasons: string[];
    months: string[];
    timeWindows: string[];
    story: string;
  };
  placeTop5: Array<{
    rank: number;
    name: string;
    type: "culture" | "city" | "cafe" | "daily";
    element: "earth" | "metal";
    sceneDescription: string;
    destinyReason: string;
    conversationOpener: string;
    actionTip: string;
    romancePotential: number;
  }>;
  styleGuide: {
    colors: string[];
    outfit: string;
    fragrance: string;
    mood: string;
    items: string[];
  };
  weeklyActionPlan: {
    todayAction: string;
    thisWeekAction: string;
    thisMonthAction: string;
    travelAction: string;
    microActions: string[];
    toneReminder: string;
  };
};

export const DESTINY_MEETING_PLACE_VIVID_PROMPT_KO = [
  "너는 사주 기반 관계 코치이자 감각적인 에디터다.",
  "출력은 건조한 요약이 아니라 장면이 보이는 프리미엄 리포트 문장으로 작성한다.",
  "반드시 아래 규칙을 지켜라:",
  "1) 장소 문장은 시간대, 빛, 소리, 동선을 포함해 시각화한다.",
  "2) 오행과 심리 연결을 설명해 설득력을 만든다.",
  "3) 행동 팁은 즉시 실행 가능한 한 문장 질문/행동으로 작성한다.",
  "4) 문체는 과장 대신 우아하고 단정한 톤으로 유지한다.",
  "5) 결과 섹션 순서는 한 줄 요약 -> 나의 기운 -> 타이밍 -> 장소 TOP5 -> 액션 플랜으로 고정한다.",
].join("\n");

export const PREMIUM_DESTINY_MEETING_PLACE_DEMO: DestinyMeetingPlacePremiumNarrative = {
  profile: {
    dayMaster: "신(辛)",
    majorElements: ["토(土)", "금(金)"],
    keywords: ["세련된 끌림", "디테일에서 오는 매력", "품격 있는 만남"],
  },
  headline: "모던 럭셔리 인연 리포트",
  oneLineSummary:
    "당신의 인연운은 화려함보다 결이 고운 공간에서 열린다. 오후의 잔잔한 빛과 저녁의 정돈된 공기 속에서, 디테일을 알아보는 사람과 품격 있는 대화가 시작된다.",
  energyNarrative: {
    title: "토(土)와 금(金)이 만드는 신뢰의 자장",
    body:
      "신(辛) 일간의 매력은 반짝임 그 자체보다 완성도 높은 디테일에서 드러난다. 토(土) 기운은 감정의 흔들림을 가라앉혀 첫 만남의 속도를 안정시키고, 금(金) 기운은 말투와 취향의 기준을 선명하게 만들어 신뢰 가능한 인상으로 연결한다.",
    psychologyLink:
      "요즘처럼 관계 피로가 큰 시기에는 자극적인 공간보다 정돈된 공간이 더 유리하다. 토(土)는 불안의 진폭을 줄이고, 금(金)은 상대가 당신의 섬세함을 읽도록 돕는다.",
  },
  timingNarrative: {
    seasons: ["환절기", "가을"],
    months: ["8월", "9월", "10월", "11월"],
    timeWindows: ["13:00~16:00", "19:00~20:00"],
    story:
      "오후 1시에서 4시 사이에는 토(土)의 중심력이 올라와 말의 온도가 안정된다. 저녁 7시에서 8시 사이에는 금(金)의 선명함이 살아나 첫인상과 대화의 결이 또렷해진다.",
  },
  placeTop5: [
    {
      rank: 1,
      name: "고궁 산책",
      type: "culture",
      element: "earth",
      sceneDescription:
        "오후 4시, 늦은 햇살이 덕수궁 돌담에 길게 번지는 시간. 발걸음이 자연히 느려지고, 작은 침묵도 어색하지 않은 산책 장면이 열린다.",
      destinyReason:
        "역사 공간의 층위는 토(土) 기운을 단단하게 만들어 대화의 신뢰도를 높인다. 신(辛)의 디테일 감각이 드러나기 가장 좋은 배경이다.",
      conversationOpener: "돌담길을 걷다 보면 이상하게 마음이 차분해지는 포인트가 있는데, 방금은 어디였어요?",
      actionTip:
        "돌담길을 30분 걷고 벤치에 7분 머무르며 대화 하나를 깊게 이어가세요. 속도를 늦출수록 당신의 매력이 선명해집니다.",
      romancePotential: 95,
    },
    {
      rank: 2,
      name: "전통시장 미식 투어",
      type: "city",
      element: "earth",
      sceneDescription:
        "해가 기울기 시작한 시장 골목, 김이 오르는 노포 앞에서 취향을 고르는 짧은 순간들이 자연스러운 친밀감을 만든다.",
      destinyReason:
        "토(土)는 생활 감각과 현실 호흡을 맞추는 오행이다. 함께 먹고 고르는 리듬 속에서 관계의 실제 궁합이 빠르게 드러난다.",
      conversationOpener: "오늘 메뉴를 딱 하나만 다시 먹는다면 어떤 걸 고를 것 같아요?",
      actionTip:
        "메뉴는 3개만 고르고, 한 메뉴마다 이유를 한 문장씩 말해보세요. 취향 설명이 곧 당신의 정체성을 보여줍니다.",
      romancePotential: 93,
    },
    {
      rank: 3,
      name: "미술관 큐레이션 투어",
      type: "culture",
      element: "metal",
      sceneDescription:
        "조도가 낮은 전시실에서 작품 라벨을 함께 읽고, 한 걸음 물러나 색의 결을 바라보는 순간에 대화가 깊어진다.",
      destinyReason:
        "금(金)은 기준과 안목의 오행이다. 작품을 해석하는 방식이 맞아떨어질 때 신(辛) 특유의 세련된 매력이 강하게 전달된다.",
      conversationOpener: "이 작품은 멀리서 볼 때랑 가까이서 볼 때 분위기가 달라지는데, 어느 쪽이 더 좋아요?",
      actionTip:
        "입장 전 작품 하나를 먼저 정하고, 감상 포인트를 한 줄 메모한 뒤 질문을 건네세요. 대화의 품질이 즉시 올라갑니다.",
      romancePotential: 92,
    },
    {
      rank: 4,
      name: "디자인 편집숍",
      type: "daily",
      element: "metal",
      sceneDescription:
        "정갈한 진열대 사이를 천천히 돌며 소재와 질감을 비교하는 장면에서, 취향의 결이 자연스럽게 교차한다.",
      destinyReason:
        "금(金) 기운은 선택 기준이 분명한 사람에게 강하게 반응한다. 신(辛)의 디테일 감수성이 가장 매력적으로 드러나는 공간이다.",
      conversationOpener: "이 아이템은 디자인보다 기능이 먼저 보여요, 아니면 감성이 먼저 보여요?",
      actionTip:
        "서로에게 어울리는 소품 하나씩을 골라 이유를 말해보세요. 짧은 선택이 관계의 온도를 빠르게 올립니다.",
      romancePotential: 90,
    },
    {
      rank: 5,
      name: "비즈니스 북카페",
      type: "cafe",
      element: "metal",
      sceneDescription:
        "저녁 7시, 잔잔한 재즈가 흐르는 테이블에서 노트와 커피가 놓인 장면이 차분한 집중력을 만든다.",
      destinyReason:
        "금(金)은 명료한 사고와 신뢰의 언어를 만든다. 정돈된 공간에서는 당신의 말 한 문장이 더 정확하게 전달된다.",
      conversationOpener: "최근에 읽은 문장 중에서 하루를 버티게 해 준 문장이 하나 있다면 뭘까요?",
      actionTip:
        "첫 10분은 서로의 근황보다 요즘 관심 주제 1개로 시작하세요. 깊이 있는 대화가 빠르게 열립니다.",
      romancePotential: 88,
    },
  ],
  styleGuide: {
    colors: ["샌드 베이지", "웜 타우프", "샴페인 골드", "카멜"],
    outfit: "화이트 셔츠를 중심으로 베이지/카멜 톤을 얹은 미니멀 실루엣",
    fragrance: "클린 머스크",
    mood: "단정하지만 차갑지 않은, 조용한 고급감",
    items: ["편안한 로퍼", "화이트 셔츠", "카멜 톤 아우터"],
  },
  weeklyActionPlan: {
    todayAction:
      "토(土) 무드를 유지하는 톤으로 옷을 맞추고, 고궁에서 30분 머물며 상대의 말에서 인상 깊었던 표현 1개를 메모하세요.",
    thisWeekAction:
      "고궁 산책 1회 + 미술관 1회를 같은 시간대(13~16시 또는 19~20시)로 맞춰, 인연운 타이밍을 체감 가능한 루틴으로 고정하세요.",
    thisMonthAction:
      "8~11월 일정표에서 환절기 저녁 약속을 우선 배치하고, 만남 후 5분 리뷰 메모를 남겨 다음 대화의 연결 고리를 만들어 두세요.",
    travelAction:
      "전통과 디자인이 공존하는 도시(서울 덕수궁-삼청동 동선)를 1일 코스로 운영해 관계의 안정감과 취향 공명을 동시에 테스트하세요.",
    microActions: [
      "작품/풍경/음식 중 하나를 지정해 '이 색감 어때요?'처럼 감각 질문 1개 던지기",
      "약속 종료 30분 전에 다음에 함께 볼 장소 1개를 제안해 대화의 여운 연결하기",
      "귀가 후 10분 안에 오늘 대화의 키워드 3개를 기록해 다음 만남의 오프너로 활용하기",
    ],
    toneReminder: "당신의 핵심 무드는 화려함이 아니라 완성도다. 서두르지 않는 태도가 오히려 강한 끌림을 만든다.",
  },
};

export function premiumNarrativeToResult(data: DestinyMeetingPlacePremiumNarrative): DestinyMeetingPlaceResult {
  return {
    summary: {
      title: data.headline,
      oneLine: data.oneLineSummary,
      mainEnergy: data.profile.majorElements.join(" · "),
      romanceKeyword: data.profile.keywords.join(" · "),
      placeTheme: "전통과 디자인이 공존하는 정제된 공간",
    },
    energyProfile: {
      dayMaster: `${data.profile.dayMaster} 일간`,
      usefulElements: ["earth", "metal"],
      avoidElements: ["fire"],
      strongestElement: "metal",
      weakestElement: "wood",
      relationshipPattern: data.energyNarrative.psychologyLink,
      meetingStyle: data.energyNarrative.body,
    },
    recommendedPlaces: data.placeTop5.map((place) => ({
      rank: place.rank,
      name: place.name,
      type: place.type,
      element: place.element,
      sceneDescription: place.sceneDescription,
      emotionalHook: place.destinyReason,
      conversationOpener: place.conversationOpener,
      reason: place.destinyReason,
      actionTip: place.actionTip,
      romancePotential: place.romancePotential,
    })),
    recommendedCountries: [
      {
        rank: 1,
        country: "한국",
        cities: ["서울(덕수궁-삼청동)", "전주"],
        element: "earth",
        reason: "전통 공간과 생활 리듬이 토(土) 안정감을 높여 관계의 신뢰를 빠르게 구축합니다.",
        bestFor: "현실형 인연 구축",
        travelMood: "따뜻한 고전미",
      },
      {
        rank: 2,
        country: "일본",
        cities: ["교토", "가나자와"],
        element: "metal",
        reason: "정갈한 미감과 디테일 문화가 금(金) 기운의 세련된 매력을 강화합니다.",
        bestFor: "취향 공명형 만남",
        travelMood: "절제된 우아함",
      },
      {
        rank: 3,
        country: "이탈리아",
        cities: ["피렌체", "볼로냐"],
        element: "earth",
        reason: "역사적 층위와 미식 동선이 토(土) 기운을 단단하게 만들어 관계를 안정시킵니다.",
        bestFor: "느린 대화형 연애",
        travelMood: "클래식 온기",
      },
      {
        rank: 4,
        country: "스위스",
        cities: ["취리히", "루체른"],
        element: "metal",
        reason: "정밀한 도시 리듬이 금(金) 기운과 맞아 대화의 밀도와 신뢰감을 동시에 높입니다.",
        bestFor: "품격형 인연",
        travelMood: "차분한 럭셔리",
      },
      {
        rank: 5,
        country: "싱가포르",
        cities: ["마리나베이", "탄종파가"],
        element: "metal",
        reason: "모던한 도시 질서와 감각적인 공간 배치가 신(辛) 일간의 장점을 선명하게 보여줍니다.",
        bestFor: "첫인상 강화",
        travelMood: "세련된 도시감",
      },
    ],
    meetingPlaceTypes: [
      {
        title: "전통 산책형 루트",
        description: "고궁/한옥/돌담길처럼 속도를 늦추는 공간에서 인연 운이 상승합니다.",
        whyItFits: "토(土) 기운이 불안을 잠재워 진심 대화를 오래 유지하게 만듭니다.",
        examplePlaces: ["덕수궁 돌담길", "창덕궁 후원", "전주 한옥마을"],
        caution: "동선을 과하게 늘리지 말고 한 공간에 충분히 머무르세요.",
      },
      {
        title: "큐레이션 대화형 루트",
        description: "미술관/편집숍/북카페처럼 취향의 기준을 드러내는 공간이 유리합니다.",
        whyItFits: "금(金) 기운이 당신의 디테일 감각을 사회적 매력으로 전환합니다.",
        examplePlaces: ["큐레이션 전시", "디자인 편집숍", "비즈니스 북카페"],
        caution: "평가보다 질문 중심의 말투를 유지하세요.",
      },
      {
        title: "생활 미식형 루트",
        description: "전통시장 미식 동선처럼 현실 호흡을 공유하는 장소가 안정적인 인연을 만듭니다.",
        whyItFits: "함께 먹고 고르는 리듬이 관계의 실제 궁합을 빠르게 보여줍니다.",
        examplePlaces: ["광장시장", "남대문 시장", "지역 로컬 마켓"],
        caution: "과한 장소 이동보다 짧고 밀도 있는 코스가 효과적입니다.",
      },
    ],
    luckyTiming: {
      bestSeasons: data.timingNarrative.seasons,
      bestMonths: data.timingNarrative.months,
      bestTimeOfDay: data.timingNarrative.timeWindows,
      explanation: data.timingNarrative.story,
    },
    destinyItems: data.styleGuide.items.map((item) => ({
      item,
      element: item.includes("화이트") ? "metal" : "earth",
      usage: "만남 20분 전 착용/정돈",
      reason: "정제된 인상과 안정적인 호감을 동시에 강화합니다.",
    })),
    stylingGuide: {
      colors: data.styleGuide.colors,
      mood: data.styleGuide.mood,
      outfit: data.styleGuide.outfit,
      fragrance: data.styleGuide.fragrance,
      accessory: "미니멀 실버 워치",
    },
    avoidGuide: {
      avoidPlaces: ["소음이 과한 심야 술자리", "동선이 무질서한 과밀 공간"],
      avoidTiming: ["피로가 누적된 밤 10시 이후", "과속 스케줄 직후 즉흥 약속"],
      avoidPatterns: ["첫 만남에서 관계 결론을 서두르는 패턴", "질문 없이 정보만 전달하는 패턴"],
      reason: "신(辛) 일간은 완성도가 매력의 핵심이므로, 과속 상황에서는 장점이 충분히 전달되지 않습니다.",
    },
    practicalPlan: {
      todayAction: data.weeklyActionPlan.todayAction,
      thisWeekAction: data.weeklyActionPlan.thisWeekAction,
      thisMonthAction: data.weeklyActionPlan.thisMonthAction,
      travelAction: data.weeklyActionPlan.travelAction,
      microActions: data.weeklyActionPlan.microActions,
      toneReminder: data.weeklyActionPlan.toneReminder,
    },
  };
}
