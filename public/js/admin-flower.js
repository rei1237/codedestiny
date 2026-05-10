/* 서비스 페이지 하단 footer "꽃" 관리자 진입 버튼
   - index.html footer에 #cdAdminFlowerBtn 이 이미 직접 삽입되어 있음.
   - 이 스크립트는 버튼이 없는 경우(다국어 페이지 등)를 위한 폴백 역할만 함.
   - 화면에 "admin"이라는 텍스트를 노출하지 않음.
*/

(function () {
  function redirectToAdminLogin(event) {
    if (event) {
      try { event.preventDefault(); } catch (_) {}
      try { event.stopImmediatePropagation(); } catch (_) {}
      try { event.stopPropagation(); } catch (_) {}
    }
    try {
      window.location.assign("/admin/login");
    } catch (_) {
      window.location.href = "/admin/login";
    }
  }

  function bindDirectGate(btn) {
    if (!btn || btn.dataset.cdAdminGateBound === "1") return;
    btn.dataset.cdAdminGateBound = "1";
    // 캡처 단계에서 먼저 가로채 기존 openAdminFlowerGate 프롬프트 경로를 차단한다.
    btn.addEventListener("click", redirectToAdminLogin, true);
  }

  function injectButton() {
    const existingBtn = document.getElementById("cdAdminFlowerBtn");
    if (existingBtn) {
      bindDirectGate(existingBtn);
      return;
    }

    const footer =
      document.querySelector('footer[role="contentinfo"]') ||
      document.querySelector("footer");
    if (!footer) return;
    const btnWrap = document.createElement("div");
    btnWrap.id = "cdAdminFlowerWrap";
    btnWrap.style.cssText = "margin-top:16px;display:flex;justify-content:center;";
    const btn = document.createElement("button");
    btn.id = "cdAdminFlowerBtn";
    btn.type = "button";
    btn.setAttribute("aria-label", "꽃 버튼");
    btn.setAttribute("data-action", "openAdminFlowerGate");
    btn.style.cssText =
      "width:44px;height:44px;border:1px solid rgba(244,114,182,.18);border-radius:999px;" +
      "background:rgba(244,114,182,.04);color:rgba(255,255,255,.82);opacity:0.55;" +
      "cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" +
      "font-size:18px;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.16);" +
      "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);" +
      "transition:transform .12s ease,opacity .12s ease;";
    btn.innerHTML = "\uD83C\uDF38";
    btn.addEventListener("mouseover", function () { btn.style.opacity = "0.9"; btn.style.transform = "translateY(-1px)"; });
    btn.addEventListener("mouseout", function () { btn.style.opacity = "0.55"; btn.style.transform = "translateY(0)"; });
    bindDirectGate(btn);
    btnWrap.appendChild(btn);
    footer.appendChild(btnWrap);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { try { injectButton(); } catch (_) {} });
  } else {
    try { injectButton(); } catch (_) {}
  }
})();
