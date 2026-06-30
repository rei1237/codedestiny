import { callLLM } from "../../../../lib/llm-client";
import type { FortuneTeaHouseConsultResponse, FortuneTeaTarotSnapshot } from "../data/consult";
import type { FortuneTeaHouseConsultRequest } from "../data/consult";
import { buildFortuneTeaHouseConsultResult } from "./buildConsultResult";
import { ensureConsultResultConsistency } from "./validateConsultResult";

const GEMINI_KEY_NAMES = ["GEMINIF_API_KEY", "GEMINIF_API_KEY1", "GEMINIF_API_KEY2", "GEMINIF_API_KEY3", "GEMINIF_API_KEY4", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"];
const MECHANICAL_COPY_PATTERN = /이 기능은|이 결과는|분석 결과는|콘텐츠 블록|서비스 결과|API|JSON|payload|schema/i;
const SYSTEM_COPY_PATTERN = /AI cannot|I cannot|language model|system prompt|prompt 원문|mock|dry[_-]?run|providerReason|Gemini|OpenAI|Workers AI|schema|payload|JSON/i;
const SAJU_FORBIDDEN_COPY_PATTERN = /긍정적으로 생각|마음을 차분히 바라보|대화가 중요|모든 것은 당신의 선택|작은 행동 하나만|인간 상담사 연이로서|무조건 잘 됩니다|반드시 재회|절대 안 됩니다|정해진 운명|타로 카드|카드 상징|점성술|숙요점|자미두수/i;
const SAJU_MIN_RESULT_CHARS = 5000;
const SAJU_REQUIRED_SECTION_TITLES = [
  "핵심 요약",
  "타고난 기질",
  "오행 균형",
  "십성 구조",
  "강점",
  "반복되는 약점",
  "현재 운의 흐름",
  "일 · 돈 · 관계 · 건강 리듬",
  "앞으로 조심할 시기",
  "실천 전략",
  "오늘의 한 문장 조언",
];
const baseSajuSystemPrompt = [
  "너는 운명의 찻집의 사주 상담사 연이다.",
  "연이는 따뜻하고 귀엽지만 듣기 좋은 말만 하지 않는다.",
  "연이는 사주 엔진이 제공한 명식 근거를 바탕으로 손님의 기질, 반복 패턴, 현재 운의 흐름, 현실적인 선택지를 차분히 읽어준다.",
  "LLM은 계산자가 아니라 상담 문장화, 해석, 전략화 역할만 맡는다.",
];
const sajuSafetyRules = [
  "사주 엔진이 제공한 계산 결과만 근거로 사용한다.",
  "일간, 월령, 오행, 십성, 합충형해파, 대운, 세운 정보가 있으면 가능한 범위에서 반영한다.",
  "모르는 정보는 지어내지 않는다.",
  "출생시간이 없으면 시주 해석의 한계를 명시한다.",
  "상대방 정보가 없으면 궁합이나 상대 마음을 단정하지 않는다.",
  "찻잔 카테고리에 따라 해석 관점을 바꾼다.",
  "타로, 점성술, 숙요점, 자미두수 해석을 섞지 않는다.",
  "단정적 예언, 공포 마케팅, 반복 결제 유도 표현을 금지한다.",
  "의료, 법률, 투자 판단을 확정하지 않는다.",
  "결과는 유료 상담답게 구체적이고 충분한 분량으로 작성한다.",
];

type SajuCategoryRule = {
  id: string;
  aliases: string[];
  resultKey: string;
  category: string;
  concept: string;
  minChars: number;
  focus: string[];
  requiredSections: string[];
  gauges: Array<[string, "pink" | "purple" | "blue" | "gold" | "green", number, string]>;
  requiredTerms: string[];
};

const teaCategorySajuPromptMap: Record<string, SajuCategoryRule> = {
  "lotus-moon": {
    id: "lotus-moon",
    aliases: ["달빛 연꽃차", "연애", "재회"],
    resultKey: "loveReunionSajuReading",
    category: "연애 · 재회",
    concept: "미련과 가능성 사이에서 내 사주의 관계 패턴과 현재 운의 흐름을 통해 가장 덜 다치는 다음 걸음을 찾는 상담",
    minChars: 5500,
    focus: ["일간의 관계 방식", "배우자성/관성/재성의 작동", "식상 표현 방식", "인성의 미련과 회상", "비겁의 자존심", "현재 대운·세운의 관계 흐름", "합충형해파가 만드는 거리감"],
    requiredSections: ["지금 재회 질문이 떠오른 사주적 이유", "내 일간이 사랑을 붙잡는 방식", "미련과 가능성을 구분해야 하는 지점", "현재 운에서 관계가 다시 움직이는 조건", "재회를 닫아버리는 내 반복 패턴", "상대 정보 유무에 따른 관계 리듬", "지금 연락해도 되는가", "연락한다면 어떤 톤이어야 하는가", "7일 관계 정리/접근 플랜", "연이의 마지막 한마디"],
    gauges: [["미련", "pink", 64, "인성과 관계 질문의 반복성이 오래 남은 장면을 되짚게 합니다."], ["관계 압박", "purple", 58, "관성 흐름이 강하면 관계에서 책임과 부담을 크게 느낄 수 있습니다."], ["표현 욕구", "gold", 54, "식상 흐름은 말을 꺼내고 싶은 마음과 표현의 온도를 보여줍니다."], ["기다림", "blue", 62, "수 기운과 인성의 결은 서두르기보다 더 확인하려는 흐름을 키웁니다."], ["회복 가능성", "green", 50, "용신 방향과 현재 운이 맞을수록 관계를 덜 다치게 정리할 힘이 올라옵니다."]],
    requiredTerms: ["재회", "미련", "가능성", "연락", "7일"],
  },
  "honey-peach": {
    id: "honey-peach",
    aliases: ["꿀복숭아차", "썸", "인연"],
    resultKey: "connectionSajuReading",
    category: "썸 · 인연",
    concept: "아직 이름 붙지 않은 설렘이 내 사주에서 어떻게 피어나는지, 인연의 속도와 접근 방식을 읽는 상담",
    minChars: 5500,
    focus: ["일간의 호감 표현", "식상으로 드러나는 매력", "재성/관성의 관계 욕구", "도화·홍염·천희 신살이 있으면 참고", "비겁의 경쟁심", "인성의 신중함", "새 인연이 들어오기 쉬운 운"],
    requiredSections: ["내 사주에서 설렘이 시작되는 방식", "상대에게 끌리는 포인트", "호감을 표현할 때 생기는 장점과 어색함", "지금 인연이 커질 가능성", "너무 빨리 다가가면 생길 수 있는 문제", "좋은 연락 리듬과 만남 전략", "상대 정보가 있을 경우 두 사람의 속도 차이", "7일 썸 리듬 플랜", "오늘 보내기 좋은 가벼운 문장 예시", "연이의 마지막 한마디"],
    gauges: [["설렘", "pink", 66, "식상과 화 기운은 마음이 밖으로 피어나는 속도를 보여줍니다."], ["호감 표현력", "gold", 57, "식상이 살아 있으면 호감을 말과 행동으로 옮기기 쉽습니다."], ["신중함", "blue", 55, "인성이 강하면 확인하고 싶은 마음이 먼저 움직입니다."], ["인연 타이밍", "green", 52, "현재 운의 방향이 새 만남을 열어 주는지를 함께 봅니다."], ["관계 확장성", "purple", 50, "비겁과 재성/관성의 균형이 관계의 자연스러운 확장을 좌우합니다."]],
    requiredTerms: ["설렘", "호감", "인연", "7일"],
  },
  "star-black-tea": {
    id: "star-black-tea",
    aliases: ["별가루 홍차", "진로", "사업"],
    resultKey: "careerBusinessSajuReading",
    category: "진로 · 사업",
    concept: "막막한 길 위에서 내 명식이 가진 일의 방향, 재능, 실행력, 확장 타이밍을 읽는 상담",
    minChars: 6000,
    focus: ["일간의 일하는 방식", "월령과 격국의 사회적 방향", "식상·재성·관성 연결", "인성의 공부와 보호막", "비겁의 독립성/협업", "현재 대운·세운의 확장/전환/정체 신호"],
    requiredSections: ["내 명식이 보여주는 일의 기본 방향", "지금 막막함이 생긴 사주적 이유", "강하게 써야 할 재능", "지금 부족하거나 보완해야 할 기운", "사업/진로 확장 가능성", "현재 운에서 움직여도 되는 부분", "피해야 할 선택", "14일 실행 플랜", "리스크 체크리스트", "연이의 마지막 한마디"],
    gauges: [["방향감", "gold", 54, "월령과 일간의 결은 사회적으로 힘을 쓰는 방향을 비춥니다."], ["실행력", "green", 56, "식상과 비겁 흐름은 실제로 밀고 나가는 힘을 보여줍니다."], ["확장성", "purple", 50, "재성과 관성의 연결이 시장과 제도 안에서 커질 여지를 만듭니다."], ["압박감", "blue", 58, "관성이 강하면 책임과 기준이 커져 막막함으로 느껴질 수 있습니다."], ["준비도", "pink", 52, "인성과 현재 운의 보완이 준비의 밀도를 가리킵니다."]],
    requiredTerms: ["진로", "사업", "식상", "재성", "관성", "14일"],
  },
  "gold-cinnamon": {
    id: "gold-cinnamon",
    aliases: ["황금 계피차", "황금 커피차", "금전운", "돈"],
    resultKey: "moneySajuReading",
    category: "금전운",
    concept: "내 명식의 돈 흐름, 수익화 방식, 소비 패턴, 회복 전략을 읽는 상담",
    minChars: 6000,
    focus: ["재성의 강약과 위치", "식상이 재성을 생하는지", "비겁이 재성을 나누는지", "관성이 재성을 지키는지", "인성이 재성 흐름을 막거나 안정시키는지", "현재 대운·세운의 재물 흐름"],
    requiredSections: ["내 명식의 돈 그릇", "돈이 들어오는 방식", "돈이 새는 패턴", "현재 운에서 금전 흐름이 움직이는 지점", "이번 달 조심해야 할 소비/손실 패턴", "수익화를 위해 써야 할 재능", "돈을 지키는 현실 기준", "30일 금전 회복 플랜", "하지 말아야 할 금전 행동", "연이의 마지막 한마디"],
    gauges: [["재물 감각", "gold", 58, "재성의 흐름은 돈을 알아보고 다루는 감각을 비춥니다."], ["수익화 가능성", "green", 52, "식상이 재성을 돕는 구조일수록 재능이 수익으로 이어지기 쉽습니다."], ["소비 누수", "purple", 55, "비겁이 강하면 돈이 나뉘거나 새는 구멍을 먼저 살펴야 합니다."], ["안정성", "blue", 50, "관성은 돈을 지키는 기준과 장치를 만들어 줍니다."], ["회복력", "pink", 53, "현재 운과 보완 기운은 금전 루틴을 되살릴 힘을 보여줍니다."]],
    requiredTerms: ["재성", "돈", "소비", "30일"],
  },
  "white-lotus-healing": {
    id: "white-lotus-healing",
    aliases: ["백련 치유차", "마음회복", "마음 회복"],
    resultKey: "healingSajuReading",
    category: "마음회복",
    concept: "내 명식 안에서 반복되는 소모 패턴을 보고 스스로에게 돌아오는 회복의 숨을 찾는 상담",
    minChars: 5500,
    focus: ["일간의 피로 방식", "오행 과다/부족의 정서적 긴장", "인성의 생각 과부하", "식상의 표현/해소", "관성의 압박", "비겁의 비교와 버티기", "재성의 현실 부담", "회복에 필요한 오행 균형"],
    requiredSections: ["내 명식이 지치는 방식", "요즘 마음이 무거워진 사주적 이유", "반복되는 자기 소모 패턴", "지금 줄여야 할 생각과 행동", "회복에 필요한 기운", "오늘 바로 가능한 회복 행동", "7일 회복 루틴", "나에게 해도 되는 말", "도움을 요청해야 할 신호", "연이의 마지막 한마디"],
    gauges: [["피로도", "purple", 64, "관성과 재성의 부담은 몸과 마음의 피로를 함께 올립니다."], ["생각 과부하", "blue", 60, "인성이 강하면 지나간 장면을 오래 복기할 수 있습니다."], ["자기돌봄", "green", 48, "부족한 오행을 보완하는 작은 루틴이 회복의 시작입니다."], ["안정감", "gold", 50, "토와 관성의 균형은 마음을 현실에 고정하는 힘을 줍니다."], ["회복 흐름", "pink", 52, "현재 운이 보완 기운과 닿으면 다시 숨을 고를 여지가 열립니다."]],
    requiredTerms: ["회복", "오행", "십성", "7일"],
  },
  "black-moon-brown-rice": {
    id: "black-moon-brown-rice",
    aliases: ["흑월 현미차", "이별", "위기"],
    resultKey: "crisisSajuReading",
    category: "이별 · 위기",
    concept: "끝내야 할 것과 지켜야 할 것 사이에서 내 사주의 관계 위기 패턴과 안전한 판단 기준을 찾는 상담",
    minChars: 5500,
    focus: ["일간이 위기에서 반응하는 방식", "관성/재성의 관계 압박", "식상의 말의 날카로움 또는 표현 부족", "인성의 집착/회상", "비겁의 자존심 싸움", "합충형해파가 만드는 단절과 충돌", "현재 운에서 위기가 커지는 이유"],
    requiredSections: ["지금 위기가 커진 사주적 장면", "내가 위기에서 반복하는 반응", "관계를 지키기 위해 필요한 조건", "내려놓아야 하는 패턴", "지금 대화해도 되는가", "대화한다면 지켜야 할 경계선", "더 악화시키는 행동", "72시간 안정 플랜", "안전하게 판단하기 위한 체크리스트", "연이의 마지막 한마디"],
    gauges: [["긴장도", "purple", 66, "충돌 신호와 관성 압박은 관계의 긴장을 높입니다."], ["충돌 가능성", "pink", 58, "식상이 날카롭게 쓰이면 말의 온도가 쉽게 올라갈 수 있습니다."], ["경계 필요성", "blue", 62, "위기 질문에서는 감정보다 안전한 거리와 기준이 먼저입니다."], ["정리 필요성", "gold", 56, "금 기운과 관성은 관계에서 남길 것과 덜어낼 것을 가릅니다."], ["안전감", "green", 46, "회복 가능성보다 먼저 나를 지키는 안정감을 확인해야 합니다."]],
    requiredTerms: ["위기", "경계", "72시간", "안전"],
  },
};

const sajuResultSchemaByCategory = Object.fromEntries(Object.values(teaCategorySajuPromptMap).map((rule) => [rule.id, { resultKey: rule.resultKey, requiredSections: rule.requiredSections }]));

export type FortuneTeaHouseGenerationMeta = {
  mode: "gemini" | "local_fallback";
  provider?: string;
  model?: string;
  reason?: string;
  generatedAt: string;
};

export type FortuneTeaHouseConsultGeneration = {
  result: FortuneTeaHouseConsultResponse;
  generationMeta: FortuneTeaHouseGenerationMeta;
};

function hasLlmKey(env?: Record<string, unknown>) {
  if (GEMINI_KEY_NAMES.some((key) => String(env?.[key] || "").trim())) return true;
  return GEMINI_KEY_NAMES.some((key) => String(process.env?.[key] || "").trim());
}

function extractJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("fortune tea house llm json parse failed");
  }
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanMultiline(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function resolveSajuCategoryRule(value: Partial<FortuneTeaHouseConsultRequest> | Partial<FortuneTeaHouseConsultResponse> = {}) {
  const requestLike = value as Partial<FortuneTeaHouseConsultRequest>;
  const resultLike = value as Partial<FortuneTeaHouseConsultResponse>;
  const id = cleanText(requestLike.selectedTeaCupId || resultLike.teaCup?.id, 80);
  if (teaCategorySajuPromptMap[id]) return teaCategorySajuPromptMap[id];
  const source = [
    requestLike.selectedTeaCupName,
    requestLike.selectedTeaCupTopic,
    resultLike.teaCup?.name,
    resultLike.teaCup?.topic,
    requestLike.concernTopic,
    requestLike.question,
    resultLike.questionSummary,
  ].filter(Boolean).join(" ");
  return Object.values(teaCategorySajuPromptMap).find((rule) => rule.aliases.some((alias) => source.includes(alias))) || {
    id: "general",
    aliases: [],
    resultKey: "coreReading",
    category: requestLike.selectedTeaCupTopic || resultLike.teaCup?.topic || "사주 상담",
    concept: "확인된 명식과 질문을 바탕으로 손님에게 필요한 기준과 다음 행동을 읽는 상담",
    minChars: SAJU_MIN_RESULT_CHARS,
    focus: ["일간", "오행", "십성", "현재 운의 흐름", "질문에 맞는 현실 조언"],
    requiredSections: SAJU_REQUIRED_SECTION_TITLES,
    gauges: [["기질 선명도", "gold", 56, "일간과 오행이 손님의 기본 반응 방식을 비춥니다."], ["생각 과부하", "blue", 54, "인성과 수 기운은 마음이 오래 머무는 자리를 보여줍니다."], ["표현 흐름", "pink", 52, "식상은 마음을 밖으로 꺼내는 방식을 가리킵니다."], ["현실 압박", "purple", 55, "관성과 재성은 책임과 현실 조건을 함께 띄웁니다."], ["회복 여지", "green", 50, "보완 기운은 오늘 다시 잡을 수 있는 균형을 보여줍니다."]] as SajuCategoryRule["gauges"],
    requiredTerms: ["일간", "오행", "십성"],
  };
}

function getSajuRequiredSectionTitles(value: Partial<FortuneTeaHouseConsultRequest> | Partial<FortuneTeaHouseConsultResponse>) {
  return resolveSajuCategoryRule(value).requiredSections;
}

function getSajuMinResultChars(value: Partial<FortuneTeaHouseConsultRequest> | Partial<FortuneTeaHouseConsultResponse>) {
  return resolveSajuCategoryRule(value).minChars || SAJU_MIN_RESULT_CHARS;
}

function normalizeDeepSections(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const section = item && typeof item === "object" ? item as { id?: unknown; title?: unknown; body?: unknown; tone?: unknown } : {};
      return {
        id: cleanText(section.id || `section-${index + 1}`, 80),
        title: cleanText(section.title, 80),
        body: cleanMultiline(section.body, 1800),
        tone: cleanText(section.tone, 20) as "summary" | "element" | "tenGod" | "flow" | "advice" | "caution" | undefined,
      };
    })
    .filter((section) => section.title && section.body.length >= 60);
}

