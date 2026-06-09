import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { callGeminiText } from "../lib/gemini.js";
import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "../../lib/tarot/tarot-cards.mjs";
import { buildMindscanReadingPayload } from "../../lib/tarot/mindscan-reading.mjs";
import { buildLoveConsultingHighlights, normalizeLoveReadingPayload } from "../../lib/tarot/love-reading-normalizer.mjs";
import { expectedCardCount, listSpreadIds, normalizeSpreadType, getSpreadDefinition } from "../../lib/tarot/spreads.mjs";
import {
  buildGeminiPrompt,
  buildFallbackInterpretation,
  buildNumerologyContext,
  normalizeCardInput,
  normalizeInterpretation,
  normalizeTopic,
  parseJsonCandidate,
  selectCards,
  validateNumerologyTarotQuality,
} from "../../lib/tarot/numerology-tarot.mjs";
import {
  TarotInterpretationError,
  buildConsultingHighlights,
  buildLegacyReadingPayload,
  drawTarotCardsForSpread,
  inferQuestionType,
  interpretTarotReading,
  normalizeDrawnCardsForSpread,
} from "../../lib/tarot/tarot-interpretation-engine.mjs";

function asText(value) {
  return String(value || "").trim();
}

function reinforceNumerologyInterpretation(interpretation, fallback) {
  const fallbackCards = Array.isArray(fallback?.cardReadings) ? fallback.cardReadings : [];
  const currentCards = Array.isArray(interpretation?.cardReadings) ? interpretation.cardReadings : [];

  return {
    ...interpretation,
    numerologyReading: `${fallback?.numerologyReading || ""} ${interpretation?.numerologyReading || ""}`.trim(),
    coreMessage: `${fallback?.coreMessage || ""} ${interpretation?.coreMessage || ""}`.trim(),
    topicReading: {
      ...(interpretation?.topicReading || {}),
      ...(fallback?.topicReading || {}),
    },
    categoryDeepDive: {
      ...(interpretation?.categoryDeepDive || {}),
      ...(fallback?.categoryDeepDive || {}),
    },
    cardReadings: currentCards.map((card, idx) => ({
      ...(fallbackCards[idx] || {}),
      ...card,
      cardMeaning: (fallbackCards[idx]?.cardMeaning || card?.cardMeaning || "").trim(),
      numerologyBridge: (fallbackCards[idx]?.numerologyBridge || card?.numerologyBridge || "").trim(),
      topicInterpretation: (fallbackCards[idx]?.topicInterpretation || card?.topicInterpretation || "").trim(),
      hiddenPattern: (fallbackCards[idx]?.hiddenPattern || card?.hiddenPattern || "").trim(),
      actionTip: (fallbackCards[idx]?.actionTip || card?.actionTip || "").trim(),
      caution: (fallbackCards[idx]?.caution || card?.caution || "").trim(),
    })),
    conclusion: {
      ...(interpretation?.conclusion || {}),
      ...(fallback?.conclusion || {}),
      summary: `${fallback?.conclusion?.summary || ""} ${interpretation?.conclusion?.summary || ""}`.trim(),
      finalWord: `${fallback?.conclusion?.finalWord || ""} ${interpretation?.conclusion?.finalWord || ""}`.trim(),
    },
  };
}

const CRYSTAL_MEANINGS = {
  "tigers-eye": {
    id: "tigers-eye",
    nameKo: "호안석",
    nameEn: "Tiger's Eye",
    categoryAffinity: ["wealth", "career", "move"],
    keywords: ["결단", "보호", "현실 판단", "사업 감각"],
    meaning: "감정 과열을 낮추고 흔들린 판단을 기준의 빛으로 가라앉히는 원석입니다.",
    adviceTone: "기준을 정하고 실행",
    cautionTone: "승부욕 과열 경계",
  },
  "rose-quartz": {
    id: "rose-quartz",
    nameKo: "로즈 쿼츠",
    nameEn: "Rose Quartz",
    categoryAffinity: ["love", "reunion", "relation"],
    keywords: ["애정", "치유", "수용", "관계 회복"],
    meaning: "자기방어로 굳은 감정을 부드럽게 풀고 대화의 온도를 회복시키는 원석입니다.",
    adviceTone: "감정 표현의 진정성",
    cautionTone: "감정 의존 경계",
  },
  amethyst: {
    id: "amethyst",
    nameKo: "애머지스트",
    nameEn: "Amethyst",
    categoryAffinity: ["reunion", "health", "relation"],
    keywords: ["통찰", "정화", "직관", "균형"],
    meaning: "복잡한 감정과 생각을 정리해 핵심 진실을 보게 하는 원석입니다.",
    adviceTone: "본질 파악 후 행동",
    cautionTone: "고립적 판단 경계",
  },
  citrine: {
    id: "citrine",
    nameKo: "시트린",
    nameEn: "Citrine",
    categoryAffinity: ["wealth", "move", "health"],
    keywords: ["풍요", "활력", "자기표현", "기회"],
    meaning: "작은 활력을 깨워 기회와 자신감의 빛을 다시 밝히는 원석입니다.",
    adviceTone: "작은 실행의 축적",
    cautionTone: "낙관 과신 경계",
  },
  lapis: {
    id: "lapis",
    nameKo: "라피스 라줄리",
    nameEn: "Lapis Lazuli",
    categoryAffinity: ["wealth", "career", "move"],
    keywords: ["통찰", "전략", "진실", "판단력"],
    meaning: "겉으로 보이지 않는 패턴을 읽어 장기 전략으로 연결하게 돕는 원석입니다.",
    adviceTone: "구조를 읽는 전략",
    cautionTone: "분석 마비 경계",
  },
  "black-tourmaline": {
    id: "black-tourmaline",
    nameKo: "블랙 토르말린",
    nameEn: "Black Tourmaline",
    categoryAffinity: ["relation", "health", "move"],
    keywords: ["보호", "경계", "정리", "차단"],
    meaning: "불필요한 소모와 외부 잡음을 걸러내 관계와 에너지 경계를 세우게 하는 원석입니다.",
    adviceTone: "경계 설정과 정리",
    cautionTone: "과도한 단절 경계",
  },
  "green-fluorite": {
    id: "green-fluorite",
    nameKo: "그린 플로라이트",
    nameEn: "Green Fluorite",
    categoryAffinity: ["career", "health", "wealth"],
    keywords: ["정리", "균형", "회복", "판단 정돈"],
    meaning: "흩어진 선택지를 구조화해 우선순위를 세우고 회복 루틴을 만들게 하는 원석입니다.",
    adviceTone: "정돈 후 집중 실행",
    cautionTone: "과도한 검토 지연 경계",
  },
};

const CRYSTAL_BY_NAME = Object.values(CRYSTAL_MEANINGS).reduce((acc, item) => {
  acc[item.nameKo] = item;
  return acc;
}, {});

