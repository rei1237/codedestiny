import {
  normalizeIndex,
  relationFromForwardDistance,
} from "./sukuyo-relation-core.js";

const SUKUYO_MONTH_START = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];

const SUKUYO_MANSIONS = [
  { nameKo: "각", nameHan: "角", nameJp: "Kaku", direction: "동방", element: "목", animalSymbol: "청룡", category: "청룡", archetypeTitle: "개척의 뿔", keywords: ["개척", "시작", "비전"], strengths: ["시작 추진력", "선도 감각"], shadows: ["조급함", "과속"] },
  { nameKo: "항", nameHan: "亢", nameJp: "Kou", direction: "동방", element: "금", animalSymbol: "청룡", category: "청룡", archetypeTitle: "원칙의 목", keywords: ["원칙", "신뢰", "의지"], strengths: ["지속성", "원칙 준수"], shadows: ["경직", "완고함"] },
  { nameKo: "저", nameHan: "氐", nameJp: "Tei", direction: "동방", element: "토", animalSymbol: "청룡", category: "청룡", archetypeTitle: "뿌리의 발", keywords: ["내실", "안정", "축적"], strengths: ["인내", "실행력"], shadows: ["감정 축적", "느린 전환"] },
  { nameKo: "방", nameHan: "房", nameJp: "Bou", direction: "동방", element: "일", animalSymbol: "청룡", category: "청룡", archetypeTitle: "권위의 방", keywords: ["권위", "주도", "성과"], strengths: ["리더십", "협상력"], shadows: ["지배욕", "과시"] },
  { nameKo: "심", nameHan: "心", nameJp: "Shin", direction: "동방", element: "월", animalSymbol: "청룡", category: "청룡", archetypeTitle: "직관의 심", keywords: ["직관", "통찰", "집중"], strengths: ["심층 분석", "핵심 파악"], shadows: ["의심", "극단"] },
  { nameKo: "미", nameHan: "尾", nameJp: "Bi", direction: "동방", element: "화", animalSymbol: "청룡", category: "청룡", archetypeTitle: "투사의 꼬리", keywords: ["돌파", "투지", "혁신"], strengths: ["회복력", "도전"] },
  { nameKo: "기", nameHan: "箕", nameJp: "Ki", direction: "동방", element: "수", animalSymbol: "청룡", category: "청룡", archetypeTitle: "자유의 키", keywords: ["자유", "탐색", "확장"], strengths: ["적응", "확장성"], shadows: ["분산", "정착 회피"] },
  { nameKo: "두", nameHan: "斗", nameJp: "To", direction: "북방", element: "목", animalSymbol: "현무", category: "현무", archetypeTitle: "지혜의 말", keywords: ["지식", "방향", "교육"], strengths: ["가이드", "체계화"], shadows: ["훈계", "경직"] },
  { nameKo: "여", nameHan: "女", nameJp: "Jo", direction: "북방", element: "토", animalSymbol: "현무", category: "현무", archetypeTitle: "정제의 직녀", keywords: ["정제", "완성", "세밀"], strengths: ["정확성", "책임감"], shadows: ["완벽주의", "자기검열"] },
  { nameKo: "허", nameHan: "虛", nameJp: "Kyo", direction: "북방", element: "일", animalSymbol: "현무", category: "현무", archetypeTitle: "공허의 문", keywords: ["철학", "내면", "성찰"], strengths: ["사유", "통찰"], shadows: ["고립", "공허감"] },
  { nameKo: "위", nameHan: "危", nameJp: "Ki", direction: "북방", element: "월", animalSymbol: "현무", category: "현무", archetypeTitle: "벼랑의 위", keywords: ["위기", "전환", "용기"], strengths: ["위기대응", "재구성"], shadows: ["극단", "통제욕"] },
  { nameKo: "실", nameHan: "室", nameJp: "Shitsu", direction: "북방", element: "화", animalSymbol: "현무", category: "현무", archetypeTitle: "창조의 궁", keywords: ["창업", "시작", "개척"], strengths: ["개시력", "리셋"], shadows: ["마무리 약함", "급전개"] },
  { nameKo: "벽", nameHan: "壁", nameJp: "Heki", direction: "북방", element: "수", animalSymbol: "현무", category: "현무", archetypeTitle: "조화의 벽", keywords: ["조율", "관계", "중재"], strengths: ["중재력", "협업"], shadows: ["자기희생", "회피"] },
  { nameKo: "규", nameHan: "奎", nameJp: "Kei", direction: "서방", element: "목", animalSymbol: "백호", category: "백호", archetypeTitle: "전통의 붓", keywords: ["전통", "품격", "기록"], strengths: ["정돈", "지속"], shadows: ["보수성", "경직"] },
  { nameKo: "루", nameHan: "婁", nameJp: "Ro", direction: "서방", element: "금", animalSymbol: "백호", category: "백호", archetypeTitle: "연결의 결", keywords: ["사교", "연결", "확장"], strengths: ["네트워크", "친화력"], shadows: ["피상성", "과소비"] },
  { nameKo: "위", nameHan: "胃", nameJp: "I", direction: "서방", element: "토", animalSymbol: "백호", category: "백호", archetypeTitle: "축적의 창고", keywords: ["축적", "분석", "기획"], strengths: ["분석력", "자원관리"], shadows: ["과분석", "불안"] },
  { nameKo: "묘", nameHan: "昴", nameJp: "Bo", direction: "서방", element: "일", animalSymbol: "백호", category: "백호", archetypeTitle: "보호의 성단", keywords: ["돌봄", "치유", "공감"], strengths: ["보호", "신뢰"], shadows: ["과보호", "의존"] },
  { nameKo: "필", nameHan: "畢", nameJp: "Hitsu", direction: "서방", element: "월", animalSymbol: "백호", category: "백호", archetypeTitle: "장인의 그물", keywords: ["장인", "완성", "근면"], strengths: ["끈기", "완성도"], shadows: ["완고", "답답함"] },
  { nameKo: "자", nameHan: "觜", nameJp: "Shi", direction: "서방", element: "화", animalSymbol: "백호", category: "백호", archetypeTitle: "언어의 부리", keywords: ["언어", "기획", "설득"], strengths: ["표현", "전달"], shadows: ["과설명", "날선 표현"] },
  { nameKo: "삼", nameHan: "參", nameJp: "Shin", direction: "서방", element: "수", animalSymbol: "백호", category: "백호", archetypeTitle: "변혁의 사냥꾼", keywords: ["변화", "개혁", "속도"], strengths: ["혁신", "적응"], shadows: ["충돌", "소진"] },
  { nameKo: "정", nameHan: "井", nameJp: "Sei", direction: "남방", element: "목", animalSymbol: "주작", category: "주작", archetypeTitle: "이성의 우물", keywords: ["논리", "정리", "판단"], strengths: ["판단력", "정확성"], shadows: ["냉정함", "감정 억제"] },
  { nameKo: "귀", nameHan: "鬼", nameJp: "Ki", direction: "남방", element: "금", animalSymbol: "주작", category: "주작", archetypeTitle: "직감의 문", keywords: ["직감", "예감", "순발"], strengths: ["감지력", "전환력"], shadows: ["기복", "불안"] },
  { nameKo: "류", nameHan: "柳", nameJp: "Ryu", direction: "남방", element: "토", animalSymbol: "주작", category: "주작", archetypeTitle: "집념의 버들", keywords: ["집념", "헌신", "몰입"], strengths: ["몰입력", "지속력"], shadows: ["집착", "감정 소모"] },
  { nameKo: "성", nameHan: "星", nameJp: "Sei", direction: "남방", element: "일", animalSymbol: "주작", category: "주작", archetypeTitle: "승부의 별", keywords: ["승부", "리더", "추진"], strengths: ["주도권", "결단"], shadows: ["과열", "지배욕"] },
  { nameKo: "장", nameHan: "張", nameJp: "Cho", direction: "남방", element: "월", animalSymbol: "주작", category: "주작", archetypeTitle: "확장의 날개", keywords: ["확장", "표현", "무대"], strengths: ["확장성", "표현력"], shadows: ["분산", "과시"] },
  { nameKo: "익", nameHan: "翼", nameJp: "Yoku", direction: "남방", element: "화", animalSymbol: "주작", category: "주작", archetypeTitle: "완성의 날개", keywords: ["완성", "품질", "원칙"], strengths: ["정밀성", "책임감"], shadows: ["비판성", "긴장"] },
  { nameKo: "진", nameHan: "軫", nameJp: "Shin", direction: "남방", element: "수", animalSymbol: "주작", category: "주작", archetypeTitle: "전환의 수레", keywords: ["정리", "종결", "전환"], strengths: ["정리력", "마무리"], shadows: ["과경계", "결정 지연"] },
];

