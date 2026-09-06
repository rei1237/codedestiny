/**
 * 초융합 운세 프롬프트.
 *
 * 🔴 초융합은 단일 호출이 아니라 **2단계 · 9그룹 생성**이다(2026-09-06, 분량 30,000~40,000자 목표).
 *   · 1단계(6그룹 병렬): 체계별 섹션 하나씩. 사주 그룹이 제목·서문도 맡는다.
 *   · 2단계(3그룹 병렬): 1단계 산출 요약(buildFusionStageOneDigest)을 읽고 통합 리딩·시기/행동·결론을 쓴다.
 *   각 단계는 별도 HTTP 요청이라 120초 예산을 각자 쓴다. 단일 요청 안에서 늘리면 Gemini 출력
 *   상한(16,384토큰)과 엣지 시간 한도(~100s)에 먼저 걸려 잘리거나 결정론 폴백으로 떨어진다(2026-08-08 실측).
 * 선행 사례: worker/routes/ziwei-ai.js 의 SECTION_GROUP_SPECS.
 */

/** 분량 계약 정본. 검증(worker/lib/fusion-fortune.js)과 프롬프트가 같은 값을 본다. */
export const FUSION_FORTUNE_LENGTH = Object.freeze({
  // 하한은 "30,000원어치"의 기준선, 상한은 폭주 방지용 완충이다.
  // 🔴 상한을 목표(약 36,000자) 가까이 조이면, 그룹들이 조금씩 더 쓴 정상 결과가 반려돼
  //    결정론 폴백이 유료 결과로 나간다. 완충은 넉넉해야 한다.
  // 🔴 46,000 → 60,000 (2026-09-06). 목표 분량 서술자(#1660) 를 넣은 뒤 실호출 5차가
  //    51,203자로 들어와 옛 상한을 넘겼고, 하한 미달과 같은 `length` 사유로 묶여 있어
  //    **넘쳤다는 이유로** degraded 강등 + 유료 품질 저하 고지가 나갔다. 넘치는 것은
  //    하한 미달과 달리 사용자 손해가 아니므로, 완충을 그 실측 위로 다시 넉넉히 잡는다.
  total: Object.freeze({ min: 30000, max: 60000 }),
  section: 3600,
  executiveSummary: 1400,
  integratedReading: 3600,
  timingAndAction: 2600,
  // 🔴 800 → 600 (2026-09-06). 실호출 6차에서 verdict 묶음이 이 값 하나 때문에 두 물결 연속
  //    탈락해(closingMessage 732·662자) **결정론 폴백이 유료 결과로 나갔다**. 맺음말은 새 근거를
  //    꺼내지 않는 마무리 글이라 본문 섹션과 같은 잣대를 댈 자리가 아니고, 68~138자 모자란 정상
  //    응답을 통째로 버리는 대가가 얻는 것보다 크다. 목표치는 서술자가 min×1.2(720자)로 따로 준다.
  closingMessage: 600,
  finalVerdictRationale: 1000,
});

/**
 * 분량을 요구하는 필드의 서술자. 프롬프트 본문(사람이 읽는 스키마)과 Gemini `description`
 * **양쪽**이 이 한 문자열을 본다(toGeminiSchema 가 그대로 넘긴다).
 *
 * 왜 이렇게 길게 쓰는가 — 2026-09-06 실호출 3차(구조화 출력 배선 후): 형태 문제는 사라졌지만
 * 본문이 임계의 79~82% 로 들어왔다(saju 2,860 · tarot 2,967 / 3,600자). 제약 디코딩이 본문을
 * 줄인다는 예측이 실측으로 확인된 것이다. 최소치만 적으면 모델은 그 최소치를 "대략적인 목표"로
 * 읽고 그 아래에서 멈춘다 — 그래서 ① 최소치보다 20% 위의 **목표**를 따로 주고, ② 미달의
 * 결과(반려)를 알리고, ③ 요약하지 말라고 못박는다.
 *
 * 🔴 ④ 반복 금지는 그 압박의 부작용을 막는 짝이다 — 2026-09-06 실호출 4차에서 astrology 묶음이
 *    `당신의 모든 것이 멋집니다. 당신의 모든 것이 좋습니다.` 류 동어반복으로 18,171자를 채우다
 *    maxOutputTokens 에서 잘려 JSON 이 안 닫혔고(`parse_failed`) 묶음 전체가 폴백됐다.
 *    분량 미달은 그 묶음만 다시 쓰면 되지만 반복 루프는 토큰 상한까지 태우고 응답을 통째로 버린다 —
 *    그래서 "채우지 못하면 끝낸다"를 미달보다 나은 선택지로 명시한다. ①~③ 을 약하게 만드는
 *    문장이 아니라, 채울 근거가 떨어졌을 때의 출구다.
 *
 * 🔴 `무조건`·`반드시` 를 쓰지 않는다 — 이제 이 둘만으로는 반려되지 않지만(공기 판정으로 옮겼다,
 *    worker/lib/fusion-fortune.js), 지시문의 어투를 모델이 본문에 되받아 쓰면 단정 술어와 만나
 *    `unsafe_phrase` 로 자기 응답이 반려될 수 있다. 지시는 단정 부사 없이 쓴다.
 * 🔴 서술자는 `string` 으로 시작해야 한다 — toGeminiSchema 가 첫 토큰으로 타입을 정한다.
 */
function lengthDirective(minChars, note = "") {
  const min = minChars.toLocaleString("en-US");
  const target = Math.round((minChars * 1.2) / 100) * 100;
  const body = [
    `한국어 ${min}자 이상, 목표 ${target.toLocaleString("en-US")}자.`,
    `${min}자 미만이면 이 응답은 통째로 반려되어 사용자에게 전달되지 않는다.`,
    "요약하거나 압축하지 말고 근거 → 구체적 장면 → 적용 방법 순으로 문단을 끝까지 전개해 목표 분량을 채운다.",
    "같은 문장이나 뜻이 같은 표현을 되풀이해 분량을 채운 응답도 반려된다. 새로 댈 근거가 남지 않으면 되풀이하지 말고 그 자리에서 필드를 끝내고 JSON 을 닫는다 — 분량이 모자란 응답보다 같은 말을 이어 붙인 응답이 나쁘다.",
    note,
  ]
    .filter(Boolean)
    .join(" ");
  return `string (${body})`;
}

