(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JobChangeAssessment = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

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

  return { assessJobChange, getCardId, isReversed };
});
