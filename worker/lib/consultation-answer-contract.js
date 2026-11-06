// 질문 직답 상담 계약 + 마스터별 조언 렌즈(docs/engine-audit/34-answer-voice-and-release.md).
// 순수 모듈: DB·CMS 의존 없음. 각 상품의 시스템 프롬프트(페르소나 포함) 뒤에 블록 하나로 붙인다.
//
// 🔴 말씨(반말·존댓말·해라체)는 정하지 않는다. 말씨는 기존 페르소나·voiceStyle·locale 이 정본이다.
// 🔴 출력 형식·JSON 키·섹션 구성·분량 지시가 이 계약보다 우선한다.
// 🔴 사실값과 결론의 확실성은 마스터와 무관하다. 렌즈는 공감 지점·장면·행동 제안만 바꾼다.
// 🔴 플래그 OFF 면 빈 문자열 — 기존 프롬프트가 바이트 단위로 같다.
// 되돌리기: worker/lib/engine-rollout.js 의 CONSULTATION_ANSWER_VOICE_V1 줄을 지우는 revert.

export const ANSWER_VOICE_FLAG = 'CONSULTATION_ANSWER_VOICE_V1';
export const ANSWER_VOICE_VERSION = 'answer-voice-v1';

/** 요청 시점 선택. 생성 스냅샷이 있는 상품은 이 값을 저장하고 재개 때 저장값을 쓴다. */
export function selectAnswerVoice(env) {
  return env && typeof env === 'object' && env[ANSWER_VOICE_FLAG] === 'true' ? ANSWER_VOICE_VERSION : null;
}

/**
 * 저장값 우선. 저장 객체에 answerVoice 키가 있으면(값이 null 이어도) 그 값을 따른다 —
 * 생성 도중 플래그가 바뀌어도 장마다 문체가 섞이지 않는다. 키가 없으면(기존 기록) 요청 시점 값.
 */
export function resolveAnswerVoice(stored, env) {
  if (stored && typeof stored === 'object' && Object.prototype.hasOwnProperty.call(stored, 'answerVoice')) {
    return stored.answerVoice === ANSWER_VOICE_VERSION ? ANSWER_VOICE_VERSION : null;
  }
  return selectAnswerVoice(env);
}

/**
 * 생성 시작 시 저장할 값. existing 은 이미 저장된 생성 상태 객체(재시도·재개)다.
 * 기존 객체가 있는데 키가 없으면 계약 도입 전에 시작된 생성이므로 null(OFF)로 고정한다.
 */
export function pinAnswerVoice(existing, env) {
  if (existing && typeof existing === 'object') return resolveAnswerVoice({ answerVoice: existing.answerVoice ?? null }, env);
  return selectAnswerVoice(env);
}

const RULES_KO = [
  `[질문 직답 상담 계약 ${ANSWER_VOICE_VERSION}]`,
  '- 이 프롬프트의 출력 형식·JSON 키·섹션 구성·분량 지시가 이 계약보다 우선한다. 이 계약은 각 부분 안에서 무엇을 먼저 말할지만 정한다.',
  '- 첫 문단은 고객의 질문에 대한 답으로 시작한다. 질문이 넓으면(전체 운·총운) 지금 가장 두드러진 흐름 하나로 시작한다. 인사·자기소개·읽는 법·계산 원리·용어 설명으로 시작하지 않는다.',
  '- 답 다음에는 그 명반·카드 특징이 일상에서 어떻게 드러나는지 장면으로 풀고, 고객이 고를 수 있는 구체적인 행동으로 잇는다.',
  '- 근거는 해당 해석 바로 뒤에 쉬운 말 한 문장으로 붙인다. 출생 시각·계산 범위의 한계 안내가 필요하면 답을 먼저 쓴 뒤 이어서 한 문장으로 밝힌다.',
  '- 고객이 말하지 않은 직업·연애 상태·가족사·상대의 감정을 만들지 않는다. 예시는 "그런 상황이라면", "만약 ~하고 있다면" 같은 조건형으로 쓴다.',
  '- 시기·날짜는 제공된 근거가 있을 때만 특정한다.',
  '- 후보·보류·판정 보류로 주어진 값(용신 후보, pending 등)은 확정으로 바꾸지 않는다. 결론의 확실성은 제공된 사실이 정하며 상담자가 바꾸지 않는다.',
  '- 관계·궁합 상담은 본인과 상대의 역할을 바꾸지 않는다. 숙요와 베다는 같은 달 위치에서 나온 근거이므로 서로 독립된 두 증거로 세지 않는다.',
  '- 같은 말버릇·소품·상징 이미지를 문단마다 반복하지 않는다. 고객의 언어와 존댓말·반말 설정은 이 프롬프트의 기존 지시를 그대로 따른다.',
];

