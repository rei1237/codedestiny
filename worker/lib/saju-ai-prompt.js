import { buildFortuneQuestionPromptPackage } from "./fortune-question-prompt.js";
import { basisGroup, basisItem, basisStage, buildAnalysisBasisPayload } from "./analysis-basis-contract.js";
import { buildEvidenceRuleLines } from "./fortune-reasoning-contract.js";
import {
  SAJU_PROMPT_TEMPLATES,
  getSajuPromptTemplate,
  classifyQuestionToSajuDomain,
} from "./saju-ai-prompt-templates.mjs";
import {
  resolveSajuCalibrationLuck,
  buildSajuCalibrationPromptLines,
  buildSajuCalibrationDigest,
} from "./saju-calibration.js";
import {
  buildGyeokgukAnalysis,
  buildTwelveLifeStagesForPillars,
} from "./saju-gyeokguk.js";

const DEFAULT_TEXT = "제공되지 않음";

export const SAJU_AI_PROMPT_FEATURE_KEY = "saju_ai_prompt_generator";
export const SAJU_AI_PROMPT_PRICE = 200;
export const SAJU_AI_PROMPT_VERSION = "saju-myeongsik-ai-v6";
export { SAJU_PROMPT_TEMPLATES, getSajuPromptTemplate, classifyQuestionToSajuDomain };

// ── 상담문을 나눠 쓰는 단위 ────────────────────────────────────────────────
//
// 🔴 한 번의 호출로 1만자 이상을 요구하면 모델이 6천자 근처에서 스스로 멈춘다. 예산을 늘려
//    해결할 수도 없다 — FEATURE_AI_LLM_BUDGET_MS(80s)는 엣지 응답 데드라인(100s)에서 뒤처리
//    20s를 뺀 값이라 이미 상한이고, gemini-2.5-flash 는 비스트리밍 ~200tok/s 다.
//    그래서 벽시계를 늘리지 않고 분량만 늘리는 유일한 길이 그룹 병렬이다
//    (같은 결론의 선례: worker/routes/astrology-ai.js, worker/routes/life-book-ai.js).
//
// 🔴 title 문자열은 서버 검증(SAJU_AI_REQUIRED_CHAPTER_PATTERNS)과 클라이언트 렌더러
//    (js/saju-engine.js `_sajuPromptChapterTitle`)가 함께 보는 계약이다. 한 글자도 바꾸지 말 것 —
//    바꾸면 렌더러가 전 챕터를 '핵심 상담' 하나로 뭉갠다.
export const SAJU_AI_SECTION_GROUPS = Object.freeze([
  Object.freeze({
    key: "answer_core",
    label: "질문에 대한 답과 명식의 중심",
    chapters: Object.freeze([
      Object.freeze({ no: 1, title: "질문에 대한 핵심 답변" }),
      Object.freeze({ no: 2, title: "이 명식의 중심 성향" }),
    ]),
    minChars: 3000,
    maxChars: 4600,
    guide: "사용자의 질문에 첫 문단에서 바로 답한 뒤, 이 명식이 반복시키는 중심 성향과 그것이 삶에서 드러나는 장면을 풀어 주세요.",
  }),
  Object.freeze({
    key: "structure_reading",
    label: "십성 구조와 오행 균형",
    chapters: Object.freeze([
      Object.freeze({ no: 3, title: "십성 구조 해석" }),
      Object.freeze({ no: 4, title: "오행 균형 해석" }),
    ]),
    minChars: 3000,
    maxChars: 4600,
    guide: "확정표에 적힌 십성만 써서 구조를 읽고, 오행의 과한 곳과 부족한 곳이 일상에서 어떻게 함께 드러나는지 이어 주세요.",
  }),
  Object.freeze({
    key: "life_domains",
    label: "현재 고민과 생활 영역별 리듬",
    chapters: Object.freeze([
      Object.freeze({ no: 5, title: "현재 고민과 명식의 연결" }),
      Object.freeze({ no: 6, title: "일/돈/관계/연애/건강 리듬" }),
    ]),
    minChars: 3200,
    maxChars: 4800,
    guide: "지금의 고민을 명식의 어느 자리가 만들고 있는지 짚고, 일·돈·관계·연애·건강 다섯 영역의 리듬을 각각 구체적 장면으로 보여 주세요.",
  }),
  Object.freeze({
    key: "timing_flow",
    label: "대운의 전환점과 올해의 흐름",
    chapters: Object.freeze([
      Object.freeze({ no: 7, title: "대운의 전환점" }),
      Object.freeze({ no: 8, title: "올해의 흐름" }),
    ]),
    minChars: 3000,
    maxChars: 4600,
    guide: "지나온 대운과 지금 대운, 다음 대운이 각각 어떤 성격의 시기인지 나누고, 그 사이의 전환점에서 실제로 무엇이 바뀌었고 무엇이 바뀔지 짚어 주세요. 이어서 올해의 세운이 원국의 어느 자리를 건드리는지 밝히고, 상반기와 하반기의 결이 어떻게 다른지 구분해 주세요. 다른 챕터에서 다루는 성향·구조·영역별 리듬을 다시 설명하지 말고, 여기서는 **시기의 순서**만 다루세요. '좋아진다/나빠진다'로 뭉뚱그리지 말고 어느 달·어느 시기에 무엇을 하면 유리하고 무엇을 미루는 편이 나은지로 쓰세요.",
  }),
  Object.freeze({
    key: "strategy_action",
    label: "패턴과 전략, 실천과 마무리",
    chapters: Object.freeze([
      Object.freeze({ no: 9, title: "조심해야 할 패턴" }),
      Object.freeze({ no: 10, title: "살리는 전략" }),
      Object.freeze({ no: 11, title: "30일 실천 가이드" }),
      Object.freeze({ no: 12, title: "마지막 한마디" }),
    ]),
    minChars: 3000,
    maxChars: 4600,
    guide: "반복되는 손해 패턴을 먼저 짚고, 그것을 뒤집는 전략과 30일 안에 실제로 해볼 행동으로 좁힌 뒤, 마지막 한마디로 따뜻하지만 가볍지 않게 닫아 주세요.",
  }),
]);

/**
 * 그룹 하나의 LLM 출력 상한. charsAllowedByTokens(9600) ≈ 6,400자로 그룹 maxChars(4,400)를
 * 2,000자 덮는다 — 소제목·줄바꿈 몫과 토크나이저 오차를 흡수하는 완충이다.
 * (같은 값의 선례: worker/routes/astrology-ai.js ASTROLOGY_AI_SECTION_MAX_OUTPUT_TOKENS)
 */
export const SAJU_AI_SECTION_MAX_OUTPUT_TOKENS = 9600;

/**
 * 조립본의 유료 배달 하한. 그룹 minChars 합(15,200)의 약 76%다
 * (인생의 책 80% / 자미두수 55% 사이).
 *
 * 🔴 이 값은 "배달을 막는 문턱"이 아니라 "웨이브2를 돌게 만드는 신호"다. 미달이어도 기존
 *    경량 보장(렌더 가능 텍스트 ≥400자 salvage)이 그대로 결과를 전달하므로 환불률을 올리지
 *    않는다. salvage 를 지우면 이 상수가 곧바로 환불 문턱으로 돌변한다.
 */
export const SAJU_AI_MIN_RESULT_CHARS = 11500;

export const SAJU_AI_CATEGORY_RUBRICS = Object.freeze({
  career: Object.freeze({
    domain: "career",
    label: "진로",
    requiredSections: ["직업 적합도", "일하는 방식", "조직/독립 적성", "이직/전환 타이밍", "성장 전략"],
    tenGodFocus: ["관성", "식상", "인성", "재성"],
    validationKeywords: [
      ["직업", "진로", "커리어", "일"],
      ["일하는 방식", "업무 방식", "강점", "역할"],
      ["조직", "독립", "사업", "창업"],
      ["이직", "전환", "타이밍", "시기"],
      ["성장", "전략", "준비", "실천"],
    ],
  }),
  money: Object.freeze({
    domain: "money",
    label: "재물",
    requiredSections: ["수입 구조", "돈이 모이는 방식", "투자/소비 리스크", "부업/사업 가능성", "30일 재정 루틴"],
    tenGodFocus: ["재성", "식상", "비겁"],
    validationKeywords: [
      ["수입", "수익", "매출", "돈"],
      ["모이는", "축적", "현금흐름", "흐름"],
      ["투자", "소비", "리스크", "손실"],
      ["부업", "사업", "수익 모델", "모델"],
      ["30일", "재정", "루틴", "실천"],
    ],
  }),
  love: Object.freeze({
    domain: "love",
    label: "연애",
    requiredSections: ["끌림의 방식", "관계 반복 패턴", "결혼/공식화 가능성", "감정 표현", "관계 조언"],
    tenGodFocus: ["일지", "배우자성", "관성", "재성", "식상"],
    validationKeywords: [
      ["끌림", "호감", "마음", "연애"],
      ["반복", "패턴", "갈등", "관계"],
      ["결혼", "공식화", "배우자", "인연"],
      ["감정 표현", "표현", "소통"],
      ["조언", "관계", "실천", "거리"],
    ],
  }),
  litigation: Object.freeze({
    domain: "litigation",
    label: "송사",
    requiredSections: ["감정 대응", "문서/증거 정리", "말실수 방지", "협상 태도", "단정 예언 금지"],
    tenGodFocus: ["관성", "비겁", "식상", "인성"],
    validationKeywords: [
      ["감정", "대응", "흥분", "거리"],
      ["문서", "증거", "기록", "정리"],
      ["말실수", "표현", "발언", "소통"],
      ["협상", "조율", "합의", "태도"],
      ["단정", "법률", "판단", "전문가"],
    ],
  }),
  relationship: Object.freeze({
    domain: "relationship",
    label: "관계",
    requiredSections: ["소통 방식", "갈등 트리거", "거리 조절", "신뢰 회복", "관계권별 조언"],
    tenGodFocus: ["비겁", "식상", "인성", "충형해파"],
    validationKeywords: [
      ["소통", "말", "표현", "대화"],
      ["갈등", "트리거", "반응", "충돌"],
      ["거리", "경계", "조절", "선"],
      ["신뢰", "회복", "관계", "안정"],
      ["가족", "동료", "친구", "사회"],
    ],
  }),
  health: Object.freeze({
    domain: "health",
    label: "건강",
    requiredSections: ["생활 리듬", "스트레스 패턴", "수면/회복", "오행 균형의 생활화", "의료 진단 금지"],
    tenGodFocus: ["오행 과다/부족", "조후", "인성", "식상"],
    validationKeywords: [
      ["생활", "리듬", "루틴", "일상"],
      ["스트레스", "긴장", "불안", "부담"],
      ["수면", "회복", "휴식", "컨디션"],
      ["오행", "조후", "균형", "몸"],
      ["진단", "의료", "병원", "전문가"],
    ],
  }),
  life_direction: Object.freeze({
    domain: "life_direction",
    label: "인생",
    requiredSections: ["삶의 방향", "현재 전환점", "반복 선택 패턴", "우선순위", "장기 전략"],
    tenGodFocus: ["일간", "월지", "격국/조후", "용신 후보", "대운"],
    validationKeywords: [
      ["방향", "삶", "인생", "목표"],
      ["전환", "시기", "변화", "흐름"],
      ["반복", "선택", "패턴", "습관"],
      ["우선순위", "먼저", "중심", "정리"],
      ["장기", "전략", "대운", "계획"],
    ],
  }),
});

export function getSajuAICategoryRubric(domain) {
  const key = String(domain || "").trim();
  const rubric = SAJU_AI_CATEGORY_RUBRICS[key] || SAJU_AI_CATEGORY_RUBRICS.life_direction;
  return {
    domain: rubric.domain,
    label: rubric.label,
    requiredSections: [...rubric.requiredSections],
    tenGodFocus: [...rubric.tenGodFocus],
    validationKeywords: rubric.validationKeywords.map((group) => [...group]),
  };
}

const QUESTION_TYPE_RULES = Object.freeze({
  love: ["연애", "결혼", "재회", "상대", "배우자", "인연", "썸"],
  career: ["직업", "진로", "회사", "이직", "사업", "창업", "커리어"],
  money: ["돈", "재물", "수익", "매출", "투자", "부자"],
  relationship: ["인간관계", "친구", "가족", "동료", "고객", "갈등"],
  health: ["건강", "몸", "멘탈", "불안", "스트레스", "질병"],
  life_direction: ["인생", "방향", "미래", "운명", "목표", "성공"],
});

const QUESTION_TYPE_LABELS = Object.freeze({
  love: "연애/결혼",
  career: "직업/진로",
  money: "돈/재물",
  relationship: "인간관계",
  health: "건강/멘탈",
  life_direction: "인생 방향",
  general: "일반",
});

const SAJU_SPECIAL_ANGLES = Object.freeze([
  "일간의 강약과 재성/관성/식상 수용력",
  "월지 중심의 계절성 및 조후 균형",
  "격국 성립 여부와 일반격/특수격의 실전 의미",
  "용신/희신/기신이 질문 주제에 작동하는 방식",
  "십성 구조(재성·관성·식상·인성·비겁)의 역할 분담",
  "천간/지지의 흐름과 합·충·형·파·해의 변동성",
  "지장간의 잠재 자원과 표면 행동의 불일치",
  "대운·세운·월운의 타이밍에서 기회/리스크 분리",
  "신살/공망의 보조적 해석과 과대해석 방지",
  "종격 가능성(전왕격·종재격·종관격·종살격·종아격) 검토",
  "신강/신약 판정 불확실성 구간과 대안 시나리오",
  "반복되는 인생 패턴과 현재 시점의 전략 전환 포인트",
]);

const SAJU_MONEY_ANGLES = Object.freeze([
  "재성을 단순 보유가 아니라 실제 작동 구조(유통/회수/축적)로 해석",
  "식상생재 구조의 유무와 지속 가능한 매출화 경로",
  "관성과 재성의 연결로 사회적 성취가 현금흐름으로 이어지는지 점검",
  "비겁 과다 시 재탈/동업 리스크와 경쟁 소모 구조 분석",
  "인성 과다 시 실행력 저하/의사결정 지연 리스크 분석",
  "대운·세운에서 재성이 열리는 시기와 현금흐름 강화 시점 제시",
  "십성 구조와 용신 흐름 기반으로 적합 수익 모델 3~5개 추천",
  "직접사업형/콘텐츠지식형/상담교육형/기술자동화형/투자운용형/영업브랜딩형/전문직형/구독플랫폼형 적합도 비교",
  "피해야 할 돈 버는 방식(투자 습관·동업 구조·소비 패턴) 명시",
]);

const SAJU_AI_PROMPT_MASTERY_ANGLES = Object.freeze([
  "외부 AI에게 그대로 물어볼 수 있도록 역할·원국 근거·질문 의도·답변 형식을 한 번에 묶기",
  "최고 수준의 명리학자 관점에서 일간·월령·조후·격국·용신·십성·합충형파해·대운·세운을 우선순위화",
  "월지·일지 지장간과 일간 기준 십성을 질문 주제의 숨은 작동점으로 반영",
  "원국 천간 투간과 대운·세운 투출을 구분해 성향과 시기 사건성을 나누기",
  "도충 exists=true일 때 반복 지지와 유도되는 반대 충 지지를 질문 주제에 맞춰 절제해서 반영",
  "辰·戌·丑·未 토 지지가 형충해파로 열리는 개고는 열린 지장간과 시기성을 분리해 반영",
  "투간·투출·도충·개고를 서로 섞지 않고 각각의 작동 원리로 상담 흐름을 세우기",
  "확정 근거와 추정 영역을 나누어 단정 대신 확인 질문과 선택지로 돌리기",
  "AI 답변이 사주 전용 상담 흐름으로 열리도록 금지할 단정과 원하는 답변 구조를 분명히 남기기",
]);

