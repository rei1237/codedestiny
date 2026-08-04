(function (window, document) {
  "use strict";

  function boot() {
    var entry = document.getElementById("fortuneGatewayEntry");
    var dialog = document.getElementById("fortuneGatewayDialog");
    var guardian = document.getElementById("guardianFortuneSection");
    if (!entry || !dialog || !guardian) return;

    var lastTrigger = null;
    var closeButton = dialog.querySelector("[data-fortune-gateway-close]");
    var choicesButton = dialog.querySelector("[data-fortune-gateway-open=\"choices\"]");

    function setView(view) {
      dialog.setAttribute("data-fortune-gateway-view", view);
      if (view !== "guardian") return;
      window.requestAnimationFrame(function () {
        var firstInput = guardian.querySelector("#guardianFortuneBirthDate, [data-guardian-generate]");
        if (firstInput && typeof firstInput.focus === "function") firstInput.focus();
      });
    }

    function open(view, trigger) {
      lastTrigger = trigger || document.activeElement;
      setView(view || "choices");
      if (!dialog.open && typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }

    function close() {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else dialog.removeAttribute("open");
    }

    function revealEntry() {
      entry.hidden = false;
    }

    entry.addEventListener("click", function (event) {
      var opener = event.target && event.target.closest ? event.target.closest("[data-fortune-gateway-open]") : null;
      if (!opener || !entry.contains(opener)) return;
      event.preventDefault();
      open(opener.getAttribute("data-fortune-gateway-open"), opener);
    });

    dialog.addEventListener("click", function (event) {
      var opener = event.target && event.target.closest ? event.target.closest("[data-fortune-gateway-open]") : null;
      if (opener && dialog.contains(opener)) {
        event.preventDefault();
        setView(opener.getAttribute("data-fortune-gateway-open"));
        return;
      }
      if (event.target === dialog) close();
    });

    if (closeButton) closeButton.addEventListener("click", close);
    if (choicesButton) choicesButton.addEventListener("click", function () { setView("choices"); });
    dialog.addEventListener("close", function () {
      setView("choices");
      if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
      lastTrigger = null;
    });

    document.addEventListener("cd:guardian-ready", revealEntry);
    if (guardian.getAttribute("data-guardian-chat-journey") === "true") revealEntry();

    function openFromHash() {
      if (window.location.hash === "#guardian-fortune") open("guardian", entry);
    }
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window, document);