function sectionSchema(minChars) {
  return {
    title: "string",
    content: lengthDirective(minChars),
    keyPoints: ["string", "string", "string"],
  };
}

export const FUSION_VISUALIZATION_SCHEMA = Object.freeze({
  systemScores: [{ key: "saju|ziwei|vedic|sukuyo|astrology|tarot", score: "number (0-100)", note: "string (40자 이내)" }],
  monthlyTimeline: [{ label: "string (예: 8월)", intensity: "number (0-100)", note: "string (한 줄 지침, 90자 이내)" }],
  crossChecks: {
    aligned: [{ theme: "string (60자 이내)", systems: ["string", "string"], meaning: "string (200자 이내)" }],
    divergent: [{ theme: "string (60자 이내)", systems: ["string", "string"], meaning: "string (200자 이내)" }],
  },
});

/**
 * 마지막 결론 블록. 여섯 체계를 각각 판정한 뒤 하나의 조언으로 수렴시킨다.
 * 🔴 여기가 이 상품이 파는 것이다 — 여섯 개의 해석이 아니라, 그 여섯이 만나 남긴 답 하나.
 */
export const FUSION_FINAL_VERDICT_SCHEMA = Object.freeze({
  headline: "string (최종 결론 한 문장, 60자 이내)",
  confidence: "number (0-100, 여섯 체계가 이 결론에 합의한 정도)",
  systemVerdicts: [{ key: "saju|ziwei|vedic|sukuyo|astrology|tarot", stance: "agree|conditional|caution", note: "string (그 체계가 이 결론에 대해 말하는 바, 80자 이내)" }],
  rationale: lengthDirective(FUSION_FORTUNE_LENGTH.finalVerdictRationale, "여섯 체계가 만나 왜 이 결론 하나가 남는지를 중심으로 쓴다."),
  doNow: ["string", "string", "string"],
  avoid: ["string", "string"],
});

export const FUSION_FORTUNE_RESPONSE_SCHEMA = Object.freeze({
  title: "string",
  openingMessage: "string",
  executiveSummary: lengthDirective(FUSION_FORTUNE_LENGTH.executiveSummary),
  sajuSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  ziweiSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  vedicSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  sukuyoSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  astrologySection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  tarotSection: sectionSchema(FUSION_FORTUNE_LENGTH.section),
  integratedReading: sectionSchema(FUSION_FORTUNE_LENGTH.integratedReading),
  timingAndAction: {
    title: "string",
    content: lengthDirective(FUSION_FORTUNE_LENGTH.timingAndAction),
    luckyActions: ["string", "string", "string"],
    cautionPatterns: ["string", "string", "string"],
  },
  visualization: FUSION_VISUALIZATION_SCHEMA,
  finalVerdict: FUSION_FINAL_VERDICT_SCHEMA,
  // 🔴 분량을 검증하는 필드는 전부 서술자를 달아야 한다 — 6차까지 이 키만 맨 `"string"` 이라
  //    모델이 목표를 못 받았고, 그래서 임계 근처(732·662자)에서 멈춰 묶음이 폴백됐다.
  closingMessage: lengthDirective(FUSION_FORTUNE_LENGTH.closingMessage, "상담을 닫는 글이므로 새 근거를 꺼내지 말고, 지금까지의 결론을 사용자의 다음 행동으로 옮기는 데 분량을 쓴다."),
  shareText: "string (개인정보가 없는 220자 이내 요약)",
});

const EXPERT_CONTRACTS = Object.freeze([
  "사주: 일간과 월지의 계절감, 오행의 분포, 십성의 작동을 성격·돈·일·관계·결정 습관으로 번역한다. 강점과 과잉의 그림자를 함께 설명한다.",
  "자미두수: 명궁·관록궁·재백궁·부처궁·복덕궁과 서버가 제공한 주요 별만 사용해 역할, 재능, 관계 책임, 회복 방식을 읽는다.",
  "베다점: 라그나·문사인·나크샤트라·다샤가 컨텍스트에 있을 때만 사용하고, 무의식 리듬과 카르마 패턴을 현실의 반복 습관으로 번역한다.",
  "숙요점: 본명숙과 관계 거리, 감정 반응, 연애 및 사회적 관계의 리듬을 읽되 타인의 마음을 확정하지 않는다.",
  "서양 점성술: 태양·달·상승궁·금성·화성·토성을 서로 다른 심리 기능으로 구분하고, 생시나 출생지가 없으면 정밀 하우스 해석을 유보한다.",
  "타로: 서버가 고른 카드 ID와 포지션만 해석한다. 카드나 배열을 새로 만들지 않고, 상징을 현재 선택과 행동 기준으로 연결한다.",
]);

/**
 * 섹션 본문 작성 규칙.
 * worker/lib/fortune-reasoning-contract.js 가 다섯 유료 상담에 강제하는 "근거를 먼저 밝히는
 * 상담문" 규율을 초융합 스키마에 맞게 옮긴 것이다. 초융합은 그쪽의 섹션 키 구조를 쓰지
 * 않으므로, 키를 늘리는 대신 각 섹션 **안에서** 같은 순서(근거 → 판단 → 장면 → 행동)를 요구한다.
 */