const CATEGORY_DEFS = {
  overall: {
    id: "overall",
    name: "전체 흐름 · 오늘의 메시지",
    spread: [
      { order: 1, title: "오늘의 핵심 기운", question: "오늘 가장 먼저 느껴야 할 흐름은 무엇인가?" },
      { order: 2, title: "지금 눈앞의 주제", question: "지금 즉시 다뤄야 할 중심 문제는 무엇인가?" },
      { order: 3, title: "흐름을 막는 요소", question: "에너지 흐름을 흔드는 변수는 무엇인가?" },
      { order: 4, title: "오늘의 선택", question: "오늘 어떤 태도와 선택이 도움이 되는가?" },
      { order: 5, title: "마무리 메시지", question: "오늘의 흐름이 남기는 최종 메시지는 무엇인가?" },
    ],
    focus: "전체 흐름, 방향 전환, 오늘의 우선순위를 한 번에 정리합니다.",
  },
  wealth: {
    id: "wealth",
    name: "재물 · 사업",
    spread: [
      { order: 1, title: "현재 재물운", question: "지금 돈과 사업의 흐름은 어떤 상태인가?" },
      { order: 2, title: "기회·가능성", question: "어디에서 수익과 성장의 기회가 열리는가?" },
      { order: 3, title: "방해 요소", question: "돈의 흐름을 막는 습관이나 외부 변수는 무엇인가?" },
      { order: 4, title: "조언의 방향", question: "현실적으로 어떤 선택을 해야 하는가?" },
      { order: 5, title: "최종 결과", question: "이 흐름이 어떤 재물·사업 결과로 이어질 가능성이 큰가?" },
    ],
    focus: "수익 구조, 지출, 계약, 경쟁, 리스크를 숫자 기반 실행으로 연결합니다.",
  },
  love: {
    id: "love",
    name: "연애 · 감정",
    spread: [
      { order: 1, title: "현재 감정 상태", question: "내 마음 또는 관계의 감정 온도는 어떤가?" },
      { order: 2, title: "상대 또는 인연의 기류", question: "상대나 인연의 에너지는 어떻게 흐르는가?" },
      { order: 3, title: "감정의 방해 요소", question: "사랑을 어렵게 만드는 내면의 패턴은 무엇인가?" },
      { order: 4, title: "마음의 조언", question: "지금 어떤 태도로 사랑을 바라봐야 하는가?" },
      { order: 5, title: "관계의 가능성", question: "앞으로 감정 흐름은 어디로 향하는가?" },
    ],
    focus: "끌림, 불안, 표현 방식, 관계의 균형을 감정 언어로 해석합니다.",
  },
  reunion: {
    id: "reunion",
    name: "재회 · 인연",
    spread: [
      { order: 1, title: "남아 있는 인연의 온도", question: "두 사람 사이에 아직 남은 감정은 무엇인가?" },
      { order: 2, title: "상대의 숨은 마음", question: "상대가 겉으로 드러내지 않는 속마음은 무엇인가?" },
      { order: 3, title: "재회를 막는 이유", question: "다시 이어지기 어려운 핵심 원인은 무엇인가?" },
      { order: 4, title: "다가갈 방법", question: "지금 내가 취해야 할 태도는 무엇인가?" },
      { order: 5, title: "재회 가능성", question: "이 인연은 다시 연결될 가능성이 있는가?" },
    ],
    focus: "미련, 거리감, 오해, 재접근 조건을 현실적인 소통 기준으로 정리합니다.",
  },
  move: {
    id: "move",
    name: "이동수 · 변화",
    spread: [
      { order: 1, title: "현재 변화의 기운", question: "지금 내 삶은 움직일 준비가 되어 있는가?" },
      { order: 2, title: "이동의 기회", question: "이사, 여행, 환경 변화의 좋은 흐름은 어디에 있는가?" },
      { order: 3, title: "변화를 막는 요소", question: "움직임을 지연시키는 현실적·심리적 이유는 무엇인가?" },
      { order: 4, title: "움직임의 조언", question: "지금은 기다려야 하는가, 움직여야 하는가?" },
      { order: 5, title: "변화 이후의 흐름", question: "움직인 뒤 삶은 어떤 방향으로 바뀌는가?" },
    ],
    focus: "타이밍, 준비도, 환경 변수, 이동 후 정착 전략을 함께 점검합니다.",
  },
  career: {
    id: "career",
    name: "직업 · 진로",
    spread: [
      { order: 1, title: "현재 직업운", question: "현재 일과 진로의 에너지는 어떤가?" },
      { order: 2, title: "성장 가능성", question: "어떤 방향에서 커리어 기회가 열리는가?" },
      { order: 3, title: "진로의 장애물", question: "내 직업 흐름을 막는 가장 큰 요인은 무엇인가?" },
      { order: 4, title: "선택의 조언", question: "지금 어떤 선택과 준비가 필요한가?" },
      { order: 5, title: "진로의 결과", question: "이 흐름은 어떤 커리어 결과로 이어지는가?" },
    ],
    focus: "이직, 직무 적합성, 성장 포인트, 평가 구조를 실행 계획으로 연결합니다.",
  },
  health: {
    id: "health",
    name: "건강 · 에너지",
    spread: [
      { order: 1, title: "현재 에너지 상태", question: "몸과 마음의 에너지는 어떤 상태인가?" },
      { order: 2, title: "회복 가능성", question: "어디에서 회복의 힘이 생기는가?" },
      { order: 3, title: "에너지 소모 원인", question: "나를 지치게 만드는 핵심 원인은 무엇인가?" },
      { order: 4, title: "몸과 마음의 조언", question: "지금 어떤 회복 방식이 필요한가?" },
      { order: 5, title: "회복의 흐름", question: "앞으로 에너지는 어떻게 회복될 가능성이 큰가?" },
    ],
    focus: "의료 진단이 아닌 생활 리듬, 휴식, 스트레스 조절 중심으로 안내합니다.",
  },
  relation: {
    id: "relation",
    name: "대인관계",
    spread: [
      { order: 1, title: "현재 관계의 기류", question: "주변 인간관계의 에너지는 어떤가?" },
      { order: 2, title: "도움이 되는 인연", question: "나에게 힘이 되는 사람이나 관계는 무엇인가?" },
      { order: 3, title: "갈등의 씨앗", question: "관계를 어렵게 만드는 말, 태도, 오해는 무엇인가?" },
      { order: 4, title: "관계 조율의 조언", question: "어떻게 말하고 행동해야 관계가 정리되는가?" },
      { order: 5, title: "관계의 최종 흐름", question: "이 인간관계는 어떤 방향으로 흘러갈 가능성이 큰가?" },
    ],
    focus: "신뢰, 경계, 대화 온도, 협력의 균형점을 실천 중심으로 제시합니다.",
  },
};

