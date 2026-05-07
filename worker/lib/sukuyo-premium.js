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

const SUKUYO_RELATION_HAN = {
  "명": "命",
  "업태": "業胎",
  "영친": "榮親",
  "안괴": "安壞",
  "우쇠": "友衰",
  "위성": "危成",
};

const SUKUYO_PERSONAL_CHAPTER_META = [
  { num: 1, title: "🌑 본명숙 원형 해독", subtitle: "나의 27숙 정체성" },
  { num: 2, title: "🌙 달의 주기와 정서 리듬", subtitle: "월상·삭망각·조도 분석" },
  { num: 3, title: "🎭 페르소나와 첫인상", subtitle: "세상이 나를 기억하는 방식" },
  { num: 4, title: "💰 자산 감각과 생활 기반", subtitle: "돈을 대하는 숙요적 태도" },
  { num: 5, title: "⚙️ 협업과 조직 적응", subtitle: "보이지 않는 톱니바퀴" },
  { num: 6, title: "📡 관계 감지력", subtitle: "인간관계 레이더와 거리 조절" },
  { num: 7, title: "💥 위기와 전환", subtitle: "무너질 때 다시 살아나는 방식" },
  { num: 8, title: "🏡 가족과 뿌리", subtitle: "정서적 기반과 소속감" },
  { num: 9, title: "🔥 욕망과 추진력", subtitle: "내가 움직이는 진짜 이유" },
  { num: 10, title: "🧘 내면 회복과 영성", subtitle: "혼자 있을 때 살아나는 힘" },
  { num: 11, title: "🧭 인생 방향성", subtitle: "나에게 맞는 길의 형태" },
  { num: 12, title: "📅 달빛 실천 캘린더", subtitle: "4주 루틴" },
  { num: 13, title: "🌕 숙요점 인생 총결산", subtitle: "나의 달빛 사용법" },
];

const SUKUYO_COMPAT_CHAPTER_META = [
  { num: 1, title: "두 사람의 본명숙 계산표", subtitle: "27숙 원형과 달의 좌표", icon: "🌙" },
  { num: 2, title: "관계 거리와 숙요 궁합 공식", subtitle: "왜 이 관계로 분류되는가", icon: "🧭" },
  { num: 3, title: "첫 끌림과 감정 화학작용", subtitle: "두 숙이 서로를 알아보는 방식", icon: "💞" },
  { num: 4, title: "서로의 그림자", subtitle: "반복 갈등과 상처 버튼", icon: "🪞" },
  { num: 5, title: "안정감과 장기 관계 가능성", subtitle: "결혼·동거·일상 궁합", icon: "🏡" },
  { num: 6, title: "애정 표현과 친밀감", subtitle: "연애 온도와 거리 조절", icon: "🔥" },
  { num: 7, title: "대화와 오해의 구조", subtitle: "말이 통하는 지점과 어긋나는 지점", icon: "🗣️" },
  { num: 8, title: "협업과 현실 궁합", subtitle: "일·돈·목표를 함께할 수 있는가", icon: "💼" },
  { num: 9, title: "위기 상황의 관계 반응", subtitle: "멀어질 때와 다시 가까워질 때", icon: "🌊" },
  { num: 10, title: "관계 유형별 심층 분석", subtitle: "실제 relationType 심층", icon: "🧩" },
  { num: 11, title: "30일 관계 운영 로드맵", subtitle: "관계 유형/거리별 실행 설계", icon: "📅" },
  { num: 12, title: "관계를 살리는 문장과 피해야 할 문장", subtitle: "갈등·화해 문장 실전", icon: "🕯️" },
  { num: 13, title: "최종 궁합 총평", subtitle: "점수표·장점·위험·원칙", icon: "🌕" },
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
  { chapter: 11, title: "🧭 인생 방향성 — 나에게 맞는 길의 형태", purpose: "장기 선택과 성장 방향", sections: ["나에게 맞는 삶의 속도", "선택할수록 운이 좋아지는 길", "피해야 할 삶의 방식", "직업/일의 방향성", "배우면 강해지는 분야", "사람들에게 줄 수 있는 가치", "10년 단위 성장 방향", "Chapter 11 핵심 요약"] },
  { chapter: 12, title: "📅 달빛 실천 캘린더 — 4주 루틴", purpose: "전체 리포트 기반 4주 실천 계획", sections: ["1주차: 감정 리듬 정리", "2주차: 관계 거리 조절", "3주차: 일과 돈의 기준 정리", "4주차: 나만의 성장 루틴 고정", "매주 점검 질문", "중단해야 할 습관", "새로 시작할 습관", "4주 후 점검표"] },
  { chapter: 13, title: "🌕 숙요점 인생 총결산 — 나의 달빛 사용법", purpose: "전체 종합 결론", sections: ["나를 설명하는 핵심 키워드 7개", "가장 강한 재능 5개", "가장 조심해야 할 반복 패턴 5개", "관계에서 기억할 원칙 3개", "일과 돈에서 기억할 원칙 3개", "회복을 위한 원칙 3개", "최종 달빛 메시지", "한 줄 결론"] },
];

function toDateString(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizeIndex(index) {
  const n = Number(index);
  if (!Number.isFinite(n)) return null;
  return ((Math.floor(n) % 27) + 27) % 27;
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
    source: String(options.source || "kasi-api"),
  };
}

