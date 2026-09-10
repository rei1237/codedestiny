const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { renderRelationshipTemptation } = require('../../js/core/saju/relationshipTemptationAnalysis.js');

describe('사주 관계 자극 성향 카드 렌더링', () => {
  let dom;

  beforeEach(() => {
    dom = new JSDOM('<!doctype html><html><head></head><body><main id="resultPage"><section id="reportDashboardCard"></section></main></body></html>');
    global.document = dom.window.document;
  });

  afterEach(() => {
    dom.window.close();
    delete global.document;
  });

  test('모바일 이미지와 양면 근거, 접근 가능한 게이지를 렌더링한다', () => {
    const result = renderRelationshipTemptation({
      gender: 'F',
      dayBranch: '酉',
      relations: [{ type: '형', branches: ['酉'], positions: ['일지', '시지'] }],
      sinsals: [{ id: 'dohwa', positions: ['일지'] }],
      johu: { moistType: 'balanced', moistCnt: 2, dryCnt: 2 },
      tenGods: { exact: { 정재: 0, 편재: 0, 정관: 1, 편관: 0, 식신: 0, 상관: 0 }, sources: { 정관: [{ kind: 'stem', position: 'month' }] } },
    });

    const card = document.getElementById('relationshipTemptationCard');
    const image = card.querySelector('img');
    const gauge = card.querySelector('[role="progressbar"]');
    expect(card.nextElementSibling.id).toBe('reportDashboardCard');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('decoding')).toBe('async');
    expect(image.getAttribute('srcset')).toContain('480.webp 480w');
    expect(image.getAttribute('sizes')).toContain('max-width:620px');
    expect(image.width).toBe(1024);
    expect(image.height).toBe(768);
    expect(gauge.getAttribute('aria-valuenow')).toBe(String(result.score));
    expect(card.textContent).toContain('마음이 흔들릴 수 있는 부분');
    expect(card.textContent).toContain('한 사람에게 머물게 하는 힘');
    expect(card.textContent).toContain('실제 외도 여부를 결정하지 않습니다');
  });

  test('엔진과 대시보드가 새 결정론 모듈을 지연 로드하고 호출한다', () => {
    const root = path.resolve(__dirname, '../..');
    const runtime = fs.readFileSync(path.join(root, 'js/core/index-inline-runtime.js'), 'utf8');
    const engine = fs.readFileSync(path.join(root, 'js/saju-engine.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/core/saju/reportDashboard.js'), 'utf8');
    expect(runtime).toContain('/js/core/saju/relationshipTemptationAnalysis.js');
    expect(engine).toContain("invokeOptionalGlobalRenderer('renderRelationshipTemptation'");
    expect(engine).toContain('window._sajuVillainBuildTenGodDistribution');
    expect(dashboard).toContain("action:'openRelationshipBoundaryTestRoute'");
    expect(dashboard).toContain("window.openRelationshipBoundaryTestRoute");
    expect(dashboard).toContain("case 'relationshipTemptationCard':");
    expect(dashboard).not.toContain("target:'relationshipTemptationCard'");
  });
});
