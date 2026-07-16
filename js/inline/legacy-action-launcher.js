/**
 * Launches a legacy modal/action from /static/index.html?action=<functionName>.
 * Runs after window "load" so deferred bundles have registered globals.
 */
(function launchLegacyActionFromQuery() {
  // SignupClient.tsx 의 검증 규칙과 동일: 코드 6~24자 [A-Z0-9_-] 대문자, 토큰 24~1800자.
  function captureReferralFromQuery(params) {
    try {
      var refCode = String(params.get("ref") || params.get("referralCode") || "").trim().toUpperCase();
      if (!/^[A-Z0-9_-]{6,24}$/.test(refCode)) return;
      var refTokenRaw = String(params.get("rs") || params.get("referralShareToken") || "").trim();
      var refToken = (refTokenRaw.length >= 24 && refTokenRaw.length <= 1800) ? refTokenRaw : "";
      var refSource = String(params.get("via") || params.get("referralSource") || "").trim().toLowerCase() || "kakao_reward";
      var payload = {
        referralCode: refCode,
        referralShareToken: refToken,
        referralSource: refSource,
        capturedAt: new Date().toISOString()
      };
      try { localStorage.setItem("cd_pending_referral_v1", JSON.stringify(payload)); } catch (_) {}
      try { document.cookie = "cd_ref=" + encodeURIComponent(refCode) + "; path=/; max-age=2592000; samesite=lax"; } catch (_) {}
    } catch (_) {}
  }

  function startPolling() {
    try {
      var loc = window.location;
      if (!loc) return;
      var params = new URLSearchParams(loc.search || "");

      // 공유 링크형 유입: 홈/기능 어디로 떨어지든 리퍼럴을 승계한다.
      // (기존엔 /signup 에서만 캡처 → 홈 랜딩 시 추천 보상이 유실되던 사각지대 보강)
      // 저장 규격은 app/signup/SignupClient.tsx 의 cd_pending_referral_v1 / cd_ref 쿠키와 동일해야 한다.
      captureReferralFromQuery(params);

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
        if (action === 'gotoZiweiPremium') {
          window.location.href = '/ziwei-ai';
          return;
        }
        if (action === 'gotoAstrologyPremium') {
          window.location.href = '/astrology-ai';
          return;
        }

        var tile = document.querySelector('[data-action="' + action + '"]');
        var invoked = false;

        var isPdfModalFirstAction = (
          action === 'gotoZiweiPremium'
          || action === 'gotoAstrologyPremium'
          || action === 'gotoSukuyoPremium'
          || action === 'gotoVedicPremium'
        );

        if (!isPdfModalFirstAction && typeof window.__cdRunPerUseCoinGateFromTile === 'function' && tile) {
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
