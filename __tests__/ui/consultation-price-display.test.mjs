import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
import { FEATURE_KEY_PRICE_TABLE } from '../../worker/lib/paid-feature-registry.js';

const shell = readFileSync('index.html', 'utf8');
const get = id => {
  const html = shell.match(new RegExp('<article class="cd-picker-card"[^>]*>\\s*<a class="cd-picker-main"[^>]*data-picker-service-id="' + id + '"[^>]*>[\\s\\S]*?<\\/article>'))?.[0];
  assert.ok(html, 'missing generated picker card: ' + id);
  return JSDOM.fragment(html);
};

test('home cards for baseline free readings use the free overlay rather than historical checkout prices', () => {
  for (const [href, key, question] of [
    ['/tarot/reunion/', 'tarot-reunion-reading', 'reunionAgain'],
    ['/tarot/year/', 'tarot-year-fortune', 'moneyMonth'],
    ['/tarot-ijik.html', 'tarot-ijik', 'careerMove'],
    ['/destiny-compass/', 'destiny-compass-life-voyage', 'careerTurn'],
    ['/saju/animal-destiny/', 'animal-destiny-unlock', 'selfStrength'],
    ['/nakshatra/muhurta/', 'nakshatra-muhurta', 'marriageDate'],
    ['/nakshatra/compat/', 'nakshatra-compat', 'peopleMatch'],
  ]) {
    assert.equal(isFreeFortuneFeatureKey(key), true);
    const tag = 'data-cd-question="' + question + '"';
    const start = shell.indexOf(tag);
    assert.notEqual(start, -1, question);
    const html = shell.slice(shell.lastIndexOf('<article class="cd-picker-card"', start), shell.indexOf('</article>', start) + 10);
    const card = JSDOM.fragment(html);
    assert.equal(card.querySelector('.cd-picker-main').getAttribute('href'), href);
    assert.equal(card.querySelector('.cd-sig-card__price').textContent, '무료');
    for (const a of [card.querySelector('.cd-picker-main'), card.querySelector('[' + tag + ']')]) {
      assert.equal(a.getAttribute('data-cd-price-free'), 'true');
      assert.equal(a.getAttribute('href'), href);
      assert.equal(a.hasAttribute('data-price-from'), false);
    }
    assert.equal(card.querySelector('[data-cd-price-key],[data-cd-play-price],[data-pvw-paid]'), null);
  }
});

test('paid picker cards retain payment and platform price metadata', () => {
  const paid = get('tarot-mindscan');
  const key = 'tarot-mindscan';
  assert.equal(isFreeFortuneFeatureKey(key), false);
  const price = paid.querySelector('.cd-sig-card__price');
  assert.equal(price.textContent, FEATURE_KEY_PRICE_TABLE[key].amountKRW.toLocaleString('ko-KR') + '원');
  assert.equal(price.getAttribute('data-cd-play-feature'), key);
  assert.equal(paid.querySelector('.cd-picker-main').getAttribute('data-cd-price-key'), key);
});

test('legacy and generated details agree on access and distinguish animal totem from the free animal reading', () => {
  const marketing = JSON.parse(readFileSync('lib/marketing/feature-marketing-copy.generated.json', 'utf8'));
  for (const [id, key] of [['openDestinyBias', 'destiny-bias-analyze'], ['openAnimalTotemModal', 'animal-totem-basic']]) {
    const line = shell.split('\n').find(line => line.includes(id + ":{featureId:'" + key + "'"));
    assert.ok(line, id);
    const text = JSON.stringify(marketing.items[key] || marketing.items[id]);
    assert.ok(text, key);
    for (const source of [line, text]) {
      if (id === 'openDestinyBias') {
        assert.match(source, /로그인.{0,10}무료/);
        assert.doesNotMatch(source, /5,000원|결제 확인 후|단건 결제/);
      } else {
        assert.match(source, /한 장·세 장·다섯 장/);
        assert.doesNotMatch(source, /3,000원/);
      }
    }
  }
  for (const key of ['animal-totem-basic','animal-totem-deep']) {
    assert.equal(isFreeFortuneFeatureKey(key), false);
    assert.equal(FEATURE_KEY_PRICE_TABLE[key].amountKRW, 5000);
  }
});

test('translated detail overlays cannot restore the retired charges', () => {
  for (const locale of ['en','ja','zh-cn','zh-tw','de','es','fr','hi','ms','nl','vi']) {
    const {featureMarketing} = JSON.parse(readFileSync('public/i18n/' + locale + '.json', 'utf8'));
    const bias = featureMarketing.openDestinyBias;
    const totem = featureMarketing.openAnimalTotemModal;
    assert.doesNotMatch(bias.faq[0].a, /5[,，]000/, locale);
    assert.doesNotMatch(totem.outline[0].detail, /3[,，]000/, locale);
    assert.match(bias.faq[0].a, /Free after signing in|ログインすれば無料|登录后免费|登入後可免費/u, locale);
  }
});
