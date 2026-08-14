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
    options.p || {},
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
  // 카드 계층 계약: 표면을 갖는 것은 챕터 5개뿐이고, 그 안의 소제목은 투명해야 한다.
  // 예전 단언(rounded-2xl / backdrop-blur / text-sm)은 다크 네온 테마 시절의 Tailwind 잔재를
  // 강제했는데, 그 클래스들은 인라인 CSS 가 전부 덮어써서 화면에 아무 영향이 없는 구현 세부였다.
  // 그래서 "겹쳐 보이는 카드"를 하나도 막지 못했다. 실제 계약으로 바꾼다.
  assert((html.match(/class="cd-health-chapter"/g) || []).length === 5, `${label}: expected exactly 5 chapters`);
  assert((html.match(/class="cd-health-dial__row"/g) || []).length === 5, `${label}: element-organ dial must list all 5 elements`);
  assert(!/class="cd-health-section [^"]/.test(html), `${label}: subsection must stay surfaceless (no extra classes)`);
  // 다크 네온 테마 잔재가 되돌아오면 CSS 가 다시 !important 로 덮기 시작한다.
  assert(!/bg-slate-950|text-indigo-|backdrop-blur/.test(html), `${label}: dark-neon theme remnants returned`);
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
  assert(html.includes('명리학자 소견'), `${testCase.label}: master reading missing`);
  assert(html.includes('오행 균형 체크'), `${testCase.label}: element board missing`);
  assert(html.includes('시기별 건강운'), `${testCase.label}: period health fortune missing`);
  assert(html.includes('오늘의 오행 조율'), `${testCase.label}: daily balance missing`);
  assert(html.includes('오행 개운법'), `${testCase.label}: remedy section missing`);
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
  assert(html.includes('오행 균형 체크'), '일진 데이터 없음: element board missing');
  assert(html.includes('시기별 건강운'), '일진 데이터 없음: period health fortune missing');
  assert(html.includes('오행 개운법'), '일진 데이터 없음: remedy section missing');
  assert(!html.includes('오늘의 오행 조율'), '일진 데이터 없음: daily section should be hidden');
  assert(!html.includes('오늘의 추천 5선'), '일진 데이터 없음: food section should be hidden');
}

// 프로필 카드로 결과를 여는 경로에는 window.G_BAZI 가 없다. 그때도 넘겨받은 원국의 일간으로
// 데스크탑과 같은 전체 리포트가 나와야 한다 — 예전에는 전역만 보느라 축소본으로 떨어졌다.
{
  const html = renderCase({
    label: '전역 없이 원국만',
    noDay: true,
    p: { d: { g: '甲', j: '子' } },
    ratios: { wood: 35, fire: 20, earth: 12, metal: 16, water: 17 },
    pw: { yongshin: ['earth'], kijishin: ['wood'] },
  });
  assertCommonHealthReport(html, '전역 없이 원국만');
  assert(html.includes('오늘의 오행 조율'), '전역 없이 원국만: daily section missing');
  assert(html.includes('오늘의 헬스 미션'), '전역 없이 원국만: mission section missing');
  assert(html.includes('오늘의 회복 루틴'), '전역 없이 원국만: routine section missing');
  assert(html.includes('오늘의 추천 5선'), '전역 없이 원국만: food section missing');
  assert(html.includes('장부/생활 신호'), '전역 없이 원국만: organ signal section missing');
  assert(!html.includes('선천 체질 기준 안내'), '전역 없이 원국만: degraded fallback copy leaked');
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
