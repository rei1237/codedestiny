/**
 * 커리어 전환 타로(이직 타로) — 유료 리딩 생성기. **서버 전용.**
 *
 * 2026-08-24 이전에는 이 표와 함수가 전부 `tarot-ijik.html` 안에 있었다. 결제는
 * `/api/billing/coin-gate` 가 서버에서 차감하는데 **리딩은 브라우저가 만들었다** —
 * 콘솔에서 `createLocalJobChangeReading(drawnCards, getJobChangeAssessment(drawnCards))`
 * 한 줄이면 5,000원짜리 결과가 공짜로 나왔다. 같은 페이지의 `callTarotApi` 는 정의만 있고
 * 호출부가 0곳이라, 서버는 이 상품의 콘텐츠를 한 번도 만든 적이 없었다.
 *
 * 🔴 정적 호스팅이라 `js/**` 아래 파일은 URL 로 그냥 열린다. 그래서 판정 표를 그쪽에 두면
 *    import 를 끊어도 소용이 없다 — 파일 자체가 워커에 있어야 한다.
 *    결과를 내보내는 유일한 입구는 `POST /api/tarot/ijik-reading` 이고, 그 라우트가
 *    `verifyPerUsePayment` 로 `tarot-ijik` 회당 결제를 확인한다.
 *
 * 카드를 **뽑는** 일은 브라우저에 남아 있다. 사용자는 결제 전에 7장을 보고 결정하므로
 * 뽑기 자체는 팔고 있는 물건이 아니다.
 */


/* ── 자리와 카드 신호 표 (tarot-ijik.html 에서 그대로 옮겨 왔다) ───────────── */
const POSITIONS = [
  {label:'지금 회사에 남을 때의 흐름', q:'현직을 유지하면 얻는 것과 소모되는 것은 무엇인가?'},
  {label:'이직의 문이 열리는 조건', q:'어떤 조건에서 새로운 자리가 나에게 맞는 선택이 될까?'},
  {label:'내가 진짜 바꾸고 싶은 것', q:'회사, 역할, 보상, 성장 중 무엇을 바꾸고 싶은가?'},
  {label:'옮겼을 때의 가까운 흐름', q:'이직 후 1~3개월 안에 먼저 겪을 변화는 무엇인가?'},
  {label:'지금 준비하면 열리는 시기', q:'언제 움직일 때 흐름을 살리고, 무엇을 먼저 준비해야 할까?'},
  {label:'이직 전 반드시 확인할 조건', q:'퇴사 전에 계약·보상·역할·팀에서 무엇을 확인해야 할까?'},
  {label:'최종 방향과 시기', q:'지금 이직할까, 현직을 유지할까, 준비 후 움직일까? 어느 시기 흐름이 맞을까?'},
];

