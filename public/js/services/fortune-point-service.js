(function (w) {
  'use strict';

  var FORTUNE_COST_POINTS = 0;
  var consumeInFlight = false;

  function formatPointAmount(points) {
    var n = Number(points || 0);
    if (!Number.isFinite(n)) n = 0;
    if (n <= 0) return '무료';
    return n.toLocaleString('ko-KR') + 'P';
  }

  function getFortuneApiBaseUrl() {
    if (typeof window !== 'undefined') {
      if (window.CODE_DESTINY_API_BASE_URL) return String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, '');
      var custom = localStorage.getItem('fortune_api_base_url');
      if (custom) return String(custom).replace(/\/+$/, '');
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return 'http://localhost:4000';
      return location.origin;
    }
    return 'http://localhost:4000';
  }

  function getFortuneAuthToken() {
    try {
      return localStorage.getItem('fortune_auth_token') || '';
    } catch (e) {
      return '';
    }
  }

  function getStoredAuthUser() {
    try {
      var raw = localStorage.getItem('fortune_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function isGuestFortuneModeEnabled() {
    return w.__ALLOW_GUEST_FORTUNE !== false;
  }

  function updateFortunePointNotice(points) {
    var costEl = document.getElementById('fortuneCostLabel');
    if (costEl) costEl.textContent = formatPointAmount(FORTUNE_COST_POINTS);

    var currentEl = document.getElementById('fortuneCurrentPoints');
    if (!currentEl) return;

    if (typeof points === 'number' && Number.isFinite(points)) {
      currentEl.textContent = formatPointAmount(points);
      return;
    }

    var user = getStoredAuthUser();
    if (user && typeof user.points === 'number') {
      currentEl.textContent = formatPointAmount(user.points);
    } else {
      currentEl.textContent = isGuestFortuneModeEnabled() ? '비회원 무료 이용' : '로그인 후 확인';
    }
  }

  function redirectToLoginForFortune() {
    var nextPath = encodeURIComponent('/');
    w.location.href = '/login?next=' + nextPath;
  }

  function redirectToPointRecharge() {
    var nextPath = encodeURIComponent('/');
    w.location.href = '/points?next=' + nextPath;
  }

  function showFortuneConfirmModal(costPoints) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(3,7,18,.68);display:flex;align-items:center;justify-content:center;padding:18px;';

      var box = document.createElement('div');
      box.style.cssText = 'width:min(420px,92vw);border-radius:16px;border:1px solid rgba(167,139,250,.45);background:linear-gradient(160deg,rgba(30,27,75,.98),rgba(76,29,149,.96));box-shadow:0 12px 40px rgba(88,28,135,.45);padding:18px;color:#f5f3ff;';
      box.innerHTML = ''
        + '<div style="font-size:.76rem;letter-spacing:.2em;color:#c4b5fd;font-weight:700;margin-bottom:8px;">TWILIGHT POINT CHECK</div>'
        + '<div style="font-size:1rem;line-height:1.55;color:#ede9fe;margin-bottom:14px;">'
        + formatPointAmount(costPoints).replace('P', ' 포인트')
        + '가 차감됩니다. 계속하시겠습니까?'
        + '</div>'
        + '<div style="display:flex;gap:10px;">'
        + '<button id="fortunePointCancelBtn" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(221,214,254,.45);background:rgba(30,41,59,.45);color:#e2e8f0;font-weight:700;cursor:pointer;">취소</button>'
        + '<button id="fortunePointConfirmBtn" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(196,181,253,.6);background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 0 18px rgba(168,85,247,.45);">계속하기</button>'
        + '</div>';

      function close(answer) {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(answer);
      }

      box.querySelector('#fortunePointCancelBtn').onclick = function () { close(false); };
      box.querySelector('#fortunePointConfirmBtn').onclick = function () { close(true); };
      overlay.onclick = function (e) { if (e.target === overlay) close(false); };

      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  }

  async function checkFortunePointEligibility() {
    updateFortunePointNotice();
    return true;
  }

  async function consumeFortunePointAfterCalculation() {
    updateFortunePointNotice();
    return true;
  }

  w.FortunePointService = {
    getCostPoints: function () { return FORTUNE_COST_POINTS; },
    formatPointAmount: formatPointAmount,
    getFortuneApiBaseUrl: getFortuneApiBaseUrl,
    getFortuneAuthToken: getFortuneAuthToken,
    getStoredAuthUser: getStoredAuthUser,
    isGuestFortuneModeEnabled: isGuestFortuneModeEnabled,
    updateFortunePointNotice: updateFortunePointNotice,
    checkFortunePointEligibility: checkFortunePointEligibility,
    consumeFortunePointAfterCalculation: consumeFortunePointAfterCalculation,
    redirectToLoginForFortune: redirectToLoginForFortune,
    redirectToPointRecharge: redirectToPointRecharge
  };
})(window);