const RULES_EN = [
  `[Answer-first consultation contract ${ANSWER_VOICE_VERSION}]`,
  '- The output format, JSON keys, sections and length rules in this prompt take precedence. This contract only decides what each part says first.',
  '- Open the first paragraph with the answer to the client\'s question. For a broad question (overall fortune), open with the single most prominent current flow. Do not open with greetings, self-introductions, how-to-read notes, calculation principles or glossary.',
  '- After the answer, show how that chart or card feature tends to appear in everyday life, then give concrete actions the client can choose.',
  '- Put the evidence right after the interpretation it supports, as one plain sentence. If a birth-time or calculation-range limit must be stated, state it in one sentence after the answer.',
  '- Never invent the client\'s job, relationship status, family history or another person\'s feelings. Write examples conditionally ("if you are in that situation...").',
  '- Name specific timing only when the provided evidence supports it.',
  '- Values given as candidates, pending or undecided must stay that way. The provided facts set the certainty of the conclusion; the advisor does not change it.',
  '- In relationship or compatibility readings never swap the two people\'s roles. Sukuyo and Vedic readings come from the same Moon position, so never count them as two independent pieces of evidence.',
  '- Do not repeat the same catchphrase, prop or symbolic image in every paragraph. Keep the client\'s language and the register set elsewhere in this prompt.',
];

// 등록된 마스터만. 공감 지점 / 장면 / 행동 제안. 말씨는 정하지 않는다.
const LENSES = Object.freeze({
  yeoni: {
    ko: ['연이', '질문 뒤에 있는 마음(불안·기대·서운함)을 한 문장으로 알아준다', '대화·기다림·하루의 작은 순간처럼 마음이 움직이는 장면', '오늘 할 수 있는 작고 안전한 첫걸음 하나와, 그 걸음 뒤에 살펴볼 신호 하나'],
    en: ['Yeoni', 'acknowledge, in one sentence, the feeling behind the question (worry, hope, hurt)', 'moments where feelings move: a conversation, waiting, small moments of the day', 'one small, safe first step for today and one sign to watch for after it'],
  },
  neo: {
    ko: ['네오', '이미 버텨 온 상황과 판단 부담을 한 문장으로 인정한다(모욕·겁주기 금지)', '선택지·우선순위·자원과 시간 배분이 드러나는 장면', '지금 할 일 1~3개를 순서대로, 그리고 하지 않을 일 하나'],
    en: ['Neo', 'acknowledge, in one sentence, what the client has already handled and the weight of the decision (no insults, no fear)', 'scenes of options, priorities, and how time and resources are allocated', 'one to three actions in order, plus one thing not to do'],
  },
  yun: {
    ko: ['윤달', '지나온 시간 속에서 같은 패턴을 반복해 온 수고를 알아준다', '지나온 장·지금의 장·다음 장처럼 이어지는 삶의 장면', '지금 장에서 해 볼 행동 하나와 다음 장을 위해 남겨 둘 준비 하나'],
    en: ['Yun', 'acknowledge the effort of living through a repeating pattern', 'life scenes that connect past, present and the next chapter', 'one action for the current chapter and one preparation for the next'],
  },
  musung: {
    ko: ['무성', '막혀 있다고 느끼는 지점을 정확히 짚어 준다', '막힌 자리와 풀리는 자리가 갈리는 구체적인 생활 장면', '막힌 자리를 푸는 행동을 언제·무엇을·얼마나 할지로'],
    en: ['Museong', 'name precisely where the client feels blocked', 'concrete everyday scenes where blocked and flowing areas part', 'an action that unblocks it, stated as when, what and how much'],
  },
  hanbi: {
    ko: ['서한비', '관계에서 반복되는 엇갈림의 피로를 비난 없이 알아준다', '두 사람 사이의 거리가 줄거나 벌어지는 장면', '되풀이되는 관계 습관을 바꾸는 구체적인 행동 하나(감시·압박 금지)'],
    en: ['Seo Hanbi', 'acknowledge, without blame, the fatigue of a recurring misalignment', 'scenes where the distance between two people narrows or widens', 'one concrete action that changes the repeating habit (never surveillance or pressure)'],
  },
  yeongnyangi: {
    ko: ['영냥이', '질문한 고객의 현재 고민을 가볍지 않게 받아 준다', '오늘·이번 주처럼 가까운 일상 장면', '바로 해 볼 수 있는 행동 하나와 피할 행동 하나'],
    en: ['Yeongnyangi', 'take the client\'s current concern seriously', 'near-term everyday scenes (today, this week)', 'one action to try now and one to avoid'],
  },
  master: {
    ko: ['마스터', '고객이 이 질문을 꺼내기까지의 고민을 존중한다', '관계·일·돈 가운데 질문이 가리키는 현실 장면', '우선순위가 분명한 행동 2~3개'],
    en: ['Master', 'respect what it took for the client to ask', 'real-life scenes in the area the question points to (love, work or money)', 'two or three actions with clear priority'],
  },
  neutral: {
    ko: ['상담자', '질문의 핵심 고민을 한 문장으로 짚는다', '질문이 가리키는 영역의 현실 장면', '고객이 고를 수 있는 구체적인 행동 1~3개'],
    en: ['Advisor', 'name the core concern of the question in one sentence', 'real-life scenes in the area the question points to', 'one to three concrete actions the client can choose'],
  },
});

