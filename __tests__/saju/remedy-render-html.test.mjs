// 액땜 카드 정적 HTML(renderRemedyCardsHtml) 계약: 실패하면 '', 글자·속성 이스케이프, 장 수와 <details> 접힘.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { computeRemedyCases } from '../../lib/saju/remedy/index.mjs';
import { REMEDY_IMAGE_FRAMES } from '../../lib/saju/remedy/frames.mjs';
import { renderRemedyCardsHtml } from '../../lib/saju/remedy/render-html.mjs';

// 합성 입력: __tests__/saju/remedy-cases.test.mjs 와 같은 고정 natalCore·12궁 명반.
const core = (avoid) => ({
  status: 'ok',
  counts: { byEl: { wood: 2, fire: 2, earth: 2, metal: 2, water: 1 } },
  yongsinMethods: { final: { yongsin: 'water', useful: ['water'], avoid }, johu: { status: 'ok', urgent: false } },
});
const BASE = { year: '乙丑', month: '戊寅', day: '乙卯', hour: '丁亥' };
const PALACES = ['명궁', '형제궁', '부처궁', '자녀궁', '재백궁', '질액궁', '천이궁', '노복궁', '관록궁', '전택궁', '복덕궁', '부모궁'];
const ziwei = (patch) => ({
  palaces: PALACES.map((name) => ({ name, mainStars: ['자미'], maleficStars: [], transformations: [], ...(patch[name] || {}) })),
  lunar: { year: 1990 }, majorLuck: [], uncertainty: { birthTimeUnknown: false },
});
const MANY = {
  saju: { pillars: { ...BASE, day: '甲子', year: '甲辰' }, natalCore: core(['fire']), daewoon: { pillar: '丁丑', startYear: 2022, endYear: 2031 } },
  ziwei: ziwei({ 명궁: { maleficStars: ['경양'] }, 질액궁: { transformations: ['화기:태음'] } }),
  refYear: 2026,
};
const plain = (value) => JSON.parse(JSON.stringify(value));
const FIVE = plain(computeRemedyCases(MANY, { limit: 5 }));
const ONE = plain(computeRemedyCases({ saju: { pillars: BASE, natalCore: core(['metal']) }, refYear: 2026 }, { limit: 5 }));
const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document.body;
const cards = (node) => Array.from(node.querySelectorAll('section.saju-remedy-card'));

test('결과가 없거나 틀리거나 ko 가 아니면 빈 문자열', () => {
  const throwing = { get valid() { throw new Error('boom'); } };
  for (const input of [undefined, null, {}, { ...FIVE, valid: false }, { ...FIVE, cases: [] }, { ...FIVE, locale: 'en' }, throwing]) {
    assert.equal(renderRemedyCardsHtml(input, { narrator: 'yeoni' }), '');
  }
});

test('앞 3장은 펼치고 나머지는 JS 없는 <details> 로 접는다', () => {
  assert.equal(FIVE.cases.length, 5);
  const body = parse(renderRemedyCardsHtml(FIVE, { narrator: 'neo' }));
  const root = body.querySelector('.saju-remedy[data-remedy-cards]');
  assert.equal(root.getAttribute('data-narrator'), 'neo');
  assert.equal(cards(root).length, 5);
  const details = root.querySelectorAll('details.saju-remedy-more');
  assert.equal(details.length, 1);
  assert.equal(details[0].hasAttribute('open'), false);
  assert.equal(cards(details[0]).length, 2);
  assert.equal(details[0].querySelector('summary').textContent, '+2 더 보기');
  assert.match(details[0].querySelector('summary').getAttribute('style'), /min-height:44px/);
  for (const card of cards(root)) {
    const methods = card.querySelectorAll('ul.saju-summary-list > li');
    assert.ok(methods.length >= 2 && methods.length <= 3);
    assert.match(card.textContent, /전해 내려오는 풍속/);
    assert.match(card.querySelector('.saju-remedy-disclaimer').textContent, /효과를 보장하지 않아요/);
    const img = card.querySelector('img');
    assert.equal(img.getAttribute('loading'), 'eager');
    assert.equal(img.getAttribute('width'), String(REMEDY_IMAGE_FRAMES.neo.width));
    assert.equal(img.getAttribute('height'), String(REMEDY_IMAGE_FRAMES.neo.height));
    assert.match(img.parentElement.getAttribute('style'), /aspect-ratio:480 \/ 720/);
  }
  const visible1 = parse(renderRemedyCardsHtml(FIVE, { narrator: 'yeoni', visible: 1 }));
  assert.equal(cards(visible1.querySelector('details')).length, 4);
  assert.equal(visible1.querySelector('summary').textContent, '+4 더 보기');
});

test('3장 이하면 접지 않는다', () => {
  assert.equal(ONE.cases.length, 1);
  const body = parse(renderRemedyCardsHtml(ONE, { narrator: 'musung' }));
  assert.equal(cards(body).length, 1);
  assert.equal(body.querySelector('details'), null);
  const html = renderRemedyCardsHtml(plain(computeRemedyCases(MANY, { limit: 3 })), { narrator: 'yeongnyangi' });
  assert.equal(cards(parse(html)).length, 3);
  assert.doesNotMatch(html, /<details/);
  assert.doesNotMatch(html, /color-mix|oklch/);
});

test('저장된 결과에서 온 글자와 속성값을 이스케이프한다', () => {
  const evil = '<img src=x onerror="alert(1)">\'&';
  const tampered = plain(FIVE);
  tampered.cases[0].period.label = evil;
  const html = renderRemedyCardsHtml(tampered, { narrator: 'yeoni' });
  assert.ok(html);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;&#39;&amp;/);
  const body = parse(html);
  assert.equal(body.querySelectorAll('img').length, 5);
  assert.equal(body.querySelector('.saju-remedy-period').textContent, evil);
});
