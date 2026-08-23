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

      // 🔴 여기에 action -> 라우트 하드 이동 표(과거의 flowerRouteMap)를 다시 만들지 말 것.
      // 랜딩(/flower/*)의 실행 CTA 와 홈 허브가 내보내는 URL 이 /index.html?action=... 이므로,
      // 그 action 을 다시 랜딩으로 되던지면 랜딩 <-> 셸 무한 왕복이 된다(사용자에게는 "기능으로
      // 가는 듯하다가 되돌아옴"으로 보인다). 이력: ce23c945b 도입 -> 76fcc0ca5 제거(랜딩 CTA 를
      // 액션 셸로 수렴시키면서) -> ee4cb8fd2 가 되살려 루프 재발. 스튜디오 UI 는 셸에만 있으므로
      // 목적지는 셸이 맞다. 가드: __tests__/ui/action-entry-dispatch.static.test.js

      // 셸 런타임(index-inline-runtime.js 의 __cdRunRouteActionOnce)이 이미 이 action 을 잡았으면
      // 손대지 않는다. 그쪽은 타일을 거쳐 __cdRequireTileLockGate 를 태우는 반면 여기는 전역 함수를
      // 직접 부른다 — 둘 다 돌면 결제 게이트가 두 번 뜬다. 런타임은 DOMContentLoaded+0, 이 파일은
      // load+0 에 돌므로 여기서 플래그는 이미 확정돼 있다. 런타임이 죽었을 때만 폴백으로 남는다.
      if (window.__cdRouteActionHandled) return;

      // ^start 는 76fcc0ca5 가 넣고 ee4cb8fd2 가 떨궜다. 그 사이 startCrystalSoulTarot·
      // startMindScanTarot 은 셸에 타일이 없어 런타임도 못 잡고 여기도 안 잡아 완전히 죽어 있었다.
      // 셋 다(+startIjikTarot) 본문이 "인증 확인 후 페이지 이동"뿐이라 결제 게이트는 목적지가 쥔다.
      var isOpenAction = /^open[A-Za-z0-9_]+$|^start[A-Za-z0-9_]+$|^navigateToVedic$/.test(action);
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
