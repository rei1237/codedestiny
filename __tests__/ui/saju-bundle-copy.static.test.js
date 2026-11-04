// 상세·마케팅·SEO 문구가 "무료 만세력 + 영구 묶음(29,000원) 하나" 기준과 맞는지 정적으로 본다.
// 판매 종료 키 목록과 가격은 정본(worker/lib)에서 읽는다. 문구를 읽는 검사라 렌더나 결제는 건드리지 않는다.
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const BUNDLE = 'saju_lifetime_bundle';

// 판매 표면: 고객이 읽는 상품·마케팅·SEO 문구가 사는 곳.
const SALES_SURFACES = [
  'app/yeongnyangi/1000-won-fortune/page.tsx',
  'lib/seo/entity-registry.mjs',
  'lib/seo-landing-pages.js',
  'lib/seo/intent-copy.mjs',
  'lib/saju/saju-service-catalog.mjs',
  'js/core/service-registry.js',
  'js/basic-fortune-detail.mjs',
  'js/core/saju/bundle-offer.js',
  'js/core/saju/reading-personas.js',
  'app/saju/page.js',
  'llms.txt',
  'llms-full.txt',
];
// 묶음 이름 통일 대상(고객 문구).
const NAME_SURFACES = [
  ...SALES_SURFACES,
  'app/saju/career-style/CareerStyleClient.tsx',
  'app/saju/career-style/page.tsx',
  'app/human-design/_copy/index.ts',
];
// 판매 종료 키의 고객 이름. 옆에 원 단위 가격이 붙으면 안 된다.
const CLOSED_NAMES = ['나의 매력 클래스', '인생 스킬 트리', '달빛 럭키 리추얼'];
// 묶음 보유와 별개로 무료로 남아 있던 시절의 안내 문구가 남으면 안 되는 popup 항목(묶음 포함으로 닫힌 카드).
const GATED_POPUP_IDS = ['rpt_tTestCard', "'rpt_hormone-vibe-section'", 'rpt_lottoCard', 'rpt_sajuFourCutCard', 'rpt_dopamineCard'];
const BUNDLE_POPUP_IDS = [
  'rpt_healthReportCard', 'rpt_quantumCard', 'rpt_skillTreeCard', "'animal-destiny-unlock'",
  'rpt_specialCharmCard', 'rpt_energyCoordCard', 'rpt_villainCard', 'rpt_secretHouseEntryCard',
];

const PRICE_RE = /\d[\d,]*\s*원|FUN_PRICE/;
const stripSharedFreeReward = (text) => text.replace(/무료 사주 첫걸음/g, '');

async function importPolicy() {
  const policy = await import(pathToFileURL(path.join(root, 'worker/lib/saju-bundle-policy.js')).href);
  const registry = await import(pathToFileURL(path.join(root, 'worker/lib/paid-feature-registry.js')).href);
  return { policy, registry };
}

function popupLine(index, id) {
  const lines = index.split('\n');
  const needle = id.startsWith("'") ? `${id}:{featureId` : `${id}:{featureId`;
  const line = lines.find((entry) => entry.trimStart().startsWith(needle));
  assert.ok(line, `popup 항목을 찾지 못함: ${id}`);
  return line;
}

test('판매 표면에 판매 종료 키의 개별 가격이 없다', async () => {
  const { policy, registry } = await importPolicy();
  assert.equal(policy.SAJU_BUNDLE_SALE_CLOSED_KEYS.length, 18);
  for (const rel of SALES_SURFACES) {
    const text = read(rel);
    for (const name of CLOSED_NAMES) {
      let at = text.indexOf(name);
      while (at >= 0) {
        const near = text.slice(Math.max(0, at - 40), at + name.length + 40);
        assert.doesNotMatch(near, PRICE_RE, `${rel}: "${name}" 옆에 가격이 있다: ${near.replace(/\s+/g, ' ')}`);
        at = text.indexOf(name, at + name.length);
      }
    }
  }
  // 천원 페이지: 1,000원 가격 상수와 가격 가드가 없어야 한다.
  const hub = read('app/yeongnyangi/1000-won-fortune/page.tsx');
  assert.doesNotMatch(hub, /FUN_PRICE|amountKRW\s*!==\s*1000|won\(1000\)/, '천원 페이지에 1,000원 가격 상수가 남아 있다');
  // 옛 개별 가격은 정본에 남아 있어도(기존 구매 권리) 판매 문구에는 나오지 않는다.
  for (const key of policy.SAJU_BUNDLE_SALE_CLOSED_KEYS) {
    const spec = registry.FEATURE_KEY_PRICE_TABLE[key];
    if (!spec || !spec.amountKRW) continue;
    const label = `${spec.amountKRW.toLocaleString('ko-KR')}원`;
    for (const rel of ['llms.txt', 'llms-full.txt', 'lib/seo/entity-registry.mjs']) {
      const text = read(rel);
      for (const name of CLOSED_NAMES) {
        const at = text.indexOf(name);
        if (at < 0) continue;
        assert.ok(!text.slice(Math.max(0, at - 60), at + 60).includes(label), `${rel}: ${name} 근처에 ${label}`);
      }
    }
  }
});