const CARD_SIGNAL_BY_ID = {
  M00: { up: '바보는 아직 이름 붙지 않은 길을 향한 첫 숨을 비춥니다.', re: '바보의 역방향은 설렘보다 충동이 앞서지 않는지 묻습니다.' },
  M01: { up: '마법사는 이미 손안에 있는 도구를 현실의 성과로 바꾸는 힘을 보여줍니다.', re: '마법사의 역방향은 능력은 있으나 초점이 흩어진 상태를 비춥니다.' },
  M02: { up: '여사제는 조용한 직감과 보이지 않는 정보를 먼저 읽으라고 말합니다.', re: '여사제의 역방향은 감을 믿기 전에 사실을 다시 확인하라는 신호입니다.' },
  M03: { up: '여황제는 성장, 돌봄, 창작성이 살아나는 환경을 가리킵니다.', re: '여황제의 역방향은 너무 많이 주고도 정작 자신은 마르는 흐름을 경계합니다.' },
  M04: { up: '황제는 질서와 책임, 명확한 권한이 있는 자리를 비춥니다.', re: '황제의 역방향은 통제와 안정에 묶여 새 선택이 좁아진 상태를 보여줍니다.' },
  M05: { up: '교황은 배울 체계와 믿을 만한 기준을 통해 길이 열림을 알립니다.', re: '교황의 역방향은 남의 정답을 그대로 따를수록 자기 길이 흐려진다고 말합니다.' },
  M06: { up: '연인은 가치와 선택이 만나는 지점에서 일의 방향이 선명해짐을 보여줍니다.', re: '연인의 역방향은 마음과 조건이 서로 다른 말을 하고 있음을 비춥니다.' },
  M07: { up: '전차는 방향을 정하면 빠르게 움직일 수 있는 추진력을 줍니다.', re: '전차의 역방향은 속도보다 조향이 먼저라는 메시지를 전합니다.' },
  M08: { up: '힘은 조용한 끈기와 자기 신뢰가 다음 문을 연다고 말합니다.', re: '힘의 역방향은 버티는 힘이 소진으로 변하기 전에 회복이 필요함을 알립니다.' },
  M09: { up: '은둔자는 잠시 물러서서 자신의 기준을 정교하게 다듬는 시간을 비춥니다.', re: '은둔자의 역방향은 혼자만의 고민이 길어져 현실 확인이 늦어지는 흐름을 경계합니다.' },
  M10: { up: '운명의 수레바퀴는 흐름이 바뀌는 시점과 예상 밖의 기회를 가리킵니다.', re: '운명의 수레바퀴 역방향은 변화가 오더라도 준비 없는 선택은 반복을 만든다고 말합니다.' },
  M11: { up: '정의는 조건, 계약, 보상, 책임을 공정하게 따져야 함을 보여줍니다.', re: '정의의 역방향은 감정적 판단이나 불균형한 조건을 다시 살피라는 신호입니다.' },
  M14: { up: '절제는 급한 이동보다 균형 잡힌 전환이 길을 오래 지킨다고 말합니다.', re: '절제의 역방향은 일과 회복, 기대와 현실의 비율이 어긋났음을 비춥니다.' },
  M16: { up: '탑은 더는 유지하기 어려운 구조가 드러나며 새 기준이 필요함을 알립니다.', re: '탑의 역방향은 피하고 있던 변화가 작게라도 문을 두드리고 있음을 보여줍니다.' },
  M17: { up: '별은 멀리 보이는 가능성이 다시 마음의 방향을 밝혀주는 카드입니다.', re: '별의 역방향은 희망이 흐려졌을 때 작은 회복부터 다시 시작하라고 말합니다.' },
  M19: { up: '태양은 재능이 드러나고 인정받는 밝은 무대를 비춥니다.', re: '태양의 역방향은 보여지는 성취보다 실제 만족을 먼저 확인하라는 메시지입니다.' },
};