const SECTION_WRITING_RULES = Object.freeze([
  "각 섹션은 ①서버 확정값에서 끌어온 근거 → ②그 근거가 말하는 경향 → ③생활에서 그것이 드러나는 구체적 장면 → ④지금 해볼 행동 순서로 쓴다. 결론만 먼저 던지지 않는다.",
  "전문용어(오행·십성·궁·별·나크샤트라·숙·행성)를 쓰면 그 자리에서 한 번은 쉬운 말로 풀어 준다.",
  "'힘을 실어 주는 요소'와 '주의가 필요한 요소'를 뭉뚱그리지 말고 나누어 각각 짚는다.",
  "판단은 단정이 아니라 경향으로 쓴다. 같은 문장을 다른 섹션에서 반복하지 않는다.",
  "한 섹션 안에서도 같은 문장을 되풀이하지 않는다. 낱말이나 어미만 바꿔 같은 뜻을 다시 쓰는 것도 반복이다. 문단을 더 쓸 때는 아직 인용하지 않은 서버 확정값이나 아직 쓰지 않은 장면을 가져오고, 가져올 것이 없으면 그 섹션을 거기서 끝낸다.",
  "keyPoints 3개는 본문 요약이 아니라 그 섹션에서 실제로 남길 판단·행동이어야 한다.",
  "앞 단계에서 완성된 섹션 요약이 함께 주어지면 그 문장과 판단을 다시 쓰지 않는다. 같은 근거를 다뤄도 앞에서 다루지 않은 각도(시기·관계·일·마음)로 쓴다.",
  "누구에게나 맞는 일반론으로 분량을 채우지 않는다. 문단마다 서버 확정값을 최소 하나 이름으로 인용하고, 그 값에서만 나오는 판단을 쓴다.",
  "구체성의 순서를 지킨다: 실제 값 인용 → 그 값이 가리키는 시기나 상황 → 그때 해볼 행동. 세 요소가 모두 없는 문단은 늘리지 말고 뺀다.",
]);

export const FUSION_SYSTEM_QUALITY_GATES = Object.freeze({
  saju: Object.freeze({
    fields: ["dayMaster", "fiveElementsSummary", "tenGodsSummary", "currentFlowSummary", "seasonSummary", "relationSummary"],
    readingRule: "사주 근거를 기질, 반복 선택, 현재 흐름으로 번역하고 과한 점과 부족한 점이 일상에서 어떻게 함께 드러나는지 설명한다.",
  }),
  ziwei: Object.freeze({
    fields: ["lifePalaceSummary", "topicPalaceSummary", "keyStarsSummary", "strengths", "cautions"],
    readingRule: "자미두수의 궁위와 별은 이름을 나열하지 말고 역할, 책임, 관계에서 반복되는 선택 방식으로 번역한다.",
  }),
  sukuyo: Object.freeze({
    fields: ["birthMansion", "todayMansion", "emotionalPattern", "relationshipPattern", "distancePattern"],
    readingRule: "숙요는 관계의 거리, 감정 반응, 대화 속도를 다루며 상대의 마음을 단정하지 않는다.",
  }),
  vedic: Object.freeze({
    fields: ["lagnaSummary", "moonSignSummary", "nakshatraSummary", "dashaSummary", "innerRhythm"],
    readingRule: "베다점은 라그나·달·나크샤트라·다샤가 실제로 제공된 경우에만 쓰고, 감정의 리듬과 회복 방식으로 풀어쓴다.",
  }),
  astrology: Object.freeze({
    fields: ["sunSummary", "moonSummary", "ascendantSummary", "venusSummary", "marsSummary", "saturnSummary", "currentMoodSummary"],
    readingRule: "서양 점성술은 태양의 방향, 달의 정서, 금성·화성의 관계와 행동, 토성의 책임을 섞지 않고 현재 선택으로 번역한다.",
  }),
  tarot: Object.freeze({
    fields: ["spreadType", "cards", "symbolicMessage"],
    readingRule: "타로는 서버가 뽑은 카드와 자리만 인용하며, 카드가 정답을 대신한다고 말하지 않고 현재 선택의 기준으로 연결한다.",
  }),
});

/**
 * 생성 단위. keys 합집합은 FUSION_FORTUNE_RESPONSE_SCHEMA 전체와 정확히 일치해야 한다
 * (아래 assert 로 강제). targetChars 합계(약 36,100자)는 total.min(30,000)보다 넉넉히 위여야 한다 —
 * 딱 맞추면 그룹이 목표의 90%만 써도 곧바로 미달로 떨어진다.
 *
 * stage 1 은 체계별 섹션(서버 컨텍스트만 본다), stage 2 는 1단계 산출 요약을 읽고 쓰는 통합·행동·결론이다.
 * 총평·서문 성격의 executiveSummary·finalVerdict·closingMessage 는 반드시 마지막(stage 2)에 둔다.
 */
