/**
 * Guardian Fortune Stage 7 runtime contract.
 *
 * The browser-facing TypeScript contract lives under src/features/guardian-fortune.
 * Worker code keeps a small serializable projection here because Worker modules
 * must not import the TypeScript feature barrel or payment implementation.
 */

/**
 * 산문 필드(VISIBLE_RESULT_FIELDS)의 합계 길이 계약.
 * 무료 3회 이후 1회 5,000원을 받게 되면서 800~1,500자에서 상향했다(2026-08-07).
 * 그 뒤에도 "5,000원치고 분량이 적다"는 지적이 있어 1,500~2,500자에서 한 번 더
 * 올렸다(2026-09-03). 필드를 늘리지 않고 기존 6개 산문 필드의 합계만 키운 것이라
 * 결과 스키마·렌더러는 그대로다.
 * 🔴 이 값을 올리면 폴백(guardian-fortune-fallback.js)과 enrich(guardian-fortune-result.js)가
 * 새 하한을 스스로 채울 수 있는지 함께 확인해야 한다 — 못 채우면 LLM 실패 시 폴백까지
 * 검증에서 탈락해 요청이 통째로 실패한다. 판정은 scripts/verify-fortune-chat-reading.mjs.
 * followUpQuestions·evidenceLines 는 목록이라 이 합계에 넣지 않는다 — 넣으면 길이를
 * 목록 개수로 채우는 우회가 생긴다.
 */
export const GUARDIAN_FORTUNE_RESULT_LENGTH = Object.freeze({
  min: 2600,
  max: 3600,
});

/** 후속 질문 제안(대화를 잇는 동력)과 근거 줄(선택 체계의 계산 근거)의 개수 계약. */
export const GUARDIAN_FORTUNE_LIST_LIMITS = Object.freeze({
  followUpQuestions: Object.freeze({ min: 3, max: 3, maxLength: 60 }),
  evidenceLines: Object.freeze({ min: 3, max: 5, maxLength: 120 }),
});

export const GUARDIAN_FORTUNE_RESULT_FIELDS = Object.freeze([
  "title",
  "openingLine",
  "innerState",
  "coreReading",
  "topicAdvice",
  "cautionPattern",
  "luckyAction",
  "evidenceLines",
  "followUpQuestions",
  "premiumCta",
  "shareText",
]);

export const GUARDIAN_FORTUNE_TOPICS = Object.freeze({
  daily: Object.freeze({
    label: "오늘의 흐름",
    instruction: "오늘의 전체 흐름과 감정·현실의 균형, 바로 할 수 있는 행동을 중심으로 상담합니다.",
    shareHint: "오늘의 귀인 운세가 내 하루의 속도를 꽤 정확하게 짚어줬어.",
  }),
  love: Object.freeze({
    label: "연애/인연",
    instruction: "인연의 거리감, 연락과 기다림, 표현 방식, 관계에서 반복되는 패턴을 중심으로 상담합니다.",
    shareHint: "연이가 오늘 내 인연 흐름을 읽어줬어. 묘하게 내 상황 같아.",
  }),
  money_work: Object.freeze({
    label: "금전/일",
    instruction: "돈과 일의 우선순위, 현실적인 선택, 소비와 기회의 균형, 성과 압박을 중심으로 상담합니다.",
    shareHint: "오늘 내 일과 돈의 흐름을 현실적인 행동으로 풀어봤어.",
  }),
  relationship: Object.freeze({
    label: "인간관계",
    instruction: "관계의 거리감, 말투와 오해, 자존심, 주변 사람과의 에너지 교환을 중심으로 상담합니다.",
    shareHint: "내가 왜 어떤 사람 앞에서 자꾸 같은 방식으로 지치는지 보였어.",
  }),
  mind: Object.freeze({
    label: "마음/심리",
    instruction: "생각 과다와 감정 소모를 차분히 살피고, 진단이 아닌 회복을 위한 작은 행동으로 연결합니다.",
    shareHint: "오늘 내 마음의 피로가 어디서 시작됐는지 조금 알 것 같아.",
  }),
  decision: Object.freeze({
    label: "결정/선택",
    instruction: "선택의 기준, 지금 확인할 변수, 미루는 패턴, 실행 우선순위를 현실적인 언어로 정리합니다.",
    shareHint: "결정 앞에서 망설이는 이유를 운세보다 현실적인 언어로 정리해줬어.",
  }),
});