const JOB_CHANGE_READING_BY_POSITION = [
  {
    up: '현직에는 이미 익숙한 자원과 쌓아 온 신뢰가 있습니다. 다만 그 안정이 성장의 기반인지, 변화가 멈춘 대가인지 구분해야 다음 선택이 선명해집니다.',
    re: '현재 회사에서 얻는 것보다 소모되는 것이 커졌을 수 있습니다. 감정이 가장 높은 날 바로 결론 내리기보다, 역할·보상·업무량 중 실제로 바뀔 수 있는 항목부터 확인하세요.',
    actionUp: '현재 회사에서 지키고 싶은 것과 바꾸고 싶은 것을 각각 세 가지씩 적어보세요.',
    actionRe: '일에서 기운이 켜지는 순간과 꺼지는 순간을 각각 세 줄로 적어보세요.',
  },
  {
    up: '이직의 문은 막연한 탈출감보다 조건의 정합성에서 열립니다. 의사결정 방식, 역할의 경계, 성장 기회와 보상을 하루의 장면으로 구체화해 보세요.',
    re: '새 자리를 너무 아름답게 상상하면 같은 피로가 형태만 바꾸어 돌아올 수 있습니다. 회의량, 보고 방식, 성과 기준처럼 실제 하루를 바꾸는 조건을 먼저 물어야 합니다.',
    actionUp: '관심 직무 공고 세 개를 모아 공통 조건과 빠진 정보를 표시하세요.',
    actionRe: '관심 기업 한 곳의 직무 설명과 실제 후기를 나란히 읽어보세요.',
  },
  {
    up: '지금 바꾸고 싶은 것은 회사 이름보다 일하는 방식, 보상, 성장 속도 중 하나일 수 있습니다. 무엇이 달라지면 같은 일을 해도 마음이 회복되는지 살펴보세요.',
    re: '소명감이 흐려진 상태에서 회사를 바꾸려 할 수 있습니다. 회사의 문제인지, 역할의 문제인지, 오래 돌보지 못한 마음의 문제인지 먼저 나누어야 합니다.',
    actionUp: '회사·역할·보상·성장 중 가장 먼저 바꾸고 싶은 한 가지를 문장으로 적으세요.',
    actionRe: '작은 교육, 사이드 프로젝트, 커뮤니티 참여 중 하나로 관심사를 다시 깨워보세요.',
  },
  {
    up: '옮긴 뒤 1~3개월은 새 역할과 조직의 리듬을 익히는 시간이 됩니다. 처음부터 증명하려 애쓰기보다 관찰하고 질문하며 신뢰를 쌓을 때 변화가 실제 성장으로 이어집니다.',
    re: '이직 후의 장면을 지나치게 밝게만 상상하면 같은 불만이 돌아올 수 있습니다. 새 자리에서 해결될 문제와 구조적으로 남을 문제를 미리 분리하세요.',
    actionUp: '이직 후 첫 90일 동안 익혀야 할 사람, 규칙, 업무 언어를 적어보세요.',
    actionRe: '현재 자리에서 바꿀 수 있는 것과 바꿀 수 없는 것을 두 칸으로 나누세요.',
  },
  {
    up: '시기는 큰 결심보다 준비의 밀도에서 드러납니다. 이력서는 완벽해진 뒤 쓰는 문서가 아니라, 쓰면서 내가 원하는 역할을 확인하는 지도입니다.',
    re: '움직여야 함을 알면서도 문 앞에서 멈춰 있습니다. 두려움, 정보 부족, 에너지 고갈 중 무엇이 시기를 늦추는지 이름 붙이면 다음 행동이 작아집니다.',
    actionUp: '프로필 한 줄을 고치거나 포트폴리오 한 항목을 정리하세요.',
    actionRe: '이력서 파일을 열어 날짜 하나만 고쳐도 충분합니다.',
  },
  {
    up: '퇴사 전에 내려놓아야 할 것은 준비 자체가 아니라, 확인 없이도 괜찮을 것이라는 기대입니다. 계약·보상·역할·팀의 실체가 말과 문서에서 일치하는지 살펴야 합니다.',
    re: '안정감과 익숙한 관계가 새 길의 판단을 흐릴 수 있지만, 모든 것을 버리라는 뜻은 아닙니다. 퇴사 전 생활비 여유와 입사 후 첫 90일의 기대치를 먼저 확인하세요.',
    actionUp: '새 자리의 계약·보상·역할·팀에 물어볼 질문을 네 묶음으로 정리하세요.',
    actionRe: '퇴사 전 확인하지 못한 조건을 적고 답을 받을 때까지 결정을 보류하세요.',
  },
  {
    up: '이번 흐름은 이직을 서두르라는 명령보다, 움직일 수 있는 문이 열리고 있음을 보여줍니다. 다만 최종 선택은 카드보다 실제 조건을 확인했을 때 힘을 얻습니다.',
    re: '확신이 흔들리는 시간은 실패가 아니라 더 정확한 선택을 위한 정지 신호입니다. 지금은 현직을 기반으로 회복·정보 확인·준비를 마친 뒤 판단하는 편이 좋습니다.',
    actionUp: '30일 안에 직무 탐색, 이력서 정비, 조건 확인 일정을 캘린더에 올리세요.',
    actionRe: '이번 주에는 결론을 미루고 회복, 관찰, 정보 확인만 진행하세요.',
  },
];

