// 홈 이용권 화면이 라이트 운세의 가치를 정확히 보여 주는지 확인한다(스펙 7.1, 7.2).
// 금액은 손으로 쓴 값이 아니라 판매 목록에서 계산한 값과 대조한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { LIGHT_FORTUNE_FEATURE_KEYS } from '../../worker/lib/light-fortune-catalog.js';
import { listProducts, resolveProduct } from '../../worker/payments/catalog.js';
import { CURRENT_PASS_PLANS } from '../../lib/payment/pass-policy.js';
import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
import { buildLightFortunes } from '../../scripts/lib/build-light-fortunes.mjs';
import { passBenefitOffers, renderPassBenefits } from '../../lib/marketing/pass-benefits.mjs';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const generated = () => JSON.parse(read('lib/payment/light-fortunes.generated.json'));
const won = (value) => value.toLocaleString('ko-KR') + '원';

const body = (html) => new JSDOM(html).window.document;
const text = (node) => node.textContent.replace(/\s+/g, ' ').trim();

test('generated value equals registry sum', () => {
  const data = generated();
  const onSale = LIGHT_FORTUNE_FEATURE_KEYS.filter((key) => {
    try { return resolveProduct({ featureKey: key }).lightFortune === true; } catch { return false; }
  });
  assert.deepEqual([...data.keys].sort(), [...onSale].sort());
  assert.equal(data.count, onSale.length);
  assert.equal(data.valueKRW, onSale.reduce((sum, key) => sum + resolveProduct({ featureKey: key }).priceKRW, 0));
  // 비교 금액은 지금 유료인 운세만 더한다. 무료 정책에 든 운세는 세지 않는다.
  const paid = onSale.filter((key) => !isFreeFortuneFeatureKey(key));
  assert.equal(data.freeCount, onSale.length - paid.length);
  assert.equal(data.paidValueKRW, paid.reduce((sum, key) => sum + resolveProduct({ featureKey: key }).priceKRW, 0));
  const listed = listProducts().filter((product) => product.lightFortune).map((product) => product.featureKey);
  for (const key of listed) assert.ok(data.keys.includes(key), key + ' is sold as light but missing from the list');
});

test('generated file is fresh', () => {
  assert.deepEqual(generated(), buildLightFortunes());
});

test('every light fortune has a customer-facing name', () => {
  const data = generated();
  for (const key of data.keys) {
    const label = data.labels[key];
    assert.ok(label, key + ' has no name');
    assert.match(label, /[가-힣]/, key + ' name must be Korean: ' + label);
    assert.doesNotMatch(label, /티저|해금|잠금 해제|1회|unlock|생성$/i, key + ' name reads as internal copy: ' + label);
  }
});

test('offer math', () => {
  const data = generated();
  const offers = passBenefitOffers('honey');
  assert.equal(offers.length, Object.keys(CURRENT_PASS_PLANS).length);
  const doc = body(renderPassBenefits('honey', 't'));
  for (const [index, offer] of offers.entries()) {
    const plan = Object.values(CURRENT_PASS_PLANS)[index];
    const value = data.paidValueKRW + plan.monthlyLimitCoin * 100;
    assert.equal(offer.value, value);
    assert.equal(offer.lightValue, data.paidValueKRW);
    assert.equal(offer.consultLimit, plan.monthlyLimitCoin * 100);
    const panel = text(doc.querySelector('#t-panel-' + index));
    assert.ok(panel.includes(`최대 ${Math.floor((1 - plan.wonPrice / value) * 100)}% 절약`), panel);
    assert.equal(doc.querySelector(`#t-panel-${index} .pb__comparison s`).textContent, won(value));
    assert.equal(doc.querySelector(`#t-panel-${index} .pb__prices strong`).textContent, won(plan.wonPrice));
  }
});

