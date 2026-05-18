import type { DestinyElement, DestinyPlaceType } from "./destinyMeetingPlaceTypes";

export const ELEMENT_LABEL: Record<DestinyElement, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

export const DAY_MASTER_STYLE: Record<string, { romanceKeyword: string; relationTone: string; meetingStyle: string }> = {
  갑: { romanceKeyword: "성장형 인연", relationTone: "천천히 깊어지는 대화", meetingStyle: "자연 속에서 믿음을 쌓는 만남" },
  을: { romanceKeyword: "섬세한 공명", relationTone: "배려와 리듬이 맞는 연결", meetingStyle: "감성 공간에서 마음을 열어가는 만남" },
  병: { romanceKeyword: "즉시 점화", relationTone: "강렬한 첫인상", meetingStyle: "활기찬 장소에서 빠르게 친해지는 만남" },
  정: { romanceKeyword: "은은한 몰입", relationTone: "따뜻한 친밀감", meetingStyle: "밤빛 무드에서 진심을 확인하는 만남" },
  무: { romanceKeyword: "안정적 동행", relationTone: "신뢰 기반의 관계", meetingStyle: "오래 머무는 동네에서 천천히 이어지는 만남" },
  기: { romanceKeyword: "생활형 인연", relationTone: "현실적 배려", meetingStyle: "일상 루틴에서 자연스럽게 이어지는 만남" },
  경: { romanceKeyword: "명확한 케미", relationTone: "격이 맞는 소통", meetingStyle: "정돈된 공간에서 기준이 통하는 만남" },
  신: { romanceKeyword: "세련된 끌림", relationTone: "디테일에서 오는 매력", meetingStyle: "취향 공간에서 품격 있게 이어지는 만남" },
  임: { romanceKeyword: "깊은 공감", relationTone: "감정의 파장 공유", meetingStyle: "물가와 여행지에서 우연을 인연으로 바꾸는 만남" },
  계: { romanceKeyword: "감성 교류", relationTone: "조용한 친밀감", meetingStyle: "은은한 공간에서 오래 기억되는 만남" },
};