/* ── 이직 판정 (js/tarot-job-change-assessment.js 의 UMD 본문) ──────────── */
const MOVE_CARDS = new Set(['M00', 'M01', 'M07', 'M10', 'M16', 'M17', 'M19']);
const STAY_CARDS = new Set(['M04', 'M05', 'M08', 'M09', 'M11', 'M14']);
const TIMING_CARDS = {
  immediate: new Set(['M01', 'M07', 'M10', 'M19']),
  near: new Set(['M00', 'M03', 'M06', 'M16', 'M17']),
  later: new Set(['M02', 'M04', 'M05', 'M08', 'M09', 'M11', 'M14']),
};
const POSITION_WEIGHTS = [1, 1, 1, 2, 2, 1, 3];
const TIMING_POSITION_WEIGHTS = [2, 2, 3];

const TIMING_META = {
  immediate: {
    label: '지금~4주',
    summary: '작게 움직이며 반응을 확인하기 좋은 빠른 흐름입니다.',
  },
  near: {
    label: '1~3개월',
    summary: '정보와 조건을 정리한 뒤 현실적인 선택지가 열리는 흐름입니다.',
  },
  later: {
    label: '3~6개월',
    summary: '서두르기보다 기반을 다질수록 안정적으로 움직일 수 있는 흐름입니다.',
  },
  prepare: {
    label: '준비기',
    summary: '정확한 날짜보다 준비의 완성도가 다음 움직임을 여는 흐름입니다.',
  },
};

const DIRECTION_META = {
  move_open: {
    label: '이직 쪽으로 열림',
    summary: '새로운 자리를 탐색하고 조건을 비교해 볼 만한 흐름입니다.',
  },
  stay_stable: {
    label: '현직 유지가 안정적',
    summary: '당장은 현재 자리를 기반으로 실속을 챙기며 조정하는 편이 안정적입니다.',
  },
  prepare_conditionally: {
    label: '준비 후 판단',
    summary: '지금 결론을 서두르기보다 확인 조건을 채운 뒤 움직이는 편이 좋습니다.',
  },
};

function getCardId(card) {
  return String(card && (card.id || card.cardId || card.code) || '').toUpperCase();
}

function isReversed(card) {
  if (!card) return false;
  return card.reversed === true
    || card.isReversed === true
    || card.orientation === 'reversed'
    || card.direction === 'reversed'
    || card.position === 'reversed';
}

function getTimingKey(card) {
  const id = getCardId(card);
  return Object.keys(TIMING_CARDS).find((key) => TIMING_CARDS[key].has(id)) || null;
}

function buildCurrentCompanyAdvice(directionKey, timingKey) {
  if (directionKey === 'move_open') {
    return `현재 회사는 이직 준비를 마치는 동안의 안전한 기반으로 활용하세요. ${TIMING_META[timingKey].label} 흐름을 참고하되, 서면으로 확인된 조건이 생기기 전에는 성급하게 퇴사를 결정하지 않는 편이 좋습니다.`;
  }
  if (directionKey === 'stay_stable') {
    return '현재 회사에 남는다면 단순히 버티기보다 역할·보상·업무량 중 조정할 항목을 하나 정해 협상하세요. 조정 뒤에도 같은 소모가 반복되는지 살피며 다음 판단의 기준을 만들어 두면 좋습니다.';
  }
  return '결론이 흐릿한 시기에는 현재 회사를 유지한 채 이력서·시장 정보·생활 여유를 정리하세요. 확인 조건이 채워지기 전까지는 감정만으로 퇴사일을 정하지 않는 편이 안전합니다.';
}

