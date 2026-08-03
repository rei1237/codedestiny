const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
const paidBadgeSources = [
  "app/astrology-ai/AstrologyAiClient.tsx",
  "app/love-secret-ai/LoveSecretAiClient.tsx",
  "app/components/ziwei/ZiweiAiConsultPanel.tsx",
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
