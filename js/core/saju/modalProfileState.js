// Mystic modals (Sukuyo / Ziwei / Astro) profile-to-render bridge
// NOTE: compute/render functions live in `js/saju-engine*.js` + `js/core/saju/reportDashboard.js` (리포트 그리드).

var _ModalProfileState = (function () {
  var _subs = {};

  function _syncGlobals(profile) {
    var b = profile.birth,
      l = profile.location || {};
    var corrH = b.hour != null ? b.hour : 12;
    var corrM = b.minute != null ? b.minute : 0;

    try {
      if (window.DestinyProfileManager && window.DestinyProfileManager.calcTrueSolarOffset) {
        var lng = l.lng != null ? l.lng : 127.0;
        var tz = l.tzOffset != null ? l.tzOffset : 9;
        var offMin = window.DestinyProfileManager.calcTrueSolarOffset(lng, tz);
        var total = ((corrH * 60 + corrM - offMin) % 1440 + 1440) % 1440;
        corrH = Math.floor(total / 60);
        corrM = total % 60;
      }
    } catch (e) {}

    window._ziweiBirth = {
      year: b.year,
      month: b.month,
      day: b.day,
      hour: corrH,
      minute: corrM,
      lat: l.lat != null ? l.lat : 37.6,
      lon: l.lng != null ? l.lng : 127.0,
      tz: l.tzOffset != null ? l.tzOffset : 9
    };

    if (typeof setGender === 'function') {
      try {
        setGender(profile.gender || 'F');
      } catch (e2) {}
    }
    if (typeof GENDER !== 'undefined') {
      try {
        GENDER = profile.gender || 'F';
      } catch (e3) {}
    }

    var computeFn =
      window.sajuService && typeof window.sajuService.computeProfileForModal === 'function'
        ? window.sajuService.computeProfileForModal
        : window.computeProfileForModal;
    if (typeof computeFn === 'function') {
      try {
        computeFn(profile);
      } catch (e4) {
        console.warn('[ModalProfileState] computeProfileForModal 실패 — _ziweiBirth 직접 주입으로 대체:', e4);
      }
    }
  }

  return {
    subscribe: function (type, fn) {
      _subs[type] = fn;
    },
    unsubscribe: function (type) {
      delete _subs[type];
    },
    dispatch: function (profile, targetType) {
      if (!profile || !profile.birth) return;
      _syncGlobals(profile);
      var types = targetType ? [targetType] : Object.keys(_subs);
      types.forEach(function (t) {
        if (_subs[t]) {
          try {
            _subs[t](profile);
          } catch (e) {
            console.error('[ModalProfileState] 렌더 오류 (' + t + '):', e);
          }
        }
      });
    }
  };
})();

function _renderSukuyoSection(profile) {
  var card = document.getElementById('sukuyoCard');
  var noP = document.getElementById('sukuyoNoProfile');
  var area = document.getElementById('sukuyoSection');
  var sheet = document.getElementById('sukuyoModalSheet');
  if (!area || !card) return;
  if (noP) noP.style.display = 'none';
  card.style.display = 'block';
  area.innerHTML =
    '<div style="text-align:center;padding:50px 20px;color:#a78bfa;font-family:\"Gowun Dodum\",serif;letter-spacing:1px;animation:syPulse 1.5s infinite;">✦ 운명의 별을 계산하는 중...</div>';
  if (sheet) sheet.scrollTop = 0;
  var b = profile.birth;
  var lunarObj = null;
  try {
    var currentCtx = null;
    if (window.KasiCalendarService && typeof window.KasiCalendarService.getCurrentContext === 'function') {
      currentCtx = window.KasiCalendarService.getCurrentContext();
    }
    if (currentCtx && currentCtx.lunar && currentCtx.lunar.year && currentCtx.lunar.month && currentCtx.lunar.day) {
      lunarObj = {
        year: currentCtx.lunar.year,
        month: currentCtx.lunar.month,
        day: currentCtx.lunar.day,
        isLeap: !!currentCtx.lunar.isLeap
      };
    } else if (typeof KasiEngine !== 'undefined' && KasiEngine.solarToLunar) {
      lunarObj = KasiEngine.solarToLunar(new Date(b.year, b.month - 1, b.day, b.hour || 12, b.minute || 0));
    }
  } catch (e) {
    console.warn('[Sukuyo] lunarObj 계산 오류:', e);
  }
  setTimeout(function () {
    if (typeof renderSukuyo === 'function') renderSukuyo(null, null, null, lunarObj);
  }, 0);
}

