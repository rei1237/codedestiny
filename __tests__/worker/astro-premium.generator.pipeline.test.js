/**
 * @jest-environment node
 */

function buildBody(chapterSpec, sectionTitle, extraTokens = []) {
  const tokens = [chapterSpec.title, sectionTitle, ...extraTokens].filter(Boolean);
  return [
    `${tokens.join(' · ')}는 현재 차트에서 어떤 중심축이 작동하는지 보여 줍니다. 이 문단은 장기 성향, 감정 반응, 실행 습관이 서로 어떻게 엮이는지 한 번에 읽히도록 구성했습니다. 더 나아가, 반복되는 선택이 어떻게 감정의 안전지대와 충돌하는지까지 함께 설명해 실제 판단 기준으로 바꿉니다.`,
    `${sectionTitle}의 관점에서는 일상에서 드러나는 선택의 패턴을 살펴봅니다. 같은 결정이 반복되는 이유와, 그 반복을 끊는 실천 기준을 분명하게 제시합니다. 여기에 사람, 일, 관계, 회복의 맥락을 덧붙여 읽으면 앞으로의 선택이 훨씬 선명해집니다.`,
    `실전 적용 단계에서는 이 신호를 관계, 일, 회복, 자원 관리에 연결합니다. 추상적인 설명보다 생활 속 행동으로 바꿔 읽을 수 있도록 사례 중심으로 정리합니다. 또한 말보다 행동이 먼저 나오는 순간을 구체적으로 짚어, 해석이 습관 변화로 이어지도록 만듭니다.`,
    `마지막으로 ${chapterSpec.title} 전체를 묶어, 앞으로 어떤 태도로 반응하면 좋은지 정리합니다. 짧은 요약이 아니라 바로 실행 가능한 판단 기준을 남기는 데 초점을 둡니다. 선택의 우선순위, 경계선, 회복 속도를 한 번에 정리하는 마무리 문단입니다.`,
    `보이는 결과와 보이지 않는 동기 사이의 간격도 함께 살핍니다. 같은 선택이 왜 다른 관계에서는 다른 결과를 만드는지까지 짚어 두어, 해석이 실제 삶에서 바로 쓰이도록 만듭니다. 다음 단계에서는 어떤 신호를 믿고 어떤 신호를 보류할지까지 적어 둡니다.`,
  ].join('\n\n');
}

function astroTokensForChapter(chapterNo) {
  switch (chapterNo) {
    case 1:
      return ['태양', '달', 'ASC', 'MC', '상승궁'];
    case 5:
      return ['금성', '화성', '7하우스'];
    case 6:
      return ['MC', '10하우스', '토성'];
    case 9:
      return ['12하우스', '8하우스', '명왕성'];
    case 11:
      return ['남쪽 노드', '북쪽 노드', '노드축'];
    case 12:
      return ['3년', '5년', '10년'];
    default:
      return ['태양', '달', 'ASC'];
  }
}

function makeSwissChart() {
  return {
    source: 'swiss-wasm-local',
    planets: {
      Sun: { signKo: '사자자리', longitude: 120.5, house: 10, degree: 0.5 },
      Moon: { signKo: '천칭자리', longitude: 180.2, house: 7, degree: 0.2 },
      Mercury: { signKo: '처녀자리', longitude: 150.1, house: 9, degree: 0.1 },
      Venus: { signKo: '황소자리', longitude: 60.3, house: 4, degree: 0.3 },
      Mars: { signKo: '양자리', longitude: 20.4, house: 1, degree: 0.4 },
      Jupiter: { signKo: '궁수자리', longitude: 270.1, house: 12, degree: 0.1 },
      Saturn: { signKo: '물고기자리', longitude: 330.2, house: 2, degree: 0.2 },
    },
    ascendant: { signKo: '천칭자리', longitude: 180.0, degree: 0, house: 1 },
    midheaven: { signKo: '염소자리', longitude: 270.0, degree: 0, house: 10 },
    houseCusps: Array.from({ length: 12 }, (_, index) => (index * 30) + 15),
    aspects: [
      { p1: 'Sun', p2: 'Moon', type: 'trine', orb: 2.3 },
      { p1: 'Sun', p2: 'Saturn', type: 'square', orb: 5.1 },
    ],
  };
}

