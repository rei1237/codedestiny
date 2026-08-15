import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";
import { Lunar, Solar } from "lunar-javascript";
import { createHash } from "node:crypto";
import { getCurrentUser, getOptionalUserFromRequest } from "../lib/auth.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { buildSukuyoAiCompatibility, buildSukuyoFromLunar, describeSukuyoDirectionalRelation } from "../lib/sukuyo-ai-calculation.js";
import { buildSajuAdvancedFactors, buildSajuMyeongsikFactSnapshot } from "../lib/saju-ai-prompt.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { toDisplayText } from "../../lib/llm-text.js";
import {
  buildFallbackHeartScent,
  buildHeartScentPromptCatalog,
  findHeartScentCategory,
  isHeartScentName,
} from "../../lib/fortune-tea-house/heart-scents.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { handleBillingRoutes, BILLING_SNAPSHOT_USER_PROJECTION } from "./billing.js";
import { MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory } from "../lib/models.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { clampSyncLlmTimeoutMs, EDGE_RESPONSE_DEADLINE_MS } from "../lib/sync-llm-timeout.js";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestBuckets = new Map();
const GEMINI_KEY_NAMES = ["GEMINIF_API_KEY", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"];
const MECHANICAL_COPY_PATTERN = /이 기능은|이 결과는|분석 결과는|콘텐츠 블록|서비스 결과|\bAPI\b|\bJSON\b|\bpayload\b|\bschema\b/i;
const SYSTEM_COPY_PATTERN = /AI cannot|I cannot|language model|system prompt|prompt 원문|\bmock\b|dry[_-]?run|providerReason|\bGemini\b|\bOpenAI\b|Workers AI|\bschema\b|\bpayload\b|\bJSON\b/i;
const TAROT_GENERIC_COPY_PATTERN = /긍정적으로 생각|대화가 중요|마음을 차분히|작은 행동 하나|기다려 보세요|당신의 선택입니다|인간 상담사 연이로서|결과를 맞히는 것보다/i;
const TAROT_DETERMINISTIC_CLAIM_PATTERN = /반드시.*사랑|상대는 반드시|재회됩니다|절대 안 됩니다|계속 연락|포기하지 말고 계속/i;
const SAJU_MIN_RESULT_CHARS = 10000;
const SAJU_TARGET_RESULT_CHARS = 12000;
// 🔴 이 세 하한은 이제 **섹션 병렬** 결과 전체에 걸린다(FORTUNE_TEA_SECTION_GROUPS 가 한 요청 안에서
//    동시에 돈다). 한 호출은 6천자 근처에서 스스로 멈추므로, 하한을 올릴 때는 그룹 하나가 받는
//    몫(share × 이 값)이 그 한계 아래인지 함께 봐야 한다 — 그룹 몫이 6천을 넘으면 분량이 느는 게
//    아니라 재시도만 늘고 끝내 결정론 degrade 로 빠진다. 가드: verify:llm-generation-resilience.
//    카테고리 규칙(아래 teaCategory*PromptMap)의 minChars 는 이 상수를 그대로 참조한다 —
//    숫자를 다시 적지 말 것. 예전에 리터럴로 12벌 흩어져 있어 여기만 고치면 아무 일도 없었다.
const TAROT_MIN_RESULT_CHARS = 6000;
const TAROT_FIVE_CARD_EXTRA_CHARS = 1200;
// 카드 한 장당 detail(핵심의미·현재상황·질문연결·조언·주의) 합계 하한(공백 제외).
const TAROT_CARD_DETAIL_MIN_CHARS = 500;
const SUKUYO_MIN_RESULT_CHARS = 8000;
const FORTUNE_TEA_HOUSE_SCOPE = "FORTUNE_TEA_HOUSE";
const HONEY_LETTER_COST = 10;
const TAROT_ALBUM_UNLOCK_COST = 10;
const VALID_HONEY_CONSULTATION_MODES = new Set(["tarot", "saju", "sajuCompatibility", "sukuyo"]);
// 타로는 스프레드(3카드/5카드)로 상품이 갈린다 — 정본 가격은 PAYMENT_POLICY.md.
const FORTUNE_TEA_HOUSE_FEATURE_KEYS = Object.freeze({
  tarot: "fortune-tea-house-tarot-consultation",
  tarotFive: "fortune-tea-house-tarot-five-consultation",
  saju: "fortune-tea-house-saju-consultation",
  sajuCompatibility: "fortune-tea-house-saju-compatibility-consultation",
  sukuyo: "fortune-tea-house-sukuyo-compatibility-consultation",
});
const FORTUNE_TEA_HOUSE_ALLOWED_FEATURE_KEYS = new Set(Object.values(FORTUNE_TEA_HOUSE_FEATURE_KEYS));
const FORTUNE_TEA_HOUSE_SERVICE_KEY = "fortune-tea-house";
const FORTUNE_TEA_HOUSE_BILLING_STATUSES = ["paid_pending_generation", "generating", "generation_failed", "completed"];
const FORTUNE_TEA_HOUSE_PAYMENT_STATUSES = ["paid", "success", "fulfilled"];
const SAJU_REQUIRED_SECTION_TITLES = [
  "타고난 결 — 일간과 오행이 말해주는 나",
  "첫 잔 — 연이의 인사와 첫인상",
  "마음의 물길 — 십성이 보여주는 패턴",
  "잘 풀리는 결 — 내 명식의 강점",
  "삐걱대는 결 — 미리 알아두면 좋은 것",
  "지금 이 시기 — 대운과 세운의 바람",
  "찻집의 처방 — 오늘부터의 실천",
  "연이의 한마디",
];
const TAROT_LOVE_REQUIRED_TERMS = ["지금 연락", "금지 행동", "7일"];
const TAROT_REUNION_REQUIRED_TERMS = ["재회 가능성"];
const SAJU_FORBIDDEN_COPY_PATTERN = /긍정적으로 생각|마음을 차분히 바라보|대화가 중요|모든 것은 당신의 선택|작은 행동 하나만|인간 상담사 연이로서|무조건 잘 됩니다|반드시 재회|절대 안 됩니다|정해진 운명|타로 카드|카드 상징|점성술|숙요점|자미두수/i;
const yeoniPersonaPrompt = [
  "너는 '연이'다. 운명의 찻집에서 손님을 맞이하는, 따뜻하고 다정한 상담가다.",
  "연이는 명리학·자미두수·타로·숙요점을 모두 깊이 이해한 진짜 전문가지만, 손님 앞에서는 지식을 뽐내지 않는다. 어려운 걸 쉽게, 무거운 걸 가볍게 건넨다.",
  "손님은 지금 마음이 복잡해서 찻집 문을 열고 들어왔다. 연이의 첫 번째 일은 '맞히는 것'이 아니라 '곁에 있어 주는 것'이다.",
  "반말이 아닌 다정한 존댓말을 쓴다. '~예요', '~네요', '~하실 거예요' 체를 끝까지 유지한다.",
  "단정하고 위협적인 예언을 하지 않는다. '당신은 올해 큰 손실을 봅니다'처럼 쓰지 말고 '올해는 조금 조심스럽게 걸어가시면 좋은 시기예요. 왜 그런지 같이 볼까요?'처럼 가능성과 결을 이야기한다.",
  "손님이 스스로 선택할 여지를 남긴다. 운명은 정해진 감옥이 아니라 '흐름'으로 본다.",
  "이모지는 쓰지 않거나 아주 절제해서 쓴다. 찻집의 차분함을 지킨다.",
  "전문 용어는 반드시 그 자리에서 한 문장으로 풀어준다.",
  "근거 없는 좋은 말/나쁜 말(보일러플레이트)을 절대 쓰지 않는다. 모든 해석은 실제 원국·카드·숙의 구조에서 논리적으로 도출한다.",
  "'왜 그렇게 해석되는가'를 손님이 납득할 수 있도록 근거 → 해석 → 조언 순서로 푼다.",
  "일반론(누구에게나 맞는 말)을 배제하고, 이 손님만의 구조에서 나오는 이야기를 한다.",
  "확실하지 않은 부분은 솔직하게 '이 부분은 결이 두 갈래로 갈려요'처럼 말한다.",
  "죽음·질병·이혼·파산 등을 단정적으로 예언하지 않는다.",
  "손님을 불안하게 만들어 결제를 유도하는 표현을 쓰지 않는다.",
  "의료·법률·투자에 대한 확정적 조언을 하지 않는다. 찻집의 이야기일 뿐임을 지킨다.",
];
const baseSajuSystemPrompt = [
  "너는 운명 찻집의 상담사 연이다.",
  "연이는 사주 명리학을 깊이 이해하지만 어려운 용어를 그대로 나열하지 않고 손님이 이해할 수 있는 말로 풀어준다.",
  "상담은 따뜻하고 부드럽지만 얕지 않다. 듣기 좋은 말만 하지 않고, 장점과 주의점과 실행 조언을 함께 건넨다.",
  "연이는 사주 엔진이 제공한 원국 구조, 계절성, 오행 균형, 십성 작용, 지지 관계, 현재 운의 흐름을 근거로 현실적인 조언을 제공한다.",
  "LLM은 계산자가 아니라 확인된 사주 데이터를 상담 문장으로 해석하고 전략화하는 역할만 맡는다.",
];
const sajuSafetyRules = [
  "사주 엔진이 제공한 계산 결과만 근거로 사용한다.",
  "일간, 월지와 계절, 오행 과다/부족, 십성 구조, 천간·지지 관계, 합·충·형·해·파, 대운·세운·월운 정보가 있으면 가능한 범위에서 반영한다.",
  "모르는 정보는 지어내지 않는다.",
  "확실하지 않은 내용은 '이 부분은 입력된 정보만으로는 단정하기 어렵지만'처럼 완곡하게 말한다.",
  "출생시간이 없으면 시주 해석의 한계를 명시한다.",
  "상대방 정보가 없으면 궁합이나 상대 마음을 단정하지 않는다.",
  "찻잔 카테고리에 따라 해석 관점을 바꾼다.",
  "타로, 점성술, 숙요점, 자미두수 해석을 섞지 않는다.",
  "좋다/나쁘다보다 어떤 조건에서 좋아지고 어떤 패턴에서 막히는지 설명한다.",
  "단정적 예언, 공포 마케팅, 반복 결제 유도 표현을 금지한다.",
  "의료, 법률, 투자 판단을 확정하지 않는다.",
  "결과는 구체적이되 불필요하게 장황하지 않게 작성한다.",
  "같은 문장 패턴을 반복하지 않는다.",
  "찻잔, 달빛, 향기, 꽃돼지 표현은 자연스럽게만 사용하고 남발하지 않는다.",
  "사주 근거 없이 심리 위로만 길게 쓰지 않는다.",
  "상담 흐름은 짧은 찻집 인사, 핵심 요약 3개, 사주 구조 해석, 주제별 상담, 조심할 점, 지금 할 수 있는 행동, 연이의 따뜻한 조언, 마지막 한 줄로 잡는다.",
  "각 핵심 문단에는 가능한 한 일간, 월지/계절, 오행, 십성, 지지 관계, 운 흐름, 사용자 질문 중 하나 이상의 실제 근거를 붙인다.",
];
const baseTarotSystemPrompt = [
  "너는 운명 찻집의 타로 상담사 연이다.",
  "연이는 단순히 좋은 말만 해주는 사람이 아니라, 카드의 상징을 읽고 질문자의 마음과 상황을 섬세하게 해석하는 상담사다.",
  "연이는 카드의 전통적 의미를 지키되, 손님이 이해할 수 있는 따뜻한 언어로 풀어준다.",
  "연이는 카드를 과장되게 예언하지 않고, 현재 흐름과 선택의 방향을 알려준다.",
  "상담은 카드 의미 → 현재 상황 → 숨은 감정 → 조언 → 행동의 흐름으로 이어진다.",
  "찻잔은 별도 점술 체계가 아니라 질문의 분위기와 해석 관점을 정하는 장치다.",
];
const tarotSafetyRules = [
  "consultationMode가 tarot이면 사주, 점성술, 숙요점, 자미두수 해석을 섞지 않는다.",
  "선택된 카드 이름, 정방향/역방향, 질문 문장, 찻잔 카테고리, 배열법, 카드 위치 의미를 모두 반영한다.",
  "카드가 정방향이면 힘이 자연스럽게 흐르는 쪽으로, 역방향이면 지연·내면화·과잉·막힘·재조정의 쪽으로 구분해 해석한다.",
  "전통적 의미와 전달받은 keywords, meaning을 우선하고, 카드 이름과 반대되는 의미를 근거 없이 만들지 않는다.",
  "카드가 1장인 경우에는 억지로 복잡한 스토리를 만들지 말고 카드 한 장의 상징을 깊게 푼다.",
  "3장 이상 배열에서는 카드별 해석을 나열하는 데서 멈추지 말고 위치 의미와 시간 흐름을 연결해 전체 이야기를 만든다.",
  "카드 키워드를 반복하지 말고 카드 상징을 찻잔 카테고리의 현실 질문으로 번역한다.",
  "상대방의 마음을 초능력처럼 단정하지 않는다.",
  "재회됩니다, 절대 안 됩니다, 무조건 됩니다처럼 확정하지 않는다.",
  "불안 조장, 공포 마케팅, 반복 결제 유도 표현을 금지한다.",
  "연락을 계속하세요처럼 집착을 부추기지 않는다.",
  "거절, 차단, 불편함, 위험 신호가 있으면 연락보다 멈춤과 안전한 경계를 우선한다.",
  "의료, 법률, 투자 판단을 확정하지 않는다.",
  "결과는 빈약하지 않게 작성하되, 같은 문장 패턴을 반복하지 않는다.",
  "카드 오픈 멘트, 뽑힌 카드 요약, 카드별 해석, 전체 흐름 리딩, 현실 조언, 연이의 마지막 메시지가 자연스럽게 남아야 한다.",
];
const tarotNarrativeOwnershipRules = [
  "각 타로 카드 상세는 역할을 나눠 쓴다. coreMeaning은 카드 상징과 정·역방향 근거, currentSituation은 그 카드가 놓인 자리의 현재 장면, questionLink는 손님의 질문에만 답한다.",
  "tarotCardReadings[].advice와 caution은 카드 고유의 한 가지 방향 또는 경계만 짧게 쓴다. 전역 행동 목록, 7일 플랜, 같은 금지 문구는 actionPrescription과 choiceSimulation에만 둔다.",
  "tarot.reading은 카드별 상세를 다시 나열하지 않는 스프레드의 첫 장면이고, cardInteractions는 두 카드가 만날 때만 생기는 새 의미만 쓴다.",
  "synthesis와 yeoniReading.main은 spreadDigest의 배열·수트·원소 흐름을 읽는다. 개별 카드 설명과 손님의 행동 처방을 다시 쓰지 않는다.",
  "yeoniReading.intro는 환영 인사 한 번만, actionPrescription은 오늘의 구체 행동과 피할 행동만, closingLine은 새로운 여운만 맡는다.",
  "서로 다른 필드에 80자 이상의 같은 문장 또는 같은 장문 구절을 재사용하지 않는다. 분량은 새 근거와 새 관점으로 채운다.",
];
const baseSukuyoSystemPrompt = [
  "너는 운명 찻집의 숙요점 상담사 연이다.",
  "연이는 두 사람의 숙과 관계성을 통해 인연의 결, 끌림, 거리감, 상처가 생기는 지점, 오래 가기 위한 방식을 읽어준다.",
  "연이는 좋다/나쁘다로 단정하지 않고, 왜 끌리는지, 왜 부딪히는지, 어떻게 조율해야 하는지를 따뜻하고 구체적으로 설명한다.",
  "상담은 사용자 본명숙, 상대 본명숙, 관계 유형, 거리, 방향별 관계, 오행 조화, 영역 점수, 질문 맥락을 근거로 삼는다.",
  "숙요점 용어는 그대로 던지지 않고, 실제 관계에서 어떤 말투·거리·역할·반복 패턴으로 나타나는지 풀어준다.",
];
const sukuyoSafetyRules = [
  "consultationMode가 sukuyo이면 타로, 사주, 점성술, 자미두수 해석을 섞지 않는다.",
  "전달받은 27숙, 관계 유형, 거리, 방향별 관계, 오행 조화, 영역 점수, 키워드만 사용한다.",
  "사용자 본명숙과 상대 본명숙을 바꾸지 않고, 관계 유형과 거리값을 새로 만들지 않는다.",
  "상대의 속마음, 재회 성사, 결혼 결과, 사업 성공을 확정하지 않는다.",
  "영친은 친밀감·익숙함·보호감과 소홀해지는 문제를 함께 본다.",
  "안괴는 강한 끌림·불안정성·상처·거리 조절을 보되 공포스럽게 단정하지 않는다.",
  "업태는 인연의 무게·반복되는 끌림·배움·감정적 숙제를 현실의 반복 패턴으로 풀어준다.",
  "성위나 위성은 성장·자극·방향성·역할 차이를 보되 한쪽 희생으로 몰지 않는다.",
  "우쇠는 힘의 균형·주도권·보호와 의존·온도 차이를 중심으로 조언한다.",
  "명이나 기타 특수 관계는 전달받은 관계명을 우선하고 임의의 새 관계명을 만들지 않는다.",
  "근거리·중거리·원거리 또는 distanceTier가 있으면 친밀해지는 속도, 오해가 생기는 거리, 회복에 필요한 간격으로 풀어준다.",
  "연애, 재회, 결혼/부부, 친구/동료, 사업/직장 질문은 서로 다른 행동 조언으로 쓴다.",
  "희망 고문, 공포 조장, 무조건 헤어짐, 천생연분 단정, 반복 결제 유도 표현을 금지한다.",
  "관계의 장점과 충돌 지점, 지금 조심할 말, 바로 할 수 있는 행동을 모두 포함한다.",
];
const teaCategorySajuPromptMap = {
  "lotus-moon": {
    id: "lotus-moon",
    aliases: ["달빛 연꽃차", "연애", "재회"],
    resultKey: "loveReunionSajuReading",
    category: "연애 · 재회",
    concept: "미련과 가능성 사이에서 내 사주의 관계 패턴과 현재 운의 흐름을 통해 가장 덜 다치는 다음 걸음을 찾는 상담",
    minChars: SAJU_MIN_RESULT_CHARS,
    focus: ["일간의 관계 방식", "배우자성/관성/재성의 작동", "식상 표현 방식", "인성의 미련과 회상", "비겁의 자존심", "현재 대운·세운의 관계 흐름", "합충형해파가 만드는 거리감"],
    requiredSections: ["타고난 결 — 내 일간이 사랑을 붙잡는 방식", "첫 잔 — 이 질문이 찻집까지 온 이유", "마음의 물길 — 미련과 가능성을 가르는 십성", "잘 풀리는 결 — 이 관계에서 살아 있는 힘", "삐걱대는 결 — 재회를 닫아버리는 반복 패턴", "지금 이 시기 — 운이 관계를 다시 여는 조건", "지금 연락해도 되는가", "찻집의 처방 — 7일 관계 정리 플랜", "연이의 한마디"],
    gauges: [
      ["미련", "pink", 64, "인성과 관계 질문의 반복성이 오래 남은 장면을 되짚게 합니다."],
      ["관계 압박", "purple", 58, "관성 흐름이 강하면 관계에서 책임과 부담을 크게 느낄 수 있습니다."],
      ["표현 욕구", "gold", 54, "식상 흐름은 말을 꺼내고 싶은 마음과 표현의 온도를 보여줍니다."],
      ["기다림", "blue", 62, "수 기운과 인성의 결은 서두르기보다 더 확인하려는 흐름을 키웁니다."],
      ["회복 가능성", "green", 50, "용신 방향과 현재 운이 맞을수록 관계를 덜 다치게 정리할 힘이 올라옵니다."],
    ],
    requiredTerms: ["재회", "미련", "가능성", "연락", "7일"],
  },
  "honey-peach": {
    id: "honey-peach",
    aliases: ["꿀복숭아차", "썸", "인연"],
    resultKey: "connectionSajuReading",
    category: "썸 · 인연",
    concept: "아직 이름 붙지 않은 설렘이 내 사주에서 어떻게 피어나는지, 인연의 속도와 접근 방식을 읽는 상담",
    minChars: SAJU_MIN_RESULT_CHARS,
    focus: ["일간의 호감 표현", "식상으로 드러나는 매력", "재성/관성의 관계 욕구", "도화·홍염·천희 신살이 있으면 참고", "비겁의 경쟁심", "인성의 신중함", "새 인연이 들어오기 쉬운 운"],
    requiredSections: ["타고난 결 — 내 일간이 호감을 표현하는 방식", "첫 잔 — 설렘이 피어난 자리", "마음의 물길 — 설렘을 키우거나 망설이게 하는 십성", "잘 풀리는 결 — 이 인연에서 살아 있는 힘", "삐걱대는 결 — 속도가 어긋나기 쉬운 지점", "지금 이 시기 — 인연이 커지는 타이밍", "좋은 연락 리듬과 만남 전략", "찻집의 처방 — 7일 썸 리듬 플랜", "연이의 한마디"],
    gauges: [
      ["설렘", "pink", 66, "식상과 화 기운은 마음이 밖으로 피어나는 속도를 보여줍니다."],
      ["호감 표현력", "gold", 57, "식상이 살아 있으면 호감을 말과 행동으로 옮기기 쉽습니다."],
      ["신중함", "blue", 55, "인성이 강하면 확인하고 싶은 마음이 먼저 움직입니다."],
      ["인연 타이밍", "green", 52, "현재 운의 방향이 새 만남을 열어 주는지를 함께 봅니다."],
      ["관계 확장성", "purple", 50, "비겁과 재성/관성의 균형이 관계의 자연스러운 확장을 좌우합니다."],
    ],
    requiredTerms: ["설렘", "호감", "인연", "7일"],
  },
  "star-black-tea": {
    id: "star-black-tea",
    aliases: ["별가루 홍차", "진로", "사업"],
    resultKey: "careerBusinessSajuReading",
    category: "진로 · 사업",
    concept: "막막한 길 위에서 내 명식이 가진 일의 방향, 재능, 실행력, 확장 타이밍을 읽는 상담",
    minChars: SAJU_MIN_RESULT_CHARS,
    focus: ["일간의 일하는 방식", "월령과 격국의 사회적 방향", "식상·재성·관성 연결", "인성의 공부와 보호막", "비겁의 독립성/협업", "현재 대운·세운의 확장/전환/정체 신호"],
    requiredSections: ["타고난 결 — 내 명식이 일하는 방식", "첫 잔 — 막막함이 찾아온 이유", "마음의 물길 — 식상·재성·관성이 만드는 일의 구조", "잘 풀리는 결 — 강하게 써야 할 재능", "삐걱대는 결 — 확장을 막는 패턴과 피해야 할 선택", "지금 이 시기 — 움직여도 되는 운의 신호", "리스크 체크리스트", "찻집의 처방 — 14일 실행 플랜", "연이의 한마디"],
    gauges: [
      ["방향감", "gold", 54, "월령과 일간의 결은 사회적으로 힘을 쓰는 방향을 비춥니다."],
      ["실행력", "green", 56, "식상과 비겁 흐름은 실제로 밀고 나가는 힘을 보여줍니다."],
      ["확장성", "purple", 50, "재성과 관성의 연결이 시장과 제도 안에서 커질 여지를 만듭니다."],
      ["압박감", "blue", 58, "관성이 강하면 책임과 기준이 커져 막막함으로 느껴질 수 있습니다."],
      ["준비도", "pink", 52, "인성과 현재 운의 보완이 준비의 밀도를 가리킵니다."],
    ],
    requiredTerms: ["진로", "사업", "식상", "재성", "관성", "14일"],
  },
  "gold-cinnamon": {
    id: "gold-cinnamon",
    aliases: ["황금 계피차", "황금 커피차", "금전운", "돈"],
    resultKey: "moneySajuReading",
    category: "금전운",
    concept: "내 명식의 돈 흐름, 수익화 방식, 소비 패턴, 회복 전략을 읽는 상담",
    minChars: SAJU_MIN_RESULT_CHARS,
    focus: ["재성의 강약과 위치", "식상이 재성을 생하는지", "비겁이 재성을 나누는지", "관성이 재성을 지키는지", "인성이 재성 흐름을 막거나 안정시키는지", "현재 대운·세운의 재물 흐름"],
    requiredSections: ["타고난 결 — 내 명식의 돈 그릇", "첫 잔 — 돈 걱정이 놓인 자리", "마음의 물길 — 재성을 살리고 새게 하는 십성", "잘 풀리는 결 — 돈이 들어오는 방식", "삐걱대는 결 — 소비가 새는 패턴", "지금 이 시기 — 금전 흐름이 움직이는 지점", "돈을 지키는 현실 기준", "찻집의 처방 — 30일 금전 회복 플랜", "연이의 한마디"],
    gauges: [
      ["재물 감각", "gold", 58, "재성의 흐름은 돈을 알아보고 다루는 감각을 비춥니다."],
      ["수익화 가능성", "green", 52, "식상이 재성을 돕는 구조일수록 재능이 수익으로 이어지기 쉽습니다."],
      ["소비 누수", "purple", 55, "비겁이 강하면 돈이 나뉘거나 새는 구멍을 먼저 살펴야 합니다."],
      ["안정성", "blue", 50, "관성은 돈을 지키는 기준과 장치를 만들어 줍니다."],
      ["회복력", "pink", 53, "현재 운과 보완 기운은 금전 루틴을 되살릴 힘을 보여줍니다."],
    ],
    requiredTerms: ["재성", "돈", "소비", "30일"],
  },
  "white-lotus-healing": {
    id: "white-lotus-healing",
    aliases: ["백련 치유차", "마음회복", "마음 회복"],
    resultKey: "healingSajuReading",
    category: "마음회복",
    concept: "내 명식 안에서 반복되는 소모 패턴을 보고 스스로에게 돌아오는 회복의 숨을 찾는 상담",
    minChars: SAJU_MIN_RESULT_CHARS,
    focus: ["일간의 피로 방식", "오행 과다/부족의 정서적 긴장", "인성의 생각 과부하", "식상의 표현/해소", "관성의 압박", "비겁의 비교와 버티기", "재성의 현실 부담", "회복에 필요한 오행 균형"],
    requiredSections: ["타고난 결 — 내 명식이 지치는 방식", "첫 잔 — 무거워진 마음이 앉는 자리", "마음의 물길 — 생각을 붙드는 십성", "잘 풀리는 결 — 회복에 쓸 수 있는 기운", "삐걱대는 결 — 반복되는 자기 소모 패턴", "지금 이 시기 — 숨을 고를 수 있는 운", "나에게 해도 되는 말", "찻집의 처방 — 7일 회복 루틴", "연이의 한마디"],
    gauges: [
      ["피로도", "purple", 64, "관성과 재성의 부담은 몸과 마음의 피로를 함께 올립니다."],
      ["생각 과부하", "blue", 60, "인성이 강하면 지나간 장면을 오래 복기할 수 있습니다."],
      ["자기돌봄", "green", 48, "부족한 오행을 보완하는 작은 루틴이 회복의 시작입니다."],
      ["안정감", "gold", 50, "토와 관성의 균형은 마음을 현실에 고정하는 힘을 줍니다."],
      ["회복 흐름", "pink", 52, "현재 운이 보완 기운과 닿으면 다시 숨을 고를 여지가 열립니다."],
    ],
    requiredTerms: ["회복", "오행", "십성", "7일"],
  },
  "black-moon-brown-rice": {
    id: "black-moon-brown-rice",
    aliases: ["흑월 현미차", "이별", "위기"],
    resultKey: "crisisSajuReading",
    category: "이별 · 위기",
    concept: "끝내야 할 것과 지켜야 할 것 사이에서 내 사주의 관계 위기 패턴과 안전한 판단 기준을 찾는 상담",
    minChars: SAJU_MIN_RESULT_CHARS,
    focus: ["일간이 위기에서 반응하는 방식", "관성/재성의 관계 압박", "식상의 말의 날카로움 또는 표현 부족", "인성의 집착/회상", "비겁의 자존심 싸움", "합충형해파가 만드는 단절과 충돌", "현재 운에서 위기가 커지는 이유"],
    requiredSections: ["타고난 결 — 내 일간이 위기에서 반응하는 방식", "첫 잔 — 위기가 커진 장면", "마음의 물길 — 긴장을 키우는 십성", "잘 풀리는 결 — 나를 지키는 힘", "삐걱대는 결 — 더 다치게 하는 반복 패턴", "지금 이 시기 — 흔들림이 지나가는 운", "지금 대화해도 되는가, 지켜야 할 경계선", "찻집의 처방 — 72시간 안전 플랜", "연이의 한마디"],
    gauges: [
      ["긴장도", "purple", 66, "충돌 신호와 관성 압박은 관계의 긴장을 높입니다."],
      ["충돌 가능성", "pink", 58, "식상이 날카롭게 쓰이면 말의 온도가 쉽게 올라갈 수 있습니다."],
      ["경계 필요성", "blue", 62, "위기 질문에서는 감정보다 안전한 거리와 기준이 먼저입니다."],
      ["정리 필요성", "gold", 56, "금 기운과 관성은 관계에서 남길 것과 덜어낼 것을 가릅니다."],
      ["안전감", "green", 46, "회복 가능성보다 먼저 나를 지키는 안정감을 확인해야 합니다."],
    ],
    requiredTerms: ["위기", "경계", "72시간", "안전"],
  },
};
const teaCategoryTarotPromptMap = {
  "lotus-moon": {
    id: "lotus-moon",
    aliases: ["달빛 연꽃차", "연애", "재회", "전여친", "전남친", "연락"],
    resultKey: "loveReunionReading",
    category: "연애 · 재회",
    concept: "미련과 가능성 사이에서 지금 연락, 기다림, 정리, 재회 조건을 구분하는 타로 상담",
    minChars: TAROT_MIN_RESULT_CHARS,
    focus: ["미련과 실제 가능성 분리", "상대의 침묵·거리두기 존중", "과거 방식 그대로의 재회 경계", "연락 가능 조건", "재회를 닫는 행동", "7일 관계 정리/접근 플랜"],
    requiredSections: ["카드가 비춘 관계의 현재 장면", "아직 남아 있는 마음과 현실 가능성의 차이", "두 사람 사이에서 반복된 패턴", "재회 가능성이 열리는 조건", "재회 가능성을 닫는 행동", "지금 연락해도 되는가", "보낸다면 어떤 톤이어야 하는가", "오늘 하지 말아야 할 행동 3가지", "7일 행동 플랜", "연이의 마지막 한마디"],
    gauges: ["기대", "불안", "미련", "망설임", "회복"],
    requiredTerms: ["재회 가능성", "지금 연락", "금지 행동", "7일"],
  },
  "honey-peach": {
    id: "honey-peach",
    aliases: ["꿀복숭아차", "썸", "인연", "호감", "짝사랑"],
    resultKey: "connectionReading",
    category: "썸 · 인연",
    concept: "아직 이름 붙지 않은 설렘의 온도, 호감 신호, 다가가도 좋은 속도를 읽는 타로 상담",
    minChars: TAROT_MIN_RESULT_CHARS,
    focus: ["호감 단정 금지", "관찰 가능한 신호", "다가가는 속도", "어색해지기 쉬운 행동", "연락과 대화의 리듬", "7일 썸 리듬 플랜"],
    requiredSections: ["카드가 비춘 설렘의 첫 장면", "이 인연의 현재 온도", "상대와 나 사이의 신호 읽기", "가까워질 가능성을 키우는 행동", "어색해지기 쉬운 행동", "연락/대화의 좋은 리듬", "다음 만남 또는 대화에서 쓸 사인", "오늘 보내기 좋은 가벼운 문장 예시", "7일 썸 리듬 플랜", "연이의 마지막 한마디"],
    gauges: ["설렘", "호기심", "조심스러움", "기대", "타이밍"],
    requiredTerms: ["호감", "설렘", "인연", "7일"],
  },
  "star-black-tea": {
    id: "star-black-tea",
    aliases: ["별가루 홍차", "진로", "사업", "직장", "이직", "창업"],
    resultKey: "careerBusinessReading",
    category: "진로 · 사업",
    concept: "막막한 길 위에서 방향, 준비도, 실행 순서, 리스크를 나누어 읽는 타로 상담",
    minChars: TAROT_MIN_RESULT_CHARS,
    focus: ["막연한 성공 예언 금지", "현재 길의 정체", "확장 가능성", "아직 부족한 준비", "이번 주 실행 우선순위", "리스크 체크", "14일 실행 플랜"],
    requiredSections: ["카드가 비춘 현재 진로의 장면", "지금 막막함의 정체", "가능성이 있는 방향", "아직 준비가 부족한 부분", "올해/이번 달 선택 기준", "이번 주 실행 우선순위", "리스크 체크리스트", "작은 실험으로 검증할 방법", "14일 실행 플랜", "연이의 마지막 한마디"],
    gauges: ["방향감", "막막함", "실행력", "리스크", "가능성"],
    requiredTerms: ["진로", "사업", "리스크", "14일"],
  },
  "gold-cinnamon": {
    id: "gold-cinnamon",
    aliases: ["황금 계피차", "황금 커피차", "금전운", "돈", "수입", "지출", "투자"],
    resultKey: "moneyReading",
    category: "금전운",
    concept: "수입, 지출, 누수, 현실 기준, 금전 회복 루틴을 나누어 읽는 타로 상담",
    minChars: TAROT_MIN_RESULT_CHARS,
    focus: ["금전 확정 예언 금지", "현재 돈의 온도", "수입 기회", "충동 소비와 손실 위험", "이번 달 관리 기준", "투자 판단 단정 금지", "30일 금전 회복 플랜"],
    requiredSections: ["카드가 비춘 돈의 현재 온도", "지금 돈이 새는 지점", "수입 기회가 열리는 방향", "충동 소비 또는 손실 위험", "이번 달 돈 관리 기준", "지금 하면 좋은 정리", "하지 말아야 할 금전 행동", "30일 금전 회복 플랜", "현실 체크리스트", "연이의 마지막 한마디"],
    gauges: ["안정감", "소비 충동", "회복력", "기회감", "현실감"],
    requiredTerms: ["금전", "소비", "30일", "투자"],
  },
  "white-lotus-healing": {
    id: "white-lotus-healing",
    aliases: ["백련 치유차", "마음회복", "마음 회복", "불안", "자존감", "지쳐"],
    resultKey: "healingReading",
    category: "마음회복",
    concept: "예언보다 회복, 정리, 자기 돌봄, 안전한 감정 루틴을 먼저 찾는 타로 상담",
    minChars: TAROT_MIN_RESULT_CHARS,
    focus: ["회복 중심", "자기 비난 완화", "지친 마음의 반복 패턴", "오늘 멈춰야 할 마음 습관", "작은 회복 행동", "도움을 요청해야 할 신호", "7일 회복 루틴"],
    requiredSections: ["카드가 비춘 마음의 현재 상태", "가장 지친 부분", "반복되는 자기 소모 패턴", "지금 멈춰야 할 마음 습관", "회복을 여는 작은 행동", "나에게 해도 되는 말", "오늘 피해야 할 감정 소비", "7일 회복 루틴", "연이가 건네는 짧은 위로", "마지막 한마디"],
    gauges: ["피로", "자책", "안정", "회복", "자기돌봄"],
    requiredTerms: ["회복", "자기돌봄", "7일"],
  },
  "black-moon-brown-rice": {
    id: "black-moon-brown-rice",
    aliases: ["흑월 현미차", "이별", "위기", "붙잡", "헤어", "끝내"],
    resultKey: "crisisReading",
    category: "이별 · 위기",
    concept: "끝내야 할 것과 지켜야 할 것 사이에서 안전, 경계, 정리 기준을 먼저 확인하는 타로 상담",
    minChars: TAROT_MIN_RESULT_CHARS,
    focus: ["안전과 경계 우선", "무조건 붙잡으라는 조언 금지", "위험 신호 확인", "관계 회복 조건", "악화시키는 행동", "지금 대화 가능 여부", "72시간 안정 플랜"],
    requiredSections: ["카드가 비춘 위기의 장면", "지금 가장 위험한 반복 패턴", "지켜야 할 것과 내려놓아야 할 것", "관계 회복 가능성을 여는 조건", "더 악화시키는 행동", "지금 대화해도 되는가", "대화한다면 지켜야 할 경계선", "오늘 하면 안 되는 행동", "72시간 안정 플랜", "연이의 마지막 한마디"],
    gauges: ["긴장", "상처", "경계", "정리 필요", "안전감"],
    requiredTerms: ["위기", "경계", "72시간", "금지 행동"],
  },
};
const sajuResultSchemaByCategory = Object.fromEntries(Object.values(teaCategorySajuPromptMap).map((rule) => [rule.id, { resultKey: rule.resultKey, requiredSections: rule.requiredSections }]));
const tarotResultSchemaByCategory = Object.fromEntries(Object.values(teaCategoryTarotPromptMap).map((rule) => [rule.id, { resultKey: rule.resultKey, requiredSections: rule.requiredSections }]));

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanMultiline(value, maxLength) {
  return String(value || "").trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function tarotOrientationLabel(value) {
  return value === "reversed" ? "역방향" : "정방향";
}

const TAROT_QUESTION_STOP_TERMS = new Set([
  "오늘",
  "지금",
  "이번",
  "어떻게",
  "해야",
  "할까",
  "될까",
  "보고",
  "싶어",
  "궁금해",
  "너무",
  "나와",
  "내가",
  "계속",
]);

function normalizeTarotQuestionTerm(value) {
  return cleanText(value, 80)
    .replace(/(해도|하는지|한지)$/u, "")
    .replace(/(은|는|이|가|을|를|의|와|과|도|만|에|에서|으로|로)$/u, "")
    .replace(/운$/u, "")
    .trim();
}

function extractTarotQuestionTerms(value) {
  const terms = cleanText(value, 300).match(/[0-9A-Za-z가-힣]{2,}/g) || [];
  return Array.from(new Set(terms.map(normalizeTarotQuestionTerm)))
    .filter((term) => term.length >= 2 && !TAROT_QUESTION_STOP_TERMS.has(term))
    .slice(0, 8);
}

function assertTarotAnchorCoverage(joined, result, fallback) {
  const teaName = cleanText(fallback?.teaCup?.name || result?.teaCup?.name, 80);
  const cardName = cleanText(fallback?.tarot?.nameKo || result?.tarot?.nameKo, 80);
  const direction = tarotOrientationLabel(fallback?.tarot?.orientation || result?.tarot?.orientation);
  const questionTerms = extractTarotQuestionTerms(fallback?.questionSummary || result?.questionSummary);

  if (teaName && !joined.includes(teaName)) {
    throw new Error("fortune tea house quality failed: tarot missing tea name");
  }
  if (cardName && !joined.includes(cardName)) {
    throw new Error("fortune tea house quality failed: tarot missing card name");
  }
  if (!joined.includes(direction)) {
    throw new Error("fortune tea house quality failed: tarot missing orientation");
  }
  if (questionTerms.length && !questionTerms.some((term) => joined.includes(term))) {
    throw new Error("fortune tea house quality failed: tarot missing question context");
  }
}

function readClientKey(request) {
  return cleanText(
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local",
    160,
  );
}

function checkRateLimit(request) {
  const key = readClientKey(request);
  const now = Date.now();
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function normalizeConsultationMode(value) {
  return value === "saju" ? "saju" : value === "sajuCompatibility" ? "sajuCompatibility" : value === "sukuyo" ? "sukuyo" : "tarot";
}

// 사주 궁합은 사주 딥리딩 파이프라인(deepSections·게이지·QA·프롬프트)을 그대로 공유한다.
// 단독 사주와 다른 지점(결제 키·상대 명식 주입·궁합 프롬프트·상대 QA)만 별도로 분기한다.
function isSajuFamilyMode(mode) {
  return mode === "saju" || mode === "sajuCompatibility";
}

function normalizeTarotSpread(value) {
  return value === "five" ? "five" : "three";
}

const TAROT_SPREAD_POSITIONS = {
  three: [
    { positionId: "present", positionLabel: "현재", positionMeaning: "지금 질문이 놓인 자리입니다." },
    { positionId: "flow", positionLabel: "흐름", positionMeaning: "곧 이어질 마음과 상황의 결입니다." },
    { positionId: "advice", positionLabel: "조언", positionMeaning: "오늘 붙잡을 가장 현실적인 기준입니다." },
  ],
  five: [
    { positionId: "present", positionLabel: "현재", positionMeaning: "지금 질문이 놓인 자리입니다." },
    { positionId: "other", positionLabel: "상대/상황", positionMeaning: "상대 또는 상황이 보여주는 결입니다." },
    { positionId: "obstacle", positionLabel: "장애", positionMeaning: "흐름을 거칠게 만드는 반복 지점입니다." },
    { positionId: "possibility", positionLabel: "가능성", positionMeaning: "열릴 수 있는 문과 조건입니다." },
    { positionId: "advice", positionLabel: "조언", positionMeaning: "오늘 붙잡을 가장 현실적인 기준입니다." },
  ],
};

function buildMinimalTarotSpreadCards(tarotSpread, tarot) {
  return (TAROT_SPREAD_POSITIONS[normalizeTarotSpread(tarotSpread)] || TAROT_SPREAD_POSITIONS.three).map((position, index) => ({
    ...tarot,
    ...position,
    reading: index === 0 ? tarot.reading : `${position.positionLabel} 자리에서는 ${position.positionMeaning}`,
  }));
}

// 카드별 상세 해석(detail) 5항목. LLM이 이 자리를 채우지 못했을 때만 쓰는 결정론 폴백이다.
const TAROT_CARD_DETAIL_FIELDS = ["coreMeaning", "currentSituation", "questionLink", "advice", "caution"];

function buildFallbackCardDetail(card = {}, question = "") {
  const name = cleanText(card.nameKo, 60) || "이 카드";
  const orientationLabel = card.orientation === "reversed" ? "역방향" : "정방향";
  const keywords = Array.isArray(card.keywords) ? card.keywords.filter(Boolean).slice(0, 3) : [];
  const keywordLine = keywords.length ? keywords.join(", ") : "지금의 결";
  const leadKeyword = keywords[0] || "지금의 결";
  const subKeyword = keywords[1] || leadKeyword;
  const positionLabel = cleanText(card.positionLabel, 40) || "이 자리";
  const positionMeaning = cleanText(card.positionMeaning, 200) || "지금 살펴야 할 장면";
  const questionLine = cleanText(question, 120);
  const structure = describeTarotCardStructure(card);
  const structureLine = structure.arcana === "major"
    ? "메이저 아르카나라 개인의 선택보다 큰 흐름이 먼저 움직이는 자리입니다"
    : `${structure.suitKo || "마이너"} 계열${structure.element ? `(${structure.element})` : ""}이라 일상에서 손에 잡히는 변화로 나타납니다`;
  const orientationLine = card.orientation === "reversed"
    ? "역방향은 나쁘다는 뜻이 아니라, 이 힘이 막히거나 과해지거나 안쪽으로 접혀 있다는 신호입니다"
    : "정방향은 이 카드의 힘이 비교적 자연스럽게 드러나 지금 쓸 수 있는 자원이라는 뜻입니다";
  return {
    coreMeaning: `${name}이 ${orientationLabel}으로 떠올랐습니다. ${cleanText(card.meaning, 400) || `${keywordLine}의 결을 비추는 카드입니다.`} ${structureLine}. ${orientationLine}. 그래서 이 카드는 ${keywordLine}을 좋고 나쁨으로 가르기보다, 지금 어느 쪽으로 기울어 있는지를 먼저 보게 합니다.`,
    currentSituation: `${positionLabel} 자리는 ${positionMeaning} 그래서 ${name}은 지금 상황에서 ${leadKeyword}이 어디까지 작동하고 있는지를 보여 줍니다. 같은 카드라도 다른 자리에 놓였다면 다르게 읽혔을 결입니다. 이 자리에서는 상황을 바꾸려 애쓰기보다, 이미 벌어진 흐름의 방향을 정확히 읽는 편이 먼저입니다.`,
    questionLink: questionLine
      ? `"${questionLine}"라는 물음에서 ${name}은 ${keywordLine}의 결로 답의 방향을 좁혀 줍니다. 결론을 확정하기보다, 이 질문에서 무엇을 먼저 확인해야 하는지를 가리키는 카드입니다. 답이 아직 열려 있다는 뜻이기도 하니, 지금 손에 쥔 정보와 아직 추측인 부분을 나누어 보세요.`
      : `지금의 물음에서 ${name}은 ${keywordLine}의 결로 답의 방향을 좁혀 줍니다. 결론을 확정하기보다, 무엇을 먼저 확인해야 하는지를 가리키는 카드입니다. 답이 아직 열려 있다는 뜻이기도 하니, 지금 손에 쥔 정보와 아직 추측인 부분을 나누어 보세요.`,
    advice: `${name}이 건네는 조언은 ${leadKeyword}을 서두르지 말고 끝까지 지켜보는 것입니다. 오늘은 판단을 미루더라도, ${subKeyword}이 실제로 어떻게 움직이는지 한 가지만 확인해 두세요. 작게 확인한 사실 하나가 다음 선택의 기준이 되어 줍니다.`,
    caution: `${orientationLabel}의 ${name}에서는 ${subKeyword}이 과해지거나 반대로 계속 미뤄지기 쉽습니다. 마음이 급해질 때 이 카드의 결을 근거 삼아 무리한 확신을 만들지 않도록 살펴 주세요. 특히 확인되지 않은 상대의 마음이나 결과를 이 카드로 단정하는 것은 피하는 편이 좋습니다.`,
  };
}

// 3카드는 3쌍 전부, 5카드는 인접쌍 + 처음↔끝을 핵심 조합으로 본다.
function buildTarotInteractionPairIndexes(cardCount) {
  if (cardCount <= 1) return [];
  if (cardCount <= 3) {
    const pairs = [];
    for (let a = 0; a < cardCount; a += 1) {
      for (let b = a + 1; b < cardCount; b += 1) pairs.push([a, b]);
    }
    return pairs;
  }
  const pairs = [];
  for (let index = 0; index + 1 < cardCount; index += 1) pairs.push([index, index + 1]);
  pairs.push([0, cardCount - 1]);
  return pairs;
}

function buildFallbackCardInteractions(cards = []) {
  const list = Array.isArray(cards) ? cards : [];
  return buildTarotInteractionPairIndexes(list.length).map(([a, b]) => {
    const first = list[a] || {};
    const second = list[b] || {};
    const firstKeyword = (first.keywords || [])[0] || "지금의 결";
    const secondKeyword = (second.keywords || [])[0] || "다음의 결";
    return {
      pair: `${cleanText(first.nameKo, 60) || "첫 카드"} + ${cleanText(second.nameKo, 60) || "다음 카드"}`,
      insight: `${cleanText(first.positionLabel, 40) || "앞자리"}의 ${firstKeyword}이 ${cleanText(second.positionLabel, 40) || "뒷자리"}의 ${secondKeyword}으로 이어집니다. 두 카드는 지금의 마음을 한 방향으로만 몰지 말고, 두 결을 함께 붙잡으라고 말하고 있습니다.`,
    };
  });
}

function normalizeSukuyoPerson(value, fallbackName) {
  const source = value && typeof value === "object" ? value : {};
  return {
    name: cleanText(source.name || fallbackName, 40),
    birthDate: cleanText(source.birthDate, 20),
    calendarType: source.calendarType === "lunar" ? "lunar" : "solar",
    gender: cleanText(source.gender, 20),
  };
}

function normalizeSukuyoInput(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    user: normalizeSukuyoPerson(source.user, "나"),
    partner: normalizeSukuyoPerson(source.partner, "상대"),
    relationshipType: cleanText(source.relationshipType, 80),
    focus: cleanText(source.focus, 80),
    currentSituation: cleanMultiline(source.currentSituation, 800),
  };
}

function normalizeSajuCompatPerson(value, fallbackName) {
  const source = value && typeof value === "object" ? value : {};
  const birthTimeUnknown = source.birthTimeUnknown === true;
  return {
    name: cleanText(source.name || fallbackName, 40),
    birthDate: cleanText(source.birthDate, 20),
    birthTime: birthTimeUnknown ? "" : cleanText(source.birthTime, 12),
    birthTimeUnknown,
    calendarType: source.calendarType === "lunar" ? "lunar" : "solar",
    gender: cleanText(source.gender, 20),
  };
}

function normalizeSajuCompatInput(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    user: normalizeSajuCompatPerson(source.user, "나"),
    partner: normalizeSajuCompatPerson(source.partner, "상대"),
    relationshipType: cleanText(source.relationshipType, 80),
    focus: cleanText(source.focus, 80),
    currentSituation: cleanMultiline(source.currentSituation, 800),
  };
}

const FORTUNE_TEA_SUKUYO_RELATION_GUIDE = {
  명: {
    tone: "서로의 리듬이 닮아 익숙함이 빠르게 깊어지는 인연입니다.",
    strengths: ["처음부터 낯설지 않아 마음의 문이 비교적 부드럽게 열립니다.", "비슷한 반응 속도 덕분에 초반 신뢰와 공감이 빨리 생길 수 있습니다."],
    cautions: ["익숙함이 방심으로 흐르면 상대의 변화나 서운함을 늦게 알아차릴 수 있습니다.", "닮은 약점이 동시에 올라올 때는 누가 먼저 멈추고 정리할지 정해 두어야 합니다."],
    keywords: ["익숙함", "공명", "변화 확인"],
  },
  영친: {
    tone: "돌봄과 신뢰가 부드럽게 오가며 마음이 쉽게 쉬는 인연입니다.",
    strengths: ["서로에게 안심을 주는 말과 행동이 자연스럽게 살아납니다.", "관계가 오래갈수록 정서적 지지와 보호감이 단단해질 수 있습니다."],
    cautions: ["너무 편해지면 고마움과 배려 표현이 줄어 서운함이 조용히 쌓일 수 있습니다.", "한쪽만 돌보는 역할이 굳어지지 않게 부탁과 거절을 모두 말할 수 있어야 합니다."],
    keywords: ["돌봄", "신뢰", "고마움 표현"],
  },
  우쇠: {
    tone: "친밀함과 자극, 보호와 의존의 온도 차가 함께 움직이는 인연입니다.",
    strengths: ["서로의 장점을 빠르게 알아보고 성장의 자극을 줍니다.", "가벼운 경쟁심과 인정 욕구가 관계에 생기를 만들 수 있습니다."],
    cautions: ["비교가 깊어지면 자존심이 먼저 다치고 주도권 싸움으로 번질 수 있습니다.", "보호하려는 마음이 통제처럼 보이지 않도록 역할과 책임을 나누어야 합니다."],
    keywords: ["자극", "인정", "주도권 조율"],
  },
  안괴: {
    tone: "강한 끌림과 흔들림이 함께 떠오르며 마음의 깊은 지점을 건드리는 인연입니다.",
    strengths: ["멈춰 있던 감정을 깨우고 관계를 빠르게 변화시킵니다.", "서로의 숨은 상처와 욕구를 알아차리는 힘이 있습니다."],
    cautions: ["상처가 올라오는 순간 결론을 서두르면 관계가 쉽게 날카로워집니다.", "불안을 사랑의 증거로만 붙잡지 말고, 연락 속도와 말의 강도를 의식적으로 낮춰야 합니다."],
    keywords: ["강한 끌림", "경계", "속도 조절"],
  },
  업태: {
    tone: "오래된 숙제처럼 반복되는 감정이 떠오르고 쉽게 잊히지 않는 인연입니다.",
    strengths: ["서로에게 강한 존재감이 남아 관계의 의미를 깊게 묻게 합니다.", "반복되는 관계 패턴을 의식적으로 바꾸면 큰 배움과 성장이 열립니다."],
    cautions: ["운명이라는 말로 현실의 선택을 미루면 같은 장면이 반복될 수 있습니다.", "강한 끌림일수록 연락, 약속, 책임의 기준을 또렷하게 나누어야 합니다."],
    keywords: ["반복", "선택", "현실의 약속"],
  },
  위성: {
    tone: "긴장과 성장이 함께 흐르며 서로의 방향을 새로 보게 하는 인연입니다.",
    strengths: ["서로의 기준을 넓혀 주고 새로운 역할을 배우게 합니다.", "함께 목표를 정하면 관계가 현실적으로 단단해질 수 있습니다."],
    cautions: ["서로를 바꾸려는 마음이 커지면 피로가 빨리 쌓입니다.", "한쪽이 가르치고 한쪽이 맞추는 구조가 되지 않도록 감정 목표와 현실 목표를 분리해 말해야 합니다."],
    keywords: ["성장", "역할 균형", "기준 설명"],
  },
  성위: {
    tone: "긴장과 성장이 함께 흐르며 서로의 방향을 새로 보게 하는 인연입니다.",
    strengths: ["서로의 기준을 넓혀 주고 새로운 역할을 배우게 합니다.", "함께 목표를 정하면 관계가 현실적으로 단단해질 수 있습니다."],
    cautions: ["서로를 바꾸려는 마음이 커지면 피로가 빨리 쌓입니다.", "한쪽이 가르치고 한쪽이 맞추는 구조가 되지 않도록 감정 목표와 현실 목표를 분리해 말해야 합니다."],
    keywords: ["성장", "역할 균형", "기준 설명"],
  },
};
const FORTUNE_TEA_SUKUYO_STABLE_GROUP_HANJA = new Set(["角", "亢", "氐", "房", "心", "尾", "箕"]);
const FORTUNE_TEA_SUKUYO_RISK_GROUP_HANJA = new Set(["奎", "婁", "胃", "昴", "畢", "觜", "參"]);
const FORTUNE_TEA_SUKUYO_ELEMENT_CREATE = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const FORTUNE_TEA_SUKUYO_ELEMENT_CONTROL = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

function cleanTextOr(value, fallback, maxLength = 80) {
  return cleanText(value, maxLength) || fallback;
}

function parseFortuneTeaSukuyoBirthDate(value) {
  const raw = cleanText(value, 20);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || year > 2100) return null;
  return { year, month, day, raw };
}

function lunarForFortuneTeaSukuyoPerson(person = {}) {
  const birth = parseFortuneTeaSukuyoBirthDate(person.birthDate);
  if (!birth) throw new Error("INVALID_SUKUYO_BIRTH");
  if (person.calendarType === "lunar") {
    Lunar.fromYmd(birth.year, birth.month, birth.day);
    return {
      lunarYear: birth.year,
      lunarMonth: birth.month,
      lunarDay: birth.day,
      isLeapMonth: false,
      source: "user-lunar-input",
    };
  }
  const lunar = Solar.fromYmdHms(birth.year, birth.month, birth.day, 12, 0, 0).getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return {
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  };
}

function calculateFortuneTeaSukuyoPerson(person = {}) {
  const lunar = lunarForFortuneTeaSukuyoPerson(person);
  const sukuyo = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, {
    isLeapMonth: lunar.isLeapMonth,
    source: lunar.source,
  });
  if (!sukuyo) throw new Error("SUKUYO_EMPTY");
  return { ...sukuyo, lunarYear: lunar.lunarYear };
}

function fortuneTeaSukuyoName(value = {}) {
  const name = cleanText(value.nameKo || value.name, 12);
  return name ? `${name}숙` : "";
}

function fortuneTeaSukuyoHanja(value = {}) {
  const name = cleanText(value.nameHan || value.hanja, 12);
  return name ? `${name}宿` : "";
}

function buildFortuneTeaSukuyoPersonSnapshot(input = {}, fallbackName, sukuyo) {
  return {
    name: cleanText(input.name, 40) || fallbackName,
    birthDate: cleanText(input.birthDate, 20),
    calendarType: input.calendarType === "lunar" ? "lunar" : "solar",
    gender: cleanText(input.gender, 20) || undefined,
    sukuyoName: sukuyo ? fortuneTeaSukuyoName(sukuyo) : undefined,
    sukuyoHanja: sukuyo ? fortuneTeaSukuyoHanja(sukuyo) : undefined,
    index: Number.isFinite(Number(sukuyo?.index)) ? Number(sukuyo.index) : undefined,
    element: sukuyo?.element,
    direction: sukuyo?.direction,
    keywords: Array.isArray(sukuyo?.keywords) ? sukuyo.keywords.slice(0, 3) : [],
  };
}

function normalizeFortuneTeaSukuyoElement(value) {
  const element = cleanTextOr(value, "토", 4);
  if (["목", "화", "토", "금", "수"].includes(element)) return element;
  if (element === "일") return "화";
  if (element === "월") return "수";
  return "토";
}

function fortuneTeaSukuyoElementRelation(userElement, partnerElement) {
  if (userElement === partnerElement) return "동류";
  if (FORTUNE_TEA_SUKUYO_ELEMENT_CREATE[userElement] === partnerElement || FORTUNE_TEA_SUKUYO_ELEMENT_CREATE[partnerElement] === userElement) return "상생";
  if (FORTUNE_TEA_SUKUYO_ELEMENT_CONTROL[userElement] === partnerElement || FORTUNE_TEA_SUKUYO_ELEMENT_CONTROL[partnerElement] === userElement) return "상극";
  return "보완";
}

function fortuneTeaSukuyoGroup(sukuyo = {}) {
  const han = cleanText(sukuyo.nameHan || sukuyo.hanja, 8);
  if (FORTUNE_TEA_SUKUYO_STABLE_GROUP_HANJA.has(han)) return "안숙";
  if (FORTUNE_TEA_SUKUYO_RISK_GROUP_HANJA.has(han)) return "위험숙";
  return "성숙";
}

function fortuneTeaSukuyoGuardian(sukuyo = {}) {
  const direction = cleanText(sukuyo.direction, 12);
  if (direction.includes("동")) return "청룡";
  if (direction.includes("남")) return "주작";
  if (direction.includes("서")) return "백호";
  if (direction.includes("북")) return "현무";
  const index = Number(sukuyo.index);
  if (Number.isFinite(index)) {
    if (index <= 6) return "청룡";
    if (index <= 13) return "현무";
    if (index <= 20) return "백호";
    return "주작";
  }
  return "청룡";
}

function fortuneTeaSukuyoYinYang(sukuyo = {}) {
  const index = Number(sukuyo.index);
  return Number.isFinite(index) && index % 2 === 0 ? "양" : "음";
}

function fortuneTeaSukuyoKeyword(sukuyo = {}) {
  const words = []
    .concat(Array.isArray(sukuyo.keywords) ? sukuyo.keywords : [])
    .concat(Array.isArray(sukuyo.strengths) ? sukuyo.strengths : [])
    .map((item) => cleanText(item, 20))
    .filter(Boolean);
  return words.slice(0, 3).join(" · ") || "직관 · 조율 · 성장";
}

function fortuneTeaSukuyoIntensity(shortestDistance, relationType) {
  const distance = Number(shortestDistance);
  if (distance <= 3 || ["안괴", "업태"].includes(relationType)) return "강렬";
  if (distance >= 9) return "잔잔";
  return "보통";
}

function fortuneTeaSukuyoDistanceTier(shortestDistance) {
  const distance = Number(shortestDistance);
  if (!Number.isFinite(distance)) return "middle";
  if (distance === 0) return "same";
  if (distance <= 4) return "near";
  if (distance <= 10) return "middle";
  return "far";
}

function fortuneTeaSukuyoCompatibilityIndex(compatibility = {}) {
  const chemistry = Number(compatibility.chemistryScore || 74);
  const stability = Number(compatibility.stabilityScore || 72);
  const conflict = Number(compatibility.conflictScore || 42);
  return Math.max(1, Math.min(99, Math.round((chemistry + stability + (100 - conflict)) / 3)));
}

function clampFortuneTeaSukuyoAreaScore(value) {
  return Math.max(12, Math.min(18, Math.round(Number(value) || 15)));
}

function normalizeFortuneTeaSukuyoScoreTotal(scores) {
  const keys = ["destiny", "harmony", "emotion", "growth", "stability"];
  const normalized = Object.fromEntries(keys.map((key) => [key, clampFortuneTeaSukuyoAreaScore(scores[key])]));
  let total = keys.reduce((sum, key) => sum + normalized[key], 0);
  while (total > 80) {
    const key = keys.find((name) => normalized[name] > 14);
    if (!key) break;
    normalized[key] -= 1;
    total -= 1;
  }
  while (total < 70) {
    const key = keys.find((name) => normalized[name] < 16);
    if (!key) break;
    normalized[key] += 1;
    total += 1;
  }
  return {
    ...normalized,
    total,
    label: total >= 78 ? "깊은 공명" : total >= 74 ? "따뜻한 조율" : "천천히 맞춰갈 인연",
  };
}

function buildFortuneTeaSukuyoScoreSummary(userSukuyo = {}, partnerSukuyo = {}, compatibility = {}, relationType, intensity) {
  const userElement = normalizeFortuneTeaSukuyoElement(userSukuyo.element);
  const partnerElement = normalizeFortuneTeaSukuyoElement(partnerSukuyo.element);
  const harmonyType = fortuneTeaSukuyoElementRelation(userElement, partnerElement);
  const distance = Number(compatibility.shortestDistance ?? compatibility.distanceMetrics?.shortestDistance) || 0;
  const chemistry = Number(compatibility.chemistryScore || 75);
  const stability = Number(compatibility.stabilityScore || 74);
  const boost = intensity === "강렬" ? 1 : intensity === "잔잔" ? -1 : 0;
  return normalizeFortuneTeaSukuyoScoreTotal({
    destiny: 15 + boost + (distance === 0 ? 2 : distance <= 4 ? 1 : 0),
    harmony: 15 + (harmonyType === "상생" ? 2 : harmonyType === "동류" ? 1 : harmonyType === "상극" ? -2 : 0),
    emotion: 15 + (fortuneTeaSukuyoYinYang(userSukuyo) !== fortuneTeaSukuyoYinYang(partnerSukuyo) ? 1 : 0) + (fortuneTeaSukuyoGuardian(userSukuyo) === fortuneTeaSukuyoGuardian(partnerSukuyo) ? 1 : 0) - (distance >= 9 ? 1 : 0),
    growth: 15 + (["안괴", "업태"].includes(relationType) ? 2 : 0) + (chemistry >= 82 ? 1 : 0),
    stability: 15 + (stability >= 82 ? 2 : stability <= 66 ? -2 : 0) - (intensity === "강렬" ? 1 : 0),
  });
}

function buildUnavailableFortuneTeaSukuyoCompatibility(request, reason) {
  const sukuyo = request.sukuyo || {};
  return {
    available: false,
    calculationSource: "sukuyo-compatibility-ai-calculation",
    title: "달빛 궁합의 방이 아직 조용히 닫혀 있어요",
    summary: reason,
    relationshipType: cleanText(sukuyo.relationshipType, 80),
    focus: cleanText(sukuyo.focus, 80),
    currentSituation: cleanText(sukuyo.currentSituation, 300),
    user: buildFortuneTeaSukuyoPersonSnapshot(sukuyo.user, "나"),
    partner: buildFortuneTeaSukuyoPersonSnapshot(sukuyo.partner, "상대"),
    strengths: ["두 사람의 생년월일과 달력 기준이 모두 놓인 뒤에야 27숙의 거리를 열 수 있습니다."],
    cautions: ["비어 있는 정보로 인연을 꾸미지 않고, 확인된 마음과 질문만 조용히 붙잡겠습니다."],
    adviceKeywords: ["생년월일 확인", "달력 기준", "마음의 질문"],
  };
}

function buildFortuneTeaSukuyoCompatibility(request) {
  const input = request.sukuyo;
  if (!input?.user?.birthDate || !input?.partner?.birthDate || !input.user.calendarType || !input.partner.calendarType) {
    return buildUnavailableFortuneTeaSukuyoCompatibility(request, "두 사람의 생년월일과 달력 기준이 모두 놓여야 27숙 인연의 흐름을 열 수 있습니다.");
  }

  try {
    const userSukuyo = calculateFortuneTeaSukuyoPerson(input.user);
    const partnerSukuyo = calculateFortuneTeaSukuyoPerson(input.partner);
    const compatibility = buildSukuyoAiCompatibility(userSukuyo, partnerSukuyo);
    const user = buildFortuneTeaSukuyoPersonSnapshot(input.user, "나", userSukuyo);
    const partner = buildFortuneTeaSukuyoPersonSnapshot(input.partner, "상대", partnerSukuyo);
    const relationType = cleanTextOr(compatibility.relationType, "명", 12);
    const guide = FORTUNE_TEA_SUKUYO_RELATION_GUIDE[relationType] || FORTUNE_TEA_SUKUYO_RELATION_GUIDE.명;
    const distanceLabel = cleanTextOr(compatibility.distanceLabel || compatibility.distanceMetrics?.distanceLabel, "동숙", 20);
    const forwardDistance = Number(compatibility.forwardDistance);
    const reverseDistance = Number(compatibility.reverseDistance);
    const shortestDistance = Number(compatibility.shortestDistance ?? compatibility.distanceMetrics?.shortestDistance);
    // 방향 라벨은 정본 링 매핑(aRole/bRole)에서만 파생한다 — 별도 12항 근사표 금지(정본과 어긋나 모순 노출됐던 지점).
    const directional = describeSukuyoDirectionalRelation(forwardDistance, reverseDistance) || {
      aRoleLabel: "확인된 자리",
      aRoleMeaning: "확인된 방향의 결만 살핍니다.",
      bRoleLabel: "확인된 자리",
      bRoleMeaning: "확인된 방향의 결만 살핍니다.",
      directionalDistanceGuide: "두 사람의 거리 계산이 열리는 대로 다가감과 회복의 간격을 함께 살핍니다.",
    };
    const intensity = fortuneTeaSukuyoIntensity(shortestDistance, relationType);
    const scores = buildFortuneTeaSukuyoScoreSummary(userSukuyo, partnerSukuyo, compatibility, relationType, intensity);
    const userElement = normalizeFortuneTeaSukuyoElement(userSukuyo.element);
    const partnerElement = normalizeFortuneTeaSukuyoElement(partnerSukuyo.element);
    const elementHarmonyRelation = fortuneTeaSukuyoElementRelation(userElement, partnerElement);
    const questionFocus = cleanTextOr(input.focus, "관계의 흐름", 40);
    const distanceGuide = sukuyoDistanceGuide(fortuneTeaSukuyoDistanceTier(shortestDistance), distanceLabel);
    const categoryGuide = sukuyoCategoryGuide(`${input.relationshipType || ""} ${input.focus || ""} ${input.currentSituation || ""}`);
    const distancePhrase = /거리$/.test(distanceLabel) ? distanceLabel : `${distanceLabel}의 거리`;
    const distanceSubject = /거리$/.test(distanceLabel) ? `${distanceLabel}는` : `${distanceLabel}의 거리는`;

    return {
      available: true,
      calculationSource: "sukuyo-compatibility-ai-calculation",
      title: `${user.sukuyoName || "나의 본명숙"}과 ${partner.sukuyoName || "상대의 본명숙"}이 만나는 ${relationType}의 달빛`,
      summary: `${user.name}의 ${user.sukuyoName || "본명숙"}과 ${partner.name}의 ${partner.sukuyoName || "본명숙"}은 ${distancePhrase}에서 ${relationType} 관계로 맞닿습니다. ${guide.tone} 이 관계에서 나는 ${directional.aRoleLabel}, 상대는 ${directional.bRoleLabel}의 자리에 서기에 같은 마음도 표현되는 결은 서로 다르게 나타날 수 있어요. ${distanceGuide} 지금은 ${questionFocus}을 중심으로 끌림과 조심해야 할 리듬을 함께 보아야 합니다.`,
      relationshipType: cleanText(input.relationshipType, 80),
      focus: questionFocus,
      currentSituation: cleanText(input.currentSituation, 300),
      user,
      partner,
      calculationBasis: {
        user: {
          lunarYear: Number(userSukuyo.lunarYear),
          lunarMonth: Number(userSukuyo.lunarMonth),
          lunarDay: Number(userSukuyo.lunarDay),
          isLeapMonth: Boolean(userSukuyo.isLeapMonth),
          source: cleanTextOr(userSukuyo.source, "lunar-javascript", 40),
          group: fortuneTeaSukuyoGroup(userSukuyo),
          guardian: fortuneTeaSukuyoGuardian(userSukuyo),
          yinYang: fortuneTeaSukuyoYinYang(userSukuyo),
          keyword: fortuneTeaSukuyoKeyword(userSukuyo),
        },
        partner: {
          lunarYear: Number(partnerSukuyo.lunarYear),
          lunarMonth: Number(partnerSukuyo.lunarMonth),
          lunarDay: Number(partnerSukuyo.lunarDay),
          isLeapMonth: Boolean(partnerSukuyo.isLeapMonth),
          source: cleanTextOr(partnerSukuyo.source, "lunar-javascript", 40),
          group: fortuneTeaSukuyoGroup(partnerSukuyo),
          guardian: fortuneTeaSukuyoGuardian(partnerSukuyo),
          yinYang: fortuneTeaSukuyoYinYang(partnerSukuyo),
          keyword: fortuneTeaSukuyoKeyword(partnerSukuyo),
        },
      },
      relationDetail: {
        typeAToB: directional.aRoleLabel,
        typeBToA: directional.bRoleLabel,
        intensity,
        userToPartnerMeaning: `나는 상대에게 ${directional.aRoleMeaning}입니다.`,
        partnerToUserMeaning: `상대는 나에게 ${directional.bRoleMeaning}입니다.`,
        directionalDistanceGuide: directional.directionalDistanceGuide,
      },
      relationType,
      relationTypeHan: cleanText(compatibility.relationTypeHan, 12),
      distanceLabel,
      distanceTier: fortuneTeaSukuyoDistanceTier(shortestDistance),
      forwardDistance: Number.isFinite(forwardDistance) ? forwardDistance : undefined,
      reverseDistance: Number.isFinite(reverseDistance) ? reverseDistance : undefined,
      shortestDistance: Number.isFinite(shortestDistance) ? shortestDistance : undefined,
      compatibilityIndex: fortuneTeaSukuyoCompatibilityIndex(compatibility),
      scores,
      elementHarmony: {
        userElement,
        partnerElement,
        relation: elementHarmonyRelation,
        summary: `${user.name}의 ${userElement} 기운과 ${partner.name}의 ${partnerElement} 기운은 ${elementHarmonyRelation}의 결로 맞닿습니다.`,
      },
      direction: [compatibility.directionFromAToB, compatibility.directionFromBToA].map((item) => cleanText(item, 24)).filter(Boolean).join(" / "),
      strengths: [
        `${user.sukuyoName || "나의 숙"}은 ${user.keywords?.slice(0, 2).join(" · ") || "감정의 결"}로 먼저 다가가고, ${partner.sukuyoName || "상대의 숙"}은 ${partner.keywords?.slice(0, 2).join(" · ") || "관계의 온도"}로 응답해 첫 끌림의 결을 만듭니다.`,
        `${relationType} 관계에서는 ${guide.strengths[0]} 여기에 ${elementHarmonyRelation}의 오행 결이 더해져 대화의 온도를 맞출 여지가 생깁니다.`,
        `내가 서는 ${directional.aRoleLabel}의 자리와 상대가 서는 ${directional.bRoleLabel}의 자리는, 한쪽만 맞추는 관계보다 서로의 속도를 확인할 때 장점이 살아난다는 것을 가리킵니다.`,
        ...guide.strengths,
      ].slice(0, 3),
      cautions: [
        directional.directionalDistanceGuide || `${distanceSubject} 가까워지는 속도와 회복에 필요한 간격이 다를 수 있음을 보여줍니다.`,
        ...guide.cautions,
        categoryGuide,
      ].slice(0, 3),
      adviceKeywords: [relationType, distanceLabel, directional.aRoleLabel, directional.bRoleLabel, ...guide.keywords].slice(0, 5),
      roleGuide: {
        userAction: cleanTextOr(compatibility.roleActionGuide?.meAction, guide.keywords[0], 180),
        partnerAction: cleanTextOr(compatibility.roleActionGuide?.otherAction, guide.keywords[1] || "상대의 속도 존중", 180),
      },
    };
  } catch {
    return buildUnavailableFortuneTeaSukuyoCompatibility(request, "27숙 계산이 잠시 열리지 않았어요. 연이는 없는 숙요 관계를 지어내지 않고, 확인된 질문의 온도만 먼저 붙잡겠습니다.");
  }
}

function normalizeRequest(body) {
  const selectedTeaCupId = cleanText(body?.selectedTeaCupId, 80);
  const selectedTeaCupName = cleanText(body?.selectedTeaCupName, 80);
  const selectedTeaCupTopic = cleanText(body?.selectedTeaCupTopic, 80);
  const question = cleanMultiline(body?.question, 1200);
  const calendarType = body?.calendarType === "lunar" ? "lunar" : "solar";
  const consultationMode = normalizeConsultationMode(body?.consultationMode);

  if (!selectedTeaCupId || !selectedTeaCupName || !selectedTeaCupTopic) {
    const error = new Error("찻잔을 다시 골라 주세요.");
    error.status = 400;
    throw error;
  }
  if (question.length < 4) {
    const error = new Error("연이가 읽을 수 있도록 마음을 조금만 더 적어 주세요.");
    error.status = 400;
    throw error;
  }

  return {
    consultationMode,
    attemptId: cleanText(body?.attemptId, 180),
    resultId: cleanText(body?.resultId, 180),
    jobId: cleanText(body?.jobId, 180),
    selectedTeaCupId,
    selectedTeaCupName,
    selectedTeaCupTopic,
    question,
    tarotSpread: consultationMode === "tarot" ? normalizeTarotSpread(body?.tarotSpread) : undefined,
    nickname: cleanText(body?.nickname, 40),
    concernTopic: cleanText(body?.concernTopic, 80),
    birthInfo: cleanText(body?.birthInfo, 160),
    profileId: cleanText(body?.profileId, 120),
    birthDate: cleanText(body?.birthDate, 20),
    birthTime: body?.birthTimeUnknown === true ? "" : cleanText(body?.birthTime, 12),
    birthTimeUnknown: body?.birthTimeUnknown === true,
    birthPlace: cleanText(body?.birthPlace, 120),
    timezone: cleanText(body?.timezone, 80),
    gender: cleanText(body?.gender, 20),
    calendarType,
    sukuyo: consultationMode === "sukuyo" ? normalizeSukuyoInput(body?.sukuyo) : undefined,
    sajuCompatibility: consultationMode === "sajuCompatibility" ? normalizeSajuCompatInput(body?.sajuCompatibility) : undefined,
  };
}

// 상담 요청 자체(모드 + 타로 스프레드)에서 결정되는 정본 featureKey.
function expectedFortuneTeaHouseFeatureKey(consultRequest = {}) {
  if (consultRequest.consultationMode === "sukuyo") return FORTUNE_TEA_HOUSE_FEATURE_KEYS.sukuyo;
  if (consultRequest.consultationMode === "sajuCompatibility") return FORTUNE_TEA_HOUSE_FEATURE_KEYS.sajuCompatibility;
  if (consultRequest.consultationMode === "saju") return FORTUNE_TEA_HOUSE_FEATURE_KEYS.saju;
  return normalizeTarotSpread(consultRequest.tarotSpread) === "five"
    ? FORTUNE_TEA_HOUSE_FEATURE_KEYS.tarotFive
    : FORTUNE_TEA_HOUSE_FEATURE_KEYS.tarot;
}

function resolveFortuneTeaHouseFeatureKey(body = {}, consultRequest = {}) {
  const expected = expectedFortuneTeaHouseFeatureKey(consultRequest);
  const explicit = cleanText(body?.featureKey || body?.payment?.featureKey || body?._paymentContext?.featureKey, 120);
  // 클라이언트가 보낸 키는 요청에서 유도한 정본과 정확히 같을 때만 인정한다(fail-closed).
  // 특히 5카드 요청을 3카드 키로 결제하는 금액 조작을 여기서 막는다.
  if (explicit && FORTUNE_TEA_HOUSE_ALLOWED_FEATURE_KEYS.has(explicit)) {
    return explicit === expected ? explicit : "";
  }
  return expected;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(cleanText(value, 80));
}

function uniqueCleanTexts(values = [], maxLength = 180) {
  return Array.from(new Set(values.map((value) => cleanText(value, maxLength)).filter(Boolean)));
}

function collectFortuneTeaBillingObjects(body = {}) {
  const billingGate = objectValue(body.billingGate || body.billing || body.billingResult || body.paymentContext || body._paymentContext);
  const consume = objectValue(body.consume || billingGate.consume);
  const accessGrant = objectValue(body.accessGrant || billingGate.accessGrant || billingGate.accessGateResult);
  const payment = objectValue(body.payment || billingGate.payment);
  const pricing = objectValue(body.pricing || billingGate.pricing);
  const runtimeGate = objectValue(body.runtimeGate || billingGate.runtimeGate || pricing.runtimeGate);
  const licensePass = objectValue(body.licensePass || body.membershipPass || billingGate.licensePass || billingGate.membershipPass);
  return { billingGate, consume, accessGrant, payment, pricing, runtimeGate, licensePass };
}

function collectFortuneTeaBillingFeatureKeys(body = {}) {
  const ctx = collectFortuneTeaBillingObjects(body);
  return uniqueCleanTexts([
    body.featureKey,
    body.subFeatureKey,
    ctx.billingGate.featureKey,
    ctx.billingGate.subFeatureKey,
    ctx.consume.featureKey,
    ctx.accessGrant.featureKey,
    ctx.payment.featureKey,
    ctx.pricing.featureKey,
    ctx.runtimeGate.featureKey,
    ctx.runtimeGate.subFeatureKey,
  ], 140).filter((key) => FORTUNE_TEA_HOUSE_ALLOWED_FEATURE_KEYS.has(key) || key.startsWith("fortune-tea-house-"));
}

function collectFortuneTeaBillingEvidenceIds(body = {}) {
  const ctx = collectFortuneTeaBillingObjects(body);
  const sources = [
    body,
    objectValue(body.paymentContext),
    objectValue(body._paymentContext),
    ctx.billingGate,
    ctx.consume,
    ctx.accessGrant,
    ctx.payment,
    ctx.pricing,
    ctx.runtimeGate,
    ctx.licensePass,
  ];
  const keys = [
    "_id",
    "id",
    "attemptId",
    "paymentId",
    "merchantUid",
    "merchant_uid",
    "impUid",
    "imp_uid",
    "transactionId",
    "purchaseId",
    "evidenceId",
    "requestId",
    "idempotencyKey",
    "orderId",
    "ledgerId",
    "executionId",
    "pointHistoryId",
    "monthlyCreditLedgerId",
    "receiptId",
  ];
  const values = [];
  const visit = (source, depth = 0) => {
    if (!source || typeof source !== "object" || Array.isArray(source) || depth > 2) return;
    keys.forEach((key) => values.push(source[key]));
    ["data", "consume", "accessGrant", "payment", "pricing", "billingGate", "runtimeGate", "metadata"].forEach((key) => visit(source[key], depth + 1));
  };
  sources.forEach((source) => visit(source));
  return uniqueCleanTexts(values, 180);
}

function billingEvidenceMatchesFeatureKey(body, featureKey) {
  const candidates = collectFortuneTeaBillingFeatureKeys(body);
  return candidates.length === 0 || candidates.every((candidate) => candidate === featureKey);
}

async function leanFindOne(model, query, options = {}) {
  let finder = model.findOne(query);
  if (finder?.sort && options.sort) finder = finder.sort(options.sort);
  if (finder?.select && options.select) finder = finder.select(options.select);
  if (finder?.lean) return finder.lean();
  return finder;
}

function idClauses(ids = [], fields = []) {
  const clauses = [];
  ids.forEach((id) => {
    fields.forEach((field) => clauses.push({ [field]: id }));
    if (isObjectIdLike(id)) clauses.push({ _id: id });
  });
  return clauses;
}

function normalizeFortuneTeaBillingAccessType(source = {}) {
  const haystack = [
    source.accessType,
    source.accessMethod,
    source.paymentMethod,
    source.transactionType,
    source.paymentMode,
  ].map((item) => cleanText(item, 80).toLowerCase()).join(" ");
  if (/admin/.test(haystack)) return "admin";
  if (/membership_credit|monthly/.test(haystack)) return "subscription";
  if (/membership_pass|family_pass|license|pass|family/.test(haystack)) return "pass";
  return "paid";
}

function isReusableFortuneTeaAccessDecision(accessDecision) {
  if (!accessDecision?.allowed) return false;
  const haystack = [
    accessDecision.accessSource,
    accessDecision.licenseType,
    accessDecision.reason,
    accessDecision.subscriptionStatus,
  ].map((item) => cleanText(item, 80).toLowerCase()).join(" ");
  if (/single_purchase|already_purchased|paidfeatures/.test(haystack)) return false;
  return /admin|monthly|subscription|membership_credit|license|pass|family/.test(haystack);
}

function isFortuneTeaAdminAuth(auth = {}) {
  const role = cleanText(auth.role || auth.userRole || auth.user?.role, 80).toLowerCase();
  return role === "admin";
}

async function resolveFortuneTeaBillingEvidenceAccess({ env, auth, body, featureKey }) {
  if (!billingEvidenceMatchesFeatureKey(body, featureKey)) {
    return { ok: false, reason: "FEATURE_MISMATCH" };
  }

  const ids = collectFortuneTeaBillingEvidenceIds(body);
  if (!ids.length) return null;

  await connectDb(env);

  const deferredClauses = idClauses(ids, ["requestId", "idempotencyKey", "executionId", "paymentId", "orderId", "result.deferredUsage.requestId", "result.deferredUsage.paymentId"]);
  const deferredRecord = deferredClauses.length
    ? await leanFindOne(PaidExecutionRecord, {
      userId: cleanText(auth.userId, 120),
      featureId: featureKey,
      status: { $in: FORTUNE_TEA_HOUSE_BILLING_STATUSES },
      $or: deferredClauses,
    }, { sort: { updatedAt: -1, createdAt: -1 }, select: "_id executionId requestId paymentId accessMethod result status" })
    : null;
  if (deferredRecord) {
    const deferredUsage = objectValue(objectValue(deferredRecord.result).deferredUsage);
    return {
      ok: true,
      allowed: true,
      reason: "BILLING_GATE_DEFERRED",
      userId: cleanText(auth.userId, 120),
      featureKey,
      accessSource: "billing_gate_deferred",
      licenseType: normalizeFortuneTeaBillingAccessType({
        accessType: deferredUsage.accessType,
        accessMethod: deferredUsage.paymentMethod || deferredRecord.accessMethod,
      }),
      paymentId: cleanText(deferredRecord.paymentId || deferredRecord.executionId || deferredRecord._id, 180),
      pricing: null,
    };
  }

  const pointClauses = idClauses(ids, ["paymentId", "impUid", "merchantUid", "metadata.requestId", "metadata.idempotencyKey", "metadata.purchaseId", "metadata.transactionId", "metadata.ledgerId", "metadata.evidenceId", "metadata.paymentId"]);
  const pointHistory = pointClauses.length
    ? await leanFindOne(PointHistory, {
      userId: auth.userId,
      kind: "deduct",
      featureKey,
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }, { sort: { createdAt: -1 }, select: "_id delta metadata" })
    : null;
  if (pointHistory) {
    return {
      ok: true,
      allowed: true,
      reason: "BILLING_GATE_POINT_HISTORY",
      userId: cleanText(auth.userId, 120),
      featureKey,
      accessSource: "billing_gate",
      licenseType: normalizeFortuneTeaBillingAccessType(pointHistory.metadata || {}),
      paymentId: cleanText(pointHistory._id, 180),
      pricing: null,
    };
  }

  const monthlyClauses = idClauses(ids, ["sourceId", "metadata.requestId", "metadata.idempotencyKey", "metadata.purchaseId", "metadata.transactionId", "metadata.ledgerId", "metadata.evidenceId", "metadata.paymentId"]);
  const monthlyLedger = monthlyClauses.length
    ? await leanFindOne(MonthlyCreditLedger, {
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      "metadata.refundedForServiceExecution": { $ne: true },
      $and: [
        { $or: [{ serviceKey: featureKey }, { serviceKey: FORTUNE_TEA_HOUSE_SERVICE_KEY }, { "metadata.featureKey": featureKey }] },
        { $or: monthlyClauses },
      ],
    }, { sort: { createdAt: -1 }, select: "_id amount sourceId metadata" })
    : null;
  if (monthlyLedger) {
    return {
      ok: true,
      allowed: true,
      reason: "BILLING_GATE_MONTHLY_CREDIT",
      userId: cleanText(auth.userId, 120),
      featureKey,
      accessSource: "billing_gate",
      licenseType: "subscription",
      paymentId: cleanText(monthlyLedger._id || monthlyLedger.sourceId, 180),
      pricing: null,
    };
  }

  const paymentClauses = idClauses(ids, ["requestId", "idempotencyKey", "merchantUid", "impUid", "metadata.requestId", "metadata.idempotencyKey", "metadata.purchaseId", "metadata.transactionId", "metadata.paymentId"]);
  const payment = paymentClauses.length
    ? await leanFindOne(Payment, {
      userId: auth.userId,
      paymentType: "digital_content",
      status: { $in: FORTUNE_TEA_HOUSE_PAYMENT_STATUSES },
      $and: [
        { $or: paymentClauses },
        { $or: [{ featureKey }, { "pricingSnapshot.featureKey": featureKey }, { "metadata.featureKey": featureKey }] },
      ],
    }, { sort: { paidAt: -1, updatedAt: -1, createdAt: -1 }, select: "_id merchantUid impUid requestId" })
    : null;
  if (payment) {
    return {
      ok: true,
      allowed: true,
      reason: "BILLING_GATE_PAYMENT",
      userId: cleanText(auth.userId, 120),
      featureKey,
      accessSource: "billing_gate",
      licenseType: "single_purchase",
      paymentId: cleanText(payment.merchantUid || payment.impUid || payment.requestId || payment._id, 180),
      pricing: null,
    };
  }

  return null;
}

function readFortuneTeaRequestId(body = {}, consultRequest = {}) {
  return cleanText(
    body?.requestId
      || body?.idempotencyKey
      || body?.attemptId
      || body?.payment?.requestId
      || body?.payment?.idempotencyKey
      || body?._paymentContext?.requestId
      || body?._paymentContext?.idempotencyKey
      || consultRequest?.attemptId
      || consultRequest?.resultId
      || consultRequest?.jobId,
    180,
  );
}

function buildFortuneTeaPaymentPayload({ featureKey, pricing = {}, consultRequest = {}, requestId = "" }) {
  const reason = cleanText(pricing.reason, 120) || "운명 찻집 상담";
  const cost = Math.max(0, Math.floor(Number(pricing.coinPrice ?? pricing.cost ?? 0)));
  const amountKRW = Math.max(0, Math.floor(Number(pricing.amountKRW ?? pricing.amountKrw ?? pricing.paymentAmount ?? 0)));
  const membershipCreditCost = Math.max(0, Math.floor(Number(pricing.membershipCreditCost ?? 0)));
  const idempotencyKey = cleanText(requestId || consultRequest.attemptId || consultRequest.resultId || consultRequest.jobId, 180);
  const runtimeGate = {
    categoryKey: FORTUNE_TEA_HOUSE_SERVICE_KEY,
    subFeatureKey: pricing.subFeatureKey || featureKey,
    featureKey,
    reason,
    productId: FORTUNE_TEA_HOUSE_SERVICE_KEY,
    productType: "fortune-tea-house-consultation",
    serviceType: FORTUNE_TEA_HOUSE_SERVICE_KEY,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost,
    requestId: idempotencyKey,
    idempotencyKey,
    deferUsage: true,
  };
  return {
    billingMode: "coin-gate",
    featureKey,
    serviceKey: FORTUNE_TEA_HOUSE_SERVICE_KEY,
    serviceId: FORTUNE_TEA_HOUSE_SERVICE_KEY,
    serviceType: FORTUNE_TEA_HOUSE_SERVICE_KEY,
    consultationMode: consultRequest.consultationMode || "tarot",
    categoryKey: runtimeGate.categoryKey,
    subFeatureKey: runtimeGate.subFeatureKey,
    contentId: featureKey,
    orderName: reason,
    reason,
    requestId: idempotencyKey,
    idempotencyKey,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost,
    runtimeGate,
  };
}

function buildFortuneTeaPaymentRequiredMessage(accessDecision, status) {
  if (status === 401) return "운명 찻집 상담은 로그인 후 이용권, 월정석, 단건결제로 열 수 있어요.";
  // 이용권을 보유했지만 이 상담 가격이 이용권 커버 한도를 넘어 결제가 필요한 경우를 명확히 안내한다.
  if (accessDecision?.pass?.isActive) {
    return "보유하신 이용권으로는 이 상담을 열 수 없어요. 월정석 또는 단건 결제로 이어서 열 수 있어요.";
  }
  return "운명 찻집 상담 이용권 또는 결제가 필요합니다.";
}

function buildFortuneTeaPaymentRequiredResponse({ featureKey, pricing, accessDecision, consultRequest, status = 402 }) {
  const requestId = readFortuneTeaRequestId({}, consultRequest);
  return json({
    ok: false,
    paymentRequired: true,
    message: buildFortuneTeaPaymentRequiredMessage(accessDecision, status),
    featureKey,
    pricing,
    accessDecision,
    paymentPayload: buildFortuneTeaPaymentPayload({ featureKey, pricing, consultRequest, requestId }),
  }, { status });
}

function buildFortuneTeaAccessDegradedResponse() {
  return json({
    ok: false,
    retryable: true,
    reason: "ACCESS_CHECK_DEGRADED",
    message: "일시적인 연결 문제로 이용권 확인이 지연되고 있어요. 잠시 후 다시 시도해 주세요.",
  }, { status: 503 });
}

async function verifyFortuneTeaHouseConsultAccess(request, env, body, consultRequest) {
  const featureKey = resolveFortuneTeaHouseFeatureKey(body, consultRequest);
  if (!featureKey) {
    return {
      ok: false,
      response: json({ ok: false, message: "상담 방식과 결제 기능 키를 다시 확인해 주세요." }, { status: 400 }),
    };
  }

  const pricingResult = getBillingFeaturePricing({ featureKey });
  if (!pricingResult.ok) {
    return {
      ok: false,
      response: json({ ok: false, message: pricingResult.message || "운명 찻집 상담 가격을 확인할 수 없습니다.", featureKey }, { status: 500 }),
    };
  }

  let auth;
  try {
    // 결제 프로젝션(BILLING_SNAPSHOT_USER_PROJECTION)을 함께 요청해, 생성 성공/실패 후 내부
    // coin-gate/deferred 위임(callFortuneTeaDeferredUsageRoute)이 users 를 다시 읽지 않고
    // 이 인증 결과를 그대로 재사용하게 한다(preverifiedAuth). 기존 PAID_FEATURE_ACCESS_USER_PROJECTION
    // 필드는 그대로 유지된다(병합이지 대체가 아님).
    auth = await getOptionalUserFromRequest(request, env, {
      surfaceDbInfraError: true,
      userProjection: { ...PAID_FEATURE_ACCESS_USER_PROJECTION, ...BILLING_SNAPSHOT_USER_PROJECTION },
    });
  } catch (error) {
    // 일시적 DB 장애는 401(로그아웃 유발) 대신 재시도 가능한 degraded 응답으로 흘려보낸다.
    if (isTransientMongoError(error)) return { ok: false, response: buildFortuneTeaAccessDegradedResponse() };
    throw error;
  }
  if (!auth?.userId) {
    return {
      ok: false,
      response: buildFortuneTeaPaymentRequiredResponse({
        featureKey,
        pricing: pricingResult.pricing,
        accessDecision: { allowed: false, reason: "LOGIN_REQUIRED", featureKey },
        consultRequest,
        status: 401,
      }),
    };
  }

  if (isFortuneTeaAdminAuth(auth)) {
    return {
      ok: true,
      auth,
      featureKey,
      pricing: pricingResult.pricing,
      accessDecision: {
        allowed: true,
        reason: "ADMIN",
        userId: auth.userId,
        featureKey,
        accessSource: "admin",
        licenseType: "admin",
        pricing: pricingResult.pricing,
      },
      deferredUsage: false,
    };
  }

  // 풀 초기화 버스트에서 access 판정의 일시적 Mongo 에러가 최상위 catch로 흘러
  // 재시도 신호 없는 일반 503이 되지 않도록, retryable 503으로 변환한다.
  let accessDecision;
  try {
    accessDecision = await canAccessPaidFeature(auth.userId, featureKey, {
      env,
      reason: pricingResult.pricing.reason,
      // 인증 단계에서 이미 읽은 User 문서를 재사용한다(없으면 내부에서 종전대로 조회).
      userDoc: auth.authUserDoc,
    });
  } catch (error) {
    if (isTransientMongoError(error)) {
      return { ok: false, response: buildFortuneTeaAccessDegradedResponse() };
    }
    throw error;
  }
  if (isReusableFortuneTeaAccessDecision(accessDecision)) {
    return {
      ok: true,
      auth,
      featureKey,
      pricing: accessDecision.pricing || pricingResult.pricing,
      accessDecision,
      deferredUsage: false,
    };
  }

  let billingEvidenceAccess;
  try {
    billingEvidenceAccess = await resolveFortuneTeaBillingEvidenceAccess({ env, auth, body, featureKey });
  } catch (error) {
    if (isTransientMongoError(error)) {
      return { ok: false, response: buildFortuneTeaAccessDegradedResponse() };
    }
    throw error;
  }
  if (billingEvidenceAccess?.reason === "FEATURE_MISMATCH") {
    return {
      ok: false,
      response: json({ ok: false, message: "상담 방식과 결제 기능 키를 다시 확인해 주세요.", featureKey }, { status: 400 }),
    };
  }
  if (billingEvidenceAccess?.ok) {
    return {
      ok: true,
      auth,
      featureKey,
      pricing: pricingResult.pricing,
      accessDecision: {
        ...billingEvidenceAccess,
        pricing: pricingResult.pricing,
      },
      deferredUsage: billingEvidenceAccess.reason === "BILLING_GATE_DEFERRED",
    };
  }

  return {
    ok: false,
    response: buildFortuneTeaPaymentRequiredResponse({
      featureKey,
      pricing: accessDecision?.pricing || pricingResult.pricing,
      accessDecision: accessDecision?.allowed
        ? { ...accessDecision, allowed: false, reason: "REQUEST_PAYMENT_REQUIRED" }
        : accessDecision,
      consultRequest,
      status: 402,
    }),
  };
}

function hasGeminiKey(env = {}) {
  return GEMINI_KEY_NAMES.some((key) => cleanText(env?.[key], 4000));
}

function isLocalLikeEnv(env = {}) {
  const mode = cleanText(env?.NODE_ENV || env?.ENVIRONMENT || env?.APP_ENV || env?.DEPLOY_ENV, 40).toLowerCase();
  return !mode || ["development", "dev", "local", "test"].includes(mode);
}

function extractJson(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("fortune tea house llm json parse failed");
  }
}

function textValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function assertText(value, label) {
  if (!textValue(value)) throw new Error(`fortune tea house quality failed: ${label}`);
}

function normalizeDeepSections(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const section = item && typeof item === "object" ? item : {};
      return {
        id: cleanText(section.id || `section-${index + 1}`, 80),
        title: cleanText(section.title, 80),
        body: cleanMultiline(section.body, 1800),
        tone: cleanText(section.tone, 20) || undefined,
      };
    })
    .filter((section) => section.title && section.body.length >= 60);
}

// 사주 궁합 전용 규칙 — 단독 사주의 자기중심 섹션 골격 대신 두 사람의 명식을 각각 세우고
// 대조하는 섹션 골격을 쓴다. 이 규칙 하나가 프롬프트 requiredDeepSections·검증기·gauges·폴백 빌더에
// 모두 전파된다(consultationMode === "sajuCompatibility"일 때만 반환).
const teaCompatSajuRule = {
  id: "sajuCompatibility",
  aliases: [],
  resultKey: "sajuCompatibilityReading",
  category: "사주 궁합",
  concept: "두 사람의 사주를 각각 독립적으로 읽은 뒤 두 명식을 대조해 궁합과 질문에 답하는 상담",
  minChars: SAJU_MIN_RESULT_CHARS,
  focus: ["두 일간의 상생·상극·동류·보완", "오행의 보완과 충돌", "십성 대조가 만드는 마음·행동 방식", "배우자궁·일지 관계", "두 사람의 현재 대운·세운이 관계에 부는 순풍·역풍", "질문에 대한 두 사람 관점의 답"],
  requiredSections: ["당신의 사주", "상대방의 사주", "두 사람의 궁합", "질문에 대한 답", "함께일 때의 강점", "미리 알아둘 주의점", "지금 이 시기 관계의 운", "찻집의 처방", "연이의 한마디"],
  gauges: [
    ["관계 온도", "pink", 58, "두 일간의 상생·상극이 관계의 기본 온도를 만듭니다."],
    ["표현의 합", "gold", 54, "식상 흐름은 두 사람이 마음을 꺼내 서로 맞추는 방식을 보여줍니다."],
    ["긴장 지점", "purple", 52, "관성 흐름은 관계에서 책임과 부담이 걸리는 자리를 비춥니다."],
    ["신뢰 안정", "green", 50, "서로 보완되는 오행은 오래 갈수록 쌓이는 안정감을 보여줍니다."],
    ["미련·기다림", "blue", 52, "인성 흐름은 관계에서 마음이 오래 머무는 자리를 보여줍니다."],
  ],
  requiredTerms: ["궁합", "상대"],
};

function resolveSajuCategoryRule(value = {}) {
  if (cleanText(value.consultationMode, 40) === "sajuCompatibility") return teaCompatSajuRule;
  const id = cleanText(value.selectedTeaCupId || value.teaCup?.id, 80);
  if (teaCategorySajuPromptMap[id]) return teaCategorySajuPromptMap[id];
  const source = [
    value.selectedTeaCupName,
    value.selectedTeaCupTopic,
    value.teaCup?.name,
    value.teaCup?.topic,
    value.concernTopic,
    value.question,
    value.questionSummary,
  ].filter(Boolean).join(" ");
  return Object.values(teaCategorySajuPromptMap).find((rule) => rule.aliases.some((alias) => source.includes(alias))) || {
    id: "general",
    aliases: [],
    resultKey: "coreReading",
    category: cleanText(value.selectedTeaCupTopic || value.teaCup?.topic, 80) || "사주 상담",
    concept: "확인된 명식과 질문을 바탕으로 손님에게 필요한 기준과 다음 행동을 읽는 상담",
    minChars: SAJU_MIN_RESULT_CHARS,
    focus: ["일간", "오행", "십성", "현재 운의 흐름", "질문에 맞는 현실 조언"],
    requiredSections: SAJU_REQUIRED_SECTION_TITLES,
    gauges: [
      ["기질 선명도", "gold", 56, "일간과 오행이 손님의 기본 반응 방식을 비춥니다."],
      ["생각 과부하", "blue", 54, "인성과 수 기운은 마음이 오래 머무는 자리를 보여줍니다."],
      ["표현 흐름", "pink", 52, "식상은 마음을 밖으로 꺼내는 방식을 가리킵니다."],
      ["현실 압박", "purple", 55, "관성과 재성은 책임과 현실 조건을 함께 띄웁니다."],
      ["회복 여지", "green", 50, "보완 기운은 오늘 다시 잡을 수 있는 균형을 보여줍니다."],
    ],
    requiredTerms: ["일간", "오행", "십성"],
  };
}

function getSajuRequiredSectionTitles(value) {
  return resolveSajuCategoryRule(value).requiredSections;
}

function getSajuMinResultChars(value) {
  return resolveSajuCategoryRule(value).minChars || SAJU_MIN_RESULT_CHARS;
}

function resolveTarotCategoryRule(value = {}) {
  const id = cleanText(value.selectedTeaCupId || value.teaCup?.id, 80);
  if (teaCategoryTarotPromptMap[id]) return teaCategoryTarotPromptMap[id];
  const source = [
    value.selectedTeaCupName,
    value.selectedTeaCupTopic,
    value.teaCup?.name,
    value.teaCup?.topic,
    value.concernTopic,
    value.question,
    value.questionSummary,
  ].filter(Boolean).join(" ");
  return Object.values(teaCategoryTarotPromptMap).find((rule) => rule.aliases.some((alias) => source.includes(alias))) || teaCategoryTarotPromptMap["lotus-moon"];
}

// 5카드는 카드가 2장 더 많아 카드별 해석 분량이 그만큼 늘어난다 — 전체 하한도 함께 올린다.
function getTarotMinResultChars(value) {
  const base = resolveTarotCategoryRule(value).minChars || TAROT_MIN_RESULT_CHARS;
  return normalizeTarotSpread(value?.tarotSpread) === "five" ? base + TAROT_FIVE_CARD_EXTRA_CHARS : base;
}

function formatSajuFactItem(item) {
  if (!item || typeof item !== "object") return cleanText(item, 300);
  const label = cleanText(item.nameKo || item.label || item.name || item.key || item.stem || item.branch || item.type, 80);
  const value = item.value ?? item.score ?? item.percent ?? item.strength;
  const valueText = value === undefined || value === null ? "" : cleanText(value, 40);
  const detail = cleanText(item.summary || item.meaning || item.description || item.relation, 160);
  const head = [label, valueText].filter(Boolean).join(" ");
  return head && detail ? `${head}: ${detail}` : head || detail || JSON.stringify(item);
}

function normalizeSajuFactText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(formatSajuFactItem).filter(Boolean).join(" · ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}:${formatSajuFactItem(item)}`)
      .join(" · ");
  }
  return cleanText(value, 300);
}

function firstSajuFactText(saju = {}, keys = []) {
  for (const key of keys) {
    const text = normalizeSajuFactText(saju?.[key]);
    if (text) return text;
  }
  return "";
}

function combineSajuFactText(...values) {
  return values
    .map((value) => normalizeSajuFactText(value))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(" · ");
}

// fallback.saju의 pillars(문자열 맵 또는 pillarBoard 배열)에서 간지 문자열을 꺼낸다.
function fortuneTeaSajuPillarGanji(saju, key) {
  const pillars = saju?.pillars;
  if (Array.isArray(pillars)) {
    const row = pillars.find((item) => item?.key === key) || {};
    return cleanText(row.ganji || `${row.heavenlyStem || ""}${row.earthlyBranch || ""}`, 12);
  }
  if (pillars && typeof pillars === "object") {
    const value = pillars[key];
    if (typeof value === "string") return cleanText(value, 12);
    if (value && typeof value === "object") return cleanText(value.ganji, 12);
  }
  return "";
}

// 독립 "AI 사주 생성" 기능의 순수 파생(지장간 투간/투출·도충·개고·십성 확정표)을
// 찻집 명식(pillars 간지 + 대운 목록)에 그대로 적용한다 — 같은 워커 번들 재사용, 재계산 없음.
function buildFortuneTeaSajuMyeongsikFacts(request, saju) {
  const pillarGanji = {
    year: fortuneTeaSajuPillarGanji(saju, "year"),
    month: fortuneTeaSajuPillarGanji(saju, "month"),
    day: fortuneTeaSajuPillarGanji(saju, "day"),
    hour: fortuneTeaSajuPillarGanji(saju, "hour"),
  };
  if (!pillarGanji.day) return undefined;
  try {
    const sajuResultLike = {
      pillars: {
        year: { ganji: pillarGanji.year },
        month: { ganji: pillarGanji.month },
        day: { ganji: pillarGanji.day },
        hour: { ganji: pillarGanji.hour },
      },
      daewoon: Array.isArray(saju?.daewoon)
        ? saju.daewoon.map((row) => ({ ganji: row?.pillar, label: row?.label, age: row?.startAge, year: row?.startYear }))
        : [],
    };
    const advanced = buildSajuAdvancedFactors(sajuResultLike, undefined);
    const elementWeights = Array.isArray(saju?.fiveElements)
      ? Object.fromEntries(saju.fiveElements.map((item) => [item?.key, Number(item?.value) || 0]))
      : undefined;
    const { factSnapshot } = buildSajuMyeongsikFactSnapshot({
      sajuResult: sajuResultLike,
      question: request?.question,
      advancedFactors: advanced,
      weights: elementWeights,
    });
    const stemLine = ["year", "month", "hour"]
      .map((key) => {
        const row = factSnapshot.heavenlyStemTenGods?.[key];
        return row?.stem ? `${row.label} ${row.stem}${row.stemKorean ? `(${row.stemKorean})` : ""}=${row.tenGod}` : "";
      })
      .filter(Boolean)
      .join(" · ");
    const hiddenLine = ["year", "month", "day", "hour"]
      .map((key) => {
        const row = factSnapshot.hiddenStemsByBranch?.[key];
        if (!row?.branch) return "";
        const list = (row.hiddenStems || [])
          .map((item) => `${item.stem}${item.stemKorean ? `(${item.stemKorean})` : ""}:${item.tenGod || "십성 미상"}`)
          .join("/");
        return `${row.label} ${row.branch}${row.branchKorean ? `(${row.branchKorean})` : ""}[${list}]`;
      })
      .filter(Boolean)
      .join(" · ");
    const combinedCounts = Object.entries(factSnapshot.tenGodDistribution?.combined || {})
      .filter(([, value]) => Number(value) > 0)
      .map(([tenGod, value]) => `${tenGod} ${value}`)
      .join(", ");
    const doChung = advanced?.doChung?.exists
      ? `${advanced.doChung.repeatedBranch} 반복 ${advanced.doChung.repeatedCount}회 → ${advanced.doChung.inducedOppositeBranch} 도충 유도`
      : "도충 조건 뚜렷하지 않음";
    const openings = (advanced?.earthStorageOpenings || [])
      .slice(0, 4)
      .map((row) => `${row.sourceBranch}-${row.triggerBranch} ${row.relationType}/${row.openingStrength}`);
    const luckRows = (factSnapshot.luck?.luckRows || [])
      .slice(0, 10)
      .map((row) => `${row.scope === "daewoon" ? "대운" : row.scope === "sewoon" ? "세운" : row.scope} ${row.label}`)
      .join(" | ");
    return {
      tenGodFixedTable: (factSnapshot.fixedTenGodTable || [])
        .map((row) => `${row.stem}${row.stemKorean ? `(${row.stemKorean})` : ""}=${row.tenGod}`)
        .join(" | "),
      tenGodTableRule: "십성 판정은 위 확정표만 사용한다. 표와 다른 십성을 새로 계산하거나 언급하지 않는다.",
      heavenlyStemTenGods: stemLine,
      hiddenStemsByBranch: hiddenLine,
      tenGodDistributionCombined: combinedCounts,
      hiddenStemExposures: (advanced?.hiddenStemExposures || []).slice(0, 6).map((row) => row.summaryForPrompt).filter(Boolean),
      doChung,
      earthStorageOpenings: openings.length ? openings : ["뚜렷한 개고 없음"],
      luckRows,
    };
  } catch {
    return undefined;
  }
}

// 궁합에서 십성 확정표가 다른 사람 서술로 새지 않도록, 확정표 규칙을 사람 이름으로 스코프한다.
function scopeMyeongsikTableRule(facts, name) {
  if (!facts) return facts;
  return {
    ...facts,
    tenGodTableRule: `이 표는 ${name}의 십성 확정표다. ${name}의 십성만 이 표로 판정하고, 다른 사람의 십성에는 절대 쓰지 않는다.`,
  };
}

// 사주 궁합에서 한 사람(본인/상대)의 명식을 프롬프트 factInput에 대칭으로 주입한다.
// 두 사람 모두 클라가 draftResult.sajuCompatibility.{user,partner}.saju로 계산해 넘겨준다(동일 스냅샷 형태).
function buildSajuPersonProfile(request, personEntry, defaultName = "상대") {
  const person = personEntry;
  const personSaju = person?.saju;
  if (!person || !personSaju || personSaju.available !== true) return undefined;
  const name = cleanText(person.name, 40) || defaultName;
  return {
    name,
    gender: cleanText(person.gender, 20),
    birthDate: cleanText(person.birthDate, 20),
    birthTime: person.birthTimeUnknown ? "" : cleanText(person.birthTime, 20),
    birthTimeUnknown: person.birthTimeUnknown === true,
    calendarType: person.calendarType,
    dayMaster: cleanText(personSaju.dayMaster, 80),
    pillars: normalizeSajuFactText(personSaju.pillars),
    fiveElementsBalance: normalizeSajuFactText(personSaju.fiveElements || personSaju.strongElements),
    tenGodsBalance: combineSajuFactText(personSaju.tenGods, personSaju.tenGodSnapshot?.tenGodLabels),
    strongElements: normalizeSajuFactText(personSaju.strongElements),
    monthSeason: combineSajuFactText(personSaju.monthBranch, personSaju.season),
    coreSummary: cleanMultiline(personSaju.coreSummary, 800),
    myeongsikFacts: scopeMyeongsikTableRule(buildFortuneTeaSajuMyeongsikFacts(request, personSaju), name),
  };
}

function buildSajuFactInput(request, saju, rule, fallback) {
  const monthSeason = combineSajuFactText(
    firstSajuFactText(saju, ["monthBranch", "wolji", "monthlyBranch", "monthPillar", "monthPillarText"]),
    firstSajuFactText(saju, ["season", "seasonStrength", "seasonalEnergy", "monthEnergy", "monthlyEnergy", "birthSeason"]),
  );
  const stemBranchRelations = combineSajuFactText(
    firstSajuFactText(saju, ["stemRelations", "heavenlyStemRelations", "ganhap", "stemCombination"]),
    firstSajuFactText(saju, ["branchRelations", "earthlyBranchRelations", "jijiRelations", "relations"]),
    firstSajuFactText(saju, ["combinations", "clashes", "punishments", "harms", "breaks", "hapChungHyeongHaePa"]),
  );
  const luckFlow = combineSajuFactText(
    firstSajuFactText(saju, ["currentLuck", "luckFlow", "luckSummary", "currentLuckSummary"]),
    firstSajuFactText(saju, ["daeun", "daewoon", "majorLuck", "tenYearLuck"]),
    firstSajuFactText(saju, ["seun", "yearLuck", "annualLuck"]),
    firstSajuFactText(saju, ["wolun", "monthLuck", "monthlyLuck"]),
    saju?.summary,
  );
  const tenGodsBalance = combineSajuFactText(
    [saju?.primaryTenGod?.nameKo, ...(saju?.secondaryTenGods || []).map((item) => item.nameKo)].filter(Boolean),
    saju?.tenGodSnapshot?.tenGodLabels,
    firstSajuFactText(saju, ["tenGods", "tenGodBalance", "tenGodStructure"]),
  );
  // 사주 궁합: 본인(selfProfile)과 상대(partnerProfile)를 동일한 완전 명식 형태로 대칭 주입한다.
  // 두 사람 모두 클라가 sajuCompatibility.{user,partner}.saju(동일 스냅샷 형태)로 계산해 넘겨준다.
  const isCompat = (rule?.id === "sajuCompatibility") || normalizeConsultationMode(request?.consultationMode) === "sajuCompatibility";
  const partnerProfile = buildSajuPersonProfile(request, fallback?.sajuCompatibility?.partner, "상대");
  const selfPersonProfile = isCompat ? buildSajuPersonProfile(request, fallback?.sajuCompatibility?.user, "나") : undefined;
  const baseSelfProfile = {
    name: cleanText(request.nickname || saju?.birthSummary?.nickname, 40),
    gender: cleanText(request.gender || saju?.birthSummary?.gender, 20),
    birthDate: cleanText(request.birthDate || saju?.birthSummary?.birthDate, 20),
    birthTime: request.birthTimeUnknown ? "" : cleanText(request.birthTime || saju?.birthSummary?.birthTime, 20),
    birthTimeUnknown: request.birthTimeUnknown === true || saju?.birthSummary?.birthTimeUnknown === true,
    calendarType: request.calendarType || saju?.birthSummary?.calendarType,
    birthPlace: cleanText(request.birthPlace || saju?.birthSummary?.birthPlace, 120),
  };
  // 궁합이고 본인 명식이 확보되면 본인도 상대와 동등한 완전 명식으로 채운다(출생지는 base에서 유지).
  const selfProfile = selfPersonProfile
    ? { ...baseSelfProfile, ...selfPersonProfile, birthPlace: baseSelfProfile.birthPlace }
    : baseSelfProfile;
  const dataCheck = isCompat
    ? {
        selfDayMaster: selfProfile?.dayMaster || "",
        partnerDayMaster: partnerProfile?.dayMaster || "",
        sameDayMaster: Boolean(selfProfile?.dayMaster && partnerProfile?.dayMaster && selfProfile.dayMaster === partnerProfile.dayMaster),
        guidance: "먼저 두 사람의 일간을 대조하라. 일간이 다르면 성향·오행·십성 서술이 서로 달라야 한다. 일간이 같아도 월지·시주·오행 분포·십성 배치는 다르므로 반드시 구분해 서술한다. 본인과 상대 서술이 같아지면 데이터 매핑 오류이니 selfProfile과 partnerProfile을 처음부터 다시 대조한다.",
      }
    : undefined;
  return {
    consultationMode: isCompat ? "sajuCompatibility" : "saju",
    teaId: request.selectedTeaCupId || saju?.teaCup?.id,
    teaName: request.selectedTeaCupName || saju?.teaCup?.name,
    teaCategory: rule.category,
    userQuestion: request.question,
    dataCheck,
    selfProfile,
    partnerProfile,
    sajuFacts: {
      dayMaster: cleanText(saju?.dayMaster, 80),
      pillars: normalizeSajuFactText(saju?.pillars),
      monthSeason,
      fiveElementsBalance: normalizeSajuFactText(saju?.fiveElements || saju?.dominantElements),
      tenGodsBalance,
      strongElements: normalizeSajuFactText(saju?.dominantElements),
      tenGodSnapshot: normalizeSajuFactText(saju?.tenGodSnapshot?.tenGodLabels),
      stemBranchRelations,
      currentLuckSummary: cleanMultiline(luckFlow || saju?.summary, 1200),
      caution: cleanMultiline(saju?.cautionReading || saju?.caution, 800),
      actionPrescription: cleanMultiline(saju?.actionPrescription, 800),
      uncertaintyRule: isCompat
        ? "sajuFacts는 본인(selfProfile)의 명식 사실이다. 상대 명식에는 쓰지 않는다. 비어 있는 항목은 추측하지 말고 확인된 항목끼리만 연결한다."
        : "비어 있는 항목은 추측하지 말고, 확인된 항목끼리만 연결한다.",
    },
    // 명식 심화 사실(십성 확정표·지장간·투간/투출·도충·개고·운 흐름) — 독립 AI 사주 생성 로직 재사용.
    // 궁합에서는 사람별 확정표(selfProfile/partnerProfile.myeongsikFacts)만 쓰고, 전역 확정표는 두지 않는다(유출 방지).
    myeongsikFacts: isCompat ? undefined : buildFortuneTeaSajuMyeongsikFacts(request, saju),
  };
}

// 카드 구조(아르카나/수트/원소/코트)를 cardId 패턴에서 파생한다 — 78장 데이터 수기 편집 없이
// thinkingOrder가 요구하는 비율·편중·원소 근거를 "추론"이 아닌 "입력 사실"로 공급하기 위한 것.
// (클라 덱 id 규칙: major_NN_slug / minor_{suit}_NN — src/features/fortune-tea-house/data/tarotCards.ts)
const TAROT_SUIT_PROFILES = {
  wands: { ko: "완드", element: "불", theme: "추진력과 열정" },
  cups: { ko: "컵", element: "물", theme: "감정과 관계" },
  swords: { ko: "소드", element: "공기", theme: "생각과 갈등" },
  pentacles: { ko: "펜타클", element: "흙", theme: "현실과 자원" },
};
const TAROT_SPREAD_SEQUENCE_RULES = {
  three: "3장은 현재→흐름→조언의 시간 축이다. 현재 카드가 놓은 장면을 흐름 카드가 밀고 가는지 꺾는지 먼저 판정하고, 조언 카드는 그 모멘텀을 살릴지 늦출지의 기준으로 읽는다.",
  five: "5장에서 현재↔상대/상황은 같은 장면의 두 시점 대비이고, 장애↔가능성은 서로 긴장하는 짝이다. 장애 카드가 가능성 카드를 어떻게 제한하는지, 조언 카드가 그 긴장을 어느 쪽으로 중재하는지 연결해 읽는다.",
};

function describeTarotCardStructure(card = {}) {
  const cardId = String(card.cardId || "");
  const suitKey = cardId.includes("_cups_")
    ? "cups"
    : cardId.includes("_swords_")
      ? "swords"
      : cardId.includes("_wands_")
        ? "wands"
        : cardId.includes("_pentacles_")
          ? "pentacles"
          : "";
  const suit = suitKey ? TAROT_SUIT_PROFILES[suitKey] : null;
  const number = Number(card.number);
  return {
    arcana: suit ? "마이너" : "메이저",
    suitKo: suit ? suit.ko : "",
    element: suit ? suit.element : "",
    suitTheme: suit ? suit.theme : "",
    rank: suit && Number.isFinite(number) ? number : undefined,
    isCourt: Boolean(suit) && number >= 11 && number <= 14,
  };
}

function buildTarotSpreadDigest(cards, spread) {
  const structures = cards.map((card) => describeTarotCardStructure(card));
  const majorCount = structures.filter((item) => item.arcana === "메이저").length;
  const suitCounts = {};
  structures.forEach((item) => {
    if (item.suitKo) suitCounts[item.suitKo] = (suitCounts[item.suitKo] || 0) + 1;
  });
  const repeatedSuits = Object.entries(suitCounts).filter(([, count]) => count >= 2).map(([ko, count]) => `${ko} ${count}장`);
  const courtCount = structures.filter((item) => item.isCourt).length;
  const reversedCount = cards.filter((card) => card.orientation === "reversed").length;
  const elements = structures.map((item) => item.element).filter(Boolean);
  const first = cards[0];
  const last = cards[cards.length - 1];
  return {
    majorMinorRatio: `메이저 ${majorCount}장 / 마이너 ${cards.length - majorCount}장${majorCount > cards.length / 2 ? " — 메이저 우세: 개인의 의지보다 큰 흐름이 국면을 끌고 간다" : ""}`,
    suitBalance: repeatedSuits.length
      ? `수트 편중: ${repeatedSuits.join(", ")} — 반복 수트의 주제가 이번 질문의 무게중심이다`
      : "수트 편중 없음 — 주제가 분산되어 있어 카드 사이의 연결이 관건이다",
    courtPresence: courtCount ? `코트 카드 ${courtCount}장 — 특정 인물이나 태도의 영향이 크게 작동한다` : "코트 카드 없음",
    orientationBalance: `정방향 ${cards.length - reversedCount}장 / 역방향 ${reversedCount}장${reversedCount >= Math.ceil(cards.length / 2) && reversedCount > 0 ? " — 역방향 우세: 지연·내면화·재조정의 결이 강하다" : ""}`,
    elementFlow: elements.length
      ? `마이너 원소 구성(순서대로): ${elements.join(" → ")} (완드=불, 컵=물, 소드=공기, 펜타클=흙)`
      : "마이너 원소 없음 — 메이저 원형 에너지 중심의 배열",
    firstToLast: first && last && cards.length > 1
      ? `첫 카드 ${first.nameKo}(${tarotOrientationLabel(first.orientation)})에서 마지막 카드 ${last.nameKo}(${tarotOrientationLabel(last.orientation)})로 흐르는 변화를 하나의 서사로 잇는다`
      : "",
    sequenceRule: TAROT_SPREAD_SEQUENCE_RULES[spread] || TAROT_SPREAD_SEQUENCE_RULES.three,
  };
}

function buildTarotFactInput(request, fallback, rule) {
  const spread = normalizeTarotSpread(fallback?.tarotSpread || request?.tarotSpread);
  const cards = Array.isArray(fallback?.tarotSpreadCards) && fallback.tarotSpreadCards.length
    ? fallback.tarotSpreadCards
    : buildMinimalTarotSpreadCards(spread, fallback?.tarot || {});
  const selectedCard = fallback?.tarot || cards[0] || {};
  const direction = tarotOrientationLabel(selectedCard.orientation);
  return {
    consultationMode: "tarot",
    question: cleanMultiline(request?.question || fallback?.questionSummary, 700),
    category: rule.category,
    concept: rule.concept,
    spread,
    spreadReadingRule: spread === "five"
      ? "5장 배열은 현재, 상대/상황, 장애, 가능성, 조언의 역할을 구분해 연결한다."
      : "3장 배열은 현재, 흐름, 조언의 시간성과 행동 방향을 연결한다.",
    selectedCard: {
      cardId: cleanText(selectedCard.cardId, 120),
      nameKo: cleanText(selectedCard.nameKo, 80),
      nameEn: cleanText(selectedCard.nameEn, 80),
      orientation: selectedCard.orientation,
      orientationLabel: direction,
      keywords: Array.isArray(selectedCard.keywords) ? selectedCard.keywords.slice(0, 6) : [],
      traditionalMeaning: cleanMultiline(selectedCard.meaning, 700),
      orientationInterpretation: selectedCard.orientation === "reversed"
        ? "역방향은 카드의 힘이 막히거나 과잉되거나 안쪽으로 접힌 상태다. 지연, 재조정, 경계, 숨은 감정을 함께 본다."
        : "정방향은 카드의 상징이 비교적 자연스럽게 드러나는 상태다. 강점, 현재 흐름, 사용할 수 있는 자원을 함께 본다.",
    },
    spreadDigest: buildTarotSpreadDigest(cards, spread),
    spreadCards: cards.map((card, index) => {
      const structure = describeTarotCardStructure(card);
      return {
        order: index + 1,
        positionId: cleanText(card.positionId, 80),
        positionLabel: cleanText(card.positionLabel, 80),
        positionMeaning: cleanMultiline(card.positionMeaning, 240),
        cardId: cleanText(card.cardId, 120),
        nameKo: cleanText(card.nameKo, 80),
        nameEn: cleanText(card.nameEn, 80),
        orientation: card.orientation,
        orientationLabel: tarotOrientationLabel(card.orientation),
        arcana: structure.arcana,
        suit: structure.suitKo || undefined,
        element: structure.element || undefined,
        suitTheme: structure.suitTheme || undefined,
        rank: structure.rank,
        isCourt: structure.isCourt || undefined,
        keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 5) : [],
        traditionalMeaning: cleanMultiline(card.meaning, 500),
        existingReading: cleanMultiline(card.reading, 500),
      };
    }),
    // 어떤 카드 조합을 풀어야 하는지 미리 확정해 준다 — 모델이 조합을 고르거나 세지 않게 한다.
    interactionPairs: buildTarotInteractionPairIndexes(cards.length).map(([a, b]) => ({
      pair: `${cleanText(cards[a]?.nameKo, 80)} + ${cleanText(cards[b]?.nameKo, 80)}`,
      positions: `${cleanText(cards[a]?.positionLabel, 40)} → ${cleanText(cards[b]?.positionLabel, 40)}`,
    })),
    heartScentCatalog: buildHeartScentPromptCatalog(),
    categoryReadingFocus: rule.focus,
    requiredCategoryTerms: rule.requiredTerms,
    uncertaintyRule: "입력된 카드와 위치 의미 밖의 카드를 만들지 않는다. 상대 마음, 재회, 금전 결과는 확정하지 않고 카드가 보여주는 조건과 선택 방향으로 말한다.",
  };
}

function sukuyoDistanceGuide(distanceTier, distanceLabel) {
  const label = cleanText(distanceLabel, 40) || "확인된 거리";
  if (distanceTier === "same") return `${label}는 서로가 거울처럼 비치기 쉬워 익숙함과 방심을 함께 살핀다.`;
  if (distanceTier === "near") return `${label}는 가까운 거리라 끌림이 빠르지만 말투와 속도 차이에 예민해질 수 있다.`;
  if (distanceTier === "far") return `${label}는 먼 거리라 서로를 이해하는 데 시간이 필요하고, 약속의 간격을 분명히 해야 안정된다.`;
  return `${label}는 중간 거리라 끌림과 현실 조율이 함께 작동하므로 가까워지는 속도를 의식적으로 맞춘다.`;
}

function sukuyoCategoryGuide(value) {
  const source = cleanText(value, 120);
  if (/재회|다시|연락/.test(source)) return "재회 질문은 가능성을 단정하지 말고, 끊어진 이유와 다시 연락할 조건, 반복하지 말아야 할 패턴을 분리한다.";
  if (/결혼|부부|배우자|가족/.test(source)) return "결혼/부부 질문은 생활 리듬, 돈과 책임, 가족 문제, 오래 가는 합의 방식을 중심으로 조언한다.";
  if (/사업|직장|동료|일|협업|파트너/.test(source)) return "사업/직장 질문은 의사결정 방식, 권한과 책임, 갈등 관리, 서로의 강점을 쓰는 방식을 중심으로 조언한다.";
  if (/친구|우정|지인/.test(source)) return "친구/동료 질문은 신뢰가 쌓이는 방식, 협력의 거리, 피해야 할 역할 분담을 중심으로 조언한다.";
  return "연애 질문은 애정 표현 방식, 연락과 거리감, 불안이 커지는 지점, 오래 가기 위한 태도를 중심으로 조언한다.";
}

function sukuyoRelationGuideText(relationType) {
  if (relationType === "영친") return "영친은 친밀감과 보호감이 잘 살아나지만, 너무 편해서 서로의 고마움을 놓치는 순간을 함께 본다.";
  if (relationType === "안괴") return "안괴는 강한 끌림과 흔들림이 함께 오므로, 상처를 키우는 속도와 회복 가능한 거리 조절을 함께 본다.";
  if (relationType === "업태") return "업태는 오래된 숙제처럼 반복되는 인연의 결을 보되, 현실에서 같은 장면을 되풀이하지 않는 선택을 강조한다.";
  if (relationType === "우쇠") return "우쇠는 힘의 균형과 온도 차이를 읽고, 보호와 의존이 한쪽으로 기울지 않게 조율한다.";
  if (relationType === "위성" || relationType === "성위") return "성위 계열은 성장과 역할 차이를 읽되, 한쪽이 일방적으로 고치는 사람이나 배우는 사람으로 굳지 않게 조언한다.";
  if (relationType === "명") return "명 관계는 닮은 리듬과 익숙함을 읽고, 방심 때문에 변화 신호를 놓치지 않도록 조언한다.";
  return "전달받은 관계명을 우선하고, 좋고 나쁨보다 실제 관계에서 나타나는 끌림과 충돌 방식을 풀어준다.";
}

function buildSukuyoFactInput(request, fallback) {
  const compatibility = fallback?.sukuyoCompatibility || {};
  const relationDetail = compatibility.relationDetail || {};
  const relationshipType = cleanText(compatibility.relationshipType || request?.sukuyo?.relationshipType || request?.selectedTeaCupTopic || fallback?.teaCup?.topic, 100) || "관계 상담";
  const relationType = cleanText(compatibility.relationType, 40) || "확인된 관계";
  return {
    consultationMode: "sukuyo",
    question: cleanMultiline(request?.question || fallback?.questionSummary, 700),
    relationshipType,
    focus: cleanText(compatibility.focus || request?.sukuyo?.focus || fallback?.teaCup?.topic || request?.selectedTeaCupTopic, 100) || "관계의 흐름",
    currentSituation: cleanMultiline(compatibility.currentSituation || request?.sukuyo?.currentSituation, 500),
    user: {
      name: cleanText(compatibility.user?.name, 40) || "나",
      birthDate: cleanText(compatibility.user?.birthDate, 20),
      calendarType: compatibility.user?.calendarType,
      gender: cleanText(compatibility.user?.gender, 20),
      sukuyoName: cleanText(compatibility.user?.sukuyoName, 40),
      sukuyoHanja: cleanText(compatibility.user?.sukuyoHanja, 20),
      element: cleanText(compatibility.user?.element, 20),
      direction: cleanText(compatibility.user?.direction, 40),
      keywords: Array.isArray(compatibility.user?.keywords) ? compatibility.user.keywords.slice(0, 5) : [],
      calculationBasis: compatibility.calculationBasis?.user || {},
    },
    partner: {
      name: cleanText(compatibility.partner?.name, 40) || "상대",
      birthDate: cleanText(compatibility.partner?.birthDate, 20),
      calendarType: compatibility.partner?.calendarType,
      gender: cleanText(compatibility.partner?.gender, 20),
      sukuyoName: cleanText(compatibility.partner?.sukuyoName, 40),
      sukuyoHanja: cleanText(compatibility.partner?.sukuyoHanja, 20),
      element: cleanText(compatibility.partner?.element, 20),
      direction: cleanText(compatibility.partner?.direction, 40),
      keywords: Array.isArray(compatibility.partner?.keywords) ? compatibility.partner.keywords.slice(0, 5) : [],
      calculationBasis: compatibility.calculationBasis?.partner || {},
    },
    relation: {
      relationType,
      relationTypeHan: cleanText(compatibility.relationTypeHan, 20),
      relationGuide: sukuyoRelationGuideText(relationType),
      distanceLabel: cleanText(compatibility.distanceLabel, 40),
      distanceTier: compatibility.distanceTier,
      distanceGuide: sukuyoDistanceGuide(compatibility.distanceTier, compatibility.distanceLabel),
      shortestDistance: compatibility.shortestDistance,
      forwardDistance: compatibility.forwardDistance,
      reverseDistance: compatibility.reverseDistance,
      typeAToB: cleanText(relationDetail.typeAToB, 80),
      typeBToA: cleanText(relationDetail.typeBToA, 80),
      userToPartnerMeaning: cleanText(relationDetail.userToPartnerMeaning, 120),
      partnerToUserMeaning: cleanText(relationDetail.partnerToUserMeaning, 120),
      directionalDistanceGuide: cleanText(relationDetail.directionalDistanceGuide, 300),
      intensity: cleanText(relationDetail.intensity, 40),
      direction: cleanText(compatibility.direction, 80),
    },
    scores: compatibility.scores || {},
    compatibilityIndex: compatibility.compatibilityIndex,
    elementHarmony: compatibility.elementHarmony || {},
    strengths: Array.isArray(compatibility.strengths) ? compatibility.strengths.slice(0, 5) : [],
    cautions: Array.isArray(compatibility.cautions) ? compatibility.cautions.slice(0, 5) : [],
    adviceKeywords: Array.isArray(compatibility.adviceKeywords) ? compatibility.adviceKeywords.slice(0, 6) : [],
    roleGuide: compatibility.roleGuide || {},
    categoryAdviceRule: sukuyoCategoryGuide(`${relationshipType} ${request?.question || ""} ${compatibility.focus || ""}`),
    uncertaintyRule: "입력된 숙, 관계 유형, 거리, 방향별 관계 밖의 계산값은 만들지 않는다. 상대 속마음과 관계 결말은 단정하지 않고 조건과 조율 방식으로 말한다.",
  };
}

function sajuHasTenGod(saju, pattern) {
  const joined = [
    saju?.primaryTenGod?.nameKo,
    ...(saju?.secondaryTenGods || []).map((item) => item.nameKo),
    ...(saju?.tenGodSnapshot?.tenGodLabels || []),
    ...(saju?.keyPoints || []),
  ].filter(Boolean).join(" ");
  return pattern.test(joined);
}

function sajuElementValue(saju, key) {
  const elements = saju?.fiveElements;
  if (Array.isArray(elements)) {
    const item = elements.find((element) => element?.key === key || element?.nameKo === key);
    return Number(item?.value || 0);
  }
  if (elements && typeof elements === "object") {
    const direct = elements[key];
    if (direct && typeof direct === "object") return Number(direct.value || 0);
    if (direct !== undefined) return Number(direct || 0);
    const item = Object.values(elements).find((element) => element && typeof element === "object" && (element.key === key || element.nameKo === key));
    return Number(item?.value || 0);
  }
  return 0;
}

function buildSajuCategoryGauges(request, saju = {}) {
  const rule = resolveSajuCategoryRule(request);
  const factReason = [
    saju?.dayMaster ? `일간 ${saju.dayMaster}` : "",
    Array.isArray(saju?.dominantElements) && saju.dominantElements.length ? `대표 기운 ${saju.dominantElements.join(" · ")}` : "",
    saju?.primaryTenGod?.nameKo ? `십성 ${saju.primaryTenGod.nameKo}` : "",
  ].filter(Boolean).join(", ");
  return rule.gauges.map(([label, tone, base, description], index) => {
    let value = Number(base) || 50;
    if (/압박|긴장|경계/.test(label) && sajuHasTenGod(saju, /정관|편관/)) value += 10;
    if (/생각|미련|기다림|신중/.test(label) && sajuHasTenGod(saju, /정인|편인/)) value += 10;
    if (/표현|실행|호감|수익화/.test(label) && sajuHasTenGod(saju, /식신|상관/)) value += 10;
    if (/재물|돈|소비|수익/.test(label) && sajuHasTenGod(saju, /정재|편재/)) value += 10;
    if (/충돌|소비|경쟁/.test(label) && sajuHasTenGod(saju, /비견|겁재/)) value += 8;
    if (/회복|안정|자기돌봄/.test(label) && (sajuElementValue(saju, "earth") || sajuElementValue(saju, "토")) >= 24) value += 6;
    if (request.birthTimeUnknown === true || saju?.birthSummary?.birthTimeUnknown === true) value -= index % 2 === 0 ? 2 : 4;
    value = Math.max(8, Math.min(96, Math.round(value)));
    return {
      label,
      value,
      description: `${description}${factReason ? ` 근거는 ${factReason}의 흐름입니다.` : " 확인된 명식 범위 안에서만 산출했습니다."}`,
      tone,
    };
  });
}

function buildCategorySajuDeepSections(request, saju = {}, rule = resolveSajuCategoryRule(request)) {
  const facts = buildSajuFactInput(request, saju, rule);
  const nickname = cleanText(request.nickname || saju?.birthSummary?.nickname, 40) || "손님";
  const question = cleanMultiline(request.question, 700) || "지금 이 흐름을 어떻게 봐야 할까요?";
  const dayMaster = facts.sajuFacts.dayMaster || "드러난 일간";
  const elements = facts.sajuFacts.fiveElementsBalance || "오행 균형";
  const tenGods = facts.sajuFacts.tenGodsBalance || "십성 흐름";
  const monthSeason = facts.sajuFacts.monthSeason || "입력된 범위에서 확인되는 계절감";
  const relations = facts.sajuFacts.stemBranchRelations || "천간과 지지의 세부 관계는 확인된 범위 안에서만";
  const currentLuck = facts.sajuFacts.currentLuckSummary || "현재 운의 흐름은 질문의 결 안에서 조심스럽게 살핍니다.";
  const timeLimit = facts.selfProfile.birthTimeUnknown ? "출생시간이 비어 있어 시주의 세밀한 해석은 제한하고, 확인된 생년월일과 질문의 결을 중심으로 봅니다." : "출생시간까지 놓고 반응 방식과 하루의 리듬을 함께 살핍니다.";
  const angleGuides = [
    `${dayMaster}이 ${monthSeason} 속에서 어떤 반응을 먼저 드러내는지 살피면, 이 질문이 단순한 걱정이 아니라 오래 쌓인 선택 기준과 닿아 있음을 볼 수 있습니다.`,
    `${elements}의 치우침과 보완점은 마음이 빨리 뜨거워지는 자리와 오히려 굳어지는 자리를 함께 비춥니다.`,
    `${tenGods}은 손님이 표현하고, 버티고, 책임지려는 방식이 어디에서 강해지는지 알려 줍니다.`,
    `${relations} 보이는 흐름은 관계와 현실 조건이 부드럽게 맞물리는지, 잠시 거리를 두어야 하는지를 가늠하게 합니다.`,
    `${currentLuck} 이 운은 결과를 확정하기보다 지금 어떤 선택이 덜 소모적인지 묻고 있습니다.`,
  ];
  const actionGuides = [
    "오늘은 질문을 한 문장으로 줄이고, 바로 확인할 수 있는 사실 하나와 아직 마음이 해석한 부분 하나를 나누어 적어보세요.",
    "말을 꺼내야 한다면 결론을 요구하기보다 확인하고 싶은 조건 하나만 부드럽게 묻는 편이 좋습니다.",
    "일이나 돈의 문제라면 감정의 확신보다 날짜, 금액, 역할처럼 눈에 보이는 기준을 먼저 세우세요.",
    "관계에서는 내 마음이 원하는 속도와 상대가 실제로 보여 준 속도를 분리해 보는 것이 필요합니다.",
    "몸과 마음이 지친 날에는 큰 결정을 미루고 수면, 식사, 정리 같은 기본 리듬을 먼저 회복하세요.",
  ];
  const sectionCount = rule.requiredSections.length;
  return rule.requiredSections.map((title, index) => {
    const focus = rule.focus[index % rule.focus.length];
    // 반복 경감: 같은 오프너·명식 사실·행동 문장이 아홉 섹션에 통째로 되풀이되지 않게
    // 역할별로 배치한다 — 오프너/연이의 태도는 첫 섹션, 명식 사실은 앞쪽 두 곳, 행동 조언은 처방 계열 마지막 섹션들만.
    const opener = index === 0 ? `${nickname}의 질문 "${question}"은 ${rule.category}의 찻잔에서 ${rule.concept}으로 열립니다. ` : "";
    const factLine = index <= 2 ? `명식의 중심은 ${dayMaster}이고, 오행은 ${elements}, 십성은 ${tenGods}의 결로 드러납니다. ${timeLimit} ` : "";
    const angle = index < angleGuides.length ? `${angleGuides[index]} ` : "";
    const yeoniLine = index === 0 ? " 연이는 여기서 결론을 단정하지 않고, 손님이 실제로 확인할 수 있는 신호와 마음이 만들어낸 해석을 나누어 봅니다." : "";
    const action = index >= sectionCount - 3 ? ` ${actionGuides[index % actionGuides.length]}` : "";
    return {
      id: `${rule.resultKey}-${index + 1}`,
      title,
      tone: index <= 1 ? "summary" : index <= 3 ? "element" : index <= 5 ? "flow" : index <= 7 ? "advice" : "caution",
      body: `${opener}이 대목에서는 ${title}을 먼저 보겠습니다. ${factLine}${angle}${focus}을 기준으로 보면 지금 필요한 것은 감정을 키우는 말보다 조건, 경계, 다음 행동을 분명히 세우는 일입니다.${yeoniLine}${action}`,
    };
  });
}

function buildFallbackSajuDeepSections(request, saju = {}) {
  const categoryRule = resolveSajuCategoryRule(request);
  if (categoryRule.id !== "general") return buildCategorySajuDeepSections(request, saju, categoryRule);

  const nickname = cleanText(request.nickname, 40) || cleanText(saju.birthSummary?.nickname, 40) || "손님";
  const question = cleanMultiline(request.question, 700) || "오늘 내 마음이 향하는 곳은 어디인가요?";
  const birthDate = cleanText(request.birthDate || saju.birthSummary?.birthDate, 40) || "확인된 생년월일";
  const birthTimeUnknown = request.birthTimeUnknown === true || !cleanText(request.birthTime || saju.birthSummary?.birthTime, 20);
  const timeGuide = birthTimeUnknown
    ? "출생시간이 미상이라 시주의 세밀한 결은 제한적으로 보고, 생년월일과 질문 위에 드러난 큰 흐름을 중심으로 살핍니다."
    : `출생시간 ${cleanText(request.birthTime || saju.birthSummary?.birthTime, 20)}의 결까지 함께 놓고, 하루의 리듬과 반응 방식을 더 촘촘히 살핍니다.`;
  const dayMaster = cleanText(saju.dayMaster, 80) || "드러난 일간";
  const tenGod = cleanText(saju.primaryTenGod?.nameKo, 80) || "오늘 드러난 십성";
  const elements = Array.isArray(saju.dominantElements) && saju.dominantElements.length ? saju.dominantElements.join(" · ") : "오행의 균형";
  const caution = cleanMultiline(saju.cautionReading || saju.caution, 700) || "한쪽 결론으로 급히 닫기보다, 감정과 기준을 나누어 보아야 합니다.";
  const action = cleanMultiline(saju.actionPrescription, 700) || "오늘은 마음이 반복해서 향하는 장면을 적고, 그 안에서 지킬 기준 하나만 조용히 골라보세요.";
  const sections = [
    {
      id: "summary",
      title: "핵심 요약",
      tone: "summary",
      body: `${nickname}의 질문은 "${question}"이라는 결로 찻잔 위에 올라왔습니다. ${birthDate}의 흐름을 기준으로 보면, 지금은 결론을 서두르기보다 반복되어 온 마음의 반응을 먼저 살피는 때입니다. ${timeGuide} 오늘 상담의 핵심은 상대나 상황의 답을 억지로 끌어내는 것이 아니라, 내가 오래 붙잡은 기대와 실제로 확인된 신호를 나누어 보는 데 있습니다. 그 구분이 생기면 마음은 덜 흔들리고 다음 행동은 더 조용히 선명해집니다.`,
    },
    {
      id: "temperament",
      title: "타고난 기질",
      tone: "summary",
      body: `${dayMaster}을 중심에 두면, ${nickname}은 겉으로는 차분해 보여도 마음 안쪽에서는 오래 관찰하고 의미를 찾는 결이 강하게 떠오릅니다. 애매한 말, 늦어지는 답, 미완성된 약속이 있으면 그냥 넘기기보다 왜 그런지 마음속에서 다시 펼쳐 보는 편입니다. 이 성향은 피곤함이 되기도 하지만, 사람과 일의 미묘한 온도를 빨리 알아차리는 감각이기도 합니다. 다만 감각이 빠른 만큼 확인되지 않은 장면까지 마음이 먼저 완성하지 않도록 속도를 낮추는 연습이 필요합니다.`,
    },
    {
      id: "elements",
      title: "오행 균형",
      tone: "element",
      body: `${elements}의 흐름은 오늘 상담에서 마음이 어디로 몰리고 어디가 비어 있는지를 보여줍니다. 강한 기운은 추진력과 확신을 주지만, 지나치면 내가 정한 답만 보고 상대의 속도나 현실의 제약을 놓칠 수 있습니다. 약한 기운은 실패의 예고가 아니라 의식적으로 돌보아야 할 자리입니다. 말이 급해질 때는 수 기운처럼 한 박자 식히고, 마음이 굳을 때는 목 기운처럼 작은 대안을 열어 두세요. 그렇게 해야 사주의 균형이 실제 하루의 선택으로 내려옵니다.`,
    },
    {
      id: "ten-gods",
      title: "십성 구조",
      tone: "tenGod",
      body: `${tenGod}은 ${nickname}이 관계와 선택 앞에서 어떤 얼굴로 자신을 지키는지 보여줍니다. 책임을 크게 느끼는 흐름에서는 마음이 진중해지고 약속을 쉽게 흘리지 않지만, 동시에 내가 감당해야 한다는 압박도 커질 수 있습니다. 표현이 앞서는 흐름에서는 솔직함이 장점으로 드러나지만, 마음이 뜨거운 순간에는 상대가 받아들일 시간을 놓칠 수 있습니다. 십성은 결론을 대신 정하지 않습니다. 다만 지금 어떤 태도가 과해지고 어떤 태도가 부족한지 조용히 가리킵니다.`,
    },
    {
      id: "strength",
      title: "강점",
      tone: "advice",
      body: `${nickname}의 강점은 쉽게 체념하지 않고 마음의 이유를 끝까지 찾으려는 힘입니다. 단순히 좋다, 싫다로 닫지 않고 그 안에 어떤 기대와 두려움이 섞였는지 보려는 시선이 있습니다. 이 힘은 관계에서도 일에서도 중요한 기준이 됩니다. 사람의 말 뒤에 숨은 온도를 읽고, 상황이 흐릴 때도 작은 단서를 모아 방향을 세울 수 있기 때문입니다. 오늘은 이 강점을 불안한 추측이 아니라 차분한 관찰로 쓰는 편이 좋습니다.`,
    },
    {
      id: "weakness",
      title: "반복되는 약점",
      tone: "caution",
      body: `반복해서 조심할 약점은 마음이 흔들릴수록 확인되지 않은 이야기까지 먼저 완성해 버리는 흐름입니다. 답이 늦거나 분위기가 달라지면, 실제로 들은 말보다 마음속 해석이 더 커질 수 있어요. 이때 바로 묻거나 몰아붙이면 원하는 답을 듣기보다 방어적인 반응을 부를 수 있습니다. 사주는 이 약점을 탓하지 않고, 멈춰야 할 순간을 알려줍니다. 감정이 올라온 날에는 메시지 하나도 바로 보내지 말고 한 번 적어 둔 뒤 다음 날 다시 읽어 보세요.`,
    },
    {
      id: "current-flow",
      title: "현재 운의 흐름",
      tone: "flow",
      body: `현재 운은 오래 묻어 둔 감정이 표면으로 올라오는 흐름에 가깝습니다. 그래서 평소라면 넘겼을 말이 마음에 남고, 작은 신호에도 의미를 붙이고 싶어질 수 있습니다. 이 흐름은 무조건 나쁜 것이 아닙니다. 그동안 흐릿했던 기준을 다시 세울 기회가 되기도 합니다. 다만 운이 감정을 밀어 올릴 때는 선택도 빨라지기 쉬우니, 지금 필요한 것은 한 번의 큰 결단보다 질문을 선명하게 줄이는 일입니다. 무엇을 확인해야 마음이 안전한지 먼저 보세요.`,
    },
    {
      id: "life-rhythm",
      title: "일 · 돈 · 관계 · 건강 리듬",
      tone: "flow",
      body: `일의 자리에서는 감정의 기세보다 순서가 중요합니다. 해야 할 일을 작게 나누면 압박이 줄고, 결과도 더 안정적으로 쌓입니다. 돈의 자리에서는 기분을 달래기 위한 소비나 성급한 약속을 조심하세요. 관계에서는 서운함을 오래 참다가 한 번에 쏟기보다, 덜 뜨거운 말로 자주 확인하는 편이 좋습니다. 건강 리듬은 수면, 소화, 어깨와 목의 긴장처럼 기본 회복력이 중요하게 떠오릅니다. 몸이 지치면 마음은 더 쉽게 단정으로 기울어집니다.`,
    },
    {
      id: "caution-period",
      title: "앞으로 조심할 시기",
      tone: "caution",
      body: `${caution} 특히 마음이 급해지는 날에는 되돌리기 어려운 말, 계약, 결제, 이별이나 재회에 관한 최종 통보를 바로 꺼내지 않는 편이 좋습니다. 사주에서 조심할 시기는 무언가가 반드시 나빠지는 시간이 아니라, 내가 내 마음을 과하게 믿고 한쪽으로 치우치기 쉬운 시간입니다. 하루를 넘긴 뒤에도 같은 마음이라면 그때 움직여도 늦지 않습니다. 기다림은 포기가 아니라 판단을 맑게 하는 작은 의식입니다.`,
    },
    {
      id: "strategy",
      title: "실천 전략",
      tone: "advice",
      body: `${action} 여기에 한 가지를 더 보태면, 오늘의 질문을 '상대가 어떻게 생각할까' 또는 '결과가 어떻게 될까'에서 '나는 무엇을 확인해야 마음이 안전할까'로 바꾸어 보세요. 그렇게 질문이 바뀌면 행동도 달라집니다. 연락을 하더라도 답을 강요하는 말보다 확인하고 싶은 한 가지를 부드럽게 묻는 말이 좋습니다. 일이나 돈의 문제라면 감정으로 판단하지 말고 숫자, 날짜, 약속처럼 눈에 보이는 기준을 먼저 놓으세요.`,
    },
    {
      id: "one-line",
      title: "오늘의 한 문장 조언",
      tone: "advice",
      body: `오늘은 답을 서두르기보다, 내 마음이 오래 머문 이유와 지금 지켜야 할 기준을 한 잔의 차처럼 천천히 나누어 보세요. 마음은 빠르게 달려가도 운은 조용히 자리를 잡습니다. 그 조용한 자리에서 손님이 고른 한 걸음이 가장 오래 남습니다.`,
    },
  ];
  const expansions = {
    summary: "이 흐름에서는 좋은 운과 나쁜 운을 단순히 가르는 것보다, 손님이 어떤 마음으로 같은 장면을 반복해서 바라보는지가 더 중요합니다. 질문 속에는 이미 답을 재촉하는 마음과 다치고 싶지 않은 마음이 함께 머물러 있어요. 그래서 오늘의 상담은 미래를 확정하는 말보다, 지금 손님이 선택의 중심을 다시 잡을 수 있도록 기준을 밝히는 쪽으로 열립니다.",
    temperament: "이 기질은 혼자 있을 때 더 선명해집니다. 겉으로는 괜찮다고 말해도 속으로는 상대의 표정, 말투, 지난 약속의 흐름을 다시 맞춰 보며 마음의 지도를 그립니다. 그 섬세함이 손님을 지켜 준 시간도 많았지만, 때로는 쉬어야 할 밤까지 생각이 계속 움직이게 만들었을 수 있습니다. 오늘은 감각을 믿되, 감각이 곧 결론은 아니라는 점을 함께 기억해야 합니다.",
    elements: "오행은 손님의 하루 안에서도 작게 드러납니다. 목은 새 선택을 열고, 화는 표현과 열기를 올리며, 토는 현실적인 안정감을 붙잡고, 금은 기준과 정리를 세우며, 수는 감정과 직감을 깊게 만집니다. 지금 어느 기운이 강하든 한 가지만 더 키우면 균형이 아니라 과열이 됩니다. 부족한 기운을 탓하기보다 오늘 할 수 있는 작은 보완으로 옮기는 것이 좋습니다.",
    "ten-gods": "십성의 구조는 사람을 한 가지 성격으로 묶는 틀이 아닙니다. 오히려 같은 사람 안에서도 책임지는 얼굴, 표현하는 얼굴, 지키는 얼굴, 기대는 얼굴이 언제 앞에 나오는지를 보여줍니다. 지금 질문에서는 그중 어떤 얼굴이 너무 오래 앞에 서 있었는지 살피는 일이 중요합니다. 한 얼굴만 계속 쓰면 마음이 지치고, 다른 가능성을 보지 못하게 됩니다.",
    strength: "이 강점은 상대를 이해하려는 마음에서도 드러나지만, 자기 삶을 다시 정돈하려는 힘으로도 이어집니다. 손님은 흔들리는 중에도 완전히 무너지기보다 의미를 붙잡고 다시 일어설 단서를 찾는 편입니다. 그러니 오늘 필요한 조언은 무작정 참고 기다리라는 말이 아닙니다. 이미 가진 감각을 현실의 언어로 바꾸고, 나를 덜 소모시키는 방식으로 쓰라는 말에 가깝습니다.",
    weakness: "이 약점은 사랑이나 관계에서만 나타나는 것이 아니라 일, 돈, 가족과의 약속에서도 비슷하게 떠오를 수 있습니다. 내가 더 잘했어야 했나, 지금이라도 붙잡아야 하나, 혹은 완전히 끊어야 하나처럼 양끝으로 마음이 흔들리는 순간이 있습니다. 그럴수록 중간의 선택지를 일부러 만들어야 합니다. 오늘 보내지 않기, 오늘 결제하지 않기, 오늘 단정하지 않기가 때로는 가장 큰 보호가 됩니다.",
    "current-flow": "운이 움직이는 시기에는 바깥 사건보다 내 반응이 먼저 크게 느껴질 때가 많습니다. 누군가의 한마디가 오래 남거나, 별일 아닌 변화에도 마음이 먼저 대비하려 할 수 있습니다. 이럴 때는 억지로 긍정하려고 애쓰기보다 감정의 이름을 정확히 붙이는 편이 더 낫습니다. 서운함인지, 두려움인지, 기대인지, 자존심인지 구분되면 같은 상황도 덜 무겁게 보입니다.",
    "life-rhythm": "특히 관계와 건강 리듬은 서로 이어져 있습니다. 잠을 못 자거나 몸이 굳어 있으면 상대의 말도 더 날카롭게 들리고, 작은 침묵도 거절처럼 느껴질 수 있습니다. 그래서 오늘의 운을 좋게 쓰는 방법은 거창한 의식보다 몸을 안정시키는 기본 행동에 있습니다. 따뜻한 물, 짧은 산책, 늦은 밤의 메시지 보류처럼 작은 선택이 운의 결을 부드럽게 바꿉니다.",
    "caution-period": "조심할 시기를 지나갈 때 가장 위험한 것은 불운 자체가 아니라 마음이 급해져 스스로를 몰아붙이는 태도입니다. 지금 당장 답을 얻지 못하면 모든 것이 끝날 것 같은 느낌이 올라올 수 있지만, 실제 운은 그렇게 한순간에 닫히지 않습니다. 손님에게 필요한 것은 겁을 먹는 일이 아니라, 중요한 결정을 하루 더 넓은 시야에서 보는 여유입니다.",
    strategy: "실천은 작을수록 오래 갑니다. 오늘 바로 할 일은 세 가지를 넘기지 않는 편이 좋습니다. 첫째, 질문을 한 문장으로 줄입니다. 둘째, 확인된 사실과 추측을 나눕니다. 셋째, 내일 아침에도 같은 마음인지 다시 봅니다. 이 세 가지를 지나고도 마음이 선명하다면 그때는 말이나 행동이 덜 흔들립니다. 사주는 손님의 발걸음을 대신 걷지 않지만, 어느 길이 덜 다치게 이어지는지는 비춰 줍니다.",
    "one-line": "그 한 문장을 마음에 두고 오늘 밤을 지나 보세요. 운은 손님을 재촉하지 않습니다. 지금 필요한 것은 완벽한 확답이 아니라, 내 안의 불안을 조금 덜어 내고도 선택할 수 있다는 감각입니다. 그 감각이 돌아오면 같은 질문도 더 부드럽고 정확한 방향으로 열립니다.",
  };
  const detailExpansions = {
    summary: "손님이 이미 알고 있는 느낌과 사주가 비추는 흐름이 만나는 지점은, 지금 당장 모든 것을 해결하라는 압박이 아니라 마음의 순서를 다시 세우라는 신호입니다. 먼저 내 감정의 이름을 붙이고, 그다음 현실에서 확인할 수 있는 한 가지를 고르면 충분합니다.",
    temperament: "누군가에게는 이 섬세함이 예민함으로 보일 수 있지만, 운의 자리에서는 그것이 중요한 감지력으로 드러납니다. 다만 감지한 것을 바로 판단으로 옮기면 마음이 지치니, 느낀 것과 결정한 것을 구분해 두는 습관이 필요합니다.",
    elements: "오늘 부족하게 느껴지는 기운은 하루아침에 채워야 하는 숙제가 아닙니다. 말의 속도를 늦추고, 정리되지 않은 공간을 조금 치우고, 늦은 밤의 불안을 잠시 덮어 두는 작은 행동이 오행의 균형을 현실로 옮기는 첫걸음입니다.",
    "ten-gods": "십성은 손님의 마음 안에서 어떤 역할이 앞장서는지 보여주는 등불과 같습니다. 너무 책임지려는 얼굴이 앞서면 쉬어야 하고, 너무 숨으려는 얼굴이 앞서면 작게 표현해야 합니다. 중요한 것은 어느 얼굴도 버리지 않는 균형입니다.",
    strength: "강점은 조용할 때 더 잘 살아납니다. 남에게 보이기 위한 확신보다, 스스로 납득할 수 있는 기준을 찾을 때 손님의 운은 안정됩니다. 오늘은 큰 선언보다 작고 정확한 정리가 더 큰 힘을 냅니다.",
    weakness: "마음이 양끝으로 달릴 때는 가운데 선택지를 일부러 써 보세요. 지금 묻지 않기, 오늘 결정하지 않기, 내일 다시 확인하기 같은 작은 유예가 관계와 상황을 무너뜨리지 않고 지켜 주는 완충이 됩니다.",
    "current-flow": "이 흐름은 감정을 외면하라는 뜻이 아닙니다. 오히려 감정이 올라오는 이유를 더 정직하게 보라는 뜻입니다. 다만 그 감정을 곧바로 행동으로 바꾸기 전에, 내 몸과 마음이 충분히 쉬었는지 먼저 살펴야 합니다.",
    "life-rhythm": "일과 돈은 기록으로 안정되고, 관계는 말의 온도로 안정되며, 건강은 규칙으로 안정됩니다. 세 영역은 따로 움직이는 듯해도 손님의 하루 안에서는 하나의 흐름으로 이어집니다. 가장 흐트러진 한 곳만 정리해도 나머지가 덜 흔들립니다.",
    "caution-period": "운이 예민한 때에는 상대의 침묵, 돈의 압박, 일의 지연이 모두 내 탓처럼 느껴질 수 있습니다. 그러나 모든 흐름을 혼자 떠안을 필요는 없습니다. 내가 할 몫과 기다려야 할 몫을 나누는 것이 이 시기의 보호막입니다.",
    strategy: "실천의 핵심은 손님이 다시 자기 편이 되는 것입니다. 상대의 답, 상황의 결과, 주변의 평가를 모두 한꺼번에 붙잡으면 손이 비어 버립니다. 오늘은 내가 선택할 수 있는 작은 몫 하나만 잡아도 운은 충분히 방향을 얻습니다.",
    "one-line": "찻잔의 마지막 향은 조용하지만 오래 남습니다. 오늘의 한 문장은 그런 향처럼 손님의 마음에 남아, 급한 결론보다 부드러운 기준을 먼저 떠올리게 할 것입니다.",
  };
  const finalExpansions = {
    summary: "그러니 이 상담을 읽을 때는 한 문장씩 내 현실에 대입해 보세요. 맞고 틀림을 급하게 판정하기보다, 어느 문장에서 마음이 조금 멈추는지 보는 것이 좋습니다.",
    temperament: "손님의 기질은 빠른 결론보다 깊은 납득을 원합니다. 누군가의 말이 아무리 그럴듯해도 내 마음이 납득하지 못하면 오래 남기 어렵습니다.",
    elements: "작은 보완은 운을 억지로 바꾸는 일이 아니라, 내 안의 치우침을 덜어 주는 일입니다. 오늘 한 가지 기운만 부드럽게 돌려도 충분합니다.",
    "ten-gods": "오늘은 어느 십성이 옳은가보다, 어떤 태도가 지금 손님을 덜 지치게 하는지가 더 중요합니다. 그 태도가 곧 상담의 실제 처방입니다.",
    strength: "이 힘을 나 자신에게도 써 주세요. 이해하려는 마음이 늘 타인에게만 향하면 손님은 쉽게 비어 버립니다. 오늘은 내 마음도 같은 깊이로 이해해야 합니다.",
    weakness: "중간 선택지를 만드는 일은 우유부단함이 아닙니다. 운이 흐릴 때 스스로를 지키는 가장 현실적인 지혜입니다.",
    "current-flow": "감정이 올라오는 흐름은 오래 지속되지 않습니다. 다만 그 순간에 어떤 말을 꺼내는지는 오래 남을 수 있으니, 말보다 호흡을 먼저 골라야 합니다.",
    "life-rhythm": "이 네 가지 리듬 중 하나라도 안정되면 나머지도 조금씩 따라옵니다. 가장 쉬운 한 곳부터 돌보는 것이 오늘의 현실적인 개운법입니다.",
    "caution-period": "손님이 늦게 움직인다고 해서 운이 사라지는 것은 아닙니다. 오히려 잘 고른 침묵은 성급한 말보다 더 큰 보호가 됩니다.",
    strategy: "작은 기준은 작아 보여도 반복되면 삶의 방향이 됩니다. 오늘 고른 기준 하나가 내일의 말투와 선택을 조금 더 단단하게 만들 것입니다.",
    "one-line": "그 기준을 잊지 않으면, 답이 늦어지는 시간도 손님을 무너뜨리는 시간이 아니라 마음을 정돈하는 시간이 됩니다.",
  };
  return sections.map((section) => ({
    ...section,
    body: `${section.body} ${expansions[section.id] || ""} ${detailExpansions[section.id] || ""} ${finalExpansions[section.id] || ""}`,
  }));
}

function buildMinimalDraft(request) {
  const consultationMode = normalizeConsultationMode(request.consultationMode);
  const sajuRule = resolveSajuCategoryRule(request);
  const modeLabel = consultationMode === "sajuCompatibility" ? "사주 궁합" : consultationMode === "saju" ? "사주" : consultationMode === "sukuyo" ? "숙요점 궁합" : "타로";
  const synthesisTitle = consultationMode === "sajuCompatibility" ? "연이가 읽은 사주 궁합의 결" : consultationMode === "saju" ? "연이가 읽은 사주의 결" : consultationMode === "sukuyo" ? "연이가 읽은 27숙 인연의 흐름" : "연이가 읽은 타로의 장면";
  const synthesisSummary =
    isSajuFamilyMode(consultationMode)
      ? "오늘은 드러난 출생정보 안에서 확인되는 사주의 흐름만 차분히 살핍니다."
      : consultationMode === "sukuyo"
        ? "오늘은 두 사람의 27숙 인연의 흐름만 따라 관계의 온도를 살핍니다."
      : "오늘은 현재 질문과 카드의 상징만 따라가며 마음의 방향을 살핍니다.";
  const synthesisBridge =
    isSajuFamilyMode(consultationMode)
      ? "비어 있는 시간이나 기운은 지어내지 않고, 확인된 사주의 결 안에서 오늘 붙잡을 기준을 읽어 봅니다."
      : consultationMode === "sukuyo"
        ? "비어 있는 숙요 계산값이나 상대의 속마음은 지어내지 않고, 확인된 두 사람의 정보와 질문만 따라 읽어 봅니다."
      : "사주를 근거로 삼지 않고, 찻잔 위에 떠오른 카드의 장면과 지금 질문만 따라 다음 한 걸음을 읽어 봅니다.";
  const sajuFallbackSummary =
    isSajuFamilyMode(consultationMode)
      ? "드러난 출생정보가 충분한 자리까지만 살피고, 비어 있는 흐름은 지어내지 않습니다."
      : "오늘은 사주를 열지 않고, 찻잔과 타로 그리고 지금 적어 주신 질문의 기운을 중심으로 읽습니다.";
  const sajuFallbackPoint =
    isSajuFamilyMode(consultationMode)
      ? "확인된 출생정보와 질문의 결 안에서 마음의 방향을 살핍니다."
      : "현재 질문과 찻잔의 결을 중심으로 마음의 방향을 살핍니다.";
  const teaCup = {
    id: request.selectedTeaCupId,
    name: request.selectedTeaCupName,
    topic: request.selectedTeaCupTopic,
    reading: `${request.selectedTeaCupName}은 ${request.selectedTeaCupTopic}의 결을 따라 지금 마음에 오래 머문 향을 비춥니다.`,
  };
  const sukuyoCompatibility = consultationMode === "sukuyo"
    ? buildFortuneTeaSukuyoCompatibility(request)
    : undefined;
  const sukuyoAvailable = sukuyoCompatibility?.available;
  const sukuyoDistanceLine = sukuyoAvailable
    ? sukuyoDistanceGuide(sukuyoCompatibility.distanceTier, sukuyoCompatibility.distanceLabel)
    : "아직 거리 계산이 열리지 않은 부분은 연이가 지어내지 않고 비워둡니다.";
  const sukuyoDirectionLine = sukuyoAvailable
    ? `이 관계에서 나는 ${sukuyoCompatibility.relationDetail?.typeAToB || "확인된 자리"}, 상대는 ${sukuyoCompatibility.relationDetail?.typeBToA || "확인된 자리"}의 자리에 서는 흐름입니다.`
    : "확인된 이름과 질문 안에서만 관계의 온도를 살핍니다.";
  const selectedSynthesisSummary = consultationMode === "sukuyo"
    ? sukuyoAvailable
      ? `${sukuyoCompatibility.user.sukuyoName || "나의 본명숙"}과 ${sukuyoCompatibility.partner.sukuyoName || "상대의 본명숙"}은 ${sukuyoCompatibility.distanceLabel || "확인된 거리"}에서 ${sukuyoCompatibility.relationType || "인연"}으로 맞닿습니다. ${sukuyoDirectionLine}`
      : "오늘은 확인된 이름과 질문 안에서만 두 사람의 인연 온도를 조심스럽게 살핍니다."
    : synthesisSummary;
  const selectedSynthesisBridge = consultationMode === "sukuyo"
    ? sukuyoAvailable
      ? `오늘은 숙요점 궁합의 달빛만 따라갑니다. ${sukuyoCompatibility.relationType || "인연"} 관계와 ${sukuyoCompatibility.distanceLabel || "거리"}의 결, ${sukuyoDirectionLine} ${sukuyoDistanceLine}`
      : "비어 있는 숙요 계산값이나 상대의 속마음은 지어내지 않고, 확인된 두 사람의 정보와 질문만 따라 읽어 봅니다."
    : synthesisBridge;
  const selectedYeoniIntro = consultationMode === "sukuyo"
    ? "어서 오세요, 달빛이 고인 운명의 찻집이에요. 따뜻한 차 한 잔 두고, 찻잔 위에 내려앉은 달빛처럼 연이는 두 사람의 숙이 서로를 바라보는 거리를 먼저 살펴봅니다."
    : "어서 오세요, 달빛이 고인 운명의 찻집이에요. 따뜻한 차 한 잔 드시면서 잠시 쉬어가세요. 연이는 먼저 당신의 질문에 머문 온도를 차분히 읽어 봅니다.";
  const selectedYeoniMain = consultationMode === "sukuyo"
    ? sukuyoAvailable
      ? `${request.question}라는 물음은 두 사람의 관계가 단순히 좋고 나쁜지가 아니라, 어떤 거리에서 서로를 덜 다치게 만날 수 있는지를 묻고 있어요. ${sukuyoCompatibility.summary} ${sukuyoCompatibility.scores ? `영역 점수는 ${sukuyoCompatibility.scores.total}점, ${sukuyoCompatibility.scores.label}으로 모이지만 점수보다 중요한 것은 ${sukuyoCompatibility.distanceLabel || "거리"}와 ${sukuyoCompatibility.relationType || "관계 유형"}이 만드는 반복 패턴입니다. ` : ""}${sukuyoDistanceLine}`
      : "지금은 두 사람의 숙요 계산값이 충분히 열리지 않아 관계 유형을 단정하지 않습니다. 다만 질문에 남아 있는 온도만 보아도, 결론을 재촉하기보다 확인된 말과 실제 행동을 나누어 볼 필요가 있습니다."
    : "지금은 결론보다 마음의 방향을 먼저 확인해야 하는 때로 드러납니다.";
  const selectedYeoniAdvice = consultationMode === "sukuyo"
    ? sukuyoAvailable
      ? `${sukuyoCategoryGuide(`${sukuyoCompatibility.relationshipType || ""} ${request.question || ""}`)} 오늘은 ${sukuyoCompatibility.adviceKeywords?.slice(0, 3).join(", ") || "속도 확인"}을 기준으로 상대를 바꾸려는 말보다 두 사람이 지킬 수 있는 간격을 먼저 정해 보세요.`
      : "오늘은 관계의 결론을 묻기보다, 내가 확인하고 싶은 사실 하나와 아직 단정할 수 없는 감정 하나를 나누어 적어 보세요."
    : "오늘은 가장 작은 말 한 줄부터 부드럽게 정리해 보세요.";
  const selectedYeoniCaution = consultationMode === "sukuyo"
    ? sukuyoAvailable
      ? `${sukuyoCompatibility.cautions?.[0] || "관계의 결말을 서두르지 않는 편이 좋습니다."} 특히 ${sukuyoCompatibility.relationType || "이 관계"}에서는 불안이 올라올 때 상대의 마음을 단정하거나 답을 재촉하기보다, 멈출 말과 확인할 말을 분리해야 합니다.`
      : "상대의 속마음이나 관계의 결말은 입력된 정보만으로 단정하지 않습니다. 지금은 더 많은 확인 없이 희망이나 불안을 키우지 않는 편이 안전합니다."
    : "상대의 마음을 단정하기보다 확인할 수 있는 사실과 내 감정을 나누어 보아야 합니다.";
  const selectedChoiceSimulation = consultationMode === "sukuyo"
    ? [
        { id: "message", title: "작게 연락하는 길", subtitle: "상대의 속도를 살피는 한 문장", result: "관계의 온도를 무리 없이 확인하고, 현재 리듬을 조금 더 선명하게 볼 수 있습니다.", caution: "답을 재촉하거나 관계 이름을 바로 요구하지 마세요." },
        { id: "distance", title: "거리를 조율하는 길", subtitle: "가까워지는 속도 낮추기", result: "끌림과 불안을 관계의 전부로 보지 않고, 실제 말과 행동을 분리해 볼 수 있습니다.", caution: "거리두기가 벌처럼 느껴지지 않도록 필요한 최소한의 설명은 남겨 두세요." },
        { id: "boundary", title: "기준을 밝히는 길", subtitle: "반복되는 서운함 줄이기", result: "두 사람이 지킬 수 있는 약속이 또렷해지고 같은 갈등을 줄일 수 있습니다.", caution: "상대를 고치려는 말보다 내가 지킬 기준부터 말해야 합니다." },
        { id: "role", title: "역할을 나누는 길", subtitle: "한쪽만 애쓰지 않기", result: "보호, 의존, 책임이 한쪽으로 몰리지 않아 관계의 피로가 줄어듭니다.", caution: "좋아한다는 이유로 불균형한 역할을 계속 떠안지 마세요." },
      ]
    : [
        { id: "speak", title: "작게 말을 건네는 길", subtitle: "부담 없는 한 문장", result: "감정의 온도를 확인할 수 있습니다.", caution: "한 번에 모든 결론을 묻지 마세요." },
        { id: "wait", title: "하루 더 바라보는 길", subtitle: "반응을 재촉하지 않기", result: "마음의 과속을 줄여 줍니다.", caution: "기다림이 회피가 되지 않도록 기한을 정해 두세요." },
        { id: "reset", title: "나를 먼저 돌보는 길", subtitle: "내 기준 회복", result: "선택의 중심이 조금 더 선명해집니다.", caution: "차가운 단절처럼 보이지 않게 최소한의 예의를 남기세요." },
      ];
  const selectedActionPrescription = consultationMode === "sukuyo"
    ? "오늘은 상대에게 묻고 싶은 말을 바로 보내기보다, 이 관계에서 내가 반복해서 다치는 지점을 먼저 한 줄로 적어 보세요. 그다음 확인할 수 있는 사실, 아직 추측인 감정, 상대와 합의해야 할 거리 기준을 나누어 적으면 좋습니다. 연락을 한다면 결론을 요구하지 말고 대화 가능 여부와 현재 리듬만 짧게 확인하세요. 하지 말아야 할 행동은 침묵을 시험하거나, 불안 때문에 긴 문장으로 관계의 답을 받아내려는 일입니다."
    : "오늘은 마음에 숨은 말을 한 문장으로 적고, 그중 실제로 확인할 수 있는 것 하나만 골라 보세요.";
  const selectedClosingLine = consultationMode === "sukuyo"
    ? "이 인연은 달빛처럼 가까워 보이다가도, 손을 뻗는 방식에 따라 거리가 달라지는 관계예요."
    : "오늘 필요한 것은 큰 결론보다 마음이 덜 다치게 하는 다음 한 걸음입니다.";
  const tarot = {
    cardId: "major_18_moon",
    number: 18,
    nameEn: "The Moon",
    nameKo: "달",
    orientation: "upright",
    keywords: ["직감", "불안", "숨은 마음"],
    meaning: "아직 선명하지 않은 마음의 결을 조심스럽게 드러내는 카드입니다.",
    reading: "지금의 질문은 확신보다 감정의 결을 먼저 읽어야 하는 흐름을 비춥니다.",
  };
  const tarotSpread = normalizeTarotSpread(request.tarotSpread);
  const tarotSpreadCards = buildMinimalTarotSpreadCards(tarotSpread, tarot).map((card) => ({
    ...card,
    detail: buildFallbackCardDetail(card, request.question),
  }));

  return {
    consultationMode,
    sessionTitle: `${request.selectedTeaCupName}에 비친 오늘의 ${modeLabel} 상담`,
    questionSummary: request.question,
    teaCup,
    saju: {
      available: false,
      title: "사주가 열리지 않은 오늘의 흐름",
      summary: sajuFallbackSummary,
      keyPoints: [sajuFallbackPoint],
      birthSummary: {
        nickname: cleanText(request.nickname, 40) || "손님",
        profileId: cleanText(request.profileId, 120) || undefined,
        birthDate: cleanText(request.birthDate, 20) || undefined,
        birthTime: request.birthTimeUnknown ? undefined : cleanText(request.birthTime, 12) || undefined,
        birthTimeUnknown: request.birthTimeUnknown === true || !cleanText(request.birthTime, 12),
        hasBirthTime: Boolean(cleanText(request.birthTime, 12)) && request.birthTimeUnknown !== true,
        calendarType: request.calendarType === "lunar" ? "lunar" : "solar",
        gender: cleanText(request.gender, 20) || undefined,
        birthPlace: cleanText(request.birthPlace, 120) || undefined,
        timezone: cleanText(request.timezone, 80) || undefined,
      },
      deepSections: isSajuFamilyMode(consultationMode) ? buildFallbackSajuDeepSections(request) : undefined,
      oneLineAdvice: isSajuFamilyMode(consultationMode) ? "오늘은 답을 서두르기보다, 내 마음이 오래 머문 이유와 지금 지켜야 할 기준을 한 잔의 차처럼 천천히 나누어 보세요." : undefined,
      tenGodSnapshot: { available: false, tenGodLabels: [], reason: "사주 초안이 전달되지 않았습니다.", source: "unavailable" },
    },
    tarot,
    tarotSpread,
    tarotSpreadCards,
    cardInteractions: consultationMode === "tarot" ? buildFallbackCardInteractions(tarotSpreadCards) : undefined,
    heartScent: consultationMode === "tarot"
      ? buildFallbackHeartScent({
          teaCupId: request.selectedTeaCupId,
          teaCupTopic: request.selectedTeaCupTopic,
          question: request.question,
          seed: `${request.selectedTeaCupId || ""}|${request.question || ""}`,
          cardNames: tarotSpreadCards.map((card) => card.nameKo),
        })
      : undefined,
    sukuyoCompatibility,
    emotionAnalysis: isSajuFamilyMode(consultationMode)
      ? buildSajuCategoryGauges(request, { birthSummary: { birthTimeUnknown: request.birthTimeUnknown === true } })
      : [
          { label: "기대", value: 66, description: "아직 마음 한쪽에는 다시 부드럽게 열리고 싶은 빛이 남아 있습니다.", tone: "gold" },
          { label: "불안", value: 72, description: "작은 반응에도 마음이 크게 흔들릴 수 있는 흐름입니다.", tone: "purple" },
          { label: "미련", value: 61, description: "지나간 말과 장면이 아직 찻잔 바닥에 오래 남아 있습니다.", tone: "pink" },
          { label: "망설임", value: 58, description: "움직이고 싶은 마음과 스스로를 지키려는 마음이 함께 머뭅니다.", tone: "blue" },
        ],
    yeoniReading: {
      intro: selectedYeoniIntro,
      main: selectedYeoniMain,
      advice: selectedYeoniAdvice,
      caution: selectedYeoniCaution,
    },
    synthesis: {
      title: synthesisTitle,
      summary: selectedSynthesisSummary,
      sajuTarotBridge: selectedSynthesisBridge,
    },
    choiceSimulation: selectedChoiceSimulation,
    actionPrescription: selectedActionPrescription,
    luckyKeywords: isSajuFamilyMode(consultationMode)
      ? [request.selectedTeaCupName, sajuRule.category, "명식 근거", "오늘의 기준"]
      : consultationMode === "sukuyo"
        ? [request.selectedTeaCupName, "인연", "속도 확인"]
        : [request.selectedTeaCupName, "직감", "작은 대화"],
    closingLine: selectedClosingLine,
  };
}

function mergeFortuneTeaSukuyoCompatibility(fallbackCompatibility, candidateCompatibility) {
  if (!fallbackCompatibility) return candidateCompatibility;
  const candidate = candidateCompatibility && typeof candidateCompatibility === "object" ? candidateCompatibility : {};
  const merged = {
    ...fallbackCompatibility,
    ...candidate,
  };
  if (!fallbackCompatibility.available) return merged;
  return {
    ...merged,
    available: true,
    user: fallbackCompatibility.user,
    partner: fallbackCompatibility.partner,
    calculationSource: fallbackCompatibility.calculationSource,
    calculationBasis: fallbackCompatibility.calculationBasis,
    relationDetail: fallbackCompatibility.relationDetail,
    relationType: fallbackCompatibility.relationType,
    relationTypeHan: fallbackCompatibility.relationTypeHan,
    distanceLabel: fallbackCompatibility.distanceLabel,
    distanceTier: fallbackCompatibility.distanceTier,
    forwardDistance: fallbackCompatibility.forwardDistance,
    reverseDistance: fallbackCompatibility.reverseDistance,
    shortestDistance: fallbackCompatibility.shortestDistance,
    compatibilityIndex: fallbackCompatibility.compatibilityIndex,
    scores: fallbackCompatibility.scores,
    elementHarmony: fallbackCompatibility.elementHarmony,
    direction: fallbackCompatibility.direction,
    strengths: Array.isArray(candidate.strengths) && candidate.strengths.length ? candidate.strengths : fallbackCompatibility.strengths,
    cautions: Array.isArray(candidate.cautions) && candidate.cautions.length ? candidate.cautions : fallbackCompatibility.cautions,
    adviceKeywords: Array.isArray(candidate.adviceKeywords) && candidate.adviceKeywords.length ? candidate.adviceKeywords : fallbackCompatibility.adviceKeywords,
  };
}

function normalizeDraftResult(candidate, request) {
  const draft = candidate && typeof candidate === "object" ? candidate : buildMinimalDraft(request);
  const fallback = buildMinimalDraft(request);
  const draftSaju = draft.saju && typeof draft.saju === "object" ? draft.saju : {};
  const mergedSaju = { ...fallback.saju, ...draftSaju };
  const normalizedDeepSections = normalizeDeepSections(mergedSaju.deepSections);
  const normalizedDeepLength = normalizedDeepSections.map((section) => section.body).join("\n").replace(/\s/g, "").length;
  const requiredSajuSections = getSajuRequiredSectionTitles(request);
  const hasRequiredSajuTitles = requiredSajuSections.every((title) => normalizedDeepSections.some((section) => section.title === title));
  if (isSajuFamilyMode(request.consultationMode)) {
    mergedSaju.deepSections = normalizedDeepSections.length >= requiredSajuSections.length && normalizedDeepLength >= getSajuMinResultChars(request) && hasRequiredSajuTitles
      ? normalizedDeepSections
      : buildFallbackSajuDeepSections(request, mergedSaju);
    mergedSaju.oneLineAdvice = cleanMultiline(
      mergedSaju.oneLineAdvice,
      400,
    ) || "오늘은 답을 서두르기보다, 내 마음이 오래 머문 이유와 지금 지켜야 할 기준을 한 잔의 차처럼 천천히 나누어 보세요.";
  }
  const normalizedEmotionAnalysis = isSajuFamilyMode(request.consultationMode)
    ? buildSajuCategoryGauges(request, mergedSaju)
    : Array.isArray(draft.emotionAnalysis) && draft.emotionAnalysis.length ? draft.emotionAnalysis : fallback.emotionAnalysis;
  // 클라 초안에는 카드별 detail이 없다. LLM이 통째로 실패해 이 초안이 그대로 degrade 전달될 때도
  // 카드별 섹션이 비지 않도록 여기서 결정론 detail을 채워 둔다.
  const draftSpreadCards = (Array.isArray(draft.tarotSpreadCards) && draft.tarotSpreadCards.length ? draft.tarotSpreadCards : fallback.tarotSpreadCards)
    .map((card) => (card?.detail ? card : { ...card, detail: buildFallbackCardDetail(card, request.question) }));
  return {
    ...fallback,
    ...draft,
    consultationMode: request.consultationMode,
    teaCup: draft.teaCup && typeof draft.teaCup === "object" ? { ...fallback.teaCup, ...draft.teaCup } : fallback.teaCup,
    saju: mergedSaju,
    tarot: draft.tarot && typeof draft.tarot === "object" ? { ...fallback.tarot, ...draft.tarot } : fallback.tarot,
    tarotSpread: normalizeTarotSpread(draft.tarotSpread || request.tarotSpread),
    tarotSpreadCards: draftSpreadCards,
    // 카드 조합·마음의 향은 초안이 못 채웠어도 항상 결정론 값이 있어야 한다(LLM 실패 시 빈 섹션 방지).
    cardInteractions: request.consultationMode === "tarot"
      ? (Array.isArray(draft.cardInteractions) && draft.cardInteractions.length ? draft.cardInteractions : buildFallbackCardInteractions(draftSpreadCards))
      : undefined,
    heartScent: request.consultationMode === "tarot"
      ? mergeHeartScent(draft.heartScent, buildFallbackHeartScent({
          teaCupId: request.selectedTeaCupId,
          teaCupTopic: request.selectedTeaCupTopic,
          question: request.question,
          seed: `${request.selectedTeaCupId || ""}|${request.question || ""}`,
          cardNames: draftSpreadCards.map((card) => card?.nameKo),
        }))
      : undefined,
    sukuyoCompatibility: mergeFortuneTeaSukuyoCompatibility(fallback.sukuyoCompatibility, draft.sukuyoCompatibility),
    // 사주 궁합의 두 사람 명식 스냅샷(user/partner)은 클라 초안에서 온다 — 워커는 이 구조를 보존한다.
    sajuCompatibility: draft.sajuCompatibility && typeof draft.sajuCompatibility === "object" ? draft.sajuCompatibility : fallback.sajuCompatibility,
    emotionAnalysis: normalizedEmotionAnalysis,
    yeoniReading: draft.yeoniReading && typeof draft.yeoniReading === "object" ? { ...fallback.yeoniReading, ...draft.yeoniReading } : fallback.yeoniReading,
    synthesis: draft.synthesis && typeof draft.synthesis === "object" ? { ...fallback.synthesis, ...draft.synthesis } : fallback.synthesis,
    choiceSimulation: Array.isArray(draft.choiceSimulation) && draft.choiceSimulation.length ? draft.choiceSimulation.slice(0, 4) : fallback.choiceSimulation,
    luckyKeywords: Array.isArray(draft.luckyKeywords) && draft.luckyKeywords.length ? draft.luckyKeywords : fallback.luckyKeywords,
  };
}

// LLM 후보 필드를 항상 렌더 가능한 문자열로 병합한다.
// 잘린 JSON에서 온 빈 문자열/객체/배열 값이 fallback 문장을 덮어써 화면을 비우거나
// React child 크래시를 내는 것을 필드 단위에서 차단한다 (degraded 전달 경로 포함).
function mergeProse(candidate, fallbackText, maxLength = 4000) {
  const text = cleanMultiline(typeof candidate === "string" ? candidate : toDisplayText(candidate), maxLength);
  return text || cleanMultiline(fallbackText, maxLength);
}

function mergeLine(candidate, fallbackText, maxLength = 160) {
  const text = cleanText(typeof candidate === "string" ? candidate : toDisplayText(candidate), maxLength);
  return text || cleanText(fallbackText, maxLength);
}

function mergePercentValue(candidate, fallbackValue) {
  const numeric = Math.round(Number(String(candidate ?? "").replace(/[^\d.-]/g, "")));
  if (!Number.isFinite(numeric)) return fallbackValue;
  return Math.min(100, Math.max(0, numeric));
}

function mergeEmotionAnalysis(candidates, fallbackItems) {
  const list = Array.isArray(candidates) ? candidates : [];
  const merged = fallbackItems.map((fallbackItem, index) => {
    const candidate = list[index] && typeof list[index] === "object" ? list[index] : {};
    return {
      label: mergeLine(candidate.label, fallbackItem.label, 40),
      value: mergePercentValue(candidate.value, fallbackItem.value),
      description: mergeProse(candidate.description, fallbackItem.description, 900),
      tone: cleanText(candidate.tone, 20) || fallbackItem.tone,
    };
  });
  return merged;
}

// 카드 정체성(cardId/이름/방향/키워드)은 계속 preserve하고, LLM이 쓴 산문만 detail로 얹는다.
// 위치(index) 기준으로 맞추고 positionId는 대조 검증에만 쓴다 — LLM이 순서를 흔들어도 카드가 뒤섞이지 않는다.
function mergeTarotCardReadings(fallbackCards, candidates, question) {
  const cards = Array.isArray(fallbackCards) ? fallbackCards : [];
  const list = Array.isArray(candidates) ? candidates : [];
  const byPositionId = new Map();
  for (const item of list) {
    const positionId = cleanText(item?.positionId, 60);
    if (positionId && !byPositionId.has(positionId)) byPositionId.set(positionId, item);
  }
  return cards.map((card, index) => {
    const positionMatch = byPositionId.get(cleanText(card?.positionId, 60));
    const candidate = positionMatch || (list[index] && typeof list[index] === "object" ? list[index] : {});
    const defaults = buildFallbackCardDetail(card, question);
    const detail = {};
    for (const field of TAROT_CARD_DETAIL_FIELDS) {
      detail[field] = mergeProse(candidate?.[field], card?.detail?.[field] || defaults[field], 900);
    }
    return { ...card, detail };
  });
}

function mergeCardInteractions(candidates, fallbackItems) {
  const list = Array.isArray(candidates) ? candidates : [];
  const merged = list
    .map((item) => ({
      pair: mergeLine(item?.pair, "", 120),
      insight: mergeProse(item?.insight, "", 900),
    }))
    .filter((item) => item.pair && item.insight)
    .slice(0, 10);
  return merged.length ? merged : fallbackItems;
}

// 향 이름은 반드시 정본 카탈로그(lib/fortune-tea-house/heart-scents.js) 안에서만 확정된다.
// 카탈로그를 벗어나면 결정론 폴백으로 교체한다 — 여기서 throw하면 결제된 결과가 통째로 degrade된다.
function mergeHeartScent(candidate, fallbackScent) {
  const base = fallbackScent || {};
  const name = cleanText(candidate?.name, 40);
  const category = cleanText(candidate?.category, 40);
  const reason = mergeProse(candidate?.reason, base.reason, 1200);
  if (name && isHeartScentName(name)) {
    return { name, category: findHeartScentCategory(name, category), reason };
  }
  return { name: base.name, category: base.category, reason: reason || base.reason };
}

function mergeChoiceSimulation(candidates, fallbackItems) {
  const list = Array.isArray(candidates) ? candidates.slice(0, 4) : [];
  if (!list.length) return fallbackItems;
  const merged = list.map((item, index) => {
    const candidate = item && typeof item === "object" ? item : {};
    const fallbackItem = fallbackItems[index] || fallbackItems[fallbackItems.length - 1] || {};
    return {
      id: cleanText(candidate.id, 60) || fallbackItem.id || `choice-${index + 1}`,
      title: mergeLine(candidate.title, fallbackItem.title, 80),
      subtitle: mergeLine(candidate.subtitle, fallbackItem.subtitle, 120),
      result: mergeProse(candidate.result, fallbackItem.result, 1600),
      caution: mergeProse(candidate.caution, fallbackItem.caution, 600),
    };
  }).filter((item) => item.title || item.result);
  return merged.length ? merged : fallbackItems;
}

function mergeLuckyKeywords(candidates, fallbackKeywords) {
  const list = Array.isArray(candidates) ? candidates : [];
  const merged = list.map((item) => cleanText(typeof item === "string" ? item : toDisplayText(item), 40)).filter(Boolean);
  return merged.length >= 2 ? merged : fallbackKeywords;
}

function mergeLlmResult(fallback, parsed) {
  const safeParsed = parsed && typeof parsed === "object" ? parsed : {};
  const parsedDeepSections = normalizeDeepSections(safeParsed.saju?.deepSections);
  const isTarotConsultation = fallback.consultationMode === "tarot";
  return {
    ...fallback,
    ...safeParsed,
    consultationMode: fallback.consultationMode,
    teaCup: fallback.teaCup,
    sessionTitle: mergeLine(safeParsed.sessionTitle, fallback.sessionTitle, 120),
    questionSummary: mergeLine(safeParsed.questionSummary, fallback.questionSummary, 160),
    actionPrescription: mergeProse(safeParsed.actionPrescription, fallback.actionPrescription),
    closingLine: mergeProse(safeParsed.closingLine, fallback.closingLine, 1200),
    saju: {
      ...fallback.saju,
      ...(safeParsed.saju || {}),
      title: mergeLine(safeParsed.saju?.title, fallback.saju.title, 80),
      summary: mergeProse(safeParsed.saju?.summary, fallback.saju.summary),
      caution: mergeProse(safeParsed.saju?.caution, fallback.saju.caution, 1200),
      keyPoints: safeParsed.saju?.keyPoints?.length
        ? safeParsed.saju.keyPoints.map((point) => cleanText(typeof point === "string" ? point : toDisplayText(point), 200)).filter(Boolean)
        : fallback.saju.keyPoints,
      birthSummary: fallback.saju.birthSummary,
      dayMaster: fallback.saju.dayMaster,
      dominantElements: fallback.saju.dominantElements,
      pillars: fallback.saju.pillars,
      fiveElements: fallback.saju.fiveElements,
      primaryTenGod: fallback.saju.primaryTenGod,
      secondaryTenGods: fallback.saju.secondaryTenGods,
      deepSections: parsedDeepSections.length ? parsedDeepSections : fallback.saju.deepSections,
      monthBranch: fallback.saju.monthBranch,
      season: fallback.saju.season,
      daewoon: fallback.saju.daewoon,
      cautionReading: fallback.saju.cautionReading,
      actionPrescription: fallback.saju.actionPrescription,
      oneLineAdvice: cleanMultiline(safeParsed.saju?.oneLineAdvice, 400) || fallback.saju.oneLineAdvice,
      tarotBridgeReady: fallback.saju.tarotBridgeReady,
      tenGodSnapshot: fallback.saju.tenGodSnapshot,
    },
    tarot: {
      ...fallback.tarot,
      ...(safeParsed.tarot || {}),
      cardId: fallback.tarot.cardId,
      number: fallback.tarot.number,
      nameKo: fallback.tarot.nameKo,
      nameEn: fallback.tarot.nameEn,
      orientation: fallback.tarot.orientation,
      keywords: fallback.tarot.keywords,
      meaning: fallback.tarot.meaning,
      reading: mergeProse(safeParsed.tarot?.reading, fallback.tarot.reading, 2400),
    },
    tarotSpread: fallback.tarotSpread,
    // 카드 정체성은 fallback 그대로, 카드별 산문(detail)만 LLM 출력으로 채운다.
    // 카드 조합·마음의 향은 타로 전용 필드다 — 사주/숙요 결과에는 실리지 않게 한다.
    tarotSpreadCards: isTarotConsultation
      ? mergeTarotCardReadings(fallback.tarotSpreadCards, safeParsed.tarotCardReadings, fallback.questionSummary)
      : fallback.tarotSpreadCards,
    cardInteractions: isTarotConsultation ? mergeCardInteractions(safeParsed.cardInteractions, fallback.cardInteractions) : undefined,
    heartScent: isTarotConsultation ? mergeHeartScent(safeParsed.heartScent, fallback.heartScent) : undefined,
    sukuyoCompatibility: mergeFortuneTeaSukuyoCompatibility(fallback.sukuyoCompatibility, safeParsed.sukuyoCompatibility),
    // 사주 궁합 두 사람 명식 스냅샷은 결정적 계산값이므로 LLM 출력으로 덮지 않고 fallback 구조를 보존한다.
    sajuCompatibility: fallback.sajuCompatibility,
    emotionAnalysis: mergeEmotionAnalysis(safeParsed.emotionAnalysis, fallback.emotionAnalysis),
    yeoniReading: {
      ...fallback.yeoniReading,
      intro: mergeProse(safeParsed.yeoniReading?.intro, fallback.yeoniReading.intro),
      main: mergeProse(safeParsed.yeoniReading?.main, fallback.yeoniReading.main),
      advice: mergeProse(safeParsed.yeoniReading?.advice, fallback.yeoniReading.advice),
      caution: mergeProse(safeParsed.yeoniReading?.caution, fallback.yeoniReading.caution),
    },
    synthesis: {
      ...fallback.synthesis,
      title: mergeLine(safeParsed.synthesis?.title, fallback.synthesis.title, 80),
      summary: mergeProse(safeParsed.synthesis?.summary, fallback.synthesis.summary),
      sajuTarotBridge: mergeProse(safeParsed.synthesis?.sajuTarotBridge, fallback.synthesis.sajuTarotBridge, 1200),
    },
    choiceSimulation: mergeChoiceSimulation(safeParsed.choiceSimulation, fallback.choiceSimulation),
    luckyKeywords: mergeLuckyKeywords(safeParsed.luckyKeywords, fallback.luckyKeywords),
  };
}

function assertNoMechanicalCopy(result) {
  const joined = [
    result.sessionTitle,
    result.questionSummary,
    result.saju?.title,
    result.saju?.summary,
    result.saju?.caution,
    result.saju?.oneLineAdvice,
    result.tarot?.reading,
    result.sukuyoCompatibility?.title,
    result.sukuyoCompatibility?.summary,
    result.synthesis?.title,
    result.synthesis?.summary,
    result.synthesis?.sajuTarotBridge,
    result.yeoniReading?.intro,
    result.yeoniReading?.main,
    result.yeoniReading?.advice,
    result.yeoniReading?.caution,
    result.actionPrescription,
    result.closingLine,
    ...(result.saju?.keyPoints || []),
    ...(result.saju?.deepSections || []).flatMap((section) => [section.title, section.body]),
    ...(result.sukuyoCompatibility?.strengths || []),
    ...(result.sukuyoCompatibility?.cautions || []),
    ...(result.sukuyoCompatibility?.adviceKeywords || []),
    ...(result.luckyKeywords || []),
    ...(result.emotionAnalysis || []).flatMap((item) => [item.label, item.description]),
    ...(result.choiceSimulation || []).flatMap((item) => [item.title, item.subtitle, item.result, item.caution]),
  ].join("\n");
  if (MECHANICAL_COPY_PATTERN.test(joined)) {
    throw new Error("fortune tea house quality failed: mechanical copy");
  }
}

function collectConsultText(result) {
  return [
    result.sessionTitle,
    result.questionSummary,
    result.saju?.title,
    result.saju?.summary,
    result.saju?.cautionReading,
    result.saju?.actionPrescription,
    result.saju?.oneLineAdvice,
    result.synthesis?.title,
    result.synthesis?.summary,
    result.synthesis?.sajuTarotBridge,
    result.yeoniReading?.intro,
    result.yeoniReading?.main,
    result.yeoniReading?.advice,
    result.yeoniReading?.caution,
    result.actionPrescription,
    result.closingLine,
    ...(result.saju?.keyPoints || []),
    ...(result.saju?.deepSections || []).flatMap((section) => [section.title, section.body]),
    ...(result.emotionAnalysis || []).flatMap((item) => [item.label, item.description]),
    ...(result.choiceSimulation || []).flatMap((item) => [item.title, item.subtitle, item.result, item.caution]),
    ...(result.luckyKeywords || []),
  ].filter(Boolean).join("\n");
}

function hasRepeatedLongBlock(text) {
  const blocks = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 80);
  const seen = new Set();
  for (const block of blocks) {
    if (seen.has(block)) return true;
    seen.add(block);
  }
  return false;
}

function normalizedNarrativeSentences(value) {
  return cleanMultiline(value, 4000)
    .split(/[.!?。！？\n]+/)
    .map((sentence) => sentence
      .replace(/\s+/g, " ")
      .replace(/[“”'"`·,:;()[\]{}]/g, "")
      .trim())
    .filter((sentence) => sentence.replace(/\s/g, "").length >= 70);
}

function assertTarotNarrativeOwnership(result) {
  const segments = [
    ["tarot.reading", result.tarot?.reading],
    ["synthesis.summary", result.synthesis?.summary],
    ["synthesis.sajuTarotBridge", result.synthesis?.sajuTarotBridge],
    ["yeoniReading.intro", result.yeoniReading?.intro],
    ["yeoniReading.main", result.yeoniReading?.main],
    ["yeoniReading.advice", result.yeoniReading?.advice],
    ["yeoniReading.caution", result.yeoniReading?.caution],
    ["actionPrescription", result.actionPrescription],
    ["closingLine", result.closingLine],
    ...(result.choiceSimulation || []).flatMap((choice, index) => [
      [`choiceSimulation.${index}.result`, choice?.result],
      [`choiceSimulation.${index}.caution`, choice?.caution],
    ]),
    ...(result.tarotSpreadCards || []).flatMap((card, cardIndex) => TAROT_CARD_DETAIL_FIELDS.map((field) => [
      `tarotCardReadings.${cardIndex}.${field}`,
      card?.detail?.[field],
    ])),
    ...(result.cardInteractions || []).map((interaction, index) => [`cardInteractions.${index}.insight`, interaction?.insight]),
  ];
  const seen = new Map();
  for (const [owner, value] of segments) {
    for (const sentence of normalizedNarrativeSentences(value)) {
      const previousOwner = seen.get(sentence);
      if (previousOwner && previousOwner !== owner) {
        throw new Error(`fortune tea house quality failed: repeated narrative passage ${previousOwner} -> ${owner}`);
      }
      seen.set(sentence, owner);
    }
  }
}

function assertSajuDeepQuality(result, fallback) {
  const rule = resolveSajuCategoryRule(fallback || result);
  const requiredSectionTitles = getSajuRequiredSectionTitles(fallback || result);
  const sections = normalizeDeepSections(result.saju?.deepSections);
  if (sections.length < requiredSectionTitles.length) {
    throw new Error("fortune tea house quality failed: saju deepSections count");
  }
  const titles = new Set(sections.map((section) => section.title));
  const missing = requiredSectionTitles.filter((title) => !titles.has(title));
  if (missing.length) {
    throw new Error(`fortune tea house quality failed: saju missing sections ${missing.join(",")}`);
  }
  sections.forEach((section, index) => {
    assertText(section.title, `saju.deepSections.${index}.title`);
    assertText(section.body, `saju.deepSections.${index}.body`);
    if (section.body.length < 140) {
      throw new Error(`fortune tea house quality failed: saju.deepSections.${index}.body too short`);
    }
  });
  const joined = collectConsultText(result);
  const compactLength = joined.replace(/\s/g, "").length;
  if (compactLength < getSajuMinResultChars(fallback || result)) {
    throw new Error(`fortune tea house quality failed: saju length ${compactLength}`);
  }
  if (SYSTEM_COPY_PATTERN.test(joined)) {
    throw new Error("fortune tea house quality failed: system copy");
  }
  if (SAJU_FORBIDDEN_COPY_PATTERN.test(joined)) {
    throw new Error("fortune tea house quality failed: saju forbidden copy");
  }
  const factTerms = ["일간", "오행", "십성"].filter((term) => joined.includes(term));
  if (factTerms.length < 2) {
    throw new Error("fortune tea house quality failed: saju fact terms");
  }
  if (!/현재 운|운의 흐름|대운|세운|월운/.test(joined)) {
    throw new Error("fortune tea house quality failed: saju luck flow");
  }
  const missingCategoryTerms = (rule.requiredTerms || []).filter((term) => !joined.includes(term));
  if (missingCategoryTerms.length) {
    throw new Error(`fortune tea house quality failed: saju category terms ${missingCategoryTerms.join(",")}`);
  }
  if (hasRepeatedLongBlock(joined)) {
    throw new Error("fortune tea house quality failed: repeated block");
  }
}

function isLoveTarotQuestion(result, fallback) {
  const joined = [
    fallback?.teaCup?.topic,
    fallback?.questionSummary,
    result?.teaCup?.topic,
    result?.questionSummary,
  ].filter(Boolean).join(" ");
  return /연애|재회|상대|연락|썸|짝사랑|이별|마음/.test(joined);
}

function isReunionTarotQuestion(result, fallback) {
  const joined = [
    fallback?.teaCup?.topic,
    fallback?.questionSummary,
    result?.teaCup?.topic,
    result?.questionSummary,
  ].filter(Boolean).join(" ");
  return /재회|다시\s*만|전남|전여|헤어진|헤어졌|돌아오|붙잡/.test(joined);
}

function assertTarotDeepQuality(result, fallback) {
  const tarotRule = resolveTarotCategoryRule({
    selectedTeaCupId: fallback?.teaCup?.id,
    selectedTeaCupName: fallback?.teaCup?.name,
    selectedTeaCupTopic: fallback?.teaCup?.topic,
    teaCup: fallback?.teaCup,
    concernTopic: fallback?.questionSummary,
    question: fallback?.questionSummary,
  });
  const spreadCards = Array.isArray(result.tarotSpreadCards) ? result.tarotSpreadCards : [];
  const generated = [
    result.tarot?.reading,
    result.synthesis?.title,
    result.synthesis?.summary,
    result.synthesis?.sajuTarotBridge,
    result.yeoniReading?.intro,
    result.yeoniReading?.main,
    result.yeoniReading?.advice,
    result.yeoniReading?.caution,
    result.actionPrescription,
    result.closingLine,
    ...spreadCards.flatMap((card) => TAROT_CARD_DETAIL_FIELDS.map((field) => card?.detail?.[field])),
    ...(result.cardInteractions || []).flatMap((item) => [item.pair, item.insight]),
    result.heartScent?.name,
    result.heartScent?.reason,
    ...(result.emotionAnalysis || []).flatMap((item) => [item.label, item.description]),
    ...(result.choiceSimulation || []).flatMap((item) => [item.title, item.subtitle, item.result, item.caution]),
    ...(result.luckyKeywords || []),
  ].filter(Boolean).join("\n");
  const joined = generated;
  const compactLength = joined.replace(/\s/g, "").length;
  const minChars = getTarotMinResultChars({
    selectedTeaCupId: fallback?.teaCup?.id,
    selectedTeaCupName: fallback?.teaCup?.name,
    selectedTeaCupTopic: fallback?.teaCup?.topic,
    teaCup: fallback?.teaCup,
    tarotSpread: result.tarotSpread || fallback?.tarotSpread,
  });
  if (compactLength < minChars) {
    throw new Error(`fortune tea house quality failed: tarot length ${compactLength}`);
  }
  assertTarotAnchorCoverage(joined, result, fallback);
  if (SYSTEM_COPY_PATTERN.test(joined)) {
    throw new Error("fortune tea house quality failed: tarot system copy");
  }
  if (TAROT_GENERIC_COPY_PATTERN.test(joined)) {
    throw new Error("fortune tea house quality failed: tarot generic copy");
  }
  if (TAROT_DETERMINISTIC_CLAIM_PATTERN.test(joined)) {
    throw new Error("fortune tea house quality failed: tarot deterministic claim");
  }
  if (hasRepeatedLongBlock(joined)) {
    throw new Error("fortune tea house quality failed: tarot repeated block");
  }
  assertTarotNarrativeOwnership(result);
  if (cleanMultiline(result.tarot?.reading, 4000).length < 120) {
    throw new Error("fortune tea house quality failed: tarot reading too short");
  }
  ["intro", "main", "advice", "caution"].forEach((key) => {
    if (cleanMultiline(result.yeoniReading?.[key], 4000).length < 80) {
      throw new Error(`fortune tea house quality failed: yeoniReading.${key} too short`);
    }
  });
  if (cleanMultiline(result.actionPrescription, 4000).length < 100) {
    throw new Error("fortune tea house quality failed: actionPrescription too short");
  }
  result.emotionAnalysis.forEach((item, index) => {
    if (cleanMultiline(item.description, 1000).length < 80) {
      throw new Error(`fortune tea house quality failed: emotionAnalysis.${index}.reason too short`);
    }
  });
  // 🔴 요구사항 1: 뽑힌 카드는 한 장도 빠짐없이 개별 해석되어야 한다.
  if (!spreadCards.length) {
    throw new Error("fortune tea house quality failed: tarot spread cards missing");
  }
  spreadCards.forEach((card, index) => {
    const detail = card?.detail || {};
    const missing = TAROT_CARD_DETAIL_FIELDS.filter((field) => cleanMultiline(detail[field], 900).length < 20);
    if (missing.length) {
      throw new Error(`fortune tea house quality failed: tarot card ${index + 1} detail ${missing.join(",")}`);
    }
    const detailText = TAROT_CARD_DETAIL_FIELDS.map((field) => cleanMultiline(detail[field], 900)).join("\n");
    if (detailText.replace(/\s/g, "").length < TAROT_CARD_DETAIL_MIN_CHARS) {
      throw new Error(`fortune tea house quality failed: tarot card ${index + 1} detail too short`);
    }
    // 카드 해석이 다른 카드 자리로 밀리는 사고를 막는다.
    const cardName = cleanText(card?.nameKo, 80);
    if (cardName && !detailText.includes(cardName)) {
      throw new Error(`fortune tea house quality failed: tarot card ${index + 1} name missing`);
    }
  });

  const expectedInteractionCount = buildTarotInteractionPairIndexes(spreadCards.length).length;
  if ((result.cardInteractions || []).length < expectedInteractionCount) {
    throw new Error(`fortune tea house quality failed: tarot card interactions ${(result.cardInteractions || []).length}/${expectedInteractionCount}`);
  }

  // 마음의 향은 이름이 정본 카탈로그 안이어야 하고(merge가 보장), 이유가 실제 카드와 이어져야 한다.
  const scentReason = cleanMultiline(result.heartScent?.reason, 1200);
  if (!isHeartScentName(cleanText(result.heartScent?.name, 40))) {
    throw new Error("fortune tea house quality failed: heart scent name");
  }
  if (scentReason.replace(/\s/g, "").length < 150) {
    throw new Error("fortune tea house quality failed: heart scent reason too short");
  }
  if (!spreadCards.some((card) => cleanText(card?.nameKo, 80) && scentReason.includes(cleanText(card.nameKo, 80)))) {
    throw new Error("fortune tea house quality failed: heart scent not linked to cards");
  }

  const expectedGaugeLabels = new Set(tarotRule.gauges || []);
  const matchedGaugeCount = (result.emotionAnalysis || []).filter((item) => expectedGaugeLabels.has(cleanText(item.label, 80))).length;
  if (matchedGaugeCount < Math.min(4, expectedGaugeLabels.size)) {
    throw new Error("fortune tea house quality failed: tarot category gauges");
  }
  const missingCategoryTerms = (tarotRule.requiredTerms || []).filter((term) => !joined.includes(term));
  if (missingCategoryTerms.length) {
    throw new Error(`fortune tea house quality failed: tarot missing category terms ${missingCategoryTerms.join(",")}`);
  }
  if (!Array.isArray(result.choiceSimulation) || result.choiceSimulation.length < 4) {
    throw new Error("fortune tea house quality failed: tarot category action plan");
  }
  if (isLoveTarotQuestion(result, fallback)) {
    const missing = TAROT_LOVE_REQUIRED_TERMS.filter((term) => !joined.includes(term));
    if (missing.length) {
      throw new Error(`fortune tea house quality failed: tarot missing terms ${missing.join(",")}`);
    }
    const missingReunion = isReunionTarotQuestion(result, fallback) ? TAROT_REUNION_REQUIRED_TERMS.filter((term) => !joined.includes(term)) : [];
    if (missingReunion.length) {
      throw new Error(`fortune tea house quality failed: tarot missing reunion terms ${missingReunion.join(",")}`);
    }
    if (!Array.isArray(result.choiceSimulation) || result.choiceSimulation.length < 4) {
      throw new Error("fortune tea house quality failed: tarot 7day plan");
    }
  }
}

function assertConsultQuality(result, fallback) {
  assertText(result.sessionTitle, "sessionTitle");
  assertText(result.questionSummary, "questionSummary");
  assertText(result.saju?.title, "saju.title");
  assertText(result.saju?.summary, "saju.summary");
  assertText(result.tarot?.reading, "tarot.reading");
  assertText(result.synthesis?.title, "synthesis.title");
  assertText(result.synthesis?.summary, "synthesis.summary");
  assertText(result.synthesis?.sajuTarotBridge, "synthesis.sajuTarotBridge");
  assertText(result.yeoniReading?.intro, "yeoniReading.intro");
  assertText(result.yeoniReading?.main, "yeoniReading.main");
  assertText(result.yeoniReading?.advice, "yeoniReading.advice");
  assertText(result.yeoniReading?.caution, "yeoniReading.caution");
  assertText(result.actionPrescription, "actionPrescription");
  assertText(result.closingLine, "closingLine");

  if (result.tarot.cardId !== fallback.tarot.cardId || result.tarot.orientation !== fallback.tarot.orientation) {
    throw new Error("fortune tea house quality failed: tarot identity changed");
  }
  if (result.tarot.nameKo !== fallback.tarot.nameKo || result.tarot.nameEn !== fallback.tarot.nameEn) {
    throw new Error("fortune tea house quality failed: tarot name changed");
  }
  if (fallback.consultationMode === "sukuyo") {
    assertText(result.sukuyoCompatibility?.title, "sukuyoCompatibility.title");
    assertText(result.sukuyoCompatibility?.summary, "sukuyoCompatibility.summary");
    assertText(result.sukuyoCompatibility?.user?.name, "sukuyoCompatibility.user.name");
    assertText(result.sukuyoCompatibility?.partner?.name, "sukuyoCompatibility.partner.name");
    if (fallback.sukuyoCompatibility?.available) {
      if (result.sukuyoCompatibility?.relationType !== fallback.sukuyoCompatibility.relationType) {
        throw new Error("fortune tea house quality failed: sukuyo relation changed");
      }
      if (result.sukuyoCompatibility?.user?.sukuyoName !== fallback.sukuyoCompatibility.user.sukuyoName) {
        throw new Error("fortune tea house quality failed: user sukuyo changed");
      }
      if (result.sukuyoCompatibility?.partner?.sukuyoName !== fallback.sukuyoCompatibility.partner.sukuyoName) {
        throw new Error("fortune tea house quality failed: partner sukuyo changed");
      }
      if (result.sukuyoCompatibility?.scores?.total !== fallback.sukuyoCompatibility.scores?.total) {
        throw new Error("fortune tea house quality failed: sukuyo score changed");
      }
      if (result.sukuyoCompatibility?.relationDetail?.typeAToB !== fallback.sukuyoCompatibility.relationDetail?.typeAToB) {
        throw new Error("fortune tea house quality failed: sukuyo directional relation changed");
      }
      const sukuyoJoined = [
        result.sukuyoCompatibility?.title,
        result.sukuyoCompatibility?.summary,
        ...(result.sukuyoCompatibility?.strengths || []),
        ...(result.sukuyoCompatibility?.cautions || []),
        result.synthesis?.summary,
        result.synthesis?.sajuTarotBridge,
        result.yeoniReading?.intro,
        result.yeoniReading?.main,
        result.yeoniReading?.advice,
        result.yeoniReading?.caution,
        result.actionPrescription,
        result.closingLine,
        ...(result.choiceSimulation || []).flatMap((item) => [item.title, item.subtitle, item.result, item.caution]),
      ].filter(Boolean).join("\n");
      const sukuyoCompactLength = sukuyoJoined.replace(/\s/g, "").length;
      if (sukuyoCompactLength < SUKUYO_MIN_RESULT_CHARS) {
        throw new Error(`fortune tea house quality failed: sukuyo length ${sukuyoCompactLength}`);
      }
      const sukuyoAnchors = [
        fallback.sukuyoCompatibility.user?.sukuyoName,
        fallback.sukuyoCompatibility.partner?.sukuyoName,
        fallback.sukuyoCompatibility.relationType,
      ].map((value) => cleanText(value, 60)).filter(Boolean);
      const missingSukuyoAnchors = sukuyoAnchors.filter((anchor) => !sukuyoJoined.includes(anchor));
      if (missingSukuyoAnchors.length) {
        throw new Error(`fortune tea house quality failed: sukuyo anchors ${missingSukuyoAnchors.join(",")}`);
      }
    }
  }
  if (!Array.isArray(result.emotionAnalysis) || result.emotionAnalysis.length < 4) {
    throw new Error("fortune tea house quality failed: emotionAnalysis");
  }
  result.emotionAnalysis.forEach((item, index) => {
    assertText(item.label, `emotionAnalysis.${index}.label`);
    assertText(item.description, `emotionAnalysis.${index}.description`);
    const value = Number(item.value);
    if (!Number.isFinite(value)) throw new Error("fortune tea house quality failed: emotion value");
    item.value = Math.max(0, Math.min(100, Math.round(value)));
  });
  if (!Array.isArray(result.choiceSimulation) || result.choiceSimulation.length < 3) {
    throw new Error("fortune tea house quality failed: choiceSimulation");
  }
  result.choiceSimulation.slice(0, 3).forEach((choice, index) => {
    assertText(choice.title, `choiceSimulation.${index}.title`);
    assertText(choice.subtitle, `choiceSimulation.${index}.subtitle`);
    assertText(choice.result, `choiceSimulation.${index}.result`);
    assertText(choice.caution, `choiceSimulation.${index}.caution`);
  });
  if (!Array.isArray(result.luckyKeywords) || result.luckyKeywords.length < 2) {
    throw new Error("fortune tea house quality failed: luckyKeywords");
  }
  if (isSajuFamilyMode(fallback.consultationMode)) {
    assertSajuDeepQuality(result, fallback);
  }
  // 사주 궁합은 상대 명식 해석이 서사에 실제로 담겼는지 확인한다(본인 위주로 흐르는 것을 차단).
  if (fallback.consultationMode === "sajuCompatibility" && fallback.sajuCompatibility?.available) {
    const joined = collectConsultText(result);
    const compat = fallback.sajuCompatibility;
    const partner = compat.partner || {};
    const partnerName = cleanText(partner.name, 60);
    if (partnerName && !joined.includes(partnerName)) {
      throw new Error("fortune tea house quality failed: saju compat partner not interpreted");
    }
    // 상대 일간(천간)이 본문에 실제로 등장하는지 확인 — 이름만 언급하고 명식은 본인 사주인 경우를 차단.
    // 포맷 기인 false negative를 피하려 dayMaster의 맨 천간 글자만 비교하고, 실패는 상위 degrade가 흡수한다.
    const stemOf = (dayMaster) => (String(dayMaster || "").match(/[갑을병정무기경신임계]/) || [""])[0];
    const partnerStem = stemOf(partner.saju?.dayMaster);
    const selfStem = stemOf(compat.user?.saju?.dayMaster);
    if (partner.saju?.available === true && partnerStem && !joined.includes(partnerStem)) {
      throw new Error("fortune tea house quality failed: saju compat partner ilgan missing");
    }
    // 두 일간이 다른데 본인 천간이 본문에 전혀 없으면 본인 명식을 상대 것으로 오인했을 가능성 — 함께 확인한다.
    if (partnerStem && selfStem && partnerStem !== selfStem && compat.user?.saju?.available === true && !joined.includes(selfStem)) {
      throw new Error("fortune tea house quality failed: saju compat self ilgan missing");
    }
  }
  if (fallback.consultationMode === "tarot") {
    assertTarotDeepQuality(result, fallback);
  }
  assertNoMechanicalCopy(result);
}

const sharedOutputRules = [
  "상담문은 베타 안내나 결과 설명이 아니라, 연이가 바로 앞에서 조용히 말해 주는 상담처럼 쓴다.",
  "yeoniReading.intro는 손님을 맞이하는 짧은 환영 인사(어서 오세요 류)로 문을 열고, 이번 질문을 어떻게 읽을지 한두 문장으로 잇는다. 환영 인사는 intro에서 한 번만 하고 다른 필드에서 반복하지 않는다.",
  "같은 논지, 같은 조언, 같은 금지 문구를 여러 필드에서 반복하지 않는다. 각 주제는 가장 알맞은 필드 한 곳에서 깊게 다루고, 다른 필드는 새로운 정보를 더할 때만 그 주제를 한 줄로 잇는다. 문장 단위 재사용은 실패다.",
  "100% 확정, 공포 조장, 의료/법률/금융 판단, 상대방 속마음 단정, 현실 판단 흐리기 유도는 금지한다.",
  "시스템 문구, 프롬프트 원문, 모델명, 제공자 이름, 형식 설명은 결과 문장에 절대 쓰지 않는다.",
  "같은 주어 반복을 줄이고 전문적이지만 다정한 한국어 상담 문장으로 쓴다.",
  "운명의 찻집, 찻잔, 마음의 향, 달빛 이미지는 가끔만 자연스럽게 쓴다.",
  "반드시 유효한 JSON 하나만 반환한다. 마크다운과 JSON 밖 설명은 쓰지 않는다.",
];

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return buildSystemPrompt();
}

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   사용자 프롬프트는 뽑은 타로 카드·계산된 명식 스냅샷을 입력으로 받아 조립되므로
   생년 정보만으로는 만들 수 없다. 상담 모드별 시스템 프롬프트를 정확히 돌려준다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const modes = [
    { key: "tarot", label: "타로" },
    { key: "saju", label: "사주" },
    { key: "sajuCompatibility", label: "사주 궁합" },
    { key: "sukuyo", label: "숙요" },
  ];
  const mode = modes.find((item) => item.key === options.variant) || modes[0];

  return {
    systemPrompt: buildSystemPrompt(mode.key),
    prompt: "",
    partial: true,
    partialReason: "사용자 프롬프트는 뽑은 카드와 계산된 명식 스냅샷을 입력으로 받습니다. 시스템 프롬프트만 표시합니다.",
    variantKey: mode.key,
    variants: modes,
  };
}

function buildSystemPrompt(consultationMode = "tarot") {
  if (isSajuFamilyMode(consultationMode)) {
    const compatLines = consultationMode === "sajuCompatibility"
      ? [
          "이번 상담은 사주 '궁합' 상담이다. selfProfile은 본인, partnerProfile은 상대의 명식이며 서로 다른 사람의 서로 다른 데이터다. 두 사람 각각의 사주를 독립적으로 산출·해석한 뒤 두 명식을 대조해 궁합을 푼다. 한 사람의 사주로 두 사람을 풀거나, 본인 사주를 상대 사주로 서술하는 것은 상담 실패다.",
          "먼저 dataCheck.selfDayMaster와 dataCheck.partnerDayMaster를 대조하라. 두 일간이 다르면 본인과 상대의 성향·오행·십성 서술이 서로 달라야 한다. 두 일간이 같아도 월지·시주·오행 분포·십성 배치는 다르므로 반드시 구분해 서술한다. 두 사람 서술이 같아지면 데이터 매핑 오류이니 처음부터 다시 대조한다.",
          "상대 명식(partnerProfile)의 일간·오행·십성은 오직 partnerProfile 데이터만으로 서술한다. 본인 명식은 selfProfile과 sajuFacts 데이터만으로 서술한다. 두 데이터를 섞지 않는다.",
          "십성은 사람별 확정표만 쓴다: 본인 십성은 selfProfile.myeongsikFacts.tenGodFixedTable만, 상대 십성은 partnerProfile.myeongsikFacts.tenGodFixedTable만 사용하고, 한쪽 표를 다른 사람에게 쓰지 않는다.",
          "partnerProfile(상대 명식)의 일간·오행·십성을 본인과 동등한 분량과 깊이로 반드시 해석한다. 본인만 풀고 상대를 한두 줄로 요약만 하는 것은 실패다.",
          "두 일간의 오행 관계(상생/상극/동류/보완), 오행의 보완과 충돌, 십성 대조를 근거로 두 사람이 어디서 맞물리고 어디서 부딪히는지 짚고, 관계의 운 흐름과 현실 조언을 함께 준다.",
          "글의 흐름은 ①본인 사주 핵심 → ②상대 사주 핵심 → ③두 명식의 상호작용·궁합 → ④질문에 대한 답(두 사람 관점 모두) → ⑤관계 운의 흐름과 조언 순서로, 어느 한쪽으로 치우치지 않게 쓴다. 상대는 partnerProfile.name의 이름으로 부른다.",
          "출력 직전 반드시 자기검증한다: (1)'상대방의 사주' 섹션이 본인과 다른 문장인가, (2)상대 일간·오행이 partnerProfile 기준인가, (3)'두 사람의 궁합' 섹션이 두 명식을 실제 교차 분석했는가, (4)'질문에 대한 답'에 두 사람 관점이 모두 담겼는가. 하나라도 아니면 다시 쓴다.",
        ]
      : [];
    return [
      ...yeoniPersonaPrompt,
      consultationMode === "sajuCompatibility"
        ? "이번 상담은 사주 궁합 상담이다. 타로 카드, 점성술, 숙요점, 자미두수는 언급하지도 근거로 쓰지도 않는다."
        : "이번 상담은 사주 상담이다. 타로 카드, 점성술, 숙요점, 자미두수는 언급하지도 근거로 쓰지도 않는다.",
      "연이는 명리학 30년의 대가다. 원국을 전문가의 깊이로 읽되, 손님에게는 연이의 온기로 풀어 건넨다.",
      ...baseSajuSystemPrompt,
      ...sajuSafetyRules,
      ...compatLines,
      "해석은 반드시 이 순서로 사고하되 결과는 자연스러운 이야기로 푼다: 1) 일간이 월지 계절에서 힘을 얻는지 잃는지와 생극제화, 2) 오행 분포의 과다/부족과 보완 지점, 3) 십성 배치가 만드는 표현(식상)·현실(재성)·절제(관성)·생각(인성)·자아(비겁)의 균형, 4) 지지 합충형해파가 실제 생활에서 만드는 마찰과 조화, 5) 지금 대운·세운이 순풍인지 역풍인지.",
      "각 강점과 주의점에는 명리학적 근거를 최소 1개씩 붙인다. '일간이 ○인데 월지가 ○라서 이런 흐름이 생겨요'처럼 근거를 밝혀서 푼다.",
      "주의점은 위협이 아니라 '이 부분만 알고 있으면 돼요'의 온도로 말한다.",
      "사주 용어를 쓰되 그 자리에서 한 문장으로 풀어 주고, 같은 문장 패턴을 반복하지 않는다.",
      "사주 상담은 사용자의 실제 입력값, 출생시간 미상 여부, 오행 균형, 십성, 질문을 서로 연결해 충분한 분량으로 작성한다.",
      "궁합 질문이 아니어도 일반 질문(일, 돈, 마음, 시기, 선택)을 같은 깊이로 다룬다. 질문이 넓으면 이 명식에서 지금 가장 크게 움직이는 흐름부터 짚는다.",
      "전달받은 십성만 사용한다. primaryTenGod이 없으면 십성 이름을 새로 만들지 않는다.",
      "챕터 소제목은 요구된 제목을 한 글자도 바꾸지 말고 그대로 쓰고, 본문은 소제목의 그림을 이어 가는 이야기처럼 잇는다.",
      ...sharedOutputRules,
    ].join("\n");
  }
  if (consultationMode === "sukuyo") {
    return [
      ...yeoniPersonaPrompt,
      "이번 상담은 숙요점 궁합 상담이다. 타로 카드, 사주 오행·십성, 점성술, 자미두수는 언급하지도 근거로 쓰지도 않는다.",
      ...baseSukuyoSystemPrompt,
      ...sukuyoSafetyRules,
      "숙요점 궁합에서는 전달받은 27숙, 관계 유형, 거리, 방향, 오행 조화, 영역 점수, 키워드만 사용한다. 없는 숙요 계산값과 상대의 속마음은 만들지 않는다.",
      ...sharedOutputRules,
    ].join("\n");
  }
  return [
    ...yeoniPersonaPrompt,
    "이번 상담은 타로 상담이다. 사주, 점성술, 숙요점, 자미두수는 언급하지도 근거로 쓰지도 않는다.",
    ...baseTarotSystemPrompt,
    ...tarotSafetyRules,
    ...tarotNarrativeOwnershipRules,
    "전달받은 타로 cardId, nameKo, nameEn, orientation, keywords, meaning은 절대 바꾸지 않는다.",
    "타로 상담은 전달받은 카드의 전통 의미와 정방향/역방향 의미를 중심 근거로 삼고, 카드 이미지의 상징을 사용자가 이해할 수 있는 현실 언어로 번역한다.",
    "타로 상담에서는 질문을 먼저 연애, 재회, 상대방 마음, 연락운, 관계 지속 가능성, 짝사랑, 이별 후 정리, 일·직장, 돈·재물, 진로, 인간관계, 오늘의 운세, 선택 고민, 마음 정리 중 하나로 분류하고 그 관점으로 쓴다.",
    "타로 상담은 반드시 카드의 상징 → 현재 상황 → 숨은 감정 → 전체 흐름 → 행동 조언 순서로 연결한다.",
    "3장 이상 배열에서는 현재/흐름/조언 또는 현재/상대·상황/장애/가능성/조언의 위치 의미를 자연스럽게 엮어 하나의 리딩으로 만든다.",
    "연이는 귀엽고 따뜻하지만 듣기 좋은 말만 하지 않는다. 손님의 마음을 다치지 않게 말하되 카드가 보여주는 불편한 진실도 부드럽게 짚는다.",
    "카드 이름, 정방향/역방향, 질문 유형, 찻잔의 성격을 반드시 반영한다.",
    "재회됩니다, 절대 안 됩니다, 상대는 반드시 당신을 사랑합니다처럼 확정하지 않는다.",
    "연락을 계속하세요처럼 집착을 부추기지 않는다. 상대가 거부하거나 차단한 상황이면 연락보다 멈춤과 존중을 우선한다.",
    ...sharedOutputRules,
  ].join("\n");
}

function describeQualityIssue(message) {
  const text = String(message || "");
  if (/length/i.test(text)) return "분량이 부족했다. 각 소제목 아래를 훨씬 깊고 길게 써서 요구 분량을 넘긴다.";
  if (/sections|deepSections/i.test(text)) return "필수 소제목이 빠지거나 제목이 달랐다. requiredDeepSections의 제목을 한 글자도 바꾸지 말고 모두 채운다.";
  if (/forbidden|generic|copy/i.test(text)) return "금지 표현이나 상투적인 문장이 있었다. 다른 점술 체계 언급과 일반론을 빼고 입력된 근거로만 쓴다.";
  if (/missing|anchor|terms|orientation|keyword|name/i.test(text)) return "필수 근거(카드명, 방향, 본명숙, 관계 유형, 카테고리 용어)가 본문에 빠졌다. 입력값의 이름을 문장 안에 그대로 살린다.";
  if (/repeated/i.test(text)) return "같은 문단이 반복됐다. 문단마다 새로운 근거와 새로운 문장으로 쓴다.";
  if (/parse|json/i.test(text)) return "형식이 깨졌다. 다른 텍스트 없이 완결된 결과 하나만 반환한다.";
  return "품질 기준에 미달했다. 필수 구조, 요구 분량, 근거 연결을 모두 지킨다.";
}

// ── 섹션 병렬 생성 ───────────────────────────────────────────────────────────
// 통짜 한 호출은 6천 자 근처에서 스스로 멈춘다 — 예전 하한(타로 3,200·사주 6,000)이 거기 묶여
// 있던 이유다. 그래서 결과 JSON 을 서로 겹치지 않는 그룹으로 나눠 한 요청 안에서 동시에 돌린다.
// 벽시계는 합계가 아니라 최댓값이다. 정본 패턴: worker/routes/love-secret-ai.js
// (실패를 값으로 돌리는 그룹 생성기 + Workers AI 폴백까지 덮는 하드 데드라인 레이스).
//
// share 는 모드 하한을 나눠 갖는 비율이다. 카테고리 규칙이나 5카드 가산으로 하한이 달라져도
// 그룹 정의는 그대로 두면 되고, "그룹 하나가 단일 호출 한계를 넘는가"를 한 자리에서 볼 수 있다.
const FORTUNE_TEA_GROUP_MAX_OUTPUT_TOKENS = 12000;
const FORTUNE_TEA_GROUP_TIMEOUT_MS = 62000;
const FORTUNE_TEA_REPAIR_TIMEOUT_MS = 30000;
const FORTUNE_TEA_MIN_REMAINING_MS = 9000;
const FORTUNE_TEA_LLM_DEADLINE_MS = 86000;

// 서버가 고정하는 필드 — 어느 그룹의 스키마에서도 preserve 로 남는다.
const FORTUNE_TEA_PRESERVED_SCHEMA_KEYS = Object.freeze(["consultationMode", "teaCup", "tarotSpread", "tarotSpreadCards"]);

const FORTUNE_TEA_READING_FIELDS = Object.freeze(["emotionAnalysis", "yeoniReading"]);
const FORTUNE_TEA_PRESCRIPTION_FIELDS = Object.freeze([
  "synthesis", "choiceSimulation", "actionPrescription", "luckyKeywords", "closingLine",
]);
const FORTUNE_TEA_SAJU_GROUPS = Object.freeze([
  Object.freeze({ key: "core", label: "명식 심층 판독", share: 0.56, fields: Object.freeze(["sessionTitle", "questionSummary", "saju"]) }),
  Object.freeze({ key: "reading", label: "연이의 리딩", share: 0.22, fields: FORTUNE_TEA_READING_FIELDS }),
  Object.freeze({ key: "prescription", label: "종합과 처방", share: 0.22, fields: FORTUNE_TEA_PRESCRIPTION_FIELDS }),
]);
const FORTUNE_TEA_SECTION_GROUPS = Object.freeze({
  saju: FORTUNE_TEA_SAJU_GROUPS,
  sajuCompatibility: FORTUNE_TEA_SAJU_GROUPS,
  tarot: Object.freeze([
    Object.freeze({
      key: "cards",
      label: "카드 판독",
      share: 0.5,
      fields: Object.freeze(["sessionTitle", "questionSummary", "tarot", "tarotCardReadings", "cardInteractions", "heartScent"]),
    }),
    Object.freeze({ key: "reading", label: "연이의 리딩", share: 0.25, fields: FORTUNE_TEA_READING_FIELDS }),
    Object.freeze({ key: "prescription", label: "종합과 처방", share: 0.25, fields: FORTUNE_TEA_PRESCRIPTION_FIELDS }),
  ]),
  sukuyo: Object.freeze([
    Object.freeze({ key: "compatibility", label: "본명숙 궁합 판독", share: 0.45, fields: Object.freeze(["sessionTitle", "questionSummary", "sukuyoCompatibility"]) }),
    Object.freeze({ key: "reading", label: "연이의 리딩", share: 0.275, fields: FORTUNE_TEA_READING_FIELDS }),
    Object.freeze({ key: "prescription", label: "종합과 처방", share: 0.275, fields: FORTUNE_TEA_PRESCRIPTION_FIELDS }),
  ]),
});

/** 모드 하한(카테고리 규칙·5카드 가산 반영)을 그룹별 몫으로 나눈다. */
function resolveFortuneTeaGroups(request, fallback, consultationMode) {
  const groups = FORTUNE_TEA_SECTION_GROUPS[consultationMode] || FORTUNE_TEA_SECTION_GROUPS.tarot;
  const modeMinChars = isSajuFamilyMode(consultationMode)
    ? getSajuMinResultChars(request)
    : consultationMode === "sukuyo"
      ? SUKUYO_MIN_RESULT_CHARS
      : getTarotMinResultChars({
        selectedTeaCupId: request?.selectedTeaCupId || fallback?.teaCup?.id,
        selectedTeaCupName: request?.selectedTeaCupName || fallback?.teaCup?.name,
        selectedTeaCupTopic: request?.selectedTeaCupTopic || fallback?.teaCup?.topic,
        teaCup: fallback?.teaCup,
        tarotSpread: request?.tarotSpread || fallback?.tarotSpread,
      });
  return groups.map((group) => ({
    ...group,
    modeMinChars,
    minChars: Math.round(modeMinChars * group.share),
    handledElsewhere: groups.filter((other) => other.key !== group.key).map((other) => other.label),
  }));
}

/**
 * 그룹 호출은 사실 컨텍스트·문체 규칙을 그대로 물려받고 **출력 스키마만** 좁힌다.
 * 그룹마다 프롬프트를 새로 쓰면 규칙이 갈라져 모드별 품질 게이트와 어긋난다.
 */
function applyFortuneTeaGroupScope(prompt, group) {
  if (!group) return prompt;
  const outputSchema = {};
  for (const [key, value] of Object.entries(prompt.outputSchema || {})) {
    outputSchema[key] = FORTUNE_TEA_PRESERVED_SCHEMA_KEYS.includes(key) || group.fields.includes(key)
      ? value
      : "omit — 이번 호출의 담당이 아니다. 이 키를 반환하지 않는다.";
  }
  return {
    ...prompt,
    groupRule: {
      group: group.label,
      writeOnly: group.fields,
      minimumKoreanChars: group.minChars,
      lengthRule: `이번 호출이 담당한 필드의 텍스트 합계가 공백 제외 ${group.minChars}자 이상이 되도록 쓴다.`
        + ` 상담 전체 목표는 ${group.modeMinChars}자이고 나머지는 다른 그룹이 같은 시각에 쓰고 있다.`,
      handledElsewhere: group.handledElsewhere,
      noOverlapRule: "다른 그룹이 담당하는 내용을 미리 요약하거나 반복하지 않는다."
        + " 같은 상담의 다른 장을 쓰는 중이라고 생각하고, 이 그룹의 각도로만 새 근거를 풀어 쓴다.",
    },
    sajuQualityRule: prompt.sajuQualityRule && {
      ...prompt.sajuQualityRule,
      minimumKoreanChars: group.minChars,
      lengthRule: `이번 호출이 담당한 필드 합계가 공백 제외 ${group.minChars}자 이상이 되도록 쓴다.`
        + " 챕터 구분은 requiredDeepSections의 부드러운 소제목으로 하고, 각 챕터는 호흡이 있는 문단으로 채운다.",
    },
    outputSchema,
  };
}

/** 담당 밖 필드는 병합 전에 버린다 — 프롬프트가 새어 다른 그룹의 글을 덮어쓰지 못하게 한다. */
function pickFortuneTeaGroupFields(parsed, group) {
  if (!parsed || typeof parsed !== "object") return null;
  const picked = {};
  for (const field of group.fields) {
    if (parsed[field] !== undefined) picked[field] = parsed[field];
  }
  return picked;
}

function countFortuneTeaGroupChars(value) {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countFortuneTeaGroupChars(item), 0);
  if (value && typeof value === "object") return Object.values(value).reduce((sum, item) => sum + countFortuneTeaGroupChars(item), 0);
  return 0;
}

function buildUserPrompt(request, fallback, attempt = 0, lastQualityError = "", group = null) {
  const consultationMode = normalizeConsultationMode(request.consultationMode);
  const sajuRule = resolveSajuCategoryRule(request);
  const tarotRule = resolveTarotCategoryRule(request);
  const requiredSajuSections = getSajuRequiredSectionTitles(request);
  const isSajuCompat = consultationMode === "sajuCompatibility";
  const partnerName = cleanText(fallback?.sajuCompatibility?.partner?.name, 40) || "상대";
  const sajuFactInput = isSajuFamilyMode(consultationMode) ? buildSajuFactInput(request, fallback.saju, sajuRule, fallback) : undefined;
  const tarotFactInput = consultationMode === "tarot" ? buildTarotFactInput(request, fallback, tarotRule) : undefined;
  const sukuyoFactInput = consultationMode === "sukuyo" ? buildSukuyoFactInput(request, fallback) : undefined;
  const focusRule =
    isSajuCompat
      ? `사주 궁합 상담만 작성한다. sajuFactInput.selfProfile(본인)과 sajuFactInput.partnerProfile(상대 ${partnerName})의 두 명식을 각각 일간·오행·십성 근거로 해석하고 대조한다. 상대 명식(partnerProfile) 해석을 본인과 동등한 분량으로 반드시 포함하고, 타로·점성술·숙요점은 근거로 쓰지 않는다. 우선 해석 렌즈는 ${sajuRule.focus.join(", ")}과 두 일간의 상생·상극 관계다.`
      : consultationMode === "saju"
        ? `사주 상담만 작성한다. ${sajuRule.category} 카테고리의 관점으로만 쓴다. 상담 컨셉은 "${sajuRule.concept}"이다. 기존 사주 초안, 일간, 월지/계절, 오행, 십성, 천간·지지 관계, 현재 운, 출생정보 안에서 확인되는 흐름만 말하고 타로 카드는 상담 근거로 쓰지 않는다. 우선 해석 렌즈는 ${sajuRule.focus.join(", ")}이다.`
      : consultationMode === "sukuyo"
        ? "숙요점 궁합 상담만 작성한다. sukuyoFactInput의 사용자 본명숙, 상대 본명숙, 관계 유형, 거리, 방향별 관계, 오행 조화, 영역 점수, 관계 카테고리만 근거로 삼고 타로 카드와 사주 오행·십성은 상담 근거로 쓰지 않는다."
      : `타로 상담만 작성한다. ${tarotRule.category} 카테고리의 관점으로만 쓴다. 상담 컨셉은 "${tarotRule.concept}"이다. tarotFactInput의 카드명, 정방향/역방향, 전통 의미, 배열법, 위치 의미를 바꾸지 말고 질문 맥락과 연결해 실제 리딩처럼 쓴다. 우선 해석 렌즈는 ${tarotRule.focus.join(", ")}이다.`;
  const bridgeRule =
    isSajuCompat
      ? "synthesis.sajuTarotBridge는 이름과 달라도 사주 궁합-only 요약으로 쓴다. 두 사람의 명식이 만나는 결을 한두 문장으로 잇고 타로, 카드, 점성술, 숙요점을 근거처럼 쓰지 않는다."
      : consultationMode === "saju"
        ? "synthesis.sajuTarotBridge는 이름과 달라도 사주-only 요약으로 쓴다. 타로, 카드, card라는 단어를 상담 근거처럼 쓰지 않는다."
      : consultationMode === "sukuyo"
        ? "synthesis.sajuTarotBridge는 이름과 달라도 숙요점 궁합-only 요약으로 쓴다. 타로, 카드, 사주, 오행, 십성을 상담 근거처럼 쓰지 않는다."
      : "synthesis.sajuTarotBridge는 이름과 달라도 타로-only 요약으로 쓴다. 사주, 오행, 십성을 상담 근거처럼 쓰지 않는다.";
  return JSON.stringify(
    applyFortuneTeaGroupScope({
      task: "운명의 찻집 상담 결과를 연이의 목소리로 자연스럽고 깊게 다듬는다.",
      consultationMode,
      focusRule,
      bridgeRule,
      qualityRecovery: attempt > 0
        ? `이전 응답이 품질 검증을 통과하지 못했다. ${describeQualityIssue(lastQualityError)}`
        : undefined,
      sajuFactInput,
      tarotFactInput,
      sukuyoFactInput,
      sajuQualityRule: isSajuFamilyMode(consultationMode)
        ? {
            category: sajuRule.category,
            resultKey: sajuRule.resultKey,
            minimumKoreanChars: getSajuMinResultChars(request),
            targetKoreanChars: SAJU_TARGET_RESULT_CHARS,
            lengthRule: `공백 제외 ${getSajuMinResultChars(request)}자 이상, 전체 ${SAJU_TARGET_RESULT_CHARS}자 안팎으로 쓴다. 챕터 구분은 requiredDeepSections의 부드러운 소제목으로 하고, 각 챕터는 호흡이 있는 문단으로 채운다.`,
            requiredDeepSections: requiredSajuSections,
            categorySchema: isSajuCompat ? undefined : sajuResultSchemaByCategory[sajuRule.id],
            compatibilityRule: isSajuCompat
              ? `본인(selfProfile)과 상대(partnerProfile, ${partnerName})의 두 명식을 각각 해석한 뒤 대조한다. deepSections 안에서 상대 명식(일간·오행·십성) 해석을 본인과 동등한 분량으로 반드시 다루고, 두 일간의 상생·상극·동류·보완과 십성 대조로 궁합을 푼다. 상대를 요약만 하고 본인 위주로 흐르면 실패다.`
              : undefined,
            thinkingOrder: isSajuCompat
              ? [
                  "STEP0(데이터 검증): dataCheck.selfDayMaster와 dataCheck.partnerDayMaster를 대조한다. 다르면 두 서술이 달라야 하고, 같아도 월지·시주·오행·십성으로 구분한다. selfProfile과 partnerProfile을 절대 혼동하지 않는다.",
                  "본인(selfProfile) 일간이 월지 계절에서 힘을 얻는지 잃는지, 오행 분포, 십성 배치를 selfProfile·sajuFacts만으로 정리한다. 십성은 selfProfile.myeongsikFacts.tenGodFixedTable만 쓴다.",
                  `상대(partnerProfile, ${partnerName})의 일간·오행·십성을 partnerProfile만으로, 본인과 같은 깊이로 정리한다. 십성은 partnerProfile.myeongsikFacts.tenGodFixedTable만 쓴다.`,
                  "두 일간의 오행 관계(상생/상극/동류/보완)와 오행의 보완·충돌을 판정한다.",
                  "십성 대조로 두 사람의 표현·현실·절제·생각 방식이 어디서 맞고 어디서 어긋나는지 본다.",
                  "두 사람의 현재 대운·세운이 관계에 순풍인지 역풍인지 본다.",
                  "위 근거들을 질문 한 문장과 연결해 하나의 궁합 이야기로 엮는다.",
                ]
              : [
              "일간이 월지 계절에서 힘을 얻는지 잃는지, 생극제화의 방향을 먼저 본다.",
              "오행 분포의 과다/부족과 그것이 삶에서 나타나는 장면을 본다.",
              "십성 배치가 만드는 표현·현실·절제·생각·자아의 균형을 본다.",
              "지지 합충형해파가 실제 생활에서 만드는 마찰과 조화 지점을 찾는다.",
              "지금 대운·세운이 이 질문에 순풍인지 역풍인지 판정한다.",
              "myeongsikFacts가 있으면 십성 확정표(tenGodFixedTable)를 벗어난 십성을 만들지 말고, 지장간 투간/투출·개고·도충·운 흐름(luckRows) 사실을 해당 챕터의 근거로 자연스럽게 인용한다.",
              "위 근거들을 손님의 질문 한 문장과 연결해 하나의 이야기로 엮는다.",
            ],
            resultFlow: isSajuCompat
              ? [
                  "'당신의 사주': 본인(selfProfile)이 어떤 사람인지 일간·월지/계절·오행 분포·십성 근거로 충분히 짚는다. 이 섹션은 오직 본인 데이터(selfProfile·sajuFacts)만 쓴다.",
                  `'상대방의 사주': 상대(${partnerName}, partnerProfile)가 어떤 사람인지 본인과 동등한 분량으로 같은 틀(일간·월지/계절·오행·십성)로 짚는다. 오직 partnerProfile 데이터만 쓰고, 본인 명식과 반드시 다른 내용이어야 한다. 한두 줄 요약은 실패다.`,
                  "'두 사람의 궁합': 두 일간의 오행 관계(상생/상극/동류/보완), 오행의 보완·충돌, 십성 대조로 두 사람이 어디서 맞물리고 어디서 부딪히는지 실제로 교차 분석한다. 한 사람 사주만 반복하지 않는다.",
                  "'질문에 대한 답': 손님의 질문에 직접 답하되, 본인 사주와 상대 사주가 그 답에 각각 어떻게 작용하는지 두 사람 관점을 모두 밝힌다.",
                  "'함께일 때의 강점': 두 명식이 함께일 때 살아나는 강점 2~3가지를 명리 근거와 함께 짚는다.",
                  "'미리 알아둘 주의점': 부딪히기 쉬운 지점 2~3가지를 위협이 아니라 '이 부분만 알면 돼요'의 온도로 짚는다.",
                  "'지금 이 시기 관계의 운': 두 사람의 대운·세운이 관계에 부는 순풍·역풍을 짚는다.",
                  "'찻집의 처방': 두 사람이 오늘부터 할 수 있는 관계 실천을 준다.",
                  "'연이의 한마디': 따뜻한 제안 하나로 마무리한다.",
                ]
              : [
              "타고난 결: 손님이 어떤 사람인지 타고난 성향부터 먼저 짚는다. 일간과 월지/계절, 오행 분포를 근거로 '일간이 ○인데 월지가 ○라서'처럼 근거를 밝혀, 신뢰가 서도록 성향을 전반적으로 풀어준다.",
              "첫 잔: 인사와 첫인상. 앞서 읽은 성향을 이어받아, 그런 손님이 이 질문을 들고 온 이유를 한 폭의 그림처럼 짧게 연다.",
              "마음의 물길: 십성 배치가 만드는 마음과 행동의 패턴을 현실 장면으로 풀어준다.",
              "잘 풀리는 결: 강점 2~3가지. 각각에 명리 근거를 명시한다.",
              "삐걱대는 결: 주의점 2~3가지. 합충형해파나 오행 치우침 근거를 붙이되 위협이 아니라 '이 부분만 알고 있으면 돼요'의 온도로 말한다.",
              "지금 이 시기: 대운·세운 타이밍 조언. 서두를 때와 기다릴 때를 구분한다.",
              "찻집의 처방: 실천 가능한 행동 플랜을 날짜 감각과 함께 준다.",
              "연이의 한마디: 실천 가능한 따뜻한 제안 하나로 마무리한다.",
            ],
            qualityChecklist: isSajuCompat
              ? [
                  "'상대방의 사주' 섹션이 '당신의 사주' 섹션과 다른 문장·다른 명식 내용인가.",
                  "상대 일간·오행·십성이 partnerProfile 기준으로 서술됐는가(본인 명식을 상대 것으로 쓰지 않았는가).",
                  "'두 사람의 궁합' 섹션이 두 명식을 실제 교차 분석했는가(한 명 사주만 반복하지 않았는가).",
                  "'질문에 대한 답'에 본인과 상대 두 사람 관점이 모두 담겼는가.",
                  "각 강점/주의점에 명리학적 근거가 최소 1개씩 붙어 있는가.",
                ]
              : [
                  "각 강점/주의점에 명리학적 근거가 최소 1개씩 붙어 있는가.",
                  "일반론이 아니라 이 원국에서만 나오는 이야기인가.",
                  "손님이 읽고 위로받았다고 느낄 수 있는가.",
                ],
            sectionRule: "saju.deepSections는 requiredDeepSections의 제목을 정확히 title로 쓰고, 각 body는 실제 입력값·일간·월지/계절·오행·십성·천간/지지 관계·현재 운의 흐름·질문 중 확인된 근거를 2개 이상 자연스럽게 연결한다.",
            repetitionRule: "같은 조언과 같은 문장을 여러 챕터·필드에서 반복하지 않는다. 구체 행동·금지 행동 목록은 actionPrescription에만, 단계 플랜은 choiceSimulation에만 두고, '찻집의 처방' 챕터는 그 플랜을 손님의 생활 장면으로 풀어내는 서사에 집중한다. 나머지 챕터는 해석과 명리 근거에 집중한다.",
            sectionLengthRule: "각 deepSection body는 요구 하한을 넘겨 대략 250~350자 안팎으로 쓰되, 분량은 아래 evidenceDistribution의 서로 다른 근거로 채운다. 같은 명식 사실을 여러 챕터에서 되풀이해 길이를 늘리지 않는다.",
            evidenceDistribution: isSajuCompat
              ? "섹션마다 서로 다른 근거를 나눠 쓴다: '당신의 사주'=selfProfile의 일간·월지/계절·오행·selfProfile.myeongsikFacts 십성 확정표, '상대방의 사주'=partnerProfile의 일간·월지/계절·오행·partnerProfile.myeongsikFacts 십성 확정표, '두 사람의 궁합'=두 일간의 상생·상극과 오행 보완·충돌·십성 대조, '지금 이 시기 관계의 운'=두 사람의 대운/세운 순풍·역풍. 본인 근거와 상대 근거를 섞지 않는다."
              : "챕터마다 myeongsikFacts의 서로 다른 근거를 나눠 쓴다: '타고난 결/마음의 물길'=일간·월지/계절·오행·십성 확정표, '잘 풀리는 결'=강하게 드러난 십성과 지장간 투간(성향·재능으로 발현), '삐걱대는 결'=개고·도충·합충형해파와 치우친 오행, '지금 이 시기'=대운/세운(luckRows)의 순풍·역풍. 한 챕터에서 쓴 근거를 다른 챕터에서 그대로 되풀이하지 않는다.",
            evidenceUseOrder: isSajuCompat
              ? ["사용자 질문", "본인 일간(selfProfile)", "상대 일간(partnerProfile)", "각자의 월지/계절", "각자의 오행 과다/부족", "두 명식의 십성 대조(사람별 확정표 준수)", "두 일간의 상생·상극·동류·보완", "두 사람의 대운·세운", "찻잔 카테고리"]
              : ["사용자 질문", "일간", "월지/계절", "오행 과다/부족", "십성 구조(myeongsikFacts.tenGodFixedTable 준수)", "지장간과 투간/투출(myeongsikFacts)", "천간·지지 관계와 개고·도충(myeongsikFacts)", "대운·세운·월운(myeongsikFacts.luckRows)", "찻잔 카테고리"],
            personalizationRule: "누구에게나 맞는 위로 대신 '왜 이 질문이 이 명식에서 지금 커졌는지'와 '현실에서 어떤 행동을 줄이거나 시작할지'를 함께 쓴다.",
            uncertaintyRule: "sajuFactInput에 없는 항목은 만들지 않는다. 부족한 항목은 단정하지 말고 입력된 정보만으로 볼 수 있는 범위를 밝힌다.",
            topicCoverageRule: "가능한 경우 성향과 마음의 패턴, 일과 재능, 돈과 현실 감각, 연애와 관계, 현재 운의 흐름, 조심할 점, 지금 바로 할 수 있는 행동 조언을 모두 건드린다.",
            closingRule: "closingLine은 찻집의 차와 향 이미지를 담되 과장된 캐릭터 말투 없이 한 문장으로 쓴다.",
            noGenericAdvice: ["노력하면 좋아집니다", "긍정적으로 생각하세요", "대화가 중요합니다", "균형을 잡는 것이 필요합니다"],
            birthTimeUnknownRule: "출생시간이 없거나 birthTimeUnknown이 true이면 세부 시주 해석 제한을 명시하고, 생년월일 중심의 큰 흐름으로 말한다.",
            stateGaugeRule: "emotionAnalysis는 감정 분석이 아니라 선택된 찻잔의 상태 게이지로 쓴다. label은 categoryGaugeLabels 중에서만 사용하고, description에는 일간·오행·십성 중 최소 하나의 근거를 붙인다.",
            categoryGaugeLabels: sajuRule.gauges.map(([label]) => label),
            partnerRule: isSajuCompat
              ? `partnerProfile(상대 ${partnerName})의 일간·오행·십성을 오직 partnerProfile 데이터만으로, 본인과 동등한 분량으로 반드시 해석한다. 상대 십성은 partnerProfile.myeongsikFacts.tenGodFixedTable만 쓰고 본인 확정표를 상대에게 쓰지 않는다. 두 명식을 대조해 궁합과 관계 흐름을 푼다. 상대를 요약만 하거나 본인 사주를 상대 사주로 서술하면 실패다.`
              : "partnerProfile이 없으면 상대 마음, 궁합, 상대 명식을 단정하지 말고 내 사주 기준의 관계 흐름으로 제한한다.",
          }
        : undefined,
      tarotQualityRule: consultationMode === "tarot"
        ? {
            category: tarotRule.category,
            resultKey: tarotRule.resultKey,
            minimumKoreanChars: getTarotMinResultChars(request),
            requiredDeepSections: tarotRule.requiredSections,
            categorySchema: tarotResultSchemaByCategory[tarotRule.id],
            lengthRule: `공백 제외 ${getTarotMinResultChars(request)}자 이상, 전체 4000~5000자 안팎으로 쓴다. 카드 나열이 아니라 하나의 서사로 이어지게 한다.`,
            resultFlow: [
              "카드를 펼치며: 분위기와 전체 그림을 한눈에 담아 짧게 연다. 메이저/마이너 비율, 수트 편중, 코트 카드 등장이 만드는 전체 흐름을 먼저 느끼게 한다.",
              "카드별 리딩(tarotCardReadings): 뽑힌 카드를 한 장도 빠짐없이 개별적으로 푼다. 카드마다 핵심 의미 → 현재 상황에서의 의미 → 질문과의 연결 → 조언 → 주의할 점 순서로 쓴다.",
              "카드 간 상호작용(cardInteractions): 지정된 조합마다 두 카드가 함께 만드는 의미를 푼다.",
              "카드들이 함께 그리는 이야기: 카드 사이의 서사를 엮어 전체 흐름을 종합한다.",
              "마음의 향(heartScent): 위 해석을 모두 확정한 다음, 그 결론에 가장 맞는 향 하나를 고르고 이유를 밝힌다.",
              "지금 손님이 붙잡을 수 있는 것: 실천적 조언. 카드 근거를 유지한 채 지금 할 행동과 피할 행동을 구분한다.",
              "연이의 한마디: 카드의 메시지를 따뜻하게 요약한다.",
            ],
            thinkingOrder: [
              "사용자 질문을 상담 유형으로 분류하고 선택된 찻잔의 분위기를 확인한다.",
              "각 카드를 반드시 포지션의 의미와 결합해 읽는다. 같은 카드도 위치가 다르면 다르게 말한다.",
              "정/역방향을 정확히 반영한다. 역방향을 기계적으로 나쁘게 보지 말고 내면화, 지연, 과잉, 재조정 중 어느 결인지 다층적으로 본다.",
              "메이저/마이너 비율, 수트 편중, 코트 카드, 정/역 비율은 spreadDigest에 계산되어 있다 — 스스로 다시 세지 말고 그 값을 그대로 인용해 전체 흐름의 신호로 읽는다.",
              "카드의 숫자(rank)와 원소(element: 완드=불, 컵=물, 소드=공기, 펜타클=흙)는 spreadCards에 적힌 값을 근거로 상호작용을 읽는다. spreadDigest.elementFlow의 원소 흐름도 함께 본다.",
              "카드들 사이의 이야기를 엮는다. 나열이 아니라 하나의 서사로 — spreadDigest.sequenceRule의 위치 관계와 firstToLast의 변화 방향을 따른다.",
              "확정 예언이 아니라 조건부 흐름으로 말하고, 마지막에는 실제 행동 조언을 준다.",
            ],
            toneRule: "타로는 정해진 미래가 아니라 지금의 에너지임을 자연스럽게 전제한다. 탑, 죽음, 악마 같은 부정적 카드는 상징의 본뜻(변화, 전환, 집착의 직면)으로 풀어 위로한다.",
            fieldStructure: {
              "tarot.reading": "카드 오픈 멘트와 뽑힌 카드 요약. 카드명, 방향, 키워드, 질문 맥락을 4-6문장으로 연결한다. 카드별 전통 의미를 여기서 낱낱이 정의하지 말고(그 자리는 tarotCardReadings다) 펼쳐진 전체 그림을 한눈에 담는다. 권장 분량: 180~280자.",
              tarotCardReadings: "뽑힌 카드 전부를 한 장씩 개별 해석하는 유일한 자리. tarotFactInput.spreadCards와 개수·순서가 정확히 같아야 하고, 한 장이라도 빠지면 실패다. 각 item의 positionId는 입력값을 그대로 복사한다.",
              "tarotCardReadings[].coreMeaning": "이 카드의 핵심 의미. 정방향/역방향을 문장 안에 반드시 드러내고, arcana·suit·element·rank(숫자/코트) 중 최소 2개를 근거로 삼는다. 권장 분량: 130~190자.",
              "tarotCardReadings[].currentSituation": "positionLabel/positionMeaning과 결합한 '지금 상황에서의 의미'. 같은 카드라도 이 자리에 놓였기 때문에 달라지는 결을 말한다. 권장 분량: 130~190자.",
              "tarotCardReadings[].questionLink": "손님의 실제 질문과 이 카드를 잇는 해석. 질문의 핵심 단어를 자연스럽게 되받는다. 권장 분량: 130~190자.",
              "tarotCardReadings[].advice": "이 카드가 건네는 조언. 카드 상징에서 도출된 구체적인 방향으로 쓴다. 권장 분량: 110~160자.",
              "tarotCardReadings[].caution": "이 카드 고유의 주의할 점. 왜 이 카드·이 방향에서 그 위험이 커지는지 근거를 붙인다. 다른 카드에도 통하는 일반론이나 전역 금지 문구를 되풀이하면 실패다. 권장 분량: 110~160자.",
              cardInteractions: "카드 간 상호작용. tarotFactInput.interactionPairs에 주어진 조합을 전부, 같은 pair 문자열 그대로 사용한다. 조합을 새로 만들거나 빠뜨리지 않는다.",
              "cardInteractions[].insight": "두 카드가 함께 만드는 의미. '은둔자 + 별 → 지금은 기다림이 필요하지만 그 끝에는 희망이 있다'처럼 한 카드씩 볼 때는 안 보이던 결을 짚는다. spreadDigest의 원소 흐름·수트 편중을 근거로 쓴다. 권장 분량: 140~210자.",
              heartScent: "오늘의 마음의 향. 위 해석을 모두 확정한 뒤 마지막에 고른다.",
              "heartScent.reason": "① 지금 손님에게 필요한 것 ② 오늘의 카드들이 준 메시지(뽑힌 카드 이름을 최소 하나 명시) ③ 그 향이 왜 이 흐름을 보완하는지 — 이 순서로 4~6문장. 권장 분량: 220~320자.",
              "synthesis.summary": "카드별 리딩을 모두 마친 뒤의 종합 해석. 카드들이 공통적으로 보여주는 흐름을 먼저 묶고, 마지막 문장에서 '지금 가장 중요한 메시지' 하나를 분명히 남긴다. 카드별 의미를 다시 정의하지 말고(그 자리는 tarotCardReadings다) 겹치는 결과 어긋나는 결을 짚는다. 권장 분량: 150~250자.",
              "synthesis.sajuTarotBridge": "이름과 달라도 타로-only 전체 흐름 리딩으로 쓴다. 사주 언급 없이, 이 카드 배치가 앞으로 어떤 변화로 이어지는지를 정리한다. 권장 분량: 150~250자.",
              "yeoniReading.intro": "손님을 맞이하는 환영 인사(어서 오세요 류)로 시작하는 찻집 감성의 카드 오픈 멘트와 질문자의 마음의 향. 권장 분량: 120~200자.",
              "yeoniReading.main": "카드들이 함께 만드는 이야기와 이번 질문에서의 의미. 카드별 전통 의미를 여기서 다시 정의하지 않는다(이미 tarot.reading과 카드별 리딩에 있다). 새로 더할 것은 spreadDigest(비율·수트 편중·원소 흐름·firstToLast·sequenceRule)가 그리는 배치 서사와, 그 서사가 이번 질문에 주는 답의 결이다. 권장 분량: 280~380자.",
              "yeoniReading.advice": "연이의 방향 제시. 지금 움직일지 기다릴지의 판단 기준과 그 이유(카드·질문 근거)를 다정하게 건네되, 구체적인 할 행동/금지 행동 목록은 나열하지 않는다(그 목록은 actionPrescription 한 곳에만 둔다). 권장 분량: 160~240자.",
              "yeoniReading.caution": "감정이 만들 수 있는 위험 신호를, 이 카드·이 질문에 고유하게 짚는다(희망 고문, 단정, 충동 — 왜 이 카드에서 그 위험이 커지는지 근거와 함께). actionPrescription이나 choiceSimulation과 같은 금지 문구를 반복하면 실패다. 권장 분량: 130~200자.",
              choiceSimulation: "카테고리별 행동 플랜의 유일한 단계 목록. 4개 item으로 각 단계의 행동, 기대되는 변화, 조심할 점을 카드 근거와 함께 쓴다. 각 item의 조심할 점은 그 단계 고유의 리스크만 쓰고 전역 금지 문구를 되풀이하지 않는다. 각 item result 권장 분량: 120~180자.",
              actionPrescription: "오늘 바로 할 수 있는 행동과 하지 말아야 할 행동을 4-6문장으로 정리한다. 결과 전체에서 구체 행동·금지 행동 목록을 담는 유일한 자리다. 권장 분량: 260~360자.",
              closingLine: "연이의 마지막 메시지. 찻집의 차와 카드 이미지를 담아 한두 문장으로 마무리한다. 위 조언을 요약 반복하지 않는다. 권장 분량: 80~140자.",
            },
            depthLenses: [
              "감정의 흐름: 질문자가 지금 어디에서 가장 크게 흔들리는지, 카드가 비추는 마음의 온도. (주로 emotionAnalysis·yeoniReading.intro가 담당)",
              "카드 배치 서사: spreadDigest의 비율·수트 편중·원소 흐름·firstToLast·sequenceRule이 만드는 전체 그림. (주로 yeoniReading.main·synthesis가 담당)",
              "현실 조건과 근거: 상황을 실제로 움직이거나 막는 조건, 카드 상징이 현실 언어로 무엇을 가리키는지. (주로 tarot.reading·choiceSimulation이 담당)",
              "타이밍과 순서: 지금 할 것과 기다릴 것, 단계의 순서. (주로 choiceSimulation·actionPrescription이 담당)",
              "자기 돌봄과 경계: 질문자가 덜 다치기 위해 지켜야 할 선. (주로 yeoniReading.caution·actionPrescription이 담당)",
            ],
            depthStrategyRule: "요구 분량은 같은 말을 늘려서가 아니라, 위 depthLenses의 서로 다른 각도를 각기 다른 필드에서 새 근거로 풀어 채운다. 한 필드에서 이미 한 말을 다른 필드에서 되풀이하지 말고, 각 필드는 자기 렌즈의 깊이를 더하는 방식으로 분량 목표를 채운다.",
            categorySectionRule: "requiredDeepSections의 주제는 각각 가장 알맞은 필드 한 곳에서 깊게 다뤄 결과 전체에서 빠짐없이 등장해야 한다. 섹션 제목을 그대로 쓰지 않아도 되지만, 주제가 누락되어도 실패이고 같은 주제를 같은 문장으로 여러 필드에 반복해도 실패다.",
            cardByCardRule: "뽑힌 카드는 단 한 장도 예외 없이 tarotCardReadings에서 개별적으로 해석한다. 카드가 3장이면 3개 item, 5장이면 5개 item이며 개수와 순서가 tarotFactInput.spreadCards와 정확히 같아야 한다. '전체적으로 좋은 흐름입니다' 같은 뭉뚱그린 문장으로 특정 카드의 설명을 대신하면 실패다. 각 카드는 positionLabel, positionMeaning, cardName, orientationLabel, traditionalMeaning에 더해 arcana, suit, element, rank(코트 여부)를 반영하고, spreadDigest.sequenceRule과 firstToLast의 서사에 연결한다. 각 카드의 해석 안에 그 카드의 이름(nameKo)을 반드시 한 번 이상 쓴다.",
            cardInteractionRule: "tarotFactInput.interactionPairs에 지정된 조합을 전부 cardInteractions로 푼다. pair 문자열은 주어진 값을 그대로 복사하고, 목록에 없는 조합을 만들거나 일부를 생략하면 실패다. 카드를 하나씩 볼 때는 보이지 않는, 두 장이 겹칠 때만 생기는 의미를 말한다(예: 통제력은 강하지만 집착이 지나칠 수 있다).",
            heartScentRule: "heartScent는 반드시 모든 해석을 확정한 뒤 마지막에 고른다. name은 tarotFactInput.heartScentCatalog에 실제로 적힌 향 이름 중 하나여야 하고, 카탈로그 밖의 향 이름을 지어내면 실패다. category는 그 향이 속한 카테고리를 그대로 쓴다. reason에는 오늘 뽑힌 카드 이름을 최소 하나 명시해, 향이 이번 해석의 결론과 이어져 있음을 손님이 알 수 있게 한다.",
            orientationRule: "정방향/역방향은 반드시 문장 안에 드러낸다. 역방향을 단순히 나쁘다고 말하지 말고 막힘, 지연, 과잉, 내면화, 재조정 중 어떤 흐름인지 질문 맥락으로 풀어준다.",
            questionReflectionRule: "사용자의 실제 질문 문장을 상담 본문 안에서 자연스럽게 되받아라. 전체 문장을 기계적으로 복사하지 말고, 핵심 단어와 고민의 방향이 tarot.reading, yeoniReading, actionPrescription 중 최소 한 곳에 살아 있어야 한다.",
            emotionRule: "emotionAnalysis 수치는 상대방 마음이 아니라 질문자의 마음의 향이다. 각 description에 카드와 질문 맥락에서 왜 그 수치가 나왔는지 짧은 근거를 붙인다.",
            categoryAdviceRule: {
              love: "연애운은 상대 마음을 확정하지 말고 감정 흐름과 거리감을 읽는다. 해야 할 행동과 하지 말아야 할 행동을 분리한다.",
              reunion: "재회운은 가능성, 장애물, 필요한 조건을 분리한다. 희망 고문 금지, 연락 타이밍은 조건부로만 말한다.",
              money: "금전운은 돈이 들어온다고 단정하지 않는다. 소비 습관, 기회, 리스크, 판단 기준을 설명한다.",
              career: "직업운은 이직, 승진, 협업, 평가, 준비의 흐름을 카드와 연결하고 구체적 조언을 준다.",
              today: "오늘의 운세는 분위기, 조심할 점, 행운 행동을 짧지만 밀도 있게 담는다.",
            },
            categoryGaugeLabels: tarotRule.gauges,
            noGenericAdvice: ["긍정적으로 생각", "대화가 중요", "마음을 차분히", "작은 행동 하나", "기다려 보세요", "당신의 선택입니다"],
            requiredCategoryTerms: tarotRule.requiredTerms,
          }
        : undefined,
      sukuyoQualityRule: consultationMode === "sukuyo"
        ? {
            lengthRule: "전체 10000~15000자 분량으로, 챕터마다 호흡이 있는 문단으로 깊게 쓴다. 지식을 뽐내지 않고 손님 눈높이로 푼다.",
            resultFlow: [
              "두 별의 타고난 결: 관계를 논하기 전에, 사용자의 본명숙과 상대의 본명숙이 각각 어떤 타고난 성향·기질인지 성수(星宿)의 상징과 함께 먼저 짚어준다. 사용자와 상대에게 비슷한 분량의 문단을 각각 배분해, 어느 한쪽만 자세히 풀고 다른 쪽을 한두 줄로 요약하지 않는다. 각 숙의 성격이 실제 성향으로 어떻게 드러나는지 풀어, 신뢰가 서도록 성향부터 전반적으로 소개한다.",
              "두 사람의 인연 관계: 앞서 읽은 두 사람의 타고난 결을 바탕으로, 전달받은 숙 거리와 관계 유형 판정을 근거로 이 관계가 어떤 결인지 푼다. '사용자의 ○숙에서 상대의 △숙은 ○ 자리에 있어요, 그래서...'처럼 근거를 밝힌다.",
              "방향의 정직함: typeAToB와 typeBToA가 다르면 한쪽이 주는 관계인지, 양방향인지 정직하게 설명한다.",
              "서로에게 주는 것: 각 숙의 고유 성격을 근거로 관계의 강점을 푼다.",
              "마음 쓸 지점: 주의점을 위협이 아니라 '알아두면 좋은 것'의 온도로 짚는다.",
              "관계 유형별 조언: 연애, 재회, 결혼/부부, 친구/동료, 사업/직장 중 입력된 카테고리에 맞게 다르게 쓴다.",
              "오늘의 달 아래에서: 달의 운행 이미지를 곁들인 서정적 마무리와 실천 제안.",
              "연이의 한마디: 따뜻하지만 단정하지 않게 마무리한다.",
            ],
            thinkingOrder: [
              "사용자 질문과 relationshipType을 먼저 확인한다.",
              "사용자 본명숙과 상대 본명숙을 확인하고 이름을 바꾸지 않는다.",
              "전달받은 관계 유형(영친/안괴/업태/성위/우쇠/명 등)과 relationGuide를 중심 해석 축으로 삼되, 새 관계명이나 거리값을 계산해 만들지 않는다.",
              "typeAToB와 typeBToA는 정본 링 매핑이 정한 두 사람의 '자리'다. 각 자리의 의미(userToPartnerMeaning/partnerToUserMeaning)를 서로 다르게 풀어 양방향 비대칭을 놓치지 않는다.",
              "distanceLabel, distanceTier, shortestDistance에 더해 forwardDistance/reverseDistance의 실제 칸수 차이와 directionalDistanceGuide로 가까워지는 속도와 회복 간격을 해석한다.",
              "각 숙의 고유 성격과 오행 조화를 두 사람의 기질 조화 근거로 쓴다.",
              "scores와 elementHarmony는 좋고 나쁨이 아니라 조율 포인트로 쓴다.",
              "달이 각 숙에 머무는 결을 서정적으로 곁들이되, 계산값을 새로 만들지 않는다.",
              "장점, 충돌 지점, 지금 할 행동을 모두 남긴다.",
            ],
            qualityChecklist: [
              "관계 판정과 방향 설명이 전달받은 입력값과 정확히 일치하는가.",
              "각 숙의 고유 성격을 실제로 반영했는가.",
              "27숙 지식을 뽐내지 않고 손님 눈높이로 풀었는가.",
            ],
            fieldStructure: {
              "sukuyoCompatibility.title": "두 사람의 본명숙과 관계 유형이 드러나는 상담 제목.",
              "sukuyoCompatibility.summary": "본명숙, 관계 유형, 거리, 방향별 관계, 질문 카테고리를 3-5문장으로 연결한 핵심 요약. 권장 분량: 200~320자.",
              "sukuyoCompatibility.strengths": "관계의 장점 3개. 각 문장은 숙, 관계 유형, 거리, 오행 조화, 방향별 관계 중 하나 이상을 근거로 삼는다. 각 항목 권장 분량: 90~140자.",
              "sukuyoCompatibility.cautions": "충돌 포인트 3개. 불안 조장 없이 반복될 수 있는 말투, 거리감, 역할 차이를 짚는다. 각 항목 권장 분량: 90~140자.",
              "synthesis.summary": "전체 관계 흐름. 좋다/나쁘다보다 끌림과 조율 조건을 묶는다. 권장 분량: 180~280자.",
              "synthesis.sajuTarotBridge": "이름과 달라도 숙요점-only 전체 리딩으로 쓴다. 사주와 타로 언급 없이 27숙 인연의 흐름을 정리한다. 권장 분량: 180~280자.",
              "yeoniReading.intro": "손님을 맞이하는 환영 인사(어서 오세요 류)로 시작하는, 찻잔 위 달빛처럼 짧은 첫 인사. 권장 분량: 120~200자.",
              "yeoniReading.main": "두 사람의 숙, 관계 유형, 거리감, 방향별 자리(typeAToB/typeBToA)가 만드는 끌림과 첫인상. summary와 같은 문장을 반복하지 않는다. 권장 분량: 260~360자.",
              "yeoniReading.advice": "관계 카테고리에 맞는 방향 제시와 그 이유. 어느 쪽으로 마음을 옮길지의 기준을 건네되, 구체적인 할 행동/금지 행동 목록은 나열하지 않는다(그 목록은 actionPrescription 한 곳에만 둔다). 권장 분량: 160~240자.",
              "yeoniReading.caution": "이 관계 유형·거리에 고유한 감정 위험 신호를 근거와 함께 짚는다. 단정하지 않고 조율할 지점으로 말하며, actionPrescription과 같은 금지 문구를 반복하지 않는다. 권장 분량: 130~200자.",
              choiceSimulation: "관계 운영 선택지 3-4개의 유일한 단계 목록. 연락, 거리두기, 기준 합의, 역할 조율 중 카테고리에 맞게 구성하고, 각 선택지의 조심할 점은 그 선택지 고유의 리스크만 쓴다. 각 item result 권장 분량: 120~180자.",
              actionPrescription: "오늘 바로 할 수 있는 행동과 피해야 할 말을 4-6문장으로 쓴다. 결과 전체에서 구체 행동·금지 목록을 담는 유일한 자리다. 권장 분량: 260~360자.",
              closingLine: "달빛, 찻잔, 붉은 실 중 하나의 이미지로 마지막 한 줄을 남긴다. 위 조언을 요약 반복하지 않는다. 권장 분량: 80~140자.",
            },
            depthLenses: [
              "두 별의 타고난 성향: 각 본명숙의 고유 기질(성수 상징)이 실제 성향으로 어떻게 드러나는지. (주로 summary·yeoniReading.main이 담당)",
              "방향의 비대칭: 내가 서는 자리(typeAToB)와 상대가 서는 자리(typeBToA), directionalDistanceGuide의 다가감 속도 vs 회복 간격. (주로 yeoniReading.main·synthesis가 담당)",
              "오행과 수호신 조화: elementHarmony(상생/상극/동류/보완)와 음양·수호신이 만드는 조율의 결. (주로 strengths·synthesis가 담당)",
              "거리와 타이밍: distanceLabel·계절 흐름이 가리키는 가까워지는 속도와 확인할 시기. (주로 summary·choiceSimulation이 담당)",
              "조율과 경계: 반복될 수 있는 충돌과 지켜야 할 선. (주로 cautions·yeoniReading.caution·actionPrescription이 담당)",
            ],
            depthStrategyRule: "요구 분량은 같은 말을 늘려서가 아니라, 위 depthLenses의 서로 다른 각도를 각기 다른 필드에서 새 근거로 풀어 채운다. 특히 방향 비대칭(directionalDistanceGuide)과 오행 조화(elementHarmony)는 아직 덜 쓰인 근거이니 이를 활용해 깊이를 더한다.",
            relationTypeRule: {
              영친: "친밀감, 익숙함, 보호감, 정서적 연결과 소홀해지는 문제를 함께 쓴다.",
              안괴: "강한 끌림, 불안정성, 상처, 집착, 거리 조절을 말하되 공포스럽게 단정하지 않는다.",
              업태: "인연의 무게, 반복되는 끌림, 배움, 감정적 숙제를 현실 패턴으로 풀어준다.",
              성위: "성장, 자극, 방향성, 역할 차이를 중심으로 보되 한쪽 희생을 경계한다.",
              우쇠: "힘의 균형, 주도권, 보호와 의존, 현실적 거리감을 중심으로 말한다.",
              명: "닮은 리듬과 익숙함을 보되 방심과 변화 신호 누락을 함께 짚는다.",
            },
            distanceRule: "same/near/middle/far와 distanceLabel을 반드시 문장에 반영한다. 가까운 거리는 빠른 끌림과 예민함, 중간 거리는 조율과 확인, 먼 거리는 시간과 약속의 간격으로 풀어준다. relation.forwardDistance와 relation.reverseDistance가 다르면 relation.directionalDistanceGuide를 근거로 '다가가는 속도'와 '회복의 간격'의 비대칭을 실제 칸수로 구분해 말한다 — 두 방향을 하나의 거리처럼 뭉뚱그리면 실패다.",
            categoryAdviceRule: sukuyoFactInput?.categoryAdviceRule,
            balanceRule: "사용자와 상대 두 사람의 본명숙 해석은 반드시 동등한 비중·분량으로 쓴다. 상대의 본명숙(sukuyoFactInput.partner.sukuyoName) 성향·기질을 사용자와 같은 깊이로 서술하고, 상대를 요약만 하거나 사용자 위주로 흐르는 것은 실패다. summary·yeoniReading.main·strengths 어디에서든 상대의 본명숙이 실제 성향으로 해석되어야 한다.",
            uncertaintyRule: "sukuyoFactInput에 없는 숙, 관계 유형, 거리, 방향 의미는 만들지 않는다. 불명확한 항목은 입력값 기준으로만 조심스럽게 말한다.",
            noGenericAdvice: ["궁합이 좋습니다", "궁합이 나쁩니다", "천생연분입니다", "최악입니다", "무조건 헤어져야 합니다", "상대도 같은 마음입니다"],
          }
        : undefined,
      preserveExactly: {
        teaCup: fallback.teaCup,
        sajuAvailability: fallback.saju.available,
        tarotSpread: consultationMode === "tarot" ? fallback.tarotSpread : undefined,
        tarotSpreadCards: consultationMode === "tarot" ? fallback.tarotSpreadCards : undefined,
        tarot: consultationMode === "tarot"
          ? {
              cardId: fallback.tarot.cardId,
              number: fallback.tarot.number,
              nameKo: fallback.tarot.nameKo,
              nameEn: fallback.tarot.nameEn,
              orientation: fallback.tarot.orientation,
              keywords: fallback.tarot.keywords,
              meaning: fallback.tarot.meaning,
            }
          : undefined,
        sukuyoCompatibility: consultationMode === "sukuyo" ? fallback.sukuyoCompatibility : undefined,
      },
      request,
      outputSchema: {
        consultationMode: "preserve",
        sessionTitle: "string",
        questionSummary: "string",
        teaCup: "preserve",
        saju: isSajuFamilyMode(consultationMode)
          ? `available/title/summary/keyPoints preserve/birthSummary preserve/dayMaster preserve/pillars preserve/fiveElements preserve/primaryTenGod preserve/secondaryTenGods preserve/deepSections required with exact category titles for ${sajuRule.resultKey}/cautionReading preserve/actionPrescription preserve/oneLineAdvice/tenGodSnapshot preserve`
          : "omit — 초안 값이 그대로 유지된다",
        tarot: consultationMode === "tarot" ? "preserve card fields, improve only reading" : "omit — 초안 값이 그대로 유지된다",
        tarotSpread: "preserve",
        tarotSpreadCards: "preserve — 카드 정체성은 서버가 고정한다. 카드별 해석은 tarotCardReadings에 쓴다.",
        tarotCardReadings: consultationMode === "tarot"
          ? `required — tarotFactInput.spreadCards와 정확히 같은 개수(${(fallback.tarotSpreadCards || []).length}개)와 순서. 각 item: { positionId(입력값 그대로 복사), coreMeaning, currentSituation, questionLink, advice, caution }`
          : "omit",
        cardInteractions: consultationMode === "tarot"
          ? `required — tarotFactInput.interactionPairs와 같은 개수(${buildTarotInteractionPairIndexes((fallback.tarotSpreadCards || []).length).length}개)와 순서. 각 item: { pair(주어진 문자열 그대로), insight }`
          : "omit",
        heartScent: consultationMode === "tarot"
          ? "required — { name(heartScentCatalog에 있는 향 이름), category(그 향의 카테고리), reason }"
          : "omit",
        sukuyoCompatibility: consultationMode === "sukuyo"
          ? "preserve user/partner/calculationBasis/relationDetail/relation/distance/scores/elementHarmony/index fields, improve only title/summary/strengths/cautions/adviceKeywords"
          : "omit — 초안 값이 그대로 유지된다",
        emotionAnalysis: "4-5 items with label/value/description/tone",
        yeoniReading: "intro/main/advice/caution",
        synthesis: "title/summary/sajuTarotBridge",
        choiceSimulation: consultationMode === "tarot" ? `4 items for ${tarotRule.requiredSections.find((section) => /플랜/.test(section)) || "category-specific action plan"}` : isSajuFamilyMode(consultationMode) ? "3-4 category-specific practical choices; include the plan window named in saju.deepSections" : "3-4 sukuyo relationship operation choices",
        actionPrescription: "string",
        luckyKeywords: "string[]",
        closingLine: "string",
      },
    }, group),
    null,
    2,
  );
}

/**
 * 그룹 하나를 생성한다. **절대 throw 하지 않는다** — 한 그룹의 실패가 나머지를 죽이면
 * 결제한 상담이 통째로 사라진다(love-secret-ai.js 와 같은 계약).
 */
async function generateFortuneTeaGroup(env, { request, fallback, group, consultationMode, timeoutMs, qualityHint = "", attempt = 0 }) {
  const fail = (reason, provider = "", model = "") => ({ key: group.key, ok: false, parsed: null, chars: 0, reason, provider, model });
  // 🔴 clampSyncLlmTimeoutMs 는 0/음수를 받으면 상한 85s 로 되돌아간다 — 그 앞에서 막아야 한다.
  if (!(timeoutMs > 0)) return fail("BUDGET_EXHAUSTED");

  try {
    const call = callGeminiText(env, buildUserPrompt(request, fallback, attempt, qualityHint, group), {
      systemPrompt: buildSystemPrompt(consultationMode),
      taskType: "fortune",
      temperature: attempt > 0 ? 0.54 : 0.62,
      maxOutputTokens: FORTUNE_TEA_GROUP_MAX_OUTPUT_TOKENS,
      timeoutMs: clampSyncLlmTimeoutMs(timeoutMs),
      responseMimeType: "application/json",
      // 그룹 최소 분량 × 0.4. 통짜 시절의 600 은 그룹 단위에서 아무것도 막지 못한다.
      fallbackMinChars: Math.round(group.minChars * 0.4),
      // 이 라우트는 캐시도 in-flight dedup 도 없어 같은 입력의 재요청이 전 그룹을 다시 생성했다.
      // 웨이브 2 의 재생성은 attempt 와 qualityHint 가 프롬프트·temperature 를 함께 바꾸므로
      // 실패한 시도의 응답이 같은 키를 차지하지 않는다.
      // minChars: 그룹 목표에 못 미친 응답은 저장하지 않는다 — 저장하면 웨이브 2 가 판정한
      // 미달 결과가 30일간 같은 키에서 재현된다.
      cache: {
        store: createLlmCacheStore(env),
        deterministic: true,
        ttlSeconds: 30 * 24 * 60 * 60,
        keyExtra: `tea-house-${consultationMode}-${group.key}-v1`,
        minChars: group.minChars,
      },
    });
    // lib/llm-client.ts 는 Gemini 타임아웃 뒤 Workers AI 폴백을 타임아웃 없이 돌린다.
    // 그 경로가 예산을 넘겨 엣지 컷을 유발하지 않도록 하드 레이스를 건다.
    const ai = await Promise.race([
      call,
      new Promise((resolve) => setTimeout(() => resolve({ ok: false, error: "group_hard_deadline" }), timeoutMs + 4000)),
    ]);

    const provider = cleanText(ai?.provider, 60);
    const model = cleanText(ai?.model, 80);
    if (!ai?.ok) return fail(cleanText(ai?.error || ai?.message || "LLM_FAILED", 60), provider, model);

    const picked = pickFortuneTeaGroupFields(extractJson(ai.text), group);
    if (!picked || !Object.keys(picked).length) return fail("EMPTY_GROUP_FIELDS", provider, model);
    return { key: group.key, ok: true, parsed: picked, chars: countFortuneTeaGroupChars(picked), reason: "", provider, model };
  } catch (error) {
    return fail(cleanText(error instanceof Error ? error.message : error, 60));
  }
}

async function generateConsultResult(request, fallback, env) {
  if (!hasGeminiKey(env)) {
    if (!isLocalLikeEnv(env)) {
      const error = new Error("fortune tea house llm unavailable");
      error.status = 503;
      throw error;
    }
    return {
      result: fallback,
      generationMeta: {
        mode: "local_fallback",
        reason: "missing_gemini_key",
        generatedAt: new Date().toISOString(),
      },
    };
  }

  const consultationMode = normalizeConsultationMode(request.consultationMode);
  const groups = resolveFortuneTeaGroups(request, fallback, consultationMode);
  // 전 그룹이 한 요청 안에서 동시에 도므로 예산은 그룹별이 아니라 요청 전체에 걸린다.
  const deadlineAt = Date.now() + FORTUNE_TEA_LLM_DEADLINE_MS;
  const budgetedTimeout = (cap) => {
    const remaining = deadlineAt - Date.now();
    if (remaining < FORTUNE_TEA_MIN_REMAINING_MS) return 0;
    return Math.min(cap, remaining);
  };

  // 웨이브 1 — 전 그룹 동시 생성.
  const results = await Promise.all(groups.map((group) => generateFortuneTeaGroup(env, {
    request,
    fallback,
    group,
    consultationMode,
    timeoutMs: budgetedTimeout(FORTUNE_TEA_GROUP_TIMEOUT_MS),
  })));

  // 웨이브 2 — 실패했거나 제 몫을 못 채운 그룹만 다시 쓴다(전체 재생성 금지).
  const isShort = (result, group) => !result.ok || result.chars < Math.round(group.minChars * 0.75);
  const retryIndexes = results.map((result, index) => (isShort(result, groups[index]) ? index : -1)).filter((index) => index >= 0);
  if (retryIndexes.length && budgetedTimeout(FORTUNE_TEA_REPAIR_TIMEOUT_MS) > 0) {
    const repaired = await Promise.all(retryIndexes.map((index) => generateFortuneTeaGroup(env, {
      request,
      fallback,
      group: groups[index],
      consultationMode,
      timeoutMs: budgetedTimeout(FORTUNE_TEA_REPAIR_TIMEOUT_MS),
      attempt: 1,
      qualityHint: results[index].ok
        ? `이전 응답이 담당 분량 ${groups[index].minChars}자에 못 미쳤다`
        : results[index].reason,
    })));
    repaired.forEach((result, order) => {
      const index = retryIndexes[order];
      // 재생성이 더 짧으면 버린다 — 첫 응답이 유일한 렌더 후보일 수 있다.
      if (result.ok && result.chars >= Number(results[index].chars || 0)) results[index] = result;
    });
  }

  let lastCandidate = null;
  let lastError = null;
  let roundResults = results;

  for (let round = 0; round < 2; round += 1) {
    const produced = roundResults.filter((result) => result.ok && result.parsed);
    if (!produced.length) {
      lastError = new Error(roundResults.map((result) => `${result.key}:${result.reason}`).join(", ") || "gemini_failed");
      break;
    }

    let merged = fallback;
    for (const result of produced) merged = mergeLlmResult(merged, result.parsed);
    // 품질 게이트 실패에도 렌더 가능한 최선 후보를 보존한다 (결제 후 결과 유실 방지).
    lastCandidate = merged;
    try {
      assertConsultQuality(merged, fallback);
      return {
        result: merged,
        generationMeta: {
          mode: "gemini",
          provider: produced[0].provider || "gemini",
          model: produced[0].model,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      lastError = error;
    }

    // 반복 장문만 다시 쓴다 — 통짜 시절의 전면 재작성과 같은 처방을 그룹 단위로 유지한다.
    // 그 외 소프트 미스는 다음 시도도 같은 결정론적 이유로 실패하므로 즉시 degrade 로 배출한다.
    const message = lastError instanceof Error ? lastError.message : String(lastError || "");
    if (round > 0 || !/repeated/i.test(message) || !(budgetedTimeout(FORTUNE_TEA_REPAIR_TIMEOUT_MS) > 0)) break;
    const previous = roundResults;
    roundResults = await Promise.all(groups.map((group, index) => generateFortuneTeaGroup(env, {
      request,
      fallback,
      group,
      consultationMode,
      timeoutMs: budgetedTimeout(FORTUNE_TEA_REPAIR_TIMEOUT_MS),
      attempt: 1,
      qualityHint: message,
    }).then((result) => (result.ok ? result : previous[index]))));
  }

  console.warn("[fortune-tea-house/consult] LLM fallback used", lastError);
  // 경량 보장 계약: 결제가 확인된 상담은 품질 게이트를 못 넘겨도 결과를 버리지 않는다.
  // LLM 병합 후보(있으면) 또는 결정론 fallback 중 렌더 가능한 텍스트가 있으면 degrade로 전달한다.
  const degradeCandidate = lastCandidate || fallback;
  if (hasRenderableLlmText(degradeCandidate)) {
    return {
      result: degradeCandidate,
      generationMeta: {
        mode: lastCandidate ? "gemini_degraded" : "local_fallback",
        reason: lastError instanceof Error ? lastError.message : "quality_gate_degraded",
        degraded: true,
        generatedAt: new Date().toISOString(),
      },
    };
  }
  // 후보조차 실질 텍스트가 없을 때만(사실상 드묾) 재시도 신호 + 결제 권한 보존(환불).
  const error = new Error("연이가 상담문을 끝까지 다듬지 못했어요. 이용권이나 결제 권한은 보존되니 잠시 후 다시 열어 주세요.");
  error.status = 503;
  error.code = "FORTUNE_TEA_HOUSE_LLM_RETRYABLE";
  throw error;
}

function buildHoneyResultId(body, consultRequest) {
  const explicit = cleanText(body?.resultId || body?.jobId || body?.attemptId || consultRequest.resultId || consultRequest.jobId || consultRequest.attemptId, 180);
  if (explicit) return `fortune-tea-house:${explicit}`;
  const digest = createHash("sha256")
    .update(JSON.stringify({
      consultationMode: consultRequest.consultationMode,
      selectedTeaCupId: consultRequest.selectedTeaCupId,
      selectedTeaCupTopic: consultRequest.selectedTeaCupTopic,
      question: consultRequest.question,
      birthDate: consultRequest.birthDate,
      birthTime: consultRequest.birthTime,
      sukuyo: consultRequest.sukuyo,
    }))
    .digest("hex")
    .slice(0, 24);
  return `fortune-tea-house:${digest}`;
}

function honeyCollections() {
  const db = mongoose.connection.db;
  return {
    wallets: db.collection("fortune_tea_house_honey_wallets"),
    ledgers: db.collection("fortune_tea_house_honey_ledgers"),
    results: db.collection("fortune_tea_house_results"),
  };
}

function buildFortuneTeaResultStorageId(userId, resultId) {
  return `fortune-tea-house-result:${createHash("sha256").update(`${userId}:${resultId}`).digest("hex").slice(0, 48)}`;
}

// 잠금 유효 창이 생성 시간보다 짧으면 재시도 클라이언트가 진행 중 문서를 "만료"로 오인해
// 두 번째 생성을 띄운다(중복 LLM 비용 + 저장 경쟁). 반대로 너무 길면 죽은 요청 뒤의 정당한
// 재시도가 그만큼 막힌다. 섹션 병렬 전환(2026-08-15) 이후 생성은 FORTUNE_TEA_LLM_DEADLINE_MS
// 안에서 끝나고 엣지도 그 전에 끊으므로, 엣지 한계 + 마진으로 창을 잡는다(구 390s는 통짜
// 재시도 3회 × 모드별 120s 를 전제한 값이라 이제 4배 과하다).
const FORTUNE_TEA_GENERATION_LOCK_TTL_MS = EDGE_RESPONSE_DEADLINE_MS + 50000;

function isFreshFortuneTeaGeneration(doc, now = Date.now()) {
  if (!doc || doc.status !== "generating") return false;
  const updatedAt = new Date(doc.updatedAt || doc.createdAt || 0).getTime();
  return Number.isFinite(updatedAt) && now - updatedAt < FORTUNE_TEA_GENERATION_LOCK_TTL_MS;
}

function publicFortuneTeaStoredResult(doc, fallback = {}) {
  const stored = objectValue(doc?.result);
  if (!Object.keys(stored).length) return null;
  const resultId = cleanText(stored.resultId || doc?.resultId || fallback.resultId, 180);
  return {
    ...stored,
    resultId,
    serviceScope: cleanText(stored.serviceScope || doc?.serviceScope || fallback.serviceScope, 80) || FORTUNE_TEA_HOUSE_SCOPE,
    consultationMode: normalizeConsultationMode(stored.consultationMode || doc?.consultationMode || fallback.consultationMode),
    featureKey: cleanText(stored.featureKey || doc?.featureKey || fallback.featureKey, 160),
    pricing: stored.pricing || doc?.pricing || fallback.pricing || undefined,
  };
}

async function beginFortuneTeaHouseGeneration({ auth, resultId, consultRequest, featureKey, pricing, requestId }) {
  if (!auth?.userId) return { ok: true };
  const userId = String(auth.userId);
  const now = new Date();
  const { results } = honeyCollections();
  const existing = await results.findOne({ userId, resultId });
  if (existing?.status === "completed") {
    const result = publicFortuneTeaStoredResult(existing, {
      resultId,
      consultationMode: consultRequest.consultationMode,
      featureKey,
      pricing,
    });
    if (result) return { ok: false, completed: true, result, doc: existing };
  }
  if (isFreshFortuneTeaGeneration(existing)) {
    return { ok: false, inProgress: true, doc: existing };
  }

  try {
    await results.updateOne(
      { userId, resultId },
      {
        $set: {
          userId,
          resultId,
          serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
          consultationMode: normalizeConsultationMode(consultRequest.consultationMode),
          featureKey,
          pricing: pricing || {},
          profileId: cleanText(consultRequest.profileId, 120),
          status: "generating",
          generationLock: {
            requestId: cleanText(requestId || resultId, 180),
            startedAt: now,
          },
          generationError: null,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: buildFortuneTeaResultStorageId(userId, resultId),
          createdAt: now,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (Number(error?.code) === 11000) return { ok: false, inProgress: true };
    throw error;
  }
  return { ok: true };
}

async function markFortuneTeaHouseGenerationFailed({ auth, resultId, code, message }) {
  if (!auth?.userId) return;
  const userId = String(auth.userId);
  const now = new Date();
  const { results } = honeyCollections();
  await results.updateOne(
    { userId, resultId },
    {
      $set: {
        status: "generation_failed",
        generationError: {
          code: cleanText(code || "FORTUNE_TEA_HOUSE_GENERATION_FAILED", 80),
          message: cleanText(message || "generation failed", 500),
          at: now.toISOString(),
          retryable: true,
        },
        updatedAt: now,
      },
      $unset: { generationLock: "" },
    },
  ).catch((error) => {
    console.warn("[fortune-tea-house/consult] generation failure status update failed", error);
  });
}

function dateIso(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function unwrapUpdatedDoc(result) {
  if (!result) return null;
  if (Object.prototype.hasOwnProperty.call(result, "value")) return result.value || null;
  return result;
}

function honeyStatePayload(doc, extra = {}) {
  const balance = Math.max(0, Math.floor(Number(doc?.balance ?? doc?.currentHoneyDrops ?? 0)));
  const totalEarned = Math.max(0, Math.floor(Number(doc?.totalEarned ?? doc?.totalHoneyDrops ?? 0)));
  const totalSpent = Math.max(0, Math.floor(Number(doc?.totalSpent ?? 0)));
  return {
    serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
    balance,
    fortuneTeaHouseHoneyDrops: balance,
    currentHoneyDrops: balance,
    totalHoneyDrops: totalEarned,
    totalEarned,
    totalSpent,
    lastEarnedAt: dateIso(doc?.lastEarnedAt),
    tarotAlbumUnlocked: Boolean(doc?.tarotAlbumUnlocked),
    tarotAlbumUnlockedAt: dateIso(doc?.tarotAlbumUnlockedAt),
    unlocked: balance >= HONEY_LETTER_COST,
    authenticated: true,
    ...extra,
  };
}

async function readHoneyDropsState(request, env) {
  const auth = await getCurrentUser(request, env);
  if (!auth?.userId) {
    return {
      serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
      balance: 0,
      fortuneTeaHouseHoneyDrops: 0,
      currentHoneyDrops: 0,
      totalHoneyDrops: 0,
      totalEarned: 0,
      totalSpent: 0,
      tarotAlbumUnlocked: false,
      unlocked: false,
      authenticated: false,
    };
  }

  try {
    await connectDb(env);
    // 일시적 풀 초기화에도 꿀방울 잔액을 정확히 반환하도록 조회를 재시도로 감싼다(access.js와 동일 패턴).
    const doc = await withMongoRetry(env, async () => {
      const { wallets } = honeyCollections();
      return wallets.findOne({ userId: String(auth.userId), serviceScope: FORTUNE_TEA_HOUSE_SCOPE });
    });
    return honeyStatePayload(doc, { authenticated: true });
  } catch (error) {
    console.warn("[fortune-tea-house/honey-drops] disabled", error);
    return {
      serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
      balance: 0,
      fortuneTeaHouseHoneyDrops: 0,
      currentHoneyDrops: 0,
      totalHoneyDrops: 0,
      totalEarned: 0,
      totalSpent: 0,
      tarotAlbumUnlocked: false,
      unlocked: false,
      authenticated: true,
      disabled: true,
      reason: "honey_storage_unavailable",
    };
  }
}

function publicHoneyLetter(value) {
  if (!value || typeof value !== "object") return null;
  const body = cleanMultiline(value.body || value.message || value.content, 3000);
  if (!body) return null;
  return {
    title: cleanText(value.title, 80) || "연이의 꿀편지",
    body,
    createdAt: dateIso(value.createdAt),
    provider: cleanText(value.provider, 80) || undefined,
    model: cleanText(value.model, 120) || undefined,
  };
}

function resultPayloadForStorage(result) {
  const safe = result && typeof result === "object" ? { ...result } : {};
  delete safe.honeyDropBonusAdvice;
  return safe;
}

async function saveFortuneTeaHouseResult({ auth, resultId, consultRequest, result, generationMeta }) {
  if (!auth?.userId) return null;
  const userId = String(auth.userId);
  const now = new Date();
  const { results } = honeyCollections();
  await results.updateOne(
    { userId, resultId },
    {
      $set: {
        userId,
        resultId,
        serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
        consultationMode: normalizeConsultationMode(consultRequest.consultationMode),
        featureKey: cleanText(result.featureKey, 160),
        pricing: result.pricing || {},
        status: "completed",
        profileId: cleanText(consultRequest.profileId, 120),
        questionSummary: cleanMultiline(result.questionSummary || consultRequest.question, 1200),
        result: resultPayloadForStorage(result),
        generationMeta: generationMeta || {},
        updatedAt: now,
      },
      $unset: { generationLock: "", generationError: "" },
      $setOnInsert: {
        _id: buildFortuneTeaResultStorageId(userId, resultId),
        createdAt: now,
      },
    },
    { upsert: true },
  );
  return results.findOne({ userId, resultId });
}

const FORTUNE_TEA_HOUSE_HISTORY_LIST_LIMIT = 20;

function publicFortuneTeaResultListItem(doc) {
  const resultId = cleanText(doc?.resultId, 180);
  if (!resultId) return null;
  return {
    resultId,
    consultationMode: normalizeConsultationMode(doc?.consultationMode),
    questionSummary: cleanMultiline(doc?.questionSummary, 200),
    createdAt: dateIso(doc?.createdAt),
  };
}

async function readFortuneTeaHouseResultsList(request, env) {
  let auth;
  try {
    auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true, userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    if (isTransientMongoError(error)) return { ok: false, status: 503, message: "잠시 후 다시 확인해주세요." };
    throw error;
  }
  if (!auth?.userId) return { ok: false, status: 401, message: "잠시 후 다시 확인해주세요." };

  await connectDb(env);
  const userId = String(auth.userId);
  const docs = await withMongoRetry(env, async () => {
    const { results } = honeyCollections();
    return results
      .find({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE, status: "completed" })
      .project({ resultId: 1, consultationMode: 1, questionSummary: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(FORTUNE_TEA_HOUSE_HISTORY_LIST_LIMIT)
      .toArray();
  });
  return { ok: true, items: docs.map(publicFortuneTeaResultListItem).filter(Boolean) };
}

async function handleFortuneTeaHouseResultsList(request, env) {
  const outcome = await readFortuneTeaHouseResultsList(request, env);
  if (!outcome.ok) return json({ ok: false, message: outcome.message }, { status: outcome.status });
  return json({ ok: true, items: outcome.items });
}

async function readFortuneTeaHouseResultDetail(request, env, resultId) {
  let auth;
  try {
    auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true, userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    if (isTransientMongoError(error)) return { ok: false, status: 503, message: "잠시 후 다시 확인해주세요." };
    throw error;
  }
  if (!auth?.userId) return { ok: false, status: 401, message: "잠시 후 다시 확인해주세요." };

  await connectDb(env);
  const userId = String(auth.userId);
  const doc = await withMongoRetry(env, async () => {
    const { results } = honeyCollections();
    return results.findOne({ userId, resultId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE, status: "completed" });
  });
  const result = doc ? publicFortuneTeaStoredResult(doc, { resultId }) : null;
  if (!result) return { ok: false, status: 404, message: "상담 기록을 찾을 수 없어요." };
  return { ok: true, result };
}

async function handleFortuneTeaHouseResultDetail(request, env, path) {
  const resultId = cleanText(decodeURIComponent(path.slice("/results/".length)), 180);
  if (!resultId) return json({ ok: false, message: "상담 기록을 찾을 수 없어요." }, { status: 404 });
  const outcome = await readFortuneTeaHouseResultDetail(request, env, resultId);
  if (!outcome.ok) return json({ ok: false, message: outcome.message }, { status: outcome.status });
  return json({ ok: true, result: outcome.result });
}

async function grantHoneyDropReward(auth, resultId, consultationMode) {
  if (!auth?.userId) return null;

  const userId = String(auth.userId);
  const now = new Date();
  const { wallets, ledgers } = honeyCollections();
  let earnedThisResult = false;

  try {
    await ledgers.insertOne({
      _id: `earn:${userId}:${resultId}`,
      userId,
      type: "earn",
      amount: 1,
      reason: "TEA_HOUSE_CONSULTATION_REWARD",
      serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
      relatedResultId: resultId,
      relatedConsultationMode: cleanText(consultationMode, 20),
      idempotencyKey: `earn:${resultId}`,
      createdAt: now,
      metadata: { source: "fortune-tea-house-consult" },
    });
    earnedThisResult = true;
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
  }

  if (earnedThisResult) {
    await wallets.updateOne(
      { userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE },
      {
        $inc: { balance: 1, totalEarned: 1 },
        $set: { lastEarnedAt: now, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  const wallet = await wallets.findOne({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE });
  return honeyStatePayload(wallet, {
    resultId,
    earnedThisResult,
    duplicateResult: !earnedThisResult,
  });
}

function normalizeIdempotencyKey(value, fallback) {
  return cleanText(value, 180) || fallback;
}

function extractHoneyLetterResultId(path, body) {
  const match = String(path || "").match(/^\/results\/([^/]+)\/honey-letter$/);
  const pathResultId = match ? decodeURIComponent(match[1]) : "";
  return cleanText(body?.resultId || pathResultId, 180);
}

function honeyLetterError(errorCode, status, extra = {}) {
  return json({
    success: false,
    serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
    errorCode,
    ...extra,
  }, { status });
}

function honeyAlbumError(errorCode, status, extra = {}) {
  return json({
    ok: false,
    success: false,
    serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
    errorCode,
    ...extra,
  }, { status });
}

async function handleTarotAlbumUnlock(request, env) {
  const auth = await getCurrentUser(request, env);
  if (!auth?.userId) {
    return honeyAlbumError("UNAUTHORIZED", 401, {
      message: "잠시 후 다시 확인해주세요.",
    });
  }

  const body = await readJson(request);
  await connectDb(env);

  const userId = String(auth.userId);
  const now = new Date();
  const idempotencyKey = normalizeIdempotencyKey(body?.idempotencyKey, `yeoni-tarot-album:${userId}`);
  const { wallets, ledgers } = honeyCollections();
  const existingWallet = await wallets.findOne({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE });

  if (existingWallet?.tarotAlbumUnlocked) {
    const honeyDrops = honeyStatePayload(existingWallet);
    return json({
      ok: true,
      success: true,
      serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
      spent: 0,
      balance: honeyDrops.balance,
      honeyDrops,
      alreadyUnlocked: true,
    });
  }

  const current = honeyStatePayload(existingWallet).balance;
  if (current < TAROT_ALBUM_UNLOCK_COST) {
    return honeyAlbumError("INSUFFICIENT_TEA_HOUSE_HONEY_DROPS", 402, {
      message: "운명의 찻집에서 상담을 보면 꿀방울을 모을 수 있어요",
      required: TAROT_ALBUM_UNLOCK_COST,
      current,
      honeyDrops: honeyStatePayload(existingWallet),
    });
  }

  const updatedWallet = await wallets.findOneAndUpdate(
    {
      userId,
      serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
      tarotAlbumUnlocked: { $ne: true },
      balance: { $gte: TAROT_ALBUM_UNLOCK_COST },
    },
    {
      $inc: { balance: -TAROT_ALBUM_UNLOCK_COST, totalSpent: TAROT_ALBUM_UNLOCK_COST },
      $set: {
        tarotAlbumUnlocked: true,
        tarotAlbumUnlockedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  const walletAfter = unwrapUpdatedDoc(updatedWallet);

  if (!walletAfter) {
    const latestWallet = await wallets.findOne({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE });
    const latestHoneyDrops = honeyStatePayload(latestWallet);
    if (latestHoneyDrops.tarotAlbumUnlocked) {
      return json({
        ok: true,
        success: true,
        serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
        spent: 0,
        balance: latestHoneyDrops.balance,
        honeyDrops: latestHoneyDrops,
        alreadyUnlocked: true,
      });
    }

    return honeyAlbumError("INSUFFICIENT_TEA_HOUSE_HONEY_DROPS", 402, {
      message: "운명의 찻집에서 상담을 보면 꿀방울을 모을 수 있어요",
      required: TAROT_ALBUM_UNLOCK_COST,
      current: latestHoneyDrops.balance,
      honeyDrops: latestHoneyDrops,
    });
  }

  await ledgers.updateOne(
    { _id: `spend:${userId}:tarot-album` },
    {
      $setOnInsert: {
        _id: `spend:${userId}:tarot-album`,
        userId,
        type: "spend",
        amount: TAROT_ALBUM_UNLOCK_COST,
        reason: "YEONI_TAROT_ALBUM_UNLOCK",
        serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
        idempotencyKey,
        createdAt: now,
        metadata: { source: "yeoni-tarot-album" },
      },
    },
    { upsert: true },
  ).catch((error) => {
    console.warn("[fortune-tea-house/tarot-album] spend ledger failed", error);
  });

  const honeyDrops = honeyStatePayload(walletAfter);
  return json({
    ok: true,
    success: true,
    serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
    spent: TAROT_ALBUM_UNLOCK_COST,
    balance: honeyDrops.balance,
    honeyDrops,
    alreadyUnlocked: false,
  });
}

function buildHoneyLetterPrompt(resultDoc, attempt = 0) {
  const result = resultDoc?.result || {};
  return JSON.stringify({
    task: "운명의 찻집 결과 하단에 붙일 '연이의 꿀편지'를 작성한다.",
    serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
    rules: [
      "기존 상담 결과를 대체하지 않는다.",
      "기존 본문을 반복 요약하거나 복붙하지 않는다.",
      "편지처럼 따뜻하게, 손님에게 직접 말을 건넨다.",
      "다정한 존댓말('~예요', '~네요', '~하실 거예요' 체)을 끝까지 유지한다.",
      "이모지는 쓰지 않거나 아주 절제해서 쓰고, 찻집의 차분함을 지킨다.",
      "연이의 귀엽고 다정한 매력은 살리되 유치하게 쓰지 않는다.",
      "꽃돼지, 꿀방울, 찻잔, 달빛 표현을 자연스럽게 섞는다.",
      "상대방 마음을 단정하지 않는다.",
      "확정 예언, 불안 조장, 결제 유도, 코인/월정석/이용권 언급을 하지 않는다.",
      "상담 방식별 근거를 1~2개만 반영한다.",
      "800자 이상 1200자 이하로 쓴다.",
      "JSON만 반환한다.",
    ],
    retry: attempt > 0 ? "이전 편지는 품질 기준에 닿지 않았다. 이번에는 800자 이상, 편지체, 상담 근거 반영, 반복 금지를 반드시 지킨다." : undefined,
    consultation: {
      mode: resultDoc.consultationMode,
      questionSummary: result.questionSummary || resultDoc.questionSummary,
      teaCup: result.teaCup,
      tarot: resultDoc.consultationMode === "tarot" ? result.tarot : undefined,
      saju: isSajuFamilyMode(resultDoc.consultationMode) ? {
        dayMaster: result.saju?.dayMaster,
        dominantElements: result.saju?.dominantElements,
        primaryTenGod: result.saju?.primaryTenGod,
        secondaryTenGods: result.saju?.secondaryTenGods,
        summary: result.saju?.summary,
        oneLineAdvice: result.saju?.oneLineAdvice,
      } : undefined,
      sukuyoCompatibility: resultDoc.consultationMode === "sukuyo" ? result.sukuyoCompatibility : undefined,
    },
    outputSchema: {
      title: "연이의 꿀편지",
      body: "800~1200자 편지 본문",
    },
  });
}

function parseHoneyLetterResponse(text) {
  const parsed = extractJson(text);
  return {
    title: cleanText(parsed?.title, 80) || "연이의 꿀편지",
    body: cleanMultiline(parsed?.body || parsed?.message || parsed?.content, 3000),
  };
}

function isTestHoneyLetterEnabled(env) {
  return cleanText(env?.NODE_ENV || env?.ENVIRONMENT || env?.APP_ENV, 40).toLowerCase() === "test"
    && cleanMultiline(env?.FORTUNE_TEA_HOUSE_HONEY_LETTER_TEST_TEXT, 4000).length > 0;
}

function assertHoneyLetterQuality(letter, resultDoc) {
  const body = cleanMultiline(letter?.body, 3000);
  if (body.length < 800) {
    throw new Error("honey letter quality failed: too short");
  }
  if (SYSTEM_COPY_PATTERN.test(body) || MECHANICAL_COPY_PATTERN.test(body)) {
    throw new Error("honey letter quality failed: system copy");
  }
  if (/결제|코인|월정석|이용권|충전|구매|환불|할인/.test(body)) {
    throw new Error("honey letter quality failed: payment copy");
  }
  if (/반드시|무조건|100%|틀림없이|상대는 너를|상대는 당신을/.test(body)) {
    throw new Error("honey letter quality failed: deterministic claim");
  }
  if (hasRepeatedLongBlock(body)) {
    throw new Error("honey letter quality failed: repeated block");
  }

  const result = resultDoc?.result || {};
  if (resultDoc.consultationMode === "tarot") {
    const direction = result.tarot?.orientation === "upright" ? "정방향" : "역방향";
    const evidence = [result.tarot?.nameKo, direction, ...(result.tarot?.keywords || [])].filter(Boolean);
    if (!evidence.some((item) => body.includes(String(item)))) {
      throw new Error("honey letter quality failed: tarot evidence");
    }
  }
  if (isSajuFamilyMode(resultDoc.consultationMode)) {
    const evidence = [
      result.saju?.dayMaster,
      result.saju?.primaryTenGod?.nameKo,
      ...(result.saju?.dominantElements || []),
      ...(result.saju?.secondaryTenGods || []).map((item) => item.nameKo),
    ].filter(Boolean);
    if (evidence.length && !evidence.some((item) => body.includes(String(item)))) {
      throw new Error("honey letter quality failed: saju evidence");
    }
  }
  if (resultDoc.consultationMode === "sukuyo") {
    const compatibility = result.sukuyoCompatibility || {};
    const evidence = [
      compatibility.relationType,
      compatibility.relationTypeHan,
      compatibility.distanceLabel,
      compatibility.distanceTier,
      compatibility.direction,
    ].filter(Boolean);
    if (evidence.length && !evidence.some((item) => body.includes(String(item)))) {
      throw new Error("honey letter quality failed: sukuyo evidence");
    }
  }
}

async function generateHoneyLetter(resultDoc, env) {
  if (isTestHoneyLetterEnabled(env)) {
    const letter = {
      title: "연이의 꿀편지",
      body: cleanMultiline(env.FORTUNE_TEA_HOUSE_HONEY_LETTER_TEST_TEXT, 4000),
      provider: "test",
      model: "test",
    };
    assertHoneyLetterQuality(letter, resultDoc);
    return letter;
  }

  if (!hasGeminiKey(env)) {
    const error = new Error("fortune tea house honey letter llm unavailable");
    error.status = 503;
    throw error;
  }

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const ai = await callGeminiText(env, buildHoneyLetterPrompt(resultDoc, attempt), {
        systemPrompt: [
          "너는 운명의 찻집 상담사 연이다.",
          "꿀방울 10개를 모은 손님에게만 보내는 사적인 편지를 쓴다.",
          "연이의 목소리로 따뜻하지만 현실적인 애정을 전한다.",
          "결제, 코인, 월정석, 이용권, 환불, 시스템, 프롬프트 이야기는 절대 하지 않는다.",
        ].join("\n"),
        taskType: "fortune",
        temperature: attempt > 0 ? 0.48 : 0.62,
        maxOutputTokens: 2200,
        timeoutMs: 22000,
        responseMimeType: "application/json",
      });
      if (!ai.ok) throw new Error(ai.message || ai.error || "gemini_failed");
      const letter = {
        ...parseHoneyLetterResponse(ai.text),
        provider: ai.provider || "gemini",
        model: ai.model || "",
      };
      assertHoneyLetterQuality(letter, resultDoc);
      return letter;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("honey letter quality failed");
}

async function refundHoneyLetterSpend({ userId, resultId, consultationMode, idempotencyKey, spendLedgerId, reason }) {
  const now = new Date();
  const { wallets, ledgers } = honeyCollections();
  await wallets.updateOne(
    { userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE },
    {
      $inc: { balance: HONEY_LETTER_COST, totalSpent: -HONEY_LETTER_COST },
      $set: { updatedAt: now },
    },
  );
  try {
    await ledgers.insertOne({
      _id: `refund:${userId}:${resultId}:${idempotencyKey}`,
      userId,
      type: "refund",
      amount: HONEY_LETTER_COST,
      reason: "YEONI_HONEY_LETTER_REFUND",
      serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
      relatedResultId: resultId,
      relatedConsultationMode: consultationMode,
      idempotencyKey,
      createdAt: now,
      metadata: { spendLedgerId, reason: cleanText(reason, 160) },
    });
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
  }
}

async function handleHoneyLetter(request, env, path) {
  const auth = await getCurrentUser(request, env);
  if (!auth?.userId) {
    return honeyLetterError("UNAUTHORIZED", 401);
  }

  const body = await readJson(request);
  const resultId = extractHoneyLetterResultId(path, body);
  if (!resultId) {
    return honeyLetterError("MISSING_TEA_HOUSE_RESULT_ID", 400);
  }

  await connectDb(env);
  const userId = String(auth.userId);
  const now = new Date();
  const idempotencyKey = normalizeIdempotencyKey(body?.idempotencyKey, `yeoni-honey-letter:${userId}:${resultId}`);
  const { wallets, ledgers, results } = honeyCollections();
  const resultDoc = await results.findOne({ userId, resultId });

  if (!resultDoc) {
    return honeyLetterError("HONEY_DROPS_ONLY_FOR_FORTUNE_TEA_HOUSE", 404);
  }
  if (resultDoc.serviceScope !== FORTUNE_TEA_HOUSE_SCOPE || !VALID_HONEY_CONSULTATION_MODES.has(resultDoc.consultationMode)) {
    return honeyLetterError("HONEY_DROPS_ONLY_FOR_FORTUNE_TEA_HOUSE", 403);
  }
  if (resultDoc.status !== "completed" || resultDoc.generationMeta?.mode === "local_fallback") {
    return honeyLetterError("HONEY_LETTER_RESULT_NOT_READY", 409);
  }

  const existingLetter = publicHoneyLetter(resultDoc.honeyLetter || resultDoc.result?.honeyLetter);
  if (existingLetter) {
    const wallet = await wallets.findOne({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE });
    return json({
      success: true,
      serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
      spent: 0,
      balance: honeyStatePayload(wallet).balance,
      honeyDrops: honeyStatePayload(wallet),
      honeyLetter: existingLetter,
      alreadyApplied: true,
    });
  }

  const lockedResult = await results.findOneAndUpdate(
    {
      userId,
      resultId,
      serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
      status: "completed",
      honeyLetter: { $exists: false },
      honeyLetterLock: { $exists: false },
    },
    {
      $set: {
        honeyLetterLock: { idempotencyKey, createdAt: now },
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  const lockedDoc = unwrapUpdatedDoc(lockedResult);
  if (!lockedDoc) {
    const latest = await results.findOne({ userId, resultId });
    const latestLetter = publicHoneyLetter(latest?.honeyLetter || latest?.result?.honeyLetter);
    const wallet = await wallets.findOne({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE });
    if (latestLetter) {
      return json({
        success: true,
        serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
        spent: 0,
        balance: honeyStatePayload(wallet).balance,
        honeyDrops: honeyStatePayload(wallet),
        honeyLetter: latestLetter,
        alreadyApplied: true,
      });
    }
    return honeyLetterError("YEONI_HONEY_LETTER_IN_PROGRESS", 409);
  }

  try {
    const walletBefore = await wallets.findOne({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE });
    const current = honeyStatePayload(walletBefore).balance;
    if (current < HONEY_LETTER_COST) {
      await results.updateOne({ userId, resultId, "honeyLetterLock.idempotencyKey": idempotencyKey }, { $unset: { honeyLetterLock: "" }, $set: { updatedAt: new Date() } });
      return honeyLetterError("INSUFFICIENT_TEA_HOUSE_HONEY_DROPS", 402, {
        required: HONEY_LETTER_COST,
        current,
      });
    }

    const honeyLetter = await generateHoneyLetter(lockedDoc, env);
    const chargedWallet = await wallets.findOneAndUpdate(
      { userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE, balance: { $gte: HONEY_LETTER_COST } },
      {
        $inc: { balance: -HONEY_LETTER_COST, totalSpent: HONEY_LETTER_COST },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" },
    );
    const chargedWalletDoc = unwrapUpdatedDoc(chargedWallet);
    if (!chargedWalletDoc) {
      await results.updateOne({ userId, resultId, "honeyLetterLock.idempotencyKey": idempotencyKey }, { $unset: { honeyLetterLock: "" }, $set: { updatedAt: new Date() } });
      const latestWallet = await wallets.findOne({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE });
      return honeyLetterError("INSUFFICIENT_TEA_HOUSE_HONEY_DROPS", 402, {
        required: HONEY_LETTER_COST,
        current: honeyStatePayload(latestWallet).balance,
      });
    }

    const spendLedgerId = `spend:${userId}:${resultId}`;
    try {
      await ledgers.insertOne({
        _id: spendLedgerId,
        userId,
        type: "spend",
        amount: HONEY_LETTER_COST,
        reason: "YEONI_HONEY_LETTER_SPEND",
        serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
        relatedResultId: resultId,
        relatedConsultationMode: lockedDoc.consultationMode,
        idempotencyKey,
        createdAt: new Date(),
        metadata: { source: "yeoni-honey-letter" },
      });
    } catch (error) {
      await refundHoneyLetterSpend({ userId, resultId, consultationMode: lockedDoc.consultationMode, idempotencyKey, spendLedgerId, reason: "spend_ledger_failed" });
      await results.updateOne({ userId, resultId, "honeyLetterLock.idempotencyKey": idempotencyKey }, { $unset: { honeyLetterLock: "" }, $set: { updatedAt: new Date() } });
      if (Number(error?.code) === 11000) {
        const latest = await results.findOne({ userId, resultId });
        const latestLetter = publicHoneyLetter(latest?.honeyLetter || latest?.result?.honeyLetter);
        const latestWallet = await wallets.findOne({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE });
        if (latestLetter) {
          return json({
            success: true,
            serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
            spent: 0,
            balance: honeyStatePayload(latestWallet).balance,
            honeyDrops: honeyStatePayload(latestWallet),
            honeyLetter: latestLetter,
            alreadyApplied: true,
          });
        }
      }
      throw error;
    }

    const storedLetter = {
      title: honeyLetter.title || "연이의 꿀편지",
      body: honeyLetter.body,
      createdAt: new Date(),
      provider: cleanText(honeyLetter.provider, 80),
      model: cleanText(honeyLetter.model, 120),
      spendLedgerId,
    };
    const storeResult = await results.updateOne(
      { userId, resultId, "honeyLetterLock.idempotencyKey": idempotencyKey, honeyLetter: { $exists: false } },
      {
        $set: {
          honeyLetter: storedLetter,
          "result.honeyLetter": storedLetter,
          updatedAt: new Date(),
        },
        $unset: { honeyLetterLock: "" },
      },
    );
    if (!storeResult.matchedCount || !storeResult.modifiedCount) {
      await refundHoneyLetterSpend({ userId, resultId, consultationMode: lockedDoc.consultationMode, idempotencyKey, spendLedgerId, reason: "result_store_failed" });
      await results.updateOne({ userId, resultId, "honeyLetterLock.idempotencyKey": idempotencyKey }, { $unset: { honeyLetterLock: "" }, $set: { updatedAt: new Date() } });
      return honeyLetterError("YEONI_HONEY_LETTER_SAVE_FAILED", 500);
    }

    const walletAfter = await wallets.findOne({ userId, serviceScope: FORTUNE_TEA_HOUSE_SCOPE });
    return json({
      success: true,
      serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
      spent: HONEY_LETTER_COST,
      balance: honeyStatePayload(walletAfter).balance,
      honeyDrops: honeyStatePayload(walletAfter),
      honeyLetter: publicHoneyLetter(storedLetter),
      alreadyApplied: false,
    });
  } catch (error) {
    await results.updateOne({ userId, resultId, "honeyLetterLock.idempotencyKey": idempotencyKey }, { $unset: { honeyLetterLock: "" }, $set: { updatedAt: new Date() } }).catch(() => undefined);
    console.warn("[fortune-tea-house/honey-letter] failed", error);
    return honeyLetterError("YEONI_HONEY_LETTER_GENERATION_FAILED", Number(error?.status || 0) || 502);
  }
}

function cloneFortuneTeaBillingHeaders(request) {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  return headers;
}

async function callFortuneTeaDeferredUsageRoute({ request, env, auth, path, featureKey, pricing = {}, requestId = "", resultId = "", code = "", message = "" }) {
  if (!requestId) return null;
  const url = new URL(request.url);
  url.pathname = `/api/billing/coin-gate/deferred/${path}`;
  url.search = "";
  const response = await handleBillingRoutes(new Request(url.toString(), {
    method: "POST",
    headers: cloneFortuneTeaBillingHeaders(request),
    body: JSON.stringify({
      featureKey,
      serviceType: FORTUNE_TEA_HOUSE_SERVICE_KEY,
      productId: FORTUNE_TEA_HOUSE_SERVICE_KEY,
      reason: cleanText(pricing.reason, 120) || "운명 찻집 상담",
      requestId,
      idempotencyKey: requestId,
      resultId,
      sessionId: resultId,
      code,
      message,
    }),
  }), env, { preverifiedAuth: auth });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const error = new Error(cleanText(payload?.message || payload?.error?.message || `Deferred usage ${path} failed.`, 500));
    error.status = response.status || 500;
    error.code = cleanText(payload?.error?.code || `DEFERRED_USAGE_${path.toUpperCase()}_FAILED`, 80);
    throw error;
  }
  return payload?.data || payload;
}

// 이용권/결제 판정만 수행하는 체크 전용 엔드포인트 — LLM 생성·차감 없이 /consult와 동일한 접근 판정을 공유한다.
async function handleEnsureAccess(request, env) {
  if (!checkRateLimit(request)) {
    return json(
      { ok: false, message: "찻잔이 잠시 뜨거워졌어요. 잠시 후 다시 건네주세요." },
      { status: 429 },
    );
  }
  const body = await readJson(request);
  const consultRequest = normalizeRequest(body);
  const access = await verifyFortuneTeaHouseConsultAccess(request, env, body, consultRequest);
  if (!access.ok) return access.response;
  return json({
    ok: true,
    featureKey: access.featureKey,
    accessSource: cleanText(access.accessDecision?.accessSource || access.accessDecision?.reason, 80),
  });
}

async function handleConsult(request, env, ctx = null) {
  if (!checkRateLimit(request)) {
    return json(
      { ok: false, message: "찻잔이 잠시 뜨거워졌어요. 잠시 후 다시 건네주세요." },
      { status: 429 },
    );
  }

  const body = await readJson(request);
  const consultRequest = normalizeRequest(body);
  const access = await verifyFortuneTeaHouseConsultAccess(request, env, body, consultRequest);
  if (!access.ok) return access.response;

  const fallback = normalizeDraftResult(body?.draftResult, consultRequest);
  const resultId = buildHoneyResultId(body, consultRequest);
  const requestId = readFortuneTeaRequestId(body, consultRequest);
  if (access.auth?.userId) {
    await connectDb(env);
    const generation = await beginFortuneTeaHouseGeneration({
      auth: access.auth,
      resultId,
      consultRequest,
      featureKey: access.featureKey,
      pricing: access.pricing,
      requestId,
    });
    if (generation.completed) {
      const honeyDrops = await readHoneyDropsState(request, env);
      return json({
        ok: true,
        result: generation.result,
        honeyDrops: honeyDrops ? {
          ...honeyDrops,
          resultId,
          earnedThisResult: false,
          duplicateResult: true,
        } : honeyDrops,
        generationMeta: generation.doc?.generationMeta || {},
        cached: true,
      });
    }
    if (generation.inProgress) {
      return json({
        ok: true,
        status: "generating",
        retryable: true,
        resultId,
        message: "결제는 확인되었고 상담문은 아직 생성 중입니다. 잠시 뒤 같은 요청으로 다시 확인해 주세요.",
      }, { status: 202 });
    }
  }
  // 생성→차감(apply)→저장→리워드 전체를 클로저로 묶는다 — ctx가 있고 로그인 사용자면(생성 레코드로
  // 재-POST 폴링 수렴 가능) 즉시 202 후 백그라운드(waitUntil)에서 완주하고, 아니면 기존 동기 계약 유지.
  // apply/cancel·markFailed가 클로저 안에 함께 있어 차감은 여전히 '생성 성공 후'에만 일어난다.
  const runGeneration = async () => {
  let generated;
  try {
    generated = await generateConsultResult(consultRequest, fallback, env);
    if (access.deferredUsage) {
      await callFortuneTeaDeferredUsageRoute({
        request,
        env,
        auth: access.auth,
        path: "apply",
        featureKey: access.featureKey,
        pricing: access.pricing,
        requestId,
        resultId,
      });
    }
  } catch (error) {
    if (access.deferredUsage) {
      await callFortuneTeaDeferredUsageRoute({
        request,
        env,
        auth: access.auth,
        path: "cancel",
        featureKey: access.featureKey,
        pricing: access.pricing,
        requestId,
        resultId,
        code: cleanText(error?.code || "FORTUNE_TEA_HOUSE_GENERATION_FAILED", 80),
        message: cleanText(error?.message || error, 500),
      }).catch((cancelError) => {
        console.warn("[fortune-tea-house/billing-deferred] cancel failed", cancelError);
      });
    }
    await markFortuneTeaHouseGenerationFailed({
      auth: access.auth,
      resultId,
      code: cleanText(error?.code || "FORTUNE_TEA_HOUSE_GENERATION_FAILED", 80),
      message: cleanText(error?.message || error, 500),
    });
    if (cleanText(error?.code, 80) === "FORTUNE_TEA_HOUSE_LLM_RETRYABLE") {
      return json({
        ok: false,
        retryable: true,
        reason: "LLM_RETRYABLE",
        message: cleanText(error?.message, 500) || "연이가 상담문을 끝까지 다듬지 못했어요. 잠시 후 다시 열어 주세요.",
      }, { status: 503 });
    }
    throw error;
  }
  const auth = access.auth;
  const result = {
    ...generated.result,
    resultId,
    serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
    consultationMode: consultRequest.consultationMode,
    tarotSpread: consultRequest.tarotSpread,
    featureKey: access.featureKey,
    pricing: access.pricing,
  };
  let honeyDrops = auth?.userId ? null : await readHoneyDropsState(request, env);

  if (auth?.userId) {
    try {
      await connectDb(env);
      await saveFortuneTeaHouseResult({ auth, resultId, consultRequest, result, generationMeta: generated.generationMeta });
      honeyDrops = await grantHoneyDropReward(auth, resultId, consultRequest.consultationMode);
    } catch (error) {
      console.warn("[fortune-tea-house/honey-drops] reward disabled", error);
      honeyDrops = {
        serviceScope: FORTUNE_TEA_HOUSE_SCOPE,
        balance: 0,
        fortuneTeaHouseHoneyDrops: 0,
        currentHoneyDrops: 0,
        totalHoneyDrops: 0,
        totalEarned: 0,
        totalSpent: 0,
        resultId,
        earnedThisResult: false,
        duplicateResult: false,
        unlocked: false,
        authenticated: true,
        disabled: true,
        reason: "honey_reward_unavailable",
      };
    }
  }

  return json({
    ok: true,
    result,
    honeyDrops,
    generationMeta: generated.generationMeta,
  });
  };

  // 동기 생성: 요청 안에서 완결해 완료 결과를 바로 반환한다. waitUntil 백그라운드+재-POST 폴링은 공유 DB 연결을
  // 여러 요청이 재사용하게 만들어 Cloudflare Workers 요청 간 I/O 격리로 결과가 고착되던 문제가 있어 쓰지 않는다(네오와 동일).
  return await runGeneration();
}

export async function handleFortuneTeaHouseRoutes(request, env = {}, ctx = null) {
  let traceMethod = "GET";
  let tracePath = "/api/fortune-tea-house";
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/fortune-tea-house");
    traceMethod = method;
    tracePath = new URL(request.url).pathname;
    if (method === "GET" && (path === "/honey-drops" || path === "/honey-drops/balance")) {
      return json({ ok: true, honeyDrops: await readHoneyDropsState(request, env) });
    }

    if (method === "POST" && (path === "/results/honey-letter" || /^\/results\/[^/]+\/honey-letter$/.test(path))) {
      return await handleHoneyLetter(request, env, path);
    }

    if (method === "GET" && path === "/results") {
      return await handleFortuneTeaHouseResultsList(request, env);
    }

    if (method === "GET" && /^\/results\/[^/]+$/.test(path)) {
      return await handleFortuneTeaHouseResultDetail(request, env, path);
    }

    if (method === "POST" && path === "/honey-drops/tarot-album/unlock") {
      return await handleTarotAlbumUnlock(request, env);
    }

    if (method === "POST" && path === "/ensure-access") {
      return await handleEnsureAccess(request, env);
    }

    if (method === "POST" && path === "/consult") {
      return await handleConsult(request, env, ctx);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (Number.isFinite(Number(error?.status))) {
      return json({ ok: false, message: String(error?.message || "상담 내용을 다시 확인해 주세요.") }, { status: Number(error.status) });
    }
    return handleRouteError(error, { request, env, trace: { route: "fortune-tea-house", method: traceMethod, requestPath: tracePath } });
  }
}
