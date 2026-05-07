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

function _cdModalHardResetTop(overlayId, sheetId, anchorId) {
  if (typeof window.__cdScrollModalTop === 'function') {
    window.__cdScrollModalTop(overlayId, sheetId, anchorId);
    return;
  }
  var sheet = sheetId ? document.getElementById(sheetId) : null;
  var anchor = anchorId ? document.getElementById(anchorId) : null;
  if (sheet) {
    try { sheet.scrollTop = 0; } catch (e) {}
  }
  if (anchor) {
    try {
      anchor.scrollTop = 0;
      if (typeof anchor.scrollIntoView === 'function') {
        anchor.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
      }
    } catch (e2) {}
  }
}

function _resolveSukuyoLunarObj(profile) {
  if (!profile || !profile.birth) return Promise.resolve(null);
  var b = profile.birth;
  var l = profile.location || {};

  try {
    if (typeof KasiEngine !== 'undefined' && KasiEngine.solarToLunar) {
      var direct = KasiEngine.solarToLunar(new Date(b.year, b.month - 1, b.day, b.hour || 12, b.minute || 0));
      if (direct && direct.year && direct.month && direct.day) {
        return Promise.resolve(direct);
      }
    }
  } catch (e) {
    console.warn('[Sukuyo] KasiEngine.solarToLunar 오류:', e);
  }

  if (typeof resolvePrimaryCalendarContext === 'function') {
    return resolvePrimaryCalendarContext({
      calendarType: b.calType || 'solar',
      year: b.year,
      month: b.month,
      day: b.day,
      hour: b.hour != null ? b.hour : 12,
      minute: b.minute != null ? b.minute : 0,
      second: 0,
      latitude: l.lat != null ? l.lat : 37.5665,
      longitude: l.lng != null ? l.lng : 126.978,
      tzOffsetHours: l.tzOffset != null ? l.tzOffset : 9
    }, { setCurrent: false, localOnly: false })
      .then(function (ctx) {
        if (ctx && ctx.lunar && ctx.lunar.year && ctx.lunar.month && ctx.lunar.day) {
          return {
            year: ctx.lunar.year,
            month: ctx.lunar.month,
            day: ctx.lunar.day,
            isLeap: !!ctx.lunar.isLeap
          };
        }
        return null;
      })
      .catch(function (e) {
        console.warn('[Sukuyo] resolvePrimaryCalendarContext fallback 실패:', e);
        return null;
      });
  }

  return Promise.resolve(null);
}

function _fetchSukuyoBasicCanonical(profile) {
  if (!profile || !profile.birth || typeof fetch !== 'function') return Promise.resolve(null);
  var b = profile.birth;
  var l = profile.location || {};

  return fetch('/api/sukuyo-basic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: profile.name || '사용자',
      gender: profile.gender || 'OTHER',
      birth: {
        year: Number(b.year),
        month: Number(b.month),
        day: Number(b.day),
        hour: b.hour != null ? Number(b.hour) : 12,
        minute: b.minute != null ? Number(b.minute) : 0
      },
      location: {
        lat: l.lat != null ? Number(l.lat) : 37.5665,
        lon: l.lng != null ? Number(l.lng) : 126.978,
        timezone: l.tzOffset != null ? Number(l.tzOffset) : 9
      }
    })
  })
    .then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok || !data || !data.ok || !data.canonical) return null;
        return data;
      });
    })
    .catch(function (e) {
      console.warn('[Sukuyo] 기본 canonical 조회 실패:', e);
      return null;
    });
}

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
  _cdModalHardResetTop('sukuyoModalOverlay', 'sukuyoModalSheet', 'sukuyoSection');
  setTimeout(function () {
    _resolveSukuyoLunarObj(profile)
      .then(function (lunarObj) {
        return _fetchSukuyoBasicCanonical(profile)
          .then(function (canonicalPayload) {
            if (typeof renderSukuyo === 'function') renderSukuyo(null, null, null, lunarObj, canonicalPayload);
          });
      })
      .catch(function (e) {
        console.warn('[Sukuyo] 렌더 준비 실패:', e);
        if (typeof renderSukuyo === 'function') renderSukuyo(null, null, null, null);
      })
      .finally(function () {
        _cdModalHardResetTop('sukuyoModalOverlay', 'sukuyoModalSheet', 'sukuyoSection');
      });
  }, 0);
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
  _cdModalHardResetTop('ziweiModalOverlay', 'ziweiModalSheet', 'ziweiModalSection');
  setTimeout(function () {
    if (typeof renderZiwei === 'function') {
      try {
        renderZiwei(null, null, 'ziweiModalSection');
      } catch (e) {
        console.warn('[Ziwei] 렌더 오류:', e);
      }
    }
    _cdModalHardResetTop('ziweiModalOverlay', 'ziweiModalSheet', 'ziweiModalSection');
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
  _cdModalHardResetTop('astroModalOverlay', 'astroModalSheet', 'astroResult');
  setTimeout(function () {
    if (typeof renderAstroInsight === 'function') renderAstroInsight();
    _cdModalHardResetTop('astroModalOverlay', 'astroModalSheet', 'astroResult');
  }, 0);
}

