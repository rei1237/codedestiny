import {
  GUARDIAN_FORTUNE_MODE_SHARE_HINTS,
  GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS,
  getDefaultCta,
  getTopicContract,
} from "./guardian-fortune-runtime-contract.js";
import { GUARDIAN_TOPIC_ADAPTER_PRIORITY, text } from "./guardian-fortune-adapter-utils.js";
import { buildFortuneQuestionFocus } from "./fortune-question-focus.js";

/**
 * 주제별 폴백 뼈대. rhythm·checkpoint·reframe 은 2026-09-03 본문 분량 확대(하한 2,600자)
 * 때 추가했다 — 같은 문장을 늘려 채우지 않고 주제마다 다른 장면을 주기 위한 재료다.
 */
const TOPIC_GUIDANCE = Object.freeze({
  daily: {
    focus: "오늘 가장 먼저 정리할 한 가지",
    action: "해야 할 일을 세 가지 안으로 좁히고, 그중 가장 되돌리기 쉬운 일부터 10분만 시작해보세요.",
    caution: "아직 확인하지 않은 내일의 변수까지 오늘 결론처럼 키우는 것",
    rhythm: "하루의 흐름은 아침에 정한 순서가 아니라 오후에 남은 체력이 결정하는 편입니다. 그래서 오늘은 계획을 늘리는 것보다 이미 벌여둔 일 중 하나를 닫는 쪽이 흐름을 안정시킵니다.",
    checkpoint: "지금 붙잡고 있는 일이 오늘 안에 끝나야 하는 일인지, 아니면 끝난 것처럼 보이고 싶은 일인지 한 번만 구분해보세요.",
    reframe: "잘 풀리지 않는 하루는 능력이 부족해서라기보다, 한 번에 처리하려는 항목이 지금 가진 시간보다 많을 때 생깁니다.",
  },
  love: {
    focus: "표현과 기다림 사이의 속도",
    action: "연락이나 답장을 보내기 전에 하고 싶은 말을 한 문장으로 줄이고, 상대에게 남겨둘 여백을 확인해보세요.",
    caution: "상대의 반응이 오기 전에 혼자 관계의 결론을 완성하는 것",
    rhythm: "인연의 흐름은 마음의 크기보다 주고받는 간격에서 더 잘 드러납니다. 마음이 커질수록 간격이 좁아지고, 좁아진 간격은 상대에게 속도로 느껴지기 쉬워요.",
    checkpoint: "최근 대화에서 내가 확인한 사실과 내가 덧붙인 해석을 나누어 보면, 지금 필요한 것이 표현인지 시간인지 보입니다.",
    reframe: "관계가 불안하게 느껴지는 순간은 상대가 멀어져서가 아니라, 아직 확인하지 못한 부분을 내가 먼저 메우고 있을 때가 많습니다.",
  },
  money_work: {
    focus: "성과보다 먼저 정리할 조건",
    action: "오늘의 지출·업무·기회를 각각 한 줄로 적고, 지금 회수 가능한 일 하나에 먼저 시간을 배정해보세요.",
    caution: "불안한 마음을 빠른 결제나 과한 확장으로 달래려는 것",
    rhythm: "돈과 일의 흐름은 큰 결정 한 번보다 반복되는 작은 기준에서 갈립니다. 지금 흐름은 새 기회를 늘리기보다 이미 벌여둔 것의 회수 조건을 정리할 때 안정적으로 읽힙니다.",
    checkpoint: "이번 선택이 수입을 늘리는 일인지, 불안을 줄이는 일인지 구분해보세요. 둘은 자주 섞이지만 필요한 준비가 다릅니다.",
    reframe: "성과가 더디게 느껴지는 시기는 방향이 틀려서가 아니라, 결과가 나오는 주기보다 확인하는 주기가 짧을 때 생깁니다.",
  },
  relationship: {
    focus: "가까워짐과 거리 두기의 균형",
    action: "불편했던 대화에서 사실과 해석을 나눠 적고, 다음 대화에서 확인할 질문 하나만 남겨보세요.",
    caution: "상대의 말투 하나를 나에 대한 전체 평가처럼 받아들이는 것",
    rhythm: "사람 사이의 흐름은 한 번의 사건이 아니라 반복되는 역할에서 만들어집니다. 내가 늘 먼저 맞추는 자리에 있었다면, 상대의 태도보다 그 역할이 먼저 굳어져 있을 수 있어요.",
    checkpoint: "그 사람과의 대화에서 내가 조절할 수 있는 것과 상대가 정하는 것을 갈라두면, 다음에 어디까지 애쓸지가 정해집니다.",
    reframe: "관계에서 반복해 지치는 이유는 상대가 매번 같아서가 아니라, 내가 매번 같은 지점에서 설명을 시작하기 때문일 수 있습니다.",
  },
  mind: {
    focus: "생각을 줄이는 것이 아니라 순서를 세우는 일",
    action: "머릿속 걱정을 지금 할 일·나중에 볼 일·내가 조절할 수 없는 일로 나누어 적어보세요.",
    caution: "피로한 상태에서 감정의 크기를 상황의 사실로 오해하는 것",
    rhythm: "마음의 흐름은 좋아졌다 나빠졌다를 반복하며 회복합니다. 한 번에 편해지지 않는다고 해서 방향이 잘못된 것은 아니에요.",
    checkpoint: "지금 무거운 것이 상황의 크기 때문인지, 아직 확인하지 못한 정보 때문인지 한 번만 나눠보세요.",
    reframe: "생각이 멈추지 않을 때는 생각을 줄이려 애쓰기보다, 오늘 답이 나올 수 있는 질문 하나만 남기고 나머지를 미뤄두는 편이 낫습니다.",
  },
  decision: {
    focus: "확신보다 확인 가능한 기준",
    action: "선택지마다 얻는 것과 감당할 것을 한 줄씩 비교하고, 오늘 확인할 조건 하나를 먼저 검증해보세요.",
    caution: "결정을 미루는 동안 정보가 저절로 더 좋아질 것이라고 기대하는 것",
    rhythm: "선택의 흐름은 정답이 나타나는 순간이 아니라, 되돌릴 수 있는 범위가 줄어드는 속도로 읽는 편이 정확합니다.",
    checkpoint: "두 선택지 중 어느 쪽이 더 나은지가 아니라, 어느 쪽이 틀렸을 때 회복이 쉬운지를 먼저 확인해보세요.",
    reframe: "결정이 어려운 이유는 대개 정보가 부족해서가 아니라, 감당할 몫을 아직 정하지 않았기 때문입니다.",
  },
});

