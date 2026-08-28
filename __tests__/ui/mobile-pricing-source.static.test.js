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
  // 2026-08-28 제거: 호출자가 0인 채로 남아 있던 배지 갱신기(3면 grep — 정의 + sync:public 미러뿐).
  assert.doesNotMatch(shell, /_applyLifeBookAiPrice/);
});

test("shell price labels route through shared dictionary keys instead of Korean literals", () => {
  // 정적 마크업 배지는 이미 12로케일로 번역돼 있는데(shell.tarotTile.*), 런타임이 한국어
  // 리터럴로 덮어써서 번역을 되돌리던 회귀를 막는다. _pvwTr 의 폴백 인자에 남는 한국어는 정상이다.
  assert.doesNotMatch(shell, /'전문가 상담 · '\s*\+/);
  assert.doesNotMatch(shell, /\+\s*' · 전문가 상담'/);
  assert.doesNotMatch(shell, /(?:textContent|merged\.cost|_setCtaLabel\(|\|\|)\s*=?\s*'가격 확인 (?:중|필요)'/);
  // CSS ::after 로 배지 라벨을 갈아끼우면 번역도 런타임 가격 갱신도 못 먹는다(2026-08-28 제거).
  assert.doesNotMatch(shell, /content:\s*"전문가 상담 · [\d,]+원"/);
  // _setCtaMeta 는 사전 키를 거친다 — 한국어를 첫 인자로 직접 넘기지 않는다.
  assert.doesNotMatch(shell, /_setCtaMeta\(\s*'[^']*[가-힣]/);

  const wired = [
    ["home.nav.aiConsult", 1],
    ["preview.priceLoading", 4],
    ["preview.priceUnknown", 1],
    ["preview.priceDetailCheck", 1],
    ["featurePreview.cta.pricingCheckingMeta", 1],
    ["featurePreview.cta.pricingMissing", 1],
    ["featurePreview.cta.pricingFailed", 2],
  ];
  wired.forEach(([key, minCount]) => {
    const hits = shell.split(`_pvwTr('${key}'`).length - 1;
    assert.ok(hits >= minCount, `${key}: _pvwTr 배선이 ${hits}건 (최소 ${minCount}건이어야 한다)`);
  });

  // 🔴 배선한 키가 사전에 없으면 폴백으로 물러나지 않고 "번역 준비 중" 문구가 그려진다
  // (js/cd-lang-native.js 의 resolveValue → missingText). 그래서 대상 목록을 손으로 적지 않고
  // 셸에서 전수 발견해 대조한다 — 손으로 적던 시절 featurePreview.cta.pricing* 3개가
  // 12벌 어디에도 없는 채로 배선돼 비한국어 화면에서 그 문구를 그리고 있었다(2026-08-28 실측).
  // ko 는 cdTranslate 가 사전을 건너뛰고 폴백을 그대로 쓰므로 대조 대상에서 뺀다.
  const discoveredKeys = [
    ...new Set(
      [...shell.matchAll(/_pvwTr\(\s*'([A-Za-z0-9_.]+)'/g)]
        .map((match) => match[1])
        // `_pvwTr('featurePreview.cta.' + _pvwItemKey(...))` 같은 조립 키는 리터럴이 아니다.
        .filter((key) => !key.endsWith(".")),
    ),
  ];
  assert.ok(
    discoveredKeys.length >= 30,
    `셸의 _pvwTr 리터럴 키가 ${discoveredKeys.length}개 — 30개 미만이면 정규식이 깨진 것이다`,
  );

  const localeDir = path.join(root, "public/i18n");
  const localeFiles = fs.readdirSync(localeDir).filter((name) => name.endsWith(".json"));
  assert.ok(localeFiles.length >= 12, `사전 파일 ${localeFiles.length}개 — 12개 미만이면 검사가 성립하지 않는다`);
  localeFiles
    .filter((file) => file !== "ko.json")
    .forEach((file) => {
      const dict = JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8"));
      discoveredKeys.forEach((key) => {
        const value = key.split(".").reduce((acc, seg) => (acc == null ? acc : acc[seg]), dict);
        assert.equal(typeof value, "string", `${file}: ${key} 가 없다 — 화면에 "번역 준비 중" 이 뜬다`);
      });
    });
});
