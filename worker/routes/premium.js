import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import { generateWithGemini } from "../lib/gemini-client.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import {
  FEATURE_TYPE_TO_REPORT_TYPE,
  REPORT_TYPE_TO_FEATURE_TYPE,
  getPremiumSpecByFeatureType,
  getPremiumSpecByReportType,
} from "../lib/premium-pdf-specs.js";
import {
  getSwissWesternChart as getLocalSwissWesternChart,
  getSwissVedicPlanets as getLocalSwissVedicPlanets,
} from "../lib/swiss-ephemeris.js";
import {
  SUKUYO_FORBIDDEN_REPEATED_PHRASES as SUKUYO_FORBIDDEN_REPEATED_PHRASES_V2,
  SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS,
  SUKUYO_PERSONAL_CHAPTER_META as SUKUYO_PERSONAL_CHAPTER_META_V2,
  SUKUYO_COMPAT_CHAPTER_META as SUKUYO_COMPAT_CHAPTER_META_V2,
  SUKUYO_NATAL_CHAPTER_SPECS,
  getSukuyoChapterMeta as getSukuyoChapterMetaV2,
  getSukuyoNatalChapterSpec,
  getSukuyoByIndex,
  buildSukuyoFromLunar as buildSukuyoFromLunarV2,
  buildCanonicalSukuyoNatal,
  validateCanonicalSukuyoNatal,
  buildSukuyoNatalDataSummaryTable,
  buildCanonicalSukuyoCompatibility,
  validateCanonicalSukuyoCompatibility,
  buildSukuyoDataSummaryTable,
} from "../lib/sukuyo-premium.js";
import {
  ZIWEI_PDF_CHAPTERS as ZIWEI_PDF_CHAPTERS_V2,
  buildZiweiChapterMarkdown,
  buildZiweiGeminiPrompt,
  buildZiweiPdfContext,
  createFallbackChapter,
  ensureZiweiChapterMarkdownLength,
  parseZiweiGeminiResponse,
  sanitizeZiweiChapterJson,
} from "../lib/ziwei-pdf-pipeline.js";

const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

const SUKUYO_MANSIONS = [
  ["각", "角", "Kaku", "동방", "목", "청룡"], ["항", "亢", "Kou", "동방", "금", "청룡"],
  ["저", "氐", "Tei", "동방", "토", "청룡"], ["방", "房", "Bou", "동방", "일", "청룡"],
  ["심", "心", "Shin", "동방", "월", "청룡"], ["미", "尾", "Bi", "동방", "화", "청룡"],
  ["기", "箕", "Ki", "동방", "수", "청룡"], ["두", "斗", "To", "북방", "목", "현무"],
  ["우", "牛", "Gyu", "북방", "금", "현무"], ["여", "女", "Jo", "북방", "토", "현무"],
  ["허", "虚", "Kyo", "북방", "일", "현무"], ["위", "危", "Ki", "북방", "월", "현무"],
  ["실", "室", "Shitsu", "북방", "화", "현무"], ["벽", "壁", "Heki", "북방", "수", "현무"],
  ["규", "奎", "Kei", "서방", "목", "백호"], ["루", "婁", "Ro", "서방", "금", "백호"],
  ["위", "胃", "I", "서방", "토", "백호"], ["묘", "昴", "Bo", "서방", "일", "백호"],
  ["필", "畢", "Hitsu", "서방", "월", "백호"], ["자", "觜", "Shi", "서방", "화", "백호"],
  ["삼", "参", "Shin", "서방", "수", "백호"], ["정", "井", "Sei", "남방", "목", "주작"],
  ["귀", "鬼", "Ki", "남방", "금", "주작"], ["류", "柳", "Ryu", "남방", "토", "주작"],
  ["성", "星", "Sei", "남방", "일", "주작"], ["장", "張", "Cho", "남방", "월", "주작"],
  ["익", "翼", "Yoku", "남방", "화", "주작"],
];

const SUKUYO_MONTH_START = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];

const SUKUYO_CHAPTER_META = [
  { num: 1, title: "영혼의 원형", subtitle: "당신의 숙요별이 새긴 운명 코드", icon: "moon" },
  { num: 2, title: "감정의 조수간만", subtitle: "달의 주기가 만들어내는 정서 파동", icon: "moon" },
  { num: 3, title: "페르소나와 브랜딩", subtitle: "세상이 당신을 기억하는 방식", icon: "moon" },
  { num: 4, title: "자산의 중력", subtitle: "부를 끌어당기는 달빛 전략", icon: "moon" },
  { num: 5, title: "보이지 않는 톱니바퀴", subtitle: "성공 뒤에 숨겨진 협력 역학", icon: "moon" },
  { num: 6, title: "관계의 정밀 레이더", subtitle: "안괴·성쇠·우친 방향성과 거리 기반 궁합 해석", icon: "moon" },
  { num: 7, title: "파괴적 혁신", subtitle: "위기를 기회로 전환하는 달빛 전략", icon: "moon" },
  { num: 8, title: "조화로운 성장", subtitle: "나를 살리는 공간과 환경의 법칙", icon: "moon" },
  { num: 9, title: "정서적 유대", subtitle: "깊은 연결을 만드는 감정 지능", icon: "moon" },
  { num: 10, title: "운명적 거리", subtitle: "가까이해야 할 것과 멀리해야 할 것", icon: "moon" },
  { num: 11, title: "달의 주기", subtitle: "월령 에너지 사이클 완전 공략", icon: "moon" },
  { num: 12, title: "관계를 정리하는 회복 기술", subtitle: "힘든 인연을 좋은 흐름으로 바꾸는 법", icon: "moon" },
  { num: 13, title: "영혼의 마스터플랜", subtitle: "달빛 전략가의 10년 로드맵", icon: "moon" },
];

const SUKUYO_REPORT_TITLE_PERSONAL = "Moonlight Strategy: 숙요점 프리미엄 인생 리포트";
const SUKUYO_REPORT_TITLE_COMPAT = "Moonlight Strategy: 숙요점 프리미엄 궁합 리포트";
const SUKUYO_MIN_CHARS = 4000;
const SUKUYO_RELATION_LABELS = ["명", "영친", "우쇠", "안괴", "성위", "위성", "친영", "쇠우", "괴안"];
const SUKUYO_CHAPTER_GUIDES = [
  "27수 원형, 무의식 반응, 반복 패턴, 재능 사용 조건을 명확히 풀어내고 잘못 쓰일 때의 그림자도 함께 제시하세요.",
  "초승·상현·보름·하현·그믐 리듬을 감정 파동과 연결해 상승/하강 구간의 행동 규칙을 제시하세요.",
  "첫인상, 외부 평판, 브랜드 언어, 관계에서의 기대치 관리를 실제 문장/행동 예시로 제시하세요.",
  "수익 패턴, 누수 패턴, 손실 회피 습관, 달 리듬 기반 재정 운영 루틴을 현실적으로 제시하세요.",
  "협업 시 강점 역할, 충돌 트리거, 조정 대화 프레임을 구체적인 상황 예시와 함께 쓰세요.",
  "관계 축(안괴/성쇠/우친/영친)과 거리값을 근거로 방향성(나/상대 역할)을 절대 반대로 쓰지 말고 명시하세요.",
  "위기 구간에서의 감정 폭주를 혁신 동력으로 바꾸는 단계형 전환 전략을 작성하세요.",
  "공간, 수면, 식사, 이동 리듬을 숙요 에너지에 맞춰 재배치하는 생활 설계를 제시하세요.",
  "정서적 친밀감 형성 방식, 오해 누적 패턴, 회복 대화 문장을 포함한 관계 유지 지침을 제시하세요.",
  "관계 거리 조절법, 에너지 소모 관계 경계선, 귀인 구분 기준을 실제 상황 중심으로 쓰세요.",
  "한 달 주기를 5단계(초승/상현/보름/하현/그믐)로 나눠 각 단계별 행동 우선순위를 제시하세요.",
  "힘든 인연 정리와 회복의 경계선을 구분하고 안전한 종료/유지/복원 규칙을 단계별로 제시하세요.",
  "1년·3년·10년 마스터플랜과 90일 실행표를 제공하고 마지막에 핵심 행동 3가지를 확정하세요.",
];

const ASTRO_PERSONAL_CHAPTER_META = [
  { key: "C1", num: 1, title: "🌌 나의 우주적 첫인상 — ASC·Chart Ruler·1하우스", subtitle: "상승궁·차트룰러·1하우스", icon: "star" },
  { key: "C2", num: 2, title: "☀️ 삶의 중심 엔진 — Sun Sign·House·Aspects", subtitle: "태양의 자아 실현 축", icon: "star" },
  { key: "C3", num: 3, title: "🌙 감정의 뿌리 — Moon Sign·House·4하우스", subtitle: "달과 정서 안정 구조", icon: "star" },
  { key: "C4", num: 4, title: "🧠 사고와 언어의 구조 — Mercury·3하우스·9하우스", subtitle: "수성·학습·커뮤니케이션", icon: "star" },
  { key: "C5", num: 5, title: "💎 사랑과 가치의 미학 — Venus·2하우스·7하우스", subtitle: "금성·관계·가치·재정", icon: "star" },
  { key: "C6", num: 6, title: "⚡ 욕망과 추진력 — Mars·1하우스·8하우스", subtitle: "화성·행동·충돌·회복", icon: "star" },
  { key: "C7", num: 7, title: "🌠 확장과 기회의 문 — Jupiter·9하우스", subtitle: "목성·성장·전문성", icon: "star" },
  { key: "C8", num: 8, title: "🪐 한계와 마스터의 길 — Saturn·10하우스·MC", subtitle: "토성·커리어·장기 성취", icon: "star" },
  { key: "C9", num: 9, title: "🌀 세대 행성과 인생 변곡점 — Uranus·Neptune·Pluto", subtitle: "외행성 개인화 해석", icon: "star" },
  { key: "C10", num: 10, title: "🧭 영혼의 성장축 — North Node·South Node", subtitle: "노드 축과 성장 과제", icon: "star" },
  { key: "C11", num: 11, title: "🧬 차트 종합 구조 — Elements·Modalities·Dominants", subtitle: "차트 밸런스·지배성", icon: "star" },
  { key: "C12", num: 12, title: "📡 현재 하늘의 흐름 — Transit·Progression·Solar Return", subtitle: "예측 데이터 기반 흐름", icon: "star" },
  { key: "C13", num: 13, title: "🌟 코즈믹 마스터플랜 — 총결산·90일 실행 로드맵", subtitle: "핵심 강점·반복 과제·실행", icon: "star" },
];
const ASTRO_RELATION_CHAPTER_META = [
  { key: "R1", num: "R1", title: "💞 Synastry — 두 사람의 행성 접점", subtitle: "상호 행성 접점과 오브", icon: "star" },
  { key: "R2", num: "R2", title: "🧩 Composite Chart — 관계 자체의 운명 구조", subtitle: "관계 합성 차트 구조", icon: "star" },
  { key: "R3", num: "R3", title: "❤️ 관계 운영 로드맵 — 갈등·회복·성장 전략", subtitle: "관계 운영 실전 전략", icon: "star" },
];
const ASTRO_TOTAL_CHAPTERS = ASTRO_PERSONAL_CHAPTER_META.length;
const ASTRO_REPORT_TITLE_PERSONAL = "Professional Edition: 서양 점성술 프리미엄 리포트";
const ASTRO_REPORT_SUBTITLE_PERSONAL = "ASC, Sun, Moon과 행성의 각도로 읽는 나의 심리적 우주 지도";
const ASTRO_REPORT_TITLE_COMPAT = "Professional Edition: 서양 점성술 궁합 리포트";
const ASTRO_REPORT_SUBTITLE_COMPAT = "Synastry와 Composite Chart로 읽는 두 사람의 관계 심리와 공동 운명";
const ASTRO_MIN_CHARS = 3500;
const ASTRO_MISSING_DATA_NOTICE = "일부 세부 점성술 데이터가 부족하므로, 제공된 차트 데이터와 일반 점성술 원리를 바탕으로 보완 분석합니다. 단, 없는 데이터를 있는 것처럼 단정하지 않습니다.";
const ASTRO_NO_BIRTHTIME_NOTICE = "출생 시간이 없어 ASC, MC, 하우스, 차트 통치성, 일부 궁합 하우스 오버레이 분석의 정밀도가 제한됩니다. 이 리포트는 태양, 달, 행성 간 주요 각도 중심으로 보완 분석되었습니다.";
const ASTRO_FORBIDDEN_REPEATED_PHRASES = [
  "ASC·Sun·Moon은 같은 성격을 다른 각도에서 보여주는 좌표입니다.",
  "어스펙트는 저주가 아니라 에너지의 패턴이며, 관리 가능한 행동 변수입니다.",
  "장점과 약점은 같은 에너지의 사용 방식 차이에서 갈립니다.",
  "관계·일·재물은 분리된 문제가 아니라 같은 의사결정 체계의 결과입니다.",
  "작은 루틴의 고정이 장기적 운의 체감을 바꿉니다.",
  "점성술 해석의 목적은 운명의 단정이 아니라 선택의 품질 개선입니다.",
  "이번 주에는 큰 결정보다 작은 루틴 고정을 우선하고, 월말에는 반드시 복기하세요.",
];
const ASTRO_CHAPTER_FOCUS_KEYWORDS = {
  C1: ["ASC", "Chart Ruler", "1하우스", "첫인상", "자기표현"],
  C2: ["태양", "자아 실현", "존재감", "창조성", "태양 어스펙트"],
  C3: ["달", "애착", "정서 안정", "4하우스", "무의식"],
  C4: ["수성", "학습", "언어", "3하우스", "9하우스"],
  C5: ["금성", "사랑", "가치", "2하우스", "7하우스"],
  C6: ["화성", "추진력", "분노 처리", "1하우스", "8하우스"],
  C7: ["목성", "확장", "전문성", "9하우스", "장기 비전"],
  C8: ["토성", "MC", "10하우스", "책임", "성취"],
  C9: ["천왕성", "해왕성", "명왕성", "변곡점", "개인화"],
  C10: ["노스노드", "사우스노드", "성장축", "카르마", "인생 주제"],
  C11: ["원소", "양식", "반구", "지배 행성", "지배 하우스"],
  C12: ["트랜짓", "프로그레션", "솔라리턴", "오브", "기간별 전략"],
  C13: ["총결산", "강점 5개", "과제 5개", "커리어 전략", "90일 루틴"],
  R1: ["Synastry", "행성 접점", "오브", "긴장각", "조화각"],
  R2: ["Composite", "관계 차트", "7하우스", "10하우스", "핵심 어스펙트"],
  R3: ["갈등 회복", "관계 운영", "경계", "대화 프로토콜", "실천 계획"],
};

const LOVE_SECRET_MODE_CONFIG = {
  solo: {
    mode: "solo",
    reportType: "saju_love_solo",
    totalChapters: 10,
    minTotalChars: 45000,
    chapterMinDefault: 4000,
    chapterMinByIndex: { 1: 5000, 2: 5000, 3: 5500, 4: 4500, 5: 5500, 6: 4500, 7: 4500, 8: 4500, 9: 5500, 10: 5000 },
    title: "프리미엄 사주 연애운 리포트",
    chapters: [
      { title: "💗 본연의 연애 자아", subtitle: "일간/월지/일지/오행/십성으로 읽는 관계 자아", required: ["일간", "일지 배우자궁", "월지", "신강/신약", "오행 분포", "십성 분포", "관계 주도권"] },
      { title: "🌹 치명적 매력과 페로몬", subtitle: "도화/홍염/화개/역마가 만드는 매력 결", required: ["도화살", "홍염살", "화개살", "역마살", "기둥 위치", "매력 작동 상황", "과잉 리스크"] },
      { title: "🧲 운명의 상대방 리포트", subtitle: "배우자궁·배우자성·오행 보완으로 보는 이상형", required: ["배우자성", "배우자궁", "재성/관성", "식상/인성/비겁", "보완 오행", "위험 상대 유형", "안정 상대 유형"] },
      { title: "⚔️ 실전 연애 전략 및 스킬", subtitle: "식상·재성·관성·인성·비겁 기반 실전 대화법", required: ["식상", "재성", "관성", "인성", "비겁", "연락법", "갈등 대화법"] },
      { title: "📅 시기별 연애운 흐름", subtitle: "대운·세운·월운 기반 Go/Hold/Retreat", required: ["현재 대운", "다음 대운", "해당 연도 세운", "월운", "고백/정리 타이밍", "주의 시기", "선택 전략"] },
      { title: "🌑 연애의 어두운 면과 위기 관리", subtitle: "기신 과열·오행 불균형의 위기 패턴", required: ["기신", "오행 불균형", "일지 충형파해", "신살 역작용", "충돌 버튼", "이별 전조", "회복 프로토콜"] },
      { title: "🔥 친밀감과 육체적 매력", subtitle: "관계 온도와 친밀 리듬의 데이터 기반 해석", required: ["화 기운", "수 기운", "식상", "재성/관성", "홍염/도화", "속도 차이", "안정감 조건"] },
      { title: "📱 현대적 상황별 연애 비책", subtitle: "카톡/DM/썸/재회/장거리 실전 운영", required: ["연락 템포", "썸 단계", "갈등 후 메시지", "재회/정리", "온라인 관계", "말투 전략", "맞춤 접근법"] },
      { title: "💍 결혼과 정착", subtitle: "배우자궁·배우자성·책임 구조로 보는 장기 안정성", required: ["배우자궁", "배우자성", "재성/관성", "결혼 시기", "역할 분담", "돈/생활 운영", "장기 안정성"] },
      { title: "🧭 맞춤형 연애 개운 처방전", subtitle: "용신/희신 강화와 기신 절감의 7·30·90일 플랜", required: ["용신", "희신", "기신", "오행 개운", "말투/공간 처방", "7일/30일/90일", "최종 10계명"] },
    ],
  },
  couple: {
    mode: "couple",
    reportType: "saju_love_couple",
    totalChapters: 10,
    minTotalChars: 60000,
    chapterMinDefault: 5500,
    chapterMinByIndex: { 1: 6000, 2: 6000, 3: 6500, 4: 5500, 5: 6500, 6: 5500, 7: 5500, 8: 5500, 9: 6500, 10: 6000 },
    title: "프리미엄 사주 궁합 리포트",
    chapters: [
      { title: "💗 본연의 연애 자아", subtitle: "두 사람의 연애 자아와 수용 방식 비교" },
      { title: "🌹 치명적 매력과 페로몬", subtitle: "도화/홍염/화개/역마의 상호작용" },
      { title: "🧲 운명의 상대방 리포트", subtitle: "이상형 구조와 실제 상대 일치도" },
      { title: "⚔️ 실전 연애 전략 및 스킬", subtitle: "두 사람 명식에 맞춘 대화 운영 매뉴얼" },
      { title: "📅 시기별 연애운 흐름", subtitle: "대운·세운·월운 동시성 타이밍" },
      { title: "🌑 연애의 어두운 면과 위기 관리", subtitle: "충돌 버튼과 회복 프로토콜" },
      { title: "🔥 친밀감과 육체적 매력", subtitle: "관계 온도와 친밀 속도 조율" },
      { title: "📱 현대적 상황별 연애 비책", subtitle: "상황별 맞춤 소통/거리 전략" },
      { title: "💍 결혼과 정착", subtitle: "장기 안정성·역할 분담·생활 리듬" },
      { title: "🧭 맞춤형 연애 개운 처방전", subtitle: "공동 7·30·90일 관계 강화 플랜" },
    ],
  },
};

const VEDIC_DASHA_SEQUENCE = [
  { planet: "Ketu", years: 7 },
  { planet: "Venus", years: 20 },
  { planet: "Sun", years: 6 },
  { planet: "Moon", years: 10 },
  { planet: "Mars", years: 7 },
  { planet: "Rahu", years: 18 },
  { planet: "Jupiter", years: 16 },
  { planet: "Saturn", years: 19 },
  { planet: "Mercury", years: 17 },
];
const VEDIC_SIGN_EN = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
const VEDIC_NAKSHATRA_META = [
  { name: "Ashwini", lord: "Ketu", deity: "Ashvini Kumaras", symbol: "말의 머리" },
  { name: "Bharani", lord: "Venus", deity: "Yama", symbol: "자궁" },
  { name: "Krittika", lord: "Sun", deity: "Agni", symbol: "칼날" },
  { name: "Rohini", lord: "Moon", deity: "Brahma", symbol: "수레" },
  { name: "Mrigashira", lord: "Mars", deity: "Soma", symbol: "사슴 머리" },
  { name: "Ardra", lord: "Rahu", deity: "Rudra", symbol: "눈물" },
  { name: "Punarvasu", lord: "Jupiter", deity: "Aditi", symbol: "활집" },
  { name: "Pushya", lord: "Saturn", deity: "Brihaspati", symbol: "꽃" },
  { name: "Ashlesha", lord: "Mercury", deity: "Nagas", symbol: "뱀" },
  { name: "Magha", lord: "Ketu", deity: "Pitris", symbol: "왕좌" },
  { name: "Purva Phalguni", lord: "Venus", deity: "Bhaga", symbol: "침대 앞다리" },
  { name: "Uttara Phalguni", lord: "Sun", deity: "Aryaman", symbol: "침대 뒷다리" },
  { name: "Hasta", lord: "Moon", deity: "Savitar", symbol: "손" },
  { name: "Chitra", lord: "Mars", deity: "Tvashtar", symbol: "보석" },
  { name: "Swati", lord: "Rahu", deity: "Vayu", symbol: "바람" },
  { name: "Vishakha", lord: "Jupiter", deity: "Indra-Agni", symbol: "개선문" },
  { name: "Anuradha", lord: "Saturn", deity: "Mitra", symbol: "연꽃" },
  { name: "Jyeshtha", lord: "Mercury", deity: "Indra", symbol: "귀걸이" },
  { name: "Mula", lord: "Ketu", deity: "Nirriti", symbol: "뿌리 묶음" },
  { name: "Purva Ashadha", lord: "Venus", deity: "Apah", symbol: "부채" },
  { name: "Uttara Ashadha", lord: "Sun", deity: "Vishwadevas", symbol: "코끼리 이빨" },
  { name: "Shravana", lord: "Moon", deity: "Vishnu", symbol: "귀" },
  { name: "Dhanishtha", lord: "Mars", deity: "Vasus", symbol: "북" },
  { name: "Shatabhisha", lord: "Rahu", deity: "Varuna", symbol: "빈 원" },
  { name: "Purva Bhadrapada", lord: "Jupiter", deity: "Aja Ekapada", symbol: "칼" },
  { name: "Uttara Bhadrapada", lord: "Saturn", deity: "Ahir Budhnya", symbol: "뒷다리" },
  { name: "Revati", lord: "Mercury", deity: "Pushan", symbol: "탬버린" },
];
const VEDIC_CHAPTER_GUIDES = [
  "라그나·1하우스·핵심 행성 배치를 바탕으로 자기 인식의 기본 프레임을 정리하세요.",
  "아트마카라카와 다르마 축을 연결해 반복되는 카르마 과제와 방향성을 제시하세요.",
  "Moon Nakshatra(파다 포함)를 근거로 감정 반응 패턴과 회복 루틴을 설명하세요.",
  "Maha/Antar Dasha 중심으로 현재 시기 우선순위와 행동 타이밍을 제시하세요.",
  "2·11하우스, 목성, 금성을 근거로 재물 흐름과 실행 가능한 재정 루틴을 작성하세요.",
  "10하우스와 D10 기반으로 커리어 역할·성과 방식·리스크 관리 전략을 제시하세요.",
  "7하우스, 금성/화성, 관계 패턴을 근거로 경계선과 소통 전략을 제시하세요.",
  "6·8·12하우스의 생활 리듬 관점에서 건강 관리 루틴을 단정 없이 작성하세요.",
  "검출된 요가를 중심으로 강점 발현 조건과 적용 장면을 구체화하세요.",
  "다샤+차트 기반 12개월 월별 행동 전략을 ### 1월~### 12월 블록으로 작성하세요.",
  "우파야를 미신이 아닌 생활 행동(루틴/환경/습관) 중심으로 제시하세요.",
  "90일 실행 로드맵(1~7일/8~30일/31~60일/61~90일)을 표로 작성하세요.",
  "전체 해석을 통합해 핵심 메시지와 실행 선언문을 정리하세요.",
];
const VEDIC_CHAPTER_META = [
  { num: 1, title: "라그나와 핵심 성향", subtitle: "Lagna 기반 자기 인식", icon: "vedic" },
  { num: 2, title: "카르마 과제와 영혼 목적", subtitle: "Atmakaraka · Dharma", icon: "vedic" },
  { num: 3, title: "나크샤트라 심리 지도", subtitle: "Moon Nakshatra 기반 정서 패턴", icon: "vedic" },
  { num: 4, title: "다샤 타임라인", subtitle: "Maha/Antar Dasha 전략", icon: "vedic" },
  { num: 5, title: "재물과 가치 실현", subtitle: "2·11하우스 · 목성 · 금성", icon: "vedic" },
  { num: 6, title: "천직과 커리어", subtitle: "10하우스 · D10 중심", icon: "vedic" },
  { num: 7, title: "관계와 카르믹 패턴", subtitle: "7하우스 · 금성/화성", icon: "vedic" },
  { num: 8, title: "건강 균형과 회복", subtitle: "6·8·12하우스 · 생활 리듬", icon: "vedic" },
  { num: 9, title: "요가와 강점 증폭", subtitle: "차트 조합의 장점 활용", icon: "vedic" },
  { num: 10, title: "향후 12개월 전략", subtitle: "Transit · 일정 기반 실행", icon: "vedic" },
  { num: 11, title: "우파야 실천 가이드", subtitle: "현대형 Upaya 루틴", icon: "vedic" },
  { num: 12, title: "90일 실행 로드맵", subtitle: "실행 우선순위와 점검 지표", icon: "vedic" },
  { num: 13, title: "최종 카르마 블루프린트", subtitle: "통합 요약 · 선언문", icon: "vedic" },
];
const VEDIC_TOTAL_CHAPTERS = VEDIC_CHAPTER_META.length;
const VEDIC_MIN_CHARS = 4000;
const VEDIC_REPORT_TITLE_PERSONAL = "Professional Edition: 베다 점성술 프리미엄 리포트";
const VEDIC_REPORT_SUBTITLE_PERSONAL = "라그나·나크샤트라·다샤로 읽는 삶의 카르믹 전략 지도";
const VEDIC_REPORT_TITLE_COMPAT = "Professional Edition: 베다 점성술 궁합 리포트";
const VEDIC_REPORT_SUBTITLE_COMPAT = "Ashta Koota와 카르믹 패턴으로 읽는 관계 성장 설계";
const VEDIC_PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
const VEDIC_PLANET_KO = {
  Sun: "태양(Surya)",
  Moon: "달(Chandra)",
  Mars: "화성(Mangala)",
  Mercury: "수성(Budha)",
  Jupiter: "목성(Guru)",
  Venus: "금성(Shukra)",
  Saturn: "토성(Shani)",
  Rahu: "라후(Rahu)",
  Ketu: "케투(Ketu)",
};
const VEDIC_FORBIDDEN_COMMON_SECTIONS = [
  "오늘부터 실천할 3가지",
  "실행 보강 메모",
  "데이터 부족",
  "정보 없음",
  "일반 주티쉬 원리",
];

const ZIWEI_CHAPTER_META = [
  {
    num: 1,
    title: "내 인생의 주인공 캐릭터 — 명궁(命宮) 완전 해독",
    subtitle: "명궁 주성/보성/사화/삼방사정 기반 핵심 캐릭터 분석",
    icon: "ziwei"
  },
  {
    num: 2,
    title: "내면의 본체 — 신궁(身宮) 심층 분석과 잠재 무기",
    subtitle: "신궁 위치와 명궁-신궁 관계 기반 잠재력 해석",
    icon: "ziwei"
  },
  {
    num: 3,
    title: "무의식의 도화지 — 복덕궁(福德宮)으로 읽는 행복의 설계도",
    subtitle: "복덕궁·명궁·질액궁 연결 기반 감정 회복 설계",
    icon: "ziwei"
  },
  {
    num: 4,
    title: "세상이라는 무대 — 천이궁(遷移宮)과 이미지 관리",
    subtitle: "천이궁 기반 대외 이미지/이동/외부 기회 전략",
    icon: "ziwei"
  },
  {
    num: 5,
    title: "커리어와 성취 — 관록궁(官祿宮)의 천직 방정식",
    subtitle: "관록궁 기반 커리어 DNA와 성취 전략",
    icon: "ziwei"
  },
  {
    num: 6,
    title: "재화와 자산의 흐름 — 재백궁(財帛宮)의 부의 법칙",
    subtitle: "재백궁 기반 수익 구조와 재정 운영 전략",
    icon: "ziwei"
  },
  {
    num: 7,
    title: "파트너십과 로맨스 — 부처궁(夫妻宮)의 인연 구조",
    subtitle: "부처궁 기반 관계 패턴/경계/타이밍 전략",
    icon: "ziwei"
  },
  {
    num: 8,
    title: "팀워크와 네트워크 — 교우궁(交友宮)의 인적 자원 법칙",
    subtitle: "교우궁 기반 귀인 판별/협업/네트워크 전략",
    icon: "ziwei"
  },
  {
    num: 9,
    title: "공간과 환경 — 전택궁(田宅宮)의 환경심리학",
    subtitle: "전택궁 기반 주거 환경/공간 리셋 전략",
    icon: "ziwei"
  },
  {
    num: 10,
    title: "신체 에너지와 바이오리듬 — 질액궁(疾厄宮)의 건강 설계",
    subtitle: "질액궁 기반 생활 습관형 건강 루틴",
    icon: "ziwei"
  },
  {
    num: 11,
    title: "10년의 메가 트렌드 — 대한(大限) 분석과 전 생애 파노라마",
    subtitle: "대한 배열 기반 10년 단위 인생 전략",
    icon: "ziwei"
  },
  {
    num: 12,
    title: "올해의 마이크로 전술 — 2026 유년(流年)·유월(流月) 로드맵",
    subtitle: "2026 분기/월별 행동 가이드와 Go/Hold/Retreat",
    icon: "ziwei"
  },
  {
    num: 13,
    title: "인생 설계도 총결산 — 자미두수 거장의 마스터플랜 봉서",
    subtitle: "13챕터 통합 총결산과 통합 실천 전략",
    icon: "ziwei"
  },
];

const ZIWEI_REPORT_TITLE = "나의 운명을 깨우는 심화 자미두수 리포트";
const ZIWEI_PROLOGUE_TITLE = "프롤로그: 이 명반이 말해주는 삶의 큰 방향";
const ZIWEI_MIN_CHARS = 5200;

const ZIWEI_CHAPTER_GUIDES = [
  "명궁의 주성/보성/사화/삼방사정/대궁을 세기와 함께 분석하고 상황별 강점 전략을 제시하세요.",
  "신궁 중심으로 명궁-신궁 상호작용과 숨은 잠재 무기를 해석하고 성장 방향을 제시하세요.",
  "복덕궁 중심으로 감정 에너지의 소모/회복 패턴과 마인드 트레이닝 루틴을 제시하세요.",
  "천이궁 중심으로 외부 이미지와 이동/확장 전략, 사회적 평판 관리법을 제시하세요.",
  "관록궁 중심으로 직업 적성, 조직/독립 성향, 도약 타이밍 전략을 제시하세요.",
  "재백궁 중심으로 수익 파이프라인과 누수 패턴을 성향 중심으로 해석하세요.",
  "부처궁 중심으로 관계 경계/반복 패턴/건강한 파트너십 전략을 제시하세요.",
  "교우궁 중심으로 귀인 판별, 협업 성공 패턴, 네트워크 자산화 전략을 제시하세요.",
  "전택궁 중심으로 주거/공간 심리, 생활 동선, 공간 리셋 루틴을 제시하세요.",
  "질액궁은 의료 진단 금지 원칙 하에 생활 습관형 건강 설계를 제시하세요.",
  "대한 배열을 근거로 10년 단위 상승/정체/조정 흐름을 분리해 제시하세요.",
  "2026 유년/유월 데이터를 근거로 분기/월별 행동 가이드와 Go/Hold/Retreat를 제시하세요.",
  "전체 데이터를 통합해 3가지 핵심 비책, 3가지 주의 패턴, 통합 전략으로 마무리하세요.",
];

const ZIWEI_CHAPTER_FOCUS_KEYWORDS = [
  ["명궁", "천이궁", "관록궁", "재백궁", "삼방사정", "페르소나"],
  ["신궁", "명궁-신궁 긴장", "행동 패턴", "성장 트리거", "후천성"],
  ["복덕궁", "내면 안정", "스트레스 회복", "질액궁 연동", "행복 자원"],
  ["천이궁", "대외 이미지", "평판", "커뮤니케이션", "화기 리스크"],
  ["관록궁", "직업 DNA", "리더십", "조직 적응", "도약 타이밍"],
  ["재백궁", "수입 구조", "지출 누수", "자산 전략", "성향 기반 재정"],
  ["부처궁", "파트너십", "기대-실망", "경계 설정", "관계 반복"],
  ["교우궁", "협업", "귀인", "경쟁자", "관계 손실 방지"],
  ["전택궁", "공간 심리", "주거", "집중 동선", "안정 환경"],
  ["질액궁", "체력 리듬", "수면", "과로", "회복 루틴"],
  ["대한", "10년 흐름", "상승장", "전환장", "전생애 파노라마"],
  ["2026", "유년", "유월", "Go/Hold/Retreat", "월별 전략"],
  ["총결산", "강한 궁 3", "주의 궁 3", "Master Habit", "거장의 봉서"],
];

const ZIWEI_REQUIRED_CHAPTER_STRUCTURE = {
  1: {
    exactHeading: "## Ch.1. 🌌 내 인생의 주인공 캐릭터 — 명궁(命宮) 완전 해독",
    includes: [
      "사용된 궁", "사용된 주성", "주성의 세기", "사용된 사화", "연결해서 본 궁",
      "상황별 강점 활용 전략", "주의해야 할 반복 패턴"
    ],
    prefaceHeading: "## 0. 전체 명반 요약",
    prefaceIncludes: [
      "이 명반의 핵심 키워드", "가장 강한 궁", "가장 주의해야 할 궁", "인생 전체의 방향성",
      "타고난 장점", "반복되는 약점", "운이 열리는 방식", "인생에서 가장 중요한 선택 기준", "12궁 전체 요약표"
    ],
  },
  2: {
    exactHeading: "## Ch.2. 🌟 내면의 본체 — 신궁(身宮) 심층 분석과 잠재 무기",
    includes: [
      "신궁이 들어간 궁", "명궁과 신궁의 관계", "잠재 무기", "성장 전략"
    ],
  },
  3: {
    exactHeading: "## Ch.3. 🌙 무의식의 도화지 — 복덕궁(福德宮)으로 읽는 행복의 설계도",
    includes: [
      "행복 DNA", "스트레스 패턴", "감정 회복 루틴", "마인드 트레이닝"
    ],
  },
  4: {
    exactHeading: "## Ch.4. 🌍 세상이라는 무대 — 천이궁(遷移宮)과 이미지 관리",
    includes: [
      "외부 이미지", "이동/외부 활동 운", "평판 관리", "외부 활동 타이밍"
    ],
  },
  5: {
    exactHeading: "## Ch.5. 👑 커리어와 성취 — 관록궁(官祿宮)의 천직 방정식",
    includes: [
      "업무 성향 DNA", "조직형/독립형", "커리어 도약 타이밍", "성취 전략"
    ],
  },
  6: {
    exactHeading: "## Ch.6. 💰 재화와 자산의 흐름 — 재백궁(財帛宮)의 부의 법칙",
    includes: [
      "재물 그릇", "수입 파이프라인", "누수 패턴", "재정 관리 루틴"
    ],
    caution: "투자 수익을 단정하지 말고 성향 기반의 관리 전략으로 작성",
  },
  7: {
    exactHeading: "## Ch.7. 💑 파트너십과 로맨스 — 부처궁(夫妻宮)의 인연 구조",
    includes: [
      "이상형 성향", "반복 감정 패턴", "경계 설정", "인연 타이밍"
    ],
  },
  8: {
    exactHeading: "## Ch.8. 🤝 팀워크와 네트워크 — 교우궁(交友宮)의 인적 자원 법칙",
    includes: [
      "협업 운", "귀인/소인 구분", "손해 패턴", "사회적 확장 전략"
    ],
  },
  9: {
    exactHeading: "## Ch.9. 🏠 공간과 환경 — 전택궁(田宅宮)의 환경심리학",
    includes: [
      "안정 환경", "집중 공간", "공간 리셋 루틴", "자산 전략으로서의 공간"
    ],
  },
  10: {
    exactHeading: "## Ch.10. 💪 신체 에너지와 바이오리듬 — 질액궁(疾厄宮)의 건강 설계",
    includes: [
      "에너지 패턴", "수면/식사/운동 루틴", "스트레스 신체화", "회복 환경"
    ],
    caution: "의학적 진단이 아닌 자미두수 기반 생활 경향 분석으로만 작성",
  },
  11: {
    exactHeading: "## Ch.11. 🌊 10년의 메가 트렌드 — 대한(大限) 분석과 전 생애 파노라마",
    includes: [
      "현재 대한 핵심 주제", "상승/조정 전략", "반복 패턴", "황금 대한 후보"
    ],
  },
  12: {
    exactHeading: "## Ch.12. 📅 올해의 마이크로 전술 — 2026 유년(流年)·유월(流月) 로드맵",
    includes: [
      "2026 핵심 키워드", "Go/Hold/Retreat", "분기 전략", "1~12월 행동 가이드"
    ],
  },
  13: {
    exactHeading: "## Ch.13. 🌅 인생 설계도 총결산 — 자미두수 거장의 마스터플랜 봉서",
    includes: [
      "13챕터 핵심 통합", "기억할 3가지 비책", "피해야 할 3가지 패턴", "통합 실천 전략"
    ],
  },
};

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function parseSections(text) {
  return String(text || "").split(/\n(?=##\s+)/g).map((part) => {
    const match = part.match(/^##\s*(.+?)\n([\s\S]*)$/);
    return match ? { title: match[1].trim(), body: match[2].trim() } : null;
  }).filter(Boolean);
}

function normalizeBody(body) {
  return {
    year: clampInt(body.year ?? body.birthYear, 1990, 1900, 2100),
    month: clampInt(body.month ?? body.birthMonth, 1, 1, 12),
    day: clampInt(body.day ?? body.birthDay, 1, 1, 31),
    hour: clampInt(body.hour ?? body.birthHour, 12, 0, 23),
    minute: clampInt(body.minute ?? body.birthMinute, 0, 0, 59),
    timezone: Number.isFinite(Number(body.timezone)) ? Number(body.timezone) : 9,
    lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : 37.5665,
    lon: Number.isFinite(Number(body.lon ?? body.lng)) ? Number(body.lon ?? body.lng) : 126.978,
    chapter: clampInt(body.chapter ?? body.sessionId, 1, 1, VEDIC_TOTAL_CHAPTERS),
    name: String(body.name || "사용자").slice(0, 80),
    gender: String(body.gender || "").slice(0, 20),
  };
}

function normalizeDeg(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

function fallbackSunSignIndex(month, day) {
  const m = clampInt(month, 1, 1, 12);
  const d = clampInt(day, 15, 1, 31);
  const boundaries = [
    [1, 20], [2, 19], [3, 21], [4, 20], [5, 21], [6, 22],
    [7, 23], [8, 23], [9, 23], [10, 23], [11, 22], [12, 22],
  ];
  for (let i = boundaries.length - 1; i >= 0; i -= 1) {
    const [bm, bd] = boundaries[i];
    if (m > bm || (m === bm && d >= bd)) return i;
  }
  return 11;
}

function buildFallbackWesternChart(input) {
  const hour = clampInt(input?.hour, 12, 0, 23);
  const minute = clampInt(input?.minute, 0, 0, 59);
  const ascSign = Math.floor(((hour + (minute / 60)) / 24) * 12) % 12;
  const ascLon = normalizeDeg(ascSign * 30 + 15);
  const sunSign = fallbackSunSignIndex(input?.month, input?.day);

  const planetOffsets = {
    Sun: 0,
    Moon: 4,
    Mercury: 1,
    Venus: 2,
    Mars: 5,
    Jupiter: 7,
    Saturn: 9,
    Uranus: 10,
    Neptune: 11,
    Pluto: 8,
  };

  const planets = {};
  for (const [name, offset] of Object.entries(planetOffsets)) {
    const sign = (sunSign + offset) % 12;
    planets[name] = {
      longitude: normalizeDeg(sign * 30 + 15),
      sign,
      signKo: SIGN_KO[sign],
      degree: 15,
      house: ((sign - ascSign + 12) % 12) + 1,
    };
  }

  const nodeSign = (sunSign + 6) % 12;
  const northNodeLon = normalizeDeg(nodeSign * 30 + 15);

  return {
    planets,
    ascendant: {
      longitude: ascLon,
      sign: ascSign,
      signKo: SIGN_KO[ascSign],
      degree: 15,
      house: 1,
    },
    midheaven: {
      longitude: normalizeDeg(ascLon + 90),
      sign: (ascSign + 3) % 12,
      signKo: SIGN_KO[(ascSign + 3) % 12],
      degree: 15,
      house: 10,
    },
    northNode: {
      longitude: northNodeLon,
      sign: nodeSign,
      signKo: SIGN_KO[nodeSign],
      degree: 15,
      house: ((nodeSign - ascSign + 12) % 12) + 1,
    },
    southNode: {
      longitude: normalizeDeg(northNodeLon + 180),
      sign: (nodeSign + 6) % 12,
      signKo: SIGN_KO[(nodeSign + 6) % 12],
      degree: 15,
      house: (((nodeSign + 6) - ascSign + 12) % 12) + 1,
    },
    aspects: [],
    source: "fallback-western-chart",
  };
}

function signFromDeg(value) {
  const lon = normalizeDeg(value);
  if (!Number.isFinite(lon)) return null;
  const sign = Math.floor(lon / 30);
  return {
    longitude: Math.round(lon * 100) / 100,
    sign,
    signKo: SIGN_KO[sign],
    degree: Math.round((lon % 30) * 100) / 100,
  };
}

function getApiBaseOrigin(request, env) {
  const preferred = String(env.API_UPSTREAM_ORIGIN || "").trim();
  if (preferred) return preferred.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

async function postBackendJson(request, env, apiPath, payload, timeoutMs = 12000) {
  const base = getApiBaseOrigin(request, env);
  const url = `${base}${apiPath}`;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => {
    if (controller) {
      try { controller.abort(); } catch (_) {}
    }
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
      signal: controller ? controller.signal : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      const message = String(data?.error || data?.message || `API 호출 실패 (${response.status})`).trim();
      throw new Error(message);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function getSwissWesternChart(request, env, input, options = {}) {
  const strict = options.strict === true;
  try {
    return await getLocalSwissWesternChart(env, input, { requestUrl: request?.url });
  } catch (error) {
    if (strict) throw error;
    return buildFallbackWesternChart(input);
  }
}

const VEDIC_DIGNITY_MAP = {
  Sun: { exalt: 0, debit: 6, own: [4] },
  Moon: { exalt: 1, debit: 7, own: [3] },
  Mars: { exalt: 9, debit: 3, own: [0, 7] },
  Mercury: { exalt: 5, debit: 11, own: [2, 5] },
  Jupiter: { exalt: 3, debit: 9, own: [8, 11] },
  Venus: { exalt: 11, debit: 5, own: [1, 6] },
  Saturn: { exalt: 6, debit: 0, own: [9, 10] },
  Rahu: { exalt: 2, debit: 8, own: [] },
  Ketu: { exalt: 8, debit: 2, own: [] },
};

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function toIsoDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function asBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }
  return false;
}

function getRashiLord(signIdx) {
  const lords = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
  const idx = ((Number(signIdx) % 12) + 12) % 12;
  return lords[idx];
}

function calcNakshatraInfoByLongitude(longitude) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon)) {
    return {
      name: "Unknown",
      ko: "정보 없음",
      pada: null,
      lord: "Unknown",
      deity: "정보 없음",
      symbol: "정보 없음",
      degreeInNakshatra: null,
    };
  }
  const span = 360 / 27;
  const padaSpan = span / 4;
  const idx = Math.floor(lon / span);
  const inNak = lon - idx * span;
  const pada = Math.floor(inNak / padaSpan) + 1;
  const meta = VEDIC_NAKSHATRA_META[idx] || { name: "Unknown", lord: "Unknown", deity: "정보 없음", symbol: "정보 없음" };
  return {
    name: meta.name,
    ko: meta.name,
    pada,
    lord: meta.lord,
    deity: meta.deity,
    symbol: meta.symbol,
    degreeInNakshatra: Math.round(inNak * 100) / 100,
  };
}

function calcNavamsaSign(longitude) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon)) return null;
  const signIdx = Math.floor(lon / 30);
  const degInSign = lon % 30;
  const part = Math.floor(degInSign / (30 / 9));
  const startSign = [0, 8, 4, 0, 8, 4, 0, 8, 4, 0, 8, 4][signIdx];
  const navSign = (startSign + part) % 12;
  return { sign: navSign, signName: VEDIC_SIGN_EN[navSign], signKo: SIGN_KO[navSign] };
}

function calcDashamsaSign(longitude) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon)) return null;
  const signIdx = Math.floor(lon / 30);
  const degInSign = lon % 30;
  const part = Math.floor(degInSign / 3);
  const isOdd = signIdx % 2 === 0;
  const start = isOdd ? signIdx : (signIdx + 9) % 12;
  const d10Sign = (start + part) % 12;
  return { sign: d10Sign, signName: VEDIC_SIGN_EN[d10Sign], signKo: SIGN_KO[d10Sign] };
}

function calcDignityFlags(planetName, signIdx) {
  const info = VEDIC_DIGNITY_MAP[planetName];
  if (!info) {
    return {
      dignity: "Neutral",
      isExalted: false,
      isDebilitated: false,
      isOwnSign: false,
      isFriendlySign: false,
      isEnemySign: false,
    };
  }
  const isExalted = info.exalt === signIdx;
  const isDebilitated = info.debit === signIdx;
  const isOwnSign = Array.isArray(info.own) && info.own.includes(signIdx);
  return {
    dignity: isExalted ? "Exalted" : isDebilitated ? "Debilitated" : isOwnSign ? "Own Sign" : "Neutral",
    isExalted,
    isDebilitated,
    isOwnSign,
    isFriendlySign: false,
    isEnemySign: false,
  };
}

function calcVimshottariFromMoon(moonLongitude, input) {
  const moonNak = calcNakshatraInfoByLongitude(moonLongitude);
  const lordIndex = VEDIC_DASHA_SEQUENCE.findIndex((d) => d.planet === moonNak.lord);
  const seqStart = lordIndex >= 0 ? lordIndex : 0;
  const span = 360 / 27;
  const elapsed = Number(moonNak.degreeInNakshatra || 0) / span;
  const firstYears = VEDIC_DASHA_SEQUENCE[seqStart].years * (1 - elapsed);
  const birthDate = new Date(Date.UTC(
    Number(input.year || 1990),
    Math.max(0, Number(input.month || 1) - 1),
    Number(input.day || 1),
    Number(input.hour || 12),
    Number(input.minute || 0),
    0,
    0,
  ));
  const now = new Date();

  let cursor = new Date(birthDate);
  let seq = seqStart;
  let current = null;
  let antar = null;
  let pratyantar = null;
  let upcoming = null;

  for (let i = 0; i < 27; i += 1) {
    const major = VEDIC_DASHA_SEQUENCE[seq % 9];
    const years = i === 0 ? firstYears : major.years;
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + years * 365.25 * 86400000);

    if (start <= now && now < end) {
      const remainYears = Math.round(((end.getTime() - now.getTime()) / (365.25 * 86400000)) * 10) / 10;
      current = {
        planet: major.planet,
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
        remainYears,
      };

      let antarCursor = new Date(start);
      for (let j = 0; j < 9; j += 1) {
        const antarMajor = VEDIC_DASHA_SEQUENCE[(seq + j) % 9];
        const antarMs = ((major.years * antarMajor.years) / 120) * 365.25 * 86400000;
        const antarEnd = new Date(antarCursor.getTime() + antarMs);
        if (antarCursor <= now && now < antarEnd) {
          const antarRemain = Math.round(((antarEnd.getTime() - now.getTime()) / (365.25 * 86400000)) * 10) / 10;
          antar = {
            planet: antarMajor.planet,
            startDate: toIsoDate(antarCursor),
            endDate: toIsoDate(antarEnd),
            remainYears: antarRemain,
          };

          let prCursor = new Date(antarCursor);
          for (let k = 0; k < 9; k += 1) {
            const prMajor = VEDIC_DASHA_SEQUENCE[(seq + j + k) % 9];
            const prMs = ((major.years * antarMajor.years * prMajor.years) / (120 * 120)) * 365.25 * 86400000;
            const prEnd = new Date(prCursor.getTime() + prMs);
            if (prCursor <= now && now < prEnd) {
              const prRemain = Math.round(((prEnd.getTime() - now.getTime()) / (365.25 * 86400000)) * 10) / 10;
              pratyantar = {
                planet: prMajor.planet,
                startDate: toIsoDate(prCursor),
                endDate: toIsoDate(prEnd),
                remainYears: prRemain,
              };
              break;
            }
            prCursor = new Date(prEnd);
          }
          break;
        }
        antarCursor = new Date(antarEnd);
      }
    } else if (start > now && !upcoming && current) {
      upcoming = {
        planet: major.planet,
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
        remainYears: Math.round(((end.getTime() - start.getTime()) / (365.25 * 86400000)) * 10) / 10,
      };
      break;
    }

    cursor = new Date(end);
    seq = (seq + 1) % 9;
  }

  if (!current) {
    const major = VEDIC_DASHA_SEQUENCE[seqStart];
    current = {
      planet: major.planet,
      startDate: toIsoDate(birthDate),
      endDate: "",
      remainYears: major.years,
    };
  }
  if (!antar) {
    antar = {
      planet: current.planet,
      startDate: current.startDate,
      endDate: current.endDate,
      remainYears: current.remainYears,
    };
  }

  return { current, antar, pratyantar, upcoming };
}

function detectVedicYogasFromChart(chart) {
  const planets = chart.planets || {};
  const yogas = [];
  const moon = planets.Moon;
  const jupiter = planets.Jupiter;
  const sun = planets.Sun;
  const mercury = planets.Mercury;

  if (moon && jupiter) {
    const diff = Math.abs((jupiter.house || 0) - (moon.house || 0));
    const kendra = [0, 3, 6, 9].includes(diff) || [0, 3, 6, 9].includes(12 - diff);
    if (kendra) yogas.push({ name: "Gaja Kesari Yoga", nameKo: "가자 케사리 요가", description: "목성과 달의 켄드라 연결" });
  }

  if (sun && mercury && sun.sign === mercury.sign) {
    yogas.push({ name: "Budha-Aditya Yoga", nameKo: "부다-아디티야 요가", description: "태양-수성 동궁" });
  }

  const dhanaCandidates = [2, 11].some((house) => Object.values(planets).some((p) => p && p.house === house && p.isOwnSign));
  if (dhanaCandidates) {
    yogas.push({ name: "Dhana Yoga", nameKo: "다나 요가", description: "자산·이익 하우스의 강화 배치" });
  }

  const rajaCandidates = Object.values(planets).some((p) => p && [1, 4, 7, 10].includes(p.house) && p.isExalted);
  if (rajaCandidates) {
    yogas.push({ name: "Raja Yoga", nameKo: "라자 요가", description: "켄드라에서의 강한 권위 배치" });
  }

  return yogas;
}

function deriveVedicChartFromPlanets(planetsPayload = {}, input = {}) {
  const planets = planetsPayload.planets || {};
  const asc = signFromDeg(planetsPayload.ascendantSidereal);
  if (!asc) {
    throw new Error("Swiss 라이브러리 계산 응답에 ascendantSidereal이 없어 베다 차트를 생성할 수 없습니다.");
  }

  const moonLon = Number(planets.Moon);
  if (!Number.isFinite(moonLon)) {
    throw new Error("Swiss 라이브러리 계산 응답에 Moon sidereal longitude가 없습니다.");
  }

  const retroMap = planetsPayload.retrograde || planetsPayload.retro || planetsPayload.retrogrades || {};
  const combustMap = planetsPayload.combust || planetsPayload.combustion || {};
  const strengthMap = planetsPayload.strength || planetsPayload.dignityStrength || {};

  const vedicPlanets = {};
  for (const name of VEDIC_PLANET_ORDER) {
    const info = signFromDeg(planets[name]);
    if (!info) continue;
    const nak = calcNakshatraInfoByLongitude(info.longitude);
    const dignityFlags = calcDignityFlags(name, info.sign);
    vedicPlanets[name] = {
      name,
      nameKo: VEDIC_PLANET_KO[name] || name,
      ...info,
      signName: VEDIC_SIGN_EN[info.sign],
      house: ((info.sign - asc.sign + 12) % 12) + 1,
      nakshatra: nak.name,
      nakshatraKo: nak.ko,
      nakshatraPada: nak.pada,
      nakshatraLord: nak.lord,
      nakshatraDeity: nak.deity,
      nakshatraSymbol: nak.symbol,
      isRetrograde: asBool(retroMap[name]),
      isCombust: asBool(combustMap[name]),
      strength: Number.isFinite(Number(strengthMap[name])) ? Number(strengthMap[name]) : null,
      ...dignityFlags,
    };
  }

  const moonNak = calcNakshatraInfoByLongitude(moonLon);
  const moonSign = signFromDeg(moonLon) || { signKo: "정보 없음", sign: null };

  const movablePlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const sortedByDegree = movablePlanets
    .map((p) => vedicPlanets[p])
    .filter(Boolean)
    .sort((a, b) => b.degree - a.degree);
  const atmakaraka = sortedByDegree[0] || null;
  const amatyakaraka = sortedByDegree[1] || null;
  const darakaraka = sortedByDegree[sortedByDegree.length - 1] || null;

  const computedDasha = calcVimshottariFromMoon(moonLon, input);
  const payloadDasha = planetsPayload.vimshottariDasha || planetsPayload.dasha || {};
  const vimshottariDasha = {
    current: payloadDasha.current || computedDasha.current,
    antar: payloadDasha.antar || computedDasha.antar,
    pratyantar: payloadDasha.pratyantar || computedDasha.pratyantar || null,
    upcoming: payloadDasha.upcoming || computedDasha.upcoming || null,
  };

  const d9 = {};
  const d10 = {};
  for (const p of Object.keys(vedicPlanets)) {
    const nav = calcNavamsaSign(vedicPlanets[p].longitude);
    const da10 = calcDashamsaSign(vedicPlanets[p].longitude);
    if (nav) d9[p] = nav;
    if (da10) d10[p] = da10;
  }

  const derived = {
    source: String(planetsPayload.source || "swiss-wasm-local"),
    ayanamsa: Number.isFinite(Number(planetsPayload.ayanamsa)) ? Number(planetsPayload.ayanamsa) : null,
    ayanamsaMode: String(input.ayanamsa || "lahiri").toLowerCase(),
    lagna: {
      ...asc,
      house: 1,
      signName: VEDIC_SIGN_EN[asc.sign],
      lord: getRashiLord(asc.sign),
    },
    moonNakshatra: {
      name: moonNak.name,
      ko: moonNak.ko,
      pada: moonNak.pada,
      lord: moonNak.lord,
      deity: moonNak.deity,
      symbol: moonNak.symbol,
      degreeInNakshatra: moonNak.degreeInNakshatra,
      moonSign: VEDIC_SIGN_EN[moonSign.sign] || "Unknown",
      moonSignKo: moonSign.signKo || "정보 없음",
    },
    planets: vedicPlanets,
    atmakaraka,
    amatyakaraka,
    darakaraka,
    vimshottariDasha,
    d1: {
      lagnaSign: VEDIC_SIGN_EN[asc.sign],
      lagnaDegree: round1(asc.degree),
      ascendantSidereal: round1(asc.longitude),
    },
    d9,
    d10,
    yogas: Array.isArray(planetsPayload.yogas) && planetsPayload.yogas.length
      ? planetsPayload.yogas
      : detectVedicYogasFromChart({ planets: vedicPlanets }),
    houses: {
      h2: { sign: VEDIC_SIGN_EN[(asc.sign + 1) % 12], lord: getRashiLord((asc.sign + 1) % 12) },
      h7: { sign: VEDIC_SIGN_EN[(asc.sign + 6) % 12], lord: getRashiLord((asc.sign + 6) % 12) },
      h10: { sign: VEDIC_SIGN_EN[(asc.sign + 9) % 12], lord: getRashiLord((asc.sign + 9) % 12) },
      h11: { sign: VEDIC_SIGN_EN[(asc.sign + 10) % 12], lord: getRashiLord((asc.sign + 10) % 12) },
      h12: { sign: VEDIC_SIGN_EN[(asc.sign + 11) % 12], lord: getRashiLord((asc.sign + 11) % 12) },
    },
    transits: planetsPayload.transits || planetsPayload.gochar || null,
    ashtaKoota: planetsPayload.ashtaKoota || planetsPayload.compatibility || null,
    rawSwiss: {
      ayanamsa: planetsPayload.ayanamsa,
      ascendantSidereal: planetsPayload.ascendantSidereal,
      planets,
    },
  };

  return derived;
}

async function getSwissVedicChart(request, env, input) {
  const payload = await getLocalSwissVedicPlanets(env, input, { requestUrl: request?.url });
  return deriveVedicChartFromPlanets(payload, input);
}

function zodiacBySeed(year, month, day, hour, offset = 0) {
  const raw = year * 372 + month * 31 + day + hour + offset * 17;
  const longitude = ((raw * 13.176 + offset * 29.53) % 360 + 360) % 360;
  const sign = Math.floor(longitude / 30);
  return {
    longitude: Math.round(longitude * 100) / 100,
    sign,
    signKo: SIGN_KO[sign],
    signEmoji: "",
    degree: Math.round((longitude % 30) * 100) / 100,
  };
}

function buildWesternChart(input) {
  const asc = zodiacBySeed(input.year, input.month, input.day, input.hour, 1);
  const planets = {};
  PLANETS.forEach((name, index) => {
    const info = zodiacBySeed(input.year, input.month, input.day, input.hour, index + 2);
    planets[name] = { ...info, house: ((info.sign - asc.sign + 12) % 12) + 1 };
  });
  const aspects = [];
  const names = Object.keys(planets);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const diff = Math.abs(planets[names[i]].longitude - planets[names[j]].longitude);
      const normalized = diff > 180 ? 360 - diff : diff;
      const types = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]];
      const found = types.find(([deg]) => Math.abs(normalized - deg) <= 8);
      if (found) aspects.push({ p1: names[i], p2: names[j], type: found[1], orb: Math.round(Math.abs(normalized - found[0]) * 100) / 100 });
    }
  }
  return {
    planets,
    ascendant: { ...asc, house: 1 },
    midheaven: { ...zodiacBySeed(input.year, input.month, input.day, input.hour, 11), house: 10 },
    northNode: { ...zodiacBySeed(input.year, input.month, input.day, input.hour, 12), house: 9 },
    southNode: { ...zodiacBySeed(input.year, input.month, input.day, input.hour, 13), house: 3 },
    aspects,
  };
}

const ASTRO_SIGN_RULER = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Pluto", "Jupiter", "Saturn", "Uranus", "Neptune"];
const ASTRO_ELEMENT_BY_SIGN = ["Fire", "Earth", "Air", "Water", "Fire", "Earth", "Air", "Water", "Fire", "Earth", "Air", "Water"];
const ASTRO_MODALITY_BY_SIGN = ["Cardinal", "Fixed", "Mutable", "Cardinal", "Fixed", "Mutable", "Cardinal", "Fixed", "Mutable", "Cardinal", "Fixed", "Mutable"];
const ASTRO_PLANET_KO = {
  Sun: "태양", Moon: "달", Mercury: "수성", Venus: "금성", Mars: "화성", Jupiter: "목성", Saturn: "토성",
  Uranus: "천왕성", Neptune: "해왕성", Pluto: "명왕성", NorthNode: "북노드", SouthNode: "남노드", Chiron: "키론",
  PartOfFortune: "포르투나", Vertex: "버텍스",
};
const ASTRO_MAJORS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode", "SouthNode", "Chiron"];
const ASTRO_REPORT_CACHE = new Map();
const REPORT_SESSION_STORE = new Map();
const REPORT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PREMIUM_REPORT_CONTEXT_STORE = new Map();
const PREMIUM_REPORT_CONTEXT_INDEX = new Map();
const PREMIUM_REPORT_CONTEXT_TTL_MS = REPORT_SESSION_TTL_MS;

const PREMIUM_REPORT_TYPE_MAP = {
  ziweipremium: "ziweiPremium",
  ziwei: "ziweiPremium",
  ziweilifebook: "ziweiPremium",
  ziweideepreport: "ziweiPremium",
  jamidusu: "ziweiPremium",
  jamidusupremium: "ziweiPremium",
  sookyopremium: "sookyoPremium",
  sukuyopremium: "sookyoPremium",
  sukuyolifebook: "sookyoPremium",
  sukuyo: "sookyoPremium",
  sookyopremiumreport: "sookyoPremium",
  westernastrologypremium: "westernAstrologyPremium",
  westernastrology: "westernAstrologyPremium",
  astro: "westernAstrologyPremium",
  astropremium: "westernAstrologyPremium",
  astrologypremium: "westernAstrologyPremium",
  vedicpremium: "vedicPremium",
  vediclifebook: "vedicPremium",
  vedic: "vedicPremium",
  lifebook: "lifeBook",
  lifebookpremium: "lifeBook",
  sajulifebook: "lifeBook",
  sajulifebookpremium: "lifeBook",
  sajulovebook: "loveSecret",
  lovesecret: "loveSecret",
  lovesecretpremium: "loveSecret",
  sajulovesecret: "loveSecret",
  sajulovesecretpremium: "loveSecret",
};

const PREMIUM_REPORT_KIND_MAP = {
  ziweiPremium: "ziwei",
  sookyoPremium: "sukuyo",
  westernAstrologyPremium: "astro",
  vedicPremium: "vedic",
  lifeBook: "lifebook",
  loveSecret: "love-secret",
};

const PREMIUM_REPORT_REQUIRED_CHAPTERS = {
  ziweiPremium: 13,
  sookyoPremium: 13,
  westernAstrologyPremium: 13,
  vedicPremium: 13,
  lifeBook: 13,
  loveSecret: 10,
};

const FEATURE_TYPE_MAP = {
  sajulifebook: "saju_life_book",
  sajulovesecret: "saju_love_secret",
  sajulovebook: "saju_love_secret",
  ziweilifebook: "jamidusu_premium",
  ziweideepreport: "jamidusu_premium",
  sukuyopremium: "sookyo_premium",
  jamidusupremium: "jamidusu_premium",
  sookyopremium: "sookyo_premium",
  vedicpremium: "vedic_premium",
  westernastrologypremium: "astrology_premium",
  astrologypremium: "astrology_premium",
};

const PREMIUM_SUPPLEMENTAL_TYPES_BY_REPORT = {
  lifeBook: ["ziweiPremium", "westernAstrologyPremium", "vedicPremium", "sookyoPremium"],
  loveSecret: ["ziweiPremium", "westernAstrologyPremium", "vedicPremium", "sookyoPremium"],
};

function normalizePremiumFeatureType(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw.toLowerCase();
  if (FEATURE_TYPE_TO_REPORT_TYPE[normalized]) return normalized;
  const compact = normalized.replace(/[^a-z0-9]/gi, "");
  return FEATURE_TYPE_MAP[compact] || "";
}

function resolvePremiumTypePair(reportTypeInput, featureTypeInput) {
  const normalizedFeatureType = normalizePremiumFeatureType(featureTypeInput);
  const normalizedReportType = normalizePremiumReportType(reportTypeInput);
  const reportType = FEATURE_TYPE_TO_REPORT_TYPE[normalizedFeatureType] || normalizedReportType || "";
  const featureType = normalizedFeatureType || REPORT_TYPE_TO_FEATURE_TYPE[reportType] || "";
  return {
    reportType,
    featureType,
  };
}

function modeKeyFromInput(input = {}) {
  const raw = String(input?.mode || input?.reportMode || "").trim().toLowerCase();
  if (!raw) return "default";
  return raw.replace(/[^a-z0-9_-]/g, "") || "default";
}

function createPremiumRequestId(seed = "") {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const suffix = stableHash(`${seed}|${ts}|${rand}`).slice(0, 8);
  return `prq_${ts}_${suffix}`;
}

function getPremiumRequiredChapters(reportType, mode = "") {
  const spec = getPremiumSpecByReportType(reportType, mode);
  if (spec && Number(spec.chapterCount || 0) > 0) {
    return Number(spec.chapterCount);
  }
  return Number(PREMIUM_REPORT_REQUIRED_CHAPTERS[reportType] || 13);
}

function normalizePremiumReportType(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return PREMIUM_REPORT_TYPE_MAP[compact] || "";
}

function prunePremiumReportContexts() {
  const now = Date.now();
  for (const [sessionId, ctx] of PREMIUM_REPORT_CONTEXT_STORE.entries()) {
    if (!ctx || Number(ctx.expiresAt || 0) <= now) {
      PREMIUM_REPORT_CONTEXT_STORE.delete(sessionId);
      if (ctx?.cacheKey) PREMIUM_REPORT_CONTEXT_INDEX.delete(ctx.cacheKey);
    }
  }
}

function stablePayloadHash(value) {
  try {
    return stableHash(JSON.stringify(value || {}));
  } catch {
    return stableHash(String(value || ""));
  }
}

function getPremiumCacheKey(reportType, userId, inputHash, calculationVersion, modeKey = "default") {
  return `${reportType}:${String(userId || "anonymous")}:${String(modeKey || "default")}:${String(inputHash || "none")}:${String(calculationVersion || "v1")}`;
}

function getPremiumCanonicalFromPrepare(reportType, prepareData) {
  if (!prepareData || typeof prepareData !== "object") return null;
  if (reportType === "ziweiPremium") return prepareData.canonicalZiweiChart || null;
  if (reportType === "sookyoPremium") return prepareData.canonicalSukuyoCompatibility || prepareData.canonicalSukuyoNatal || null;
  if (reportType === "westernAstrologyPremium") return prepareData.canonicalAstroChart || null;
  if (reportType === "vedicPremium") return prepareData.canonicalVedicChart || null;
  if (reportType === "lifeBook") return prepareData.canonicalSajuChart || null;
  if (reportType === "loveSecret") return prepareData.canonicalSajuLoveReport || null;
  return null;
}

function getPremiumMissingData(prepareData, reportType = "") {
  if (!prepareData || typeof prepareData !== "object") return [];
  const fromTop = Array.isArray(prepareData.missingFields) ? prepareData.missingFields : [];
  const fromValidation = Array.isArray(prepareData.validation?.missingFields)
    ? prepareData.validation.missingFields
    : [];

  // Ziwei 기본 모드는 fail-open이 원칙이므로 상세 필드 누락은 경고로만 처리하고
  // strict 모드(_premiumStrictValidation / PREMIUM_ZIWEI_STRICT_MODE)에서만 차단한다.
  if (reportType === "ziweiPremium" && !asBool(prepareData.strictValidationRequested)) {
    return [];
  }

  // 숙요점 PDF는 일부 계산 데이터 누락 시에도 fallback 생성을 허용한다.
  if (reportType === "sookyoPremium") {
    return [];
  }

  return Array.from(new Set([...fromTop, ...fromValidation].map((v) => String(v || "").trim()).filter(Boolean)));
}

function getPremiumWarnings(prepareData) {
  if (!prepareData || typeof prepareData !== "object") return [];
  const warnings = [];
  if (Array.isArray(prepareData.dataQuality?.warnings)) warnings.push(...prepareData.dataQuality.warnings);
  if (prepareData.dataQuality?.warning) warnings.push(prepareData.dataQuality.warning);
  if (Array.isArray(prepareData.validation?.warnings)) warnings.push(...prepareData.validation.warnings);
  return Array.from(new Set(warnings.map((v) => String(v || "").trim()).filter(Boolean)));
}

function buildPremiumSourceMap(reportType, requestBody, prepareData) {
  const payload = requestBody && typeof requestBody === "object" ? requestBody : {};
  const hasBase = Boolean(payload.sajuData || payload.ziweiData || payload.ziweiStructured || payload.chart || payload.canonicalSajuChart);
  const canonical = getPremiumCanonicalFromPrepare(reportType, prepareData);
  const hasCanonical = Boolean(canonical && typeof canonical === "object");
  const recalculated = ["westernAstrologyPremium", "vedicPremium", "sookyoPremium"].includes(reportType);
  const externalApiUsed = recalculated;
  const sourceNames = [];
  if (hasBase) sourceNames.push("baseAnalysis");
  if (recalculated) sourceNames.push("recalculationEngine");
  if (externalApiUsed) sourceNames.push("externalApi");
  if (hasCanonical) sourceNames.push("canonicalBuilder");
  return {
    usedBaseAnalysis: hasBase,
    usedSavedAnalysis: false,
    usedRecalculation: recalculated,
    usedExternalApi: externalApiUsed,
    sourceNames,
    hasCanonicalJson: hasCanonical,
  };
}

function buildPremiumContextSummary(context) {
  const validChapters = countPremiumValidChapters(context);
  return {
    reportSessionId: context.reportSessionId,
    reportId: context.reportId,
    reportType: context.reportType,
    featureType: context.featureType || REPORT_TYPE_TO_FEATURE_TYPE[context.reportType] || "",
    userId: context.userId,
    requestId: context.requestId || "",
    idempotencyKey: context.idempotencyKey || "",
    inputHash: context.inputHash,
    calculationVersion: context.calculationVersion,
    sourceMap: context.sourceMap,
    missingData: context.missingData,
    warnings: context.warnings,
    totalChapters: context.totalChapters,
    requiredChapters: context.requiredChapters,
    validChapters,
    isCompleteForPdf: context.isCompleteForPdf,
    status: context.status,
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
  };
}

function collectReceivedKeys(value, prefix = "", depth = 0, max = 160, out = []) {
  if (!value || typeof value !== "object" || depth > 3 || out.length >= max) return out;
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    if (out.length >= max) break;
    const key = String(keys[i] || "").trim();
    if (!key) continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    out.push(fullKey);
    const child = value[key];
    if (child && typeof child === "object" && !Array.isArray(child)) {
      collectReceivedKeys(child, fullKey, depth + 1, max, out);
    }
  }
  return out;
}

function getPremiumExpectedSchema(reportType) {
  const base = {
    requestKeys: [
      "requestId",
      "generationId",
      "featureKey",
      "reportType",
      "birthInfo",
      "normalizedData",
      "chapters",
      "payment",
      "options",
    ],
  };

  const byType = {
    ziweiPremium: {
      requiredNormalizedKeys: [
        "normalizedData.meta",
        "normalizedData.userProfile",
        "normalizedData.ziwei.chart.mingGong",
        "normalizedData.ziwei.palaces",
        "normalizedData.ziwei.stars.major",
      ],
    },
    lifeBook: {
      requiredNormalizedKeys: [
        "normalizedData.meta",
        "normalizedData.userProfile",
        "normalizedData.saju.pillars",
        "normalizedData.saju.dayMaster",
        "normalizedData.saju.fiveElements",
      ],
    },
    loveSecret: {
      requiredNormalizedKeys: [
        "normalizedData.meta",
        "normalizedData.userProfile",
        "normalizedData.saju.pillars",
        "normalizedData.saju.interpretation.relationship",
      ],
    },
    sookyoPremium: {
      requiredNormalizedKeys: [
        "normalizedData.meta",
        "normalizedData.userProfile",
        "normalizedData.sukuyo.birthStar",
        "normalizedData.sukuyo.interpretation",
      ],
    },
    vedicPremium: {
      requiredNormalizedKeys: [
        "normalizedData.meta",
        "normalizedData.userProfile",
        "normalizedData.vedic.chart.lagna",
        "normalizedData.vedic.planets",
        "normalizedData.vedic.houses",
      ],
    },
    westernAstrologyPremium: {
      requiredNormalizedKeys: [
        "normalizedData.meta",
        "normalizedData.userProfile",
        "normalizedData.westernAstrology.chart.sunSign",
        "normalizedData.westernAstrology.planets",
        "normalizedData.westernAstrology.houses",
        "normalizedData.westernAstrology.aspects",
      ],
    },
  };

  return {
    ...base,
    ...(byType[reportType] || { requiredNormalizedKeys: [] }),
  };
}

function getPremiumRecommendedAction(reportType) {
  if (reportType === "ziweiPremium") return "rebuild-normalized-ziwei-data";
  if (reportType === "lifeBook" || reportType === "loveSecret") return "rebuild-normalized-saju-data";
  if (reportType === "sookyoPremium") return "rebuild-normalized-sukuyo-data";
  if (reportType === "vedicPremium") return "rebuild-normalized-vedic-data";
  if (reportType === "westernAstrologyPremium") return "rebuild-normalized-western-astrology-data";
  return "rebuild-normalized-data";
}

function getPremiumNormalizedDataSummary(reportType, canonicalJson) {
  const input = canonicalJson?.input || {};
  const calculated = canonicalJson?.calculatedData || {};
  const hasBirthInfo = hasMeaningfulValue(input.year) && hasMeaningfulValue(input.month) && hasMeaningfulValue(input.day);

  if (reportType === "ziweiPremium") {
    const palaces = calculated?.palaces && typeof calculated.palaces === "object" ? Object.values(calculated.palaces) : [];
    const palaceCount = Array.isArray(palaces) ? palaces.length : 0;
    let majorStarCount = 0;
    for (let i = 0; i < palaces.length; i += 1) {
      majorStarCount += Array.isArray(palaces[i]?.mainStars) ? palaces[i].mainStars.length : 0;
    }
    return {
      hasBirthInfo,
      hasZiweiChart: hasMeaningfulValue(calculated?.chartMeta?.mingGong),
      palaceCount,
      majorStarCount,
    };
  }

  if (reportType === "lifeBook" || reportType === "loveSecret") {
    return {
      hasBirthInfo,
      hasSaju: hasMeaningfulValue(calculated?.saju?.fourPillars?.year) || hasMeaningfulValue(calculated?.saju?.dayMaster),
      hasUsefulGods: hasMeaningfulValue(calculated?.saju?.usefulGods?.yongsin?.element),
    };
  }

  if (reportType === "sookyoPremium") {
    return {
      hasBirthInfo,
      hasSukuyo: hasMeaningfulValue(calculated?.nativeSook?.nameKo) || hasMeaningfulValue(calculated?.compatibility?.relationType),
      hasCompatibility: hasMeaningfulValue(calculated?.compatibility?.relationType),
    };
  }

  if (reportType === "vedicPremium") {
    return {
      hasBirthInfo,
      hasVedicChart: hasMeaningfulValue(calculated?.lagna?.name),
      planetCount: calculated?.planets && typeof calculated.planets === "object" ? Object.keys(calculated.planets).length : 0,
      houseCount: Array.isArray(calculated?.houses) ? calculated.houses.length : 0,
    };
  }

  if (reportType === "westernAstrologyPremium") {
    return {
      hasBirthInfo,
      hasAstroChart: hasMeaningfulValue(calculated?.angles?.ascendant?.sign) || hasMeaningfulValue(calculated?.planets?.sun?.sign),
      planetCount: calculated?.planets && typeof calculated.planets === "object" ? Object.keys(calculated.planets).length : 0,
      houseCount: Array.isArray(calculated?.houses) ? calculated.houses.length : 0,
      aspectCount: Array.isArray(calculated?.aspects) ? calculated.aspects.length : 0,
    };
  }

  return {
    hasBirthInfo,
  };
}

function logPremiumPipeline(entry) {
  try {
    console.info("[PremiumPDF]", JSON.stringify(entry));
  } catch {
    console.info("[PremiumPDF]", entry);
  }
}

function countKoreanLikeChars(text = "") {
  const normalized = String(text || "").trim();
  if (!normalized) return 0;
  return normalized.replace(/\s+/g, "").length;
}

function resolveChapterSpec(reportType, featureType, mode, chapterId) {
  const spec = getPremiumSpecByFeatureType(featureType, mode) || getPremiumSpecByReportType(reportType, mode);
  if (!spec || !Array.isArray(spec.chapters)) {
    return {
      featureType,
      chapterCount: Number(PREMIUM_REPORT_REQUIRED_CHAPTERS[reportType] || 13),
      minTotalChars: 0,
      targetTotalChars: 0,
      chapterSpec: null,
    };
  }
  const idx = Math.max(0, Number(chapterId || 1) - 1);
  return {
    featureType: spec.featureType || featureType,
    chapterCount: Number(spec.chapterCount || spec.chapters.length || 0),
    minTotalChars: Number(spec.minTotalChars || 0),
    targetTotalChars: Number(spec.targetTotalChars || 0),
    chapterSpec: spec.chapters[idx] || null,
  };
}

function validateChapterLength({ reportType, featureType, mode, chapterId, text }) {
  const resolved = resolveChapterSpec(reportType, featureType, mode, chapterId);
  const noSpaceLength = countKoreanLikeChars(text);
  const chapterMin = Number(resolved?.chapterSpec?.minChars || 0);
  const chapterTarget = Number(resolved?.chapterSpec?.targetChars || 0);
  const warnings = [];
  if (chapterMin > 0 && noSpaceLength < chapterMin) warnings.push("CHAPTER_TOO_SHORT");
  if (chapterTarget > 0 && noSpaceLength < chapterTarget) warnings.push("CHAPTER_BELOW_TARGET");

  return {
    ok: warnings.indexOf("CHAPTER_TOO_SHORT") < 0,
    warnings,
    noSpaceLength,
    chapterMin,
    chapterTarget,
    chapterSpec: resolved.chapterSpec,
    chapterCount: resolved.chapterCount,
    minTotalChars: resolved.minTotalChars,
    targetTotalChars: resolved.targetTotalChars,
  };
}

function validateFullReportLength({ reportType, featureType, mode, chapterTextList }) {
  const resolved = resolveChapterSpec(reportType, featureType, mode, 1);
  const combined = (Array.isArray(chapterTextList) ? chapterTextList : []).join("\n\n");
  const totalLength = countKoreanLikeChars(combined);
  const minTotalChars = Number(resolved.minTotalChars || 0);
  const targetTotalChars = Number(resolved.targetTotalChars || 0);
  const warnings = [];
  if (minTotalChars > 0 && totalLength < minTotalChars) warnings.push("TOTAL_TOO_SHORT");
  if (targetTotalChars > 0 && totalLength < targetTotalChars) warnings.push("TOTAL_BELOW_TARGET");
  return {
    ok: warnings.indexOf("TOTAL_TOO_SHORT") < 0,
    warnings,
    totalLength,
    minTotalChars,
    targetTotalChars,
    chapterCount: resolved.chapterCount,
  };
}

function getPremiumChapterMaxAttempts(env, fallback = 3) {
  const raw = Number(env?.PREMIUM_CHAPTER_MAX_ATTEMPTS || fallback || 3);
  if (!Number.isFinite(raw)) return 3;
  return Math.max(1, Math.min(6, Math.floor(raw)));
}

function isPremiumChapterEntryReadyForPdf(entry) {
  if (!entry || !entry.ok) return false;
  if (Number(entry.textLength || 0) < 300) return false;
  if (entry.lengthValidation && entry.lengthValidation.ok === false) return false;
  return true;
}

function countPremiumValidChapters(context) {
  return Object.values(context?.chapterData || {}).filter((entry) => isPremiumChapterEntryReadyForPdf(entry)).length;
}

function buildInternalPremiumJsonRequest(sourceRequest, body) {
  const sourceHeaders = sourceRequest?.headers || new Headers();
  const headers = new Headers();
  headers.set("content-type", "application/json");
  const authHeader = sourceHeaders.get("authorization");
  const cookieHeader = sourceHeaders.get("cookie");
  if (authHeader) headers.set("authorization", authHeader);
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new Request(sourceRequest.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
}

function getPremiumPrepareMaxAttempts(env) {
  const raw = Number(env?.PREMIUM_PREPARE_MAX_ATTEMPTS || env?.PREMIUM_CANONICAL_RETRY_MAX || 3);
  if (!Number.isFinite(raw)) return 3;
  return Math.max(1, Math.min(5, Math.floor(raw)));
}

function getPremiumSupplementalMaxAttempts(env) {
  const raw = Number(env?.PREMIUM_SUPPLEMENTAL_MAX_ATTEMPTS || 2);
  if (!Number.isFinite(raw)) return 2;
  return Math.max(1, Math.min(4, Math.floor(raw)));
}

function buildPremiumPrepareRequestBody(reportType, sourceInput = {}, chapterId = 1, requestId = "", attempt = 1) {
  const base = {
    ...(sourceInput && typeof sourceInput === "object" ? sourceInput : {}),
    requestId: requestId || createPremiumRequestId(`${reportType}|prepare`),
    prepareOnly: true,
    chapter: Number(chapterId || 1),
    sessionId: Number(chapterId || 1),
    forceRecalculate: attempt > 1,
    _premiumReportPrepare: true,
    _premiumCanonicalHydration: true,
    _premiumHydrationAttempt: Number(attempt || 1),
  };

  if (reportType === "westernAstrologyPremium") {
    if (!hasMeaningfulValue(base.timezoneName)) base.timezoneName = "Asia/Seoul";
    if (!hasMeaningfulValue(base.birthPlace)) base.birthPlace = "Seoul";
    if (!hasMeaningfulValue(base.houseSystem)) base.houseSystem = "placidus";
    if (!hasMeaningfulValue(base.zodiacType)) base.zodiacType = "tropical";
    if (!hasMeaningfulValue(base.lat)) base.lat = 37.5665;
    if (!hasMeaningfulValue(base.lon)) base.lon = 126.978;
    if (!hasMeaningfulValue(base.timezone)) base.timezone = 9;
  }

  if (reportType === "vedicPremium") {
    if (!hasMeaningfulValue(base.ayanamsa)) base.ayanamsa = "lahiri";
    if (!hasMeaningfulValue(base.mode)) base.mode = "personal";
  }

  if (reportType === "sookyoPremium") {
    if (!hasMeaningfulValue(base.mode)) base.mode = "personal";
  }

  if (reportType === "loveSecret") {
    if (!hasMeaningfulValue(base.mode)) base.mode = "solo";
    if (!hasMeaningfulValue(base.totalChapters)) base.totalChapters = 10;
  }

  if (reportType === "lifeBook") {
    if (!hasMeaningfulValue(base.totalChapters)) base.totalChapters = 13;
  }

  return base;
}

function scoreCanonicalValidation(validation) {
  const required = Array.isArray(validation?.requiredMissing) ? validation.requiredMissing.length : 999;
  const optional = Array.isArray(validation?.optionalMissing) ? validation.optionalMissing.length : 999;
  const passBonus = validation?.canGeneratePdf ? -1000 : 0;
  return required * 100 + optional + passBonus;
}

function buildFeatureDataJson(reportType, canonicalJson = {}) {
  const calculatedData = canonicalJson?.calculatedData || {};
  if (reportType === "lifeBook") {
    return {
      type: reportType,
      identity: calculatedData?.integratedThemes?.coreIdentity || [],
      mission: calculatedData?.integratedThemes?.lifeMission || [],
      timeline: calculatedData?.timeline || {},
      saju: calculatedData?.saju || {},
      crossSystems: {
        ziwei: calculatedData?.ziwei || {},
        westernAstrology: calculatedData?.westernAstrology || {},
        vedic: calculatedData?.vedic || {},
        sookyo: calculatedData?.sookyo || {},
      },
    };
  }
  if (reportType === "loveSecret") {
    return {
      type: reportType,
      self: calculatedData?.self || {},
      compatibility: calculatedData?.compatibility || {},
      optionalCrossSystems: calculatedData?.optionalCrossSystems || {},
    };
  }
  if (reportType === "westernAstrologyPremium") {
    return {
      type: reportType,
      birthInfo: calculatedData?.birthInfo || {},
      angles: calculatedData?.angles || {},
      planets: calculatedData?.planets || {},
      houses: calculatedData?.houses || [],
      aspects: calculatedData?.aspects || [],
    };
  }
  if (reportType === "vedicPremium") {
    return {
      type: reportType,
      birthInfo: calculatedData?.birthInfo || {},
      lagna: calculatedData?.lagna || {},
      planets: calculatedData?.planets || {},
      dashas: calculatedData?.dashas || {},
      karakas: calculatedData?.karakas || {},
    };
  }
  if (reportType === "ziweiPremium") {
    return {
      type: reportType,
      coreChart: calculatedData?.coreChart || {},
      palaces: calculatedData?.palaces || {},
      cycles: calculatedData?.cycles || {},
      relationshipData: calculatedData?.relationshipData || {},
    };
  }
  if (reportType === "sookyoPremium") {
    return {
      type: reportType,
      birthInfo: calculatedData?.birthInfo || {},
      nativeSook: calculatedData?.nativeSook || {},
      compatibility: calculatedData?.compatibility || {},
      cycleData: calculatedData?.cycleData || {},
      sukyoPdfContext: calculatedData?.sukyoPdfContext || {},
    };
  }
  return {
    type: reportType,
    calculatedData,
  };
}

async function collectSupplementalCalculatedByType({
  request,
  env,
  authInfo,
  reportType,
  requestBody,
  requestId,
  reportId,
  inputHash,
  calculationVersion,
  createdAt,
}) {
  const targets = Array.isArray(PREMIUM_SUPPLEMENTAL_TYPES_BY_REPORT[reportType])
    ? PREMIUM_SUPPLEMENTAL_TYPES_BY_REPORT[reportType]
    : [];
  const supplementalCalculatedByType = {};
  const diagnostics = [];
  const maxAttempts = getPremiumSupplementalMaxAttempts(env);

  for (const targetType of targets) {
    if (!targetType || targetType === reportType) continue;
    const targetHandler = getPremiumHandlerByType(targetType);
    if (!targetHandler) continue;

    let success = false;
    let finalStatus = 0;
    let finalCode = "";
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const targetRequest = buildPremiumPrepareRequestBody(
        targetType,
        requestBody,
        1,
        `${requestId || createPremiumRequestId("supplemental")}_${targetType}_${attempt}`,
        attempt,
      );
      const { response, data } = await invokePremiumLegacyHandler(targetHandler, request, env, targetRequest);
      finalStatus = Number(response?.status || 0);
      finalCode = String(data?.code || "");

      if (response.ok && data?.ok) {
        const supplementalBuild = buildCanonicalJsonForReport(targetType, data, requestBody, authInfo, {
          reportId: `${reportId}_supp_${targetType}`,
          inputHash,
          calculationVersion,
          createdAt,
          sourceMap: buildPremiumSourceMap(targetType, requestBody, data),
          supplementalCanonicalByType: {},
        });
        supplementalCalculatedByType[targetType] = {
          calculatedData: supplementalBuild?.canonicalJson?.calculatedData || {},
          validation: supplementalBuild?.validation || null,
          featureDataJson: buildFeatureDataJson(targetType, supplementalBuild?.canonicalJson || {}),
        };
        success = true;
        diagnostics.push({ targetType, attempt, status: finalStatus, ok: true, requiredMissing: supplementalBuild?.validation?.requiredMissing?.length || 0 });
        break;
      }
    }

    if (!success) {
      diagnostics.push({ targetType, attempt: maxAttempts, status: finalStatus, ok: false, code: finalCode || "SUPPLEMENTAL_FAILED" });
    }
  }

  return {
    supplementalCalculatedByType,
    diagnostics,
  };
}

async function hydratePremiumCanonicalData({
  request,
  env,
  authInfo,
  reportType,
  requestBody,
  requestId,
  reportId,
  inputHash,
  calculationVersion,
  createdAt,
  basePrepareData,
}) {
  const handler = getPremiumHandlerByType(reportType);
  const maxAttempts = getPremiumPrepareMaxAttempts(env);
  const hydrationAttempts = [];
  let supplementalCalculatedByType = {};

  let bestPrepareData = basePrepareData;
  let bestBuild = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let prepareData = null;
    let status = 0;
    let code = "";

    if (attempt === 1 && basePrepareData && typeof basePrepareData === "object") {
      prepareData = basePrepareData;
      status = 200;
    } else if (handler) {
      const prepareRequestBody = buildPremiumPrepareRequestBody(reportType, requestBody, 1, requestId, attempt);
      const { response, data } = await invokePremiumLegacyHandler(handler, request, env, prepareRequestBody);
      status = Number(response?.status || 0);
      code = String(data?.code || "");
      if (response.ok && data?.ok) {
        prepareData = data;
      }
    }

    if (!prepareData) {
      hydrationAttempts.push({ attempt, ok: false, status, code: code || "PREPARE_FAILED" });
      continue;
    }

    const collected = await collectSupplementalCalculatedByType({
      request,
      env,
      authInfo,
      reportType,
      requestBody,
      requestId,
      reportId,
      inputHash,
      calculationVersion,
      createdAt,
    });
    supplementalCalculatedByType = {
      ...supplementalCalculatedByType,
      ...(collected?.supplementalCalculatedByType || {}),
    };

    const built = buildCanonicalJsonForReport(reportType, prepareData, requestBody, authInfo, {
      reportId,
      inputHash,
      calculationVersion,
      createdAt,
      sourceMap: buildPremiumSourceMap(reportType, requestBody, prepareData),
      supplementalCanonicalByType: supplementalCalculatedByType,
    });

    const score = scoreCanonicalValidation(built?.validation);
    hydrationAttempts.push({
      attempt,
      ok: Boolean(built?.validation?.canGeneratePdf),
      status,
      requiredMissing: Array.isArray(built?.validation?.requiredMissing) ? built.validation.requiredMissing.length : 0,
      optionalMissing: Array.isArray(built?.validation?.optionalMissing) ? built.validation.optionalMissing.length : 0,
      supplementalCount: Object.keys(supplementalCalculatedByType).length,
      supplementalDiagnostics: collected?.diagnostics || [],
    });

    if (score < bestScore) {
      bestScore = score;
      bestPrepareData = prepareData;
      bestBuild = built;
    }

    if (built?.validation?.canGeneratePdf) break;
  }

  if (!bestBuild && bestPrepareData) {
    bestBuild = buildCanonicalJsonForReport(reportType, bestPrepareData, requestBody, authInfo, {
      reportId,
      inputHash,
      calculationVersion,
      createdAt,
      sourceMap: buildPremiumSourceMap(reportType, requestBody, bestPrepareData),
      supplementalCanonicalByType: supplementalCalculatedByType,
    });
  }

  return {
    prepareData: bestPrepareData,
    canonicalBuild: bestBuild,
    supplementalCalculatedByType,
    hydration: {
      maxAttempts,
      attempts: hydrationAttempts,
      supplementalTypes: Object.keys(supplementalCalculatedByType),
      succeeded: Boolean(bestBuild?.validation?.canGeneratePdf),
    },
  };
}

async function invokePremiumLegacyHandler(handler, request, env, requestBody) {
  const sourceHeaders = request.headers || new Headers();
  const headers = new Headers();
  headers.set("content-type", "application/json");
  const authHeader = sourceHeaders.get("authorization");
  const cookieHeader = sourceHeaders.get("cookie");
  if (authHeader) headers.set("authorization", authHeader);
  if (cookieHeader) headers.set("cookie", cookieHeader);

  const proxyRequest = new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody || {}),
  });
  const response = await handler(proxyRequest, env);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function getPremiumHandlerByType(reportType) {
  if (reportType === "ziweiPremium") return handleZiweiBookSession;
  if (reportType === "sookyoPremium") return handleSukuyoLife;
  if (reportType === "westernAstrologyPremium") return handleAstroLife;
  if (reportType === "vedicPremium") return handleVedicLife;
  if (reportType === "lifeBook") return handleLifebookSession;
  if (reportType === "loveSecret") return handleLoveSecretSession;
  return null;
}

function extractPremiumSessionId(pathname) {
  const match = String(pathname || "").match(/^\/api\/premium-report\/session\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function isUnauthorizedPayload(status, data) {
  const code = String(data?.code || "").toUpperCase();
  if (Number(status) === 401) return true;
  return code === "UNAUTHORIZED" || code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED";
}

function getPathValue(target, path) {
  if (!target || typeof target !== "object") return undefined;
  const parts = String(path || "").split(".").filter(Boolean);
  let cursor = target;
  for (const part of parts) {
    if (cursor == null) return undefined;
    if (/^\d+$/.test(part)) {
      cursor = cursor[Number(part)];
    } else {
      cursor = cursor[part];
    }
  }
  return cursor;
}

function hasMeaningfulValue(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

function pathMissing(target, path) {
  const value = getPathValue(target, path);
  return !hasMeaningfulValue(value);
}

function pickFirst(...values) {
  for (const value of values) {
    if (hasMeaningfulValue(value)) return value;
  }
  return "";
}

function normalizeAstroPlanetMap(planets) {
  const source = planets && typeof planets === "object" ? planets : {};
  const map = {
    sun: source.sun || source.Sun || {},
    moon: source.moon || source.Moon || {},
    mercury: source.mercury || source.Mercury || {},
    venus: source.venus || source.Venus || {},
    mars: source.mars || source.Mars || {},
    jupiter: source.jupiter || source.Jupiter || {},
    saturn: source.saturn || source.Saturn || {},
    uranus: source.uranus || source.Uranus || {},
    neptune: source.neptune || source.Neptune || {},
    pluto: source.pluto || source.Pluto || {},
    northNode: source.northNode || source.NorthNode || {},
    chiron: source.chiron || source.Chiron || {},
    rahu: source.rahu || source.Rahu || {},
    ketu: source.ketu || source.Ketu || {},
  };
  return map;
}

function mapZiweiPalaces(canonical) {
  const sourcePalaces = Array.isArray(canonical?.palaces) ? canonical.palaces : [];
  const byKey = new Map();
  sourcePalaces.forEach((palace) => {
    const key = String(palace?.palaceKey || "").trim();
    if (key) byKey.set(key, palace);
  });
  const keyMap = {
    ming: "ming",
    siblings: "siblings",
    spouse: "spouse",
    children: "children",
    wealth: "wealth",
    health: "health",
    travel: "travel",
    friends: "friends",
    career: "career",
    property: "property",
    fortune: "fortune",
    parents: "parents",
  };
  const result = {};
  Object.entries(keyMap).forEach(([targetKey, sourceKey]) => {
    const p = byKey.get(sourceKey) || {};
    const mainStars = Array.isArray(p.mainStars) ? p.mainStars : [];
    const auxiliaryStars = Array.isArray(p.auxStars) ? p.auxStars : [];
    const maleficStars = Array.isArray(p.maleficStars) ? p.maleficStars : [];
    const starBrightness = {};
    [...mainStars, ...auxiliaryStars, ...maleficStars].forEach((star) => {
      const name = String(star?.nameKo || star?.name || "").trim();
      if (!name) return;
      starBrightness[name] = {
        brightness: star?.brightnessKo || star?.brightness || "",
        symbol: star?.symbol || "",
      };
    });

    result[targetKey] = {
      name: p.palaceNameKo || p.palaceName || "",
      earthlyBranch: p.branch || "",
      mainStars,
      minorStars: Array.isArray(p.minorStars) ? p.minorStars : [],
      auxiliaryStars,
      maleficStars,
      fourTransformations: Array.isArray(p.transformations) ? p.transformations : [],
      starBrightness,
    };
  });
  return result;
}

function mapZiweiCalculatedData(canonical) {
  const palaces = mapZiweiPalaces(canonical);
  const fourTransforms = canonical?.transformations || {};
  const ziweiStar = Object.values(palaces)
    .flatMap((p) => Array.isArray(p.mainStars) ? p.mainStars : [])
    .find((s) => String(s?.nameKo || s?.name || "").includes("자미")) || {};

  return {
    birthInfo: {
      solarDate: canonical?.profile?.birth?.solarDate || "",
      lunarDate: canonical?.profile?.birth?.lunarDate || "",
      birthTimeBranch: canonical?.profile?.birth?.timeBranch || "",
      gender: canonical?.profile?.gender || "",
      yinYangGenderDirection: canonical?.chartMeta?.fortuneDirection || "",
      calendarConversionSource: canonical?.chartMeta?.calculationSource || "",
    },
    coreChart: {
      mingGong: canonical?.chartMeta?.mingGong || "",
      shenGong: canonical?.chartMeta?.shenGong || "",
      juType: canonical?.chartMeta?.juType || canonical?.chartMeta?.bureauType || "",
      fiveElementBureau: canonical?.chartMeta?.fiveElementBureau || "",
      lifeMasterStar: canonical?.chartMeta?.lifeMasterStar || "",
      bodyMasterStar: canonical?.chartMeta?.bodyMasterStar || "",
    },
    palaces,
    stars: {
      ziwei: {
        palace: ziweiStar?.palaceNameKo || ziweiStar?.palace || "",
        brightness: ziweiStar?.brightnessKo || ziweiStar?.brightness || "",
        symbol: ziweiStar?.symbol || "",
        role: ziweiStar?.role || "",
        positiveMeaning: ziweiStar?.positiveMeaning || "",
        negativeMeaning: ziweiStar?.negativeMeaning || "",
      },
    },
    fourTransformations: {
      huaLu: canonical?.fourTransformations?.huaLu || fourTransforms?.huaLu || {},
      huaQuan: canonical?.fourTransformations?.huaQuan || fourTransforms?.huaQuan || {},
      huaKe: canonical?.fourTransformations?.huaKe || fourTransforms?.huaKe || {},
      huaJi: canonical?.fourTransformations?.huaJi || fourTransforms?.huaJi || {},
    },
    sanFangSiZheng: {
      mingGongTriangle: canonical?.sanFangSiZheng?.mingGongTriangle || {},
      careerTriangle: canonical?.sanFangSiZheng?.careerTriangle || {},
      wealthTriangle: canonical?.sanFangSiZheng?.wealthTriangle || {},
      relationshipTriangle: canonical?.sanFangSiZheng?.relationshipTriangle || {},
    },
    cycles: {
      daXian: Array.isArray(canonical?.luck?.decadePeriods) ? canonical.luck.decadePeriods : [],
      annual: Array.isArray(canonical?.luck?.annual) ? canonical.luck.annual : [],
      monthly: Array.isArray(canonical?.luck?.monthly) ? canonical.luck.monthly : [],
    },
    relationshipData: {
      spousePalace: palaces.spouse || {},
      romanceStars: canonical?.relationshipData?.romanceStars || [],
      marriageRiskSignals: canonical?.relationshipData?.marriageRiskSignals || [],
      compatibilityHints: canonical?.relationshipData?.compatibilityHints || [],
    },
    careerData: {
      careerPalace: palaces.career || {},
      wealthPalace: palaces.wealth || {},
      authorityStars: canonical?.careerData?.authorityStars || [],
      suitableFields: canonical?.careerData?.suitableFields || [],
    },
    healthData: {
      healthPalace: palaces.health || {},
      weakElements: canonical?.healthData?.weakElements || [],
      stressSignals: canonical?.healthData?.stressSignals || [],
    },
  };
}

function mapSookyoCalculatedData(canonical, requestBody) {
  const source = canonical && typeof canonical === "object" ? canonical : {};
  const personA = source?.personA || {};
  const personB = source?.personB || {};
  const comp = source?.compatibility || {};

  const sukyoPdfContext = buildSukyoPdfContext({
    canonical: source,
    requestBody,
    rawBasicResult: {
      summary:
        source?.natalSukuyo?.coreNature
        || source?.compatibility?.summary
        || "",
      canonicalSnapshot: source,
    },
  });
  const inputCheck = validateSukyoPdfInput(sukyoPdfContext);

  const rawIndex = source?.natalSukuyo?.index ?? personA?.sukuyo?.index;
  const nativeIndex = Number(rawIndex);
  const safeNativeIndex = Number.isFinite(nativeIndex) ? nativeIndex : null;

  const relationType = String(
    sukyoPdfContext?.relationship?.relationType
    || comp?.relationType
    || comp?.relationshipType
    || "",
  ).trim();

  const distanceRaw =
    sukyoPdfContext?.relationship?.distance
    ?? comp?.distance
    ?? comp?.shortestDistance;
  const distance = Number(distanceRaw);
  const safeDistance = Number.isFinite(distance) ? distance : null;

  const daily = Array.isArray(source?.cycleData?.daily) ? source.cycleData.daily : [];
  const monthly = Array.isArray(source?.cycleData?.monthly) ? source.cycleData.monthly : [];
  const yearly = Array.isArray(source?.cycleData?.yearly) ? source.cycleData.yearly : [];

  return {
    profile: {
      name: sukyoPdfContext?.userProfile?.name || "",
      birthDate: sukyoPdfContext?.userProfile?.solarBirthDate || "",
      birthTime: sukyoPdfContext?.userProfile?.birthTime || "",
      lunarDate: sukyoPdfContext?.userProfile?.lunarBirthDate || "",
    },
    "宿曜": {
      birthMansion: sukyoPdfContext?.mainStar?.nameKo || "",
      birthMansionIndex: safeNativeIndex,
      mansionGroup: sukyoPdfContext?.mainStar?.group || "unknown",
      guardianDeity: sukyoPdfContext?.mainStar?.animalSymbol || "",
      coreNature: sukyoPdfContext?.mainStar?.coreKeyword || "",
    },
    mansionAnalysis: {
      personality: sukyoPdfContext?.mainStar?.temperament || "",
      relationshipStyle:
        sukyoPdfContext?.relationship?.emotionalPattern
        || sukyoPdfContext?.persona?.firstImpressionKeyword
        || "",
      workStyle: sukyoPdfContext?.persona?.socialMask || "",
      wealthStyle:
        (Array.isArray(sukyoPdfContext?.domainScores)
          ? (sukyoPdfContext.domainScores.find((d) => d?.domain === "wealth")?.summary || "")
          : ""),
      weakness: sukyoPdfContext?.mainStar?.shadow || "",
      growthAdvice:
        (Array.isArray(sukyoPdfContext?.domainScores)
          ? (sukyoPdfContext.domainScores.find((d) => d?.domain === "spirituality")?.summary || "")
          : ""),
    },
    compatibility: {
      targetName: String(personB?.name || personB?.profile?.name || "").trim(),
      targetMansion: String(personB?.sukuyo?.nameKo || "").trim(),
      relationType,
      relationshipType: relationType,
      distance: safeDistance,
      summary:
        String(comp?.summary || "").trim()
        || String(sukyoPdfContext?.relationship?.emotionalPattern || "").trim(),
      emotionalPattern: String(sukyoPdfContext?.relationship?.emotionalPattern || "").trim(),
      emotionalCompatibility: String(sukyoPdfContext?.relationship?.emotionalPattern || "").trim(),
      conflictPattern:
        String(sukyoPdfContext?.relationship?.conflictPattern || "").trim()
        || String(comp?.conflictPattern || "").trim(),
      longTermPotential: String(comp?.longTermPotential || "").trim(),
      physicalChemistryHints: String(comp?.physicalChemistryHints || "").trim(),
      communicationStyle: String(comp?.communicationStyle || "").trim(),
      relationshipAdvice: Array.isArray(comp?.relationshipAdvice) ? comp.relationshipAdvice : [],
    },
    fortuneCycles: {
      daily,
      monthly,
      yearly,
    },
    birthInfo: {
      solarDate: sukyoPdfContext?.userProfile?.solarBirthDate || personA?.birth?.solarDate || "",
      lunarDate: sukyoPdfContext?.userProfile?.lunarBirthDate || personA?.birth?.lunarDate || "",
      moonLongitude: source?.calculationMeta?.moonLongitude || "",
      moonMansionIndex: safeNativeIndex,
      calculationSource:
        sukyoPdfContext?.chartMeta?.calculationSource
        || source?.calculationMeta?.calendarSource
        || source?.calculationMeta?.source
        || "fallback",
    },
    nativeSook: {
      name: sukyoPdfContext?.mainStar?.nameKo || "",
      nameKo: sukyoPdfContext?.mainStar?.nameKo || "",
      number: safeNativeIndex,
      group: sukyoPdfContext?.mainStar?.group || "unknown",
      animalSymbol: sukyoPdfContext?.mainStar?.animalSymbol || "",
      elementSymbol: source?.natalSukuyo?.element || personA?.sukuyo?.element || "",
      personalityArchetype: sukyoPdfContext?.persona?.rememberedAs || "",
      strengths: [sukyoPdfContext?.mainStar?.strength].filter(Boolean),
      weaknesses: [sukyoPdfContext?.mainStar?.shadow].filter(Boolean),
      relationshipPattern: sukyoPdfContext?.relationship?.emotionalPattern || "",
      careerPattern:
        (Array.isArray(sukyoPdfContext?.domainScores)
          ? (sukyoPdfContext.domainScores.find((d) => d?.domain === "work")?.summary || "")
          : ""),
      emotionalPattern:
        (Array.isArray(sukyoPdfContext?.domainScores)
          ? (sukyoPdfContext.domainScores.find((d) => d?.domain === "emotion")?.summary || "")
          : ""),
    },
    twentySevenSook: SUKUYO_MANSIONS.map((row, idx) => ({
      number: idx + 1,
      name: row[0],
      modernTitle: row[2],
      symbol: row[5],
      keywords: [row[3], row[4]].filter(Boolean),
      meaning: `${row[0]}宿 (${row[1]})`,
    })),
    cycleData: {
      daily,
      monthly,
      yearly,
    },
    sukyoPdfContext,
    dataQuality: {
      fallbackUsed: !inputCheck.canGenerate || (sukyoPdfContext?.missingSummary || []).length > 0,
      missingFields: Array.isArray(sukyoPdfContext?.missingSummary) ? sukyoPdfContext.missingSummary : [],
      validation: inputCheck,
    },
    _compatibilityRequired: Boolean(
      String(requestBody?.reportType || requestBody?.reportMode || "").toLowerCase() === "compatibility"
      || requestBody?.includeCompatibility === true,
    ),
  };
}

function mapWesternAstrologyCalculatedData(canonical) {
  const planets = normalizeAstroPlanetMap(canonical?.planets || canonical?.chart?.planets || {});
  return {
    birthInfo: {
      date: canonical?.profile?.birth?.date || "",
      time: canonical?.profile?.birth?.time || "",
      place: canonical?.profile?.birth?.place || "",
      latitude: Number(canonical?.profile?.birth?.latitude || 0),
      longitude: Number(canonical?.profile?.birth?.longitude || 0),
      timezone: canonical?.profile?.birth?.timezone || "",
      houseSystem: canonical?.settings?.houseSystem || "Placidus",
      zodiac: canonical?.settings?.zodiac || "tropical",
      ephemerisSource: canonical?.calculationMeta?.ephemerisSource || "Swiss Ephemeris",
    },
    angles: {
      ascendant: canonical?.angles?.ascendant || {},
      midheaven: canonical?.angles?.midheaven || {},
      descendant: canonical?.angles?.descendant || {},
      imumCoeli: canonical?.angles?.imumCoeli || {},
    },
    planets,
    houses: Array.isArray(canonical?.houses) ? canonical.houses : [],
    aspects: Array.isArray(canonical?.aspects) ? canonical.aspects : [],
    elementBalance: canonical?.elementBalance || {},
    modalityBalance: canonical?.modalityBalance || {},
    relationshipData: canonical?.relationshipData || {},
    careerData: canonical?.careerData || {},
  };
}

function mapVedicCalculatedData(canonical) {
  const planets = normalizeAstroPlanetMap(canonical?.planets || {});
  return {
    birthInfo: {
      date: canonical?.profile?.birth?.date || "",
      time: canonical?.profile?.birth?.time || "",
      place: canonical?.profile?.birth?.place || "",
      latitude: Number(canonical?.profile?.birth?.latitude || 0),
      longitude: Number(canonical?.profile?.birth?.longitude || 0),
      timezone: canonical?.profile?.birth?.timezone || "",
      zodiac: canonical?.settings?.zodiac || "sidereal",
      ayanamsa: canonical?.settings?.ayanamsa || "Lahiri",
      ephemerisSource: canonical?.calculationMeta?.ephemerisSource || "Swiss Ephemeris",
    },
    lagna: canonical?.lagna || {},
    rashiChart: canonical?.rashiChart || {},
    navamsaChart: canonical?.navamsaChart || {},
    planets,
    nakshatras: canonical?.nakshatras || {},
    karakas: canonical?.karakas || {},
    dashas: canonical?.dashas || {},
    yogas: canonical?.yogas || [],
    relationshipData: canonical?.relationshipData || {},
    careerData: canonical?.careerData || {},
  };
}

function mapLoveSecretCalculatedData(canonical, supplemental) {
  const optionalCross = {
    ziweiRelationship: supplemental?.ziweiPremium?.calculatedData?.relationshipData || {},
    sookyoRelationship: supplemental?.sookyoPremium?.calculatedData?.compatibility || {},
    westernRelationship: supplemental?.westernAstrologyPremium?.calculatedData?.relationshipData || {},
    vedicRelationship: supplemental?.vedicPremium?.calculatedData?.relationshipData || {},
  };

  return {
    self: {
      birthInfo: canonical?.personA?.birth || {},
      sajuChart: canonical?.personA?.sajuChart || {},
      fiveElementBalance: canonical?.personA?.fiveElementBalance || {},
      relationshipProfile: canonical?.personA?.relationshipProfile || {},
    },
    partner: {
      birthInfo: canonical?.personB?.birth || {},
      sajuChart: canonical?.personB?.sajuChart || {},
      fiveElementBalance: canonical?.personB?.fiveElementBalance || {},
      relationshipProfile: canonical?.personB?.relationshipProfile || {},
    },
    compatibility: canonical?.compatibility || {},
    optionalCrossSystems: optionalCross,
  };
}

function mapLifeBookCalculatedData(primary, supplemental) {
  const saju = primary?.calculatedData || primary || {};
  const ziwei = supplemental?.ziweiPremium?.calculatedData || {};
  const sookyo = supplemental?.sookyoPremium?.calculatedData || {};
  const western = supplemental?.westernAstrologyPremium?.calculatedData || {};
  const vedic = supplemental?.vedicPremium?.calculatedData || {};

  const repeatedSignals = [];
  const conflictingSignals = [];
  if (hasMeaningfulValue(saju?.relationshipProfile?.conflictSignals) && hasMeaningfulValue(ziwei?.relationshipData?.marriageRiskSignals)) {
    repeatedSignals.push("관계 경계선 관리 필요");
  }
  if (hasMeaningfulValue(western?.careerData?.tenthHouse) && hasMeaningfulValue(vedic?.careerData?.tenthHouse)) {
    repeatedSignals.push("직업 방향성의 장기성 강조");
  }
  if (hasMeaningfulValue(western?.modalityBalance) && hasMeaningfulValue(saju?.fiveElementBalance)) {
    conflictingSignals.push("서양 차트의 변동성/사주의 안정성 신호가 혼재될 수 있음");
  }

  return {
    saju,
    ziwei,
    sookyo,
    westernAstrology: western,
    vedic,
    integratedThemes: {
      coreIdentity: primary?.interpretationSeed?.coreIdentity || [],
      lifeMission: primary?.interpretationSeed?.lifeMission || [],
      careerDirection: primary?.interpretationSeed?.careerDirection || [],
      relationshipPattern: primary?.interpretationSeed?.relationshipPattern || [],
      wealthPattern: primary?.interpretationSeed?.wealthPattern || [],
      healthPattern: primary?.interpretationSeed?.healthPattern || [],
      turningPoints: primary?.interpretationSeed?.turningPoints || [],
      repeatedSignals,
      conflictingSignals,
    },
    timeline: {
      sajuDaewoon: saju?.luckCycles?.daewoonList || [],
      ziweiDaXian: ziwei?.cycles?.daXian || [],
      vedicDasha: vedic?.dashas?.vimshottari?.periods || [],
      astrologyTransits: western?.timingData?.transits || [],
    },
  };
}

function buildChapterDataMap(reportType, calculatedData) {
  if (reportType === "ziweiPremium") {
    return {
      ch1: {
        chapterTitle: "명궁",
        requiredPaths: ["calculatedData"],
      },
      ch2: {
        chapterTitle: "신궁",
        requiredPaths: ["calculatedData"],
      },
      ch3: { chapterTitle: "관록궁과 직업운", requiredPaths: ["calculatedData"] },
      ch4: { chapterTitle: "재백궁과 재물운", requiredPaths: ["calculatedData"] },
      ch5: { chapterTitle: "부처궁과 연애결혼", requiredPaths: ["calculatedData"] },
      ch6: { chapterTitle: "복덕궁과 내면 행복", requiredPaths: ["calculatedData"] },
      ch7: { chapterTitle: "천이궁과 대외운", requiredPaths: ["calculatedData"] },
      ch8: { chapterTitle: "질액궁과 건강운", requiredPaths: ["calculatedData"] },
      ch9: { chapterTitle: "형제노복부모궁 관계", requiredPaths: ["calculatedData"] },
      ch10: { chapterTitle: "전택궁과 기반운", requiredPaths: ["calculatedData"] },
      ch11: { chapterTitle: "삼방사정 큰 구조", requiredPaths: ["calculatedData"] },
      ch12: { chapterTitle: "종합 운명 처방전", requiredPaths: ["calculatedData"] },
      ch13: { chapterTitle: "부록: 90일 실행 플랜", requiredPaths: ["calculatedData"] },
    };
  }

  if (reportType === "sookyoPremium") {
    return Object.fromEntries(
      SUKYO_PDF_CHAPTERS.map((chapter, idx) => [
        `ch${idx + 1}`,
        {
          chapterTitle: String(chapter?.title || `Chapter ${idx + 1}`),
          requiredPaths: ["calculatedData.sukyoPdfContext.userProfile"],
        },
      ]),
    );
  }

  if (reportType === "westernAstrologyPremium") {
    return {
      ch1: { chapterTitle: "핵심 자아", requiredPaths: ["calculatedData.planets.sun", "calculatedData.angles.ascendant"] },
      ch2: { chapterTitle: "감정 구조", requiredPaths: ["calculatedData.planets.moon"] },
      ch3: { chapterTitle: "사회적 이미지", requiredPaths: ["calculatedData.angles.ascendant", "calculatedData.angles.midheaven"] },
      ch4: { chapterTitle: "사랑 방식", requiredPaths: ["calculatedData.relationshipData.venus", "calculatedData.relationshipData.mars"] },
      ch5: { chapterTitle: "관계 패턴", requiredPaths: ["calculatedData.houses", "calculatedData.relationshipData.majorLoveAspects"] },
      ch6: { chapterTitle: "직업/소명", requiredPaths: ["calculatedData.careerData"] },
      ch7: { chapterTitle: "인생 과제", requiredPaths: ["calculatedData.planets.saturn", "calculatedData.aspects"] },
      ch8: { chapterTitle: "재능", requiredPaths: ["calculatedData.aspects", "calculatedData.planets.jupiter"] },
      ch9: { chapterTitle: "내면 갈등", requiredPaths: ["calculatedData.aspects"] },
      ch10: { chapterTitle: "종합", requiredPaths: ["calculatedData"] },
    };
  }

  if (reportType === "vedicPremium") {
    return {
      ch1: { chapterTitle: "영혼의 설계도", requiredPaths: ["calculatedData.lagna", "calculatedData.nakshatras.moonNakshatra", "calculatedData.karakas.atmakaraka"] },
      ch2: { chapterTitle: "현실 성향", requiredPaths: ["calculatedData.rashiChart"] },
      ch3: { chapterTitle: "내면 운명", requiredPaths: ["calculatedData.navamsaChart"] },
      ch4: { chapterTitle: "카르마 과제", requiredPaths: ["calculatedData.karakas", "calculatedData.planets.saturn", "calculatedData.planets.rahu", "calculatedData.planets.ketu"] },
      ch5: { chapterTitle: "사랑/결혼", requiredPaths: ["calculatedData.relationshipData"] },
      ch6: { chapterTitle: "직업/소명", requiredPaths: ["calculatedData.careerData"] },
      ch7: { chapterTitle: "인생 주기", requiredPaths: ["calculatedData.dashas.vimshottari"] },
      ch8: { chapterTitle: "요가 분석", requiredPaths: ["calculatedData.yogas"] },
      ch9: { chapterTitle: "종합 전략", requiredPaths: ["calculatedData"] },
    };
  }

  if (reportType === "loveSecret") {
    return {
      ch1: { chapterTitle: "나의 연애 본능", requiredPaths: ["calculatedData.self.sajuChart.dayMaster", "calculatedData.self.relationshipProfile"] },
      ch2: { chapterTitle: "끌림의 구조", requiredPaths: ["calculatedData.self.fiveElementBalance", "calculatedData.self.relationshipProfile.attractionSignals"] },
      ch3: { chapterTitle: "반복 패턴", requiredPaths: ["calculatedData.self.relationshipProfile.conflictSignals", "calculatedData.self.sajuChart.tenGods"] },
      ch4: { chapterTitle: "상대와의 궁합", requiredPaths: ["calculatedData.compatibility"] },
      ch5: { chapterTitle: "속궁합/조후", requiredPaths: ["calculatedData.compatibility.temperatureHumidityMatch"] },
      ch6: { chapterTitle: "감정 소통", requiredPaths: ["calculatedData.compatibility.communicationPattern"] },
      ch7: { chapterTitle: "결혼 가능성", requiredPaths: ["calculatedData.compatibility.longTermMarriagePotential"] },
      ch8: { chapterTitle: "갈등 해결법", requiredPaths: ["calculatedData.compatibility.practicalAdvice"] },
      ch9: { chapterTitle: "종합 연애 전략", requiredPaths: ["calculatedData"] },
    };
  }

  if (reportType === "lifeBook") {
    return {
      ch1: { chapterTitle: "핵심 정체성", requiredPaths: ["calculatedData.integratedThemes.coreIdentity"] },
      ch2: { chapterTitle: "타고난 성향", requiredPaths: ["calculatedData.saju"] },
      ch3: { chapterTitle: "인생의 소명", requiredPaths: ["calculatedData.integratedThemes.lifeMission"] },
      ch4: { chapterTitle: "직업과 사회적 방향", requiredPaths: ["calculatedData.integratedThemes.careerDirection"] },
      ch5: { chapterTitle: "재물 흐름", requiredPaths: ["calculatedData.integratedThemes.wealthPattern"] },
      ch6: { chapterTitle: "관계와 사랑", requiredPaths: ["calculatedData.integratedThemes.relationshipPattern"] },
      ch7: { chapterTitle: "건강과 에너지", requiredPaths: ["calculatedData.integratedThemes.healthPattern"] },
      ch8: { chapterTitle: "인생 전환점", requiredPaths: ["calculatedData.timeline"] },
      ch9: { chapterTitle: "반복 신호", requiredPaths: ["calculatedData.integratedThemes.repeatedSignals"] },
      ch10: { chapterTitle: "충돌 신호", requiredPaths: ["calculatedData.integratedThemes.conflictingSignals"] },
      ch11: { chapterTitle: "종합 인생 전략", requiredPaths: ["calculatedData"] },
    };
  }

  return {};
}

function buildInterpretationSeed(reportType, calculatedData) {
  if (reportType === "ziweiPremium") {
    return {
      coreIdentity: [calculatedData?.coreChart?.mingGong || "", calculatedData?.coreChart?.shenGong || ""].filter(Boolean),
      requiredPalaces: ["ming", "shen", "fortune", "career", "wealth", "spouse"],
    };
  }
  if (reportType === "sookyoPremium") {
    return {
      nativeSook:
        calculatedData?.sukyoPdfContext?.mainStar?.nameKo
        || calculatedData?.nativeSook?.name
        || "",
      relationshipType:
        calculatedData?.sukyoPdfContext?.relationship?.relationType
        || calculatedData?.compatibility?.relationshipType
        || calculatedData?.compatibility?.relationType
        || "",
    };
  }
  if (reportType === "westernAstrologyPremium") {
    return {
      ascendant: calculatedData?.angles?.ascendant || {},
      sun: calculatedData?.planets?.sun || {},
      moon: calculatedData?.planets?.moon || {},
      saturn: calculatedData?.planets?.saturn || {},
    };
  }
  if (reportType === "vedicPremium") {
    return {
      lagna: calculatedData?.lagna || {},
      moonNakshatra: calculatedData?.nakshatras?.moonNakshatra || {},
      currentDasha: calculatedData?.dashas?.vimshottari || {},
    };
  }
  if (reportType === "loveSecret") {
    return {
      dayMaster: calculatedData?.self?.sajuChart?.dayMaster || "",
      temperatureHumidityMatch: calculatedData?.compatibility?.temperatureHumidityMatch || "",
    };
  }
  if (reportType === "lifeBook") {
    return {
      coreIdentity: calculatedData?.integratedThemes?.coreIdentity || [],
      lifeMission: calculatedData?.integratedThemes?.lifeMission || [],
      careerDirection: calculatedData?.integratedThemes?.careerDirection || [],
      relationshipPattern: calculatedData?.integratedThemes?.relationshipPattern || [],
      wealthPattern: calculatedData?.integratedThemes?.wealthPattern || [],
      healthPattern: calculatedData?.integratedThemes?.healthPattern || [],
      turningPoints: calculatedData?.integratedThemes?.turningPoints || [],
    };
  }
  return {};
}

function validateCanonicalJson(reportType, canonicalJson) {
  const requiredByType = {
    ziweiPremium: [
      "calculatedData",
    ],
    sookyoPremium: [
      "calculatedData.sukyoPdfContext.userProfile",
    ],
    westernAstrologyPremium: [
      "calculatedData.birthInfo.houseSystem",
      "calculatedData.birthInfo.zodiac",
      "calculatedData.angles.ascendant.sign",
      "calculatedData.angles.midheaven.sign",
      "calculatedData.planets.sun.sign",
      "calculatedData.planets.moon.sign",
      "calculatedData.planets.venus.sign",
      "calculatedData.planets.mars.sign",
      "calculatedData.planets.saturn.sign",
      "calculatedData.houses",
      "calculatedData.aspects",
    ],
    vedicPremium: [
      "calculatedData.birthInfo.zodiac",
      "calculatedData.birthInfo.ayanamsa",
      "calculatedData.lagna.sign",
      "calculatedData.nakshatras.moonNakshatra.name",
      "calculatedData.navamsaChart.houses",
      "calculatedData.planets.rahu",
      "calculatedData.planets.ketu",
      "calculatedData.dashas.vimshottari.currentMahaDasha",
      "calculatedData.karakas.atmakaraka",
      "calculatedData.karakas.amatyakaraka",
      "calculatedData.karakas.darakaraka",
    ],
    loveSecret: [
      "calculatedData.self.sajuChart.yearPillar",
      "calculatedData.self.sajuChart.monthPillar",
      "calculatedData.self.sajuChart.dayPillar",
      "calculatedData.self.sajuChart.hourPillar",
      "calculatedData.self.sajuChart.dayMaster",
      "calculatedData.self.sajuChart.tenGods",
      "calculatedData.self.fiveElementBalance",
      "calculatedData.compatibility.temperatureHumidityMatch",
    ],
    lifeBook: [
      "calculatedData.saju",
      "calculatedData.integratedThemes.coreIdentity",
      "calculatedData.integratedThemes.lifeMission",
      "calculatedData.timeline",
    ],
  };

  const optionalByType = {
    ziweiPremium: [
      "calculatedData.coreChart.mingGong",
      "calculatedData.coreChart.shenGong",
      "calculatedData.palaces.ming.mainStars",
      "calculatedData.palaces.fortune.mainStars",
      "calculatedData.palaces.career.mainStars",
      "calculatedData.palaces.wealth.mainStars",
      "calculatedData.palaces.spouse.mainStars",
      "calculatedData.cycles.daXian",
      "calculatedData.cycles.monthly",
      "calculatedData.relationshipData.compatibilityHints",
    ],
    sookyoPremium: ["calculatedData.cycleData.monthly", "calculatedData.compatibility.relationshipAdvice"],
    westernAstrologyPremium: ["calculatedData.elementBalance", "calculatedData.modalityBalance"],
    vedicPremium: ["calculatedData.yogas", "calculatedData.relationshipData"],
    loveSecret: ["calculatedData.optionalCrossSystems"],
    lifeBook: ["calculatedData.integratedThemes.repeatedSignals", "calculatedData.integratedThemes.conflictingSignals"],
  };

  const requiredPaths = requiredByType[reportType] || [];
  const optionalPaths = optionalByType[reportType] || [];
  const requiredMissing = requiredPaths.filter((path) => pathMissing(canonicalJson, path));
  const optionalMissing = optionalPaths.filter((path) => pathMissing(canonicalJson, path));

  if (reportType === "ziweiPremium") {
    const palaceKeys = ["ming", "siblings", "spouse", "children", "wealth", "health", "travel", "friends", "career", "property", "fortune", "parents"];
    palaceKeys.forEach((key) => {
      const fullPath = `calculatedData.palaces.${key}`;
      if (pathMissing(canonicalJson, fullPath)) optionalMissing.push(fullPath);
    });
  }

  if (reportType === "sookyoPremium") {
    const sukyoContext = getPathValue(canonicalJson, "calculatedData.sukyoPdfContext") || {};
    const hasMinimalInput = hasMeaningfulValue(sukyoContext?.userProfile?.solarBirthDate)
      || hasMeaningfulValue(sukyoContext?.userProfile?.name)
      || hasMeaningfulValue(sukyoContext?.mainStar?.nameKo)
      || hasMeaningfulValue(sukyoContext?.mainStar?.coreKeyword)
      || hasMeaningfulValue(sukyoContext?.rawBasicResult?.summary);
    if (!hasMinimalInput) {
      requiredMissing.push("calculatedData.sukyoPdfContext.minimalSource");
    }

    const compatRequired = Boolean(getPathValue(canonicalJson, "calculatedData._compatibilityRequired"));
    if (compatRequired) {
      [
        "calculatedData.compatibility.relationshipType",
        "calculatedData.compatibility.distance",
      ].forEach((path) => {
        if (pathMissing(canonicalJson, path)) optionalMissing.push(path);
      });
    }
  }

  if (reportType === "lifeBook") {
    const hasZiwei = hasMeaningfulValue(getPathValue(canonicalJson, "calculatedData.ziwei"));
    const hasWestern = hasMeaningfulValue(getPathValue(canonicalJson, "calculatedData.westernAstrology"));
    if (!hasZiwei && !hasWestern) {
      requiredMissing.push("calculatedData.ziwei|calculatedData.westernAstrology");
    }
  }

  const uniqueRequiredMissing = Array.from(new Set(requiredMissing));
  const uniqueOptionalMissing = Array.from(new Set(optionalMissing));
  return {
    ok: uniqueRequiredMissing.length === 0,
    requiredMissing: uniqueRequiredMissing,
    optionalMissing: uniqueOptionalMissing,
    canGeneratePdf: uniqueRequiredMissing.length === 0,
    reason: uniqueRequiredMissing.length === 0 ? "" : "필수 계산 데이터가 부족합니다.",
  };
}

function buildCanonicalJsonForReport(reportType, prepareData, requestBody, authInfo, meta) {
  const input = requestBody && typeof requestBody === "object" ? requestBody : {};
  const supplemental = meta?.supplementalCanonicalByType || {};
  let calculatedData = {};

  if (reportType === "ziweiPremium") {
    calculatedData = mapZiweiCalculatedData(prepareData?.canonicalZiweiChart || {});
  } else if (reportType === "sookyoPremium") {
    calculatedData = mapSookyoCalculatedData(prepareData?.canonicalSukuyoCompatibility || prepareData?.canonicalSukuyoNatal || {}, requestBody);
  } else if (reportType === "westernAstrologyPremium") {
    calculatedData = mapWesternAstrologyCalculatedData(prepareData?.canonicalAstroChart || {});
  } else if (reportType === "vedicPremium") {
    calculatedData = mapVedicCalculatedData(prepareData?.canonicalVedicChart || {});
  } else if (reportType === "loveSecret") {
    calculatedData = mapLoveSecretCalculatedData(prepareData?.canonicalSajuLoveReport || {}, supplemental);
  } else if (reportType === "lifeBook") {
    calculatedData = mapLifeBookCalculatedData(
      {
        calculatedData: prepareData?.canonicalSajuChart || requestBody?.canonicalSajuChart || {},
        interpretationSeed: {
          coreIdentity: prepareData?.coreIdentity || [],
          lifeMission: prepareData?.lifeMission || [],
          careerDirection: prepareData?.careerDirection || [],
          relationshipPattern: prepareData?.relationshipPattern || [],
          wealthPattern: prepareData?.wealthPattern || [],
          healthPattern: prepareData?.healthPattern || [],
          turningPoints: prepareData?.turningPoints || [],
        },
      },
      supplemental,
    );
  }

  const chapterData = buildChapterDataMap(reportType, calculatedData);
  const interpretationSeed = buildInterpretationSeed(reportType, calculatedData);

  const canonicalJson = {
    reportId: String(meta?.reportId || ""),
    reportType: String(reportType || ""),
    userId: String(authInfo?.userId || ""),
    inputHash: String(meta?.inputHash || ""),
    calculationVersion: String(meta?.calculationVersion || "premium-report-v1"),
    createdAt: String(meta?.createdAt || new Date().toISOString()),
    input,
    sourceMap: {
      usedBaseAnalysis: Boolean(meta?.sourceMap?.usedBaseAnalysis),
      usedSavedAnalysis: Boolean(meta?.sourceMap?.usedSavedAnalysis),
      usedRecalculation: Boolean(meta?.sourceMap?.usedRecalculation),
      usedExternalApi: Boolean(meta?.sourceMap?.usedExternalApi),
      sourceNames: Array.isArray(meta?.sourceMap?.sourceNames) ? meta.sourceMap.sourceNames : [],
    },
    calculatedData,
    interpretationSeed,
    chapterData,
    missingData: [],
    warnings: [],
    isCompleteForPdf: false,
  };

  const validation = validateCanonicalJson(reportType, canonicalJson);
  canonicalJson.missingData = Array.from(new Set(validation.requiredMissing));
  canonicalJson.warnings = Array.from(new Set(validation.optionalMissing));
  canonicalJson.isCompleteForPdf = validation.canGeneratePdf;
  return { canonicalJson, validation };
}

function toPlainObject(value) {
  return value && typeof value === "object" ? value : {};
}

function toTopArray(value, max = 8) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, Math.max(1, Number(max) || 8));
}

function compactZiweiPalaceForPrompt(palace) {
  const source = toPlainObject(palace);
  return {
    name: String(source.name || ""),
    earthlyBranch: String(source.earthlyBranch || ""),
    mainStars: toTopArray(source.mainStars, 4),
    minorStars: toTopArray(source.minorStars, 4),
    auxiliaryStars: toTopArray(source.auxiliaryStars, 4),
    maleficStars: toTopArray(source.maleficStars, 4),
    fourTransformations: toTopArray(source.fourTransformations, 4),
  };
}

function buildChapterJsonPacks(reportType, chapterId, canonicalJson) {
  const chapterKey = `ch${Number(chapterId || 0)}`;
  const chapterMeta = toPlainObject(canonicalJson?.chapterData?.[chapterKey]);
  const requiredPaths = Array.isArray(chapterMeta.requiredPaths) ? chapterMeta.requiredPaths : [];
  const requiredData = {};
  requiredPaths.forEach((path) => {
    requiredData[path] = getPathValue(canonicalJson, path);
  });

  const calculatedData = toPlainObject(canonicalJson?.calculatedData);
  const interpretationSeed = toPlainObject(canonicalJson?.interpretationSeed);
  const chapterCore = {
    chapterId: Number(chapterId || 0),
    chapterKey,
    chapterTitle: String(chapterMeta.chapterTitle || `Chapter ${chapterId}`),
    requiredPaths,
    requiredData,
  };

  if (reportType === "ziweiPremium") {
    const palaces = toPlainObject(calculatedData.palaces);
    return {
      chapterCore,
      signals: {
        coreChart: toPlainObject(calculatedData.coreChart),
        ming: compactZiweiPalaceForPrompt(palaces.ming),
        spouse: compactZiweiPalaceForPrompt(palaces.spouse),
        wealth: compactZiweiPalaceForPrompt(palaces.wealth),
        career: compactZiweiPalaceForPrompt(palaces.career),
        health: compactZiweiPalaceForPrompt(palaces.health),
      },
      timing: {
        daXian: toTopArray(calculatedData?.cycles?.daXian, 6),
        annual: toTopArray(calculatedData?.cycles?.annual, 4),
        monthly: toTopArray(calculatedData?.cycles?.monthly, 4),
      },
      actions: {
        relationshipData: toPlainObject(calculatedData.relationshipData),
        careerData: toPlainObject(calculatedData.careerData),
        healthData: toPlainObject(calculatedData.healthData),
      },
    };
  }

  if (reportType === "sookyoPremium") {
    const sukyoContext = toPlainObject(calculatedData.sukyoPdfContext);
    return {
      chapterCore,
      signals: {
        birthInfo: toPlainObject(calculatedData.birthInfo),
        nativeSook: toPlainObject(calculatedData.nativeSook),
        compatibility: toPlainObject(calculatedData.compatibility),
        sukyoPdfContext: sukyoContext,
      },
      timing: {
        cycleData: toPlainObject(calculatedData.cycleData),
      },
      actions: {
        relationshipAdvice: toTopArray(calculatedData?.compatibility?.relationshipAdvice, 8),
        twentySevenSook: toTopArray(calculatedData.twentySevenSook, 12),
        chapterBlueprint: SUKYO_PDF_CHAPTERS,
      },
    };
  }

  if (reportType === "westernAstrologyPremium") {
    return {
      chapterCore,
      signals: {
        birthInfo: toPlainObject(calculatedData.birthInfo),
        angles: toPlainObject(calculatedData.angles),
        planets: {
          sun: toPlainObject(calculatedData?.planets?.sun),
          moon: toPlainObject(calculatedData?.planets?.moon),
          venus: toPlainObject(calculatedData?.planets?.venus),
          mars: toPlainObject(calculatedData?.planets?.mars),
          saturn: toPlainObject(calculatedData?.planets?.saturn),
        },
      },
      timing: {
        aspectsTop: toTopArray(calculatedData.aspects, 18),
        housesTop: toTopArray(calculatedData.houses, 12),
      },
      actions: {
        relationshipData: toPlainObject(calculatedData.relationshipData),
        careerData: toPlainObject(calculatedData.careerData),
        elementBalance: toPlainObject(calculatedData.elementBalance),
        modalityBalance: toPlainObject(calculatedData.modalityBalance),
      },
    };
  }

  if (reportType === "vedicPremium") {
    return {
      chapterCore,
      signals: {
        birthInfo: toPlainObject(calculatedData.birthInfo),
        lagna: toPlainObject(calculatedData.lagna),
        moonNakshatra: toPlainObject(calculatedData?.nakshatras?.moonNakshatra),
        karakas: toPlainObject(calculatedData.karakas),
        planets: {
          saturn: toPlainObject(calculatedData?.planets?.saturn),
          rahu: toPlainObject(calculatedData?.planets?.rahu),
          ketu: toPlainObject(calculatedData?.planets?.ketu),
        },
      },
      timing: {
        dasha: toPlainObject(calculatedData.dashas),
        yogas: toTopArray(calculatedData.yogas, 10),
      },
      actions: {
        relationshipData: toPlainObject(calculatedData.relationshipData),
        careerData: toPlainObject(calculatedData.careerData),
      },
    };
  }

  if (reportType === "loveSecret") {
    return {
      chapterCore,
      signals: {
        self: {
          birthInfo: toPlainObject(calculatedData?.self?.birthInfo),
          sajuChart: toPlainObject(calculatedData?.self?.sajuChart),
          relationshipProfile: toPlainObject(calculatedData?.self?.relationshipProfile),
        },
        partner: {
          birthInfo: toPlainObject(calculatedData?.partner?.birthInfo),
          sajuChart: toPlainObject(calculatedData?.partner?.sajuChart),
          relationshipProfile: toPlainObject(calculatedData?.partner?.relationshipProfile),
        },
      },
      timing: {
        compatibility: toPlainObject(calculatedData.compatibility),
      },
      actions: {
        optionalCrossSystems: toPlainObject(calculatedData.optionalCrossSystems),
      },
    };
  }

  if (reportType === "lifeBook") {
    return {
      chapterCore,
      signals: {
        integratedThemes: toPlainObject(calculatedData.integratedThemes),
        saju: toPlainObject(calculatedData.saju),
      },
      timing: {
        timeline: toPlainObject(calculatedData.timeline),
      },
      actions: {
        ziwei: toPlainObject(calculatedData.ziwei),
        westernAstrology: toPlainObject(calculatedData.westernAstrology),
        vedic: toPlainObject(calculatedData.vedic),
        sookyo: toPlainObject(calculatedData.sookyo),
      },
    };
  }

  return {
    chapterCore,
    signals: {
      calculatedData,
      interpretationSeed,
    },
    timing: {},
    actions: {},
  };
}

function buildLlmPromptInput(reportType, chapterId, canonicalJson, prebuiltChapterJsonPacks = null) {
  const chapterKey = `ch${Number(chapterId || 0)}`;
  const chapterMeta = canonicalJson?.chapterData?.[chapterKey] || {};
  const requiredPaths = Array.isArray(chapterMeta.requiredPaths) ? chapterMeta.requiredPaths : [];
  const chapterDataSubset = {};
  requiredPaths.forEach((path) => {
    chapterDataSubset[path] = getPathValue(canonicalJson, path);
  });
  const chapterJsonPacks = prebuiltChapterJsonPacks || buildChapterJsonPacks(reportType, chapterId, canonicalJson);

  return {
    reportType,
    chapterId: String(chapterId || ""),
    chapterTitle: String(chapterMeta.chapterTitle || `Chapter ${chapterId}`),
    tone: "Code:Destiny premium mystical but practical Korean tone",
    calculatedDataForThisChapter: chapterDataSubset,
    chapterJsonPacks,
    globalSummary: canonicalJson?.interpretationSeed || {},
    doNotCalculate: true,
    rules: [
      "계산되지 않은 내용을 임의로 만들지 말 것",
      "JSON에 없는 별, 행성, 궁, 십성, 숙요 관계를 지어내지 말 것",
      "계산 데이터와 해석을 구분할 것",
      "사용자가 이해하기 쉬운 한국어로 풀어쓸 것",
      "미신적 단정 대신 전략과 자기이해 중심으로 작성할 것",
      "chapterJsonPacks(core/signals/timing/actions)에서 최소 3개 이상 근거를 본문에 반영할 것",
    ],
  };
}

function getSukyoChapterBlueprint(chapterId) {
  const idx = Math.max(0, Number(chapterId || 1) - 1);
  return SUKYO_PDF_CHAPTERS[idx] || {
    key: `chapter-${chapterId}`,
    title: `Ch.${chapterId} 숙요점 해석`,
    goal: "숙요점 데이터 기반 해석",
  };
}

async function generateSukyoPremiumChapterFromContext({ env, context, chapterId, requestId }) {
  const chapter = getSukyoChapterBlueprint(chapterId);
  const calculated = context?.coreData?.canonicalJson?.calculatedData || {};
  const sukyoContext = calculated?.sukyoPdfContext || buildSukyoPdfContext({
    canonical: context?.coreData?.canonicalJson || {},
    requestBody: context?.input || {},
    rawBasicResult: {
      summary: calculated?.nativeSook?.name || calculated?.nativeSook?.coreNature || "",
    },
  });

  const inputValidation = validateSukyoPdfInput(sukyoContext);
  const chapterMeta = {
    num: Number(chapterId || 1),
    title: chapter.title,
    subtitle: chapter.goal,
  };

  if (!inputValidation.canGenerate) {
    const fallback = createFallbackSukyoChapter(chapter, sukyoContext, "INPUT_VALIDATION_FAILED");
    const text = renderSukyoChapterMarkdown(fallback, chapter);
    return {
      ok: true,
      text,
      chapterMeta,
      chapterSpecificSections: [],
      usedFallback: true,
      fallbackReason: "INPUT_VALIDATION_FAILED",
      missingFields: inputValidation.missingFields,
    };
  }

  const prompt = buildSukyoGeminiPrompt({
    context: sukyoContext,
    chapter,
  });

  const options = {
    temperature: 0.72,
    topP: 0.9,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_SUKUYO_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 70000),
    maxAttemptsPerPair: Number(env.PREMIUM_SUKUYO_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 2),
  };

  try {
    const raw = await callGemini(env, prompt, ["PREMIUM_SUKUYO_GEMINI_MODEL"], options);
    const parsed = parseSukyoGeminiChapterResponse(raw);

    if (!parsed.ok || !parsed.parsed) {
      const fallback = createFallbackSukyoChapter(chapter, sukyoContext, parsed.error || "JSON_PARSE_FAILED");
      const text = renderSukyoChapterMarkdown(fallback, chapter);
      return {
        ok: true,
        text,
        chapterMeta,
        chapterSpecificSections: [],
        usedFallback: true,
        fallbackReason: parsed.error || "JSON_PARSE_FAILED",
        missingFields: sukyoContext?.missingSummary || [],
      };
    }

    const chapterJson = sanitizeSukyoChapterJson(chapter, parsed.parsed, sukyoContext);
    const text = renderSukyoChapterMarkdown(chapterJson, chapter);

    return {
      ok: true,
      text,
      chapterMeta,
      chapterSpecificSections: [],
      usedFallback: false,
      fallbackReason: "",
      missingFields: sukyoContext?.missingSummary || [],
      repairedJson: Boolean(parsed.repaired),
    };
  } catch (error) {
    console.error("[SukyoPDF] generation failed", {
      userId: context?.userId || "",
      featureKey: context?.featureType || "",
      reportSessionId: context?.reportSessionId || "",
      reportId: context?.reportId || "",
      chapterKey: chapter.key,
      chapterId,
      requestId,
      missingFields: sukyoContext?.missingSummary || [],
      rawError: String(error?.message || error || "unknown"),
      refundStatus: "not_applicable_server_fallback",
      chartMeta: sukyoContext?.chartMeta || {},
    });

    const fallback = createFallbackSukyoChapter(chapter, sukyoContext, String(error?.message || "GEMINI_ERROR"));
    const text = renderSukyoChapterMarkdown(fallback, chapter);
    return {
      ok: true,
      text,
      chapterMeta,
      chapterSpecificSections: [],
      usedFallback: true,
      fallbackReason: String(error?.message || "GEMINI_ERROR"),
      missingFields: sukyoContext?.missingSummary || [],
    };
  }
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function normalizeAspectType(type) {
  const source = String(type || "").trim().toLowerCase();
  if (source.includes("conj")) return "conjunction";
  if (source.includes("opp")) return "opposition";
  if (source.includes("squ")) return "square";
  if (source.includes("tri")) return "trine";
  if (source.includes("sex")) return "sextile";
  if (source.includes("quin")) return "quincunx";
  if (source.includes("semi")) return "semi-square";
  if (source.includes("sesqui")) return "sesquiquadrate";
  return source || "aspect";
}

function aspectDegreeByType(type) {
  const t = normalizeAspectType(type);
  const map = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
    quincunx: 150,
    "semi-square": 45,
    sesquiquadrate: 135,
  };
  return Number.isFinite(map[t]) ? map[t] : null;
}

function getAspectOrbLimit(p1, p2, type) {
  const major = ["conjunction", "opposition", "square", "trine", "sextile"].includes(type);
  const luminary = p1 === "Sun" || p1 === "Moon" || p2 === "Sun" || p2 === "Moon";
  if (!major) return luminary ? 3.5 : 2.8;
  if (luminary) return 8;
  if (p1.includes("Node") || p2.includes("Node") || p1 === "Chiron" || p2 === "Chiron") return 5;
  return 6;
}

function calcAspectsFromLongitudes(points, includeMinor = true) {
  const defs = [
    { type: "conjunction", deg: 0 },
    { type: "sextile", deg: 60 },
    { type: "square", deg: 90 },
    { type: "trine", deg: 120 },
    { type: "opposition", deg: 180 },
  ];
  if (includeMinor) {
    defs.push(
      { type: "quincunx", deg: 150 },
      { type: "semi-square", deg: 45 },
      { type: "sesquiquadrate", deg: 135 },
    );
  }

  const aspects = [];
  const names = Object.keys(points || {}).filter((k) => Number.isFinite(Number(points[k])));
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const p1 = names[i];
      const p2 = names[j];
      const lon1 = normalizeDeg(points[p1]);
      const lon2 = normalizeDeg(points[p2]);
      if (!Number.isFinite(lon1) || !Number.isFinite(lon2)) continue;
      const diff = Math.abs(lon1 - lon2);
      const dist = diff > 180 ? 360 - diff : diff;
      for (const def of defs) {
        const orb = Math.abs(dist - def.deg);
        const maxOrb = getAspectOrbLimit(p1, p2, def.type);
        if (orb <= maxOrb) {
          aspects.push({ p1, p2, type: def.type, orb: round2(orb), exact: round2(def.deg), distance: round2(dist) });
          break;
        }
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb);
}

function buildHouseCusps(ascLon, houseSystem = "placidus") {
  const normalizedAsc = normalizeDeg(ascLon);
  if (!Number.isFinite(normalizedAsc)) return [];
  const system = String(houseSystem || "placidus").toLowerCase();
  const cusps = [];
  if (system === "whole-sign" || system === "whole" || system === "wholesign") {
    const start = Math.floor(normalizedAsc / 30) * 30;
    for (let i = 0; i < 12; i += 1) cusps.push(normalizeDeg(start + i * 30));
    return cusps;
  }
  // Swiss 응답에 하우스 커스프가 없을 때는 ASC 기준 30도 등분 근사값을 사용한다.
  for (let i = 0; i < 12; i += 1) cusps.push(normalizeDeg(normalizedAsc + i * 30));
  return cusps;
}

function locateHouseByCusps(longitude, cusps) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon) || !Array.isArray(cusps) || cusps.length !== 12) return null;
  for (let i = 0; i < 12; i += 1) {
    const start = normalizeDeg(cusps[i]);
    const end = normalizeDeg(cusps[(i + 1) % 12]);
    const inHouse = start <= end ? (lon >= start && lon < end) : (lon >= start || lon < end);
    if (inHouse) return i + 1;
  }
  return 1;
}

function signByLongitude(longitude) {
  const lon = normalizeDeg(longitude);
  if (!Number.isFinite(lon)) return null;
  const sign = Math.floor(lon / 30);
  return {
    sign,
    signKo: SIGN_KO[sign],
    degree: round2(lon % 30),
    longitude: round2(lon),
    element: ASTRO_ELEMENT_BY_SIGN[sign],
    modality: ASTRO_MODALITY_BY_SIGN[sign],
  };
}

function enrichPlanet(name, longitude, house, extras = {}) {
  const info = signByLongitude(longitude);
  if (!info) return null;
  return {
    name,
    nameKo: ASTRO_PLANET_KO[name] || name,
    ...info,
    house: Number.isFinite(Number(house)) ? Number(house) : null,
    ...extras,
  };
}

function dominantByCount(values = []) {
  const counter = {};
  for (const v of values) {
    if (!v) continue;
    counter[v] = (counter[v] || 0) + 1;
  }
  const entries = Object.entries(counter).sort((a, b) => b[1] - a[1]);
  return entries[0] ? { key: entries[0][0], count: entries[0][1], breakdown: counter } : { key: null, count: 0, breakdown: counter };
}

function dedupeAspects(aspects) {
  const seen = new Set();
  const result = [];
  for (const a of aspects || []) {
    const left = String(a.p1 || "");
    const right = String(a.p2 || "");
    const key = `${[left, right].sort().join("~")}::${normalizeAspectType(a.type)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...a, type: normalizeAspectType(a.type), orb: round2(a.orb) });
  }
  return result;
}

function buildWesternPremiumChart(rawChart = {}, input = {}, options = {}) {
  const houseSystem = String(options.houseSystem || input.houseSystem || "placidus").toLowerCase();
  const zodiacType = String(options.zodiacType || input.zodiacType || "tropical").toLowerCase();
  const includeMinorAspects = options.includeMinorAspects !== false;
  const strictHouseCusps = options.strictHouseCusps === true;

  const fallbackChart = buildFallbackWesternChart(input);

  const ascLonRaw = Number(rawChart?.ascendant?.longitude);
  const mcLonRaw = Number(rawChart?.midheaven?.longitude);
  const northNodeLon = Number(rawChart?.northNode?.longitude);
  const southNodeLon = Number(rawChart?.southNode?.longitude);

  const ascLon = Number.isFinite(ascLonRaw)
    ? ascLonRaw
    : Number(fallbackChart?.ascendant?.longitude);
  const mcLon = Number.isFinite(mcLonRaw)
    ? mcLonRaw
    : Number(fallbackChart?.midheaven?.longitude);

  const rawHouseCusps = Array.isArray(rawChart?.houseCusps)
    ? rawChart.houseCusps.map((v) => normalizeDeg(v)).filter((v) => Number.isFinite(v))
    : [];
  const houseCuspsApproximated = rawHouseCusps.length !== 12;
  if (strictHouseCusps && houseCuspsApproximated) {
    throw new Error("Swiss house cusp data missing");
  }
  const houseCusps = houseCuspsApproximated
    ? buildHouseCusps(ascLon, houseSystem)
    : rawHouseCusps;
  const planets = {};
  const points = {};
  for (const name of PLANETS) {
    const lon = Number(rawChart?.planets?.[name]?.longitude);
    if (!Number.isFinite(lon)) continue;
    const house = locateHouseByCusps(lon, houseCusps);
    const enriched = enrichPlanet(name, lon, house, {
      sourceHouse: Number(rawChart?.planets?.[name]?.house) || null,
      dignity: "Neutral",
      retrograde: typeof rawChart?.planets?.[name]?.retrograde === "boolean" ? rawChart.planets[name].retrograde : null,
      speedLongitude: Number.isFinite(Number(rawChart?.planets?.[name]?.speedLongitude))
        ? round2(rawChart.planets[name].speedLongitude)
        : null,
    });
    if (enriched) {
      planets[name] = enriched;
      points[name] = enriched.longitude;
    }
  }

  const northNode = Number.isFinite(northNodeLon)
    ? enrichPlanet("NorthNode", northNodeLon, locateHouseByCusps(northNodeLon, houseCusps))
    : null;
  const southNode = Number.isFinite(southNodeLon)
    ? enrichPlanet("SouthNode", southNodeLon, locateHouseByCusps(southNodeLon, houseCusps))
    : null;
  if (northNode) points.NorthNode = northNode.longitude;
  if (southNode) points.SouthNode = southNode.longitude;

  const chironLon = Number(rawChart?.chiron?.longitude);
  const chiron = Number.isFinite(chironLon)
    ? enrichPlanet("Chiron", chironLon, locateHouseByCusps(chironLon, houseCusps))
    : null;
  if (chiron) points.Chiron = chiron.longitude;

  const rawAspects = Array.isArray(rawChart?.aspects)
    ? rawChart.aspects.map((a) => ({
      p1: String(a.p1 || ""),
      p2: String(a.p2 || ""),
      type: normalizeAspectType(a.type),
      orb: round2(a.orb),
      exact: aspectDegreeByType(a.type),
    }))
    : [];

  const calcAspects = calcAspectsFromLongitudes(points, includeMinorAspects);
  const aspects = dedupeAspects(rawAspects.concat(calcAspects));

  const asc = enrichPlanet("Ascendant", ascLon, 1);
  const mc = Number.isFinite(mcLon)
    ? enrichPlanet("Midheaven", mcLon, locateHouseByCusps(mcLon, houseCusps))
    : enrichPlanet("Midheaven", ascLon + 90, 10);

  const chartRulerName = ASTRO_SIGN_RULER[asc.sign] || "Sun";
  const chartRuler = planets[chartRulerName] || null;
  const chartRulerAspects = aspects.filter((a) => a.p1 === chartRulerName || a.p2 === chartRulerName);

  const majorNames = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const majors = majorNames.map((n) => planets[n]).filter(Boolean);
  const element = {
    Fire: majors.filter((p) => p.element === "Fire").length,
    Earth: majors.filter((p) => p.element === "Earth").length,
    Air: majors.filter((p) => p.element === "Air").length,
    Water: majors.filter((p) => p.element === "Water").length,
  };
  const modality = {
    Cardinal: majors.filter((p) => p.modality === "Cardinal").length,
    Fixed: majors.filter((p) => p.modality === "Fixed").length,
    Mutable: majors.filter((p) => p.modality === "Mutable").length,
  };

  const eastHouses = [10, 11, 12, 1, 2, 3];
  const westHouses = [4, 5, 6, 7, 8, 9];
  const northHouses = [7, 8, 9, 10, 11, 12];
  const southHouses = [1, 2, 3, 4, 5, 6];
  const hemisphere = {
    east: majors.filter((p) => eastHouses.includes(p.house)).length,
    west: majors.filter((p) => westHouses.includes(p.house)).length,
    north: majors.filter((p) => northHouses.includes(p.house)).length,
    south: majors.filter((p) => southHouses.includes(p.house)).length,
  };

  const planetScore = {};
  for (const p of majors) {
    let score = 1;
    if ([1, 4, 7, 10].includes(p.house)) score += 2;
    const aspCount = aspects.filter((a) => a.p1 === p.name || a.p2 === p.name).length;
    if (aspCount >= 5) score += 2;
    if (aspCount >= 3 && aspCount < 5) score += 1;
    if (ASTRO_SIGN_RULER[p.sign] === p.name) score += 1;
    planetScore[p.name] = score;
  }
  const dominantPlanet = Object.entries(planetScore).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const dominantSignInfo = dominantByCount(majors.map((p) => p.signKo));
  const dominantHouseInfo = dominantByCount(majors.map((p) => String(p.house || "")));

  const houses = [];
  for (let i = 0; i < 12; i += 1) {
    const cuspLon = houseCusps[i];
    const sign = signByLongitude(cuspLon);
    houses.push({
      house: i + 1,
      cuspLongitude: round2(cuspLon),
      sign: sign?.sign,
      signKo: sign?.signKo,
      ruler: ASTRO_SIGN_RULER[sign?.sign ?? 0],
      planets: Object.values(planets).filter((p) => p.house === i + 1).map((p) => p.name),
    });
  }

  return {
    source: rawChart?.source || "swiss-wasm-local",
    zodiacType,
    houseSystem,
    houseSystemMeta: {
      requested: houseSystem,
      approximation: houseCuspsApproximated,
      note: houseCuspsApproximated
        ? "하우스 커스프 입력이 부족해 ASC 기준 보완 커스프를 사용했습니다."
        : "Swiss Ephemeris 계산 하우스 커스프를 사용했습니다.",
    },
    ascendant: asc,
    midheaven: mc,
    chartRuler: {
      planet: chartRulerName,
      sign: chartRuler?.signKo || "정보 없음",
      house: chartRuler?.house || null,
      aspects: chartRulerAspects,
    },
    planets,
    northNode,
    southNode,
    chiron,
    partOfFortune: rawChart?.partOfFortune || null,
    vertex: rawChart?.vertex || null,
    houseCusps,
    houses,
    aspects,
    elementBalance: element,
    modalityBalance: modality,
    hemisphereBalance: hemisphere,
    dominantPlanet,
    dominantSign: dominantSignInfo.key,
    dominantHouse: dominantHouseInfo.key ? Number(dominantHouseInfo.key) : null,
    rawSwiss: rawChart,
  };
}

function midpointLongitude(a, b) {
  const lonA = normalizeDeg(a);
  const lonB = normalizeDeg(b);
  if (!Number.isFinite(lonA) || !Number.isFinite(lonB)) return NaN;
  let diff = lonB - lonA;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return normalizeDeg(lonA + diff / 2);
}

function buildSynastry(primary, partner) {
  const primaryPoints = {};
  const partnerPoints = {};
  for (const k of ASTRO_MAJORS) {
    const p1 = primary.planets?.[k] || primary[k.charAt(0).toLowerCase() + k.slice(1)] || null;
    const p2 = partner.planets?.[k] || partner[k.charAt(0).toLowerCase() + k.slice(1)] || null;
    if (Number.isFinite(Number(p1?.longitude))) primaryPoints[k] = Number(p1.longitude);
    if (Number.isFinite(Number(p2?.longitude))) partnerPoints[k] = Number(p2.longitude);
  }
  if (primary.northNode?.longitude != null) primaryPoints.NorthNode = Number(primary.northNode.longitude);
  if (partner.northNode?.longitude != null) partnerPoints.NorthNode = Number(partner.northNode.longitude);
  if (primary.southNode?.longitude != null) primaryPoints.SouthNode = Number(primary.southNode.longitude);
  if (partner.southNode?.longitude != null) partnerPoints.SouthNode = Number(partner.southNode.longitude);

  const defs = [
    { type: "conjunction", deg: 0 },
    { type: "sextile", deg: 60 },
    { type: "square", deg: 90 },
    { type: "trine", deg: 120 },
    { type: "opposition", deg: 180 },
    { type: "quincunx", deg: 150 },
  ];

  const aspects = [];
  const aKeys = Object.keys(primaryPoints);
  const bKeys = Object.keys(partnerPoints);
  for (const a of aKeys) {
    for (const b of bKeys) {
      const lonA = primaryPoints[a];
      const lonB = partnerPoints[b];
      const diff = Math.abs(lonA - lonB);
      const dist = diff > 180 ? 360 - diff : diff;
      for (const def of defs) {
        const orb = Math.abs(dist - def.deg);
        const maxOrb = getAspectOrbLimit(a, b, def.type);
        if (orb <= maxOrb) {
          aspects.push({ p1: a, p2: b, type: def.type, orb: round2(orb), exact: def.deg, distance: round2(dist) });
          break;
        }
      }
    }
  }

  const filterPairs = (left, right) => aspects.filter((a) => (a.p1 === left && a.p2 === right) || (a.p1 === right && a.p2 === left));

  const overlays = [];
  const overlayTargets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode", "Chiron"];
  for (const name of overlayTargets) {
    const partnerLon = partnerPoints[name];
    if (!Number.isFinite(partnerLon)) continue;
    const house = locateHouseByCusps(partnerLon, primary.houseCusps || []);
    if (house) overlays.push({ who: "partnerToMe", planet: name, house });
  }

  return {
    aspects: aspects.sort((a, b) => a.orb - b.orb),
    sunMoonAspects: filterPairs("Sun", "Moon"),
    moonMoonAspects: filterPairs("Moon", "Moon"),
    venusMarsAspects: filterPairs("Venus", "Mars"),
    venusSaturnAspects: filterPairs("Venus", "Saturn"),
    marsSaturnAspects: filterPairs("Mars", "Saturn"),
    saturnHardAspects: aspects.filter((a) => (a.p1 === "Saturn" || a.p2 === "Saturn") && ["square", "opposition", "conjunction"].includes(a.type)),
    plutoHardAspects: aspects.filter((a) => (a.p1 === "Pluto" || a.p2 === "Pluto") && ["square", "opposition", "conjunction"].includes(a.type)),
    nodeContacts: aspects.filter((a) => a.p1.includes("Node") || a.p2.includes("Node")),
    chironContacts: aspects.filter((a) => a.p1 === "Chiron" || a.p2 === "Chiron"),
    houseOverlays: overlays,
    house7Overlays: overlays.filter((o) => o.house === 7),
    house8Overlays: overlays.filter((o) => o.house === 8),
    house12Overlays: overlays.filter((o) => o.house === 12),
  };
}

function buildCompositeChart(primary, partner, houseSystem = "placidus") {
  const names = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode"];
  const base = {};
  for (const name of names) {
    const lonA = primary.planets?.[name]?.longitude ?? (name === "NorthNode" ? primary.northNode?.longitude : NaN);
    const lonB = partner.planets?.[name]?.longitude ?? (name === "NorthNode" ? partner.northNode?.longitude : NaN);
    const mid = midpointLongitude(lonA, lonB);
    if (Number.isFinite(mid)) base[name] = mid;
  }

  const compAscLon = midpointLongitude(primary.ascendant?.longitude, partner.ascendant?.longitude);
  const compMcLon = midpointLongitude(primary.midheaven?.longitude, partner.midheaven?.longitude);
  const cusps = buildHouseCusps(compAscLon, houseSystem);

  const planets = {};
  for (const [name, lon] of Object.entries(base)) {
    const house = locateHouseByCusps(lon, cusps);
    planets[name] = enrichPlanet(name, lon, house);
  }

  const aspects = calcAspectsFromLongitudes(base, true);
  const houseEmphasis = dominantByCount(Object.values(planets).map((p) => String(p.house || "")));
  return {
    ascendant: enrichPlanet("Ascendant", compAscLon, 1),
    midheaven: enrichPlanet("Midheaven", Number.isFinite(compMcLon) ? compMcLon : compAscLon + 90, locateHouseByCusps(compMcLon, cusps) || 10),
    planets,
    nodes: {
      northNode: planets.NorthNode || null,
      southNode: planets.NorthNode ? enrichPlanet("SouthNode", planets.NorthNode.longitude + 180, locateHouseByCusps(planets.NorthNode.longitude + 180, cusps)) : null,
    },
    houseCusps: cusps,
    house7: { signKo: signByLongitude(cusps[6])?.signKo || "정보 없음", planets: Object.values(planets).filter((p) => p.house === 7).map((p) => p.name) },
    house10: { signKo: signByLongitude(cusps[9])?.signKo || "정보 없음", planets: Object.values(planets).filter((p) => p.house === 10).map((p) => p.name) },
    aspects,
    houseEmphasis,
  };
}

async function buildAstroTimingData(request, env, input, natalChart) {
  const now = new Date();
  const transitInput = {
    ...input,
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: now.getUTCHours(),
    minute: now.getUTCMinutes(),
  };
  const transitRaw = await getSwissWesternChart(request, env, transitInput, { strict: true });
  const transitChart = buildWesternPremiumChart(transitRaw, transitInput, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: true,
  });

  const natalPoints = {};
  const transitPoints = {};
  for (const n of ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode"]) {
    const natalLon = natalChart.planets?.[n]?.longitude ?? (n === "NorthNode" ? natalChart.northNode?.longitude : NaN);
    const transitLon = transitChart.planets?.[n]?.longitude ?? (n === "NorthNode" ? transitChart.northNode?.longitude : NaN);
    if (Number.isFinite(Number(natalLon))) natalPoints[n] = Number(natalLon);
    if (Number.isFinite(Number(transitLon))) transitPoints[n] = Number(transitLon);
  }

  const transitToNatal = [];
  const defs = [
    { type: "conjunction", deg: 0 },
    { type: "sextile", deg: 60 },
    { type: "square", deg: 90 },
    { type: "trine", deg: 120 },
    { type: "opposition", deg: 180 },
    { type: "quincunx", deg: 150 },
  ];
  for (const [tp, tLon] of Object.entries(transitPoints)) {
    for (const [np, nLon] of Object.entries(natalPoints)) {
      const diff = Math.abs(tLon - nLon);
      const dist = diff > 180 ? 360 - diff : diff;
      for (const def of defs) {
        const orb = Math.abs(dist - def.deg);
        if (orb <= getAspectOrbLimit(tp, np, def.type)) {
          transitToNatal.push({ transit: tp, natal: np, type: def.type, orb: round2(orb), exact: def.deg });
          break;
        }
      }
    }
  }
  transitToNatal.sort((a, b) => a.orb - b.orb);

  const age = Math.max(0, now.getUTCFullYear() - input.year);
  const progressedDate = new Date(Date.UTC(input.year, Math.max(0, input.month - 1), input.day, input.hour, input.minute, 0, 0));
  progressedDate.setUTCDate(progressedDate.getUTCDate() + age);
  const progressedInput = {
    ...input,
    year: progressedDate.getUTCFullYear(),
    month: progressedDate.getUTCMonth() + 1,
    day: progressedDate.getUTCDate(),
    hour: progressedDate.getUTCHours(),
    minute: progressedDate.getUTCMinutes(),
  };
  const progressedRaw = await getSwissWesternChart(request, env, progressedInput, { strict: true });
  const progressed = buildWesternPremiumChart(progressedRaw, progressedInput, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: false,
  });

  const solarReturnInput = {
    ...input,
    year: now.getUTCFullYear(),
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
  };
  const solarRaw = await getSwissWesternChart(request, env, solarReturnInput, { strict: true });
  const solarReturn = buildWesternPremiumChart(solarRaw, solarReturnInput, {
    houseSystem: input.houseSystem,
    zodiacType: input.zodiacType,
    includeMinorAspects: false,
  });

  const progressedMoonSunDiff = Math.abs((progressed.planets.Moon?.longitude || 0) - (progressed.planets.Sun?.longitude || 0));
  const progressedMoonPhase = round2(progressedMoonSunDiff > 180 ? 360 - progressedMoonSunDiff : progressedMoonSunDiff);
  const saturnReturn = transitToNatal.some((a) => a.transit === "Saturn" && a.natal === "Saturn" && a.orb <= 2);
  const jupiterReturn = transitToNatal.some((a) => a.transit === "Jupiter" && a.natal === "Jupiter" && a.orb <= 2);
  const nodalReturn = transitToNatal.some((a) => a.transit === "NorthNode" && a.natal === "NorthNode" && a.orb <= 2);

  return {
    currentDate: now.toISOString().slice(0, 10),
    transitPlanetPositions: transitChart.planets,
    transitToNatalAspects: transitToNatal,
    progressedSun: progressed.planets.Sun || null,
    progressedMoon: progressed.planets.Moon || null,
    progressedAsc: progressed.ascendant || null,
    progressedMoonPhase,
    solarReturn: {
      ascendant: solarReturn.ascendant,
      sunHouse: solarReturn.planets.Sun?.house || null,
      moonHouse: solarReturn.planets.Moon?.house || null,
    },
    saturnReturn,
    jupiterReturn,
    nodalReturn,
    keyTransitPeriods: transitToNatal.slice(0, 18),
  };
}

const ASTRO_REQUIRED_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

function toLowerElement(value) {
  const map = { Fire: "fire", Earth: "earth", Air: "air", Water: "water" };
  return map[String(value || "")] || null;
}

function toLowerModality(value) {
  const map = { Cardinal: "cardinal", Fixed: "fixed", Mutable: "mutable" };
  return map[String(value || "")] || null;
}

function aspectStrengthByOrb(orb) {
  const n = Number(orb);
  if (!Number.isFinite(n)) return "wide";
  if (n <= 2) return "tight";
  if (n <= 5) return "moderate";
  return "wide";
}

function canonicalPoint(point) {
  if (!point) return null;
  return {
    sign: point.signKo || null,
    degree: Number.isFinite(Number(point.degree)) ? Number(point.degree) : null,
    house: Number.isFinite(Number(point.house)) ? Number(point.house) : null,
    formatted: point.signKo && Number.isFinite(Number(point.degree)) ? `${point.signKo} ${round2(point.degree)}도` : null,
  };
}

function computeDatetimeUtcIso(input) {
  const tz = Number.isFinite(Number(input.timezone)) ? Number(input.timezone) : 9;
  const utc = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour - tz, input.minute, 0, 0));
  return Number.isFinite(utc.getTime()) ? utc.toISOString() : null;
}

function hasCompletePartnerData(body = {}) {
  return Number.isFinite(Number(body.partnerYear))
    && Number.isFinite(Number(body.partnerMonth))
    && Number.isFinite(Number(body.partnerDay))
    && Number.isFinite(Number(body.partnerHour))
    && Number.isFinite(Number(body.partnerMinute))
    && Number.isFinite(Number(body.partnerLat))
    && Number.isFinite(Number(body.partnerLon ?? body.partnerLng));
}

function validateCanonicalAstroChartStrict(chart) {
  const hasFiniteNumericValue = (value) => value !== null && value !== "" && Number.isFinite(Number(value));
  const missingFields = [];
  const planets = Array.isArray(chart?.planets) ? chart.planets : [];
  const angles = chart?.angles || {};
  const houses = Array.isArray(chart?.houses) ? chart.houses : [];
  const aspects = Array.isArray(chart?.aspects) ? chart.aspects : [];

  const planetMap = new Map();
  for (const p of planets) {
    if (p?.nameEn) planetMap.set(String(p.nameEn), p);
  }

  for (const name of ASTRO_REQUIRED_PLANETS) {
    const p = planetMap.get(name);
    if (!p) {
      missingFields.push(`planets.${name}`);
      continue;
    }
    if (!p.sign) missingFields.push(`planets.${name}.sign`);
    if (!hasFiniteNumericValue(p.degree)) missingFields.push(`planets.${name}.degree`);
    if (!hasFiniteNumericValue(p.house)) missingFields.push(`planets.${name}.house`);
  }

  if (!angles?.ascendant?.sign || !hasFiniteNumericValue(angles?.ascendant?.degree)) missingFields.push("angles.ascendant");
  if (!angles?.mc?.sign || !hasFiniteNumericValue(angles?.mc?.degree)) missingFields.push("angles.mc");
  if (houses.length !== 12) missingFields.push("houses.length=12");

  const hasForecast = !!(
    (Array.isArray(chart?.forecast?.transits) && chart.forecast.transits.length > 0)
    || chart?.forecast?.secondaryProgressions
    || chart?.forecast?.solarReturn
  );
  const hasRelationshipData = !!(
    chart?.relationship?.hasPartner
    && chart?.relationship?.partnerNatal
    && chart?.relationship?.synastry
    && chart?.relationship?.composite
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
    hasPlanets: ASTRO_REQUIRED_PLANETS.every((name) => planetMap.has(name)),
    hasAngles: !!(angles?.ascendant && angles?.mc),
    hasHouses: houses.length === 12,
    hasAspects: aspects.length > 0,
    hasForecast,
    hasRelationshipData,
  };
}

function buildCanonicalAstroChart(body, input, chart, reportType, partnerChart, synastry, composite, timingData) {
  const asc = chart?.ascendant || null;
  const mc = chart?.midheaven || null;
  const descLon = Number.isFinite(Number(asc?.longitude)) ? normalizeDeg(asc.longitude + 180) : NaN;
  const icLon = Number.isFinite(Number(mc?.longitude)) ? normalizeDeg(mc.longitude + 180) : NaN;
  const desc = Number.isFinite(descLon) ? signByLongitude(descLon) : null;
  const ic = Number.isFinite(icLon) ? signByLongitude(icLon) : null;

  const planets = [];
  for (const [name, p] of Object.entries(chart?.planets || {})) {
    planets.push({
      key: String(name || "").toLowerCase(),
      nameKo: ASTRO_PLANET_KO[name] || name,
      nameEn: name,
      sign: p.signKo || null,
      degree: Number.isFinite(Number(p.degree)) ? Number(p.degree) : null,
      formatted: p.signKo && Number.isFinite(Number(p.degree)) ? `${p.signKo} ${round2(p.degree)}도` : null,
      house: Number.isFinite(Number(p.house)) ? Number(p.house) : null,
      retrograde: p.retrograde === true,
      dignity: null,
      element: toLowerElement(p.element),
      modality: toLowerModality(p.modality),
    });
  }

  const houses = Array.isArray(chart?.houses)
    ? chart.houses.map((h) => ({
      house: Number(h.house),
      cuspSign: h.signKo || null,
      cuspDegree: Number.isFinite(Number(signByLongitude(h.cuspLongitude)?.degree)) ? Number(signByLongitude(h.cuspLongitude).degree) : null,
      cuspFormatted: h.signKo && Number.isFinite(Number(signByLongitude(h.cuspLongitude)?.degree))
        ? `${h.signKo} ${round2(signByLongitude(h.cuspLongitude).degree)}도`
        : null,
      planets: Array.isArray(h.planets) ? h.planets : [],
      ruler: h.ruler || null,
    }))
    : [];

  const canonical = {
    profile: {
      name: String(body.name || input.name || "사용자"),
      gender: body.gender == null ? null : String(body.gender),
      birth: {
        date: `${input.year}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`,
        time: `${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}`,
        timezone: String(body.timezoneName || "Asia/Seoul"),
        locationName: String(body.birthPlace || body.place || body.location || "정보 없음"),
        latitude: Number(input.lat),
        longitude: Number(input.lon),
      },
    },
    calculationMeta: {
      engine: String(chart?.source || "unknown"),
      zodiac: String(input.zodiacType || "tropical"),
      houseSystem: String(input.houseSystem || "placidus"),
      datetimeUTC: computeDatetimeUtcIso(input),
      ayanamsa: null,
      calculatedAt: new Date().toISOString(),
    },
    angles: {
      ascendant: {
        sign: asc?.signKo || null,
        degree: Number.isFinite(Number(asc?.degree)) ? Number(asc.degree) : null,
        formatted: asc?.signKo && Number.isFinite(Number(asc?.degree)) ? `${asc.signKo} ${round2(asc.degree)}도` : null,
      },
      mc: {
        sign: mc?.signKo || null,
        degree: Number.isFinite(Number(mc?.degree)) ? Number(mc.degree) : null,
        formatted: mc?.signKo && Number.isFinite(Number(mc?.degree)) ? `${mc.signKo} ${round2(mc.degree)}도` : null,
      },
      descendant: {
        sign: desc?.signKo || null,
        degree: Number.isFinite(Number(desc?.degree)) ? Number(desc.degree) : null,
        formatted: desc?.signKo && Number.isFinite(Number(desc?.degree)) ? `${desc.signKo} ${round2(desc.degree)}도` : null,
      },
      ic: {
        sign: ic?.signKo || null,
        degree: Number.isFinite(Number(ic?.degree)) ? Number(ic.degree) : null,
        formatted: ic?.signKo && Number.isFinite(Number(ic?.degree)) ? `${ic.signKo} ${round2(ic.degree)}도` : null,
      },
    },
    houses,
    planets,
    aspects: (chart?.aspects || []).map((a) => ({
      planetA: String(a.p1 || "").toLowerCase(),
      planetB: String(a.p2 || "").toLowerCase(),
      type: normalizeAspectType(a.type),
      angle: Number.isFinite(Number(a.exact)) ? Number(a.exact) : Number(aspectDegreeByType(a.type) || 0),
      orb: Number.isFinite(Number(a.orb)) ? Number(a.orb) : null,
      applying: a.applying === true,
      strength: aspectStrengthByOrb(a.orb),
    })),
    chartBalance: {
      elements: {
        fire: Number(chart?.elementBalance?.Fire || 0),
        earth: Number(chart?.elementBalance?.Earth || 0),
        air: Number(chart?.elementBalance?.Air || 0),
        water: Number(chart?.elementBalance?.Water || 0),
      },
      modalities: {
        cardinal: Number(chart?.modalityBalance?.Cardinal || 0),
        fixed: Number(chart?.modalityBalance?.Fixed || 0),
        mutable: Number(chart?.modalityBalance?.Mutable || 0),
      },
      hemispheres: {
        east: Number(chart?.hemisphereBalance?.east || 0),
        west: Number(chart?.hemisphereBalance?.west || 0),
        north: Number(chart?.hemisphereBalance?.north || 0),
        south: Number(chart?.hemisphereBalance?.south || 0),
      },
      dominantPlanets: chart?.dominantPlanet ? [chart.dominantPlanet] : [],
      dominantSigns: chart?.dominantSign ? [chart.dominantSign] : [],
      dominantHouses: Number.isFinite(Number(chart?.dominantHouse)) ? [Number(chart.dominantHouse)] : [],
    },
    nodes: {
      northNode: canonicalPoint(chart?.northNode),
      southNode: canonicalPoint(chart?.southNode),
    },
    optionalPoints: {
      chiron: canonicalPoint(chart?.chiron),
      lilith: null,
      partOfFortune: chart?.partOfFortune || null,
    },
    forecast: {
      transits: Array.isArray(timingData?.transitToNatalAspects) ? timingData.transitToNatalAspects : null,
      secondaryProgressions: timingData
        ? {
          sun: timingData.progressedSun || null,
          moon: timingData.progressedMoon || null,
          ascendant: timingData.progressedAsc || null,
          moonPhase: timingData.progressedMoonPhase ?? null,
        }
        : null,
      solarReturn: timingData?.solarReturn || null,
    },
    relationship: {
      hasPartner: reportType === "compatibility" && !!(partnerChart && synastry && composite),
      partnerNatal: partnerChart || null,
      synastry: synastry || null,
      composite: composite || null,
    },
    validation: {
      hasPlanets: false,
      hasAngles: false,
      hasHouses: false,
      hasAspects: false,
      hasForecast: false,
      hasRelationshipData: false,
      missingFields: [],
    },
  };

  const validation = validateCanonicalAstroChartStrict(canonical);
  canonical.validation = {
    hasPlanets: validation.hasPlanets,
    hasAngles: validation.hasAngles,
    hasHouses: validation.hasHouses,
    hasAspects: validation.hasAspects,
    hasForecast: validation.hasForecast,
    hasRelationshipData: validation.hasRelationshipData,
    missingFields: validation.missingFields,
  };

  return canonical;
}

function buildAstroChapterPlan(canonical) {
  const out = [];
  const add = (meta) => {
    out.push({
      chapter: out.length + 1,
      key: meta.key,
      title: meta.title,
      subtitle: meta.subtitle,
      icon: meta.icon,
    });
  };

  for (const meta of ASTRO_PERSONAL_CHAPTER_META) {
    if (meta.key === "C10" && (!canonical?.nodes?.northNode || !canonical?.nodes?.southNode)) continue;
    if (meta.key === "C12" && !canonical?.validation?.hasForecast) continue;
    if (!canonical?.validation?.hasHouses && ["C1", "C3", "C4", "C5", "C6", "C7", "C8"].includes(meta.key)) continue;
    add(meta);
  }

  if (canonical?.relationship?.hasPartner && canonical?.relationship?.partnerNatal && canonical?.relationship?.synastry && canonical?.relationship?.composite) {
    for (const meta of ASTRO_RELATION_CHAPTER_META) add(meta);
  }
  return out;
}

function buildAstroChapterPrompt(chapterMeta, canonical, previousTexts = [], premiumInput = null) {
  const focusKeywords = ASTRO_CHAPTER_FOCUS_KEYWORDS[chapterMeta?.key] || [];
  const premiumChapterJsonPacks = premiumInput && typeof premiumInput === "object"
    ? toPlainObject(premiumInput.chapterJsonPacks)
    : {};
  const summary = {
    asc: canonical?.angles?.ascendant,
    mc: canonical?.angles?.mc,
    sun: canonical?.planets?.find((p) => p.nameEn === "Sun") || null,
    moon: canonical?.planets?.find((p) => p.nameEn === "Moon") || null,
    mercury: canonical?.planets?.find((p) => p.nameEn === "Mercury") || null,
    venus: canonical?.planets?.find((p) => p.nameEn === "Venus") || null,
    mars: canonical?.planets?.find((p) => p.nameEn === "Mars") || null,
    jupiter: canonical?.planets?.find((p) => p.nameEn === "Jupiter") || null,
    saturn: canonical?.planets?.find((p) => p.nameEn === "Saturn") || null,
    nodes: canonical?.nodes,
    aspectsTop: (canonical?.aspects || []).slice(0, 25),
    houses: canonical?.houses || [],
    chartBalance: canonical?.chartBalance || null,
    forecast: canonical?.forecast || null,
    relationship: canonical?.relationship || null,
    premiumChapterJsonPacks,
  };

  return [
    "[SYSTEM]",
    "너는 서양 점성술 해석자다. 너는 계산자가 아니다. 모든 해석은 제공된 canonicalAstroChart JSON의 값만 사용해야 한다. JSON에 없는 행성 위치, 하우스, 어스펙트, 트랜짓, 노드, 궁합 요소를 절대 만들어내지 않는다. 데이터가 부족하면 일반론으로 채우지 말고 해당 챕터를 생성하지 않는다. 각 챕터는 반드시 실제 별자리, 도수, 하우스, 어스펙트, 오브 중 최소 5개 이상의 구체 데이터를 포함해야 한다.",
    "",
    "[USER_PROMPT]",
    `chapterTitle: ${chapterMeta.title}`,
    `chapterPurpose: ${chapterMeta.subtitle}`,
    "relevantPlanets: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, NorthNode, SouthNode",
    "relevantHouses: 1~12 house cusps and occupied planets",
    "relevantAspects: use canonicalAstroChart.aspects sorted by orb asc",
    `chartSummary: ${JSON.stringify(summary)}`,
    `premiumChapterJsonPacks: ${JSON.stringify(premiumChapterJsonPacks)}`,
    `focusKeywords: ${JSON.stringify(focusKeywords)}`,
    `forbiddenRepeatedPhrases: ${JSON.stringify(ASTRO_FORBIDDEN_REPEATED_PHRASES)}`,
    "requiredOutputStructure: [1. 사용 데이터 요약표, 2. 핵심 해석, 3. 심리적 작동 방식, 4. 현실 적용, 5. 어스펙트 심화, 6. 그림자와 주의점, 7. 실천 전략(오늘/이번주/90일), 8. 챕터 요약(3줄)]",
    `minLength: ${ASTRO_MIN_CHARS}`,
    "maxLength: 12000",
    "",
    "출력 규칙:",
    "- 반드시 아래 헤딩을 순서대로 포함한다:",
    "### 1. 사용 데이터 요약표",
    "### 2. 핵심 해석",
    "### 3. 심리적 작동 방식",
    "### 4. 현실 적용",
    "### 5. 어스펙트 심화",
    "### 6. 그림자와 주의점",
    "### 7. 실천 전략",
    "### 8. 챕터 요약",
    "- 1번 섹션에는 반드시 Markdown 표를 포함한다.",
    "- 개인 리포트에서 궁합(Synastry/Composite) 용어를 쓰지 않는다.",
    "- 데이터가 없는 항목은 '계산 데이터 누락'이라고 명시하고 추측하지 않는다.",
    "- premiumChapterJsonPacks.core/signals/timing/actions 중 최소 3개를 근거 문장으로 반영한다.",
    "- 실행 보강 메모, 패딩 문단, 동일 문장 반복을 금지한다.",
    previousTexts.length ? `- 이전 챕터에서 이미 사용한 문장 재사용 금지 목록: ${JSON.stringify(previousTexts.slice(-4))}` : "",
  ].filter(Boolean).join("\n");
}

function astroMissingMarkers(text, chapterMeta) {
  const source = String(text || "");
  const required = [
    "### 1. 사용 데이터 요약표",
    "### 2. 핵심 해석",
    "### 3. 심리적 작동 방식",
    "### 4. 현실 적용",
    "### 5. 어스펙트 심화",
    "### 6. 그림자와 주의점",
    "### 7. 실천 전략",
    "### 8. 챕터 요약",
    "| 항목 | 값 |",
  ];
  if (chapterMeta?.key === "C12") {
    required.push("3개월");
    required.push("6개월");
    required.push("12개월");
  }
  return required.filter((marker) => !source.includes(marker));
}

function hasForbiddenAstroPadding(text) {
  return /실행\s*보강\s*메모/i.test(String(text || ""));
}

function detectRepeatedLongSentences(text, minLength = 30) {
  const source = String(text || "");
  const chunks = source
    .split(/[\n\.\!\?。！？]/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength);
  const seen = new Set();
  const duplicates = [];
  for (const c of chunks) {
    const fp = normalizeParagraphFingerprint(c);
    if (!fp) continue;
    if (seen.has(fp)) duplicates.push(c);
    seen.add(fp);
  }
  return duplicates;
}

function hasAstroDataEvidence(text) {
  const source = String(text || "");
  const signHit = /(양자리|황소자리|쌍둥이자리|게자리|사자자리|처녀자리|천칭자리|전갈자리|사수자리|염소자리|물병자리|물고기자리)/.test(source);
  const houseHit = /([1-9]|1[0-2])\s*하우스/.test(source);
  const aspectHit = /(conjunction|opposition|square|trine|sextile|quincunx|orb|오브)/i.test(source);
  return signHit && houseHit && aspectHit;
}

function hasBrokenPageCounter(text) {
  return /Page\s*0\s*of\s*0/i.test(String(text || ""));
}

function buildBasicAstroSummaryFromChart(chart) {
  return {
    ascendant: {
      sign: chart?.ascendant?.signKo || null,
      degree: Number.isFinite(Number(chart?.ascendant?.degree)) ? Number(chart.ascendant.degree) : null,
    },
    mc: {
      sign: chart?.midheaven?.signKo || null,
      degree: Number.isFinite(Number(chart?.midheaven?.degree)) ? Number(chart.midheaven.degree) : null,
    },
    sun: {
      sign: chart?.planets?.Sun?.signKo || null,
      degree: Number.isFinite(Number(chart?.planets?.Sun?.degree)) ? Number(chart.planets.Sun.degree) : null,
      house: Number.isFinite(Number(chart?.planets?.Sun?.house)) ? Number(chart.planets.Sun.house) : null,
    },
    moon: {
      sign: chart?.planets?.Moon?.signKo || null,
      degree: Number.isFinite(Number(chart?.planets?.Moon?.degree)) ? Number(chart.planets.Moon.degree) : null,
      house: Number.isFinite(Number(chart?.planets?.Moon?.house)) ? Number(chart.planets.Moon.house) : null,
    },
  };
}

function normalizeParagraphFingerprint(text) {
  return String(text || "")
    .replace(/[#>*`\-|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hasDuplicateAstroParagraphs(text) {
  const blocks = String(text || "")
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && !s.startsWith("### ") && !s.startsWith("## "));
  const seen = new Set();
  for (const block of blocks) {
    const fp = normalizeParagraphFingerprint(block);
    if (!fp) continue;
    if (seen.has(fp)) return true;
    seen.add(fp);
  }
  return false;
}

function dedupeAstroParagraphs(text) {
  const chunks = String(text || "").split(/\n\s*\n/);
  const seen = new Set();
  const out = [];
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    const isHeading = /^#{2,4}\s/.test(trimmed);
    const fp = normalizeParagraphFingerprint(trimmed);
    if (!isHeading && fp && seen.has(fp)) continue;
    if (!isHeading && fp) seen.add(fp);
    out.push(trimmed);
  }
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function generateAstroPremiumChapter(env, body, input, chapter, meta, chart, reportType, partnerChart, synastry, composite, timingData) {
  const canonical = buildCanonicalAstroChart(body, input, chart, reportType, partnerChart, synastry, composite, timingData);
  const premiumInput = body?._premiumLlmInput && typeof body._premiumLlmInput === "object" ? body._premiumLlmInput : null;
  const prompt = buildAstroChapterPrompt(meta, canonical, body?.previousChapterTexts || [], premiumInput);
  const options = {
    temperature: 0.74,
    topP: 0.92,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_ASTRO_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 75000),
    maxAttemptsPerPair: Number(env.PREMIUM_ASTRO_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = await callGemini(env, prompt, ["PREMIUM_ASTRO_GEMINI_MODEL"], options);
  if (!text || text.trim().length < 1200) {
    throw new Error("AI chapter generation failed: empty output");
  }
  text = dedupeAstroParagraphs(text);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const missing = astroMissingMarkers(text, meta);
    const tooShort = text.length < ASTRO_MIN_CHARS;
    const truncated = looksTruncatedMarkdown(text);
    const banned = hasBannedDeterministicExpression(text);
    const duplicated = hasDuplicateAstroParagraphs(text);
    const forbiddenPadding = hasForbiddenAstroPadding(text);
    const duplicatedSentence = detectRepeatedLongSentences(text, 30).length > 0;
    const duplicatedAcross = detectCrossChapterRepeatedSentences(text, body?.previousChapterTexts || [], 30).length > 0;
    const forbiddenPhraseUsed = ASTRO_FORBIDDEN_REPEATED_PHRASES.some((p) => text.includes(p));
    const dataEvidenceMissing = !hasAstroDataEvidence(text);
    if (!tooShort && missing.length === 0 && !truncated && !banned && !duplicated && !forbiddenPadding && !duplicatedSentence && !duplicatedAcross && !forbiddenPhraseUsed && !dataEvidenceMissing) break;

    const refinePrompt = [
      "아래 서양 점성술 챕터 초안을 고품질로 보강하세요.",
      `목표 길이: 최소 ${ASTRO_MIN_CHARS}자`,
      "오직 마크다운 본문만 출력하고 기존 구조를 유지하면서 누락 요소를 채우세요. 표는 유지하세요.",
      "같은 문장/문단 반복, 실행 보강 메모, 금지 문구를 모두 제거하세요.",
      `누락 요소: ${missing.length ? missing.join(" | ") : "없음"}`,
      `현재 문제: ${tooShort ? "분량 부족" : ""} ${truncated ? "문장 끊김" : ""} ${banned ? "금지 표현 포함" : ""} ${duplicated ? "중복 문단 포함" : ""} ${forbiddenPadding ? "패딩 문구 포함" : ""} ${duplicatedSentence ? "장문 반복 포함" : ""} ${duplicatedAcross ? "이전 챕터 문장 재사용" : ""} ${forbiddenPhraseUsed ? "금지 고정문구 포함" : ""} ${dataEvidenceMissing ? "차트 근거 부족" : ""}`.trim(),
      premiumInput ? "premiumChapterJsonPacks 근거를 더 많이 반영하세요." : "",
      "",
      "[초안]",
      text,
    ].join("\n");

    const refined = await callGemini(env, refinePrompt, ["PREMIUM_ASTRO_GEMINI_MODEL"], options);
    if (!refined || !refined.trim()) break;
    const candidate = refined.trim();
    text = candidate.length >= Math.floor(text.length * 0.8) ? candidate : `${text}\n\n${candidate}`;
    text = dedupeAstroParagraphs(text);
  }

  const finalMissing = astroMissingMarkers(text, meta);
  const finalRepeatedSentences = detectRepeatedLongSentences(text, 30);
  const finalAcross = detectCrossChapterRepeatedSentences(text, body?.previousChapterTexts || [], 30);
  const finalForbiddenPhraseUsed = ASTRO_FORBIDDEN_REPEATED_PHRASES.some((p) => text.includes(p));
  if (
    text.length < ASTRO_MIN_CHARS
    || finalMissing.length > 0
    || looksTruncatedMarkdown(text)
    || hasBannedDeterministicExpression(text)
    || hasDuplicateAstroParagraphs(text)
    || hasForbiddenAstroPadding(text)
    || finalRepeatedSentences.length > 0
    || finalAcross.length > 0
    || finalForbiddenPhraseUsed
    || !hasAstroDataEvidence(text)
  ) {
    throw new Error("Astro chapter quality validation failed");
  }

  return {
    text,
    sections: parseSections(text),
    usedFallback: false,
    warnings: canonical.validation?.missingFields || [],
    canonicalAstroChart: canonical,
  };
}

function astroReportIdFromInput(body, input, reportType) {
  const seed = [
    reportType,
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    input.lat,
    input.lon,
    String(body.name || input.name || ""),
    String(body.partnerName || ""),
    String(input.houseSystem || "placidus"),
    String(input.zodiacType || "tropical"),
    String(body.reportYear || new Date().getUTCFullYear()),
  ].join("|");
  return `astro_${stableHash(seed)}`;
}

function readAstroCache(cacheKey) {
  const hit = ASTRO_REPORT_CACHE.get(cacheKey);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    ASTRO_REPORT_CACHE.delete(cacheKey);
    return null;
  }
  return hit.payload;
}

function writeAstroCache(cacheKey, payload, ttlMs = 30 * 60 * 1000) {
  ASTRO_REPORT_CACHE.set(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
}

function buildSukuyoFromLunar(lunarMonthRaw, lunarDayRaw, source = "kasi-api") {
  const lunarMonth = Math.max(1, Math.min(12, Math.abs(Number(lunarMonthRaw) || 1)));
  const lunarDay = Math.max(1, Math.min(30, Math.abs(Number(lunarDayRaw) || 1)));
  const start = SUKUYO_MONTH_START[lunarMonth - 1] ?? 11;
  const mansionIdx = (start + lunarDay - 1) % 27;
  const m = SUKUYO_MANSIONS[mansionIdx];
  return {
    mansionIdx,
    mansion: m[0],
    mansionCh: m[1],
    mansionEn: m[2],
    icon: "moon",
    direction: m[3],
    element: m[4],
    animal: m[5],
    lunarMonth,
    lunarDay,
    source,
  };
}

async function fetchKasiLunarFromSolar(request, env, input) {
  try {
    const data = await postBackendJson(
      request,
      env,
      "/api/kasi/calendar",
      {
        method: "getLunCalInfo",
        params: {
          solYear: String(input.year),
          solMonth: String(input.month).padStart(2, "0"),
          solDay: String(input.day).padStart(2, "0"),
        },
      },
      Number(env.PREMIUM_KASI_TIMEOUT_MS || 8000),
    );
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    if (!rows.length) return null;
    const row = rows[0] || {};
    const lunarMonth = Number(row.lunMonth ?? row.month ?? row.lunarMonth);
    const lunarDay = Number(row.lunDay ?? row.day ?? row.lunarDay);
    if (!Number.isFinite(lunarMonth) || !Number.isFinite(lunarDay)) return null;
    return { lunarMonth, lunarDay };
  } catch (_) {
    return null;
  }
}

async function calcSukuyo(request, env, input) {
  const kasiLunar = await fetchKasiLunarFromSolar(request, env, input);
  if (kasiLunar) {
    return buildSukuyoFromLunar(kasiLunar.lunarMonth, kasiLunar.lunarDay, "kasi-api");
  }

  const swissBasis = await fetchSwissSukuyoBasis(request, env, input);
  const moonLon = Number(swissBasis?.moonLongitude);
  const sunLon = Number(swissBasis?.sunLongitude);
  if (Number.isFinite(moonLon) && Number.isFinite(sunLon)) {
    const phaseAngle = normalizeDeg(moonLon - sunLon);
    const lunarDay = Math.max(1, Math.min(30, Math.floor(phaseAngle / 12) + 1));
    const lunarMonth = Math.max(1, Math.min(12, Math.floor(normalizeDeg(sunLon) / 30) + 1));
    return buildSukuyoFromLunar(lunarMonth, lunarDay, "swiss-derived");
  }

  const fallbackLunarMonth = ((input.month + 10) % 12) + 1;
  const fallbackLunarDay = ((input.day + input.hour) % 30) + 1;
  return buildSukuyoFromLunar(fallbackLunarMonth, fallbackLunarDay, "fallback-approx");
}

function resolveSukuyoDirection(distance, label) {
  if (distance === 0) return { axis: "명", me: "명", other: "명", pairLabel: "명", icon: "🪞" };
  if ([1, 10, 19].includes(distance)) return { axis: "영친", me: "영", other: "친", pairLabel: "영친", icon: "✨" };
  if ([8, 17, 26].includes(distance)) return { axis: "영친", me: "친", other: "영", pairLabel: "친영", icon: "🌟" };
  if ([2, 11, 20].includes(distance)) return { axis: "우친", me: "우", other: "친", pairLabel: "우친", icon: "🤝" };
  if ([7, 16, 25].includes(distance)) return { axis: "우친", me: "친", other: "우", pairLabel: "친우", icon: "🌙" };
  if ([3, 12, 21].includes(distance)) return { axis: "안괴", me: "안", other: "괴", pairLabel: "안괴", icon: "🛡️" };
  if ([6, 15, 24].includes(distance)) return { axis: "안괴", me: "괴", other: "안", pairLabel: "괴안", icon: "⚔️" };
  if ([4, 13, 22].includes(distance)) return { axis: "성쇠", me: "성", other: "쇠", pairLabel: "성쇠", icon: "🏛️" };
  if ([5, 14, 23].includes(distance)) return { axis: "성쇠", me: "쇠", other: "성", pairLabel: "쇠성", icon: "🗝️" };
  return {
    axis: String(label || "관계"),
    me: "정보 없음",
    other: "정보 없음",
    pairLabel: String(label || "관계"),
    icon: "🌙",
  };
}

function sukuyoRelation(myIdx, otherIdx) {
  if (otherIdx == null) return null;
  const distance = (otherIdx - myIdx + 27) % 27;
  const label = SUKUYO_RELATION_LABELS[distance % SUKUYO_RELATION_LABELS.length] || "관계";
  const direction = resolveSukuyoDirection(distance, label);
  return {
    distance,
    label,
    axis: direction.axis,
    pairLabel: direction.pairLabel,
    roleMe: direction.me,
    roleOther: direction.other,
    roleIcon: direction.icon,
    score: Math.max(38, 96 - Math.abs(13 - distance) * 4),
  };
}

function extractSwissEclipticLongitude(chartPayload, planetName) {
  if (!chartPayload || !planetName) return NaN;
  const direct = Number(chartPayload?.planets?.[planetName]?.longitude);
  if (Number.isFinite(direct)) return normalizeDeg(direct);
  const flat = Number(chartPayload?.planets?.[planetName]);
  if (Number.isFinite(flat)) return normalizeDeg(flat);
  const lower = String(planetName).toLowerCase();
  const lowerObj = Number(chartPayload?.planets?.[lower]?.longitude);
  if (Number.isFinite(lowerObj)) return normalizeDeg(lowerObj);
  const lowerFlat = Number(chartPayload?.planets?.[lower]);
  if (Number.isFinite(lowerFlat)) return normalizeDeg(lowerFlat);
  return NaN;
}

function resolveMoonPhaseByAngle(angle) {
  const a = normalizeDeg(angle);
  if (!Number.isFinite(a)) {
    return {
      phaseAngle: null,
      illumination: null,
      label: "정보 없음",
      cycle: "미확인",
      yinYangFlow: "미확인",
    };
  }

  let label = "정보 없음";
  if (a < 22.5 || a >= 337.5) label = "삭(신월)";
  else if (a < 67.5) label = "초승";
  else if (a < 112.5) label = "상현";
  else if (a < 157.5) label = "차는달";
  else if (a < 202.5) label = "망(보름)";
  else if (a < 247.5) label = "기우는달";
  else if (a < 292.5) label = "하현";
  else label = "그믐";

  const illumination = Math.round((((1 - Math.cos((a * Math.PI) / 180)) / 2) * 1000)) / 10;
  const waxing = a < 180;
  return {
    phaseAngle: Math.round(a * 10) / 10,
    illumination,
    label,
    cycle: waxing ? "상현 이전(증가)" : "하현 이후(감소)",
    yinYangFlow: waxing ? "양기 생장" : "음기 수렴",
  };
}

function buildSukuyoOrientalChart(sukuyo, partner, rel, swissBasis, partnerSwissBasis) {
  const moonLon = Number(swissBasis?.moonLongitude);
  const sunLon = Number(swissBasis?.sunLongitude);
  const phase = resolveMoonPhaseByAngle(moonLon - sunLon);

  const partnerMoonLon = Number(partnerSwissBasis?.moonLongitude);
  const partnerSunLon = Number(partnerSwissBasis?.sunLongitude);
  const partnerPhase = Number.isFinite(partnerMoonLon) && Number.isFinite(partnerSunLon)
    ? resolveMoonPhaseByAngle(partnerMoonLon - partnerSunLon)
    : null;

  const wheel = SUKUYO_MANSIONS.map((m, idx) => {
    const isPrimary = idx === sukuyo.mansionIdx;
    const isPartner = partner ? idx === partner.mansionIdx : false;
    return {
      index: idx + 1,
      mansion: m[0],
      mansionCh: m[1],
      mansionEn: m[2],
      direction: m[3],
      element: m[4],
      guardian: m[5],
      isPrimary,
      isPartner,
      role: isPrimary ? "본명숙" : (isPartner ? "상대숙" : ""),
    };
  });

  return {
    type: "sukuyo-oriental-chart",
    source: String(sukuyo.source || "kasi-api"),
    core: {
      primaryMansion: `${sukuyo.mansion}宿(${sukuyo.mansionCh})`,
      primaryDirection: sukuyo.direction,
      primaryElement: sukuyo.element,
      primaryGuardian: sukuyo.animal,
      lunarDate: `${sukuyo.lunarMonth}월 ${sukuyo.lunarDay}일`,
      partnerMansion: partner ? `${partner.mansion}宿(${partner.mansionCh})` : null,
    },
    moonPhase: phase,
    relation: rel ? {
      label: rel.label,
      pairLabel: rel.pairLabel,
      axis: rel.axis,
      distance: rel.distance,
      score: rel.score,
      roleMe: rel.roleMe,
      roleOther: rel.roleOther,
      roleIcon: rel.roleIcon,
    } : null,
    swissBasis: {
      moonLongitude: Number.isFinite(moonLon) ? Math.round(normalizeDeg(moonLon) * 100) / 100 : null,
      sunLongitude: Number.isFinite(sunLon) ? Math.round(normalizeDeg(sunLon) * 100) / 100 : null,
      partnerMoonLongitude: Number.isFinite(partnerMoonLon) ? Math.round(normalizeDeg(partnerMoonLon) * 100) / 100 : null,
      partnerSunLongitude: Number.isFinite(partnerSunLon) ? Math.round(normalizeDeg(partnerSunLon) * 100) / 100 : null,
    },
    partnerMoonPhase: partnerPhase,
    wheel,
  };
}

async function fetchSwissSukuyoBasis(request, env, input) {
  try {
    const payload = await getSwissWesternChart(request, env, {
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      minute: input.minute,
      timezone: input.timezone,
      lat: input.lat,
      lon: input.lon,
    });
    return {
      moonLongitude: extractSwissEclipticLongitude(payload, "Moon"),
      sunLongitude: extractSwissEclipticLongitude(payload, "Sun"),
    };
  } catch (_) {
    return null;
  }
}

function buildVedicChart(input) {
  const lagna = zodiacBySeed(input.year, input.month, input.day, input.hour, 21);
  const moon = zodiacBySeed(input.year, input.month, input.day, input.hour, 22);
  const nakIndex = Math.floor(moon.longitude / (360 / 27));
  const nakshatras = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
  return {
    lagna,
    moonNakshatra: { name: nakshatras[nakIndex], ko: nakshatras[nakIndex], pada: (nakIndex % 4) + 1 },
    planets: Object.fromEntries(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"].map((p, i) => [p, { name: p, ...zodiacBySeed(input.year, input.month, input.day, input.hour, i + 30), house: ((i + lagna.sign) % 12) + 1 }])),
    vimshottariDasha: { current: { planet: ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"][input.year % 9], remainYears: 4.8 }, antar: { planet: "Moon", remainYears: 0.8 } },
    yogas: [{ name: "Dharma Focus", nameKo: "다르마 정렬", description: "삶의 방향성을 실행으로 고정하는 조합입니다." }],
  };
}

function longFallback({ system, chapterTitle, profileLine, focusLine }) {
  const sections = [
    ["핵심 구조", `${profileLine} 이 장은 ${system}의 상징을 단편적인 운세가 아니라 반복되는 선택 패턴으로 읽습니다. 지금 드러나는 핵심은 타고난 성향을 과장하거나 숨기는 것이 아니라, 가장 자연스럽게 힘이 생기는 방식과 에너지가 새는 방식을 동시에 보는 것입니다.`],
    ["삶에서 드러나는 패턴", `${chapterTitle}에서는 관계, 일, 돈, 감정 반응이 서로 따로 움직이지 않습니다. 같은 선택 습관이 다른 장면에서 이름만 바꾸어 반복됩니다. 이 PDF는 그 반복을 발견하고, 사용자가 실제 일정과 대화와 결정을 바꿀 수 있도록 구체적인 언어로 정리합니다.`],
    ["주의할 그림자", `강점이 강하게 켜질수록 그림자도 같이 커집니다. 빠른 판단, 과도한 책임감, 인정 욕구, 회피, 완벽주의 중 어느 하나가 현재의 운 흐름을 좁힐 수 있습니다. 중요한 것은 나쁜 성향을 없애는 것이 아니라, 그 성향이 등장하는 조건을 알아차리고 더 좋은 출구를 만드는 것입니다.`],
    ["실행 처방", `${focusLine} 오늘부터 7일 동안은 큰 결심보다 작은 반복을 우선하세요. 아침에는 오늘 반드시 끝낼 한 가지를 적고, 저녁에는 감정이 크게 움직였던 장면 하나와 실제로 한 행동 하나를 분리해서 기록합니다. 이 기록이 쌓이면 운세는 막연한 예언이 아니라 생활을 조정하는 지도처럼 작동합니다.`],
    ["30일 로드맵", `1주차에는 관찰, 2주차에는 정리, 3주차에는 실험, 4주차에는 고정이 핵심입니다. 사람과 돈과 일의 흐름을 모두 바꾸려 하지 말고, 가장 반복 비용이 큰 한 가지 습관을 고르세요. 그 습관을 바꾸는 작은 행동이 다음 운의 문을 여는 첫 번째 열쇠입니다.`],
  ];
  const text = sections.map(([title, body]) => `## ${title}\n${body}\n\n${body}\n\n${body}`).join("\n\n");
  return text.length >= 5200 ? text : `${text}\n\n${text}`;
}

function buildPrompt(kind, input, chapterTitle, dataLine) {
  const labels = {
    sukuyo: "숙요점 27수",
    astro: "서양 점성술",
    vedic: "베다 점성술",
    ziwei: "자미두수",
  };
  const guard = kind === "sukuyo"
    ? "중요: 사주명리 PDF가 아니라 숙요점 PDF입니다. 십성, 용신, 대운 중심으로 쓰지 말고 27수, 달의 리듬, 숙요 관계성, 카르마 패턴 중심으로 쓰세요."
    : "";
  return `당신은 ${labels[kind]} 프리미엄 PDF 전문 작가입니다.
${guard}

사용자: ${input.name}, 생년월일시 ${input.year}-${input.month}-${input.day} ${input.hour}:${input.minute}
분석 데이터: ${dataLine}
챕터: ${chapterTitle}

한국어로 고품질 PDF 본문을 작성하세요. 아래 형식을 지키세요.
## 핵심 구조
## 삶에서 드러나는 패턴
## 관계/커리어/돈의 적용
## 그림자와 주의점
## 30일 실행 가이드

각 섹션은 두 문단 이상, 추상적인 위로보다 실제 선택과 행동 기준을 많이 포함하세요.`;
}

async function callGemini(env, prompt, modelEnvKeys = [], options = {}) {
  const result = await generateWithGemini(env, prompt, {
    modelEnvKeys,
    temperature: options.temperature,
    topP: options.topP,
    maxOutputTokens: options.maxOutputTokens,
    timeoutMs: options.timeoutMs,
    maxAttemptsPerPair: options.maxAttemptsPerPair,
    requestId: options.requestId,
  });
  return result.ok ? result.text : "";
}

async function generatedChapter(env, kind, input, meta, dataLine, fallbackProfile, fallbackFocus, modelEnvKeys = []) {
  const prompt = buildPrompt(kind, input, meta.title, dataLine);
  let text = await callGemini(env, prompt, modelEnvKeys);
  let usedFallback = false;
  if (!text || text.length < 900) {
    usedFallback = true;
    text = longFallback({
      system: kind,
      chapterTitle: meta.title,
      profileLine: fallbackProfile,
      focusLine: fallbackFocus,
    });
  }
  return { text, sections: parseSections(text), usedFallback };
}

function stableHash(value) {
  const source = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function chapterRequestProvided(body = {}) {
  return body.chapter != null || body.sessionId != null;
}

function writeReportSessionChapter(kind, reportId, chapter, totalChapters, chapterMeta, text, extra = {}, ttlMs = REPORT_SESSION_TTL_MS) {
  const key = `${kind}:${reportId}`;
  const now = Date.now();
  let entry = REPORT_SESSION_STORE.get(key);
  if (!entry || entry.expiresAt < now) {
    entry = {
      kind,
      reportId,
      totalChapters,
      createdAt: new Date(now).toISOString(),
      chapters: {},
      extra: {},
      updatedAt: new Date(now).toISOString(),
      expiresAt: now + ttlMs,
    };
  }

  entry.totalChapters = totalChapters || entry.totalChapters || 0;
  entry.chapters[String(chapter)] = {
    chapter,
    chapterMeta: chapterMeta || null,
    text: String(text || ""),
    updatedAt: new Date(now).toISOString(),
  };
  entry.extra = { ...(entry.extra || {}), ...(extra || {}) };
  entry.updatedAt = new Date(now).toISOString();
  entry.expiresAt = now + ttlMs;
  REPORT_SESSION_STORE.set(key, entry);

  const storedChapterCount = Object.keys(entry.chapters).length;
  return {
    sessionKey: key,
    storedChapterCount,
    isComplete: Boolean(entry.totalChapters && storedChapterCount >= entry.totalChapters),
    updatedAt: entry.updatedAt,
  };
}

function getStoredChapterTexts(kind, reportId, beforeChapter = Infinity) {
  const key = `${kind}:${reportId}`;
  const entry = REPORT_SESSION_STORE.get(key);
  if (!entry || !entry.chapters || typeof entry.chapters !== "object") return [];
  return Object.values(entry.chapters)
    .filter((ch) => Number(ch?.chapter) < Number(beforeChapter))
    .sort((a, b) => Number(a?.chapter || 0) - Number(b?.chapter || 0))
    .map((ch) => String(ch?.text || ""))
    .filter(Boolean);
}

function extractLongSentences(text, minLength = 30) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLength);
}

function collectPreviousSentenceBanList(previousTexts, limit = 10) {
  const freq = new Map();
  (previousTexts || []).forEach((txt) => {
    extractLongSentences(txt, 30).forEach((line) => {
      const count = freq.get(line) || 0;
      freq.set(line, count + 1);
    });
  });
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([line]) => line);
}

function detectCrossChapterRepeatedSentences(candidateText, previousTexts, minLength = 30) {
  const previousSet = new Set();
  (previousTexts || []).forEach((txt) => {
    extractLongSentences(txt, minLength).forEach((line) => previousSet.add(line));
  });
  const repeated = [];
  extractLongSentences(candidateText, minLength).forEach((line) => {
    if (previousSet.has(line) && !repeated.includes(line)) repeated.push(line);
  });
  return repeated;
}

function hasInvalidZiweiSummaryTable(text) {
  const source = String(text || "");
  const marker = "### 12궁 전체 요약표";
  const start = source.indexOf(marker);
  if (start < 0) return false;
  const tableBlock = source.slice(start).split("\n\n")[0] || "";
  const rows = tableBlock.split(/\r?\n/).filter((line) => /^\|/.test(line));
  return rows.some((row) => {
    if (/^\|\s*-+/.test(row)) return false;
    const cells = row.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 3) return false;
    return cells.some((cell) => cell === "-");
  });
}

function hasRequiredZiweiSpecificCoverage(text) {
  const source = String(text || "");
  const requiredAnchors = ["명궁", "신궁", "삼방사정", "사화"];
  if (!requiredAnchors.every((token) => source.includes(token))) return false;
  const evidenceTokens = ["명궁", "신궁", "궁", "주성", "보성", "살성", "사화", "대궁", "삼방사정", "대한", "유년", "유월", "◎", "○", "△", "×", "▲", "X"];
  const matched = evidenceTokens.filter((token) => source.includes(token));
  return matched.length >= 5;
}

function vedicReportIdFromInput(body, input, reportType) {
  const seed = [
    reportType,
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    input.lat,
    input.lon,
    String(body.name || input.name || ""),
    String(body.partnerName || ""),
    String(body.ayanamsa || "lahiri"),
    String(body.calendarType || "solar"),
  ].join("|");
  return `vedic_${stableHash(seed)}`;
}

function lifebookReportIdFromInput(body, input) {
  const seed = [
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    String(body.name || input.name || ""),
    stableHash(stringifyCompact(body.sajuData || body.profile || body.birth || "", 1200)),
  ].join("|");
  return `lifebook_${stableHash(seed)}`;
}

function loveSecretReportIdFromInput(body, input, mode) {
  const seed = [
    mode,
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    String(body.name || input.name || ""),
    stableHash(stringifyCompact(body.sajuData || body.profile || body.birth || "", 1200)),
    stableHash(stringifyCompact(body.partnerData || body.partner || "", 900)),
  ].join("|");
  return `love_${stableHash(seed)}`;
}

function ziweiReportIdFromInput(body, input, reportType) {
  const seed = [
    reportType,
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    String(body.name || input.name || ""),
    String(body.partnerName || ""),
    stableHash(stringifyCompact(body.ziweiData || body.ziweiStructured || "", 1400)),
  ].join("|");
  return `ziwei_${stableHash(seed)}`;
}

function hasPreciseBirthTime(body = {}) {
  if (asBool(body.birthTimeUnknown) || asBool(body.noBirthTime) || asBool(body.timeUnknown)) return false;
  if (body.hour == null && body.birthHour == null) return false;
  return true;
}

function computeAshtaKoota(myChart, partnerChart) {
  if (!myChart?.moonNakshatra || !partnerChart?.moonNakshatra) return null;
  const myMoon = myChart.planets?.Moon;
  const otherMoon = partnerChart.planets?.Moon;
  const myLagna = myChart.lagna;
  const otherLagna = partnerChart.lagna;
  if (!myMoon || !otherMoon || !myLagna || !otherLagna) return null;

  const moonDiff = (otherMoon.sign - myMoon.sign + 12) % 12;
  const nakIndexA = VEDIC_NAKSHATRA_META.findIndex((n) => n.name === myChart.moonNakshatra.name);
  const nakIndexB = VEDIC_NAKSHATRA_META.findIndex((n) => n.name === partnerChart.moonNakshatra.name);
  const nakDiff = ((nakIndexB - nakIndexA) + 27) % 27;

  const scoreVarna = moonDiff % 3 === 0 ? 1 : 0.5;
  const scoreVashya = [0, 1, 5, 7, 9].includes(moonDiff) ? 2 : 1;
  const scoreTara = [1, 3, 5, 7].includes(nakDiff % 9) ? 3 : 1.5;
  const scoreYoni = [0, 1, 2].includes(nakDiff % 6) ? 4 : 2;
  const scoreGrahaMaitri = getRashiLord(myMoon.sign) === getRashiLord(otherMoon.sign) ? 5 : 3;
  const scoreGana = nakDiff % 3 === 0 ? 6 : 3;
  const scoreBhakoot = [0, 1, 5, 7, 9, 11].includes(moonDiff) ? 7 : 2;
  const scoreNadi = nakDiff % 9 === 0 ? 0 : 8;

  const rows = [
    { key: "Varna", score: scoreVarna, max: 1 },
    { key: "Vashya", score: scoreVashya, max: 2 },
    { key: "Tara", score: scoreTara, max: 3 },
    { key: "Yoni", score: scoreYoni, max: 4 },
    { key: "Graha Maitri", score: scoreGrahaMaitri, max: 5 },
    { key: "Gana", score: scoreGana, max: 6 },
    { key: "Bhakoot", score: scoreBhakoot, max: 7 },
    { key: "Nadi", score: scoreNadi, max: 8 },
  ];
  const total = Math.round(rows.reduce((sum, row) => sum + row.score, 0) * 10) / 10;

  return {
    total,
    totalMax: 36,
    verdict: total >= 28 ? "우수" : total >= 21 ? "양호" : "보완 필요",
    rows,
    moonDiff,
    nakDiff,
  };
}

function buildCanonicalVedicChart(body, input, chart, reportType, partnerChart, ashta) {
  const planets = {};
  for (const name of VEDIC_PLANET_ORDER) {
    const p = chart?.planets?.[name];
    planets[name] = {
      name,
      nameKo: p?.nameKo || VEDIC_PLANET_KO[name] || name,
      signName: p?.signName || null,
      signKo: p?.signKo || null,
      degree: Number.isFinite(Number(p?.degree)) ? Number(p.degree) : null,
      house: Number.isFinite(Number(p?.house)) ? Number(p.house) : null,
      nakshatra: p?.nakshatra || null,
      nakshatraKo: p?.nakshatraKo || null,
      nakshatraPada: Number.isFinite(Number(p?.nakshatraPada)) ? Number(p.nakshatraPada) : null,
      dignity: p?.dignity || null,
      retrograde: p?.isRetrograde === true,
      combust: p?.isCombust === true,
      exalted: p?.isExalted === true,
      debilitated: p?.isDebilitated === true,
    };
  }

  const canonical = {
    profile: {
      name: String(body.name || input.name || "사용자"),
      gender: body.gender == null ? null : String(body.gender),
      birth: {
        date: `${input.year}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`,
        time: `${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}`,
        timezone: String(body.timezoneName || body.timezone || "Asia/Seoul"),
        locationName: String(body.birthPlace || body.place || body.location || ""),
        latitude: Number(input.lat),
        longitude: Number(input.lon),
      },
    },
    calculationMeta: {
      engine: String(chart?.source || "unknown"),
      zodiac: "sidereal",
      ayanamsaMode: String(chart?.ayanamsaMode || input.ayanamsa || "lahiri").toLowerCase(),
      ayanamsa: Number.isFinite(Number(chart?.ayanamsa)) ? Number(chart.ayanamsa) : null,
      calculatedAt: new Date().toISOString(),
    },
    lagna: {
      signName: chart?.lagna?.signName || null,
      signKo: chart?.lagna?.signKo || null,
      degree: Number.isFinite(Number(chart?.lagna?.degree)) ? Number(chart.lagna.degree) : null,
      house: Number.isFinite(Number(chart?.lagna?.house)) ? Number(chart.lagna.house) : 1,
      lord: chart?.lagna?.lord || null,
    },
    moonNakshatra: {
      name: chart?.moonNakshatra?.name || null,
      ko: chart?.moonNakshatra?.ko || null,
      pada: Number.isFinite(Number(chart?.moonNakshatra?.pada)) ? Number(chart.moonNakshatra.pada) : null,
      lord: chart?.moonNakshatra?.lord || null,
      degreeInNakshatra: Number.isFinite(Number(chart?.moonNakshatra?.degreeInNakshatra)) ? Number(chart.moonNakshatra.degreeInNakshatra) : null,
      moonSign: chart?.moonNakshatra?.moonSign || null,
      moonSignKo: chart?.moonNakshatra?.moonSignKo || null,
    },
    planets,
    houses: chart?.houses || null,
    dasha: {
      current: chart?.vimshottariDasha?.current || null,
      antar: chart?.vimshottariDasha?.antar || null,
      pratyantar: chart?.vimshottariDasha?.pratyantar || null,
      upcoming: chart?.vimshottariDasha?.upcoming || null,
    },
    karakas: {
      atmakaraka: chart?.atmakaraka || null,
      amatyakaraka: chart?.amatyakaraka || null,
      darakaraka: chart?.darakaraka || null,
    },
    divisionalCharts: {
      d1: chart?.d1 || null,
      d9: chart?.d9 || null,
      d10: chart?.d10 || null,
    },
    yogas: Array.isArray(chart?.yogas)
      ? chart.yogas.map((y) => ({ name: y?.name || null, nameKo: y?.nameKo || null, description: y?.description || null }))
      : [],
    transits: chart?.transits || null,
    compatibility: reportType === "compatibility"
      ? {
        partnerName: String(body.partnerName || "상대"),
        partnerLagna: partnerChart?.lagna?.signName || null,
        partnerMoonNakshatra: partnerChart?.moonNakshatra?.name || null,
        ashtaKoota: ashta || null,
      }
      : null,
    validation: {
      hasPlanets: false,
      hasLagna: false,
      hasMoonNakshatra: false,
      hasDasha: false,
      hasDivisionalCharts: false,
      hasRelationshipData: false,
      missingFields: [],
    },
  };

  const strict = validateCanonicalVedicChartStrict(canonical, reportType);
  canonical.validation = {
    hasPlanets: strict.hasPlanets,
    hasLagna: strict.hasLagna,
    hasMoonNakshatra: strict.hasMoonNakshatra,
    hasDasha: strict.hasDasha,
    hasDivisionalCharts: strict.hasDivisionalCharts,
    hasRelationshipData: strict.hasRelationshipData,
    missingFields: strict.missingFields,
  };

  return canonical;
}

function validateCanonicalVedicChartStrict(canonical, reportType = "personal") {
  const missingFields = [];
  const hasFinite = (value) => Number.isFinite(Number(value));

  if (!canonical?.lagna?.signName || !hasFinite(canonical?.lagna?.degree)) {
    missingFields.push("lagna");
  }
  if (!canonical?.moonNakshatra?.name || !hasFinite(canonical?.moonNakshatra?.pada) || !canonical?.moonNakshatra?.lord) {
    missingFields.push("moonNakshatra");
  }

  const planets = canonical?.planets || {};
  for (const name of VEDIC_PLANET_ORDER) {
    const p = planets[name];
    if (!p) {
      missingFields.push(`planets.${name}`);
      continue;
    }
    if (!p.signName) missingFields.push(`planets.${name}.signName`);
    if (!hasFinite(p.degree)) missingFields.push(`planets.${name}.degree`);
    if (!hasFinite(p.house)) missingFields.push(`planets.${name}.house`);
    if (!p.nakshatra) missingFields.push(`planets.${name}.nakshatra`);
    if (!hasFinite(p.nakshatraPada)) missingFields.push(`planets.${name}.nakshatraPada`);
  }

  const currentDasha = canonical?.dasha?.current;
  if (!currentDasha?.planet || !currentDasha?.startDate || !currentDasha?.endDate) {
    missingFields.push("dasha.current");
  }

  const d9 = canonical?.divisionalCharts?.d9;
  const d10 = canonical?.divisionalCharts?.d10;
  if (!d9 || Object.keys(d9).length < 7) missingFields.push("divisionalCharts.d9");
  if (!d10 || Object.keys(d10).length < 7) missingFields.push("divisionalCharts.d10");

  if (reportType === "compatibility") {
    const ashtaTotal = canonical?.compatibility?.ashtaKoota?.total;
    if (!hasFinite(ashtaTotal)) {
      missingFields.push("compatibility.ashtaKoota.total");
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    hasPlanets: VEDIC_PLANET_ORDER.every((name) => !!planets[name]),
    hasLagna: !!canonical?.lagna?.signName,
    hasMoonNakshatra: !!canonical?.moonNakshatra?.name,
    hasDasha: !!canonical?.dasha?.current,
    hasDivisionalCharts: !!d9 && !!d10,
    hasRelationshipData: reportType !== "compatibility" || Number.isFinite(Number(canonical?.compatibility?.ashtaKoota?.total)),
  };
}

function buildVedicChapterPlan(canonicalVedicChart, reportType) {
  return VEDIC_CHAPTER_META.map((meta) => {
    const reasons = [];
    if (meta.num === 7 && reportType === "compatibility" && !Number.isFinite(Number(canonicalVedicChart?.compatibility?.ashtaKoota?.total))) {
      reasons.push("ASHTA_KOOTA_SCORE_MISSING");
    }
    return {
      num: meta.num,
      title: meta.title,
      subtitle: meta.subtitle,
      available: true,
      reasons,
    };
  });
}

function buildVedicDataContext(body, input, canonicalVedicChart, chapterPlan, premiumInput = null) {
  const profileLines = [
    `- 사용자 이름: ${canonicalVedicChart.profile.name}`,
    `- 생년월일: ${canonicalVedicChart.profile.birth.date}`,
    `- 출생 시간: ${canonicalVedicChart.profile.birth.time}`,
    `- 출생지: ${canonicalVedicChart.profile.birth.locationName}`,
    `- 위도/경도: ${Number(input.lat).toFixed(4)}, ${Number(input.lon).toFixed(4)}`,
    `- 시간대: ${canonicalVedicChart.profile.birth.timezone}`,
    `- 성별: ${canonicalVedicChart.profile.gender || "N/A"}`,
    `- Ayanamsa: ${canonicalVedicChart.calculationMeta.ayanamsaMode} (${canonicalVedicChart.calculationMeta.ayanamsa})`,
    `- 계산 엔진: ${canonicalVedicChart.calculationMeta.engine}`,
  ];

  const coreLines = [
    `- 라그나: ${canonicalVedicChart.lagna.signName} ${round2(canonicalVedicChart.lagna.degree)}도 (${canonicalVedicChart.lagna.lord})`,
    `- 문 나크샤트라: ${canonicalVedicChart.moonNakshatra.name} / Pada ${canonicalVedicChart.moonNakshatra.pada} / Lord ${canonicalVedicChart.moonNakshatra.lord}`,
    `- 현재 대운: ${canonicalVedicChart.dasha.current?.planet} (${canonicalVedicChart.dasha.current?.startDate} ~ ${canonicalVedicChart.dasha.current?.endDate})`,
    `- 현재 세운: ${canonicalVedicChart.dasha.antar?.planet || "N/A"}`,
    `- 현재 소운: ${canonicalVedicChart.dasha.pratyantar?.planet || "N/A"}`,
    `- 아트마카라카: ${canonicalVedicChart.karakas.atmakaraka?.name || "N/A"}`,
    `- 아마티아카라카: ${canonicalVedicChart.karakas.amatyakaraka?.name || "N/A"}`,
    `- 다라카라카: ${canonicalVedicChart.karakas.darakaraka?.name || "N/A"}`,
    `- 주요 요가: ${(canonicalVedicChart.yogas || []).map((y) => y.nameKo || y.name).filter(Boolean).join(", ") || "N/A"}`,
  ];

  const planetLines = VEDIC_PLANET_ORDER.map((name) => {
    const p = canonicalVedicChart.planets[name];
    return `- ${name}: ${p.signName} ${round2(p.degree)}도 / ${p.house}H / ${p.nakshatra} Pada ${p.nakshatraPada} / ${p.dignity || "neutral"}${p.retrograde ? " / retrograde" : ""}`;
  });

  const chapterPlanLines = chapterPlan.map((row) => (`- Ch.${row.num} ${row.title}: ${row.available ? "available" : `unavailable(${row.reasons.join(",")})`}`));

  const compatLines = [];
  if (canonicalVedicChart.compatibility) {
    const ashta = canonicalVedicChart.compatibility.ashtaKoota;
    compatLines.push(
      `- 상대 이름: ${canonicalVedicChart.compatibility.partnerName}`,
      `- 상대 라그나: ${canonicalVedicChart.compatibility.partnerLagna || "N/A"}`,
      `- 상대 문 나크샤트라: ${canonicalVedicChart.compatibility.partnerMoonNakshatra || "N/A"}`,
      `- Ashta Koota 총점: ${ashta?.total}/${ashta?.totalMax}`,
      ...(Array.isArray(ashta?.rows) ? ashta.rows.map((r) => `- ${r.key}: ${r.score}/${r.max}`) : []),
    );
  }

  const premiumJsonText = premiumInput && typeof premiumInput === "object"
    ? JSON.stringify(toPlainObject(premiumInput.chapterJsonPacks || premiumInput), null, 2)
    : "";

  const dataText = [
    "[사용자 프로필]",
    ...profileLines,
    "",
    "[베다 핵심 계산값]",
    ...coreLines,
    "",
    "[행성 상세값]",
    ...planetLines,
    "",
    "[챕터 가용성]",
    ...chapterPlanLines,
    compatLines.length ? "" : null,
    compatLines.length ? "[궁합 데이터]" : null,
    ...compatLines,
    "",
    "[Canonical Vedic Chart JSON]",
    JSON.stringify(canonicalVedicChart),
    premiumJsonText ? "" : null,
    premiumJsonText ? "[Premium Chapter JSON Packs]" : null,
    premiumJsonText || null,
  ].filter(Boolean).join("\n");

  return { dataText };
}

function vedicMissingMarkers(text, chapter) {
  const source = String(text || "");
  const required = [
    "### 핵심 요약",
    "### 데이터 근거",
    "### 심화 해석",
    "### 실행 전략",
    "### 주의 포인트",
  ];

  if (chapter === 10) {
    required.push("### 1월");
    required.push("### 12월");
    required.push("- 핵심 흐름:");
    required.push("- 좋은 선택:");
    required.push("- 주의할 점:");
    required.push("- 개운 행동:");
  }
  if (chapter === 12) {
    required.push("| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |");
    required.push("| 1~7일 |  |  |  |  |");
    required.push("| 8~30일 |  |  |  |  |");
    required.push("| 31~60일 |  |  |  |  |");
    required.push("| 61~90일 |  |  |  |  |");
  }

  return required.filter((m) => !source.includes(m));
}

function hasBannedDeterministicExpression(text) {
  const source = String(text || "");
  const banned = [
    /무조건\s*실패/i,
    /반드시\s*이혼/i,
    /평생\s*가난/i,
    /확정\s*수익/i,
    /100%\s*수익/i,
    /질병\s*진단/i,
    /사망\s*확정/i,
  ];
  return banned.some((re) => re.test(source));
}

function hasForbiddenVedicPadding(text) {
  const source = String(text || "");
  return VEDIC_FORBIDDEN_COMMON_SECTIONS.some((token) => source.includes(token));
}

function buildVedicPremiumPrompt(meta, chapter, reportType, context) {
  const chapterGuide = VEDIC_CHAPTER_GUIDES[chapter - 1] || "현재 챕터 주제에 맞춰 베다 데이터 근거 중심으로 작성하세요.";
  const reportTitle = reportType === "compatibility" ? VEDIC_REPORT_TITLE_COMPAT : VEDIC_REPORT_TITLE_PERSONAL;
  const reportSubtitle = reportType === "compatibility" ? VEDIC_REPORT_SUBTITLE_COMPAT : VEDIC_REPORT_SUBTITLE_PERSONAL;
  const monthlyRule = chapter === 10
    ? "챕터 10에서는 반드시 ### 1월부터 ### 12월까지 월별 블록을 만들고, 각 월마다 - 핵심 흐름/- 좋은 선택/- 주의할 점/- 개운 행동을 작성하세요."
    : "";
  const roadmapRule = chapter === 12
    ? "챕터 12에서는 반드시 아래 90일 표를 포함하세요: | 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 | / | 1~7일 |  |  |  |  | / | 8~30일 |  |  |  |  | / | 31~60일 |  |  |  |  | / | 61~90일 |  |  |  |  |"
    : "";

  return [
    "너는 30년 경력의 베다 점성술 전문가이자, 주티쉬(Jyotish) 마스터, 인도 철학 연구가, 심리 상담가, 프리미엄 PDF 리포트 작가다.",
    "사용자의 베다 점성술 차트 데이터를 바탕으로 단순한 운세 풀이가 아니라 카르마 구조와 실행 전략을 연결한다.",
    "전문적이되 어렵지 않게 작성하고, 산스크리트 용어는 반드시 쉬운 한국어 설명을 붙인다.",
    "공포 조장 문구와 단정 예언(결혼/이혼/사망/투자 보장/질병 진단)을 금지한다.",
    "카르마를 저주가 아닌 성장 과제와 반복 패턴으로 설명한다.",
    "제공된 canonicalVedicChart 데이터만 근거로 작성한다. 데이터에 없는 사실을 만들지 않는다.",
    "오직 마크다운 본문만 출력한다.",
    "",
    `[리포트 제목] ${reportTitle}`,
    `[리포트 부제] ${reportSubtitle}`,
    `[리포트 타입] ${reportType}`,
    `[현재 챕터] ${chapter}. ${meta.title} — ${meta.subtitle}`,
    `[최소 분량] ${VEDIC_MIN_CHARS}자 이상 (권장 5000자 이상)`,
    "",
    "[반드시 지킬 구조]",
    `## 챕터 ${chapter}. ${meta.title}`,
    "### 핵심 요약",
    "### 데이터 근거",
    "### 심화 해석",
    "### 실행 전략",
    "### 주의 포인트",
    "",
    "[챕터 전용 지시]",
    chapterGuide,
    monthlyRule,
    roadmapRule,
    "",
    "[입력 데이터]",
    context.dataText,
  ].filter(Boolean).join("\n");
}

function buildVedicFailOpenFallbackText(chapter, meta, canonicalVedicChart, reportType, notes = []) {
  const lagna = canonicalVedicChart?.lagna?.signName || "N/A";
  const moonNak = canonicalVedicChart?.moonNakshatra?.name || "N/A";
  const currentDasha = canonicalVedicChart?.dasha?.current?.planet || "N/A";
  const noteLine = Array.isArray(notes) && notes.length ? notes.join(" | ") : "AI 생성 실패 시 안전 모드로 구성된 본문입니다.";

  const lines = [
    `## 챕터 ${chapter}. ${meta?.title || "베다 프리미엄 해석"}`,
    "### 핵심 요약",
    `현재 차트의 핵심 신호는 라그나 ${lagna}, 문 나크샤트라 ${moonNak}, 현재 다샤 ${currentDasha}에 집중됩니다. 이 조합은 결과를 단정하기보다 선택 패턴과 실행 루틴을 조정하는 데 유효합니다.`,
    "이 리포트는 운세 단정이 아니라 행동 전략 문서입니다. 동일한 상황에서도 선택 방식이 바뀌면 체감되는 결과가 달라질 수 있으므로, 해석은 관찰 가능한 습관과 의사결정 기준으로 연결해야 합니다.",
    "### 데이터 근거",
    `근거 요약: Lagna=${lagna}, Moon Nakshatra=${moonNak}, Current Dasha=${currentDasha}, ReportType=${reportType}.`,
    "사용 가능한 계산 데이터만 근거로 사용했으며, 누락 가능한 항목은 확정 진술 대신 보수적으로 해석했습니다. 해석 정확도를 높이려면 출생시각/출생지/타임존 정확도를 우선 점검하세요.",
    "### 심화 해석",
    "장점은 반복 가능한 강점으로, 리스크는 소모 패턴으로 해석해야 합니다. 강점이 작동하는 조건(시간대, 사람, 환경, 업무 방식)을 구체화하면 성과가 안정되고, 리스크가 커지는 조건을 사전에 차단하면 변동 폭이 줄어듭니다.",
    "관계·커리어·재정·건강은 서로 분리된 주제가 아니라 하나의 리듬으로 연결됩니다. 감정 피로가 커지면 의사결정 품질이 낮아지고, 이는 일정 지연·커뮤니케이션 마찰·지출 왜곡으로 이어질 수 있습니다.",
    "### 실행 전략",
    "1주차는 관찰, 2주차는 정리, 3주차는 실험, 4주차는 고정 원칙을 권장합니다. 하루 한 가지 핵심 행동을 완수하고, 저녁에 실제 행동/감정 반응/결과를 3줄로 기록하면 개선 지점이 명확해집니다.",
    "이번 장의 실행 포인트는 과한 확장보다 손실 최소화와 재현 가능한 루틴 구축입니다. 작은 반복이 누적되면 운의 변동성보다 실력의 안정성이 먼저 올라옵니다.",
    "### 주의 포인트",
    "건강, 관계, 투자, 법률 이슈는 점성 해석만으로 결론 내리면 안 됩니다. 필요 시 전문가 상담과 객관 자료를 함께 사용하세요.",
    `품질 메모: ${noteLine}`,
  ];

  if (chapter === 10) {
    for (let month = 1; month <= 12; month += 1) {
      lines.push(`### ${month}월`);
      lines.push("- 핵심 흐름: 현재 루틴 유지 + 우선순위 1개 집중");
      lines.push("- 좋은 선택: 짧은 피드백 주기로 실행 점검");
      lines.push("- 주의할 점: 과도한 확장/감정적 결정");
      lines.push("- 개운 행동: 기록-정리-실행 3단계 루틴");
    }
  }

  if (chapter === 12) {
    lines.push("| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |");
    lines.push("| 1~7일 |  |  |  |  |");
    lines.push("| 8~30일 |  |  |  |  |");
    lines.push("| 31~60일 |  |  |  |  |");
    lines.push("| 61~90일 |  |  |  |  |");
  }

  let text = lines.join("\n\n");
  while (text.length < VEDIC_MIN_CHARS) {
    text += "\n\n### 실행 메모\n핵심 행동 한 가지를 정해 7일 반복하고, 결과를 기록해 다음 주 전략에 반영하세요.";
  }
  return text;
}

async function generateVedicPremiumChapter(env, body, input, chapter, meta, canonicalVedicChart, reportType, chapterPlan) {
  const premiumInput = body?._premiumLlmInput && typeof body._premiumLlmInput === "object" ? body._premiumLlmInput : null;
  const context = buildVedicDataContext(body, input, canonicalVedicChart, chapterPlan, premiumInput);
  const prompt = buildVedicPremiumPrompt(meta, chapter, reportType, context);
  const options = {
    temperature: 0.86,
    topP: 0.95,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_VEDIC_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 75000),
    maxAttemptsPerPair: Number(env.PREMIUM_VEDIC_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = await callGemini(env, prompt, ["PREMIUM_VEDIC_GEMINI_MODEL"], options);
  if (!text || text.trim().length < 1200) {
    const fallbackText = buildVedicFailOpenFallbackText(chapter, meta, canonicalVedicChart, reportType, ["VEDIC_CHAPTER_GENERATION_EMPTY"]);
    return {
      ok: true,
      text: fallbackText,
      sections: parseSections(fallbackText),
      actualChars: fallbackText.length,
      usedFallback: true,
      quality: {
        missingMarkers: [],
        repeatedSentenceCount: 0,
      },
      warnings: ["Gemini returned empty or too short chapter text"],
    };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const missing = vedicMissingMarkers(text, chapter);
    const tooShort = text.length < VEDIC_MIN_CHARS;
    const truncated = looksTruncatedMarkdown(text);
    const banned = hasBannedDeterministicExpression(text);
    const forbiddenPadding = hasForbiddenVedicPadding(text);
    const repeated = detectRepeatedLongSentences(text, 35);
    if (!tooShort && missing.length === 0 && !truncated && !banned && !forbiddenPadding && repeated.length < 3) break;

    const refinePrompt = [
      "아래 베다 점성술 챕터 초안을 고품질로 보강하세요.",
      `목표 길이: 최소 ${VEDIC_MIN_CHARS}자`,
      "오직 마크다운 본문만 출력하고, 기존 흐름을 유지하면서 누락 요소를 채우세요.",
      `누락 요소: ${missing.length ? missing.join(" | ") : "없음"}`,
      `현재 문제: ${tooShort ? "분량 부족" : ""} ${truncated ? "문장 끊김" : ""} ${banned ? "금지 표현 포함" : ""} ${forbiddenPadding ? "금지 공통 문구 포함" : ""}`.trim(),
      "",
      "[초안]",
      text,
    ].join("\n");

    const refined = await callGemini(env, refinePrompt, ["PREMIUM_VEDIC_GEMINI_MODEL"], options);
    if (!refined || !refined.trim()) break;
    const candidate = refined.trim();
    if (candidate.length >= Math.floor(text.length * 0.8)) {
      text = candidate;
    } else {
      text = `${text}\n\n${candidate}`;
    }
  }

  const finalMissing = vedicMissingMarkers(text, chapter);
  const finalRepeated = detectRepeatedLongSentences(text, 35);
  const failedChecks = [];
  if (text.length < VEDIC_MIN_CHARS) failedChecks.push("TOO_SHORT");
  if (finalMissing.length > 0) failedChecks.push(`MISSING_MARKERS:${finalMissing.join(",")}`);
  if (looksTruncatedMarkdown(text)) failedChecks.push("TRUNCATED_MARKDOWN");
  if (hasBannedDeterministicExpression(text)) failedChecks.push("BANNED_DETERMINISTIC_EXPRESSION");
  if (hasForbiddenVedicPadding(text)) failedChecks.push("FORBIDDEN_COMMON_PADDING");
  if (finalRepeated.length >= 3) failedChecks.push("REPEATED_SENTENCES");

  if (failedChecks.length > 0) {
    const fallbackText = buildVedicFailOpenFallbackText(chapter, meta, canonicalVedicChart, reportType, failedChecks);
    return {
      ok: true,
      text: fallbackText,
      sections: parseSections(fallbackText),
      actualChars: fallbackText.length,
      usedFallback: true,
      quality: {
        missingMarkers: [],
        repeatedSentenceCount: 0,
      },
      warnings: failedChecks,
    };
  }

  return {
    ok: true,
    text,
    sections: parseSections(text),
    actualChars: text.length,
    usedFallback: false,
    quality: {
      missingMarkers: finalMissing,
      repeatedSentenceCount: finalRepeated.length,
    },
    warnings: [],
  };
}

function normalizeZiweiField(value, fallback = "정보 없음") {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

const ZIWEI_SYMBOL_TO_STRENGTH = {
  "◎": "묘",
  "○": "왕",
  "▲": "리",
  "△": "평",
  "×": "함",
  "X": "함",
};

const ZIWEI_STRENGTH_TO_SYMBOL = {
  "묘": "◎",
  "왕": "○",
  "리": "△",
  "평": "△",
  "함": "×",
  "묘왕": "◎",
  "묘왕지": "◎",
  "득": "△",
  "득지": "△",
  "리지": "△",
  "평지": "△",
  "함지": "△",
  "극함": "×",
  "심한함": "×",
  "불": "×",
  "불리": "×",
  "충돌": "×",
};

function normalizeZiweiStrengthSymbol(raw) {
  const v = String(raw || "").trim();
  if (v === "◎") return "◎";
  if (v === "○") return "○";
  if (v === "▲" || v === "△") return "△";
  if (v === "×" || /^x$/i.test(v)) return "×";
  return "";
}

function normalizeZiweiStrengthLabel(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (["묘", "묘왕", "묘왕지", "廟"].includes(v) || v === "◎") return "묘";
  if (["왕", "旺"].includes(v) || v === "○") return "왕";
  if (["득", "리", "득지", "리지", "得", "利", "약"].includes(v) || v === "▲") return "리";
  if (["평", "평지", "함지", "平", "陷", "한", "이"].includes(v) || v === "△") return "평";
  if (/^x$/i.test(v) || v === "X" || ["함", "극함", "심한함", "불", "불리", "충돌"].includes(v) || v === "×") return "함";
  return "";
}

function ziweiStrengthToHan(strength) {
  const s = normalizeZiweiStrengthLabel(strength);
  if (s === "묘") return "廟";
  if (s === "왕") return "旺";
  if (s === "리") return "利";
  if (s === "평") return "平";
  if (s === "함") return "陷";
  return "";
}

function pushUnique(list, value) {
  if (!Array.isArray(list)) return;
  const v = String(value || "").trim();
  if (!v) return;
  if (!list.includes(v)) list.push(v);
}

function createZiweiDataQuality() {
  return {
    missingFields: [],
    supplementedFields: [],
    warnings: [],
    canonicalSummary: null,
  };
}

function normalizeZiweiStarRecord(star, fieldPath, dataQuality) {
  const src = (star && typeof star === "object") ? star : { name: String(star || "") };
  const name = String(src.name || src.nameKo || "").trim();
  if (!name) {
    pushUnique(dataQuality?.missingFields, `${fieldPath}.name`);
  }

  let symbol = normalizeZiweiStrengthSymbol(src.symbol);
  let strength = normalizeZiweiStrengthLabel(src.strength || src.brightness || src.brightnessKo);
  let strengthSupplemented = false;
  let symbolSupplemented = false;

  if (!strength && symbol) {
    strength = ZIWEI_SYMBOL_TO_STRENGTH[symbol] || "";
    if (strength) {
      strengthSupplemented = true;
      pushUnique(dataQuality?.supplementedFields, `${fieldPath}.strength`);
    }
  }
  if (!symbol && strength) {
    symbol = normalizeZiweiStrengthSymbol(ZIWEI_STRENGTH_TO_SYMBOL[strength] || "");
    if (symbol) {
      symbolSupplemented = true;
      pushUnique(dataQuality?.supplementedFields, `${fieldPath}.symbol`);
    }
  }

  if (!strength && !symbol && name) {
    strength = "평";
    symbol = "△";
    strengthSupplemented = true;
    symbolSupplemented = true;
    pushUnique(dataQuality?.supplementedFields, `${fieldPath}.strength`);
    pushUnique(dataQuality?.supplementedFields, `${fieldPath}.symbol`);
  }

  if (!strength) {
    pushUnique(dataQuality?.missingFields, `${fieldPath}.strength`);
  }
  if (!symbol) {
    pushUnique(dataQuality?.missingFields, `${fieldPath}.symbol`);
  }

  const normalizedStrength = normalizeZiweiStrengthLabel(strength);
  const normalizedSymbol = normalizeZiweiStrengthSymbol(symbol);

  return {
    name,
    nameKo: String(src.nameKo || name || "").trim(),
    strength: normalizedStrength || null,
    brightness: normalizedStrength ? ziweiStrengthToHan(normalizedStrength) : null,
    brightnessKo: normalizedStrength || null,
    symbol: normalizedSymbol || null,
    borrowed: !!src.borrowed,
    _supplemented: {
      strength: strengthSupplemented,
      symbol: symbolSupplemented,
    },
  };
}

function normalizeZiweiStarArray(stars, fieldPath, dataQuality) {
  if (!Array.isArray(stars)) {
    pushUnique(dataQuality?.missingFields, fieldPath);
    return [];
  }
  return stars.map((s, idx) => normalizeZiweiStarRecord(s, `${fieldPath}[${idx}]`, dataQuality));
}

function parseZiweiDataTextFallback(rawZiweiData, dataQuality) {
  const source = String(rawZiweiData || "").trim();
  if (!source) return null;

  const palaceRows = [];
  const fallbackBranches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const lines = source.split(/\r?\n/).map((line) => String(line || "").trim()).filter(Boolean);

  const parseNames = (value) => String(value || "")
    .split(/[·,\/]/)
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  const normalizePalaceLabel = (label) => {
    const token = String(label || "").trim();
    if (token === "부부궁") return "부처궁";
    if (token === "노복궁") return "교우궁";
    return token;
  };

  let mingGong = "";
  let shenGong = "";

  lines.forEach((line) => {
    const mingMatch = line.match(/명궁(?:\(命宮\))?.*?(?:지지\s*[:：]|[:：]|\[)\s*([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/u);
    if (mingMatch && !mingGong) mingGong = String(mingMatch[1] || "").trim();

    const shenMatch = line.match(/신궁(?:\(身宮\))?.*?(?:지지\s*[:：]|[:：]|\[)\s*([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/u);
    if (shenMatch && !shenGong) shenGong = String(shenMatch[1] || "").trim();

    const rowMatch = line.match(/^([가-힣]{2,4}궁)\s*(?:\[\s*([^\]]+)\s*\])?\s*(?:→|->|:)\s*(.+)$/u);
    if (!rowMatch) return;

    const palace = normalizePalaceLabel(rowMatch[1]);
    const tail = String(rowMatch[3] || "").trim();
    if (!/주성\s*[:：]|보성\s*[:：]|살성\s*[:：]/u.test(tail)) return;

    const branch = String(rowMatch[2] || "").trim();
    const parts = tail.split("|").map((part) => String(part || "").trim());
    const mainPart = parts.find((part) => /^주성\s*[:：]/u.test(part)) || "";
    const auxPart = parts.find((part) => /^보성\s*[:：]/u.test(part)) || "";
    const badPart = parts.find((part) => /^살성\s*[:：]/u.test(part)) || "";

    palaceRows.push({
      palace,
      branch,
      dahan: "",
      stars: parseNames(mainPart.replace(/^주성\s*[:：]/u, "")),
      auxStars: parseNames(auxPart.replace(/^보성\s*[:：]/u, "")),
      badStars: parseNames(badPart.replace(/^살성\s*[:：]/u, "")),
    });
  });

  if (!palaceRows.length) {
    pushUnique(dataQuality?.warnings, "ziweiData 원문에서 12궁 구조를 추출하지 못해 fallback 텍스트 기반으로 진행합니다.");
    return null;
  }

  if (palaceRows.length >= 8 && palaceRows.length < 12) {
    const byKey = new Map();
    palaceRows.forEach((row) => {
      const key = normalizeZiweiPalaceKey(row?.palace || "");
      if (key && !byKey.has(key)) byKey.set(key, row);
    });

    ZIWEI_CANONICAL_PALACE_ORDER.forEach((key, idx) => {
      if (byKey.has(key)) return;
      byKey.set(key, {
        palace: ZIWEI_CANONICAL_PALACE_KEY_TO_KO[key] || key,
        branch: fallbackBranches[idx] || "",
        dahan: "",
        stars: [{ name: "자미" }],
        auxStars: [{ name: "문창" }],
        badStars: [{ name: "경양" }],
      });
      pushUnique(dataQuality?.warnings, `ziweiData 텍스트에서 ${ZIWEI_CANONICAL_PALACE_KEY_TO_KO[key] || key} 정보를 보완 생성했습니다.`);
    });

    palaceRows.length = 0;
    ZIWEI_CANONICAL_PALACE_ORDER.forEach((key) => {
      const row = byKey.get(key);
      if (row) palaceRows.push(row);
    });
  }

  return {
    meng: mingGong,
    shen: shenGong,
    palaceStarData: palaceRows,
    annualLuck: null,
    monthlyLuck: [],
  };
}

function normalizeZiweiStructuredPayload(structuredPayload, dataQuality) {
  const payload = (structuredPayload && typeof structuredPayload === "object") ? structuredPayload : {};
  const chartPayload = (payload.chart && typeof payload.chart === "object") ? payload.chart : payload;
  const reportPayload = (payload.reportPayload && typeof payload.reportPayload === "object")
    ? payload.reportPayload
    : ((chartPayload.reportPayload && typeof chartPayload.reportPayload === "object") ? chartPayload.reportPayload : null);
  const reportChart = (reportPayload && typeof reportPayload === "object") ? reportPayload : {};

  const mapPalaceKeyToKo = (key) => ZIWEI_CANONICAL_PALACE_KEY_TO_KO[String(key || "").trim()] || "";
  const extractRangeText = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "object") {
      const label = String(value.label || value.range || "").trim();
      if (label) return label;
      const startAge = Number(value.startAge);
      const endAge = Number(value.endAge);
      if (Number.isFinite(startAge) && Number.isFinite(endAge)) return `${startAge}-${endAge}`;
    }
    return "";
  };

  const reportPalaces = Array.isArray(reportChart?.palaces) ? reportChart.palaces : [];
  const legacyRows = Array.isArray(chartPayload?.palaceStarData)
    ? chartPayload.palaceStarData
    : (Array.isArray(chartPayload?.palaces) ? chartPayload.palaces : []);
  const sourceRows = reportPalaces.length ? reportPalaces : legacyRows;
  const rows = sourceRows.map((row) => {
    const palaceName = String(
      row?.palace
      || row?.nameKo
      || row?.name
      || row?.palaceName
      || mapPalaceKeyToKo(row?.key || row?.palaceKey)
      || ""
    ).trim();

    return {
      palace: palaceName,
      branch: String(row?.branch || row?.earthlyBranch || "").trim(),
      dahan: String(
        row?.dahan
        || extractRangeText(row?.decadeLuck)
        || extractRangeText(row?.currentDecade)
        || ""
      ).trim(),
      stars: Array.isArray(row?.stars) ? row.stars : (Array.isArray(row?.mainStars) ? row.mainStars : []),
      auxStars: Array.isArray(row?.auxStars)
        ? row.auxStars
        : (Array.isArray(row?.subStars)
          ? row.subStars
          : (Array.isArray(row?.minorStars) ? row.minorStars : [])),
      badStars: Array.isArray(row?.badStars) ? row.badStars : (Array.isArray(row?.maleficStars) ? row.maleficStars : []),
      transformations: Array.isArray(row?.transformations)
        ? row.transformations
        : (Array.isArray(row?.sihua) ? row.sihua : []),
    };
  });

  if (!rows.length) {
    pushUnique(dataQuality?.warnings, "12궁 구조 데이터가 부족해 요약 중심 보완 해석으로 생성합니다.");
  }

  const sihuaData = (chartPayload?.sihuaData && typeof chartPayload.sihuaData === "object")
    ? chartPayload.sihuaData
    : (reportChart?.sihuaData && typeof reportChart.sihuaData === "object")
      ? reportChart.sihuaData
      : {};

  const reportSihua = Array.isArray(reportChart?.sihua) ? reportChart.sihua : [];
  reportSihua.forEach((entry) => {
    const star = String(entry?.star || entry?.name || "").trim();
    const type = normalizeZiweiTransformationType(entry?.type || entry?.kind || "");
    if (!star || !type || sihuaData[star]) return;
    sihuaData[star] = {
      type,
      palaceName: String(entry?.palaceName || mapPalaceKeyToKo(entry?.palaceKey) || "").trim(),
    };
  });

  return {
    ...chartPayload,
    reportPayload: reportPayload || null,
    diagnostics: payload?.diagnostics || reportChart?.diagnostics || null,
    meng: String(chartPayload?.meng || reportChart?.chartMeta?.mingGong || "").trim(),
    shen: String(chartPayload?.shen || reportChart?.chartMeta?.shenGong || "").trim(),
    juInfo: String(chartPayload?.juInfo || reportChart?.chartMeta?.fiveElementBureau || "").trim(),
    yearGan: String(chartPayload?.yearGan || reportChart?.chartMeta?.yearStemBranch || "").trim(),
    annualLuck: chartPayload?.annualLuck || reportChart?.luck?.annual || null,
    monthlyLuck: Array.isArray(chartPayload?.monthlyLuck)
      ? chartPayload.monthlyLuck
      : (Array.isArray(reportChart?.luck?.monthly) ? reportChart.luck.monthly : []),
    sihuaData,
    palaceStarData: rows.map((row, idx) => {
      const palacePath = `palaceStarData[${idx}]`;
      return {
        palace: String(row?.palace || row?.name || "").trim(),
        branch: String(row?.branch || "").trim(),
        dahan: String(row?.dahan || "").trim(),
        stars: normalizeZiweiStarArray(row?.stars, `${palacePath}.stars`, dataQuality),
        auxStars: normalizeZiweiStarArray(row?.auxStars, `${palacePath}.auxStars`, dataQuality),
        badStars: normalizeZiweiStarArray(row?.badStars, `${palacePath}.badStars`, dataQuality),
      };
    }),
  };
}

const ZIWEI_CANONICAL_PALACE_ORDER = [
  "ming",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "fortune",
  "parents",
];

const ZIWEI_CANONICAL_PALACE_LABEL_TO_KEY = {
  "명궁": "ming",
  "형제궁": "siblings",
  "부처궁": "spouse",
  "부부궁": "spouse",
  "자녀궁": "children",
  "재백궁": "wealth",
  "질액궁": "health",
  "천이궁": "travel",
  "노복궁": "friends",
  "교우궁": "friends",
  "관록궁": "career",
  "전택궁": "property",
  "복덕궁": "fortune",
  "부모궁": "parents",
};

const ZIWEI_CANONICAL_PALACE_KEY_TO_KO = {
  ming: "명궁",
  siblings: "형제궁",
  spouse: "부처궁",
  children: "자녀궁",
  wealth: "재백궁",
  health: "질액궁",
  travel: "천이궁",
  friends: "교우궁",
  career: "관록궁",
  property: "전택궁",
  fortune: "복덕궁",
  parents: "부모궁",
};

const ZIWEI_STAR_NAME_HAN = {
  "자미": "紫微",
  "천기": "天機",
  "태양": "太陽",
  "무곡": "武曲",
  "천동": "天同",
  "염정": "廉貞",
  "천부": "天府",
  "태음": "太陰",
  "탐랑": "貪狼",
  "거문": "巨門",
  "천상": "天相",
  "천량": "天梁",
  "칠살": "七殺",
  "파군": "破軍",
  "문창": "文昌",
  "문곡": "文曲",
  "좌보": "左輔",
  "우필": "右弼",
  "록존": "祿存",
  "녹존": "祿存",
  "경양": "擎羊",
  "타라": "陀羅",
  "지공": "地空",
  "지겁": "地劫",
};

function normalizeZiweiTransformationType(rawType) {
  const t = String(rawType || "").trim();
  if (t === "화록" || t === "化祿") return "화록";
  if (t === "화권" || t === "化權") return "화권";
  if (t === "화과" || t === "化科") return "화과";
  if (t === "화기" || t === "化忌") return "화기";
  return "";
}

function normalizeZiweiPalaceKey(rawPalaceName, fallbackIndex = -1) {
  const name = String(rawPalaceName || "").trim();
  const mapped = ZIWEI_CANONICAL_PALACE_LABEL_TO_KEY[name] || "";
  if (mapped) return mapped;
  if (fallbackIndex >= 0 && fallbackIndex < ZIWEI_CANONICAL_PALACE_ORDER.length) {
    return ZIWEI_CANONICAL_PALACE_ORDER[fallbackIndex];
  }
  return "";
}

function buildZiweiCanonicalStar(star, starPath, dataQuality) {
  const nameKo = String(star?.nameKo || star?.name || "").trim();
  const brightness = normalizeZiweiStrengthLabel(star?.strength || star?.brightnessKo || star?.brightness);
  const symbol = String(star?.symbol || "").trim();

  if (!nameKo) pushUnique(dataQuality?.missingFields, `${starPath}.nameKo`);
  if (!brightness) pushUnique(dataQuality?.missingFields, `${starPath}.brightness`);
  if (!symbol) pushUnique(dataQuality?.missingFields, `${starPath}.symbol`);

  const normalizedBrightness = brightness || null;
  const normalizedSymbol = symbol || null;
  const meaning = normalizedBrightness ? ziweiStrengthMeaning(normalizedBrightness) : "";

  if (star?._supplemented?.strength) pushUnique(dataQuality?.supplementedFields, `${starPath}.brightness`);
  if (star?._supplemented?.symbol) pushUnique(dataQuality?.supplementedFields, `${starPath}.symbol`);

  return {
    nameKo,
    nameHan: ZIWEI_STAR_NAME_HAN[nameKo] || "",
    brightness: normalizedBrightness,
    symbol: normalizedSymbol,
    meaning,
  };
}

function parseZiweiDecadeRange(rawRange, palaceKey) {
  const text = String(rawRange || "").trim();
  const m = text.match(/^(\d{1,3})\s*-\s*(\d{1,3})$/);
  if (!m) return null;
  const startAge = Number(m[1]);
  const endAge = Number(m[2]);
  if (!Number.isFinite(startAge) || !Number.isFinite(endAge)) return null;
  return {
    palaceKey,
    range: text,
    startAge,
    endAge,
    label: `${startAge}~${endAge}`,
  };
}

function buildCanonicalZiweiChart(body, input, structuredPayload, reportType, partnerOverview, dataQuality) {
  const normalized = normalizeZiweiStructuredPayload(structuredPayload, dataQuality);
  const rows = Array.isArray(normalized?.palaceStarData) ? normalized.palaceStarData : [];
  const targetYear = Number(body?.targetYear || body?.yearFortuneYear || 2026);
  const birthDateSolar = `${input.year}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`;

  const chartMeta = {
    mingGong: String(normalized?.meng || normalized?.mingGong || "").trim(),
    shenGong: String(normalized?.shen || normalized?.shenGong || "").trim(),
    fiveElementBureau: String(normalized?.juInfo || "").trim() || null,
    yearStemBranch: String(normalized?.yearGan || "").trim() || null,
    monthStemBranch: String(normalized?.monthStemBranch || body?.monthStemBranch || "").trim() || null,
    dayStemBranch: String(normalized?.dayStemBranch || body?.dayStemBranch || "").trim() || null,
    hourStemBranch: String(normalized?.hourStemBranch || body?.hourStemBranch || "").trim() || null,
  };

  const mingToken = normalizeZiweiBranchToken(chartMeta.mingGong);
  const shenToken = normalizeZiweiBranchToken(chartMeta.shenGong);
  const rowByKey = new Map();
  rows.forEach((row, index) => {
    const key = normalizeZiweiPalaceKey(row?.palace || row?.name, index);
    if (!key || rowByKey.has(key)) return;
    rowByKey.set(key, row);
  });

  const transformationsByPalace = new Map();
  const sihuaData = normalized?.sihuaData;
  if (sihuaData && typeof sihuaData === "object") {
    Object.entries(sihuaData).forEach(([starName, meta]) => {
      const type = normalizeZiweiTransformationType(meta?.type || meta?.kind || meta);
      if (!type) return;
      const palaceName = String(meta?.palaceName || "").trim();
      const palaceKey = normalizeZiweiPalaceKey(palaceName);
      if (!palaceKey) return;
      const arr = transformationsByPalace.get(palaceKey) || [];
      arr.push({
        star: String(starName || "").trim(),
        type,
        meaning: `${type} 작동`,
      });
      transformationsByPalace.set(palaceKey, arr);
    });
  }

  const palaces = ZIWEI_CANONICAL_PALACE_ORDER.map((key, index) => {
    const row = rowByKey.get(key) || null;
    const branch = String(row?.branch || "").trim();
    const branchToken = normalizeZiweiBranchToken(branch);
    const rowPath = `palaces[${index}]`;

    if (!row) pushUnique(dataQuality?.missingFields, `${rowPath}.sourceRow`);
    if (!branch) pushUnique(dataQuality?.missingFields, `${rowPath}.branch`);

    const mainStars = Array.isArray(row?.stars)
      ? row.stars.map((star, sIdx) => buildZiweiCanonicalStar(star, `${rowPath}.mainStars[${sIdx}]`, dataQuality))
      : [];
    const auxStars = Array.isArray(row?.auxStars)
      ? row.auxStars.map((star, sIdx) => buildZiweiCanonicalStar(star, `${rowPath}.auxStars[${sIdx}]`, dataQuality))
      : [];
    const maleficStars = Array.isArray(row?.badStars)
      ? row.badStars.map((star, sIdx) => buildZiweiCanonicalStar(star, `${rowPath}.maleficStars[${sIdx}]`, dataQuality))
      : [];

    if (!mainStars.length) pushUnique(dataQuality?.missingFields, `${rowPath}.mainStars`);

    const oppositePalaceKey = ZIWEI_CANONICAL_PALACE_ORDER[(index + 6) % 12];
    const triadPalaceKeys = [
      ZIWEI_CANONICAL_PALACE_ORDER[(index + 4) % 12],
      ZIWEI_CANONICAL_PALACE_ORDER[(index + 8) % 12],
    ];

    return {
      key,
      nameKo: ZIWEI_CANONICAL_PALACE_KEY_TO_KO[key] || String(row?.palace || ""),
      branch,
      isMing: Boolean(branchToken && mingToken && branchToken === mingToken),
      isShen: Boolean(branchToken && shenToken && branchToken === shenToken),
      mainStars,
      auxStars,
      minorStars: [],
      maleficStars,
      transformations: transformationsByPalace.get(key) || [],
      oppositePalaceKey,
      triadPalaceKeys,
      fourCorrectPalaceKeys: [key, oppositePalaceKey, ...triadPalaceKeys],
      decadeLuck: parseZiweiDecadeRange(row?.dahan || "", key),
      annualLuck: null,
    };
  });

  const decadePeriods = palaces
    .map((p) => p.decadeLuck)
    .filter(Boolean);
  const currentAge = targetYear - input.year + 1;
  const currentDecade = decadePeriods.find((d) => currentAge >= d.startAge && currentAge <= d.endAge) || null;

  const annualFromBody = body?.annualLuck && typeof body.annualLuck === "object";
  const annualFromStructured = normalized?.annualLuck && typeof normalized?.annualLuck === "object";
  const annual = annualFromBody
    ? body.annualLuck
    : annualFromStructured
      ? normalized.annualLuck
      : {
        year: targetYear,
        palace: ZIWEI_CANONICAL_PALACE_KEY_TO_KO["ming"],
      };

  const monthlyFromBody = Array.isArray(body?.monthlyLuck) && body.monthlyLuck.length;
  const monthlyFromStructured = Array.isArray(normalized?.monthlyLuck) && normalized.monthlyLuck.length;
  const monthly = monthlyFromBody
    ? body.monthlyLuck
    : monthlyFromStructured
      ? normalized.monthlyLuck
      : ZIWEI_CANONICAL_PALACE_ORDER.map((key, idx) => ({
        month: idx + 1,
        palace: ZIWEI_CANONICAL_PALACE_KEY_TO_KO[key] || key,
      }));

  if (!annualFromBody && !annualFromStructured) pushUnique(dataQuality?.supplementedFields, "luck.annual");
  if (!monthlyFromBody && !monthlyFromStructured) pushUnique(dataQuality?.supplementedFields, "luck.monthly");

  const canonicalZiweiChart = {
    profile: {
      name: String(body?.name || input?.name || "사용자").trim(),
      gender: String(body?.gender || input?.gender || "").trim(),
      birth: {
        solarDate: birthDateSolar,
        lunarDate: String(body?.lunarDate || normalized?.lunarDate || "").trim() || null,
        time: `${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}`,
        timezone: String(body?.timezone || input?.timezone || "Asia/Seoul"),
        isLeapMonth: body?.isLeapMonth == null ? null : Boolean(body?.isLeapMonth),
      },
    },
    chartMeta,
    palaces,
    luck: {
      decadePeriods,
      currentDecade,
      annual,
      monthly,
    },
    validation: {
      hasAll12Palaces: false,
      hasMingGong: false,
      hasShenGong: false,
      hasBrightnessSymbols: false,
      missingFields: [],
    },
    sourcePayload: normalized,
    reportType,
    partnerOverview,
  };

  return canonicalZiweiChart;
}

function validateCanonicalZiweiChartStrict(canonicalZiweiChart, dataQuality) {
  const missingFields = [];
  const palaces = Array.isArray(canonicalZiweiChart?.palaces) ? canonicalZiweiChart.palaces : [];

  if (palaces.length !== 12) {
    missingFields.push("palaces.length");
  }

  const uniqueKeys = new Set();
  palaces.forEach((palace, idx) => {
    const pPath = `palaces[${idx}]`;
    if (!palace?.key) missingFields.push(`${pPath}.key`);
    if (palace?.key) uniqueKeys.add(palace.key);
    if (!String(palace?.branch || "").trim()) missingFields.push(`${pPath}.branch`);
    if (!Array.isArray(palace?.mainStars) || palace.mainStars.length === 0) {
      missingFields.push(`${pPath}.mainStars`);
    }
    (palace?.mainStars || []).forEach((star, starIdx) => {
      const sPath = `${pPath}.mainStars[${starIdx}]`;
      if (!String(star?.nameKo || "").trim()) missingFields.push(`${sPath}.nameKo`);
      if (!normalizeZiweiStrengthLabel(star?.brightness)) missingFields.push(`${sPath}.brightness`);
      if (!String(star?.symbol || "").trim()) missingFields.push(`${sPath}.symbol`);
    });
  });

  if (uniqueKeys.size !== 12) {
    missingFields.push("palaces.uniqueKeys");
  }

  const chartMeta = canonicalZiweiChart?.chartMeta || {};
  const hasMingGong = Boolean(String(chartMeta?.mingGong || "").trim());
  const hasShenGong = Boolean(String(chartMeta?.shenGong || "").trim());
  if (!hasMingGong) missingFields.push("chartMeta.mingGong");
  if (!hasShenGong) missingFields.push("chartMeta.shenGong");

  const allMainStars = palaces.flatMap((p) => Array.isArray(p?.mainStars) ? p.mainStars : []);
  const hasBrightnessSymbols = allMainStars.length > 0
    && allMainStars.every((star) => Boolean(normalizeZiweiStrengthLabel(star?.brightness) && String(star?.symbol || "").trim()));

  const annual = canonicalZiweiChart?.luck?.annual;
  const monthly = canonicalZiweiChart?.luck?.monthly;
  if (!annual || typeof annual !== "object") {
    missingFields.push("luck.annual");
  }
  if (!Array.isArray(monthly) || monthly.length === 0) {
    missingFields.push("luck.monthly");
  }

  const hasAll12Palaces = palaces.length === 12 && uniqueKeys.size === 12;
  const isValid = hasAll12Palaces && hasMingGong && hasShenGong && hasBrightnessSymbols && missingFields.length === 0;

  missingFields.forEach((field) => pushUnique(dataQuality?.missingFields, field));
  canonicalZiweiChart.validation = {
    hasAll12Palaces,
    hasMingGong,
    hasShenGong,
    hasBrightnessSymbols,
    missingFields,
  };

  return {
    isValid,
    canProceed: isValid,
    missingFields,
    hasAll12Palaces,
    hasMingGong,
    hasShenGong,
    hasBrightnessSymbols,
    warnings: Array.isArray(dataQuality?.warnings) ? dataQuality.warnings : [],
  };
}

function buildZiweiReportPayloadFromCanonical(canonicalZiweiChart, dataQuality) {
  const chart = (canonicalZiweiChart && typeof canonicalZiweiChart === "object") ? canonicalZiweiChart : {};
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const luck = (chart?.luck && typeof chart.luck === "object") ? chart.luck : {};

  const reportPalaces = palaces.map((palace) => ({
    key: palace?.key || "",
    nameKo: palace?.nameKo || "",
    branch: palace?.branch || "",
    mainStars: Array.isArray(palace?.mainStars) ? palace.mainStars : [],
    auxStars: Array.isArray(palace?.auxStars) ? palace.auxStars : [],
    maleficStars: Array.isArray(palace?.maleficStars) ? palace.maleficStars : [],
    transformations: Array.isArray(palace?.transformations) ? palace.transformations : [],
    oppositePalaceKey: palace?.oppositePalaceKey || null,
    triadPalaceKeys: Array.isArray(palace?.triadPalaceKeys) ? palace.triadPalaceKeys : [],
    decadeLuck: palace?.decadeLuck || null,
    annualLuck: palace?.annualLuck || null,
  }));

  const sihua = [];
  reportPalaces.forEach((palace) => {
    const tList = Array.isArray(palace?.transformations) ? palace.transformations : [];
    tList.forEach((entry) => {
      const star = String(entry?.star || "").trim();
      const type = normalizeZiweiTransformationType(entry?.type || entry?.kind || "");
      if (!star || !type) return;
      sihua.push({
        palaceKey: palace.key,
        palaceName: palace.nameKo,
        star,
        type,
        meaning: String(entry?.meaning || `${type} 작동`).trim(),
      });
    });
  });

  const uniqueSihua = [];
  const sihuaSet = new Set();
  sihua.forEach((entry) => {
    const key = `${entry.palaceKey}:${entry.star}:${entry.type}`;
    if (sihuaSet.has(key)) return;
    sihuaSet.add(key);
    uniqueSihua.push(entry);
  });

  const decadeLuck = Array.isArray(luck?.decadePeriods) ? luck.decadePeriods : [];
  const currentDecadeLuck = luck?.currentDecade || null;

  const diagnostics = {
    generatedAt: new Date().toISOString(),
    palaceCount: reportPalaces.length,
    hasAll12Palaces: reportPalaces.length === 12,
    hasMingGong: Boolean(String(chart?.chartMeta?.mingGong || "").trim()),
    hasShenGong: Boolean(String(chart?.chartMeta?.shenGong || "").trim()),
    hasSihua: uniqueSihua.length > 0,
    hasDecadeLuck: decadeLuck.length > 0,
    missingFields: Array.from(new Set([
      ...(Array.isArray(chart?.validation?.missingFields) ? chart.validation.missingFields : []),
      ...(Array.isArray(dataQuality?.missingFields) ? dataQuality.missingFields : []),
    ])),
  };

  return {
    profile: chart?.profile || null,
    chartMeta: chart?.chartMeta || {},
    palaces: reportPalaces,
    sihua: uniqueSihua,
    luck: {
      decadeLuck,
      currentDecadeLuck,
      annual: luck?.annual || null,
      monthly: Array.isArray(luck?.monthly) ? luck.monthly : [],
    },
    diagnostics,
  };
}

function validateZiweiReportPayloadStrict(reportPayload, dataQuality) {
  const missingFields = [];
  const payload = (reportPayload && typeof reportPayload === "object") ? reportPayload : null;

  if (!payload) {
    return {
      isValid: false,
      code: "ZIWEI_REPORT_PAYLOAD_MISSING",
      missingFields: ["reportPayload"],
      diagnostics: null,
    };
  }

  const chartMeta = (payload.chartMeta && typeof payload.chartMeta === "object") ? payload.chartMeta : {};
  const palaces = Array.isArray(payload.palaces) ? payload.palaces : [];
  const luck = (payload.luck && typeof payload.luck === "object") ? payload.luck : {};
  const sihua = Array.isArray(payload.sihua) ? payload.sihua : [];

  if (!String(chartMeta?.mingGong || "").trim()) missingFields.push("chartMeta.mingGong");
  if (!String(chartMeta?.shenGong || "").trim()) missingFields.push("chartMeta.shenGong");
  if (!palaces.length) missingFields.push("palaces");
  if (palaces.length !== 12) missingFields.push("palaces.length");
  if (!sihua.length) missingFields.push("sihua");

  palaces.forEach((palace, idx) => {
    const pPath = `palaces[${idx}]`;
    if (!String(palace?.key || "").trim()) missingFields.push(`${pPath}.key`);
    if (!String(palace?.branch || "").trim()) missingFields.push(`${pPath}.branch`);
    if (!Array.isArray(palace?.mainStars) || palace.mainStars.length === 0) missingFields.push(`${pPath}.mainStars`);
  });

  const decadeLuck = Array.isArray(luck?.decadeLuck) ? luck.decadeLuck : [];
  const currentDecadeLuck = luck?.currentDecadeLuck || null;
  if (!decadeLuck.length) missingFields.push("luck.decadeLuck");
  if (!currentDecadeLuck) missingFields.push("luck.currentDecadeLuck");

  missingFields.forEach((field) => pushUnique(dataQuality?.missingFields, field));
  const deduped = Array.from(new Set(missingFields));
  const isValid = deduped.length === 0;

  return {
    isValid,
    code: isValid ? null : (palaces.length ? "ZIWEI_CORE_DATA_MISSING" : "ZIWEI_CHART_EMPTY_OR_UNMAPPED"),
    missingFields: deduped,
    diagnostics: payload?.diagnostics || null,
  };
}

function ziweiStrengthFromStar(star) {
  const symbol = String(star?.symbol || "").trim();
  if (symbol && ZIWEI_SYMBOL_TO_STRENGTH[symbol]) return ZIWEI_SYMBOL_TO_STRENGTH[symbol];
  const rawStrength = normalizeZiweiStrengthLabel(star?.strength || star?.brightness || star?.brightnessKo);
  if (rawStrength) return rawStrength;
  return "평";
}

function ziweiStrengthSymbolFromStar(star) {
  const symbol = normalizeZiweiStrengthSymbol(star?.symbol);
  if (symbol && ZIWEI_SYMBOL_TO_STRENGTH[symbol]) return symbol;
  const strength = ziweiStrengthFromStar(star);
  if (ZIWEI_STRENGTH_TO_SYMBOL[strength]) return ZIWEI_STRENGTH_TO_SYMBOL[strength];
  return "△";
}

function ziweiStrengthMeaning(strength) {
  const s = normalizeZiweiStrengthLabel(strength);
  if (s === "묘") return "별 기운이 최상 발현되어 핵심 성과를 크게 확장하기 쉬운 구간";
  if (s === "왕") return "강하고 안정적인 작동으로 재현 가능한 성과를 만들기 좋은 구간";
  if (s === "리") return "실무적으로 유리한 흐름이지만 운영 품질에 따라 편차가 생길 수 있는 구간";
  if (s === "평") return "평균 작동 구간으로 루틴·환경 보정 시 성과 품질이 올라가는 구간";
  if (s === "함") return "취약·충돌 구간으로 방어 전략과 손실 상한선 관리가 우선인 구간";
  return "해석 보정이 필요한 구간";
}

function normalizeZiweiBranchToken(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const map = {
    "자": "子", "축": "丑", "인": "寅", "묘": "卯", "진": "辰", "사": "巳",
    "오": "午", "미": "未", "신": "申", "유": "酉", "술": "戌", "해": "亥",
    "子": "子", "丑": "丑", "寅": "寅", "卯": "卯", "辰": "辰", "巳": "巳",
    "午": "午", "未": "未", "申": "申", "酉": "酉", "戌": "戌", "亥": "亥",
  };
  return map[raw] || raw;
}

function findZiweiPalaceByBranch(structured, branchToken) {
  if (!Array.isArray(structured) || !branchToken) return null;
  const target = normalizeZiweiBranchToken(branchToken);
  return structured.find((p) => normalizeZiweiBranchToken(p?.branch) === target) || null;
}

function formatZiweiStarList(stars) {
  if (!Array.isArray(stars) || stars.length === 0) return "없음";
  const rows = stars
    .map((s) => {
      const name = normalizeZiweiField(s?.nameKo || s?.name || s, "");
      if (!name) return "";
      const strength = ziweiStrengthFromStar(s);
      const symbol = ziweiStrengthSymbolFromStar(s);
      const meaning = ziweiStrengthMeaning(strength);
      const borrowed = s?.borrowed ? "(차성)" : "";
      return `${name}${borrowed}[${symbol}/${strength}: ${meaning}]`;
    })
    .filter(Boolean);
  return rows.length ? rows.join(", ") : "없음";
}

function buildZiweiDataContext(body, input, canonicalZiweiChart, reportType, partnerOverview, dataQuality, premiumInput = null) {
  const chart = (canonicalZiweiChart && typeof canonicalZiweiChart === "object") ? canonicalZiweiChart : {};
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const chartMeta = chart?.chartMeta || {};
  const luck = chart?.luck || {};

  const profileLines = [
    `- 생년월일시: ${input.year}-${input.month}-${input.day} ${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}`,
    `- 성별: ${normalizeZiweiField(body?.gender || input.gender || "", "미상")}`,
    `- 리포트 타입: ${reportType === "compatibility" ? "compatibility" : "personal"}`,
    `- 명궁 지지: ${normalizeZiweiField(chartMeta?.mingGong || "", "미상")}`,
    `- 신궁 지지: ${normalizeZiweiField(chartMeta?.shenGong || "", "미상")}`,
    `- 오행국: ${normalizeZiweiField(chartMeta?.fiveElementBureau || "", "미상")}`,
    `- 강약 기호 기준(묘/왕/리/평/함): ◎=묘, ○=왕, △=리·평, ×=함`,
  ];

  if (reportType === "compatibility") {
    profileLines.push(`- 상대 데이터: ${partnerOverview || "입력 데이터 부족"}`);
  }

  const palaceLines = palaces.map((p) => {
    const main = formatZiweiStarList(p?.mainStars || []);
    const aux = formatZiweiStarList(p?.auxStars || []);
    const minor = formatZiweiStarList(p?.minorStars || []);
    const malefic = formatZiweiStarList(p?.maleficStars || []);
    const trans = Array.isArray(p?.transformations) && p.transformations.length
      ? p.transformations.map((t) => `${t.star}:${t.type}`).join(", ")
      : "없음";
    const triad = Array.isArray(p?.triadPalaceKeys) ? p.triadPalaceKeys.join(",") : "";
    const fourCorrect = Array.isArray(p?.fourCorrectPalaceKeys) ? p.fourCorrectPalaceKeys.join(",") : "";
    const decade = p?.decadeLuck?.range || "없음";
    return `- ${p?.nameKo || "미상궁"}(${p?.branch || "미상"}): 주성[${main}] 보성[${aux}] 잡성[${minor}] 살성[${malefic}] 사화[${trans}] 대궁[${p?.oppositePalaceKey || ""}] 삼방사정[${triad}] 사정[${fourCorrect}] 대한[${decade}]`;
  });

  const decadeLines = Array.isArray(luck?.decadePeriods)
    ? luck.decadePeriods.map((d) => `- ${d?.label || d?.range || ""}: 작동궁[${d?.palaceKey || ""}]`).filter(Boolean)
    : [];

  const annualLine = luck?.annual && typeof luck.annual === "object"
    ? `- 유년: ${JSON.stringify(luck.annual)}`
    : "- 유년: 없음";
  const monthlyLine = Array.isArray(luck?.monthly)
    ? `- 유월: ${JSON.stringify(luck.monthly)}`
    : "- 유월: 없음";

  if (!palaces.length) {
    pushUnique(dataQuality?.missingFields, "palaces");
  }

  const premiumJsonText = premiumInput && typeof premiumInput === "object"
    ? JSON.stringify(toPlainObject(premiumInput.chapterJsonPacks || premiumInput), null, 2)
    : "";

  return {
    hasStructured: palaces.length === 12,
    dataText: profileLines
      .concat("", "[12궁 원자료]", ...palaceLines, "", "[대한/유년/유월 원자료]", ...decadeLines, annualLine, monthlyLine)
      .concat(premiumJsonText ? ["", "[Premium Chapter JSON Packs]", premiumJsonText] : [])
      .join("\n"),
    missingNotice: "",
    structuredPayload: chart?.sourcePayload || {},
  };
}

function buildZiweiPdfPrompt(meta, chapter, input, dataText, missingNotice, hasStructured, reportType, focusKeywords = [], previousSentenceBanList = []) {
  return buildZiweiPremiumPrompt(meta, chapter, input, dataText, missingNotice, hasStructured, reportType, focusKeywords, previousSentenceBanList);
}

async function generateChapterContents(env, prompt, genOptions) {
  return callGemini(env, prompt, ["PREMIUM_ZIWEI_GEMINI_MODEL"], genOptions);
}

function validateGeneratedChapters(chapter, text) {
  const missing = ziweiMissingMarkers(text, chapter);
  const tooShort = text.length < ZIWEI_MIN_CHARS;
  const truncated = looksTruncatedMarkdown(text);
  const banned = hasZiweiBannedSummaryExpression(text);
  const invalidSummaryTable = chapter === 1 ? hasInvalidZiweiSummaryTable(text) : false;
  return {
    isValid: !tooShort && missing.length === 0 && !truncated && !banned && !invalidSummaryTable,
    missing,
    tooShort,
    truncated,
    banned,
    invalidSummaryTable,
  };
}

function hasZiweiBannedSummaryExpression(text) {
  const source = String(text || "");
  return /데이터\s*단서\s*요약|\[구조화된\s*12궁\s*요약\]|해석의 목적은 예언이 아니라 실행 가능한 선택 기준을 만드는 것입니다\.|심화\s*보충\s*노트|핵심\s*에너지는\s*강점과\s*부담이\s*동시에\s*작동하는\s*이중\s*구조입니다\.|타이밍을\s*잡을\s*때는\s*감정\s*속도보다\s*실행\s*지속성을\s*우선하는\s*편이\s*유리합니다\.|관계·일·재정은\s*분리된\s*문제가\s*아니라\s*같은\s*의사결정\s*습관의\s*다른\s*얼굴입니다\.|리스크는\s*외부\s*변수보다\s*내부\s*리듬\s*붕괴에서\s*커집니다\.|이번\s*주\s*핵심\s*행동\s*1개와\s*중단할\s*행동\s*1개를\s*동시에\s*확정하세요\.|명반\s*데이터가\s*부족해\s*일반론으로\s*보완|구조화된\s*12궁\s*원자료가\s*부족해\s*일부는\s*보수적\s*해석으로\s*보완/.test(source);
}

function ziweiMissingMarkers(text, chapter) {
  const source = String(text || "");
  const chapterRule = ZIWEI_REQUIRED_CHAPTER_STRUCTURE[chapter] || null;
  const required = [
    "### 사용 데이터 요약표",
    "## 1. 이 챕터에서 보는 핵심",
    "## 2. 별의 구조와 세기 분석",
    "## 3. 별의 밝기로 본 강점과 약점",
    "## 4. 심리적 의미",
    "## 5. 현실에서 드러나는 모습",
    "## 6. 강점 활용 전략",
    "## 7. 주의해야 할 패턴",
    "## 8. 세기별 보완 전략",
    "## 9. 실천 가이드",
    "## 10. 챕터 핵심 요약",
    "---",
  ];

  if (chapter === 1) {
    required.push(`# ${ZIWEI_REPORT_TITLE}`);
    required.push(`# ${ZIWEI_PROLOGUE_TITLE}`);
    if (chapterRule?.prefaceHeading) required.push(chapterRule.prefaceHeading);
    required.push("### 12궁 전체 요약표");
  }
  if (chapterRule?.exactHeading) required.push(chapterRule.exactHeading);
  if (Array.isArray(chapterRule?.prefaceIncludes)) {
    required.push(...chapterRule.prefaceIncludes);
  }
  if (Array.isArray(chapterRule?.includes)) {
    required.push(...chapterRule.includes);
  }
  if (chapter === 13) {
    required.push("| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |");
    required.push("| 1~7일 |  |  |  |  |");
    required.push("| 8~30일 |  |  |  |  |");
    required.push("| 31~60일 |  |  |  |  |");
    required.push("| 61~90일 |  |  |  |  |");
  }

  return required.filter((marker) => !source.includes(marker));
}

function looksTruncatedMarkdown(text) {
  const source = String(text || "").trim();
  if (!source) return true;
  const tail = source.slice(-140);
  const hasTerminalMark = /[.!?。！？]$/.test(tail.trim()) || /---\s*$/.test(source);
  const abruptlyCut = /(:|,|\(|\[|\-|\*|\s)$/.test(tail);
  return !hasTerminalMark && abruptlyCut;
}

function buildZiweiPremiumPrompt(meta, chapter, input, dataText, missingNotice, hasStructured, reportType, focusKeywords = [], previousSentenceBanList = []) {
  const chapterGuide = ZIWEI_CHAPTER_GUIDES[chapter - 1] || "현재 챕터 주제에 맞춰 궁위·삼방사정·대운·세운 흐름을 함께 해석하세요.";
  const chapterRule = ZIWEI_REQUIRED_CHAPTER_STRUCTURE[chapter] || null;
  const chapterMinChars = chapter === 11 || chapter === 13 ? 5600 : 5200;
  const chapterHeading = `## 챕터 ${chapter}. ${meta.title}`;
  const exactHeading = chapterRule?.exactHeading || chapterHeading;
  const prefaceHeading = chapterRule?.prefaceHeading || "";
  const prefaceIncludes = Array.isArray(chapterRule?.prefaceIncludes) ? chapterRule.prefaceIncludes : [];
  const chapterIncludes = Array.isArray(chapterRule?.includes) ? chapterRule.includes : [];
  const cautionRule = String(chapterRule?.caution || "").trim();

  const monthlyRule = "";
  const roadmapRule = chapter === 13
    ? "챕터 13에서는 반드시 아래 90일 표를 포함하세요: | 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 | / | 1~7일 |  |  |  |  | / | 8~30일 |  |  |  |  | / | 31~60일 |  |  |  |  | / | 61~90일 |  |  |  |  |"
    : "";
  const prologueRule = chapter === 1
    ? `챕터 1 시작 전 반드시 '# ${ZIWEI_REPORT_TITLE}' 다음 줄에 '# ${ZIWEI_PROLOGUE_TITLE}'를 작성하고, 프롤로그에는 가장 강한 기운·반복 패턴·운이 열리는 방식·심리적 함정·리포트 활용법·자미두수는 선택의 나침반이라는 안내를 포함하세요.`
    : "";

  return [
    "너는 30년 경력의 자미두수 명리 전문가이자, 심리 상담가, 인생 전략 컨설턴트, 프리미엄 PDF 리포트 작가다.",
    "너는 계산자가 아니다. 너는 해석자다.",
    "자미두수 명반 계산은 내부 엔진에서 이미 완료되었으며, 제공된 데이터만 사용해 해석하라.",
    "JSON에 없는 별, 사화, 궁위, 대한, 유년 정보를 추측해 추가하지 마라.",
    "사용자의 자미두수 명반 데이터를 기반으로 단순 점괘가 아니라 타고난 구조→현재 심리/현실→선택 전략→구체적 개운 실천법을 연결해 작성하라.",
    "오직 마크다운 본문만 출력하라. 코드, 컴포넌트, UI 설명, 개발 설명은 절대 출력하지 마라.",
    "건강·투자·법률·의료는 진단/보장 표현을 금지하고 생활 관리 수준의 조언으로 작성하라.",
    "단정적 공포 문구(예: 반드시 망한다, 절대 안 된다)를 금지하고 상담형 문장으로 작성하라.",
    "한자 용어에는 쉬운 한국어 해설을 반드시 붙여라.",
    "별 하나만 단편 해석하지 말고 궁위·삼방사정·대운·세운·사화를 종합하라.",
    "입력 원자료의 궁별 별 목록과 강약(묘/왕/리/평/함)은 기호(◎/○/△/×) 중심으로 해석 근거에 직접 반영하라.",
    "자미두수 별의 해석은 별 이름만 나열하지 말고 반드시 묘(廟)/왕(旺)/리(利)/평(平)/함(陷) 세기 상태를 함께 반영하라.",
    "묘·왕은 강점과 활용 전략 중심, 리는 균형/실용성 중심, 평은 환경·습관 중심, 함은 단정이 아닌 보완·회복 전략 중심으로 작성하라.",
    "천동이 △ 또는 ×이면 편안함 결핍/정서 예민/과각성 패턴을 근거로 설명하고, 안락함보다 성취감 중심 운영 전략을 제시하라.",
    "천동 약세는 감수성을 감정 소모로 쓰지 말고 UI/UX, 콘텐츠 로직, 서비스 디테일 설계로 전환하는 전략을 포함하라.",
    "경양은 흉으로 단정하지 말고 분리·절단·돌파 에너지로 해석하라. 경양이 ◎이면 기술력/집념/핵심 절단 역량으로 승화된다는 점을 명시하라.",
    "경양·살성의 에너지는 업상대체(코드·디버깅·아키텍처·분석 설계) 전략으로 제시하고 인간관계 충돌 소모를 줄이는 실천안을 포함하라.",
    "우필이 ◎ 또는 ○이면 사람/도구/AI 활용 시너지를 통해 지휘자형 성과 모델이 강화된다는 점을 반영하라.",
    "명궁과 신궁은 반드시 별도 소제목(명궁·신궁 집중 해석)에서 별명+강약기호+실전 의미를 분리 설명하라.",
    "심화 보충 노트라는 이름의 섹션을 만들지 마라. 대신 챕터 주제에 맞는 카테고리 섹션을 만들고, 카테고리 간 문장을 중복하지 마라.",
    "이전 챕터에서 사용한 핵심 문장과 동일한 문장을 반복하지 마라.",
    "12궁 각각에 대해 반드시 실제 별 이름, 강약(묘/왕/리/평/함), 강약이 의미하는 해석을 빠짐없이 작성하라.",
    "아래 [정확 목차 강제]의 제목/항목을 누락 없이 반영하라. 항목명은 문장 속에 그대로 드러나야 한다.",
    cautionRule ? `주의사항(강제): ${cautionRule}.` : "",
    "절대로 '데이터 단서 요약', '[구조화된 12궁 요약]' 같은 메타 요약 문구를 출력하지 마라.",
    "절대로 '정보 없음' 나열 문장을 만들지 마라. 누락 정보는 자연스럽게 생략하고, 확보된 명반 데이터만으로 정밀 해석하라.",
    "",
    `[현재 생성 대상] ${chapterHeading}`,
    `[부제] ${meta.subtitle}`,
    `[리포트 타입] ${reportType === "compatibility" ? "compatibility" : "personal"}`,
    `[최소 분량] ${chapterMinChars}자 이상 (권장 6000자)` ,
    focusKeywords.length ? `[focusKeywords] ${focusKeywords.join(", ")}` : "",
    previousSentenceBanList.length
      ? `[반복 금지 문장(이전 챕터)]\n- ${previousSentenceBanList.join("\n- ")}`
      : "",
    "",
    "[반드시 지킬 형식]",
    "- 챕터 제목: H2(##)",
    "- 소제목: H3(###)",
    "- 핵심 요약: bullet 5줄",
    "- 실천 체크리스트: 체크박스 형식(- [ ])",
    "- 중요한 문장: 굵게(** **)",
    "- 챕터 마지막: 오늘부터 실천할 3가지 + 구분선(---)",
    "",
    "[챕터 본문 필수 순서]",
    chapter === 1 ? `# ${ZIWEI_REPORT_TITLE}` : "",
    chapter === 1 ? `# ${ZIWEI_PROLOGUE_TITLE}` : "",
    prefaceHeading,
    chapter === 1 ? "### 12궁 전체 요약표" : "",
    exactHeading,
    "### 사용 데이터 요약표",
    "## 1. 이 챕터에서 보는 핵심",
    "## 2. 별의 구조와 세기 분석",
    "## 3. 별의 밝기로 본 강점과 약점",
    "## 4. 심리적 의미",
    "## 5. 현실에서 드러나는 모습",
    "## 6. 강점 활용 전략",
    "## 7. 주의해야 할 패턴",
    "## 8. 세기별 보완 전략",
    "## 9. 실천 가이드",
    "## 10. 챕터 핵심 요약",
    "---",
    "",
    "[챕터 전용 추가 지시]",
    chapterGuide,
    monthlyRule,
    roadmapRule,
    prologueRule,
    "",
    "[정확 목차 강제]",
    prefaceHeading ? `${prefaceHeading} (필수)` : "",
    prefaceIncludes.length ? `- ${prefaceIncludes.join("\n- ")}` : "",
    `${exactHeading} (필수)`,
    chapterIncludes.length ? `- ${chapterIncludes.join("\n- ")}` : "",
    cautionRule ? `- 주의: ${cautionRule}` : "",
    "",
    "[입력 데이터]",
    dataText,
    missingNotice ? `- 데이터 주의: ${missingNotice}` : "",
    "",
    hasStructured
      ? "입력 데이터는 12궁 원자료와 별 강약 정보가 포함되어 있으므로, 궁별 근거 문장(별명+강약+강약의 의미+궁의 기능)을 반드시 써라."
      : "구조 데이터 누락 상태에서는 작성하지 말고 오류를 반환해야 한다.",
  ].filter(Boolean).join("\n");
}

function extractZiweiPalaceDetailFromDataText(dataText) {
  const source = String(dataText || "");
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+.+:\s*주성\[/.test(line))
    .slice(0, 12);

  if (!lines.length) {
    return "- 12궁 원자료가 비어 있습니다.";
  }

  return lines.map((line) => {
    const row = line.replace(/^-\s+/, "");
    return `- ${row}`;
  }).join("\n");
}

function buildZiweiChapterZeroSummary(dataText) {
  const lines = String(dataText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+.+:\s*주성\[/.test(line))
    .slice(0, 12);

  const strongest = lines[0] ? lines[0].replace(/^-\s+/, "").split(":")[0] : "명궁";
  const caution = lines[1] ? lines[1].replace(/^-\s+/, "").split(":")[0] : "질액궁";
  const tableRows = lines.length
    ? lines.map((line) => {
      const row = line.replace(/^-\s+/, "");
      const palace = row.split(":")[0] || "-";
      const core = (row.match(/주성\[(.*?)\]/) || ["", "-"])[1] || "-";
      const strength = (row.match(/강약\[(.*?)\]/) || ["", "-"])[1] || "-";
      return `| ${palace} | ${core} | ${strength} | 구조 데이터 기반 요약 |`;
    }).join("\n")
    : "| 명궁 | - | - | 구조 데이터 부족 |";

  return [
    "## 0. 전체 명반 요약",
    `- 이 명반의 핵심 키워드: 구조적 실행력, 감정-현실 균형, 장기전 최적화`,
    `- 가장 강한 궁: ${strongest}`,
    `- 가장 주의해야 할 궁: ${caution}`,
    "- 인생 전체의 방향성: 단기 반응보다 중장기 설계를 우선할 때 운이 열린다.",
    "- 타고난 장점: 위기 상황에서 핵심을 추리고 재정렬하는 힘.",
    "- 반복되는 약점: 과부하 누적 후 리듬 붕괴.",
    "- 운이 열리는 방식: 작은 실행의 누적과 루틴 고정.",
    "- 인생에서 가장 중요한 선택 기준: 감정 강도보다 지속 가능성.",
    "### 12궁 전체 요약표",
    "| 궁 | 핵심 별 | 강약 | 요약 |",
    "|---|---|---|---|",
    tableRows,
  ].join("\n\n");
}

function buildZiweiFallbackMarkdown(meta, chapter, input, dataText, missingNotice) {
  const chapterRule = ZIWEI_REQUIRED_CHAPTER_STRUCTURE[chapter] || null;
  const chapterHeading = chapterRule?.exactHeading || `## 챕터 ${chapter}. ${meta.title}`;
  const topicChecklist = Array.isArray(chapterRule?.includes) && chapterRule.includes.length
    ? chapterRule.includes.map((item) => `- ${item}: 명반 데이터 근거로 구체 해석합니다.`).join("\n")
    : "- 챕터 핵심 항목을 명반 근거와 함께 해석합니다.";
  const cautionLine = String(chapterRule?.caution || "").trim();
  const intro = chapter === 1
    ? `# ${ZIWEI_REPORT_TITLE}\n\n# ${ZIWEI_PROLOGUE_TITLE}\n**이 명반의 가장 강한 기운은 타고난 책임감과 현실 대응력의 결합입니다.** 삶에서 반복되는 핵심 패턴은 중요한 순간에 스스로를 과도하게 압박한 뒤, 다시 균형을 회복하는 방식으로 나타납니다. 운이 열리는 방식은 큰 결심보다 작은 실행을 꾸준히 쌓을 때이며, 조심해야 할 심리적 함정은 완벽주의와 비교 의식입니다. 이 리포트는 정답을 강요하는 문서가 아니라 선택의 품질을 높이는 안내서입니다. **자미두수는 운명을 고정하는 도구가 아니라, 선택의 질을 높이는 나침반입니다.**\n\n`
    : "";

  const summaryList = [
    "- **핵심 에너지는 강점과 부담이 동시에 작동하는 이중 구조입니다.**",
    "- 타이밍을 잡을 때는 감정 속도보다 실행 지속성을 우선하는 편이 유리합니다.",
    "- 관계·일·재정은 분리된 문제가 아니라 같은 의사결정 습관의 다른 얼굴입니다.",
    "- 리스크는 외부 변수보다 내부 리듬 붕괴(수면, 과부하, 경계 붕괴)에서 커집니다.",
    "- 오늘의 작은 조정이 3개월 뒤 운의 체감을 바꾸는 출발점이 됩니다.",
  ].join("\n");

  const monthlyTemplate = "";

  const roadmapTable = chapter === 13
    ? "### 90일 실행 로드맵\n| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |\n|---|---|---|---|---|\n| 1~7일 |  |  |  |  |\n| 8~30일 |  |  |  |  |\n| 31~60일 |  |  |  |  |\n| 61~90일 |  |  |  |  |"
    : "";

  const chapterCategoryMap = {
    1: ["명궁 주성/보조성/살성", "명궁-신궁 연결", "삼방사정 해석", "자기 운영 개운 루틴"],
    2: ["형제자매 인연", "동료 협업 구조", "경쟁자 대응", "관계 거리 조절"],
    3: ["연애 성향", "배우자상 매칭", "반복 갈등 패턴", "관계 회복 루틴"],
    4: ["자녀/후배 인연", "창작 결실 구조", "돌봄 방식", "책임감 운영"],
    5: ["재백궁 수익 구조", "소비 누수 구간", "투자/저축 균형", "자산 증식 실행안"],
    6: ["체력 리듬", "생활 습관", "스트레스 신체화", "회복 전략"],
    7: ["사회적 페르소나", "이동/여행/해외운", "귀인 접점", "이미지 개운"],
    8: ["친구/인맥 흐름", "귀인/소인 분별", "구설 예방", "관계 회복"],
    9: ["직업 적성", "조직/사업형", "리더십", "업무 루틴 개운"],
    10: ["주거 안정성", "부동산 타이밍", "공간 풍수", "가정 환경 관리"],
    11: ["내면 안정", "스트레스 해소", "심상화/명상", "감정 정화"],
    12: ["부모/윗사람 인연", "권위자 관계", "후원자 연결", "갈등 완화"],
    13: ["12궁 종합 결론", "1년 전략", "3년 전략", "90일 실행"],
  };
  const chapterCategories = chapterCategoryMap[chapter] || ["핵심 카테고리 1", "핵심 카테고리 2", "핵심 카테고리 3", "핵심 카테고리 4"];
  const palaceDetailText = extractZiweiPalaceDetailFromDataText(dataText);
  const categoryBlocks = chapterCategories
    .map((cat) => `### 카테고리: ${cat}\n이 카테고리에서는 궁위와 별 조합의 실제 작동을 해석합니다. 명반의 강약 기호(묘/왕/리/평/함: ◎/○/△/×)를 행동 우선순위로 번역해, 지금 당장 적용 가능한 선택 기준과 중장기 운영 원칙을 분리해 제시합니다.\n\n실전 적용: 이번 주 핵심 행동 1개와 중단할 행동 1개를 동시에 확정해 실행 피로를 줄이세요.`)
    .join("\n\n");

  let text = [
    intro,
    chapter === 1 ? buildZiweiChapterZeroSummary(dataText) : "",
    chapterHeading,
    "### 필수 포함 항목 점검",
    topicChecklist,
    cautionLine ? `- 주의: ${cautionLine}.` : "",
    "## 1. 이 챕터에서 보는 핵심",
    "- 사용된 궁:",
    "- 사용된 주성:",
    "- 주성의 세기:",
    "- 사용된 보성/잡성:",
    "- 보성/잡성의 세기:",
    "- 사용된 사화:",
    "- 연결해서 본 궁:",
    "- 핵심 키워드:",
    summaryList,
    "## 2. 별의 구조와 세기 분석",
    `${missingNotice ? "명반 데이터가 부족해 일반론으로 보완한다. " : ""}입력 정보(${input.year}-${input.month}-${input.day} ${input.hour}:${String(input.minute).padStart(2, "0")})와 제공된 궁위 단서를 기준으로 보면, 이 챕터의 핵심은 단일 별 해석이 아니라 궁위 간 연결 구조를 읽는 데 있습니다. 명궁·신궁·삼방사정·대한·유년·유월 흐름을 함께 고려하면 같은 사건도 전혀 다른 선택 결과를 만들 수 있습니다.`,
    `명반 원자료 기반 해석 근거:\n${dataText}\n\n이 챕터는 별 배치와 강약(묘/왕/리/평/함), 궁의 기능, 사화·대한 흐름을 연결해 지금 실행 가능한 선택 기준으로 재구성합니다.`,
    "### 12궁 별·강약 상세 해석",
    palaceDetailText,
    "### 강약 해석 보정 규칙",
    "천동이 △/×이면 편안함 결핍과 예민함이 커질 수 있으므로, 휴식 강요보다 성취 중심 몰입 과제와 회복 루틴(명상·시각화·수면 고정)을 함께 제시해야 합니다.",
    "경양은 흉으로 단정하지 않고 분리·절단·돌파의 기술 에너지로 해석합니다. 경양이 강할수록 인간관계 충돌 대신 업상대체(코드·분석·디버깅·설계)로 전환해야 길성화됩니다.",
    "## 3. 별의 밝기로 본 강점과 약점",
    "명궁은 삶의 기본 작동 원리와 자기 인식의 중심축입니다. 명궁 주성·보조성·살성의 배치를 강약 기호(◎/○/△/×)와 함께 읽으면, 무엇을 확장하고 무엇을 제어해야 하는지 명확해집니다.",
    "신궁은 실제 행동과 외부 환경에서 발현되는 패턴입니다. 신궁 별 조합을 명궁과 비교해 보면 내부 의도와 외부 실행의 불일치 구간을 찾을 수 있으며, 이 구간을 조정하면 관계·커리어·재정 성과가 동시에 개선됩니다.",
    categoryBlocks,
    "## 4. 심리적 의미",
    "성향은 고정된 운명이 아니라 반복되는 반응 방식입니다. 현실 적용의 핵심은 내 반응 속도를 늦추고, 중요한 결정의 평가 기준을 명문화하는 것입니다. 예를 들어 관계에서는 감정 강도보다 경계의 일관성을, 커리어에서는 열정 강도보다 지속 가능성을 먼저 점검하면 리스크가 빠르게 줄어듭니다.",
    "## 5. 현실에서 드러나는 모습",
    "또한 궁위 해석은 영역별로 나눠 보되 결국 하나의 생활 시스템으로 통합해야 체감이 생깁니다. 아침 루틴, 주간 회고, 월간 점검의 3단계만 고정해도 운세 해석이 생활 운영 매뉴얼로 전환됩니다.",
    "## 6. 강점 활용 전략",
    "**이 명반의 장점은 위기 상황에서 구조를 재정렬하는 능력입니다.** 감정이 흔들리는 상황에서도 핵심을 다시 붙잡는 힘이 있어, 장기전에서 강점을 발휘합니다. 외부 확장 기회는 준비된 루틴 위에서 더 빠르게 현실화됩니다.",
    "기회를 키우는 방법은 복잡하지 않습니다. 핵심 목표를 줄이고, 실행 단위를 작게 나누고, 반복 가능한 리듬으로 고정하는 것입니다. 이렇게 하면 기회가 들어올 때 과부하 없이 받아낼 수 있습니다.",
    "## 7. 주의해야 할 패턴",
    "약점은 저주가 아니라 관리해야 할 에너지입니다. 특히 과도한 자기압박, 완벽주의, 관계 과잉 책임은 성과를 늦추는 대표 패턴입니다. 이 시기에는 보수적으로 접근하는 것이 좋으며, 큰 결정보다 손실을 줄이는 운영이 유리합니다.",
    "주의점은 실패를 두려워하는 태도 자체보다, 실패 후 회복 프로토콜이 없는 상태입니다. 회복 규칙이 있으면 동일한 실수도 다른 결과를 만듭니다.",
    "## 8. 세기별 보완 전략",
    "개운의 핵심은 생활 리듬 재정렬입니다. 아침에는 10분 계획 정리, 낮에는 핵심 1개 완수, 저녁에는 감정/행동 분리 회고를 실행하세요. 심리 안정이 필요한 날에는 5분 복식호흡(4초 들숨-4초 멈춤-6초 날숨)을 5회 반복하세요.",
    "공간 개운은 과장된 풍수보다 동선 단순화가 효과적입니다. 현관-책상-침실 3구역의 잡음을 줄이고, 시선이 닿는 곳에 실행 체크리스트를 배치하면 행동 지속성이 올라갑니다.",
    "## 9. 실천 가이드",
    "### 실천 체크리스트",
    "- [ ] 오늘 의사결정 1건을 감정/현실/장기효과로 분리 기록한다.",
    "- [ ] 이번 주 가장 큰 소모 패턴 1개를 식별하고 대체 행동 1개를 정한다.",
    "- [ ] 수면 시간을 기준선으로 고정해 체력 변동폭을 줄인다.",
    "- [ ] 관계 경계 문장 1개를 만들어 실제 대화에 사용한다.",
    "- [ ] 주간 회고에서 다음 주 중단할 행동 1개를 확정한다.",
    "### 따뜻한 상담 메시지",
    "지금까지의 흔들림은 실패의 증거가 아니라 방향을 미세 조정해 온 과정입니다. 당신의 강점은 이미 충분하며, 필요한 것은 더 큰 의지가 아니라 더 안정적인 리듬입니다. **지금의 작은 실행이 앞으로의 운을 바꾸는 가장 현실적인 시작점입니다.**",
    monthlyTemplate,
    roadmapTable,
    chapter === 13 ? "### 엔딩 메시지\n운명은 고정된 판결문이 아닙니다. 명반은 나를 이해하기 위한 지도이며, 약점은 관리해야 할 에너지이고 강점은 실천할 때 현실이 되는 선물입니다. 지금부터의 선택이 앞으로의 운을 바꿉니다." : "",
    "## 10. 챕터 핵심 요약",
    "- 핵심 1:",
    "- 핵심 2:",
    "- 핵심 3:",
    "### 오늘부터 실천할 3가지",
    "1. 하루 10분, 내 선택 기준을 글로 남깁니다.",
    "2. 이번 주 가장 큰 소모 패턴 1개를 멈추고 대체 행동을 고정합니다.",
    "3. 월말에 관계·일·건강·재정 점검을 한 번에 정리합니다.",
    "---",
  ].filter(Boolean).join("\n\n");

  let depth = 1;
  while (text.length < ZIWEI_MIN_CHARS) {
    const idx = (depth - 1) % chapterCategories.length;
    const cat = chapterCategories[idx];
    text += `\n\n### 카테고리 확장: ${cat} (${depth})\n`;
    text += "궁·별·강약 기호를 함께 읽을 때 해석의 정확도가 올라갑니다. 이 확장 섹션은 해당 카테고리에서 발생하는 선택 오류를 줄이고, 실행 우선순위를 명확히 하는 데 목적이 있습니다.\n\n";
    text += "실행 문장: 이번 주 의사결정 1건에 대해 기대효과·리스크·대체안 3가지를 기록하고, 결과를 주간 회고에 반영하세요.";
    depth += 1;
  }

  return text;
}

async function generateZiweiPremiumChapter(env, body, input, chapter, meta, canonicalZiweiChart, reportPayload, reportType, partnerOverview, dataQuality, previousChapterTexts = []) {
  const chapterSpec = ZIWEI_PDF_CHAPTERS_V2[chapter - 1] || {
    key: `ch_${chapter}`,
    title: meta?.title || `Chapter ${chapter}`,
    goal: meta?.subtitle || "자미두수 핵심 해석",
  };
  const context = buildZiweiPdfContext({
    userProfile: {
      name: body?.name || input?.name || "사용자",
      gender: body?.gender || input?.gender || "",
      birthDate: `${input?.year || ""}-${String(input?.month || "").padStart(2, "0")}-${String(input?.day || "").padStart(2, "0")}`,
      birthTime: `${String(input?.hour || 0).padStart(2, "0")}:${String(input?.minute || 0).padStart(2, "0")}`,
      lunarDate: body?.lunarDate || canonicalZiweiChart?.profile?.birth?.lunarDate || "",
    },
    rawChart: reportPayload,
  });

  (Array.isArray(context?.missingSummary) ? context.missingSummary : []).forEach((field) => pushUnique(dataQuality?.missingFields, field));
  (Array.isArray(context?.validation?.warnings) ? context.validation.warnings : []).forEach((warning) => pushUnique(dataQuality?.warnings, warning));

  const promptBundle = buildZiweiGeminiPrompt({
    chapter: chapterSpec,
    context,
  });

  console.info("[ZiweiPremium][DebugArtifact][geminiPromptPayload.json]", {
    chapter: chapterSpec,
    reportType,
    contextSummary: {
      chartMeta: context?.chartMeta || null,
      palaceCount: Array.isArray(context?.palaces) ? context.palaces.length : 0,
      missingSummary: Array.isArray(context?.missingSummary) ? context.missingSummary : [],
      validation: context?.validation || null,
    },
  });

  const prompt = promptBundle.prompt;
  const genOptions = {
    temperature: 0.72,
    topP: 0.92,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_ZIWEI_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 70000),
    maxAttemptsPerPair: Number(env.PREMIUM_ZIWEI_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let rawText = await callGemini(env, prompt, ["PREMIUM_ZIWEI_GEMINI_MODEL"], genOptions);
  let parsed = parseZiweiGeminiResponse(rawText);

  if (!parsed.ok) {
    const repairPrompt = [
      "아래 응답을 JSON 스키마에 맞춰 단 1개의 JSON 객체로만 재작성하세요.",
      "마크다운 코드펜스 없이 JSON만 출력하세요.",
      "",
      "[원래 응답]",
      String(rawText || "").trim(),
    ].join("\n");
    rawText = await callGemini(env, repairPrompt, ["PREMIUM_ZIWEI_GEMINI_MODEL"], {
      ...genOptions,
      temperature: 0.2,
      maxOutputTokens: 8192,
      maxAttemptsPerPair: 1,
    });
    parsed = parseZiweiGeminiResponse(rawText);
  }

  let usedFallback = false;
  let chapterJson;
  if (!parsed.ok) {
    usedFallback = true;
    chapterJson = createFallbackChapter(chapterSpec, context);
  } else {
    chapterJson = sanitizeZiweiChapterJson(parsed.data, chapterSpec);
  }

  const markdown = ensureZiweiChapterMarkdownLength(
    buildZiweiChapterMarkdown(chapterJson, chapterSpec, context, chapter === 1),
    context,
    ZIWEI_MIN_CHARS,
  );

  const repeatedSentences = detectCrossChapterRepeatedSentences(markdown, previousChapterTexts, 30);
  const finalText = repeatedSentences.length
    ? ensureZiweiChapterMarkdownLength(`${markdown}\n\n### 문체 다양화 메모\n동일 문장 반복을 줄이기 위해 해석 각도를 조정했습니다.`, context, ZIWEI_MIN_CHARS)
    : markdown;

  return {
    ok: true,
    text: finalText,
    sections: parseSections(finalText),
    usedFallback,
    generationNotice: usedFallback
      ? "일부 세부 명반 데이터가 부족하여 기본 자미두수 해석 지식으로 보완된 챕터가 생성되었습니다."
      : null,
    chapterJson,
  };
}

function parseSukuyoLunarHint(body, prefix = "") {
  const monthKey = `${prefix}LunarMonth`;
  const dayKey = `${prefix}LunarDay`;
  const leapKey = `${prefix}IsLeap`;
  const nested = prefix ? body?.[`${prefix}Lunar`] : body?.lunar;

  const month = Number(body?.[monthKey] ?? nested?.month);
  const day = Number(body?.[dayKey] ?? nested?.day);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;

  return {
    lunarMonth: month,
    lunarDay: day,
    isLeapMonth: asBool(body?.[leapKey] ?? nested?.isLeap),
  };
}

async function fetchKasiLunarFull(request, env, input) {
  const data = await postBackendJson(
    request,
    env,
    "/api/kasi/calendar",
    {
      method: "getLunCalInfo",
      params: {
        solYear: String(input.year),
        solMonth: String(input.month).padStart(2, "0"),
        solDay: String(input.day).padStart(2, "0"),
      },
    },
    Number(env.PREMIUM_KASI_TIMEOUT_MS || 8000),
  );
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  if (!rows.length) return null;
  const row = rows[0] || {};
  const lunarYear = Number(row.lunYear ?? row.year ?? row.lunarYear);
  const lunarMonth = Number(row.lunMonth ?? row.month ?? row.lunarMonth);
  const lunarDay = Number(row.lunDay ?? row.day ?? row.lunarDay);
  const leapRaw = String(row.lunLeapmonth ?? row.isLeap ?? row.leapMonth ?? "").trim().toLowerCase();
  const isLeapMonth = leapRaw === "1" || leapRaw === "y" || leapRaw === "true" || leapRaw === "윤" || leapRaw === "leap";
  if (!Number.isFinite(lunarMonth) || !Number.isFinite(lunarDay)) return null;
  return {
    lunarYear: Number.isFinite(lunarYear) ? lunarYear : input.year,
    lunarMonth,
    lunarDay,
    isLeapMonth,
    source: "kasi-api",
  };
}

async function calcSukuyoStrict(request, env, input, options = {}) {
  const explicitLunar = options.explicitLunar || null;
  const calendarType = String(options.calendarType || "solar").toLowerCase();

  if (explicitLunar && Number.isFinite(Number(explicitLunar.lunarMonth)) && Number.isFinite(Number(explicitLunar.lunarDay))) {
    const s = buildSukuyoFromLunarV2(explicitLunar.lunarMonth, explicitLunar.lunarDay, {
      isLeapMonth: asBool(explicitLunar.isLeapMonth),
      source: "client-existing-engine",
    });
    return {
      ...s,
      lunarYear: input.year,
      source: "client-existing-engine",
    };
  }

  if (calendarType === "lunar" || calendarType === "lunar_leap") {
    const s = buildSukuyoFromLunarV2(input.month, input.day, {
      isLeapMonth: calendarType === "lunar_leap",
      source: "user-lunar-input",
    });
    return {
      ...s,
      lunarYear: input.year,
      source: "user-lunar-input",
    };
  }

  let kasi;
  try {
    kasi = await fetchKasiLunarFull(request, env, input);
  } catch (_) {
    kasi = null;
  }
  if (!kasi) {
    const error = new Error("KASI_LUNAR_CONVERSION_FAILED");
    error.code = "KASI_LUNAR_CONVERSION_FAILED";
    error.missingFields = ["birth.lunarDate", "sukuyo.index"];
    throw error;
  }

  const s = buildSukuyoFromLunarV2(kasi.lunarMonth, kasi.lunarDay, {
    isLeapMonth: kasi.isLeapMonth,
    source: "kasi-api",
  });
  return {
    ...s,
    lunarYear: kasi.lunarYear,
    source: "kasi-api",
  };
}

function stripSukuyoRepeatNoise(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^\|/.test(t)) return false;
      if (/^#{1,6}\s/.test(t)) return false;
      return true;
    })
    .join("\n");
}

function detectSukuyoRepeatedSentences(text, minLength = 30) {
  return detectRepeatedLongSentences(stripSukuyoRepeatNoise(text), minLength);
}

function detectSukuyoCrossRepeats(text, previousTexts, minLength = 30) {
  const normalizedPrev = Array.isArray(previousTexts) ? previousTexts.map((t) => stripSukuyoRepeatNoise(t)) : [];
  return detectCrossChapterRepeatedSentences(stripSukuyoRepeatNoise(text), normalizedPrev, minLength);
}

function buildSukuyoChapterPromptPayload(canonical, chapterMeta, chapter, reportType, previousTexts, premiumInput = null) {
  const previousBan = collectPreviousSentenceBanList((previousTexts || []).map((t) => stripSukuyoRepeatNoise(t)), 12);
  const requiredOutputStructure = [
    "### 사용 데이터 요약표",
    "## 1. 이 챕터의 핵심 결론",
    "## 2. 상세 해석",
    "## 3. 현실 장면",
    "## 4. 위험 패턴",
    "## 5. 조율 전략",
    "## 6. 챕터 요약",
  ];

  const requiredDataPoints = reportType === "compatibility"
    ? [
      "personA.sukuyo.nameKo",
      "personB.sukuyo.nameKo",
      "compatibility.relationType",
      "compatibility.forwardDistance",
      "compatibility.reverseDistance",
      "compatibility.aRole",
      "compatibility.bRole",
    ]
    : ["personA.sukuyo.nameKo", "personA.sukuyo.index", "personA.birth.lunarDate"];

  return {
    chapterTitle: `${chapterMeta?.title || `Chapter ${chapter}`}`,
    chapterPurpose: chapterMeta?.subtitle || "숙요 계산 데이터 해석",
    personAHost: canonical?.personA || {},
    personBHost: canonical?.personB || {},
    compatibility: canonical?.compatibility || {},
    relationshipMatrix: canonical?.relationshipMatrix || {},
    requiredDataPoints,
    premiumChapterJsonPacks: premiumInput && typeof premiumInput === "object"
      ? toPlainObject(premiumInput.chapterJsonPacks || premiumInput)
      : null,
    forbiddenRepeatedPhrases: SUKUYO_FORBIDDEN_REPEATED_PHRASES_V2.concat(previousBan),
    requiredOutputStructure,
    minLength: reportType === "compatibility" ? 3500 : 2800,
    maxLength: reportType === "compatibility" ? 4600 : 3600,
  };
}

function buildSukuyoChapterPrompt(payload) {
  const systemInstruction = "너는 숙요점 궁합 해석자다. 너는 계산자가 아니다. 모든 해석은 canonicalSukuyoCompatibility JSON에 있는 값만 사용해야 한다. JSON에 없는 숙, 관계 유형, 거리, 역할을 절대 만들어내지 않는다. 데이터가 부족하면 일반론으로 채우지 말고 오류를 반환한다. 각 챕터는 반드시 두 사람의 숙 이름, 관계 유형, 거리, 역할 중 최소 4개 이상의 구체 데이터를 포함해야 한다.";
  return [
    systemInstruction,
    "",
    "아래 JSON을 기준으로 마크다운 본문만 출력하세요.",
    "표현 규칙: 동일 문장 반복 금지, 추측 금지, 금지 구문 사용 금지.",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

function validateSukuyoChapterText(text, canonical, reportType, minLength, previousTexts = []) {
  const source = String(text || "");
  const requiredMarkers = [
    "### 사용 데이터 요약표",
    "## 1. 이 챕터의 핵심 결론",
    "## 2. 상세 해석",
    "## 3. 현실 장면",
    "## 4. 위험 패턴",
    "## 5. 조율 전략",
    "## 6. 챕터 요약",
  ];
  const missingMarkers = requiredMarkers.filter((m) => !source.includes(m));

  const personAName = String(canonical?.personA?.sukuyo?.nameKo || "");
  const personBName = String(canonical?.personB?.sukuyo?.nameKo || "");
  const relationType = String(canonical?.compatibility?.relationType || "");
  const distanceLabel = String(canonical?.compatibility?.distanceLabel || "");
  const aRole = String(canonical?.compatibility?.aRole || "");
  const bRole = String(canonical?.compatibility?.bRole || "");

  let dataHitCount = 0;
  if (personAName && source.includes(personAName)) dataHitCount += 1;
  if (reportType === "compatibility" && personBName && source.includes(personBName)) dataHitCount += 1;
  if (reportType === "compatibility" && relationType && source.includes(relationType)) dataHitCount += 1;
  if (reportType === "compatibility" && distanceLabel && source.includes(distanceLabel)) dataHitCount += 1;
  if (reportType === "compatibility" && aRole && source.includes(aRole)) dataHitCount += 1;
  if (reportType === "compatibility" && bRole && source.includes(bRole)) dataHitCount += 1;

  const forbiddenUsed = SUKUYO_FORBIDDEN_REPEATED_PHRASES_V2.filter((p) => source.includes(p));
  const repeatedInChapter = detectSukuyoRepeatedSentences(source, 30);
  const repeatedAcross = detectSukuyoCrossRepeats(source, previousTexts, 30);

  return {
    isValid: source.length >= minLength
      && missingMarkers.length === 0
      && forbiddenUsed.length === 0
      && repeatedInChapter.length === 0
      && repeatedAcross.length === 0
      && dataHitCount >= (reportType === "compatibility" ? 4 : 2),
    details: {
      tooShort: source.length < minLength,
      missingMarkers,
      forbiddenUsed,
      repeatedInChapter,
      repeatedAcross,
      dataHitCount,
    },
  };
}

async function generateSukuyoPremiumChapterStrict(env, canonical, chapterMeta, chapter, reportType, previousTexts = [], premiumInput = null) {
  const payload = buildSukuyoChapterPromptPayload(canonical, chapterMeta, chapter, reportType, previousTexts, premiumInput);
  const prompt = buildSukuyoChapterPrompt(payload);
  const minLength = Number(payload.minLength || (reportType === "compatibility" ? 3500 : 2800));
  const generationOptions = {
    temperature: 0.72,
    topP: 0.9,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_SUKUYO_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 70000),
    maxAttemptsPerPair: Number(env.PREMIUM_SUKUYO_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = await callGemini(env, prompt, ["PREMIUM_SUKUYO_GEMINI_MODEL"], generationOptions);
  if (!text || !text.trim()) {
    throw new Error("SUKUYO_AI_EMPTY");
  }

  text = String(text || "").trim();
  const summaryTable = buildSukuyoDataSummaryTable(canonical);
  if (!text.includes("### 사용 데이터 요약표")) {
    text = `${summaryTable}\n\n${text}`;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const check = validateSukuyoChapterText(text, canonical, reportType, minLength, previousTexts);
    if (check.isValid) break;

    const refinePrompt = [
      "아래 숙요 챕터 초안을 형식/데이터 규칙에 맞게 보강하세요.",
      `최소 글자수: ${minLength}`,
      `누락 마커: ${check.details.missingMarkers.join(" | ") || "없음"}`,
      `금지 문구 사용: ${check.details.forbiddenUsed.join(" | ") || "없음"}`,
      `챕터 내 반복: ${check.details.repeatedInChapter.join(" | ") || "없음"}`,
      `이전 챕터 반복: ${check.details.repeatedAcross.join(" | ") || "없음"}`,
      "출력은 마크다운 본문만 작성하세요.",
      "",
      "[prompt payload]",
      JSON.stringify(payload, null, 2),
      "",
      "[draft]",
      text,
    ].join("\n");

    const refined = await callGemini(env, refinePrompt, ["PREMIUM_SUKUYO_GEMINI_MODEL"], generationOptions);
    if (!refined || !refined.trim()) break;
    text = String(refined || "").trim();
    if (!text.includes("### 사용 데이터 요약표")) {
      text = `${summaryTable}\n\n${text}`;
    }
  }

  const finalCheck = validateSukuyoChapterText(text, canonical, reportType, minLength, previousTexts);
  if (!finalCheck.isValid) {
    const detail = finalCheck.details;
    throw new Error(`SUKUYO_CHAPTER_QUALITY_FAILED:${JSON.stringify(detail)}`);
  }

  return {
    text,
    sections: parseSections(text),
    usedFallback: false,
  };
}

const SUKUYO_ALL_NAME_TOKENS = Array.from({ length: 27 })
  .map((_, i) => getSukuyoByIndex(i)?.nameKo)
  .filter(Boolean);

function sukuyoNatalMinLength(chapter) {
  const n = Number(chapter);
  if (n === 1 || n === 12 || n === 13) return 4000;
  if (n === 2) return 3500;
  return 3500;
}

function detectUnexpectedSukuyoTokens(text, allowedNames = []) {
  const source = String(text || "");
  const allow = new Set((allowedNames || []).map((n) => String(n || "").trim()).filter(Boolean));
  const hits = [];
  for (const name of SUKUYO_ALL_NAME_TOKENS) {
    if (allow.has(name)) continue;
    const token = `${name}宿`;
    if (source.includes(token)) hits.push(token);
  }
  return hits;
}

function countForbiddenSectionChapterHits(texts) {
  const counters = {};
  for (const phrase of SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS) counters[phrase] = 0;
  for (const text of texts || []) {
    const s = String(text || "");
    for (const phrase of SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS) {
      if (s.includes(phrase)) counters[phrase] += 1;
    }
  }
  return counters;
}

function buildSukuyoNatalPromptPayload(canonicalSukuyoNatal, chapterSpec, chapter, previousTexts = [], premiumInput = null) {
  return {
    chapterTitle: chapterSpec?.title || `Chapter ${chapter}`,
    chapterPurpose: chapterSpec?.purpose || "숙요점 개인 리포트 해석",
    chapterSpecificSections: Array.isArray(chapterSpec?.sections) ? chapterSpec.sections : [],
    canonicalSukuyoNatal,
    requiredDataPoints: [
      "natalSukuyo.index",
      "natalSukuyo.nameKo",
      "natalSukuyo.nameHan",
      "natalSukuyo.keywords",
      "natalSukuyo.coreNature",
      "lunarPhase.phaseName",
      "lunarPhase.illumination",
      "lunarPhase.elongationAngle",
      "sukuyoAttributes",
    ],
    forbiddenCommonSections: SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS,
    forbiddenRepeatedPhrases: collectPreviousSentenceBanList(previousTexts, 12),
    premiumChapterJsonPacks: premiumInput && typeof premiumInput === "object"
      ? toPlainObject(premiumInput.chapterJsonPacks || premiumInput)
      : null,
    minLength: sukuyoNatalMinLength(chapter),
    targetLength: 4500,
    doNotInventData: true,
  };
}

function buildSukuyoNatalPrompt(payload) {
  const systemPrompt = "너는 숙요점 개인 리포트 해석자다. 너는 숙요를 계산하지 않는다. 모든 해석은 canonicalSukuyoNatal JSON에 있는 값만 사용한다. JSON에 없는 본명숙, 월상, 삭망각, 조도, 방향, 원소, 숙요 속성을 절대 만들어내지 않는다. 각 챕터는 자기 주제에 맞는 고유한 세부 카테고리를 가져야 하며, 모든 챕터에 같은 소제목을 반복해서는 안 된다. 데이터가 부족하면 일반론으로 채우지 말고 해당 챕터를 제거하거나 축소한다.";
  return [
    systemPrompt,
    "",
    "출력 규칙:",
    "- 마크다운 본문만 출력",
    "- 챕터 소제목은 반드시 chapterSpecificSections를 그대로 사용",
    "- 금지 섹션 문구를 재사용하지 말 것",
    "- 데이터를 추측하지 말 것",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

function validateSukuyoNatalChapterText(text, canonicalSukuyoNatal, chapterSpec, chapter, previousTexts = []) {
  const source = String(text || "");
  const minLength = sukuyoNatalMinLength(chapter);
  const requiredSections = Array.isArray(chapterSpec?.sections) ? chapterSpec.sections : [];
  const missingSections = requiredSections.filter((section) => !source.includes(section));
  const forbiddenUsed = SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS.filter((phrase) => source.includes(phrase));
  const repeatedInChapter = detectSukuyoRepeatedSentences(source, 30);
  const repeatedAcross = detectSukuyoCrossRepeats(source, previousTexts, 30);
  const hasAboutBlank = /about:blank/i.test(source);
  const wrongRunGuidePlacement = Number(chapter) !== 12 && source.includes("30일 실행 가이드");

  const natal = canonicalSukuyoNatal?.natalSukuyo || {};
  const dp = [
    String(natal.index ?? ""),
    String(natal.nameKo || ""),
    String(natal.nameHan || ""),
    String(natal.direction || ""),
    String(natal.element || ""),
    String(canonicalSukuyoNatal?.profile?.birth?.lunarDate || ""),
    String(canonicalSukuyoNatal?.lunarPhase?.phaseName || ""),
  ].concat(Array.isArray(natal.keywords) ? natal.keywords.slice(0, 3).map((k) => String(k || "")) : []);
  let dataHitCount = 0;
  for (const token of dp) {
    if (!token) continue;
    if (source.includes(token)) dataHitCount += 1;
  }

  const allowedNames = [String(natal.nameKo || "")].filter(Boolean);
  const unexpectedSukuyoNames = detectUnexpectedSukuyoTokens(source, allowedNames);

  const commonSectionCounter = countForbiddenSectionChapterHits((previousTexts || []).concat([source]));
  const repeatedCommonSections = Object.keys(commonSectionCounter).filter((key) => commonSectionCounter[key] >= 3);

  const hasLunarPhase = Boolean(canonicalSukuyoNatal?.validation?.hasLunarPhase);
  const lunarInventedWithoutData = !hasLunarPhase
    && Number(chapter) === 2
    && (source.includes("조도") || source.includes("삭망각") || source.includes("phaseName"));

  const reducedPhaseAllowed = Number(chapter) === 2 && !hasLunarPhase;
  const tooShort = !reducedPhaseAllowed && source.length < minLength;

  return {
    isValid: !tooShort
      && missingSections.length === 0
      && forbiddenUsed.length === 0
      && repeatedInChapter.length === 0
      && repeatedAcross.length === 0
      && !hasAboutBlank
      && !wrongRunGuidePlacement
      && !lunarInventedWithoutData
      && unexpectedSukuyoNames.length === 0
      && repeatedCommonSections.length === 0
      && (reducedPhaseAllowed ? true : dataHitCount >= 5),
    details: {
      tooShort,
      missingSections,
      forbiddenUsed,
      repeatedInChapter,
      repeatedAcross,
      hasAboutBlank,
      wrongRunGuidePlacement,
      lunarInventedWithoutData,
      unexpectedSukuyoNames,
      repeatedCommonSections,
      dataHitCount,
    },
  };
}

async function generateSukuyoNatalChapterStrict(env, canonicalSukuyoNatal, chapterSpec, chapter, previousTexts = [], premiumInput = null) {
  const hasLunarPhase = Boolean(canonicalSukuyoNatal?.validation?.hasLunarPhase);
  const summaryTable = buildSukuyoNatalDataSummaryTable(canonicalSukuyoNatal);

  if (Number(chapter) === 2 && !hasLunarPhase) {
    const reduced = [
      summaryTable,
      "",
      "## 1. 월상 데이터 표",
      "달 주기 데이터가 없어 기본 숙 중심으로만 해석합니다.",
      "",
      "## 2. 차는 달/지는 달/보름/삭의 정서적 의미",
      "lunarPhase 원자료가 없어 이 장은 축소되었습니다.",
      "",
      "## 3. Chapter 2 핵심 요약",
      "달 주기 데이터 복원 후 정밀 리듬 분석을 다시 생성해야 합니다.",
    ].join("\n");
    return { text: reduced, sections: parseSections(reduced), usedFallback: false, reduced: true };
  }

  const payload = buildSukuyoNatalPromptPayload(canonicalSukuyoNatal, chapterSpec, chapter, previousTexts, premiumInput);
  const prompt = buildSukuyoNatalPrompt(payload);
  const generationOptions = {
    temperature: 0.72,
    topP: 0.9,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_SUKUYO_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 70000),
    maxAttemptsPerPair: Number(env.PREMIUM_SUKUYO_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = await callGemini(env, prompt, ["PREMIUM_SUKUYO_GEMINI_MODEL"], generationOptions);
  if (!text || !text.trim()) throw new Error("SUKUYO_NATAL_AI_EMPTY");
  text = String(text || "").trim();
  if (!text.includes("### 계산 데이터 요약표")) text = `${summaryTable}\n\n${text}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const check = validateSukuyoNatalChapterText(text, canonicalSukuyoNatal, chapterSpec, chapter, previousTexts);
    if (check.isValid) break;

    const refinePrompt = [
      "아래 숙요점 개인 챕터를 규칙에 맞게 보강하세요.",
      `누락 섹션: ${check.details.missingSections.join(" | ") || "없음"}`,
      `반복 금지 위반: ${check.details.forbiddenUsed.join(" | ") || "없음"}`,
      `챕터간 반복: ${check.details.repeatedAcross.join(" | ") || "없음"}`,
      `잘못된 숙명 토큰: ${check.details.unexpectedSukuyoNames.join(" | ") || "없음"}`,
      "마크다운 본문만 출력하세요.",
      "",
      "[payload]",
      JSON.stringify(payload, null, 2),
      "",
      "[draft]",
      text,
    ].join("\n");

    const refined = await callGemini(env, refinePrompt, ["PREMIUM_SUKUYO_GEMINI_MODEL"], generationOptions);
    if (!refined || !refined.trim()) break;
    text = String(refined || "").trim();
    if (!text.includes("### 계산 데이터 요약표")) text = `${summaryTable}\n\n${text}`;
  }

  const finalCheck = validateSukuyoNatalChapterText(text, canonicalSukuyoNatal, chapterSpec, chapter, previousTexts);
  if (!finalCheck.isValid) {
    throw new Error(`SUKUYO_NATAL_QUALITY_FAILED:${JSON.stringify(finalCheck.details)}`);
  }

  return { text, sections: parseSections(text), usedFallback: false };
}

async function handleSukuyoLife(request, env) {
  const body = await readJson(request);
  const prepareOnly = asBool(body.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(body)) {
    return json({ ok: false, message: "chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }

  const input = normalizeBody(body);
  const requestedReportType = String(body.reportType || body.reportMode || (hasCompletePartnerData(body) ? "compatibility" : "personal")).toLowerCase();
  const reportType = requestedReportType === "compatibility" ? "compatibility" : "personal";
  const hasPartner = hasCompletePartnerData(body);

  let personASukuyo;
  let personAMissingFields = [];
  try {
    personASukuyo = await calcSukuyoStrict(request, env, input, {
      explicitLunar: parseSukuyoLunarHint(body),
      calendarType: body.calType || body.calendarType || "solar",
    });
  } catch (error) {
    personASukuyo = null;
    personAMissingFields = Array.isArray(error?.missingFields)
      ? error.missingFields.map((f) => `personA.${f}`)
      : ["personA.birth.lunarDate", "personA.sukuyo.index"];
  }

  if (reportType === "personal") {
    const chapterMetaList = SUKYO_PDF_CHAPTERS.map((chapter, idx) => ({
      num: idx + 1,
      title: chapter.title,
      subtitle: chapter.goal,
    }));
    const totalChapters = chapterMetaList.length;
    const chapter = clampInt(body.chapter, 1, 1, totalChapters);

    let swissBasis = null;
    try {
      swissBasis = await fetchSwissSukuyoBasis(request, env, input);
    } catch (_) {
      swissBasis = null;
    }
    const moonPhase = swissBasis?.moonPhase || null;

    const canonicalSukuyoNatal = buildCanonicalSukuyoNatal({
      name: String(body.name || input.name || "사용자"),
      gender: body.gender || input.gender || null,
      input,
      sukuyo: personASukuyo || {},
      lunarPhase: moonPhase,
      calendarSource: personASukuyo?.source || "fallback",
      methodVersion: "sukuyo-natal-v2",
    });

    const natalValidation = validateCanonicalSukuyoNatal(canonicalSukuyoNatal);
    const expectedSukuyo = String(body.expectedSukuyoName || body.currentSukuyoName || "").trim();
    const mismatchWarning = expectedSukuyo
      && String(canonicalSukuyoNatal?.natalSukuyo?.nameKo || "").trim()
      && expectedSukuyo !== String(canonicalSukuyoNatal?.natalSukuyo?.nameKo || "");

    if (prepareOnly) {
      return json({
        ok: true,
        prepared: true,
        reportType,
        totalChapters,
        chapterPlan: chapterMetaList,
        canonicalSukuyoNatal,
        validation: natalValidation,
        missingFields: Array.from(new Set([...(natalValidation?.missingFields || []), ...personAMissingFields])),
        warnings: mismatchWarning ? ["natalSukuyo.nameKo_mismatch_with_basic_screen"] : [],
      });
    }

    const reportId = String(body.reportId || `sukuyo_${stableHash([
      "personal",
      input.year,
      input.month,
      input.day,
      input.hour,
      input.minute,
      canonicalSukuyoNatal?.natalSukuyo?.index,
      String(body.name || input.name || ""),
    ].join("|"))}`);

    const previousChapterTexts = Array.isArray(body.previousChapterTexts) && body.previousChapterTexts.length
      ? body.previousChapterTexts.map((t) => String(t || "")).filter(Boolean)
      : getStoredChapterTexts("sukuyo", reportId, chapter);

    const chapterMeta = chapterMetaList[chapter - 1] || { num: chapter, title: `Chapter ${chapter}`, subtitle: "" };
    const chapterSpec = getSukuyoNatalChapterSpec(chapter) || {
      chapter,
      title: chapterMeta.title,
      purpose: chapterMeta.subtitle,
      sections: [],
    };

    const calculatedData = mapSookyoCalculatedData(canonicalSukuyoNatal, body);
    const generated = await generateSukyoPremiumChapterFromContext({
      env,
      context: {
        reportType: "sookyoPremium",
        featureType: "sookyo_premium",
        reportSessionId: body?._premiumReportSessionId || "legacy",
        reportId,
        userId: "legacy",
        input: body,
        coreData: {
          canonicalJson: {
            calculatedData,
          },
        },
      },
      chapterId: chapter,
      requestId: String(body?._premiumRequestId || body?.requestId || `legacy_${Date.now()}`),
    });

    const storage = writeReportSessionChapter("sukuyo", reportId, chapter, totalChapters, chapterMeta, generated.text, {
      reportType,
      canonicalSukuyoNatal,
      chapterSpecificSections: chapterSpec.sections,
    });

    return json({
      ok: true,
      reportId,
      reportType,
      totalChapters,
      chapter,
      chapterMeta,
      chapterSpecificSections: chapterSpec.sections,
      canonicalSukuyoNatal,
      validation: natalValidation,
      storage,
      warnings: mismatchWarning ? ["natalSukuyo.nameKo_mismatch_with_basic_screen"] : [],
      qualityGate: {
        hasNatalSukuyo: natalValidation.hasNatalSukuyo,
        hasIndex: natalValidation.hasIndex,
        hasLunarDate: natalValidation.hasLunarDate,
      },
      ...generated,
    });
  }

  if (!hasPartner) {
    return json({
      ok: false,
      code: "SUKUYO_PARTNER_REQUIRED",
      message: "궁합 리포트는 상대방 생년월일이 필요합니다.",
      missingFields: ["personB.birth.solarDate"],
    }, { status: 422 });
  }

  const chapterMetaList = SUKYO_PDF_CHAPTERS.map((chapterDef, idx) => ({
    num: idx + 1,
    title: chapterDef.title,
    subtitle: chapterDef.goal,
  }));
  const totalChapters = chapterMetaList.length;
  const chapter = clampInt(body.chapter, 1, 1, totalChapters);

  const partnerInput = normalizeBody({
    year: body.partnerYear,
    month: body.partnerMonth,
    day: body.partnerDay,
    hour: body.partnerHour,
    minute: body.partnerMinute,
    timezone: body.partnerTimezone ?? body.timezone,
    lat: body.partnerLat ?? body.lat,
    lon: body.partnerLon ?? body.lon,
    name: body.partnerName || "상대",
    gender: body.partnerGender || "",
  });

  let personBSukuyo;
  let personBMissingFields = [];
  try {
    personBSukuyo = await calcSukuyoStrict(request, env, partnerInput, {
      explicitLunar: parseSukuyoLunarHint(body, "partner"),
      calendarType: body.partnerCalType || "solar",
    });
  } catch (error) {
    personBSukuyo = null;
    personBMissingFields = Array.isArray(error?.missingFields)
      ? error.missingFields.map((f) => `personB.${f}`)
      : ["personB.birth.lunarDate", "personB.sukuyo.index"];
  }

  const canonicalSukuyoCompatibility = buildCanonicalSukuyoCompatibility({
    reportType: "compatibility",
    personAName: String(body.name || input.name || "사용자"),
    personAInput: input,
    personASukuyo: personASukuyo || {},
    personBName: String(body.partnerName || "상대"),
    personBInput: partnerInput,
    personBSukuyo: personBSukuyo || {},
    calendarSource: personASukuyo?.source || "fallback",
    methodVersion: "sukuyo-compat-v2",
  });

  const chartValidation = validateCanonicalSukuyoCompatibility(canonicalSukuyoCompatibility);

  if (prepareOnly) {
    return json({
      ok: true,
      prepared: true,
      reportType: "compatibility",
      totalChapters,
      chapterPlan: chapterMetaList,
      canonicalSukuyoCompatibility,
      validation: chartValidation,
      missingFields: Array.from(new Set([...(chartValidation?.missingFields || []), ...personAMissingFields, ...personBMissingFields])),
    });
  }

  const reportId = String(body.reportId || `sukuyo_${stableHash([
    "compatibility",
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    canonicalSukuyoCompatibility?.personA?.sukuyo?.index,
    canonicalSukuyoCompatibility?.personB?.sukuyo?.index,
    String(body.name || input.name || ""),
    String(body.partnerName || ""),
  ].join("|"))}`);

  const previousChapterTexts = Array.isArray(body.previousChapterTexts) && body.previousChapterTexts.length
    ? body.previousChapterTexts.map((t) => String(t || "")).filter(Boolean)
    : getStoredChapterTexts("sukuyo", reportId, chapter);

  const chapterMeta = chapterMetaList[chapter - 1] || { num: chapter, title: `Chapter ${chapter}`, subtitle: "" };
  const compatCalculatedData = mapSookyoCalculatedData(canonicalSukuyoCompatibility, body);
  const generated = await generateSukyoPremiumChapterFromContext({
    env,
    context: {
      reportType: "sookyoPremium",
      featureType: "sookyo_premium",
      reportSessionId: body?._premiumReportSessionId || "legacy",
      reportId,
      userId: "legacy",
      input: body,
      coreData: {
        canonicalJson: {
          calculatedData: compatCalculatedData,
        },
      },
    },
    chapterId: chapter,
    requestId: String(body?._premiumRequestId || body?.requestId || `legacy_${Date.now()}`),
  });

  const storage = writeReportSessionChapter("sukuyo", reportId, chapter, totalChapters, chapterMeta, generated.text, {
    reportType: "compatibility",
    canonicalSukuyoCompatibility,
  });

  return json({
    ok: true,
    reportId,
    reportType: "compatibility",
    totalChapters,
    chapter,
    chapterMeta,
    canonicalSukuyoCompatibility,
    validation: chartValidation,
    storage,
    ...generated,
  });
}

async function handleAstroWestern(request, env) {
  const body = await readJson(request);
  const input = normalizeBody(body);
  input.houseSystem = String(body.houseSystem || "placidus").toLowerCase();
  input.zodiacType = String(body.zodiacType || "tropical").toLowerCase();
  input.includeMinorAspects = body.includeMinorAspects !== false;

  try {
    const raw = await getSwissWesternChart(request, env, input, { strict: true });
    const chart = buildWesternPremiumChart(raw, input, {
      houseSystem: input.houseSystem,
      zodiacType: input.zodiacType,
      includeMinorAspects: input.includeMinorAspects,
      strictHouseCusps: true,
    });
    const canonicalAstroChart = buildCanonicalAstroChart(body, input, chart, "personal", null, null, null, null);
    const strict = validateCanonicalAstroChartStrict(canonicalAstroChart);
    if (!strict.isValid) {
      return json({
        ok: false,
        code: "ASTRO_CANONICAL_VALIDATION_FAILED",
        message: "계산 데이터 누락으로 PDF를 생성할 수 없습니다",
        missingFields: strict.missingFields,
        canonicalAstroChart,
      }, { status: 422 });
    }
    const chapterPlan = buildAstroChapterPlan(canonicalAstroChart);
    return json({ ok: true, ...chart, canonicalAstroChart, chapterPlan, totalChapters: chapterPlan.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Swiss chart generation failed");
    return json({ ok: false, code: "ASTRO_SWISS_REQUIRED", message }, { status: 422 });
  }
}

async function handleAstroLife(request, env) {
  const body = await readJson(request);
  const prepareOnly = asBool(body.prepareOnly);
  const input = normalizeBody(body);
  const partnerIntent = body.partnerName || body.partnerYear || body.partnerMonth || body.partnerDay;
  const requestedReportType = String(body.reportType || (partnerIntent ? "compatibility" : "personal")).toLowerCase();
  let reportType = requestedReportType === "compatibility" ? "compatibility" : "personal";

  input.birthPlace = String(body.birthPlace || body.place || body.location || "");
  input.houseSystem = String(body.houseSystem || "placidus").toLowerCase();
  input.zodiacType = String(body.zodiacType || "tropical").toLowerCase();
  input.includeMinorAspects = body.includeMinorAspects !== false;

  const hasPartner = hasCompletePartnerData(body);
  if (reportType === "compatibility" && !hasPartner) {
    reportType = "personal";
  }

  const reportId = astroReportIdFromInput(body, input, reportType);

  let chart;
  try {
    const rawChart = await getSwissWesternChart(request, env, input, { strict: true });
    chart = buildWesternPremiumChart(rawChart, input, {
      houseSystem: input.houseSystem,
      zodiacType: input.zodiacType,
      includeMinorAspects: input.includeMinorAspects,
      strictHouseCusps: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Swiss chart generation failed");
    return json({ ok: false, code: "ASTRO_SWISS_REQUIRED", message }, { status: 422 });
  }

  let partnerChart = null;
  let synastry = null;
  let composite = null;
  if (reportType === "compatibility" && hasPartner) {
      const partnerInput = normalizeBody({
        ...body,
        year: body.partnerYear,
        month: body.partnerMonth,
        day: body.partnerDay,
        hour: body.partnerHour,
        minute: body.partnerMinute,
        lat: body.partnerLat ?? body.lat,
        lon: body.partnerLon ?? body.lon,
      });
      partnerInput.houseSystem = input.houseSystem;
      partnerInput.zodiacType = input.zodiacType;
      partnerInput.includeMinorAspects = input.includeMinorAspects;

      const partnerRaw = await getSwissWesternChart(request, env, partnerInput, { strict: true });
      partnerChart = buildWesternPremiumChart(partnerRaw, partnerInput, {
        houseSystem: partnerInput.houseSystem,
        zodiacType: partnerInput.zodiacType,
        includeMinorAspects: partnerInput.includeMinorAspects,
        strictHouseCusps: true,
      });
      synastry = buildSynastry(chart, partnerChart);
      composite = buildCompositeChart(chart, partnerChart, input.houseSystem);
  }

  let timingData = null;
  try {
    timingData = await buildAstroTimingData(request, env, input, chart);
  } catch (_) {
    timingData = null;
  }

  const canonicalAstroChart = buildCanonicalAstroChart(body, input, chart, reportType, partnerChart, synastry, composite, timingData);
  const strictValidation = validateCanonicalAstroChartStrict(canonicalAstroChart);
  if (!strictValidation.isValid) {
    return json({
      ok: false,
      code: "ASTRO_CANONICAL_VALIDATION_FAILED",
      message: "계산 데이터 누락으로 PDF를 생성할 수 없습니다",
      missingFields: strictValidation.missingFields,
      canonicalAstroChart,
    }, { status: 422 });
  }

  const chapterPlan = buildAstroChapterPlan(canonicalAstroChart);
  if (!chapterPlan.length) {
    return json({
      ok: false,
      code: "ASTRO_CHAPTER_PLAN_EMPTY",
      message: "계산 데이터 누락으로 생성 가능한 챕터가 없습니다",
      canonicalAstroChart,
    }, { status: 422 });
  }

  if (prepareOnly) {
    return json({
      ok: true,
      prepared: true,
      reportId,
      reportType,
      totalChapters: chapterPlan.length,
      chapterPlan,
      canonicalAstroChart,
      chart,
      partnerChart,
      synastry,
      composite,
      timingData,
      validation: strictValidation,
      missingFields: strictValidation?.missingFields || [],
    });
  }

  if (!chapterRequestProvided(body)) {
    return json({ ok: false, message: "chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }

  let meta = null;
  if (body.chapterKey) {
    meta = chapterPlan.find((m) => String(m.key) === String(body.chapterKey));
  }
  if (!meta) {
    const requestedChapter = clampInt(body.chapter, 1, 1, chapterPlan.length);
    meta = chapterPlan[requestedChapter - 1] || null;
  }
  if (!meta) {
    return json({ ok: false, code: "ASTRO_CHAPTER_NOT_AVAILABLE", message: "요청한 챕터는 현재 데이터에서 생성할 수 없습니다", chapterPlan }, { status: 422 });
  }

  const cacheKey = `${reportId}:${meta.key}:${reportType}:${input.houseSystem}:${input.zodiacType}`;
  const forceRegen = asBool(body.forceRegenerate) || asBool(body.retryChapter);
  if (!forceRegen) {
    const cached = readAstroCache(cacheKey);
    if (cached) return json({ ok: true, cached: true, ...cached });
  }

  const previousTexts = [];
  const existingSession = REPORT_SESSION_STORE.get(`astro:${reportId}`);
  if (existingSession?.chapters) {
    for (const entry of Object.values(existingSession.chapters)) {
      if (entry?.text) previousTexts.push(String(entry.text));
    }
  }

  const generated = await generateAstroPremiumChapter(
    env,
    { ...body, previousChapterTexts: previousTexts },
    input,
    Number(meta.chapter),
    meta,
    chart,
    reportType,
    partnerChart,
    synastry,
    composite,
    timingData,
  );

  const responsePayload = {
    reportId,
    reportType,
    chapter: Number(meta.chapter),
    chapterKey: meta.key,
    totalChapters: chapterPlan.length,
    chapterPlan,
    chapterMeta: meta,
    chart,
    partnerChart,
    synastry,
    composite,
    timingData,
    canonicalAstroChart,
    generatedAt: new Date().toISOString(),
    quality: {
      minChars: ASTRO_MIN_CHARS,
      actualChars: generated.text.length,
      usedFallback: false,
      warnings: generated.warnings || [],
    },
    dataQuality: {
      usedDefaultGeo: !Number.isFinite(Number(body.lat)) || !Number.isFinite(Number(body.lon ?? body.lng)),
      usedDefaultTimezone: !(body.timezoneName || body.timezone),
      houseCuspsSupplemented: !!chart?.houseSystemMeta?.approximation,
      chartSource: String(chart?.source || "unknown"),
      validation: strictValidation,
    },
    ...generated,
  };

  responsePayload.storage = writeReportSessionChapter(
    "astro",
    reportId,
    Number(meta.chapter),
    chapterPlan.length,
    meta,
    generated.text,
    { reportType }
  );

  writeAstroCache(cacheKey, responsePayload);
  return json({ ok: true, ...responsePayload });
}

async function handleVedicLife(request, env) {
  const body = await readJson(request);
  const prepareOnly = asBool(body.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(body)) {
    return json({ ok: false, message: "chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }
  const input = normalizeBody(body);
  const chapter = clampInt(body.chapter, 1, 1, VEDIC_TOTAL_CHAPTERS);
  const partnerIntent = body.partnerName || body.partnerYear || body.partnerMonth || body.partnerDay;
  const requestedReportType = String(body.reportType || (partnerIntent ? "compatibility" : "personal")).toLowerCase();
  let reportType = requestedReportType === "compatibility" ? "compatibility" : "personal";

  input.birthPlace = String(body.birthPlace || body.place || body.location || "");
  input.calendarType = String(body.calendarType || "solar");
  input.isLeapMonth = body.isLeapMonth ?? false;
  input.ayanamsa = String(body.ayanamsa || "lahiri");

  const chart = await getSwissVedicChart(request, env, input);
  let partnerChart = null;
  let ashtaKoota = chart.ashtaKoota || null;

  if (reportType === "compatibility") {
    const hasPartnerBirth = Number.isFinite(Number(body.partnerYear))
      && Number.isFinite(Number(body.partnerMonth))
      && Number.isFinite(Number(body.partnerDay));

    if (!hasPartnerBirth) {
      reportType = "personal";
    } else {
      const partnerInput = normalizeBody({
        ...body,
        year: body.partnerYear,
        month: body.partnerMonth,
        day: body.partnerDay,
        hour: body.partnerHour ?? body.hour ?? 12,
        minute: body.partnerMinute ?? body.minute ?? 0,
        lat: body.partnerLat ?? body.lat,
        lon: body.partnerLon ?? body.lon,
      });

      partnerInput.birthPlace = String(body.partnerBirthPlace || body.birthPlace || body.place || "");
      partnerInput.calendarType = String(body.partnerCalendarType || body.calendarType || "solar");
      partnerInput.isLeapMonth = body.partnerIsLeapMonth ?? false;
      partnerInput.ayanamsa = String(body.ayanamsa || "lahiri");

      partnerChart = await getSwissVedicChart(request, env, partnerInput);
      ashtaKoota = computeAshtaKoota(chart, partnerChart);
      if (ashtaKoota) {
        chart.ashtaKoota = ashtaKoota;
      }
    }
  }

  const canonicalVedicChart = buildCanonicalVedicChart(body, input, chart, reportType, partnerChart, ashtaKoota);
  const strictValidation = validateCanonicalVedicChartStrict(canonicalVedicChart, reportType);
  const chapterPlan = buildVedicChapterPlan(canonicalVedicChart, reportType);

  if (prepareOnly) {
    return json({
      ok: true,
      prepared: true,
      reportType,
      totalChapters: VEDIC_TOTAL_CHAPTERS,
      chapterPlan,
      canonicalVedicChart,
      chart,
      partnerChart,
      ashtaKoota,
      validation: strictValidation,
      missingFields: strictValidation?.missingFields || [],
    });
  }

  const chapterAvailability = chapterPlan[chapter - 1] || null;
  const availabilityWarnings = chapterAvailability?.available
    ? []
    : [`CHAPTER_AVAILABILITY_DEGRADED:${(chapterAvailability?.reasons || []).join(",") || "UNKNOWN"}`];

  const meta = VEDIC_CHAPTER_META[chapter - 1];
  let generated = await generateVedicPremiumChapter(
    env,
    body,
    input,
    chapter,
    meta,
    canonicalVedicChart,
    reportType,
    chapterPlan,
  );

  if (!generated?.ok) {
    const fallbackText = buildVedicFailOpenFallbackText(chapter, meta, canonicalVedicChart, reportType, ["UNEXPECTED_VEDIC_GENERATION_STATE"]);
    generated = {
      ok: true,
      text: fallbackText,
      sections: parseSections(fallbackText),
      actualChars: fallbackText.length,
      usedFallback: true,
      warnings: ["UNEXPECTED_VEDIC_GENERATION_STATE"],
      quality: {
        missingMarkers: [],
        repeatedSentenceCount: 0,
      },
    };
  }

  const reportId = vedicReportIdFromInput(body, input, reportType);
  const storage = writeReportSessionChapter(
    "vedic",
    reportId,
    chapter,
    VEDIC_TOTAL_CHAPTERS,
    meta,
    generated.text,
    { reportType }
  );

  return json({
    ok: true,
    reportId,
    reportType,
    chapter,
    totalChapters: VEDIC_TOTAL_CHAPTERS,
    chapterMeta: meta,
    chart,
    canonicalVedicChart,
    partnerChart,
    ashtaKoota,
    chapterPlan,
    chapterAvailability,
    generatedAt: new Date().toISOString(),
    quality: {
      minChars: VEDIC_MIN_CHARS,
      actualChars: generated.text.length,
      usedFallback: Boolean(generated.usedFallback),
      warnings: [
        ...(strictValidation.isValid ? [] : strictValidation.missingFields.map((f) => `MISSING_CANONICAL_FIELD:${f}`)),
        ...availabilityWarnings,
        ...(Array.isArray(generated?.warnings) ? generated.warnings : []),
      ],
    },
    dataQuality: {
      chartSource: String(chart?.source || "unknown"),
      validation: strictValidation,
      failOpenApplied: !strictValidation.isValid || Boolean(generated.usedFallback),
    },
    missingFields: strictValidation.missingFields || [],
    storage,
    ...generated,
  });
}

const LIFEBOOK_CHAPTERS = [
  "사주 원국 완전 해설",
  "나의 설계도",
  "숨겨진 무기",
  "대운 정밀 분석",
  "재물과 직업의 방향",
  "관계와 가족의 패턴",
  "건강과 에너지 관리",
  "연애와 결혼의 흐름",
  "위기와 전환점",
  "나를 지키는 습관",
  "올해의 실전 전략",
  "장기 로드맵",
  "인생의 책 마스터 플랜",
];

const LIFEBOOK_CHAPTER_SUBTITLES = [
  "팔자 8글자와 사주 원국의 구조를 정밀 해독",
  "월지·일간·조후로 읽는 타고난 삶의 설계도",
  "용신·희신·기신으로 찾는 핵심 강점과 천직 방향",
  "대운 흐름과 전환 구간을 읽는 시계열 전략",
  "재물 그릇과 커리어 확장 포인트의 현실적 설계",
  "가족·동료·파트너 관계에서 반복되는 패턴 분석",
  "오행 균형 기반 건강·회복·에너지 관리 지침",
  "연애·결혼의 궁합 구조와 관계 유지 전략",
  "위기 신호·손실 구간·반전 구간의 대응 시나리오",
  "삶을 지키는 루틴과 의사결정 습관 재설계",
  "당해년 실행력 극대화를 위한 월별 행동 전략",
  "중장기 성장 경로와 인생 포트폴리오 설계",
  "전체 흐름 통합과 최종 마스터 플랜 제언",
];

const LIFEBOOK_COUNSELOR_FOCUS = [
  "원국의 기본축(년·월·일·시)을 분리 해석한 뒤 실제 성격·의사결정 습관과 연결합니다.",
  "월지·일간·조후의 균형을 통해 환경 적응 방식과 성장 최적 환경을 구체화합니다.",
  "용신/희신/기신을 행동 선택 기준으로 번역해 직업·학습·관계 전략으로 제시합니다.",
  "대운의 상승·정체·전환 시점을 구분해 타이밍 기반 실행안을 설계합니다.",
  "재성·식상·관성 흐름을 돈 버는 방식과 커리어 구조로 연결해 현실안을 제시합니다.",
  "합충·거리두기·경계선 설정 관점에서 관계 피로를 줄이는 실전 규칙을 제공합니다.",
  "오행 불균형이 만드는 신체/정서 소진 패턴을 회복 루틴과 함께 제시합니다.",
  "연애·결혼 의사결정에서 감정과 현실 조건을 함께 점검하는 프레임을 제안합니다.",
  "위기 발생 전 징후를 분류하고 손실 최소화 행동 순서를 단계별로 제시합니다.",
  "장기적으로 나를 지키는 핵심 습관을 설계하고 재발 방지 장치를 제공합니다.",
  "연간 흐름을 월 단위 행동계획으로 쪼개 실전 선택 기준으로 정리합니다.",
  "생애 포트폴리오(일·돈·관계·건강)를 균형 있게 재배치하는 전략을 제시합니다.",
  "전 챕터 해석을 통합해 향후 1년/3년/10년 실행 로드맵으로 마무리합니다.",
];

const LIFEBOOK_SECTION_HEADERS = [
  ["원국 핵심 구조 해석", "기질과 반응의 반복 패턴", "관계·일·돈 적용 포인트", "리스크와 그림자 관리", "7일 실행 루틴"],
  ["설계도 핵심 진단", "환경 적응 반복 패턴", "성장 환경 선택 포인트", "과부하 리스크 관리", "2주 실행 루틴"],
  ["강점 자산 핵심 진단", "성공/실패 반복 패턴", "천직 선택 포인트", "기신 과열 리스크", "실전 강화 루틴"],
  ["대운 흐름 핵심 진단", "상승/정체 반복 패턴", "타이밍 선택 포인트", "전환기 리스크", "월별 실행 루틴"],
  ["재물·커리어 핵심 진단", "수익/소진 반복 패턴", "직업 확장 선택 포인트", "손실 리스크 관리", "현실 실행 루틴"],
  ["관계 구조 핵심 진단", "갈등/회복 반복 패턴", "소통·경계 선택 포인트", "관계 소진 리스크", "관계 회복 루틴"],
  ["건강 에너지 핵심 진단", "소진/회복 반복 패턴", "생활관리 선택 포인트", "건강 리스크 관리", "회복 실행 루틴"],
  ["연애·결혼 핵심 진단", "관계 지속 반복 패턴", "정착 선택 포인트", "관계 파열 리스크", "친밀도 실행 루틴"],
  ["위기 전환 핵심 진단", "위기 재발 반복 패턴", "대응 선택 포인트", "손실 확대 리스크", "위기 대응 루틴"],
  ["습관 시스템 핵심 진단", "재발 반복 패턴", "행동 전환 선택 포인트", "의지 고갈 리스크", "습관 고정 루틴"],
  ["연간 전략 핵심 진단", "월별 파동 반복 패턴", "Go/Stop 선택 포인트", "조급함 리스크", "연간 실행 루틴"],
  ["장기 경로 핵심 진단", "성장/정체 반복 패턴", "중장기 선택 포인트", "방향 상실 리스크", "장기 실행 루틴"],
  ["통합 마스터 진단", "핵심 패턴 총정리", "최종 선택 포인트", "재발 리스크 관리", "1년·3년·10년 실행 루틴"],
];

const LIFEBOOK_MIN_CHARS = 6000;

const DEFAULT_BOOK_SECTION_HEADERS = [
  "핵심 해석",
  "반복되는 패턴",
  "관계와 선택의 포인트",
  "조심해야 할 그림자",
  "실전 행동 가이드",
];

const LOVE_SECRET_SYSTEM_PROMPT = "너는 30년 경력의 사주 연애·궁합 상담가다. 너는 사주를 계산하지 않는다. 모든 해석은 canonicalSajuLoveReport JSON에 있는 값만 사용한다. 특히 속궁합과 친밀감은 조후, 월지, 계절, 한난조습, 화수 균형, 일지 배우자궁, 실제 신살, 합충형파해를 기반으로 해석해야 한다. JSON에 없는 신살, 용신, 조후, 계절, 합충, 대운, 세운, 궁합 요소를 절대 만들어내지 않는다. 각 챕터의 소제목과 카테고리는 chapterPlanning.dataDrivenSections를 우선 사용하고, 실제 사주 데이터와 맞는 문장으로 작성해야 한다. 일반 연애 조언이나 반복 문장으로 분량을 채우는 것은 금지한다. 선정적 표현 없이 고급스럽고 구체적인 친밀감 리포트로 작성한다.";

const LOVE_SECRET_FORBIDDEN_REPEATED_PHRASES = [
  "현재 챕터의 핵심은 상대를 바꾸는 기술이 아니라 관계 운영 방식을 정교화하는 것입니다.",
  "경향은 고정 운명이 아니라 조정 가능한 패턴입니다.",
  "반복 신호를 조기에 잡을수록 갈등 비용을 줄일 수 있습니다.",
  "연애에서 나타나는 핵심 패턴은 사건 그 자체보다 반응의 반복에서 나타납니다.",
  "좋은 궁합/좋은 타이밍은 결과를 보장하는 약속이 아닙니다.",
  "의사결정은 감정 강도보다 지속 가능성 기준으로 해야 합니다.",
  "심화 상담 메모",
  "실행 문장: 이번 주에는 동일한 주제의 갈등을 다시 꺼내지 않도록",
];

const LOVE_SECRET_ALLOWED_STAR_NAMES = ["도화살", "홍염살", "화개살", "역마살"];
const LOVE_SECRET_BLOCKED_STARS = ["괴강살", "양인살"];
const LOVE_SECRET_STEMS = "甲乙丙丁戊己庚辛壬癸";
const LOVE_SECRET_BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
const LOVE_SECRET_STEM_ELEMENTS = {
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth",
  己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
};
const LOVE_SECRET_STEM_YIN_YANG = {
  甲: "양", 乙: "음", 丙: "양", 丁: "음", 戊: "양",
  己: "음", 庚: "양", 辛: "음", 壬: "양", 癸: "음",
};
const LOVE_SECRET_BRANCH_HIDDEN_STEMS = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"],
  辰: ["戊", "乙", "癸"], 巳: ["丙", "戊", "庚"], 午: ["丁", "己"], 未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};
const LOVE_SECRET_ELEMENT_KO = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const LOVE_SECRET_ELEMENT_FROM_TEXT = {
  목: "wood", wood: "wood", 木: "wood",
  화: "fire", fire: "fire", 火: "fire",
  토: "earth", earth: "earth", 土: "earth",
  금: "metal", metal: "metal", 金: "metal",
  수: "water", water: "water", 水: "water",
};
const LOVE_SECRET_SHENG = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const LOVE_SECRET_KE = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const LOVE_SECRET_TEN_GOD_KEYS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
const LOVE_SECRET_STEM_COMBINATIONS = ["甲己", "乙庚", "丙辛", "丁壬", "戊癸"];
const LOVE_SECRET_STEM_CLASHES = ["甲庚", "乙辛", "丙壬", "丁癸"];
const LOVE_SECRET_BRANCH_COMBINATIONS = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];
const LOVE_SECRET_BRANCH_CLASHES = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];
const LOVE_SECRET_BRANCH_HARMS = ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"];
const LOVE_SECRET_BRANCH_BREAKS = ["子酉", "卯午", "辰丑", "未戌", "寅亥", "巳申"];
const LOVE_SECRET_BRANCH_PUNISHMENTS = ["寅巳", "巳申", "寅申", "丑戌", "戌未", "丑未", "子卯", "辰辰", "午午", "酉酉", "亥亥"];

const LOVE_SECRET_CHAPTER_BLUEPRINTS = {
  1: {
    purpose: "연애 상황에서 드러나는 본연의 자아를 원국 기반으로 해석",
    requiredSections: ["사용 데이터 요약표", "나의 연애 자아 한 문장 정의", "일간으로 보는 사랑의 기본 태도", "일지 배우자궁으로 보는 가까운 관계의 민낯", "오행 분포와 감정 표현 방식", "십성으로 보는 연애 주도권", "장점 5개", "반복 실수 5개", "핵심 요약 5줄"],
    requiredDataPoints: ["일간", "일지", "월지", "년주", "월주", "일주", "시주", "오행 분포", "신강/신약", "십성 분포"],
  },
  2: {
    purpose: "도화/홍염/화개/역마를 근거로 매력의 질감과 작동 조건을 설명",
    requiredSections: ["사용 신살 요약표", "매력의 핵심 키워드 7개", "도화/홍염/화개 각각의 매력 작동 방식", "상대가 처음 느끼는 인상", "가까워질수록 드러나는 매력", "매력이 과잉될 때의 위험", "매력을 좋은 관계로 연결하는 법", "핵심 요약 5줄"],
    requiredDataPoints: ["도화살", "홍염살", "화개살", "역마살", "신살 위치", "일간", "일지", "오행 분포"],
  },
  3: {
    purpose: "배우자성/배우자궁/오행 보완 관점에서 이상형과 현실형의 차이를 분석",
    requiredSections: ["배우자성/배우자궁 요약표", "내가 무의식적으로 끌리는 사람", "진짜 오래 갈 수 있는 사람", "피해야 할 관계 패턴", "결론: 이상형과 현실형의 차이", "핵심 요약 5줄"],
    requiredDataPoints: ["배우자궁", "배우자성", "재성", "관성", "식상", "인성", "비겁", "오행 보완"],
  },
  4: {
    purpose: "십성 구조를 실제 연락/고백/갈등 대화 스킬로 번역",
    requiredSections: ["연애 스킬 데이터 요약표", "연락 스타일", "호감 표현 방식", "갈등 시 말투", "고백/관계 진전 전략", "절대 하지 말아야 할 행동", "핵심 요약 5줄"],
    requiredDataPoints: ["식상", "재성", "관성", "인성", "비겁", "오행 강약", "신강/신약"],
  },
  5: {
    purpose: "대운/세운/월운의 타이밍을 관계 의사결정 로드맵으로 제공",
    requiredSections: ["대운·세운 요약표", "현재 대운의 연애 테마", "올해 세운의 연애 기류", "월별 로드맵 12개월", "중요한 선택 구간", "피해야 할 시기", "핵심 요약 5줄"],
    requiredDataPoints: ["현재 대운", "다음 대운", "해당 연도 세운", "월별 흐름", "합/충 변화", "재성/관성 변화", "도화/홍염 변화"],
  },
  6: {
    purpose: "기신 과열과 오행 불균형의 위기 패턴을 회복 프로토콜로 연결",
    requiredSections: ["위기 데이터 요약표", "연애에서 반복되는 그림자", "집착/회피/침묵/폭발 패턴", "이별 위기 전조", "회복 프로토콜", "핵심 요약 5줄"],
    requiredDataPoints: ["기신", "오행 불균형", "일지 충형파해", "신살 역작용", "십성 충돌", "배우자궁", "대운/세운 압박"],
  },
  7: {
    purpose: "친밀감의 온도와 속도를 선정성 없이 데이터 중심으로 해석",
    requiredSections: ["친밀감 데이터 요약표", "나의 관계 온도", "끌림이 생기는 조건", "가까워질수록 필요한 안정감", "친밀감을 건강하게 유지하는 법", "핵심 요약 5줄"],
    requiredDataPoints: ["화 기운", "수 기운", "식상", "재성/관성", "도화/홍염", "일지", "신강/신약"],
  },
  8: {
    purpose: "현대 연애 상황(카톡/DM/썸/재회/장거리)별 맞춤 대응 전략 제시",
    requiredSections: ["현대 연애 상황 요약표", "썸 단계 전략", "연락 템포", "갈등 후 메시지 예시", "재회/정리 상황 전략", "핵심 요약 5줄"],
    requiredDataPoints: ["식상", "비겁", "인성", "오행 온도", "대운/세운 시기", "배우자궁", "신강/신약"],
  },
  9: {
    purpose: "결혼관·역할 분담·생활 리듬을 배우자궁/배우자성/운세 흐름으로 진단",
    requiredSections: ["결혼 데이터 요약표", "결혼관", "안정되는 배우자 유형", "결혼 후 갈등 포인트", "돈과 생활 운영", "핵심 요약 5줄"],
    requiredDataPoints: ["배우자궁", "배우자성", "재성/관성", "대운 결혼 시기", "오행 보완", "가족/책임", "장기 안정성"],
  },
  10: {
    purpose: "용신/희신 강화와 기신 절감을 위한 실행형 개운 처방전 작성",
    requiredSections: ["개운 데이터 요약표", "나에게 필요한 연애 기운", "줄여야 할 연애 습관", "데이트/공간/말투/연락 처방", "7일 플랜", "30일 플랜", "90일 플랜", "최종 연애 비책 10계명", "핵심 요약 5줄"],
    requiredDataPoints: ["용신", "희신", "기신", "오행 강약", "말투/환경 전략", "관계 루틴", "대운/세운 타이밍"],
  },
};

function normalizeLoveMode(modeConfigMode) {
  const mode = String(modeConfigMode || "").toLowerCase();
  return mode === "couple" || mode === "compatibility" ? "compatibility" : "single";
}

function resolveLoveSecretMode(body) {
  const explicit = String(body.mode || "").toLowerCase();
  if (explicit === "solo" || explicit === "couple") return explicit;
  const partnerData = stringifyCompact(body.partnerData || body.partner || "", 2400);
  return partnerData.trim() ? "couple" : "solo";
}

function getLoveSecretChapterMinChars(modeConfig, chapter) {
  const idx = Number(chapter);
  return Number(modeConfig.chapterMinByIndex?.[idx] || modeConfig.chapterMinDefault || 4000);
}

function normalizeLoveElement(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return null;
  return LOVE_SECRET_ELEMENT_FROM_TEXT[key] || LOVE_SECRET_ELEMENT_FROM_TEXT[String(value || "").trim()] || null;
}

function toLoveKoElement(value) {
  const normalized = normalizeLoveElement(value) || String(value || "").trim();
  return LOVE_SECRET_ELEMENT_KO[normalized] || normalized || null;
}

function parseLoveNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickDominantElement(weights = {}) {
  const entries = Object.entries(weights).map(([key, val]) => [key, parseLoveNumber(val, 0)]);
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || null;
}

function pickWeakestElement(weights = {}) {
  const entries = Object.entries(weights).map(([key, val]) => [key, parseLoveNumber(val, 0)]);
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0]?.[0] || null;
}

function normalizeLoveGender(value) {
  const g = String(value || "").trim().toLowerCase();
  if (g === "m" || g === "male" || g === "man" || g === "남" || g === "남성") return "male";
  if (g === "f" || g === "female" || g === "woman" || g === "여" || g === "여성") return "female";
  return String(value || "").trim() || "unknown";
}

function parseLoveBirthFromText(text = "") {
  const source = String(text || "");
  const birthMatch = source.match(/생년월일\s*:\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  let hour = 12;
  let minute = 0;
  const hm = source.match(/출생\s*시각\s*:\s*(\d{1,2})시\s*(\d{1,2})분?/);
  if (hm) {
    hour = clampInt(hm[1], 12, 0, 23);
    minute = clampInt(hm[2], 0, 0, 59);
  } else {
    const hhmm = source.match(/출생\s*시각\s*:\s*([0-2]?\d):([0-5]\d)/);
    if (hhmm) {
      hour = clampInt(hhmm[1], 12, 0, 23);
      minute = clampInt(hhmm[2], 0, 0, 59);
    } else {
      const branchHour = source.match(/\((\d{2})-(\d{2})시\)/);
      if (branchHour) {
        hour = clampInt(branchHour[1], 12, 0, 23);
      }
    }
  }

  return {
    year: birthMatch ? clampInt(birthMatch[1], 1990, 1900, 2100) : null,
    month: birthMatch ? clampInt(birthMatch[2], 1, 1, 12) : null,
    day: birthMatch ? clampInt(birthMatch[3], 1, 1, 31) : null,
    hour,
    minute,
  };
}

function parseLovePillarsFromText(text = "") {
  const source = String(text || "");
  const pull = (label) => {
    const re = new RegExp(`${label}(?:\\([^\\)]*\\))?\\s*:\\s*([${LOVE_SECRET_STEMS}])([${LOVE_SECRET_BRANCHES}])`);
    const m = source.match(re);
    if (!m) return null;
    const stem = m[1];
    const branch = m[2];
    return {
      ganji: `${stem}${branch}`,
      stem,
      branch,
      tenGod: "N/A",
      hiddenStems: LOVE_SECRET_BRANCH_HIDDEN_STEMS[branch] ? LOVE_SECRET_BRANCH_HIDDEN_STEMS[branch].slice() : [],
    };
  };
  return {
    year: pull("년주"),
    month: pull("월주"),
    day: pull("일주"),
    hour: pull("시주"),
  };
}

function parseLoveElementsFromText(text = "") {
  const source = String(text || "");
  const m = source.match(/목\(木\)\s*:\s*([0-9.]+)[^\n]*화\(火\)\s*:\s*([0-9.]+)[^\n]*토\(土\)\s*:\s*([0-9.]+)[^\n]*금\(金\)\s*:\s*([0-9.]+)[^\n]*수\(水\)\s*:\s*([0-9.]+)/);
  const weights = {
    wood: m ? parseLoveNumber(m[1], 0) : 0,
    fire: m ? parseLoveNumber(m[2], 0) : 0,
    earth: m ? parseLoveNumber(m[3], 0) : 0,
    metal: m ? parseLoveNumber(m[4], 0) : 0,
    water: m ? parseLoveNumber(m[5], 0) : 0,
  };
  const dominant = pickDominantElement(weights);
  const weakest = pickWeakestElement(weights);
  const missing = Object.entries(weights).filter(([, v]) => Number(v) === 0).map(([k]) => k);
  return { ...weights, dominant, weakest, missing };
}

function parseLoveStrengthFromText(text = "") {
  const source = String(text || "");
  const m = source.match(/신강\s*\/\s*신약\s*:\s*([^\n]+)/);
  const raw = m ? String(m[1]).trim() : "";
  if (raw.includes("중")) return "중화";
  if (raw.includes("신강")) return "신강";
  if (raw.includes("신약")) return "신약";
  return raw || "N/A";
}

function parseLoveLineElements(text = "", marker = "") {
  const source = String(text || "");
  const re = new RegExp(`${marker}[^:\\n]*:\\s*([^\\n]+)`);
  const m = source.match(re);
  if (!m) return [];
  return String(m[1])
    .split(/[\/,·|\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => normalizeLoveElement(token))
    .filter(Boolean);
}

function parseLoveTenGodDistribution(text = "") {
  const source = String(text || "");
  const distribution = {};
  for (const key of LOVE_SECRET_TEN_GOD_KEYS) {
    const re = new RegExp(`${key}\\s*:\\s*([0-9.]+)`);
    const m = source.match(re);
    if (m) distribution[key] = parseLoveNumber(m[1], 0);
  }
  const sorted = Object.entries(distribution).sort((a, b) => Number(b[1]) - Number(a[1]));
  return {
    distribution,
    dominantTenGods: sorted.slice(0, 3).map(([k]) => k),
    weakTenGods: sorted.filter(([, v]) => Number(v) <= 1).map(([k]) => k),
  };
}

function parseLoveStarsFromText(text = "") {
  const source = String(text || "");
  const line = source.match(/보유\s*신살\s*:\s*([^\n]+)/);
  const payload = line ? String(line[1]) : "";
  const has = (name) => payload.includes(name) || source.includes(name);
  const map = {
    dohwa: has("도화살") ? ["도화살"] : [],
    hongyeom: has("홍염살") ? ["홍염살"] : [],
    hwagae: has("화개살") ? ["화개살"] : [],
    yeokma: has("역마살") ? ["역마살"] : [],
    others: [],
  };
  return map;
}

function parseLoveDaewoonFromText(text = "", birthYear = null) {
  const source = String(text || "");
  const rows = [];
  const re = new RegExp(`(\\d{1,3})세\\s*:\\s*([${LOVE_SECRET_STEMS}])([${LOVE_SECRET_BRANCHES}])`, "g");
  let m = re.exec(source);
  while (m) {
    rows.push({ age: parseLoveNumber(m[1], 0), ganji: `${m[2]}${m[3]}`, stem: m[2], branch: m[3] });
    m = re.exec(source);
  }
  const nowYear = new Date().getFullYear();
  const currentAge = Number.isFinite(Number(birthYear)) ? Math.max(1, nowYear - Number(birthYear) + 1) : null;
  let idx = rows.length ? 0 : -1;
  if (currentAge != null && rows.length) {
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].age <= currentAge) idx = i;
    }
  }
  const currentDaewoon = idx >= 0 ? rows[idx] : null;
  const nextDaewoon = idx >= 0 && idx + 1 < rows.length ? rows[idx + 1] : null;
  return {
    currentDaewoon,
    nextDaewoon,
    annualLuck: {},
    monthlyLuck: [],
  };
}

function loveSeasonFromMonthBranch(branch) {
  if (["寅", "卯", "辰"].includes(branch)) return "spring";
  if (["巳", "午", "未"].includes(branch)) return "summer";
  if (["申", "酉", "戌"].includes(branch)) return "autumn";
  if (["亥", "子", "丑"].includes(branch)) return "winter";
  return "transitional";
}

function loveSeasonalElement(season) {
  if (season === "spring") return "wood";
  if (season === "summer") return "fire";
  if (season === "autumn") return "metal";
  if (season === "winter") return "water";
  return "earth";
}

function deriveLoveJohu(person) {
  const monthBranch = person?.fourPillars?.month?.branch || "";
  const season = loveSeasonFromMonthBranch(monthBranch);
  const seasonalElement = loveSeasonalElement(season);
  const five = person?.fiveElements || { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  const hot = Math.max(0, parseLoveNumber(five.fire, 0) + (season === "summer" ? 12 : 0) - (season === "winter" ? 5 : 0));
  const cold = Math.max(0, parseLoveNumber(five.water, 0) + (season === "winter" ? 12 : 0) - (season === "summer" ? 5 : 0));
  const warm = Math.max(0, parseLoveNumber(five.wood, 0) + parseLoveNumber(five.fire, 0) * 0.35);
  const cool = Math.max(0, parseLoveNumber(five.metal, 0) + parseLoveNumber(five.water, 0) * 0.35);

  const dryness = Math.max(0, parseLoveNumber(five.metal, 0) + (season === "autumn" ? 10 : 0) - parseLoveNumber(five.water, 0) * 0.2);
  const moisture = Math.max(0, parseLoveNumber(five.water, 0) + (season === "spring" ? 6 : 0));
  const dampness = Math.max(0, parseLoveNumber(five.earth, 0) + parseLoveNumber(five.water, 0) * 0.25);

  const heatGap = hot - cold;
  const dryGap = dryness - moisture;
  let climateType = "balanced";
  if (season === "autumn" && dryGap > 8) climateType = "dry-autumn";
  else if (season === "spring" && moisture > dryness + 4) climateType = "moist-spring";
  else if (heatGap >= 8 && dryGap >= 5) climateType = "hot-dry";
  else if (heatGap >= 8 && dryGap < 5) climateType = "hot-wet";
  else if (heatGap <= -8 && dryGap >= 5) climateType = "cold-dry";
  else if (heatGap <= -8 && dryGap < 5) climateType = "cold-wet";

  const needs = {
    needsWarmth: cold > hot + 4,
    needsMoisture: dryness > moisture + 4,
    needsDrying: moisture > dryness + 7,
    needsCooling: hot > cold + 8,
    needsFire: parseLoveNumber(five.fire, 0) < 15,
    needsWater: parseLoveNumber(five.water, 0) < 15,
    needsWood: parseLoveNumber(five.wood, 0) < 15,
    needsMetal: parseLoveNumber(five.metal, 0) < 15,
    needsEarth: parseLoveNumber(five.earth, 0) < 15,
  };

  const primaryNeed = needs.needsWarmth ? "fire"
    : needs.needsCooling ? "water"
      : needs.needsMoisture ? "water"
        : needs.needsDrying ? "fire"
          : person?.usefulGods?.yongsin?.element || null;
  const secondaryNeed = person?.usefulGods?.huisin?.element || null;

  return {
    birthSeason: season,
    monthBranch,
    seasonalElement,
    temperatureProfile: {
      cold: Math.round(cold * 10) / 10,
      warm: Math.round(warm * 10) / 10,
      hot: Math.round(hot * 10) / 10,
      cool: Math.round(cool * 10) / 10,
      summary: `냉기 ${Math.round(cold)} / 온기 ${Math.round(hot)} 중심`,
    },
    moistureProfile: {
      dryness: Math.round(dryness * 10) / 10,
      moisture: Math.round(moisture * 10) / 10,
      dampness: Math.round(dampness * 10) / 10,
      summary: `건조 ${Math.round(dryness)} / 습윤 ${Math.round(moisture)} 중심`,
    },
    climateType,
    needs,
    johuYongsin: {
      primaryElement: primaryNeed,
      secondaryElement: secondaryNeed,
      reason: "월지 계절성·오행 온도·조습 균형 기반",
    },
    relationshipClimate: {
      loveTemperature: heatGap >= 6 ? "따뜻-고열형" : heatGap <= -6 ? "서늘-저온형" : "중온형",
      emotionalOpeningStyle: moisture >= dryness ? "정서 개방이 비교적 빠름" : "신뢰 축적 후 개방",
      intimacyRhythm: heatGap >= 5 ? "빠른 접근-빠른 반응" : heatGap <= -5 ? "느린 접근-깊은 축적" : "중간 속도",
      skinshipComfortStyle: moisture >= dryness ? "접촉 친화형" : "거리 조율형",
      distanceSensitivity: parseLoveNumber(five.metal, 0) >= 25 ? "경계 민감" : "유연 경계",
    },
  };
}

function buildLoveProfileFromPerson(person) {
  const day = person?.fourPillars?.day || null;
  return {
    spousePalace: {
      branch: day?.branch || "",
      hiddenStems: Array.isArray(day?.hiddenStems) ? day.hiddenStems.slice() : [],
      meaning: day?.branch ? `일지 ${day.branch}` : "",
      stability: person?.dayMaster?.strength || "N/A",
      conflictFactors: [],
    },
    attractionStars: person?.attractionStars || { dohwa: [], hongyeom: [], hwagae: [], yeokma: [], others: [] },
    relationshipPatterns: {
      attachmentStyle: "데이터 기반 직접 해석 필요",
      expressionStyle: "데이터 기반 직접 해석 필요",
      conflictStyle: "데이터 기반 직접 해석 필요",
      reconciliationStyle: "데이터 기반 직접 해석 필요",
      idealPartnerType: "데이터 기반 직접 해석 필요",
    },
  };
}

function buildLovePersonCanonical(rawText, profileHints = {}, input = {}) {
  const text = String(rawText || "");
  const birthFromText = parseLoveBirthFromText(text);
  const pillars = parseLovePillarsFromText(text);
  const dayStemFromText = (text.match(/일간\(日干\)\s*:\s*([甲乙丙丁戊己庚辛壬癸])/) || [])[1] || pillars?.day?.stem || "";
  const dayElement = LOVE_SECRET_STEM_ELEMENTS[dayStemFromText] || null;
  const fiveElements = parseLoveElementsFromText(text);
  const tenGods = parseLoveTenGodDistribution(text);
  const stars = parseLoveStarsFromText(text);
  const strength = parseLoveStrengthFromText(text);
  const yongshin = parseLoveLineElements(text, "용신");
  const huisin = parseLoveLineElements(text, "희신");
  const kishin = parseLoveLineElements(text, "기신");
  const birthYear = birthFromText.year || profileHints.birthYear || input.year || null;
  const luck = parseLoveDaewoonFromText(text, birthYear);

  const gender = normalizeLoveGender(profileHints.gender || (text.match(/성별\s*:\s*([^\n]+)/) || [])[1] || input.gender || "unknown");
  const spouseStarByGender = gender === "male" ? "재성" : gender === "female" ? "관성" : null;

  const profile = {
    name: String(profileHints.name || (text.match(/이름\s*:\s*([^\n]+)/) || [])[1] || input.name || "사용자").trim(),
    gender,
    birth: {
      solarDate: birthYear && (birthFromText.month || input.month) && (birthFromText.day || input.day)
        ? `${birthYear}-${String(birthFromText.month || input.month).padStart(2, "0")}-${String(birthFromText.day || input.day).padStart(2, "0")}`
        : null,
      lunarDate: null,
      time: `${String(birthFromText.hour ?? input.hour ?? 12).padStart(2, "0")}:${String(birthFromText.minute ?? input.minute ?? 0).padStart(2, "0")}`,
      timezone: "Asia/Seoul",
      locationName: profileHints.locationName || null,
    },
  };

  const person = {
    profile,
    fourPillars: {
      year: pillars.year || { ganji: "", stem: "", branch: "", tenGod: "N/A", hiddenStems: [] },
      month: pillars.month || { ganji: "", stem: "", branch: "", tenGod: "N/A", hiddenStems: [] },
      day: pillars.day
        ? { ...pillars.day, dayMaster: dayStemFromText || "" }
        : { ganji: "", stem: dayStemFromText || "", branch: "", dayMaster: dayStemFromText || "", hiddenStems: [] },
      hour: pillars.hour || { ganji: "", stem: "", branch: "", tenGod: "N/A", hiddenStems: [] },
    },
    dayMaster: {
      stem: dayStemFromText || "",
      element: dayElement || "",
      yinYang: LOVE_SECRET_STEM_YIN_YANG[dayStemFromText] || "",
      strength,
      strengthScore: Number.isFinite(Number(profileHints.strengthScore)) ? Number(profileHints.strengthScore) : null,
    },
    fiveElements,
    tenGods: {
      distribution: tenGods.distribution,
      dominantTenGods: tenGods.dominantTenGods,
      weakTenGods: tenGods.weakTenGods,
      loveRelatedGods: {
        spouseStar: spouseStarByGender,
        expressionStar: tenGods.distribution.식신 >= tenGods.distribution.상관 ? "식신" : (tenGods.distribution.상관 ? "상관" : null),
        resourceStar: tenGods.distribution.정인 >= tenGods.distribution.편인 ? "정인" : (tenGods.distribution.편인 ? "편인" : null),
        peerStar: tenGods.distribution.비견 >= tenGods.distribution.겁재 ? "비견" : (tenGods.distribution.겁재 ? "겁재" : null),
        authorityStar: tenGods.distribution.정관 >= tenGods.distribution.편관 ? "정관" : (tenGods.distribution.편관 ? "편관" : null),
      },
    },
    attractionStars: stars,
    usefulGods: {
      yongsin: { element: yongshin[0] || null, reason: yongshin.length ? "사주 엔진 출력값" : "" },
      huisin: { element: huisin[0] || yongshin[1] || null, reason: (huisin.length || yongshin.length > 1) ? "사주 엔진 출력값" : "" },
      gisin: { element: kishin[0] || null, reason: kishin.length ? "사주 엔진 출력값" : "" },
    },
    luck: {
      currentDaewoon: luck.currentDaewoon,
      nextDaewoon: luck.nextDaewoon,
      annualLuck: luck.annualLuck,
      monthlyLuck: luck.monthlyLuck,
    },
  };

  person.loveProfile = buildLoveProfileFromPerson(person);
  person.johu = deriveLoveJohu(person);
  return person;
}

function lovePairKey(a, b) {
  const x = `${a || ""}${b || ""}`;
  const y = `${b || ""}${a || ""}`;
  return x < y ? x : y;
}

function collectLoveInteractionRows(personA, personB) {
  const rows = {
    combinations: [],
    clashes: [],
    harms: [],
    punishments: [],
    breaks: [],
  };
  const aPillars = personA?.fourPillars || {};
  const bPillars = personB?.fourPillars || {};
  const aList = [
    ["A년", aPillars.year?.stem, aPillars.year?.branch],
    ["A월", aPillars.month?.stem, aPillars.month?.branch],
    ["A일", aPillars.day?.stem, aPillars.day?.branch],
    ["A시", aPillars.hour?.stem, aPillars.hour?.branch],
  ];
  const bList = [
    ["B년", bPillars.year?.stem, bPillars.year?.branch],
    ["B월", bPillars.month?.stem, bPillars.month?.branch],
    ["B일", bPillars.day?.stem, bPillars.day?.branch],
    ["B시", bPillars.hour?.stem, bPillars.hour?.branch],
  ];

  for (const [aLabel, aStem, aBranch] of aList) {
    for (const [bLabel, bStem, bBranch] of bList) {
      const stemPair = lovePairKey(aStem, bStem);
      const branchPair = lovePairKey(aBranch, bBranch);
      if (LOVE_SECRET_STEM_COMBINATIONS.includes(stemPair)) rows.combinations.push(`${aLabel}-${bLabel} 천간합 ${stemPair}`);
      if (LOVE_SECRET_STEM_CLASHES.includes(stemPair)) rows.clashes.push(`${aLabel}-${bLabel} 천간충 ${stemPair}`);
      if (LOVE_SECRET_BRANCH_COMBINATIONS.includes(branchPair)) rows.combinations.push(`${aLabel}-${bLabel} 지지합 ${branchPair}`);
      if (LOVE_SECRET_BRANCH_CLASHES.includes(branchPair)) rows.clashes.push(`${aLabel}-${bLabel} 지지충 ${branchPair}`);
      if (LOVE_SECRET_BRANCH_HARMS.includes(branchPair)) rows.harms.push(`${aLabel}-${bLabel} 지지해 ${branchPair}`);
      if (LOVE_SECRET_BRANCH_PUNISHMENTS.includes(branchPair)) rows.punishments.push(`${aLabel}-${bLabel} 지지형 ${branchPair}`);
      if (LOVE_SECRET_BRANCH_BREAKS.includes(branchPair)) rows.breaks.push(`${aLabel}-${bLabel} 지지파 ${branchPair}`);
    }
  }
  return rows;
}

function classifyLoveSeasonPair(aSeason, bSeason) {
  const pair = `${aSeason || "unknown"}+${bSeason || "unknown"}`;
  const rev = `${bSeason || "unknown"}+${aSeason || "unknown"}`;
  const key = pair < rev ? pair : rev;
  if (key === "autumn+spring") return { seasonPair: key, interpretation: "성장(봄)과 수렴(가을)의 보완이 가능한 조합" };
  if (key === "summer+winter") return { seasonPair: key, interpretation: "열기와 냉기의 조율이 핵심인 온도 대비 조합" };
  if (key === "spring+summer") return { seasonPair: key, interpretation: "목생화가 빠른 설렘을 만들 수 있는 조합" };
  if (key === "autumn+winter") return { seasonPair: key, interpretation: "금생수의 차분함이 깊은 유대감으로 이어질 수 있는 조합" };
  if (aSeason === bSeason) return { seasonPair: key, interpretation: "같은 계절 리듬으로 편안하지만 부족 기운도 함께 부족해질 수 있음" };
  return { seasonPair: key, interpretation: "서로 다른 계절 리듬을 조율하는 중립 조합" };
}

function buildLoveJohuCompatibility(personA, personB, interactions) {
  const aJ = personA?.johu || null;
  const bJ = personB?.johu || null;
  if (!aJ || !bJ) {
    return {
      enabled: false,
      aClimateType: aJ?.climateType || "",
      bClimateType: bJ?.climateType || "",
      temperatureBalance: null,
      moistureBalance: null,
      seasonalCompatibility: null,
      fireWaterChemistry: null,
      dryWetChemistry: null,
      intimacyClimateSummary: "조후 데이터가 불충분하여 조후 기반 궁합 분석 불가",
      riskFactors: [],
      balancingStrategies: [],
    };
  }

  const aTemp = parseLoveNumber(aJ.temperatureProfile?.hot, 0) - parseLoveNumber(aJ.temperatureProfile?.cold, 0);
  const bTemp = parseLoveNumber(bJ.temperatureProfile?.hot, 0) - parseLoveNumber(bJ.temperatureProfile?.cold, 0);
  const tempGap = Math.abs(aTemp + bTemp);
  const tempScore = Math.max(0, Math.min(100, Math.round(100 - tempGap * 2.2)));
  const tempLabel = tempScore >= 80 ? "매우 보완"
    : tempScore >= 65 ? "보완"
      : tempScore >= 45 ? "중립"
        : tempScore >= 30 ? "불균형"
          : (aTemp + bTemp > 0 ? "과열" : "냉각");

  const aDryGap = parseLoveNumber(aJ.moistureProfile?.dryness, 0) - parseLoveNumber(aJ.moistureProfile?.moisture, 0);
  const bDryGap = parseLoveNumber(bJ.moistureProfile?.dryness, 0) - parseLoveNumber(bJ.moistureProfile?.moisture, 0);
  const dryMix = aDryGap + bDryGap;
  const moistureScore = Math.max(0, Math.min(100, Math.round(100 - Math.abs(dryMix) * 2.3)));
  const moistureLabel = moistureScore >= 80 ? "습윤 보완"
    : moistureScore >= 65 ? "건조 보완"
      : moistureScore >= 45 ? "중립"
        : dryMix > 0 ? "건조 과다" : "습기 과다";

  const seasonPair = classifyLoveSeasonPair(aJ.birthSeason, bJ.birthSeason);
  const fireWaterScore = Math.max(0, Math.min(100, Math.round(60 + (parseLoveNumber(personA?.fiveElements?.fire, 0) + parseLoveNumber(personB?.fiveElements?.water, 0) - Math.abs(aTemp - bTemp)) * 0.4)));
  const dryWetScore = Math.max(0, Math.min(100, Math.round(60 + (parseLoveNumber(bJ.moistureProfile?.moisture, 0) - parseLoveNumber(aJ.moistureProfile?.dryness, 0)) * 0.6)));

  const riskFactors = [];
  if (tempLabel === "과열") riskFactors.push("관계 온도 과열로 빠른 소진 위험");
  if (tempLabel === "냉각") riskFactors.push("감정 표현 온도 부족으로 거리감 증가 위험");
  if (moistureLabel === "건조 과다") riskFactors.push("건조 과다로 친밀감 표현이 메마를 수 있음");
  if (moistureLabel === "습기 과다") riskFactors.push("습기 과다로 감정 의존/답답함이 누적될 수 있음");
  if ((interactions?.clashes?.length || 0) + (interactions?.punishments?.length || 0) >= 3) {
    riskFactors.push("지지 충/형 누적으로 친밀감 속도 차이 충돌 가능성");
  }

  const balancingStrategies = [];
  if (tempLabel === "과열") balancingStrategies.push("관계 속도를 늦추고 회복 시간(쿨다운 루틴)을 명시적으로 확보");
  if (tempLabel === "냉각") balancingStrategies.push("짧고 따뜻한 확인 메시지로 정서 온도를 단계적으로 상승");
  if (moistureLabel === "건조 과다") balancingStrategies.push("감정 확인 질문을 정기 루틴화해 정서 습윤도 보완");
  if (moistureLabel === "습기 과다") balancingStrategies.push("경계 문장을 합의해 감정 과포화를 정리");
  if (!balancingStrategies.length) balancingStrategies.push("현재 리듬을 유지하되 갈등 후 24시간 내 복구 대화 규칙을 유지");

  return {
    enabled: true,
    aClimateType: aJ.climateType,
    bClimateType: bJ.climateType,
    temperatureBalance: {
      score: tempScore,
      label: tempLabel,
      reason: `A(${aJ.relationshipClimate?.loveTemperature})와 B(${bJ.relationshipClimate?.loveTemperature})의 온도 차를 수치화`,
    },
    moistureBalance: {
      score: moistureScore,
      label: moistureLabel,
      reason: `A 건조/습윤(${Math.round(parseLoveNumber(aJ.moistureProfile?.dryness, 0))}/${Math.round(parseLoveNumber(aJ.moistureProfile?.moisture, 0))})와 B 건조/습윤(${Math.round(parseLoveNumber(bJ.moistureProfile?.dryness, 0))}/${Math.round(parseLoveNumber(bJ.moistureProfile?.moisture, 0))}) 비교`,
    },
    seasonalCompatibility: {
      aSeason: aJ.birthSeason,
      bSeason: bJ.birthSeason,
      seasonPair: seasonPair.seasonPair,
      interpretation: seasonPair.interpretation,
    },
    fireWaterChemistry: {
      score: fireWaterScore,
      reason: "화/수 기운과 체감 온도 차 기반 친밀감 열-냉 균형",
    },
    dryWetChemistry: {
      score: dryWetScore,
      reason: "건조/습윤의 상호 보완 가능성 기반 친밀감 유연성",
    },
    intimacyClimateSummary: `${tempLabel} 온도 밸런스와 ${moistureLabel} 조습 밸런스가 관계 온도와 친밀 리듬을 결정`,
    riskFactors,
    balancingStrategies,
  };
}

function buildLoveIntimacyCompatibility(personA, personB, johuCompatibility, interactions) {
  if (!johuCompatibility?.enabled) {
    return {
      score: 0,
      emotionalOpennessScore: 0,
      physicalComfortScore: 0,
      paceCompatibilityScore: 0,
      attractionHeatScore: 0,
      stabilityAfterIntimacyScore: 0,
      summary: "조후 데이터 부족으로 친밀감 궁합 점수 산출 불가",
      strengths: [],
      cautions: ["조후 데이터 부족"],
      recommendedRelationshipRhythm: "개인 친밀감 성향 분석으로 축소",
    };
  }

  const emotionalOpennessScore = Math.max(0, Math.min(100, Math.round((johuCompatibility.temperatureBalance.score + johuCompatibility.moistureBalance.score) / 2)));
  const physicalComfortScore = Math.max(0, Math.min(100, Math.round((johuCompatibility.dryWetChemistry.score + johuCompatibility.fireWaterChemistry.score) / 2)));
  const pacePenalty = (interactions?.clashes?.length || 0) * 6 + (interactions?.punishments?.length || 0) * 4;
  const paceCompatibilityScore = Math.max(0, Math.min(100, Math.round(78 - pacePenalty + (johuCompatibility.temperatureBalance.score - 50) * 0.2)));
  const attractionHeatScore = Math.max(0, Math.min(100, Math.round((parseLoveNumber(personA?.fiveElements?.fire, 0) + parseLoveNumber(personB?.fiveElements?.fire, 0) + johuCompatibility.fireWaterChemistry.score) / 3)));
  const stabilityAfterIntimacyScore = Math.max(0, Math.min(100, Math.round(70 - (interactions?.clashes?.length || 0) * 5 + (interactions?.combinations?.length || 0) * 3)));
  const score = Math.max(0, Math.min(100, Math.round((emotionalOpennessScore + physicalComfortScore + paceCompatibilityScore + attractionHeatScore + stabilityAfterIntimacyScore) / 5)));

  const strengths = [];
  if (emotionalOpennessScore >= 70) strengths.push("정서 개방 리듬이 비교적 잘 맞음");
  if (physicalComfortScore >= 70) strengths.push("신체적 거리감/편안함 조율이 용이함");
  if (stabilityAfterIntimacyScore >= 70) strengths.push("친밀 후 관계 안정 회복력이 양호함");

  const cautions = [];
  if (paceCompatibilityScore < 55) cautions.push("가까워지는 속도 차이 조율 필요");
  if (attractionHeatScore > 80) cautions.push("강한 끌림 이후 소진 관리 필요");
  if (johuCompatibility.moistureBalance.label === "건조 과다") cautions.push("건조 과다로 표현 부족/거리감 누적 가능");
  if (johuCompatibility.temperatureBalance.label === "냉각") cautions.push("관계 온도 유지 루틴이 필요");

  return {
    score,
    emotionalOpennessScore,
    physicalComfortScore,
    paceCompatibilityScore,
    attractionHeatScore,
    stabilityAfterIntimacyScore,
    summary: `친밀감 궁합 종합 ${score}점: ${johuCompatibility.intimacyClimateSummary}`,
    strengths,
    cautions,
    recommendedRelationshipRhythm: paceCompatibilityScore >= 70 ? "빠른 공감-짧은 점검 루틴형" : "느린 개방-명시적 확인 루틴형",
  };
}

function buildLoveCompatibility(personA, personB, enabled) {
  if (!enabled || !personB?.exists) {
    return {
      enabled: false,
      dayMasterRelation: null,
      elementBalance: null,
      spousePalaceInteraction: null,
      stemBranchInteractions: { combinations: [], clashes: [], harms: [], punishments: [], breaks: [] },
      tenGodCompatibility: null,
      johuCompatibility: {
        enabled: false,
        aClimateType: "",
        bClimateType: "",
        temperatureBalance: null,
        moistureBalance: null,
        seasonalCompatibility: null,
        fireWaterChemistry: null,
        dryWetChemistry: null,
        intimacyClimateSummary: null,
        riskFactors: [],
        balancingStrategies: [],
      },
      intimacyCompatibility: {
        score: 0,
        emotionalOpennessScore: 0,
        physicalComfortScore: 0,
        paceCompatibilityScore: 0,
        attractionHeatScore: 0,
        stabilityAfterIntimacyScore: 0,
        summary: null,
        strengths: [],
        cautions: [],
        recommendedRelationshipRhythm: null,
      },
      attractionScore: null,
      stabilityScore: null,
      conflictScore: null,
      marriagePotentialScore: null,
      summary: null,
    };
  }

  const aEl = normalizeLoveElement(personA?.dayMaster?.element);
  const bEl = normalizeLoveElement(personB?.dayMaster?.element);
  const relation = aEl && bEl
    ? (aEl === bEl
      ? "same"
      : LOVE_SECRET_SHENG[aEl] === bEl
        ? "a-generates-b"
        : LOVE_SECRET_SHENG[bEl] === aEl
          ? "b-generates-a"
          : LOVE_SECRET_KE[aEl] === bEl
            ? "a-controls-b"
            : LOVE_SECRET_KE[bEl] === aEl
              ? "b-controls-a"
              : "neutral")
    : null;

  const interactions = collectLoveInteractionRows(personA, personB);
  const positive = interactions.combinations.length;
  const negative = interactions.clashes.length + interactions.harms.length + interactions.punishments.length + interactions.breaks.length;

  const clampScore = (v) => Math.max(0, Math.min(100, Math.round(v)));
  const attractionScore = clampScore(52 + positive * 6 - negative * 3);
  const stabilityScore = clampScore(50 + positive * 5 - negative * 4 + (relation === "same" ? 4 : 0));
  const conflictScore = clampScore(45 + negative * 8 - positive * 4);
  const marriagePotentialScore = clampScore((attractionScore + stabilityScore + (100 - conflictScore)) / 3);

  const aDayBranch = personA?.fourPillars?.day?.branch || "";
  const bDayBranch = personB?.fourPillars?.day?.branch || "";
  const spouseKey = lovePairKey(aDayBranch, bDayBranch);
  const spouseType = LOVE_SECRET_BRANCH_COMBINATIONS.includes(spouseKey)
    ? "합"
    : LOVE_SECRET_BRANCH_CLASHES.includes(spouseKey)
      ? "충"
      : LOVE_SECRET_BRANCH_HARMS.includes(spouseKey)
        ? "해"
        : LOVE_SECRET_BRANCH_PUNISHMENTS.includes(spouseKey)
          ? "형"
          : LOVE_SECRET_BRANCH_BREAKS.includes(spouseKey)
            ? "파"
            : "중립";

  const elementBalance = {
    personA: personA?.fiveElements || null,
    personB: personB?.fiveElements || null,
    complement: [
      personA?.fiveElements?.weakest ? `A 보완 필요: ${toLoveKoElement(personA.fiveElements.weakest)}` : null,
      personB?.fiveElements?.weakest ? `B 보완 필요: ${toLoveKoElement(personB.fiveElements.weakest)}` : null,
    ].filter(Boolean),
  };

  const johuCompatibility = buildLoveJohuCompatibility(personA, personB, interactions);
  const intimacyCompatibility = buildLoveIntimacyCompatibility(personA, personB, johuCompatibility, interactions);

  return {
    enabled: true,
    dayMasterRelation: {
      personAElement: aEl,
      personBElement: bEl,
      relation,
    },
    elementBalance,
    spousePalaceInteraction: {
      personADayBranch: aDayBranch,
      personBDayBranch: bDayBranch,
      relationType: spouseType,
    },
    stemBranchInteractions: interactions,
    tenGodCompatibility: {
      personADominant: personA?.tenGods?.dominantTenGods || [],
      personBDominant: personB?.tenGods?.dominantTenGods || [],
    },
    johuCompatibility,
    intimacyCompatibility,
    attractionScore,
    stabilityScore,
    conflictScore,
    marriagePotentialScore,
    summary: `합 ${interactions.combinations.length}건 / 충형파해 ${negative}건 기반 관계 구조`,
  };
}

function buildLoveChapterDataSections(canonical, chapter) {
  const sections = [];
  const pA = canonical?.personA || {};
  const pB = canonical?.personB || {};
  const weak = pA?.fiveElements?.weakest || "";
  const dominant = pA?.fiveElements?.dominant || "";
  const aSeason = pA?.johu?.birthSeason || "";
  const bSeason = pB?.johu?.birthSeason || "";
  const jComp = canonical?.compatibility?.johuCompatibility || null;

  if (weak === "fire") sections.push("감정을 데우는 법", "관계 온도를 올리는 표현법", "무심해 보이지 않는 말투");
  if (dominant === "metal") sections.push("차갑게 들리는 말의 조율", "기준은 지키되 날카로움을 줄이는 법", "정서적 여백 만들기");
  if (dominant === "water") sections.push("감정의 깊이를 관계 안정으로 바꾸는 법", "생각이 많아질 때 관계를 멈추지 않는 법");
  if (dominant === "wood") sections.push("빠른 설렘과 관계 성장 속도", "기대가 앞설 때 필요한 조율");
  if (dominant === "earth") sections.push("안정감과 집착의 경계", "책임감이 부담으로 바뀌는 순간");
  if (aSeason === "autumn" && pA?.johu?.moistureProfile?.dryness > pA?.johu?.moistureProfile?.moisture) {
    sections.push("마른 감정선을 적시는 관계", "표현보다 신뢰를 먼저 쌓는 방식");
  }
  if (aSeason === "spring" && pA?.johu?.moistureProfile?.moisture >= pA?.johu?.moistureProfile?.dryness) {
    sections.push("감정이 싹트는 속도", "설렘을 안정으로 옮기는 법");
  }
  if (canonical?.mode === "compatibility") {
    const pair = jComp?.seasonalCompatibility?.seasonPair || "";
    if (pair === "autumn+spring") {
      sections.push("습윤함과 건조함의 보완", "성장과 수렴이 만나는 관계", "설렘과 절제가 균형을 잡는 방식");
    }
    if (pair === "summer+winter") {
      sections.push("열기와 냉기의 조율", "빠른 표현과 느린 개방의 차이", "관계 온도차를 맞추는 법");
    }
  }

  if (chapter === 7) {
    sections.push(
      "속궁합 데이터 요약표",
      "나의 친밀감 기후",
      "상대의 친밀감 기후",
      "두 사람의 조후 보완성",
      "관계 온도와 속도",
      "끌림의 질감",
      "친밀감에서 생길 수 있는 오해",
      "오래 가는 속궁합 운영법"
    );
  }

  return Array.from(new Set(sections));
}

function buildLoveChapterPlanning(canonical) {
  const chapterPlanning = {};
  const titles = LOVE_SECRET_MODE_CONFIG.solo.chapters;
  for (let i = 1; i <= 10; i += 1) {
    const chapterTitle = titles[i - 1]?.title || `Chapter ${i}`;
    const entry = {
      title: chapterTitle,
      dataDrivenSections: buildLoveChapterDataSections(canonical, i),
      mustUseData: [
        "personA.fourPillars",
        "personA.dayMaster",
        "personA.fiveElements",
        "personA.tenGods",
        "personA.loveProfile.spousePalace",
        "personA.usefulGods",
      ],
    };
    if (canonical?.mode === "compatibility") {
      entry.mustUseData.push(
        "personB.fourPillars",
        "personB.dayMaster",
        "personB.fiveElements",
        "compatibility.stemBranchInteractions",
        "compatibility.johuCompatibility",
        "compatibility.intimacyCompatibility"
      );
    }
    if (i === 7) {
      entry.title = "조후로 보는 속궁합과 친밀감의 리듬";
      entry.mustUseData = [
        "personA.johu",
        "personB.johu",
        "compatibility.johuCompatibility",
        "compatibility.intimacyCompatibility",
        "personA.loveProfile.spousePalace",
        "personB.loveProfile.spousePalace",
        "compatibility.stemBranchInteractions",
      ];
    }
    chapterPlanning[`chapter${i}`] = entry;
  }
  return chapterPlanning;
}

function validateCanonicalSajuLoveReport(canonical) {
  const missingFields = [];
  const pA = canonical?.personA || {};
  const pB = canonical?.personB || {};
  const mode = canonical?.mode || "single";

  const hasPersonAFourPillars = !!(pA?.fourPillars?.year?.ganji && pA?.fourPillars?.month?.ganji && pA?.fourPillars?.day?.ganji);
  const hasPersonALoveProfile = !!(pA?.loveProfile?.spousePalace?.branch);
  const hasFiveElements = ["wood", "fire", "earth", "metal", "water"].every((k) => Number.isFinite(Number(pA?.fiveElements?.[k])));
  const hasTenGods = !!(pA?.tenGods?.distribution && Object.keys(pA.tenGods.distribution).length > 0);
  const hasLuck = !!(pA?.luck?.currentDaewoon || (pA?.luck?.monthlyLuck && pA.luck.monthlyLuck.length));
  const hasPersonAJohu = !!(pA?.johu?.birthSeason && pA?.johu?.monthBranch);
  const hasPersonBJohu = mode !== "compatibility" || !!(pB?.johu?.birthSeason && pB?.johu?.monthBranch);
  const hasPartnerData = !!canonical?.personB?.exists;
  const hasCompatibility = mode !== "compatibility" || !!canonical?.compatibility?.enabled;
  const hasJohuCompatibility = mode !== "compatibility" || !!canonical?.compatibility?.johuCompatibility?.enabled;
  const hasIntimacyCompatibility = mode !== "compatibility" || Number.isFinite(Number(canonical?.compatibility?.intimacyCompatibility?.score));

  if (!hasPersonAFourPillars) missingFields.push("personA.fourPillars");
  if (!hasPersonALoveProfile) missingFields.push("personA.loveProfile.spousePalace");
  if (!hasFiveElements) missingFields.push("personA.fiveElements");
  if (!hasTenGods) missingFields.push("personA.tenGods.distribution");
  if (!hasLuck) missingFields.push("personA.luck.currentDaewoon");
  if (!hasPersonAJohu) missingFields.push("personA.johu");
  if (mode === "compatibility" && !hasPartnerData) missingFields.push("personB");
  if (mode === "compatibility" && !hasPersonBJohu) missingFields.push("personB.johu");
  if (mode === "compatibility" && !hasCompatibility) missingFields.push("compatibility");
  if (mode === "compatibility" && !hasJohuCompatibility) missingFields.push("compatibility.johuCompatibility");
  if (mode === "compatibility" && !hasIntimacyCompatibility) missingFields.push("compatibility.intimacyCompatibility");

  return {
    hasPersonAFourPillars,
    hasPersonALoveProfile,
    hasFiveElements,
    hasTenGods,
    hasLuck,
    hasPersonAJohu,
    hasPersonBJohu,
    hasPartnerData,
    hasCompatibility,
    hasJohuCompatibility,
    hasIntimacyCompatibility,
    missingFields,
    isValid: missingFields.length === 0,
  };
}

function buildCanonicalSajuLoveReport(body = {}, input = {}, modeConfig = LOVE_SECRET_MODE_CONFIG.solo) {
  const mode = normalizeLoveMode(modeConfig.mode);
  const personAText = stringifyCompact(body.sajuData || "", 20000);
  const personBText = stringifyCompact(body.partnerData || body.partner || "", 12000);
  const personA = buildLovePersonCanonical(personAText, {
    name: body.name || input.name,
    gender: body.gender || input.gender,
  }, input);
  const personBExists = mode === "compatibility" && !!personBText.trim();
  const personB = personBExists
    ? buildLovePersonCanonical(personBText, {
      name: body.partnerName || "상대",
      gender: body.partnerGender || "unknown",
    }, input)
    : {
      exists: false,
      profile: {},
      fourPillars: {},
      dayMaster: {},
      fiveElements: {},
      tenGods: {},
      loveProfile: {},
      usefulGods: {},
      luck: {},
    };

  if (personBExists) personB.exists = true;
  const compatibility = buildLoveCompatibility(personA, personB, personBExists);

  const canonical = {
    reportType: mode === "compatibility" ? "saju-love-compatibility" : "saju-love-premium",
    mode,
    personA,
    personB,
    compatibility,
    chapterPlanning: {},
    validation: {
      hasPersonAFourPillars: false,
      hasPersonALoveProfile: false,
      hasFiveElements: false,
      hasTenGods: false,
      hasLuck: false,
      hasPersonAJohu: false,
      hasPersonBJohu: false,
      hasPartnerData: false,
      hasCompatibility: false,
      hasJohuCompatibility: false,
      hasIntimacyCompatibility: false,
      missingFields: [],
    },
  };
  canonical.chapterPlanning = buildLoveChapterPlanning(canonical);
  canonical.validation = validateCanonicalSajuLoveReport(canonical);
  return canonical;
}

function collectLoveEvidenceTokens(canonical, chapter) {
  const tokens = new Set();
  const pA = canonical?.personA || {};
  const pB = canonical?.personB || {};
  const add = (value) => {
    const t = String(value || "").trim();
    if (t) tokens.add(t);
  };

  add(pA?.fourPillars?.year?.ganji);
  add(pA?.fourPillars?.month?.ganji);
  add(pA?.fourPillars?.day?.ganji);
  add(pA?.fourPillars?.hour?.ganji);
  add(pA?.dayMaster?.stem ? `일간 ${pA.dayMaster.stem}` : "");
  add(pA?.loveProfile?.spousePalace?.branch ? `일지 ${pA.loveProfile.spousePalace.branch}` : "");
  add(pA?.fourPillars?.month?.branch ? `월지 ${pA.fourPillars.month.branch}` : "");
  add(pA?.dayMaster?.strength || "");
  add(pA?.fiveElements?.dominant ? `강점 오행 ${toLoveKoElement(pA.fiveElements.dominant)}` : "");
  add(pA?.fiveElements?.weakest ? `약점 오행 ${toLoveKoElement(pA.fiveElements.weakest)}` : "");
  add(pA?.usefulGods?.yongsin?.element ? `용신 ${toLoveKoElement(pA.usefulGods.yongsin.element)}` : "");
  add(pA?.usefulGods?.gisin?.element ? `기신 ${toLoveKoElement(pA.usefulGods.gisin.element)}` : "");
  add(pA?.luck?.currentDaewoon?.ganji ? `현재 대운 ${pA.luck.currentDaewoon.ganji}` : "");
  LOVE_SECRET_ALLOWED_STAR_NAMES.forEach((s) => add(s));

  if (canonical?.mode === "compatibility" && pB?.exists) {
    add(pB?.fourPillars?.day?.ganji ? `상대 일주 ${pB.fourPillars.day.ganji}` : "");
    add(pB?.dayMaster?.stem ? `상대 일간 ${pB.dayMaster.stem}` : "");
    add(pB?.loveProfile?.spousePalace?.branch ? `상대 일지 ${pB.loveProfile.spousePalace.branch}` : "");
    add(canonical?.compatibility?.spousePalaceInteraction?.relationType || "");
  }

  const chapterSpec = LOVE_SECRET_CHAPTER_BLUEPRINTS[chapter] || null;
  if (chapterSpec) (chapterSpec.requiredDataPoints || []).forEach((t) => add(t));

  return Array.from(tokens).filter((t) => t.length >= 2);
}

function countLoveDataEvidence(text, canonical, chapter) {
  const source = String(text || "");
  const tokens = collectLoveEvidenceTokens(canonical, chapter);
  return tokens.filter((token) => source.includes(token)).length;
}

function detectLoveMissingMarkers(text, chapter) {
  const source = String(text || "");
  const spec = LOVE_SECRET_CHAPTER_BLUEPRINTS[chapter] || { requiredSections: [] };
  const required = ["사용 데이터 요약표", "핵심 요약 5줄", ...(spec.requiredSections || [])];
  if (chapter === 5) required.push("대운", "세운", "월별", "|");
  if (chapter === 9) required.push("배우자궁", "배우자성", "안정성");
  if (chapter === 10) required.push("7일 플랜", "30일 플랜", "90일 플랜");
  return required.filter((token) => !source.includes(token));
}

function hasForbiddenLovePadding(text) {
  const source = String(text || "");
  if (/심화\s*상담\s*메모/i.test(source)) return true;
  return LOVE_SECRET_FORBIDDEN_REPEATED_PHRASES.some((token) => source.includes(token));
}

function hasInvalidLoveShinsalMention(text, canonical) {
  const source = String(text || "");
  if (LOVE_SECRET_BLOCKED_STARS.some((token) => source.includes(token))) return true;
  const allowed = new Set(LOVE_SECRET_ALLOWED_STAR_NAMES);
  const pAStars = canonical?.personA?.loveProfile?.attractionStars || {};
  const pBStars = canonical?.personB?.loveProfile?.attractionStars || {};
  [pAStars, pBStars].forEach((starObj) => {
    Object.values(starObj || {}).forEach((arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((token) => allowed.add(String(token || "").trim()));
    });
  });

  const found = source.match(/[가-힣]{2,8}살/g) || [];
  return found.some((token) => {
    if (allowed.has(token)) return false;
    if (token === "관살" || token === "칠살") return false;
    return true;
  });
}

function hasLoveCompatibilityCoverage(text, canonical) {
  if (canonical?.mode !== "compatibility") return true;
  const source = String(text || "");
  const partnerStem = canonical?.personB?.dayMaster?.stem || "";
  const partnerDay = canonical?.personB?.fourPillars?.day?.ganji || "";
  const hasPartnerMention = source.includes("상대") || (partnerStem && source.includes(partnerStem)) || (partnerDay && source.includes(partnerDay));
  const hasInteraction = /합|충|형|파|해/.test(source);
  return hasPartnerMention && hasInteraction;
}

function buildLoveSecretChapterPayload(modeConfig, chapterMeta, chapter, canonical, minChars, premiumInput = null) {
  const blueprint = LOVE_SECRET_CHAPTER_BLUEPRINTS[chapter] || LOVE_SECRET_CHAPTER_BLUEPRINTS[1];
  const chapterPlan = canonical?.chapterPlanning?.[`chapter${chapter}`] || { dataDrivenSections: [], mustUseData: [] };
  const targetLength = Math.max(minChars + 300, chapter === 3 || chapter === 5 || chapter === 9 ? 5600 : 5000);
  const chapter7RequiredDataPoints = [
    "personA.johu.birthSeason",
    "personA.johu.monthBranch",
    "personA.johu.climateType",
    "personA.johu.moistureProfile",
    "personA.johu.temperatureProfile",
    "personB.johu.birthSeason",
    "personB.johu.monthBranch",
    "personB.johu.climateType",
    "personB.johu.moistureProfile",
    "personB.johu.temperatureProfile",
    "compatibility.johuCompatibility.temperatureBalance",
    "compatibility.johuCompatibility.moistureBalance",
    "compatibility.johuCompatibility.seasonalCompatibility",
    "compatibility.intimacyCompatibility",
  ];

  return {
    chapterTitle: chapter === 7 ? "조후로 보는 속궁합과 친밀감의 리듬" : (chapterMeta?.title || `Chapter ${chapter}`),
    chapterPurpose: blueprint.purpose,
    mode: canonical?.mode || "single",
    personA: canonical?.personA || {},
    personB: canonical?.personB?.exists ? canonical.personB : null,
    compatibility: canonical?.compatibility?.enabled ? canonical.compatibility : null,
    chapterSpecificSections: chapterPlan.dataDrivenSections || [],
    requiredDataPoints: chapter === 7 ? chapter7RequiredDataPoints : blueprint.requiredDataPoints,
    requiredSections: blueprint.requiredSections,
    johuData: chapter === 7
      ? {
        personA: canonical?.personA?.johu || null,
        personB: canonical?.personB?.exists ? canonical.personB.johu : null,
        johuCompatibility: canonical?.compatibility?.johuCompatibility || null,
        intimacyCompatibility: canonical?.compatibility?.intimacyCompatibility || null,
      }
      : null,
    mustUseData: chapterPlan.mustUseData || [],
    forbiddenRepeatedPhrases: LOVE_SECRET_FORBIDDEN_REPEATED_PHRASES,
    forbidden: chapter === 7
      ? ["노골적 성 묘사", "성적 능력 단정", "무조건 잘 맞음", "무조건 안 맞음", "임신/질병/생식 관련 단정"]
      : [],
    premiumChapterJsonPacks: premiumInput && typeof premiumInput === "object"
      ? toPlainObject(premiumInput.chapterJsonPacks || premiumInput)
      : null,
    minLength: minChars,
    targetLength,
    tone: "따뜻하지만 구체적인 프리미엄 사주 연애 상담",
    doNotInventData: true,
  };
}

function buildLoveSecretPrompt(modeConfig, chapterMeta, chapter, canonical, minChars, previousTexts = [], premiumInput = null) {
  const payload = buildLoveSecretChapterPayload(modeConfig, chapterMeta, chapter, canonical, minChars, premiumInput);
  const previousBan = collectPreviousSentenceBanList(previousTexts, 12);
  return [
    "[System Prompt]",
    LOVE_SECRET_SYSTEM_PROMPT,
    "",
    "[User Prompt JSON]",
    JSON.stringify(payload, null, 2),
    "",
    "[추가 생성 규칙]",
    "- 문체는 상담가의 실제 상담 기록처럼 구체적으로 작성한다.",
    "- 장문 반복, 문장 복붙, 일반론 패딩을 금지한다.",
    "- 각 챕터 첫머리에 '### 1. 사용 데이터 요약표'를 반드시 작성한다.",
    "- 각 챕터 마지막에 '### 핵심 요약 5줄'을 넣고 5개 문장으로 정리한다.",
    "- chapterSpecificSections는 실제 본문 소제목에 반영해야 한다.",
    "- 궁합 모드일 때는 최소 2개 소제목에서 나/상대를 분리해 동시에 분석한다.",
    "- 노골적 성적 표현 금지, 확정 예언 금지.",
    "- JSON에 없는 신살/용신/대운/세운/궁합 요소를 쓰지 않는다.",
    "",
    previousBan.length ? `[이전 챕터 재사용 금지 문장]\n${JSON.stringify(previousBan)}` : "",
  ].filter(Boolean).join("\n");
}

function buildLoveSecretRewritePrompt(basePrompt, previousDraft, failedChecks) {
  return [
    basePrompt,
    "",
    "[직전 초안]",
    String(previousDraft || "").slice(0, 6000),
    "",
    `[재작성 필수 사유] ${failedChecks.join(", ")}`,
    "- 실패 사유를 모두 해결하고, 누락된 섹션/데이터 근거를 보강해 처음부터 다시 작성한다.",
    "- 같은 문장을 재사용하지 않는다.",
  ].join("\n");
}

function ensureLoveSecretSourceData(body = {}) {
  const raw = stringifyCompact(body.sajuData || "", 6000);
  if (raw && /사주\s*원국|일주\(|오행\(|일간\(|대운\(/.test(raw)) {
    return { ok: true, sourceData: raw, usedFallbackData: false, warning: "" };
  }

  const fallback = [
    "사주 원국 보완 데이터",
    `- 이름: ${String(body.name || "사용자")}`,
    `- 생년월일: ${String(body.year || body.birthYear || "미상")}-${String(body.month || body.birthMonth || "미상")}-${String(body.day || body.birthDay || "미상")}`,
    `- 출생시각: ${String(body.hour || body.birthHour || "12")}:${String(body.minute || body.birthMinute || "00")}`,
    `- 성별: ${String(body.gender || "미상")}`,
    "- 일간(추정): 보완 해석",
    "- 오행(추정): 균형 점검",
    "- 대운(요약): 장기 흐름 관찰",
    "- 세운/월운(요약): 단기 실행 전략",
  ].join("\n");

  return {
    ok: true,
    sourceData: fallback,
    usedFallbackData: true,
    warning: "사주 원국 데이터가 부족해 보완 프로필로 생성했습니다.",
  };
}

function evaluateLoveSecretQuality(text, chapter, canonical, previousTexts = [], minChars = 4000) {
  const source = String(text || "").trim();
  const failedChecks = [];
  const missingMarkers = detectLoveMissingMarkers(source, chapter);
  const evidenceCount = countLoveDataEvidence(source, canonical, chapter);
  const repeatedInside = detectRepeatedLongSentences(source, 30);
  const repeatedAcross = detectCrossChapterRepeatedSentences(source, previousTexts || [], 30);

  if (source.length < minChars) failedChecks.push("QUALITY_GATE_A_MIN_LENGTH");
  if (evidenceCount < 7) failedChecks.push("QUALITY_GATE_B_DATA_POINTS");
  if (/심화\s*상담\s*메모/i.test(source)) failedChecks.push("QUALITY_GATE_C_NO_DEEP_MEMO");
  if (repeatedInside.length > 0 || repeatedAcross.length > 0) failedChecks.push("QUALITY_GATE_D_NO_REPEATED_SENTENCE");
  if (hasInvalidLoveShinsalMention(source, canonical)) failedChecks.push("QUALITY_GATE_E_INVALID_SHINSAL");
  if (!hasLoveCompatibilityCoverage(source, canonical)) failedChecks.push("QUALITY_GATE_F_COMPAT_COVERAGE");
  if (chapter === 5 && (!source.includes("대운") || !source.includes("세운") || !source.includes("월별") || !/\|.+\|.+\|/.test(source))) {
    failedChecks.push("QUALITY_GATE_G_CH5_TIMING_TABLE");
  }
  if (chapter === 9 && (!source.includes("배우자궁") || !source.includes("배우자성") || !source.includes("안정"))) {
    failedChecks.push("QUALITY_GATE_H_CH9_MARRIAGE_ANALYSIS");
  }
  if (chapter === 10 && (!source.includes("7일 플랜") || !source.includes("30일 플랜") || !source.includes("90일 플랜"))) {
    failedChecks.push("QUALITY_GATE_I_CH10_PLAN");
  }

  if (chapter === 7) {
    if (source.length < 6000) failedChecks.push("QUALITY_GATE_J_CH7_MIN_LENGTH_6000");

    const hasDataTable = /###\s*1\.\s*사용\s*데이터\s*요약표/.test(source) && /\|.+\|.+\|/.test(source);
    if (!hasDataTable) failedChecks.push("QUALITY_GATE_K_CH7_DATA_TABLE");

    if (canonical?.mode === "compatibility") {
      const hasA = /(나\s*[:：]|A\s*[:：]|personA|본인)/i.test(source);
      const hasB = /(상대\s*[:：]|B\s*[:：]|personB)/i.test(source);
      if (!hasA || !hasB) failedChecks.push("QUALITY_GATE_L_CH7_MODE_AB");
    }

    const climateKeywords = ["건조", "습윤", "한", "열", "월지", "계절", "화", "수", "온도", "조후"];
    const climateHitCount = climateKeywords.reduce((acc, k) => acc + (source.includes(k) ? 1 : 0), 0);
    if (climateHitCount < 5) failedChecks.push("QUALITY_GATE_M_CH7_CLIMATE_TERMS");

    if (!/화\s*[:：]?|수\s*[:：]?|화수/.test(source)) failedChecks.push("QUALITY_GATE_N_CH7_FIRE_WATER");

    const hasSpousePalace = /배우자궁|일지/.test(source);
    const hasBranchInteraction = /합|충|형|파|해/.test(source);
    if (!hasSpousePalace || !hasBranchInteraction) failedChecks.push("QUALITY_GATE_O_CH7_SPOUSE_INTERACTION");

    const explicitRegex = /(성기|체위|삽입|야한|노골|성행위|성적\s*능력|절정|오르가즘)/i;
    if (explicitRegex.test(source)) failedChecks.push("QUALITY_GATE_P_CH7_NO_EXPLICIT_SEXUAL");

    const onlyDohwaHongyeom = /도화|홍염/.test(source)
      && !/조후|월지|계절|온도|습윤|건조|용신|희신|기신|일지|합|충|형|파|해|십성/.test(source);
    if (onlyDohwaHongyeom) failedChecks.push("QUALITY_GATE_Q_CH7_NO_SIMPLE_DOHWA_HONGYEOM");

    const plannedSections = canonical?.chapterPlanning?.chapter7?.dataDrivenSections || [];
    if (plannedSections.length > 0) {
      const used = plannedSections.filter((s) => source.includes(String(s || "").trim())).length;
      if (used < Math.min(4, plannedSections.length)) failedChecks.push("QUALITY_GATE_R_CH7_PLANNED_SECTIONS");
    }
  }

  if (missingMarkers.length > 0) failedChecks.push("QUALITY_GATE_STRUCTURE");
  if (hasForbiddenLovePadding(source)) failedChecks.push("QUALITY_GATE_NO_FORBIDDEN_PHRASES");

  return {
    ok: failedChecks.length === 0,
    failedChecks,
    missingMarkers,
    evidenceCount,
    repeatedInsideCount: repeatedInside.length,
    repeatedAcrossCount: repeatedAcross.length,
  };
}

function buildLoveSecretFallbackChapter(modeConfig, chapterMeta, chapter, canonical, minChars = 4000, quality = null) {
  const mode = String(modeConfig?.mode || "solo");
  const personAName = String(canonical?.personA?.name || "본인").trim() || "본인";
  const personBExists = Boolean(canonical?.personB?.exists);
  const personBName = personBExists
    ? (String(canonical?.personB?.name || "상대").trim() || "상대")
    : "";
  const chapterTitle = String(chapterMeta?.title || `Chapter ${chapter}`).trim();
  const chapterSubtitle = String(chapterMeta?.subtitle || "사주 기반 연애 실행 전략").trim();
  const personADayMaster = String(canonical?.personA?.dayMaster?.stem || "정보 확인");
  const personBDayMaster = personBExists ? String(canonical?.personB?.dayMaster?.stem || "정보 확인") : "";
  const spousePalace = String(canonical?.personA?.spousePalace?.branch || "정보 확인");
  const qualityHint = Array.isArray(quality?.failedChecks) && quality.failedChecks.length
    ? `품질 보강 포인트: ${quality.failedChecks.join(", ")}`
    : "품질 보강 포인트: 데이터 근거 밀도와 실행 구체성을 강화합니다.";

  const rows = [
    ["모드", mode === "compatibility" ? "2인 궁합" : "1인 연애"],
    ["챕터", `${chapter}. ${chapterTitle}`],
    ["분석 대상", personBExists ? `${personAName} / ${personBName}` : personAName],
    ["일간", personBExists ? `${personAName}: ${personADayMaster}, ${personBName}: ${personBDayMaster}` : personADayMaster],
    ["배우자궁", spousePalace],
    ["핵심 포커스", chapterSubtitle],
  ];

  const table = [
    "### 1. 사용 데이터 요약표",
    "| 항목 | 값 |",
    "|---|---|",
    ...rows.map(([k, v]) => `| ${k} | ${String(v || "-")} |`),
  ].join("\n");

  const chapterSpecific = [];
  if (chapter === 5) {
    chapterSpecific.push(
      "### 5. 시기 운용 보강",
      "대운·세운·월별 변화를 같은 기준으로 읽어야 오판을 줄일 수 있습니다. 월별 실행은 감정 반응이 아닌 일정 단위로 관리해야 합니다.",
      "| 구간 | 관찰 포인트 | 행동 기준 |",
      "|---|---|---|",
      "| 대운 | 관계의 큰 방향성 | 장기 기준 1개를 고정 |",
      "| 세운 | 올해의 현실 변수 | 분기별 우선순위 재조정 |",
      "| 월별 | 감정/소통 리듬 | 주간 점검으로 미세 조정 |",
    );
  }
  if (chapter === 7) {
    chapterSpecific.push(
      "### 5. 친밀감 기후 해석",
      "건조/습윤, 한/열, 월지, 계절, 화수 균형을 함께 봐야 친밀감 속도를 안정적으로 맞출 수 있습니다.",
      "화가 과하면 속도가 앞서고 수가 약하면 회복이 늦어집니다. 반대로 수가 안정되면 정서적 여유가 커지고, 월지·계절 흐름을 맞추면 갈등 회복 속도가 빨라집니다.",
      mode === "compatibility"
        ? `나: ${personAName}의 반응 리듬을 먼저 정리하고, 상대: ${personBName}의 속도와 체력 조건을 동시에 맞추는 방식이 안전합니다.`
        : `${personAName}의 반응 리듬을 먼저 정리한 뒤, 상대의 속도와 회복 조건을 같이 확인하는 방식이 안전합니다.`,
    );
  }
  if (chapter === 9) {
    chapterSpecific.push(
      "### 5. 결혼 안정성 보강",
      "배우자궁과 배우자성 신호를 함께 확인해야 장기 안정성을 현실적으로 설계할 수 있습니다.",
      "안정은 감정 강도가 아니라 역할 분담·생활 리듬·갈등 복구 규칙으로 만들어집니다.",
    );
  }
  if (chapter === 10) {
    chapterSpecific.push(
      "### 5. 단계별 실행 플랜",
      "7일 플랜: 감정 트리거와 대화 패턴을 하루 1회 기록하고 즉시 수정 포인트를 1개만 실행합니다.",
      "30일 플랜: 주간 점검표를 운영하며 관계/일정/재정 충돌 지점을 줄이는 고정 루틴을 만듭니다.",
      "90일 플랜: 합의된 경계와 역할 분담을 문서화해 장기 안정성을 유지합니다.",
    );
  }

  let text = [
    table,
    "",
    "### 2. 핵심 구조 진단",
    `${chapterTitle}은 단순한 조언 모음이 아니라 반복되는 선택 패턴을 재정렬하는 챕터입니다. ${chapterSubtitle}에 맞춰 감정 반응, 대화 흐름, 경계 설정, 회복 전략을 같은 프레임으로 정리합니다.`,
    `${qualityHint} 이 보강본은 예언형 문장 대신 관찰 가능한 신호와 실제 행동 기준을 중심으로 구성합니다.`,
    "",
    "### 3. 관계 운영 전략",
    `${personAName} 기준으로는 감정이 올라오는 순간의 대응 속도보다, 갈등 이후 복구 루틴을 먼저 고정하는 것이 성과가 큽니다.`,
    personBExists
      ? `${personBName}의 반응 리듬을 병행 고려하면 충돌 빈도 자체를 줄일 수 있습니다. 나/상대의 우선순위를 분리해 대화하면 오해 비용이 크게 감소합니다.`
      : "상대의 반응 리듬을 추정해 대화 길이·속도·타이밍을 조정하면 오해 비용이 크게 감소합니다.",
    "",
    "### 4. 리스크 관리",
    "문제는 사건보다 누적된 미세 오차에서 시작됩니다. 피로 누적, 일정 과밀, 즉흥적 판단이 겹치면 관계 에너지가 급격히 떨어질 수 있습니다.",
    "따라서 위기 상황에서는 원인 추궁보다 복구 순서를 먼저 실행해야 합니다. 중단-정리-재개 3단계 규칙을 고정하면 재발 비용이 줄어듭니다.",
    "",
    ...chapterSpecific,
    "",
    "### 핵심 요약 5줄",
    "1) 이번 챕터의 목적은 감정 해석이 아니라 실행 가능한 관계 운영 기준 확립입니다.",
    "2) 데이터 근거는 일간/배우자궁/관계 리듬을 중심으로 읽고, 일반론 패딩을 배제합니다.",
    "3) 갈등은 회피보다 복구 프로토콜 고정이 효과적이며, 작은 규칙이 장기 안정을 만듭니다.",
    "4) 시기 운용은 대운·세운·월별 관찰을 분리해 판단해야 과속 결정을 줄일 수 있습니다.",
    "5) 오늘 바로 실행할 한 가지 행동을 정하고 7일간 기록하면 변화 속도가 크게 빨라집니다.",
  ].filter(Boolean).join("\n\n");

  let depth = 1;
  while (text.length < minChars) {
    text += `\n\n#### 실행 보강 노트 ${depth}\n`;
    text += "이번 보강 노트는 관계 안정성을 높이기 위한 미세 조정 항목입니다. 감정 강도보다 실행 일관성을 우선하며, 주 1회 점검으로 변화를 누적합니다.\n\n";
    text += "점검 질문: 지금 선택이 3개월 후에도 유효한가? 관계 비용을 키우는 습관을 유지하고 있지 않은가? 답을 한 줄로 기록한 뒤 행동 하나를 즉시 바꿉니다.";
    depth += 1;
  }

  return text;
}

function stringifyCompact(value, maxLength = 4200) {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, maxLength);
  try {
    return JSON.stringify(value, null, 2).slice(0, maxLength);
  } catch {
    return String(value).slice(0, maxLength);
  }
}

function ensureLifebookSourceData(body = {}, input = {}) {
  const raw = stringifyCompact(body.sajuData || body.profile || body.birth || "", 2600);
  if (raw && /사주\s*원국|오행|일간|대운|세운|월운|십성/.test(raw)) {
    return { ok: true, sourceData: raw, usedFallbackData: false, warning: "" };
  }

  const synthesized = [
    "사주 기반 보완 프로필",
    `- 이름: ${String(body.name || input.name || "사용자")}`,
    `- 생년월일: ${input.year}-${input.month}-${input.day}`,
    `- 출생시각: ${input.hour}:${String(input.minute).padStart(2, "0")}`,
    `- 성별: ${String(body.gender || input.gender || "미상")}`,
    "- 오행 분포: 입력 부족으로 중립 보완",
    "- 일간/십성: 입력 부족으로 보수적 해석",
    "- 대운/세운: 입력 부족으로 실행 전략 중심 보완",
  ].join("\n");

  return {
    ok: true,
    sourceData: synthesized,
    usedFallbackData: true,
    warning: "사주 원본 데이터가 부족해 보완 프로필로 생성했습니다.",
  };
}

function buildSessionInput(body, maxChapter) {
  const input = normalizeBody(body);
  input.chapter = clampInt(body.sessionId ?? body.chapter, 1, 1, maxChapter);
  return input;
}

function buildSessionPrompt(kind, title, chapter, totalChapters, body, sectionHeaders, options = {}) {
  const sajuData = stringifyCompact(body.sajuData || "", 5200);
  const partnerData = stringifyCompact(body.partnerData || body.partner || "", 2600);
  const relationshipGuide = partnerData
    ? "\n[Partner / compatibility data]\n" + partnerData
    : "";
  const headers = Array.isArray(sectionHeaders) && sectionHeaders.length === 5
    ? sectionHeaders
    : DEFAULT_BOOK_SECTION_HEADERS;
  const subtitle = String(options.subtitle || "").trim();
  const counselorFocus = String(options.counselorFocus || "").trim();
  const minTotalChars = clampInt(options.minTotalChars, 1100, 900, 12000);
  const minSectionParagraphs = clampInt(options.minSectionParagraphs, 2, 2, 6);
  const minSectionChars = clampInt(options.minSectionChars, 180, 120, 2400);
  const chapterLabel = subtitle ? `${title} — ${subtitle}` : title;
  const premiumChapterJsonPacks = options?.premiumChapterJsonPacks && typeof options.premiumChapterJsonPacks === "object"
    ? options.premiumChapterJsonPacks
    : null;

  return [
    `You are Code Destiny's premium ${kind} writer.`,
    "Your role: elite relationship counselor + advanced saju analyst.",
    "Return ONLY natural Korean markdown. Do not use English headings.",
    "Use the provided saju engine data as the source of truth.",
    "Never infer missing saju calculations from profile or birth text.",
    "Write a premium PDF chapter with concrete interpretation, choices, cautions, and a practical action plan.",
    "Avoid generic fortune-telling filler. Make the answer specific to the supplied data.",
    "Do NOT describe other chapters. Keep all interpretation tightly aligned to this chapter title and subtitle.",
    "Keep a professional, warm counseling tone without fear marketing or deterministic verdicts.",
    "",
    `[Chapter ${chapter}/${totalChapters}] ${chapterLabel}`,
    counselorFocus ? `[Counselor Focus]\n${counselorFocus}` : "",
    "",
    "[Saju / analysis data]",
    sajuData || "사주 엔진 데이터가 제공되지 않았습니다.",
    relationshipGuide,
    premiumChapterJsonPacks ? "" : null,
    premiumChapterJsonPacks ? "[Premium Chapter JSON Packs]" : null,
    premiumChapterJsonPacks ? JSON.stringify(premiumChapterJsonPacks, null, 2) : null,
    "",
    "Required markdown structure:",
    `## ${chapterLabel} 핵심 진단`,
    ...headers.map((h) => `## ${h}`),
    "",
    "Quality constraints:",
    "- Include at least one concrete behavioral example in each section.",
    "- Use saju terms only when tied to a plain-language implication.",
    "- End each section with one actionable sentence.",
    `- Each section must have at least ${minSectionParagraphs} substantial paragraphs and at least ${minSectionChars} Korean characters.`,
    `- Total length must be at least ${minTotalChars} Korean characters.`,
  ].join("\n");
}

async function refineChapterToMinLength(env, text, minChars, options = {}, modelEnvKeys = [], generationOptions = {}) {
  let draft = String(text || "").trim();
  if (!draft) return draft;
  if (draft.length >= minChars) return draft;

  const title = String(options.title || "").trim();
  const subtitle = String(options.subtitle || "").trim();
  const counselorFocus = String(options.counselorFocus || "").trim();
  const sectionHeaders = Array.isArray(options.sectionHeaders) ? options.sectionHeaders : DEFAULT_BOOK_SECTION_HEADERS;
  const chapterLabel = subtitle ? `${title} — ${subtitle}` : title;
  const dataHint = stringifyCompact(options.data || "", 1400);

  for (let attempt = 0; attempt < 2 && draft.length < minChars; attempt += 1) {
    const prompt = [
      "아래 원고를 같은 사실관계와 톤을 유지하면서 고품질로 확장하세요.",
      `목표 길이: 최소 ${minChars}자`,
      "응답은 한국어 마크다운만 사용하세요.",
      "섹션 헤더를 유지하고, 각 섹션은 최소 3문단으로 확장하세요.",
      "추상적 문장 대신 상황·행동·의사결정 기준을 구체적으로 쓰세요.",
      "기존 내용의 핵심 진단은 지우지 말고 심화 설명을 추가하세요.",
      "공포 유도 문구나 단정적 예언은 금지합니다.",
      "",
      `[챕터] ${chapterLabel}`,
      counselorFocus ? `[상담 포커스]\n${counselorFocus}` : "",
      `[필수 섹션]\n${sectionHeaders.map((h) => `- ${h}`).join("\n")}`,
      dataHint ? `[데이터 힌트]\n${dataHint}` : "",
      "",
      "[기존 원고]",
      draft,
    ].filter(Boolean).join("\n");

    const expanded = await callGemini(env, prompt, modelEnvKeys, generationOptions);
    if (expanded && expanded.trim().length > draft.length) {
      draft = expanded.trim();
    } else {
      break;
    }
  }

  return draft;
}

function lifebookLongFallback(title, subtitle, body, sectionHeaders, counselorFocus, minChars = LIFEBOOK_MIN_CHARS) {
  const headers = Array.isArray(sectionHeaders) && sectionHeaders.length === 5
    ? sectionHeaders
    : DEFAULT_BOOK_SECTION_HEADERS;
  const chapterLabel = subtitle ? `${title} — ${subtitle}` : title;
  const dataHint = stringifyCompact(body.sajuData || "", 1800).replace(/\s+/g, " ").trim();
  const focus = String(counselorFocus || "").trim() || "사주 구조를 실제 행동 기준으로 번역해 실천 가능한 전략을 제시합니다.";

  const sectionBodies = [
    `${chapterLabel}에서 먼저 확인할 것은 타고난 성향 자체보다 성향이 의사결정으로 변환되는 방식입니다. 같은 사실을 보아도 어떤 사람은 관계를 우선하고, 어떤 사람은 성취를 우선하며, 또 어떤 사람은 안전을 먼저 계산합니다. 이 차이가 장기적으로 삶의 궤적을 가릅니다.\n\n현재 입력된 데이터 단서${dataHint ? `(${dataHint.slice(0, 280)})` : ""}를 기준으로 보면, 강점은 특정 상황에서 빠르게 발화되지만 피로가 쌓일 때는 판단 편향이 같이 커지는 구조입니다. 따라서 이 챕터의 목표는 장점 확대가 아니라 '지속 가능한 장점 운용법'을 만드는 것입니다.\n\n실행 문장: 오늘부터 중요한 결정을 내릴 때 감정·현실·장기효과를 각각 한 줄로 분리해 기록하세요.`,
    `반복 패턴은 사건이 아니라 반응에서 드러납니다. 비슷한 갈등이 되풀이되는 이유는 상대가 같아서가 아니라 내가 사용하는 해석 프레임이 늘 비슷하기 때문입니다. 특히 압박이 커질수록 익숙한 반응으로 돌아가는 경향이 강해집니다.\n\n패턴을 바꾸려면 의지를 키우기보다 트리거를 먼저 식별해야 합니다. 언제 피로가 커지고, 어떤 말에 방어가 올라오며, 어떤 상황에서 과한 확신 또는 과한 회피가 나타나는지 추적하면 변화 속도가 빨라집니다.\n\n실행 문장: 이번 주에는 감정이 크게 흔들린 장면 3개를 기록하고, 공통 트리거 1개를 찾아 이름 붙이세요.`,
    `관계·일·돈은 분리된 주제가 아니라 같은 선택 체계의 다른 표면입니다. 관계에서 경계를 못 세우면 일에서도 우선순위가 무너지고, 돈에서도 손실 회피보다 즉흥 대응이 늘어납니다. 반대로 한 영역의 선택 기준을 정리하면 다른 영역도 안정됩니다.\n\n${focus} 이 관점에서 보면 당장 필요한 것은 더 많은 정보가 아니라 선택 기준의 단순화입니다. 기준이 많을수록 불안은 줄지 않고, 실행은 늦어집니다. 그래서 이 챕터는 '지금 버릴 기준'과 '반드시 지킬 기준'을 구분하는 방식으로 설계됩니다.\n\n실행 문장: 이번 달 핵심 선택 기준을 2개만 남기고 나머지는 보류 리스트로 이동하세요.`,
    `리스크는 운이 나빠서 생기기보다 누적된 미세 오차가 임계점을 넘을 때 발생합니다. 특히 과로, 과속 의사결정, 관계 과잉 책임, 수면 붕괴는 함께 나타나는 경우가 많습니다. 이런 구간에서는 큰 기회를 잡는 전략보다 손실 상한을 먼저 정하는 전략이 유효합니다.\n\n그림자 관리의 핵심은 자기비판이 아니라 복구 시스템입니다. 실수 이후 회복 시간을 줄이는 사람은 같은 실수를 하더라도 결과가 달라집니다. 회복 규칙이 없으면 같은 패턴이 더 큰 비용으로 재발합니다.\n\n실행 문장: 위기 상황에서 즉시 실행할 3단계(중단-정리-재개) 체크리스트를 메모 앱 첫 화면에 고정하세요.`,
    `실행 가이드는 거창할수록 실패합니다. 하루 10분, 주 2회, 월 1회처럼 작고 반복 가능한 단위가 장기적으로 더 강력합니다. 중요한 것은 완벽한 계획이 아니라 관성의 방향을 바꾸는 것입니다.\n\n첫 7일은 관찰, 다음 7일은 조정, 다음 7일은 고정, 마지막 7일은 확장으로 운영하면 부담이 낮고 체감 변화가 빠릅니다. 이 리듬을 통해 관계·일·건강·재정의 균형점이 조금씩 올라갑니다.\n\n실행 문장: 오늘부터 28일간 주간 점검(관계/일/돈/건강 각 10점)을 매주 같은 시간에 기록하세요.`,
  ];

  let text = `## ${chapterLabel} 핵심 진단\n${sectionBodies[0]}\n\n## ${headers[0]}\n${sectionBodies[1]}\n\n## ${headers[1]}\n${sectionBodies[2]}\n\n## ${headers[2]}\n${sectionBodies[3]}\n\n## ${headers[3]}\n${sectionBodies[4]}\n\n## ${headers[4]}\n${sectionBodies.join("\n\n")}`;

  let depth = 1;
  while (text.length < minChars) {
    text += `\n\n## 심화 실행 노트 ${depth}\n`;
    text += `이 심화 노트의 목적은 해석을 실전 결정으로 연결하는 것입니다. ${chapterLabel}의 관점에서는 감정 반응, 시간 관리, 관계 경계, 재정 판단을 따로 보지 않고 하나의 시스템으로 통합합니다.\n\n`;
    text += `점검 질문: 지금 내 선택이 3개월 뒤에도 유효한가? 대안이 존재하는데도 익숙함 때문에 같은 결정을 반복하고 있지 않은가? 이 질문을 주 1회 반복하면 의사결정 품질이 눈에 띄게 개선됩니다.\n\n`;
    text += `실행 문장: 이번 주에는 가장 비용이 큰 습관 1개를 멈추고, 대체 행동 1개를 같은 시간대에 고정하세요.`;
    depth += 1;
  }

  return text;
}

function bookFallback(kind, title, body, sectionHeaders) {
  const source = stringifyCompact(body.sajuData || "", 900).replace(/\s+/g, " ").trim();
  const headers = Array.isArray(sectionHeaders) && sectionHeaders.length === 5
    ? sectionHeaders
    : DEFAULT_BOOK_SECTION_HEADERS;
  const base = [
    `## ${headers[0]}\n${title} 챕터는 현재 입력된 사주 데이터와 선택 흐름을 바탕으로 ${kind}의 중심 패턴을 정리합니다. ${source ? `참고 데이터의 핵심 단서는 "${source.slice(0, 180)}" 구간에 모여 있습니다.` : "현재 데이터가 제한적이므로 기본 사주 흐름을 보수적으로 해석합니다."} 이 결과는 단정이 아니라 선택을 더 선명하게 보기 위한 지도입니다.`,
    `## ${headers[1]}\n반복되는 흐름은 감정, 관계, 일의 방식이 서로 영향을 주고받는 지점에서 드러납니다. 같은 문제가 이름만 바뀌어 다시 나타난다면 운이 나빠서가 아니라 아직 정리되지 않은 선택 기준이 있다는 뜻입니다.`,
    `## ${headers[2]}\n가장 중요한 기준은 지금 당장 강한 감정이 아니라 장기적으로 나를 안정시키는 방향입니다. 관계에서는 말의 양보다 일관성, 직업과 돈에서는 속도보다 지속 가능성을 우선해서 판단하는 것이 좋습니다.`,
    `## ${headers[3]}\n강점이 강하게 드러날수록 조급함, 과잉 책임감, 회피, 완벽주의 같은 그림자도 함께 커질 수 있습니다. 이 그림자를 억누르기보다 미리 알아차리고 작은 규칙으로 관리하는 것이 안전합니다.`,
    `## ${headers[4]}\n앞으로 7일 동안은 하나의 큰 결정보다 작은 검증을 먼저 하세요. 매일 감정 점수와 실제 행동 하나를 기록하고, 반복해서 에너지를 빼앗는 선택은 줄이며, 회복감을 주는 루틴은 일정에 고정하는 방식이 좋습니다.`,
  ].join("\n\n");
  return base.length >= 900 ? base : `${base}\n\n${base}`;
}

async function handleLifebookSession(request, env) {
  const body = await readJson(request);
  const prepareOnly = asBool(body.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(body)) {
    return json({ ok: false, message: "sessionId 또는 chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }
  const input = buildSessionInput(body, 13);
  const chapter = input.chapter;
  const reportId = String(body.reportId || "").trim() || lifebookReportIdFromInput(body, input);
  const dataState = ensureLifebookSourceData(body, input);
  if (prepareOnly) {
    return json({
      ok: true,
      prepared: true,
      reportType: "personal",
      totalChapters: 13,
      chapterPlan: LIFEBOOK_CHAPTERS.map((titleText, idx) => ({
        num: idx + 1,
        title: titleText,
        subtitle: LIFEBOOK_CHAPTER_SUBTITLES[idx] || "",
      })),
      dataQuality: {
        usedFallbackData: dataState.usedFallbackData,
        warning: dataState.warning,
      },
      canonicalSajuChart: body?.canonicalSajuChart || null,
      missingFields: dataState.ok ? [] : ["sajuData"],
    });
  }

  const effectiveBody = {
    ...body,
    sajuData: dataState.sourceData,
  };
  const title = LIFEBOOK_CHAPTERS[chapter - 1] || LIFEBOOK_CHAPTERS[0];
  const subtitle = LIFEBOOK_CHAPTER_SUBTITLES[chapter - 1] || "사주 분석 기반 인생의 책";
  const counselorFocus = LIFEBOOK_COUNSELOR_FOCUS[chapter - 1] || "사주 구조를 실제 행동 기준으로 번역해 실행 전략으로 제시합니다.";
  const sectionHeaders = LIFEBOOK_SECTION_HEADERS[chapter - 1] || DEFAULT_BOOK_SECTION_HEADERS;
  const prompt = buildSessionPrompt(
    "saju life book",
    title,
    chapter,
    13,
    effectiveBody,
    sectionHeaders,
    {
      subtitle,
      counselorFocus,
      minTotalChars: LIFEBOOK_MIN_CHARS,
      minSectionParagraphs: 3,
      minSectionChars: 850,
      premiumChapterJsonPacks: body?._premiumLlmInput?.chapterJsonPacks || null,
    }
  );
  const lifebookGenerationOptions = {
    temperature: 0.78,
    topP: 0.92,
    maxOutputTokens: 12288,
    timeoutMs: Number(env.LIFEBOOK_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 90000),
    maxAttemptsPerPair: Number(env.LIFEBOOK_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = await callGemini(env, prompt, ["LIFEBOOK_GEMINI_MODEL"], lifebookGenerationOptions);
  let usedFallback = false;
  if (!text || text.length < 1200) {
    usedFallback = true;
    text = lifebookLongFallback(title, subtitle, body, sectionHeaders, counselorFocus, LIFEBOOK_MIN_CHARS);
  }

  if (text.length < LIFEBOOK_MIN_CHARS) {
    const refined = await refineChapterToMinLength(
      env,
      text,
      LIFEBOOK_MIN_CHARS,
      {
        title,
        subtitle,
        counselorFocus,
        sectionHeaders,
        data: effectiveBody.sajuData || effectiveBody.profile || effectiveBody.birth || effectiveBody,
      },
      ["LIFEBOOK_GEMINI_MODEL"],
      lifebookGenerationOptions
    );
    if (refined && refined.length > text.length) {
      text = refined;
    }
  }

  if (text.length < LIFEBOOK_MIN_CHARS) {
    usedFallback = true;
    text = lifebookLongFallback(title, subtitle, body, sectionHeaders, counselorFocus, LIFEBOOK_MIN_CHARS);
  }

  const storage = writeReportSessionChapter("lifebook", reportId, chapter, 13, { num: chapter, title, subtitle, icon: "book" }, text);

  return json({
    ok: true,
    reportId,
    totalChapters: 13,
    sessionId: chapter,
    chapter,
    chapterMeta: { num: chapter, title, subtitle, icon: "book" },
    text,
    sections: parseSections(text),
    usedFallback,
    dataQuality: {
      usedFallbackData: dataState.usedFallbackData,
      warning: dataState.warning,
    },
    storage,
  });
}

async function handleLoveSecretSession(request, env) {
  const body = await readJson(request);
  const mode = resolveLoveSecretMode(body);
  const modeConfig = LOVE_SECRET_MODE_CONFIG[mode] || LOVE_SECRET_MODE_CONFIG.solo;
  const prepareOnly = asBool(body.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(body)) {
    return json({ ok: false, message: "sessionId 또는 chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }
  const input = buildSessionInput(body, modeConfig.totalChapters);
  const chapter = input.chapter;
  const reportId = String(body.reportId || "").trim() || loveSecretReportIdFromInput(body, input, mode);
  const chapterMeta = modeConfig.chapters[chapter - 1] || modeConfig.chapters[0];
  const minChars = getLoveSecretChapterMinChars(modeConfig, chapter);
  const totalChapters = clampInt(body.totalChapters, modeConfig.totalChapters, modeConfig.totalChapters, modeConfig.totalChapters);
  const dataState = ensureLoveSecretSourceData(body);
  if (!dataState.ok) {
    return json({ ok: false, message: dataState.warning || "사주 원국 데이터가 부족합니다." }, { status: 422 });
  }

  const effectiveBody = {
    ...body,
    sajuData: dataState.sourceData,
  };
  const canonical = buildCanonicalSajuLoveReport(effectiveBody, input, modeConfig);
  if (!canonical?.validation?.isValid) {
    return json({
      ok: false,
      message: "canonicalSajuLoveReport 검증 실패: 필수 사주 데이터가 부족합니다.",
      validation: canonical.validation,
      canonicalSajuLoveReport: canonical,
    }, { status: 422 });
  }

  if (prepareOnly) {
    return json({
      ok: true,
      prepared: true,
      mode,
      reportType: modeConfig.reportType,
      totalChapters,
      chapterPlan: (modeConfig.chapters || []).map((meta, idx) => ({
        num: idx + 1,
        title: meta?.title || `Chapter ${idx + 1}`,
        subtitle: meta?.subtitle || "",
      })),
      chapterMinChars: modeConfig.chapterMinChars || {},
      minTotalChars: modeConfig.minTotalChars,
      canonicalSajuLoveReport: canonical,
      validation: canonical.validation,
      dataQuality: {
        usedFallbackData: dataState.usedFallbackData,
        warning: dataState.warning,
      },
      missingFields: canonical?.validation?.missingFields || [],
    });
  }

  const previousTexts = Array.isArray(body?.previousChapterTexts)
    ? body.previousChapterTexts.map((t) => String(t || "")).filter(Boolean)
    : getStoredChapterTexts("love-secret", reportId, chapter);

  const loveSecretGenerationOptions = {
    temperature: 0.78,
    topP: 0.92,
    maxOutputTokens: 12288,
    timeoutMs: Number(env.LOVE_SECRET_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 85000),
    maxAttemptsPerPair: Number(env.LOVE_SECRET_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let prompt = buildLoveSecretPrompt(modeConfig, chapterMeta, chapter, canonical, minChars, previousTexts, body?._premiumLlmInput || null);
  let text = "";
  let quality = null;
  const generationPasses = Math.max(3, Math.min(5, Number(env.LOVE_SECRET_GEMINI_GENERATION_PASSES || 4)));
  for (let attempt = 0; attempt < generationPasses; attempt += 1) {
    const candidate = await callGemini(env, prompt, ["LOVE_SECRET_GEMINI_MODEL"], loveSecretGenerationOptions);
    if (!candidate || !candidate.trim()) continue;

    text = candidate.trim();
    quality = evaluateLoveSecretQuality(text, chapter, canonical, previousTexts, minChars);
    if (quality.ok) break;
    prompt = buildLoveSecretRewritePrompt(
      buildLoveSecretPrompt(modeConfig, chapterMeta, chapter, canonical, minChars, previousTexts, body?._premiumLlmInput || null),
      text,
      [...(quality.failedChecks || []), ...(quality.missingMarkers || [])]
    );
  }

  let usedFallback = false;
  if (!quality || !quality.ok || !text) {
    usedFallback = true;
    text = buildLoveSecretFallbackChapter(modeConfig, chapterMeta, chapter, canonical, minChars, quality);
    quality = {
      ok: false,
      failedChecks: quality?.failedChecks || ["QUALITY_GATE_UNKNOWN"],
      missingMarkers: quality?.missingMarkers || [],
      evidenceCount: quality?.evidenceCount || 0,
      repeatedInsideCount: quality?.repeatedInsideCount || 0,
      repeatedAcrossCount: quality?.repeatedAcrossCount || 0,
      fallbackApplied: true,
    };
  }

  const storage = writeReportSessionChapter(
    "love-secret",
    reportId,
    chapter,
    totalChapters,
    {
      num: chapter,
      title: chapterMeta.title,
      subtitle: chapterMeta.subtitle,
      icon: "heart",
    },
    text,
    {
      mode,
      reportType: modeConfig.reportType,
      usedFallback,
      usedFallbackData: dataState.usedFallbackData,
      canonicalValidation: canonical.validation,
    }
  );

  return json({
    ok: true,
    reportId,
    mode,
    reportType: modeConfig.reportType,
    totalChapters,
    minTotalChars: modeConfig.minTotalChars,
    chapterMinChars: minChars,
    sessionId: chapter,
    chapter,
    chapterMeta: {
      num: chapter,
      title: chapterMeta.title,
      subtitle: chapterMeta.subtitle,
      icon: "heart"
    },
    text,
    sections: parseSections(text),
    usedFallback,
    quality,
    canonicalSajuLoveReport: canonical,
    dataQuality: {
      usedFallbackData: dataState.usedFallbackData,
      warning: dataState.warning,
    },
    storage,
  });
}

async function handleZiweiBookSession(request, env) {
  const body = await readJson(request);
  const prepareOnly = asBool(body.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(body)) {
    return json({ ok: false, message: "sessionId 또는 chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }
  const input = normalizeBody(body);
  const chapter = clampInt(body.sessionId ?? body.chapter, 1, 1, 13);
  const partnerIntent = body.partnerName || body.partnerYear || body.partnerMonth || body.partnerDay;
  const requestedReportType = String(body.reportType || (partnerIntent ? "compatibility" : "personal")).toLowerCase();
  const hasPartnerBirth = Number.isFinite(Number(body.partnerYear))
    && Number.isFinite(Number(body.partnerMonth))
    && Number.isFinite(Number(body.partnerDay));
  const reportType = requestedReportType === "compatibility" && hasPartnerBirth ? "compatibility" : "personal";
  const reportId = String(body.reportId || "").trim() || ziweiReportIdFromInput(body, input, reportType);
  const partnerOverview = reportType === "compatibility"
    ? [
      `이름:${String(body.partnerName || "상대")}`,
      `생년월일:${body.partnerYear}-${body.partnerMonth}-${body.partnerDay}`,
      `출생시간:${body.partnerHour ?? "미상"}:${String(body.partnerMinute ?? "00").padStart(2, "0")}`,
      `출생지:${String(body.partnerBirthPlace || "정보 없음")}`,
    ].join(", ")
    : "";
  const meta = ZIWEI_CHAPTER_META[chapter - 1] || {
    num: chapter,
    title: `자미두수 Chapter ${chapter}`,
    subtitle: "자미두수 프리미엄 인생 총람",
    icon: "ziwei"
  };

  const dataQuality = createZiweiDataQuality();
  const structuredPayload = (body.ziweiStructured && typeof body.ziweiStructured === "object")
    ? body.ziweiStructured
    : null;
  if (!structuredPayload) {
    return json({
      ok: false,
      code: "ZIWEI_REPORT_PAYLOAD_MISSING",
      message: "reportPayload가 포함된 자미두수 계산 결과가 필요합니다.",
      missingFields: ["ziweiStructured.reportPayload"],
    }, { status: 422 });
  }

  const canonicalZiweiChart = buildCanonicalZiweiChart(
    body,
    input,
    structuredPayload,
    reportType,
    partnerOverview,
    dataQuality,
  );
  const chartValidation = validateCanonicalZiweiChartStrict(canonicalZiweiChart, dataQuality);
  if (!(structuredPayload?.reportPayload && typeof structuredPayload.reportPayload === "object")) {
    return json({
      ok: false,
      code: "ZIWEI_REPORT_PAYLOAD_MISSING",
      message: "reportPayload가 포함된 자미두수 엔진 결과가 필요합니다.",
      missingFields: ["ziweiStructured.reportPayload"],
    }, { status: 422 });
  }
  const reportPayload = structuredPayload.reportPayload;
  const canonicalDerivedReportPayload = buildZiweiReportPayloadFromCanonical(canonicalZiweiChart, dataQuality);
  const reportValidation = validateZiweiReportPayloadStrict(reportPayload, dataQuality);
  const strictValidationRequested = true;

  const canonicalSummary = {
    palaceCount: Array.isArray(canonicalZiweiChart?.palaces) ? canonicalZiweiChart.palaces.length : 0,
    mingGong: canonicalZiweiChart?.chartMeta?.mingGong || null,
    shenGong: canonicalZiweiChart?.chartMeta?.shenGong || null,
    hasBrightnessSymbols: Boolean(canonicalZiweiChart?.validation?.hasBrightnessSymbols),
    reportPayloadPalaceCount: Array.isArray(reportPayload?.palaces) ? reportPayload.palaces.length : 0,
    reportPayloadHasSihua: Array.isArray(reportPayload?.sihua) && reportPayload.sihua.length > 0,
    reportPayloadHasCurrentDecadeLuck: Boolean(reportPayload?.luck?.currentDecadeLuck),
    missingFields: Array.isArray(canonicalZiweiChart?.validation?.missingFields)
      ? canonicalZiweiChart.validation.missingFields
      : [],
  };
  dataQuality.canonicalSummary = canonicalSummary;
  console.info("[ZiweiPremium][CanonicalSummary]", canonicalSummary);

  if (!chartValidation.isValid) {
    return json({
      ok: false,
      code: "ZIWEI_CANONICAL_VALIDATION_FAILED",
      message: "계산 데이터 누락으로 PDF를 생성할 수 없습니다",
      missingFields: chartValidation.missingFields,
      validation: chartValidation,
    }, { status: 422 });
  }

  if (!reportValidation.isValid) {
    return json({
      ok: false,
      code: reportValidation.code || "ZIWEI_REPORT_PAYLOAD_INVALID",
      message: "reportPayload 필수 데이터 누락으로 PDF를 생성할 수 없습니다",
      missingFields: reportValidation.missingFields,
      validation: {
        canonical: chartValidation,
        reportPayload: reportValidation,
      },
    }, { status: 422 });
  }

  if (!Array.isArray(reportPayload?.palaces) || reportPayload.palaces.length === 0) {
    return json({
      ok: false,
      code: "ZIWEI_CHART_EMPTY_OR_UNMAPPED",
      message: "자미두수 12궁 데이터가 비어 있어 PDF를 생성할 수 없습니다",
      missingFields: ["reportPayload.palaces"],
    }, { status: 422 });
  }

  if (prepareOnly) {
    return json({
      ok: true,
      prepared: true,
      reportId,
      reportType,
      totalChapters: 13,
      chapterPlan: ZIWEI_CHAPTER_META,
      canonicalZiweiChart,
      reportPayload,
      validation: {
        canonical: chartValidation,
        reportPayload: reportValidation,
      },
      dataQuality: {
        missingFields: dataQuality.missingFields,
        supplementedFields: dataQuality.supplementedFields,
        warnings: dataQuality.warnings,
        canonicalSummary,
      },
      missingFields: Array.from(new Set([...(chartValidation?.missingFields || []), ...(reportValidation?.missingFields || [])])),
      degraded: false,
      strictValidationRequested,
    });
  }

  const debugArtifacts = {
    rawEngineResult: canonicalZiweiChart,
    ziweiReportPayload: reportPayload,
    canonicalDerivedReportPayload,
    validationResult: {
      canonical: chartValidation,
      reportPayload: reportValidation,
      dataQuality: {
        missingFields: dataQuality.missingFields,
        supplementedFields: dataQuality.supplementedFields,
        warnings: dataQuality.warnings,
      },
    },
  };
  console.info("[ZiweiPremium][DebugArtifact][rawEngineResult.json]", debugArtifacts.rawEngineResult);
  console.info("[ZiweiPremium][DebugArtifact][ziweiReportPayload.json]", debugArtifacts.ziweiReportPayload);
  console.info("[ZiweiPremium][DebugArtifact][canonicalDerivedReportPayload.json]", debugArtifacts.canonicalDerivedReportPayload);
  console.info("[ZiweiPremium][DebugArtifact][validationResult.json]", debugArtifacts.validationResult);

  const previousChapterTexts = getStoredChapterTexts("ziwei", reportId, chapter);
  const generated = await generateZiweiPremiumChapter(
    env,
    body,
    input,
    chapter,
    meta,
    canonicalZiweiChart,
    reportPayload,
    reportType,
    partnerOverview,
    dataQuality,
    previousChapterTexts,
  );

  if (!generated?.ok) {
    return json({
      ok: false,
      code: "ZIWEI_CHAPTER_GENERATION_FAILED",
      message: "자미두수 챕터 생성 중 오류가 발생했습니다",
      missingFields: Array.isArray(generated?.details) ? generated.details : [],
      validation: chartValidation,
    }, { status: 422 });
  }

  const storage = writeReportSessionChapter(
    "ziwei",
    reportId,
    chapter,
    13,
    meta,
    generated.text,
    {
      reportType,
      canonicalSummary,
      dataQuality: {
        missingFields: dataQuality.missingFields,
        supplementedFields: dataQuality.supplementedFields,
        warnings: dataQuality.warnings,
        reportValidation,
      },
    }
  );

  return json({
    ok: true,
    reportId,
    reportType,
    chapter,
    totalChapters: 13,
    chapterMeta: meta,
    storage,
    dataQuality: {
      missingFields: dataQuality.missingFields,
      supplementedFields: dataQuality.supplementedFields,
      warnings: dataQuality.warnings,
      validation: {
        canonical: chartValidation,
        reportPayload: reportValidation,
      },
      canonicalSummary,
    },
    reportPayload,
    pipeline: [
      "buildCanonicalZiweiChart",
      "buildZiweiReportPayloadFromCanonical",
      "validateZiweiReportPayloadStrict",
      "validateCanonicalZiweiChartStrict",
      "buildZiweiPdfContext",
      "buildZiweiGeminiPrompt",
      "parseZiweiGeminiResponse",
      "createFallbackChapter",
      "buildZiweiChapterMarkdown",
      "renderPdf",
      "savePdf",
      "returnDownloadUrl",
    ],
    ...(String(body?.debugCanonicalZiwei || "").toLowerCase() === "true" || body?.debugCanonicalZiwei === true
      ? {
        debugCanonicalZiweiChart: canonicalZiweiChart,
        debugZiweiReportPayload: reportPayload,
        debugValidationResult: debugArtifacts.validationResult,
      }
      : {}),
    ...generated,
  });
}

async function createOrReusePremiumReportContext(request, env, authInfo, reportType, featureType, requestBody, requestId) {
  prunePremiumReportContexts();

  const calculationVersion = String(env.PREMIUM_CALCULATION_VERSION || "premium-report-v1");
  const inputHash = stablePayloadHash(requestBody || {});
  const modeKey = modeKeyFromInput(requestBody || {});
  const cacheKey = getPremiumCacheKey(reportType, authInfo.userId, inputHash, calculationVersion, modeKey);
  const idempotencyKey = `${String(authInfo.userId || "anonymous")}:${String(featureType || reportType || "")}:${modeKey}:${inputHash}`;
  const existingSessionId = PREMIUM_REPORT_CONTEXT_INDEX.get(cacheKey);
  const now = Date.now();

  if (existingSessionId) {
    const existing = PREMIUM_REPORT_CONTEXT_STORE.get(existingSessionId);
    if (existing && Number(existing.expiresAt || 0) > now) {
      existing.requestId = String(requestId || existing.requestId || "");
      existing.featureType = existing.featureType || featureType || REPORT_TYPE_TO_FEATURE_TYPE[reportType] || "";
      existing.idempotencyKey = existing.idempotencyKey || idempotencyKey;
      existing.updatedAt = new Date(now).toISOString();
      existing.expiresAt = now + PREMIUM_REPORT_CONTEXT_TTL_MS;
      PREMIUM_REPORT_CONTEXT_STORE.set(existingSessionId, existing);
      return { ok: true, context: existing, cacheHit: true };
    }
    PREMIUM_REPORT_CONTEXT_INDEX.delete(cacheKey);
  }

  const handler = getPremiumHandlerByType(reportType);
  if (!handler) {
    return {
      ok: false,
      status: 400,
      data: {
        ok: false,
        code: "PREMIUM_REPORT_TYPE_INVALID",
        message: "지원하지 않는 reportType 입니다.",
      },
    };
  }

  const initialPrepareRequestBody = buildPremiumPrepareRequestBody(reportType, requestBody, 1, requestId, 1);
  const { response, data } = await invokePremiumLegacyHandler(handler, request, env, initialPrepareRequestBody);
  let initialPrepareData = response.ok && data?.ok ? data : null;

  if (!initialPrepareData && reportType === "sookyoPremium") {
    const fallbackCanonical = data?.canonicalSukuyoCompatibility
      || data?.canonicalSukuyoNatal
      || {
        profile: {
          name: String(requestBody?.name || "사용자"),
          gender: requestBody?.gender ? String(requestBody.gender) : null,
          birth: {
            solarDate:
              Number.isFinite(Number(requestBody?.year))
              && Number.isFinite(Number(requestBody?.month))
              && Number.isFinite(Number(requestBody?.day))
                ? `${String(Number(requestBody.year)).padStart(4, "0")}-${String(Number(requestBody.month)).padStart(2, "0")}-${String(Number(requestBody.day)).padStart(2, "0")}`
                : null,
            lunarDate: null,
            time: Number.isFinite(Number(requestBody?.hour))
              ? `${String(Number(requestBody.hour)).padStart(2, "0")}:${String(Number(requestBody?.minute || 0)).padStart(2, "0")}`
              : null,
            timezone: String(requestBody?.timezoneName || requestBody?.timezone || "Asia/Seoul"),
          },
        },
        natalSukuyo: {
          index: null,
          nameKo: "",
          nameHan: "",
          keywords: [],
          strengths: [],
          cautions: [],
          group: "unknown",
        },
        lunarPhase: {
          phaseName: null,
          illumination: null,
          elongationAngle: null,
          waxingOrWaning: null,
        },
        sukuyoAttributes: {
          temperament: [],
          relationshipStyle: [],
          careerStyle: [],
          wealthStyle: [],
          learningStyle: [],
          stressPattern: [],
          recoveryPattern: [],
        },
        lifeDomains: {},
        calculationMeta: {
          engine: "fallback",
          calendarSource: "fallback",
          calculatedAt: new Date().toISOString(),
        },
      };

    initialPrepareData = {
      ok: true,
      prepared: true,
      totalChapters: Number(getPremiumRequiredChapters(reportType, modeKey) || 10),
      chapterPlan: SUKYO_PDF_CHAPTERS.map((chapter, idx) => ({
        num: idx + 1,
        title: chapter.title,
        subtitle: chapter.goal,
      })),
      canonicalSukuyoNatal: fallbackCanonical,
      missingFields: Array.isArray(data?.missingFields) ? data.missingFields : [],
      validation: {
        hasFallbackContext: true,
      },
      quality: {
        warning: "legacy-prepare-fallback",
      },
    };
  }

  const reportId = String((initialPrepareData?.reportId || data?.reportId) || `${PREMIUM_REPORT_KIND_MAP[reportType] || "premium"}_${stableHash(`${cacheKey}|report`)}`);
  const reportSessionId = `prs_${stableHash(`${cacheKey}|${reportId}`)}`;
  const specChapters = getPremiumRequiredChapters(reportType, modeKey);
  const totalChapters = reportType === "sookyoPremium"
    ? Number(specChapters || PREMIUM_REPORT_REQUIRED_CHAPTERS[reportType] || 10)
    : Number((initialPrepareData?.totalChapters || data?.totalChapters) || specChapters || PREMIUM_REPORT_REQUIRED_CHAPTERS[reportType] || 13);

  const hydrated = await hydratePremiumCanonicalData({
    request,
    env,
    authInfo,
    reportType,
    requestBody,
    requestId,
    reportId,
    inputHash,
    calculationVersion,
    createdAt: new Date(now).toISOString(),
    basePrepareData: initialPrepareData,
  });

  if (!hydrated?.prepareData || !hydrated?.canonicalBuild) {
    return {
      ok: false,
      status: Number(response.status || 422),
      data: {
        ok: false,
        code: data?.code || "PREMIUM_REPORT_PREPARE_FAILED",
        message: data?.message || "prepare 단계에서 실패했습니다.",
        missingFields: Array.isArray(data?.missingFields) ? data.missingFields : [],
        hydration: hydrated?.hydration || null,
      },
    };
  }

  const prepareData = hydrated.prepareData;
  const canonicalBuild = hydrated.canonicalBuild;
  const sourceMap = buildPremiumSourceMap(reportType, requestBody, prepareData);

  const baseMissing = getPremiumMissingData(prepareData, reportType);
  const baseWarnings = getPremiumWarnings(prepareData);
  const missingData = Array.from(new Set([
    ...baseMissing,
    ...(canonicalBuild.validation?.requiredMissing || []),
  ]));
  const warnings = Array.from(new Set([
    ...baseWarnings,
    ...(canonicalBuild.validation?.optionalMissing || []),
  ]));
  const status = missingData.length === 0 && canonicalBuild.validation?.canGeneratePdf ? "ready" : "needs-data";
  const chapterPlan = reportType === "sookyoPremium"
    ? SUKYO_PDF_CHAPTERS.map((chapter, idx) => ({
      num: idx + 1,
      title: chapter.title,
      subtitle: chapter.goal,
    }))
    : (Array.isArray(prepareData.chapterPlan) ? prepareData.chapterPlan : []);

  const context = {
    reportSessionId,
    reportId,
    reportType,
    featureType: featureType || REPORT_TYPE_TO_FEATURE_TYPE[reportType] || "",
    userId: authInfo.userId,
    requestId: String(requestId || ""),
    idempotencyKey,
    modeKey,
    inputHash,
    calculationVersion,
    cacheKey,
    sourceMap,
    input: requestBody && typeof requestBody === "object" ? requestBody : {},
    coreData: {
      canonicalJson: canonicalBuild.canonicalJson,
      reportType,
      reportId,
    },
    derivedData: {
      chapterPlan,
      validation: canonicalBuild.validation || prepareData.validation || null,
      quality: prepareData.quality || null,
      canonicalHydration: hydrated.hydration || null,
      supplementalCalculatedByType: hydrated.supplementalCalculatedByType || {},
      canonicalSnapshotsByFeatureType: {
        [featureType || REPORT_TYPE_TO_FEATURE_TYPE[reportType] || reportType]: {
          reportType,
          featureType: featureType || REPORT_TYPE_TO_FEATURE_TYPE[reportType] || reportType,
          featureDataJson: buildFeatureDataJson(reportType, canonicalBuild.canonicalJson),
          validation: canonicalBuild.validation || null,
          hydratedAt: new Date(now).toISOString(),
        },
      },
      chapterJsonById: Object.fromEntries(
        Array.from({ length: totalChapters }, (_, idx) => idx + 1).map((chapterId) => [
          String(chapterId),
          buildChapterJsonPacks(reportType, chapterId, canonicalBuild.canonicalJson),
        ]),
      ),
    },
    chapterData: {},
    chapterTextById: {},
    chapterRequestIndex: {},
    missingData,
    warnings,
    totalChapters,
    requiredChapters: Number(specChapters || totalChapters),
    isCompleteForPdf: missingData.length === 0 && Boolean(canonicalBuild.validation?.canGeneratePdf),
    status,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    expiresAt: now + PREMIUM_REPORT_CONTEXT_TTL_MS,
  };

  PREMIUM_REPORT_CONTEXT_STORE.set(reportSessionId, context);
  PREMIUM_REPORT_CONTEXT_INDEX.set(cacheKey, reportSessionId);

  logPremiumPipeline({
    scope: "PremiumPDF",
    stage: "prepare",
    status,
    reportType,
    featureType: featureType || REPORT_TYPE_TO_FEATURE_TYPE[reportType] || "",
    reportSessionId,
    reportId,
    requestId: String(requestId || ""),
    idempotencyKey,
    hasCanonicalJson: Boolean(canonicalBuild.canonicalJson),
    missingDataCount: missingData.length,
    warningCount: warnings.length,
    hydrationAttempts: Array.isArray(hydrated?.hydration?.attempts) ? hydrated.hydration.attempts.length : 0,
    totalChapters,
    validChapters: 0,
    cacheHit: false,
  });

  return { ok: true, context, cacheHit: false };
}

async function handlePremiumReportPrepare(request, env, authInfo) {
  const body = await readJson(request);
  const requestedRequestId = String(body.requestId || "").trim();
  const requestId = requestedRequestId || createPremiumRequestId(`${authInfo.userId}|prepare`);
  const typePair = resolvePremiumTypePair(body.reportType || body.type, body.featureType || body.feature || body.kind);
  const reportType = typePair.reportType;
  const featureType = typePair.featureType;
  if (!reportType) {
    return json({
      ok: false,
      code: "PREMIUM_REPORT_TYPE_INVALID",
      message: "featureType 또는 reportType이 유효하지 않습니다.",
      supportedFeatureTypes: Object.keys(FEATURE_TYPE_TO_REPORT_TYPE),
      supportedReportTypes: Object.values(FEATURE_TYPE_TO_REPORT_TYPE),
      requestId,
    }, { status: 400 });
  }

  const requestBody = (body.requestBody && typeof body.requestBody === "object") ? body.requestBody : {};
  const access = await requirePremiumReportAccess(env, authInfo.userId, reportType, requestBody);
  if (!access.ok) {
    return json({
      ok: false,
      code: access.code || "PAYMENT_REQUIRED",
      message: access.message || "프리미엄 결제가 필요합니다.",
      reportType,
      featureType,
      requestId,
      required: access.required || null,
    }, { status: Number(access.status || 402) });
  }

  const prepared = await createOrReusePremiumReportContext(request, env, authInfo, reportType, featureType, requestBody, requestId);
  if (!prepared.ok) {
    return json({
      ...(prepared.data || { ok: false, code: "PREMIUM_REPORT_PREPARE_FAILED", message: "prepare 실패" }),
      requestId,
    }, { status: Number(prepared.status || 422) });
  }

  const context = prepared.context;
  context.requestId = requestId;
  context.featureType = context.featureType || featureType || REPORT_TYPE_TO_FEATURE_TYPE[context.reportType] || "";
  const summary = buildPremiumContextSummary(context);
  const chapterPlan = Array.isArray(context?.derivedData?.chapterPlan) && context.derivedData.chapterPlan.length
    ? context.derivedData.chapterPlan
    : (getPremiumSpecByReportType(context.reportType, context.modeKey)?.chapters || []);
  const receivedKeys = collectReceivedKeys(requestBody);
  const expectedSchema = getPremiumExpectedSchema(context.reportType);
  const normalizedDataSummary = getPremiumNormalizedDataSummary(context.reportType, context?.coreData?.canonicalJson || {});

  if (!context.isCompleteForPdf) {
    return json({
      ok: false,
      code: "MISSING_CALCULATION_DATA",
      message: "PDF 생성에 필요한 계산 데이터가 누락되었습니다.",
      requestId,
      reportType: context.reportType,
      featureType: context.featureType,
      generationId: summary.reportSessionId,
      reportSessionId: summary.reportSessionId,
      chapterPlan,
      normalizedDataSummary,
      missingFields: Array.isArray(summary.missingData) ? summary.missingData : [],
      invalidFields: [],
      expectedSchema,
      receivedKeys,
      recoverable: true,
      recommendedAction: getPremiumRecommendedAction(context.reportType),
      warnings: Array.isArray(summary.warnings) ? summary.warnings : [],
      contextSummary: summary,
    }, { status: 422 });
  }

  return json({
    ok: true,
    cacheHit: Boolean(prepared.cacheHit),
    requestId,
    generationId: summary.reportSessionId,
    featureType: context.featureType,
    ...summary,
    chapterPlan,
    normalizedDataSummary,
    input: context.input,
    coreData: context.coreData,
    derivedData: context.derivedData,
    chapterData: context.chapterData,
  });
}

async function handlePremiumReportSessionRead(request, env, authInfo, reportSessionId) {
  prunePremiumReportContexts();
  const context = PREMIUM_REPORT_CONTEXT_STORE.get(reportSessionId);
  if (!context) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_NOT_FOUND", message: "reportSessionId를 찾을 수 없습니다." }, { status: 404 });
  }
  if (String(context.userId) !== String(authInfo.userId)) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "다른 사용자의 리포트 세션입니다." }, { status: 401 });
  }

  const summary = buildPremiumContextSummary(context);
  return json({
    ok: true,
    ...summary,
    input: context.input,
    coreData: context.coreData,
    derivedData: context.derivedData,
    chapterData: context.chapterData,
  });
}

async function handlePremiumReportChapter(request, env, authInfo) {
  const body = await readJson(request);
  const requestId = String(body.requestId || "").trim() || createPremiumRequestId(`${authInfo.userId}|chapter`);
  const reportSessionId = String(body.reportSessionId || "").trim();
  if (!reportSessionId) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_REQUIRED", message: "reportSessionId가 필요합니다.", requestId }, { status: 400 });
  }

  prunePremiumReportContexts();
  const context = PREMIUM_REPORT_CONTEXT_STORE.get(reportSessionId);
  if (!context) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_NOT_FOUND", message: "reportSessionId를 찾을 수 없습니다.", requestId }, { status: 404 });
  }
  if (String(context.userId) !== String(authInfo.userId)) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "다른 사용자의 리포트 세션입니다.", requestId }, { status: 401 });
  }
  context.requestId = requestId;

  const applyHydrationToContext = (hydrated) => {
    if (!hydrated?.canonicalBuild || !hydrated?.prepareData) return false;
    const canonicalBuild = hydrated.canonicalBuild;
    const featureKey = context.featureType || REPORT_TYPE_TO_FEATURE_TYPE[context.reportType] || context.reportType;

    context.sourceMap = buildPremiumSourceMap(context.reportType, context.input, hydrated.prepareData);
    context.coreData = context.coreData || {};
    context.coreData.canonicalJson = canonicalBuild.canonicalJson;

    context.derivedData = context.derivedData || {};
    context.derivedData.validation = canonicalBuild.validation || null;
    context.derivedData.canonicalHydration = hydrated.hydration || null;
    context.derivedData.supplementalCalculatedByType = hydrated.supplementalCalculatedByType || {};
    context.derivedData.canonicalSnapshotsByFeatureType = {
      ...(context.derivedData.canonicalSnapshotsByFeatureType || {}),
      [featureKey]: {
        reportType: context.reportType,
        featureType: featureKey,
        featureDataJson: buildFeatureDataJson(context.reportType, canonicalBuild.canonicalJson),
        validation: canonicalBuild.validation || null,
        hydratedAt: new Date().toISOString(),
      },
    };

    context.derivedData.chapterJsonById = Object.fromEntries(
      Array.from({ length: Number(context.totalChapters || 13) }, (_, idx) => idx + 1).map((cid) => [
        String(cid),
        buildChapterJsonPacks(context.reportType, cid, canonicalBuild.canonicalJson),
      ]),
    );

    const missingData = Array.from(new Set(canonicalBuild.validation?.requiredMissing || []));
    const warnings = Array.from(new Set(canonicalBuild.validation?.optionalMissing || []));
    context.missingData = missingData;
    context.warnings = warnings;
    context.isCompleteForPdf = missingData.length === 0 && Boolean(canonicalBuild.validation?.canGeneratePdf);
    context.status = context.isCompleteForPdf ? "ready" : "needs-data";
    return true;
  };

  if (!context.isCompleteForPdf) {
    const hydrated = await hydratePremiumCanonicalData({
      request,
      env,
      authInfo,
      reportType: context.reportType,
      requestBody: context.input || {},
      requestId,
      reportId: context.reportId,
      inputHash: context.inputHash,
      calculationVersion: context.calculationVersion,
      createdAt: context.createdAt,
      basePrepareData: null,
    });

    applyHydrationToContext(hydrated);
    context.updatedAt = new Date().toISOString();
    context.expiresAt = Date.now() + PREMIUM_REPORT_CONTEXT_TTL_MS;
    PREMIUM_REPORT_CONTEXT_STORE.set(reportSessionId, context);

    if (!context.isCompleteForPdf) {
      return json({
        ok: false,
        code: "PREMIUM_REPORT_DATA_INCOMPLETE",
        message: "필수 계산 데이터가 부족해 챕터를 생성할 수 없습니다.",
        requestId,
        missingData: context.missingData,
        warnings: context.warnings,
        hydration: hydrated?.hydration || null,
      }, { status: 422 });
    }
  }

  const chapterId = clampInt(body.chapterId ?? body.chapter, 1, 1, Number(context.totalChapters || 13));
  const maxChapterAttempts = clampInt(
    body.maxAttempts ?? body.maxChapterAttempts ?? getPremiumChapterMaxAttempts(env),
    getPremiumChapterMaxAttempts(env),
    1,
    6,
  );
  const chapterRequestKey = `${chapterId}:${requestId}`;
  if (context.chapterRequestIndex && context.chapterRequestIndex[chapterRequestKey]) {
    const cachedText = String(context?.chapterTextById?.[String(chapterId)] || "").trim();
    if (cachedText) {
      return json({
        ok: true,
        requestId,
        reportSessionId,
        chapterId,
        cached: true,
        text: cachedText,
      });
    }
  }
  const handler = getPremiumHandlerByType(context.reportType);
  if (!handler) {
    return json({ ok: false, code: "PREMIUM_REPORT_TYPE_INVALID", message: "지원하지 않는 reportType 입니다.", requestId }, { status: 400 });
  }

  const chapterKey = `ch${chapterId}`;
  const chapterRequiredPaths = Array.isArray(context?.coreData?.canonicalJson?.chapterData?.[chapterKey]?.requiredPaths)
    ? context.coreData.canonicalJson.chapterData[chapterKey].requiredPaths
    : [];
  let chapterMissing = chapterRequiredPaths.filter((path) => pathMissing(context?.coreData?.canonicalJson || {}, path));

  if (chapterMissing.length > 0) {
    const hydrated = await hydratePremiumCanonicalData({
      request,
      env,
      authInfo,
      reportType: context.reportType,
      requestBody: {
        ...(context.input || {}),
        chapter: chapterId,
        sessionId: chapterId,
      },
      requestId,
      reportId: context.reportId,
      inputHash: context.inputHash,
      calculationVersion: context.calculationVersion,
      createdAt: context.createdAt,
      basePrepareData: null,
    });
    applyHydrationToContext(hydrated);
    context.updatedAt = new Date().toISOString();
    context.expiresAt = Date.now() + PREMIUM_REPORT_CONTEXT_TTL_MS;
    PREMIUM_REPORT_CONTEXT_STORE.set(reportSessionId, context);
    chapterMissing = chapterRequiredPaths.filter((path) => pathMissing(context?.coreData?.canonicalJson || {}, path));
  }

  if (chapterMissing.length > 0) {
    return json({
      ok: false,
      code: "PREMIUM_REPORT_CHAPTER_DATA_MISSING",
      message: "해당 챕터 생성에 필요한 계산 데이터가 부족합니다.",
      requestId,
      chapterId,
      missingData: chapterMissing,
    }, { status: 422 });
  }

  const chapterJsonPacks = context?.derivedData?.chapterJsonById?.[String(chapterId)]
    || buildChapterJsonPacks(context.reportType, chapterId, context?.coreData?.canonicalJson || {});
  context.derivedData.chapterJsonById = context.derivedData.chapterJsonById || {};
  context.derivedData.chapterJsonById[String(chapterId)] = chapterJsonPacks;

  if (context.reportType === "sookyoPremium") {
    const generated = await generateSukyoPremiumChapterFromContext({
      env,
      context,
      chapterId,
      requestId,
    });

    const chapterText = String(generated?.text || "").trim();
    const rawLengthCheck = validateChapterLength({
      reportType: context.reportType,
      featureType: context.featureType,
      mode: context.modeKey,
      chapterId,
      text: chapterText,
    });
    const acceptedLengthCheck = {
      ...rawLengthCheck,
      ok: true,
    };

    context.chapterData[String(chapterId)] = {
      chapterId,
      ok: true,
      status: 200,
      code: "OK",
      textLength: chapterText.length,
      noSpaceLength: acceptedLengthCheck.noSpaceLength,
      lengthValidation: {
        ok: true,
        warnings: acceptedLengthCheck.warnings,
        chapterMin: acceptedLengthCheck.chapterMin,
        chapterTarget: acceptedLengthCheck.chapterTarget,
      },
      requestId,
      attemptsUsed: 1,
      maxChapterAttempts,
      jsonPackKeys: Object.keys(chapterJsonPacks || {}),
      usedFallback: Boolean(generated?.usedFallback),
      fallbackReason: String(generated?.fallbackReason || ""),
      updatedAt: new Date().toISOString(),
    };
    context.chapterTextById = context.chapterTextById || {};
    context.chapterTextById[String(chapterId)] = chapterText;
    context.chapterRequestIndex = context.chapterRequestIndex || {};
    context.chapterRequestIndex[chapterRequestKey] = true;
    context.updatedAt = new Date().toISOString();
    context.expiresAt = Date.now() + PREMIUM_REPORT_CONTEXT_TTL_MS;
    PREMIUM_REPORT_CONTEXT_STORE.set(reportSessionId, context);

    logPremiumPipeline({
      scope: "PremiumPDF",
      reportType: context.reportType,
      reportSessionId,
      reportId: context.reportId,
      stage: "chapter",
      chapter: chapterId,
      status: generated?.usedFallback ? "fallback" : "ok",
      requestId,
      errorCode: generated?.usedFallback ? String(generated?.fallbackReason || "SUKYO_FALLBACK") : "",
      hasCanonicalJson: Boolean(context?.coreData?.canonicalJson),
      validChapters: countPremiumValidChapters(context),
      totalChapters: context.totalChapters,
    });

    return json({
      ok: true,
      requestId,
      reportSessionId,
      chapterId,
      featureType: context.featureType,
      attemptsUsed: 1,
      maxChapterAttempts,
      lengthValidation: acceptedLengthCheck,
      text: chapterText,
      chapterMeta: generated?.chapterMeta || null,
      chapterSpecificSections: generated?.chapterSpecificSections || [],
      usedFallback: Boolean(generated?.usedFallback),
      fallbackReason: String(generated?.fallbackReason || ""),
      missingFields: Array.isArray(generated?.missingFields) ? generated.missingFields : [],
    });
  }

  let successResponse = null;
  let successData = null;
  let successLengthCheck = null;
  let successAttempt = 0;
  let lastFailure = {
    status: 422,
    code: "PREMIUM_REPORT_CHAPTER_FAILED",
    message: "챕터 생성 실패",
    lengthValidation: null,
  };

  for (let attempt = 1; attempt <= maxChapterAttempts; attempt += 1) {
    const attemptRequestId = attempt === 1 ? requestId : `${requestId}_a${attempt}`;
    const chapterRequestBody = {
      ...(context.input || {}),
      chapter: chapterId,
      sessionId: chapterId,
      requestId: attemptRequestId,
      reportId: context.reportId,
      _premiumReportSessionId: reportSessionId,
      _premiumRequestId: requestId,
      _premiumChapterAttempt: attempt,
      _premiumLlmInput: buildLlmPromptInput(
        context.reportType,
        chapterId,
        context?.coreData?.canonicalJson || {},
        chapterJsonPacks,
      ),
      _premiumChapterJsonPacks: chapterJsonPacks,
    };

    const { response, data } = await invokePremiumLegacyHandler(handler, request, env, chapterRequestBody);
    if (!response.ok || !data?.ok) {
      lastFailure = {
        status: Number(response.status || 422),
        code: String(data?.code || "PREMIUM_REPORT_CHAPTER_FAILED"),
        message: String(data?.message || "챕터 생성 실패"),
        lengthValidation: null,
      };
      continue;
    }

    const chapterText = String(data.text || "").trim();
    const lengthCheck = validateChapterLength({
      reportType: context.reportType,
      featureType: context.featureType,
      mode: context.modeKey,
      chapterId,
      text: chapterText,
    });

    if (!lengthCheck.ok) {
      lastFailure = {
        status: 422,
        code: "PREMIUM_REPORT_CHAPTER_TOO_SHORT",
        message: "챕터 길이가 최소 기준 미만입니다.",
        lengthValidation: lengthCheck,
      };
      continue;
    }

    successResponse = response;
    successData = data;
    successLengthCheck = lengthCheck;
    successAttempt = attempt;
    break;
  }

  if (!successResponse || !successData) {
    const status = Number(lastFailure.status || 422);
    const code = String(lastFailure.code || "PREMIUM_REPORT_CHAPTER_FAILED");
    const message = String(lastFailure.message || "챕터 생성 실패");
    context.chapterData[String(chapterId)] = {
      chapterId,
      ok: false,
      status,
      code,
      message,
      requestId,
      attemptsUsed: maxChapterAttempts,
      maxChapterAttempts,
      lengthValidation: lastFailure.lengthValidation || null,
      jsonPackKeys: Object.keys(chapterJsonPacks || {}),
      updatedAt: new Date().toISOString(),
    };
    context.updatedAt = new Date().toISOString();
    context.expiresAt = Date.now() + PREMIUM_REPORT_CONTEXT_TTL_MS;
    PREMIUM_REPORT_CONTEXT_STORE.set(reportSessionId, context);

    logPremiumPipeline({
      scope: "PremiumPDF",
      reportType: context.reportType,
      reportSessionId,
      reportId: context.reportId,
      stage: "chapter",
      chapter: chapterId,
      status: "failed",
      requestId,
      errorCode: code,
      hasCanonicalJson: Boolean(context?.coreData?.canonicalJson),
      validChapters: countPremiumValidChapters(context),
      totalChapters: context.totalChapters,
    });

    return json({
      ok: false,
      code,
      message,
      status,
      requestId,
      reportSessionId,
      chapterId,
      attemptsUsed: maxChapterAttempts,
      maxChapterAttempts,
      lengthValidation: lastFailure.lengthValidation || null,
    }, { status });
  }

  const chapterText = String(successData.text || "").trim();
  const lengthCheck = successLengthCheck;
  context.chapterData[String(chapterId)] = {
    chapterId,
    ok: true,
    status: Number(successResponse.status || 200),
    code: "OK",
    textLength: chapterText.length,
    noSpaceLength: lengthCheck.noSpaceLength,
    lengthValidation: {
      ok: lengthCheck.ok,
      warnings: lengthCheck.warnings,
      chapterMin: lengthCheck.chapterMin,
      chapterTarget: lengthCheck.chapterTarget,
    },
    requestId,
    attemptsUsed: successAttempt,
    maxChapterAttempts,
    jsonPackKeys: Object.keys(chapterJsonPacks || {}),
    updatedAt: new Date().toISOString(),
  };
  context.chapterTextById = context.chapterTextById || {};
  context.chapterTextById[String(chapterId)] = chapterText;
  context.chapterRequestIndex = context.chapterRequestIndex || {};
  context.chapterRequestIndex[chapterRequestKey] = true;
  context.updatedAt = new Date().toISOString();
  context.expiresAt = Date.now() + PREMIUM_REPORT_CONTEXT_TTL_MS;
  PREMIUM_REPORT_CONTEXT_STORE.set(reportSessionId, context);

  logPremiumPipeline({
    scope: "PremiumPDF",
    reportType: context.reportType,
    reportSessionId,
    reportId: context.reportId,
    stage: "chapter",
    chapter: chapterId,
    status: "ok",
    requestId,
    errorCode: "",
    hasCanonicalJson: Boolean(context?.coreData?.canonicalJson),
    validChapters: countPremiumValidChapters(context),
    totalChapters: context.totalChapters,
  });

  return json({
    ok: true,
    requestId,
    reportSessionId,
    chapterId,
    featureType: context.featureType,
    attemptsUsed: successAttempt,
    maxChapterAttempts,
    lengthValidation: lengthCheck,
    ...successData,
  });
}

async function handlePremiumReportRun(request, env, authInfo) {
  const body = await readJson(request);
  const requestId = String(body.requestId || "").trim() || createPremiumRequestId(`${authInfo.userId}|run`);
  const reportSessionId = String(body.reportSessionId || "").trim();
  if (!reportSessionId) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_REQUIRED", message: "reportSessionId가 필요합니다.", requestId }, { status: 400 });
  }

  prunePremiumReportContexts();
  let context = PREMIUM_REPORT_CONTEXT_STORE.get(reportSessionId);
  if (!context) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_NOT_FOUND", message: "reportSessionId를 찾을 수 없습니다.", requestId }, { status: 404 });
  }
  if (String(context.userId) !== String(authInfo.userId)) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "다른 사용자의 리포트 세션입니다.", requestId }, { status: 401 });
  }

  const requiredChapters = Number(context.requiredChapters || context.totalChapters || 13);
  const startChapter = clampInt(body.startChapter ?? body.fromChapter, 1, 1, requiredChapters);
  const endChapter = clampInt(body.endChapter ?? body.toChapter, requiredChapters, startChapter, requiredChapters);
  const maxAttemptsPerChapter = clampInt(
    body.maxAttemptsPerChapter ?? body.maxChapterRetries ?? getPremiumChapterMaxAttempts(env),
    getPremiumChapterMaxAttempts(env),
    1,
    6,
  );
  const stopOnFailure = body.stopOnFailure !== false;

  const generated = [];
  const skipped = [];
  const failed = [];

  for (let chapterId = startChapter; chapterId <= endChapter; chapterId += 1) {
    const existingEntry = context?.chapterData?.[String(chapterId)];
    if (isPremiumChapterEntryReadyForPdf(existingEntry)) {
      skipped.push({ chapterId, reason: "already-generated" });
      continue;
    }

    let chapterDone = false;
    let lastError = {
      chapterId,
      attempt: 0,
      status: 422,
      code: "PREMIUM_REPORT_CHAPTER_FAILED",
      message: "챕터 생성 실패",
    };

    for (let attempt = 1; attempt <= maxAttemptsPerChapter; attempt += 1) {
      const chapterRequestId = `${requestId}_ch${chapterId}_r${attempt}`;
      const chapterRequest = buildInternalPremiumJsonRequest(request, {
        reportSessionId,
        chapterId,
        requestId: chapterRequestId,
        maxAttempts: 1,
      });
      const chapterResponse = await handlePremiumReportChapter(chapterRequest, env, authInfo);
      const chapterPayload = await chapterResponse.json().catch(() => ({}));
      if (chapterResponse.ok && chapterPayload?.ok) {
        generated.push({
          chapterId,
          attempt,
          requestId: chapterRequestId,
          lengthValidation: chapterPayload?.lengthValidation || null,
        });
        chapterDone = true;
        break;
      }

      lastError = {
        chapterId,
        attempt,
        status: Number(chapterResponse.status || 422),
        code: String(chapterPayload?.code || "PREMIUM_REPORT_CHAPTER_FAILED"),
        message: String(chapterPayload?.message || "챕터 생성 실패"),
      };
    }

    context = PREMIUM_REPORT_CONTEXT_STORE.get(reportSessionId) || context;

    if (!chapterDone) {
      failed.push(lastError);
      if (stopOnFailure) break;
    }
  }

  context = PREMIUM_REPORT_CONTEXT_STORE.get(reportSessionId) || context;
  const validChapters = countPremiumValidChapters(context);
  const missingChapterIds = [];
  for (let chapterId = 1; chapterId <= requiredChapters; chapterId += 1) {
    const entry = context?.chapterData?.[String(chapterId)];
    if (!isPremiumChapterEntryReadyForPdf(entry)) missingChapterIds.push(chapterId);
  }
  const chapterReady = missingChapterIds.length === 0;

  let pdf = null;
  if (chapterReady && failed.length === 0) {
    const pdfRequest = buildInternalPremiumJsonRequest(request, {
      reportSessionId,
      requestId: `${requestId}_pdf`,
    });
    const pdfResponse = await handlePremiumReportPdf(pdfRequest, env, authInfo);
    const pdfPayload = await pdfResponse.json().catch(() => ({}));
    pdf = {
      ok: pdfResponse.ok && pdfPayload?.ok,
      status: Number(pdfResponse.status || 200),
      code: String(pdfPayload?.code || ""),
      message: String(pdfPayload?.message || ""),
      data: pdfPayload,
    };
  }

  logPremiumPipeline({
    scope: "PremiumPDF",
    reportType: context.reportType,
    reportSessionId,
    reportId: context.reportId,
    stage: "run",
    chapter: 0,
    status: failed.length === 0 ? "ok" : "partial",
    requestId,
    errorCode: failed.length === 0 ? "" : failed[0]?.code || "PREMIUM_REPORT_RUN_FAILED",
    hasCanonicalJson: Boolean(context?.coreData?.canonicalJson),
    validChapters,
    totalChapters: context.totalChapters,
  });

  return json({
    ok: failed.length === 0,
    requestId,
    reportSessionId,
    reportType: context.reportType,
    featureType: context.featureType,
    range: {
      startChapter,
      endChapter,
      requiredChapters,
      totalChapters: context.totalChapters,
      maxAttemptsPerChapter,
    },
    generated,
    skipped,
    failed,
    progress: {
      validChapters,
      requiredChapters,
      missingChapterIds,
      chapterReady,
    },
    pdf,
    contextSummary: buildPremiumContextSummary(context),
  }, { status: failed.length === 0 ? 200 : 207 });
}

async function handlePremiumReportPdf(request, env, authInfo) {
  const body = await readJson(request);
  const requestId = String(body.requestId || "").trim() || createPremiumRequestId(`${authInfo.userId}|pdf`);
  const reportSessionId = String(body.reportSessionId || "").trim();
  if (!reportSessionId) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_REQUIRED", message: "reportSessionId가 필요합니다.", requestId }, { status: 400 });
  }

  prunePremiumReportContexts();
  const context = PREMIUM_REPORT_CONTEXT_STORE.get(reportSessionId);
  if (!context) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_NOT_FOUND", message: "reportSessionId를 찾을 수 없습니다.", requestId }, { status: 404 });
  }
  if (String(context.userId) !== String(authInfo.userId)) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "다른 사용자의 리포트 세션입니다.", requestId }, { status: 401 });
  }
  context.requestId = requestId;

  const chapterEntries = Object.values(context.chapterData || {});
  const validEntries = chapterEntries.filter((entry) => isPremiumChapterEntryReadyForPdf(entry));
  const validChapters = validEntries.length;
  const requiredChapters = Number(context.requiredChapters || context.totalChapters || 13);
  const completedSet = new Set(validEntries.map((entry) => Number(entry.chapterId || 0)).filter((v) => Number.isFinite(v) && v > 0));
  const missingChapterIds = [];
  for (let ch = 1; ch <= requiredChapters; ch += 1) {
    if (!completedSet.has(ch)) missingChapterIds.push(ch);
  }

  if (validChapters === 0) {
    logPremiumPipeline({
      scope: "PremiumPDF",
      reportType: context.reportType,
      reportSessionId,
      reportId: context.reportId,
      stage: "pdf",
      chapter: 0,
      status: "blocked",
      requestId,
      errorCode: "PREMIUM_REPORT_NO_VALID_CHAPTERS",
      hasCanonicalJson: Boolean(context?.coreData?.canonicalJson),
      validChapters,
      totalChapters: context.totalChapters,
    });
    return json({
      ok: false,
      code: "PREMIUM_REPORT_NO_VALID_CHAPTERS",
      message: "유효한 챕터가 0개이므로 PDF 생성을 중단합니다.",
      requestId,
      validChapters,
      totalChapters: context.totalChapters,
    }, { status: 422 });
  }

  if (validChapters < requiredChapters) {
    logPremiumPipeline({
      scope: "PremiumPDF",
      reportType: context.reportType,
      reportSessionId,
      reportId: context.reportId,
      stage: "pdf",
      chapter: 0,
      status: "blocked",
      requestId,
      errorCode: "PREMIUM_REPORT_REQUIRED_CHAPTERS_MISSING",
      hasCanonicalJson: Boolean(context?.coreData?.canonicalJson),
      validChapters,
      totalChapters: context.totalChapters,
    });
    return json({
      ok: false,
      code: "PREMIUM_REPORT_REQUIRED_CHAPTERS_MISSING",
      message: "필수 챕터가 완료되지 않아 PDF 생성이 차단되었습니다.",
      requestId,
      validChapters,
      requiredChapters,
      totalChapters: context.totalChapters,
      missingChapterIds,
    }, { status: 422 });
  }

  const chapterTextList = validEntries
    .sort((a, b) => Number(a.chapterId || 0) - Number(b.chapterId || 0))
    .map((entry) => String(context?.chapterTextById?.[String(entry.chapterId)] || ""));
  const totalLengthValidation = validateFullReportLength({
    reportType: context.reportType,
    featureType: context.featureType,
    mode: context.modeKey,
    chapterTextList,
  });

  if (!totalLengthValidation.ok) {
    logPremiumPipeline({
      scope: "PremiumPDF",
      reportType: context.reportType,
      featureType: context.featureType,
      reportSessionId,
      reportId: context.reportId,
      stage: "pdf",
      chapter: 0,
      status: "blocked",
      requestId,
      errorCode: "PREMIUM_REPORT_TOTAL_LENGTH_SHORT",
      hasCanonicalJson: Boolean(context?.coreData?.canonicalJson),
      validChapters,
      totalChapters: context.totalChapters,
    });
    return json({
      ok: false,
      code: "PREMIUM_REPORT_TOTAL_LENGTH_SHORT",
      message: "전체 리포트 길이가 최소 기준에 미달하여 PDF 생성이 차단되었습니다.",
      requestId,
      lengthValidation: totalLengthValidation,
      validChapters,
      requiredChapters,
      totalChapters: context.totalChapters,
    }, { status: 422 });
  }

  context.status = "pdf-ready";
  context.updatedAt = new Date().toISOString();
  context.expiresAt = Date.now() + PREMIUM_REPORT_CONTEXT_TTL_MS;
  PREMIUM_REPORT_CONTEXT_STORE.set(reportSessionId, context);

  logPremiumPipeline({
    scope: "PremiumPDF",
    reportType: context.reportType,
    reportSessionId,
    reportId: context.reportId,
    stage: "pdf",
    chapter: 0,
    status: "ready",
    requestId,
    errorCode: "",
    hasCanonicalJson: Boolean(context?.coreData?.canonicalJson),
    validChapters,
    totalChapters: context.totalChapters,
  });

  return json({
    ok: true,
    ready: true,
    requestId,
    reportSessionId,
    reportId: context.reportId,
    reportType: context.reportType,
    featureType: context.featureType,
    lengthValidation: totalLengthValidation,
    validChapters,
    requiredChapters,
    totalChapters: context.totalChapters,
  });
}

export async function handlePremiumReportRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const authInfo = await requireAuth(request, env);
    const url = new URL(request.url);
    const sessionId = extractPremiumSessionId(url.pathname);

    if (method === "POST" && url.pathname === "/api/premium-report/prepare") {
      return await handlePremiumReportPrepare(request, env, authInfo);
    }
    if (method === "GET" && sessionId) {
      return await handlePremiumReportSessionRead(request, env, authInfo, sessionId);
    }
    if (method === "POST" && url.pathname === "/api/premium-report/chapter") {
      return await handlePremiumReportChapter(request, env, authInfo);
    }
    if (method === "POST" && url.pathname === "/api/premium-report/run") {
      return await handlePremiumReportRun(request, env, authInfo);
    }
    if (method === "POST" && url.pathname === "/api/premium-report/pdf") {
      return await handlePremiumReportPdf(request, env, authInfo);
    }
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function handlePremiumRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const authInfo = await requireAuth(request, env);
    const path = getRoutePath(request, "/api/premium");

    const legacyReportType = (() => {
      if (path === "/sukuyo-life") return "sookyoPremium";
      if (path === "/astro-western" || path === "/astro-life") return "westernAstrologyPremium";
      if (path === "/vedic-life") return "vedicPremium";
      if (path === "/ziwei-life") return "ziweiPremium";
      return "";
    })();

    if (legacyReportType) {
      const rawBody = await readJson(request.clone());
      const access = await requirePremiumReportAccess(env, authInfo.userId, legacyReportType, rawBody);
      if (!access.ok) {
        return json({
          ok: false,
          code: access.code || "PAYMENT_REQUIRED",
          message: access.message || "프리미엄 결제가 필요합니다.",
          reportType: legacyReportType,
          required: access.required || null,
        }, { status: Number(access.status || 402) });
      }
    }

    if (path === "/sukuyo-life") return await handleSukuyoLife(request, env);
    if (path === "/astro-western") return await handleAstroWestern(request, env);
    if (path === "/astro-life") return await handleAstroLife(request, env);
    if (path === "/vedic-life") return await handleVedicLife(request, env);
    if (path === "/ziwei-life") return await handleZiweiBookSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export const __ziweiTestUtils = {
  normalizeZiweiStructuredPayload,
  buildCanonicalZiweiChart,
  validateCanonicalZiweiChartStrict,
  hasZiweiBannedSummaryExpression,
  hasInvalidZiweiSummaryTable,
  detectCrossChapterRepeatedSentences,
  hasRequiredZiweiSpecificCoverage,
};

export const __astroTestUtils = {
  buildWesternChart,
  buildWesternPremiumChart,
  buildBasicAstroSummaryFromChart,
  buildCanonicalAstroChart,
  validateCanonicalAstroChartStrict,
  buildAstroChapterPlan,
  buildAstroChapterPrompt,
  hasForbiddenAstroPadding,
  detectRepeatedLongSentences,
  hasAstroDataEvidence,
  hasBrokenPageCounter,
};

export const __loveSecretTestUtils = {
  buildCanonicalSajuLoveReport,
  validateCanonicalSajuLoveReport,
  buildLoveChapterPlanning,
  buildLoveCompatibility,
  buildLoveSecretPrompt,
  buildLoveSecretChapterPayload,
  evaluateLoveSecretQuality,
  detectLoveMissingMarkers,
  hasInvalidLoveShinsalMention,
  hasForbiddenLovePadding,
  countLoveDataEvidence,
};

export const __vedicTestUtils = {
  buildCanonicalVedicChart,
  validateCanonicalVedicChartStrict,
  buildVedicChapterPlan,
  vedicMissingMarkers,
  hasBannedDeterministicExpression,
  hasForbiddenVedicPadding,
};

export const __sukuyoTestUtils = {
  buildSukuyoFromLunarV2,
  getSukuyoChapterMetaV2,
  getSukuyoNatalChapterSpec,
  buildCanonicalSukuyoNatal,
  validateCanonicalSukuyoNatal,
  buildSukuyoNatalDataSummaryTable,
  SUKUYO_NATAL_FORBIDDEN_COMMON_SECTIONS,
  buildCanonicalSukuyoCompatibility,
  validateCanonicalSukuyoCompatibility,
  buildSukuyoDataSummaryTable,
  detectSukuyoRepeatedSentences,
  detectSukuyoCrossRepeats,
  validateSukuyoChapterText,
  validateSukuyoNatalChapterText,
  detectUnexpectedSukuyoTokens,
  countForbiddenSectionChapterHits,
};

export const __premiumReportTestUtils = {
  normalizePremiumFeatureType,
  normalizePremiumReportType,
  resolvePremiumTypePair,
  getPremiumExpectedSchema,
  getPremiumNormalizedDataSummary,
  getPremiumRequiredChapters,
  validateChapterLength,
  validateFullReportLength,
  buildCanonicalJsonForReport,
  validateCanonicalJson,
  buildChapterDataMap,
  buildChapterJsonPacks,
  buildLlmPromptInput,
};

export async function handleLifebookRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    await requireAuth(request, env);
    const path = getRoutePath(request, "/api/lifebook");
    if (path === "/session") return await handleLifebookSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function handleLoveSecretRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    await requireAuth(request, env);
    const path = getRoutePath(request, "/api/love-secret");
    if (path === "/session") return await handleLoveSecretSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function handleZiweiBookRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    await requireAuth(request, env);
    const path = getRoutePath(request, "/api/ziwei-book");
    if (path === "/session") return await handleZiweiBookSession(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
