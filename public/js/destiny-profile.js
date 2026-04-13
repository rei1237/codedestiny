/* ═══════════════════════════════════════════════════════════════
   Destiny Profile Manager  ·  v1.0
   Deep Space & Sacred Gold — 생년월일 & 장소 기반 시차 보정 프로필
   Namespace: FORTUNE_APP_USER_PROFILES
   CustomEvent: 'destinyProfileChanged' → 사주 엔진 자동 연동
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ── 스토리지 키 ── */
  var NS       = 'FORTUNE_APP_USER_PROFILES';
  var KEY_LIST = NS + '.list';
  var KEY_CURR = NS + '.current';

  /* ──────────────────────────────────────────
     1. Storage Module
  ────────────────────────────────────────── */
  var DPStorage = {
    list: function() {
      try { return JSON.parse(localStorage.getItem(KEY_LIST) || '[]'); }
      catch(e) { return []; }
    },
    save: function(profiles) {
      try { localStorage.setItem(KEY_LIST, JSON.stringify(profiles)); }
      catch(e) {}
    },
    current: function() {
      try {
        var id = localStorage.getItem(KEY_CURR);
        if (!id) return null;
        return DPStorage.list().find(function(p) { return p.id === id; }) || null;
      } catch(e) { return null; }
    },
    setCurrent: function(id) {
      try { localStorage.setItem(KEY_CURR, id); } catch(e) {}
    },
    add: function(profile) {
      var list = DPStorage.list();
      profile.id = 'dp_' + Date.now();
      profile.createdAt = new Date().toISOString();
      if (list.length === 0) DPStorage.setCurrent(profile.id);
      list.push(profile);
      DPStorage.save(list);
      return profile;
    },
    remove: function(id) {
      var list = DPStorage.list().filter(function(p) { return p.id !== id; });
      DPStorage.save(list);
      if (localStorage.getItem(KEY_CURR) === id) {
        DPStorage.setCurrent(list.length ? list[0].id : '');
      }
    },
    update: function(id, patch) {
      var list = DPStorage.list().map(function(p) {
        return p.id === id ? Object.assign({}, p, patch) : p;
      });
      DPStorage.save(list);
    }
  };

  function _isMobileViewport() {
    try {
      return window.matchMedia('(max-width: 900px)').matches;
    } catch (e) {
      return false;
    }
  }

  /* lockBody 호출 여부 추적 — mobile 에서 unlockBody 불필요 호출 방지 */
  var _bodyLocked = false;

  /* ── 프로필 카드 운세 선택 모달: 코인 잠금 설정 ──
     기본 차트(자미두수·숙요점·베다점·점성술)는 무료 개방.
     심화/궁합 기능은 _cdCoinGatePerUse(50, ...) 로 1회 50코인 차감. ── */
  var _DP_FEATURE_LOCKS = {
    olympus: { key: 'olympus-fc', cost: 100, name: '올림푸스 신탁' },
    flower:  { key: 'flower-fc',  cost: 200, name: '운명의 꽃 4종 세트', extraUnlockKeys: ['flower-destiny', 'flower-astro', 'flower-ziwei', 'flower-sukuyo'] },
  };

  function _dpIsFeatureLocked(lockKey) {
    try {
      var saved = localStorage.getItem('cd_tile_locks');
      if (!saved) return true;
      var parsed = JSON.parse(saved);
      return !(parsed && parsed[lockKey]);
    } catch (e) {}
    return true;
  }

  function _dpSaveFeatureUnlock(lockKey) {
    try {
      var saved = localStorage.getItem('cd_tile_locks');
      var parsed = (saved && JSON.parse(saved)) || {};
      parsed[lockKey] = true;
      localStorage.setItem('cd_tile_locks', JSON.stringify(parsed));
    } catch (e) {}
  }

  function _cdShowCoinDeductNotice(cost, balance, reason) {
    try {
      var amount = Number(cost) || 0;
      var remain = Number(balance);
      var detail = reason ? String(reason) : '유료 서비스';
      var root = document.getElementById('cd-coin-notice-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'cd-coin-notice-root';
        root.style.position = 'fixed';
        root.style.top = '74px';
        root.style.right = '16px';
        root.style.zIndex = '99999';
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.gap = '10px';
        root.style.pointerEvents = 'none';
        document.body.appendChild(root);
      }

      var item = document.createElement('div');
      item.style.minWidth = '280px';
      item.style.maxWidth = '390px';
      item.style.borderRadius = '16px';
      item.style.border = '1px solid rgba(251,191,36,0.34)';
      item.style.background = 'linear-gradient(135deg, rgba(51,24,90,0.96), rgba(24,44,92,0.96))';
      item.style.boxShadow = '0 22px 46px rgba(10,10,30,0.45)';
      item.style.color = '#fef3c7';
      item.style.padding = '12px 14px';
      item.style.fontSize = '13px';
      item.style.lineHeight = '1.5';
      item.style.opacity = '0';
      item.style.transform = 'translateY(-8px) scale(0.97)';
      item.style.transition = 'opacity 220ms ease, transform 220ms ease';
      item.style.pointerEvents = 'auto';
      item.innerHTML = '<strong style="display:block;font-size:12px;letter-spacing:.08em;color:#fde68a;">COIN NOTICE</strong>'
        + '<span>🪙 ' + detail + ' 이용으로 <strong>' + amount.toLocaleString('ko-KR') + '코인</strong>이 차감되었습니다.</span>'
        + '<span style="display:block;color:rgba(255,255,255,0.86);margin-top:2px;">남은 코인: ' + (isFinite(remain) ? remain.toLocaleString('ko-KR') : '-') + '</span>';

      root.appendChild(item);
      requestAnimationFrame(function() {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0) scale(1)';
      });

      setTimeout(function() {
        item.style.opacity = '0';
        item.style.transform = 'translateY(-6px) scale(0.98)';
        setTimeout(function() {
          if (item.parentNode) item.parentNode.removeChild(item);
        }, 240);
      }, 3400);
    } catch (_) {}
  }

  /**
   * 1회 코인 차감 게이트 — 영구 해금 없이 사용할 때마다 cost 코인 차감.
   * @param {number} cost   차감 코인 수
   * @param {string} reason 기능명 (알림 문구용)
   * @param {Function} cb   성공 시 호출할 콜백
   */
  window._cdCoinGatePerUse = function(cost, reason, cb, onCancel) {
    // 중복 실행 방지: 이전 fetch가 진행 중이면 차단
    if (window._cdCoinGatePerUseInFlight) {
      window.alert('이전 결제 처리 중입니다. 잠시 후 다시 시도해 주세요.');
      if (typeof onCancel === 'function') onCancel();
      return;
    }
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
    if (!token) {
      if (window.confirm('🔒 로그인이 필요한 서비스입니다.\n로그인 후 이용해 주세요.')) window.location.href = '/login?next=%2F';
      if (typeof onCancel === 'function') onCancel();
      return;
    }
    var balance = 0;
    try { var _u2 = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null'); balance = Number(_u2 && _u2.points) || 0; } catch(_) {}
    if (balance < cost) {
      if (typeof onCancel === 'function') onCancel();
      if (typeof window.__cdOpenChargeModal === 'function') {
        window.alert('🪙 ' + reason + '\n\n이 기능은 이용할 때마다 ' + cost + '코인이 필요합니다.\n현재 보유: ' + Number(balance).toLocaleString('ko-KR') + '코인\n\n코인 충전 창을 열겠습니다.');
        window.__cdOpenChargeModal();
      } else if (window.confirm('🪙 ' + reason + '\n\n' + cost + '코인이 필요합니다.\n현재 보유: ' + Number(balance).toLocaleString('ko-KR') + '코인\n\n충전 페이지로 이동하시겠습니까?')) {
        window.location.href = '/points';
      }
      return;
    }
    if (!window.confirm('🪙 ' + reason + '\n\n이용할 때마다 ' + cost + '코인이 차감됩니다.\n현재 보유: ' + Number(balance).toLocaleString('ko-KR') + '코인\n\n진행하시겠습니까?')) {
      if (typeof onCancel === 'function') onCancel();
      return;
    }
    window._cdCoinGatePerUseInFlight = true;
    fetch('/api/fortune/pig-coin/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ cost: cost, reason: reason })
    })
    .then(function(r) { return r.json().then(function(d) { return { status: r.status, ok: r.ok, data: d }; }); })
    .then(function(res) {
      window._cdCoinGatePerUseInFlight = false;
      if (res.status === 402 || !res.ok) {
        var msg = (res.data && res.data.message) || '코인 차감에 실패했습니다.';
        if (typeof window.__cdOpenChargeModal === 'function') { window.alert(msg); window.__cdOpenChargeModal(); }
        else if (window.confirm(msg + '\n충전 페이지로 이동하시겠습니까?')) window.location.href = '/points';
        if (typeof onCancel === 'function') onCancel();
        return;
      }
      var nb = (res.data && res.data.user && typeof res.data.user.points === 'number') ? res.data.user.points : Math.max(0, balance - cost);
      try { var _u3 = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null') || {}; _u3.points = nb; localStorage.setItem('fortune_auth_user', JSON.stringify(_u3)); } catch(_) {}
      if (typeof window.__cdSetGoldenBalance === 'function') window.__cdSetGoldenBalance(nb);
      _cdShowCoinDeductNotice(cost, nb, reason);
      cb();
    })
    .catch(function(e) { window._cdCoinGatePerUseInFlight = false; console.error('[coin-gate-per-use]', e); window.alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'); if (typeof onCancel === 'function') onCancel(); });
  };

  function _dpGetAuthToken() {
    try { return localStorage.getItem('fortune_auth_token') || ''; } catch (e) { return ''; }
  }

  function _dpGetUserBalance() {
    try {
      var raw = localStorage.getItem('fortune_auth_user');
      if (!raw) return 0;
      var u = JSON.parse(raw);
      return Number(u && u.points) || 0;
    } catch (e) { return 0; }
  }

  function _dpSaveUserBalance(newBalance) {
    try {
      var raw = localStorage.getItem('fortune_auth_user');
      var u = (raw && JSON.parse(raw)) || {};
      u.points = Number(newBalance);
      localStorage.setItem('fortune_auth_user', JSON.stringify(u));
    } catch (e) {}
  }
  function _dpGetUserPlan() {
    try {
      var raw = localStorage.getItem('fortune_auth_user');
      var u = raw && JSON.parse(raw);
      return (u && u.plan) ? String(u.plan) : '';
    } catch (e) { return ''; }
  }

  /**
   * 프로필 카드 모달 코인 잠금 게이트
   * 이미 해금됐거나 관리자/프리미엄이면 cb() 즉시 호출,
   * 아닌 경우 코인 확인 → 차감 API → 영구 해금 저장 → cb()
   */
  function _dpGateLockFeature(type, cb) {
    var info = _DP_FEATURE_LOCKS[type];
    if (!info) { cb(); return; }
    if (!_dpIsFeatureLocked(info.key)) { cb(); return; }

    var token = _dpGetAuthToken();
    if (!token) {
      if (window.confirm('🔒 로그인이 필요한 서비스입니다.\n로그인 후 이용해 주세요.')) {
        window.location.href = '/login?next=%2F';
      }
      return;
    }

    var balance = _dpGetUserBalance();
    if (balance < info.cost) {
      if (typeof window.__cdOpenChargeModal === 'function') {
        window.alert(
          '🔒 ' + info.name + '\n\n' +
          '이 기능은 영구 해금 ' + info.cost + '코인이 필요합니다.\n' +
          '현재 보유: ' + Number(balance).toLocaleString('ko-KR') + '코인\n\n' +
          '코인 충전 창을 열겠습니다.'
        );
        window.__cdOpenChargeModal();
      } else if (window.confirm(
        '🔒 ' + info.name + '\n\n' +
        '이 기능은 영구 해금 ' + info.cost + '코인이 필요합니다.\n' +
        '현재 보유: ' + Number(balance).toLocaleString('ko-KR') + '코인\n\n' +
        '코인 충전 페이지로 이동하시겠습니까?'
      )) {
        window.location.href = '/points';
      }
      return;
    }

    if (!window.confirm(
      '🪙 ' + info.name + ' 영구 해금\n\n' +
      '한 번 결제로 영구적으로 이용할 수 있습니다.\n' +
      '비용: ' + info.cost + '코인 (현재 보유: ' + Number(balance).toLocaleString('ko-KR') + '코인)\n\n' +
      '진행하시겠습니까?'
    )) return;

    (function () {
      var inFlight = false;
      if (inFlight) return;
      inFlight = true;
      fetch('/api/fortune/pig-coin/consume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          cost: info.cost,
          featureKey: info.key,
          reason: info.name + ' 영구 해금'
        })
      })
      .then(function (r) {
        return r.json().then(function (data) { return { status: r.status, ok: r.ok, data: data }; });
      })
      .then(function (res) {
        inFlight = false;
        if (res.status === 402) {
          if (typeof window.__cdOpenChargeModal === 'function') {
            window.alert('꽃돼지 코인이 부족해요. 충전 창을 열겠습니다.');
            window.__cdOpenChargeModal();
          } else if (window.confirm('꽃돼지 코인이 부족해요. 충전 페이지로 이동하시겠습니까?')) {
            window.location.href = '/points';
          }
          return;
        }
        if (!res.ok) {
          window.alert((res.data && res.data.message) || '코인 차감에 실패했습니다. 다시 시도해 주세요.');
          return;
        }
        var newBalance = (res.data && res.data.user && typeof res.data.user.points === 'number')
          ? res.data.user.points
          : Math.max(0, balance - info.cost);
        _dpSaveUserBalance(newBalance);
        if (typeof window.__cdSetGoldenBalance === 'function') window.__cdSetGoldenBalance(newBalance);
        _cdShowCoinDeductNotice(info.cost, newBalance, info.name + ' 영구 해금');
        _dpSaveFeatureUnlock(info.key);
        if (info.extraUnlockKeys) { for (var _ekI = 0; _ekI < info.extraUnlockKeys.length; _ekI++) _dpSaveFeatureUnlock(info.extraUnlockKeys[_ekI]); }
        window.alert('🎉 ' + info.name + '이(가) 해금되었습니다!');
        cb();
      })
      .catch(function (e) {
        inFlight = false;
        console.error('[dp-coin-gate]', e);
        window.alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      });
    })();
  }

  /* ── 프로필 구독 상태 (로드 후 갱신) ── */
  var _dpSubTier         = 'free';   // 'free' | 'standard' | 'premium'
  var _dpSubIsActive     = false;
  var _dpSubProfileLimit = 1;        // 1 | 3 | Infinity (0 = unlimited)

  /** localStorage 캐시에서 구독 상태를 읽어 변수 초기화 */
  function _dpLoadSubCache() {
    try {
      var c = JSON.parse(localStorage.getItem('fortune_profile_subscription') || 'null');
      if (!c || !c.isActive) return;
      _dpSubTier         = c.tier         || 'free';
      _dpSubIsActive     = !!c.isActive;
      _dpSubProfileLimit = typeof c.profileLimit === 'number' ? (c.profileLimit === 0 ? Infinity : c.profileLimit) : 1;
    } catch(e) {}
  }

  /** 서버에서 구독 상태 조회 후 캐시·변수 갱신 */
  function _fetchSubscription() {
    var token = localStorage.getItem('fortune_auth_token');
    if (!token) return;
    fetch('/api/fortune/pig-coin/profile-subscription/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(d) {
      if (!d) return;
      _dpSubTier         = d.tier         || 'free';
      _dpSubIsActive     = !!d.isActive;
      var rawLimit       = typeof d.profileLimit === 'number' ? d.profileLimit : 1;
      _dpSubProfileLimit = rawLimit === 0 ? Infinity : rawLimit;
      try {
        localStorage.setItem('fortune_profile_subscription', JSON.stringify({
          tier:         _dpSubTier,
          isActive:     _dpSubIsActive,
          profileLimit: d.profileLimit, // rawNumber (0=무제한)
          expiresAt:    d.expiresAt || null,
        }));
      } catch(e) {}
      _dpUpdateSaveBtn();
      renderProfileList();
    })
    .catch(function() {});
  }

  /** 현재 플랜에 따른 최대 프로필 수 반환 */
  function _dpGetMaxProfiles() {
    if (!_dpSubIsActive) _dpLoadSubCache();
    if (!_dpSubIsActive) return 1;
    return _dpSubProfileLimit; // Infinity or 3
  }

  /** 저장 버튼 상태를 구독 플랜에 맞게 업데이트 */
  function _dpUpdateSaveBtn() {
    var btn = document.getElementById('dpSaveBtn');
    if (!btn) return;
    var count = DPStorage.list().length;
    var max   = _dpGetMaxProfiles();
    if (count < max) {
      btn.disabled       = false;
      btn.textContent    = '✦ 프로필 저장';
      btn.style.opacity  = '';
      btn.style.cursor   = '';
      btn.removeAttribute('title');
    } else {
      btn.disabled       = true;
      btn.style.opacity  = '0.45';
      btn.style.cursor   = 'not-allowed';
      if (max <= 1) {
        btn.textContent = '✦ 무료 플랜 한도 (1개) — 구독 업그레이드';
        btn.title       = '/points 페이지에서 스탠다드 또는 프리미엄 구독 후 추가 등록 가능합니다.';
      } else {
        btn.textContent = '✦ 스탠다드 한도 (3개) — 프리미엄 업그레이드';
        btn.title       = '/points 페이지에서 프리미엄 구독 후 무제한 등록 가능합니다.';
      }
    }
  }

  function _resolveEventElement(target) {
    if (!target) return null;
    if (target.nodeType === 1) return target;
    return target.parentElement || null;
  }

  /* ──────────────────────────────────────────
     2. 진태양시(True Solar Time) 보정
        KST 기준: 표준 자오선 135도
        보정량(분) = (135 - lng) × 4
  ────────────────────────────────────────── */
  function calcTrueSolarOffset(lng, tzOffsetHours) {
    /* 표준 자오선 = UTC오프셋 × 15도 */
    var stdMeridian = (tzOffsetHours !== undefined ? tzOffsetHours : 9) * 15;
    var offsetMin = Math.round((stdMeridian - lng) * 4);
    return offsetMin;   /* 양수: 뒤로 당김, 음수: 앞으로 당김 */
  }

  function _parseTimeZoneNameOffset(tzName) {
    if (!tzName) return null;
    var m = String(tzName).match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if (!m) return null;
    var sign = m[1] === '-' ? -1 : 1;
    var hh = parseInt(m[2], 10) || 0;
    var mm = parseInt(m[3] || '0', 10) || 0;
    return sign * (hh + mm / 60);
  }

  function getTimeZoneOffsetHoursForDate(year, month, day, hour, minute, tz, fallbackOffsetHours) {
    var fallback = (typeof fallbackOffsetHours === 'number' && !isNaN(fallbackOffsetHours)) ? fallbackOffsetHours : 9;
    if (!tz || typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') return fallback;
    try {
      var probeUtc = new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour || 12, minute || 0, 0));
      var fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'shortOffset'
      });
      var parts = fmt.formatToParts(probeUtc);
      var tzPart = '';
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'timeZoneName') {
          tzPart = parts[i].value || '';
          break;
        }
      }
      var parsed = _parseTimeZoneNameOffset(tzPart);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function resolveTimezoneOffset(birth, location) {
    birth = birth || {};
    location = location || {};
    var base = (typeof location.baseTzOffset === 'number' && !isNaN(location.baseTzOffset))
      ? location.baseTzOffset
      : ((typeof location.tzOffset === 'number' && !isNaN(location.tzOffset)) ? location.tzOffset : 9);
    var tz = location.tz || 'Asia/Seoul';
    var y = birth.year || 2000;
    var m = birth.month || 1;
    var d = birth.day || 1;
    var h = (birth.hour != null) ? birth.hour : 12;
    var mm = (birth.minute != null) ? birth.minute : 0;
    var eff = getTimeZoneOffsetHoursForDate(y, m, d, h, mm, tz, base);
    var dstMinutes = Math.round((eff - base) * 60);
    return {
      tzOffsetHours: eff,
      baseOffsetHours: base,
      dstMinutes: dstMinutes,
      isDstApplied: dstMinutes !== 0
    };
  }

  function applyTrueSolarOffset(hour, minute, offsetMin) {
    var total = hour * 60 + minute - offsetMin;
    /* 자정 이전/이후 처리 */
    total = ((total % 1440) + 1440) % 1440;
    return { h: Math.floor(total / 60), m: total % 60 };
  }

  function formatTrueSolarTime(hour, minute, lng, tzOffset) {
    var offsetMin = calcTrueSolarOffset(lng, tzOffset);
    var t = applyTrueSolarOffset(hour, minute, offsetMin);
    var hh = String(t.h).padStart(2,'0');
    var mm = String(t.m).padStart(2,'0');
    var dir = offsetMin > 0 ? '-' : '+';
    var abs = Math.abs(offsetMin);
    return hh + ':' + mm + ' (' + dir + abs + '분 보정)';
  }

  /* ──────────────────────────────────────────
     3. CustomEvent 브로드캐스트
        → 사주 엔진, 자미두수, 숙요점 자동 연동
  ────────────────────────────────────────── */
  function broadcastProfileChange(profile) {
    try {
      document.dispatchEvent(new CustomEvent('destinyProfileChanged', {
        detail: { profile: profile },
        bubbles: true
      }));
    } catch(e) {}
  }

  /* ──────────────────────────────────────────
     4. 입력 폼 → 프로필 오브젝트 변환
  ────────────────────────────────────────── */
  function readFormData() {
    var name    = (document.getElementById('nameInput') || {}).value || '';
    var bdEl    = document.getElementById('birthDate');
    var bd      = bdEl ? bdEl.value : '';
    var hour    = parseInt((document.getElementById('birthHour') || {}).value) || 12;
    var minute  = parseInt((document.getElementById('birthMinute') || {}).value) || 0;
    /* 성별: 활성 버튼 우선, 폴백 window._gender, 기본값 'F' */
    var gender  = 'F';
    var btnM = document.getElementById('btnM');
    var btnF = document.getElementById('btnF');
    if (btnM && btnM.classList.contains('on')) {
      gender = 'M';
    } else if (btnF && btnF.classList.contains('on')) {
      gender = 'F';
    } else if (window._gender && (window._gender === 'M' || window._gender === 'F')) {
      gender = window._gender;
    } else if (typeof window.GENDER !== 'undefined' && window.GENDER) {
      gender = window.GENDER;
    }

    /* calType */
    var calType = 'solar';
    var calBtns = document.querySelectorAll('input[name="calType"]');
    for (var i = 0; i < calBtns.length; i++) {
      if (calBtns[i].checked) { calType = calBtns[i].value; break; }
    }

    /* 장소 */
    var countrySel = document.getElementById('birthCountry');
    var opt        = countrySel ? countrySel.options[countrySel.selectedIndex] : null;
    var tz   = opt ? countrySel.value   : 'Asia/Seoul';
    var lng  = opt ? parseFloat(opt.getAttribute('data-long') || '127') : 127.0;
    var lat  = opt ? parseFloat(opt.getAttribute('data-lat')  || '37.6'): 37.6;
    var tzOff= opt ? parseFloat(opt.getAttribute('data-tz')   || '9')   : 9;
    var baseTzOff = opt ? parseFloat(opt.getAttribute('data-base-tz') || String(tzOff)) : tzOff;
    var locationLabel = opt ? opt.text : '대한민국 (서울)';

    if (!name || !bd) return null;

    var parts  = bd.split('-');
    var year   = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);

    var resolvedTz = resolveTimezoneOffset(
      { year: year, month: month, day: day, hour: hour, minute: minute },
      { tz: tz, tzOffset: tzOff, baseTzOffset: baseTzOff }
    );

    return {
      name: name,
      gender: gender,
      birth: { year: year, month: month, day: day, hour: hour, minute: minute, calType: calType },
      location: {
        label: locationLabel,
        tz: tz,
        lng: lng,
        lat: lat,
        tzOffset: resolvedTz.tzOffsetHours,
        baseTzOffset: resolvedTz.baseOffsetHours,
        dstMinutes: resolvedTz.dstMinutes
      }
    };
  }

  /* ──────────────────────────────────────────
     5. UI — Master Destiny Card (상단 카드)
  ────────────────────────────────────────── */
  function renderMasterCard(profile) {
    var el = document.getElementById('dpMasterCard');
    if (!el) return;

    if (!profile) {
      el.innerHTML = _emptyCard();
      el.className = 'dp-master-card dp-master-card--empty';
      return;
    }

    var b = profile.birth;
    var l = profile.location || {};
    var profileLng = (l.lng !== undefined && l.lng !== null && !isNaN(Number(l.lng)))
      ? Number(l.lng)
      : ((l.lon !== undefined && l.lon !== null && !isNaN(Number(l.lon))) ? Number(l.lon) : null);
    var tzResolved = resolveTimezoneOffset(b, l);
    var safeLng = (profileLng !== null) ? profileLng : 127.0;
    var tso = calcTrueSolarOffset(safeLng, tzResolved.tzOffsetHours);
    var corrected = applyTrueSolarOffset(b.hour, b.minute, tso);
    var trueSolarStr = String(corrected.h).padStart(2,'0') + ':' + String(corrected.m).padStart(2,'0');
    var dir = tso > 0 ? '−' : '+';
    var absMin = Math.abs(tso);
    var zodiacEmoji = _zodiacEmoji(b.year);
    var calLabel = b.calType === 'solar' ? '양력' : (b.calType === 'lunar_leap' ? '음력(윤)' : '음력');

    el.className = 'dp-master-card dp-master-card--active';
    el.innerHTML =
      '<div class="dp-mc-glow"></div>'
      + '<div class="dp-mc-stars" aria-hidden="true"></div>'
      + '<svg class="dp-mc-flower" viewBox="0 0 120 120" fill="none" aria-hidden="true" style="color:#FFD700">'
        + '<circle cx="60" cy="60" r="52" stroke="currentColor" stroke-width="0.5"/>'
        + '<circle cx="60" cy="60" r="32" stroke="currentColor" stroke-width="0.4"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(30 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(60 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(90 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(120 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(150 60 60)"/>'
        + '<circle cx="60" cy="60" r="4" fill="currentColor" opacity="0.6"/>'
      + '</svg>'
      + '<div class="dp-mc-inner">'
        + '<div class="dp-mc-header">'
          + '<div class="dp-mc-avatar">' + zodiacEmoji + '</div>'
          + '<div class="dp-mc-identity">'
            + '<div class="dp-mc-label">✦ MY DESTINY CARD</div>'
            + '<div class="dp-mc-name">' + _esc(profile.name) + '</div>'
            + '<div class="dp-mc-birth">' + calLabel + ' '
              + b.year + '년 ' + b.month + '월 ' + b.day + '일 '
              + String(b.hour).padStart(2,'0') + ':' + String(b.minute).padStart(2,'0')
            + '</div>'
            + '<div style="margin-top:4px;">'
              + (profile.gender === 'M'
                ? '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(96,165,250,0.18);border:1px solid rgba(96,165,250,0.45);color:#93c5fd;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.5px;">&#9794; 남성</span>'
                : '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(244,114,182,0.18);border:1px solid rgba(244,114,182,0.45);color:#f9a8d4;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.5px;">&#9792; 여성</span>')
            + '</div>'
          + '</div>'
          + '<button class="dp-mc-list-btn" onclick="dpOpenList()" aria-label="프로필 목록" style="touch-action:manipulation">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
          + '</button>'
        + '</div>'
        + '<div class="dp-mc-divider"></div>'
        + '<div class="dp-mc-info">'
          + '<div class="dp-mc-info-item dp-mc-info-item--wide">'
            + '<span class="dp-mc-info-label">'
              + '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
              + '출생지'
            + '</span>'
            + '<span class="dp-mc-info-val">' + _esc(l.label) + '</span>'
          + '</div>'
          + '<div class="dp-mc-info-item">'
            + '<span class="dp-mc-info-label">'
              + '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><circle cx="12" cy="12" r="4"/><path fill="none" stroke="currentColor" stroke-width="2" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M17.66 6.34l1.41-1.41M4.93 19.07l1.41-1.41"/></svg>'
              + '진태양시'
            + '</span>'
            + '<span class="dp-mc-info-val dp-mc-solar">'
              + trueSolarStr
              + '<span class="dp-mc-correction">' + dir + absMin + '분</span>'
            + '</span>'
          + '</div>'
          + '<div class="dp-mc-info-item">'
            + '<span class="dp-mc-info-label">'
              + '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><line x1="2" y1="12" x2="22" y2="12"/></svg>'
              + '경도'
            + '</span>'
            + '<span class="dp-mc-info-val">' + l.lng.toFixed(1) + '°</span>'
          + '</div>'
        + '</div>'
        + '<button class="dp-mc-load-btn" onclick="dpLoadProfile()" style="touch-action:manipulation">✦ 이 프로필로 운세 보기</button>'
      + '</div>';
  }

  function _emptyCard() {
    return '<div class="dp-mc-empty-inner" onclick="dpScrollToForm()">'
      + '<svg class="dp-mc-empty-bloom" viewBox="0 0 120 120" fill="none" aria-hidden="true" style="color:rgba(255,215,0,0.5)">'
        + '<circle cx="60" cy="60" r="52" stroke="currentColor" stroke-width="0.8"/>'
        + '<circle cx="60" cy="60" r="32" stroke="currentColor" stroke-width="0.8"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(30 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(60 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(90 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(120 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(150 60 60)"/>'
        + '<circle cx="60" cy="60" r="5" fill="currentColor" opacity="0.5"/>'
      + '</svg>'
      + '<div class="dp-mc-empty-title">나의 운명 카드</div>'
      + '<div class="dp-mc-empty-desc">아래 정보를 입력하고 저장하면<br>이곳에 나타납니다</div>'
      + '<div class="dp-mc-empty-hint">↓ 아래에서 운명을 새기세요</div>'
    + '</div>';
  }

  function _zodiacEmoji(year) {
    var animals = ['🐀','🐂','🐅','🐇','🐉','🐍','🐎','🐑','🐒','🐓','🐕','🐖'];
    return animals[(year - 4 + 120) % 12];
  }
  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ──────────────────────────────────────────
     3-A. Data Injection & Execution Pipeline
          프로필 → 폼 → 비동기 계산 실행
  ────────────────────────────────────────── */
  /** 베다점 등 외부로 넘길 때 location/birth null 보정 (서울 기본값) */
  function _normalizeProfileForVedic(profile) {
    if (!profile) return profile;
    var parsedBirth = null;
    if (typeof profile.birthDate === 'string') {
      var dparts = profile.birthDate.split(/[-/]/);
      if (dparts.length >= 3) {
        parsedBirth = {
          year: parseInt(dparts[0], 10),
          month: parseInt(dparts[1], 10),
          day: parseInt(dparts[2], 10)
        };
      } else if (dparts.length === 1 && dparts[0].length >= 8) {
        parsedBirth = {
          year: parseInt(dparts[0].slice(0, 4), 10),
          month: parseInt(dparts[0].slice(4, 6), 10),
          day: parseInt(dparts[0].slice(6, 8), 10)
        };
      }
    }
    var b = profile.birth || {
      year: profile.birthYear != null ? profile.birthYear : (parsedBirth && parsedBirth.year),
      month: profile.birthMonth != null ? profile.birthMonth : (parsedBirth && parsedBirth.month),
      day: profile.birthDay != null ? profile.birthDay : (parsedBirth && parsedBirth.day),
      hour: profile.birthHour,
      minute: profile.birthMinute,
      calType: profile.calType
    };
    if (!b || (b.year == null && b.month == null && b.day == null && profile.birthDate == null)) return profile;
    if ((b.hour == null || b.hour === '') && profile.birthHour != null && profile.birthHour !== '') b.hour = profile.birthHour;
    if ((b.minute == null || b.minute === '') && profile.birthMinute != null && profile.birthMinute !== '') b.minute = profile.birthMinute;
    if ((b.hour == null || b.hour === '' || b.minute == null || b.minute === '') && typeof profile.birthTime === 'string') {
      var tparts = profile.birthTime.split(':');
      if (tparts.length >= 2) {
        if (b.hour == null || b.hour === '') b.hour = parseInt(tparts[0], 10);
        if (b.minute == null || b.minute === '') b.minute = parseInt(tparts[1], 10);
      }
    }
    var l = profile.location || {};
    var latNum = (typeof l.lat === 'number' && !isNaN(l.lat)) ? l.lat : parseFloat(l.lat);
    var lngNum = (typeof l.lng === 'number' && !isNaN(l.lng)) ? l.lng
      : ((typeof l.lon === 'number' && !isNaN(l.lon)) ? l.lon : (parseFloat(l.lng) || parseFloat(l.lon)));
    var baseTzNum = (typeof l.baseTzOffset === 'number' && !isNaN(l.baseTzOffset)) ? l.baseTzOffset : parseFloat(l.baseTzOffset);
    var tzOffsetNum = (typeof l.tzOffset === 'number' && !isNaN(l.tzOffset)) ? l.tzOffset : parseFloat(l.tzOffset);
    var lat = (typeof latNum === 'number' && !isNaN(latNum)) ? latNum : 37.5665;
    var lng = (typeof lngNum === 'number' && !isNaN(lngNum)) ? lngNum : 126.978;
    var tzHours = (typeof baseTzNum === 'number' && !isNaN(baseTzNum)) ? baseTzNum
      : ((typeof tzOffsetNum === 'number' && !isNaN(tzOffsetNum)) ? (Math.abs(tzOffsetNum) <= 24 ? tzOffsetNum : tzOffsetNum / 60) : 9);
    return {
      id: profile.id,
      name: profile.name,
      gender: profile.gender,
      birth: {
        year: parseInt(b.year, 10),
        month: parseInt(b.month, 10),
        day: parseInt(b.day, 10),
        hour: b.hour != null ? b.hour : 12,
        minute: b.minute != null ? b.minute : 0,
        calType: b.calType || 'solar'
      },
      location: {
        label: l.label || '대한민국 (서울)',
        tz: l.tz || 'Asia/Seoul',
        lat: lat,
        lng: lng,
        tzOffset: tzHours,
        baseTzOffset: tzHours,
        dstMinutes: l.dstMinutes
      }
    };
  }

  function _resolveVedicProfileCandidate() {
    function hasBirth(p) {
      if (!(p && p.birth)) return false;
      var by = parseInt(p.birth.year, 10);
      var bm = parseInt(p.birth.month, 10);
      var bd = parseInt(p.birth.day, 10);
      return !isNaN(by) && !isNaN(bm) && !isNaN(bd);
    }
    function hasTime(p) {
      return !!(p && p.birth && p.birth.hour != null && p.birth.minute != null);
    }
    var cur = _normalizeProfileForVedic(DPStorage.current());
    if (hasBirth(cur)) return cur;
    var list = DPStorage.list();
    if (!Array.isArray(list) || list.length === 0) return null;
    var firstBirth = null;
    for (var i = 0; i < list.length; i++) {
      var normalized = _normalizeProfileForVedic(list[i]);
      if (!hasBirth(normalized)) continue;
      if (!firstBirth) firstBirth = normalized;
      if (hasTime(normalized)) return normalized;
    }
    return firstBirth;
  }

  function _fortuneStartMessage(profileName, type) {
    var safeName = _esc(profileName || '');
    if (type === 'saju')   return '✦ ' + safeName + ' · 사주 풀이를 시작합니다';
    if (type === 'sukuyo') return '✦ ' + safeName + ' · 숙요점 분석을 준비합니다';
    if (type === 'ziwei')  return '✦ ' + safeName + ' · 자미두수 명반을 여는 중입니다';
    if (type === 'astro')  return '✦ ' + safeName + ' · 점성술 코즈믹 차트를 준비합니다';
    if (type === 'vedic')  return '✦ ' + safeName + ' · 베다 점성술로 이동합니다';
    if (type === 'flower') return '✦ ' + safeName + ' · 운명의 꽃 탭으로 이동합니다';
    if (type === 'tarot')  return '✦ ' + safeName + ' · 타로 컬렉션으로 이동합니다';
    return '✦ ' + safeName + ' · 운세 분석을 시작합니다';
  }

  function _runSajuWhenReady(maxAttempts, delayMs) {
    var attempts = 0;
    var max = (typeof maxAttempts === 'number' && maxAttempts > 0) ? maxAttempts : 60;
    var delay = (typeof delayMs === 'number' && delayMs > 0) ? delayMs : 250;

    function tick() {
      attempts += 1;
      if (typeof window.checkPrivacyAndCalculate === 'function') {
        try {
          var p = window.checkPrivacyAndCalculate();
          if (p && typeof p.catch === 'function') {
            p.catch(function(err) {
              console.error('[DP] 계산 완료 콜백 오류:', err);
              _toast('⚠️ 계산 완료 후 콘텐츠 활성화 중 오류가 발생했습니다', 'warn');
            });
          }
        } catch (err) {
          console.error('[DP] 계산 실행 오류:', err);
          _toast('⚠️ 계산 실행 중 오류가 발생했습니다', 'warn');
        }
        return;
      }

      if (attempts < max) {
        setTimeout(tick, delay);
      } else {
        _toast('⚠️ 계산 모듈 로딩이 지연되고 있습니다. 잠시 후 자동으로 다시 시도됩니다.', 'warn');
      }
    }

    tick();
  }

  function _injectAndRun(profile, fortuneType) {
    if (!profile) {
      _toast('⚠️ 활성화된 프로필이 없습니다', 'warn');
      return;
    }
    var b = profile.birth;
    var l = profile.location || {};
    var profileLng = (l.lng !== undefined && l.lng !== null && !isNaN(Number(l.lng)))
      ? Number(l.lng)
      : ((l.lon !== undefined && l.lon !== null && !isNaN(Number(l.lon))) ? Number(l.lon) : null);

    /* 필수값 검증 */
    if (!b || !b.year || !b.month || !b.day) {
      _toast('⚠️ 생년월일 데이터가 없습니다. 프로필을 다시 저장하세요.', 'warn');
      var formEl = document.querySelector('.input-section');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!l.tz || profileLng === null) {
      var fallbackSel = document.getElementById('birthCountry');
      var fallbackOpt = fallbackSel ? fallbackSel.options[fallbackSel.selectedIndex] : null;
      if (fallbackOpt) {
        if (!l.tz) l.tz = fallbackSel.value || 'Asia/Seoul';
        if (profileLng === null) {
          var fallbackLng = parseFloat(fallbackOpt.getAttribute('data-long') || '127');
          profileLng = isNaN(fallbackLng) ? 127.0 : fallbackLng;
        }
      } else {
        if (!l.tz) l.tz = 'Asia/Seoul';
        if (profileLng === null) profileLng = 127.0;
      }
    }

    /* 시각 피드백 먼저 */
    spawnStardust(document.getElementById('dpMasterCard'));
    _toast(_fortuneStartMessage(profile.name, fortuneType || 'saju'), 'success');

    /* ① 폼 데이터 주입 */
    var nameEl = document.getElementById('nameInput');
    if (nameEl) nameEl.value = profile.name || '';

    var bdEl = document.getElementById('birthDate');
    if (bdEl) bdEl.value = b.year + '-' + String(b.month).padStart(2,'0') + '-' + String(b.day).padStart(2,'0');

    var calBtns = document.querySelectorAll('input[name="calType"]');
    calBtns.forEach(function(btn) { btn.checked = btn.value === (b.calType || 'solar'); });

    var hourEl = document.getElementById('birthHour');
    var minEl  = document.getElementById('birthMinute');
    if (hourEl) hourEl.value = (b.hour !== undefined && b.hour !== null) ? b.hour : 12;
    if (minEl)  minEl.value  = (b.minute !== undefined && b.minute !== null) ? b.minute : 0;

    /* ② 장소 선택 — tz + 경도 정밀 매칭, 폴백 tz-only */
    var countrySel = document.getElementById('birthCountry');
    if (countrySel && l.tz) {
      var matched = false;
      for (var i = 0; i < countrySel.options.length; i++) {
        var opt = countrySel.options[i];
        if (opt.value === l.tz && profileLng !== null && Math.abs(parseFloat(opt.getAttribute('data-long') || 0) - profileLng) < 1) {
          countrySel.selectedIndex = i; matched = true; break;
        }
      }
      if (!matched) {
        for (var j = 0; j < countrySel.options.length; j++) {
          if (countrySel.options[j].value === l.tz) { countrySel.selectedIndex = j; break; }
        }
      }
    }

    /* ③ 성별 동기화 */
    if (window.setGender) window.setGender(profile.gender || 'F');
    window._gender = profile.gender || 'F';

    /* ④ 미리보기 갱신 — 예외 처리 강화 */
    try {
      if (window.updateLunarPreview && typeof window.updateLunarPreview === 'function') {
        window.updateLunarPreview('birthDate', 'calType', 'lunarPreview');
      }
    } catch (err) {
      console.error('[DP] 음력 미리보기 갱신 실패:', err);
    }
    try {
      if (window.updateCorrectedTimePreview && typeof window.updateCorrectedTimePreview === 'function') {
        window.updateCorrectedTimePreview();
      }
    } catch (err) {
      console.error('[DP] 시간 보정 미리보기 갱신 실패:', err);
    }

    /* ⑤ 비동기 실행 — RAF + 80ms: DOM 완전 반영 후 계산 */
    requestAnimationFrame(function() {
      setTimeout(function() {
        _runSajuWhenReady(60, 250);
      }, 80);
    });
  }

  /* ──────────────────────────────────────────
     6. UI — Profile Constellation List (바텀 시트)
  ────────────────────────────────────────── */
  function renderProfileList() {
    var list = DPStorage.list();
    var currId = (DPStorage.current() || {}).id;
    var container = document.getElementById('dpListInner');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = '<div class="dp-list-empty">교체할 프로필이 없습니다.<br><small>아래 폼을 입력 후 \'저장\' 버튼을 눌러주세요.</small></div>';
      return;
    }

    // Render placeholder first to prevent blank modal during slower mobile paints.
    container.innerHTML = '<div class="dp-list-empty">프로필 목록을 불러오는 중...</div>';

    requestAnimationFrame(function() {
      try {
        var isFreeUser = _dpGetMaxProfiles() <= 1;
        var lockedNotice = isFreeUser
          ? '<div style="margin-top:10px;padding:8px 12px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.4);border-radius:8px;text-align:center;font-size:0.72rem;color:#fbbf24;">🔒 무료 플랜은 프로필 1개만 사용할 수 있습니다. 초과 프로필은 ✕ 버튼으로 삭제해 주세요.</div>'
          : '';

    container.innerHTML = list.map(function(p, idx) {
          var safe = p || {};
          var b = safe.birth || {};
          var l = safe.location || {};
          var safeHour = (typeof b.hour === 'number') ? b.hour : 12;
          var safeMinute = (typeof b.minute === 'number') ? b.minute : 0;
          var safeLng = (typeof l.lng === 'number') ? l.lng : 127.0;
          var safeTzOffset = (typeof l.tzOffset === 'number') ? l.tzOffset : 9;
          var safeYear = (typeof b.year === 'number') ? b.year : new Date().getFullYear();
          var safeMonth = (typeof b.month === 'number') ? b.month : 1;
          var safeDay = (typeof b.day === 'number') ? b.day : 1;

          var isActive = safe.id === currId;
                var tzResolved = resolveTimezoneOffset(
                  { year: safeYear, month: safeMonth, day: safeDay, hour: safeHour, minute: safeMinute },
                  { tz: l.tz, tzOffset: safeTzOffset, baseTzOffset: l.baseTzOffset }
                );
                var tso = calcTrueSolarOffset(safeLng, tzResolved.tzOffsetHours);
          var corrected = applyTrueSolarOffset(safeHour, safeMinute, tso);
          var tsStr = String(corrected.h).padStart(2,'0') + ':' + String(corrected.m).padStart(2,'0');
          var zodiac = _zodiacEmoji(safeYear);
          var calLabel = b.calType === 'solar' ? '양' : (b.calType === 'lunar_leap' ? '윤' : '음');
          var pid = safe.id || ('broken_' + idx);
          var pname = safe.name || '이름 없음';
          var locLabel = l.label || '출생지 미지정';

          return '<div class="dp-list-item' + (isActive ? ' dp-list-item--active' : '') + '"'
            + ' data-profile-id="' + pid + '"'
            + ' role="button" tabindex="0"'
            + ' style="animation-delay:' + (idx * 0.07) + 's; cursor:pointer; touch-action:manipulation; -webkit-tap-highlight-color:transparent;"'
            + ' onclick="dpSelectProfile(\'' + pid + '\')">'
            + '<div class="dp-li-left">'
              + '<div class="dp-li-avatar">' + zodiac + '</div>'
              + '<div class="dp-li-body">'
                + '<div class="dp-li-name">' + _esc(pname)
                  + (isActive ? ' <span class="dp-li-current-badge">현재</span>' : '')
                  + (isFreeUser && !isActive
                    ? ' <span style="font-size:0.62rem;color:#f87171;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);padding:1px 6px;border-radius:10px;">사용불가</span>'
                    : '')
                  + (safe.gender === 'M'
                    ? ' <span style="font-size:0.65rem;color:#93c5fd;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);padding:1px 6px;border-radius:10px;">&#9794;</span>'
                    : ' <span style="font-size:0.65rem;color:#f9a8d4;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);padding:1px 6px;border-radius:10px;">&#9792;</span>')
                + '</div>'
                + '<div class="dp-li-meta">[' + calLabel + '] ' + safeYear + '.' + safeMonth + '.' + safeDay
                  + ' · 진태양시 ' + tsStr + '</div>'
                + '<div class="dp-li-loc">📍 ' + _esc(locLabel) + '</div>'
              + '</div>'
            + '</div>'
            + '</div>'
            + (list.length > 1
              ? '<button class="dp-li-del" onclick="event.stopPropagation();dpDeleteProfile(\'' + pid + '\')" aria-label="삭제">✕</button>'
              : '')
            + '</div>';
        }).join('') + lockedNotice;
      } catch (err) {
        console.error('[DP] renderProfileList failed', err);
        container.innerHTML = '<div class="dp-list-empty">프로필 목록을 표시할 수 없습니다.<br><small>새로고침 후 다시 시도해주세요.</small></div>';
      }
    });
  }

  /* ──────────────────────────────────────────
     7. 스타더스트(Stardust) 파티클 효과
  ────────────────────────────────────────── */
  function spawnStardust(el) {
    if (!el) return;
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top  + rect.height / 2;
    for (var i = 0; i < 12; i++) {
      var dot = document.createElement('div');
      dot.className = 'dp-stardust';
      var angle = (Math.PI * 2 / 12) * i + Math.random() * 0.5;
      var dist  = 30 + Math.random() * 50;
      var tx = Math.cos(angle) * dist;
      var ty = Math.sin(angle) * dist;
      dot.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;'
        + '--tx:' + tx.toFixed(1) + 'px;--ty:' + ty.toFixed(1) + 'px;';
      document.body.appendChild(dot);
      setTimeout(function(d) { if (d.parentNode) d.parentNode.removeChild(d); }, 900, dot);
    }
  }

  /* ──────────────────────────────────────────
     8. 공개 API (window.dp*)
  ────────────────────────────────────────── */
  window.dpSaveProfile = function() {
    var data = readFormData();
    if (!data) {
      alert('이름과 생년월일을 입력해주세요.');
      return;
    }
    /* ★ 구독 플랜에 따른 프로필 수 제한 */
    var _cnt = DPStorage.list().length;
    var _max = _dpGetMaxProfiles();
    if (_cnt >= _max) {
      if (_max <= 1) {
        alert('무료 플랜은 프로필 1개까지 저장할 수 있습니다.\n더 많은 프로필이 필요하면 /points 페이지에서 구독을 업그레이드하세요.');
      } else {
        alert('스탠다드 플랜은 프로필 3개까지 저장할 수 있습니다.\n무제한 프로필이 필요하면 /points 페이지에서 프리미엄 구독으로 업그레이드하세요.');
      }
      return;
    }
    var saved = DPStorage.add(data);
    DPStorage.setCurrent(saved.id);
    spawnStardust(document.getElementById('dpSaveBtn'));
    renderMasterCard(DPStorage.current());
    renderProfileList();
    broadcastProfileChange(saved);
    _dpUpdateSaveBtn();
    _toast('귀사는 귀중한 개인정보를 수집하지 않으며, 생년월일 정보는 오직 고객님의 로컬 데이터(기기 브라우저)에만 저장됩니다.', 'privacy');
  };

  window.dpOpenList = function() {
    var sheet = document.getElementById('dpListSheet');
    var overlay = document.getElementById('dpListOverlay');
    var scroller = sheet ? sheet.querySelector('.dp-list-scroll') : null;
    if (!sheet || !overlay) {
      console.error('[DP] list modal elements missing');
      return;
    }

    // Open modal frame first so users never see only a backdrop without a container.
    sheet.classList.add('dp-sheet--open');
    overlay.classList.add('dp-sheet--open');

    try {
      renderProfileList();
      if (scroller) scroller.scrollTop = 0;
    } catch (err) {
      console.error('[DP] openList render failed', err);
      var container = document.getElementById('dpListInner');
      if (container) {
        container.innerHTML = '<div class="dp-list-empty">프로필 로딩 중 문제가 발생했습니다.<br><small>잠시 후 다시 시도해주세요.</small></div>';
      }
    }

    if (sheet) {
      if (!_isMobileViewport()) {
        _bodyLocked = true;
        if (window._perf && window._perf.lockBody) window._perf.lockBody();
        else document.body.style.overflow = 'hidden';
      }
    }
  };

  window.dpCloseList = function() {
    var sheet = document.getElementById('dpListSheet');
    var overlay = document.getElementById('dpListOverlay');
    if (sheet) {
      sheet.classList.remove('dp-sheet--open');
      if (overlay) overlay.classList.remove('dp-sheet--open');
    }
    if (_bodyLocked) {
      _bodyLocked = false;
      if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
      else document.body.style.overflow = '';
    }

    /* lockBody 잔여 스타일 강제 정리 (모바일 fullscreen 고착 방지) */
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  };

  window.dpSelectProfile = function(id) {
    /* ★ 무료 플랜: 다른 프로필 선택 불가 (프로필 1개 제한) */
    var _curId = (DPStorage.current() || {}).id;
    if (_dpGetMaxProfiles() <= 1 && id !== _curId) {
      alert('무료 플랜은 프로필 1개만 사용할 수 있습니다.\n초과 저장된 프로필은 삭제 버튼(✕)으로 정리하거나, /points 페이지에서 구독을 업그레이드하면 여러 프로필을 이용할 수 있습니다.');
      return;
    }
    DPStorage.setCurrent(id);
    var p = DPStorage.current();
    renderMasterCard(p);
    broadcastProfileChange(p);
    dpCloseList();
    spawnStardust(document.getElementById('dpMasterCard'));
    _toast('✦ ' + (p ? _esc(p.name) : '') + ' · 프로필 활성화', 'success');
  };

  window.dpDeleteProfile = function(id) {
    /* ★ 마지막 프로필(1개)은 삭제 불가; 초과 프로필은 무료/유료 모두 삭제 허용 */
    var _profiles = DPStorage.list();
    if (_profiles.length <= 1) {
      alert('마지막 프로필은 삭제할 수 없습니다.\n프로필을 모두 비울 수 없습니다.');
      return;
    }
    var p = _profiles.find(function(x) { return x.id === id; });
    if (!p) return;
    if (!confirm('"' + p.name + '" 프로필을 삭제할까요?')) return;
    DPStorage.remove(id);
    renderProfileList();
    renderMasterCard(DPStorage.current());
    broadcastProfileChange(DPStorage.current());
    _dpUpdateSaveBtn();
  };

  /** 베다점 등 외부 페이지로 넘길 현재 프로필 (저장된 현재 선택 프로필 또는 폼 데이터) */
  window.dpGetDataForVedic = function() {
    var p = _resolveVedicProfileCandidate();
    if (p && p.birth) return _normalizeProfileForVedic(p);
    return _normalizeProfileForVedic(readFormData());
  };

  function _dpBuildSajuAnalysisSnapshot() {
    var natal = window.G_NATAL || {};
    var ratios = natal.ratios || {};
    var counts = natal.counts || {};
    var toNum = function(v) {
      var n = Number(v);
      return isFinite(n) ? n : 0;
    };
    var normalizedRatios = {
      wood: toNum(ratios.wood),
      fire: toNum(ratios.fire),
      earth: toNum(ratios.earth),
      metal: toNum(ratios.metal),
      water: toNum(ratios.water)
    };
    var normalizedCounts = {
      wood: toNum(counts.wood),
      fire: toNum(counts.fire),
      earth: toNum(counts.earth),
      metal: toNum(counts.metal),
      water: toNum(counts.water)
    };
    var totalCounts = normalizedCounts.wood + normalizedCounts.fire + normalizedCounts.earth + normalizedCounts.metal + normalizedCounts.water;
    var totalRatios = normalizedRatios.wood + normalizedRatios.fire + normalizedRatios.earth + normalizedRatios.metal + normalizedRatios.water;
    if (totalCounts <= 0 && totalRatios <= 0) return null;

    if (totalCounts <= 0 && totalRatios > 0) {
      normalizedCounts.wood = Math.round(normalizedRatios.wood / 10);
      normalizedCounts.fire = Math.round(normalizedRatios.fire / 10);
      normalizedCounts.earth = Math.round(normalizedRatios.earth / 10);
      normalizedCounts.metal = Math.round(normalizedRatios.metal / 10);
      normalizedCounts.water = Math.round(normalizedRatios.water / 10);
    }
    if (totalRatios <= 0 && totalCounts > 0) {
      normalizedRatios.wood = Number(((normalizedCounts.wood / totalCounts) * 100).toFixed(1));
      normalizedRatios.fire = Number(((normalizedCounts.fire / totalCounts) * 100).toFixed(1));
      normalizedRatios.earth = Number(((normalizedCounts.earth / totalCounts) * 100).toFixed(1));
      normalizedRatios.metal = Number(((normalizedCounts.metal / totalCounts) * 100).toFixed(1));
      normalizedRatios.water = Number(((normalizedCounts.water / totalCounts) * 100).toFixed(1));
    }

    return {
      dominant_element: natal.dominant || '',
      five_elements_count: normalizedCounts,
      five_elements_ratio: normalizedRatios
    };
  }

  function _dpRasterizeGuardianToPng(guardian, size) {
    return new Promise(function(resolve) {
      if (!guardian || typeof guardian !== 'object') {
        resolve(guardian);
        return;
      }
      if (guardian.image_data_uri) {
        resolve(guardian);
        return;
      }

      var svgMarkup = guardian.svg_markup ? String(guardian.svg_markup) : '';
      var fallbackSvgMarkup = guardian.fallback_svg_markup ? String(guardian.fallback_svg_markup) : '';
      var svgDataUri = guardian.svg_data_uri ? String(guardian.svg_data_uri) : '';
      var sources = [];
      if (svgDataUri) sources.push({ type: 'uri', value: svgDataUri });
      if (svgMarkup) sources.push({ type: 'svg', value: svgMarkup });
      if (fallbackSvgMarkup) sources.push({ type: 'svg', value: fallbackSvgMarkup });
      if (!sources.length) {
        resolve(guardian);
        return;
      }

      var canvasSize = Math.max(160, Math.min(640, Number(size) || 320));
      var canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      var ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(guardian);
        return;
      }

      function isMeaningfulCanvas() {
        try {
          var data = ctx.getImageData(0, 0, canvasSize, canvasSize).data;
          var alphaPixels = 0;
          var minL = 255;
          var maxL = 0;
          var step = Math.max(8, Math.floor((canvasSize * canvasSize) / 1200)) * 4;
          var i;
          for (i = 0; i < data.length; i += step) {
            var a = data[i + 3];
            if (a > 16) {
              alphaPixels += 1;
              var lum = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
              if (lum < minL) minL = lum;
              if (lum > maxL) maxL = lum;
            }
          }
          if (alphaPixels < 24) return false;
          return (maxL - minL) >= 10;
        } catch (e) {
          return false;
        }
      }

      var sourceIdx = 0;
      function tryNextSource() {
        if (sourceIdx >= sources.length) {
          resolve(guardian);
          return;
        }

        var src = sources[sourceIdx++];
        var img = new Image();
        var objectUrl = '';
        img.onload = function() {
          try {
            ctx.clearRect(0, 0, canvasSize, canvasSize);
            ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
            if (!isMeaningfulCanvas()) {
              if (objectUrl) URL.revokeObjectURL(objectUrl);
              tryNextSource();
              return;
            }
            guardian.image_data_uri = canvas.toDataURL('image/png');
            guardian.svg_data_uri = '';
          } catch (e) {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            tryNextSource();
            return;
          }
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          resolve(guardian);
        };
        img.onerror = function() {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          tryNextSource();
        };

        if (src.type === 'uri') {
          img.src = src.value;
          return;
        }

        try {
          var blob = new Blob([src.value], { type: 'image/svg+xml;charset=utf-8' });
          objectUrl = URL.createObjectURL(blob);
          img.src = objectUrl;
        } catch (e) {
          tryNextSource();
        }
      }

      tryNextSource();
    });
  }

  window.dpGenerateGuardianAvatar = async function() {
    var p = DPStorage.current();
    if (!p || !p.birth) {
      _toast('⚠️ 프로필을 먼저 저장해 주세요.', 'warn');
      return;
    }

    var btn = document.querySelector('.dp-mc-guardian-btn');
    var oldText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '✨ 생성 중...';
      btn.style.opacity = '0.75';
    }

    try {
      var resp = await fetch('/api/guardian-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p, sajuAnalysis: _dpBuildSajuAnalysisSnapshot(), renderMode: 'profile-mini' })
      });
      var data = await resp.json().catch(function() { return null; });
      if (!resp.ok || !data || !data.ok || !data.guardian) {
        throw new Error((data && data.message) || ('아바타 생성 실패 (' + resp.status + ')'));
      }

      var guardian = data.guardian;
      if (!guardian || !guardian.image_data_uri) {
        throw new Error('guardian-image-missing');
      }

      DPStorage.update(p.id, {
        guardianAvatar: {
          image_data_uri: guardian.image_data_uri,
          svg_data_uri: '',
          summary: guardian.summary || '',
          facial_expression: guardian.facial_expression || '',
          background_motif: guardian.background_motif || '',
          illustration_prompt: guardian.illustration_prompt || '',
          created_at: guardian.created_at || new Date().toISOString()
        }
      });

      var updated = DPStorage.current() || p;
      renderMasterCard(updated);
      broadcastProfileChange(updated);
      _toast('🪄 가디언 토템 이미지가 완성되었습니다!', 'success');
    } catch (err) {
      _toast('⚠️ 이용자가 많아서 실패했습니다. 잠시 후 다시 시도해주세요.', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText || '🖼️ 가디언 토템 생성';
        btn.style.opacity = '';
      }
    }
  };

  window.dpLoadProfile = function() {
    var p = DPStorage.current();
    if (!p) { _toast('⚠️ 불러올 프로필이 없습니다', 'warn'); return; }

    var card = document.getElementById('dpMasterCard');
    spawnStardust(card);

    /* 사주 폼 동기화 (사주 실행 경로 사전 준비) */
    var b = p.birth, l = p.location || {};
    var nameEl = document.getElementById('nameInput');
    if (nameEl) nameEl.value = p.name || '';
    var bdEl = document.getElementById('birthDate');
    if (bdEl) bdEl.value = b.year + '-' + String(b.month).padStart(2,'0') + '-' + String(b.day).padStart(2,'0');
    var calBtns = document.querySelectorAll('input[name="calType"]');
    calBtns.forEach(function(btn) { btn.checked = btn.value === (b.calType || 'solar'); });
    var hourEl = document.getElementById('birthHour');
    var minEl  = document.getElementById('birthMinute');
    if (hourEl) hourEl.value = (b.hour !== undefined && b.hour !== null) ? b.hour : 12;
    if (minEl)  minEl.value  = (b.minute !== undefined && b.minute !== null) ? b.minute : 0;
    var countrySel = document.getElementById('birthCountry');
    if (countrySel && l.tz) {
      var matched = false;
      for (var i = 0; i < countrySel.options.length; i++) {
        var opt = countrySel.options[i];
        if (opt.value === l.tz && Math.abs(parseFloat(opt.getAttribute('data-long') || 0) - l.lng) < 1) {
          countrySel.selectedIndex = i; matched = true; break;
        }
      }
      if (!matched) {
        for (var j = 0; j < countrySel.options.length; j++) {
          if (countrySel.options[j].value === l.tz) { countrySel.selectedIndex = j; break; }
        }
      }
    }
    if (window.setGender) window.setGender(p.gender || 'F');
    window._gender = p.gender || 'F';
    if (window.updateLunarPreview) window.updateLunarPreview('birthDate', 'calType', 'lunarPreview');
    if (window.updateCorrectedTimePreview) window.updateCorrectedTimePreview();
    broadcastProfileChange(p);

    /* ── 운세 유형 선택 모달 ── */
    var zodiac   = _zodiacEmoji(b.year);
    var calLabel = b.calType === 'solar' ? '양력' : (b.calType === 'lunar_leap' ? '음력(윤)' : '음력');
    var dateStr  = calLabel + ' ' + b.year + '.' + String(b.month).padStart(2,'0') + '.' + String(b.day).padStart(2,'0')
                 + '&nbsp;·&nbsp;' + String(b.hour != null ? b.hour : 12).padStart(2,'0')
                 + ':' + String(b.minute != null ? b.minute : 0).padStart(2,'0');
    var ov = document.createElement('div');
    ov.className = 'dp-fsel-overlay';
    ov.innerHTML =
      '<div class="dp-fsel-modal">'
      + '<button type="button" class="dp-fsel-close-btn" aria-label="닫기" onclick="window._dpCloseFortuneSel && window._dpCloseFortuneSel(); return false;">✕</button>'
      + '<div class="dp-fsel-profile">'
        + '<span class="dp-fsel-zodiac">' + zodiac + '</span>'
        + '<div class="dp-fsel-pname">' + _esc(p.name) + '</div>'
        + '<div class="dp-fsel-pdate">' + dateStr + '</div>'
        + (l.label ? '<div class="dp-fsel-ploc">📍 ' + _esc(l.label) + '</div>' : '')
      + '</div>'
      + '<div class="dp-fsel-divider"></div>'
      + '<div class="dp-fsel-ask">어떤 운세를 보시겠습니까?</div>'
      + '<div class="dp-fsel-btns">'
        + '<button class="dp-fsel-btn dp-fsel-btn--saju"   onclick="window._dpOpenFortuneType(\'saju\')"   style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🔮</span><span class="dp-fsel-btn-label">사주 풀이</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--sukuyo" onclick="window._dpOpenFortuneType(\'sukuyo\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">💫</span><span class="dp-fsel-btn-label">숙요점</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--ziwei" onclick="window._dpOpenFortuneType(\'ziwei\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🌌</span><span class="dp-fsel-btn-label">자미두수</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--astro" onclick="window._dpOpenFortuneType(\'astro\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">✨</span><span class="dp-fsel-btn-label">점성술</span></button>'
        + (function(){ var lk=_dpIsFeatureLocked('olympus-fc'); return '<button class="dp-fsel-btn dp-fsel-btn--olympus' + (lk?' dp-fsel-btn--locked':'') + '" onclick="window._dpOpenFortuneType(\'olympus\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">' + (lk?'🔒':'⚡') + '</span><span class="dp-fsel-btn-label">올림푸스 신탁' + (lk?'<span class="dp-fsel-btn-cost"> 🔒 100코인</span>':'') + '</span></button>'; })()
        + '<button class="dp-fsel-btn dp-fsel-btn--vedic" onclick="window._dpOpenFortuneType(\'vedic\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🪐</span><span class="dp-fsel-btn-label">베다점</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--tarot"  onclick="window._dpOpenFortuneType(\'tarot\')"  style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🃏</span><span class="dp-fsel-btn-label">타로</span></button>'
        + (function(){ var lk=_dpIsFeatureLocked('flower-fc'); return '<button class="dp-fsel-btn dp-fsel-btn--flower' + (lk?' dp-fsel-btn--locked':'') + '" onclick="window._dpOpenFortuneType(\'flower\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">' + (lk?'🔒':'🌸') + '</span><span class="dp-fsel-btn-label">운명의 꽃' + (lk?'<span class="dp-fsel-btn-cost"> 200코인</span>':'') + '</span></button>'; })()
      + '</div>'
      + '</div>';
    document.body.appendChild(ov);
    window._dpFortuneSelEl = ov;
    var doClose = function(e) {
      if (e && e.cancelable) e.preventDefault();
      if (typeof window._dpCloseFortuneSel === 'function') window._dpCloseFortuneSel();
    };
    var closeBtnEl = ov.querySelector('.dp-fsel-close-btn');
    if (closeBtnEl) {
      closeBtnEl.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        doClose(e);
      });
      closeBtnEl.addEventListener('touchend', function(e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        doClose(e);
      }, { passive: false });
    }
    ov.addEventListener('click', function(e) {
      if (e.target === ov) doClose(e);
    });
    requestAnimationFrame(function() { ov.classList.add('dp-fsel-overlay--in'); });
  };

  window._dpCloseFortuneSel = function() {
    var ov = window._dpFortuneSelEl || document.querySelector('.dp-fsel-overlay');
    if (!ov) return;
    ov.classList.remove('dp-fsel-overlay--in');
    setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 350);
    window._dpFortuneSelEl = null;
  };

  window._dpOpenFortuneType = function(type) {
    /* fsel 오버레이를 페이드아웃 후 DOM에서 완전 제거한 뒤 모달 열기
       (backdrop-filter stacking context → iOS WebKit 화이트스크린 방지) */
    var ov = window._dpFortuneSelEl || document.querySelector('.dp-fsel-overlay');
    window._dpFortuneSelEl = null;

    function _openTarget() {
      /* 코인 잠금 대상 기능은 게이트를 통과해야 실행 */
      if (_DP_FEATURE_LOCKS[type]) {
        _dpGateLockFeature(type, function() { _runFortuneType(type); });
        return;
      }
      _runFortuneType(type);
    }

    function _runFortuneType(type) {
      function _olympusSunSignFromDate(month, day) {
        if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
        if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
        if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
        if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
        if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
        if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
        if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
        if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
        if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
        if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
        if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
        return 'pisces';
      }
      function _olympusTimezoneOffset() {
        var offset = -new Date().getTimezoneOffset() / 60;
        return Number.isFinite(offset) ? offset : 9;
      }
      function _olympusToDateString(birth) {
        var mm = String(birth.month).padStart(2, '0');
        var dd = String(birth.day).padStart(2, '0');
        return birth.year + '-' + mm + '-' + dd;
      }
      function _olympusToTimeString(birth) {
        var hh = String(birth.hour != null ? birth.hour : 12).padStart(2, '0');
        var mm = String(birth.minute != null ? birth.minute : 0).padStart(2, '0');
        return hh + ':' + mm;
      }
      function _olympusCommitProfile(payload) {
        try {
          sessionStorage.setItem('OLYMPUS_ORACLE_PROFILE', JSON.stringify(payload));
        } catch (e) {}
        window.location.href = '/olympus';
      }

      if (type === 'saju') {
        var p = DPStorage.current();
        if (p) _injectAndRun(p, 'saju');
      } else if (type === 'sukuyo') {
        var pSukuyo = DPStorage.current();
        if (pSukuyo) _toast(_fortuneStartMessage(pSukuyo.name, 'sukuyo'), 'success');
        if (typeof openSukuyoModal === 'function') openSukuyoModal();
      } else if (type === 'ziwei') {
        var pZiwei = DPStorage.current();
        if (pZiwei) _toast(_fortuneStartMessage(pZiwei.name, 'ziwei'), 'success');
        if (typeof openZiweiModal === 'function') openZiweiModal();
      } else if (type === 'astro') {
        var pAstro = DPStorage.current();
        if (pAstro) _toast(_fortuneStartMessage(pAstro.name, 'astro'), 'success');
        if (typeof openAstroModal === 'function') openAstroModal();
      } else if (type === 'olympus') {
        // Safety net: enforce lock gate even if this branch is called directly.
        if (_DP_FEATURE_LOCKS.olympus && _dpIsFeatureLocked(_DP_FEATURE_LOCKS.olympus.key)) {
          _dpGateLockFeature('olympus', function() { _runFortuneType('olympus'); });
          return;
        }
        var pOlympus = DPStorage.current();
        if (!pOlympus || !pOlympus.birth) {
          _toast('⚠️ 올림푸스 신탁은 생년월일·시간이 있는 프로필이 필요합니다.', 'warn');
          return;
        }
        var b = pOlympus.birth;
        var payload = {
          name: pOlympus.name,
          date: _olympusToDateString(b),
          time: _olympusToTimeString(b)
        };
        var fallbackKey = _olympusSunSignFromDate(b.month, b.day);
        fetch('/api/vedic/planets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: b.year,
            month: b.month,
            day: b.day,
            hour: b.hour != null ? b.hour : 12,
            minute: b.minute != null ? b.minute : 0,
            timezone: _olympusTimezoneOffset()
          })
        })
          .then(function(res) { return res.ok ? res.json() : null; })
          .then(function(data) {
            if (data && data.ok && data.planets && typeof data.planets.Sun === 'number') {
              var ayanamsa = typeof data.ayanamsa === 'number' ? data.ayanamsa : 0;
              var tropical = (data.planets.Sun + ayanamsa) % 360;
              var idx = Math.floor(((tropical % 360) + 360) % 360 / 30);
              var signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
              payload.sunKey = signs[idx];
            } else {
              payload.sunKey = fallbackKey;
            }
            _olympusCommitProfile(payload);
          })
          .catch(function() {
            payload.sunKey = fallbackKey;
            _olympusCommitProfile(payload);
          });
      } else if (type === 'vedic') {
        var pVedic = _resolveVedicProfileCandidate();
        var _vb = pVedic && pVedic.birth ? pVedic.birth : null;
        var _hasVedicBirth = !!(_vb && _vb.year != null && _vb.month != null && _vb.day != null && _vb.year !== '' && _vb.month !== '' && _vb.day !== '');
        if (!pVedic || !_hasVedicBirth) {
          _toast('⚠️ 베다점을 보려면 생년월일·시간이 있는 프로필을 선택해 주세요.', 'warn');
          return;
        }
        if (pVedic.id) {
          try { DPStorage.setCurrent(pVedic.id); } catch (e0) {}
        }
        var forVedic = _normalizeProfileForVedic(pVedic);
        try {
          sessionStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(forVedic));
          localStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(forVedic));
          sessionStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(forVedic));
          localStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(forVedic));
          sessionStorage.setItem('FORTUNE_APP_VEDIC_FROM_PROFILE', '1');
          window.FORTUNE_APP_VEDIC_PAYLOAD = forVedic;
          window.__cdActiveBirthProfile = forVedic;
        } catch (e) {}
        if (pVedic) _toast(_fortuneStartMessage(pVedic.name, 'vedic'), 'success');
        // Use the shared navigation path first; this keeps profile payload and localization handling consistent.
        if (typeof window.navigateToVedic === 'function') {
          try {
            window.navigateToVedic();
            return;
          } catch (_) {}
        }
        var _vdTarget = '/vedic-astrology.html?from=profile-card';
        try {
          if (typeof cdResolveLocalizedFeatureHref === 'function') {
            _vdTarget = cdResolveLocalizedFeatureHref(_vdTarget, (typeof cdGetCurrentLang === 'function' ? cdGetCurrentLang() : null));
          }
        } catch (_) {
          _vdTarget = '/vedic-astrology.html?from=profile-card';
        }
        try {
          window.location.assign(_vdTarget);
        } catch (_) {
          window.location.href = '/vedic-astrology.html?from=profile-card';
        }
      } else if (type === 'tarot') {
        var pTarot = DPStorage.current();
        if (pTarot) _toast(_fortuneStartMessage(pTarot.name, 'tarot'), 'success');
        var tarotEl = document.getElementById('tarotCollection');
        if (tarotEl && typeof tarotEl.scrollIntoView === 'function') {
          tarotEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.href = (window.location.pathname === '/' ? '#' : '/#') + 'tarotCollection';
        }
      } else if (type === 'flower') {
        var pFlower = DPStorage.current();
        if (pFlower) _toast(_fortuneStartMessage(pFlower.name, 'flower'), 'success');
        var openStudio = window.openDestinyFlowerStudio;
        var openFlower = window.openDestinyFlower;
        if (typeof openStudio === 'function') {
          openStudio();
        } else if (typeof openFlower === 'function') {
          openFlower(false);
          var flowerCard = document.querySelector('.feature-card.feature-card--destiny-flower');
          if (flowerCard && typeof flowerCard.scrollIntoView === 'function') {
            setTimeout(function() {
              flowerCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
          }
        } else {
          _toast('⚠️ 운명의 꽃 모듈이 아직 로딩 중입니다. 잠시 후 다시 시도하세요.', 'warn');
        }
      }
    }

    if (!ov) { _openTarget(); return; }

    /* CSS 트랜지션 후 제거 → 모달 열기 */
    ov.classList.remove('dp-fsel-overlay--in');
    setTimeout(function() {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      _openTarget();
    }, 350);
  };

  window.dpScrollToForm = function() {
    var el = document.querySelector('.input-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* 외부에서 _injectAndRun 호출 — 프로필 전환 후 사주 재계산 */
  window.dpRunWithProfile = function(profileId) {
    var list = DPStorage.list();
    var p = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === profileId) { p = list[i]; break; } }
    if (!p) return;
    DPStorage.setCurrent(profileId);
    _injectAndRun(p, 'saju');
  };

  /* ──────────────────────────────────────────
     9. 토스트
  ────────────────────────────────────────── */
  function _toast(msg, type) {
    /* 기존 같은 타입 토스트 제거 */
    var prev = document.querySelector('.dp-toast.dp-toast--' + (type || 'info'));
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    var t = document.createElement('div');
    t.className = 'dp-toast dp-toast--' + (type || 'info');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function() { t.classList.add('dp-toast--show'); });
    setTimeout(function() {
      t.classList.remove('dp-toast--show');
      setTimeout(function() { if(t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, 2600);
  }

  /* ──────────────────────────────────────────
     10. 초기화
  ────────────────────────────────────────── */
  function init() {
    /* 모바일 브라우저(BFCache/세션 복원)에서 시트 열린 상태가 남는 문제 방지 */
    dpCloseList();

    renderMasterCard(DPStorage.current());

    /* ★ 구독 플랜 기반 저장 버튼 초기화 */
    _dpLoadSubCache();
    _dpUpdateSaveBtn();
    _fetchSubscription(); // API 로드 후 재검증

    /* ESC 키로 시트 닫기 */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') dpCloseList();
    });

    /* 오버레이 클릭으로 시트 닫기 */
    var overlay = document.getElementById('dpListOverlay');
    if (overlay) overlay.addEventListener('click', dpCloseList);
    var sheet = document.getElementById('dpListSheet');
    if (sheet) {
      /* 시트 내부 클릭: data-action 요소는 버블링 허용, 나머지는 stopPropagation */
      sheet.addEventListener('click', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (targetEl && targetEl.closest('[data-action]')) return;
        e.stopPropagation();
      });
      /* 닫기 버튼: 시트 위임으로 처리 (직접 바인딩 실패·모바일 터치 대응) */
      sheet.addEventListener('click', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (targetEl && targetEl.closest('.dp-sheet-close')) {
          e.preventDefault();
          e.stopPropagation();
          dpCloseList();
        }
      }, true);
      sheet.addEventListener('touchend', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (!targetEl || !targetEl.closest) return;
        if (targetEl.closest('.dp-sheet-close')) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          dpCloseList();
        }
      }, { capture: true, passive: false });
    }

    var closeBtn = document.querySelector('#dpListSheet .dp-sheet-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        dpCloseList();
      });
      closeBtn.addEventListener('touchend', function(e) {
        if (e.cancelable) e.preventDefault();
        dpCloseList();
      }, { passive: false });
    }

    /* 모바일: document 터치 위임 — dp-sheet 닫기 버튼 (iOS Safari onclick 유실 방지) */
    var _dpSheetTouchX = 0, _dpSheetTouchY = 0;
    document.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches[0]) {
        var t = _resolveEventElement(e.target);
        if (t && t.closest && t.closest('#dpListSheet .dp-sheet-close')) {
          _dpSheetTouchX = e.touches[0].clientX;
          _dpSheetTouchY = e.touches[0].clientY;
        }
      }
    }, { passive: true });
    document.addEventListener('touchend', function(e) {
      var targetEl = _resolveEventElement(e.target);
      if (!targetEl || !targetEl.closest) return;
      var closeBtnEl = targetEl.closest('#dpListSheet .dp-sheet-close');
      if (!closeBtnEl) return;
      var sheetEl = document.getElementById('dpListSheet');
      if (!sheetEl || !sheetEl.classList.contains('dp-sheet--open')) return;
      var pt = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : e;
      var dx = Math.abs(pt.clientX - _dpSheetTouchX);
      var dy = Math.abs(pt.clientY - _dpSheetTouchY);
      if (dx < 36 && dy < 36) {
        if (e.cancelable) e.preventDefault();
        dpCloseList();
      }
    }, { passive: false });

    var card = document.getElementById('dpMasterCard');
    if (card) {
      /* 모바일에서 onclick 유실되는 경우를 대비해 터치 핸들러를 추가한다. */
      card.addEventListener('touchend', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (!targetEl) return;
        var menuBtn = targetEl.closest('.dp-mc-list-btn');
        if (menuBtn) {
          if (e.cancelable) e.preventDefault();
          dpOpenList();
          return;
        }
        var loadBtn = targetEl.closest('.dp-mc-load-btn');
        if (loadBtn) {
          if (e.cancelable) e.preventDefault();
          dpLoadProfile();
          return;
        }
        var guardianBtn = targetEl.closest('.dp-mc-guardian-btn');
        if (guardianBtn) {
          if (e.cancelable) e.preventDefault();
          if (typeof window.dpGenerateGuardianAvatar === 'function') window.dpGenerateGuardianAvatar();
          return;
        }
      }, { passive: false });
    }

    /* 운세 유형 선택 모달(dp-fsel) — 모바일 터치 위임 (onclick 유실 방지) */
    var _dpFselTouchX = 0, _dpFselTouchY = 0;
    document.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches[0]) {
        var t = _resolveEventElement(e.target);
        if (t && t.closest && t.closest('.dp-fsel-overlay')) {
          _dpFselTouchX = e.touches[0].clientX;
          _dpFselTouchY = e.touches[0].clientY;
        }
      }
    }, { passive: true });
    document.addEventListener('touchend', function(e) {
      var targetEl = _resolveEventElement(e.target);
      if (!targetEl || !targetEl.closest) return;
      var closeBtn = targetEl.closest('.dp-fsel-overlay .dp-fsel-close-btn');
      if (closeBtn) {
        var pt = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : e;
        var dx = Math.abs(pt.clientX - _dpFselTouchX);
        var dy = Math.abs(pt.clientY - _dpFselTouchY);
        if (dx < 24 && dy < 24 && typeof window._dpCloseFortuneSel === 'function') {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          window._dpCloseFortuneSel();
        }
        return;
      }
      var btn = targetEl.closest('.dp-fsel-overlay .dp-fsel-btn');
      if (!btn) return;
      var pt = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : e;
      var dx = Math.abs(pt.clientX - _dpFselTouchX);
      var dy = Math.abs(pt.clientY - _dpFselTouchY);
      if (dx >= 10 || dy >= 16) return; /* 스크롤로 간주 */
      if (e.cancelable) e.preventDefault();
      var type = '';
      if (btn.classList.contains('dp-fsel-btn--saju')) type = 'saju';
      else if (btn.classList.contains('dp-fsel-btn--sukuyo')) type = 'sukuyo';
      else if (btn.classList.contains('dp-fsel-btn--ziwei')) type = 'ziwei';
      else if (btn.classList.contains('dp-fsel-btn--astro')) type = 'astro';
      else if (btn.classList.contains('dp-fsel-btn--olympus')) type = 'olympus';
      else if (btn.classList.contains('dp-fsel-btn--vedic')) type = 'vedic';
      else if (btn.classList.contains('dp-fsel-btn--tarot')) type = 'tarot';
      else if (btn.classList.contains('dp-fsel-btn--flower')) type = 'flower';
      if (type && typeof window._dpOpenFortuneType === 'function') {
        window._dpOpenFortuneType(type);
      }
    }, { passive: false });

    /* 모바일 터치 이벤트 위임 — iOS Safari onclick 이벤트 유실 방지 */
    var listInner = document.getElementById('dpListInner');
    if (listInner) {
      var _tX = 0, _tY = 0;
      listInner.addEventListener('touchstart', function(e) {
        _tX = e.touches[0].clientX;
        _tY = e.touches[0].clientY;
      }, { passive: true });
      listInner.addEventListener('touchend', function(e) {
        var dx = Math.abs(e.changedTouches[0].clientX - _tX);
        var dy = Math.abs(e.changedTouches[0].clientY - _tY);
        /* 스크롤이 아닌 탭만 처리 (이동 10px 미만) */
        if (dx < 10 && dy < 16) {
          var targetEl = _resolveEventElement(e.target);
          if (!targetEl) return;
          var delBtn = targetEl.closest('.dp-li-del');
          if (delBtn) {
            var delItem = targetEl.closest('[data-profile-id]');
            var delPid = delItem ? delItem.getAttribute('data-profile-id') : '';
            if (delPid) {
              if (e.cancelable) e.preventDefault();
              e.stopPropagation();
              dpDeleteProfile(delPid);
            }
            return;
          }
          var item = targetEl.closest('[data-profile-id]');
          if (item && !targetEl.closest('.dp-li-del')) {
            var pid = item.getAttribute('data-profile-id');
            if (pid) { if (e.cancelable) e.preventDefault(); dpSelectProfile(pid); }
          }
        }
      }, { passive: false });
    }

    /* 폼 변경 시 카드 자동 갱신 (저장 전이라도 장소는 반영) */
    ['birthCountry'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function() {
        /* 현재 프로필이 있을 때만 리렌더 */
        if (DPStorage.current()) renderMasterCard(DPStorage.current());
      });
    });

    window.addEventListener('pageshow', function() {
      dpCloseList();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 외부 노출 */
  window.DestinyProfileManager = {
    storage: DPStorage,
    calcTrueSolarOffset: calcTrueSolarOffset,
    resolveTimezoneOffset: resolveTimezoneOffset,
    getTimeZoneOffsetHoursForDate: getTimeZoneOffsetHoursForDate
  };

  window.generateGuardianAvatar = window.dpGenerateGuardianAvatar;

})();