export const FUSION_SECTION_GROUP_SPECS = Object.freeze([
  Object.freeze({
    id: "saju",
    stage: 1,
    label: "상담의 서문과 사주",
    stageLabel: "서문 · 사주",
    keys: Object.freeze(["title", "openingMessage", "sajuSection"]),
    minChars: Object.freeze({ openingMessage: 260, sajuSection: FUSION_FORTUNE_LENGTH.section }),
    targetChars: 4300,
    systems: Object.freeze(["saju"]),
    focus: "상담을 여는 제목·서문과, 사주가 말하는 타고난 기질과 선택의 뿌리",
  }),
  Object.freeze({
    id: "ziwei",
    stage: 1,
    label: "자미두수",
    stageLabel: "자미두수",
    keys: Object.freeze(["ziweiSection"]),
    minChars: Object.freeze({ ziweiSection: FUSION_FORTUNE_LENGTH.section }),
    targetChars: 4200,
    systems: Object.freeze(["ziwei"]),
    focus: "자미두수의 궁위와 별이 말하는 삶의 무대, 역할, 책임을 느끼는 지점",
  }),
  Object.freeze({
    id: "vedic",
    stage: 1,
    label: "베다점",
    stageLabel: "베다점",
    keys: Object.freeze(["vedicSection"]),
    minChars: Object.freeze({ vedicSection: FUSION_FORTUNE_LENGTH.section }),
    targetChars: 4200,
    systems: Object.freeze(["vedic"]),
    focus: "베다점의 달·나크샤트라·다샤가 말하는 무의식의 리듬과 회복 방식",
  }),
  Object.freeze({
    id: "sukuyo",
    stage: 1,
    label: "숙요점",
    stageLabel: "숙요점",
    keys: Object.freeze(["sukuyoSection"]),
    minChars: Object.freeze({ sukuyoSection: FUSION_FORTUNE_LENGTH.section }),
    targetChars: 4200,
    systems: Object.freeze(["sukuyo"]),
    focus: "숙요점이 말하는 관계의 거리, 감정 반응, 대화 속도",
  }),
  Object.freeze({
    id: "astrology",
    stage: 1,
    label: "서양 점성술",
    stageLabel: "점성술",
    keys: Object.freeze(["astrologySection"]),
    minChars: Object.freeze({ astrologySection: FUSION_FORTUNE_LENGTH.section }),
    targetChars: 4200,
    systems: Object.freeze(["astrology"]),
    focus: "서양 점성술의 태양·달·행성이 말하는 표현과 선택 패턴",
  }),
  Object.freeze({
    id: "tarot",
    stage: 1,
    label: "타로",
    stageLabel: "타로",
    keys: Object.freeze(["tarotSection"]),
    minChars: Object.freeze({ tarotSection: FUSION_FORTUNE_LENGTH.section }),
    targetChars: 4200,
    systems: Object.freeze(["tarot"]),
    focus: "서버가 뽑은 여섯 장의 카드가 현재 선택을 비추는 방식",
  }),
  Object.freeze({
    id: "integration",
    stage: 2,
    label: "교차 검증 통합 리딩",
    stageLabel: "교차 검증 통합",
    keys: Object.freeze(["integratedReading"]),
    minChars: Object.freeze({ integratedReading: FUSION_FORTUNE_LENGTH.integratedReading }),
    targetChars: 4200,
    systems: Object.freeze([]),
    focus: "앞 단계에서 완성된 여섯 체계 섹션을 교차 검증해 하나로 엮는 통합 리딩",
  }),
  Object.freeze({
    id: "action",
    stage: 2,
    label: "시기와 행동",
    stageLabel: "12개월 시기 라인 · 행동",
    keys: Object.freeze(["timingAndAction", "visualization"]),
    minChars: Object.freeze({ timingAndAction: FUSION_FORTUNE_LENGTH.timingAndAction }),
    targetChars: 3200,
    systems: Object.freeze([]),
    focus: "앞으로 12개월의 시기 라인과 현실 행동, 시각화가 쓸 정규화 점수",
  }),
  Object.freeze({
    id: "verdict",
    stage: 2,
    label: "결론 요약과 최종 판정",
    stageLabel: "핵심 요약 · 최종 결론",
    keys: Object.freeze(["executiveSummary", "finalVerdict", "closingMessage", "shareText"]),
    // 🔴 리터럴로 적지 않는다 — 이 값은 프롬프트의 "최소 N자" 줄로 흘러가는데(buildFusionSectionGroupPrompt),
    //    검증은 FUSION_FORTUNE_LENGTH 를 본다. 따로 적어 두면 한쪽만 고쳤을 때 모델이 검증과 다른
    //    기준을 받는다.
    minChars: Object.freeze({
      executiveSummary: FUSION_FORTUNE_LENGTH.executiveSummary,
      finalVerdict: FUSION_FORTUNE_LENGTH.finalVerdictRationale,
      closingMessage: FUSION_FORTUNE_LENGTH.closingMessage,
    }),
    targetChars: 3400,
    systems: Object.freeze([]),
    focus: "여섯 체계를 수렴시킨 결론 요약, 최종 판정, 마무리 메시지",
  }),
]);

export const FUSION_STAGE_COUNT = 2;

/** stage(1|2)에 속한 그룹. 알 수 없는 stage 는 빈 배열 — 호출자가 fail-closed 로 다룬다. */
export function fusionGroupsForStage(stage) {
  return FUSION_SECTION_GROUP_SPECS.filter((group) => group.stage === Number(stage));
}

const STAGE_TWO_INTEGRATION_RULE = "여섯 체계(사주·자미두수·베다점·숙요점·점성술·타로)를 각각 이름으로 인용하며 서로를 대조한다. 한 체계라도 이름 없이 넘어가면 교차 검증이 아니다.";

