import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
const read = path => readFileSync(path, 'utf8');

test('former thousand-won hub distinguishes free calculated reports from paid AI and Light/daewun', () => {
  const hub = read('app/yeongnyangi/1000-won-fortune/page.tsx');
  for (const key of ['rpt_specialCharmCard', 'rpt_skillTreeCard', 'fun.quantumLotto.ritualReport']) {
    assert.equal(isFreeFortuneFeatureKey(key), true, key);
  }
  assert.match(hub, /무료로 읽는 재미 사주 리포트/);
  assert.match(hub, /<small>무료<\/small>/);
  assert.match(hub, /기본풀이와 계산형 재미 리포트도 무료/);
  assert.doesNotMatch(hub, /<small>묶음 포함|따로 팔지 않고|원국 해석과 라이트 사주 풀이·대운 분석/);
  assert.match(hub, /라이트 사주 풀이와 사주 대운 분석을 한 번 결제/);
  assert.match(hub, /AI 상담과 AI 궁합은 별도 상품/);
  assert.match(hub, /BUNDLE_PRICE=won\(BUNDLE_SPEC.amountKRW\)/);
  assert.match(hub, /const PRICE=won\(mackerels\[0\].priceKRW\)/);
  assert.match(hub, /기존 구매 권리는 그대로 유지/);
  assert.match(hub, /const PATH='\/yeongnyangi\/1000-won-fortune\/'/);
  assert.match(hub, /alternates:\{canonical:PAGE_URL\}/);
  assert.match(hub, /robots:ROBOTS_META.INDEX/);
});

test('basic reading and health guide copy no longer claims a bundle purchase is required', () => {
  const guide=read('app/components/guide-cta-targets.js');
  assert.match(guide, /계산형 헬스 리포트는 추가 결제 없이 읽을 수/);
  assert.doesNotMatch(guide, /헬스 리포트는 라이트 사주 풀이에 포함/);
  const basic=read('app/insights/articles.js');
  assert.match(basic, /신강신약 판단부터 균형 전략까지의 풀이는 무료 기본풀이/);
  assert.doesNotMatch(basic, /오행 균형의 문장 풀이는 라이트 사주 풀이|기질의 자세한 해석은 라이트 사주 풀이|십성으로 읽는 일머리 풀이는 라이트 사주 풀이/);
  const growth=read('app/insights/seo-growth-articles.js');
  assert.match(growth, /십성을 문장으로 풀어 읽는 기본풀이도 같은 결과 화면에서 무료/);
  assert.match(growth, /대운수와 현재 대운 간지는 라이트 사주 풀이에서/);
});
