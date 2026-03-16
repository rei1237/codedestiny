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
    var gender  = window._gender || 'F';

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
    var l = profile.location;
    var tzResolved = resolveTimezoneOffset(b, l);
    var tso = calcTrueSolarOffset(l.lng, tzResolved.tzOffsetHours);
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
  function _fortuneStartMessage(profileName, type) {
    var safeName = _esc(profileName || '');
    if (type === 'saju')   return '✦ ' + safeName + ' · 사주 풀이를 시작합니다';
    if (type === 'sukuyo') return '✦ ' + safeName + ' · 숙요점 분석을 준비합니다';
    if (type === 'ziwei')  return '✦ ' + safeName + ' · 자미두수 명반을 여는 중입니다';
    if (type === 'astro')  return '✦ ' + safeName + ' · 점성술 코즈믹 차트를 준비합니다';
    if (type === 'flower') return '✦ ' + safeName + ' · 운명의 꽃 탭으로 이동합니다';
    return '✦ ' + safeName + ' · 운세 분석을 시작합니다';
  }

  function _injectAndRun(profile, fortuneType) {
    if (!profile) {
      _toast('⚠️ 활성화된 프로필이 없습니다', 'warn');
      return;
    }
    var b = profile.birth;
    var l = profile.location;

    /* 필수값 검증 */
    if (!b || !b.year || !b.month || !b.day) {
      _toast('⚠️ 생년월일 데이터가 없습니다. 프로필을 다시 저장하세요.', 'warn');
      var formEl = document.querySelector('.input-section');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!l || l.lng === undefined || l.lng === null) {
      _toast('⚠️ 출생지 정보가 없습니다. 프로필을 다시 저장하세요.', 'warn');
      return;
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

    /* ③ 성별 동기화 */
    if (window.setGender) window.setGender(profile.gender || 'F');
    window._gender = profile.gender || 'F';

    /* ④ 미리보기 갱신 */
    if (window.updateLunarPreview) window.updateLunarPreview('birthDate', 'calType', 'lunarPreview');
    if (window.updateCorrectedTimePreview) window.updateCorrectedTimePreview();

    /* ⑤ 비동기 실행 — RAF + 80ms: DOM 완전 반영 후 계산 */
    requestAnimationFrame(function() {
      setTimeout(function() {
        try {
          if (typeof window.checkPrivacyAndCalculate === 'function') {
            window.checkPrivacyAndCalculate();
          } else {
            _toast('⚠️ 계산 모듈이 아직 로딩 중입니다. 잠시 후 다시 시도하세요.', 'warn');
          }
        } catch (err) {
          console.error('[DP] 계산 실행 오류:', err);
          _toast('⚠️ 계산 실행 중 오류가 발생했습니다', 'warn');
        }
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
                  + (safe.gender === 'M'
                    ? ' <span style="font-size:0.65rem;color:#93c5fd;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);padding:1px 6px;border-radius:10px;">&#9794;</span>'
                    : ' <span style="font-size:0.65rem;color:#f9a8d4;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);padding:1px 6px;border-radius:10px;">&#9792;</span>')
                + '</div>'
                + '<div class="dp-li-meta">[' + calLabel + '] ' + safeYear + '.' + safeMonth + '.' + safeDay
                  + ' · 진태양시 ' + tsStr + '</div>'
                + '<div class="dp-li-loc">📍 ' + _esc(locLabel) + '</div>'
              + '</div>'
            + '</div>'
            + '<button class="dp-li-del" onclick="event.stopPropagation();dpDeleteProfile(\'' + pid + '\')" aria-label="삭제">✕</button>'
          + '</div>';
        }).join('');
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
    /* 동명 동일 날짜 중복 방지 */
    var existing = DPStorage.list().find(function(p) {
      return p.name === data.name
        && p.birth.year === data.birth.year
        && p.birth.month === data.birth.month
        && p.birth.day === data.birth.day;
    });
    if (existing) {
      if (!confirm('"' + data.name + '"의 동일 날짜 프로필이 있습니다. 덮어쓸까요?')) return;
      DPStorage.remove(existing.id);
    }
    var saved = DPStorage.add(data);
    DPStorage.setCurrent(saved.id);
    spawnStardust(document.getElementById('dpSaveBtn'));
    renderMasterCard(DPStorage.current());
    renderProfileList();
    broadcastProfileChange(saved);
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
    DPStorage.setCurrent(id);
    var p = DPStorage.current();
    renderMasterCard(p);
    broadcastProfileChange(p);
    dpCloseList();
    spawnStardust(document.getElementById('dpMasterCard'));
    _toast('✦ ' + (p ? _esc(p.name) : '') + ' · 프로필 활성화', 'success');
  };

  window.dpDeleteProfile = function(id) {
    var p = DPStorage.list().find(function(x) { return x.id === id; });
    if (!p) return;
    if (!confirm('"' + p.name + '" 프로필을 삭제할까요?')) return;
    DPStorage.remove(id);
    renderProfileList();
    renderMasterCard(DPStorage.current());
    broadcastProfileChange(DPStorage.current());
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
      + '<div class="dp-fsel-close-btn" onclick="window._dpCloseFortuneSel()" aria-label="닫기">✕</div>'
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
        + '<button class="dp-fsel-btn dp-fsel-btn--ziwei"  onclick="window._dpOpenFortuneType(\'ziwei\')"  style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🌌</span><span class="dp-fsel-btn-label">자미두수</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--astro"  onclick="window._dpOpenFortuneType(\'astro\')"  style="touch-action:manipulation"><span class="dp-fsel-btn-icon">✨</span><span class="dp-fsel-btn-label">점성술</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--flower" onclick="window._dpOpenFortuneType(\'flower\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🌸</span><span class="dp-fsel-btn-label">운명의 꽃</span></button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(ov);
    window._dpFortuneSelEl = ov;
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
      } else if (type === 'flower') {
        var pFlower = DPStorage.current();
        if (pFlower) _toast(_fortuneStartMessage(pFlower.name, 'flower'), 'success');
        if (typeof openDestinyFlowerStudio === 'function') {
          openDestinyFlowerStudio();
        } else if (typeof openDestinyFlower === 'function') {
          openDestinyFlower(false);
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

    /* ESC 키로 시트 닫기 */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') dpCloseList();
    });

    /* 오버레이 클릭으로 시트 닫기 */
    var overlay = document.getElementById('dpListOverlay');
    if (overlay) overlay.addEventListener('click', dpCloseList);
    var sheet = document.getElementById('dpListSheet');
    if (sheet) {
      sheet.addEventListener('click', function(e) {
        // Keep non-action clicks inside the sheet from bubbling unexpectedly.
        var targetEl = _resolveEventElement(e.target);
        if (targetEl && targetEl.closest('[data-action]')) return;
        e.stopPropagation();
      });
    }

    var closeBtn = document.querySelector('#dpListSheet .dp-sheet-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        dpCloseList();
      });
      closeBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        dpCloseList();
      }, { passive: false });
    }

    var card = document.getElementById('dpMasterCard');
    if (card) {
      /* 모바일에서 onclick 유실되는 경우를 대비해 터치 핸들러를 추가한다. */
      card.addEventListener('touchend', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (!targetEl) return;
        var menuBtn = targetEl.closest('.dp-mc-list-btn');
        if (!menuBtn) return;
        e.preventDefault();
        dpOpenList();
      }, { passive: false });
    }

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
          var item = targetEl.closest('[data-profile-id]');
          if (item && !targetEl.closest('.dp-li-del')) {
            var pid = item.getAttribute('data-profile-id');
            if (pid) { e.preventDefault(); dpSelectProfile(pid); }
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

})();
