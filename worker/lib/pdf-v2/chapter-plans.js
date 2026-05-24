import { ZIWEI_PDF_CHAPTERS } from "../ziwei-pdf-knowledge-base.js";
import { SUKUYO_PERSONAL_CHAPTER_META } from "../sukuyo-premium.js";
import { buildLifeBookChapterPlan } from "../saju/life-book/chapterConfig.js";
import { LOVE_SECRET_MODE_CONFIG, SAJU_NEW_YEAR_CHAPTERS } from "../saju-premium-chapters.js";
import {
  VEDIC_PERSONAL_CHAPTER_META,
  VEDIC_COMPAT_CHAPTER_META,
  VEDIC_SOLO_TARGET_CHARS,
  VEDIC_COMPAT_TARGET_CHARS,
} from "../vedic-premium-chapters.js";

const LIFEBOOK_TITLES = buildLifeBookChapterPlan().map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const LOVE_SOLO_TITLES = LOVE_SECRET_MODE_CONFIG.solo.chapters.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const LOVE_COMPAT_TITLES = LOVE_SECRET_MODE_CONFIG.couple.chapters.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const ZIWEI_TITLES = ZIWEI_PDF_CHAPTERS.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

const SUKUYO_TITLES = SUKUYO_PERSONAL_CHAPTER_META.map((meta) => String(meta?.title || "").trim()).filter(Boolean);

const VEDIC_SOLO_TITLES = VEDIC_PERSONAL_CHAPTER_META.map((meta) => String(meta?.title || "").trim()).filter(Boolean);

const VEDIC_COMPAT_TITLES = VEDIC_COMPAT_CHAPTER_META.map((meta) => String(meta?.title || "").trim()).filter(Boolean);

const ASTRO_PERSONAL_TITLES = [
  "출생차트 총론 — 하늘이 남긴 첫 설계도",
  "태양·달·상승궁 — 자아, 감정, 페르소나의 삼각형",
  "행성 배치 완전 해석 — 내 안의 열 가지 목소리",
  "12하우스 분석 — 삶이 펼쳐지는 무대",
  "주요 각도 분석 — 재능과 긴장의 숨은 회로",
  "원소·모드·극성 — 기질의 밸런스 지도",
  "사랑과 관계 — 금성, 화성, 7하우스가 말하는 애정 방식",
  "직업·재물·사회적 성공 — MC와 2·6·10하우스의 전략",
  "가족·상처·무의식 — 달, IC, 4·8·12하우스의 깊은 이야기",
  "성장·철학·영성 — 목성, 토성이 이끄는 길",
  "시기운과 변화의 흐름 — 지금부터 열리는 하늘의 리듬",
  "최종 인생 전략 — 내 별자리를 현실로 살아내는 법",
  "90일 현실 전환 플랜 — 관계·커리어·재정 실천 설계",
];

const ASTRO_PERSONAL_TARGETS = [4500, 4500, 4300, 4800, 4500, 4000, 4200, 4500, 3800, 3600, 4100, 4300];

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

const NEW_YEAR_TITLES = SAJU_NEW_YEAR_CHAPTERS.map((chapter) => String(chapter?.title || "").trim()).filter(Boolean);

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

