const LIFEBOOK_TITLES = [
  "핵심 정체성",
  "타고난 성향",
  "인생의 소명",
  "직업과 사회적 방향",
  "재물 흐름",
  "관계와 사랑",
  "건강과 에너지",
  "인생 전환점",
  "반복 신호",
  "충돌 신호",
  "종합 인생 전략",
  "인생 실행 전략",
  "최종 마스터 플랜",
];

const LOVE_SOLO_TITLES = [
  "본연의 연애 자아",
  "치명적 매력과 페로몬",
  "운명의 상대방 리포트",
  "실전 연애 전략 및 스킬",
  "시기별 연애운 흐름",
  "연애의 어두운 면과 위기 관리",
  "친밀감과 감정 리듬",
  "현대적 상황별 연애 비책",
  "결혼과 정착",
  "맞춤형 연애 개운 처방전",
];

const LOVE_COMPAT_TITLES = [
  "두 사람의 연애 자아",
  "상호 매력과 페로몬",
  "운명의 상대 일치도",
  "관계 운영 커뮤니케이션",
  "시기별 궁합 흐름",
  "갈등 패턴과 위기 관리",
  "친밀감과 감정 리듬",
  "현대적 상황별 커뮤니케이션",
  "결혼 시기와 장기 정착",
  "공동 개운 처방전",
];

const ZIWEI_TITLES = [
  "명궁 완전 해석",
  "신궁 통합 해석",
  "복덕궁",
  "천이궁",
  "관록궁",
  "재백궁",
  "부처궁",
  "교우궁",
  "전택궁",
  "질액궁",
  "대운/대한 흐름",
  "유년/유월 흐름",
  "마스터플랜 총결론",
];

const SUKUYO_TITLES = [
  "영혼의 원형",
  "감정의 조수간만",
  "페르소나와 브랜딩",
  "자산의 중력",
  "보이지 않는 톱니바퀴",
  "관계의 정밀 레이더",
  "파괴적 혁신",
  "조화로운 성장",
  "정서적 유대",
  "운명적 거리",
  "달의 주기",
  "영혼의 마스터플랜",
];

const VEDIC_TITLES = [
  "카르마 블루프린트 소개",
  "라그나와 영혼의 목적",
  "문 나크샤트라",
  "다샤 흐름",
  "부와 번영의 정렬",
  "카르마와 천직",
  "나밤샤 성숙도",
  "관계 궁합 구조",
  "인연의 깊이",
  "생명력과 정화",
  "요가 분석",
  "우파야 실천",
  "고차라 연간 전략",
  "마스터플랜 결론",
];

const ASTRO_TITLES = [
  "기본 차트 요약",
  "자아와 정체성",
  "감정과 무의식",
  "사고/소통 스타일",
  "사랑/관계 스타일",
  "행동/에너지 패턴",
  "확장/행운 포인트",
  "책임/성취 구조",
  "변화/성장 트리거",
  "영혼 과제/노드 축",
  "커리어/사회적 포지션",
  "연간 흐름/실행 로드맵",
];

const NEW_YEAR_TITLES = [
  "원국 기반 연간 전략 총론",
  "연간 파동과 기회 창",
  "커리어·사업 확장 전략",
  "재물·현금흐름 관리",
  "관계·인맥·파트너십",
  "건강·에너지 밸런스",
  "학습·성장·전환 기회",
  "리스크 관리와 손실 방어",
  "12개월 월별 실행 로드맵",
  "최종 통합 액션 플랜",
];

function chapter(order, prefix, title, minChars, maxChars, requiredFields) {
  const index = String(order).padStart(2, "0");
  return {
    order,
    chapterId: `${prefix}-${index}`,
    title,
    minChars,
    maxChars,
    requiredFields: Array.isArray(requiredFields) ? requiredFields : [],
    promptTemplateId: `${prefix}-${index}`,
  };
}

