const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "app/layout.js"), "utf8");

test("root layout does not globally preload route-specific Maya or display font assets", () => {
  assert.doesNotMatch(source, /rel="preload"[^>]+as="image"[^>]+%EB%A7%88%EC%95%BC%EC%A0%90/);
  assert.doesNotMatch(source, /rel="preload"[^>]+as="font"[^>]+Mulmaru\.woff2/);
});

// 🔴 정적 셸 홈("/")으로의 이동은 언제나 문서 로드다(handleTabClick + ShellHomeHardNavGuard).
// next/link 의 prefetch 만 살려 두면 "/" 의 RSC 페이로드(/index.txt)를 받아 그 Float 힌트로
// 홈 전용 CSS 청크를 preload 하는데, 그 CSS 는 끝내 쓰이지 않는다 — 하단 네비가 붙는 모든
// 페이지에서 "preloaded but not used" 경고와 함께 헛다운로드가 발생했다.
test("mobile bottom nav does not prefetch the static shell home", () => {
  const nav = fs.readFileSync(path.join(root, "app/components/MobileBottomNav.tsx"), "utf8");
  assert.match(nav, /prefetch=\{targetsStaticShellHome\(tab\.href\) \? false : undefined\}/);
});

test("CSS retry runs only from actual resource errors", () => {
  assert.match(source, /window\.addEventListener/);
  assert.match(source, /retryCss/);
  assert.doesNotMatch(source, /function sweep\(/);
  assert.doesNotMatch(source, /window\.addEventListener.*load/);
  assert.doesNotMatch(source, /document\.readyState/);
});
