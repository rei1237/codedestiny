import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import {
  BRANCH_BREAKS,
  BRANCH_CLASHES,
  BRANCH_COMBOS,
  BRANCH_ELEMENT,
  BRANCH_HARMS,
  BRANCHES,
  CONTROLS,
  COVER_IMAGE,
  ELEMENT_KO,
  FEATURE_ALIASES,
  FEATURE_KEY,
  FORBIDDEN_TEXT_RE,
  GENERATES,
  MIN_CATEGORY_TEXT_LENGTH,
  MIN_CHAPTER_CHARS,
  MIN_SECTION_CHARS,
  MIN_TOTAL_CHARS,
  MONTH_BRANCHES,
  NEW_YEAR_CHAPTERS,
  NEW_YEAR_PDF_LOCK_TTL_MS,
  SERVICE_KEY,
  STEM_ELEMENT,
  STEM_YINYANG,
  STEMS,
} from "../lib/saju-new-year-constants.js";
import {
  generateSajuNewYearPremiumReport,
} from "../lib/pdf-v2/saju-new-year/generate-saju-new-year-premium-report.js";
import { generatePdfChapterContent } from "../lib/pdf-v2/pdf-llm-gateway.js";
import {
  NEW_YEAR_LLM_VERSION,
  normalizeChapterPlan,
  toLegacyChapterSpec,
} from "../lib/pdf-v2/saju-new-year/new-year-chapters.js";
import {
  validateFinalNewYearPdfPayload,
} from "../lib/pdf-v2/saju-new-year/new-year-validator.js";
import {
  SAJU_NEW_YEAR_LLM_ENGINE_VERSION,
  SAJU_NEW_YEAR_LLM_GENERATION_MODE,
  SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
  SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
  SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
  SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
} from "../lib/pdf-v2/saju-new-year/saju-new-year-premium.types.js";

const newYearPdfLocks = new Map();
export { NEW_YEAR_CHAPTERS };

export const YEARLY_SAJU_PDF_CONFIG = Object.freeze({
  generationMode: SAJU_NEW_YEAR_LLM_GENERATION_MODE,
  provider: "saju-new-year-llm",
  templateVersion: NEW_YEAR_LLM_VERSION,
});

const ANNUAL_FORTUNE_PRODUCT_ID = "saju_annual_fortune";
const ANNUAL_FORTUNE_ASSEMBLY_VERSION = YEARLY_SAJU_PDF_CONFIG.templateVersion;
const ANNUAL_FORTUNE_ENGINE_VERSION = NEW_YEAR_LLM_VERSION;
const ANNUAL_FORTUNE_CHAPTER_ID_BY_NO = Object.freeze({
  1: "annual_overview",
  2: "career_business",
  3: "wealth_money",
  4: "relationship_family",
  5: "relationship_love_family",
  6: "health_lifestyle",
  7: "quarterly_decision",
  8: "caution_periods",
  9: "monthly_map",
  10: "annual_master_plan",
});
const ANNUAL_FORTUNE_RISK_REPLACEMENTS = Object.freeze([
  [/반드시\s*망한다/gi, "무리한 확장은 부담으로 돌아올 수 있으니 속도 조절이 필요합니다"],
  [/큰\s*사고가\s*난다/gi, "이동, 일정, 컨디션 관리에서 평소보다 신중함이 필요합니다"],
  [/병에\s*걸린다/gi, "생활 리듬과 체력 관리에 신경 써야 하는 시기입니다"],
  [/돈을\s*(?:크게\s*)?잃는다/gi, "충동적인 지출이나 검증되지 않은 투자는 보수적으로 접근하는 편이 좋습니다"],
  [/해고된다/gi, "직장 내 역할 변화나 책임 조정이 생길 수 있으므로 관계와 성과 관리가 중요합니다"],
  [/사업이\s*실패한다/gi, "사업 운영에서는 속도보다 검증과 현금 흐름 관리가 중요합니다"],
  [/이별한다/gi, "관계의 속도와 기대치 차이를 조율해야 하는 시기입니다"],
  [/소송에\s*휘말린다/gi, "계약과 약속은 문서와 절차를 더 세심하게 확인하는 편이 좋습니다"],
  [/가족\s*문제가\s*터진다/gi, "가족과 가까운 관계에서는 미뤄 둔 대화를 차분히 정리할 필요가 있습니다"],
  [/올해는\s*최악이다/gi, "압박감이 커질 수 있지만 방향을 정리하면 기준을 세우기 좋은 해입니다"],
  [/아무것도\s*하지\s*마라/gi, "큰 결정보다 점검과 정리에 집중하는 편이 좋습니다"],
  [/무조건\s*투자하지\s*마라/gi, "투자는 검증된 범위 안에서 보수적으로 판단하는 편이 좋습니다"],
  [/무조건\s*결혼하지\s*마라/gi, "관계의 약속은 속도와 책임을 충분히 맞춘 뒤 결정하는 편이 좋습니다"],
  [/반드시\s*성공한다/gi, "성과로 이어질 가능성을 키울 수 있습니다"],
  [/무조건\s*성공한다/gi, "좋은 흐름을 현실 성과로 옮길 여지가 있습니다"],
  [/100\s*%\s*돈\s*번다/gi, "수입 구조를 점검하고 키울 여지가 있습니다"],
  [/무조건\s*이별한다/gi, "관계의 거리와 기대치를 조율해야 할 수 있습니다"],
  [/사고가\s*난다/gi, "이동, 일정, 컨디션 관리에서 평소보다 신중함이 필요합니다"],
  [/송사/gi, "문서와 절차를 조심해야 하는 일"],
  [/관재/gi, "약속과 기록을 조심해야 하는 일"],
  [/의료\s*진단/gi, "생활 리듬 점검"],
  [/진단처럼/gi, "생활 리듬을 살피는 방식으로"],
  [/투자\s*조언/gi, "지출과 수입 구조 점검"],
  [/투자/gi, "큰돈을 쓰는 결정"],
]);
const NEW_YEAR_LOCAL_FORBIDDEN_RE = /\b(?:json|payload|debug|schema|engine|prompt|api|undefined|null|nan|object|todo|fixme|placeholder)\b|\[object Object\]/gi;
const NEW_YEAR_MANUSCRIPT_SOURCE = Object.freeze({
  LLM_ONLY: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
});

const LOCAL_STEMS = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const LOCAL_BRANCHES = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const LOCAL_MONTH_BRANCHES = Object.freeze(["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"]);
const LOCAL_STEM_ELEMENT = Object.freeze({ 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" });
const LOCAL_BRANCH_ELEMENT = Object.freeze({ 子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire", 午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water" });
const LOCAL_ELEMENT_KO = Object.freeze({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수" });
const LOCAL_GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const LOCAL_CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const LOCAL_BRANCH_COMBOS = Object.freeze({ 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" });
const LOCAL_BRANCH_CLASHES = Object.freeze({ 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" });
const LOCAL_BRANCH_HARMS = Object.freeze({ 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" });
const LOCAL_BRANCH_BREAKS = Object.freeze({ 子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅", 卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未" });
const NEW_YEAR_STEM_SOUND = Object.freeze({ 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" });
const NEW_YEAR_BRANCH_SOUND = Object.freeze({ 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" });
const NEW_YEAR_STEM_KO = Object.freeze({ 甲: "갑목", 乙: "을목", 丙: "병화", 丁: "정화", 戊: "무토", 己: "기토", 庚: "경금", 辛: "신금", 壬: "임수", 癸: "계수" });
const NEW_YEAR_BRANCH_KO = Object.freeze({ 子: "자수", 丑: "축토", 寅: "인목", 卯: "묘목", 辰: "진토", 巳: "사화", 午: "오화", 未: "미토", 申: "신금", 酉: "유금", 戌: "술토", 亥: "해수" });

const YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE = Object.freeze([
  "핵심 요약 카드",
  "상담형 본문",
  "계산 근거 기반 해석",
  "주의할 점",
  "실천 조언",
  "체크리스트",
  "챕터 마무리 문장",
]);

const LOCAL_NEW_YEAR_CHAPTERS = Object.freeze([
  { no: 1, title: "프롤로그 — 올해 내 운의 전체 분위기", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 2, title: "올해의 핵심 키워드 — 세운이 나에게 주는 메시지", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 3, title: "대운과 세운의 만남 — 큰 흐름 속 올해의 위치", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 4, title: "일과 커리어 — 성취, 역할, 방향 전환의 운", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 5, title: "재물과 소비 — 돈이 들어오고 나가는 구조", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 6, title: "연애와 인간관계 — 가까워질 사람과 멀어질 사람", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 7, title: "건강과 생활 리듬 — 무리하기 쉬운 지점과 회복법", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 8, title: "위험 신호와 기회 신호 — 조심할 시기와 잡아야 할 시기", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 9, title: "12개월 월별 운세 — 매달의 흐름과 실천 조언", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
  { no: 10, title: "올해의 마스터플랜 — 1년을 잘 쓰는 실행 전략", categories: YEARLY_SAJU_CHAPTER_SECTION_STRUCTURE },
]);

const ASSEMBLED_NEW_YEAR_SECTION_TITLES = Object.freeze([
  "핵심 요약 카드",
  "상담형 본문",
  "사주 근거 해석",
  "주의할 점",
  "실천 조언",
  "체크리스트",
  "마무리 문장",
]);

const ASSEMBLED_NEW_YEAR_CHAPTERS = Object.freeze([
  Object.freeze({ no: 1, title: "{YEAR}년 총운과 세운의 문", focus: "올해 전체 분위기와 선택 기준" }),
  Object.freeze({ no: 2, title: "{YEAR}년 일과 커리어의 방향", focus: "직업, 역할, 성과가 움직이는 방식" }),
  Object.freeze({ no: 3, title: "{YEAR}년 재물과 소비의 흐름", focus: "수입, 지출, 투자 판단의 균형" }),
  Object.freeze({ no: 4, title: "{YEAR}년 인간관계와 귀인운", focus: "도움이 되는 인연과 거리 조절" }),
  Object.freeze({ no: 5, title: "{YEAR}년 연애와 가정운", focus: "가까운 관계에서 필요한 온도와 책임" }),
  Object.freeze({ no: 6, title: "{YEAR}년 건강과 생활 리듬", focus: "몸과 마음의 에너지를 지키는 법" }),
  Object.freeze({ no: 7, title: "{YEAR}년 분기별 의사결정", focus: "분기마다 열리는 기회와 보류 기준" }),
  Object.freeze({ no: 8, title: "{YEAR}년 위험 신호와 반전 전략", focus: "흔들리는 시기를 기회로 바꾸는 방법" }),
  Object.freeze({ no: 9, title: "{YEAR}년 12개월 월별 운세", focus: "매달의 실행·관망·정비 전략" }),
  Object.freeze({ no: 10, title: "{YEAR}년 최종 신년 로드맵", focus: "한 해를 관통하는 실천 계획" }),
]);

const NEW_YEAR_CATEGORY_DOMAIN_DEFAULTS = Object.freeze({
  annual: Object.freeze({
    toneKey: "yearlyTheme",
    subject: "올해 전체 운의 방향",
    reality: "세운이 원국의 강점과 약점을 동시에 드러내며, 첫 선택 기준이 한 해의 온도를 결정합니다.",
  }),
  career: Object.freeze({
    toneKey: "career",
    subject: "일의 방향과 사회적 역할",
    reality: "업무, 평가, 책임, 성과가 같은 흐름 안에서 움직이므로 역할의 크기와 실행 순서를 함께 봐야 합니다.",
  }),
  money: Object.freeze({
    toneKey: "money",
    subject: "돈의 흐름과 손익 구조",
    reality: "수입의 통로, 지출의 압력, 계약 조건이 한 덩어리로 움직이므로 숫자와 약속을 함께 관리해야 합니다.",
  }),
  relationship: Object.freeze({
    toneKey: "relationship",
    subject: "사람과 마음의 연결 방식",
    reality: "가까워지는 인연과 거리를 둘 인연이 선명해지며, 감정보다 약속과 역할의 균형이 중요해집니다.",
  }),
  love: Object.freeze({
    toneKey: "relationship",
    subject: "사랑과 가까운 관계의 온도",
    reality: "감정의 크기보다 관계가 감당할 책임과 생활 리듬이 중요하게 드러납니다.",
  }),
  health: Object.freeze({
    toneKey: "health",
    subject: "몸과 마음의 회복 리듬",
    reality: "과한 오행과 약한 오행이 생활 습관 안에서 신호를 보내므로 피로, 수면, 감정의 순서를 함께 봐야 합니다.",
  }),
  quarter: Object.freeze({
    toneKey: "advice",
    subject: "분기별 선택과 실행 순서",
    reality: "시기마다 열어야 할 문과 닫아야 할 문이 다르므로 확장, 검증, 회수, 정리를 구분해야 합니다.",
  }),
  risk: Object.freeze({
    toneKey: "caution",
    subject: "위험 신호와 반전의 조건",
    reality: "작은 균열이 사람, 돈, 일정, 감정 중 한 곳에서 먼저 드러나므로 초기에 구조를 조정해야 합니다.",
  }),
  monthly: Object.freeze({
    toneKey: "advice",
    subject: "월별 흐름과 실행 강약",
    reality: "월운의 강약에 따라 실행할 달, 관망할 달, 정비할 달을 나누어야 합니다.",
  }),
  roadmap: Object.freeze({
    toneKey: "advice",
    subject: "한 해를 관통하는 최종 운영 기준",
    reality: "올해의 기운을 생활 루틴으로 내릴 때 운의 강약이 실제 성과와 회복으로 바뀝니다.",
  }),
});

function defineNewYearCategoryRule({ domain = "annual", subject, reality, evidence = [], actionGuide = [], checklist = [], caution = [], opportunity = [], requiredTokens = [], monthMode = "optional" } = {}) {
  const defaults = NEW_YEAR_CATEGORY_DOMAIN_DEFAULTS[domain] || NEW_YEAR_CATEGORY_DOMAIN_DEFAULTS.annual;
  const toList = (value) => (Array.isArray(value) ? value : [value]).map(clean).filter(Boolean);
  return Object.freeze({
    domain,
    toneKey: defaults.toneKey,
    subject: clean(subject || defaults.subject),
    reality: clean(reality || defaults.reality),
    evidence: Object.freeze(toList(evidence)),
    actionGuide: Object.freeze(toList(actionGuide)),
    checklist: Object.freeze(toList(checklist)),
    caution: Object.freeze(toList(caution)),
    opportunity: Object.freeze(toList(opportunity)),
    requiredTokens: Object.freeze(toList(requiredTokens)),
    monthMode,
  });
}

const NEW_YEAR_CATEGORY_QUALITY_RULES = Object.freeze({
  "세운 간지와 올해의 첫 신호": defineNewYearCategoryRule({ domain: "annual", subject: "세운 간지가 처음 여는 올해의 문", evidence: ["세운 간지", "일간", "십성", "오행"], opportunity: ["첫 신호를 기록해 한 해의 방향으로 삼기"], actionGuide: ["초반에 반복되는 사건과 감정을 기록하기", "올해의 첫 판단 기준을 한 문장으로 정하기"], checklist: ["세운 간지의 기운을 확인했는가", "첫 선택 기준을 기록했는가"], caution: ["초반 분위기만으로 한 해 전체를 단정하지 않기"], requiredTokens: ["세운", "간지", "일간", "십성"] }),
  "원국과 세운의 조화·충돌": defineNewYearCategoryRule({ domain: "annual", subject: "원국과 세운이 만나는 접점", evidence: ["원국", "세운", "합", "충", "해", "파"], opportunity: ["조화가 생기는 관계와 일정을 먼저 살리기"], actionGuide: ["충돌이 보이는 지점은 속도를 늦추기", "합이 생기는 지점은 협력과 연결로 쓰기"], checklist: ["합충형파해 신호를 구분했는가", "갈등 전 조율 순서를 세웠는가"], caution: ["합은 과한 기대가 되고 충은 급한 결론이 될 수 있음"], requiredTokens: ["원국", "세운", "합", "충"] }),
  "오행 강약과 용신·희신 방향": defineNewYearCategoryRule({ domain: "annual", subject: "오행 균형과 보완 방향", evidence: ["오행 강약", "용신", "희신", "기신"], opportunity: ["용신·희신 방향의 습관과 환경을 늘리기"], actionGuide: ["부족한 오행은 생활 루틴으로 보완하기", "과한 오행은 결정 속도와 감정 온도를 낮추기"], checklist: ["유리한 오행을 실행 환경에 반영했는가", "과열 오행을 줄이는 기준이 있는가"], caution: ["기신이 강한 달에는 욕심보다 균형을 우선하기"], requiredTokens: ["오행", "용신", "희신", "기신"] }),
  "가장 크게 바뀌는 삶의 영역": defineNewYearCategoryRule({ domain: "annual", subject: "올해 변화가 집중되는 삶의 영역", evidence: ["세운 십성", "월운 강약", "원국의 취약 영역"], opportunity: ["변화가 오는 영역에 먼저 준비를 배치하기"], actionGuide: ["일·돈·관계·건강 중 변화가 큰 영역을 분리하기", "새 역할이 오는 곳에 시간을 먼저 배정하기"], checklist: ["가장 흔들릴 영역을 한 가지로 좁혔는가", "준비와 보류 기준을 나누었는가"], caution: ["모든 영역을 동시에 바꾸려 하지 않기"], requiredTokens: ["세운", "십성", "월운", "영역"] }),
  "올해를 지키는 핵심 기준": defineNewYearCategoryRule({ domain: "annual", subject: "한 해를 지키는 중심 원칙", evidence: ["일간", "세운", "용신", "월운 하락 구간"], opportunity: ["좋은 달과 약한 달 모두에 통하는 기준 세우기"], actionGuide: ["중요 결정 전 확인 문장을 만들기", "좋은 흐름에서도 기록과 검토를 유지하기"], checklist: ["올해의 금지 기준이 있는가", "결정 전 확인 순서가 있는가"], caution: ["운이 좋아 보이는 순간에도 검증을 생략하지 않기"], requiredTokens: ["기준", "세운", "월운", "용신"] }),
  "올해 일의 기본 흐름": defineNewYearCategoryRule({ domain: "career", evidence: ["세운 십성", "관성", "식상", "재성"], opportunity: ["일의 방향을 한 가지 성과 기준으로 좁히기"], actionGuide: ["올해 맡을 역할과 버릴 역할을 나누기", "성과가 보이는 일을 일정표에 먼저 올리기"], checklist: ["업무 우선순위를 정했는가", "성과 기준을 숫자나 결과물로 정했는가"], caution: ["역할이 늘어날 때 책임의 경계를 흐리지 않기"], requiredTokens: ["일", "세운", "십성", "성과"] }),
  "직장·조직·평가운": defineNewYearCategoryRule({ domain: "career", evidence: ["관성", "조직운", "평가 기준", "세운 관계"], opportunity: ["신뢰와 평가가 쌓이는 자리 선점하기"], actionGuide: ["상사·동료와 기대치를 문장으로 맞추기", "평가에 남는 결과물을 정리하기"], checklist: ["조직 안 역할을 명확히 했는가", "평가받을 증거를 남겼는가"], caution: ["인정 욕구 때문에 감당 못 할 책임을 떠안지 않기"], requiredTokens: ["직장", "조직", "평가", "관성"] }),
  "이직·전환·확장 가능성": defineNewYearCategoryRule({ domain: "career", evidence: ["충", "합", "대운", "월운 Go/Stop"], opportunity: ["전환 신호가 강한 달에 제안과 면접을 배치하기"], actionGuide: ["이직은 감정이 아니라 조건표로 판단하기", "확장은 작은 검증 뒤에 단계적으로 키우기"], checklist: ["전환 조건표가 있는가", "보류해야 할 달을 확인했는가"], caution: ["답답함만으로 이동을 결정하지 않기"], requiredTokens: ["이직", "전환", "확장", "월운"], monthMode: "required" }),
  "성과가 열리는 방식": defineNewYearCategoryRule({ domain: "career", evidence: ["식상", "재성", "관성", "월운 상위 달"], opportunity: ["결과물이 드러나는 방식으로 일을 설계하기"], actionGuide: ["발표·제안·출시·협상을 성과 달에 배치하기", "성과를 기록해 다음 기회로 연결하기"], checklist: ["성과가 보이는 형태를 정했는가", "발표할 달을 정했는가"], caution: ["준비만 하다가 드러내는 시기를 놓치지 않기"], requiredTokens: ["성과", "식상", "재성", "월운"], monthMode: "required" }),
  "피해야 할 업무 패턴": defineNewYearCategoryRule({ domain: "career", evidence: ["기신", "충돌 신호", "업무 과부하"], opportunity: ["버릴 일과 줄일 일을 정해 집중력 회복하기"], actionGuide: ["반복되는 소모 업무를 목록화하기", "거절할 기준과 위임할 기준을 세우기"], checklist: ["피해야 할 업무 습관을 기록했는가", "위임과 거절 기준이 있는가"], caution: ["급한 일만 따라가다 중요한 성과를 놓치지 않기"], requiredTokens: ["업무", "패턴", "기신", "정비"] }),
  "돈이 들어오는 방식": defineNewYearCategoryRule({ domain: "money", evidence: ["재성", "식상", "세운 십성", "수입 통로"], opportunity: ["수익이 생기는 통로를 한 가지 이상 명확히 하기"], actionGuide: ["수입이 들어오는 경로를 고정·변동으로 나누기", "돈이 되는 제안은 좋은 달에 실행하기"], checklist: ["수입 통로를 구분했는가", "돈이 열리는 달을 확인했는가"], caution: ["들어올 돈만 믿고 먼저 지출하지 않기"], requiredTokens: ["돈", "재성", "수입", "세운"] }),
  "고정수익과 확장수익": defineNewYearCategoryRule({ domain: "money", evidence: ["정재", "편재", "월운 강약", "계약 안정성"], opportunity: ["고정 기반 위에 확장 수익을 올리기"], actionGuide: ["고정수익은 지키고 확장수익은 작은 실험으로 검증하기", "확장 전 현금 흐름을 점검하기"], checklist: ["고정수익과 확장수익을 나누었는가", "확장 비용 상한선을 정했는가"], caution: ["확장수익을 고정수익처럼 착각하지 않기"], requiredTokens: ["고정수익", "확장수익", "정재", "편재"] }),
  "큰 지출과 손실 주의": defineNewYearCategoryRule({ domain: "money", evidence: ["기신", "월운 하락", "충·파", "지출 압력"], opportunity: ["지출을 줄여 운의 누수를 막기"], actionGuide: ["큰 지출은 하루 이상 간격을 두고 검토하기", "손실 가능성은 문서와 숫자로 먼저 확인하기"], checklist: ["큰 지출 보류 기준이 있는가", "손실을 막는 상한선이 있는가"], caution: ["불안한 마음으로 큰돈을 쓰지 않기"], requiredTokens: ["지출", "손실", "월운", "기신"], monthMode: "required" }),
  "계약·투자·가격 결정": defineNewYearCategoryRule({ domain: "money", evidence: ["재성", "관성", "문서운", "월운 Go/Stop"], opportunity: ["좋은 달에 계약 조건을 정교하게 다듬기"], actionGuide: ["계약은 조건·기간·책임을 문서로 확인하기", "가격 결정은 감정이 아니라 비용과 가치로 정하기"], checklist: ["계약 조건을 문서로 확인했는가", "가격 기준을 계산했는가"], caution: ["검증 없는 큰돈 결정은 보류하기"], requiredTokens: ["계약", "가격", "재성", "문서"], monthMode: "required" }),
  "재물운을 살리는 습관": defineNewYearCategoryRule({ domain: "money", evidence: ["재성 흐름", "용신", "지출 패턴", "월별 점검"], opportunity: ["돈이 모이는 생활 리듬 만들기"], actionGuide: ["월초 예산과 월말 회고를 고정하기", "수익이 생기면 먼저 정리하고 나중에 확장하기"], checklist: ["월별 돈 기록을 남겼는가", "지출 패턴을 점검했는가"], caution: ["좋은 수입이 생길수록 새는 돈을 방치하지 않기"], requiredTokens: ["재물운", "습관", "재성", "기록"] }),
  "올해 가까워지는 사람": defineNewYearCategoryRule({ domain: "relationship", evidence: ["합", "귀인", "일지", "월운 상위 달"], opportunity: ["가까워지는 인연을 역할과 신뢰로 확인하기"], actionGuide: ["반복적으로 도움을 주고받는 사람을 기록하기", "좋은 달에는 만남과 대화를 앞에 두기"], checklist: ["가까워지는 사람의 역할을 보았는가", "관계의 신뢰 행동을 확인했는가"], caution: ["호감만으로 책임 있는 약속을 서두르지 않기"], requiredTokens: ["사람", "합", "귀인", "관계"], monthMode: "required" }),
  "귀인이 들어오는 통로": defineNewYearCategoryRule({ domain: "relationship", evidence: ["귀인", "합", "인성", "관성"], opportunity: ["도움이 들어오는 경로를 넓히기"], actionGuide: ["소개·협업·배움의 자리를 열어두기", "도움을 받을 때 역할과 보답을 분명히 하기"], checklist: ["귀인 통로를 세 가지로 나누었는가", "도움받을 조건을 준비했는가"], caution: ["귀인을 기대하며 내 준비를 미루지 않기"], requiredTokens: ["귀인", "통로", "합", "인성"] }),
  "협업과 파트너십": defineNewYearCategoryRule({ domain: "relationship", evidence: ["합", "관성", "재성", "역할 분담"], opportunity: ["함께할 사람과 책임 범위를 정하기"], actionGuide: ["협업 전 역할·돈·일정을 문서로 맞추기", "파트너십은 작은 성과로 먼저 검증하기"], checklist: ["역할 분담이 선명한가", "수익과 책임 기준이 있는가"], caution: ["좋은 관계라는 이유로 조건 확인을 생략하지 않기"], requiredTokens: ["협업", "파트너십", "역할", "합"] }),
  "멀어질 관계와 갈등 신호": defineNewYearCategoryRule({ domain: "relationship", evidence: ["충", "해", "파", "갈등 반복"], opportunity: ["관계 정리를 통해 에너지를 회복하기"], actionGuide: ["반복되는 오해는 초기에 말로 확인하기", "소모적인 관계는 거리와 빈도를 조절하기"], checklist: ["갈등 신호를 기록했는가", "거리 조절 기준이 있는가"], caution: ["감정이 올라온 순간에 관계 결론을 내리지 않기"], requiredTokens: ["갈등", "충", "해", "거리"] }),
  "관계를 넓히는 전략": defineNewYearCategoryRule({ domain: "relationship", evidence: ["합", "귀인", "식상", "월운 Go"], opportunity: ["말과 제안으로 관계의 폭을 넓히기"], actionGuide: ["좋은 달에 모임·소개·협업 제안을 배치하기", "관계 확장은 목적과 경계를 함께 세우기"], checklist: ["관계를 넓힐 달을 정했는가", "관계 경계를 세웠는가"], caution: ["넓어지는 관계 속에서 핵심 인연을 놓치지 않기"], requiredTokens: ["관계", "전략", "귀인", "월운"], monthMode: "required" }),
  "연애운의 전체 흐름": defineNewYearCategoryRule({ domain: "love", evidence: ["일지", "합", "충", "감정 리듬"], opportunity: ["감정의 방향과 관계의 현실성을 함께 보기"], actionGuide: ["끌림과 안정감을 따로 기록하기", "관계 속도는 월운에 맞춰 조절하기"], checklist: ["감정과 현실 조건을 나누어 보았는가", "관계 속도 기준이 있는가"], caution: ["외로움으로 관계를 서두르지 않기"], requiredTokens: ["연애운", "일지", "감정", "관계"] }),
  "새로운 인연과 기존 관계": defineNewYearCategoryRule({ domain: "love", evidence: ["합", "귀인", "일지 충", "월운"], opportunity: ["새 인연은 열고 기존 관계는 약속을 다듬기"], actionGuide: ["새 만남과 기존 관계의 기준을 따로 세우기", "반복되는 문제는 말보다 행동으로 확인하기"], checklist: ["새 인연의 신뢰 기준이 있는가", "기존 관계의 약속을 점검했는가"], caution: ["새로움에 끌려 오래된 책임을 가볍게 보지 않기"], requiredTokens: ["인연", "기존 관계", "합", "월운"], monthMode: "required" }),
  "결혼·약속·장기 관계": defineNewYearCategoryRule({ domain: "love", evidence: ["관성", "재성", "일지", "문서와 약속"], opportunity: ["관계를 생활의 약속으로 안정시키기"], actionGuide: ["결혼과 장기 약속은 돈·가족·생활 리듬까지 함께 보기", "좋은 달에는 구체적 대화를 진행하기"], checklist: ["장기 관계의 책임을 확인했는가", "생활 조건을 말로 맞추었는가"], caution: ["감정만으로 장기 약속을 확정하지 않기"], requiredTokens: ["결혼", "약속", "장기 관계", "관성"] }),
  "가족과 가까운 사람의 책임": defineNewYearCategoryRule({ domain: "love", evidence: ["인성", "관성", "가족 책임", "월운 하락"], opportunity: ["가까운 사람과 책임의 균형을 다시 세우기"], actionGuide: ["가족 문제는 혼자 떠안지 말고 역할을 나누기", "돌봄과 경계의 기준을 동시에 세우기"], checklist: ["가족 안 역할을 분리했는가", "책임의 한계를 말했는가"], caution: ["가까운 사이라는 이유로 피로를 방치하지 않기"], requiredTokens: ["가족", "책임", "인성", "역할"] }),
  "감정 기복과 거리 조절": defineNewYearCategoryRule({ domain: "love", evidence: ["충", "해", "심리 리듬", "월운 하락"], opportunity: ["감정의 파도를 관계의 기준으로 다듬기"], actionGuide: ["감정이 큰 날에는 결론보다 기록을 먼저 하기", "거리 조절은 침묵이 아니라 약속으로 표현하기"], checklist: ["감정이 흔들리는 달을 확인했는가", "거리 조절 문장을 준비했는가"], caution: ["서운함을 시험하듯 표현하지 않기"], requiredTokens: ["감정", "거리", "충", "월운"], monthMode: "required" }),
  "오행으로 보는 몸의 신호": defineNewYearCategoryRule({ domain: "health", evidence: ["오행", "과한 기운", "부족한 기운", "일간"], opportunity: ["몸이 보내는 신호를 운의 균형으로 읽기"], actionGuide: ["약한 오행은 생활 습관으로 보완하기", "과한 오행은 열·긴장·과로를 낮추기"], checklist: ["몸의 신호를 오행별로 구분했는가", "보완 루틴을 정했는가"], caution: ["버티는 힘을 건강운으로 착각하지 않기"], requiredTokens: ["오행", "몸", "일간", "기운"] }),
  "피로와 스트레스 누적 구간": defineNewYearCategoryRule({ domain: "health", evidence: ["월운 하락", "기신", "과로 신호", "심리 압박"], opportunity: ["피로가 쌓이기 전 회복 구간을 예약하기"], actionGuide: ["흐름이 약한 달에는 일정 밀도를 낮추기", "수면·식사·이동 시간을 먼저 보호하기"], checklist: ["피로 누적 달을 확인했는가", "회복 일정을 먼저 넣었는가"], caution: ["피곤할수록 더 크게 벌리는 선택을 피하기"], requiredTokens: ["피로", "스트레스", "월운", "회복"], monthMode: "required" }),
  "마음이 흔들리는 이유": defineNewYearCategoryRule({ domain: "health", evidence: ["인성", "비겁", "충·해", "감정 리듬"], opportunity: ["흔들림의 원인을 운의 압력과 생활 습관으로 분리하기"], actionGuide: ["감정 원인을 사람·돈·일정·몸으로 나누어 적기", "반응하기 전 하루의 간격을 두기"], checklist: ["마음의 원인을 분리했는가", "즉시 반응을 줄이는 장치가 있는가"], caution: ["감정의 파도를 올해 전체 판단으로 확대하지 않기"], requiredTokens: ["마음", "감정", "인성", "충"] }),
  "회복력을 높이는 생활 리듬": defineNewYearCategoryRule({ domain: "health", evidence: ["용신", "희신", "생활 루틴", "월운 회복"], opportunity: ["회복 루틴으로 운의 바닥을 단단히 만들기"], actionGuide: ["잠·식사·움직임을 일정한 시간에 고정하기", "좋은 달에도 회복 시간을 줄이지 않기"], checklist: ["회복 루틴이 고정되어 있는가", "좋은 달에도 쉬는 시간을 확보했는가"], caution: ["성과가 보인다고 회복 시간을 먼저 줄이지 않기"], requiredTokens: ["회복", "생활 리듬", "용신", "루틴"] }),
  "건강·멘탈 관리 원칙": defineNewYearCategoryRule({ domain: "health", evidence: ["오행 균형", "기신", "월운 하락", "심리 리듬"], opportunity: ["몸과 마음을 같은 기준으로 관리하기"], actionGuide: ["건강 신호는 기록하고 반복되면 전문가 점검을 받기", "멘탈 관리는 일정과 관계의 과부하를 줄이는 데서 시작하기"], checklist: ["몸과 마음의 신호를 기록했는가", "반복 신호를 방치하지 않는가"], caution: ["상담문을 의료 진단처럼 받아들이지 않기"], requiredTokens: ["건강", "멘탈", "오행", "관리"] }),
  "1분기 선택과 정리": defineNewYearCategoryRule({ domain: "quarter", evidence: ["1분기", "초반 월운", "기반 정리"], opportunity: ["초반 기준을 정해 한 해의 틀 만들기"], actionGuide: ["미뤄둔 정리와 우선순위를 먼저 끝내기", "새로운 일은 작은 시작점만 남기기"], checklist: ["1분기 정리 목록이 있는가", "우선순위를 좁혔는가"], caution: ["초반 의욕으로 너무 많은 일을 열지 않기"], requiredTokens: ["1분기", "선택", "정리", "월운"], monthMode: "required" }),
  "2분기 확장과 검증": defineNewYearCategoryRule({ domain: "quarter", evidence: ["2분기", "확장운", "검증", "성과 신호"], opportunity: ["좋은 흐름을 작게 넓혀 성과로 확인하기"], actionGuide: ["확장 전 비용·사람·시간을 검증하기", "성과가 보이면 다음 단계만 추가하기"], checklist: ["확장 전 검증표가 있는가", "성과 기준을 정했는가"], caution: ["검증 없이 한 번에 판을 키우지 않기"], requiredTokens: ["2분기", "확장", "검증", "성과"], monthMode: "required" }),
  "3분기 조율과 회수": defineNewYearCategoryRule({ domain: "quarter", evidence: ["3분기", "관계 조율", "성과 회수", "월운 변화"], opportunity: ["쌓인 성과를 회수하고 관계를 다듬기"], actionGuide: ["진행 중인 일을 정리하고 수익·신뢰를 회수하기", "갈등은 늦추지 말고 대화로 조율하기"], checklist: ["회수할 성과를 정했는가", "관계 조율 일정을 잡았는가"], caution: ["성과가 보인다고 관계 피로를 방치하지 않기"], requiredTokens: ["3분기", "조율", "회수", "관계"], monthMode: "required" }),
  "4분기 마무리와 재설계": defineNewYearCategoryRule({ domain: "quarter", evidence: ["4분기", "마무리", "재설계", "다음 해 준비"], opportunity: ["한 해의 결실을 정리하고 다음 문을 준비하기"], actionGuide: ["끝낼 일과 이어갈 일을 분리하기", "돈·관계·건강의 손익을 정리하기"], checklist: ["마무리할 일을 정했는가", "다음 해로 넘길 기준이 있는가"], caution: ["끝내야 할 일을 미루어 다음 해 부담으로 넘기지 않기"], requiredTokens: ["4분기", "마무리", "재설계", "정리"], monthMode: "required" }),
  "가장 중요한 결정 타이밍": defineNewYearCategoryRule({ domain: "quarter", evidence: ["월운 상위 달", "월운 하위 달", "실행·정비 흐름", "세운 흐름"], opportunity: ["결정은 강한 달에, 점검은 약한 달에 배치하기"], actionGuide: ["큰 결정 후보를 월별 흐름에 맞춰 재배치하기", "정비 달에는 보류와 검토를 선택하기"], checklist: ["중요 결정 달을 정했는가", "보류할 달을 표시했는가"], caution: ["타이밍이 약한 달에 체면 때문에 확정하지 않기"], requiredTokens: ["결정", "타이밍", "실행", "정비"], monthMode: "required" }),
  "가장 흔들리기 쉬운 문제": defineNewYearCategoryRule({ domain: "risk", evidence: ["기신", "충", "월운 하락", "반복 문제"], opportunity: ["흔들림의 원인을 조기에 발견하기"], actionGuide: ["사람·돈·건강·일정 중 취약한 한 곳을 먼저 관리하기", "반복 문제는 작은 신호부터 기록하기"], checklist: ["가장 약한 문제를 하나로 좁혔는가", "초기 신호를 정했는가"], caution: ["흔들림을 외면하다 한 번에 커지게 두지 않기"], requiredTokens: ["문제", "기신", "충", "월운"], monthMode: "required" }),
  "합충형파해와 사건 신호": defineNewYearCategoryRule({ domain: "risk", evidence: ["합", "충", "형", "파", "해"], opportunity: ["사건 신호를 변화 설계의 재료로 쓰기"], actionGuide: ["합은 조건을 확인하고 충은 대안을 준비하기", "형파해는 말·문서·일정의 균열을 먼저 점검하기"], checklist: ["합충형파해를 구분했는가", "사건 전 점검 순서가 있는가"], caution: ["좋은 합도 무리하면 묶임이 되고 충도 준비하면 전환점이 됨"], requiredTokens: ["합", "충", "형", "파", "해"] }),
  "반복하면 안 되는 실수": defineNewYearCategoryRule({ domain: "risk", evidence: ["기신 패턴", "반복 갈등", "월운 하락"], opportunity: ["반복 실수를 끊어 운의 누수를 막기"], actionGuide: ["반복되는 말·지출·관계 습관을 하나씩 줄이기", "실수 전 나타나는 감정 신호를 기록하기"], checklist: ["반복 실수 목록이 있는가", "멈춤 기준을 정했는가"], caution: ["알면서도 반복하는 선택이 올해 가장 큰 손실이 됨"], requiredTokens: ["반복", "실수", "기신", "기록"] }),
  "위기가 기회로 바뀌는 조건": defineNewYearCategoryRule({ domain: "risk", evidence: ["충의 전환", "합의 연결", "용신 보완", "월운 회복"], opportunity: ["막힌 흐름을 방향 전환과 재정비로 살리기"], actionGuide: ["위기 때는 축소·정리·대화 순서로 움직이기", "회복 달에는 다시 제안하고 연결하기"], checklist: ["위기 대응 순서가 있는가", "회복 달을 확인했는가"], caution: ["위기를 증명하려 하지 말고 구조를 바꾸기"], requiredTokens: ["위기", "기회", "용신", "회복"], monthMode: "required" }),
  "위험을 낮추는 회복 플랜": defineNewYearCategoryRule({ domain: "risk", evidence: ["월운 하락", "기신", "생활 리듬", "관계 경계"], opportunity: ["회복 플랜으로 위험을 작게 만들기"], actionGuide: ["위험 달에는 일정·지출·대화를 줄이고 확인하기", "회복 플랜은 수면·돈·관계 순서로 세우기"], checklist: ["위험 달 대응표가 있는가", "회복 루틴을 정했는가"], caution: ["위험 신호를 정신력으로만 버티려 하지 않기"], requiredTokens: ["위험", "회복 플랜", "월운", "기신"], monthMode: "required" }),
  "상반기 월별 흐름": defineNewYearCategoryRule({ domain: "monthly", evidence: ["1월", "2월", "3월", "4월", "5월", "6월"], opportunity: ["상반기 흐름에 맞춰 시작과 확장을 배치하기"], actionGuide: ["1월부터 6월까지 실행·관망·정비 흐름을 나누기", "상반기에는 시작점과 검증점을 분리하기"], checklist: ["상반기 월별 기준을 세웠는가", "확장할 달과 점검할 달을 나누었는가"], caution: ["상반기 흐름을 한 가지 분위기로 뭉뚱그리지 않기"], requiredTokens: ["상반기", "1월", "6월", "실행"], monthMode: "required" }),
  "하반기 월별 흐름": defineNewYearCategoryRule({ domain: "monthly", evidence: ["7월", "8월", "9월", "10월", "11월", "12월"], opportunity: ["하반기 흐름에 맞춰 회수와 마무리를 배치하기"], actionGuide: ["7월부터 12월까지 회수·조율·정리를 구분하기", "하반기에는 끝낼 일과 이어갈 일을 나누기"], checklist: ["하반기 월별 기준을 세웠는가", "마무리할 달을 정했는가"], caution: ["하반기 피로를 무시하고 계속 확장하지 않기"], requiredTokens: ["하반기", "7월", "12월", "정비"], monthMode: "required" }),
  "주의해야 할 달": defineNewYearCategoryRule({ domain: "monthly", evidence: ["월운 하위 달", "정비 흐름", "충·해·파", "기신"], opportunity: ["주의 달을 정비와 회복의 달로 바꾸기"], actionGuide: ["주의 달에는 큰 결정과 큰 지출을 보류하기", "관계·건강·문서 확인을 먼저 하기"], checklist: ["주의 달을 표시했는가", "보류할 결정을 정했는가"], caution: ["약한 달을 실패의 달로 단정하지 말고 보호의 달로 쓰기"], requiredTokens: ["주의", "정비", "월운", "보류"], monthMode: "required" }),
  "기회를 잡기 좋은 달": defineNewYearCategoryRule({ domain: "monthly", evidence: ["월운 상위 달", "실행 흐름", "용신", "성과 신호"], opportunity: ["좋은 달에 제안·발표·계약·만남을 배치하기"], actionGuide: ["좋은 달에는 준비한 일을 밖으로 꺼내기", "성과가 날 행동을 일정표에 고정하기"], checklist: ["기회 달을 표시했는가", "실행할 행동을 정했는가"], caution: ["기회 달이라고 여러 일을 동시에 벌리지 않기"], requiredTokens: ["기회", "실행", "월운", "성과"], monthMode: "required" }),
  "월별 Go/Stop 실행표": defineNewYearCategoryRule({ domain: "monthly", evidence: ["1월", "12월", "실행", "관망", "정비"], opportunity: ["12개월 실행 강약을 표로 고정하기"], actionGuide: ["실행 달은 움직이고, 관망 달은 보강하며, 정비 달은 속도를 낮추기", "매달 하나의 실행과 하나의 금지 항목을 정하기"], checklist: ["12개월 표를 확인했는가", "월별 실행 기준을 정했는가"], caution: ["표를 참고하되 생활 변수에 따라 무리하지 않기"], requiredTokens: ["실행", "관망", "정비", "실행표"], monthMode: "required" }),
  "올해의 최종 메시지": defineNewYearCategoryRule({ domain: "roadmap", evidence: ["세운", "용신", "월운", "핵심 기준"], opportunity: ["한 해의 메시지를 생활 기준으로 압축하기"], actionGuide: ["최종 메시지를 한 문장으로 정하고 매달 확인하기", "확장 흐름과 정비 흐름 모두에 같은 중심을 적용하기"], checklist: ["최종 메시지를 한 문장으로 적었는가", "월별 점검 기준이 있는가"], caution: ["좋은 말로 끝내지 말고 실행 문장으로 바꾸기"], requiredTokens: ["최종 메시지", "세운", "월운", "기준"] }),
  "먼저 정리해야 할 것": defineNewYearCategoryRule({ domain: "roadmap", evidence: ["기신", "누수 지점", "미정 상태", "월운 하락"], opportunity: ["정리를 통해 운이 들어올 공간 만들기"], actionGuide: ["돈·관계·일정·건강 중 에너지 누수를 먼저 치우기", "미정 상태를 줄여 선택 피로를 낮추기"], checklist: ["먼저 정리할 세 가지가 있는가", "미정 상태를 줄였는가"], caution: ["정리 없이 새 계획만 올리지 않기"], requiredTokens: ["정리", "기신", "누수", "월운"] }),
  "반드시 밀어붙일 것": defineNewYearCategoryRule({ domain: "roadmap", evidence: ["용신", "실행 달", "성과 신호", "세운 십성"], opportunity: ["올해 반드시 밖으로 꺼내야 할 핵심 행동"], actionGuide: ["좋은 달에 핵심 프로젝트를 밀어붙이기", "망설였던 제안과 결과물을 실제 일정에 올리기"], checklist: ["밀어붙일 일을 하나로 좁혔는가", "실행 달에 배치했는가"], caution: ["많은 일을 밀어붙이는 것이 아니라 핵심 하나를 끝까지 살리기"], requiredTokens: ["밀어붙일 것", "용신", "실행", "성과"], monthMode: "required" }),
  "내려놓아야 할 것": defineNewYearCategoryRule({ domain: "roadmap", evidence: ["기신", "반복 손실", "관계 피로", "월운 하락"], opportunity: ["내려놓음으로 운의 흐름을 가볍게 만들기"], actionGuide: ["반복 손실을 만드는 습관과 관계를 줄이기", "체면 때문에 붙잡은 일을 정리하기"], checklist: ["내려놓을 일을 정했는가", "반복 손실을 멈출 기준이 있는가"], caution: ["버려야 할 것을 붙잡으면 좋은 운도 들어올 자리가 줄어듦"], requiredTokens: ["내려놓", "기신", "손실", "정리"] }),
  "1년 실행 루틴": defineNewYearCategoryRule({ domain: "roadmap", evidence: ["12개월", "월운", "실행·정비 흐름", "생활 루틴"], opportunity: ["운의 흐름을 매달 반복 가능한 습관으로 만들기"], actionGuide: ["월초 계획, 월중 점검, 월말 회고를 고정하기", "실행 달과 정비 달의 행동 원칙을 다르게 세우기"], checklist: ["월초·월중·월말 루틴이 있는가", "12개월 실행표를 확인했는가"], caution: ["루틴을 크게 잡아 중간에 끊기지 않게 하기"], requiredTokens: ["1년", "루틴", "월운", "실행"], monthMode: "required" }),
});

function getNewYearCategoryRule(categoryTitle = "", chapterSpec = {}) {
  const title = clean(categoryTitle);
  if (NEW_YEAR_CATEGORY_QUALITY_RULES[title]) return NEW_YEAR_CATEGORY_QUALITY_RULES[title];
  const legacyTitle = title.replace(/실행·정비/g, "Go/Stop");
  if (NEW_YEAR_CATEGORY_QUALITY_RULES[legacyTitle]) return NEW_YEAR_CATEGORY_QUALITY_RULES[legacyTitle];
  const source = `${title} ${chapterSpec?.focus || ""}`;
  const domain = /커리어|직장|조직|업무|성과|이직|일\b/.test(source)
    ? "career"
    : /재물|돈|수익|지출|계약|가격|손실/.test(source)
      ? "money"
      : /연애|결혼|가족|감정/.test(source)
        ? "love"
        : /관계|귀인|협업|파트너/.test(source)
          ? "relationship"
          : /건강|심리|몸|피로|멘탈|회복/.test(source)
            ? "health"
            : /분기|타이밍/.test(source)
              ? "quarter"
              : /위험|위기|합충|형파해|실수/.test(source)
                ? "risk"
                : /월별|Go\/Stop|상반기|하반기/.test(source)
                  ? "monthly"
                  : /로드맵|메시지|루틴|정리|밀어붙일|내려놓/.test(source)
                    ? "roadmap"
                    : "annual";
  return defineNewYearCategoryRule({
    domain,
    subject: title ? `${title}의 상담 기준` : undefined,
    evidence: [title, "세운", "월운", "원국"],
    actionGuide: [`${title || "해당 항목"}의 실행 기준을 한 문장으로 정하기`, "좋은 달과 점검 달의 행동을 나누기"],
    checklist: [`${title || "해당 항목"}의 기준을 기록했는가`, "월별 실행 강약을 구분했는가"],
    caution: ["감정적 결론보다 기록과 순서로 판단하기"],
    requiredTokens: [title, "세운", "월운"],
  });
}

function formatNewYearRuleList(items = [], fallback = "기준 정리") {
  const list = (Array.isArray(items) ? items : [items]).map((item) => humanizeNewYearCustomerText(item)).filter(Boolean);
  return list.length ? list.join(" · ") : fallback;
}

function formatNewYearStemForCustomer(stem = "") {
  const value = clean(stem);
  if (!value) return "";
  return NEW_YEAR_STEM_KO[value] ? `${value}(${NEW_YEAR_STEM_KO[value]})` : value;
}

function formatNewYearBranchForCustomer(branch = "") {
  const value = clean(branch);
  if (!value) return "";
  return NEW_YEAR_BRANCH_KO[value] ? `${value}(${NEW_YEAR_BRANCH_KO[value]})` : value;
}

function formatNewYearGanjiForCustomer(value = "") {
  const label = clean(value);
  if (/[（(]/.test(label)) return label;
  if (label.length >= 2 && NEW_YEAR_STEM_SOUND[label[0]] && NEW_YEAR_BRANCH_SOUND[label[1]]) {
    return `${label}(${NEW_YEAR_STEM_SOUND[label[0]]}${NEW_YEAR_BRANCH_SOUND[label[1]]})`;
  }
  return label;
}

function stripNewYearChapterPrefix(title = "") {
  return clean(title).replace(/^제\s*\d+장\.\s*/u, "");
}

function newYearClientLabel(seed = {}) {
  const profile = seed?.birthProfile || seed?.input || {};
  const name = safeNewYearDisplayText(profile?.name, "고객");
  return `${name}님`;
}

function displayNewYearDecision(value = "") {
  const decision = clean(value).toUpperCase();
  if (decision === "GO") return "실행";
  if (decision === "WATCH") return "관망";
  if (decision === "STOP") return "정비";
  return clean(value) || "관망";
}

function humanizeNewYearCustomerText(value = "") {
  return clean(value)
    .replace(/퀀텀\s*명리\s*보정상/g, "정밀 보정으로 살피면")
    .replace(/퀀텀\s*명리/g, "정밀 명리")
    .replace(/퀀텀\s*보정/g, "정밀 보정")
    .replace(/월별\s*Go\/Stop/g, "월별 실행·정비 흐름")
    .replace(/Go\/Watch\/Stop/g, "실행·관망·정비")
    .replace(/\bGO\b/g, "실행")
    .replace(/\bWATCH\b/g, "관망")
    .replace(/\bSTOP\b/g, "정비")
    .replace(/\bGo\b/g, "실행")
    .replace(/\bWatch\b/g, "관망")
    .replace(/\bStop\b/g, "정비")
    .replace(/최종\s*판정은/g, "마지막 흐름은")
    .replace(/흐름으로\s*판정되며/g, "흐름으로 읽히며")
    .replace(/세운\s*퀀텀\s*판정/g, "세운 정밀 흐름")
    .replace(/최종\s*세운\s*점수/g, "전체 세운의 체감 강도")
    .replace(/월운\s*점수/g, "월운 강약")
    .replace(/점수가\s*높은/g, "흐름이 강한")
    .replace(/점수가\s*낮은/g, "흐름이 약한")
    .replace(/낮은\s*점수\s*구간/g, "흐름이 약한 구간")
    .replace(/이\s*카테고리에서는/g, "이 대목에서는")
    .replace(/상담\s*항목/g, "상담 절")
    .replace(/판정/g, "흐름");
}

function hasNewYearCustomerSentenceIssue(text = "") {
  return /퀀텀|카테고리|상담 항목|최종 세운 점수|점수|Go 판정|Stop 판정|Go\/Watch\/Stop|흐름라는|문라는|총운과 세운의 문의|일의 방향의 큰 흐름|월별 지도의 큰 흐름|로드맵의 큰 흐름/.test(clean(text));
}

function hasNewYearTemplateSentenceIssue(text = "") {
  const body = clean(text);
  return /대목은|표식입니다|방향의 방향|신호을|구조을|온도을|정재이|편재이|겁재이|하기을|않기을|흐름와|점검와|기준와|상담은|이 질문의 답은|줄이는 데서 시작됩니다|같은 흐름도 훨씬 덜 흔들립니다|판단은 세운, 월운, 십성, 오행|올해 운이 생활 속에서 어디로 먼저 드러나는지를 알려주는|큰 운의 이름보다 실제 선택 순서가 중요합니다/.test(body);
}

function countNewYearConsultationDensity(text = "") {
  return countNewYearTokenMatches(text, [
    "실제 장면", "실제 신호", "월지", "일지", "시지", "세운 지지", "십성", "합", "충", "형", "파", "해",
    "수입", "지출", "계약", "가격", "평가", "역할", "마감", "협업", "거리", "약속", "수면", "피로", "회복",
    "실행", "관망", "정비", "보류", "기록", "루틴",
  ]);
}

function polishNewYearActionPhrase(value = "") {
  const phrase = clean(value).replace(/[.!?。！？]+$/g, "");
  if (!phrase) return "기준을 분명히 세우는 것";
  return phrase
    .replace(/하지 않기$/g, "하지 않는 것")
    .replace(/하기$/g, "하는 것")
    .replace(/두기$/g, "두는 것")
    .replace(/보기$/g, "보는 것")
    .replace(/쓰기$/g, "쓰는 것")
    .replace(/키우기$/g, "키우는 것")
    .replace(/낮추기$/g, "낮추는 것")
    .replace(/늦추기$/g, "늦추는 것")
    .replace(/맞추기$/g, "맞추는 것")
    .replace(/나누기$/g, "나누는 것")
    .replace(/올리기$/g, "올리는 것")
    .replace(/남기기$/g, "남기는 것")
    .replace(/살리기$/g, "살리는 것")
    .replace(/늘리기$/g, "늘리는 것")
    .replace(/줄이기$/g, "줄이는 것")
    .replace(/받기$/g, "받는 것")
    .replace(/피하기$/g, "피하는 것");
}

function hasKoreanFinalConsonant(value = "") {
  const chars = Array.from(clean(value));
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const code = chars[index].charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) return ((code - 0xac00) % 28) !== 0;
  }
  return false;
}

function newYearParticle(value = "", particle = "은") {
  const final = hasKoreanFinalConsonant(value);
  if (particle === "을") return final ? "을" : "를";
  if (particle === "이") return final ? "이" : "가";
  return final ? "은" : "는";
}

function escapeNewYearRegExp(value = "") {
  return clean(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function polishKnownNewYearParticleText(text = "") {
  const labels = Object.keys(NEW_YEAR_CATEGORY_QUALITY_RULES || {}).sort((a, b) => b.length - a.length);
  return labels.reduce((result, label) => {
    const escaped = escapeNewYearRegExp(label);
    return result.replace(new RegExp(`${escaped}(은|을|이)`, "g"), (_match, particle) => `${label}${newYearParticle(label, particle)}`);
  }, text);
}

function polishNewYearConsultationText(value = "") {
  return polishKnownNewYearParticleText(humanizeNewYearCustomerText(value))
    .replace(/(겁재|정재|편재)이/g, "$1가")
    .replace(/([가-힣]+)하지 않기을/g, "$1하지 않기를")
    .replace(/([가-힣]+)하기을/g, "$1하기를")
    .replace(/([가-힣]+기)은/g, "$1는")
    .replace(/([가-힣]+기)을/g, "$1를")
    .replace(/않기을/g, "않기를")
    .replace(/하기을/g, "하기를")
    .replace(/(신호|구조|온도)이/g, "$1가")
    .replace(/(신호|구조|온도)을/g, "$1를")
    .replace(/(신호|구조|온도)은/g, "$1는")
    .replace(/월를/g, "월을")
    .replace(/월가/g, "월이")
    .replace(/월는/g, "월은")
    .replace(/년를/g, "년을")
    .replace(/년가/g, "년이")
    .replace(/년는/g, "년은")
    .replace(/메시지은/g, "메시지는")
    .replace(/메시지을/g, "메시지를")
    .replace(/메시지이/g, "메시지가")
    .replace(/흐름와/g, "흐름과")
    .replace(/점검와/g, "점검과")
    .replace(/기준와/g, "기준과")
    .replace(/원칙와/g, "원칙과")
    .replace(/방식와/g, "방식과")
    .replace(/깊은 결는/g, "깊은 결은")
    .replace(/실제 문입니다/g, "현실의 문을 여는 열쇠입니다")
    .replace(/달라집니다\s+([가-힣A-Za-z])/g, "달라집니다. $1")
    .replace(/[ \t]{2,}/g, " ");
}

function buildNewYearEvidenceSentence(categoryLabel = "", domain = "annual", categoryEvidence = "") {
  const evidenceText = clean(categoryEvidence) || "세운과 월운의 반응";
  const label = clean(categoryLabel) || "이 항목";
  const sentence = {
    annual: `${label}에서는 세운과 원국의 접점, 월운 강약, 십성의 역할을 ${evidenceText} 근거로 함께 살핍니다.`,
    career: `${label}에서는 원국의 직업 구조, 세운 십성, 월운 강약, 오행 균형을 ${evidenceText} 근거로 놓고 역할 변화와 평가 시기를 읽습니다.`,
    money: `${label}에서는 원국의 재성 구조, 세운 십성, 월운 강약, 오행 보완을 ${evidenceText} 근거로 대조해 수입 통로와 계약 조건을 봅니다.`,
    relationship: `${label}에서는 원국의 관계 자리, 세운 십성, 월운 강약, 합충 흐름, 오행 균형을 ${evidenceText} 근거로 읽습니다.`,
    love: `${label}에서는 원국의 일지와 배우자성, 세운 십성, 월운 강약, 오행 흐름을 ${evidenceText} 근거로 풀어냅니다.`,
    health: `${label}에서는 원국 오행, 세운 십성, 월운 하락 구간, 용신·기신 보완을 ${evidenceText} 근거로 확인합니다.`,
    risk: `${label}에서는 원국의 취약 지점, 세운 십성, 월운 하락, 합충형파해, 오행 과열을 ${evidenceText} 근거로 분리합니다.`,
    monthly: `${label}에서는 원국 반응, 세운 십성, 월운 강약, 오행 보완을 ${evidenceText} 근거로 배열합니다.`,
    quarter: `${label}에서는 원국 기반, 세운 십성, 월운 강약, 오행 균형을 ${evidenceText} 근거로 놓고 분기별 개시와 회수 순서를 살핍니다.`,
    roadmap: `${label}에서는 원국의 반복 신호, 세운 십성, 월운 흐름, 용신·기신 보완을 ${evidenceText} 근거로 정리합니다.`,
  }[domain];
  return sentence || `${label}에서는 세운, 월운, 십성, 오행의 반응을 ${evidenceText} 근거로 함께 읽습니다.`;
}

function buildNewYearSectionHeadings(categoryLabel = "", domain = "annual") {
  const label = clean(categoryLabel) || "이 항목";
  const endings = {
    money: ["돈의 핵심 결론", "재물 명리 근거", "현금 흐름 신호", "손실 주의선", "재물 실행 처방", "월별 돈 운영"],
    career: ["일의 핵심 결론", "직업 명리 근거", "현장 변화 신호", "업무 주의선", "성과 실행 처방", "월별 일 운영"],
    relationship: ["관계 핵심 결론", "인연 명리 근거", "사람 사이 신호", "갈등 주의선", "관계 실행 처방", "월별 관계 운영"],
    love: ["마음의 핵심 결론", "인연 명리 근거", "감정 현실 신호", "약속 주의선", "사랑 실행 처방", "월별 감정 운영"],
    health: ["몸과 마음의 핵심 결론", "건강 명리 근거", "생활 신호", "회복 주의선", "관리 실행 처방", "월별 회복 운영"],
    quarter: ["시기의 핵심 결론", "분기 명리 근거", "분기 현실 신호", "시기 주의선", "분기 실행 처방", "월별 조율"],
    risk: ["위험의 핵심 결론", "방어 명리 근거", "손실 신호", "위험 주의선", "방어 실행 처방", "월별 방어 운영"],
    monthly: ["월운 핵심 결론", "월별 명리 근거", "생활 변화 신호", "월별 주의선", "월운 실행 처방", "월별 운영표"],
    roadmap: ["로드맵 핵심 결론", "연간 명리 근거", "실행 현실 신호", "선택 주의선", "연간 실행 처방", "월별 루틴 운영"],
  }[domain] || ["핵심 결론", "명리 근거", "현실 신호", "주의선", "실행 처방", "월별 운영"];
  return endings.map((ending) => `${label}의 ${ending}`);
}

function pickNewYearVariant(items = [], index = 0, fallback = "") {
  const list = Array.isArray(items) ? items.map(clean).filter(Boolean) : [];
  if (!list.length) return fallback;
  return list[Math.abs(Number(index || 0)) % list.length];
}

function getNewYearDomainConsultationProfile(domain = "annual", index = 0) {
  const profiles = {
    annual: {
      headings: ["올해의 첫 결", "원국에 닿는 세운", "삶의 중심 변화", "지켜야 할 선", "한 해의 운영법"],
      reality: "올해 전체운은 한 번의 사건보다 반복되는 선택의 결에서 드러납니다.",
      risk: "초반의 분위기만 믿고 모든 영역을 한꺼번에 바꾸면 운의 결이 흐려집니다.",
      action: "가장 먼저 지킬 기준 하나를 정하고, 그 기준을 일·돈·관계·건강에 차례로 적용하십시오.",
      monthly: "월운은 큰 결정을 확정하는 달과 조용히 다듬는 달을 구분하는 지도처럼 쓰는 것이 좋습니다.",
    },
    career: {
      headings: ["일의 자리", "평가의 근거", "성과가 열리는 문", "피해야 할 업무 습관", "커리어 실행법"],
      reality: "일운은 맡은 역할, 드러난 결과물, 주변의 평가가 서로 맞물릴 때 선명해집니다.",
      risk: "성과 욕심이 커질수록 역할의 경계와 약속한 범위를 흐리지 않는 것이 중요합니다.",
      action: "올해 커리어는 일을 많이 벌리는 방식보다 성과가 남는 일을 선명하게 고르는 방식이 유리합니다.",
      monthly: "흐름이 강한 달에는 제안과 발표를 앞에 두고, 약한 달에는 실력 보강과 관계 정리를 우선하십시오.",
    },
    money: {
      headings: ["돈의 입구", "손익의 균형", "계약과 지출의 선", "새는 돈의 신호", "재물운 사용법"],
      reality: "재물운은 들어오는 돈보다 남는 구조에서 진짜 힘이 생깁니다.",
      risk: "수익 기대가 커질수록 지출, 계약, 가격의 기준을 느슨하게 두면 운이 새어 나갑니다.",
      action: "돈은 감정으로 움직이지 말고 수입 통로, 지출 상한, 보류 기준을 나누어 다루십시오.",
      monthly: "좋은 달에는 수익 구조를 제안하고, 약한 달에는 계약 문구와 고정비를 다시 살피는 편이 안정적입니다.",
    },
    relationship: {
      headings: ["인연의 입구", "귀인의 결", "관계의 거리", "갈등의 신호", "사람운 운영법"],
      reality: "사람운은 누가 들어오는가보다 어떤 약속과 역할로 이어지는가에서 차이가 납니다.",
      risk: "좋은 인연처럼 보여도 경계와 책임을 흐리면 기대가 부담으로 바뀔 수 있습니다.",
      action: "관계는 넓히기 전에 오래 갈 사람, 조율할 사람, 거리를 둘 사람을 구분해야 합니다.",
      monthly: "흐름이 열린 달에는 만남과 제안을, 약한 달에는 오해 정리와 거리 조절을 앞에 두십시오.",
    },
    love: {
      headings: ["마음의 온도", "인연의 속도", "약속의 무게", "가까운 사람의 책임", "사랑의 조율법"],
      reality: "애정운은 감정의 크기보다 생활 속에서 감당 가능한 약속으로 드러납니다.",
      risk: "외로움이나 기대가 커질수록 상대의 말보다 반복되는 행동을 보아야 합니다.",
      action: "가까운 관계에서는 속도를 늦추더라도 기대, 책임, 생활 조건을 말로 맞추는 편이 좋습니다.",
      monthly: "감정이 열리는 달에는 표현을, 흔들리는 달에는 결론보다 대화의 온도를 먼저 다루십시오.",
    },
    health: {
      headings: ["몸의 신호", "마음의 밀도", "피로가 쌓이는 자리", "회복의 문", "생활 리듬 처방"],
      reality: "건강운은 큰 사건보다 수면, 식사, 긴장, 감정의 반복 패턴에서 먼저 드러납니다.",
      risk: "버티는 힘을 건강으로 착각하면 피로가 늦게가 아니라 한꺼번에 올라옵니다.",
      action: "올해 몸과 마음은 줄일 일정, 지킬 루틴, 도움을 요청할 시점을 미리 정해야 안정됩니다.",
      monthly: "흐름이 약한 달에는 일을 줄이는 결단도 운을 지키는 중요한 선택입니다.",
    },
    quarter: {
      headings: ["분기의 문", "선택의 순서", "확장과 검증", "회수와 정리", "결정 타이밍"],
      reality: "분기운은 한 해를 네 번의 호흡으로 나누어 과속과 지연을 줄이는 데 의미가 있습니다.",
      risk: "모든 결정을 좋은 달 하나에 몰아넣으면 준비와 회수가 서로 어긋납니다.",
      action: "초반은 기준, 중반은 실행과 검증, 후반은 회수와 정리로 나누어야 운의 손실이 줄어듭니다.",
      monthly: "분기 안에서도 실행 달과 정비 달을 따로 표시해 두면 결정의 흔들림이 줄어듭니다.",
    },
    risk: {
      headings: ["위험의 시작점", "사건의 신호", "반복 실수", "반전의 조건", "회복 전략"],
      reality: "위험운은 갑자기 오는 것처럼 보여도 대개 오래 무시한 작은 신호에서 시작됩니다.",
      risk: "불안할수록 더 크게 벌리거나 더 세게 밀어붙이면 손실이 커질 수 있습니다.",
      action: "위험은 피하기보다 줄이는 순서가 중요합니다. 먼저 멈추고, 기록하고, 사람과 돈의 경계를 다시 세우십시오.",
      monthly: "주의 달은 실패의 달이 아니라 방어선을 세우는 달로 쓰면 오히려 반전의 기반이 됩니다.",
    },
    monthly: {
      headings: ["달의 결", "상반기와 하반기", "주의 달의 쓰임", "기회 달의 문", "12개월 운영표"],
      reality: "월별 운세는 좋고 나쁨의 순위가 아니라 어느 달에 무엇을 할지 정하는 실행 지도입니다.",
      risk: "강한 달이라고 모든 일을 벌리거나 약한 달이라고 모든 일을 멈추면 흐름을 제대로 쓰기 어렵습니다.",
      action: "달마다 실행할 일 하나와 금지할 일 하나를 정하면 운의 리듬이 생활 속에서 잡힙니다.",
      monthly: "실행, 관망, 정비의 세 칸으로 달을 나누면 한 해 전체의 속도 조절이 쉬워집니다.",
    },
    roadmap: {
      headings: ["올해의 문장", "먼저 비울 것", "밀어붙일 것", "내려놓을 것", "1년 루틴"],
      reality: "최종 로드맵은 좋은 말을 모으는 것이 아니라 실제 생활에서 반복할 기준을 남기는 일입니다.",
      risk: "정리하지 않은 상태에서 새 목표만 얹으면 좋은 운도 오래 머물 자리가 부족합니다.",
      action: "올해는 먼저 비우고, 반드시 밀어붙일 일을 하나로 좁힌 뒤, 매달 같은 방식으로 점검해야 합니다.",
      monthly: "월초 계획, 월중 점검, 월말 회고를 고정하면 운의 흐름이 체감 가능한 습관으로 바뀝니다.",
    },
  };
  const profile = profiles[domain] || profiles.annual;
  return {
    ...profile,
    heading: pickNewYearVariant(profile.headings, index, "상담 포인트"),
  };
}

function newYearTenGodConsultationSentence(tenGodName = "", categoryLabel = "", domain = "annual", index = 0) {
  const tenGod = clean(tenGodName);
  const annualMeanings = {
    비견: ["자기 기준을 세우는 힘", "스스로 결정하려는 기운", "동등한 사람과 견주며 중심을 찾는 흐름"],
    겁재: ["경쟁과 분리를 통해 경계를 세우는 힘", "나눌 것과 지킬 것을 가르는 기운", "손익과 관계의 선을 선명하게 하는 흐름"],
    식신: ["꾸준히 만들어 내는 힘", "생활 속 생산성과 안정감", "편안한 성과를 오래 쌓는 기운"],
    상관: ["표현과 돌파의 힘", "낡은 틀을 바꾸려는 기운", "말과 결과물이 강해지는 흐름"],
    편재: ["넓은 기회와 시장감각", "바깥 흐름을 빠르게 포착하는 힘", "사람과 자원을 넓게 움직이는 기운"],
    정재: ["현실을 검증하고 책임을 맞추는 힘", "약속과 숫자를 차분히 맞추는 기운", "흐트러진 것을 생활 기준으로 고정하는 힘"],
    편관: ["압박 속에서 돌파하는 힘", "긴장을 성과로 바꾸는 책임감", "위기 속에서 결단을 요구하는 기운"],
    정관: ["신뢰와 질서를 세우는 힘", "공식적인 인정과 책임", "규칙 안에서 자리를 잡는 기운"],
    편인: ["직관과 통찰의 힘", "혼자 깊이 파고드는 기운", "새 관점을 열어 흐름을 바꾸는 감각"],
    정인: ["보호와 배움의 힘", "안정과 회복을 찾는 기운", "신뢰받는 지식을 쌓는 흐름"],
  };
  const domainMeanings = {
    career: {
      비견: ["역할의 주도권을 직접 쥐는 힘", "성과 기준을 스스로 세우는 흐름"],
      겁재: ["경쟁자와 협력자를 분리해야 하는 압력", "공동 업무의 몫을 다시 나누는 기운"],
      식신: ["반복 가능한 결과물을 만드는 힘", "꾸준한 산출로 평판을 쌓는 흐름"],
      상관: ["말, 기획, 발표로 판을 흔드는 힘", "기존 방식에 새 결과물을 내미는 기운"],
      편재: ["외부 제안과 넓은 시장을 읽는 감각", "기회를 빠르게 붙잡는 업무 감각"],
      정재: ["성과를 일정과 숫자로 관리하는 책임감", "약속한 일을 정확히 끝내는 신뢰"],
      편관: ["압박 속에서도 마감과 책임을 밀고 가는 힘", "긴장된 자리에서 실력을 증명하는 기운"],
      정관: ["조직 안에서 신뢰와 평가를 얻는 기운", "공식 역할을 안정적으로 맡는 힘"],
      편인: ["새로운 방식으로 문제를 해석하는 감각", "혼자 깊게 파고들어 전문성을 만드는 힘"],
      정인: ["배움과 문서화로 신뢰를 쌓는 기운", "지식과 자격을 기반으로 인정받는 흐름"],
    },
    money: {
      비견: ["내 돈의 기준을 스스로 지키는 힘", "타인의 소비 속도에 흔들리지 않는 감각"],
      겁재: ["나갈 돈과 지킬 돈의 경계를 세우는 압력", "공동 지출과 손익을 분리해야 하는 흐름"],
      식신: ["작은 수익을 꾸준히 쌓는 힘", "생활 속에서 돈이 모이는 루틴"],
      상관: ["아이디어와 표현을 수익으로 바꾸는 기운", "가격과 제안 방식을 새로 잡는 흐름"],
      편재: ["확장 수익과 외부 기회를 읽는 감각", "변동 수익을 다룰 때 살아나는 기운"],
      정재: ["고정 수입과 현금 흐름을 지키는 힘", "숫자와 약속을 맞춰 손실을 줄이는 기운"],
      편관: ["빚, 책임, 압박 비용을 관리해야 하는 신호", "긴장된 돈 결정을 보수적으로 다루는 힘"],
      정관: ["계약과 절차를 통해 돈을 안정시키는 기운", "문서와 규칙으로 손익을 보호하는 힘"],
      편인: ["보이지 않는 비용과 정보를 읽는 감각", "투자보다 검증을 앞세우는 판단력"],
      정인: ["안전망과 저축 구조를 만드는 힘", "배움과 자격이 장기 수입으로 이어지는 흐름"],
    },
    relationship: {
      비견: ["서로의 기준을 인정해야 관계가 편해지는 힘", "대등한 관계 안에서 중심을 지키는 기운"],
      겁재: ["가까운 사이의 경계와 몫을 조정하는 압력", "친밀함 속에서도 선을 세워야 하는 흐름"],
      식신: ["편안한 말과 반복되는 배려로 신뢰를 쌓는 힘", "관계를 오래 데우는 생활감"],
      상관: ["솔직한 표현이 관계를 흔들거나 열 수 있는 기운", "말의 온도를 세심히 다뤄야 하는 흐름"],
      편재: ["넓은 인맥과 외부 만남이 열리는 감각", "여러 사람 사이에서 기회를 찾는 기운"],
      정재: ["관계를 현실적인 약속과 책임으로 안정시키는 힘", "신뢰를 행동으로 확인하려는 기운"],
      편관: ["갈등과 긴장 속에서 관계의 진심이 드러나는 힘", "부담을 피하지 않고 조율해야 하는 흐름"],
      정관: ["예의, 책임, 역할이 관계를 지키는 기운", "공식적인 신뢰를 쌓는 힘"],
      편인: ["말보다 분위기를 먼저 읽는 직관", "혼자만의 해석이 관계를 흔들 수 있는 기운"],
      정인: ["보호, 배려, 이해가 관계를 부드럽게 만드는 힘", "신뢰받는 조언자가 되는 흐름"],
    },
    love: {
      비견: ["사랑 안에서도 나의 기준을 잃지 않으려는 힘", "서로의 자존을 맞춰야 하는 기운"],
      겁재: ["질투, 비교, 거리 조절을 배우게 하는 압력", "관계의 몫과 경계를 다시 정하는 흐름"],
      식신: ["일상적 다정함과 반복되는 표현으로 애정을 키우는 힘", "편안한 관계를 만드는 생활감"],
      상관: ["감정 표현이 강해지는 기운", "말 한마디가 관계의 방향을 바꾸는 흐름"],
      편재: ["새 인연과 설렘이 넓게 들어오는 감각", "관계의 가능성을 빠르게 알아보는 기운"],
      정재: ["감정을 현실적인 약속으로 안정시키는 힘", "생활 조건과 책임을 맞춰 사랑을 지키는 기운"],
      편관: ["긴장과 불안 속에서 관계의 책임을 확인하는 힘", "위기 속에서 진심을 드러내는 흐름"],
      정관: ["장기 약속과 신뢰를 세우는 기운", "관계의 이름과 책임을 분명히 하려는 힘"],
      편인: ["감정의 이면을 예민하게 읽는 직관", "혼자 추측하기보다 확인이 필요한 기운"],
      정인: ["상대에게 기대고 보호받고 싶은 마음", "안정감과 이해가 사랑을 깊게 만드는 흐름"],
    },
    health: {
      비견: ["내 몸의 속도를 스스로 지키는 힘", "남과 비교하지 않고 회복 기준을 세우는 기운"],
      겁재: ["체력 소모와 에너지 누수를 줄여야 하는 압력", "무리한 경쟁이 몸에 남는 흐름"],
      식신: ["식사, 수면, 산책처럼 반복 루틴을 회복시키는 힘", "몸을 안정시키는 생활 리듬"],
      상관: ["신경과 표현 에너지가 과열되기 쉬운 기운", "말과 생각이 많아질수록 몸을 쉬게 해야 하는 흐름"],
      편재: ["외부 일정과 활동량이 몸을 흔드는 감각", "넓게 움직일수록 회복 시간을 확보해야 하는 기운"],
      정재: ["생활 리듬과 절제로 몸을 안정시키는 힘", "작은 습관을 정확히 지켜 회복을 만드는 기운"],
      편관: ["긴장, 압박, 스트레스가 몸으로 내려오는 신호", "무리한 버팀을 줄여야 하는 흐름"],
      정관: ["규칙적인 관리와 검진 루틴을 세우는 힘", "몸의 질서를 되찾는 기운"],
      편인: ["예민한 감각과 불면 신호를 읽어야 하는 기운", "혼자 견디기보다 회복 방식을 바꿔야 하는 흐름"],
      정인: ["쉬고 배우고 보호받으며 회복하는 힘", "몸과 마음의 안전감을 회복하는 기운"],
    },
  };
  const matrix = domainMeanings[domain] || {};
  const phrase = pickNewYearVariant(matrix[tenGod] || annualMeanings[tenGod] || ["올해 중심 기운"], index, "올해 중심 기운");
  const domainTail = {
    career: `${categoryLabel}에서는 이 기운을 역할, 마감, 평가 증거로 정리해야 합니다.`,
    money: `${categoryLabel}에서는 이 기운을 수입 통로, 지출 상한, 계약 조건으로 나누어 보아야 합니다.`,
    relationship: `${categoryLabel}에서는 이 기운이 거리감, 신뢰 행동, 역할 조율로 드러납니다.`,
    love: `${categoryLabel}에서는 이 기운이 감정의 속도, 약속의 무게, 생활 조건으로 나타납니다.`,
    health: `${categoryLabel}에서는 이 기운이 피로, 수면, 긴장, 회복 루틴으로 느껴집니다.`,
    risk: `${categoryLabel}에서는 이 기운이 과속을 멈추고 방어선을 세우라는 신호가 됩니다.`,
    monthly: `${categoryLabel}에서는 이 기운을 실행할 달과 정비할 달의 리듬으로 나누어야 합니다.`,
    quarter: `${categoryLabel}에서는 이 기운을 분기별 개시, 검증, 회수, 정리의 순서로 써야 합니다.`,
    roadmap: `${categoryLabel}에서는 이 기운을 오래 반복할 생활 기준과 금지선으로 내려놓아야 합니다.`,
  }[domain] || `${categoryLabel}에서는 이 기운을 올해 선택의 기준으로 삼아야 합니다.`;
  return `${categoryLabel}에는 ${tenGod ? `${tenGod}이 ` : ""}${phrase}으로 작용합니다. ${domainTail}`;
}

function buildNewYearCategoryConsultationAngles({ categoryRule = {}, categoryLabel = "", profile = {}, seed = {}, strongMonths = [], careMonths = [], sectionIndex = 0 } = {}) {
  const action = pickNewYearVariant(categoryRule.actionGuide, sectionIndex, `${categoryLabel}의 실행 기준을 먼저 정하십시오.`);
  const caution = pickNewYearVariant(categoryRule.caution, sectionIndex, `${categoryLabel}에서 무리한 확장은 피하십시오.`);
  const opportunity = pickNewYearVariant(categoryRule.opportunity, sectionIndex, `${categoryLabel}의 기회를 실제 행동으로 옮기십시오.`);
  const checklist = pickNewYearVariant(categoryRule.checklist, sectionIndex, `${categoryLabel}의 기준을 기록했는가`);
  const strong = strongMonths.length ? strongMonths.join("·") : "흐름이 열리는 달";
  const care = careMonths.length ? careMonths.join("·") : "점검이 필요한 달";
  const profileSentence = (value = "") => {
    const phrase = clean(value)
      .replace(/[.!?。！？]+/g, ",")
      .replace(/,\s*$/g, "")
      .replace(/\s+/g, " ");
    return phrase ? `${categoryLabel}에서는 ${phrase}.` : "";
  };
  return {
    action: `${action} ${profileSentence(profile.action)}`,
    caution: `${caution} ${profileSentence(profile.risk)}`,
    opportunity: `${opportunity} ${profileSentence(profile.reality)}`,
    checklist: pickNewYearVariant([
      `${categoryLabel}에서는 '${clean(checklist).replace(/[?？]+$/g, "")}'를 월초와 월말의 기준으로 삼으십시오.`,
      `${categoryLabel}은 '${clean(checklist).replace(/[?？]+$/g, "")}'를 확인할 때 실행과 보류가 선명해집니다.`,
      `${categoryLabel}의 점검은 '${clean(checklist).replace(/[?？]+$/g, "")}'를 생활 기록에 남기는 데서 안정됩니다.`,
    ], sectionIndex, `${categoryLabel}에서는 '${clean(checklist).replace(/[?？]+$/g, "")}'를 매달 확인하십시오.`),
    monthly: `${strong}에는 ${action}을 앞에 두고, ${care}에는 ${caution}을 먼저 적용하십시오. ${profileSentence(profile.monthly)}`,
  };
}

function buildNewYearCategoryConsultationQuestion({ categoryLabel = "", categoryRule = {}, domain = "annual", index = 0 } = {}) {
  const action = pickNewYearVariant(categoryRule.actionGuide, index, "무엇을 먼저 실행할 것인가");
  const caution = pickNewYearVariant(categoryRule.caution, index, "무엇을 늦추어야 하는가");
  const questions = {
    annual: [
      `${categoryLabel}에서 올해의 첫 기준은 어디에 세워야 하는가?`,
      `${categoryLabel}이 한 해 전체의 선택 순서를 어떻게 바꾸는가?`,
      `${categoryLabel} 항목을 통해 운을 살릴 행동과 줄일 습관은 무엇인가?`,
    ],
    career: [
      `${categoryLabel}에서 맡아야 할 역할과 내려놓아야 할 역할은 무엇인가?`,
      `${categoryLabel} 항목을 평가와 성과로 남기려면 어떤 증거가 필요한가?`,
      `${categoryLabel}에서 책임을 키울 때 어디까지가 감당 가능한 선인가?`,
    ],
    money: [
      `${categoryLabel}에서 돈이 들어오는 문과 새는 문은 어디인가?`,
      `${categoryLabel} 항목을 판단할 때 수입, 지출, 계약 중 무엇을 먼저 고정해야 하는가?`,
      `${categoryLabel}에서 확장보다 먼저 확인해야 할 숫자는 무엇인가?`,
    ],
    relationship: [
      `${categoryLabel}에서 가까워질 사람과 거리를 둘 사람은 어떻게 구분되는가?`,
      `${categoryLabel} 상담을 지키려면 역할, 기대, 약속 중 무엇을 먼저 맞춰야 하는가?`,
      `${categoryLabel}에서 호의와 책임의 경계는 어디에 두어야 하는가?`,
    ],
    love: [
      `${categoryLabel}에서 감정의 속도와 현실의 약속은 어떻게 맞춰야 하는가?`,
      `${categoryLabel} 관계를 오래 가게 하려면 어떤 말보다 어떤 행동을 확인해야 하는가?`,
      `${categoryLabel}에서 사랑을 키울 때 서두르지 말아야 할 지점은 어디인가?`,
    ],
    health: [
      `${categoryLabel}에서 몸이 먼저 보내는 신호는 무엇인가?`,
      `${categoryLabel} 흐름을 회복하려면 줄일 일정과 지킬 루틴은 무엇인가?`,
      `${categoryLabel}에서 무리와 회복의 경계는 어느 달에 가장 선명한가?`,
    ],
    quarter: [
      `${categoryLabel}에서 열어야 할 일과 닫아야 할 일은 무엇인가?`,
      `${categoryLabel} 일정을 분기 안에서 실행, 검증, 회수 중 어디에 놓아야 하는가?`,
      `${categoryLabel}에서 지금 결정할 것과 다음 흐름으로 넘길 것은 무엇인가?`,
    ],
    risk: [
      `${categoryLabel}에서 가장 먼저 작아져야 할 위험 신호는 무엇인가?`,
      `${categoryLabel} 흐름을 반전시키려면 멈춤, 기록, 조율 중 무엇이 먼저인가?`,
      `${categoryLabel}에서 반복하지 말아야 할 선택은 무엇인가?`,
    ],
    monthly: [
      `${categoryLabel}에서 움직일 달과 정비할 달은 어떻게 나뉘는가?`,
      `${categoryLabel} 흐름을 월별 달력에 옮길 때 실행 항목과 금지 항목은 무엇인가?`,
      `${categoryLabel}에서 좋은 달을 과열 없이 쓰는 법은 무엇인가?`,
    ],
    roadmap: [
      `${categoryLabel} 항목을 올해의 루틴으로 남기려면 무엇을 비우고 무엇을 밀어야 하는가?`,
      `${categoryLabel}에서 끝까지 가져갈 기준과 내려놓을 기준은 무엇인가?`,
      `${categoryLabel}을 한 해의 약속으로 만들려면 어떤 점검이 반복되어야 하는가?`,
    ],
  };
  const question = pickNewYearVariant(questions[domain] || questions.annual, index, `${categoryLabel}의 핵심 기준은 무엇인가?`);
  const actionText = polishNewYearActionPhrase(action);
  const cautionText = polishNewYearActionPhrase(caution);
  return pickNewYearVariant([
    `${question} 실제 처방은 ${actionText}이며, 보호선은 ${cautionText}입니다.`,
    `${question} 이 항목의 해법은 ${actionText}에서 열리고, 흔들림은 ${cautionText}에서 줄어듭니다.`,
    `${question} 중심 처방은 ${actionText}이고, 올해의 경계는 ${cautionText}입니다.`,
  ], index, `${question} 실제 처방은 ${actionText}이며, 보호선은 ${cautionText}입니다.`);
}

function buildNewYearPersonalScenario(ctx = {}) {
  const {
    categoryLabel = "",
    domain = "annual",
    annualTenGod = "",
    dayMasterRelation = "",
    strong = "운이 살아나는 달",
    care = "점검이 필요한 달",
    qStrong = "실행 흐름",
    qCare = "정비 흐름",
    relationFocus = "",
    usefulText = "균형 회복",
    categoryActions = "",
    categoryCautions = "",
    categoryChecklist = "",
    clientLabel = "고객님",
    sectionIndex = 0,
  } = ctx;
  const scenes = {
    annual: {
      place: "생활의 우선순위, 약속의 방식, 하루를 쓰는 순서",
      trigger: "새로운 역할이나 계획을 한꺼번에 열고 싶어지는 순간",
      decision: "가장 먼저 지킬 기준 하나를 정하고 나머지를 그 기준 아래에 세우는 것",
      risk: "초반 분위기만 보고 한 해 전체를 단정하는 태도",
    },
    career: {
      place: "업무 배정, 평가 자리, 제안서와 마감 일정",
      trigger: "맡은 일이 늘거나 새 역할을 제안받는 순간",
      decision: "성과로 남길 일과 거절하거나 위임할 일을 분리하는 것",
      risk: "인정받고 싶은 마음 때문에 감당 못 할 책임까지 끌어안는 태도",
    },
    money: {
      place: "수입 통로, 계약 조건, 고정비와 큰 지출",
      trigger: "돈이 들어올 가능성과 지출 압력이 동시에 커지는 순간",
      decision: "받을 돈, 쓸 돈, 보류할 돈을 날짜와 숫자로 나누는 것",
      risk: "아직 들어오지 않은 돈을 믿고 먼저 움직이는 선택",
    },
    relationship: {
      place: "소개, 협업, 가까운 사람과의 역할 조율",
      trigger: "도움이 들어오거나 관계의 기대치가 갑자기 커지는 순간",
      decision: "가까이 둘 사람, 조율할 사람, 거리를 둘 사람을 구분하는 것",
      risk: "호의와 책임의 경계를 흐리는 태도",
    },
    love: {
      place: "감정 표현, 약속의 속도, 생활 조건을 맞추는 대화",
      trigger: "끌림은 커지지만 현실 조건을 확인해야 하는 순간",
      decision: "감정의 크기보다 반복되는 행동과 책임의 무게를 보는 것",
      risk: "외로움이나 불안으로 결론을 서두르는 태도",
    },
    health: {
      place: "수면, 식사, 긴장, 회복 시간을 배치하는 생활 리듬",
      trigger: "할 일은 많은데 몸의 신호가 먼저 예민해지는 순간",
      decision: "줄일 일정과 반드시 지킬 회복 루틴을 먼저 정하는 것",
      risk: "버티는 힘을 건강운으로 착각하는 태도",
    },
    quarter: {
      place: "분기별 목표, 검증 일정, 회수와 정리의 순서",
      trigger: "열어야 할 일과 닫아야 할 일이 동시에 보이는 순간",
      decision: "시작, 확장, 검증, 회수를 한 분기 안에서 분리하는 것",
      risk: "모든 결정을 한 달이나 한 시점에 몰아넣는 태도",
    },
    risk: {
      place: "말, 돈, 일정, 관계 중 가장 먼저 균열이 생기는 자리",
      trigger: "작은 불편을 무시하면 더 큰 손실로 번질 수 있는 순간",
      decision: "멈춤, 기록, 조율의 순서로 위험을 작게 만드는 것",
      risk: "불안할수록 더 크게 밀어붙이는 태도",
    },
    monthly: {
      place: "12개월 달력 위의 실행, 관망, 정비 구간",
      trigger: "달마다 같은 방식으로 움직이면 손실이 생기는 순간",
      decision: "움직일 달과 정비할 달의 행동을 다르게 배치하는 것",
      risk: "월운을 점수만 보고 실제 일정으로 옮기지 않는 태도",
    },
    roadmap: {
      place: "연간 루틴, 금지선, 끝까지 가져갈 기준",
      trigger: "새 목표보다 먼저 정리해야 할 것이 보이는 순간",
      decision: "밀어붙일 하나와 내려놓을 하나를 동시에 정하는 것",
      risk: "좋은 말로 끝내고 생활 기준으로 남기지 않는 태도",
    },
  };
  const scene = scenes[domain] || scenes.annual;
  const relationSignal = clean(relationFocus)
    .replace(/[.!?。！？]+$/g, "")
    .replace(/납니다$/g, "나는")
    .replace(/됩니다$/g, "되는")
    .replace(/집니다$/g, "지는")
    .replace(/합니다$/g, "하는")
    .replace(/습니다$/g, "는");
  const actionScenario = clean(categoryActions || scene.decision).replace(/[.!?。！？]+$/g, "");
  const cautionScenario = clean(categoryCautions || scene.risk).replace(/[.!?。！？]+$/g, "");
  const checklistText = clean(categoryChecklist || "기록과 확인").replace(/[.。]+$/g, "");
  const checklistStem = checklistText.replace(/[?？!！]+$/g, "");
  const checklistFrame = /(는가|인가|한가|했는가|있는가|되는가|좋은가|나뉘는가|필요한가|무엇인가)$/.test(checklistStem)
    ? `${checklistText}라는 질문`
    : `${checklistText}${hasKoreanFinalConsonant(checklistText) ? "이라는" : "라는"} 기준`;
  const opening = [
    `${clientLabel}에게 ${categoryLabel}은 ${scene.place}에서 가장 먼저 현실화될 가능성이 큽니다.`,
    `${categoryLabel}은 막연한 분위기보다 ${scene.place}에서 구체적인 선택으로 드러납니다.`,
    `${categoryLabel}을 실제 장면으로 좁히면 ${scene.place}를 어떻게 다루는지가 핵심입니다.`,
  ][Math.abs(Number(sectionIndex || 0)) % 3];
  const triggerSentence = [
    `${categoryLabel}에서는 ${annualTenGod ? `${annualTenGod} 세운` : "세운"}과 ${dayMasterRelation || "체감 흐름"}이 겹칠 때 ${scene.trigger}이 먼저 드러납니다.`,
    `${categoryLabel} 관점에서는 ${annualTenGod ? `${annualTenGod} 세운` : "세운"}의 압력과 ${dayMasterRelation || "체감 흐름"}이 만나 ${scene.trigger}을 현실 문제로 끌어올립니다.`,
    `${categoryLabel}의 실제 신호는 ${annualTenGod ? `${annualTenGod} 세운` : "세운"}과 ${dayMasterRelation || "체감 흐름"}이 겹치며 ${scene.trigger}으로 나타납니다.`,
  ][Math.abs(Number(sectionIndex || 0)) % 3];
  return [
    `${opening} ${triggerSentence}`,
    `${strong}에는 ${actionScenario}${newYearParticle(actionScenario, "을")} 기준으로 삼고, ${care}에는 ${cautionScenario}${newYearParticle(cautionScenario, "을")} 보호선으로 삼아야 합니다.`,
    `${relationSignal ? `${relationSignal} 흐름이 있으므로 ` : ""}${usefulText}의 보완을 넣어 ${scene.decision}이 ${categoryLabel}의 실제 처방이 됩니다. 월별로는 ${qStrong}${newYearParticle(qStrong, "은")} 실행 후보로, ${qCare}${newYearParticle(qCare, "은")} 정비 후보로 나누어 보고, 점검 기준은 ${checklistFrame}으로 남기는 편이 안정적입니다.`,
  ].join(" ");
}

function buildNewYearDomainBlockOrder(domain = "annual", categoryLabel = "", sectionIndex = 0) {
  if (/돈이 들어오는 방식|고정수익|큰 지출|계약|재물운/.test(categoryLabel)) return ["scenario", "evidence", "reality", "caution", "action", "monthly", "intro"];
  if (/마음이 흔들리는 이유|피로|건강|회복|멘탈/.test(categoryLabel)) return ["scenario", "reality", "evidence", "caution", "action", "monthly", "intro"];
  if (/갈등|멀어질|위기|위험|실수|회복 플랜/.test(categoryLabel)) return ["scenario", "caution", "evidence", "reality", "action", "monthly", "intro"];
  const orders = {
    career: ["scenario", "reality", "evidence", "action", "caution", "monthly", "intro"],
    money: ["scenario", "evidence", "reality", "caution", "action", "monthly", "intro"],
    relationship: ["scenario", "reality", "evidence", "caution", "action", "monthly", "intro"],
    love: ["scenario", "reality", "caution", "evidence", "action", "monthly", "intro"],
    health: ["scenario", "reality", "caution", "evidence", "action", "monthly", "intro"],
    quarter: ["scenario", "monthly", "evidence", "reality", "action", "caution", "intro"],
    risk: ["scenario", "caution", "evidence", "reality", "action", "monthly", "intro"],
    monthly: ["scenario", "monthly", "evidence", "reality", "caution", "action", "intro"],
    roadmap: ["scenario", "action", "evidence", "reality", "caution", "monthly", "intro"],
  };
  if (domain === "monthly") {
    return [
      ["scenario", "monthly", "evidence", "reality", "caution", "action", "intro"],
      ["monthly", "scenario", "reality", "evidence", "action", "caution", "intro"],
      ["caution", "scenario", "evidence", "monthly", "action", "reality", "intro"],
      ["action", "scenario", "monthly", "evidence", "reality", "caution", "intro"],
      ["monthly", "action", "evidence", "scenario", "caution", "reality", "intro"],
    ][Math.abs(Number(sectionIndex || 0)) % 5];
  }
  const base = orders[domain] || ["intro", "scenario", "evidence", "reality", "caution", "action", "monthly"];
  if (Number(sectionIndex || 0) % 2 === 1 && base[0] !== "scenario") return ["scenario", ...base.filter((key) => key !== "scenario")];
  return base;
}

function buildNewYearScenarioHeading(domain = "annual", categoryLabel = "") {
  if (/계약|투자|가격/.test(categoryLabel)) return "계약과 돈이 움직이는 실제 장면";
  if (/피로|건강|회복|마음/.test(categoryLabel)) return "몸과 마음이 먼저 보내는 실제 신호";
  if (/갈등|위험|위기|실수/.test(categoryLabel)) return "위험이 시작되는 실제 장면";
  if (/상반기/.test(categoryLabel)) return "상반기 월운이 펼쳐지는 실제 장면";
  if (/하반기/.test(categoryLabel)) return "하반기 월운을 거두는 실제 장면";
  if (/주의해야 할 달/.test(categoryLabel)) return "주의 달을 방어선으로 바꾸는 실제 장면";
  if (/기회를 잡기 좋은 달/.test(categoryLabel)) return "기회 달이 열리는 실제 장면";
  if (/실행표|실행·정비/.test(categoryLabel)) return "12개월 실행표가 생활로 내려오는 실제 장면";
  return ({
    career: "일과 평가가 움직이는 실제 장면",
    money: "돈이 들어오고 새는 실제 장면",
    relationship: "사람과 역할이 움직이는 실제 장면",
    love: "마음과 약속이 움직이는 실제 장면",
    health: "몸과 생활 리듬이 움직이는 실제 장면",
    quarter: "분기 흐름이 바뀌는 실제 장면",
    risk: "위험과 반전이 갈리는 실제 장면",
    monthly: "월별 달력이 움직이는 실제 장면",
    roadmap: "연간 기준이 생활로 내려오는 실제 장면",
  })[domain] || "개인 사건 시나리오";
}

function buildNewYearProfessionalSectionParagraphs(ctx = {}) {
  const {
    categoryLabel = "",
    categoryRule = {},
    consultationProfile = {},
    chapterSubject = "",
    clientLabel = "고객님",
    seed = {},
    annualLabel = "세운",
    annualFlowLabel = "세운",
    annualTenGod = "",
    dayMaster = "",
    dayMasterLabel = "",
    dayMasterRelation = "",
    categoryEvidence = "",
    categoryActions = "",
    categoryChecklist = "",
    categoryCautions = "",
    categoryOpportunity = "",
    focus = {},
    tenGodSentence = "",
    pillars = {},
    annualBranchLabel = "",
    relationFocus = "",
    geokguk = "",
    usefulText = "",
    annualQuantum = {},
    quantumSummaryForCategory = "",
    categoryAngles = {},
    strongMonths = [],
    careMonths = [],
    quantumStrongMonths = [],
    quantumCareMonths = [],
    sectionIndex = 0,
  } = ctx;
  const domain = categoryRule.domain || "annual";
  const question = buildNewYearCategoryConsultationQuestion({ categoryLabel, categoryRule, domain, index: sectionIndex });
  const strong = strongMonths.join("·") || "운이 살아나는 달";
  const care = careMonths.join("·") || "점검이 필요한 달";
  const qStrong = `${categoryLabel} 기준 ${quantumStrongMonths.join("·") || strong}`;
  const qCare = `${categoryLabel} 기준 ${quantumCareMonths.join("·") || care}`;
  const branchTrail = [
    `년지 ${formatNewYearBranchForCustomer(pillars?.year?.branch || "-")}`,
    `월지 ${formatNewYearBranchForCustomer(pillars?.month?.branch || "-")}`,
    `일지 ${formatNewYearBranchForCustomer(pillars?.day?.branch || "-")}`,
    `시지 ${formatNewYearBranchForCustomer(pillars?.hour?.branch || "-")}`,
  ].join(", ");
  const geokgukText = geokguk ? `${geokguk} 구조에서는` : "이 명식에서는";
  const scoreText = Number(annualQuantum.finalScore || 0) ? `${Number(annualQuantum.finalScore)}의 체감 강도` : "관찰 가능한 체감 강도";
  const personalScenario = buildNewYearPersonalScenario({
    categoryLabel,
    domain,
    annualTenGod,
    dayMasterRelation,
    strong,
    care,
    qStrong,
    qCare,
    relationFocus,
    usefulText,
    categoryActions,
    categoryCautions,
    categoryChecklist,
    clientLabel,
    sectionIndex,
  });
  let frame = ({
    annual: {
      intro: `${categoryLabel} 상담에서는 ${question} ${annualFlowLabel}은 일간 ${dayMasterLabel || dayMaster}에게 ${annualTenGod}의 결을 만들고, ${clientLabel}에게 ${dayMasterRelation}의 방식으로 첫 선택 기준을 보여 줍니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 명리 근거는 ${categoryEvidence}입니다. ${branchTrail}가 세운 지지 ${annualBranchLabel || "-"}와 만나는 자리에서 ${relationFocus} ${geokgukText} ${usefulText} 보완을 두어야 한 해의 첫 판단이 흔들리지 않습니다. ${quantumSummaryForCategory}`,
      reality: `${categoryLabel}의 현실 발현은 ${focus.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 올해 운을 살리는 실제 문입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 ${categoryAngles.caution} ${categoryCautions}을 먼저 지키십시오. 한 해 전체를 서둘러 단정하지 말고, 같은 신호가 반복되는지 확인해야 합니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 실행할수록 선명해집니다. 실행 후에는 ${categoryAngles.checklist} ${categoryLabel}의 성패는 큰 결심보다 매달 같은 기준을 지키는 힘에 달려 있습니다.`,
      monthly: `${categoryLabel}의 월별 기준은 ${categoryChecklist}입니다. ${qStrong}에는 움직임을 열고 ${qCare}에는 결정을 줄이십시오. ${categoryAngles.monthly}`,
    },
    career: {
      intro: `${categoryLabel} 상담의 핵심은 ${question} ${annualTenGod} 세운은 ${chapterSubject}에서 역할, 마감, 평가 증거를 요구합니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 근거는 ${categoryEvidence}입니다. 원국에서는 ${branchTrail}가 일의 기반과 반응 속도를 보여 주고, 세운 ${annualBranchLabel || "-"}와의 접점은 ${relationFocus} ${geokgukText} ${usefulText} 보완을 넣을 때 역할 과부하를 줄일 수 있습니다.`,
      reality: `${categoryLabel}은 올해 직업 현장에서 ${focus.reality}로 나타납니다. ${categoryAngles.opportunity} ${categoryOpportunity}은 성과를 밖으로 보이게 만드는 열쇠입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 책임을 넓히기보다 범위를 좁히십시오. ${categoryAngles.caution} ${categoryCautions}을 무시하면 평판보다 피로가 먼저 쌓입니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 업무 달력에 올릴 때 살아납니다. ${categoryAngles.checklist} ${categoryLabel}의 다음 평가는 보일 증거로 정리해야 합니다.`,
      monthly: `${categoryLabel}의 월별 운영은 ${categoryChecklist}입니다. ${qStrong}에는 제안, 발표, 협상을 앞에 두고 ${qCare}에는 역할 경계와 문서를 다듬으십시오. ${categoryAngles.monthly}`,
    },
    money: {
      intro: `${categoryLabel} 상담에서는 ${question} ${annualTenGod} 세운은 돈의 흐름에서 수입, 지출, 계약 조건을 현실적으로 맞추라고 말합니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 재물 근거는 ${categoryEvidence}입니다. ${branchTrail}와 세운 ${annualBranchLabel || "-"}의 만남은 ${relationFocus} ${geokgukText} ${usefulText} 흐름을 보완할수록 돈의 누수를 줄입니다. 정밀 보정은 ${scoreText}로 보십시오.`,
      reality: `${categoryLabel}은 올해 ${focus.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 돈이 들어오는 문을 현실 행동으로 바꾸는 기준입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 먼저 쓰고 나중에 맞추는 선택을 피해야 합니다. ${categoryAngles.caution} ${categoryCautions}을 지키면 손실의 폭이 작아집니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 숫자로 적어야 성과가 납니다. ${categoryAngles.checklist} ${categoryLabel}에서는 수입과 지출을 같은 장부 안에서 보십시오.`,
      monthly: `${categoryLabel}의 월별 돈 관리는 ${categoryChecklist}입니다. ${qStrong}에는 수익 제안과 가격 결정을 진행하고 ${qCare}에는 계약 문구와 고정비를 다시 보십시오. ${categoryAngles.monthly}`,
    },
    relationship: {
      intro: `${categoryLabel} 상담의 출발점은 ${question} ${annualTenGod} 세운은 사람 사이에서 역할, 호의, 책임의 균형을 묻습니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 인연 근거는 ${categoryEvidence}입니다. ${branchTrail}가 보여 주는 관계 습관 위에 세운 ${annualBranchLabel || "-"}가 들어오며 ${relationFocus} ${geokgukText} ${usefulText} 보완이 들어가야 관계의 온도가 안정됩니다.`,
      reality: `${categoryLabel}은 현실에서 ${focus.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 사람을 넓히되 역할을 흐리지 않는 기준입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 서운함을 결론으로 만들지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 오해가 관계 전체로 번지는 일을 막을 수 있습니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 먼저 말로 맞출 때 좋아집니다. ${categoryAngles.checklist} ${categoryLabel}에서는 도움과 책임의 경계를 남겨 두십시오.`,
      monthly: `${categoryLabel}의 월별 관계 운용은 ${categoryChecklist}입니다. ${qStrong}에는 만남과 제안을 열고 ${qCare}에는 거리와 기대치를 조율하십시오. ${categoryAngles.monthly}`,
    },
    love: {
      intro: `${categoryLabel} 상담의 중심 질문은 ${question} ${annualTenGod} 세운은 감정의 크기보다 약속의 무게와 생활 조건을 보게 합니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 애정 근거는 ${categoryEvidence}입니다. 원국의 ${branchTrail}와 세운 ${annualBranchLabel || "-"}가 만나 ${relationFocus} ${geokgukText} ${usefulText} 보완을 두면 감정의 과열을 줄이고 관계의 약속을 현실화할 수 있습니다.`,
      reality: `${categoryLabel}은 올해 ${focus.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 사랑을 막연한 기대가 아니라 생활 가능한 관계로 만드는 문입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 외로움이나 불안으로 관계 결론을 서두르지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 먼저 지키면 감정의 파도가 약속을 흔드는 일을 줄입니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 부드럽게 꺼낼 때 흐름이 열립니다. ${categoryAngles.checklist} ${categoryLabel}에서는 말보다 반복되는 행동을 확인하십시오.`,
      monthly: `${categoryLabel}의 월별 애정 리듬은 ${categoryChecklist}입니다. ${qStrong}에는 표현과 약속을 열고 ${qCare}에는 결론보다 대화의 온도를 다루십시오. ${categoryAngles.monthly}`,
    },
    health: {
      intro: `${categoryLabel} 상담에서는 ${question} ${annualTenGod} 세운은 몸과 마음에서 버티는 힘보다 회복 기준을 세우라고 말합니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 건강 근거는 ${categoryEvidence}입니다. ${branchTrail}는 생활 리듬의 반복을 보여 주고, 세운 ${annualBranchLabel || "-"}와의 접점은 ${relationFocus} ${geokgukText} ${usefulText} 보완을 넣어야 피로가 한꺼번에 올라오지 않습니다.`,
      reality: `${categoryLabel}은 올해 ${focus.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 몸의 신호를 생활 처방으로 바꾸는 기준입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 정신력으로 밀어붙이는 태도를 내려놓으십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 피로와 감정 기복의 폭이 줄어듭니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 작게 고정할수록 회복력이 살아납니다. ${categoryAngles.checklist} ${categoryLabel}에서는 수면, 식사, 긴장, 호흡의 변화를 기록하십시오.`,
      monthly: `${categoryLabel}의 월별 회복 기준은 ${categoryChecklist}입니다. ${qStrong}에는 생활 리듬을 세우고 ${qCare}에는 일정을 줄여 몸의 여백을 만드십시오. ${categoryAngles.monthly}`,
    },
    quarter: {
      intro: `${categoryLabel} 상담의 핵심은 ${question} ${annualTenGod} 세운은 이 시기를 열 일, 검증할 일, 회수할 일로 나누라고 말합니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 시기 근거는 ${categoryEvidence}입니다. 세운 ${annualLabel}, 월운 강약, 원국의 ${branchTrail}가 맞물리며 ${relationFocus} ${geokgukText} ${usefulText} 보완이 있을 때 결정의 순서가 정리됩니다.`,
      reality: `${categoryLabel}은 올해 ${focus.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 분기의 문을 실제 일정으로 바꾸는 기준입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 모든 결정을 한 번에 확정하지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 준비와 회수가 서로 어긋나지 않습니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 배치할 때 성과가 납니다. ${categoryAngles.checklist} ${categoryLabel}에서는 다음 분기로 넘길 것과 끝낼 것을 나누십시오.`,
      monthly: `${categoryLabel}의 월별 기준은 ${categoryChecklist}입니다. ${qStrong}에는 열고 ${qCare}에는 닫아야 하며, ${categoryAngles.monthly}`,
    },
    risk: {
      intro: `${categoryLabel} 상담에서는 ${question} ${annualTenGod} 세운은 위기를 키우기 전에 작은 신호를 멈춰 세우라고 말합니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 위험 근거는 ${categoryEvidence}입니다. ${branchTrail}와 세운 ${annualBranchLabel || "-"}의 만남은 ${relationFocus} ${geokgukText} ${usefulText} 보완을 넣어야 사건이 커지기 전 구조가 바뀝니다.`,
      reality: `${categoryLabel}은 올해 ${focus.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 위험을 반전의 재료로 쓰는 문입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 증명하려고 더 밀어붙이는 선택을 피하십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 손실이 작을 때 방향을 바꿀 수 있습니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 실행하면 회복의 단서가 생깁니다. ${categoryAngles.checklist} ${categoryLabel}에서는 반복되는 실수의 첫 신호를 따로 표시하십시오.`,
      monthly: `${categoryLabel}의 월별 위험 관리는 ${categoryChecklist}입니다. ${qStrong}에는 회복 행동을 열고 ${qCare}에는 방어선을 좁히십시오. ${categoryAngles.monthly}`,
    },
    monthly: {
      intro: `${categoryLabel} 상담의 첫 질문은 ${question} ${annualTenGod} 세운은 달마다 실행, 관망, 정비의 무게를 다르게 두라고 말합니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 월운 근거는 ${categoryEvidence}입니다. ${annualLabel} 세운과 원국 ${branchTrail}의 접점에서 ${relationFocus} ${geokgukText} ${usefulText} 보완이 들어가면 달별 선택이 더 안정됩니다.`,
      reality: `${categoryLabel}은 올해 ${focus.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 달력을 실제 운용표로 바꾸는 기준입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 좋은 달과 약한 달을 한 가지 분위기로 뭉뚱그리지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 월별 흐름이 선명해집니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 실제 일정에 올려야 합니다. ${categoryAngles.checklist} ${categoryLabel}에서는 다음 달로 미룰 일은 과감히 남기십시오.`,
      monthly: `${categoryLabel}의 월별 지도는 ${categoryChecklist}입니다. ${qStrong}에는 실행을 열고 ${qCare}에는 정비를 먼저 두십시오. ${categoryAngles.monthly}`,
    },
    roadmap: {
      intro: `${categoryLabel} 상담에서는 ${question} ${annualTenGod} 세운은 올해의 운을 말이 아니라 반복 가능한 생활 기준으로 남기라고 말합니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 로드맵 근거는 ${categoryEvidence}입니다. ${annualLabel} 세운, ${dayMasterLabel || dayMaster} 일간, 원국 ${branchTrail}의 반응을 함께 보며 ${geokgukText} ${usefulText} 보완을 넣으면 한 해의 기준이 흔들리지 않습니다.`,
      reality: `${categoryLabel}은 올해 ${focus.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 마지막 조언을 실제 습관으로 바꾸는 문입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 새 목표를 더하기보다 먼저 비울 것을 정하십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 좋은 운이 머물 자리가 생깁니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 반복할수록 힘이 쌓입니다. ${categoryAngles.checklist} ${categoryLabel}에서는 유지할 기준과 내려놓을 기준을 분명히 하십시오.`,
      monthly: `${categoryLabel}의 월별 루틴은 ${categoryChecklist}입니다. ${qStrong}에는 밀어붙일 일을 실행하고 ${qCare}에는 내려놓을 것을 정리하십시오. ${categoryAngles.monthly}`,
    },
  })[domain];
  if (domain === "annual" && /핵심 기준/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 좋은 말을 모으는 절이 아니라 중요한 결정을 하기 전 반드시 통과시킬 확인문을 정하는 절입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 근거는 ${categoryEvidence}입니다. ${annualLabel} 세운, ${dayMasterLabel || dayMaster} 일간, ${relationFocus} ${geokgukText} ${usefulText} 보완을 함께 보면 기준은 감정이 흔들리는 순간에도 남아 있어야 합니다.`,
      reality: `${categoryLabel}은 계약 전, 관계 약속 전, 큰 지출 전, 몸이 지친 날의 선택 앞에서 드러납니다. ${categoryAngles.opportunity} 좋은 달과 약한 달 모두에 통하는 기준은 운을 크게 믿는 태도보다 확인하고 기록하는 태도에서 살아납니다.`,
      caution: `${categoryLabel}에서 ${care}에는 운이 좋아 보이는 순간에도 검증을 생략하지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 기회가 들어올 때도 손실의 문을 함께 열지 않습니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 한 문장으로 적어 둘 때 힘이 생깁니다. ${categoryAngles.checklist} ${categoryLabel}에서는 돈, 관계, 일, 건강마다 멈춤 기준을 하나씩 적으십시오.`,
      monthly: `${categoryLabel}의 월별 운영은 ${categoryChecklist}입니다. ${qStrong}에는 확인문을 실행에 붙이고 ${qCare}에는 결정을 늦추며 기록을 먼저 남기십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "monthly" && /기회를 잡기 좋은 달/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 월운 순위를 확인하는 절이 아니라 제안, 발표, 계약, 만남 중 무엇을 밖으로 낼지 고르는 절입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 근거는 ${categoryEvidence}입니다. ${annualLabel} 세운과 ${branchTrail}의 반응, ${relationFocus} ${geokgukText} ${usefulText} 보완을 함께 놓고 보면 성과를 여는 달은 막연한 행운보다 준비한 행동을 공개하는 시점으로 읽어야 합니다.`,
      reality: `${categoryLabel}은 일정표에서 발표일, 제안 발송일, 계약 검토일, 만남 약속으로 드러납니다. ${categoryAngles.opportunity} ${categoryOpportunity}은 마음이 들뜨는 순간이 아니라 결과물을 사람 앞에 놓는 선택입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 기회가 보인다는 이유로 여러 일을 동시에 열지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 좋은 달의 힘이 과속으로 새지 않고 하나의 성과로 모입니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 날짜와 대상까지 정할 때 살아납니다. ${categoryAngles.checklist} ${categoryLabel}에서는 누구에게 무엇을 보여 줄지, 어떤 조건에서 멈출지, 다음 확인일을 언제로 둘지까지 적어 두십시오.`,
      monthly: `${categoryLabel}의 월별 처방은 ${categoryChecklist}입니다. ${qStrong}에는 결과물 공개와 제안을 앞세우고, ${qCare}에는 보류한 조건과 후속 연락을 정비하십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "money" && /돈이 들어오는 방식/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}에서는 올해 돈이 어디에서 생기고 어느 순간 새는지를 먼저 구분해야 합니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 재물 근거는 ${categoryEvidence}입니다. ${categoryLabel}에서는 세운 ${annualLabel}, 월운 강약, 재성의 통로, 식상의 생산성을 함께 놓고 보며 ${relationFocus} ${categoryLabel}의 ${usefulText} 보완은 수입 통로를 안정시키는 쪽으로 씁니다.`,
      reality: `${categoryLabel}은 고정 수입, 변동 수입, 제안성 수익을 나누어 볼 때 정확해집니다. ${categoryAngles.opportunity} ${categoryOpportunity}은 들어오는 돈을 실제 구조로 만드는 문입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 아직 들어오지 않은 돈을 먼저 쓰지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 수입 기대가 지출 압력으로 바뀌는 일을 막을 수 있습니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 수입 경로별로 기록해야 살아납니다. ${categoryAngles.checklist} ${categoryLabel}에서는 고정, 변동, 일회성 수입을 따로 관리하십시오.`,
      monthly: `${categoryLabel}의 월별 관리는 ${categoryChecklist}입니다. ${qStrong}에는 제안과 판매 흐름을 열고 ${qCare}에는 받을 돈과 나갈 돈의 날짜를 다시 확인하십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "money" && /습관/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 큰돈의 한 번보다 매달 반복되는 작은 선택에서 재물운을 살립니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 재물 근거는 ${categoryEvidence}입니다. ${categoryLabel}에서는 세운, 월운, 십성, 오행을 지출 패턴과 용신 보완으로 내려 보아야 하며 ${relationFocus} ${usefulText} 흐름은 예산과 회고 루틴을 안정시키는 데 씁니다.`,
      reality: `${categoryLabel}은 통장에 남는 돈, 새는 비용, 반복되는 소비 감정에서 드러납니다. ${categoryAngles.opportunity} ${categoryOpportunity}은 돈이 모이는 생활 리듬을 만드는 문입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 좋은 수입이 생겨도 생활비, 고정비, 충동 지출을 방치하지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 운의 누수가 줄어듭니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 월초와 월말에 고정할 때 힘을 얻습니다. ${categoryAngles.checklist} ${categoryLabel}에서는 수입보다 먼저 남는 구조를 확인하십시오.`,
      monthly: `${categoryLabel}의 월별 습관은 ${categoryChecklist}입니다. ${qStrong}에는 저축, 정산, 수익 정리를 앞에 두고 ${qCare}에는 새는 비용과 미뤄 둔 결제를 정리하십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "quarter") {
    const quarterProfile = /1분기/.test(categoryLabel)
      ? {
        theme: "초반 기준 정리와 불필요한 약속 정돈",
        evidence: "초반 월운, 기반 정리, 세운의 첫 체감",
        reality: "시작보다 정돈이 먼저인 시기입니다. 새 계획을 많이 세우기보다 올해 지킬 기준과 버릴 습관을 가르는 일이 중요합니다.",
        caution: "새해의 기세만 믿고 약속과 목표를 동시에 늘리는 흐름",
        action: "올해 기준표, 금지 행동, 우선순위 세 가지를 먼저 적기",
        monthly: "1월부터 3월까지는 준비와 정리의 밀도를 높이는 방식",
      }
      : /2분기/.test(categoryLabel)
        ? {
          theme: "검증된 계획을 밖으로 꺼내는 확장",
          evidence: "확장운, 성과 신호, 사람과 일의 반응",
          reality: "준비해 둔 일이 밖으로 나가며 반응을 얻는 시기입니다. 다만 넓히기 전에 작게 검증한 증거가 있어야 확장이 안정됩니다.",
          caution: "성과 조짐만 보고 비용과 책임을 먼저 키우는 흐름",
          action: "제안, 발표, 협상, 출시 중 하나를 정해 검증 결과를 만들기",
          monthly: "4월부터 6월까지는 실행과 피드백을 짧게 반복하는 방식",
        }
        : /3분기/.test(categoryLabel)
          ? {
            theme: "쌓인 성과의 회수와 관계 피로 조율",
            evidence: "3분기 월운, 성과 회수, 관계 조율, 신뢰 잔고",
            reality: "앞서 펼친 일의 결과를 거두고 사람 사이의 피로를 다듬는 시기입니다. 더 벌리기보다 회수할 성과와 조율할 관계를 나누어야 합니다.",
            caution: "성과가 보인다는 이유로 관계 피로와 비용 누수를 방치하는 흐름",
            action: "수익, 신뢰, 결과물 중 회수할 항목을 정하고 갈등은 대화로 정리하기",
            monthly: "7월부터 9월까지는 회수, 조율, 재배치의 순서를 분명히 하는 방식",
          }
          : /4분기/.test(categoryLabel)
            ? {
              theme: "한 해의 결실 정리와 다음 문을 위한 재설계",
              evidence: "4분기 월운, 마무리, 다음 해 준비, 남길 기준",
              reality: "끝낼 일과 이어갈 일을 구분하며 다음 해의 공간을 만드는 시기입니다. 결실을 붙잡기보다 정리한 뒤 남길 구조를 선명하게 해야 합니다.",
              caution: "끝내야 할 일을 미루어 다음 해의 부담으로 넘기는 흐름",
              action: "돈, 관계, 건강, 일정의 손익을 정리하고 다음 해로 넘길 기준만 남기기",
              monthly: "10월부터 12월까지는 마감, 정산, 재설계의 순서로 움직이는 방식",
            }
            : {
              theme: "큰 결정을 확정할 달과 보류할 달의 분리",
              evidence: "월운 상위 달, 월운 하위 달, 실행과 정비의 신호",
              reality: "중요한 결정은 감정의 압박이 아니라 시기와 준비 상태를 함께 보아야 정확해집니다.",
              caution: "체면 때문에 약한 달에 큰 결정을 확정하는 흐름",
              action: "결정 후보를 월별 흐름에 다시 배치하고 보류할 달을 표시하기",
              monthly: "기회 달에는 확정하고 정비 달에는 검토하는 방식",
            };
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 ${quarterProfile.theme}을 살피는 자리입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 시기 근거는 ${quarterProfile.evidence}입니다. ${categoryLabel}에서는 분기별 월운, 세운 십성, 오행 균형을 ${categoryEvidence} 근거로 읽습니다. ${relationFocus} ${categoryLabel}의 ${usefulText} 보완은 이 시기의 선택 순서를 안정시키는 기준입니다.`,
      reality: `${categoryLabel}은 ${quarterProfile.reality} ${categoryAngles.opportunity} ${categoryOpportunity}은 이 흐름을 실제 일정으로 옮기는 문입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 ${quarterProfile.caution}을 조심하십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 시기의 어긋남이 줄어듭니다.`,
      action: `${categoryLabel}은 ${strong}에 ${quarterProfile.action}가 필요합니다. ${categoryActions}을 함께 적용하고 ${categoryAngles.checklist}`,
      monthly: `${categoryLabel}의 월별 기준은 ${quarterProfile.monthly}입니다. ${qStrong}에는 실행을 열고 ${qCare}에는 정비와 마감을 앞에 두십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "health" && /마음이 흔들리는 이유/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 마음의 문제가 아니라 운의 압력, 사람의 말, 돈의 긴장, 몸의 피로가 한곳에 몰리는 지점을 읽는 항목입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 심리 근거는 ${categoryEvidence}입니다. ${categoryLabel}에서는 인성의 안정감, 비겁의 비교심, 충·해의 흔들림을 세운과 월운의 압력 안에서 함께 살핍니다. ${relationFocus} ${categoryLabel}의 ${usefulText} 보완은 감정의 파도를 낮추는 방향으로 씁니다.`,
      reality: `${categoryLabel}은 올해 생각이 많아지는 밤, 말 한마디에 오래 흔들리는 순간, 몸은 쉬지 못하는데 마음만 앞서는 장면에서 드러납니다. ${categoryAngles.opportunity} 감정 원인을 사람·돈·일정·몸으로 나누면 상담이 훨씬 정확해집니다.`,
      caution: `${categoryLabel}에서 ${care}에는 감정의 파도를 올해 전체 판단으로 확대하지 마십시오. ${categoryAngles.caution} 불안이 올라온 날에는 결론보다 기록, 대화보다 호흡, 확정보다 하루 유예가 먼저입니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 작게 실행할 때 안정됩니다. ${categoryAngles.checklist} ${categoryLabel}에서는 감정이 올라온 시간, 만난 사람, 몸의 피로도를 같이 적으십시오.`,
      monthly: `${categoryLabel}의 월별 심리 리듬은 ${categoryChecklist}입니다. ${qStrong}에는 대화와 표현을 열고 ${qCare}에는 판단을 늦추며 수면과 호흡을 회복하십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "health" && /회복력을 높이는 생활 리듬/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 아픈 곳을 단정하는 절이 아니라 잠, 식사, 움직임, 휴식 시간을 운의 바닥으로 고정하는 절입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 회복 근거는 ${categoryEvidence}입니다. ${categoryLabel}에서는 용신과 희신의 보완, 월운 회복 구간, 원국 오행의 과열을 생활표 안에서 함께 봅니다. ${relationFocus} ${usefulText} 보완은 무리한 의지보다 회복 시간을 먼저 확보할 때 안정됩니다.`,
      reality: `${categoryLabel}은 올해 아침 기상 시간, 식사 간격, 걷는 양, 잠들기 전 긴장도에서 드러납니다. ${categoryAngles.opportunity} 회복 루틴으로 운의 바닥을 단단히 만든다는 것은 좋은 흐름에서도 쉬는 시간을 포기하지 않는다는 뜻입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 성과가 보인다고 회복 시간을 먼저 줄이지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 몸의 여유가 다시 판단력과 관계의 안정으로 돌아옵니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 하루 시간표에 고정할 때 힘이 납니다. ${categoryAngles.checklist} ${categoryLabel}에서는 잠, 식사, 움직임, 멈춤 시간을 네 칸으로 나누어 적으십시오.`,
      monthly: `${categoryLabel}의 월별 회복 처방은 ${categoryChecklist}입니다. ${qStrong}에는 루틴을 넓히고 ${qCare}에는 약속 수와 이동량을 줄이십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "health" && /관리 원칙/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 예언처럼 단정하는 장이 아니라 올해 몸과 마음을 지키는 운영 원칙입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 관리 근거는 ${categoryEvidence}입니다. ${categoryLabel}에서는 생활 루틴, 기신 과열, 월운 하락 구간을 오행 균형과 함께 봅니다. ${categoryLabel}의 ${usefulText} 보완은 수면, 식사, 움직임, 점검의 순서로 내려야 안정됩니다.`,
      reality: `${categoryLabel}은 올해 컨디션을 잃기 전에 작은 신호를 붙잡는 힘입니다. ${categoryAngles.opportunity} 몸과 마음을 같은 기준으로 관리한다는 것은 무조건 참는 것이 아니라 쉬어야 할 때를 정확히 정하는 일입니다.`,
      caution: `${categoryLabel}에서 ${care}에는 상담문을 진단처럼 받아들이거나 정신력으로 버티려 하지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키고 반복되는 불편은 현실 점검과 전문가 확인으로 이어야 합니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 생활표에 고정할 때 힘이 납니다. ${categoryAngles.checklist} ${categoryLabel}에서는 잠, 식사, 걷기, 기록, 점검의 다섯 칸을 매달 확인하십시오.`,
      monthly: `${categoryLabel}의 월별 관리 기준은 ${categoryChecklist}입니다. ${qStrong}에는 루틴을 세우고 ${qCare}에는 일정을 줄이며 회복 시간을 먼저 확보하십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "love" && /가족과 가까운 사람/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 사랑의 감정보다 생활 안에서 감당해야 할 책임과 돌봄의 순서를 읽는 항목입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 관계 근거는 ${categoryEvidence}입니다. ${categoryLabel}에서는 가족 책임, 인성의 보호성, 관성의 의무를 세운의 역할 변화와 함께 읽습니다. ${relationFocus} ${categoryLabel}의 ${usefulText} 보완은 부담을 말로 나누는 방향으로 씁니다.`,
      reality: `${categoryLabel}은 가까운 사람을 챙기면서도 자신의 생활 리듬을 잃지 않는지가 핵심입니다. ${categoryAngles.opportunity} 가족과 가까운 사람의 책임은 한 사람이 모두 떠안는 일이 아니라 역할을 나누는 데서 안정됩니다.`,
      caution: `${categoryLabel}에서 ${care}에는 미안함만으로 책임을 떠안지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 애정과 의무가 서로를 소모시키지 않습니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 대화로 정리할 때 좋아집니다. ${categoryAngles.checklist} ${categoryLabel}에서는 부탁, 돌봄, 비용, 시간을 따로 적으십시오.`,
      monthly: `${categoryLabel}의 월별 기준은 ${categoryChecklist}입니다. ${qStrong}에는 가족 대화와 역할 조율을 열고 ${qCare}에는 감정적 약속을 늦추십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "love" && /감정 기복/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 사랑이 약해서가 아니라 감정의 파도가 빠르게 올라오는 지점을 읽는 항목입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 감정 근거는 ${categoryEvidence}입니다. ${categoryLabel}에서는 심리 리듬, 충·해의 흔들림, 일지의 반응을 월별 관계 온도와 함께 읽습니다. ${relationFocus} ${categoryLabel}의 ${usefulText} 보완은 말의 온도를 낮추는 방향으로 씁니다.`,
      reality: `${categoryLabel}은 서운함, 확인 욕구, 침묵, 갑작스러운 거리감으로 드러납니다. ${categoryAngles.opportunity} 감정의 파도를 관계의 기준으로 다듬으면 사랑을 시험하지 않고도 마음을 확인할 수 있습니다.`,
      caution: `${categoryLabel}에서 ${care}에는 감정을 증명하듯 표현하지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 말의 상처가 오래 남는 일을 줄입니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 작게 연습해야 안정됩니다. ${categoryAngles.checklist} ${categoryLabel}에서는 감정이 큰 날 결론보다 기록과 휴식을 먼저 두십시오.`,
      monthly: `${categoryLabel}의 월별 감정 리듬은 ${categoryChecklist}입니다. ${qStrong}에는 표현을 열고 ${qCare}에는 거리 조절과 회복 시간을 먼저 확보하십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "relationship" && /멀어질 관계|갈등/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 인연이 나쁘다는 뜻이 아니라 관계의 거리와 역할을 다시 정하라는 신호입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 관계 근거는 ${categoryEvidence}입니다. ${categoryLabel}에서는 충·해·파의 균열, 반복 오해, 거리 조절 기준을 월운의 압력과 함께 읽습니다. ${relationFocus} ${categoryLabel}의 ${usefulText} 보완은 말을 줄이고 조건을 분명히 하는 방향으로 씁니다.`,
      reality: `${categoryLabel}은 연락의 온도, 돈과 역할의 부담, 반복되는 말의 상처에서 드러납니다. ${categoryAngles.opportunity} 멀어질 관계는 끊어내기보다 먼저 거리와 빈도를 조절할 때 손실이 작아집니다.`,
      caution: `${categoryLabel}에서 ${care}에는 감정이 올라온 순간 관계 결론을 내리지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 갈등이 전체 관계를 삼키지 않습니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 조용히 실행할 때 정리됩니다. ${categoryAngles.checklist} ${categoryLabel}에서는 대화할 사람, 거리를 둘 사람, 기다릴 사람을 나누십시오.`,
      monthly: `${categoryLabel}의 월별 관계 정리는 ${categoryChecklist}입니다. ${qStrong}에는 필요한 대화를 하고 ${qCare}에는 해명보다 침착한 거리 조절을 우선하십시오. ${categoryAngles.monthly}`,
    };
  }
  if (domain === "relationship" && /넓히는 전략/.test(categoryLabel)) {
    frame = {
      intro: `${categoryLabel} 상담에서는 ${question} ${categoryLabel}은 사람을 많이 만나는 문제가 아니라 어떤 자리에서 어떤 제안을 열 것인가를 보는 항목입니다. ${tenGodSentence}`,
      evidence: `${categoryLabel}의 확장 근거는 ${categoryEvidence}입니다. ${categoryLabel}에서는 귀인, 합의 연결, 식상의 표현력을 세운의 외부 접점과 함께 읽습니다. ${relationFocus} ${categoryLabel}의 ${usefulText} 보완은 열린 인연을 실제 협업으로 묶는 데 필요합니다.`,
      reality: `${categoryLabel}은 소개, 모임, 제안, 협업의 자리에서 드러납니다. ${categoryAngles.opportunity} 관계 확장은 넓히는 속도보다 목적과 경계를 함께 세울 때 오래 갑니다.`,
      caution: `${categoryLabel}에서 ${care}에는 모든 사람에게 같은 깊이로 마음을 열지 마십시오. ${categoryAngles.caution} ${categoryCautions}을 지키면 넓어지는 관계 속에서도 핵심 인연을 놓치지 않습니다.`,
      action: `${categoryLabel}은 ${strong}에 ${categoryActions}을 먼저 일정에 올릴 때 살아납니다. ${categoryAngles.checklist} ${categoryLabel}에서는 소개, 제안, 협업, 유지할 관계를 따로 표시하십시오.`,
      monthly: `${categoryLabel}의 월별 확장 기준은 ${categoryChecklist}입니다. ${qStrong}에는 모임과 제안을 열고 ${qCare}에는 새 인연보다 기존 신뢰를 정비하십시오. ${categoryAngles.monthly}`,
    };
  }
  if (!frame) return buildNewYearProfessionalSectionParagraphs({ ...ctx, categoryRule: { ...categoryRule, domain: "annual" } });
  const escapeRegExp = (value = "") => clean(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const contextualize = (value = "") => clean(value)
    .replace(new RegExp(`${escapeRegExp(annualTenGod)}\\s+세운은`, "g"), `${categoryLabel}에서 ${annualTenGod} 세운은`)
    .replace(new RegExp(`${escapeRegExp(annualLabel)}\\s+세운은`, "g"), `${categoryLabel}에서 ${annualLabel} 세운은`)
    .replace(/(^|[.!?]\s*)년지/g, `$1${categoryLabel}에서 년지`)
    .replace(/(^|[.!?]\s*)원국의 년지/g, `$1${categoryLabel}에서 원국의 년지`)
    .replace(/(^|[.!?]\s*)세운 丁未/g, `$1${categoryLabel}에서 세운 丁未`)
    .replace(/(^|[.!?]\s*)丁未/g, `$1${categoryLabel}에서 丁未`)
    .replace(/원국에서는/g, `${categoryLabel}의 원국에서는`)
    .replace(/건록격 구조에서는/g, `${categoryLabel}의 건록격 구조에서는`)
    .replace(/이 명식에서는/g, `${categoryLabel}의 명식에서는`)
    .replace(/정밀 보정은/g, `${categoryLabel}의 정밀 보정은`)
    .replace(/한 해 전체를/g, `${categoryLabel}에서는 한 해 전체를`)
    .replace(/7월·8월에는/g, `${categoryLabel} 항목은 7월·8월에는`)
    .replace(/실행 후에는/g, `${categoryLabel}의 실행 뒤에는`)
    .replace(/결과 후에는/g, `${categoryLabel}의 결과 뒤에는`);
  return {
    intro: contextualize(frame.intro),
    scenario: contextualize(personalScenario),
    evidence: contextualize(`${frame.evidence} ${buildNewYearEvidenceSentence(categoryLabel, domain, categoryEvidence)}`),
    reality: contextualize(frame.reality),
    caution: contextualize(frame.caution),
    action: contextualize(frame.action),
    monthly: contextualize(frame.monthly),
  };
}

function buildSajuNewYearChapterSpecs(targetYear) {
  const year = toInt(targetYear, resolveDefaultTargetYear());
  const plan = normalizeChapterPlan(NEW_YEAR_CHAPTERS, { targetYear: year });
  return plan.chapters.map(toLegacyChapterSpec);
}

function buildSajuNewYearChapterConfig(targetYear) {
  const year = toInt(targetYear, resolveDefaultTargetYear());
  const plan = normalizeChapterPlan(NEW_YEAR_CHAPTERS, { targetYear: year });
  return {
    ...plan,
    chapters: plan.chapters.map(toLegacyChapterSpec),
  };
}

function clean(value) {
  return String(value || "").trim();
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function pad2(value) {
  return String(toInt(value, 0)).padStart(2, "0");
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeFeatureKey(raw) {
  const value = clean(raw);
  if (!value) return FEATURE_KEY;
  if (value === FEATURE_KEY || FEATURE_ALIASES.has(value)) return FEATURE_KEY;
  return value;
}

function normalizeNewYearBookError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      code: clean(error.code || ""),
      status: Number(error.status || 0) || undefined,
      stage: clean(error.stage || ""),
      message: error.message,
      causeMessage: clean(error.cause?.message || error.cause || ""),
      stack: error.stack,
    };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch (_) {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function stripForbiddenText(value) {
  return clean(value)
    .replace(/```[a-z]*|```/gi, "")
    .replace(FORBIDDEN_TEXT_RE, "")
    .replace(NEW_YEAR_LOCAL_FORBIDDEN_RE, "")
    .replace(/\s{3,}/g, " ")
    .trim();
}

function yearlySentenceSeed(seed = {}, extra = "") {
  return [
    seed?.targetYear,
    seed?.birthProfile?.birthDate,
    seed?.birthProfile?.birthTime,
    seed?.saju?.annualLuck?.label,
    extra,
  ].map(clean).filter(Boolean).join("|");
}

function stableYearlyHash(value) {
  const text = clean(value);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function rotateYearlyLines(lines = [], seed = {}, extra = "") {
  const cleaned = lines.map((line) => clean(line)).filter(Boolean);
  if (cleaned.length <= 1) return cleaned;
  const offset = stableYearlyHash(yearlySentenceSeed(seed, extra)) % cleaned.length;
  return cleaned.slice(offset).concat(cleaned.slice(0, offset));
}

function assembleYearlyLocalLines(lines = [], seed = {}, extra = "") {
  const seen = new Set();
  const softened = rotateYearlyLines(lines, seed, extra)
    .map((line) => softenAnnualFortuneRiskText(line, seed?.targetYear))
    .filter(Boolean);
  return softened.filter((line) => {
    const key = line.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cloneNewYearValue(value) {
  if (!value || typeof value !== "object") return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function compactNewYearObject(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => compactNewYearObject(item))
      .filter((item) => item !== undefined && item !== "");
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = compactNewYearObject(item);
      if (normalized === undefined || normalized === "") continue;
      if (Array.isArray(normalized) && normalized.length === 0) continue;
      if (normalized && typeof normalized === "object" && !Array.isArray(normalized) && Object.keys(normalized).length === 0) continue;
      out[key] = normalized;
    }
    return out;
  }
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return clean(value) || undefined;
  return value;
}

function readBooleanFlag(env = {}, key, fallback = false) {
  const raw = env?.[key];
  if (raw === undefined || raw === null || raw === "") return fallback;
  if (typeof raw === "boolean") return raw;
  return /^(1|true|yes|on)$/i.test(clean(raw));
}

function stableNewYearStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableNewYearStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableNewYearStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function hashAnnualFortuneValue(value) {
  const input = stableNewYearStringify(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(36)}${(h1 >>> 0).toString(36)}`;
}

function buildYearlySajuPdfCacheKey(normalized = {}) {
  const seed = normalized.seed || {};
  const targetYear = Number(normalized.targetYear || seed.targetYear || 0) || 0;
  const profile = normalized.profile || seed.birthProfile || {};
  const natalCalculation = normalized.natalCalculation || seed.saju || {};
  const annualCalculation = normalized.yearlyCalculation || seed.saju?.annualLuck || {};
  const monthlyCalculation = normalized.monthlyCalculation || seed.saju?.monthlyLuck || [];
  const chapterPlan = normalizeChapterPlan(normalized.expectedChapters || seed.chapterSpecs || NEW_YEAR_CHAPTERS, { targetYear });
  const chapterConfigVersion = clean(normalized.chapterConfigVersion || chapterPlan.chapterConfigVersion);
  return `saju-new-year-llm-cache:${hashAnnualFortuneValue({
    service: "new-year",
    version: NEW_YEAR_LLM_VERSION,
    source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
    schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
    qualityVersion: SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
    engineVersion: SAJU_NEW_YEAR_LLM_ENGINE_VERSION,
    generationMode: SAJU_NEW_YEAR_LLM_GENERATION_MODE,
    chapterConfigVersion,
    targetYear,
    birthDataHash: hashAnnualFortuneValue(profile),
    sajuChartHash: hashAnnualFortuneValue(natalCalculation),
    luckCyclesHash: hashAnnualFortuneValue(seed.saju?.luckCycle || normalized.luckCycles || {}),
    annualLuckHash: hashAnnualFortuneValue(annualCalculation),
    monthlyLuckHash: hashAnnualFortuneValue(monthlyCalculation),
    questionHash: hashAnnualFortuneValue(normalized.question || ""),
  })}`;
}

function buildYearlySajuPdfCacheExecutionContext(baseCtx = {}, cacheKey = "") {
  const executionKey = clean(cacheKey, 120);
  if (!executionKey) return baseCtx;
  return {
    ...baseCtx,
    executionKey,
    idempotencyKey: executionKey,
    metadata: {
      ...(baseCtx.metadata || {}),
      cacheKind: "saju-new-year-llm-pdf",
      cacheKey: executionKey,
      templateVersion: YEARLY_SAJU_PDF_CONFIG.templateVersion,
      promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
      schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
      manuscriptSource: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    },
  };
}

function interpretationBlock({ id, tags = [], weight = 1, title, summary, body = [], advice = [], caution = [], checklist = [] }) {
  return Object.freeze({
    id: clean(id),
    tags: tags.map((tag) => clean(tag)).filter(Boolean),
    weight: Number(weight) || 1,
    title: clean(title),
    summary: clean(summary),
    body: body.map((line) => clean(line)).filter(Boolean),
    advice: advice.map((line) => clean(line)).filter(Boolean),
    caution: caution.map((line) => clean(line)).filter(Boolean),
    checklist: checklist.map((line) => clean(line)).filter(Boolean),
  });
}

const ANNUAL_STEM_META = Object.freeze({
  "甲": ["큰 나무처럼 기준을 세우는 천간", "시작, 성장, 원칙, 장기 계획"],
  "乙": ["풀과 꽃처럼 유연하게 번지는 천간", "관계, 조율, 섬세함, 협업"],
  "丙": ["태양처럼 드러내고 밝히는 천간", "표현, 명예, 공개성, 자신감"],
  "丁": ["촛불처럼 집중력과 감각을 깨우는 천간", "몰입, 직감, 기획, 정교함"],
  "戊": ["큰 산처럼 중심과 책임을 세우는 천간", "기반, 신뢰, 축적, 안정"],
  "己": ["밭처럼 현실을 가꾸고 정리하는 천간", "관리, 생활, 루틴, 실속"],
  "庚": ["큰 쇠처럼 결단과 정리를 요구하는 천간", "판단, 구조조정, 승부, 절제"],
  "辛": ["보석처럼 가치와 기준을 세공하는 천간", "품질, 미감, 선택, 정밀함"],
  "壬": ["큰 물처럼 흐름을 넓히는 천간", "이동, 확장, 지혜, 유통"],
  "癸": ["비와 안개처럼 내면을 적시는 천간", "회복, 학습, 감수성, 준비"],
});

const ANNUAL_BRANCH_META = Object.freeze({
  "子": ["깊은 물의 씨앗이 움직이는 지지", "준비, 정보, 회복, 시작 전 정리"],
  "丑": ["겨울 땅이 축적을 품는 지지", "저장, 인내, 재정비, 느린 성과"],
  "寅": ["봄의 첫 기세가 열리는 지지", "도전, 추진, 새로운 역할, 방향 전환"],
  "卯": ["관계와 생장이 부드럽게 번지는 지지", "인연, 조율, 미감, 확장"],
  "辰": ["변화의 문턱을 품은 습토 지지", "전환, 정리, 숨은 가능성, 구조 변경"],
  "巳": ["열기와 집중이 강해지는 지지", "실행, 노출, 기술, 열정"],
  "午": ["한낮의 불처럼 정점에 오르는 지지", "주목, 성취, 속도, 표현"],
  "未": ["여름 끝의 땅처럼 결과를 다듬는 지지", "마무리, 관계 책임, 생활 기반"],
  "申": ["금기가 시작되어 판을 재편하는 지지", "변경, 협상, 기술, 이동"],
  "酉": ["결실을 선별하고 가치화하는 지지", "성과, 평가, 품질, 수익화"],
  "戌": ["가을 끝의 땅처럼 경계를 정하는 지지", "보호, 약속, 책임, 정리"],
  "亥": ["큰 물의 문이 열리는 지지", "휴식, 학습, 이동, 내면 성장"],
});

const ANNUAL_TEN_GOD_META = Object.freeze({
  "비견": ["자기 기준이 선명해지는 해", "독립성, 자존감, 자기 분야의 중심을 다시 잡는 흐름"],
  "겁재": ["경쟁과 재편이 강해지는 해", "사람, 돈, 기회의 경계가 흔들리기 쉬운 흐름"],
  "식신": ["생산성과 표현이 안정되는 해", "꾸준한 생산, 생활 만족, 결과물 축적의 흐름"],
  "상관": ["표현과 변화가 강해지는 해", "말, 기획, 창의성, 기존 질서의 재해석 흐름"],
  "편재": ["기회와 현금 흐름이 넓어지는 해", "사람, 정보, 시장의 움직임을 통한 재물 흐름"],
  "정재": ["안정 수입과 현실 관리가 중요해지는 해", "고정 수입, 생활 기반, 계획적 재정 관리 흐름"],
  "편관": ["압박 속에서 역량을 증명하는 해", "책임, 경쟁, 긴장 속에서 실전 능력을 끌어올리는 흐름"],
  "정관": ["질서와 책임이 커지는 해", "책임, 기준, 신뢰, 공식적인 역할이 중요해지는 흐름"],
  "편인": ["직감과 학습이 깊어지는 해", "내면 감각, 연구, 전환 학습으로 길을 찾는 흐름"],
  "정인": ["회복과 보호가 작동하는 해", "배움, 보호, 문서, 안정된 지원을 통한 회복 흐름"],
});

const ANNUAL_STEM_BLOCKS = Object.freeze(Object.fromEntries(Object.entries(ANNUAL_STEM_META).map(([stem, [title, keywords]]) => [stem, interpretationBlock({
  id: `annual-stem-${stem}`,
  tags: ["annual", "stem", `stem:${stem}`],
  weight: 1,
  title,
  summary: `${stem} 천간은 올해 ${keywords}의 결을 세운 위에 드러낸다.`,
  body: [
    `세운 천간 ${stem}은 겉으로 드러나는 선택 방식과 사회적 태도를 조율한다.`,
    `${keywords}의 흐름이 강해지므로 올해의 중요한 판단은 속도보다 방향과 태도를 먼저 보아야 한다.`,
    "천간의 기운은 마음의 의지와 말의 표현으로 먼저 나타나므로, 초반의 작은 선택이 연말의 큰 흐름을 만든다.",
  ],
  advice: ["올해의 대표 태도를 한 문장으로 정하라.", "중요한 선택은 천간의 키워드와 맞는지 점검하라."],
  caution: ["겉으로 드러나는 모습에만 치우쳐 실제 기반을 놓치지 말라."],
  checklist: ["올해 태도 키워드 정리", "중요한 말과 약속 기록", "상반기 방향 점검"],
})])));

const ANNUAL_BRANCH_BLOCKS = Object.freeze(Object.fromEntries(Object.entries(ANNUAL_BRANCH_META).map(([branch, [title, keywords]]) => [branch, interpretationBlock({
  id: `annual-branch-${branch}`,
  tags: ["annual", "branch", `branch:${branch}`],
  weight: 1,
  title,
  summary: `${branch} 지지는 올해 ${keywords}의 사건 배경을 만든다.`,
  body: [
    `세운 지지 ${branch}는 실제 사건이 나타나는 장소와 관계의 배경을 보여준다.`,
    `${keywords}의 흐름이 생활 속에서 반복될 수 있으니, 올해는 감정보다 패턴을 읽는 태도가 중요하다.`,
    "지지의 기운은 천천히 쌓이다가 특정 달에 사건으로 드러나므로 월운과 함께 보아야 한다.",
  ],
  advice: ["올해 반복될 생활 패턴을 미리 관찰하라.", "월별 사건을 같은 기준으로 기록하라."],
  caution: ["한 번의 사건만으로 한 해 전체를 단정하지 말라."],
  checklist: ["반복 사건 기록", "월운 강약 표시", "관계·돈·건강 패턴 점검"],
})])));

const ANNUAL_TEN_GOD_BLOCKS = Object.freeze(Object.fromEntries(Object.entries(ANNUAL_TEN_GOD_META).map(([tenGodName, [title, flow]]) => [tenGodName, interpretationBlock({
  id: `annual-ten-god-${tenGodName}`,
  tags: ["annual", "ten-god", `ten-god:${tenGodName}`],
  weight: 1.25,
  title,
  summary: `${tenGodName} 세운은 ${flow}을 올해의 중심 과제로 올린다.`,
  body: [
    `${tenGodName}이 세운의 중심으로 들어오면 올해는 ${flow}이 반복적으로 드러난다.`,
    "이 흐름은 한 번의 사건보다 태도와 선택 방식의 변화로 먼저 나타나며, 월운이 강한 시기에 현실 사건으로 선명해진다.",
    "좋은 쪽으로 쓰면 성장의 발판이 되지만, 균형을 잃으면 같은 주제가 부담과 소모로 반복될 수 있다.",
  ],
  advice: ["올해 이 십성이 요구하는 역할을 현실 일정으로 옮겨라.", "강한 달에는 실행하고 약한 달에는 정리하는 리듬을 만들라."],
  caution: ["십성의 장점이 과해질 때 생기는 고집, 과속, 회피, 부담을 조심하라."],
  checklist: ["올해 핵심 역할 기록", "월별 실행과 정비 구분", "반복 부담 신호 점검"],
})])));

const YEARLY_CONTEXT_BLOCKS = Object.freeze({
  elementExcess: interpretationBlock({
    id: "five-elements-excess-year",
    tags: ["five-elements", "excess"],
    weight: 1,
    title: "강한 오행을 방향성으로 다루는 해",
    summary: "과다한 오행은 재능이자 과열 지점이므로 쓰임과 절제가 함께 필요하다.",
    body: ["강한 오행은 올해 빠르게 드러나는 장점이지만, 같은 방식이 반복되면 피로와 갈등도 만든다.", "강한 기운은 밀어붙이는 힘보다 어디에 쓸지 정하는 기준이 있을 때 성과가 된다."],
    advice: ["강한 오행이 드러나는 분야를 핵심 목표로 삼되 휴식 장치를 함께 둬라."],
    caution: ["익숙하다는 이유로 같은 선택만 반복하지 말라."],
    checklist: ["강점 사용처 정리", "과열 신호 기록", "휴식 장치 마련"],
  }),
  elementDeficit: interpretationBlock({
    id: "five-elements-deficit-year",
    tags: ["five-elements", "deficit"],
    weight: 1,
    title: "부족한 오행을 보완하는 해",
    summary: "부족한 오행은 억지로 채우기보다 생활 방식과 선택 환경으로 보완해야 한다.",
    body: ["약한 오행은 올해 반복적으로 빈틈처럼 느껴질 수 있지만, 그것은 무능이 아니라 보완해야 할 리듬이다.", "환경, 사람, 루틴을 통해 부족한 기운을 조금씩 보태면 선택의 안정감이 커진다."],
    advice: ["부족한 오행과 맞는 활동을 월별 루틴에 넣어라."],
    caution: ["부족함을 단번에 해결하려고 과한 결정을 하지 말라."],
    checklist: ["보완 루틴 1개 설정", "도움 되는 환경 찾기", "월별 균형 점검"],
  }),
  usefulFavorable: interpretationBlock({
    id: "useful-god-favorable-year",
    tags: ["useful-god", "favorable"],
    weight: 1.1,
    title: "세운이 필요한 기운을 보태는 해",
    summary: "세운이 용신·희신 쪽으로 작동하면 무리한 확장보다 정확한 실행에서 성과가 난다.",
    body: ["올해는 이미 갖춘 장점보다 부족했던 균형이 보완되는 흐름이 중요하다.", "작은 실행도 운의 방향과 맞으면 예상보다 오래 가는 기반이 된다."],
    advice: ["좋은 달에는 준비해 둔 일을 실제 일정에 올려라."],
    caution: ["좋은 흐름을 과신해 검증 절차를 생략하지 말라."],
    checklist: ["유리한 오행 활동 정리", "좋은 달 실행 일정 배치", "도움받을 자원 확인"],
  }),
  usefulUnfavorable: interpretationBlock({
    id: "useful-god-unfavorable-year",
    tags: ["useful-god", "unfavorable"],
    weight: 1.1,
    title: "기신성 자극을 관리해야 하는 해",
    summary: "세운이 부담 기운을 자극하면 확장보다 조절, 정리, 속도 관리가 중요하다.",
    body: ["올해는 큰 기회처럼 보이는 일도 내 체력과 구조를 흔드는지 먼저 살펴야 한다.", "불리한 기운은 피해야 할 운명이 아니라 관리해야 할 압력이다."],
    advice: ["큰 결정은 하루 이상 숙성시킨 뒤 판단하라."],
    caution: ["불안해서 더 크게 벌리는 선택을 조심하라."],
    checklist: ["결정 유예 규칙 만들기", "지출 상한선 정하기", "갈등 조기 정리"],
  }),
  daewoonAnnual: interpretationBlock({
    id: "daewoon-annual-combination",
    tags: ["daewoon", "annual"],
    weight: 1,
    title: "대운의 배경 위에 세운이 사건을 여는 해",
    summary: "대운은 무대이고 세운은 올해 실제로 눌리는 버튼이다.",
    body: ["올해의 판단은 세운 한 줄만 보지 않고 현재 대운의 배경 위에서 읽어야 한다.", "대운이 준비한 방향과 세운이 건드리는 사건이 맞물리면 전환점이 분명해진다."],
    advice: ["큰 선택은 10년 흐름과 올해 사건성을 함께 보라."],
    caution: ["올해의 감정만으로 장기 방향을 바꾸지 말라."],
    checklist: ["현재 대운 키워드 확인", "올해 사건성 표시", "장기 선택과 단기 선택 분리"],
  }),
  relationClash: interpretationBlock({
    id: "annual-relation-clash",
    tags: ["relation", "clash", "risk"],
    weight: 1.15,
    title: "충의 변화 압력을 다루는 해",
    summary: "충이 드러나는 해에는 이동, 결별, 방향 전환의 신호가 강해진다.",
    body: ["충은 무조건 나쁜 신호가 아니라 멈춰 있던 흐름을 흔들어 방향을 바꾸게 하는 압력이다.", "일정, 관계, 계약에서 갑작스러운 변경이 생길 수 있으므로 여지를 남겨두는 운영이 필요하다."],
    advice: ["중요 일정에는 대안을 하나 더 준비하라."],
    caution: ["감정이 올라온 순간에 바로 결론을 내리지 말라."],
    checklist: ["대체 일정 확보", "계약 변경 조건 확인", "감정적 결정 유예"],
  }),
  relationCombination: interpretationBlock({
    id: "annual-relation-combination",
    tags: ["relation", "combination", "opportunity"],
    weight: 1.1,
    title: "합의 연결 기회를 살리는 해",
    summary: "합이 드러나는 해에는 협력, 인연, 제휴의 문이 열릴 수 있다.",
    body: ["올해의 연결은 우연처럼 보여도 실제로는 오래 준비된 흐름이 만나는 장면일 수 있다.", "사람과 기회가 들어올 때 목적과 역할을 분명히 하면 합의 기운이 성과로 이어진다."],
    advice: ["제안이 오면 역할과 기대치를 초기에 맞춰라."],
    caution: ["좋다는 이유만으로 경계 없이 섞이지 않도록 하라."],
    checklist: ["협업 역할 정의", "인연 관리 목록", "약속 이행 점검"],
  }),
  relationHarmBreakPunishment: interpretationBlock({
    id: "annual-relation-harm-break-punishment",
    tags: ["relation", "harm", "break", "punishment"],
    weight: 1.1,
    title: "형·파·해의 미세한 균열을 관리하는 해",
    summary: "형·파·해는 큰 충돌보다 반복되는 오해, 약속 변경, 피로 누적으로 드러난다.",
    body: ["올해의 균열은 갑작스러운 사고보다 사소한 말, 일정 변경, 책임 미루기에서 커질 수 있다.", "초기에 바로잡으면 큰 손실 없이 지나가지만 방치하면 신뢰 비용이 커진다."],
    advice: ["불편한 약속은 빨리 조정하고 기록으로 남겨라."],
    caution: ["작은 오해를 대수롭지 않게 넘기지 말라."],
    checklist: ["약속 변경 기록", "관계 오해 조기 확인", "책임 분담 점검"],
  }),
  monthlyOpportunity: interpretationBlock({
    id: "monthly-opportunity-window",
    tags: ["monthly", "opportunity"],
    weight: 1.05,
    title: "기회가 열리는 달을 실행 창으로 쓰는 법",
    summary: "월운이 강한 달은 준비한 일을 꺼내는 창으로 쓰는 것이 좋다.",
    body: ["좋은 달은 갑자기 모든 것을 해결해 주는 시간이 아니라, 이미 준비한 것을 현실에 올리기 좋은 시간이다.", "중요한 제안, 발표, 협상, 출시를 흐름이 좋은 달에 배치하면 실행의 저항이 줄어든다."],
    advice: ["기회 달에는 한 가지 핵심 목표만 전면에 세워라."],
    caution: ["좋은 달이라고 여러 일을 동시에 벌리지 말라."],
    checklist: ["기회 달 표시", "핵심 목표 1개 선정", "성과 지표 설정"],
  }),
  monthlyRisk: interpretationBlock({
    id: "monthly-risk-window",
    tags: ["monthly", "risk"],
    weight: 1.05,
    title: "주의 달을 방어와 정비의 시간으로 쓰는 법",
    summary: "월운이 낮은 달은 손실을 줄이고 구조를 고치는 시간이다.",
    body: ["주의 달에는 큰 결론보다 점검과 보완이 중요하다.", "몸과 감정이 흔들리는 시기에 중요한 계약이나 지출을 서두르면 작은 균열이 커질 수 있다."],
    advice: ["낮은 달에는 검토, 수정, 회복 일정을 먼저 배치하라."],
    caution: ["불안해서 즉흥적으로 방향을 바꾸지 말라."],
    checklist: ["큰 지출 보류", "건강 루틴 강화", "관계 오해 조기 정리"],
  }),
  career: interpretationBlock({
    id: "career-year-local",
    tags: ["career", "work"],
    weight: 1,
    title: "일의 기준을 재정렬하는 해",
    summary: "올해의 일운은 세운 십성과 월별 강약에 맞춰 책임, 표현, 성과의 순서를 정할 때 안정된다.",
    body: ["직업운은 한 번의 승부보다 어떤 방식으로 인정받을지를 정하는 데서 시작된다.", "강한 달에는 보여주고 약한 달에는 다듬는 리듬을 만들면 연간 성과가 흔들리지 않는다."],
    advice: ["분기별 핵심 업무를 하나씩 정하라."],
    caution: ["인정 욕구 때문에 감당 못 할 일을 떠안지 말라."],
    checklist: ["분기 목표 작성", "발표·협상 달 배치", "업무 부담 상한선 설정"],
  }),
  money: interpretationBlock({
    id: "money-year-local",
    tags: ["money", "spending"],
    weight: 1,
    title: "수입과 소비의 질서를 세우는 해",
    summary: "재물운은 기회의 크기보다 관리의 지속성에서 안정된다.",
    body: ["올해 돈은 들어오는 흐름과 나가는 흐름을 함께 봐야 한다.", "좋은 달에는 수익 구조를 키우고 약한 달에는 비용과 계약을 점검하면 재물운의 진폭을 줄일 수 있다."],
    advice: ["월별 수입과 지출을 한 표에 정리하라."],
    caution: ["기분 전환 소비가 반복되면 좋은 운도 새어 나간다."],
    checklist: ["고정비 점검", "투자 상한선 설정", "비상금 확보"],
  }),
  relationship: interpretationBlock({
    id: "relationship-year-local",
    tags: ["relationship", "love"],
    weight: 1,
    title: "관계의 온도와 경계를 조율하는 해",
    summary: "관계운은 들어오는 인연보다 내가 어떤 태도로 관계를 유지하는지에서 갈린다.",
    body: ["올해는 가까워지는 사람과 멀어지는 사람이 함께 드러날 수 있다.", "합의 흐름은 연결을 만들고 충의 흐름은 경계를 다시 묻게 하므로, 관계의 속도보다 신뢰의 질을 살펴야 한다."],
    advice: ["중요한 관계에는 기대와 역할을 말로 분명히 하라."],
    caution: ["상대의 반응을 시험하듯 대하지 말라."],
    checklist: ["관계 기대치 정리", "갈등 대화 문장 준비", "신뢰 행동 기록"],
  }),
  health: interpretationBlock({
    id: "health-year-local",
    tags: ["health", "rhythm"],
    weight: 1,
    title: "생활 리듬이 운의 체력을 만드는 해",
    summary: "건강운은 세운 오행과 월별 강약에 따라 피로가 쌓이는 방식을 읽는 데서 시작된다.",
    body: ["올해 몸의 신호는 큰 사건보다 반복되는 피로, 수면, 소화, 긴장 패턴으로 먼저 나타날 수 있다.", "좋은 달에도 과열을 조심하고 약한 달에는 회복을 일정에 넣어야 한다."],
    advice: ["수면, 식사, 움직임 중 하나를 핵심 루틴으로 고정하라."],
    caution: ["버티는 힘을 건강운으로 착각하지 말라."],
    checklist: ["수면 시간 기록", "주의 달 휴식 예약", "반복 증상 메모"],
  }),
  routine12: interpretationBlock({
    id: "twelve-month-action-routine",
    tags: ["routine", "monthly", "action"],
    weight: 1,
    title: "12개월 실천 루틴",
    summary: "한 해의 운을 실제 결과로 바꾸려면 매달 같은 기준으로 점검해야 한다.",
    body: ["매월 초에는 이번 달의 기회 한 가지와 조심할 것 한 가지를 적는다.", "매월 말에는 돈, 관계, 건강, 일의 결과를 짧게 기록해 다음 달의 선택 기준으로 삼는다."],
    advice: ["월초 계획과 월말 회고를 같은 양식으로 반복하라."],
    caution: ["기분에 따라 기준을 매달 바꾸면 흐름을 읽기 어렵다."],
    checklist: ["월초 기회 1개 기록", "월초 주의 1개 기록", "월말 4영역 회고"],
  }),
});

function normalizeAnnualFortunePillar(pillar = {}) {
  return compactNewYearObject({
    stem: clean(pillar?.stem),
    branch: clean(pillar?.branch),
    label: clean(pillar?.label || `${clean(pillar?.stem)}${clean(pillar?.branch)}`),
    element: clean(pillar?.element),
    elementKo: clean(pillar?.elementKo),
  });
}

function getAnnualFortuneChapterId(chapterSpec = {}) {
  return ANNUAL_FORTUNE_CHAPTER_ID_BY_NO[Number(chapterSpec?.no || 0)] || `chapter_${Number(chapterSpec?.no || 0) || "unknown"}`;
}

function getYearlySajuPdfConfig() {
  return YEARLY_SAJU_PDF_CONFIG;
}

function softenAnnualFortuneRiskText(value, targetYear) {
  let result = stripForbiddenText(value);
  for (const [pattern, replacement] of ANNUAL_FORTUNE_RISK_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  const year = Number(targetYear || 0);
  if (year >= 1900 && year <= 2100) {
    result = result.replace(/\b(19\d{2}|20\d{2}|21\d{2})년/g, (match, rawYear) => (
      Number(rawYear) === year ? match : `${year}년`
    ));
  }
  return result.replace(/\s{3,}/g, " ").trim();
}

function deriveAnnualFortuneDayMasterStrength(seed = {}) {
  const dayMaster = clean(seed?.saju?.dayMaster || seed?.saju?.pillars?.day?.stem || "戊");
  const element = STEM_ELEMENT[dayMaster] || LOCAL_STEM_ELEMENT[dayMaster] || "earth";
  const count = Number(seed?.saju?.fiveElements?.[element] || 0);
  if (count >= 3) return "강";
  if (count <= 1) return "약";
  return "중화";
}

function buildAnnualFortuneMonthlyPoint(item = {}, seed = {}) {
  const month = Number(item?.month || 0);
  const monthLabel = `${month || ""}월`;
  const tone = clean(item?.tone || toneFromScore(item?.finalScore || item?.score));
  const pillar = clean(item?.pillar?.label);
  const relation = clean(item?.relation);
  const decision = clean(item?.decision || decisionFromScore(item?.finalScore || item?.score));
  return compactNewYearObject({
    monthIndex: month,
    monthLabel,
    monthTheme: `${pillar} 월운 · ${tone} 운영`,
    monthPillar: normalizeAnnualFortunePillar(item?.pillar),
    monthTenGodForDayMaster: localTenGod(clean(seed?.saju?.dayMaster || "戊"), clean(item?.pillar?.stem || "甲")),
    elementImpact: {
      element: clean(item?.pillar?.element),
      elementKo: LOCAL_ELEMENT_KO[item?.pillar?.element] || ELEMENT_KO[item?.pillar?.element] || "",
      relation,
      baseScore: item?.baseScore,
      finalScore: item?.finalScore ?? item?.score,
      decision,
    },
    combinationsAndConflicts: [],
    themeKeywords: [pillar, tone, relation, decision].filter(Boolean),
    careerPoint: `${monthLabel}에는 ${tone} 리듬에 맞춰 업무 우선순위와 일정 밀도를 조절하는 편이 좋습니다.`,
    wealthPoint: `${monthLabel} 재물 흐름은 지출 속도와 계약 조건을 확인하며 보수적으로 관리하면 안정됩니다.`,
    relationshipPoint: `${monthLabel} 관계에서는 기대치를 먼저 말로 정리하고 약속의 범위를 좁혀 가는 방식이 유리합니다.`,
    healthLifestylePoint: `${monthLabel} 생활 리듬은 수면, 식사, 이동 일정을 무리하지 않게 배치하는 것이 핵심입니다.`,
    cautionPoint: decision === "STOP" ? "큰 결정을 서두르기보다 확인과 보완에 집중하세요." : "좋은 흐름이 있더라도 기록과 검토를 함께 두면 흔들림이 줄어듭니다.",
    actionGuide: clean(item?.advice || `${tone} 관점으로 한 달 계획을 조정하세요.`),
  });
}

function buildAnnualFortuneFacts(seed = {}) {
  const annual = seed?.saju?.annualLuck || {};
  const quantum = seed?.quantumMyeongri || seed?.saju?.quantumMyeongri || {};
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const relations = Array.isArray(seed?.saju?.relations?.branchRelations) ? seed.saju.relations.branchRelations : [];
  const usefulKeywords = Array.isArray(seed?.structure?.usefulGodKeywords) ? seed.structure.usefulGodKeywords.filter(Boolean) : [];
  return compactNewYearObject({
    productId: ANNUAL_FORTUNE_PRODUCT_ID,
    targetYear: Number(seed?.targetYear || annual?.year || 0),
    displayYearLabel: `${Number(seed?.targetYear || annual?.year || 0)}년`,
    calculationBasis: {
      yearBoundary: "existing_engine_basis",
      monthBoundary: "existing_engine_basis",
      usesSolarTerms: true,
      engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
    },
    birthInfo: seed?.birthProfile || seed?.input,
    fourPillars: seed?.saju?.pillars,
    dayMaster: clean(seed?.saju?.dayMaster),
    dayMasterStrength: deriveAnnualFortuneDayMasterStrength(seed),
    fiveElementBalance: seed?.saju?.fiveElements,
    tenGods: seed?.saju?.tenGods,
    usefulGods: usefulKeywords,
    avoidGods: Array.isArray(quantum?.cautionElements) ? quantum.cautionElements : [],
    structureType: clean(seed?.structure?.geokguk),
    currentMajorLuckCycle: seed?.saju?.luckCycle,
    annualPillar: normalizeAnnualFortunePillar(annual),
    annualTenGodForDayMaster: clean(annual?.tenGod),
    annualElementImpact: {
      element: clean(annual?.element),
      elementKo: clean(annual?.elementKo),
      dayMasterRelation: clean(annual?.dayMasterRelation),
      quantum: annual?.quantum || quantum?.annualQuantum,
    },
    annualUsefulGodImpact: Array.isArray(quantum?.favorableElements) ? quantum.favorableElements.join("·") : "",
    annualAvoidGodImpact: Array.isArray(quantum?.cautionElements) ? quantum.cautionElements.join("·") : "",
    annualCombinationsAndConflicts: relations.map((row) => compactNewYearObject({
      type: row?.type,
      target: row?.target,
      message: row?.message,
    })),
    annualStars: [],
    annualThemeKeywords: seed?.luckCycles?.targetYearSewoon?.keywords || [annual?.label, annual?.tenGod, annual?.dayMasterRelation].filter(Boolean),
    careerFortune: seed?.derivedSignals?.careerSignals,
    wealthFortune: seed?.derivedSignals?.moneySignals,
    relationshipFortune: [
      ...(seed?.derivedSignals?.loveRelationshipSignals || []),
      ...(seed?.derivedSignals?.humanRelationSignals || []),
    ].slice(0, 8),
    healthLifestyleFortune: seed?.derivedSignals?.healthMindSignals,
    studyGrowthFortune: seed?.interpretationSeeds?.study || [],
    familySocialFortune: seed?.derivedSignals?.humanRelationSignals,
    riskWarnings: seed?.derivedSignals?.crisisSignals,
    opportunitySignals: seed?.derivedSignals?.opportunitySignals,
    monthlyFlows: monthly.map((item) => buildAnnualFortuneMonthlyPoint(item, seed)),
    quarterlyStrategy: seed?.interpretationSeeds?.monthly || [],
    annualStrategy: seed?.interpretationSeeds?.finalStrategy || [],
    doList: seed?.derivedSignals?.opportunitySignals || [],
    avoidList: seed?.derivedSignals?.crisisSignals || [],
  });
}

function buildAnnualFortuneLockedFacts(facts = {}, chapterSpec = {}) {
  const monthly = Array.isArray(facts?.monthlyFlows) ? facts.monthlyFlows : [];
  const goMonths = monthly.filter((item) => item?.elementImpact?.decision === "GO").map((item) => item.monthLabel).slice(0, 4);
  const stopMonths = monthly.filter((item) => item?.elementImpact?.decision === "STOP").map((item) => item.monthLabel).slice(0, 4);
  const base = [
    `대상 연도는 ${facts.displayYearLabel || `${facts.targetYear}년`}입니다.`,
    "계산 기준은 기존 서비스의 절기와 월운 기준을 그대로 따릅니다.",
    `일간은 ${facts.dayMaster || "확인 필요"}이고 일간 강약은 ${facts.dayMasterStrength || "중화"}입니다.`,
    `세운은 ${facts?.annualPillar?.label || "세운"}이며 일간 기준 십성은 ${facts.annualTenGodForDayMaster || "십성"}입니다.`,
    `세운과 일간의 관계는 ${facts?.annualElementImpact?.dayMasterRelation || "관계"}입니다.`,
    `월운은 1월부터 12월까지 ${monthly.length}개가 확정되어 있습니다.`,
  ];
  const chapterId = getAnnualFortuneChapterId(chapterSpec);
  if (/career/.test(chapterId)) base.push(...(facts.careerFortune || []).slice(0, 3));
  if (/wealth/.test(chapterId)) base.push(...(facts.wealthFortune || []).slice(0, 3));
  if (/relationship/.test(chapterId)) base.push(...(facts.relationshipFortune || []).slice(0, 3));
  if (/health/.test(chapterId)) base.push(...(facts.healthLifestyleFortune || []).slice(0, 3));
  if (/caution/.test(chapterId)) base.push(...(facts.riskWarnings || []).slice(0, 3));
  if (/master|overview/.test(chapterId)) base.push(...(facts.annualStrategy || []).slice(0, 3));
  if (goMonths.length) base.push(`기회가 강한 달은 ${goMonths.join("·")}입니다.`);
  if (stopMonths.length) base.push(`조심할 달은 ${stopMonths.join("·")}입니다.`);
  return base.map(stripForbiddenText).filter(Boolean);
}

function buildAnnualFortuneChapterPlans(seed = {}, chapterSpecs = []) {
  const facts = seed?.annualFortuneFacts || buildAnnualFortuneFacts(seed);
  const specs = Array.isArray(chapterSpecs) && chapterSpecs.length ? chapterSpecs : buildSajuNewYearChapterSpecs(seed?.targetYear || resolveDefaultTargetYear());
  return specs.map((chapterSpec) => {
    const chapterId = getAnnualFortuneChapterId(chapterSpec);
    return compactNewYearObject({
      chapterId,
      chapterTitle: clean(chapterSpec?.title),
      targetYear: facts.targetYear,
      purpose: `${clean(chapterSpec?.title)}에서 확정된 세운·월운·원국 근거를 독자가 이해할 수 있는 상담문으로 풀어냅니다.`,
      lockedFacts: buildAnnualFortuneLockedFacts(facts, chapterSpec),
      interpretationPoints: (chapterSpec?.categories || []).map((title, index) => `${index + 1}. ${title}`).concat((facts.annualThemeKeywords || []).slice(0, 4)),
      warnings: [
        "사주 계산, 세운 계산, 월운 계산을 새로 하지 않습니다.",
        "lockedFacts와 충돌하는 문장을 쓰지 않습니다.",
        "건강·금전·관계·직업 결과를 단정적으로 예언하지 않습니다.",
        "월별 운세는 제공된 12개월 월운을 벗어나 임의 생성하지 않습니다.",
      ],
      recommendedTone: "전문적이고 신비로운 프리미엄 신년운세 상담체",
    });
  });
}

function compactNewYearLocks(now = Date.now()) {
  for (const [key, lock] of newYearPdfLocks.entries()) {
    const startedAtMs = Number(lock?.startedAtMs || 0);
    if (!startedAtMs || now - startedAtMs > NEW_YEAR_PDF_LOCK_TTL_MS) {
      newYearPdfLocks.delete(key);
    }
  }
}

function resolveDefaultTargetYear() {
  const now = new Date();
  return now.getFullYear() + 1;
}

function parseBirthDateParts(raw) {
  const token = clean(raw);
  if (!token) return null;

  const standard = token.match(/^(\d{4})[-./\s](\d{1,2})[-./\s](\d{1,2})$/);
  if (standard) {
    return {
      year: toInt(standard[1], 0),
      month: toInt(standard[2], 0),
      day: toInt(standard[3], 0),
    };
  }

  const compact = token.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return {
      year: toInt(compact[1], 0),
      month: toInt(compact[2], 0),
      day: toInt(compact[3], 0),
    };
  }
  return null;
}

function parseBirthTime(rawTime, rawHour, rawMinute) {
  const text = clean(rawTime).toLowerCase();
  const unknownTokens = ["모름", "시간 모름", "unknown", "미상", "na", "n/a", "없음"];
  if (unknownTokens.some((token) => text.includes(token))) {
    return { isTimeUnknown: true, birthHour: null, birthMinute: null, birthTime: "" };
  }

  const branchHourMap = { 자: 23, 축: 1, 인: 3, 묘: 5, 진: 7, 사: 9, 오: 11, 미: 13, 신: 15, 유: 17, 술: 19, 해: 21 };
  const branchMatch = text.match(/([자축인묘진사오미신유술해])\s*시/);
  if (branchMatch && branchHourMap[branchMatch[1]] !== undefined) {
    return {
      isTimeUnknown: false,
      birthHour: branchHourMap[branchMatch[1]],
      birthMinute: 0,
      birthTime: `${pad2(branchHourMap[branchMatch[1]])}:00`,
    };
  }

  let hour = Number.isFinite(Number(rawHour)) ? clamp(rawHour, 0, 23) : null;
  let minute = Number.isFinite(Number(rawMinute)) ? clamp(rawMinute, 0, 59) : 0;

  const hm = text.match(/(?:오전|오후)?\s*(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*(?:분)?/);
  if (hm) {
    hour = toInt(hm[1], 0);
    minute = hm[2] === undefined ? 0 : toInt(hm[2], 0);
  }

  const hourOnly = text.match(/^(\d{1,2})\s*시?$/);
  if (hourOnly && hour === null) {
    hour = toInt(hourOnly[1], 0);
    minute = 0;
  }

  if (text.includes("오후") && hour !== null && hour < 12) hour += 12;
  if (text.includes("오전") && hour === 12) hour = 0;
  if (hour !== null && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    return { isTimeUnknown: false, birthHour: hour, birthMinute: minute, birthTime: `${pad2(hour)}:${pad2(minute)}` };
  }

  return { isTimeUnknown: true, birthHour: null, birthMinute: null, birthTime: "" };
}

function normalizeInput(body = {}) {
  const directBirthInput = body.birthInput && typeof body.birthInput === "object" ? body.birthInput : {};
  if (Object.keys(directBirthInput).length) {
    body = {
      ...body,
      ...directBirthInput,
      birthDate: directBirthInput.birthDate || directBirthInput.date || body.birthDate,
      birthTime: directBirthInput.birthTime || directBirthInput.time || body.birthTime,
      birthYear: directBirthInput.birthYear || directBirthInput.year || body.birthYear,
      birthMonth: directBirthInput.birthMonth || directBirthInput.month || body.birthMonth,
      birthDay: directBirthInput.birthDay || directBirthInput.day || body.birthDay,
      birthHour: directBirthInput.birthHour ?? directBirthInput.hour ?? body.birthHour,
      birthMinute: directBirthInput.birthMinute ?? directBirthInput.minute ?? body.birthMinute,
      birthPlace: directBirthInput.birthPlace || directBirthInput.place || body.birthPlace,
      calendarType: directBirthInput.calendarType || directBirthInput.calendar || body.calendarType,
      timezone: directBirthInput.timezone || body.timezone,
      latitude: directBirthInput.latitude ?? body.latitude,
      longitude: directBirthInput.longitude ?? directBirthInput.lng ?? body.longitude,
    };
  }
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const birth = profile.birth && typeof profile.birth === "object" ? profile.birth : {};
  const birthDateRaw = clean(
    directBirthInput.birthDate
    || directBirthInput.date
    || body.birthDate
    || body.birthday
    || body.solarDate
    || body.lunarDate
    || body.date
    || body.dob
    || profile.birthDate
    || birth.birthDate
    || birth.date,
  );
  const parts = parseBirthDateParts(birthDateRaw) || {};
  const year = toInt(directBirthInput.birthYear || directBirthInput.year || body.birthYear || body.year || birth.year || parts.year, 0);
  const month = toInt(directBirthInput.birthMonth || directBirthInput.month || body.month || body.birthMonth || birth.month || parts.month, 0);
  const day = toInt(directBirthInput.birthDay || directBirthInput.day || body.day || body.birthDay || birth.day || parts.day, 0);
  const timeInfo = parseBirthTime(
    directBirthInput.birthTime || directBirthInput.time || body.birthTime || body.time || body.timeText || body.hourText || profile.birthTime || birth.birthTime,
    directBirthInput.hour ?? directBirthInput.birthHour ?? body.hour ?? body.birthHour ?? body.birth_hour ?? birth.hour,
    directBirthInput.minute ?? directBirthInput.birthMinute ?? body.minute ?? body.birthMinute ?? birth.minute,
  );

  const targetYearRaw = body.targetYear ?? body.selectedYear ?? body.fortuneYear ?? body.target_year;
  const targetYear = toInt(targetYearRaw, 0);

  if (!year || !month || !day) {
    return { ok: false, code: "INVALID_INPUT", message: "신년운세 PDF 생성을 위해 생년월일을 확인해 주세요." };
  }
  if (!targetYear || targetYear < 1900 || targetYear > 2100) return { ok: false, code: "INVALID_INPUT", message: "신년운세를 볼 대상 연도 targetYear를 입력해 주세요." };

  const name = clean(body.name || profile.name || profile.userName) || "사용자";
  const genderRaw = clean(body.gender || body.sex || profile.gender || profile.sex || "").toLowerCase();
  const gender = genderRaw === "f" || genderRaw.includes("female") || genderRaw.includes("여") ? "female" : genderRaw === "m" || genderRaw.includes("male") || genderRaw.includes("남") ? "male" : "unknown";
  const calendarRaw = clean(body.calendarType || body.calendar || birth.calendarType || birth.calType || profile.calendarType || "solar").toLowerCase();
  const calendarType = calendarRaw.includes("lunar") || calendarRaw.includes("음")
    ? (calendarRaw.includes("leap") || calendarRaw.includes("윤") ? "lunar_leap" : "lunar")
    : calendarRaw.includes("solar") || calendarRaw.includes("양")
      ? "solar"
      : "unknown";
  const latitudeRaw = Number(body.latitude ?? profile.latitude ?? birth.latitude ?? 37.5665);
  const longitudeRaw = Number(body.longitude ?? body.lng ?? profile.longitude ?? profile.lng ?? birth.longitude ?? birth.lng ?? 126.978);
  const latitude = clamp(latitudeRaw, -90, 90);
  const longitude = clamp(longitudeRaw, -180, 180);
  const birthPlace = clean(body.birthPlace || body.place || profile.birthPlace || profile.place || birth.birthPlace || birth.place || "대한민국") || "대한민국";
  const birthInput = {
    name,
    gender,
    calendarType,
    birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthTime: timeInfo.birthTime,
    birthHour: timeInfo.birthHour,
    birthMinute: timeInfo.birthMinute,
    timezone: clean(body.timezone || profile.timezone || birth.timezone || "Asia/Seoul") || "Asia/Seoul",
    latitude,
    longitude,
    birthPlace,
    isTimeUnknown: Boolean(timeInfo.isTimeUnknown),
  };

  return {
    ok: true,
    birthInput,
    profile: {
      name: birthInput.name,
      gender: birthInput.gender,
      birth: {
        year: birthInput.birthYear,
        month: birthInput.birthMonth,
        day: birthInput.birthDay,
        hour: birthInput.birthHour === null ? 12 : clamp(birthInput.birthHour, 0, 23),
        minute: birthInput.birthMinute === null ? 0 : clamp(birthInput.birthMinute, 0, 59),
        calendarType,
        timezone: birthInput.timezone,
        birthPlace,
        latitude,
        longitude,
        unknownTime: birthInput.isTimeUnknown,
      },
      calendarType,
      timezone: birthInput.timezone,
      location: {
        name: birthPlace,
        latitude,
        longitude,
        timezone: birthInput.timezone,
      },
    },
    targetYear,
  };
}

function sexagenaryYear(year) {
  const index = ((toInt(year, 1984) - 1984) % 60 + 60) % 60;
  return { stem: STEMS[index % 10], branch: BRANCHES[index % 12], label: `${STEMS[index % 10]}${BRANCHES[index % 12]}` };
}

function monthPillar(targetYear, month) {
  const yearStemIndex = STEMS.indexOf(sexagenaryYear(targetYear).stem);
  const firstMonthStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10;
  const stem = STEMS[(firstMonthStemIndex + month - 1) % 10];
  const branch = MONTH_BRANCHES[(month - 1) % 12];
  return { month, stem, branch, label: `${stem}${branch}`, element: BRANCH_ELEMENT[branch] || STEM_ELEMENT[stem] || "earth" };
}

function elementRelation(dayElement, otherElement) {
  if (!dayElement || !otherElement) return "중립";
  if (dayElement === otherElement) return "동기 공명";
  if (GENERATES[dayElement] === otherElement) return "표현과 생산";
  if (GENERATES[otherElement] === dayElement) return "지원과 회복";
  if (CONTROLS[dayElement] === otherElement) return "관리와 재물";
  if (CONTROLS[otherElement] === dayElement) return "압박과 책임";
  return "중립";
}

function tenGod(dayStem, otherStem) {
  const dayElement = STEM_ELEMENT[dayStem];
  const otherElement = STEM_ELEMENT[otherStem];
  const samePolarity = STEM_YINYANG[dayStem] === STEM_YINYANG[otherStem];
  if (!dayElement || !otherElement) return "미정";
  if (dayElement === otherElement) return samePolarity ? "비견" : "겁재";
  if (GENERATES[dayElement] === otherElement) return samePolarity ? "식신" : "상관";
  if (CONTROLS[dayElement] === otherElement) return samePolarity ? "편재" : "정재";
  if (CONTROLS[otherElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (GENERATES[otherElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "미정";
}

function relationRows(pillars, annualBranch) {
  const rows = [];
  const natal = [
    ["년지", pillars?.year?.branch],
    ["월지", pillars?.month?.branch],
    ["일지", pillars?.day?.branch],
    ["시지", pillars?.hour?.branch],
  ].filter(([, branch]) => branch);

  for (const [label, branch] of natal) {
    if (BRANCH_COMBOS[annualBranch] === branch) rows.push({ type: "합", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 합을 이루어 협력과 연결성이 강해집니다.` });
    if (BRANCH_CLASHES[annualBranch] === branch) rows.push({ type: "충", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 충을 이루어 이동, 변화, 결단 압력이 커집니다.` });
    if (BRANCH_HARMS[annualBranch] === branch) rows.push({ type: "해", label, branch, message: `${label} ${branch}와 세운 ${annualBranch} 사이에 해가 있어 관계의 미세한 오해를 관리해야 합니다.` });
    if (BRANCH_BREAKS[annualBranch] === branch) rows.push({ type: "파", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 파를 이루어 계획 변경과 약속 관리가 중요합니다.` });
  }
  return rows;
}

function normalizeEngineSaju(profile, body = {}) {
  let engine = null;
  try {
    const baseLocation = profile?.location && typeof profile.location === "object" ? profile.location : {};
    const location = {
      name: clean(baseLocation.name || profile?.birth?.birthPlace || "대한민국") || "대한민국",
      latitude: Number.isFinite(Number(baseLocation.latitude)) ? Number(baseLocation.latitude) : Number(profile?.birth?.latitude || 37.5665),
      longitude: Number.isFinite(Number(baseLocation.longitude)) ? Number(baseLocation.longitude) : Number(profile?.birth?.longitude || 126.978),
      timezone: clean(profile.timezone || profile?.birth?.timezone || "Asia/Seoul") || "Asia/Seoul",
    };
    engine = buildSajuProfile({
      name: profile.name,
      gender: profile.gender,
      birth: profile.birth,
      calendarType: profile.calendarType,
      timezone: profile.timezone || "Asia/Seoul",
      location,
      hourPillarTimePolicy: clean(body?.hourPillarTimePolicy || profile?.hourPillarTimePolicy || "TRUE_SOLAR_TIME") || "TRUE_SOLAR_TIME",
      dayChangePolicy: clean(body?.dayChangePolicy || profile?.dayChangePolicy || "MIDNIGHT") || "MIDNIGHT",
    });
  } catch (error) {
    console.error("[NewYearBook][LocalSajuEngineFailed]", {
      message: clean(error?.message || error),
      birth: profile.birth,
    });
  }

  if (!engine?.pillars?.day?.stem || !engine?.pillars?.month?.branch) {
    const err = new Error("신년운세 PDF 생성을 위한 사주 원국 계산에 실패했습니다.");
    err.code = "SAJU_LOCAL_ENGINE_FAILED";
    err.status = 422;
    throw err;
  }

  const sajuBase = body.sajuBase && typeof body.sajuBase === "object" ? body.sajuBase : {};
  const pillars = engine.pillars;
  const dayMaster = clean(engine.dayMaster?.stem || engine.pillars.day?.stem);
  const fiveElements = engine.fiveElements || {};
  const tenGods = engine.tenGods || {};
  const usefulGods = engine.usefulGods || {};
  const daeun = Array.isArray(engine.daeun)
    ? engine.daeun
    : (Array.isArray(sajuBase?.timing?.daeun) ? sajuBase.timing.daeun : []);

  return { engine, pillars, dayMaster, fiveElements, tenGods, usefulGods, daeun };
}

function dominantElement(fiveElements = {}, fallback = "earth") {
  const source = fiveElements.scores || fiveElements.counts || fiveElements.ratio || fiveElements;
  const keys = ["wood", "fire", "earth", "metal", "water"];
  return keys.slice().sort((a, b) => Number(source?.[b] || 0) - Number(source?.[a] || 0))[0] || fallback;
}

function buildMonthlyLuck(targetYear, dayStem) {
  const dayElement = STEM_ELEMENT[dayStem] || "earth";
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const pillar = monthPillar(targetYear, month);
    const relation = elementRelation(dayElement, pillar.element);
    const score = clamp(62 + (relation === "지원과 회복" ? 12 : relation === "표현과 생산" ? 8 : relation === "관리와 재물" ? 6 : relation === "압박과 책임" ? -7 : 2) + ((month * 7 + targetYear) % 9), 38, 92);
    const tone = score >= 75 ? "확장" : score >= 60 ? "정비" : "보수";
    return { month, pillar, relation, score: Math.round(score), tone, advice: `${month}월은 ${pillar.label} ${ELEMENT_KO[pillar.element] || "토"} 기운이 두드러져 ${tone} 관점으로 일정을 운영하는 것이 좋습니다.` };
  });
}

// ── 십성별 신년운세 해석 라이브러리 ───────────────────────────────
const SAJU_YEARLY_TEN_GOD_LIBRARY = {
  "비견": {
    yearlyTheme: "이 해는 나의 기준과 자립심이 더 선명하게 드러나는 시기입니다. 스스로 결정하고 스스로 책임지는 흐름이 강해지며, 그 과정에서 경쟁과 자기 확인의 압력도 함께 찾아옵니다.",
    money: "재물의 흐름은 한 번에 큰 덩어리로 들어오기보다 내가 직접 생산하고 제공하는 방식으로 움직입니다. 가격, 서비스, 역할을 스스로 정할수록 수익의 안정성이 높아집니다. 다만 경쟁 구도에서 지나치게 가격을 낮추거나 자신을 과소평가하면 재물운이 새어나갈 수 있습니다.",
    career: "일에서는 나의 능력을 직접 보여주는 방식이 유리합니다. 팀보다 개인 성과가 평가 기준이 되는 자리, 또는 자신만의 전문 영역을 키우는 방향으로 에너지를 써야 성과가 납니다.",
    relationship: "가까운 사람과 동등한 관계를 원하지만 비교와 경쟁심이 의도치 않게 작동할 수 있습니다. 사랑에서도 자존심보다 공감이 먼저 필요한 순간을 인식하는 것이 중요합니다.",
    health: "자신을 몰아붙이는 에너지가 강해져 과로와 긴장이 반복될 수 있습니다. 규칙적인 수면과 혼자 있는 회복 시간이 이 해의 건강운을 지키는 핵심입니다.",
    caution: "경쟁심이 지나치면 협력의 기회를 놓칩니다. 내 기준만 옳다는 태도가 관계를 좁히지 않도록 주의하세요.",
    advice: "독립성을 강점으로 쓰되, 혼자 다 하려는 고집을 내려놓는 것이 이 해를 풍요롭게 만드는 첫 번째 선택입니다.",
  },
  "겁재": {
    yearlyTheme: "이 해는 경쟁과 변동의 에너지가 강하게 작동합니다. 같은 자리를 두고 누군가와 부딪히는 상황이 생기거나, 내가 원하던 기회가 예상치 못한 방식으로 흔들릴 수 있습니다.",
    money: "재물의 흐름이 예측하기 어렵게 움직입니다. 큰 수익을 노리다 오히려 손실이 생기거나, 믿었던 수입원이 흔들릴 수 있으므로 분산 관리와 비상 자금 확보가 필요합니다.",
    career: "일에서의 경쟁이 심해지는 시기입니다. 남과 비교하기보다 나만의 차별점을 명확히 하고, 성과 구조를 선명하게 정의해야 인정받을 수 있습니다.",
    relationship: "가까운 관계에서 이해충돌이나 감정 충돌이 생길 수 있습니다. 말의 온도를 조절하고 역할 경계를 먼저 정리하는 것이 갈등을 줄이는 방법입니다.",
    health: "신경과 근육이 긴장하기 쉬운 구조입니다. 감정의 소모를 줄이고 뇌와 몸의 회복 루틴을 의도적으로 만들어야 합니다.",
    caution: "충동적인 결정, 갑작스러운 지출, 보증과 대출은 이 해에 특히 신중해야 합니다.",
    advice: "변동성을 기회로 삼으려면 먼저 내 기반을 단단히 다져야 합니다. 흔들리지 않는 중심이 이 해의 가장 큰 자산입니다.",
  },
  "식신": {
    yearlyTheme: "이 해는 자신의 재능과 표현이 현실로 펼쳐지는 흐름이 강합니다. 내가 가진 것을 밖으로 드러낼수록 기회가 열리며, 창의성과 생산성이 함께 높아지는 시기입니다.",
    money: "재물은 내가 만들어낸 것, 제공한 것에 비례해 들어오는 구조입니다. 콘텐츠, 기술, 서비스, 상품처럼 표현과 생산의 형태로 수익 구조를 키울수록 재물운이 살아납니다.",
    career: "전문성과 창의성을 발휘하는 분야에서 두드러진 성과를 낼 수 있습니다. 기획, 교육, 상담, 콘텐츠, 아이디어 기반 업무에서 강점이 나타납니다.",
    relationship: "여유와 따뜻함이 관계를 부드럽게 만드는 해입니다. 다만 지나치게 주기만 하다 보면 소진될 수 있으니, 받는 것에도 편안해지는 연습이 필요합니다.",
    health: "몸과 마음이 비교적 안정되지만, 즐거움을 위해 과식하거나 지나치게 편안함을 추구하다 보면 생활 리듬이 흐트러질 수 있습니다.",
    caution: "너무 여유로운 태도가 기회를 놓치게 만들 수 있습니다. 편안함 속에서도 실행을 놓치지 않는 것이 중요합니다.",
    advice: "내가 즐기면서 할 수 있는 일이 이 해에는 가장 큰 성과를 냅니다. 억지로 하는 일보다 자연스럽게 흘러나오는 표현에 투자하세요.",
  },
  "상관": {
    yearlyTheme: "이 해는 기존의 틀을 깨고 새로운 방식으로 나아가는 에너지가 강합니다. 말과 표현이 기회가 되기도 하고, 기존 관계나 구조와의 충돌 원인이 되기도 합니다.",
    money: "재물은 창의적인 방식, 새로운 아이디어, 기존과 다른 접근법으로 열립니다. 다만 실행력이 뒷받침되지 않으면 아이디어만 남고 수익은 생기지 않을 수 있습니다.",
    career: "변화와 혁신이 필요한 자리에서 강점이 발휘됩니다. 기존 질서를 따르기보다 새로운 방법을 제시하는 역할이 잘 맞으며, 창업이나 독립적인 프로젝트에도 좋은 시기입니다.",
    relationship: "말과 표현이 풍부하지만 날카로울 수 있습니다. 가까운 사람에게 정확한 말이 차갑게 들릴 수 있으므로, 상대의 감정 리듬을 먼저 파악한 후 대화를 시작하는 것이 필요합니다.",
    health: "신경 소모와 산만함이 건강의 약점이 될 수 있습니다. 생각과 계획이 과잉되면 수면의 질이 떨어지므로, 하루를 정리하는 시간을 의도적으로 만들어야 합니다.",
    caution: "날카로운 말, 기존 체계와의 충돌, 감정적 발언이 관계와 기회를 동시에 잃게 만들 수 있습니다.",
    advice: "표현력을 강점으로 쓰되, 관계 안에서는 결론보다 과정을 먼저 보여주는 방식으로 소통하면 갈등 없이 영향력을 키울 수 있습니다.",
  },
  "편재": {
    yearlyTheme: "이 해는 다양한 기회와 가능성이 열리는 흐름입니다. 사람, 돈, 정보가 활발하게 움직이며 넓은 무대에서 활동하는 힘이 강해집니다.",
    money: "재물이 다양한 방향으로 들어오지만 지출도 함께 커지는 구조입니다. 넓게 쓸수록 손이 열리는 만큼 관리가 중요하며, 투자와 고정 수익의 균형을 맞춰야 합니다.",
    career: "영업, 유통, 중개, 네트워크 기반 업무에서 성과가 강합니다. 사람을 통해 기회가 열리는 시기이므로 인맥 관리와 협업 구조 설계가 핵심 전략입니다.",
    relationship: "만남이 많아지고 다양한 인연이 들어오는 시기입니다. 새로운 사람에 대한 매력이 강해지지만 깊이보다 넓이를 쫓다 보면 진짜 관계를 놓칠 수 있습니다.",
    health: "활동량이 많아지면서 에너지 소모가 커집니다. 과식, 음주, 불규칙한 생활이 체력 저하로 이어질 수 있으니 기본 루틴을 지키는 것이 중요합니다.",
    caution: "충동적인 투자, 과도한 지출, 큰 판에 대한 욕심이 재물을 흩어지게 만들 수 있습니다.",
    advice: "기회를 모두 잡으려 하기보다 가장 현실성 있는 한두 가지를 선택하고 깊이 파고드는 것이 이 해의 재물운을 키우는 방법입니다.",
  },
  "정재": {
    yearlyTheme: "이 해는 안정적이고 실질적인 성과를 차근차근 만들어가는 흐름이 강합니다. 일관된 노력이 현실적인 결과로 이어지는 시기이며, 기반을 다지는 것이 핵심입니다.",
    money: "꾸준한 수입이 늘어나는 구조입니다. 고정수익, 월급, 장기 계약처럼 안정된 구조에서 재물운이 강하게 살아납니다. 섣부른 투자보다 이미 가진 수입 구조를 다지는 것이 더 유리합니다.",
    career: "성실함과 전문성이 인정받는 시기입니다. 조직 안에서 꾸준히 성과를 쌓거나, 안정적인 클라이언트 기반을 확장하는 방향이 커리어에 긍정적으로 작동합니다.",
    relationship: "신뢰와 안정감을 중요하게 여기는 관계가 깊어지는 해입니다. 결혼이나 진지한 만남의 흐름이 강해질 수 있으며, 생활 조건과 책임에 대한 대화가 관계를 견고하게 만듭니다.",
    health: "큰 이상은 없지만 과로가 누적될 수 있습니다. 규칙적인 생활 리듬이 이 해의 건강을 지키는 가장 효과적인 방법입니다.",
    caution: "지나치게 보수적인 태도가 성장의 기회를 놓치게 만들 수 있습니다. 안전만 추구하다 보면 확장의 타이밍을 잃습니다.",
    advice: "지금 당신이 가진 것의 가치를 정확히 알고, 그것을 더 단단하게 만드는 것이 이 해의 가장 강력한 전략입니다.",
  },
  "편관": {
    yearlyTheme: "이 해는 압박과 도전이 강해지는 동시에 그것을 이겨낼 때 가장 큰 성장이 일어나는 시기입니다. 외부의 요구와 책임이 커지지만, 그 무게를 받아내는 힘도 함께 올라옵니다.",
    money: "재물 흐름은 안정보다 변동성이 큰 구조입니다. 사업, 독립, 성과 기반 수익 구조에서 큰 기회가 생길 수 있지만, 예상치 못한 지출이나 위험 요소도 함께 관리해야 합니다.",
    career: "강한 책임감과 도전 정신이 커리어에서 빛을 발하는 시기입니다. 남들이 피하는 자리, 어려운 프로젝트를 맡을수록 실력이 증명됩니다. 다만 번아웃을 주의해야 합니다.",
    relationship: "관계에서도 강한 에너지가 작동합니다. 리더십을 발휘하는 것이 좋지만 너무 강하게 밀어붙이면 주변이 부담을 느낄 수 있으므로 강약 조절이 필요합니다.",
    health: "몸이 혹독하게 쓰이는 시기입니다. 근골격계 긴장, 면역력 저하, 과로가 반복될 수 있으니 의도적인 휴식과 병원 점검이 필요합니다.",
    caution: "두려움에서 나온 결정보다 확신에서 나온 결정을 해야 합니다. 압박에 쫓기는 선택은 후회로 이어질 수 있습니다.",
    advice: "외부의 압력을 성장의 재료로 삼을 때 이 해의 운이 가장 강하게 살아납니다. 피하기보다 준비하고 마주서는 자세가 결과를 만듭니다.",
  },
  "정관": {
    yearlyTheme: "이 해는 사회적 역할과 책임이 부각되는 시기입니다. 원칙과 질서를 지키는 힘이 인정과 신뢰로 돌아오며, 커리어와 사회적 위치가 안정되는 흐름이 강합니다.",
    money: "재물은 실력과 신뢰를 기반으로 들어오는 구조입니다. 급격한 수익보다 꾸준한 수입과 사회적 인정이 재물의 흐름을 만들어냅니다. 계약, 공식적 합의, 안정된 수익 구조가 강점입니다.",
    career: "승진, 인정, 역할 확대가 일어날 수 있는 시기입니다. 조직 안에서의 신뢰도가 높아지며, 책임 있는 자리를 맡을 가능성이 커집니다. 공정함과 원칙을 지키는 태도가 핵심입니다.",
    relationship: "진지하고 신뢰할 수 있는 관계가 깊어지는 시기입니다. 결혼이나 장기적인 인연에 좋은 흐름이 생길 수 있으며, 공식적인 관계 전환의 기회가 찾아올 수 있습니다.",
    health: "과도한 책임감이 스트레스로 쌓일 수 있습니다. 몸보다 마음의 긴장이 먼저 신호를 보내므로, 완벽함보다 지속 가능한 수준을 유지하는 것이 건강운을 지키는 방법입니다.",
    caution: "틀에 너무 갇혀 유연성을 잃으면 기회를 놓칩니다. 원칙을 지키되 상황에 따라 유연하게 움직이는 것도 이 해의 필수 역량입니다.",
    advice: "책임과 인정이 함께 따라오는 해입니다. 사회적 위치를 높이고 싶다면 지금의 신뢰를 더 단단히 쌓는 것이 가장 효과적입니다.",
  },
  "편인": {
    yearlyTheme: "이 해는 내면의 감각과 직관이 강해지는 시기입니다. 논리보다 느낌으로 먼저 상황을 파악하는 힘이 발동되며, 독창적인 생각과 배움에 대한 욕구가 강해집니다.",
    money: "재물은 특정한 전문성이나 고유한 방식으로 들어오는 구조입니다. 일반적인 방법보다 남들이 잘 하지 않는 영역에서 수익 구조를 만들수록 성과가 납니다.",
    career: "연구, 기획, 저술, 전문 컨설팅처럼 깊이 있는 사고를 요구하는 분야에서 강점이 드러납니다. 팀워크보다 독립적인 작업 방식에서 더 높은 성취를 경험할 수 있습니다.",
    relationship: "관계에서 심리적인 거리감이 생기기 쉬운 시기입니다. 혼자 있는 시간을 즐기는 것이 좋지만, 중요한 사람과의 연결이 약해지지 않도록 의도적으로 소통하는 것이 필요합니다.",
    health: "신경계 과부하와 수면 불안정이 반복될 수 있습니다. 명상, 산책, 고요한 시간이 이 해의 건강을 유지하는 핵심 루틴입니다.",
    caution: "지나친 고독과 타인에 대한 경계가 고립으로 이어질 수 있습니다. 마음을 닫기보다 신뢰할 수 있는 한두 명과의 연결을 유지하세요.",
    advice: "내면의 통찰을 현실 결과물로 만드는 연습이 필요합니다. 아이디어와 직관을 실행으로 연결하는 습관이 이 해의 잠재력을 현실로 바꿉니다.",
  },
  "정인": {
    yearlyTheme: "이 해는 배움, 성장, 보호의 에너지가 강하게 작동합니다. 새로운 지식과 기술을 습득하거나 기존의 것을 더 깊이 이해하는 과정에서 큰 발전이 일어납니다.",
    money: "재물은 전문성, 자격, 신뢰를 기반으로 천천히 쌓여가는 구조입니다. 자격증, 교육, 전문 지식에 투자하면 장기적으로 수익 기반이 확장됩니다.",
    career: "교육, 연구, 법률, 의료, 상담처럼 신뢰와 전문성이 중요한 분야에서 성과가 납니다. 조언을 구하거나 멘토를 찾는 것도 이 해의 커리어에 긍정적으로 작동합니다.",
    relationship: "든든하고 안정적인 관계를 원하는 마음이 강해집니다. 상대에게 의지할수록 편안함이 생기지만, 지나친 의존은 자기 결정력을 약하게 만들 수 있습니다.",
    health: "심리적 안정이 신체 건강에도 직접 연결됩니다. 걱정과 불안이 쌓이면 위장과 면역 기능이 떨어질 수 있으니, 마음을 안정시키는 루틴이 중요합니다.",
    caution: "지나치게 보호받으려는 태도가 성장을 막을 수 있습니다. 도움을 받는 것과 스스로 결정하는 것 사이의 균형이 필요합니다.",
    advice: "이 해의 성장은 빠른 성과보다 깊은 이해에서 나옵니다. 멀리 보고 차근차근 쌓아가는 방식이 이 해를 가장 풍요롭게 만듭니다.",
  },
  "미정": {
    yearlyTheme: "이 해는 다양한 가능성이 열려 있는 시기입니다. 세운의 방향이 원국과 복잡하게 얽혀 있어 단일한 흐름이 아닌 상황에 따른 유연한 대응이 필요합니다.",
    money: "재물의 흐름은 고정된 패턴보다 변수에 따라 달라집니다. 월별 점수와 월운의 강약을 면밀히 살피며 기회와 위험을 분리 운영하는 것이 중요합니다.",
    career: "특정한 방향보다 다양한 가능성을 열어두고 움직이는 시기입니다. 지금 있는 자리에서 역량을 키우면서 새로운 기회가 왔을 때 빠르게 반응할 수 있는 준비가 필요합니다.",
    relationship: "관계에서 기대와 현실의 차이가 생기기 쉬운 시기입니다. 상대를 있는 그대로 보고 기대를 조율하는 태도가 관계를 안정시킵니다.",
    health: "전체적인 균형을 유지하는 것이 중요합니다. 어느 한 곳에 지나치게 에너지를 쏟으면 다른 영역이 무너질 수 있으니, 분산된 관리가 필요합니다.",
    caution: "방향이 명확하지 않을 때 충동적인 결정을 하면 뒤늦게 후회하는 상황이 생깁니다. 천천히 정보를 모으고 결정을 내리세요.",
    advice: "불확실성을 불안으로 받아들이기보다 가능성이 많은 시기로 해석하는 것이 이 해를 가장 잘 쓰는 방법입니다.",
  },
};

// ── 합충형해파 해석 라이브러리 ───────────────────────────────
const SAJU_YEARLY_RELATION_LIBRARY = {
  "합": {
    theme: "연결과 협력의 에너지가 강해지는 신호입니다.",
    career: "협업, 파트너십, 계약, 공식적인 연결이 강화됩니다. 주변 사람과의 공동 프로젝트나 팀 기반 성과가 개인 역량보다 더 크게 나타날 수 있는 시기입니다.",
    money: "합의 기운이 재성이나 식상을 건드릴 때 재물의 흐름이 열립니다. 계약, 파트너십, 공동 수익 구조에서 기회가 강해집니다.",
    relationship: "인연이 맺어지거나 기존 관계가 더 단단해지는 흐름입니다. 새로운 사람과 빠르게 연결되거나, 오래된 관계가 공식화될 수 있습니다.",
    caution: "합은 묶이는 에너지이기도 합니다. 잘못된 연결은 빠져나오기 어려워지므로, 파트너를 선택할 때 조건과 역할을 먼저 명확히 해야 합니다.",
    advice: "합의 에너지를 최대한 활용하려면 먼저 연결하고 싶은 사람이나 방향을 선명하게 정해두는 것이 필요합니다.",
  },
  "충": {
    theme: "변화와 이동, 전환의 압력이 강해지는 신호입니다.",
    career: "직업의 전환, 이직, 사업 구조 변경, 이동이 일어날 수 있습니다. 기존 방식을 고집하면 충돌이 커지므로, 변화를 선제적으로 설계하는 것이 유리합니다.",
    money: "재물의 흐름에 예상치 못한 변동이 생깁니다. 갑작스러운 지출이나 수입 변화가 있을 수 있으므로, 비상 자금과 유동성을 미리 확보해야 합니다.",
    relationship: "관계에서 갈등이나 이별, 재편이 일어날 수 있습니다. 오래된 관계가 정리되거나 새로운 인연으로 빠르게 채워질 수 있습니다.",
    caution: "충의 시기에는 충동적인 결정이 큰 손실로 이어질 수 있습니다. 결정 전 최소 하루를 더 두고 생각하는 것이 안전합니다.",
    advice: "충의 에너지는 막을 수 없지만 방향을 잡을 수는 있습니다. 이동이나 변화가 불가피하다면 타이밍을 내가 선택하는 방식으로 전환해야 합니다.",
  },
  "형": {
    theme: "압박과 단련의 에너지가 작동하는 신호입니다.",
    career: "과도한 업무나 불합리한 요구가 쌓일 수 있습니다. 그러나 그 과정에서 실력이 검증되고 인정받는 기회가 생기기도 합니다.",
    money: "법적 분쟁, 계약 문제, 예상치 못한 비용이 발생할 수 있습니다. 문서와 계약 조항을 꼼꼼히 점검하는 것이 필요합니다.",
    relationship: "가까운 관계에서 갈등과 오해가 반복될 수 있습니다. 말보다 행동으로 보여주는 것이 관계를 안정시키는 방법입니다.",
    caution: "억압적인 상황에서 감정을 폭발시키면 더 큰 문제가 생깁니다. 참고 버티는 것과 분명하게 거절하는 것을 구분해야 합니다.",
    advice: "형의 에너지를 단련의 기회로 받아들이면, 이 해에 통과한 것들이 이후의 가장 큰 자산이 됩니다.",
  },
  "해": {
    theme: "미세한 오해와 관계의 어긋남이 발생하기 쉬운 신호입니다.",
    career: "팀 내에서 의사소통 문제나 역할 갈등이 생길 수 있습니다. 기대치를 명확히 공유하고, 의도를 직접 말로 전달하는 방식이 필요합니다.",
    money: "눈에 보이지 않는 손실, 예상치 못한 비용, 신뢰 관계에서의 금전 문제가 생길 수 있습니다.",
    relationship: "사소한 오해가 커지거나, 말하지 않아서 생기는 거리감이 관계를 소원하게 만들 수 있습니다.",
    caution: "해의 신호는 크게 드러나지 않아 무시하기 쉽습니다. 작은 불편함이나 어색함을 방치하지 말고 초기에 대화로 풀어야 합니다.",
    advice: "해의 에너지가 작동하는 시기에는 상대의 말을 글자 그대로 해석하기보다 맥락과 감정을 함께 읽는 것이 필요합니다.",
  },
  "파": {
    theme: "계획의 변경과 약속의 어긋남이 생기기 쉬운 신호입니다.",
    career: "진행 중이던 프로젝트가 예상치 못한 방향으로 흘러가거나, 합의가 뒤집히는 상황이 생길 수 있습니다.",
    money: "계획했던 수입이나 투자 결과가 달라질 수 있습니다. 유연한 대안을 미리 준비해두는 것이 손실을 줄이는 방법입니다.",
    relationship: "약속이나 기대가 어긋나면서 실망이 쌓일 수 있습니다. 처음부터 너무 확정적인 기대를 갖기보다 유연하게 접근하는 것이 좋습니다.",
    caution: "파의 에너지가 강할 때 고집을 부리면 손실이 커집니다. 상황이 바뀌면 계획도 바꾸는 유연성이 필요합니다.",
    advice: "파의 신호가 보인다면 단기 계획보다 장기 방향을 먼저 확인하고, 세부 사항은 여유 있게 수정하는 방식으로 운영하세요.",
  },
};

// ── 신년운세 로컬 상담문 생성 라이브러리 ───────────────────────────────
function getTenGodLib(tenGod) {
  return SAJU_YEARLY_TEN_GOD_LIBRARY[tenGod] || SAJU_YEARLY_TEN_GOD_LIBRARY["미정"];
}

function getMainRelationLib(relations) {
  const types = (relations || []).map((r) => r.type);
  for (const t of ["충", "형", "합", "해", "파"]) {
    if (types.includes(t)) return SAJU_YEARLY_RELATION_LIBRARY[t];
  }
  return null;
}

function describeMonthlyGroup(months, seed) {
  if (!months || months.length === 0) return "";
  const annual = seed.saju.annualLuck;
  const parts = months.map((item) => {
    const tone = item.score >= 75 ? "이 시기는 확장과 실행에 적합한 흐름" : item.score >= 60 ? "이 시기는 안정적인 운영에 어울리는 흐름" : "이 시기는 보수적인 판단과 점검이 필요한 흐름";
    const branchKo = { 子: "자수", 丑: "축토", 寅: "인목", 卯: "묘목", 辰: "진토", 巳: "사화", 午: "오화", 未: "미토", 申: "신금", 酉: "유금", 戌: "술토", 亥: "해수" };
    const stemKo = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
    const stemName = stemKo[item.pillar?.stem] || item.pillar?.stem || "";
    const branchName = branchKo[item.pillar?.branch] || item.pillar?.branch || "";
    return `${item.month}월은 ${stemName}${branchName} 월운으로 ${tone}입니다. ${item.advice} `;
  });
  const highMonths = months.filter((m) => m.score >= 75);
  const lowMonths = months.filter((m) => m.score < 60);
  let summary = "";
  if (highMonths.length > 0) {
    summary += `이 구간에서 ${highMonths.map((m) => `${m.month}월`).join("과 ")}에는 ${annual.label} 세운의 기운이 현실 성과로 연결되기 좋은 시기이므로, 중요한 제안이나 계획 실행을 이 달에 맞추는 것이 유리합니다. `;
  }
  if (lowMonths.length > 0) {
    summary += `반면 ${lowMonths.map((m) => `${m.month}월`).join("과 ")}에는 일정을 과도하게 확장하기보다 현재 상황을 점검하고 다음 기회를 준비하는 데 에너지를 쓰는 것이 더 안전합니다. `;
  }
  return parts.join("") + "\n\n" + summary;
}

function buildInterpretationSeeds(seed) {
  const annual = seed.saju.annualLuck;
  const tenGodLib = getTenGodLib(annual.tenGod);
  const dayMaster = seed.saju.dayMaster || "戊";
  const dayElement = STEM_ELEMENT[dayMaster] || "earth";
  const dayElementKo = ELEMENT_KO[dayElement] || "토";
  const annualElementKo = annual.elementKo || "토";
  const monthPillar = seed.saju.pillars?.month?.branch || "";
  const dayPillar = seed.saju.pillars?.day?.branch || "";
  const relations = seed.saju.relations?.branchRelations || [];
  const clashes = relations.filter((r) => r.type === "충");
  const combos = relations.filter((r) => r.type === "합");
  const monthlyStrong = seed.saju.monthlyLuck.filter((m) => m.score >= 75).map((m) => `${m.month}월`);
  const monthlyCare = seed.saju.monthlyLuck.filter((m) => m.score < 60).map((m) => `${m.month}월`);
  const hasClash = clashes.length > 0;
  const hasCombo = combos.length > 0;
  const seasonLabel = ["寅", "卯", "辰"].includes(annual.branch) ? "봄" : ["巳", "午", "未"].includes(annual.branch) ? "여름" : ["申", "酉", "戌"].includes(annual.branch) ? "가을" : "겨울";

  return {
    yearlyTheme: [
      `${seed.targetYear}년은 ${annual.label} 세운입니다. 이 해는 ${annualElementKo} 기운이 핵심 에너지로 작동하며, 일간 ${dayMaster}와의 관계는 ${annual.tenGod}으로 읽힙니다. ${tenGodLib.yearlyTheme}`,
      `${annual.dayMasterRelation}의 방식으로 세운이 원국에 들어오는 만큼, 이 해는 ${hasClash ? "변화와 이동의 압력이 강한 해" : hasCombo ? "연결과 협력의 기회가 열리는 해" : "운영과 균형 조정이 핵심인 해"}입니다. ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).join("·") + "에 기회가 집중되고" : "전반적으로 기회가 분산되며"}, ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).join("·") + "에는 보수적인 판단이 필요합니다." : "큰 위험 구간은 없습니다."}`,
    ],
    career: [
      `${tenGodLib.career} ${annual.dayMasterRelation}의 흐름 속에서 일은 ${annual.tenGod === "식신" || annual.tenGod === "상관" ? "표현력과 창의성을 발휘하는 방향" : annual.tenGod === "편관" || annual.tenGod === "정관" ? "책임과 역할 확대의 방향" : annual.tenGod === "편재" || annual.tenGod === "정재" ? "성과 관리와 수익 구조화의 방향" : "자기 기반을 강화하는 방향"}으로 전략을 짜야 합니다.`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).join("·") + "는 커리어에서 제안, 발표, 전환의 타이밍으로 활용하기 좋습니다." : "올해는 전반적으로 꾸준한 성과 축적이 커리어 전략의 핵심입니다."} ${hasClash ? "충 신호가 있는 만큼 직업 변화나 이직을 고려한다면 이 해가 자연스러운 전환점이 될 수 있습니다." : hasCombo ? "합 신호가 있어 협업과 파트너십 기반의 커리어 확장이 유리합니다." : ""}`,
    ],
    wealth: [
      `${tenGodLib.money} 세운 ${annual.label}의 ${annualElementKo} 기운이 원국의 ${dayElementKo} 일간과 ${annual.dayMasterRelation} 관계를 이루는 만큼, 재물의 흐름은 ${annual.tenGod === "편재" || annual.tenGod === "정재" ? "직접 관리하고 구조화할수록" : annual.tenGod === "식신" || annual.tenGod === "상관" ? "생산과 표현을 통해 수익으로 전환할수록" : "기반을 다지고 안정을 확보할수록"} 더 살아납니다.`,
      `${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).join("·") + "에는 계약, 투자, 큰 지출 결정을 보류하거나 점검하는 것이 안전합니다." : "월별 점수가 고르게 분포되어 있어 꾸준한 재물 관리가 유효합니다."} ${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 2).join("·") + "에는 새로운 수익 구조를 제안하거나 계약을 확정하기 좋은 타이밍입니다." : ""}`,
    ],
    love: [
      `${tenGodLib.relationship} ${dayPillar ? dayPillar + " 일지의 성격이 올해의 관계 흐름과 만나면서" : "일지의 에너지가 세운과 만나면서"} ${hasClash && clashes.some((c) => c.label === "일지") ? "관계에서 이동과 전환의 압력이 강해집니다." : hasCombo && combos.some((c) => c.label === "일지") ? "새로운 인연이나 관계의 발전 가능성이 열립니다." : "관계의 방향을 조율하고 안정을 찾는 흐름이 강합니다."}`,
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 3).join("·") + "에는 감정 표현과 만남의 기회가 더 자연스럽게 열립니다." : ""} 사랑에서 중요한 것은 감정의 크기보다 말과 행동의 일관성입니다. 이 해에는 기대치를 먼저 말로 정리하고, 상대와 함께 방향을 확인하는 방식이 관계를 안정시키는 핵심 전략입니다.`,
    ],
    relationships: [
      `${tenGodLib.yearlyTheme} 올해의 인간관계는 ${hasClash ? "갈등과 재편의 에너지가 강하게 작동하는 만큼 역할과 경계를 미리 정해두는 것이 충돌을 줄이는 방법입니다." : hasCombo ? "연결과 협력의 기운이 강해 귀인과 파트너가 들어오기 좋은 시기입니다." : "새로운 관계보다 기존 관계의 질을 높이는 방향이 더 유리합니다."}`,
      `말의 온도와 타이밍이 이 해의 인간관계를 좌우합니다. ${annual.tenGod === "상관" ? "표현력이 강한 만큼 의도와 다르게 전달되는 상황을 주의해야 합니다." : annual.tenGod === "비견" || annual.tenGod === "겁재" ? "경쟁심이 관계 안으로 들어오지 않도록 역할 경계를 명확히 하는 것이 필요합니다." : "상대의 상황을 먼저 파악하고 대화하는 순서가 관계 갈등을 줄여줍니다."}`,
    ],
    health: [
      `${tenGodLib.health} ${annualElementKo} 기운이 강해지는 해이므로, ${annualElementKo === "목" ? "간, 근골격계, 신경 쪽의 긴장이 누적될 수 있습니다." : annualElementKo === "화" ? "심장, 혈압, 열성 체질의 과부하를 주의해야 합니다." : annualElementKo === "토" ? "소화기, 위장, 과식 습관을 점검해야 합니다." : annualElementKo === "금" ? "폐, 피부, 호흡기 관리가 중요합니다." : "신장, 방광, 수분 관리와 냉증에 주의해야 합니다."}`,
      `생활 리듬이 흔들리면 전반적인 건강운이 떨어집니다. 수면, 식사 시간, 운동 루틴을 작은 단위로 고정하는 것이 이 해의 건강을 지키는 가장 현실적인 방법입니다. ${monthlyCare.length > 0 ? monthlyCare.slice(0, 2).join("·") + "에는 과로와 무리한 스케줄을 피하는 것이 좋습니다." : ""}`,
    ],
    monthly: seed.saju.monthlyLuck.map((item) => {
      const stemKo = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
      const branchKo = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
      const sn = stemKo[item.pillar?.stem] || item.pillar?.stem || "";
      const bn = branchKo[item.pillar?.branch] || item.pillar?.branch || "";
      const toneKo = item.tone === "확장" ? "확장·실행" : item.tone === "정비" ? "정비·유지" : "보수·점검";
      return `${item.month}월(${sn}${bn}): ${toneKo} 흐름. ${item.score}점. ${item.advice}`;
    }),
    opportunities: [
      `${monthlyStrong.length > 0 ? monthlyStrong.slice(0, 4).join("·") + "에는 세운의 긍정적 에너지가 가장 강하게 작동합니다." : "올해는 꾸준한 준비와 실행이 가장 큰 기회를 만듭니다."}`,
      `${hasCombo ? "합의 기운이 작동하는 만큼 파트너십, 협업, 계약 기반의 기회가 강하게 열립니다." : hasClash ? "충의 기운이 있어 기존 구조에서 벗어나 새로운 방향으로 전환하는 기회가 열립니다." : "안정적인 흐름 속에서 기반을 다지고 확장을 준비하는 것이 가장 효과적입니다."}`,
    ],
    risks: [
      `${monthlyCare.length > 0 ? monthlyCare.slice(0, 3).join("·") + "에는 중요한 결정을 서두르지 말고 점검과 보완에 더 집중하는 것이 안전합니다." : "올해는 전반적으로 위험 구간이 고르게 분산되어 있어 항상 일정한 수준의 관리가 필요합니다."}`,
      `${tenGodLib.caution} ${hasClash ? "충 신호가 있는 달에는 계약, 이동, 감정적 결정을 하루 이상 유보하는 습관이 손실을 줄여줍니다." : ""}`,
    ],
    finalStrategy: [
      `올해의 전략은 세운 ${annual.label}의 ${annual.tenGod} 흐름을 현실 선택의 기준으로 쓰는 것입니다. ${tenGodLib.advice}`,
      `${seed.targetYear}년을 마무리하는 시점에 "올해 나는 무엇을 얻었고 무엇을 내려놓았는가"라는 질문에 선명하게 답할 수 있도록, 지금부터 분기별 목표를 작게 쪼개어 실행하는 것이 가장 효과적인 연간 전략입니다.`,
    ],
  };
}

// 카테고리별 사주 근거는 계산 JSON과 LLM 검증 단계에서만 사용합니다.

function localSexagenaryYear(year) {
  const index = ((toInt(year, 1984) - 1984) % 60 + 60) % 60;
  const stem = LOCAL_STEMS[index % 10];
  const branch = LOCAL_BRANCHES[index % 12];
  return { stem, branch, label: `${stem}${branch}` };
}

function localMonthPillar(targetYear, month) {
  const yearStemIndex = LOCAL_STEMS.indexOf(localSexagenaryYear(targetYear).stem);
  const firstMonthStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10;
  const stem = LOCAL_STEMS[(firstMonthStemIndex + month - 1) % 10];
  const branch = LOCAL_MONTH_BRANCHES[(month - 1) % 12];
  return { month, stem, branch, label: `${stem}${branch}`, element: LOCAL_BRANCH_ELEMENT[branch] || LOCAL_STEM_ELEMENT[stem] || "earth" };
}

function localElementRelation(dayElement, otherElement) {
  if (!dayElement || !otherElement) return "균형 조정";
  if (dayElement === otherElement) return "자기 강화";
  if (LOCAL_GENERATES[dayElement] === otherElement) return "표현과 생산";
  if (LOCAL_GENERATES[otherElement] === dayElement) return "지원과 회복";
  if (LOCAL_CONTROLS[dayElement] === otherElement) return "관리와 재물";
  if (LOCAL_CONTROLS[otherElement] === dayElement) return "압박과 책임";
  return "균형 조정";
}

function localTenGod(dayStem, otherStem) {
  const dayElement = LOCAL_STEM_ELEMENT[dayStem];
  const otherElement = LOCAL_STEM_ELEMENT[otherStem];
  if (!dayElement || !otherElement) return "미정";
  const samePolarity = LOCAL_STEMS.indexOf(dayStem) % 2 === LOCAL_STEMS.indexOf(otherStem) % 2;
  if (dayElement === otherElement) return samePolarity ? "비견" : "겁재";
  if (LOCAL_GENERATES[dayElement] === otherElement) return samePolarity ? "식신" : "상관";
  if (LOCAL_CONTROLS[dayElement] === otherElement) return samePolarity ? "편재" : "정재";
  if (LOCAL_CONTROLS[otherElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (LOCAL_GENERATES[otherElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "미정";
}

function localRelationRows(pillars, annualBranch) {
  const natal = [
    ["연지", pillars?.year?.branch],
    ["월지", pillars?.month?.branch],
    ["일지", pillars?.day?.branch],
    ["시지", pillars?.hour?.branch],
  ].filter(([, branch]) => branch);
  const rows = [];
  for (const [label, branch] of natal) {
    if (LOCAL_BRANCH_COMBOS[annualBranch] === branch) rows.push({ type: "합", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 합을 이루어 연결과 협력의 기운이 살아납니다.` });
    if (LOCAL_BRANCH_CLASHES[annualBranch] === branch) rows.push({ type: "충", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 충을 이루어 이동, 변화, 결정 압력이 커집니다.` });
    if (LOCAL_BRANCH_HARMS[annualBranch] === branch) rows.push({ type: "해", label, branch, message: `${label} ${branch}와 세운 ${annualBranch} 사이에 미세한 오해와 관계 조율의 과제가 생깁니다.` });
    if (LOCAL_BRANCH_BREAKS[annualBranch] === branch) rows.push({ type: "파", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 파를 이루어 계획 변경과 약속 관리가 중요해집니다.` });
  }
  return rows;
}

function normalizeElementName(value) {
  const raw = clean(value).toLowerCase();
  if (!raw) return "";
  if (/wood|목|甲|乙|寅|卯/.test(raw)) return "wood";
  if (/fire|화|丙|丁|巳|午/.test(raw)) return "fire";
  if (/earth|토|戊|己|辰|戌|丑|未/.test(raw)) return "earth";
  if (/metal|금|庚|辛|申|酉/.test(raw)) return "metal";
  if (/water|수|壬|癸|亥|子/.test(raw)) return "water";
  return "";
}

function collectElementHints(source, preferredKeys = []) {
  const out = [];
  const seen = new Set();
  const push = (value) => {
    const element = normalizeElementName(value);
    if (element && !seen.has(element)) {
      seen.add(element);
      out.push(element);
    }
  };
  const visit = (value, depth = 0) => {
    if (depth > 3 || value == null) return;
    if (typeof value === "string" || typeof value === "number") {
      push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof value === "object") {
      const keys = preferredKeys.length ? preferredKeys : Object.keys(value);
      keys.forEach((key) => visit(value?.[key], depth + 1));
    }
  };
  visit(source);
  return out;
}

function inferJohuProfile(pillars = {}, usefulGods = {}) {
  const monthBranch = clean(pillars?.month?.branch || "");
  const rawType = clean(usefulGods?.johu?.type || usefulGods?.johu?.name || usefulGods?.johuType || "").toLowerCase();
  let type = "neutral";
  if (/hot|warm|조열|더움|화/.test(rawType) || ["巳", "午", "未"].includes(monthBranch)) type = "hot";
  else if (/cold|cool|한랭|추움|수/.test(rawType) || ["亥", "子", "丑", "寅"].includes(monthBranch)) type = "cold";
  else if (["申", "酉", "戌"].includes(monthBranch)) type = "dry";

  const favorable = type === "hot"
    ? ["water", "metal"]
    : type === "cold"
      ? ["fire", "wood"]
      : type === "dry"
        ? ["water", "wood"]
        : [];
  const caution = type === "hot"
    ? ["fire", "wood"]
    : type === "cold"
      ? ["water", "metal"]
      : type === "dry"
        ? ["metal", "earth"]
        : [];

  return {
    type,
    monthBranch,
    favorable,
    caution,
    summary: type === "hot"
      ? "조후상 열기가 강하므로 수·금의 냉각과 정리가 균형을 돕습니다."
      : type === "cold"
        ? "조후상 한기가 강하므로 화·목의 온기와 생장이 균형을 돕습니다."
        : type === "dry"
          ? "조후상 건조함이 두드러지므로 수·목의 순환과 유연성이 균형을 돕습니다."
          : "조후는 극단보다 균형 조정 관점에서 보정합니다.",
  };
}

function buildQuantumElementRoles({ pillars = {}, fiveElements = {}, usefulGods = {} } = {}) {
  const elements = ["wood", "fire", "earth", "metal", "water"];
  const counts = fiveElements?.counts || fiveElements?.scores || fiveElements?.ratio || fiveElements || {};
  const strongest = dominantElement(fiveElements, "earth");
  const weakest = elements.slice().sort((a, b) => Number(counts?.[a] || 0) - Number(counts?.[b] || 0))[0] || "water";
  const total = elements.reduce((sum, el) => sum + Number(counts?.[el] || 0), 0);
  const dominantCount = Number(counts?.[strongest] || 0);
  const possibleJong = total > 0 && dominantCount >= 5 && dominantCount / total >= 0.55;
  const johu = inferJohuProfile(pillars, usefulGods);
  const usefulHints = collectElementHints(usefulGods, ["yong", "hi", "hee", "useful", "yongsin", "huisin", "primary", "secondary"]);
  const cautionHints = collectElementHints(usefulGods, ["gisin", "kishin", "avoid", "忌神", "bad"]);
  const useful = usefulHints.length ? usefulHints : [weakest];
  const caution = cautionHints.length ? cautionHints : [strongest].filter((el) => Number(counts?.[el] || 0) >= 3);
  const roleByElement = {};

  elements.forEach((element) => {
    let score = 0;
    const reasons = [];
    if (useful.includes(element)) {
      score += 2;
      reasons.push("용신·희신 후보");
    }
    if (caution.includes(element)) {
      score -= 2;
      reasons.push("기신·과다 후보");
    }
    if (johu.favorable.includes(element)) {
      score += 2;
      reasons.push("조후 보정 유리");
    }
    if (johu.caution.includes(element)) {
      score -= 2;
      reasons.push("조후 보정 주의");
    }
    if (possibleJong && (element === strongest || element === LOCAL_GENERATES[strongest])) {
      score += 1;
      reasons.push("종격 추정 흐름 보조");
    }
    if (possibleJong && element === LOCAL_CONTROLS[strongest]) {
      score -= 1;
      reasons.push("종격 추정 흐름 제어");
    }

    const role = score >= 2 ? "good" : score <= -2 ? "bad" : "neutral";
    roleByElement[element] = {
      element,
      label: LOCAL_ELEMENT_KO[element] || element,
      role,
      roleLabel: role === "good" ? "유리" : role === "bad" ? "주의" : "중립",
      score,
      reasons: reasons.length ? reasons : ["균형 관찰"],
    };
  });

  return {
    mode: "조후+억부+합화 보정",
    johu,
    strongest,
    weakest,
    possibleJong,
    usefulElements: useful,
    cautionElements: caution,
    roles: elements.map((element) => roleByElement[element]),
    roleByElement,
  };
}

function analyzeQuantumHap({ pillar = {}, natalPillars = {}, roleByElement = {}, label = "" } = {}) {
  const ganHap = { 甲: { 己: "earth" }, 己: { 甲: "earth" }, 乙: { 庚: "metal" }, 庚: { 乙: "metal" }, 丙: { 辛: "water" }, 辛: { 丙: "water" }, 丁: { 壬: "wood" }, 壬: { 丁: "wood" }, 戊: { 癸: "fire" }, 癸: { 戊: "fire" } };
  const jiHap = { 子: { 丑: "earth" }, 丑: { 子: "earth" }, 寅: { 亥: "wood" }, 亥: { 寅: "wood" }, 卯: { 戌: "fire" }, 戌: { 卯: "fire" }, 辰: { 酉: "metal" }, 酉: { 辰: "metal" }, 巳: { 申: "water" }, 申: { 巳: "water" }, 午: { 未: "fire" }, 未: { 午: "fire" } };
  const natalStems = [natalPillars?.year?.stem, natalPillars?.month?.stem, natalPillars?.day?.stem, natalPillars?.hour?.stem].filter(Boolean);
  const natalBranches = [natalPillars?.year?.branch, natalPillars?.month?.branch, natalPillars?.day?.branch, natalPillars?.hour?.branch].filter(Boolean);
  const results = [];
  const pushResult = (type, src, partner, hapElement, originalElement) => {
    const before = roleByElement?.[originalElement]?.role || "neutral";
    const after = roleByElement?.[hapElement]?.role || "neutral";
    const effect = after === "good" && before !== "good" ? "supportive" : after === "bad" ? "caution" : "neutral";
    results.push({
      type,
      label,
      src,
      partner,
      originalElement,
      originalRole: before,
      transformedElement: hapElement,
      transformedRole: after,
      effect,
      changed: before !== after,
      summary: `${label || "운"} ${src}와 원국 ${partner}의 ${type}은 ${LOCAL_ELEMENT_KO[hapElement] || hapElement} 기운으로 합화되어 ${effect === "supportive" ? "용신 방향의 기회" : effect === "caution" ? "기신 방향의 과몰입 주의" : "중립 보정"}로 읽힙니다.`,
    });
  };

  natalStems.forEach((stem) => {
    const hapElement = ganHap[pillar?.stem]?.[stem] || ganHap[stem]?.[pillar?.stem];
    if (hapElement) pushResult("천간합", pillar.stem, stem, hapElement, LOCAL_STEM_ELEMENT[pillar.stem] || hapElement);
  });
  natalBranches.forEach((branch) => {
    const hapElement = jiHap[pillar?.branch]?.[branch] || jiHap[branch]?.[pillar?.branch];
    if (hapElement) pushResult("지지합", pillar.branch, branch, hapElement, LOCAL_BRANCH_ELEMENT[pillar.branch] || hapElement);
  });
  return results;
}

function decisionFromScore(score) {
  return score >= 75 ? "GO" : score >= 60 ? "WATCH" : "STOP";
}

function toneFromScore(score) {
  return score >= 75 ? "확장" : score >= 60 ? "정비" : "보수";
}

function buildQuantumPillarJudgement({ pillar = {}, natalPillars = {}, elementRoles = {}, relations = [], label = "", baseScore = 62 } = {}) {
  const element = pillar?.element || LOCAL_BRANCH_ELEMENT[pillar?.branch] || LOCAL_STEM_ELEMENT[pillar?.stem] || "earth";
  const role = elementRoles.roleByElement?.[element] || { role: "neutral", roleLabel: "중립", reasons: ["균형 관찰"] };
  const hapHwa = analyzeQuantumHap({ pillar, natalPillars, roleByElement: elementRoles.roleByElement, label });
  const supportiveHap = hapHwa.filter((item) => item.effect === "supportive").length;
  const cautionHap = hapHwa.filter((item) => item.effect === "caution").length;
  const comboCount = relations.filter((item) => item.type === "합").length;
  const clashCount = relations.filter((item) => item.type === "충").length;
  const subtleRiskCount = relations.filter((item) => item.type === "해" || item.type === "파" || item.type === "형").length;
  const roleAdjustment = role.role === "good" ? 7 : role.role === "bad" ? -8 : 0;
  const hapAdjustment = supportiveHap * 4 - cautionHap * 5;
  const relationAdjustment = comboCount * 3 - clashCount * 6 - subtleRiskCount * 3;
  const quantumAdjustment = clamp(roleAdjustment + hapAdjustment + relationAdjustment, -18, 18);
  const finalScore = clamp(Math.round(Number(baseScore || 62) + quantumAdjustment), 0, 100);
  const decision = decisionFromScore(finalScore);
  const reasons = [
    `${LOCAL_ELEMENT_KO[element] || element} 오행 ${role.roleLabel}`,
    ...role.reasons,
    supportiveHap ? `용신 방향 합화 ${supportiveHap}건` : "",
    cautionHap ? `기신 방향 합화 ${cautionHap}건` : "",
    comboCount ? `합 ${comboCount}건` : "",
    clashCount ? `충 ${clashCount}건` : "",
    subtleRiskCount ? `해·파 ${subtleRiskCount}건` : "",
  ].filter(Boolean);

  return {
    label,
    pillar,
    element,
    elementLabel: LOCAL_ELEMENT_KO[element] || element,
    elementRole: role.role,
    elementRoleLabel: role.roleLabel,
    baseScore: Math.round(Number(baseScore || 62)),
    quantumAdjustment,
    finalScore,
    decision,
    tone: toneFromScore(finalScore),
    hapHwa,
    relations,
    reasons,
    summary: `${label || "운"}은 ${formatNewYearGanjiForCustomer(pillar?.label || "")} ${LOCAL_ELEMENT_KO[element] || element} 기운이며, 세밀한 보정을 더하면 ${displayNewYearDecision(decision)} 흐름에 가깝습니다.`,
  };
}

function buildQuantumMyeongriLayer({ computed, targetYear, annualLuck, monthlyLuck = [] } = {}) {
  const elementRoles = buildQuantumElementRoles({
    pillars: computed?.pillars || {},
    fiveElements: computed?.fiveElements || {},
    usefulGods: computed?.usefulGods || {},
  });
  const annualPillar = {
    year: targetYear,
    stem: annualLuck?.stem,
    branch: annualLuck?.branch,
    label: annualLuck?.label,
    element: annualLuck?.element,
  };
  const annualRelations = localRelationRows(computed?.pillars || {}, annualPillar.branch);
  const annualQuantum = buildQuantumPillarJudgement({
    pillar: annualPillar,
    natalPillars: computed?.pillars || {},
    elementRoles,
    relations: annualRelations,
    label: `${targetYear}년 세운`,
    baseScore: 68,
  });
  const monthlyQuantum = monthlyLuck.map((item) => {
    const relations = localRelationRows(computed?.pillars || {}, item?.pillar?.branch);
    return {
      month: item.month,
      ...buildQuantumPillarJudgement({
        pillar: item.pillar,
        natalPillars: computed?.pillars || {},
        elementRoles,
        relations,
        label: `${item.month}월 월운`,
        baseScore: item.score,
      }),
    };
  });
  const favorableElements = elementRoles.roles.filter((item) => item.role === "good").map((item) => item.label);
  const cautionElements = elementRoles.roles.filter((item) => item.role === "bad").map((item) => item.label);
  const riskCorrection = monthlyQuantum.map((item) => ({
    month: item.month,
    decision: item.decision,
    finalScore: item.finalScore,
    correction: item.quantumAdjustment,
    message: item.decision === "GO"
      ? `${item.month}월은 합화·용신 보정이 살아나 실행성이 높습니다.`
      : item.decision === "STOP"
        ? `${item.month}월은 기신·충해파 보정이 겹치므로 큰 결정을 늦추는 편이 안전합니다.`
        : `${item.month}월은 기회와 부담이 공존하므로 점검 후 실행하는 흐름입니다.`,
  }));

  return {
    version: "new-year-quantum-v1",
    mode: elementRoles.mode,
    elementRoles: elementRoles.roles,
    favorableElements,
    cautionElements,
    johuType: elementRoles.johu.type,
    johuSummary: elementRoles.johu.summary,
    annualQuantum,
    monthlyQuantum,
    riskCorrection,
    professionalSummary: `정밀 보정으로 살피면 유리 오행은 ${favorableElements.join("·") || "중립"}이고, 주의 오행은 ${cautionElements.join("·") || "중립"}입니다. ${elementRoles.johu.summary} 세운 ${formatNewYearGanjiForCustomer(annualLuck?.label || "")}은 ${annualQuantum.elementRoleLabel} 흐름으로 읽히며, 월별 실행과 정비의 강약은 기본 월운에 합화와 용신·기신 보정을 더해 해석합니다.`,
  };
}

function buildLocalMonthlyLuck(targetYear, dayStem) {
  const dayElement = LOCAL_STEM_ELEMENT[dayStem] || "earth";
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const pillar = localMonthPillar(targetYear, month);
    const relation = localElementRelation(dayElement, pillar.element);
    const score = clamp(62 + (relation === "지원과 회복" ? 12 : relation === "표현과 생산" ? 8 : relation === "관리와 재물" ? 6 : relation === "압박과 책임" ? -7 : 2) + ((month * 7 + targetYear) % 9), 38, 92);
    const tone = score >= 75 ? "확장" : score >= 60 ? "정비" : "보수";
    return { month, pillar, relation, score: Math.round(score), tone, advice: `${month}월은 ${pillar.label} 월운과 ${LOCAL_ELEMENT_KO[pillar.element] || "오행"} 기운이 들어오므로 ${tone} 관점으로 일정과 선택을 조절하는 것이 좋습니다.` };
  });
}

function buildPdfSeed(profile, targetYear, body = {}) {
  const computed = normalizeEngineSaju(profile, body);
  const annual = localSexagenaryYear(targetYear);
  const annualElement = LOCAL_BRANCH_ELEMENT[annual.branch] || LOCAL_STEM_ELEMENT[annual.stem] || "earth";
  const dayStem = computed.dayMaster || computed.pillars.day?.stem || "戊";
  const annualLuck = {
    year: targetYear,
    ...annual,
    element: annualElement,
    elementKo: ELEMENT_KO[annualElement] || "토",
    tenGod: localTenGod(dayStem, annual.stem),
    dayMasterRelation: localElementRelation(LOCAL_STEM_ELEMENT[dayStem] || "earth", annualElement),
  };
  annualLuck.elementKo = LOCAL_ELEMENT_KO[annualElement] || "오행";
  let monthlyLuck = buildLocalMonthlyLuck(targetYear, dayStem);
  const branchRelations = localRelationRows(computed.pillars, annual.branch);
  const quantumMyeongri = buildQuantumMyeongriLayer({
    computed,
    targetYear,
    annualLuck,
    monthlyLuck,
  });
  annualLuck.quantum = quantumMyeongri.annualQuantum;
  monthlyLuck = monthlyLuck.map((item, index) => {
    const quantum = quantumMyeongri.monthlyQuantum[index] || {};
    const finalScore = Number(quantum.finalScore || item.score);
    const tone = toneFromScore(finalScore);
    return {
      ...item,
      baseScore: item.score,
      quantumAdjustment: Number(quantum.quantumAdjustment || 0),
      finalScore,
      score: finalScore,
      tone,
      decision: clean(quantum.decision || decisionFromScore(finalScore)),
      quantumRole: clean(quantum.elementRole || "neutral"),
      quantumSummary: clean(quantum.summary || ""),
      quantum,
      advice: `${item.month}월은 ${formatNewYearGanjiForCustomer(item.pillar.label)} 월운과 ${LOCAL_ELEMENT_KO[item.pillar.element] || "오행"} 기운이 들어오며, 세밀한 보정까지 더하면 ${tone} 관점의 ${displayNewYearDecision(quantum.decision || decisionFromScore(finalScore))} 운영이 적합합니다.`,
    };
  });
  quantumMyeongri.monthlyQuantum = monthlyLuck.map((item) => ({
    ...item.quantum,
    baseScore: item.baseScore,
    quantumAdjustment: item.quantumAdjustment,
    finalScore: item.finalScore,
    decision: item.decision,
    tone: item.tone,
  }));
  const seed = {
    mode: "single",
    targetYear,
    birthProfile: {
      name: profile.name,
      birthDate: `${profile.birth.year}-${pad2(profile.birth.month)}-${pad2(profile.birth.day)}`,
      birthTime: profile.birth.unknownTime ? "" : `${pad2(profile.birth.hour)}:${pad2(profile.birth.minute)}`,
      calendarType: profile.calendarType,
      gender: profile.gender,
    },
    saju: {
      dayMaster: dayStem,
      pillars: computed.pillars,
      fiveElements: computed.fiveElements,
      tenGods: computed.tenGods,
      usefulGod: computed.usefulGods,
      luckCycle: computed.daeun,
      annualLuck,
      monthlyLuck,
      quantumMyeongri,
      relations: {
        stems: [{ dayMaster: dayStem, annualStem: annual.stem, tenGod: annualLuck.tenGod }],
        branches: [{ annualBranch: annual.branch, annualElement }],
        branchRelations,
        combinations: branchRelations.filter((item) => item.type === "합"),
        clashes: branchRelations.filter((item) => item.type === "충"),
        harms: branchRelations.filter((item) => item.type === "해"),
        breaks: branchRelations.filter((item) => item.type === "파"),
        punishments: [],
      },
    },
    interpretationSeeds: {},
    chapters: [],
  };
  seed.interpretationSeeds = buildInterpretationSeeds(seed);
  seed.quantumMyeongri = quantumMyeongri;

  const strongest = dominantElement(seed?.saju?.fiveElements || {}, "earth");
  const weakest = Object.keys(seed?.saju?.fiveElements || {}).sort((a, b) => Number(seed.saju.fiveElements[a] || 0) - Number(seed.saju.fiveElements[b] || 0))[0] || "water";
  const chapterSpecs = buildSajuNewYearChapterSpecs(seed.targetYear);
  seed.input = {
    name: seed.birthProfile.name,
    gender: seed.birthProfile.gender,
    birthDate: seed.birthProfile.birthDate,
    birthTime: seed.birthProfile.birthTime,
    calendarType: seed.birthProfile.calendarType,
    targetYear: seed.targetYear,
  };
  seed.natalChart = {
    dayMaster: seed.saju.dayMaster,
    yearPillar: `${seed.saju.pillars?.year?.stem || ""}${seed.saju.pillars?.year?.branch || ""}`,
    monthPillar: `${seed.saju.pillars?.month?.stem || ""}${seed.saju.pillars?.month?.branch || ""}`,
    dayPillar: `${seed.saju.pillars?.day?.stem || ""}${seed.saju.pillars?.day?.branch || ""}`,
    hourPillar: `${seed.saju.pillars?.hour?.stem || ""}${seed.saju.pillars?.hour?.branch || ""}`,
    monthBranch: seed.saju.pillars?.month?.branch || "",
    dayBranch: seed.saju.pillars?.day?.branch || "",
    season: "봄",
  };
  seed.fiveElements = {
    ...seed.saju.fiveElements,
    strongest: [ELEMENT_KO[strongest] || "토"],
    weakest: [ELEMENT_KO[weakest] || "수"],
  };
  seed.luckCycles = {
    targetYearSewoon: {
      year: seed.targetYear,
      pillar: seed.saju.annualLuck.label,
      tenGodToDayMaster: seed.saju.annualLuck.tenGod,
      elementEffect: [seed.saju.annualLuck.elementKo, seed.saju.annualLuck.dayMasterRelation],
      clashOrCombinationWithNatal: (seed.saju.relations?.branchRelations || []).map((row) => row.message).slice(0, 4),
      keywords: [seed.saju.annualLuck.label, seed.saju.annualLuck.tenGod, seed.saju.annualLuck.dayMasterRelation].filter(Boolean),
    },
    monthlyFortunes: (seed.saju.monthlyLuck || []).map((item) => ({
      month: item.month,
      pillar: item.pillar.label,
      baseScore: item.baseScore,
      quantumAdjustment: item.quantumAdjustment,
      score: item.score,
      finalScore: item.finalScore,
      decision: item.decision,
      keywords: [item.pillar.label, item.tone, item.relation, item.decision],
      opportunitySignals: item.finalScore >= 72 ? ["확장", item.pillar.label, "정밀 보정"] : [],
      cautionSignals: item.finalScore < 60 ? ["보수", item.pillar.label, "정밀 주의"] : [],
    })),
  };
  seed.structure = {
    geokguk: clean(seed.saju.usefulGod?.johu?.type || "건록격"),
    usefulGodKeywords: [clean(seed.saju.usefulGod?.yong || seed.saju.usefulGod?.useful || ""), clean(seed.saju.usefulGod?.hi || seed.saju.usefulGod?.hee || "")].filter(Boolean),
  };
  seed.derivedSignals = {
    yearlyThemeSignals: seed.interpretationSeeds.yearlyTheme.slice(0, 4),
    careerSignals: seed.interpretationSeeds.career.slice(0, 4),
    moneySignals: seed.interpretationSeeds.wealth.slice(0, 4),
    loveRelationshipSignals: seed.interpretationSeeds.love.slice(0, 4),
    humanRelationSignals: seed.interpretationSeeds.relationships.slice(0, 4),
    healthMindSignals: seed.interpretationSeeds.health.slice(0, 4),
    crisisSignals: seed.interpretationSeeds.risks.slice(0, 4),
    opportunitySignals: seed.interpretationSeeds.opportunities.slice(0, 4),
    monthlyStrategySignals: seed.interpretationSeeds.monthly.slice(0, 12),
    quantumSignals: [
      quantumMyeongri.professionalSummary,
      `유리 오행: ${quantumMyeongri.favorableElements.join("·") || "중립"}`,
      `주의 오행: ${quantumMyeongri.cautionElements.join("·") || "중립"}`,
      `세운 정밀 흐름: ${displayNewYearDecision(quantumMyeongri.annualQuantum.decision)}`,
    ],
  };
  seed.twelveGrowthStages = [{ stage: "장생" }, { stage: "목욕" }, { stage: "관대" }, { stage: "임관" }];
  seed.chapterSpecs = chapterSpecs;
  seed.annualFortuneFacts = buildAnnualFortuneFacts(seed);
  seed.annualFortuneChapterPlans = buildAnnualFortuneChapterPlans(seed, chapterSpecs);
  return seed;
}

function desiredSectionLength() {
  return Math.max(MIN_SECTION_CHARS + 220, 920);
}

function validateSajuNewYearSeed(seed = {}) {
  const errors = [];
  if (!clean(seed?.natalChart?.dayMaster)) errors.push("natalChart.dayMaster");
  if (!Array.isArray(seed?.luckCycles?.monthlyFortunes) || seed.luckCycles.monthlyFortunes.length !== 12) errors.push("luckCycles.monthlyFortunes");
  if (!clean(seed?.input?.targetYear)) errors.push("input.targetYear");
  if (!Array.isArray(seed?.quantumMyeongri?.elementRoles) || seed.quantumMyeongri.elementRoles.length !== 5) errors.push("quantumMyeongri.elementRoles");
  if (!seed?.quantumMyeongri?.annualQuantum) errors.push("quantumMyeongri.annualQuantum");
  if (!Array.isArray(seed?.quantumMyeongri?.monthlyQuantum) || seed.quantumMyeongri.monthlyQuantum.length !== 12) errors.push("quantumMyeongri.monthlyQuantum");
  (seed?.quantumMyeongri?.monthlyQuantum || []).forEach((item, index) => {
    const score = Number(item?.finalScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) errors.push(`quantumMyeongri.monthlyQuantum.${index + 1}.finalScore`);
    if (!["GO", "WATCH", "STOP"].includes(clean(item?.decision))) errors.push(`quantumMyeongri.monthlyQuantum.${index + 1}.decision`);
  });
  return { ok: errors.length === 0, errors };
}

function normalizeNewYearChapterSections(chapter = {}) {
  if (Array.isArray(chapter?.sections) && chapter.sections.length) {
    return chapter.sections.map((section) => ({
      title: clean(section?.title),
      body: clean(section?.body || section?.finalText || section?.text || section?.localSummary),
    }));
  }
  if (Array.isArray(chapter?.categories) && chapter.categories.length) {
    return chapter.categories.map((section) => ({
      title: clean(section?.title),
      body: clean(section?.body || section?.finalText || section?.text || section?.localSummary),
    }));
  }
  return [];
}

function repeatedLineRatio(text = "") {
  const lines = clean(text)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 80);
  if (lines.length < 8) return 0;
  const seen = new Set();
  let repeated = 0;
  lines.forEach((line) => {
    const key = line.slice(0, 160);
    if (seen.has(key)) repeated += 1;
    seen.add(key);
  });
  return repeated / lines.length;
}

function countNewYearMonthCoverage(text = "") {
  const months = new Set();
  clean(text).replace(/\b(1[0-2]|[1-9])월/g, (_, month) => {
    months.add(Number(month));
    return _;
  });
  return months.size;
}

function countNewYearTokenMatches(text = "", tokens = []) {
  const body = clean(text);
  return tokens.reduce((acc, token) => acc + (body.includes(token) ? 1 : 0), 0);
}

const NEW_YEAR_DIVERSITY_TOKEN_RE = /[가-힣A-Za-z0-9甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]{2,}/g;
const NEW_YEAR_DIVERSITY_HEADING_RE = /^(?:핵심|명식|현실|주의|실행|월별|관계|재물|건강|분기|흐름|일정|위험|정비|총운|직업|사업|연애|가족|생활|로드맵|계획|처방|기준|자리|상담)(?:\s+[가-힣]+){0,3}$/;

function normalizeNewYearDiversitySentence(sentence = "") {
  return clean(sentence)
    .replace(/\d{4}년/g, "대상연도")
    .replace(/\b(1[0-2]|[1-9])월\b/g, "해당월")
    .replace(/[^\uAC00-\uD7A3A-Za-z0-9甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function splitNewYearConsultationSentences(text = "") {
  return clean(text)
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .flatMap((line) => {
      const trimmed = clean(line);
      if (!trimmed) return [];
      return trimmed.match(/[^.!?。！？]+[.!?。！？]?/g) || [trimmed];
    })
    .map(clean)
    .filter((sentence) => {
      const normalized = normalizeNewYearDiversitySentence(sentence);
      if (normalized.length < 28) return false;
      if (NEW_YEAR_DIVERSITY_HEADING_RE.test(normalized)) return false;
      return true;
    });
}

function newYearDiversityTokens(text = "") {
  return new Set(normalizeNewYearDiversitySentence(text).match(NEW_YEAR_DIVERSITY_TOKEN_RE) || []);
}

function newYearDiversityShingles(text = "", size = 7) {
  const compact = normalizeNewYearDiversitySentence(text).replace(/\s+/g, "");
  const shingles = new Set();
  if (compact.length < size) return shingles;
  for (let index = 0; index <= compact.length - size; index += 2) {
    shingles.add(compact.slice(index, index + size));
  }
  return shingles;
}

function newYearSetJaccard(left = new Set(), right = new Set()) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;
  smaller.forEach((item) => {
    if (larger.has(item)) shared += 1;
  });
  return shared / (left.size + right.size - shared);
}

function newYearSectionSimilarity(left = "", right = "") {
  const tokenScore = newYearSetJaccard(newYearDiversityTokens(left), newYearDiversityTokens(right));
  const shingleScore = newYearSetJaccard(newYearDiversityShingles(left), newYearDiversityShingles(right));
  return Math.max(tokenScore, shingleScore);
}

function validateSajuNewYearSentenceDiversity({ chapters = [], exactSentenceLimit = 3, chapterAverageLimit = 0.58, sectionSimilarityLimit = 0.68, globalSectionSimilarityLimit = 0.78 } = {}) {
  const sections = [];
  (Array.isArray(chapters) ? chapters : []).forEach((chapter, chapterIndex) => {
    normalizeNewYearChapterSections(chapter).forEach((section, sectionIndex) => {
      const body = clean(section?.body || section?.finalText || section?.text || "");
      if (body) {
        sections.push({
          chapterIndex,
          sectionIndex,
          title: clean(section?.title || ""),
          body,
        });
      }
    });
  });

  const sentenceCounts = new Map();
  sections.forEach((section) => {
    splitNewYearConsultationSentences(section.body).forEach((sentence) => {
      const normalized = normalizeNewYearDiversitySentence(sentence);
      if (!normalized) return;
      sentenceCounts.set(normalized, (sentenceCounts.get(normalized) || 0) + 1);
    });
  });
  const repeatedSentences = [...sentenceCounts.values()].filter((count) => count > exactSentenceLimit);

  const chapterScores = new Map();
  let maxSectionSimilarity = 0;
  let maxPair = "";
  let maxSameChapterSectionSimilarity = 0;
  let maxSameChapterPair = "";
  for (let leftIndex = 0; leftIndex < sections.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sections.length; rightIndex += 1) {
      const left = sections[leftIndex];
      const right = sections[rightIndex];
      const score = newYearSectionSimilarity(left.body, right.body);
      if (score > maxSectionSimilarity) {
        maxSectionSimilarity = score;
        maxPair = `${left.chapterIndex + 1}.${left.sectionIndex + 1}/${right.chapterIndex + 1}.${right.sectionIndex + 1}`;
      }
      if (left.chapterIndex === right.chapterIndex) {
        const current = chapterScores.get(left.chapterIndex) || { total: 0, count: 0, max: 0 };
        current.total += score;
        current.count += 1;
        current.max = Math.max(current.max, score);
        chapterScores.set(left.chapterIndex, current);
        if (score > maxSameChapterSectionSimilarity) {
          maxSameChapterSectionSimilarity = score;
          maxSameChapterPair = `${left.chapterIndex + 1}.${left.sectionIndex + 1}/${right.chapterIndex + 1}.${right.sectionIndex + 1}`;
        }
      }
    }
  }

  const chapterAverages = [...chapterScores.values()].map((item) => (item.count ? item.total / item.count : 0));
  const maxChapterAverageSimilarity = chapterAverages.length ? Math.max(...chapterAverages) : 0;
  const errors = [];
  if (repeatedSentences.length) errors.push("sentence_repetition_high");
  if (maxChapterAverageSimilarity > chapterAverageLimit) errors.push("chapter_similarity_high");
  if (maxSameChapterSectionSimilarity > sectionSimilarityLimit || maxSectionSimilarity > globalSectionSimilarityLimit) errors.push("section_similarity_high");

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      sectionCount: sections.length,
      sentenceCount: sentenceCounts.size,
      repeatedSentenceCount: repeatedSentences.length,
      maxSentenceRepeat: sentenceCounts.size ? Math.max(...sentenceCounts.values()) : 0,
      maxChapterAverageSimilarity: Number(maxChapterAverageSimilarity.toFixed(3)),
      maxSectionSimilarity: Number(maxSectionSimilarity.toFixed(3)),
      maxPair,
      maxSameChapterSectionSimilarity: Number(maxSameChapterSectionSimilarity.toFixed(3)),
      maxSameChapterPair,
    },
  };
}

function validateSajuNewYearCategoryCoverage({ body = "", categoryTitle = "", chapterSpec = {}, section = {} } = {}) {
  const text = clean(body || section?.body || section?.text || section?.finalText || "");
  const rule = getNewYearCategoryRule(categoryTitle || section?.title, chapterSpec);
  const errors = [];
  const requiredTokens = Array.from(new Set([
    ...(rule.requiredTokens || []),
    categoryTitle || section?.title || "",
  ].map(clean).filter(Boolean)));
  const sajuTerms = ["원국", "세운", "월운", "오행", "십성", "합", "충", "용신", "희신", "기신"];
  const requiredMatches = countNewYearTokenMatches(text, requiredTokens);
  const sajuMatches = countNewYearTokenMatches(text, sajuTerms);
  const actionMatches = countNewYearTokenMatches(text, rule.actionGuide || []);
  const cautionMatches = countNewYearTokenMatches(text, rule.caution || []);
  const cautionMeaningMatched = /주의|조심|보류|낮추|줄이|피하|방치|서두르|정리|점검|확인|기록/.test(text);
  if (requiredTokens.length && requiredMatches < Math.min(3, requiredTokens.length)) errors.push("category_terms_missing");
  if (sajuMatches < 4) errors.push("category_saju_evidence_missing");
  if ((rule.actionGuide || []).length && actionMatches < 1) errors.push("category_action_missing");
  if ((rule.caution || []).length && cautionMatches < 1 && !cautionMeaningMatched) errors.push("category_caution_missing");
  if (rule.monthMode === "required" && countNewYearMonthCoverage(text) < 3) errors.push("category_month_coverage_missing");
  return {
    ok: errors.length === 0,
    errors,
    stats: {
      requiredMatches,
      sajuMatches,
      actionMatches,
      cautionMatches,
      monthCoverage: countNewYearMonthCoverage(text),
    },
  };
}

function isSajuNewYearSectionConsultationReady({ body = "", categoryTitle = "", chapterSpec = {}, section = {} } = {}) {
  const text = clean(body || section?.body || section?.text || section?.finalText || "");
  if (text.length < desiredSectionLength()) return false;
  if (hasForbiddenText(text) || new RegExp(NEW_YEAR_LOCAL_FORBIDDEN_RE.source, "i").test(text)) return false;
  if (hasNewYearCustomerSentenceIssue(text)) return false;
  if (hasNewYearTemplateSentenceIssue(text)) return false;
  return validateSajuNewYearCategoryCoverage({ body: text, categoryTitle, chapterSpec, section }).ok;
}

function validateSajuNewYearPdfQuality({ chapters = [], expectedChapters = buildSajuNewYearChapterSpecs(resolveDefaultTargetYear()), minChapterLength = MIN_CHAPTER_CHARS, minSectionLength = MIN_SECTION_CHARS } = {}) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== expectedChapters.length) {
    errors.push("chapter_count");
    return { ok: false, errors, stats: { chapterCount: Array.isArray(chapters) ? chapters.length : 0, totalChars: 0 } };
  }
  let totalChars = 0;
  const allTextParts = [];
  let categoryCoverageIssueCount = 0;
  expectedChapters.forEach((spec, chapterIndex) => {
    const chapter = chapters[chapterIndex];
    if (!chapter || clean(chapter.title) !== clean(spec.title)) {
      errors.push(`chapter_${chapterIndex + 1}_title`);
      return;
    }
    const sections = normalizeNewYearChapterSections(chapter);
    if (sections.length !== spec.categories.length) {
      errors.push(`chapter_${chapterIndex + 1}_section_count`);
      return;
    }
    let chapterChars = 0;
    spec.categories.forEach((categoryTitle, secIndex) => {
      const section = sections[secIndex] || {};
      const body = clean(section.body || "");
      chapterChars += body.length;
      allTextParts.push(section.title, body);
      if (clean(section.title) !== clean(categoryTitle)) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_title`);
      if (body.length < minSectionLength) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_min_chars`);
      if (hasForbiddenText(body) || new RegExp(NEW_YEAR_LOCAL_FORBIDDEN_RE.source, "i").test(body)) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_forbidden_text`);
      if (hasNewYearCustomerSentenceIssue(body)) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_customer_phrase_quality`);
      if (hasNewYearTemplateSentenceIssue(body)) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_template_sentence_quality`);
      if (body.split(/\n\s*\n/).filter(Boolean).length < 3) errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_paragraphs`);
      const coverage = validateSajuNewYearCategoryCoverage({ body, categoryTitle, chapterSpec: spec, section });
      if (!coverage.ok) {
        categoryCoverageIssueCount += coverage.errors.length;
        coverage.errors.forEach((error) => errors.push(`chapter_${chapterIndex + 1}_section_${secIndex + 1}_${error}`));
      }
    });
    if (chapterChars < minChapterLength) errors.push(`chapter_${chapterIndex + 1}_min_chars`);
    totalChars += chapterChars;
  });
  const allText = allTextParts.join("\n");
  const monthCoverage = countNewYearMonthCoverage(allText);
  const evidenceTermCount = countNewYearTokenMatches(allText, ["원국", "세운", "십성", "월운", "오행", "합", "충", "용신"]);
  const actionTermCount = countNewYearTokenMatches(allText, ["실행", "점검", "기록", "조율", "정비", "선택", "계획", "루틴"]);
  const consultationDensityCount = countNewYearConsultationDensity(allText);
  const repetitionRatio = repeatedLineRatio(allText);
  const sentenceDiversity = validateSajuNewYearSentenceDiversity({ chapters });
  if (totalChars < MIN_TOTAL_CHARS) {
    errors.push("total_min_chars");
  }
  if (monthCoverage < 6) errors.push("monthly_coverage_too_thin");
  if (evidenceTermCount < 5) errors.push("consultation_evidence_too_thin");
  if (actionTermCount < 5) errors.push("action_guidance_too_thin");
  if (consultationDensityCount < 28) errors.push("personal_scenario_density_too_thin");
  if (repetitionRatio > 0.42) errors.push("repetition_ratio_high");
  if (!sentenceDiversity.ok) errors.push(...sentenceDiversity.errors);
  return {
    ok: errors.length === 0,
    errors,
    stats: {
      chapterCount: chapters.length,
      totalChars,
      monthCoverage,
      evidenceTermCount,
      actionTermCount,
      consultationDensityCount,
      categoryCoverageIssueCount,
      repetitionRatio: Number(repetitionRatio.toFixed(3)),
      sentenceDiversity: sentenceDiversity.stats,
    },
  };
}

function buildNewYearConsultationEvidence(masterJson = {}) {
  const chart = masterJson?.natalChart || {};
  const yearly = masterJson?.yearlyFlow || {};
  const quantum = masterJson?.quantumMyeongri || {};
  const monthRows = Array.isArray(masterJson?.monthlyFlow) ? masterJson.monthlyFlow : [];
  const goMonths = monthRows.filter((item) => item.decision === "GO").slice(0, 4).map((item) => `${item.month}월`);
  const stopMonths = monthRows.filter((item) => item.decision === "STOP").slice(0, 4).map((item) => `${item.month}월`);

  return compactNewYearObject({
    sajuEvidence: [
      `원국 8글자: ${clean(chart.eightCharacters)}`,
      `일간과 일지: ${clean(chart.dayMaster)} / ${clean(chart.dayBranch)}`,
      `세운: ${clean(yearly.pillar)} · 십성 ${clean(yearly.tenGodToDayMaster)} · 관계 ${clean(yearly.dayMasterRelation)}`,
      `세운 합충형해파: ${(yearly.natalInteractions || []).join(" · ")}`,
      `용신 키워드: ${(masterJson?.structure?.usefulGodKeywords || []).join(" · ")}`,
      `정밀 보정: ${humanizeNewYearCustomerText(quantum.professionalSummary)}`,
      `실행 달: ${goMonths.join("·") || "월별 점검"} / 주의 달: ${stopMonths.join("·") || "월별 점검"}`,
    ].filter((line) => clean(line).replace(/undefined|null/g, "").length > 8),
    interpretationOrder: ["사주 근거", "올해의 흐름", "현실 발현", "월별 실행", "품격 있는 주의점"],
    writingVoice: "최고의 신년운세 명리 상담가가 한 해의 선택 기준을 짚어 주는 전문적이고 신비로운 존댓말 상담체",
    safety: ["결과 단정 금지", "불안 조장 금지", "투자·건강 진단 확정 금지", "개발 용어 노출 금지"],
  });
}

function buildNewYearMasterJson(seed = {}, body = {}) {
  const pillars = seed?.saju?.pillars || {};
  const annual = seed?.saju?.annualLuck || {};
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const clientSajuBase = body?.sajuBase && typeof body.sajuBase === "object" ? body.sajuBase : null;
  const clientEvidence = body?.quantumMyeongriJson || body?.clientEngineEvidence || body?.clientMyeongriJson || null;
  const clientSajuEvidence = compactNewYearObject({
    usagePolicy: "supplemental_only_worker_engine_is_source_of_truth",
    source: clientSajuBase ? "main-shell-basic-saju-engine" : undefined,
    sajuBase: clientSajuBase ? cloneNewYearValue(clientSajuBase) : undefined,
    runtimeEvidence: clientEvidence && typeof clientEvidence === "object" ? cloneNewYearValue(clientEvidence) : undefined,
  });
  const masterJson = compactNewYearObject({
    schemaVersion: "saju-new-year-master-json.v1",
    calculationSource: "worker-saju-new-year-engine",
    generationMode: "annual-fortune-facts-plan-hybrid-v1",
    productId: ANNUAL_FORTUNE_PRODUCT_ID,
    assemblyVersion: ANNUAL_FORTUNE_ASSEMBLY_VERSION,
    engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
    serviceKey: SERVICE_KEY,
    targetYear: seed?.targetYear,
    input: seed?.input,
    birthProfile: seed?.birthProfile,
    natalChart: {
      dayMaster: clean(seed?.saju?.dayMaster),
      yearPillar: pillars.year,
      monthPillar: pillars.month,
      dayPillar: pillars.day,
      hourPillar: pillars.hour,
      eightCharacters: ["year", "month", "day", "hour"]
        .map((key) => `${clean(pillars?.[key]?.stem)}${clean(pillars?.[key]?.branch)}`)
        .filter(Boolean)
        .join(" "),
      monthBranch: clean(pillars?.month?.branch),
      dayBranch: clean(pillars?.day?.branch),
      fiveElements: seed?.saju?.fiveElements,
      tenGods: seed?.saju?.tenGods,
      usefulGod: seed?.saju?.usefulGod,
      luckCycle: seed?.saju?.luckCycle,
    },
    yearlyFlow: {
      year: annual.year,
      pillar: clean(annual.label),
      heavenlyStem: clean(annual.stem),
      earthlyBranch: clean(annual.branch),
      element: clean(annual.element),
      elementKo: clean(annual.elementKo),
      tenGodToDayMaster: clean(annual.tenGod),
      dayMasterRelation: clean(annual.dayMasterRelation),
      natalInteractions: (seed?.saju?.relations?.branchRelations || []).map((row) => clean(row?.message)).filter(Boolean),
      quantum: annual.quantum,
    },
    monthlyFlow: monthly.map((item) => compactNewYearObject({
      month: item.month,
      pillar: clean(item?.pillar?.label),
      element: clean(item?.pillar?.element),
      relation: clean(item?.relation),
      baseScore: item.baseScore,
      quantumAdjustment: item.quantumAdjustment,
      finalScore: item.finalScore ?? item.score,
      decision: clean(item.decision || decisionFromScore(item.finalScore || item.score)),
      tone: clean(item.tone),
      advice: clean(item.advice),
      quantumSummary: clean(item.quantumSummary),
    })),
    quantumMyeongri: seed?.quantumMyeongri || seed?.saju?.quantumMyeongri,
    annualFortuneFacts: seed?.annualFortuneFacts || buildAnnualFortuneFacts(seed),
    annualFortuneChapterPlans: (seed?.annualFortuneChapterPlans || []).map((plan) => ({ ...plan })),
    structure: seed?.structure,
    derivedSignals: seed?.derivedSignals,
    chapterSpecs: seed?.chapterSpecs,
    clientSajuEvidence,
    clientEngineEvidence: (clientSajuBase || (clientEvidence && typeof clientEvidence === "object"))
      ? {
          usagePolicy: "supplemental_only_worker_engine_is_source_of_truth",
          snapshot: cloneNewYearValue(clientSajuEvidence),
        }
      : undefined,
    qualityRules: {
      mustUseOnlyProvidedEvidence: true,
      mustKeepCounselingTone: true,
      mustAvoidDeterministicClaims: true,
      mustIncludeMonthlyAction: true,
    },
  });

  return {
    ...masterJson,
    consultationEvidence: buildNewYearConsultationEvidence(masterJson),
  };
}

function validateNewYearMasterJson(masterJson = {}) {
  const errors = [];
  const requireField = (condition, code) => {
    if (!condition) errors.push(code);
  };
  const monthly = Array.isArray(masterJson?.monthlyFlow) ? masterJson.monthlyFlow : [];
  const quantumMonthly = Array.isArray(masterJson?.quantumMyeongri?.monthlyQuantum) ? masterJson.quantumMyeongri.monthlyQuantum : [];

  requireField(clean(masterJson?.schemaVersion) === "saju-new-year-master-json.v1", "schema_version_invalid");
  requireField(clean(masterJson?.calculationSource) === "worker-saju-new-year-engine", "calculation_source_invalid");
  requireField(Number(masterJson?.targetYear) >= 1900 && Number(masterJson?.targetYear) <= 2100, "target_year_invalid");
  requireField(clean(masterJson?.birthProfile?.birthDate), "birth_date_missing");
  requireField(clean(masterJson?.natalChart?.dayMaster), "day_master_missing");
  requireField(clean(masterJson?.natalChart?.yearPillar?.stem) && clean(masterJson?.natalChart?.yearPillar?.branch), "year_pillar_missing");
  requireField(clean(masterJson?.natalChart?.monthPillar?.stem) && clean(masterJson?.natalChart?.monthPillar?.branch), "month_pillar_missing");
  requireField(clean(masterJson?.natalChart?.dayPillar?.stem) && clean(masterJson?.natalChart?.dayPillar?.branch), "day_pillar_missing");
  requireField(clean(masterJson?.yearlyFlow?.pillar), "yearly_pillar_missing");
  requireField(clean(masterJson?.yearlyFlow?.tenGodToDayMaster), "yearly_ten_god_missing");
  requireField(monthly.length === 12, "monthly_flow_count");
  monthly.forEach((item, index) => {
    const score = Number(item?.finalScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) errors.push(`monthly_flow_${index + 1}_score`);
    if (!["GO", "WATCH", "STOP"].includes(clean(item?.decision))) errors.push(`monthly_flow_${index + 1}_decision`);
  });
  requireField(quantumMonthly.length === 12, "quantum_monthly_count");
  requireField((masterJson?.consultationEvidence?.sajuEvidence || []).length >= 6, "consultation_evidence_too_thin");
  const expectedChapterCount = buildSajuNewYearChapterSpecs(masterJson?.targetYear).length;
  requireField(Array.isArray(masterJson?.chapterSpecs) && masterJson.chapterSpecs.length === expectedChapterCount, "chapter_specs_count");
  requireField(clean(masterJson?.annualFortuneFacts?.productId) === ANNUAL_FORTUNE_PRODUCT_ID, "annual_fortune_facts_product");
  requireField(Number(masterJson?.annualFortuneFacts?.targetYear) === Number(masterJson?.targetYear), "annual_fortune_facts_target_year");
  requireField(Array.isArray(masterJson?.annualFortuneFacts?.monthlyFlows) && masterJson.annualFortuneFacts.monthlyFlows.length === 12, "annual_fortune_facts_monthly_count");
  requireField(Array.isArray(masterJson?.annualFortuneChapterPlans) && masterJson.annualFortuneChapterPlans.length === expectedChapterCount, "annual_fortune_chapter_plans_count");

  return { ok: errors.length === 0, errors };
}

function ensureMinLength(text, minLength, seed, categoryTitle) {
  let result = softenAnnualFortuneRiskText(text, seed?.targetYear);
  const annual = seed?.saju?.annualLuck || {};
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const strongMonths = monthly.filter((item) => Number(item?.finalScore ?? item?.score ?? 0) >= 75).slice(0, 3).map((item) => `${item.month}월`);
  const careMonths = monthly.filter((item) => Number(item?.finalScore ?? item?.score ?? 0) < 60).slice(0, 3).map((item) => `${item.month}월`);
  const categoryRule = getNewYearCategoryRule(categoryTitle);
  const categoryLabel = humanizeNewYearCustomerText(categoryTitle);
  const profile = getNewYearDomainConsultationProfile(categoryRule.domain, clean(categoryTitle).length % 5);
  const annualLabel = formatNewYearGanjiForCustomer(clean(annual.label || `${clean(annual.stem)}${clean(annual.branch)}` || "세운"));
  const evidence = formatNewYearRuleList(categoryRule.evidence, "세운과 원국의 접점");
  const action = formatNewYearRuleList(categoryRule.actionGuide, "작은 실행을 먼저 정하기");
  const checklist = formatNewYearRuleList(categoryRule.checklist, "기록과 확인을 남기기");
  const caution = formatNewYearRuleList(categoryRule.caution, "속도와 욕심을 낮추기");
  const opportunity = formatNewYearRuleList(categoryRule.opportunity, "운이 열리는 자리를 실제 행동으로 옮기기");
  const strongMonthText = strongMonths.join("·") || "운이 살아나는 달";
  const careMonthText = careMonths.join("·") || "점검이 필요한 달";
  const additions = [
    `${seed.targetYear}년 ${annualLabel}의 흐름에서 ${categoryLabel}은 ${profile.subject}을 중심으로 읽어야 합니다. 근거는 ${evidence}에 있고, ${strongMonthText}에는 ${opportunity}을 살리며 ${careMonthText}에는 ${caution}을 먼저 지키는 편이 좋습니다.`,
    `${categoryLabel}을 현실로 옮기는 순서는 ${action}입니다. 이 항목은 좋은 기운을 크게 부르는 문제가 아니라, 먼저 기준을 세우고 다음으로 사람·돈·일정의 책임선을 맞춘 뒤 마지막에 결정을 확정해야 안정됩니다.`,
    `${profile.reality} 그래서 ${categoryLabel}에서는 ${checklist}이 작은 의식처럼 중요합니다. 하루의 감정으로 결론을 내리지 말고, 같은 신호가 두 번 이상 반복될 때 선택을 좁히면 운의 결이 훨씬 선명해집니다.`,
    `${categoryLabel}의 마지막 처방은 약한 달을 실패로 보지 않는 데 있습니다. ${careMonthText}에는 속도를 낮추어 누수를 막고, ${strongMonthText}에는 미뤄 둔 제안과 정리를 밖으로 꺼내야 ${seed.targetYear}년의 세운을 온전히 쓸 수 있습니다.`,
  ];
  let index = 0;
  while (result.length < minLength) {
    result = `${result}\n\n${additions[index % additions.length]}`;
    index += 1;
    if (index > 12) break;
  }
  return polishNewYearConsultationText(normalizeNewYearAnnualWording(softenAnnualFortuneRiskText(result, seed?.targetYear), seed?.targetYear));
}

function chapterTextLength(chapter) {
  const fromCategories = (chapter?.categories || []).reduce((acc, category) => acc + clean(category?.finalText || category?.localSummary).length, 0);
  if (fromCategories > 0) return fromCategories;
  return (chapter?.sections || []).reduce((acc, section) => acc + clean(section?.body || section?.finalText || section?.text).length, 0);
}

function hasForbiddenText(text) {
  const token = clean(text);
  if (!token) return false;
  const safeRegex = new RegExp(FORBIDDEN_TEXT_RE.source, "i");
  return safeRegex.test(token);
}

function validateChapters(chapters) {
  const expected = buildSajuNewYearChapterSpecs(resolveDefaultTargetYear());
  if (!Array.isArray(chapters) || chapters.length !== expected.length) return false;
  const totalChars = chapters.reduce((acc, chapter) => acc + chapterTextLength(chapter), 0);
  if (totalChars < MIN_TOTAL_CHARS) return false;
  return expected.every((blueprint, idx) => {
    const chapter = chapters[idx];
    if (!chapter || clean(chapter.title) !== clean(blueprint.title)) return false;
    const sections = Array.isArray(chapter.sections)
      ? chapter.sections
      : Array.isArray(chapter.categories)
        ? chapter.categories.map((item) => ({ title: item?.title, body: item?.finalText || item?.localSummary || "" }))
        : [];
    if (sections.length !== blueprint.categories.length) return false;
    if (chapterTextLength(chapter) < MIN_CHAPTER_CHARS) return false;
    return blueprint.categories.every((category, catIdx) => {
      const text = clean(sections[catIdx]?.body || sections[catIdx]?.finalText || sections[catIdx]?.text);
      if (clean(sections[catIdx]?.title) !== clean(category)) return false;
      if (text.length < MIN_SECTION_CHARS) return false;
      if (hasForbiddenText(text)) return false;
      const paragraphCount = text.split(/\n\s*\n/).filter(Boolean).length;
      return paragraphCount >= 3;
    });
  });
}

function escHtml(value) {
  return clean(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function renderNewYearSectionBody(body = "") {
  return polishNewYearConsultationText(stripForbiddenText(body))
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^(핵심 진단|명식 근거|올해 현실에서 드러나는 모습|주의할 흐름|기회를 살리는 방법|월별 실행 조언|개인 사건 시나리오)$/.test(line)
        || /(핵심 결론|명리 근거|현실 신호|생활 신호|주의선|실행 처방|월별 조율|월별 운영|월별 운영표|월별 루틴 운영|월별 돈 운영|월별 일 운영|월별 관계 운영|월별 감정 운영|월별 회복 운영|월별 방어 운영|실제 장면|실제 신호)$/.test(line)) {
        return `<h5>${escHtml(line)}</h5>`;
      }
      return `<p>${escHtml(line)}</p>`;
    })
    .join("");
}

const SAJU_NEW_YEAR_ASSEMBLED_MOJIBAKE_RE = /[\uFFFD\uF900-\uFAFF]|[?][\uAC00-\uD7A3]|[\u3131-\u318E]{2,}|[\u6028\u6C85\u8ADB\u85E5\u9DAF\u8036\u6E26\u8A1D\u96C5\u91CE\u8E02\u6FE1]/;
const SAJU_NEW_YEAR_ASSEMBLED_FORBIDDEN_RE = /\b(?:undefined|null|nan|json|schema|debug|prompt|raw|payload|object|engine)\b|\[object Object\]|자동\s*복구\s*생성|데이터\s*부족|로컬\s*엔진|템플릿|internal\s*server\s*error|about:blank/i;

function safeNewYearDisplayText(value, fallback = "") {
  const text = clean(value).replace(/\s+/g, " ").trim();
  if (!text || /\?{2,}/.test(text) || SAJU_NEW_YEAR_ASSEMBLED_MOJIBAKE_RE.test(text) || SAJU_NEW_YEAR_ASSEMBLED_FORBIDDEN_RE.test(text)) return fallback;
  return text;
}

function newYearElementKo(value, fallback = "중화") {
  const key = clean(value).toLowerCase();
  return ({
    wood: "목",
    fire: "화",
    earth: "토",
    metal: "금",
    water: "수",
    목: "목",
    화: "화",
    토: "토",
    금: "금",
    수: "수",
  })[key] || fallback;
}

function buildSajuNewYearAssembledFacts(seed = {}) {
  const targetYear = Number(seed?.targetYear || resolveDefaultTargetYear());
  const profile = seed?.birthProfile || seed?.input || {};
  const annual = seed?.saju?.annualLuck || {};
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const topMonths = monthly.slice().sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0)).slice(0, 3).map((item) => `${Number(item?.month || 0)}월`).filter(Boolean);
  const careMonths = monthly.slice().sort((a, b) => Number(a?.score || 0) - Number(b?.score || 0)).slice(0, 3).map((item) => `${Number(item?.month || 0)}월`).filter(Boolean);
  return {
    targetYear,
    name: safeNewYearDisplayText(profile?.name, "고객"),
    annualElement: newYearElementKo(annual?.element, "중화"),
    annualTone: safeNewYearDisplayText(annual?.dayMasterRelation, "균형과 조율"),
    tenGod: safeNewYearDisplayText(annual?.tenGod, "중심 기운"),
    topMonths: topMonths.length ? topMonths.join(", ") : "준비된 시기",
    careMonths: careMonths.length ? careMonths.join(", ") : "점검이 필요한 시기",
    usefulElements: (Array.isArray(seed?.quantumMyeongri?.favorableElements) ? seed.quantumMyeongri.favorableElements : []).map((item) => newYearElementKo(item, "")).filter(Boolean).join(", ") || "균형",
    cautionElements: (Array.isArray(seed?.quantumMyeongri?.cautionElements) ? seed.quantumMyeongri.cautionElements : []).map((item) => newYearElementKo(item, "")).filter(Boolean).join(", ") || "과열",
  };
}

function buildSajuNewYearTocHtml(chapters = []) {
  return (Array.isArray(chapters) ? chapters : []).map((chapter, index) => {
    const chapterNo = String(chapter?.no || index + 1).padStart(2, "0");
    return `<li><span>${escHtml(chapterNo)}</span><div><strong>${escHtml(chapter?.title || `CHAPTER ${chapterNo}`)}</strong><small>${escHtml(chapter?.focus || "")}</small></div></li>`;
  }).join("");
}

function buildSajuNewYearOverviewHtml(chapters = []) {
  return (Array.isArray(chapters) ? chapters : []).map((chapter, index) => {
    const chapterNo = String(chapter?.no || index + 1).padStart(2, "0");
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const keyCategories = sections.slice(0, 3).map((section) => clean(section?.title)).filter(Boolean).join(" · ");
    return `<div><strong>${escHtml(chapterNo)}. ${chapter?.title || ""}</strong><p>${escHtml(chapter?.focus || "")}</p>${keyCategories ? `<small>${escHtml(keyCategories)}</small>` : ""}</div>`;
  }).join("");
}

function buildSajuNewYearChapterSnapshotHtml(chapter = {}, sections = []) {
  const categoryText = sections.slice(0, 5).map((section) => clean(section?.title)).filter(Boolean).join(" · ");
  const firstGuide = sections.flatMap((section) => Array.isArray(section?.actionGuide) ? section.actionGuide : []).map((item) => normalizeNewYearAnnualWording(safeNewYearDisplayText(item))).filter(Boolean)[0] || "확장 흐름에는 실행 근거를 남기고, 정비 흐름에는 약속과 기준을 정리하십시오.";
  const firstCaution = sections.flatMap((section) => Array.isArray(section?.caution) ? section.caution : []).map(safeNewYearDisplayText).filter(Boolean)[0] || "무리한 확정과 감정적 결론은 늦추십시오.";
  return `<div class="chapter-snapshot"><div><strong>상담 범위</strong><p>${escHtml(categoryText || chapter?.focus || "")}</p></div><div><strong>핵심 흐름</strong><p>${escHtml(chapter?.focus || "")}</p></div><div><strong>실행</strong><p>${escHtml(firstGuide)}</p></div><div><strong>주의</strong><p>${escHtml(firstCaution)}</p></div></div>`;
}

function buildSajuNewYearSectionNotesHtml(section = {}, listBlock = () => "") {
  return [
    listBlock("사주 근거", section?.sajuEvidence, 3),
    listBlock("실천 가이드", section?.actionGuide, 2),
    listBlock("주의할 점", section?.caution, 2),
  ].filter(Boolean).join("");
}

const SAJU_NEW_YEAR_PDF_UX_STYLE = `<style>@page{@bottom-center{content:"Code Destiny · " counter(page);font-size:9px;color:#8a5a32;}}nav.toc li div{min-width:0;}nav.toc small{display:block;margin-top:3px;color:#7c4a21;font-size:11px;line-height:1.45;}.overview-grid{grid-template-columns:repeat(2,1fr)!important;gap:9px!important;}.overview-grid div{padding:10px!important;}.overview-grid small{display:block;margin-top:6px;color:#8a5a32;font-size:11px;line-height:1.45;}.chapter-snapshot{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:14px 0 18px;break-inside:avoid;page-break-inside:avoid;}.chapter-snapshot div{border:1px solid #ead7a6;background:#fff8e1;border-radius:8px;padding:10px;}.chapter-snapshot strong{display:block;color:#7f1d1d;margin-bottom:5px;font-size:12px;}.chapter-snapshot p{margin:0;color:#4b2c14;font-size:12px;line-height:1.55;}.body-card{page-break-inside:auto!important;break-inside:auto!important;}.body-card h3,.body-card h5{break-after:avoid;page-break-after:avoid;}.notes{grid-template-columns:repeat(3,1fr)!important;gap:8px!important;break-inside:avoid;page-break-inside:avoid;}.note{padding:10px!important;}.note li{font-size:11.5px!important;line-height:1.55!important;}@media print{body{background:#fff!important;}header.cover{height:100vh;}.overview,.chapter,.final-page{break-inside:auto;}.chapter-snapshot,.notes,.table-card{break-inside:avoid;page-break-inside:avoid;}}</style>`;

function buildSajuNewYearAssembledFactsClean(seed = {}) {
  const targetYear = Number(seed?.targetYear || resolveDefaultTargetYear());
  const profile = seed?.birthProfile || seed?.input || {};
  const annual = seed?.saju?.annualLuck || {};
  const monthly = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const scoreOf = (item) => Number(item?.score || item?.finalScore || 60);
  const monthOf = (item, index = 0) => Number(item?.month || item?.lunarMonth || index + 1);
  const topMonths = monthly.slice().sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, 3).map((item, index) => `${monthOf(item, index)}월`).filter(Boolean);
  const careMonths = monthly.slice().sort((a, b) => scoreOf(a) - scoreOf(b)).slice(0, 3).map((item, index) => `${monthOf(item, index)}월`).filter(Boolean);
  const favorable = Array.isArray(seed?.quantumMyeongri?.favorableElements) ? seed.quantumMyeongri.favorableElements : [];
  const caution = Array.isArray(seed?.quantumMyeongri?.cautionElements) ? seed.quantumMyeongri.cautionElements : [];
  return {
    targetYear,
    name: safeNewYearDisplayText(profile?.name, "고객"),
    annualElement: newYearElementKo(annual?.element || annual?.elementKo, "중화"),
    annualTone: safeNewYearDisplayText(annual?.dayMasterRelation || annual?.relation, "균형과 조율"),
    tenGod: safeNewYearDisplayText(annual?.tenGod || annual?.tenGodToDayMaster, "중심 기운"),
    topMonths: topMonths.length ? topMonths.join(", ") : "준비된 시기",
    careMonths: careMonths.length ? careMonths.join(", ") : "점검이 필요한 시기",
    usefulElements: favorable.map((item) => newYearElementKo(item, "")).filter(Boolean).join(", ") || "균형",
    cautionElements: caution.map((item) => newYearElementKo(item, "")).filter(Boolean).join(", ") || "과열",
  };
}

const SAJU_NEW_YEAR_DOMAIN_CONSULT_LANGUAGE = Object.freeze({
  annual: {
    object: "한 해의 운영 기준",
    opportunityName: "방향이 선명해지는 구간",
    cautionName: "초반 단정과 과속",
    decisionAxis: "방향·속도·기준",
    action: "먼저 지킬 기준을 정하고 일·돈·관계·건강에 차례로 적용하십시오.",
  },
  career: {
    object: "일의 성과와 역할",
    opportunityName: "제안·발표·평가가 살아나는 구간",
    cautionName: "역할 경계와 약속 범위",
    decisionAxis: "역할·성과·평판",
    action: "성과가 남는 일을 고르고, 결과물과 책임 범위를 문서와 일정으로 남기십시오.",
  },
  money: {
    object: "수입 통로와 지출 구조",
    opportunityName: "수익 구조가 열리는 구간",
    cautionName: "계약·가격·고정비의 누수",
    decisionAxis: "수입·지출·계약",
    action: "수입 통로, 지출 상한, 보류 기준을 나누어 돈의 흐름을 다루십시오.",
  },
  relationship: {
    object: "사람의 역할과 신뢰",
    opportunityName: "인연과 협업이 확장되는 구간",
    cautionName: "기대와 책임의 불균형",
    decisionAxis: "거리·역할·신뢰",
    action: "오래 갈 사람, 조율할 사람, 거리를 둘 사람을 구분해 관계의 결을 정리하십시오.",
  },
  love: {
    object: "마음의 속도와 약속의 무게",
    opportunityName: "표현과 대화가 부드러워지는 구간",
    cautionName: "감정 과속과 생활 조건의 불일치",
    decisionAxis: "감정·책임·생활",
    action: "기대, 책임, 생활 조건을 말로 맞추며 관계의 속도를 현실에 맞추십시오.",
  },
  health: {
    object: "몸과 마음의 회복 리듬",
    opportunityName: "회복 루틴이 자리 잡는 구간",
    cautionName: "피로 누적과 긴장 신호",
    decisionAxis: "수면·식사·긴장",
    action: "줄일 일정, 지킬 루틴, 도움을 요청할 시점을 미리 정하십시오.",
  },
  quarter: {
    object: "분기별 선택 순서",
    opportunityName: "실행과 검증이 맞물리는 구간",
    cautionName: "결정 쏠림과 회수 지연",
    decisionAxis: "기준·확장·회수",
    action: "초반은 기준, 중반은 실행과 검증, 후반은 회수와 정리로 나누십시오.",
  },
  risk: {
    object: "손실을 줄이는 방어선",
    opportunityName: "반전의 근거가 생기는 구간",
    cautionName: "반복 실수와 경계 붕괴",
    decisionAxis: "멈춤·기록·경계",
    action: "먼저 멈추고 기록한 뒤 사람과 돈의 경계를 다시 세우십시오.",
  },
  monthly: {
    object: "12개월 실행 리듬",
    opportunityName: "실행 신호가 강해지는 달",
    cautionName: "정비와 회복이 필요한 달",
    decisionAxis: "실행·관망·정비",
    action: "달마다 해야 할 행동의 성격을 다르게 배치하십시오.",
  },
  roadmap: {
    object: "연간 마스터플랜",
    opportunityName: "밀어붙일 일이 분명해지는 구간",
    cautionName: "버릴 것을 남겨 두는 습관",
    decisionAxis: "선택·집중·정리",
    action: "남길 것과 내려놓을 것을 구분해 연간 루틴으로 고정하십시오.",
  },
});

function normalizeNewYearAnnualWording(text = "", targetYear = resolveDefaultTargetYear()) {
  return humanizeNewYearCustomerText(text)
    .replace(/확장 흐름에서서+는/g, "확장 흐름에서는")
    .replace(/점검 흐름에서서+는/g, "점검 흐름에서는")
    .replace(/정비 흐름에서서+는/g, "정비 흐름에서는")
    .replace(/올해/g, `${targetYear}년`)
    .replace(/좋은 달/g, "확장 흐름")
    .replace(/조심할 달/g, "점검 흐름")
    .replace(/약한 달/g, "정비 흐름")
    .replace(/기회를 잡기 확장 흐름/g, "기회를 잡기 좋은 달")
    .replace(/흐름이 확장 흐름에서는/g, "확장 흐름에서는")
    .replace(/흐름이 점검 흐름에서는/g, "점검 흐름에서는")
    .replace(/흐름이 정비 흐름에서는/g, "정비 흐름에서는")
    .replace(/확장 흐름에는/g, "확장 흐름에서는")
    .replace(/점검 흐름에는/g, "점검 흐름에서는")
    .replace(/정비 흐름에는/g, "정비 흐름에서는")
    .replace(/확장 흐름에(?=\s|[,.。])/g, "확장 흐름에서")
    .replace(/점검 흐름에(?=\s|[,.。])/g, "점검 흐름에서")
    .replace(/정비 흐름에(?=\s|[,.。])/g, "정비 흐름에서");
}

function newYearMonthlyVisualRows(seed = {}, monthlyFortunes = []) {
  const calculated = Array.isArray(seed?.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const calc = calculated[index] || {};
    const llm = Array.isArray(monthlyFortunes) ? monthlyFortunes.find((item) => Number(item?.month) === month) || monthlyFortunes[index] || {} : {};
    const score = Math.max(0, Math.min(100, Number(calc.finalScore ?? calc.score ?? calc.baseScore ?? 60)));
    const decision = clean(calc.decision || (score >= 72 ? "GO" : score >= 58 ? "WATCH" : "STOP"));
    return {
      month,
      score,
      decision,
      title: clean(llm.title || `${month}월`),
      action: clean(llm.action || llm.advice || ""),
    };
  });
}

function newYearDecisionClass(decision = "") {
  const value = clean(decision).toUpperCase();
  if (value === "GO") return "go";
  if (value === "STOP") return "stop";
  return "watch";
}

function buildNewYearMonthlyScoreChartHtml(seed = {}, monthlyFortunes = []) {
  const rows = newYearMonthlyVisualRows(seed, monthlyFortunes);
  const bars = rows.map((row) => {
    const decisionClass = newYearDecisionClass(row.decision);
    return `<div class="month-bar month-bar--${decisionClass}"><div class="month-bar__track"><span style="height:${row.score}%"><b>${Math.round(row.score)}</b></span></div><em>${row.month}월</em></div>`;
  }).join("");
  const tableRows = rows.map((row) => `<tr><td>${row.month}월</td><td>${Math.round(row.score)}</td><td>${escHtml(displayNewYearDecision(row.decision))}</td><td>${escHtml(row.title)}</td><td>${escHtml(row.action)}</td></tr>`).join("");
  return `<article class="visual-card visual-card--wide"><h3>월별 운세 리듬 그래프</h3><div class="monthly-score-chart">${bars}</div><table class="visual-table"><thead><tr><th>월</th><th>점수</th><th>흐름</th><th>상담 주제</th><th>실천 기준</th></tr></thead><tbody>${tableRows}</tbody></table></article>`;
}

function buildNewYearElementBalanceChartHtml(seed = {}) {
  const counts = seed?.saju?.fiveElements || {};
  const keys = ["wood", "fire", "earth", "metal", "water"];
  const max = Math.max(1, ...keys.map((key) => Number(counts[key] || 0)));
  const rows = keys.map((key) => {
    const value = Number(counts[key] || 0);
    const width = Math.max(8, Math.round((value / max) * 100));
    return `<div class="element-row"><strong>${escHtml(ELEMENT_KO[key] || key)}</strong><span><i style="width:${width}%"></i></span><em>${value}</em></div>`;
  }).join("");
  const favorable = (Array.isArray(seed?.quantumMyeongri?.favorableElements) ? seed.quantumMyeongri.favorableElements : []).map((item) => newYearElementKo(item, "")).filter(Boolean).join(" · ") || "균형";
  const caution = (Array.isArray(seed?.quantumMyeongri?.cautionElements) ? seed.quantumMyeongri.cautionElements : []).map((item) => newYearElementKo(item, "")).filter(Boolean).join(" · ") || "과열";
  return `<article class="visual-card"><h3>오행 균형 그래프</h3><div class="element-balance-chart">${rows}</div><div class="visual-tags"><span>보완 ${escHtml(favorable)}</span><span>주의 ${escHtml(caution)}</span></div></article>`;
}

function buildNewYearVisualDashboardHtml(seed = {}, renderOptions = {}) {
  const monthlyFortunes = Array.isArray(renderOptions.monthlyFortunes) ? renderOptions.monthlyFortunes : [];
  return `<section class="visual-dashboard"><h2>운의 시각 지도</h2><div class="visual-grid">${buildNewYearMonthlyScoreChartHtml(seed, monthlyFortunes)}${buildNewYearElementBalanceChartHtml(seed)}</div></section>`;
}

function renderSajuNewYearAssembledHtmlClean(seed = {}, chapters = [], renderOptions = {}) {
  const facts = buildSajuNewYearAssembledFactsClean(seed);
  const toc = buildSajuNewYearTocHtml(chapters);
  const overview = buildSajuNewYearOverviewHtml(chapters);
  const visualDashboard = buildNewYearVisualDashboardHtml(seed, renderOptions);
  const finalAdviceSource = renderOptions?.finalAdvice && typeof renderOptions.finalAdvice === "object"
    ? renderOptions.finalAdvice
    : {};
  const lastChapterSections = Array.isArray(chapters?.[chapters.length - 1]?.sections) ? chapters[chapters.length - 1].sections : [];
  const finalAdviceTitle = safeNewYearDisplayText(finalAdviceSource.title || "마지막 정리", "마지막 정리");
  const finalAdviceBody = safeNewYearDisplayText(
    finalAdviceSource.body || lastChapterSections[lastChapterSections.length - 1]?.body || "",
    "",
  );
  const tableBlock = (section) => {
    const rows = Array.isArray(section?.tableRows) ? section.tableRows : [];
    if (!rows.length) return "";
    const headers = Array.isArray(section?.tableHeaders) && section.tableHeaders.length ? section.tableHeaders : ["구분", "흐름", "실천"];
    return `<div class="table-card"><strong>${escHtml(section.tableTitle || "운세 흐름표")}</strong><table><thead><tr>${headers.map((header) => `<th>${escHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  };
  const listBlock = (label, values, limit = 3) => {
    const items = (Array.isArray(values) ? values : []).map((item) => normalizeNewYearAnnualWording(safeNewYearDisplayText(item), facts.targetYear)).filter(Boolean).slice(0, limit);
    if (!items.length) return "";
    return `<div class="note"><strong>${escHtml(label)}</strong><ul>${items.map((item) => `<li>${escHtml(item)}</li>`).join("")}</ul></div>`;
  };
  const chapterHtml = chapters.map((chapter, index) => {
    const chapterSections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const chapterSnapshot = buildSajuNewYearChapterSnapshotHtml(chapter, chapterSections);
    const sections = (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => {
      const paragraphs = renderNewYearSectionBody(section?.body || section?.finalText || section?.text || "");
      const notes = buildSajuNewYearSectionNotesHtml(section, listBlock);
      return `<section class="body-card"><h3>${escHtml(section.title)}</h3>${paragraphs}${tableBlock(section)}${notes ? `<div class="notes">${notes}</div>` : ""}</section>`;
    }).join("");
    return `<article class="chapter" style="page-break-before:${index > 0 ? "always" : "auto"}"><header><span>CHAPTER ${escHtml(String(chapter.no).padStart(2, "0"))}</span><h2>${escHtml(chapter.title)}</h2><p>${escHtml(chapter.focus || "")}</p></header>${chapterSnapshot}${sections}</article>`;
  }).join("");
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escHtml(`${facts.name}님의 ${facts.targetYear}년 신년운세`)}</title><style>@page{size:A4;margin:14mm;}*{box-sizing:border-box;}body{margin:0;background:#fffaf0;color:#2a1b10;font-family:"Noto Serif KR","Malgun Gothic",serif;line-height:1.78;}header.cover{min-height:760px;padding:72px 56px;background:linear-gradient(145deg,#120d24,#55221f 52%,#8a5a16);color:#fff;page-break-after:always;}header.cover .brand{font-size:20px;font-weight:700;}header.cover .service{margin-top:64px;font-size:13px;letter-spacing:.22em;color:#fde68a;}header.cover h1{margin:14px 0;font-size:48px;color:#fff7ce;}header.cover p{font-size:17px;color:#fff3c4;}.cover-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:34px;}.cover-grid div{border:1px solid rgba(253,230,138,.42);border-radius:8px;padding:12px;background:rgba(255,255,255,.08);}nav.toc,.overview,.visual-dashboard,main,.final-page{padding:42px 48px;background:#fff;}nav.toc{page-break-after:always;}nav.toc h2,.overview h2,.visual-dashboard h2,.final-page h2{margin:0 0 20px;color:#7f1d1d;font-size:28px;}nav.toc ol{list-style:none;margin:0;padding:0;}nav.toc li{display:grid;grid-template-columns:48px 1fr;gap:12px;border-bottom:1px solid #ead7a6;padding:12px 0;}nav.toc span{color:#991b1b;font-weight:700;}.overview{page-break-after:always;}.visual-dashboard{page-break-after:always;background:#fffdf7;}.overview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}.overview-grid div,.note,.table-card,.visual-card{border:1px solid #ead7a6;background:#fffaf0;border-radius:8px;padding:12px;}.overview-grid strong,.note strong,.table-card strong{display:block;color:#7f1d1d;margin-bottom:6px;}.visual-grid{display:grid;grid-template-columns:2fr 1fr;gap:14px;align-items:start;}.visual-card h3{margin:0 0 12px;color:#7f1d1d;font-size:18px;}.monthly-score-chart{height:188px;display:grid;grid-template-columns:repeat(12,1fr);gap:7px;align-items:end;border:1px solid #ead7a6;background:#fff;padding:12px 10px 28px;margin-bottom:12px;}.month-bar{height:148px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;}.month-bar__track{height:126px;width:100%;display:flex;align-items:flex-end;justify-content:center;background:#f7ead0;border-radius:6px 6px 3px 3px;overflow:hidden;}.month-bar__track span{display:flex;align-items:flex-start;justify-content:center;width:100%;min-height:12%;background:#b45309;color:#fff;font-size:9px;font-style:normal;padding-top:3px;}.month-bar--go .month-bar__track span{background:#15803d;}.month-bar--watch .month-bar__track span{background:#b45309;}.month-bar--stop .month-bar__track span{background:#991b1b;}.month-bar em{font-size:10px;font-style:normal;color:#7c4a21;}.visual-table{font-size:11px;}.element-balance-chart{display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid #ead7a6;padding:12px;}.element-row{display:grid;grid-template-columns:32px 1fr 28px;gap:8px;align-items:center;}.element-row strong,.element-row em{font-size:12px;color:#7f1d1d;font-style:normal;}.element-row span{height:12px;background:#f7ead0;border-radius:999px;overflow:hidden;}.element-row i{display:block;height:100%;background:#d97706;border-radius:999px;}.visual-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}.visual-tags span{border:1px solid #ead7a6;background:#fff;padding:6px 8px;border-radius:999px;font-size:11px;color:#7f1d1d;}article.chapter header{border-bottom:2px solid #d97706;margin:24px 0 20px;padding-bottom:14px;}article.chapter header span{font-size:12px;letter-spacing:.16em;color:#b45309;}article.chapter h2{margin:6px 0;color:#7f1d1d;font-size:25px;}article.chapter header p{margin:0;color:#7c4a21;}.body-card{border-left:4px solid #d97706;background:#fffaf0;border-radius:0 8px 8px 0;padding:16px 18px;margin:16px 0 20px;page-break-inside:avoid;}.body-card h3{margin:0 0 10px;color:#92400e;font-size:17px;}.body-card h5{margin:14px 0 6px;color:#7f1d1d;font-size:13px;font-weight:800;letter-spacing:0;}.body-card p{margin:0 0 12px;line-height:1.9;word-break:keep-all;overflow-wrap:break-word;}.notes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;}.note ul{margin:0;padding-left:16px;}.note li{font-size:12px;line-height:1.65;margin-bottom:4px;}table{width:100%;border-collapse:collapse;background:#fff;margin-top:10px;}th,td{border:1px solid #ead7a6;padding:8px;text-align:left;font-size:12px;line-height:1.5;}th{background:#7f1d1d;color:#fff;}.final-page{page-break-before:always;}.final-page p{font-size:14px;line-height:1.9;}</style>${SAJU_NEW_YEAR_PDF_UX_STYLE}</head><body><header class="cover"><div class="brand">Code Destiny</div><div class="service">PREMIUM SAJU NEW YEAR</div><h1>${escHtml(facts.targetYear)}년 신년운세</h1><p>사주 구조로 읽는 한 해의 흐름과 실천 로드맵</p><div class="cover-grid"><div><strong>프로필</strong><br>${escHtml(facts.name)}</div><div><strong>중심 기운</strong><br>${escHtml(facts.tenGod)}</div><div><strong>기회 흐름</strong><br>${escHtml(facts.topMonths)}</div><div><strong>점검 흐름</strong><br>${escHtml(facts.careMonths)}</div></div></header><nav class="toc"><h2>목차</h2><ol>${toc}</ol></nav><section class="overview"><h2>전체 요약</h2><div class="overview-grid">${overview}</div></section>${visualDashboard}<main>${chapterHtml}</main><section class="final-page"><h2>${escHtml(finalAdviceTitle)}</h2><p>${escHtml(finalAdviceBody)}</p></section></body></html>`;
}

function collectSajuNewYearAssembledText(chapters = []) {
  return (Array.isArray(chapters) ? chapters : []).map((chapter) => [
    chapter?.title,
    chapter?.focus,
    ...(Array.isArray(chapter?.sections) ? chapter.sections.flatMap((section) => [section.title, section.body]) : []),
  ].filter(Boolean).join("\n")).join("\n");
}

function sanitizeSajuNewYearAssembledChapters(chapters = [], targetYear = resolveDefaultTargetYear()) {
  const polishText = (value) => polishNewYearConsultationText(normalizeNewYearAnnualWording(stripForbiddenText(clean(value)), targetYear));
  const polishList = (values = []) => (Array.isArray(values) ? values : []).map((item) => polishText(item)).filter(Boolean);
  return (Array.isArray(chapters) ? chapters : []).map((chapter, chapterIndex) => {
    const sections = normalizeNewYearChapterSections(chapter).map((section) => {
      const body = polishText(section?.body || section?.finalText || section?.text || "");
      return {
        ...section,
        body,
        text: body,
        finalText: body,
        localSummary: body.slice(0, 320),
        sajuEvidence: polishList(section?.sajuEvidence),
        keyPoints: polishList(section?.keyPoints),
        actionGuide: polishList(section?.actionGuide),
        checklist: polishList(section?.checklist),
        caution: polishList(section?.caution),
      };
    });
    const categories = sections.map((section) => ({
      title: section.title,
      localSummary: section.localSummary,
      finalText: section.body,
      text: section.body,
    }));
    return {
      ...chapter,
      no: chapter?.no || chapterIndex + 1,
      sections,
      categories,
      text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    };
  });
}

function isLlmOnlyNewYearManuscriptSource(value = "") {
  return clean(value) === SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE;
}

function isNewYearLlmMetadataValid(metadata = {}) {
  const llmAssembly = metadata?.llmAssembly && typeof metadata.llmAssembly === "object" ? metadata.llmAssembly : {};
  const promptVersion = clean(metadata?.promptVersion || llmAssembly.promptVersion);
  const schemaVersion = clean(metadata?.schemaVersion || llmAssembly.schemaVersion);
  const version = clean(metadata?.version || metadata?.engineVersion || llmAssembly.version || llmAssembly.engineVersion);
  return isLlmOnlyNewYearManuscriptSource(metadata?.manuscriptSource || llmAssembly.source)
    && metadata?.llmAssemblyOnly === true
    && llmAssembly.enabled === true
    && llmAssembly.externalGeneration === true
    && (llmAssembly.externalCallsAllowed === true || llmAssembly.isMock === true || metadata?.isMock === true)
    && llmAssembly.fallbackUsed === false
    && promptVersion === SAJU_NEW_YEAR_LLM_PROMPT_VERSION
    && schemaVersion === SAJU_NEW_YEAR_LLM_SCHEMA_VERSION
    && (!version || version === SAJU_NEW_YEAR_LLM_ENGINE_VERSION);
}

function getNewYearPdfCompletionMeta(pdfReady = {}, chapters = []) {
  const metadata = pdfReady?.metadata && typeof pdfReady.metadata === "object" ? pdfReady.metadata : {};
  const chapterSource = Array.isArray(chapters) && chapters.length ? clean(chapters[0]?.source) : "";
  const manuscriptSource = clean(metadata.manuscriptSource || pdfReady?.manuscriptSource || chapterSource);
  return { metadata, manuscriptSource };
}

function validateSajuNewYearPdfCompletionPayload({ pdfReady, chapters, requireDownloadUrl = false } = {}) {
  const list = Array.isArray(chapters) ? chapters : [];
  const expectedChapters = buildSajuNewYearChapterSpecs(pdfReady?.targetYear || resolveDefaultTargetYear());
  const html = clean(pdfReady?.html || "");
  const text = `${html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")}\n${collectSajuNewYearAssembledText(list)}`;
  const completionMeta = getNewYearPdfCompletionMeta(pdfReady, list);
  const newHtmlEngine = clean(completionMeta.metadata?.version || completionMeta.metadata?.engineVersion) === NEW_YEAR_LLM_VERSION || html.includes("new-year-chapter");
  if (newHtmlEngine) {
    return validateFinalNewYearPdfPayload({
      html,
      chapters: list,
      chapterPlan: completionMeta.metadata?.chapterPlan || expectedChapters,
      targetYear: pdfReady?.targetYear || completionMeta.metadata?.targetYear,
      requireDownloadUrl,
      downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl),
    });
  }
  const llmOnly = isLlmOnlyNewYearManuscriptSource(completionMeta.manuscriptSource) && isNewYearLlmMetadataValid(completionMeta.metadata);
  const isMockPdf = completionMeta.metadata?.isMock === true || completionMeta.metadata?.llmAssembly?.isMock === true;
  const issues = [];
  if (!html.includes("<!DOCTYPE html>")) issues.push("html_shell_missing");
  if (requireDownloadUrl && !clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl)) issues.push("download_url_missing");
  if (!isLlmOnlyNewYearManuscriptSource(completionMeta.manuscriptSource)) issues.push("llm_only_manuscript_source_required");
  if (!llmOnly) issues.push("llm_metadata_invalid");
  if (clean(completionMeta.metadata?.qualityStatus) && clean(completionMeta.metadata.qualityStatus) !== "passed") issues.push("quality_status_not_passed");
  if (list.length !== expectedChapters.length) issues.push("chapter_count_mismatch");
  expectedChapters.forEach((spec, index) => {
    const chapter = list[index] || {};
    const sections = normalizeNewYearChapterSections(chapter);
    if (sections.length !== spec.categories.length) {
      issues.push(`chapter_${index + 1}_section_count_incomplete`);
      return;
    }
    spec.categories.forEach((categoryTitle, sectionIndex) => {
      if (clean(sections[sectionIndex]?.title) !== clean(categoryTitle)) {
        issues.push(`chapter_${index + 1}_category_${sectionIndex + 1}_mismatch`);
      }
      if (hasNewYearCustomerSentenceIssue(clean(sections[sectionIndex]?.body || ""))) {
        issues.push(`chapter_${index + 1}_category_${sectionIndex + 1}_customer_phrase_quality`);
      }
      if (!isMockPdf && hasNewYearTemplateSentenceIssue(clean(sections[sectionIndex]?.body || ""))) {
        issues.push(`chapter_${index + 1}_category_${sectionIndex + 1}_template_sentence_quality`);
      }
      if (clean(sections[sectionIndex]?.body || "").replace(/\s+/g, "").length < MIN_SECTION_CHARS) {
        issues.push(`chapter_${index + 1}_category_${sectionIndex + 1}_min_chars`);
      }
      if (!llmOnly) {
        const coverage = validateSajuNewYearCategoryCoverage({
          body: clean(sections[sectionIndex]?.body || ""),
          categoryTitle,
          chapterSpec: spec,
          section: sections[sectionIndex],
        });
        if (!coverage.ok) issues.push(`chapter_${index + 1}_category_${sectionIndex + 1}_consultation_quality`);
      }
    });
  });
  if (collectSajuNewYearAssembledText(list).replace(/\s+/g, "").length < MIN_TOTAL_CHARS) issues.push("manuscript_too_short");
  if (SAJU_NEW_YEAR_ASSEMBLED_MOJIBAKE_RE.test(text)) issues.push("mojibake_detected");
  if (SAJU_NEW_YEAR_ASSEMBLED_FORBIDDEN_RE.test(text)) issues.push("forbidden_terms_detected");
  const sentenceDiversity = llmOnly ? { ok: true, stats: { skipped: "llm_only_validated_upstream" } } : validateSajuNewYearSentenceDiversity({ chapters: list });
  if (!sentenceDiversity.ok) issues.push("consultation_sentence_diversity");
  return {
    ok: issues.length === 0,
    issues,
    chapterCount: list.length,
    expectedChapterCount: expectedChapters.length,
    htmlLength: html.length,
    textLength: collectSajuNewYearAssembledText(list).replace(/\s+/g, "").length,
    sentenceDiversity: sentenceDiversity.stats,
  };
}

function buildNewYearPdfFilename(targetYear, rawName = "user") {
  const year = Number(targetYear || 0) || resolveDefaultTargetYear();
  const safeName = clean(rawName || "user")
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase() || "user";
  return `saju-new-year-${year}-${safeName}.pdf`;
}

function buildNewYearHtmlFilename(targetYear, rawName = "user") {
  return buildNewYearPdfFilename(targetYear, rawName).replace(/\.pdf$/i, ".html");
}

function prepareSajuNewYearLlmChaptersForRender(chapters = [], options = {}) {
  const monthlyFortunes = Array.isArray(options.monthlyFortunes) ? options.monthlyFortunes : [];
  const monthlyVisualRows = newYearMonthlyVisualRows(options.seed || {}, monthlyFortunes);
  return (Array.isArray(chapters) ? chapters : []).map((chapter, chapterIndex) => {
    const sections = (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section, sectionIndex) => {
      const nextSection = {
        title: clean(section?.title),
        body: clean(section?.body || section?.finalText || section?.text),
        text: clean(section?.body || section?.finalText || section?.text),
        finalText: clean(section?.body || section?.finalText || section?.text),
        sajuEvidence: Array.isArray(section?.sajuEvidence) ? section.sajuEvidence.map(clean).filter(Boolean) : [],
        keyPoints: Array.isArray(section?.keyPoints) ? section.keyPoints.map(clean).filter(Boolean) : [],
        actionGuide: Array.isArray(section?.actionGuide) ? section.actionGuide.map(clean).filter(Boolean) : [],
        checklist: Array.isArray(section?.checklist) ? section.checklist.map(clean).filter(Boolean) : [],
        caution: Array.isArray(section?.caution) ? section.caution.map(clean).filter(Boolean) : [],
      };
      if (Number(chapter?.no || chapterIndex + 1) === 9 && sectionIndex === 4 && monthlyFortunes.length === 12) {
        nextSection.tableType = "monthly-flow";
        nextSection.tableTitle = "12개월 월별 실행·정비표";
        nextSection.tableHeaders = ["월", "점수", "흐름", "실천 기준"];
        nextSection.tableRows = monthlyFortunes.map((item, itemIndex) => [
          `${Number(item.month || 0)}월`,
          String(Math.round(monthlyVisualRows[itemIndex]?.score ?? 0)),
          clean(item.title || item.flow),
          clean(item.action || item.advice),
        ]);
      }
      return nextSection;
    });
    return {
      no: Number(chapter?.no || chapterIndex + 1),
      id: clean(chapter?.id || String(chapter?.no || chapterIndex + 1)),
      title: clean(chapter?.title),
      focus: clean(chapter?.focus),
      sections,
      categories: sections.map((section) => ({
        title: section.title,
        finalText: section.body,
        text: section.body,
      })),
      text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
      source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
      metadata: {
        ...(chapter?.metadata || {}),
        manuscriptSource: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
        generationMode: SAJU_NEW_YEAR_LLM_GENERATION_MODE,
        promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
        schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
      },
    };
  });
}

function buildPdfReadyPayloadLlmOnly(seed, chapters, metadata = {}) {
  const llmChapters = prepareSajuNewYearLlmChaptersForRender(chapters, { ...metadata, seed });
  return {
    title: `${seed.targetYear}년 신년운세 프리미엄 리포트`,
    filename: buildNewYearPdfFilename(seed.targetYear, seed?.birthProfile?.name),
    htmlFilename: buildNewYearHtmlFilename(seed.targetYear, seed?.birthProfile?.name),
    generatedAt: new Date().toISOString(),
    profile: {
      ...(seed.birthProfile || {}),
      name: safeNewYearDisplayText(seed?.birthProfile?.name, "고객"),
    },
    targetYear: seed.targetYear,
    quantumMyeongri: seed.quantumMyeongri || seed.saju?.quantumMyeongri || null,
    metadata: {
      ...metadata,
      manuscriptSource: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
      generationMode: SAJU_NEW_YEAR_LLM_GENERATION_MODE,
      promptVersion: SAJU_NEW_YEAR_LLM_PROMPT_VERSION,
      schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
      qualityVersion: SAJU_NEW_YEAR_LLM_QUALITY_VERSION,
      llmAssemblyOnly: true,
    },
    html: renderSajuNewYearAssembledHtmlClean(seed, llmChapters, metadata),
    chapters: llmChapters.map((chapter) => ({
      chapter: chapter.no,
      title: chapter.title,
      categories: (Array.isArray(chapter.categories) ? chapter.categories : []).map((category) => category.title),
      text: chapter.text,
      source: chapter.source,
    })),
  };
}

function pillarLabel(pillar = {}) {
  return clean(pillar?.label || `${clean(pillar?.stem)}${clean(pillar?.branch)}`);
}

function toCleanArray(value) {
  if (Array.isArray(value)) return value.map((item) => cleanNormalizedText(item)).filter(Boolean);
  if (value && typeof value === "object") {
    const text = clean(value.label || value.name || value.title || value.text || value.summary || value.meaning || value.value || "");
    return text ? [text] : [];
  }
  const text = clean(value);
  return text ? [text] : [];
}

function cleanNormalizedText(value) {
  if (!value || typeof value !== "object") return clean(value);
  return clean(value.label || value.name || value.title || value.text || value.summary || value.meaning || value.value || "");
}

function normalizeElementCounts(fiveElements = {}) {
  const source = fiveElements?.counts || fiveElements?.scores || fiveElements?.ratio || fiveElements || {};
  return ["wood", "fire", "earth", "metal", "water"].reduce((acc, key) => {
    acc[key] = Number(source?.[key] || 0);
    return acc;
  }, {});
}

function rankedKeysFromCounts(counts = {}, order = "desc") {
  const rows = Object.entries(counts).filter(([, value]) => Number(value) > 0);
  rows.sort((a, b) => order === "asc" ? Number(a[1]) - Number(b[1]) : Number(b[1]) - Number(a[1]));
  if (!rows.length) return [];
  const edge = Number(rows[0][1]);
  return rows.filter(([, value]) => Number(value) === edge).map(([key]) => key);
}

function normalizeTenGodDistribution(tenGods = {}) {
  const source = tenGods?.distribution || tenGods?.counts || tenGods?.scores || tenGods || {};
  return Object.entries(source).reduce((acc, [key, value]) => {
    const name = clean(key);
    const score = Number(value);
    if (name && Number.isFinite(score)) acc[name] = score;
    return acc;
  }, {});
}

function usefulGodRelationFromRole(role) {
  const value = clean(role).toLowerCase();
  if (!value) return "neutral";
  if (/support|favorable|useful|good|go/.test(value)) return "favorable";
  if (/caution|unfavorable|avoid|bad|stop/.test(value)) return "unfavorable";
  if (/mixed/.test(value)) return "mixed";
  return "neutral";
}

function uniqueInterpretationBlocks(blocks = []) {
  const seen = new Set();
  return blocks
    .filter(Boolean)
    .filter((block) => {
      const id = clean(block.id);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0));
}

function selectYearlyInterpretationBlocks(normalizedData = {}) {
  const annual = normalizedData.annual || {};
  const natal = normalizedData.natal || {};
  const monthly = Array.isArray(normalizedData.monthly) ? normalizedData.monthly : [];
  const blocks = [
    ANNUAL_STEM_BLOCKS[annual.heavenlyStem],
    ANNUAL_BRANCH_BLOCKS[annual.earthlyBranch],
    ANNUAL_TEN_GOD_BLOCKS[annual.tenGodToDayMaster],
    YEARLY_CONTEXT_BLOCKS.elementExcess,
    YEARLY_CONTEXT_BLOCKS.elementDeficit,
    annual.usefulGodRelation === "favorable" ? YEARLY_CONTEXT_BLOCKS.usefulFavorable : null,
    annual.usefulGodRelation === "unfavorable" ? YEARLY_CONTEXT_BLOCKS.usefulUnfavorable : null,
    annual.currentDaewoon ? YEARLY_CONTEXT_BLOCKS.daewoonAnnual : null,
    (annual.clashes || []).length ? YEARLY_CONTEXT_BLOCKS.relationClash : null,
    (annual.combinations || []).length ? YEARLY_CONTEXT_BLOCKS.relationCombination : null,
    ((annual.punishments || []).length || (annual.harms || []).length) ? YEARLY_CONTEXT_BLOCKS.relationHarmBreakPunishment : null,
    monthly.some((item) => (item.opportunities || []).length || /favorable/i.test(clean(item.usefulGodRelation))) ? YEARLY_CONTEXT_BLOCKS.monthlyOpportunity : null,
    monthly.some((item) => (item.risks || []).length || /unfavorable/i.test(clean(item.usefulGodRelation))) ? YEARLY_CONTEXT_BLOCKS.monthlyRisk : null,
    YEARLY_CONTEXT_BLOCKS.career,
    YEARLY_CONTEXT_BLOCKS.money,
    YEARLY_CONTEXT_BLOCKS.relationship,
    YEARLY_CONTEXT_BLOCKS.health,
    YEARLY_CONTEXT_BLOCKS.routine12,
  ];
  const all = uniqueInterpretationBlocks(blocks);
  return {
    all,
    byId: Object.fromEntries(all.map((block) => [block.id, block])),
    byTag: all.reduce((acc, block) => {
      for (const tag of block.tags || []) {
        if (!acc[tag]) acc[tag] = [];
        acc[tag].push(block);
      }
      return acc;
    }, {}),
    monthlyCoverage: monthly.length,
    elementFocus: {
      strongest: natal.fiveElements?.strongest || [],
      weakest: natal.fiveElements?.weakest || [],
    },
  };
}

function buildYearlySajuNormalizedData({ seed = {}, masterJson = {} } = {}) {
  const profile = seed.birthProfile || {};
  const pillars = seed.saju?.pillars || {};
  const annual = seed.saju?.annualLuck || {};
  const relations = seed.saju?.relations || {};
  const useful = seed.saju?.usefulGod || {};
  const elementCounts = normalizeElementCounts(seed.saju?.fiveElements || {});
  const tenGodDistribution = normalizeTenGodDistribution(seed.saju?.tenGods || {});
  const dominantTenGodScore = Math.max(0, ...Object.values(tenGodDistribution).map((value) => Number(value) || 0));
  const weakTenGodScore = Math.min(...Object.values(tenGodDistribution).filter((value) => Number(value) > 0).map((value) => Number(value)));
  const monthlyFlow = Array.isArray(masterJson.monthlyFlow) ? masterJson.monthlyFlow : [];
  const monthlyLuck = Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const derived = seed.derivedSignals || {};
  const facts = seed.annualFortuneFacts || buildAnnualFortuneFacts(seed);
  const natalRelationMessages = (relations.branchRelations || []).map((row) => clean(row?.message)).filter(Boolean);
  const opportunities = toCleanArray(derived.opportunitySignals).concat(toCleanArray(facts.opportunityWindows)).slice(0, 8);
  const risks = toCleanArray(derived.crisisSignals).concat(toCleanArray(facts.riskWarnings)).slice(0, 8);

  return {
    service: "yearly-saju",
    targetYear: Number(seed.targetYear || masterJson.targetYear || resolveDefaultTargetYear()),
    profile: {
      name: clean(profile.name),
      gender: clean(profile.gender),
      birthDate: clean(profile.birthDate),
      birthTime: clean(profile.birthTime),
      calendarType: clean(profile.calendarType),
    },
    clientSajuEvidence: masterJson.clientSajuEvidence || undefined,
    natal: {
      pillars: {
        year: pillarLabel(pillars.year),
        month: pillarLabel(pillars.month),
        day: pillarLabel(pillars.day),
        hour: pillarLabel(pillars.hour),
      },
      dayMaster: {
        stem: clean(seed.saju?.dayMaster),
        element: clean(LOCAL_STEM_ELEMENT[seed.saju?.dayMaster] || STEM_ELEMENT[seed.saju?.dayMaster] || ""),
        yinYang: clean(STEM_YINYANG[seed.saju?.dayMaster] || ""),
        strength: clean(seed.saju?.dayMasterStrength || seed.saju?.strength || ""),
      },
      fiveElements: {
        ...elementCounts,
        strongest: rankedKeysFromCounts(elementCounts, "desc"),
        weakest: rankedKeysFromCounts(elementCounts, "asc"),
        balanceSummary: clean(seed.quantumMyeongri?.professionalSummary || "계산 가능한 오행 분포만 반영했습니다."),
      },
      tenGods: {
        distribution: tenGodDistribution,
        dominant: Object.entries(tenGodDistribution).filter(([, value]) => Number(value) === dominantTenGodScore && dominantTenGodScore > 0).map(([key]) => key),
        weak: Object.entries(tenGodDistribution).filter(([, value]) => Number(value) === weakTenGodScore && Number.isFinite(weakTenGodScore)).map(([key]) => key),
      },
      usefulGods: {
        yongshin: cleanNormalizedText(useful.yong || useful.useful || useful.primary || ""),
        heeshin: toCleanArray(useful.hi || useful.hee || useful.heeshin || useful.secondary),
        gishin: toCleanArray(useful.gisin || useful.kishin || useful.avoid),
        summary: clean(seed.structure?.usefulGodKeywords?.length ? `용신·희신 키워드는 ${seed.structure.usefulGodKeywords.join(" / ")} 흐름입니다.` : "확정된 용신 보조 키워드만 반영했습니다."),
      },
      structure: {
        geokguk: clean(seed.structure?.geokguk),
        seasonalEnergy: clean(seed.natalChart?.season),
        monthBranch: clean(seed.natalChart?.monthBranch || pillars.month?.branch),
        notes: toCleanArray(seed.structure?.usefulGodKeywords),
      },
    },
    annual: {
      yearGanji: clean(annual.label),
      heavenlyStem: clean(annual.stem),
      earthlyBranch: clean(annual.branch),
      tenGodToDayMaster: clean(annual.tenGod),
      elementInfluence: [clean(annual.elementKo), clean(annual.dayMasterRelation), clean(annual.quantum?.summary)].filter(Boolean),
      usefulGodRelation: usefulGodRelationFromRole(annual.quantum?.elementRole || annual.quantum?.decision),
      currentDaewoon: Array.isArray(seed.saju?.luckCycle) ? seed.saju.luckCycle.find((item) => {
        const start = Number(item?.startYear || item?.fromYear || item?.year || 0);
        const end = Number(item?.endYear || item?.toYear || 0);
        return start && end ? Number(seed.targetYear) >= start && Number(seed.targetYear) <= end : false;
      }) || null : null,
      annualStars: [],
      clashes: (relations.clashes || []).map((row) => clean(row?.message)).filter(Boolean),
      combinations: (relations.combinations || []).map((row) => clean(row?.message)).filter(Boolean),
      punishments: (relations.punishments || []).map((row) => clean(row?.message || row?.label)).filter(Boolean),
      harms: (relations.harms || []).map((row) => clean(row?.message)).filter(Boolean),
      opportunities,
      risks,
      summaryKeywords: toCleanArray(seed.luckCycles?.targetYearSewoon?.keywords).concat(natalRelationMessages.slice(0, 2)).slice(0, 8),
    },
    monthly: monthlyLuck.map((item, index) => {
      const flow = monthlyFlow[index] || {};
      const opportunitySignals = toCleanArray(seed.luckCycles?.monthlyFortunes?.[index]?.opportunitySignals);
      const cautionSignals = toCleanArray(seed.luckCycles?.monthlyFortunes?.[index]?.cautionSignals);
      return {
        month: Number(item.month || flow.month || index + 1),
        monthGanji: clean(item.pillar?.label || flow.pillar),
        tenGodToDayMaster: clean(localTenGod(seed.saju?.dayMaster, item.pillar?.stem || "")),
        elementInfluence: [clean(LOCAL_ELEMENT_KO[item.pillar?.element] || ELEMENT_KO[item.pillar?.element] || ""), clean(item.relation || flow.relation), clean(item.quantumSummary || flow.quantumSummary)].filter(Boolean),
        usefulGodRelation: usefulGodRelationFromRole(item.quantumRole || item.decision || flow.decision),
        opportunities: opportunitySignals,
        risks: cautionSignals,
        relationshipHint: clean(item.finalScore >= 70 ? "관계 조율과 만남에 힘을 실을 수 있는 달입니다." : ""),
        moneyHint: clean(item.finalScore >= 72 ? "수익 구조 점검과 실행에 활용하기 좋은 달입니다." : ""),
        careerHint: clean(item.finalScore >= 72 ? "일정, 제안, 발표를 전진시키기 좋은 달입니다." : ""),
        healthHint: clean(item.finalScore < 60 ? "무리한 일정과 피로 누적을 조심해야 하는 달입니다." : ""),
        actionHint: clean(item.advice || flow.advice),
      };
    }),
    yearlyThemes: {
      mainTheme: toCleanArray(derived.yearlyThemeSignals),
      career: toCleanArray(derived.careerSignals),
      money: toCleanArray(derived.moneySignals),
      relationship: toCleanArray(derived.humanRelationSignals).concat(toCleanArray(derived.loveRelationshipSignals)).slice(0, 8),
      health: toCleanArray(derived.healthMindSignals),
      studyOrGrowth: toCleanArray(derived.quantumSignals).slice(0, 4),
      caution: risks,
      actionPlan: toCleanArray(derived.monthlyStrategySignals).slice(0, 12),
    },
  };
}

function normalizeYearlySajuInput({ profile, targetYear, body = {}, natalCalculation = null } = {}) {
  const seed = natalCalculation || buildPdfSeed(profile, targetYear, body);
  const seedValidation = validateSajuNewYearSeed(seed);
  if (!seedValidation.ok) {
    throw Object.assign(new Error(`SAJU_NEW_YEAR_SEED_INVALID:${seedValidation.errors.join(",")}`), {
      code: "SAJU_NEW_YEAR_SEED_INVALID",
      status: 422,
    });
  }

  const masterJson = buildNewYearMasterJson(seed, body);
  const masterJsonValidation = validateNewYearMasterJson(masterJson);
  if (!masterJsonValidation.ok) {
    throw Object.assign(new Error(`SAJU_NEW_YEAR_MASTER_JSON_INVALID:${masterJsonValidation.errors.join(",")}`), {
      code: "SAJU_NEW_YEAR_MASTER_JSON_INVALID",
      status: 422,
    });
  }

  const normalizedData = buildYearlySajuNormalizedData({ seed, masterJson });
  const interpretationBlocks = selectYearlyInterpretationBlocks(normalizedData);
  const monthlyFortuneSections = buildMonthlyFortuneSections({ seed });
  const chapterConfig = buildSajuNewYearChapterConfig(seed.targetYear);

  return {
    profile: seed.birthProfile,
    targetYear: seed.targetYear,
    seed,
    natalCalculation: seed.saju,
    yearlyCalculation: seed.saju?.annualLuck || null,
    monthlyCalculation: Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [],
    masterJson,
    masterJsonValidation,
    normalizedData,
    interpretationBlocks,
    monthlyFortuneSections,
    expectedChapters: chapterConfig.chapters,
    chapterConfigSource: chapterConfig.source,
    chapterConfigVersion: chapterConfig.chapterConfigVersion,
  };
}

function composeMonthlyFortuneTable(normalized = {}) {
  return Array.isArray(normalized.monthlyCalculation) ? normalized.monthlyCalculation : [];
}

function topYearlyMonths(seed = {}, mode = "opportunity", limit = 3) {
  const rows = Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck.slice() : [];
  rows.sort((a, b) => mode === "risk"
    ? Number(a.finalScore ?? a.score ?? 0) - Number(b.finalScore ?? b.score ?? 0)
    : Number(b.finalScore ?? b.score ?? 0) - Number(a.finalScore ?? a.score ?? 0));
  return rows.slice(0, limit);
}

function monthListText(rows = []) {
  return rows.map((item) => `${Number(item.month || 0)}월 ${clean(item.pillar?.label || "")}`).filter(Boolean).join(", ");
}

function monthlyPhrase(pool = [], index = 0, seedKey = "") {
  if (!pool.length) return "";
  const offset = stableYearlyHash(seedKey);
  return pool[Math.abs((Number(index) || 0) + offset) % pool.length];
}

function buildMonthlyFortuneSectionsLegacy(normalized = {}) {
  const seed = normalized.seed || {};
  const annual = seed.saju?.annualLuck || {};
  const monthly = Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const dayMaster = clean(seed.saju?.dayMaster || "");
  const annualLabel = clean(annual.label || "올해 세운");
  const annualTenGod = clean(annual.tenGod || "세운");
  const fallbackMonthly = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    pillar: { label: "", stem: "", branch: "", element: annual.element || "earth" },
    finalScore: 62,
    score: 62,
    decision: "BALANCE",
    tone: "정비",
    relation: annual.dayMasterRelation || "중립",
  }));
  const source = monthly.length ? monthly : fallbackMonthly;
  return source.map((item, index) => {
    const month = Number(item.month || index + 1);
    const pillar = item.pillar || {};
    const score = Number(item.finalScore ?? item.score ?? 62);
    const decision = clean(item.decision || decisionFromScore(score));
    const monthGanji = clean(pillar.label || `${clean(pillar.stem)}${clean(pillar.branch)}`);
    const monthlyTenGod = clean(localTenGod(dayMaster, pillar.stem || ""));
    const relation = clean(item.relation || annual.dayMasterRelation || "중립");
    const usefulRelation = usefulGodRelationFromRole(item.quantumRole || decision);
    const isOpportunity = score >= 72 || usefulRelation === "favorable" || /GO/i.test(decision);
    const isRisk = score < 60 || usefulRelation === "unfavorable" || /STOP/i.test(decision);
    const isCombo = /합|combination/i.test(JSON.stringify(item));
    const isVolatile = /충|형|파|해|clash|harm|break|punishment/i.test(JSON.stringify(item));
    const monthlyKeyword = [
      monthGanji && `${monthGanji} 월운`,
      monthlyTenGod && `${monthlyTenGod} 흐름`,
      relation,
      decision,
    ].filter(Boolean).slice(0, 3).join(" · ");
    const opportunityBase = isOpportunity
      ? monthlyPhrase([
        "준비해 둔 제안과 실행 계획을 밖으로 꺼내기 좋은 달입니다.",
        "작게 열어 둔 일이 실제 반응으로 이어질 수 있는 달입니다.",
        "실행의 저항이 줄어드니 핵심 일정 하나를 전면에 세워도 좋습니다.",
      ], index)
      : monthlyPhrase([
        "큰 확장보다 준비와 정리에서 기회를 만드는 달입니다.",
        "기회는 빠른 승부보다 조건을 다듬는 과정에서 생깁니다.",
        "눈에 띄는 성과보다 다음 달을 위한 기반 정리가 더 유리합니다.",
      ], index);
    const cautionBase = isRisk
      ? monthlyPhrase([
        "무리한 지출, 감정적 결론, 급한 약속 변경을 줄여야 합니다.",
        "속도를 낮추고 사람과 돈의 경계를 분명히 해야 손실을 줄입니다.",
        "피로와 조급함이 판단을 흐릴 수 있으니 결정 사이에 여백을 두세요.",
      ], index)
      : monthlyPhrase([
        "좋은 흐름이 있어도 조건 확인과 일정 관리는 필요합니다.",
        "확장과 관리의 균형을 잃지 않는 것이 이번 달의 안전장치입니다.",
        "성과가 보이는 달일수록 기록과 약속을 명확히 남기세요.",
      ], index);
    const relationNote = isCombo
      ? "합의 기운이 있어 기회가 생길 수 있으나 관계와 조건을 확인해야 하는 달입니다."
      : isVolatile
        ? "충·형·파·해성 변동이 느껴질 수 있으니 과장보다 변동성 관리가 중요합니다."
        : "관계는 급히 넓히기보다 말의 온도와 약속의 지속성을 보는 편이 좋습니다.";
    return {
      month,
      title: `${month}월 ${monthGanji || "월운"} 운세`,
      summary: `${annualLabel} 세운의 ${annualTenGod} 흐름 위에 ${monthlyKeyword || "월별 생활 리듬"}이 겹치는 달입니다. ${isOpportunity ? "실행과 제안에 힘을 실을 수 있습니다." : isRisk ? "속도 조절과 정비가 우선입니다." : "균형 있게 운영할 때 안정감이 커집니다."}`,
      opportunity: opportunityBase,
      caution: cautionBase,
      relationship: relationNote,
      money: isOpportunity
        ? "수입 가능성은 열리지만 조건, 수수료, 지출 계획을 함께 확인해야 합니다."
        : isRisk
          ? "새 지출보다 고정비와 미뤄 둔 비용을 점검하는 데 적합합니다."
          : "소비는 계획 안에서 움직이고 작은 수익 구조를 점검하기 좋습니다.",
      career: isOpportunity
        ? "일과 커리어에서는 발표, 제안, 협상, 지원처럼 밖으로 보이는 행동이 유리합니다."
        : isRisk
          ? "업무에서는 검토, 수정, 일정 재배치가 필요하며 무리한 확장은 피하는 편이 좋습니다."
          : "기존 업무의 완성도와 협업 조건을 다듬으면 다음 기회가 편해집니다.",
      health: isRisk
        ? "수면, 소화, 긴장 누적을 가볍게 보지 말고 회복 일정을 먼저 확보하세요."
        : "몸의 리듬은 무난하지만 과열을 막기 위해 휴식 시간을 일정 안에 넣는 편이 좋습니다.",
      action: isOpportunity
        ? "이번 달 실천은 핵심 목표 하나를 정하고 실제 일정에 올리는 것입니다."
        : isRisk
          ? "이번 달 실천은 중요한 결정을 늦추고 점검표를 먼저 채우는 것입니다."
          : "이번 달 실천은 진행 중인 일을 하나 끝맺고 다음 달 준비를 시작하는 것입니다.",
      luckyRoutine: monthlyPhrase([
        "월초 목표 1개와 금지 행동 1개를 적고 매주 같은 요일에 점검하세요.",
        "아침에는 일정 우선순위를, 저녁에는 지출과 감정 소모를 짧게 기록하세요.",
        "중요한 대화 전에는 원하는 결론과 양보 가능한 범위를 먼저 적어 두세요.",
        "하루 20분 정리 시간을 고정해 생각, 돈, 관계의 흐름을 가볍게 비우세요.",
      ], index),
    };
  });
}

function buildMonthlyFortuneSections(normalized = {}) {
  const seed = normalized.seed || {};
  const annual = seed.saju?.annualLuck || {};
  const monthly = Array.isArray(seed.saju?.monthlyLuck) ? seed.saju.monthlyLuck : [];
  const dayMaster = clean(seed.saju?.dayMaster || "");
  const annualLabel = clean(annual.label || "올해 세운");
  const annualTenGod = clean(annual.tenGod || "세운");
  const annualRelation = clean(annual.dayMasterRelation || "중립");
  const fallbackMonthly = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    pillar: { label: "", stem: "", branch: "", element: annual.element || "earth" },
    finalScore: 62,
    score: 62,
    decision: "BALANCE",
    relation: annualRelation,
    advice: "",
  }));
  const monthlyByMonth = new Map(monthly
    .map((item, index) => [Number(item?.month || index + 1), item])
    .filter(([month]) => Number.isFinite(month) && month >= 1 && month <= 12));
  const source = fallbackMonthly.map((fallback) => monthlyByMonth.get(fallback.month) || fallback);
  const phraseSeed = yearlySentenceSeed(seed, "monthly-card");

  return source.map((item, index) => {
    const month = Number(item.month || index + 1);
    const pillar = item.pillar || {};
    const score = Number(item.finalScore ?? item.score ?? 62);
    const decision = clean(item.decision || decisionFromScore(score));
    const monthGanji = clean(pillar.label || `${clean(pillar.stem)}${clean(pillar.branch)}`);
    const monthlyTenGod = clean(localTenGod(dayMaster, pillar.stem || ""));
    const relation = clean(item.relation || annualRelation);
    const usefulRelation = usefulGodRelationFromRole(item.quantumRole || decision);
    const itemText = JSON.stringify(item);
    const isOpportunity = score >= 72 || usefulRelation === "favorable" || /GO/i.test(decision);
    const isRisk = score < 60 || usefulRelation === "unfavorable" || /STOP/i.test(decision);
    const isCombo = /합|combination/i.test(itemText);
    const isVolatile = /충|형|파|해|clash|harm|break|punishment/i.test(itemText);
    const keyword = [
      monthGanji ? `${monthGanji} 월운` : "생활 리듬 정비",
      monthlyTenGod ? `${monthlyTenGod} 흐름` : annualTenGod,
      relation,
    ].filter(Boolean).slice(0, 3).join(" · ");
    const opportunity = isOpportunity
      ? monthlyPhrase([
        "준비해 둔 제안과 실행 계획을 바깥으로 꺼내기 좋은 달입니다.",
        "작게 이어 온 일이 실제 반응으로 이어질 수 있으니 핵심 일정을 앞에 두세요.",
        "실행의 탄력이 생기므로 한 가지 목표를 분명하게 잡으면 성과가 또렷해집니다.",
      ], index, phraseSeed)
      : monthlyPhrase([
        "빠른 확장보다 조건 정리와 기반 다지기에서 기회가 생기는 달입니다.",
        "눈에 보이는 성과보다 다음 달을 위한 준비가 운의 쓰임을 살립니다.",
        "작은 약속과 기록을 정돈하면 뒤늦게 좋은 흐름으로 이어질 수 있습니다.",
      ], index, phraseSeed);
    const caution = isRisk
      ? monthlyPhrase([
        "무리한 지출, 감정적 결론, 급한 일정 변경을 줄여야 합니다.",
        "속도를 낮추고 사람과 돈의 경계를 분명히 해야 손실을 줄일 수 있습니다.",
        "조급함이 판단을 흐릴 수 있으니 중요한 결정 사이에 여백을 두세요.",
      ], index, phraseSeed)
      : monthlyPhrase([
        "좋은 흐름이 있어도 조건 확인과 일정 관리는 끝까지 필요합니다.",
        "확장과 관리의 균형을 잃지 않는 것이 이번 달의 안전장치입니다.",
        "성과가 보일수록 기록, 약속, 책임 범위를 명확히 남기세요.",
      ], index, phraseSeed);
    const relationship = isCombo
      ? "합의 기운이 있어 기회가 생길 수 있으나 관계와 조건을 확인해야 하는 달입니다."
      : isVolatile
        ? "충·형·파·해 계열 신호는 과장된 불안보다 변동성 관리로 받아들이는 편이 좋습니다."
        : "관계는 급히 넓히기보다 말의 온도와 약속의 지속성을 살피는 쪽이 안정적입니다.";

    const section = {
      month,
      title: `${month}월 ${monthGanji || "월운"} 운세`,
      summary: `${annualLabel}의 ${annualTenGod} 흐름 위에 ${keyword}가 겹치는 달입니다. ${isOpportunity ? "실행과 제안에 힘을 실을 수 있습니다." : isRisk ? "속도 조절과 정비가 우선입니다." : "균형 있게 운영하면 안정감이 커집니다."}`,
      opportunity,
      caution,
      relationship,
      money: isOpportunity
        ? "수입 가능성은 열리지만 계약 조건, 수수료, 지출 계획을 함께 확인해야 합니다."
        : isRisk
          ? "큰 지출보다 고정비와 미뤄 둔 비용을 점검하는 데 적합합니다."
          : "소비는 계획 안에서 움직이고 작은 수익 구조를 점검하기 좋습니다.",
      career: isOpportunity
        ? "일과 커리어에서는 발표, 제안, 협상, 지원처럼 바깥으로 보이는 행동이 유리합니다."
        : isRisk
          ? "업무에서는 검토, 수정, 일정 재배치가 필요하며 무리한 확장은 피하는 편이 좋습니다."
          : "기존 업무의 완성도를 높이고 작업 조건을 다듬으면 다음 기회가 선명해집니다.",
      health: isRisk
        ? "수면, 소화, 긴장 누적을 가볍게 보지 말고 회복 일정을 먼저 확보하세요."
        : "몸의 리듬은 무난하지만 과열을 막기 위해 휴식 시간을 일정 안에 넣는 편이 좋습니다.",
      action: isOpportunity
        ? "이번 달 실천은 핵심 목표 하나를 정하고 실제 일정에 올리는 것입니다."
        : isRisk
          ? "이번 달 실천은 중요한 결정을 늦추고 점검표를 먼저 채우는 것입니다."
          : "이번 달 실천은 진행 중인 일을 하나 마감하고 다음 달 준비를 시작하는 것입니다.",
      luckyRoutine: monthlyPhrase([
        "월초 목표 1개와 금지 행동 1개를 적고 매주 같은 요일에 점검하세요.",
        "아침에는 일정 우선순위를, 저녁에는 지출과 감정 소모를 짧게 기록하세요.",
        "중요한 대화 전에는 원하는 결론과 양보 가능한 범위를 먼저 적어 두세요.",
        "하루 20분 정리 시간을 고정해 생각, 돈, 관계의 흐름을 가볍게 비우세요.",
      ], index, phraseSeed),
    };
    for (const key of ["title", "summary", "opportunity", "caution", "relationship", "money", "career", "health", "action", "luckyRoutine"]) {
      section[key] = softenAnnualFortuneRiskText(section[key], seed?.targetYear);
    }
    return section;
  });
}

function buildNewYearArchiveUrl(origin, reportId) {
  const base = clean(origin).replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
}

function buildNewYearArchiveUrls(origin, reportId) {
  const archiveUrl = buildNewYearArchiveUrl(origin, reportId);
  return {
    archiveUrl,
    htmlUrl: archiveUrl ? `${archiveUrl}?format=html` : "",
    pdfUrl: archiveUrl ? `${archiveUrl}?format=pdf` : "",
  };
}

async function findNewYearReusableExecution(env, userId, executionCtx = {}, fallback = {}) {
  try {
    await connectDb(withPdfFastDbEnv(env));
    const filters = [];
    const executionKey = clean(executionCtx.executionKey);
    const sessionId = clean(executionCtx.sessionId || fallback.sessionId);
    const reportId = clean(executionCtx.reportId || fallback.reportId);
    const paymentSessionId = clean(executionCtx.paymentSessionId);
    if (executionKey) filters.push({ executionKey });
    if (sessionId) filters.push({ sessionId });
    if (reportId) filters.push({ reportId });
    if (paymentSessionId) filters.push({ paymentSessionId });
    if (!filters.length) return null;
    return await ServiceExecutionTransaction.findOne({
      userId,
      reportType: "sajuNewYear",
      $or: filters,
    }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  } catch (error) {
    console.warn("[new-year][reusable-execution-lookup-failed]", clean(error?.message || error));
    return null;
  }
}

function buildNewYearReusableExecutionResponse(doc = {}, fallback = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const payload = archive?.payload && typeof archive.payload === "object" ? archive.payload : {};
  const pdfReadySource = archive.pdfReady || metadata.pdfReady || payload.pdfReady || null;
  const pdfReady = pdfReadySource && typeof pdfReadySource === "object" ? { ...pdfReadySource } : {};
  if (pdfReady?.html && /\b(?:undefined|null|NaN)\b|\[object Object\]|준비중|생성 실패|스켈레톤/i.test(String(pdfReady.html || ""))) {
    return null;
  }
  const storedUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || archive.downloadUrl || archive.pdfUrl || payload.downloadUrl || payload.pdfUrl);
  const reportId = clean(doc.reportId || archive.reportId || metadata.reportId || fallback.reportId);
  const sessionId = clean(doc.sessionId || metadata.sessionId || fallback.sessionId);
  const targetYear = Number(archive.targetYear || metadata.targetYear || payload.targetYear || fallback.targetYear || 0) || null;
  const cacheKey = clean(metadata.cacheKey || archive.cacheKey || payload.cacheKey || fallback.cacheKey);
  const isCompleted = clean(doc.status) === "success" && clean(doc.premiumStatus) === "completed";
  const isFailed = clean(doc.status) === "failed" || clean(doc.premiumStatus) === "failed";

  if (isCompleted && storedUrl) {
    const chapters = Array.isArray(archive.chapters)
      ? archive.chapters
      : Array.isArray(payload.chapters)
        ? payload.chapters
        : Array.isArray(pdfReady?.chapters)
          ? pdfReady.chapters
          : [];
    const llmAssembly = archive.llmAssembly || metadata.llmAssembly || payload.llmAssembly || pdfReady?.metadata?.llmAssembly || null;
    const llmMetadata = {
      ...(pdfReady?.metadata || {}),
      ...metadata,
      ...archive,
      llmAssembly,
      llmAssemblyOnly: archive.llmAssemblyOnly ?? metadata.llmAssemblyOnly ?? payload.llmAssemblyOnly ?? pdfReady?.metadata?.llmAssemblyOnly,
      promptVersion: archive.promptVersion || metadata.promptVersion || payload.promptVersion || pdfReady?.metadata?.promptVersion,
      schemaVersion: archive.schemaVersion || metadata.schemaVersion || payload.schemaVersion || pdfReady?.metadata?.schemaVersion,
      manuscriptSource: archive.manuscriptSource || metadata.manuscriptSource || payload.manuscriptSource || pdfReady?.metadata?.manuscriptSource,
    };
    const manuscriptSource = clean(llmMetadata.manuscriptSource);
    if (!isLlmOnlyNewYearManuscriptSource(manuscriptSource) || !isNewYearLlmMetadataValid(llmMetadata)) {
      return null;
    }
    const localSajuJson = archive.localSajuJson || metadata.localSajuJson || payload.localSajuJson || payload.seed || null;
    const newYearMasterJson = archive.newYearMasterJson || metadata.newYearMasterJson || payload.newYearMasterJson || null;
    const monthlyFortuneSections = archive.monthlyFortuneSections || metadata.monthlyFortuneSections || payload.monthlyFortuneSections || null;
    const monthlyFortunes = archive.monthlyFortunes || metadata.monthlyFortunes || payload.monthlyFortunes || null;
    const finalAdvice = archive.finalAdvice || metadata.finalAdvice || payload.finalAdvice || null;
    const clientSummary = archive.clientSummary || metadata.clientSummary || payload.clientSummary || null;
    if (!clientSummary) return null;
    if (pdfReady) {
      pdfReady.filename = clean(pdfReady.filename).replace(/\.html$/i, ".pdf") || buildNewYearPdfFilename(targetYear, archive.birthName || payload?.profile?.name || "user");
      pdfReady.htmlFilename = clean(pdfReady.htmlFilename) || pdfReady.filename.replace(/\.pdf$/i, ".html");
      pdfReady.mimeType = "application/pdf";
      pdfReady.contentType = "application/pdf";
      pdfReady.renderFormat = clean(pdfReady.renderFormat) || "pdf-archive";
      pdfReady.pdfUrl = clean(pdfReady.pdfUrl || storedUrl);
      pdfReady.downloadUrl = clean(pdfReady.downloadUrl || storedUrl);
      if (!pdfReady.htmlUrl) pdfReady.htmlUrl = clean(archive.htmlUrl || payload.htmlUrl);
    }
    const data = {
      reportId,
      featureKey: clean(doc.featureKey || metadata.featureKey || fallback.featureKey),
      sessionId,
      reportType: "sajuNewYear",
      serviceKey: SERVICE_KEY,
      targetYear,
      chapterCount: Number(archive.chapterCount || payload.chapterCount || chapters.length),
      finalChapterCount: Number(archive.chapterCount || payload.finalChapterCount || chapters.length),
      manuscriptSource,
      llmAssembly,
      llmAssemblyOnly: true,
      fallbackUsed: false,
      promptVersion: clean(llmMetadata.promptVersion),
      schemaVersion: clean(llmMetadata.schemaVersion),
      generationMode: SAJU_NEW_YEAR_LLM_GENERATION_MODE,
      provider: clean(llmAssembly?.provider || archive.provider || metadata.provider || payload.provider || YEARLY_SAJU_PDF_CONFIG.provider),
      chapters,
      localSajuJson,
      newYearMasterJson,
      masterJsonValidation: archive.masterJsonValidation || metadata.masterJsonValidation || null,
      normalizedData: archive.normalizedData || metadata.normalizedData || null,
      monthlyFortuneSections,
      monthlyFortunes,
      finalAdvice,
      clientSummary,
      pdfReady,
      pdfUrl: storedUrl,
      htmlUrl: clean(pdfReady?.htmlUrl || archive.htmlUrl || payload.htmlUrl),
      downloadUrl: storedUrl,
      canReopen: true,
      canDownload: true,
      fromCache: true,
      cacheKey,
      cacheHit: true,
    };
    const progress = normalizeNewYearProgress({
      status: "completed",
      progress: 100,
      completedChapters: data.chapterCount,
      totalChapters: data.chapterCount || NEW_YEAR_CHAPTERS.length,
      currentChapterNumber: data.chapterCount || NEW_YEAR_CHAPTERS.length,
      currentChapterTitle: "완료",
      currentStep: "신년운세 PDF가 완성되었습니다.",
      resultId: reportId,
      pdfUrl: storedUrl,
    }, { reportId, sessionId, targetYear });
    data.progress = progress;
    data.newYearPdfProgress = progress;
    return {
      status: 200,
      payload: {
        ok: true,
        serviceKey: SERVICE_KEY,
        reportType: "sajuNewYear",
        status: "completed",
        serverStatus: "completed",
        progress,
        newYearPdfProgress: progress,
        qualityStatus: "passed",
        data,
        ...data,
      },
    };
  }

  if (isFailed) {
    return null;
  }

  if (clean(doc.status) === "pending" || clean(doc.premiumStatus) === "generating") {
    const progress = normalizeNewYearProgress(metadata, {
      status: metadata.generationStatus || "generating",
      reportId,
      sessionId,
      targetYear,
    });
    return {
      status: 202,
      payload: {
        ok: true,
        serviceKey: SERVICE_KEY,
        status: progress.status,
        serverStatus: progress.status,
        reportId,
        sessionId,
        targetYear,
        progress,
        newYearPdfProgress: progress,
        data: {
          reportId,
          sessionId,
          targetYear,
          status: progress.status,
          progress,
          newYearPdfProgress: progress,
        },
        message: progress.currentStep || "동일 세션의 신년운세 PDF 생성이 이미 진행 중입니다.",
      },
    };
  }

  return null;
}

async function acquireNewYearExecutionLease(env, userId, executionCtx = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return { ok: true };
  try {
    await connectDb(withPdfFastDbEnv(env));
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + Math.max(NEW_YEAR_PDF_LOCK_TTL_MS, Number(executionCtx.timeoutSeconds || 1800) * 1000));
    const token = `${executionKey}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    const doc = await ServiceExecutionTransaction.findOneAndUpdate(
      {
        userId,
        executionKey,
        status: "pending",
        $or: [
          { "lock.until": { $lte: now } },
          { "lock.until": null },
          { "lock.until": { $exists: false } },
          { "lock.token": "" },
        ],
      },
      {
        $set: {
          "lock.token": token,
          "lock.until": leaseUntil,
          "lock.acquiredAt": now,
          heartbeatAt: now,
        },
      },
      { returnDocument: "after" },
    ).lean();
    return { ok: Boolean(doc), doc, token };
  } catch (error) {
    console.warn("[new-year][execution-lease-acquire-failed]", clean(error?.message || error));
    return { ok: false, error };
  }
}

async function resetNewYearFailedExecutionForRetry(env, userId, executionCtx = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return null;
  try {
    await connectDb(withPdfFastDbEnv(env));
    const now = new Date();
    return await ServiceExecutionTransaction.findOneAndUpdate(
      {
        userId,
        executionKey,
        status: "failed",
      },
      {
        $set: {
          status: "pending",
          premiumStatus: "generating",
          heartbeatAt: now,
          lastClientHeartbeatAt: now,
          generationStartedAt: now,
          generationFailedAt: null,
          reasonCode: "",
          reasonMessage: "",
          "metadata.generationStatus": "pending",
          "metadata.progress": 0,
          "metadata.currentStep": "결제 내역을 유지한 채 신년운세 PDF 생성을 다시 시작합니다.",
          "metadata.retryable": true,
          "metadata.retryStartedAt": now.toISOString(),
          "lock.token": "",
          "lock.until": null,
          "lock.acquiredAt": null,
        },
        $inc: { retryCount: 1 },
      },
      { returnDocument: "after" },
    ).lean();
  } catch (error) {
    console.warn("[new-year][failed-execution-retry-reset-failed]", clean(error?.message || error));
    return null;
  }
}

async function markNewYearExecutionFailedForRetry(env, userId, executionCtx = {}, progress = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return null;
  try {
    await connectDb(withPdfFastDbEnv(env));
    const now = new Date();
    return await ServiceExecutionTransaction.updateOne(
      { userId, executionKey },
      {
        $set: {
          status: "failed",
          premiumStatus: "failed",
          generationFailedAt: now,
          heartbeatAt: now,
          reasonCode: clean(progress.errorCode || "GENERATION_FAILED"),
          reasonMessage: clean(progress.errorMessage || "신년운세 PDF 생성에 실패했습니다.", 500),
          refundStatus: "none",
          refundReason: "",
          "metadata.generationStatus": "failed",
          "metadata.progress": Number(progress.progress || 0),
          "metadata.currentChapterNumber": Number(progress.currentChapterNumber || 0),
          "metadata.currentChapterIndex": Number(progress.currentChapterNumber || 0),
          "metadata.currentChapterTitle": clean(progress.currentChapterTitle),
          "metadata.completedChapters": Number(progress.completedChapters || 0),
          "metadata.totalChapters": Number(progress.totalChapters || NEW_YEAR_CHAPTERS.length),
          "metadata.currentStep": clean(progress.currentStep),
          "metadata.errorCode": clean(progress.errorCode || "GENERATION_FAILED"),
          "metadata.errorMessage": clean(progress.errorMessage || "신년운세 PDF 생성에 실패했습니다.", 500),
          "metadata.failedChapterNumber": Number(progress.failedChapterNumber || 0) || 0,
          "metadata.failedChapterTitle": clean(progress.failedChapterTitle),
          "metadata.rawLlmError": clean(progress.rawLlmError || "", 2000),
          "metadata.retryable": true,
          "metadata.failedAt": now.toISOString(),
          "lock.token": "",
          "lock.until": null,
          "lock.acquiredAt": null,
        },
      },
    );
  } catch (error) {
    console.warn("[new-year][failed-execution-mark-failed]", clean(error?.message || error));
    return null;
  }
}

function hasNewYearAuthMaterial(request) {
  return Boolean(
    clean(request.headers.get("Authorization"))
    || clean(cookieValue(request, "fortune_auth_token"))
    || clean(cookieValue(request, "fortune_auth_refresh"))
  );
}

function getNewYearBearerToken(request) {
  const authorization = clean(request.headers.get("Authorization"));
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

function decodeNewYearJwtPayload(token) {
  const parts = clean(token).split(".");
  if (parts.length < 2) return null;
  try {
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch (_) {
    return null;
  }
}

function classifyNewYearAuthFailure(request) {
  const authorization = clean(request.headers.get("Authorization"));
  const bearerToken = clean(getNewYearBearerToken(request));
  const cookieHeader = clean(request.headers.get("Cookie"));
  const accessCookieToken = clean(cookieValue(request, "fortune_auth_token"));
  const refreshCookieToken = clean(cookieValue(request, "fortune_auth_refresh"));
  const authToken = bearerToken || accessCookieToken || refreshCookieToken;
  const missingFields = [];
  if (!cookieHeader) missingFields.push("Cookie");
  if (!accessCookieToken && !refreshCookieToken) missingFields.push("fortune_auth_token|fortune_auth_refresh");
  if (!authorization) missingFields.push("Authorization");
  if (authorization && !bearerToken) return { reason: "invalid_token", missingFields };
  if (authToken) {
    const payload = decodeNewYearJwtPayload(authToken);
    const expMs = Number(payload?.exp || 0) * 1000;
    if (Number.isFinite(expMs) && expMs > 0 && expMs <= Date.now()) {
      return { reason: "expired_token", missingFields };
    }
    return { reason: "invalid_token", missingFields };
  }
  return { reason: cookieHeader ? "missing_authorization" : "missing_cookie", missingFields };
}

function newYearDebugSafe(request, stage, extras = {}) {
  const featureKey = clean(extras.featureKey || FEATURE_KEY);
  const responseCode = clean(extras.responseCode || extras.code);
  const responseMessage = clean(extras.responseMessage || extras.message);
  const missingFields = Array.isArray(extras.missingFields)
    ? extras.missingFields.map((item) => clean(item)).filter(Boolean).slice(0, 8)
    : undefined;
  let requestUrl = "";
  try {
    requestUrl = new URL(request.url).pathname;
  } catch (_) {
    requestUrl = "";
  }
  const debug = {
    stage: clean(stage || extras.stage || "prepare"),
    requestUrl,
    httpStatus: Number(extras.httpStatus || extras.status || 0) || undefined,
    responseCode: responseCode || undefined,
    responseMessage: responseMessage || undefined,
    serviceKey: SERVICE_KEY,
    featureKey,
    billingFeatureKey: clean(extras.billingFeatureKey || FEATURE_KEY),
    reportType: "sajuNewYear",
    hasCookie: Boolean(clean(request.headers.get("Cookie"))),
    hasAuthorization: Boolean(clean(request.headers.get("Authorization"))),
    credentialsIncluded: extras.credentialsIncluded === false ? false : true,
    accessVerified: extras.accessVerified === true,
    isComingSoonBlocked: extras.isComingSoonBlocked === true,
    authFailureReason: clean(extras.authFailureReason) || undefined,
    missingFields,
  };
  if (clean(extras.reportId)) debug.reportId = clean(extras.reportId);
  if (clean(extras.sessionId)) debug.sessionId = clean(extras.sessionId);
  if (typeof extras.hasPaymentToken === "boolean") debug.hasPaymentToken = extras.hasPaymentToken;
  if (clean(extras.originalCode)) debug.originalCode = clean(extras.originalCode);
  if (clean(extras.causeMessage)) debug.causeMessage = clean(extras.causeMessage);
  return debug;
}

function newYearAuthFailureResponse(request, stage = "prepare") {
  const code = hasNewYearAuthMaterial(request) ? "SESSION_INVALID" : "AUTH_REQUIRED";
  const message = newYearPublicErrorMessage(code);
  const authFailure = classifyNewYearAuthFailure(request);
  const debugSafe = newYearDebugSafe(request, stage, {
    httpStatus: 401,
    responseCode: code,
    responseMessage: message,
    accessVerified: false,
    isComingSoonBlocked: false,
    authFailureReason: authFailure.reason,
    missingFields: authFailure.missingFields,
  });
  console.warn("[NewYearPremiumPDF][AuthFailure]", debugSafe);
  return json({ ok: false, serviceKey: SERVICE_KEY, code, message, debugSafe }, { status: 401 });
}

function newYearAccessFailureResponse(request, body, accessResult, stage = "prepare") {
  const code = clean(accessResult?.code) || "ENTITLEMENT_REQUIRED";
  const status = newYearErrorStatus(code, Number(accessResult?.status || 402));
  const message = accessResult?.message || newYearPublicErrorMessage(code);
  const missingFields = Array.isArray(accessResult?.missing)
    ? accessResult.missing
    : (Array.isArray(accessResult?.access?.missing) ? accessResult.access.missing : []);
  const authFailureReason = status === 403 ? "feature_not_allowed" : "";
  const debugSafe = newYearDebugSafe(request, stage, {
    httpStatus: status,
    responseCode: code,
    responseMessage: message,
    featureKey: normalizeFeatureKey(body?.featureKey),
    accessVerified: false,
    isComingSoonBlocked: false,
    authFailureReason,
    missingFields,
  });
  console.warn("[NewYearPremiumPDF][AccessFailure]", debugSafe);
  return json({
    ok: false,
    serviceKey: SERVICE_KEY,
    accessGranted: false,
    code,
    message,
    debugSafe,
  }, { status });
}

function newYearPublicErrorMessage(code) {
  switch (clean(code)) {
    case "AUTH_REQUIRED":
      return "신년운세 PDF 생성을 위해 먼저 로그인해 주세요.";
    case "SESSION_INVALID":
      return "로그인 세션이 만료되었습니다. 다시 로그인한 뒤 신년운세 PDF를 생성해 주세요.";
    case "ENTITLEMENT_REQUIRED":
      return "신년운세 PDF 생성 권한이 필요합니다. 단건 결제, 월정석 크레딧, 이용권 중 하나로 이용할 수 있습니다.";
    case "ENTITLEMENT_CHECK_FAILED":
      return "결제 권한 확인 중 서버 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    case "INVALID_INPUT":
      return "입력 정보를 확인해 주세요. 대상 연도와 생년월일은 필수입니다.";
    case "PDF_RENDER_FAILED":
      return "신년운세 PDF 렌더링 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
    case "GENERATION_FAILED":
    default:
      return "신년운세 본문 생성 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
  }
}

function newYearErrorStatus(code, fallback = 500) {
  switch (clean(code)) {
    case "AUTH_REQUIRED":
    case "SESSION_INVALID":
      return 401;
    case "ENTITLEMENT_REQUIRED":
      return Number(fallback || 402) >= 400 ? Number(fallback || 402) : 402;
    case "INVALID_INPUT":
      return 422;
    case "ENTITLEMENT_CHECK_FAILED":
    case "GENERATION_FAILED":
    case "PDF_RENDER_FAILED":
      return Number(fallback || 500) >= 400 ? Number(fallback || 500) : 500;
    default:
      return Number(fallback || 500);
  }
}

function normalizeNewYearPdfErrorCode(error) {
  const code = clean(error?.code || error?.name);
  if (["AUTH_REQUIRED", "SESSION_INVALID", "ENTITLEMENT_REQUIRED", "ENTITLEMENT_CHECK_FAILED", "INVALID_INPUT", "GENERATION_FAILED", "PDF_RENDER_FAILED"].includes(code)) return code;
  if (Number(error?.status || 0) === 422) return "INVALID_INPUT";
  return "GENERATION_FAILED";
}

function normalizeNewYearProgress(progress = {}, fallback = {}) {
  const source = progress && typeof progress === "object" ? progress : {};
  const statusRaw = clean(source.status || source.generationStatus || fallback.status || fallback.generationStatus || "pending");
  const status = statusRaw === "done" ? "completed" : statusRaw === "validating" ? "pending" : statusRaw === "running" ? "generating" : statusRaw;
  const totalChapters = Math.max(1, Math.trunc(Number(
    source.totalChapters
    || source.chapterCount
    || fallback.totalChapters
    || fallback.chapterCount
    || NEW_YEAR_CHAPTERS.length,
  ) || NEW_YEAR_CHAPTERS.length));
  const completedChapters = Math.max(0, Math.min(totalChapters, Math.trunc(Number(
    source.completedChapters
    ?? source.completedChapterCount
    ?? fallback.completedChapters
    ?? fallback.completedChapterCount
    ?? (status === "completed" ? totalChapters : 0),
  ) || 0)));
  const currentChapterNumber = Math.max(1, Math.min(totalChapters, Math.trunc(Number(
    source.currentChapterNumber
    || source.currentChapterNo
    || source.currentChapterIndex
    || source.chapterIndex
    || fallback.currentChapterNumber
    || fallback.currentChapterNo
    || (completedChapters >= totalChapters ? totalChapters : completedChapters + 1),
  ) || 1)));
  const spec = NEW_YEAR_CHAPTERS[currentChapterNumber - 1] || NEW_YEAR_CHAPTERS[0] || {};
  const currentChapterTitle = clean(
    source.currentChapterTitle
    || fallback.currentChapterTitle
    || String(spec.title || "").replace("{YEAR}", clean(source.targetYear || fallback.targetYear || "")),
  );
  let progressPercent = Number(source.progress ?? source.percent ?? fallback.progress ?? fallback.percent);
  if (!Number.isFinite(progressPercent)) {
    progressPercent = status === "completed"
      ? 100
      : status === "failed"
        ? Math.max(0, Math.round((completedChapters / totalChapters) * 80))
        : Math.max(5, Math.min(95, Math.round((completedChapters / totalChapters) * 70) + 15));
  }
  progressPercent = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const currentStep = clean(
    source.currentStep
    || source.currentStepMessage
    || fallback.currentStep
    || fallback.currentStepMessage
    || (status === "rendering"
      ? "PDF 렌더링 중입니다."
      : status === "completed"
        ? "신년운세 PDF가 완성되었습니다."
        : status === "failed"
          ? "신년운세 PDF 생성이 중단되었습니다."
          : currentChapterTitle
            ? `챕터 ${currentChapterNumber}: ${currentChapterTitle} 생성 중입니다.`
            : "신년운세 PDF를 작성하고 있어요."),
  );
  return {
    jobId: clean(source.jobId || fallback.jobId || fallback.reportId || fallback.sessionId),
    status: ["pending", "generating", "rendering", "completed", "failed"].includes(status) ? status : "generating",
    progress: progressPercent,
    currentStep,
    currentChapterNumber,
    currentChapterTitle,
    totalChapters,
    completedChapters,
    resultId: clean(source.resultId || fallback.resultId || fallback.reportId),
    pdfUrl: clean(source.pdfUrl || source.downloadUrl || fallback.pdfUrl || fallback.downloadUrl),
    errorCode: clean(source.errorCode || fallback.errorCode),
    errorMessage: clean(source.errorMessage || fallback.errorMessage),
    failedChapterNumber: Number(source.failedChapterNumber || fallback.failedChapterNumber || 0) || undefined,
    failedChapterTitle: clean(source.failedChapterTitle || fallback.failedChapterTitle),
    retryable: source.retryable === true || fallback.retryable === true || status === "failed",
  };
}

function buildNewYearStatusResponseFromExecution(doc = {}, fallback = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const payload = archive.payload && typeof archive.payload === "object" ? archive.payload : {};
  const pdfReady = archive.pdfReady || metadata.pdfReady || payload.pdfReady || null;
  const isCompleted = clean(doc.status) === "success" && clean(doc.premiumStatus) === "completed";
  const isFailed = clean(doc.status) === "failed" || clean(doc.premiumStatus) === "failed";
  const progress = normalizeNewYearProgress({
    status: isCompleted ? "completed" : isFailed ? "failed" : metadata.generationStatus,
    progress: isCompleted ? 100 : metadata.progress,
    currentChapterNumber: metadata.currentChapterNumber || metadata.currentChapterIndex,
    currentChapterTitle: metadata.currentChapterTitle,
    totalChapters: metadata.totalChapters || metadata.chapterCount || archive.chapterCount || payload.chapterCount,
    completedChapters: isCompleted ? (archive.chapterCount || payload.chapterCount || NEW_YEAR_CHAPTERS.length) : metadata.completedChapters,
    currentStep: metadata.currentStep,
    resultId: doc.reportId,
    pdfUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || archive.downloadUrl || payload.downloadUrl),
    errorCode: metadata.errorCode || doc.reasonCode,
    errorMessage: metadata.errorMessage || doc.reasonMessage,
    failedChapterNumber: metadata.failedChapterNumber,
    failedChapterTitle: metadata.failedChapterTitle,
    retryable: isFailed,
  }, {
    reportId: clean(doc.reportId || fallback.reportId),
    sessionId: clean(doc.sessionId || fallback.sessionId),
    targetYear: fallback.targetYear,
  });
  const data = {
    reportId: clean(doc.reportId || fallback.reportId),
    sessionId: clean(doc.sessionId || fallback.sessionId),
    serviceKey: SERVICE_KEY,
    status: progress.status,
    progress,
    newYearPdfProgress: progress,
    pdfReady,
    chapters: archive.chapters || payload.chapters || pdfReady?.chapters || [],
    pdfUrl: progress.pdfUrl,
    downloadUrl: progress.pdfUrl,
    canDownload: Boolean(progress.pdfUrl),
    errorCode: progress.errorCode,
    errorMessage: progress.errorMessage,
  };
  return {
    ok: true,
    serviceKey: SERVICE_KEY,
    status: progress.status,
    serverStatus: progress.status,
    progress,
    newYearPdfProgress: progress,
    data,
    ...data,
  };
}

async function updateNewYearExecutionProgress(env, userId, executionCtx = {}, progress = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return null;
  const normalized = normalizeNewYearProgress(progress, {
    jobId: clean(executionCtx.reportId || executionCtx.sessionId),
    reportId: clean(executionCtx.reportId),
    sessionId: clean(executionCtx.sessionId),
  });
  const sessionId = clean(executionCtx.sessionId);
  if (sessionId) {
    const existing = newYearPdfLocks.get(sessionId) || {};
    newYearPdfLocks.set(sessionId, {
      ...existing,
      status: normalized.status === "completed" ? "done" : normalized.status === "failed" ? "failed" : "running",
      reportId: clean(executionCtx.reportId || existing.reportId),
      sessionId,
      progress: normalized,
      startedAtMs: existing.startedAtMs || Date.now(),
      updatedAtMs: Date.now(),
    });
  }
  try {
    await connectDb(withPdfFastDbEnv(env));
    const status = normalized.status;
    const now = new Date();
    return await ServiceExecutionTransaction.updateOne(
      { userId, executionKey },
      {
        $set: {
          heartbeatAt: now,
          "metadata.generationStatus": status,
          "metadata.progress": normalized.progress,
          "metadata.currentChapterId": clean(progress.chapterId || ""),
          "metadata.currentChapterIndex": normalized.currentChapterNumber,
          "metadata.currentChapterNumber": normalized.currentChapterNumber,
          "metadata.currentChapterTitle": normalized.currentChapterTitle,
          "metadata.completedChapters": normalized.completedChapters,
          "metadata.totalChapters": normalized.totalChapters,
          "metadata.chapterCount": normalized.totalChapters,
          "metadata.currentStep": normalized.currentStep,
          "metadata.errorCode": normalized.errorCode,
          "metadata.errorMessage": normalized.errorMessage,
          "metadata.failedChapterNumber": normalized.failedChapterNumber,
          "metadata.failedChapterTitle": normalized.failedChapterTitle,
          "metadata.rawLlmError": clean(progress.rawLlmError || "", 2000),
          "metadata.progressUpdatedAt": now.toISOString(),
        },
      },
    );
  } catch (error) {
    console.warn("[new-year][progress-update-failed]", clean(error?.message || error));
    return null;
  }
}

function isNewYearProductionEnv(env = {}) {
  return /^(production|prod)$/i.test(clean(env.NODE_ENV || env.ENVIRONMENT || env.APP_ENV));
}

function isNewYearDebugMockAccessAllowed(env = {}) {
  return readBooleanFlag(env, "PDF_DEBUG_MODE", false) && !isNewYearProductionEnv(env);
}

function newYearPdfNow() {
  return new Date().toISOString();
}

function newYearPdfSessionId(jobId) {
  const id = clean(jobId);
  return id ? `saju-new-year:${id}` : "";
}

function normalizeNewYearPdfAccessMethod(access = {}) {
  const raw = clean(access.method || access.accessMethod || access.accessType || access.transactionType).toLowerCase();
  if (raw === "debug_mock") return "debug_mock";
  if (raw.includes("pass") || raw.includes("membership") || raw.includes("usage_pass") || raw.includes("family")) return "pass";
  return "payment";
}

function buildNewYearPdfAccess(access = {}, methodOverride = "") {
  const method = clean(methodOverride) || normalizeNewYearPdfAccessMethod(access);
  const verifiedAt = newYearPdfNow();
  const paymentId = clean(
    access.paymentId
    || access.matchedTransactionId
    || access.transactionId
    || access.sourceTransactionId
    || access.evidenceId,
  );
  const passId = clean(access.passId || access.entitlementId || access.passTier || access.usagePassCategory);
  return {
    verified: true,
    method,
    paymentId: method === "payment" && paymentId ? paymentId : undefined,
    passId: method === "pass" && passId ? passId : undefined,
    verifiedAt,
  };
}

function calculateNewYearPdfProgress(status, completedChapters, totalChapters, fallback = 0) {
  const total = Math.max(1, Number(totalChapters || NEW_YEAR_CHAPTERS.length) || NEW_YEAR_CHAPTERS.length);
  const completed = Math.max(0, Math.min(total, Number(completedChapters || 0) || 0));
  switch (clean(status)) {
    case "access_verifying":
      return 5;
    case "access_verified":
    case "queued":
      return 10;
    case "generating":
    case "chapter_generating":
      return 10 + Math.floor((completed / total) * 70);
    case "rendering":
      return 85;
    case "saving":
      return 95;
    case "completed":
      return 100;
    case "failed":
      return Math.max(0, Math.min(100, Number(fallback || 0) || 0));
    default:
      return Math.max(0, Math.min(100, Number(fallback || 0) || 0));
  }
}

function buildNewYearPdfInputSnapshot(normalized = {}, body = {}) {
  const profile = normalized.profile || body.profile || {};
  const birthInput = normalized.birthInput || body.birthInput || {};
  return compactNewYearObject({
    name: profile.name || body.name,
    gender: profile.gender || body.gender,
    calendarType: profile.calendarType || body.calendarType,
    birthDate: birthInput.birthDate || body.birthDate,
    birthTime: birthInput.isTimeUnknown ? "" : (birthInput.birthTime || body.birthTime),
    birthTimeKnown: birthInput.isTimeUnknown ? false : body.birthTimeKnown,
    targetYear: normalized.targetYear || body.targetYear || body.selectedYear,
    profile,
    birthInput,
  });
}

function buildNewYearPdfChapterJobs(targetYear) {
  const chapters = buildSajuNewYearChapterSpecs(targetYear);
  return chapters.map((chapter, index) => ({
    id: clean(chapter.id || `chapter-${index + 1}`),
    chapterId: clean(chapter.id || `chapter-${index + 1}`),
    title: clean(chapter.title || `${index + 1}장`),
    order: Number(chapter.no || chapter.order || index + 1),
    status: "pending",
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  }));
}

function buildNewYearPdfJob({ jobId, userId, normalized, body, access }) {
  const now = newYearPdfNow();
  const inputSnapshot = buildNewYearPdfInputSnapshot(normalized, body);
  const chapters = buildNewYearPdfChapterJobs(normalized.targetYear || body.targetYear);
  const totalChapters = chapters.length || NEW_YEAR_CHAPTERS.length;
  return {
    id: clean(jobId),
    userId: clean(userId),
    serviceType: "new_year_pdf",
    status: "queued",
    inputHash: hashAnnualFortuneValue(inputSnapshot),
    inputSnapshot,
    contextSnapshot: compactNewYearObject({
      targetYear: normalized.targetYear || body.targetYear,
      featureKey: normalizeFeatureKey(body?.featureKey),
      sessionId: newYearPdfSessionId(jobId),
    }),
    access: buildNewYearPdfAccess(access),
    totalChapters,
    completedChapters: 0,
    currentChapterId: chapters[0]?.id,
    currentChapterTitle: chapters[0]?.title,
    progressPercent: calculateNewYearPdfProgress("queued", 0, totalChapters),
    chapters,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    createdAt: now,
    updatedAt: now,
  };
}

function buildNewYearPdfExecutionContextFromDoc(doc = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  return {
    executionKey: clean(doc.executionKey),
    reportType: "sajuNewYear",
    featureKey: clean(doc.featureKey || metadata.featureKey || FEATURE_KEY),
    reportId: clean(doc.reportId || metadata.reportId),
    sessionId: clean(doc.sessionId || metadata.sessionId),
    paymentSessionId: clean(doc.paymentSessionId),
    coinTransactionId: clean(doc.coinTransactionId),
    sourceTransactionId: clean(doc.sourceTransactionId),
    coinAmount: Number(doc.coinAmount || doc.cost || 0) || 0,
    cost: Number(doc.cost || doc.coinAmount || 0) || 0,
    payment: doc.paymentRef || {},
    timeoutSeconds: Number(metadata.timeoutSeconds || 1800) || 1800,
    maxRetries: Number(doc.maxRetries || 6) || 6,
    idempotencyKey: clean(doc.idempotencyKey || doc.executionKey),
    metadata,
  };
}

function buildNewYearProviderSummary(job = {}) {
  const chapters = Array.isArray(job.chapters) ? job.chapters : [];
  const chapterProviders = chapters.map((chapter, index) => {
    const chapterId = clean(chapter?.chapterId || chapter?.id);
    const isMock = chapter?.isMock !== false;
    const provider = isMock ? "mock" : clean(chapter.provider || "workers-ai").toLowerCase();
    const tokensUsed = isMock ? 0 : Math.max(0, Number(chapter.tokensUsed || 0) || 0);
    const cost = isMock ? 0 : Math.max(0, Number(chapter.cost || 0) || 0);
    return {
      id: chapterId,
      chapterId,
      title: clean(chapter?.title),
      order: Number(chapter?.order || index + 1),
      status: clean(chapter?.status || "pending"),
      provider,
      modelName: clean(chapter?.modelName || chapter?.model || provider),
      tokensUsed,
      cost,
      isMock,
      providerReason: clean(chapter?.providerReason) || undefined,
      realLlmAllowed: chapter?.realLlmAllowed === true || undefined,
    };
  });
  const realChapters = chapterProviders.filter((chapter) => chapter.isMock === false);
  const mockChapters = chapterProviders.filter((chapter) => chapter.isMock !== false);
  const tokensUsed = chapterProviders.reduce((sum, chapter) => sum + (Number(chapter.tokensUsed || 0) || 0), 0);
  const cost = Number(chapterProviders.reduce((sum, chapter) => sum + (Number(chapter.cost || 0) || 0), 0).toFixed(6));
  const realProviderSet = new Set(realChapters.map((chapter) => clean(chapter.provider)).filter(Boolean));
  return {
    provider: realChapters.length ? (realProviderSet.size === 1 && realChapters.length === chapterProviders.length ? Array.from(realProviderSet)[0] : "mixed") : "mock",
    tokensUsed,
    cost,
    isMock: realChapters.length === 0,
    externalCallsAllowed: realChapters.length > 0,
    realChapterCount: realChapters.length,
    mockChapterCount: mockChapters.length,
    realChapterIds: realChapters.map((chapter) => chapter.id).filter(Boolean),
    mockChapterIds: mockChapters.map((chapter) => chapter.id).filter(Boolean),
    chapterProviders,
  };
}

function syncNewYearJobProviderSummary(job = {}) {
  const providerSummary = buildNewYearProviderSummary(job);
  job.provider = providerSummary.provider;
  job.tokensUsed = providerSummary.tokensUsed;
  job.cost = providerSummary.cost;
  job.isMock = providerSummary.isMock;
  job.realLlmChapterIds = providerSummary.realChapterIds;
  job.mockChapterIds = providerSummary.mockChapterIds;
  job.chapterProviders = providerSummary.chapterProviders;
  return providerSummary;
}

function safeNewYearPdfJobChapter(chapter = {}, includeContent = false) {
  const chapterId = clean(chapter.chapterId || chapter.id);
  const isMock = chapter.isMock !== false;
  const provider = isMock ? "mock" : clean(chapter.provider || "workers-ai").toLowerCase();
  const item = {
    id: chapterId,
    chapterId,
    title: clean(chapter.title),
    order: Number(chapter.order || 0) || 0,
    status: clean(chapter.status || "pending"),
    provider,
    modelName: clean(chapter.modelName || chapter.model || provider) || undefined,
    tokensUsed: isMock ? 0 : Math.max(0, Number(chapter.tokensUsed || 0) || 0),
    cost: isMock ? 0 : Math.max(0, Number(chapter.cost || 0) || 0),
    isMock,
    realLlmAllowed: chapter.realLlmAllowed === true || undefined,
    providerReason: clean(chapter.providerReason) || undefined,
    startedAt: clean(chapter.startedAt) || undefined,
    completedAt: clean(chapter.completedAt) || undefined,
    errorMessage: clean(chapter.errorMessage) || undefined,
  };
  if (includeContent) item.content = clean(chapter.content);
  return item;
}

function currentNewYearPdfChapterNumber(job = {}) {
  const currentId = clean(job.currentChapterId);
  const found = Array.isArray(job.chapters) ? job.chapters.find((chapter) => clean(chapter.id) === currentId) : null;
  return Number(found?.order || job.completedChapters + 1 || 1) || 1;
}

function buildNewYearPdfStatusPayload(job = {}, options = {}) {
  const includeContent = options.includeContent === true;
  const chapters = Array.isArray(job.chapters) ? job.chapters.map((chapter) => safeNewYearPdfJobChapter(chapter, includeContent)) : [];
  const providerSummary = buildNewYearProviderSummary(job);
  const pdfUrl = clean(job.pdfUrl);
  const status = clean(job.status || "created");
  const progressPercent = calculateNewYearPdfProgress(status, job.completedChapters, job.totalChapters, job.progressPercent);
  const progress = {
    jobId: clean(job.id),
    reportId: clean(job.id),
    sessionId: newYearPdfSessionId(job.id),
    serviceType: "new_year_pdf",
    status,
    progress: progressPercent,
    progressPercent,
    totalChapters: Number(job.totalChapters || chapters.length || NEW_YEAR_CHAPTERS.length),
    completedChapters: Number(job.completedChapters || 0),
    currentChapterId: clean(job.currentChapterId),
    currentChapterTitle: clean(job.currentChapterTitle),
    currentChapterNumber: currentNewYearPdfChapterNumber(job),
    currentStep: newYearPdfStatusMessage(job),
    resultId: clean(job.id),
    pdfUrl,
    errorMessage: clean(job.errorMessage),
    retryable: status === "failed",
  };
  const data = {
    jobId: clean(job.id),
    reportId: clean(job.id),
    sessionId: newYearPdfSessionId(job.id),
    serviceKey: SERVICE_KEY,
    serviceType: "new_year_pdf",
    reportType: "sajuNewYear",
    status,
    progressPercent,
    progress,
    newYearPdfProgress: progress,
    totalChapters: progress.totalChapters,
    completedChapters: progress.completedChapters,
    currentChapterId: progress.currentChapterId,
    currentChapterTitle: progress.currentChapterTitle,
    chapters,
    pdfUrl: pdfUrl || null,
    downloadUrl: pdfUrl || null,
    canDownload: Boolean(pdfUrl),
    errorMessage: clean(job.errorMessage) || null,
    provider: providerSummary.provider,
    tokensUsed: providerSummary.tokensUsed,
    cost: providerSummary.cost,
    isMock: providerSummary.isMock,
    realLlmChapterIds: providerSummary.realChapterIds,
    mockChapterIds: providerSummary.mockChapterIds,
    chapterProviders: providerSummary.chapterProviders,
  };
  return {
    ok: true,
    serviceKey: SERVICE_KEY,
    serviceType: "new_year_pdf",
    reportType: "sajuNewYear",
    jobId: clean(job.id),
    reportId: clean(job.id),
    sessionId: newYearPdfSessionId(job.id),
    status,
    serverStatus: status,
    progressPercent,
    progress,
    newYearPdfProgress: progress,
    data,
    ...data,
  };
}

function newYearPdfStatusMessage(job = {}) {
  const status = clean(job.status);
  if (status === "access_verifying") return "결제 검증 중입니다.";
  if (status === "access_verified" || status === "queued") return "PDF 생성 준비 중입니다.";
  if (status === "generating" || status === "chapter_generating") {
    const order = currentNewYearPdfChapterNumber(job);
    const title = clean(job.currentChapterTitle);
    return title ? `${order}장 ${title} 생성 중...` : "챕터를 순서대로 생성하고 있습니다.";
  }
  if (status === "rendering") return "PDF 문서를 렌더링하고 있습니다.";
  if (status === "saving") return "PDF 파일을 저장하고 있습니다.";
  if (status === "completed") return "신년운세 PDF가 완성되었습니다.";
  if (status === "failed") return clean(job.errorMessage) || "신년운세 PDF 생성 중 문제가 발생했습니다. 결제 내역은 보존됩니다.";
  return "PDF 생성 상태를 확인하고 있습니다.";
}

async function findNewYearPdfJobExecution(env, userId, jobId, sessionId = "") {
  await connectDb(withPdfFastDbEnv(env));
  const filters = [];
  const id = clean(jobId);
  const sid = clean(sessionId || newYearPdfSessionId(id));
  if (id) {
    filters.push({ reportId: id });
    filters.push({ "metadata.newYearPdfJob.id": id });
  }
  if (sid) filters.push({ sessionId: sid });
  if (!filters.length) return null;
  return await ServiceExecutionTransaction.findOne({
    userId,
    reportType: "sajuNewYear",
    $or: filters,
  }).sort({ updatedAt: -1, completedAt: -1, createdAt: -1 }).lean();
}

async function persistNewYearPdfJob(env, userId, executionCtx = {}, job = {}, extraSet = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return null;
  const now = new Date();
  const status = clean(job.status || "created");
  const providerSummary = buildNewYearProviderSummary(job);
  await connectDb(withPdfFastDbEnv(env));
  return await ServiceExecutionTransaction.updateOne(
    { userId, executionKey },
    {
      $set: {
        heartbeatAt: now,
        lastClientHeartbeatAt: now,
        "metadata.newYearPdfJob": job,
        "metadata.generationStatus": status,
        "metadata.progress": Number(job.progressPercent || 0),
        "metadata.currentChapterId": clean(job.currentChapterId),
        "metadata.currentChapterTitle": clean(job.currentChapterTitle),
        "metadata.currentChapterNumber": currentNewYearPdfChapterNumber(job),
        "metadata.currentChapterIndex": currentNewYearPdfChapterNumber(job),
        "metadata.completedChapters": Number(job.completedChapters || 0),
        "metadata.totalChapters": Number(job.totalChapters || NEW_YEAR_CHAPTERS.length),
        "metadata.chapterCount": Number(job.totalChapters || NEW_YEAR_CHAPTERS.length),
        "metadata.errorMessage": clean(job.errorMessage),
        "metadata.provider": providerSummary.provider,
        "metadata.tokensUsed": providerSummary.tokensUsed,
        "metadata.cost": providerSummary.cost,
        "metadata.isMock": providerSummary.isMock,
        "metadata.realLlmChapterIds": providerSummary.realChapterIds,
        "metadata.mockChapterIds": providerSummary.mockChapterIds,
        "metadata.chapterProviders": providerSummary.chapterProviders,
        "metadata.progressUpdatedAt": now.toISOString(),
        ...extraSet,
      },
    },
  );
}

async function resolveNewYearPdfAccess(request, env, auth, body = {}) {
  const premiumAccessToken = clean(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || cookieValue(request, "cd_premium_access"),
  );
  try {
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "sajuNewYear", {
      ...body,
      featureKey: normalizeFeatureKey(body?.featureKey),
      reportType: "sajuNewYear",
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/saju-new-year/verify-access",
    });
    if (access?.ok) return { ok: true, access, premiumAccessToken, method: normalizeNewYearPdfAccessMethod(access) };
    if (isNewYearDebugMockAccessAllowed(env)) {
      return {
        ok: true,
        premiumAccessToken,
        method: "debug_mock",
        access: {
          ok: true,
          accessType: "debug_mock",
          featureKey: normalizeFeatureKey(body?.featureKey),
          reportType: "sajuNewYear",
          chargedCoins: 0,
        },
      };
    }
    return {
      ok: false,
      status: Number(access?.status || 402),
      code: Number(access?.status || 402) === 401 ? "SESSION_INVALID" : "ENTITLEMENT_REQUIRED",
      message: access?.message || newYearPublicErrorMessage("ENTITLEMENT_REQUIRED"),
      access,
    };
  } catch (error) {
    if (isNewYearDebugMockAccessAllowed(env)) {
      return {
        ok: true,
        premiumAccessToken,
        method: "debug_mock",
        access: {
          ok: true,
          accessType: "debug_mock",
          featureKey: normalizeFeatureKey(body?.featureKey),
          reportType: "sajuNewYear",
          chargedCoins: 0,
        },
      };
    }
    return {
      ok: false,
      status: Number(error?.status || 500),
      code: "ENTITLEMENT_CHECK_FAILED",
      message: clean(error?.message || newYearPublicErrorMessage("ENTITLEMENT_CHECK_FAILED")),
      error,
    };
  }
}

function buildNewYearMockChapterMarkdown(params = {}) {
  const input = params.input || {};
  return `# ${Number(params.chapterOrder || 1)}. ${clean(params.chapterTitle)}

이 챕터는 신년운세 PDF 생성 파이프라인을 검증하기 위한 mock 콘텐츠입니다.

## 생성 정보

- PDF 서비스: 신년운세 PDF
- Job ID: ${clean(params.jobId)}
- Chapter ID: ${clean(params.chapterId)}
- 챕터 순서: ${Number(params.chapterOrder || 1)} / ${Number(params.totalChapters || 1)}
- Provider: mock
- 실제 LLM 호출 여부: 아니오
- 사용 토큰: 0
- 예상 비용: 0원

## 사용자 입력 요약

- 이름: ${clean(input.name) || "미입력"}
- 성별: ${clean(input.gender) || "미입력"}
- 생년월일: ${clean(input.birthDate) || "미입력"}
- 출생시간: ${clean(input.birthTime) || "출생시간 모름 또는 미입력"}
- 기준 연도: ${clean(input.targetYear) || "미입력"}

## 테스트 본문

이 문단은 실제 LLM 결과를 대신하여 신년운세 PDF의 챕터별 생성, 상태 저장, 진행률 반영, PDF 렌더링, 다운로드 URL 생성이 정상적으로 작동하는지 확인하기 위한 내용입니다.

신년운세 PDF는 각 챕터가 순서대로 생성되어야 하며, 한 챕터가 완료될 때마다 completedChapters 값과 progressPercent 값이 갱신되어야 합니다. 프론트 화면에서는 현재 생성 중인 챕터 제목과 전체 진행률을 정확히 표시해야 합니다.

이 mock 콘텐츠는 실제 운세 해석 품질을 검증하기 위한 것이 아닙니다. 이 작업의 목적은 오직 PDF 생성 파이프라인의 안정성을 검증하는 것입니다.

## 챕터 검증 포인트

- 이 챕터 제목이 PDF 목차와 본문에 표시되는가
- 한글이 깨지지 않는가
- 챕터 순서가 유지되는가
- 현재 챕터 상태가 generating에서 completed로 바뀌는가
- 진행률 UI가 실제 상태와 일치하는가
- 전체 챕터 완료 후 PDF 렌더링 단계로 넘어가는가

## 결론

이 챕터는 실제 Gemini, Workers AI, OpenAI, Claude를 호출하지 않고 생성되었습니다.
따라서 개발 중 이 PDF 생성 테스트에서는 LLM 비용이 발생하지 않아야 합니다.`;
}

function newYearRealLlmChapterIdSet(env = {}) {
  return new Set(
    clean(env.PDF_REAL_LLM_CHAPTER_IDS || "")
      .split(",")
      .map((item) => clean(item).toLowerCase())
      .filter(Boolean),
  );
}

function logNewYearAiBindingCheck(params = {}) {
  if (params.debugEnabled !== true) return;
  try {
    console.info("[NewYearPDF AI Binding Check]", {
      hasEnvAI: params.hasEnvAI === true,
      provider: clean(params.provider),
      dryRun: params.dryRun === true,
      workersAiEnabled: params.workersAiEnabled === true,
      maxCallsPerJob: Number(params.maxCallsPerJob || 0) || 0,
      realChapterIds: Array.isArray(params.realChapterIds) ? params.realChapterIds.map((item) => clean(item)).filter(Boolean) : [],
      chapterId: clean(params.chapterId),
      willUseRealLLM: params.willUseRealLLM === true,
      providerReason: clean(params.providerReason),
    });
  } catch (_) {}
}

function logNewYearPdfFlow(env = {}, request = null, params = {}) {
  if (!readBooleanFlag(env, "PDF_DEBUG_MODE", false)) return;
  let requestUrl = "";
  try {
    if (request?.url) {
      const url = new URL(request.url);
      requestUrl = url.pathname;
    }
  } catch (_) {
    requestUrl = "";
  }
  try {
    console.info("[NewYearPDF Flow]", {
      stage: clean(params.stage),
      requestUrl,
      httpStatus: Number(params.httpStatus || 0) || undefined,
      jobId: clean(params.jobId),
      hasAccess: params.hasAccess === true,
      accessVerified: params.accessVerified === true,
      createJobStarted: params.createJobStarted === true,
      generateStarted: params.generateStarted === true,
      statusPollingStarted: params.statusPollingStarted === true,
    });
  } catch (_) {}
}

function newYearChapterAliases(chapterId, chapterOrder) {
  const order = Number(chapterOrder || 0) || 0;
  const id = clean(chapterId).toLowerCase();
  const aliases = new Set([id, String(order), `chapter-${order}`, `newyear-${String(order).padStart(2, "0")}`]);
  if (order === 1 || id === "intro" || id === "newyear-01") aliases.add("intro");
  return aliases;
}

function resolveNewYearChapterProviderPlan(params = {}, env = {}) {
  const ids = newYearRealLlmChapterIdSet(env);
  const aliases = newYearChapterAliases(params.chapterId, params.chapterOrder);
  const allowedById = ids.has("*") || ids.has("all") || Array.from(aliases).some((alias) => ids.has(alias));
  const dryRun = readBooleanFlag(env, "LLM_DRY_RUN", !isNewYearProductionEnv(env));
  const provider = clean(env.PDF_LLM_PROVIDER || "mock").toLowerCase();
  const workersEnabled = readBooleanFlag(env, "WORKERS_AI_ENABLED", false);
  const hasWorkersAiBinding = Boolean(env?.AI && typeof env.AI.run === "function");
  const maxCalls = Math.max(0, Number(env.PDF_LLM_MAX_CALLS_PER_JOB || 0) || 0);
  const callsUsed = Math.max(0, Number(params.realLlmCallsUsed || 0) || 0);
  const allowActual = Boolean(
    allowedById
    && !dryRun
    && provider === "workers-ai"
    && workersEnabled
    && hasWorkersAiBinding
    && maxCalls > 0
    && callsUsed < maxCalls
  );
  let reason = "chapter_not_allowlisted";
  if (allowedById && dryRun) reason = "dry_run";
  else if (allowedById && provider !== "workers-ai") reason = "provider_not_workers_ai";
  else if (allowedById && !workersEnabled) reason = "workers_ai_disabled";
  else if (allowedById && !hasWorkersAiBinding) reason = "missing_ai_binding";
  else if (allowedById && maxCalls <= 0) reason = "max_calls_zero";
  else if (allowedById && callsUsed >= maxCalls) reason = "max_calls_exceeded";
  else if (allowActual) reason = "real_llm_allowed";
  return {
    allowActual,
    provider: allowActual ? "workers-ai" : "mock",
    isMock: !allowActual,
    reason,
    allowedById,
    maxCalls,
    callsUsed,
  };
}

function isNewYearExpectedChapterFallbackError(error) {
  const code = clean(error?.code || error?.message);
  return code !== "PDF_MOCK_CHAPTER_FAILED";
}

function buildNewYearFallbackChapterResult(params = {}, plan = {}, error = null) {
  const errorCode = clean(error?.code || "").toLowerCase();
  const fallbackReason = plan.allowActual === true
    ? clean(errorCode || "workers_ai_run_failed")
    : clean(plan.reason || "mock_fallback");
  return {
    chapterId: clean(params.chapterId),
    title: clean(params.chapterTitle),
    content: buildNewYearMockChapterMarkdown(params),
    provider: "mock",
    modelName: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    realLlmAllowed: plan.allowActual === true,
    providerReason: fallbackReason,
    errorSummary: clean(error?.causeMessage || error?.message || error, 300),
  };
}

async function generateNewYearPdfChapterContent(params = {}, env = {}) {
  const plan = resolveNewYearChapterProviderPlan(params, env);
  logNewYearAiBindingCheck({
    debugEnabled: readBooleanFlag(env, "PDF_DEBUG_MODE", false),
    hasEnvAI: Boolean(env?.AI && typeof env.AI.run === "function"),
    provider: clean(env.PDF_LLM_PROVIDER || "mock").toLowerCase(),
    dryRun: readBooleanFlag(env, "LLM_DRY_RUN", !isNewYearProductionEnv(env)),
    workersAiEnabled: readBooleanFlag(env, "WORKERS_AI_ENABLED", false),
    maxCallsPerJob: Number(env.PDF_LLM_MAX_CALLS_PER_JOB || 0) || 0,
    realChapterIds: Array.from(newYearRealLlmChapterIdSet(env)),
    chapterId: params.chapterId,
    willUseRealLLM: plan.allowActual,
    providerReason: plan.reason,
  });
  let gatewayResult;
  try {
    gatewayResult = await generatePdfChapterContent({
      serviceKey: SERVICE_KEY,
      serviceType: "new_year_pdf",
      jobId: params.jobId,
      chapterId: params.chapterId,
      chapterTitle: params.chapterTitle,
      chapterOrder: params.chapterOrder,
      totalChapters: params.totalChapters,
      input: params.input,
      context: {
        ...(params.context || {}),
        format: "markdown",
        provider: plan.provider,
        allowActual: plan.allowActual,
        providerReason: plan.reason,
        callIndex: Number(plan.callsUsed || 0) + 1,
        serviceKey: SERVICE_KEY,
      },
    }, env);
  } catch (error) {
    if (!isNewYearExpectedChapterFallbackError(error)) throw error;
    const fallback = buildNewYearFallbackChapterResult(params, plan, error);
    console.warn("[NewYearPremiumPDF][ChapterProviderFallback]", {
      jobId: clean(params.jobId),
      chapterId: fallback.chapterId,
      chapterOrder: Number(params.chapterOrder || 0) || 0,
      provider: fallback.provider,
      isMock: fallback.isMock,
      reason: fallback.providerReason,
      errorCode: clean(error?.code || "PDF_CHAPTER_GENERATION_FALLBACK"),
    });
    return fallback;
  }
  const provider = clean(gatewayResult?.provider || plan.provider || "mock").toLowerCase();
  const isMock = gatewayResult?.isMock !== false || provider === "mock";
  const result = {
    chapterId: clean(params.chapterId),
    title: clean(params.chapterTitle),
    content: isMock ? buildNewYearMockChapterMarkdown(params) : String(gatewayResult.content || "").replace(/\r/g, "").trim(),
    provider: isMock ? "mock" : provider,
    modelName: clean(gatewayResult?.modelName || gatewayResult?.model || provider),
    tokensUsed: isMock ? 0 : Math.max(0, Number(gatewayResult?.tokensUsed || 0) || 0),
    cost: isMock ? 0 : Math.max(0, Number(gatewayResult?.cost || 0) || 0),
    isMock,
    realLlmAllowed: plan.allowActual,
    providerReason: isMock ? clean(gatewayResult?.providerReason || plan.reason) : clean(gatewayResult?.providerReason || "real_llm_success"),
  };
  if (readBooleanFlag(env, "PDF_DEBUG_MODE", false)) {
    console.info("[NewYearPremiumPDF][ChapterProviderResolved]", {
      jobId: clean(params.jobId),
      chapterId: clean(params.chapterId),
      chapterOrder: Number(params.chapterOrder || 0) || 0,
      provider: result.provider,
      modelName: result.modelName,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      isMock: result.isMock,
      providerReason: result.providerReason,
    });
  }
  return result;
}

function buildNewYearMockChapterSections(chapter = {}, job = {}) {
  const specs = buildSajuNewYearChapterSpecs(job.inputSnapshot?.targetYear || resolveDefaultTargetYear());
  const spec = specs.find((item) => clean(item.id) === clean(chapter.id)) || specs[Number(chapter.order || 1) - 1] || {};
  const categories = Array.isArray(spec.categories) && spec.categories.length
    ? spec.categories
    : ["생성 정보", "사용자 입력 요약", "챕터 검증 포인트"];
  const base = clean(chapter.content);
  const showDebugProvider = job.contextSnapshot?.debugProviderVisible === true;
  const isMock = chapter.isMock !== false;
  const providerLabel = isMock ? "mock" : clean(chapter.provider || "workers-ai");
  const sourceLabel = isMock ? "mock" : "real LLM";
  const tokensUsed = isMock ? 0 : Math.max(0, Number(chapter.tokensUsed || 0) || 0);
  const cost = isMock ? 0 : Math.max(0, Number(chapter.cost || 0) || 0);
  return categories.map((title, index) => {
    const body = showDebugProvider
      ? [
        base,
        `섹션 확인 ${index + 1}: ${clean(title)} 항목은 ${sourceLabel} 콘텐츠로 PDF 본문에 들어갑니다.`,
        `Provider: ${providerLabel} · Tokens: ${tokensUsed} · Cost: ${cost}원`,
        `Job ${clean(job.id)}의 ${Number(chapter.order || 1)}장 상태는 pending에서 generating을 거쳐 completed로 저장됩니다.`,
      ].join("\n\n")
      : base;
    return {
      title: clean(title),
      body,
      finalText: body,
      text: body,
      content: body,
    };
  });
}

function buildNewYearMockArchiveChapters(job = {}) {
  return (Array.isArray(job.chapters) ? job.chapters : []).map((chapter, index) => {
    const sections = buildNewYearMockChapterSections(chapter, job);
    const isMock = chapter.isMock !== false;
    const provider = isMock ? "mock" : clean(chapter.provider || "workers-ai").toLowerCase();
    const tokensUsed = isMock ? 0 : Math.max(0, Number(chapter.tokensUsed || 0) || 0);
    const cost = isMock ? 0 : Math.max(0, Number(chapter.cost || 0) || 0);
    const chapterId = clean(chapter.chapterId || chapter.id);
    const text = sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n");
    const content = String(chapter.content == null ? "" : chapter.content).replace(/\r/g, "").trim();
    return {
      no: Number(chapter.order || index + 1),
      id: chapterId,
      chapterId,
      title: clean(chapter.title),
      sections,
      categories: sections.map((section) => ({
        title: section.title,
        finalText: section.body,
        text: section.body,
        content: section.body,
      })),
      content: content || text,
      text,
      provider,
      modelName: clean(chapter.modelName || chapter.model || provider),
      tokensUsed,
      cost,
      isMock,
      source: isMock ? "mock" : provider,
      realLlmAllowed: chapter.realLlmAllowed === true || undefined,
      providerReason: clean(chapter.providerReason) || undefined,
    };
  });
}

function buildNewYearMockClientSummary(job = {}) {
  const input = job.inputSnapshot || {};
  const providerSummary = buildNewYearProviderSummary(job);
  const providerValue = providerSummary.isMock
    ? "mock"
    : `mixed (real ${providerSummary.realChapterCount} / mock ${providerSummary.mockChapterCount})`;
  const consultation = providerSummary.isMock
    ? [
      "mock 콘텐츠만으로 신년운세 PDF 생성, 저장, 다운로드 흐름을 확인했습니다.",
      "실제 LLM 호출 없이 모든 챕터가 순서대로 완료되었습니다.",
    ]
    : [
      `실제 LLM ${providerSummary.realChapterCount}개 챕터와 mock ${providerSummary.mockChapterCount}개 챕터가 함께 저장되었습니다.`,
      `실제 LLM 챕터: ${providerSummary.realChapterIds.join(", ") || "없음"}`,
    ];
  return {
    cards: [
      { label: "대상 연도", value: `${clean(input.targetYear) || resolveDefaultTargetYear()}년` },
      { label: "챕터", value: `${Number(job.totalChapters || NEW_YEAR_CHAPTERS.length)}장` },
      { label: "Provider", value: providerValue },
      { label: "LLM 비용", value: `${providerSummary.cost}원` },
    ],
    opportunities: [],
    cautions: [],
    consultation,
    quality: { status: "passed", pdfReady: true },
  };
}

function buildNewYearMockPdfHtml(job = {}, archiveChapters = []) {
  const input = job.inputSnapshot || {};
  const showDebugProvider = job.contextSnapshot?.debugProviderVisible === true;
  const providerSummary = buildNewYearProviderSummary(job);
  const title = `${clean(input.targetYear) || resolveDefaultTargetYear()}년 신년운세 PDF`;
  const toc = archiveChapters.map((chapter) => `<li>${Number(chapter.no || 0)}장 ${escHtml(chapter.title)}</li>`).join("");
  const body = archiveChapters.map((chapter) => {
    const providerMeta = `Provider: ${clean(chapter.provider || "mock")} · Tokens: ${Number(chapter.tokensUsed || 0) || 0} · Cost: ${Number(chapter.cost || 0) || 0}원 · ${chapter.isMock === false ? "real LLM" : "mock"}`;
    const sections = (Array.isArray(chapter.sections) ? chapter.sections : []).map((section) => (
      `<section class="mock-section"><h3>${escHtml(section.title)}</h3>${clean(section.body).split(/\n{2,}/).map((paragraph) => `<p>${escHtml(paragraph)}</p>`).join("")}</section>`
    )).join("");
    const metaHtml = showDebugProvider ? `<p class="mock-meta">${escHtml(providerMeta)}</p>` : "";
    return `<article class="mock-chapter"><h2>${Number(chapter.no || 0)}장 ${escHtml(chapter.title)}</h2>${metaHtml}${sections}</article>`;
  }).join("");
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: "Noto Sans KR", "Apple SD Gothic Neo", sans-serif; color: #24172f; background: #fffaf3; line-height: 1.68; }
    .cover { min-height: 520px; display: flex; flex-direction: column; justify-content: center; border-bottom: 2px solid #6d4c8d; }
    .cover-kicker { color: #7c3aed; font-weight: 700; letter-spacing: 0; }
    h1 { font-size: 34px; margin: 16px 0; }
    h2 { break-before: page; font-size: 24px; margin-top: 32px; color: #4c1d95; }
    h3 { font-size: 17px; color: #7c2d12; margin-top: 18px; }
    .toc { break-before: page; }
    .toc li { margin: 8px 0; }
    p { margin: 8px 0; word-break: keep-all; }
    .mock-meta { margin-top: 18px; color: #6b4a2f; }
  </style>
</head>
<body>
  <section class="cover">
    <p class="cover-kicker">CODE DESTINY NEW YEAR PDF</p>
    <h1>${escHtml(title)}</h1>
    <p>${escHtml(clean(input.name) || "고객")}님의 신년운세 PDF 생성 결과입니다.</p>
    ${showDebugProvider ? `<p class="mock-meta">Provider: ${escHtml(providerSummary.provider)} · Tokens: ${providerSummary.tokensUsed} · Cost: ${providerSummary.cost}원 · Real: ${providerSummary.realChapterCount} · Mock: ${providerSummary.mockChapterCount} · Job ID: ${escHtml(job.id)}</p>` : ""}
  </section>
  <section class="toc">
    <h2>목차</h2>
    <ol>${toc}</ol>
  </section>
  ${body}
</body>
</html>`;
}

function delayNewYearMockChapter(env = {}) {
  const ms = Math.max(0, Math.min(3000, Number(env.PDF_MOCK_CHAPTER_DELAY_MS || 250) || 0));
  return ms ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

async function handleVerifyAccess(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      logNewYearPdfFlow(env, request, {
        stage: "verify-access/auth",
        httpStatus: 401,
        accessVerified: false,
      });
      return newYearAuthFailureResponse(request, "prepare");
    }
    throw error;
  }
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) {
    logNewYearPdfFlow(env, request, {
      stage: "verify-access/input",
      httpStatus: 422,
      accessVerified: false,
    });
    return json({ ok: false, serviceKey: SERVICE_KEY, code: "INVALID_INPUT", message: normalized.message || newYearPublicErrorMessage("INVALID_INPUT") }, { status: 422 });
  }
  const accessResult = await resolveNewYearPdfAccess(request, env, auth, body);
  if (!accessResult.ok) {
    logNewYearPdfFlow(env, request, {
      stage: "verify-access/access",
      httpStatus: newYearErrorStatus(clean(accessResult?.code), Number(accessResult?.status || 402)),
      hasAccess: false,
      accessVerified: false,
    });
    return newYearAccessFailureResponse(request, body, accessResult, "prepare");
  }
  const reportId = clean(body?.reportId || `ny_${normalized.targetYear}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);
  const access = buildNewYearPdfAccess(accessResult.access, accessResult.method);
  logNewYearPdfFlow(env, request, {
    stage: "verify-access/success",
    httpStatus: 200,
    jobId: reportId,
    hasAccess: true,
    accessVerified: access.verified === true,
  });
  return json({
    ok: true,
    serviceKey: SERVICE_KEY,
    serviceType: "new_year_pdf",
    accessGranted: true,
    access,
    accessGrant: {
      ok: true,
      reportId,
      sessionId: clean(body?.sessionId || body?.reportSessionId || newYearPdfSessionId(reportId)),
      featureKey: normalizeFeatureKey(body?.featureKey),
      purchaseId: clean(body?.purchaseId || body?.accessGrant?.purchaseId || access.paymentId || access.passId || `access:${reportId}`),
      requestId: clean(body?.requestId || body?.accessGrant?.requestId || `verify:${reportId}`),
      accessType: access.method,
      premiumAccessToken: accessResult.premiumAccessToken || undefined,
    },
    reportId,
    sessionId: clean(body?.sessionId || body?.reportSessionId || newYearPdfSessionId(reportId)),
    targetYear: normalized.targetYear,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  });
}

async function handleCreateJob(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      logNewYearPdfFlow(env, request, {
        stage: "create-job/auth",
        httpStatus: 401,
        createJobStarted: true,
        accessVerified: false,
      });
      return newYearAuthFailureResponse(request, "prepare");
    }
    throw error;
  }
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) {
    logNewYearPdfFlow(env, request, {
      stage: "create-job/input",
      httpStatus: 422,
      createJobStarted: true,
      accessVerified: false,
    });
    return json({ ok: false, serviceKey: SERVICE_KEY, code: "INVALID_INPUT", message: normalized.message || newYearPublicErrorMessage("INVALID_INPUT") }, { status: 422 });
  }
  const accessResult = await resolveNewYearPdfAccess(request, env, auth, body);
  if (!accessResult.ok) {
    logNewYearPdfFlow(env, request, {
      stage: "create-job/access",
      httpStatus: newYearErrorStatus(clean(accessResult?.code), Number(accessResult?.status || 402)),
      createJobStarted: true,
      hasAccess: false,
      accessVerified: false,
    });
    return newYearAccessFailureResponse(request, body, accessResult, "prepare");
  }
  const jobId = clean(body?.jobId || body?.reportId || body?.accessGrant?.reportId || `ny_${normalized.targetYear}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || newYearPdfSessionId(jobId));
  const existingDoc = await findNewYearPdfJobExecution(env, auth.userId, jobId, sessionId);
  const existingJob = existingDoc?.metadata?.newYearPdfJob;
  if (existingJob?.id) {
    logNewYearPdfFlow(env, request, {
      stage: "create-job/existing",
      httpStatus: existingJob.status === "completed" ? 200 : 202,
      jobId: existingJob.id,
      createJobStarted: true,
      hasAccess: true,
      accessVerified: existingJob.access?.verified === true,
    });
    return json(buildNewYearPdfStatusPayload(existingJob), { status: existingJob.status === "completed" ? 200 : 202 });
  }
  const featureKey = normalizeFeatureKey(body?.featureKey);
  const job = buildNewYearPdfJob({ jobId, userId: auth.userId, normalized, body, access: { ...accessResult.access, method: accessResult.method } });
  job.access = buildNewYearPdfAccess(accessResult.access, accessResult.method);
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: SERVICE_KEY,
    reportType: "sajuNewYear",
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId: jobId,
    access: accessResult.access,
    body: {
      ...body,
      sessionId,
      reportSessionId: sessionId,
      reportId: jobId,
      accessGrant: {
        ...(body.accessGrant || {}),
        sessionId,
        reportSessionId: sessionId,
        reportId: jobId,
      },
    },
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  executionCtx.metadata = {
    ...(executionCtx.metadata || {}),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    newYearPdfJob: job,
  };
  await startPremiumPdfExecution(env, auth.userId, executionCtx);
  await persistNewYearPdfJob(env, auth.userId, executionCtx, job);
  logNewYearPdfFlow(env, request, {
    stage: "create-job/created",
    httpStatus: 201,
    jobId,
    createJobStarted: true,
    hasAccess: true,
    accessVerified: job.access?.verified === true,
  });
  return json(buildNewYearPdfStatusPayload(job), { status: 201 });
}

async function handleGenerateMock(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      logNewYearPdfFlow(env, request, {
        stage: "generate/auth",
        httpStatus: 401,
        generateStarted: true,
        accessVerified: false,
      });
      return newYearAuthFailureResponse(request, "generate");
    }
    throw error;
  }
  const body = await readJson(request);
  const jobId = clean(body?.jobId || body?.reportId);
  if (!jobId) {
    logNewYearPdfFlow(env, request, {
      stage: "generate/input",
      httpStatus: 422,
      generateStarted: true,
    });
  }
  if (!jobId) return json({ ok: false, serviceKey: SERVICE_KEY, code: "MISSING_JOB_ID", message: "jobId가 필요합니다." }, { status: 422 });
  const doc = await findNewYearPdfJobExecution(env, auth.userId, jobId, body?.sessionId || body?.reportSessionId);
  const initialJob = doc?.metadata?.newYearPdfJob;
  if (!doc || !initialJob?.id) {
    logNewYearPdfFlow(env, request, {
      stage: "generate/job-not-found",
      httpStatus: 404,
      jobId,
      generateStarted: true,
    });
  }
  if (!doc || !initialJob?.id) return json({ ok: false, serviceKey: SERVICE_KEY, code: "JOB_NOT_FOUND", message: "신년운세 PDF Job을 찾을 수 없습니다." }, { status: 404 });
  if (initialJob.access?.verified !== true) {
    logNewYearPdfFlow(env, request, {
      stage: "generate/access",
      httpStatus: 403,
      jobId,
      generateStarted: true,
      accessVerified: false,
    });
  }
  if (initialJob.access?.verified !== true) return json({ ok: false, serviceKey: SERVICE_KEY, code: "ACCESS_NOT_VERIFIED", message: "결제 또는 이용권 검증이 완료되지 않았습니다." }, { status: 403 });
  if (initialJob.status === "completed") {
    logNewYearPdfFlow(env, request, {
      stage: "generate/completed-existing",
      httpStatus: 200,
      jobId,
      generateStarted: true,
      accessVerified: true,
    });
  }
  if (initialJob.status === "completed") return json(buildNewYearMockResultPayload(initialJob, doc));
  if (["generating", "chapter_generating", "rendering", "saving"].includes(clean(initialJob.status))) {
    logNewYearPdfFlow(env, request, {
      stage: "generate/in-progress",
      httpStatus: 202,
      jobId,
      generateStarted: true,
      accessVerified: true,
      statusPollingStarted: true,
    });
    return json(buildNewYearPdfStatusPayload(initialJob), { status: 202 });
  }
  const acquired = await ServiceExecutionTransaction.findOneAndUpdate(
    {
      _id: doc._id,
      userId: auth.userId,
      "metadata.newYearPdfJob.status": { $nin: ["generating", "chapter_generating", "rendering", "saving", "completed"] },
    },
    {
      $set: {
        "metadata.newYearPdfJob.status": "generating",
        "metadata.newYearPdfJob.updatedAt": newYearPdfNow(),
        "metadata.newYearPdfJob.progressPercent": calculateNewYearPdfProgress("generating", initialJob.completedChapters, initialJob.totalChapters, initialJob.progressPercent),
        "metadata.generationStatus": "generating",
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!acquired) {
    const freshDoc = await findNewYearPdfJobExecution(env, auth.userId, jobId, body?.sessionId || body?.reportSessionId);
    logNewYearPdfFlow(env, request, {
      stage: "generate/acquire-existing",
      httpStatus: 202,
      jobId,
      generateStarted: true,
      accessVerified: true,
      statusPollingStarted: true,
    });
    return json(buildNewYearPdfStatusPayload(freshDoc?.metadata?.newYearPdfJob || initialJob), { status: 202 });
  }
  let job = acquired.metadata.newYearPdfJob;
  const executionCtx = buildNewYearPdfExecutionContextFromDoc(acquired);
  const persist = (nextJob, extraSet = {}) => persistNewYearPdfJob(env, auth.userId, executionCtx, nextJob, extraSet);
  try {
    job = {
      ...job,
      status: "generating",
      progressPercent: calculateNewYearPdfProgress("generating", job.completedChapters, job.totalChapters, job.progressPercent),
      updatedAt: newYearPdfNow(),
    };
    await persist(job);
    logNewYearPdfFlow(env, request, {
      stage: "generate/started",
      httpStatus: 202,
      jobId: job.id,
      generateStarted: true,
      accessVerified: true,
      statusPollingStarted: true,
    });
    const total = Number(job.totalChapters || job.chapters?.length || NEW_YEAR_CHAPTERS.length);
    for (let index = 0; index < total; index += 1) {
      const chapter = job.chapters[index];
      if (!chapter) throw Object.assign(new Error("챕터 정의가 없습니다."), { code: "CHAPTER_DEFINITION_MISSING", status: 500 });
      if (chapter.status === "completed") continue;
      const startedAt = newYearPdfNow();
      const realLlmCallsUsed = job.chapters.filter((item) => item && item.isMock === false).length;
      const providerPlan = resolveNewYearChapterProviderPlan({
        jobId: job.id,
        chapterId: chapter.id,
        chapterOrder: chapter.order,
        realLlmCallsUsed,
      }, env);
      job.chapters[index] = {
        ...chapter,
        status: "generating",
        startedAt,
        provider: providerPlan.provider,
        tokensUsed: 0,
        cost: 0,
        isMock: providerPlan.isMock,
        realLlmAllowed: providerPlan.allowActual,
        providerReason: providerPlan.reason,
      };
      syncNewYearJobProviderSummary(job);
      job.status = "chapter_generating";
      job.currentChapterId = chapter.id;
      job.currentChapterTitle = chapter.title;
      job.progressPercent = calculateNewYearPdfProgress(job.status, job.completedChapters, job.totalChapters, job.progressPercent);
      job.updatedAt = startedAt;
      await persist(job);
      const result = await generateNewYearPdfChapterContent({
        jobId: job.id,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        totalChapters: total,
        input: job.inputSnapshot,
        context: job.contextSnapshot,
        realLlmCallsUsed,
      }, env);
      const completedAt = newYearPdfNow();
      job.chapters[index] = {
        ...job.chapters[index],
        status: "completed",
        chapterId: clean(result.chapterId || chapter.chapterId || chapter.id),
        title: clean(result.title || chapter.title),
        content: result.content,
        provider: clean(result.provider || providerPlan.provider || "mock").toLowerCase(),
        modelName: clean(result.modelName || result.model || result.provider || providerPlan.provider || "mock"),
        tokensUsed: Math.max(0, Number(result.tokensUsed || 0) || 0),
        cost: Math.max(0, Number(result.cost || 0) || 0),
        isMock: result.isMock !== false,
        realLlmAllowed: result.realLlmAllowed === true,
        providerReason: clean(result.providerReason || providerPlan.reason),
        completedAt,
      };
      job.completedChapters = job.chapters.filter((item) => item.status === "completed").length;
      syncNewYearJobProviderSummary(job);
      job.progressPercent = calculateNewYearPdfProgress("chapter_generating", job.completedChapters, job.totalChapters, job.progressPercent);
      job.updatedAt = completedAt;
      await persist(job);
      await delayNewYearMockChapter(env);
    }
    job.status = "rendering";
    job.currentChapterTitle = "PDF 렌더링";
    job.progressPercent = calculateNewYearPdfProgress(job.status, job.completedChapters, job.totalChapters, job.progressPercent);
    job.updatedAt = newYearPdfNow();
    await persist(job);
    const requestOrigin = new URL(request.url).origin;
    const archiveUrls = buildNewYearArchiveUrls(requestOrigin, job.id);
    job.contextSnapshot = {
      ...(job.contextSnapshot || {}),
      debugProviderVisible: readBooleanFlag(env, "PDF_DEBUG_MODE", false),
    };
    const archiveChapters = buildNewYearMockArchiveChapters(job);
    const providerSummary = buildNewYearProviderSummary(job);
    const html = buildNewYearMockPdfHtml(job, archiveChapters);
    const pdfReady = {
      title: `${clean(job.inputSnapshot?.targetYear) || resolveDefaultTargetYear()}년 신년운세 PDF`,
      filename: buildNewYearPdfFilename(job.inputSnapshot?.targetYear, job.inputSnapshot?.name || "user"),
      htmlFilename: buildNewYearHtmlFilename(job.inputSnapshot?.targetYear, job.inputSnapshot?.name || "user"),
      generatedAt: newYearPdfNow(),
      targetYear: Number(job.inputSnapshot?.targetYear || resolveDefaultTargetYear()),
      html,
      htmlUrl: archiveUrls.htmlUrl,
      pdfUrl: archiveUrls.pdfUrl,
      downloadUrl: archiveUrls.pdfUrl,
      directDownloadUrl: archiveUrls.pdfUrl,
      storageKey: `premium-archive:saju-new-year:${job.id}`,
      mimeType: "application/pdf",
      contentType: "application/pdf",
      renderFormat: "pdf-archive",
      chapters: archiveChapters,
      metadata: {
        provider: providerSummary.provider,
        tokensUsed: providerSummary.tokensUsed,
        cost: providerSummary.cost,
        isMock: providerSummary.isMock,
        realLlmChapterIds: providerSummary.realChapterIds,
        mockChapterIds: providerSummary.mockChapterIds,
        chapterProviders: providerSummary.chapterProviders,
        llmAssemblyOnly: true,
        externalCallsAllowed: providerSummary.externalCallsAllowed,
      },
    };
    job.status = "saving";
    job.currentChapterTitle = "PDF 저장";
    job.progressPercent = calculateNewYearPdfProgress(job.status, job.completedChapters, job.totalChapters, job.progressPercent);
    job.updatedAt = newYearPdfNow();
    await persist(job, { "metadata.archive.pdfReady": pdfReady });
    const storedUrl = clean(pdfReady.downloadUrl || pdfReady.pdfUrl);
    if (!storedUrl) throw Object.assign(new Error("PDF 다운로드 URL 생성에 실패했습니다."), { code: "NEW_YEAR_PDF_URL_MISSING", status: 500 });
    job = {
      ...job,
      status: "completed",
      progressPercent: 100,
      pdfUrl: storedUrl,
      currentChapterId: "",
      currentChapterTitle: "완료",
      provider: providerSummary.provider,
      tokensUsed: providerSummary.tokensUsed,
      cost: providerSummary.cost,
      isMock: providerSummary.isMock,
      realLlmChapterIds: providerSummary.realChapterIds,
      mockChapterIds: providerSummary.mockChapterIds,
      chapterProviders: providerSummary.chapterProviders,
      updatedAt: newYearPdfNow(),
      completedAt: newYearPdfNow(),
    };
    const archivePayload = {
      reportId: job.id,
      serviceKey: SERVICE_KEY,
      serviceType: "new_year_pdf",
      reportType: "sajuNewYear",
      status: "completed",
      targetYear: Number(job.inputSnapshot?.targetYear || resolveDefaultTargetYear()),
      chapterCount: archiveChapters.length,
      finalChapterCount: archiveChapters.length,
      chapters: archiveChapters,
      clientSummary: buildNewYearMockClientSummary(job),
      pdfReady,
      pdfUrl: storedUrl,
      htmlUrl: archiveUrls.htmlUrl,
      downloadUrl: storedUrl,
      provider: providerSummary.provider,
      tokensUsed: providerSummary.tokensUsed,
      cost: providerSummary.cost,
      isMock: providerSummary.isMock,
      realLlmChapterIds: providerSummary.realChapterIds,
      mockChapterIds: providerSummary.mockChapterIds,
      chapterProviders: providerSummary.chapterProviders,
      canReopen: true,
      canDownload: true,
    };
    const completedMetadata = {
      ...(executionCtx.metadata || {}),
      newYearPdfJob: job,
      provider: providerSummary.provider,
      tokensUsed: providerSummary.tokensUsed,
      cost: providerSummary.cost,
      isMock: providerSummary.isMock,
      realLlmChapterIds: providerSummary.realChapterIds,
      mockChapterIds: providerSummary.mockChapterIds,
      chapterProviders: providerSummary.chapterProviders,
      chapterCount: archiveChapters.length,
      targetYear: Number(job.inputSnapshot?.targetYear || resolveDefaultTargetYear()),
      archive: {
        reportId: job.id,
        reportType: "new_year",
        archiveReportType: "sajuNewYear",
        displayName: "사주 신년운세",
        title: archivePayload.pdfReady.title,
        mode: "personal",
        birthName: clean(job.inputSnapshot?.name),
        summary: clean(archiveChapters[0]?.text).slice(0, 1000),
        pdfUrl: storedUrl,
        htmlUrl: archiveUrls.htmlUrl,
        downloadUrl: storedUrl,
        chapters: archiveChapters,
        clientSummary: archivePayload.clientSummary,
        pdfReady,
        payload: archivePayload,
        provider: providerSummary.provider,
        tokensUsed: providerSummary.tokensUsed,
        cost: providerSummary.cost,
        isMock: providerSummary.isMock,
        realLlmChapterIds: providerSummary.realChapterIds,
        mockChapterIds: providerSummary.mockChapterIds,
        chapterProviders: providerSummary.chapterProviders,
        canReopen: true,
        canDownload: true,
      },
    };
    executionCtx.metadata = completedMetadata;
    await completePremiumPdfExecution(env, auth.userId, executionCtx, job.id, completedMetadata);
    logNewYearPdfFlow(env, request, {
      stage: "generate/completed",
      httpStatus: 200,
      jobId: job.id,
      hasAccess: true,
      accessVerified: true,
      generateStarted: true,
      statusPollingStarted: true,
    });
    return json(buildNewYearMockResultPayload(job, { metadata: completedMetadata }));
  } catch (error) {
    const failedAt = newYearPdfNow();
    const chapterIndex = Array.isArray(job.chapters) ? job.chapters.findIndex((chapter) => chapter.status === "generating") : -1;
    if (chapterIndex >= 0) {
      job.chapters[chapterIndex] = {
        ...job.chapters[chapterIndex],
        status: "failed",
        errorMessage: clean(error?.message || error),
        completedAt: failedAt,
      };
    }
    job.status = "failed";
    job.errorMessage = clean(error?.message || "신년운세 PDF 생성 중 문제가 발생했습니다.");
    job.progressPercent = calculateNewYearPdfProgress("failed", job.completedChapters, job.totalChapters, job.progressPercent);
    job.updatedAt = failedAt;
    await persist(job);
    logNewYearPdfFlow(env, request, {
      stage: "generate/failed",
      httpStatus: Number(error?.status || 500) || 500,
      jobId: job.id,
      generateStarted: true,
      accessVerified: true,
      statusPollingStarted: true,
    });
    await markNewYearExecutionFailedForRetry(env, auth.userId, executionCtx, {
      status: "failed",
      progress: job.progressPercent,
      completedChapters: job.completedChapters,
      totalChapters: job.totalChapters,
      currentChapterNumber: currentNewYearPdfChapterNumber(job),
      currentChapterTitle: job.currentChapterTitle,
      failedChapterNumber: currentNewYearPdfChapterNumber(job),
      failedChapterTitle: job.currentChapterTitle,
      errorCode: clean(error?.code || "GENERATION_FAILED"),
      errorMessage: job.errorMessage,
      currentStep: job.errorMessage,
    });
    console.error("[NewYearPremiumPDF][MockPipelineFailed]", {
      jobId: job.id,
      chapterId: clean(job.currentChapterId),
      errorCode: clean(error?.code || "GENERATION_FAILED"),
      message: clean(error?.message || error),
      stack: error?.stack,
    });
    return json(buildNewYearPdfStatusPayload(job), { status: newYearErrorStatus(error?.code || "GENERATION_FAILED", Number(error?.status || 500)) });
  }
}

function buildNewYearMockResultPayload(job = {}, doc = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const payload = archive.payload && typeof archive.payload === "object" ? archive.payload : {};
  const providerSummary = buildNewYearProviderSummary(job);
  if (clean(job.status) !== "completed") {
    return {
      ok: true,
      serviceKey: SERVICE_KEY,
      serviceType: "new_year_pdf",
      reportType: "sajuNewYear",
      jobId: clean(job.id),
      reportId: clean(job.id),
      status: clean(job.status || "created"),
      pdfUrl: null,
      message: "아직 PDF 생성이 완료되지 않았습니다.",
      provider: providerSummary.provider,
      tokensUsed: providerSummary.tokensUsed,
      cost: providerSummary.cost,
      isMock: providerSummary.isMock,
      realLlmChapterIds: providerSummary.realChapterIds,
      mockChapterIds: providerSummary.mockChapterIds,
      chapterProviders: providerSummary.chapterProviders,
    };
  }
  const chapters = Array.isArray(payload.chapters) && payload.chapters.length
    ? payload.chapters
    : buildNewYearMockArchiveChapters(job);
  const pdfReady = payload.pdfReady || archive.pdfReady || {};
  const pdfUrl = clean(job.pdfUrl || payload.pdfUrl || payload.downloadUrl || pdfReady.downloadUrl || pdfReady.pdfUrl);
  const data = {
    ...(payload || {}),
    jobId: clean(job.id),
    reportId: clean(job.id),
    sessionId: newYearPdfSessionId(job.id),
    serviceKey: SERVICE_KEY,
    serviceType: "new_year_pdf",
    reportType: "sajuNewYear",
    status: "completed",
    targetYear: Number(job.inputSnapshot?.targetYear || payload.targetYear || resolveDefaultTargetYear()),
    chapterCount: chapters.length,
    finalChapterCount: chapters.length,
    chapters,
    clientSummary: payload.clientSummary || buildNewYearMockClientSummary(job),
    pdfReady,
    pdfUrl,
    htmlUrl: clean(payload.htmlUrl || pdfReady.htmlUrl || archive.htmlUrl),
    downloadUrl: pdfUrl,
    completedAt: clean(job.completedAt),
    provider: providerSummary.provider,
    tokensUsed: providerSummary.tokensUsed,
    cost: providerSummary.cost,
    isMock: providerSummary.isMock,
    realLlmChapterIds: providerSummary.realChapterIds,
    mockChapterIds: providerSummary.mockChapterIds,
    chapterProviders: providerSummary.chapterProviders,
    canReopen: true,
    canDownload: Boolean(pdfUrl),
  };
  return {
    ok: true,
    serviceKey: SERVICE_KEY,
    serviceType: "new_year_pdf",
    reportType: "sajuNewYear",
    jobId: clean(job.id),
    reportId: clean(job.id),
    status: "completed",
    serverStatus: "completed",
    progressPercent: 100,
    data,
    ...data,
  };
}

async function handleResult(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return newYearAuthFailureResponse(request, "result");
    }
    throw error;
  }
  const url = new URL(request.url);
  const path = getRoutePath(request, "/api/saju-new-year");
  const pathJobId = clean(String(path || "").replace(/^\/?result\/?/, ""));
  const jobId = clean(pathJobId || url.searchParams.get("jobId") || url.searchParams.get("reportId"));
  if (!jobId) return json({ ok: false, serviceKey: SERVICE_KEY, code: "MISSING_JOB_ID", message: "jobId가 필요합니다." }, { status: 422 });
  const doc = await findNewYearPdfJobExecution(env, auth.userId, jobId, url.searchParams.get("sessionId"));
  const job = doc?.metadata?.newYearPdfJob;
  if (!doc || !job?.id) return json({ ok: false, serviceKey: SERVICE_KEY, code: "JOB_NOT_FOUND", message: "신년운세 PDF Job을 찾을 수 없습니다." }, { status: 404 });
  return json(buildNewYearMockResultPayload(job, doc), { status: job.status === "completed" ? 200 : 202 });
}

async function handlePrepare(request, env) {
  compactNewYearLocks();
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return newYearAuthFailureResponse(request, "prepare");
    }
    throw error;
  }

  const body = await readJson(request);
  console.info("[NewYearPremiumPDF][RequestReceived]", { hasBody: Boolean(body) });
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, serviceKey: SERVICE_KEY, code: "INVALID_INPUT", message: normalized.message || newYearPublicErrorMessage("INVALID_INPUT") }, { status: 422 });
  console.info("[NewYearPremiumPDF][TargetYearValidated]", { targetYear: normalized.targetYear });
  console.info("[NewYearPremiumPDF][BirthInputValidated]", { birthDate: normalized.birthInput.birthDate, isTimeUnknown: normalized.birthInput.isTimeUnknown });

  const featureKey = normalizeFeatureKey(body?.featureKey);
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `saju-new-year-${normalized.targetYear}-${Date.now().toString(36)}`);
  const sessionKey = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || body?.sessionKey) || `saju-new-year:${reportId}`;
  let cacheNormalized = null;
  let yearlySajuPdfCacheKey = "";
  try {
    cacheNormalized = normalizeYearlySajuInput({
      profile: normalized.profile,
      targetYear: normalized.targetYear,
      body,
    });
    yearlySajuPdfCacheKey = buildYearlySajuPdfCacheKey(cacheNormalized);
  } catch (error) {
    if (body?.preflightOnly || body?.lookupOnly) {
      return json({
        ok: true,
        serviceKey: SERVICE_KEY,
        status: "not_cached",
        requiresPayment: true,
        reportId,
        sessionId: sessionKey,
        targetYear: normalized.targetYear,
      });
    }
    throw error;
  }
  const reusableExecutionCtx = buildPremiumExecutionContext({
    serviceKey: SERVICE_KEY,
    reportType: "sajuNewYear",
    userId: auth.userId,
    featureKey,
    sessionId: sessionKey,
    reportId,
    access: null,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  const reusableExecution = await findNewYearReusableExecution(env, auth.userId, reusableExecutionCtx, {
    sessionId: sessionKey,
    reportId,
    featureKey,
    targetYear: normalized.targetYear,
  });
  const reusableResponse = reusableExecution ? buildNewYearReusableExecutionResponse(reusableExecution, {
    sessionId: sessionKey,
    reportId,
    featureKey,
    targetYear: normalized.targetYear,
  }) : null;
  if (reusableResponse) return json(reusableResponse.payload, { status: reusableResponse.status });

  const cacheExecutionCtx = buildYearlySajuPdfCacheExecutionContext(reusableExecutionCtx, yearlySajuPdfCacheKey);
  const cachedReusableExecution = yearlySajuPdfCacheKey ? await findNewYearReusableExecution(env, auth.userId, cacheExecutionCtx, {
    sessionId: sessionKey,
    reportId,
    featureKey,
    targetYear: normalized.targetYear,
    cacheKey: yearlySajuPdfCacheKey,
  }) : null;
  const cachedReusableResponse = cachedReusableExecution ? buildNewYearReusableExecutionResponse(cachedReusableExecution, {
    sessionId: sessionKey,
    reportId,
    featureKey,
    targetYear: normalized.targetYear,
    cacheKey: yearlySajuPdfCacheKey,
  }) : null;
  if (cachedReusableResponse) return json(cachedReusableResponse.payload, { status: cachedReusableResponse.status });
  if (body?.preflightOnly || body?.lookupOnly) {
    return json({
      ok: true,
      serviceKey: SERVICE_KEY,
      status: "not_cached",
      requiresPayment: true,
      reportId,
      sessionId: sessionKey,
      targetYear: normalized.targetYear,
      cacheKey: yearlySajuPdfCacheKey,
    });
  }

  const lock = newYearPdfLocks.get(sessionKey);
  if (lock?.status === "running") {
    return json({
      ok: true,
      serviceKey: SERVICE_KEY,
      status: "running",
      sessionId: sessionKey,
      reportId,
      targetYear: normalized.targetYear,
      message: "동일 세션의 신년운세 PDF 생성이 이미 진행 중입니다.",
    }, { status: 202 });
  }
  if (lock?.status === "done" && lock?.result) {
    return json({
      ...lock.result,
      status: lock.result?.status || "completed",
      serverStatus: lock.result?.serverStatus || "completed",
      sessionId: sessionKey,
      fromCache: true,
    });
  }
  newYearPdfLocks.set(sessionKey, { status: "running", startedAtMs: Date.now() });
  let activeExecutionCtx = null;
  let lastProgress = normalizeNewYearProgress({ status: "pending", progress: 0 }, { reportId, sessionId: sessionKey, targetYear: normalized.targetYear });

  try {
    const premiumAccessToken = clean(request.headers.get("x-premium-access-token") || body?.premiumAccessToken || body?._premiumAccessToken || cookieValue(request, "cd_premium_access"));

    console.info("[NewYearPremiumPDF][PaymentVerificationStarted]", { featureKey, userId: auth.userId });
    let access;
    try {
      access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "sajuNewYear", {
        ...body,
        featureKey,
        reportType: "sajuNewYear",
        premiumAccessToken: premiumAccessToken || undefined,
        _accessRoute: "/api/saju-new-year/prepare",
      });
    } catch (error) {
      newYearPdfLocks.delete(sessionKey);
      const errorStatus = Number(error?.status || 500);
      const code = errorStatus === 403 ? "ENTITLEMENT_REQUIRED" : "ENTITLEMENT_CHECK_FAILED";
      const message = newYearPublicErrorMessage(code);
      const debugSafe = newYearDebugSafe(request, "prepare", {
        httpStatus: newYearErrorStatus(code, errorStatus),
        responseCode: code,
        responseMessage: message,
        featureKey,
        reportId,
        sessionId: sessionKey,
        accessVerified: false,
        isComingSoonBlocked: false,
        authFailureReason: errorStatus === 403 ? "feature_not_allowed" : "",
        missingFields: Array.isArray(error?.missing) ? error.missing : [],
        hasPaymentToken: Boolean(premiumAccessToken),
        causeMessage: clean(error?.message || error),
      });
      console.error("[NewYearPremiumPDF][EntitlementCheckFailed]", {
        featureKey,
        userId: auth.userId,
        message: clean(error?.message || error),
        debugSafe,
      });
      return json({
        ok: false,
        serviceKey: SERVICE_KEY,
        code,
        message,
        debugSafe,
      }, { status: newYearErrorStatus(code, errorStatus) });
    }
    if (!access?.ok) {
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const code = status === 401 ? "SESSION_INVALID" : (status === 402 || status === 403 ? "ENTITLEMENT_REQUIRED" : "ENTITLEMENT_CHECK_FAILED");
      const debugSafe = newYearDebugSafe(request, "prepare", {
        httpStatus: newYearErrorStatus(code, status),
        responseCode: code,
        responseMessage: newYearPublicErrorMessage(code),
        featureKey,
        reportId,
        sessionId: sessionKey,
        accessVerified: false,
        isComingSoonBlocked: false,
        authFailureReason: status === 403 ? "feature_not_allowed" : "",
        missingFields: Array.isArray(access?.missing) ? access.missing : [],
        hasPaymentToken,
        originalCode: clean(access?.code),
      });
      newYearPdfLocks.delete(sessionKey);
      return json({
        ok: false,
        serviceKey: SERVICE_KEY,
        code,
        message: newYearPublicErrorMessage(code),
        debugSafe: {
          ...debugSafe,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
        },
      }, { status: newYearErrorStatus(code, status) });
    }
    console.info("[NewYearPremiumPDF][PaymentVerificationPassed]", { featureKey, accessType: clean(access.accessType || "") });

    const baseExecutionCtx = buildPremiumExecutionContext({
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      userId: auth.userId,
      featureKey,
      sessionId: sessionKey,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    const executionCtx = buildYearlySajuPdfCacheExecutionContext(baseExecutionCtx, yearlySajuPdfCacheKey);
    activeExecutionCtx = executionCtx;
    const cachedPdfExecution = await findNewYearReusableExecution(env, auth.userId, executionCtx, {
      sessionId: sessionKey,
      reportId,
      featureKey,
      targetYear: normalized.targetYear,
      cacheKey: yearlySajuPdfCacheKey,
    });
    const cachedPdfResponse = cachedPdfExecution ? buildNewYearReusableExecutionResponse(cachedPdfExecution, {
      sessionId: sessionKey,
      reportId,
      featureKey,
      targetYear: normalized.targetYear,
      cacheKey: yearlySajuPdfCacheKey,
    }) : null;
    if (cachedPdfResponse) {
      newYearPdfLocks.delete(sessionKey);
      return json(cachedPdfResponse.payload, { status: cachedPdfResponse.status });
    }
    await resetNewYearFailedExecutionForRetry(env, auth.userId, executionCtx);
    const persistProgress = (progress) => {
      lastProgress = normalizeNewYearProgress(progress, {
        reportId,
        sessionId: sessionKey,
        targetYear: normalized.targetYear,
      });
      return updateNewYearExecutionProgress(env, auth.userId, executionCtx, lastProgress);
    };
    await startPremiumPdfExecution(env, auth.userId, executionCtx);
    await persistProgress({
      status: "pending",
      progress: 0,
      completedChapters: 0,
      totalChapters: NEW_YEAR_CHAPTERS.length,
      currentChapterNumber: 1,
      currentChapterTitle: "사주 명식과 대상 연도 데이터 정리",
      currentStep: "결제 확인 완료",
    });
    const executionLease = await acquireNewYearExecutionLease(env, auth.userId, executionCtx);
    if (!executionLease.ok && !executionLease.error) {
      newYearPdfLocks.delete(sessionKey);
      const progress = normalizeNewYearProgress(lastProgress, { status: "generating", reportId, sessionId: sessionKey, targetYear: normalized.targetYear });
      return json({
        ok: true,
        serviceKey: SERVICE_KEY,
        status: progress.status,
        serverStatus: progress.status,
        sessionId: sessionKey,
        reportId,
        targetYear: normalized.targetYear,
        progress,
        newYearPdfProgress: progress,
        data: { sessionId: sessionKey, reportId, targetYear: normalized.targetYear, status: progress.status, progress, newYearPdfProgress: progress },
        message: progress.currentStep || "동일 세션의 신년운세 PDF 생성이 이미 진행 중입니다.",
      }, { status: 202 });
    }

    const yearlySajuPdfConfig = getYearlySajuPdfConfig(env);
    await persistProgress({
      status: "pending",
      progress: 5,
      completedChapters: 0,
      totalChapters: NEW_YEAR_CHAPTERS.length,
      currentChapterNumber: 1,
      currentChapterTitle: "사주 명식과 대상 연도 데이터 정리",
      currentStep: "신년운세 리포트 준비 중입니다.",
    });

    console.info("[NewYearPremiumPDF][YearlySajuLlmPipelineStarted]", {
      targetYear: normalized.targetYear,
      sessionId: sessionKey,
      generationMode: yearlySajuPdfConfig.generationMode,
      provider: yearlySajuPdfConfig.provider,
      llmAssemblyOnly: true,
    });
    const pipelineResult = await generateSajuNewYearPremiumReport({
      env,
      normalized: cacheNormalized,
      userId: auth.userId,
      jobId: reportId,
      metadata: {
        featureKey,
        reportType: "sajuNewYear",
        sessionId: sessionKey,
        accessType: clean(access.accessType || "unknown"),
        cacheKey: yearlySajuPdfCacheKey,
        targetYear: normalized.targetYear,
      },
      onProgress: persistProgress,
    });
    const localYearSajuJson = pipelineResult.localYearSajuJson;
    const newYearMasterJson = pipelineResult.newYearMasterJson;
    const masterJsonValidation = pipelineResult.masterJsonValidation;
    const normalizedData = pipelineResult.normalizedData;
    const chapters = pipelineResult.chapters;
    const validation = pipelineResult.validation;
    const manuscriptSource = pipelineResult.manuscriptSource;
    const monthlyFortuneSections = pipelineResult.monthlyFortuneSections;
    const monthlyFortunes = pipelineResult.monthlyFortunes;
    const finalAdvice = pipelineResult.finalAdvice;
    const llmAssembly = pipelineResult.llmAssembly;
    const clientSummary = pipelineResult.clientSummary;
    const isMockLlm = pipelineResult.isMock === true || llmAssembly?.isMock === true || clean(pipelineResult.provider) === "mock";
    const externalCallsAllowed = isMockLlm ? false : pipelineResult.externalCallsAllowed === true;
    let pdfCompletionValidation = null;
    const generatedPdfReady = pipelineResult.pdfReady || buildPdfReadyPayloadLlmOnly(localYearSajuJson, chapters, {
      featureKey,
      reportType: "sajuNewYear",
      sessionId: sessionKey,
      accessType: clean(access.accessType || "unknown"),
      cacheKey: yearlySajuPdfCacheKey,
      manuscriptSource,
      llmAssembly,
      llmAssemblyOnly: true,
      fallbackUsed: false,
      externalCallsAllowed,
      generationMode: pipelineResult.generationMode,
      provider: pipelineResult.provider,
      modelName: pipelineResult.modelName,
      tokensUsed: Number(pipelineResult.tokensUsed || 0),
      cost: Number(pipelineResult.cost || 0),
      isMock: isMockLlm,
      promptVersion: pipelineResult.promptVersion,
      schemaVersion: pipelineResult.schemaVersion,
      qualityVersion: pipelineResult.qualityVersion,
      engineVersion: pipelineResult.engineVersion,
      finalAdvice,
      monthlyFortunes,
      qualityStatus: "passed",
      masterJsonValidation,
      normalizedData,
      monthlyFortuneSections,
      chapterPlan: pipelineResult.chapterPlan,
      chapterConfigVersion: pipelineResult.chapterConfigVersion,
    });
    const pdfReady = {
      ...generatedPdfReady,
      metadata: {
        ...((generatedPdfReady && generatedPdfReady.metadata) || {}),
        featureKey,
        reportType: "sajuNewYear",
        sessionId: sessionKey,
        accessType: clean(access.accessType || "unknown"),
        cacheKey: yearlySajuPdfCacheKey,
        manuscriptSource,
        llmAssembly,
        llmAssemblyOnly: true,
        fallbackUsed: false,
        externalCallsAllowed,
        generationMode: pipelineResult.generationMode,
        provider: pipelineResult.provider,
        modelName: pipelineResult.modelName,
        tokensUsed: Number(pipelineResult.tokensUsed || 0),
        cost: Number(pipelineResult.cost || 0),
        isMock: isMockLlm,
        promptVersion: pipelineResult.promptVersion,
        schemaVersion: pipelineResult.schemaVersion,
        qualityVersion: pipelineResult.qualityVersion,
        engineVersion: pipelineResult.engineVersion,
        finalAdvice,
        monthlyFortunes,
        qualityStatus: "passed",
        masterJsonValidation,
        normalizedData,
        monthlyFortuneSections,
        chapterPlan: pipelineResult.chapterPlan,
        chapterConfigVersion: pipelineResult.chapterConfigVersion,
      },
    };
    const finalTotalChars = chapters.reduce((acc, chapter) => acc + chapterTextLength(chapter), 0);
    console.info("[NewYearPremiumPDF][YearlySajuLlmPipelineCompleted]", {
      chapterCount: chapters.length,
      targetYear: localYearSajuJson.targetYear,
      totalChars: finalTotalChars,
      manuscriptSource,
      validationOk: validation.ok,
    });
    console.info("[NewYearPremiumPDF][FinalValidationPassed]", { chapterCount: chapters.length, manuscriptSource });
    const requestOrigin = new URL(request.url).origin;
    const archiveUrls = buildNewYearArchiveUrls(requestOrigin, reportId);
    const archiveUrl = archiveUrls.archiveUrl;

    console.info("[NewYearPremiumPDF][PDFArchivePrepareStarted]", { chapterCount: chapters.length });
    pdfReady.htmlUrl = archiveUrls.htmlUrl || archiveUrl;
    pdfReady.pdfUrl = archiveUrls.pdfUrl || archiveUrl;
    pdfReady.downloadUrl = archiveUrls.pdfUrl || archiveUrl;
    pdfReady.storageKey = `premium-archive:saju-new-year:${reportId}`;
    pdfReady.filename = buildNewYearPdfFilename(localYearSajuJson.targetYear, normalized?.profile?.name);
    pdfReady.htmlFilename = buildNewYearHtmlFilename(localYearSajuJson.targetYear, normalized?.profile?.name);
    pdfReady.mimeType = "application/pdf";
    pdfReady.contentType = "application/pdf";
    pdfReady.directDownloadUrl = archiveUrls.pdfUrl || archiveUrl;
    pdfReady.renderFormat = "pdf-archive";
    await updateNewYearExecutionProgress(env, auth.userId, executionCtx, {
      status: "rendering",
      progress: 95,
      completedChapters: chapters.length,
      totalChapters: chapters.length,
      currentChapterNumber: chapters.length,
      currentChapterTitle: "PDF 렌더링",
      currentStep: "PDF 렌더링 중입니다.",
      chapterCount: chapters.length,
    });
    pdfCompletionValidation = validateSajuNewYearPdfCompletionPayload({ pdfReady, chapters, requireDownloadUrl: true });
    if (!pdfCompletionValidation.ok) {
      throw Object.assign(new Error("신년운세 PDF 완료 검증을 통과하지 못했습니다. 원고를 보강한 뒤 다시 생성해 주세요."), {
        code: "PDF_RENDER_FAILED",
        status: 422,
      });
    }
    console.info("[NewYearPremiumPDF][PDFArchivePrepared]", { chapterCount: chapters.length, manuscriptSource, archiveUrl });

    const storedUrl = clean(
      pdfReady.downloadUrl
      || pdfReady.pdfUrl
      || pdfReady.htmlUrl,
    );
    if (!storedUrl) {
      throw Object.assign(new Error("신년운세 PDF 저장 URL 생성에 실패했습니다."), {
        code: "NEW_YEAR_PDF_URL_MISSING",
        status: 500,
      });
    }
    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource,
      llmAssembly,
      llmAssemblyOnly: true,
      fallbackUsed: false,
      externalCallsAllowed,
      generationMode: pipelineResult.generationMode,
      provider: pipelineResult.provider,
      promptVersion: pipelineResult.promptVersion,
      schemaVersion: pipelineResult.schemaVersion,
      qualityVersion: pipelineResult.qualityVersion,
      engineVersion: pipelineResult.engineVersion,
      version: pipelineResult.engineVersion,
      chapterConfigVersion: pipelineResult.chapterConfigVersion,
      chapterConfigSource: pipelineResult.chapterConfigSource,
      chapterPlan: pipelineResult.chapterPlan,
      chapterCount: chapters.length,
      targetYear: localYearSajuJson.targetYear,
      archive: {
        reportId,
        cacheKey: yearlySajuPdfCacheKey,
        reportType: "new_year",
        displayName: "사주 신년운세",
        title: `${clean(normalized?.profile?.name) || "사용자"}님의 ${String(localYearSajuJson.targetYear || "")}년 신년운세`,
        mode: "personal",
        birthName: clean(normalized?.profile?.name),
        summary: clean(chapters?.[0]?.categories?.[0]?.finalText || chapters?.[0]?.text || "", 1000),
        pdfUrl: storedUrl,
        htmlUrl: clean(pdfReady.htmlUrl),
        downloadUrl: clean(pdfReady.downloadUrl || storedUrl),
        chapters,
        localSajuJson: localYearSajuJson,
        normalizedData,
        monthlyFortuneSections,
        monthlyFortunes,
        finalAdvice,
        clientSummary,
        newYearMasterJson,
        masterJsonValidation,
        pdfCompletionValidation,
        pdfReady,
        llmAssembly,
        llmAssemblyOnly: true,
        fallbackUsed: false,
        externalCallsAllowed,
        generationMode: pipelineResult.generationMode,
        provider: pipelineResult.provider,
        promptVersion: pipelineResult.promptVersion,
        schemaVersion: pipelineResult.schemaVersion,
        qualityVersion: pipelineResult.qualityVersion,
        engineVersion: pipelineResult.engineVersion,
        version: pipelineResult.engineVersion,
        chapterConfigVersion: pipelineResult.chapterConfigVersion,
        chapterConfigSource: pipelineResult.chapterConfigSource,
        chapterPlan: pipelineResult.chapterPlan,
        canReopen: true,
        canDownload: true,
      },
      cacheKey: yearlySajuPdfCacheKey,
    });
    const completedProgress = normalizeNewYearProgress({
      status: "completed",
      progress: 100,
      completedChapters: chapters.length,
      totalChapters: chapters.length,
      currentChapterNumber: chapters.length,
      currentChapterTitle: "완료",
      currentStep: "신년운세 PDF가 완성되었습니다.",
      resultId: reportId,
      pdfUrl: storedUrl,
    }, { reportId, sessionId: sessionKey, targetYear: localYearSajuJson.targetYear });
    await updateNewYearExecutionProgress(env, auth.userId, executionCtx, completedProgress);

    const responseData = {
      reportId,
      featureKey,
      sessionId: sessionKey,
      reportType: "sajuNewYear",
      serviceKey: SERVICE_KEY,
      targetYear: localYearSajuJson.targetYear,
      chapterCount: chapters.length,
      finalChapterCount: chapters.length,
      manuscriptSource,
      calculationEngineUsed: true,
      localEngineUsed: false,
      llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed,
      fallbackUsed: false,
      writingPipeline: YEARLY_SAJU_PDF_CONFIG.templateVersion,
      assemblyVersion: ANNUAL_FORTUNE_ASSEMBLY_VERSION,
      engineVersion: ANNUAL_FORTUNE_ENGINE_VERSION,
      generationMode: YEARLY_SAJU_PDF_CONFIG.generationMode,
      provider: pipelineResult.provider,
      modelName: pipelineResult.modelName,
      promptVersion: pipelineResult.promptVersion,
      schemaVersion: pipelineResult.schemaVersion,
      qualityVersion: pipelineResult.qualityVersion,
      chapterConfigVersion: pipelineResult.chapterConfigVersion,
      chapterConfigSource: pipelineResult.chapterConfigSource,
      chapterPlan: pipelineResult.chapterPlan,
      cacheKey: yearlySajuPdfCacheKey,
      cacheHit: false,
      chapters,
      seed: { ...localYearSajuJson, chapters: undefined },
      newYearPayload: localYearSajuJson,
      localSajuJson: localYearSajuJson,
      normalizedData,
      monthlyFortuneSections,
      monthlyFortunes,
      finalAdvice,
      clientSummary,
      newYearMasterJson,
      masterJsonValidation,
      pdfReady,
      pdfCompletionValidation,
      pdfUrl: storedUrl,
      htmlUrl: clean(pdfReady.htmlUrl),
      downloadUrl: clean(pdfReady.downloadUrl || storedUrl),
      progress: completedProgress,
      newYearPdfProgress: completedProgress,
      canReopen: true,
      canDownload: true,
    };

    const responsePayload = {
      ok: true,
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      status: "completed",
      serverStatus: "completed",
      progress: completedProgress,
      newYearPdfProgress: completedProgress,
      qualityStatus: "passed",
      data: responseData,
      ...responseData,
    };

    newYearPdfLocks.set(sessionKey, { status: "done", startedAtMs: Date.now(), result: responsePayload, progress: completedProgress, reportId, sessionId: sessionKey });
    return json(responsePayload);
  } catch (error) {
    const executionCtx = activeExecutionCtx || buildPremiumExecutionContext({
      serviceKey: SERVICE_KEY,
      reportType: "sajuNewYear",
      userId: auth.userId,
      featureKey,
      sessionId: sessionKey,
      reportId,
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    const failedChapterNumber = Number(error?.chapterNumber || error?.details?.chapterNumber || lastProgress.currentChapterNumber || 0) || undefined;
    const failedChapterTitle = clean(error?.chapterTitle || error?.details?.chapterTitle || lastProgress.currentChapterTitle);
    const rawLlmError = clean(error?.rawLlmError || JSON.stringify(error?.details || {}), 2000);
    const failedProgress = normalizeNewYearProgress({
      ...lastProgress,
      status: "failed",
      progress: lastProgress.progress,
      currentChapterNumber: failedChapterNumber || lastProgress.currentChapterNumber,
      currentChapterTitle: failedChapterTitle || lastProgress.currentChapterTitle,
      failedChapterNumber,
      failedChapterTitle,
      errorCode: normalizeNewYearPdfErrorCode(error),
      errorMessage: clean(error?.message || "신년운세 PDF 생성에 실패했습니다."),
      currentStep: failedChapterNumber
        ? `신년운세 PDF 챕터 ${failedChapterNumber} 생성 중 문제가 발생했어요. 결제 내역은 확인되었으니 재결제 없이 다시 생성할 수 있습니다.`
        : "신년운세 PDF 생성 중 문제가 발생했어요. 결제 내역은 확인되었으니 재결제 없이 다시 생성할 수 있습니다.",
      rawLlmError,
      retryable: true,
    }, { reportId, sessionId: sessionKey, targetYear: normalized.targetYear });
    await updateNewYearExecutionProgress(env, auth.userId, executionCtx, { ...failedProgress, rawLlmError });
    await markNewYearExecutionFailedForRetry(env, auth.userId, executionCtx, { ...failedProgress, rawLlmError });
    const rawMessage = clean(error?.message || "신년운세 PDF 생성 중 오류가 발생했습니다.");
    console.error("[NewYearPremiumPDF][Error][prepare]", normalizeNewYearBookError(error));
    const userMessage = rawMessage.includes("생년월일")
      ? "생년월일 정보를 확인할 수 없습니다. 정확한 생년월일 정보를 입력해 주세요."
      : rawMessage.includes("원국") || rawMessage.includes("사주")
        ? "신년운세 계산에 필요한 사주 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : rawMessage.includes("결제")
          ? "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
          : rawMessage.includes("원고") || rawMessage.includes("품질")
            ? "신년운세 원고를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "신년운세 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return json({
      ok: false,
      serviceKey: SERVICE_KEY,
      code: normalizeNewYearPdfErrorCode(error),
      message: newYearPublicErrorMessage(normalizeNewYearPdfErrorCode(error)),
      debugSafe: {
        reportId,
        sessionId: sessionKey,
        originalCode: error?.code || "",
        stage: clean(error?.stage || "prepare"),
        status: newYearErrorStatus(normalizeNewYearPdfErrorCode(error), Number(error?.status || 500)),
        causeMessage: clean(error?.cause?.message || error?.cause || error?.message || ""),
        failedChapterNumber,
        failedChapterTitle,
        rawLlmError,
        retryableWithoutPayment: true,
        errors: Array.isArray(error?.errors) ? error.errors.slice(0, 12) : undefined,
      },
      progress: failedProgress,
      newYearPdfProgress: failedProgress,
    }, { status: newYearErrorStatus(normalizeNewYearPdfErrorCode(error), Number(error?.status || 500)) });
  }
}

async function handleChapters() {
  const targetYear = resolveDefaultTargetYear();
  const chapters = buildSajuNewYearChapterSpecs(targetYear);
  return json({ ok: true, serviceKey: SERVICE_KEY, targetYear, chapterCount: chapters.length, chapters });
}

async function handleStatus(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return newYearAuthFailureResponse(request, "status");
    }
    throw error;
  }

  const url = new URL(request.url);
  const path = getRoutePath(request, "/api/saju-new-year");
  const pathJobId = clean(String(path || "").replace(/^\/?status\/?/, ""));
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  const reportId = clean(url.searchParams.get("reportId") || url.searchParams.get("jobId") || pathJobId);
  if (!sessionId && !reportId) {
    return json({
      ok: false,
      serviceKey: SERVICE_KEY,
      code: "MISSING_STATUS_KEY",
      message: "신년운세 PDF 생성 상태 확인을 위해 sessionId 또는 reportId가 필요합니다.",
    }, { status: 422 });
  }

  const lock = sessionId
    ? newYearPdfLocks.get(sessionId)
    : Array.from(newYearPdfLocks.values()).find((item) => clean(item?.reportId) === reportId);
  if (lock?.result) return json(lock.result);
  if (lock) {
    const progress = normalizeNewYearProgress(lock.progress || {}, {
      status: lock.status === "done" ? "completed" : lock.status === "failed" ? "failed" : "generating",
      reportId: lock.reportId || reportId,
      sessionId: lock.sessionId || sessionId,
    });
    return json({
      ok: true,
      serviceKey: SERVICE_KEY,
      status: progress.status,
      serverStatus: progress.status,
      reportId: clean(lock.reportId || reportId),
      sessionId: clean(lock.sessionId || sessionId),
      progress,
      newYearPdfProgress: progress,
      data: {
        reportId: clean(lock.reportId || reportId),
        sessionId: clean(lock.sessionId || sessionId),
        status: progress.status,
        progress,
        newYearPdfProgress: progress,
        errorCode: progress.errorCode,
        errorMessage: progress.errorMessage,
      },
      message: progress.currentStep,
    });
  }

  await connectDb(withPdfFastDbEnv(env));
  const filters = [];
  if (sessionId) filters.push({ sessionId });
  if (reportId) filters.push({ reportId });
  const doc = filters.length
    ? await ServiceExecutionTransaction.findOne({ userId: auth.userId, reportType: "sajuNewYear", $or: filters }).sort({ updatedAt: -1, completedAt: -1, createdAt: -1 }).lean()
    : null;
  if (!doc) {
    const progress = normalizeNewYearProgress({ status: "pending", progress: 0 }, { reportId, sessionId });
    return json({
      ok: true,
      serviceKey: SERVICE_KEY,
      status: "pending",
      serverStatus: "pending",
      reportId,
      sessionId,
      progress,
      newYearPdfProgress: progress,
      data: { reportId, sessionId, status: "pending", progress, newYearPdfProgress: progress },
      message: "신년운세 PDF 생성 job을 준비하고 있습니다.",
    });
  }

  if (doc?.metadata?.newYearPdfJob?.id) {
    return json(buildNewYearPdfStatusPayload(doc.metadata.newYearPdfJob));
  }

  return json(buildNewYearStatusResponseFromExecution(doc, { reportId, sessionId }));
}

export async function handleSajuNewYearRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/saju-new-year");
    if (method === "GET" && (path === "/chapters" || path === "chapters")) return await handleChapters();
    if (method === "GET" && (path === "/status" || path === "status" || String(path || "").startsWith("/status/") || String(path || "").startsWith("status/"))) return await handleStatus(request, env);
    if (method === "GET" && (path === "/result" || path === "result" || String(path || "").startsWith("/result/") || String(path || "").startsWith("result/"))) return await handleResult(request, env);
    if (method === "POST" && (path === "/verify-access" || path === "verify-access")) return await handleVerifyAccess(request, env);
    if (method === "POST" && (path === "/create-job" || path === "create-job")) return await handleCreateJob(request, env);
    if (method === "POST" && (path === "/generate-mock" || path === "generate-mock")) return await handleGenerateMock(request, env);
    if (method === "POST" && (String(path || "").startsWith("/retry/") || String(path || "").startsWith("retry/"))) return await handlePrepare(request, env);
    if (method === "POST" && (path === "" || path === "/" || path === "/prepare" || path === "prepare")) return await handlePrepare(request, env);
    if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
    return json({ ok: false, serviceKey: SERVICE_KEY, message: "지원하지 않는 사주 신년운세 PDF 경로입니다." }, { status: 404 });
  } catch (error) {
    console.error("[NewYearBook][Error]", normalizeNewYearBookError(error));
    return handleRouteError(error, "SajuNewYearRoutes");
  }
}

export const __sajuNewYearTestUtils = {
  NEW_YEAR_CHAPTERS,
  YEARLY_SAJU_PDF_CONFIG,
  getYearlySajuPdfConfig,
  normalizeInput,
  buildPdfSeed,
  validateChapters,
  buildSajuNewYearChapterSpecs,
  validateSajuNewYearSeed,
  buildNewYearMasterJson,
  validateNewYearMasterJson,
  buildAnnualFortuneFacts,
  buildAnnualFortuneChapterPlans,
  ANNUAL_STEM_BLOCKS,
  ANNUAL_BRANCH_BLOCKS,
  ANNUAL_TEN_GOD_BLOCKS,
  YEARLY_CONTEXT_BLOCKS,
  buildYearlySajuNormalizedData,
  buildYearlySajuPdfCacheKey,
  buildYearlySajuPdfCacheExecutionContext,
  buildNewYearReusableExecutionResponse,
  selectYearlyInterpretationBlocks,
  normalizeYearlySajuInput,
  composeMonthlyFortuneTable,
  buildMonthlyFortuneSections,
  validateSajuNewYearPdfCompletionPayload,
  getNewYearCategoryRule,
  validateSajuNewYearCategoryCoverage,
  validateSajuNewYearSentenceDiversity,
  softenAnnualFortuneRiskText,
  validateSajuNewYearPdfQuality,
  stripForbiddenText,
  buildPdfReadyPayload: buildPdfReadyPayloadLlmOnly,
  buildPdfReadyPayloadLlmOnly,
  resolveNewYearChapterProviderPlan,
  generateNewYearPdfChapterContent,
  buildNewYearMockArchiveChapters,
  prepareSajuNewYearLlmChaptersForRender,
  generateSajuNewYearPremiumReport,
  buildNewYearArchiveUrls,
};
