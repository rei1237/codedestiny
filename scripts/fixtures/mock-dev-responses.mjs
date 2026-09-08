// Synthetic UI fixtures follow fortune ai-prompt, ziwei publicConsultation and
// tarot crystal-soul response envelopes. They do not validate fortune accuracy.
const message = '지금은 마음의 속도를 살피고 작은 선택부터 정리할 때입니다. 오늘 실천할 한 가지를 골라 보세요.';
export const sajuResponse = { ok: true, prompt: message, text: message, provider: 'mock', model: 'fixture' };
export const ziweiResponse = {
  ok: true, sessionId: 'mock-ziwei', consultation: {
    id: 'mock-ziwei', status: 'completed', accessType: 'mock', birthInfo: {}, topic: 'general',
    userQuestion: '', summaryCards: [], analysisBasis: {}, ziweiChart: {},
    messages: [{ role: 'assistant', content: message, createdAt: '2026-01-01T00:00:00.000Z' }],
  },
};
export const tarotResponse = { ok: true, readingSource: 'mock', model: 'fixture', reading: message, readingData: null };

// 개발 UI 검수 전용: 실제 결제·LLM 호출 없이 결과 long-form 흐름만 확인한다.
// 별자리 계산값은 mock-dev-api 가 기존 assembleNatalCodex 로 따로 만든다.
const dualStarSections = [
  {
    id: "dualStarSummary", title: "당신을 부르는 두 개의 별", keyInsight: "두 체계 모두, 당신이 남의 속도보다 스스로 납득한 방향을 오래 지키는 사람이라고 말합니다.",
    body: "베다에서는 로히니의 감각과 꾸준함이, 숙요에서는 수성의 관찰력이 함께 드러납니다. 빠르게 눈에 띄기보다 한 번 마음에 들어온 것을 자기 방식으로 다듬어 신뢰를 만드는 흐름입니다.",
  },
  {
    id: "coreIdentity", title: "두 별이 동시에 말하는 당신의 본질", keyInsight: "당신의 독립성은 혼자 있고 싶다는 뜻보다, 납득하지 못한 기준에는 쉽게 맞추지 않는다는 뜻에 가깝습니다.",
    body: "두 전통의 공통 신호는 감각과 판단을 함께 쓰는 사람이라는 점입니다. 그래서 조용해 보여도 마음속에서는 오래 비교하고, 선택한 뒤에는 쉽게 방향을 바꾸지 않습니다.",
  },
  {
    id: "outerVsInner", title: "겉으로 보이는 나와 아무도 모르는 나", keyInsight: "사람들은 당신을 안정적이라 보지만, 당신은 관계와 일의 미세한 어긋남을 누구보다 먼저 알아차립니다.",
    body: "처음에는 부드럽고 여유 있어 보여도 가까워질수록 기준이 분명해집니다. 스트레스가 쌓이면 설명보다 거리를 먼저 두려는 경향이 있으니, 짧게라도 마음을 말로 알려 주는 편이 좋습니다.",
  },
  {
    id: "loveAndRelationships", title: "사랑과 관계의 별", keyInsight: "당신은 화려한 표현보다, 약속을 지키고 생활의 리듬을 존중하는 관계에서 깊이 사랑합니다.",
    body: "끌림은 빠를 수 있지만 신뢰는 천천히 확인합니다. 상대가 당신의 침묵을 무관심으로 오해하지 않도록, 불편한 순간에도 필요한 간격과 이유를 함께 말해 주세요.",
  },
  {
    id: "talentAndWork", title: "타고난 재능과 일", keyInsight: "당신의 경쟁력은 새 일을 벌이는 속도보다, 흩어진 감각을 반복 가능한 기준으로 정리하는 데 있습니다.",
    body: "자율성은 필요하지만 완전히 고립된 환경보다 신뢰할 동료와 품질 기준이 있는 곳에서 빛납니다. 지나친 간섭과 잦은 우선순위 변경이 있는 환경에서는 에너지가 빨리 닳을 수 있습니다.",
  },
  {
    id: "shadowPattern", title: "반복해서 부딪히는 그림자", keyInsight: "신중함이 길어질수록, 이미 느낀 불편을 설명 가능한 이유가 생길 때까지 미루게 될 수 있습니다.",
    body: "이 경향은 실패를 줄이지만 필요한 전환도 늦출 수 있습니다. 불안한 날에는 결론을 강요하기보다, 지금 확인할 수 있는 사실 하나와 다음 행동 하나만 정해 보세요.",
  },
  {
    id: "contrastBetweenSystems", title: "두 전통이 서로 다르게 보는 당신", keyInsight: "베다는 당신의 감각적 몰입을, 숙요는 사람과 상황을 읽는 거리감을 더 강하게 비춥니다.",
    body: "이 둘은 모순이 아닙니다. 마음이 움직일 때는 깊게 몰입하지만, 결정의 순간에는 한 발 물러나 전체 판을 확인하는 모습으로 함께 나타날 수 있습니다.",
  },
  {
    id: "lifeManual", title: "당신이라는 별의 사용 설명서", keyInsight: "잘되는 날에는 선택의 기준을 줄이고, 힘든 날에는 혼자 버티기 전에 리듬을 회복할 작은 약속을 만드세요.",
    body: "사람은 말보다 일관성으로 고르고, 일은 간섭의 양보다 완성 기준이 선명한지를 먼저 보세요. 감정이 과부하일 때는 새 결심보다 잠·식사·정리처럼 몸의 리듬을 되돌리는 행동이 우선입니다.\n\n### 이번 주에 지킬 세 가지\n- 중요한 선택의 기준을 세 가지로 제한하기\n- 서운함을 하루 안에 짧은 문장으로 알리기\n- 하루 한 번, 내 리듬을 회복하는 시간을 지키기",
  },
  {
    id: "closingMessage", title: "마지막 별의 문장", keyInsight: "당신의 별은 서두르라고 말하지 않습니다. 대신 납득한 길에서는 오래 걸을 힘을 이미 갖고 있다고 말합니다.",
    body: "두 전통의 언어가 만나는 곳에는, 천천히 고른 것을 끝까지 자기 것으로 만드는 당신의 방식이 있습니다.",
  },
];

export const nakshatraAiResponse = {
  ok: true,
  accessToken: "mock-nakshatra-ai-access",
  consultation: {
    natal: {
      sukuyoKo: "수성", sukuyoHan: "昴", sukuyoDirection: "서방", sukuyoGuardian: "백호",
      nakshatraKo: "로히니", nakshatraEn: "Rohini", pada: 2, lordKo: "달",
    },
    decks: { consultation: dualStarSections },
    totalCharCount: 8400,
  },
};