const SUKUYO_FORBIDDEN_REPEATED_PHRASES = [
  "류宿은 달의 리듬과 관계의 반복 패턴을 통해 삶을 읽는 숙요점 데이터입니다.",
  "이 장은 sukuyo의 상징을 단편적인 운세가 아니라 반복되는 선택 패턴으로 읽습니다.",
  "관계, 일, 돈, 감정 반응이 서로 따로 움직이지 않습니다.",
  "강점이 강하게 켜질수록 그림자도 같이 커집니다.",
  "오늘부터 7일 동안은 큰 결심보다 작은 반복을 우선하세요.",
  "1주차에는 관찰, 2주차에는 정리, 3주차에는 실험, 4주차에는 고정이 핵심입니다.",
];

const SUKUYO_PERSONAL_CHAPTER_META = [
  { key: "P1", num: 1, title: "본명숙 원형 해독 — 나의 27숙 정체성", subtitle: "사용자의 본명숙 자체를 정확하게 설명" },
  { key: "P2", num: 2, title: "달의 주기와 정서 리듬 — 월상·삭망각·조도 분석", subtitle: "lunarPhase 데이터 기반 정서 리듬 해석" },
  { key: "P3", num: 3, title: "페르소나와 첫인상 — 세상이 나를 기억하는 방식", subtitle: "외부 이미지와 사회적 인상 분석" },
  { key: "P4", num: 4, title: "자산 감각과 생활 기반 — 돈을 대하는 숙요적 태도", subtitle: "돈·안정감·재정 운영 성향 분석" },
  { key: "P5", num: 5, title: "협업과 조직 적응 — 보이지 않는 톱니바퀴", subtitle: "조직·협업·역할 최적화" },
  { key: "P6", num: 6, title: "관계 감지력 — 인간관계 레이더와 거리 조절", subtitle: "개인 숙요 기준 인간관계 감각 분석" },
  { key: "P7", num: 7, title: "위기와 전환 — 무너질 때 다시 살아나는 방식", subtitle: "위기 대응과 회복력" },
  { key: "P8", num: 8, title: "가족과 뿌리 — 정서적 기반과 소속감", subtitle: "가족·공간·정서적 기반" },
  { key: "P9", num: 9, title: "욕망과 추진력 — 내가 움직이는 진짜 이유", subtitle: "욕망·동기·추진력" },
  { key: "P10", num: 10, title: "내면 회복과 영성 — 혼자 있을 때 살아나는 힘", subtitle: "회복 루틴과 영적 성장" },
  { key: "P11", num: 11, title: "달의 주기 — 월령 에너지 사이클", subtitle: "한 달 주기 행동 우선순위" },
  { key: "P12", num: 12, title: "영혼의 마스터플랜 — 1년·3년·10년 로드맵", subtitle: "전체 종합 결론과 실행 계획" },
];

const SUKUYO_COMPAT_CHAPTER_META = [
  { key: "C1", num: 1, title: "두 사람의 원형 좌표", subtitle: "27숙 원형과 달의 좌표" },
  { key: "C2", num: 2, title: "관계 거리와 역할", subtitle: "왜 이 관계가 형성되는가" },
  { key: "C3", num: 3, title: "첫 끌림과 정서 파동", subtitle: "두 숙이 서로를 알아보는 방식" },
  { key: "C4", num: 4, title: "갈등 트리거와 그림자", subtitle: "반복 충돌과 상처 버튼" },
  { key: "C5", num: 5, title: "신뢰와 안정성", subtitle: "장기 관계의 기반" },
  { key: "C6", num: 6, title: "친밀감과 사랑 언어", subtitle: "연애 온도와 거리 조절" },
  { key: "C7", num: 7, title: "대화 구조와 오해 해소", subtitle: "말이 통하는 지점과 어긋나는 지점" },
  { key: "C8", num: 8, title: "협업·재정·생활 궁합", subtitle: "현실을 함께 운영하는 방식" },
  { key: "C9", num: 9, title: "위기 대응과 회복", subtitle: "멀어질 때와 다시 가까워질 때" },
  { key: "C10", num: 10, title: "관계 유형 심층 리딩", subtitle: "relationType 기반 정밀 해석" },
  { key: "C11", num: 11, title: "30일 관계 실행 플랜", subtitle: "거리/역할별 실전 운영" },
  { key: "C12", num: 12, title: "최종 궁합 총평", subtitle: "강점·리스크·핵심 원칙" },
];

const SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS = [
  "핵심 구조",
  "삶에서 드러나는 패턴",
  "관계/커리어/돈의 적용",
  "그림자와 주의점",
  "30일 실행 가이드",
];

const SUKUYO_NATAL_CHAPTER_SPECS = [
  { chapter: 1, title: "🌑 본명숙 원형 해독 — 나의 27숙 정체성", purpose: "사용자의 본명숙 자체를 정확하게 설명", sections: ["본명숙 계산표", "숙의 상징과 원형", "이 숙이 가진 기본 기질", "타고난 감각과 반응 속도", "가장 강한 재능 5가지", "쉽게 오해받는 지점 3가지", "이 숙을 한 문장으로 정의하면", "Chapter 1 핵심 요약"] },
  { chapter: 2, title: "🌙 달의 주기와 정서 리듬 — 월상·삭망각·조도 분석", purpose: "lunarPhase 데이터 기반 정서 리듬 해석", sections: ["월상 데이터 표", "차는 달/지는 달/보름/삭의 정서적 의미", "감정이 차오르는 방식", "에너지가 떨어지는 방식", "의사결정에 좋은 리듬", "쉬어야 하는 리듬", "감정 관리 캘린더", "Chapter 2 핵심 요약"] },
  { chapter: 3, title: "🎭 페르소나와 첫인상 — 세상이 나를 기억하는 방식", purpose: "외부 이미지와 사회적 인상 분석", sections: ["외부에 보이는 분위기", "처음 만난 사람이 느끼는 인상", "말투와 표정의 이미지 코드", "강하게 남는 기억 포인트", "브랜딩에 유리한 키워드", "과장되면 생기는 이미지 왜곡", "나답게 보이는 표현법", "Chapter 3 핵심 요약"] },
  { chapter: 4, title: "💰 자산 감각과 생활 기반 — 돈을 대하는 숙요적 태도", purpose: "돈·안정감·재정 운영 성향 분석", sections: ["돈을 대하는 기본 심리", "안정감과 소비 습관", "축적형/순환형/확장형 재물 성향", "돈을 잃기 쉬운 감정 패턴", "돈이 잘 모이는 환경", "수입원 선택 기준", "장기 재정 운영 원칙", "Chapter 4 핵심 요약"] },
  { chapter: 5, title: "⚙️ 협업과 조직 적응 — 보이지 않는 톱니바퀴", purpose: "조직·협업·역할 최적화", sections: ["조직 안에서 맡기 쉬운 역할", "협업할 때 강점", "상사/동료/후배와의 상호작용", "마찰이 생기는 업무 환경", "혼자 일할 때와 함께 일할 때의 차이", "성과가 나는 팀 구조", "피해야 할 조직 문화", "Chapter 5 핵심 요약"] },
  { chapter: 6, title: "📡 관계 감지력 — 인간관계 레이더와 거리 조절", purpose: "개인 숙요 기준 인간관계 감각 분석", sections: ["사람을 감지하는 방식", "가까워지는 속도", "신뢰가 생기는 조건", "부담을 느끼는 관계 유형", "관계에서 반복되는 오해", "건강한 거리 조절법", "좋은 인연을 알아보는 신호", "Chapter 6 핵심 요약"] },
  { chapter: 7, title: "💥 위기와 전환 — 무너질 때 다시 살아나는 방식", purpose: "위기 대응과 회복력", sections: ["위기를 느끼는 순간", "무너질 때 나타나는 반응", "다시 회복되는 방식", "큰 전환점에서 필요한 태도", "변화에 대한 본능적 저항", "위기를 기회로 바꾸는 조건", "장기적으로 강해지는 패턴", "Chapter 7 핵심 요약"] },
  { chapter: 8, title: "🏡 가족과 뿌리 — 정서적 기반과 소속감", purpose: "가족·공간·정서적 기반", sections: ["집과 공간에 대한 감각", "가족 안에서 맡기 쉬운 역할", "정서적 안정감을 느끼는 조건", "독립과 소속 사이의 균형", "과거 기억이 현재 선택에 주는 영향", "안정되는 생활 리듬", "내 공간을 운의 기반으로 만드는 법", "Chapter 8 핵심 요약"] },
  { chapter: 9, title: "🔥 욕망과 추진력 — 내가 움직이는 진짜 이유", purpose: "욕망·동기·추진력", sections: ["나를 움직이는 핵심 욕구", "목표가 생길 때의 반응", "몰입이 시작되는 조건", "열정이 식는 이유", "남에게 인정받고 싶은 지점", "욕망을 건강하게 쓰는 법", "장기 목표를 지속하는 방식", "Chapter 9 핵심 요약"] },
  { chapter: 10, title: "🧘 내면 회복과 영성 — 혼자 있을 때 살아나는 힘", purpose: "회복 루틴과 영적 성장", sections: ["혼자 있을 때의 에너지", "회복에 필요한 환경", "내면의 소리를 듣는 방식", "과도한 자극을 정리하는 법", "직관을 믿어도 되는 순간", "명상/기록/산책 등 맞춤 회복법", "영적 성숙의 방향", "Chapter 10 핵심 요약"] },
  { chapter: 11, title: "🌙 달의 주기 — 월령 에너지 사이클", purpose: "한 달 주기 행동 우선순위", sections: ["초승 단계 핵심 행동", "상현 단계 실행 전략", "보름 단계 확장 전략", "하현 단계 정리 전략", "그믐 단계 회복 전략", "주기별 감정 경보 신호", "월간 점검 질문", "Chapter 11 핵심 요약"] },
  { chapter: 12, title: "🗺️ 영혼의 마스터플랜 — 1년·3년·10년 로드맵", purpose: "전체 종합 결론과 실행 계획", sections: ["핵심 강점 5가지", "반복 리스크 5가지", "1년 집중 과제", "3년 확장 전략", "10년 장기 비전", "90일 실행표", "이번 달 즉시 행동 3가지", "Chapter 12 핵심 요약"] },
];

