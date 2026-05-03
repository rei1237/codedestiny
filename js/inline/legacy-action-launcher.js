/**
 * Launches a legacy modal/action from /static/index.html?action=<functionName>.
 * Runs after window "load" so deferred bundles have registered globals.
 */
(function launchLegacyActionFromQuery() {
  function startPolling() {
    try {
      var loc = window.location;
      if (!loc) return;
      var params = new URLSearchParams(loc.search || "");
      var action = params.get("action");
      if (!action) return;

      var flowerRouteMap = {
        openDestinyFlowerStudio: "/flower/destiny",
        openAstrologyFlowerStudio: "/flower/astrology",
        openJamidusuFlowerStudio: "/flower/jamidusu",
        openSukuyoFlowerStudio: "/flower/sukuyo"
      };
      if (flowerRouteMap[action]) {
        window.location.href = flowerRouteMap[action];
        return;
      }

      var isOpenAction = /^open[A-Za-z0-9_]+$|^navigateToVedic$/.test(action);
      var isPremiumGotoAction = /^goto(?:Ziwei|Astrology|Sukuyo|Vedic|Naming)Premium$/.test(action);
      if (!isOpenAction && !isPremiumGotoAction) return;

      if (isPremiumGotoAction) {
        var tile = document.querySelector('[data-action="' + action + '"]');
        var invoked = false;

        if (typeof window.__cdRunPerUseCoinGateFromTile === 'function' && tile) {
          try {
            invoked = !!window.__cdRunPerUseCoinGateFromTile(tile);
          } catch (_) {}
        }

        if (!invoked && typeof window._cdInvokeActionDirect === 'function') {
          try {
            window._cdInvokeActionDirect(action, tile || null);
            invoked = true;
          } catch (_) {}
        }

        if (!invoked && tile && typeof tile.click === 'function') {
          try {
            tile.setAttribute('data-pvw-bypass', '1');
            tile.click();
            setTimeout(function() { try { tile.removeAttribute('data-pvw-bypass'); } catch (_) {} }, 160);
            invoked = true;
          } catch (_) {}
        }

        if (!invoked && action === 'gotoNamingPremium') {
          window.location.href = '/myungwun_final.html';
          return;
        }

        if (invoked) {
          history.replaceState(null, '', loc.pathname + (loc.hash || ''));
        }
        return;
      }

      var attempts = 0;
      var maxAttempts = 200;
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
        }
      }, 100);
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
