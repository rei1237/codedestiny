// Threads 연이의 마음 노트 — 20:30 KST. 기존 karma job ID와 중복 방지 키를 보존한다.
//
// 계산 점술이 아니라 관계·일·소비의 반복 패턴을 돌아보는 글이다. facts 는 엔진 값이 아니라
// 아래 THEMES 에서 날짜로 고른 주제 카드 하나다. 모델은 그 카드의 생각을 반말 짧은 이야기로 옮기기만 한다.
// 🔴 경전 인용은 카드에 적힌 것만 쓴다. 카드에 없는 경전·성인 이름이 나오면 그 필드를 버린다(지어낸 인용 금지).
// 🔴 전생·업보를 독자 개인에게 단정하지 않는다("너는 전생에 ~였다", "벌 받는다" 금지). 실존 인물·가문 이야기 금지.
// 구체적인 장면·확인할 기준·경험 질문 하나로 완결하며 홍보 링크를 붙이지 않는다.

import { getKstDateParts } from "../daily-fortune-task.js";
import {
  CASUAL_RULES,
  generateJsonCopy,
  kstDateLabel,
  mergeCopy,
} from "./shared.js";

export const TYPE = "karma";
export const PATH = "/karma-destiny-ai/";
export const HASHTAG = "꿀꿀운세";
export const CTA = "내 사주에 반복되는 패턴 보기";
export const SCOPE = "생활 패턴을 돌아보는 글 · 개인 예측 아님";

const GITA = "바가바드 기타";
const DHAMMAPADA = "법구경";
const ANGUTTARA = "앙굿따라 니까야";

/**
 * 주제 카드. idea 는 모델에게 주는 생각, quote 는 그대로 인용해도 되는 한 줄(없으면 인용하지 않는다),
 * fallback 은 모델이 꺼져 있거나 문장이 검증에서 버려질 때 그대로 나가는 사람 손 문장이다.
 */