function buildCheckpoints(directionKey) {
  const common = [
    '계약 형태, 연봉·인센티브, 수습·복지 조건이 현재 조건과 어떻게 달라지는지 서면으로 확인하기',
    '실제 역할과 의사결정 권한, 보고 라인, 팀 분위기와 업무량을 입사 전 질문하기',
    '퇴사 시점과 생활비 여유, 입사 후 첫 90일의 기대치가 현실적으로 맞는지 점검하기',
  ];
  if (directionKey === 'stay_stable') {
    return [
      '현재 회사에서 역할·보상·업무량 중 무엇을 조정할 수 있는지 확인하기',
      '조정 요청의 답변과 실행 시점을 기록해 실제 변화가 있는지 살피기',
      '변화가 없을 때를 대비해 이력서와 시장 정보를 조용히 업데이트하기',
    ];
  }
  if (directionKey === 'prepare_conditionally') {
    return [
      '내가 바꾸려는 것이 회사인지, 역할·보상·성장 환경인지 한 문장으로 정리하기',
      '계약·보상·역할·팀에 관한 확인 질문과 원하는 답변의 기준을 미리 만들기',
      '퇴사 전 생활비 여유와 입사 후 첫 90일 계획을 숫자와 일정으로 점검하기',
    ];
  }
  return common;
}

function buildActions(directionKey, timingKey) {
  if (directionKey === 'stay_stable') {
    return [
      '1주차: 현재 회사에서 지키고 싶은 것과 바꾸고 싶은 것을 각각 세 가지씩 적기',
      '2~3주차: 역할·보상·업무량 중 한 가지를 근거와 함께 조정 요청하기',
      '4주차: 실제 변화가 있었는지 기록하고, 계속 남을 조건과 탐색할 조건을 나누기',
    ];
  }
  if (directionKey === 'prepare_conditionally') {
    return [
      '1주차: 이직 이유와 원하는 역할을 한 문장으로 정리하고 우선순위를 세우기',
      '2~3주차: 관심 있는 공고·업계·직무 정보를 비교하며 확인 질문을 모으기',
      '4주차: 이력서·포트폴리오와 생활 여유를 점검한 뒤 다음 지원 시점을 정하기',
    ];
  }
  const timingAction = timingKey === 'immediate'
    ? '관심 있는 자리의 정보를 빠르게 확인하고 작은 지원 또는 대화를 시작하기'
    : '관심 있는 자리의 조건을 비교하고 지원 준비를 현실적인 일정으로 나누기';
  return [
    `1주차: ${timingAction}`,
    '2~3주차: 계약·보상·역할·팀에 대한 확인 질문을 준비하고 주변의 실제 정보를 듣기',
    '4주차: 서면 조건과 생활 여유를 대조해 다음 단계로 갈지 멈출지 결정하기',
  ];
}

function assessJobChange(cards) {
  const safeCards = Array.isArray(cards) ? cards : [];
  let moveScore = 0;
  let stayScore = 0;
  let reversedCount = 0;

  safeCards.forEach((card, index) => {
    const weight = POSITION_WEIGHTS[index] || 1;
    const reversed = isReversed(card);
    if (reversed) reversedCount += 1;
    if (reversed) return;
    const id = getCardId(card);
    if (MOVE_CARDS.has(id)) moveScore += weight;
    if (STAY_CARDS.has(id)) stayScore += weight;
  });

  const finalCard = safeCards[6];
  const finalId = getCardId(finalCard);
  const finalReversed = isReversed(finalCard);
  let directionKey = 'prepare_conditionally';
  if (reversedCount < 4 && !finalReversed) {
    if (MOVE_CARDS.has(finalId) && moveScore >= stayScore) directionKey = 'move_open';
    else if (STAY_CARDS.has(finalId) && stayScore >= moveScore) directionKey = 'stay_stable';
    else if (moveScore >= stayScore + 3) directionKey = 'move_open';
    else if (stayScore >= moveScore + 3) directionKey = 'stay_stable';
  }

  const timingVotes = { immediate: 0, near: 0, later: 0, prepare: 0 };
  [3, 4, 6].forEach((positionIndex, voteIndex) => {
    const card = safeCards[positionIndex];
    const timingKey = getTimingKey(card);
    const weight = TIMING_POSITION_WEIGHTS[voteIndex];
    if (isReversed(card)) timingVotes.prepare += weight;
    else if (timingKey) timingVotes[timingKey] += weight;
    else timingVotes.prepare += weight;
  });
  if (reversedCount >= 4 || finalReversed) timingVotes.prepare += 10;

  const timingKey = Object.keys(timingVotes).sort((a, b) => {
    if (timingVotes[b] !== timingVotes[a]) return timingVotes[b] - timingVotes[a];
    return Object.keys(timingVotes).indexOf(b) - Object.keys(timingVotes).indexOf(a);
  })[0];

  return {
    timing: { key: timingKey, label: TIMING_META[timingKey].label, summary: TIMING_META[timingKey].summary },
    direction: { key: directionKey, label: DIRECTION_META[directionKey].label, summary: DIRECTION_META[directionKey].summary },
    currentCompany: buildCurrentCompanyAdvice(directionKey, timingKey),
    checkpoints: buildCheckpoints(directionKey),
    actions: buildActions(directionKey, timingKey),
  };
}

