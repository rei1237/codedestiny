/**
 * GA4 계측 — 정적 셸과 Next 라우트가 함께 쓰는 단일 진입점.
 *
 * 측정 ID 정본은 아래 DEFAULT_MEASUREMENT_ID 상수 하나다. 셸과 Next 라우트가 이 파일을
 * 함께 로드하므로 여기만 고치면 두 표면이 같은 속성에 쏜다. 표면별로 값을 나눠 두면
 * 한쪽만 갱신됐을 때 조용히 갈라지므로 그렇게 하지 말 것.
 * GA4 측정 ID 는 공개 식별자라 페이지 소스에 노출되어도 무방하다(모든 GA4 사이트가 그렇다).
 *
 * 오버라이드가 필요하면(스테이징 속성 분리 등) window.__CD_GA_ID 를 이 스크립트보다 먼저
 * 설정한다 — 정적 셸은 <head> 인라인, Next 는 NEXT_PUBLIC_GA_MEASUREMENT_ID 경유.
 *
 * 🔴 ID 형식이 깨지면 스크립트를 아예 받지 않고 cdTrack 은 no-op 이 된다 —
 *    호출부가 존재 여부를 검사하지 않아도 되게 하기 위해서다.
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

  // 🔴 측정 ID 정본은 이 상수 하나다. GA4 측정 ID 는 공개 식별자라 레포에 두는 것이 맞고
  // (naver-site-verification·AdSense pub ID 와 같은 취급), 표면별로 값이 갈리면 셸과 React
  // 라우트가 서로 다른 속성에 쏘게 되므로 여기서만 정의한다.
  var DEFAULT_MEASUREMENT_ID = "G-FMHV4ZHY3G";

  var measurementId = "";
  try {
    // window.__CD_GA_ID 는 오버라이드 훅이다(스테이징 속성 분리 등). 비어 있으면 정본을 쓴다.
    measurementId = String(global.__CD_GA_ID || "").trim() || DEFAULT_MEASUREMENT_ID;
  } catch (_idReadError) {
    measurementId = DEFAULT_MEASUREMENT_ID;
  }

  // 형식이 깨진 오버라이드가 배포되는 사고를 막는다 — 실제 ID 는 항상 "G-" 로 시작한다.
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