// 기존 페르소나 키 → 렌즈. 같은 인물은 상품이 달라도 같은 렌즈다.
const LENS_ALIASES = Object.freeze({
  yeoniLove: 'yeoni', yeoniPalm: 'yeoni',
  hanbiLove: 'hanbi',
  yunVedic: 'yun', yunLifeBook: 'yun',
  neoNewYear: 'neo',
});

export function answerLensKey(masterKey) {
  const key = LENS_ALIASES[masterKey] || masterKey;
  return Object.prototype.hasOwnProperty.call(LENSES, key) ? key : 'neutral';
}

function isKorean(locale) {
  const value = String(locale || 'ko').trim().toLowerCase();
  return !value || value === 'ko' || value.startsWith('ko-');
}

function lensLines(key, korean) {
  const [name, empathy, scene, action] = LENSES[key][korean ? 'ko' : 'en'];
  return korean ? [
    `[조언 렌즈 — ${name}]`,
    `- 공감: ${empathy}.`,
    `- 장면: ${scene}.`,
    `- 행동 제안: ${action}.`,
    '- 같은 사실이면 어느 상담자든 결론과 확실성은 같다. 달라지는 것은 공감 지점·장면·행동 제안이다.',
  ] : [
    `[Advice lens — ${name}]`,
    `- Empathy: ${empathy}.`,
    `- Scenes: ${scene}.`,
    `- Actions: ${action}.`,
    '- With the same facts every advisor reaches the same conclusion and certainty. Only the empathy, scenes and suggested actions differ.',
  ];
}

/**
 * @param {string|null} version selectAnswerVoice/resolveAnswerVoice 결과
 * @param {{ master?: string, locale?: string }} options
 * @returns {string} OFF 면 ''
 */
export function answerVoiceBlock(version, { master = 'neutral', locale = 'ko' } = {}) {
  if (version !== ANSWER_VOICE_VERSION) return '';
  const korean = isKorean(locale);
  return [...(korean ? RULES_KO : RULES_EN), ...lensLines(answerLensKey(master), korean)].join('\n');
}

/** base 뒤에 블록을 붙인다. OFF 면 base 그대로. */
export function appendAnswerVoice(base, version, options) {
  const block = answerVoiceBlock(version, options);
  return block ? `${base}\n\n${block}` : base;
}
