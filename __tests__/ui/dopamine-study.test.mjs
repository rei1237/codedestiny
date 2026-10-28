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