test('묶음 가격 표기는 29,000원 하나다', async () => {
  const { policy, registry } = await importPolicy();
  assert.equal(policy.SAJU_BUNDLE_FEATURE_KEY, BUNDLE);
  assert.equal(registry.PIG_COIN_UNLOCK_PRODUCTS[`unlock.${BUNDLE}`].amountKRW, 29000);
  const names = [policy.SAJU_BUNDLE_LABEL, '사주 영구 묶음', '평생 소장'];
  for (const rel of NAME_SURFACES) {
    const text = read(rel);
    for (const name of names) {
      let at = text.indexOf(name);
      while (at >= 0) {
        const near = text.slice(at, at + name.length + 24);
        const price = near.match(/\d[\d,]*\s*원/);
        if (price) assert.equal(price[0].replace(/\s+/g, ''), '29,000원', `${rel}: 묶음 옆 가격이 29,000원이 아니다: ${near}`);
        at = text.indexOf(name, at + name.length);
      }
    }
  }
  // 천원 페이지는 묶음 가격을 정본 가격표에서 읽는다(숫자를 새로 적지 않는다).
  const hub = read('app/yeongnyangi/1000-won-fortune/page.tsx');
  assert.match(hub, /SAJU_BUNDLE_FEATURE_KEY|saju_lifetime_bundle/);
  assert.match(hub, /BUNDLE_PRICE/);
  // 결과 화면의 묶음 카드 가격 표기는 하나다.
  const index = read('index.html');
  const cardPrices = [...index.matchAll(/<span class="pf-coin-amount">([^<]*)<\/span>/g)].map((m) => m[1].trim());
  assert.ok(cardPrices.length >= 2);
  assert.deepEqual([...new Set(cardPrices)], ['묶음 29,000원']);
  assert.match(read('js/core/saju/bundle-offer.js'), /PRICE_LABEL = '29,000원'/);
});

test('묶음 이름이 하나로 통일되어 있다', async () => {
  const { policy } = await importPolicy();
  for (const rel of NAME_SURFACES) {
    const text = read(rel);
    assert.doesNotMatch(text, /사주 영구 묶음|사주 전체 풀이 묶음/, `${rel}: 묶음 이름이 표시 이름과 다르다`);
  }
  assert.ok(read('js/core/saju/bundle-offer.js').includes(policy.SAJU_BUNDLE_LABEL));
  assert.ok(read('app/yeongnyangi/1000-won-fortune/page.tsx').includes('SAJU_BUNDLE_LABEL'));
});