/* ── 리딩 본문과 AI 프롬프트 ─────────────────────────────────────────── */
function createLocalJobChangeReading(cards, assessment) {
  const resolvedAssessment = assessment || getJobChangeAssessment(cards);
  const sections = [];
  const actionItems = [];
  const reversedCount = cards.filter((card) => card && card.orientation === 'reversed').length;
  const flowText = reversedCount >= 4
    ? '역방향의 기운이 강합니다. 지금은 빠른 결론보다 기준을 맑히고 손실을 줄이는 선택이 먼저입니다.'
    : '정방향의 기운이 우세합니다. 지금의 고민은 다음 자리로 옮겨 갈 준비를 현실로 다듬으라는 신호입니다.';

  sections.push(`✦ 핵심 흐름\n${flowText}`);
  sections.unshift([
    '✦ 이번 리딩의 결론',
    `이직 흐름: ${resolvedAssessment.direction.label}`,
    `움직일 시기: ${resolvedAssessment.timing.label}`,
    `현직 유지: ${resolvedAssessment.currentCompany}`,
    `방향의 의미: ${resolvedAssessment.direction.summary}`,
    `시기의 의미: ${resolvedAssessment.timing.summary}`,
    '결정 전 확인할 조건:',
    ...(resolvedAssessment.checkpoints || []).map((item, index) => `${index + 1}. ${item}`),
  ].join('\n'));

  for (let i = 0; i < POSITIONS.length; i++) {
    const pos = POSITIONS[i];
    const card = cards[i] || {};
    const cardName = card.nameKr || card.name || `카드 ${i + 1}`;
    const isReversed = card.orientation === 'reversed';
    const directionLabel = isReversed ? '역방향' : '정방향';
    const cardSignal = CARD_SIGNAL_BY_ID[card.cardId] || { up: '이 카드는 지금의 선택을 다시 바라보게 합니다.', re: '이 카드는 선택 앞의 망설임을 차분히 살피라고 말합니다.' };
    const entry = JOB_CHANGE_READING_BY_POSITION[i] || JOB_CHANGE_READING_BY_POSITION[0];
    const signal = isReversed ? cardSignal.re : cardSignal.up;
    const body = isReversed ? entry.re : entry.up;
    const action = isReversed ? entry.actionRe : entry.actionUp;
    actionItems.push(`${i + 1}. ${action}`);
    sections.push(`✦ 카드 ${i + 1} · ${pos.label}\n『${cardName} · ${directionLabel}』\n${signal}\n${body}\n작은 실천: ${action}`);
  }

  sections.push(`━━━━━━━━━━━━━━━━\n✦ 앞으로 30일의 선택 기준\n${(resolvedAssessment.actions || actionItems.slice(0, 3)).map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n이번 리딩은 퇴사와 합격을 단번에 맞히는 예언이 아니라, 안전하게 움직이기 위한 작은 나침반입니다. 오늘 나온 조언 중 하나만 일정에 올리면 막연한 고민이 현실의 길로 바뀌기 시작합니다.`);
  return sections.join('\n\n');
}

