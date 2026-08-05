const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
const accessStore = fs.readFileSync(path.join(root, "js/core/access-store.js"), "utf8");
const provider = fs.readFileSync(path.join(root, "app/providers/UnlockProvider.tsx"), "utf8");

test("mobile fortune cards keep every collection card available", () => {
  assert.match(shell, /MOBILE_COLLECTION_LIMIT\s*=\s*Number\.MAX_SAFE_INTEGER/);
  assert.match(shell, /\[data-mobile-collapsed-card="true"\]\{display:flex!important\}/);
  assert.match(shell, /__cdLazyCards/);
  assert.match(shell, /cd-mobile-card-placeholder/);
  assert.match(shell, /IntersectionObserver/);
  assert.match(shell, /mountVisibleCollectionCards/);
  assert.match(shell, /__cdPlaceholderTargetCount/);
  assert.match(shell, /coll\.querySelectorAll\('\.tarot-tile'\)\.length/);
});

test("mobile tarot cards preserve physical ratio and keyboard access", () => {
  const tarot = fs.readFileSync(path.join(root, "tarot-ijik.html"), "utf8");
  assert.match(tarot, /\.card-wrap\s*\{[\s\S]*?aspect-ratio:\s*15\s*\/\s*26/);
  assert.match(tarot, /\.card-face-image\s*\{[\s\S]*?object-fit:\s*contain/);
  assert.match(tarot, /role="button"\s+tabindex="0"\s+aria-pressed="false"/);
  assert.match(tarot, /onkeydown="if\(event\.key==='Enter'\|\|event\.key===' '\)/);
});

test("animal destiny layout prevents mobile horizontal drift", () => {
  const hero = fs.readFileSync(path.join(root, "app/saju/animal-destiny/components/TwelveAnimalHero.tsx"), "utf8");
  const page = fs.readFileSync(path.join(root, "app/saju/animal-destiny/components/AnimalDestinyPage.tsx"), "utf8");
  assert.match(hero, /mx-auto[\s\S]*lg:ml-auto[\s\S]*lg:mr-0/);
  assert.match(hero, /min-w-0/);
  assert.match(page, /<main[^>]*min-w-0/);
});

test("feature preview bottom sheet is not a live dialog before first open", () => {
  const templateStart = shell.indexOf('<template id="tilePvwOverlayTemplate"');
  const overlayStart = shell.indexOf('<div id="tilePvwOverlay"', templateStart);
  const templateEnd = shell.indexOf("</template>", overlayStart);
  assert.ok(templateStart >= 0);
  assert.ok(overlayStart > templateStart);
  assert.ok(templateEnd > overlayStart);
  assert.match(shell, /function _ensureMounted\(\)/);
  assert.doesNotMatch(shell, /document\.addEventListener\(['"]DOMContentLoaded['"],_init/);
});

test("unlock loading is explicit and read-only by default", () => {
  assert.doesNotMatch(accessStore, /includeBackfill=1/);
  assert.doesNotMatch(accessStore, /function scheduleRetry/);
  assert.match(accessStore, /retryScheduled:\s*false/);
  assert.doesNotMatch(provider, /reason:\s*["']provider-mount["']/);
});

test("all-fortunes entry seeds matching prices without a catalog request", () => {
  const showOverview = shell.slice(shell.indexOf("function showOverview()"), shell.indexOf("function hideOverview()"));
  assert.match(showOverview, /CodeDestinyFeaturePricingStore\.seedFromMarkup/);
  assert.doesNotMatch(showOverview, /CodeDestinyFeaturePricingStore\.load\(\)/);
  const pricingStore = fs.readFileSync(path.join(root, "js/core/feature-pricing-store.js"), "utf8");
  assert.match(pricingStore, /seedFromMarkup/);
  assert.match(pricingStore, /fetch\('\/api\/billing\/features'/);
  assert.match(pricingStore, /getOrLoad:/);
});
