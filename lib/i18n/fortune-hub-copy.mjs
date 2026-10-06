// Korean hub metadata. Dates come from the existing fortune view model.
export const fortuneHubCopy = {
  ko: {
    tomorrowQuestionTitle: '내일 운세 {date} | 나의 띠·별자리 운세는?',
    tomorrowHeading: '내일의 운세',
    tomorrowLead: '내일이 조금 더 편안하도록, 오늘 한 가지를 준비해요.',
    tomorrowIntro: '나의 띠나 별자리를 고르면 내일의 총운·연애·재물 흐름과 계산 근거를 함께 볼 수 있어요.',
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
