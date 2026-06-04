import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('js/entertain-engine.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createNode() {
  return {
    innerHTML: '',
    style: {},
    dataset: {},
    appendChild() {},
    querySelectorAll() {
      return [];
    },
  };
}

function createRuntime({ dayGan = '甲', noDay = false, customSource = source } = {}) {
  const nodes = {
    healthReportSection: createNode(),
    healthReportCard: createNode(),
    skillTreeSection: createNode(),
    hiddenNatureSection: createNode(),
  };

  const document = {
    getElementById(id) {
      return nodes[id] || null;
    },
    querySelectorAll() {
      return [];
    },
  };

  const window = {
    USER_NAME: 'QA',
    GAN: {
      '甲': { e: 'wood' },
      '丙': { e: 'fire' },
      '戊': { e: 'earth' },
      '庚': { e: 'metal' },
      '壬': { e: 'water' },
    },
    SHENG: {
      wood: 'fire',
      fire: 'earth',
      earth: 'metal',
      metal: 'water',
      water: 'wood',
    },
    syncReportHeightFromNode() {},
  };
  if (!noDay) {
    window.G_BAZI = {
      getDayGan() {
        return dayGan;
      },
    };
  }

  const sandbox = {
    window,
    document,
    console,
    setTimeout() {},
    requestAnimationFrame(callback) {
      callback();
    },
  };
  vm.runInNewContext(customSource, sandbox, { filename: 'js/entertain-engine.js' });
  return { window, nodes };
}

function renderCase(options) {
  const runtime = createRuntime(options);
  runtime.window.renderHealthReport(
    {},
    { ratios: options.ratios },
    options.johu || {},
    options.pw || {},
    options.jg || {}
  );
  return runtime.nodes.healthReportSection.innerHTML;
}

function assertCommonHealthReport(html, label) {
  assert(html.includes('명리 헬스 리포트'), `${label}: title missing`);
  assert(html.includes('달빛 웰니스 클리닉'), `${label}: moon wellness UI missing`);
  assert(html.includes('rounded-2xl'), `${label}: card radius class missing`);
  assert(html.includes('backdrop-blur'), `${label}: glassmorphism class missing`);
  assert(html.includes('text-sm') && html.includes('leading-6'), `${label}: mobile text rhythm classes missing`);
  assert(!html.includes('undefined'), `${label}: rendered undefined`);
  assert(!html.includes('NaN'), `${label}: rendered NaN`);
  assert(!/(진단합니다|질환입니다|치료 처방|약물|AST\/ALT|간수치)/.test(html), `${label}: medical wording leaked`);
}

const cases = [
  {
    label: '목 과다 + 토 결핍',
    dayGan: '甲',
    ratios: { wood: 46, fire: 18, earth: 8, metal: 14, water: 14 },
    pw: { yongshin: ['earth'], kijishin: ['wood'] },
  },
  {
    label: '화 과다 + 금 결핍',
    dayGan: '丙',
    ratios: { wood: 15, fire: 44, earth: 18, metal: 8, water: 15 },
    pw: { yongshin: ['metal'], kijishin: ['fire'] },
  },
  {
    label: '수 과다 + 화 결핍',
    dayGan: '壬',
    ratios: { wood: 14, fire: 8, earth: 18, metal: 15, water: 45 },
    pw: { yongshin: ['fire'], kijishin: ['water'] },
  },
  {
    label: '균형 오행',
    dayGan: '戊',
    ratios: { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 },
    pw: { yongshin: ['earth'], kijishin: ['water'] },
  },
  {
    label: '합충 데이터 없음',
    dayGan: '庚',
    ratios: { wood: 22, fire: 19, earth: 21, metal: 20, water: 18 },
    pw: null,
    jg: null,
  },
  {
    label: '오행 비율 없음',
    dayGan: '甲',
    ratios: undefined,
    pw: {},
    jg: {},
  },
];

for (const testCase of cases) {
  const html = renderCase(testCase);
  assertCommonHealthReport(html, testCase.label);
  assert(html.includes('오늘의 오행 밸런스'), `${testCase.label}: daily balance missing`);
  assert(html.includes('오늘의 추천 5선'), `${testCase.label}: food section missing`);
  assert(html.includes('보완 오행:'), `${testCase.label}: food element label missing`);
  assert(html.includes('추천 이유:'), `${testCase.label}: food reason label missing`);
  assert(html.includes('오늘 먹는 팁:'), `${testCase.label}: food tip label missing`);
  assert(html.includes('오늘의 헬스 미션'), `${testCase.label}: mission section missing`);
  assert((html.match(/목\(木\)이 과열되면/g) || []).length <= 1, `${testCase.label}: wood excess copy repeated`);
  assert((html.match(/토\(土\)가 부족하면/g) || []).length <= 1, `${testCase.label}: earth deficient copy repeated`);
  assert((html.match(/금\(金\)이 부족하면/g) || []).length <= 1, `${testCase.label}: metal deficient copy repeated`);
}

{
  const html = renderCase({
    label: '일진 데이터 없음',
    noDay: true,
    ratios: { wood: 35, fire: 20, earth: 12, metal: 16, water: 17 },
    pw: { yongshin: ['earth'], kijishin: ['wood'] },
  });
  assertCommonHealthReport(html, '일진 데이터 없음');
  assert(html.includes('선천 체질 기준 안내'), '일진 데이터 없음: innate fallback notice missing');
  assert(html.includes('선천 체질 베이스'), '일진 데이터 없음: innate section missing');
  assert(!html.includes('오늘의 오행 밸런스'), '일진 데이터 없음: daily section should be hidden');
  assert(!html.includes('오늘의 추천 5선'), '일진 데이터 없음: food section should be hidden');
}

{
  const emptyFoodSource = source.replace(
    /var HEALTH_FOOD_PLAN = \{[\s\S]*?\n  \};\n  var HEALTH_MOVEMENT_PLAN =/,
    "var HEALTH_FOOD_PLAN = { wood: [], fire: [], earth: [], metal: [], water: [] };\n  var HEALTH_MOVEMENT_PLAN ="
  );
  const html = renderCase({
    label: '식단 빈 배열',
    dayGan: '戊',
    ratios: { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 },
    pw: { yongshin: ['earth'], kijishin: ['water'] },
    customSource: emptyFoodSource,
  });
  assertCommonHealthReport(html, '식단 빈 배열');
  assert(html.includes('현미밥과 된장국'), '식단 빈 배열: default wellness food missing');
  assert(html.includes('보완 오행:'), '식단 빈 배열: default food element label missing');
}

{
  const { window } = createRuntime();
  assert(typeof window.renderSkillTree === 'function', 'renderSkillTree override missing');
  assert(typeof window.renderHormoneVibe === 'function', 'renderHormoneVibe override missing');
}

console.log('[health-report-regression] OK');