const ADAPTER_EVIDENCE_LABELS = Object.freeze({
  saju: Object.freeze({ label: "사주", role: "성향과 행동 패턴" }),
  ziwei: Object.freeze({ label: "자미두수", role: "삶의 방향과 주제별 구조" }),
  vedic: Object.freeze({ label: "베다점", role: "무의식적 감정 리듬" }),
  sukuyo: Object.freeze({ label: "숙요점", role: "관계의 거리감" }),
  astrology: Object.freeze({ label: "점성술", role: "감정과 표현 방식" }),
  tarot: Object.freeze({ label: "타로", role: "오늘의 상징 조언" }),
});

const ADAPTER_QUESTION_PERSPECTIVES = Object.freeze({
  saju: "타고난 추진 방식과 지금의 흐름",
  ziwei: "역할과 책임이 반복되는 자리",
  vedic: "감정의 리듬과 회복의 순서",
  sukuyo: "관계의 거리와 대화의 속도",
  astrology: "정서와 행동이 만나는 지점",
  tarot: "지금 선택에서 확인할 상징과 행동",
});

const ADAPTER_QUESTION_FIELDS = Object.freeze({
  saju: ["dayMaster", "currentFlowSummary", "fiveElementsSummary", "tenGodsSummary", "seasonSummary", "relationSummary"],
  ziwei: ["topicPalaceSummary", "lifePalaceSummary", "keyStarsSummary", "strengths", "cautions"],
  vedic: ["innerRhythm", "moonSignSummary", "nakshatraSummary", "dashaSummary", "lagnaSummary"],
  sukuyo: ["relationshipPattern", "distancePattern", "emotionalPattern", "birthMansion", "todayMansion"],
  astrology: ["currentMoodSummary", "moonSummary", "sunSummary", "venusSummary", "marsSummary", "saturnSummary"],
  tarot: ["symbolicMessage", "cards"],
});