function compactIjikPromptText(value, fallback) {
  const raw = Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean).join(' / ') : String(value || '').trim();
  return raw.replace(/\s+/g, ' ').trim() || fallback || '아직 말로 다 드러나지 않은 흐름입니다.';
}

function buildIjikAiPromptText(cards, readingText, assessment) {
  const resolvedAssessment = assessment || getJobChangeAssessment(cards);
  const cardLines = (cards || []).map((card, index) => {
    const position = POSITIONS[index] || {};
    const cardName = card.nameKr || card.name || `카드 ${index + 1}`;
    const directionLabel = card.orientation === 'reversed' ? '역방향' : '정방향';
    const cardSignal = CARD_SIGNAL_BY_ID[card.cardId] || {};
    const signal = card.orientation === 'reversed' ? cardSignal.re : cardSignal.up;

    return [
      `${index + 1}. ${compactIjikPromptText(position.label, '일의 문턱')} · ${cardName} ${directionLabel}`,
      `이 카드가 여는 질문: ${compactIjikPromptText(position.q, '지금 내 일이 어디로 흐르는지 봅니다.')}`,
      `카드의 신호: ${compactIjikPromptText(signal, '이 카드는 지금의 선택을 다시 바라보게 합니다.')}`,
    ].join('\n');
  }).join('\n\n');

  return [
    '이직 운명의 카드에서 열린 아래 일곱 장을 바탕으로, 지금 내 일의 문턱이 어느 방향으로 기울어 있는지 더 깊게 봐주세요.',
    '커리어 타로 리더처럼 말해주세요. 단정적인 퇴사·합격 예언보다 남길 기준, 옮길 방향, 확인해야 할 조건, 앞으로 30일의 현실 행동을 중심으로 읽어주세요.',
    '',
    '일곱 장의 배열',
    cardLines || '아직 카드가 조용히 닫혀 있습니다.',
    '',
    '방금 열린 흐름',
    compactIjikPromptText(readingText, '일곱 장의 흐름이 아직 말로 정리되지 않았습니다.'),
    '',
    '이번 판정 요약',
    `이직 흐름: ${compactIjikPromptText(resolvedAssessment.direction && resolvedAssessment.direction.label, '준비 후 판단')}`,
    `움직일 시기: ${compactIjikPromptText(resolvedAssessment.timing && resolvedAssessment.timing.label, '준비기')}`,
    `현직 유지 조건: ${compactIjikPromptText(resolvedAssessment.currentCompany, '현재 회사를 유지하며 조건을 확인합니다.')}`,
    `결정 전 확인할 조건: ${compactIjikPromptText(resolvedAssessment.checkpoints, '계약·보상·역할·팀·생활 여유를 확인합니다.')}`,
    `앞으로 30일 행동: ${compactIjikPromptText(resolvedAssessment.actions, '이직 이유를 정리하고 정보를 확인합니다.')}`,
    '',
    '마지막에는 위의 시기, 이직 방향, 현직 유지 조건을 바탕으로 지금 남겨야 할 일의 기준 3가지, 옮겨도 좋은 신호 3가지, 아직 확인해야 할 조건 3가지를 조용히 정리해주세요.',
  ].join('\n');
}

/**
 * 라우트가 부르는 유일한 진입점. 카드 7장을 받아 판정·리딩·AI 프롬프트를 한 번에 만든다.
 */
export function buildIjikReading(cards) {
  const list = Array.isArray(cards) ? cards.slice(0, POSITIONS.length) : [];
  const assessment = assessJobChange(list);
  const reading = createLocalJobChangeReading(list, assessment);
  const aiPrompt = buildIjikAiPromptText(list, reading, assessment);
  return { assessment, reading, aiPrompt };
}

export { assessJobChange, getCardId, isReversed };