const GROUP_EXTRA_RULES = Object.freeze({
  saju: [
    "title 은 25자 이내, openingMessage 는 상담을 여는 두세 문장이다. 서문은 결론을 미리 말하지 않고 이번 질문을 어떤 기준으로 읽을지만 연다.",
    "사주 섹션은 일간·오행·십성·현재 흐름을 각각 근거로 인용하되, 뒤 단계의 통합 리딩이 다시 쓸 여지를 남기지 말고 사주 안에서 끝까지 판단한다.",
  ],
  ziwei: [
    "자미두수는 명궁·주제궁·주요 별을 역할과 책임, 관계에서 반복되는 선택 방식으로 번역한다. 다른 체계를 끌어와 비교하지 않는다(그것은 2단계의 일이다).",
  ],
  vedic: [
    "베다점은 리듬과 회복을 맡는다. 라그나·다샤 같은 값이 컨텍스트에 없으면 그 자리를 추정으로 채우지 말고 없다고 밝힌다.",
  ],
  sukuyo: [
    "숙요점은 거리와 속도를 맡는다. 상대의 마음을 단정하지 않고, 본명숙이 말하는 감정 반응과 대화 속도를 생활 장면으로 옮긴다.",
  ],
  astrology: [
    "점성술은 표현과 책임을 맡는다. 태양·달·금성·화성·토성을 섞지 말고 각각이 현재 선택에서 어떻게 드러나는지 나눠 쓴다.",
  ],
  tarot: [],
  integration: [
    STAGE_TWO_INTEGRATION_RULE,
    "integratedReading 에는 **교차 검증 표**를 문단 안에 명시적으로 넣는다. (가) 두 체계 이상이 같은 신호를 가리키는 항목을 최소 2가지 — 어떤 체계들이 무엇을 함께 말하는지와 그래서 무엇을 우선할지. (나) 서로 엇갈리는 항목을 최소 1가지 — 어느 체계가 무엇을 다르게 말하는지와 어떤 상황에서 어느 쪽을 따를지. 엇갈림을 모순으로 숨기지 않는다.",
    "통합 리딩은 앞 단계 섹션의 문장을 요약해 붙이는 자리가 아니다. 체계 사이의 관계에서만 나오는 판단을 새로 쓴다.",
  ],
  action: [
    "timingAndAction.content 안에 **앞으로 12개월의 시기 라인**을 담는다. 이번 달부터 12개월을 순서대로 다루되, 사건을 예고하지 말고 각 달에 무엇을 준비·시험·정리하면 좋은지를 쓴다. 각 달의 근거는 앞 단계 섹션 요약에서 실제로 언급된 값으로 댄다.",
    "visualization.monthlyTimeline 은 그 12개월 라인과 같은 순서·같은 내용을 숫자로 옮긴 것이다(정확히 12개, label 은 '8월'처럼 이번 달부터). intensity 는 좋고 나쁨이 아니라 '그 달에 힘을 쓸 만한 정도'다.",
    "visualization.systemScores 는 여섯 체계 각각이 이번 질문에 얼마나 뚜렷한 신호를 주는지(0-100)이며, 사람의 우열 점수가 아니다. 여섯 개를 모두 채우고 값이 전부 같지 않게 한다.",
    "visualization.crossChecks 의 systems 에는 체계 키(saju/ziwei/vedic/sukuyo/astrology/tarot)를 두 개 이상 넣는다.",
  ],
  verdict: [
    "executiveSummary 는 이번 상담 전체의 결론이다. 여섯 체계가 공통으로 가리키는 주제 한 가지를 먼저 못박고, 그것이 관계·일·마음에서 각각 어떻게 나타나는지까지 담는다. 앞 단계 섹션 요약을 순서대로 다시 적는 것은 요약이 아니다.",
    "closingMessage 는 상담을 닫는 글이다. 새 근거를 꺼내지 말고, 사용자가 이 결과를 어떻게 다시 읽고 쓸지를 안내한다. shareText 는 개인정보 없는 220자 이내 요약이다.",
    "🔴 finalVerdict 는 이 상담의 마지막 답이다. 여섯 체계를 다시 나열해 요약하지 말고 **하나의 결론으로 수렴시킨다.** ①headline 은 사용자가 지금 무엇을 하면 되는지 한 문장으로 못박는다. ②systemVerdicts 는 여섯 체계 각각이 그 결론에 대해 어떤 입장인지 판정한다 — agree(같은 방향), conditional(조건이 맞으면 같은 방향), caution(다른 방향이거나 속도를 늦추라고 함) 중 하나와 그 이유를 함께 적는다. 여섯 개를 모두 채우고, 근거 없이 전부 agree 로 몰지 않는다. ③confidence 는 그 입장 분포에서 나오는 합의 정도다(전부 agree 면 높고 caution 이 섞이면 낮다). ④rationale 은 왜 이 결론이 남는지를 근거로 설명한다. ⑤doNow 는 지금 할 일 3가지, avoid 는 피할 일 2가지를 구체적인 동사로 쓴다.",
  ],
});

function safeText(value, max = 240) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function safeArray(value, maxItems = 3, maxText = 140) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeText(item, maxText)).filter(Boolean).slice(0, maxItems);
}

function projectTarot(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.map((card) => ({
    name: safeText(card?.name, 80),
    orientation: card?.orientation === "reversed" ? "reversed" : "upright",
    positionKey: safeText(card?.positionKey || card?.position, 60),
    meaningSummary: safeText(card?.meaningSummary, 170),
  })).filter((card) => card.name || card.meaningSummary).slice(0, 6);
}

function projectSystem(name, source) {
  if (!source || typeof source !== "object") return undefined;
  const gate = FUSION_SYSTEM_QUALITY_GATES[name];
  if (!gate) return undefined;
  const projected = {};
  for (const field of gate.fields) {
    if (field === "cards") {
      const cards = projectTarot(source.cards);
      if (cards.length) projected.cards = cards;
      continue;
    }
    if (Array.isArray(source[field])) {
      const values = safeArray(source[field]);
      if (values.length) projected[field] = values;
      continue;
    }
    const value = safeText(source[field]);
    if (value) projected[field] = value;
  }
  const evidence = safeArray(source.evidence, 6, 80);
  if (evidence.length) projected.evidence = evidence;
  return Object.keys(projected).length ? projected : undefined;
}

/**
 * The only Fusion context allowed to reach a provider. It omits raw birth
 * input, the free-form concern, payment state, and unknown calculator fields.
 */
export function projectFusionFortuneContextForPrompt(context = {}) {
  const systems = {};
  for (const name of ["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"]) {
    const projected = projectSystem(name, context?.systems?.[name]);
    if (projected) systems[name] = projected;
  }
  const insightSource = context?.integratedInsight || {};
  const integratedInsight = {};
  for (const field of ["openingHook", "currentTheme", "likelyConcern", "adviceDirection", "cautionPattern", "luckyActionHint", "premiumBridge"]) {
    const value = safeText(insightSource[field], 260);
    if (value) integratedInsight[field] = value;
  }
  const evidenceKeys = safeArray(insightSource.evidenceKeys, 10, 80);
  if (evidenceKeys.length) integratedInsight.evidenceKeys = evidenceKeys;

  return {
    version: String(context.version || "fusion-fortune.v1"),
    birthTimeKnown: context.birthTimeKnown === true,
    birthPlaceKnown: context.birthPlaceKnown === true,
    systems,
    tarotSpread: {
      spreadType: safeText(context?.tarotSpread?.spreadType, 80),
      cards: projectTarot(context?.tarotSpread?.cards),
    },
    integratedInsight,
    questionFocus: {
      intentKey: safeText(context?.questionFocus?.intentKey, 60),
      label: safeText(context?.questionFocus?.label, 120),
      answerFrame: safeText(context?.questionFocus?.answerFrame, 260),
      actionFrame: safeText(context?.questionFocus?.actionFrame, 260),
    },
    limitations: safeArray(context.limitations, 8, 100),
    topic: safeText(context.topic, 80),
    inputSummary: {
      calendarType: safeText(context.inputSummary?.calendarType || "solar", 10),
      gender: safeText(context.inputSummary?.gender || "unspecified", 20),
      topic: safeText(context.inputSummary?.topic, 80),
    },
  };
}

