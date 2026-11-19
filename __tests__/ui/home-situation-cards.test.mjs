import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { renderSituationCards } from '../../lib/marketing/yehwa-home.mjs';
import { hc } from '../../lib/marketing/home-card-copy.mjs';
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
  assert.equal(saju.textContent, hc('homeCards.natal.cta'));
  assert.equal(saju.getAttribute('href'), '/ggulggul/?action=cdOneStepFreeSajuEntry&section=sajuCard');
  assert.equal(saju.dataset.action, 'cdOneStepFreeSajuEntry');
  assert.equal(tarot.textContent, hc('homeCards.tarot.cta'));
  assert.equal(tarot.getAttribute('href'), '/ggulggul/?action=cdHomeTarotEntry');
  assert.equal(tarot.dataset.action, 'cdHomeTarotEntry');
  assert.equal(paid.getAttribute('href'), '/heukwol/');
  assert.equal(paid.textContent, hc('homeCards.heukwol.cta') + heukwol.price);
  assert.equal(paid.querySelector('[data-cd-play-price]').dataset.cdPlayFeature, heukwol.featureKey);
  assert.deepEqual(cards.map(card => card.querySelector('.yh-badge--free, .yh-badge--paid').textContent), ['무료', '무료', '유료']);
  assert.ok(cards[0].querySelector('.yh-badge--pick'), 'first free card is the featured entry');
  assert.equal(doc.querySelectorAll('.yh-block__title').length, 2);
  assert.equal(doc.querySelectorAll('.yh-situation__art[width][height]').length, 3);
  assert.throws(() => renderSituationCards([]), /heukwol/);
});

test('흑월의 미리보기는 결제 전 공개 목차이며 단일 진입과 원래 가격을 유지한다', () => {
  const doc = new JSDOM(renderSituationCards(catalog)).window.document;
  const paid = doc.querySelector('.yh-situation--paid');
  const preview = paid.querySelector('.yh-chapter-preview');
  assert.equal(preview.localName, 'details');
  assert.equal(preview.open, false);
  assert.match(preview.querySelector('summary').textContent, /챕터 자세히 보기/);
  assert.deepEqual([...preview.querySelectorAll('.yh-chapter-preview__titles')].map(list => list.children.length), [6, 13, 6, 2]);
  const reportSource = read('worker/lib/heukwol-report.js');
  const titles = [...reportSource.matchAll(/\{key:'([a-z-]+)',(?:phase:'natal',)?title:'([^']+)'/g)].map(match => match[2]);
  titles.splice(7, 0, ...Array.from({length:12}, (_, i) => `${i + 1}월 · 흐름과 선택`));
  assert.deepEqual([...preview.querySelectorAll('.yh-chapter-preview__titles li')].map(li => li.textContent), titles);
  assert.equal(preview.querySelector('summary').attributes.length, 1);
  assert.equal(preview.querySelector('.yh-chapter-preview__intro').textContent, '타고난 성향과 반복되는 선택부터 살펴봐요. 연애·재물·인간관계·안전·건강의 점검과 선택한 해의 열두 달 대응을 27장에 담아요.');
  assert.equal(preview.querySelector('.yh-chapter-preview__part--months .yh-chapter-preview__titles').children.length, 13);
  assert.doesNotMatch(preview.textContent, /단정 금지|사고 발생|결과 생성/);
  assert.deepEqual([...preview.querySelectorAll('ol li strong')].map(x => x.textContent), ['타고난 성향', '월별 흐름', '주제별 대응', '다음 선택']);
  assert.equal(preview.querySelectorAll('a, button, [onclick]').length, 0);
  assert.equal(doc.querySelectorAll('.yh-chapter-preview').length, 1);
  assert.equal(paid.querySelector('a.yh-chapter-cta').getAttribute('href'), heukwol.href);
  assert.equal(paid.querySelector('[data-cd-play-price]').textContent, heukwol.price);
  const source = read('worker/lib/heukwol-report.js');
  const sourceKeys = ["key:'temperament'", "key:`month-", "key:'money'", "key:'alternatives'"];
  const chapterPositions = sourceKeys.map(key => source.indexOf(key));
  assert.ok(chapterPositions.every((pos, index) => pos >= 0 && (!index || pos > chapterPositions[index - 1])));
  assert.match(read('styles/yehwa-home.css'), /\.yh-chapter-cta::before\{content:none\}/);
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
