/**
 * @jest-environment node
 */

function buildBody(chapterSpec, sectionTitle, extraTokens = []) {
  const tokens = [chapterSpec.title, sectionTitle, ...extraTokens].filter(Boolean);
  return [
    `${tokens.join(' · ')}는 차트의 핵심 축을 한 번에 보여 줍니다. 이 문단은 라그나, 달, 나크샤트라, 하우스 배치를 묶어서 현재 생애 흐름을 바로 읽을 수 있게 구성했습니다. 여기에 감정의 안정, 관계의 반복, 선택의 무게를 겹쳐 읽어 두면 본문 전체가 더 입체적으로 보입니다.`,
    `${sectionTitle}의 관점에서는 선택의 리듬과 우선순위를 살핍니다. 무엇을 먼저 다루고, 무엇을 나중에 조정해야 하는지 실천 기준까지 연결해 설명합니다. 또한 지금의 선택이 앞으로의 생활 습관과 어떤 방식으로 연결되는지까지 분리해 적어 둡니다.`,
    `관계와 일, 회복과 자원 관리의 영역에서는 현재 신호를 행동 규칙으로 바꾸는 일이 중요합니다. 이 부분은 장기 전략과 단기 대응을 분리해 읽을 수 있도록 정리합니다. 판단을 미루어야 하는 순간과 빠르게 움직여야 하는 순간도 함께 표시합니다.`,
    `마지막으로 ${chapterSpec.title}의 메시지를 일상 판단으로 환원합니다. 다음 단계에서 어떤 루틴을 유지할지, 어떤 경계선을 세울지, 무엇을 기다릴지까지 구체적으로 남깁니다. 결과보다 과정, 반응보다 준비, 감정보다 구조를 먼저 보는 태도를 강조합니다.`,
    `차트의 흐름을 삶으로 옮길 때는 작은 선택이 중요합니다. 이 문단은 그 선택이 관계, 일, 가족, 회복의 장면에서 어떻게 다르게 작동하는지 설명하고, 하루 단위의 실천으로 내려오도록 돕습니다.`,
    `끝으로 이 장은 앞으로의 결정에서 무엇을 우선해야 하는지 정리합니다. 운의 흐름을 기다리기만 하지 않고, 흐름을 받는 그릇을 어떻게 넓힐지까지 적어 두어 장기 전략으로 연결합니다.`,
  ].join('\n\n');
}

function vedicTokensForChapter(chapterNo) {
  switch (chapterNo) {
    case 1:
      return ['라그나', '달', '나크샤트라'];
    case 4:
      return ['라후', '케투'];
    case 5:
      return ['다샤', '마하 다샤', '안타르 다샤'];
    case 6:
      return ['금성', '7하우스', '배우자'];
    case 10:
      return ['6하우스', '8하우스', '12하우스'];
    case 12:
      return ['3년', '5년', '10년'];
    default:
      return ['라그나', '달', '다샤'];
  }
}

