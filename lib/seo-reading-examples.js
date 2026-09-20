// Synthetic inputs only. Calculation facts are checked by verify-yeongnyangi-engines.
export const SEO_EXAMPLE_BIRTH = {
  birthDate: '1997-02-10', birthTime: '14:30', calendarType: 'solar', gender: 'female',
  birthPlace: { latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' },
};
export const SEO_READING_EXAMPLES = {
  '/saju': {
    input: '가상 인물 · 1997년 2월 10일 양력, 14시 30분, 여성, 서울',
    fact: '년주 丁丑 · 월주 壬寅 · 일주 癸未 · 시주 己未. 나를 대표하는 일간은 癸(계수)입니다.',
    interpretation: '계수는 작은 변화와 맥락을 살피는 물의 이미지로 설명할 수 있습니다. 다만 이 한 글자로 성격이나 미래를 확정하지 않고 계절과 다른 글자의 관계를 함께 읽습니다.',
    action: '이번 주 결정 하나를 골라 이미 확인한 사실과 아직 추측인 부분을 나눠 적어 보세요.',
  },
  '/ziwei': {
    input: '가상 인물 · 1997년 2월 10일 양력, 14시 30분, 여성, 서울',
    fact: '명궁은 未(미)궁이며 주성은 천량입니다. 신궁은 복덕궁에 위치합니다.',
    interpretation: '천량의 보호와 기준이라는 상징을 책임감의 강점과 과도한 간섭의 가능성으로 함께 읽는 예시입니다. 명궁만으로 판단하지 않고 삼방사정과 다른 궁의 배치를 함께 봅니다.',
    action: '누군가를 돕기 전에 상대가 원하는 도움이 무엇인지 먼저 한 번 물어보세요.',
  },
  '/sukuyo': {
    input: '가상 인물 · 1997년 2월 10일 양력, 14시 30분, 서울. 천문식 27숙 기준',
    fact: '계산된 본명숙은 루숙(婁宿)입니다. 음력 날짜 고정표 방식과 결과가 다를 수 있습니다.',
    interpretation: '루숙의 연결과 친화력이라는 상징을 관계를 여는 강점으로 읽습니다. 인연이 많다는 사실만으로 관계가 깊어지지는 않으므로 유지할 관계를 고르는 관점도 함께 봅니다.',
    action: '새로운 약속을 더 잡기 전에 소중한 한 사람에게 안부를 전해 보세요.',
  },
};