export const THEMES = Object.freeze([
  {
    "id": "reply-speed",
    "idea": "연락 속도보다 반복되는 약속과 태도를 살핀다.",
    "fallback": {
      "hook": "답장은 빠른데 약속은 늘 내가 잡고 있다면?",
      "body": "연락이 빠르면 관심도 크다고 느끼기 쉬워. 그런데 만날 날짜를 정하거나 약속을 지키는 일은 또 다를 수 있어. 답장 하나로 마음을 결론 내리기보다, 말과 행동이 함께 이어지는지 살펴봐.",
      "tip": "관심을 느끼는 쪽은 빠른 답장, 꾸준한 약속 중 뭐야?"
    }
  },
  {
    "id": "cant-say-no",
    "idea": "거절과 관계의 단절을 구분한다.",
    "fallback": {
      "hook": "괜찮다고 했는데, 집에 오면 지치는 약속 있어?",
      "body": "싫지 않은 사람이어도 오늘 만날 여유는 없을 수 있어. 모든 부탁을 받아줘야 다정한 건 아니야. 이번 주는 어렵고 다음 주는 가능하다고 말하면, 관계를 지키면서 내 일정도 설명할 수 있어.",
      "tip": "거절할 때 더 어려운 건 첫마디야, 이유 설명이야?"
    }
  },
  {
    "id": "money-leak",
    "idea": "작은 반복 지출을 비난 없이 돌아본다.",
    "fallback": {
      "hook": "큰돈 쓴 건 없는데 생활비가 빠듯하다면?",
      "body": "배달비, 구독료, 잠깐 들른 편의점. 하나씩은 작아 보여도 모이면 부담이 돼. 의지가 약하다고 몰아붙이기보다 이번 주 내역에서 반복되는 항목 하나만 찾아봐. 필요한 지출까지 죄책감 가질 필요는 없어.",
      "tip": "내역을 볼 때 더 놀라는 건 구독료야, 자잘한 결제야?"
    }
  },
  {
    "id": "comparison",
    "idea": "비교의 기준에 보이지 않는 조건을 포함한다.",
    "fallback": {
      "hook": "친구 소식은 반가운데 내 속도가 느려 보일 때.",
      "body": "이직, 결혼, 새집 소식은 한 장면으로 전해져. 그 전에 들인 시간이나 도움받은 조건까지 다 보이진 않아. 축하하는 마음과 조급한 마음이 함께 있어도 괜찮아. 내 다음 단계는 내 조건으로 정해 봐.",
      "tip": "요즘 지키고 싶은 건 속도야, 방향이야?"
    }
  },
  {
    "id": "apology",
    "idea": "사과의 말과 뒤따르는 변화를 함께 본다.",
    "fallback": {
      "hook": "미안하다는 말은 많은데 같은 일이 반복된다면?",
      "body": "사과를 들으면 이번에는 다르길 바라게 돼. 그 마음이 잘못된 건 아니야. 다만 다음에 무엇을 바꿀지 구체적으로 정했는지도 살펴봐. 좋은 말뿐 아니라 작게라도 달라진 행동이 있어야 신뢰를 다시 쌓기 쉬워.",
      "tip": "사과에서 더 필요한 건 설명이야, 다음 행동이야?"
    }
  },
  {
    "id": "weekend",
    "idea": "휴식도 하루의 필요한 선택이다.",
    "fallback": {
      "hook": "쉬는 날인데 아무것도 안 하면 불안해?",
      "body": "휴일에도 뭔가 남겨야 할 것 같아서 일정을 채울 때가 있어. 그런데 평일의 피로까지 밀어두면 쉬는 시간도 숙제처럼 느껴져. 오늘은 할 일 하나를 덜고, 실제로 편안했던 시간을 잠깐 떠올려 봐.",
      "tip": "쉬었다는 느낌은 혼자 있을 때 와, 좋아하는 사람 만날 때 와?"
    }
  },
  {
    "id": "work-boundary",
    "idea": "일을 잘하는 것과 모든 일을 맡는 것은 다르다.",
    "fallback": {
      "hook": "일 잘한다는 말을 듣는데 내 일은 자꾸 밀려?",
      "body": "도와주다 보면 내 마감이 뒤로 가기도 해. 부탁을 받았을 때 바로 가능하다고 하기 전에 지금 맡은 일부터 알려줘. 어떤 일을 먼저 할지 함께 정하면 혼자 끌어안는 부담을 줄이는 데 도움이 돼.",
      "tip": "부탁받을 때 먼저 확인하는 건 마감이야, 내 여유야?"
    }
  },
  {
    "id": "familiar",
    "idea": "익숙함과 편안함의 차이를 살핀다.",
    "fallback": {
      "hook": "끌리는 사람과 편안한 사람이 다를 때.",
      "body": "자주 겪었던 관계는 익숙해서 빠르게 가까워질 수 있어. 그렇다고 그 관계가 내게 잘 맞는다는 뜻은 아니야. 만나기 전의 설렘뿐 아니라 헤어진 뒤 내 마음이 어떤지도 함께 살펴봐.",
      "tip": "관계에서 더 오래 기억나는 건 설렘이야, 편안함이야?"
    }
  },
  {
    "id": "unfinished",
    "idea": "큰 목표를 작게 끝낼 수 있는 단위로 바꾼다.",
    "fallback": {
      "hook": "계획은 세웠는데 시작할 엄두가 안 난다면?",
      "body": "한 번에 잘해야 한다고 생각하면 첫 단계부터 무거워져. 방 정리 대신 책상 한쪽, 운동 계획 대신 운동화 꺼내기처럼 줄여 봐. 작게 시작했다고 목표가 작아지는 건 아니야.",
      "tip": "시작을 돕는 건 시간 정하기야, 할 일 줄이기야?"
    }
  },
  {
    "id": "boundaries",
    "idea": "친밀함과 즉시 응답 의무를 구분한다.",
    "fallback": {
      "hook": "친하면 언제든 답장해야 하는 걸까?",
      "body": "가까운 사이여도 각자의 일정과 쉬는 시간이 있어. 답이 늦다는 이유 하나로 서운함을 결론 내리기 전에 평소 연락 방식을 나눠 봐. 급한 일은 어떻게 알릴지도 정하면 불필요한 오해를 줄일 수 있어.",
      "tip": "편한 연락은 짧게 자주야, 여유 있을 때 길게야?"
    }
  },
  {
    "id": "praise",
    "idea": "작은 노력을 구체적으로 알아본다.",
    "fallback": {
      "hook": "잘한 일보다 실수한 장면만 떠오르는 밤이라면.",
      "body": "하루를 돌아볼 때 틀린 말 하나가 크게 남기도 해. 그 옆에 끝낸 일과 애쓴 순간도 같이 놓아 봐. 무리해서 좋게 해석할 필요는 없어. 오늘을 평가할 재료를 조금 더 고르게 모으는 거야.",
      "tip": "오늘의 나에게 해 주고 싶은 짧은 말 있어?"
    }
  },
  {
    "id": "choice",
    "idea": "선택의 어려움을 포기하기 싫은 조건으로 풀어본다.",
    "fallback": {
      "hook": "결정을 못 하는 게 아니라 둘 다 놓치기 싫은 걸 수도.",
      "body": "선택지를 계속 비교해도 답이 안 나오면 내가 지키고 싶은 조건부터 적어 봐. 익숙함, 시간, 수입처럼 기준을 분리하면 무엇 때문에 망설이는지 보이기 쉬워. 모든 장점을 한 번에 갖기는 어려울 수 있어.",
      "tip": "선택할 때 더 큰 기준은 안정감이야, 새 경험이야?"
    }
  },
  {
    "id": "thanks",
    "idea": "고마움을 구체적인 장면으로 전한다.",
    "fallback": {
      "hook": "고맙다는 말, 나중에 하려다 놓친 적 있어?",
      "body": "큰 도움만 고마운 건 아니야. 말없이 기다려 준 시간이나 바쁜데도 확인해 준 메시지도 마음에 남을 수 있어. 오늘 떠오른 장면이 있다면 길게 쓰지 않아도 돼. 어떤 점이 고마웠는지 한 줄이면 충분해.",
      "tip": "마음이 남는 표현은 말이야, 작은 행동이야?"
    }
  },
  {
    "id": "reunion",
    "idea": "그리움과 다시 시작할 조건을 구분한다.",
    "fallback": {
      "hook": "보고 싶다는 마음만으로 다시 시작해도 될까?",
      "body": "그리움이 남았다고 지난 문제가 해결된 건 아닐 수 있어. 다시 연락할지 고민된다면 헤어진 이유와 지금 달라진 조건을 나눠 적어 봐. 상대의 마음은 추측으로 채우지 말고, 내 경계부터 확인해 봐.",
      "tip": "다시 만남에서 더 확인하고 싶은 건 마음이야, 달라진 행동이야?"
    }
  },
  {
    "id": "result",
    "idea": "통제할 수 있는 행동과 결과를 구분한다.",
    "source": "바가바드 기타",
    "quote": "너에게는 행위에 대한 권리만 있을 뿐, 그 결과에 대한 권리는 없다.",
    "fallback": {
      "hook": "열심히 했는데 결과가 아쉬운 날도 있지.",
      "body": "바가바드 기타의 한 구절이야. '너에게는 행위에 대한 권리만 있을 뿐, 그 결과에 대한 권리는 없다.' 결과에는 내 노력 밖의 조건도 얽혀 있어. 아쉬움을 없는 척하기보다, 오늘 해낸 일과 다음에 바꿀 일을 나눠 봐.",
      "tip": "다시 힘이 나는 건 쉬는 시간이야, 작은 완료야?"
    }
  }
]);