export const GUARDIAN_FORTUNE_CTA_BY_TOPIC = Object.freeze({
  daily: Object.freeze([
    Object.freeze({ ctaKey: "life_compass", label: "운명의 지도에서 더 보기", targetPath: "/destiny-compass" }),
  ]),
  love: Object.freeze([
    Object.freeze({ ctaKey: "love_strategy_ai", label: "연애 비책 전문가 상담", targetPath: "/love-secret-ai" }),
    Object.freeze({ ctaKey: "master_love_codex", label: "마스터 인연의 서", targetPath: "/master-love-codex" }),
    Object.freeze({ ctaKey: "sukuyo_compatibility", label: "숙요 궁합 전문가 상담", targetPath: "/sukuyo-compatibility-ai" }),
  ]),
  money_work: Object.freeze([
    Object.freeze({ ctaKey: "life_book_consultation", label: "인생의 책 전문가 상담", targetPath: "/life-book-ai" }),
    Object.freeze({ ctaKey: "neo_strategy_room", label: "네오 전략실", targetPath: "/neo-operation-room" }),
  ]),
  relationship: Object.freeze([
    Object.freeze({ ctaKey: "sukuyo_relationship", label: "숙요 궁합 전문가 상담", targetPath: "/sukuyo-compatibility-ai" }),
    Object.freeze({ ctaKey: "relationship_analysis", label: "관계 흐름 더 보기", targetPath: "/master-love-codex" }),
  ]),
  mind: Object.freeze([
    Object.freeze({ ctaKey: "destiny_cafe", label: "운명의 찻집에서 이어보기", targetPath: "/fortune-tea-house" }),
    Object.freeze({ ctaKey: "tarot_healing", label: "따뜻한 회복 타로", targetPath: "/tarot/healing" }),
    Object.freeze({ ctaKey: "life_book_consultation", label: "인생의 책 전문가 상담", targetPath: "/life-book-ai" }),
  ]),
  decision: Object.freeze([
    Object.freeze({ ctaKey: "tarot", label: "타로로 선택의 결 보기", targetPath: "/tarot/mingri" }),
    Object.freeze({ ctaKey: "neo_strategy_room", label: "네오 전략실", targetPath: "/neo-operation-room" }),
  ]),
});

