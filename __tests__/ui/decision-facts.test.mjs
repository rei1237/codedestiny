import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FEATURE_KEY_PRICE_TABLE, PIG_COIN_UNLOCK_PRODUCTS, getPaidFeaturePaymentPolicy } from '../../worker/lib/paid-feature-registry.js';
import { SAJU_BUNDLE_DECISION_FACTS, TAROT_TEA_CTA, TEA_CONSULT_FEATURE_KEYS, TEA_CONSULT_PRICES, TEA_DECISION_FACTS } from '../../lib/marketing/decision-facts.mjs';
import { trustRecordCopy } from '../../lib/marketing/trust-record.mjs';

// 2026-11-15 전환 개편 Stage B: 유료 CTA 옆 결정 정보는 표시 전용이며, 가격·결제 수단은 레지스트리와 같아야 한다.
const read = (file) => readFileSync(file, 'utf8');
const won = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';
const FORBIDDEN = /적중|유일|보장|마감|지금만/;

test('tea panel prices come from the registry', () => {
  const pricing = read('src/features/fortune-tea-house/data/consultPricing.ts');
  const keysInPricing = [...pricing.matchAll(/featureKey: "(fortune-tea-house-[\w-]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual([...TEA_CONSULT_FEATURE_KEYS].sort(), keysInPricing, 'tea product keys drifted from consultPricing.ts');
  for (const key of TEA_CONSULT_FEATURE_KEYS) {
    assert.ok(TEA_CONSULT_PRICES[key] > 0, key);
    assert.equal(TEA_CONSULT_PRICES[key], FEATURE_KEY_PRICE_TABLE[key].amountKRW, key);
  }
});

test('bundle offer hardcoded price and facts match the registry and the facts module', () => {
  const offer = read('js/core/saju/bundle-offer.js');
  const spec = PIG_COIN_UNLOCK_PRODUCTS['unlock.saju_lifetime_bundle'];
  assert.equal(SAJU_BUNDLE_DECISION_FACTS.amountKRW, spec.amountKRW);
  assert.equal(offer.match(/var PRICE_LABEL = '([^']+)'/)[1], won(spec.amountKRW));
  assert.equal(Number(offer.match(/var COIN_COST = (\d+)/)[1]), spec.cost);
  assert.equal(SAJU_BUNDLE_DECISION_FACTS.coinCost, spec.cost);
  // "이용권·월정석으로는 결제할 수 없어요"는 서버 결제 수단이 단건 현금뿐일 때만 참이다.
  assert.deepEqual(getPaidFeaturePaymentPolicy('saju_lifetime_bundle').allowedPaymentMethods, ['DIRECT_KRW']);
  assert.equal(SAJU_BUNDLE_DECISION_FACTS.directOnly, true);
  for (const text of [SAJU_BUNDLE_DECISION_FACTS.billing, SAJU_BUNDLE_DECISION_FACTS.keep, SAJU_BUNDLE_DECISION_FACTS.method]) {
    assert.ok(offer.includes(`'${text}'`), 'bundle-offer.js copy drifted: ' + text);
  }
  assert.ok(offer.includes(`var TRUST_LINE = '${trustRecordCopy.short}'`));
  assert.ok(offer.includes(`var TRUST_HREF = '${trustRecordCopy.href}'`));
  assert.ok(offer.includes(`var TRUST_LINK = '${trustRecordCopy.link}'`));
  // 결제 버튼과 결제 길은 그대로다.
  assert.match(offer, /data-action="unlockPremiumFeature"/);
  assert.match(offer, /buildPaymentPolicyLinksHtml/);
  assert.ok(offer.includes('href="/refund-policy"'), 'fallback refund link');
});

test('bundle offer renders facts, policy links and trust line only on the Korean surface', async () => {
  const { JSDOM } = await import('jsdom');
  for (const lang of ['ko', 'en']) {
    const dom = new JSDOM(`<!doctype html><html lang="${lang}"><head></head><body></body></html>`, { runScripts: 'outside-only', url: 'https://code-destiny.com/' });
    const w = dom.window;
    w.cdBirthScopeCurrentProfileId = () => 'p1';
    w.isTileKeyUnlocked = () => false;
    w.eval(read('js/core/checkout-entry.js'));
    w.eval(read('js/core/saju/bundle-offer.js'));
    w.CdSajuBundleOffer.open({ source: 'test' });
    const panel = w.document.querySelector('.cd-bundle-offer__panel');
    assert.ok(panel.querySelector('.cd-bundle-offer__pay[data-action="unlockPremiumFeature"][data-unlock-key="saju_lifetime_bundle"]'), lang + ': pay button unchanged');
    if (lang === 'ko') {
      assert.ok(panel.querySelector('[data-cd-decision-facts]'));
      assert.ok(panel.querySelector('a[href="/refund-policy"]'), 'refund link');
      const html = panel.innerHTML;
      assert.ok(html.indexOf('cd-bundle-offer__facts') < html.indexOf('cd-bundle-offer__pay'), 'facts sit above the pay button');
      assert.ok(html.indexOf('cd-bundle-offer__pay') < html.indexOf('cd-bundle-offer__trust'), 'trust line stays below the pay button');
    } else {
      assert.equal(panel.querySelector('[data-cd-decision-facts]'), null);
      assert.equal(panel.querySelector('.cd-bundle-offer__trust'), null);
    }
  }
});

test('tarot paid CTA uses the registry 3-card price and keeps its destination', () => {
  const price = FEATURE_KEY_PRICE_TABLE['fortune-tea-house-tarot-consultation'].amountKRW;
  assert.equal(TAROT_TEA_CTA.label, `내 질문으로 이어서 보기 · ${won(price)}(단건)`);
  const shell = read('index.html');
  const block = shell.match(/<div id="tarotFreeCta" hidden>[\s\S]*?<\/div>/)[0];
  assert.ok(block.includes(`<a href="${TAROT_TEA_CTA.href}">${TAROT_TEA_CTA.label}</a>`), 'tarot CTA label/href drifted');
  assert.ok(block.includes(`<p>${TAROT_TEA_CTA.line}</p>`));
  for (const mirror of ['public/index.html', 'public/ggulggul/index.html']) {
    assert.ok(read(mirror).includes(TAROT_TEA_CTA.label), mirror + ': run npm run sync:public');
  }
});

test('tea confirmation shows the panel beside its CTA with a refund link, web Korean only', () => {
  const confirm = read('src/features/fortune-tea-house/components/TeaConsultConfirmation.tsx');
  assert.match(confirm, /\{paymentSurface!=="toss"&&locale==="ko"&&<DecisionFacts\/>\}\r?\n  <div className=\{styles\.actions\}>/);
  const panel = read('app/components/conversion/DecisionFacts.tsx');
  assert.match(panel, /href=\{I18N_POLICY_ROUTE_MAP\.refundPolicy\.ko\}/);
  assert.match(read('lib/i18n/routes.ts'), /refundPolicy: \{[\s\S]*?ko: "\/refund-policy"/);
  assert.match(panel, /<TrustRecordLine variant="short"/);
  assert.match(TEA_DECISION_FACTS.keep, /\/records\//);
  assert.match(read('lib/records/service-registry.js'), /service\('tea', [^\n]*'\/fortune-tea-house\/\?resultId='/);
});

test('new decision copy avoids forbidden pressure and accuracy words', () => {
  const texts = [
    ...Object.values(TEA_DECISION_FACTS),
    SAJU_BUNDLE_DECISION_FACTS.billing, SAJU_BUNDLE_DECISION_FACTS.keep, SAJU_BUNDLE_DECISION_FACTS.method,
    TAROT_TEA_CTA.label, TAROT_TEA_CTA.line, trustRecordCopy.short,
  ];
  for (const text of texts) assert.doesNotMatch(text, FORBIDDEN, text);
  const offer = read('js/core/saju/bundle-offer.js');
  const factsBlock = offer.match(/var FACTS = \[[\s\S]*?var TRUST_LINK = [^\n]+/)[0];
  assert.doesNotMatch(factsBlock, FORBIDDEN);
  assert.doesNotMatch(read('app/components/conversion/DecisionFacts.tsx'), FORBIDDEN);
});