/** 모든 그룹이 공유하는 안전·근거 규칙. 그룹마다 분량 문장만 달라진다. */
function buildSharedSystemPrompt(safeContext, lengthLine) {
  const precisionRule = safeContext.birthTimeKnown
    ? "생시 기반 정보도 서버 컨텍스트에 존재하는 값만 해석한다."
    : "생시가 없으므로 시주, 정밀 자미 명반, 라그나, 상승궁, 하우스와 시간 기반 시기를 확정하지 않는다.";
  const locationRule = safeContext.birthPlaceKnown
    ? "출생지 기반 정보도 서버 컨텍스트에 존재하는 값만 해석한다."
    : "출생지가 없으므로 라그나, 상승궁, 하우스, 위치 기반 세부값을 추정하거나 확정하지 않는다.";
  return [
    "너는 CODE DESTINY의 초융합 운세 상담자이며 여섯 전통을 구분해 이해하는 시니어 상담가다.",
    "각 체계를 별도 백과사전처럼 나열하지 말고, 공통 신호와 차이를 교차 검증해 하나의 상담 흐름으로 연결한다.",
    "서버가 계산한 FusionFortuneContext에 없는 별, 궁, 오행, 행성, 카드, 시기를 만들지 않는다.",
    precisionRule,
    locationRule,
    "무료 운세와 구분되는 깊이를 위해 근거, 체감 가능한 패턴, 강점과 그림자, 가까운 흐름, 실행 조언을 모두 제시한다.",
    "의료·법률·투자 결과, 타인의 마음, 재회나 성공을 확정하지 않는다. 공포나 결제 압박을 쓰지 않는다.",
    lengthLine,
  ].join(" ");
}

function buildSharedUserPromptLines(safeContext) {
  return [
    `질문 중심 답변: ${safeContext.questionFocus.answerFrame || "질문에서 사용자가 확인하려는 선택의 기준"}. 첫 문단과 실행 조언은 이 질문에 바로 답해야 하며, 원문 질문을 그대로 인용하지 않는다.`,
    `관심 주제: ${safeContext.topic}`,
    "체계별 전문가 계약:\n" + EXPERT_CONTRACTS.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "작성 규칙:\n" + SECTION_WRITING_RULES.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "통합 원칙: 두 체계 이상이 같은 행동 패턴을 가리킬 때 핵심 주제로 승격하고, 서로 다른 신호는 모순으로 숨기지 말고 상황별 선택지로 설명한다.",
    "개인정보 안전: 생년월일, 생시, 고민 원문, raw prompt/response/context, 결제 및 이용권 정보를 결과에 노출하지 않는다.",
  ];
}

function pickSchema(keys) {
  return keys.reduce((schema, key) => ({ ...schema, [key]: FUSION_FORTUNE_RESPONSE_SCHEMA[key] }), {});
}

/**
 * 의사 스키마(사람이 읽는 형태)를 Gemini `responseSchema`(OpenAPI 부분집합)로 옮긴다.
 *
 * 왜 필요한가 — 2026-09-06 실측(1단계 11호출 덤프): 탈락 8건 중 5건이 `missing_key_points`
 * 였고 응답의 필드가 `["title","content"]`, 즉 모델이 `keyPoints` 를 **통째로 빠뜨렸다**.
 * 본문은 오히려 임계를 넘긴 것도 있었다(sukuyo 5,469 / 3,600자). 프롬프트에 실은 스키마는
 * 부탁일 뿐이라 강제가 안 된다 — `required` 가 이 5건을 직접 겨냥한다.
 *
 * 🔴 상수를 그대로 보내면 안 된다. `content: "string (3,600자 이상)"` 은 OpenAPI 가 아니라
 *    400 이고, 초융합은 `fallbackToWorkersAI:false` 라 400 하나에 아홉 묶음이 전부
 *    결정론적 폴백으로 떨어진다.
 * 🔴 손으로 쓴 키 목록을 두지 않는다 — 상수에서 전수 유도하므로 키가 늘면 따라온다.
 *
 * 분량("3,600자 이상")은 Gemini 스키마로 표현할 수 없어 `description` 으로 넘기고,
 * 프롬프트 본문의 스키마 줄도 그대로 남긴다.
 */
export function toGeminiSchema(node) {
  if (Array.isArray(node)) {
    const schema = { type: "ARRAY", items: toGeminiSchema(node[0]) };
    // 원소가 둘 이상이면 그 개수가 곧 최소 개수다(`keyPoints: [s,s,s]` = 3개). 하나짜리는
    // 형태 견본이라 개수를 강제하지 않는다. 🔴 Gemini 가 minItems 를 거부하면 이 줄만 지운다.
    if (node.length > 1) schema.minItems = node.length;
    return schema;
  }
  if (node && typeof node === "object") {
    const keys = Object.keys(node);
    return {
      type: "OBJECT",
      properties: keys.reduce((props, key) => ({ ...props, [key]: toGeminiSchema(node[key]) }), {}),
      required: keys,
      propertyOrdering: keys,
    };
  }
  const descriptor = String(node ?? "");
  const type = descriptor.startsWith("number") ? "NUMBER" : "STRING";
  // "string" 처럼 형만 있는 것은 설명이 없다. 나머지(분량·예시·허용값)는 그대로 넘긴다.
  return descriptor && descriptor !== "string" ? { type, description: descriptor } : { type };
}

const STAGE_ONE_DIGEST_KEYS = Object.freeze(["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection"]);
const STAGE_ONE_DIGEST_EXCERPT_CHARS = 700;

