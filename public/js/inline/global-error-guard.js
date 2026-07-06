/**
 * global-error-guard.js
 * 레거시 정적 페이지 전역 에러 안전망.
 * 미처리 예외/프로미스 거부를 잡아 콘솔에만 남던 침묵 실패 대신
 * 사용자에게 친절한 한국어 토스트를 1회성으로 안내한다.
 */
(function () {
  var lastShownAt = 0;
  var shownCount = 0;
  var THROTTLE_MS = 15000;
  var MAX_PER_PAGE = 2;

  function showFriendlyToast() {
    var now = Date.now();
    if (now - lastShownAt < THROTTLE_MS || shownCount >= MAX_PER_PAGE) return;
    lastShownAt = now;
    shownCount += 1;
    try {
      var el = document.getElementById("cdGlobalErrorToast");
      if (!el) {
        el = document.createElement("div");
        el.id = "cdGlobalErrorToast";
        el.setAttribute("role", "alert");
        el.style.cssText =
          "position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));" +
          "transform:translateX(-50%);z-index:2147483000;max-width:92vw;padding:12px 18px;" +
          "border-radius:12px;background:rgba(22,17,44,0.95);color:#f4f1ff;font-size:14px;" +
          "line-height:1.5;box-shadow:0 8px 30px rgba(0,0,0,0.35);text-align:center;";
        el.textContent = "일시적인 오류가 발생했어요. 화면이 이상하게 보이면 새로고침해 주세요.";
        (document.body || document.documentElement).appendChild(el);
      }
      el.style.display = "block";
      clearTimeout(el.__cdHideTimer);
      el.__cdHideTimer = setTimeout(function () {
        el.style.display = "none";
      }, 6000);
    } catch (e) {
      /* 안전망 자체가 죽으면 조용히 무시 */
    }
  }

  function isIgnorableReason(reason) {
    if (!reason) return true;
    var name = reason.name || "";
    if (name === "AbortError" || name === "TimeoutError") return true;
    var message = String(reason.message || reason);
    return /abort|cancell?ed/i.test(message);
  }

  window.addEventListener("error", function (event) {
    // event.error 없는 케이스(리소스 로드 실패, cross-origin "Script error.")는 제외
    if (!event || !event.error) return;
    showFriendlyToast();
  });

  window.addEventListener("unhandledrejection", function (event) {
    if (!event || isIgnorableReason(event.reason)) return;
    showFriendlyToast();
  });
})();