const ADAPTER_QUESTION_SPECIALIST_MOVES = Object.freeze({
  saju: "사주는 이 근거를 좋고 나쁜 운의 판정이 아니라, 힘을 쓰는 방식과 멈춰야 할 타이밍을 읽는 기준으로 봅니다.",
  ziwei: "자미두수는 이 근거를 역할과 책임이 반복되는 자리로 읽어, 내가 맡을 몫과 협의할 몫을 나누게 합니다.",
  vedic: "베다점은 이 근거를 감정의 리듬으로 읽어, 마음이 급해질 때 무엇을 먼저 회복해야 하는지 살핍니다.",
  sukuyo: "숙요는 이 근거를 관계의 속도로 읽으며, 상대의 속마음이 아니라 실제 대화와 거리의 변화를 봅니다.",
  astrology: "점성술은 이 근거를 정서와 행동이 만나는 지점으로 읽어, 원하는 것과 바로 행동할 수 있는 것을 구분합니다.",
  tarot: "타로는 이 근거를 현재 선택을 비추는 상징으로 읽으며, 카드가 결정을 대신한다고 말하지 않습니다.",
});

/**
 * 체계별 심화 문단. 폴백 본문의 하한(2,600자)을 반복 문장이 아니라 "그 체계가 근거를
 * 어떻게 읽는가"로 채우기 위해 2026-09-03 에 추가했다.
 * 🔴 자기 체계의 용어만 쓴다 — 다른 체계 용어를 섞으면 guardian-fortune-result.js 의
 * findForeignSystemMarker 가 GUARDIAN_RESULT_CATEGORY_BOUNDARY_FAILED 로 떨어뜨린다.
 */
const ADAPTER_DEEP_READINGS = Object.freeze({
  saju: "사주는 타고난 기질을 고정된 성격표로 보지 않고, 힘이 잘 실리는 방향과 쉽게 소모되는 방향을 나누어 봅니다. 지금처럼 판단이 겹치는 시기에는 무엇을 더 해내야 하는지보다, 어디에서 힘이 새는지를 먼저 정리할 때 결과가 달라집니다. 같은 노력을 들여도 방향이 맞으면 회복이 빠르고, 어긋나면 성과가 나와도 피로가 남습니다.",
  ziwei: "자미두수는 삶을 여러 자리의 구조로 읽어, 지금 내가 어느 자리에서 반복해 애쓰고 있는지를 보여줍니다. 이 흐름에서 중요한 것은 능력의 크기가 아니라 맡은 몫의 경계입니다. 내가 책임질 부분과 함께 나눌 부분을 구분하지 않으면, 잘 해낼수록 부담만 커지는 구간에 오래 머물게 됩니다.",
  vedic: "베다점은 마음의 상태를 의지의 문제로 보지 않고, 차오르고 빠지는 리듬으로 읽습니다. 지금은 결심을 새로 세우기보다 회복이 되는 조건을 먼저 확보할 때 판단이 선명해집니다. 감정이 흔들리는 구간에서 내린 결론은 상황보다 컨디션을 더 많이 반영하기 때문입니다.",
  sukuyo: "숙요점은 상대의 속마음을 추측하는 대신, 실제로 오간 대화와 거리의 변화를 근거로 봅니다. 그래서 이 흐름에서는 마음의 크기보다 접촉의 간격이 더 많은 것을 말해 줍니다. 간격을 억지로 좁히려 하기보다, 지금 간격이 어떤 리듬으로 움직이는지를 먼저 확인하는 편이 안전합니다.",
  astrology: "점성술은 원하는 것과 실제로 움직이는 방식이 늘 같지 않다고 봅니다. 지금 흐름에서는 마음의 방향과 행동의 방향 사이에 생긴 간격이 피로의 원인일 수 있습니다. 두 방향을 한 번에 맞추려 하기보다, 오늘 실제로 움직일 수 있는 쪽부터 정리하면 나머지도 따라옵니다.",
  tarot: "타로는 결정을 대신해 주는 도구가 아니라, 지금 선택에서 무엇을 보고 있는지를 비추는 거울에 가깝습니다. 그래서 상징이 가리키는 것은 정해진 결말이 아니라 지금 반복되고 있는 태도입니다. 그 태도를 알아차리면 같은 상황에서도 다른 순서를 고를 수 있게 됩니다.",
});