function relationFromForwardDistance(forwardDistance) {
  const d = normalizeIndex(forwardDistance);
  if (d == null) return null;

  if (d === 0) return { relationType: "명", relationTypeHan: SUKUYO_RELATION_HAN["명"], aRole: "명", bRole: "명" };
  if ([9].includes(d)) return { relationType: "업태", relationTypeHan: SUKUYO_RELATION_HAN["업태"], aRole: "업", bRole: "태" };
  if ([18].includes(d)) return { relationType: "업태", relationTypeHan: SUKUYO_RELATION_HAN["업태"], aRole: "태", bRole: "업" };

  if ([1, 10, 19].includes(d)) return { relationType: "영친", relationTypeHan: SUKUYO_RELATION_HAN["영친"], aRole: "영", bRole: "친" };
  if ([8, 17, 26].includes(d)) return { relationType: "영친", relationTypeHan: SUKUYO_RELATION_HAN["영친"], aRole: "친", bRole: "영" };

  if ([2, 11, 20].includes(d)) return { relationType: "우쇠", relationTypeHan: SUKUYO_RELATION_HAN["우쇠"], aRole: "우", bRole: "쇠" };
  if ([7, 16, 25].includes(d)) return { relationType: "우쇠", relationTypeHan: SUKUYO_RELATION_HAN["우쇠"], aRole: "쇠", bRole: "우" };

  if ([3, 12, 21].includes(d)) return { relationType: "안괴", relationTypeHan: SUKUYO_RELATION_HAN["안괴"], aRole: "안", bRole: "괴" };
  if ([6, 15, 24].includes(d)) return { relationType: "안괴", relationTypeHan: SUKUYO_RELATION_HAN["안괴"], aRole: "괴", bRole: "안" };

  if ([4, 13, 22].includes(d)) return { relationType: "위성", relationTypeHan: SUKUYO_RELATION_HAN["위성"], aRole: "위", bRole: "성" };
  if ([5, 14, 23].includes(d)) return { relationType: "위성", relationTypeHan: SUKUYO_RELATION_HAN["위성"], aRole: "성", bRole: "위" };

  return { relationType: "명", relationTypeHan: SUKUYO_RELATION_HAN["명"], aRole: "명", bRole: "명" };
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

function buildRelationshipMatrix(relationType, distanceLabel, shortestDistance) {
  const key = `${relationType}:${distanceLabel}`;
  return {
    emotionalPattern: {
      key,
      summary: `${relationType} 관계의 감정 파동은 ${distanceLabel} 거리에서 ${shortestDistance}칸 리듬으로 반복됩니다.`,
    },
    attractionPattern: {
      summary: `${relationType}의 끌림은 역할(${relationType})과 거리(${distanceLabel})의 조합으로 강화/완충됩니다.`,
    },
    conflictPattern: {
      summary: `${relationType} 갈등은 관계 역할 충돌이 트리거이며 거리감이 회복 속도를 결정합니다.`,
    },
    recoveryPattern: {
      summary: `${distanceLabel}에서는 감정 냉각 시간을 합의할수록 관계 회복 확률이 높아집니다.`,
    },
    longTermPotential: {
      summary: `${relationType}의 장기성은 역할 분리와 경계 규칙의 선명도에 비례합니다.`,
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
  const communicationScore = clampScore(78 - shortestDistance * 2 + (rel.relationType === "영친" ? 8 : rel.relationType === "위성" ? 6 : 0));

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
    summary: `A→B ${forwardDistance}칸, B→A ${reverseDistance}칸으로 ${rel.relationType}(${rel.aRole}/${rel.bRole}) 구조가 형성됩니다.`,
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
      ? buildRelationshipMatrix(relationType, distanceLabel, compatibility?.shortestDistance ?? 0)
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

  const allowed = new Set(["명", "업태", "영친", "안괴", "우쇠", "위성"]);
  const hasRelationType = reportType === "compatibility"
    ? allowed.has(String(compatibility?.relationType || ""))
    : true;
  if (reportType === "compatibility" && !hasRelationType) missingFields.push("compatibility.relationType");

  const hasBothDirections = reportType === "compatibility"
    ? Boolean(String(compatibility?.directionFromAToB || "").trim()) && Boolean(String(compatibility?.directionFromBToA || "").trim())
    : true;
  if (reportType === "compatibility" && !hasBothDirections) missingFields.push("compatibility.direction");

  return {
    hasPersonAHost,
    hasPersonBHost,
    hasDistance,
    hasRelationType,
    hasBothDirections,
    missingFields,
  };
}

function buildSukuyoDataSummaryTable(canonical) {
  const personA = canonical?.personA;
  const personB = canonical?.personB;
  const comp = canonical?.compatibility;
  const reportType = canonical?.reportType;

  const rows = [
    ["A 숙", `${personA?.sukuyo?.nameKo || "?"}宿(${personA?.sukuyo?.nameHan || "?"})`],
    ["A index", String(personA?.sukuyo?.index ?? "?")],
  ];

  if (reportType === "compatibility") {
    rows.push(["B 숙", `${personB?.sukuyo?.nameKo || "?"}宿(${personB?.sukuyo?.nameHan || "?"})`]);
    rows.push(["B index", String(personB?.sukuyo?.index ?? "?")]);
    rows.push(["A→B 거리", String(comp?.forwardDistance ?? "?")]);
    rows.push(["B→A 거리", String(comp?.reverseDistance ?? "?")]);
    rows.push(["최단 거리", String(comp?.shortestDistance ?? "?")]);
    rows.push(["관계 유형", `${comp?.relationType || "?"} (${comp?.relationTypeHan || "?"})`]);
    rows.push(["거리감", String(comp?.distanceLabel || "?")]);
    rows.push(["A 역할", String(comp?.aRole || "?")]);
    rows.push(["B 역할", String(comp?.bRole || "?")]);
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
      careerStyle: strengths.slice(0, 3),
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