function _ensureZiweiEngineReady() {
  if (typeof window.calcZiweiPalaces === 'function') {
    return Promise.resolve(true);
  }

  return new Promise(function (resolve) {
    var existing = document.querySelector('script[data-ziwei-engine="1"]');
    if (existing) {
      existing.addEventListener('load', function () {
        resolve(typeof window.calcZiweiPalaces === 'function');
      }, { once: true });
      existing.addEventListener('error', function () {
        resolve(false);
      }, { once: true });
      return;
    }

    var s = document.createElement('script');
    s.src = '/js/engines/ziwei-doushu.js?v=20260322-ziwei-hotfix2';
    s.defer = true;
    s.dataset.ziweiEngine = '1';
    s.onload = function () {
      resolve(typeof window.calcZiweiPalaces === 'function');
    };
    s.onerror = function () {
      resolve(false);
    };
    document.head.appendChild(s);
  });
}

function _renderZiweiSection() {
  var card = document.getElementById('ziweiModalCard');
  var noP = document.getElementById('ziweiNoProfile');
  var area = document.getElementById('ziweiModalSection');
  var sheet = document.getElementById('ziweiModalSheet');
  if (!area || !card) return;
  if (noP) noP.style.display = 'none';
  card.style.display = 'block';
  area.innerHTML =
    '<div style="text-align:center;padding:50px 20px;color:#e879f9;font-family:\"Gowun Dodum\",serif;letter-spacing:1px;">✦ 자미두수 명반을 계산하는 중...</div>';
  if (sheet) sheet.scrollTop = 0;
  setTimeout(function () {
    _ensureZiweiEngineReady().then(function (ok) {
      if (!ok) {
        area.innerHTML =
          '<div style="text-align:center;padding:42px 20px;color:#fda4af;font-family:\"Gowun Dodum\",serif;line-height:1.7;">자미두수 엔진 로드에 실패했습니다.<br>잠시 후 다시 시도해 주세요.</div>';
        return;
      }

      if (typeof renderZiwei !== 'function') {
        area.innerHTML =
          '<div style="text-align:center;padding:42px 20px;color:#fda4af;font-family:\"Gowun Dodum\",serif;line-height:1.7;">자미두수 렌더러를 찾지 못했습니다.<br>페이지를 새로고침 후 다시 시도해 주세요.</div>';
        return;
      }

      try {
        renderZiwei(null, null, 'ziweiModalSection');
      } catch (e) {
        console.warn('[Ziwei] 렌더 오류:', e);
        area.innerHTML =
          '<div style="text-align:center;padding:42px 20px;color:#fda4af;font-family:\"Gowun Dodum\",serif;line-height:1.7;">자미두수 계산 중 오류가 발생했습니다.<br>입력 정보를 확인 후 다시 시도해 주세요.</div>';
      }
    });
  }, 0);
}

function _renderAstroSection() {
  var wrap = document.getElementById('astroCardWrap');
  var noP = document.getElementById('astroNoProfile');
  var area = document.getElementById('astroResult');
  var sheet = document.getElementById('astroModalSheet');
  if (!area || !wrap) return;
  if (noP) noP.style.display = 'none';
  wrap.style.display = 'block';
  area.innerHTML =
    '<div style="text-align:center;padding:50px 20px;color:#d1c4e9;font-family:\"Gowun Dodum\",serif;letter-spacing:1px;">✦ 코즈믹 차트를 계산하는 중...</div>';
  if (sheet) sheet.scrollTop = 0;
  setTimeout(function () {
    if (typeof renderAstroInsight === 'function') renderAstroInsight();
  }, 0);
}