function safeText(value, max = 420) {
  return text(value, max).replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

function topicAndMode(input = {}, context = {}) {
  const topic = context?.inputSummary?.topic || input.topic;
  const safeTopic = Object.prototype.hasOwnProperty.call(TOPIC_GUIDANCE, topic) ? topic : "daily";
  const mode = (context?.inputSummary?.mode || input.mode) === "neo" ? "neo" : "yeoni";
  return { topic: safeTopic, mode };
}

function insightOf(context) {
  return context?.integratedInsight && typeof context.integratedInsight === "object"
    ? context.integratedInsight
    : {};
}

function evidenceFromAdapter(name, data) {
  if (!data || typeof data !== "object") return "";
  const meta = ADAPTER_EVIDENCE_LABELS[name] || { label: name, role: "보조 근거" };
  const candidates = [
    data.personalityHook,
    data.currentFlowSummary,
    data.seasonSummary,
    data.relationSummary,
    data.topicPalaceSummary,
    data.innerRhythm,
    data.relationshipPattern,
    data.emotionalPattern,
    data.currentMoodSummary,
    data.symbolicMessage,
    data.nakshatraSummary,
    data.padaSummary,
    data.moonSignSummary,
    data.venusSummary,
    data.marsSummary,
    data.saturnSummary,
    data.todayMansion,
    data.dayMaster,
  ];
  const value = candidates.map((item) => safeText(item, 240)).find(Boolean);
  return value ? `${meta.label}의 ${meta.role} 근거는 ${value}` : "";
}

function collectEvidence(context, topic) {
  const priority = GUARDIAN_TOPIC_ADAPTER_PRIORITY[topic] || GUARDIAN_TOPIC_ADAPTER_PRIORITY.daily;
  const available = new Set(Array.isArray(context?.availableSystems) ? context.availableSystems : []);
  return priority
    .filter((name) => available.has(name))
    .map((name) => evidenceFromAdapter(name, context?.[name]))
    .filter(Boolean)
    .slice(0, 3);
}

function adapterQuestionAnchors(name, data) {
  if (!data || typeof data !== "object") return [];
  const fields = ADAPTER_QUESTION_FIELDS[name] || [];
  const values = [];
  for (const field of fields) {
    if (field === "cards") {
      for (const card of Array.isArray(data.cards) ? data.cards : []) {
        const cardValue = safeText(card?.meaningSummary || card?.name, 150);
        if (cardValue) values.push(cardValue);
      }
      continue;
    }
    if (Array.isArray(data[field])) {
      values.push(...data[field].map((item) => safeText(item, 150)).filter(Boolean));
      continue;
    }
    const value = safeText(data[field], 180);
    if (value) values.push(value);
  }
  // 2026-09-03: 본문 하한이 2,600자로 오르면서 앵커 2개로는 coreReading 을 채울 수 없어
  // 4개까지 모은다. 3·4번째는 buildQuestionSpecificEvidence 의 보강 문장에서 쓴다.
  return [...new Set(values)].slice(0, 4);
}

function buildQuestionSpecificEvidence(context, questionFocus) {
  const requested = context?.inputSummary?.category;
  const available = Array.isArray(context?.availableSystems) ? context.availableSystems : [];
  const category = available.includes(requested) ? requested : available[0];
  const meta = ADAPTER_EVIDENCE_LABELS[category];
  if (!category || !meta) {
    return `질문의 핵심은 ${questionFocus.label}입니다. 계산 가능한 근거가 충분하지 않은 부분은 단정하지 않고, 지금 확인할 수 있는 행동을 기준으로 답하겠습니다.`;
  }
  const anchors = adapterQuestionAnchors(category, context?.[category]);
  const perspective = ADAPTER_QUESTION_PERSPECTIVES[category] || meta.role;
  const specialistMove = ADAPTER_QUESTION_SPECIALIST_MOVES[category] || "계산 근거를 현재의 선택 기준으로 번역합니다.";
  // 앵커가 더 있으면 근거를 버리지 않고 한 문장 더 붙인다(하한 2,600자를 계산 근거로 채우는 자리).
  const extraAnchors = anchors.slice(2).filter(Boolean);
  const extraSentence = extraAnchors.length
    ? ` 여기에 “${extraAnchors.join("”, “")}”라는 근거도 함께 놓이는데, 이 값들은 결론을 하나로 좁히기보다 지금 상황을 어느 각도에서 봐야 하는지를 알려 줍니다.`
    : "";
  if (anchors.length >= 2) {
    return `“${questionFocus.label}”에 관한 질문에 ${meta.label}은 ${perspective}의 관점에서 “${anchors[0]}”, “${anchors[1]}”라는 계산 근거를 함께 보여줍니다.${extraSentence} ${specialistMove} 그래서 답은 서두른 결론보다 이 두 흐름이 실제 상황에서 어떻게 반복되는지 확인하는 데 있습니다.`;
  }
  if (anchors.length === 1) {
    return `“${questionFocus.label}”에 관한 질문에 ${meta.label}은 ${perspective}의 관점에서 “${anchors[0]}”라는 계산 근거를 보여줍니다. ${specialistMove} 이 근거 하나로 결론을 정하지 않고, 지금의 선택에서 확인할 기준으로 쓰겠습니다.`;
  }
  return `“${questionFocus.label}”에 관한 질문을 ${meta.label}의 ${perspective} 관점에서 읽되, 계산 결과에 없는 정보는 덧붙이지 않겠습니다. 확정할 수 없는 부분을 비워 두는 대신, 지금 확인 가능한 사실과 오늘 조절할 수 있는 행동을 기준으로 흐름을 정리하겠습니다.`;
}

/** 선택한 체계의 심화 문단. 없는 체계면 빈 문자열이라 문장이 겹치지 않는다. */
function deepReadingFor(context) {
  const requested = context?.inputSummary?.category;
  const available = Array.isArray(context?.availableSystems) ? context.availableSystems : [];
  const category = available.includes(requested) ? requested : available[0];
  return ADAPTER_DEEP_READINGS[category] || "";
}

function unavailableNote(context) {
  const claims = Array.isArray(context?.unavailableClaims) ? context.unavailableClaims : [];
  if (!claims.length) {
    return "계산되지 않은 영역은 억지로 단정하지 않고, 확인 가능한 흐름만 바탕으로 읽었습니다. 그래서 이 해석은 앞날을 못 박기 위한 것이 아니라, 지금 마음이 어디에서 힘을 쓰고 있는지 되짚어 보기 위한 자리에 가깝습니다.";
  }
  return "생시나 출생지처럼 조건이 필요한 영역은 제외하고, 이번 결과에서 계산된 흐름만 바탕으로 읽었습니다. 빠진 조건이 있다는 것은 해석이 틀렸다는 뜻이 아니라, 확신의 폭을 좁혀서 말한다는 뜻입니다. 나중에 그 정보가 채워지면 같은 흐름을 더 구체적으로 볼 수 있어요.";
}

function buildModeVoice(mode, topic, hook) {
  if (mode === "neo") {
    return `네오식으로 정리하면, ${hook || `${getTopicContract(topic).label}의 핵심은 속도보다 순서야.`} 감으로 밀어붙일 판은 아니고, 확인할 조건을 줄이면 움직일 타이밍이 보인다.`;
  }
  return `연이가 조용히 찻잔을 건네듯 보면, ${hook || `${getTopicContract(topic).label}의 흐름은 서두르기보다 마음과 현실의 순서를 맞추는 데 있어요.`} 오늘은 작은 확인 하나가 다음 장면을 부드럽게 열어줄 수 있어요.`;
}

function buildPremiumReason(insight, topic) {
  return safeText(insight.premiumBridge, 360)
    || `${getTopicContract(topic).label}의 흐름을 더 깊게 살펴보고 싶다면, 다음 상담에서 반복되는 패턴과 선택의 조건을 이어서 확인할 수 있어요.`;
}

/**
 * Creates a complete result from already-calculated context, without using
 * raw birth input or pretending that unavailable calculations exist.
 */
export function buildContextDrivenGuardianFallback({ input = {}, context = {}, reason = "" } = {}) {
  const { topic, mode } = topicAndMode(input, context);
  const questionFocus = buildFortuneQuestionFocus({ concern: input.concern, topic });
  const insight = insightOf(context);
  const guidance = TOPIC_GUIDANCE[topic];
  const contract = getTopicContract(topic);
  const cta = getDefaultCta(topic);
  const hook = safeText(insight.openingHook, 360);
  const theme = safeText(insight.currentTheme, 360) || `${contract.label}은 ${guidance.focus}를 정리할수록 방향이 선명해지는 흐름입니다.`;
  const concern = safeText(insight.likelyConcern, 300) || `${contract.label}에서 무엇부터 확인해야 마음이 놓일지 고민하는 흐름`;
  const advice = safeText(insight.adviceDirection, 240) || "결정보다 확인 가능한 다음 행동";
  const caution = safeText(insight.cautionPattern, 300) || guidance.caution;
  const action = safeText(insight.luckyActionHint, 320) || guidance.action;
  const evidence = collectEvidence(context, topic);
  const questionEvidence = buildQuestionSpecificEvidence(context, questionFocus);
  const deepReading = deepReadingFor(context)
    || "계산된 근거가 제한적일 때는 결론을 넓히기보다, 확인 가능한 사실 위에서만 읽는 편이 안전합니다. 지금 흐름도 정해진 결말을 알려주기보다 오늘 조절할 수 있는 범위를 보여주는 쪽에 가깝습니다.";
  const evidenceSentence = evidence.length >= 2
    ? evidence.length >= 3
      ? `${evidence[0]}라는 단서, ${evidence[1]}라는 흐름, 그리고 ${evidence[2]}라는 상징이 같은 방향을 겹쳐 가리킵니다. 서로 다른 체계가 반복해서 찍어주는 지점은 오늘의 핵심 패턴으로 우선 봅니다.`
      : `${evidence[0]}라는 단서와 ${evidence[1]}라는 흐름이 같은 방향을 가리킵니다. 서로 다른 체계가 반복해서 가리키는 지점은 오늘의 핵심 패턴으로 우선 봅니다.`
    : evidence.length === 1
      ? `${evidence[0]}라는 단서가 이번 해석의 중심에 놓입니다. 다만 한 체계의 근거만으로 모든 결론을 확정하지는 않고, 낮은 확신의 조언으로 정리합니다. 근거가 하나일 때는 그 신호가 가리키는 방향보다, 그 신호가 언제 반복되는지를 보는 편이 더 정확합니다.`
      : "계산된 흐름은 감정과 현실의 순서를 함께 살필 때 더 선명해집니다. 지금은 확정할 수 있는 값이 적은 만큼, 결론을 넓히기보다 오늘 확인 가능한 범위 안에서만 읽겠습니다.";

  const baseResult = {
    title: GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS.title,
    openingLine: buildModeVoice(mode, topic, hook),
    innerState: `지금 마음에는 ${concern}이(가) 함께 놓여 있어 보여요. ${hook || "겉으로는 괜찮아 보여도 속에서는 이미 여러 가능성을 비교하고 있는 모습"}이(가) 있어, 감정을 억지로 밀어내기보다 내가 확인할 수 있는 부분과 조금 더 기다려야 하는 부분을 나누는 것이 좋아요. ${guidance.reframe} ${unavailableNote(context)}`,
    coreReading: `${theme} ${evidenceSentence} 이 근거는 미래를 정해두는 선언이 아니라, 오늘 부담을 줄이는 순서를 찾기 위한 재료에 가깝습니다. ${deepReading} ${buildModeVoice(mode, topic, "지금은 한 번에 모든 답을 얻으려 하기보다, 가장 영향이 큰 변수부터 확인해")} 그 과정을 거치면 마음이 앞서 만든 결론과 실제 상황 사이의 간격도 조금씩 좁혀질 수 있어요.`,
    topicAdvice: `${contract.label}에서 오늘의 기준은 ${advice}입니다. ${guidance.focus}를 먼저 적고, 상대나 환경의 반응을 기다리는 일과 내가 바로 조절할 수 있는 일을 구분해보세요. ${guidance.checkpoint} ${action} 작은 확인을 거친 뒤에도 같은 선택이 남는다면 그때 한 단계 더 나아가면 됩니다.`,
    cautionPattern: `오늘 조심할 반복 패턴은 ${caution}입니다. 마음이 급해질수록 한 번 멈추고 지금 가진 정보가 충분한지 확인해보세요. ${guidance.rhythm} 불안한 상태에서 내린 결론은 실제 상황보다 더 크게 느껴질 수 있으니, 되돌릴 수 있는 행동부터 고르는 편이 안전합니다.`,
    luckyAction: `${action} 이 행동은 상황을 바꾸기 위한 것이 아니라, 지금 흐름이 실제로 어떻게 움직이는지 확인하기 위한 것입니다. 해보고 나서 마음이 조금이라도 가벼워졌다면 그 방향을 하루만 더 이어가 보고, 별 변화가 없다면 다음에는 다른 조건 하나를 바꿔서 시험해보세요. 되돌릴 수 있는 크기로 움직이면 결과가 어느 쪽이든 다음 판단의 재료가 됩니다. 오늘 한 일과 그때의 기분을 저녁에 한 줄로만 남겨 두면, 다음에 같은 고민이 돌아왔을 때 처음부터 다시 재지 않아도 돼요. ${contract.label}에서 쌓이는 것은 대단한 결심이 아니라 이렇게 남겨 둔 기준 몇 줄입니다.`,
    premiumCta: {
      ctaKey: cta.ctaKey,
      label: cta.label,
      targetPath: cta.targetPath,
      reason: buildPremiumReason(insight, topic),
    },
    shareText: `${GUARDIAN_FORTUNE_MODE_SHARE_HINTS[mode]} ${contract.shareHint}`,
    _reason: reason,
  };
  return {
    ...baseResult,
    openingLine: `${baseResult.openingLine} 지금 답할 질문은 ${questionFocus.answerFrame}입니다. 이 질문을 좋고 나쁨으로 가르기보다, 지금 흐름이 어느 방향으로 기울어 있고 그 안에서 내가 조절할 수 있는 폭이 어디까지인지를 함께 살펴볼게요.`,
    innerState: `지금 질문은 ${questionFocus.answerFrame}에 대한 답을 찾고 있어요. ${baseResult.innerState} 이런 질문이 떠올랐다는 것 자체가 이미 상황을 한참 들여다봤다는 뜻이기도 해요. 그러니 지금 필요한 것은 더 열심히 고민하는 일이 아니라, 고민의 범위를 오늘 안에 확인 가능한 크기로 줄이는 일에 가깝습니다.`,
    coreReading: `${questionEvidence} ${baseResult.coreReading}`,
    topicAdvice: `질문에 바로 답하면, ${questionFocus.answerFrame}에서는 ${advice}가 먼저입니다. ${questionFocus.actionFrame} ${baseResult.topicAdvice} 이 조언을 오늘 안에 다 지키려 하지 않아도 괜찮아요. 순서대로 한 가지만 확인해도 다음에 무엇을 물어야 할지가 훨씬 또렷해집니다.`,
    cautionPattern: `${baseResult.cautionPattern} 이 패턴이 나타난다고 해서 잘못하고 있다는 뜻은 아니에요. 다만 ${guidance.focus}를 건너뛴 채 결론부터 정하려 할 때 같은 자리에서 다시 지치기 쉬우니, 오늘은 그 순서만 지켜 보세요.`,
    evidenceLines: buildEvidenceLines(evidence, contract),
    followUpQuestions: buildFollowUpQuestions(topic, contract),
  };
}

/**
 * 결과 카드에 "무엇을 근거로 이렇게 읽었는가"를 3~5줄로 드러낸다.
 * 서버가 실제로 가진 근거만 쓰고, 모자라면 체계 역할 설명으로 채운다.
 */
function buildEvidenceLines(evidence, contract) {
  const lines = evidence.map((entry) => safeText(entry, 120)).filter(Boolean);
  const filler = [
    `${contract.label}의 흐름은 한 장면이 아니라 반복되는 선택 습관에서 읽습니다.`,
    "생시나 출생지가 없는 부분은 확정하지 않고 낮은 확신으로 남겨 둡니다.",
    "같은 방향을 두 번 이상 가리키는 신호를 우선 근거로 삼습니다.",
  ];
  for (const line of filler) {
    if (lines.length >= 3) break;
    if (!lines.includes(line)) lines.push(line);
  }
  return lines.slice(0, 5);
}

/** 대화를 잇는 동력. 주제마다 다음에 물어볼 만한 질문을 3개 제안한다. */
const FOLLOW_UP_QUESTIONS = Object.freeze({
  daily: ["오늘 중 가장 미루고 있는 일은 뭘까요?", "지금 몸과 마음 중 어디가 더 지쳐 있나요?", "내일로 넘겨도 괜찮은 일은 무엇인가요?"],
  love: ["상대에게 먼저 연락해도 될까요?", "지금 이 관계에서 제가 바라는 건 뭘까요?", "기다리는 게 나을 시기인가요?"],
  money_work: ["지금 이직을 고민해도 될 시기인가요?", "이번 달 지출에서 먼저 줄일 곳은 어디인가요?", "제가 잘하는 일로 돈을 벌 방법이 있을까요?"],
  relationship: ["그 사람과 거리를 둬야 할까요?", "제가 반복하는 관계 패턴은 뭘까요?", "먼저 사과하는 게 맞을까요?"],
  mind: ["요즘 마음이 무거운 이유가 뭘까요?", "지금 내려놓아도 되는 걱정은 무엇인가요?", "회복에 도움이 되는 하루 리듬은요?"],
  decision: ["두 선택지 중 어느 쪽이 저다울까요?", "지금 결정해야 할 만큼 급한 일인가요?", "결정 전에 확인해야 할 조건은 뭔가요?"],
});

function buildFollowUpQuestions(topic, contract) {
  const questions = FOLLOW_UP_QUESTIONS[topic] || FOLLOW_UP_QUESTIONS.daily;
  return questions.map((question) => safeText(question, 60)).filter(Boolean).slice(0, 3)
    .concat(`${contract.label}에서 더 궁금한 점이 있나요?`)
    .slice(0, 3);
}

export { TOPIC_GUIDANCE };
