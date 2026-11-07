import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { REFUND_LINE, REFUND_POLICY_HREF } from '../../lib/marketing/home-concerns.mjs';
import { renderFeatureDetailPanels } from '../../js/feature-detail-panels.mjs';
import samples from '../../lib/marketing/result-samples.json' with { type: 'json' };

// P5 신뢰: 결제 버튼 옆 자동 환불 한 줄, 연애 비책 결과의 후기 배너, 후기 3건 미만이면 결과 예시.
const root = path.resolve(import.meta.dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const BANNED = /적중|1위|최고|100%|1년 전/;

function countOf(html, text) { return html.split(text).length - 1; }

test('상세 패널 히어로 CTA 옆에 REFUND_LINE과 정책 링크가 있다', () => {
  const detail = { verification: 'verified', title: '연애 비책', description: '설명', href: '/love-secret-ai/', ctaLabel: '시작하기', headline: '고백할까?' };
  const html = renderFeatureDetailPanels(detail, { headingLevel: 2, startPriceLabel: '시작 가격 확인' });
  assert.equal(countOf(html, REFUND_LINE), 1);
  assert.ok(html.includes(`href="${REFUND_POLICY_HREF}"`));
  // 한 줄은 구매 버튼과 같은 .fortuneAction 안에 있어야 버튼 옆에서 읽힌다.
  const action = html.match(/<div class="fortuneAction">[\s\S]*?<\/div>/)[0];
  assert.ok(action.includes(REFUND_LINE) && action.includes('href="/love-secret-ai/"'));
  assert.doesNotMatch(action, BANNED);
});

test('무료 기능 상세 패널에는 환불 한 줄이 없고 유료·미정은 있다', () => {
  const detail = { verification: 'verified', title: '무료 풀이', description: '설명', href: '/free/', ctaLabel: '시작하기', headline: '무료' };
  const html = accessType => renderFeatureDetailPanels({ ...detail, accessType }, { startPriceLabel: '무료' });
  const free = html('free');
  assert.ok(free.includes('href="/free/"') && !free.includes(REFUND_LINE) && !free.includes(REFUND_POLICY_HREF));
  assert.ok(html('paid').includes(REFUND_LINE));
  assert.ok(html('unknown').includes(REFUND_LINE));
});

test('CTA가 없는 패널(가격 라벨·내부 href 없음)에는 환불 한 줄을 붙이지 않는다', () => {
  const detail = { verification: 'verified', title: '연애 비책', description: '설명', href: 'https://evil.example/', ctaLabel: '시작하기', headline: '고백할까?' };
  assert.ok(!renderFeatureDetailPanels(detail, { startPriceLabel: '시작 가격 확인' }).includes(REFUND_LINE));
  assert.ok(!renderFeatureDetailPanels({ ...detail, href: '/x/' }).includes(REFUND_LINE));
});

test('FeatureIntroductionActions가 CTA 아래에 REFUND_LINE과 정책 링크를 렌더한다', async () => {
  const outfile = path.join(root, 'build-cache/refund-line/actions.cjs');
  await build({
    stdin: { contents: `export { default as Actions } from './app/features/FeatureIntroductionActions.tsx';`, resolveDir: root },
    outfile, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', logLevel: 'silent',
    external: ['react', 'react/jsx-runtime'],
  });
  const { Actions } = createRequire(import.meta.url)(outfile);
  const render = accessType => renderToStaticMarkup(createElement(Actions, { detail: { featureKey: undefined, href: '/features/x/', ctaLabel: '시작하기', accessType } }));
  const html = render('paid');
  assert.ok(html.includes(REFUND_LINE), html);
  assert.ok(html.includes(`href="${REFUND_POLICY_HREF}"`));
  assert.ok(html.indexOf('시작하기') < html.indexOf(REFUND_LINE), '환불 한 줄은 CTA 뒤에 온다');
  // 무료 기능에는 결제가 없어 환불 약속이 틀린 말이 된다.
  const free = render('free');
  assert.ok(!free.includes(REFUND_LINE) && !free.includes(REFUND_POLICY_HREF), free);
});

test('연애 비책 약속 카드 하단과 결과 화면이 환불 한 줄과 후기 배너를 렌더한다', () => {
  const client = read('app/love-secret-ai/LoveSecretAiClient.tsx');
  const card = client.slice(client.indexOf('function LoveSecretPromiseCard'), client.indexOf('function LoveSecretGeneratingCard'));
  assert.match(card, /promiseCardRefund/);
  assert.match(card, /href={REFUND_POLICY_HREF}/);
  assert.match(client, /promiseCardRefund: REFUND_LINE,/);
  assert.match(client, /from "@\/lib\/marketing\/home-concerns\.mjs"/);

  const result = read('app/love-secret-ai/result/LoveSecretAiResultClient.tsx');
  assert.match(result, /import ReviewRewardBanner from "@\/app\/components\/ReviewRewardBanner"/);
  assert.match(result, /\{isShareReady && <ReviewRewardBanner afterResult locale=\{[^}]+\}\s*\/>\}/);
});

