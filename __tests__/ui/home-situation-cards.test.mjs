import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { renderSituationCards } from '../../lib/marketing/yehwa-home.mjs';
import { FREE_PROMO_FEATURED } from '../../lib/marketing/free-promo.mjs';

// 2026-11-16 상황형 첫 화면: /ggulggul/ 히어로 아래 카드 3장, 무료 카드 6장은 결과별 버튼명.
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const win = {};
vm.runInNewContext(read('js/core/service-registry.js'), { window: win });
const catalog = win.__cdServiceRegistry;
const heukwol = catalog.find(item => item.id === 'heukwol');

test('situation cards: one question, one result and one button each, destinations from existing entries', () => {
  const doc = new JSDOM(renderSituationCards(catalog)).window.document;
  const section = doc.querySelector('.yh-situations');
  assert.equal(section.dataset.cdFunnelSection, 'situation_pick');
  assert.ok(section.hasAttribute('data-cd-korean-only') && section.hasAttribute('data-cd-no-trans'));
  const cards = [...doc.querySelectorAll('.yh-situation')];
  assert.equal(cards.length, 3);
  for (const card of cards) {
    assert.equal(card.querySelectorAll('.yh-situation__q').length, 1);
    assert.equal(card.querySelectorAll('.yh-situation__result').length, 1);
    assert.equal(card.querySelectorAll('a').length, 1);
  }
  const [saju, tarot, paid] = cards.map(card => card.querySelector('a'));
  assert.equal(saju.textContent, '무료 만세력 보기');
  assert.equal(saju.getAttribute('href'), '/ggulggul/?action=cdOneStepFreeSajuEntry&section=sajuCard');
  assert.equal(saju.dataset.action, 'cdOneStepFreeSajuEntry');
  assert.equal(tarot.textContent, '카드 세 장 뽑기');
  assert.equal(tarot.getAttribute('href'), '/ggulggul/?action=cdHomeTarotEntry');
  assert.equal(tarot.dataset.action, 'cdHomeTarotEntry');
  assert.equal(paid.getAttribute('href'), '/heukwol/');
  assert.equal(paid.textContent, '주의할 시기 보기·' + heukwol.price);
  assert.equal(paid.querySelector('[data-cd-play-price]').dataset.cdPlayFeature, heukwol.featureKey);
  assert.match(cards[2].querySelector('.yh-situation__result').textContent, /유료$/);
  assert.throws(() => renderSituationCards([]), /heukwol/);
});

test('free tarot entry opens the three-card spread by default', () => {
  assert.match(read('js/core/index-inline-runtime.js'), /window\.setTarotMode\(window\.tarotSpreadMode \|\| 'three'\)/);
});

test('situation cards are baked into the shell below the hero and hidden outside Korean', () => {
  const shell = read('index.html');
  const hero = shell.indexOf('class="yh-hero yh-entry-scene"');
  const cards = shell.indexOf('<section class="yh-situations"');
  const promo = shell.indexOf('<section class="cdh-promo"');
  assert.ok(hero >= 0 && hero < cards && cards < promo, 'regenerate index.html with npm run sync:public');
  assert.match(read('styles/yehwa-home.css'), /html:not\(\[lang="ko"\]\) \.yh-situations\{display:none\}/);
});

test('free promo cards name the result instead of a uniform start label', () => {
  const labels = Object.fromEntries(FREE_PROMO_FEATURED.map(item => [item.id, item.cta]));
  assert.deepEqual(labels, { natal: '내 명식 보기', tarot: '카드 뽑기', ziwei: '내 명반 보기', sukuyo: '본명숙 보기', vedic: '하늘 지도 보기', astro: '출생 차트 보기' });
  const authored = JSON.parse(read('i18n/authored/freePromo-01.json'));
  const shell = read('index.html');
  for (const item of FREE_PROMO_FEATURED) {
    const entry = authored['freePromo.action.' + item.id];
    assert.equal(entry?.ko, item.cta);
    assert.equal(Object.keys(entry).length, 12);
    assert.ok(shell.includes(`data-cd-trans="freePromo.action.${item.id}">${item.cta}<`));
  }
  assert.ok(!shell.includes('data-cd-trans="freePromo.start"'));
  assert.match(read('app/components/FreePromoBanner.tsx'), /pick\(`freePromo\.action\.\$\{item\.id\}`,item\.cta\)/);
});
