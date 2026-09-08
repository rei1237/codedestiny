const {
  analyzeRelationshipTemptation,
  clampScore,
} = require('../../js/core/saju/relationshipTemptationAnalysis.js');

const EMPTY_EXACT = {
  비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 0,
  정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
};

function source(kind, position) {
  return { kind, position };
}

function fixture(overrides = {}) {
  const tenGodsOverride = overrides.tenGods || {};
  return {
    gender: 'M',
    dayBranch: '丑',
    relations: [],
    sinsals: [],
    johu: { moistType: 'balanced', moistCnt: 2, dryCnt: 2 },
    ...overrides,
    tenGods: {
      exact: { ...EMPTY_EXACT, ...(tenGodsOverride.exact || {}) },
      sources: tenGodsOverride.sources || {},
    },
  };
}

describe('사주 관계 자극 성향 점수', () => {
  test('도화·형충이 없고 정재·정관이 안정되면 낮은 점수다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      tenGods: {
        exact: { 정재: 2, 정관: 2 },
        sources: { 정재: [source('stem', 'year'), source('branch', 'month')], 정관: [source('stem', 'month'), source('branch', 'hour')] },
      },
    }));
    expect(result.score).toBeLessThanOrEqual(20);
    expect(result.stabilityFactors.map((factor) => factor.id)).toEqual(expect.arrayContaining(['stable-direct-wealth', 'stable-direct-officer', 'stable-day-branch']));
  });

  test('자묘형·강한 도화·일지 충·강한 식상이 겹치면 높은 점수다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      dayBranch: '子',
      relations: [
        { type: '형', branches: ['子', '卯'], positions: ['일지', '월지'] },
        { type: '충', branches: ['子', '午'], positions: ['일지', '시지'] },
      ],
      sinsals: [{ id: 'dohwa', positions: ['년지', '월지', '일지'] }],
      tenGods: { exact: { 식신: 2, 상관: 2 } },
    }));
    expect(result.score).toBeGreaterThanOrEqual(81);
    expect(result.level).toBe('관계의 변화와 유혹에 특히 민감한 타입');
    expect(result.positiveFactors.map((factor) => factor.id)).toContain('day-clash-punishment');
  });

  test('도화가 강해도 정재·정관이 안정되면 중간 이하로 보정된다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      sinsals: [{ id: 'dohwa', positions: ['년지', '일지'] }],
      tenGods: {
        exact: { 정재: 2, 정관: 2 },
        sources: { 정재: [source('stem', 'year'), source('branch', 'month')], 정관: [source('stem', 'month'), source('branch', 'hour')] },
      },
    }));
    expect(result.score).toBeLessThanOrEqual(40);
    expect(result.oneLineReview).toContain('선을 지키려는 힘');
  });

  test('재성 혼잡 하나만으로 최고 단계가 되지 않는다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      dayBranch: '辰',
      relations: [{ type: '충', branches: ['丑', '未'], positions: ['년지', '월지'] }],
      tenGods: {
        exact: { 정재: 2, 편재: 2 },
        sources: { 정재: [source('stem', 'year'), source('branch', 'month')], 편재: [source('stem', 'hour'), source('branch', 'year')] },
      },
    }));
    expect(result.score).toBe(40);
    expect(result.score).toBeLessThan(81);
  });

  test('습한 조후 하나만으로 높은 점수가 되지 않는다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      dayBranch: '辰',
      relations: [{ type: '충', branches: ['丑', '未'], positions: ['년지', '월지'] }],
      johu: { moistType: 'wet', moistCnt: 6, dryCnt: 1 },
    }));
    expect(result.score).toBe(25);
    expect(result.positiveFactors.find((factor) => factor.id === 'wet-johu').score).toBe(5);
  });

  test('식신 하나가 안정적으로 있으면 점수를 낮춘다', () => {
    const result = analyzeRelationshipTemptation(fixture({ tenGods: { exact: { 식신: 1 } } }));
    expect(result.score).toBe(15);
    expect(result.stabilityFactors.map((factor) => factor.id)).toContain('stable-eating-god');
  });

  test('식상이 매우 많아도 다른 상승 조건이 없으면 최고 가중치를 단독 적용하지 않는다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      tenGods: { exact: { 식신: 2, 상관: 2 } },
    }));
    expect(result.positiveFactors.find((factor) => factor.id === 'strong-output').score).toBe(10);
  });

  test('동일 도화 조건은 가장 높은 단계 한 번만 가산된다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      dayBranch: '辰',
      relations: [{ type: '충', branches: ['丑', '未'], positions: ['년지', '월지'] }],
      sinsals: [{ id: 'dohwa', positions: ['년지', '월지', '일지'] }],
    }));
    const dohwaFactors = result.positiveFactors.filter((factor) => factor.id === 'dohwa');
    expect(dohwaFactors).toHaveLength(1);
    expect(dohwaFactors[0].score).toBe(15);
  });

  test('같은 재성 혼잡도 남성보다 여성 명식에서 낮게 보정한다', () => {
    const shared = {
      dayBranch: '辰',
      relations: [{ type: '충', branches: ['丑', '未'], positions: ['년지', '월지'] }],
      tenGods: {
        exact: { 정재: 2, 편재: 2 },
        sources: { 정재: [source('stem', 'year'), source('branch', 'month')], 편재: [source('stem', 'hour'), source('branch', 'year')] },
      },
    };
    const male = analyzeRelationshipTemptation(fixture({ ...shared, gender: 'M' }));
    const female = analyzeRelationshipTemptation(fixture({ ...shared, gender: 'F' }));
    expect(male.score).toBeGreaterThan(female.score);
    expect(female.positiveFactors.find((factor) => factor.id === 'wealth-mix').detail).toContain('이성 자체로 단정하지 않고');
  });

  test('최종 점수는 0과 100 사이로 clamp된다', () => {
    expect(clampScore(-30)).toBe(0);
    expect(clampScore(130)).toBe(100);
    const minimum = analyzeRelationshipTemptation(fixture({
      tenGods: {
        exact: { 정재: 3, 정관: 2, 식신: 1 },
        sources: { 정재: [source('stem', 'year')], 정관: [source('stem', 'month')] },
      },
    }));
    expect(minimum.score).toBe(0);
  });

  test('일지 자묘형은 자묘형과 일반 일지 형으로 중복 가산하지 않는다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      dayBranch: '子',
      relations: [{ type: '형', branches: ['子', '卯'], positions: ['일지', '월지'] }],
    }));
    expect(result.positiveFactors.map((factor) => factor.id)).toContain('ja-myo-punishment');
    expect(result.positiveFactors.map((factor) => factor.id)).not.toContain('day-punishment');
  });

  test('년지·월지의 오묘파는 초년 가중치로만 반영하고 결혼 뒤 완화 가능성을 설명한다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      dayBranch: '辰',
      relations: [{ type: '파', branches: ['午', '卯'], positions: ['년지', '월지'] }],
    }));
    const factor = result.positiveFactors.find((item) => item.id === 'dohwa-branch-relation');
    expect(factor.score).toBe(5);
    expect(factor.detail).toContain('초년');
    expect(factor.detail).toContain('결혼 이후 일지가 안정적이라면');
  });

  test('일지와 같은 글자가 반복돼도 년지·월지 관계를 일지 작용으로 오인하지 않는다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      dayBranch: '午',
      relations: [{ type: '파', branches: ['午', '卯'], positions: ['년지', '월지'] }],
    }));
    const factor = result.positiveFactors.find((item) => item.id === 'dohwa-branch-relation');
    expect(factor.score).toBe(5);
    expect(factor.basis).toContain('년지·월지');
  });

  test('일지의 도화 형살은 결혼 이후와 중년까지 높은 가중치로 설명한다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      dayBranch: '酉',
      relations: [{ type: '형', branches: ['酉'], positions: ['일지', '시지'] }],
    }));
    const factor = result.positiveFactors.find((item) => item.id === 'dohwa-branch-relation');
    expect(factor.score).toBe(15);
    expect(factor.detail).toContain('결혼 이후');
    expect(factor.detail).toContain('중년까지');
    expect(result.positiveFactors.map((item) => item.id)).not.toContain('day-punishment');
  });

  test('도화 지지가 아닌 일지 형살도 결혼 이후와 중년까지 주의로 설명한다', () => {
    const result = analyzeRelationshipTemptation(fixture({
      dayBranch: '寅',
      relations: [{ type: '형', branches: ['寅', '巳', '申'], positions: ['원국'] }],
    }));
    const factor = result.positiveFactors.find((item) => item.id === 'day-punishment');
    expect(factor.detail).toContain('결혼 이후');
    expect(factor.detail).toContain('중년까지');
  });
});
