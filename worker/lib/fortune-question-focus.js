const QUESTION_FOCUS_RULES = Object.freeze({
  love: Object.freeze([
    { key: "reconciliation", pattern: /재회|이별|헤어진|전남|전여|전 애/, label: "관계를 다시 이어 볼지와 먼저 움직일 시점", answerFrame: "관계를 다시 잇고 싶은 마음과 지금 필요한 거리 사이에서 무엇을 먼저 확인할지", actionFrame: "감정의 크기보다 최근의 대화·약속·반응처럼 확인 가능한 신호를 먼저 보세요." },
    { key: "contact", pattern: /연락|답장|카톡|전화|메시지/, label: "먼저 연락할지와 연락의 속도", answerFrame: "먼저 연락할지, 보낸다면 어떤 속도가 관계를 덜 흔들지", actionFrame: "한 번의 메시지에 결론을 싣기보다, 짧고 답하기 쉬운 한 문장으로 반응의 여지를 남기세요." },
    { key: "confession", pattern: /고백|표현|마음.*전|좋아/, label: "마음을 표현할지와 관계의 속도", answerFrame: "마음을 표현할 용기와 상대가 받아들일 속도 사이의 균형", actionFrame: "상대의 마음을 추정하기보다, 지금의 관계에서 안전하게 말할 수 있는 범위를 먼저 정하세요." },
    { key: "new_relationship", pattern: /썸|소개팅|새로운.*만남|새 연애/, label: "새로운 관계의 가능성과 경계", answerFrame: "새로운 만남에 열려 있으면서도 내 리듬을 지키는 방법", actionFrame: "호감의 크기보다 약속을 지키는 방식과 대화 뒤의 편안함을 관찰하세요." },
  ]),
  money_work: Object.freeze([
    { key: "career_move", pattern: /이직|퇴사|직장.*옮|직업.*바|옮길/, label: "남을 이유와 옮길 조건", answerFrame: "지금 자리를 정리할지, 옮기기 전에 어떤 조건을 확인해야 하는지", actionFrame: "감정적인 탈출보다 역할·수입·성장 가능성 세 조건을 같은 기준으로 비교하세요." },
    { key: "work_relationship", pattern: /상사|동료|업무|프로젝트|평가|회사/, label: "일의 역할과 관계의 경계", answerFrame: "일의 책임을 어디까지 맡고, 관계에서 어떤 경계를 세울지", actionFrame: "이번 주에 내가 맡을 일과 협의가 필요한 일을 한 줄씩 나누어 보세요." },
    { key: "money_decision", pattern: /투자|주식|코인|대출|지출|돈|금전|수입|계약/, label: "돈을 움직일 기준과 위험 범위", answerFrame: "돈을 움직이기 전에 무엇을 검증하고, 어느 범위까지 감당할지", actionFrame: "기대 수익보다 손실을 감당할 범위와 다시 확인할 날짜를 먼저 정하세요." },
  ]),
  relationship: Object.freeze([
    { key: "boundary", pattern: /가족|친구|동료|거리|경계|갈등|서운/, label: "관계의 경계와 대화 방식", answerFrame: "가까운 관계에서 어디까지 맞추고 어디서 경계를 말해야 하는지", actionFrame: "사실 한 가지와 내가 필요한 범위 한 가지를 분리해 짧게 말해 보세요." },
  ]),
  mind: Object.freeze([
    { key: "recovery", pattern: /불안|우울|힘들|지치|번아웃|잠|잠못|무기력/, label: "지친 마음의 회복 순서", answerFrame: "불안을 더 키우지 않으면서 오늘 회복의 순서를 어떻게 만들지", actionFrame: "결론을 내리기 전에 수면·식사·연락처럼 바로 조절 가능한 한 가지를 먼저 회복하세요." },
  ]),
  decision: Object.freeze([
    { key: "choice", pattern: /어느|둘|선택|결정|갈등|고민|해야.*될/, label: "두 선택지의 판단 기준", answerFrame: "후회를 줄이기 위해 지금 무엇을 비교하고 먼저 검증할지", actionFrame: "각 선택지의 얻는 것과 감당할 것을 두 줄로 적고, 오늘 확인 가능한 조건부터 검증하세요." },
  ]),
  daily: Object.freeze([]),
});

const DEFAULT_FOCUS = Object.freeze({
  daily: { key: "daily_direction", label: "오늘의 우선순위", answerFrame: "오늘 무엇에 힘을 쓰고 무엇을 미뤄야 할지", actionFrame: "가장 중요한 한 가지를 먼저 끝내고, 나머지는 순서만 정해 두세요." },
  love: { key: "relationship_rhythm", label: "관계의 속도", answerFrame: "마음은 지키면서 관계의 속도를 어떻게 맞출지", actionFrame: "해석보다 실제 대화의 간격과 약속을 지키는 방식을 함께 보세요." },
  money_work: { key: "work_priority", label: "일과 돈의 우선순위", answerFrame: "일과 돈에서 무엇을 먼저 정리하고 어느 선택을 미룰지", actionFrame: "시간·비용·회복 가능성을 한 기준으로 비교해 보세요." },
  relationship: { key: "relationship_balance", label: "관계의 균형", answerFrame: "관계에서 내 역할과 상대에게 기대할 범위를 어떻게 조절할지", actionFrame: "상대의 의도를 추정하기보다 내가 말할 경계를 먼저 정하세요." },
  mind: { key: "mind_rhythm", label: "마음의 리듬", answerFrame: "생각을 줄이기보다 마음의 리듬을 어떻게 회복할지", actionFrame: "오늘의 몸 상태와 해야 할 일을 분리해 한 가지씩 다루세요." },
  decision: { key: "decision_evidence", label: "선택의 근거", answerFrame: "지금 결정에서 무엇을 근거로 삼고 어떤 조건을 확인할지", actionFrame: "되돌릴 수 있는 작은 검증부터 시작하세요." },
});

function normalizeTopic(topic) {
  return Object.prototype.hasOwnProperty.call(DEFAULT_FOCUS, topic) ? topic : "daily";
}

/**
 * Returns only fixed, non-identifying language derived from the user's current
 * question. The original concern is intentionally not returned or persisted.
 */
export function buildFortuneQuestionFocus({ concern = "", topic = "daily" } = {}) {
  const normalizedTopic = normalizeTopic(topic);
  const source = String(concern || "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 1000);
  const orderedTopics = [normalizedTopic, ...Object.keys(QUESTION_FOCUS_RULES).filter((candidate) => candidate !== normalizedTopic)];
  const matchedEntry = orderedTopics
    .flatMap((candidate) => (QUESTION_FOCUS_RULES[candidate] || []).map((rule) => ({ ...rule, topic: candidate })))
    .find((rule) => rule.pattern.test(source));
  const matched = matchedEntry;
  const focus = matched || DEFAULT_FOCUS[normalizedTopic];
  return Object.freeze({
    topic: matched?.topic || normalizedTopic,
    intentKey: focus.key,
    label: focus.label,
    answerFrame: focus.answerFrame,
    actionFrame: focus.actionFrame,
    hasQuestion: Boolean(source.trim()),
  });
}