// --- 홈 후기 → 결과 예시 대체 -------------------------------------------------
function homeScriptWindow() {
  const html = read('index.html');
  const exampleJson = html.match(/<script type="application\/json" id="cdReviewsExample">([\s\S]*?)<\/script>/)?.[1];
  const script = html.match(/<script data-marker="cd-reviews-v20260819">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(exampleJson && script, '홈 후기 스크립트와 예시 데이터가 있어야 한다');
  const dom = new JSDOM(`<!doctype html><body><section id="cdReviews" hidden><h2 id="cdReviewsTitle">이용자 후기</h2>
    <div id="cdReviewsSummary" hidden></div><div id="cdReviewsGrid"></div></section>
    <script type="application/json" id="cdReviewsExample">${exampleJson}</script></body>`, { runScripts: 'outside-only', url: 'https://code-destiny.com/' });
  dom.window.fetch = () => new Promise(() => {}); // 목 서버: 실제 요청 없이 __cdRenderReviews 로만 구동한다.
  dom.window.eval(script);
  return dom.window;
}
const review = n => ({ rating: 5, body: `후기 본문 ${n}`, authorName: `이용자${n}`, displayedAt: '2026-10-01T00:00:00Z', isVerifiedPurchase: true });

test('홈 후기가 2건이면 후기 대신 예시로 라벨된 결과 예시 블록을 보여 준다', () => {
  const w = homeScriptWindow();
  w.__cdRenderReviews([review(1), review(2)], { ok: true, total: 2, average: 5 });
  const section = w.document.getElementById('cdReviews');
  assert.equal(section.hidden, false);
  assert.equal(w.document.getElementById('cdReviewsTitle').textContent, '결과 예시');
  assert.equal(section.querySelectorAll('.cd-review-card').length, 0, '후기 카드로 보이면 안 된다');
  assert.equal(w.document.getElementById('cdReviewsSummary').hidden, true);
  const block = section.querySelector('[data-cd-result-example]');
  assert.ok(block);
  const sample = samples.find(item => item.id === 'love-secret');
  assert.ok(block.textContent.includes(sample.excerpts[0]));
  assert.ok(block.textContent.includes('실제 고객 후기가 아니'), '예시라는 설명이 있어야 한다');
  assert.ok(block.querySelector(`a[href="${sample.href}"]`));
  assert.doesNotMatch(block.textContent, BANNED);
});

test('홈 후기가 0건이어도 결과 예시를 보여 주고, 3건 이상이면 후기를 보여 준다', () => {
  const w = homeScriptWindow();
  w.__cdRenderReviews([], null);
  assert.equal(w.document.getElementById('cdReviews').hidden, false);
  assert.ok(w.document.querySelector('[data-cd-result-example]'));

  assert.equal(w.__cdRenderReviews([review(1), review(2), review(3)], { ok: true, total: 3, average: 5 }), true);
  assert.equal(w.document.getElementById('cdReviewsTitle').textContent, '이용자 후기');
  assert.equal(w.document.querySelectorAll('.cd-review-card').length, 3);
  assert.equal(w.document.querySelector('[data-cd-result-example]'), null);
});

test('홈 결과 예시 데이터는 result-samples.json의 연애 비책과 같다', () => {
  const html = read('index.html');
  const data = JSON.parse(html.match(/<script type="application\/json" id="cdReviewsExample">([\s\S]*?)<\/script>/)[1]);
  const sample = samples.find(item => item.id === 'love-secret');
  assert.equal(data.title, sample.title);
  assert.equal(data.question, sample.question);
  assert.equal(data.excerpt, sample.excerpts[0]);
  assert.equal(data.href, sample.href);
  // 예시 고지 문구는 결과 예시 렌더러의 승인 문구를 그대로 쓴다.
  assert.ok(read('lib/marketing/render-result-samples.mjs').includes(data.note));
});