export const PLACE_POOL_BY_ELEMENT: Record<DestinyElement, Array<{ name: string; type: DestinyPlaceType; reason: string; actionTip: string }>> = {
  wood: [
    { name: "숲길 산책 코스", type: "nature", reason: "목 기운은 대화가 자연스럽게 이어지는 흐름을 만듭니다.", actionTip: "주말 오전, 40분 산책 루틴으로 반복 노출을 만드세요." },
    { name: "독립서점 북토크", type: "culture", reason: "성장 에너지가 지적인 호기심과 연결됩니다.", actionTip: "읽은 문장 하나를 메모해 대화의 첫 문장으로 써보세요." },
    { name: "플라워 카페", type: "cafe", reason: "부드러운 생장 기운이 긴장을 낮추고 호감을 높여줍니다.", actionTip: "테이블에 작은 꽃 한 송이 사진을 남겨 대화 소재를 만드세요." },
    { name: "캠퍼스 주변 산책로", type: "daily", reason: "배움의 공간은 목 기운의 확장성을 높입니다.", actionTip: "저녁 시간대 같은 동선으로 2주 연속 방문해 보세요." },
    { name: "보타닉 가든", type: "travel", reason: "정원 문화 공간은 관계의 속도를 건강하게 맞춰줍니다.", actionTip: "식물 설명 패널을 함께 읽으며 취향 대화를 시작하세요." },
  ],
  fire: [
    { name: "루프탑 야경 명소", type: "night", reason: "화 기운은 첫인상 에너지를 강하게 점화합니다.", actionTip: "해질 무렵 입장해 조명 전환 타이밍에 대화를 여세요." },
    { name: "전시 오프닝 파티", type: "culture", reason: "예술과 사람 밀도가 높은 공간에서 화 기운이 상승합니다.", actionTip: "작품 1개를 골라 감상을 먼저 말해보세요." },
    { name: "라이브 공연장", type: "night", reason: "리듬과 열기가 감정 연결을 빠르게 만듭니다.", actionTip: "공연 후 10분 산책으로 여운 대화를 이어가세요." },
    { name: "축제형 푸드 마켓", type: "city", reason: "활기와 열기가 만남 확률을 끌어올립니다.", actionTip: "새로운 메뉴를 함께 시도해 즉시 공통 경험을 만드세요." },
    { name: "사진 명소 골목", type: "travel", reason: "시각적 자극이 강할수록 화 기운의 매력이 살아납니다.", actionTip: "서로 한 장씩 찍어주며 자연스럽게 친밀도를 높이세요." },
  ],
  earth: [
    { name: "한옥 카페 거리", type: "daily", reason: "토 기운은 관계의 안정감과 지속성을 키웁니다.", actionTip: "같은 요일 같은 시간에 반복 방문하세요." },
    { name: "고궁 산책", type: "culture", reason: "역사 공간은 토 기운의 정착 운을 강화합니다.", actionTip: "조용한 코스를 선택해 긴 대화 시간을 확보하세요." },
    { name: "로컬 공예 클래스", type: "culture", reason: "손으로 만드는 활동이 현실적 케미를 확인하게 합니다.", actionTip: "완성품을 교환해 추억 앵커를 남기세요." },
    { name: "전통시장 미식 투어", type: "city", reason: "토 기운은 생활형 데이트에서 강점을 발휘합니다.", actionTip: "먹거리 3개만 정해 짧고 밀도 있게 돌면 좋습니다." },
    { name: "온천형 숙소", type: "travel", reason: "대지의 회복 에너지가 관계를 안정적으로 묶어줍니다.", actionTip: "1박 루틴에서 아침 산책을 반드시 넣으세요." },
  ],
  metal: [
    { name: "미술관 큐레이션 투어", type: "culture", reason: "금 기운은 취향과 기준이 맞을 때 인연을 강화합니다.", actionTip: "전시 전 한 작품만 미리 정해 대화의 축을 만드세요." },
    { name: "호텔 라운지", type: "city", reason: "정돈된 무드가 품격 있는 소통을 끌어냅니다.", actionTip: "짧은 60분 티타임으로 첫 만남 밀도를 높이세요." },
    { name: "디자인 편집숍 거리", type: "daily", reason: "세련된 공간은 금 기운의 매력을 극대화합니다.", actionTip: "서로 어울리는 아이템을 하나씩 골라보세요." },
    { name: "비즈니스 북카페", type: "cafe", reason: "정리된 환경이 신뢰 가능한 인상을 강화합니다.", actionTip: "대화 시작 전 오늘의 목표를 한 줄로 말해보세요." },
    { name: "아트 호텔 시티트립", type: "travel", reason: "도시형 동선에서 금 기운의 사회적 매력이 상승합니다.", actionTip: "체크인 후 로비 전시를 먼저 함께 보세요." },
  ],
  water: [
    { name: "강변 산책길", type: "water", reason: "수 기운은 감정을 부드럽게 열어 진심 대화를 돕습니다.", actionTip: "해질 무렵 30분 걷고 카페로 이동하세요." },
    { name: "바다 근처 조용한 카페", type: "cafe", reason: "물의 파동이 긴장을 낮추고 공감력을 높입니다.", actionTip: "창가 자리를 고르고 휴대폰은 잠시 내려두세요." },
    { name: "재즈 바", type: "night", reason: "수 기운은 음악과 함께 감정 교류를 깊게 만듭니다.", actionTip: "첫 곡이 끝난 뒤 한 줄 감상을 공유해 보세요." },
    { name: "수족관", type: "water", reason: "유영하는 시선은 대화의 텐션을 부드럽게 맞춥니다.", actionTip: "가장 오래 본 공간의 이유를 서로 말해보세요." },
    { name: "항구 도시 숙소", type: "travel", reason: "이동과 물의 결합은 우연한 인연 운을 높입니다.", actionTip: "체크인 당일 저녁에 짧은 야간 산책을 넣으세요." },
  ],
};