const SAJU_AI_PROMPT_ENGINE_CONTEXT_MARKER = "saju-ai-question-prompt-context-v20260630-v3";

const SAJU_STEMS = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const SAJU_BRANCHES = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const SAJU_TEN_GOD_ORDER = Object.freeze(["비견", "겁재", "식신", "상관", "정재", "편재", "정관", "편관", "정인", "편인"]);
const STEM_KO = Object.freeze({ 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" });
const BRANCH_KO = Object.freeze({ 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" });
const KO_TO_STEM = Object.freeze(Object.fromEntries(Object.entries(STEM_KO).map(([stem, ko]) => [ko, stem])));
const KO_TO_BRANCH = Object.freeze(Object.fromEntries(Object.entries(BRANCH_KO).map(([branch, ko]) => [ko, branch])));
const STEM_ELEMENT_KEY = Object.freeze({
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
});
const STEM_POLARITY = Object.freeze({ 甲: "yang", 乙: "yin", 丙: "yang", 丁: "yin", 戊: "yang", 己: "yin", 庚: "yang", 辛: "yin", 壬: "yang", 癸: "yin" });
const STEM_POLARITY_KO = Object.freeze({ yang: "양", yin: "음" });
const ELEMENT_KO_BY_KEY = Object.freeze({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수" });
const ELEMENT_KEY_BY_KO = Object.freeze({ 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" });
const ELEMENT_GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const ELEMENT_CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const PILLAR_POSITION_LABELS = Object.freeze({ year: "년지", month: "월지", day: "일지", hour: "시지" });
const STEM_POSITION_LABELS = Object.freeze({ year: "년간", month: "월간", day: "일간", hour: "시간" });
const QUESTION_TEN_GOD_FOCUS = Object.freeze({
  money: ["정재", "편재", "식신", "상관"],
  career: ["정관", "편관", "정인", "편인", "식신", "상관"],
  love: ["정관", "편관", "정재", "편재", "비견", "겁재"],
  relationship: ["비견", "겁재", "식신", "상관", "정관", "편관"],
  health: ["정인", "편인", "식신", "상관"],
  life_direction: ["정관", "편관", "정인", "편인", "식신", "상관", "정재", "편재"],
  general: [],
});
const HIDDEN_STEMS_BY_BRANCH = Object.freeze({
  子: Object.freeze([{ stem: "癸", layer: "정기", weight: 100 }]),
  丑: Object.freeze([{ stem: "己", layer: "정기", weight: 60 }, { stem: "癸", layer: "중기", weight: 30 }, { stem: "辛", layer: "여기", weight: 10 }]),
  寅: Object.freeze([{ stem: "甲", layer: "정기", weight: 60 }, { stem: "丙", layer: "중기", weight: 30 }, { stem: "戊", layer: "여기", weight: 10 }]),
  卯: Object.freeze([{ stem: "乙", layer: "정기", weight: 100 }]),
  辰: Object.freeze([{ stem: "戊", layer: "정기", weight: 60 }, { stem: "乙", layer: "중기", weight: 30 }, { stem: "癸", layer: "여기", weight: 10 }]),
  巳: Object.freeze([{ stem: "丙", layer: "정기", weight: 60 }, { stem: "戊", layer: "중기", weight: 30 }, { stem: "庚", layer: "여기", weight: 10 }]),
  午: Object.freeze([{ stem: "丁", layer: "정기", weight: 70 }, { stem: "己", layer: "중기", weight: 30 }]),
  未: Object.freeze([{ stem: "己", layer: "정기", weight: 60 }, { stem: "丁", layer: "중기", weight: 30 }, { stem: "乙", layer: "여기", weight: 10 }]),
  申: Object.freeze([{ stem: "庚", layer: "정기", weight: 60 }, { stem: "壬", layer: "중기", weight: 30 }, { stem: "戊", layer: "여기", weight: 10 }]),
  酉: Object.freeze([{ stem: "辛", layer: "정기", weight: 100 }]),
  戌: Object.freeze([{ stem: "戊", layer: "정기", weight: 60 }, { stem: "辛", layer: "중기", weight: 30 }, { stem: "丁", layer: "여기", weight: 10 }]),
  亥: Object.freeze([{ stem: "壬", layer: "정기", weight: 70 }, { stem: "甲", layer: "중기", weight: 30 }]),
});
const CHUNG_PAIRS = Object.freeze({
  子: "午",
  午: "子",
  丑: "未",
  未: "丑",
  寅: "申",
  申: "寅",
  卯: "酉",
  酉: "卯",
  辰: "戌",
  戌: "辰",
  巳: "亥",
  亥: "巳",
});
const EARTH_STORAGE_BRANCHES = Object.freeze(["辰", "戌", "丑", "未"]);
const EARTH_STORAGE_INFO = Object.freeze({
  辰: Object.freeze({ korean: "진", storageType: "水庫", storageElement: "water", hiddenStems: Object.freeze(["戊", "乙", "癸"]) }),
  戌: Object.freeze({ korean: "술", storageType: "火庫", storageElement: "fire", hiddenStems: Object.freeze(["戊", "辛", "丁"]) }),
  丑: Object.freeze({ korean: "축", storageType: "金庫", storageElement: "metal", hiddenStems: Object.freeze(["己", "癸", "辛"]) }),
  未: Object.freeze({ korean: "미", storageType: "木庫", storageElement: "wood", hiddenStems: Object.freeze(["己", "丁", "乙"]) }),
});
const EARTH_STORAGE_OPENING_STRENGTH = Object.freeze({ 충: "veryStrong", 형: "strong", 파: "medium", 해: "weak" });
const EARTH_STORAGE_PUNISHMENT_PAIRS = Object.freeze(new Set(["丑戌", "戌丑", "未戌", "戌未"]));
const EARTH_STORAGE_BREAK_PAIRS = Object.freeze(new Set(["辰丑", "丑辰", "戌未", "未戌"]));
const EARTH_STORAGE_HARM_PAIRS = Object.freeze(new Set(["辰卯", "卯辰", "戌酉", "酉戌", "丑午", "午丑", "未子", "子未"]));
const EARTH_STORAGE_TRI_PUNISHMENT = Object.freeze(["丑", "未", "戌"]);
const OPENING_STRENGTH_ORDER = Object.freeze(["weak", "medium", "strong", "veryStrong"]);
const DEFAULT_SAJU_PROMPT_CONFIG = Object.freeze({
  earthStorageOpening: Object.freeze({
    enabled: true,
    mode: "standard",
    scope: "natal_daewoon_sewoon",
    relationStrength: Object.freeze({ 충: "veryStrong", 형: "strong", 파: "medium", 해: "weak" }),
  }),
});

const SAJU_QUESTION_FOCUS_GUIDE = Object.freeze({
  career: [
    "관성으로 직함·조직 압력·평판 운을 먼저 가늠하기",
    "식상으로 기획력·표현력·성과 생산성을 나누기",
    "인성으로 학습력·자격·문서 운의 받침을 살피기",
    "대운의 용신/기신 흐름으로 이직·승진·독립 타이밍을 가르기",
  ],
  money: [
    "재성의 위치와 투출 여부로 돈이 머무는 그릇을 살피기",
    "식상생재 흐름으로 매출화·현금화 통로를 가르기",
    "비겁 과다/약세로 동업·경쟁·분산 지출의 흔들림을 짚기",
    "대운에서 재성·식상이 열리는 구간과 기신 충돌 구간을 분리하기",
  ],
  love: [
    "일지와 배우자성으로 끌림·안정·거리감의 결을 살피기",
    "관성/재성의 맑음과 탁함으로 장기 관계의 압력선을 가르기",
    "합·충·형·파·해로 만남과 갈등의 반복 리듬을 짚기",
    "대운에서 관계성이 강해지는 시기와 피로가 쌓이는 시기를 나누기",
  ],
  relationship: [
    "비겁·관성·식상으로 주도권, 경계선, 말의 날을 나누기",
    "월지와 일지의 긴장으로 가족·동료·고객 관계의 압력선을 살피기",
    "합충형파해로 가까워지는 사람과 소모되는 사람의 신호를 가르기",
    "대운 변화가 관계 선택에 어떤 거리를 여는지 짚기",
  ],
  health: [
    "오행 편중과 조후로 몸의 열·냉·습·건 리듬을 먼저 살피기",
    "인성·식상 흐름으로 회복력, 수면, 소화, 긴장 방식을 나누기",
    "기신이 강해지는 대운에서 과로와 생활 리듬 붕괴 신호를 짚기",
    "의료 판단은 배제하고 컨디션 관리와 생활 루틴으로만 돌리기",
  ],
  life_direction: [
    "일간과 월령으로 타고난 기질의 중심축을 세우기",
    "격국·용신·십성 배치로 삶의 무대와 성장 방식을 가르기",
    "대운의 상승/조정 구간으로 지금 붙잡을 일과 내려놓을 일을 나누기",
    "퀀텀 오행 판정으로 현재 운의 문이 어느 원소에 열리는지 짚기",
  ],
  general: [
    "질문 속 핵심 욕구를 십성으로 옮긴 뒤 원국에서 먼저 확인하기",
    "일간·월지·조후·용신·대운을 한 줄로 묶어 상담 초점을 세우기",
    "확정 문장보다 선택지, 확인 질문, 실행 순서로 흐름을 열기",
  ],
});

const SAJU_DOMAIN_FOCUS_GUIDE = Object.freeze({
  litigation: [
    "관성·칠살·상관의 긴장으로 문서, 규칙, 충돌의 압력선을 살피기",
    "합충형파해가 강한 구간은 감정 대응보다 증거·기록·절차로 돌리기",
  ],
});

function toText(value, fallback = DEFAULT_TEXT) {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function toArrayText(values, fallback = DEFAULT_TEXT) {
  if (!Array.isArray(values)) return fallback;
  const normalized = values
    .map((item) => String(item == null ? "" : item).trim())
    .filter(Boolean);
  return normalized.length ? normalized.join(", ") : fallback;
}

function toGenderLabel(gender) {
  const v = String(gender || "").trim().toUpperCase();
  if (v === "M") return "남성";
  if (v === "F") return "여성";
  return DEFAULT_TEXT;
}

function normalizeStem(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return "";
  for (const stem of SAJU_STEMS) {
    if (text.includes(stem)) return stem;
  }
  for (const [ko, stem] of Object.entries(KO_TO_STEM)) {
    if (text.includes(ko)) return stem;
  }
  return "";
}

function normalizeBranch(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return "";
  for (const branch of SAJU_BRANCHES) {
    if (text.includes(branch)) return branch;
  }
  for (const [ko, branch] of Object.entries(KO_TO_BRANCH)) {
    if (text.includes(ko)) return branch;
  }
  return "";
}

function normalizeElementKey(value) {
  const text = String(value == null ? "" : value).trim().toLowerCase();
  if (!text) return "";
  if (ELEMENT_KO_BY_KEY[text]) return text;
  for (const [ko, key] of Object.entries(ELEMENT_KEY_BY_KO)) {
    if (text.includes(ko)) return key;
  }
  if (text.includes("wood")) return "wood";
  if (text.includes("fire")) return "fire";
  if (text.includes("earth")) return "earth";
  if (text.includes("metal")) return "metal";
  if (text.includes("water")) return "water";
  return "";
}

function uniqueTexts(values) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const text = String(value == null ? "" : value).trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

function normalizeOpeningMode(value) {
  const key = String(value || "").trim();
  if (["conservative", "보수적"].includes(key)) return "conservative";
  if (["active", "aggressive", "적극적"].includes(key)) return "active";
  return "standard";
}

function normalizeOpeningScope(value) {
  const key = String(value || "").trim();
  if (["natal", "원국 내부 형충해파"].includes(key)) return "natal";
  if (["natal_daewoon", "원국 + 대운"].includes(key)) return "natal_daewoon";
  if (["natal_sewoon", "원국 + 세운"].includes(key)) return "natal_sewoon";
  if (["all", "month_daily", "월운/일진까지 포함"].includes(key)) return "all";
  return "natal_daewoon_sewoon";
}

function normalizeOpeningStrength(value, fallback) {
  const key = String(value || "").trim();
  if (OPENING_STRENGTH_ORDER.includes(key)) return key;
  if (["매우 강함", "very strong"].includes(key)) return "veryStrong";
  if (["강함", "strong"].includes(key)) return "strong";
  if (["중간", "medium"].includes(key)) return "medium";
  if (["약함", "weak"].includes(key)) return "weak";
  return fallback;
}

function normalizeSajuPromptConfig(sajuResult) {
  const candidates = [
    sajuResult?.adminPromptConfig,
    sajuResult?.promptConfig,
    sajuResult?.engineContext?.adminPromptConfig,
    sajuResult?.engineContext?.promptConfig,
    sajuResult?.engineContext?.sajuPromptConfig,
  ].filter((item) => item && typeof item === "object");
  const raw = candidates[0] || {};
  const rawEarth = raw.earthStorageOpening && typeof raw.earthStorageOpening === "object"
    ? raw.earthStorageOpening
    : raw;
  const enabledValue = rawEarth.enabled ?? rawEarth.earthStorageOpeningEnabled;
  const relationStrength = rawEarth.relationStrength && typeof rawEarth.relationStrength === "object"
    ? rawEarth.relationStrength
    : {};
  return {
    earthStorageOpening: {
      enabled: enabledValue === false || enabledValue === "false" ? false : DEFAULT_SAJU_PROMPT_CONFIG.earthStorageOpening.enabled,
      mode: normalizeOpeningMode(rawEarth.mode || rawEarth.earthStorageOpeningMode),
      scope: normalizeOpeningScope(rawEarth.scope || rawEarth.earthStorageOpeningScope),
      relationStrength: {
        충: normalizeOpeningStrength(relationStrength.충 || rawEarth.chungStrength, DEFAULT_SAJU_PROMPT_CONFIG.earthStorageOpening.relationStrength.충),
        형: normalizeOpeningStrength(relationStrength.형 || rawEarth.punishmentStrength, DEFAULT_SAJU_PROMPT_CONFIG.earthStorageOpening.relationStrength.형),
        파: normalizeOpeningStrength(relationStrength.파 || rawEarth.breakStrength, DEFAULT_SAJU_PROMPT_CONFIG.earthStorageOpening.relationStrength.파),
        해: normalizeOpeningStrength(relationStrength.해 || rawEarth.harmStrength, DEFAULT_SAJU_PROMPT_CONFIG.earthStorageOpening.relationStrength.해),
      },
    },
  };
}

export function getTenGodFromDayMaster(dayStem, targetStem) {
  const day = normalizeStem(dayStem);
  const target = normalizeStem(targetStem);
  const dayElement = STEM_ELEMENT_KEY[day];
  const targetElement = STEM_ELEMENT_KEY[target];
  if (!day || !target || !dayElement || !targetElement) return "";

  const samePolarity = STEM_POLARITY[day] === STEM_POLARITY[target];
  if (dayElement === targetElement) return samePolarity ? "비견" : "겁재";
  if (ELEMENT_GENERATES[dayElement] === targetElement) return samePolarity ? "식신" : "상관";
  if (ELEMENT_GENERATES[targetElement] === dayElement) return samePolarity ? "편인" : "정인";
  if (ELEMENT_CONTROLS[dayElement] === targetElement) return samePolarity ? "편재" : "정재";
  if (ELEMENT_CONTROLS[targetElement] === dayElement) return samePolarity ? "편관" : "정관";
  return "";
}

function parsePillarLike(value) {
  const text = String(value == null ? "" : value).trim();
  return {
    stem: normalizeStem(text),
    branch: normalizeBranch(text),
  };
}

function readPillar(source, fallbackGanji = "") {
  const s = source && typeof source === "object" ? source : {};
  const parsed = parsePillarLike(
    fallbackGanji
      || s.ganji
      || s.pillar
      || s.value
      || `${s.g || s.gan || s.stem || ""}${s.j || s.zhi || s.branch || ""}`,
  );
  return {
    stem: normalizeStem(s.g || s.gan || s.stem || s.heavenlyStem) || parsed.stem,
    branch: normalizeBranch(s.j || s.zhi || s.branch || s.earthlyBranch) || parsed.branch,
    stemElement: normalizeElementKey(s.gEKey || s.gE || s.stemElement || s.ganElement),
    branchElement: normalizeElementKey(s.jEKey || s.jE || s.branchElement || s.zhiElement),
  };
}

function normalizeSajuPillarRows(sajuResult) {
  const result = sajuResult && typeof sajuResult === "object" ? sajuResult : {};
  const p = result.pillars && typeof result.pillars === "object" ? result.pillars : {};
  const bazi = result.bazi && typeof result.bazi === "object" ? result.bazi : {};
  const engineBazi = result.engineContext?.bazi && typeof result.engineContext.bazi === "object"
    ? result.engineContext.bazi
    : {};
  return [
    { position: "year", ...readPillar(p.y || p.year, bazi.yearPillar || engineBazi.yearPillar || `${bazi.yearGan || ""}${bazi.yearZhi || ""}`) },
    { position: "month", ...readPillar(p.m || p.month, bazi.monthPillar || engineBazi.monthPillar || `${bazi.monthGan || ""}${bazi.monthZhi || ""}`) },
    { position: "day", ...readPillar(p.d || p.day, bazi.dayPillar || engineBazi.dayPillar || `${bazi.dayGan || ""}${bazi.dayZhi || ""}`) },
    { position: "hour", ...readPillar(p.h || p.hour, bazi.hourPillar || engineBazi.hourPillar || `${bazi.timeGan || ""}${bazi.timeZhi || ""}`) },
  ].filter((row) => row.stem || row.branch);
}

function normalizeLuckScope(scope, fallback) {
  const key = String(scope || fallback || "").trim().toLowerCase();
  if (["daewoon", "daewun", "대운"].includes(key)) return "daewoon";
  if (["sewoon", "annual", "yearly", "세운"].includes(key)) return "sewoon";
  if (["monthly", "month", "월운"].includes(key)) return "month운";
  if (["daily", "day", "일운", "일진"].includes(key)) return "day운";
  return fallback || "luck";
}

function buildLuckRow(raw, fallbackScope) {
  const row = raw && typeof raw === "object" ? raw : {};
  const parsed = parsePillarLike(row.ganji || row.pillar || row.label || `${row.gan || row.stem || ""}${row.zhi || row.branch || ""}`);
  const stem = normalizeStem(row.gan || row.stem || row.heavenlyStem) || parsed.stem;
  const branch = normalizeBranch(row.zhi || row.branch || row.earthlyBranch) || parsed.branch;
  if (!stem && !branch) return null;
  const scope = normalizeLuckScope(row.scope || row.type, fallbackScope);
  const age = Number(row.age || row.startAge || row.startAgeYears || 0) || null;
  const year = Number(row.year || row.targetYear || 0) || null;
  const labelPrefix = scope === "daewoon" && age ? `${age}세 ` : (scope === "sewoon" && year ? `${year}년 ` : "");
  const label = toText(row.label || row.ganji || row.pillar || `${stem}${branch}`, `${stem}${branch}`);
  return {
    scope,
    stem,
    branch,
    age,
    year,
    label: `${labelPrefix}${label}`.trim(),
  };
}

function buildSexagenaryYearPillar(year) {
  const y = Number(year);
  if (!Number.isFinite(y) || y < 1900) return null;
  const index = ((Math.trunc(y) - 4) % 60 + 60) % 60;
  return {
    scope: "sewoon",
    stem: SAJU_STEMS[index % 10],
    branch: SAJU_BRANCHES[index % 12],
    year: Math.trunc(y),
    label: `${Math.trunc(y)}년 ${SAJU_STEMS[index % 10]}${SAJU_BRANCHES[index % 12]}`,
  };
}

function normalizeSajuLuckRows(sajuResult, engineContext) {
  const result = sajuResult && typeof sajuResult === "object" ? sajuResult : {};
  const bazi = result.bazi && typeof result.bazi === "object" ? result.bazi : {};
  const rows = [];
  const addRows = (items, scope) => {
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      const row = buildLuckRow(item, scope);
      if (row) rows.push(row);
    });
  };

  addRows(engineContext?.quantum?.daewun, "daewoon");
  addRows(result.daewoon, "daewoon");
  addRows(result.daewun, "daewoon");
  addRows(bazi.daewunBridge, "daewoon");
  addRows(result.sewoon, "sewoon");
  addRows(result.annualLuck, "sewoon");
  addRows(result.yearlyLuck, "sewoon");
  addRows(result.monthlyLuck, "month운");
  addRows(result.dailyLuck, "day운");
  addRows(result.luckPillars, "luck");

  const hasAnnual = rows.some((row) => row.scope === "sewoon");
  if (!hasAnnual) {
    const explicitYear = Number(result.targetYear || result.currentYear || result.engineContext?.currentYear || 0);
    const currentYear = Number.isFinite(explicitYear) && explicitYear > 0 ? explicitYear : new Date().getUTCFullYear();
    const annual = buildSexagenaryYearPillar(currentYear);
    if (annual) rows.push(annual);
  }

  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.scope}:${row.stem}:${row.branch}:${row.age || ""}:${row.year || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferElementFavorability(element, power) {
  const p = power && typeof power === "object" ? power : {};
  const yongshin = asArray(p.yongshin).map(normalizeElementKey).filter(Boolean);
  const kijishin = asArray(p.kijishin).concat(asArray(p.gisin)).map(normalizeElementKey).filter(Boolean);
  if (yongshin.includes(element)) return true;
  if (kijishin.includes(element)) return false;
  return null;
}

function getBranchRelationType(sourceBranch, triggerBranch) {
  const pair = `${sourceBranch}${triggerBranch}`;
  if (CHUNG_PAIRS[sourceBranch] === triggerBranch) return "충";
  if (EARTH_STORAGE_PUNISHMENT_PAIRS.has(pair)) return "형";
  if (EARTH_STORAGE_BREAK_PAIRS.has(pair)) return "파";
  if (EARTH_STORAGE_HARM_PAIRS.has(pair)) return "해";
  return "";
}

function boostOpeningStrength(strength, steps = 1) {
  const index = OPENING_STRENGTH_ORDER.indexOf(strength);
  if (index < 0) return strength;
  return OPENING_STRENGTH_ORDER[Math.min(OPENING_STRENGTH_ORDER.length - 1, index + Math.max(0, steps))];
}

function adjustOpeningStrength(strength, mode) {
  if (mode === "active") return boostOpeningStrength(strength, 1);
  if (mode !== "conservative") return strength;
  const index = OPENING_STRENGTH_ORDER.indexOf(strength);
  if (index <= 0) return strength;
  return OPENING_STRENGTH_ORDER[index - 1];
}

function relationStrengthFromConfig(relationType, config) {
  const raw = config?.earthStorageOpening?.relationStrength?.[relationType]
    || EARTH_STORAGE_OPENING_STRENGTH[relationType]
    || "weak";
  return normalizeOpeningStrength(raw, EARTH_STORAGE_OPENING_STRENGTH[relationType] || "weak");
}

function timingTypeFromPosition(position) {
  if (position === "daewoon") return "daewoon";
  if (position === "sewoon") return "sewoon";
  if (position === "month운") return "monthly";
  if (position === "day운") return "daily";
  return "natal";
}

function luckScopeToPosition(scope) {
  if (scope === "daewoon") return "daewoon";
  if (scope === "sewoon") return "sewoon";
  if (scope === "month운") return "month운";
  if (scope === "day운") return "day운";
  return scope || "luck";
}

function shouldIncludeOpeningPosition(position, scope) {
  if (["year", "month", "day", "hour"].includes(position)) return true;
  if (scope === "natal") return false;
  if (scope === "natal_daewoon") return position === "daewoon";
  if (scope === "natal_sewoon") return position === "sewoon";
  if (scope === "all") return ["daewoon", "sewoon", "month운", "day운"].includes(position);
  return ["daewoon", "sewoon"].includes(position);
}

function buildOpeningBranchRows(pillarRows, luckRows, scope) {
  const natalRows = pillarRows.map((row) => ({
    branch: row.branch,
    position: row.position,
    label: PILLAR_POSITION_LABELS[row.position] || row.position,
    timingType: "natal",
  })).filter((row) => row.branch);
  const luckBranchRows = luckRows.map((row) => {
    const position = luckScopeToPosition(row.scope);
    return {
      branch: row.branch,
      position,
      label: row.label || `${row.stem || ""}${row.branch || ""}`,
      timingType: timingTypeFromPosition(position),
    };
  }).filter((row) => row.branch && shouldIncludeOpeningPosition(row.position, scope));
  return natalRows.concat(luckBranchRows);
}

function affectedAreasFromTenGods(tenGods, sourcePosition, relationType) {
  const areas = new Set();
  tenGods.forEach((tenGod) => {
    if (["정재", "편재"].includes(tenGod)) ["재물", "사업", "연애"].forEach((area) => areas.add(area));
    if (["정관", "편관"].includes(tenGod)) ["직장", "승진", "결혼", "법적문제"].forEach((area) => areas.add(area));
    if (["정인", "편인"].includes(tenGod)) ["학업", "가족", "심리"].forEach((area) => areas.add(area));
    if (["식신", "상관"].includes(tenGod)) ["창작", "사업", "건강"].forEach((area) => areas.add(area));
    if (["비견", "겁재"].includes(tenGod)) ["사업", "가족", "심리"].forEach((area) => areas.add(area));
  });
  if (sourcePosition === "month") ["직장", "사업"].forEach((area) => areas.add(area));
  if (sourcePosition === "day") ["연애", "결혼", "심리", "건강"].forEach((area) => areas.add(area));
  if (relationType === "충") areas.add("이동");
  return Array.from(areas).slice(0, 8);
}

function buildEarthStorageOpeningSummary(opening) {
  const opened = opening.openedHiddenStems
    .map((row) => `${row.stem}${row.tenGodFromDayMaster ? `(${row.tenGodFromDayMaster})` : ""}`)
    .join(", ");
  const timing = opening.timingType === "natal"
    ? "원국 안에서 이미 압력이 머뭅니다"
    : `${opening.timingLabel || opening.triggerPosition}에 시기성이 열립니다`;
  const favorableText = opening.isFavorableOverall === true
    ? "용신·희신성 지장간이 함께 열려 기회로 쓰일 여지가 큽니다"
    : opening.isFavorableOverall === false
      ? "기신성 지장간이 열릴 수 있어 부담과 갈등을 낮추어 다뤄야 합니다"
      : "희기 판단은 단정하지 말고 질문 주제와 함께 살펴야 합니다";
  return `${opening.sourceBranch} ${opening.storageType || "토 창고"}가 ${opening.triggerBranch} ${opening.relationType} 자극을 받아 개고됩니다. 열린 지장간은 ${opened || "지장간 미상"}이며, ${timing}. ${favorableText}.`;
}

function buildOpenedHiddenStemsForStorage(branch, dayStem, power) {
  const hiddenRows = HIDDEN_STEMS_BY_BRANCH[branch] || [];
  return hiddenRows.map((hidden) => {
    const element = STEM_ELEMENT_KEY[hidden.stem] || "";
    return {
      stem: hidden.stem,
      stemKorean: STEM_KO[hidden.stem] || "",
      element,
      tenGodFromDayMaster: getTenGodFromDayMaster(dayStem, hidden.stem),
      layer: hidden.layer || "unknown",
      favorable: inferElementFavorability(element, power),
    };
  });
}

function buildEarthStorageOpenings({ pillarRows, luckRows, dayStem, power, config }) {
  const earthConfig = config?.earthStorageOpening || DEFAULT_SAJU_PROMPT_CONFIG.earthStorageOpening;
  if (earthConfig.enabled === false) return [];

  const branchRows = buildOpeningBranchRows(pillarRows, luckRows, earthConfig.scope);
  const allBranches = new Set(branchRows.map((row) => row.branch));
  const openings = [];
  const seen = new Set();

  for (let i = 0; i < branchRows.length; i += 1) {
    const source = branchRows[i];
    if (!EARTH_STORAGE_INFO[source.branch]) continue;
    for (let j = 0; j < branchRows.length; j += 1) {
      if (i === j) continue;
      const trigger = branchRows[j];
      if (source.branch === trigger.branch) continue;
      const relationType = getBranchRelationType(source.branch, trigger.branch);
      if (!relationType) continue;

      let openingStrength = relationStrengthFromConfig(relationType, config);
      const sameSourceRelationCount = branchRows.filter((row, index) => index !== i && getBranchRelationType(source.branch, row.branch)).length;
      if (sameSourceRelationCount > 1) openingStrength = boostOpeningStrength(openingStrength, 1);
      if (relationType === "형" && EARTH_STORAGE_TRI_PUNISHMENT.every((branch) => allBranches.has(branch))) {
        openingStrength = boostOpeningStrength(openingStrength, 1);
      }
      openingStrength = adjustOpeningStrength(openingStrength, earthConfig.mode);

      const storage = EARTH_STORAGE_INFO[source.branch];
      const openedHiddenStems = buildOpenedHiddenStemsForStorage(source.branch, dayStem, power);
      const mainActivatedTenGods = uniqueTexts(openedHiddenStems.map((row) => row.tenGodFromDayMaster));
      const favorableRows = openedHiddenStems.filter((row) => row.favorable === true).length;
      const unfavorableRows = openedHiddenStems.filter((row) => row.favorable === false).length;
      const isFavorableOverall = favorableRows > unfavorableRows
        ? true
        : (unfavorableRows > favorableRows ? false : null);
      const timingType = source.timingType !== "natal" ? source.timingType : trigger.timingType;
      const timingLabel = timingType === "natal"
        ? "원국 내부"
        : (source.timingType !== "natal" ? source.label : trigger.label);
      const key = `${source.position}:${source.branch}:${trigger.position}:${trigger.branch}:${relationType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const opening = {
        exists: true,
        sourceBranch: source.branch,
        sourceBranchKorean: storage.korean,
        sourcePosition: source.position,
        triggerBranch: trigger.branch,
        triggerBranchKorean: BRANCH_KO[trigger.branch] || "",
        triggerPosition: trigger.position,
        relationType,
        openingStrength,
        storageType: storage.storageType,
        storageElement: storage.storageElement,
        openedHiddenStems,
        mainActivatedTenGods,
        affectedAreas: affectedAreasFromTenGods(mainActivatedTenGods, source.position, relationType),
        timingType,
        timingLabel,
        isFavorableOverall,
        summaryForPrompt: "",
      };
      opening.summaryForPrompt = buildEarthStorageOpeningSummary(opening);
      openings.push(opening);
    }
  }

  return openings.sort((a, b) => {
    const strengthDiff = OPENING_STRENGTH_ORDER.indexOf(b.openingStrength) - OPENING_STRENGTH_ORDER.indexOf(a.openingStrength);
    if (strengthDiff) return strengthDiff;
    const positionWeight = { month: 4, day: 3, year: 2, hour: 2, daewoon: 1, sewoon: 1, "month운": 0, "day운": 0 };
    return (positionWeight[b.sourcePosition] || 0) - (positionWeight[a.sourcePosition] || 0);
  });
}

function normalizeExistingDoChungPayload(sajuResult) {
  const result = sajuResult && typeof sajuResult === "object" ? sajuResult : {};
  const candidates = [
    result.advancedFactors?.doChung,
    result.doChung,
    result.dochung,
    result.do_chung,
    result.doChungAnalysis,
    result.dochungAnalysis,
    result.natalAnalysis?.doChungAnalysis,
    result.natalAnalysis?.dochungAnalysis,
    result.engineContext?.advancedFactors?.doChung,
    result.interactions?.doChung,
  ].filter((item) => item && typeof item === "object");

  for (const payload of candidates) {
    const rows = Array.isArray(payload.candidates) ? payload.candidates : [];
    const strongest = payload.strongest && typeof payload.strongest === "object" ? payload.strongest : rows[0];
    const row = strongest && typeof strongest === "object" ? strongest : payload;
    const repeatedBranch = normalizeBranch(row.repeatedBranch || row.branch);
    const repeatedCount = Number(row.repeatedCount || row.totalCount || row.count || 0) || 0;
    const inducedOppositeBranch = normalizeBranch(row.inducedOppositeBranch || row.impliedOpposite || row.inducedBranch);
    const exists = payload.exists === true || payload.activated === true || rows.length > 0 || repeatedCount >= 3;
    if (!exists && !repeatedBranch && !inducedOppositeBranch) continue;
    const summary = toText(
      payload.summaryForPrompt
        || row.summaryForPrompt
        || row.requiredPhrase
        || row.lifeEvent
        || row.interpretation
        || (Array.isArray(row.requiredSentences) ? row.requiredSentences.join(" ") : ""),
      exists ? "도충 후보가 감지되었으나 상담에서는 원국과 운의 질문 연결 지점에서만 다룹니다." : "도충 조건은 뚜렷하지 않습니다.",
    );
    return {
      exists,
      repeatedBranch: repeatedBranch || undefined,
      repeatedCount: repeatedCount || undefined,
      inducedOppositeBranch: inducedOppositeBranch || undefined,
      reason: toText(payload.principle || row.classification || row.reason, ""),
      affectedAreas: uniqueTexts(asArray(row.affectedAreas).concat(row.lifeEvents || [])).slice(0, 6),
      strength: repeatedCount >= 4 ? "strong" : (repeatedCount >= 3 || exists ? "medium" : "weak"),
      summaryForPrompt: summary,
    };
  }
  return null;
}

function buildComputedDoChungAnalysis(pillarRows, luckRows) {
  const branchRows = [];
  pillarRows.forEach((row) => {
    if (row.branch) branchRows.push({ source: "natal", scope: row.position, branch: row.branch, label: `${PILLAR_POSITION_LABELS[row.position] || row.position} ${row.branch}` });
  });
  luckRows.forEach((row) => {
    if (row.branch && ["daewoon", "sewoon", "month운", "day운"].includes(row.scope)) {
      branchRows.push({ source: "luck", scope: row.scope, branch: row.branch, label: row.label });
    }
  });

  let best = null;
  SAJU_BRANCHES.forEach((branch) => {
    const matches = branchRows.filter((row) => row.branch === branch);
    if (matches.length < 3) return;
    if (!best || matches.length > best.matches.length) {
      best = { branch, matches };
    }
  });

  if (!best) {
    return {
      exists: false,
      strength: "weak",
      affectedAreas: [],
      summaryForPrompt: "같은 지지가 3개 이상 중첩되는 도충 조건은 뚜렷하지 않습니다.",
    };
  }

  const induced = CHUNG_PAIRS[best.branch] || "";
  const strength = best.matches.length >= 4 ? "strong" : "medium";
  const areas = ["이동", "관계", "직장", "재물", "심리"];
  return {
    exists: true,
    repeatedBranch: best.branch,
    repeatedCount: best.matches.length,
    inducedOppositeBranch: induced,
    reason: `원국과 운에서 ${best.branch} 지지가 ${best.matches.length}개 중첩되어 반대 충 ${induced || "미상"}의 사건성이 유도되는 구조입니다.`,
    affectedAreas: areas,
    strength,
    summaryForPrompt: `${best.branch} 지지가 ${best.matches.length}개 중첩되어 ${induced || "반대 충"}의 기운이 유도됩니다. 원국에 없는 글자가 실제로 생긴다고 단정하지 말고, 질문 주제와 연결될 때 이동·관계·직장·재물 변동으로 자연스럽게 풀어야 합니다.`,
  };
}

function buildSajuHiddenStemItems(pillarRows, dayStem) {
  return pillarRows.flatMap((row) => {
    const hiddenRows = HIDDEN_STEMS_BY_BRANCH[row.branch] || [];
    return hiddenRows.map((hidden) => {
      const element = STEM_ELEMENT_KEY[hidden.stem] || "";
      return {
        branch: row.branch,
        branchKorean: BRANCH_KO[row.branch] || "",
        hiddenStem: hidden.stem,
        hiddenStemKorean: STEM_KO[hidden.stem] || "",
        position: row.position,
        layer: hidden.layer || "unknown",
        weight: hidden.weight,
        element,
        tenGodFromDayMaster: getTenGodFromDayMaster(dayStem, hidden.stem),
      };
    });
  });
}

function buildHiddenStemExposureSummary(stem, sourceBranches, natalPositions, luckPositions, tenGods) {
  const tenGodText = tenGods.length ? `일간 기준 ${tenGods.join("/")}` : "일간 기준 십성 미상";
  if (natalPositions.length && luckPositions.length) {
    return `${stem}(${tenGodText})가 ${sourceBranches.join(", ")} 지장간에 머물고 원국 천간과 운 천간에서 함께 드러나 잠재성이 실제 선택과 시기 사건으로 강하게 떠오릅니다.`;
  }
  if (natalPositions.length) {
    return `${stem}(${tenGodText})가 ${sourceBranches.join(", ")} 지장간에서 원국 천간으로 투간되어 내면에 머물던 기운이 성향·관계·직업성으로 드러납니다.`;
  }
  if (luckPositions.length) {
    return `${stem}(${tenGodText})가 ${sourceBranches.join(", ")} 지장간에 숨어 있다가 ${luckPositions.join(", ")}에서 투출되어 해당 시기의 사건성으로 열립니다.`;
  }
  return `${stem}(${tenGodText})는 ${sourceBranches.join(", ")} 지장간에 잠재되어 있으며 합충형파해나 운의 천간이 닿을 때 밖으로 떠오릅니다.`;
}

function buildSajuHiddenStemExposures(hiddenStems, pillarRows, luckRows, power) {
  const grouped = new Map();
  hiddenStems.forEach((item) => {
    const key = item.hiddenStem;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  return Array.from(grouped.entries()).map(([stem, rows]) => {
    const natalPositions = pillarRows
      .filter((row) => row.stem === stem)
      .map((row) => STEM_POSITION_LABELS[row.position] || row.position);
    const luckPositions = luckRows
      .filter((row) => row.stem === stem)
      .map((row) => `${row.scope === "daewoon" ? "대운" : row.scope === "sewoon" ? "세운" : row.scope} ${row.label}`.trim());
    const sourceBranches = uniqueTexts(rows.map((row) => row.branch));
    const tenGods = uniqueTexts(rows.map((row) => row.tenGodFromDayMaster));
    const element = STEM_ELEMENT_KEY[stem] || "";
    const favorable = inferElementFavorability(element, power);
    const interpretationLevel = natalPositions.length && luckPositions.length
      ? "strong"
      : (natalPositions.length || luckPositions.length || rows.some((row) => row.position === "month") ? "medium" : "weak");
    return {
      hiddenStem: stem,
      sourceBranches,
      exposedInNatalHeavenlyStem: natalPositions.length > 0,
      exposedNatalPositions: uniqueTexts(natalPositions),
      exposedByLuckStem: luckPositions.length > 0,
      exposedLuckPositions: uniqueTexts(luckPositions),
      interpretationLevel,
      favorable,
      summaryForPrompt: buildHiddenStemExposureSummary(stem, sourceBranches, uniqueTexts(natalPositions), uniqueTexts(luckPositions), tenGods),
    };
  });
}

export function buildSajuAdvancedFactors(sajuResult, engineContext) {
  const pillarRows = normalizeSajuPillarRows(sajuResult);
  const dayStem = pillarRows.find((row) => row.position === "day")?.stem || engineContext?.quantum?.dayStem || "";
  const luckRows = normalizeSajuLuckRows(sajuResult, engineContext);
  const promptConfig = normalizeSajuPromptConfig(sajuResult);
  const hiddenStems = buildSajuHiddenStemItems(pillarRows, dayStem);
  const hiddenStemExposures = buildSajuHiddenStemExposures(hiddenStems, pillarRows, luckRows, sajuResult?.power);
  const doChung = normalizeExistingDoChungPayload(sajuResult) || buildComputedDoChungAnalysis(pillarRows, luckRows);
  const earthStorageOpenings = buildEarthStorageOpenings({
    pillarRows,
    luckRows,
    dayStem,
    power: sajuResult?.power,
    config: promptConfig,
  });
  const twelveLifeStages = buildTwelveLifeStagesForPillars(pillarRows, dayStem);
  const gyeokguk = buildGyeokgukAnalysis({
    pillarRows,
    dayStem,
    hiddenStems,
    hiddenStemExposures,
    power: sajuResult?.power,
    jong: sajuResult?.jong,
    luckRows,
    doChung,
    earthStorageOpenings,
  });
  return {
    hiddenStems,
    hiddenStemExposures,
    doChung,
    earthStorageOpenings,
    twelveLifeStages,
    gyeokguk,
    promptConfig,
  };
}

function emptyTenGodCounts() {
  return Object.fromEntries(SAJU_TEN_GOD_ORDER.map((tenGod) => [tenGod, 0]));
}

function addTenGodCount(counts, tenGod, amount = 1) {
  if (!tenGod || !Object.hasOwn(counts, tenGod)) return;
  counts[tenGod] = Number((Number(counts[tenGod] || 0) + Number(amount || 0)).toFixed(2));
}

function cleanFactObject(value, depth = 0) {
  if (depth > 5) return undefined;
  if (value == null) return value;
  if (typeof value === "string") return value.trim().slice(0, 700);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 24).map((item) => cleanFactObject(item, depth + 1)).filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const out = {};
    Object.entries(value).slice(0, 40).forEach(([key, item]) => {
      if (/name|birth|phone|email|token|prompt/i.test(key)) return;
      const cleaned = cleanFactObject(item, depth + 1);
      if (cleaned !== undefined) out[key] = cleaned;
    });
    return out;
  }
  return undefined;
}

function branchHiddenStemFacts(position, branch, hiddenRows) {
  return hiddenRows
    .filter((row) => row.position === position && row.branch === branch)
    .map((row) => ({
      stem: row.hiddenStem,
      stemKorean: row.hiddenStemKorean,
      layer: row.layer,
      weight: row.weight,
      element: row.element,
      elementKo: ELEMENT_KO_BY_KEY[row.element] || row.element || "",
      tenGod: row.tenGodFromDayMaster,
    }));
}

function buildFixedTenGodTable(dayStem) {
  return SAJU_STEMS.map((stem) => ({
    stem,
    stemKorean: STEM_KO[stem] || "",
    element: STEM_ELEMENT_KEY[stem] || "",
    elementKo: ELEMENT_KO_BY_KEY[STEM_ELEMENT_KEY[stem]] || "",
    yinYang: STEM_POLARITY[stem] || "",
    yinYangKo: STEM_POLARITY_KO[STEM_POLARITY[stem]] || "",
    tenGod: getTenGodFromDayMaster(dayStem, stem),
  }));
}

function buildSajuMyeongsikFactCard(factSnapshot, question) {
  const f = factSnapshot && typeof factSnapshot === "object" ? factSnapshot : {};
  const day = f.dayMaster || {};
  const pillars = f.pillars || {};
  const elements = f.elementDistribution || {};
  const tenGods = f.tenGodDistribution || {};
  const hidden = f.hiddenStemsByBranch || {};
  const stems = f.heavenlyStemTenGods || {};
  const major = f.majorStructures || {};
  const yong = f.yongshinKijishin || {};
  const luck = f.luck || {};
  const formatPillar = (key) => {
    const row = pillars[key] || {};
    const stage = row.twelveLifeStageKo ? ` / 십이운성 ${row.twelveLifeStageKo}` : "";
    return `${row.label || key}: ${row.pillar || ""}${row.stemTenGod ? ` / 천간 ${row.stemTenGod}` : ""}${stage}`;
  };
  const formatHidden = (key) => {
    const row = hidden[key] || {};
    const list = Array.isArray(row.hiddenStems)
      ? row.hiddenStems.map((item) => `${item.stem}${item.stemKorean ? `(${item.stemKorean})` : ""}:${item.tenGod || "십성 미상"}/${item.layer || ""}`).join(" | ")
      : DEFAULT_TEXT;
    return `${row.label || key}: ${row.branch || ""} / ${list}`;
  };
  const countLine = (source) => SAJU_TEN_GOD_ORDER.map((tenGod) => `${tenGod} ${Number(source?.[tenGod] || 0)}`).join(", ");
  const fixedTable = Array.isArray(f.fixedTenGodTable)
    ? f.fixedTenGodTable.map((row) => `${row.stem}${row.stemKorean ? `(${row.stemKorean})` : ""}:${row.tenGod}`).join(" | ")
    : DEFAULT_TEXT;
  const openings = Array.isArray(major.earthStorageOpenings) && major.earthStorageOpenings.length
    ? major.earthStorageOpenings.slice(0, 6).map((row) => `${row.sourceBranch}-${row.triggerBranch} ${row.relationType}/${row.openingStrength}`).join(" | ")
    : "뚜렷한 개고 없음";
  const doChung = major.doChung?.exists
    ? `${major.doChung.repeatedBranch} 반복 ${major.doChung.repeatedCount}회, 유도 충 ${major.doChung.inducedOppositeBranch}`
    : "도충 조건 뚜렷하지 않음";
  const gyeok = major.gyeokguk || {};
  const gyeokCandidates = Array.isArray(gyeok.candidates) && gyeok.candidates.length
    ? gyeok.candidates.map((row) => `${row.name}(${row.tenGod}/${row.exposed ? "투출" : "미투출"}, ${row.score}점)`).join(" | ")
    : DEFAULT_TEXT;
  const gyeokBreaks = Array.isArray(gyeok.breakFactors) && gyeok.breakFactors.length
    ? gyeok.breakFactors.map((row) => `${row.type}: ${row.detail}`).join(" | ")
    : "뚜렷한 파격 없음";
  const gyeokActivated = Array.isArray(gyeok.luckTiming?.activated) && gyeok.luckTiming.activated.length
    ? gyeok.luckTiming.activated.map((row) => `${row.scope} ${row.label}`).join(" | ")
    : (gyeok.luckTiming?.note || DEFAULT_TEXT);
  const gyeokBroken = Array.isArray(gyeok.luckTiming?.broken) && gyeok.luckTiming.broken.length
    ? gyeok.luckTiming.broken.map((row) => `${row.scope} ${row.label}`).join(" | ")
    : (gyeok.luckTiming?.note || DEFAULT_TEXT);
  const daewun = Array.isArray(luck.daewun) && luck.daewun.length
    ? luck.daewun.slice(0, 6).map((row) => `${row.age || "?"}세 ${row.gan || ""}${row.zhi || ""} ${row.score == null ? "" : `${row.score}점`}`).join(" | ")
    : DEFAULT_TEXT;

  return [
    "[명식 사실 카드]",
    "",
    `promptVersion: ${f.promptVersion || SAJU_AI_PROMPT_VERSION}`,
    "",
    "1. 일간",
    `- 일간: ${day.stem || DEFAULT_TEXT}`,
    `- 오행: ${day.elementKo || DEFAULT_TEXT}`,
    `- 음양: ${day.yinYangKo || DEFAULT_TEXT}`,
    "",
    "2. 사주 원국",
    `- ${formatPillar("year")}`,
    `- ${formatPillar("month")}`,
    `- ${formatPillar("day")}`,
    `- ${formatPillar("hour")}`,
    "",
    "3. 천간 십성",
    `- 년간: ${stems.year?.stem || ""} ${stems.year?.tenGod || DEFAULT_TEXT}`,
    `- 월간: ${stems.month?.stem || ""} ${stems.month?.tenGod || DEFAULT_TEXT}`,
    `- 일간: ${stems.day?.stem || day.stem || ""} 본인`,
    `- 시간: ${stems.hour?.stem || ""} ${stems.hour?.tenGod || DEFAULT_TEXT}`,
    "",
    "4. 지지 및 장간 십성",
    `- ${formatHidden("year")}`,
    `- ${formatHidden("month")}`,
    `- ${formatHidden("day")}`,
    `- ${formatHidden("hour")}`,
    "",
    "5. 오행 분포",
    `- 목: ${elements.wood || 0}, 화: ${elements.fire || 0}, 토: ${elements.earth || 0}, 금: ${elements.metal || 0}, 수: ${elements.water || 0}`,
    "",
    "6. 십성 분포",
    `- 천간 기준: ${countLine(tenGods.heavenlyStems)}`,
    `- 지장간 가중 기준: ${countLine(tenGods.hiddenStemsWeighted)}`,
    `- 통합 기준: ${countLine(tenGods.combined)}`,
    "",
    "7. 일간 기준 십성 확정표",
    `- ${fixedTable}`,
    "",
    "8. 주요 구조",
    `- 지장간 투간/투출: ${Array.isArray(major.hiddenStemExposures) && major.hiddenStemExposures.length ? major.hiddenStemExposures.slice(0, 8).map((row) => `${row.hiddenStem}:${row.interpretationLevel}`).join(" | ") : DEFAULT_TEXT}`,
    `- 도충: ${doChung}`,
    `- 개고/형충해파: ${openings}`,
    `- 기타 관계: ${Array.isArray(major.interactions) && major.interactions.length ? major.interactions.map((row) => JSON.stringify(row)).join(" | ") : DEFAULT_TEXT}`,
    "",
    "9. 조후·용신·기신",
    `- 조후: ${f.johu?.type || DEFAULT_TEXT} / 점수 ${f.johu?.score ?? DEFAULT_TEXT}`,
    `- 신강/신약: ${f.power?.isStrong === true ? "신강" : f.power?.isStrong === false ? "신약" : DEFAULT_TEXT}`,
    `- 용신 후보: ${Array.isArray(yong.yongshin) && yong.yongshin.length ? yong.yongshin.join(", ") : DEFAULT_TEXT}`,
    `- 기신 후보: ${Array.isArray(yong.kijishin) && yong.kijishin.length ? yong.kijishin.join(", ") : DEFAULT_TEXT}`,
    "",
    "10. 격국",
    `- 최종 격국: ${gyeok.finalGyeokguk || DEFAULT_TEXT} (${gyeok.finalType || DEFAULT_TEXT})`,
    `- 판단 근거: ${gyeok.judgmentReason || DEFAULT_TEXT}`,
    `- 격국 후보: ${gyeokCandidates}`,
    `- 파격 요소: ${gyeokBreaks}`,
    `- 대운/세운 중 격국 활성화 시기: ${gyeokActivated}`,
    `- 대운/세운 중 파격 주의 시기: ${gyeokBroken}`,
    "",
    "11. 운 흐름",
    `- 대운: ${daewun}`,
    "",
    "12. 이용자 질문",
    `- 질문: ${String(question || f.question || "").trim()}`,
  ].join("\n");
}

export function buildSajuMyeongsikFactSnapshot({
  sajuResult,
  question,
  domain,
  questionType,
  engineContext,
  advancedFactors,
  weights,
  johu,
  power,
  jong,
} = {}) {
  const pillarRows = normalizeSajuPillarRows(sajuResult);
  const dayRow = pillarRows.find((row) => row.position === "day") || {};
  const dayStem = dayRow.stem || engineContext?.quantum?.dayStem || "";
  const hiddenRows = Array.isArray(advancedFactors?.hiddenStems) ? advancedFactors.hiddenStems : buildSajuHiddenStemItems(pillarRows, dayStem);
  const twelveLifeStageRows = Array.isArray(advancedFactors?.twelveLifeStages) && advancedFactors.twelveLifeStages.length
    ? advancedFactors.twelveLifeStages
    : buildTwelveLifeStagesForPillars(pillarRows, dayStem);
  const twelveLifeStageByPosition = Object.fromEntries(
    twelveLifeStageRows.filter((row) => row.position).map((row) => [row.position, row.stageKo || row.stage || ""]),
  );
  const heavenlyCounts = emptyTenGodCounts();
  const hiddenWeightedCounts = emptyTenGodCounts();
  const combinedCounts = emptyTenGodCounts();
  const pillarsByPosition = {};
  const heavenlyStemTenGods = {};
  const hiddenStemsByBranch = {};

  pillarRows.forEach((row) => {
    const label = PILLAR_POSITION_LABELS[row.position]?.replace("지", "주") || row.position;
    const stemLabel = STEM_POSITION_LABELS[row.position] || row.position;
    const branchLabel = PILLAR_POSITION_LABELS[row.position] || row.position;
    const stemTenGod = row.position === "day" ? "본인" : getTenGodFromDayMaster(dayStem, row.stem);
    const rowHidden = branchHiddenStemFacts(row.position, row.branch, hiddenRows);
    pillarsByPosition[row.position] = {
      label,
      pillar: `${row.stem || ""}${row.branch || ""}`,
      stem: row.stem,
      branch: row.branch,
      stemElement: row.stemElement || STEM_ELEMENT_KEY[row.stem] || "",
      stemElementKo: ELEMENT_KO_BY_KEY[row.stemElement || STEM_ELEMENT_KEY[row.stem]] || "",
      branchElement: row.branchElement || "",
      branchElementKo: ELEMENT_KO_BY_KEY[row.branchElement] || row.branchElement || "",
      stemTenGod,
      twelveLifeStageKo: twelveLifeStageByPosition[row.position] || "",
    };
    heavenlyStemTenGods[row.position] = {
      label: stemLabel,
      stem: row.stem,
      stemKorean: STEM_KO[row.stem] || "",
      tenGod: stemTenGod,
    };
    hiddenStemsByBranch[row.position] = {
      label: branchLabel,
      branch: row.branch,
      branchKorean: BRANCH_KO[row.branch] || "",
      hiddenStems: rowHidden,
    };
    if (stemTenGod !== "본인") {
      addTenGodCount(heavenlyCounts, stemTenGod, 1);
      addTenGodCount(combinedCounts, stemTenGod, 1);
    }
    rowHidden.forEach((item) => {
      const weight = Number(item.weight || 0) > 0 ? Number(item.weight || 0) / 100 : 1;
      addTenGodCount(hiddenWeightedCounts, item.tenGod, weight);
      addTenGodCount(combinedCounts, item.tenGod, weight);
    });
  });

  const factSnapshot = {
    promptVersion: SAJU_AI_PROMPT_VERSION,
    consultationType: "saju_myeongsik_ai",
    question: String(question || "").trim(),
    domain: String(domain || "").trim(),
    questionType: String(questionType || "").trim(),
    dayMaster: {
      stem: dayStem,
      stemKorean: STEM_KO[dayStem] || "",
      element: STEM_ELEMENT_KEY[dayStem] || "",
      elementKo: ELEMENT_KO_BY_KEY[STEM_ELEMENT_KEY[dayStem]] || "",
      yinYang: STEM_POLARITY[dayStem] || "",
      yinYangKo: STEM_POLARITY_KO[STEM_POLARITY[dayStem]] || "",
    },
    pillars: pillarsByPosition,
    heavenlyStemTenGods,
    hiddenStemsByBranch,
    elementDistribution: {
      wood: Number(weights?.wood || 0),
      fire: Number(weights?.fire || 0),
      earth: Number(weights?.earth || 0),
      metal: Number(weights?.metal || 0),
      water: Number(weights?.water || 0),
      dominant: weights?.dominant || DEFAULT_TEXT,
    },
    tenGodDistribution: {
      heavenlyStems: heavenlyCounts,
      hiddenStemsWeighted: hiddenWeightedCounts,
      combined: combinedCounts,
    },
    fixedTenGodTable: buildFixedTenGodTable(dayStem),
    majorStructures: {
      hiddenStemExposures: Array.isArray(advancedFactors?.hiddenStemExposures) ? advancedFactors.hiddenStemExposures : [],
      doChung: advancedFactors?.doChung || { exists: false },
      earthStorageOpenings: Array.isArray(advancedFactors?.earthStorageOpenings) ? advancedFactors.earthStorageOpenings : [],
      twelveLifeStages: twelveLifeStageRows,
      gyeokguk: advancedFactors?.gyeokguk || buildGyeokgukAnalysis({
        pillarRows,
        dayStem,
        hiddenStems: hiddenRows,
        hiddenStemExposures: Array.isArray(advancedFactors?.hiddenStemExposures) ? advancedFactors.hiddenStemExposures : [],
        power,
        jong,
        luckRows: normalizeSajuLuckRows(sajuResult, engineContext),
        doChung: advancedFactors?.doChung,
        earthStorageOpenings: advancedFactors?.earthStorageOpenings,
      }),
      interactions: cleanFactObject(
        sajuResult?.interactions
          || sajuResult?.advancedFactors?.interactions
          || sajuResult?.engineContext?.interactions
          || [],
      ) || [],
    },
    johu: cleanFactObject(johu || {}),
    power: cleanFactObject(power || {}),
    jong: cleanFactObject(jong || {}),
    yongshinKijishin: {
      yongshin: uniqueTexts([...(Array.isArray(power?.yongshin) ? power.yongshin : []), ...(Array.isArray(power?.yongsin) ? power.yongsin : [])]),
      kijishin: uniqueTexts([...(Array.isArray(power?.kijishin) ? power.kijishin : []), ...(Array.isArray(power?.gishin) ? power.gishin : [])]),
    },
    luck: {
      daewun: Array.isArray(engineContext?.quantum?.daewun) ? engineContext.quantum.daewun : [],
      luckRows: normalizeSajuLuckRows(sajuResult, engineContext).slice(0, 24),
    },
  };
  return {
    factSnapshot,
    factCard: buildSajuMyeongsikFactCard(factSnapshot, question),
  };
}

// 이미 만들어 둔 명식 사실 스냅샷을 화면과 프롬프트가 함께 쓰는 근거 형태로 옮긴다.
// 계산은 하지 않는다 — buildSajuMyeongsikFactSnapshot이 확정한 값을 이름만 붙여 나른다.
export function buildSajuAnalysisBasis(factSnapshot) {
  if (!factSnapshot || typeof factSnapshot !== "object") return null;
  const pillars = factSnapshot.pillars || {};
  const day = factSnapshot.dayMaster || {};
  const elements = factSnapshot.elementDistribution || {};
  const tenGods = factSnapshot.tenGodDistribution?.combined || {};
  const structures = factSnapshot.majorStructures || {};
  const luckRows = Array.isArray(factSnapshot.luck?.luckRows) ? factSnapshot.luck.luckRows : [];

  const pillarItems = ["year", "month", "day", "hour"].map((position) => {
    const row = pillars[position];
    if (!row?.pillar) return null;
    const detail = [
      row.stemElementKo ? `천간 ${row.stemElementKo}` : "",
      row.branchElementKo ? `지지 ${row.branchElementKo}` : "",
      row.stemTenGod ? `십성 ${row.stemTenGod}` : "",
      row.twelveLifeStageKo ? `십이운성 ${row.twelveLifeStageKo}` : "",
    ].filter(Boolean).join(" · ");
    return basisItem(row.label || position, `${row.pillar}${detail ? ` · ${detail}` : ""}`);
  });

  const elementItems = [
    basisItem("일간", `${day.stem || ""}${day.stemKorean ? `(${day.stemKorean})` : ""} · ${day.elementKo || ""} · ${day.yinYangKo || ""}`.trim(), { term: "일간" }),
    pillars.month?.branch ? basisItem("월지", `${pillars.month.branch}${pillars.month.branchElementKo ? ` · ${pillars.month.branchElementKo}` : ""}`, { term: "월지" }) : null,
    // 오행 가중치는 클라이언트 명식(natal.counts)에서 온다. 없으면 전부 0으로 보이므로 아예 항목을 빼
    // "목 0 · 화 0 …"처럼 계산이 실패한 듯한 줄이 화면에 남지 않게 한다.
    ["wood", "fire", "earth", "metal", "water"].some((key) => Number(elements[key] || 0) > 0)
      ? basisItem("오행 분포", ["목", "화", "토", "금", "수"].map((ko, index) => {
        const key = ["wood", "fire", "earth", "metal", "water"][index];
        return `${ko} ${Number(elements[key] || 0)}`;
      }).join(" · "), { term: "오행" })
      : null,
    elements.dominant && elements.dominant !== DEFAULT_TEXT ? basisItem("가장 강한 기운", String(elements.dominant)) : null,
  ];

  const tenGodItems = Object.entries(tenGods)
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 6)
    .map(([name, count]) => basisItem(name, `${Number(count)}`, { term: "십성" }));

  const structureItems = [
    structures.gyeokguk?.name ? basisItem("격국", String(structures.gyeokguk.name)) : null,
    (structures.hiddenStemExposures || []).length
      ? basisItem("지장간 투간", structures.hiddenStemExposures.slice(0, 3).map((row) => row?.label || row?.stem || "").filter(Boolean).join(", "), { term: "지장간", tone: "positive" })
      : null,
    structures.doChung?.exists ? basisItem("도충", String(structures.doChung.label || structures.doChung.summary || "성립"), { tone: "caution" }) : null,
    (structures.earthStorageOpenings || []).length
      ? basisItem("개고", structures.earthStorageOpenings.slice(0, 3).map((row) => row?.label || row?.branch || "").filter(Boolean).join(", "), { tone: "caution" })
      : null,
    (factSnapshot.yongshinKijishin?.yongshin || []).length
      ? basisItem("용신 후보", factSnapshot.yongshinKijishin.yongshin.slice(0, 3).join(", "), { term: "용신", tone: "positive" })
      : null,
    (factSnapshot.yongshinKijishin?.kijishin || []).length
      ? basisItem("기신 후보", factSnapshot.yongshinKijishin.kijishin.slice(0, 3).join(", "), { tone: "caution" })
      : null,
  ];

  const luckItems = luckRows.slice(0, 5).map((row) => basisItem(
    row?.label || row?.period || "운",
    [row?.ganji || row?.pillar, row?.tenGod, row?.note].filter(Boolean).join(" · ") || "확인된 흐름",
    { term: String(row?.label || "").includes("세운") ? "세운" : "대운" },
  ));

  return buildAnalysisBasisPayload({
    featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
    groups: [
      basisGroup("pillars", "명식 네 기둥", pillarItems, { hint: "태어난 해·달·날·시가 각각 한 기둥입니다. 날의 천간(일간)이 나 자신입니다." }),
      basisGroup("elements", "일간과 오행 균형", elementItems, { hint: "일간이 월지 계절에서 힘을 얻는지, 어떤 기운이 넘치고 부족한지를 봅니다." }),
      basisGroup("tenGods", "십성 분포", tenGodItems, { hint: "일간과 나머지 글자의 관계입니다. 많은 쪽이 삶에서 자주 쓰는 힘입니다." }),
      basisGroup("structures", "구조와 쓰임", structureItems, { hint: "겉으로 드러나는 재능(투간), 흔들리는 지점(도충·개고), 도움이 되는 기운(용신)을 봅니다." }),
      basisGroup("luck", "지금의 운 흐름", luckItems, { hint: "타고난 배치 위에 어떤 조명이 들어와 있는지를 봅니다." }),
    ],
    stages: [
      basisStage("pillars", "명식을 세우는 중", "년·월·일·시 네 기둥", ["pillars"]),
      basisStage("elements", "오행을 재는 중", "일간의 힘과 기운의 균형", ["elements"]),
      basisStage("tenGods", "십성을 매기는 중", "일간 기준 열 가지 관계", ["tenGods"]),
      basisStage("structures", "구조를 살피는 중", "격국·투간·용신", ["structures"]),
      basisStage("luck", "운의 결을 잇는 중", "대운과 세운", ["luck"]),
    ],
  });
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stemTextAliases(stem) {
  const elementKo = ELEMENT_KO_BY_KEY[STEM_ELEMENT_KEY[stem]] || "";
  const stemKo = STEM_KO[stem] || "";
  return uniqueTexts([
    stem,
    stemKo && elementKo ? `${stemKo}${elementKo}` : "",
    stemKo ? `${stemKo}간` : "",
    stemKo ? `${stem}(${stemKo})` : "",
  ]);
}

export function validateSajuMyeongsikTenGodText(text, factSnapshot) {
  const normalized = String(text || "");
  const table = Array.isArray(factSnapshot?.fixedTenGodTable) ? factSnapshot.fixedTenGodTable : [];
  const mismatches = [];
  table.forEach((row) => {
    const expected = String(row?.tenGod || "").trim();
    const stem = String(row?.stem || "").trim();
    if (!stem || !expected || expected === "본인") return;
    const aliases = stemTextAliases(stem).map(escapeRegExp).filter(Boolean);
    if (!aliases.length) return;
    const aliasPattern = `(?:${aliases.join("|")})`;
    SAJU_TEN_GOD_ORDER.filter((tenGod) => tenGod !== expected).forEach((wrongTenGod) => {
      const wrongPattern = escapeRegExp(wrongTenGod);
      const regex = new RegExp(`${aliasPattern}.{0,18}${wrongPattern}|${wrongPattern}.{0,18}${aliasPattern}`, "u");
      const match = normalized.match(regex);
      if (!match) return;
      const index = Math.max(0, Number(match.index || 0) - 12);
      const snippet = normalized.slice(index, index + 70);
      if (snippet.includes(expected) && /(아니라|아닌|말고|대신)/.test(snippet)) return;
      mismatches.push({ stem, expected, found: wrongTenGod, snippet });
    });
  });
  return {
    ok: mismatches.length === 0,
    mismatches,
  };
}

function normalizeBirthInfo(profile, snapshot) {
  const p = profile && typeof profile === "object" ? profile : {};
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const pb = p.birth && typeof p.birth === "object" ? p.birth : {};
  const sb = s.birth && typeof s.birth === "object" ? s.birth : {};
  const birth = {
    year: Number(pb.year || sb.year || 0) || null,
    month: Number(pb.month || sb.month || 0) || null,
    day: Number(pb.day || sb.day || 0) || null,
    hour: Number(pb.hour || sb.hour || 0) || null,
    minute: Number(pb.minute || sb.minute || 0) || null,
    calType: String(pb.calType || "solar").trim() || "solar",
  };

  const location = p.location && typeof p.location === "object" ? p.location : {};
  return {
    name: toText(p.name, "사용자"),
    gender: toGenderLabel(p.gender || s.gender),
    birthDate: (birth.year && birth.month && birth.day)
      ? `${String(birth.year).padStart(4, "0")}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}`
      : DEFAULT_TEXT,
    birthTime: Number.isFinite(birth.hour) && Number.isFinite(birth.minute)
      ? `${String(Math.trunc(birth.hour)).padStart(2, "0")}:${String(Math.trunc(birth.minute)).padStart(2, "0")}`
      : DEFAULT_TEXT,
    calendarType: birth.calType === "lunar" || birth.calType === "lunar_leap" ? "음력" : "양력",
    birthPlace: toText(location.label, DEFAULT_TEXT),
    timezone: toText(location.tz, DEFAULT_TEXT),
  };
}

/* 🔴 기둥 표기는 한 가지가 아니다 — 엔진은 {g, j} 로 주고 다른 호출부·계약 픽스처는 {ganji:"丙子"} 로
   준다. readPillar 가 그 둘을 모두 읽는 이 파일의 정본 리더인데(analysisBasis 는 그걸 쓴다) 여기만
   {g, j} 를 직접 읽어서, ganji 표기로 들어오면 같은 입력이 근거에는 丙子 로 실리면서 프롬프트의
   명식 블록에는 "--" 로 찍혔다. 리더를 하나로 맞춰 그 갈라짐을 없앤다. */
function normalizePillars(pillars) {
  const p = pillars && typeof pillars === "object" ? pillars : {};
  const y = readPillar(p.y || p.year);
  const m = readPillar(p.m || p.month);
  const d = readPillar(p.d || p.day);
  const h = readPillar(p.h || p.hour);
  const join = (row) => `${toText(row.stem, "-")}${toText(row.branch, "-")}`;

  return {
    yearPillar: join(y),
    monthPillar: join(m),
    dayPillar: join(d),
    hourPillar: join(h),
    dayStem: toText(d.stem, DEFAULT_TEXT),
    dayStemElement: toText(
      ELEMENT_KO_BY_KEY[d.stemElement] || ELEMENT_KO_BY_KEY[STEM_ELEMENT_KEY[d.stem]],
      DEFAULT_TEXT,
    ),
    dayStemPolarity: STEM_POLARITY_KO[STEM_POLARITY[d.stem]] || DEFAULT_TEXT,
  };
}

function normalizeElementWeights(sajuResult, snapshot) {
  const result = sajuResult && typeof sajuResult === "object" ? sajuResult : {};
  const natal = result.natal && typeof result.natal === "object" ? result.natal : {};
  const counts = natal.counts && typeof natal.counts === "object" ? natal.counts : {};
  const fromSnapshot = snapshot && snapshot.elementWeights && typeof snapshot.elementWeights === "object"
    ? snapshot.elementWeights
    : {};

  const wood = Number(counts.wood || fromSnapshot.wood || 0) || 0;
  const fire = Number(counts.fire || fromSnapshot.fire || 0) || 0;
  const earth = Number(counts.earth || fromSnapshot.earth || 0) || 0;
  const metal = Number(counts.metal || fromSnapshot.metal || 0) || 0;
  const water = Number(counts.water || fromSnapshot.water || 0) || 0;
  const dominant = toText(natal.dominant || snapshot?.analysis?.dayStemElement, DEFAULT_TEXT);

  return {
    wood,
    fire,
    earth,
    metal,
    water,
    dominant,
  };
}

function ensureValidQuestion(question) {
  const normalized = String(question || "").trim();
  if (!normalized || normalized.length < 5 || normalized.length > 1000) {
    throw new Error("INVALID_QUESTION");
  }
  return normalized;
}

function ensureSajuResultPresence(sajuResult) {
  if (!sajuResult || typeof sajuResult !== "object") {
    throw new Error("MISSING_SAJU_RESULT");
  }
  const pillars = sajuResult.pillars;
  const dayPillar = pillars && typeof pillars === "object" ? (pillars.d || pillars.day) : null;
  if (!dayPillar) {
    throw new Error("MISSING_SAJU_RESULT");
  }
  // 🔴 pillars.d 가 객체이기만 하면 통과하던 시절에는, 일간이 없어도 normalizePillars 가 "-" 로
  // 채워 사실상 빈 명식으로 20,000원 과금 + LLM 호출이 끝까지 돌았다. 일간은 십성 확정표의 기준축이라
  // 이게 없으면 상담 자체가 성립하지 않는다 — 결제 검증(handleSajuAIPrompt)보다 먼저 도는 이 지점에서
  // 막아야 과금 전에 400 으로 끝난다.
  // 🔴 판정은 readPillar 로 한다 — d.g/d.j 를 직접 읽으면 {ganji:"丙子"} 표기를 빈 명식으로 오인해
  // 정상 입력을 400 으로 막는다(계약 검증 verify:analysis-basis-contract 가 그 표기를 쓴다).
  const day = readPillar(dayPillar);
  if (!day.stem || !day.branch) {
    throw new Error("MISSING_SAJU_RESULT");
  }
}

export function classifySajuPromptQuestionType(question) {
  const text = String(question || "").trim().toLowerCase();
  if (!text) return "general";

  const ordered = ["career", "money", "love", "relationship", "health", "life_direction"];
  for (let i = 0; i < ordered.length; i += 1) {
    const type = ordered[i];
    const keywords = QUESTION_TYPE_RULES[type] || [];
    if (keywords.some((keyword) => text.includes(String(keyword).toLowerCase()))) {
      return type;
    }
  }
  return "general";
}

function includesAny(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase()));
}

function buildSajuAnalysisAngles(questionType, question) {
  const angles = SAJU_SPECIAL_ANGLES.slice();

  if (questionType === "money" || includesAny(question, ["재물", "돈", "수익", "사업", "창업", "부자", "투자"])) {
    return angles.concat(SAJU_MONEY_ANGLES);
  }

  if (questionType === "career") {
    angles.push(
      "관성/식상/인성 배치로 조직형·전문직형·자영업형 커리어 적합도 비교",
      "이직/전환 시기에서 손실 최소화 전략",
      "직업 선택 시 피해야 할 업무 환경과 관계 패턴",
    );
  }

  if (questionType === "love" || questionType === "relationship") {
    angles.push(
      "일지/배우자성/관성·재성의 관계 패턴과 감정 반응 분석",
      "갈등 유발 트리거와 회복을 위한 소통 프로토콜 제안",
      "결혼/동거/장기관계에서 안정성과 리스크 분리",
    );
  }

  if (questionType === "health") {
    angles.push(
      "오행 편중과 생활 리듬 불균형의 신호 해석",
      "대운·세운 변화 시기별 컨디션 관리 포인트",
      "과로/수면/스트레스 관리 우선순위 제안",
    );
  }

  return angles;
}

function buildSajuFollowUps(questionType) {
  const common = [
    "현재 대운 10년 구간에서 가장 강한 기회 테마는 무엇인가요?",
    "실패 확률을 줄이기 위해 먼저 검증해야 할 선택지는 무엇인가요?",
    "지금부터 90일 동안 실행할 우선순위 3가지를 제안해주세요.",
  ];

  if (questionType === "money") {
    return common.concat([
      "제 사주에서 현금흐름을 가장 빨리 만드는 수익모델 3가지는 무엇인가요?",
      "동업/투자/레버리지 중 가장 위험한 선택은 무엇이며 이유는 무엇인가요?",
      "재물운이 열리는 시기에 맞춰 준비해야 할 역량은 무엇인가요?",
    ]);
  }

  if (questionType === "career") {
    return common.concat([
      "조직 내 성장과 독립형 커리어 중 어떤 축이 더 유리한가요?",
      "이직 타이밍을 판단할 핵심 신호 3가지를 알려주세요.",
    ]);
  }

  if (questionType === "love" || questionType === "relationship") {
    return common.concat([
      "관계에서 반복되는 갈등 패턴을 끊기 위한 행동 교정 포인트는 무엇인가요?",
      "장기적으로 안정적인 관계를 위해 피해야 할 선택은 무엇인가요?",
    ]);
  }

  return common;
}

function uniqueStringArray(values) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const text = String(value == null ? "" : value).trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function compactSajuPromptText(value, maxLength = 260) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  const max = Math.max(80, Number(maxLength || 0) || 260);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function buildSajuQuestionFocusAngles(questionType, domain) {
  const typeKey = SAJU_QUESTION_FOCUS_GUIDE[questionType] ? questionType : "general";
  return uniqueStringArray([
    ...(SAJU_QUESTION_FOCUS_GUIDE[typeKey] || []),
    ...(SAJU_DOMAIN_FOCUS_GUIDE[domain] || []),
  ]);
}

function normalizeSajuEngineContext(sajuResult) {
  const context = sajuResult?.engineContext && typeof sajuResult.engineContext === "object"
    ? sajuResult.engineContext
    : {};
  const quantum = context.quantumMyeongli && typeof context.quantumMyeongli === "object"
    ? context.quantumMyeongli
    : {};
  const bazi = context.bazi && typeof context.bazi === "object" ? context.bazi : {};
  const elementMap = Array.isArray(quantum.elementMap)
    ? quantum.elementMap.map((item) => ({
      element: toText(item?.element, ""),
      label: toText(item?.label, ""),
      verdict: toText(item?.verdict, ""),
    })).filter((item) => item.element || item.label || item.verdict)
    : [];
  const daewun = Array.isArray(quantum.daewun)
    ? quantum.daewun.map((row) => ({
      age: Number(row?.age || 0) || null,
      gan: toText(row?.gan, ""),
      zhi: toText(row?.zhi, ""),
      ganElement: toText(row?.ganElement, ""),
      zhiElement: toText(row?.zhiElement, ""),
      score: Number.isFinite(Number(row?.score)) ? Number(row.score) : null,
      label: toText(row?.label, ""),
      className: toText(row?.className, ""),
      evalSummary: toText(row?.evalSummary, ""),
      jongStrength: toText(row?.jongStrength, ""),
      hasChungBonus: row?.hasChungBonus === true,
      hasChungPenalty: row?.hasChungPenalty === true,
      hasJiheBonus: row?.hasJiheBonus === true,
      hasSamhapBonus: row?.hasSamhapBonus === true,
    })).filter((row) => row.gan || row.zhi || row.age)
    : [];
  const featureDigests = Array.isArray(context.renderedFeatureDigests)
    ? context.renderedFeatureDigests.map((item) => ({
      id: toText(item?.id, ""),
      label: toText(item?.label, ""),
      text: compactSajuPromptText(item?.text, 420),
    })).filter((item) => item.text)
    : [];

  const normalized = {
    marker: toText(context.marker, ""),
    sourceLayers: Array.isArray(context.sourceLayers) ? context.sourceLayers.map((item) => toText(item, "")).filter(Boolean) : [],
    bazi,
    quantum: {
      dayStem: toText(quantum.dayStem, ""),
      monthBranch: toText(quantum.monthBranch, ""),
      currentAge: Number(quantum.currentAge || 0) || null,
      elementMap,
      daewun,
    },
    featureDigests,
  };
  normalized.advancedFactors = buildSajuAdvancedFactors(sajuResult, normalized);
  return normalized;
}

function buildSajuEngineContextLines(engineContext) {
  const lines = [];
  const layers = engineContext.sourceLayers.length ? engineContext.sourceLayers.join(", ") : DEFAULT_TEXT;
  lines.push(`엔진 참조층: ${layers}`);

  const elementText = engineContext.quantum.elementMap.length
    ? engineContext.quantum.elementMap.map((item) => `${item.label || item.element}:${item.verdict}`).join(" | ")
    : DEFAULT_TEXT;
  lines.push(`퀀텀 오행 판정: ${elementText}`);

  const daewunText = engineContext.quantum.daewun.length
    ? engineContext.quantum.daewun.slice(0, 8).map((row) => {
      const age = row.age ? `${row.age}세` : "나이 미상";
      const gz = `${row.gan}${row.zhi}`.trim() || "간지 미상";
      const score = row.score == null ? "점수 미상" : `${row.score}점`;
      const flags = [
        row.label,
        row.evalSummary,
        row.jongStrength,
        row.hasChungBonus ? "충 보너스" : "",
        row.hasChungPenalty ? "충 경계" : "",
        row.hasJiheBonus ? "육합 보정" : "",
        row.hasSamhapBonus ? "삼합 보정" : "",
      ].filter(Boolean).join("/");
      return `${age} ${gz} ${score}${flags ? ` ${flags}` : ""}`;
    }).join(" | ")
    : DEFAULT_TEXT;
  lines.push(`대운 퀀텀 흐름: ${daewunText}`);

  if (engineContext.featureDigests.length) {
    engineContext.featureDigests.slice(0, 6).forEach((item) => {
      lines.push(`${item.label || item.id}: ${item.text}`);
    });
  }

  return lines;
}

function formatHiddenStemRows(rows) {
  if (!rows.length) return DEFAULT_TEXT;
  return rows.map((row) => {
    const stem = `${row.hiddenStem}${row.hiddenStemKorean ? `(${row.hiddenStemKorean})` : ""}`;
    const layer = row.layer || "unknown";
    const tenGod = row.tenGodFromDayMaster || "십성 미상";
    const element = ELEMENT_KO_BY_KEY[row.element] || row.element || "오행 미상";
    return `${stem} ${layer}/${tenGod}/${element}${row.weight ? `/${row.weight}` : ""}`;
  }).join(" | ");
}

function formatExposureRows(rows, type) {
  const filtered = rows.filter((row) => (
    type === "natal" ? row.exposedInNatalHeavenlyStem : row.exposedByLuckStem
  ));
  if (!filtered.length) return DEFAULT_TEXT;
  return filtered.map((row) => {
    const positions = type === "natal" ? row.exposedNatalPositions : row.exposedLuckPositions;
    return `${row.hiddenStem} ${positions?.join(", ") || "위치 미상"} / ${row.interpretationLevel} / ${row.summaryForPrompt}`;
  }).join(" | ");
}

function pickQuestionRelevantHiddenStemRows(hiddenStems, questionType) {
  const focus = QUESTION_TEN_GOD_FOCUS[questionType] || [];
  const rows = focus.length
    ? hiddenStems.filter((row) => focus.includes(row.tenGodFromDayMaster))
    : hiddenStems.filter((row) => row.position === "month" || row.position === "day");
  return rows.length ? rows : hiddenStems.slice(0, 6);
}

function formatQuestionRelevantHiddenStems(hiddenStems, questionType) {
  const rows = pickQuestionRelevantHiddenStemRows(hiddenStems, questionType).slice(0, 8);
  if (!rows.length) return DEFAULT_TEXT;
  return rows.map((row) => {
    const position = PILLAR_POSITION_LABELS[row.position] || row.position;
    return `${position} ${row.branch}${row.hiddenStem}(${row.tenGodFromDayMaster || "십성 미상"})`;
  }).join(" | ");
}

function pickQuestionRelevantEarthStorageOpenings(openings, questionType) {
  const focus = QUESTION_TEN_GOD_FOCUS[questionType] || [];
  const rows = focus.length
    ? openings.filter((opening) => (opening.mainActivatedTenGods || []).some((tenGod) => focus.includes(tenGod)))
    : openings;
  return rows.length ? rows : openings;
}

function formatEarthStorageOpeningRows(openings, questionType) {
  if (!openings.length) return "개고 조건이 뚜렷하지 않음";
  return pickQuestionRelevantEarthStorageOpenings(openings, questionType).slice(0, 6).map((row) => {
    const hidden = (row.openedHiddenStems || [])
      .map((item) => `${item.stem}${item.tenGodFromDayMaster ? `(${item.tenGodFromDayMaster})` : ""}${item.favorable === true ? "/희신성" : item.favorable === false ? "/기신성" : ""}`)
      .join(", ");
    return `${row.sourcePosition} ${row.sourceBranch}(${row.storageType}) <- ${row.triggerPosition} ${row.triggerBranch} ${row.relationType}/${row.openingStrength}: ${hidden || DEFAULT_TEXT} / ${row.summaryForPrompt}`;
  }).join(" | ");
}

function buildSajuAdvancedFactorLines(advancedFactors, questionType) {
  const factors = advancedFactors && typeof advancedFactors === "object" ? advancedFactors : {};
  const hiddenStems = Array.isArray(factors.hiddenStems) ? factors.hiddenStems : [];
  const exposures = Array.isArray(factors.hiddenStemExposures) ? factors.hiddenStemExposures : [];
  const doChung = factors.doChung && typeof factors.doChung === "object" ? factors.doChung : { exists: false };
  const earthStorageOpenings = Array.isArray(factors.earthStorageOpenings) ? factors.earthStorageOpenings : [];
  const byPosition = (position) => hiddenStems.filter((row) => row.position === position);
  const allTenGods = hiddenStems.map((row) => `${row.branch}${row.hiddenStem}:${row.tenGodFromDayMaster || "십성 미상"}`);
  const doChungExists = doChung.exists === true;
  const earthStorageExists = earthStorageOpenings.length > 0;
  const doChungSummary = doChungExists
    ? (doChung.summaryForPrompt || `${doChung.repeatedBranch || "반복 지지"} 중첩으로 ${doChung.inducedOppositeBranch || "반대 충"}의 사건성이 유도됩니다.`)
    : "도충 조건이 뚜렷하지 않으므로 상담문에서 억지로 끌어올리지 않습니다.";

  return [
    "[사주 상담 계산 사용 규칙]",
    "사주 계산을 새로 세우지 말고 아래 canonical JSON과 계산 근거만 붙잡습니다.",
    "지장간·투간·투출·도충·개고·합충형파해는 질문 주제와 맞닿은 항목만 상담 문장 속에 녹입니다.",
    "JSON에 없는 신살, 격국, 용신, 도충, 개고는 새로 만들지 않습니다.",
    doChungExists ? "도충 exists=true이며 질문 주제와 맞닿으면 한 문단 이상 자연스럽게 반영합니다." : "도충 exists=false이면 도충을 핵심 사건으로 쓰지 않습니다.",
    earthStorageExists ? "토 지지 개고가 있으며 질문 주제와 맞닿으면 열린 지장간과 시기성을 한 문단 이상 자연스럽게 반영합니다." : "개고 조건이 없으면 辰戌丑未만 보고 개고를 만들지 않습니다.",
    "투간은 원국 천간, 투출은 운의 천간, 도충은 반복 지지의 반대 충 유도, 개고는 辰戌丑未가 형충해파로 열리는 구조로 구분합니다.",
    "",
    "[고급 명리 계산 근거]",
    "1. 지장간 분석",
    `- 년지 지장간: ${formatHiddenStemRows(byPosition("year"))}`,
    `- 월지 지장간: ${formatHiddenStemRows(byPosition("month"))}`,
    `- 일지 지장간: ${formatHiddenStemRows(byPosition("day"))}`,
    `- 시지 지장간: ${formatHiddenStemRows(byPosition("hour"))}`,
    `- 일간 기준 십성 변환: ${allTenGods.length ? allTenGods.join(" | ") : DEFAULT_TEXT}`,
    `- 질문 주제와 관련된 핵심 지장간: ${formatQuestionRelevantHiddenStems(hiddenStems, questionType)}`,
    "",
    "2. 지장간 투간 분석",
    `- 원국 천간에 투간된 지장간: ${formatExposureRows(exposures, "natal")}`,
    "- 투간된 지장간은 단순 잠재성이 아니라 실제 성향·재능·직업성·관계 양상으로 드러난 기운으로 봅니다.",
    "",
    "3. 지장간 투출 분석",
    `- 대운/세운/월운/일운에서 투출되는 지장간: ${formatExposureRows(exposures, "luck")}`,
    "- 투출된 지장간은 해당 시기에 잠재성이 현실 사건으로 떠오르는 흐름으로 봅니다.",
    "",
    "4. 도충 분석",
    `- 도충 존재 여부: ${doChungExists ? "있음" : "없음"}`,
    `- 반복 지지: ${doChung.repeatedBranch || DEFAULT_TEXT}`,
    `- 반복 수: ${doChung.repeatedCount || DEFAULT_TEXT}`,
    `- 유도되는 반대 충 지지: ${doChung.inducedOppositeBranch || DEFAULT_TEXT}`,
    `- 강도: ${doChung.strength || DEFAULT_TEXT}`,
    `- 질문 주제와 연결되는 사건성: ${(Array.isArray(doChung.affectedAreas) && doChung.affectedAreas.length) ? doChung.affectedAreas.join(", ") : DEFAULT_TEXT}`,
    `- 상담에 반드시 반영해야 할 요약: ${doChungSummary}`,
    "",
    "5. 토 지지 개고 분석",
    "[토 지지 개고 분석]",
    `- 개고 존재 여부: ${earthStorageExists ? "있음" : "없음"}`,
    `- 개고 상세: ${formatEarthStorageOpeningRows(earthStorageOpenings, questionType)}`,
    "- 충에 의한 개고는 가장 강하고, 형은 내부 압력, 파는 균열, 해는 은근한 손상과 문제 표면화로 봅니다.",
    "- 개고로 열린 지장간은 일간 기준 십성, 희신/기신 여부, 원국·대운·세운 시기성을 함께 봅니다.",
    "",
    "6. 합충형파해 연결",
    "- 지장간이 충·형·합·파·해 또는 도충과 닿으면 안에 머물던 기운이 특정 운에서 표면으로 떠오르는 흐름으로 봅니다.",
  ];
}

function buildSajuPromptBindingLines({ pillars, weights, johu, power, jong, engineContext, gyeokguk }) {
  const marker = engineContext.marker || SAJU_AI_PROMPT_ENGINE_CONTEXT_MARKER;
  const gyeokText = gyeokguk?.finalGyeokguk ? toText(gyeokguk.finalGyeokguk) : "미정";
  return [
    `명식 고정선: 이 질문문은 연주 ${pillars.yearPillar}, 월주 ${pillars.monthPillar}, 일주 ${pillars.dayPillar}, 시주 ${pillars.hourPillar}와 일간 ${pillars.dayStem}에 묶입니다.`,
    `재사용 경계: 다른 명식에는 그대로 옮기지 말고 일간·월지·조후·용신·기신·대운 퀀텀 흐름을 새로 맞춘 뒤 다시 세우세요.`,
    `핵심 결속값: 오행 목${weights.wood}/화${weights.fire}/토${weights.earth}/금${weights.metal}/수${weights.water}, 조후 ${toText(johu.type)}, 용신 ${toArrayText(power.yongshin)}, 기신 ${toArrayText(power.kijishin)}, 종격 ${jong.isJong ? toText(jong.name, "종격") : "일반격"}, 격국 ${gyeokText}.`,
    `엔진 표식: ${marker}`,
  ];
}

function buildKeywordWeightLines(template) {
  const keywordWeights = template && typeof template.keywordWeights === "object"
    ? template.keywordWeights
    : {};
  const ranked = Object.entries(keywordWeights)
    .sort((a, b) => Number(b?.[1]?.weight || 0) - Number(a?.[1]?.weight || 0))
    .slice(0, 5);

  if (!ranked.length) return [DEFAULT_TEXT];

  return ranked.map(([keyword, meta]) => {
    const pct = Math.round(Number(meta?.weight || 0) * 100);
    const depth = toText(meta?.depth, "기본");
    const markers = Array.isArray(meta?.markers) ? meta.markers.slice(0, 4).join(", ") : DEFAULT_TEXT;
    return `${keyword} ${pct}% (${depth}) [${markers}]`;
  });
}

function buildSajuCategoryRubricLines(rubric) {
  const data = rubric && typeof rubric === "object" ? rubric : getSajuAICategoryRubric("life_direction");
  return [
    "[카테고리별 상담 품질 기준]",
    `- 선택 카테고리: ${data.label || "인생"}`,
    `- 반드시 다룰 주제(한국어 참고 표기 — 출력 언어가 한국어가 아니면 소제목도 해당 언어로 번역): ${(data.requiredSections || []).join(" / ") || DEFAULT_TEXT}`,
    `- 우선 연결할 명식 축: ${(data.tenGodFocus || []).join(" / ") || DEFAULT_TEXT}`,
    "- 글자수를 채우기 위해 반복하지 말고, 위 주제가 명식 사실 카드와 어떻게 이어지는지 실제 상담처럼 풀어주세요.",
    "- 질문과 직접 관련이 깊은 주제는 자세히, 직접 관련이 약한 주제는 명식 이해에 필요한 만큼만 간결하게 다룹니다.",
  ];
}

function fillPatternVariables(pattern, context) {
  return String(pattern || "")
    .replace(/\{\{\s*dayStem\s*\}\}/g, String(context?.dayStem || "일간"))
    .replace(/\{\{\s*questionType\s*\}\}/g, String(context?.questionTypeLabel || "질문 주제"));
}

function buildSajuPromptQualityChecks(prompt) {
  const text = String(prompt || "");
  const basisCount = ["일간", "월지", "십성", "오행", "조후"].reduce((count, token) => (
    text.includes(token) ? count + 1 : count
  ), 0);
  return {
    hasUserQuestion: text.includes("[사용자 질문]"),
    hasAnswerFormat: text.includes("[답변 형식]"),
    hasSajuBasis: basisCount >= 2,
    hasNoCertaintyRule: text.includes("단정") || text.includes("확정"),
    hasPrivacyRule: text.includes("개인정보") || text.includes("이름, 생년월일, 출생시간"),
    hasExternalAiPurpose: text.includes("외부 AI") || text.includes("붙여넣"),
  };
}

function ensureSajuPromptQuality(prompt) {
  const checks = buildSajuPromptQualityChecks(prompt);
  const additions = [];
  if (!checks.hasUserQuestion) additions.push("- 사용자의 원질문을 먼저 밝힌 뒤 질문문을 구성해 주세요.");
  if (!checks.hasAnswerFormat) additions.push("- 원하는 답변 형식을 번호 목록으로 분리해 주세요.");
  if (!checks.hasSajuBasis) additions.push("- 일간·월지·십성·오행·조후 중 최소 2개 근거를 질문문에 포함해 주세요.");
  if (!checks.hasNoCertaintyRule) additions.push("- 결혼, 이별, 투자, 법률, 의료 같은 고위험 결론은 확정하지 말고 확인 질문으로 바꿔 주세요.");
  if (!checks.hasPrivacyRule) additions.push("- 이름, 생년월일, 출생시간 같은 개인정보 원문은 반복하지 말고 명식 정보만 간결하게 사용해 주세요.");
  if (!checks.hasExternalAiPurpose) additions.push("- 외부 AI에 그대로 붙여넣을 질문문이라는 목적을 마지막에 분명히 남겨 주세요.");

  if (!additions.length) return { prompt, checks };
  const enhancedPrompt = `${prompt}\n\n[최종 품질 점검]\n${additions.join("\n")}`;
  return {
    prompt: enhancedPrompt,
    checks: buildSajuPromptQualityChecks(enhancedPrompt),
  };
}

function appendSajuExternalAiPurpose(prompt, template, questionTypeLabel) {
  const domainLabel = template?.domainKo || "사주";
  const typeLabel = questionTypeLabel || "질문 주제";
  const lines = [
    "[사주 전용 AI 질문문 목적]",
    "- 외부 AI에게 그대로 붙여넣으면 최고 수준의 명리 상담 답변을 청할 수 있는 사주 전용 질문문입니다.",
    "- 답변자는 명리학자로서 일간·월령·조후·격국·용신·십성·합충형파해·대운/세운을 교차해 흐름을 읽어주세요.",
    "- 지장간은 월지와 일지를 우선 보고, 원국 투간과 운의 투출을 서로 다른 작동층으로 나누어 상담에 녹여주세요.",
    "- 도충은 exists=true인 계산값이 있을 때만 다루고, 없는 글자가 실제 원국에 생긴다고 단정하지 말아주세요.",
    "- 토 지지 개고는 earthStorageOpenings에 제공된 항목만 다루고, 辰戌沖·丑未沖·토 형살·파해의 강도를 구분해주세요.",
    "- 투간, 투출, 도충, 개고를 혼동하지 말고 각각 원국 천간, 운 천간, 반복 지지, 토 창고 형충해파로 나누어 비춰주세요.",
    `- 주제는 ${domainLabel}/${typeLabel}에 맞추고, 사주 근거와 현실 선택지를 함께 비춰주세요.`,
    "- 확정 예언보다 가능성, 리스크, 확인 질문, 다음 행동 순서가 먼저 드러나게 해주세요.",
  ];
  return `${String(prompt || "").trim()}\n\n${lines.join("\n")}`.trim();
}

export function buildSajuAIPromptWithDomain({
  question,
  sajuResult,
  profile: profileOverride,
  compatibilityTarget,
  mode,
  domain,
  calibration,
} = {}) {
  const normalizedQuestion = ensureValidQuestion(question);
  ensureSajuResultPresence(sajuResult);

  const questionType = classifySajuPromptQuestionType(normalizedQuestion);
  const questionTypeLabel = QUESTION_TYPE_LABELS[questionType] || QUESTION_TYPE_LABELS.general;
  const resolvedDomain = String(domain || "").trim() || classifyQuestionToSajuDomain(normalizedQuestion);
  const template = getSajuPromptTemplate(resolvedDomain);
  if (!template) {
    throw new Error(`UNKNOWN_SAJU_DOMAIN:${resolvedDomain}`);
  }
  const categoryRubric = getSajuAICategoryRubric(resolvedDomain);

  const analysisProfile =
    sajuResult && typeof sajuResult.analysisProfile === "object" && sajuResult.analysisProfile !== null
      ? sajuResult.analysisProfile
      : null;
  const normalizedProfile = normalizeBirthInfo(profileOverride || analysisProfile || sajuResult.profile, sajuResult.snapshot);
  const pillars = normalizePillars(sajuResult.pillars);
  const weights = normalizeElementWeights(sajuResult, sajuResult.snapshot);
  const johu = sajuResult.johu && typeof sajuResult.johu === "object" ? sajuResult.johu : {};
  const power = sajuResult.power && typeof sajuResult.power === "object" ? sajuResult.power : {};
  const jong = sajuResult.jong && typeof sajuResult.jong === "object" ? sajuResult.jong : {};
  const engineContext = normalizeSajuEngineContext(sajuResult);
  const advancedFactors = engineContext.advancedFactors;
  const calibrationResolved = resolveSajuCalibrationLuck(calibration, {
    daewunRows: engineContext.quantum.daewun,
    currentAge: engineContext.quantum.currentAge,
    currentYear: Number(sajuResult.targetYear || sajuResult.currentYear || sajuResult.engineContext?.currentYear || 0) || undefined,
  });
  const factBuild = buildSajuMyeongsikFactSnapshot({
    sajuResult,
    question: normalizedQuestion,
    domain: resolvedDomain,
    questionType,
    engineContext,
    advancedFactors,
    weights,
    johu,
    power,
    jong,
  });
  const factSnapshot = factBuild.factSnapshot;
  const factCard = factBuild.factCard;
  const canonicalSajuResult = {
    ...sajuResult,
    factSnapshot,
    advancedFactors,
    engineContext: {
      ...(sajuResult.engineContext && typeof sajuResult.engineContext === "object" ? sajuResult.engineContext : {}),
      advancedFactors,
      factSnapshot,
    },
  };
  const questionFocusAngles = buildSajuQuestionFocusAngles(questionType, resolvedDomain);
  const engineContextLines = buildSajuEngineContextLines(engineContext);
  const advancedFactorLines = buildSajuAdvancedFactorLines(advancedFactors, questionType);
  const bindingLines = buildSajuPromptBindingLines({ pillars, weights, johu, power, jong, engineContext, gyeokguk: advancedFactors?.gyeokguk });
  const analysisAngles = uniqueStringArray((template.analysisAngles || []).concat(
    SAJU_AI_PROMPT_MASTERY_ANGLES,
    buildSajuAnalysisAngles(questionType, normalizedQuestion),
    questionFocusAngles,
  ));

  const keywordWeightLines = buildKeywordWeightLines(template);
  const categoryRubricLines = buildSajuCategoryRubricLines(categoryRubric);

  const domainDataLines = [
    factCard,
    "",
    "[내부 명식 기준 고정 규칙]",
    "- 위 명식 사실 카드와 일간 기준 십성 확정표가 절대 기준입니다.",
    "- 십성, 오행, 천간/지지 관계를 직접 추측하거나 재계산하지 마세요.",
    "- 내부 십성표와 다른 십성으로 바꾸지 마세요.",
    "- 예: 신금(辛) 일간에게 임수(壬)는 식신이 아니라 상관입니다.",
    "- 격국·십이운성은 위 명식 사실 카드(10. 격국, 2. 사주 원국)에 확정값이 있습니다. 이와 다른 격국을 새로 만들지 말고, 격국의 활성화/파격 시기는 대운·세운 라인과 연결해 시기별 행동지침으로 풀어주세요.",
    "- fact card 밖의 출생 개인정보나 존재하지 않는 신살·관계를 새로 만들지 마세요.",
    "",
    `도메인: ${template.domainKo}`,
    `질문 유형: ${questionTypeLabel}`,
    ...categoryRubricLines,
    `이름/성별: ${normalizedProfile.name} / ${normalizedProfile.gender}`,
    `생년월일/시간: ${normalizedProfile.birthDate} ${normalizedProfile.birthTime}`,
    `사주 원국: 연주 ${pillars.yearPillar}, 월주 ${pillars.monthPillar}, 일주 ${pillars.dayPillar}, 시주 ${pillars.hourPillar}`,
    `일간/일간오행: ${pillars.dayStem} / ${pillars.dayStemElement}`,
    `오행 분포: 목 ${weights.wood}, 화 ${weights.fire}, 토 ${weights.earth}, 금 ${weights.metal}, 수 ${weights.water}`,
    `우세 오행: ${weights.dominant}`,
    `조후: ${toText(johu.type)} (점수 ${toText(johu.score)})`,
    `신강/신약: ${typeof power.isStrong === "boolean" ? (power.isStrong ? "신강" : "신약") : DEFAULT_TEXT}`,
    `용신/기신 후보: ${toArrayText(power.yongshin)} / ${toArrayText(power.kijishin)}`,
    `종격 여부: ${jong.isJong ? `예 (${toText(jong.name, "종격")})` : "아니오"}`,
    `격국: ${toText(advancedFactors?.gyeokguk?.finalGyeokguk)} (${toText(advancedFactors?.gyeokguk?.finalType)})`,
    `핵심 키워드 가중치: ${keywordWeightLines.join(" | ")}`,
    `질문별 명리 관문: ${questionFocusAngles.join(" | ") || DEFAULT_TEXT}`,
    ...engineContextLines,
    ...advancedFactorLines,
    ...bindingLines,
  ];

  const followUps = (Array.isArray(template.questionPatterns) ? template.questionPatterns : []).map((pattern) => fillPatternVariables(pattern, {
    dayStem: pillars.dayStem,
    questionTypeLabel,
  }));

  const promptPackage = buildFortuneQuestionPromptPackage({
    fortuneType: "saju",
    fortuneLabel: "사주",
    expertLabel: "최고 수준의 명리학자",
    userQuestion: normalizedQuestion,
    analysisResult: canonicalSajuResult,
    profile: normalizedProfile,
    compatibilityTarget,
    mode: mode || resolvedDomain,
    questionTypeLabel: `${template.domainKo}/${questionTypeLabel}`,
    analysisAngles,
    recommendedFollowUpQuestions: followUps.length ? followUps : buildSajuFollowUps(questionType),
    caution: "사주는 확률적 경향 해석이며 법률/의료/투자 결정을 대체하지 않습니다.",
    domainDataLines,
    minPromptLength: 2600,
  });

  const calibrationLines = buildSajuCalibrationPromptLines(calibrationResolved, {
    yongshin: power.yongshin,
    kijishin: power.kijishin,
  });
  const purposePrompt = [
    // 헤더 문자열은 SAJU_AI_PROMPT_VERSION(= promptVersion, 캐시 키 keyExtra)과 같은 세대를 가리켜야 한다.
    `[명식이 답하는 사주 AI 상담 ${SAJU_AI_PROMPT_VERSION.replace(/^saju-myeongsik-ai-/, "")}]`,
    "아래 제공된 명식 사실 카드와 일간 기준 십성 확정표가 절대 기준입니다.",
    "LLM은 십성/오행/천간/지지 관계를 직접 계산하지 말고, 제공된 내부 계산값만 근거로 상담문을 작성합니다.",
    "상담문은 질문에만 짧게 답하지 말고 명식 전체의 성향, 십성 구조, 오행 균형, 현재 고민과의 연결, 조심할 패턴, 살리는 전략, 30일 실천 가이드를 포함합니다.",
    "선택 카테고리의 상담 품질 기준을 빠짐없이 다뤄 완성된 유료 상담문처럼 마무리합니다.",
    ...categoryRubricLines,
    "",
    factCard,
    ...(calibrationLines.length ? ["", ...calibrationLines] : []),
    "",
    appendSajuExternalAiPurpose(promptPackage.generatedPrompt, template, questionTypeLabel),
    "",
    // 위 명식 사실 카드가 그대로 사용자 화면의 근거 패널로도 나간다. 본문이 그 표를 벗어나지 않게 못 박는다.
    ...buildEvidenceRuleLines(buildSajuAnalysisBasis(factSnapshot), { includeFactTable: false }),
  ].join("\n").trim();
  const qualityResult = ensureSajuPromptQuality(purposePrompt);
  const generatedPrompt = qualityResult.prompt;

  const digestSource = [
    SAJU_AI_PROMPT_VERSION,
    normalizedQuestion,
    resolvedDomain,
    questionType,
    JSON.stringify(factSnapshot),
    normalizedProfile.gender,
    normalizedProfile.birthDate,
    normalizedProfile.birthTime,
    pillars.yearPillar,
    pillars.monthPillar,
    pillars.dayPillar,
    pillars.hourPillar,
    pillars.dayStem,
    pillars.dayStemElement,
    String(weights.wood),
    String(weights.fire),
    String(weights.earth),
    String(weights.metal),
    String(weights.water),
    weights.dominant,
    toText(johu.type),
    toText(johu.score),
    typeof power.isStrong === "boolean" ? (power.isStrong ? "strong" : "weak") : "unknown",
    toArrayText(power.yongshin, ""),
    toArrayText(power.kijishin, ""),
    jong.isJong ? "jong" : "normal",
    toText(jong.name, ""),
    questionFocusAngles.join("|"),
    engineContextLines.join("|"),
    advancedFactorLines.join("|"),
    bindingLines.join("|"),
    JSON.stringify(categoryRubric),
    JSON.stringify(engineContext),
    buildSajuCalibrationDigest(calibrationResolved),
    promptPackage.summaryIntent,
    promptPackage.analysisAngles.join("|"),
    generatedPrompt,
  ].join("\n");

  return {
    prompt: generatedPrompt,
    generatedPrompt,
    title: promptPackage.title,
    summaryIntent: promptPackage.summaryIntent,
    analysisAngles: promptPackage.analysisAngles,
    recommendedFollowUpQuestions: promptPackage.recommendedFollowUpQuestions,
    caution: promptPackage.caution,
    questionType,
    domain: resolvedDomain,
    domainLabel: template.domainKo,
    categoryRubric,
    promptVersion: SAJU_AI_PROMPT_VERSION,
    factSnapshot,
    factCard,
    // 화면(근거 패널·대기 화면)이 쓰는 형태. 프롬프트가 인용하는 확정값과 같은 원본에서 나온다.
    analysisBasis: buildSajuAnalysisBasis(factSnapshot),
    tenGodSnapshot: {
      dayMaster: factSnapshot.dayMaster,
      heavenlyStemTenGods: factSnapshot.heavenlyStemTenGods,
      hiddenStemsByBranch: factSnapshot.hiddenStemsByBranch,
      tenGodDistribution: factSnapshot.tenGodDistribution,
      fixedTenGodTable: factSnapshot.fixedTenGodTable,
    },
    keywordWeights: template.keywordWeights,
    questionFocusGuide: questionFocusAngles,
    advancedFactors,
    engineContextSummary: {
      marker: engineContext.marker || SAJU_AI_PROMPT_ENGINE_CONTEXT_MARKER,
      sourceLayers: engineContext.sourceLayers,
      quantumElementCount: engineContext.quantum.elementMap.length,
      daewunCount: engineContext.quantum.daewun.length,
      featureDigestCount: engineContext.featureDigests.length,
      hiddenStemCount: advancedFactors.hiddenStems.length,
      hiddenStemExposureCount: advancedFactors.hiddenStemExposures.length,
      touganCount: advancedFactors.hiddenStemExposures.filter((row) => row.exposedInNatalHeavenlyStem).length,
      tuchulCount: advancedFactors.hiddenStemExposures.filter((row) => row.exposedByLuckStem).length,
      doChung: advancedFactors.doChung,
      earthStorageOpeningCount: advancedFactors.earthStorageOpenings.length,
      earthStorageOpenings: advancedFactors.earthStorageOpenings.slice(0, 6),
      promptConfig: advancedFactors.promptConfig,
    },
    qualityChecks: qualityResult.checks,
    calibrationApplied: calibrationResolved ? calibrationResolved.periods.length : 0,
    digestSource,
  };
}

export function buildSajuAIPrompt({ question, sajuResult, profile: profileOverride, compatibilityTarget, mode, calibration } = {}) {
  return buildSajuAIPromptWithDomain({
    question,
    sajuResult,
    profile: profileOverride,
    compatibilityTarget,
    mode,
    calibration,
  });
}
