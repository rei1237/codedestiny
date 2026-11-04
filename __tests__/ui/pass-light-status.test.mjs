// 구매·상태 화면이 "소진해도 이용권은 살아 있다" 규칙을 그대로 보여 주는지 확인한다(스펙 6.3, 7.3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as limits from '../../worker/lib/profile-limits.js';
import * as passPolicy from '../../lib/payment/pass-policy.js';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

const jsxRuntime = createRequire(import.meta.url)('react/jsx-runtime');

function load(path, stubs) {
  const { outputText } = ts.transpileModule(read(path), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const mod = { exports: {} };
  const stubRequire = (name) => {
    if (name in stubs) return stubs[name];
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return jsxRuntime;
    throw new Error('unexpected import ' + name);
  };
  new Function('module', 'exports', 'require', outputText)(mod, mod.exports, stubRequire);
  return mod.exports;
}

const eligibility = load('lib/payment/pass-eligibility.ts', { '@/worker/lib/profile-limits': limits });
const { default: StatusCard } = load('app/points/SubscriptionStatusCard.tsx', {
  '@/constants/loadingMessages': { getCurrentLoadingLocale: () => 'ko' },
  '@/lib/payment/pass-expiry': { isOpenEndedPassExpiry: () => true, openEndedPassLabel: () => '기간 제한 없음 · 자동 갱신 없음' },
  '@/lib/payment/pass-eligibility': eligibility,
  '@/lib/payment/pass-policy.js': passPolicy,
});

const FAR = new Date(Date.now() + 100 * 365 * 86_400_000).toISOString();
const card = (passUsage) => renderToStaticMarkup(React.createElement(StatusCard, {
  subscription: { tier: 'standard', isActive: true, expiresAt: FAR, profileLimit: 0 },
  passUsage,
}));
const usage = (usedKRW) => ({ tier: 'standard', limitKRW: 20000, usedKRW, remainingKRW: 20000 - usedKRW, perItemLimitKRW: 5000 });

test('exhausted status card shows repurchase and light stays on', () => {
  const html = card(usage(16000));
  assert.ok(html.includes('상담 한도 소진 · 라이트 운세 이용 중'));
  assert.ok(html.includes('href="/points/#moonlight-plans"'));
  assert.ok(html.includes('이용권 다시 구매하기'));
  assert.ok(html.includes('작은 꿀단지'), 'still shows the owned pass');
  assert.doesNotMatch(html, /무료 플랜|FREE/);
  assert.doesNotMatch(html, /현재 작은 꿀단지 이용 중/);
});

test('status card with allowance left stays on the normal state', () => {
  const html = card(usage(15000));
  assert.ok(html.includes('현재 작은 꿀단지 이용 중'));
  assert.doesNotMatch(html, /상담 한도 소진|이용권 다시 구매하기/);
});

test('status card shows the limit the holder actually has', () => {
  assert.ok(card(usage(0)).includes('20,000원 상당'));
  assert.ok(card({ ...usage(0), limitKRW: 11500, remainingKRW: 11500 }).includes('11,500원 상당'), 'older pass keeps its own limit');
  assert.ok(card(undefined).includes('20,000원 상당'), 'snapshot not loaded yet falls back to the plan');
});

test('exhaustion matches the server threshold', () => {
  const { isConsultationAllowanceExhausted: done } = eligibility;
  assert.equal(done(usage(15000)), false, '5,000 left is still coverable');
  assert.equal(done(usage(15100)), true, '4,900 left is not');
  assert.equal(done(null), false);
  assert.equal(done({ tier: 'free', limitKRW: 0, remainingKRW: 0 }), false);
  assert.equal(limits.MIN_PASS_COVERABLE_COIN * 100, 5000);
});

test('product notice treats a light fortune as included after exhaustion', () => {
  const { describePassEligibility: describe } = eligibility;
  const spent = usage(20000);
  assert.equal(describe(5000, spent, 'ko').monthlyExhausted, true);
  const light = describe(5000, spent, 'ko', { lightFortune: true });
  assert.equal(light.monthlyExhausted, false);
  assert.equal(light.coveredByCurrentPass, true);
  assert.doesNotMatch(light.label, /소진/);
});

test('old termination sentence is gone from purchase and status screens', () => {
  for (const path of ['app/points/SubscriptionStatusCard.tsx', 'app/points/PointsClient.tsx', 'app/points/history/PointHistoryClient.tsx', 'lib/payment/pass-expiry.ts', 'app/app/_lib/copy.ts']) {
    const text = read(path).split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
    assert.doesNotMatch(text, /한도 소진 시 종료|이용권이 종료됩니다\. 다시 구매|한도를 모두 사용할 때까지 유지|ends when the usage limit|fully used, the pass ends|fully used the pass ends|it ends when|한도를 모두 사용하면 종료/, path);
  }
});

test('open-ended label no longer says the pass ends, in every language', () => {
  const text = read('lib/payment/pass-expiry.ts');
  assert.ok(text.includes('기간 제한 없음 · 자동 갱신 없음'));
  for (const file of ['i18n/authored/passNoExpiry-01.json', 'i18n/authored/shellCopy-04.json']) {
    assert.doesNotMatch(read(file), /한도 소진 시 종료/, file);
  }
});

test('shop lets an exhausted holder buy again', () => {
  const client = read('app/points/PointsClient.tsx');
  assert.match(client, /const consultationExhausted = subscription\.isActive && isConsultationAllowanceExhausted\(passUsage\)/);
  assert.match(client, /const lowerTierBlocked = !consultationExhausted && activeTierRank > 0/);
  assert.match(client, /subscription\.isActive && !consultationExhausted && subscription\.passPolicyVersion !== CURRENT_PASS_POLICY_VERSION/);
  assert.match(client, /!isGift && !consultationExhausted && activeTierRank > requestedTierRank/);
});

test('shop plan card states the light fortune value from the generated file', () => {
  const client = read('app/points/PointsClient.tsx');
  assert.match(client, /light-fortunes\.generated\.json/);
  assert.match(client, /lightFortunes\.valueKRW \+ /);
  assert.match(client, /단건 결제 기준 이용 가치/);
  assert.doesNotMatch(client, /단건 기준 최대 이용 가치/);
});

test('faq and policy guide carry the new rule', () => {
  const faq = read('app/_content/faq-copy.js');
  assert.ok(faq.includes('라이트 운세'));
  assert.ok(faq.includes('고객센터에서 이용 내역을 확인'));
  assert.ok(read('app/components/PolicyGuide.jsx').includes('한도와 사용 내역 확인'));
});

test('refund policy says use history goes to support review', () => {
  const terms = read('app/terms-of-service/TermsContent.jsx');
  const clause = terms.slice(terms.indexOf('id: "refund-policy"'));
  assert.ok(clause.includes('라이트 운세를 이용한 이용권은 자동으로 환불되지 않으며, 고객센터에서 이용 내역을 확인한 뒤 처리합니다.'));
  assert.match(read('app/refund-policy/page.js'), /REFUND_SECTION\.body/);
});

test('no forbidden words on these screens', () => {
  for (const path of ['app/points/SubscriptionStatusCard.tsx', 'lib/payment/pass-expiry.ts', 'app/_content/faq-copy.js']) {
    assert.doesNotMatch(read(path), /LLM/, path);
  }
});
