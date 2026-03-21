/**
 * Launches a legacy modal/action from /static/index.html?action=<functionName>.
 * Runs after window "load" so deferred bundles have registered globals.
 *
 * Many handlers (e.g. openTarotSelfEsteemModal) are defined only after lazy-loaded
 * bundles; we must load the matching script first — same URLs as
 * __cdLazyActionLoaders in public/js/core/index-inline-runtime.js.
 */
(function launchLegacyActionFromQuery() {
  /** @type {Record<string, string>} */
  var ACTION_SCRIPT_URL = {
    openKemetModal: "/js/oracle-kcg.js",
    openPsychoDreamModal: "/js/psycho-dream-analyzer-freuds-study.js",
    openTarotLoveModal: "/js/tarot-love-experience.js?v=20260320-tarot-uifix2",
    openTarotReunionModal: "/js/tarot-reunion-experience.js?v=20260320-tarot-uifix2",
    openTarotHealingModal: "/js/tarot-healing-experience.js?v=20260320-tarot-uifix2",
    openTarotSelfEsteemModal: "/js/tarot-self-esteem-experience.js?v=20260320-tarot-uifix2",
    openTarotYearFortuneModal: "/js/tarot-year-fortune-experience.js?v=20260320-tarot-uifix2",
  };

  /** Multi-file actions (order matters) — mirrors js/core/uiBindings __lazyActionLoaders */
  var ACTION_SCRIPT_CHAINS = {
    openDreamModal: ["/js/dream-meaning-library.js", "/lib/ai-engine.js", "/js/dream-ledger.js"],
    openJuyukModal: ["/js/iching-engine.js", "/js/iching-modal.js?v=20260321-sukuyo-scroll2"],
  };

  function loadScriptOnce(src) {
    return new Promise(function (resolve, reject) {
      var norm = String(src || "").trim();
      if (!norm) {
        reject(new Error("missing src"));
        return;
      }
      var fileName = norm.split("?")[0].split("/").pop();
      var all = document.querySelectorAll("script[src]");
      for (var i = 0; i < all.length; i += 1) {
        var cur = all[i].getAttribute("src") || "";
        var curBase = cur.split("?")[0];
        if (cur === norm || curBase === norm.split("?")[0] || (fileName && curBase.indexOf("/" + fileName) !== -1)) {
          if (all[i].dataset.loaded === "1" || all[i].readyState === "complete" || all[i].readyState === "loaded") {
            resolve();
            return;
          }
          all[i].addEventListener("load", function () {
            resolve();
          }, { once: true });
          all[i].addEventListener(
            "error",
            function () {
              reject(new Error("load failed"));
            },
            { once: true },
          );
          return;
        }
      }
      var s = document.createElement("script");
      s.src = norm;
      s.defer = true;
      s.async = true;
      s.onload = function () {
        s.dataset.loaded = "1";
        resolve();
      };
      s.onerror = function () {
        reject(new Error("load failed: " + norm));
      };
      document.head.appendChild(s);
    });
  }

  function startPolling() {
    try {
      var loc = window.location;
      if (!loc) return;
      var params = new URLSearchParams(loc.search || "");
      var action = params.get("action");
      if (!action) return;

      if (!/^open[A-Za-z0-9_]+$|^navigateToVedic$/.test(action)) return;

      var attempts = 0;
      var maxAttempts = 200;
      var scriptUrl = ACTION_SCRIPT_URL[action];

      function runWhenReady() {
        var timer = setInterval(function () {
          attempts += 1;
          var fn = window[action];
          if (typeof fn === "function") {
            clearInterval(timer);
            try {
              fn();
              history.replaceState(null, "", loc.pathname + (loc.hash || ""));
            } catch (err) {
              console.error("[legacy-action-launcher] action failed:", action, err);
            }
            return;
          }
          if (attempts >= maxAttempts) {
            clearInterval(timer);
            console.warn("[legacy-action-launcher] timed out waiting for:", action);
          }
        }, 100);
      }

      var chain = ACTION_SCRIPT_CHAINS[action];
      function loadScriptChain(urls) {
        return urls.reduce(function (p, src) {
          return p.then(function () {
            return loadScriptOnce(src);
          });
        }, Promise.resolve());
      }

      if (chain && chain.length) {
        loadScriptChain(chain)
          .then(runWhenReady)
          .catch(function (err) {
            console.error("[legacy-action-launcher] script chain load failed:", action, err);
          });
      } else if (scriptUrl) {
        loadScriptOnce(scriptUrl)
          .then(runWhenReady)
          .catch(function (err) {
            console.error("[legacy-action-launcher] script load failed:", action, err);
          });
      } else {
        runWhenReady();
      }
    } catch (e) {
      // no-op
    }
  }

  if (document.readyState === "complete") {
    setTimeout(startPolling, 0);
  } else {
    window.addEventListener("load", function () {
      setTimeout(startPolling, 0);
    });
  }
})();