function normalizePdfType(value) {
  const raw = String(value || "").trim();
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact === "lifebook" || compact === "sajulifebook") return "lifeBook";
  if (compact === "lovesecret" || compact === "sajulovesecret") return "loveSecret";
  if (compact === "ziweipremium" || compact === "jamidusupremium") return "ziweiPremium";
  if (compact === "sookyopremium" || compact === "sukuyopremium") return "sookyoPremium";
  if (compact === "vedicpremium") return "vedicPremium";
  if (compact === "westernastrologypremium" || compact === "astrologypremium") return "westernAstrologyPremium";
  if (compact === "sajunewyear" || compact === "sajunewyearpdf") return "sajuNewYear";
  return raw || "";
}

function normalizeMode(mode) {
  const raw = String(mode || "").trim().toLowerCase();
  if (!raw) return "default";
  if (raw === "compat" || raw === "couple") return "compatibility";
  return raw;
}

function buildLifeBookPlan() {
  return LIFEBOOK_TITLES.map((title, i) => chapter(
    i + 1,
    "life-ch",
    title,
    6000,
    6600,
    [
      "chart.dayMaster",
      "chart.tenGods",
      "elements.scores",
      "luckCycles.daewoon",
    ],
  ));
}

function buildLoveSecretPlan(mode) {
  const titles = mode === "compatibility" ? LOVE_COMPAT_TITLES : LOVE_SOLO_TITLES;
  return titles.map((title, i) => {
    const required = ["chart.dayMaster", "chart.spousePalace", "chart.tenGods"];
    if (i === 1) {
      required.push("chart.peachBlossom", "chart.hongyeom", "chart.hwagae");
    }
    if (mode === "compatibility") {
      required.push("compatibility");
    }
    return chapter(i + 1, mode === "compatibility" ? "love-comp" : "love-solo", title, 5000, 5600, required);
  });
}

function buildZiweiPlan() {
  return ZIWEI_TITLES.map((title, i) => chapter(
    i + 1,
    "ziwei-ch",
    title,
    5200,
    5800,
    [
      "chart.mingGong",
      "chart.shenGong",
      "palaces[].branch",
      "palaces[].mainStars",
      "palaces[].minorStars",
      "palaces[].mainStars[].strengthSymbol",
      "fourTransformations",
    ],
  ));
}

function buildSookyoPlan() {
  return SUKUYO_TITLES.map((title, i) => chapter(
    i + 1,
    "sookyo-ch",
    title,
    2400,
    3200,
    [
      "宿曜.birthMansion",
      "宿曜.coreNature",
      "fortuneCycles.monthly",
    ],
  ));
}

function buildVedicPlan() {
  return VEDIC_TITLES.map((title, i) => chapter(
    i + 1,
    "vedic-ch",
    title,
    4000,
    4500,
    [
      "chart.lagna",
      "chart.planets",
      "chart.houses",
      "dasha.timeline",
    ],
  ));
}

function buildAstroPlan() {
  return ASTRO_TITLES.map((title, i) => chapter(
    i + 1,
    "astro-ch",
    title,
    3200,
    3900,
    [
      "natalChart.sunSign",
      "natalChart.moonSign",
      "natalChart.ascendant",
      "natalChart.planets",
      "natalChart.houses",
      "natalChart.aspects",
    ],
  ));
}

function buildNewYearPlan() {
  return NEW_YEAR_TITLES.map((title, i) => chapter(
    i + 1,
    "newyear-ch",
    title,
    i === 8 ? 3200 : 2600,
    i === 8 ? 3700 : 3100,
    [
      "profile.birthDate",
      "chart.dayMaster",
      "yearlySummary",
      "monthlyLuck",
    ],
  ));
}

export function getPremiumPdfV2ChapterPlan(pdfType, mode = "default") {
  const type = normalizePdfType(pdfType);
  const normalizedMode = normalizeMode(mode);

  if (type === "lifeBook") return buildLifeBookPlan();
  if (type === "loveSecret") return buildLoveSecretPlan(normalizedMode);
  if (type === "ziweiPremium") return buildZiweiPlan();
  if (type === "sookyoPremium") return buildSookyoPlan();
  if (type === "vedicPremium") return buildVedicPlan();
  if (type === "westernAstrologyPremium") return buildAstroPlan();
  if (type === "sajuNewYear") return buildNewYearPlan();
  return [];
}
