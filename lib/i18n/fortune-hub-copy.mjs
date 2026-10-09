// Korean hub metadata. Dates come from the existing fortune view model.
export const fortuneHubCopy = {
  ko: {
    tomorrowQuestionTitle: '내일 운세 {date} | 나의 띠·별자리 운세는?',
    tomorrowHeading: '내일의 운세',
    tomorrowLead: '꿀꿀 사주와 내일을 준비해요. 달콤한 위로에, 일상에 쓸 작은 조언을 더해요.',
    tomorrowIntro: '나의 띠나 별자리를 고르면 내일의 총운·연애·재물 흐름과 계산 근거를 함께 볼 수 있어요.',
    systemsHeading: '내일의 고민, 다른 관점으로 살펴봐요',
    systemsLead: '띠·별자리는 함께 나누는 흐름을, 생년월일을 입력한 운세는 나와 날짜의 관계를 살펴봐요. 체계를 섞어 하나의 점수로 만들지 않고 필요한 관점을 골라요.',
    systems: [
      { key: 'saju', title: '일과 선택이 걱정될 때 · 사주', body: '내일 일진의 천간·지지와 내 일간의 관계를 살펴봐요. 해야 할 일을 늘리기보다 마무리할 일 하나와 도움을 구할 일을 나눠보세요.' },
      { key: 'sukuyo', title: '만남과 대화가 걱정될 때 · 숙요점', body: '내일 달의 숙과 본명숙 사이의 관계를 참고해요. 상대의 마음을 단정하지 말고 먼저 들어볼 질문 하나를 준비해 보세요.' },
      { key: 'vedic', title: '하루의 리듬을 살필 때 · 베다점', body: '달의 항성 위치와 판창가를 읽어요. 숙요점과 다른 계산 체계이며, 일정을 확정하는 예언보다 바쁜 시간과 쉴 틈을 돌아보는 참고로 써요.' },
      { key: 'number', title: '작은 실천을 정하고 싶을 때 · 수비학', body: '생월·생일과 내일 날짜로 개인일수의 상징을 살펴봐요. 숫자를 성공 확률로 해석하지 않고, 시작·정리·소통 중 한 가지 실천을 골라요.' },
    ],
    openSystem: '내일 흐름 살펴보기',
    chooseSign: '나의 운세 바로 찾기',
    chooseAnimal: '태어난 해로 찾기',
    chooseZodiac: '생일로 찾기',
    preparation: '미리 준비할 일',
    details: '운세와 근거 읽기',
    readingGuide: '내일의 운세를 읽는 순서',
    readingSteps: [
      { title: '관심 있는 분야부터', body: '총운 하나로 하루를 판단하지 말고, 약속이 있다면 애정운을, 마감이 있다면 직장운을 함께 살펴보세요.' },
      { title: '숫자 옆의 근거까지', body: '점수는 같은 날짜의 일진·달의 위치와 띠·별자리의 관계를 계산한 참고 지표예요. 성공 확률이나 개인의 미래를 뜻하지 않아요.' },
      { title: '준비는 한 가지로', body: '메시지 초안 쓰기, 준비물 챙기기처럼 지금 할 수 있는 작은 행동을 하나 골라보세요. 타고난 성향과 날짜별 계산은 구분해 읽어요.' },
    ],
  },
};

// Presentation copy only. Existing date calculations and period readings remain authoritative.
export const tomorrowReadingCopy = {
  ko: { heading: '내일을 위해, 오늘 준비할 한 가지', note: '띠·별자리별 준비 가이드예요. 날짜별 점수와 계산 근거는 아래에서 따로 확인해요.', scores: '분야별 점수', evidence: '계산 근거', points: '행운 포인트' },
  en: { heading: 'One thing to prepare for tomorrow', note: 'A preparation guide for your sign. Date-specific scores and their calculation basis are shown separately below.', scores: 'Scores by area', evidence: 'Calculation basis', points: 'Lucky details' },
  ja: { heading: '明日のために、今日できる準備', note: '星座・干支別の準備のヒントです。日付ごとのスコアと計算の根拠は、下で分けて確認できます。', scores: '分野別スコア', evidence: '計算の根拠', points: 'ラッキーポイント' },
  'zh-CN': { heading: '为明天，先做好一件小事', note: '这是按星座或生肖提供的准备建议。每日评分及计算依据在下方单独列出。', scores: '各项评分', evidence: '计算依据', points: '幸运提示' },
  'zh-TW': { heading: '為明天，先做好一件小事', note: '這是按星座或生肖提供的準備建議。每日評分及計算依據在下方單獨列出。', scores: '各項評分', evidence: '計算依據', points: '幸運提示' },
};
