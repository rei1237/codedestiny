const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("마인드 스캔은 해당 라우트만 크롬리스로 렌더링한다", () => {
  const chrome = read("app/components/AppChrome.tsx");

  assert.ok(chrome.includes('"/tarot/mindscan"'));
  assert.ok(chrome.includes("{!hideChrome && <GlobalHeader />"));
  assert.ok(chrome.includes("{!hideChrome && <SiteFooterHub />"));
  assert.ok(chrome.includes("{!hideChrome && <DisclaimerBanner />"));
  assert.ok(chrome.includes("{!isAppShellRoute && <MobileBottomNav />"));
  assert.ok(chrome.includes("showFeatureNav"));
});

test("마인드 스캔 페이지의 기존 route client 진입점을 유지한다", () => {
  const page = read("app/tarot/mindscan/page.tsx");

  assert.ok(page.includes("MindScanTarotRouteClient"));
});