export const COUNTRY_POOL_BY_ELEMENT: Record<DestinyElement, Array<{ country: string; cities: string[]; reason: string; bestFor: string; travelMood: string }>> = {
  wood: [
    { country: "일본", cities: ["교토", "나라"], reason: "정원과 사찰의 생장 에너지가 목 기운과 공명합니다.", bestFor: "느린 대화형 인연", travelMood: "초록의 고요" },
    { country: "뉴질랜드", cities: ["퀸스타운", "오클랜드"], reason: "자연 밀도가 높아 관계를 건강하게 성장시킵니다.", bestFor: "관계 시작의 안정", travelMood: "청량한 확장" },
    { country: "캐나다", cities: ["밴쿠버", "빅토리아"], reason: "숲과 물의 균형이 목 기운 회복에 유리합니다.", bestFor: "장기 인연 탐색", travelMood: "편안한 도시 자연" },
    { country: "한국", cities: ["제주", "춘천"], reason: "숲길과 호수 동선이 자연스러운 만남을 돕습니다.", bestFor: "주말 관계 강화", travelMood: "가까운 리셋" },
    { country: "싱가포르", cities: ["마리나", "보타닉 가든"], reason: "도시와 정원이 공존해 목 기운의 균형을 잡아줍니다.", bestFor: "취향 기반 인연", travelMood: "정제된 초록" },
  ],
  fire: [
    { country: "스페인", cities: ["바르셀로나", "세비야"], reason: "열정적인 거리 문화가 화 기운을 활성화합니다.", bestFor: "강렬한 첫만남", travelMood: "열정의 밤" },
    { country: "태국", cities: ["방콕", "치앙마이"], reason: "활기와 축제 감성이 화 기운과 잘 맞습니다.", bestFor: "빠른 친밀도 형성", travelMood: "따뜻한 에너지" },
    { country: "프랑스", cities: ["파리", "니스"], reason: "야경과 예술 감성이 화 기운의 로맨스를 키웁니다.", bestFor: "감정 점화", travelMood: "빛의 무드" },
    { country: "한국", cities: ["서울 성수", "홍대"], reason: "트렌드 밀집 구역이 화 기운의 매력을 살립니다.", bestFor: "즉시성 높은 만남", travelMood: "도시의 리듬" },
    { country: "대만", cities: ["타이베이", "가오슝"], reason: "밤시장과 감성 골목이 화 기운의 연결성을 높입니다.", bestFor: "활동형 데이트", travelMood: "따뜻한 네온" },
  ],
  earth: [
    { country: "이탈리아", cities: ["피렌체", "시에나"], reason: "오랜 도시 결이 토 기운의 안정감을 높입니다.", bestFor: "정착형 인연", travelMood: "고전적 온기" },
    { country: "한국", cities: ["경주", "전주"], reason: "전통 거리와 생활 리듬이 토 기운을 단단히 만듭니다.", bestFor: "현실적 관계 발전", travelMood: "느린 여유" },
    { country: "중국", cities: ["시안", "쑤저우"], reason: "역사 층위가 깊은 도시가 토 기운과 맞닿습니다.", bestFor: "신뢰 축적", travelMood: "묵직한 시간" },
    { country: "튀르키예", cities: ["이스탄불", "카파도키아"], reason: "대지와 문명의 결합이 토 기운을 안정시킵니다.", bestFor: "동반자형 만남", travelMood: "이국적 안정" },
    { country: "스페인", cities: ["세비야", "그라나다"], reason: "고도(古都)의 리듬이 토 기운의 정착운을 돕습니다.", bestFor: "관계의 진전", travelMood: "따뜻한 역사" },
  ],
  metal: [
    { country: "싱가포르", cities: ["마리나베이", "오차드"], reason: "정돈된 도시 결이 금 기운을 정확하게 채웁니다.", bestFor: "품격 있는 만남", travelMood: "세련된 질서" },
    { country: "스위스", cities: ["취리히", "제네바"], reason: "정밀하고 단단한 도시 리듬이 금 기운과 공명합니다.", bestFor: "신뢰 기반 인연", travelMood: "차분한 고급감" },
    { country: "일본", cities: ["도쿄 긴자", "요코하마"], reason: "도시 감도와 디테일이 금 기운의 매력을 강화합니다.", bestFor: "취향 매칭", travelMood: "도시 미학" },
    { country: "프랑스", cities: ["파리", "리옹"], reason: "예술과 품격이 금 기운의 사회적 매력을 끌어올립니다.", bestFor: "지적 로맨스", travelMood: "우아한 감도" },
    { country: "한국", cities: ["청담", "한남"], reason: "정제된 라이프스타일 구역이 금 기운에 적합합니다.", bestFor: "관계의 수준 정렬", travelMood: "모던 럭셔리" },
  ],
  water: [
    { country: "일본", cities: ["홋카이도", "오타루"], reason: "차분한 항구 무드가 수 기운을 깊게 채웁니다.", bestFor: "감정 교류형 인연", travelMood: "눈과 물의 감성" },
    { country: "이탈리아", cities: ["베네치아", "코모"], reason: "물길 중심 동선이 수 기운의 공감을 증폭합니다.", bestFor: "로맨틱 대화", travelMood: "운하의 여운" },
    { country: "포르투갈", cities: ["포르투", "리스본"], reason: "강과 바다를 잇는 도시 감성이 수 기운과 맞닿습니다.", bestFor: "오래 기억될 만남", travelMood: "잔잔한 파도" },
    { country: "한국", cities: ["부산", "강릉"], reason: "해안 산책 동선이 수 기운을 빠르게 회복시킵니다.", bestFor: "주말 인연 강화", travelMood: "파도와 저녁" },
    { country: "스위스", cities: ["루체른", "인터라켄"], reason: "호수형 도시가 수 기운의 직관력을 살려줍니다.", bestFor: "깊은 감정 연결", travelMood: "맑은 호수" },
  ],
};