test('banner and panel copy', () => {
  const data = generated();
  const doc = body(renderPassBenefits('honey', 't'));
  const banner = doc.querySelector('.pb__banner');
  assert.match(text(banner.querySelector('p')), new RegExp('라이트 운세 ' + data.count + '종'));
  assert.deepEqual([...banner.children].map(line => line.getAttribute('aria-hidden')), ['false','true','true']);
  assert.ok(banner.compareDocumentPosition(doc.querySelector('.pb__selection')) & 4);
  assert.equal(doc.querySelector('.pb__revision').getAttribute('href'), '/terms/#terms-revision');
  const night = body(renderPassBenefits('honey', 't', { host:'yeongnyangi' }));
  assert.equal(night.querySelector('.pb__line b').textContent, '영냥이');
  assert.equal(doc.querySelector('.pb__line b').textContent, '연이');
  for (const [index, offer] of passBenefitOffers('honey').entries()) {
    const panel = doc.querySelector('#t-panel-' + index);
    const includes = text(panel.querySelector('.pb__includes'));
    assert.ok(includes.includes(`라이트 운세 ${data.count}종 횟수 제한 없이`), includes);
    assert.ok(text(panel.querySelector('.pb__comparison')).includes(`지금 유료인 운세 기준 ${won(data.paidValueKRW)} 상당`));
    assert.ok(includes.includes('전문가 상담 이용 한도'), includes);
    assert.ok(includes.includes(won(offer.consultLimit)), includes);
    assert.ok(text(panel.querySelector('.pb__conditions')).includes(offer.family ? '건당 금액 상한 없음' : `건당 ${won(offer.cap)} 이하`), includes);
    // 비교액과 그 근거는 같은 영역에서 함께 보인다.
    const basis = [...panel.querySelectorAll('.pb__terms')].find((node) => node.textContent.includes('각 1회'));
    assert.equal(text(basis), '지금 유료인 라이트 운세 각 1회와 상담 한도를 모두 이용했을 때의 단건 가격 비교예요. 지금 무료인 운세는 더하지 않았어요.');
    assert.equal(basis.parentElement, panel.querySelector('.pb__comparison s').parentElement, 'the explanation travels with the comparison price');
    assert.equal(text(panel.querySelector('.pb__comparison span')), '단건 결제 기준 이용 가치');
    // 건당 상한을 넘는 상담에 쓸 수 없다는 안내는 접힌 영역이 아니라 바로 보이는 목록에 있다.
    const conditions = includes;
    if (offer.family) assert.doesNotMatch(conditions, /대표 상담은 이 꿀단지로/);
    else assert.ok(conditions.includes(`건당 ${won(offer.cap)}을 넘는 대표 상담은 이 꿀단지로 이용할 수 없어요.`), conditions);
  }
});

test('the included list names every light fortune once', () => {
  const data = generated();
  const doc = body(renderPassBenefits('honey', 't'));
  const lists = doc.querySelectorAll('.pb__light-list');
  assert.equal(lists.length, 1);
  assert.equal(lists[0].tagName, 'DETAILS');
  assert.equal(text(lists[0].querySelector('summary')), `포함된 라이트 운세 ${data.count}종 보기`);
  const names = [...lists[0].querySelectorAll('li')].map((node) => node.textContent);
  assert.deepEqual([...names].sort(), data.keys.map((key) => data.labels[key]).sort());
});

test('korean-only list stays on the surface other languages never see', () => {
  const doc = body(renderPassBenefits('honey', 't'));
  assert.ok(doc.querySelector('.pb__light-list ul[data-cd-korean-only]'));
  assert.ok(doc.querySelector('.pb__scene[data-cd-korean-only]'));
  assert.match(read('styles/pass-benefits.css'), /html:not\(\[lang\^="?ko"?\]\) \.cdh \.pb\{display:none\}/);
});

test('no forbidden words', () => {
  const data = generated();
  const surfaces = [
    renderPassBenefits('honey', 't'),
    read('i18n/authored/homeOverseas-09.json'),
    JSON.stringify(JSON.parse(read('i18n/authored/shellCopy-10.json'))['home.gardenCopy.passLight']),
    JSON.stringify(data.labels),
  ];
  for (const surface of surfaces) {
    assert.doesNotMatch(surface, /LLM/);
    assert.doesNotMatch(surface, /AI 미사용/);
  }
});

test('old ending copy is gone', () => {
  const html = renderPassBenefits('honey', 't');
  assert.doesNotMatch(html, /소진 시 종료/);
  assert.match(html, /상담 한도를 다 써도 라이트 운세는 계속 이용할 수 있어요\./);
  const copy = JSON.parse(read('i18n/authored/homeOverseas-09.json'));
  assert.doesNotMatch(copy['home.benefitsCopy.end'].ko + copy['home.benefitsCopy.validity'].ko, /소진 시 종료/);
  const note = JSON.parse(read('i18n/authored/shellCopy-10.json'))['home.gardenCopy.passNote'];
  assert.doesNotMatch(note.ko, /구매 당시 조건을 유지/);
});

test('every new benefit copy is written in all twelve languages', () => {
  const languages = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms'];
  const copy = JSON.parse(read('i18n/authored/homeOverseas-09.json'));
  const shell = JSON.parse(read('i18n/authored/shellCopy-10.json'));
  const entries = [
    ...['lightBanner', 'lightBannerSub', 'termsRevision', 'lightLine', 'lightWorth', 'consultLine', 'consultAmount', 'consultCap', 'consultNoCap', 'signatureLimit', 'lightListTitle', 'value', 'end', 'validity', 'compare']
      .map((key) => copy['home.benefitsCopy.' + key]),
    shell['home.gardenCopy.passLight'],
    shell['home.gardenCopy.passNote'],
  ];
  for (const entry of entries) {
    for (const language of languages) assert.ok(entry?.[language], JSON.stringify(entry?.ko) + ' missing ' + language);
    const placeholders = (value) => (value.match(/\{\w+\}/g) || []).sort().join();
    for (const language of languages) assert.equal(placeholders(entry[language]), placeholders(entry.ko), language + ': ' + entry.ko);
  }
});