test('무료 사주 표기가 사라졌다', () => {
  for (const rel of SALES_SURFACES) {
    assert.doesNotMatch(read(rel), /무료 사주/, `${rel}: "무료 사주"가 남아 있다`);
  }
  // 이름을 바꾸는 만큼 "무료 만세력"이 판매 표면 어딘가에는 있어야 한다.
  for (const rel of ['lib/seo/entity-registry.mjs', 'lib/seo-landing-pages.js', 'lib/saju/saju-service-catalog.mjs', 'llms.txt', 'app/yeongnyangi/1000-won-fortune/page.tsx']) {
    assert.match(read(rel), /무료 만세력/, `${rel}: "무료 만세력"이 없다`);
  }
  // index.html: 활성화 보상 이름인 "무료 사주 첫걸음"은 별도 상품명이라 이 작업 밖이다. 나머지는 없어야 한다.
  const index = stripSharedFreeReward(read('index.html'));
  assert.doesNotMatch(index, /무료 사주/, 'index.html: "무료 사주"가 남아 있다');
  // 무료로 열린 것처럼 보이는 popup 문구도 같이 정리한다.
  const html = read('index.html');
  for (const id of GATED_POPUP_IDS) {
    const line = popupLine(html, id);
    assert.doesNotMatch(line, /무료|추가 결제 없이/, `${id} popup에 무료 안내가 남아 있다`);
  }
  for (const id of BUNDLE_POPUP_IDS) {
    const line = popupLine(html, id);
    assert.doesNotMatch(line, /기존 결제 정책을 따릅니다/, `${id} popup이 묶음 기준이 아니다`);
    assert.match(line, /평생 소장에 포함/, `${id} popup에 묶음 포함 안내가 없다`);
  }
});

test('결과 화면 묶음 버튼 이름이 묶음 상품과 맞다', () => {
  const index = read('index.html');
  assert.doesNotMatch(index, /라이트 풀이 열기 →|대운 분석 열기 →/);
  const bundleButtons = [...index.matchAll(/data-unlock-key="saju_lifetime_bundle"[^>]*>\s*<span[^>]*>([^<]*)<\/span>/g)].map((m) => m[1]);
  assert.ok(bundleButtons.length >= 2);
  for (const label of bundleButtons) assert.match(label, /사주 전체 풀이 평생 소장/);
  assert.doesNotMatch(index, /라이트 풀이로 타고난 결을 먼저/);
});

test('고객 문구에 금지어가 없다', () => {
  const surfaces = [...NAME_SURFACES, 'js/core/saju/crafted-product-details.mjs'];
  for (const rel of surfaces) {
    const text = read(rel).replace(/\bAI 기반\b/g, '');
    assert.doesNotMatch(text, /비\s*LLM|AI\s*미사용|\bLLM\b/, `${rel}: 금지어`);
    assert.doesNotMatch(text, /정확도\s*\d|\d+\s*%\s*(적중|정확)|100%\s*보장/, `${rel}: 정확도 수치나 보장 표현`);
  }
  for (const id of [...GATED_POPUP_IDS, ...BUNDLE_POPUP_IDS]) {
    const line = popupLine(read('index.html'), id);
    assert.doesNotMatch(line, /비\s*LLM|AI\s*미사용|\bLLM\b/, `${id} popup 금지어`);
  }
});

test('URL을 바꾸지 않는다', () => {
  const sitemap = read('scripts/generate-sitemap.mjs');
  for (const route of ['/saju', '/saju/destiny-anatomy', '/yeongnyangi/1000-won-fortune']) {
    assert.ok(sitemap.includes(`path: "${route}"`), `사이트맵 입력에서 ${route}가 빠졌다`);
  }
  assert.ok(fs.existsSync(path.join(root, 'app/yeongnyangi/1000-won-fortune/page.tsx')));
  assert.ok(fs.existsSync(path.join(root, 'app/saju/destiny-anatomy/page.tsx')) || fs.existsSync(path.join(root, 'app/saju/destiny-anatomy/page.js')));
  const entity = read('lib/seo/entity-registry.mjs');
  for (const route of ['/saju', '/yeongnyangi/1000-won-fortune']) {
    assert.ok(entity.includes(`path: "${route}"`) || entity.includes(`path: '${route}'`) || entity.includes(`'${route}'`) || entity.includes(`"${route}"`), `엔티티 레지스트리에서 ${route}가 빠졌다`);
  }
  assert.match(read('app/yeongnyangi/1000-won-fortune/page.tsx'), /const PATH='\/yeongnyangi\/1000-won-fortune\/'/);
});

test('색인 소개 페이지의 공개 소개와 예시는 그대로 열려 있다', () => {
  const landing = read('lib/seo-landing-pages.js');
  assert.match(landing, /path: "\/saju"/);
  assert.match(landing, /resultItems:/);
  assert.match(landing, /sections:/);
  // 무료 범위를 만세력·원국으로 밝히고, 나머지는 평생 소장 묶음이라고 숨기지 않고 말한다.
  assert.match(landing, /사주 전체 풀이 평생 소장/);
});
