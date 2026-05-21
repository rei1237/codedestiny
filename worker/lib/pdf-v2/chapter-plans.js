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

const ASTRO_PERSONAL_TITLES = [
  "나의 우주적 정체성 — 태양·달·상승궁의 핵심 구조",
  "에너지 밸런스 — 원소와 모드로 보는 삶의 리듬",
  "인생의 네 기둥 — ASC·IC·DSC·MC 완전 해석",
  "마음과 사고방식 — 달·수성으로 보는 내면과 언어",
  "사랑과 욕망 — 금성·화성으로 보는 관계와 끌림",
  "성장과 확장 — 목성·토성으로 보는 기회와 과제",
  "깊은 변화의 서사 — 천왕성·해왕성·명왕성의 인생 테마",
  "하우스별 인생 지도 — 삶의 12영역 해석",
  "애스펙트와 내면 패턴 — 재능, 갈등, 반복되는 운명",
  "직업·돈·사회적 성공 — 현실에서 빛나는 방식",
  "올해와 가까운 미래의 운세 로드맵",
  "점성술 인생 마스터플랜",
];

const ASTRO_COMPAT_TITLES = [
  "두 사람의 우주적 첫인상 — 관계가 시작된 이유",
  "태양과 달의 궁합 — 자아와 감정의 조화",
  "금성과 화성의 끌림 — 사랑, 욕망, 애정 표현",
  "수성과 대화 궁합 — 말, 생각, 오해의 구조",
  "7하우스와 파트너십 — 연애·결혼 관계의 핵심",
  "갈등과 상처 패턴 — 충돌 애스펙트와 감정의 그림자",
  "현실 궁합 — 돈, 일, 생활 리듬의 조화",
  "장기 인연과 성장 가능성 — 토성·목성의 관계 과제",
  "올해 두 사람의 관계 흐름",
  "최종 궁합 봉서 — 사랑, 성장, 동반자 가능성",
];

const NEW_YEAR_TITLES = [
  "연간 파동 총론 - 올해의 기본 기조",
  "커리어 전략 - 성과가 나는 월/주의 월",
  "재물 흐름 - 수익/지출 관리 타이밍",
  "관계·인맥 - 협업과 거리두기 전략",
  "연애·가정 - 감정 파동 관리법",
  "건강·에너지 - 번아웃 방지 설계",
  "분기별 핵심 의사결정 포인트",
  "리스크 시나리오와 대응 플랜",
  "12개월 Go/Stop 월별 테이블",
  "최종 실행 로드맵 - 연말 회수 전략",
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

function buildAstroRequiredFields(order, mode = "personal") {
  const common = [
    "natalChart.sunSign",
    "natalChart.moonSign",
    "natalChart.ascendant",
    "natalChart.planets",
    "natalChart.houses",
    "natalChart.aspects",
    "profile.birthDate",
  ];

  if (mode === "compatibility") {
    const byChapter = {
      1: ["relationshipData.synastry", "relationshipData.composite"],
      2: ["relationshipData.synastry.sunMoonAspects"],
      3: ["relationshipData.synastry.venusMarsAspects"],
      4: ["relationshipData.synastry.aspects"],
      5: ["relationshipData.synastry.house7Overlays"],
      6: ["relationshipData.synastry.saturnHardAspects", "relationshipData.synastry.plutoHardAspects"],
      7: ["relationshipData.reality", "careerData"],
      8: ["relationshipData.synastry.saturnHardAspects", "relationshipData.synastry.nodeContacts"],
      9: ["timingData", "relationshipData.transitFlow"],
      10: ["relationshipData.summary", "relationshipData.advice"],
    };
    return [...common, ...(byChapter[order] || [])];
  }

  const byChapter = {
    1: ["natalChart.sunSign", "natalChart.moonSign", "natalChart.ascendant"],
    2: ["elementBalance", "modalityBalance"],
    3: ["angles.ascendant", "angles.midheaven"],
    4: ["planets.moon", "planets.mercury"],
    5: ["planets.venus", "planets.mars"],
    6: ["planets.jupiter", "planets.saturn"],
    7: ["planets.uranus", "planets.neptune", "planets.pluto"],
    8: ["natalChart.houses"],
    9: ["natalChart.aspects"],
    10: ["careerData", "natalChart.houses"],
    11: ["timingData"],
    12: ["natalChart.planets", "timingData", "careerData"],
  };
  return [...common, ...(byChapter[order] || [])];
}

function buildAstroPlan(mode = "personal") {
  const normalizedMode = mode === "compatibility" ? "compatibility" : "personal";
  const titles = normalizedMode === "compatibility" ? ASTRO_COMPAT_TITLES : ASTRO_PERSONAL_TITLES;
  const prefix = normalizedMode === "compatibility" ? "astro-comp" : "astro-pers";
  return titles.map((title, i) => chapter(
    i + 1,
    prefix,
    title,
    3200,
    3900,
    buildAstroRequiredFields(i + 1, normalizedMode),
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
  if (type === "westernAstrologyPremium") return buildAstroPlan(normalizedMode);
  if (type === "sajuNewYear") return buildNewYearPlan();
  return [];
}
