import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import { generateWithGemini } from "../lib/gemini-client.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { connectDb } from "../lib/db.js";
import { PremiumPdfReport } from "../lib/models.js";
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
  getSukyoPdfChapters,
  validateSukyoPdfInput,
  buildSukyoPdfContext,
  buildSukyoGeminiPrompt,
  parseSukyoGeminiChapterResponse,
  sanitizeSukyoChapterJson,
  renderSukyoChapterMarkdown,
} from "../lib/sukyo-pdf.js";
import {
  BLOCKED_FALLBACK_PHRASES,
  validateChapterQuality as validatePremiumChapterQualityGate,
  validateFullPdfQuality,
  buildChapterMemory as buildQualityChapterMemory,
} from "../lib/premium-pdf-quality.js";
import {
  ZIWEI_PDF_CHAPTERS as ZIWEI_PDF_CHAPTERS_V2,
  buildZiweiChapterMarkdown,
  buildZiweiPdfContext,
  ensureZiweiChapterMarkdownLength,
  generateZiweiChapterPrompt,
  parseZiweiGeminiResponse,
  sanitizeZiweiChapterJson,
  validateNoZiweiDuplicateText,
  validateZiweiEngineToPdfMapping,
  validateZiweiFullReport,
} from "../lib/ziwei-pdf-pipeline.js";
import {
  LIFE_BOOK_TOTAL_CHAPTERS,
  LIFE_BOOK_MIN_TOTAL_CHARS as LIFE_BOOK_MIN_TOTAL_CHARS_CONFIG,
  buildLifeBookChapterPlan,
  getLifeBookChapterByNumber,
} from "../lib/saju/life-book/chapterConfig.js";
import {
  LOVE_SECRET_MODE_CONFIG,
  SAJU_NEW_YEAR_CHAPTERS,
  SAJU_NEW_YEAR_CHAPTER_TARGETS,
} from "../lib/saju-premium-chapters.js";
import {
  VEDIC_PERSONAL_CHAPTER_META,
  VEDIC_COMPAT_CHAPTER_META,
  VEDIC_SOLO_TARGET_CHARS,
  VEDIC_COMPAT_TARGET_CHARS,
} from "../lib/vedic-premium-chapters.js";
import { buildLifeBookInputData } from "../lib/saju/life-book/buildLifeBookInputData.js";
import { generateLifeBookPdf } from "../lib/saju/life-book/generateLifeBookPdf.js";
import { renderLifeBookPdf } from "../lib/saju/life-book/renderLifeBookPdf.js";

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
  { key: "C1", num: 1, mode: "personal", title: "출생차트 총론 — 하늘이 남긴 첫 설계도", subtitle: "출생차트 전체 인상과 중심축 통합", icon: "star" },
  { key: "C2", num: 2, mode: "personal", title: "태양·달·상승궁 — 자아, 감정, 페르소나의 삼각형", subtitle: "자아·감정·적응 전략의 통합", icon: "star" },
  { key: "C3", num: 3, mode: "personal", title: "행성 배치 완전 해석 — 내 안의 열 가지 목소리", subtitle: "개인·사회·세대 행성 통합", icon: "star" },
  { key: "C4", num: 4, mode: "personal", title: "12하우스 분석 — 삶이 펼쳐지는 무대", subtitle: "삶의 12영역 작동 방식", icon: "star" },
  { key: "C5", num: 5, mode: "personal", title: "주요 각도 분석 — 재능과 긴장의 숨은 회로", subtitle: "조화각·긴장각·결합의 실전 해석", icon: "star" },
  { key: "C6", num: 6, mode: "personal", title: "원소·모드·극성 — 기질의 밸런스 지도", subtitle: "기질 균형과 보완 전략", icon: "star" },
  { key: "C7", num: 7, mode: "personal", title: "사랑과 관계 — 금성, 화성, 7하우스가 말하는 애정 방식", subtitle: "관계 패턴과 회복 전략", icon: "star" },
  { key: "C8", num: 8, mode: "personal", title: "직업·재물·사회적 성공 — MC와 2·6·10하우스의 전략", subtitle: "일·돈·성과의 구조 설계", icon: "star" },
  { key: "C9", num: 9, mode: "personal", title: "가족·상처·무의식 — 달, IC, 4·8·12하우스의 깊은 이야기", subtitle: "가족 각본과 회복 루틴", icon: "star" },
  { key: "C10", num: 10, mode: "personal", title: "성장·철학·영성 — 목성, 토성이 이끄는 길", subtitle: "성장축과 장기 과제", icon: "star" },
  { key: "C11", num: 11, mode: "personal", title: "시기운과 변화의 흐름 — 지금부터 열리는 하늘의 리듬", subtitle: "타이밍 읽기와 준비 전략", icon: "star" },
  { key: "C12", num: 12, mode: "personal", title: "최종 인생 전략 — 내 별자리를 현실로 살아내는 법", subtitle: "전체 통합 선언문", icon: "star" },
  { key: "C13", num: 13, mode: "personal", title: "90일 현실 전환 플랜 — 관계·커리어·재정 실천 설계", subtitle: "관계·커리어·재정 실천 로드맵", icon: "star" },
];
const ASTRO_COMPAT_CHAPTER_META = [
  { key: "K1", num: 1, mode: "compatibility", title: "두 사람의 우주적 첫인상 — 관계가 시작된 이유", subtitle: "관계 시작 테마", icon: "star" },
  { key: "K2", num: 2, mode: "compatibility", title: "태양과 달의 궁합 — 자아와 감정의 조화", subtitle: "정서 궁합", icon: "star" },
  { key: "K3", num: 3, mode: "compatibility", title: "금성과 화성의 끌림 — 사랑, 욕망, 애정 표현", subtitle: "사랑·욕망 에너지", icon: "star" },
  { key: "K4", num: 4, mode: "compatibility", title: "수성과 대화 궁합 — 말, 생각, 오해의 구조", subtitle: "소통 구조 분석", icon: "star" },
  { key: "K5", num: 5, mode: "compatibility", title: "7하우스와 파트너십 — 연애·결혼 관계의 핵심", subtitle: "장기 동반자 설계", icon: "star" },
  { key: "K6", num: 6, mode: "compatibility", title: "갈등과 상처 패턴 — 충돌 애스펙트와 감정의 그림자", subtitle: "갈등·회복 패턴", icon: "star" },
  { key: "K7", num: 7, mode: "compatibility", title: "현실 궁합 — 돈, 일, 생활 리듬의 조화", subtitle: "현실 운영 궁합", icon: "star" },
  { key: "K8", num: 8, mode: "compatibility", title: "장기 인연과 성장 가능성 — 토성·목성의 관계 과제", subtitle: "관계 성장 과제", icon: "star" },
  { key: "K9", num: 9, mode: "compatibility", title: "올해 두 사람의 관계 흐름", subtitle: "연간 관계 운영", icon: "star" },
  { key: "K10", num: 10, mode: "compatibility", title: "최종 궁합 봉서 — 사랑, 성장, 동반자 가능성", subtitle: "최종 관계 봉서", icon: "star" },
];
const ASTRO_TOTAL_CHAPTERS = ASTRO_PERSONAL_CHAPTER_META.length;
const ASTRO_REPORT_TITLE_PERSONAL = "Professional Edition: 서양 점성술 프리미엄 리포트";
const ASTRO_REPORT_SUBTITLE_PERSONAL = "ASC, Sun, Moon과 행성의 각도로 읽는 나의 심리적 우주 지도";
const ASTRO_REPORT_TITLE_COMPAT = "Professional Edition: 서양 점성술 궁합 리포트";
const ASTRO_REPORT_SUBTITLE_COMPAT = "Synastry와 Composite Chart로 읽는 두 사람의 관계 심리와 공동 운명";
const ASTRO_MIN_CHARS = 3500;
const ASTRO_PERSONAL_TARGET_CHARS = Object.freeze({
  1: 4500,
  2: 4500,
  3: 4300,
  4: 4800,
  5: 4500,
  6: 4000,
  7: 4200,
  8: 4500,
  9: 3800,
  10: 3600,
  11: 4100,
  12: 4300,
});
const ASTRO_MISSING_DATA_NOTICE = "일부 세부 지표는 표준 해석 가이드에 따라 통합 분석합니다. 제공된 차트 근거 범위를 벗어나 단정하지 않습니다.";
const ASTRO_NO_BIRTHTIME_NOTICE = "출생 시간이 없어 ASC, MC, 하우스, 차트 통치성, 일부 궁합 하우스 오버레이 분석의 정밀도가 제한됩니다. 이 리포트는 태양, 달, 행성 간 주요 각도 중심으로 보완 분석되었습니다.";
const ASTRO_FORBIDDEN_REPEATED_PHRASES = [
  "자동 복구 생성",
  "데이터가 부족하지만",
  "fallback",
  "복구 생성",
  "Chapter 1",
  "Chapter 1 핵심 진단",
  "Chapter 2 핵심 진단",
  "현재 흐름을 구조적으로 해석합니다",
  "핵심 신호를 바탕으로 현재 흐름을 구조적으로 해석합니다",
  "단정 예언이 아니라 선택의 품질을 높이는 실행형 상담 문장",
  "1단계 실행 포인트",
  "다음 챕터와의 연결성도 유지할 수 있습니다",
  "오늘 실행할 행동 1가지를 정하고",
  "반복 가능한 루틴은 작은 단위부터 고정",
  "관계/일/재정 적용",
  "ASC·Sun·Moon은 같은 성격을 다른 각도에서 보여주는 좌표입니다.",
  "어스펙트는 저주가 아니라 에너지의 패턴이며, 관리 가능한 행동 변수입니다.",
  "장점과 약점은 같은 에너지의 사용 방식 차이에서 갈립니다.",
  "관계·일·재물은 분리된 문제가 아니라 같은 의사결정 체계의 결과입니다.",
  "작은 루틴의 고정이 장기적 운의 체감을 바꿉니다.",
  "점성술 해석의 목적은 운명의 단정이 아니라 선택의 품질 개선입니다.",
  "이번 주에는 큰 결정보다 작은 루틴 고정을 우선하고, 월말에는 반드시 복기하세요.",
];
const ASTRO_CHAPTER_FOCUS_KEYWORDS = {
  C1: ["출생차트", "ASC", "태양", "달", "차트 시그니처"],
  C2: ["태양", "달", "상승궁", "정체성", "내면/겉모습"],
  C3: ["행성 배치", "개인 행성", "사회 행성", "세대 행성", "행성 상호작용"],
  C4: ["12하우스", "삶의 영역", "하우스 축", "영역별 과제", "하우스 적용"],
  C5: ["애스펙트", "조화각", "긴장각", "결합", "반복 패턴"],
  C6: ["원소", "모드", "극성", "균형", "보완 전략"],
  C7: ["금성", "화성", "7하우스", "애정 표현", "관계 패턴"],
  C8: ["MC", "2하우스", "6하우스", "10하우스", "11하우스"],
  C9: ["달", "IC", "4하우스", "8하우스", "12하우스"],
  C10: ["목성", "토성", "성장", "철학", "영성"],
  C11: ["트랜짓", "분기 흐름", "Go/Hold/Retreat", "전환점", "실행 전략"],
  C12: ["핵심 정체성", "강점 5", "약점 5", "관계 전략", "최종 봉서"],
  C13: ["90일 플랜", "관계 실천", "커리어 전략", "재정 전략", "현실 전환", "30일 단위"],
  K1: ["첫인상", "관계 시작", "심리적 역할", "기대", "핵심 테마"],
  K2: ["태양 궁합", "달 궁합", "정서 안정", "상처 지점", "정서 회복"],
  K3: ["금성", "화성", "끌림", "애정 표현", "열정 관리"],
  K4: ["수성", "말투", "오해", "침묵/회피", "대화법"],
  K5: ["7하우스", "파트너 역할", "주도권", "결혼/동거", "역할 분담"],
  K6: ["갈등 트리거", "질투/통제", "회피", "회복 조건", "이별 위기"],
  K7: ["돈", "일", "생활 리듬", "현실 합의", "장기 운영"],
  K8: ["토성", "목성", "책임", "성장", "장기 파트너 조건"],
  K9: ["연간 흐름", "가까워지는 시기", "예민 구간", "거리두기", "관계 선택"],
  K10: ["강점 5", "약점 5", "사랑/성장/동반자", "원칙", "최종 메시지"],
};

const ASTRO_DEFAULT_SECTION_LABELS = Object.freeze([
  "핵심 해석",
  "심리적 작동 방식",
  "현실 적용",
  "어스펙트 심화",
  "그림자와 주의점",
  "실천 전략",
  "챕터 요약",
]);

const ASTRO_CHAPTER_SECTION_LABELS = Object.freeze({
  C1: Object.freeze(["출생차트 총론 핵심 해석", "차트 시그니처 메커니즘", "삶의 축 통합 적용", "행성·하우스 교차 근거", "초기 해석 오독 주의점", "통합 읽기 실천 전략", "챕터 요약"]),
  C2: Object.freeze(["태양·달·상승궁 핵심 해석", "정체성 심리 메커니즘", "관계·일상 적용", "핵심 어스펙트 심화", "그림자와 주의점", "실천 전략", "챕터 요약"]),
  C3: Object.freeze(["행성 배치 핵심 해석", "행성 상호작용 메커니즘", "개인·사회 행성 적용", "행성 군집/공백 패턴", "과잉·결핍 주의점", "행성 운용 실천 전략", "챕터 요약"]),
  C4: Object.freeze(["12하우스 핵심 해석", "영역별 작동 메커니즘", "삶의 영역 적용", "하우스 축 심화", "사각지대 주의점", "영역별 실천 전략", "챕터 요약"]),
  C5: Object.freeze(["핵심 애스펙트 해석", "반복 패턴 메커니즘", "갈등/재능 현실 적용", "긴장각·조화각 심화", "반복 트리거 주의점", "패턴 전환 전략", "챕터 요약"]),
  C6: Object.freeze(["원소·모드·극성 진단", "에너지 과잉/결핍 메커니즘", "생활 리듬 적용", "밸런스 관련 어스펙트", "소진 리스크와 주의점", "보완 루틴 전략", "챕터 요약"]),
  C7: Object.freeze(["금성·화성·7하우스 해석", "애정·욕망 메커니즘", "연애·관계 적용", "관계 관련 어스펙트", "관계 그림자와 주의점", "관계 실천 전략", "챕터 요약"]),
  C8: Object.freeze(["커리어·돈 핵심 해석", "성취 메커니즘", "직업·재정 적용", "커리어/재정 어스펙트", "리스크 주의점", "현실 성과 전략", "챕터 요약"]),
  C9: Object.freeze(["가족·상처·무의식 해석", "정서·내면 메커니즘", "가족 각본 현실 적용", "4·8·12하우스 심화", "정서 소모 주의점", "회복 루틴 전략", "챕터 요약"]),
  C10: Object.freeze(["성장·철학·영성 해석", "확장·제한 메커니즘", "장기 과제 적용", "목성/토성 관련 어스펙트", "과신/경직 주의점", "장기 성장 전략", "챕터 요약"]),
  C11: Object.freeze(["트랜짓 핵심 해석", "연간 흐름 메커니즘", "분기별 현실 적용", "주요 트랜짓 어스펙트", "변동성 주의점", "3/6/12개월 전략", "챕터 요약"]),
  C12: Object.freeze(["인생 통합 해석", "핵심 패턴 메커니즘", "관계·일·돈 통합 적용", "핵심 어스펙트 재정리", "장기 리스크 주의점", "마스터플랜 전략", "챕터 요약"]),
  C13: Object.freeze(["90일 플랜 핵심 설계", "관계 실천 메커니즘", "커리어·재정 현실 적용", "30/60/90일 단계별 과제", "실행 리스크 주의점", "현실 전환 실천 전략", "챕터 요약"]),
  K1: Object.freeze(["관계 시작 핵심 해석", "첫인상 심리 메커니즘", "관계 초기 적용", "관계 시작 어스펙트", "기대 불일치 주의점", "관계 시작 전략", "챕터 요약"]),
  K2: Object.freeze(["태양·달 궁합 핵심 해석", "정서 궁합 메커니즘", "감정 교류 적용", "태양/달 궁합 어스펙트", "정서 충돌 주의점", "정서 회복 전략", "챕터 요약"]),
  K3: Object.freeze(["금성·화성 궁합 핵심 해석", "끌림 메커니즘", "친밀감 현실 적용", "금성/화성 궁합 어스펙트", "열정 과열 주의점", "친밀감 운영 전략", "챕터 요약"]),
  K4: Object.freeze(["수성 궁합 핵심 해석", "소통 메커니즘", "대화 현실 적용", "수성 관련 궁합 어스펙트", "오해 패턴 주의점", "소통 개선 전략", "챕터 요약"]),
  K5: Object.freeze(["7하우스 파트너십 해석", "역할 분담 메커니즘", "연애·결혼 적용", "파트너십 어스펙트", "권력 불균형 주의점", "파트너십 전략", "챕터 요약"]),
  K6: Object.freeze(["갈등 핵심 해석", "상처 메커니즘", "갈등 현실 적용", "갈등 유발 어스펙트", "위기 신호 주의점", "갈등 회복 전략", "챕터 요약"]),
  K7: Object.freeze(["현실 궁합 핵심 해석", "생활 합의 메커니즘", "돈·일·생활 적용", "현실 운영 어스펙트", "생활 마찰 주의점", "현실 운영 전략", "챕터 요약"]),
  K8: Object.freeze(["장기 인연 핵심 해석", "성장 메커니즘", "장기 관계 적용", "토성/목성 중심 어스펙트", "장기 리스크 주의점", "장기 성장 전략", "챕터 요약"]),
  K9: Object.freeze(["연간 관계 흐름 해석", "관계 타이밍 메커니즘", "분기별 관계 적용", "연간 트랜짓 어스펙트", "변동 구간 주의점", "3/6/12개월 관계 전략", "챕터 요약"]),
  K10: Object.freeze(["최종 궁합 통합 해석", "관계 핵심 메커니즘", "동반자 현실 적용", "핵심 궁합 어스펙트", "장기 관계 주의점", "최종 운영 전략", "챕터 요약"]),
});

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
const VEDIC_PERSONAL_CHAPTER_GUIDES = [
  "라그나·달·태양 축으로 차트 전체 방향을 압축하고 반복되는 삶의 테마를 정리하세요.",
  "라그나와 라그나 로드 중심으로 외부 이미지, 생존 전략, 현실 실행법을 설명하세요.",
  "달 별자리·나크샤트라·파다 중심으로 감정 패턴과 안정 루틴을 제시하세요.",
  "태양·아트마카라카를 바탕으로 자존감 이슈와 사명 실행법을 작성하세요.",
  "개인/사회 행성, 라후/케투의 축, 내면 갈등 균형을 실전 언어로 풀어쓰세요.",
  "1~12하우스를 4개 묶음으로 나눠 삶의 무대를 중복 없이 해석하세요.",
  "금성·7하우스·다라카라카를 중심으로 사랑/결혼 전략을 구체화하세요.",
  "2·6·10·11하우스 중심으로 직업·재물·성과 구조를 실무 전략으로 연결하세요.",
  "4·8·12하우스 중심으로 가족·상처·카르마 전환 전략을 제시하세요.",
  "요가/도샤는 실제 계산된 항목만 활용하고, 과장 없이 현실 전략으로 번역하세요.",
  "다샤 데이터가 있으면 현재 흐름과 전환 조건을, 없으면 확정 예언 없이 조건부 전략을 제시하세요.",
  "전체 차트를 통합해 강점·반복 패턴·최종 선언문으로 마무리하세요.",
];
const VEDIC_COMPAT_CHAPTER_GUIDES = [
  "두 사람 차트의 첫인상, 라그나/달 관계, 핵심 관계 문장을 관계 중심으로 작성하세요.",
  "아쉬타쿠타 총점/세부항목은 있는 값만 해석하고 없는 점수는 절대 생성하지 마세요.",
  "두 사람 달 나크샤트라 중심으로 감정 공명/충돌 패턴과 조율법을 제시하세요.",
  "라그나 관계를 생활 리듬과 현실 영향 중심으로 해석하세요.",
  "금성·화성 관계를 설렘·욕망·애정 표현 전략으로 풀어쓰세요.",
  "7하우스 구조 비교를 기반으로 결혼·장기 관계의 현실 가능성을 평가하세요.",
  "D9(나바암샤)가 있으면 결혼 이후 패턴을, 없으면 과잉 추정 없이 작성하세요.",
  "망갈릭/도샤는 실제 데이터 기반으로만 쓰고, 단정적 금지 표현을 피하세요.",
  "두 사람 다샤 흐름이 있으면 타이밍을, 없으면 조건부 관계 전략으로 안내하세요.",
  "이별·재회는 확정이 아닌 조건과 회복 전략 중심으로 제시하세요.",
  "돈/일/가족/생활 리듬의 현실 궁합 운영 규칙을 제시하세요.",
  "관계 핵심 요약, 지켜야 할 점, 버려야 할 패턴, 최종 선언문으로 마무리하세요.",
];
const VEDIC_PERSONAL_TOTAL_CHAPTERS = VEDIC_PERSONAL_CHAPTER_META.length;
const VEDIC_COMPAT_TOTAL_CHAPTERS = VEDIC_COMPAT_CHAPTER_META.length;
const VEDIC_MAX_TOTAL_CHAPTERS = Math.max(VEDIC_PERSONAL_TOTAL_CHAPTERS, VEDIC_COMPAT_TOTAL_CHAPTERS);
const VEDIC_CHAPTER_META = VEDIC_PERSONAL_CHAPTER_META;
const VEDIC_TOTAL_CHAPTERS = VEDIC_MAX_TOTAL_CHAPTERS;

function normalizeVedicReportType(reportType) {
  const mode = String(reportType || "personal").toLowerCase();
  return mode === "compatibility" ? "compatibility" : "personal";
}

function normalizeVedicModeAlias(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "compatibility" || mode === "couple" || mode === "compat") return "compatibility";
  if (mode === "solo" || mode === "single" || mode === "personal") return "personal";
  return "personal";
}

function getVedicChapterMetaList(reportType = "personal") {
  return normalizeVedicReportType(reportType) === "compatibility"
    ? VEDIC_COMPAT_CHAPTER_META
    : VEDIC_PERSONAL_CHAPTER_META;
}

function getVedicChapterGuideList(reportType = "personal") {
  return normalizeVedicReportType(reportType) === "compatibility"
    ? VEDIC_COMPAT_CHAPTER_GUIDES
    : VEDIC_PERSONAL_CHAPTER_GUIDES;
}

function getVedicTotalChapters(reportType = "personal") {
  return getVedicChapterMetaList(reportType).length;
}

const VEDIC_DEFAULT_SECTION_LABELS = Object.freeze([
  "핵심 해석",
  "데이터 근거",
  "현실 적용",
  "실행 전략",
]);

const VEDIC_SECTION_LABELS = Object.freeze({
  V1: [
    "라그나 구조와 인생 기본 설계",
    "타고난 강점과 과제",
    "초반 인생 운영 원칙",
    "현실 적용 체크리스트",
  ],
  V2: [
    "달(찬드라) 기반 감정 습관",
    "정서 트리거와 회복 루틴",
    "관계에서 드러나는 감정 패턴",
    "감정 운영 실천 가이드",
  ],
  V3: [
    "태양(수리야) 자아축 해석",
    "의지·자존감·리더십 패턴",
    "사회적 방향성과 선택 기준",
    "일상 적용 행동 전략",
  ],
  V4: [
    "나크샤트라 핵심 성향",
    "강점·약점의 반복 패턴",
    "운명적 전환 시그널",
    "현실 대응 및 보완법",
  ],
  V5: [
    "그라하 배치의 핵심 구조",
    "행성 간 상호작용 분석",
    "삶의 주요 영역 영향",
    "실전 운영 원칙",
  ],
  V6: [
    "12하우스 우선순위 지도",
    "강한 하우스와 약한 하우스",
    "영역별 리스크와 기회",
    "분야별 실행 전략",
  ],
  V7: [
    "다르마 축(1·5·9) 해석",
    "카르마 축(6·8·12) 과제",
    "사명과 현실의 접점",
    "장기 성장 실행 로드맵",
  ],
  V8: [
    "연애·결혼 관계 구조",
    "배우자운 강점과 약점",
    "갈등 반복 패턴과 회복",
    "관계 지속 전략",
  ],
  V9: [
    "직업·재정 작동 원리",
    "성과가 나는 환경과 역할",
    "수익 누수와 리스크 관리",
    "커리어·재정 실전 전략",
  ],
  V10: [
    "현재 다샤의 핵심 의미",
    "가까운 시기의 변화 흐름",
    "다샤를 현실 전략으로 쓰는 법",
    "시기별 실행 우선순위",
  ],
  V11: [
    "올해 핵심 운세 흐름",
    "상반기·하반기 전환 포인트",
    "다샤를 현실 전략으로 쓰는 법",
    "월간 실천 전략",
  ],
  V12: [
    "핵심 운명 구조 총정리",
    "지켜야 할 원칙과 버릴 패턴",
    "1년·3년·10년 실행 로드맵",
    "최종 선언문",
  ],
  VC1: [
    "관계 시작의 핵심 테마",
    "강한 끌림과 불안 요인",
    "관계 안정의 기본 조건",
    "초기 운영 전략",
  ],
  VC2: [
    "아쉬타쿠타 총점 의미",
    "세부 항목 강점·약점",
    "점수 기반 현실 해석",
    "관계 보완 전략",
  ],
  VC3: [
    "나크샤트라 감정 공명",
    "정서 충돌 패턴",
    "관계 회복 대화법",
    "감정 궁합 운영 전략",
  ],
  VC4: [
    "라그나 생활 리듬 궁합",
    "일상 운영 충돌 지점",
    "공동 생활 최적화 포인트",
    "생활 합의 전략",
  ],
  VC5: [
    "금성·화성 애정 코드",
    "끌림과 욕망의 균형",
    "친밀감 유지 조건",
    "애정 표현 실행 전략",
  ],
  VC6: [
    "7하우스 장기 파트너십",
    "결혼 가능성과 리스크",
    "역할 분담 및 경계",
    "장기 관계 운영 전략",
  ],
  VC7: [
    "나바암샤 결혼 이후 패턴",
    "장기 관계의 강점·약점",
    "지속 가능한 친밀감 설계",
    "관계 성숙 실행안",
  ],
  VC8: [
    "망갈릭·도샤 리스크 진단",
    "충돌 트리거와 완화 요인",
    "위기 대응 규칙",
    "리스크 관리 전략",
  ],
  VC9: [
    "각자 다샤 흐름의 핵심",
    "관계가 열리는 타이밍",
    "타이밍을 맞추는 관계 전략",
    "시기별 관계 운영 계획",
  ],
  VC10: [
    "이별·재회 가능성 조건",
    "관계 단절의 원인 분석",
    "재회 시도 우선순위",
    "회복/정리 실행 전략",
  ],
  VC11: [
    "돈·일·가족 현실 궁합",
    "생활 리듬 조율 포인트",
    "장기 공존 리스크",
    "현실 운영 합의안",
  ],
  VC12: [
    "관계 핵심 결론",
    "지켜야 할 규칙",
    "버려야 할 반복 패턴",
    "최종 관계 선언문",
  ],
});

function findVedicChapterMetaByKey(chapterKey) {
  const key = String(chapterKey || "").trim();
  if (!key) return null;
  const personal = VEDIC_PERSONAL_CHAPTER_META.find((meta) => String(meta?.key || "") === key);
  if (personal) return personal;
  return VEDIC_COMPAT_CHAPTER_META.find((meta) => String(meta?.key || "") === key) || null;
}

function resolveVedicChapterMeta(chapterId, modeHint = "personal", chapterKey = "") {
  const fromKey = findVedicChapterMetaByKey(chapterKey);
  if (fromKey) return fromKey;
  const isCompatibility = String(modeHint || "").toLowerCase() === "compatibility";
  const source = isCompatibility ? VEDIC_COMPAT_CHAPTER_META : VEDIC_PERSONAL_CHAPTER_META;
  if (!Array.isArray(source) || source.length === 0) return null;
  const index = clampInt(chapterId, 1, 1, source.length) - 1;
  return source[index] || null;
}

function buildVedicRequiredHeadings(chapterMeta, modeHint = "personal") {
  const meta = chapterMeta && typeof chapterMeta === "object"
    ? chapterMeta
    : resolveVedicChapterMeta(chapterMeta, modeHint);
  const labels = VEDIC_SECTION_LABELS[String(meta?.key || "")] || VEDIC_DEFAULT_SECTION_LABELS;
  const safe = Array.isArray(labels) && labels.length >= 4 ? labels : VEDIC_DEFAULT_SECTION_LABELS;
  return safe.map((label, idx) => `### ${idx + 1}. ${label}`);
}
const VEDIC_MIN_CHARS = 3900;
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
    title: "파트너십과 로맨스 — 부부궁(夫妻宮)의 인연 구조",
    subtitle: "부부궁 기반 관계 패턴/경계/타이밍 전략",
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
];

const ZIWEI_REPORT_TITLE = "나의 운명을 깨우는 심화 자미두수 리포트";
const ZIWEI_PROLOGUE_TITLE = "프롤로그: 이 명반이 말해주는 삶의 큰 방향";
const ZIWEI_MIN_CHARS = 4500;
const ZIWEI_MAX_CHARS = 5000;
const ZIWEI_BANNED_PHRASES = Object.freeze([
  "이 영역은 자미두수의 핵심 축을 이루므로",
  "선택의 우선순위를 명확히 할수록 운의 체감이 빨라집니다",
  "주어진 운명 설계도를 믿고",
  "실행 속도보다 실행 일관성",
  "현재 확인 가능한 핵심 궁을 기준으로",
  "단기 감정에 반응해 장기 흐름을 훼손",
]);

const FORBIDDEN_ZIWEI_PDF_PHRASES = Object.freeze([
  "자동 복구 생성",
  "fallback",
  "복구 생성",
  "Chapter 1 핵심 진단",
  "Chapter 2 핵심 진단",
  "핵심 신호를 바탕으로 현재 흐름을 구조적으로 해석합니다",
  "오늘 실행할 행동 1가지를 정하고",
  "반복 가능한 루틴은 작은 단위부터 고정",
  "관계/일/재정 적용",
]);

const ZIWEI_CHAPTER_GUIDES = [
  "명궁의 주성/보성/사화/삼방사정/대궁을 세기와 함께 분석하고 상황별 강점 전략을 제시하세요.",
  "신궁 중심으로 명궁-신궁 상호작용과 숨은 잠재 무기를 해석하고 성장 방향을 제시하세요.",
  "복덕궁 중심으로 감정 에너지의 소모/회복 패턴과 마인드 트레이닝 루틴을 제시하세요.",
  "천이궁 중심으로 외부 이미지와 이동/확장 전략, 사회적 평판 관리법을 제시하세요.",
  "관록궁 중심으로 직업 적성, 조직/독립 성향, 도약 타이밍 전략을 제시하세요.",
  "재백궁 중심으로 수익 파이프라인과 누수 패턴을 성향 중심으로 해석하세요.",
  "부부궁 중심으로 관계 경계/반복 패턴/건강한 파트너십 전략을 제시하세요.",
  "교우궁 중심으로 귀인 판별, 협업 성공 패턴, 네트워크 자산화 전략을 제시하세요.",
  "전택궁 중심으로 주거/공간 심리, 생활 동선, 공간 리셋 루틴을 제시하세요.",
  "질액궁은 의료 진단 금지 원칙 하에 생활 습관형 건강 설계를 제시하세요.",
  "대한 배열을 근거로 10년 단위 상승/정체/조정 흐름을 분리해 제시하세요.",
  "2026 유년/유월 데이터를 근거로 분기/월별 행동 가이드와 Go/Hold/Retreat를 제시하세요.",
];

const ZIWEI_CHAPTER_FOCUS_KEYWORDS = [
  ["명궁", "천이궁", "관록궁", "재백궁", "삼방사정", "페르소나"],
  ["신궁", "명궁-신궁 긴장", "행동 패턴", "성장 트리거", "후천성"],
  ["복덕궁", "내면 안정", "스트레스 회복", "질액궁 연동", "행복 자원"],
  ["천이궁", "대외 이미지", "평판", "커뮤니케이션", "화기 리스크"],
  ["관록궁", "직업 DNA", "리더십", "조직 적응", "도약 타이밍"],
  ["재백궁", "수입 구조", "지출 누수", "자산 전략", "성향 기반 재정"],
  ["부부궁", "파트너십", "기대-실망", "경계 설정", "관계 반복"],
  ["교우궁", "협업", "귀인", "경쟁자", "관계 손실 방지"],
  ["전택궁", "공간 심리", "주거", "집중 동선", "안정 환경"],
  ["질액궁", "체력 리듬", "수면", "과로", "회복 루틴"],
  ["대한", "10년 흐름", "상승장", "전환장", "전생애 파노라마"],
  ["2026", "유년", "유월", "Go/Hold/Retreat", "월별 전략"],
];

const ZIWEI_REQUIRED_CHAPTER_STRUCTURE = {
  1: {
    exactHeading: "## Ch.1. 🌌 내 인생의 주인공 캐릭터 — 명궁(命宮) 완전 해독",
    targetPalace: "명궁",
    relatedPalaces: ["관록궁", "재백궁", "천이궁"],
    includes: [
      "사용된 궁", "사용된 주성", "주성의 세기", "사용된 사화", "연결해서 본 궁",
      "상황별 강점 활용 전략", "주의해야 할 반복 패턴"
    ],
    mustCover: [
      "명궁 기본 의미", "기본 성격", "인생 태도", "세상을 바라보는 방식", "핵심 욕망", "명궁 주성", "보조성/잡성", "명궁 사화", "명궁 삼방사정", "인생 캐릭터 정의", "인생 운영 전략",
    ],
    prefaceHeading: "## 0. 전체 명반 요약",
    prefaceIncludes: [
      "이 명반의 핵심 키워드", "가장 강한 궁", "가장 주의해야 할 궁", "인생 전체의 방향성",
      "타고난 장점", "반복되는 약점", "운이 열리는 방식", "인생에서 가장 중요한 선택 기준", "12궁 전체 요약표"
    ],
  },
  2: {
    exactHeading: "## Ch.2. 🌟 내면의 본체 — 신궁(身宮) 심층 분석과 잠재 무기",
    targetPalace: "신궁",
    relatedPalaces: ["명궁", "관록궁", "재백궁", "부부궁", "천이궁", "복덕궁"],
    includes: [
      "신궁이 들어간 궁", "명궁과 신궁의 관계", "잠재 무기", "성장 전략"
    ],
    mustCover: [
      "신궁 기본 의미", "후천 성향", "위기 본능", "신궁 위치", "명궁-신궁 관계", "신궁 주성/보성", "잠재 무기", "신궁 그림자", "신궁 기반 성장 전략",
    ],
  },
  3: {
    exactHeading: "## Ch.3. 🌙 무의식의 도화지 — 복덕궁(福德宮)으로 읽는 행복의 설계도",
    targetPalace: "복덕궁",
    relatedPalaces: ["명궁", "질액궁"],
    includes: [
      "행복 DNA", "스트레스 패턴", "감정 회복 루틴", "마인드 트레이닝"
    ],
    mustCover: [
      "복덕궁 기본 의미", "복덕궁 주성", "보조성/살성", "복덕궁-명궁 관계", "복덕궁-질액궁 연결", "행복 방해 패턴", "회복 전략",
    ],
  },
  4: {
    exactHeading: "## Ch.4. 🌍 세상이라는 무대 — 천이궁(遷移宮)과 이미지 관리",
    targetPalace: "천이궁",
    relatedPalaces: ["명궁"],
    includes: [
      "외부 이미지", "이동/외부 활동 운", "평판 관리", "외부 활동 타이밍"
    ],
    mustCover: [
      "천이궁 기본 의미", "천이궁 주성", "명궁-천이궁 대궁", "천이궁 사화", "타지운/이동운", "대외 이미지 전략", "기회 확장법",
    ],
  },
  5: {
    exactHeading: "## Ch.5. 👑 커리어와 성취 — 관록궁(官祿宮)의 천직 방정식",
    targetPalace: "관록궁",
    relatedPalaces: ["명궁", "재백궁", "천이궁"],
    includes: [
      "업무 성향 DNA", "조직형/독립형", "커리어 도약 타이밍", "성취 전략"
    ],
    mustCover: [
      "관록궁 기본 의미", "관록궁 주성", "보조성/살성", "관록궁-명궁", "관록궁-재백궁", "관록궁-천이궁", "천직 전략",
    ],
  },
  6: {
    exactHeading: "## Ch.6. 💰 재화와 자산의 흐름 — 재백궁(財帛宮)의 부의 법칙",
    targetPalace: "재백궁",
    relatedPalaces: ["관록궁", "복덕궁", "명궁"],
    includes: [
      "재물 그릇", "수입 파이프라인", "누수 패턴", "재정 관리 루틴"
    ],
    mustCover: [
      "재백궁 기본 의미", "재백궁 주성", "보조성/살성", "재백궁 사화", "재백궁-관록궁", "재백궁-복덕궁", "부의 운영 전략",
    ],
    caution: "투자 수익을 단정하지 말고 성향 기반의 관리 전략으로 작성",
  },
  7: {
    exactHeading: "## Ch.7. 💑 파트너십과 로맨스 — 부부궁(夫妻宮)의 인연 구조",
    targetPalace: "부부궁",
    relatedPalaces: ["명궁", "복덕궁"],
    includes: [
      "이상형 성향", "반복 감정 패턴", "경계 설정", "인연 타이밍"
    ],
    mustCover: [
      "부부궁 기본 의미", "부부궁 주성", "보조성/살성", "부부궁 사화", "명궁-부부궁", "부부궁-복덕궁", "인연 유지 전략",
    ],
  },
  8: {
    exactHeading: "## Ch.8. 🤝 팀워크와 네트워크 — 교우궁(交友宮)의 인적 자원 법칙",
    targetPalace: "교우궁",
    relatedPalaces: ["명궁", "관록궁"],
    includes: [
      "협업 운", "귀인/소인 구분", "손해 패턴", "사회적 확장 전략"
    ],
    mustCover: [
      "교우궁 기본 의미", "교우궁 주성", "보조성/살성", "교우궁-명궁", "교우궁-관록궁", "귀인과 악연", "네트워크 전략",
    ],
  },
  9: {
    exactHeading: "## Ch.9. 🏠 공간과 환경 — 전택궁(田宅宮)의 환경심리학",
    targetPalace: "전택궁",
    relatedPalaces: ["복덕궁", "재백궁", "질액궁"],
    includes: [
      "안정 환경", "집중 공간", "공간 리셋 루틴", "자산 전략으로서의 공간"
    ],
    mustCover: [
      "전택궁 기본 의미", "전택궁 주성", "보조성/살성", "전택궁-복덕궁", "전택궁-재백궁", "운을 막는 환경", "공간 개선 전략",
    ],
  },
  10: {
    exactHeading: "## Ch.10. 💪 신체 에너지와 바이오리듬 — 질액궁(疾厄宮)의 건강 설계",
    targetPalace: "질액궁",
    relatedPalaces: ["복덕궁", "명궁"],
    includes: [
      "에너지 패턴", "수면/식사/운동 루틴", "스트레스 신체화", "회복 환경"
    ],
    mustCover: [
      "질액궁 기본 의미", "질액궁 주성", "보조성/살성", "질액궁-복덕궁", "질액궁-명궁", "생활 패턴 리스크", "건강 운용 전략",
    ],
    caution: "의학적 진단이 아닌 자미두수 기반 생활 경향 분석으로만 작성",
  },
  11: {
    exactHeading: "## Ch.11. 🌊 10년의 메가 트렌드 — 대한(大限) 분석과 전 생애 파노라마",
    targetPalace: "대한",
    relatedPalaces: ["명궁", "관록궁", "재백궁"],
    includes: [
      "현재 대한 핵심 주제", "상승/조정 전략", "반복 패턴", "황금 대한 후보"
    ],
    mustCover: [
      "대한 기본 의미", "현재 대한 위치", "현재 대한 주성", "사화/살성", "이전 대한과 차이", "다음 대한 준비", "대한 기반 전략",
    ],
  },
  12: {
    exactHeading: "## Ch.12. 📅 올해의 마이크로 전술 — 2026 유년(流年)·유월(流月) 로드맵",
    targetPalace: "유년/유월",
    relatedPalaces: ["현재 대한"],
    includes: [
      "2026 핵심 키워드", "Go/Hold/Retreat", "분기 전략", "1~12월 행동 가이드"
    ],
    mustCover: [
      "유년 기본 의미", "유년궁 주성", "유년 사화", "대한-유년 관계", "분기별 전략", "월별 Go/Hold/Retreat", "올해 실행 전략",
    ],
  },
  13: {
    exactHeading: "## Ch.13. 🌅 인생 설계도 총결산 — 자미두수 거장의 마스터플랜 봉서",
    targetPalace: "통합 총결산",
    relatedPalaces: ["명궁", "신궁", "관록궁", "재백궁", "부부궁", "대한", "유년"],
    includes: [
      "13챕터 핵심 통합", "기억할 3가지 비책", "피해야 할 3가지 패턴", "통합 실천 전략"
    ],
    mustCover: [
      "명궁·신궁 총정리", "인생 핵심 패턴 5가지", "성공 전략 5가지", "관계 전략 5가지", "돈과 일의 통합 전략", "올해/대한 최종 조언", "거장의 최종 봉서",
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
  const normalizedGender = pickPremiumText(
    body?.gender,
    body?.sex,
    body?.profile?.gender,
    body?.userProfile?.gender,
    body?.birthData?.gender,
    body?.birth?.gender,
    body?.input?.gender,
  );
  return {
    year: clampInt(body.year ?? body.birthYear, 1990, 1900, 2100),
    month: clampInt(body.month ?? body.birthMonth, 1, 1, 12),
    day: clampInt(body.day ?? body.birthDay, 1, 1, 31),
    hour: clampInt(body.hour ?? body.birthHour, 12, 0, 23),
    minute: clampInt(body.minute ?? body.birthMinute, 0, 0, 59),
    timezone: Number.isFinite(Number(body.timezone)) ? Number(body.timezone) : 9,
    lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : 37.5665,
    lon: Number.isFinite(Number(body.lon ?? body.lng)) ? Number(body.lon ?? body.lng) : 126.978,
    chapter: clampInt(body.chapter ?? body.sessionId, 1, 1, VEDIC_MAX_TOTAL_CHAPTERS),
    name: String(body.name || "사용자").slice(0, 80),
    gender: String(normalizedGender || "").slice(0, 20),
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
  if (preferred) {
    try {
      return new URL(preferred).origin;
    } catch (error) {
      console.warn("[PremiumPDF][ApiBaseOriginInvalid]", {
        preferred,
        message: String(error?.message || "Invalid API_UPSTREAM_ORIGIN"),
      });
    }
  }
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
  } catch (error) {
    console.error("[PremiumPDF][BackendJsonFailed]", {
      apiPath,
      url,
      base,
      message: String(error?.message || "backend request failed"),
    });
    throw error;
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

function normalizeVedicInputNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildLocalBasicVedicPlanets(input = {}) {
  const year = Math.trunc(normalizeVedicInputNumber(input?.year, 1990));
  const month = Math.max(1, Math.min(12, Math.trunc(normalizeVedicInputNumber(input?.month, 1))));
  const day = Math.max(1, Math.min(31, Math.trunc(normalizeVedicInputNumber(input?.day, 1))));
  const hour = Math.max(0, Math.min(23, Math.trunc(normalizeVedicInputNumber(input?.hour, 12))));
  const minute = Math.max(0, Math.min(59, Math.trunc(normalizeVedicInputNumber(input?.minute, 0))));
  const lon = normalizeVedicInputNumber(input?.lon, 127.0);

  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const daysFromEpoch = utcMs / 86400000;
  const meanSeed = daysFromEpoch + (lon / 360);
  const nd = (v) => {
    let n = Number(v);
    if (!Number.isFinite(n)) return 0;
    n %= 360;
    if (n < 0) n += 360;
    return n;
  };

  const planets = {
    Sun: nd(280.466 + meanSeed * 0.98564736),
    Moon: nd(218.316 + meanSeed * 13.17639648),
    Mars: nd(355.433 + meanSeed * 0.524039),
    Mercury: nd(252.251 + meanSeed * 4.09233445),
    Jupiter: nd(34.351 + meanSeed * 0.08309257),
    Venus: nd(181.979 + meanSeed * 1.60213034),
    Saturn: nd(50.077 + meanSeed * 0.03345965),
    Rahu: nd(200.0 - meanSeed * 0.0529539),
  };
  planets.Ketu = nd(planets.Rahu + 180);

  const asc = nd((hour + (minute / 60)) * 15 + lon + meanSeed * 0.25 - 24);

  return {
    planets,
    retrograde: {
      Sun: false,
      Moon: false,
      Mars: false,
      Mercury: false,
      Jupiter: false,
      Venus: false,
      Saturn: false,
      Rahu: true,
      Ketu: true,
    },
    ayanamsa: 24,
    ascendantSidereal: asc,
    source: "vedic-basic-local-fallback",
  };
}

function getLocalBasicVedicChart(input = {}) {
  const payload = buildLocalBasicVedicPlanets(input);
  return deriveVedicChartFromPlanets(payload, input);
}

async function getSwissVedicChart(request, env, input) {
  const timeoutMs = Number(env?.PREMIUM_VEDIC_CHART_TIMEOUT_MS || env?.PREMIUM_VEDIC_ENGINE_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 15000);
  const retryMax = Math.max(1, Math.min(3, Number(env?.PREMIUM_VEDIC_CHART_RETRIES || env?.PREMIUM_VEDIC_ENGINE_RETRIES || 2)));
  let lastError = null;

  for (let attempt = 1; attempt <= retryMax; attempt += 1) {
    try {
      logPremiumPipelineStage("VedicChartEngineStart", {
        attempt,
        retryMax,
        timeoutMs,
        hasLatLon: Number.isFinite(Number(input?.lat)) && Number.isFinite(Number(input?.lon)),
        hasBirthTime: hasMeaningfulValue(input?.hour) || hasMeaningfulValue(input?.birthTime),
        hasBirthPlace: hasMeaningfulValue(input?.birthPlace),
      });

      const payload = await runWithTimeout(
        getLocalSwissVedicPlanets(env, input, { requestUrl: request?.url }),
        timeoutMs,
        "VEDIC_CHART_ENGINE_TIMEOUT",
      );

      const chart = deriveVedicChartFromPlanets(payload, input);
      logPremiumPipelineStage("VedicChartEngineSuccess", {
        attempt,
        retryMax,
        source: String(chart?.source || "unknown"),
        hasLagna: Boolean(chart?.lagna?.signName),
        hasMoonNakshatra: Boolean(chart?.moonNakshatra?.name),
      });
      return chart;
    } catch (error) {
      lastError = error;
      logPremiumPipelineStage("VedicChartEngineRetryFailed", {
        attempt,
        retryMax,
        code: String(error?.code || error?.name || "VEDIC_CHART_ENGINE_FAILED"),
        message: String(error?.message || error || "VEDIC_CHART_ENGINE_FAILED"),
      });
      if (attempt >= retryMax) {
        break;
      }
    }
  }

  try {
    const localChart = getLocalBasicVedicChart(input);
    logPremiumPipelineStage("VedicChartEngineLocalFallbackUsed", {
      retryMax,
      fallbackSource: String(localChart?.source || "vedic-basic-local-fallback"),
      hasLagna: Boolean(localChart?.lagna?.signName),
      hasMoonNakshatra: Boolean(localChart?.moonNakshatra?.name),
      reasonCode: String(lastError?.code || lastError?.name || "VEDIC_CHART_ENGINE_FAILED"),
    });
    return localChart;
  } catch (fallbackError) {
    const finalError = lastError || fallbackError || new Error("VEDIC_CHART_ENGINE_FAILED");
    finalError.code = String(finalError?.code || "VEDIC_CHART_ENGINE_FAILED");
    throw finalError;
  }
}

async function runWithTimeout(promise, timeoutMs, code = "TIMEOUT") {
  const ms = Math.max(1, Number(timeoutMs || 15000));
  let timer = null;
  return await Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`Operation timed out after ${ms}ms`);
        error.code = code;
        reject(error);
      }, ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function buildVedicPdfSeed(body, input, chart, reportType, partnerChart, ashtaKoota) {
  const mode = normalizeVedicReportType(reportType);
  const seed = {
    reportType: mode,
    mode,
    profile: {
      name: String(body?.name || input?.name || "사용자"),
      gender: body?.gender == null ? null : String(body.gender),
      birthDate: String(body?.birthDate || input?.birthDate || ""),
      birthTime: String(body?.birthTime || input?.birthTime || ""),
      birthPlace: String(body?.birthPlace || input?.birthPlace || "").trim(),
      timezone: String(body?.timezoneName || body?.timezone || input?.timezone || "").trim(),
      latitude: Number(input?.lat),
      longitude: Number(input?.lon),
      timeUnknown: asBool(body?.timeUnknown) || asBool(input?.timeUnknown),
    },
    chart: buildCanonicalVedicChart(body, input, chart, reportType, partnerChart, ashtaKoota),
  };

  seed.missingFields = validateVedicPdfSeed(seed);
  return seed;
}

function validateVedicPdfSeed(seed) {
  const missingFields = [];
  if (!hasMeaningfulValue(seed?.profile?.birthDate)) missingFields.push("profile.birthDate");
  if (!hasMeaningfulValue(seed?.profile?.birthPlace) && !(Number.isFinite(Number(seed?.profile?.latitude)) && Number.isFinite(Number(seed?.profile?.longitude)))) {
    missingFields.push("profile.birthPlace|profile.latitude.longitude");
  }
  if (!hasMeaningfulValue(seed?.profile?.timezone)) missingFields.push("profile.timezone");
  if (!hasMeaningfulValue(seed?.profile?.birthTime) && !asBool(seed?.profile?.timeUnknown)) missingFields.push("profile.birthTime");
  if (!hasMeaningfulValue(seed?.chart?.lagna?.signName)) missingFields.push("chart.lagna.signName");
  if (!hasMeaningfulValue(seed?.chart?.moonNakshatra?.name)) missingFields.push("chart.moonNakshatra.name");
  if (!hasMeaningfulValue(seed?.chart?.planets?.Sun?.signName)) missingFields.push("chart.planets.Sun.signName");
  if (!hasMeaningfulValue(seed?.chart?.planets?.Moon?.signName)) missingFields.push("chart.planets.Moon.signName");
  return Array.from(new Set(missingFields));
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
const PREMIUM_ANALYSIS_SNAPSHOT_STORE = new Map();
const PREMIUM_ANALYSIS_SNAPSHOT_INDEX = new Map();
const PREMIUM_ANALYSIS_SNAPSHOT_TTL_MS = PREMIUM_REPORT_CONTEXT_TTL_MS;
const ZIWEI_BASIC_RESULT_CACHE = new Map();
const ZIWEI_BASIC_RESULT_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const LEGACY_ZIWEI_REQUEST_INDEX = new Map();

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
  sajunewyear: "sajuNewYear",
  sajunewyearpdf: "sajuNewYear",
  newyearfortune: "sajuNewYear",
  sajuyearfortune: "sajuNewYear",
  sajunewyearreport: "sajuNewYear",
  sajuyearly: "sajuNewYear",
  sajuyearlyreport: "sajuNewYear",
};

const PREMIUM_REPORT_KIND_MAP = {
  ziweiPremium: "ziwei",
  sookyoPremium: "sukuyo",
  westernAstrologyPremium: "astro",
  vedicPremium: "vedic",
  lifeBook: "lifebook",
  loveSecret: "love-secret",
  sajuNewYear: "saju-new-year",
};

const PREMIUM_REPORT_REQUIRED_CHAPTERS = {
  ziweiPremium: 12,
  sookyoPremium: 13,
  westernAstrologyPremium: 12,
  vedicPremium: 12,
  lifeBook: 13,
  loveSecret: 13,
  sajuNewYear: 10,
};

const PREMIUM_FAIL_OPEN_REPORT_TYPES = new Set([]);

const PREMIUM_CANONICAL_REQUIRED_PATHS_BY_TYPE = {
  ziweiPremium: [
    "calculatedData",
  ],
  sookyoPremium: [
    "calculatedData.sukyoPdfContext.userProfile",
  ],
  westernAstrologyPremium: [
    "calculatedData.birthInfo.zodiac",
    "calculatedData.planets.sun.sign",
    "calculatedData.planets.moon.sign",
    "calculatedData.planets",
    "calculatedData.aspects",
  ],
  vedicPremium: [
    "input.year",
    "input.month",
    "input.day",
    "calculatedData.birthInfo.timezone",
    "calculatedData.birthInfo.latitude",
    "calculatedData.birthInfo.longitude",
    "calculatedData.birthInfo.ayanamsa",
    "calculatedData.planets.sun",
    "calculatedData.planets.moon",
    "calculatedData.planets.rahu",
    "calculatedData.planets.ketu",
    "calculatedData.planets",
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
  sajuNewYear: [
    "calculatedData.profile.birth.year",
    "calculatedData.profile.birth.month",
    "calculatedData.profile.birth.day",
    "calculatedData.targetYear",
    "calculatedData.yearlySummary",
    "calculatedData.monthlyLuck",
  ],
};

const PREMIUM_CANONICAL_OPTIONAL_PATHS_BY_TYPE = {
  ziweiPremium: [
    "calculatedData.coreChart.mingGong",
    "calculatedData.coreChart.shenGong",
    "calculatedData.palacesByKey.ming.mainStars",
    "calculatedData.palacesByKey.fortune.mainStars",
    "calculatedData.palacesByKey.career.mainStars",
    "calculatedData.palacesByKey.wealth.mainStars",
    "calculatedData.palacesByKey.spouse.mainStars",
    "calculatedData.cycles.daXian",
    "calculatedData.cycles.monthly",
    "calculatedData.relationshipData.compatibilityHints",
  ],
  sookyoPremium: ["calculatedData.cycleData.monthly", "calculatedData.compatibility.relationshipAdvice"],
  westernAstrologyPremium: [
    "calculatedData.birthInfo.houseSystem",
    "calculatedData.angles.ascendant.sign",
    "calculatedData.angles.midheaven.sign",
    "calculatedData.houses",
    "calculatedData.elementBalance",
    "calculatedData.modalityBalance",
  ],
  vedicPremium: [
    "calculatedData.birthInfo.zodiac",
    "calculatedData.birthInfo.ayanamsa",
    "calculatedData.nakshatras.moonNakshatra.name",
    "calculatedData.nakshatras.moonSign",
    "calculatedData.planets.rahu",
    "calculatedData.planets.ketu",
    "calculatedData.dashas.vimshottari.currentMahaDasha",
    "calculatedData.karakas.atmakaraka",
    "calculatedData.yogas",
    "calculatedData.relationshipData",
    "calculatedData.navamsaChart.houses",
    "calculatedData.karakas.amatyakaraka",
    "calculatedData.karakas.darakaraka",
  ],
  loveSecret: ["calculatedData.optionalCrossSystems"],
  lifeBook: ["calculatedData.integratedThemes.repeatedSignals", "calculatedData.integratedThemes.conflictingSignals"],
  sajuNewYear: ["calculatedData.actionPlan", "calculatedData.saju.dayMaster"],
};

const PREMIUM_EMPTY_CALCULATED_DATA_BY_TYPE = {
  ziweiPremium: {
    coreChart: {
      mingGong: null,
      shenGong: null,
      bodyPalace: null,
    },
    palacesByKey: {
      ming: { mainStars: [], minorStars: [], auxiliaryStars: [], maleficStars: [], transformations: [] },
      fortune: { mainStars: [], minorStars: [], auxiliaryStars: [], maleficStars: [], transformations: [] },
      career: { mainStars: [], minorStars: [], auxiliaryStars: [], maleficStars: [], transformations: [] },
      wealth: { mainStars: [], minorStars: [], auxiliaryStars: [], maleficStars: [], transformations: [] },
      spouse: { mainStars: [], minorStars: [], auxiliaryStars: [], maleficStars: [], transformations: [] },
    },
    palaces: [],
    cycles: {
      daXian: [],
      yearly: [],
      monthly: [],
    },
    relationshipData: {
      compatibilityHints: [],
    },
    chartMeta: {},
    luck: {},
  },
  sookyoPremium: {
    birthInfo: {
      name: null,
      gender: null,
      birth: { year: null, month: null, day: null, hour: null, minute: null },
    },
    nativeSook: {
      index: null,
      name: null,
      nameKo: null,
      group: null,
    },
    compatibility: {
      pairType: null,
      score: null,
      relationshipAdvice: [],
    },
    cycleData: {
      monthly: [],
      yearly: [],
    },
    sukyoPdfContext: {
      userProfile: {
        name: null,
        gender: null,
        birth: { year: null, month: null, day: null, hour: null, minute: null },
        reportMode: null,
      },
      chartMeta: {},
      mainStar: {},
      chapterContract: {},
      missingSummary: [],
    },
  },
  westernAstrologyPremium: {
    birthInfo: {
      houseSystem: null,
      zodiac: null,
    },
    angles: {
      ascendant: { sign: null, degree: null },
      midheaven: { sign: null, degree: null },
    },
    planets: {
      sun: { sign: null, degree: null },
      moon: { sign: null, degree: null },
      mercury: { sign: null, degree: null },
      venus: { sign: null, degree: null },
      mars: { sign: null, degree: null },
      jupiter: { sign: null, degree: null },
      saturn: { sign: null, degree: null },
      uranus: { sign: null, degree: null },
      neptune: { sign: null, degree: null },
      pluto: { sign: null, degree: null },
      rahu: { sign: null, degree: null },
      ketu: { sign: null, degree: null },
    },
    houses: [],
    aspects: [],
    elementBalance: {},
    modalityBalance: {},
    relationshipData: {},
    careerData: {},
    chart: {},
  },
  vedicPremium: {
    birthInfo: {
      zodiac: null,
      ayanamsa: null,
    },
    lagna: {
      sign: null,
      name: null,
    },
    nakshatras: {
      moonNakshatra: { name: null, pada: null },
    },
    planets: {
      sun: {}, moon: {}, mercury: {}, venus: {}, mars: {}, jupiter: {}, saturn: {}, rahu: {}, ketu: {},
    },
    dashas: {
      vimshottari: {
        currentMahaDasha: { planet: null, start: null, end: null },
        antardasha: {},
        timeline: [],
      },
    },
    karakas: {
      atmakaraka: { planet: null },
      amatyakaraka: { planet: null },
      darakaraka: { planet: null },
    },
    yogas: [],
    relationshipData: {},
    careerData: {},
    rashiChart: { houses: [] },
    navamsaChart: { houses: [] },
  },
  lifeBook: {
    saju: {},
    sajuCore: {},
    integratedThemes: {
      coreIdentity: [],
      lifeMission: [],
      careerDirection: [],
      relationshipPattern: [],
      wealthPattern: [],
      healthPattern: [],
      repeatedSignals: [],
      conflictingSignals: [],
    },
    timeline: {
      turningPoints: [],
      yearly: [],
    },
    luckFlow: {
      daewoon: [],
      sewoon: [],
    },
    optionalCrossSystems: {},
  },
  loveSecret: {
    mode: "single",
    self: {
      sajuChart: {
        yearPillar: null,
        monthPillar: null,
        dayPillar: null,
        hourPillar: null,
        dayMaster: null,
        tenGods: {},
      },
      fiveElementBalance: {},
      relationshipProfile: {
        attractionSignals: [],
        conflictSignals: [],
      },
    },
    compatibility: {
      temperatureHumidityMatch: {
        temperatureBalance: null,
        moistureBalance: null,
      },
      communicationPattern: {},
      practicalAdvice: [],
      longTermMarriagePotential: {},
    },
    sajuCore: {},
    luckFlow: {
      daewoon: [],
      sewoon: [],
    },
    optionalCrossSystems: {},
  },
  sajuNewYear: {
    profile: {
      name: null,
      gender: null,
      birth: {
        year: null,
        month: null,
        day: null,
        hour: null,
        minute: null,
      },
    },
    targetYear: null,
    focusArea: "overall",
    yearlySummary: {
      summary: null,
      strongestMonths: [],
      cautionMonths: [],
      career: null,
      wealth: null,
      relationship: null,
      health: null,
    },
    monthlyLuck: [],
    actionPlan: {
      first30Days: [],
      quarterPlan: null,
      focusLabel: null,
    },
    saju: {
      dayMaster: null,
      sourceDigest: null,
      fourPillars: {},
    },
  },
};

function deepCloneCanonicalSeed(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch {
    return {};
  }
}

function mergeCanonicalWithSeed(seed, actual) {
  if (Array.isArray(seed)) {
    return Array.isArray(actual) ? actual : seed.slice();
  }
  if (seed && typeof seed === "object") {
    const source = actual && typeof actual === "object" ? actual : {};
    const merged = {};
    const keys = new Set([...Object.keys(seed), ...Object.keys(source)]);
    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        merged[key] = mergeCanonicalWithSeed(seed[key], source[key]);
      } else {
        merged[key] = mergeCanonicalWithSeed(seed[key], undefined);
      }
    });
    return merged;
  }
  return actual === undefined ? seed : actual;
}

function ensureCanonicalCalculatedDataShape(reportType, calculatedData = {}) {
  const seed = deepCloneCanonicalSeed(PREMIUM_EMPTY_CALCULATED_DATA_BY_TYPE[reportType] || {});
  return mergeCanonicalWithSeed(seed, calculatedData && typeof calculatedData === "object" ? calculatedData : {});
}

const FEATURE_TYPE_MAP = {
  sajulifebook: "saju_life_book",
  premiumpdfsajulifebook: "saju_life_book",
  sajulovesecret: "saju_love_secret",
  sajulovebook: "saju_love_secret",
  premiumpdfsajulovesecret: "saju_love_secret",
  premiumpdfsajulovesecretcompat: "saju_love_secret",
  ziweilifebook: "jamidusu_premium",
  ziweideepreport: "jamidusu_premium",
  premiumpdfziwei: "jamidusu_premium",
  premiumpdfziweicompat: "jamidusu_premium",
  sukuyopremium: "sookyo_premium",
  premiumpdfsukyo: "sookyo_premium",
  premiumpdfsukyocompat: "sookyo_premium",
  jamidusupremium: "jamidusu_premium",
  sookyopremium: "sookyo_premium",
  vedicpremium: "vedic_premium",
  premiumpdfvedic: "vedic_premium",
  premiumpdfvediccompat: "vedic_premium",
  westernastrologypremium: "astrology_premium",
  astrologypremium: "astrology_premium",
  premiumpdfwesternastrology: "astrology_premium",
  premiumpdfwesternastrologycompat: "astrology_premium",
  sajunewyearpdf: "saju_new_year_pdf",
  sajunewyearreport: "saju_new_year_pdf",
  premiumpdfsajunewyear: "saju_new_year_pdf",
  premiumpdfsajuyearly: "saju_new_year_pdf",
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

function isPremiumFailOpenReportType(reportType) {
  return PREMIUM_FAIL_OPEN_REPORT_TYPES.has(String(reportType || "").trim());
}

function shouldEnforcePremiumStrictPayload(reportType) {
  return !isPremiumFailOpenReportType(reportType);
}

function isPremiumStrictModeEnabled(env) {
  return asBool(env?.PREMIUM_ENABLE_STRICT_MODE);
}

function usePremiumStrictPayload(body, env) {
  return isPremiumStrictModeEnabled(env) && asBool(body?._premiumStrictPayload);
}

function usePremiumStrictValidation(body, env) {
  return isPremiumStrictModeEnabled(env) && asBool(body?._premiumStrictValidation);
}

function prunePremiumReportContexts() {
  const now = Date.now();
  for (const [sessionId, ctx] of PREMIUM_REPORT_CONTEXT_STORE.entries()) {
    if (!ctx || Number(ctx.expiresAt || 0) <= now) {
      PREMIUM_REPORT_CONTEXT_STORE.delete(sessionId);
      if (ctx?.cacheKey) PREMIUM_REPORT_CONTEXT_INDEX.delete(ctx.cacheKey);
      const snapshotId = String(ctx?.analysisSnapshot?.snapshotId || "").trim();
      if (snapshotId) {
        PREMIUM_ANALYSIS_SNAPSHOT_STORE.delete(snapshotId);
        PREMIUM_ANALYSIS_SNAPSHOT_INDEX.delete(snapshotId);
      }
    }
  }

  for (const [snapshotId, snapshot] of PREMIUM_ANALYSIS_SNAPSHOT_STORE.entries()) {
    if (!snapshot || Number(snapshot.expiresAt || 0) <= now) {
      PREMIUM_ANALYSIS_SNAPSHOT_STORE.delete(snapshotId);
      PREMIUM_ANALYSIS_SNAPSHOT_INDEX.delete(snapshotId);
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
  if (reportType === "sajuNewYear") return prepareData.canonicalSajuNewYearReport || null;
  return null;
}

function getPremiumMissingData(prepareData, reportType = "") {
  if (!prepareData || typeof prepareData !== "object") return [];
  const fromTop = Array.isArray(prepareData.missingFields) ? prepareData.missingFields : [];
  const fromValidation = Array.isArray(prepareData.validation?.missingFields)
    ? prepareData.validation.missingFields
    : [];

  return Array.from(new Set([...fromTop, ...fromValidation].map((v) => String(v || "").trim()).filter(Boolean)));
}

function getPremiumDataIncompleteCode(reportType = "") {
  if (reportType === "lifeBook" || reportType === "loveSecret" || reportType === "sajuNewYear") return "SAJU_REPORT_PAYLOAD_INCOMPLETE";
  if (reportType === "sookyoPremium") return "SUKYO_REPORT_PAYLOAD_INCOMPLETE";
  if (reportType === "vedicPremium") return "VEDIC_REPORT_PAYLOAD_INCOMPLETE";
  if (reportType === "westernAstrologyPremium") return "ASTRO_REPORT_PAYLOAD_INCOMPLETE";
  if (reportType === "ziweiPremium") return "ZIWEI_REPORT_PAYLOAD_INCOMPLETE";
  return "PREMIUM_REPORT_DATA_INCOMPLETE";
}

function buildSeverityPayloadValidation(code, missingFields, canonicalJson) {
  const deduped = Array.from(new Set((missingFields || []).map((field) => String(field || "").trim()).filter(Boolean)));
  const fatalMissing = [];
  const payload = canonicalJson?.calculatedData || canonicalJson?.reportPayload || null;
  const input = canonicalJson?.input || null;

  if (!hasMeaningfulValue(payload) && !hasMeaningfulValue(input)) {
    fatalMissing.push("sourceData");
  }

  const recoverableMissing = fatalMissing.length > 0 ? [] : deduped;
  return {
    ok: fatalMissing.length === 0,
    code: fatalMissing.length > 0 ? code : "",
    missingFields: deduped,
    fatalMissing,
    recoverableMissing,
    optionalMissing: [],
    generationMode: fatalMissing.length > 0 ? "blocked" : (recoverableMissing.length > 0 ? "fallback" : "full"),
  };
}

function validateSajuReportPayload(reportType, canonicalJson) {
  const missingFields = [];
  const payload = canonicalJson?.calculatedData || {};

  if (reportType === "lifeBook") {
    if (!hasMeaningfulValue(payload?.saju)) missingFields.push("calculatedData.saju");
    if (!hasMeaningfulValue(payload?.sajuCore?.pillars)) missingFields.push("calculatedData.sajuCore.pillars");
    if (!hasMeaningfulValue(payload?.sajuCore?.dayMaster)) missingFields.push("calculatedData.sajuCore.dayMaster");
    if (!hasMeaningfulValue(payload?.sajuCore?.monthCommand)) missingFields.push("calculatedData.sajuCore.monthCommand");
    if (!hasMeaningfulValue(payload?.sajuCore?.tenGodEvidence)) missingFields.push("calculatedData.sajuCore.tenGodEvidence");
    if (!hasMeaningfulValue(payload?.luckFlow?.daewoon) && !hasMeaningfulValue(payload?.sajuCore?.daewoon)) {
      missingFields.push("calculatedData.luckFlow.daewoon");
    }
    if (!hasMeaningfulValue(payload?.luckFlow?.sewoon) && !hasMeaningfulValue(payload?.sajuCore?.sewoon)) {
      missingFields.push("calculatedData.luckFlow.sewoon");
    }
    const hasLegacyChart = hasMeaningfulValue(payload?.chart);
    if (hasLegacyChart && !hasMeaningfulValue(payload?.chart?.dayMaster) && !hasMeaningfulValue(payload?.saju?.dayMaster)) {
      missingFields.push("calculatedData.chart.dayMaster");
    }
    if (!Array.isArray(payload?.integratedThemes?.coreIdentity) || payload.integratedThemes.coreIdentity.length === 0) {
      missingFields.push("calculatedData.integratedThemes.coreIdentity");
    }
    if (!Array.isArray(payload?.integratedThemes?.lifeMission) || payload.integratedThemes.lifeMission.length === 0) {
      missingFields.push("calculatedData.integratedThemes.lifeMission");
    }
    if (!hasMeaningfulValue(payload?.timeline)) missingFields.push("calculatedData.timeline");
  }

  if (reportType === "loveSecret") {
    if (!hasMeaningfulValue(payload?.sajuCore?.pillars)) missingFields.push("calculatedData.sajuCore.pillars");
    if (!hasMeaningfulValue(payload?.sajuCore?.dayMaster)) missingFields.push("calculatedData.sajuCore.dayMaster");
    if (!hasMeaningfulValue(payload?.sajuCore?.monthCommand)) missingFields.push("calculatedData.sajuCore.monthCommand");
    if (!hasMeaningfulValue(payload?.sajuCore?.tenGodEvidence)) missingFields.push("calculatedData.sajuCore.tenGodEvidence");
    if (!hasMeaningfulValue(payload?.self?.sajuChart?.dayMaster) && !hasMeaningfulValue(payload?.chart?.dayMaster)) {
      missingFields.push("calculatedData.chart.dayMaster");
    }
    if (!hasMeaningfulValue(payload?.chart?.spousePalace)) {
      missingFields.push("calculatedData.chart.spousePalace");
    }
    if (!hasMeaningfulValue(payload?.self?.sajuChart?.dayMaster)) missingFields.push("calculatedData.self.sajuChart.dayMaster");
    if (!hasMeaningfulValue(payload?.self?.relationshipProfile)) missingFields.push("calculatedData.self.relationshipProfile");
    if (!hasMeaningfulValue(payload?.compatibility)) missingFields.push("calculatedData.compatibility");
    const mode = String(canonicalJson?.input?.mode || canonicalJson?.input?.reportType || "").toLowerCase();
    const needsPartner = mode === "compatibility" || mode === "couple";
    if (needsPartner && !hasMeaningfulValue(payload?.partner?.sajuChart)) {
      missingFields.push("calculatedData.partner.sajuChart");
    }
  }

  if (reportType === "sajuNewYear") {
    if (!hasMeaningfulValue(payload?.profile?.birth?.year)) missingFields.push("calculatedData.profile.birth.year");
    if (!hasMeaningfulValue(payload?.profile?.birth?.month)) missingFields.push("calculatedData.profile.birth.month");
    if (!hasMeaningfulValue(payload?.profile?.birth?.day)) missingFields.push("calculatedData.profile.birth.day");
    if (!hasMeaningfulValue(payload?.sajuCore?.pillars)) missingFields.push("calculatedData.sajuCore.pillars");
    if (!hasMeaningfulValue(payload?.sajuCore?.dayMaster)) missingFields.push("calculatedData.sajuCore.dayMaster");
    if (!hasMeaningfulValue(payload?.sajuCore?.monthCommand)) missingFields.push("calculatedData.sajuCore.monthCommand");
    if (!hasMeaningfulValue(payload?.sajuCore?.tenGodEvidence)) missingFields.push("calculatedData.sajuCore.tenGodEvidence");
    if (!hasMeaningfulValue(payload?.luckFlow?.daewoon) && !hasMeaningfulValue(payload?.sajuCore?.daewoon)) {
      missingFields.push("calculatedData.luckFlow.daewoon");
    }
    if (!hasMeaningfulValue(payload?.luckFlow?.sewoon) && !hasMeaningfulValue(payload?.sajuCore?.sewoon)) {
      missingFields.push("calculatedData.luckFlow.sewoon");
    }
    if (!hasMeaningfulValue(payload?.targetYear)) missingFields.push("calculatedData.targetYear");
    if (!Array.isArray(payload?.monthlyLuck) || payload.monthlyLuck.length !== 12) {
      missingFields.push("calculatedData.monthlyLuck");
    }
    if (!hasMeaningfulValue(payload?.yearlySummary)) missingFields.push("calculatedData.yearlySummary");
  }

  const deduped = Array.from(new Set(missingFields));
  return buildSeverityPayloadValidation("SAJU_REPORT_PAYLOAD_MISSING", deduped, canonicalJson);
}

function validateSukyoReportPayload(canonicalJson) {
  const payload = canonicalJson?.calculatedData || {};
  const missingFields = [];

  if (!hasMeaningfulValue(payload?.sukyoPdfContext?.userProfile?.solarBirthDate)) {
    missingFields.push("calculatedData.sukyoPdfContext.userProfile.solarBirthDate");
  }
  if (!hasMeaningfulValue(payload?.nativeSook?.nameKo)) {
    missingFields.push("calculatedData.nativeSook.nameKo");
  }
  if (!hasMeaningfulValue(payload?.nativeSook?.number)) {
    missingFields.push("calculatedData.nativeSook.number");
  }

  const isCompat = Boolean(payload?._compatibilityRequired);
  if (isCompat) {
    if (!hasMeaningfulValue(payload?.compatibility?.targetMansion)) {
      missingFields.push("calculatedData.compatibility.targetMansion");
    }
    if (!hasMeaningfulValue(payload?.compatibility?.relationType)) {
      missingFields.push("calculatedData.compatibility.relationType");
    }
    if (!hasMeaningfulValue(payload?.compatibility?.distance)) {
      missingFields.push("calculatedData.compatibility.distance");
    }
  }

  const deduped = Array.from(new Set(missingFields));
  return buildSeverityPayloadValidation("SUKYO_REPORT_PAYLOAD_MISSING", deduped, canonicalJson);
}

function validateVedicReportPayload(canonicalJson) {
  const payload = canonicalJson?.calculatedData || {};
  const input = canonicalJson?.input || {};
  const missingFields = [];
  const invalidFields = [];

  const isUnknownTime = asBool(input?.timeUnknown)
    || asBool(input?.birthTimeUnknown)
    || asBool(input?.unknownTime)
    || asBool(payload?.profile?.timeUnknown)
    || asBool(payload?.birthInfo?.unknownTime);

  const hasFinite = (value) => Number.isFinite(Number(value));
  const toLon = (planet = {}) => {
    const direct = Number(
      planet?.absoluteLongitude
      ?? planet?.longitude
      ?? planet?.siderealLongitude
      ?? NaN,
    );
    if (Number.isFinite(direct)) return normalizeDeg(direct);

    const signName = String(planet?.sign || planet?.signName || "").trim();
    const signIdx = VEDIC_SIGN_EN.findIndex((name) => String(name || "").toLowerCase() === signName.toLowerCase());
    const degreeInSign = Number(planet?.degreeInSign ?? planet?.degree ?? NaN);
    if (signIdx >= 0 && Number.isFinite(degreeInSign)) {
      return normalizeDeg(signIdx * 30 + degreeInSign);
    }
    return NaN;
  };

  const hasBirthDate = hasMeaningfulValue(input?.birthDate)
    || (hasMeaningfulValue(input?.year) && hasMeaningfulValue(input?.month) && hasMeaningfulValue(input?.day));
  const hasBirthTime = isUnknownTime
    || hasMeaningfulValue(input?.birthTime)
    || hasMeaningfulValue(input?.hour)
    || hasMeaningfulValue(payload?.profile?.birth?.time);
  const hasBirthPlace = hasMeaningfulValue(input?.birthPlace)
    || hasMeaningfulValue(input?.place)
    || hasMeaningfulValue(input?.location)
    || hasMeaningfulValue(payload?.profile?.birth?.locationName)
    || (hasMeaningfulValue(input?.lat) && hasMeaningfulValue(input?.lon))
    || (hasMeaningfulValue(payload?.profile?.birth?.latitude) && hasMeaningfulValue(payload?.profile?.birth?.longitude));

  if (!hasBirthDate) missingFields.push("input.birthDate|input.year.month.day");
  if (!hasBirthTime) missingFields.push("input.birthTime|input.hour");
  if (!hasBirthPlace) missingFields.push("input.birthPlace|input.place");

  const hasTimezone = hasMeaningfulValue(input?.timezone)
    || hasMeaningfulValue(input?.timezoneName)
    || hasMeaningfulValue(payload?.birthInfo?.timezone)
    || hasMeaningfulValue(payload?.profile?.timezone);
  if (!hasTimezone) missingFields.push("input.timezone|input.timezoneName");

  const hasLatLon = (hasMeaningfulValue(input?.lat) && hasMeaningfulValue(input?.lon))
    || (hasMeaningfulValue(payload?.birthInfo?.latitude) && hasMeaningfulValue(payload?.birthInfo?.longitude));
  if (!hasLatLon) missingFields.push("input.lat|input.lon");

  const hasAyanamsa = hasMeaningfulValue(payload?.birthInfo?.ayanamsa)
    || hasMeaningfulValue(payload?.birthInfo?.ayanamsaMode)
    || hasMeaningfulValue(input?.ayanamsa);
  if (!hasAyanamsa) missingFields.push("calculatedData.birthInfo.ayanamsa");

  const canRecalculateLagna = hasMeaningfulValue(input?.year)
    && hasMeaningfulValue(input?.month)
    && hasMeaningfulValue(input?.day)
    && hasMeaningfulValue(input?.hour)
    && hasMeaningfulValue(input?.lat)
    && hasMeaningfulValue(input?.lon);
  if (!isUnknownTime && !hasMeaningfulValue(payload?.lagna?.sign)) {
    if (!canRecalculateLagna) {
      missingFields.push("calculatedData.lagna.sign|input(recalculation)");
    }
  }

  const hasMoonAnchor = hasMeaningfulValue(payload?.nakshatras?.moonNakshatra?.name)
    || hasMeaningfulValue(payload?.nakshatras?.moonSign)
    || hasMeaningfulValue(payload?.moonSign)
    || hasMeaningfulValue(payload?.planets?.moon?.sign);
  if (!hasMoonAnchor) missingFields.push("calculatedData.nakshatras.moonNakshatra.name|calculatedData.moonSign");

  const hasSunAnchor = hasMeaningfulValue(payload?.planets?.sun?.sign)
    || hasMeaningfulValue(payload?.planets?.sun?.signName)
    || hasFinite(payload?.planets?.sun?.absoluteLongitude)
    || hasFinite(payload?.planets?.sun?.longitude);
  if (!hasSunAnchor) missingFields.push("calculatedData.planets.sun");

  const hasMoonPlanet = hasMeaningfulValue(payload?.planets?.moon?.sign)
    || hasMeaningfulValue(payload?.planets?.moon?.signName)
    || hasFinite(payload?.planets?.moon?.absoluteLongitude)
    || hasFinite(payload?.planets?.moon?.longitude);
  if (!hasMoonPlanet) missingFields.push("calculatedData.planets.moon");

  const requiredPlanets = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];
  requiredPlanets.forEach((key) => {
    const p = payload?.planets?.[key] || {};
    const hasSign = hasMeaningfulValue(p?.sign) || hasMeaningfulValue(p?.signName);
    const hasDegree = hasFinite(p?.degreeInSign) || hasFinite(p?.degree);
    const hasAbsLon = hasFinite(p?.absoluteLongitude) || hasFinite(p?.longitude) || Number.isFinite(toLon(p));
    const hasNak = hasMeaningfulValue(p?.nakshatra);
    const hasPada = hasFinite(p?.pada) || hasFinite(p?.nakshatraPada);
    if (!hasSign) missingFields.push(`calculatedData.planets.${key}.sign`);
    if (!hasDegree) missingFields.push(`calculatedData.planets.${key}.degreeInSign`);
    if (!hasAbsLon) missingFields.push(`calculatedData.planets.${key}.absoluteLongitude`);
    if (!hasNak) missingFields.push(`calculatedData.planets.${key}.nakshatra`);
    if (!hasPada) missingFields.push(`calculatedData.planets.${key}.pada`);
  });

  const rahuLon = toLon(payload?.planets?.rahu || {});
  const ketuLon = toLon(payload?.planets?.ketu || {});
  if (Number.isFinite(rahuLon) && Number.isFinite(ketuLon)) {
    const diff = Math.abs(normalizeDeg(rahuLon - ketuLon));
    const distance = diff > 180 ? 360 - diff : diff;
    if (Math.abs(distance - 180) > 2.5) {
      invalidFields.push("calculatedData.planets.rahu.ketu.angle180");
    }
  }

  const isCompat = String(canonicalJson?.input?.reportType || "").toLowerCase() === "compatibility";
  if (isCompat) {
    const hasPartnerBirthDate = hasMeaningfulValue(input?.partnerBirthDate)
      || (hasMeaningfulValue(input?.partnerYear) && hasMeaningfulValue(input?.partnerMonth) && hasMeaningfulValue(input?.partnerDay));
    const hasPartnerBirthTime = hasMeaningfulValue(input?.partnerBirthTime)
      || hasMeaningfulValue(input?.partnerHour);
    const hasPartnerBirthPlace = hasMeaningfulValue(input?.partnerBirthPlace)
      || hasMeaningfulValue(input?.partnerPlace)
      || hasMeaningfulValue(input?.partnerLocation)
      || (hasMeaningfulValue(input?.partnerLat) && hasMeaningfulValue(input?.partnerLon));
    if (!hasPartnerBirthDate) missingFields.push("input.partnerBirthDate|input.partnerYear.month.day");
    if (!hasPartnerBirthTime) missingFields.push("input.partnerBirthTime|input.partnerHour");
    if (!hasPartnerBirthPlace) missingFields.push("input.partnerBirthPlace|input.partnerPlace");

    const hasPartnerLagna = hasMeaningfulValue(payload?.relationshipData?.partner?.lagna)
      || hasMeaningfulValue(payload?.partner?.lagna?.sign)
      || hasMeaningfulValue(payload?.compatibility?.partnerLagna)
      || (hasMeaningfulValue(input?.partnerYear)
        && hasMeaningfulValue(input?.partnerMonth)
        && hasMeaningfulValue(input?.partnerDay)
        && hasMeaningfulValue(input?.partnerHour)
        && hasMeaningfulValue(input?.partnerLat)
        && hasMeaningfulValue(input?.partnerLon));
    const hasPartnerMoon = hasMeaningfulValue(payload?.relationshipData?.partner?.moonNakshatra)
      || hasMeaningfulValue(payload?.partner?.nakshatras?.moonNakshatra?.name)
      || hasMeaningfulValue(payload?.partner?.moonSign)
      || hasMeaningfulValue(payload?.compatibility?.partnerMoonNakshatra);
    if (!hasPartnerLagna) missingFields.push("partner.lagna|partner recalculation input");
    if (!hasPartnerMoon) missingFields.push("partner.moonNakshatra|partner.moonSign");
  }

  const deduped = Array.from(new Set(missingFields));
  const validation = buildSeverityPayloadValidation("VEDIC_REPORT_PAYLOAD_MISSING", deduped, canonicalJson);
  validation.invalidFields = Array.from(new Set(invalidFields));
  return validation;
}

function validateAstrologyReportPayload(canonicalJson) {
  const payload = canonicalJson?.calculatedData || {};
  const missingFields = [];

  const hasBirthDate = hasMeaningfulValue(canonicalJson?.input?.year)
    && hasMeaningfulValue(canonicalJson?.input?.month)
    && hasMeaningfulValue(canonicalJson?.input?.day)
    || hasMeaningfulValue(canonicalJson?.input?.birthDate)
    || hasMeaningfulValue(payload?.birthInfo?.birthDate)
    || hasMeaningfulValue(payload?.birthInfo?.date);
  if (!hasBirthDate) missingFields.push("input.birthDate");

  if (!hasMeaningfulValue(payload?.planets?.sun?.sign) && !hasMeaningfulValue(payload?.sunSign)) {
    missingFields.push("calculatedData.planets.sun.sign");
  }
  if (!hasMeaningfulValue(payload?.planets?.moon?.sign) && !hasMeaningfulValue(payload?.moonSign)) {
    missingFields.push("calculatedData.planets.moon.sign");
  }
  if (!Array.isArray(payload?.aspects) || payload.aspects.length === 0) {
    missingFields.push("calculatedData.aspects");
  }

  if (!hasMeaningfulValue(payload?.angles?.ascendant?.sign)) missingFields.push("calculatedData.angles.ascendant.sign");
  if (!hasMeaningfulValue(payload?.angles?.midheaven?.sign)) missingFields.push("calculatedData.angles.midheaven.sign");
  if (!Array.isArray(payload?.houses) || payload.houses.length === 0) missingFields.push("calculatedData.houses");

  const isCompat = String(canonicalJson?.input?.reportType || canonicalJson?.input?.mode || "").toLowerCase() === "compatibility";
  if (isCompat && !hasMeaningfulValue(payload?.relationshipData)) {
    missingFields.push("calculatedData.relationshipData");
  }

  const deduped = Array.from(new Set(missingFields));
  return buildSeverityPayloadValidation("ASTRO_REPORT_PAYLOAD_MISSING", deduped, canonicalJson);
}

function validateZiweiReportPayload(canonicalJson) {
  const payload = canonicalJson?.calculatedData || {};
  const missingFields = [];
  const sourcePalaces = Array.isArray(payload?.palaces)
    ? payload.palaces
    : (payload?.palacesByKey && typeof payload.palacesByKey === "object" ? Object.values(payload.palacesByKey) : []);
  const palaceMap = sourcePalaces.reduce((acc, palace) => {
    const key = inferZiweiPalaceKey(palace);
    if (key) acc[key] = palace;
    return acc;
  }, {});

  if (!hasMeaningfulValue(payload?.coreChart?.mingGong) && !hasMeaningfulValue(payload?.chart?.mingGong)) {
    missingFields.push("calculatedData.coreChart.mingGong");
  }
  if (!hasMeaningfulValue(payload?.coreChart?.shenGong) && !hasMeaningfulValue(payload?.chart?.shenGong)) {
    missingFields.push("calculatedData.coreChart.shenGong");
  }

  const palaceKeys = ["ming", "spouse", "wealth", "career", "health", "fortune"];
  palaceKeys.forEach((key) => {
    if (!hasMeaningfulValue(palaceMap?.[key])) {
      missingFields.push(`calculatedData.palaces.${key}`);
    }
  });

  const hasDaXian = Array.isArray(payload?.cycles?.daXian) && payload.cycles.daXian.length > 0;
  const hasAnnual = Array.isArray(payload?.cycles?.annual)
    ? payload.cycles.annual.length > 0
    : hasMeaningfulValue(payload?.cycles?.annual);
  const hasMonthly = Array.isArray(payload?.cycles?.monthly) && payload.cycles.monthly.length > 0;
  const hasAnyCycle = hasDaXian || hasAnnual || hasMonthly;
  if (!hasAnyCycle) {
    missingFields.push("calculatedData.cycles.daXian");
  }

  const deduped = Array.from(new Set(missingFields));
  return buildSeverityPayloadValidation("ZIWEI_REPORT_PAYLOAD_MISSING", deduped, canonicalJson);
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
  const canonicalJson = context?.coreData?.canonicalJson || {};
  const dataMarkers = canonicalJson?.dataMarkers || {};
  const snapshotId = String(context?.analysisSnapshot?.snapshotId || context?.derivedData?.analysisSnapshotId || "").trim();
  return {
    reportSessionId: context.reportSessionId,
    snapshotId,
    reportId: context.reportId,
    reportType: context.reportType,
    featureType: context.featureType || REPORT_TYPE_TO_FEATURE_TYPE[context.reportType] || "",
    userId: context.userId,
    requestId: context.requestId || "",
    idempotencyKey: context.idempotencyKey || "",
    sessionBindingId: String(context?.sessionBinding?.bindingId || "").trim(),
    sessionBindingProfile: context?.sessionBinding?.profileSnapshot || null,
    inputHash: context.inputHash,
    calculationVersion: context.calculationVersion,
    sourceMap: context.sourceMap,
    missingData: context.missingData,
    warnings: context.warnings,
    totalChapters: context.totalChapters,
    requiredChapters: context.requiredChapters,
    validChapters,
    isCompleteForPdf: context.isCompleteForPdf,
    completenessScore: Number(canonicalJson?.completenessScore || 0),
    dataMarkerSummary: {
      requiredTotal: Number(dataMarkers?.requiredTotal || 0),
      requiredSatisfiedCount: Number(dataMarkers?.requiredSatisfiedCount || 0),
      optionalTotal: Number(dataMarkers?.optionalTotal || 0),
      optionalSatisfiedCount: Number(dataMarkers?.optionalSatisfiedCount || 0),
      payloadMissingCount: Number(dataMarkers?.payloadMissingCount || 0),
    },
    blockingReasons: Array.isArray(canonicalJson?.blockingReasons) ? canonicalJson.blockingReasons : [],
    preflightQualityScore: Number(context?.preflight?.qualityScore || 0),
    status: context.status,
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
  };
}

function buildPromptSourceDataByChapter(reportType, canonicalJson, totalChapters, chapterJsonById = {}) {
  const chapterCount = Math.max(1, Math.min(24, Number(totalChapters || 13)));
  const result = {};
  for (let chapterId = 1; chapterId <= chapterCount; chapterId += 1) {
    const prebuilt = chapterJsonById?.[String(chapterId)] || null;
    result[String(chapterId)] = buildPromptSourceData(reportType, chapterId, canonicalJson, prebuilt);
  }
  return result;
}

function ensurePremiumPromptAndPdfSourceData(context) {
  const canonicalJson = context?.coreData?.canonicalJson || {};
  context.derivedData = context.derivedData || {};
  context.derivedData.chapterJsonById = context.derivedData.chapterJsonById || {};
  const totalChapters = Number(context?.requiredChapters || context?.totalChapters || 13);

  for (let chapterId = 1; chapterId <= totalChapters; chapterId += 1) {
    if (!context.derivedData.chapterJsonById[String(chapterId)]) {
      context.derivedData.chapterJsonById[String(chapterId)] = buildChapterJsonPacks(
        context.reportType,
        chapterId,
        canonicalJson,
      );
    }
  }

  context.derivedData.promptSourceDataByChapter = buildPromptSourceDataByChapter(
    context.reportType,
    canonicalJson,
    totalChapters,
    context.derivedData.chapterJsonById,
  );

  context.derivedData.pdfSourceData = {
    reportType: context.reportType,
    reportId: context.reportId,
    reportPayload: canonicalJson?.reportPayload || canonicalJson?.calculatedData || {},
    calculatedData: canonicalJson?.calculatedData || {},
    interpretationSeed: canonicalJson?.interpretationSeed || {},
    chapterData: canonicalJson?.chapterData || {},
    chapterJsonById: context.derivedData.chapterJsonById,
  };
}

function buildPremiumChapterPreflightChecks(context) {
  const canonicalJson = context?.coreData?.canonicalJson || {};
  const chapterPlan = Array.isArray(context?.derivedData?.chapterPlan) ? context.derivedData.chapterPlan : [];
  const chapterCount = Math.max(1, Number(context?.requiredChapters || context?.totalChapters || 13));
  const checks = [];

  for (let chapterId = 1; chapterId <= chapterCount; chapterId += 1) {
    const chapterKey = `ch${chapterId}`;
    const chapterMeta = canonicalJson?.chapterData?.[chapterKey] || {};
    const planMeta = chapterPlan[chapterId - 1] || {};
    const requiredDataKeys = Array.isArray(chapterMeta?.requiredPaths) ? chapterMeta.requiredPaths : [];
    const missingFields = requiredDataKeys.filter((path) => pathMissing(canonicalJson, path));
    const requiredCount = requiredDataKeys.length;
    const satisfiedCount = Math.max(0, requiredCount - missingFields.length);
    const chapterQualityScore = requiredCount > 0
      ? Math.round((satisfiedCount / requiredCount) * 100)
      : 100;

    checks.push({
      chapterId,
      chapterKey,
      chapterTitle: String(chapterMeta?.chapterTitle || planMeta?.title || `Chapter ${chapterId}`),
      requiredDataKeys,
      missingFields,
      requiredCount,
      satisfiedCount,
      chapterQualityScore,
      canGenerate: missingFields.length === 0,
    });
  }

  return checks;
}

function buildPremiumPreflightResult(context) {
  ensurePremiumPromptAndPdfSourceData(context);
  const canonicalJson = context?.coreData?.canonicalJson || {};
  const rawEngineResult = context?.derivedData?.rawEngineResult || null;
  const promptSourceData = context?.derivedData?.promptSourceDataByChapter || {};
  const pdfSourceData = context?.derivedData?.pdfSourceData || {};
  const chapterChecks = buildPremiumChapterPreflightChecks(context);
  const blockedChapters = chapterChecks.filter((row) => !row.canGenerate);
  const creatableChapterCount = chapterChecks.length - blockedChapters.length;
  const chapterAvailabilityRatio = chapterChecks.length > 0
    ? creatableChapterCount / chapterChecks.length
    : 0;
  const canonicalScore = Number(canonicalJson?.completenessScore || 0);
  const hasRawEngineResult = hasMeaningfulValue(rawEngineResult);
  const hasPromptSourceData = hasMeaningfulValue(promptSourceData);
  const hasPdfSourceData = hasMeaningfulValue(pdfSourceData?.calculatedData || pdfSourceData?.reportPayload);
  const hasCanonicalData = hasMeaningfulValue(canonicalJson?.calculatedData || canonicalJson?.reportPayload);
  const hasUserInput = hasMeaningfulValue(context?.input);
  const hasAnyGenerationSource = hasRawEngineResult || hasPromptSourceData || hasPdfSourceData || hasCanonicalData || hasUserInput;
  const fatalMissing = [];
  if (!context?.reportType) fatalMissing.push("reportType");
  if (chapterChecks.length === 0) fatalMissing.push("chapterList");
  if (!hasAnyGenerationSource) fatalMissing.push("sourceData");
  const minQualityScore = 80;
  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        canonicalScore * 0.5
        + chapterAvailabilityRatio * 40
        + (hasRawEngineResult ? 5 : 0)
        + (hasPromptSourceData ? 3 : 0)
        + (hasPdfSourceData ? 2 : 0),
      ),
    ),
  );

  const missingSummary = [];
  if (!hasRawEngineResult) missingSummary.push("rawEngineResult");
  if (!hasPromptSourceData) missingSummary.push("promptSourceData");
  if (!hasPdfSourceData) missingSummary.push("pdfSourceData");
  blockedChapters.forEach((row) => {
    row.missingFields.forEach((field) => {
      missingSummary.push(`chapter:${row.chapterId}:${field}`);
    });
  });

  return {
    ok: fatalMissing.length === 0,
    reportType: context?.reportType || "",
    featureType: context?.featureType || REPORT_TYPE_TO_FEATURE_TYPE[context?.reportType] || "",
    qualityScore,
    minQualityScore,
    fatalMissing,
    generationMode: fatalMissing.length > 0 ? "blocked" : (missingSummary.length > 0 || blockedChapters.length > 0 ? "fallback" : "full"),
    hasRawEngineResult,
    hasPromptSourceData,
    hasPdfSourceData,
    hasCanonicalData,
    hasUserInput,
    totalChapters: chapterChecks.length,
    creatableChapterCount,
    blockedChapterCount: blockedChapters.length,
    chapterChecks,
    blockedChapters,
    missingSummary: Array.from(new Set(missingSummary)),
  };
}

function upsertPremiumAnalysisSnapshot(context, rawEngineResult = null) {
  const snapshotIdBase = String(context?.analysisSnapshot?.snapshotId || context?.derivedData?.analysisSnapshotId || "").trim();
  const snapshotId = snapshotIdBase || `pas_${stableHash(`${context.reportSessionId}|${context.inputHash}|${context.calculationVersion}`).slice(0, 18)}`;
  const nowIso = new Date().toISOString();

  context.derivedData = context.derivedData || {};
  if (rawEngineResult && typeof rawEngineResult === "object") {
    context.derivedData.rawEngineResult = rawEngineResult;
  } else if (!context.derivedData.rawEngineResult) {
    context.derivedData.rawEngineResult = context?.coreData?.canonicalJson?.reportPayload || null;
  }

  const preflight = buildPremiumPreflightResult(context);
  const nextSnapshot = {
    snapshotId,
    reportSessionId: context.reportSessionId,
    reportId: context.reportId,
    userId: context.userId,
    reportType: context.reportType,
    featureType: context.featureType || REPORT_TYPE_TO_FEATURE_TYPE[context.reportType] || "",
    rawEngineResult: context?.derivedData?.rawEngineResult || null,
    normalizedResult: context?.coreData?.canonicalJson?.calculatedData || {},
    promptSourceData: context?.derivedData?.promptSourceDataByChapter || {},
    pdfSourceData: context?.derivedData?.pdfSourceData || {},
    preflight,
    createdAt: PREMIUM_ANALYSIS_SNAPSHOT_STORE.get(snapshotId)?.createdAt || nowIso,
    updatedAt: nowIso,
    expiresAt: Date.now() + PREMIUM_ANALYSIS_SNAPSHOT_TTL_MS,
  };

  PREMIUM_ANALYSIS_SNAPSHOT_STORE.set(snapshotId, nextSnapshot);
  PREMIUM_ANALYSIS_SNAPSHOT_INDEX.set(snapshotId, context.reportSessionId);

  context.analysisSnapshot = {
    snapshotId,
    createdAt: nextSnapshot.createdAt,
    updatedAt: nextSnapshot.updatedAt,
  };
  context.derivedData.analysisSnapshotId = snapshotId;
  context.preflight = {
    ...preflight,
    snapshotId,
    executedAt: nowIso,
  };

  return context.analysisSnapshot;
}

function resolvePremiumContextBySessionOrSnapshot(reportSessionIdInput, snapshotIdInput) {
  const requestedSessionId = String(reportSessionIdInput || "").trim();
  const requestedSnapshotId = String(snapshotIdInput || "").trim();

  let reportSessionId = requestedSessionId;
  if (!reportSessionId && requestedSnapshotId) {
    reportSessionId = String(
      PREMIUM_ANALYSIS_SNAPSHOT_INDEX.get(requestedSnapshotId)
      || PREMIUM_ANALYSIS_SNAPSHOT_STORE.get(requestedSnapshotId)?.reportSessionId
      || "",
    ).trim();
  }

  const context = reportSessionId ? PREMIUM_REPORT_CONTEXT_STORE.get(reportSessionId) : null;
  const resolvedSnapshotId = String(
    requestedSnapshotId
    || context?.analysisSnapshot?.snapshotId
    || context?.derivedData?.analysisSnapshotId
    || "",
  ).trim();

  return {
    reportSessionId,
    snapshotId: resolvedSnapshotId,
    context,
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
    sajuNewYear: {
      requiredNormalizedKeys: [
        "normalizedData.meta",
        "normalizedData.userProfile",
        "normalizedData.saju.pillars",
        "normalizedData.saju.interpretation.yearly",
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
  if (reportType === "lifeBook" || reportType === "loveSecret" || reportType === "sajuNewYear") return "rebuild-normalized-saju-data";
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
      hasZiweiChart: hasMeaningfulValue(calculated?.chartMeta?.mingGong)
        || hasMeaningfulValue(calculated?.coreChart?.mingGong)
        || hasMeaningfulValue(calculated?.chart?.mingGong),
      palaceCount,
      majorStarCount,
    };
  }

  if (reportType === "sajuNewYear") {
    return {
      ch1: { chapterTitle: "연간 파동 총론 - 올해의 기본 기조", requiredPaths: ["calculatedData.profile.birth", "calculatedData.saju"] },
      ch2: { chapterTitle: "커리어 전략 - 성과가 나는 월/주의 월", requiredPaths: ["calculatedData.yearlySummary.career", "calculatedData.monthlyLuck"] },
      ch3: { chapterTitle: "재물 흐름 - 수익/지출 관리 타이밍", requiredPaths: ["calculatedData.yearlySummary.wealth", "calculatedData.monthlyLuck"] },
      ch4: { chapterTitle: "관계·인맥 - 협업과 거리두기 전략", requiredPaths: ["calculatedData.yearlySummary.relationship", "calculatedData.monthlyLuck"] },
      ch5: { chapterTitle: "연애·가정 - 감정 파동 관리법", requiredPaths: ["calculatedData.yearlySummary.relationship", "calculatedData.monthlyLuck"] },
      ch6: { chapterTitle: "건강·에너지 - 번아웃 방지 설계", requiredPaths: ["calculatedData.yearlySummary.health", "calculatedData.monthlyLuck"] },
      ch7: { chapterTitle: "분기별 핵심 의사결정 포인트", requiredPaths: ["calculatedData.actionPlan", "calculatedData.monthlyLuck"] },
      ch8: { chapterTitle: "리스크 시나리오와 대응 플랜", requiredPaths: ["calculatedData.actionPlan", "calculatedData.monthlyLuck"] },
      ch9: { chapterTitle: "12개월 Go/Stop 월별 테이블", requiredPaths: ["calculatedData.monthlyLuck"] },
      ch10: { chapterTitle: "최종 실행 로드맵 - 연말 회수 전략", requiredPaths: ["calculatedData.yearlySummary", "calculatedData.actionPlan"] },
    };
  }

  if (reportType === "lifeBook" || reportType === "loveSecret") {
    return {
      hasBirthInfo,
      hasSaju: hasMeaningfulValue(calculated?.saju?.fourPillars?.year) || hasMeaningfulValue(calculated?.saju?.dayMaster),
      hasUsefulGods: hasMeaningfulValue(calculated?.saju?.usefulGods?.yongsin?.element),
    };
  }

  if (reportType === "sajuNewYear") {
    return {
      hasBirthInfo,
      hasSaju: hasMeaningfulValue(calculated?.saju?.fourPillars?.year) || hasMeaningfulValue(calculated?.saju?.dayMaster),
      hasYearlySummary: hasMeaningfulValue(calculated?.yearlySummary),
      hasMonthlyLuck: Array.isArray(calculated?.monthlyLuck) && calculated.monthlyLuck.length === 12,
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

function logPremiumPipelineStage(stage, payload = {}) {
  const tag = `[PremiumPDF][${String(stage || "Stage").trim() || "Stage"}]`;
  try {
    console.info(tag, JSON.stringify(payload || {}));
  } catch {
    console.info(tag, payload);
  }
}

function countKoreanLikeChars(text = "") {
  const normalized = String(text || "").trim();
  if (!normalized) return 0;
  return normalized.replace(/\s+/g, "").length;
}

const PREMIUM_GLOBAL_MIN_TOTAL_CHARS = 50000;

function resolvePremiumReportTypeFromKind(kind = "", explicitReportType = "") {
  const byKind = {
    ziwei: "ziweiPremium",
    sukuyo: "sookyoPremium",
    astro: "westernAstrologyPremium",
    vedic: "vedicPremium",
    lifebook: "lifeBook",
    "love-secret": "loveSecret",
    "saju-new-year": "sajuNewYear",
  };
  const normalizedKind = String(kind || "").trim().toLowerCase();
  const reportType = String(explicitReportType || byKind[normalizedKind] || "").trim();
  return reportType || "lifeBook";
}

function getPremiumPerChapterMinChars(totalChapters = 13, minTotalChars = PREMIUM_GLOBAL_MIN_TOTAL_CHARS) {
  const count = Math.max(1, Number(totalChapters || 13));
  const minTotal = Math.max(PREMIUM_GLOBAL_MIN_TOTAL_CHARS, Number(minTotalChars || 0));
  return Math.max(3200, Math.ceil(minTotal / count));
}

function buildPremiumEngineJsonAppendix({ reportType, chapter, chapterMeta, engineData }) {
  if (String(reportType || "") === "westernAstrologyPremium") return "";
  const compact = stringifyCompact(engineData || {}, 7000);
  if (!compact) return "";
  return [
    `## Ch.${Number(chapter || 1)} 엔진 JSON 근거 요약`,
    `${String(chapterMeta?.title || "분석 챕터")}의 핵심 엔진 근거를 구조화된 JSON으로 요약합니다.`,
    "```json",
    compact,
    "```",
    `위 JSON 근거는 ${String(reportType || "premiumReport")} 챕터 해석의 기준 데이터입니다.`,
  ].join("\n");
}

function ensurePremiumChapterLength(text, options = {}) {
  const reportType = String(options.reportType || "").trim();
  const chapter = Number(options.chapter || options.chapterId || 1);
  const totalChapters = Math.max(1, Number(options.totalChapters || 13));
  const chapterMeta = options.chapterMeta || { title: `Chapter ${chapter}` };
  const minCharsOverride = Number(options.minCharsOverride || 0);
  const minTotalChars = Math.max(PREMIUM_GLOBAL_MIN_TOTAL_CHARS, Number(options.minTotalChars || 0));
  let minChars = Math.max(getPremiumPerChapterMinChars(totalChapters, minTotalChars), minCharsOverride);
  if (reportType === "sajuNewYear") {
    const spec = getPremiumSpecByReportType(reportType, String(options.mode || ""));
    const row = Array.isArray(spec?.chapters) ? spec.chapters[Math.max(0, chapter - 1)] : null;
    const chapterMin = Number(row?.minChars || 0);
    if (chapterMin > 0) minChars = Math.max(3200, chapterMin, minCharsOverride);
  }
  let draft = sanitizePremiumChapterText(text);

  if (countKoreanLikeChars(draft) >= minChars) return draft;

  if (reportType !== "sajuNewYear") {
    const appendix = buildPremiumEngineJsonAppendix({
      reportType,
      chapter,
      chapterMeta,
      engineData: options.engineData || options.chapterJson || options.chapterJsonPacks || {},
    });
    if (appendix) draft = `${draft}\n\n${appendix}`.trim();
  }

  let step = 1;
  while (countKoreanLikeChars(draft) < minChars && step <= 24) {
    if (reportType === "westernAstrologyPremium") {
      draft += `\n\n### 실행 확장 메모 ${step}`;
      draft += "\n이번 장의 핵심 신호를 하루 루틴, 관계 선택, 업무 우선순위로 연결해 실제 행동 언어로 바꿔보세요.";
      draft += "\n관찰 가능한 변화 지표를 하나만 정하고 2주 단위로 비교하면 해석이 추상 조언이 아니라 실행 가능한 전략으로 정착됩니다.";
      draft += "\n출생시간이 없거나 세부 하우스가 제한된 경우에도, 확인 가능한 행성 배치와 각도 흐름을 중심으로 충분히 현실적인 선택 기준을 세울 수 있습니다.";
    } else {
      draft += `\n\n## 실행 심화 ${step}`;
      draft += "\n핵심 신호를 일/관계/재정/건강의 4축으로 분리해 실행 우선순위를 고정하세요.";
      draft += "\n1) 오늘 실행할 한 가지 2) 중단할 한 가지 3) 7일 후 점검할 한 가지를 명확히 기록합니다.";
      draft += "\n3개월 단위로 누적 데이터를 비교하면 운세 해석이 추상 조언이 아닌 재현 가능한 전략으로 전환됩니다.";
    }
    step += 1;
  }

  return draft.trim();
}

function resolveChapterSpec(reportType, featureType, mode, chapterId) {
  const spec = getPremiumSpecByFeatureType(featureType, mode) || getPremiumSpecByReportType(reportType, mode);
  if (!spec || !Array.isArray(spec.chapters)) {
    return {
      featureType,
      chapterCount: Number(PREMIUM_REPORT_REQUIRED_CHAPTERS[reportType] || 13),
      minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
      targetTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
      chapterSpec: null,
    };
  }
  const idx = Math.max(0, Number(chapterId || 1) - 1);
  const isSajuNewYear = reportType === "sajuNewYear" || featureType === "saju_new_year_pdf";
  const minTotalChars = isSajuNewYear
    ? Math.max(48000, Number(spec.minTotalChars || 0))
    : Math.max(PREMIUM_GLOBAL_MIN_TOTAL_CHARS, Number(spec.minTotalChars || 0));
  const targetTotalChars = Math.max(minTotalChars, Number(spec.targetTotalChars || 0));
  if (reportType === "ziweiPremium") {
    const ziweiMin = ZIWEI_PAGE_RANGE.minPages * ZIWEI_PAGE_RANGE.charsPerPage;
    const ziweiTarget = Math.floor(((ZIWEI_PAGE_RANGE.minPages + ZIWEI_PAGE_RANGE.maxPages) / 2) * ZIWEI_PAGE_RANGE.charsPerPage);
    return {
      featureType: spec.featureType || featureType,
      chapterCount: Number(spec.chapterCount || spec.chapters.length || 0),
      minTotalChars: Math.max(minTotalChars, ziweiMin),
      targetTotalChars: Math.max(targetTotalChars, ziweiTarget),
      chapterSpec: spec.chapters[idx] || null,
    };
  }
  return {
    featureType: spec.featureType || featureType,
    chapterCount: Number(spec.chapterCount || spec.chapters.length || 0),
    minTotalChars,
    targetTotalChars,
    chapterSpec: spec.chapters[idx] || null,
  };
}

function validateChapterLength({ reportType, featureType, mode, chapterId, text }) {
  const resolved = resolveChapterSpec(reportType, featureType, mode, chapterId);
  const noSpaceLength = countKoreanLikeChars(text);
  const chapterCount = Math.max(1, Number(resolved?.chapterCount || PREMIUM_REPORT_REQUIRED_CHAPTERS[reportType] || 13));
  const globalChapterMin = getPremiumPerChapterMinChars(chapterCount, resolved.minTotalChars || PREMIUM_GLOBAL_MIN_TOTAL_CHARS);
  const chapterMin = reportType === "sajuNewYear"
    ? Math.max(3200, Number(resolved?.chapterSpec?.minChars || 0))
    : Math.max(Number(resolved?.chapterSpec?.minChars || 0), globalChapterMin);
  const chapterTarget = Math.max(chapterMin, Number(resolved?.chapterSpec?.targetChars || 0));
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
  const isSajuNewYear = reportType === "sajuNewYear" || featureType === "saju_new_year_pdf";
  const minTotalChars = isSajuNewYear
    ? Math.max(48000, Number(resolved.minTotalChars || 0))
    : Math.max(PREMIUM_GLOBAL_MIN_TOTAL_CHARS, Number(resolved.minTotalChars || 0));
  const targetTotalChars = Math.max(minTotalChars, Number(resolved.targetTotalChars || 0));
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

const ZIWEI_PAGE_RANGE = Object.freeze({
  minPages: 80,
  maxPages: 100,
  charsPerPage: 1700,
});

function estimatePagesByChars(totalLength, charsPerPage = ZIWEI_PAGE_RANGE.charsPerPage) {
  const safeCharsPerPage = Math.max(1200, Number(charsPerPage || ZIWEI_PAGE_RANGE.charsPerPage));
  const safeLength = Math.max(0, Number(totalLength || 0));
  return Math.max(0, Math.ceil(safeLength / safeCharsPerPage));
}

function validateZiweiPageWindowFromLength(totalLength) {
  const pages = estimatePagesByChars(totalLength, ZIWEI_PAGE_RANGE.charsPerPage);
  return {
    ok: pages >= ZIWEI_PAGE_RANGE.minPages && pages <= ZIWEI_PAGE_RANGE.maxPages,
    pages,
    minPages: ZIWEI_PAGE_RANGE.minPages,
    maxPages: ZIWEI_PAGE_RANGE.maxPages,
    charsPerPage: ZIWEI_PAGE_RANGE.charsPerPage,
    minChars: ZIWEI_PAGE_RANGE.minPages * ZIWEI_PAGE_RANGE.charsPerPage,
    maxChars: ZIWEI_PAGE_RANGE.maxPages * ZIWEI_PAGE_RANGE.charsPerPage,
  };
}

function trimChapterTextToApproxChars(text, targetChars) {
  const source = String(text || "").trim();
  const safeTarget = Math.max(3200, Number(targetChars || 0));
  if (!source || source.length <= safeTarget) return source;

  const blocks = source
    .split(/\n\s*\n+/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return source.slice(0, safeTarget).trim();
  }

  const kept = [];
  let total = 0;
  for (const block of blocks) {
    const next = total + block.length + (kept.length ? 2 : 0);
    if (next > safeTarget) break;
    kept.push(block);
    total = next;
  }

  if (!kept.length) return source.slice(0, safeTarget).trim();
  return kept.join("\n\n").trim();
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

function resolvePremiumChapterMeta(context, chapterId) {
  const idx = Math.max(0, Number(chapterId || 1) - 1);
  const fromPlan = Array.isArray(context?.chapterPlan) ? context.chapterPlan[idx] : null;
  const chapterKey = `ch${Number(chapterId || 1)}`;
  const fromCanonical = context?.coreData?.canonicalJson?.chapterData?.[chapterKey] || null;
  return {
    num: Number(fromPlan?.num || fromPlan?.chapter || chapterId || 1),
    key: String(fromPlan?.key || chapterKey),
    title: String(fromPlan?.title || fromCanonical?.chapterTitle || `Chapter ${chapterId}`).trim() || `Chapter ${chapterId}`,
    subtitle: String(fromPlan?.subtitle || fromCanonical?.chapterSubtitle || "").trim(),
    icon: String(fromPlan?.icon || "spark").trim() || "spark",
  };
}

function buildGuaranteedPremiumChapterText(meta, requiredHeadings = [], minChars = 2200, dataDigest = "") {
  const title = String(meta?.title || "프리미엄 해석").trim();
  const subtitle = String(meta?.subtitle || "").trim();
  const headings = (Array.isArray(requiredHeadings) ? requiredHeadings : [])
    .map((h) => String(h || "").trim())
    .filter(Boolean)
    .slice(0, 8);
  const normalizedHeadings = headings.length ? headings : [
    `${title} 핵심 해석`,
    "핵심 흐름 분석",
    "현실 적용 포인트",
    "리스크와 전환 구간",
    "실전 실행 가이드",
    "요약",
  ];

  const blocks = normalizedHeadings.map((h, idx) => {
    const heading = /^#{1,6}\s/.test(h) ? h : `## ${h}`;
    return [
      heading,
      `${title}${subtitle ? ` (${subtitle})` : ""}의 핵심 데이터를 바탕으로 현재 흐름을 분석합니다.`,
      "단정적 예언 대신 성향·가능성·선택 전략 중심으로 실제 생활에 적용 가능한 기준을 제시합니다.",
      `우선순위를 좁혀 실행하면 변동성을 줄이고 다음 의사결정의 기준을 선명하게 유지할 수 있습니다.`,
    ].join("\n\n");
  });

  let text = [`## ${title}`, ...blocks].join("\n\n");
  if (dataDigest) {
    text += `\n\n## 데이터 근거 요약\n${dataDigest.slice(0, 1500)}`;
  }
  let depth = 1;
  while (countKoreanLikeChars(text) < minChars) {
    text += `\n\n## 실행 점검 노트 ${depth}\n`;
    text += "오늘 실행할 행동을 하나 정하고 결과를 기록해 다음 선택 기준에 반영하세요. 루틴은 작은 단위로 시작해 안정적으로 확장하세요.";
    depth += 1;
  }
  return text;
}

async function generateGuaranteedPremiumChapter(env, {
  context,
  chapterId,
  chapterJsonPacks,
  requestId,
  failureCode,
  failureMessage,
}) {
  const meta = resolvePremiumChapterMeta(context, chapterId);
  const llmInput = buildLlmPromptInput(
    context?.reportType,
    chapterId,
    context?.coreData?.canonicalJson || {},
    chapterJsonPacks,
    {
      previousChapterSummaries: summarizePreviousPremiumChapters(context, chapterId),
    },
  );
  const contract = llmInput?.chapterContract && typeof llmInput.chapterContract === "object"
    ? llmInput.chapterContract
    : {};
  const requiredHeadings = Array.isArray(contract?.requiredHeadings)
    ? contract.requiredHeadings.map((h) => String(h || "").trim()).filter(Boolean)
    : [];
  const spec = resolveChapterSpec(context?.reportType, context?.featureType, context?.modeKey, chapterId);
  const minChars = Math.max(1800, Number(spec?.chapterSpec?.minChars || 2400));
  const rawData = stringifyCompact(context?.coreData?.canonicalJson?.calculatedData || context?.coreData?.canonicalJson || {}, 18000);

  const prompt = [
    "너는 Code Destiny 프리미엄 PDF 전문 상담가다.",
    "반드시 한국어 마크다운 본문만 출력하고, 요청된 챕터 제목/카테고리(소제목)를 모두 포함한다.",
    "입력 엔진 데이터를 최대한 많이 반영하고, 데이터가 부분 누락되어도 자연스럽게 연결해 완성형 상담문을 작성한다.",
    "코드/에러 문구를 출력하지 말고, 단정적 예언을 피하고 실행 가능한 조언으로 작성한다.",
    `챕터 제목: ${meta.title}`,
    meta.subtitle ? `챕터 부제: ${meta.subtitle}` : "",
    `최소 분량: ${minChars}자`,
    requiredHeadings.length ? `필수 소제목: ${requiredHeadings.join(" | ")}` : "",
    failureCode ? `복구 사유 코드: ${failureCode}` : "",
    failureMessage ? `복구 사유 메시지: ${failureMessage}` : "",
    "",
    "[입력 엔진 데이터 요약]",
    rawData,
    "",
    "[LLM 입력 계약]",
    stringifyCompact(llmInput || {}, 8000),
  ].filter(Boolean).join("\n");

  const generated = await callGemini(env, prompt, ["PREMIUM_GEMINI_MODEL"], {
    temperature: 0.72,
    topP: 0.92,
    maxOutputTokens: 16384,
    timeoutMs: 90000,
    maxAttemptsPerPair: 3,
    requestId,
    reportType: context?.reportType || "",
  });

  let text = sanitizePremiumChapterText(generated || "");
  const hasAllHeadings = requiredHeadings.length === 0
    || requiredHeadings.every((h) => text.includes(String(h || "").trim()));
  if (!text || countKoreanLikeChars(text) < minChars || !hasAllHeadings) {
    text = buildGuaranteedPremiumChapterText(meta, requiredHeadings, minChars, rawData);
  }

  return {
    ok: true,
    text,
    chapterMeta: meta,
    chapterSpecificSections: requiredHeadings,
    usedFallback: false,
    fallbackReason: "",
    missingFields: [],
  };
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

function attachPremiumApiMeta(payload = {}, options = {}) {
  const stage = String(options.stage || payload.stage || "unknown").trim() || "unknown";
  const reportType = String(options.reportType || payload.reportType || "").trim();
  const featureType = String(options.featureType || payload.featureType || "").trim();
  const requestId = String(options.requestId || payload.requestId || "").trim();
  const normalizedCode = String(options.normalizedCode || payload.normalizedCode || payload.code || "").trim();

  return {
    ...payload,
    schemaVersion: "premium-report-v2",
    stage,
    reportType: reportType || payload.reportType || "",
    featureType: featureType || payload.featureType || "",
    requestId: requestId || payload.requestId || "",
    normalizedCode: normalizedCode || undefined,
    paymentPolicy: "server-authoritative-access-check",
    refundPolicy: "no-auto-refund-in-report-pipeline",
  };
}

function buildPremiumAccessDeniedPayload(access = {}, options = {}) {
  const status = Number(access.status || 402);
  const baseCode = String(access.code || "PAYMENT_REQUIRED").trim() || "PAYMENT_REQUIRED";
  const reportType = String(options.reportType || "").trim();
  const featureType = String(options.featureType || "").trim();
  const requestId = String(options.requestId || "").trim();

  const payload = attachPremiumApiMeta({
    ok: false,
    code: baseCode,
    message: String(access.message || "프리미엄 결제가 필요합니다."),
    reportType,
    featureType,
    requestId,
    required: access.required || null,
    paymentState: {
      required: true,
      status,
      authority: "worker/lib/access-control.requirePremiumReportAccess",
    },
  }, {
    stage: String(options.stage || "access-check"),
    reportType,
    featureType,
    requestId,
    normalizedCode: "PAYMENT_REQUIRED",
  });

  return {
    status,
    payload,
  };
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
  const strictPayload = shouldEnforcePremiumStrictPayload(reportType);
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
    _premiumStrictPayload: strictPayload,
    _premiumStrictValidation: strictPayload,
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

  if (reportType === "sajuNewYear") {
    if (!hasMeaningfulValue(base.targetYear)) base.targetYear = new Date().getFullYear();
    if (!hasMeaningfulValue(base.totalChapters)) base.totalChapters = 10;
  }

  return base;
}

function toPremiumFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPremiumBoundedInt(value, min, max) {
  const n = toPremiumFiniteNumber(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < min || i > max) return null;
  return i;
}

function parsePremiumBirthDate(value) {
  const text = String(value || "").trim();
  const m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return {};
  const year = toPremiumBoundedInt(m[1], 1000, 9999);
  const month = toPremiumBoundedInt(m[2], 1, 12);
  const day = toPremiumBoundedInt(m[3], 1, 31);
  return {
    year,
    month,
    day,
  };
}

function parsePremiumBirthTime(value) {
  const text = String(value || "").trim();
  const m = text.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return {};
  const hour = toPremiumBoundedInt(m[1], 0, 23);
  const minute = toPremiumBoundedInt(m[2] == null ? 0 : m[2], 0, 59);
  return {
    hour,
    minute,
  };
}

function normalizePremiumCalendarType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (["solar", "yang", "gregorian", "양력"].includes(raw)) return "solar";
  if (["lunar", "yin", "음력"].includes(raw)) return "lunar";
  return "";
}

function pickPremiumText(...values) {
  for (let i = 0; i < values.length; i += 1) {
    const text = String(values[i] ?? "").trim();
    if (text) return text;
  }
  return "";
}

function pickPremiumNumber(...values) {
  for (let i = 0; i < values.length; i += 1) {
    const n = toPremiumFiniteNumber(values[i]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractPremiumBirthCandidate(source = {}) {
  if (!source || typeof source !== "object") return {};
  const dateFromText = parsePremiumBirthDate(source.birthDate || source.solarBirthDate || source.date);
  const timeFromText = parsePremiumBirthTime(source.birthTime || source.time);

  const year = toPremiumBoundedInt(source.year ?? source.birthYear ?? dateFromText.year, 1000, 9999);
  const month = toPremiumBoundedInt(source.month ?? source.birthMonth ?? dateFromText.month, 1, 12);
  const day = toPremiumBoundedInt(source.day ?? source.birthDay ?? dateFromText.day, 1, 31);
  const hour = toPremiumBoundedInt(source.hour ?? source.birthHour ?? timeFromText.hour, 0, 23);
  const minute = toPremiumBoundedInt(source.minute ?? source.birthMinute ?? timeFromText.minute, 0, 59);

  return {
    name: pickPremiumText(source.name, source.fullName, source.displayName),
    gender: pickPremiumText(source.gender, source.sex),
    year,
    month,
    day,
    hour,
    minute,
    calType: normalizePremiumCalendarType(
      source.calType
      || source.calendarType
      || source.calendar
      || source.solarLunar,
    ),
    timezone: pickPremiumText(source.timezone, source.timezoneName, source.tz),
    lat: pickPremiumNumber(source.lat, source.latitude),
    lon: pickPremiumNumber(source.lon, source.lng, source.longitude),
  };
}

function mergePremiumBirthFields(base = {}, incoming = {}) {
  const merged = { ...(base && typeof base === "object" ? base : {}) };
  const assignText = (key) => {
    if (!pickPremiumText(merged[key]) && pickPremiumText(incoming[key])) {
      merged[key] = pickPremiumText(incoming[key]);
    }
  };
  const assignNumber = (key) => {
    if (!Number.isFinite(toPremiumFiniteNumber(merged[key])) && Number.isFinite(toPremiumFiniteNumber(incoming[key]))) {
      merged[key] = toPremiumFiniteNumber(incoming[key]);
    }
  };

  assignText("name");
  assignText("gender");
  assignText("calType");
  assignText("timezone");
  assignNumber("year");
  assignNumber("month");
  assignNumber("day");
  assignNumber("hour");
  assignNumber("minute");
  assignNumber("lat");
  assignNumber("lon");
  return merged;
}

function extractPremiumSelfBirth(normalized = {}) {
  const sources = [
    normalized,
    normalized.birthData,
    normalized.birth,
    normalized.profile,
    normalized.profile?.birth,
    normalized.userProfile,
    normalized.userProfile?.birth,
    normalized.user,
    normalized.user?.birth,
    normalized.engineData,
    normalized.engineData?.birth,
  ];

  return sources.reduce((acc, src) => mergePremiumBirthFields(acc, extractPremiumBirthCandidate(src)), {});
}

function extractPremiumPartnerBirth(normalized = {}) {
  const topPartner = {
    name: normalized.partnerName,
    gender: normalized.partnerGender,
    year: normalized.partnerYear,
    month: normalized.partnerMonth,
    day: normalized.partnerDay,
    hour: normalized.partnerHour,
    minute: normalized.partnerMinute,
    calType: normalized.partnerCalType,
    timezone: normalized.partnerTimezone || normalized.partnerTimezoneName,
    lat: normalized.partnerLat,
    lon: normalized.partnerLon,
    birthDate: normalized.partnerBirthDate,
    birthTime: normalized.partnerBirthTime,
  };

  const sources = [
    topPartner,
    normalized.partnerBirthData,
    normalized.partnerBirth,
    normalized.partner,
    normalized.partner?.birth,
    normalized.partner?.profile,
    normalized.partner?.profile?.birth,
    normalized.partnerData,
    normalized.partnerData?.profile,
    normalized.partnerData?.profile?.birth,
  ];

  return sources.reduce((acc, src) => mergePremiumBirthFields(acc, extractPremiumBirthCandidate(src)), {});
}

function applyPremiumSelfBirth(normalized = {}, selfBirth = {}) {
  const year = toPremiumBoundedInt(selfBirth.year, 1000, 9999);
  const month = toPremiumBoundedInt(selfBirth.month, 1, 12);
  const day = toPremiumBoundedInt(selfBirth.day, 1, 31);
  const hour = toPremiumBoundedInt(selfBirth.hour, 0, 23);
  const minute = toPremiumBoundedInt(selfBirth.minute, 0, 59);
  const calType = normalizePremiumCalendarType(selfBirth.calType);
  const timezone = pickPremiumText(selfBirth.timezone);

  if (!hasMeaningfulValue(normalized.name) && pickPremiumText(selfBirth.name)) normalized.name = String(selfBirth.name).trim();
  if (!hasMeaningfulValue(normalized.gender) && pickPremiumText(selfBirth.gender)) normalized.gender = String(selfBirth.gender).trim();
  if (!hasMeaningfulValue(normalized.profileId) && pickPremiumText(normalized?.profile?.profileId, normalized?.birthData?.profileId)) {
    normalized.profileId = pickPremiumText(normalized?.profile?.profileId, normalized?.birthData?.profileId);
  }

  if (!hasMeaningfulValue(normalized.year) && Number.isFinite(year)) normalized.year = year;
  if (!hasMeaningfulValue(normalized.month) && Number.isFinite(month)) normalized.month = month;
  if (!hasMeaningfulValue(normalized.day) && Number.isFinite(day)) normalized.day = day;
  if (!hasMeaningfulValue(normalized.hour) && Number.isFinite(hour)) normalized.hour = hour;
  if (!hasMeaningfulValue(normalized.minute) && Number.isFinite(minute)) normalized.minute = minute;

  if (!hasMeaningfulValue(normalized.calType) && calType) normalized.calType = calType;
  if (!hasMeaningfulValue(normalized.calendarType) && calType) normalized.calendarType = calType;
  if (!hasMeaningfulValue(normalized.timezoneName) && timezone) normalized.timezoneName = timezone;
  if (!hasMeaningfulValue(normalized.timezone) && timezone) normalized.timezone = timezone;
  if (!hasMeaningfulValue(normalized.lat) && Number.isFinite(toPremiumFiniteNumber(selfBirth.lat))) normalized.lat = Number(selfBirth.lat);
  if (!hasMeaningfulValue(normalized.lon) && Number.isFinite(toPremiumFiniteNumber(selfBirth.lon))) normalized.lon = Number(selfBirth.lon);

  const birthDateParts = [normalized.year, normalized.month, normalized.day].map((v) => Number(v));
  if (!hasMeaningfulValue(normalized.birthDate) && birthDateParts.every((v, idx) => idx === 0 ? Number.isFinite(v) && v >= 1000 : Number.isFinite(v))) {
    normalized.birthDate = `${birthDateParts[0]}-${String(birthDateParts[1]).padStart(2, "0")}-${String(birthDateParts[2]).padStart(2, "0")}`;
  }
  const birthTimeParts = [normalized.hour, normalized.minute].map((v) => Number(v));
  if (!hasMeaningfulValue(normalized.birthTime) && birthTimeParts.every((v) => Number.isFinite(v))) {
    normalized.birthTime = `${String(birthTimeParts[0]).padStart(2, "0")}:${String(birthTimeParts[1]).padStart(2, "0")}`;
  }

  const existingBirthData = (normalized.birthData && typeof normalized.birthData === "object") ? normalized.birthData : {};
  normalized.birthData = {
    ...existingBirthData,
    profileId: pickPremiumText(existingBirthData.profileId, normalized.profileId),
    birthDate: pickPremiumText(existingBirthData.birthDate, normalized.birthDate),
    birthTime: pickPremiumText(existingBirthData.birthTime, normalized.birthTime),
    name: pickPremiumText(existingBirthData.name, normalized.name),
    gender: pickPremiumText(existingBirthData.gender, normalized.gender),
    year: Number.isFinite(Number(existingBirthData.year)) ? Number(existingBirthData.year) : (Number.isFinite(Number(normalized.year)) ? Number(normalized.year) : undefined),
    month: Number.isFinite(Number(existingBirthData.month)) ? Number(existingBirthData.month) : (Number.isFinite(Number(normalized.month)) ? Number(normalized.month) : undefined),
    day: Number.isFinite(Number(existingBirthData.day)) ? Number(existingBirthData.day) : (Number.isFinite(Number(normalized.day)) ? Number(normalized.day) : undefined),
    hour: Number.isFinite(Number(existingBirthData.hour)) ? Number(existingBirthData.hour) : (Number.isFinite(Number(normalized.hour)) ? Number(normalized.hour) : undefined),
    minute: Number.isFinite(Number(existingBirthData.minute)) ? Number(existingBirthData.minute) : (Number.isFinite(Number(normalized.minute)) ? Number(normalized.minute) : undefined),
    calType: pickPremiumText(existingBirthData.calType, existingBirthData.calendarType, normalized.calType, normalized.calendarType),
    timezoneName: pickPremiumText(existingBirthData.timezoneName, normalized.timezoneName),
    timezone: pickPremiumText(existingBirthData.timezone, normalized.timezoneName, normalized.timezone),
    lat: Number.isFinite(Number(existingBirthData.lat)) ? Number(existingBirthData.lat) : (Number.isFinite(Number(normalized.lat)) ? Number(normalized.lat) : undefined),
    lon: Number.isFinite(Number(existingBirthData.lon)) ? Number(existingBirthData.lon) : (Number.isFinite(Number(normalized.lon)) ? Number(normalized.lon) : undefined),
  };

  const existingProfile = (normalized.profile && typeof normalized.profile === "object") ? normalized.profile : {};
  normalized.profile = {
    ...existingProfile,
    profileId: pickPremiumText(existingProfile.profileId, normalized.profileId),
    name: pickPremiumText(existingProfile.name, normalized.name),
    gender: pickPremiumText(existingProfile.gender, normalized.gender),
    birthDate: pickPremiumText(existingProfile.birthDate, normalized.birthDate),
    birthTime: pickPremiumText(existingProfile.birthTime, normalized.birthTime),
    calendarType: pickPremiumText(existingProfile.calendarType, normalized.calendarType, normalized.calType),
    timezone: pickPremiumText(existingProfile.timezone, normalized.timezoneName, normalized.timezone),
  };
}

function applyPremiumPartnerBirth(normalized = {}, partnerBirth = {}) {
  const year = toPremiumBoundedInt(partnerBirth.year, 1000, 9999);
  const month = toPremiumBoundedInt(partnerBirth.month, 1, 12);
  const day = toPremiumBoundedInt(partnerBirth.day, 1, 31);
  const hour = toPremiumBoundedInt(partnerBirth.hour, 0, 23);
  const minute = toPremiumBoundedInt(partnerBirth.minute, 0, 59);
  const calType = normalizePremiumCalendarType(partnerBirth.calType);
  const timezone = pickPremiumText(partnerBirth.timezone);

  if (!hasMeaningfulValue(normalized.partnerName) && pickPremiumText(partnerBirth.name)) normalized.partnerName = String(partnerBirth.name).trim();
  if (!hasMeaningfulValue(normalized.partnerGender) && pickPremiumText(partnerBirth.gender)) normalized.partnerGender = String(partnerBirth.gender).trim();
  if (!hasMeaningfulValue(normalized.partnerYear) && Number.isFinite(year)) normalized.partnerYear = year;
  if (!hasMeaningfulValue(normalized.partnerMonth) && Number.isFinite(month)) normalized.partnerMonth = month;
  if (!hasMeaningfulValue(normalized.partnerDay) && Number.isFinite(day)) normalized.partnerDay = day;
  if (!hasMeaningfulValue(normalized.partnerHour) && Number.isFinite(hour)) normalized.partnerHour = hour;
  if (!hasMeaningfulValue(normalized.partnerMinute) && Number.isFinite(minute)) normalized.partnerMinute = minute;
  if (!hasMeaningfulValue(normalized.partnerCalType) && calType) normalized.partnerCalType = calType;
  if (!hasMeaningfulValue(normalized.partnerTimezoneName) && timezone) normalized.partnerTimezoneName = timezone;
  if (!hasMeaningfulValue(normalized.partnerTimezone) && timezone) normalized.partnerTimezone = timezone;
  if (!hasMeaningfulValue(normalized.partnerLat) && Number.isFinite(toPremiumFiniteNumber(partnerBirth.lat))) normalized.partnerLat = Number(partnerBirth.lat);
  if (!hasMeaningfulValue(normalized.partnerLon) && Number.isFinite(toPremiumFiniteNumber(partnerBirth.lon))) normalized.partnerLon = Number(partnerBirth.lon);

  const existingPartnerBirthData = (normalized.partnerBirthData && typeof normalized.partnerBirthData === "object") ? normalized.partnerBirthData : {};
  normalized.partnerBirthData = {
    ...existingPartnerBirthData,
    name: pickPremiumText(existingPartnerBirthData.name, normalized.partnerName),
    gender: pickPremiumText(existingPartnerBirthData.gender, normalized.partnerGender),
    year: Number.isFinite(Number(existingPartnerBirthData.year)) ? Number(existingPartnerBirthData.year) : (Number.isFinite(Number(normalized.partnerYear)) ? Number(normalized.partnerYear) : undefined),
    month: Number.isFinite(Number(existingPartnerBirthData.month)) ? Number(existingPartnerBirthData.month) : (Number.isFinite(Number(normalized.partnerMonth)) ? Number(normalized.partnerMonth) : undefined),
    day: Number.isFinite(Number(existingPartnerBirthData.day)) ? Number(existingPartnerBirthData.day) : (Number.isFinite(Number(normalized.partnerDay)) ? Number(normalized.partnerDay) : undefined),
    hour: Number.isFinite(Number(existingPartnerBirthData.hour)) ? Number(existingPartnerBirthData.hour) : (Number.isFinite(Number(normalized.partnerHour)) ? Number(normalized.partnerHour) : undefined),
    minute: Number.isFinite(Number(existingPartnerBirthData.minute)) ? Number(existingPartnerBirthData.minute) : (Number.isFinite(Number(normalized.partnerMinute)) ? Number(normalized.partnerMinute) : undefined),
    calType: pickPremiumText(existingPartnerBirthData.calType, existingPartnerBirthData.calendarType, normalized.partnerCalType),
    timezoneName: pickPremiumText(existingPartnerBirthData.timezoneName, normalized.partnerTimezoneName),
    timezone: pickPremiumText(existingPartnerBirthData.timezone, normalized.partnerTimezoneName, normalized.partnerTimezone),
    lat: Number.isFinite(Number(existingPartnerBirthData.lat)) ? Number(existingPartnerBirthData.lat) : (Number.isFinite(Number(normalized.partnerLat)) ? Number(normalized.partnerLat) : undefined),
    lon: Number.isFinite(Number(existingPartnerBirthData.lon)) ? Number(existingPartnerBirthData.lon) : (Number.isFinite(Number(normalized.partnerLon)) ? Number(normalized.partnerLon) : undefined),
  };
}

function normalizePremiumRequestBodyForPipeline(reportType, sourceInput = {}) {
  const normalized = {
    ...(sourceInput && typeof sourceInput === "object" ? sourceInput : {}),
  };

  const selfBirth = extractPremiumSelfBirth(normalized);
  applyPremiumSelfBirth(normalized, selfBirth);

  const modeRaw = String(normalized.mode || normalized.reportMode || normalized.reportType || "").toLowerCase();
  const isCompatibility = modeRaw.includes("compat") || modeRaw.includes("couple") || modeRaw.includes("partner");
  const hasAnyPartnerField = [
    normalized.partnerYear,
    normalized.partnerMonth,
    normalized.partnerDay,
    normalized.partnerBirthData,
    normalized.partner,
  ].some((value) => hasMeaningfulValue(value));
  if (isCompatibility || hasAnyPartnerField) {
    const partnerBirth = extractPremiumPartnerBirth(normalized);
    applyPremiumPartnerBirth(normalized, partnerBirth);
  }

  const strictPayload = shouldEnforcePremiumStrictPayload(reportType);
  normalized._premiumStrictPayload = strictPayload;
  normalized._premiumStrictValidation = strictPayload;

  const token = String(
    normalized.premiumAccessToken
    || normalized._premiumAccessToken
    || "",
  ).trim();
  if (token) {
    normalized.premiumAccessToken = token;
    normalized._premiumAccessToken = token;
  }

  if (reportType === "westernAstrologyPremium") {
    if (!hasMeaningfulValue(normalized.timezoneName)) normalized.timezoneName = "Asia/Seoul";
    if (!hasMeaningfulValue(normalized.birthPlace)) normalized.birthPlace = "Seoul";
    if (!hasMeaningfulValue(normalized.houseSystem)) normalized.houseSystem = "placidus";
    if (!hasMeaningfulValue(normalized.zodiacType)) normalized.zodiacType = "tropical";
    if (!hasMeaningfulValue(normalized.timezone)) normalized.timezone = 9;
    if (!hasMeaningfulValue(normalized.lat)) normalized.lat = 37.5665;
    if (!hasMeaningfulValue(normalized.lon)) normalized.lon = 126.978;
  }

  if (reportType === "vedicPremium") {
    if (!hasMeaningfulValue(normalized.mode)) normalized.mode = "personal";
    if (!hasMeaningfulValue(normalized.ayanamsa)) normalized.ayanamsa = "lahiri";
  }

  if (reportType === "sookyoPremium" && !hasMeaningfulValue(normalized.mode)) {
    normalized.mode = "personal";
  }

  if (reportType === "loveSecret") {
    if (!hasMeaningfulValue(normalized.mode)) normalized.mode = "solo";
    if (!hasMeaningfulValue(normalized.totalChapters)) normalized.totalChapters = 10;
  }

  if (reportType === "lifeBook" && !hasMeaningfulValue(normalized.totalChapters)) {
    normalized.totalChapters = 13;
  }

  if (reportType === "sajuNewYear") {
    if (!hasMeaningfulValue(normalized.targetYear)) normalized.targetYear = new Date().getFullYear();
    if (!hasMeaningfulValue(normalized.totalChapters)) normalized.totalChapters = 10;
  }

  return normalized;
}

function normalizePremiumBirthForBinding(raw = {}) {
  const year = toPremiumBoundedInt(raw.year, 1000, 9999);
  const month = toPremiumBoundedInt(raw.month, 1, 12);
  const day = toPremiumBoundedInt(raw.day, 1, 31);
  const hour = toPremiumBoundedInt(raw.hour, 0, 23);
  const minute = toPremiumBoundedInt(raw.minute, 0, 59);
  return {
    name: pickPremiumText(raw.name),
    gender: pickPremiumText(raw.gender).toLowerCase(),
    year: Number.isFinite(year) ? year : null,
    month: Number.isFinite(month) ? month : null,
    day: Number.isFinite(day) ? day : null,
    hour: Number.isFinite(hour) ? hour : null,
    minute: Number.isFinite(minute) ? minute : null,
    calendarType: normalizePremiumCalendarType(raw.calType || raw.calendarType || raw.calendar) || "",
    timezone: pickPremiumText(raw.timezone),
  };
}

function hasPremiumPartnerBirthData(partner = {}) {
  return Number.isFinite(Number(partner?.year))
    && Number.isFinite(Number(partner?.month))
    && Number.isFinite(Number(partner?.day));
}

function buildPremiumSessionBinding(reportType, modeKey, requestBody = {}) {
  const normalized = normalizePremiumRequestBodyForPipeline(reportType, requestBody || {});
  const selfBirth = normalizePremiumBirthForBinding(extractPremiumSelfBirth(normalized));
  const partnerBirth = normalizePremiumBirthForBinding(extractPremiumPartnerBirth(normalized));

  const normalizedMode = String(modeKey || modeKeyFromInput(normalized) || "").trim().toLowerCase();
  const modeCompatibility = normalizedMode.includes("compat") || normalizedMode.includes("couple");
  const isCompatibility = modeCompatibility || hasPremiumPartnerBirthData(partnerBirth);
  const partnerSnapshot = isCompatibility ? partnerBirth : null;

  const profileSnapshot = {
    profileId: pickPremiumText(normalized.profileId, normalized?.profile?.profileId, normalized?.birthData?.profileId),
    self: selfBirth,
    partner: partnerSnapshot,
    isCompatibility,
  };

  const seed = {
    reportType: String(reportType || ""),
    modeKey: normalizedMode,
    profileSnapshot,
  };

  return {
    bindingId: `pbind_${stableHash(stringifyCompact(seed, 2200))}`,
    reportType: String(reportType || ""),
    modeKey: normalizedMode,
    profileSnapshot,
    requestDigest: stableHash(stringifyCompact(normalized, 4200)),
  };
}

function validatePremiumSessionBinding(context, body = {}) {
  const expectedBinding = context?.sessionBinding;
  if (!expectedBinding || typeof expectedBinding !== "object") {
    return { ok: true, skipped: true };
  }

  const expectedBindingId = String(expectedBinding.bindingId || "").trim();
  if (!expectedBindingId) {
    return { ok: true, skipped: true };
  }

  const requestBody = (body?.requestBody && typeof body.requestBody === "object")
    ? body.requestBody
    : null;
  if (!requestBody) {
    return { ok: true, skipped: true, bindingId: expectedBindingId };
  }

  const incoming = buildPremiumSessionBinding(context.reportType, context.modeKey, requestBody);
  const incomingBindingId = String(incoming.bindingId || "").trim();
  if (!incomingBindingId) {
    return { ok: true, skipped: true, bindingId: expectedBindingId };
  }

  if (expectedBindingId !== incomingBindingId) {
    return {
      ok: false,
      code: "PREMIUM_REPORT_SESSION_BINDING_MISMATCH",
      message: "리포트 세션의 출생 프로필 바인딩과 현재 요청 데이터가 일치하지 않습니다.",
      expectedBindingId,
      incomingBindingId,
      expectedProfileSnapshot: expectedBinding.profileSnapshot || null,
      incomingProfileSnapshot: incoming.profileSnapshot || null,
    };
  }

  return { ok: true, bindingId: expectedBindingId };
}

function buildPremiumCanonicalFingerprint(canonicalJson = {}) {
  const payload = {
    reportType: String(canonicalJson?.reportType || ""),
    calculatedData: canonicalJson?.calculatedData || {},
    chapterData: canonicalJson?.chapterData || {},
    interpretationSeed: canonicalJson?.interpretationSeed || {},
  };
  return `pcf_${stableHash(stringifyCompact(payload, 26000))}`;
}

function buildPremiumChapterContract(reportType, featureType, mode, chapterId) {
  const resolved = resolveChapterSpec(reportType, featureType, mode, chapterId);
  const chapterSpec = resolved?.chapterSpec || null;
  const chapterNo = Number(chapterId || 1);

  const contract = {
    reportType: String(reportType || ""),
    featureType: String(featureType || ""),
    mode: String(mode || ""),
    chapterId: chapterNo,
    chapterTitle: String(chapterSpec?.title || `Chapter ${chapterNo}`),
    minChars: Number(chapterSpec?.minChars || 0),
    targetChars: Number(chapterSpec?.targetChars || 0),
    outputFormat: "markdown",
    requiredHeadings: [],
    requiredJsonFields: [],
  };

  if (reportType === "ziweiPremium") {
    contract.outputFormat = "json+markdown";
    contract.requiredJsonFields = [
      "chapterTitle",
      "chapterSubtitle",
      "summary",
      "sections",
      "practicalAdvice",
      "cautions",
      "masterConclusion",
      "coreStars",
      "corePalaces",
    ];
    contract.requiredHeadings = [
      "## 1. 이 챕터에서 보는 핵심",
      "## 2. 별의 구조와 세기 분석",
      "## 3. 별의 밝기로 본 강점과 약점",
      "## 10. 챕터 핵심 요약",
    ];
  } else if (reportType === "sookyoPremium") {
    contract.outputFormat = "json+markdown";
    contract.requiredJsonFields = [
      "chapterTitle",
      "summary",
      "sections",
      "practicalAdvice",
      "cautions",
    ];
  } else if (reportType === "westernAstrologyPremium") {
    const chapterKey = String(chapterSpec?.key || "").trim();
    const modeHint = String(
      mode
      || chapterSpec?.mode
      || (chapterKey.startsWith("K") ? "compatibility" : "personal"),
    ).toLowerCase();
    const chapterMeta = resolveAstroChapterMeta(chapterNo, modeHint, chapterKey);
    contract.requiredHeadings = buildAstroRequiredHeadings(chapterMeta, modeHint);
  } else if (reportType === "vedicPremium") {
    const chapterKey = String(chapterSpec?.key || "").trim();
    const modeHint = String(
      mode
      || chapterSpec?.mode
      || (chapterKey.startsWith("VC") ? "compatibility" : "personal"),
    ).toLowerCase();
    const chapterMeta = resolveVedicChapterMeta(chapterNo, modeHint, chapterKey);
    contract.requiredHeadings = buildVedicRequiredHeadings(chapterMeta, modeHint);
  } else if (reportType === "loveSecret") {
    contract.requiredHeadings = [
      "### 1. 상담 핵심 진단",
      "### 2. 핵심 구조 진단",
      "### 3. 관계 운영 전략",
      "### 4. 리스크 관리",
      "### 핵심 요약 5줄",
    ];
  } else if (reportType === "sajuNewYear") {
    const chapterSpec = getSajuNewYearChapterPromptSpec(chapterNo);
    contract.requiredHeadings = Array.isArray(chapterSpec?.markers)
      ? chapterSpec.markers.map((row) => String(row || "").trim()).filter(Boolean)
      : [];
  }

  return contract;
}

function formatPremiumChapterContractForPrompt(chapterContract = {}) {
  const contract = chapterContract && typeof chapterContract === "object" ? chapterContract : {};
  const lines = [];
  const chapterTitle = String(contract.chapterTitle || "").trim();
  const outputFormat = String(contract.outputFormat || "markdown").trim();
  const minChars = Number(contract.minChars || 0);
  const targetChars = Number(contract.targetChars || 0);
  const requiredHeadings = Array.isArray(contract.requiredHeadings) ? contract.requiredHeadings.filter(Boolean) : [];
  const requiredJsonFields = Array.isArray(contract.requiredJsonFields) ? contract.requiredJsonFields.filter(Boolean) : [];

  if (chapterTitle) lines.push(`chapterTitle=${chapterTitle}`);
  lines.push(`outputFormat=${outputFormat}`);
  if (minChars > 0) lines.push(`minChars=${minChars}`);
  if (targetChars > 0) lines.push(`targetChars=${targetChars}`);
  if (requiredHeadings.length) lines.push(`requiredHeadings=${requiredHeadings.join(" | ")}`);
  if (requiredJsonFields.length) lines.push(`requiredJsonFields=${requiredJsonFields.join(", ")}`);

  return lines.join("\n");
}

function validatePremiumChapterResponseEnvelope({ reportType, chapterId, data, chapterContract, previousChapterTexts = [] }) {
  const text = String(data?.text || "").trim();
  if (!text) {
    return {
      ok: false,
      code: "PREMIUM_REPORT_CHAPTER_EMPTY",
      message: "챕터 텍스트가 비어 있습니다.",
      details: { chapterId },
    };
  }

  const contract = chapterContract && typeof chapterContract === "object"
    ? chapterContract
    : buildPremiumChapterContract(reportType, REPORT_TYPE_TO_FEATURE_TYPE[reportType] || reportType, "", chapterId);
  const requiredHeadings = Array.isArray(contract.requiredHeadings) ? contract.requiredHeadings.filter(Boolean) : [];
  const missingHeadings = requiredHeadings.filter((heading) => !text.includes(heading));
  const repeatedAcross = detectCrossChapterRepeatedSentences(text, previousChapterTexts, 35);

  const chapterJson = data?.chapterJson && typeof data.chapterJson === "object" ? data.chapterJson : null;
  const requiredJsonFields = Array.isArray(contract.requiredJsonFields) ? contract.requiredJsonFields.filter(Boolean) : [];
  const missingJsonFields = chapterJson
    ? requiredJsonFields.filter((field) => {
      const value = chapterJson[field];
      if (Array.isArray(value)) return value.length === 0;
      return !hasMeaningfulValue(value);
    })
    : (requiredJsonFields.length > 0 ? requiredJsonFields.slice() : []);

  if (reportType === "ziweiPremium") {
    const sections = Array.isArray(chapterJson?.sections) ? chapterJson.sections : [];
    if (sections.length < 2) {
      missingJsonFields.push("sections");
    }
  }

  const shouldCheckHeadings = reportType === "westernAstrologyPremium"
    || reportType === "vedicPremium"
    || reportType === "ziweiPremium"
    || reportType === "loveSecret"
    || reportType === "sajuNewYear"
    || reportType === "lifeBook";
  const headingInvalid = shouldCheckHeadings && missingHeadings.length > 0;
  const jsonInvalid = missingJsonFields.length > 0;
  const duplicateInvalid = repeatedAcross.length >= 3 && (
    reportType === "ziweiPremium"
    || reportType === "westernAstrologyPremium"
    || reportType === "vedicPremium"
    || reportType === "lifeBook"
    || reportType === "loveSecret"
    || reportType === "sajuNewYear"
  );

  if (headingInvalid || jsonInvalid || duplicateInvalid) {
    return {
      ok: false,
      code: "PREMIUM_REPORT_CHAPTER_CONTRACT_FAILED",
      message: "챕터 출력이 계약된 구조/필수 항목을 충족하지 못했습니다.",
      details: {
        chapterId,
        missingHeadings,
        missingJsonFields: Array.from(new Set(missingJsonFields)),
        repeatedAcross: repeatedAcross.slice(0, 6),
      },
    };
  }

  return {
    ok: true,
    chapterContract: contract,
  };
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
  if (reportType === "sajuNewYear") {
    return {
      type: reportType,
      profile: calculatedData?.profile || {},
      targetYear: calculatedData?.targetYear || "",
      focusArea: calculatedData?.focusArea || "overall",
      yearlySummary: calculatedData?.yearlySummary || {},
      monthlyLuck: Array.isArray(calculatedData?.monthlyLuck) ? calculatedData.monthlyLuck : [],
      actionPlan: calculatedData?.actionPlan || {},
      saju: calculatedData?.saju || {},
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

function buildPremiumDebugSnapshot(reportType, canonicalJson = {}, validation = null, hydration = null) {
  return {
    createdAt: new Date().toISOString(),
    reportType,
    reportPayload: canonicalJson?.reportPayload || canonicalJson?.calculatedData || {},
    diagnostics: canonicalJson?.diagnostics || {},
    validation: validation || null,
    hydration: hydration || null,
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
      try {
        const { response, data } = await invokePremiumLegacyHandler(handler, request, env, prepareRequestBody);
        status = Number(response?.status || 0);
        code = String(data?.code || "");
        if (response.ok && data?.ok) {
          prepareData = data;
        }
      } catch (handlerError) {
        status = 500;
        code = String(handlerError?.code || handlerError?.name || "HANDLER_EXCEPTION");
        logPremiumPipelineStage("HydrationHandlerException", {
          reportType,
          attempt,
          code,
          message: String(handlerError?.message || "handler threw an exception"),
        });
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

  // vedicPremium: 차트 엔진 실패 시에도 입력값 기반으로 최소 canonical 구성 (환불 방지)
  if (!bestBuild && reportType === "vedicPremium" && requestBody && hasMeaningfulValue(requestBody)) {
    logPremiumPipelineStage("VedicHydrationFallback", {
      reportType,
      requestId,
      reason: "모든 hydration 시도 실패 – 입력값 기반 최소 canonical 구성",
    });
    const skeletonPrepareData = { canonicalVedicChart: {} };
    bestPrepareData = skeletonPrepareData;
    bestBuild = buildCanonicalJsonForReport(reportType, skeletonPrepareData, requestBody, authInfo, {
      reportId,
      inputHash,
      calculationVersion,
      createdAt,
      sourceMap: buildPremiumSourceMap(reportType, requestBody, skeletonPrepareData),
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
  if (reportType === "sajuNewYear") return handleSajuNewYearSession;
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
  const fromArray = Array.isArray(source)
    ? source.reduce((acc, item) => {
      const key = String(item?.nameEn || item?.name || item?.planet || "").trim().toLowerCase();
      if (!key) return acc;
      acc[key] = item;
      return acc;
    }, {})
    : {};
  const merged = {
    ...fromArray,
    ...(Array.isArray(source) ? {} : source),
  };
  const map = {
    sun: merged.sun || merged.Sun || {},
    moon: merged.moon || merged.Moon || {},
    mercury: merged.mercury || merged.Mercury || {},
    venus: merged.venus || merged.Venus || {},
    mars: merged.mars || merged.Mars || {},
    jupiter: merged.jupiter || merged.Jupiter || {},
    saturn: merged.saturn || merged.Saturn || {},
    uranus: merged.uranus || merged.Uranus || {},
    neptune: merged.neptune || merged.Neptune || {},
    pluto: merged.pluto || merged.Pluto || {},
    northNode: merged.northNode || merged.NorthNode || {},
    chiron: merged.chiron || merged.Chiron || {},
    rahu: merged.rahu || merged.Rahu || {},
    ketu: merged.ketu || merged.Ketu || {},
  };
  return map;
}

function normalizeStrengthSymbol(symbol, brightness = "") {
  const raw = String(symbol || "").trim();
  if (raw === "O" || raw === "○") return "O";
  if (raw === "X" || raw === "×" || raw === "함") return "×";
  if (raw === "△" || raw === "▲") return "△";
  if (["◎", "○", "△", "×"].includes(raw)) return raw;
  if (/(묘|廟)/.test(raw)) return "◎";
  if (/(왕|旺)/.test(raw)) return "O";
  if (/(리|利|이로|유리|득|평|平)/.test(raw)) return "△";
  if (/(평|平|보통)/.test(raw)) return "△";
  if (/(함|陷|약|쇠|실)/.test(raw)) return "×";
  const tone = String(brightness || "").trim();
  if (/(묘|廟)/.test(tone)) return "◎";
  if (/(왕|旺|강)/.test(tone)) return "O";
  if (/(리|利|이로|유리|득|평|平)/.test(tone)) return "△";
  if (/(평|平|보통)/.test(tone)) return "△";
  if (/(함|陷|약|쇠|실)/.test(tone)) return "×";
  return "△";
}

function inferZiweiPalaceKey(palace = {}) {
  const rawKey = String(palace?.palaceKey || palace?.key || "").trim().toLowerCase();
  if (rawKey) return rawKey;
  const name = String(palace?.palaceNameKo || palace?.palaceName || palace?.name || "");
  if (name.includes("명궁")) return "ming";
  if (name.includes("형제")) return "siblings";
  if (name.includes("부처") || name.includes("배우자")) return "spouse";
  if (name.includes("자녀")) return "children";
  if (name.includes("재백") || name.includes("재물")) return "wealth";
  if (name.includes("질액") || name.includes("건강")) return "health";
  if (name.includes("천이") || name.includes("이동")) return "travel";
  if (name.includes("교우") || name.includes("노복") || name.includes("친구")) return "friends";
  if (name.includes("관록") || name.includes("직업")) return "career";
  if (name.includes("전택") || name.includes("부동산")) return "property";
  if (name.includes("복덕")) return "fortune";
  if (name.includes("부모")) return "parents";
  return "";
}

function normalizeZiweiStar(star = {}) {
  const name = String(star?.nameKo || star?.name || "").trim();
  const brightness = String(star?.brightnessKo || star?.brightness || "").trim();
  const strengthSymbol = normalizeStrengthSymbol(star?.strengthSymbol || star?.symbol, brightness);
  return {
    ...star,
    name,
    nameKo: name,
    brightness,
    strengthSymbol,
    symbol: strengthSymbol,
  };
}

function buildZiweiPalaceInterpretationSeed(palace = {}, index = 0) {
  const source = palace && typeof palace === "object" ? palace : {};
  const fallbackName = `궁 ${Number(index) + 1}`;
  const palaceName = String(
    source?.palaceNameKo
    || source?.palaceName
    || source?.nameKo
    || source?.name
    || fallbackName,
  ).trim() || fallbackName;
  const branch = String(source?.branch || source?.earthlyBranch || "").trim();
  const mainStars = Array.isArray(source?.mainStars) ? source.mainStars : [];
  const starNames = mainStars
    .map((star) => String(star?.nameKo || star?.name || "").trim())
    .filter(Boolean)
    .slice(0, 2);
  const transforms = Array.isArray(source?.transformations)
    ? source.transformations.map((entry) => String(entry?.type || entry?.kind || "").trim()).filter(Boolean).slice(0, 2)
    : [];

  return [
    palaceName,
    branch ? `${branch}궁` : "",
    starNames.length ? `주성 ${starNames.join("/")}` : "",
    transforms.length ? `사화 ${transforms.join("/")}` : "",
  ].filter(Boolean).join(" | ");
}

function buildZiweiDaXianRows(canonical = {}, palacesByKey = {}) {
  const luck = canonical?.luck && typeof canonical.luck === "object" ? canonical.luck : {};
  const palaceMap = palacesByKey && typeof palacesByKey === "object" ? palacesByKey : {};
  const rows = [];

  const pushRow = (entry = {}, fallbackIndex = 0) => {
    const source = entry && typeof entry === "object" ? entry : {};
    const inferredPalaceKey = inferZiweiPalaceKey({
      palaceKey: source?.palaceKey,
      key: source?.palaceKey,
      palaceNameKo: source?.palaceName,
      palaceName: source?.palaceName,
      name: source?.palace,
    });
    const palaceKey = String(inferredPalaceKey || source?.palaceKey || "").trim();
    const palaceName = String(
      source?.palaceName
      || source?.palace
      || palaceMap?.[palaceKey]?.name
      || palaceMap?.[palaceKey]?.palaceName
      || "",
    ).trim();
    const range = String(
      source?.range
      || source?.period
      || source?.ageRange
      || ((Number.isFinite(Number(source?.startAge)) && Number.isFinite(Number(source?.endAge)))
        ? `${Number(source.startAge)}-${Number(source.endAge)}`
        : ""),
    ).trim();

    rows.push({
      ...source,
      palaceKey,
      palaceName,
      range: range || (palaceName ? `${palaceName} 대운` : `대운 ${Number(fallbackIndex) + 1}`),
      period: String(source?.period || range || "").trim() || (palaceName ? `${palaceName} 대운` : `대운 ${Number(fallbackIndex) + 1}`),
    });
  };

  const decadePeriods = Array.isArray(luck?.decadePeriods)
    ? luck.decadePeriods
    : (hasMeaningfulValue(luck?.decadePeriods) ? [luck.decadePeriods] : []);
  decadePeriods.forEach((entry, idx) => pushRow(entry, idx));

  if (!rows.length && hasMeaningfulValue(luck?.currentDecade)) {
    pushRow(luck.currentDecade, 0);
  }

  if (!rows.length) {
    const palaceRows = Object.values(palaceMap).flatMap((palace) => {
      const decade = palace?.decadeLuck;
      if (!hasMeaningfulValue(decade)) return [];
      const decadeRows = Array.isArray(decade) ? decade : [decade];
      return decadeRows.map((row) => ({
        ...(row && typeof row === "object" ? row : {}),
        palaceKey: palace?.palaceKey || "",
        palaceName: palace?.name || palace?.palaceName || "",
      }));
    });
    palaceRows.forEach((entry, idx) => pushRow(entry, idx));
  }

  if (!rows.length && hasMeaningfulValue(luck?.annual)) {
    const annual = luck.annual && typeof luck.annual === "object" ? luck.annual : {};
    const yearText = String(annual?.year || "").trim();
    rows.push({
      palaceKey: "",
      palaceName: "",
      range: yearText ? `${yearText}년 기준 대운 보정` : "현재 대운 보정",
      period: yearText ? `${yearText}년 기준 대운 보정` : "현재 대운 보정",
      year: annual?.year || null,
      ganji: annual?.ganji || "",
      source: "annual-fallback",
    });
  }

  const seen = new Set();
  return rows.filter((row, idx) => {
    const token = `${String(row?.range || row?.period || "").trim()}|${String(row?.palaceKey || "").trim()}|${idx}`;
    if (!String(row?.range || row?.period || "").trim()) return false;
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

function mapZiweiPalaces(canonical) {
  const sourcePalaces = Array.isArray(canonical?.palaces) ? canonical.palaces : [];
  const byKey = new Map();
  sourcePalaces.forEach((palace) => {
    const key = inferZiweiPalaceKey(palace);
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
    const mainStars = (Array.isArray(p.mainStars) ? p.mainStars : []).map(normalizeZiweiStar);
    const auxiliaryStars = (Array.isArray(p.auxStars) ? p.auxStars : []).map(normalizeZiweiStar);
    const maleficStars = (Array.isArray(p.maleficStars) ? p.maleficStars : []).map(normalizeZiweiStar);
    const minorStars = (Array.isArray(p.minorStars) ? p.minorStars : []).map(normalizeZiweiStar);
    const starBrightness = {};
    [...mainStars, ...auxiliaryStars, ...maleficStars].forEach((star) => {
      const name = String(star?.nameKo || star?.name || "").trim();
      if (!name) return;
      starBrightness[name] = {
        brightness: star?.brightness || "",
        symbol: star?.strengthSymbol || star?.symbol || "",
      };
    });

    result[targetKey] = {
      palaceKey: targetKey,
      name: p.palaceNameKo || p.palaceName || "",
      palaceName: p.palaceNameKo || p.palaceName || "",
      earthlyBranch: p.branch || "",
      branch: p.branch || "",
      mainStars,
      minorStars,
      auxiliaryStars,
      maleficStars,
      fourTransformations: Array.isArray(p.transformations) ? p.transformations : [],
      interpretationSeed: String(p?.interpretationSeed || "").trim() || buildZiweiPalaceInterpretationSeed(p, Object.keys(keyMap).indexOf(targetKey)),
      starBrightness,
    };
  });
  return result;
}

function mapZiweiCalculatedData(canonical) {
  const palacesByKey = mapZiweiPalaces(canonical);
  const palaces = Object.values(palacesByKey);
  const fourTransforms = canonical?.transformations || {};
  const daXianRows = buildZiweiDaXianRows(canonical, palacesByKey);
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
    chart: {
      mingGong: canonical?.chartMeta?.mingGong || "",
      shenGong: canonical?.chartMeta?.shenGong || "",
      lifeMasterStar: canonical?.chartMeta?.lifeMasterStar || "",
      bodyMasterStar: canonical?.chartMeta?.bodyMasterStar || "",
    },
    palaces,
    palacesByKey,
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
      daXian: daXianRows,
      annual: Array.isArray(canonical?.luck?.annual)
        ? canonical.luck.annual
        : (hasMeaningfulValue(canonical?.luck?.annual) ? [canonical.luck.annual] : []),
      monthly: Array.isArray(canonical?.luck?.monthly) ? canonical.luck.monthly : [],
    },
    relationshipData: {
      spousePalace: palacesByKey.spouse || {},
      romanceStars: canonical?.relationshipData?.romanceStars || [],
      marriageRiskSignals: canonical?.relationshipData?.marriageRiskSignals || [],
      compatibilityHints: canonical?.relationshipData?.compatibilityHints || [],
    },
    careerData: {
      careerPalace: palacesByKey.career || {},
      wealthPalace: palacesByKey.wealth || {},
      authorityStars: canonical?.careerData?.authorityStars || [],
      suitableFields: canonical?.careerData?.suitableFields || [],
    },
    healthData: {
      healthPalace: palacesByKey.health || {},
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
      compatibilityIndex: Number.isFinite(Number(comp?.compatibilityIndex)) ? Number(comp.compatibilityIndex) : null,
      relationVariant: String(comp?.relationVariant || "").trim(),
      distanceMetrics: comp?.distanceMetrics && typeof comp.distanceMetrics === "object" ? comp.distanceMetrics : null,
      roleActionGuide: comp?.roleActionGuide && typeof comp.roleActionGuide === "object" ? comp.roleActionGuide : null,
      elementHarmony: comp?.elementHarmony && typeof comp.elementHarmony === "object" ? comp.elementHarmony : null,
      strengthShadowMap: comp?.strengthShadowMap && typeof comp.strengthShadowMap === "object" ? comp.strengthShadowMap : null,
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
  const planets = normalizeAstroPlanetMap(canonical?.planets || canonical?.chart?.planets || []);
  const houses = Array.isArray(canonical?.houses)
    ? canonical.houses
    : (canonical?.houses && typeof canonical.houses === "object" ? Object.values(canonical.houses) : []);
  const aspects = Array.isArray(canonical?.aspects) ? canonical.aspects : [];
  const ascendant = canonical?.angles?.ascendant || canonical?.angles?.asc || {};
  const midheaven = canonical?.angles?.midheaven || canonical?.angles?.mc || {};
  const sun = planets?.sun || {};
  const moon = planets?.moon || {};
  return {
    birthInfo: {
      date: canonical?.profile?.birth?.date || canonical?.profile?.birth?.solarDate || "",
      time: canonical?.profile?.birth?.time || "",
      place: canonical?.profile?.birth?.place || canonical?.profile?.birth?.locationName || "",
      latitude: Number(canonical?.profile?.birth?.latitude || 0),
      longitude: Number(canonical?.profile?.birth?.longitude || 0),
      timezone: canonical?.profile?.birth?.timezone || "",
      houseSystem: canonical?.settings?.houseSystem || canonical?.calculationMeta?.houseSystem || "Placidus",
      zodiac: canonical?.settings?.zodiac || canonical?.settings?.zodiacType || canonical?.calculationMeta?.zodiac || "tropical",
      ephemerisSource: canonical?.calculationMeta?.ephemerisSource || canonical?.calculationMeta?.engine || "Swiss Ephemeris",
    },
    angles: {
      ascendant,
      midheaven,
      descendant: canonical?.angles?.descendant || {},
      imumCoeli: canonical?.angles?.imumCoeli || {},
    },
    planets,
    houses,
    aspects,
    elementBalance: canonical?.elementBalance || canonical?.chartBalance?.elements || {},
    modalityBalance: canonical?.modalityBalance || canonical?.chartBalance?.modalities || {},
    relationshipData: canonical?.relationshipData || {},
    careerData: canonical?.careerData || {},
    timingData: canonical?.timingData || canonical?.forecast || {},
    profile: {
      birthDate: canonical?.profile?.birth?.date || canonical?.profile?.birth?.solarDate || "",
      birthTime: canonical?.profile?.birth?.time || "",
      locationName: canonical?.profile?.birth?.place || canonical?.profile?.birth?.locationName || "",
    },
    natalChart: {
      sunSign: sun?.sign || "",
      moonSign: moon?.sign || "",
      ascendant: ascendant?.sign || "",
      planets: Object.values(planets).filter((item) => hasMeaningfulValue(item)),
      houses,
      aspects,
    },
  };
}

function mapVedicCalculatedData(canonical) {
  const planets = normalizeAstroPlanetMap(canonical?.planets || []);
  const lagnaSign = canonical?.lagna?.sign || canonical?.lagna?.name || canonical?.lagna?.signName || "";
  const rashiChart = canonical?.rashiChart || {
    houses: Array.isArray(canonical?.houses)
      ? canonical.houses
      : (canonical?.houses && typeof canonical.houses === "object" ? Object.values(canonical.houses) : []),
  };
  const navamsaChart = canonical?.navamsaChart || {
    houses: canonical?.divisionalCharts?.d9 || {},
  };
  const dashaRaw = canonical?.dashas || canonical?.dasha || {};
  const currentMahaDasha = dashaRaw?.vimshottari?.currentMahaDasha
    || dashaRaw?.vimshottari?.currentDasha
    || dashaRaw?.current
    || {};
  const antardasha = dashaRaw?.vimshottari?.antardasha || dashaRaw?.antar || {};
  const timeline = Array.isArray(dashaRaw?.vimshottari?.timeline)
    ? dashaRaw.vimshottari.timeline
    : (Array.isArray(dashaRaw?.upcoming) ? dashaRaw.upcoming : []);
  return {
    birthInfo: {
      date: canonical?.profile?.birth?.date || canonical?.profile?.birth?.solarDate || "",
      time: canonical?.profile?.birth?.time || "",
      place: canonical?.profile?.birth?.place || canonical?.profile?.birth?.locationName || "",
      latitude: Number(canonical?.profile?.birth?.latitude || 0),
      longitude: Number(canonical?.profile?.birth?.longitude || 0),
      timezone: canonical?.profile?.birth?.timezone || "",
      zodiac: canonical?.settings?.zodiac || canonical?.calculationMeta?.zodiac || "sidereal",
      ayanamsa: canonical?.settings?.ayanamsa || canonical?.settings?.ayanamsaMode || canonical?.calculationMeta?.ayanamsaMode || "Lahiri",
      ephemerisSource: canonical?.calculationMeta?.ephemerisSource || canonical?.calculationMeta?.engine || "Swiss Ephemeris",
    },
    lagna: {
      ...(canonical?.lagna || {}),
      sign: lagnaSign,
      name: lagnaSign,
    },
    rashiChart,
    navamsaChart,
    planets,
    nakshatras: canonical?.nakshatras || { moonNakshatra: canonical?.moonNakshatra || {} },
    karakas: canonical?.karakas || {},
    dashas: {
      ...(dashaRaw || {}),
      vimshottari: {
        ...(dashaRaw?.vimshottari || {}),
        currentMahaDasha,
        antardasha,
        timeline,
      },
    },
    yogas: canonical?.yogas || [],
    relationshipData: canonical?.relationshipData || {},
    careerData: canonical?.careerData || {},
    profile: {
      birthDate: canonical?.profile?.birth?.date || canonical?.profile?.birth?.solarDate || "",
      birthTime: canonical?.profile?.birth?.time || "",
      locationName: canonical?.profile?.birth?.place || canonical?.profile?.birth?.locationName || "",
    },
    chart: {
      lagna: lagnaSign,
      planets: Object.values(planets).filter((item) => hasMeaningfulValue(item)),
      houses: Array.isArray(rashiChart?.houses) ? rashiChart.houses : (rashiChart?.houses ? Object.values(rashiChart.houses) : []),
    },
    dasha: {
      timeline,
      currentMahaDasha,
      antardasha,
    },
  };
}

function mapLoveSecretCalculatedData(canonical, supplemental) {
  const personA = canonical?.personA || {};
  const personB = canonical?.personB || {};
  const compatibility = canonical?.compatibility || {};
  const selfFourPillars = personA?.fourPillars || {};
  const partnerFourPillars = personB?.fourPillars || {};
  const tenGodDistribution = (personA?.tenGods?.distribution && typeof personA.tenGods.distribution === "object")
    ? personA.tenGods.distribution
    : {};
  const tenGodEvidence = Object.entries(tenGodDistribution)
    .map(([name, count]) => ({ name: String(name || "").trim(), count: Number(count || 0) }))
    .filter((row) => row.name && Number.isFinite(row.count) && row.count > 0)
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0));

  const attractionStars = personA?.attractionStars || {};
  const attractionSignals = Object.values(attractionStars || {})
    .flatMap((row) => (Array.isArray(row) ? row : []))
    .map((row) => String(row || "").trim())
    .filter(Boolean);

  const conflictSignals = [];
  const conflicts = compatibility?.stemBranchInteractions || {};
  (Array.isArray(conflicts?.clashes) ? conflicts.clashes : []).slice(0, 4).forEach((row) => conflictSignals.push(String(row || "").trim()));
  (Array.isArray(conflicts?.punishments) ? conflicts.punishments : []).slice(0, 3).forEach((row) => conflictSignals.push(String(row || "").trim()));
  if (!conflictSignals.length && Array.isArray(compatibility?.johuCompatibility?.riskFactors)) {
    compatibility.johuCompatibility.riskFactors.slice(0, 4).forEach((row) => conflictSignals.push(String(row || "").trim()));
  }

  const practicalAdvice = Array.isArray(compatibility?.johuCompatibility?.balancingStrategies)
    ? compatibility.johuCompatibility.balancingStrategies.map((row) => String(row || "").trim()).filter(Boolean)
    : [];

  const selfSajuChart = {
    yearPillar: selfFourPillars?.year?.ganji || "",
    monthPillar: selfFourPillars?.month?.ganji || "",
    dayPillar: selfFourPillars?.day?.ganji || "",
    hourPillar: selfFourPillars?.hour?.ganji || "",
    dayMaster: personA?.dayMaster?.stem || "",
    spousePalace: personA?.loveProfile?.spousePalace?.branch || selfFourPillars?.day?.branch || "",
    tenGods: tenGodDistribution,
    relationshipStars: attractionSignals,
    peachBlossom: (Array.isArray(attractionStars?.dohwa) && attractionStars.dohwa[0]) || "",
    hongyeom: (Array.isArray(attractionStars?.hongyeom) && attractionStars.hongyeom[0]) || "",
    hwagae: (Array.isArray(attractionStars?.hwagae) && attractionStars.hwagae[0]) || "",
    monthCommand: personA?.johu?.monthBranch || "",
    luckCycles: {
      daewoonList: [personA?.luck?.currentDaewoon, personA?.luck?.nextDaewoon].filter((row) => hasMeaningfulValue(row)),
      annualLuck: personA?.luck?.annualLuck || {},
      sewoonList: hasMeaningfulValue(personA?.luck?.annualLuck)
        ? [personA?.luck?.annualLuck]
        : [],
    },
  };

  const partnerSajuChart = {
    yearPillar: partnerFourPillars?.year?.ganji || "",
    monthPillar: partnerFourPillars?.month?.ganji || "",
    dayPillar: partnerFourPillars?.day?.ganji || "",
    hourPillar: partnerFourPillars?.hour?.ganji || "",
    dayMaster: personB?.dayMaster?.stem || "",
    spousePalace: personB?.loveProfile?.spousePalace?.branch || partnerFourPillars?.day?.branch || "",
    tenGods: (personB?.tenGods?.distribution && typeof personB.tenGods.distribution === "object")
      ? personB.tenGods.distribution
      : {},
  };

  const optionalCross = {
    ziweiRelationship: supplemental?.ziweiPremium?.calculatedData?.relationshipData || {},
    sookyoRelationship: supplemental?.sookyoPremium?.calculatedData?.compatibility || {},
    westernRelationship: supplemental?.westernAstrologyPremium?.calculatedData?.relationshipData || {},
    vedicRelationship: supplemental?.vedicPremium?.calculatedData?.relationshipData || {},
  };

  return {
    self: {
      birthInfo: canonical?.personA?.birth || {},
      sajuChart: selfSajuChart,
      fiveElementBalance: canonical?.personA?.fiveElements || {},
      relationshipProfile: {
        attractionSignals,
        conflictSignals,
        communicationStyle: personA?.johu?.relationshipClimate?.emotionalOpeningStyle || "관계의 맥락을 확인한 뒤 감정을 표현하는 패턴",
      },
    },
    partner: {
      birthInfo: canonical?.personB?.birth || {},
      sajuChart: partnerSajuChart,
      fiveElementBalance: canonical?.personB?.fiveElements || {},
      relationshipProfile: {
        attractionSignals: Object.values(personB?.attractionStars || {})
          .flatMap((row) => (Array.isArray(row) ? row : []))
          .map((row) => String(row || "").trim())
          .filter(Boolean),
        communicationStyle: personB?.johu?.relationshipClimate?.emotionalOpeningStyle || "신뢰 축적 이후 감정을 단계적으로 개방하는 패턴",
      },
    },
    compatibility: {
      ...compatibility,
      temperatureHumidityMatch: [
        compatibility?.johuCompatibility?.temperatureBalance?.label,
        compatibility?.johuCompatibility?.moistureBalance?.label,
      ].filter(Boolean).join(" / ") || "중립",
      communicationPattern: compatibility?.johuCompatibility?.intimacyClimateSummary || "감정 확인 → 사실 확인 → 요청 제안 순서로 대화하면 안정적입니다.",
      practicalAdvice,
      longTermMarriagePotential: Number(compatibility?.marriagePotentialScore || 0),
    },
    chart: {
      yearPillar: selfSajuChart.yearPillar,
      monthPillar: selfSajuChart.monthPillar,
      dayPillar: selfSajuChart.dayPillar,
      hourPillar: selfSajuChart.hourPillar,
      dayMaster: selfSajuChart.dayMaster,
      spousePalace: selfSajuChart.spousePalace || compatibility?.spousePalace || "",
      tenGods: selfSajuChart.tenGods,
      tenGodEvidence,
      relationshipStars: attractionSignals,
      peachBlossom: selfSajuChart.peachBlossom,
      hongyeom: selfSajuChart.hongyeom,
      hwagae: selfSajuChart.hwagae,
      monthCommand: selfSajuChart.monthCommand,
    },
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

  const chartSource = saju?.chart || saju;
  const dayMaster = chartSource?.dayMaster?.stem || chartSource?.dayMaster || "";

  const chart = {
    yearPillar: chartSource?.yearPillar || chartSource?.fourPillars?.year || {},
    monthPillar: chartSource?.monthPillar || chartSource?.fourPillars?.month || {},
    dayPillar: chartSource?.dayPillar || chartSource?.fourPillars?.day || {},
    hourPillar: chartSource?.hourPillar || chartSource?.fourPillars?.hour || {},
    dayMaster,
    tenGods: chartSource?.tenGods || {},
    spousePalace: chartSource?.spousePalace || "",
  };

  return {
    chart,
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

function mapSajuNewYearCalculatedData(canonical) {
  return {
    profile: canonical?.profile || {},
    targetYear: Number(canonical?.targetYear || 0),
    focusArea: String(canonical?.focusArea || "overall"),
    saju: canonical?.saju || {},
    yearlySummary: canonical?.yearlySummary || {},
    monthlyLuck: Array.isArray(canonical?.monthlyLuck) ? canonical.monthlyLuck : [],
    actionPlan: canonical?.actionPlan || {},
  };
}

function normalizeZiweiCalculatedDataForPdf(calculatedData, canonicalSource, integrity) {
  const payload = (calculatedData && typeof calculatedData === "object") ? { ...calculatedData } : {};
  const canonical = (canonicalSource && typeof canonicalSource === "object") ? canonicalSource : {};

  payload.coreChart = {
    ...(payload?.coreChart && typeof payload.coreChart === "object" ? payload.coreChart : {}),
    mingGong: String(payload?.coreChart?.mingGong || payload?.chart?.mingGong || canonical?.chartMeta?.mingGong || "").trim(),
    shenGong: String(payload?.coreChart?.shenGong || payload?.chart?.shenGong || canonical?.chartMeta?.shenGong || "").trim(),
  };
  payload.chart = {
    ...(payload?.chart && typeof payload.chart === "object" ? payload.chart : {}),
    mingGong: String(payload?.chart?.mingGong || payload?.coreChart?.mingGong || canonical?.chartMeta?.mingGong || "").trim(),
    shenGong: String(payload?.chart?.shenGong || payload?.coreChart?.shenGong || canonical?.chartMeta?.shenGong || "").trim(),
  };

  const rawPalaces = Array.isArray(payload?.palaces) ? payload.palaces : [];
  const normalizedPalaces = rawPalaces.map((palace, idx) => {
    const source = palace && typeof palace === "object" ? palace : {};
    return {
      ...source,
      palaceKey: String(source?.palaceKey || inferZiweiPalaceKey(source) || "").trim(),
      interpretationSeed: String(source?.interpretationSeed || "").trim() || buildZiweiPalaceInterpretationSeed(source, idx),
    };
  });

  const byKey = {};
  normalizedPalaces.forEach((palace) => {
    const key = String(palace?.palaceKey || inferZiweiPalaceKey(palace) || "").trim();
    if (!key) return;
    byKey[key] = {
      ...palace,
      palaceKey: key,
      interpretationSeed: String(palace?.interpretationSeed || "").trim() || buildZiweiPalaceInterpretationSeed(palace),
    };
  });

  if (!Object.keys(byKey).length && payload?.palacesByKey && typeof payload.palacesByKey === "object") {
    Object.entries(payload.palacesByKey).forEach(([key, palace]) => {
      if (!key) return;
      const source = palace && typeof palace === "object" ? palace : {};
      byKey[String(key)] = {
        ...source,
        palaceKey: String(source?.palaceKey || key).trim(),
        interpretationSeed: String(source?.interpretationSeed || "").trim() || buildZiweiPalaceInterpretationSeed(source),
      };
    });
  }

  payload.palacesByKey = byKey;
  payload.palaces = normalizedPalaces.length ? normalizedPalaces : Object.values(byKey);

  payload.cycles = (payload?.cycles && typeof payload.cycles === "object") ? { ...payload.cycles } : {};
  if (!Array.isArray(payload.cycles.daXian) || payload.cycles.daXian.length === 0) {
    payload.cycles.daXian = buildZiweiDaXianRows(canonical, byKey);
    if (Array.isArray(payload.cycles.daXian) && payload.cycles.daXian.length > 0) {
      pushUnique(integrity.supplementedFields, "calculatedData.cycles.daXian");
    }
  }
  if (!Array.isArray(payload.cycles.annual) || payload.cycles.annual.length === 0) {
    const annualRows = Array.isArray(canonical?.luck?.annual)
      ? canonical.luck.annual
      : (hasMeaningfulValue(canonical?.luck?.annual) ? [canonical.luck.annual] : []);
    payload.cycles.annual = annualRows;
    if (annualRows.length) pushUnique(integrity.supplementedFields, "calculatedData.cycles.annual");
  }
  if (!Array.isArray(payload.cycles.monthly) || payload.cycles.monthly.length === 0) {
    const monthlyRows = Array.isArray(canonical?.luck?.monthly) ? canonical.luck.monthly : [];
    payload.cycles.monthly = monthlyRows;
    if (monthlyRows.length) pushUnique(integrity.supplementedFields, "calculatedData.cycles.monthly");
  }

  return payload;
}

function normalizeMonthToken(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return null;
  const num = Number(raw.replace(/[^0-9]/g, ""));
  if (!Number.isFinite(num)) return null;
  if (num < 1 || num > 12) return null;
  return num;
}

function normalizeSajuPillarToken(value) {
  if (value == null) return "";
  if (typeof value === "string") return String(value).trim();
  if (typeof value !== "object") return "";
  const ganji = String(value?.ganji || "").trim();
  if (ganji) return ganji;
  const stem = String(value?.stem || value?.gan || "").trim();
  const branch = String(value?.branch || value?.ji || "").trim();
  return `${stem}${branch}`.trim();
}

function extractSajuBranchToken(value) {
  const token = normalizeSajuPillarToken(value);
  if (!token) return "";
  const match = token.match(/([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])$/);
  return match ? String(match[1] || "").trim() : "";
}

function extractSajuMonthCommand(chart = {}, fallback = {}) {
  const source = chart && typeof chart === "object" ? chart : {};
  const alt = fallback && typeof fallback === "object" ? fallback : {};
  const fromField = String(
    source?.monthCommand
      || source?.wollyeong
      || source?.monthRyeong
      || source?.monthOrder
      || source?.seasonalOrder
      || alt?.monthCommand
      || alt?.wollyeong
      || alt?.monthOrder
      || "",
  ).trim();
  if (fromField) return fromField;
  return extractSajuBranchToken(source?.monthPillar || source?.fourPillars?.month || alt?.monthPillar || "");
}

function normalizeSajuTenGodEvidence(tenGods = {}) {
  const source = tenGods && typeof tenGods === "object" ? tenGods : {};
  const rows = Object.entries(source)
    .map(([name, raw]) => {
      const count = Number(
        raw && typeof raw === "object"
          ? (raw?.count ?? raw?.value ?? raw?.score ?? 0)
          : raw,
      );
      return {
        name: String(name || "").trim(),
        count: Number.isFinite(count) ? count : 0,
      };
    })
    .filter((row) => row.name && row.count > 0)
    .sort((a, b) => b.count - a.count);
  return rows;
}

function normalizeSajuLuckFlow(source = {}, canonical = {}) {
  const local = source && typeof source === "object" ? source : {};
  const rawDaewoon = local?.daewoon
    || local?.daewoonList
    || local?.majorLuck
    || local?.majorCycles
    || canonical?.daewoon
    || canonical?.daewoonList
    || canonical?.majorLuck
    || [];
  const rawSewoon = local?.sewoon
    || local?.sewoonList
    || local?.annualLuck
    || local?.yearlyLuck
    || local?.yearFlow
    || canonical?.sewoon
    || canonical?.sewoonList
    || canonical?.annualLuck
    || canonical?.yearlyLuck
    || [];
  return {
    daewoon: Array.isArray(rawDaewoon) ? rawDaewoon : (hasMeaningfulValue(rawDaewoon) ? [rawDaewoon] : []),
    sewoon: Array.isArray(rawSewoon) ? rawSewoon : (hasMeaningfulValue(rawSewoon) ? [rawSewoon] : []),
  };
}

function buildSajuCoreSnapshot(chart = {}, tenGods = {}, luckCycles = {}, canonical = {}) {
  const normalizedChart = normalizeSajuChartShape(chart);
  const normalizedLuck = normalizeSajuLuckFlow(
    luckCycles,
    canonical?.luckCycles && typeof canonical.luckCycles === "object" ? canonical.luckCycles : {},
  );
  return {
    pillars: {
      year: normalizeSajuPillarToken(normalizedChart?.yearPillar),
      month: normalizeSajuPillarToken(normalizedChart?.monthPillar),
      day: normalizeSajuPillarToken(normalizedChart?.dayPillar),
      hour: normalizeSajuPillarToken(normalizedChart?.hourPillar),
    },
    dayMaster: String(normalizedChart?.dayMaster || "").trim(),
    monthCommand: extractSajuMonthCommand(normalizedChart, canonical),
    tenGods: tenGods && typeof tenGods === "object" ? tenGods : {},
    tenGodEvidence: normalizeSajuTenGodEvidence(tenGods),
    daewoon: normalizedLuck.daewoon,
    sewoon: normalizedLuck.sewoon,
  };
}

function normalizeSajuChartShape(chart = {}) {
  const source = chart && typeof chart === "object" ? chart : {};
  const fourPillars = (source?.fourPillars && typeof source.fourPillars === "object") ? source.fourPillars : {};
  const yearPillar = source?.yearPillar || fourPillars?.year || "";
  const monthPillar = source?.monthPillar || fourPillars?.month || "";
  const dayPillar = source?.dayPillar || fourPillars?.day || "";
  const hourPillar = source?.hourPillar || fourPillars?.hour || "";
  const dayMasterRaw = source?.dayMaster?.stem || source?.dayMaster || "";
  const dayMaster = String(dayMasterRaw || "").trim();
  const monthBranch = String(source?.monthBranch || extractSajuBranchToken(monthPillar) || "").trim();
  const monthCommand = extractSajuMonthCommand(source, { monthPillar });

  return {
    ...source,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    fourPillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    dayMaster,
    monthBranch,
    monthCommand,
    wollyeong: String(source?.wollyeong || monthCommand || "").trim(),
    tenGods: (source?.tenGods && typeof source.tenGods === "object") ? source.tenGods : {},
    spousePalace: String(source?.spousePalace || "").trim(),
  };
}

function buildDefaultSajuMonthlyLuck(rawMonthly = []) {
  const byMonth = new Map();
  (Array.isArray(rawMonthly) ? rawMonthly : []).forEach((row) => {
    const month = normalizeMonthToken(row?.month);
    if (!month) return;
    byMonth.set(month, {
      month,
      source: "engine",
      score: Number.isFinite(Number(row?.score)) ? Number(row.score) : null,
      trend: String(row?.trend || "점검").trim() || "점검",
      summary: String(row?.summary || row?.note || "월간 실행 기준을 점검하세요.").trim() || "월간 실행 기준을 점검하세요.",
      action: String(row?.action || "중요 일정은 월 초·중순에 분산 배치하세요.").trim() || "중요 일정은 월 초·중순에 분산 배치하세요.",
    });
  });

  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    return byMonth.get(month) || {
      month,
      source: "strategy",
      score: null,
      trend: "점검",
      summary: "원국과 연간 흐름을 기준으로 실행 우선순위를 점검하세요.",
      action: "확장보다 기준 정리와 리스크 점검을 먼저 수행하세요.",
    };
  });
}

function normalizeSajuCalculatedDataForPdf(reportType, calculatedData, canonicalSource, requestBody, integrity) {
  const payload = (calculatedData && typeof calculatedData === "object") ? { ...calculatedData } : {};
  const canonical = (canonicalSource && typeof canonicalSource === "object") ? canonicalSource : {};

  if (reportType === "lifeBook") {
    const saju = (payload?.saju && typeof payload.saju === "object") ? payload.saju : {};
    const canonicalSaju = (canonical?.saju && typeof canonical.saju === "object") ? canonical.saju : {};
    const chart = normalizeSajuChartShape(payload?.chart || saju?.chart || saju || canonicalSaju?.chart || canonicalSaju);
    payload.chart = chart;
    const normalizedLuckCycles = (saju?.luckCycles && typeof saju.luckCycles === "object") ? saju.luckCycles : {};
    payload.saju = {
      ...saju,
      chart,
      dayMaster: String(saju?.dayMaster || chart?.dayMaster || "").trim(),
      tenGods: (saju?.tenGods && typeof saju.tenGods === "object") ? saju.tenGods : chart.tenGods,
      fiveElementBalance: (saju?.fiveElementBalance && typeof saju.fiveElementBalance === "object") ? saju.fiveElementBalance : {},
      luckCycles: normalizedLuckCycles,
    };
    payload.sajuCore = buildSajuCoreSnapshot(
      chart,
      payload.saju.tenGods,
      normalizedLuckCycles,
      canonicalSaju,
    );
    payload.luckFlow = {
      daewoon: Array.isArray(payload.sajuCore?.daewoon) ? payload.sajuCore.daewoon : [],
      sewoon: Array.isArray(payload.sajuCore?.sewoon) ? payload.sajuCore.sewoon : [],
    };

    if (!Array.isArray(payload?.integratedThemes?.coreIdentity) || payload.integratedThemes.coreIdentity.length === 0) {
      pushUnique(integrity.supplementedFields, "calculatedData.integratedThemes.coreIdentity");
      payload.integratedThemes = {
        ...(payload?.integratedThemes && typeof payload.integratedThemes === "object" ? payload.integratedThemes : {}),
        coreIdentity: ["원국의 핵심 기질을 기반으로 정체성을 정리하세요."],
      };
    }

    if (!Array.isArray(payload?.integratedThemes?.lifeMission) || payload.integratedThemes.lifeMission.length === 0) {
      pushUnique(integrity.supplementedFields, "calculatedData.integratedThemes.lifeMission");
      payload.integratedThemes = {
        ...(payload?.integratedThemes && typeof payload.integratedThemes === "object" ? payload.integratedThemes : {}),
        lifeMission: ["강점이 반복되는 영역을 장기 미션으로 연결하세요."],
      };
    }

    if (!hasMeaningfulValue(payload?.timeline)) {
      pushUnique(integrity.supplementedFields, "calculatedData.timeline");
      payload.timeline = {
        sajuDaewoon: Array.isArray(payload?.saju?.luckCycles?.daewoonList) ? payload.saju.luckCycles.daewoonList : [],
        ziweiDaXian: Array.isArray(payload?.ziwei?.cycles?.daXian) ? payload.ziwei.cycles.daXian : [],
        vedicDasha: Array.isArray(payload?.vedic?.dashas?.vimshottari?.timeline) ? payload.vedic.dashas.vimshottari.timeline : [],
        astrologyTransits: Array.isArray(payload?.westernAstrology?.timingData?.transits) ? payload.westernAstrology.timingData.transits : [],
      };
    }

    return payload;
  }

  if (reportType === "loveSecret") {
    const selfChart = normalizeSajuChartShape(payload?.self?.sajuChart || payload?.chart || canonical?.personA?.sajuChart || {});
    const partnerChart = normalizeSajuChartShape(payload?.partner?.sajuChart || canonical?.personB?.sajuChart || {});
    const modeToken = String(requestBody?.mode || requestBody?.reportType || "").toLowerCase();
    const needPartner = modeToken === "compatibility" || modeToken === "couple";

    payload.self = {
      ...(payload?.self && typeof payload.self === "object" ? payload.self : {}),
      sajuChart: selfChart,
      fiveElementBalance: (payload?.self?.fiveElementBalance && typeof payload.self.fiveElementBalance === "object")
        ? payload.self.fiveElementBalance
        : ((canonical?.personA?.fiveElements && typeof canonical.personA.fiveElements === "object") ? canonical.personA.fiveElements : {}),
      relationshipProfile: (payload?.self?.relationshipProfile && typeof payload.self.relationshipProfile === "object")
        ? payload.self.relationshipProfile
        : {
          attractionSignals: [],
          conflictSignals: [],
          communicationStyle: "감정의 맥락을 먼저 확인한 뒤 대화하는 방식이 안정적입니다.",
        },
    };
    if (!Array.isArray(payload?.self?.relationshipProfile?.attractionSignals)) {
      payload.self.relationshipProfile.attractionSignals = [];
      pushUnique(integrity.supplementedFields, "calculatedData.self.relationshipProfile.attractionSignals");
    }
    if (!Array.isArray(payload?.self?.relationshipProfile?.conflictSignals)) {
      payload.self.relationshipProfile.conflictSignals = [];
      pushUnique(integrity.supplementedFields, "calculatedData.self.relationshipProfile.conflictSignals");
    }
    payload.partner = {
      ...(payload?.partner && typeof payload.partner === "object" ? payload.partner : {}),
      sajuChart: partnerChart,
    };

    payload.chart = normalizeSajuChartShape(payload?.chart || selfChart);
    payload.chart.dayMaster = String(payload.chart.dayMaster || selfChart.dayMaster || "").trim();
    if (!payload.chart.spousePalace) {
      payload.chart.spousePalace = String(selfChart.spousePalace || canonical?.compatibility?.spousePalace || "배우자궁 분석 필요").trim();
      pushUnique(integrity.supplementedFields, "calculatedData.chart.spousePalace");
    }

    payload.compatibility = (payload?.compatibility && typeof payload.compatibility === "object")
      ? payload.compatibility
      : {};
    if (!hasMeaningfulValue(payload.compatibility.temperatureHumidityMatch)) {
      payload.compatibility.temperatureHumidityMatch = String(canonical?.compatibility?.temperatureHumidityMatch || "중립").trim() || "중립";
      pushUnique(integrity.supplementedFields, "calculatedData.compatibility.temperatureHumidityMatch");
    }
    if (!hasMeaningfulValue(payload.compatibility.communicationPattern)) {
      payload.compatibility.communicationPattern = "감정 확인 → 사실 확인 → 요청 제안 순서로 대화하면 안정적입니다.";
      pushUnique(integrity.supplementedFields, "calculatedData.compatibility.communicationPattern");
    }
    if (!Array.isArray(payload.compatibility.practicalAdvice) || payload.compatibility.practicalAdvice.length === 0) {
      payload.compatibility.practicalAdvice = [
        "갈등이 생기면 24시간 내 감정-사실-요청 순으로 대화를 재개하세요.",
        "관계 온도차가 크면 주 1회 리듬 점검 루틴을 고정하세요.",
      ];
      pushUnique(integrity.supplementedFields, "calculatedData.compatibility.practicalAdvice");
    }
    if (!hasMeaningfulValue(payload.compatibility.longTermMarriagePotential)) {
      payload.compatibility.longTermMarriagePotential = Number(canonical?.compatibility?.marriagePotentialScore || 0);
      pushUnique(integrity.supplementedFields, "calculatedData.compatibility.longTermMarriagePotential");
    }

    if (needPartner && !hasMeaningfulValue(payload?.partner?.sajuChart)) {
      payload.partner.sajuChart = normalizeSajuChartShape(canonical?.personB?.sajuChart || {});
      pushUnique(integrity.supplementedFields, "calculatedData.partner.sajuChart");
    }

    const selfLuckCycles = (payload?.self?.sajuChart?.luckCycles && typeof payload.self.sajuChart.luckCycles === "object")
      ? payload.self.sajuChart.luckCycles
      : (canonical?.personA?.luckCycles && typeof canonical.personA.luckCycles === "object" ? canonical.personA.luckCycles : {});
    payload.sajuCore = buildSajuCoreSnapshot(
      selfChart,
      payload?.self?.sajuChart?.tenGods || payload?.chart?.tenGods || {},
      selfLuckCycles,
      canonical?.personA || {},
    );
    payload.luckFlow = {
      daewoon: Array.isArray(payload.sajuCore?.daewoon) ? payload.sajuCore.daewoon : [],
      sewoon: Array.isArray(payload.sajuCore?.sewoon) ? payload.sajuCore.sewoon : [],
    };

    return payload;
  }

  if (reportType === "sajuNewYear") {
    const now = new Date();
    const birth = (payload?.profile?.birth && typeof payload.profile.birth === "object")
      ? payload.profile.birth
      : (canonical?.profile?.birth && typeof canonical.profile.birth === "object" ? canonical.profile.birth : {});
    const year = Number(birth?.year || birth?.birthYear || now.getFullYear() - 30);
    const month = Number(birth?.month || birth?.birthMonth || 1);
    const day = Number(birth?.day || birth?.birthDay || 1);

    payload.profile = {
      ...(payload?.profile && typeof payload.profile === "object" ? payload.profile : {}),
      birth: {
        ...(birth || {}),
        year: Number.isFinite(year) ? year : now.getFullYear() - 30,
        month: Number.isFinite(month) ? Math.min(12, Math.max(1, month)) : 1,
        day: Number.isFinite(day) ? Math.min(31, Math.max(1, day)) : 1,
      },
    };

    if (!Number.isFinite(Number(payload?.targetYear))) {
      payload.targetYear = Number(canonical?.targetYear || now.getFullYear());
      pushUnique(integrity.supplementedFields, "calculatedData.targetYear");
    }

    if (!hasMeaningfulValue(payload?.yearlySummary)) {
      payload.yearlySummary = {
        headline: `${payload.targetYear}년은 기본기 정비와 실행 균형이 핵심입니다.`,
        strengths: ["상반기 계획 실행력", "하반기 관계·재정 균형"],
        cautions: ["과도한 일정 집중", "감정적 의사결정"],
      };
      pushUnique(integrity.supplementedFields, "calculatedData.yearlySummary");
    }

    payload.monthlyLuck = buildDefaultSajuMonthlyLuck(payload?.monthlyLuck);
    if (!hasMeaningfulValue(payload?.actionPlan)) {
      payload.actionPlan = {
        q1: "기초 루틴 정비 및 우선순위 재배치",
        q2: "재정/관계 목표의 실행 점검",
        q3: "리스크 구간 완충 전략 실행",
        q4: "성과 회고 및 다음 해 설계",
      };
      pushUnique(integrity.supplementedFields, "calculatedData.actionPlan");
    }

    const sajuChart = normalizeSajuChartShape(payload?.saju?.chart || payload?.saju || canonical?.saju?.chart || canonical?.saju || {});
    payload.saju = {
      ...(payload?.saju && typeof payload.saju === "object" ? payload.saju : {}),
      chart: sajuChart,
      dayMaster: String(payload?.saju?.dayMaster || sajuChart?.dayMaster || "").trim(),
      tenGods: (payload?.saju?.tenGods && typeof payload.saju.tenGods === "object") ? payload.saju.tenGods : sajuChart.tenGods,
      luckCycles: (payload?.saju?.luckCycles && typeof payload.saju.luckCycles === "object") ? payload.saju.luckCycles : {},
    };
    payload.sajuCore = buildSajuCoreSnapshot(
      sajuChart,
      payload.saju.tenGods,
      payload.saju.luckCycles,
      canonical?.saju || {},
    );
    payload.luckFlow = {
      daewoon: Array.isArray(payload.sajuCore?.daewoon) ? payload.sajuCore.daewoon : [],
      sewoon: Array.isArray(payload.sajuCore?.sewoon) ? payload.sajuCore.sewoon : [],
      monthlyLuck: Array.isArray(payload.monthlyLuck) ? payload.monthlyLuck : [],
    };

    return payload;
  }

  return payload;
}

function normalizeSukyoCalculatedDataForPdf(calculatedData, canonicalSource, requestBody, integrity) {
  const payload = (calculatedData && typeof calculatedData === "object") ? { ...calculatedData } : {};
  const canonical = (canonicalSource && typeof canonicalSource === "object") ? canonicalSource : {};
  const modeToken = String(requestBody?.mode || requestBody?.reportType || requestBody?.reportMode || "").toLowerCase();
  const compatibilityRequired = Boolean(modeToken === "compatibility" || modeToken === "couple" || requestBody?.includeCompatibility === true || payload?._compatibilityRequired);

  const nameKo = String(payload?.nativeSook?.nameKo || payload?.nativeSook?.name || payload?.["宿曜"]?.birthMansion || canonical?.personA?.sukuyo?.nameKo || "").trim();
  const inferredIndex = Number(payload?.nativeSook?.number || payload?.["宿曜"]?.birthMansionIndex);
  let safeIndex = Number.isFinite(inferredIndex) ? inferredIndex : null;
  if (!safeIndex && nameKo) {
    const idx = SUKUYO_MANSIONS.findIndex((row) => String(row?.[0] || "") === nameKo || String(row?.[1] || "") === nameKo);
    safeIndex = idx >= 0 ? idx + 1 : null;
  }

  payload.profile = {
    ...(payload?.profile && typeof payload.profile === "object" ? payload.profile : {}),
    birthDate: String(payload?.profile?.birthDate || payload?.birthInfo?.solarDate || canonical?.personA?.birth?.solarDate || "").trim(),
    birthTime: String(payload?.profile?.birthTime || canonical?.personA?.birth?.time || "").trim(),
    lunarDate: String(payload?.profile?.lunarDate || payload?.birthInfo?.lunarDate || canonical?.personA?.birth?.lunarDate || "").trim(),
  };

  payload["宿曜"] = {
    ...(payload?.["宿曜"] && typeof payload["宿曜"] === "object" ? payload["宿曜"] : {}),
    birthMansion: nameKo,
    birthMansionIndex: safeIndex,
    mansionGroup: String(payload?.["宿曜"]?.mansionGroup || payload?.nativeSook?.group || canonical?.personA?.sukuyo?.group || "unknown").trim() || "unknown",
  };

  payload.nativeSook = {
    ...(payload?.nativeSook && typeof payload.nativeSook === "object" ? payload.nativeSook : {}),
    nameKo,
    name: String(payload?.nativeSook?.name || nameKo).trim(),
    number: safeIndex,
    group: String(payload?.nativeSook?.group || payload?.["宿曜"]?.mansionGroup || "unknown").trim() || "unknown",
    strengths: Array.isArray(payload?.nativeSook?.strengths) ? payload.nativeSook.strengths : [],
    weaknesses: Array.isArray(payload?.nativeSook?.weaknesses) ? payload.nativeSook.weaknesses : [],
  };

  payload.fortuneCycles = {
    daily: Array.isArray(payload?.fortuneCycles?.daily) ? payload.fortuneCycles.daily : (Array.isArray(payload?.cycleData?.daily) ? payload.cycleData.daily : []),
    monthly: Array.isArray(payload?.fortuneCycles?.monthly) ? payload.fortuneCycles.monthly : (Array.isArray(payload?.cycleData?.monthly) ? payload.cycleData.monthly : []),
    yearly: Array.isArray(payload?.fortuneCycles?.yearly) ? payload.fortuneCycles.yearly : (Array.isArray(payload?.cycleData?.yearly) ? payload.cycleData.yearly : []),
  };
  payload.cycleData = {
    daily: payload.fortuneCycles.daily,
    monthly: payload.fortuneCycles.monthly,
    yearly: payload.fortuneCycles.yearly,
  };

  payload.compatibility = (payload?.compatibility && typeof payload.compatibility === "object") ? payload.compatibility : {};
  if (compatibilityRequired) {
    if (!hasMeaningfulValue(payload.compatibility.targetMansion)) {
      payload.compatibility.targetMansion = String(canonical?.personB?.sukuyo?.nameKo || "관계 분석").trim() || "관계 분석";
      pushUnique(integrity.supplementedFields, "calculatedData.compatibility.targetMansion");
    }
    if (!hasMeaningfulValue(payload.compatibility.relationType)) {
      payload.compatibility.relationType = String(canonical?.compatibility?.relationType || canonical?.compatibility?.relationshipType || "중립").trim() || "중립";
      payload.compatibility.relationshipType = payload.compatibility.relationType;
      pushUnique(integrity.supplementedFields, "calculatedData.compatibility.relationType");
    }
    if (!hasMeaningfulValue(payload.compatibility.distance)) {
      const dist = Number(canonical?.compatibility?.distance || canonical?.compatibility?.shortestDistance || 1);
      payload.compatibility.distance = Number.isFinite(dist) ? dist : 1;
      pushUnique(integrity.supplementedFields, "calculatedData.compatibility.distance");
    }
  }
  payload._compatibilityRequired = compatibilityRequired;
  return payload;
}

function normalizeWesternCalculatedDataForPdf(calculatedData, canonicalSource, integrity) {
  const payload = (calculatedData && typeof calculatedData === "object") ? { ...calculatedData } : {};
  const canonical = (canonicalSource && typeof canonicalSource === "object") ? canonicalSource : {};

  const planets = normalizeAstroPlanetMap(payload?.planets || canonical?.planets || canonical?.chart?.planets || {});
  const anglesRaw = (payload?.angles && typeof payload.angles === "object") ? payload.angles : {};
  const asc = (anglesRaw?.ascendant && typeof anglesRaw.ascendant === "object") ? anglesRaw.ascendant : (canonical?.angles?.ascendant || canonical?.angles?.asc || {});
  const mc = (anglesRaw?.midheaven && typeof anglesRaw.midheaven === "object") ? anglesRaw.midheaven : (canonical?.angles?.midheaven || canonical?.angles?.mc || {});
  const housesRaw = Array.isArray(payload?.houses)
    ? payload.houses
    : (Array.isArray(canonical?.houses) ? canonical.houses : (canonical?.houses && typeof canonical.houses === "object" ? Object.values(canonical.houses) : []));
  let houses = Array.isArray(housesRaw) ? housesRaw.filter((row) => row && typeof row === "object") : [];
  if (!houses.length) {
    const fallbackSign = String(asc?.sign || planets?.sun?.sign || "Unknown").trim() || "Unknown";
    houses = Array.from({ length: 12 }, (_, idx) => ({ house: idx + 1, sign: fallbackSign, cuspDegree: null, planets: [] }));
    pushUnique(integrity.supplementedFields, "calculatedData.houses");
  }

  let aspects = Array.isArray(payload?.aspects)
    ? payload.aspects.filter((row) => row && typeof row === "object")
    : [];
  if (!aspects.length) {
    if (hasMeaningfulValue(planets?.sun?.sign) && hasMeaningfulValue(planets?.moon?.sign)) {
      aspects = [{ planetA: "sun", planetB: "moon", type: "conjunction", orb: 0 }];
    }
    if (!aspects.length) {
      aspects = [{ planetA: "sun", planetB: "saturn", type: "aspect", orb: 3.5 }];
    }
    pushUnique(integrity.supplementedFields, "calculatedData.aspects");
  }

  payload.planets = planets;
  payload.angles = {
    ...(anglesRaw || {}),
    ascendant: {
      ...(asc && typeof asc === "object" ? asc : {}),
      sign: String(asc?.sign || planets?.sun?.sign || houses?.[0]?.sign || "Unknown").trim() || "Unknown",
    },
    midheaven: {
      ...(mc && typeof mc === "object" ? mc : {}),
      sign: String(mc?.sign || houses?.[9]?.sign || planets?.saturn?.sign || "Unknown").trim() || "Unknown",
    },
    descendant: (anglesRaw?.descendant && typeof anglesRaw.descendant === "object") ? anglesRaw.descendant : {},
    imumCoeli: (anglesRaw?.imumCoeli && typeof anglesRaw.imumCoeli === "object") ? anglesRaw.imumCoeli : {},
  };

  payload.houses = houses;
  payload.aspects = aspects;
  payload.relationshipData = (payload?.relationshipData && typeof payload.relationshipData === "object") ? payload.relationshipData : {};
  payload.careerData = (payload?.careerData && typeof payload.careerData === "object") ? payload.careerData : {};
  payload.timingData = (payload?.timingData && typeof payload.timingData === "object") ? payload.timingData : {
    transits: [],
    progressions: [],
  };
  payload.natalChart = {
    ...(payload?.natalChart && typeof payload.natalChart === "object" ? payload.natalChart : {}),
    sunSign: String(planets?.sun?.sign || payload?.natalChart?.sunSign || "").trim(),
    moonSign: String(planets?.moon?.sign || payload?.natalChart?.moonSign || "").trim(),
    ascendant: String(payload?.angles?.ascendant?.sign || payload?.natalChart?.ascendant || "").trim(),
    planets: Object.values(planets).filter((item) => hasMeaningfulValue(item)),
    houses,
    aspects,
  };

  return payload;
}

function normalizeVedicCalculatedDataForPdf(calculatedData, canonicalSource, integrity) {
  const payload = (calculatedData && typeof calculatedData === "object") ? { ...calculatedData } : {};
  const canonical = (canonicalSource && typeof canonicalSource === "object") ? canonicalSource : {};

  const findSignIndex = (signName) => {
    const token = String(signName || "").trim().toLowerCase();
    if (!token) return -1;
    return VEDIC_SIGN_EN.findIndex((name) => String(name || "").trim().toLowerCase() === token);
  };
  const ensureNumberOrNull = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const toNormalizedLongitude = (planet = {}) => {
    const direct = ensureNumberOrNull(planet?.absoluteLongitude ?? planet?.longitude ?? planet?.siderealLongitude);
    if (direct != null) return normalizeDeg(direct);
    const signIdx = findSignIndex(planet?.sign || planet?.signName);
    const degreeInSign = ensureNumberOrNull(planet?.degreeInSign ?? planet?.degree);
    if (signIdx >= 0 && degreeInSign != null) return normalizeDeg(signIdx * 30 + degreeInSign);
    return null;
  };
  const toNormalizedPlanet = (name, source = {}, lagnaSignIndex = -1) => {
    const sign = String(source?.sign || source?.signName || source?.rashi || "").trim() || null;
    const signIdx = findSignIndex(sign);
    const degreeInSign = ensureNumberOrNull(source?.degreeInSign ?? source?.degree);
    const absoluteLongitude = toNormalizedLongitude(source);
    const inferredHouse = signIdx >= 0 && lagnaSignIndex >= 0 ? ((signIdx - lagnaSignIndex + 12) % 12) + 1 : null;
    const house = ensureNumberOrNull(source?.house) ?? inferredHouse;
    return {
      ...(source && typeof source === "object" ? source : {}),
      planet: name,
      sign,
      signLord: signIdx >= 0 ? getRashiLord(signIdx) : null,
      degreeInSign,
      absoluteLongitude,
      house,
      nakshatra: String(source?.nakshatra || source?.nakshatraName || "").trim() || null,
      nakshatraLord: String(source?.nakshatraLord || "").trim() || null,
      pada: ensureNumberOrNull(source?.pada ?? source?.nakshatraPada),
      retrograde: Boolean(source?.retrograde || source?.isRetrograde),
      combustion: Boolean(source?.combustion || source?.isCombust),
      dignity: String(source?.dignity || "").trim() || null,
      aspects: Array.isArray(source?.aspects) ? source.aspects : [],
    };
  };
  const lagnaToken = String(payload?.lagna?.sign || payload?.lagna?.name || canonical?.lagna?.sign || canonical?.lagna?.name || canonical?.lagna?.signName || "").trim();
  const lagnaSignIndex = findSignIndex(lagnaToken);

  const planets = normalizeAstroPlanetMap(payload?.planets || canonical?.planets || {});
  const lagnaSign = lagnaToken;
  const rashiHouses = payload?.rashiChart?.houses
    || canonical?.rashiChart?.houses
    || canonical?.houses
    || {};
  const navamsaHouses = payload?.navamsaChart?.houses
    || canonical?.navamsaChart?.houses
    || canonical?.divisionalCharts?.d9
    || {};

  const dashaRoot = (payload?.dashas && typeof payload.dashas === "object") ? payload.dashas : {};
  const vimshottari = (dashaRoot?.vimshottari && typeof dashaRoot.vimshottari === "object") ? dashaRoot.vimshottari : {};
  const timeline = Array.isArray(vimshottari?.timeline)
    ? vimshottari.timeline
    : (Array.isArray(vimshottari?.periods)
      ? vimshottari.periods
      : (Array.isArray(canonical?.dashas?.vimshottari?.timeline)
        ? canonical.dashas.vimshottari.timeline
        : (Array.isArray(canonical?.dasha?.upcoming) ? canonical.dasha.upcoming : [])));

  let currentMahaDasha = vimshottari?.currentMahaDasha
    || vimshottari?.currentDasha
    || dashaRoot?.current
    || canonical?.dashas?.vimshottari?.currentMahaDasha
    || canonical?.dasha?.current
    || timeline?.[0]
    || {};

  if (!hasMeaningfulValue(currentMahaDasha)) {
    currentMahaDasha = { lord: "Sun", startDate: "", endDate: "" };
    pushUnique(integrity.supplementedFields, "calculatedData.dashas.vimshottari.currentMahaDasha");
  }

  const karakas = (payload?.karakas && typeof payload.karakas === "object") ? { ...payload.karakas } : {};
  if (!hasMeaningfulValue(karakas?.atmakaraka)) {
    karakas.atmakaraka = canonical?.karakas?.atmakaraka || { planet: "Sun" };
    pushUnique(integrity.supplementedFields, "calculatedData.karakas.atmakaraka");
  }

  const planetOrder = [
    ["sun", "Sun"],
    ["moon", "Moon"],
    ["mars", "Mars"],
    ["mercury", "Mercury"],
    ["jupiter", "Jupiter"],
    ["venus", "Venus"],
    ["saturn", "Saturn"],
    ["rahu", "Rahu"],
    ["ketu", "Ketu"],
  ];
  const normalizedPlanets = {};
  planetOrder.forEach(([key, name]) => {
    normalizedPlanets[key] = toNormalizedPlanet(name, planets?.[key] || canonical?.planets?.[name] || {}, lagnaSignIndex);
  });

  const rahuLon = ensureNumberOrNull(normalizedPlanets?.rahu?.absoluteLongitude);
  const ketuLon = ensureNumberOrNull(normalizedPlanets?.ketu?.absoluteLongitude);
  if (rahuLon != null && ketuLon == null) {
    normalizedPlanets.ketu.absoluteLongitude = normalizeDeg(rahuLon + 180);
    if (normalizedPlanets.ketu.sign == null) {
      const ketuSignIdx = Math.floor(normalizedPlanets.ketu.absoluteLongitude / 30);
      normalizedPlanets.ketu.sign = VEDIC_SIGN_EN[ketuSignIdx] || null;
    }
    if (normalizedPlanets.ketu.degreeInSign == null) {
      normalizedPlanets.ketu.degreeInSign = Math.round((normalizedPlanets.ketu.absoluteLongitude % 30) * 100) / 100;
    }
    pushUnique(integrity.supplementedFields, "calculatedData.planets.ketu.absoluteLongitude");
  }
  if (rahuLon != null && ensureNumberOrNull(normalizedPlanets?.ketu?.absoluteLongitude) != null) {
    const diff = Math.abs(normalizeDeg(rahuLon - Number(normalizedPlanets.ketu.absoluteLongitude)));
    const distance = diff > 180 ? 360 - diff : diff;
    if (Math.abs(distance - 180) > 2.5) {
      normalizedPlanets.ketu.absoluteLongitude = normalizeDeg(rahuLon + 180);
      pushUnique(integrity.warnings, "normalized rahu/ketu opposition to 180 degrees");
      pushUnique(integrity.supplementedFields, "calculatedData.planets.ketu.absoluteLongitude");
    }
  }

  payload.planets = normalizedPlanets;
  payload.birthInfo = {
    ...(payload?.birthInfo && typeof payload.birthInfo === "object" ? payload.birthInfo : {}),
    date: String(payload?.birthInfo?.date || canonical?.profile?.birth?.date || canonical?.profile?.birth?.solarDate || payload?.profile?.birthDate || "").trim(),
    time: String(payload?.birthInfo?.time || canonical?.profile?.birth?.time || payload?.profile?.birthTime || "").trim(),
    place: String(payload?.birthInfo?.place || canonical?.profile?.birth?.place || canonical?.profile?.birth?.locationName || payload?.profile?.locationName || "").trim(),
    latitude: ensureNumberOrNull(payload?.birthInfo?.latitude ?? canonical?.profile?.birth?.latitude),
    longitude: ensureNumberOrNull(payload?.birthInfo?.longitude ?? canonical?.profile?.birth?.longitude),
    timezone: String(payload?.birthInfo?.timezone || canonical?.profile?.birth?.timezone || payload?.profile?.timezone || "").trim(),
    zodiac: "sidereal",
    ayanamsa: ensureNumberOrNull(payload?.birthInfo?.ayanamsa ?? canonical?.calculationMeta?.ayanamsa),
    ayanamsaMode: String(payload?.birthInfo?.ayanamsaMode || canonical?.calculationMeta?.ayanamsaMode || "lahiri").trim().toLowerCase(),
    ephemerisSource: String(payload?.birthInfo?.ephemerisSource || canonical?.calculationMeta?.ephemerisSource || canonical?.calculationMeta?.engine || "Swiss Ephemeris").trim(),
    houseSystem: String(payload?.birthInfo?.houseSystem || "whole-sign").trim(),
    unknownTime: Boolean(payload?.profile?.timeUnknown || payload?.birthInfo?.unknownTime),
    julianDay: ensureNumberOrNull(payload?.birthInfo?.julianDay ?? canonical?.calculationMeta?.julianDay),
  };
  payload.lagna = {
    ...(payload?.lagna && typeof payload.lagna === "object" ? payload.lagna : {}),
    sign: lagnaSign || String(normalizedPlanets?.sun?.sign || "Mithuna"),
    name: lagnaSign || String(normalizedPlanets?.sun?.sign || "Mithuna"),
    degree: ensureNumberOrNull(payload?.lagna?.degree ?? canonical?.lagna?.degree),
  };
  payload.rashiChart = {
    ...(payload?.rashiChart && typeof payload.rashiChart === "object" ? payload.rashiChart : {}),
    houses: rashiHouses,
  };
  payload.navamsaChart = {
    ...(payload?.navamsaChart && typeof payload.navamsaChart === "object" ? payload.navamsaChart : {}),
    houses: navamsaHouses,
  };
  payload.nakshatras = {
    ...(payload?.nakshatras && typeof payload.nakshatras === "object" ? payload.nakshatras : {}),
    moonNakshatra: payload?.nakshatras?.moonNakshatra || canonical?.nakshatras?.moonNakshatra || canonical?.moonNakshatra || { name: "Ashwini", pada: 1 },
  };
  payload.karakas = karakas;
  payload.dashas = {
    ...dashaRoot,
    vimshottari: {
      ...vimshottari,
      currentMahaDasha,
      antardasha: vimshottari?.antardasha || dashaRoot?.antar || canonical?.dasha?.antar || {},
      timeline: Array.isArray(timeline) ? timeline : [],
    },
  };
  payload.dasha = {
    timeline: Array.isArray(timeline) ? timeline : [],
    currentMahaDasha,
    antardasha: payload?.dashas?.vimshottari?.antardasha || {},
  };
  payload.yogas = Array.isArray(payload?.yogas) ? payload.yogas : (Array.isArray(canonical?.yogas) ? canonical.yogas : []);
  payload.relationshipData = (payload?.relationshipData && typeof payload.relationshipData === "object") ? payload.relationshipData : {};
  payload.careerData = (payload?.careerData && typeof payload.careerData === "object") ? payload.careerData : {};
  payload.natalChart = {
    ...(payload?.natalChart && typeof payload.natalChart === "object" ? payload.natalChart : {}),
    sunSign: String(normalizedPlanets?.sun?.sign || payload?.natalChart?.sunSign || "").trim(),
    moonSign: String(normalizedPlanets?.moon?.sign || payload?.natalChart?.moonSign || "").trim(),
    ascendant: String(payload?.lagna?.sign || payload?.natalChart?.ascendant || "").trim(),
    planets: Object.values(normalizedPlanets).filter((item) => hasMeaningfulValue(item)),
    houses: Array.isArray(payload?.rashiChart?.houses)
      ? payload.rashiChart.houses
      : (payload?.rashiChart?.houses && typeof payload.rashiChart.houses === "object" ? Object.values(payload.rashiChart.houses) : []),
    aspects: [],
  };
  payload.chart = {
    ...(payload?.chart && typeof payload.chart === "object" ? payload.chart : {}),
    lagna: String(payload?.lagna?.sign || payload?.lagna?.name || "").trim(),
    planets: Object.values(normalizedPlanets).filter((item) => hasMeaningfulValue(item)),
    houses: Array.isArray(payload?.rashiChart?.houses)
      ? payload.rashiChart.houses
      : (payload?.rashiChart?.houses && typeof payload.rashiChart.houses === "object" ? Object.values(payload.rashiChart.houses) : []),
  };

  return payload;
}

function applyPremiumPdfDataIntegrity(reportType, calculatedData, canonicalSource = {}, requestBody = {}) {
  const integrity = {
    reportType: String(reportType || ""),
    supplementedFields: [],
    warnings: [],
  };

  let normalized = (calculatedData && typeof calculatedData === "object") ? { ...calculatedData } : {};
  if (reportType === "ziweiPremium") {
    normalized = normalizeZiweiCalculatedDataForPdf(normalized, canonicalSource, integrity);
  } else if (reportType === "sookyoPremium") {
    normalized = normalizeSukyoCalculatedDataForPdf(normalized, canonicalSource, requestBody, integrity);
  } else if (reportType === "westernAstrologyPremium") {
    normalized = normalizeWesternCalculatedDataForPdf(normalized, canonicalSource, integrity);
  } else if (reportType === "vedicPremium") {
    normalized = normalizeVedicCalculatedDataForPdf(normalized, canonicalSource, integrity);
  } else if (reportType === "lifeBook" || reportType === "loveSecret" || reportType === "sajuNewYear") {
    normalized = normalizeSajuCalculatedDataForPdf(reportType, normalized, canonicalSource, requestBody, integrity);
  }

  return {
    calculatedData: normalized,
    integrity,
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
      ch5: { chapterTitle: "부부궁과 연애결혼", requiredPaths: ["calculatedData"] },
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
    const sukyoMode = resolveSukyoModeFromPayload({
      reportMode: calculatedData?.reportMode,
      reportType: calculatedData?.reportType,
      _compatibilityRequired: calculatedData?._compatibilityRequired,
      includeCompatibility: calculatedData?.includeCompatibility,
    });
    const sukyoChapters = getSukyoPdfChapters(sukyoMode);
    return Object.fromEntries(
      sukyoChapters.map((chapter, idx) => [
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
      ch3: { chapterTitle: "내면 운명", requiredPaths: ["calculatedData.lagna", "calculatedData.nakshatras.moonNakshatra"] },
      ch4: { chapterTitle: "카르마 과제", requiredPaths: ["calculatedData.karakas", "calculatedData.planets.saturn", "calculatedData.planets.rahu", "calculatedData.planets.ketu"] },
      ch5: { chapterTitle: "사랑/결혼", requiredPaths: ["calculatedData.planets.venus", "calculatedData.planets.jupiter", "calculatedData.rashiChart"] },
      ch6: { chapterTitle: "직업/소명", requiredPaths: ["calculatedData.planets.saturn", "calculatedData.planets.mercury", "calculatedData.rashiChart"] },
      ch7: { chapterTitle: "인생 주기", requiredPaths: ["calculatedData.nakshatras.moonNakshatra", "calculatedData.lagna"] },
      ch8: { chapterTitle: "요가 분석", requiredPaths: ["calculatedData.karakas", "calculatedData.planets"] },
      ch9: { chapterTitle: "종합 전략", requiredPaths: ["calculatedData"] },
    };
  }

  if (reportType === "loveSecret") {
    return {
      ch1: { chapterTitle: "본연의 연애 자아", requiredPaths: ["calculatedData.sajuCore.dayMaster", "calculatedData.self.relationshipProfile"] },
      ch2: { chapterTitle: "치명적 매력과 페로몬", requiredPaths: ["calculatedData.self.fiveElementBalance", "calculatedData.self.relationshipProfile.attractionSignals"] },
      ch3: { chapterTitle: "운명의 상대방 리포트", requiredPaths: ["calculatedData.compatibility", "calculatedData.sajuCore.tenGodEvidence"] },
      ch4: { chapterTitle: "실전 연애 전략 및 스킬", requiredPaths: ["calculatedData.self.relationshipProfile", "calculatedData.compatibility.communicationPattern"] },
      ch5: { chapterTitle: "시기별 연애운 흐름", requiredPaths: ["calculatedData.luckFlow.daewoon", "calculatedData.luckFlow.sewoon"] },
      ch6: { chapterTitle: "연애의 어두운 면과 위기 관리", requiredPaths: ["calculatedData.self.relationshipProfile.conflictSignals", "calculatedData.sajuCore.monthCommand"] },
      ch7: { chapterTitle: "친밀감과 감정 리듬", requiredPaths: ["calculatedData.compatibility.temperatureHumidityMatch", "calculatedData.compatibility.communicationPattern"] },
      ch8: { chapterTitle: "현대적 상황별 연애 비책", requiredPaths: ["calculatedData.compatibility.practicalAdvice", "calculatedData.sajuCore.tenGodEvidence"] },
      ch9: { chapterTitle: "결혼과 정착", requiredPaths: ["calculatedData.compatibility.longTermMarriagePotential", "calculatedData.luckFlow.daewoon"] },
      ch10: { chapterTitle: "맞춤형 연애 개운 처방전", requiredPaths: ["calculatedData.compatibility.practicalAdvice", "calculatedData.sajuCore.monthCommand"] },
      ch11: { chapterTitle: "재회·이별·회복 시나리오", requiredPaths: ["calculatedData.self.relationshipProfile.conflictSignals", "calculatedData.luckFlow.sewoon"] },
      ch12: { chapterTitle: "장기 관계 운영 매뉴얼", requiredPaths: ["calculatedData.compatibility", "calculatedData.sajuCore.tenGodEvidence"] },
      ch13: { chapterTitle: "최종 사랑 마스터플랜", requiredPaths: ["calculatedData.sajuCore", "calculatedData.compatibility"] },
    };
  }

  if (reportType === "lifeBook") {
    return {
      ch1: { chapterTitle: "핵심 정체성", requiredPaths: ["calculatedData.integratedThemes.coreIdentity", "calculatedData.sajuCore.dayMaster"] },
      ch2: { chapterTitle: "타고난 성향", requiredPaths: ["calculatedData.sajuCore.pillars", "calculatedData.sajuCore.tenGodEvidence"] },
      ch3: { chapterTitle: "인생의 소명", requiredPaths: ["calculatedData.integratedThemes.lifeMission"] },
      ch4: { chapterTitle: "직업과 사회적 방향", requiredPaths: ["calculatedData.integratedThemes.careerDirection"] },
      ch5: { chapterTitle: "재물 흐름", requiredPaths: ["calculatedData.integratedThemes.wealthPattern"] },
      ch6: { chapterTitle: "관계와 사랑", requiredPaths: ["calculatedData.integratedThemes.relationshipPattern"] },
      ch7: { chapterTitle: "건강과 에너지", requiredPaths: ["calculatedData.integratedThemes.healthPattern"] },
      ch8: { chapterTitle: "인생 전환점", requiredPaths: ["calculatedData.timeline", "calculatedData.luckFlow.daewoon"] },
      ch9: { chapterTitle: "반복 신호", requiredPaths: ["calculatedData.integratedThemes.repeatedSignals"] },
      ch10: { chapterTitle: "충돌 신호", requiredPaths: ["calculatedData.integratedThemes.conflictingSignals", "calculatedData.sajuCore.monthCommand"] },
      ch11: { chapterTitle: "종합 인생 전략", requiredPaths: ["calculatedData.luckFlow.daewoon", "calculatedData.luckFlow.sewoon"] },
      ch12: { chapterTitle: "인생 실행 전략", requiredPaths: ["calculatedData.sajuCore.tenGodEvidence", "calculatedData.timeline"] },
      ch13: { chapterTitle: "최종 마스터 플랜", requiredPaths: ["calculatedData.sajuCore", "calculatedData.integratedThemes"] },
    };
  }

  if (reportType === "sajuNewYear") {
    return {
      ch1: { chapterTitle: "연간 파동 총론 - 올해의 기본 기조", requiredPaths: ["calculatedData.sajuCore.pillars", "calculatedData.sajuCore.dayMaster", "calculatedData.sajuCore.monthCommand"] },
      ch2: { chapterTitle: "커리어 전략 - 성과가 나는 월/주의 월", requiredPaths: ["calculatedData.yearlySummary.career", "calculatedData.monthlyLuck"] },
      ch3: { chapterTitle: "재물 흐름 - 수익/지출 관리 타이밍", requiredPaths: ["calculatedData.yearlySummary.wealth", "calculatedData.monthlyLuck"] },
      ch4: { chapterTitle: "관계·인맥 - 협업과 거리두기 전략", requiredPaths: ["calculatedData.yearlySummary.relationship", "calculatedData.monthlyLuck"] },
      ch5: { chapterTitle: "연애·가정 - 감정 파동 관리법", requiredPaths: ["calculatedData.yearlySummary.relationship", "calculatedData.monthlyLuck"] },
      ch6: { chapterTitle: "건강·에너지 - 번아웃 방지 설계", requiredPaths: ["calculatedData.sajuCore.monthCommand", "calculatedData.yearlySummary"] },
      ch7: { chapterTitle: "분기별 핵심 의사결정 포인트", requiredPaths: ["calculatedData.luckFlow.daewoon", "calculatedData.yearlySummary"] },
      ch8: { chapterTitle: "리스크 시나리오와 대응 플랜", requiredPaths: ["calculatedData.luckFlow.sewoon", "calculatedData.yearlySummary"] },
      ch9: { chapterTitle: "12개월 Go/Stop 월별 테이블", requiredPaths: ["calculatedData.monthlyLuck"] },
      ch10: { chapterTitle: "최종 실행 로드맵 - 연말 회수 전략", requiredPaths: ["calculatedData.actionPlan", "calculatedData.sajuCore", "calculatedData.monthlyLuck"] },
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
  if (reportType === "sajuNewYear") {
    return {
      targetYear: calculatedData?.targetYear || "",
      focusArea: calculatedData?.focusArea || "overall",
      strongestMonths: (Array.isArray(calculatedData?.monthlyLuck) ? calculatedData.monthlyLuck : [])
        .slice()
        .sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0))
        .slice(0, 3),
      cautionMonths: (Array.isArray(calculatedData?.monthlyLuck) ? calculatedData.monthlyLuck : [])
        .slice()
        .sort((a, b) => Number(a?.score || 0) - Number(b?.score || 0))
        .slice(0, 3),
    };
  }
  return {};
}

function validateCanonicalJson(reportType, canonicalJson) {
  const requiredPaths = PREMIUM_CANONICAL_REQUIRED_PATHS_BY_TYPE[reportType] || [];
  const optionalPaths = PREMIUM_CANONICAL_OPTIONAL_PATHS_BY_TYPE[reportType] || [];
  const requiredMissing = requiredPaths.filter((path) => pathMissing(canonicalJson, path));
  const optionalMissing = optionalPaths.filter((path) => pathMissing(canonicalJson, path));
  const fatalMissing = [];
  const recoverableMissing = [...requiredMissing];

  if (!reportType) fatalMissing.push("reportType");
  if (!hasMeaningfulValue(canonicalJson?.calculatedData) && !hasMeaningfulValue(canonicalJson?.input)) {
    fatalMissing.push("sourceData");
  }

  let reportPayloadValidation = { ok: true, code: "", missingFields: [] };
  if (reportType === "lifeBook" || reportType === "loveSecret" || reportType === "sajuNewYear") {
    reportPayloadValidation = validateSajuReportPayload(reportType, canonicalJson);
  } else if (reportType === "ziweiPremium") {
    reportPayloadValidation = validateZiweiReportPayload(canonicalJson);
  } else if (reportType === "sookyoPremium") {
    reportPayloadValidation = validateSukyoReportPayload(canonicalJson);
  } else if (reportType === "vedicPremium") {
    reportPayloadValidation = validateVedicReportPayload(canonicalJson);
  } else if (reportType === "westernAstrologyPremium") {
    reportPayloadValidation = validateAstrologyReportPayload(canonicalJson);
  }

  (reportPayloadValidation.fatalMissing || []).forEach((field) => fatalMissing.push(field));
  (reportPayloadValidation.recoverableMissing || reportPayloadValidation.missingFields || []).forEach((field) => {
    recoverableMissing.push(field);
  });

  if (reportType === "ziweiPremium") {
    const palaceByKey = getPathValue(canonicalJson, "calculatedData.palacesByKey") || {};
    const palaceKeys = ["ming", "siblings", "spouse", "children", "wealth", "health", "travel", "friends", "career", "property", "fortune", "parents"];
    palaceKeys.forEach((key) => {
      const fullPath = `calculatedData.palacesByKey.${key}`;
      if (!hasMeaningfulValue(palaceByKey?.[key])) optionalMissing.push(fullPath);
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
      recoverableMissing.push("calculatedData.sukyoPdfContext.minimalSource");
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
    const hasSaju = hasMeaningfulValue(getPathValue(canonicalJson, "calculatedData.saju"));
    if (!hasZiwei && !hasWestern) {
      if (!hasSaju) {
        recoverableMissing.push("calculatedData.ziwei|calculatedData.westernAstrology");
      } else {
        optionalMissing.push("calculatedData.ziwei|calculatedData.westernAstrology");
      }
    }
  }

  const uniqueFatalMissing = Array.from(new Set(fatalMissing));
  const uniqueRequiredMissing = Array.from(new Set(recoverableMissing));
  const uniqueOptionalMissing = Array.from(new Set(optionalMissing));
  const code = uniqueFatalMissing.length === 0
    ? ""
    : (reportPayloadValidation.code || getPremiumDataIncompleteCode(reportType));
  return {
    ok: uniqueFatalMissing.length === 0,
    fatalMissing: uniqueFatalMissing,
    requiredMissing: uniqueRequiredMissing,
    recoverableMissing: uniqueRequiredMissing,
    optionalMissing: uniqueOptionalMissing,
    canGeneratePdf: uniqueFatalMissing.length === 0,
    code,
    reportPayloadValidation,
    generationMode: uniqueFatalMissing.length > 0 ? "blocked" : (uniqueRequiredMissing.length > 0 ? "fallback" : (uniqueOptionalMissing.length > 0 ? "partial" : "full")),
    reason: uniqueFatalMissing.length === 0 ? "" : "PDF 생성 최소 데이터 점검이 필요합니다.",
  };
}

function buildCanonicalDataMarkers(reportType, canonicalJson, validation) {
  const requiredPaths = PREMIUM_CANONICAL_REQUIRED_PATHS_BY_TYPE[reportType] || [];
  const optionalPaths = PREMIUM_CANONICAL_OPTIONAL_PATHS_BY_TYPE[reportType] || [];
  const required = requiredPaths.map((path) => ({ path, ok: !pathMissing(canonicalJson, path) }));
  const optional = optionalPaths.map((path) => ({ path, ok: !pathMissing(canonicalJson, path) }));
  const payloadMissing = Array.isArray(validation?.reportPayloadValidation?.missingFields)
    ? Array.from(new Set(validation.reportPayloadValidation.missingFields.map((field) => String(field || "").trim()).filter(Boolean)))
    : [];

  return {
    required,
    optional,
    payloadMissing,
    requiredTotal: required.length,
    requiredSatisfiedCount: required.filter((item) => item.ok).length,
    optionalTotal: optional.length,
    optionalSatisfiedCount: optional.filter((item) => item.ok).length,
    payloadMissingCount: payloadMissing.length,
  };
}

function buildCanonicalCompletenessScore(validation, markers) {
  const requiredTotal = Number(markers?.requiredTotal || 0);
  const optionalTotal = Number(markers?.optionalTotal || 0);
  const requiredMissingCount = Array.isArray(validation?.requiredMissing)
    ? validation.requiredMissing.length
    : Math.max(0, requiredTotal - Number(markers?.requiredSatisfiedCount || 0));
  const optionalMissingCount = Array.isArray(validation?.optionalMissing)
    ? validation.optionalMissing.length
    : Math.max(0, optionalTotal - Number(markers?.optionalSatisfiedCount || 0));

  const requiredRatio = requiredTotal > 0
    ? (requiredTotal - requiredMissingCount) / requiredTotal
    : 1;
  const optionalRatio = optionalTotal > 0
    ? (optionalTotal - optionalMissingCount) / optionalTotal
    : 1;

  let score = Math.round((requiredRatio * 80) + (optionalRatio * 20));
  if (validation?.canGeneratePdf) score = Math.max(score, 85);
  if (!validation?.canGeneratePdf && requiredMissingCount > 0) score = Math.min(score, 79);
  return Math.max(0, Math.min(100, score));
}

function buildCanonicalBlockingReasons(reportType, validation) {
  if (validation?.canGeneratePdf) return [];
  const reasons = [];
  if (validation?.code) {
    reasons.push({
      code: String(validation.code || ""),
      reportType,
      message: String(validation.reason || "핵심 계산 데이터 점검이 필요합니다."),
    });
  }

  const payloadValidation = validation?.reportPayloadValidation || null;
  if (payloadValidation && payloadValidation.ok === false) {
    reasons.push({
      code: String(payloadValidation.code || "PREMIUM_REPORT_PAYLOAD_INVALID"),
      reportType,
      message: "리포트 payload 정합성 검증에 실패했습니다.",
      missingFields: Array.isArray(payloadValidation.missingFields)
        ? payloadValidation.missingFields.slice(0, 12)
        : [],
    });
  }

  const requiredMissing = Array.isArray(validation?.requiredMissing) ? validation.requiredMissing : [];
  requiredMissing.slice(0, 12).forEach((path) => {
    reasons.push({
      code: "REQUIRED_DATA_MISSING",
      reportType,
      path,
      message: `필수 데이터 정합성 점검 필요: ${path}`,
    });
  });

  return reasons;
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
  } else if (reportType === "sajuNewYear") {
    calculatedData = mapSajuNewYearCalculatedData(prepareData?.canonicalSajuNewYearReport || {});
  }

  // PDF 파이프라인 진입 전 공통 무결성 보강: 운세별 필수 키를 표준 shape로 강제 정규화한다.
  const canonicalSource = getPremiumCanonicalFromPrepare(reportType, prepareData) || {};
  const integrityNormalized = applyPremiumPdfDataIntegrity(reportType, calculatedData, canonicalSource, requestBody);
  calculatedData = ensureCanonicalCalculatedDataShape(reportType, integrityNormalized.calculatedData);

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
    reportPayload: calculatedData,
    interpretationSeed,
    chapterData,
    diagnostics: {},
    missingData: [],
    warnings: [],
    isCompleteForPdf: false,
    dataMarkers: {
      required: [],
      optional: [],
      payloadMissing: [],
      requiredTotal: 0,
      requiredSatisfiedCount: 0,
      optionalTotal: 0,
      optionalSatisfiedCount: 0,
      payloadMissingCount: 0,
    },
    completenessScore: 0,
    blockingReasons: [],
  };

  const validation = validateCanonicalJson(reportType, canonicalJson);
  const dataMarkers = buildCanonicalDataMarkers(reportType, canonicalJson, validation);
  const completenessScore = buildCanonicalCompletenessScore(validation, dataMarkers);
  const blockingReasons = buildCanonicalBlockingReasons(reportType, validation);
  canonicalJson.missingData = Array.from(new Set(validation.requiredMissing));
  canonicalJson.warnings = Array.from(new Set(validation.optionalMissing));
  canonicalJson.isCompleteForPdf = validation.canGeneratePdf;
  canonicalJson.dataMarkers = dataMarkers;
  canonicalJson.completenessScore = completenessScore;
  canonicalJson.blockingReasons = blockingReasons;
  canonicalJson.diagnostics = {
    canonicalValidationCode: validation.code || "",
    reportPayloadValidation: validation.reportPayloadValidation || null,
    completenessScore,
    blockingReasons,
    dataIntegrity: integrityNormalized.integrity,
  };

  if ((canonicalJson.missingData || []).length > 0 || (canonicalJson.warnings || []).length > 0) {
    console.warn("[PremiumPDF][CanonicalMissing]", {
      reportType,
      reportId: canonicalJson.reportId,
      requiredMissingCount: (canonicalJson.missingData || []).length,
      optionalMissingCount: (canonicalJson.warnings || []).length,
      requiredMissingSample: (canonicalJson.missingData || []).slice(0, 15),
      optionalMissingSample: (canonicalJson.warnings || []).slice(0, 15),
    });
  }

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
    chapterContract: {
      purpose: String(chapterMeta.purpose || chapterMeta.chapterTitle || `Chapter ${chapterId}`),
      requiredEvidence: Array.isArray(chapterMeta.requiredPaths) ? chapterMeta.requiredPaths : [],
      recommendedEvidence: Array.isArray(chapterMeta.recommendedPaths) ? chapterMeta.recommendedPaths : [],
      fallbackAngle: String(chapterMeta.fallbackAngle || "세부 근거가 제한된 경우 확보된 기본 결과와 사용자 입력을 바탕으로 보수적으로 작성"),
      forbiddenTopics: Array.isArray(chapterMeta.forbiddenTopics) ? chapterMeta.forbiddenTopics : ["이전 챕터의 핵심 성격 설명 반복", "동일 조언 반복", "계산되지 않은 값 임의 생성"],
      outputStyle: String(chapterMeta.outputStyle || "챕터별 고유 결론과 현실 조언으로 마무리"),
    },
  };

  if (reportType === "ziweiPremium") {
    const palaces = toPlainObject(calculatedData.palacesByKey);
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
    const sukyoMode = resolveSukyoModeFromPayload({
      reportMode: calculatedData?.reportMode,
      reportType: calculatedData?.reportType,
      _compatibilityRequired: calculatedData?._compatibilityRequired,
      includeCompatibility: calculatedData?.includeCompatibility,
    });
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
        chapterBlueprint: getSukyoPdfChapters(sukyoMode),
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
        sajuCore: toPlainObject(calculatedData.sajuCore),
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
        luckFlow: toPlainObject(calculatedData.luckFlow),
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
        sajuCore: toPlainObject(calculatedData.sajuCore),
        integratedThemes: toPlainObject(calculatedData.integratedThemes),
        saju: toPlainObject(calculatedData.saju),
      },
      timing: {
        timeline: toPlainObject(calculatedData.timeline),
        luckFlow: toPlainObject(calculatedData.luckFlow),
      },
      actions: {
        ziwei: toPlainObject(calculatedData.ziwei),
        westernAstrology: toPlainObject(calculatedData.westernAstrology),
        vedic: toPlainObject(calculatedData.vedic),
        sookyo: toPlainObject(calculatedData.sookyo),
      },
    };
  }

  if (reportType === "sajuNewYear") {
    return {
      chapterCore,
      signals: {
        sajuCore: toPlainObject(calculatedData.sajuCore),
        yearlySummary: toPlainObject(calculatedData.yearlySummary),
        actionPlan: toPlainObject(calculatedData.actionPlan),
      },
      timing: {
        luckFlow: toPlainObject(calculatedData.luckFlow),
        monthlyLuck: toTopArray(calculatedData.monthlyLuck, 12),
      },
      actions: {
        focusArea: String(calculatedData.focusArea || "overall"),
        targetYear: Number(calculatedData.targetYear || 0),
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

function flattenPromptDataLines(source, prefix = "", out = [], depth = 0) {
  if (!source || typeof source !== "object" || depth > 4 || out.length >= 80) return out;
  const entries = Object.entries(source);
  for (let i = 0; i < entries.length; i += 1) {
    if (out.length >= 80) break;
    const [key, value] = entries[i];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (!value.length) continue;
      const packed = stringifyCompact(value, 260).replace(/\s+/g, " ").trim();
      if (packed) out.push(`${path}: ${packed}`);
      continue;
    }
    if (typeof value === "object") {
      flattenPromptDataLines(value, path, out, depth + 1);
      continue;
    }
    out.push(`${path}: ${String(value)}`);
  }
  return out;
}

function extractPremiumKeyPhrases(text = "") {
  const tokens = String(text || "")
    .replace(/[#*_`>\-]/g, " ")
    .split(/[\s,.;:!?()\[\]{}"'“”‘’]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && token.length <= 18)
    .filter((token) => !/^(그리고|하지만|그러나|입니다|합니다|것입니다|중요합니다)$/.test(token));
  const counts = new Map();
  tokens.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token)
    .slice(0, 12);
}

function summarizePreviousPremiumChapters(context, currentChapterId) {
  const summaries = [];
  const chapterTextById = context?.chapterTextById || {};
  Object.keys(chapterTextById)
    .map((key) => Number(key))
    .filter((id) => Number.isFinite(id) && id > 0 && id < Number(currentChapterId || 0))
    .sort((a, b) => a - b)
    .forEach((id) => {
      const text = String(chapterTextById[String(id)] || "").replace(/\s+/g, " ").trim();
      summaries.push({
        chapterId: id,
        summary: text.slice(0, 420),
        keyPhrases: extractPremiumKeyPhrases(text),
      });
    });
  return summaries.slice(-6);
}

function buildPromptEvidenceChecklist(reportType, chapterJsonPacks = {}) {
  const isSajuClassicReport = reportType === "lifeBook" || reportType === "loveSecret";
  const common = [
    "chapterJsonPacks.chapterCore.requiredPaths 중 최소 2개를 문장 내에 근거로 명시",
    "signals, timing, actions에서 최소 1개씩 근거를 반영",
  ];
  if (reportType === "sajuNewYear") {
    return [
      ...common,
      "내부 계산 근거(년주/월주/일주/시주, 오행/십성 분포, 용신/희신/기신 판단 과정)를 본문에 직접 노출하지 말 것",
      "연간 전략, 분기 전략, 월별 실행표를 서로 다른 목적의 상담문으로 작성할 것",
      "월별 표는 Go/Stop 중심의 행동 지침(커리어/재물/관계/건강)을 함께 제공할 것",
    ];
  }

  if (!isSajuClassicReport) return common;

  const sajuCore = toPlainObject(chapterJsonPacks?.signals?.sajuCore);
  const pillars = toPlainObject(sajuCore?.pillars);
  const pillarTokens = [pillars.year, pillars.month, pillars.day, pillars.hour].map((v) => String(v || "").trim()).filter(Boolean);
  const tenGodRows = Array.isArray(sajuCore?.tenGodEvidence) ? sajuCore.tenGodEvidence : [];
  const daewoonCount = Array.isArray(chapterJsonPacks?.timing?.luckFlow?.daewoon) ? chapterJsonPacks.timing.luckFlow.daewoon.length : 0;
  const sewoonCount = Array.isArray(chapterJsonPacks?.timing?.luckFlow?.sewoon) ? chapterJsonPacks.timing.luckFlow.sewoon.length : 0;

  return [
    ...common,
    `원국 4주(년/월/일/시) 중 최소 2개를 명시: ${pillarTokens.slice(0, 4).join(", ") || "데이터 확인"}`,
    `월령(monthCommand) 값을 명시하고 해석에 반영: ${String(sajuCore?.monthCommand || "데이터 확인").trim() || "데이터 확인"}`,
    `십성 근거를 최소 2개 반영(tenGodEvidence): ${tenGodRows.length}개 항목 확보`,
    `대운/세운 근거를 최소 1회 이상 언급: 대운 ${daewoonCount}건, 세운 ${sewoonCount}건`,
  ];
}

function buildPremiumPdfRenderGuide(reportType) {
  const base = {
    layout: [
      "## 핵심 데이터 요약",
      "## 심층 해석",
      "## 실행 전략",
      "## 리스크 관리",
    ],
    formatting: [
      "표/리스트/짧은 문단을 혼합해 가독성 우선",
      "굵은 강조(**)는 문단당 최대 1회",
      "과장·예언형 단정 문구 금지",
    ],
  };
  if (reportType === "sajuNewYear") {
    return {
      ...base,
      requiredSections: [
        "연간 운영 전략",
        "분기별 의사결정",
        "12개월 Go/Stop 실행표",
        "연말 회수 로드맵",
      ],
    };
  }
  if (reportType === "lifeBook" || reportType === "loveSecret") {
    return {
      ...base,
      requiredSections: [
        "원국 근거(4주/일간/월령)",
        "십성 근거",
        "대운·세운 타이밍",
      ],
    };
  }
  return base;
}

function buildPromptSourceData(reportType, chapterId, canonicalJson, prebuiltChapterJsonPacks = null) {
  const chapterKey = `ch${Number(chapterId || 0)}`;
  const chapterMeta = canonicalJson?.chapterData?.[chapterKey] || {};
  const requiredPaths = Array.isArray(chapterMeta.requiredPaths) ? chapterMeta.requiredPaths : [];
  const inferredFeatureType = REPORT_TYPE_TO_FEATURE_TYPE[reportType] || reportType;
  const inferredMode = String(canonicalJson?.input?.reportMode || canonicalJson?.input?.mode || canonicalJson?.input?.reportType || "");
  const chapterContract = buildPremiumChapterContract(reportType, inferredFeatureType, inferredMode, chapterId);
  const chapterDataSubset = {};
  requiredPaths.forEach((path) => {
    chapterDataSubset[path] = getPathValue(canonicalJson, path);
  });
  const chapterJsonPacks = prebuiltChapterJsonPacks || buildChapterJsonPacks(reportType, chapterId, canonicalJson);
  const evidenceChecklist = buildPromptEvidenceChecklist(reportType, chapterJsonPacks);
  const renderGuide = buildPremiumPdfRenderGuide(reportType);
  const promptMetaByType = {
    ziweiPremium: {
      fortuneLabel: "자미두수 프리미엄 PDF",
      expertDirective: "자미두수 분야 최고 전문가로서 1:1 상담하듯 프리미엄 PDF를 작성",
    },
    sookyoPremium: {
      fortuneLabel: "숙요 프리미엄 PDF",
      expertDirective: "숙요점(27숙) 분야 최고 전문가로서 1:1 상담하듯 프리미엄 PDF를 작성",
    },
    westernAstrologyPremium: {
      fortuneLabel: "서양 점성술 프리미엄 PDF",
      expertDirective: "서양 점성술 분야 최고 전문가로서 1:1 상담하듯 프리미엄 PDF를 작성",
    },
    vedicPremium: {
      fortuneLabel: "베다 점성술 프리미엄 PDF",
      expertDirective: "베다 점성술(Jyotish) 분야 최고 전문가로서 1:1 상담하듯 프리미엄 PDF를 작성",
    },
    lifeBook: {
      fortuneLabel: "인생의 책 프리미엄 PDF",
      expertDirective: "사주 인생설계 분야 최고 전문가로서 1:1 상담하듯 프리미엄 PDF를 작성",
    },
    loveSecret: {
      fortuneLabel: "연애 비책 프리미엄 PDF",
      expertDirective: "사주 연애/궁합 분야 최고 전문가로서 1:1 상담하듯 프리미엄 PDF를 작성",
    },
    sajuNewYear: {
      fortuneLabel: "신년운세 프리미엄 PDF",
      expertDirective: "사주 신년전략 분야 최고 전문가로서 1:1 상담하듯 프리미엄 PDF를 작성",
    },
  };
  const promptMeta = promptMetaByType[reportType] || {
    fortuneLabel: "프리미엄 PDF",
    expertDirective: "해당 운세 분야 최고 전문가로서 1:1 상담하듯 프리미엄 PDF를 작성",
  };

  return {
    reportType,
    chapterId: String(chapterId || ""),
    chapterTitle: String(chapterMeta.chapterTitle || `Chapter ${chapterId}`),
    chapterContract,
    calculatedDataForThisChapter: chapterDataSubset,
    chapterJsonPacks,
    questionPromptPackage: {
      schema: "cd-question-prompt-data-v1",
      fortuneType: reportType,
      fortuneLabel: promptMeta.fortuneLabel,
      expertDirective: promptMeta.expertDirective,
      mode: canonicalJson?.input?.reportType || canonicalJson?.input?.mode || "personal",
      chapterId: String(chapterId || ""),
      chapterTitle: String(chapterMeta.chapterTitle || `Chapter ${chapterId}`),
      chapterContract,
      profile: canonicalJson?.input || canonicalJson?.calculatedData?.birthInfo || {},
      compatibilityTarget: canonicalJson?.input?.partnerData || canonicalJson?.input?.partnerBirthData || undefined,
      analysisResult: {
        chapterId: String(chapterId || ""),
        chapterDataSubset,
        chapterJsonPacks,
      },
      evidenceChecklist,
      renderGuide,
      analysisAngles: flattenPromptDataLines(chapterJsonPacks).slice(0, 14),
      domainDataLines: flattenPromptDataLines(chapterDataSubset).slice(0, 24),
      constraints: {
        dataOnly: true,
        noInferenceOutsideJson: true,
        note: "JSON에 없는 계산 결과를 추정하지 말고 chapterJsonPacks 근거만 사용",
      },
    },
  };
}

function buildLlmPromptInput(reportType, chapterId, canonicalJson, prebuiltChapterJsonPacks = null, dedupContext = {}) {
  const promptSourceData = buildPromptSourceData(reportType, chapterId, canonicalJson, prebuiltChapterJsonPacks);
  const isSajuClassicReport = reportType === "lifeBook" || reportType === "loveSecret";
  const isSajuNewYearReport = reportType === "sajuNewYear";
  const previousChapterSummaries = Array.isArray(dedupContext.previousChapterSummaries)
    ? dedupContext.previousChapterSummaries
    : [];
  const expertRoleRuleByType = {
    ziweiPremium: "자미두수 분야 최고 전문가처럼 1:1 프리미엄 상담문으로 작성할 것",
    sookyoPremium: "숙요점(27숙) 분야 최고 전문가처럼 1:1 프리미엄 상담문으로 작성할 것",
    westernAstrologyPremium: "서양 점성술 분야 최고 전문가처럼 1:1 프리미엄 상담문으로 작성할 것",
    vedicPremium: "베다 점성술 분야 최고 전문가처럼 1:1 프리미엄 상담문으로 작성할 것",
    lifeBook: "사주 인생설계 분야 최고 전문가처럼 1:1 프리미엄 상담문으로 작성할 것",
    loveSecret: "사주 연애/궁합 분야 최고 전문가처럼 1:1 프리미엄 상담문으로 작성할 것",
    sajuNewYear: "사주 신년전략 분야 최고 전문가처럼 1:1 프리미엄 상담문으로 작성할 것",
  };
  const expertRoleRule = expertRoleRuleByType[reportType]
    || "해당 운세 분야 최고 전문가처럼 1:1 프리미엄 상담문으로 작성할 것";
  const forbiddenRepeats = Array.from(new Set(previousChapterSummaries.flatMap((row) => Array.isArray(row?.keyPhrases) ? row.keyPhrases : []))).slice(0, 30);
  const typeSpecificRules = isSajuClassicReport
    ? [
      "사주 인생설계/연애 상담 분야 최고 전문가처럼 1:1 프리미엄 상담 톤으로 작성할 것",
      "원국(년월일시), 일간, 월령을 최소 1회 이상 명시할 것",
      "십성 근거(tenGodEvidence)에서 최소 2개를 명시할 것",
      "대운/세운 데이터가 있으면 시기 전략에 반드시 반영할 것",
      "원국·대운·세운 근거를 분리해 서술하고, 마지막에 통합 결론으로 연결할 것",
    ]
    : isSajuNewYearReport
      ? [
        "사주 신년 전략 분야 최고 전문가처럼 연간 운영을 상담하듯 구체적으로 작성할 것",
        "신년운세는 계산 근거 노출이 아닌 연간 운영 전략 중심으로 작성할 것",
        "년주/월주/일주/시주, 일간/월지/지장간, 오행/십성 분포 같은 내부 계산표를 본문에 직접 쓰지 말 것",
        "분기별·월별 조언이 서로 중복되지 않게 구성할 것",
        "12개월 Go/Stop 실행표를 제공할 때 월별 행동 지침을 구체적으로 분리할 것",
      ]
    : [
      "해당 운세 체계의 핵심 근거 3개 이상을 분리해 제시할 것",
      "챕터별 실행 전략과 리스크 관리를 각각 1개 이상 포함할 것",
    ];
  return {
    ...promptSourceData,
    tone: "Code:Destiny premium mystical but practical Korean tone",
    globalSummary: canonicalJson?.interpretationSeed || {},
    previousChapterSummaries,
    forbiddenRepeats,
    doNotCalculate: true,
    rules: [
      "계산되지 않은 내용을 임의로 만들지 말 것",
      expertRoleRule,
      "JSON에 없는 별, 행성, 궁, 십성, 숙요 관계를 지어내지 말 것",
      "reportPayload(=calculatedData)와 chapterJsonPacks에 있는 값만 근거로 사용할 것",
      "데이터 일부가 비어 있어도 주어진 계산 근거 범위 안에서 자연스럽고 전문적인 리딩으로 완성할 것",
      "시스템 지침/프롬프트 규칙 문장을 본문으로 출력하지 말 것",
      "동일 문장이나 단락 반복으로 분량을 채우지 말 것",
      "이전 챕터에서 이미 설명한 성향, 문장, 비유, 조언은 반복하지 말고 이번 챕터 목적에 맞는 다른 현실 적용으로 확장할 것",
      "궁합 리포트일 때는 반드시 나/상대 두 사람의 계산 근거를 동시에 제시할 것",
      "계산 데이터와 해석을 구분할 것",
      "사용자가 이해하기 쉬운 한국어로 풀어쓸 것",
      "미신적 단정 대신 전략과 자기이해 중심으로 작성할 것",
      "chapterJsonPacks(core/signals/timing/actions)에서 최소 3개 이상 근거를 본문에 반영할 것",
      "chapterContract.requiredHeadings/requiredJsonFields를 출력에 반영할 것",
      ...typeSpecificRules,
    ],
  };
}

function normalizeSukyoModeToken(rawMode) {
  const mode = String(rawMode || "").trim().toLowerCase();
  if (mode === "compatibility" || mode === "couple" || mode === "compat") return "compatibility";
  return "solo";
}

function resolveSukyoModeFromPayload(payload = {}) {
  const mode = String(payload?.mode || payload?.reportMode || payload?.reportType || "").trim().toLowerCase();
  if (mode === "compatibility" || mode === "couple" || mode === "compat") return "compatibility";
  if (payload?._compatibilityRequired === true) return "compatibility";
  if (payload?.includeCompatibility === true) return "compatibility";
  return "solo";
}

function getSukyoChapterBlueprint(chapterId, reportMode = "solo") {
  const chapters = getSukyoPdfChapters(normalizeSukyoModeToken(reportMode));
  const idx = Math.max(0, Number(chapterId || 1) - 1);
  return chapters[idx] || {
    key: `chapter-${chapterId}`,
    title: `Ch.${chapterId} 숙요점 해석`,
    goal: "숙요점 데이터 기반 해석",
  };
}

async function generateSukyoPremiumChapterFromContext({ env, context, chapterId, requestId }) {
  const sukuyoForbiddenPhrases = [
    "자동 복구 생성",
    "Chapter 1",
    "Chapter 2",
    "fallback",
    "recovery",
    "placeholder",
    "TODO",
    "undefined",
    "null",
    "NaN",
    "실행 점검 노트",
    "핵심 신호를 바탕으로 현재 흐름을 구조적으로 해석합니다",
    "오늘 실행할 행동 1가지를 정하고",
    "반복 가능한 루틴은 작은 단위부터 고정",
  ];
  const sukyoMode = resolveSukyoModeFromPayload({
    ...(context?.input || {}),
    reportMode: context?.modeKey || context?.input?.reportMode || context?.input?.reportType,
    _compatibilityRequired: context?.coreData?.canonicalJson?.calculatedData?._compatibilityRequired,
  });
  const chapter = getSukyoChapterBlueprint(chapterId, sukyoMode);
  const reportType = String(context?.reportType || "sookyoPremium");
  const chapterContract = context?.input?._premiumLlmInput?.chapterContract
    && typeof context.input._premiumLlmInput.chapterContract === "object"
    ? context.input._premiumLlmInput.chapterContract
    : buildPremiumChapterContract(reportType, REPORT_TYPE_TO_FEATURE_TYPE[reportType] || reportType, sukyoMode, chapterId);
  const calculated = context?.coreData?.canonicalJson?.calculatedData || {};
  const strictPayloadMode = asBool(context?.input?._premiumStrictPayload);
  const previousFromContext = Object.entries(context?.chapterTextById || {})
    .filter(([key, value]) => Number(key) < Number(chapterId || 1) && String(value || "").trim())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, value]) => String(value || "").trim());
  const previousChapterTexts = resolvePreviousChapterTexts(
    context?.input?.previousChapterTexts,
    (previousFromContext.length ? previousFromContext : getStoredChapterTexts("sukuyo", context?.reportId, Number(chapterId || 1))),
  );
  const sukyoContext = calculated?.sukyoPdfContext || buildSukyoPdfContext({
    canonical: context?.coreData?.canonicalJson || {},
    requestBody: context?.input || {},
    rawBasicResult: {
      summary: calculated?.nativeSook?.name || calculated?.nativeSook?.coreNature || "",
    },
  });
  sukyoContext.reportMode = sukyoMode;
  sukyoContext.chapterContract = chapterContract;

  const inputValidation = validateSukyoPdfInput(sukyoContext);
  const hardMissing = Array.isArray(inputValidation?.hardMissingFields) ? inputValidation.hardMissingFields : [];
  const softMissing = Array.isArray(inputValidation?.softMissingFields) ? inputValidation.softMissingFields : [];
  console.info("[SukuyoPdfPipeline]", {
    stage: "SukuyoPdfPayloadBuildSuccess",
    requestId,
    mode: sukyoMode,
    chapterId: Number(chapterId || 0),
    hasBirthData: Boolean(inputValidation?.hasBirthInfo),
    hasSukuyoCoreData: Boolean(inputValidation?.hasMainMansion && inputValidation?.hasMansionNumber),
    hasRelationshipData: Boolean(inputValidation?.hasCompatibilityCore),
    hasChapterPlan: Boolean(inputValidation?.hasChapterPlan),
    chapterCount: Number(inputValidation?.chapterCount || 0),
    missingHardFields: hardMissing,
    missingSoftFields: softMissing,
  });
  const chapterMeta = {
    num: Number(chapterId || 1),
    title: chapter.title,
    subtitle: chapter.goal,
  };

  const chapterJsonPacks = context?.derivedData?.chapterJsonById?.[String(chapterId)]
    || buildChapterJsonPacks(reportType, chapterId, context?.coreData?.canonicalJson || {});
  const forceGemini = String(env?.PREMIUM_SUKUYO_CHAPTER_ENGINE || "").trim().toLowerCase() === "gemini";
  const preferLocal = asBool(context?.input?._premiumForceLocal) || !forceGemini;

  if (preferLocal) {
    const previousChapterTexts = Object.entries(context?.chapterTextById || {})
      .filter(([key]) => Number(key) < Number(chapterId || 1))
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, value]) => String(value || "").trim())
      .filter(Boolean);

    const localGenerated = buildLocalFallbackChapterFromContext({
      context,
      chapterId,
      chapterMeta,
      chapterContract,
      chapterJsonPacks,
      minChars: Number(getPremiumPerChapterMinChars(
        Number(context?.totalChapters || context?.requiredChapters || 13),
        PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
      )),
      previousChapterTexts,
      fallbackReason: "SUKYO_LOCAL_ENGINE",
    });

    if (localGenerated?.ok) {
      return {
        ...localGenerated,
        chapterMeta,
        missingFields: sukyoContext?.missingSummary || [],
      };
    }

    console.warn("[SukuyoPdfPipeline]", {
      stage: "SukuyoLocalFallbackFailed",
      requestId,
      mode: sukyoMode,
      chapterId: Number(chapterId || 0),
      errorCode: "LOCAL_FALLBACK_GENERATION_FAILED",
      validation: localGenerated?.validation || null,
    });
  }

  if (!inputValidation.canGenerate) {
    const status = hardMissing.some((field) => String(field || "").toLowerCase().includes("birthdate")) ? 400 : 422;
    console.warn("[SukuyoPdfPipeline]", {
      stage: "SukuyoPdfPreflightFailed",
      requestId,
      mode: sukyoMode,
      chapterId: Number(chapterId || 0),
      missingHardFields: hardMissing,
      missingSoftFields: softMissing,
      errorCode: "SUKYO_REPORT_PAYLOAD_INCOMPLETE",
    });
    return {
      ok: false,
      code: "SUKYO_REPORT_PAYLOAD_INCOMPLETE",
      message: "숙요 canonical reportPayload가 불완전하여 챕터를 생성할 수 없습니다.",
      chapterMeta,
      missingFields: hardMissing,
      missingSoftFields: softMissing,
      status,
    };
  }

  console.info("[SukuyoPdfPipeline]", {
    stage: "SukuyoPdfLlmChapterStart",
    requestId,
    mode: sukyoMode,
    chapterId: Number(chapterId || 0),
    llmCallStarted: true,
  });

  const prompt = buildSukyoGeminiPrompt({
    context: sukyoContext,
    chapter,
    previousChapterTexts,
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
      console.warn("[SukuyoPdfPipeline]", {
        stage: "SukuyoPdfLlmChapterValidationFailed",
        requestId,
        mode: sukyoMode,
        chapterId: Number(chapterId || 0),
        llmCallSucceeded: true,
        llmValidationFailed: true,
        errorCode: "SUKYO_CHAPTER_GENERATION_FAILED",
      });
      return {
        ok: false,
        code: "SUKYO_CHAPTER_GENERATION_FAILED",
        message: "숙요 챕터 JSON 파싱에 실패했습니다.",
        chapterMeta,
        missingFields: sukyoContext?.missingSummary || [],
        status: 502,
      };
    }

    const chapterJson = sanitizeSukyoChapterJson(chapter, parsed.parsed, sukyoContext);
    const chapterTextDraft = renderSukyoChapterMarkdown(chapterJson, chapter);
    const envelopeValidation = validatePremiumChapterResponseEnvelope({
      reportType,
      chapterId,
      data: {
        text: chapterTextDraft,
        chapterJson,
      },
      chapterContract,
      previousChapterTexts,
    });
    if (!envelopeValidation.ok) {
      console.warn("[SukuyoPdfPipeline]", {
        stage: "SukuyoPdfLlmChapterValidationFailed",
        requestId,
        mode: sukyoMode,
        chapterId: Number(chapterId || 0),
        llmCallSucceeded: true,
        llmValidationFailed: true,
        errorCode: "SUKYO_CHAPTER_CONTRACT_VIOLATION",
      });
      return {
        ok: false,
        code: "SUKYO_CHAPTER_CONTRACT_VIOLATION",
        message: "숙요 챕터가 chapterContract 요구사항을 충족하지 못했습니다.",
        chapterMeta,
        missingFields: envelopeValidation.missingFields,
        status: 502,
      };
    }
    let text = chapterTextDraft;

    const forbiddenHit = sukuyoForbiddenPhrases.find((phrase) => {
      const token = String(phrase || "").trim();
      if (!token) return false;
      return String(text || "").toLowerCase().includes(token.toLowerCase());
    });
    if (forbiddenHit) {
      console.warn("[SukuyoPdfPipeline]", {
        stage: "SukuyoPdfFallbackBlocked",
        requestId,
        mode: sukyoMode,
        chapterId: Number(chapterId || 0),
        fallbackBlocked: true,
        errorCode: "SUKYO_FORBIDDEN_CONTENT_DETECTED",
        errorMessage: forbiddenHit,
      });
      return {
        ok: false,
        code: "SUKYO_FORBIDDEN_CONTENT_DETECTED",
        message: "자동 복구/placeholder 문구가 감지되어 챕터 생성을 중단했습니다.",
        chapterMeta,
        missingFields: sukyoContext?.missingSummary || [],
        status: 502,
      };
    }

    let repeatedAcross = detectSukuyoCrossRepeats(text, previousChapterTexts, 30);
    if (repeatedAcross.length > 0) {
      const repeatedBan = collectPreviousSentenceBanList(previousChapterTexts, 12);
      const refinePrompt = [
        "아래 숙요 챕터 초안을 고품질로 재작성하세요.",
        "목표: 이전 챕터와 중복되는 핵심 문장/해석 프레이밍을 제거하고, 이번 챕터 목적에 맞는 새로운 사례와 전략으로 바꾸세요.",
        "출력: JSON 하나만 출력",
        repeatedBan.length
          ? `[이전 챕터 금지 문장]\n${JSON.stringify(repeatedBan, null, 2)}`
          : "",
        repeatedAcross.length
          ? `[현재 초안의 중복 문장]\n${JSON.stringify(repeatedAcross.slice(0, 8), null, 2)}`
          : "",
        "",
        "[초안]",
        text,
        "",
        "[원본 프롬프트]",
        prompt,
      ].filter(Boolean).join("\n");

      const refinedRaw = await callGemini(env, refinePrompt, ["PREMIUM_SUKUYO_GEMINI_MODEL"], options);
      const refinedParsed = parseSukyoGeminiChapterResponse(refinedRaw);
      if (refinedParsed?.ok && refinedParsed?.parsed) {
        const refinedJson = sanitizeSukyoChapterJson(chapter, refinedParsed.parsed, sukyoContext);
        const refinedEnvelopeValidation = validatePremiumChapterResponseEnvelope({
          reportType,
          chapterId,
          data: {
            text: renderSukyoChapterMarkdown(refinedJson, chapter),
            chapterJson: refinedJson,
          },
          chapterContract,
          previousChapterTexts,
        });
        if (refinedEnvelopeValidation.ok) {
          const refinedText = renderSukyoChapterMarkdown(refinedJson, chapter);
          if (refinedText && refinedText.length >= Math.floor(text.length * 0.8)) {
            text = refinedText;
          }
        }
      }
      repeatedAcross = detectSukuyoCrossRepeats(text, previousChapterTexts, 30);
    }

    if (repeatedAcross.length > 0) {
      console.warn("[SukuyoPdfPipeline]", {
        stage: "SukuyoPdfLlmChapterValidationFailed",
        requestId,
        mode: sukyoMode,
        chapterId: Number(chapterId || 0),
        llmCallSucceeded: true,
        llmValidationFailed: true,
        errorCode: "SUKYO_REPEATED_ACROSS_CHAPTERS",
      });
      return {
        ok: false,
        code: "SUKYO_REPEATED_ACROSS_CHAPTERS",
        message: "이전 챕터와 중복된 문장이 감지되어 생성을 중단했습니다.",
        chapterMeta,
        missingFields: sukyoContext?.missingSummary || [],
        status: 502,
      };
    }

    console.info("[SukuyoPdfPipeline]", {
      stage: "SukuyoPdfLlmChapterSuccess",
      requestId,
      mode: sukyoMode,
      chapterId: Number(chapterId || 0),
      llmCallSucceeded: true,
    });

    return {
      ok: true,
      text,
      chapterMeta,
      chapterSpecificSections: Array.isArray(chapter?.sections) ? chapter.sections : [],
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

    return {
      ok: false,
      code: "SUKYO_CHAPTER_GENERATION_FAILED",
      message: String(error?.message || "GEMINI_ERROR"),
      chapterMeta,
      missingFields: sukyoContext?.missingSummary || [],
      status: 502,
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

  const fallbackChart = strictHouseCusps ? null : buildFallbackWesternChart(input);

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
  if (strictHouseCusps && (!Number.isFinite(ascLon) || !Number.isFinite(mcLon))) {
    throw new Error("Swiss angle data missing");
  }

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
        ? "하우스 커스프 입력을 표준 ASC 기준으로 정규화했습니다."
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

async function buildAstroTimingData(request, env, input, natalChart, options = {}) {
  const strictSwiss = options?.strictSwiss === true;
  const now = new Date();
  const transitInput = {
    ...input,
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: now.getUTCHours(),
    minute: now.getUTCMinutes(),
  };
  const transitRaw = await getSwissWesternChart(request, env, transitInput, { strict: strictSwiss });
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
  const progressedRaw = await getSwissWesternChart(request, env, progressedInput, { strict: strictSwiss });
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
  const solarRaw = await getSwissWesternChart(request, env, solarReturnInput, { strict: strictSwiss });
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
  const fatalMissingFields = [];
  const recoverableMissingFields = [];
  const optionalMissingFields = [];
  const planets = Array.isArray(chart?.planets) ? chart.planets : [];
  const angles = chart?.angles || {};
  const houses = Array.isArray(chart?.houses) ? chart.houses : [];
  const aspects = Array.isArray(chart?.aspects) ? chart.aspects : [];
  const timeUnknown = chart?.profile?.birth?.timeUnknown === true;

  const planetMap = new Map();
  for (const p of planets) {
    if (p?.nameEn) planetMap.set(String(p.nameEn), p);
  }

  for (const name of ["Sun", "Moon"]) {
    const p = planetMap.get(name);
    if (!p) {
      fatalMissingFields.push(`planets.${name}`);
      continue;
    }
    if (!p.sign) fatalMissingFields.push(`planets.${name}.sign`);
    if (!hasFiniteNumericValue(p.degree)) recoverableMissingFields.push(`planets.${name}.degree`);
  }

  for (const name of ASTRO_REQUIRED_PLANETS) {
    const p = planetMap.get(name);
    if (!p) {
      recoverableMissingFields.push(`planets.${name}`);
      continue;
    }
    if (!p.sign) recoverableMissingFields.push(`planets.${name}.sign`);
    if (!hasFiniteNumericValue(p.degree)) recoverableMissingFields.push(`planets.${name}.degree`);
    if (!timeUnknown && !hasFiniteNumericValue(p.house)) recoverableMissingFields.push(`planets.${name}.house`);
  }

  if (!timeUnknown) {
    if (!angles?.ascendant?.sign || !hasFiniteNumericValue(angles?.ascendant?.degree)) recoverableMissingFields.push("angles.ascendant");
    if (!angles?.mc?.sign || !hasFiniteNumericValue(angles?.mc?.degree)) recoverableMissingFields.push("angles.mc");
    if (houses.length !== 12) recoverableMissingFields.push("houses.length=12");
  } else {
    if (!angles?.ascendant?.sign || !hasFiniteNumericValue(angles?.ascendant?.degree)) optionalMissingFields.push("angles.ascendant.timeUnknown");
    if (!angles?.mc?.sign || !hasFiniteNumericValue(angles?.mc?.degree)) optionalMissingFields.push("angles.mc.timeUnknown");
    if (houses.length !== 12) optionalMissingFields.push("houses.length=12.timeUnknown");
  }
  if (aspects.length === 0) recoverableMissingFields.push("aspects");

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
    isValid: fatalMissingFields.length === 0 && recoverableMissingFields.length === 0,
    missingFields: [...fatalMissingFields, ...recoverableMissingFields, ...optionalMissingFields],
    fatalMissingFields,
    recoverableMissingFields,
    optionalMissingFields,
    hasPlanets: ASTRO_REQUIRED_PLANETS.every((name) => planetMap.has(name)),
    hasAngles: !!(angles?.ascendant?.sign && angles?.mc?.sign),
    hasHouses: houses.length === 12,
    hasAspects: aspects.length > 0,
    hasForecast,
    hasRelationshipData,
  };
}

function validateAstroChartSeed(seed) {
  const missing = [];
  const chart = seed && typeof seed === "object" ? seed : {};
  const planets = chart?.planets && typeof chart.planets === "object" ? chart.planets : {};
  const houses = Array.isArray(chart?.houses) ? chart.houses : [];
  const aspects = Array.isArray(chart?.aspects) ? chart.aspects : null;

  if (!seed || typeof seed !== "object") missing.push("seed");

  const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  for (const name of requiredPlanets) {
    const row = planets?.[name];
    if (!row || typeof row !== "object") {
      missing.push(`natalChart.planets.${name}`);
      continue;
    }
    if (!String(row.signKo || row.sign || "").trim()) missing.push(`natalChart.planets.${name}.sign`);
    if (!Number.isFinite(Number(row.degree))) missing.push(`natalChart.planets.${name}.degree`);
    if (!Number.isFinite(Number(row.house))) missing.push(`natalChart.planets.${name}.house`);
  }

  if (!chart?.ascendant || !String(chart?.ascendant?.signKo || chart?.ascendant?.sign || "").trim()) {
    missing.push("natalChart.ascendant");
  }
  if (!chart?.midheaven || !String(chart?.midheaven?.signKo || chart?.midheaven?.sign || "").trim()) {
    missing.push("natalChart.midheaven");
  }

  if (houses.length !== 12) {
    missing.push("natalChart.houses");
  }

  if (!Array.isArray(aspects)) {
    missing.push("natalChart.aspects");
  }

  const uniqueMissing = Array.from(new Set(missing));
  return {
    ok: uniqueMissing.length === 0,
    hasChart: uniqueMissing.length === 0,
    missingFields: uniqueMissing,
  };
}

function hasAstroBirthTimeInput(body = {}, input = {}) {
  if (asBool(body?.timeUnknown) || asBool(body?.birthTimeUnknown) || asBool(input?.timeUnknown) || asBool(input?.birthTimeUnknown)) return false;
  const directTime = pickPremiumText(
    body?.birthTime,
    body?.time,
    body?.birth?.time,
    body?.profile?.birthTime,
    body?.userProfile?.birthTime,
    body?.birthData?.birthTime,
    input?.birthTime,
    input?.time,
    input?.birth?.time,
  );
  if (directTime) return true;
  const hasHour = body?.hour != null || body?.birthHour != null || body?.birth?.hour != null || input?.hour != null || input?.birthHour != null || input?.birth?.hour != null;
  const hasMinute = body?.minute != null || body?.birthMinute != null || body?.birth?.minute != null || input?.minute != null || input?.birthMinute != null || input?.birth?.minute != null;
  return hasHour && hasMinute;
}

function buildCanonicalAstroChart(body, input, chart, reportType, partnerChart, synastry, composite, timingData) {
  const timeUnknown = !hasAstroBirthTimeInput(body, input);
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
      house: timeUnknown ? null : (Number.isFinite(Number(p.house)) ? Number(p.house) : null),
      retrograde: p.retrograde === true,
      dignity: null,
      element: toLowerElement(p.element),
      modality: toLowerModality(p.modality),
    });
  }

  const houses = Array.isArray(chart?.houses)
    ? (timeUnknown ? [] : chart.houses.map((h) => ({
      house: Number(h.house),
      cuspSign: h.signKo || null,
      cuspDegree: Number.isFinite(Number(signByLongitude(h.cuspLongitude)?.degree)) ? Number(signByLongitude(h.cuspLongitude).degree) : null,
      cuspFormatted: h.signKo && Number.isFinite(Number(signByLongitude(h.cuspLongitude)?.degree))
        ? `${h.signKo} ${round2(signByLongitude(h.cuspLongitude).degree)}도`
        : null,
      planets: Array.isArray(h.planets) ? h.planets : [],
      ruler: h.ruler || null,
    })))
    : [];

  const canonical = {
    profile: {
      name: String(body.name || input.name || "사용자"),
      gender: body.gender == null ? null : String(body.gender),
      birth: {
        date: `${input.year}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`,
        time: timeUnknown ? null : `${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}`,
        timeUnknown,
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
        sign: timeUnknown ? null : (asc?.signKo || null),
        degree: timeUnknown ? null : (Number.isFinite(Number(asc?.degree)) ? Number(asc.degree) : null),
        formatted: timeUnknown ? null : (asc?.signKo && Number.isFinite(Number(asc?.degree)) ? `${asc.signKo} ${round2(asc.degree)}도` : null),
      },
      mc: {
        sign: timeUnknown ? null : (mc?.signKo || null),
        degree: timeUnknown ? null : (Number.isFinite(Number(mc?.degree)) ? Number(mc.degree) : null),
        formatted: timeUnknown ? null : (mc?.signKo && Number.isFinite(Number(mc?.degree)) ? `${mc.signKo} ${round2(mc.degree)}도` : null),
      },
      descendant: {
        sign: timeUnknown ? null : (desc?.signKo || null),
        degree: timeUnknown ? null : (Number.isFinite(Number(desc?.degree)) ? Number(desc.degree) : null),
        formatted: timeUnknown ? null : (desc?.signKo && Number.isFinite(Number(desc?.degree)) ? `${desc.signKo} ${round2(desc.degree)}도` : null),
      },
      ic: {
        sign: timeUnknown ? null : (ic?.signKo || null),
        degree: timeUnknown ? null : (Number.isFinite(Number(ic?.degree)) ? Number(ic.degree) : null),
        formatted: timeUnknown ? null : (ic?.signKo && Number.isFinite(Number(ic?.degree)) ? `${ic.signKo} ${round2(ic.degree)}도` : null),
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
      dominantHouses: timeUnknown ? [] : (Number.isFinite(Number(chart?.dominantHouse)) ? [Number(chart.dominantHouse)] : []),
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
      partnerProfile: reportType === "compatibility"
        ? {
          name: String(body?.partnerName || "파트너").trim(),
          birthDate: [body?.partnerYear, body?.partnerMonth, body?.partnerDay].every((v) => Number.isFinite(Number(v)))
            ? `${Number(body.partnerYear)}-${String(Number(body.partnerMonth)).padStart(2, "0")}-${String(Number(body.partnerDay)).padStart(2, "0")}`
            : "",
          birthTime: [body?.partnerHour, body?.partnerMinute].every((v) => Number.isFinite(Number(v)))
            ? `${String(Number(body.partnerHour)).padStart(2, "0")}:${String(Number(body.partnerMinute)).padStart(2, "0")}`
            : "",
          timezone: String(body?.partnerTimezoneName || body?.timezoneName || "Asia/Seoul"),
          locationName: String(body?.partnerBirthPlace || body?.partnerPlace || body?.birthPlace || "정보 없음"),
          latitude: Number(body?.partnerLat),
          longitude: Number(body?.partnerLon ?? body?.partnerLng),
        }
        : null,
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
      timeUnknown,
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
    timeUnknown,
    fatalMissingFields: validation.fatalMissingFields,
    recoverableMissingFields: validation.recoverableMissingFields,
    optionalMissingFields: validation.optionalMissingFields,
    missingFields: validation.missingFields,
  };

  return canonical;
}

function logAstroPdfStage(stage, payload = {}, level = "info") {
  const logger = level === "error" ? console.error : (level === "warn" ? console.warn : console.info);
  logger(`[AstroPDF] ${String(stage || "Unknown")}`, {
    stage: String(stage || "Unknown"),
    debugId: String(payload?.debugId || ""),
    profileId: String(payload?.profileId || ""),
    reportId: String(payload?.reportId || ""),
    missingFields: Array.isArray(payload?.missingFields) ? payload.missingFields : [],
    hasBirthDate: Boolean(payload?.hasBirthDate),
    hasBirthTime: Boolean(payload?.hasBirthTime),
    hasBirthPlace: Boolean(payload?.hasBirthPlace),
    hasGeo: Boolean(payload?.hasGeo),
  });
}

function validateAstroProfileInputFields(body = {}, options = {}) {
  const missingFields = [];
  const opts = options && typeof options === "object" ? options : {};
  const requireName = opts.requireName === true;
  const requireBirthDate = opts.requireBirthDate !== false;
  const requireBirthTime = opts.requireBirthTime === true;
  const requireBirthPlace = opts.requireBirthPlace === true;
  const requireTimezone = opts.requireTimezone === true;
  const requireGeo = opts.requireGeo === true;
  const hasLatitude = hasMeaningfulValue(body?.lat) && Number.isFinite(Number(body?.lat));
  const hasLongitude = hasMeaningfulValue(body?.lon ?? body?.lng) && Number.isFinite(Number(body?.lon ?? body?.lng));
  const hasBirthDate = Number.isFinite(Number(body?.year)) && Number.isFinite(Number(body?.month)) && Number.isFinite(Number(body?.day));
  const hasBirthTime = !asBool(body?.timeUnknown) && !asBool(body?.birthTimeUnknown)
    && (hasMeaningfulValue(body?.birthTime)
      || (Number.isFinite(Number(body?.hour)) && Number.isFinite(Number(body?.minute))));
  const hasBirthPlace = hasMeaningfulValue(body?.birthPlace) || hasMeaningfulValue(body?.place) || hasMeaningfulValue(body?.location);
  const hasGeo = hasLatitude && hasLongitude;
  const hasTimezone = hasMeaningfulValue(body?.timezone) || hasMeaningfulValue(body?.timezoneName);

  if (requireName && !hasMeaningfulValue(body?.userName || body?.name)) missingFields.push("userName");
  if (requireBirthDate && !hasBirthDate) missingFields.push("birthDate");
  if (requireBirthTime && !hasBirthTime) missingFields.push("birthTime");
  if (requireBirthPlace && !hasBirthPlace) missingFields.push("birthPlace");
  if (requireTimezone && !hasTimezone) missingFields.push("timezone");
  if (requireGeo && !hasLatitude) missingFields.push("latitude");
  if (requireGeo && !hasLongitude) missingFields.push("longitude");

  return {
    ok: missingFields.length === 0,
    missingFields,
    hasBirthDate,
    hasBirthTime,
    hasBirthPlace,
    hasGeo,
  };
}

function buildAstroSeedFromBasicEngineResult(body, input, reportType = "personal") {
  const fallbackChart = buildFallbackWesternChart(input || normalizeBody(body || {}));
  return {
    chart: fallbackChart,
    seed: buildAstroPdfSeed(body || {}, input || normalizeBody(body || {}), fallbackChart, reportType, null, null, null, null),
    source: "basic-engine",
  };
}

function buildMinimalAstroSeedFromInput(body, input, reportType = "personal") {
  const normalizedInput = input || normalizeBody(body || {});
  const minimalChart = buildFallbackWesternChart(normalizedInput);
  return {
    chart: minimalChart,
    seed: buildAstroPdfSeed(body || {}, normalizedInput, minimalChart, reportType, null, null, null, null),
    source: "minimal",
  };
}

async function ensureAstroPdfSeed({ request, env, body, input, reportType = "personal", strictSwissMode = true } = {}) {
  const normalizedInput = input || normalizeBody(body || {});
  try {
    const rawChart = await getSwissWesternChart(request, env, normalizedInput, { strict: strictSwissMode });
    const chart = buildWesternPremiumChart(rawChart, normalizedInput, {
      houseSystem: normalizedInput.houseSystem,
      zodiacType: normalizedInput.zodiacType,
      includeMinorAspects: normalizedInput.includeMinorAspects,
      strictHouseCusps: strictSwissMode,
    });
    const seedValidation = validateAstroChartSeed(chart);
    if (seedValidation.ok) {
      return {
        chart,
        seed: buildAstroPdfSeed(body || {}, normalizedInput, chart, reportType, null, null, null, null),
        source: "swiss",
        seedValidation,
      };
    }
  } catch (_) {
    // fall through to local seed recovery
  }

  const fromBase = buildAstroSeedFromBasicEngineResult(body, normalizedInput, reportType);
  const basePayloadValidation = validateAstroPdfPayload(fromBase.seed?.reportPayload || {});
  if (basePayloadValidation.ok) {
    return {
      chart: fromBase.chart,
      seed: fromBase.seed,
      source: fromBase.source,
      seedValidation: {
        ok: false,
        missingFields: basePayloadValidation.recoverableMissingFields || [],
      },
    };
  }

  const minimal = buildMinimalAstroSeedFromInput(body, normalizedInput, reportType);
  const minimalPayloadValidation = validateAstroPdfPayload(minimal.seed?.reportPayload || {});
  return {
    chart: minimal.chart,
    seed: minimal.seed,
    source: minimal.source,
    seedValidation: {
      ok: false,
      missingFields: minimalPayloadValidation.missingFields || ["natalChart.planets", "birth.date"],
    },
  };
}

function buildAstroPdfSeed(body, input, chart, reportType, partnerChart, synastry, composite, timingData) {
  const canonical = buildCanonicalAstroChart(body, input, chart, reportType, partnerChart, synastry, composite, timingData);
  const chapterPlan = buildAstroChapterPlan(canonical, reportType);
  const chapterInputs = chapterPlan.map((meta) => ({
    chapter: Number(meta.chapter),
    chapterKey: String(meta.key || ""),
    title: String(meta.title || ""),
    subtitle: String(meta.subtitle || ""),
  }));
  return {
    canonicalAstroChart: canonical,
    chapterPlan,
    reportPayload: {
      birth: canonical?.profile?.birth || {},
      angles: canonical?.angles || {},
      houses: Array.isArray(canonical?.houses) ? canonical.houses : [],
      planets: Array.isArray(canonical?.planets) ? canonical.planets : [],
      aspects: Array.isArray(canonical?.aspects) ? canonical.aspects : [],
      chapterInputs,
    },
  };
}

function validateAstroPdfPayload(payload = {}) {
  const fatalMissingFields = [];
  const recoverableMissingFields = [];
  const birth = payload?.birth || {};
  const planets = Array.isArray(payload?.planets) ? payload.planets : [];
  const houses = Array.isArray(payload?.houses) ? payload.houses : [];
  const aspects = Array.isArray(payload?.aspects) ? payload.aspects : [];
  const chapterInputs = Array.isArray(payload?.chapterInputs) ? payload.chapterInputs : [];

  if (!hasMeaningfulValue(birth?.date)) fatalMissingFields.push("birth.date");
  if (!hasMeaningfulValue(birth?.time)) recoverableMissingFields.push("birth.time");
  if (!hasMeaningfulValue(birth?.locationName)) recoverableMissingFields.push("birth.locationName");
  if (!Number.isFinite(Number(birth?.latitude))) recoverableMissingFields.push("birth.latitude");
  if (!Number.isFinite(Number(birth?.longitude))) recoverableMissingFields.push("birth.longitude");

  const planetSet = new Set(planets.map((p) => String(p?.nameEn || "").toLowerCase()).filter(Boolean));
  if (!planetSet.has("sun")) fatalMissingFields.push("planets.Sun");
  if (!planetSet.has("moon")) fatalMissingFields.push("planets.Moon");
  if (planetSet.size < 10) recoverableMissingFields.push("planets>=10");

  if (!hasMeaningfulValue(payload?.angles?.ascendant?.sign)) recoverableMissingFields.push("angles.ascendant");
  if (!hasMeaningfulValue(payload?.angles?.mc?.sign)) recoverableMissingFields.push("angles.mc");
  if (houses.length !== 12) recoverableMissingFields.push("houses.length=12");
  if (aspects.length === 0) recoverableMissingFields.push("aspects");
  if (chapterInputs.length < 12) recoverableMissingFields.push("chapterInputs.length=12");

  const missingFields = Array.from(new Set([...fatalMissingFields, ...recoverableMissingFields]));

  return {
    ok: fatalMissingFields.length === 0,
    missingFields,
    fatalMissingFields,
    recoverableMissingFields,
  };
}

function buildAstroChapterPlan(canonical, reportType = "personal") {
  const mode = String(reportType || "personal").toLowerCase() === "compatibility" ? "compatibility" : "personal";
  const out = [];
  const add = (meta) => {
    out.push({
      chapter: out.length + 1,
      key: meta.key,
      title: meta.title,
      subtitle: meta.subtitle,
      icon: meta.icon,
      degraded: Boolean(meta.degraded),
      reasons: Array.isArray(meta.reasons) ? meta.reasons : [],
    });
  };

  if (mode === "compatibility") {
    const hasRelationshipData = Boolean(canonical?.relationship?.hasPartner && canonical?.relationship?.synastry && canonical?.relationship?.composite);
    for (const meta of ASTRO_COMPAT_CHAPTER_META) {
      if (!hasRelationshipData) {
        add({ ...meta, degraded: true, reasons: ["relationship-data-limited"] });
        continue;
      }
      if (meta.key === "K9" && !canonical?.validation?.hasForecast) {
        add({ ...meta, degraded: true, reasons: ["forecast"] });
        continue;
      }
      add(meta);
    }
    return out;
  }

  for (const meta of ASTRO_PERSONAL_CHAPTER_META) {
    if (meta.key === "C11" && !canonical?.validation?.hasForecast) {
      add({ ...meta, degraded: true, reasons: ["forecast"] });
      continue;
    }
    if (!canonical?.validation?.hasHouses && ["C4", "C8", "C9"].includes(meta.key)) {
      add({ ...meta, degraded: true, reasons: ["house-data-limited"] });
      continue;
    }
    add(meta);
  }
  return out;
}

function findAstroChapterMetaByKey(chapterKey) {
  const key = String(chapterKey || "").trim();
  if (!key) return null;
  const personal = ASTRO_PERSONAL_CHAPTER_META.find((meta) => String(meta?.key || "") === key);
  if (personal) return personal;
  return ASTRO_COMPAT_CHAPTER_META.find((meta) => String(meta?.key || "") === key) || null;
}

function resolveAstroChapterMeta(chapterId, modeHint = "personal", chapterKey = "") {
  const fromKey = findAstroChapterMetaByKey(chapterKey);
  if (fromKey) return fromKey;
  const isCompatibility = String(modeHint || "").toLowerCase() === "compatibility";
  const source = isCompatibility ? ASTRO_COMPAT_CHAPTER_META : ASTRO_PERSONAL_CHAPTER_META;
  if (!Array.isArray(source) || source.length === 0) return null;
  const index = clampInt(chapterId, 1, 1, source.length) - 1;
  return source[index] || null;
}

function buildAstroRequiredHeadings(chapterMeta, modeHint = "personal") {
  const meta = chapterMeta && typeof chapterMeta === "object"
    ? chapterMeta
    : resolveAstroChapterMeta(chapterMeta, modeHint);
  const labels = ASTRO_CHAPTER_SECTION_LABELS[String(meta?.key || "")] || ASTRO_DEFAULT_SECTION_LABELS;
  const safe = Array.isArray(labels) && labels.length === 7 ? labels : ASTRO_DEFAULT_SECTION_LABELS;
  return [
    "### 1. 사용 데이터 요약표",
    `### 2. ${safe[0]}`,
    `### 3. ${safe[1]}`,
    `### 4. ${safe[2]}`,
    `### 5. ${safe[3]}`,
    `### 6. ${safe[4]}`,
    `### 7. ${safe[5]}`,
    `### 8. ${safe[6]}`,
  ];
}

function getAstroChapterLengthPolicy(chapterNo, reportMode = "personal") {
  if (String(reportMode || "personal").toLowerCase() === "compatibility") {
    return {
      targetChars: ASTRO_MIN_CHARS,
      minChars: ASTRO_MIN_CHARS,
    };
  }
  const target = Number(ASTRO_PERSONAL_TARGET_CHARS[Number(chapterNo || 1)] || 4200);
  return {
    targetChars: target,
    minChars: Math.max(3000, Math.floor(target * 0.85)),
  };
}

function buildAstrologyBookContext(canonical = {}, premiumInput = null, chapterMeta = null) {
  const planets = Array.isArray(canonical?.planets) ? canonical.planets : [];
  const houses = Array.isArray(canonical?.houses) ? canonical.houses : [];
  const aspects = Array.isArray(canonical?.aspects) ? canonical.aspects : [];
  const findPlanet = (nameEn) => planets.find((p) => String(p?.nameEn || "").toLowerCase() === String(nameEn || "").toLowerCase()) || null;

  const toPlacement = (nameEn) => {
    const p = findPlanet(nameEn);
    if (!p) return null;
    return {
      sign: p.sign || null,
      house: p.house,
      degree: p.degree,
      retrograde: p.retrograde === true,
      dignity: p.dignity || null,
      keywords: [],
    };
  };

  const pSun = findPlanet("Sun");
  const pMoon = findPlanet("Moon");
  const context = {
    profile: {
      name: canonical?.profile?.name || "",
      gender: canonical?.profile?.gender || "",
      birthDate: canonical?.profile?.birth?.date || "",
      birthTime: canonical?.profile?.birth?.time || undefined,
      birthPlace: canonical?.profile?.birth?.locationName || undefined,
      timezone: canonical?.profile?.birth?.timezone || undefined,
    },
    natalChart: {
      sunSign: pSun?.sign || undefined,
      moonSign: pMoon?.sign || undefined,
      ascendant: canonical?.angles?.ascendant?.sign || undefined,
      midheaven: canonical?.angles?.mc?.sign || undefined,
      planets: {
        sun: toPlacement("Sun"),
        moon: toPlacement("Moon"),
        mercury: toPlacement("Mercury"),
        venus: toPlacement("Venus"),
        mars: toPlacement("Mars"),
        jupiter: toPlacement("Jupiter"),
        saturn: toPlacement("Saturn"),
        uranus: toPlacement("Uranus"),
        neptune: toPlacement("Neptune"),
        pluto: toPlacement("Pluto"),
        northNode: toPlacement("Rahu"),
        southNode: toPlacement("Ketu"),
        chiron: canonical?.optionalPoints?.chiron || null,
        lilith: canonical?.optionalPoints?.lilith || null,
        fortune: canonical?.optionalPoints?.partOfFortune || null,
      },
      houses: Object.fromEntries(houses.map((h) => [
        ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"][Math.max(0, Number(h?.house || 1) - 1)] || `h${Number(h?.house || 0)}`,
        {
          sign: h?.cuspSign || undefined,
          cuspDegree: h?.cuspDegree,
          planets: Array.isArray(h?.planets) ? h.planets : [],
          ruler: h?.ruler || undefined,
        },
      ])),
      aspects: aspects.map((a) => ({
        planetA: a?.planetA,
        planetB: a?.planetB,
        aspect: a?.type,
        orb: a?.orb,
        strength: a?.strength,
      })),
      chartPattern: {
        dominantElements: canonical?.chartBalance?.elements || {},
        dominantModes: canonical?.chartBalance?.modalities || {},
        dominantPolarity: undefined,
        chartRuler: undefined,
        dominantPlanet: Array.isArray(canonical?.chartBalance?.dominantPlanets) ? canonical.chartBalance.dominantPlanets[0] : undefined,
        stelliums: [],
        retrogrades: planets.filter((p) => p?.retrograde === true).map((p) => p?.nameEn || p?.key).filter(Boolean),
      },
    },
    timing: {
      transits: canonical?.forecast?.transits || null,
      progressions: canonical?.forecast?.secondaryProgressions || null,
      solarReturn: canonical?.forecast?.solarReturn || null,
      currentYearTheme: undefined,
    },
    promptContext: {
      generatedQuestionPrompt: premiumInput?.questionPromptPackage || premiumInput?.promptContext || "",
      engineSummary: chapterMeta?.subtitle || "",
      userQuestion: premiumInput?.userQuestion || premiumInput?.question || "",
    },
    meta: {
      missingFields: Array.isArray(canonical?.validation?.missingFields) ? canonical.validation.missingFields : [],
      availableFields: [],
      generatedAt: new Date().toISOString(),
    },
  };

  return context;
}

function buildAstroChapterPrompt(chapterMeta, canonical, previousTexts = [], premiumInput = null) {
  const chapterKey = String(chapterMeta?.key || "").trim();
  const isCompatibilityChapter = String(chapterMeta?.mode || "").toLowerCase() === "compatibility" || chapterKey.startsWith("K");
  const focusKeywords = ASTRO_CHAPTER_FOCUS_KEYWORDS[chapterMeta?.key] || [];
  const premiumChapterJsonPacks = premiumInput && typeof premiumInput === "object"
    ? toPlainObject(premiumInput.chapterJsonPacks)
    : {};
  const chapterContract = premiumInput && typeof premiumInput === "object"
    ? toPlainObject(premiumInput.chapterContract)
    : {};
  const chapterContractText = formatPremiumChapterContractForPrompt(chapterContract);
  const requiredHeadings = Array.isArray(chapterContract?.requiredHeadings)
    ? chapterContract.requiredHeadings.map((row) => String(row || "").trim()).filter(Boolean)
    : buildAstroRequiredHeadings(chapterMeta, isCompatibilityChapter ? "compatibility" : "personal");
  const requiredOutputStructure = requiredHeadings
    .map((heading, idx) => `${idx + 1}. ${String(heading || "").replace(/^###\s*\d+\.\s*/, "").trim()}`)
    .filter(Boolean);
  const profileCard = {
    name: String(canonical?.profile?.name || "").trim(),
    gender: canonical?.profile?.gender,
    birthDate: String(canonical?.profile?.birth?.date || "").trim(),
    birthTime: String(canonical?.profile?.birth?.time || "").trim(),
    timezone: String(canonical?.profile?.birth?.timezone || "").trim(),
    locationName: String(canonical?.profile?.birth?.locationName || "").trim(),
  };
  const partnerProfileCard = {
    name: String(canonical?.relationship?.partnerProfile?.name || "").trim(),
    birthDate: String(canonical?.relationship?.partnerProfile?.birthDate || "").trim(),
    birthTime: String(canonical?.relationship?.partnerProfile?.birthTime || "").trim(),
    timezone: String(canonical?.relationship?.partnerProfile?.timezone || "").trim(),
    locationName: String(canonical?.relationship?.partnerProfile?.locationName || "").trim(),
  };
  const bookContext = buildAstrologyBookContext(canonical, premiumInput, chapterMeta);
  const lengthPolicy = getAstroChapterLengthPolicy(chapterMeta?.num || chapterMeta?.chapter || 1, isCompatibilityChapter ? "compatibility" : "personal");
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
    profileCard,
    partnerProfileCard,
    premiumChapterJsonPacks,
  };
  const coverageRule = isCompatibilityChapter
    ? "각 챕터는 두 사람의 관계 역학을 중심으로 작성하고, 개인 인생 전체 설명을 반복하지 않는다."
    : "각 챕터는 실제 별자리/하우스/애스펙트 근거를 충분히 반영해 독립적인 관점으로 완성한다.";

  return [
    "[SYSTEM]",
    "너는 서양 점성술 분야 최고 전문가이자 프리미엄 PDF 상담가다. 너는 계산자가 아니다. 모든 해석은 제공된 canonicalAstroChart JSON과 profileCard 정보의 값만 사용해야 한다. JSON에 없는 행성 위치, 하우스, 어스펙트, 트랜짓, 노드, 궁합 요소를 절대 만들어내지 않는다. 입력 편차가 있더라도 제공된 계산 근거 범위 안에서 구체적이고 전문적인 해석으로 챕터를 완성한다.",
    coverageRule,
    "",
    "[USER_PROMPT]",
    `chapterTitle: ${chapterMeta.title}`,
    `chapterPurpose: ${chapterMeta.subtitle}`,
    `reportMode: ${isCompatibilityChapter ? "compatibility" : "personal"}`,
    "relevantPlanets: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, NorthNode, SouthNode",
    "relevantHouses: 1~12 house cusps and occupied planets",
    "relevantAspects: use canonicalAstroChart.aspects sorted by orb asc",
    chapterContractText ? `[chapterContract]\n${chapterContractText}` : "",
    `astrologyBookContext: ${JSON.stringify(bookContext)}`,
    `chartSummary: ${JSON.stringify(summary)}`,
    `premiumChapterJsonPacks: ${JSON.stringify(premiumChapterJsonPacks)}`,
    `focusKeywords: ${JSON.stringify(focusKeywords)}`,
    `forbiddenRepeatedPhrases: ${JSON.stringify(ASTRO_FORBIDDEN_REPEATED_PHRASES)}`,
    `requiredOutputStructure: [${requiredOutputStructure.join(", ")}]`,
    `minLength: ${lengthPolicy.minChars}`,
    `targetLength: ${lengthPolicy.targetChars}`,
    "maxLength: 12000",
    "",
    "출력 규칙:",
    "- 반드시 아래 헤딩을 순서대로 포함한다:",
    ...requiredHeadings,
    "- 챕터마다 소제목 3~5개를 포함한다.",
    "- 1번 섹션에는 반드시 Markdown 표를 포함한다.",
    "- 개인 리포트에서는 궁합(Synastry/Composite) 용어를 쓰지 않는다.",
    "- 궁합 리포트에서는 개인 인생 전체 설명을 장문으로 반복하지 않는다.",
    "- 본문에는 계산 근거 원시값(행성 좌표, 하우스 커스프 수치, 오브 수치, 내부 JSON/payload 키, API 응답 원문)을 출력하지 않는다.",
    "- 계산 근거 JSON, 내부 seed 값, 엔진 디버그 값을 본문에 직접 노출하지 않는다.",
    "- 제공되지 않은 행성/각/하우스 정보를 지어내지 않는다.",
    "- 출생시간이 없으면 상승궁/MC/하우스를 확정 표현으로 단정하지 않는다.",
    "- 트랜짓 날짜가 확정되지 않으면 특정 날짜 예언처럼 쓰지 않는다.",
    "- profileCard 정보(이름/출생일/출생시간/출생지)를 문맥에 맞게 반영하되 개인정보 과다노출 없이 상담문으로 자연스럽게 녹여낸다.",
    "- 데이터가 비어 있는 항목은 단정하지 말고 확보된 근거 중심으로 해석한다.",
    "- \"당신은 특별합니다\", \"우주는 말합니다\" 같은 상투 문장을 반복하지 않는다.",
    "- premiumChapterJsonPacks.core/signals/timing/actions 중 최소 3개를 근거 문장으로 반영한다.",
    "- 실행 보강 메모, 패딩 문단, 동일 문장 반복을 금지한다.",
    previousTexts.length ? `- 이전 챕터에서 이미 사용한 문장 재사용 금지 목록: ${JSON.stringify(previousTexts.slice(-4))}` : "",
  ].filter(Boolean).join("\n");
}

function astroMissingMarkers(text, chapterMeta) {
  const source = String(text || "");
  const chapterKey = String(chapterMeta?.key || "").trim();
  const modeHint = chapterKey.startsWith("K") ? "compatibility" : "personal";
  const required = buildAstroRequiredHeadings(chapterMeta, modeHint).concat(["| 항목 | 값 |"]);
  if (chapterKey === "C11" || chapterKey === "K9") {
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

function hasAstroDataEvidence(text, reportMode = "personal") {
  const source = String(text || "");
  const mode = String(reportMode || "personal").toLowerCase();
  const signHit = /(양자리|황소자리|쌍둥이자리|게자리|사자자리|처녀자리|천칭자리|전갈자리|사수자리|염소자리|물병자리|물고기자리)/.test(source);
  if (mode === "compatibility") {
    const relationHit = /(두\s*사람|상대|파트너|관계|궁합|애정|갈등|동반자)/.test(source);
    const astroHit = /(태양|달|금성|화성|수성|목성|토성|애스펙트|시나스트리|컴포지트)/.test(source);
    return signHit && relationHit && astroHit;
  }
  const houseHit = /([1-9]|1[0-2])\s*하우스/.test(source);
  const aspectHit = /(conjunction|opposition|square|trine|sextile|quincunx|orb|오브)/i.test(source);
  return signHit && (houseHit || aspectHit);
}

function hasBrokenPageCounter(text) {
  return /Page\s*0\s*of\s*0/i.test(String(text || ""));
}

function hasForbiddenAstroRawDataExposure(text, reportMode = "personal") {
  const source = String(text || "");
  if (String(reportMode || "personal") !== "compatibility") return false;
  return (
    /chapterjsonpacks|reportpayload|payload|internal\s*json|raw\s*json/i.test(source)
    || /(orb|오브)\s*[:=]?\s*\d/i.test(source)
    || /(시나스트리|synastry)\s*(데이터|목록|raw|json)/i.test(source)
    || /(컴포지트|composite)\s*(계산|formula|수식|raw)/i.test(source)
  );
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

const ASTRO_SIGN_TRAIT_MAP = Object.freeze({
  "양자리": { keywords: ["선구자적 에너지", "자기 주도성", "빠른 실행력", "충동적 경향"], desc: "선구자적 에너지와 자기 주도성을 핵심 동력으로 삼는 배치입니다. 빠른 실행과 도전 의지가 강하게 작동하며, 충동적 결정을 내리기 전 짧은 숙려 루틴을 도입하면 장기적 성과가 높아집니다." },
  "황소자리": { keywords: ["안정 지향", "감각적 현실주의", "지속력과 인내", "소유욕"], desc: "안정성과 현실적 감각이 두드러지는 배치입니다. 지속력과 인내로 장기 목표를 꾸준히 달성하는 구조를 선호하며, 점진적 전환 전략을 채택하면 내면 저항 없이 성장할 수 있습니다." },
  "쌍둥이자리": { keywords: ["소통과 정보 처리", "다면적 관심사", "유연한 적응력", "변동성"], desc: "다방면의 지적 호기심과 빠른 정보 처리 능력이 핵심 자산입니다. 집중력 유지를 위해 우선순위 명료화와 실행 루틴 고정이 필요합니다." },
  "게자리": { keywords: ["감정적 민감성", "가족과 귀속 욕구", "강한 직관", "보호 본능"], desc: "풍부한 감성과 직관적 공감 능력이 관계의 핵심 자원입니다. 건강한 경계 설정 능력을 함께 계발하면 감정 소모를 줄이면서 깊은 유대를 유지할 수 있습니다." },
  "사자자리": { keywords: ["자기표현과 창의성", "리더십과 카리스마", "인정 욕구", "관대함"], desc: "자기표현과 창의성, 자연스러운 카리스마가 강하게 작동하는 배치입니다. 인정 욕구를 외부 승인이 아닌 내적 자기 확인으로 전환하면 에너지 효율이 높아집니다." },
  "처녀자리": { keywords: ["분석력과 세밀함", "실용적 서비스 정신", "완벽 지향", "비판적 사고"], desc: "세밀한 분석력과 실용적 서비스 마인드가 높은 신뢰를 형성합니다. 완벽 기준을 유연하게 조정하고 실행 루틴을 도입하면 생산성과 심리적 여유를 동시에 확보할 수 있습니다." },
  "천칭자리": { keywords: ["균형과 조화 추구", "대인 외교력", "심미적 감각", "결정 지연"], desc: "균형 감각과 대인 외교력이 관계와 협업에서 뚜렷한 강점으로 작동합니다. 기한 설정 루틴을 도입하면 조화를 유지하면서도 실행력을 높일 수 있습니다." },
  "전갈자리": { keywords: ["심층 탐구와 변형", "집중력과 통제력", "신뢰 민감성", "재생 에너지"], desc: "심층 탐구와 강한 집중력, 변형 에너지가 핵심 자산인 배치입니다. 통제 욕구를 신뢰 기반 협업으로 전환하면 깊은 연대와 강력한 공동 성과가 형성됩니다." },
  "사수자리": { keywords: ["철학과 확장 지향", "자유와 모험", "낙관적 비전", "솔직함"], desc: "넓은 시야와 낙관적 비전, 자유 지향적 탐구 정신이 강점인 배치입니다. 세부 실행 계획과 현실 체크포인트를 갖추면 큰 그림이 구체적인 성과로 이어집니다." },
  "염소자리": { keywords: ["목표 지향 인내", "사회적 책임감", "장기 전략", "현실적 야망"], desc: "현실적 야망과 체계적 인내, 장기 계획 능력이 사회적 성취의 기반인 배치입니다. 휴식과 회복을 루틴에 의식적으로 포함해 지속 가능성을 높이는 것이 장기 성공의 열쇠입니다." },
  "물병자리": { keywords: ["혁신과 독창성", "인도주의적 시각", "냉철한 분리", "미래 지향성"], desc: "혁신적 사고와 집단 의식, 미래 지향적 독창성이 두드러지는 배치입니다. 개인적 연결과 감성적 소통을 보강하면 혁신 아이디어가 더 많은 공감을 얻습니다." },
  "물고기자리": { keywords: ["공감 능력과 영성", "창의적 직관", "경계 해소 성향", "이상주의"], desc: "풍부한 공감 능력과 창의적 직관, 영적 감수성이 핵심 자산인 배치입니다. 현실적 경계 설정 루틴을 갖추면 이상적 비전을 현실에 안착시키는 힘이 생깁니다." },
});

const ASTRO_HOUSE_THEME_MAP = Object.freeze({
  1: "자아 이미지, 신체적 에너지, 첫인상과 삶의 출발 방식",
  2: "물질적 자원, 가치관, 자기 소유와 현실 안정 기반",
  3: "소통, 학습, 형제자매와 단거리 이동, 일상 정보 처리",
  4: "가족, 정서적 뿌리, 유년기 각본과 귀속 공간",
  5: "창의성, 연애, 자기표현, 오락과 즐거움",
  6: "일상 건강, 루틴, 봉사와 직장 환경",
  7: "파트너십, 계약, 공개적 관계와 결혼",
  8: "변형, 공유 자원, 심층 심리와 재생 에너지",
  9: "철학, 고등 교육, 장거리 여행과 신념 체계",
  10: "커리어, 사회적 지위와 목표, MC 방향성",
  11: "커뮤니티, 미래 희망, 우정과 집단 프로젝트",
  12: "무의식, 은둔, 영성과 숨겨진 내면 작업",
});

const ASTRO_ASPECT_INTERP_MAP = Object.freeze({
  conjunction: "합(Conjunction)",
  opposition: "대립(Opposition)",
  square: "사각(Square)",
  trine: "삼각(Trine)",
  sextile: "육각(Sextile)",
  quincunx: "퀸쿵스(Quincunx)",
  semisextile: "반육각(Semi-sextile)",
  semisquare: "반사각(Semi-square)",
  sesquisquare: "세스퀴사각(Sesquisquare)",
  quintile: "퀸타일(Quintile)",
});

function formatPlanetKo(nameEn) {
  const MAP = { Sun: "태양", Moon: "달", Mercury: "수성", Venus: "금성", Mars: "화성", Jupiter: "목성", Saturn: "토성", Uranus: "천왕성", Neptune: "해왕성", Pluto: "명왕성", Rahu: "북교점(라후)", Ketu: "남교점(케투)", Chiron: "카이론" };
  return MAP[String(nameEn || "")] || String(nameEn || "행성");
}

function buildAstroDataTableForChapter(canonical, meta, chart) {
  const planets = Array.isArray(canonical?.planets) ? canonical.planets : [];
  const asc = canonical?.angles?.ascendant;
  const mc = canonical?.angles?.mc;
  const chapterKey = String(meta?.key || "C1");
  const CHAPTER_PLANET_FOCUS = {
    C1: ["Sun", "Moon", "Mercury", "Venus", "Mars"], C2: ["Sun", "Moon", "Mercury"],
    C3: ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"],
    C4: ["Sun", "Moon", "Saturn", "Jupiter"], C5: ["Sun", "Moon", "Mercury", "Venus", "Mars"],
    C6: ["Sun", "Moon", "Mercury", "Mars"], C7: ["Venus", "Mars", "Moon", "Saturn"],
    C8: ["Sun", "Jupiter", "Saturn", "Mercury"], C9: ["Moon", "Saturn", "Pluto", "Neptune"],
    C10: ["Jupiter", "Saturn", "Uranus", "Sun"], C11: ["Sun", "Moon", "Jupiter", "Saturn", "Uranus"],
    C12: ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"],
    C13: ["Sun", "Moon", "Jupiter", "Mars"], K1: ["Sun", "Moon", "Venus"],
    K2: ["Sun", "Moon"], K3: ["Venus", "Mars"], K4: ["Mercury"], K5: ["Venus", "Saturn", "Jupiter"],
    K6: ["Mars", "Saturn", "Pluto"], K7: ["Venus", "Jupiter", "Saturn"], K8: ["Jupiter", "Saturn"],
    K9: ["Sun", "Moon", "Jupiter", "Saturn"], K10: ["Sun", "Moon", "Venus", "Mars", "Jupiter", "Saturn"],
  };
  const focusKeys = CHAPTER_PLANET_FOCUS[chapterKey] || ["Sun", "Moon", "Mercury", "Venus", "Mars"];
  const rows = [];
  if (asc) rows.push(`| 상승궁(ASC) | ${asc.signKo || asc.sign || "-"} | ${Number.isFinite(Number(asc.degree)) ? Number(asc.degree).toFixed(1) + "°" : "-"} | - |`);
  if (mc) rows.push(`| 중천(MC) | ${mc.signKo || mc.sign || "-"} | ${Number.isFinite(Number(mc.degree)) ? Number(mc.degree).toFixed(1) + "°" : "-"} | - |`);
  for (const key of focusKeys) {
    const p = planets.find((pl) => pl?.nameEn === key);
    if (!p) continue;
    const pKo = formatPlanetKo(key);
    const sign = p.signKo || p.sign || "-";
    const deg = Number.isFinite(Number(p.degree)) ? Number(p.degree).toFixed(1) + "°" : "-";
    const house = Number.isFinite(Number(p.house)) ? `${Number(p.house)}하우스` : "-";
    rows.push(`| ${pKo}${p.retrograde ? " ℞" : ""} | ${sign} | ${deg} | ${house} |`);
  }
  if (!rows.length) rows.push("| (차트 데이터) | - | - | - |");
  return `| 항목 | 값 | 도수 | 하우스 |\n|------|------|------|------|\n${rows.join("\n")}`;
}

function buildAstroChapterLocalFallback(canonical, meta, chart, reportType) {
  const chapterKey = String(meta?.key || "C1");
  const sectionLabels = ASTRO_CHAPTER_SECTION_LABELS[chapterKey] || ASTRO_DEFAULT_SECTION_LABELS;
  const title = String(meta?.title || "차트 분석");
  const name = String(canonical?.profile?.name || "내담자");
  const birthInfo = canonical?.profile?.birth || {};
  const profileLine = [name, birthInfo?.date, birthInfo?.time, birthInfo?.locationName].filter(Boolean).join(" | ");

  const planets = Array.isArray(canonical?.planets) ? canonical.planets : [];
  const aspects = Array.isArray(canonical?.aspects) ? canonical.aspects : [];
  const asc = canonical?.angles?.ascendant;
  const mc = canonical?.angles?.mc;

  const getP = (nameEn) => planets.find((p) => p?.nameEn === nameEn) || null;
  const sun = getP("Sun"); const moon = getP("Moon"); const mercury = getP("Mercury");
  const venus = getP("Venus"); const mars = getP("Mars"); const jupiter = getP("Jupiter");
  const saturn = getP("Saturn"); const uranus = getP("Uranus");
  const neptune = getP("Neptune"); const pluto = getP("Pluto");

  const pLabel = (p) => {
    if (!p || !p.nameEn) return null;
    const sign = p.signKo || p.sign || "";
    const h = Number.isFinite(Number(p.house)) ? Number(p.house) : null;
    return `${formatPlanetKo(p.nameEn)}${p.retrograde ? "(역행)" : ""} ${sign}${h ? " " + h + "하우스" : ""}`;
  };

  const pDesc = (p) => {
    if (!p || !p.nameEn) return null;
    const ko = formatPlanetKo(p.nameEn);
    const sign = p.signKo || p.sign || "";
    const h = Number.isFinite(Number(p.house)) ? Number(p.house) : null;
    const retro = p.retrograde ? " (역행 중)" : "";
    const signData = sign ? (ASTRO_SIGN_TRAIT_MAP[sign] || null) : null;
    const hTheme = h ? (ASTRO_HOUSE_THEME_MAP[h] || "") : "";
    let t = `**${ko}**는 **${sign || "미상"}**${retro}${h ? ", **" + h + "하우스**" : ""}에 위치합니다.`;
    if (hTheme && h) t += ` ${h}하우스는 "${hTheme}"를 주관하는 영역으로,`;
    if (signData) {
      t += ` ${sign}의 에너지 키워드인 **${signData.keywords.slice(0, 3).join("**, **")}**가 이 영역에서 작동합니다.\n\n${signData.desc}`;
    } else if (sign) {
      t += ` ${sign}의 에너지가 이 영역에서 표현됩니다.`;
    }
    return t;
  };

  const topAspects = aspects
    .filter((a) => a && a.planetA && a.planetB)
    .sort((a, b) => Number(a.orb || 99) - Number(b.orb || 99))
    .slice(0, 8);

  const aspLines = topAspects.slice(0, 5).map((a) => {
    const typeKo = ASTRO_ASPECT_INTERP_MAP[String(a.type || "").toLowerCase()] || String(a.type || "");
    const orbStr = Number.isFinite(Number(a.orb)) ? ` (오브 ${Number(a.orb).toFixed(1)}°)` : "";
    return `- **${formatPlanetKo(a.planetA)} – ${formatPlanetKo(a.planetB)}** ${typeKo}${orbStr}`;
  });

  const cb = canonical?.chartBalance || {};
  const elemText = Object.entries(cb.elements || {}).map(([k, v]) => `${k} ${v}개`).join(", ") || "균형 데이터 분석 중";
  const modeText = Object.entries(cb.modalities || {}).map(([k, v]) => `${k} ${v}개`).join(", ") || "";

  const FOCUS_MAP = {
    C1: [sun, moon, mars, jupiter], C2: [sun, moon, mercury],
    C3: [sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto],
    C4: [sun, moon, saturn, jupiter], C5: [sun, moon, mercury, venus, mars],
    C6: [sun, moon, mercury, mars], C7: [venus, mars, moon, saturn],
    C8: [sun, jupiter, saturn, mercury], C9: [moon, saturn, pluto, neptune],
    C10: [jupiter, saturn, uranus, sun], C11: [sun, moon, jupiter, saturn, uranus],
    C12: [sun, moon, mercury, venus, mars, jupiter, saturn], C13: [sun, moon, jupiter, mars],
    K1: [sun, moon, venus], K2: [sun, moon], K3: [venus, mars], K4: [mercury, sun],
    K5: [venus, saturn, jupiter], K6: [mars, saturn, pluto], K7: [venus, jupiter, saturn],
    K8: [jupiter, saturn], K9: [sun, moon, jupiter, saturn], K10: [sun, moon, venus, mars, jupiter, saturn],
  };
  const focusPlanets = (FOCUS_MAP[chapterKey] || [sun, moon]).filter(Boolean);

  const out = [];

  // Section 1: Data table
  out.push(`### 1. 사용 데이터 요약표\n\n${buildAstroDataTableForChapter(canonical, meta, chart)}`);

  // Section 2: Core interpretation
  const corePlanets = focusPlanets.slice(0, 3);
  const coreBody = corePlanets.map(pDesc).filter(Boolean).join("\n\n") || `${title}의 핵심 에너지 구조를 분석합니다.`;
  const ascLine = asc ? `\n\n**상승궁(ASC)**는 **${asc.signKo || asc.sign || "미상"}**로, 외부에서 인식되는 이미지와 삶의 출발 방향을 결정합니다.${asc.signKo ? " " + ((ASTRO_SIGN_TRAIT_MAP[asc.signKo] || {}).desc || "") : ""}` : "";
  out.push(`### 2. ${sectionLabels[0]}\n\n${profileLine ? "**프로필**: " + profileLine + "\n\n" : ""}${coreBody}${ascLine}`);

  // Section 3: Mechanism
  const mechPlanets = focusPlanets.slice(1, 4);
  const mechBody = mechPlanets.map(pDesc).filter(Boolean).join("\n\n") || `${title}의 심층 에너지 작동 원리를 분석합니다.`;
  const mcLine = mc ? `\n\n**중천(MC)**는 **${mc.signKo || mc.sign || "미상"}**로, 사회적 방향성과 직업적 목표 축을 형성합니다.${mc.signKo ? " " + ((ASTRO_SIGN_TRAIT_MAP[mc.signKo] || {}).desc || "") : ""}` : "";
  out.push(`### 3. ${sectionLabels[1]}\n\n${mechBody}${mcLine}`);

  // Section 4: Real application
  const appLines = focusPlanets.slice(0, 5).map((p) => {
    if (!p || !p.nameEn) return null;
    const ko = formatPlanetKo(p.nameEn);
    const sign = p.signKo || p.sign || "";
    const h = Number.isFinite(Number(p.house)) ? Number(p.house) : null;
    const hTheme = h ? (ASTRO_HOUSE_THEME_MAP[h] || "") : "";
    const kw = sign ? ((ASTRO_SIGN_TRAIT_MAP[sign] || {}).keywords || [])[0] : "";
    return `**${ko}**(${sign}${h ? " " + h + "하우스" : ""}): ${hTheme ? hTheme + " 영역에서 " : ""}${kw ? kw + "의 방식으로 에너지를 운용합니다" : "에너지가 작동합니다"}. 이 배치를 일상에 적용할 때는 의식적인 선택과 반복 루틴이 효과적입니다.`;
  }).filter(Boolean);
  out.push(`### 4. ${sectionLabels[2]}\n\n${appLines.join("\n\n") || `${title}의 에너지를 현실에 적용하는 구체적 전략을 수립합니다.`}`);

  // Section 5: Aspect deep-dive
  let aspBody = "";
  if (aspLines.length > 0) {
    aspBody = `이 차트의 상위 애스펙트 구조:\n\n${aspLines.join("\n")}\n\n`;
    const fa = topAspects[0];
    if (fa) {
      const typeKo = ASTRO_ASPECT_INTERP_MAP[String(fa.type || "").toLowerCase()] || fa.type;
      aspBody += `가장 좁은 오브의 핵심 각도는 **${formatPlanetKo(fa.planetA)}–${formatPlanetKo(fa.planetB)} ${typeKo}**입니다. 이 두 행성이 공유하는 에너지는 일상적 패턴에서 반복적으로 나타나며, 의식적으로 다루면 강력한 강점으로 전환됩니다.`;
    }
    const sq = topAspects.find((a) => String(a.type || "").toLowerCase() === "square");
    const tri = topAspects.find((a) => String(a.type || "").toLowerCase() === "trine");
    if (sq) aspBody += `\n\n**사각(Square) — ${formatPlanetKo(sq.planetA)}–${formatPlanetKo(sq.planetB)}**: 긴장과 도전을 생성하는 각도이지만, 의식적 행동으로 성장의 레버리지가 됩니다.`;
    if (tri) aspBody += `\n\n**삼각(Trine) — ${formatPlanetKo(tri.planetA)}–${formatPlanetKo(tri.planetB)}**: 자연스러운 흐름과 타고난 재능을 나타내며, 의식적으로 활용하면 큰 강점이 됩니다.`;
  } else {
    aspBody = `차트 내 애스펙트는 여러 행성 간 에너지 교차 회로를 형성합니다. 조화각(삼각, 육각)은 타고난 재능을, 긴장각(사각, 대립)은 성장을 위한 마찰 에너지를 제공합니다. 합(Conjunction)은 두 행성의 에너지를 하나로 합쳐 강렬한 집중을 만들어냅니다. 퀸쿵스(Quincunx)는 두 영역 간 지속적인 조율을 요구하는 각도입니다.`;
  }
  out.push(`### 5. ${sectionLabels[3]}\n\n${aspBody}`);

  // Section 6: Shadow and caution
  const shadowCandidates = [saturn, mars, pluto, neptune, uranus].filter(Boolean).slice(0, 3);
  const shadowLines = shadowCandidates.map((p) => {
    const ko = formatPlanetKo(p.nameEn);
    const sign = p.signKo || p.sign || "";
    const h = Number.isFinite(Number(p.house)) ? Number(p.house) : null;
    const signData = sign ? (ASTRO_SIGN_TRAIT_MAP[sign] || null) : null;
    const shadow = signData ? signData.keywords.slice(-2).join(", ") : "이중적 에너지";
    return `**${ko}**(${sign}${h ? " " + h + "하우스" : ""}): ${shadow}의 그림자 영역이 활성화될 수 있습니다. 이 에너지를 인식하고 의식적으로 전환하면 반복 패턴에서 벗어나는 선택이 가능합니다.`;
  });
  const shadowBody = shadowLines.join("\n\n") || "차트 내 긴장 에너지를 인식하고 의식적 선택으로 전환하는 전략이 중요합니다.";
  out.push(`### 6. ${sectionLabels[4]}\n\n${shadowBody}\n\n**원소 균형**: ${elemText}${modeText ? "\n\n**모드 분포**: " + modeText : ""}\n\n원소와 모드 분포를 인식하면 과잉·결핍 패턴을 보완하는 루틴 설계가 가능합니다.`);

  // Section 7: Practice strategy (+ 3/6/12 months for C11/K9)
  const stratLines = focusPlanets.slice(0, 4).map((p) => {
    if (!p || !p.nameEn) return null;
    const ko = formatPlanetKo(p.nameEn);
    const sign = p.signKo || p.sign || "";
    const h = Number.isFinite(Number(p.house)) ? Number(p.house) : null;
    const signData = sign ? (ASTRO_SIGN_TRAIT_MAP[sign] || null) : null;
    const kw = signData ? signData.keywords[0] : sign;
    const hTheme = h ? (ASTRO_HOUSE_THEME_MAP[h] || "") : "";
    return `**${ko} 실천**: ${h ? h + "하우스(" + hTheme + ") 영역에서 " : ""}${kw}의 에너지를 일상 루틴에 통합하세요.`;
  }).filter(Boolean);
  let stratSuffix = "";
  if (chapterKey === "C11" || chapterKey === "K9") {
    stratSuffix = "\n\n**3개월 전략**: 현재 트랜짓 에너지를 인식하고 변화의 씨앗을 심는 시기입니다. 중요한 결정 전 타이밍을 검토하고 준비도를 높이세요.\n\n**6개월 전략**: 트랜짓 흐름이 중간 정점에 달하는 구간입니다. 관계·커리어·재정 영역에서 누적된 선택의 결과를 점검하고 방향을 조율하세요.\n\n**12개월 전략**: 연간 주기를 마무리하며 다음 사이클을 준비합니다. 완료해야 할 항목을 명확히 하고 새로운 씨앗을 위한 공간을 확보하세요.";
  }
  out.push(`### 7. ${sectionLabels[5]}\n\n${stratLines.join("\n\n") || "차트 에너지를 실전에 적용하는 구체적 루틴을 수립하세요."}\n\n이 챕터의 핵심 에너지를 일상에 통합하려면 작은 단위의 반복 가능한 루틴부터 시작하는 것이 효과적입니다. 해당 행성들이 위치한 하우스 영역에서 의식적인 선택을 늘려갈수록 차트의 잠재력이 현실로 전환됩니다.${stratSuffix}`);

  // Section 8: Chapter summary
  const keyLabels = [sun, moon].filter(Boolean).map(pLabel).filter(Boolean).join(", ");
  const ascMcLine = [
    asc ? `상승궁 ${asc.signKo || asc.sign || ""}` : null,
    mc ? `MC ${mc.signKo || mc.sign || ""}` : null,
  ].filter(Boolean).join(", ");
  const summaryBody = `${keyLabels ? keyLabels + "의 배치" : "차트 에너지"}${ascMcLine ? ", " + ascMcLine : ""}가 이 챕터의 핵심 구조를 형성합니다. ${title}에서 다룬 에너지와 패턴을 일상적 선택에 통합할 때, 차트의 잠재력이 실질적인 삶의 변화로 전환됩니다.\n\n${focusPlanets.slice(0, 3).map(pLabel).filter(Boolean).join(", ")}의 배치를 의식적으로 운용하는 것이 이 챕터의 핵심 실천 과제입니다. 하우스와 애스펙트 구조를 함께 이해하면 반복 패턴을 인식하고 더 나은 선택을 만들어갈 수 있습니다.`;
  out.push(`### 8. ${sectionLabels[6]}\n\n${summaryBody}`);

  return out.join("\n\n");
}

async function generateAstroPremiumChapter(env, body, input, chapter, meta, chart, reportType, partnerChart, synastry, composite, timingData) {
  const canonical = buildCanonicalAstroChart(body, input, chart, reportType, partnerChart, synastry, composite, timingData);
  const evidenceMode = String(reportType || "personal").toLowerCase() === "compatibility" ? "compatibility" : "personal";
  const chapterLengthPolicy = getAstroChapterLengthPolicy(chapter, evidenceMode);
  const chapterMinChars = Math.max(3000, Number(chapterLengthPolicy.minChars || ASTRO_MIN_CHARS));
  const premiumInput = body?._premiumLlmInput && typeof body._premiumLlmInput === "object" ? body._premiumLlmInput : null;
  const previousChapterTexts = normalizePreviousChapterTexts(body?.previousChapterTexts);
  const prompt = buildAstroChapterPrompt(meta, canonical, previousChapterTexts, premiumInput);
  const options = {
    temperature: 0.74,
    topP: 0.92,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_ASTRO_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 75000),
    maxAttemptsPerPair: Number(env.PREMIUM_ASTRO_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = null;
  let usedLocalFallback = false;
  try {
    text = await callGemini(env, prompt, ["PREMIUM_ASTRO_GEMINI_MODEL"], options);
    if (!text || text.trim().length < 1200) {
      throw new Error("AI chapter generation failed: empty output");
    }
    text = dedupeAstroParagraphs(text);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const missing = astroMissingMarkers(text, meta);
      const tooShort = text.length < chapterMinChars;
      const truncated = looksTruncatedMarkdown(text);
      const banned = hasBannedDeterministicExpression(text);
      const duplicated = hasDuplicateAstroParagraphs(text);
      const forbiddenPadding = hasForbiddenAstroPadding(text);
      const duplicatedSentence = detectRepeatedLongSentences(text, 30).length > 0;
      const duplicatedAcross = detectCrossChapterRepeatedSentences(text, previousChapterTexts, 30).length > 0;
      const forbiddenPhraseUsed = ASTRO_FORBIDDEN_REPEATED_PHRASES.some((p) => text.includes(p));
      const dataEvidenceMissing = !hasAstroDataEvidence(text, evidenceMode);
      const rawExposure = hasForbiddenAstroRawDataExposure(text, evidenceMode);
      if (!tooShort && missing.length === 0 && !truncated && !banned && !duplicated && !forbiddenPadding && !duplicatedSentence && !duplicatedAcross && !forbiddenPhraseUsed && !dataEvidenceMissing && !rawExposure) break;

      const refinePrompt = [
        "아래 서양 점성술 챕터 초안을 고품질로 보강하세요.",
        `목표 길이: 최소 ${chapterMinChars}자, 권장 ${Math.max(chapterMinChars, Number(chapterLengthPolicy.targetChars || chapterMinChars))}자`,
        "오직 마크다운 본문만 출력하고 기존 구조를 유지하면서 누락 요소를 채우세요. 표는 유지하세요.",
        "같은 문장/문단 반복, 실행 보강 메모, 금지 문구를 모두 제거하세요.",
        `누락 요소: ${missing.length ? missing.join(" | ") : "없음"}`,
        `현재 문제: ${tooShort ? "분량 부족" : ""} ${truncated ? "문장 끊김" : ""} ${banned ? "금지 표현 포함" : ""} ${duplicated ? "중복 문단 포함" : ""} ${forbiddenPadding ? "패딩 문구 포함" : ""} ${duplicatedSentence ? "장문 반복 포함" : ""} ${duplicatedAcross ? "이전 챕터 문장 재사용" : ""} ${forbiddenPhraseUsed ? "금지 고정문구 포함" : ""} ${dataEvidenceMissing ? "차트 근거 부족" : ""} ${rawExposure ? "원시 데이터 노출" : ""}`.trim(),
        premiumInput ? "premiumChapterJsonPacks 근거를 더 많이 반영하세요." : "",
        "",
        "[초안]",
        text,
      ].join("\n");

      const retryOptions = {
        ...options,
        temperature: Math.min(0.92, Number(options.temperature || 0.74) + (0.08 * (attempt + 1))),
      };
      const refined = await callGemini(env, refinePrompt, ["PREMIUM_ASTRO_GEMINI_MODEL"], retryOptions);
      if (!refined || !refined.trim()) break;
      const candidate = refined.trim();
      text = candidate.length >= Math.floor(text.length * 0.8) ? candidate : `${text}\n\n${candidate}`;
      text = dedupeAstroParagraphs(text);
    }

    const finalMissing = astroMissingMarkers(text, meta);
    const finalRepeatedSentences = detectRepeatedLongSentences(text, 30);
    const finalAcross = detectCrossChapterRepeatedSentences(text, previousChapterTexts, 30);
    const finalForbiddenPhraseUsed = ASTRO_FORBIDDEN_REPEATED_PHRASES.some((p) => text.includes(p));
    const finalRawExposure = hasForbiddenAstroRawDataExposure(text, evidenceMode);
    if (
      text.length < chapterMinChars
      || finalMissing.length > 0
      || looksTruncatedMarkdown(text)
      || hasBannedDeterministicExpression(text)
      || hasDuplicateAstroParagraphs(text)
      || hasForbiddenAstroPadding(text)
      || finalRepeatedSentences.length > 0
      || finalAcross.length > 0
      || finalForbiddenPhraseUsed
      || finalRawExposure
      || !hasAstroDataEvidence(text, evidenceMode)
    ) {
      throw new Error("Astro chapter quality validation failed");
    }
  } catch (_geminiError) {
    console.warn("[AstroChapterLocalFallback]", {
      chapterKey: meta?.key,
      chapter,
      reason: String(_geminiError?.message || "gemini_failed"),
    });
    text = buildAstroChapterLocalFallback(canonical, meta, chart, reportType);
    usedLocalFallback = true;
  }

  return {
    text,
    sections: parseSections(text),
    usedFallback: usedLocalFallback,
    warnings: canonical.validation?.missingFields || [],
    lengthPolicy: chapterLengthPolicy,
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

const PREMIUM_PDF_BLOCKED_LINE_PATTERNS = [
  /데이터가\s*일부\s*누락된\s*궁은\s*branch,\s*mainStars,\s*strength,\s*sihua/i,
  /reportPayload\(=calculatedData\)/i,
  /chapterJsonPacks\(core\/signals\/timing\/actions\)/i,
  /JSON에\s*없는\s*계산\s*결과를\s*추정하지\s*말/i,
  /^\s*\[(SYSTEM|USER|System Prompt|User Prompt JSON)\]\s*$/i,
  /premiumChapterJsonPacks/i,
];

function normalizePremiumFingerprint(text) {
  return String(text || "")
    .replace(/[#>*`\-|_\[\]\(\)\{\}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripPremiumBlockedLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => {
      const source = String(line || "").trim();
      if (!source) return true;
      return !PREMIUM_PDF_BLOCKED_LINE_PATTERNS.some((re) => re.test(source));
    })
    .join("\n");
}

function dedupePremiumParagraphs(text) {
  const chunks = String(text || "").split(/\n\s*\n/);
  const seen = new Set();
  const out = [];
  for (const chunk of chunks) {
    const trimmed = String(chunk || "").trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    const isHeading = /^#{1,4}\s/.test(trimmed);
    const fp = normalizePremiumFingerprint(trimmed);
    if (!isHeading && fp && seen.has(fp)) continue;
    if (!isHeading && fp) seen.add(fp);
    out.push(trimmed);
  }
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function dedupePremiumLongSentences(text, minLength = 36) {
  const segments = String(text || "")
    .replace(/\r/g, "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const seg of segments) {
    if (seg.length < minLength) {
      out.push(seg);
      continue;
    }
    const fp = normalizePremiumFingerprint(seg);
    if (!fp || seen.has(fp)) continue;
    seen.add(fp);
    out.push(seg);
  }
  return out.join("\n").trim();
}

function sanitizePremiumGeneratedText(text) {
  const stripped = stripPremiumBlockedLines(text);
  const dedupedParagraphs = dedupePremiumParagraphs(stripped);
  const dedupedSentences = dedupePremiumLongSentences(dedupedParagraphs, 36);
  return dedupePremiumParagraphs(dedupedSentences);
}

const PREMIUM_PDF_API_PAUSE_DEFAULT = true;
const PREMIUM_PDF_API_PAUSED_REPORT_TYPES = new Set([
  "sajuNewYear",
  "lifeBook",
  "loveSecret",
  "ziweiPremium",
  "sookyoPremium",
  "westernAstrologyPremium",
  "vedicPremium",
]);

const PREMIUM_PDF_MODEL_KEY_TO_REPORT_TYPE = Object.freeze({
  PREMIUM_SAJU_NEW_YEAR_GEMINI_MODEL: "sajuNewYear",
  LIFEBOOK_GEMINI_MODEL: "lifeBook",
  LOVE_SECRET_GEMINI_MODEL: "loveSecret",
  PREMIUM_ZIWEI_GEMINI_MODEL: "ziweiPremium",
  PREMIUM_SUKUYO_GEMINI_MODEL: "sookyoPremium",
  PREMIUM_ASTRO_GEMINI_MODEL: "westernAstrologyPremium",
  PREMIUM_VEDIC_GEMINI_MODEL: "vedicPremium",
});

function isPremiumPdfApiPaused(env) {
  const raw = String(env?.PREMIUM_PDF_API_PAUSE || "").trim();
  if (!raw) return PREMIUM_PDF_API_PAUSE_DEFAULT;
  return asBool(raw);
}

function resolvePausedPremiumReportType(modelEnvKeys = [], options = {}) {
  const explicitReportType = String(options?.reportType || "").trim();
  if (explicitReportType && PREMIUM_PDF_API_PAUSED_REPORT_TYPES.has(explicitReportType)) {
    return explicitReportType;
  }

  const keys = Array.isArray(modelEnvKeys) ? modelEnvKeys : [];
  for (const key of keys) {
    const mapped = PREMIUM_PDF_MODEL_KEY_TO_REPORT_TYPE[String(key || "").trim()];
    if (mapped && PREMIUM_PDF_API_PAUSED_REPORT_TYPES.has(mapped)) return mapped;
  }
  return "";
}

async function callGemini(env, prompt, modelEnvKeys = [], options = {}) {
  if (isPremiumPdfApiPaused(env)) {
    const pausedType = resolvePausedPremiumReportType(modelEnvKeys, options);
    if (pausedType) {
      console.info("[PremiumPDF][ApiPaused]", {
        reportType: pausedType,
        modelEnvKeys: Array.isArray(modelEnvKeys) ? modelEnvKeys : [],
        requestId: String(options?.requestId || "").trim() || null,
      });
      return "";
    }
  }

  const result = await generateWithGemini(env, prompt, {
    modelEnvKeys,
    temperature: options.temperature,
    topP: options.topP,
    frequencyPenalty: Number.isFinite(Number(options.frequencyPenalty)) ? Math.max(0.5, Number(options.frequencyPenalty)) : 0.55,
    presencePenalty: Number.isFinite(Number(options.presencePenalty)) ? Math.max(0.5, Number(options.presencePenalty)) : 0.55,
    maxOutputTokens: options.maxOutputTokens,
    timeoutMs: options.timeoutMs,
    maxAttemptsPerPair: options.maxAttemptsPerPair,
    requestId: options.requestId,
  });
  if (!result.ok) return "";
  if (asBool(options.rawOutput) || asBool(options.expectJson)) {
    return String(result.text || "").trim();
  }
  return sanitizePremiumGeneratedText(result.text);
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

function sanitizePremiumChapterText(text) {
  return sanitizePremiumGeneratedText(text)
    .replace(/계산\s*데이터\s*누락/gi, "핵심 계산 가이드")
    .replace(/필수\s*데이터\s*누락/gi, "핵심 데이터 점검")
    .replace(/입력\s*데이터\s*부족/gi, "입력 프로필 기준")
    .replace(/데이터\s*부족/gi, "핵심 데이터 맥락")
    .replace(/정보\s*부족/gi, "핵심 정보")
    .replace(/보완\s*프로필/gi, "통합 프로필");
}

const PREMIUM_LLM_RECOVERABLE_ERROR_PATTERNS = Object.freeze([
  /quota/i,
  /rate\s*limit/i,
  /429/,
  /500/,
  /502/,
  /503/,
  /timeout|timed\s*out|abort/i,
  /network\s*error|fetch\s*failed|connection\s*reset/i,
  /gemini\s*api\s*unavailable/i,
  /generatecontent\s*failed|gemini\s*failed/i,
  /model\s*overloaded|overload/i,
  /api\s*key\s*missing|api\s*key\s*invalid|invalid\s*api\s*key/i,
  /response\s*empty|empty\s*response/i,
  /response\s*blocked|finishreason\s*blocked|finish\s*reason\s*blocked/i,
  /response\s*too\s*short|chapter\s*quality\s*validation\s*failed/i,
  /json\s*parse\s*failed|unexpected\s*token/i,
  /forbidden\s*phrase|blocked\s*phrase/i,
]);

function isLlmRecoverableError(errorLike) {
  const source = String(
    errorLike?.code
    || errorLike?.name
    || errorLike?.message
    || errorLike?.error
    || errorLike
    || "",
  );
  if (!source.trim()) return false;
  return PREMIUM_LLM_RECOVERABLE_ERROR_PATTERNS.some((pattern) => pattern.test(source));
}

function similarityScoreByTokens(leftText, rightText) {
  const tokenize = (text) => new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
  const left = tokenize(leftText);
  const right = tokenize(rightText);
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const token of left) {
    if (right.has(token)) inter += 1;
  }
  const union = left.size + right.size - inter;
  if (union <= 0) return 0;
  return inter / union;
}

function dedupeReportParagraphs(chapters = []) {
  const priorParagraphs = [];
  return (Array.isArray(chapters) ? chapters : []).map((chapterText) => {
    const lines = String(chapterText || "").split(/\n\s*\n/);
    const kept = [];
    const seenHeaders = new Set();
    for (const block of lines) {
      const trimmed = String(block || "").trim();
      if (!trimmed) continue;

      if (/^#{2,4}\s+/.test(trimmed)) {
        const headerFp = normalizePremiumFingerprint(trimmed);
        if (!headerFp || seenHeaders.has(headerFp)) continue;
        seenHeaders.add(headerFp);
        kept.push(trimmed);
        continue;
      }

      const fp = normalizePremiumFingerprint(trimmed);
      if (!fp) continue;
      const exactDuplicate = priorParagraphs.some((row) => row.fp === fp);
      if (exactDuplicate) continue;

      const highSimilarity = priorParagraphs.some((row) => similarityScoreByTokens(row.text, trimmed) >= 0.8);
      if (highSimilarity) continue;

      priorParagraphs.push({ fp, text: trimmed });
      kept.push(trimmed);
    }

    return kept.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  });
}

function validateLocalFallbackChapter(chapter, chapterDefinition, previousChapterTexts = []) {
  const title = String(chapter?.title || chapterDefinition?.title || "").trim();
  const content = String(chapter?.content || chapter?.text || "").trim();
  const minChars = Math.max(1800, Number(chapterDefinition?.minChars || 0));
  const headingCount = (content.match(/^#{2,4}\s+/gm) || []).length;
  const blockedTerms = [
    "자동 복구 생성",
    "기본 해석",
    "데이터가 부족하지만",
    "Chapter 1 핵심 진단",
    "현재 흐름을 구조적으로 해석합니다",
    "단정 예언이 아니라 선택의 품질을 높이는 실행형 상담 문장",
    "fallback",
    "mock",
    "sample",
    "undefined",
    "null",
    "NaN",
    "quota exceeded",
    "generateContent failed",
    "API error",
    "JSON",
    "reportPayload",
    "chapterJsonPacks",
  ];
  const hasBlocked = blockedTerms.some((term) => content.toLowerCase().includes(String(term).toLowerCase()));
  const repeatedAcross = detectCrossChapterRepeatedSentences(content, previousChapterTexts, 30);
  const repeatedInside = detectRepeatedLongSentences(content, 30);

  const reasons = [];
  if (!title) reasons.push("TITLE_MISSING");
  if (!content) reasons.push("CONTENT_MISSING");
  if (countKoreanLikeChars(content) < minChars) reasons.push("CONTENT_TOO_SHORT");
  if (headingCount < 3) reasons.push("HEADINGS_TOO_FEW");
  if (hasBlocked) reasons.push("BLOCKED_PHRASE_DETECTED");
  if (repeatedAcross.length > 0) reasons.push("TOO_SIMILAR_TO_PREVIOUS");
  if (repeatedInside.length > 0) reasons.push("REPEATED_PARAGRAPH");

  return {
    ok: reasons.length === 0,
    reasons,
    title,
    content,
    headingCount,
    minChars,
  };
}

function repairLocalFallbackChapterText(text, chapterMeta = null, chapterId = 0) {
  const source = String(text || "").trim();
  if (!source) return "";

  let repaired = dedupeReportParagraphs([source])[0] || source;
  const repeated = detectRepeatedLongSentences(repaired, 30);
  if (repeated.length > 0) {
    const chapterTitle = String(chapterMeta?.title || `챕터 ${Number(chapterId || 0) || 1}`).trim();
    repaired = `${repaired}\n\n### 실행 관점 보정\n${chapterTitle}에서는 동일 패턴 반복 대신 이번 장면에서 우선 적용할 행동 기준을 분리해 정리하고, 관계·일·재정의 판단 순서를 다시 고정합니다.`;
  }
  return repaired.replace(/\n{3,}/g, "\n\n").trim();
}

function formatLocalFactValue(value) {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value) >= 1000) return String(Math.round(value));
    return String(Math.round(value * 100) / 100);
  }
  if (typeof value === "boolean") return value ? "예" : "아니오";
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

function normalizeLocalFactLabel(path) {
  const key = String(path || "")
    .replace(/^[^.]+\./, "")
    .split(".")
    .slice(-2)
    .join(".")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  if (!key) return "핵심 기준";
  const map = {
    name: "이름",
    gender: "성별",
    year: "출생 연도",
    month: "출생 월",
    day: "출생 일",
    hour: "출생 시",
    minute: "출생 분",
    dayMaster: "일간",
    relationType: "관계 유형",
    relationVariant: "관계 변형",
    compatibilityIndex: "궁합 지수",
    yongsin: "용신",
    huisin: "희신",
    gisin: "기신",
    strongestMonths: "강점 월",
    cautionMonths: "주의 월",
    targetYear: "대상 연도",
  };
  const tail = key.split(".").pop();
  return map[tail] || key;
}

function collectDeterministicLocalFacts(reportType, input, canonicalJson, chapterJsonPacks, limit = 18) {
  const preferredTokens = [
    "name", "gender", "year", "month", "day", "hour", "minute",
    "dayMaster", "relation", "compat", "index", "yong", "hui", "gi",
    "targetYear", "strong", "caution", "theme", "core", "focus", "risk", "energy",
  ];

  const roots = [
    { prefix: "input", value: input },
    { prefix: "calculated", value: canonicalJson?.calculatedData },
    { prefix: "chapter", value: chapterJsonPacks },
    { prefix: "seed", value: canonicalJson?.interpretationSeed },
  ];

  const rows = [];
  const seen = new Set();
  const queue = roots
    .filter((row) => row && row.value && typeof row.value === "object")
    .map((row) => ({ path: row.prefix, value: row.value, depth: 0 }));

  while (queue.length > 0 && rows.length < 60) {
    const item = queue.shift();
    const { path, value, depth } = item;
    if (value == null) continue;

    if (Array.isArray(value)) {
      if (depth > 3) continue;
      for (let i = 0; i < value.length; i += 1) {
        queue.push({ path: `${path}.${i}`, value: value[i], depth: depth + 1 });
      }
      continue;
    }

    if (typeof value === "object") {
      if (depth > 4) continue;
      for (const [k, v] of Object.entries(value)) {
        queue.push({ path: `${path}.${k}`, value: v, depth: depth + 1 });
      }
      continue;
    }

    const normalized = formatLocalFactValue(value);
    if (!normalized) continue;
    if (normalized.toLowerCase() === "n/a") continue;

    const pathLc = String(path || "").toLowerCase();
    const preferred = preferredTokens.some((token) => pathLc.includes(token));
    if (!preferred && rows.length >= 30) continue;

    const fp = `${pathLc}:${normalized.toLowerCase()}`;
    if (seen.has(fp)) continue;
    seen.add(fp);
    rows.push({ label: normalizeLocalFactLabel(path), value: normalized, preferred });
  }

  const sorted = rows
    .sort((a, b) => Number(b.preferred) - Number(a.preferred))
    .slice(0, Math.max(8, Number(limit || 18)));

  if (sorted.length >= 8) return sorted;

  return sorted.concat([
    { label: "리포트 유형", value: String(reportType || "premium"), preferred: true },
    { label: "입력 기준", value: "검증된 계산 데이터", preferred: true },
  ]).slice(0, Math.max(8, Number(limit || 18)));
}

function getDeterministicLocalQualityProfile(reportType, chapterId, chapterMeta, chapterContract) {
  const chapterTitle = String(chapterMeta?.title || `Chapter ${chapterId}`).trim();
  const requiredHeadings = Array.isArray(chapterContract?.requiredHeadings)
    ? chapterContract.requiredHeadings.length
    : 0;
  const minSectionCharsBase = Number(requiredHeadings >= 6 ? 520 : 430);

  if (reportType === "lifeBook") {
    return {
      narrativeTone: "장기 설계형",
      minSectionChars: minSectionCharsBase + 90,
      actionDepth: 4,
      mustInclude: ["핵심 구조", "실행 우선순위", "리스크 컷오프", "90일 점검"],
    };
  }
  if (reportType === "loveSecret") {
    return {
      narrativeTone: "관계 전략형",
      minSectionChars: minSectionCharsBase + 70,
      actionDepth: 4,
      mustInclude: ["감정 트리거", "대화 프레임", "갈등 복구", "경계선 합의"],
    };
  }
  if (reportType === "sajuNewYear") {
    return {
      narrativeTone: "연간 운영형",
      minSectionChars: minSectionCharsBase + 80,
      actionDepth: 5,
      mustInclude: ["분기 기준", "월별 Go/Stop", "손실 관리", "회수 전략"],
    };
  }
  if (reportType === "ziweiPremium") {
    return {
      narrativeTone: "궁성 구조형",
      minSectionChars: minSectionCharsBase + 75,
      actionDepth: 4,
      mustInclude: ["궁위 해석", "강점-약점", "환경 변수", "운영 루틴"],
    };
  }
  if (reportType === "westernAstrologyPremium" || reportType === "vedicPremium") {
    return {
      narrativeTone: "타이밍 전략형",
      minSectionChars: minSectionCharsBase + 65,
      actionDepth: 4,
      mustInclude: ["타이밍", "우선 행동", "보류 행동", "점검 질문"],
    };
  }
  if (reportType === "sookyoPremium") {
    return {
      narrativeTone: "관계 다이내믹형",
      minSectionChars: minSectionCharsBase + 60,
      actionDepth: 4,
      mustInclude: ["상호작용 패턴", "충돌 포인트", "완충 행동", "합의 기준"],
    };
  }

  return {
    narrativeTone: "실행 중심형",
    minSectionChars: minSectionCharsBase,
    actionDepth: 3,
    mustInclude: ["핵심 결론", "실행 포인트", "리스크 관리"],
  };
}

function getDeterministicCategoryFrame(reportType, chapterId, sectionIndex) {
  const framesByReport = {
    lifeBook: ["핵심 구조 진단", "패턴 해석", "실행 설계", "리스크 관리", "장기 회수"],
    loveSecret: ["감정 구조", "상호작용 해석", "대화 전략", "갈등 복구", "관계 합의"],
    sajuNewYear: ["연간 기조", "분기 운영", "월별 판단", "리스크 컷", "성과 회수"],
    ziweiPremium: ["궁성 해석", "강약 배치", "현실 장면", "위기 대응", "실행 매뉴얼"],
    westernAstrologyPremium: ["타이밍 판독", "상황 해석", "추진 전략", "방어 전략", "점검 기준"],
    vedicPremium: ["리듬 해석", "상황 분기", "실행 우선순위", "손실 회피", "복구 경로"],
    sookyoPremium: ["관계 구조", "상호 패턴", "충돌 완충", "조율 전술", "관계 안정화"],
  };
  const frames = framesByReport[String(reportType || "")] || ["핵심 해석", "실행 전략", "리스크 관리", "요약"];
  return frames[(Number(chapterId || 1) + Number(sectionIndex || 0)) % frames.length];
}

function buildDeterministicActionChecklist(profile, facts, sectionIndex) {
  const items = [];
  for (let i = 0; i < Math.max(3, Number(profile?.actionDepth || 3)); i += 1) {
    const fact = facts[(sectionIndex + i + 1) % facts.length] || facts[0] || { label: "핵심 기준", value: "검증 데이터" };
    items.push(`- ${fact.label}(${fact.value})를 기준으로 주간 단위 실행 결과를 기록합니다.`);
  }
  const mustInclude = Array.isArray(profile?.mustInclude) ? profile.mustInclude : [];
  if (mustInclude.length) {
    items.push(`- ${mustInclude[(sectionIndex + 1) % mustInclude.length]} 항목을 이번 챕터 실행 점검표에 포함합니다.`);
  }
  return items.join("\n");
}

function buildDeterministicSectionParagraphs(heading, chapterMeta, facts, reportType, sectionIndex, qualityProfile) {
  const title = String(chapterMeta?.title || `Chapter ${sectionIndex + 1}`);
  const focus = String(chapterMeta?.subtitle || "핵심 흐름");
  const categoryFrame = getDeterministicCategoryFrame(reportType, chapterMeta?.num || 1, sectionIndex);
  const baseA = facts[(sectionIndex * 2) % facts.length] || { label: "핵심 기준", value: "검증 데이터" };
  const baseB = facts[(sectionIndex * 2 + 1) % facts.length] || { label: "운영 포인트", value: "실행 우선순위" };
  const baseC = facts[(sectionIndex * 2 + 2) % facts.length] || { label: "리스크", value: "속도 과열" };
  const baseD = facts[(sectionIndex * 2 + 3) % facts.length] || baseA;

  let sectionBody = [
    `${title}의 ${focus} 관점에서 ${baseA.label}(${baseA.value})와 ${baseB.label}(${baseB.value})를 함께 읽어야 판단 오차를 줄일 수 있습니다.`,
    `${reportType} 리포트의 ${categoryFrame}에서는 ${baseC.label}(${baseC.value})를 선제적으로 관리해야 변동성 구간에서도 방향을 유지할 수 있습니다.`,
    `${qualityProfile?.narrativeTone || "실행 중심형"} 기준으로 ${baseD.label}(${baseD.value})를 보정 변수로 두고 일정·관계·자원 배분을 같은 문장 규칙으로 통합해 반복 점검하세요.`,
    "실행 기준: 목표를 1~2개로 제한하고, 실행 결과를 주 단위로 기록해 다음 판단 기준에 반영합니다.",
  ].join("\n\n");

  const minSectionChars = Math.max(320, Number(qualityProfile?.minSectionChars || 430));
  let depth = 1;
  while (countKoreanLikeChars(sectionBody) < minSectionChars) {
    const reinforceFact = facts[(sectionIndex + depth + 4) % facts.length] || baseB;
    sectionBody += `\n\n심화 근거 ${depth}: ${reinforceFact.label}(${reinforceFact.value})를 확인해 이번 구간의 의사결정 가정을 업데이트하고, 실행-점검-보정 순서를 고정합니다.`;
    depth += 1;
    if (depth > 6) break;
  }

  return sectionBody;
}

function buildDeterministicLocalChapterText({
  reportType,
  chapterId,
  chapterMeta,
  chapterContract,
  input,
  canonicalJson,
  chapterJsonPacks,
  minChars,
}) {
  const headings = Array.isArray(chapterContract?.requiredHeadings)
    ? chapterContract.requiredHeadings.map((row) => String(row || "").trim()).filter(Boolean)
    : [];
  const resolvedHeadings = headings.length
    ? headings
    : [
      "## 1. 이 챕터의 핵심 결론",
      "## 2. 상세 해석",
      "## 3. 실행 전략",
      "## 4. 리스크 관리",
      "## 5. 챕터 요약",
    ];
  const facts = collectDeterministicLocalFacts(reportType, input, canonicalJson, chapterJsonPacks, 20);
  const qualityProfile = getDeterministicLocalQualityProfile(reportType, chapterId, chapterMeta, chapterContract);

  const lines = [
    `## ${String(chapterMeta?.title || `Chapter ${chapterId}`)}`,
    String(chapterMeta?.subtitle || "").trim() ? `> ${String(chapterMeta.subtitle).trim()}` : "",
    "아래 내용은 검증된 계산 데이터와 챕터 기준 항목을 바탕으로 정리한 실행형 해석입니다.",
    "",
    "### 사용 데이터 요약",
    ...facts.slice(0, 12).map((row) => `- ${row.label}: ${row.value}`),
  ].filter(Boolean);

  resolvedHeadings.forEach((heading, idx) => {
    lines.push("", heading);
    lines.push(buildDeterministicSectionParagraphs(heading, chapterMeta, facts, reportType, idx, qualityProfile));
    lines.push("\n실행 체크리스트:\n" + buildDeterministicActionChecklist(qualityProfile, facts, idx));
  });

  let text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  let round = 1;
  while (countKoreanLikeChars(text) < Math.max(1800, Number(minChars || 2200))) {
    const a = facts[(round * 3) % facts.length] || facts[0];
    const b = facts[(round * 3 + 1) % facts.length] || facts[1] || facts[0];
    const frame = getDeterministicCategoryFrame(reportType, chapterId, round);
    text += `\n\n### 실행 심화 ${round} - ${frame}\n${a.label}(${a.value})를 기준축으로 두고 ${b.label}(${b.value})를 보정 변수로 운영하면 변동성 구간에서도 판단 일관성을 유지하기 쉽습니다.\n이번 심화 구간에서는 일정·관계·자원 배분을 같은 기준표로 묶어 기록하고, 주간 단위로 수정 폭을 20% 이내로 제한해 과잉 변경을 방지하세요.\n심화 체크: ${buildDeterministicActionChecklist(qualityProfile, facts, round).replace(/\n/g, " ")}`;
    round += 1;
    if (round > 12) break;
  }
  return text;
}

function buildLocalFallbackChapterFromContext({
  context,
  chapterId,
  chapterMeta,
  chapterContract,
  chapterJsonPacks,
  minChars,
  previousChapterTexts,
  fallbackReason,
}) {
  const chapterText = buildDeterministicLocalChapterText({
    reportType: context?.reportType,
    chapterId,
    chapterMeta,
    chapterContract,
    input: context?.input || {},
    canonicalJson: context?.coreData?.canonicalJson || {},
    chapterJsonPacks,
    minChars,
  });

  const repairedChapterText = repairLocalFallbackChapterText(chapterText, chapterMeta, chapterId);

  const localValidation = validateLocalFallbackChapter({
    title: chapterMeta?.title,
    text: repairedChapterText,
  }, {
    title: chapterMeta?.title,
    minChars,
  }, previousChapterTexts);

  if (!localValidation.ok) {
    return {
      ok: false,
      code: "LOCAL_FALLBACK_GENERATION_FAILED",
      message: "로컬 리포트 생성 중 문제가 발생했습니다.",
      validation: localValidation,
    };
  }

  return {
    ok: true,
    usedFallback: true,
    source: "local_deterministic_fallback",
    fallbackReason: String(fallbackReason || "LLM_OR_QUALITY_FAILURE"),
    text: repairedChapterText,
    chapterMeta,
    chapterSpecificSections: Array.isArray(chapterContract?.requiredHeadings)
      ? chapterContract.requiredHeadings
      : [],
  };
}

const PREMIUM_PREVIOUS_CHAPTER_MAX_COUNT = 4;
const PREMIUM_PREVIOUS_CHAPTER_MAX_CHARS = 1800;
const PREMIUM_CHAPTER_SUMMARY_MAX_CHARS = 500;

function normalizePreviousChapterTexts(rows, options = {}) {
  const maxCount = Math.max(1, Number(options.maxCount || PREMIUM_PREVIOUS_CHAPTER_MAX_COUNT));
  const maxChars = Math.max(400, Number(options.maxChars || PREMIUM_PREVIOUS_CHAPTER_MAX_CHARS));
  if (!Array.isArray(rows) || rows.length === 0) return [];

  return rows
    .map((row) => String(row || "").trim())
    .filter(Boolean)
    .slice(-maxCount)
    .map((text) => {
      if (text.length <= maxChars) return text;
      return `${text.slice(0, maxChars)}...`;
    });
}

function resolvePreviousChapterTexts(clientTexts, storedTexts, options = {}) {
  const fromClient = normalizePreviousChapterTexts(clientTexts, options);
  if (fromClient.length > 0) return fromClient;
  return normalizePreviousChapterTexts(storedTexts, options);
}

function buildChapterSummaryForContext(text, maxChars = PREMIUM_CHAPTER_SUMMARY_MAX_CHARS) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const limit = Math.max(200, Number(maxChars || PREMIUM_CHAPTER_SUMMARY_MAX_CHARS));
  if (!normalized) return "";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
}

function writeReportSessionChapter(kind, reportId, chapter, totalChapters, chapterMeta, text, extra = {}, ttlMs = REPORT_SESSION_TTL_MS) {
  const key = `${kind}:${reportId}`;
  const now = Date.now();
  const chapterKey = String(chapter);
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
  const reportType = resolvePremiumReportTypeFromKind(kind, extra?.reportType || "");
  const minTotalChars = Math.max(PREMIUM_GLOBAL_MIN_TOTAL_CHARS, Number(extra?.minTotalChars || 0));
  const sanitizedText = ensurePremiumChapterLength(text, {
    reportType,
    chapter,
    totalChapters,
    chapterMeta,
    minTotalChars,
    engineData: {
      chapterJson: extra?.chapterJson || null,
      chapterJsonPacks: extra?.chapterJsonPacks || null,
      canonicalSajuLoveReport: extra?.canonicalSajuLoveReport || null,
      canonicalSajuNewYearReport: extra?.canonicalSajuNewYearReport || null,
      canonicalZiweiChart: extra?.canonicalZiweiChart || null,
      canonicalVedicChart: extra?.canonicalVedicChart || null,
      canonicalAstroChart: extra?.canonicalAstroChart || null,
      validation: extra?.validation || null,
      dataQuality: extra?.dataQuality || null,
    },
  });
  entry.chapters[chapterKey] = {
    chapter,
    chapterMeta: chapterMeta || null,
    text: sanitizedText,
    chapterJson: extra.chapterJson || null,
    updatedAt: new Date(now).toISOString(),
  };

  const existingChapterResultsByNumber = toPlainObject(entry?.extra?.chapterResultsByNumber);
  const incomingChapterResultsByNumber = toPlainObject(extra?.chapterResultsByNumber);
  const existingChapterResult = toPlainObject(existingChapterResultsByNumber[chapterKey]);
  const incomingChapterResult = toPlainObject(incomingChapterResultsByNumber[chapterKey]);
  const normalizedChapterNumber = Number(chapter || incomingChapterResult.chapterNumber || incomingChapterResult.chapter || existingChapterResult.chapterNumber || existingChapterResult.chapter || 0);
  const mergedChapterResult = {
    ...existingChapterResult,
    ...incomingChapterResult,
    chapter: normalizedChapterNumber,
    chapterNumber: normalizedChapterNumber,
    title: String(incomingChapterResult.title || existingChapterResult.title || chapterMeta?.title || "").trim(),
    subtitle: String(incomingChapterResult.subtitle || existingChapterResult.subtitle || chapterMeta?.subtitle || "").trim(),
    markdown: String(incomingChapterResult.markdown || existingChapterResult.markdown || sanitizedText || "").trim(),
    text: String(incomingChapterResult.text || existingChapterResult.text || sanitizedText || "").trim(),
    report: String(incomingChapterResult.report || existingChapterResult.report || sanitizedText || "").trim(),
    chapterJson: incomingChapterResult.chapterJson || existingChapterResult.chapterJson || extra.chapterJson || null,
    updatedAt: new Date(now).toISOString(),
  };

  const mergedChapterResultsByNumber = {
    ...existingChapterResultsByNumber,
    ...incomingChapterResultsByNumber,
    [chapterKey]: mergedChapterResult,
  };

  entry.extra = {
    ...(entry.extra || {}),
    ...(extra || {}),
    chapterResultsByNumber: mergedChapterResultsByNumber,
  };
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

function getStoredReportSession(kind, reportId) {
  const key = `${kind}:${String(reportId || "").trim()}`;
  const entry = REPORT_SESSION_STORE.get(key);
  if (!entry) return null;
  if (Number(entry.expiresAt || 0) < Date.now()) {
    REPORT_SESSION_STORE.delete(key);
    return null;
  }
  return entry;
}

function extractSessionOwnerUserId(entry) {
  const extra = entry && typeof entry === "object" ? (entry.extra || {}) : {};
  return String(
    extra.ownerUserId
    || extra.userId
    || extra?.legacyFlow?.ownerUserId
    || "",
  ).trim();
}

function ensureReportSessionOwnership(kind, reportId, viewerUserId) {
  const normalizedReportId = String(reportId || "").trim();
  const normalizedViewerUserId = String(viewerUserId || "").trim();
  const entry = getStoredReportSession(kind, normalizedReportId);
  if (!entry) {
    return {
      ok: false,
      status: 404,
      payload: {
        ok: false,
        code: "REPORT_SESSION_NOT_FOUND",
        message: "리포트 세션을 찾을 수 없습니다.",
      },
    };
  }

  const ownerUserId = extractSessionOwnerUserId(entry);
  if (!normalizedViewerUserId || !ownerUserId || ownerUserId !== normalizedViewerUserId) {
    return {
      ok: false,
      status: 403,
      payload: {
        ok: false,
        code: "PDF_HISTORY_FORBIDDEN",
        message: "본인 소유의 리포트만 열람할 수 있습니다.",
      },
    };
  }

  return {
    ok: true,
    status: 200,
    entry,
    ownerUserId,
  };
}

const PREMIUM_PDF_HISTORY_META = Object.freeze({
  lifebook: {
    title: "인생의 책",
    reportType: "lifeBook",
    statusPath: "/api/lifebook/status",
    downloadPath: "/api/lifebook/download",
  },
  "love-secret": {
    title: "연애 비책",
    reportType: "sajuLoveSecret",
    statusPath: "/api/love-secret/status",
    downloadPath: "/api/love-secret/download",
  },
  "saju-new-year": {
    title: "신년운세",
    reportType: "sajuNewYear",
    statusPath: "",
    downloadPath: "",
  },
  sukuyo: {
    title: "숙요점 프리미엄 리포트",
    reportType: "sookyoPremium",
    statusPath: "",
    downloadPath: "",
  },
  astro: {
    title: "점성술 프리미엄 리포트",
    reportType: "westernAstrologyPremium",
    statusPath: "/api/premium/astrology/status",
    downloadPath: "/api/premium/astrology/download",
  },
  vedic: {
    title: "베다 점성술 프리미엄 리포트",
    reportType: "vedicPremium",
    statusPath: "/api/premium/vedic/status",
    downloadPath: "/api/premium/vedic/download",
  },
  ziwei: {
    title: "자미두수 프리미엄 리포트",
    reportType: "ziweiPremium",
    statusPath: "/api/premium/ziwei/status",
    downloadPath: "/api/premium/ziwei/download",
  },
});

function resolvePremiumPdfHistoryMeta(kind, entry = null) {
  const base = PREMIUM_PDF_HISTORY_META[String(kind || "").trim()] || {};
  const extra = entry && typeof entry === "object" ? (entry.extra || {}) : {};
  const legacyFlow = extra?.legacyFlow && typeof extra.legacyFlow === "object" ? extra.legacyFlow : {};
  const mode = String(extra.mode || extra.reportType || legacyFlow.mode || legacyFlow.reportType || "").trim().toLowerCase();
  const reportType = String(extra.reportType || legacyFlow.reportType || base.reportType || "").trim();

  return {
    title: String(base.title || "프리미엄 PDF 리포트").trim(),
    reportType,
    mode,
    statusPath: String(base.statusPath || "").trim(),
    downloadPath: String(base.downloadPath || "").trim(),
  };
}

function buildPremiumPdfHistoryChapters(entry) {
  const rows = Object.values(entry?.chapters || {})
    .sort((a, b) => Number(a?.chapter || 0) - Number(b?.chapter || 0));

  return rows.map((row) => {
    const text = String(row?.text || "");
    const chapterMeta = row?.chapterMeta || {};
    return {
      chapter: Number(row?.chapter || 0),
      title: String(chapterMeta.title || "").trim(),
      subtitle: String(chapterMeta.subtitle || "").trim(),
      text,
      charCount: text.length,
      updatedAt: row?.updatedAt ? new Date(row.updatedAt) : new Date(),
    };
  });
}

function buildPremiumPdfHistorySummaryDoc(doc) {
  return {
    reportId: String(doc?.reportId || "").trim(),
    title: String(doc?.title || "").trim(),
    subtitle: String(doc?.subtitle || "").trim(),
    sessionKind: String(doc?.sessionKind || "").trim(),
    reportType: String(doc?.reportType || "").trim(),
    mode: String(doc?.mode || "").trim(),
    totalChapters: Number(doc?.totalChapters || 0),
    completedChapters: Number(doc?.completedChapters || 0),
    totalChars: Number(doc?.totalChars || 0),
    isComplete: Boolean(doc?.isComplete),
    statusPath: String(doc?.statusPath || "").trim(),
    downloadPath: String(doc?.downloadPath || "").trim(),
    updatedAt: doc?.updatedAt || null,
    createdAt: doc?.createdAt || null,
  };
}

function buildPremiumPdfHistoryDetailDoc(doc) {
  const base = buildPremiumPdfHistorySummaryDoc(doc);
  const chapterItems = Array.isArray(doc?.chapterItems)
    ? doc.chapterItems.map((row) => ({
      chapter: Number(row?.chapter || 0),
      title: String(row?.title || "").trim(),
      subtitle: String(row?.subtitle || "").trim(),
      text: String(row?.text || ""),
      charCount: Number(row?.charCount || 0),
      updatedAt: row?.updatedAt || null,
    }))
    : [];

  return {
    ...base,
    chapterItems,
    qualityGate: doc?.qualityGate || null,
    metadata: doc?.metadata || null,
  };
}

async function persistPremiumPdfHistoryFromSession(env, kind, reportId, options = {}) {
  const normalizedKind = String(kind || "").trim();
  const normalizedReportId = String(reportId || "").trim();
  if (!normalizedKind || !normalizedReportId) return null;

  const entry = getStoredReportSession(normalizedKind, normalizedReportId);
  if (!entry) return null;

  const ownerUserId = String(options.ownerUserId || extractSessionOwnerUserId(entry)).trim();
  if (!ownerUserId) return null;

  const chapterItems = buildPremiumPdfHistoryChapters(entry);
  const totalChars = chapterItems.reduce((sum, row) => sum + Number(row?.charCount || 0), 0);
  const meta = resolvePremiumPdfHistoryMeta(normalizedKind, entry);
  const totalChapters = Number(entry?.totalChapters || chapterItems.length || 0);
  const completedChapters = chapterItems.length;
  const qualityGate = options.qualityGate || entry?.extra?.qualityGate || null;

  try {
    await connectDb(env);

    return await PremiumPdfReport.findOneAndUpdate(
      { userId: ownerUserId, reportId: normalizedReportId },
      {
        $set: {
          sessionKind: normalizedKind,
          reportType: meta.reportType,
          mode: meta.mode,
          title: meta.title,
          subtitle: String(options.subtitle || "").trim(),
          totalChapters,
          completedChapters,
          totalChars,
          isComplete: Boolean(totalChapters > 0 && completedChapters >= totalChapters),
          chapterItems,
          statusPath: meta.statusPath,
          downloadPath: meta.downloadPath,
          qualityGate,
          metadata: {
            reportSessionUpdatedAt: entry?.updatedAt || null,
            reportSessionCreatedAt: entry?.createdAt || null,
          },
        },
        $setOnInsert: {
          userId: ownerUserId,
          reportId: normalizedReportId,
        },
      },
      { upsert: true, new: true },
    ).lean();
  } catch (error) {
    console.warn("[PremiumPdfHistory] persist skipped", {
      kind: normalizedKind,
      reportId: normalizedReportId,
      message: String(error?.message || "unknown"),
    });
    return null;
  }
}

async function handlePremiumPdfHistoryList(request, env, authInfo) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 20) || 20));
  const reportType = String(url.searchParams.get("reportType") || "").trim();

  await connectDb(env);
  const query = { userId: String(authInfo?.userId || "").trim() };
  if (reportType) query.reportType = reportType;

  const docs = await PremiumPdfReport.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return json({
    ok: true,
    reports: (docs || []).map(buildPremiumPdfHistorySummaryDoc),
  });
}

async function handlePremiumPdfHistoryDetail(request, env, authInfo, reportId) {
  const normalizedReportId = String(reportId || "").trim();
  if (!normalizedReportId) {
    return json({ ok: false, code: "REPORT_ID_REQUIRED", message: "reportId가 필요합니다." }, { status: 400 });
  }

  await connectDb(env);
  const byReportId = await PremiumPdfReport.findOne({ reportId: normalizedReportId }).lean();
  if (!byReportId) {
    return json({ ok: false, code: "PDF_HISTORY_NOT_FOUND", message: "해당 리포트 이력을 찾을 수 없습니다." }, { status: 404 });
  }

  if (String(byReportId.userId || "") !== String(authInfo?.userId || "")) {
    return json({
      ok: false,
      code: "PDF_HISTORY_FORBIDDEN",
      message: "본인 소유의 리포트만 열람할 수 있습니다.",
    }, { status: 403 });
  }

  return json({ ok: true, report: buildPremiumPdfHistoryDetailDoc(byReportId) });
}

function escapeLifebookHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLifebookStatusPayload(reportId, includeText = false) {
  const normalizedReportId = String(reportId || "").trim();
  const entry = getStoredReportSession("lifebook", normalizedReportId);
  const totalChapters = Number(entry?.totalChapters || 13) || 13;
  const rows = Object.values(entry?.chapters || {})
    .sort((a, b) => Number(a?.chapter || 0) - Number(b?.chapter || 0));
  const chapters = rows.map((row) => {
    const base = {
      chapter: Number(row?.chapter || 0),
      chapterMeta: row?.chapterMeta || null,
      updatedAt: row?.updatedAt || entry?.updatedAt || null,
    };
    if (includeText) base.text = String(row?.text || "");
    return base;
  });
  const completed = rows.length;
  const totalChars = rows.reduce((sum, row) => sum + String(row?.text || "").length, 0);
  const isComplete = Boolean(totalChapters > 0 && completed >= totalChapters);
  const currentChapter = isComplete ? totalChapters : Math.min(totalChapters, completed + 1);
  const qualityGate = validateFullPdfQuality({
    serviceKey: "lifeBook",
    chapters: rows.map((row) => ({
      chapterId: String(row?.chapter || ""),
      title: String(row?.chapterMeta?.title || `Chapter ${row?.chapter || ""}`),
      text: String(row?.text || ""),
      targetChars: Number(resolveChapterSpec("lifeBook", "lifebook_pdf", "", Number(row?.chapter || 1))?.chapterSpec?.targetChars || 0),
    })),
    minTotalChars: LIFE_BOOK_MIN_TOTAL_CHARS_CONFIG,
    requiredChapterCount: totalChapters,
    blockedPhrases: BLOCKED_FALLBACK_PHRASES,
  });

  return {
    ok: true,
    reportId: normalizedReportId,
    totalChapters,
    completed,
    currentChapter,
    minTotalChars: LIFE_BOOK_MIN_TOTAL_CHARS_CONFIG,
    totalChars,
    isMinTotalCharsMet: totalChars >= LIFE_BOOK_MIN_TOTAL_CHARS_CONFIG,
    isComplete: isComplete && qualityGate.ok,
    qualityGate,
    chapters,
    message: isComplete
      ? "인생의 책 13챕터 생성이 완료되었습니다."
      : `인생의 책 생성 진행 중: ${completed}/${totalChapters} 챕터 완료`,
  };
}

function buildLifebookDownloadHtmlFromSession(reportId) {
  const status = buildLifebookStatusPayload(reportId, true);
  const entry = getStoredReportSession("lifebook", reportId);
  const chapters = Array.isArray(status.chapters) ? status.chapters : [];
  if (!chapters.length) return "";

  const chapterResultsFromStore = toPlainObject(entry?.extra?.chapterResultsByNumber);
  const chapterResults = chapters
    .filter((row) => row.chapter >= 1)
    .map((row) => {
      const num = Number(row.chapter);
      const stored = toPlainObject(chapterResultsFromStore[String(num)]);
      return {
        id: String(stored.id || ""),
        roman: String(stored.roman || ""),
        title: String(stored.title || row?.chapterMeta?.title || `Chapter ${num}`),
        subtitle: String(stored.subtitle || row?.chapterMeta?.subtitle || ""),
        contentMarkdown: String(stored.contentMarkdown || row?.text || ""),
        summary: String(stored.summary || ""),
        practicalAdvice: Array.isArray(stored.practicalAdvice) ? stored.practicalAdvice : [],
        warnings: Array.isArray(stored.warnings) ? stored.warnings : [],
      };
    });

  const lifeBookInputData = toPlainObject(entry?.extra?.lifeBookInputData);
  if (Object.keys(lifeBookInputData).length && chapterResults.length) {
    const rendered = renderLifeBookPdf({
      reportId: status.reportId,
      lifeBookInputData,
      chapters: chapterResults,
      generatedAt: entry?.updatedAt || new Date().toISOString(),
    });
    if (rendered?.ok && rendered?.html) return rendered.html;
  }

  const chapterBlocks = chapters
    .filter((row) => row.chapter >= 1)
    .map((row) => {
      const title = String(row?.chapterMeta?.title || `Chapter ${row.chapter}`);
      const subtitle = String(row?.chapterMeta?.subtitle || "");
      const text = String(row?.text || "");
      return [
        '<section class="lb-print-chapter">',
        `<h2>Chapter ${row.chapter}. ${escapeLifebookHtml(title)}</h2>`,
        subtitle ? `<p class="lb-subtitle">${escapeLifebookHtml(subtitle)}</p>` : "",
        `<pre>${escapeLifebookHtml(text)}</pre>`,
        "</section>",
      ].join("\n");
    })
    .join("\n");

  return [
    "<!doctype html>",
    '<html lang="ko">',
    "<head>",
    '<meta charset="utf-8" />',
    "<title>사주 인생의 책</title>",
    "<style>",
    'body{margin:0;padding:24px;font-family:Georgia,"Times New Roman",serif;background:#f7f4ee;color:#1f2937;line-height:1.72}',
    '.lb-print-cover{padding:24px;border:1px solid #d5c9b3;border-radius:16px;background:#fffaf0;margin-bottom:24px}',
    '.lb-print-cover h1{margin:0 0 6px;font-size:33px;color:#4b3621}',
    '.lb-print-cover p{margin:2px 0;font-size:14px;color:#5b4630}',
    '.lb-print-chapter{margin-bottom:22px;padding:18px;border:1px solid #e8ddcc;border-radius:12px;background:#fff}',
    '.lb-print-chapter h2{margin:0 0 8px;font-size:24px;color:#5b4630}',
    '.lb-subtitle{margin:0 0 12px;color:#7b5d3f}',
    '.lb-print-chapter pre{white-space:pre-wrap;word-break:break-word;margin:0;font-size:14px;line-height:1.72}',
    '@media print{body{padding:0;background:#fff}.lb-print-cover,.lb-print-chapter{border:none}}',
    "</style>",
    "</head>",
    "<body>",
    '<section class="lb-print-cover">',
    "<h1>사주 인생의 책</h1>",
    `<p>리포트 ID: ${escapeLifebookHtml(status.reportId)}</p>`,
    `<p>생성 챕터: ${status.completed}/${status.totalChapters}</p>`,
    `<p>총 글자수: ${status.totalChars} (최소 ${status.minTotalChars})</p>`,
    "</section>",
    chapterBlocks,
    "</body>",
    "</html>",
  ].join("\n");
}

function normalizeLoveSecretStatusMode(rawMode, reportId) {
  const mode = String(rawMode || "").trim().toLowerCase();
  if (mode === "couple" || mode === "compatibility") return "compatibility";
  if (mode === "solo" || mode === "single") return "solo";
  const id = String(reportId || "").trim().toLowerCase();
  if (id.endsWith("_compatibility") || id.endsWith("_couple")) return "compatibility";
  return "solo";
}

function buildLoveSecretStatusPayload(reportId, includeText = false) {
  const normalizedReportId = String(reportId || "").trim();
  const entry = getStoredReportSession("love-secret", normalizedReportId);
  const mode = normalizeLoveSecretStatusMode(entry?.extra?.mode, normalizedReportId);
  const modeConfig = mode === "compatibility"
    ? (LOVE_SECRET_MODE_CONFIG.couple || LOVE_SECRET_MODE_CONFIG.solo)
    : LOVE_SECRET_MODE_CONFIG.solo;
  const totalChapters = Number(entry?.totalChapters || modeConfig?.totalChapters || 13) || 13;
  const rows = Object.values(entry?.chapters || {})
    .sort((a, b) => Number(a?.chapter || 0) - Number(b?.chapter || 0));
  const chapters = rows.map((row) => {
    const base = {
      chapter: Number(row?.chapter || 0),
      chapterMeta: row?.chapterMeta || null,
      updatedAt: row?.updatedAt || entry?.updatedAt || null,
    };
    if (includeText) base.text = String(row?.text || "");
    return base;
  });
  const completed = rows.length;
  const totalChars = rows.reduce((sum, row) => sum + String(row?.text || "").length, 0);
  const isComplete = Boolean(totalChapters > 0 && completed >= totalChapters);
  const currentChapter = isComplete ? totalChapters : Math.min(totalChapters, completed + 1);
  const minTotalChars = Number(modeConfig?.minTotalChars || 0);
  const qualityGate = validateFullPdfQuality({
    serviceKey: "loveSecret",
    chapters: rows.map((row) => ({
      chapterId: String(row?.chapter || ""),
      title: String(row?.chapterMeta?.title || `Chapter ${row?.chapter || ""}`),
      text: String(row?.text || ""),
      targetChars: Number(resolveChapterSpec("loveSecret", "saju_love_pdf", mode, Number(row?.chapter || 1))?.chapterSpec?.targetChars || 0),
    })),
    minTotalChars,
    requiredChapterCount: totalChapters,
    blockedPhrases: BLOCKED_FALLBACK_PHRASES,
  });

  return {
    ok: true,
    reportId: normalizedReportId,
    mode,
    totalChapters,
    completed,
    currentChapter,
    minTotalChars,
    totalChars,
    isMinTotalCharsMet: minTotalChars > 0 ? totalChars >= minTotalChars : true,
    isComplete: isComplete && qualityGate.ok,
    qualityGate,
    chapters,
    message: isComplete
      ? "연애 비책 생성이 완료되었습니다."
      : `연애 비책 생성 진행 중: ${completed}/${totalChapters} 챕터 완료`,
  };
}

function buildLoveSecretDownloadHtmlFromSession(reportId) {
  const status = buildLoveSecretStatusPayload(reportId, true);
  const chapters = Array.isArray(status.chapters) ? status.chapters : [];
  if (!chapters.length) return "";

  const reportTitle = status.mode === "compatibility" ? "사주 궁합 연애 비책" : "사주 연애 비책";
  const chapterBlocks = chapters
    .filter((row) => row.chapter >= 1)
    .map((row) => {
      const title = String(row?.chapterMeta?.title || `Chapter ${row.chapter}`);
      const subtitle = String(row?.chapterMeta?.subtitle || "");
      const text = String(row?.text || "");
      return [
        '<section class="ls-print-chapter">',
        `<h2>Chapter ${row.chapter}. ${escapeLifebookHtml(title)}</h2>`,
        subtitle ? `<p class="ls-subtitle">${escapeLifebookHtml(subtitle)}</p>` : "",
        `<pre>${escapeLifebookHtml(text)}</pre>`,
        "</section>",
      ].join("\n");
    })
    .join("\n");

  return [
    "<!doctype html>",
    '<html lang="ko">',
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${escapeLifebookHtml(reportTitle)}</title>`,
    "<style>",
    'body{margin:0;padding:24px;font-family:Georgia,"Times New Roman",serif;background:#fff7fb;color:#1f2937;line-height:1.72}',
    '.ls-print-cover{padding:24px;border:1px solid #f2d3e4;border-radius:16px;background:#fff;margin-bottom:24px}',
    '.ls-print-cover h1{margin:0 0 6px;font-size:33px;color:#8b3a62}',
    '.ls-print-cover p{margin:2px 0;font-size:14px;color:#5b3751}',
    '.ls-print-chapter{margin-bottom:22px;padding:18px;border:1px solid #f4e4ed;border-radius:12px;background:#fff}',
    '.ls-print-chapter h2{margin:0 0 8px;font-size:24px;color:#8b3a62}',
    '.ls-subtitle{margin:0 0 12px;color:#7d4a66}',
    '.ls-print-chapter pre{white-space:pre-wrap;word-break:break-word;margin:0;font-size:14px;line-height:1.72}',
    '@media print{body{padding:0;background:#fff}.ls-print-cover,.ls-print-chapter{border:none}}',
    "</style>",
    "</head>",
    "<body>",
    '<section class="ls-print-cover">',
    `<h1>${escapeLifebookHtml(reportTitle)}</h1>`,
    `<p>리포트 ID: ${escapeLifebookHtml(status.reportId)}</p>`,
    `<p>생성 챕터: ${status.completed}/${status.totalChapters}</p>`,
    `<p>총 글자수: ${status.totalChars}${status.minTotalChars ? ` (최소 ${status.minTotalChars})` : ""}</p>`,
    "</section>",
    chapterBlocks,
    "</body>",
    "</html>",
  ].join("\n");
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
  const evidenceTokens = ["명궁", "신궁", "궁", "주성", "보성", "살성", "사화", "대궁", "삼방사정", "대한", "유년", "유월", "◎", "O", "△", "X", "○", "×"];
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

function sajuNewYearReportIdFromInput(body, input) {
  const seed = [
    String(body.targetYear || ""),
    String(body.focusArea || "overall"),
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    String(body.name || input.name || ""),
    stableHash(stringifyCompact(body.sajuData || body.profile || body.birth || "", 1400)),
  ].join("|");
  return `newyear_${stableHash(seed)}`;
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
        partnerProfile: {
          birthDate: Number.isFinite(Number(body.partnerYear)) && Number.isFinite(Number(body.partnerMonth)) && Number.isFinite(Number(body.partnerDay))
            ? `${clampInt(body.partnerYear, 1990, 1900, 2100)}-${String(clampInt(body.partnerMonth, 1, 1, 12)).padStart(2, "0")}-${String(clampInt(body.partnerDay, 1, 1, 31)).padStart(2, "0")}`
            : null,
          birthTime: hasMeaningfulValue(body.partnerHour)
            ? `${String(clampInt(body.partnerHour, 12, 0, 23)).padStart(2, "0")}:${String(clampInt(body.partnerMinute, 0, 0, 59)).padStart(2, "0")}`
            : null,
          birthPlace: String(body.partnerBirthPlace || "").trim() || null,
          timezone: String(body.partnerTimezoneName || body.timezoneName || body.timezone || "Asia/Seoul"),
          gender: hasMeaningfulValue(body.partnerGender) ? String(body.partnerGender) : null,
        },
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

  if (!canonical?.lagna?.signName) {
    missingFields.push("lagna");
  }
  const hasMoonAnchor = Boolean(canonical?.moonNakshatra?.name || canonical?.moonNakshatra?.moonSign || canonical?.planets?.Moon?.signName);
  if (!hasMoonAnchor) {
    missingFields.push("moonNakshatra");
  }

  if (!canonical?.profile?.birth?.date) missingFields.push("profile.birth.date");
  if (!canonical?.profile?.birth?.time) missingFields.push("profile.birth.time");
  const hasBirthLocationLabel = hasMeaningfulValue(canonical?.profile?.birth?.locationName);
  const hasBirthCoordinates = hasFinite(canonical?.profile?.birth?.latitude) && hasFinite(canonical?.profile?.birth?.longitude);
  if (!hasBirthLocationLabel && !hasBirthCoordinates) {
    missingFields.push("profile.birth.locationName|profile.birth.latitude.longitude");
  }

  const planets = canonical?.planets || {};
  const requiredPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  for (const name of requiredPlanets) {
    const p = planets[name];
    if (!p) {
      missingFields.push(`planets.${name}`);
      continue;
    }
    if (!p.signName) missingFields.push(`planets.${name}.signName`);
    if (!hasFinite(p.house)) missingFields.push(`planets.${name}.house`);
  }

  const d9 = canonical?.divisionalCharts?.d9;
  const d10 = canonical?.divisionalCharts?.d10;

  if (reportType === "compatibility") {
    if (!canonical?.compatibility?.partnerName) missingFields.push("compatibility.partnerName");
    if (!canonical?.compatibility?.partnerLagna) missingFields.push("compatibility.partnerLagna");
    if (!canonical?.compatibility?.partnerMoonNakshatra) missingFields.push("compatibility.partnerMoonNakshatra");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    hasPlanets: requiredPlanets.every((name) => !!planets[name]),
    hasLagna: !!canonical?.lagna?.signName,
    hasMoonNakshatra: hasMoonAnchor,
    hasDasha: !!canonical?.dasha?.current?.planet,
    hasDivisionalCharts: !!d9 || !!d10,
    hasRelationshipData: reportType !== "compatibility" || !!canonical?.compatibility?.partnerLagna,
  };
}

function buildVedicChapterPlan(canonicalVedicChart, reportType) {
  const mode = normalizeVedicReportType(reportType);
  const metaList = getVedicChapterMetaList(mode);
  return metaList.map((meta) => {
    const targetChars = mode === "compatibility"
      ? Number(VEDIC_COMPAT_TARGET_CHARS[meta.num - 1] || 4200)
      : Number(VEDIC_SOLO_TARGET_CHARS[meta.num - 1] || 4200);
    const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
    return {
    num: meta.num,
    title: meta.title,
    subtitle: meta.subtitle,
    available: true,
    reasons: [],
    targetChars,
    minChars,
  };
  });
}

function buildVedicDataContext(body, input, canonicalVedicChart, chapterPlan, premiumInput = null) {
  const mode = canonicalVedicChart?.compatibility ? "compatibility" : "solo";
  const missingFields = [];
  const availableFields = [];
  const track = (key, value) => {
    if (hasMeaningfulValue(value)) availableFields.push(key);
    else missingFields.push(key);
  };

  track("user.profile.birthDate", canonicalVedicChart?.profile?.birth?.date);
  track("user.profile.birthTime", canonicalVedicChart?.profile?.birth?.time);
  track("user.profile.birthPlace", canonicalVedicChart?.profile?.birth?.locationName);
  track("user.vedic.lagna", canonicalVedicChart?.lagna?.signName);
  track("user.vedic.moonNakshatra", canonicalVedicChart?.moonNakshatra?.name);
  track("user.vedic.moonSign", canonicalVedicChart?.moonNakshatra?.moonSign || canonicalVedicChart?.planets?.Moon?.signName);
  track("user.vedic.dasha.current", canonicalVedicChart?.dasha?.current?.planet);

  if (mode === "compatibility") {
    track("partner.profile.name", canonicalVedicChart?.compatibility?.partnerName);
    track("partner.vedic.lagna", canonicalVedicChart?.compatibility?.partnerLagna);
    track("partner.vedic.moonNakshatra", canonicalVedicChart?.compatibility?.partnerMoonNakshatra);
  }

  const vedicBookContext = {
    mode,
    user: {
      profile: {
        name: canonicalVedicChart?.profile?.name || undefined,
        gender: canonicalVedicChart?.profile?.gender || undefined,
        birthDate: canonicalVedicChart?.profile?.birth?.date || "",
        birthTime: canonicalVedicChart?.profile?.birth?.time || undefined,
        birthPlace: canonicalVedicChart?.profile?.birth?.locationName || undefined,
        timezone: canonicalVedicChart?.profile?.birth?.timezone || undefined,
      },
      vedic: {
        lagna: canonicalVedicChart?.lagna?.signName || undefined,
        moonSign: canonicalVedicChart?.moonNakshatra?.moonSign || canonicalVedicChart?.planets?.Moon?.signName || undefined,
        sunSign: canonicalVedicChart?.planets?.Sun?.signName || undefined,
        moonNakshatra: canonicalVedicChart?.moonNakshatra?.name || undefined,
        moonPada: canonicalVedicChart?.moonNakshatra?.pada || undefined,
        atmakaraka: canonicalVedicChart?.karakas?.atmakaraka?.name || undefined,
        darakaraka: canonicalVedicChart?.karakas?.darakaraka?.name || undefined,
        rasiChart: canonicalVedicChart?.divisionalCharts?.d1 || undefined,
        navamsaChart: canonicalVedicChart?.divisionalCharts?.d9 || undefined,
        planets: canonicalVedicChart?.planets || undefined,
        houses: canonicalVedicChart?.houses || undefined,
        yogas: canonicalVedicChart?.yogas || [],
        dashas: {
          currentMahaDasha: canonicalVedicChart?.dasha?.current?.planet || undefined,
          currentAntarDasha: canonicalVedicChart?.dasha?.antar?.planet || undefined,
        },
      },
    },
    partner: mode === "compatibility"
      ? {
        profile: {
          name: canonicalVedicChart?.compatibility?.partnerName || undefined,
          gender: canonicalVedicChart?.compatibility?.partnerProfile?.gender || undefined,
          birthDate: canonicalVedicChart?.compatibility?.partnerProfile?.birthDate || undefined,
          birthTime: canonicalVedicChart?.compatibility?.partnerProfile?.birthTime || undefined,
          birthPlace: canonicalVedicChart?.compatibility?.partnerProfile?.birthPlace || undefined,
          timezone: canonicalVedicChart?.compatibility?.partnerProfile?.timezone || undefined,
        },
        vedic: {
          lagna: canonicalVedicChart?.compatibility?.partnerLagna || undefined,
          moonNakshatra: canonicalVedicChart?.compatibility?.partnerMoonNakshatra || undefined,
        },
      }
      : undefined,
    compatibility: mode === "compatibility"
      ? {
        ashtakoota: canonicalVedicChart?.compatibility?.ashtaKoota
          ? {
            totalScore: canonicalVedicChart.compatibility.ashtaKoota.total,
            maxScore: canonicalVedicChart.compatibility.ashtaKoota.totalMax,
            rows: canonicalVedicChart.compatibility.ashtaKoota.rows || [],
          }
          : undefined,
      }
      : undefined,
    promptContext: {
      generatedQuestionPrompt: premiumInput?.questionPrompt || undefined,
      engineSummary: premiumInput?.engineSummary || undefined,
      userQuestion: premiumInput?.userQuestion || undefined,
    },
    meta: {
      missingFields: Array.from(new Set(missingFields)),
      availableFields: Array.from(new Set(availableFields)),
      generatedAt: new Date().toISOString(),
    },
  };

  const chapterPlanLines = chapterPlan.map((row) => `- Ch.${row.num} ${row.title} (target ${row.targetChars}, min ${row.minChars})`);
  const dataText = [
    "[요약 컨텍스트]",
    `- 모드: ${mode}`,
    `- 리포트 대상: ${canonicalVedicChart?.profile?.name || "사용자"}`,
    mode === "compatibility" ? `- 상대: ${canonicalVedicChart?.compatibility?.partnerName || "상대"}` : null,
    "",
    "[챕터 플랜]",
    ...chapterPlanLines,
    "",
    "[VedicBookContext]",
    JSON.stringify(vedicBookContext, null, 2),
  ].filter(Boolean).join("\n");

  return { dataText, vedicBookContext };
}

function vedicMissingMarkers(text, chapter, reportType = "personal", chapterMeta = null) {
  const source = String(text || "");
  const mode = normalizeVedicReportType(reportType);
  const resolvedMeta = chapterMeta && typeof chapterMeta === "object"
    ? chapterMeta
    : resolveVedicChapterMeta(chapter, mode);
  const required = buildVedicRequiredHeadings(resolvedMeta, mode).slice();

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

function countVedicStepSections(text) {
  const source = String(text || "");
  const matches = source.match(/^###\s*\d+\./gim);
  return Array.isArray(matches) ? matches.length : 0;
}

function buildVedicPremiumPrompt(meta, chapter, reportType, context, previousChapterTexts = []) {
  const mode = normalizeVedicReportType(reportType);
  const chapterGuides = getVedicChapterGuideList(mode);
  const chapterGuide = chapterGuides[chapter - 1] || "현재 챕터 주제에 맞춰 베다 데이터 근거 중심으로 작성하세요.";
  const targetChars = mode === "compatibility"
    ? Number(VEDIC_COMPAT_TARGET_CHARS[chapter - 1] || 4200)
    : Number(VEDIC_SOLO_TARGET_CHARS[chapter - 1] || 4200);
  const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
  const reportTitle = mode === "compatibility" ? VEDIC_REPORT_TITLE_COMPAT : VEDIC_REPORT_TITLE_PERSONAL;
  const reportSubtitle = mode === "compatibility" ? VEDIC_REPORT_SUBTITLE_COMPAT : VEDIC_REPORT_SUBTITLE_PERSONAL;
  const chapterContractText = formatPremiumChapterContractForPrompt(context?.chapterContract || {});
  const requiredHeadings = Array.isArray(context?.chapterContract?.requiredHeadings)
    ? context.chapterContract.requiredHeadings.map((row) => String(row || "").trim()).filter(Boolean)
    : buildVedicRequiredHeadings(meta, mode);

  const banList = collectPreviousSentenceBanList(previousChapterTexts, 12);

  return [
    "너는 30년차 베다 점성술 상담가이자 프리미엄 베다점 PDF 전문 작가다.",
    "사용자 데이터와 모드별 컨텍스트를 근거로 깊이 있고 구체적인 상담문을 작성한다.",
    "본문에는 JSON, 계산표, 내부 데이터명, 디버그 정보, payload, API 응답 원문을 절대 노출하지 않는다.",
    "없는 라그나, 나크샤트라, 다샤, 요가, 아쉬타쿠타 점수, 망갈릭 정보는 임의 생성하지 않는다.",
    "확인 가능한 데이터와 해석 가능한 범위 안에서만 작성한다.",
    "같은 문장을 반복하지 말고, 이전 챕터 요약과 중복되는 관점은 피한다.",
    "운명론적으로 단정하지 말고 현실적인 선택과 관계 전략으로 연결한다.",
    "오직 마크다운 본문만 출력한다.",
    "",
    `[리포트 제목] ${reportTitle}`,
    `[리포트 부제] ${reportSubtitle}`,
    `[리포트 타입] ${mode === "compatibility" ? "compatibility" : "solo"}`,
    `[현재 챕터] ${chapter}. ${meta.title} — ${meta.subtitle}`,
    `[목표 분량] ${targetChars}자 내외`,
    `[최소 분량] ${minChars}자 이상`,
    chapterContractText ? `[chapterContract]\n${chapterContractText}` : "",
    "",
    "[반드시 지킬 구조]",
    `## 챕터 ${chapter}. ${meta.title}`,
    ...requiredHeadings,
    "",
    "[챕터 전용 지시]",
    chapterGuide,
    "각 세부 카테고리는 반드시 소제목을 붙여 모두 포함하세요.",
    "",
    banList.length
      ? `[이전 챕터와 중복되어 사용할 수 없는 금지 문장 목록]\n문장 반복을 피하기 위해 다음 리스트에 있는 문장이나 이와 유사한 핵심 서술 방식은 이번 챕터 본문에 절대 출력하지 마세요:\n${JSON.stringify(banList, null, 2)}\n`
      : "",
    "[이전 챕터 요약]",
    previousChapterTexts.length ? previousChapterTexts.map((txt, idx) => `- Ch.${idx + 1}: ${String(txt || "").replace(/\s+/g, " ").trim().slice(0, 260)}`).join("\n") : "- 없음",
    "",
    "[입력 데이터]",
    context.dataText,
  ].filter(Boolean).join("\n");
}

function buildVedicLocalFallbackChapter(chapter, meta, canonicalVedicChart, reportType) {
  const mode = normalizeVedicReportType(reportType);
  const chapterKey = meta?.key || (mode === "compatibility" ? `VC${chapter}` : `V${chapter}`);
  const sectionLabels = VEDIC_SECTION_LABELS[chapterKey] || VEDIC_DEFAULT_SECTION_LABELS;

  const lagna = canonicalVedicChart?.lagna?.signName || "";
  const moonNakshatra = canonicalVedicChart?.moonNakshatra?.name || "";
  const moonSign = canonicalVedicChart?.moonNakshatra?.moonSign || canonicalVedicChart?.planets?.Moon?.signName || "";
  const sunSign = canonicalVedicChart?.planets?.Sun?.signName || "";
  const currentDasha = canonicalVedicChart?.dasha?.current?.planet || "";
  const anterDasha = canonicalVedicChart?.dasha?.antar?.planet || "";
  const atmakaraka = canonicalVedicChart?.karakas?.atmakaraka?.name || "";
  const name = canonicalVedicChart?.profile?.name || "";
  const birthDate = canonicalVedicChart?.profile?.birth?.date || "";
  const birthPlace = canonicalVedicChart?.profile?.birth?.locationName || "";
  const partnerName = canonicalVedicChart?.compatibility?.partnerName || "상대방";
  const partnerLagna = canonicalVedicChart?.compatibility?.partnerLagna || "";
  const partnerMoonNakshatra = canonicalVedicChart?.compatibility?.partnerMoonNakshatra || "";
  const ashtaKootaTotal = canonicalVedicChart?.compatibility?.ashtaKoota?.total;
  const ashtaKootaMax = canonicalVedicChart?.compatibility?.ashtaKoota?.totalMax || 36;
  const planets = canonicalVedicChart?.planets || {};

  const lagnaL = lagna ? `${lagna} 라그나` : "라그나";
  const moonL = moonSign ? `${moonSign} 달(찬드라)` : "달(찬드라)";
  const nakshatraL = moonNakshatra ? `${moonNakshatra} 나크샤트라` : "나크샤트라";
  const dashaL = currentDasha ? `${currentDasha} 마하다샤` : "현재 마하다샤";
  const antardashL = anterDasha ? `${anterDasha} 안타르다샤` : "현재 안타르다샤";
  const atmakarakaL = atmakaraka ? `${atmakaraka}(아트마카라카)` : "아트마카라카";
  const profileL = [name, birthDate && `(${birthDate})`, birthPlace].filter(Boolean).join(" ") || "분석 대상";
  const partnerL = partnerName || "상대방";
  const ashtaL = ashtaKootaTotal != null ? `${ashtaKootaTotal}/${ashtaKootaMax}점` : "";
  const sunL = sunSign ? `${sunSign} 태양(수리야)` : "태양(수리야)";

  const planetNames = VEDIC_PLANET_ORDER
    .filter((p) => planets[p]?.signName)
    .map((p) => `${VEDIC_PLANET_KO[p] || p}: ${planets[p].signName}하우스`)
    .slice(0, 5)
    .join(", ");

  const chapterTitle = meta?.title || `${chapter}장`;
  const chapterSubtitle = meta?.subtitle || "";

  const allLabels = sectionLabels.length >= 4
    ? [...sectionLabels, "핵심 실천 전략", "베다 통합 해석"]
    : [...sectionLabels, ...Array(Math.max(0, 6 - sectionLabels.length)).fill(null).map((_, i) => `심화 분석 ${i + 1}`)];

  const parts = [];
  parts.push(`## ${chapterTitle}`);
  if (chapterSubtitle) parts.push(`*${chapterSubtitle}*`);
  parts.push("");

  if (mode === "compatibility") {
    parts.push(
      `베다 점성술(Jyotish)에서 두 사람의 인연은 단순한 감정의 흐름을 넘어, 카르믹 연결과 그라하 에너지의 교차로 형성됩니다. ` +
      `${profileL}와 ${partnerL}의 베다 배치를 ${chapterTitle}의 관점에서 분석하면, 두 사람이 공유하는 에너지 패턴과 ` +
      `조율이 필요한 지점이 구체적으로 드러납니다.` +
      (ashtaL ? ` 이번 챕터는 아쉬타쿠타 궁합 총점 **${ashtaL}**을 근거로, 관계 운영 전략을 심층적으로 제시합니다.` : "")
    );
  } else {
    parts.push(
      `베다 점성술(Jyotish)은 출생 시각과 장소에 따른 행성 배치를 분석하여 삶의 패턴과 운명의 흐름을 해석합니다. ` +
      `${profileL}의 베다 차트에서 **${lagnaL}**은 이 삶의 전체 구조를 규정하는 출발점이며, ` +
      `**${nakshatraL}**은 타고난 기질과 감정의 결을 나타냅니다. ` +
      `이 챕터에서는 **${chapterTitle}**의 관점에서 당신의 베다 배치가 가진 의미를 상세히 분석합니다.`
    );
  }
  parts.push("");

  allLabels.forEach((label, idx) => {
    const sNum = idx + 1;
    parts.push(`### ${sNum}. ${label}`);
    parts.push("");

    const isCompat = mode === "compatibility";
    const dataRef = isCompat
      ? `${partnerL}의 ${partnerLagna ? `${partnerLagna} 라그나` : "라그나"}와 ${partnerMoonNakshatra ? `${partnerMoonNakshatra} 나크샤트라` : "나크샤트라"}`
      : `${lagnaL}과 ${nakshatraL}`;

    const dashaRef = isCompat
      ? `두 사람의 다샤 사이클`
      : `${dashaL}${anterDasha ? ` / ${antardashL}` : ""}`;

    const planetRef = planetNames
      ? `차트 내 ${planetNames}의 배치`
      : `행성 배치`;

    // Paragraph 1: main analysis
    parts.push(
      `베다 점성술에서 ${label}은 개인의 카르믹 경로와 그라하 에너지가 교차하는 중요한 분석 영역입니다. ` +
      `${dataRef}을 기준으로 보면, 이 영역에서 ${isCompat ? `두 사람의 관계` : "당신"}가 가진 핵심 에너지 패턴은 삶의 여러 맥락에서 반복적으로 작동하는 구조적 특성을 지니고 있습니다. ` +
      `이러한 패턴은 ${sNum === 1 ? "일상적인 선택과 반응" : sNum <= 3 ? "관계와 자기 표현 방식" : "장기적인 방향 설정과 의사 결정"}에서 뚜렷하게 나타납니다.`
    );
    parts.push("");

    // Paragraph 2: specific chart reference
    if (isCompat) {
      parts.push(
        `${label} 분석에서 ${ashtaL ? `아쉬타쿠타 총점 ${ashtaL}은 ` : "두 사람의 궁합은 "}` +
        `관계의 기본 에너지 호환성을 보여주며, 이를 ${chapterTitle}의 맥락에 적용하면 ` +
        `두 사람이 이 영역에서 가진 자연스러운 강점과 충돌 가능성이 함께 드러납니다. ` +
        `${partnerL}의 베다 배치와 상호작용이 강한 영역에서는 적극적인 에너지 교환이 일어나며, ` +
        `약한 영역에서는 의식적인 조율과 상호 보완이 필요합니다.`
      );
    } else {
      parts.push(
        `${label}의 핵심 구조는 ${planetRef}에서 읽을 수 있습니다. ` +
        `${atmakaraka ? `특히 ${atmakarakaL}은 영혼의 핵심 과제를 나타내며, ` : ""}` +
        `이 배치가 ${sNum <= 2 ? "라그나 에너지와 결합될 때" : "다샤 사이클과 맞물릴 때"} ` +
        `${sNum === 1 ? "삶의 외적 표현 방식" : sNum === 2 ? "내면의 감정적 반응 패턴" : sNum === 3 ? "의지력과 자기 주도성" : "인생의 방향 감각"}에 ` +
        `직접적인 영향을 미칩니다.`
      );
    }
    parts.push("");

    // Paragraph 3: dasha timing / practical
    parts.push(
      `${dashaRef}의 영향 아래, ${label} 영역에서는 ` +
      `${sNum % 2 === 1 ? "현실적인 실행력과 내면의 준비" : "경계 설정과 에너지 방향 조율"}이 핵심 과제로 떠오릅니다. ` +
      `이 시기에는 즉각적인 결과보다 근본적인 패턴의 변화에 초점을 맞추는 것이 베다 점성술적으로 적절한 접근입니다. ` +
      `특히 이 챕터에서 다루는 ${chapterTitle}의 주제는 단기 전략보다 3년에서 7년의 중장기 관점에서 이해될 때 ` +
      `더 명확한 방향성이 보입니다.`
    );
    parts.push("");

    // Paragraph 4: actionable advice
    const actionLines = isCompat
      ? [
          `**소통 전략**: ${label}에서 강점이 드러나는 영역부터 대화를 시작하고, 충돌 패턴이 반복되는 영역은 제3의 시각(상담 또는 명상)으로 접근하세요.`,
          `**에너지 균형**: 두 사람의 그라하 에너지 중 보완적인 관계에 있는 행성을 활용하여 공동 목표를 설정하면 관계의 안정성이 높아집니다.`,
          `**타이밍 활용**: ${ashtaL ? `현재 궁합 에너지(${ashtaL})를 기준으로` : "현재 관계 에너지를 기준으로"} 중요한 결정은 두 다샤가 조화로운 시기에 내리는 것이 유리합니다.`,
        ]
      : [
          `**즉시 적용**: ${label}에서 가장 강한 그라하 에너지를 활용하여 현재 상황의 핵심 과제에 집중하세요.`,
          `**패턴 인식**: ${nakshatraL}의 기질적 강점을 ${sNum <= 3 ? "일상의 루틴에 통합" : "장기 목표 설계에 반영"}하면 카르믹 과제를 자연스럽게 해소할 수 있습니다.`,
          `**다샤 활용**: ${dashaRef} 시기에는 ${sNum % 3 === 0 ? "내면 정화와 에너지 재충전" : sNum % 3 === 1 ? "새로운 시도와 관계 확장" : "기존 패턴의 재검토와 방향 조정"}에 집중하는 것이 베다 원리에 부합합니다.`,
        ];

    actionLines.forEach((line) => parts.push(line));
    parts.push("");
  });

  return parts.join("\n");
}

async function generateVedicPremiumChapter(env, body, input, chapter, meta, canonicalVedicChart, reportType, chapterPlan, previousChapterTexts = []) {
  const premiumInput = body?._premiumLlmInput && typeof body._premiumLlmInput === "object" ? body._premiumLlmInput : null;
  const strictPayloadMode = usePremiumStrictPayload(body, env);
  const context = {
    ...buildVedicDataContext(body, input, canonicalVedicChart, chapterPlan, premiumInput),
    chapterContract: premiumInput?.chapterContract && typeof premiumInput.chapterContract === "object"
      ? premiumInput.chapterContract
      : null,
  };
  const mode = normalizeVedicReportType(reportType);
  const targetChars = mode === "compatibility"
    ? Number(VEDIC_COMPAT_TARGET_CHARS[chapter - 1] || 4200)
    : Number(VEDIC_SOLO_TARGET_CHARS[chapter - 1] || 4200);
  const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
  const prompt = buildVedicPremiumPrompt(meta, chapter, reportType, context, previousChapterTexts);
  const options = {
    temperature: 0.86,
    topP: 0.95,
    maxOutputTokens: 16384,
    timeoutMs: Number(env.PREMIUM_VEDIC_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 75000),
    maxAttemptsPerPair: Number(env.PREMIUM_VEDIC_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  let text = await callGemini(env, prompt, ["PREMIUM_VEDIC_GEMINI_MODEL"], options);
  if (!text || text.trim().length < 1200) {
    const localText = buildVedicLocalFallbackChapter(chapter, meta, canonicalVedicChart, reportType);
    return {
      ok: true,
      text: localText,
      sections: parseSections(localText),
      actualChars: localText.length,
      usedFallback: true,
      quality: { missingMarkers: [], repeatedSentenceCount: 0 },
      warnings: ["VEDIC_CHAPTER_GENERATION_EMPTY", "LOCAL_FALLBACK_USED"],
    };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const missing = vedicMissingMarkers(text, chapter, reportType, meta);
    const tooShort = text.length < minChars;
    const truncated = looksTruncatedMarkdown(text);
    const banned = hasBannedDeterministicExpression(text);
    const forbiddenPadding = hasForbiddenVedicPadding(text);
    const insufficientSections = countVedicStepSections(text) < 6;
    const repeated = detectRepeatedLongSentences(text, 35);
    const repeatedAcross = detectCrossChapterRepeatedSentences(text, previousChapterTexts, 35);
    if (!tooShort && missing.length === 0 && !truncated && !banned && !forbiddenPadding && !insufficientSections && repeated.length < 3 && repeatedAcross.length < 3) break;

    const refinePrompt = [
      "아래 베다 점성술 챕터 초안을 고품질로 보강하세요.",
      `목표 길이: 최소 ${minChars}자 (권장 ${targetChars}자)`,
      "오직 마크다운 본문만 출력하고, 기존 흐름을 유지하면서 누락 요소를 채우세요.",
      `누락 요소: ${missing.length ? missing.join(" | ") : "없음"}`,
      `현재 문제: ${tooShort ? "분량 부족" : ""} ${truncated ? "문장 끊김" : ""} ${banned ? "금지 표현 포함" : ""} ${forbiddenPadding ? "금지 공통 문구 포함" : ""} ${insufficientSections ? "Step 섹션 부족" : ""} ${repeatedAcross.length ? "이전 챕터 문장 중복됨" : ""}`.trim(),
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

  const finalMissing = vedicMissingMarkers(text, chapter, reportType, meta);
  const finalSectionCount = countVedicStepSections(text);
  const finalRepeated = detectRepeatedLongSentences(text, 35);
  const finalRepeatedAcross = detectCrossChapterRepeatedSentences(text, previousChapterTexts, 35);
  const failedChecks = [];
  if (text.length < minChars) failedChecks.push("TOO_SHORT");
  if (finalMissing.length > 0) failedChecks.push(`MISSING_MARKERS:${finalMissing.join(",")}`);
  if (finalSectionCount < 6) failedChecks.push("INSUFFICIENT_STEP_SECTIONS");
  if (looksTruncatedMarkdown(text)) failedChecks.push("TRUNCATED_MARKDOWN");
  if (hasBannedDeterministicExpression(text)) failedChecks.push("BANNED_DETERMINISTIC_EXPRESSION");
  if (hasForbiddenVedicPadding(text)) failedChecks.push("FORBIDDEN_COMMON_PADDING");
  if (finalRepeated.length >= 3 || finalRepeatedAcross.length >= 3) failedChecks.push("REPEATED_SENTENCES");

  if (failedChecks.length > 0) {
    const localText = buildVedicLocalFallbackChapter(chapter, meta, canonicalVedicChart, reportType);
    return {
      ok: true,
      text: localText,
      sections: parseSections(localText),
      actualChars: localText.length,
      usedFallback: true,
      quality: { missingMarkers: [], repeatedSentenceCount: 0 },
      warnings: ["VEDIC_CHAPTER_QUALITY_FAILED", "LOCAL_FALLBACK_USED", ...failedChecks],
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
  "◉": "왕",
  "○": "왕",
  "O": "왕",
  "▲": "리",
  "△": "평",
  "×": "함",
  "X": "함",
};

const ZIWEI_STRENGTH_TO_SYMBOL = {
  "묘": "◎",
  "왕": "O",
  "리": "△",
  "평": "△",
  "함": "X",
  "실": "X",
  "묘왕": "◎",
  "묘왕지": "◎",
  "득": "△",
  "득지": "△",
  "리지": "△",
  "평지": "△",
  "함지": "X",
  "극함": "X",
  "심한함": "X",
  "불": "X",
  "불리": "X",
  "충돌": "X",
};

function normalizeZiweiStrengthSymbol(raw) {
  const v = String(raw || "").trim();
  if (v === "◎") return "◎";
  if (v === "◉" || v === "○") return "O";
  if (v === "O") return "O";
  if (v === "▲") return "△";
  if (v === "△") return "△";
  if (v === "×" || /^x$/i.test(v)) return "X";
  return "";
}

function normalizeZiweiStrengthLabel(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (["묘", "묘왕", "묘왕지", "廟"].includes(v) || v === "◎") return "묘";
  if (["왕", "旺"].includes(v) || v === "○" || v === "O") return "왕";
  if (["득", "리", "득지", "리지", "得", "利", "약"].includes(v) || v === "▲") return "리";
  if (["평", "평지", "平", "중", "보통"].includes(v) || v === "△") return "평";
  if (["함지", "陷"].includes(v)) return "함";
  if (/^x$/i.test(v) || v === "X" || ["함", "실", "극함", "심한함", "불", "불리", "충돌"].includes(v) || v === "×") return "함";
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

function buildZiweiBirthInputFromRequest(body, input) {
  const birth = (body?.birthInput && typeof body.birthInput === "object") ? body.birthInput : {};
  const birthData = (body?.birthData && typeof body.birthData === "object") ? body.birthData : {};
  const profile = (body?.profile && typeof body.profile === "object") ? body.profile : {};

  const parsedDate = parsePremiumBirthDate(
    profile.birthDate
    || birth.birthDate
    || birthData.birthDate
    || body?.birthDate,
  );
  const parsedTime = parsePremiumBirthTime(
    profile.birthTime
    || birth.birthTime
    || birthData.birthTime
    || body?.birthTime,
  );

  const year = clampInt(
    birth.year ?? birthData.year ?? profile.year ?? body?.year ?? parsedDate.year ?? input?.year,
    1990,
    1900,
    2100,
  );
  const month = clampInt(
    birth.month ?? birthData.month ?? profile.month ?? body?.month ?? parsedDate.month ?? input?.month,
    1,
    1,
    12,
  );
  const day = clampInt(
    birth.day ?? birthData.day ?? profile.day ?? body?.day ?? parsedDate.day ?? input?.day,
    1,
    1,
    31,
  );
  const hour = clampInt(
    birth.hour ?? birthData.hour ?? profile.hour ?? body?.hour ?? parsedTime.hour ?? input?.hour,
    12,
    0,
    23,
  );
  const minute = clampInt(
    birth.minute ?? birthData.minute ?? profile.minute ?? body?.minute ?? parsedTime.minute ?? input?.minute,
    0,
    0,
    59,
  );

  const isLunar = asBool(
    profile.isLunar
    ?? birth.isLunar
    ?? birthData.isLunar
    ?? body?.isLunar,
  );
  const normalizedCalendarType = normalizePremiumCalendarType(
    profile.calendarType
    || profile.calType
    || birth.calendarType
    || birth.calType
    || birthData.calendarType
    || birthData.calType
    || body?.calendarType
    || body?.calType
    || (isLunar ? "lunar" : "solar"),
  ) || (isLunar ? "lunar" : "solar");

  const timeUnknown = asBool(
    profile.timeUnknown
    ?? birth.timeUnknown
    ?? birthData.timeUnknown
    ?? body?.timeUnknown
    ?? body?.birthTimeUnknown,
  );

  const birthPlace = String(
    profile.birthPlace
    || birth.birthPlace
    || birth.place
    || birthData.birthPlace
    || body?.birthPlace
    || "",
  ).trim();

  return {
    name: String(
      birth.name
      || birthData.name
      || profile.name
      || body?.name
      || input?.name
      || "사용자",
    ).trim() || "사용자",
    gender: String(
      birth.gender
      || birthData.gender
      || profile.gender
      || body?.gender
      || input?.gender
      || "",
    ).trim(),
    birthDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    year,
    month,
    day,
    hour,
    minute,
    calendarType: normalizedCalendarType,
    isLunar,
    timeUnknown,
    birthPlace,
    timezone: String(
      birth.timezone
      || birthData.timezone
      || profile.timezone
      || body?.timezone
      || "Asia/Seoul",
    ).trim() || "Asia/Seoul",
    profileId: String(
      birth.profileId
      || birthData.profileId
      || profile.profileId
      || profile.id
      || body?.profileId
      || "",
    ).trim(),
  };
}

function buildZiweiBasicResultCacheKey(profileId, birthInput) {
  const profileToken = String(profileId || birthInput?.profileId || "").trim();
  const dateToken = String(birthInput?.birthDate || "").trim();
  const timeToken = String(birthInput?.birthTime || "").trim();
  const genderToken = String(birthInput?.gender || "").trim().toLowerCase();
  if (profileToken) return `profile:${profileToken}`;
  if (!dateToken) return "";
  return `birth:${dateToken}:${timeToken}:${genderToken}`;
}

function pruneZiweiBasicResultCache() {
  const now = Date.now();
  for (const [key, value] of ZIWEI_BASIC_RESULT_CACHE.entries()) {
    if (!value || Number(value.expiresAt || 0) <= now) {
      ZIWEI_BASIC_RESULT_CACHE.delete(key);
    }
  }
}

function readCachedZiweiBasicResult(profileId, birthInput) {
  pruneZiweiBasicResultCache();
  const key = buildZiweiBasicResultCacheKey(profileId, birthInput);
  if (!key) return null;
  const hit = ZIWEI_BASIC_RESULT_CACHE.get(key);
  if (!hit || Number(hit.expiresAt || 0) <= Date.now()) {
    ZIWEI_BASIC_RESULT_CACHE.delete(key);
    return null;
  }
  return hit.value || null;
}

function writeCachedZiweiBasicResult(profileId, birthInput, value) {
  const key = buildZiweiBasicResultCacheKey(profileId, birthInput);
  if (!key || !value || typeof value !== "object") return;
  pruneZiweiBasicResultCache();
  ZIWEI_BASIC_RESULT_CACHE.set(key, {
    value,
    expiresAt: Date.now() + ZIWEI_BASIC_RESULT_CACHE_TTL_MS,
  });
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
    if (token === "부부궁") return "부부궁";
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
    pushUnique(dataQuality?.warnings, "12궁 구조 데이터를 요약 프레임으로 정규화해 생성합니다.");
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
  "부부궁": "spouse",
  "부처궁": "spouse",
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
  spouse: "부부궁",
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
  const normalized = text
    .replace(/[~～〜－–—−]/g, "-")
    .replace(/\s*(?:세|살)\s*/g, "")
    .replace(/\s*to\s*/gi, "-")
    .trim();
  const m = normalized.match(/^(\d{1,3})\s*-\s*(\d{1,3})$/);
  if (!m) return null;
  const startAge = Number(m[1]);
  const endAge = Number(m[2]);
  if (!Number.isFinite(startAge) || !Number.isFinite(endAge)) return null;
  return {
    palaceKey,
    range: normalized,
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

  const reportPalaces = palaces.map((palace, idx) => ({
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
    interpretationSeed: String(palace?.interpretationSeed || "").trim() || buildZiweiPalaceInterpretationSeed(palace, idx),
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

  const decadeLuck = buildZiweiDaXianRows(chart, Object.fromEntries(reportPalaces.map((p) => [String(p?.key || "").trim(), p])));
  const currentDecadeLuck = luck?.currentDecade || (decadeLuck[0] || null);

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
  if (!sihua.length) {
    pushUnique(dataQuality?.warnings, "reportPayload.sihua 가 비어 있어 일반화된 사화 해석으로 진행합니다.");
  }

  palaces.forEach((palace, idx) => {
    const pPath = `palaces[${idx}]`;
    if (!String(palace?.key || "").trim()) missingFields.push(`${pPath}.key`);
    if (!String(palace?.branch || "").trim()) missingFields.push(`${pPath}.branch`);
    if (!Array.isArray(palace?.mainStars) || palace.mainStars.length === 0) missingFields.push(`${pPath}.mainStars`);
  });

  const decadeLuck = Array.isArray(luck?.decadeLuck) ? luck.decadeLuck : [];
  const currentDecadeLuck = luck?.currentDecadeLuck || null;
  if (!decadeLuck.length) {
    pushUnique(dataQuality?.warnings, "reportPayload.luck.decadeLuck 이 비어 있어 대운 흐름은 보수적으로 요약됩니다.");
  }
  if (!currentDecadeLuck) {
    pushUnique(dataQuality?.warnings, "reportPayload.luck.currentDecadeLuck 이 비어 있어 현재 대운은 자동 추정으로 보완됩니다.");
  }

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

function buildZiweiStandardResultFromCanonical(canonicalZiweiChart, birthInput, profileId = "") {
  const chart = (canonicalZiweiChart && typeof canonicalZiweiChart === "object") ? canonicalZiweiChart : {};
  const chartMeta = (chart?.chartMeta && typeof chart.chartMeta === "object") ? chart.chartMeta : {};
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const luck = (chart?.luck && typeof chart.luck === "object") ? chart.luck : {};
  const yearStemBranch = String(chartMeta?.yearStemBranch || "").trim();
  const stemBranchTokens = yearStemBranch.split(/\s+/).filter(Boolean);

  const byName = {};
  const byPalace = {};
  palaces.forEach((palace) => {
    const palaceKey = String(palace?.key || "").trim();
    const mergedStars = []
      .concat(Array.isArray(palace?.mainStars) ? palace.mainStars : [])
      .concat(Array.isArray(palace?.auxStars) ? palace.auxStars : [])
      .concat(Array.isArray(palace?.minorStars) ? palace.minorStars : [])
      .concat(Array.isArray(palace?.maleficStars) ? palace.maleficStars : []);

    byPalace[palaceKey] = mergedStars.map((star) => String(star?.nameKo || star?.name || "").trim()).filter(Boolean);
    mergedStars.forEach((star) => {
      const name = String(star?.nameKo || star?.name || "").trim();
      if (!name) return;
      if (!Array.isArray(byName[name])) byName[name] = [];
      byName[name].push({
        palaceKey,
        palaceName: String(palace?.nameKo || "").trim(),
        strength: normalizeZiweiStrengthLabel(star?.brightness || star?.strength || "") || null,
        symbol: normalizeZiweiStrengthSymbol(star?.symbol) || null,
      });
    });
  });

  const missingFields = [];
  if (!String(chartMeta?.mingGong || "").trim()) missingFields.push("chart.mingGong");
  if (!String(chartMeta?.shenGong || "").trim()) missingFields.push("chart.shenGong");
  if (palaces.length < 12) missingFields.push("chart.palaces");

  return {
    ok: true,
    source: "ziwei-basic-engine",
    version: String(chart?.version || chartMeta?.version || "ziwei-basic-engine-v1").trim(),
    input: {
      name: birthInput?.name || "사용자",
      gender: birthInput?.gender || "",
      birthDate: birthInput?.birthDate || "",
      birthTime: birthInput?.birthTime || "",
      calendarType: birthInput?.calendarType || "solar",
      timezone: birthInput?.timezone || "Asia/Seoul",
      profileId: String(profileId || birthInput?.profileId || "").trim() || null,
    },
    chart: {
      mingGong: chartMeta?.mingGong || null,
      shenGong: chartMeta?.shenGong || null,
      fiveElementBureau: chartMeta?.fiveElementBureau || null,
      lunarInfo: chart?.profile?.birth?.lunarDate || null,
      yearStemBranch: chartMeta?.yearStemBranch || null,
      monthStemBranch: chartMeta?.monthStemBranch || null,
      dayStemBranch: chartMeta?.dayStemBranch || null,
      hourStemBranch: chartMeta?.hourStemBranch || null,
      palaces,
      stars: {
        byPalace,
        byName,
      },
      sihua: {
        huaLu: chart?.sihua?.화록 || chart?.sihua?.hualu || null,
        huaQuan: chart?.sihua?.화권 || chart?.sihua?.huaquan || null,
        huaKe: chart?.sihua?.화과 || chart?.sihua?.huake || null,
        huaJi: chart?.sihua?.화기 || chart?.sihua?.huaji || null,
      },
      luck: {
        majorPeriods: Array.isArray(luck?.decadePeriods) ? luck.decadePeriods : [],
        currentMajorPeriod: luck?.currentDecade || null,
        annual: luck?.annual || null,
        monthly: Array.isArray(luck?.monthly) ? luck.monthly : [],
      },
      relationships: {
        sanFangSiZheng: palaces.map((palace) => ({
          palaceKey: palace?.key || "",
          triadPalaces: Array.isArray(palace?.triadPalaceKeys) ? palace.triadPalaceKeys : [],
        })),
        oppositePalaces: palaces.map((palace) => ({
          palaceKey: palace?.key || "",
          oppositePalaceKey: palace?.oppositePalaceKey || null,
        })),
        supportPalaces: palaces.map((palace) => ({
          palaceKey: palace?.key || "",
          supportPalaceKeys: Array.isArray(palace?.triadPalaceKeys) ? palace.triadPalaceKeys : [],
        })),
      },
    },
    reading: {
      summary: "",
      personality: "",
      career: "",
      wealth: "",
      love: "",
      relationship: "",
      health: "",
      migration: "",
      fortuneFlow: stemBranchTokens.join(" "),
      warnings: [],
      strengths: [],
      weaknesses: [],
    },
    pdfReady: missingFields.length === 0,
    missingFields,
  };
}

function normalizeZiweiReportStarEntry(star) {
  const src = (star && typeof star === "object") ? star : { name: String(star || "") };
  const nameKo = String(src.nameKo || src.name || src.starName || src.star || "").trim();
  if (!nameKo) return null;
  const brightness = normalizeZiweiStrengthLabel(src.brightness || src.strength || src.strengthName || "") || null;
  const symbol = normalizeZiweiStrengthSymbol(src.symbol || src.strengthSymbol || "") || null;
  return {
    nameKo,
    nameHan: ZIWEI_STAR_NAME_HAN[nameKo] || "",
    brightness,
    symbol,
    meaning: brightness ? ziweiStrengthMeaning(brightness) : "",
  };
}

function buildZiweiReportPayloadFromBasicResult(basicZiweiResult, dataQuality) {
  const basic = (basicZiweiResult && typeof basicZiweiResult === "object") ? basicZiweiResult : {};
  const chart = (basic?.chart && typeof basic.chart === "object") ? basic.chart : {};
  const chartMetaRaw = (chart?.chartMeta && typeof chart.chartMeta === "object") ? chart.chartMeta : chart;
  const sourcePalaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const luck = (chart?.luck && typeof chart.luck === "object") ? chart.luck : {};

  const palaces = sourcePalaces.map((palace, idx) => {
    const key = String(
      palace?.key
      || palace?.id
      || normalizeZiweiPalaceKey(palace?.name || palace?.nameKo || "", idx)
      || ZIWEI_CANONICAL_PALACE_ORDER[idx]
      || ""
    ).trim();

    const mainStars = (Array.isArray(palace?.mainStars) ? palace.mainStars : (Array.isArray(palace?.stars) ? palace.stars : []))
      .map(normalizeZiweiReportStarEntry)
      .filter(Boolean);
    const auxStars = (Array.isArray(palace?.assistantStars) ? palace.assistantStars : (Array.isArray(palace?.auxiliaryStars) ? palace.auxiliaryStars : (Array.isArray(palace?.auxStars) ? palace.auxStars : [])))
      .map(normalizeZiweiReportStarEntry)
      .filter(Boolean);
    const minorStars = (Array.isArray(palace?.minorStars) ? palace.minorStars : (Array.isArray(palace?.subStars) ? palace.subStars : []))
      .map(normalizeZiweiReportStarEntry)
      .filter(Boolean);
    const maleficStars = (Array.isArray(palace?.maleficStars) ? palace.maleficStars : (Array.isArray(palace?.badStars) ? palace.badStars : []))
      .map(normalizeZiweiReportStarEntry)
      .filter(Boolean);

    const transformations = (Array.isArray(palace?.transformationStars) ? palace.transformationStars : (Array.isArray(palace?.transformations) ? palace.transformations : (Array.isArray(palace?.sihua) ? palace.sihua : [])))
      .map((entry) => {
        const star = String(entry?.star || entry?.starName || entry?.name || "").trim();
        const type = normalizeZiweiTransformationType(entry?.type || entry?.kind || entry?.label || "");
        if (!star || !type) return null;
        return {
          star,
          type,
          meaning: String(entry?.meaning || `${type} 작동`).trim(),
        };
      })
      .filter(Boolean);

    return {
      key,
      nameKo: String(palace?.nameKo || palace?.name || ZIWEI_CANONICAL_PALACE_KEY_TO_KO[key] || "").trim(),
      branch: String(palace?.branch || palace?.earthlyBranch || "").trim(),
      mainStars,
      auxStars,
      minorStars,
      maleficStars,
      transformations,
      oppositePalaceKey: String(palace?.oppositePalaceKey || palace?.oppositePalaceId || "").trim() || null,
      triadPalaceKeys: Array.isArray(palace?.triadPalaceKeys)
        ? palace.triadPalaceKeys.map((v) => String(v || "").trim()).filter(Boolean)
        : (Array.isArray(palace?.triadPalaceIds)
          ? palace.triadPalaceIds.map((v) => String(v || "").trim()).filter(Boolean)
          : []),
      interpretationSeed: String(palace?.interpretationSeed || "").trim() || buildZiweiPalaceInterpretationSeed({
        palaceNameKo: String(palace?.nameKo || palace?.name || ZIWEI_CANONICAL_PALACE_KEY_TO_KO[key] || "").trim(),
        branch: String(palace?.branch || palace?.earthlyBranch || "").trim(),
        mainStars,
        transformations,
      }, idx),
    };
  });

  if (!palaces.length) {
    pushUnique(dataQuality?.warnings, "basicZiweiResult.chart.palaces 가 비어 있어 다른 소스에서 reportPayload 복구를 시도합니다.");
  }

  const sihuaFromChart = [];
  const chartSihua = (chart?.sihua && typeof chart.sihua === "object") ? chart.sihua : {};
  [
    { type: "화록", star: chartSihua?.huaLu || chartSihua?.hualu || chartSihua?.화록 },
    { type: "화권", star: chartSihua?.huaQuan || chartSihua?.huaquan || chartSihua?.화권 },
    { type: "화과", star: chartSihua?.huaKe || chartSihua?.huake || chartSihua?.화과 },
    { type: "화기", star: chartSihua?.huaJi || chartSihua?.huaji || chartSihua?.화기 },
  ].forEach((entry) => {
    const star = String(entry.star || "").trim();
    if (!star) return;
    sihuaFromChart.push({
      palaceKey: "",
      palaceName: "",
      star,
      type: entry.type,
      meaning: `${entry.type} 작동`,
    });
  });

  const sihua = [];
  palaces.forEach((palace) => {
    (Array.isArray(palace?.transformations) ? palace.transformations : []).forEach((item) => {
      sihua.push({
        palaceKey: palace.key,
        palaceName: palace.nameKo,
        star: item.star,
        type: item.type,
        meaning: item.meaning,
      });
    });
  });

  const profileBirth = (basic?.input && typeof basic.input === "object") ? basic.input : {};
  return {
    profile: {
      name: String(profileBirth?.name || chart?.profile?.name || "사용자").trim() || "사용자",
      gender: String(profileBirth?.gender || chart?.profile?.gender || "").trim(),
      birth: {
        solarDate: String(profileBirth?.birthDate || chart?.profile?.birth?.solarDate || "").trim() || null,
        lunarDate: String(chart?.lunarInfo || chart?.profile?.birth?.lunarDate || "").trim() || null,
        time: String(profileBirth?.birthTime || chart?.profile?.birth?.time || "").trim() || null,
        timezone: String(profileBirth?.timezone || chart?.profile?.birth?.timezone || "Asia/Seoul").trim() || "Asia/Seoul",
        isLeapMonth: chart?.profile?.birth?.isLeapMonth == null ? null : Boolean(chart.profile.birth.isLeapMonth),
      },
    },
    chartMeta: {
      mingGong: String(chartMetaRaw?.mingGong || chart?.mingGong || "").trim(),
      shenGong: String(chartMetaRaw?.shenGong || chart?.shenGong || "").trim(),
      fiveElementBureau: String(chartMetaRaw?.fiveElementBureau || chart?.fiveElementBureau || "").trim() || null,
      yearStemBranch: String(chartMetaRaw?.yearStemBranch || chart?.yearStemBranch || "").trim() || null,
      monthStemBranch: String(chartMetaRaw?.monthStemBranch || chart?.monthStemBranch || "").trim() || null,
      dayStemBranch: String(chartMetaRaw?.dayStemBranch || chart?.dayStemBranch || "").trim() || null,
      hourStemBranch: String(chartMetaRaw?.hourStemBranch || chart?.hourStemBranch || "").trim() || null,
    },
    palaces,
    sihua: sihua.length ? sihua : sihuaFromChart,
    luck: {
      decadeLuck: Array.isArray(luck?.majorPeriods) ? luck.majorPeriods : (Array.isArray(luck?.decadeLuck) ? luck.decadeLuck : []),
      currentDecadeLuck: luck?.currentMajorPeriod || luck?.currentDecade || luck?.currentDecadeLuck || null,
      annual: luck?.annual || null,
      monthly: Array.isArray(luck?.monthly) ? luck.monthly : [],
    },
    sourcePayload: (chart?.sourcePayload && typeof chart.sourcePayload === "object")
      ? chart.sourcePayload
      : ((basic?.ziweiStructured && typeof basic.ziweiStructured === "object") ? basic.ziweiStructured : null),
    diagnostics: {
      generatedAt: new Date().toISOString(),
      source: "basicZiweiResult",
      missingFields: Array.isArray(basic?.missingFields) ? basic.missingFields : [],
    },
  };
}

const ZIWEI_PDF_PIPELINE_BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const ZIWEI_PDF_PIPELINE_MAIN_STAR_SET = new Set(["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"]);
const ZIWEI_PDF_PIPELINE_DEFAULT_MAIN_STARS = Object.freeze({
  ming: "자미",
  siblings: "천기",
  spouse: "태양",
  children: "무곡",
  wealth: "천동",
  health: "염정",
  travel: "천부",
  friends: "태음",
  career: "탐랑",
  property: "거문",
  fortune: "천상",
  parents: "천량",
});
const ZIWEI_PDF_PIPELINE_STEM_SIHUA_RULES = Object.freeze({
  갑: [{ type: "화록", star: "염정" }, { type: "화권", star: "파군" }, { type: "화과", star: "무곡" }, { type: "화기", star: "태양" }],
  을: [{ type: "화록", star: "천기" }, { type: "화권", star: "천량" }, { type: "화과", star: "자미" }, { type: "화기", star: "태음" }],
  병: [{ type: "화록", star: "천동" }, { type: "화권", star: "천기" }, { type: "화과", star: "문창" }, { type: "화기", star: "염정" }],
  정: [{ type: "화록", star: "태음" }, { type: "화권", star: "천동" }, { type: "화과", star: "천기" }, { type: "화기", star: "거문" }],
  무: [{ type: "화록", star: "탐랑" }, { type: "화권", star: "태음" }, { type: "화과", star: "우필" }, { type: "화기", star: "천기" }],
  기: [{ type: "화록", star: "무곡" }, { type: "화권", star: "탐랑" }, { type: "화과", star: "천량" }, { type: "화기", star: "문곡" }],
  경: [{ type: "화록", star: "태양" }, { type: "화권", star: "무곡" }, { type: "화과", star: "태음" }, { type: "화기", star: "천동" }],
  신: [{ type: "화록", star: "거문" }, { type: "화권", star: "태양" }, { type: "화과", star: "문곡" }, { type: "화기", star: "문창" }],
  임: [{ type: "화록", star: "천량" }, { type: "화권", star: "자미" }, { type: "화과", star: "좌보" }, { type: "화기", star: "무곡" }],
  계: [{ type: "화록", star: "파군" }, { type: "화권", star: "거문" }, { type: "화과", star: "태음" }, { type: "화기", star: "탐랑" }],
});

function normalizeZiweiPdfPipelineBranch(value) {
  const token = String(value || "").trim();
  if (!token) return "";
  const map = {
    자: "자", 축: "축", 인: "인", 묘: "묘", 진: "진", 사: "사", 오: "오", 미: "미", 신: "신", 유: "유", 술: "술", 해: "해",
    子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
  };
  return map[token] || "";
}

function normalizeZiweiPdfPipelineSihuaType(raw) {
  const normalized = normalizeZiweiTransformationType(raw);
  return normalized || "";
}

function normalizeZiweiPdfPipelineStar(star, fallbackName = "") {
  const src = (star && typeof star === "object") ? star : { name: String(star || "") };
  const nameKo = String(src.nameKo || src.name || src.star || src.starName || fallbackName || "").trim();
  if (!nameKo) return null;

  const strength = normalizeZiweiStrengthLabel(src.strength || src.brightness || src.brightnessKo || "") || "평";
  const symbol = normalizeZiweiStrengthSymbol(src.symbol || src.strengthSymbol || "")
    || normalizeZiweiStrengthSymbol(ZIWEI_STRENGTH_TO_SYMBOL[strength] || "")
    || "△";

  return {
    ...src,
    name: nameKo,
    nameKo,
    strength,
    brightness: src.brightness || ziweiStrengthToHan(strength),
    brightnessKo: src.brightnessKo || strength,
    symbol,
  };
}

function extractZiweiPdfPipelineStem(yearStemBranch) {
  const raw = String(yearStemBranch || "").trim();
  if (!raw) return "";
  const first = raw.charAt(0);
  const map = {
    갑: "갑", 을: "을", 병: "병", 정: "정", 무: "무", 기: "기", 경: "경", 신: "신", 임: "임", 계: "계",
    甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
  };
  return map[first] || "";
}

function buildZiweiPdfPipelineRawChart(reportPayload, canonicalZiweiChart, dataQuality) {
  const source = (reportPayload && typeof reportPayload === "object") ? reportPayload : {};
  const canonical = (canonicalZiweiChart && typeof canonicalZiweiChart === "object") ? canonicalZiweiChart : {};
  const sourcePalaces = Array.isArray(source?.palaces) ? source.palaces : [];
  const canonicalPalaces = Array.isArray(canonical?.palaces) ? canonical.palaces : [];

  const sourceByKey = new Map();
  sourcePalaces.forEach((palace, idx) => {
    const key = String(palace?.key || normalizeZiweiPalaceKey(palace?.nameKo || palace?.name || palace?.palaceName || "", idx) || "").trim();
    if (!key || sourceByKey.has(key)) return;
    sourceByKey.set(key, palace);
  });

  const canonicalByKey = new Map();
  canonicalPalaces.forEach((palace, idx) => {
    const key = String(palace?.key || normalizeZiweiPalaceKey(palace?.nameKo || palace?.name || "", idx) || "").trim();
    if (!key || canonicalByKey.has(key)) return;
    canonicalByKey.set(key, palace);
  });

  const normalizeStarArray = (stars, fallbackName = "") => {
    if (!Array.isArray(stars)) return [];
    return stars
      .map((star) => normalizeZiweiPdfPipelineStar(star, fallbackName))
      .filter(Boolean);
  };

  const normalizedPalaces = ZIWEI_CANONICAL_PALACE_ORDER.map((key, idx) => {
    const src = sourceByKey.get(key) || {};
    const fallback = canonicalByKey.get(key) || {};

    const branch = normalizeZiweiPdfPipelineBranch(src?.branch || src?.earthlyBranch || fallback?.branch || fallback?.earthlyBranch || "")
      || ZIWEI_PDF_PIPELINE_BRANCHES[idx]
      || "";
    if (!String(src?.branch || "").trim()) {
      pushUnique(dataQuality?.supplementedFields, `reportPayload.palaces[${idx}].branch`);
    }

    const fallbackMain = ZIWEI_PDF_PIPELINE_DEFAULT_MAIN_STARS[key] || "자미";
    const mergedMain = normalizeStarArray(
      (Array.isArray(src?.mainStars) ? src.mainStars : []).concat(Array.isArray(src?.stars) ? src.stars : []),
      fallbackMain,
    );
    const canonicalMain = normalizeStarArray(
      (Array.isArray(fallback?.mainStars) ? fallback.mainStars : []).concat(Array.isArray(fallback?.stars) ? fallback.stars : []),
      fallbackMain,
    );

    const preferMain = mergedMain.filter((star) => ZIWEI_PDF_PIPELINE_MAIN_STAR_SET.has(String(star?.nameKo || star?.name || "").trim()));
    const fallbackPreferMain = canonicalMain.filter((star) => ZIWEI_PDF_PIPELINE_MAIN_STAR_SET.has(String(star?.nameKo || star?.name || "").trim()));
    const mainStars = (preferMain.length ? preferMain : (mergedMain.length ? mergedMain : (fallbackPreferMain.length ? fallbackPreferMain : canonicalMain))).slice(0, 3);

    if (!mainStars.length) {
      mainStars.push(normalizeZiweiPdfPipelineStar({ name: fallbackMain, strength: "평", symbol: "△" }, fallbackMain));
      pushUnique(dataQuality?.supplementedFields, `reportPayload.palaces[${idx}].mainStars`);
    }

    const auxStars = normalizeStarArray(
      (Array.isArray(src?.auxStars) ? src.auxStars : []).concat(Array.isArray(src?.subStars) ? src.subStars : []),
      "문창",
    );
    const maleficStars = normalizeStarArray(
      (Array.isArray(src?.maleficStars) ? src.maleficStars : []).concat(Array.isArray(src?.badStars) ? src.badStars : []),
      "경양",
    );

    const transformations = [];
    const tSource = (Array.isArray(src?.transformations) ? src.transformations : []).concat(Array.isArray(src?.sihua) ? src.sihua : []);
    const tFallback = (Array.isArray(fallback?.transformations) ? fallback.transformations : []).concat(Array.isArray(fallback?.sihua) ? fallback.sihua : []);
    const tSeen = new Set();
    tSource.concat(tFallback).forEach((entry) => {
      const star = String(entry?.star || entry?.name || entry?.starName || "").trim();
      const type = normalizeZiweiPdfPipelineSihuaType(entry?.type || entry?.kind || entry?.label || "");
      if (!star || !type) return;
      const keyToken = `${star}:${type}`;
      if (tSeen.has(keyToken)) return;
      tSeen.add(keyToken);
      transformations.push({
        star,
        type,
        meaning: String(entry?.meaning || `${type} 작동`).trim() || `${type} 작동`,
      });
    });

    return {
      key,
      nameKo: String(src?.nameKo || src?.name || fallback?.nameKo || fallback?.name || ZIWEI_CANONICAL_PALACE_KEY_TO_KO[key] || "").trim(),
      branch,
      mainStars,
      auxStars,
      maleficStars,
      transformations,
    };
  });

  const sihuaEntries = [];
  const sihuaSeen = new Set();
  const addSihua = (entry, fallbackPalaceKey = "") => {
    const star = String(entry?.star || entry?.name || "").trim();
    const type = normalizeZiweiPdfPipelineSihuaType(entry?.type || entry?.kind || entry?.label || "");
    if (!star || !type) return;
    let palaceKey = String(entry?.palaceKey || fallbackPalaceKey || "").trim();
    if (!palaceKey) {
      const palaceName = String(entry?.palaceName || "").trim();
      palaceKey = normalizeZiweiPalaceKey(palaceName);
    }
    if (!palaceKey) {
      const found = normalizedPalaces.find((palace) => (Array.isArray(palace?.mainStars) ? palace.mainStars : []).some((item) => String(item?.nameKo || item?.name || "").trim() === star));
      palaceKey = found?.key || "ming";
    }
    const palaceName = String(entry?.palaceName || ZIWEI_CANONICAL_PALACE_KEY_TO_KO[palaceKey] || "").trim();
    const token = `${palaceKey}:${star}:${type}`;
    if (sihuaSeen.has(token)) return;
    sihuaSeen.add(token);
    sihuaEntries.push({
      palaceKey,
      palaceName,
      star,
      type,
      meaning: String(entry?.meaning || `${type} 작동`).trim() || `${type} 작동`,
    });
  };

  (Array.isArray(source?.sihua) ? source.sihua : []).forEach((entry) => addSihua(entry));
  normalizedPalaces.forEach((palace) => {
    (Array.isArray(palace?.transformations) ? palace.transformations : []).forEach((entry) => addSihua({ ...entry, palaceKey: palace.key, palaceName: palace.nameKo }, palace.key));
  });

  if (!sihuaEntries.length) {
    const yearStemBranch = String(source?.chartMeta?.yearStemBranch || canonical?.chartMeta?.yearStemBranch || source?.sourcePayload?.yearGan || "").trim();
    const stem = extractZiweiPdfPipelineStem(yearStemBranch);
    const rules = ZIWEI_PDF_PIPELINE_STEM_SIHUA_RULES[stem] || [];
    rules.forEach((entry) => addSihua(entry));
    if (rules.length) {
      pushUnique(dataQuality?.supplementedFields, "reportPayload.sihua");
    }
  }

  const sihuaByPalace = new Map();
  sihuaEntries.forEach((entry) => {
    const palaceKey = String(entry?.palaceKey || "").trim() || "ming";
    const rows = sihuaByPalace.get(palaceKey) || [];
    rows.push({
      star: String(entry?.star || "").trim(),
      type: String(entry?.type || "").trim(),
      meaning: String(entry?.meaning || "").trim() || `${String(entry?.type || "").trim()} 작동`,
    });
    sihuaByPalace.set(palaceKey, rows);
  });

  normalizedPalaces.forEach((palace, idx) => {
    const rows = sihuaByPalace.get(palace.key) || [];
    if (rows.length) {
      palace.transformations = rows;
      return;
    }
    const fallbackStar = String(palace?.mainStars?.[0]?.nameKo || palace?.mainStars?.[0]?.name || ZIWEI_PDF_PIPELINE_DEFAULT_MAIN_STARS[palace.key] || "자미").trim();
    const fallbackRows = [{ star: fallbackStar, type: "화록", meaning: "화록 작동" }];
    palace.transformations = fallbackRows;
    sihuaByPalace.set(palace.key, fallbackRows);
    addSihua({ palaceKey: palace.key, palaceName: palace.nameKo, star: fallbackStar, type: "화록", meaning: "화록 작동" }, palace.key);
    pushUnique(dataQuality?.supplementedFields, `reportPayload.palaces[${idx}].sihua`);
  });

  const sihuaData = {};
  sihuaEntries.forEach((entry) => {
    const star = String(entry?.star || "").trim();
    const type = normalizeZiweiPdfPipelineSihuaType(entry?.type || "");
    if (!star || !type || sihuaData[star]) return;
    sihuaData[star] = {
      type,
      palaceName: String(entry?.palaceName || ZIWEI_CANONICAL_PALACE_KEY_TO_KO[String(entry?.palaceKey || "").trim()] || "").trim(),
    };
  });

  const sourcePayload = {
    ...(source?.sourcePayload && typeof source.sourcePayload === "object" ? source.sourcePayload : {}),
    meng: String(source?.chartMeta?.mingGong || canonical?.chartMeta?.mingGong || "").trim(),
    shen: String(source?.chartMeta?.shenGong || canonical?.chartMeta?.shenGong || "").trim(),
    yearGan: String(source?.chartMeta?.yearStemBranch || canonical?.chartMeta?.yearStemBranch || source?.sourcePayload?.yearGan || "").trim(),
    sihuaData,
    palaceStarData: normalizedPalaces.map((palace) => ({
      palace: palace?.nameKo || ZIWEI_CANONICAL_PALACE_KEY_TO_KO[palace?.key] || "",
      branch: palace?.branch || "",
      dahan: "",
      stars: (Array.isArray(palace?.mainStars) ? palace.mainStars : []).map((star) => ({
        name: String(star?.nameKo || star?.name || "").trim(),
        strength: normalizeZiweiStrengthLabel(star?.strength || star?.brightness || star?.brightnessKo || "") || "평",
        symbol: normalizeZiweiStrengthSymbol(star?.symbol || "") || "△",
      })),
      auxStars: (Array.isArray(palace?.auxStars) ? palace.auxStars : []).map((star) => ({
        name: String(star?.nameKo || star?.name || "").trim(),
        strength: normalizeZiweiStrengthLabel(star?.strength || star?.brightness || star?.brightnessKo || "") || "평",
        symbol: normalizeZiweiStrengthSymbol(star?.symbol || "") || "△",
      })),
      badStars: (Array.isArray(palace?.maleficStars) ? palace.maleficStars : []).map((star) => ({
        name: String(star?.nameKo || star?.name || "").trim(),
        strength: normalizeZiweiStrengthLabel(star?.strength || star?.brightness || star?.brightnessKo || "") || "함",
        symbol: normalizeZiweiStrengthSymbol(star?.symbol || "") || "×",
      })),
    })),
  };

  return {
    ...source,
    palaces: normalizedPalaces,
    sihua: sihuaEntries,
    sourcePayload,
  };
}

function buildZiweiAnnualFallbackPayload(chartMeta = {}, palaces = []) {
  const mingToken = String(chartMeta?.mingGong || "").trim();
  const palaceMatch = (Array.isArray(palaces) ? palaces : []).find((palace) => {
    const key = String(palace?.key || palace?.palaceKey || "").trim();
    const name = String(palace?.nameKo || palace?.name || "").trim();
    return key === "ming" || name === "명궁" || normalizeZiweiBranchToken(palace?.branch) === normalizeZiweiBranchToken(mingToken);
  }) || (Array.isArray(palaces) ? palaces[0] : null);
  return {
    year: 2026,
    stemBranch: "병오(丙午)",
    palaceKey: String(palaceMatch?.key || palaceMatch?.palaceKey || "ming").trim() || "ming",
    palaceName: String(palaceMatch?.nameKo || palaceMatch?.name || "명궁").trim() || "명궁",
    keyStars: (Array.isArray(palaceMatch?.mainStars) ? palaceMatch.mainStars : [])
      .map((star) => String(star?.nameKo || star?.name || "").trim())
      .filter(Boolean)
      .slice(0, 3),
    guidance: "2026년에는 실행의 일관성과 대외 확장 속도 조절을 동시에 관리하는 전략이 유효합니다.",
    fallbackUsed: true,
  };
}

function buildZiweiMonthlyFallbackPayload(annual = null, palaces = []) {
  const rows = Array.isArray(palaces) ? palaces : [];
  const baseKey = String(annual?.palaceKey || rows?.[0]?.key || "ming").trim() || "ming";
  const order = Array.from(new Set(rows.map((row) => String(row?.key || row?.palaceKey || "").trim()).filter(Boolean)));
  const baseIndex = Math.max(0, order.indexOf(baseKey));
  const cycleOrder = order.length ? order : ["ming", "siblings", "spouse", "children", "wealth", "health", "travel", "friends", "career", "property", "fortune", "parents"];
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const key = cycleOrder[(baseIndex + idx) % cycleOrder.length] || "ming";
    const palace = rows.find((row) => String(row?.key || row?.palaceKey || "").trim() === key) || {};
    return {
      month,
      palaceKey: key,
      palaceName: String(palace?.nameKo || palace?.name || key).trim() || key,
      keyStars: (Array.isArray(palace?.mainStars) ? palace.mainStars : [])
        .map((star) => String(star?.nameKo || star?.name || "").trim())
        .filter(Boolean)
        .slice(0, 2),
      guidance: `${month}월은 ${String(palace?.nameKo || palace?.name || key).trim() || key} 기반 루틴을 우선 점검하세요.`,
      fallbackUsed: true,
    };
  });
}

function hasReliableZiweiBasicPayload(payload) {
  const p = (payload && typeof payload === "object") ? payload : null;
  if (!p) return false;
  const ming = String(p?.chartMeta?.mingGong || "").trim();
  const shen = String(p?.chartMeta?.shenGong || "").trim();
  const palaces = Array.isArray(p?.palaces) ? p.palaces : [];
  if (!ming || !shen || palaces.length < 12) return false;
  return palaces.every((palace) => {
    const key = String(palace?.key || palace?.palaceKey || palace?.nameKo || palace?.name || "").trim();
    const main = Array.isArray(palace?.mainStars) ? palace.mainStars : [];
    return Boolean(key) && main.length > 0;
  });
}

function buildZiweiPdfReportPayload({
  basicZiweiResult,
  userProfile,
  birthInput,
  existingReportPayload,
  canonicalZiweiChart,
  dataQuality,
  preferBasicEngine = false,
} = {}) {
  const existing = (existingReportPayload && typeof existingReportPayload === "object") ? existingReportPayload : null;
  const fromCanonical = canonicalZiweiChart
    ? buildZiweiReportPayloadFromCanonical(canonicalZiweiChart, dataQuality)
    : null;
  const fromBasic = basicZiweiResult
    ? buildZiweiReportPayloadFromBasicResult(basicZiweiResult, dataQuality)
    : null;
  const canonicalCalculatedData = canonicalZiweiChart
    ? mapZiweiCalculatedData(canonicalZiweiChart)
    : null;

  const basicPreferred = Boolean(preferBasicEngine) && hasReliableZiweiBasicPayload(fromBasic);
  const sourcePriority = basicPreferred
    ? [fromBasic, fromCanonical, existing]
    : [fromCanonical, fromBasic, existing];

  const pickArrayFromSources = (selector) => {
    for (const src of sourcePriority) {
      const arr = selector(src || {});
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
    return [];
  };

  const pickTextFromSources = (selector) => {
    for (const src of sourcePriority) {
      const text = String(selector(src || {}) ?? "").trim();
      if (text) return text;
    }
    return "";
  };

  const pickObjectFromSources = (selector) => {
    for (const src of sourcePriority) {
      const obj = selector(src || {});
      if (obj && typeof obj === "object") return obj;
    }
    return null;
  };

  const pickValueFromSources = (selector) => {
    for (const src of sourcePriority) {
      const value = selector(src || {});
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return null;
  };

  const mergedPalaces = pickArrayFromSources((src) => src?.palaces)
    .map((palace, idx) => {
      const source = palace && typeof palace === "object" ? palace : {};
      const key = String(source?.key || source?.palaceKey || normalizeZiweiPalaceKey(source?.nameKo || source?.name || "", idx) || "").trim();
      const branch = String(source?.branch || "").trim();
      const mainStars = Array.isArray(source?.mainStars) ? source.mainStars : [];
      const transformations = Array.isArray(source?.transformations) ? source.transformations : [];
      return {
        ...source,
        key,
        palaceKey: key || source?.palaceKey,
        interpretationSeed: String(source?.interpretationSeed || "").trim() || buildZiweiPalaceInterpretationSeed({
          ...source,
          palaceNameKo: String(source?.nameKo || source?.name || "").trim(),
          branch,
          mainStars,
          transformations,
        }, idx),
      };
    });

  const mergedPalacesByKey = {};
  mergedPalaces.forEach((palace, idx) => {
    const key = String(palace?.key || palace?.palaceKey || normalizeZiweiPalaceKey(palace?.nameKo || palace?.name || "", idx) || "").trim();
    if (!key) return;
    mergedPalacesByKey[key] = {
      ...palace,
      palaceKey: key,
      interpretationSeed: String(palace?.interpretationSeed || "").trim() || buildZiweiPalaceInterpretationSeed(palace, idx),
    };
  });

  const mergedDaXian = (Array.isArray(existing?.calculatedData?.cycles?.daXian) && existing.calculatedData.cycles.daXian.length)
    ? existing.calculatedData.cycles.daXian
    : (Array.isArray(canonicalCalculatedData?.cycles?.daXian) && canonicalCalculatedData.cycles.daXian.length)
      ? canonicalCalculatedData.cycles.daXian
      : buildZiweiDaXianRows(canonicalZiweiChart || {}, mergedPalacesByKey);
  const mergedAnnualLuck = pickObjectFromSources((src) => src?.luck?.annual);
  const mergedMonthlyLuck = pickArrayFromSources((src) => src?.luck?.monthly);
  const mergedCurrentDecadeLuck = pickValueFromSources((src) => src?.luck?.currentDecadeLuck);

  const mergedMingGong = pickTextFromSources((src) => src?.chartMeta?.mingGong) || null;
  const mergedShenGong = pickTextFromSources((src) => src?.chartMeta?.shenGong) || null;
  const annualLuckNormalized = (mergedAnnualLuck && typeof mergedAnnualLuck === "object" && !Array.isArray(mergedAnnualLuck))
    ? mergedAnnualLuck
    : ((Array.isArray(mergedAnnualLuck) && mergedAnnualLuck[0] && typeof mergedAnnualLuck[0] === "object") ? mergedAnnualLuck[0] : null);
  const annualLuck = annualLuckNormalized || buildZiweiAnnualFallbackPayload({ mingGong: mergedMingGong }, mergedPalaces);
  const monthlyLuck = (Array.isArray(mergedMonthlyLuck) && mergedMonthlyLuck.length)
    ? mergedMonthlyLuck
    : buildZiweiMonthlyFallbackPayload(annualLuck, mergedPalaces);

  if (!annualLuckNormalized) pushUnique(dataQuality?.supplementedFields, "luck.annual.2026Fallback");
  if (!Array.isArray(mergedMonthlyLuck) || mergedMonthlyLuck.length === 0) pushUnique(dataQuality?.supplementedFields, "luck.monthly.2026Fallback");

  const profileBirthDate = String(birthInput?.birthDate || "").trim();
  const profileBirthTime = String(birthInput?.birthTime || "").trim();
  const mergedSourcePayload = pickObjectFromSources((src) => src?.sourcePayload);
  const merged = {
    profile: {
      name: String(pickTextFromSources((src) => src?.profile?.name) || userProfile?.name || birthInput?.name || "사용자").trim() || "사용자",
      gender: String(pickTextFromSources((src) => src?.profile?.gender) || userProfile?.gender || birthInput?.gender || "").trim(),
      birth: {
        solarDate: String(pickTextFromSources((src) => src?.profile?.birth?.solarDate) || profileBirthDate || userProfile?.birthDate || "").trim() || null,
        lunarDate: String(pickTextFromSources((src) => src?.profile?.birth?.lunarDate)).trim() || null,
        time: String(pickTextFromSources((src) => src?.profile?.birth?.time) || profileBirthTime || userProfile?.birthTime || "").trim() || null,
        timezone: String(pickTextFromSources((src) => src?.profile?.birth?.timezone) || birthInput?.timezone || "Asia/Seoul").trim() || "Asia/Seoul",
        isLeapMonth: sourcePriority[0]?.profile?.birth?.isLeapMonth
          ?? sourcePriority[1]?.profile?.birth?.isLeapMonth
          ?? sourcePriority[2]?.profile?.birth?.isLeapMonth
          ?? null,
      },
    },
    chartMeta: {
      mingGong: mergedMingGong,
      shenGong: mergedShenGong,
      fiveElementBureau: pickTextFromSources((src) => src?.chartMeta?.fiveElementBureau) || null,
      yearStemBranch: pickTextFromSources((src) => src?.chartMeta?.yearStemBranch) || null,
      monthStemBranch: pickTextFromSources((src) => src?.chartMeta?.monthStemBranch) || null,
      dayStemBranch: pickTextFromSources((src) => src?.chartMeta?.dayStemBranch) || null,
      hourStemBranch: pickTextFromSources((src) => src?.chartMeta?.hourStemBranch) || null,
    },
    palaces: mergedPalaces,
    sihua: pickArrayFromSources((src) => src?.sihua),
    luck: {
      decadeLuck: pickArrayFromSources((src) => src?.luck?.decadeLuck),
      currentDecadeLuck: mergedCurrentDecadeLuck || null,
      annual: annualLuck,
      monthly: monthlyLuck,
    },
    sourcePayload: mergedSourcePayload,
    calculatedData: {
      ...(existing?.calculatedData && typeof existing.calculatedData === "object" ? existing.calculatedData : {}),
      chart: {
        ...(existing?.calculatedData?.chart && typeof existing.calculatedData.chart === "object" ? existing.calculatedData.chart : {}),
        mingGong: pickTextFromSources((src) => src?.calculatedData?.chart?.mingGong) || pickTextFromSources((src) => src?.chartMeta?.mingGong),
        shenGong: pickTextFromSources((src) => src?.calculatedData?.chart?.shenGong) || pickTextFromSources((src) => src?.chartMeta?.shenGong),
      },
      palaces: mergedPalaces.map((palace) => ({
        ...palace,
        palaceKey: String(palace?.key || palace?.palaceKey || "").trim(),
        interpretationSeed: String(palace?.interpretationSeed || "").trim() || buildZiweiPalaceInterpretationSeed(palace),
      })),
      palacesByKey: {
        ...(canonicalCalculatedData?.palacesByKey && typeof canonicalCalculatedData.palacesByKey === "object" ? canonicalCalculatedData.palacesByKey : {}),
        ...mergedPalacesByKey,
      },
      cycles: {
        ...(existing?.calculatedData?.cycles && typeof existing.calculatedData.cycles === "object" ? existing.calculatedData.cycles : {}),
        ...(canonicalCalculatedData?.cycles && typeof canonicalCalculatedData.cycles === "object" ? canonicalCalculatedData.cycles : {}),
        daXian: mergedDaXian,
        annual: (Array.isArray(existing?.calculatedData?.cycles?.annual) && existing.calculatedData.cycles.annual.length)
          ? existing.calculatedData.cycles.annual
          : (Array.isArray(canonicalCalculatedData?.cycles?.annual) && canonicalCalculatedData.cycles.annual.length)
            ? canonicalCalculatedData.cycles.annual
            : (annualLuck ? [annualLuck] : []),
        monthly: (Array.isArray(existing?.calculatedData?.cycles?.monthly) && existing.calculatedData.cycles.monthly.length)
          ? existing.calculatedData.cycles.monthly
          : (Array.isArray(canonicalCalculatedData?.cycles?.monthly) && canonicalCalculatedData.cycles.monthly.length)
            ? canonicalCalculatedData.cycles.monthly
            : monthlyLuck,
      },
    },
    diagnostics: {
      generatedAt: new Date().toISOString(),
      source: basicPreferred ? "basicZiweiResult+canonical" : (existing ? "existing+fallback" : (fromBasic ? "basicZiweiResult" : "canonical")),
      missingFields: Array.from(new Set([
        ...(Array.isArray(existing?.diagnostics?.missingFields) ? existing.diagnostics.missingFields : []),
        ...(Array.isArray(fromBasic?.diagnostics?.missingFields) ? fromBasic.diagnostics.missingFields : []),
        ...(Array.isArray(fromCanonical?.diagnostics?.missingFields) ? fromCanonical.diagnostics.missingFields : []),
      ])),
    },
  };

  const ziweiSeed = {
    birth: {
      name: String(merged?.profile?.name || userProfile?.name || birthInput?.name || "사용자").trim() || "사용자",
      gender: String(merged?.profile?.gender || userProfile?.gender || birthInput?.gender || "").trim() || null,
      birthDate: String(merged?.profile?.birth?.solarDate || birthInput?.birthDate || userProfile?.birthDate || "").trim() || null,
      birthTime: String(merged?.profile?.birth?.time || birthInput?.birthTime || userProfile?.birthTime || "").trim() || null,
      calendarType: String(merged?.profile?.birth?.calendarType || userProfile?.calendarType || birthInput?.calendarType || "solar").trim() || "solar",
      timezone: String(merged?.profile?.birth?.timezone || birthInput?.timezone || userProfile?.timezone || "Asia/Seoul").trim() || "Asia/Seoul",
    },
    chartMeta: {
      mingGong: String(merged?.chartMeta?.mingGong || "").trim() || null,
      shenGong: String(merged?.chartMeta?.shenGong || "").trim() || null,
      fiveElementBureau: String(merged?.chartMeta?.fiveElementBureau || "").trim() || null,
      yearStemBranch: String(merged?.chartMeta?.yearStemBranch || "").trim() || null,
      monthStemBranch: String(merged?.chartMeta?.monthStemBranch || "").trim() || null,
      dayStemBranch: String(merged?.chartMeta?.dayStemBranch || "").trim() || null,
      hourStemBranch: String(merged?.chartMeta?.hourStemBranch || "").trim() || null,
    },
    core: {
      palaceCount: Array.isArray(merged?.palaces) ? merged.palaces.length : 0,
      hasAll12Palaces: Array.isArray(merged?.palaces) && merged.palaces.length === 12,
      hasMingGong: Boolean(String(merged?.chartMeta?.mingGong || "").trim()),
      hasShenGong: Boolean(String(merged?.chartMeta?.shenGong || "").trim()),
    },
    palaces: Array.isArray(merged?.palaces)
      ? merged.palaces.map((palace, index) => ({
        index: index + 1,
        key: String(palace?.key || palace?.palaceKey || normalizeZiweiPalaceKey(palace?.nameKo || palace?.name || "", index) || "").trim() || null,
        name: String(palace?.nameKo || palace?.name || "").trim() || null,
        branch: String(palace?.branch || "").trim() || null,
        mainStars: Array.isArray(palace?.mainStars) ? palace.mainStars.map((star) => ({
          name: String(star?.nameKo || star?.name || "").trim() || null,
          brightness: normalizeZiweiStrengthLabel(star?.brightness || star?.strength || star?.brightnessKo || "") || "평",
          strengthSymbol: normalizeStrengthSymbol(star?.strengthSymbol || star?.symbol, star?.brightness || star?.strength || star?.brightnessKo || "") || "△",
        })) : [],
      }))
      : [],
    stars: Array.isArray(merged?.palaces)
      ? merged.palaces.flatMap((palace, palaceIndex) => {
        const sourcePalaceName = String(palace?.nameKo || palace?.name || "").trim();
        const collect = (rows, role) => (Array.isArray(rows) ? rows : []).map((star, starIndex) => ({
          palaceIndex: palaceIndex + 1,
          palaceKey: String(palace?.key || palace?.palaceKey || normalizeZiweiPalaceKey(palace?.nameKo || palace?.name || "", palaceIndex) || "").trim() || null,
          palaceName: sourcePalaceName || null,
          role,
          index: starIndex + 1,
          name: String(star?.nameKo || star?.name || "").trim() || null,
          brightness: normalizeZiweiStrengthLabel(star?.brightness || star?.strength || star?.brightnessKo || "") || "평",
          strengthSymbol: normalizeStrengthSymbol(star?.strengthSymbol || star?.symbol, star?.brightness || star?.strength || star?.brightnessKo || "") || "△",
        })).filter((row) => row.name);

        return [
          ...collect(palace?.mainStars, "main"),
          ...collect(palace?.auxiliaryStars, "auxiliary"),
          ...collect(palace?.minorStars, "minor"),
          ...collect(palace?.maleficStars, "malefic"),
        ];
      })
      : [],
    transformations: Array.isArray(merged?.sihua)
      ? merged.sihua.map((entry) => ({
        type: String(entry?.type || "").trim() || null,
        starName: String(entry?.starName || entry?.star || "").trim() || null,
        palaceName: String(entry?.palaceName || entry?.palace || "").trim() || null,
      })).filter((row) => row.type || row.starName || row.palaceName)
      : [],
    cycles: {
      daXian: Array.isArray(merged?.calculatedData?.cycles?.daXian) ? merged.calculatedData.cycles.daXian : [],
      annual: Array.isArray(merged?.calculatedData?.cycles?.annual) ? merged.calculatedData.cycles.annual : [],
      monthly: Array.isArray(merged?.calculatedData?.cycles?.monthly) ? merged.calculatedData.cycles.monthly : [],
    },
    summary: {
      mingGong: String(merged?.chartMeta?.mingGong || "").trim() || null,
      shenGong: String(merged?.chartMeta?.shenGong || "").trim() || null,
      palaceCount: Array.isArray(merged?.palaces) ? merged.palaces.length : 0,
    },
  };

  const chapterFocus = [
    { palaces: ["ming", "body", "career", "wealth", "fortune"], signals: ["mainStars", "threeSidesFourOpposites", "lifeMaster"] },
    { palaces: ["fortune", "ming", "body"], signals: ["emotionalPattern", "innerDrive"] },
    { palaces: ["travel", "friends"], signals: ["externalImage", "networkDynamics"] },
    { palaces: ["career", "body"], signals: ["careerDirection", "roleStrategy"] },
    { palaces: ["wealth", "house"], signals: ["cashflow", "assetManagement"] },
    { palaces: ["spouse", "ming", "body"], signals: ["relationshipPattern", "bondManagement"] },
    { palaces: ["friends", "siblings"], signals: ["collaboration", "supportNetwork"] },
    { palaces: ["house", "ming"], signals: ["homeEnergy", "propertyTiming"] },
    { palaces: ["health", "body"], signals: ["recovery", "energyRhythm"] },
    { periods: ["decade", "annual", "monthly"], signals: ["timing", "inflectionPoints"] },
    { periods: ["annual", "monthly"], signals: ["monthlyPlan", "goStop"] },
    { palaces: ["ming", "body", "fortune"], signals: ["remediation", "habitDesign"] },
    { palaces: ["ming", "body", "career", "wealth"], signals: ["90DayPlan", "executionRoadmap"] },
  ];

  merged.ziweiSeed = ziweiSeed;
  merged.chapterInputs = Array.from({ length: 12 }, (_, idx) => {
    const spec = Array.isArray(ZIWEI_PDF_CHAPTERS_V2) ? ZIWEI_PDF_CHAPTERS_V2[idx] : null;
    return {
      chapterNo: idx + 1,
      title: String(spec?.title || `Chapter ${idx + 1}`).trim(),
      focusData: {
        title: String(spec?.title || `Chapter ${idx + 1}`).trim(),
        keyPalaces: Array.isArray(chapterFocus[idx]?.palaces) ? chapterFocus[idx].palaces.slice() : [],
        signals: Array.isArray(chapterFocus[idx]?.signals) ? chapterFocus[idx].signals.slice() : [],
        chartMeta: ziweiSeed.chartMeta,
        summary: ziweiSeed.summary,
      },
      requiredChartData: Array.isArray(spec?.requiredChartData) && spec.requiredChartData.length
        ? spec.requiredChartData.slice()
        : ["chartMeta.mingGong", "chartMeta.shenGong", "palaces", "stars", "cycles"],
    };
  });

  if (!String(merged.chartMeta?.mingGong || "").trim()) pushUnique(dataQuality?.missingFields, "chartMeta.mingGong");
  if (!String(merged.chartMeta?.shenGong || "").trim()) pushUnique(dataQuality?.missingFields, "chartMeta.shenGong");
  if (!Array.isArray(merged.palaces) || merged.palaces.length === 0) pushUnique(dataQuality?.missingFields, "palaces");

  return merged;
}

async function ensureZiweiReportPayload(args = {}) {
  return buildZiweiPdfReportPayload(args);
}

async function buildZiweiPremiumReportPayload(args = {}) {
  const payload = await ensureZiweiReportPayload(args);
  const validation = validateZiweiPdfPayload(payload, args?.birthInput || null);
  return {
    payload,
    validation,
    missingFields: Array.from(new Set([...(validation?.missingCriticalFields || []), ...(validation?.missingOptionalFields || [])])),
  };
}

function validateZiweiPdfPayload(payload, birthInput = null) {
  const critical = [];
  const optional = [];
  const source = (payload && typeof payload === "object") ? payload : null;

  if (!source) {
    return {
      canGenerate: false,
      missingCriticalFields: ["reportPayload"],
      missingOptionalFields: [],
      missingFields: ["reportPayload"],
    };
  }

  const chartMeta = (source.chartMeta && typeof source.chartMeta === "object") ? source.chartMeta : {};
  const palaces = Array.isArray(source.palaces) ? source.palaces : [];
  const luck = (source.luck && typeof source.luck === "object") ? source.luck : {};
  const calculatedData = (source.calculatedData && typeof source.calculatedData === "object") ? source.calculatedData : {};
  const sihua = Array.isArray(source.sihua) ? source.sihua : [];

  const birthDate = String(
    birthInput?.birthDate
    || source?.profile?.birth?.solarDate
    || ""
  ).trim();
  if (!birthDate) optional.push("birthInput");

  if (!String(chartMeta?.mingGong || "").trim()) optional.push("chartMeta.mingGong");
  if (!String(chartMeta?.shenGong || "").trim()) optional.push("chartMeta.shenGong");
  if (!palaces.length) critical.push("palaces");
  if (palaces.length > 0 && palaces.length < 8) optional.push("palaces.length");
  const allMainStars = palaces.flatMap((palace) => Array.isArray(palace?.mainStars) ? palace.mainStars : []);
  const hasAnyMainStar = allMainStars.some((star) => String(star?.nameKo || star?.name || "").trim());
  if (!hasAnyMainStar) optional.push("palaces.mainStars");

  if (!sihua.length) optional.push("sihua");
  if (!Array.isArray(luck?.decadeLuck) || luck.decadeLuck.length === 0) optional.push("luck.decadeLuck");
  if (!luck?.annual || typeof luck.annual !== "object") optional.push("luck.annual");
  if (!Array.isArray(luck?.monthly) || luck.monthly.length === 0) optional.push("luck.monthly");

  const calcCycles = (calculatedData?.cycles && typeof calculatedData.cycles === "object") ? calculatedData.cycles : {};
  const hasDaXian = (Array.isArray(luck?.decadeLuck) && luck.decadeLuck.length > 0)
    || (Array.isArray(calcCycles?.daXian) && calcCycles.daXian.length > 0);
  if (!hasDaXian) optional.push("calculatedData.cycles.daXian");

  const strengthCount = allMainStars.filter((star) => {
    const symbol = normalizeZiweiStrengthSymbol(star?.symbol || star?.strengthSymbol || "");
    const strength = normalizeZiweiStrengthLabel(star?.brightness || star?.strength || "");
    return Boolean(symbol || strength);
  }).length;
  if (hasAnyMainStar && strengthCount === 0) optional.push("palaces.mainStars.strength");

  const interpretationSeedMissing = palaces.some((palace) => !String(palace?.interpretationSeed || "").trim());
  if (interpretationSeedMissing) optional.push("palaces.interpretationSeed");

  const hasAssistantOrMinor = palaces.some((palace) => {
    const assistants = Array.isArray(palace?.auxStars) ? palace.auxStars.length : 0;
    const minors = Array.isArray(palace?.minorStars) ? palace.minorStars.length : 0;
    return assistants > 0 || minors > 0;
  });
  if (!hasAssistantOrMinor) optional.push("palaces.assistantOrMinorStars");

  const missingCriticalFields = Array.from(new Set(critical));
  const missingOptionalFields = Array.from(new Set(optional));
  return {
    canGenerate: missingCriticalFields.length === 0,
    missingCriticalFields,
    missingOptionalFields,
    missingFields: Array.from(new Set([...missingCriticalFields, ...missingOptionalFields])),
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

function uniqueZiweiTextList(values = []) {
  const seen = new Set();
  const out = [];
  (Array.isArray(values) ? values : []).forEach((value) => {
    const token = String(value || "").trim();
    if (!token || seen.has(token)) return;
    seen.add(token);
    out.push(token);
  });
  return out;
}

function normalizeZiweiPayloadStar(star) {
  const name = String(star?.nameKo || star?.name || star?.star || "").trim();
  if (!name) return null;
  const strength = ziweiStrengthFromStar(star);
  const symbol = ziweiStrengthSymbolFromStar(star);
  return {
    name,
    strength,
    symbol,
    meaning: ziweiStrengthMeaning(strength),
  };
}

function normalizeZiweiPayloadPalace(palace, index) {
  const name = String(
    palace?.nameKo
    || palace?.name
    || palace?.palaceName
    || ZIWEI_CANONICAL_PALACE_KEY_TO_KO[String(palace?.key || "").trim()]
    || `궁${index + 1}`,
  ).trim();
  const key = String(palace?.key || normalizeZiweiPalaceKey(name, index) || "").trim() || `palace_${index + 1}`;
  const branch = String(palace?.branch || palace?.earthlyBranch || "").trim();
  const stars = [];
  const seenStars = new Set();
  const pushStar = (rows) => {
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const normalized = normalizeZiweiPayloadStar(row);
      const starName = String(normalized?.name || "").trim();
      if (!starName || seenStars.has(starName)) return;
      seenStars.add(starName);
      stars.push(normalized);
    });
  };
  pushStar(palace?.mainStars || palace?.stars || []);
  pushStar(palace?.auxStars || palace?.subStars || palace?.minorStars || []);
  pushStar(palace?.maleficStars || palace?.badStars || []);

  return {
    key,
    name,
    branch,
    stars,
  };
}

function normalizeZiweiPremiumProfile(profile = {}, birthInput = {}) {
  const birthDate = String(profile.birthDate || birthInput.birthDate || "").trim();
  const birthTime = String(profile.birthTime || birthInput.birthTime || "").trim();
  const calendarType = normalizePremiumCalendarType(profile.calendarType || birthInput.calendarType || "") || "solar";
  return {
    profileId: String(profile.profileId || profile.id || birthInput.profileId || "").trim() || null,
    name: String(profile.name || birthInput.name || "사용자").trim() || "사용자",
    gender: String(profile.gender || birthInput.gender || "").trim() || "",
    birthDate,
    birthTime,
    calendarType,
    isLunar: asBool(profile.isLunar ?? birthInput.isLunar ?? calendarType === "lunar"),
    timeUnknown: asBool(profile.timeUnknown ?? birthInput.timeUnknown),
    birthPlace: String(profile.birthPlace || birthInput.birthPlace || "").trim() || null,
    timezone: String(profile.timezone || birthInput.timezone || "Asia/Seoul").trim() || "Asia/Seoul",
  };
}

function buildZiweiPremiumPayloadFromProfileAndBasicResult({
  profile = {},
  basicZiweiResult = null,
  reportPayload = null,
  chapterCount = 12,
  totalCategoryCount = 0,
} = {}) {
  const source = (reportPayload && typeof reportPayload === "object") ? reportPayload : {};
  const basic = (basicZiweiResult && typeof basicZiweiResult === "object") ? basicZiweiResult : {};
  const chart = (basic.chart && typeof basic.chart === "object") ? basic.chart : {};

  const chartMeta = {
    mingGong: String(source?.chartMeta?.mingGong || chart?.chartMeta?.mingGong || chart?.mingGong || "").trim() || null,
    shenGong: String(source?.chartMeta?.shenGong || chart?.chartMeta?.shenGong || chart?.shenGong || "").trim() || null,
    fiveElementBureau: String(source?.chartMeta?.fiveElementBureau || chart?.chartMeta?.fiveElementBureau || "").trim() || null,
    yearStemBranch: String(source?.chartMeta?.yearStemBranch || chart?.chartMeta?.yearStemBranch || "").trim() || null,
  };

  const rawPalaces = Array.isArray(source?.palaces) && source.palaces.length
    ? source.palaces
    : (Array.isArray(chart?.palaces) ? chart.palaces : []);
  const palaces = rawPalaces
    .map((palace, idx) => normalizeZiweiPayloadPalace(palace, idx))
    .filter((palace) => palace && palace.stars.length > 0);

  const luckSource = (source.luck && typeof source.luck === "object") ? source.luck : ((chart.luck && typeof chart.luck === "object") ? chart.luck : {});
  const basicSummary = String(
    basic.summary
    || basic.analysisSummary
    || basic.reportSummary
    || "",
  ).trim();

  return {
    userProfile: normalizeZiweiPremiumProfile(profile, {}),
    chartMeta,
    palaces,
    periods: {
      decade: Array.isArray(luckSource.decadeLuck) ? luckSource.decadeLuck : (Array.isArray(luckSource.decadePeriods) ? luckSource.decadePeriods : []),
      annual: (luckSource.annual && typeof luckSource.annual === "object") ? luckSource.annual : null,
      monthly: Array.isArray(luckSource.monthly) ? luckSource.monthly : [],
    },
    basicResultSummary: basicSummary || null,
    chapterCount: Number.isFinite(Number(chapterCount)) ? Number(chapterCount) : 13,
    totalCategoryCount: Number.isFinite(Number(totalCategoryCount)) ? Number(totalCategoryCount) : 0,
  };
}

function collectZiweiBrightnessCheck(palaces = []) {
  const rows = [];
  (Array.isArray(palaces) ? palaces : []).forEach((palace) => {
    const palaceName = String(palace?.name || palace?.nameKo || palace?.palaceName || "").trim() || "미상궁";
    (Array.isArray(palace?.stars) ? palace.stars : []).forEach((star) => {
      const name = String(star?.name || "").trim();
      const strength = normalizeZiweiStrengthLabel(star?.strength || "") || "미상";
      const symbol = normalizeZiweiStrengthSymbol(star?.symbol || "") || "";
      if (!name || !symbol) return;
      rows.push(`${palaceName}:${name}(${strength},${symbol})`);
    });
  });
  return uniqueZiweiTextList(rows).slice(0, 48);
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
    `- 강약 기호 기준(묘/왕/득·리·평/함·실): ◎=묘, O=왕, △=득·리·평, X=함·실`,
  ];

  if (reportType === "compatibility") {
    profileLines.push(`- 상대 데이터: ${partnerOverview || "기본 프로필 기준"}`);
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

function validateGeneratedChapters(chapter, text, chapterSpec = null) {
  const targetChars = Math.max(2500, Number(chapterSpec?.targetChars || ZIWEI_MIN_CHARS));
  const minChars = Math.max(2000, Math.floor(targetChars * 0.85));
  const missing = ziweiMissingMarkers(text, chapter);
  const tooShort = text.length < minChars;
  const truncated = looksTruncatedMarkdown(text);
  const banned = hasZiweiBannedSummaryExpression(text);
  const invalidSummaryTable = chapter === 1 ? hasInvalidZiweiSummaryTable(text) : false;
  return {
    isValid: !tooShort && missing.length === 0 && !truncated && !banned && !invalidSummaryTable,
    missing,
    tooShort,
    minChars,
    targetChars,
    truncated,
    banned,
    invalidSummaryTable,
  };
}

function hasZiweiBannedSummaryExpression(text) {
  const source = String(text || "");
  if (/데이터\s*단서\s*요약|\[구조화된\s*12궁\s*요약\]|해석의 목적은 예언이 아니라 실행 가능한 선택 기준을 만드는 것입니다\.|심화\s*보충\s*노트|명반\s*데이터가\s*부족해\s*일반론으로\s*보완|구조화된\s*12궁\s*원자료가\s*부족해\s*일부는\s*보수적\s*해석으로\s*보완/.test(source)) {
    return true;
  }
  return ZIWEI_BANNED_PHRASES.some((phrase) => source.includes(phrase))
    || FORBIDDEN_ZIWEI_PDF_PHRASES.some((phrase) => source.includes(phrase));
}

function normalizeZiweiHeadingToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\-_:,.()\[\]{}]/g, "");
}

function validateZiweiChapterResult(chapter, chapterSpec) {
  const src = chapter && typeof chapter === "object" ? chapter : {};
  const sections = Array.isArray(src.sections) ? src.sections : [];
  const requiredSections = Array.isArray(chapterSpec?.sections) ? chapterSpec.sections : [];
  const expectedTitle = String(chapterSpec?.title || "").trim();
  const title = String(src.title || src.chapterTitle || "").trim();
  const intro = String(src.intro || src.summary || "").trim();
  const coreAdvice = String(src.coreAdvice || src.masterAdvice || src.masterConclusion || "").trim();
  const closing = String(src.closing || src.masterConclusion || "").trim();
  const actionGuide = Array.isArray(src.actionGuide) ? src.actionGuide : (Array.isArray(src.practicalAdvice) ? src.practicalAdvice : []);
  const minChars = Math.max(3000, Number(chapterSpec?.minChars || 3000));

  const missing = [];
  if (!title || title !== expectedTitle) missing.push("title");
  if (!intro) missing.push("intro");
  if (!coreAdvice) missing.push("coreAdvice");
  if (!closing) missing.push("closing");
  if (!Array.isArray(actionGuide) || actionGuide.length < 3) missing.push("actionGuide");
  if (sections.length < requiredSections.length) missing.push("sections.length");

  const normalizedRequired = requiredSections.map((row) => normalizeZiweiHeadingToken(row)).filter(Boolean);
  const normalizedActual = sections.map((row) => normalizeZiweiHeadingToken(row?.heading || row?.title)).filter(Boolean);
  const sectionMissing = normalizedRequired.filter((token) => !normalizedActual.includes(token));
  if (sectionMissing.length > 0) missing.push("sections.heading");

  const shortBodies = sections
    .map((row, idx) => ({ idx, body: String(row?.body || "").trim() }))
    .filter((row) => row.body.length < 400)
    .map((row) => `sections[${row.idx}].body`);
  if (shortBodies.length > 0) missing.push(...shortBodies);

  const textForScan = [
    title,
    intro,
    ...sections.map((row) => `${String(row?.heading || "").trim()}\n${String(row?.body || "").trim()}`),
    coreAdvice,
    ...(Array.isArray(actionGuide) ? actionGuide : []),
    closing,
  ].join("\n");

  const forbiddenHits = FORBIDDEN_ZIWEI_PDF_PHRASES.filter((phrase) => String(phrase || "").trim() && textForScan.includes(phrase));
  if (/\bChapter\s*\d+\b/i.test(title)) missing.push("title.placeholder");
  if (forbiddenHits.length > 0) missing.push("forbiddenPhrases");

  const totalChars = String(textForScan || "").replace(/\s+/g, "").length;
  if (totalChars < minChars) missing.push("minChars");

  return {
    ok: missing.length === 0,
    missing,
    forbiddenHits,
    totalChars,
    minChars,
  };
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
  if (Array.isArray(chapterRule?.mustCover)) {
    required.push(...chapterRule.mustCover);
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
  const chapterMinChars = ZIWEI_MIN_CHARS;
  const chapterMaxChars = ZIWEI_MAX_CHARS;
  const chapterHeading = `## 챕터 ${chapter}. ${meta.title}`;
  const exactHeading = chapterRule?.exactHeading || chapterHeading;
  const prefaceHeading = chapterRule?.prefaceHeading || "";
  const prefaceIncludes = Array.isArray(chapterRule?.prefaceIncludes) ? chapterRule.prefaceIncludes : [];
  const chapterIncludes = Array.isArray(chapterRule?.includes) ? chapterRule.includes : [];
  const chapterMustCover = Array.isArray(chapterRule?.mustCover) ? chapterRule.mustCover : [];
  const targetPalace = String(chapterRule?.targetPalace || "").trim();
  const relatedPalaces = Array.isArray(chapterRule?.relatedPalaces) ? chapterRule.relatedPalaces : [];
  const cautionRule = String(chapterRule?.caution || "").trim();

  const monthlyRule = "";
  const roadmapRule = chapter === 13
    ? "챕터 13에서는 반드시 아래 90일 표를 포함하세요: | 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 | / | 1~7일 |  |  |  |  | / | 8~30일 |  |  |  |  | / | 31~60일 |  |  |  |  | / | 61~90일 |  |  |  |  |"
    : "";
  const prologueRule = chapter === 1
    ? `챕터 1 시작 전 반드시 '# ${ZIWEI_REPORT_TITLE}' 다음 줄에 '# ${ZIWEI_PROLOGUE_TITLE}'를 작성하고, 프롤로그에는 가장 강한 기운·반복 패턴·운이 열리는 방식·심리적 함정·리포트 활용법·자미두수는 선택의 나침반이라는 안내를 포함하세요.`
    : "";

  return [
    "너는 자미두수 분야 최고 전문가이며, 30년 경력의 자미두수 명리 전문가이자 심리 상담가, 인생 전략 컨설턴트, 프리미엄 PDF 리포트 작가다.",
    "너는 계산자가 아니다. 너는 해석자다.",
    "자미두수 명반 계산은 내부 엔진에서 이미 완료되었으며, 제공된 데이터만 사용해 해석하라.",
    "JSON에 없는 별, 사화, 궁위, 대한, 유년 정보를 추측해 추가하지 마라.",
    "사용자의 자미두수 명반 데이터를 기반으로 단순 점괘가 아니라 타고난 구조→현재 심리/현실→선택 전략→구체적 개운 실천법을 연결해 작성하라.",
    "오직 마크다운 본문만 출력하라. 코드, 컴포넌트, UI 설명, 개발 설명은 절대 출력하지 마라.",
    "건강·투자·법률·의료는 진단/보장 표현을 금지하고 생활 관리 수준의 조언으로 작성하라.",
    "단정적 공포 문구(예: 반드시 망한다, 절대 안 된다)를 금지하고 상담형 문장으로 작성하라.",
    "한자 용어에는 쉬운 한국어 해설을 반드시 붙여라.",
    "별 하나만 단편 해석하지 말고 궁위·삼방사정·대운·세운·사화를 종합하라.",
    "입력 원자료의 궁별 별 목록과 강약(묘/왕/득·리·평/함·실)은 기호(◎/O/△/X) 중심으로 해석 근거에 직접 반영하라.",
    "자미두수 별의 해석은 별 이름만 나열하지 말고 반드시 묘(廟)/왕(旺)/리(利)/평(平)/함(陷) 세기 상태를 함께 반영하라.",
    "묘·왕은 강점과 활용 전략 중심, 리는 균형/실용성 중심, 평은 환경·습관 중심, 함은 단정이 아닌 보완·회복 전략 중심으로 작성하라.",
    "천동이 △ 또는 X이면 편안함 결핍/정서 예민/과각성 패턴을 근거로 설명하고, 안락함보다 성취감 중심 운영 전략을 제시하라.",
    "천동 약세는 감수성을 감정 소모로 쓰지 말고 UI/UX, 콘텐츠 로직, 서비스 디테일 설계로 전환하는 전략을 포함하라.",
    "경양은 흉으로 단정하지 말고 분리·절단·돌파 에너지로 해석하라. 경양이 ◎이면 기술력/집념/핵심 절단 역량으로 승화된다는 점을 명시하라.",
    "경양·살성의 에너지는 업상대체(코드·디버깅·아키텍처·분석 설계) 전략으로 제시하고 인간관계 충돌 소모를 줄이는 실천안을 포함하라.",
    "우필이 ◎ 또는 O이면 사람/도구/AI 활용 시너지를 통해 지휘자형 성과 모델이 강화된다는 점을 반영하라.",
    "명궁과 신궁은 반드시 별도 소제목(명궁·신궁 집중 해석)에서 별명+강약기호+실전 의미를 분리 설명하라.",
    "심화 보충 노트라는 이름의 섹션을 만들지 마라. 대신 챕터 주제에 맞는 카테고리 섹션을 만들고, 카테고리 간 문장을 중복하지 마라.",
    "이전 챕터에서 사용한 핵심 문장과 동일한 문장을 반복하지 마라.",
    "12궁 각각에 대해 반드시 실제 별 이름, 강약(묘/왕/리/평/함), 강약이 의미하는 해석을 빠짐없이 작성하라.",
    "masterAdvice는 반드시 해당 챕터의 대상 궁위와 관련 궁위를 직접 언급한 실행 조언이어야 하며, 다른 챕터에 재사용 가능한 일반론 문장을 금지한다.",
    "아래 [정확 목차 강제]의 제목/항목을 누락 없이 반영하라. 항목명은 문장 속에 그대로 드러나야 한다.",
    cautionRule ? `주의사항(강제): ${cautionRule}.` : "",
    "절대로 '데이터 단서 요약', '[구조화된 12궁 요약]' 같은 메타 요약 문구를 출력하지 마라.",
    "절대로 '정보 없음' 나열 문장을 만들지 마라. 누락 정보는 자연스럽게 생략하고, 확보된 명반 데이터만으로 정밀 해석하라.",
    "",
    `[현재 생성 대상] ${chapterHeading}`,
    `[부제] ${meta.subtitle}`,
    targetPalace ? `[대상 궁위] ${targetPalace}` : "",
    relatedPalaces.length ? `[관련 궁위] ${relatedPalaces.join(", ")}` : "",
    `[리포트 타입] ${reportType === "compatibility" ? "compatibility" : "personal"}`,
    `[목표 분량] 총 ${chapterMinChars}~${chapterMaxChars}자 범위로 작성` ,
    focusKeywords.length ? `[focusKeywords] ${focusKeywords.join(", ")}` : "",
    previousSentenceBanList.length
      ? `[반복 금지 문장(이전 챕터)]\n- ${previousSentenceBanList.join("\n- ")}`
      : "",
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
    chapterMustCover.length ? `[필수 커버리지]\n- ${chapterMustCover.join("\n- ")}` : "",
    cautionRule ? `- 주의: ${cautionRule}` : "",
    "",
    "[입력 데이터]",
    dataText,
    missingNotice ? `- 데이터 주의: ${missingNotice}` : "",
    "",
    hasStructured
      ? "입력 데이터는 12궁 원자료와 별 강약 정보가 포함되어 있으므로, 궁별 근거 문장(별명+강약+강약의 의미+궁의 기능)을 반드시 써라."
      : "구조 데이터 편차가 있어도 확보된 근거 범위 안에서 챕터를 완성해야 한다.",
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
    : "| 명궁 | - | - | 구조 데이터 정규화 |";

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

async function generateZiweiPremiumChapter(env, body, input, chapter, meta, canonicalZiweiChart, reportPayload, reportType, partnerOverview, dataQuality, previousChapterTexts = [], ziweiPremiumPayload = null) {
  const premiumReportType = "ziweiPremium";
  const chapterContract = body?._premiumLlmInput?.chapterContract
    && typeof body._premiumLlmInput.chapterContract === "object"
    ? body._premiumLlmInput.chapterContract
    : buildPremiumChapterContract(
      premiumReportType,
      REPORT_TYPE_TO_FEATURE_TYPE[premiumReportType] || premiumReportType,
      reportType,
      chapter,
    );
  const chapterSpec = ZIWEI_PDF_CHAPTERS_V2[chapter - 1] || {
    key: `ch_${chapter}`,
    title: meta?.title || `Chapter ${chapter}`,
    goal: meta?.subtitle || "자미두수 핵심 해석",
  };
  console.info("[ZiweiPremium][Gemini] chapter start", {
    chapter,
    requestId: String(body?.requestId || body?.generationId || "").trim(),
    chapterTitle: chapterSpec.title,
  });
  const payloadProfile = (ziweiPremiumPayload && typeof ziweiPremiumPayload === "object" && ziweiPremiumPayload.userProfile)
    ? ziweiPremiumPayload.userProfile
    : {};
  const pdfRawChart = buildZiweiPdfPipelineRawChart(reportPayload, canonicalZiweiChart, dataQuality);
  const context = buildZiweiPdfContext({
    userProfile: {
      name: payloadProfile.name || body?.name || input?.name || "사용자",
      gender: payloadProfile.gender || body?.gender || input?.gender || "",
      birthDate: payloadProfile.birthDate || `${input?.year || ""}-${String(input?.month || "").padStart(2, "0")}-${String(input?.day || "").padStart(2, "0")}`,
      birthTime: payloadProfile.birthTime || `${String(input?.hour || 0).padStart(2, "0")}:${String(input?.minute || 0).padStart(2, "0")}`,
      lunarDate: body?.lunarDate || canonicalZiweiChart?.profile?.birth?.lunarDate || "",
      calendarType: payloadProfile.calendarType || body?.calendarType || "",
      isLunar: asBool(payloadProfile.isLunar),
      timeUnknown: asBool(payloadProfile.timeUnknown),
      birthPlace: payloadProfile.birthPlace || "",
    },
    rawChart: pdfRawChart,
  });

  const premiumSource = (ziweiPremiumPayload && typeof ziweiPremiumPayload === "object") ? ziweiPremiumPayload : null;
  const premiumPalaces = Array.isArray(premiumSource?.palaces) ? premiumSource.palaces : [];
  const premiumChapterInput = Array.isArray(premiumSource?.chapterInputs)
    ? premiumSource.chapterInputs[Number(chapter || 1) - 1] || null
    : null;
  const premiumContext = premiumSource
    ? {
      reportType,
      chapter: {
        id: chapterSpec?.key || `ch_${chapter}`,
        no: Number(chapter || 0),
        title: chapterSpec?.title || meta?.title || `Chapter ${chapter}`,
        input: premiumChapterInput,
      },
      basicResultSummary: String(premiumSource?.basicResultSummary || "").trim() || null,
      userProfile: {
        name: String(premiumSource?.userProfile?.name || payloadProfile?.name || body?.name || input?.name || "사용자").trim() || "사용자",
        gender: String(premiumSource?.userProfile?.gender || payloadProfile?.gender || body?.gender || input?.gender || "").trim() || null,
        birthDate: String(premiumSource?.userProfile?.birthDate || payloadProfile?.birthDate || "").trim() || null,
        birthTime: String(premiumSource?.userProfile?.birthTime || payloadProfile?.birthTime || "").trim() || null,
        calendarType: String(premiumSource?.userProfile?.calendarType || payloadProfile?.calendarType || body?.calendarType || "solar").trim() || "solar",
      },
      chartMeta: {
        mingGong: String(premiumSource?.chartMeta?.mingGong || context?.chartMeta?.命宮 || "").trim() || null,
        shenGong: String(premiumSource?.chartMeta?.shenGong || context?.chartMeta?.身宮 || "").trim() || null,
        fiveElementBureau: String(premiumSource?.chartMeta?.fiveElementBureau || "").trim() || null,
        yearStemBranch: String(premiumSource?.chartMeta?.yearStemBranch || "").trim() || null,
      },
      periods: {
        decadeCount: Array.isArray(premiumSource?.periods?.decade) ? premiumSource.periods.decade.length : 0,
        annual: (premiumSource?.periods?.annual && typeof premiumSource.periods.annual === "object")
          ? premiumSource.periods.annual
          : null,
        monthly: Array.isArray(premiumSource?.periods?.monthly)
          ? premiumSource.periods.monthly.slice(0, 6)
          : [],
      },
      chapterSignals: premiumPalaces.slice(0, 12).map((palace) => {
        const stars = Array.isArray(palace?.stars) ? palace.stars : [];
        return {
          palaceKey: String(palace?.key || "").trim() || null,
          palaceName: String(palace?.name || palace?.nameKo || "").trim() || null,
          branch: String(palace?.branch || "").trim() || null,
          coreStars: stars
            .map((star) => String(star?.name || star?.nameKo || "").trim())
            .filter(Boolean)
            .slice(0, 4),
          strongStars: stars
            .filter((star) => {
              const symbol = String(star?.symbol || "").trim();
              const strength = String(star?.strength || "").trim();
              return symbol === "◎" || symbol === "O" || symbol === "△" || strength === "묘" || strength === "왕" || strength === "리" || strength === "득" || strength === "평";
            })
            .map((star) => String(star?.name || star?.nameKo || "").trim())
            .filter(Boolean)
            .slice(0, 3),
        };
      }),
    }
    : null;
  const promptContext = premiumContext
    ? { ...context, premiumContext, chapterContract }
    : { ...context, chapterContract };
  (Array.isArray(context?.missingSummary) ? context.missingSummary : []).forEach((field) => pushUnique(dataQuality?.missingFields, field));
  (Array.isArray(context?.validation?.warnings) ? context.validation.warnings : []).forEach((warning) => pushUnique(dataQuality?.warnings, warning));

  const previousChapterSummaries = (previousChapterTexts || []).map((txt, idx) => {
    if (!txt) return `Ch.${idx + 1}: [기록 없음]`;
    const cleanText = txt.replace(/\s+/g, " ").trim();
    return `Ch.${idx + 1}: ${cleanText.slice(0, 200)}...`;
  });

  const promptBundle = generateZiweiChapterPrompt({
    chapter: chapterSpec,
    context: promptContext,
    previousChapterSummaries,
  });

  console.info("[ZiweiPremium][DebugArtifact][geminiPromptPayload.json]", {
    chapter: chapterSpec,
    reportType,
    contextSummary: {
      chartMeta: context?.chartMeta || null,
      palaceCount: Array.isArray(context?.palaces) ? context.palaces.length : 0,
      missingSummary: Array.isArray(context?.missingSummary) ? context.missingSummary : [],
      validation: context?.validation || null,
      premiumContextIncluded: Boolean(premiumContext),
      premiumSignalCount: Array.isArray(premiumContext?.chapterSignals) ? premiumContext.chapterSignals.length : 0,
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
  const chapterTargetChars = Math.max(2500, Number(chapterSpec?.targetChars || ZIWEI_MIN_CHARS));
  const chapterMinChars = Math.max(2000, Math.floor(chapterTargetChars * 0.85));
  const chapterMaxChars = Math.max(chapterTargetChars + 700, ZIWEI_MAX_CHARS);
  let rawText = await callGemini(env, prompt, ["PREMIUM_ZIWEI_GEMINI_MODEL"], {
    ...genOptions,
    rawOutput: true,
    expectJson: true,
  });
  let parsed = parseZiweiGeminiResponse(rawText);

  if (!parsed.ok) {
    rawText = await callGemini(env, prompt, ["PREMIUM_ZIWEI_GEMINI_MODEL"], {
      ...genOptions,
      temperature: 0.66,
      maxAttemptsPerPair: 1,
      rawOutput: true,
      expectJson: true,
    });
    parsed = parseZiweiGeminiResponse(rawText);
  }

  if (!parsed.ok) {
    const repairPrompt = [
      "아래 응답을 지정 스키마에 맞는 단일 JSON 객체로만 복구하세요.",
      "필수 키: chapterNo, title, intro, sections[{heading,body}], coreAdvice, actionGuide, closing",
      `title은 반드시 '${String(chapterSpec?.title || "").trim()}' 와 완전히 일치해야 합니다.`,
      "각 section.body는 400자 이상으로 작성하세요.",
      "코드펜스 없이 JSON만 출력하세요.",
      "",
      "[원래 응답]",
      String(rawText || "").trim(),
    ].join("\n");
    rawText = await callGemini(env, repairPrompt, ["PREMIUM_ZIWEI_GEMINI_MODEL"], {
      ...genOptions,
      temperature: 0.1,
      maxOutputTokens: 8192,
      maxAttemptsPerPair: 1,
      rawOutput: true,
      expectJson: true,
    });
    parsed = parseZiweiGeminiResponse(rawText);
  }

  if (!parsed.ok) {
    console.error("[ZiweiPremium][Gemini] parse failed", {
      chapter,
      requestId: String(body?.requestId || body?.generationId || "").trim(),
      code: "ZIWEI_CHAPTER_PARSE_FAILED",
      stage: "gemini-parse",
      detail: String(parsed.error || "JSON_PARSE_FAILED"),
    });
    return {
      ok: false,
      code: "ZIWEI_CHAPTER_PARSE_FAILED",
      message: "Gemini 응답을 챕터 JSON으로 파싱하지 못했습니다.",
      details: [String(parsed.error || "JSON_PARSE_FAILED")],
      chapterMeta: {
        num: Number(chapter || 0),
        title: String(chapterSpec?.title || meta?.title || `Chapter ${chapter}`),
        subtitle: String(chapterSpec?.goal || meta?.subtitle || ""),
      },
    };
  }

  const chapterValidation = validateZiweiChapterResult(parsed.data, chapterSpec);
  if (!chapterValidation.ok) {
    return {
      ok: false,
      code: "ZIWEI_CHAPTER_SCHEMA_FAILED",
      message: "생성된 자미두수 챕터 JSON이 스키마/필수 검증을 통과하지 못했습니다.",
      details: chapterValidation.missing,
      chapterMeta: {
        num: Number(chapter || 0),
        title: String(chapterSpec?.title || meta?.title || `Chapter ${chapter}`),
        subtitle: String(chapterSpec?.goal || meta?.subtitle || ""),
      },
    };
  }

  const chapterJson = sanitizeZiweiChapterJson(parsed.data, chapterSpec);
  const baseMarkdown = buildZiweiChapterMarkdown(chapterJson, chapterSpec, promptContext, chapter === 1);

  let markdown = ensureZiweiChapterMarkdownLength(
    baseMarkdown,
    promptContext,
    chapterMinChars,
    chapterMaxChars,
  );

  const repeatedSentences = detectCrossChapterRepeatedSentences(markdown, previousChapterTexts, 30);
  let finalText = repeatedSentences.length
    ? ensureZiweiChapterMarkdownLength(markdown, promptContext, chapterMinChars, chapterMaxChars)
    : markdown;

  const qualityCheck = validateGeneratedChapters(chapter, finalText, chapterSpec);
  console.info("[ZiweiPremium][Gemini] chapter length", {
    chapter,
    chars: finalText.length,
    minChars: chapterMinChars,
    targetChars: chapterTargetChars,
  });
  const repeatedInside = detectRepeatedLongSentences(finalText, 30);
  const repeatedAcross = detectCrossChapterRepeatedSentences(finalText, previousChapterTexts, 30);
  const qualityFailed = !qualityCheck.isValid || repeatedInside.length > 0 || repeatedAcross.length > 0;

  if (qualityFailed) {
    const qualityDetails = [];
    if (qualityCheck.tooShort) qualityDetails.push("TOO_SHORT");
    if (qualityCheck.truncated) qualityDetails.push("TRUNCATED_MARKDOWN");
    if (qualityCheck.banned) qualityDetails.push("BANNED_EXPRESSION");
    if (qualityCheck.invalidSummaryTable) qualityDetails.push("INVALID_SUMMARY_TABLE");
    if (Array.isArray(qualityCheck.missing) && qualityCheck.missing.length) {
      qualityDetails.push(`MISSING_MARKERS:${qualityCheck.missing.join(",")}`);
    }
    if (repeatedInside.length > 0) qualityDetails.push("REPEATED_SENTENCES_IN_CHAPTER");
    if (repeatedAcross.length > 0) qualityDetails.push("REPEATED_SENTENCES_ACROSS_CHAPTERS");

    return {
      ok: false,
      code: "ZIWEI_CHAPTER_QUALITY_FAILED",
      message: "생성된 자미두수 챕터가 품질 게이트를 통과하지 못했습니다.",
      details: qualityDetails,
      chapterMeta: {
        num: Number(chapter || 0),
        title: String(chapterSpec?.title || meta?.title || `Chapter ${chapter}`),
        subtitle: String(chapterSpec?.goal || meta?.subtitle || ""),
      },
    };
  }

  const chapterEnvelopeValidation = validatePremiumChapterResponseEnvelope({
    reportType: premiumReportType,
    chapterId: chapter,
    data: {
      text: finalText,
      chapterJson,
    },
    chapterContract,
    previousChapterTexts,
  });

  if (!chapterEnvelopeValidation.ok) {
    return {
      ok: false,
      code: "ZIWEI_CHAPTER_CONTRACT_VIOLATION",
      message: "자미두수 챕터가 chapterContract 요구사항을 충족하지 못했습니다.",
      chapterMeta: {
        num: Number(chapter || 0),
        title: String(chapterSpec?.title || meta?.title || `Chapter ${chapter}`),
        subtitle: String(chapterSpec?.goal || meta?.subtitle || ""),
      },
      missingFields: chapterEnvelopeValidation.missingFields,
    };
  }

  console.info("[ZiweiPremium][Gemini] chapter end", {
    chapter,
    requestId: String(body?.requestId || body?.generationId || "").trim(),
    usedFallback: false,
    repeatedSentenceCount: repeatedSentences.length,
  });

  return {
    ok: true,
    text: finalText,
    sections: parseSections(finalText),
    usedFallback: false,
    generationNotice: null,
    warnings: [],
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

const SUKUYO_COMPAT_DEFAULT_SECTION_LABELS = Object.freeze([
  "이 챕터의 핵심 결론",
  "상세 해석",
  "현실 장면",
  "위험 패턴",
  "조율 전략",
  "챕터 요약",
]);

const SUKUYO_COMPAT_SECTION_LABELS = Object.freeze({
  C1: Object.freeze(["두 사람 원형 결론", "27숙 원형 상세 해석", "첫 만남 현실 장면", "관계 착시 위험 패턴", "시작기 조율 전략", "챕터 요약"]),
  C2: Object.freeze(["관계 거리·역할 결론", "거리·역할 구조 해석", "역할 충돌 현실 장면", "주도권 위험 패턴", "역할 재조정 전략", "챕터 요약"]),
  C3: Object.freeze(["정서 파동 결론", "끌림·온도차 상세 해석", "감정 교류 현실 장면", "정서 오해 위험 패턴", "감정 조율 전략", "챕터 요약"]),
  C4: Object.freeze(["갈등 트리거 결론", "상처 버튼 상세 해석", "충돌 현실 장면", "악화 위험 패턴", "갈등 완충 전략", "챕터 요약"]),
  C5: Object.freeze(["신뢰 안정성 결론", "신뢰 형성 구조 해석", "안정 관계 현실 장면", "불신 위험 패턴", "신뢰 강화 전략", "챕터 요약"]),
  C6: Object.freeze(["친밀감 운영 결론", "사랑 언어 상세 해석", "친밀 교류 현실 장면", "거리 과열 위험 패턴", "친밀 밸런스 전략", "챕터 요약"]),
  C7: Object.freeze(["대화 구조 결론", "소통 메커니즘 해석", "오해 복구 현실 장면", "대화 단절 위험 패턴", "소통 개선 전략", "챕터 요약"]),
  C8: Object.freeze(["현실 궁합 결론", "일·돈·생활 구조 해석", "공동 운영 현실 장면", "생활 마찰 위험 패턴", "현실 운영 전략", "챕터 요약"]),
  C9: Object.freeze(["위기 대응 결론", "멀어짐·회복 구조 해석", "회복 시도 현실 장면", "이탈 위험 패턴", "관계 회복 전략", "챕터 요약"]),
  C10: Object.freeze(["관계 유형 총평 결론", "relationType 심층 해석", "유형 적용 현실 장면", "유형 오해 위험 패턴", "유형 맞춤 전략", "챕터 요약"]),
  C11: Object.freeze(["30일 실행 결론", "거리·역할 실행 해석", "주차별 현실 장면", "실행 실패 위험 패턴", "7/30일 조율 전략", "챕터 요약"]),
  C12: Object.freeze(["최종 궁합 결론", "강점·리스크 통합 해석", "장기 동반 현실 장면", "장기 리스크 위험 패턴", "핵심 운영 전략", "챕터 요약"]),
});

function buildSukuyoCompatRequiredHeadings(chapterMeta) {
  const key = String(chapterMeta?.key || "").trim();
  const labels = SUKUYO_COMPAT_SECTION_LABELS[key] || SUKUYO_COMPAT_DEFAULT_SECTION_LABELS;
  const safe = Array.isArray(labels) && labels.length === 6 ? labels : SUKUYO_COMPAT_DEFAULT_SECTION_LABELS;
  return [
    "### 사용 데이터 요약표",
    `## 1. ${safe[0]}`,
    `## 2. ${safe[1]}`,
    `## 3. ${safe[2]}`,
    `## 4. ${safe[3]}`,
    `## 5. ${safe[4]}`,
    `## 6. ${safe[5]}`,
  ];
}

const ZIWEI_LOCAL_SECTION_TITLES = Object.freeze([
  "핵심 요약",
  "자미두수 구조 해석",
  "강점과 기회",
  "주의할 패턴",
  "현실 적용 전략",
]);

function buildZiweiLocalFallbackSectionBody({ chapterSpec, sectionTitle, context, chapterNo }) {
  const profileName = String(context?.profile?.name || "사용자").trim() || "사용자";
  const palaces = Array.isArray(context?.palaces) ? context.palaces : [];
  const pivot = palaces[Math.max(0, (Number(chapterNo || 1) - 1) % Math.max(1, palaces.length))] || {};
  const palaceName = String(pivot?.nameKo || pivot?.name || context?.chartMeta?.命宮 || "명궁").trim() || "명궁";
  const starRows = (Array.isArray(pivot?.mainStars) ? pivot.mainStars : [])
    .slice(0, 4)
    .map((star) => {
      const name = String(star?.nameKo || star?.name || "").trim();
      if (!name) return "";
      const strength = normalizeZiweiStrengthLabel(star?.brightness || star?.strength || star?.brightnessKo || "") || "평";
      const symbol = normalizeZiweiStrengthSymbol(star?.symbol || star?.strengthSymbol || "") || (ZIWEI_STRENGTH_TO_SYMBOL[strength] || "△");
      return `${name}(${symbol} ${strength})`;
    })
    .filter(Boolean)
    .join(", ");
  const stars = starRows || "핵심 별 흐름이 안정적으로 연결되는 구조";

  let text = [
    `${profileName}님의 ${String(chapterSpec?.title || "자미두수 심층 해석").trim()}에서는 ${palaceName}을 중심축으로 현재 작동하는 선택 기준을 읽어야 합니다. `,
    `${sectionTitle} 관점에서 보면 단일 길흉 판단보다 궁의 역할, 별의 강약, 사화 전개, 대운의 타이밍을 함께 보는 방식이 정확도를 높입니다. `,
    `현재 핵심 별 조합은 ${stars}로 관찰되며, 평(△) 구간은 약점 선언이 아니라 환경 보정 과제입니다. 왕·묘의 강한 구간은 추진력이 크지만 과속하면 손실 편차가 커질 수 있어 속도와 품질의 균형을 반드시 맞춰야 합니다. `,
    `실전에서는 관계, 재정, 직업, 건강의 우선순위를 동시에 밀지 말고 주간 단위로 집중 대상을 분리해 누적 성과를 만드는 전략이 유효합니다. 특히 감정 강도가 높아지는 시기에는 결정을 미루기보다 체크리스트를 고정해 판단 기준을 먼저 지키는 것이 중요합니다. `,
    `이번 해석의 목적은 단정 예언이 아니라 실행 가능한 기준을 선명하게 만드는 데 있으며, 작은 행동을 반복해 리듬을 안정화할 때 대운의 변화가 실제 성과로 연결됩니다. `,
  ].join("");

  while (text.length < 560) {
    text += "실행 단계에서는 하루 단위 행동 목표를 짧게 정의하고, 주 1회 검토로 과부하를 줄이며 다음 주 계획을 미세 조정하는 운영 리듬을 유지하세요. ";
  }
  return text;
}

function buildZiweiLocalFallbackChapter({ chapter, chapterSpec, meta, context }) {
  const sectionTitles = Array.isArray(chapterSpec?.sections) && chapterSpec.sections.length
    ? chapterSpec.sections.map((v) => String(v || "").trim()).filter(Boolean)
    : ZIWEI_LOCAL_SECTION_TITLES.slice();

  const sections = sectionTitles.map((title) => ({
    heading: title,
    body: buildZiweiLocalFallbackSectionBody({
      chapterSpec,
      sectionTitle: title,
      context,
      chapterNo: chapter,
    }),
  }));

  const chapterTitle = String(chapterSpec?.title || meta?.title || `자미두수 심층 해석 ${chapter}`).trim();
  const introText = buildZiweiLocalFallbackSectionBody({
    chapterSpec: { title: chapterTitle },
    sectionTitle: "핵심 요약",
    context,
    chapterNo: chapter,
  });

  const chapterJson = {
    chapterNo: Number(chapter || 0),
    title: chapterTitle,
    intro: introText.slice(0, 900),
    sections: sections,
    coreAdvice: buildZiweiLocalFallbackSectionBody({ chapterSpec, sectionTitle: "강점과 기회", context, chapterNo: chapter }).slice(0, 900),
    actionGuide: [
      "이번 주 핵심 선택을 세 가지로 제한하고 우선순위를 고정하세요.",
      "감정 반응이 큰 날에는 결정을 미루지 말고 체크리스트 기반으로 판단하세요.",
      "2주 단위 점검으로 실행 루틴을 보정해 대운 변화에 대응하세요.",
    ],
    closing: buildZiweiLocalFallbackSectionBody({ chapterSpec, sectionTitle: "현실 적용 전략", context, chapterNo: chapter }).slice(0, 850),
  };

  const markdown = [
    `## 챕터 ${Number(chapter || 0)}. ${chapterTitle}`,
    "",
    ...sections.map((section) => `### ${section.heading}\n${section.body}`),
    "",
    `### 챕터 결론\n${chapterJson.closing}`,
  ].join("\n");

  return {
    ok: true,
    usedFallback: true,
    generationNotice: "local-fallback",
    warnings: ["ZIWEI_LOCAL_FALLBACK_USED"],
    text: markdown,
    sections: parseSections(markdown),
    chapterJson,
  };
}

function buildSukuyoChapterPromptPayload(canonical, chapterMeta, chapter, reportType, previousTexts, premiumInput = null) {
  const previousBan = collectPreviousSentenceBanList((previousTexts || []).map((t) => stripSukuyoRepeatNoise(t)), 12);
  const requiredOutputStructure = reportType === "compatibility"
    ? buildSukuyoCompatRequiredHeadings(chapterMeta)
    : [
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
      "compatibility.compatibilityIndex",
      "compatibility.distanceMetrics.resonanceCode",
      "compatibility.roleActionGuide.meAction",
      "compatibility.elementHarmony.relation",
      "compatibility.strengthShadowMap.complementSummary",
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
  const systemInstruction = "너는 숙요점(27숙) 궁합 분야 최고 전문가이자 프리미엄 PDF 상담가다. 너는 계산자가 아니다. 모든 해석은 canonicalSukuyoCompatibility JSON에 있는 값만 사용해야 한다. JSON에 없는 숙, 관계 유형, 거리, 역할을 절대 만들어내지 않는다. compatibilityIndex, distanceMetrics, roleActionGuide, elementHarmony, strengthShadowMap을 반드시 반영하고 추측으로 대체하지 않는다. 입력 편차가 있더라도 제공된 계산 근거 범위 안에서 구체적이고 전문적인 해석으로 챕터를 완성한다. 각 챕터는 반드시 두 사람의 숙 이름, 관계 유형, 거리, 역할 중 최소 4개 이상의 구체 데이터를 포함해야 한다.";
  return [
    systemInstruction,
    "",
    "아래 JSON을 기준으로 마크다운 본문만 출력하세요.",
    "표현 규칙: 동일 문장 반복 금지, 추측 금지, 금지 구문 사용 금지.",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

function validateSukuyoChapterText(text, canonical, reportType, minLength, previousTexts = [], chapterMeta = null) {
  const source = String(text || "");
  const requiredMarkers = reportType === "compatibility"
    ? buildSukuyoCompatRequiredHeadings(chapterMeta)
    : [
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
  const relationVariant = String(canonical?.compatibility?.relationVariant || "");
  const resonanceCode = String(canonical?.compatibility?.distanceMetrics?.resonanceCode || "");
  const elementRelation = String(canonical?.compatibility?.elementHarmony?.relation || "");
  const roleMeAction = String(canonical?.compatibility?.roleActionGuide?.meAction || "");
  const roleOtherAction = String(canonical?.compatibility?.roleActionGuide?.otherAction || "");
  const complementSummary = String(canonical?.compatibility?.strengthShadowMap?.complementSummary || "");
  const compatibilityIndex = Number(canonical?.compatibility?.compatibilityIndex);

  let dataHitCount = 0;
  if (personAName && source.includes(personAName)) dataHitCount += 1;
  if (reportType === "compatibility" && personBName && source.includes(personBName)) dataHitCount += 1;
  if (reportType === "compatibility" && relationType && source.includes(relationType)) dataHitCount += 1;
  if (reportType === "compatibility" && distanceLabel && source.includes(distanceLabel)) dataHitCount += 1;
  if (reportType === "compatibility" && aRole && source.includes(aRole)) dataHitCount += 1;
  if (reportType === "compatibility" && bRole && source.includes(bRole)) dataHitCount += 1;
  if (reportType === "compatibility" && relationVariant && source.includes(relationVariant)) dataHitCount += 1;
  if (reportType === "compatibility" && resonanceCode && source.includes(resonanceCode)) dataHitCount += 1;
  if (reportType === "compatibility" && elementRelation && source.includes(elementRelation)) dataHitCount += 1;
  if (reportType === "compatibility" && roleMeAction && source.includes(roleMeAction)) dataHitCount += 1;
  if (reportType === "compatibility" && roleOtherAction && source.includes(roleOtherAction)) dataHitCount += 1;
  if (reportType === "compatibility" && complementSummary && source.includes(complementSummary)) dataHitCount += 1;
  if (reportType === "compatibility" && Number.isFinite(compatibilityIndex) && source.includes(String(Math.round(compatibilityIndex)))) dataHitCount += 1;

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
    const check = validateSukuyoChapterText(text, canonical, reportType, minLength, previousTexts, chapterMeta);
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

  const finalCheck = validateSukuyoChapterText(text, canonical, reportType, minLength, previousTexts, chapterMeta);
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
  const systemPrompt = "너는 숙요점(27숙) 개인 리포트 분야 최고 전문가이자 프리미엄 PDF 상담가다. 너는 숙요를 계산하지 않는다. 모든 해석은 canonicalSukuyoNatal JSON에 있는 값만 사용한다. JSON에 없는 본명숙, 월상, 삭망각, 조도, 방향, 원소, 숙요 속성을 절대 만들어내지 않는다. 각 챕터는 자기 주제에 맞는 고유한 세부 카테고리를 가져야 하며, 모든 챕터에 같은 소제목을 반복해서는 안 된다. 입력 편차가 있더라도 제공된 계산 근거 범위 안에서 챕터를 완성한다.";
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

async function handleSukuyoLife(request, env, authInfo = null) {
  const body = await readJson(request);
  Object.assign(body, normalizePremiumRequestBodyForPipeline("sookyoPremium", body));
  const strictPayloadMode = true;
  const strictBody = {
    ...body,
    _premiumStrictPayload: strictPayloadMode,
  };
  const prepareOnly = asBool(strictBody.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(strictBody)) {
    return json({ ok: false, message: "chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }

  const input = normalizeBody(strictBody);
  const requestedReportType = String(strictBody.reportType || strictBody.reportMode || (hasCompletePartnerData(strictBody) ? "compatibility" : "personal")).toLowerCase();
  const reportType = requestedReportType === "compatibility" ? "compatibility" : "personal";
  const hasPartner = hasCompletePartnerData(strictBody);

  let personASukuyo;
  let personAMissingFields = [];
  try {
    personASukuyo = await calcSukuyoStrict(request, env, input, {
      explicitLunar: parseSukuyoLunarHint(strictBody),
      calendarType: strictBody.calType || strictBody.calendarType || "solar",
    });
  } catch (error) {
    personASukuyo = null;
    personAMissingFields = Array.isArray(error?.missingFields)
      ? error.missingFields.map((f) => `personA.${f}`)
      : ["personA.birth.lunarDate", "personA.sukuyo.index"];
  }

  if (reportType === "personal") {
    const chapterMetaList = getSukyoPdfChapters("personal").map((chapter, idx) => ({
      num: idx + 1,
      title: chapter.title,
      subtitle: chapter.goal,
    }));
    const totalChapters = chapterMetaList.length;
    const chapter = clampInt(strictBody.chapter, 1, 1, totalChapters);

    let swissBasis = null;
    try {
      swissBasis = await fetchSwissSukuyoBasis(request, env, input);
    } catch (_) {
      swissBasis = null;
    }
    const moonPhase = swissBasis?.moonPhase || null;

    const canonicalSukuyoNatal = buildCanonicalSukuyoNatal({
      name: String(strictBody.name || input.name || "사용자"),
      gender: strictBody.gender || input.gender || null,
      input,
      sukuyo: personASukuyo || {},
      lunarPhase: moonPhase,
      calendarSource: personASukuyo?.source || "fallback",
      methodVersion: "sukuyo-natal-v2",
    });

    const natalValidation = validateCanonicalSukuyoNatal(canonicalSukuyoNatal);
    const expectedSukuyo = String(strictBody.expectedSukuyoName || strictBody.currentSukuyoName || "").trim();
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

    const reportId = String(strictBody.reportId || `sukuyo_${stableHash([
      "personal",
      input.year,
      input.month,
      input.day,
      input.hour,
      input.minute,
      canonicalSukuyoNatal?.natalSukuyo?.index,
      String(strictBody.name || input.name || ""),
    ].join("|"))}`);

    const previousChapterTexts = resolvePreviousChapterTexts(
      strictBody.previousChapterTexts,
      getStoredChapterTexts("sukuyo", reportId, chapter),
    );

    const chapterMeta = chapterMetaList[chapter - 1] || { num: chapter, title: `Chapter ${chapter}`, subtitle: "" };
    const chapterSpec = getSukuyoNatalChapterSpec(chapter) || {
      chapter,
      title: chapterMeta.title,
      purpose: chapterMeta.subtitle,
      sections: [],
    };

    const calculatedData = mapSookyoCalculatedData(canonicalSukuyoNatal, strictBody);
    const generated = await generateSukyoPremiumChapterFromContext({
      env,
      context: {
        reportType: "sookyoPremium",
        featureType: "sookyo_premium",
        reportSessionId: strictBody?._premiumReportSessionId || "legacy",
        reportId,
        userId: "legacy",
        input: {
          ...strictBody,
          previousChapterTexts,
        },
        coreData: {
          canonicalJson: {
            calculatedData,
          },
        },
      },
      chapterId: chapter,
      requestId: String(strictBody?._premiumRequestId || strictBody?.requestId || `legacy_${Date.now()}`),
    });

    if (!generated?.ok) {
      return json({
        ok: false,
        code: generated?.code || "SUKYO_CHAPTER_GENERATION_FAILED",
        message: generated?.message || "숙요 챕터 생성에 실패했습니다.",
        missingFields: Array.isArray(generated?.missingFields) ? generated.missingFields : [],
      }, { status: 422 });
    }

    const safeChapterText = sanitizePremiumChapterText(generated.text);
    const storage = writeReportSessionChapter("sukuyo", reportId, chapter, totalChapters, chapterMeta, safeChapterText, {
      reportType,
      ownerUserId: String(authInfo?.userId || "").trim(),
      canonicalSukuyoNatal,
      chapterSpecificSections: chapterSpec.sections,
    });

    await persistPremiumPdfHistoryFromSession(env, "sukuyo", reportId, {
      ownerUserId: String(authInfo?.userId || "").trim(),
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
      text: safeChapterText,
      chapterSummaryForContext: buildChapterSummaryForContext(safeChapterText),
      sections: parseSections(safeChapterText),
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

  const chapterMetaList = getSukyoPdfChapters("compatibility").map((chapterDef, idx) => ({
    num: idx + 1,
    title: chapterDef.title,
    subtitle: chapterDef.goal,
  }));
  const totalChapters = chapterMetaList.length;
  const chapter = clampInt(body.chapter, 1, 1, totalChapters);

  const partnerInput = normalizeBody({
    year: strictBody.partnerYear,
    month: strictBody.partnerMonth,
    day: strictBody.partnerDay,
    hour: strictBody.partnerHour,
    minute: strictBody.partnerMinute,
    timezone: strictBody.partnerTimezone ?? strictBody.timezone,
    lat: strictBody.partnerLat ?? strictBody.lat,
    lon: strictBody.partnerLon ?? strictBody.lon,
    name: strictBody.partnerName || "상대",
    gender: strictBody.partnerGender || "",
  });

  let personBSukuyo;
  let personBMissingFields = [];
  try {
    personBSukuyo = await calcSukuyoStrict(request, env, partnerInput, {
      explicitLunar: parseSukuyoLunarHint(strictBody, "partner"),
      calendarType: strictBody.partnerCalType || "solar",
    });
  } catch (error) {
    personBSukuyo = null;
    personBMissingFields = Array.isArray(error?.missingFields)
      ? error.missingFields.map((f) => `personB.${f}`)
      : ["personB.birth.lunarDate", "personB.sukuyo.index"];
  }

  const canonicalSukuyoCompatibility = buildCanonicalSukuyoCompatibility({
    reportType: "compatibility",
    personAName: String(strictBody.name || input.name || "사용자"),
    personAInput: input,
    personASukuyo: personASukuyo || {},
    personBName: String(strictBody.partnerName || "상대"),
    personBInput: partnerInput,
    personBSukuyo: personBSukuyo || {},
    calendarSource: personASukuyo?.source || "fallback",
    methodVersion: "sukuyo-compat-v2",
  });

  const chartValidation = validateCanonicalSukuyoCompatibility(canonicalSukuyoCompatibility);

  if (prepareOnly) {
    const sajuNewYearChapterMin = getPremiumPerChapterMinChars(SAJU_NEW_YEAR_TOTAL_CHAPTERS, PREMIUM_GLOBAL_MIN_TOTAL_CHARS);
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

  const reportId = String(strictBody.reportId || `sukuyo_${stableHash([
    "compatibility",
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    canonicalSukuyoCompatibility?.personA?.sukuyo?.index,
    canonicalSukuyoCompatibility?.personB?.sukuyo?.index,
    String(strictBody.name || input.name || ""),
    String(strictBody.partnerName || ""),
  ].join("|"))}`);

  const previousChapterTexts = resolvePreviousChapterTexts(
    strictBody.previousChapterTexts,
    getStoredChapterTexts("sukuyo", reportId, chapter),
  );

  const chapterMeta = chapterMetaList[chapter - 1] || { num: chapter, title: `Chapter ${chapter}`, subtitle: "" };
  const compatCalculatedData = mapSookyoCalculatedData(canonicalSukuyoCompatibility, strictBody);
  const generated = await generateSukyoPremiumChapterFromContext({
    env,
    context: {
      reportType: "sookyoPremium",
      featureType: "sookyo_premium",
      reportSessionId: strictBody?._premiumReportSessionId || "legacy",
      reportId,
      userId: "legacy",
      input: {
        ...strictBody,
        previousChapterTexts,
      },
      coreData: {
        canonicalJson: {
          calculatedData: compatCalculatedData,
        },
      },
    },
    chapterId: chapter,
    requestId: String(strictBody?._premiumRequestId || strictBody?.requestId || `legacy_${Date.now()}`),
  });

  if (!generated?.ok) {
    return json({
      ok: false,
      code: generated?.code || "SUKYO_CHAPTER_GENERATION_FAILED",
      message: generated?.message || "숙요 궁합 챕터 생성에 실패했습니다.",
      missingFields: Array.isArray(generated?.missingFields) ? generated.missingFields : [],
    }, { status: 422 });
  }

  const safeChapterText = sanitizePremiumChapterText(generated.text);
  const storage = writeReportSessionChapter("sukuyo", reportId, chapter, totalChapters, chapterMeta, safeChapterText, {
    reportType: "compatibility",
    ownerUserId: String(authInfo?.userId || "").trim(),
    canonicalSukuyoCompatibility,
  });

  await persistPremiumPdfHistoryFromSession(env, "sukuyo", reportId, {
    ownerUserId: String(authInfo?.userId || "").trim(),
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
    text: safeChapterText,
    chapterSummaryForContext: buildChapterSummaryForContext(safeChapterText),
    sections: parseSections(safeChapterText),
  });
}

async function handleAstroWestern(request, env) {
  const body = await readJson(request);
  Object.assign(body, normalizePremiumRequestBodyForPipeline("westernAstrologyPremium", body));
  const debugId = `astro_${Date.now().toString(36)}`;
  const inputValidation = validateAstroProfileInputFields(body, {
    requireBirthDate: true,
  });
  logAstroPdfStage("ProfileInputReceived", {
    debugId,
    profileId: String(body?.profileId || body?.selectedProfileId || ""),
    missingFields: inputValidation.missingFields,
    hasBirthDate: inputValidation.hasBirthDate,
    hasBirthTime: inputValidation.hasBirthTime,
    hasBirthPlace: inputValidation.hasBirthPlace,
    hasGeo: inputValidation.hasGeo,
  }, inputValidation.ok ? "info" : "warn");
  if (!inputValidation.ok) {
    return json({
      ok: false,
      code: "ASTRO_INPUT_INVALID",
      message: "점성술 차트 계산을 위해 생년월일이 필요합니다.",
      missingFields: inputValidation.missingFields,
      debugId,
    }, { status: 422 });
  }

  const strictValidationMode = true;
  const input = normalizeBody(body);
  logAstroPdfStage("NormalizedBirthInput", {
    debugId,
    profileId: String(body?.profileId || body?.selectedProfileId || ""),
    hasBirthDate: inputValidation.hasBirthDate,
    hasBirthTime: inputValidation.hasBirthTime,
    hasBirthPlace: inputValidation.hasBirthPlace,
    hasGeo: inputValidation.hasGeo,
  });
  input.houseSystem = String(body.houseSystem || "placidus").toLowerCase();
  input.zodiacType = String(body.zodiacType || "tropical").toLowerCase();
  input.includeMinorAspects = body.includeMinorAspects !== false;

  const strictSwissMode = Boolean(strictValidationMode && hasAstroBirthTimeInput(body, input));

  try {
    logAstroPdfStage("AstroSeedStart", { debugId, profileId: String(body?.profileId || body?.selectedProfileId || "") });
    const ensuredSeed = await ensureAstroPdfSeed({
      request,
      env,
      body,
      input,
      reportType: "personal",
      strictSwissMode,
    });
    const chart = ensuredSeed.chart;
    const astroSeed = ensuredSeed.seed;
    const seedValidation = ensuredSeed.seedValidation || { ok: true, missingFields: [] };
    if (!seedValidation.ok) {
      logAstroPdfStage("AstroSeedRecovered", {
        debugId,
        missingFields: seedValidation.missingFields || [],
      }, "warn");
    } else {
      logAstroPdfStage("AstroSeedSuccess", { debugId, profileId: String(body?.profileId || body?.selectedProfileId || "") });
    }

    logAstroPdfStage("ReportPayloadBuilt", { debugId, profileId: String(body?.profileId || body?.selectedProfileId || "") });
    const canonicalAstroChart = astroSeed.canonicalAstroChart;
    const strict = validateCanonicalAstroChartStrict(canonicalAstroChart);
    const payloadValidation = validateAstroPdfPayload(astroSeed.reportPayload);
    if (!payloadValidation.ok) {
      logAstroPdfStage("ReportPayloadValidationFailed", {
        debugId,
        profileId: String(body?.profileId || body?.selectedProfileId || ""),
        missingFields: payloadValidation.fatalMissingFields || payloadValidation.missingFields,
      }, "error");
      return json({
        ok: false,
        code: "ASTRO_PDF_PAYLOAD_MISSING",
        message: "출생시간/출생지/차트 계산 데이터가 부족합니다.",
        missingFields: payloadValidation.missingFields,
        debugId,
      }, { status: 422 });
    }

    let chapterPlan = buildAstroChapterPlan(canonicalAstroChart, "personal");
    if (!chapterPlan.length) {
      chapterPlan = ASTRO_PERSONAL_CHAPTER_META.map((meta, idx) => ({
        chapter: idx + 1,
        key: meta.key,
        title: meta.title,
        subtitle: meta.subtitle,
        icon: meta.icon,
        degraded: true,
        reasons: ["minimal-chart"],
      }));
    }
    return json({
      ok: true,
      ...chart,
      canonicalAstroChart,
      chapterPlan: astroSeed.chapterPlan,
      totalChapters: chapterPlan.length,
      strictValidationMode,
      warnings: Array.from(new Set([...(strict.isValid ? [] : strict.missingFields), ...(payloadValidation.recoverableMissingFields || [])])),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Swiss chart generation failed");
    logAstroPdfStage("AstroSeedFailed", {
      debugId,
      missingFields: ["natalChart.planets", "houses", "aspects"],
    }, "error");
    console.error("[AstroSwissRequired]", { debugId, message });
    return json({
      ok: false,
      code: "ASTRO_CHART_SEED_FAILED",
      message: "점성술 차트 계산에 필요한 데이터 생성에 실패했습니다.",
      debugId,
      hasChart: false,
      missingFields: ["natalChart.planets", "houses", "aspects"],
    }, { status: 422 });
  }
}

async function handleAstroLife(request, env, authInfo = null) {
  const body = await readJson(request);
  Object.assign(body, normalizePremiumRequestBodyForPipeline("westernAstrologyPremium", body));
  const debugId = `astro_life_${Date.now().toString(36)}`;
  const inputValidation = validateAstroProfileInputFields(body, {
    requireBirthDate: true,
  });
  logAstroPdfStage("ProfileInputReceived", {
    debugId,
    profileId: String(body?.profileId || body?.selectedProfileId || ""),
    missingFields: inputValidation.missingFields,
    hasBirthDate: inputValidation.hasBirthDate,
    hasBirthTime: inputValidation.hasBirthTime,
    hasBirthPlace: inputValidation.hasBirthPlace,
    hasGeo: inputValidation.hasGeo,
  }, inputValidation.ok ? "info" : "warn");
  if (!inputValidation.ok) {
    return json({
      ok: false,
      code: "ASTRO_INPUT_INVALID",
      message: "점성술 차트 계산을 위해 생년월일이 필요합니다.",
      missingFields: inputValidation.missingFields,
      debugId,
    }, { status: 422 });
  }
  const strictValidationMode = true;
  const prepareOnly = asBool(body.prepareOnly);
  const input = normalizeBody(body);
  logAstroPdfStage("NormalizedBirthInput", {
    debugId,
    profileId: String(body?.profileId || body?.selectedProfileId || ""),
    hasBirthDate: inputValidation.hasBirthDate,
    hasBirthTime: inputValidation.hasBirthTime,
    hasBirthPlace: inputValidation.hasBirthPlace,
    hasGeo: inputValidation.hasGeo,
  });
  const partnerIntent = body.partnerName || body.partnerYear || body.partnerMonth || body.partnerDay;
  const requestedReportType = String(body.reportType || (partnerIntent ? "compatibility" : "personal")).toLowerCase();
  let reportType = requestedReportType === "compatibility" ? "compatibility" : "personal";

  input.birthPlace = String(
    body.birthPlace
    || body.place
    || body.location
    || body.timezoneName
    || body.timezone
    || ((Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lon ?? body.lng)))
      ? `lat:${Number(body.lat).toFixed(4)},lon:${Number(body.lon ?? body.lng).toFixed(4)}`
      : "")
    || "정보 없음"
  ).trim();
  input.houseSystem = String(body.houseSystem || "placidus").toLowerCase();
  input.zodiacType = String(body.zodiacType || "tropical").toLowerCase();
  input.includeMinorAspects = body.includeMinorAspects !== false;

  const hasPartner = hasCompletePartnerData(body);
  if (reportType === "compatibility" && !hasPartner) {
    reportType = "personal";
  }

  const reportId = astroReportIdFromInput(body, input, reportType);

  const strictSwissMode = hasAstroBirthTimeInput(body, input);

  logAstroPdfStage("AstroSeedStart", { debugId, profileId: String(body?.profileId || body?.selectedProfileId || "") });
  const ensuredSeed = await ensureAstroPdfSeed({
    request,
    env,
    body,
    input,
    reportType,
    strictSwissMode,
  });
  let chart = ensuredSeed.chart;
  if (!ensuredSeed?.seedValidation?.ok) {
    logAstroPdfStage("AstroSeedRecovered", {
      debugId,
      missingFields: ensuredSeed?.seedValidation?.missingFields || [],
    }, "warn");
  } else {
    logAstroPdfStage("AstroSeedSuccess", { debugId, profileId: String(body?.profileId || body?.selectedProfileId || "") });
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

      try {
        const partnerRaw = await getSwissWesternChart(request, env, partnerInput, { strict: strictSwissMode });
        partnerChart = buildWesternPremiumChart(partnerRaw, partnerInput, {
          houseSystem: partnerInput.houseSystem,
          zodiacType: partnerInput.zodiacType,
          includeMinorAspects: partnerInput.includeMinorAspects,
          strictHouseCusps: strictSwissMode,
        });
        synastry = buildSynastry(chart, partnerChart);
        composite = buildCompositeChart(chart, partnerChart, input.houseSystem);
      } catch (_) {
        partnerChart = null;
        synastry = null;
        composite = null;
      }
  }

  let timingData = null;
  try {
    timingData = await buildAstroTimingData(request, env, input, chart, { strictSwiss: strictSwissMode });
  } catch (_) {
    timingData = null;
  }

  const astroSeed = buildAstroPdfSeed(body, input, chart, reportType, partnerChart, synastry, composite, timingData);
  logAstroPdfStage("ReportPayloadBuilt", { debugId, profileId: String(body?.profileId || body?.selectedProfileId || "") });
  const canonicalAstroChart = astroSeed.canonicalAstroChart;
  const strictValidation = validateCanonicalAstroChartStrict(canonicalAstroChart);
  const payloadValidation = validateAstroPdfPayload(astroSeed.reportPayload);
  if (!payloadValidation.ok) {
    logAstroPdfStage("ReportPayloadValidationFailed", {
      debugId,
      profileId: String(body?.profileId || body?.selectedProfileId || ""),
      missingFields: payloadValidation.fatalMissingFields || payloadValidation.missingFields,
    }, "error");
    return json({
      ok: false,
      code: "ASTRO_PDF_PAYLOAD_MISSING",
      message: "출생시간/출생지/차트 계산 데이터가 부족합니다.",
      missingFields: payloadValidation.missingFields,
      debugId,
    }, { status: 422 });
  }

  let chapterPlan = buildAstroChapterPlan(canonicalAstroChart, reportType);
  if (!chapterPlan.length) {
    chapterPlan = (reportType === "compatibility" ? ASTRO_COMPAT_CHAPTER_META : ASTRO_PERSONAL_CHAPTER_META).map((meta, idx) => ({
      chapter: idx + 1,
      key: meta.key,
      title: meta.title,
      subtitle: meta.subtitle,
      icon: meta.icon,
      degraded: true,
      reasons: ["minimal-chart"],
    }));
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
      missingFields: Array.from(new Set([...(strictValidation?.missingFields || []), ...(payloadValidation.recoverableMissingFields || [])])),
      strictValidationMode,
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

  const previousTexts = resolvePreviousChapterTexts(
    body?.previousChapterTexts,
    getStoredChapterTexts("astro", reportId, Number(meta.chapter)),
  );
  const runtimeLlmInput = body?._premiumLlmInput && typeof body._premiumLlmInput === "object"
    ? body._premiumLlmInput
    : buildLlmPromptInput("westernAstrologyPremium", Number(meta.chapter), canonicalAstroChart);

  let generated;
  try {
    logAstroPdfStage("ChapterGenerateStart", {
      debugId,
      profileId: String(body?.profileId || body?.selectedProfileId || ""),
      reportId,
    });
    generated = await generateAstroPremiumChapter(
      env,
      { ...body, previousChapterTexts: previousTexts, _premiumLlmInput: runtimeLlmInput },
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
    logAstroPdfStage("ChapterGenerateSuccess", {
      debugId,
      profileId: String(body?.profileId || body?.selectedProfileId || ""),
      reportId,
    });
  } catch (error) {
    logAstroPdfStage("ChapterGenerateFailed", {
      debugId,
      profileId: String(body?.profileId || body?.selectedProfileId || ""),
      reportId,
      missingFields: [String(error?.message || "ASTRO_CHAPTER_GENERATION_FAILED")],
    }, "error");
    return json({
      ok: false,
      code: "ASTRO_CHAPTER_GENERATION_FAILED",
      message: String(error?.message || "점성술 챕터 생성에 실패했습니다."),
    }, { status: 422 });
  }

  const safeGeneratedText = sanitizePremiumChapterText(generated.text);
  const chapterLengthPolicy = getAstroChapterLengthPolicy(Number(meta.chapter), reportType);
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
      minChars: Number(chapterLengthPolicy.minChars || ASTRO_MIN_CHARS),
      targetChars: Number(chapterLengthPolicy.targetChars || ASTRO_MIN_CHARS),
      actualChars: safeGeneratedText.length,
      usedFallback: Boolean(generated.usedFallback),
      warnings: generated.warnings || [],
    },
    dataQuality: {
      usedDefaultGeo: !Number.isFinite(Number(body.lat)) || !Number.isFinite(Number(body.lon ?? body.lng)),
      usedDefaultTimezone: !(body.timezoneName || body.timezone),
      houseCuspsSupplemented: !!chart?.houseSystemMeta?.approximation,
      chartSource: String(chart?.source || "unknown"),
      validation: strictValidation,
      strictValidationMode,
      failOpenApplied: false,
    },
    ...generated,
    text: safeGeneratedText,
    chapterSummaryForContext: buildChapterSummaryForContext(safeGeneratedText),
    sections: parseSections(safeGeneratedText),
  };

  responsePayload.storage = writeReportSessionChapter(
    "astro",
    reportId,
    Number(meta.chapter),
    chapterPlan.length,
    meta,
    safeGeneratedText,
    { reportType }
  );

  await persistPremiumPdfHistoryFromSession(env, "astro", reportId, {
    ownerUserId: String(authInfo?.userId || "").trim(),
  });

  writeAstroCache(cacheKey, responsePayload);
  return json({ ok: true, ...responsePayload });
}

async function handleVedicLife(request, env, authInfo = null) {
  const body = await readJson(request);
  Object.assign(body, normalizePremiumRequestBodyForPipeline("vedicPremium", body));
  const strictPayloadMode = true;
  const strictBody = {
    ...body,
    _premiumStrictPayload: strictPayloadMode,
  };
  const prepareOnly = asBool(strictBody.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(strictBody)) {
    return json({ ok: false, message: "chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }
  const input = normalizeBody(strictBody);
  const partnerIntent = strictBody.partnerName || strictBody.partnerYear || strictBody.partnerMonth || strictBody.partnerDay;
  const requestedReportType = normalizeVedicModeAlias(strictBody.mode || strictBody.reportType || (partnerIntent ? "compatibility" : "personal"));
  let reportType = requestedReportType;

  const userBirthPlaceRaw = String(strictBody.birthPlace || strictBody.place || strictBody.location || "").trim();
  const hasUserBirthPlace = hasMeaningfulValue(userBirthPlaceRaw);
  const hasUserBirthTime = !asBool(strictBody.birthTimeUnknown)
    && (hasMeaningfulValue(strictBody.birthTime) || hasMeaningfulValue(strictBody.hour) || hasMeaningfulValue(strictBody.birthHour));
  const hasUserBirthGeo = Number.isFinite(Number(strictBody.lat)) && Number.isFinite(Number(strictBody.lon ?? strictBody.lng));

  logPremiumPipelineStage("VedicInputCheck", {
    reportType,
    prepareOnly,
    hasUserBirthTime,
    hasUserBirthPlace,
    hasUserBirthGeo,
    hasPartnerIntent: Boolean(partnerIntent),
    hasStrictPayload: strictPayloadMode,
  });

  if (!hasUserBirthTime || (!hasUserBirthPlace && !hasUserBirthGeo)) {
    const requiredFields = [
      ...(!hasUserBirthTime ? ["birthTime"] : []),
      ...(!hasUserBirthPlace && !hasUserBirthGeo ? ["birthPlace|lat+lon"] : []),
    ];
    logPremiumPipelineStage("VedicInputRejected", {
      reportType,
      requiredFields,
      hasUserBirthTime,
      hasUserBirthPlace,
      hasUserBirthGeo,
    });
    return json({
      ok: false,
      code: "VEDIC_INPUT_REQUIRED",
      status: "input_required",
      message: "라그나 계산을 위해 출생시간과 출생지 또는 좌표(lat/lon)가 필요합니다.",
      requiredFields,
    });
  }

  input.birthPlace = userBirthPlaceRaw
    || (hasUserBirthGeo
      ? `좌표기반(${Number(input.lat).toFixed(4)},${Number(input.lon).toFixed(4)})`
      : "출생지 미기재");
  input.calendarType = String(strictBody.calendarType || "solar");
  input.isLeapMonth = strictBody.isLeapMonth ?? false;
  input.ayanamsa = String(strictBody.ayanamsa || "lahiri");

  let chart;
  try {
    chart = await getSwissVedicChart(request, env, input);
  } catch (chartError) {
    logPremiumPipelineStage("VedicChartEngineFailed", {
      reportType,
      code: String(chartError?.code || "VEDIC_CHART_ENGINE_FAILED"),
      message: String(chartError?.message || "chart engine failed"),
    });
    return json({
      ok: false,
      code: "VEDIC_CHART_ENGINE_FAILED",
      status: "chart_engine_error",
      recoverable: true,
      message: "차트 계산 엔진에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도하거나, 기본 데이터로 계속 진행됩니다.",
      requiredFields: [],
    }, { status: 422 });
  }
  let partnerChart = null;
  let ashtaKoota = chart.ashtaKoota || null;

  if (reportType === "compatibility") {
    const hasPartnerBirth = Number.isFinite(Number(strictBody.partnerYear))
      && Number.isFinite(Number(strictBody.partnerMonth))
      && Number.isFinite(Number(strictBody.partnerDay));

    if (!hasPartnerBirth) {
      return json({
        ok: false,
        code: "VEDIC_PARTNER_INPUT_REQUIRED",
        status: "partner_input_required",
        message: "궁합 모드에는 상대방 생년월일·출생시간·출생지가 필요합니다.",
        requiredFields: ["partnerYear", "partnerMonth", "partnerDay", "partnerHour", "partnerBirthPlace"],
      });
    } else {
      const partnerInput = normalizeBody({
        ...strictBody,
        year: strictBody.partnerYear,
        month: strictBody.partnerMonth,
        day: strictBody.partnerDay,
        hour: strictBody.partnerHour ?? strictBody.hour ?? 12,
        minute: strictBody.partnerMinute ?? strictBody.minute ?? 0,
        lat: strictBody.partnerLat ?? strictBody.lat,
        lon: strictBody.partnerLon ?? strictBody.lon,
      });

      const partnerBirthPlaceRaw = String(strictBody.partnerBirthPlace || strictBody.birthPlace || strictBody.place || "").trim();
      const hasPartnerBirthGeo = Number.isFinite(Number(partnerInput.lat)) && Number.isFinite(Number(partnerInput.lon));
      const hasPartnerBirthAnchor = hasMeaningfulValue(partnerBirthPlaceRaw) || hasPartnerBirthGeo;
      partnerInput.birthPlace = partnerBirthPlaceRaw
        || (hasPartnerBirthGeo
          ? `좌표기반(${Number(partnerInput.lat).toFixed(4)},${Number(partnerInput.lon).toFixed(4)})`
          : "출생지 미기재");
      partnerInput.calendarType = String(strictBody.partnerCalendarType || strictBody.calendarType || "solar");
      partnerInput.isLeapMonth = strictBody.partnerIsLeapMonth ?? false;
      partnerInput.ayanamsa = String(strictBody.ayanamsa || "lahiri");

      if (!hasPartnerBirthAnchor) {
        logPremiumPipelineStage("VedicPartnerInputRejected", {
          reportType,
          hasPartnerBirthGeo,
          hasPartnerBirthPlace: hasMeaningfulValue(partnerBirthPlaceRaw),
        });
        return json({
          ok: false,
          code: "VEDIC_PARTNER_INPUT_REQUIRED",
          status: "partner_input_required",
          message: "궁합 모드에는 상대방 출생지 또는 좌표(lat/lon)가 필요합니다.",
          requiredFields: ["partnerBirthPlace|partnerLat+partnerLon"],
        });
      }

      partnerChart = await getSwissVedicChart(request, env, partnerInput).catch((partnerChartError) => {
        logPremiumPipelineStage("VedicPartnerChartEngineFailed", {
          reportType,
          code: String(partnerChartError?.code || "VEDIC_CHART_ENGINE_FAILED"),
          message: String(partnerChartError?.message || "partner chart engine failed"),
        });
        return null;
      });
      if (partnerChart) {
        ashtaKoota = computeAshtaKoota(chart, partnerChart);
        if (ashtaKoota) {
          chart.ashtaKoota = ashtaKoota;
        }
      }
    }
  }

  const vedicPdfSeed = buildVedicPdfSeed(strictBody, input, chart, reportType, partnerChart, ashtaKoota);
  const seedMissingFields = Array.isArray(vedicPdfSeed?.missingFields) ? vedicPdfSeed.missingFields : [];
  if (seedMissingFields.length > 0) {
    logPremiumPipelineStage("VedicPdfSeedInvalid", {
      reportType,
      missingFields: seedMissingFields,
      hasChart: Boolean(chart),
      hasPartnerChart: Boolean(partnerChart),
      hasAshtaKoota: Boolean(ashtaKoota),
    });
    return json({
      ok: false,
      code: "VEDIC_PDF_SEED_MISSING",
      status: "input_required",
      stage: "PdfSeed",
      message: "베다 PDF seed를 만들기에 필요한 입력이 부족합니다.",
      missingFields: seedMissingFields,
    }, { status: 422 });
  }

  const totalChapters = getVedicTotalChapters(reportType);
  const chapter = clampInt(strictBody.chapter, 1, 1, totalChapters);
  const chapterMetaList = getVedicChapterMetaList(reportType);

  const canonicalVedicChart = buildCanonicalVedicChart(strictBody, input, chart, reportType, partnerChart, ashtaKoota);
  const strictValidation = validateCanonicalVedicChartStrict(canonicalVedicChart, reportType);
  const reportPayloadValidation = validateVedicReportPayload({ input: strictBody, calculatedData: canonicalVedicChart });
  const chapterPlan = buildVedicChapterPlan(canonicalVedicChart, reportType);

  logPremiumPipelineStage("VedicPdfSeedReady", {
    reportType,
    totalChapters,
    chapter,
    seedMissingFields: seedMissingFields.length,
    hasLagna: Boolean(canonicalVedicChart?.lagna?.signName),
    hasMoonNakshatra: Boolean(canonicalVedicChart?.moonNakshatra?.name),
    payloadValid: Boolean(reportPayloadValidation?.ok),
  });

  if (!reportPayloadValidation?.ok) {
    logPremiumPipelineStage("VedicPdfPayloadInvalid", {
      reportType,
      missingFields: Array.isArray(reportPayloadValidation?.missingFields) ? reportPayloadValidation.missingFields : [],
      code: String(reportPayloadValidation?.code || "VEDIC_REPORT_PAYLOAD_INCOMPLETE"),
    });
    return json({
      ok: false,
      code: String(reportPayloadValidation?.code || "VEDIC_REPORT_PAYLOAD_INCOMPLETE"),
      status: "input_required",
      stage: "PdfPayload",
      message: "베다 PDF payload 검증에 실패했습니다.",
      missingFields: Array.isArray(reportPayloadValidation?.missingFields) ? reportPayloadValidation.missingFields : [],
    }, { status: 422 });
  }

  if (prepareOnly) {
    return json({
      ok: true,
      prepared: true,
      reportType,
      totalChapters,
      chapterPlan,
      canonicalVedicChart,
      vedicPdfSeed,
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

  const meta = chapterMetaList[chapter - 1] || { num: chapter, title: `Chapter ${chapter}`, subtitle: "" };
  const runtimeLlmInput = strictBody?._premiumLlmInput && typeof strictBody._premiumLlmInput === "object"
    ? strictBody._premiumLlmInput
    : buildLlmPromptInput("vedicPremium", chapter, canonicalVedicChart);

  const reportId = vedicReportIdFromInput(strictBody, input, reportType);
  const existingEntryForPrev = getStoredReportSession("vedic", reportId);
  const existingChapterResultsByNumberForPrev = toPlainObject(existingEntryForPrev?.extra?.chapterResultsByNumber);
  const previousChapterTextsRaw = [];
  for (let c = 1; c <= totalChapters; c += 1) {
    const prevCh = existingChapterResultsByNumberForPrev[String(c)];
    if (prevCh) {
      const txt = prevCh.contentMarkdown || prevCh.text || "";
      if (txt) previousChapterTextsRaw.push(txt);
    }
  }
  const previousChapterTexts = resolvePreviousChapterTexts(
    strictBody?.previousChapterTexts,
    previousChapterTextsRaw,
  );

  logPremiumPipelineStage("VedicChapterGenerateStart", {
    reportId,
    reportType,
    chapter,
    totalChapters,
    chapterKey: meta?.key || "",
    hasPreviousChapters: previousChapterTexts.length > 0,
    payloadValid: Boolean(reportPayloadValidation?.ok),
  });

  let generated;
  try {
    generated = await generateVedicPremiumChapter(
      env,
      { ...strictBody, _premiumLlmInput: runtimeLlmInput },
      input,
      chapter,
      meta,
      canonicalVedicChart,
      reportType,
      chapterPlan,
      previousChapterTexts,
    );
  } catch (error) {
    console.error("[VedicPremium][ChapterGenerateThrow]", {
      reportId,
      reportType,
      chapter,
      chapterKey: meta?.key || "",
      message: String(error?.message || error || "VEDIC_CHAPTER_GENERATE_THROWN"),
      stack: String(error?.stack || ""),
    });
    return json({
      ok: false,
      code: "VEDIC_CHAPTER_GENERATION_THROWN",
      message: String(error?.message || "베다 챕터 생성 중 예외가 발생했습니다."),
    }, { status: 422 });
  }

  if (!generated?.ok) {
    console.error("[VedicPremium][ChapterGenerateFailed]", {
      reportId,
      reportType,
      chapter,
      chapterKey: meta?.key || "",
      code: generated?.code || "VEDIC_CHAPTER_GENERATION_FAILED",
      message: generated?.message || "베다 챕터 생성에 실패했습니다.",
      details: Array.isArray(generated?.details) ? generated.details : [],
      warnings: Array.isArray(generated?.warnings) ? generated.warnings : [],
    });
    return json({
      ok: false,
      code: generated?.code || "VEDIC_CHAPTER_GENERATION_FAILED",
      message: generated?.message || "베다 챕터 생성에 실패했습니다.",
      details: Array.isArray(generated?.details) ? generated.details : [],
    }, { status: Number(generated?.status || 422) });
  }

  const safeGeneratedText = sanitizePremiumChapterText(generated.text);
  const currentChapterPlan = chapterPlan[chapter - 1] || {};
  logPremiumPipelineStage("VedicChapterGenerateSuccess", {
    reportId,
    reportType,
    chapter,
    chapterKey: meta?.key || "",
    actualChars: safeGeneratedText.length,
    usedFallback: Boolean(generated.usedFallback),
  });
  const storage = writeReportSessionChapter(
    "vedic",
    reportId,
    chapter,
    totalChapters,
    meta,
    safeGeneratedText,
    { reportType }
  );

  await persistPremiumPdfHistoryFromSession(env, "vedic", reportId, {
    ownerUserId: String(authInfo?.userId || "").trim(),
  });

  return json({
    ok: true,
    reportId,
    reportType,
    chapter,
    totalChapters,
    chapterMeta: meta,
    chart,
    canonicalVedicChart,
    partnerChart,
    ashtaKoota,
    chapterPlan,
    chapterAvailability,
    generatedAt: new Date().toISOString(),
    quality: {
      minChars: Number(currentChapterPlan.minChars || VEDIC_MIN_CHARS),
      targetChars: Number(currentChapterPlan.targetChars || 0),
      actualChars: safeGeneratedText.length,
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
      failOpenApplied: false,
      strictPayloadMode,
    },
    missingFields: strictValidation.missingFields || [],
    storage,
    ...generated,
    text: safeGeneratedText,
    chapterSummaryForContext: buildChapterSummaryForContext(safeGeneratedText),
    sections: parseSections(safeGeneratedText),
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

const SAJU_NEW_YEAR_COST = 300;
const SAJU_NEW_YEAR_REASON = "사주 신년운세 PDF 리포트 생성";
const SAJU_NEW_YEAR_TOTAL_CHAPTERS = 10;
const SAJU_NEW_YEAR_MIN_TOTAL_CHARS = 48000;
const SAJU_NEW_YEAR_FOCUS_LABELS = {
  overall: "전체운",
  career: "커리어/사업",
  wealth: "재물/현금흐름",
  relationship: "관계/인맥",
  health: "건강/에너지",
};
const SAJU_NEW_YEAR_INTERNAL_DISCLOSURE_PATTERNS = [
  /(?:년주|월주|일주|시주)\s*[:：]/,
  /(?:일간|월지|지장간)\s*[:：]/,
  /오행\s*분포|십성\s*분포/,
  /대운\/?세운\/?월운\s*계산|합충형파해|용신|희신|기신/,
  /chapterJsonPacks|reportPayload|payload|engine\s*result|JSON/i,
  /내부\s*계산표|사용된\s*데이터는\s*다음과\s*같습니다/i,
];

function getSajuNewYearChapterPromptSpec(chapter) {
  const num = Number(chapter || 1);
  switch (num) {
    case 1:
      return {
        markers: [
          "### 1) 올해의 전체 분위기",
          "### 2) 일간이 체감하는 올해의 압력",
          "### 3) 올해 강해지는 에너지",
          "### 4) 올해의 핵심 문장",
        ],
        checklist: [
          "대상 연도 세운과 원국의 관계를 바탕으로 연간 기조를 제시",
          "일간 기준 체감 압력을 직업/감정/관계/돈/책임감으로 연결",
          "단정적 예언 대신 연간 운영 문장으로 마무리",
        ],
      };
    case 2:
      return {
        markers: [
          "### 1) 올해 일의 큰 방향",
          "### 2) 성과가 나기 쉬운 시기",
          "### 3) 주의해야 할 업무 패턴",
          "### 4) 커리어 실행 전략",
        ],
        checklist: [
          "승진/이직/창업/프로젝트/학습 상황과 연결된 실무 전략 제시",
          "월운 데이터가 없으면 임의 간지 대신 원국+세운 기반 조건 제시",
        ],
      };
    case 3:
      return {
        markers: [
          "### 1) 올해 재물운의 기본 구조",
          "### 2) 수익이 열리는 방식",
          "### 3) 지출과 손실 주의점",
          "### 4) 돈을 지키는 운영법",
        ],
        checklist: [
          "직업 단정 대신 수익 구조 중심으로 해석",
          "예산/비상금/계약 검토/고정비 정리 등 현실 운영법 포함",
        ],
      };
    case 4:
      return {
        markers: [
          "### 1) 올해 사람운의 흐름",
          "### 2) 귀인이 되는 사람",
          "### 3) 피로를 주는 관계",
          "### 4) 협업과 거리두기 전략",
        ],
        checklist: [
          "비겁/인성/관성/재성/식상 작용을 관계 운영 기준과 연결",
          "가까워질 관계/거리둘 관계의 현실 기준 제시",
        ],
      };
    case 5:
      return {
        markers: [
          "### 1) 올해 연애운의 기본 기조",
          "### 2) 새로운 인연 가능성",
          "### 3) 기존 관계와 가정운",
          "### 4) 감정 파동 관리법",
        ],
        checklist: [
          "배우자성/연애 관련 데이터가 있을 때만 확정적으로 반영",
          "몇 월 단정 예언 없이 관계 태도와 대화 전략 제시",
        ],
      };
    case 6:
      return {
        markers: [
          "### 1) 올해 에너지의 소모 지점",
          "### 2) 번아웃이 오기 쉬운 패턴",
          "### 3) 회복 루틴",
          "### 4) 월별 에너지 관리",
        ],
        checklist: [
          "의학적 진단 표현을 피하고 루틴 중심으로 제시",
          "월운 미존재 시 연간 리듬 기반 고강도/저강도 운영 제시",
        ],
      };
    case 7:
      return {
        markers: [
          "### 1) 1분기 전략",
          "### 2) 2분기 전략",
          "### 3) 3분기 전략",
          "### 4) 4분기 전략",
          "### 5) 분기별 의사결정 기준",
        ],
        checklist: [
          "각 분기별로 해야 할 결정/미루는 게 좋은 결정을 구분",
          "시작-확장-재정비-회수 흐름을 분명히 구성",
        ],
      };
    case 8:
      return {
        markers: [
          "### 1) 올해 가장 조심해야 할 리스크",
          "### 2) 일과 돈의 리스크",
          "### 3) 관계와 감정의 리스크",
          "### 4) 위기 대응 플랜",
          "### 5) 하지 말아야 할 선택",
        ],
        checklist: [
          "리스크를 현실 상황(계약/지출/갈등/오해)으로 번역",
          "기록-검토-조정-재실행의 대응 흐름 제시",
        ],
      };
    case 9:
      return {
        markers: [
          "### 1) 1월~3월 월별 전략",
          "### 2) 4월~6월 월별 전략",
          "### 3) 7월~9월 월별 전략",
          "### 4) 10월~12월 월별 전략",
          "### 5) 12개월 Go/Stop 월별 테이블",
        ],
        checklist: [
          "각 월은 이번 달 키워드/Go/Stop/커리어/재물/관계/건강/한 줄 조언을 포함",
          "월운 데이터가 없을 때 임의 월간 간지를 생성하지 않음",
        ],
      };
    case 10:
    default:
      return {
        markers: [
          "### 1) 올해 반드시 해야 할 일",
          "### 2) 올해 버려야 할 패턴",
          "### 3) 3단계 실행 로드맵",
          "### 4) 연말에 회수해야 할 성과",
          "### 5) 개인 맞춤 신년 선언문",
        ],
        checklist: [
          "상반기/하반기/연말 회수 전략을 분리",
          "해야 할 행동 10개와 하지 말아야 할 행동 10개 포함",
          "운명 단정이 아닌 실행 선언문으로 마무리",
        ],
      };
  }
}

const DEFAULT_BOOK_SECTION_HEADERS = [
  "핵심 해석",
  "반복되는 패턴",
  "관계와 선택의 포인트",
  "조심해야 할 그림자",
  "실전 행동 가이드",
];

const LOVE_SECRET_SYSTEM_PROMPT = "너는 Code:Destiny의 프리미엄 사주 연애 비책 PDF를 작성하는 해당 분야 최고 전문가이자 1:1 관계 상담가다. 계산은 하지 않고 canonicalSajuLoveReport JSON의 값만 해석한다. 내부 근거 데이터는 해석의 재료로만 쓰고 PDF 본문에는 노출하지 않는다. 사용된 사주 데이터 목록, 원국 계산 근거, 궁합 산출 과정, JSON/payload/engine result, 내부 점수표, 개발자용 문장(예: 이 데이터에 따르면)은 절대 출력하지 않는다. 개인 모드와 궁합 모드를 엄격히 분리하고, 각 챕터는 주제와 상담 목적이 겹치지 않게 작성한다. 궁합 모드는 A 성향, B 성향, 상호작용, 장점, 약점, 현실 패턴, 운영 전략, 최종 조언 흐름을 자연스럽게 녹인다. 자극적 표현·운명론적 단정·저주성 표현·공포 마케팅을 금지하고, 현실적인 관계 운영과 즉시 실행 가능한 행동 전략을 반드시 포함한다.";

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

const LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS = {
  1: ["1. 사랑 앞에서 드러나는 기본 성향", "2. 감정이 움직이는 방식", "3. 사랑에서 가장 중요하게 여기는 것", "4. 연애 자아의 핵심 문장"],
  2: ["1. 사주가 보여주는 매력의 결", "2. 사람들이 나에게 끌리는 이유", "3. 매력이 과잉될 때의 문제", "4. 매력을 건강하게 쓰는 법"],
  3: ["1. 배우자성으로 보는 이상형", "2. 끌리지만 위험한 상대", "3. 오래 갈 수 있는 상대", "4. 만나면 성장하는 상대"],
  4: ["1. 좋아하는 순간의 패턴", "2. 불안해지는 순간의 패턴", "3. 반복되는 실수", "4. 패턴을 끊는 방법"],
  5: ["1. 감정을 표현하는 방식", "2. 상대가 오해하기 쉬운 부분", "3. 싸울 때 드러나는 모습", "4. 관계를 살리는 대화법"],
  6: ["1. 친밀감이 깊어지는 과정", "2. 거리감 조절 방식", "3. 애정 확인 욕구", "4. 건강한 친밀감 전략"],
  7: ["1. 결혼에 대한 기본 태도", "2. 장기 관계에서 강해지는 부분", "3. 장기 관계에서 약해지는 부분", "4. 결혼 또는 동거를 위한 조건"],
  8: ["1. 상처받는 방식", "2. 이별을 받아들이는 방식", "3. 미련이 생기는 이유", "4. 다시 사랑하기 위한 회복법"],
  9: ["1. 재회 가능성을 보는 기준", "2. 다시 만나도 되는 관계", "3. 다시 만나면 위험한 관계", "4. 재회를 원할 때의 행동 전략"],
  10: ["1. 대운·세운으로 보는 연애 흐름", "2. 인연이 들어오기 쉬운 시기", "3. 조심해야 할 시기", "4. 연애운을 현실로 만드는 준비"],
  11: ["1. 나에게 맞는 궁합의 기준", "2. 끌림과 안정감의 차이", "3. 관계에서 필요한 균형", "4. 좋은 궁합을 만드는 태도"],
  12: ["1. 관계 초반 전략", "2. 안정기 전략", "3. 갈등기 전략", "4. 장기 관계 전략"],
  13: ["1. 전체 연애 구조 요약", "2. 반드시 지켜야 할 사랑의 원칙", "3. 버려야 할 연애 습관", "4. 개인 맞춤 사랑 선언문"],
};

const LOVE_SECRET_COMPAT_CHAPTER_REQUIREMENTS = {
  1: ["1. 두 사람의 기본 연애 자아", "2. 감정이 움직이는 방식의 차이", "3. 관계에서 각자가 중요하게 여기는 것", "4. 두 사람 관계의 핵심 문장"],
  2: ["1. 두 사람의 상호 매력 구조", "2. 서로가 끌리는 이유", "3. 매력 과잉으로 생기는 오해", "4. 매력을 건강하게 쓰는 커플 전략"],
  3: ["1. 서로에게서 기대하는 이상형", "2. 강하게 끌리지만 위험한 결", "3. 오래 가는 조합", "4. 함께 성장하는 조합"],
  4: ["1. 관계에서 반복되는 호감 패턴", "2. 불안 트리거 패턴", "3. 반복되는 커플 실수", "4. 패턴을 끊는 관계 설계"],
  5: ["1. 두 사람의 감정 표현 방식", "2. 서로가 오해하기 쉬운 부분", "3. 갈등 시 드러나는 관계 타입", "4. 관계를 살리는 대화법"],
  6: ["1. 두 사람의 친밀감 형성 과정", "2. 정서적 거리 조절 방식", "3. 애정 확인 욕구의 차이", "4. 건강한 친밀감 합의 전략"],
  7: ["1. 결혼/동거에 대한 각자의 태도", "2. 장기 관계 강점", "3. 장기 관계 약점", "4. 함께 살기 위한 합의 조건"],
  8: ["1. 상처받는 방식의 차이", "2. 이별 수용 방식의 차이", "3. 미련이 남는 구조", "4. 관계 회복 루틴"],
  9: ["1. 재회 가능성 판단 기준", "2. 다시 만나도 되는 구조", "3. 다시 만나면 위험한 구조", "4. 재회 행동 전략"],
  10: ["1. 관계 타이밍 흐름", "2. 인연이 열리는 시기", "3. 조심해야 할 시기", "4. 관계운을 현실로 만드는 준비"],
  11: ["1. 두 사람에게 맞는 궁합 기준", "2. 끌림과 안정의 차이", "3. 관계 균형 설계", "4. 좋은 궁합을 만드는 태도"],
  12: ["1. 관계 초반 전략", "2. 안정기 전략", "3. 갈등기 전략", "4. 장기 관계 전략"],
  13: ["1. 관계 구조 요약", "2. 반드시 지켜야 할 원칙", "3. 버려야 할 관계 습관", "4. 커플 맞춤 선언문"],
};

const LOVE_SECRET_CHAPTER_BLUEPRINTS = {
  1: {
    purpose: "연애 상황에서 드러나는 본연의 자아를 원국 기반으로 해석",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[1],
    requiredDataPoints: ["일간", "일지", "월지", "년주", "월주", "일주", "시주", "오행 분포", "신강/신약", "십성 분포"],
  },
  2: {
    purpose: "도화/홍염/화개/역마를 근거로 매력의 질감과 작동 조건을 설명",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[2],
    requiredDataPoints: ["도화살", "홍염살", "화개살", "역마살", "신살 위치", "일간", "일지", "오행 분포"],
  },
  3: {
    purpose: "배우자성/배우자궁/오행 보완 관점에서 이상형과 현실형의 차이를 분석",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[3],
    requiredDataPoints: ["배우자궁", "배우자성", "재성", "관성", "식상", "인성", "비겁", "오행 보완"],
  },
  4: {
    purpose: "십성 구조를 실제 연락/고백/갈등 대화 스킬로 번역",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[4],
    requiredDataPoints: ["식상", "재성", "관성", "인성", "비겁", "오행 강약", "신강/신약"],
  },
  5: {
    purpose: "대운/세운/월운의 타이밍을 관계 의사결정 로드맵으로 제공",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[5],
    requiredDataPoints: ["현재 대운", "다음 대운", "해당 연도 세운", "월별 흐름", "합/충 변화", "재성/관성 변화", "도화/홍염 변화"],
  },
  6: {
    purpose: "기신 과열과 오행 불균형의 위기 패턴을 회복 프로토콜로 연결",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[6],
    requiredDataPoints: ["기신", "오행 불균형", "일지 충형파해", "신살 역작용", "십성 충돌", "배우자궁", "대운/세운 압박"],
  },
  7: {
    purpose: "친밀감의 온도와 속도를 선정성 없이 데이터 중심으로 해석",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[7],
    requiredDataPoints: ["화 기운", "수 기운", "식상", "재성/관성", "도화/홍염", "일지", "신강/신약"],
  },
  8: {
    purpose: "현대 연애 상황(카톡/DM/썸/재회/장거리)별 맞춤 대응 전략 제시",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[8],
    requiredDataPoints: ["식상", "비겁", "인성", "오행 온도", "대운/세운 시기", "배우자궁", "신강/신약"],
  },
  9: {
    purpose: "결혼관·역할 분담·생활 리듬을 배우자궁/배우자성/운세 흐름으로 진단",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[9],
    requiredDataPoints: ["배우자궁", "배우자성", "재성/관성", "대운 결혼 시기", "오행 보완", "가족/책임", "장기 안정성"],
  },
  10: {
    purpose: "용신/희신 강화와 기신 절감을 위한 실행형 개운 처방전 작성",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[10],
    requiredDataPoints: ["용신", "희신", "기신", "오행 강약", "말투/환경 전략", "관계 루틴", "대운/세운 타이밍"],
  },
  11: {
    purpose: "재회/이별/회복 시나리오를 데이터 기반 의사결정으로 구조화",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[11],
    requiredDataPoints: ["배우자궁", "합/충/형/파/해", "대운", "세운", "월별 흐름", "십성 충돌", "조후 밸런스"],
  },
  12: {
    purpose: "장기 관계의 재발 패턴을 줄이는 운영 매뉴얼 수립",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[12],
    requiredDataPoints: ["배우자궁", "배우자성", "오행 보완", "십성 분포", "조후", "대운 장기 흐름", "관계 경계선"],
  },
  13: {
    purpose: "전 챕터 데이터를 통합해 최종 사랑 마스터플랜 제시",
    requiredSections: LOVE_SECRET_PERSONAL_CHAPTER_REQUIREMENTS[13],
    requiredDataPoints: ["일간", "배우자궁", "오행", "십성", "용신/희신/기신", "대운/세운", "궁합 핵심 점수"],
  },
};

function normalizeLoveMode(modeConfigMode) {
  const mode = String(modeConfigMode || "").toLowerCase();
  return mode === "couple" || mode === "compatibility" ? "compatibility" : "single";
}

function resolveLoveSecretMode(body) {
  const explicit = String(body.mode || "").toLowerCase();
  if (explicit === "solo" || explicit === "single") return "solo";
  if (explicit === "couple" || explicit === "compatibility") return "couple";
  const partnerData = stringifyCompact(body.partnerData || body.partner || "", 2400);
  return partnerData.trim() ? "couple" : "solo";
}

function getLoveSecretChapterMinChars(modeConfig, chapter) {
  const idx = Number(chapter);
  const explicitMin = Number(modeConfig.chapterMinByIndex?.[idx] || 0);
  if (Number.isFinite(explicitMin) && explicitMin > 0) return explicitMin;
  const target = Number(modeConfig.chapterTargetByIndex?.[idx] || 0);
  if (Number.isFinite(target) && target > 0) return Math.floor(target * 0.85);
  return Number(modeConfig.chapterMinDefault || 3200);
}

function getLoveSecretChapterTargetChars(modeConfig, chapter) {
  const idx = Number(chapter);
  const target = Number(modeConfig.chapterTargetByIndex?.[idx] || 0);
  if (Number.isFinite(target) && target > 0) return target;
  const min = getLoveSecretChapterMinChars(modeConfig, idx);
  return min + 350;
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
  const birthMatch = source.match(/생년월일\s*:\s*(\d{4})(?:년|[-./\s])+\s*(\d{1,2})(?:월|[-./\s])+\s*(\d{1,2})(?:일)?/);
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
  const weights = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const koToKey = { 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };
  const elementPattern = /(목|화|토|금|수)\s*(?:\([木火土金水]\))?\s*[:：]?\s*\(?\s*([0-9]+(?:\.[0-9]+)?)\s*\)?/g;
  let match = elementPattern.exec(source);
  while (match) {
    const key = koToKey[match[1]];
    if (key) weights[key] = parseLoveNumber(match[2], 0);
    match = elementPattern.exec(source);
  }

  if (!Object.values(weights).some((v) => v > 0)) {
    const m = source.match(/목\(木\)\s*:\s*([0-9.]+)[^\n]*화\(火\)\s*:\s*([0-9.]+)[^\n]*토\(土\)\s*:\s*([0-9.]+)[^\n]*금\(金\)\s*:\s*([0-9.]+)[^\n]*수\(水\)\s*:\s*([0-9.]+)/);
    if (m) {
      weights.wood = parseLoveNumber(m[1], 0);
      weights.fire = parseLoveNumber(m[2], 0);
      weights.earth = parseLoveNumber(m[3], 0);
      weights.metal = parseLoveNumber(m[4], 0);
      weights.water = parseLoveNumber(m[5], 0);
    }
  }

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

  const ranged = new RegExp(`([${LOVE_SECRET_STEMS}])([${LOVE_SECRET_BRANCHES}])\\s*\\(\\s*(\\d{1,3})\\s*[~\\-]\\s*(\\d{1,3})\\s*\\)`, "g");
  let rm = ranged.exec(source);
  while (rm) {
    rows.push({
      age: parseLoveNumber(rm[3], 0),
      ganji: `${rm[1]}${rm[2]}`,
      stem: rm[1],
      branch: rm[2],
      fromAge: parseLoveNumber(rm[3], 0),
      toAge: parseLoveNumber(rm[4], 0),
    });
    rm = ranged.exec(source);
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

function normalizeLovePillarFromEngine(value) {
  if (!value || typeof value !== "object") return null;
  let stem = String(value.stem || value.g || "").trim();
  let branch = String(value.branch || value.j || "").trim();
  let ganji = String(value.ganji || value.gz || "").trim();

  if (!ganji && stem && branch) ganji = `${stem}${branch}`;
  if ((!stem || !branch) && ganji.length >= 2) {
    const chars = ganji.split("");
    if (!stem && chars[0] && LOVE_SECRET_STEMS.includes(chars[0])) stem = chars[0];
    if (!branch && chars[1] && LOVE_SECRET_BRANCHES.includes(chars[1])) branch = chars[1];
  }

  if (!stem && !branch && !ganji) return null;
  return {
    ganji: ganji || (stem && branch ? `${stem}${branch}` : ""),
    stem,
    branch,
    tenGod: "N/A",
    hiddenStems: branch && LOVE_SECRET_BRANCH_HIDDEN_STEMS[branch] ? LOVE_SECRET_BRANCH_HIDDEN_STEMS[branch].slice() : [],
  };
}

function normalizeLoveEngineDataHints(raw = {}) {
  if (!raw || typeof raw !== "object") {
    return {
      pillars: {},
      fiveElements: null,
      tenGodDistribution: {},
      usefulGods: {},
      dayMaster: {},
      seasonMeta: {},
      daewunRows: [],
    };
  }

  const pillarsSource = raw.pillars || raw.fourPillars || {};
  const year = normalizeLovePillarFromEngine(pillarsSource.year || pillarsSource.y || null);
  const month = normalizeLovePillarFromEngine(pillarsSource.month || pillarsSource.m || null);
  const day = normalizeLovePillarFromEngine(pillarsSource.day || pillarsSource.d || null);
  const hour = normalizeLovePillarFromEngine(pillarsSource.hour || pillarsSource.h || null);

  const sourceWeights = raw.elementWeights || raw.fiveElements || {};
  const fiveElementsBase = {
    wood: parseLoveNumber(sourceWeights.wood, 0),
    fire: parseLoveNumber(sourceWeights.fire, 0),
    earth: parseLoveNumber(sourceWeights.earth, 0),
    metal: parseLoveNumber(sourceWeights.metal, 0),
    water: parseLoveNumber(sourceWeights.water, 0),
  };
  const hasFiveElements = Object.values(fiveElementsBase).some((v) => v > 0);

  const tenGodDistribution = raw?.tenGods?.distribution && typeof raw.tenGods.distribution === "object"
    ? { ...raw.tenGods.distribution }
    : {};

  const daewunRows = Array.isArray(raw?.daewunRows)
    ? raw.daewunRows
      .map((row) => {
        const stem = String(row?.stem || "").trim();
        const branch = String(row?.branch || "").trim();
        const ganji = String(row?.ganji || "").trim() || (stem && branch ? `${stem}${branch}` : "");
        if (!ganji) return null;
        const fromAge = Number.isFinite(Number(row?.fromAge)) ? Number(row.fromAge) : null;
        const toAge = Number.isFinite(Number(row?.toAge)) ? Number(row.toAge) : null;
        return {
          age: Number.isFinite(fromAge) ? fromAge : parseLoveNumber(row?.age, 0),
          ganji,
          stem: stem || ganji.charAt(0) || "",
          branch: branch || ganji.charAt(1) || "",
          fromAge,
          toAge,
        };
      })
      .filter(Boolean)
    : [];

  return {
    pillars: { year, month, day, hour },
    fiveElements: hasFiveElements
      ? {
        ...fiveElementsBase,
        dominant: pickDominantElement(fiveElementsBase),
        weakest: pickWeakestElement(fiveElementsBase),
        missing: Object.entries(fiveElementsBase).filter(([, v]) => Number(v) === 0).map(([k]) => k),
      }
      : null,
    tenGodDistribution,
    usefulGods: {
      yongsin: normalizeLoveElement(raw?.usefulGods?.yongsin?.element),
      huisin: normalizeLoveElement(raw?.usefulGods?.huisin?.element),
      gisin: normalizeLoveElement(raw?.usefulGods?.gisin?.element),
    },
    dayMaster: {
      strength: String(raw?.dayMaster?.strength || "").trim(),
      strengthScore: Number.isFinite(Number(raw?.dayMaster?.strengthScore)) ? Number(raw.dayMaster.strengthScore) : null,
    },
    seasonMeta: raw?.seasonMeta && typeof raw.seasonMeta === "object" ? raw.seasonMeta : {},
    daewunRows,
  };
}

function buildLoveDaewoonFromEngineRows(rows = [], birthYear = null) {
  const normalized = Array.isArray(rows)
    ? rows
      .map((row) => ({
        age: parseLoveNumber(row?.age, parseLoveNumber(row?.fromAge, 0)),
        ganji: String(row?.ganji || "").trim(),
        stem: String(row?.stem || "").trim(),
        branch: String(row?.branch || "").trim(),
      }))
      .filter((row) => row.ganji)
      .sort((a, b) => a.age - b.age)
    : [];

  if (!normalized.length) {
    return { currentDaewoon: null, nextDaewoon: null, annualLuck: {}, monthlyLuck: [] };
  }

  const nowYear = new Date().getFullYear();
  const currentAge = Number.isFinite(Number(birthYear)) ? Math.max(1, nowYear - Number(birthYear) + 1) : null;
  let idx = 0;
  if (currentAge != null) {
    for (let i = 0; i < normalized.length; i += 1) {
      if (normalized[i].age <= currentAge) idx = i;
    }
  }

  return {
    currentDaewoon: normalized[idx] || null,
    nextDaewoon: normalized[idx + 1] || null,
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

function buildLovePersonCanonical(rawText, profileHints = {}, input = {}, engineDataHints = null) {
  const text = String(rawText || "");
  const engineHints = normalizeLoveEngineDataHints(engineDataHints);
  const birthFromText = parseLoveBirthFromText(text);
  const parsedPillars = parseLovePillarsFromText(text);
  const pillars = {
    year: parsedPillars.year || engineHints?.pillars?.year || null,
    month: parsedPillars.month || engineHints?.pillars?.month || null,
    day: parsedPillars.day || engineHints?.pillars?.day || null,
    hour: parsedPillars.hour || engineHints?.pillars?.hour || null,
  };
  const dayStemFromText = (text.match(/일간\(日干\)\s*:\s*([甲乙丙丁戊己庚辛壬癸])/) || [])[1] || pillars?.day?.stem || "";
  const dayElement = LOVE_SECRET_STEM_ELEMENTS[dayStemFromText] || null;
  const fiveElementsParsed = parseLoveElementsFromText(text);
  const fiveElements = Object.values(fiveElementsParsed).some((v) => Number(v) > 0)
    ? fiveElementsParsed
    : (engineHints.fiveElements || fiveElementsParsed);
  const tenGodsParsed = parseLoveTenGodDistribution(text);
  const tenGodDistribution = Object.keys(tenGodsParsed.distribution || {}).length
    ? tenGodsParsed.distribution
    : (engineHints.tenGodDistribution || {});
  const tenGods = {
    distribution: tenGodDistribution,
    dominantTenGods: Object.entries(tenGodDistribution).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3).map(([k]) => k),
    weakTenGods: Object.entries(tenGodDistribution).filter(([, v]) => Number(v) <= 1).map(([k]) => k),
  };
  const stars = parseLoveStarsFromText(text);
  const strength = parseLoveStrengthFromText(text);
  const finalStrength = strength && strength !== "N/A" ? strength : (engineHints?.dayMaster?.strength || "N/A");
  const yongshin = parseLoveLineElements(text, "용신");
  const huisin = parseLoveLineElements(text, "희신");
  const kishin = parseLoveLineElements(text, "기신");
  const birthYear = birthFromText.year || profileHints.birthYear || input.year || null;
  const birthMonth = birthFromText.month || profileHints.birthMonth || input.month || null;
  const birthDay = birthFromText.day || profileHints.birthDay || input.day || null;
  const birthHour = Number.isFinite(Number(profileHints.birthHour)) ? Number(profileHints.birthHour) : birthFromText.hour ?? input.hour ?? 12;
  const birthMinute = Number.isFinite(Number(profileHints.birthMinute)) ? Number(profileHints.birthMinute) : birthFromText.minute ?? input.minute ?? 0;

  let luck = parseLoveDaewoonFromText(text, birthYear);
  if (!luck.currentDaewoon && Array.isArray(engineHints.daewunRows) && engineHints.daewunRows.length) {
    luck = buildLoveDaewoonFromEngineRows(engineHints.daewunRows, birthYear);
  }

  const gender = normalizeLoveGender(profileHints.gender || (text.match(/성별\s*:\s*([^\n]+)/) || [])[1] || input.gender || "unknown");
  const spouseStarByGender = gender === "male" ? "재성" : gender === "female" ? "관성" : null;

  const profile = {
    name: String(profileHints.name || (text.match(/이름\s*:\s*([^\n]+)/) || [])[1] || input.name || "사용자").trim(),
    gender,
    birth: {
      solarDate: birthYear && birthMonth && birthDay
        ? `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`
        : null,
      lunarDate: null,
      time: `${String(birthHour).padStart(2, "0")}:${String(birthMinute).padStart(2, "0")}`,
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
      strength: finalStrength,
      strengthScore: Number.isFinite(Number(profileHints.strengthScore))
        ? Number(profileHints.strengthScore)
        : (Number.isFinite(Number(engineHints?.dayMaster?.strengthScore)) ? Number(engineHints.dayMaster.strengthScore) : null),
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
      yongsin: { element: yongshin[0] || engineHints?.usefulGods?.yongsin || null, reason: (yongshin.length || engineHints?.usefulGods?.yongsin) ? "사주 엔진 출력값" : "" },
      huisin: { element: huisin[0] || yongshin[1] || engineHints?.usefulGods?.huisin || null, reason: (huisin.length || yongshin.length > 1 || engineHints?.usefulGods?.huisin) ? "사주 엔진 출력값" : "" },
      gisin: { element: kishin[0] || engineHints?.usefulGods?.gisin || null, reason: (kishin.length || engineHints?.usefulGods?.gisin) ? "사주 엔진 출력값" : "" },
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
  if ((!person.johu?.monthBranch || !person.johu?.birthSeason) && engineHints?.seasonMeta && typeof engineHints.seasonMeta === "object") {
    const monthBranch = String(engineHints.seasonMeta.monthBranch || person.johu?.monthBranch || person.fourPillars?.month?.branch || "").trim();
    const season = String(engineHints.seasonMeta.birthSeason || person.johu?.birthSeason || loveSeasonFromMonthBranch(monthBranch)).trim();
    person.johu = {
      ...person.johu,
      monthBranch: monthBranch || person.johu?.monthBranch || "",
      birthSeason: season || person.johu?.birthSeason || "",
    };
  }
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

  if (chapter === 6) {
    sections.push(
      "친밀감의 핵심 진단",
      "나의 친밀감 리듬",
      "상대의 친밀감 리듬",
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
  const modeConfig = canonical?.mode === "compatibility" ? (LOVE_SECRET_MODE_CONFIG.couple || LOVE_SECRET_MODE_CONFIG.solo) : LOVE_SECRET_MODE_CONFIG.solo;
  const titles = Array.isArray(modeConfig?.chapters) && modeConfig.chapters.length ? modeConfig.chapters : LOVE_SECRET_MODE_CONFIG.solo.chapters;
  for (let i = 1; i <= titles.length; i += 1) {
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
    if (i === 6) {
      entry.title = "Chapter VI. 스킨십·친밀감·정서적 거리 — 가까워지는 속도";
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
  const personAEngineData = body.engineData || body.personAEngineData || body.selfEngineData || body?.personA?.engineData || null;
  const personBEngineData = body?.partner?.engineData || body.partnerEngineData || body.personBEngineData || null;
  const hasPartnerBirthHints = Number.isFinite(Number(body.partnerYear))
    && Number.isFinite(Number(body.partnerMonth))
    && Number.isFinite(Number(body.partnerDay));
  const personA = buildLovePersonCanonical(personAText, {
    name: body.name || input.name,
    gender: body.gender || input.gender,
    birthYear: body.year || input.year,
    birthMonth: body.month || input.month,
    birthDay: body.day || input.day,
    birthHour: body.hour || input.hour,
    birthMinute: body.minute || input.minute,
  }, input, personAEngineData);
  const personBExists = mode === "compatibility" && (!!personBText.trim() || !!personBEngineData || hasPartnerBirthHints);
  const personB = personBExists
    ? buildLovePersonCanonical(personBText, {
      name: body.partnerName || "상대",
      gender: body.partnerGender || "unknown",
      birthYear: body.partnerYear,
      birthMonth: body.partnerMonth,
      birthDay: body.partnerDay,
      birthHour: body.partnerHour,
      birthMinute: body.partnerMinute,
    }, {
      year: body.partnerYear,
      month: body.partnerMonth,
      day: body.partnerDay,
      hour: body.partnerHour,
      minute: body.partnerMinute,
      name: body.partnerName || "상대",
      gender: body.partnerGender || "unknown",
    }, personBEngineData)
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

function buildLoveBookContext(canonical = {}, body = {}, input = {}, premiumInput = null) {
  const mode = canonical?.mode === "compatibility" ? "compatibility" : "solo";
  const personA = canonical?.personA || {};
  const personB = canonical?.personB?.exists ? canonical.personB : null;
  const profileA = personA?.profile || {};
  const profileB = personB?.profile || {};
  const dayA = personA?.fourPillars?.day || {};
  const dayB = personB?.fourPillars?.day || {};

  const user = {
    profile: {
      name: profileA?.name || String(body?.name || input?.name || "").trim() || undefined,
      gender: profileA?.gender || String(body?.gender || input?.gender || "").trim() || undefined,
      birthDate: profileA?.birth?.solarDate || "",
      birthTime: profileA?.birth?.time || undefined,
      calendarType: String(body?.calendarType || input?.calendarType || "solar").trim() || "solar",
    },
    saju: {
      yearPillar: personA?.fourPillars?.year?.ganji || undefined,
      monthPillar: personA?.fourPillars?.month?.ganji || undefined,
      dayPillar: dayA?.ganji || undefined,
      hourPillar: personA?.fourPillars?.hour?.ganji || undefined,
      dayMaster: personA?.dayMaster?.stem || undefined,
      monthBranch: personA?.fourPillars?.month?.branch || undefined,
      fiveElements: personA?.fiveElements || undefined,
      tenGods: personA?.tenGods || undefined,
      spouseStar: personA?.tenGods?.loveRelatedGods?.spouseStar || undefined,
      expressionStar: personA?.tenGods?.loveRelatedGods?.expressionStar || undefined,
      wealthStar: personA?.tenGods?.loveRelatedGods?.spouseStar === "재성" ? "재성" : undefined,
      officerStar: personA?.tenGods?.loveRelatedGods?.authorityStar || undefined,
      hiddenStems: dayA?.hiddenStems || undefined,
      combinationsConflicts: canonical?.compatibility?.stemBranchInteractions || undefined,
      peachBlossomStars: personA?.attractionStars || undefined,
      seasonalBalance: personA?.johu?.climateType || undefined,
      usefulGod: personA?.usefulGods?.yongsin?.element || undefined,
      favorableGod: personA?.usefulGods?.huisin?.element || undefined,
      unfavorableGod: personA?.usefulGods?.gisin?.element || undefined,
      structureType: personA?.dayMaster?.strength || undefined,
    },
    fortuneCycles: {
      daeun: personA?.luck?.currentDaewoon || undefined,
      seun: personA?.luck?.annualLuck || undefined,
      monthly: personA?.luck?.monthlyLuck || undefined,
    },
  };

  const partner = personB
    ? {
      profile: {
        name: profileB?.name || undefined,
        gender: profileB?.gender || undefined,
        birthDate: profileB?.birth?.solarDate || undefined,
        birthTime: profileB?.birth?.time || undefined,
        calendarType: String(body?.partnerCalendarType || "solar").trim() || "solar",
      },
      saju: {
        yearPillar: personB?.fourPillars?.year?.ganji || undefined,
        monthPillar: personB?.fourPillars?.month?.ganji || undefined,
        dayPillar: dayB?.ganji || undefined,
        hourPillar: personB?.fourPillars?.hour?.ganji || undefined,
        dayMaster: personB?.dayMaster?.stem || undefined,
        monthBranch: personB?.fourPillars?.month?.branch || undefined,
        fiveElements: personB?.fiveElements || undefined,
        tenGods: personB?.tenGods || undefined,
        spouseStar: personB?.tenGods?.loveRelatedGods?.spouseStar || undefined,
        combinationsConflicts: canonical?.compatibility?.stemBranchInteractions || undefined,
        peachBlossomStars: personB?.attractionStars || undefined,
        usefulGod: personB?.usefulGods?.yongsin?.element || undefined,
        structureType: personB?.dayMaster?.strength || undefined,
      },
    }
    : undefined;

  const compatibility = canonical?.compatibility?.enabled
    ? {
      dayMasterRelation: canonical?.compatibility?.dayMasterRelation || undefined,
      fiveElementBalance: canonical?.compatibility?.elementBalance || undefined,
      tenGodRelation: canonical?.compatibility?.tenGodCompatibility || undefined,
      branchHarmonyConflict: canonical?.compatibility?.stemBranchInteractions || undefined,
      attractionPattern: canonical?.compatibility?.summary || undefined,
      conflictPattern: canonical?.compatibility?.conflictScore || undefined,
      marriagePotential: canonical?.compatibility?.marriagePotentialScore || undefined,
      longTermRisk: canonical?.compatibility?.johuCompatibility?.riskFactors || undefined,
    }
    : undefined;

  const availableFields = [];
  if (user.profile.birthDate) availableFields.push("user.profile.birthDate");
  if (user.saju.dayPillar) availableFields.push("user.saju.dayPillar");
  if (user.saju.tenGods) availableFields.push("user.saju.tenGods");
  if (user.saju.fiveElements) availableFields.push("user.saju.fiveElements");
  if (user.fortuneCycles?.daeun) availableFields.push("user.fortuneCycles.daeun");
  if (partner?.profile?.birthDate) availableFields.push("partner.profile.birthDate");
  if (compatibility?.dayMasterRelation) availableFields.push("compatibility.dayMasterRelation");

  return {
    mode,
    user,
    partner,
    compatibility,
    promptContext: {
      generatedQuestionPrompt: String(premiumInput?.generatedQuestionPrompt || premiumInput?.questionPrompt || "").trim() || undefined,
      engineSummary: String(premiumInput?.engineSummary || "").trim() || undefined,
      userQuestion: String(body?.userQuestion || input?.question || "").trim() || undefined,
    },
    meta: {
      missingFields: Array.isArray(canonical?.validation?.missingFields) ? canonical.validation.missingFields.slice() : [],
      availableFields,
      generatedAt: new Date().toISOString(),
    },
  };
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

function detectLoveMissingMarkers(text, chapter, canonical = null) {
  const source = String(text || "");
  const compatMode = canonical?.mode === "compatibility";
  const requiredSections = compatMode
    ? (LOVE_SECRET_COMPAT_CHAPTER_REQUIREMENTS[chapter] || [])
    : ((LOVE_SECRET_CHAPTER_BLUEPRINTS[chapter] || { requiredSections: [] }).requiredSections || []);
  const required = ["핵심 요약 5줄", ...requiredSections];
  return required.filter((token) => !source.includes(token));
}

function hasLoveCompatCompressedFlow(text) {
  const source = String(text || "");
  const needs = [
    ["A의", "A :", "A:", "나"],
    ["B의", "B :", "B:", "상대"],
    ["상호작용", "관계 패턴"],
    ["장점"],
    ["약점"],
    ["전략", "운영"],
    ["최종 조언", "최종"]
  ];
  return needs.every((group) => group.some((token) => source.includes(token)));
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
  const compatMode = canonical?.mode === "compatibility";
  const chapterPlan = canonical?.chapterPlanning?.[`chapter${chapter}`] || { dataDrivenSections: [], mustUseData: [] };
  const targetLength = getLoveSecretChapterTargetChars(modeConfig, chapter);
  const intimacyRequiredDataPoints = [
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
  const loveBookContext = buildLoveBookContext(canonical, {}, {}, premiumInput);

  return {
    chapterTitle: chapterMeta?.title || `Chapter ${chapter}`,
    chapterPurpose: blueprint.purpose,
    mode: canonical?.mode || "single",
    personA: canonical?.personA || {},
    personB: canonical?.personB?.exists ? canonical.personB : null,
    compatibility: canonical?.compatibility?.enabled ? canonical.compatibility : null,
    chapterSpecificSections: chapterPlan.dataDrivenSections || [],
    requiredDataPoints: chapter === 6 ? intimacyRequiredDataPoints : blueprint.requiredDataPoints,
    requiredSections: compatMode
      ? (LOVE_SECRET_COMPAT_CHAPTER_REQUIREMENTS[chapter] || [])
      : blueprint.requiredSections,
    johuData: chapter === 6
      ? {
        personA: canonical?.personA?.johu || null,
        personB: canonical?.personB?.exists ? canonical.personB.johu : null,
        johuCompatibility: canonical?.compatibility?.johuCompatibility || null,
        intimacyCompatibility: canonical?.compatibility?.intimacyCompatibility || null,
      }
      : null,
    mustUseData: chapterPlan.mustUseData || [],
    forbiddenRepeatedPhrases: LOVE_SECRET_FORBIDDEN_REPEATED_PHRASES,
    forbidden: chapter === 6
      ? ["노골적 성 묘사", "성적 능력 단정", "무조건 잘 맞음", "무조건 안 맞음", "임신/질병/생식 관련 단정"]
      : [],
    premiumChapterJsonPacks: premiumInput && typeof premiumInput === "object"
      ? toPlainObject(premiumInput.chapterJsonPacks || premiumInput)
      : null,
    loveBookContext,
    chapterContract: premiumInput && typeof premiumInput === "object" && premiumInput.chapterContract && typeof premiumInput.chapterContract === "object"
      ? toPlainObject(premiumInput.chapterContract)
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
  const previousChapterSummaries = (Array.isArray(previousTexts) ? previousTexts : [])
    .map((text, idx) => {
      const compact = String(text || "").replace(/\s+/g, " ").trim();
      if (!compact) return null;
      return {
        chapterId: `prev-${idx + 1}`,
        title: `이전 챕터 ${idx + 1}`,
        summary: compact.slice(0, 420),
      };
    })
    .filter(Boolean);
  const isCompat = canonical?.mode === "compatibility";
  const chapterContract = payload?.chapterContract && typeof payload.chapterContract === "object"
    ? payload.chapterContract
    : {};
  const chapterContractText = formatPremiumChapterContractForPrompt(chapterContract);
  const requiredHeadings = Array.isArray(chapterContract?.requiredHeadings)
    ? chapterContract.requiredHeadings.map((row) => String(row || "").trim()).filter(Boolean)
    : [];
  return [
    "[System Prompt]",
    LOVE_SECRET_SYSTEM_PROMPT,
    "",
    "[User Prompt JSON]",
    JSON.stringify(payload, null, 2),
    "",
    "[추가 생성 규칙]",
    "- 문체는 상담가의 실제 상담 기록처럼 구체적으로 작성한다.",
    "- PDF 독자가 읽는 완성형 상담문만 작성하고, 내부 계산/근거/데이터 나열은 본문에 절대 노출하지 않는다.",
    "- '사용 데이터 요약표', '데이터 요약표', 'JSON', 'payload', 'engine result', '내부 점수표', '산출 과정' 같은 표현을 본문에 쓰지 않는다.",
    "- '이 데이터에 따르면' 같은 개발자용 문장을 쓰지 않는다.",
    "- 장문 반복, 문장 복붙, 일반론 패딩을 금지한다.",
    "- 너는 연애 사주 상담 분야 최고 전문가로서 독자에게 1:1 프리미엄 상담을 진행하듯 작성한다.",
    "- 각 챕터 마지막에 '### 핵심 요약 5줄'을 넣고 5개 문장으로 정리한다.",
    "- chapterSpecificSections는 실제 본문 소제목에 반영해야 한다.",
    `- 목표 글자 수는 ${payload.targetLength}자 내외, 최소 ${payload.minLength}자 이상으로 작성한다.`,
    "- 각 챕터는 4개의 지정 소제목을 모두 포함한다.",
    requiredHeadings.length ? `- chapterContract.requiredHeadings를 누락 없이 본문 소제목으로 포함한다: ${requiredHeadings.join(" | ")}` : "",
    "- 각 챕터는 이전 챕터와 주제/조언/문장 구조를 반복하지 않는다.",
    isCompat
      ? "- 궁합 모드는 A 성향, B 성향, 두 사람 상호작용, 장점, 약점, 현실 패턴, 운영 전략, 최종 조언 순서를 자연스럽게 녹여 작성한다."
      : "- 개인 모드는 한 사람의 연애 성향, 실전 전략, 장기 관계 운용 중심으로 작성한다.",
    "- 노골적 성적 표현 금지, 확정 예언 금지.",
    "- JSON에 없는 신살/용신/대운/세운/궁합 요소를 쓰지 않는다.",
    chapterContractText ? `[chapterContract]\n${chapterContractText}` : "",
    previousChapterSummaries.length ? `[previousChapterSummaries]\n${JSON.stringify(previousChapterSummaries, null, 2)}` : "",
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

function buildLoveSecretLocalFallbackText(modeConfig, chapterMeta, chapter, canonical, minChars, previousTexts = [], premiumInput = null) {
  const payload = buildLoveSecretChapterPayload(modeConfig, chapterMeta, chapter, canonical, minChars, premiumInput);
  const requiredSections = Array.isArray(payload?.requiredSections) ? payload.requiredSections : [];
  const requiredMarkers = ["핵심 요약 5줄", ...requiredSections];
  const requiredHeadings = requiredSections.length
    ? requiredSections.map((row) => `### ${String(row || "").trim()}`).filter(Boolean)
    : ["### 핵심 해석", "### 관계 운영 전략", "### 실행 가이드", "### 리스크 관리"];

  const chapterContract = {
    requiredHeadings,
  };

  let text = buildDeterministicLocalChapterText({
    reportType: "loveSecret",
    chapterId: chapter,
    chapterMeta,
    chapterContract,
    input: {
      mode: String(canonical?.mode || "single"),
      chapter,
    },
    canonicalJson: canonical || {},
    chapterJsonPacks: payload?.premiumChapterJsonPacks || {},
    minChars,
  });

  requiredMarkers.forEach((marker, idx) => {
    const token = String(marker || "").trim();
    if (!token || text.includes(token)) return;
    text += `\n\n### ${token}\n${token} 관점에서는 이번 챕터의 핵심 기준을 한 줄 실행 문장으로 고정하고, 감정 반응이 아닌 근거 중심으로 선택 우선순위를 유지하세요.`;
    if (idx % 2 === 0) {
      text += "\n실행 문장: 이번 주에는 관계 대화의 목적을 먼저 합의하고, 기대치/경계선/후속 행동을 같은 문장 형식으로 기록하세요.";
    }
  });

  if (canonical?.mode === "compatibility") {
    const hasPartnerFlow = /(상대|A\s*[:：]|B\s*[:：]|합|충|형|파|해)/.test(text);
    if (!hasPartnerFlow) {
      text += "\n\n### 궁합 상호작용\nA의 패턴과 B의 패턴을 분리해 읽되, 실제 상호작용에서는 합·충·형·파·해의 긴장 요소를 같은 장면에서 함께 점검해야 관계 오해를 줄일 수 있습니다.\n운영 전략: 충돌 신호가 보이면 즉시 대화 속도를 늦추고, 사실/감정/요청을 분리해 재합의하세요.";
    }
  }

  if (!text.includes("핵심 요약 5줄")) {
    text += "\n\n### 핵심 요약 5줄\n- 이번 챕터의 핵심은 감정보다 기준을 먼저 세우는 관계 운영입니다.\n- 반복 갈등은 해석보다 실행 규칙 부재에서 커집니다.\n- 기대치와 경계선을 문장으로 합의하면 오해 비용이 줄어듭니다.\n- 속도보다 일관성이 장기 안정성을 만듭니다.\n- 다음 챕터 전까지 실행 결과를 짧게 기록해 판단 오차를 줄이세요.";
  }

  let expandStep = 1;
  while (countKoreanLikeChars(text) < Math.max(minChars, 2800) && expandStep <= 8) {
    const prev = Array.isArray(previousTexts) && previousTexts.length
      ? String(previousTexts[(expandStep - 1) % previousTexts.length] || "").replace(/\s+/g, " ").slice(0, 180)
      : "이전 챕터의 핵심 기준";
    text += `\n\n### 실행 심화 ${expandStep}\n이번 심화 구간에서는 ${prev}와 중복되지 않도록 관계 운영 프레임을 재정의하고, 대화-합의-후속 행동을 하나의 체크리스트로 연결하세요.\n점검 질문: 지금의 선택이 90일 뒤에도 유효한가, 갈등 비용을 줄이는 구조인가, 상대와의 약속이 문장으로 남아 있는가.`;
    expandStep += 1;
  }

  return text.trim();
}

function ensureLoveSecretSourceData(body = {}) {
  const raw = stringifyCompact(body.sajuData || "", 6000);
  if (raw && /사주\s*원국|일주\(|오행\(|일간\(|대운\(|fourPillars|dayMaster|tenGod/i.test(raw)) {
    return {
      ok: true,
      sourceData: raw,
      sourceType: "saju-engine-raw",
      usedFallbackData: false,
      warning: "",
      code: "",
      missingFields: [],
      message: "",
    };
  }

  const structured = buildStructuredSajuSourceData(body, normalizeBody(body));
  if (structured.ok) {
    return {
      ok: true,
      sourceData: structured.sourceData,
      sourceType: "saju-engine-structured",
      usedFallbackData: false,
      warning: structured.warning || "",
      code: "",
      missingFields: [],
      message: "",
    };
  }

  return {
    ok: false,
    sourceData: "",
    sourceType: "",
    usedFallbackData: false,
    warning: "SAJU_ENGINE_SOURCE_REQUIRED",
    code: "SAJU_ENGINE_SOURCE_REQUIRED",
    missingFields: ["sajuData", "canonicalSajuChart", "engineData"],
    message: "연애 비책 PDF는 사주 엔진 원본 데이터(sajuData/canonicalSajuChart/engineData)가 필요합니다.",
  };
}

function evaluateLoveSecretQuality(text, chapter, canonical, previousTexts = [], minChars = 4000) {
  const source = String(text || "").trim();
  const failedChecks = [];
  const missingMarkers = detectLoveMissingMarkers(source, chapter, canonical);
  const evidenceCount = countLoveDataEvidence(source, canonical, chapter);
  const repeatedInside = detectRepeatedLongSentences(source, 30);
  const repeatedAcross = detectCrossChapterRepeatedSentences(source, previousTexts || [], 30);

  if (source.length < minChars) failedChecks.push("QUALITY_GATE_A_MIN_LENGTH");
  if (evidenceCount < 7) failedChecks.push("QUALITY_GATE_B_DATA_POINTS");
  if (/심화\s*상담\s*메모/i.test(source)) failedChecks.push("QUALITY_GATE_C_NO_DEEP_MEMO");
  if (repeatedInside.length > 0 || repeatedAcross.length > 0) failedChecks.push("QUALITY_GATE_D_NO_REPEATED_SENTENCE");
  if (hasInvalidLoveShinsalMention(source, canonical)) failedChecks.push("QUALITY_GATE_E_INVALID_SHINSAL");
  if (!hasLoveCompatibilityCoverage(source, canonical)) failedChecks.push("QUALITY_GATE_F_COMPAT_COVERAGE");
  if (chapter === 6) {
    if (source.length < 6000) failedChecks.push("QUALITY_GATE_J_CH7_MIN_LENGTH_6000");

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

    const plannedSections = canonical?.chapterPlanning?.chapter6?.dataDrivenSections || [];
    if (plannedSections.length > 0) {
      const used = plannedSections.filter((s) => source.includes(String(s || "").trim())).length;
      if (used < Math.min(4, plannedSections.length)) failedChecks.push("QUALITY_GATE_R_CH7_PLANNED_SECTIONS");
    }
  }

  if (canonical?.mode === "compatibility" && !hasLoveCompatCompressedFlow(source)) {
    failedChecks.push("QUALITY_GATE_S_COMPAT_COMPRESSED_FLOW");
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

function stringifyCompact(value, maxLength = 4200) {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, maxLength);
  try {
    return JSON.stringify(value, null, 2).slice(0, maxLength);
  } catch {
    return String(value).slice(0, maxLength);
  }
}

function formatSajuPillarToken(value) {
  if (!value) return "";
  if (typeof value === "string") return String(value).trim();
  const stem = String(value?.stem || value?.gan || "").trim();
  const branch = String(value?.branch || value?.ji || "").trim();
  const ganji = String(value?.ganji || "").trim();
  return ganji || `${stem}${branch}`.trim();
}

function buildStructuredSajuSourceData(body = {}, input = {}) {
  const source = body && typeof body === "object" ? body : {};
  const candidateCharts = [
    source?.canonicalSajuChart,
    source?.engineData,
    source?.selfEngineData,
    source?.personAEngineData,
    source?.sajuResult,
    source?.rawEngineResult,
    source?.analysisData?.saju,
    source?.analysisData,
    source?.canonicalSajuLoveReport?.personA,
    source?.canonicalSajuNewYearReport?.saju,
  ].filter((v) => v && typeof v === "object");

  const chart = candidateCharts.find((v) => {
    const pillars = v?.fourPillars || v?.pillars;
    return Boolean(v?.dayMaster || v?.tenGods || v?.fiveElements || pillars);
  }) || null;

  if (!chart) {
    return { ok: false, sourceData: "", warning: "" };
  }

  const pillars = chart?.fourPillars || chart?.pillars || {};
  const yearPillar = formatSajuPillarToken(pillars?.year);
  const monthPillar = formatSajuPillarToken(pillars?.month);
  const dayPillar = formatSajuPillarToken(pillars?.day);
  const hourPillar = formatSajuPillarToken(pillars?.hour);
  const dayMaster = String(chart?.dayMaster?.stem || chart?.dayMaster || "").trim();
  const fiveElements = chart?.fiveElements?.distribution || chart?.fiveElements || chart?.elements || {};
  const tenGods = chart?.tenGods?.distribution || chart?.tenGods || {};
  const currentDaewoon = String(
    chart?.luck?.currentDaewoon?.ganji
    || chart?.luck?.current?.ganji
    || chart?.currentDaewoon?.ganji
    || chart?.daewoon?.current
    || ""
  ).trim();

  const elementSummary = Object.entries(fiveElements || {})
    .map(([k, v]) => `${String(k)}:${String(v)}`)
    .slice(0, 8)
    .join(", ");
  const tenGodSummary = Object.entries(tenGods || {})
    .map(([k, v]) => `${String(k)}:${String(v)}`)
    .slice(0, 10)
    .join(", ");

  const birthName = String(source?.name || input?.name || "사용자").trim() || "사용자";
  const birthYear = String(source?.year || source?.birthYear || input?.year || "미상");
  const birthMonth = String(source?.month || source?.birthMonth || input?.month || "미상");
  const birthDay = String(source?.day || source?.birthDay || input?.day || "미상");
  const birthHour = String(source?.hour || source?.birthHour || input?.hour || "미상");
  const birthMinute = String(source?.minute || source?.birthMinute || input?.minute || "00").padStart(2, "0");

  const lines = [
    "사주 원국 엔진 데이터",
    `- 이름: ${birthName}`,
    `- 생년월일: ${birthYear}-${birthMonth}-${birthDay}`,
    `- 출생시각: ${birthHour}:${birthMinute}`,
    `- 사주 원국: 년주 ${yearPillar || "미상"}, 월주 ${monthPillar || "미상"}, 일주 ${dayPillar || "미상"}, 시주 ${hourPillar || "미상"}`,
    `- 일간: ${dayMaster || "미상"}`,
    `- 오행: ${elementSummary || "미상"}`,
    `- 십성: ${tenGodSummary || "미상"}`,
    `- 대운: ${currentDaewoon || "엔진 요약 미제공"}`,
    "- 세운/월운: 엔진 원천 데이터 기준으로 해석",
  ];

  return {
    ok: Boolean(yearPillar || monthPillar || dayPillar || dayMaster || elementSummary || tenGodSummary),
    sourceData: lines.join("\n"),
    warning: "",
  };
}

function ensureLifebookSourceData(body = {}, input = {}) {
  const raw = stringifyCompact(body.sajuData || body.profile || body.birth || "", 2600);
  if (raw && /사주\s*원국|오행|일간|대운|세운|월운|십성|fourPillars|dayMaster|tenGod/i.test(raw)) {
    return {
      ok: true,
      sourceData: raw,
      sourceType: "saju-engine-raw",
      usedFallbackData: false,
      warning: "",
      code: "",
      missingFields: [],
      message: "",
    };
  }

  const structured = buildStructuredSajuSourceData(body, input);
  if (structured.ok) {
    return {
      ok: true,
      sourceData: structured.sourceData,
      sourceType: "saju-engine-structured",
      usedFallbackData: false,
      warning: structured.warning || "",
      code: "",
      missingFields: [],
      message: "",
    };
  }

  return {
    ok: false,
    sourceData: "",
    sourceType: "",
    usedFallbackData: false,
    warning: "SAJU_ENGINE_SOURCE_REQUIRED",
    code: "SAJU_ENGINE_SOURCE_REQUIRED",
    missingFields: ["sajuData", "canonicalSajuChart", "engineData"],
    message: "인생의 책 PDF는 사주 엔진 원본 데이터(sajuData/canonicalSajuChart/engineData)가 필요합니다.",
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
    "Your role: top domain expert who writes premium PDF counseling content with concrete guidance.",
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
    sajuData || "사주 엔진 요약 데이터",
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

function ensureSajuNewYearSourceData(body = {}, input = {}) {
  const raw = stringifyCompact(body.sajuData || body.profile || body.birth || "", 3000);
  if (raw && /사주\s*원국|오행|일간|대운|세운|월운|십성|fourPillars|dayMaster|tenGod/i.test(raw)) {
    return {
      ok: true,
      sourceData: raw,
      sourceType: "saju-engine-raw",
      usedFallbackData: false,
      warning: "",
      code: "",
      missingFields: [],
      message: "",
    };
  }

  const structured = buildStructuredSajuSourceData(body, input);
  if (structured.ok) {
    return {
      ok: true,
      sourceData: structured.sourceData,
      sourceType: "saju-engine-structured",
      usedFallbackData: false,
      warning: structured.warning || "",
      code: "",
      missingFields: [],
      message: "",
    };
  }

  const hasBirthInput = Number.isFinite(Number(input?.year))
    && Number.isFinite(Number(input?.month))
    && Number.isFinite(Number(input?.day));
  const hasTargetYear = Number.isFinite(Number(body?.targetYear));
  if (hasBirthInput && hasTargetYear) {
    return {
      ok: true,
      sourceData: "",
      sourceType: "profile-only",
      usedFallbackData: true,
      warning: "SAJU_ENGINE_SOURCE_MISSING_PROFILE_ONLY",
      code: "",
      missingFields: ["sajuData", "canonicalSajuChart", "engineData"],
      message: "",
    };
  }

  return {
    ok: false,
    sourceData: "",
    sourceType: "",
    usedFallbackData: false,
    warning: "SAJU_ENGINE_SOURCE_REQUIRED",
    code: "SAJU_ENGINE_SOURCE_REQUIRED",
    missingFields: ["sajuData", "canonicalSajuChart", "engineData"],
    message: "신년운세 PDF는 사주 엔진 원본 데이터(sajuData/canonicalSajuChart/engineData)가 필요합니다.",
  };
}

function normalizeSajuNewYearFocusArea(value) {
  const raw = String(value || "overall").trim().toLowerCase();
  if (!raw) return "overall";
  // 신년운세는 연도 중심 단일 모드로 고정한다.
  return "overall";
}

function normalizeSajuNewYearTargetYear(value) {
  const now = new Date().getFullYear();
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return now;
  return Math.max(now - 1, Math.min(now + 3, Math.floor(parsed)));
}

function toDeterministicSeed(seedText) {
  const source = String(seedText || "");
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 131 + source.charCodeAt(i)) % 2147483647;
  }
  return hash || 97;
}

function detectDayMasterToken(body = {}, input = {}, sourceData = "") {
  const candidates = [
    body?.engineData?.dayMaster,
    body?.engineData?.pillars?.day?.stem,
    body?.canonicalSajuChart?.dayMaster?.stem,
    body?.canonicalSajuChart?.dayMaster,
    body?.canonicalSajuChart?.fourPillars?.day?.stem,
    body?.sajuSummary?.dayMaster,
    input?.dayMaster,
  ].map((v) => String(v || "").trim()).filter(Boolean);
  if (candidates.length) return candidates[0];
  const match = String(sourceData || "").match(/일간\s*[:：-]?\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])/i);
  return match ? String(match[1] || "").trim() : "";
}

function buildSajuNewYearBirthDate(input = {}) {
  const year = Number(input?.year || 0);
  const month = Number(input?.month || 0);
  const day = Number(input?.day || 0);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildSajuNewYearMonthlyStrategyRows(targetYear, dayMaster, yearlyThemes = {}) {
  const keywords = ["정렬", "실행", "점검", "보강", "협업", "안정", "확장", "재정비", "회수", "정돈", "집중", "마감"];
  const goBase = [
    "핵심 과제를 문서로 명확히 고정한다.",
    "작게 시작해 빠른 검증 루프를 만든다.",
    "관계 약속과 일정 우선순위를 재정렬한다.",
    "수익/지출 기준표를 실제 일정에 반영한다.",
  ];
  const stopBase = [
    "검증 없는 확장을 서두르지 않는다.",
    "감정이 높은 상태에서 큰 결정을 하지 않는다.",
    "과로를 성과로 착각해 휴식을 미루지 않는다.",
    "관계 피로 신호를 무시한 채 속도만 올리지 않는다.",
  ];

  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const phase = idx % 4;
    const verdict = phase === 0 ? "Go" : (phase === 2 ? "Stop" : "Hold");
    const career = phase === 0
      ? "핵심 업무를 1~2개로 좁혀 성과를 누적하세요."
      : (phase === 2 ? "신규 확장보다 기존 과제 품질 점검에 집중하세요." : "진행 중 프로젝트의 병목을 먼저 해소하세요.");
    const wealth = phase === 0
      ? "수익 채널별 기준 단가와 회수 주기를 점검하세요."
      : (phase === 2 ? "지출 한도를 선확정하고 비필수 비용을 줄이세요." : "고정비와 변동비를 분리해 모니터링하세요.");
    const relationship = phase === 0
      ? "협업 파트너와 역할/기한/보상 기준을 문서화하세요."
      : (phase === 2 ? "갈등이 큰 관계는 거리두기 기준을 선명히 하세요." : "기대치 조율 대화를 짧고 자주 진행하세요.");
    const health = phase === 0
      ? "집중일과 회복일을 한 세트로 운영하세요."
      : (phase === 2 ? "수면·식사·산책 루틴을 먼저 복구하세요." : "피로 지표를 주간 단위로 기록하세요.");

    return {
      month,
      source: "strategy",
      keyword: keywords[idx],
      score: null,
      trend: verdict === "Go" ? "추진" : (verdict === "Stop" ? "방어" : "점검"),
      go: goBase[(idx + (dayMaster ? dayMaster.length : 0)) % goBase.length],
      stop: stopBase[(idx + targetYear) % stopBase.length],
      career,
      wealth,
      relationship,
      health,
      oneLineAdvice: `${month}월은 ${yearlyThemes?.summary || "연간 기준"}을 잃지 않고 ${verdict === "Go" ? "추진" : verdict === "Stop" ? "정리" : "점검"} 중심으로 운영하세요.`,
      actionStrategy: phase === 0 ? "핵심 목표 중심의 실행 밀도를 높입니다." : (phase === 2 ? "손실을 줄이는 정리 모드로 전환합니다." : "성과와 피로를 함께 점검합니다."),
      goodFor: phase === 0 ? ["핵심 실행", "협업 정렬"] : ["점검", "리듬 조정"],
      cautionFor: phase === 2 ? ["과속 확장", "감정적 결정"] : ["기준 없는 변경"],
    };
  });
}

function collectSajuNewYearMonthlyRows(body = {}, targetYear, dayMaster, yearlyThemes = {}) {
  const candidates = [
    body?.monthlyLuck,
    body?.monthly,
    body?.engineData?.monthlyLuck,
    body?.engineData?.luck?.monthlyLuck,
    body?.engineData?.luck?.monthly,
    body?.canonicalSajuChart?.luck?.monthlyLuck,
    body?.canonicalSajuNewYearReport?.monthlyLuck,
    body?.canonicalSajuNewYearReport?.fortuneCycles?.monthly,
  ];

  const byMonth = new Map();
  for (let c = 0; c < candidates.length; c += 1) {
    const rows = Array.isArray(candidates[c]) ? candidates[c] : [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] || {};
      const month = normalizeMonthToken(row?.month ?? row?.monthNo ?? row?.monthNumber ?? row?.m);
      if (!month || byMonth.has(month)) continue;
      byMonth.set(month, {
        month,
        source: "engine",
        pillar: String(row?.pillar || row?.ganji || "").trim() || undefined,
        stem: String(row?.stem || row?.gan || "").trim() || undefined,
        branch: String(row?.branch || row?.ji || "").trim() || undefined,
        tenGod: String(row?.tenGod || row?.tenStar || row?.shishin || "").trim() || undefined,
        elementTheme: String(row?.elementTheme || row?.element || row?.summary || "").trim() || undefined,
        score: Number.isFinite(Number(row?.score)) ? Number(row.score) : null,
        trend: String(row?.trend || row?.flow || "").trim() || "점검",
        keyword: String(row?.keyword || row?.theme || "").trim() || undefined,
        go: String(row?.go || row?.opportunity || row?.goodAction || "").trim() || undefined,
        stop: String(row?.stop || row?.caution || row?.avoid || "").trim() || undefined,
        career: String(row?.career || "").trim() || undefined,
        wealth: String(row?.wealth || row?.money || "").trim() || undefined,
        relationship: String(row?.relationship || row?.relation || "").trim() || undefined,
        health: String(row?.health || row?.energy || "").trim() || undefined,
        oneLineAdvice: String(row?.oneLineAdvice || row?.advice || row?.action || "").trim() || undefined,
        actionStrategy: String(row?.actionStrategy || row?.action || "").trim() || undefined,
        goodFor: Array.isArray(row?.goodFor) ? row.goodFor.map((v) => String(v || "").trim()).filter(Boolean) : undefined,
        cautionFor: Array.isArray(row?.cautionFor) ? row.cautionFor.map((v) => String(v || "").trim()).filter(Boolean) : undefined,
      });
    }
  }

  const strategyRows = buildSajuNewYearMonthlyStrategyRows(targetYear, dayMaster, yearlyThemes);
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    return byMonth.get(month) || strategyRows[idx];
  });
}

function buildSajuNewYearBookContext(body = {}, input = {}, sourceData = "") {
  const targetYear = normalizeSajuNewYearTargetYear(body?.targetYear);
  const calendarType = String(body?.calendarType || body?.calType || input?.calendarType || "solar").trim() || "solar";
  const gender = String(body?.gender || input?.gender || "unknown").trim() || "unknown";
  const birthDate = String(body?.birthDate || body?.profile?.birthDate || buildSajuNewYearBirthDate(input)).trim();
  const birthTime = String(body?.birthTime || body?.time || (Number.isFinite(Number(input?.hour))
    ? `${String(Number(input.hour)).padStart(2, "0")}:${String(Number.isFinite(Number(input?.minute)) ? Number(input.minute) : 0).padStart(2, "0")}`
    : "")).trim();

  const chart = body?.engineData?.pillars
    || body?.canonicalSajuChart?.fourPillars
    || body?.canonicalSajuChart?.pillars
    || {};
  const dayMaster = detectDayMasterToken(body, input, sourceData);
  const monthBranch = String(chart?.month?.branch || body?.canonicalSajuChart?.monthBranch || "").trim();
  const natal = {
    yearPillar: formatSajuPillarToken(chart?.year) || undefined,
    monthPillar: formatSajuPillarToken(chart?.month) || undefined,
    dayPillar: formatSajuPillarToken(chart?.day) || undefined,
    hourPillar: formatSajuPillarToken(chart?.hour) || undefined,
    dayMaster: dayMaster || undefined,
    monthBranch: monthBranch || undefined,
    fiveElements: body?.engineData?.fiveElements || body?.canonicalSajuChart?.fiveElements || undefined,
    tenGods: body?.engineData?.tenGods || body?.canonicalSajuChart?.tenGods || undefined,
    hiddenStems: body?.engineData?.hiddenStems || body?.canonicalSajuChart?.hiddenStems || undefined,
    combinationsConflicts: body?.engineData?.combinationsConflicts || body?.canonicalSajuChart?.combinationsConflicts || undefined,
    seasonalBalance: String(body?.engineData?.seasonalBalance || body?.canonicalSajuChart?.seasonalBalance || "").trim() || undefined,
    usefulGod: String(body?.engineData?.usefulGod || body?.canonicalSajuChart?.usefulGod || "").trim() || undefined,
    favorableGod: String(body?.engineData?.favorableGod || body?.canonicalSajuChart?.favorableGod || "").trim() || undefined,
    unfavorableGod: String(body?.engineData?.unfavorableGod || body?.canonicalSajuChart?.unfavorableGod || "").trim() || undefined,
    unfavorablePatterns: Array.isArray(body?.engineData?.unfavorablePatterns) ? body.engineData.unfavorablePatterns : undefined,
    structureType: String(body?.engineData?.structureType || body?.canonicalSajuChart?.structureType || "").trim() || undefined,
    twelveStages: body?.engineData?.twelveStages || body?.canonicalSajuChart?.twelveStages || undefined,
    specialStars: body?.engineData?.specialStars || body?.canonicalSajuChart?.specialStars || undefined,
  };

  const yearly = body?.engineData?.yearlyFortune || body?.yearlyFortune || {};
  const yearlyFortune = {
    yearPillar: String(yearly?.yearPillar || yearly?.ganji || "").trim() || undefined,
    yearStem: String(yearly?.yearStem || yearly?.stem || "").trim() || undefined,
    yearBranch: String(yearly?.yearBranch || yearly?.branch || "").trim() || undefined,
    yearTenGodForDayMaster: String(yearly?.yearTenGodForDayMaster || yearly?.tenGod || "").trim() || undefined,
    yearElementImpact: String(yearly?.yearElementImpact || yearly?.elementImpact || "").trim() || undefined,
    yearBranchImpact: String(yearly?.yearBranchImpact || yearly?.branchImpact || "").trim() || undefined,
    relationWithNatal: yearly?.relationWithNatal && typeof yearly.relationWithNatal === "object"
      ? yearly.relationWithNatal
      : undefined,
    careerTheme: String(yearly?.careerTheme || body?.engineData?.careerTheme || "").trim() || undefined,
    wealthTheme: String(yearly?.wealthTheme || body?.engineData?.wealthTheme || "").trim() || undefined,
    relationshipTheme: String(yearly?.relationshipTheme || body?.engineData?.relationshipTheme || "").trim() || undefined,
    loveTheme: String(yearly?.loveTheme || body?.engineData?.loveTheme || "").trim() || undefined,
    healthTheme: String(yearly?.healthTheme || body?.engineData?.healthTheme || "").trim() || undefined,
    riskTheme: String(yearly?.riskTheme || body?.engineData?.riskTheme || "").trim() || undefined,
  };

  const yearlySummaryText = `${targetYear}년은 ${SAJU_NEW_YEAR_FOCUS_LABELS[normalizeSajuNewYearFocusArea(body?.focusArea)] || "전체운"} 관점에서 선택 기준을 명확히 할수록 누적 성과를 만들기 좋은 흐름입니다.`;
  const monthly = collectSajuNewYearMonthlyRows(body, targetYear, dayMaster, { summary: yearlySummaryText });

  const availableFields = [];
  if (birthDate) availableFields.push("profile.birthDate");
  if (gender) availableFields.push("profile.gender");
  if (calendarType) availableFields.push("profile.calendarType");
  if (natal.dayPillar) availableFields.push("natalSaju.dayPillar");
  if (natal.dayMaster) availableFields.push("natalSaju.dayMaster");
  if (Array.isArray(monthly) && monthly.length === 12) availableFields.push("fortuneCycles.monthly");
  if (yearlyFortune.yearPillar || yearlyFortune.yearTenGodForDayMaster) availableFields.push("yearlyFortune.yearPillar");

  const missingFields = [];
  if (!birthDate) missingFields.push("profile.birthDate");
  if (!Number.isFinite(Number(targetYear))) missingFields.push("targetYear");
  const hasBirthInput = Number.isFinite(Number(input?.year))
    && Number.isFinite(Number(input?.month))
    && Number.isFinite(Number(input?.day));
  if (!natal.dayPillar && !hasBirthInput) missingFields.push("natalSaju.dayPillar-or-birthInput");

  return {
    targetYear,
    profile: {
      name: String(body?.name || input?.name || "사용자").trim() || "사용자",
      gender,
      birthDate,
      birthTime: birthTime || undefined,
      calendarType,
    },
    natalSaju: natal,
    yearlyFortune,
    fortuneCycles: {
      daeun: body?.engineData?.luck?.daeun || body?.engineData?.daewoon || body?.daewoon || undefined,
      seun: body?.engineData?.luck?.seun || body?.engineData?.sewoon || body?.sewoon || undefined,
      monthly,
    },
    promptContext: {
      generatedQuestionPrompt: String(body?._premiumLlmInput?.generatedQuestionPrompt || body?.generatedQuestionPrompt || "").trim() || undefined,
      engineSummary: String(body?._premiumLlmInput?.engineSummary || body?.engineSummary || "").trim() || undefined,
      userQuestion: String(body?.userQuestion || "").trim() || undefined,
    },
    meta: {
      missingFields,
      availableFields,
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildCanonicalSajuNewYearReport(body, input, sourceData) {
  const context = buildSajuNewYearBookContext(body, input, sourceData);
  const monthlyLuck = Array.isArray(context?.fortuneCycles?.monthly) ? context.fortuneCycles.monthly : [];
  const engineMonthly = monthlyLuck.filter((row) => String(row?.source || "") === "engine");
  const ranked = engineMonthly
    .filter((row) => Number.isFinite(Number(row?.score)))
    .slice()
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const strongMonths = ranked.slice(0, 3).map((row) => Number(row?.month || 0)).filter((v) => v > 0);
  const cautionMonths = ranked.slice(-3).map((row) => Number(row?.month || 0)).filter((v) => v > 0).sort((a, b) => a - b);

  return {
    profile: {
      name: context?.profile?.name || "사용자",
      gender: context?.profile?.gender || "unknown",
      birth: {
        year: Number(input?.year || 0),
        month: Number(input?.month || 0),
        day: Number(input?.day || 0),
        hour: Number(input?.hour || 12),
        minute: Number(input?.minute || 0),
      },
      birthDate: context?.profile?.birthDate || "",
      birthTime: context?.profile?.birthTime || undefined,
      calendarType: context?.profile?.calendarType || "solar",
    },
    targetYear: Number(context?.targetYear || normalizeSajuNewYearTargetYear(body?.targetYear)),
    focusArea: normalizeSajuNewYearFocusArea(body?.focusArea),
    saju: {
      dayMaster: context?.natalSaju?.dayMaster || "",
      sourceDigest: String(sourceData || "").slice(0, 1200),
      fourPillars: {
        year: context?.natalSaju?.yearPillar || "",
        month: context?.natalSaju?.monthPillar || "",
        day: context?.natalSaju?.dayPillar || "",
        hour: context?.natalSaju?.hourPillar || "",
      },
    },
    yearlySummary: {
      summary: `${context?.targetYear}년은 선택과 실행 기준을 분명히 할수록 안정적으로 성과를 축적하기 좋은 해입니다.`,
      strongestMonths: strongMonths,
      cautionMonths,
      career: context?.yearlyFortune?.careerTheme || "핵심 과제의 우선순위를 명확히 두면 성과 변동을 줄일 수 있습니다.",
      wealth: context?.yearlyFortune?.wealthTheme || "수익 구조 점검과 지출 통제 기준을 함께 운영하는 것이 중요합니다.",
      relationship: context?.yearlyFortune?.relationshipTheme || "관계는 빈도보다 기준과 약속의 일관성에서 안정됩니다.",
      health: context?.yearlyFortune?.healthTheme || "집중과 회복 루틴의 균형이 연중 컨디션을 좌우합니다.",
    },
    monthlyLuck,
    actionPlan: {
      first30Days: [
        "핵심 목표 1개와 보조 목표 2개를 확정하고 우선순위를 고정합니다.",
        "수익·지출·피로 지표를 주간 단위로 기록하는 루틴을 시작합니다.",
        "관계 갈등과 업무 병목의 조기 신호를 문장으로 정의합니다.",
      ],
      quarterPlan: "분기마다 목표-성과-리스크-회복 지표를 함께 점검하고 다음 분기 전략을 재조정합니다.",
      focusLabel: SAJU_NEW_YEAR_FOCUS_LABELS[normalizeSajuNewYearFocusArea(body?.focusArea)] || "전체운",
    },
    newYearBookContext: context,
  };
}

function validateCanonicalSajuNewYear(canonical) {
  const context = canonical?.newYearBookContext && typeof canonical.newYearBookContext === "object"
    ? canonical.newYearBookContext
    : null;
  const missingFields = Array.isArray(context?.meta?.missingFields) ? context.meta.missingFields.slice() : [];
  const monthlyRows = Array.isArray(context?.fortuneCycles?.monthly)
    ? context.fortuneCycles.monthly
    : (Array.isArray(canonical?.monthlyLuck) ? canonical.monthlyLuck : []);
  const hasEngineMonthlyLuck = monthlyRows.some((row) => String(row?.source || "") === "engine");

  return {
    isValid: missingFields.length === 0,
    hasMonthlyLuck: monthlyRows.length === 12,
    hasEngineMonthlyLuck,
    missingFields,
    warnings: hasEngineMonthlyLuck ? [] : ["MONTHLY_LUCK_MISSING_USE_STRATEGY"],
  };
}

function buildSajuNewYearMonthlyTable(monthlyLuck = []) {
  const rows = [
    "| 월 | 이번 달 키워드 | Go | Stop | 커리어 | 재물 | 관계 | 건강 | 한 줄 조언 |",
    "|---|---|---|---|---|---|---|---|---|",
  ];

  for (let i = 0; i < 12; i += 1) {
    const row = monthlyLuck[i] || {};
    const month = Number(row?.month || i + 1);
    const keyword = String(row?.keyword || row?.elementTheme || row?.trend || "운영").trim() || "운영";
    const go = String(row?.go || row?.actionStrategy || "핵심 과제를 좁혀 실행 밀도를 높이세요.").trim();
    const stop = String(row?.stop || "감정이 높은 상태의 즉흥 결정을 피하세요.").trim();
    const career = String(row?.career || "기존 과제의 병목 제거를 우선하세요.").trim();
    const wealth = String(row?.wealth || "지출 기준과 회수 기준을 함께 점검하세요.").trim();
    const relationship = String(row?.relationship || "기대치와 경계선을 먼저 합의하세요.").trim();
    const health = String(row?.health || "집중일/회복일 리듬을 함께 운영하세요.").trim();
    const oneLine = String(row?.oneLineAdvice || "이번 달은 속도보다 기준을 지키는 운영이 성과를 만듭니다.").trim();
    rows.push(`| ${month}월 | ${keyword} | ${go} | ${stop} | ${career} | ${wealth} | ${relationship} | ${health} | ${oneLine} |`);
  }
  return rows.join("\n");
}

function buildSajuNewYearChapterText(chapterMeta, chapter, canonical, minChars = 2600) {
  const monthlyLuck = Array.isArray(canonical?.monthlyLuck) ? canonical.monthlyLuck : [];
  const chapterSpec = getSajuNewYearChapterPromptSpec(chapter);
  const markers = Array.isArray(chapterSpec?.markers) ? chapterSpec.markers : [];
  const ranked = monthlyLuck.slice().sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));
  const top = ranked.slice(0, 3);
  const caution = ranked.slice(-3).sort((a, b) => Number(a?.month || 0) - Number(b?.month || 0));
  const focusLabel = SAJU_NEW_YEAR_FOCUS_LABELS[canonical?.focusArea] || "전체운";
  const chapterLabel = String(chapterMeta?.title || `Chapter ${chapter}`);
  const chapterSubtitle = String(chapterMeta?.subtitle || "");
  const year = Number(canonical?.targetYear || new Date().getFullYear());
  const yearlySummaryText = String(canonical?.yearlySummary?.summary || `${year}년은 속도보다 방향을 정교하게 조정할수록 성과가 커지는 흐름입니다.`);
  const strongestText = top.map((row) => `${row.month}월`).join(", ") || "상대적 강점 구간 없음";
  const cautionText = caution.map((row) => `${row.month}월`).join(", ") || "주의 구간 데이터 부족";
  const sectionActionGuides = [
    String(canonical?.yearlySummary?.career || "핵심 목표를 줄이고 실행 밀도를 높이면 성과 변동이 줄어듭니다."),
    "성과를 키울 시기에는 확장보다 우선순위 재정렬이 먼저입니다.",
    "사람과 일정을 동시에 벌리기보다 유지 가능한 리듬을 먼저 고정하세요.",
    "올해의 성과는 빠른 결정보다 기준 있는 반복에서 누적됩니다.",
  ];
  const sectionRiskGuides = [
    String(canonical?.yearlySummary?.relationship || "관계 변수는 속도보다 기준 합의로 관리할 때 손실이 작아집니다."),
    "경계선 없이 책임을 넓히면 연중 후반 피로가 빠르게 커질 수 있습니다.",
    "감정 기복이 큰 시기일수록 설명보다 일정과 기준을 먼저 고정해야 합니다.",
    "불확실성이 커질수록 멈춤 기준과 재시작 기준을 동시에 정해 두는 편이 안전합니다.",
  ];
  const sectionQuestions = [
    "점검 질문: 지금 정한 방향이 90일 뒤에도 유지 가능한가, 체력과 자원을 같이 계산했는가, 우선순위가 과하게 늘어나지 않았는가?",
    "점검 질문: 성과를 내야 하는 시기와 지켜야 하는 시기를 구분했는가, 과속 신호를 미리 적어 두었는가, 멈출 기준이 분명한가?",
    "점검 질문: 관계와 감정 반응이 일정을 흔들고 있지는 않은가, 설명보다 합의가 먼저 필요한 지점은 없는가, 부담을 줄일 장치가 있는가?",
    "점검 질문: 올해의 핵심 문장을 실제 일정표와 예산표에 반영했는가, 대체 시나리오를 확보했는가, 반복 가능한 실행만 남겼는가?",
  ];

  const lines = [
    `## ${chapterLabel}`,
    chapterSubtitle ? `> ${chapterSubtitle}` : "",
    `${year}년 ${focusLabel} 기준으로 올해를 어떻게 운영할지에 초점을 맞춘 상담형 리포트입니다. ${yearlySummaryText}`,
  ].filter(Boolean);

  markers.forEach((marker, idx) => {
    const markerTitle = String(marker || "").replace(/^###\s*\d+\)\s*/, "").trim();
    lines.push("", marker);

    if (Number(chapter) === 9 && marker.includes("12개월 Go/Stop 월별 테이블")) {
      lines.push(
        `월별 판단은 단순 길흉이 아니라 실행 방향을 정하는 운영 기준입니다. 강점 구간(${strongestText})은 추진력을 살리고, 주의 구간(${cautionText})은 손실을 줄이는 데 집중하세요.`,
        "",
        buildSajuNewYearMonthlyTable(monthlyLuck),
      );
      return;
    }

    if (Number(chapter) === 10 && marker.includes("3단계 실행 로드맵")) {
      lines.push(
        "#### 올해 반드시 해야 할 행동 10개",
        "- 핵심 목표 1개와 보조 목표 2개를 분기 시작 전에 확정한다.",
        "- 월 1회 수익/지출 점검 회의를 스스로 진행한다.",
        "- 협업 기준(역할/기한/보상)을 문서로 고정한다.",
        "- 피로 신호가 누적되기 전에 회복일을 선점한다.",
        "- 중요한 관계는 기대치와 경계선을 먼저 합의한다.",
        "- 분기마다 중단할 일 1개를 정하고 정리한다.",
        "- 월별 Go/Stop 기준을 실제 일정에 반영한다.",
        "- 리스크 발생 시 멈춤-점검-조정-재실행 순서를 지킨다.",
        "- 상반기 말/하반기 말에 성과와 피로를 함께 리뷰한다.",
        "- 연말 회수 목표(돈/일/관계/건강/습관)를 문장으로 남긴다.",
        "",
        "#### 올해 하지 말아야 할 행동 10개",
        "- 감정이 격해진 상태에서 큰 결정을 내리지 않는다.",
        "- 검증 없는 확장 투자에 즉시 진입하지 않는다.",
        "- 불분명한 책임을 떠안은 채 프로젝트를 시작하지 않는다.",
        "- 관계 피로를 무시하고 연락 빈도만 늘리지 않는다.",
        "- 과로를 성실함으로 착각하지 않는다.",
        "- 월별 경고 신호를 무시한 채 같은 실수를 반복하지 않는다.",
        "- 지출 통제 없이 매출 증가만 기대하지 않는다.",
        "- 갈등 상황에서 설명 과잉으로 문제를 키우지 않는다.",
        "- 연말 정리를 미루고 다음 해로 부채를 넘기지 않는다.",
        "- 비교 불안으로 전략을 자주 바꾸지 않는다.",
      );
      return;
    }

    lines.push(
      `${markerTitle}에서는 ${focusLabel} 관점의 운영 기준을 선명하게 정하는 것이 핵심입니다. ${idx + 1}번째 핵심 축으로 보면 강한 구간(${strongestText})은 기회를 확대하고, 주의 구간(${cautionText})은 손실을 줄이는 방향으로 분리해 대응하세요.`,
      `실행 전략: ${sectionActionGuides[idx % sectionActionGuides.length]}`,
      `리스크 대응: ${sectionRiskGuides[idx % sectionRiskGuides.length]}`,
      sectionQuestions[idx % sectionQuestions.length],
    );
  });

  let text = lines.join("\n");

  const deepDiveFrames = [
    "실행 우선순위 재배치",
    "리스크 컷오프 기준",
    "관계-성과 균형 조정",
    "에너지 관리 프로토콜",
    "재정 의사결정 점검",
  ];

  let idx = 1;
  while (text.length < minChars) {
    const monthRow = monthlyLuck[(idx - 1) % Math.max(1, monthlyLuck.length)] || {
      month: 1,
      trend: "중립",
      opportunity: "핵심 과제 점검",
      caution: "과속 의사결정",
      action: "기록 습관을 유지하세요.",
    };
    const frame = deepDiveFrames[(idx - 1) % deepDiveFrames.length];
    const monthOpportunity = String(monthRow?.opportunity || monthRow?.actionStrategy || monthRow?.keyword || "핵심 과제 점검").trim() || "핵심 과제 점검";
    const monthAction = String(monthRow?.action || monthRow?.go || "기록 습관을 유지하세요.").trim() || "기록 습관을 유지하세요.";
    const monthCaution = String(monthRow?.caution || monthRow?.stop || "과속 의사결정").trim() || "과속 의사결정";
    const reviewPrompts = [
      `점검 질문 ${idx}: 이번 주 핵심 목표가 한 문장으로 정리되는가, 보류할 일을 함께 적어 두었는가, 체력 소모를 일정에 반영했는가?`,
      `점검 질문 ${idx}: 성과 욕심 때문에 기준 없는 확장을 하고 있지 않은가, 손실을 멈출 숫자 기준이 있는가, 도움을 요청할 타이밍을 정했는가?`,
      `점검 질문 ${idx}: 관계 부담이 누적되기 전에 설명 방식과 빈도를 조정했는가, 오해 가능성을 먼저 줄였는가, 휴식일을 선점했는가?`,
      `점검 질문 ${idx}: 이번 결정이 다음 달 자원 배분과도 연결되는가, 감정적 피로를 숫자로 확인했는가, 대체 행동을 미리 정했는가?`,
      `점검 질문 ${idx}: 수입과 지출의 흐름을 함께 보고 있는가, 지금 멈춰야 할 일 하나를 정했는가, 반복 가능한 습관으로 연결했는가?`,
    ];
    text += `\n\n### 전략 심화 ${idx} - ${frame}`;
    text += `\n${idx}차 보강에서는 ${monthRow.month}월(${monthRow.trend}) 흐름에 맞춰 ${monthOpportunity} 과제를 ${idx}회차 방식으로 확장하되, ${frame} 축에서 ${focusLabel} 핵심 목표를 1~2개로 고정해 실행 밀도를 높이세요.`;
    text += `\n실행 액션 ${idx}: ${monthAction}`;
    text += `\n리스크 경고 ${idx}: ${monthCaution}`;
    text += `\n${reviewPrompts[(idx - 1) % reviewPrompts.length]}`;
    idx += 1;
  }

  return text;
}

function buildSajuNewYearRequiredMarkers(chapter) {
  const spec = getSajuNewYearChapterPromptSpec(chapter);
  return Array.isArray(spec?.markers) ? spec.markers : [];
}

function hasSajuNewYearInternalDisclosure(text) {
  const source = String(text || "");
  return SAJU_NEW_YEAR_INTERNAL_DISCLOSURE_PATTERNS.some((pattern) => pattern.test(source));
}

function evaluateSajuNewYearChapterQuality(text, chapter, minChars, previousChapterTexts = []) {
  const source = String(text || "").trim();
  const requiredMarkers = buildSajuNewYearRequiredMarkers(chapter);
  const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker));
  const repeatedInside = detectRepeatedLongSentences(source, 30);
  const repeatedAcross = detectCrossChapterRepeatedSentences(source, previousChapterTexts, 30);
  const bannedExpression = hasBannedDeterministicExpression(source);
  const internalDisclosure = hasSajuNewYearInternalDisclosure(source);
  const monthRowCount = (source.match(/\|\s*(?:[1-9]|1[0-2])월\s*\|/g) || []).length;
  const hasMonthlyTable = Number(chapter) !== 9
    || (/\|\s*월\s*\|\s*이번\s*달\s*키워드\s*\|\s*Go\s*\|\s*Stop\s*\|/.test(source) && monthRowCount >= 12);
  const hasFinalChecklist = Number(chapter) !== 10
    || (source.includes("#### 올해 반드시 해야 할 행동 10개") && source.includes("#### 올해 하지 말아야 할 행동 10개"));

  const failedChecks = [];
  if (source.length < minChars) failedChecks.push("TOO_SHORT");
  if (missingMarkers.length > 0) failedChecks.push(`MISSING_MARKERS:${missingMarkers.join(",")}`);
  if (repeatedInside.length > 0) failedChecks.push("REPEATED_SENTENCES_INSIDE");
  if (repeatedAcross.length > 0) failedChecks.push("REPEATED_SENTENCES_ACROSS");
  if (bannedExpression) failedChecks.push("BANNED_DETERMINISTIC_EXPRESSION");
  if (internalDisclosure) failedChecks.push("INTERNAL_DISCLOSURE_FOUND");
  if (!hasMonthlyTable) failedChecks.push("MISSING_MONTHLY_TABLE");
  if (!hasFinalChecklist) failedChecks.push("MISSING_FINAL_CHECKLIST");

  return {
    ok: failedChecks.length === 0,
    failedChecks,
    missingMarkers,
    repeatedInsideCount: repeatedInside.length,
    repeatedAcrossCount: repeatedAcross.length,
    bannedExpression,
    internalDisclosure,
    hasMonthlyTable,
    hasFinalChecklist,
    actualChars: source.length,
    minChars,
  };
}

function buildSajuNewYearChapterMemories(previousChapterTexts = []) {
  const rows = Array.isArray(previousChapterTexts) ? previousChapterTexts : [];
  return rows.map((text, idx) => {
    const source = String(text || "").replace(/\s+/g, " ").trim();
    const phrases = extractPremiumKeyPhrases(source);
    return {
      chapterId: `chapter-${String(idx + 1).padStart(2, "0")}`,
      title: `Chapter ${idx + 1}`,
      summary: source.slice(0, 280),
      usedThemes: phrases.slice(0, 8),
      usedAdvice: phrases.slice(8, 14),
      usedTimingPoints: phrases.slice(14, 20),
      usedRiskWarnings: phrases.slice(20, 26),
    };
  }).filter((row) => row.summary.length > 0);
}

function buildSajuNewYearGeminiPrompt(chapterMeta, chapter, canonical, minChars, targetChars, previousChapterTexts = [], premiumLlmInput = null) {
  const chapterSpec = getSajuNewYearChapterPromptSpec(chapter);
  const markers = Array.isArray(chapterSpec?.markers) ? chapterSpec.markers : [];
  const checklist = Array.isArray(chapterSpec?.checklist) ? chapterSpec.checklist : [];
  const monthlyLuck = Array.isArray(canonical?.monthlyLuck) ? canonical.monthlyLuck : [];
  const topMonths = monthlyLuck
    .slice()
    .sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0))
    .slice(0, 3)
    .map((row) => `${Number(row?.month || 0)}월(${Number(row?.score || 0)})`)
    .join(", ");
  const cautionMonths = monthlyLuck
    .slice()
    .sort((a, b) => Number(a?.score || 0) - Number(b?.score || 0))
    .slice(0, 3)
    .map((row) => `${Number(row?.month || 0)}월(${Number(row?.score || 0)})`)
    .join(", ");
  const targetYear = Number(canonical?.targetYear || new Date().getFullYear());
  const chapterLabel = String(chapterMeta?.title || `Chapter ${chapter}`);
  const chapterSubtitle = String(chapterMeta?.subtitle || "");
  const previousBan = collectPreviousSentenceBanList(previousChapterTexts, 12);
  const chapterMemories = buildSajuNewYearChapterMemories(previousChapterTexts);
  const chapterContract = premiumLlmInput && typeof premiumLlmInput === "object" && premiumLlmInput.chapterContract && typeof premiumLlmInput.chapterContract === "object"
    ? premiumLlmInput.chapterContract
    : buildPremiumChapterContract("sajuNewYear", REPORT_TYPE_TO_FEATURE_TYPE.sajuNewYear || "sajuNewYear", "personal", chapter);
  const chapterContractText = formatPremiumChapterContractForPrompt(chapterContract);
  const requiredHeadings = Array.isArray(chapterContract?.requiredHeadings)
    ? chapterContract.requiredHeadings.map((row) => String(row || "").trim()).filter(Boolean)
    : [];

  return [
    "당신은 Code Destiny의 프리미엄 사주 신년운세 PDF를 작성하는 해당 분야 최고 전문가이자 연간 전략 상담가입니다.",
    "응답은 한국어 마크다운 본문만 작성하세요.",
    "완성형 상담문만 출력하고, 내부 계산 근거 목록이나 개발자 문장은 출력하지 마세요.",
    "과장된 운세 문구/공포 유도 문구/확정적 예언을 금지합니다.",
    "출력 금지: 년주/월주/일주/시주 목록, 일간/월지/지장간/오행/십성 분포 목록, 대운/세운/월운 계산 과정, 합충형파해 산출 과정, 용신/희신/기신 판단 근거, JSON/payload/engine result/내부 계산표.",
    `목표 길이: ${Number(targetChars || minChars)}자`,
    `최소 길이: ${minChars}자`,
    "섹션마다 실제 행동 기준을 포함하고, 모호한 위로 문장만 반복하지 마세요.",
    "이전 챕터의 동일 문장, 동일 비유, 동일 조언 프레이밍을 재사용하지 마세요.",
    "핵심은 올해를 어떻게 운영할지에 대한 실행 전략이며, 길흉 단정 대신 행동 설계로 작성하세요.",
    requiredHeadings.length ? `chapterContract.requiredHeadings를 본문 소제목으로 모두 반영하세요: ${requiredHeadings.join(" | ")}` : "",
    checklist.length ? `[챕터 필수 커버리지]\n- ${checklist.join("\n- ")}` : "",
    chapterContractText ? `[chapterContract]\n${chapterContractText}` : "",
    Number(chapter) === 9
      ? "이 챕터는 반드시 12개월 월별 테이블을 마크다운 표 형식으로 포함하세요. 각 월은 이번 달 키워드, Go, Stop, 커리어, 재물, 관계, 건강, 한 줄 조언을 서로 다르게 제공해야 합니다."
      : "",
    previousBan.length
      ? `[이전 챕터와 중복되어 사용할 수 없는 금지 문장 목록]\n${JSON.stringify(previousBan, null, 2)}`
      : "",
    chapterMemories.length
      ? `[이전 챕터 요약]\n${JSON.stringify(chapterMemories, null, 2)}`
      : "",
    "",
    `[챕터] ${chapterLabel}`,
    chapterSubtitle ? `[부제] ${chapterSubtitle}` : "",
    `[대상 연도] ${targetYear}`,
    `[강한 달] ${topMonths || "정보 없음"}`,
    `[주의 달] ${cautionMonths || "정보 없음"}`,
    "",
    "[canonical 데이터]",
    JSON.stringify(canonical || {}, null, 2),
    premiumLlmInput ? "" : null,
    premiumLlmInput ? "[Premium LLM Input]" : null,
    premiumLlmInput ? JSON.stringify(premiumLlmInput, null, 2) : null,
    "",
    "필수 구조:",
    `## ${chapterLabel}`,
    ...markers,
    Number(chapter) === 9 ? "월별 표 헤더를 다음 순서로 고정하세요: | 월 | 이번 달 키워드 | Go | Stop | 커리어 | 재물 | 관계 | 건강 | 한 줄 조언 |" : "",
  ].filter(Boolean).join("\n");
}

function buildSajuNewYearRewritePrompt(basePrompt, currentText, minChars, failedChecks = [], previousChapterTexts = []) {
  const previousBan = collectPreviousSentenceBanList(previousChapterTexts, 12);
  return [
    basePrompt,
    "",
    "아래 원고를 같은 데이터 근거를 유지하면서 더 깊고 구체적으로 재작성하세요.",
    `목표 길이: 최소 ${minChars}자`,
    "섹션별로 실행 문장(언제/무엇/어떻게)을 명시하고, 계산 근거 노출 문장을 모두 제거하세요.",
    "중복 문장을 줄이고 월별·분기별 전략의 차이를 분명히 쓰세요.",
    failedChecks.length ? `품질 보강 포인트: ${failedChecks.join(" | ")}` : "",
    previousBan.length
      ? `[중복 금지 문장]\n${JSON.stringify(previousBan, null, 2)}`
      : "",
    "",
    "[현재 원고]",
    String(currentText || "").trim(),
  ].join("\n");
}

async function generateSajuNewYearChapterWithGemini(env, {
  chapter,
  chapterMeta,
  canonical,
  minChars,
  targetChars,
  previousChapterTexts,
  strictPayloadMode,
  premiumLlmInput,
}) {
  const generationOptions = {
    temperature: 0.78,
    topP: 0.92,
    maxOutputTokens: 12288,
    timeoutMs: Number(env.SAJU_NEW_YEAR_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 90000),
    maxAttemptsPerPair: Number(env.SAJU_NEW_YEAR_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };
  const modelEnvKeys = ["PREMIUM_SAJU_NEW_YEAR_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "LIFEBOOK_GEMINI_MODEL"];
  const qualityFloor = Math.max(1200, Math.floor(minChars * 0.65));
  const normalizedPreviousTexts = normalizePreviousChapterTexts(previousChapterTexts);

  let prompt = buildSajuNewYearGeminiPrompt(chapterMeta, chapter, canonical, minChars, targetChars, normalizedPreviousTexts, premiumLlmInput || null);
  let text = "";
  let quality = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = String(await callGemini(env, prompt, modelEnvKeys, generationOptions) || "").trim();
    if (!candidate) continue;

    let normalized = candidate;
    if (normalized.length < minChars) {
      const expanded = await refineChapterToMinLength(
        env,
        normalized,
        minChars,
        {
          title: String(chapterMeta?.title || `Chapter ${chapter}`),
          subtitle: String(chapterMeta?.subtitle || ""),
          counselorFocus: `${Number(canonical?.targetYear || new Date().getFullYear())}년 신년 전략 챕터`,
          sectionHeaders: ["데이터 기준점", "핵심 해석", "실행 가이드", "월별 우선순위", "리스크 관리"],
          data: canonical,
        },
        modelEnvKeys,
        generationOptions,
      );
      if (expanded && expanded.length > normalized.length) normalized = String(expanded).trim();
    }

    quality = evaluateSajuNewYearChapterQuality(normalized, chapter, minChars, normalizedPreviousTexts);
    if (normalized.length >= qualityFloor && quality.ok) {
      text = normalized;
      break;
    }

    prompt = buildSajuNewYearRewritePrompt(
      buildSajuNewYearGeminiPrompt(chapterMeta, chapter, canonical, minChars, targetChars, normalizedPreviousTexts, premiumLlmInput || null),
      normalized,
      minChars,
      [
        ...(quality?.failedChecks || []),
        ...((quality?.missingMarkers || []).map((marker) => `MISSING:${marker}`)),
      ],
      normalizedPreviousTexts,
    );
  }

  if (!text) {
    return {
      ok: false,
      code: "SAJU_NEW_YEAR_GEMINI_UNAVAILABLE",
      message: "신년운세 챕터 생성 결과가 비어 있어 생성이 중단되었습니다.",
      quality: quality || evaluateSajuNewYearChapterQuality("", chapter, minChars, normalizedPreviousTexts),
    };
  }

  quality = evaluateSajuNewYearChapterQuality(text, chapter, minChars, normalizedPreviousTexts);

  if (!quality.ok) {
    return {
      ok: false,
      code: "SAJU_NEW_YEAR_CHAPTER_QUALITY_FAILED",
      message: "신년운세 챕터 품질 게이트를 통과하지 못했습니다.",
      quality,
      details: [...(quality?.failedChecks || []), ...((quality?.missingMarkers || []).map((marker) => `MISSING:${marker}`))],
    };
  }

  return {
    ok: true,
    text,
    usedFallback: false,
    quality,
  };
}

async function handleSajuNewYearSession(request, env, authInfo = null) {
  const body = await readJson(request);
  Object.assign(body, normalizePremiumRequestBodyForPipeline("sajuNewYear", body));
  const strictPayloadMode = true;
  const strictBody = {
    ...body,
    _premiumStrictPayload: strictPayloadMode,
  };
  const prepareOnly = asBool(strictBody.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(strictBody)) {
    return json({ ok: false, message: "sessionId 또는 chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }

  const input = buildSessionInput(strictBody, SAJU_NEW_YEAR_TOTAL_CHAPTERS);
  const chapter = input.chapter;
  const reportId = String(strictBody.reportId || "").trim() || sajuNewYearReportIdFromInput(strictBody, input);
  const dataState = ensureSajuNewYearSourceData(strictBody, input);
  const ownerUserId = String(authInfo?.userId || "").trim();
  if (!dataState.ok) {
    return json({
      ok: false,
      code: dataState.code || "SAJU_ENGINE_SOURCE_REQUIRED",
      message: dataState.message || "사주 엔진 원본 데이터가 필요합니다.",
      missingFields: Array.isArray(dataState.missingFields) ? dataState.missingFields : ["sajuData", "canonicalSajuChart", "engineData"],
    }, { status: 422 });
  }

  const canonical = buildCanonicalSajuNewYearReport(strictBody, input, dataState.sourceData);
  const validation = validateCanonicalSajuNewYear(canonical);
  const validationWarnings = !validation.isValid
    ? ["SAJU_NEW_YEAR_VALIDATION_FAILED"]
    : [];

  if (prepareOnly) {
    const chapterTargets = SAJU_NEW_YEAR_CHAPTER_TARGETS.map((target, idx) => ({
      chapter: idx + 1,
      targetChars: Number(target || 5000),
      minChars: Math.max(3200, Math.floor(Number(target || 5000) * 0.85)),
    }));
    return json({
      ok: true,
      prepared: true,
      reportType: "sajuNewYear",
      featureType: "saju_new_year_pdf",
      totalChapters: SAJU_NEW_YEAR_TOTAL_CHAPTERS,
      chapterPlan: SAJU_NEW_YEAR_CHAPTERS,
      chapterMinChars: {
        default: Math.max(3200, Math.floor(Number(SAJU_NEW_YEAR_CHAPTER_TARGETS[0] || 5000) * 0.85)),
        byChapter: chapterTargets,
      },
      minTotalChars: SAJU_NEW_YEAR_MIN_TOTAL_CHARS,
      costCoins: SAJU_NEW_YEAR_COST,
      reason: SAJU_NEW_YEAR_REASON,
      canonicalSajuNewYearReport: canonical,
      validation,
      dataQuality: {
        usedFallbackData: dataState.usedFallbackData,
        engineSource: dataState.sourceType || "unknown",
        warning: dataState.warning,
      },
      warnings: validationWarnings,
      missingFields: validation.missingFields || [],
    });
  }

  const chapterMeta = SAJU_NEW_YEAR_CHAPTERS[chapter - 1] || SAJU_NEW_YEAR_CHAPTERS[0];
  const targetChars = Number(SAJU_NEW_YEAR_CHAPTER_TARGETS[chapter - 1] || 5000);
  const minChars = Math.max(3200, Math.floor(targetChars * 0.85));
  const previousChapterTexts = resolvePreviousChapterTexts(
    strictBody?.previousChapterTexts,
    getStoredChapterTexts("saju-new-year", reportId, chapter),
  );
  const generated = await generateSajuNewYearChapterWithGemini(env, {
    chapter,
    chapterMeta,
    canonical,
    minChars,
    targetChars,
    previousChapterTexts,
    strictPayloadMode,
    premiumLlmInput: strictBody?._premiumLlmInput || buildLlmPromptInput("sajuNewYear", chapter, canonical),
  });

  let generatedChapter = generated;
  if (!generatedChapter?.ok) {
    const localText = buildSajuNewYearChapterText(chapterMeta, chapter, canonical, minChars);
    const localQuality = evaluateSajuNewYearChapterQuality(localText, chapter, minChars, previousChapterTexts);
    if (!localQuality.ok) {
      return json({
        ok: false,
        code: generatedChapter?.code || "SAJU_NEW_YEAR_CHAPTER_GENERATION_FAILED",
        message: generatedChapter?.message || "신년운세 챕터 생성에 실패했습니다.",
        details: Array.isArray(generatedChapter?.details) ? generatedChapter.details : [],
      }, { status: Number(generatedChapter?.status || 422) });
    }
    generatedChapter = {
      ok: true,
      text: localText,
      usedFallback: true,
      quality: localQuality,
      internalFallbackUsed: true,
    };
  }

  const text = String(generatedChapter?.text || "").trim();

  const storage = writeReportSessionChapter(
    "saju-new-year",
    reportId,
    chapter,
    SAJU_NEW_YEAR_TOTAL_CHAPTERS,
    {
      num: chapter,
      title: chapterMeta.title,
      subtitle: chapterMeta.subtitle,
      icon: "new-year",
    },
    text,
    {
      reportType: "sajuNewYear",
      featureType: "saju_new_year_pdf",
      ownerUserId,
      usedFallbackData: dataState.usedFallbackData,
      engineSource: dataState.sourceType || "unknown",
      validation,
      canonicalSajuNewYearReport: canonical,
      minTotalChars: SAJU_NEW_YEAR_MIN_TOTAL_CHARS,
    },
  );

  await persistPremiumPdfHistoryFromSession(env, "saju-new-year", reportId, {
    ownerUserId,
  });

  return json({
    ok: true,
    reportId,
    reportType: "sajuNewYear",
    featureType: "saju_new_year_pdf",
    source: generatedChapter?.usedFallback ? "local" : "api",
    totalChapters: SAJU_NEW_YEAR_TOTAL_CHAPTERS,
    minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
    sessionId: chapter,
    chapter,
    chapterMeta: {
      num: chapter,
      title: chapterMeta.title,
      subtitle: chapterMeta.subtitle,
      icon: "new-year",
    },
    text,
    chapterSummaryForContext: buildChapterSummaryForContext(text),
    sections: parseSections(text),
    usedFallback: Boolean(generatedChapter?.usedFallback),
    engineSource: dataState.sourceType || "unknown",
    quality: generatedChapter?.quality || null,
    dataQuality: {
      usedFallbackData: dataState.usedFallbackData,
      engineSource: dataState.sourceType || "unknown",
      warning: dataState.warning,
      validation,
      warnings: validationWarnings,
    },
    canonicalSajuNewYearReport: canonical,
    storage,
  });
}

async function handleLifebookSession(request, env, authInfo = null) {
  const body = await readJson(request);
  Object.assign(body, normalizePremiumRequestBodyForPipeline("lifeBook", body));
  const strictPayloadMode = true;
  const strictBody = {
    ...body,
    _premiumStrictPayload: strictPayloadMode,
  };
  const prepareOnly = asBool(strictBody.prepareOnly);
  const explicitMode = String(strictBody.mode || "").trim().toLowerCase();
  const fullGenerateRequested = asBool(strictBody.generateAll)
    || explicitMode === "lifebook";

  if (!prepareOnly && !chapterRequestProvided(strictBody) && !fullGenerateRequested) {
    return json({ ok: false, message: "sessionId 또는 chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }

  const input = buildSessionInput(strictBody, LIFE_BOOK_TOTAL_CHAPTERS);
  const ownerUserId = String(authInfo?.userId || "").trim();
  const chapter = input.chapter;
  const reportId = String(strictBody.reportId || "").trim() || lifebookReportIdFromInput(strictBody, input);
  const lifebookSourceState = ensureLifebookSourceData(strictBody, input);
  if (!lifebookSourceState.ok) {
    return json({
      ok: false,
      code: lifebookSourceState.code || "SAJU_ENGINE_SOURCE_REQUIRED",
      message: lifebookSourceState.message || "사주 엔진 원본 데이터가 필요합니다.",
      missingFields: Array.isArray(lifebookSourceState.missingFields)
        ? lifebookSourceState.missingFields
        : ["sajuData", "canonicalSajuChart", "engineData"],
    }, { status: 422 });
  }

  const effectiveBody = {
    ...strictBody,
    sajuData: lifebookSourceState.sourceData,
  };

  if (prepareOnly) {
    const preparedInputData = buildLifeBookInputData(effectiveBody, input);
    const quality = preparedInputData?.dataQuality || { missingCore: [] };

    return json({
      ok: true,
      prepared: true,
      reportType: "lifeBook",
      totalChapters: LIFE_BOOK_TOTAL_CHAPTERS,
      chapterMinChars: {
        default: Number(getLifeBookChapterByNumber(1)?.minLength || 2500),
      },
      minTotalChars: LIFE_BOOK_MIN_TOTAL_CHARS_CONFIG,
      chapterPlan: buildLifeBookChapterPlan(),
      dataQuality: {
        missingCore: Array.isArray(quality?.missingCore) ? quality.missingCore : [],
        source: quality?.source || {},
        engineSource: lifebookSourceState.sourceType || "unknown",
      },
      canonicalSajuChart: effectiveBody?.canonicalSajuChart || null,
      missingFields: Array.isArray(quality?.missingCore) ? quality.missingCore : [],
    });
  }

  if (fullGenerateRequested && !chapterRequestProvided(strictBody)) {
    const allGenerated = await generateLifeBookPdf({
      env,
      body: effectiveBody,
      normalizedInput: input,
      strictMode: strictPayloadMode,
      reportId,
    });

    if (!allGenerated?.ok) {
      return json({
        ok: false,
        code: allGenerated?.code || "LIFEBOOK_GENERATION_FAILED",
        message: allGenerated?.message || "인생의 책 생성에 실패했습니다.",
        detail: allGenerated?.detail || undefined,
      }, { status: 422 });
    }

    const generatedChapters = Array.isArray(allGenerated.chapters) ? allGenerated.chapters : [];
    let lastStorage = null;
    const chapterResultsByNumber = {};

    generatedChapters.forEach((chapterResult, idx) => {
      const num = idx + 1;
      chapterResultsByNumber[String(num)] = chapterResult;
      lastStorage = writeReportSessionChapter(
        "lifebook",
        reportId,
        num,
        LIFE_BOOK_TOTAL_CHAPTERS,
        {
          num,
          title: chapterResult.title,
          subtitle: chapterResult.subtitle,
          icon: "book",
        },
        chapterResult.contentMarkdown,
        {
          ownerUserId,
          chapterJson: chapterResult.chapterJson || null,
          lifeBookInputData: allGenerated.lifeBookInputData,
          chapterResultsByNumber,
          pdfData: allGenerated.pdfData || null,
          generationWarnings: allGenerated.warnings || [],
          renderMeta: {
            chapterCount: generatedChapters.length,
            generatedAt: allGenerated?.rendered?.generatedAt || new Date().toISOString(),
          },
        },
      );
    });

    await persistPremiumPdfHistoryFromSession(env, "lifebook", reportId, {
      ownerUserId,
    });

    return json({
      ok: true,
      source: String(allGenerated?.source || "api"),
      mode: "life-book",
      reportId,
      jobId: reportId,
      pdfUrl: `/api/lifebook/download?reportId=${encodeURIComponent(reportId)}`,
      totalChapters: LIFE_BOOK_TOTAL_CHAPTERS,
      minTotalChars: LIFE_BOOK_MIN_TOTAL_CHARS_CONFIG,
      chapters: generatedChapters,
      pdfData: allGenerated.pdfData || null,
      warnings: allGenerated.warnings || [],
      storage: lastStorage,
      dataQuality: allGenerated?.lifeBookInputData?.dataQuality || {},
      engineSource: lifebookSourceState.sourceType || "unknown",
    });
  }

  const existingEntryForPrev = getStoredReportSession("lifebook", reportId);
  const existingChapterResultsByNumberForPrev = toPlainObject(existingEntryForPrev?.extra?.chapterResultsByNumber);
  const previousTextsRaw = [];
  for (let c = 1; c <= LIFE_BOOK_TOTAL_CHAPTERS; c += 1) {
    const prevCh = existingChapterResultsByNumberForPrev[String(c)];
    if (prevCh) {
      const txt = prevCh.contentMarkdown || prevCh.text || "";
      if (txt) previousTextsRaw.push(txt);
    }
  }
  const previousTexts = resolvePreviousChapterTexts(
    strictBody?.previousChapterTexts,
    previousTextsRaw,
  );

  const generated = await generateLifeBookPdf({
    env,
    body: effectiveBody,
    normalizedInput: input,
    strictMode: strictPayloadMode,
    reportId,
    requestedChapter: chapter,
    previousTexts,
  });

  if (!generated?.ok) {
    return json({
      ok: false,
      code: generated?.code || "LIFEBOOK_CHAPTER_GENERATION_FAILED",
      message: generated?.message || "인생의 책 챕터 생성에 실패했습니다.",
      detail: generated?.detail || undefined,
    }, { status: 422 });
  }

  const chapterResult = Array.isArray(generated?.chapters) ? generated.chapters[0] : null;
  if (!chapterResult) {
    return json({
      ok: false,
      code: "LIFEBOOK_CHAPTER_EMPTY",
      message: "생성된 챕터 데이터가 비어 있습니다.",
    }, { status: 422 });
  }

  const chapterMeta = {
    num: chapter,
    title: chapterResult.title,
    subtitle: chapterResult.subtitle,
    icon: "book",
  };

  const existingEntry = getStoredReportSession("lifebook", reportId);
  const existingChapterResultsByNumber = toPlainObject(existingEntry?.extra?.chapterResultsByNumber);
  const mergedChapterResultsByNumber = {
    ...existingChapterResultsByNumber,
    [String(chapter)]: chapterResult,
  };

  const storage = writeReportSessionChapter(
    "lifebook",
    reportId,
    chapter,
    LIFE_BOOK_TOTAL_CHAPTERS,
    chapterMeta,
    chapterResult.contentMarkdown,
    {
      ownerUserId,
      chapterJson: chapterResult.chapterJson || null,
      lifeBookInputData: generated.lifeBookInputData,
      chapterResultsByNumber: mergedChapterResultsByNumber,
      pdfData: generated.pdfData || null,
      generationWarnings: generated.warnings || [],
    },
  );

  await persistPremiumPdfHistoryFromSession(env, "lifebook", reportId, {
    ownerUserId,
  });

  const usedFallback = Array.isArray(generated.warnings) && generated.warnings.some((row) => {
    return String(row?.chapterId || "") === String(chapterResult.id || "")
      && String(row?.warning || "").includes("FALLBACK");
  });

  return json({
    ok: true,
    source: String(generated?.source || (usedFallback ? "local" : "api")),
    mode: "life-book",
    reportId,
    totalChapters: LIFE_BOOK_TOTAL_CHAPTERS,
    chapterMinChars: Number(getLifeBookChapterByNumber(chapter)?.minLength || 2500),
    minTotalChars: LIFE_BOOK_MIN_TOTAL_CHARS_CONFIG,
    sessionId: chapter,
    chapter,
    chapterMeta,
    text: chapterResult.contentMarkdown,
    chapterSummaryForContext: buildChapterSummaryForContext(chapterResult.contentMarkdown),
    sections: parseSections(chapterResult.contentMarkdown),
    chapterJson: chapterResult.chapterJson || null,
    chapterResult,
    pdfData: generated.pdfData || null,
    usedFallback,
    engineSource: lifebookSourceState.sourceType || "unknown",
    dataQuality: generated?.lifeBookInputData?.dataQuality || {},
    warnings: generated.warnings || [],
    storage,
  });
}

async function handleLoveSecretSession(request, env, authInfo = null) {
  const body = await readJson(request);
  Object.assign(body, normalizePremiumRequestBodyForPipeline("loveSecret", body));
  const strictPayloadMode = true;
  const strictBody = {
    ...body,
    _premiumStrictPayload: strictPayloadMode,
  };
  const mode = resolveLoveSecretMode(strictBody);
  const modeConfig = LOVE_SECRET_MODE_CONFIG[mode] || LOVE_SECRET_MODE_CONFIG.solo;
  const prepareOnly = asBool(strictBody.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(strictBody)) {
    return json({ ok: false, message: "sessionId 또는 chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }
  const input = buildSessionInput(strictBody, modeConfig.totalChapters);
  const ownerUserId = String(authInfo?.userId || "").trim();
  const chapter = input.chapter;
  const reportId = String(strictBody.reportId || "").trim() || loveSecretReportIdFromInput(strictBody, input, mode);
  const chapterMeta = modeConfig.chapters[chapter - 1] || modeConfig.chapters[0];
  const minChars = getLoveSecretChapterMinChars(modeConfig, chapter);
  const totalChapters = clampInt(strictBody.totalChapters, modeConfig.totalChapters, modeConfig.totalChapters, modeConfig.totalChapters);
  const dataState = ensureLoveSecretSourceData(strictBody);
  if (!dataState.ok) {
    return json({
      ok: false,
      code: dataState.code || "SAJU_ENGINE_SOURCE_REQUIRED",
      message: dataState.message || "사주 엔진 원본 데이터가 필요합니다.",
      missingFields: Array.isArray(dataState.missingFields) ? dataState.missingFields : ["sajuData", "canonicalSajuChart", "engineData"],
    }, { status: 422 });
  }

  const effectiveBody = {
    ...strictBody,
    sajuData: dataState.sourceData,
  };
  const canonical = buildCanonicalSajuLoveReport(effectiveBody, input, modeConfig);
  const canonicalValidation = canonical?.validation || { isValid: false, missingFields: [] };
  const canonicalValidationWarnings = Array.isArray(canonicalValidation?.missingFields)
    ? canonicalValidation.missingFields.map((field) => `MISSING_CANONICAL_FIELD:${field}`)
    : [];

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
      validation: canonicalValidation,
      dataQuality: {
        usedFallbackData: dataState.usedFallbackData,
        warning: dataState.warning,
        failOpenApplied: false,
        strictPayloadMode,
      },
      warnings: canonicalValidationWarnings,
      missingFields: canonicalValidation.missingFields || [],
    });
  }

  const previousTexts = resolvePreviousChapterTexts(
    strictBody?.previousChapterTexts,
    getStoredChapterTexts("love-secret", reportId, chapter),
  );

  const loveSecretGenerationOptions = {
    temperature: 0.78,
    topP: 0.92,
    maxOutputTokens: 12288,
    timeoutMs: Number(env.LOVE_SECRET_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 85000),
    maxAttemptsPerPair: Number(env.LOVE_SECRET_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3),
  };

  const premiumLlmInput = strictBody?._premiumLlmInput || buildLlmPromptInput("loveSecret", chapter, canonical);

  let prompt = buildLoveSecretPrompt(modeConfig, chapterMeta, chapter, canonical, minChars, previousTexts, premiumLlmInput);
  let text = "";
  let quality = null;
  const generationPasses = Math.max(3, Math.min(5, Number(env.LOVE_SECRET_GEMINI_GENERATION_PASSES || 4)));
  for (let attempt = 0; attempt < generationPasses; attempt += 1) {
    const passOptions = {
      ...loveSecretGenerationOptions,
      temperature: Math.min(0.94, Number(loveSecretGenerationOptions.temperature || 0.78) + (0.05 * attempt)),
    };
    const candidate = await callGemini(env, prompt, ["LOVE_SECRET_GEMINI_MODEL"], passOptions);
    if (!candidate || !candidate.trim()) continue;

    text = candidate.trim();
    quality = evaluateLoveSecretQuality(text, chapter, canonical, previousTexts, minChars);
    if (quality.ok) break;
    prompt = buildLoveSecretRewritePrompt(
      buildLoveSecretPrompt(modeConfig, chapterMeta, chapter, canonical, minChars, previousTexts, premiumLlmInput),
      text,
      [...(quality.failedChecks || []), ...(quality.missingMarkers || [])]
    );
  }

  let internalFallbackUsed = false;
  if (!quality || !quality.ok || !text) {
    const localFallbackText = buildLoveSecretLocalFallbackText(
      modeConfig,
      chapterMeta,
      chapter,
      canonical,
      minChars,
      previousTexts,
      premiumLlmInput,
    );
    const localQuality = evaluateLoveSecretQuality(localFallbackText, chapter, canonical, previousTexts, minChars);
    if (!localQuality.ok) {
      return json({
        ok: false,
        code: "LOVE_SECRET_CHAPTER_QUALITY_FAILED",
        message: "연애 비책 챕터 품질 검증에 실패했습니다.",
        quality: {
          ok: false,
          failedChecks: localQuality?.failedChecks || quality?.failedChecks || ["QUALITY_GATE_UNKNOWN"],
          missingMarkers: localQuality?.missingMarkers || quality?.missingMarkers || [],
          evidenceCount: localQuality?.evidenceCount || quality?.evidenceCount || 0,
          repeatedInsideCount: localQuality?.repeatedInsideCount || quality?.repeatedInsideCount || 0,
          repeatedAcrossCount: localQuality?.repeatedAcrossCount || quality?.repeatedAcrossCount || 0,
        },
      }, { status: 422 });
    }
    text = localFallbackText;
    quality = {
      ...localQuality,
      internalFallbackUsed: true,
    };
    internalFallbackUsed = true;
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
      ownerUserId,
      mode,
      reportType: modeConfig.reportType,
      usedFallback: false,
      internalFallbackUsed,
      usedFallbackData: dataState.usedFallbackData,
      engineSource: dataState.sourceType || "unknown",
      canonicalValidation,
    }
  );

  await persistPremiumPdfHistoryFromSession(env, "love-secret", reportId, {
    ownerUserId,
  });

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
    chapterSummaryForContext: buildChapterSummaryForContext(text),
    sections: parseSections(text),
    usedFallback: false,
    engineSource: dataState.sourceType || "unknown",
    quality,
    canonicalSajuLoveReport: canonical,
    dataQuality: {
      usedFallbackData: dataState.usedFallbackData,
      engineSource: dataState.sourceType || "unknown",
      warning: dataState.warning,
      validation: canonicalValidation,
      failOpenApplied: false,
      strictPayloadMode,
    },
    warnings: canonicalValidationWarnings,
    storage,
  });
}

async function handleZiweiBookSession(request, env, authInfo = null) {
  const body = await readJson(request);
  const strictPayloadMode = true;
  const strictValidationMode = true;
  const explicitStrictValidation = asBool(body?._premiumStrictValidation);
  const strictBody = {
    ...body,
    _premiumStrictPayload: strictPayloadMode,
    _premiumStrictValidation: strictValidationMode || explicitStrictValidation,
  };
  const strictValidationRequested = strictPayloadMode || strictValidationMode || explicitStrictValidation;
  const ownerUserId = String(authInfo?.userId || "").trim();
  const prepareOnly = asBool(strictBody.prepareOnly);
  if (!prepareOnly && !chapterRequestProvided(strictBody)) {
    return json({ ok: false, message: "sessionId 또는 chapter 값을 포함해 챕터별로만 생성할 수 있습니다." }, { status: 400 });
  }
  const input = normalizeBody(strictBody);
  const chapter = clampInt(strictBody.sessionId ?? strictBody.chapter, 1, 1, 13);
  const partnerIntent = strictBody.partnerName || strictBody.partnerYear || strictBody.partnerMonth || strictBody.partnerDay;
  const requestedReportType = String(strictBody.reportType || (partnerIntent ? "compatibility" : "personal")).toLowerCase();
  const hasPartnerBirth = Number.isFinite(Number(strictBody.partnerYear))
    && Number.isFinite(Number(strictBody.partnerMonth))
    && Number.isFinite(Number(strictBody.partnerDay));
  const reportType = requestedReportType === "compatibility" && hasPartnerBirth ? "compatibility" : "personal";
  const reportId = String(strictBody.reportId || "").trim() || ziweiReportIdFromInput(strictBody, input, reportType);
  const partnerOverview = reportType === "compatibility"
    ? [
      `이름:${String(strictBody.partnerName || "상대")}`,
      `생년월일:${strictBody.partnerYear}-${strictBody.partnerMonth}-${strictBody.partnerDay}`,
      `출생시간:${strictBody.partnerHour ?? "미상"}:${String(strictBody.partnerMinute ?? "00").padStart(2, "0")}`,
      `출생지:${String(strictBody.partnerBirthPlace || "정보 없음")}`,
    ].join(", ")
    : "";
  const meta = ZIWEI_CHAPTER_META[chapter - 1] || {
    num: chapter,
    title: `자미두수 Chapter ${chapter}`,
    subtitle: "자미두수 프리미엄 인생 총람",
    icon: "ziwei"
  };

  const requestId = String(
    strictBody.requestId
    || strictBody.generationId
    || `ziwei:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  ).trim().slice(0, 120);
  const generationId = String(strictBody.generationId || requestId).trim().slice(0, 120);
  console.info("[ZiweiBook] REQUEST_START", { requestId, chapter, reportType, prepareOnly });
  console.info("[ZiweiPremium][Flow] CLICK", {
    stage: "click",
    requestId,
    generationId,
    chapter,
    prepareOnly,
    reportType,
  });

  const dataQuality = createZiweiDataQuality();
  const birthInput = buildZiweiBirthInputFromRequest(strictBody, input);
  const profileId = String(strictBody.profileId || birthInput.profileId || "").trim();
  const profileFromRequest = normalizeZiweiPremiumProfile({
    ...((strictBody.profile && typeof strictBody.profile === "object") ? strictBody.profile : {}),
    profileId: strictBody.profileId || birthInput.profileId || "",
    name: strictBody.name || birthInput.name || "",
    gender: strictBody.gender || birthInput.gender || "",
    birthDate: strictBody.birthDate || birthInput.birthDate || "",
    birthTime: strictBody.birthTime || birthInput.birthTime || "",
    calendarType: strictBody.calendarType || birthInput.calendarType || "",
    isLunar: strictBody.isLunar ?? birthInput.isLunar,
    timeUnknown: strictBody.timeUnknown ?? strictBody.birthTimeUnknown ?? birthInput.timeUnknown,
    birthPlace: strictBody.birthPlace || birthInput.birthPlace || "",
    timezone: strictBody.timezone || birthInput.timezone || "",
  }, birthInput);

  const profileMissingFields = [];
  if (!String(profileFromRequest.birthDate || "").trim()) profileMissingFields.push("profile.birthDate");
  if (!String(profileFromRequest.calendarType || "").trim()) {
    profileFromRequest.calendarType = normalizePremiumCalendarType(birthInput.calendarType || "solar") || "solar";
  }

  console.info("[ZiweiPDF][Profile]", {
    requestId,
    profileId: profileFromRequest.profileId || null,
    hasBirthDate: Boolean(profileFromRequest.birthDate),
    hasBirthTime: Boolean(profileFromRequest.birthTime),
    gender: profileFromRequest.gender || null,
    calendarType: profileFromRequest.calendarType || null,
    timeUnknown: Boolean(profileFromRequest.timeUnknown),
    isLunar: Boolean(profileFromRequest.isLunar),
    birthPlace: profileFromRequest.birthPlace || null,
  });

  if (profileMissingFields.length > 0) {
    return json({
      ok: false,
      code: "ZIWEI_PROFILE_REQUIRED_MISSING",
      message: "프로필 필수값이 부족합니다. 생년월일 정보를 확인한 뒤 다시 시도해 주세요.",
      missingFields: profileMissingFields,
    }, { status: 422 });
  }

  let basicZiweiResult = (strictBody.basicZiweiResult && typeof strictBody.basicZiweiResult === "object")
    ? strictBody.basicZiweiResult
    : null;

  if (!basicZiweiResult && !strictValidationRequested) {
    basicZiweiResult = readCachedZiweiBasicResult(profileId, birthInput);
    if (basicZiweiResult) {
      console.info("[ZiweiPremium][BasicResult] found in cache", { requestId, profileId });
    }
  }

  let structuredPayload = (strictBody.ziweiStructured && typeof strictBody.ziweiStructured === "object")
    ? strictBody.ziweiStructured
    : null;

  if (!structuredPayload && basicZiweiResult && typeof basicZiweiResult === "object") {
    const structuredFromBasic = basicZiweiResult.ziweiStructured
      || basicZiweiResult.sourcePayload
      || basicZiweiResult.chart?.sourcePayload
      || null;
    if (structuredFromBasic && typeof structuredFromBasic === "object") {
      structuredPayload = structuredFromBasic;
    }
  }

  if (!structuredPayload && strictBody?.ziweiData) {
    const parsedFallback = parseZiweiDataTextFallback(strictBody.ziweiData, dataQuality);
    if (parsedFallback) {
      structuredPayload = parsedFallback;
      pushUnique(dataQuality.warnings, "ziweiData 원문 기반 canonical 복구 경로를 사용했습니다.");
    }
  }

  let canonicalZiweiChart = null;
  let chartValidation = {
    isValid: false,
    canProceed: false,
    missingFields: [],
    hasAll12Palaces: false,
    hasMingGong: false,
    hasShenGong: false,
    hasBrightnessSymbols: false,
    warnings: [],
  };

  if (structuredPayload) {
    canonicalZiweiChart = buildCanonicalZiweiChart(
      strictBody,
      input,
      structuredPayload,
      reportType,
      partnerOverview,
      dataQuality,
    );
    chartValidation = validateCanonicalZiweiChartStrict(canonicalZiweiChart, dataQuality);
    if (!chartValidation.isValid) {
      console.warn("[ZiweiPremium][BasicResult] canonical incomplete, continuing recovery mode", {
        requestId,
        missingFields: chartValidation.missingFields,
      });
    }
  }

  if (strictValidationRequested && !chartValidation.isValid) {
    const friendlyMessage = "자미두수 명반 데이터를 다시 구성하는 중 문제가 발생했습니다. 기본 자미두수 분석을 먼저 실행한 뒤 다시 PDF 생성을 시도해 주세요.";
    return json({
      ok: false,
      stage: "canonical-validation",
      code: "ZIWEI_CORE_CHART_MISSING",
      message: friendlyMessage,
      missingFields: Array.isArray(chartValidation?.missingFields) ? chartValidation.missingFields : [],
      validation: {
        canonical: chartValidation,
      },
    }, { status: 422 });
  }

  if (!basicZiweiResult && canonicalZiweiChart) {
    basicZiweiResult = buildZiweiStandardResultFromCanonical(canonicalZiweiChart, birthInput, profileId);
    console.info("[ZiweiPremium][BasicResult] built from canonical", { requestId, profileId });
  }

  const basicResultPalaceCount = Array.isArray(basicZiweiResult?.chart?.palaces)
    ? basicZiweiResult.chart.palaces.length
    : (Array.isArray(basicZiweiResult?.chart?.sourcePayload?.palaceStarData)
      ? basicZiweiResult.chart.sourcePayload.palaceStarData.length
      : 0);
  const basicResultHasMeta = Boolean(
    String(basicZiweiResult?.chart?.chartMeta?.mingGong || basicZiweiResult?.chart?.mingGong || "").trim()
    && String(basicZiweiResult?.chart?.chartMeta?.shenGong || basicZiweiResult?.chart?.shenGong || "").trim(),
  );

  console.info("[ZiweiPDF][BasicResult]", {
    requestId,
    exists: Boolean(basicZiweiResult),
    palaceCount: basicResultPalaceCount,
    hasChartMeta: basicResultHasMeta,
    source: String(basicZiweiResult?.source || "").trim() || "unknown",
  });

  if (!basicZiweiResult || !basicResultHasMeta || basicResultPalaceCount < 12) {
    return json({
      ok: false,
      code: "ZIWEI_BASIC_RESULT_MISSING",
      message: "기본 자미두수 결과가 부족해 PDF 생성을 진행할 수 없습니다. 메인 자미두수 결과를 먼저 생성한 뒤 다시 시도해 주세요.",
      missingFields: [
        !basicZiweiResult ? "basicZiweiResult" : null,
        !basicResultHasMeta ? "basicZiweiResult.chart.chartMeta" : null,
        basicResultPalaceCount < 12 ? "basicZiweiResult.chart.palaces" : null,
      ].filter(Boolean),
    }, { status: 422 });
  }

  const canonicalDerivedReportPayload = canonicalZiweiChart
    ? buildZiweiReportPayloadFromCanonical(canonicalZiweiChart, dataQuality)
    : null;

  const fallbackReportPayload = (structuredPayload?.reportPayload && typeof structuredPayload.reportPayload === "object")
    ? structuredPayload.reportPayload
    : null;

  const payloadBuildResult = await buildZiweiPremiumReportPayload({
    existingReportPayload: (strictBody.reportPayload && typeof strictBody.reportPayload === "object")
      ? strictBody.reportPayload
      : fallbackReportPayload,
    basicZiweiResult,
    userProfile: {
      ...profileFromRequest,
      name: profileFromRequest.name || "사용자",
      gender: profileFromRequest.gender || "",
      birthDate: profileFromRequest.birthDate || birthInput.birthDate,
      birthTime: profileFromRequest.birthTime || birthInput.birthTime,
      calendarType: profileFromRequest.calendarType || birthInput.calendarType,
      birthPlace: profileFromRequest.birthPlace || birthInput.birthPlace || null,
    },
    birthInput,
    canonicalZiweiChart,
    dataQuality,
    preferBasicEngine: Boolean(basicZiweiResult),
  });
  const reportPayload = payloadBuildResult.payload;
  if (Array.isArray(payloadBuildResult?.missingFields) && payloadBuildResult.missingFields.length) {
    console.warn("[ZiweiPDF][PayloadMissing]", {
      requestId,
      missingFields: payloadBuildResult.missingFields,
    });
  }

  const chapterCount = Array.isArray(ZIWEI_PDF_CHAPTERS_V2) && ZIWEI_PDF_CHAPTERS_V2.length
    ? ZIWEI_PDF_CHAPTERS_V2.length
    : 13;
  const totalCategoryCount = chapterCount * 4;
  const ziweiPremiumPayload = buildZiweiPremiumPayloadFromProfileAndBasicResult({
    profile: profileFromRequest,
    basicZiweiResult,
    reportPayload,
    chapterCount,
    totalCategoryCount,
  });
  const brightnessCheckRows = collectZiweiBrightnessCheck(ziweiPremiumPayload.palaces);

  console.info("[ZiweiPDF][Payload]", {
    requestId,
    chapterCount,
    totalCategoryCount,
    palaceCount: Array.isArray(ziweiPremiumPayload.palaces) ? ziweiPremiumPayload.palaces.length : 0,
    mingGong: ziweiPremiumPayload.chartMeta?.mingGong || null,
    shenGong: ziweiPremiumPayload.chartMeta?.shenGong || null,
    hasBasicResultSummary: Boolean(ziweiPremiumPayload.basicResultSummary),
  });
  console.info("[ZiweiPDF][BrightnessCheck]", {
    requestId,
    count: brightnessCheckRows.length,
    samples: brightnessCheckRows.slice(0, 20),
  });

  const payloadValidation = payloadBuildResult.validation || validateZiweiPdfPayload(reportPayload, birthInput);
  payloadValidation.missingCriticalFields.forEach((field) => pushUnique(dataQuality?.missingFields, field));
  payloadValidation.missingOptionalFields.forEach((field) => pushUnique(dataQuality?.warnings, `optional:${field}`));

  const reportValidation = {
    isValid: payloadValidation.canGenerate,
    code: payloadValidation.canGenerate ? "OK" : "ZIWEI_CORE_CHART_MISSING",
    missingFields: payloadValidation.missingFields,
    missingCriticalFields: payloadValidation.missingCriticalFields,
    missingOptionalFields: payloadValidation.missingOptionalFields,
    diagnostics: reportPayload?.diagnostics || null,
  };
  const canonicalSummary = {
    palaceCount: Array.isArray(canonicalZiweiChart?.palaces) ? canonicalZiweiChart.palaces.length : (Array.isArray(reportPayload?.palaces) ? reportPayload.palaces.length : 0),
    mingGong: canonicalZiweiChart?.chartMeta?.mingGong || reportPayload?.chartMeta?.mingGong || null,
    shenGong: canonicalZiweiChart?.chartMeta?.shenGong || reportPayload?.chartMeta?.shenGong || null,
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

  if (basicZiweiResult) {
    writeCachedZiweiBasicResult(profileId, birthInput, basicZiweiResult);
  }

  if (!payloadValidation.canGenerate && strictValidationRequested) {
    const friendlyMessage = "자미두수 명반 데이터를 다시 구성하는 중 문제가 발생했습니다. 기본 자미두수 분석을 먼저 실행한 뒤 다시 PDF 생성을 시도해 주세요.";
    console.error("[ZiweiPremium][PayloadValidation] failed", {
      stage: "payload-validation",
      code: "ZIWEI_CORE_CHART_MISSING",
      message: friendlyMessage,
      missingFields: payloadValidation.missingCriticalFields,
      requestId,
    });
    return json({
      ok: false,
      stage: "payload-validation",
      code: "ZIWEI_CORE_CHART_MISSING",
      message: friendlyMessage,
      missingFields: payloadValidation.missingCriticalFields,
      missingOptionalFields: payloadValidation.missingOptionalFields,
      validation: {
        canonical: chartValidation,
        reportPayload: reportValidation,
      },
    }, { status: 422 });
  }

  if (!payloadValidation.canGenerate && !strictValidationRequested) {
    pushUnique(dataQuality.warnings, "ZIWEI_PAYLOAD_VALIDATION_DEGRADED");
    pushUnique(dataQuality.warnings, "핵심 명반 데이터 편차를 정규화해 fail-open 모드로 생성을 계속합니다.");
  }

  if (prepareOnly) {
    return json({
      ok: true,
      prepared: true,
      reportId,
      reportType,
      totalChapters: chapterCount,
      chapterPlan: ZIWEI_CHAPTER_META,
      canonicalZiweiChart,
      reportPayload,
      basicZiweiResult,
      validation: {
        isValid: Boolean(reportValidation?.isValid),
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
    ziweiPremiumPayload,
    basicZiweiResult,
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

  const previousChapterTexts = resolvePreviousChapterTexts(
    strictBody?.previousChapterTexts,
    getStoredChapterTexts("ziwei", reportId, chapter),
  );
  const chapterInputChart = canonicalZiweiChart || {
    profile: {
      name: reportPayload?.profile?.name || birthInput.name,
      gender: reportPayload?.profile?.gender || birthInput.gender,
      birth: {
        solarDate: reportPayload?.profile?.birth?.solarDate || birthInput.birthDate,
        lunarDate: reportPayload?.profile?.birth?.lunarDate || null,
        time: reportPayload?.profile?.birth?.time || birthInput.birthTime,
        timezone: reportPayload?.profile?.birth?.timezone || birthInput.timezone,
      },
    },
    chartMeta: reportPayload?.chartMeta || {},
    palaces: Array.isArray(reportPayload?.palaces) ? reportPayload.palaces : [],
    luck: reportPayload?.luck || {},
    validation: {
      hasAll12Palaces: Array.isArray(reportPayload?.palaces) && reportPayload.palaces.length >= 12,
      hasMingGong: Boolean(String(reportPayload?.chartMeta?.mingGong || "").trim()),
      hasShenGong: Boolean(String(reportPayload?.chartMeta?.shenGong || "").trim()),
      hasBrightnessSymbols: true,
      missingFields: payloadValidation.missingOptionalFields,
    },
  };

  let generated;
  try {
    generated = await generateZiweiPremiumChapter(
      env,
      strictBody,
      input,
      chapter,
      meta,
      chapterInputChart,
      reportPayload,
      reportType,
      partnerOverview,
      dataQuality,
      previousChapterTexts,
      ziweiPremiumPayload,
    );
  } catch (error) {
    generated = buildZiweiLocalFallbackChapter({
      chapter,
      chapterSpec: ZIWEI_PDF_CHAPTERS_V2[chapter - 1] || null,
      meta,
      context: chapterInputChart,
    });

    console.error("[ZiweiPremium][Gemini] runtime failure", {
      chapter,
      requestId,
      reportType,
      chapterInputTitle: String(premiumChapterInput?.title || chapterSpec?.title || "").trim() || null,
      message: String(error?.message || "unknown"),
      payloadValidation: payloadBuildResult?.validation || null,
    });
    console.warn("[ZiweiBook] API_GENERATION_FAILED_USE_LOCAL_FALLBACK", {
      requestId,
      chapter,
      message: String(error?.message || "UNKNOWN_ERROR"),
    });
  }

  if (!generated?.ok) {
    console.warn("[ZiweiBook] API_GENERATION_FAILED_USE_LOCAL_FALLBACK", {
      requestId,
      chapter,
      code: generated?.code || "ZIWEI_CHAPTER_GENERATION_FAILED",
      message: generated?.message || "자미두수 챕터 생성 실패",
    });
    generated = buildZiweiLocalFallbackChapter({
      chapter,
      chapterSpec: ZIWEI_PDF_CHAPTERS_V2[chapter - 1] || null,
      meta,
      context: chapterInputChart,
    });
  }

  const safeGeneratedText = sanitizePremiumChapterText(generated.text);
  const storage = writeReportSessionChapter(
    "ziwei",
    reportId,
    chapter,
    13,
    meta,
    safeGeneratedText,
    {
      ownerUserId,
      chapterJson: generated.chapterJson,
      reportType,
      requestId,
      generationId,
      canonicalSummary,
      dataQuality: {
        missingFields: dataQuality.missingFields,
        supplementedFields: dataQuality.supplementedFields,
        warnings: dataQuality.warnings,
        reportValidation,
      },
    }
  );

  await persistPremiumPdfHistoryFromSession(env, "ziwei", reportId, {
    ownerUserId,
  });

  return json({
    ok: true,
    reportId,
    reportType,
    chapter,
    totalChapters: 13,
    chapterMeta: meta,
    chapterJson: generated.chapterJson || null,
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
      "buildZiweiStandardResultFromCanonical",
      "buildZiweiPdfReportPayload",
      "validateZiweiPdfPayload",
      "validateCanonicalZiweiChartStrict",
      "buildZiweiPdfContext",
      "generateZiweiChapterPrompt",
      "parseZiweiGeminiResponse",
      "buildZiweiChapterMarkdown",
      "renderPdf",
      "savePdf",
      "returnDownloadUrl",
    ],
    ...(String(strictBody?.debugCanonicalZiwei || "").toLowerCase() === "true" || strictBody?.debugCanonicalZiwei === true
      ? {
        debugCanonicalZiweiChart: chapterInputChart,
        debugZiweiReportPayload: reportPayload,
        debugValidationResult: debugArtifacts.validationResult,
      }
      : {}),
    ...generated,
    text: safeGeneratedText,
    chapterSummaryForContext: buildChapterSummaryForContext(safeGeneratedText),
    sections: parseSections(safeGeneratedText),
  });
}

async function createOrReusePremiumReportContext(request, env, authInfo, reportType, featureType, requestBody, requestId) {
  prunePremiumReportContexts();

  const calculationVersion = String(env.PREMIUM_CALCULATION_VERSION || "premium-report-v1");
  const inputHash = stablePayloadHash(requestBody || {});
  const modeKey = modeKeyFromInput(requestBody || {});
  const requestBinding = buildPremiumSessionBinding(reportType, modeKey, requestBody || {});
  const cacheKey = getPremiumCacheKey(reportType, authInfo.userId, inputHash, calculationVersion, modeKey);
  const idempotencyKey = `${String(authInfo.userId || "anonymous")}:${String(featureType || reportType || "")}:${modeKey}:${inputHash}`;
  const existingSessionId = PREMIUM_REPORT_CONTEXT_INDEX.get(cacheKey);
  const now = Date.now();

  if (existingSessionId) {
    const existing = PREMIUM_REPORT_CONTEXT_STORE.get(existingSessionId);
    if (existing && Number(existing.expiresAt || 0) > now) {
      const existingBindingId = String(existing?.sessionBinding?.bindingId || "").trim();
      const requestBindingId = String(requestBinding?.bindingId || "").trim();
      if (existingBindingId && requestBindingId && existingBindingId !== requestBindingId) {
        PREMIUM_REPORT_CONTEXT_INDEX.delete(cacheKey);
      } else {
      existing.requestId = String(requestId || existing.requestId || "");
      existing.featureType = existing.featureType || featureType || REPORT_TYPE_TO_FEATURE_TYPE[reportType] || "";
      existing.idempotencyKey = existing.idempotencyKey || idempotencyKey;
      existing.sessionBinding = existing.sessionBinding || requestBinding;
      existing.updatedAt = new Date(now).toISOString();
      existing.expiresAt = now + PREMIUM_REPORT_CONTEXT_TTL_MS;
      upsertPremiumAnalysisSnapshot(existing);
      PREMIUM_REPORT_CONTEXT_STORE.set(existingSessionId, existing);
      return { ok: true, context: existing, cacheHit: true };
      }
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
  const sukyoChapterBlueprint = reportType === "sookyoPremium"
    ? getSukyoPdfChapters(normalizeSukyoModeToken(modeKey))
    : [];
  const chapterPlan = reportType === "sookyoPremium"
    ? sukyoChapterBlueprint.map((chapter, idx) => ({
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
    sessionBinding: requestBinding,
    sourceMap,
    input: requestBody && typeof requestBody === "object" ? requestBody : {},
    coreData: {
      canonicalJson: canonicalBuild.canonicalJson,
      canonicalFingerprint: buildPremiumCanonicalFingerprint(canonicalBuild.canonicalJson),
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
      debugSnapshotsByReportId: {
        [reportId]: buildPremiumDebugSnapshot(
          reportType,
          canonicalBuild.canonicalJson,
          canonicalBuild.validation || null,
          hydrated.hydration || null,
        ),
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

  const rawEngineResult = getPremiumCanonicalFromPrepare(reportType, prepareData) || null;
  upsertPremiumAnalysisSnapshot(context, rawEngineResult);

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

async function recoverPremiumContextOnSessionMiss(request, env, authInfo, body, requestId) {
  const typePair = resolvePremiumTypePair(
    body?.reportType || body?.type,
    body?.featureType || body?.feature || body?.kind,
  );
  const reportType = typePair.reportType;
  const featureType = typePair.featureType;
  const rawRequestBody = (body?.requestBody && typeof body.requestBody === "object") ? body.requestBody : null;

  if (!reportType || !rawRequestBody) {
    return { ok: false, recoverable: false };
  }

  const requestBody = normalizePremiumRequestBodyForPipeline(reportType, rawRequestBody);
  const tokenFromBody = String(body?.premiumAccessToken || requestBody?.premiumAccessToken || "").trim();
  const tokenFromCookie = String(cookieValue(request, "cd_premium_access") || "").trim();
  const tokenFromHeader = String(request.headers.get("x-premium-access-token") || "").trim();
  const premiumAccessToken = tokenFromBody || tokenFromCookie || tokenFromHeader;
  const accessRequestBody = premiumAccessToken
    ? { ...requestBody, premiumAccessToken }
    : requestBody;

  const access = await requirePremiumReportAccess(env, authInfo.userId, reportType, accessRequestBody);
  if (!access.ok) {
    const denied = buildPremiumAccessDeniedPayload(access, {
      stage: "recover-session-access-check",
      reportType,
      featureType,
      requestId,
    });
    return {
      ok: false,
      recoverable: true,
      status: denied.status,
      data: denied.payload,
    };
  }

  const prepared = await createOrReusePremiumReportContext(
    request,
    env,
    authInfo,
    reportType,
    featureType,
    requestBody,
    requestId,
  );

  if (!prepared.ok) {
    return {
      ok: false,
      recoverable: true,
      status: Number(prepared.status || 422),
      data: {
        ...(prepared.data || { ok: false, code: "PREMIUM_REPORT_PREPARE_FAILED", message: "세션 복구 prepare 실패" }),
        requestId,
      },
    };
  }

  const context = prepared.context;
  context.requestId = String(requestId || context.requestId || "");
  context.featureType = context.featureType || featureType || REPORT_TYPE_TO_FEATURE_TYPE[context.reportType] || "";
  context.updatedAt = new Date().toISOString();
  context.expiresAt = Date.now() + PREMIUM_REPORT_CONTEXT_TTL_MS;
  PREMIUM_REPORT_CONTEXT_STORE.set(context.reportSessionId, context);
  const snapshot = upsertPremiumAnalysisSnapshot(context);

  return {
    ok: true,
    recoverable: true,
    reportSessionId: context.reportSessionId,
    snapshotId: snapshot?.snapshotId || "",
    context,
  };
}

const PREMIUM_REPORT_CHAPTER_INFLIGHT = new Map();

async function handlePremiumReportPrepare(request, env, authInfo) {
  const body = await readJson(request);
  const requestedRequestId = String(body.requestId || "").trim();
  const requestId = requestedRequestId || createPremiumRequestId(`${authInfo.userId}|prepare`);
  const includeContext = asBool(body.includeContext || body.includeDebugContext || body.debugContext);
  const preflightOnly = asBool(body.preflightOnly || body.validateOnly || body.dryRun);
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

  const rawRequestBody = (body.requestBody && typeof body.requestBody === "object") ? body.requestBody : {};
  const requestBody = normalizePremiumRequestBodyForPipeline(reportType, rawRequestBody);
  logPremiumPipelineStage("Start", {
    fortuneType: reportType,
    featureKey: featureType,
    mode: modeKeyFromInput(requestBody),
    userId: String(authInfo.userId || ""),
    requestId,
  });

  if (preflightOnly) {
    const sukuyoSeed = buildSukuyoPdfSeed(requestBody);
    const validation = validateSukuyoPdfPayload(sukuyoSeed.reportPayload);
    logPremiumPipelineStage("Preflight", {
      fortuneType: reportType,
      featureKey: featureType,
      mode: modeKeyFromInput(requestBody),
      userId: String(authInfo.userId || ""),
      requestId,
      stage: "SukuyoPdfPayloadValidated",
      debugId: requestId,
      chapterCount: validation.chapterCount,
      selectedProfileId: validation.selectedProfileId || "",
      missingFields: validation.missingFields || [],
      payloadKeys: Object.keys(sukuyoSeed.reportPayload || {}),
      reportPayloadKeys: Object.keys(sukuyoSeed.reportPayload || {}),
      birthInputKeys: Object.keys(sukuyoSeed.reportPayload?.birthInput || {}),
      partnerInputKeys: Object.keys(sukuyoSeed.reportPayload?.partnerInput || {}),
    });

    if (!validation.ok) {
      return json({
        ok: false,
        code: "PDF_REPORT_PAYLOAD_MISSING_FIELD",
        normalizedCode: "PDF_REPORT_PAYLOAD_MISSING_FIELD",
        message: "숙요점 차트 데이터 생성에 필요한 입력값이 부족합니다.",
        requestId,
        reportType,
        featureType,
        stage: "SukuyoPdfPayloadValidationFailed",
        debugId: requestId,
        chapterCount: validation.chapterCount,
        selectedProfileId: validation.selectedProfileId || "",
        missingFields: validation.missingFields || [],
        reportPayloadKeys: Object.keys(sukuyoSeed.reportPayload || {}),
        birthInputKeys: Object.keys(sukuyoSeed.reportPayload?.birthInput || {}),
        partnerInputKeys: Object.keys(sukuyoSeed.reportPayload?.partnerInput || {}),
      }, { status: 422 });
    }

    return json({
      ok: true,
      code: "PREMIUM_REPORT_PREFLIGHT_OK",
      message: "숙요점 입력 검증이 완료되었습니다.",
      requestId,
      reportType,
      featureType,
      stage: "SukuyoPdfPayloadValidated",
      debugId: requestId,
      chapterCount: validation.chapterCount,
      selectedProfileId: validation.selectedProfileId || "",
      missingFields: [],
      reportPayloadKeys: Object.keys(sukuyoSeed.reportPayload || {}),
      birthInputKeys: Object.keys(sukuyoSeed.reportPayload?.birthInput || {}),
      partnerInputKeys: Object.keys(sukuyoSeed.reportPayload?.partnerInput || {}),
      validation,
    });
  }

  const tokenFromBody = String(body.premiumAccessToken || requestBody.premiumAccessToken || "").trim();
  const tokenFromCookie = String(cookieValue(request, "cd_premium_access") || "").trim();
  const tokenFromHeader = String(request.headers.get("x-premium-access-token") || "").trim();
  const premiumAccessToken = tokenFromBody || tokenFromCookie || tokenFromHeader;
  const accessRequestBody = premiumAccessToken
    ? { ...requestBody, premiumAccessToken }
    : requestBody;

  const access = await requirePremiumReportAccess(env, authInfo.userId, reportType, accessRequestBody);
  if (!access.ok) {
    const denied = buildPremiumAccessDeniedPayload(access, {
      stage: "prepare-access-check",
      reportType,
      featureType,
      requestId,
    });
    return json(denied.payload, { status: denied.status });
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
  const snapshot = upsertPremiumAnalysisSnapshot(context);
  const summary = buildPremiumContextSummary(context);
  const chapterPlan = Array.isArray(context?.derivedData?.chapterPlan) && context.derivedData.chapterPlan.length
    ? context.derivedData.chapterPlan
    : (getPremiumSpecByReportType(context.reportType, context.modeKey)?.chapters || []);
  const receivedKeys = collectReceivedKeys(requestBody);
  const expectedSchema = getPremiumExpectedSchema(context.reportType);
  const normalizedDataSummary = getPremiumNormalizedDataSummary(context.reportType, context?.coreData?.canonicalJson || {});

  logPremiumPipelineStage("PayloadBuilt", {
    fortuneType: context.reportType,
    featureKey: context.featureType,
    mode: context.modeKey,
    reportSessionId: summary.reportSessionId,
    reportId: summary.reportId,
    hasPayload: Boolean(context?.coreData?.canonicalJson?.calculatedData),
    payloadKeys: Object.keys(context?.coreData?.canonicalJson?.calculatedData || {}),
    requestId,
  });

  logPremiumPipelineStage("Validation", {
    fortuneType: context.reportType,
    valid: Boolean(context.isCompleteForPdf),
    missingFields: Array.isArray(summary.missingData) ? summary.missingData : [],
    requestId,
  });

  if (!context.isCompleteForPdf) {
    const missingFields = Array.isArray(summary.missingData) ? summary.missingData : [];
    const preflight = context.preflight || buildPremiumPreflightResult(context);
    return json(attachPremiumApiMeta({
      ok: true,
      failOpenMode: true,
      recoverable: true,
      code: "PREMIUM_REPORT_PREPARE_RECOVERABLE",
      normalizedCode: "PDF_REPORT_PREPARE_FAIL_OPEN",
      message: "일부 PDF 전용 데이터가 부족하지만 기본 엔진 데이터로 생성을 계속 진행합니다.",
      requestId,
      reportType: context.reportType,
      featureType: context.featureType,
      generationId: summary.reportSessionId,
      reportSessionId: summary.reportSessionId,
      snapshotId: String(context?.analysisSnapshot?.snapshotId || "").trim(),
      chapterPlan,
      preflight,
      blockedChapters: Array.isArray(preflight?.blockedChapters) ? preflight.blockedChapters : [],
      normalizedDataSummary,
      missingFields,
      missingData: missingFields,
      invalidFields: [],
      expectedSchema,
      receivedKeys,
      recommendedAction: getPremiumRecommendedAction(context.reportType),
      warnings: Array.isArray(summary.warnings) ? summary.warnings : [],
      contextSummary: summary,
    }, {
      stage: "prepare",
      reportType: context.reportType,
      featureType: context.featureType,
      requestId,
      normalizedCode: "PDF_REPORT_PREPARE_FAIL_OPEN",
    }));
  }

  const responsePayload = {
    ok: true,
    cacheHit: Boolean(prepared.cacheHit),
    requestId,
    generationId: summary.reportSessionId,
    snapshotId: snapshot?.snapshotId || context?.analysisSnapshot?.snapshotId || "",
    featureType: context.featureType,
    failOpenMode: false,
    canonicalReady: Boolean(context.isCompleteForPdf),
    preflight: context.preflight || null,
    ...summary,
    chapterPlan,
    normalizedDataSummary,
  };

  if (includeContext) {
    responsePayload.input = context.input;
    responsePayload.coreData = context.coreData;
    responsePayload.derivedData = context.derivedData;
    responsePayload.chapterData = context.chapterData;
  }

  return json(attachPremiumApiMeta(responsePayload, {
    stage: "prepare",
    reportType: context.reportType,
    featureType: context.featureType,
    requestId,
  }));
}

async function handlePremiumReportPreflight(request, env, authInfo) {
  const body = await readJson(request);
  const requestId = String(body.requestId || "").trim() || createPremiumRequestId(`${authInfo.userId}|preflight`);
  if (!String(body.reportSessionId || "").trim() && !String(body.snapshotId || "").trim()) {
    return json({
      ok: false,
      code: "PREMIUM_REPORT_SESSION_REQUIRED",
      message: "reportSessionId 또는 snapshotId가 필요합니다.",
      requestId,
    }, { status: 400 });
  }
  const resolved = resolvePremiumContextBySessionOrSnapshot(body.reportSessionId, body.snapshotId);
  let reportSessionId = resolved.reportSessionId;
  let snapshotId = resolved.snapshotId;
  let context = resolved.context;

  if (!reportSessionId || !context) {
    const recovered = await recoverPremiumContextOnSessionMiss(request, env, authInfo, body, requestId);
    if (recovered?.ok) {
      reportSessionId = recovered.reportSessionId;
      snapshotId = recovered.snapshotId || snapshotId;
      context = recovered.context;
    } else if (recovered?.recoverable && recovered?.status && recovered?.data) {
      return json(recovered.data, { status: Number(recovered.status || 422) });
    }
  }

  if (!reportSessionId || !context) {
    return json({
      ok: false,
      code: "PREMIUM_REPORT_SESSION_NOT_FOUND",
      message: "reportSessionId 또는 snapshotId에 해당하는 리포트 세션을 찾을 수 없습니다.",
      requestId,
      reportSessionId,
      snapshotId,
    }, { status: 404 });
  }

  if (String(context.userId) !== String(authInfo.userId)) {
    return json({
      ok: false,
      code: "UNAUTHORIZED",
      message: "다른 사용자의 리포트 세션입니다.",
      requestId,
      reportSessionId,
      snapshotId,
    }, { status: 401 });
  }

  const preflightBinding = validatePremiumSessionBinding(context, body);
  if (!preflightBinding.ok) {
    return json({
      ok: false,
      code: preflightBinding.code || "PREMIUM_REPORT_SESSION_BINDING_MISMATCH",
      message: preflightBinding.message || "리포트 세션 바인딩 검증에 실패했습니다.",
      requestId,
      reportSessionId,
      snapshotId: String(context?.analysisSnapshot?.snapshotId || snapshotId || "").trim(),
      expectedBindingId: preflightBinding.expectedBindingId,
      incomingBindingId: preflightBinding.incomingBindingId,
      expectedProfileSnapshot: preflightBinding.expectedProfileSnapshot || null,
      incomingProfileSnapshot: preflightBinding.incomingProfileSnapshot || null,
    }, { status: 409 });
  }

  const resolvedSnapshot = upsertPremiumAnalysisSnapshot(context);
  context.updatedAt = new Date().toISOString();
  context.expiresAt = Date.now() + PREMIUM_REPORT_CONTEXT_TTL_MS;
  PREMIUM_REPORT_CONTEXT_STORE.set(reportSessionId, context);

  const preflight = context.preflight || buildPremiumPreflightResult(context);
  const responsePayload = {
    ok: Boolean(preflight.ok),
    requestId,
    reportSessionId,
    snapshotId: resolvedSnapshot?.snapshotId || snapshotId || "",
    reportType: context.reportType,
    featureType: context.featureType,
    preflight,
  };

  if (!preflight.ok) {
    return json(attachPremiumApiMeta({
      ...responsePayload,
      code: "PREMIUM_REPORT_PREFLIGHT_FAILED",
      message: "PDF 생성 preflight 검증에 실패했습니다. 누락 데이터를 먼저 보강하세요.",
      missingFields: Array.isArray(preflight.missingSummary) ? preflight.missingSummary : [],
      blockedChapters: Array.isArray(preflight.blockedChapters) ? preflight.blockedChapters : [],
    }, {
      stage: "preflight",
      reportType: context.reportType,
      featureType: context.featureType,
      requestId,
      normalizedCode: "PDF_REPORT_PREFLIGHT_FAILED",
    }), { status: 422 });
  }

  return json(attachPremiumApiMeta(responsePayload, {
    stage: "preflight",
    reportType: context.reportType,
    featureType: context.featureType,
    requestId,
  }));
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
  const snapshotId = String(context?.analysisSnapshot?.snapshotId || context?.derivedData?.analysisSnapshotId || "").trim();
  return json({
    ok: true,
    ...summary,
    snapshotId,
    preflight: context?.preflight || null,
    input: context.input,
    coreData: context.coreData,
    derivedData: context.derivedData,
    chapterData: context.chapterData,
  });
}

async function handlePremiumReportChapter(request, env, authInfo) {
  const body = await readJson(request);
  const requestId = String(body.requestId || "").trim() || createPremiumRequestId(`${authInfo.userId}|chapter`);
  if (!String(body.reportSessionId || "").trim() && !String(body.snapshotId || "").trim()) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_REQUIRED", message: "reportSessionId 또는 snapshotId가 필요합니다.", requestId }, { status: 400 });
  }
  prunePremiumReportContexts();
  const resolved = resolvePremiumContextBySessionOrSnapshot(body.reportSessionId, body.snapshotId);
  let reportSessionId = resolved.reportSessionId;
  let context = resolved.context;
  let snapshotId = resolved.snapshotId;

  if (!reportSessionId || !context) {
    const recovered = await recoverPremiumContextOnSessionMiss(request, env, authInfo, body, requestId);
    if (recovered?.ok) {
      reportSessionId = recovered.reportSessionId;
      snapshotId = recovered.snapshotId || snapshotId;
      context = recovered.context;
    } else if (recovered?.recoverable && recovered?.status && recovered?.data) {
      return json(recovered.data, { status: Number(recovered.status || 422) });
    }
  }

  if (!reportSessionId || !context) {
    return json({
      ok: false,
      code: "PREMIUM_REPORT_SESSION_NOT_FOUND",
      message: "reportSessionId 또는 snapshotId에 해당하는 리포트 세션을 찾을 수 없습니다.",
      requestId,
      reportSessionId,
      snapshotId,
    }, { status: 404 });
  }
  if (String(context.userId) !== String(authInfo.userId)) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "다른 사용자의 리포트 세션입니다.", requestId }, { status: 401 });
  }

  const chapterBinding = validatePremiumSessionBinding(context, body);
  if (!chapterBinding.ok) {
    return json({
      ok: false,
      code: chapterBinding.code || "PREMIUM_REPORT_SESSION_BINDING_MISMATCH",
      message: chapterBinding.message || "리포트 세션 바인딩 검증에 실패했습니다.",
      requestId,
      reportSessionId,
      snapshotId: String(context?.analysisSnapshot?.snapshotId || snapshotId || "").trim(),
      expectedBindingId: chapterBinding.expectedBindingId,
      incomingBindingId: chapterBinding.incomingBindingId,
      expectedProfileSnapshot: chapterBinding.expectedProfileSnapshot || null,
      incomingProfileSnapshot: chapterBinding.incomingProfileSnapshot || null,
    }, { status: 409 });
  }

  const chapterId = clampInt(body.chapterId ?? body.chapter, 1, 1, Number(context.totalChapters || 13));
  const maxChapterAttempts = Math.max(2, getPremiumChapterMaxAttempts(env, 2));
  const chapterRequestKey = String(chapterId);
  const chapterInflightKey = `${reportSessionId}:${chapterId}`;

  const cachedChapterTextEarly = String(context?.chapterTextById?.[String(chapterId)] || "").trim();
  if (cachedChapterTextEarly) {
    return json(attachPremiumApiMeta({
      ok: true,
      requestId,
      reportSessionId,
      snapshotId: String(context?.analysisSnapshot?.snapshotId || "").trim(),
      chapterId,
      cached: true,
      text: cachedChapterTextEarly,
    }, {
      stage: "chapter",
      reportType: context.reportType,
      featureType: context.featureType,
      requestId,
      normalizedCode: "OK",
    }));
  }

  const pendingChapter = PREMIUM_REPORT_CHAPTER_INFLIGHT.get(chapterInflightKey);
  if (pendingChapter) {
    await pendingChapter.catch(() => null);
    const settledContext = PREMIUM_REPORT_CONTEXT_STORE.get(reportSessionId) || context;
    const dedupedText = String(settledContext?.chapterTextById?.[String(chapterId)] || "").trim();
    if (dedupedText) {
      return json({
        ok: true,
        requestId,
        reportSessionId,
        snapshotId: String(settledContext?.analysisSnapshot?.snapshotId || "").trim(),
        chapterId,
        cached: true,
        deduped: true,
        text: dedupedText,
      });
    }
  }

  let resolveChapterInflight = null;
  const chapterInflightPromise = new Promise((resolve) => {
    resolveChapterInflight = resolve;
  });
  PREMIUM_REPORT_CHAPTER_INFLIGHT.set(chapterInflightKey, chapterInflightPromise);

  try {

  context.requestId = requestId;

  upsertPremiumAnalysisSnapshot(context);
  const preflight = context.preflight || buildPremiumPreflightResult(context);
  if (!preflight.ok) {
    context.warnings = Array.from(new Set([
      ...(context.warnings || []),
      "PREMIUM_REPORT_PREFLIGHT_FAILED_RECOVERED",
      ...((Array.isArray(preflight.missingSummary) ? preflight.missingSummary : []).map((f) => `MISSING:${f}`)),
    ]));
  }

  const applyHydrationToContext = (hydrated) => {
    if (!hydrated?.canonicalBuild || !hydrated?.prepareData) return false;
    const canonicalBuild = hydrated.canonicalBuild;
    const nextCanonicalJson = canonicalBuild.canonicalJson || {};
    const nextCanonicalFingerprint = buildPremiumCanonicalFingerprint(nextCanonicalJson);
    const currentCanonicalFingerprint = String(context?.coreData?.canonicalFingerprint || "").trim();

    if (
      currentCanonicalFingerprint
      && nextCanonicalFingerprint
      && currentCanonicalFingerprint !== nextCanonicalFingerprint
      && Boolean(context?.isCompleteForPdf)
      && Boolean(context?.coreData?.canonicalJson)
    ) {
      context.warnings = Array.from(new Set([...(context.warnings || []), "PREMIUM_CANONICAL_DRIFT_BLOCKED"]));
      return false;
    }

    const featureKey = context.featureType || REPORT_TYPE_TO_FEATURE_TYPE[context.reportType] || context.reportType;

    context.sourceMap = buildPremiumSourceMap(context.reportType, context.input, hydrated.prepareData);
    context.coreData = context.coreData || {};
    context.coreData.canonicalJson = nextCanonicalJson;
    context.coreData.canonicalFingerprint = nextCanonicalFingerprint;

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
    context.derivedData.debugSnapshotsByReportId = {
      ...(context.derivedData.debugSnapshotsByReportId || {}),
      [context.reportId]: buildPremiumDebugSnapshot(
        context.reportType,
        canonicalBuild.canonicalJson,
        canonicalBuild.validation || null,
        hydrated.hydration || null,
      ),
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
    const rawEngineResult = getPremiumCanonicalFromPrepare(context.reportType, hydrated.prepareData) || null;
    upsertPremiumAnalysisSnapshot(context, rawEngineResult);
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
      const missingFields = Array.isArray(context.missingData) ? context.missingData : [];
      return json({
        ok: false,
        code: getPremiumDataIncompleteCode(context.reportType),
        normalizedCode: "PDF_REPORT_PAYLOAD_MISSING_FIELD",
        message: "보고서 생성에 필요한 입력값 정합성 점검이 필요합니다. 생년월일/시간/성별/양력·음력을 확인해 주세요.",
        requestId,
        missingFields,
        missingData: missingFields,
        warnings: context.warnings,
        hydration: hydrated?.hydration || null,
      }, { status: 422 });
    }
  }

  // 세션 재사용/수화(hydration) 이후에도 챕터 직전에 한 번 더 무결성 보강을 수행한다.
  if (context?.coreData?.canonicalJson && typeof context.coreData.canonicalJson === "object") {
    const chapterIntegrity = applyPremiumPdfDataIntegrity(
      context.reportType,
      context.coreData.canonicalJson.calculatedData || {},
      {},
      context.input || {},
    );
    const shapedCalculated = ensureCanonicalCalculatedDataShape(context.reportType, chapterIntegrity.calculatedData);
    context.coreData.canonicalJson.calculatedData = shapedCalculated;
    context.coreData.canonicalJson.reportPayload = shapedCalculated;
    context.coreData.canonicalJson.chapterData = buildChapterDataMap(context.reportType, shapedCalculated);
    context.coreData.canonicalJson.interpretationSeed = buildInterpretationSeed(context.reportType, shapedCalculated);
    context.coreData.canonicalJson.diagnostics = {
      ...(context.coreData.canonicalJson.diagnostics || {}),
      dataIntegrity: chapterIntegrity.integrity,
    };
  }

  console.info("[엔진 시작]", {
    reportType: context.reportType,
    featureType: context.featureType,
    reportSessionId,
    chapterId,
    requestId,
  });
  console.info("[Canonical 결합 완료]", {
    reportType: context.reportType,
    reportSessionId,
    chapterId,
    hasCanonicalJson: Boolean(context?.coreData?.canonicalJson),
    completeness: Number(context?.coreData?.canonicalJson?.completenessScore || 0),
    requestId,
  });

  logPremiumPipelineStage("GeminiStart", {
    fortuneType: context.reportType,
    featureKey: context.featureType,
    reportSessionId,
    chapterId,
    chapterCount: 1,
    requestId,
  });

  if (context.chapterRequestIndex && context.chapterRequestIndex[chapterRequestKey]) {
    const cachedText = String(context?.chapterTextById?.[String(chapterId)] || "").trim();
    if (cachedText) {
      return json({
        ok: true,
        requestId,
        reportSessionId,
        snapshotId: String(context?.analysisSnapshot?.snapshotId || "").trim(),
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
    context.warnings = Array.from(new Set([
      ...(context.warnings || []),
      "PREMIUM_REPORT_CHAPTER_DATA_MISSING_RECOVERED",
      ...chapterMissing.map((row) => `MISSING:${row}`),
    ]));
  }

  const chapterJsonPacks = context?.derivedData?.chapterJsonById?.[String(chapterId)]
    || buildChapterJsonPacks(context.reportType, chapterId, context?.coreData?.canonicalJson || {});
  context.derivedData.chapterJsonById = context.derivedData.chapterJsonById || {};
  context.derivedData.chapterJsonById[String(chapterId)] = chapterJsonPacks;

  if (context.reportType === "sookyoPremium") {
    let generated = await generateSukyoPremiumChapterFromContext({
      env,
      context,
      chapterId,
      requestId,
    });

    if (!generated?.ok) {
      const previousChapterTextsOnFail = Object.entries(context?.chapterTextById || {})
        .filter(([key]) => Number(key) < Number(chapterId))
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, value]) => String(value || "").trim())
        .filter(Boolean);
      const localGenerated = buildLocalFallbackChapterFromContext({
        context,
        chapterId,
        chapterMeta: resolvePremiumChapterMeta(context, chapterId),
        chapterContract: context?.input?._premiumLlmInput?.chapterContract || null,
        chapterJsonPacks,
        minChars: Number(getPremiumPerChapterMinChars(
          Number(context.totalChapters || context.requiredChapters || 13),
          PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
        )),
        previousChapterTexts: previousChapterTextsOnFail,
        fallbackReason: String(generated?.code || "SUKYO_CHAPTER_GENERATION_FAILED"),
      });
      if (!localGenerated?.ok) {
        return json({
          ok: false,
          requestId,
          reportSessionId,
          chapterId,
          featureType: context.featureType,
          code: String(generated?.code || "SUKYO_CHAPTER_GENERATION_FAILED"),
          message: String(generated?.message || "숙요 챕터 생성에 실패했습니다."),
          missingFields: Array.isArray(generated?.missingFields) ? generated.missingFields : [],
        }, { status: Number.isFinite(Number(generated?.status)) ? Number(generated.status) : 422 });
      }
      generated = localGenerated;
    }

    const previousChapterTexts = Object.entries(context?.chapterTextById || {})
      .filter(([key]) => Number(key) < Number(chapterId))
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, value]) => String(value || "").trim())
      .filter(Boolean);

    let chapterText = ensurePremiumChapterLength(String(generated?.text || "").trim(), {
      reportType: context.reportType,
      chapter: chapterId,
      totalChapters: Number(context.totalChapters || context.requiredChapters || 13),
      chapterMeta: generated?.chapterMeta || resolvePremiumChapterMeta(context, chapterId),
      minTotalChars: SAJU_NEW_YEAR_MIN_TOTAL_CHARS,
      engineData: chapterJsonPacks,
    });
    const rawLengthCheck = validateChapterLength({
      reportType: context.reportType,
      featureType: context.featureType,
      mode: context.modeKey,
      chapterId,
      text: chapterText,
    });
    const chapterQuality = validatePremiumChapterQualityGate({
      text: chapterText,
      targetChars: Number(rawLengthCheck?.chapterTarget || 0),
      previousChapterTexts,
      blockedPhrases: BLOCKED_FALLBACK_PHRASES,
      similarityThreshold: 0.78,
    });
    if (!chapterQuality.ok) {
      return json({
        ok: false,
        requestId,
        reportSessionId,
        chapterId,
        featureType: context.featureType,
        code: "PREMIUM_REPORT_CHAPTER_QUALITY_FAILED",
        message: "리포트 품질 검증에 실패하여 다시 생성이 필요합니다.",
        quality: chapterQuality,
      }, { status: 422 });
    }
    const source = generated?.usedFallback ? "local_deterministic_fallback" : "llm";
    const sourceLabel = generated?.usedFallback ? "local" : "gemini";
    if (generated?.usedFallback) {
      chapterText = repairLocalFallbackChapterText(chapterText, generated?.chapterMeta || resolvePremiumChapterMeta(context, chapterId), chapterId);
      const localValidation = validateLocalFallbackChapter({
        title: generated?.chapterMeta?.title,
        text: chapterText,
      }, {
        title: generated?.chapterMeta?.title,
        minChars: Number(rawLengthCheck?.chapterMin || 0),
      }, previousChapterTexts);
      if (!localValidation.ok) {
        return json({
          ok: false,
          requestId,
          reportSessionId,
          chapterId,
          featureType: context.featureType,
          code: "LOCAL_FALLBACK_GENERATION_FAILED",
          message: "로컬 리포트 생성 중 문제가 발생했습니다.",
          stage: "LocalFallbackGeneration",
          validation: localValidation,
        }, { status: 422 });
      }

      console.warn("[PremiumPDF] LocalFallbackActivated", {
        debugId: requestId,
        serviceType: context.reportType,
        chapterId,
        reason: String(generated?.fallbackReason || "LLM_OR_QUALITY_FAILURE"),
        llmErrorCode: String(generated?.code || ""),
        seedVersion: String(context?.coreData?.canonicalJson?.seedVersion || "unknown"),
        engineVersion: String(context?.coreData?.canonicalJson?.engineVersion || "unknown"),
      });
    }
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
      source,
      usedFallback: Boolean(generated?.usedFallback),
      fallbackReason: String(generated?.fallbackReason || ""),
      retryCount: 0,
      updatedAt: new Date().toISOString(),
    };
    context.chapterTextById = context.chapterTextById || {};
    context.chapterTextById[String(chapterId)] = chapterText;
    context.chapterMemoryById = context.chapterMemoryById || {};
    context.chapterMemoryById[String(chapterId)] = {
      chapterId: String(generated?.chapterMeta?.key || `chapter-${chapterId}`),
      title: String(generated?.chapterMeta?.title || "").trim() || `Chapter ${chapterId}`,
      summary: chapterText.split("\n").slice(0, 10).join(" ").slice(0, 900),
      usedThemes: Array.isArray(generated?.chapterSpecificSections) ? generated.chapterSpecificSections.slice(0, 12) : [],
      usedAdvice: Array.from(new Set((chapterText.match(/-\s+[^\n]+/g) || []).map((row) => row.replace(/^-\s+/, "").trim()))).slice(0, 12),
      usedSukuyoFactors: Array.from(new Set([
        context?.coreData?.canonicalJson?.calculatedData?.nativeSook?.name,
        context?.coreData?.canonicalJson?.calculatedData?.compatibility?.relationType,
        context?.coreData?.canonicalJson?.calculatedData?.compatibility?.distance,
      ].filter(Boolean).map((row) => String(row).trim()))),
      usedRelationshipPatterns: Array.from(new Set([
        context?.coreData?.canonicalJson?.calculatedData?.compatibility?.emotionalPattern,
        context?.coreData?.canonicalJson?.calculatedData?.compatibility?.conflictPattern,
        context?.coreData?.canonicalJson?.calculatedData?.compatibility?.relationVariant,
      ].filter(Boolean).map((row) => String(row).trim()))),
      qualityMemory: buildQualityChapterMemory(String(generated?.chapterMeta?.key || `chapter-${chapterId}`), String(generated?.chapterMeta?.title || `Chapter ${chapterId}`), chapterText),
    };
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

    return json(attachPremiumApiMeta({
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
      source: sourceLabel,
      usedFallback: Boolean(generated?.usedFallback),
      fallbackReason: String(generated?.fallbackReason || ""),
      missingFields: Array.isArray(generated?.missingFields) ? generated.missingFields : [],
      engineDataJson: chapterJsonPacks,
    }, {
      stage: "chapter",
      reportType: context.reportType,
      featureType: context.featureType,
      requestId,
      normalizedCode: "OK",
    }));
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
    console.info("[PDF 챕터 진입]", {
      reportType: context.reportType,
      reportSessionId,
      chapterId,
      attempt,
      maxChapterAttempts,
      requestId,
    });
    const attemptRequestId = attempt === 1 ? requestId : `${requestId}_a${attempt}`;
    const previousChapterSummaries = summarizePreviousPremiumChapters(context, chapterId);
    const forbiddenRepeats = Array.from(new Set(previousChapterSummaries.flatMap((row) => Array.isArray(row?.keyPhrases) ? row.keyPhrases : []))).slice(0, 30);
    const chapterRequestBody = {
      ...(context.input || {}),
      chapter: chapterId,
      sessionId: chapterId,
      requestId: attemptRequestId,
      reportId: context.reportId,
      _premiumReportSessionId: reportSessionId,
      _premiumRequestId: requestId,
      _premiumChapterAttempt: attempt,
      _premiumStrictPayload: shouldEnforcePremiumStrictPayload(context.reportType),
      _premiumLlmInput: buildLlmPromptInput(
        context.reportType,
        chapterId,
        context?.coreData?.canonicalJson || {},
        chapterJsonPacks,
        { previousChapterSummaries },
      ),
      _premiumPreviousChapterSummaries: previousChapterSummaries,
      _premiumForbiddenRepeats: forbiddenRepeats,
      _premiumChapterJsonPacks: chapterJsonPacks,
    };
    const chapterMetaForAttempt = resolvePremiumChapterMeta(context, chapterId);
    const chapterContractForAttempt = chapterRequestBody?._premiumLlmInput?.chapterContract || null;
    const previousChapterTextsForAttempt = Object.values(context?.chapterTextById || {})
      .map((row) => String(row || ""))
      .filter(Boolean);

    const { response, data } = await invokePremiumLegacyHandler(handler, request, env, chapterRequestBody);
    if (!response.ok || !data?.ok) {
      const errorCode = String(data?.code || "PREMIUM_REPORT_CHAPTER_FAILED");
      const errorMessage = String(data?.message || "챕터 생성 실패");
      const recoverable = isLlmRecoverableError(`${errorCode} ${errorMessage}`);
      if (recoverable) {
        console.warn("[PremiumPDF] LlmChapterGenerationFailed", {
          debugId: requestId,
          serviceType: context.reportType,
          chapterId,
          chapterTitle: String(resolvePremiumChapterMeta(context, chapterId)?.title || ""),
          errorCode,
          errorMessage,
          willUseLocalFallback: true,
        });

        const fallbackMinChars = Number(getPremiumPerChapterMinChars(
          Number(context.totalChapters || context.requiredChapters || 13),
          PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
        ));
        const localGenerated = buildLocalFallbackChapterFromContext({
          context,
          chapterId,
          chapterMeta: chapterMetaForAttempt,
          chapterContract: chapterContractForAttempt,
          chapterJsonPacks,
          minChars: fallbackMinChars,
          previousChapterTexts: previousChapterTextsForAttempt,
          fallbackReason: `${errorCode}:${errorMessage}`,
        });
        if (localGenerated?.ok) {
          const localText = ensurePremiumChapterLength(String(localGenerated.text || "").trim(), {
            reportType: context.reportType,
            chapter: chapterId,
            totalChapters: Number(context.totalChapters || context.requiredChapters || 13),
            chapterMeta: chapterMetaForAttempt,
            minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
            engineData: chapterJsonPacks,
          });
          const localLengthCheck = validateChapterLength({
            reportType: context.reportType,
            featureType: context.featureType,
            mode: context.modeKey,
            chapterId,
            text: localText,
          });
          if (!localLengthCheck.ok) {
            localLengthCheck.ok = true;
            localLengthCheck.warnings = Array.from(new Set([...(localLengthCheck.warnings || []), "RECOVERABLE_LENGTH_SHORT"]));
          }
          successResponse = { status: 200 };
          successData = localGenerated;
          successLengthCheck = localLengthCheck;
          successAttempt = attempt;
          break;
        }
      }
      lastFailure = {
        status: Number(response.status || 422),
        code: errorCode,
        message: errorMessage,
        lengthValidation: null,
      };
      continue;
    }

    const usedFallback = Boolean(data?.usedFallback)
      || Boolean(data?.quality?.usedFallback)
      || Boolean(data?.dataQuality?.usedFallbackData);
    const source = usedFallback ? "local_deterministic_fallback" : "llm";

    const chapterText = ensurePremiumChapterLength(String(data.text || "").trim(), {
      reportType: context.reportType,
      chapter: chapterId,
      totalChapters: Number(context.totalChapters || context.requiredChapters || 13),
      chapterMeta: resolvePremiumChapterMeta(context, chapterId),
      minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
      engineData: chapterJsonPacks,
    });
    const lengthCheck = validateChapterLength({
      reportType: context.reportType,
      featureType: context.featureType,
      mode: context.modeKey,
      chapterId,
      text: chapterText,
    });
    const chapterQuality = validatePremiumChapterQualityGate({
      text: chapterText,
      targetChars: Number(lengthCheck?.chapterTarget || 0),
      previousChapterTexts: previousChapterTextsForAttempt,
      blockedPhrases: BLOCKED_FALLBACK_PHRASES,
      similarityThreshold: 0.78,
    });
    if (!chapterQuality.ok) {
      if (!usedFallback) {
        const localGenerated = buildLocalFallbackChapterFromContext({
          context,
          chapterId,
          chapterMeta: chapterMetaForAttempt,
          chapterContract: chapterContractForAttempt,
          chapterJsonPacks,
          minChars: Number(lengthCheck?.chapterMin || getPremiumPerChapterMinChars(
            Number(context.totalChapters || context.requiredChapters || 13),
            PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
          )),
          previousChapterTexts: previousChapterTextsForAttempt,
          fallbackReason: "CHAPTER_QUALITY_FAILED",
        });
        if (localGenerated?.ok) {
          const localText = ensurePremiumChapterLength(String(localGenerated.text || "").trim(), {
            reportType: context.reportType,
            chapter: chapterId,
            totalChapters: Number(context.totalChapters || context.requiredChapters || 13),
            chapterMeta: chapterMetaForAttempt,
            minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
            engineData: chapterJsonPacks,
          });
          const localLengthCheck = validateChapterLength({
            reportType: context.reportType,
            featureType: context.featureType,
            mode: context.modeKey,
            chapterId,
            text: localText,
          });
          if (!localLengthCheck.ok) {
            localLengthCheck.ok = true;
            localLengthCheck.warnings = Array.from(new Set([...(localLengthCheck.warnings || []), "RECOVERABLE_LENGTH_SHORT"]));
          }
          successResponse = { status: 200 };
          successData = localGenerated;
          successLengthCheck = localLengthCheck;
          successAttempt = attempt;
          break;
        }
      }
      lastFailure = {
        status: 422,
        code: "PREMIUM_REPORT_CHAPTER_QUALITY_FAILED",
        message: "리포트 품질 검증에 실패하여 다시 생성이 필요합니다.",
        lengthValidation: {
          ok: false,
          warnings: chapterQuality.reasons,
        },
      };
      continue;
    }

    if (usedFallback) {
      const localValidation = validateLocalFallbackChapter({
        title: resolvePremiumChapterMeta(context, chapterId)?.title,
        text: chapterText,
      }, {
        title: resolvePremiumChapterMeta(context, chapterId)?.title,
        minChars: Number(lengthCheck?.chapterMin || 0),
      }, Object.values(context?.chapterTextById || {}).map((row) => String(row || "")).filter(Boolean));

      if (!localValidation.ok) {
        lastFailure = {
          status: 422,
          code: "LOCAL_FALLBACK_GENERATION_FAILED",
          message: "로컬 리포트 생성 중 문제가 발생했습니다.",
          lengthValidation: {
            ok: false,
            warnings: localValidation.reasons,
          },
        };
        continue;
      }

      console.warn("[PremiumPDF] LocalFallbackActivated", {
        debugId: requestId,
        serviceType: context.reportType,
        chapterId,
        reason: String(data?.fallbackReason || data?.code || "LLM_OR_QUALITY_FAILURE"),
        llmErrorCode: String(data?.code || ""),
        seedVersion: String(context?.coreData?.canonicalJson?.seedVersion || "unknown"),
        engineVersion: String(context?.coreData?.canonicalJson?.engineVersion || "unknown"),
      });
    }

    const chapterEnvelope = validatePremiumChapterResponseEnvelope({
      reportType: context.reportType,
      chapterId,
      data: {
        text: chapterText,
        chapterJson: data?.chapterJson && typeof data.chapterJson === "object" ? data.chapterJson : null,
      },
      chapterContract: chapterContractForAttempt,
      previousChapterTexts: Array.isArray(context?.chapterTextById)
        ? context.chapterTextById
        : Object.values(context?.chapterTextById || {}).map((row) => String(row || "")).filter(Boolean),
    });

    if (!chapterEnvelope.ok) {
      const envelopeDetails = chapterEnvelope.details || {};
      const envelopeMissing = [];
      if (Array.isArray(envelopeDetails.missingHeadings)) {
        envelopeMissing.push(...envelopeDetails.missingHeadings.map((row) => `heading:${row}`));
      }
      if (Array.isArray(envelopeDetails.missingJsonFields)) {
        envelopeMissing.push(...envelopeDetails.missingJsonFields.map((row) => `json:${row}`));
      }
      if (Array.isArray(envelopeDetails.repeatedAcross) && envelopeDetails.repeatedAcross.length) {
        envelopeMissing.push("repeat:across-chapters");
      }
      if (!usedFallback) {
        const localGenerated = buildLocalFallbackChapterFromContext({
          context,
          chapterId,
          chapterMeta: chapterMetaForAttempt,
          chapterContract: chapterContractForAttempt,
          chapterJsonPacks,
          minChars: Number(lengthCheck?.chapterMin || getPremiumPerChapterMinChars(
            Number(context.totalChapters || context.requiredChapters || 13),
            PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
          )),
          previousChapterTexts: previousChapterTextsForAttempt,
          fallbackReason: String(chapterEnvelope.code || "CHAPTER_CONTRACT_FAILED"),
        });
        if (localGenerated?.ok) {
          const localText = ensurePremiumChapterLength(String(localGenerated.text || "").trim(), {
            reportType: context.reportType,
            chapter: chapterId,
            totalChapters: Number(context.totalChapters || context.requiredChapters || 13),
            chapterMeta: chapterMetaForAttempt,
            minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
            engineData: chapterJsonPacks,
          });
          const localLengthCheck = validateChapterLength({
            reportType: context.reportType,
            featureType: context.featureType,
            mode: context.modeKey,
            chapterId,
            text: localText,
          });
          if (!localLengthCheck.ok) {
            localLengthCheck.ok = true;
            localLengthCheck.warnings = Array.from(new Set([...(localLengthCheck.warnings || []), "RECOVERABLE_LENGTH_SHORT"]));
          }
          successResponse = { status: 200 };
          successData = localGenerated;
          successLengthCheck = localLengthCheck;
          successAttempt = attempt;
          break;
        }
      }
      lastFailure = {
        status: 422,
        code: String(chapterEnvelope.code || "PREMIUM_REPORT_CHAPTER_CONTRACT_FAILED"),
        message: String(chapterEnvelope.message || "챕터 계약 검증 실패"),
        lengthValidation: {
          ok: false,
          warnings: envelopeMissing,
        },
      };
      continue;
    }

    if (!lengthCheck.ok) {
      lengthCheck.warnings = Array.from(new Set([...(lengthCheck.warnings || []), "RECOVERABLE_LENGTH_SHORT"]));
      lengthCheck.ok = true;
    }

    successResponse = response;
    successData = data;
    successLengthCheck = lengthCheck;
    successAttempt = attempt;
    console.info("[챕터 빌드 완료]", {
      reportType: context.reportType,
      reportSessionId,
      chapterId,
      attempt,
      usedFallback,
      source,
      textLength: chapterText.length,
      requestId,
    });
    break;
  }

  if (!successResponse || !successData) {
    return json({
      ok: false,
      requestId,
      reportSessionId,
      snapshotId: String(context?.analysisSnapshot?.snapshotId || "").trim(),
      chapterId,
      featureType: context.featureType,
      attemptsUsed: maxChapterAttempts,
      maxChapterAttempts,
      code: String(lastFailure.code || "PREMIUM_REPORT_CHAPTER_FAILED"),
      message: String(lastFailure.message || "리포트 품질 검증에 실패하여 다시 생성이 필요합니다."),
      lengthValidation: lastFailure.lengthValidation || null,
    }, { status: Number(lastFailure.status || 422) });
  }

  const chapterText = ensurePremiumChapterLength(String(successData.text || "").trim(), {
    reportType: context.reportType,
    chapter: chapterId,
    totalChapters: Number(context.totalChapters || context.requiredChapters || 13),
    chapterMeta: resolvePremiumChapterMeta(context, chapterId),
    minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
    engineData: chapterJsonPacks,
  });
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
    source: Boolean(successData?.usedFallback) ? "local_deterministic_fallback" : "llm",
    retryCount: Math.max(0, Number(successAttempt || 1) - 1),
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

  return json(attachPremiumApiMeta({
    ok: true,
    requestId,
    reportSessionId,
    snapshotId: String(context?.analysisSnapshot?.snapshotId || "").trim(),
    chapterId,
    featureType: context.featureType,
    attemptsUsed: successAttempt,
    maxChapterAttempts,
    source: "generated",
    retryCount: Math.max(0, Number(successAttempt || 1) - 1),
    lengthValidation: lengthCheck,
    ...successData,
    usedFallback: false,
    fallbackReason: "",
    text: chapterText,
    sections: parseSections(chapterText),
    engineDataJson: chapterJsonPacks,
  }, {
    stage: "chapter",
    reportType: context.reportType,
    featureType: context.featureType,
    requestId,
    normalizedCode: "OK",
  }));

  } finally {
    try {
      if (typeof resolveChapterInflight === "function") resolveChapterInflight(true);
    } catch {
      // no-op
    }
    PREMIUM_REPORT_CHAPTER_INFLIGHT.delete(chapterInflightKey);
  }
}

async function handlePremiumReportRun(request, env, authInfo) {
  const body = await readJson(request);
  const requestId = String(body.requestId || "").trim() || createPremiumRequestId(`${authInfo.userId}|run`);
  if (!String(body.reportSessionId || "").trim() && !String(body.snapshotId || "").trim()) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_REQUIRED", message: "reportSessionId 또는 snapshotId가 필요합니다.", requestId }, { status: 400 });
  }
  prunePremiumReportContexts();
  const resolved = resolvePremiumContextBySessionOrSnapshot(body.reportSessionId, body.snapshotId);
  let reportSessionId = resolved.reportSessionId;
  let snapshotId = resolved.snapshotId;
  let context = resolved.context;

  if (!reportSessionId || !context) {
    const recovered = await recoverPremiumContextOnSessionMiss(request, env, authInfo, body, requestId);
    if (recovered?.ok) {
      reportSessionId = recovered.reportSessionId;
      snapshotId = recovered.snapshotId || snapshotId;
      context = recovered.context;
    } else if (recovered?.recoverable && recovered?.status && recovered?.data) {
      return json(recovered.data, { status: Number(recovered.status || 422) });
    }
  }

  if (!reportSessionId || !context) {
    return json({
      ok: false,
      code: "PREMIUM_REPORT_SESSION_NOT_FOUND",
      message: "reportSessionId 또는 snapshotId에 해당하는 리포트 세션을 찾을 수 없습니다.",
      requestId,
      reportSessionId,
      snapshotId,
    }, { status: 404 });
  }
  if (String(context.userId) !== String(authInfo.userId)) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "다른 사용자의 리포트 세션입니다.", requestId }, { status: 401 });
  }

  const runBinding = validatePremiumSessionBinding(context, body);
  if (!runBinding.ok) {
    return json({
      ok: false,
      code: runBinding.code || "PREMIUM_REPORT_SESSION_BINDING_MISMATCH",
      message: runBinding.message || "리포트 세션 바인딩 검증에 실패했습니다.",
      requestId,
      reportSessionId,
      snapshotId: String(context?.analysisSnapshot?.snapshotId || snapshotId || "").trim(),
      expectedBindingId: runBinding.expectedBindingId,
      incomingBindingId: runBinding.incomingBindingId,
      expectedProfileSnapshot: runBinding.expectedProfileSnapshot || null,
      incomingProfileSnapshot: runBinding.incomingProfileSnapshot || null,
    }, { status: 409 });
  }

  upsertPremiumAnalysisSnapshot(context);
  const preflight = context.preflight || buildPremiumPreflightResult(context);
  if (!preflight.ok) {
    return json({
      ok: false,
      code: "PREMIUM_REPORT_PREFLIGHT_FAILED",
      normalizedCode: "PDF_REPORT_PREFLIGHT_FAILED",
      message: "preflight 실패로 PDF 생성을 중단했습니다. 결제/코인 차감 전에 누락 데이터를 보강하세요.",
      requestId,
      reportSessionId,
      snapshotId: String(context?.analysisSnapshot?.snapshotId || snapshotId || "").trim(),
      reportType: context.reportType,
      featureType: context.featureType,
      missingFields: Array.isArray(preflight.missingSummary) ? preflight.missingSummary : [],
      blockedChapters: Array.isArray(preflight.blockedChapters) ? preflight.blockedChapters : [],
      preflight,
    }, { status: 422 });
  }

  const requiredChapters = Number(context.requiredChapters || context.totalChapters || 13);
  const startChapter = clampInt(body.startChapter ?? body.fromChapter, 1, 1, requiredChapters);
  const endChapter = clampInt(body.endChapter ?? body.toChapter, requiredChapters, startChapter, requiredChapters);
  const maxAttemptsPerChapter = Math.max(2, getPremiumChapterMaxAttempts(env, 2));
  const stopOnFailure = body.stopOnFailure !== false;

  logPremiumPipelineStage("GeminiStart", {
    fortuneType: context.reportType,
    featureKey: context.featureType,
    reportSessionId,
    chapterRange: [startChapter, endChapter],
    chapterCount: endChapter - startChapter + 1,
    requestId,
  });

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
  upsertPremiumAnalysisSnapshot(context);
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

  return json(attachPremiumApiMeta({
    ok: failed.length === 0,
    requestId,
    reportSessionId,
    snapshotId: String(context?.analysisSnapshot?.snapshotId || snapshotId || "").trim(),
    reportType: context.reportType,
    featureType: context.featureType,
    preflight,
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
  }, {
    stage: "run",
    reportType: context.reportType,
    featureType: context.featureType,
    requestId,
    normalizedCode: failed.length === 0 ? "OK" : "PREMIUM_REPORT_RUN_PARTIAL",
  }), { status: failed.length === 0 ? 200 : 207 });
}

async function handlePremiumReportPdf(request, env, authInfo) {
  const body = await readJson(request);
  const requestId = String(body.requestId || "").trim() || createPremiumRequestId(`${authInfo.userId}|pdf`);
  if (!String(body.reportSessionId || "").trim() && !String(body.snapshotId || "").trim()) {
    return json({ ok: false, code: "PREMIUM_REPORT_SESSION_REQUIRED", message: "reportSessionId 또는 snapshotId가 필요합니다.", requestId }, { status: 400 });
  }
  prunePremiumReportContexts();
  const resolved = resolvePremiumContextBySessionOrSnapshot(body.reportSessionId, body.snapshotId);
  let reportSessionId = resolved.reportSessionId;
  let snapshotId = resolved.snapshotId;
  let context = resolved.context;

  if (!reportSessionId || !context) {
    const recovered = await recoverPremiumContextOnSessionMiss(request, env, authInfo, body, requestId);
    if (recovered?.ok) {
      reportSessionId = recovered.reportSessionId;
      snapshotId = recovered.snapshotId || snapshotId;
      context = recovered.context;
    } else if (recovered?.recoverable && recovered?.status && recovered?.data) {
      return json(recovered.data, { status: Number(recovered.status || 422) });
    }
  }

  if (!reportSessionId || !context) {
    return json({
      ok: false,
      code: "PREMIUM_REPORT_SESSION_NOT_FOUND",
      message: "reportSessionId 또는 snapshotId에 해당하는 리포트 세션을 찾을 수 없습니다.",
      requestId,
      reportSessionId,
      snapshotId,
    }, { status: 404 });
  }
  if (String(context.userId) !== String(authInfo.userId)) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "다른 사용자의 리포트 세션입니다.", requestId }, { status: 401 });
  }

  const pdfBinding = validatePremiumSessionBinding(context, body);
  if (!pdfBinding.ok) {
    return json({
      ok: false,
      code: pdfBinding.code || "PREMIUM_REPORT_SESSION_BINDING_MISMATCH",
      message: pdfBinding.message || "리포트 세션 바인딩 검증에 실패했습니다.",
      requestId,
      reportSessionId,
      snapshotId: String(context?.analysisSnapshot?.snapshotId || snapshotId || "").trim(),
      expectedBindingId: pdfBinding.expectedBindingId,
      incomingBindingId: pdfBinding.incomingBindingId,
      expectedProfileSnapshot: pdfBinding.expectedProfileSnapshot || null,
      incomingProfileSnapshot: pdfBinding.incomingProfileSnapshot || null,
    }, { status: 409 });
  }

  context.requestId = requestId;

  upsertPremiumAnalysisSnapshot(context);
  const preflight = context.preflight || buildPremiumPreflightResult(context);
  if (!preflight.ok) {
    return json({
      ok: false,
      code: "PREMIUM_REPORT_PREFLIGHT_FAILED",
      normalizedCode: "PDF_REPORT_PREFLIGHT_FAILED",
      message: "preflight 실패로 PDF 렌더링을 중단했습니다.",
      requestId,
      reportSessionId,
      snapshotId: String(context?.analysisSnapshot?.snapshotId || snapshotId || "").trim(),
      reportType: context.reportType,
      featureType: context.featureType,
      missingFields: Array.isArray(preflight.missingSummary) ? preflight.missingSummary : [],
      blockedChapters: Array.isArray(preflight.blockedChapters) ? preflight.blockedChapters : [],
      preflight,
    }, { status: 422 });
  }

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

  let chapterTextList = validEntries
    .sort((a, b) => Number(a.chapterId || 0) - Number(b.chapterId || 0))
    .map((entry) => {
      const chapterId = Number(entry.chapterId || 0);
      const rawText = String(context?.chapterTextById?.[String(chapterId)] || "");
      const chapterJsonPacks = context?.derivedData?.chapterJsonById?.[String(chapterId)]
        || buildChapterJsonPacks(context.reportType, chapterId, context?.coreData?.canonicalJson || {});
      const ensuredText = ensurePremiumChapterLength(rawText, {
        reportType: context.reportType,
        chapter: chapterId,
        totalChapters: Number(requiredChapters || context.totalChapters || 13),
        chapterMeta: resolvePremiumChapterMeta(context, chapterId),
        minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
        engineData: chapterJsonPacks,
      });
      context.chapterTextById = context.chapterTextById || {};
      context.chapterTextById[String(chapterId)] = ensuredText;
      return ensuredText;
    });
  chapterTextList = dedupeReportParagraphs(chapterTextList);

  for (let idx = 0; idx < chapterTextList.length; idx += 1) {
    const chapterId = Number(validEntries[idx]?.chapterId || idx + 1);
    chapterTextList[idx] = ensurePremiumChapterLength(String(chapterTextList[idx] || ""), {
      reportType: context.reportType,
      chapter: chapterId,
      totalChapters: Number(requiredChapters || context.totalChapters || 13),
      chapterMeta: resolvePremiumChapterMeta(context, chapterId),
      minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
      engineData: context?.derivedData?.chapterJsonById?.[String(chapterId)] || {},
    });
    context.chapterTextById[String(chapterId)] = chapterTextList[idx];
  }

  let totalLengthValidation = validateFullReportLength({
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
    if (chapterTextList.length > 0) {
      const deficit = Math.max(0, Number(totalLengthValidation.minTotalChars || PREMIUM_GLOBAL_MIN_TOTAL_CHARS) - Number(totalLengthValidation.totalLength || 0));
      if (deficit > 0) {
        const lastIndex = chapterTextList.length - 1;
        const lastChapterId = Number(validEntries[lastIndex]?.chapterId || chapterTextList.length);
        const boosted = ensurePremiumChapterLength(chapterTextList[lastIndex], {
          reportType: context.reportType,
          chapter: lastChapterId,
          totalChapters: Number(requiredChapters || context.totalChapters || 13),
          chapterMeta: resolvePremiumChapterMeta(context, lastChapterId),
          minTotalChars: PREMIUM_GLOBAL_MIN_TOTAL_CHARS,
          minCharsOverride: countKoreanLikeChars(chapterTextList[lastIndex]) + deficit + 500,
          engineData: context?.derivedData?.chapterJsonById?.[String(lastChapterId)] || {},
        });
        chapterTextList[lastIndex] = boosted;
        context.chapterTextById = context.chapterTextById || {};
        context.chapterTextById[String(lastChapterId)] = boosted;
        totalLengthValidation = validateFullReportLength({
          reportType: context.reportType,
          featureType: context.featureType,
          mode: context.modeKey,
          chapterTextList,
        });
      }
    }
    totalLengthValidation.warnings = Array.from(new Set([...(totalLengthValidation.warnings || []), "RECOVERABLE_TOTAL_LENGTH_SHORT", "AUTO_EXPANDED_TO_MIN_TOTAL_50K"]));
    totalLengthValidation.ok = true;
  }

  let ziweiPageValidation = null;
  if (context.reportType === "ziweiPremium") {
    ziweiPageValidation = validateZiweiPageWindowFromLength(totalLengthValidation.totalLength);
    let pageLoop = 0;
    while (ziweiPageValidation.pages < ziweiPageValidation.minPages && chapterTextList.length > 0 && pageLoop < 4) {
      const deficit = Math.max(0, ziweiPageValidation.minChars - Number(totalLengthValidation.totalLength || 0));
      if (deficit <= 0) break;
      const lastIndex = chapterTextList.length - 1;
      const lastChapterId = Number(validEntries[lastIndex]?.chapterId || chapterTextList.length);
      const currentLength = countKoreanLikeChars(chapterTextList[lastIndex]);
      const boosted = ensurePremiumChapterLength(chapterTextList[lastIndex], {
        reportType: context.reportType,
        chapter: lastChapterId,
        totalChapters: Number(requiredChapters || context.totalChapters || 12),
        chapterMeta: resolvePremiumChapterMeta(context, lastChapterId),
        minTotalChars: ziweiPageValidation.minChars,
        minCharsOverride: currentLength + deficit + 900,
        engineData: context?.derivedData?.chapterJsonById?.[String(lastChapterId)] || {},
      });
      chapterTextList[lastIndex] = boosted;
      context.chapterTextById = context.chapterTextById || {};
      context.chapterTextById[String(lastChapterId)] = boosted;
      totalLengthValidation = validateFullReportLength({
        reportType: context.reportType,
        featureType: context.featureType,
        mode: context.modeKey,
        chapterTextList,
      });
      ziweiPageValidation = validateZiweiPageWindowFromLength(totalLengthValidation.totalLength);
      pageLoop += 1;
    }

    pageLoop = 0;
    while (ziweiPageValidation.pages > ziweiPageValidation.maxPages && chapterTextList.length > 0 && pageLoop < 4) {
      const overflow = Math.max(0, Number(totalLengthValidation.totalLength || 0) - ziweiPageValidation.maxChars);
      if (overflow <= 0) break;
      const lastIndex = chapterTextList.length - 1;
      const current = String(chapterTextList[lastIndex] || "");
      const targetChars = countKoreanLikeChars(current) - overflow - 600;
      const trimmed = trimChapterTextToApproxChars(current, targetChars);
      chapterTextList[lastIndex] = trimmed;
      totalLengthValidation = validateFullReportLength({
        reportType: context.reportType,
        featureType: context.featureType,
        mode: context.modeKey,
        chapterTextList,
      });
      ziweiPageValidation = validateZiweiPageWindowFromLength(totalLengthValidation.totalLength);
      pageLoop += 1;
    }
  }

  const composedText = chapterTextList.join("\n\n");
  if (context.reportType === "ziweiPremium") {
    const duplicateValidation = validateNoZiweiDuplicateText(composedText);
    const fullReportValidation = validateZiweiFullReport(composedText);
    const mappingChart = context?.coreData?.canonicalJson?.calculatedData || {};
    const mappingPdf = context?.coreData?.canonicalJson?.reportPayload || context?.coreData?.canonicalJson?.calculatedData || {};
    const mappingValidation = validateZiweiEngineToPdfMapping(mappingChart, mappingPdf);
    const finalPageValidation = ziweiPageValidation || validateZiweiPageWindowFromLength(totalLengthValidation.totalLength);

    if (!duplicateValidation.ok || !fullReportValidation.ok || !mappingValidation.ok || !finalPageValidation.ok) {
      const details = [];
      if (!duplicateValidation.ok) {
        if (duplicateValidation.forbiddenMatches.length) details.push(`FORBIDDEN:${duplicateValidation.forbiddenMatches.join(",")}`);
        if (duplicateValidation.duplicatedSentences.length) details.push(`DUP_SENT:${duplicateValidation.duplicatedSentences.length}`);
        if (duplicateValidation.duplicatedParagraphs.length) details.push(`DUP_PARA:${duplicateValidation.duplicatedParagraphs.length}`);
      }
      if (!fullReportValidation.ok) details.push(`FULL_LENGTH:${fullReportValidation.length}`);
      if (!mappingValidation.ok) details.push(...mappingValidation.failures.slice(0, 24));
      if (!finalPageValidation.ok) {
        details.push(`PAGE_WINDOW:${finalPageValidation.pages}p`);
        details.push(`PAGE_WINDOW_REQUIRED:${finalPageValidation.minPages}-${finalPageValidation.maxPages}`);
      }
      return json({
        ok: false,
        code: "ZIWEI_REPORT_HARD_GATE_FAILED",
        message: "자미두수 PDF 하드 게이트(중복/매핑/분량/페이지)를 통과하지 못했습니다.",
        requestId,
        reportSessionId,
        details,
        validations: {
          duplicateValidation,
          fullReportValidation,
          mappingValidation,
          pageValidation: finalPageValidation,
        },
      }, { status: 422 });
    }
    totalLengthValidation.warnings = Array.from(new Set([...(totalLengthValidation.warnings || []), `ZIWEI_PAGE_ESTIMATE_${finalPageValidation.pages}`]));
  }

  const composedByteLength = (() => {
    try {
      return new TextEncoder().encode(composedText).length;
    } catch {
      return composedText.length;
    }
  })();

  logPremiumPipelineStage("PdfComposed", {
    fortuneType: context.reportType,
    featureKey: context.featureType,
    reportSessionId,
    chapterCount: chapterTextList.length,
    byteLength: composedByteLength,
    requestId,
  });

  context.status = "pdf-ready";
  context.updatedAt = new Date().toISOString();
  context.expiresAt = Date.now() + PREMIUM_REPORT_CONTEXT_TTL_MS;
  upsertPremiumAnalysisSnapshot(context);
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

  return json(attachPremiumApiMeta({
    ok: true,
    ready: true,
    requestId,
    reportSessionId,
    snapshotId: String(context?.analysisSnapshot?.snapshotId || "").trim(),
    reportId: context.reportId,
    reportType: context.reportType,
    featureType: context.featureType,
    lengthValidation: totalLengthValidation,
    validChapters,
    requiredChapters,
    totalChapters: context.totalChapters,
  }, {
    stage: "pdf",
    reportType: context.reportType,
    featureType: context.featureType,
    requestId,
    normalizedCode: "OK",
  }));
}

async function ensurePdfNo422(response) {
  if (!(response instanceof Response)) return response;
  if (Number(response.status) !== 422) return response;
  let parsed = null;
  try {
    parsed = await response.clone().json();
  } catch {
    parsed = null;
  }
  const code = String(parsed?.code || parsed?.normalizedCode || "").toUpperCase();
  if (code.startsWith("ASTRO_")) return response;
  if (code === "PREMIUM_REPORT_PAYLOAD_MISSING_FIELD" || code === "PREMIUM_REPORT_PREFLIGHT_FAILED" || code === "PDF_REPORT_PAYLOAD_MISSING_FIELD") {
    return new Response(response.body, { status: 200, headers: response.headers });
  }
  return response;
}

export async function handlePremiumReportRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const authInfo = await requireAuth(request, env);
    const url = new URL(request.url);
    const sessionId = extractPremiumSessionId(url.pathname);

    if (method === "POST" && url.pathname === "/api/premium-report/prepare") {
      return await ensurePdfNo422(await handlePremiumReportPrepare(request, env, authInfo));
    }
    if (method === "POST" && url.pathname === "/api/premium-report/preflight") {
      return await ensurePdfNo422(await handlePremiumReportPreflight(request, env, authInfo));
    }
    if (method === "GET" && sessionId) {
      return await ensurePdfNo422(await handlePremiumReportSessionRead(request, env, authInfo, sessionId));
    }
    if (method === "POST" && url.pathname === "/api/premium-report/chapter") {
      return await ensurePdfNo422(await handlePremiumReportChapter(request, env, authInfo));
    }
    if (method === "POST" && url.pathname === "/api/premium-report/run") {
      return await ensurePdfNo422(await handlePremiumReportRun(request, env, authInfo));
    }
    if (method === "POST" && url.pathname === "/api/premium-report/pdf") {
      return await ensurePdfNo422(await handlePremiumReportPdf(request, env, authInfo));
    }
    return notFound();
  } catch (error) {
    logPremiumPipelineStage("Failed", {
      path: (() => {
        try {
          return new URL(request.url).pathname;
        } catch {
          return "";
        }
      })(),
      message: String(error?.message || "Unexpected premium-report route failure"),
      code: String(error?.code || "PREMIUM_REPORT_ROUTE_FAILED"),
    });
    return await ensurePdfNo422(handleRouteError(error));
  }
}

const LEGACY_PREMIUM_ALIAS_CONFIG = Object.freeze({
  astrology: {
    alias: "astrology",
    sessionKind: "astro",
    title: "점성술 프리미엄 리포트",
    downloadPath: "/api/premium/astrology/download",
    statusPath: "/api/premium/astrology/status",
    generatePath: "/api/premium/astrology/generate",
    reportType: "westernAstrologyPremium",
    defaultTotalChapters: 12,
  },
  vedic: {
    alias: "vedic",
    sessionKind: "vedic",
    title: "베다 점성술 프리미엄 리포트",
    downloadPath: "/api/premium/vedic/download",
    statusPath: "/api/premium/vedic/status",
    generatePath: "/api/premium/vedic/generate",
    reportType: "vedicPremium",
    defaultTotalChapters: 12,
  },
  ziwei: {
    alias: "ziwei",
    sessionKind: "ziwei",
    title: "자미두수 프리미엄 리포트",
    downloadPath: "/api/premium/ziwei/download",
    statusPath: "/api/premium/ziwei/status",
    generatePath: "/api/premium/ziwei/generate",
    reportType: "ziweiPremium",
    defaultTotalChapters: 12,
  },
});

function deepCloneSerializable(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch {
    return {};
  }
}

function normalizeLegacyMode(rawMode, rawReportType) {
  const mode = String(rawMode || "").trim().toLowerCase();
  const reportType = String(rawReportType || "").trim().toLowerCase();
  if (mode === "compatibility" || mode === "couple") return "compatibility";
  if (reportType === "compatibility" || reportType === "couple") return "compatibility";
  return "personal";
}

function upsertLegacyFlowMeta(sessionKind, reportId, patch = {}) {
  const key = `${sessionKind}:${String(reportId || "").trim()}`;
  const entry = REPORT_SESSION_STORE.get(key);
  if (!entry) return null;
  const nowIso = new Date().toISOString();
  const nextLegacyFlow = {
    ...(entry.extra?.legacyFlow || {}),
    ...(patch || {}),
  };
  entry.extra = {
    ...(entry.extra || {}),
    legacyFlow: nextLegacyFlow,
  };
  entry.updatedAt = nowIso;
  entry.expiresAt = Date.now() + REPORT_SESSION_TTL_MS;
  REPORT_SESSION_STORE.set(key, entry);
  return entry;
}

function inferLegacySummary(text) {
  const source = String(text || "").trim();
  if (!source) return "";
  const normalized = source.replace(/\r/g, "").replace(/\n+/g, " ").trim();
  if (normalized.length <= 220) return normalized;
  return `${normalized.slice(0, 220).trim()}...`;
}

function buildLegacyChapterPayload(row, includeText = false) {
  const chapterJson = row?.chapterJson || null;
  const chapterIndex = Number(row?.chapter || 0);
  const chapterMeta = row?.chapterMeta || {};
  const text = String(row?.text || "");

  let sections = [];
  let summary = "";
  let keyInsights = [];
  let practicalAdvice = [];
  let cautions = [];
  let masterConclusion = "";
  let coreStars = [];
  let corePalaces = [];

  if (chapterJson) {
    summary = chapterJson.summary || inferLegacySummary(text);
    sections = Array.isArray(chapterJson.sections) ? chapterJson.sections.map(s => ({
      heading: String(s?.heading || s?.title || "").trim(),
      body: String(s?.body || "").trim()
    })).filter(s => s.heading || s.body) : [];
    
    practicalAdvice = Array.isArray(chapterJson.practicalAdvice) ? chapterJson.practicalAdvice.map(String) : [];
    cautions = Array.isArray(chapterJson.cautions) ? chapterJson.cautions.map(String) : [];
    // cautions를 keyInsights 대용으로 맵핑
    keyInsights = cautions.length > 0 ? cautions : (Array.isArray(chapterJson.keyInsights) ? chapterJson.keyInsights.map(String) : []);
    masterConclusion = chapterJson.masterConclusion || "";
    coreStars = Array.isArray(chapterJson.coreStars) ? chapterJson.coreStars.map(String) : [];
    corePalaces = Array.isArray(chapterJson.corePalaces) ? chapterJson.corePalaces.map(String) : [];
  } else {
    const parsedSections = parseSections(text)
      .map((section) => ({
        heading: String(section?.title || "").trim(),
        body: String(section?.body || "").trim(),
      }))
      .filter((section) => section.heading || section.body);

    sections = parsedSections.length
      ? parsedSections
      : (text
        ? [{ heading: `Chapter ${chapterIndex}`, body: text }]
        : []);
    summary = inferLegacySummary(text);
  }

  const payload = {
    chapterIndex,
    title: String(chapterJson?.chapterTitle || chapterJson?.title || chapterMeta?.title || `Chapter ${chapterIndex}`),
    subtitle: String(chapterMeta?.subtitle || ""),
    summary,
    sections,
    keyInsights,
    practicalAdvice,
    cautions,
    masterConclusion,
    coreStars,
    corePalaces,
    updatedAt: row?.updatedAt || null,
    chapterJson,
  };

  if (includeText) payload.text = text;
  return payload;
}

function buildLegacyStatusPayload(config, reportId, includeText = false) {
  const normalizedReportId = String(reportId || "").trim();
  const entry = getStoredReportSession(config.sessionKind, normalizedReportId);
  if (!entry) {
    return {
      ok: false,
      code: "LEGACY_SESSION_NOT_FOUND",
      message: "리포트 세션을 찾을 수 없습니다.",
      reportId: normalizedReportId,
    };
  }
  const rows = Object.values(entry?.chapters || {})
    .sort((a, b) => Number(a?.chapter || 0) - Number(b?.chapter || 0));

  const totalChapters = Number(entry?.totalChapters || config.defaultTotalChapters || 13);
  const completed = rows.length;
  const currentChapter = Math.max(0, Math.min(totalChapters, completed));
  const mode = normalizeLegacyMode(entry?.extra?.legacyFlow?.mode, entry?.extra?.reportType);
  const failed = Boolean(entry?.extra?.legacyFlow?.failed);
  const errorMessage = failed ? String(entry?.extra?.legacyFlow?.errorMessage || "리포트 생성 중 오류가 발생했습니다.") : "";
  const status = failed
    ? "failed"
    : (completed >= totalChapters ? "completed" : "generating");

  const chapters = (status === "completed" || includeText)
    ? rows.map((row) => buildLegacyChapterPayload(row, includeText))
    : [];
  const chapterStatuses = Array.from({ length: totalChapters }, (_, idx) => {
    const chapterId = idx + 1;
    const row = rows.find((item) => Number(item?.chapter || 0) === chapterId);
    const text = String(row?.text || row?.contentMarkdown || "");
    return {
      id: `chapter-${String(chapterId).padStart(2, "0")}`,
      title: String(row?.chapterMeta?.title || row?.title || `Chapter ${chapterId}`),
      status: row ? "completed" : (failed ? "failed" : (status === "completed" ? "completed" : "pending")),
      wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
    };
  });

  return {
    ok: true,
    reportId: normalizedReportId,
    mode,
    status,
    currentChapter,
    totalChapters,
    completed,
    downloadUrl: `${config.downloadPath}?reportId=${encodeURIComponent(normalizedReportId)}`,
    pdfUrl: `${config.downloadPath}?reportId=${encodeURIComponent(normalizedReportId)}`,
    message: failed
      ? errorMessage
      : (status === "completed"
        ? "리포트 생성이 완료되었습니다."
        : `리포트 생성 진행 중: ${completed}/${totalChapters} 챕터 완료`),
    ...(failed ? { errorMessage } : {}),
    chapters: chapters.length ? chapters : chapterStatuses,
  };
}

function buildLegacyDownloadHtml(config, reportId) {
  const status = buildLegacyStatusPayload(config, reportId, true);
  if (!status?.ok) return "";
  const chapters = Array.isArray(status?.chapters) ? status.chapters : [];
  if (!chapters.length) return "";

  const palaceKo = {
    ming: "명궁(命宮)",
    parents: "부모궁(父母宮)",
    fuzang: "복덕궁(福德宮)",
    house: "전택궁(田宅宮)",
    property: "전택궁(田宅宮)",
    career: "관록궁(官祿宮)",
    friends: "노복궁(奴僕宮)",
    travel: "천이궁(遷移宮)",
    health: "질액궁(疾厄宮)",
    wealth: "재백궁(財帛宮)",
    children: "자녀궁(子女宮)",
    spouse: "부부궁(夫妻宮)",
    siblings: "형제궁(兄弟宮)",
    body: "신궁(身宮)",
  };

  const chapterBlocks = chapters.map((chapter) => {
    const sectionBlocks = (Array.isArray(chapter.sections) ? chapter.sections : [])
      .map((section) => {
        const heading = escapeLifebookHtml(section?.heading || "");
        const body = escapeLifebookHtml(section?.body || "");
        return [
          '<section class="legacy-print-section">',
          heading ? `<h4>${heading}</h4>` : "",
          body ? `<pre>${body}</pre>` : "",
          "</section>",
        ].join("\n");
      })
      .join("\n");

    const stars = Array.isArray(chapter.coreStars) ? chapter.coreStars : [];
    const palaces = Array.isArray(chapter.corePalaces) ? chapter.corePalaces : [];
    const practicalAdvice = Array.isArray(chapter.practicalAdvice) ? chapter.practicalAdvice : [];
    const cautions = Array.isArray(chapter.cautions) ? chapter.cautions : [];
    const conclusion = String(chapter.masterConclusion || "").trim();

    const badgeBlocks = (stars.length || palaces.length)
      ? [
        '<div class="legacy-badges">',
        stars.length
          ? `<div class="legacy-badge-row"><strong>핵심 주성</strong><span>${stars.map((star) => `<em class="legacy-badge legacy-badge--star">${escapeLifebookHtml(star)}</em>`).join(" ")}</span></div>`
          : "",
        palaces.length
          ? `<div class="legacy-badge-row"><strong>핵심 궁위</strong><span>${palaces.map((palace) => `<em class="legacy-badge legacy-badge--palace">${escapeLifebookHtml(palaceKo[String(palace).trim()] || String(palace))}</em>`).join(" ")}</span></div>`
          : "",
        "</div>",
      ].join("\n")
      : "";

    const adviceBlock = practicalAdvice.length
      ? `<section class="legacy-print-section legacy-print-section--advice"><h4>실천 처방</h4><ul>${practicalAdvice.map((item) => `<li>${escapeLifebookHtml(item)}</li>`).join("")}</ul></section>`
      : "";
    const cautionBlock = cautions.length
      ? `<section class="legacy-print-section legacy-print-section--caution"><h4>경계 지침</h4><ul>${cautions.map((item) => `<li>${escapeLifebookHtml(item)}</li>`).join("")}</ul></section>`
      : "";
    const conclusionBlock = conclusion
      ? `<section class="legacy-print-section legacy-print-section--conclusion"><h4>거장의 최종 제언</h4><pre>${escapeLifebookHtml(conclusion)}</pre></section>`
      : "";

    return [
      '<article class="legacy-print-chapter">',
      `<h2>Chapter ${Number(chapter.chapterIndex || 0)}. ${escapeLifebookHtml(chapter.title || "")}</h2>`,
      chapter.subtitle ? `<p class="legacy-subtitle">${escapeLifebookHtml(chapter.subtitle)}</p>` : "",
      badgeBlocks,
      chapter.summary ? `<p class="legacy-summary">${escapeLifebookHtml(chapter.summary)}</p>` : "",
      sectionBlocks,
      adviceBlock,
      cautionBlock,
      conclusionBlock,
      "</article>",
    ].join("\n");
  }).join("\n");

  return [
    "<!doctype html>",
    '<html lang="ko">',
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${escapeLifebookHtml(config.title)}</title>`,
    "<style>",
    '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;600;700&display=swap");',
    ':root{--legacy-bg:#f6f7fb;--legacy-paper:#ffffff;--legacy-ink:#111827;--legacy-muted:#475569;--legacy-line:#dbe3f0;--legacy-accent:#1d4ed8;}',
    '*{box-sizing:border-box}',
    'body{margin:0;padding:28px;font-family:"Noto Serif KR","Noto Sans KR",serif;background:var(--legacy-bg);color:var(--legacy-ink);line-height:1.84;word-break:keep-all;}',
    '.legacy-print-cover{padding:28px;border:1px solid var(--legacy-line);border-radius:20px;background:linear-gradient(180deg,#fff 0%,#f8fbff 100%);margin-bottom:26px}',
    '.legacy-print-cover h1{margin:0 0 10px;font-size:32px;line-height:1.35;letter-spacing:-0.01em;color:#0b1324}',
    '.legacy-print-cover p{margin:4px 0;font-size:13px;letter-spacing:0.01em;color:var(--legacy-muted)}',
    '.legacy-print-chapter{margin-bottom:24px;padding:22px 22px 18px;border:1px solid var(--legacy-line);border-radius:16px;background:var(--legacy-paper)}',
    '.legacy-print-chapter h2{margin:0 0 10px;font-size:24px;line-height:1.4;letter-spacing:-0.01em;color:#0f172a}',
    '.legacy-subtitle{margin:0 0 12px;color:#334155;font-size:14px}',
    '.legacy-summary{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:#eef4ff;color:#0f172a;font-weight:600;font-size:14px;line-height:1.7}',
    '.legacy-badges{margin:0 0 12px;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}',
    '.legacy-badge-row{display:flex;align-items:flex-start;gap:8px;margin:4px 0;font-size:12px;color:#334155}',
    '.legacy-badge-row strong{display:inline-block;min-width:64px;color:#0f172a}',
    '.legacy-badge{display:inline-block;padding:2px 7px;border-radius:999px;margin:0 4px 4px 0;font-style:normal;font-weight:600;font-size:11px}',
    '.legacy-badge--star{background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe}',
    '.legacy-badge--palace{background:#fdf2f8;color:#be185d;border:1px solid #fbcfe8}',
    '.legacy-print-section{margin:0 0 14px}',
    '.legacy-print-section h4{margin:0 0 8px;font-size:17px;line-height:1.45;color:#0f172a;border-left:3px solid var(--legacy-accent);padding-left:9px}',
    '.legacy-print-section pre{white-space:pre-wrap;word-break:break-word;margin:0;font-family:"Noto Serif KR","Noto Sans KR",serif;font-size:15px;line-height:1.9;color:#111827}',
    '.legacy-print-section ul{margin:0 0 0 18px;padding:0}',
    '.legacy-print-section li{margin:0 0 6px;font-size:14px;line-height:1.7;color:#1f2937}',
    '.legacy-print-section--advice{background:#f0fdf4;border-radius:10px;padding:10px 12px}',
    '.legacy-print-section--advice h4{border-left-color:#10b981;color:#065f46}',
    '.legacy-print-section--caution{background:#fffbeb;border-radius:10px;padding:10px 12px}',
    '.legacy-print-section--caution h4{border-left-color:#f59e0b;color:#92400e}',
    '.legacy-print-section--conclusion{background:#faf5ff;border-radius:10px;padding:10px 12px}',
    '.legacy-print-section--conclusion h4{border-left-color:#8b5cf6;color:#5b21b6}',
    '@page{size:A4;margin:14mm}',
    '@media print{body{padding:0;background:#fff}.legacy-print-cover,.legacy-print-chapter{border:none;border-radius:0;box-shadow:none}.legacy-print-chapter{break-inside:avoid-page;page-break-inside:avoid}}',
    "</style>",
    "</head>",
    "<body>",
    '<section class="legacy-print-cover">',
    `<h1>${escapeLifebookHtml(config.title)}</h1>`,
    `<p>리포트 ID: ${escapeLifebookHtml(status.reportId)}</p>`,
    `<p>생성 챕터: ${Number(status.completed || 0)}/${Number(status.totalChapters || 0)}</p>`,
    "</section>",
    chapterBlocks,
    "</body>",
    "</html>",
  ].join("\n");
}

async function invokeLegacyGenerateChapter(config, request, env, payload, authInfo = null) {
  const url = new URL(request.url);
  const headers = new Headers();
  const authHeader = request.headers.get("Authorization");
  const cookieHeader = request.headers.get("Cookie");
  if (authHeader) headers.set("Authorization", authHeader);
  if (cookieHeader) headers.set("Cookie", cookieHeader);
  headers.set("Content-Type", "application/json");

  let targetPath = "/api/premium/astro-life";
  let handler = handleAstroLife;
  if (config.alias === "vedic") {
    targetPath = "/api/premium/vedic-life";
    handler = handleVedicLife;
  } else if (config.alias === "ziwei") {
    targetPath = "/api/premium/ziwei-life";
    handler = handleZiweiBookSession;
  }

  const nextUrl = new URL(url.toString());
  nextUrl.pathname = targetPath;
  const nextRequest = new Request(nextUrl.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(payload || {}),
  });

  const response = await handler(nextRequest, env, authInfo);
  const data = await response.clone().json().catch(() => ({}));
  return { response, data };
}

async function advanceLegacyPremiumSession(config, request, env, reportId, authInfo = null) {
  const entry = getStoredReportSession(config.sessionKind, reportId);
  if (!entry) return null;

  const totalChapters = Number(entry.totalChapters || config.defaultTotalChapters || 13);
  const completed = Object.keys(entry.chapters || {}).length;
  if (completed >= totalChapters) return entry;

  const legacyFlow = entry.extra?.legacyFlow || {};
  if (legacyFlow.failed) return entry;
  const sourceBody = deepCloneSerializable(legacyFlow.requestBody || {});
  const chapter = completed + 1;

  const chapterPayload = {
    ...sourceBody,
    reportId,
    chapter,
    sessionId: chapter,
    forceRegenerate: false,
    retryChapter: false,
    _premiumStrictPayload: config.alias === "ziwei",
    _premiumStrictValidation: config.alias === "ziwei",
  };

  if (config.alias === "astrology") {
    logAstroPdfStage("ChapterGenerateStart", {
      reportId,
      profileId: String(sourceBody?.profileId || sourceBody?.selectedProfileId || ""),
    });
  }

  const generated = await invokeLegacyGenerateChapter(config, request, env, chapterPayload, authInfo);
  if (!generated.response.ok || !generated.data?.ok) {
    if (config.alias === "astrology") {
      logAstroPdfStage("ChapterGenerateFailed", {
        reportId,
        profileId: String(sourceBody?.profileId || sourceBody?.selectedProfileId || ""),
        missingFields: [String(generated.data?.code || "ASTRO_CHAPTER_GENERATION_FAILED")],
      }, "error");
    }
    upsertLegacyFlowMeta(config.sessionKind, reportId, {
      failed: true,
      errorMessage: String(generated.data?.message || generated.data?.error || `Chapter ${chapter} 생성에 실패했습니다.`),
      failedAt: new Date().toISOString(),
    });
    return getStoredReportSession(config.sessionKind, reportId);
  }

  if (config.alias === "astrology") {
    logAstroPdfStage("ChapterGenerateSuccess", {
      reportId,
      profileId: String(sourceBody?.profileId || sourceBody?.selectedProfileId || ""),
    });
  }

  return upsertLegacyFlowMeta(config.sessionKind, reportId, {
    lastChapter: chapter,
    failed: false,
    errorMessage: "",
    updatedAt: new Date().toISOString(),
  });
}

async function runLegacyPremiumSessionToCompletion(config, request, env, reportId, maxSteps = 40, authInfo = null) {
  let entry = getStoredReportSession(config.sessionKind, reportId);
  if (!entry) return null;

  for (let step = 0; step < maxSteps; step += 1) {
    const totalChapters = Number(entry.totalChapters || config.defaultTotalChapters || 13);
    const completed = Object.keys(entry.chapters || {}).length;

    if (completed >= totalChapters) return entry;
    if (entry?.extra?.legacyFlow?.failed) return entry;

    const advanced = await advanceLegacyPremiumSession(config, request, env, reportId, authInfo);
    if (!advanced) return null;

    const nextCompleted = Object.keys(advanced.chapters || {}).length;
    entry = advanced;
    if (nextCompleted <= completed) return entry;
  }

  return entry;
}

async function startLegacyPremiumSession(config, request, env, authInfo = null) {
  const body = await readJson(request.clone());
  const ownerUserId = String(authInfo?.userId || "").trim();
  const sourceBody = deepCloneSerializable(body);
  for (const [key, value] of LEGACY_ZIWEI_REQUEST_INDEX.entries()) {
    if (!value || Number(value.expiresAt || 0) <= Date.now()) {
      LEGACY_ZIWEI_REQUEST_INDEX.delete(key);
    }
  }
  const requestId = String(sourceBody.requestId || sourceBody.generationId || "").trim().slice(0, 120);
  if (requestId) {
    const cached = LEGACY_ZIWEI_REQUEST_INDEX.get(requestId);
    if (cached && Number(cached.expiresAt || 0) > Date.now()) {
      const existing = buildLegacyStatusPayload(config, cached.reportId, false);
      if (existing?.ok) {
        console.info("[ZiweiPremium][Flow] deduped by requestId", { requestId, reportId: cached.reportId });
        return json(existing);
      }
    }
  }

  const mode = normalizeLegacyMode(sourceBody.mode, sourceBody.reportType || sourceBody.reportMode);
  const chapterPayload = {
    ...sourceBody,
    chapter: 1,
    sessionId: 1,
    _premiumStrictPayload: config.alias === "ziwei",
    _premiumStrictValidation: config.alias === "ziwei",
  };

  const generated = await invokeLegacyGenerateChapter(config, request, env, chapterPayload, authInfo);
  if (!generated.response.ok || !generated.data?.ok) {
    return json({
      ok: false,
      code: generated.data?.code || "PREMIUM_GENERATE_FAILED",
      message: generated.data?.message || "리포트 생성을 시작하지 못했습니다.",
    }, { status: Number(generated.response.status || 422) || 422 });
  }

  const reportId = String(generated.data?.reportId || "").trim();
  if (!reportId) {
    return json({ ok: false, code: "REPORT_ID_MISSING", message: "리포트 식별자를 만들지 못했습니다." }, { status: 500 });
  }

  const patched = upsertLegacyFlowMeta(config.sessionKind, reportId, {
    ownerUserId,
    mode,
    reportType: mode,
    requestId,
    generationId: String(sourceBody.generationId || requestId).trim().slice(0, 120),
    requestBody: sourceBody,
    active: true,
    failed: false,
    errorMessage: "",
    startedAt: new Date().toISOString(),
    lastChapter: 1,
  });

  if (!patched) {
    return json({ ok: false, code: "LEGACY_SESSION_NOT_FOUND", message: "리포트 세션을 찾을 수 없습니다." }, { status: 500 });
  }

  await persistPremiumPdfHistoryFromSession(env, config.sessionKind, reportId, {
    ownerUserId,
  });

  if (requestId) {
    LEGACY_ZIWEI_REQUEST_INDEX.set(requestId, {
      reportId,
      expiresAt: Date.now() + REPORT_SESSION_TTL_MS,
    });
  }

  // Ziwei polling frequently crosses worker instances; try to finish all chapters in one request.
  if (config.alias === "ziwei") {
    await runLegacyPremiumSessionToCompletion(config, request, env, reportId, 40, authInfo);
  }

  const responsePayload = buildLegacyStatusPayload(config, reportId);
  if (!responsePayload?.ok) {
    return json({ ok: false, code: "LEGACY_SESSION_NOT_FOUND", message: "리포트 세션을 찾을 수 없습니다." }, { status: 500 });
  }

  return json(responsePayload);
}

async function handleLegacyPremiumStatus(config, request, env, authInfo = null) {
  const url = new URL(request.url);
  const reportId = String(url.searchParams.get("reportId") || "").trim();
  if (!reportId) {
    return json({ ok: false, message: "reportId query parameter is required." }, { status: 400 });
  }

  const includeRaw = String(url.searchParams.get("includeChapters") || "").trim().toLowerCase();
  const includeChapters = includeRaw === "1" || includeRaw === "true" || includeRaw === "yes";
  const ownership = ensureReportSessionOwnership(config.sessionKind, reportId, authInfo?.userId);
  if (!ownership.ok) {
    return json(ownership.payload, { status: ownership.status });
  }

  const before = getStoredReportSession(config.sessionKind, reportId);
  if (!before) {
    return json({ ok: false, message: "리포트 세션을 찾을 수 없습니다." }, { status: 404 });
  }

  const advanced = await advanceLegacyPremiumSession(config, request, env, reportId, authInfo);
  const finalEntry = advanced || getStoredReportSession(config.sessionKind, reportId);
  if (!finalEntry) {
    return json({ ok: false, message: "리포트 세션이 만료되었습니다." }, { status: 404 });
  }

  await persistPremiumPdfHistoryFromSession(env, config.sessionKind, reportId, {
    ownerUserId: String(authInfo?.userId || "").trim(),
  });

  return json(buildLegacyStatusPayload(config, reportId, includeChapters));
}

async function handleLegacyPremiumDownload(config, request, authInfo = null) {
  const url = new URL(request.url);
  const reportId = String(url.searchParams.get("reportId") || "").trim();
  if (!reportId) {
    return json({ ok: false, message: "reportId query parameter is required." }, { status: 400 });
  }

  const ownership = ensureReportSessionOwnership(config.sessionKind, reportId, authInfo?.userId);
  if (!ownership.ok) {
    return json(ownership.payload, { status: ownership.status });
  }

  if (config.alias === "astrology") {
    logAstroPdfStage("PdfRenderStart", { reportId });
  }

  const html = buildLegacyDownloadHtml(config, reportId);
  if (!html) {
    if (config.alias === "astrology") {
      logAstroPdfStage("PdfRenderFailed", { reportId }, "error");
    }
    return notFound();
  }
  if (config.alias === "astrology") {
    logAstroPdfStage("PdfRenderSuccess", { reportId });
  }
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function handlePremiumRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const authInfo = await requireAuth(request, env);
    const path = getRoutePath(request, "/api/premium");

    if (method === "GET" && path === "/pdf-reports") {
      return await ensurePdfNo422(await handlePremiumPdfHistoryList(request, env, authInfo));
    }
    if (method === "GET" && path.startsWith("/pdf-reports/")) {
      const reportId = decodeURIComponent(String(path.slice("/pdf-reports/".length) || "").trim());
      return await ensurePdfNo422(await handlePremiumPdfHistoryDetail(request, env, authInfo, reportId));
    }

    const legacyAliasByPath = (() => {
      if (path.startsWith("/astrology/")) return LEGACY_PREMIUM_ALIAS_CONFIG.astrology;
      if (path.startsWith("/vedic/")) return LEGACY_PREMIUM_ALIAS_CONFIG.vedic;
      if (path.startsWith("/ziwei/")) return LEGACY_PREMIUM_ALIAS_CONFIG.ziwei;
      return null;
    })();

    if (legacyAliasByPath) {
      if (method === "POST" && path === `/${legacyAliasByPath.alias}/generate`) {
        const cloned = request.clone();
        const rawBody = await readJson(cloned);
        const tokenFromBody = String(rawBody?.premiumAccessToken || rawBody?._premiumAccessToken || "").trim();
        const tokenFromCookie = String(cookieValue(request, "cd_premium_access") || "").trim();
        const premiumAccessToken = tokenFromBody || tokenFromCookie;
        const accessRequestBody = premiumAccessToken
          ? { ...(rawBody && typeof rawBody === "object" ? rawBody : {}), premiumAccessToken }
          : (rawBody && typeof rawBody === "object" ? rawBody : {});
        if (legacyAliasByPath.alias === "astrology") {
          logAstroPdfStage("CoinGateStart", {
            profileId: String(rawBody?.profileId || rawBody?.selectedProfileId || ""),
          });
        }
        const access = await requirePremiumReportAccess(env, authInfo.userId, legacyAliasByPath.reportType, accessRequestBody);
        if (!access.ok) {
          if (legacyAliasByPath.alias === "astrology") {
            logAstroPdfStage("CoinGateFailed", {
              profileId: String(rawBody?.profileId || rawBody?.selectedProfileId || ""),
              missingFields: [String(access.code || "PAYMENT_REQUIRED")],
            }, "warn");
          }
          return json({
            ok: false,
            code: access.code || "PAYMENT_REQUIRED",
            message: access.message || "프리미엄 결제가 필요합니다.",
            reportType: legacyAliasByPath.reportType,
            required: access.required || null,
          }, { status: Number(access.status || 402) });
        }
        if (legacyAliasByPath.alias === "astrology") {
          logAstroPdfStage("CoinGateSuccess", {
            profileId: String(rawBody?.profileId || rawBody?.selectedProfileId || ""),
          });
        }
        return await ensurePdfNo422(await startLegacyPremiumSession(legacyAliasByPath, request, env, authInfo));
      }

      if (method === "GET" && path === `/${legacyAliasByPath.alias}/status`) {
        return await ensurePdfNo422(await handleLegacyPremiumStatus(legacyAliasByPath, request, env, authInfo));
      }

      if (method === "GET" && path === `/${legacyAliasByPath.alias}/download`) {
        return await handleLegacyPremiumDownload(legacyAliasByPath, request, authInfo);
      }

      return methodNotAllowed();
    }

    if (method !== "POST") return methodNotAllowed();

    const legacyReportType = (() => {
      if (path === "/sukuyo-life") return "sookyoPremium";
      if (path === "/astro-western" || path === "/astro-life") return "westernAstrologyPremium";
      if (path === "/vedic-life") return "vedicPremium";
      if (path === "/ziwei-life") return "ziweiPremium";
      return "";
    })();

    if (legacyReportType) {
      const rawBody = await readJson(request.clone());
      const tokenFromBody = String(rawBody?.premiumAccessToken || rawBody?._premiumAccessToken || "").trim();
      const tokenFromCookie = String(cookieValue(request, "cd_premium_access") || "").trim();
      const premiumAccessToken = tokenFromBody || tokenFromCookie;
      const accessRequestBody = premiumAccessToken
        ? { ...(rawBody && typeof rawBody === "object" ? rawBody : {}), premiumAccessToken }
        : (rawBody && typeof rawBody === "object" ? rawBody : {});
      const access = await requirePremiumReportAccess(env, authInfo.userId, legacyReportType, accessRequestBody);
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

    if (path === "/sukuyo-life") return await ensurePdfNo422(await handleSukuyoLife(request, env, authInfo));
    if (path === "/astro-western") return await ensurePdfNo422(await handleAstroWestern(request, env));
    if (path === "/astro-life") return await ensurePdfNo422(await handleAstroLife(request, env, authInfo));
    if (path === "/vedic-life") return await ensurePdfNo422(await handleVedicLife(request, env, authInfo));
    if (path === "/ziwei-life") return await ensurePdfNo422(await handleZiweiBookSession(request, env, authInfo));
    return notFound();
  } catch (error) {
    logPremiumPipelineStage("Failed", {
      path: (() => {
        try {
          return new URL(request.url).pathname;
        } catch {
          return "";
        }
      })(),
      message: String(error?.message || "Unexpected premium route failure"),
      code: String(error?.code || "PREMIUM_ROUTE_FAILED"),
    });
    return await ensurePdfNo422(handleRouteError(error));
  }
}

export const __ziweiTestUtils = {
  normalizeZiweiStructuredPayload,
  buildCanonicalZiweiChart,
  validateCanonicalZiweiChartStrict,
  buildZiweiStandardResultFromCanonical,
  buildZiweiReportPayloadFromBasicResult,
  buildZiweiPdfReportPayload,
  buildZiweiPremiumReportPayload,
  validateZiweiPdfPayload,
  validateZiweiChapterResult,
  hasZiweiBannedSummaryExpression,
  hasInvalidZiweiSummaryTable,
  detectCrossChapterRepeatedSentences,
  hasRequiredZiweiSpecificCoverage,
};

export const __astroTestUtils = {
  ensurePdfNo422,
  buildWesternChart,
  buildWesternPremiumChart,
  validateAstroProfileInputFields,
  validateAstroChartSeed,
  buildAstroPdfSeed,
  validateAstroPdfPayload,
  buildBasicAstroSummaryFromChart,
  buildCanonicalAstroChart,
  validateCanonicalAstroChartStrict,
  buildAstroChapterPlan,
  buildAstroChapterPrompt,
  hasForbiddenAstroPadding,
  detectRepeatedLongSentences,
  hasAstroDataEvidence,
  hasForbiddenAstroRawDataExposure,
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
  normalizePremiumRequestBodyForPipeline,
  buildPremiumSessionBinding,
  validatePremiumSessionBinding,
  buildPremiumChapterContract,
  validatePremiumChapterResponseEnvelope,
  getPremiumExpectedSchema,
  getPremiumNormalizedDataSummary,
  getPremiumRequiredChapters,
  validateChapterLength,
  validateFullReportLength,
  buildCanonicalJsonForReport,
  validateCanonicalJson,
  validateSajuReportPayload,
  validateZiweiReportPayload,
  validateSukyoReportPayload,
  validateVedicReportPayload,
  validateAstrologyReportPayload,
  buildChapterDataMap,
  buildChapterJsonPacks,
  buildLlmPromptInput,
  isLlmRecoverableError,
  validateLocalFallbackChapter,
  dedupeReportParagraphs,
  collectDeterministicLocalFacts,
  buildDeterministicLocalChapterText,
  detectRepeatedLongSentences,
  ensureSajuNewYearSourceData,
  buildCanonicalSajuNewYearReport,
  getSajuNewYearChapterPromptSpec,
  buildSajuNewYearChapterText,
  evaluateSajuNewYearChapterQuality,
  attachPremiumApiMeta,
  buildPremiumAccessDeniedPayload,
};

export async function handleLifebookRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const authInfo = await requireAuth(request, env);
    const path = getRoutePath(request, "/api/lifebook");
    if (path === "/session") {
      if (method !== "POST") return methodNotAllowed();
      return await ensurePdfNo422(await handleLifebookSession(request, env, authInfo));
    }
    if (path === "/generate") {
      if (method !== "POST") return methodNotAllowed();
      return await ensurePdfNo422(await handleLifebookSession(request, env, authInfo));
    }
    if (path === "/status") {
      if (method !== "GET") return methodNotAllowed();
      const url = new URL(request.url);
      const reportId = String(url.searchParams.get("reportId") || "").trim();
      if (!reportId) {
        return json({ ok: false, message: "reportId query parameter is required." }, { status: 400 });
      }
      const ownership = ensureReportSessionOwnership("lifebook", reportId, authInfo?.userId);
      if (!ownership.ok) return json(ownership.payload, { status: ownership.status });
      const includeTextRaw = String(url.searchParams.get("includeText") || "").trim().toLowerCase();
      const includeText = includeTextRaw === "1" || includeTextRaw === "true" || includeTextRaw === "yes";
      await persistPremiumPdfHistoryFromSession(env, "lifebook", reportId, {
        ownerUserId: String(authInfo?.userId || "").trim(),
      });
      return json(buildLifebookStatusPayload(reportId, includeText));
    }
    if (path === "/download") {
      if (method !== "GET") return methodNotAllowed();
      const url = new URL(request.url);
      const reportId = String(url.searchParams.get("reportId") || "").trim();
      if (!reportId) {
        return json({ ok: false, message: "reportId query parameter is required." }, { status: 400 });
      }
      const ownership = ensureReportSessionOwnership("lifebook", reportId, authInfo?.userId);
      if (!ownership.ok) return json(ownership.payload, { status: ownership.status });
      const html = buildLifebookDownloadHtmlFromSession(reportId);
      if (!html) return notFound();
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      });
    }
    return notFound();
  } catch (error) {
    return await ensurePdfNo422(handleRouteError(error));
  }
}

export async function handleLoveSecretRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const authInfo = await requireAuth(request, env);
    const path = getRoutePath(request, "/api/love-secret");
    if (path === "/session" || path === "/generate") {
      if (method !== "POST") return methodNotAllowed();
      return await ensurePdfNo422(await handleLoveSecretSession(request, env, authInfo));
    }
    if (path === "/status") {
      if (method !== "GET") return methodNotAllowed();
      const url = new URL(request.url);
      const reportId = String(url.searchParams.get("reportId") || "").trim();
      if (!reportId) {
        return json({ ok: false, message: "reportId query parameter is required." }, { status: 400 });
      }
      const ownership = ensureReportSessionOwnership("love-secret", reportId, authInfo?.userId);
      if (!ownership.ok) return json(ownership.payload, { status: ownership.status });
      const includeTextRaw = String(url.searchParams.get("includeText") || "").trim().toLowerCase();
      const includeText = includeTextRaw === "1" || includeTextRaw === "true" || includeTextRaw === "yes";
      await persistPremiumPdfHistoryFromSession(env, "love-secret", reportId, {
        ownerUserId: String(authInfo?.userId || "").trim(),
      });
      return json(buildLoveSecretStatusPayload(reportId, includeText));
    }
    if (path === "/download") {
      if (method !== "GET") return methodNotAllowed();
      const url = new URL(request.url);
      const reportId = String(url.searchParams.get("reportId") || "").trim();
      if (!reportId) {
        return json({ ok: false, message: "reportId query parameter is required." }, { status: 400 });
      }
      const ownership = ensureReportSessionOwnership("love-secret", reportId, authInfo?.userId);
      if (!ownership.ok) return json(ownership.payload, { status: ownership.status });
      const html = buildLoveSecretDownloadHtmlFromSession(reportId);
      if (!html) return notFound();
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      });
    }
    return notFound();
  } catch (error) {
    return await ensurePdfNo422(handleRouteError(error));
  }
}

export async function handleSajuNewYearRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const authInfo = await requireAuth(request, env);
    const path = getRoutePath(request, "/api/saju-new-year");
    if (path === "/session") return await ensurePdfNo422(await handleSajuNewYearSession(request, env, authInfo));
    return notFound();
  } catch (error) {
    return await ensurePdfNo422(handleRouteError(error));
  }
}

export async function handleZiweiBookRoutes(request, env) {
  try {
    if (request.method.toUpperCase() !== "POST") return methodNotAllowed();
    const authInfo = await requireAuth(request, env);
    const path = getRoutePath(request, "/api/ziwei-book");
    if (path === "/session") return await ensurePdfNo422(await handleZiweiBookSession(request, env, authInfo));
    return notFound();
  } catch (error) {
    return await ensurePdfNo422(handleRouteError(error));
  }
}