export const ELEMENT_TIMING_MAP: Record<DestinyElement, { seasons: string[]; months: string[]; times: string[] }> = {
  wood: { seasons: ["봄", "초여름"], months: ["3월", "4월", "5월"], times: ["06:30~09:00", "10:00~11:30"] },
  fire: { seasons: ["여름", "초가을 야간"], months: ["6월", "7월", "8월"], times: ["17:30~20:30", "21:00~22:00"] },
  earth: { seasons: ["환절기", "늦여름"], months: ["8월", "9월", "10월"], times: ["13:00~16:00", "19:00~20:00"] },
  metal: { seasons: ["가을", "초겨울"], months: ["9월", "10월", "11월"], times: ["15:00~18:00", "20:00~21:00"] },
  water: { seasons: ["겨울", "장마 직후"], months: ["11월", "12월", "1월"], times: ["18:30~22:30", "23:00~00:30"] },
};

export const DESTINY_ITEM_BY_ELEMENT: Record<DestinyElement, Array<{ item: string; usage: string; reason: string }>> = {
  wood: [
    { item: "초록 포인트 스카프", usage: "산책/북카페 방문 시 착용", reason: "목 기운의 부드러운 확장성을 살립니다." },
    { item: "플라워 모티프 키링", usage: "가방 지퍼에 부착", reason: "자연스러운 호감 신호를 만듭니다." },
    { item: "우디 계열 향", usage: "손목/목 뒤에 소량", reason: "편안한 대화 리듬을 유도합니다." },
  ],
  fire: [
    { item: "레드/핑크 립 포인트", usage: "첫 만남 전 짧게 보정", reason: "화 기운의 존재감을 살립니다." },
    { item: "조명 반사 액세서리", usage: "야간 데이트에 매치", reason: "첫인상 에너지를 강화합니다." },
    { item: "시트러스 플로럴 향수", usage: "외출 20분 전 사용", reason: "화 기운의 온도를 균형 있게 올립니다." },
  ],
  earth: [
    { item: "베이지 레더 소품", usage: "지갑/다이어리로 휴대", reason: "토 기운의 안정감을 키웁니다." },
    { item: "편안한 로퍼", usage: "도보 데이트에 고정", reason: "관계 속 지속성을 강화합니다." },
    { item: "종이 다이어리", usage: "약속 후 메모", reason: "현실적인 관계 운영에 유리합니다." },
  ],
  metal: [
    { item: "실버 워치", usage: "미팅/전시 방문 시 착용", reason: "금 기운의 정돈된 이미지를 완성합니다." },
    { item: "화이트 셔츠", usage: "첫 인연 자리의 기본 룩", reason: "깔끔한 신뢰감을 만듭니다." },
    { item: "클린 머스크 향", usage: "작은 용량으로 레이어링", reason: "세련된 인상을 오래 유지합니다." },
  ],
  water: [
    { item: "네이비 포인트 아우터", usage: "저녁 산책 시 착용", reason: "수 기운의 안정적인 감정선을 지켜줍니다." },
    { item: "물결 모티프 액세서리", usage: "목걸이/팔찌로 매치", reason: "부드러운 공감 에너지를 강화합니다." },
    { item: "잔향형 우디 아쿠아 향", usage: "가볍게 1~2회 사용", reason: "깊은 대화 분위기를 돕습니다." },
  ],
};

