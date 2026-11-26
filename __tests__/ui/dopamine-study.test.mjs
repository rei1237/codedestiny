import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const source = readFileSync('js/core/saju/dopamineResult.js', 'utf8');
const engine = readFileSync('js/saju-engine.js', 'utf8');
function fixture() {
  const dom = new JSDOM('<section id="dopamineCard"><div id="dopamineResult"></div></section>', { runScripts: 'outside-only' });
  const w = dom.window;
  // 엔진의 실제 정본 매핑을 읽으며 실 네트워크·LLM을 사용하지 않는다.
  w.eval(engine.slice(engine.indexOf('var GAN={'), engine.indexOf('var ANIMAL_EMOJI=')));
  w.getTenGod = () => '정인';
  w.matchMedia = () => ({ matches: true });
  w.eval(source);
  return { dom, w, p: { y: { g: '甲', j: '子' }, m: { g: '丙', j: '午' }, d: { g: '庚', j: '申' }, h: { g: '壬', j: '子' } } };
}
const keys = ['wood', 'fire', 'earth', 'metal', 'water'];
test('오행 우세별 공부법이 다르고 결손을 능력 부족으로 단정하지 않는다', () => {
  const { dom, w, p } = fixture();
  const methods = new Set();
  for (const key of keys) {
    const ratios = Object.fromEntries(keys.map(k => [k, k === key ? 100 : 0]));
    const r = w.buildDopamineResult({ p, natal: { ratios } });
    methods.add(r.study.method);
    assert.ok(r.study.elements.filter(e => e.value === 0).every(e => e.note.includes('없다는 뜻은 아닙니다')));
    assert.match(r.study.evidence[0].text, /경금/);
    assert.equal(r.radar.length, 8);
    assert.ok(r.score >= 0 && r.score <= 100);
  }
  assert.equal(methods.size, 5);
  dom.window.close();
});
test('동률, 균형, 누락, 잘못된 분포와 시주 누락을 구분한다', () => {
  const { dom, w, p } = fixture();
  const build = ratios => w.buildDopamineResult({ p, natal: { ratios } }).study;
  const tie = build({ wood: 40, fire: 40, earth: 10, metal: 5, water: 5 });
  assert.match(tie.summary, /목\(木\)·화\(火\)/);
  assert.match(tie.method, /개념 지도/); assert.match(tie.method, /설명하듯/);
  assert.match(build(Object.fromEntries(keys.map(k => [k, 20]))).summary, /고르게/);
  for (const ratios of [undefined, {}, { wood: NaN }, Object.fromEntries(keys.map(k => [k, 0]))]) {
    assert.equal(build(ratios).valid, false);
    assert.ok(build(ratios).rows.every(r => r.value === null));
  }
  delete p.h;
  assert.ok(build({}).evidence.some(e => e.title === '출생 시간 미입력'));
  dom.window.close();
});
test('일간·월지에 따라 근거가 달라지고 결과는 HTML을 이스케이프한다', () => {
  const { dom, w, p } = fixture();
  const a = w.buildDopamineResult({ p }).study.evidence;
  p.d.g = '甲'; p.m.j = '子';
  const b = w.buildDopamineResult({ p }).study.evidence;
  assert.notEqual(a[0].text, b[0].text); assert.notEqual(a[1].text, b[1].text);
  w.GAN.甲.n = '<img src=x onerror=alert(1)>';
  w.renderDopamineReport(p, { ratios: { wood: 50, fire: 20, earth: 10, metal: 10, water: 10 } });
  w.document.querySelector('[data-dp-start]').click();
  assert.equal(w.document.querySelectorAll('#dopamineResult img').length, 0);
  assert.equal(w.document.activeElement.id, 'dp-study-title');
  assert.equal(w.document.querySelectorAll('.dp-element-readings details').length, 5);
  assert.ok(w.document.querySelector('[data-dp-save]'));
  assert.match(w.document.querySelector('[data-dp-capture]').textContent, /의학적 진단이 아닙니다/);
  dom.window.close();
});
// S4(2026-11-26): 도화(년살)·역마·홍염은 정본 신살 모듈(SajuNatalCore.computeShinsal)에서 읽는다.
// 옛 규칙(子午卯酉·寅申巳亥가 있기만 하면 도화·역마)은 점수에 들어가지 않는다. 정본이 없거나 던져도 결과는 뜬다.
const natalCore = readFileSync('js/core/saju/natal-core.generated.js', 'utf8');
function withCore(core) {
  const f = fixture();
  if (core === 'real') f.w.eval(natalCore + '\nwindow.SajuNatalCore = SajuNatalCore;');
  else if (core) f.w.SajuNatalCore = core;
  return f;
}
const chart = (y, m, d, h) => ({ y: { g: y[0], j: y[1] }, m: { g: m[0], j: m[1] }, d: { g: d[0], j: d[1] }, h: { g: h[0], j: h[1] } });
const flat = (ratios) => ({ ratios: ratios || Object.fromEntries(keys.map(k => [k, 20])) });
const love = r => r.radar.find(a => a.label === '연애').value;
test('도화·역마·홍염은 정본 신살 모듈에서 읽고, 子午卯酉·寅申巳亥가 있다는 것만으로는 오르지 않는다', () => {
  const real = withCore('real'), none = withCore(null);
  const run = (f, p) => f.w.buildDopamineResult({ p, natal: flat() });
  // 子·午·申이 있지만 년지·일지 기준 년살(酉)·역마(寅)와 홍염(庚→戌)이 없다 → 정본이 없을 때와 같다
  const plain = chart('甲子', '丙午', '庚申', '壬子');
  assert.equal(run(real, plain).score, run(none, plain).score);
  // 창(JSDOM)이 달라 배열 프로토타입이 다르므로 값으로 비교한다
  assert.equal(JSON.stringify(run(real, plain).radar), JSON.stringify(run(none, plain).radar));
  // 월지 酉 = 년살(도화), 시지 戌 = 홍염 → 점수와 연애 축이 오른다
  const peach = chart('甲子', '丁酉', '庚申', '丙戌');
  assert.ok(run(real, peach).score > run(none, peach).score);
  assert.ok(love(run(real, peach)) > love(run(none, peach)));
  // 월지 寅 = 역마 → 점수가 오른다
  const travel = chart('甲子', '丙寅', '庚申', '壬子');
  assert.ok(run(real, travel).score > run(none, travel).score);
  real.dom.window.close(); none.dom.window.close();
});
test('정본 신살 모듈이 없거나 던지거나 무효를 돌려도 도파민 결과는 그대로 뜬다', () => {
  const p = chart('甲子', '丁酉', '庚申', '丙戌');
  const base = withCore(null);
  const expected = base.w.buildDopamineResult({ p, natal: flat() });
  for (const core of [{ computeShinsal() { throw new Error('boom'); } }, { computeShinsal: () => ({ valid: false, hits: [{ ruleId: 'nyeonsal', pillar: 'month' }] }) }, { computeShinsal: () => null }]) {
    const f = withCore(core);
    const r = f.w.buildDopamineResult({ p, natal: flat() });
    assert.equal(r.score, expected.score); assert.equal(r.grade, expected.grade);
    f.dom.window.close();
  }
  const noHour = withCore('real'); delete p.h;
  const r = noHour.w.buildDopamineResult({ p, natal: flat() });
  assert.ok(r.score >= 0 && r.score <= 100 && r.radar.length === 8, '시주 없이도 계산된다');
  noHour.dom.window.close(); base.dom.window.close();
});