export const GUARDIAN_FORTUNE_FORBIDDEN_RESULT_PATTERNS = Object.freeze([
  Object.freeze({ pattern: /무조건/g, replacement: "가능성을 높이려면" }),
  Object.freeze({ pattern: /반드시/g, replacement: "가능하면" }),
  Object.freeze({ pattern: /100\s*%/gi, replacement: "높은 가능성으로" }),
  Object.freeze({ pattern: /큰일\s*난다/g, replacement: "부담이 커질 수 있어요" }),
  Object.freeze({ pattern: /(?:지금\s*)?안\s*보면\s*(?:위험|후회|망한다)/g, replacement: "지금 확인해볼 만한 흐름이 있어요" }),
  Object.freeze({ pattern: /결제해야만\s*해결된다/g, replacement: "필요하다면 상담을 이어가며 정리할 수 있어요" }),
  Object.freeze({ pattern: /(?:결제|구매)하지\s*않으면\s*(?:위험|후회|망한다)/g, replacement: "필요하다면 다음 상담에서 더 차분히 확인할 수 있어요" }),
  Object.freeze({ pattern: /유료로\s*봐야만\s*답이\s*나온다/g, replacement: "더 깊은 질문은 다음 상담에서 이어갈 수 있어요" }),
  Object.freeze({ pattern: /상대(?:의)?\s*(?:마음|속마음)은?\s*(?:확실히|분명히|이미)?/g, replacement: "상대의 반응은 아직 단정하기보다" }),
  Object.freeze({ pattern: /상대는\s*(?:반드시|무조건|100\s*%)\s*(?:돌아온다|후회한다|연락한다|좋아한다)/g, replacement: "상대의 흐름은 시간을 두고 확인해보는 편이 좋아요" }),
  Object.freeze({ pattern: /이\s*인연은\s*(?:끝났다|반드시\s*된다|절대\s*안\s*된다)/g, replacement: "이 관계는 지금의 거리감과 반응을 더 확인해볼 필요가 있어요" }),
  Object.freeze({ pattern: /재회(?:가|는)?\s*(?:반드시|무조건|100\s*%)\s*(?:된다|안\s*된다)/g, replacement: "재회 가능성은 상대의 속도와 현실 조건을 함께 봐야 해요" }),
  Object.freeze({ pattern: /(?:확실히|분명히)\s*(?:된다|안\s*된다|돌아온다|성공한다|합격한다)/g, replacement: "흐름상 가능성을 살펴볼 수 있어요" }),
  Object.freeze({ pattern: /(?:무조건|반드시)\s*(?:재회|합격|성공|승진|대박|수익)/g, replacement: "가능성을 높일 조건" }),
  Object.freeze({ pattern: /결제하면\s*(?:해결|성공|좋아진다|운이\s*풀린다)/g, replacement: "필요하다면 더 깊게 정리할 수 있어요" }),
  Object.freeze({ pattern: /(?:무조건|반드시)\s*이별한다/g, replacement: "관계의 거리감을 더 확인해볼 필요가 있어요" }),
  Object.freeze({ pattern: /투자하면\s*오른다/g, replacement: "투자 판단은 조건과 위험을 따로 검토해보세요" }),
  Object.freeze({ pattern: /(?:수익|주가|코인)이\s*(?:오른다|난다|보장된다)/g, replacement: "금전 판단은 위험과 조건을 따로 확인해보세요" }),
  Object.freeze({ pattern: /반드시\s*(?:매수|매도)해라/g, replacement: "매수·매도는 별도 조건을 확인해보세요" }),
  Object.freeze({ pattern: /대출해라/g, replacement: "대출 여부는 상환 조건을 먼저 확인해보세요" }),
  Object.freeze({ pattern: /병이\s*있다/g, replacement: "몸 상태가 걱정된다면 전문가의 확인을 받아보세요" }),
  Object.freeze({ pattern: /치료가\s*필요하다/g, replacement: "필요하다면 전문가에게 상담을 받아보세요" }),
  Object.freeze({ pattern: /(?:우울증|공황|불안장애|질병)이다/g, replacement: "마음이나 몸 상태가 걱정된다면 전문가의 확인을 받아보세요" }),
  Object.freeze({ pattern: /고소하면\s*이긴다/g, replacement: "법률 판단은 전문가와 사실관계를 확인해보세요" }),
  Object.freeze({ pattern: /소송(?:하면)?\s*(?:이긴다|진다)/g, replacement: "법률 판단은 전문가와 사실관계를 확인해보세요" }),
]);

export const GUARDIAN_FORTUNE_MODE_SHARE_HINTS = Object.freeze({
  yeoni: "연이가 오늘 내 마음결을 읽어줬어. 생각보다 내 얘기 같아서 놀랐어.",
  neo: "네오가 오늘의 핵심만 조용히 짚어줬어. 짧은데 묘하게 맞아.",
});

export const GUARDIAN_FORTUNE_SAFE_RESULT_DEFAULTS = Object.freeze({
  title: "오늘의 귀인 운세",
  yeoniOpening: "연이가 보기엔, 지금은 마음을 다그치기보다 이미 보이는 흐름을 천천히 확인할 때에 가까워 보여요.",
  neoOpening: "네오가 보기엔, 지금 필요한 건 운을 기다리는 일이 아니라 보이는 선택지를 정리하는 일이야.",
});

export function getTopicContract(topic) {
  return GUARDIAN_FORTUNE_TOPICS[topic] || GUARDIAN_FORTUNE_TOPICS.daily;
}

export function getTopicCtas(topic) {
  return GUARDIAN_FORTUNE_CTA_BY_TOPIC[topic] || GUARDIAN_FORTUNE_CTA_BY_TOPIC.daily;
}

export function getDefaultCta(topic) {
  return getTopicCtas(topic)[0];
}

export function isAllowedCta(topic, cta) {
  if (!cta || typeof cta !== "object") return false;
  return getTopicCtas(topic).some((candidate) => (
    candidate.ctaKey === cta.ctaKey
    && candidate.targetPath === cta.targetPath
  ));
}

export function getTopicShareHint(topic) {
  return getTopicContract(topic).shareHint;
}
