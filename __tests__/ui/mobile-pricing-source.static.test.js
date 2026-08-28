const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
const paidBadgeSources = [
  "app/astrology-ai/AstrologyAiClient.tsx",
  "app/love-secret-ai/LoveSecretAiClient.tsx",
  // 2026-08-13 통합: ZiweiAiConsultPanel 이 ZiweiDeepPdfPanel 로 흡수됐다(같은 화면·같은 가격의
  // 유료 상품 두 개를 하나로). PriceBadge 사용처가 그대로 옮겨왔으므로 검사 대상도 옮긴다.
  "app/components/ziwei/ZiweiDeepPdfPanel.tsx",
  "app/karma-destiny-ai/KarmaDestinyAiClient.tsx",
  "app/life-book-ai/LifeBookAiClient.tsx",
  "app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx",
  "app/naming-ai/NamingAiClient.tsx",
  "app/new-year-ai-consultation/NewYearAiClient.tsx",
  "app/ziwei-ai/ZiweiAiClient.tsx",
  "app/vedic-ai/VedicAiClient.tsx",
];

test("paid UI badges do not provide a numeric PriceBadge fallback", () => {
  paidBadgeSources.forEach((relativePath) => {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert.doesNotMatch(source, /fallbackCoins\s*=/, relativePath);
  });
  assert.match(fs.readFileSync(path.join(root, "app/components/FeatureLandingPage.tsx"), "utf8"), /featureKey:\s*paidMeta\?\.featureKey/);
});

test("targeted mobile cards carry canonical feature keys and matching registry prices", () => {
  assert.match(shell, /data-action="startIjikTarot"[\s\S]{0,240}data-feature-key="tarot-ijik"[\s\S]{0,240}data-price-krw="5000"/);
  assert.match(shell, /data-action="openLoveSimulation"[\s\S]{0,240}data-feature-key="loveSimulation"[\s\S]{0,240}data-price-krw="10000"/);
  assert.match(shell, /data-action="openAnimalDestinyRoute"[\s\S]{0,260}data-feature-key="animal-destiny-unlock"[\s\S]{0,260}data-price-krw="10000"/);
});

test("React marketing sheets are lazy-mounted and use canonical pricing", () => {
  const source = fs.readFileSync(path.join(root, "app/components/FeatureMarketingDetailModal.tsx"), "utf8");
  const priceHook = fs.readFileSync(path.join(root, "app/hooks/useServerPrice.ts"), "utf8");
  assert.doesNotMatch(source, /formatKrwFromCoins/);
  assert.match(source, /useServerPrice\(\{\s*featureKey:\s*target\.featureKey/);
  assert.match(source, /open\s*\?\s*<FeatureMarketingDetailModal\s+open/);
  assert.match(source, /aria-disabled=\{!priceReady\}/);
  assert.match(priceHook, /FEATURE_KEY_PRICE_TABLE/);
  assert.doesNotMatch(priceHook, /fetchBillingFeatureCatalog/);
});

test("static feature cards are hydrated from the Worker registry after explicit entry", () => {
  assert.match(shell, /data-cd-price-source['"]?,['"]billing-features/);
  assert.match(shell, /가격 확인 필요/);
  assert.match(shell, /cd:feature-pricing-loaded/);
  assert.doesNotMatch(shell, /_hydrateLifeBookAiPricing/);
  assert.doesNotMatch(shell, /_featurePricingUrl\(/);
});

test("shell price labels route through shared dictionary keys instead of Korean literals", () => {
  // 정적 마크업 배지는 이미 12로케일로 번역돼 있는데(shell.tarotTile.*), 런타임이 한국어
  // 리터럴로 덮어써서 번역을 되돌리던 회귀를 막는다. _pvwTr 의 폴백 인자에 남는 한국어는 정상이다.
  assert.doesNotMatch(shell, /'전문가 상담 · '\s*\+/);
  assert.doesNotMatch(shell, /\+\s*' · 전문가 상담'/);
  assert.doesNotMatch(shell, /(?:textContent|merged\.cost|_setCtaLabel\(|\|\|)\s*=?\s*'가격 확인 (?:중|필요)'/);

  const wired = [
    ["home.nav.aiConsult", 2],
    ["preview.priceLoading", 4],
    ["preview.priceUnknown", 1],
  ];
  wired.forEach(([key, minCount]) => {
    const hits = shell.split(`_pvwTr('${key}'`).length - 1;
    assert.ok(hits >= minCount, `${key}: _pvwTr 배선이 ${hits}건 (최소 ${minCount}건이어야 한다)`);
  });

  // 배선한 키는 사전 12벌 전부에 있어야 한다. 대상 목록을 손으로 적지 않고 디스크에서 발견하며,
  // 발견된 사전이 12개 미만이면 검사 자체가 성립하지 않으므로 실패시킨다(fail-closed).
  const localeDir = path.join(root, "public/i18n");
  const localeFiles = fs.readdirSync(localeDir).filter((name) => name.endsWith(".json"));
  assert.ok(localeFiles.length >= 12, `사전 파일 ${localeFiles.length}개 — 12개 미만이면 검사가 성립하지 않는다`);
  localeFiles.forEach((file) => {
    const dict = JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8"));
    wired.forEach(([key]) => {
      const value = key.split(".").reduce((acc, seg) => (acc == null ? acc : acc[seg]), dict);
      assert.equal(typeof value, "string", `${file}: ${key} 가 없다`);
    });
  });
});