function toCategoryId(title, index) {
  const base = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3131-\u318e\uac00-\ud7a3]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "cat"}-${String(index + 1).padStart(2, "0")}`;
}

function buildCategorySchema(titles = [], minChars = 760) {
  const typeOrder = ["summary", "structure", "strength", "risk", "timing", "strategy"];
  return (Array.isArray(titles) ? titles : []).map((title, idx) => ({
    id: toCategoryId(title, idx),
    type: typeOrder[idx] || "custom",
    title: String(title || "").trim(),
    minChars,
  }));
}

function applyCategories(chapterRows = [], categoryMap = {}) {
  return chapterRows.map((row, idx) => {
    const key = String(row?.chapterId || `chapter-${idx + 1}`);
    const categories = Array.isArray(categoryMap[key]) ? categoryMap[key] : [];
    return {
      ...row,
      categories,
    };
  });
}

const LIFE_BOOK_CATEGORY_TITLES = {
  "life-ch-01": [
    "팔자 8글자가 만드는 인생의 기본 골격",
    "일간이 세상을 버티는 방식",
    "월지가 만든 기질의 뿌리",
    "오행 균형이 보여주는 강점과 결핍",
    "십성이 드러내는 욕구와 행동 패턴",
    "원국 전체가 반복해서 요구하는 삶의 과제",
  ],
  "life-ch-02": [
    "월지에서 시작되는 성격의 뿌리",
    "조후가 결정하는 컨디션과 환경 적응력",
    "일간과 계절이 만날 때 생기는 생존 전략",
    "내면 욕구와 외부 태도의 차이",
    "타고난 장점이 살아나는 조건",
    "기질을 현실에서 안정시키는 운영법",
  ],
  "life-ch-03": [
    "용신 후보가 가리키는 인생의 보완축",
    "희신 후보가 키워주는 현실적 기회",
    "부담 오행이 만드는 반복된 막힘",
    "강점을 무기로 바꾸는 선택 기준",
    "운이 풀리는 환경과 사람의 조건",
    "기신을 피하지 않고 관리하는 방식",
  ],
  "life-ch-04": [
    "현재 대운이 요구하는 삶의 방향 전환",
    "과거 대운에서 반복된 선택 패턴",
    "다음 대운으로 넘어가기 전 준비할 것",
    "대운이 일과 돈에 미치는 압력",
    "관계와 생활 기반의 변화 흐름",
    "큰 선택을 해야 하는 시기의 기준",
  ],
  "life-ch-05": [
    "격국 후보가 보여주는 사회적 역할",
    "월지가 정하는 성공의 기본 무대",
    "관성과 재성이 만드는 성취 구조",
    "식상과 인성이 여는 전문성의 방향",
    "명예와 실속 사이의 균형점",
    "나에게 맞는 성공 방식의 설계",
  ],
  "life-ch-06": [
    "비겁이 만드는 동료와 경쟁자의 경계",
    "인성이 보여주는 보호받는 관계의 방식",
    "관성이 만드는 책임과 거리감",
    "재성이 드러내는 현실적 관계 감각",
    "가까워질수록 반복되는 관계 습관",
    "오래 갈 인연을 구분하는 기준",
  ],
  "life-ch-07": [
    "배우자성이 보여주는 끌림의 방향",
    "도화·홍염·화개가 만드는 매력의 결",
    "사랑에서 강해지는 표현 방식",
    "반복되는 연애 문제의 사주적 원인",
    "결혼과 장기 관계에서 필요한 균형",
    "사랑을 안정시키는 현실적 선택",
  ],
  "life-ch-08": [
    "재성이 열어주는 수입의 방식",
    "식상이 돈으로 연결되는 조건",
    "관성이 만드는 직업적 책임과 압박",
    "인성이 전문성으로 바뀌는 과정",
    "돈이 새는 구조와 관리해야 할 습관",
    "부의 그릇을 키우는 현실 전략",
  ],
  "life-ch-09": [
    "오행 과다에서 생기는 에너지 소모",
    "오행 부족이 만드는 회복의 약점",
    "조후가 말하는 컨디션 관리 방향",
    "감정 소모가 몸으로 드러나는 방식",
    "번아웃을 막는 생활 리듬",
    "심신 회복을 위한 현실 루틴",
  ],
  "life-ch-10": [
    "지금 가장 먼저 키워야 할 강점",
    "당장 줄여야 할 반복 습관",
    "일과 돈의 우선순위 재정렬",
    "관계에서 반드시 지켜야 할 기준",
    "대운 흐름에 맞춘 장기 전략",
    "운을 현실로 바꾸는 실행 계획",
  ],
};

const NEW_YEAR_CATEGORY_TITLES = {
  "newyear-ch-01": [
    "올해 세운이 일간에 던지는 핵심 메시지",
    "대운과 세운이 만나는 지점",
    "올해 강해지는 오행과 약해지는 오행",
    "한 해 전체를 관통하는 기회 구조",
    "올해 조심해야 할 반복 흐름",
    "연초에 세워야 할 운영 원칙",
  ],
  "newyear-ch-02": [
    "관성이 강해지는 업무 책임의 흐름",
    "식상이 성과로 바뀌는 달",
    "인성이 돕는 학습과 자격의 기회",
    "경쟁과 평가가 심해지는 시기",
    "직장·사업·프리랜서별 대응 전략",
    "커리어 승부를 걸어야 할 타이밍",
  ],
  "newyear-ch-03": [
    "재성이 열리는 수익의 입구",
    "지출이 커지는 월별 신호",
    "투자와 확장에서 조심할 구간",
    "비겁이 재물 흐름을 흔드는 방식",
    "돈을 모아야 할 달과 써야 할 달",
    "연말까지 재정을 지키는 운영법",
  ],
  "newyear-ch-04": [
    "올해 가까워지는 인연의 특징",
    "멀어지는 관계에서 배워야 할 것",
    "협업이 성과로 이어지는 조건",
    "말과 약속에서 생길 수 있는 갈등",
    "귀인과 소모적 인연을 구분하는 법",
    "관계의 거리감을 조절하는 기준",
  ],
  "newyear-ch-05": [
    "올해 연애운이 움직이는 방식",
    "감정 표현이 강해지는 시기",
    "가족과 생활 기반에서 생기는 변화",
    "솔로에게 열리는 만남의 흐름",
    "연인·배우자와 부딪히기 쉬운 지점",
    "사랑과 생활을 안정시키는 선택",
  ],
  "newyear-ch-06": [
    "올해 체력이 소모되는 오행적 이유",
    "수면과 회복 리듬이 흔들리는 시기",
    "감정 스트레스가 강해지는 달",
    "무리하면 바로 티가 나는 생활 영역",
    "계절별 컨디션 관리 기준",
    "번아웃을 막는 에너지 배분법",
  ],
  "newyear-ch-07": [
    "1분기에 반드시 잡아야 할 흐름",
    "2분기에 확장해도 되는 선택",
    "3분기에 조심해야 할 리스크",
    "4분기에 회수해야 할 성과",
    "분기별 Go 기준",
    "분기별 Stop 기준",
  ],
  "newyear-ch-08": [
    "올해 반복될 수 있는 가장 큰 실수",
    "돈과 계약에서 조심해야 할 신호",
    "사람 문제로 번질 수 있는 갈등",
    "건강과 멘탈이 흔들리는 패턴",
    "위기 전에 줄여야 할 행동",
    "문제가 생겼을 때의 복구 순서",
  ],
  "newyear-ch-09": [
    "1월과 2월의 시작 흐름",
    "3월과 4월의 확장 가능성",
    "5월과 6월의 관계·재물 조정",
    "7월과 8월의 리스크 관리",
    "9월과 10월의 성과 회수",
    "11월과 12월의 마무리 전략",
  ],
  "newyear-ch-10": [
    "올해 반드시 잡아야 할 3가지",
    "과감히 버려야 할 선택",
    "돈과 일의 우선순위",
    "관계에서 지켜야 할 선",
    "연말에 회수해야 할 성과",
    "다음 해로 넘겨야 할 준비",
  ],
};

const LOVE_SOLO_CATEGORY_TITLES = {
  "love-solo-01": [
    "일간이 사랑을 받아들이는 방식",
    "배우자성이 만드는 끌림의 방향",
    "연애에서 먼저 드러나는 나의 태도",
    "감정이 깊어질수록 나타나는 반응",
    "사랑 앞에서 반복되는 자기방어",
    "연애 자아를 안정시키는 기준",
  ],
  "love-solo-02": [
    "도화가 만드는 시선의 끌림",
    "홍염이 드러내는 감정의 온도",
    "화개가 만드는 신비감과 거리감",
    "식상이 표현력으로 바뀌는 순간",
    "상대가 강하게 반응하는 나의 분위기",
    "매력을 낭비하지 않는 사용법",
  ],
  "love-solo-03": [
    "배우자성으로 보는 끌리는 상대상",
    "나를 안정시키는 오행의 사람",
    "피해야 할 관계의 사주적 패턴",
    "오래 갈 상대와 짧게 타오를 상대",
    "관계 초반에 확인해야 할 신호",
    "좋은 인연을 알아보는 기준",
  ],
  "love-solo-04": [
    "고백과 접근이 잘 먹히는 방식",
    "연락과 거리감의 적정 리듬",
    "관계가 깊어지는 대화의 조건",
    "갈등이 생겼을 때 회복하는 순서",
    "감정 과속을 막는 현실 장치",
    "사랑을 오래 유지하는 행동 전략",
  ],
  "love-solo-05": [
    "같은 사람에게 끌리는 이유",
    "상처가 시작되는 감정의 지점",
    "집착과 회피가 번갈아 나오는 구조",
    "이별 후 회복이 느려지는 원인",
    "다시 사랑하기 전 정리해야 할 것",
    "상처를 반복하지 않는 관계 기준",
  ],
  "love-solo-06": [
    "결혼에서 중요해지는 현실 조건",
    "생활 리듬이 맞는 상대의 특징",
    "돈과 책임을 나누는 방식",
    "장기 관계에서 약해지는 지점",
    "함께 살 때 필요한 균형감",
    "오래 가는 사랑을 만드는 기준",
  ],
  "love-solo-07": [
    "지금 바꿔야 할 연애 습관",
    "30일 안에 실천할 관계 정리",
    "새로운 인연을 열기 위한 행동",
    "피해야 할 상대를 거르는 기준",
    "사랑을 안정시키는 자기관리",
    "다음 관계를 위한 최종 전략",
  ],
};

const LOVE_COMPAT_CATEGORY_TITLES = {
  "love-comp-01": [
    "두 일간이 처음 만날 때 생기는 반응",
    "오행 균형으로 보는 관계의 온도",
    "서로에게 부족한 것을 채우는 방식",
    "관계가 빠르게 가까워지는 이유",
    "처음부터 조심해야 할 갈등의 씨앗",
    "두 사람의 장기 가능성 총평",
  ],
  "love-comp-02": [
    "일간 상생·상극이 만드는 기본 흐름",
    "강한 오행이 관계를 밀어붙이는 방식",
    "부족한 오행이 상대에게 기대는 지점",
    "서로의 속도가 어긋나는 순간",
    "오행 균형을 맞추는 생활 방식",
    "관계의 에너지를 안정시키는 기준",
  ],
  "love-comp-03": [
    "말투에서 부딪히는 사주적 이유",
    "감정 표현의 속도 차이",
    "서운함이 쌓이는 방식",
    "화해가 잘 되는 대화의 조건",
    "피해야 할 말과 행동",
    "소통을 회복하는 실전 규칙",
  ],
  "love-comp-04": [
    "서로에게 끌리는 가장 강한 지점",
    "애정 표현이 다르게 전달되는 이유",
    "스킨십과 친밀감의 속도",
    "설렘이 식는 순간의 패턴",
    "다시 끌림을 살리는 행동",
    "애정을 안정적으로 표현하는 방식",
  ],
  "love-comp-05": [
    "충합형해파가 만드는 반복 갈등",
    "돈과 책임에서 부딪히는 지점",
    "자존심 싸움이 커지는 구조",
    "관계가 멀어지는 위험 신호",
    "다툼 후 회복하는 순서",
    "갈등을 줄이는 현실 합의법",
  ],
  "love-comp-06": [
    "함께 살 때 드러나는 생활 궁합",
    "가족과 현실 문제의 압력",
    "돈 관리 방식의 차이",
    "책임을 나누는 데 필요한 기준",
    "장기 관계에서 강해지는 부분",
    "결혼 가능성을 높이는 조건",
  ],
  "love-comp-07": [
    "지금 관계에서 지켜야 할 핵심",
    "당장 멈춰야 할 반복 행동",
    "함께 성장하기 위한 약속",
    "관계를 유지할 때의 기준",
    "거리를 둬야 할 때의 신호",
    "최종 선택을 위한 현실 조언",
  ],
};

function buildChapterScopedCategories(systemLabel, chapterTitle) {
  const base = String(chapterTitle || "이 챕터").trim();
  return buildCategorySchema([
    `${base}에서 읽는 ${systemLabel} 핵심 진단`,
    `${base}를 움직이는 ${systemLabel} 구조 메커니즘`,
    `${base}에서 강화해야 할 ${systemLabel} 강점 포인트`,
    `${base}에서 피해야 할 ${systemLabel} 리스크 신호`,
    `${base}의 전환 타이밍을 읽는 ${systemLabel} 기준`,
    `${base}를 현실에 적용하는 ${systemLabel} 실행 전략`,
  ]);
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
  const rows = LIFEBOOK_TITLES.map((title, i) => chapter(
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
  const categoriesById = {};
  rows.forEach((row) => {
    categoriesById[row.chapterId] = buildCategorySchema(LIFE_BOOK_CATEGORY_TITLES[row.chapterId] || buildChapterScopedCategories("사주", row.title).map((item) => item.title));
  });
  return applyCategories(rows, categoriesById);
}

function buildLoveSecretPlan(mode) {
  const titles = mode === "compatibility" ? LOVE_COMPAT_TITLES : LOVE_SOLO_TITLES;
  const rows = titles.map((title, i) => {
    const required = ["chart.dayMaster", "chart.spousePalace", "chart.tenGods"];
    if (i === 1) {
      required.push("chart.peachBlossom", "chart.hongyeom", "chart.hwagae");
    }
    if (mode === "compatibility") {
      required.push("compatibility");
    }
    return chapter(i + 1, mode === "compatibility" ? "love-comp" : "love-solo", title, 5000, 5600, required);
  });
  const categoriesById = {};
  const categorySeed = mode === "compatibility" ? LOVE_COMPAT_CATEGORY_TITLES : LOVE_SOLO_CATEGORY_TITLES;
  rows.forEach((row) => {
    categoriesById[row.chapterId] = buildCategorySchema(categorySeed[row.chapterId] || buildChapterScopedCategories("연애 사주", row.title).map((item) => item.title));
  });
  return applyCategories(rows, categoriesById);
}

function buildZiweiPlan() {
  const rows = ZIWEI_TITLES.map((title, i) => chapter(
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
  const categoriesById = {};
  rows.forEach((row) => {
    categoriesById[row.chapterId] = buildChapterScopedCategories("자미두수", row.title);
  });
  return applyCategories(rows, categoriesById);
}

function buildSookyoPlan() {
  const rows = SUKUYO_TITLES.map((title, i) => chapter(
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
  const categoriesById = {};
  rows.forEach((row) => {
    categoriesById[row.chapterId] = buildChapterScopedCategories("숙요", row.title);
  });
  return applyCategories(rows, categoriesById);
}

function buildVedicPlan(mode = "personal") {
  const isCompatibility = mode === "compatibility";
  const titles = isCompatibility ? VEDIC_COMPAT_TITLES : VEDIC_SOLO_TITLES;
  const targets = isCompatibility ? VEDIC_COMPAT_TARGET_CHARS : VEDIC_SOLO_TARGET_CHARS;
  const prefix = isCompatibility ? "vedic-comp" : "vedic-solo";
  const rows = titles.map((title, i) => {
    const target = Number(targets[i] || 4200);
    const min = Math.max(3200, Math.floor(target * 0.85));
    return chapter(
      i + 1,
      prefix,
      title,
      min,
      target,
      [
        "chart.lagna",
        "chart.planets",
        "chart.houses",
        "dasha.timeline",
      ],
    );
  });
  const categoriesById = {};
  rows.forEach((row) => {
    categoriesById[row.chapterId] = buildChapterScopedCategories("베다", row.title);
  });
  return applyCategories(rows, categoriesById);
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
  const rows = titles.map((title, i) => chapter(
    i + 1,
    prefix,
    title,
    normalizedMode === "compatibility"
      ? 3200
      : Math.max(3000, Math.floor(Number(ASTRO_PERSONAL_TARGETS[i] || 4200) * 0.85)),
    normalizedMode === "compatibility"
      ? 3900
      : Number(ASTRO_PERSONAL_TARGETS[i] || 4200),
    buildAstroRequiredFields(i + 1, normalizedMode),
  ));
  const categoriesById = {};
  rows.forEach((row) => {
    categoriesById[row.chapterId] = buildChapterScopedCategories("점성술", row.title);
  });
  return applyCategories(rows, categoriesById);
}

function buildNewYearPlan() {
  const rows = NEW_YEAR_TITLES.map((title, i) => chapter(
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
  const categoriesById = {};
  rows.forEach((row) => {
    categoriesById[row.chapterId] = buildCategorySchema(NEW_YEAR_CATEGORY_TITLES[row.chapterId] || buildChapterScopedCategories("신년 사주", row.title).map((item) => item.title));
  });
  return applyCategories(rows, categoriesById);
}

export function getPremiumPdfV2ChapterPlan(pdfType, mode = "default") {
  const type = normalizePdfType(pdfType);
  const normalizedMode = normalizeMode(mode);

  if (type === "lifeBook") return buildLifeBookPlan();
  if (type === "loveSecret") return buildLoveSecretPlan(normalizedMode);
  if (type === "ziweiPremium") return buildZiweiPlan();
  if (type === "sookyoPremium") return buildSookyoPlan();
  if (type === "vedicPremium") return buildVedicPlan(normalizedMode);
  if (type === "westernAstrologyPremium") return buildAstroPlan(normalizedMode);
  if (type === "sajuNewYear") return buildNewYearPlan();
  return [];
}