// 카드에 없는 경전·성인 이름이 문장에 나오면 지어낸 인용이다 — 그 필드를 버린다.
const SOURCE_VOCABULARY = [GITA, DHAMMAPADA, ANGUTTARA, "기타에", "크리슈나", "아르주나", "우파니샤드", "베다", "성경", "예수", "공자", "노자", "도덕경", "금강경", "반야심경", "니까야", "붓다", "부처"];
const SOURCE_ALIASES = { [GITA]: [GITA, "기타에", "크리슈나", "아르주나"], [DHAMMAPADA]: [DHAMMAPADA, "붓다", "부처"], [ANGUTTARA]: [ANGUTTARA, "니까야", "붓다", "부처"] };
// 독자 개인에게 업보·전생을 단정하거나 겁주는 말.
const FORBIDDEN = ["전생에 너", "전생에 당신", "너는 전생", "당신은 전생", "업보", "벌 받", "벌을 받", "죄를", "저주", "천벌", "병에 걸", "아프게 된", "망한다", "망할"];

function dayNumber(now) {
  const { y, m, d } = getKstDateParts(now);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** @returns {object} 날짜로 고른 주제 카드. 같은 날이면 같은 카드. */
export function buildFacts(_env, now) {
  const theme = THEMES[dayNumber(now) % THEMES.length];
  return {
    type: TYPE,
    dateLabel: kstDateLabel(now),
    themeId: theme.id,
    idea: theme.idea,
    source: theme.source || "",
    quote: theme.quote || "",
  };
}

function themeOf(facts) {
  return THEMES.find((theme) => theme.id === facts.themeId) || THEMES[0];
}

const SYSTEM_PROMPT = [
  "당신은 관계·일·소비·자기돌봄의 반복 패턴을 다루는 다정한 에디터다. 독자의 상황이나 책임을 단정하지 않는다.",
  "구성: 익숙한 일상 장면 → 확인할 기준과 작은 실천 → 경험을 나누기 쉬운 질문 하나. 카르마 용어를 억지로 붙이지 않는다.",
  "카르마는 벌이 아니라 습관과 의도의 반복이라는 관점을 지킨다. 독자에게 전생·업보·벌을 단정하지 않는다.",
  "실존 인물·연예인·기업 가문 이야기, 질병 이야기를 쓰지 않는다.",
  "facts.quote 가 있으면 그 문장만 그대로 인용할 수 있고 출처는 facts.source 로만 밝힌다. quote 가 없으면 어떤 경전도 인용하지 않는다.",
  CASUAL_RULES,
].join("\n");

export function buildPrompt(facts) {
  return [
    "facts — 오늘 밤의 카르마 주제 카드다. 검수된 주제의 관점을 지키고 구체적인 장면으로 풀어라.",
    JSON.stringify({ dateLabel: facts.dateLabel, idea: facts.idea, source: facts.source || null, quote: facts.quote || null }, null, 1),
    "",
    "다음 JSON 하나만 출력하라. 설명·코드펜스를 붙이지 마라.",
    "{",
    '  "hook": "독자가 알아볼 구체적인 장면 한 줄. 40자 이내.",',
    '  "body": "짧게 끊은 반말 4~5문장. 구체적인 장면, 확인할 기준, 작은 실천을 담는다. 190자 이내.",',
    '  "tip": "경험을 나누기 쉬운 질문 하나. 본문과 연결하고 개인정보·좋아요·댓글 보상 요구 금지. 45자 이내."',
    "}",
  ].join("\n");
}

function copyRules(facts) {
  const allowed = SOURCE_ALIASES[facts.source] || [];
  const quoteOk = (text) => !/['"‘“]/.test(text) || !facts.quote || text.includes(facts.quote.slice(0, 8));
  const base = { vocabulary: SOURCE_VOCABULARY, allowed, forbidden: FORBIDDEN, casual: true };
  return {
    hook: { ...base, min: 8, max: 40 },
    body: { ...base, min: 60, max: 190, validate: quoteOk },
    tip: { ...base, min: 8, max: 45 },
  };
}

/** @returns {Promise<{copy: Object<string,string>, model: string|null, rejected: string[]}>} */
export async function writeCopy(env, facts, { generateImpl, recent = [] } = {}) {
  const generated = await generateJsonCopy(env, { type: TYPE, systemPrompt: SYSTEM_PROMPT, prompt: buildPrompt(facts), generateImpl, recent });
  return mergeCopy(generated, copyRules(facts), { ...themeOf(facts).fallback });
}

export function format(facts, copy, _url) {
  const lines = [
    copy.hook,
    "",
    copy.body,
    "",
    copy.tip,
    `🌙 ${facts.dateLabel} 연이의 마음 노트 · ${SCOPE}`,
  ];
  return [...lines, "#꿀꿀운세"].join("\n");
}