/**
 * 2단계 그룹이 읽는 1단계 산출 요약. 섹션별 제목(≤80자)·keyPoints 3개(각 ≤140자)·본문 앞 700자.
 * 여섯 섹션 전체(약 25,000자)를 그대로 실으면 프롬프트가 그룹당 토큰 클램프를 먹고 비용이
 * 두 배가 된다. 요약(≈6,000자)이면 관계를 쓰기에 충분하고 반복 유인은 오히려 줄어든다.
 * 1단계 결과 그 자체가 아닌 것(문자열·배열)이 오면 빈 문자열 — 호출자는 요약 없이 진행한다.
 */
export function buildFusionStageOneDigest(priorResult = {}) {
  if (!priorResult || typeof priorResult !== "object" || Array.isArray(priorResult)) return "";
  const blocks = [];
  const opening = safeText(priorResult.openingMessage, 300);
  if (opening) blocks.push(`[openingMessage] ${opening}`);
  for (const key of STAGE_ONE_DIGEST_KEYS) {
    const sectionValue = priorResult[key];
    if (!sectionValue || typeof sectionValue !== "object") continue;
    const title = safeText(sectionValue.title, 80);
    const excerpt = safeText(sectionValue.content, STAGE_ONE_DIGEST_EXCERPT_CHARS);
    if (!title && !excerpt) continue;
    const points = (Array.isArray(sectionValue.keyPoints) ? sectionValue.keyPoints : []).slice(0, 3).map((item) => safeText(item, 140)).filter(Boolean);
    blocks.push([`[${key}] ${title}`, points.length ? `핵심: ${points.join(" / ")}` : "", excerpt ? `본문 앞부분: ${excerpt}` : ""].filter(Boolean).join("\n"));
  }
  return blocks.join("\n\n");
}

/**
 * 그룹 하나의 프롬프트. 자기가 맡은 키만 담긴 JSON 객체를 요구한다.
 * priorSections 는 2단계 그룹에만 의미가 있다 — 1단계 결과 객체를 넘기면 요약이 서버 컨텍스트 앞에 실린다.
 * @param {{ context?: object, group: object, priorSections?: object, extraInstruction?: string }} args
 */
export function buildFusionSectionGroupPrompt({ context = {}, group, priorSections = null, extraInstruction = "" } = {}) {
  const safeContext = projectFusionFortuneContextForPrompt(context);
  const responseSchema = pickSchema(group.keys);
  const minCharLines = group.keys
    .filter((key) => group.minChars?.[key])
    .map((key) => `  · ${key}: 최소 ${Number(group.minChars[key]).toLocaleString("ko-KR")}자`);
  const digest = group.stage === 2 ? buildFusionStageOneDigest(priorSections) : "";
  const systemPrompt = buildSharedSystemPrompt(
    safeContext,
    `이번 요청은 전체 상담 중 “${group.label}” 부분만 담당한다. 아래 키만 담긴 JSON 객체 하나만 반환하고, 다른 키는 절대 추가하지 않는다. Markdown과 코드펜스는 쓰지 않는다.`,
  );

  const userPrompt = [
    `이 요청의 범위: ${group.focus}`,
    ...buildSharedUserPromptLines(safeContext),
    ...(group.systems.length
      ? [`이 그룹이 사용하는 체계와 읽기 규칙:\n${group.systems.map((name) => `· ${name}: ${FUSION_SYSTEM_QUALITY_GATES[name]?.readingRule || ""}`).join("\n")}`]
      : []),
    ...(GROUP_EXTRA_RULES[group.id] || []),
    ...(group.keys.includes("tarotSection")
      ? ["타로 기준: tarotSpread.cards의 카드 이름과 포지션 여섯 개를 모두 tarotSection에서 정확히 언급하고, 목록 밖의 카드는 절대 추가하지 않는다."]
      : []),
    `분량 기준(이 그룹 합계 약 ${Number(group.targetChars).toLocaleString("ko-KR")}자):\n${minCharLines.join("\n")}`,
    "keyPoints, luckyActions, cautionPatterns는 각각 3개 이상 제공한다.",
    ...(digest ? [`앞 단계에서 완성된 섹션 요약(이 문장들을 반복하지 말고, 이 판단들 사이의 관계에서만 나오는 것을 새로 쓴다):\n${digest}`] : []),
    `서버 계산 컨텍스트:\n${JSON.stringify(safeContext)}`,
    `응답 JSON 스키마(이 키만):\n${JSON.stringify(responseSchema)}`,
    ...(extraInstruction ? [extraInstruction] : []),
  ].join("\n\n");

  // 🔴 `responseSchema` 는 프롬프트 본문용(사람이 읽는 형태)이고 `geminiSchema` 는 전송용이다.
  //    전자의 키 순서를 verify:fusion-fortune-quality 가 문자열로 단언하므로 형태를 바꾸지 않는다.
  return { systemPrompt, userPrompt, responseSchema, geminiSchema: toGeminiSchema(responseSchema) };
}

/**
 * 전체 스키마 기준 프롬프트. 그룹 생성으로 옮긴 뒤에도 남겨 둔다 —
 * 라우트가 넘겨주는 prompt.responseSchema(그룹 보정 시 참조)와 mock 경로가 같은 계약을 본다.
 */