describe('Astro premium generator local-only pipeline', () => {
  let astro;

  beforeAll(async () => {
    astro = await import('../../worker/lib/astro-premium-generator.js');
  });

  function makeInput(overrides = {}) {
    return {
      birthInput: {
        name: '테스터',
        gender: 'female',
        birthDate: '1991-02-20',
        birthYear: 1991,
        birthMonth: 2,
        birthDay: 20,
        birthTime: '07:00',
        birthHour: 7,
        birthMinute: 0,
        timezone: 'Asia/Seoul',
        birthPlace: '서울',
        latitude: 37.5665,
        longitude: 126.978,
      },
      swissChart: makeSwissChart(),
      ...overrides,
    };
  }

  test('로컬 생성으로 PDF가 완성되어야 한다', async () => {
    const generated = await astro.generateAstroPremiumReport({}, makeInput(), {
      llmChapterGenerator: async ({ chapterSpec }) => ({
        title: chapterSpec.title,
        sections: chapterSpec.sections.map((section, sectionIndex) => ({
          title: section.title,
          body: buildBody(chapterSpec, section.title, astroTokensForChapter(chapterSpec.chapterNo).concat([`섹션 ${sectionIndex + 1}`])),
        })),
      }),
    });

    expect(generated.chapterCount).toBe(12);
    expect(generated.chapters).toHaveLength(12);
    expect(generated.fallbackUsed).toBe(false);
    expect(generated.manuscriptSource).toBe('local-only');
    expect(generated.validation.ok).toBe(true);
    expect(generated.pdfReady && generated.pdfReady.html).toBeTruthy();
    expect(generated.totalLength).toBeGreaterThanOrEqual(40000);
  });

  test('LLM 생성기 실패와 무관하게 로컬 생성은 완료되어야 한다', async () => {
    const generated = await astro.generateAstroPremiumReport({}, makeInput(), {
      llmChapterGenerator: async () => {
        throw new Error('chapter failure');
      },
    });

    expect(generated.manuscriptSource).toBe('local-only');
    expect(generated.chapters).toHaveLength(12);
    expect(generated.validation.ok).toBe(true);
  });

  test('Swiss 차트가 없어도 safe chart로 생성이 완료되어야 한다', async () => {
    const generated = await astro.generateAstroPremiumReport({}, makeInput({
      swissChart: null,
    }), {
      llmChapterGenerator: async ({ chapterSpec }) => ({
        title: chapterSpec.title,
        sections: chapterSpec.sections.map((section) => ({
          title: section.title,
          body: buildBody(chapterSpec, section.title, astroTokensForChapter(chapterSpec.chapterNo)),
        })),
      }),
    });

    expect(generated.chapterCount).toBe(12);
    expect(generated.chapters).toHaveLength(12);
    expect(generated.pdfReady && generated.pdfReady.html).toBeTruthy();
    expect(generated.validationWarning).toBe(true);
  });

  test('birth input 정규화가 한국어 시간/별칭 필드를 처리해야 한다', () => {
    const normalized = astro.normalizeAstroPremiumBirthInput({
      name: '사용자',
      sex: '남성',
      date: '1991-02-20',
      timeText: '오전 7시',
      place: '서울',
      tz: 'Asia/Seoul',
      lat: 37.5665,
      lng: 126.978,
      birth_hour: 7,
    });

    expect(normalized.birthDate).toBe('1991-02-20');
    expect(normalized.birthYear).toBe(1991);
    expect(normalized.birthMonth).toBe(2);
    expect(normalized.birthDay).toBe(20);
    expect(normalized.birthHour).toBe(7);
    expect(normalized.birthMinute).toBe(0);
    expect(normalized.timezone).toBe('Asia/Seoul');
    expect(normalized.gender).toBe('male');
  });
});
