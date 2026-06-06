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

type PlacePoolItem = {
  name: string;
  type: DestinyPlaceType;
  secondaryElement: DestinyElement;
  categoryLabel: string;
  purposeTags: string[];
  reason: string;
  actionTip: string;
  baziInsight: string;
  fitStrategy: string;
  avoidWhen: string;
  bestTimeHint: string;
  ritual: string;
};

export const PLACE_POOL_BY_ELEMENT: Record<DestinyElement, PlacePoolItem[]> = {
  wood: [
    { name: "숲길 산책 코스", type: "nature", secondaryElement: "water", categoryLabel: "회복지", purposeTags: ["회복", "새 시작", "느린 인연"], reason: "숲은 목(木)의 생장 기운에 수(水)의 습윤함이 더해져 마음의 경계를 부드럽게 엽니다.", actionTip: "주말 오전, 40분 산책 루틴으로 반복 노출을 만드세요.", baziInsight: "목이 부족한 사주는 의욕의 싹을 틔우고, 화가 과한 사주는 말의 열기를 낮추기 좋습니다.", fitStrategy: "처음부터 깊은 이야기를 꺼내기보다 걷는 속도를 맞추며 취향과 생활 리듬을 묻는 흐름이 좋습니다.", avoidWhen: "바람이 너무 강하거나 사람이 밀집된 산책로는 목의 안정감이 흩어질 수 있습니다.", bestTimeHint: "해가 오른 뒤의 오전", ritual: "초록이 가장 짙은 지점에서 오늘 새로 시작할 일 하나를 작게 말해보세요." },
    { name: "서점 카페", type: "cafe", secondaryElement: "fire", categoryLabel: "영감지", purposeTags: ["대화", "창작", "취향 연결"], reason: "카페의 목(木)은 생각을 키우고, 은은한 화(火)는 말문과 표정을 따뜻하게 밝혀줍니다.", actionTip: "읽은 문장 하나를 메모해 대화의 첫 문장으로 써보세요.", baziInsight: "식상 기운이 필요한 사주에는 표현력을, 인성 기운이 강한 사주에는 생각을 말로 꺼내는 용기를 더합니다.", fitStrategy: "책 제목, 향, 창가 자리처럼 작은 감각에서 대화를 시작하면 인연의 결이 자연스럽게 맞습니다.", avoidWhen: "회전이 빠르고 음악이 큰 카페는 목의 성장 리듬보다 화의 산만함이 앞설 수 있습니다.", bestTimeHint: "오후 2시 전후", ritual: "서로에게 어울리는 책 한 권을 골라 짧은 이유를 남겨보세요." },
    { name: "플라워 카페", type: "cafe", secondaryElement: "earth", categoryLabel: "인연지", purposeTags: ["호감", "부드러운 만남", "사진"], reason: "꽃의 목(木)과 화분의 토(土)가 첫인상의 긴장을 낮추고 호감의 기억을 오래 붙잡습니다.", actionTip: "테이블에 작은 꽃 한 송이 사진을 남겨 대화 소재를 만드세요.", baziInsight: "목이 희신인 사주에는 관계의 싹을 틔우고, 토가 약한 사주에는 만남의 안정감을 보강합니다.", fitStrategy: "꽃말이나 계절감처럼 부담 없는 주제로 시작하면 상대의 방어가 빠르게 풀립니다.", avoidWhen: "향이 과하게 진한 공간은 금·수 기운이 예민한 사람에게 피로감을 줄 수 있습니다.", bestTimeHint: "햇빛이 부드러운 늦은 오후", ritual: "오늘의 꽃 한 송이를 정하고 그 꽃처럼 키우고 싶은 마음을 한 문장으로 적어보세요." },
    { name: "캠퍼스 주변 산책로", type: "daily", secondaryElement: "metal", categoryLabel: "성장지", purposeTags: ["공부", "장기 인연", "일상 루틴"], reason: "배움의 목(木)에 금(金)의 정돈된 길이 더해져 관계의 방향과 속도를 맑게 잡아줍니다.", actionTip: "저녁 시간대 같은 동선으로 2주 연속 방문해 보세요.", baziInsight: "비견·겁재가 강한 사주는 경쟁심을 낮추고, 관성 기운이 필요한 사주는 약속과 리듬을 세우기 좋습니다.", fitStrategy: "짧은 산책 뒤 조용한 음료 공간으로 이동하면 대화가 생활 계획까지 자연스럽게 이어집니다.", avoidWhen: "시험 기간처럼 긴장감이 높은 시기에는 가벼운 만남보다 부담이 커질 수 있습니다.", bestTimeHint: "수업과 퇴근 사이의 저녁 초입", ritual: "같은 벤치에 잠시 앉아 이번 달 배우고 싶은 것을 하나씩 말해보세요." },
    { name: "보타닉 가든", type: "travel", secondaryElement: "water", categoryLabel: "대길지", purposeTags: ["여행", "회복", "관계 시작"], reason: "정원은 목(木)의 생장과 수(水)의 순환이 함께 머물러 인연을 서두르지 않고 깊게 키웁니다.", actionTip: "식물 설명 패널을 함께 읽으며 취향 대화를 시작하세요.", baziInsight: "용신이 목·수로 흐르는 사주에는 기운 보강이 선명하고, 화가 강한 사주에는 감정의 온도를 예쁘게 낮춥니다.", fitStrategy: "동선을 길게 잡고 중간중간 쉬어가면 침묵도 어색하지 않은 친밀감으로 바뀝니다.", avoidWhen: "일정이 촉박하면 목의 느린 성장성이 끊겨 관계의 여운이 짧아질 수 있습니다.", bestTimeHint: "오전 입장 후 낮으로 넘어가는 시간", ritual: "가장 오래 눈이 머문 식물 앞에서 다음 만남의 장소를 정해보세요." },
    { name: "숲속 리트릿 숙소", type: "travel", secondaryElement: "earth", categoryLabel: "회복지", purposeTags: ["숙면", "관계 정리", "전환기"], reason: "목(木)의 숨과 토(土)의 품이 함께 깔려 지친 운을 회복시키고 관계의 기준을 차분히 세웁니다.", actionTip: "하룻밤 머문다면 아침 산책과 따뜻한 차 시간을 반드시 넣으세요.", baziInsight: "인성 과다로 생각이 많은 사주는 몸의 리듬을 되찾고, 재성 과다로 소모가 큰 사주는 마음의 잔고를 채웁니다.", fitStrategy: "깊은 고백보다 함께 쉬는 시간을 먼저 만들면 관계가 안정적으로 열립니다.", avoidWhen: "혼자만의 시간이 필요한 날에는 일정 공유를 과하게 늘리지 마세요.", bestTimeHint: "비 온 다음 날의 오전", ritual: "나무가 보이는 자리에서 숨을 세 번 고르고 놓아야 할 마음 하나를 내려놓으세요." },
  ],
  fire: [
    { name: "루프탑 야경 명소", type: "night", secondaryElement: "metal", categoryLabel: "인기지", purposeTags: ["첫인상", "고백", "도화"], reason: "화(火)는 표정과 존재감을 밝히고, 금(金)의 도시 조명이 인상을 선명하게 각인합니다.", actionTip: "해질 무렵 입장해 조명 전환 타이밍에 대화를 여세요.", baziInsight: "화가 희신인 사주는 매력이 드러나고, 금이 필요한 사주는 관계의 격과 기준을 함께 세울 수 있습니다.", fitStrategy: "높은 곳에서 시야를 함께 바라본 뒤 짧고 분명한 마음 표현을 건네면 효과가 좋습니다.", avoidWhen: "화가 이미 과한 사주는 늦은 밤 술자리와 겹치면 말이 앞설 수 있습니다.", bestTimeHint: "노을에서 야경으로 바뀌는 40분", ritual: "불빛이 켜지는 순간 오늘 가장 밝게 보이고 싶은 모습을 하나 정하세요." },
    { name: "전시 오프닝 파티", type: "culture", secondaryElement: "wood", categoryLabel: "도화지", purposeTags: ["사교", "취향", "새 인연"], reason: "예술의 화(火)에 목(木)의 창조성이 붙어 사람 사이의 시선과 말문을 빠르게 엽니다.", actionTip: "작품 1개를 골라 감상을 먼저 말해보세요.", baziInsight: "식상이 필요한 사주에는 표현의 문을 열고, 목이 부족한 사주에는 새로운 관계의 싹을 틔웁니다.", fitStrategy: "작품 해석보다 느낀 색과 장면을 말하면 감각형 대화가 부드럽게 이어집니다.", avoidWhen: "사람이 너무 많은 오프닝에서는 짧은 대화만 남고 깊이가 약해질 수 있습니다.", bestTimeHint: "입장 직후보다 관람객 흐름이 안정된 중반", ritual: "가장 끌리는 색 하나를 고르고 그 색이 닮은 감정을 말해보세요." },
    { name: "라이브 공연장", type: "night", secondaryElement: "water", categoryLabel: "점화지", purposeTags: ["감정 교류", "흥", "여운"], reason: "무대의 화(火)와 음악의 수(水)가 만나 감정을 빠르게 움직이고 기억의 파동을 남깁니다.", actionTip: "공연 후 10분 산책으로 여운 대화를 이어가세요.", baziInsight: "화·수가 균형을 이루면 설렘과 공감이 함께 살아나며, 인연의 속도가 자연스럽게 빨라집니다.", fitStrategy: "공연 중에는 함께 몰입하고 끝난 뒤 한 곡의 감상을 나누는 방식이 좋습니다.", avoidWhen: "소음에 예민하거나 수 기운이 약한 날에는 피로가 먼저 올 수 있습니다.", bestTimeHint: "공연 직후의 여운 시간", ritual: "오늘의 한 곡을 정해 다음 만남 전까지 함께 들어보세요." },
    { name: "축제형 푸드 마켓", type: "city", secondaryElement: "earth", categoryLabel: "재물지", purposeTags: ["활력", "재물운", "생활 케미"], reason: "화(火)의 활기와 토(土)의 먹거리 기운이 현실적 즐거움과 재물 흐름을 함께 깨웁니다.", actionTip: "새로운 메뉴를 함께 시도해 즉시 공통 경험을 만드세요.", baziInsight: "재성이 필요한 사주에는 즐거운 소비 감각을, 토가 약한 사주에는 관계의 생활감을 보완합니다.", fitStrategy: "먹거리 3가지만 고르고 짧게 이동하면 산만함보다 즐거운 리듬이 남습니다.", avoidWhen: "지출이 커지거나 줄이 길어지면 화의 즐거움이 짜증으로 바뀔 수 있습니다.", bestTimeHint: "해 진 뒤 1시간 이내", ritual: "가장 먼저 나눈 음식을 오늘의 복채처럼 기억해두세요." },
    { name: "사진 명소 골목", type: "travel", secondaryElement: "wood", categoryLabel: "표현지", purposeTags: ["사진", "끌림", "가벼운 데이트"], reason: "빛과 색의 화(火)에 골목의 목(木) 생동감이 더해져 매력이 눈에 잘 들어옵니다.", actionTip: "서로 한 장씩 찍어주며 자연스럽게 친밀도를 높이세요.", baziInsight: "도화 신호가 있는 사주에는 시선 운을 살리고, 목이 보완되면 관계의 다음 장면이 쉽게 열립니다.", fitStrategy: "포즈를 지시하기보다 상대가 편해 보이는 순간을 칭찬하면 호감이 부드럽게 올라갑니다.", avoidWhen: "사진에만 집중하면 대화가 얕아질 수 있으니 이동 중 짧은 질문을 섞어주세요.", bestTimeHint: "그림자가 길어지는 늦은 오후", ritual: "가장 자연스러운 사진 한 장을 남기고 그 순간의 기분을 한 단어로 정하세요." },
    { name: "소극장 코미디 공연", type: "culture", secondaryElement: "metal", categoryLabel: "해방지", purposeTags: ["웃음", "긴장 완화", "첫 만남"], reason: "화(火)의 웃음과 금(金)의 짜임이 어색함을 빨리 풀고 관계의 박자를 맞춥니다.", actionTip: "공연 뒤 가장 웃겼던 장면 하나를 가볍게 공유하세요.", baziInsight: "관성이 강해 경직된 사주는 표정이 풀리고, 금이 필요한 사주는 대화의 선을 잃지 않습니다.", fitStrategy: "웃음이 남아 있을 때 짧은 산책으로 넘어가면 첫 만남의 부담이 크게 줄어듭니다.", avoidWhen: "감정이 예민한 날에는 지나친 농담이 오해로 번질 수 있습니다.", bestTimeHint: "금요일 저녁 초반", ritual: "오늘 웃은 장면 하나를 다음 만남의 암호처럼 남겨보세요." },
  ],
  earth: [
    { name: "한옥 카페 거리", type: "daily", secondaryElement: "wood", categoryLabel: "정착지", purposeTags: ["안정", "장기 인연", "고백 전"], reason: "토(土)의 안정감에 목(木)의 온기가 더해져 관계가 서두르지 않고 자리 잡습니다.", actionTip: "같은 요일 같은 시간에 반복 방문하세요.", baziInsight: "토가 희신인 사주에는 관계의 중심을 잡고, 목이 보조되면 딱딱한 분위기가 부드럽게 풀립니다.", fitStrategy: "오래 앉아 차를 마시며 생활 리듬과 가치관을 묻는 대화가 좋습니다.", avoidWhen: "답답한 실내에 오래 머물면 토 과다 사주는 생각이 무거워질 수 있습니다.", bestTimeHint: "햇빛이 처마 아래로 낮게 들어오는 오후", ritual: "첫 잔을 마시기 전 오래 지키고 싶은 약속 하나를 마음속으로 정하세요." },
    { name: "고궁 산책", type: "culture", secondaryElement: "metal", categoryLabel: "귀인지", purposeTags: ["신뢰", "품격", "관계 숙성"], reason: "오래된 토(土)와 절제된 금(金)이 만나 관계의 격과 신뢰를 차분히 높입니다.", actionTip: "조용한 코스를 선택해 긴 대화 시간을 확보하세요.", baziInsight: "관성이 필요한 사주에는 예의와 책임감을, 인성이 강한 사주에는 깊은 사유의 통로를 엽니다.", fitStrategy: "화려한 코스보다 사람이 적은 길을 골라 질문 하나를 오래 나누면 좋습니다.", avoidWhen: "일정이 촉박하거나 날씨가 거칠면 토의 안정감이 충분히 살아나지 않습니다.", bestTimeHint: "오전 관람객이 빠진 늦은 오전", ritual: "문을 지나며 지금 관계에 필요한 한 가지 태도를 조용히 정하세요." },
    { name: "로컬 공예 클래스", type: "culture", secondaryElement: "metal", categoryLabel: "완성지", purposeTags: ["집중", "현실 케미", "선물"], reason: "흙과 손의 토(土)에 금(金)의 완성성이 더해져 말보다 행동으로 궁합을 확인하게 합니다.", actionTip: "완성품을 교환해 추억 앵커를 남기세요.", baziInsight: "재성·관성 흐름이 필요한 사주에는 실질적 호감과 약속의 감각이 살아납니다.", fitStrategy: "서로의 방식에 간섭하기보다 완성 뒤 장점을 짚어주면 안정적인 호감이 남습니다.", avoidWhen: "완벽주의가 올라오는 날에는 결과물보다 함께 만든 시간을 우선하세요.", bestTimeHint: "토요일 낮", ritual: "완성품에 오늘의 마음을 담은 이름을 하나 붙여보세요." },
    { name: "전통시장 미식 투어", type: "city", secondaryElement: "fire", categoryLabel: "재물지", purposeTags: ["재물", "생활력", "활기"], reason: "토(土)의 생활 기반과 화(火)의 활기가 만나 현실적 즐거움과 재물운을 깨웁니다.", actionTip: "먹거리 3개만 정해 짧고 밀도 있게 돌면 좋습니다.", baziInsight: "재성이 약한 사주는 소비와 선택의 감각을 익히고, 화가 필요한 사주는 생기를 되찾습니다.", fitStrategy: "가격보다 취향과 선택 이유를 나누면 생활형 궁합이 빠르게 보입니다.", avoidWhen: "혼잡한 시간대에는 관계의 여유보다 피로가 커질 수 있습니다.", bestTimeHint: "점심 직후보다 한산한 오후", ritual: "처음 고른 음식의 맛을 오늘 운의 첫 신호로 받아들이세요." },
    { name: "온천형 숙소", type: "travel", secondaryElement: "water", categoryLabel: "회복지", purposeTags: ["치유", "감정 완화", "동행"], reason: "토(土)의 품과 수(水)의 온기가 겹쳐 굳은 감정을 풀고 관계의 피로를 씻어냅니다.", actionTip: "1박 루틴에서 아침 산책을 반드시 넣으세요.", baziInsight: "토가 필요한 사주는 몸의 중심을 세우고, 수가 필요한 사주는 마음의 말문을 편안히 엽니다.", fitStrategy: "긴 일정 대신 휴식과 식사 시간을 넉넉히 두면 관계가 안정적으로 깊어집니다.", avoidWhen: "감정 정리가 끝나지 않은 관계라면 한 공간에 오래 머무는 일정은 부담이 될 수 있습니다.", bestTimeHint: "비수기 평일 저녁", ritual: "따뜻한 물에 손을 담그며 마음에서 씻어낼 말을 하나 떠나보내세요." },
    { name: "산 전망대와 돌담길", type: "mountain", secondaryElement: "metal", categoryLabel: "중심지", purposeTags: ["결단", "마음 정리", "관계 기준"], reason: "산의 토(土)와 바위의 금(金)이 마음의 축을 세우고 관계의 기준을 맑게 드러냅니다.", actionTip: "정상보다 중턱에서 쉬며 앞으로의 방향을 짧게 이야기하세요.", baziInsight: "토·금이 필요한 사주는 결심과 책임의 기운이 살아나고, 수가 과한 사주는 흔들림이 잦아듭니다.", fitStrategy: "전망을 본 뒤 현실적인 계획 한 가지를 정하면 감정이 약속으로 이어집니다.", avoidWhen: "피곤한 날의 무리한 등산은 토의 안정감보다 체력 소모가 커집니다.", bestTimeHint: "공기가 맑은 오전", ritual: "가장 멀리 보이는 지점을 보며 올해 지키고 싶은 기준을 하나 정하세요." },
  ],
  metal: [
    { name: "미술관 큐레이션 투어", type: "culture", secondaryElement: "water", categoryLabel: "취향지", purposeTags: ["취향", "품격", "지적 대화"], reason: "금(金)의 미감과 수(水)의 감상이 만나 취향의 기준과 감정의 여운을 함께 보여줍니다.", actionTip: "전시 전 한 작품만 미리 정해 대화의 축을 만드세요.", baziInsight: "금이 희신인 사주는 기준이 선명해지고, 수가 보조되면 차가운 판단이 부드러운 공감으로 흐릅니다.", fitStrategy: "정답을 말하려 하기보다 오래 머문 작품의 이유를 묻는 방식이 좋습니다.", avoidWhen: "평가가 강해지는 날에는 상대의 취향을 교정하려는 말투를 피하세요.", bestTimeHint: "평일 오후의 한산한 관람 시간", ritual: "가장 조용히 마음에 남은 작품 앞에서 지금 필요한 단어 하나를 고르세요." },
    { name: "호텔 라운지", type: "city", secondaryElement: "earth", categoryLabel: "품격지", purposeTags: ["첫 만남", "신뢰", "관계 정렬"], reason: "정돈된 금(金)에 토(土)의 안정감이 받쳐져 말과 태도의 품격이 자연스럽게 드러납니다.", actionTip: "짧은 60분 티타임으로 첫 만남 밀도를 높이세요.", baziInsight: "관성·재성이 필요한 사주에는 신뢰와 현실 감각을 동시에 세워줍니다.", fitStrategy: "시간을 길게 끌기보다 명확한 약속과 차분한 질문으로 인상을 남기세요.", avoidWhen: "격식이 부담으로 느껴지는 날에는 장소의 무드가 오히려 긴장을 만들 수 있습니다.", bestTimeHint: "오후 티타임", ritual: "첫 잔을 들 때 오늘 지키고 싶은 말의 온도를 정하세요." },
    { name: "디자인 편집숍 거리", type: "daily", secondaryElement: "fire", categoryLabel: "선택지", purposeTags: ["취향 매칭", "선물", "감각"], reason: "금(金)의 선별력과 화(火)의 시각적 매력이 만나 취향 궁합을 빠르게 드러냅니다.", actionTip: "서로 어울리는 아이템을 하나씩 골라보세요.", baziInsight: "금이 약한 사주는 선택 기준을 세우고, 화가 보조되면 표현력이 밝아집니다.", fitStrategy: "상대에게 어울리는 물건을 고르는 과정에서 관찰력과 배려가 자연스럽게 보입니다.", avoidWhen: "비교와 평가가 많아지면 금의 날카로움이 관계를 차갑게 만들 수 있습니다.", bestTimeHint: "붐비기 전 낮 시간", ritual: "작은 물건 하나를 오늘의 행운 부적으로 정해보세요." },
    { name: "비즈니스 북카페", type: "cafe", secondaryElement: "water", categoryLabel: "집중지", purposeTags: ["공부", "일", "목표"], reason: "금(金)의 정리력과 수(水)의 사고 흐름이 만나 목표와 감정을 차분하게 배열합니다.", actionTip: "대화 시작 전 오늘의 목표를 한 줄로 말해보세요.", baziInsight: "인성·관성 흐름이 필요한 사주에는 공부운과 신뢰운이 함께 살아납니다.", fitStrategy: "서로의 목표를 묻고 작은 응원을 남기면 관계가 생산적인 호감으로 이어집니다.", avoidWhen: "업무 스트레스가 큰 날에는 만남이 평가처럼 느껴질 수 있습니다.", bestTimeHint: "오전 10시 전후", ritual: "노트 첫 줄에 지금 가장 정리하고 싶은 마음을 한 문장으로 적으세요." },
    { name: "아트 호텔 시티트립", type: "travel", secondaryElement: "earth", categoryLabel: "격상지", purposeTags: ["여행", "관계 격상", "기념일"], reason: "도시의 금(金)과 숙소의 토(土)가 만나 관계의 격을 높이고 기억을 오래 보존합니다.", actionTip: "체크인 후 로비 전시를 먼저 함께 보세요.", baziInsight: "금·토가 필요한 사주는 관계의 형태와 약속을 분명히 잡는 데 유리합니다.", fitStrategy: "동선은 단순하게, 식사와 산책은 여유 있게 잡으면 세련된 안정감이 살아납니다.", avoidWhen: "비용 부담이 큰 일정은 재성 압박을 키울 수 있으니 예산을 먼저 맞추세요.", bestTimeHint: "기념일 전후의 평일", ritual: "객실에 들어가기 전 오늘 남기고 싶은 기억의 이름을 정하세요." },
    { name: "금속공예 원데이 클래스", type: "culture", secondaryElement: "earth", categoryLabel: "결실지", purposeTags: ["완성", "결단", "선물"], reason: "금(金)의 완성력과 토(土)의 손맛이 만나 관계의 약속을 눈에 보이는 형태로 남깁니다.", actionTip: "작은 반지나 키링처럼 매일 볼 수 있는 물건을 만들어보세요.", baziInsight: "관성이 약한 사주는 결단력을 보완하고, 토가 보조되면 관계의 지속성이 강해집니다.", fitStrategy: "완성품의 흠보다 만든 사람의 집중을 칭찬하면 관계가 단단해집니다.", avoidWhen: "손재주 비교가 생기면 금의 날카로움이 올라오니 결과보다 의미를 우선하세요.", bestTimeHint: "집중력이 살아나는 낮 시간", ritual: "완성품에 마음속 약속 하나를 조용히 새기듯 담아보세요." },
  ],
  water: [
    { name: "강변 산책길", type: "water", secondaryElement: "wood", categoryLabel: "정화지", purposeTags: ["감정 정리", "대화", "회복"], reason: "수(水)의 흐름에 목(木)의 산책 리듬이 더해져 굳은 감정을 풀고 말의 결을 부드럽게 합니다.", actionTip: "해질 무렵 30분 걷고 카페로 이동하세요.", baziInsight: "수가 부족한 사주는 공감력을 회복하고, 목이 보조되면 다음 관계로 자라날 여지가 생깁니다.", fitStrategy: "한 방향을 보며 걷는 대화는 부담을 줄이고 진심을 천천히 끌어냅니다.", avoidWhen: "찬 바람이 강한 밤에는 수의 기운이 과해져 감정이 가라앉을 수 있습니다.", bestTimeHint: "노을 직전", ritual: "물결을 보며 지금 흘려보내도 되는 감정 하나를 조용히 정하세요." },
    { name: "바다 근처 조용한 카페", type: "cafe", secondaryElement: "wood", categoryLabel: "대길지", purposeTags: ["공감", "여행", "깊은 대화"], reason: "바다는 수(水)의 큰 파동이고 카페의 목(木)은 그 감정을 말과 인연의 싹으로 바꿉니다.", actionTip: "창가 자리를 고르고 휴대폰은 잠시 내려두세요.", baziInsight: "수·목이 필요한 사주에는 직관과 성장 운이 함께 열리고, 화가 과한 사주에는 마음의 온도를 낮춰줍니다.", fitStrategy: "바다를 함께 바라본 뒤 오래 기억나는 여행 이야기를 나누면 감정선이 깊어집니다.", avoidWhen: "비바람이 거친 날에는 수 기운이 지나쳐 우울감이 커질 수 있습니다.", bestTimeHint: "흐린 오후보다 맑은 오전 또는 노을", ritual: "파도 소리가 들리는 순간 다음에 가고 싶은 장소를 하나 말해보세요." },
    { name: "재즈 바", type: "night", secondaryElement: "fire", categoryLabel: "몽환지", purposeTags: ["감성", "여운", "홍염"], reason: "수(水)의 음악성과 화(火)의 낮은 조명이 만나 감정의 깊이와 설렘을 동시에 흔듭니다.", actionTip: "첫 곡이 끝난 뒤 한 줄 감상을 공유해 보세요.", baziInsight: "수와 화가 균형 잡히면 차분한 친밀감과 매혹이 함께 살아나 인연의 기억이 진해집니다.", fitStrategy: "말을 많이 하기보다 음악 사이의 짧은 문장으로 분위기를 이어가세요.", avoidWhen: "술이 과해지면 수의 감정 과몰입과 화의 충동성이 동시에 올라올 수 있습니다.", bestTimeHint: "첫 세트가 시작되는 이른 밤", ritual: "오늘의 곡 하나를 정해 둘만의 분위기 표식으로 남기세요." },
    { name: "수족관", type: "water", secondaryElement: "metal", categoryLabel: "직관지", purposeTags: ["편안함", "관찰", "느린 호감"], reason: "수(水)의 유영과 금(金)의 투명한 경계가 감정을 안전하게 열고 관찰력을 맑게 합니다.", actionTip: "가장 오래 본 공간의 이유를 서로 말해보세요.", baziInsight: "수가 약한 사주는 마음의 긴장을 낮추고, 금이 보조되면 관계를 차분히 분별할 수 있습니다.", fitStrategy: "정면 대화보다 같은 방향을 보며 감상을 나누면 부담 없는 친밀감이 생깁니다.", avoidWhen: "사람이 몰리는 주말 오후에는 수의 안정감이 깨질 수 있습니다.", bestTimeHint: "평일 늦은 오후", ritual: "가장 마음이 편해진 수조 앞에서 지금 필요한 감정의 이름을 붙여보세요." },
    { name: "항구 도시 숙소", type: "travel", secondaryElement: "metal", categoryLabel: "역마지", purposeTags: ["이동운", "우연", "장거리 인연"], reason: "수(水)의 이동성과 금(金)의 항구 질서가 만나 예상 밖의 만남과 귀인 접점을 열어줍니다.", actionTip: "체크인 당일 저녁에 짧은 야간 산책을 넣으세요.", baziInsight: "역마 신호가 있는 사주에는 이동 자체가 인연의 문이고, 금이 보조되면 우연이 약속으로 정리됩니다.", fitStrategy: "일정을 빽빽하게 채우지 말고 항구 산책과 조용한 식사를 중심에 두세요.", avoidWhen: "이동 피로가 큰 날에는 감정 판단이 흐려질 수 있으니 결정을 미루세요.", bestTimeHint: "도착 첫날의 저녁", ritual: "항구의 불빛을 보며 지금 다가오는 인연에게 열어둘 문 하나를 정하세요." },
    { name: "호수 둘레길과 온실", type: "nature", secondaryElement: "wood", categoryLabel: "완충지", purposeTags: ["치유", "관계 완화", "산책"], reason: "잔잔한 수(水)와 온실의 목(木)이 만나 감정을 부드럽게 순환시키고 관계의 굳은 지점을 풀어냅니다.", actionTip: "호수 한 바퀴 뒤 온실이나 카페에서 짧게 정리 대화를 나누세요.", baziInsight: "수가 부족하면 마음의 유연성을, 목이 부족하면 다시 시작할 힘을 보완합니다.", fitStrategy: "감정의 결론을 서두르기보다 지금 편해진 부분부터 말하면 좋습니다.", avoidWhen: "비가 많이 오거나 습도가 높은 날에는 기운이 무겁게 가라앉을 수 있습니다.", bestTimeHint: "햇빛이 물 위에 남은 늦은 오후", ritual: "물가에서 세 걸음 천천히 걷고, 관계에 필요한 단어 하나를 마음속에 띄워보세요." },
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