export const STYLING_GUIDE_BY_ELEMENT: Record<DestinyElement, { colors: string[]; mood: string; outfit: string; fragrance: string; accessory: string }> = {
  wood: {
    colors: ["세이지 그린", "아이보리", "올리브"],
    mood: "자연스럽고 지적인 부드러움",
    outfit: "가벼운 니트 + 롱스커트 혹은 셔츠 + 데님",
    fragrance: "우디 허브",
    accessory: "플라워 또는 리프 모티프",
  },
  fire: {
    colors: ["로즈 핑크", "코랄", "와인"],
    mood: "생기 있고 시선을 끄는 로맨틱",
    outfit: "실루엣이 살아있는 상의 + 포인트 아이템",
    fragrance: "플로럴 시트러스",
    accessory: "빛 반사 이어링",
  },
  earth: {
    colors: ["베이지", "카멜", "웜 브라운"],
    mood: "안정적이고 신뢰감 있는 포근함",
    outfit: "셋업 혹은 가디건 + 편안한 팬츠",
    fragrance: "소프트 머스크",
    accessory: "레더 스트랩 시계",
  },
  metal: {
    colors: ["화이트", "실버", "차콜"],
    mood: "절제된 세련미와 품격",
    outfit: "테일러드 자켓 + 미니멀 실루엣",
    fragrance: "클린 머스크",
    accessory: "실버 주얼리",
  },
  water: {
    colors: ["네이비", "딥블루", "블랙"],
    mood: "깊고 감성적인 고요",
    outfit: "드레이프가 있는 상의 + 다크 톤 룩",
    fragrance: "아쿠아 우디",
    accessory: "물결 라인 액세서리",
  },
};

export const TEN_STAR_MEETING_STYLE: Record<"expression" | "wealth" | "officer" | "resource" | "peer", { title: string; description: string; examples: string[]; caution: string }> = {
  expression: {
    title: "식상형 만남 루트",
    description: "표현과 콘텐츠, 취미 활동 속에서 인연이 열립니다.",
    examples: ["원데이 클래스", "공연/체험형 전시", "SNS 기반 소모임"],
    caution: "흥분 속도만 빠르면 깊이는 얕아질 수 있어, 대화 시간을 반드시 확보하세요.",
  },
  wealth: {
    title: "재성형 만남 루트",
    description: "현실적인 라이프스타일 공간에서 신뢰가 쌓입니다.",
    examples: ["로컬 맛집", "쇼핑/디자인 거리", "생활형 동네 카페"],
    caution: "조건 중심 비교를 줄이고 감정의 미세한 신호도 함께 보세요.",
  },
  officer: {
    title: "관성형 만남 루트",
    description: "공식적인 환경, 학습과 일의 접점에서 안정적 인연이 형성됩니다.",
    examples: ["스터디", "직무 세미나", "자격 과정"],
    caution: "너무 신중하면 타이밍을 놓칠 수 있으니, 가벼운 제안 한 번은 먼저 건네세요.",
  },
  resource: {
    title: "인성형 만남 루트",
    description: "치유와 사색, 배움의 공간에서 깊은 인연이 이어집니다.",
    examples: ["도서관", "명상 클래스", "독립 전시"],
    caution: "감정은 깊지만 속도가 느릴 수 있으니 작은 리액션을 자주 보여주세요.",
  },
  peer: {
    title: "비겁형 만남 루트",
    description: "친구 네트워크와 팀 활동에서 인연 운이 강하게 열립니다.",
    examples: ["동호회", "팀 스포츠", "친구 소개 모임"],
    caution: "친구 모드에만 머물지 않게 1:1 대화 타이밍을 별도로 만드세요.",
  },
};

export const AVOID_PLACE_BY_ELEMENT: Record<DestinyElement, string[]> = {
  wood: ["환기가 안 되는 폐쇄적 공간", "지나치게 메마른 실내"],
  fire: ["과열된 소음 공간", "수면이 깨지는 심야 과음 동선"],
  earth: ["불안정한 즉흥 이동", "정리되지 않은 혼잡 동선"],
  metal: ["지저분하고 기준 없는 만남 장소", "산만한 다중 소음 공간"],
  water: ["과도하게 건조한 일정", "대화가 끊기는 과밀 공간"],
};
