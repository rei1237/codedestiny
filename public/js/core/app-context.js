/**
 * 앱(Android WebView / Capacitor) 런타임 판별 단일 정본.
 *
 * 🔴 왜 이 파일이 있는가 — 판별식이 6그룹으로 갈라져 있었다(docs/app-audit/DIAGNOSIS_REPORT.md §0-1).
 * 축이 서로 달라 같은 문서 안에서도 "앱이다/아니다"가 엇갈렸고, 그중 둘은 실제 사고를 냈다:
 *   - `!!window.Capacitor` 단독 폴백(바닐라 4벌): Capacitor JS 가 로드되기만 해도 true 라 과대판정.
 *   - 주입 스크립트 실행 여부 단독 의존(checkout-entry): 주입이 어긋나면 앱인데 false 가 되어
 *     /points(앱 번들에 없는 라우트)로 이동 → 빈 화면.
 * 그래서 "확실한 앱 신호"만 모아 합집합으로 판정하고, 과대판정 폴백은 여기서 영구히 배제한다.
 *
 * 판정 신호(하나라도 맞으면 앱):
 *   1) window.__CODE_DESTINY_RUNTIME_TARGET === "mobile-app"   (scripts/app-native-bridge.js 주입)
 *   2) <html data-runtime-target="mobile-app">                  (같은 브릿지)
 *   3) Capacitor.isNativePlatform() === true                    (네이티브 주입 객체)
 *   4) window.__cdAppPaymentGuard.installed === true            (앱 번들에만 주입되는 결제 가드)
 * SSR/빌드 시점에는 window 가 없으므로 NEXT_PUBLIC_RUNTIME_TARGET 만 본다(앱 번들: npm run build:mobile).
 *
 * 로딩 방식(번들러 없이 3런타임 공유 — js/core/pass-verdict.js·checkout-entry.js 와 같은 패턴):
 *   - 브라우저 classic script: `globalThis.__cdAppContext`
 *   - webpack/Node(require):   `module.exports`
 */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.__cdAppContext = api;
})(function () {
  "use strict";

  var RUNTIME_TARGET = "mobile-app";

  /**
   * 판정은 false → true 로만 바뀐다(웹 문서가 도중에 앱이 되는 일은 없다).
   * 그래서 true 는 영구 캐시하고, 아직 false 인 동안은 매번 다시 본다 —
   * 이 파일이 브릿지·Capacitor 주입보다 먼저 실행될 수 있기 때문이다.
   */
  var confirmed = false;

  function text(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function buildRuntimeTarget() {
    try {
      if (typeof process !== "undefined" && process && process.env) {
        return text(process.env.NEXT_PUBLIC_RUNTIME_TARGET);
      }
    } catch (_envError) { /* classic script 에는 process 가 없다 */ }
    return "";
  }

  function isApp() {
    if (confirmed) return true;

    if (typeof window === "undefined") {
      // SSR/프리렌더. 앱 번들 빌드에서만 true 가 되므로 하이드레이션 불일치가 생기지 않는다.
      return buildRuntimeTarget() === RUNTIME_TARGET;
    }

    try {
      if (text(window.__CODE_DESTINY_RUNTIME_TARGET) === RUNTIME_TARGET) {
        confirmed = true;
        return true;
      }
      if (typeof document !== "undefined" && document.documentElement
        && text(document.documentElement.getAttribute("data-runtime-target")) === RUNTIME_TARGET) {
        confirmed = true;
        return true;
      }
      var capacitor = window.Capacitor;
      // 🔴 `!!window.Capacitor` 로 넓히지 말 것 — 과대판정의 원인이었다.
      if (capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform() === true) {
        confirmed = true;
        return true;
      }
      if (window.__cdAppPaymentGuard && window.__cdAppPaymentGuard.installed === true) {
        confirmed = true;
        return true;
      }
    } catch (_detectError) { /* 접근 불가 환경은 웹으로 본다 */ }

    return false;
  }

  return { isApp: isApp };
});