describe('Vedic premium generator local-only pipeline', () => {
  let vedic;

  beforeAll(async () => {
    vedic = await import('../../worker/lib/vedic-premium-generator.js');
  });

  function makeInput(overrides = {}) {
    return {
      name: '홍길동',
      gender: '남성',
      birthDate: '1991-02-20',
      birthTime: '07:00',
      timezone: 'Asia/Seoul',
      birthPlace: '서울',
      latitude: 37.5665,
      longitude: 126.978,
      chart: {
        planets: {
          Sun: 330.2,
          Moon: 15.2,
          Mercury: 310.8,
          Venus: 289.1,
          Mars: 142.3,
          Jupiter: 104.6,
          Saturn: 276.4,
          Rahu: 61.9,
          Ketu: 241.9,
        },
        retrograde: {
          Saturn: true,
        },
        ayanamsa: 24.1,
        ascendantSidereal: 45.2,
        source: 'unit-test',
      },
      ...overrides,
    };
  }

  test('12챕터 로컬 생성과 PDF가 완성되어야 한다', async () => {
    const generated = await vedic.generateVedicPremiumReport({}, makeInput(), {
      llmChapterGenerator: async ({ chapterSpec }) => ({
        title: chapterSpec.title,
        sections: chapterSpec.sections.map((section, sectionIndex) => ({
          title: section.title,
          body: buildBody(chapterSpec, section.title, vedicTokensForChapter(chapterSpec.chapterNo).concat([`섹션 ${sectionIndex + 1}`])),
        })),
      }),
    });

    expect(generated.chapterCount).toBe(12);
    expect(generated.chapters).toHaveLength(12);
    expect(generated.fallbackUsed).toBe(false);
    expect(generated.manuscriptSource).toBe('local');
    expect(generated.localVedicChartJson && generated.localVedicChartJson.calculationMode).toBe('full');
    expect(generated.localVedicChartJson && generated.localVedicChartJson.settings && generated.localVedicChartJson.settings.ayanamsa).toBeTruthy();
    expect(generated.localVedicChartJson && generated.localVedicChartJson.chart && generated.localVedicChartJson.chart.lagnaSign).toBeTruthy();
    expect(generated.localVedicChartJson && generated.localVedicChartJson.chart && generated.localVedicChartJson.chart.moonSign).toBeTruthy();
    expect(generated.localVedicChartJson && generated.localVedicChartJson.chart && generated.localVedicChartJson.chart.nakshatra && generated.localVedicChartJson.chart.nakshatra.name).toBeTruthy();
    expect(Array.isArray(generated.localVedicChartJson && generated.localVedicChartJson.chart && generated.localVedicChartJson.chart.planets)).toBe(true);
    expect((generated.localVedicChartJson && generated.localVedicChartJson.chart && generated.localVedicChartJson.chart.planets || []).length).toBeGreaterThanOrEqual(9);
    expect(Array.isArray(generated.localVedicChartJson && generated.localVedicChartJson.chart && generated.localVedicChartJson.chart.houses)).toBe(true);
    expect((generated.localVedicChartJson && generated.localVedicChartJson.chart && generated.localVedicChartJson.chart.houses || []).length).toBe(12);
    expect(generated.localVedicChartJson && generated.localVedicChartJson.chart && generated.localVedicChartJson.chart.dashas && generated.localVedicChartJson.chart.dashas.currentMahaDasha).toBeTruthy();
    expect(generated.pdfReady && generated.pdfReady.html).toBeTruthy();
  });

  test('LLM 생성기 실패와 무관하게 로컬 생성은 완료되어야 한다', async () => {
    const generated = await vedic.generateVedicPremiumReport({}, makeInput(), {
      llmChapterGenerator: async () => {
        throw new Error('chapter failure');
      },
    });

    expect(generated.manuscriptSource).toBe('local');
    expect(generated.chapters).toHaveLength(12);
    expect(generated.pdfReady && generated.pdfReady.html).toBeTruthy();
  });

  test('seed가 일부 누락되면 strict premium 생성은 실패해야 한다', async () => {
    await expect(vedic.generateVedicPremiumReport({}, makeInput({
      chart: {},
      localVedicChartJson: {
        birthInput: {
          birthDate: '1991-02-20',
          birthTime: '07:00',
          birthHour: 7,
          birthMinute: 0,
          timezone: 'Asia/Seoul',
        },
        chart: { planets: [], houses: [], aspects: [] },
        dashas: { periods: [] },
        interpretationSeeds: {},
        chartMeta: {},
      },
    }))).rejects.toMatchObject({
      code: 'VEDIC_CHART_SOURCE_INVALID',
    });
  });

  test('buildVedicLocalChartJson strictPremium은 fallback을 허용하지 않는다', () => {
    expect(() => vedic.buildVedicLocalChartJson({
      birthDate: '1991-02-20',
      birthTime: '07:00',
      birthHour: 7,
      birthMinute: 0,
      timezone: 'Asia/Seoul',
      birthPlace: '서울',
      latitude: 37.5665,
      longitude: 126.978,
      chart: {},
    }, { strictPremium: true })).toThrow();
  });

  test('birthInput 정규화가 표준 스키마를 충족한다', () => {
    const normalized = vedic.normalizeVedicPremiumBirthInput(makeInput());
    expect(normalized.birthYear).toBe(1991);
    expect(normalized.birthMonth).toBe(2);
    expect(normalized.birthDay).toBe(20);
    expect(normalized.birthHour).toBe(7);
    expect(normalized.birthMinute).toBe(0);
    expect(normalized.timezone).toBe('Asia/Seoul');
    expect(normalized.gender).toBe('male');
  });

  test('시간 누락이면 결제 전 검증이 실패한다', () => {
    const validation = vedic.validateVedicPayloadForApi(makeInput({ birthTime: '', chart: { planets: {} } }));
    expect(validation.ok).toBe(false);
    expect(validation.code).toBe('BIRTH_INPUT_INVALID');
    expect(Array.isArray(validation.missing)).toBe(true);
  });
});
