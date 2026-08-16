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
  // 로케일 경로(/ja·/zh·/zh-tw·/en)에서는 app/[locale]/layout.js 가 서버 컴포넌트
  // LocaleFooterHub 를 붙이므로 여기서 한국어 푸터를 건너뛴다. hideChrome 조건은 그대로다.
  assert.ok(chrome.includes("{!hideChrome && !isLocaleRoute && <SiteFooterHub />"));
  assert.ok(chrome.includes("{!hideChrome && <DisclaimerBanner />"));
  assert.ok(chrome.includes('"/fusion-fortune"'));
  assert.ok(chrome.includes("!isAppShellRoute && !isAuthRoute && !isImmersiveFortuneRoute && <MobileBottomNav />"));
  assert.ok(chrome.includes("showFeatureNav"));
});

test("마인드 스캔 페이지의 기존 route client 진입점을 유지한다", () => {
  const page = read("app/tarot/mindscan/page.tsx");

  assert.ok(page.includes("MindScanTarotRouteClient"));
  assert.ok(page.includes('data-mindscan-route="true"'));
});

test("정적 export 초기 HTML에서도 공통 header/footer를 숨기는 marker CSS를 유지한다", () => {
  const css = read("styles/globals.css");

  assert.ok(css.includes('body:has([data-mindscan-route="true"]) > header'));
  assert.ok(css.includes('body:has([data-mindscan-route="true"]) > footer'));
  assert.ok(css.includes("display: none !important"));
});