const CATEGORY_VOICES = {
  overall: {
    summaryLead: "오늘의 기운을 한 장으로 묶어 방향을 정리하는 흐름입니다.",
    pulse: "전체 판을 먼저 보고, 지금 가장 중요한 한 가지를 정리하는 태도가 유리합니다.",
    caution: "여러 신호를 한꺼번에 잡으려다 오히려 중심을 놓치는 것을 조심해야 합니다.",
    uplift: "원석의 안정감으로 생각을 정돈하고, 카드가 지목한 핵심만 먼저 실행하면 됩니다.",
    neo: "지금은 많이 움직이는 것보다, 제대로 고르는 것이 더 큰 힘이 됩니다.",
    youn: "당신은 이미 흐름을 느끼고 있어요. 오늘은 그 감각을 믿고 한 걸음만 또렷하게 내디디면 충분합니다.",
    action: [
      "오늘 가장 먼저 처리할 일 1개를 정하고 나머지는 뒤로 미룹니다.",
      "불안이 올라오는 순간, 결정 기준을 한 줄로 적어 다시 확인합니다.",
      "저녁 전에 실제로 실행한 행동 1개를 기록해 흐름을 남깁니다.",
    ],
    crystalHook: "전체 흐름을 정돈하고 중심을 잡는 힘",
  },
  wealth: {
    summaryLead: "재물운은 숫자와 조건을 다시 맞추는 구간입니다.",
    pulse: "지출, 계약, 수익 구조가 함께 움직이니 감정이 아니라 계산이 우선입니다.",
    caution: "확인되지 않은 제안, 즉흥 지출, 과한 기대를 동시에 조심해야 합니다.",
    uplift: "원석의 현실 감각을 빌려 수익과 비용을 분리하면 흐름이 또렷해집니다.",
    neo: "지금은 벌 수 있느냐보다, 지켜 낼 수 있느냐가 더 중요합니다.",
    youn: "당신의 판단은 충분히 섬세해요. 숫자를 적고 비교하면 마음도 함께 안정됩니다.",
    action: [
      "이번 주 들어갈 돈과 멈출 돈을 각각 한 줄씩 적습니다.",
      "제안이 오면 바로 답하지 말고 조건표를 먼저 확인합니다.",
      "수익과 비용을 분리한 메모를 남겨 선택 기준을 숫자로 바꿉니다.",
    ],
    crystalHook: "수익 구조를 보호하고 현실 판단을 돕는 힘",
  },
  love: {
    summaryLead: "연애운은 마음의 온도와 표현 방식이 핵심입니다.",
    pulse: "감정은 살아 있지만, 말하지 않은 부분이 관계의 온도를 흔들고 있습니다.",
    caution: "서운함을 마음속에만 쌓아 두거나, 반대로 급하게 확인하려는 태도를 조심하세요.",
    uplift: "원석의 부드러운 힘으로 마음을 풀고, 카드가 보여 준 속도를 존중하면 됩니다.",
    neo: "사랑은 감정을 숨기는 게임이 아니라, 필요한 말을 예쁘게 꺼내는 기술입니다.",
    youn: "당신이 먼저 부드러워지면 관계도 따라옵니다. 오늘은 따뜻한 한 문장이 회복의 시작이에요.",
    action: [
      "상대에게 보내고 싶은 말을 한 번 고쳐 읽고 짧게 정리합니다.",
      "감정 확인보다 먼저, 지금 필요한 것은 공감인지 경계인지 구분합니다.",
      "대화가 필요하면 메시지보다 먼저 시간과 분위기를 맞춥니다.",
    ],
    crystalHook: "감정을 안정시키고 관계의 온도를 회복하는 힘",
  },
  reunion: {
    summaryLead: "재회운은 미련보다 조건을 먼저 보는 흐름입니다.",
    pulse: "남은 감정은 분명하지만, 다시 가까워지기 위한 전제가 아직 정리되지 않았습니다.",
    caution: "상대의 속도와 준비를 무시한 재접근은 같은 상처를 반복할 수 있습니다.",
    uplift: "원석의 통찰로 감정과 현실을 분리하면, 다시 닿아도 안전한 거리가 더 선명해집니다.",
    neo: "재회는 감정이 남아 있는 것만으로 성사되지 않습니다. 조건과 태도가 함께 맞아야 합니다.",
    youn: "서로를 다그치기보다, 필요한 시간을 인정할수록 인연은 더 분명하게 드러나요.",
    action: [
      "상대에게 원하는 것을 한 줄로 적고, 그것이 현실 가능한지 확인합니다.",
      "연락을 시도하기 전 현재 관계의 경계선을 먼저 정리합니다.",
      "재회를 바라는 이유가 그리움인지, 실제 회복인지 구분합니다.",
    ],
    crystalHook: "흐려진 감정을 정리하고 재접근의 조건을 읽는 힘",
  },
  move: {
    summaryLead: "이동과 변화는 타이밍과 준비가 맞아야 부드럽게 열립니다.",
    pulse: "환경을 바꾸고 싶은 마음은 분명하지만, 지금은 동선과 조건을 함께 맞춰야 합니다.",
    caution: "움직이고 싶은 마음만 앞세우면 준비 부족이 뒤따를 수 있습니다.",
    uplift: "원석의 전략성을 활용해 이동 후의 생활까지 계산하면 변화가 훨씬 안전합니다.",
    neo: "이동의 핵심은 빨리 가는 것이 아니라, 도착한 뒤 버틸 수 있게 준비하는 것입니다.",
    youn: "조금 천천히 가도 괜찮아요. 제대로 옮겨 놓는 선택이 결국 마음을 편하게 합니다.",
    action: [
      "이동 전에 비용, 거리, 일정, 생활 변수를 각각 따로 적습니다.",
      "즉흥 결정 대신 1주일 뒤의 현실 조건까지 함께 살펴봅니다.",
      "새 환경에서 지켜야 할 루틴 1개를 먼저 정해 둡니다.",
    ],
    crystalHook: "변화의 방향을 읽고 준비를 현실화하는 힘",
  },
  career: {
    summaryLead: "직업운은 실력과 보이게 되는 방식이 함께 움직입니다.",
    pulse: "지금 필요한 것은 버티기보다 정리된 방향성입니다. 무엇을 잘하는지가 더 분명해져야 합니다.",
    caution: "과한 비교, 무작정 이동, 평가 기준을 모르는 상태의 선택을 조심하세요.",
    uplift: "원석의 정리력으로 역할과 강점을 선명하게 만들면 커리어 흐름이 살아납니다.",
    neo: "커리어는 운이 아니라 구조입니다. 구조를 읽는 순간 결과도 바뀝니다.",
    youn: "당신은 이미 성장 중이에요. 오늘은 스스로의 강점을 다시 적어 두는 것만으로도 충분합니다.",
    action: [
      "지금 맡은 일에서 성과로 연결되는 지점을 하나만 골라 정리합니다.",
      "이직이나 변화가 필요하면 기준 3개를 먼저 적어 비교합니다.",
      "오늘 끝낼 수 있는 업무 1개를 마감해 흐름을 눈에 보이게 만듭니다.",
    ],
    crystalHook: "우선순위를 정돈하고 성장 방향을 선명하게 만드는 힘",
  },
  health: {
    summaryLead: "건강운은 몸보다 먼저 생활 리듬과 감정 피로를 살펴야 합니다.",
    pulse: "회복은 한 번에 오는 것이 아니라, 쉬는 방식과 스트레스의 패턴을 바꾸면서 생깁니다.",
    caution: "무리한 버티기, 수면 부족, 감정 소모를 가볍게 넘기지 마세요.",
    uplift: "원석의 회복 기운을 빌려 생활 루틴을 정리하면 에너지가 다시 모입니다.",
    neo: "몸은 늘 먼저 신호를 보냅니다. 늦게 알아차리기 전에 패턴을 바꾸는 것이 좋습니다.",
    youn: "쉬는 것도 기술이에요. 조금만 정돈하면 생각보다 빨리 숨이 돌아옵니다.",
    action: [
      "오늘 잠들기 전 화면 시간을 30분만 줄입니다.",
      "피로를 키우는 일을 하나 골라 잠시 멈춥니다.",
      "식사, 물, 호흡 중 하나를 먼저 정리해 몸의 리듬을 되돌립니다.",
    ],
    crystalHook: "에너지를 보호하고 회복 루틴을 만들게 하는 힘",
  },
  relation: {
    summaryLead: "대인관계는 신뢰와 경계의 균형을 다시 맞추는 흐름입니다.",
    pulse: "사람 사이의 온도는 맞지만, 말의 방식과 기준이 조금씩 엇갈리고 있습니다.",
    caution: "모두에게 맞추려다 지치거나, 경계를 너무 늦게 세우는 것을 조심하세요.",
    uplift: "원석의 보호 기운을 활용하면 관계를 지키면서도 소모를 줄일 수 있습니다.",
    neo: "좋은 관계는 참는 관계가 아니라, 서로의 선을 존중하는 관계입니다.",
    youn: "당신은 이미 잘 버티고 있어요. 이제는 모든 사람을 살피기보다, 나를 지키는 기준도 챙겨야 합니다.",
    action: [
      "이번 주에 꼭 지켜야 할 관계의 경계를 한 문장으로 적습니다.",
      "불편한 대화는 문자보다 시간과 맥락을 먼저 맞춥니다.",
      "도움이 되는 사람과 소모되는 사람을 나누어 관계 에너지를 점검합니다.",
    ],
    crystalHook: "소모를 막고 관계의 경계를 세우는 힘",
  },
};

function getCategoryVoice(categoryId) {
  return CATEGORY_VOICES[categoryId] || CATEGORY_VOICES.overall;
}

const CARD_MEANING_OVERRIDES = {
  "Five of Pentacles": "결핍감, 재정 압박, 소외감, 부족함에 대한 두려움",
  "Five of Wands": "경쟁, 충돌, 실력 겨루기, 시장의 소란, 의견 차이",
  "Page of Cups": "순수한 감정, 상상력, 미숙한 제안, 감정적 기대",
  Temperance: "균형, 조율, 절제, 혼합, 속도 조절",
  "Ace of Pentacles": "새로운 현실 기회, 돈의 씨앗, 사업의 시작, 실질적 기반",
};