function toDateString(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getSukuyoByIndex(index) {
  const idx = normalizeIndex(index);
  return idx == null ? null : SUKUYO_MANSIONS[idx] || null;
}

function getSukuyoChapterMeta(reportType) {
  return reportType === "compatibility" ? SUKUYO_COMPAT_CHAPTER_META : SUKUYO_PERSONAL_CHAPTER_META;
}

function buildSukuyoFromLunar(lunarMonthRaw, lunarDayRaw, options = {}) {
  const lunarMonth = Math.max(1, Math.min(12, Math.abs(Number(lunarMonthRaw) || 1)));
  const lunarDay = Math.max(1, Math.min(30, Math.abs(Number(lunarDayRaw) || 1)));
  const start = SUKUYO_MONTH_START[lunarMonth - 1] ?? 11;
  const index = (start + lunarDay - 1) % 27;
  const item = getSukuyoByIndex(index);
  if (!item) return null;
  return {
    index,
    ...item,
    lunarMonth,
    lunarDay,
    isLeapMonth: Boolean(options.isLeapMonth),
    source: String(options.source || "korean-calendar-core"),
  };
}

function distanceLabelByRule(shortestDistance, relationType) {
  const d = Number(shortestDistance);
  if (relationType === "명" && d === 0) return "동숙";
  if (relationType === "업태") return "특수관계";
  if (d <= 4) return "근거리";
  if (d <= 10) return "중거리";
  return "원거리";
}

function clampScore(value) {
  return Math.max(5, Math.min(99, Math.round(Number(value) || 0)));
}

const ELEMENT_CREATE_MAP = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const ELEMENT_CONTROL_MAP = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

const ELEMENT_KO_MAP = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

function normalizeElementFamily(raw) {
  const token = String(raw || "").trim();
  if (token === "목") return "wood";
  if (token === "화" || token === "일") return "fire";
  if (token === "토") return "earth";
  if (token === "금") return "metal";
  if (token === "수" || token === "월") return "water";
  return "earth";
}

function distanceTierByShortest(shortestDistance) {
  const d = Number(shortestDistance);
  if (!Number.isFinite(d)) return "middle";
  if (d === 0) return "same";
  if (d <= 4) return "near";
  if (d <= 10) return "middle";
  return "far";
}

function buildDistanceMetrics(forwardDistance, reverseDistance, shortestDistance, distanceLabel) {
  const tier = distanceTierByShortest(shortestDistance);
  const tensionBand = shortestDistance <= 1
    ? "초밀착"
    : shortestDistance <= 4
      ? "근접"
      : shortestDistance <= 10
        ? "완충"
        : "원심";

  return {
    forwardDistance,
    reverseDistance,
    shortestDistance,
    tier,
    distanceLabel,
    tensionBand,
    resonanceCode: `R${(forwardDistance % 9) + 1}-${String(tier).toUpperCase()}`,
  };
}

function buildRoleActionGuide(relationType, aRole, bRole, shortestDistance, forwardDistance) {
  let meAction = "핵심 감정을 먼저 문장으로 공유하세요.";
  let otherAction = "상대 감정을 요약 확인한 뒤 결론을 내리세요.";
  let resetLine = "갈등 직후 24시간 내 사실-감정-합의 순서로 재접속하세요.";

  if (relationType === "안괴") {
    meAction = `A(${aRole})는 결론 유예를 먼저 선언하고 경계선을 명문화하세요.`;
    otherAction = `B(${bRole})는 방어적 반응 대신 요청 문장을 먼저 확인하세요.`;
    resetLine = "강한 파동 구간에서는 문제 해결보다 안정화 루틴을 우선하세요.";
  } else if (relationType === "영친") {
    meAction = `A(${aRole})는 감사와 인정 피드백을 행동으로 표현하세요.`;
    otherAction = `B(${bRole})는 편안함 속에서도 성장 과제를 주간 단위로 고정하세요.`;
  } else if (relationType === "우쇠") {
    meAction = `A(${aRole})는 불편 감정을 미루지 말고 짧은 체크인으로 해소하세요.`;
    otherAction = `B(${bRole})는 정서적 안정 신호를 반복해 피로를 낮추세요.`;
  } else if (relationType === "성위") {
    meAction = `A(${aRole})는 역할 목표와 감정 목표를 분리해 운영하세요.`;
    otherAction = `B(${bRole})는 성과보다 감정 온도를 먼저 점검하세요.`;
  }

  if (Number(forwardDistance) % 2 === 0) {
    resetLine += " 짝수 거리 조합이라 합의 후 반등 속도가 빠른 편입니다.";
  }
  if (Number(shortestDistance) <= 4) {
    resetLine += " 근거리 조합에서는 회복 시간 합의를 반드시 선행하세요.";
  }

  return { meAction, otherAction, resetLine };
}

function buildElementHarmony(aStar, bStar, relationType, shortestDistance) {
  const aElementFamily = normalizeElementFamily(aStar?.element);
  const bElementFamily = normalizeElementFamily(bStar?.element);
  let relation = "보완";
  let baseScore = 72;

  if (aElementFamily === bElementFamily) {
    relation = "동류";
    baseScore = 84;
  } else if (ELEMENT_CREATE_MAP[aElementFamily] === bElementFamily || ELEMENT_CREATE_MAP[bElementFamily] === aElementFamily) {
    relation = "상생";
    baseScore = 88;
  } else if (ELEMENT_CONTROL_MAP[aElementFamily] === bElementFamily || ELEMENT_CONTROL_MAP[bElementFamily] === aElementFamily) {
    relation = "상극";
    baseScore = 62;
  }

  if (relationType === "안괴") baseScore -= 7;
  if (relationType === "영친") baseScore += 5;
  baseScore -= Math.max(0, Number(shortestDistance) - 6);

  const harmonyScore = clampScore(baseScore);
  return {
    aElement: ELEMENT_KO_MAP[aElementFamily] || "토",
    bElement: ELEMENT_KO_MAP[bElementFamily] || "토",
    relation,
    harmonyScore,
    summary: `A ${ELEMENT_KO_MAP[aElementFamily] || "토"} · B ${ELEMENT_KO_MAP[bElementFamily] || "토"}의 ${relation} 흐름 (${harmonyScore}점)`,
  };
}

function buildStrengthShadowMap(aStar, bStar, relationType) {
  const aStrength = Array.isArray(aStar?.strengths) && aStar.strengths[0] ? aStar.strengths[0] : "현실 대응력";
  const aShadow = Array.isArray(aStar?.shadows) && aStar.shadows[0] ? aStar.shadows[0] : "과잉 해석";
  const bStrength = Array.isArray(bStar?.strengths) && bStar.strengths[0] ? bStar.strengths[0] : "정서 회복력";
  const bShadow = Array.isArray(bStar?.shadows) && bStar.shadows[0] ? bStar.shadows[0] : "회피 반응";
  let complementSummary = `A의 ${aStrength}이 B의 ${bShadow}를 완충하고, B의 ${bStrength}이 A의 ${aShadow}를 정리합니다.`;

  if (relationType === "안괴") {
    complementSummary = "강점은 빠른 변화를 만들지만 그림자 버튼이 눌리면 소모가 커집니다. 강점 사용 시점 합의가 핵심입니다.";
  }

  return {
    a: { strength: aStrength, shadow: aShadow },
    b: { strength: bStrength, shadow: bShadow },
    complementSummary,
  };
}

function buildCompatibilityIndex(scores, relationType, distanceMetrics, elementHarmony, forwardDistance) {
  const chemistryScore = Number(scores?.chemistryScore) || 0;
  const stabilityScore = Number(scores?.stabilityScore) || 0;
  const growthScore = Number(scores?.growthScore) || 0;
  const communicationScore = Number(scores?.communicationScore) || 0;
  const conflictScore = Number(scores?.conflictScore) || 0;
  const harmonyScore = Number(elementHarmony?.harmonyScore) || 70;
  const shortestDistance = Number(distanceMetrics?.shortestDistance) || 0;

  let raw = chemistryScore * 0.24
    + stabilityScore * 0.24
    + growthScore * 0.20
    + communicationScore * 0.18
    + harmonyScore * 0.14
    - conflictScore * 0.08
    - shortestDistance * 1.4;

  if (relationType === "영친") raw += 4;
  if (relationType === "안괴") raw -= 5;
  if (relationType === "업태") raw -= 3;

  raw += ((Number(forwardDistance) * 13 + 7) % 9) - 4;
  return clampScore(raw);
}

function buildRelationVariant(relationType, distanceMetrics, forwardDistance, aRole, bRole) {
  const lane = Number(forwardDistance) === 0
    ? "MIRROR"
    : Number(forwardDistance) % 3 === 0
      ? "TRIAD"
      : Number(forwardDistance) % 2 === 0
        ? "DUAL"
        : "PULSE";
  const tier = String(distanceMetrics?.tier || "middle").toUpperCase();
  return `${relationType}-${tier}-${lane}-A${aRole}B${bRole}-D${forwardDistance}`;
}

function buildRelationshipMatrix(relationType, distanceLabel, shortestDistance, compatibility = null) {
  const key = `${relationType}:${distanceLabel}`;
  const indexLabel = Number.isFinite(Number(compatibility?.compatibilityIndex)) ? `궁합 지수 ${compatibility.compatibilityIndex}` : "";
  const resonanceCode = compatibility?.distanceMetrics?.resonanceCode || key;
  return {
    emotionalPattern: {
      key,
      summary: `${relationType} 관계의 감정 파동은 ${distanceLabel} 거리에서 ${shortestDistance}칸 리듬으로 반복됩니다. ${indexLabel}`.trim(),
    },
    attractionPattern: {
      summary: `${relationType}의 끌림은 역할(${relationType})과 거리(${distanceLabel})의 조합으로 강화/완충됩니다. 공명 코드 ${resonanceCode}.`,
    },
    conflictPattern: {
      summary: `${relationType} 갈등은 관계 역할 충돌이 트리거이며 거리감이 회복 속도를 결정합니다. ${compatibility?.roleActionGuide?.resetLine || ""}`.trim(),
    },
    recoveryPattern: {
      summary: `${distanceLabel}에서는 감정 냉각 시간을 합의할수록 관계 회복 확률이 높아집니다. ${compatibility?.strengthShadowMap?.complementSummary || ""}`.trim(),
    },
    longTermPotential: {
      summary: `${relationType}의 장기성은 역할 분리와 경계 규칙의 선명도에 비례합니다. ${compatibility?.elementHarmony?.summary || ""}`.trim(),
    },
    marriagePotential: {
      summary: `${relationType}/${distanceLabel} 조합의 결혼 잠재력은 생활 리듬 합의가 핵심 변수입니다.`,
    },
    businessPotential: {
      summary: `${relationType}/${distanceLabel} 조합의 협업 잠재력은 권한-책임 분리 수준에 좌우됩니다.`,
    },
  };
}

function buildCompatibilityFromIndices(aIndexRaw, bIndexRaw) {
  const aIndex = normalizeIndex(aIndexRaw);
  const bIndex = normalizeIndex(bIndexRaw);
  if (aIndex == null || bIndex == null) return null;

  const aStar = getSukuyoByIndex(aIndex);
  const bStar = getSukuyoByIndex(bIndex);

  const total = 27;
  const forwardDistance = (bIndex - aIndex + total) % total;
  const reverseDistance = (aIndex - bIndex + total) % total;
  const shortestDistance = Math.min(forwardDistance, reverseDistance);
  const rel = relationFromForwardDistance(forwardDistance);

  const distanceLabel = distanceLabelByRule(shortestDistance, rel.relationType);
  const chemistryScore = clampScore(88 - shortestDistance * 2 + (rel.relationType === "영친" ? 8 : 0));
  const stabilityScore = clampScore(82 - shortestDistance * 2 + (rel.relationType === "영친" ? 10 : rel.relationType === "우쇠" ? 4 : 0));
  const growthScore = clampScore(76 + (rel.relationType === "안괴" ? 12 : rel.relationType === "업태" ? 10 : 4) - shortestDistance);
  const conflictScore = clampScore(34 + shortestDistance * 3 + (rel.relationType === "안괴" ? 20 : rel.relationType === "업태" ? 14 : 0));
  const communicationScore = clampScore(78 - shortestDistance * 2 + (rel.relationType === "영친" ? 8 : rel.relationType === "성위" ? 6 : 0));
  const distanceMetrics = buildDistanceMetrics(forwardDistance, reverseDistance, shortestDistance, distanceLabel);
  const roleActionGuide = buildRoleActionGuide(rel.relationType, rel.aRole, rel.bRole, shortestDistance, forwardDistance);
  const elementHarmony = buildElementHarmony(aStar, bStar, rel.relationType, shortestDistance);
  const strengthShadowMap = buildStrengthShadowMap(aStar, bStar, rel.relationType);
  const compatibilityIndex = buildCompatibilityIndex({
    chemistryScore,
    stabilityScore,
    growthScore,
    communicationScore,
    conflictScore,
  }, rel.relationType, distanceMetrics, elementHarmony, forwardDistance);
  const relationVariant = buildRelationVariant(rel.relationType, distanceMetrics, forwardDistance, rel.aRole, rel.bRole);

  return {
    forwardDistance,
    reverseDistance,
    shortestDistance,
    distanceLabel,
    relationType: rel.relationType,
    relationTypeHan: rel.relationTypeHan,
    directionFromAToB: `순행 +${forwardDistance}`,
    directionFromBToA: `역행 +${reverseDistance}`,
    aRole: rel.aRole,
    bRole: rel.bRole,
    chemistryScore,
    stabilityScore,
    growthScore,
    conflictScore,
    communicationScore,
    compatibilityIndex,
    distanceMetrics,
    roleActionGuide,
    elementHarmony,
    strengthShadowMap,
    relationVariant,
    summary: `A→B ${forwardDistance}칸, B→A ${reverseDistance}칸으로 ${rel.relationType}(${rel.aRole}/${rel.bRole}) 구조가 형성됩니다. 지수 ${compatibilityIndex}, ${relationVariant}.`,
  };
}

function buildCanonicalPerson(name, input, sukuyo) {
  const idx = Number(sukuyo?.index);
  return {
    name: String(name || "사용자"),
    birth: {
      solarDate: toDateString(input?.year, input?.month, input?.day),
      time: input?.hour == null ? null : `${String(input.hour).padStart(2, "0")}:${String(input.minute ?? 0).padStart(2, "0")}`,
      lunarDate: sukuyo ? toDateString(input?.year, sukuyo.lunarMonth, sukuyo.lunarDay) : null,
      isLeapMonth: sukuyo ? Boolean(sukuyo.isLeapMonth) : null,
    },
    sukuyo: {
      index: Number.isFinite(idx) ? idx : null,
      nameKo: sukuyo?.nameKo || "",
      nameHan: sukuyo?.nameHan || "",
      nameJp: sukuyo?.nameJp || null,
      category: sukuyo?.category || null,
      element: sukuyo?.element || null,
      direction: sukuyo?.direction || null,
      animalSymbol: sukuyo?.animalSymbol || null,
      archetypeTitle: sukuyo?.archetypeTitle || "",
      keywords: Array.isArray(sukuyo?.keywords) ? sukuyo.keywords : [],
      strengths: Array.isArray(sukuyo?.strengths) ? sukuyo.strengths : [],
      shadows: Array.isArray(sukuyo?.shadows) ? sukuyo.shadows : [],
    },
  };
}

function buildCanonicalSukuyoCompatibility(params) {
  const reportType = params?.reportType === "compatibility" ? "compatibility" : "personal";
  const personA = buildCanonicalPerson(params?.personAName, params?.personAInput, params?.personASukuyo);
  const personB = reportType === "compatibility"
    ? buildCanonicalPerson(params?.personBName, params?.personBInput, params?.personBSukuyo)
    : null;

  const compatibility = reportType === "compatibility"
    ? buildCompatibilityFromIndices(personA?.sukuyo?.index, personB?.sukuyo?.index)
    : null;

  const relationType = compatibility?.relationType || "명";
  const distanceLabel = compatibility?.distanceLabel || "동숙";

  const canonical = {
    reportType,
    calculationMeta: {
      engine: "sukuyo-27",
      calendarSource: String(params?.calendarSource || "kasi-api"),
      timezone: "Asia/Seoul",
      calculatedAt: new Date().toISOString(),
      methodVersion: String(params?.methodVersion || "sukuyo-compat-v2"),
    },
    personA,
    personB,
    compatibility,
    relationshipMatrix: reportType === "compatibility"
      ? buildRelationshipMatrix(relationType, distanceLabel, compatibility?.shortestDistance ?? 0, compatibility)
      : {
        emotionalPattern: {},
        attractionPattern: {},
        conflictPattern: {},
        recoveryPattern: {},
        longTermPotential: {},
        marriagePotential: null,
        businessPotential: null,
      },
    validation: {
      hasPersonAHost: false,
      hasPersonBHost: false,
      hasDistance: false,
      hasRelationType: false,
      hasBothDirections: false,
      missingFields: [],
    },
  };

  canonical.validation = validateCanonicalSukuyoCompatibility(canonical);
  return canonical;
}

function validateCanonicalSukuyoCompatibility(canonical) {
  const missingFields = [];
  const reportType = String(canonical?.reportType || "personal");
  const personA = canonical?.personA;
  const personB = canonical?.personB;
  const compatibility = canonical?.compatibility;

  const aIndexRaw = personA?.sukuyo?.index;
  const bIndexRaw = personB?.sukuyo?.index;
  const aIndex = Number(aIndexRaw);
  const bIndex = Number(bIndexRaw);
  const hasAIndex = aIndexRaw !== null && aIndexRaw !== undefined && Number.isFinite(aIndex) && aIndex >= 0 && aIndex <= 26;
  const hasBIndex = bIndexRaw !== null && bIndexRaw !== undefined && Number.isFinite(bIndex) && bIndex >= 0 && bIndex <= 26;

  const hasPersonAHost = hasAIndex && Boolean(String(personA?.sukuyo?.nameKo || "").trim());
  const hasPersonBHost = reportType === "compatibility"
    ? hasBIndex && Boolean(String(personB?.sukuyo?.nameKo || "").trim())
    : true;

  if (!hasAIndex) missingFields.push("personA.sukuyo.index");
  if (!String(personA?.sukuyo?.nameKo || "").trim()) missingFields.push("personA.sukuyo.nameKo");
  if (!String(personA?.birth?.lunarDate || "").trim()) missingFields.push("personA.birth.lunarDate");

  if (reportType === "compatibility") {
    if (!personB) missingFields.push("personB");
    if (!hasBIndex) missingFields.push("personB.sukuyo.index");
    if (!String(personB?.sukuyo?.nameKo || "").trim()) missingFields.push("personB.sukuyo.nameKo");
    if (!String(personB?.birth?.lunarDate || "").trim()) missingFields.push("personB.birth.lunarDate");
  }

  const hasDistance = reportType === "compatibility"
    ? Number.isFinite(Number(compatibility?.forwardDistance))
      && Number.isFinite(Number(compatibility?.reverseDistance))
    : true;

  if (reportType === "compatibility" && !Number.isFinite(Number(compatibility?.forwardDistance))) missingFields.push("compatibility.forwardDistance");
  if (reportType === "compatibility" && !Number.isFinite(Number(compatibility?.reverseDistance))) missingFields.push("compatibility.reverseDistance");

  const allowed = new Set(["명", "업태", "영친", "안괴", "우쇠", "성위"]);
  const hasRelationType = reportType === "compatibility"
    ? allowed.has(String(compatibility?.relationType || ""))
    : true;
  if (reportType === "compatibility" && !hasRelationType) missingFields.push("compatibility.relationType");

  const hasBothDirections = reportType === "compatibility"
    ? Boolean(String(compatibility?.directionFromAToB || "").trim()) && Boolean(String(compatibility?.directionFromBToA || "").trim())
    : true;
  if (reportType === "compatibility" && !hasBothDirections) missingFields.push("compatibility.direction");

  const hasCompatibilityIndex = reportType === "compatibility"
    ? Number.isFinite(Number(compatibility?.compatibilityIndex))
    : true;
  if (reportType === "compatibility" && !hasCompatibilityIndex) missingFields.push("compatibility.compatibilityIndex");

  const hasDistanceMetrics = reportType === "compatibility"
    ? Number.isFinite(Number(compatibility?.distanceMetrics?.shortestDistance))
      && Boolean(String(compatibility?.distanceMetrics?.resonanceCode || "").trim())
    : true;
  if (reportType === "compatibility" && !Number.isFinite(Number(compatibility?.distanceMetrics?.shortestDistance))) missingFields.push("compatibility.distanceMetrics.shortestDistance");
  if (reportType === "compatibility" && !String(compatibility?.distanceMetrics?.resonanceCode || "").trim()) missingFields.push("compatibility.distanceMetrics.resonanceCode");

  const hasElementHarmony = reportType === "compatibility"
    ? Boolean(String(compatibility?.elementHarmony?.relation || "").trim())
    : true;
  if (reportType === "compatibility" && !hasElementHarmony) missingFields.push("compatibility.elementHarmony.relation");

  const hasRoleActionGuide = reportType === "compatibility"
    ? Boolean(String(compatibility?.roleActionGuide?.meAction || "").trim()) && Boolean(String(compatibility?.roleActionGuide?.otherAction || "").trim())
    : true;
  if (reportType === "compatibility" && !String(compatibility?.roleActionGuide?.meAction || "").trim()) missingFields.push("compatibility.roleActionGuide.meAction");
  if (reportType === "compatibility" && !String(compatibility?.roleActionGuide?.otherAction || "").trim()) missingFields.push("compatibility.roleActionGuide.otherAction");

  const hasStrengthShadowMap = reportType === "compatibility"
    ? Boolean(String(compatibility?.strengthShadowMap?.complementSummary || "").trim())
    : true;
  if (reportType === "compatibility" && !hasStrengthShadowMap) missingFields.push("compatibility.strengthShadowMap.complementSummary");

  return {
    hasPersonAHost,
    hasPersonBHost,
    hasDistance,
    hasRelationType,
    hasBothDirections,
    hasCompatibilityIndex,
    hasDistanceMetrics,
    hasElementHarmony,
    hasRoleActionGuide,
    hasStrengthShadowMap,
    missingFields,
  };
}

function buildSukuyoDataSummaryTable(canonical) {
  const personA = canonical?.personA;
  const personB = canonical?.personB;
  const comp = canonical?.compatibility;
  const reportType = canonical?.reportType;

  const rows = [
    ["A 양력", String(personA?.birth?.solarDate || "?")],
    ["A 시각", String(personA?.birth?.time || "?")],
    ["A 숙", `${personA?.sukuyo?.nameKo || "?"}宿(${personA?.sukuyo?.nameHan || "?"})`],
    ["A index", String(personA?.sukuyo?.index ?? "?")],
  ];

  if (reportType === "compatibility") {
    rows.push(["B 양력", String(personB?.birth?.solarDate || "?")]);
    rows.push(["B 시각", String(personB?.birth?.time || "?")]);
    rows.push(["B 숙", `${personB?.sukuyo?.nameKo || "?"}宿(${personB?.sukuyo?.nameHan || "?"})`]);
    rows.push(["B index", String(personB?.sukuyo?.index ?? "?")]);
    rows.push(["A→B 거리", String(comp?.forwardDistance ?? "?")]);
    rows.push(["B→A 거리", String(comp?.reverseDistance ?? "?")]);
    rows.push(["최단 거리", String(comp?.shortestDistance ?? "?")]);
    rows.push(["관계 유형", `${comp?.relationType || "?"} (${comp?.relationTypeHan || "?"})`]);
    rows.push(["거리감", String(comp?.distanceLabel || "?")]);
    rows.push(["A 역할", String(comp?.aRole || "?")]);
    rows.push(["B 역할", String(comp?.bRole || "?")]);
    rows.push(["궁합 지수", String(comp?.compatibilityIndex ?? "?")]);
    rows.push(["거리 공명", String(comp?.distanceMetrics?.resonanceCode || "?")]);
    rows.push(["거리 텐션", String(comp?.distanceMetrics?.tensionBand || "?")]);
    rows.push(["오행 합", String(comp?.elementHarmony?.summary || "?")]);
    rows.push(["역할 액션", String(comp?.roleActionGuide?.meAction || "?")]);
    rows.push(["보완 포인트", String(comp?.strengthShadowMap?.complementSummary || "?")]);
  }

  const body = rows.map((r) => `| ${r[0]} | ${r[1]} |`).join("\n");
  return [
    "### 사용 데이터 요약표",
    "| 항목 | 값 |",
    "|---|---|",
    body,
  ].join("\n");
}

function getSukuyoNatalChapterSpec(chapter) {
  const n = Number(chapter);
  return SUKUYO_NATAL_CHAPTER_SPECS.find((s) => s.chapter === n) || null;
}

function buildCanonicalSukuyoNatal(params) {
  const input = params?.input || {};
  const profile = {
    name: String(params?.name || "사용자"),
    gender: params?.gender != null ? String(params.gender) : null,
    birth: {
      solarDate: toDateString(input.year, input.month, input.day),
      lunarDate: params?.sukuyo ? toDateString(params?.sukuyo?.lunarYear || input.year, params?.sukuyo?.lunarMonth, params?.sukuyo?.lunarDay) : null,
      time: input?.hour == null ? null : `${String(input.hour).padStart(2, "0")}:${String(input.minute ?? 0).padStart(2, "0")}`,
      timezone: "Asia/Seoul",
      isLeapMonth: params?.sukuyo ? Boolean(params.sukuyo.isLeapMonth) : null,
    },
  };

  const idx = Number(params?.sukuyo?.index);
  const mansion = params?.sukuyo || {};
  const keywords = Array.isArray(mansion.keywords) ? mansion.keywords : [];
  const strengths = Array.isArray(mansion.strengths) ? mansion.strengths : [];
  const cautions = Array.isArray(mansion.shadows) ? mansion.shadows : [];

  const canonical = {
    reportType: "sukuyo-natal-premium",
    profile,
    calculationMeta: {
      engine: "sukuyo-27",
      calendarSource: String(params?.calendarSource || "kasi-api"),
      methodVersion: String(params?.methodVersion || "sukuyo-natal-v2"),
      calculatedAt: new Date().toISOString(),
    },
    natalSukuyo: {
      index: Number.isFinite(idx) ? idx : null,
      nameKo: mansion.nameKo || "",
      nameHan: mansion.nameHan || "",
      nameJp: mansion.nameJp || null,
      group: mansion.category || null,
      direction: mansion.direction || null,
      element: mansion.element || null,
      animalSymbol: mansion.animalSymbol || null,
      deitySymbol: null,
      archetypeTitle: mansion.archetypeTitle || "",
      keywords,
      coreNature: keywords[0] ? `${keywords[0]} 기반의 성향이 핵심입니다.` : "",
      strengths,
      cautions,
      lifeTheme: mansion.archetypeTitle || "",
    },
    lunarPhase: {
      phaseName: params?.lunarPhase?.label || null,
      illumination: Number.isFinite(Number(params?.lunarPhase?.illumination)) ? Number(params.lunarPhase.illumination) : null,
      elongationAngle: Number.isFinite(Number(params?.lunarPhase?.phaseAngle)) ? Number(params.lunarPhase.phaseAngle) : null,
      waxingOrWaning: params?.lunarPhase?.waxingOrWaning || null,
      interpretationKey: params?.lunarPhase?.interpretationKey || null,
    },
    sukuyoAttributes: {
      temperament: keywords.slice(0, 3),
      relationshipStyle: strengths.slice(0, 3),
      careerStyle: strengths.slice(1, 3).concat(cautions.slice(0, 1)),
      wealthStyle: strengths.slice(0, 2).concat(cautions.slice(0, 1)),
      learningStyle: ["관찰", "축적", "반복 개선"],
      stressPattern: cautions.slice(0, 3),
      recoveryPattern: ["환경 정리", "리듬 복원", "과부하 차단"],
    },
    lifeDomains: {
      identity: { keywords },
      emotion: { lunarPhase: params?.lunarPhase?.label || null },
      persona: { archetypeTitle: mansion.archetypeTitle || null },
      career: { strengths: strengths.slice(0, 3) },
      wealth: { cautions: cautions.slice(0, 3) },
      relationship: { style: strengths.slice(0, 2) },
      crisis: { risk: cautions.slice(0, 2) },
      family: { base: keywords.slice(0, 2) },
      healthRhythm: { rhythm: params?.lunarPhase?.label || null },
      spiritualGrowth: { theme: mansion.archetypeTitle || null },
    },
    validation: {
      hasNatalSukuyo: false,
      hasIndex: false,
      hasLunarDate: false,
      hasSukuyoAttributes: false,
      hasLunarPhase: false,
      missingFields: [],
    },
  };

  canonical.validation = validateCanonicalSukuyoNatal(canonical);
  return canonical;
}

function validateCanonicalSukuyoNatal(canonical) {
  const missingFields = [];
  const natal = canonical?.natalSukuyo || {};
  const idxRaw = natal.index;
  const idx = Number(idxRaw);
  const hasIndex = idxRaw !== null && idxRaw !== undefined && Number.isFinite(idx) && idx >= 0 && idx <= 26;
  const hasNatalSukuyo = hasIndex && Boolean(String(natal.nameKo || "").trim()) && Boolean(String(natal.nameHan || "").trim());
  const hasLunarDate = Boolean(String(canonical?.profile?.birth?.lunarDate || "").trim());
  const hasSukuyoAttributes = !!canonical?.sukuyoAttributes && Object.keys(canonical.sukuyoAttributes).length > 0;
  const hasLunarPhase = canonical?.lunarPhase
    ? (canonical.lunarPhase.phaseName != null || canonical.lunarPhase.illumination != null || canonical.lunarPhase.elongationAngle != null)
    : false;

  if (!hasIndex) missingFields.push("natalSukuyo.index");
  if (!String(natal.nameKo || "").trim()) missingFields.push("natalSukuyo.nameKo");
  if (!String(natal.nameHan || "").trim()) missingFields.push("natalSukuyo.nameHan");
  if (!hasLunarDate) missingFields.push("profile.birth.lunarDate");
  if (!hasSukuyoAttributes) missingFields.push("sukuyoAttributes");

  const ref = getSukuyoByIndex(idx);
  if (hasIndex && ref && String(ref.nameKo) !== String(natal.nameKo)) {
    missingFields.push("natalSukuyo.nameKo_mismatch_with_index");
  }

  return {
    hasNatalSukuyo,
    hasIndex,
    hasLunarDate,
    hasSukuyoAttributes,
    hasLunarPhase,
    missingFields,
  };
}

function buildSukuyoNatalDataSummaryTable(canonical) {
  const p = canonical?.profile || {};
  const b = p.birth || {};
  const n = canonical?.natalSukuyo || {};
  const l = canonical?.lunarPhase || {};

  const rows = [
    ["양력 생일", String(b.solarDate || "")],
    ["음력 생일", String(b.lunarDate || "")],
    ["윤달 여부", b.isLeapMonth == null ? "false" : String(Boolean(b.isLeapMonth))],
    ["본명숙", `${n.nameKo || ""}宿 / ${n.nameHan || ""}宿`],
    ["27숙 index", String(n.index ?? "")],
    ["월상", String(l.phaseName || "")],
    ["조도", l.illumination == null ? "" : `${l.illumination}%`],
    ["삭망각", l.elongationAngle == null ? "" : `${l.elongationAngle}도`],
    ["방향", String(n.direction || "")],
    ["속성", String(n.element || "")],
    ["핵심 키워드", Array.isArray(n.keywords) ? n.keywords.join(", ") : ""],
  ];

  const body = rows.map((r) => `| ${r[0]} | ${r[1]} |`).join("\n");
  return [
    "### 계산 데이터 요약표",
    "| 항목 | 값 |",
    "|---|---|",
    body,
  ].join("\n");
}

export {
  SUKUYO_MONTH_START,
  SUKUYO_MANSIONS,
  SUKUYO_FORBIDDEN_REPEATED_PHRASES,
  SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS,
  SUKUYO_NATAL_CHAPTER_SPECS,
  SUKUYO_PERSONAL_CHAPTER_META,
  SUKUYO_COMPAT_CHAPTER_META,
  getSukuyoChapterMeta,
  getSukuyoNatalChapterSpec,
  getSukuyoByIndex,
  buildSukuyoFromLunar,
  relationFromForwardDistance,
  buildCompatibilityFromIndices,
  buildCanonicalSukuyoNatal,
  validateCanonicalSukuyoNatal,
  buildSukuyoNatalDataSummaryTable,
  buildCanonicalSukuyoCompatibility,
  validateCanonicalSukuyoCompatibility,
  buildSukuyoDataSummaryTable,
};
