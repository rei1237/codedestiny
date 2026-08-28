// Mystic modals (Sukuyo / Ziwei / Astro) profile-to-render bridge
// NOTE: compute/render functions live in `js/saju-engine*.js` + `js/core/saju/reportDashboard.js` (리포트 그리드).

/**
 * 🔴 이 파일은 **두 번 실행될 수 있다.** 셸에 이 스크립트를 싣는 로더가 셋이고 dedupe 규칙이
 * 서로 다르기 때문이다(실측 2026-08-28):
 *   · 체인 `__cdLoadScriptOnce`(js/core/index-inline-runtime.js) — DOM 을 훑고 `?v=` 를 **무시**한다
 *   · `__loadScriptOnce`(js/core/uiBindings.js:118) — DOM 을 훑지만 **정확한 문자열**로 비교해
 *     `?v=` 가 붙은 체인 태그를 못 본다(무버전으로 부른다)
 *   · `cd-lazy-feature-loader`(index.html 의 `data-cd-lazy-src`) — **DOM 을 아예 안 보고**
 *     자기 맵만 본다
 * 즉 체인이 먼저 돌면 나머지 둘은 태그를 하나 더 심고, 그러면 이 파일이 다시 평가된다.
 *
 * 다시 평가되면 아래 IIFE 가 새 인스턴스를 만들어 `_subs` 가 빈 채로 갈아치워지고,
 * **열려 있던 모달의 구독이 조용히 사라진다**(예외도 안 난다 — 실측: dispatch 가 0회 전달).
 * 그래서 이미 있으면 그것을 그대로 쓴다. 로더 셋을 통일하는 것은 공유 모듈 변경이라 별건이다.
 * 가드: verify:shell-korean-calendar 검사 ⑲(같은 소스를 두 번 평가해 인스턴스와 구독을 본다).
 */
var _ModalProfileState = window._ModalProfileState || (function () {
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
    } catch (e2) {}
  }
}

function _resolveSukuyoLunarObj(profile) {
  if (!profile || !profile.birth) return Promise.resolve(null);
  var b = profile.birth;
  var l = profile.location || {};

  try {
    if (typeof KasiEngine !== 'undefined' && KasiEngine.solarToLunarFromParts) {
      var direct = KasiEngine.solarToLunarFromParts(KasiEngine.partsOf(b.year, b.month, b.day, b.hour || 12, b.minute || 0, 0));
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
  // 기본 숙요점은 API를 추가 호출하지 않고 로컬 렌더 엔진에서 canonical을 계산한다.
  return Promise.resolve(null);
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
        if (typeof renderSukuyo === 'function') renderSukuyo(null, null, null, lunarObj, null, profile);
      })
      .catch(function (e) {
        console.warn('[Sukuyo] 렌더 준비 실패:', e);
        if (typeof renderSukuyo === 'function') renderSukuyo(null, null, null, null, null, profile);
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

  function showZiweiFallback(message) {
    if (!area) return;
    area.innerHTML = ''
      + '<div style="text-align:center;padding:28px 16px;border:1px solid rgba(244,114,182,0.35);border-radius:14px;background:rgba(88,28,135,0.18)">'
      + '  <div style="font-size:1rem;color:#f9a8d4;font-family:\"Gowun Dodum\",serif;letter-spacing:0.5px">자미두수 화면을 불러오지 못했습니다.</div>'
      + '  <div style="margin-top:8px;font-size:0.82rem;color:#fbcfe8;line-height:1.6">' + String(message || '필수 스크립트 로딩 중 오류가 발생했습니다.') + '</div>'
      + '  <div style="margin-top:12px">'
      + '    <button type="button" onclick="openZiweiModal()" style="background:rgba(236,72,153,0.22);color:#fce7f3;border:1px solid rgba(244,114,182,0.55);border-radius:10px;padding:8px 12px;font-size:0.8rem;cursor:pointer">다시 시도</button>'
      + '  </div>'
      + '</div>';
  }

  setTimeout(function () {
    if (typeof renderZiwei !== 'function') {
      console.warn('[Ziwei] renderZiwei 누락, 의존성 재시도');
      if (typeof __cdEnsureBirthModalDepsLoaded === 'function') {
        __cdEnsureBirthModalDepsLoaded()
          .then(function () {
            if (typeof renderZiwei === 'function') {
              try {
                renderZiwei(null, null, 'ziweiModalSection');
              } catch (e) {
                console.warn('[Ziwei] 렌더 오류(재시도 후):', e);
                showZiweiFallback('렌더링 중 오류가 발생했습니다. 페이지 새로고침 후 다시 시도해 주세요.');
              }
            } else {
              showZiweiFallback('필수 스크립트를 불러오지 못했습니다. 브라우저 캐시를 새로고침해 주세요.');
            }
          })
          .catch(function (err) {
            console.warn('[Ziwei] 의존성 재시도 실패:', err);
            showZiweiFallback('필수 스크립트 로딩에 실패했습니다. 잠시 후 다시 시도해 주세요.');
          });
        return;
      }
      showZiweiFallback('필수 스크립트 초기화에 실패했습니다. 새로고침 후 다시 시도해 주세요.');
      return;
    }

    try {
      renderZiwei(null, null, 'ziweiModalSection');
    } catch (e) {
      console.warn('[Ziwei] 렌더 오류:', e);
      showZiweiFallback('렌더링 중 오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.');
    }
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
    var renderWithSwiss = function () {
      if (typeof renderAstroInsight === 'function') renderAstroInsight();
      _cdModalHardResetTop('astroModalOverlay', 'astroModalSheet', 'astroResult');
    };
    if (typeof window.__cdEnsureSwissEphLoaded === 'function') {
      window.__cdEnsureSwissEphLoaded()
        .then(renderWithSwiss)
        .catch(function (err) {
          if (typeof window.renderAstroSwissUnavailable === 'function') {
            window.renderAstroSwissUnavailable((err && err.message) || err || 'SwissEph loader failed.');
          }
        });
      return;
    }
    renderWithSwiss();
  }, 0);
}