function hashSeed(text) {
  const base = String(text || "");
  let hash = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function resolveOrientation(cardName, idx, provided) {
  const explicit = Array.isArray(provided) ? provided[idx] : "";
  if (explicit === "upright" || explicit === "reversed") return explicit;
  const seed = hashSeed(`${cardName}:${idx}`);
  return seed % 4 === 0 ? "reversed" : "upright";
}

function findCrystalByAssignment(idx, body = {}, fallbackGemName = "") {
  const assignment = body?.assignments && typeof body.assignments === "object" ? body.assignments : {};
  const gemId = asText(assignment[idx]);
  if (gemId && CRYSTAL_MEANINGS[gemId]) return CRYSTAL_MEANINGS[gemId];
  if (fallbackGemName && CRYSTAL_BY_NAME[fallbackGemName]) return CRYSTAL_BY_NAME[fallbackGemName];
  return CRYSTAL_MEANINGS["green-fluorite"];
}

function cardSuite(cardName) {
  const name = asText(cardName);
  if (/Wands/i.test(name)) return "완드";
  if (/Cups/i.test(name)) return "컵";
  if (/Swords/i.test(name)) return "소드";
  if (/Pentacles/i.test(name)) return "펜타클";
  return "메이저";
}

function orientationMeaning(orientation) {
  if (orientation === "reversed") {
    return "역방향이므로 에너지가 막히거나 지연되며, 같은 문제가 반복될 가능성을 경고합니다.";
  }
  return "정방향이므로 흐름은 비교적 열려 있으며, 행동을 붙이면 현실 변화로 이어질 가능성이 큽니다.";
}

function buildCardMeaning(cardName, orientation, tarotKeywords = []) {
  const base = CARD_MEANING_OVERRIDES[cardName] || `${cardSuite(cardName)} 계열의 핵심 주제를 드러내는 카드로, 상황의 본질을 선명하게 보여줍니다.`;
  const keywordLine = tarotKeywords.length ? `핵심 키워드는 ${tarotKeywords.slice(0, 4).join(", ")}입니다.` : "";
  return `${base}. ${orientationMeaning(orientation)} ${keywordLine}`.trim();
}

const CRYSTAL_MASTER_CHAPTER_TITLES = [
  "첫 번째 문 · 오라의 입구",
  "두 번째 문 · 카드가 남긴 빛",
  "세 번째 문 · 아르카나와 숫자의 결",
  "네 번째 문 · 크리스탈 정화의 파동",
  "다섯 번째 문 · 현실에 내려앉는 선택",
  "여섯 번째 문 · 14~30일의 리추얼",
  "일곱 번째 문 · 봉인 오라클",
];

const MAJOR_ARCANA_NUMBERS = {
  "The Fool": 0,
  "The Magician": 1,
  "The High Priestess": 2,
  "The Empress": 3,
  "The Emperor": 4,
  "The Hierophant": 5,
  "The Lovers": 6,
  "The Chariot": 7,
  Strength: 8,
  "The Hermit": 9,
  "Wheel of Fortune": 10,
  Justice: 11,
  "The Hanged Man": 12,
  Death: 13,
  Temperance: 14,
  "The Devil": 15,
  "The Tower": 16,
  "The Star": 17,
  "The Moon": 18,
  "The Sun": 19,
  Judgement: 20,
  "The World": 21,
};

const MINOR_CARD_NUMBERS = {
  Ace: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5,
  Six: 6,
  Seven: 7,
  Eight: 8,
  Nine: 9,
  Ten: 10,
  Page: 11,
  Knight: 12,
  Queen: 13,
  King: 14,
};

function buildKeywordVisual(keywords = []) {
  const list = Array.isArray(keywords) ? keywords.filter(Boolean).slice(0, 4) : [];
  return `[빛의 단서: ${list.join(", ")}]`;
}

function tarotNumerologyInsight(cardNameEn) {
  const majorNo = MAJOR_ARCANA_NUMBERS[cardNameEn];
  if (Number.isFinite(majorNo)) {
    return `메이저 아르카나 ${majorNo}번의 상징이므로 삶의 큰 축을 재정렬하는 신호가 강합니다.`;
  }
  const parts = String(cardNameEn || "").split(" ");
  const head = parts[0];
  const number = MINOR_CARD_NUMBERS[head];
  if (Number.isFinite(number)) {
    return `마이너 아르카나 ${number} 수비학 파동이므로 구체적 생활 루틴과 행동 선택에 바로 반영하는 것이 중요합니다.`;
  }
  return "카드의 수비학 단서는 오늘의 선택을 작게 쪼개 실행하도록 안내합니다.";
}

function ensureTextLength(text, minLength = 220) {
  const value = asText(text);
  return value.length >= minLength ? value : "";
}

function hasGeminiKey(env = {}) {
  return Boolean(
    asText(env?.GEMINI_API_KEY) ||
    asText(env?.GOOGLE_API_KEY) ||
    asText(env?.GOOGLE_GENERATIVE_AI_API_KEY),
  );
}

function sanitizeCrystalSoulText(text) {
  return String(text || "")
    .replace(/[\t\r]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeRepeatedCrystalSoulPhrases(text) {
  const lines = String(text || "").split("\n");
  const seen = new Set();
  const kept = [];
  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) {
      kept.push(line);
      continue;
    }
    if (normalized.length >= 20) {
      if (seen.has(normalized)) continue;
      seen.add(normalized);
    }
    kept.push(line);
  }
  return kept.join("\n");
}

function uniqueSentenceList(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const text = asText(item);
    if (!text) continue;
    const normalized = text.replace(/[“”"'`]/g, "").replace(/\s+/g, " ").toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(text);
  }
  return result;
}

function buildVariedReadingLead(position, cardNameKo, orientation, categoryName, crystalName) {
  const orientationLabel = orientation === "reversed" ? "역방향" : "정방향";
  const templates = [
    `${position.title}에서는 ${cardNameKo} ${orientationLabel}의 흐름이 ${categoryName}의 첫 숨을 정리합니다.`,
    `${cardNameKo} ${orientationLabel}은 ${position.title}에서 지금 당장 손대야 할 우선순위를 드러냅니다.`,
    `${position.title}에 놓인 ${cardNameKo}는 ${crystalName}과 만나 감정과 현실의 접점을 다시 맞춥니다.`,
    `${categoryName} 전체에서 ${position.title} 자리는 흐름의 방향을 바꾸는 관문처럼 작동합니다.`,
    `${cardNameKo} ${orientationLabel}이 보여 주는 핵심은 ${position.title}에 맞는 행동 속도를 찾는 일입니다.`,
  ];
  return templates[(position.order - 1) % templates.length];
}

function buildCrystalSoulSection(cardName, crystal, position, category, orientation, idx) {
  const card = getTarotCardByAnyId(cardName);
  const cardNameKo = asText(card?.nameKo) || asText(cardName) || `카드 ${idx + 1}`;
  const cardNameEn = asText(card?.nameEn) || asText(cardName) || `Card ${idx + 1}`;
  const imageCandidates = card ? buildImageCandidates(card.code) : [];
  const tarotKeywords = Array.isArray(card?.keywords) && card.keywords.length
    ? card.keywords.slice(0, 5)
    : [cardSuite(cardName), orientation === "reversed" ? "지연" : "진행", "핵심 전환", "행동 필요"];

  const voice = getCategoryVoice(category.id);
  const cardMeaning = buildCardMeaning(cardNameEn, orientation, tarotKeywords);
  const cardLean = buildVariedReadingLead(position, cardNameKo, orientation, category.name, crystal.nameKo);
  const crystalMeaning = `${crystal.nameKo}는 ${crystal.meaning.replace(/입니다\.?$/, "")}. ${crystal.adviceTone} 쪽이 살고, ${crystal.cautionTone}는 잠시 낮춰야 합니다.`;
  const positionInterpretation = `${position.title}의 질문은 "${position.question}"입니다. 이 위치에 ${cardNameKo}가 들어왔다는 것은 ${category.focus}의 큰 흐름을 현실 선택으로 번역하라는 신호입니다.`;
  const oneLineSummary = `${cardLean} ${voice.crystalHook}`;
  const crystalEnergy = `${crystal.nameKo}의 ${crystal.keywords.slice(0, 3).join(" · ")} 파동은 ${category.name}의 흐름을 부드럽게 정리합니다. ${crystalMeaning}`;
  const cardFlow = `${cardMeaning} 따라서 이 카드는 "무엇을 더할지"보다 "무엇을 덜어낼지"를 분명하게 말합니다. ${position.title}는 지금의 판단이 어디로 향해야 하는지 알려 주는 좌표입니다.`;
  const currentPulse = `${orientation === "reversed" ? "지연과 재검토의 심리" : "전진과 확인의 심리"}가 동시에 떠오릅니다. 핵심 키워드 ${tarotKeywords.slice(0, 2).join(" · ")}를 기준으로 오늘의 감정을 한 문장으로 정리해 보세요.`;
  const caution = `${orientation === "reversed" ? "같은 실수를 설명만으로 넘기지 말고 중단 지점을 먼저 세워야 합니다." : "속도를 올리기보다 기준을 먼저 맞춰야 결과가 오래 갑니다."}`;
  const uplift = `${crystal.nameKo}의 기운은 ${category.name}에서 기준과 순서를 회복시키는 편입니다. ${voice.uplift} ${position.title}의 결론은 한 번에 바꾸는 것이 아니라, 오늘의 선택을 작게 바로잡는 데 있습니다.`;
  const practicalActions = uniqueSentenceList([...(Array.isArray(voice.action) ? voice.action : []), `${position.title}와 연결된 행동을 오늘 1개만 끝냅니다.`, `${crystal.nameKo}를 떠올리며 판단 기준을 1줄로 적습니다.`]).slice(0, 4);
  const opportunity = `${tarotKeywords.slice(0, 2).join(" · ")} 신호는 ${position.title}에서 작은 문을 엽니다. 이번 주에는 기대를 키우기보다 확인 가능한 단서 하나를 정해 조용히 움직여 보세요.`;
  const action = practicalActions.join(" / ");
  const neoLine = `네오: ${voice.neo}`;
  const younLine = `연이: ${voice.youn}`;
  const categoryReading = uniqueSentenceList([
    oneLineSummary,
    crystalEnergy,
    cardFlow,
    currentPulse,
    caution,
    uplift,
    `오늘의 의식: ${action}`,
    neoLine,
    younLine,
  ]).join(" ");

  return {
    order: position.order,
    positionTitle: position.title,
    question: position.question,
    cardNameKo,
    cardNameEn,
    cardImageUrl: imageCandidates[0] || "",
    orientation,
    crystalName: crystal.nameKo,
    crystalKeywords: crystal.keywords.slice(0, 5),
    tarotKeywords,
    keywordVisual: buildKeywordVisual(tarotKeywords),
    oneLineSummary,
    crystalEnergy,
    cardFlow,
    currentPulse,
    cardMeaning,
    crystalMeaning,
    positionInterpretation,
    categoryReading,
    opportunity,
    caution,
    uplift,
    practicalActions,
    action,
    neoLine,
    younLine,
  };
}

function buildCrystalSoulSummary(category, sections, coreCrystal) {
  const strongest = sections[2] || sections[0];
  const voice = getCategoryVoice(category.id);
  const practicalActions = uniqueSentenceList([
    voice.action[0],
    voice.action[1],
    voice.action[2],
    `${coreCrystal.nameKo}의 기운을 떠올리며 오늘의 선택 기준 1개를 메모에 남깁니다.`,
  ]);
  return {
    category: category.name,
    coreCrystal: coreCrystal.nameKo,
    overallFlow: `${category.name}의 5장 흐름은 초반 ${sections[0]?.positionTitle || "첫 번째 자리"}에서 감지된 시작점을, 중반 ${sections[2]?.positionTitle || "세 번째 자리"}에서 걸림을 확인하고, 후반 ${sections[4]?.positionTitle || "마지막 자리"}에서 실제 선택으로 마무리하도록 안내합니다. ${coreCrystal.nameKo}는 이 흐름을 한 줄로 묶기보다 단계별로 정돈하게 돕습니다.`,
    strongestSignal: `${strongest.cardNameKo}와 ${strongest.positionTitle}의 결합이 가장 선명한 신호입니다. ${strongest.oneLineSummary} 이 조합은 회피보다 확인, 감정보다 기준을 먼저 두라고 말합니다.`,
    opportunity: `${sections[1]?.positionTitle || "두 번째 자리"}에서는 ${sections[1]?.tarotKeywords.slice(0, 2).join(" · ")} 신호가 작은 가능성의 문으로 바뀝니다. 기대를 키우기보다 지금 할 수 있는 부드러운 실행으로 번역하는 편이 유리합니다.`,
    risk: `${sections[2]?.positionTitle || "세 번째 자리"}의 경고를 흐리게 읽으면 같은 패턴이 다시 반복될 수 있습니다. ${voice.caution} 따라서 반응을 늦추고 사실을 먼저 확인하는 태도가 필요합니다.`,
    timingAdvice: `${voice.pulse} 지금은 크게 밀어붙이기보다 14~30일 검증 구간을 두는 타이밍입니다. 준비와 실행을 분리해 기록하면 흐름이 더 또렷해집니다.`,
    practicalActions,
    oracleMessage: `${coreCrystal.nameKo}의 오라클: "지금 필요한 것은 큰 반전이 아니라, 흐린 감각을 오늘의 작은 결단으로 바꾸는 첫 번째 실행이다."`,
    neoLine: `네오: ${voice.neo}`,
    younLine: `연이: ${voice.youn}`,
  };
}

function readingSectionLength(section) {
  return [
    section.cardMeaning,
    section.crystalMeaning,
    section.positionInterpretation,
    section.categoryReading,
    section.opportunity,
    section.caution,
    section.uplift,
    section.action,
    section.neoLine,
    section.younLine,
  ].join(" ").length;
}

function validateCrystalSoulReading(reading) {
  const issues = [];
  const sections = Array.isArray(reading?.sections) ? reading.sections : [];
  const summary = reading?.summary || {};
  const masterChapters = Array.isArray(reading?.masterChapters) ? reading.masterChapters : [];

  if (sections.length !== 5) issues.push("카드 섹션 수가 5장이 아닙니다.");
  sections.forEach((section, idx) => {
    if (!asText(section.cardMeaning)) issues.push(`${idx + 1}번 카드 기본 의미 누락`);
    if (!asText(section.crystalMeaning)) issues.push(`${idx + 1}번 카드 원석 의미 누락`);
    if (!asText(section.categoryReading)) issues.push(`${idx + 1}번 카드 카테고리 상담 누락`);
    if (!asText(section.keywordVisual)) issues.push(`${idx + 1}번 카드 키워드 비주얼 누락`);
    if (readingSectionLength(section) < 600) issues.push(`${idx + 1}번 카드 섹션 길이 부족`);
  });

  const summaryText = [
    summary.overallFlow,
    summary.strongestSignal,
    summary.opportunity,
    summary.risk,
    summary.timingAdvice,
    summary.oracleMessage,
  ].join(" ");
  if (summaryText.length < 800) issues.push("종합 리딩 길이 부족");
  if (!Array.isArray(summary.practicalActions) || summary.practicalActions.length < 3) {
    issues.push("실행 체크리스트 최소 개수 미달");
  }
  if (masterChapters.length !== 7) {
    issues.push("마스터 챕터 수가 7개가 아닙니다.");
  } else {
    masterChapters.forEach((chapter, idx) => {
      if (!asText(chapter?.title)) issues.push(`${idx + 1}번 마스터 챕터 제목 누락`);
      if (!asText(chapter?.keywordVisual)) issues.push(`${idx + 1}번 마스터 챕터 키워드 누락`);
      if (!ensureTextLength(chapter?.content, 260)) issues.push(`${idx + 1}번 마스터 챕터 본문 길이 부족`);
    });
  }

  return { ok: issues.length === 0, issues };
}

function buildCrystalSoulMasterChaptersFallback(readingData) {
  const sections = Array.isArray(readingData?.sections) ? readingData.sections : [];
  const summary = readingData?.summary || {};
  const s1 = sections[0] || {};
  const s2 = sections[1] || {};
  const s3 = sections[2] || {};
  const s4 = sections[3] || {};
  const s5 = sections[4] || {};

  const chapters = [
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[0],
      openingKeywords: ["오라", "현재 파동", "상담 오프닝"],
      keywordVisual: buildKeywordVisual((s1.tarotKeywords || []).concat(s2.tarotKeywords || [])),
      content: `내담자님, 오늘 당신의 무의식이 선택한 첫 번째 진입점은 ${summary.coreCrystal || readingData.coreCrystal}의 파동입니다. ${summary.overallFlow || "현재 흐름은 즉흥보다 기준을 세우는 쪽에 힘이 실립니다."} 지금의 장면은 좋은 운과 나쁜 운을 이분법으로 판정하는 구간이 아니라, 현재 감정과 현실 행동의 간격을 섬세하게 맞추는 구간입니다. ${s1.oneLineSummary || "첫 번째 카드가 핵심 기운을 보여 줍니다."} 이 문장을 첫 문턱의 중심으로 붙잡아 두시면, 뒤따르는 작은 의식들이 더 안정적으로 마음에 내려앉습니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[1],
      openingKeywords: ["핵심 키워드", "상징", "무의식"],
      keywordVisual: buildKeywordVisual(s2.tarotKeywords || []),
      content: `카드 키워드는 단어 목록이 아니라 마음이 흔들리는 방향을 비추는 지도입니다. ${s2.keywordVisual || buildKeywordVisual(s2.tarotKeywords || [])} 이 조합은 지금 내담자님의 선택 기준이 어디에서 흐려지고 어디에서 회복되는지를 조용히 보여 줍니다. ${s2.cardFlow || "카드 흐름은 현재 선택의 우선순위를 명확히 합니다."} 또한 ${s3.keywordVisual || buildKeywordVisual(s3.tarotKeywords || [])}는 반복 습관의 그림자를 가리키는 경향이 있어, 같은 자극에 같은 반응을 하지 않도록 호흡 간격을 의식적으로 늘릴 필요가 있습니다. 빛의 단서마다 오늘의 작은 의식을 하나씩 붙이면 오라클 문장이 하루의 선택으로 내려앉습니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[2],
      openingKeywords: ["메이저", "마이너", "수비학"],
      keywordVisual: buildKeywordVisual([s1.cardNameKo, s3.cardNameKo, s5.cardNameKo]),
      content: `${s1.cardNameKo || "첫 번째 카드"}는 ${tarotNumerologyInsight(s1.cardNameEn)} ${s3.cardNameKo || "세 번째 카드"}는 ${tarotNumerologyInsight(s3.cardNameEn)} ${s5.cardNameKo || "다섯 번째 카드"}는 ${tarotNumerologyInsight(s5.cardNameEn)} 메이저 아르카나는 인생 축의 전환과 신념 프레임을, 마이너 아르카나는 일상 루틴과 관계 언어를 조정하라고 말합니다. 따라서 이번 리딩의 결론은 거대한 결심보다, 14일 단위의 실행 체크포인트를 세팅해 수비학적 리듬을 현실 캘린더에 반영하는 것입니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[3],
      openingKeywords: ["원석", "정화", "치유 주파수"],
      keywordVisual: buildKeywordVisual([readingData.coreCrystal, "정화", "회복", "안정"]),
      content: `${readingData.coreCrystal}는 감정을 눌러 버리는 돌이 아니라, 감정과 판단의 속도를 맞춰 주는 조율자입니다. ${s1.crystalEnergy || "첫 번째 카드에 배치된 원석 에너지는 흐름을 안정화합니다."} ${s4.crystalEnergy || "네 번째 카드의 원석은 오늘 움직일 결을 잡아 줍니다."} 내담자님이 해야 할 치유 동작은 복잡하지 않습니다. 하루 10분 호흡 정리, 하루 1회 감정 기록, 하루 1회 기준 문장 확인만 지켜도 원석 파동은 점진적으로 안정 신호를 키웁니다. 정화의 파동은 즉시 극적인 변화를 만들기보다, 반복 가능한 회복 리듬을 통해 누적됩니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[4],
      openingKeywords: ["관계", "현실", "실행"],
      keywordVisual: buildKeywordVisual(["경계", "표현", "협상", "기준"]),
      content: `이 리딩의 빛은 통찰을 오래 붙잡는 데서 끝나지 않고, 오늘의 작은 선택으로 내려올 때 선명해집니다. ${summary.strongestSignal || "가장 강한 신호는 핵심 카드 조합에서 드러납니다."} ${summary.opportunity || "두 번째 자리에서 가능성의 문이 열립니다."} 관계에서는 감정 해명을 길게 하기보다, 사실 1개와 요청 1개를 분리해 전달하세요. 재물/진로 영역에서는 이번 주에 지킬 기준 하나만 남기고, 그 기준이 지켜졌는지를 부드럽게 확인해야 합니다. 내담자님이 오늘 만들 문장은 길 필요가 없습니다. '지금은 무엇을 멈추고, 무엇을 시작할지' 이 두 문장을 또렷하게 쓰는 순간, 카드가 말한 가능성은 행동의 형태를 얻습니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[5],
      openingKeywords: ["타이밍", "루틴", "14~30일"],
      keywordVisual: buildKeywordVisual(["타이밍", "체크포인트", "리추얼", "누적"]),
      content: `${summary.timingAdvice || "지금은 즉흥 확장보다 검증 구간을 먼저 확보하는 타이밍입니다."} 14~30일 구간은 운세를 기다리는 시간이 아니라 파동을 몸에 익히는 기간입니다. 1주차에는 정리와 관찰, 2주차에는 작은 움직임, 3~4주차에는 유지할 것과 내려놓을 것을 가르는 리듬을 권장합니다. 리추얼은 화려할 필요가 없습니다. 같은 시간대에 3분 정리 메모를 남기고, 매주 한 번 카드의 빛의 단서를 다시 읽어 오늘의 행동과 얼마나 맞닿았는지 확인하세요. 이렇게 하면 타로 상징이 추상 언어에서 벗어나 생활 속에서 반복 가능한 선택의 신호로 바뀝니다.`,
    },
    {
      title: CRYSTAL_MASTER_CHAPTER_TITLES[6],
      openingKeywords: ["봉인 조언", "통합", "마무리"],
      keywordVisual: buildKeywordVisual(["통합", "결단", "회복", "전환"]),
      content: `마지막으로 내담자님께 봉인 조언을 남깁니다. ${summary.oracleMessage || "지금 필요한 기적은 기준 있는 결단입니다."} 오늘의 리딩은 불안을 없애 주는 마법이 아니라, 불안을 다루는 구조를 선물합니다. ${summary.risk || "반복 습관을 방치하면 카드 잠재력이 줄어듭니다."} 그러므로 결론은 단순합니다. 지금 즉시 시작할 행동 1개, 즉시 중단할 행동 1개를 정하고 7일 동안만 지켜 보세요. 그 7일이 지나면 이미 파동이 바뀐 체감을 얻게 될 가능성이 큽니다.`,
    },
  ];

  return chapters.map((chapter, idx) => ({
    no: idx + 1,
    title: chapter.title,
    openingKeywords: chapter.openingKeywords,
    keywordVisual: chapter.keywordVisual,
    content: chapter.content,
  }));
}

function buildCrystalSoulMasterPrompt(readingData, intake = {}) {
  const category = asText(readingData?.category) || "크리스탈 소울";
  const coreCrystal = asText(readingData?.coreCrystal) || "그린 플로라이트";
  const topicHint = asText(intake?.topic?.hint || intake?.topic?.name || "");

  const sectionSeeds = (Array.isArray(readingData?.sections) ? readingData.sections : []).map((section) => ({
    order: section.order,
    positionTitle: section.positionTitle,
    question: section.question,
    cardNameKo: section.cardNameKo,
    cardNameEn: section.cardNameEn,
    orientation: section.orientation,
    tarotKeywords: section.tarotKeywords,
    crystalName: section.crystalName,
    crystalKeywords: section.crystalKeywords,
    cardMeaning: section.cardMeaning,
    crystalMeaning: section.crystalMeaning,
    positionInterpretation: section.positionInterpretation,
  }));

  return [
    "당신은 점술 서비스의 맥락을 이해하는 크리스탈 오라클 리더입니다. 원석의 파동과 타로 상징을 함께 읽되, 말투는 인간적인 공감과 은은한 위로로 이어갑니다.",
    "문체 규칙:",
    "- 반드시 1:1 상담 대화체로 작성하고, 기계적 나열형 문장을 금지합니다.",
    "- 각 카드 해설은 메이저/마이너 아르카나 맥락과 수비학 신호를 자연스럽게 포함합니다.",
    "- 카드와 원석의 치유 파동을 결합해 오늘 실천할 작은 회복 의식을 제시합니다.",
    "- 각 섹션 도입부에 반드시 [키워드: ...] 형식 문자열을 제공합니다.",
    "- 분량 축소 금지: 카드 5섹션 + 깊은 7개의 문을 모두 작성합니다.",
    "",
    "출력 규칙:",
    "- JSON만 출력합니다. 코드펜스/설명문/주석 금지.",
    "- 아래 리딩 형식을 유지합니다.",
    "",
    '{"sections":[{"order":1,"keywordVisual":"[키워드: ...]","categoryReading":"...","crystalEnergy":"...","cardFlow":"...","currentPulse":"...","caution":"...","uplift":"...","practicalActions":["...","...","..."]}],"summary":{"overallFlow":"...","strongestSignal":"...","opportunity":"...","risk":"...","timingAdvice":"...","oracleMessage":"...","practicalActions":["...","...","...","..."]},"masterChapters":[{"no":1,"title":"...","openingKeywords":["...","...","..."],"keywordVisual":"[키워드: ...]","content":"..."}]}',
    "",
    "길이 규칙:",
    "- sections는 정확히 5개.",
    "- 각 section.categoryReading은 최소 650자.",
    "- masterChapters는 정확히 7개.",
    "- 각 chapter.content는 최소 650자.",
    "- practicalActions는 섹션별 최소 3개, summary는 최소 4개.",
    "",
    "이 리딩은 점술 서비스 관점에서 내담자 흐름을 먼저 읽고, 질문의 정서를 정리해 행동으로 번역합니다.",
    `카테고리: ${category}`,
    `핵심 원석: ${coreCrystal}`,
    `내담자 질문 힌트: ${topicHint || "없음"}`,
    "",
    "[입력 시드 JSON]",
    JSON.stringify({
      category,
      coreCrystal,
      topicHint,
      summarySeed: readingData?.summary || {},
      sections: sectionSeeds,
    }),
  ].join("\n");
}

function normalizeCrystalSoulAiSections(baseSections, aiSections) {
  if (!Array.isArray(aiSections) || aiSections.length !== 5) return null;

  const merged = [];
  for (let i = 0; i < baseSections.length; i += 1) {
    const base = baseSections[i];
    const ai = aiSections[i] || {};
    const practicalActions = Array.isArray(ai.practicalActions)
      ? ai.practicalActions.map((item) => asText(item)).filter(Boolean).slice(0, 5)
      : base.practicalActions;

    const categoryReading = ensureTextLength(ai.categoryReading, 320) || base.categoryReading;
    const crystalEnergy = ensureTextLength(ai.crystalEnergy, 120) || base.crystalEnergy;
    const cardFlow = ensureTextLength(ai.cardFlow, 120) || base.cardFlow;
    const currentPulse = ensureTextLength(ai.currentPulse, 90) || base.currentPulse;
    const caution = ensureTextLength(ai.caution, 80) || base.caution;
    const uplift = ensureTextLength(ai.uplift, 80) || base.uplift;

    merged.push({
      ...base,
      keywordVisual: asText(ai.keywordVisual) || base.keywordVisual || buildKeywordVisual(base.tarotKeywords),
      categoryReading,
      crystalEnergy,
      cardFlow,
      currentPulse,
      caution,
      uplift,
      practicalActions,
      action: practicalActions.join(" / "),
    });
  }
  return merged;
}

function normalizeCrystalSoulAiSummary(baseSummary, aiSummary) {
  const actions = Array.isArray(aiSummary?.practicalActions)
    ? aiSummary.practicalActions.map((item) => asText(item)).filter(Boolean).slice(0, 6)
    : baseSummary.practicalActions;

  return {
    ...baseSummary,
    overallFlow: ensureTextLength(aiSummary?.overallFlow, 140) || baseSummary.overallFlow,
    strongestSignal: ensureTextLength(aiSummary?.strongestSignal, 120) || baseSummary.strongestSignal,
    opportunity: ensureTextLength(aiSummary?.opportunity, 110) || baseSummary.opportunity,
    risk: ensureTextLength(aiSummary?.risk, 110) || baseSummary.risk,
    timingAdvice: ensureTextLength(aiSummary?.timingAdvice, 110) || baseSummary.timingAdvice,
    oracleMessage: ensureTextLength(aiSummary?.oracleMessage, 100) || baseSummary.oracleMessage,
    practicalActions: actions,
  };
}

function normalizeCrystalSoulAiChapters(aiChapters, fallbackChapters) {
  if (!Array.isArray(aiChapters) || aiChapters.length !== 7) {
    return fallbackChapters;
  }

  const merged = aiChapters.map((chapter, idx) => {
    const fallback = fallbackChapters[idx] || {};
    const openingKeywords = Array.isArray(chapter?.openingKeywords)
      ? chapter.openingKeywords.map((item) => asText(item)).filter(Boolean).slice(0, 5)
      : fallback.openingKeywords;
    return {
      no: idx + 1,
      title: asText(chapter?.title) || fallback.title || CRYSTAL_MASTER_CHAPTER_TITLES[idx],
      openingKeywords: openingKeywords && openingKeywords.length ? openingKeywords : fallback.openingKeywords || [],
      keywordVisual: asText(chapter?.keywordVisual) || fallback.keywordVisual || buildKeywordVisual(openingKeywords),
      content: ensureTextLength(chapter?.content, 260) || fallback.content || "",
    };
  });

  return merged;
}

async function buildCrystalSoulReading(body = {}, env = {}) {
  const categoryId = asText(body?.topic?.id) || "wealth";
  const category = CATEGORY_DEFS[categoryId] || CATEGORY_DEFS.wealth;
  const cards = Array.isArray(body?.cards) ? body.cards.slice(0, 5) : [];
  const coreCrystal = findCrystalByAssignment(0, body, asText(body?.gem?.name));

  const sections = category.spread.map((position, idx) => {
    const cardName = asText(cards[idx]) || `Card ${idx + 1}`;
    const orientation = resolveOrientation(cardName, idx, body?.orientations);
    const crystal = findCrystalByAssignment(idx, body, asText(body?.gem?.name));
    return buildCrystalSoulSection(cardName, crystal, position, category, orientation, idx);
  });

  const summary = buildCrystalSoulSummary(category, sections, coreCrystal);
  const fallbackReadingData = {
    category: category.name,
    categoryId: category.id,
    coreCrystal: coreCrystal.nameKo,
    sections,
    summary,
  };
  fallbackReadingData.masterChapters = buildCrystalSoulMasterChaptersFallback(fallbackReadingData);

  let readingData = fallbackReadingData;
  let source = "deterministic";
  let model = "";

  if (hasGeminiKey(env)) {
    try {
      const prompt = buildCrystalSoulMasterPrompt(fallbackReadingData, body);
      const aiResult = await callGeminiText(env, prompt, {
        modelEnvKeys: ["TAROT_GEMINI_MODEL", "NUMEROLOGY_TAROT_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
        maxOutputTokens: 4096,
        timeoutMs: 14000,
        totalTimeoutMs: 26000,
      });

      if (aiResult?.ok && asText(aiResult?.text)) {
        const parsed = parseJsonCandidate(aiResult.text);
        if (parsed && typeof parsed === "object") {
          const mergedSections = normalizeCrystalSoulAiSections(fallbackReadingData.sections, parsed.sections);
          const mergedSummary = normalizeCrystalSoulAiSummary(fallbackReadingData.summary, parsed.summary || {});
          if (mergedSections) {
            readingData = {
              ...fallbackReadingData,
              sections: mergedSections,
              summary: mergedSummary,
              masterChapters: normalizeCrystalSoulAiChapters(parsed.masterChapters, fallbackReadingData.masterChapters),
            };
            source = "gemini";
            model = asText(aiResult.model);
          }
        }
      }
    } catch (error) {
      console.warn("[tarot] crystal-soul ai enhancement fallback", asText(error?.message));
    }
  }

  const validation = validateCrystalSoulReading(readingData);
  return {
    reading: crystalReadingToText(readingData),
    readingData,
    validation,
    source,
    model,
  };
}

function crystalReadingToText(reading) {
  const lines = [];
  lines.push(`🔮 ${reading.category} 점술 서비스 · 크리스탈 소울 리딩`);
  lines.push(`핵심 원석: ${reading.coreCrystal}`);
  lines.push("");
  for (const section of reading.sections) {
    lines.push(`${section.order}. ${section.positionTitle} (${section.question})`);
    lines.push(section.keywordVisual || buildKeywordVisual(section.tarotKeywords));
    lines.push(`카드: ${section.cardNameKo} / ${section.orientation === "reversed" ? "역방향" : "정방향"}`);
    lines.push(`원석: ${section.crystalName}`);
    lines.push(`타로 키워드: ${section.tarotKeywords.join(", ")}`);
    lines.push(`원석 키워드: ${section.crystalKeywords.join(", ")}`);
    lines.push(`한 줄 요약: ${section.oneLineSummary}`);
    lines.push(`원석 에너지: ${section.crystalEnergy}`);
    lines.push(`카드 흐름: ${section.cardFlow}`);
    lines.push(`카드가 비춘 장면: ${section.cardMeaning}`);
    lines.push(`원석의 기운: ${section.crystalMeaning}`);
    lines.push(`자리의 속삭임: ${section.positionInterpretation}`);
    lines.push(`지금의 흐름: ${section.currentPulse}`);
    lines.push(`주제의 깊은 흐름: ${section.categoryReading}`);
    lines.push(`기회: ${section.opportunity}`);
    lines.push(`주의점: ${section.caution}`);
    lines.push(`좋게 살리는 방법: ${section.uplift}`);
    lines.push(`오늘의 의식: ${(section.practicalActions || []).join(" / ")}`);
    lines.push(section.neoLine);
    lines.push(section.younLine);
    lines.push("");
  }
  lines.push("종합 리딩");
  lines.push(`전체 흐름: ${reading.summary.overallFlow}`);
  lines.push(`가장 강한 신호: ${reading.summary.strongestSignal}`);
  lines.push(`기회: ${reading.summary.opportunity}`);
  lines.push(`주의할 점: ${reading.summary.risk}`);
  lines.push(`타이밍 조언: ${reading.summary.timingAdvice}`);
  lines.push("오늘의 작은 의식:");
  (reading.summary.practicalActions || []).forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
  lines.push(`크리스탈 오라클: ${reading.summary.oracleMessage}`);

  const chapters = Array.isArray(reading.masterChapters) ? reading.masterChapters : [];
  if (chapters.length) {
    lines.push("");
    lines.push("일곱 개의 크리스탈 문");
    chapters.forEach((chapter, idx) => {
      lines.push("");
      lines.push(`${chapter.title || `챕터 ${idx + 1}`}`);
      lines.push(chapter.keywordVisual || buildKeywordVisual(chapter.openingKeywords || []));
      lines.push(asText(chapter.content));
    });
  }

  return removeRepeatedCrystalSoulPhrases(sanitizeCrystalSoulText(lines.join("\n")));
}

function ensureCardCountOrThrow(spreadType, cards) {
  const expected = expectedCardCount(spreadType);
  if (!expected) {
    throw createHttpError(400, `Unsupported spreadType: ${spreadType}`);
  }
  if (!Array.isArray(cards) || cards.length !== expected) {
    throw createHttpError(400, `${spreadType}은(는) ${expected}장의 카드가 필요합니다.`, {
      expectedCardCount: expected,
      receivedCardCount: Array.isArray(cards) ? cards.length : 0,
    });
  }
}

function toUiCard(drawn, spreadType, idx) {
  const spread = getSpreadDefinition(spreadType);
  const position = spread?.positions?.[idx];
  const card = getTarotCardByAnyId(drawn.cardId);
  if (!card) {
    throw new TarotInterpretationError(
      "CARD_DATA_MISSING",
      `Card data missing for ${drawn.cardId}`,
      "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      { drawn },
    );
  }

  const images = buildImageCandidates(card.code);
  return {
    cardId: card.code,
    id: card.id,
    name: card.nameEn,
    nameEn: card.nameEn,
    nameKr: card.nameKo,
    nameKo: card.nameKo,
    position: drawn.positionKey || drawn.position || position?.key || `position_${idx + 1}`,
    orientation: drawn.orientation === "reversed" ? "reversed" : "upright",
    imageKey: card.imageKey || card.code.toLowerCase(),
    imageUrl: images[0],
    imageCandidates: images,
    proxyImageUrl: "",
    localImageUrl: images[0],
    keywords: card.keywords.slice(0, 5),
  };
}

function buildReadingPayload({ spreadType, category, cards, serviceKey, userQuestion, userContext }) {
  ensureCardCountOrThrow(spreadType, cards);

  const normalizedDrawnCards = normalizeDrawnCardsForSpread(spreadType, cards);
  const uiCards = normalizedDrawnCards.map((drawn, idx) => toUiCard(drawn, spreadType, idx));
  const questionType = inferQuestionType({ category, spreadId: spreadType, serviceKey });

  const interpreted = interpretTarotReading({
    serviceKey: serviceKey || `tarot:${spreadType}`,
    questionType,
    spreadId: spreadType,
    drawnCards: normalizedDrawnCards,
    userQuestion,
    userContext,
  });

  const reading = buildLegacyReadingPayload(interpreted, {
    spreadId: spreadType,
    questionType,
    drawnCards: normalizedDrawnCards,
  });

  return {
    ok: true,
    category: asText(category) || "general",
    spreadType,
    cards: uiCards,
    reading,
    consultingHighlights: buildConsultingHighlights(reading),
    engineMeta: {
      source: "lib/tarot/*",
      spreadType,
      questionType,
      cardCount: uiCards.length,
      cardDbCount: TAROT_CARDS.length,
      deterministic: true,
      qualityEnhanced: spreadType === "reunion_lighthouse_five_card",
    },
  };
}

function mapInterpretationErrorToHttp(error) {
  if (error instanceof TarotInterpretationError) {
    if (error.code === "INVALID_CARD_COUNT") {
      return json({ ok: false, message: error.userMessage, errorCode: error.code, meta: error.meta }, { status: 400 });
    }

    if (error.code === "CARD_DATA_MISSING") {
      console.error("[tarot] CARD_DATA_MISSING", error.meta || {});
      return json({ ok: false, message: error.userMessage, errorCode: error.code }, { status: 422 });
    }

    return json({ ok: false, message: error.userMessage, errorCode: error.code }, { status: 400 });
  }

  return null;
}

async function buildNumerologyReadingPayload(body = {}, env = {}) {
  const birthDate = asText(body?.birthDate);
  if (!birthDate) {
    throw createHttpError(400, "생년월일을 입력해 주세요.");
  }

  const question = asText(body?.question);
  if (!question) {
    throw createHttpError(400, "상담 질문을 입력해 주세요.");
  }

  const topic = normalizeTopic(body?.topic);
  const numerology = buildNumerologyContext({
    birthDate,
    topic,
  });

  let cards = normalizeCardInput(body?.cards, topic);
  if (cards.length < 5) {
    const generatedCards = selectCards({
      birthDate,
      topic,
      name: asText(body?.name),
      numerology,
    });
    const mergedCards = [...cards];
    for (const drawn of generatedCards) {
      if (mergedCards.length >= 5) break;
      mergedCards.push(drawn);
    }
    cards = mergedCards;
  }
  cards = normalizeCardInput(cards, topic).slice(0, 5);

  const fallback = buildFallbackInterpretation({
    numerology,
    cards,
    topic,
    name: asText(body?.name),
    question,
  });

  const prompt = buildGeminiPrompt({
    numerology,
    cards,
    topic,
    question,
    name: asText(body?.name),
  });

  const aiResult = await callGeminiText(env, prompt, {
    modelEnvKeys: ["NUMEROLOGY_TAROT_GEMINI_MODEL", "TAROT_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
    maxOutputTokens: 4096,
    timeoutMs: 16000,
    totalTimeoutMs: 30000,
  });

  if (!aiResult?.ok || !asText(aiResult?.text)) {
    return {
      ok: true,
      source: "fallback",
      topic,
      numerology,
      cards,
      interpretation: fallback,
      model: asText(aiResult?.model),
      warning: asText(aiResult?.message) || "gemini_unavailable",
    };
  }

  const parsed = parseJsonCandidate(aiResult.text);
  let normalizedInterpretation = normalizeInterpretation(parsed, fallback, cards, topic, question);
  const quality = validateNumerologyTarotQuality(normalizedInterpretation, topic);

  if (!quality.ok) {
    console.warn("[NumerologyTarot][QualityFail]", JSON.stringify({
      topic: normalizeTopic(topic),
      warnings: quality.warnings,
      model: asText(aiResult.model),
    }));
    normalizedInterpretation = reinforceNumerologyInterpretation(normalizedInterpretation, fallback);
    normalizedInterpretation.quality = {
      ...(normalizedInterpretation.quality || {}),
      source: parsed ? "gemini_reinforced" : "fallback_reinforced",
      topicReflected: true,
      cardCount: Array.isArray(normalizedInterpretation.cardReadings) ? normalizedInterpretation.cardReadings.length : 0,
      warnings: quality.warnings,
    };
  }

  return {
    ok: true,
    source: parsed ? "gemini" : "gemini_text_fallback",
    topic,
    numerology,
    cards,
    interpretation: normalizedInterpretation,
    model: asText(aiResult.model),
  };
}

export async function handleTarotRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/tarot");

    if (method === "GET" && path === "/meta") {
      return json({
        ok: true,
        engine: {
          spreads: listSpreadIds(),
          cardCount: TAROT_CARDS.length,
        },
      });
    }

    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    // Mindscan reading is finalized by coin-gate and must not fail at result generation
    // due to auth token drift between runtime environments.
    if (path !== "/mindscan") {
      await requireAuth(request, env);
    }
    const body = await readJson(request);

    if (path === "/draw") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const drawnCards = drawTarotCardsForSpread(spreadType);
      return json({ ok: true, spreadType, cards: drawnCards });
    }

    if (path === "/reading") {
      const spreadType = normalizeSpreadType(body?.spreadType || "one_card");
      const category = asText(body?.category) || "general";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      const payload = buildReadingPayload({
        spreadType,
        category,
        cards,
        serviceKey: asText(body?.serviceKey) || "tarot-reading",
        userQuestion: asText(body?.userQuestion),
        userContext: body?.userContext,
      });
      return json(payload);
    }

    if (path === "/love-reading") {
      const spreadType = "relationship_six_card";
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      const payload = buildReadingPayload({
        spreadType,
        category: "love",
        cards,
        serviceKey: "tarot-love-relationship",
        userQuestion: asText(body?.userQuestion),
        userContext: body?.userContext,
      });
      payload.reading = normalizeLoveReadingPayload(payload?.reading, payload?.cards || []);
      payload.consultingHighlights = buildLoveConsultingHighlights(payload.reading);
      payload.isRelationshipReading = true;
      payload.api = "love-reading";
      return json(payload);
    }

    if (path === "/crystal-soul") {
      const cards = Array.isArray(body?.cards) ? body.cards : [];
      if (!cards.length) {
        return json({ ok: false, message: "카드 데이터가 필요합니다." }, { status: 400 });
      }
      const crystal = await buildCrystalSoulReading(body, env);
      return json({
        ok: true,
        source: "worker/routes/tarot.js",
        readingSource: crystal.source,
        model: crystal.model,
        reading: crystal.reading,
        readingData: crystal.readingData,
        validation: crystal.validation,
      });
    }

    if (path === "/mindscan") {
      const pairs = Array.isArray(body?.pairs) ? body.pairs : [];
      const question = String(body?.question || "").trim();
      if (!pairs.length) {
        return json({ ok: false, message: "카드 페어 데이터가 필요합니다." }, { status: 400 });
      }

      if (!question) {
        return json({ ok: false, message: "상담 질문이 필요합니다." }, { status: 400 });
      }

      const reading = await buildMindscanReadingPayload(pairs, { question, env });
      if (!reading?.ok) {
        return json(
          {
            ok: false,
            message: reading?.message || "카드 정보를 불러오는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
          },
          { status: 422 },
        );
      }
      return json(reading);
    }

    if (path === "/numerology-reading") {
      const payload = await buildNumerologyReadingPayload(body, env);
      return json(payload);
    }

    return notFound();
  } catch (error) {
    const mapped = mapInterpretationErrorToHttp(error);
    if (mapped) return mapped;
    return handleRouteError(error);
  }
}