export function buildFusionFortunePrompt({ context = {} } = {}) {
  const safeContext = projectFusionFortuneContextForPrompt(context);
  const systemPrompt = buildSharedSystemPrompt(
    safeContext,
    `한국어 가시 텍스트 ${FUSION_FORTUNE_LENGTH.total.min.toLocaleString("en-US")}자 이상으로 작성하고 JSON 객체 하나만 반환한다. Markdown과 코드펜스는 쓰지 않는다.`,
  );
  const userPrompt = [
    ...buildSharedUserPromptLines(safeContext),
    `품질 기준: 각 섹션은 최소 ${FUSION_FORTUNE_LENGTH.section.toLocaleString("en-US")}자, executiveSummary는 최소 ${FUSION_FORTUNE_LENGTH.executiveSummary}자, integratedReading은 최소 ${FUSION_FORTUNE_LENGTH.integratedReading.toLocaleString("en-US")}자, timingAndAction.content는 최소 ${FUSION_FORTUNE_LENGTH.timingAndAction.toLocaleString("en-US")}자로 쓴다.`,
    "타로 기준: tarotSpread.cards의 카드 이름과 포지션 여섯 개를 모두 tarotSection에서 정확히 언급하고, 목록 밖의 카드는 절대 추가하지 않는다.",
    `서버 계산 컨텍스트:\n${JSON.stringify(safeContext)}`,
    `응답 JSON 스키마:\n${JSON.stringify(FUSION_FORTUNE_RESPONSE_SCHEMA)}`,
  ].join("\n\n");

  return { systemPrompt, userPrompt, responseSchema: FUSION_FORTUNE_RESPONSE_SCHEMA };
}

// 그룹 키의 합집합이 스키마 전체를 덮는지 모듈 로드 시점에 확인한다.
// 키를 추가하고 그룹에 못 넣으면 그 필드는 영영 생성되지 않는다 — 조용히 비는 대신 즉시 깨진다.
{
  const covered = FUSION_SECTION_GROUP_SPECS.flatMap((group) => group.keys);
  const expected = Object.keys(FUSION_FORTUNE_RESPONSE_SCHEMA);
  const missing = expected.filter((key) => !covered.includes(key));
  const duplicated = covered.filter((key, index) => covered.indexOf(key) !== index);
  if (missing.length || duplicated.length) {
    throw new Error(`FUSION_SECTION_GROUP_SPECS mismatch — missing: ${missing.join(",")} duplicated: ${duplicated.join(",")}`);
  }
}

export { EXPERT_CONTRACTS, SECTION_WRITING_RULES };

/* ─────────── 관리자 프롬프트 랩 ─────────── */

/** 랩 프롬프트가 열 때마다 달라지면 문안 비교가 안 된다. 타로 시드를 고정한다. */
const ADMIN_LAB_TAROT_SEED = "admin-prompt-lab";

function labGender(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "m" || text === "male") return "male";
  if (text === "f" || text === "female") return "female";
  return "unspecified";
}

function labNumber(value) {
  if (value === null || value === undefined || value === "") return Number.NaN;
  return Number(value);
}

/**
 * 관리자 폼은 출생지를 도시 이름만 받고 좌표는 비운 채 넘긴다(worker/routes/admin.js 의 buildAdminLabBody).
 * 그대로 실으면 normalizeFusionFortuneInput 이 null 을 0 으로 읽어 위경도 (0,0) 명식이 만들어지고,
 * 랩은 birthPlaceKnown: true 인 거짓 프롬프트를 보여 준다. 좌표가 실제 숫자일 때만 싣는다.
 */
function labBirthPlace(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const latitude = labNumber(value.latitude);
  const longitude = labNumber(value.longitude);
  const timezone = String(value.timezone || "").trim();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !timezone) return undefined;
  return { city: String(value.city || value.name || ""), country: String(value.country || ""), latitude, longitude, timezone };
}

/**
 * 관리자 프롬프트 랩 조립기.
 * 🔴 프로덕션 buildFusionSectionGroupPrompt 만 부른다 — 랩 전용 문안을 여기서 쓰면 랩이 거짓말을 한다.
 * 초융합은 2단계 9그룹 생성이라 프롬프트가 하나가 아니다. 그룹을 variants 로 노출한다(2단계 그룹은 1단계 요약 없이 골격만 보인다).
 */
export async function buildAdminLabPrompt(body = {}, options = {}) {
  const group = FUSION_SECTION_GROUP_SPECS.find((item) => item.id === options.variant) || FUSION_SECTION_GROUP_SPECS[0];
  const variants = FUSION_SECTION_GROUP_SPECS.map((item) => ({ key: item.id, label: `${item.stage}단계 · ${item.label} (${item.stageLabel})` }));

  let context = {};
  let partialReason = "";
  try {
    // 정적 import 는 순환이다 — fusion-fortune.js 가 이 모듈을 먼저 읽는다.
    const { buildFusionFortuneContext } = await import("./fusion-fortune.js");
    const built = await buildFusionFortuneContext({
      birthDate: String(body.birthDate || ""),
      birthTime: String(body.birthTime || ""),
      birthTimeUnknown: body.birthTimeUnknown === true,
      calendarType: String(body.calendarType || "solar"),
      gender: labGender(body.gender),
      concern: String(body.question || ""),
      birthPlace: labBirthPlace(body.birthPlace),
    }, { env: options.env || {}, tarotSeed: ADMIN_LAB_TAROT_SEED });
    if (built?.ok && built.context) context = built.context;
    else partialReason = `서버 컨텍스트 계산이 ${built?.failedSystem || "알 수 없는 체계"}에서 멈춰, 데이터 칸이 빈 프롬프트 골격만 표시합니다.`;
  } catch (error) {
    partialReason = `서버 컨텍스트를 계산하지 못해 데이터 칸이 빈 프롬프트 골격만 표시합니다: ${String(error?.message || error).slice(0, 160)}`;
  }

  const { systemPrompt, userPrompt } = buildFusionSectionGroupPrompt({ context, group });
  return {
    systemPrompt,
    prompt: userPrompt,
    partial: Boolean(partialReason),
    partialReason,
    variantKey: group.id,
    variants,
    notes: [
      `초융합은 한 번에 뽑지 않고 ${FUSION_STAGE_COUNT}단계 ${FUSION_SECTION_GROUP_SPECS.length}개 그룹으로 생성한다(1단계 ${fusionGroupsForStage(1).length}그룹 병렬 → 2단계 ${fusionGroupsForStage(2).length}그룹 병렬). 지금 보는 것은 ${group.stage}단계 “${group.label}” 그룹의 프롬프트다.`,
      `타로 카드는 매번 달라지면 비교가 안 되므로 랩에서만 시드를 "${ADMIN_LAB_TAROT_SEED}" 로 고정한다.`,
    ],
  };
}
