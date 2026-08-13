/**
 * GA4 계측 — 정적 셸과 Next 라우트가 함께 쓰는 단일 진입점.
 *
 * 측정 ID 정본은 런타임 전역 `window.__CD_GA_ID` 하나다. 설정 경로는 표면마다 다르다:
 *   - 정적 셸(index.html + 미러 6종): <head> 인라인 한 줄
 *   - Next 라우트(app/layout.js): process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID 를 인라인으로 주입
 * GA4 측정 ID 는 공개 식별자라 페이지 소스에 노출되어도 무방하다(모든 GA4 사이트가 그렇다).
 *
 * 🔴 ID 가 없으면 스크립트를 아예 받지 않고 cdTrack 은 no-op 이 된다. 로컬·프리뷰·ID 미설정
 *    상태에서 조용히 꺼져 있어야 하기 때문이다 — 호출부가 존재 여부를 검사하지 않아도 된다.
 *
 * 🔴 CSP 선행 조건: _headers 의 script-src/script-src-elem 에 www.googletagmanager.com,
 *    connect-src 에 google-analytics 엔드포인트가 있어야 한다. 없으면 조용히 차단된다.
 */
(function () {
  "use strict";

  var global = typeof window !== "undefined" ? window : null;
  if (!global) return;
  if (global.cdTrack) return; // 셸과 layout 양쪽에서 로드돼도 한 번만 설치한다

  function noop() {}

  var measurementId = "";
  try {
    measurementId = String(global.__CD_GA_ID || "").trim();
  } catch (_idReadError) {
    measurementId = "";
  }

  // 플레이스홀더가 그대로 배포되는 사고를 막는다 — 실제 ID 는 항상 "G-" 로 시작한다.
  if (!/^G-[A-Z0-9]+$/i.test(measurementId)) {
    global.cdTrack = noop;
    return;
  }

  global.dataLayer = global.dataLayer || [];
  function gtag() {
    global.dataLayer.push(arguments);
  }
  global.gtag = global.gtag || gtag;

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
  (document.head || document.documentElement).appendChild(script);

  gtag("js", new Date());
  gtag("config", measurementId);

  /**
   * 이벤트 전송. 실패해도 절대 던지지 않는다 — 계측이 기능을 깨뜨려선 안 된다.
   * @param {string} eventName
   * @param {Object} [params]
   */
  global.cdTrack = function cdTrack(eventName, params) {
    if (!eventName) return;
    try {
      global.gtag("event", String(eventName), params || {});
    } catch (_sendError) {
      /* 계측 실패는 무시한다 */
    }
  };
})();
