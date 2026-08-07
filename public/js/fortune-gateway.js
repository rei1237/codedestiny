(function (window, document) {
  "use strict";

  function boot() {
    // 🔴 진입점은 더 이상 스크립트에 기대지 않는다. 예전에는 홈 인라인 위젯이 준비됐다는
    //    cd:guardian-ready 를 받아야 hidden 이 풀렸는데, 그러면 그 위젯의 플래그가 꺼져 있을 때
    //    두 유료 상담으로 가는 길이 화면에서 통째로 사라진다. 이제 마크업에 그대로 렌더된다.
    //    두 카드도 실제 <a> 링크라 클릭을 가로챌 이유가 없다.

    // 옛 링크(/#guardian-fortune)는 정본 화면으로 넘긴다. /fusion-fortune 결과 화면이 아직 이 앵커를 쓴다.
    function openFromHash() {
      if (window.location.hash === "#guardian-fortune") window.location.replace("/fortune-chat");
    }
    window.addEventListener("hashchange", openFromHash);
    openFromHash();

    // 아래는 홈 인라인 위젯을 감싼 레거시 다이얼로그 배선이다. 진입점에서는 더 이상 열리지
    // 않으며 위젯과 함께 제거될 예정이다. 그때까지 각 요소를 개별로 확인해, 하나가 사라져도
    // 위의 해시 처리까지 같이 죽지 않게 한다.
    var dialog = document.getElementById("fortuneGatewayDialog");
    if (!dialog) return;
    var guardian = document.getElementById("guardianFortuneSection");
    var lastTrigger = null;

    function setView(view) {
      dialog.setAttribute("data-fortune-gateway-view", view);
      if (view !== "guardian" || !guardian) return;
      window.requestAnimationFrame(function () {
        var firstInput = guardian.querySelector("#guardianFortuneBirthDate, [data-guardian-generate]");
        if (firstInput && typeof firstInput.focus === "function") firstInput.focus();
      });
    }

    function close() {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else dialog.removeAttribute("open");
    }

    dialog.addEventListener("click", function (event) {
      var opener = event.target && event.target.closest ? event.target.closest("[data-fortune-gateway-open]") : null;
      if (opener && dialog.contains(opener)) {
        event.preventDefault();
        setView(opener.getAttribute("data-fortune-gateway-open"));
        return;
      }
      if (event.target === dialog) close();
    });

    var closeButton = dialog.querySelector("[data-fortune-gateway-close]");
    if (closeButton) closeButton.addEventListener("click", close);
    dialog.addEventListener("close", function () {
      setView("choices");
      if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
      lastTrigger = null;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window, document);