function normalizeSajuFactText(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join(" · ");
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}:${typeof item === "object" ? JSON.stringify(item) : item}`).join(" · ");
  }
  return cleanText(value, 300);
}

function buildSajuFactInput(request: FortuneTeaHouseConsultRequest, saju: FortuneTeaHouseConsultResponse["saju"], rule: SajuCategoryRule) {
  return {
    consultationMode: "saju",
    teaId: request.selectedTeaCupId,
    teaName: request.selectedTeaCupName,
    teaCategory: rule.category,
    userQuestion: request.question,
    selfProfile: {
      name: cleanText(request.nickname || saju.birthSummary?.nickname, 40),
      gender: cleanText(request.gender || saju.birthSummary?.gender, 20),
      birthDate: cleanText(request.birthDate || saju.birthSummary?.birthDate, 20),
      birthTime: request.birthTimeUnknown ? "" : cleanText(request.birthTime || saju.birthSummary?.birthTime, 20),
      birthTimeUnknown: request.birthTimeUnknown === true || saju.birthSummary?.birthTimeUnknown === true,
      calendarType: request.calendarType || saju.birthSummary?.calendarType,
      birthPlace: cleanText(request.birthPlace || saju.birthSummary?.birthPlace, 120),
    },
    partnerProfile: undefined,
    sajuFacts: {
      dayMaster: cleanText(saju.dayMaster, 80),
      pillars: normalizeSajuFactText(saju.pillars),
      fiveElementsBalance: normalizeSajuFactText(saju.fiveElements || saju.dominantElements),
      tenGodsBalance: normalizeSajuFactText([saju.primaryTenGod?.nameKo, ...(saju.secondaryTenGods || []).map((item) => item.nameKo)].filter(Boolean)),
      strongElements: normalizeSajuFactText(saju.dominantElements),
      tenGodSnapshot: normalizeSajuFactText(saju.tenGodSnapshot?.tenGodLabels),
      currentLuckSummary: cleanMultiline(saju.summary, 800),
      caution: cleanMultiline(saju.cautionReading || saju.caution, 800),
      actionPrescription: cleanMultiline(saju.actionPrescription, 800),
    },
  };
}

function sajuHasTenGod(saju: FortuneTeaHouseConsultResponse["saju"], pattern: RegExp) {
  const joined = [
    saju.primaryTenGod?.nameKo,
    ...(saju.secondaryTenGods || []).map((item) => item.nameKo),
    ...(saju.tenGodSnapshot?.tenGodLabels || []),
    ...(saju.keyPoints || []),
  ].filter(Boolean).join(" ");
  return pattern.test(joined);
}

function sajuElementValue(saju: FortuneTeaHouseConsultResponse["saju"], key: string) {
  const item = (saju.fiveElements || []).find((element) => element.key === key || element.nameKo === key);
  return Number(item?.value || 0);
}

function buildSajuCategoryGauges(request: FortuneTeaHouseConsultRequest, saju: FortuneTeaHouseConsultResponse["saju"]) {
  const rule = resolveSajuCategoryRule(request);
  const factReason = [
    saju.dayMaster ? `일간 ${saju.dayMaster}` : "",
    saju.dominantElements?.length ? `대표 기운 ${saju.dominantElements.join(" · ")}` : "",
    saju.primaryTenGod?.nameKo ? `십성 ${saju.primaryTenGod.nameKo}` : "",
  ].filter(Boolean).join(", ");
  return rule.gauges.map(([label, tone, base, description], index) => {
    let value = Number(base) || 50;
    if (/압박|긴장|경계/.test(label) && sajuHasTenGod(saju, /정관|편관/)) value += 10;
    if (/생각|미련|기다림|신중/.test(label) && sajuHasTenGod(saju, /정인|편인/)) value += 10;
    if (/표현|실행|호감|수익화/.test(label) && sajuHasTenGod(saju, /식신|상관/)) value += 10;
    if (/재물|돈|소비|수익/.test(label) && sajuHasTenGod(saju, /정재|편재/)) value += 10;
    if (/충돌|소비|경쟁/.test(label) && sajuHasTenGod(saju, /비견|겁재/)) value += 8;
    if (/회복|안정|자기돌봄/.test(label) && (sajuElementValue(saju, "earth") || sajuElementValue(saju, "토")) >= 24) value += 6;
    if (request.birthTimeUnknown === true || saju.birthSummary?.birthTimeUnknown === true) value -= index % 2 === 0 ? 2 : 4;
    return {
      label,
      value: Math.max(8, Math.min(96, Math.round(value))),
      description: `${description}${factReason ? ` 근거는 ${factReason}의 흐름입니다.` : " 확인된 명식 범위 안에서만 산출했습니다."}`,
      tone,
    };
  });
}

function buildCategorySajuDeepSections(request: FortuneTeaHouseConsultRequest, saju: FortuneTeaHouseConsultResponse["saju"], rule = resolveSajuCategoryRule(request)) {
  const facts = buildSajuFactInput(request, saju, rule);
  const nickname = cleanText(request.nickname || saju.birthSummary?.nickname, 40) || "손님";
  const question = cleanMultiline(request.question, 700) || "지금 이 흐름을 어떻게 봐야 할까요?";
  const dayMaster = facts.sajuFacts.dayMaster || "드러난 일간";
  const elements = facts.sajuFacts.fiveElementsBalance || "오행 균형";
  const tenGods = facts.sajuFacts.tenGodsBalance || "십성 흐름";
  const currentLuck = facts.sajuFacts.currentLuckSummary || "현재 운의 흐름은 질문의 결 안에서 조심스럽게 살핍니다.";
  const timeLimit = facts.selfProfile.birthTimeUnknown ? "출생시간이 비어 있어 시주의 세밀한 해석은 제한하고, 확인된 생년월일과 질문의 결을 중심으로 봅니다." : "출생시간까지 놓고 반응 방식과 하루의 리듬을 함께 살핍니다.";
  return rule.requiredSections.map((title, index) => ({
    id: `${rule.resultKey}-${index + 1}`,
    title,
    tone: (index <= 1 ? "summary" : index <= 3 ? "element" : index <= 5 ? "flow" : index <= 7 ? "advice" : "caution") as "summary" | "element" | "flow" | "advice" | "caution",
    body: `${nickname}의 질문 "${question}"은 ${rule.category}의 찻잔에서 ${rule.concept}으로 열립니다. 이 대목에서는 ${title}을 먼저 보겠습니다. 명식의 중심은 ${dayMaster}이고, 오행은 ${elements}, 십성은 ${tenGods}의 결로 드러납니다. ${timeLimit} ${currentLuck} 연이는 여기서 결론을 단정하지 않고, 손님이 실제로 확인할 수 있는 신호와 마음이 만들어낸 해석을 나누어 봅니다. ${rule.focus[index % rule.focus.length]}을 기준으로 보면 지금 필요한 것은 감정을 키우는 말보다 조건, 경계, 다음 행동을 분명히 세우는 일입니다. 오늘 할 수 있는 작은 처방은 이 섹션의 질문을 한 문장으로 줄이고, 확인된 사실 하나와 아직 추측인 마음 하나를 따로 적어보는 것입니다.`,
  }));
}

function prepareSajuFallback(result: FortuneTeaHouseConsultResponse, request: FortuneTeaHouseConsultRequest): FortuneTeaHouseConsultResponse {
  if (request.consultationMode !== "saju") return result;
  const normalizedSections = normalizeDeepSections(result.saju.deepSections);
  const requiredSections = getSajuRequiredSectionTitles(request);
  const hasRequiredTitles = requiredSections.every((title) => normalizedSections.some((section) => section.title === title));
  const deepSections = hasRequiredTitles ? normalizedSections : buildCategorySajuDeepSections(request, result.saju);
  return {
    ...result,
    saju: {
      ...result.saju,
      deepSections,
      oneLineAdvice: result.saju.oneLineAdvice || "연이는 오늘 결론보다 기준을 먼저 잡으라고 말하고 싶어요. 확인된 명식 안에서 마음이 덜 다치는 한 걸음부터 고르면 됩니다.",
    },
    emotionAnalysis: buildSajuCategoryGauges(request, result.saju),
    luckyKeywords: [request.selectedTeaCupName, resolveSajuCategoryRule(request).category, "명식 근거", "오늘의 기준"],
  };
}

function tarotSnapshotFromResult(result: FortuneTeaHouseConsultResponse): FortuneTeaTarotSnapshot {
  return {
    cardId: result.tarot.cardId,
    number: result.tarot.number,
    nameKo: result.tarot.nameKo,
    nameEn: result.tarot.nameEn,
    orientation: result.tarot.orientation,
    keywords: result.tarot.keywords,
    meaning: result.tarot.meaning,
    source: "existing-ai-tarot",
  };
}

function mergeLlmResult(fallback: FortuneTeaHouseConsultResponse, parsed: Partial<FortuneTeaHouseConsultResponse>): FortuneTeaHouseConsultResponse {
  return {
    ...fallback,
    ...parsed,
    consultationMode: fallback.consultationMode,
    teaCup: fallback.teaCup,
    saju: {
      ...fallback.saju,
      ...(parsed.saju || {}),
      keyPoints: parsed.saju?.keyPoints?.length ? parsed.saju.keyPoints : fallback.saju.keyPoints,
      birthSummary: fallback.saju.birthSummary,
      dayMaster: fallback.saju.dayMaster,
      dominantElements: fallback.saju.dominantElements,
      pillars: fallback.saju.pillars,
      fiveElements: fallback.saju.fiveElements,
      primaryTenGod: fallback.saju.primaryTenGod,
      secondaryTenGods: fallback.saju.secondaryTenGods,
      cautionReading: fallback.saju.cautionReading,
      actionPrescription: fallback.saju.actionPrescription,
      tarotBridgeReady: fallback.saju.tarotBridgeReady,
      tenGodSnapshot: fallback.saju.tenGodSnapshot,
    },
    tarot: {
      ...fallback.tarot,
      ...(parsed.tarot || {}),
      cardId: fallback.tarot.cardId,
      number: fallback.tarot.number,
      nameKo: fallback.tarot.nameKo,
      nameEn: fallback.tarot.nameEn,
      orientation: fallback.tarot.orientation,
      keywords: fallback.tarot.keywords,
      meaning: fallback.tarot.meaning,
    },
    tarotSpread: fallback.tarotSpread,
    tarotSpreadCards: fallback.tarotSpreadCards,
    sukuyoCompatibility: fallback.sukuyoCompatibility
      ? {
          ...fallback.sukuyoCompatibility,
          ...(parsed.sukuyoCompatibility || {}),
          user: fallback.sukuyoCompatibility.user,
          partner: fallback.sukuyoCompatibility.partner,
          calculationSource: fallback.sukuyoCompatibility.calculationSource,
          calculationBasis: fallback.sukuyoCompatibility.calculationBasis,
          relationDetail: fallback.sukuyoCompatibility.relationDetail,
          relationType: fallback.sukuyoCompatibility.relationType,
          relationTypeHan: fallback.sukuyoCompatibility.relationTypeHan,
          distanceLabel: fallback.sukuyoCompatibility.distanceLabel,
          distanceTier: fallback.sukuyoCompatibility.distanceTier,
          forwardDistance: fallback.sukuyoCompatibility.forwardDistance,
          reverseDistance: fallback.sukuyoCompatibility.reverseDistance,
          shortestDistance: fallback.sukuyoCompatibility.shortestDistance,
          compatibilityIndex: fallback.sukuyoCompatibility.compatibilityIndex,
          scores: fallback.sukuyoCompatibility.scores,
          elementHarmony: fallback.sukuyoCompatibility.elementHarmony,
          direction: fallback.sukuyoCompatibility.direction,
          strengths: parsed.sukuyoCompatibility?.strengths?.length ? parsed.sukuyoCompatibility.strengths : fallback.sukuyoCompatibility.strengths,
          cautions: parsed.sukuyoCompatibility?.cautions?.length ? parsed.sukuyoCompatibility.cautions : fallback.sukuyoCompatibility.cautions,
          adviceKeywords: parsed.sukuyoCompatibility?.adviceKeywords?.length ? parsed.sukuyoCompatibility.adviceKeywords : fallback.sukuyoCompatibility.adviceKeywords,
        }
      : parsed.sukuyoCompatibility,
    emotionAnalysis: parsed.emotionAnalysis?.length ? parsed.emotionAnalysis : fallback.emotionAnalysis,
    yeoniReading: {
      ...fallback.yeoniReading,
      ...(parsed.yeoniReading || {}),
    },
    synthesis: {
      ...fallback.synthesis,
      ...(parsed.synthesis || {}),
    },
    choiceSimulation: parsed.choiceSimulation?.length ? parsed.choiceSimulation.slice(0, 3) : fallback.choiceSimulation,
    luckyKeywords: parsed.luckyKeywords?.length ? parsed.luckyKeywords : fallback.luckyKeywords,
  };
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function assertText(value: unknown, label: string) {
  if (!textValue(value)) throw new Error(`fortune tea house quality failed: ${label}`);
}

function assertNoMechanicalCopy(result: FortuneTeaHouseConsultResponse) {
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

function collectSajuConsultText(result: FortuneTeaHouseConsultResponse) {
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

function hasRepeatedLongBlock(text: string) {
  const blocks = text
    .split(/\n+/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 80);
  const seen = new Set<string>();
  for (const block of blocks) {
    if (seen.has(block)) return true;
    seen.add(block);
  }
  return false;
}

function assertSajuDeepQuality(result: FortuneTeaHouseConsultResponse, fallback: FortuneTeaHouseConsultResponse) {
  const rule = resolveSajuCategoryRule(fallback);
  const requiredSectionTitles = getSajuRequiredSectionTitles(fallback);
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
  const joined = collectSajuConsultText(result);
  const compactLength = joined.replace(/\s/g, "").length;
  if (compactLength < getSajuMinResultChars(fallback)) {
    throw new Error(`fortune tea house quality failed: saju length ${compactLength}`);
  }
  if (SYSTEM_COPY_PATTERN.test(joined)) {
    throw new Error("fortune tea house quality failed: saju system copy");
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
  const missingCategoryTerms = rule.requiredTerms.filter((term) => !joined.includes(term));
  if (missingCategoryTerms.length) {
    throw new Error(`fortune tea house quality failed: saju category terms ${missingCategoryTerms.join(",")}`);
  }
  if (hasRepeatedLongBlock(joined)) {
    throw new Error("fortune tea house quality failed: saju repeated block");
  }
}

function assertConsultQuality(result: FortuneTeaHouseConsultResponse, fallback: FortuneTeaHouseConsultResponse) {
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
    }
  }
  if (!Array.isArray(result.emotionAnalysis) || result.emotionAnalysis.length < 4) {
    throw new Error("fortune tea house quality failed: emotionAnalysis");
  }
  result.emotionAnalysis.forEach((item, index) => {
    assertText(item.label, `emotionAnalysis.${index}.label`);
    assertText(item.description, `emotionAnalysis.${index}.description`);
    if (!Number.isFinite(Number(item.value)) || Number(item.value) < 0 || Number(item.value) > 100) {
      throw new Error("fortune tea house quality failed: emotion value");
    }
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
  if (fallback.consultationMode === "saju") {
    assertSajuDeepQuality(result, fallback);
  }
  assertNoMechanicalCopy(result);
}

function buildSystemPrompt() {
  return [
    "너는 운명의 찻집 주인 연이다.",
    "연이는 꽃돼지?의 인간형이며, 사용자의 고민을 찻잔과 손님이 고른 상담 방식의 상징으로 읽어주는 따뜻한 상담사다.",
    "상담자는 변신 후의 인간 상담사 연이다. 꽃돼지?는 변신 전 안내자이자 연이의 본모습일 뿐, 결과 상담을 진행하지 않는다.",
    "사용자는 타로, 사주, 숙요점 궁합 중 하나만 선택한다. consultationMode가 tarot이면 타로만, saju이면 사주만, sukuyo이면 숙요점 궁합만 상담의 근거로 삼는다.",
    ...baseSajuSystemPrompt,
    ...sajuSafetyRules,
    "사주 상담에서 사주 데이터가 부족하면 지어내지 말고 확인된 출생정보와 질문 안에서만 말한다.",
    "타로 상담에서는 사주를 근거처럼 말하지 않는다. 사주 상담에서는 타로 카드나 카드 상징을 상담 근거처럼 말하지 않는다.",
    "전달받은 타로 cardId, cardName, orientation, keywords, meaning만 사용한다. 다른 카드 의미를 섞지 않고 cardId와 orientation을 절대 바꾸지 않는다.",
    "전달받은 십성만 사용한다. primaryTenGod이 없으면 십성 손님을 새로 만들지 않는다.",
    "숙요점 궁합에서는 전달받은 27숙, 관계 유형, 거리, 방향, 오행 조화, 영역 점수, 키워드만 사용한다. 없는 숙요 계산값과 상대의 속마음은 만들지 않는다.",
    "100% 단정, 공포 조장, 의료/법률/금융 판단 단정, 상대방 악인 단정, 현실 판단 포기 유도는 금지한다.",
    "같은 주어 반복을 피하고, 전문적이지만 다정한 한국어 상담 문장으로 쓴다.",
    "반드시 JSON만 반환한다. 마크다운과 JSON 바깥 설명은 금지한다.",
  ].join("\n");
}

function buildUserPrompt(request: FortuneTeaHouseConsultRequest, fallback: FortuneTeaHouseConsultResponse) {
  const consultationMode = request.consultationMode === "saju" ? "saju" : request.consultationMode === "sukuyo" ? "sukuyo" : "tarot";
  const sajuRule = resolveSajuCategoryRule(request);
  const requiredSajuSections = getSajuRequiredSectionTitles(request);
  const sajuFactInput = consultationMode === "saju" ? buildSajuFactInput(request, fallback.saju, sajuRule) : undefined;
  const focusRule =
    consultationMode === "saju"
      ? `사주 상담만 작성한다. ${sajuRule.category} 카테고리의 관점으로만 쓴다. 상담 컨셉은 "${sajuRule.concept}"이다. 기존 사주 초안, 오행, 십성, 출생정보 안에서 확인되는 흐름만 말하고 타로 카드는 상담 근거로 쓰지 않는다. 우선 해석 렌즈는 ${sajuRule.focus.join(", ")}이다.`
      : consultationMode === "sukuyo"
        ? "숙요점 궁합 상담만 작성한다. 전달받은 기본 숙요점 계산 데이터인 27숙, 방향별 관계, 거리, 오행 조화, 영역 점수, 관계 맥락만 말하고 타로 카드와 사주 오행·십성은 상담 근거로 쓰지 않는다."
      : "타로 상담만 작성한다. 보존된 카드의 cardId, 방향, 키워드, 의미를 바꾸지 말고 현재 질문에 대한 카드 해석만 짧고 밀도 있게 쓴다.";
  return JSON.stringify(
    {
      task: "운명의 찻집 상담 결과를 더 자연스럽고 깊게 다듬는다.",
      consultationMode,
      focusRule,
      preserveExactly: {
        teaCup: fallback.teaCup,
        sajuAvailability: fallback.saju.available,
        tarotSpread: fallback.tarotSpread,
        tarotSpreadCards: fallback.tarotSpreadCards,
        tarot: {
          cardId: fallback.tarot.cardId,
          number: fallback.tarot.number,
          nameKo: fallback.tarot.nameKo,
          nameEn: fallback.tarot.nameEn,
          orientation: fallback.tarot.orientation,
          keywords: fallback.tarot.keywords,
          meaning: fallback.tarot.meaning,
        },
        sukuyoCompatibility: fallback.sukuyoCompatibility,
      },
      request,
      sajuFactInput,
      sajuQualityRule: consultationMode === "saju"
        ? {
            category: sajuRule.category,
            resultKey: sajuRule.resultKey,
            minimumKoreanChars: getSajuMinResultChars(request),
            requiredDeepSections: requiredSajuSections,
            categorySchema: sajuResultSchemaByCategory[sajuRule.id],
            sectionRule: "saju.deepSections는 위 제목을 정확히 title로 쓰고, 각 body는 실제 입력값·일간·오행·십성·현재 운의 흐름·질문을 연결한 자연스러운 상담 문장으로 충분히 길게 작성한다.",
            noGenericAdvice: ["노력하면 좋아집니다", "긍정적으로 생각하세요", "대화가 중요합니다", "균형을 잡는 것이 필요합니다"],
            birthTimeUnknownRule: "출생시간이 없거나 birthTimeUnknown이 true이면 세부 시주 해석 제한을 명시하고, 생년월일 중심의 큰 흐름으로 말한다.",
            stateGaugeRule: "emotionAnalysis는 감정 분석이 아니라 선택된 찻잔의 상태 게이지로 쓴다. label은 categoryGaugeLabels 중에서만 사용하고, description에는 일간·오행·십성 중 최소 하나의 근거를 붙인다.",
            categoryGaugeLabels: sajuRule.gauges.map(([label]) => label),
            partnerRule: "partnerProfile이 없으면 상대 마음, 궁합, 상대 명식을 단정하지 말고 내 사주 기준의 관계 흐름으로 제한한다.",
          }
        : undefined,
      draftResult: fallback,
      outputSchema: {
        consultationMode: "preserve",
        sessionTitle: "string",
        questionSummary: "string",
        teaCup: "preserve",
        saju: consultationMode === "saju"
          ? `available/title/summary/keyPoints preserve/birthSummary preserve/dayMaster preserve/pillars preserve/fiveElements preserve/primaryTenGod preserve/secondaryTenGods preserve/deepSections required with exact category titles for ${sajuRule.resultKey}/cautionReading preserve/actionPrescription preserve/oneLineAdvice/tenGodSnapshot preserve`
          : "available/title/summary/keyPoints/caution/primaryTenGod preserve/secondaryTenGods preserve/tenGodSnapshot preserve",
        tarot: "preserve card fields, improve only reading",
        tarotSpread: "preserve",
        tarotSpreadCards: "preserve",
        sukuyoCompatibility: "preserve user/partner/calculationBasis/relationDetail/relation/distance/scores/elementHarmony/index fields, improve only title/summary/strengths/cautions/adviceKeywords",
        emotionAnalysis: "4 items with label/value/description/tone",
        yeoniReading: "intro/main/advice/caution",
        synthesis: "title/summary/sajuTarotBridge",
        choiceSimulation: consultationMode === "saju" ? "3-4 category-specific practical choices; include the plan window named in saju.deepSections" : "3 choices",
        actionPrescription: "string",
        luckyKeywords: "string[]",
        closingLine: "string",
      },
    },
    null,
    2,
  );
}

export async function generateFortuneTeaHouseConsultGeneration(request: FortuneTeaHouseConsultRequest, env?: Record<string, unknown>): Promise<FortuneTeaHouseConsultGeneration> {
  const fallback = prepareSajuFallback(buildFortuneTeaHouseConsultResult(request), request);
  if (!hasLlmKey(env)) {
    return {
      result: fallback,
      generationMeta: {
        mode: "local_fallback",
        reason: "missing_gemini_key",
        generatedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const response = await callLLM({
      systemPrompt: buildSystemPrompt(),
      prompt: buildUserPrompt(request, fallback),
      taskType: "fortune",
      temperature: 0.62,
      maxTokens: request.consultationMode === "saju" ? 12000 : 7600,
      timeoutMs: 75_000,
      fallbackToWorkersAI: false,
      responseMimeType: "application/json",
    }, env);
    const parsed = extractJson(response.text) as Partial<FortuneTeaHouseConsultResponse>;
    const result = ensureConsultResultConsistency(mergeLlmResult(fallback, parsed), tarotSnapshotFromResult(fallback));
    assertConsultQuality(result, fallback);
    return {
      result,
      generationMeta: {
        mode: "gemini",
        provider: response.provider,
        model: response.model,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.warn("[fortune-tea-house/consult] LLM fallback used", error);
    return {
      result: fallback,
      generationMeta: {
        mode: "local_fallback",
        reason: error instanceof Error ? error.message : "llm_failed",
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export async function generateFortuneTeaHouseConsultResult(request: FortuneTeaHouseConsultRequest): Promise<FortuneTeaHouseConsultResponse> {
  const generated = await generateFortuneTeaHouseConsultGeneration(request);
  return generated.result;
}
