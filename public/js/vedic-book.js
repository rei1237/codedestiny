(function () {
  'use strict';

  var TOTAL_CHAPTERS = 13;
  var API_TIMEOUT_MS = 360000;
  var POLL_INTERVAL_MS = 1800;
  var LOADING_QUOTES = [
    '라그나와 하우스를 교차 해석하는 중입니다...',
    '나크샤트라와 다샤 흐름을 안정적으로 정리하는 중입니다...',
    '챕터별 근거 데이터와 해석 문장을 검증하는 중입니다...',
    '실전 조언을 챕터 문맥에 맞게 정리하는 중입니다...'
  ];

  var VEDIC_COIN_BASE_COST = 390;
  var VEDIC_COIN_COMPAT_EXTRA_COST = 100;
  var VEDIC_COIN_FEATURE_KEY = 'premium-vedic-report';
  var VEDIC_COIN_FEATURE_KEY_COMPAT = 'premium-vedic-report-compat';
  var VEDIC_COIN_REASON = '베다 점성술 프리미엄 PDF 리포트 생성';
  var VEDIC_COIN_REASON_COMPAT = '베다 점성술 프리미엄 PDF 궁합 리포트 생성';
  var VEDIC_PREMIUM_REPORT_TYPE = 'vedicPremium';
  var VEDIC_PREMIUM_FEATURE_TYPE = 'vedic_premium';

  var VEDIC_LOADING_FLOW_PERSONAL = [
    '라그나 기준점을 정밀 교정하는 중입니다...',
    '나크샤트라 기질 축을 해석하는 중입니다...',
    '행성 하우스 배치를 교차 검증하는 중입니다...',
    '커리어·소명 흐름을 정리하는 중입니다...',
    '재정·기회 구간을 분석하는 중입니다...',
    '관계·정서 패턴을 해석하는 중입니다...',
    '건강·에너지 리듬을 도출하는 중입니다...',
    '다샤 전환 타이밍을 계산하는 중입니다...',
    '위기 회피와 성장 전략을 구성하는 중입니다...',
    '실천 루틴과 실행 가이드를 작성하는 중입니다...',
    '연간 흐름과 장기 로드맵을 연결하는 중입니다...',
    '베다 리포트 최종 교정을 진행하는 중입니다...'
  ];

  var VEDIC_LOADING_FLOW_COMPAT = [
    '두 사람의 라그나 축을 동기화하는 중입니다...',
    '정서 교감 패턴을 해석하는 중입니다...',
    '소통·갈등 트리거를 추적하는 중입니다...',
    '관계 안정성 지표를 계산하는 중입니다...',
    '친밀도와 관계 리듬을 분석하는 중입니다...',
    '동거·결혼 현실 구간을 정리하는 중입니다...',
    '재정·역할 분담 균형을 도출하는 중입니다...',
    '다샤 동조/충돌 포인트를 계산하는 중입니다...',
    '위기 대응 시나리오를 작성하는 중입니다...',
    '장기 관계 운영 규칙을 정리하는 중입니다...',
    '관계 성장 플랜을 통합하는 중입니다...',
    '베다 궁합 리포트 최종 교정을 진행하는 중입니다...'
  ];

  var state = {
    generating: false,
    mode: 'personal',
    reportId: '',
    downloadUrl: '',
    chapters: [],
    quoteTick: 0,
    paidGateKey: '',
    paymentContext: null,
    refundInFlight: false,
    lastRequestBody: null
  };

  function qs(id) { return document.getElementById(id); }
  function qsa(root, selector) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function notify(message) {
    try {
      if (typeof window.showToast === 'function') window.showToast(String(message || ''));
      else window.alert(String(message || ''));
    } catch (_) {}
  }

  function safeParseJson(raw, fallback) {
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function normalizeCalType(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'lunar' || v === 'l' || v === '음력') return 'lunar';
    if (v === 'lunar_leap' || v === 'leap' || v === '윤달' || v === '윤') return 'lunar_leap';
    return 'solar';
  }

  function parseDateParts(raw) {
    var src = String(raw || '').trim();
    var m = src.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  function parseTimeParts(raw) {
    var src = String(raw || '').trim();
    var m = src.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;
    return { hour: Number(m[1]), minute: Number(m[2]) };
  }

  function getAuthToken() {
    try { return String(localStorage.getItem('fortune_auth_token') || '').trim(); }
    catch (_) { return ''; }
  }

  async function requestJson(url, options) {
    var opts = options || {};
    var headers = new Headers(opts.headers || {});
    headers.set('Content-Type', 'application/json');
    var token = getAuthToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = null;
    if (controller) timer = setTimeout(function () { controller.abort(); }, API_TIMEOUT_MS);

    try {
      var res = await fetch(url, {
        method: opts.method || 'GET',
        credentials: 'include',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller ? controller.signal : undefined
      });
      var data = null;
      try { data = await res.json(); } catch (_) { data = null; }
      return { ok: res.ok, status: res.status, data: data };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        data: { ok: false, message: String(error && error.message || '요청 중 오류가 발생했습니다.') }
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function premiumAuthJson(pathname, body, options) {
    if (typeof window.__cdPremiumAuthJson === 'function') {
      return window.__cdPremiumAuthJson(pathname, body || {}, options || {});
    }
    var res = await requestJson(pathname, {
      method: 'POST',
      body: body || {}
    });
    var data = (res && res.data && typeof res.data === 'object') ? res.data : {};
    if (!res.ok) data.status = Number(data.status || res.status || 0);
    return data;
  }

  function buildPreflightMessage(response, fallback) {
    var base = String((response && response.message) || fallback || '생성 전 데이터 검증에 실패했습니다.');
    var blocked = Array.isArray(response && response.blockedChapters) ? response.blockedChapters : [];
    if (!blocked.length) return base;
    var first = blocked[0] || {};
    var title = String(first.chapterTitle || ('챕터 ' + String(first.chapterId || ''))).trim();
    var missing = Array.isArray(first.missingFields) ? first.missingFields.filter(Boolean) : [];
    if (!missing.length) return base;
    return base + ' (' + title + ' · 누락: ' + missing.slice(0, 2).join(', ') + ')';
  }

  async function ensureVedicPremiumPreflight(requestBody) {
    var prepared = null;
    var reportSessionId = '';
    for (var attempt = 0; attempt < 3; attempt += 1) {
      prepared = await premiumAuthJson('/api/premium-report/prepare', {
        featureType: VEDIC_PREMIUM_FEATURE_TYPE,
        reportType: VEDIC_PREMIUM_REPORT_TYPE,
        requestBody: requestBody || {},
        requestId: 'vedic:prepare:' + Date.now().toString(36) + ':' + attempt
      }, {
        maxAttempts: 2
      });
      var preparedCode = String((prepared && prepared.code) || '').toUpperCase();
      var preparedStatus = Number((prepared && prepared.status) || 0);
      var waitForPaymentSync = !prepared || !prepared.ok
        ? (preparedStatus === 402 || preparedCode === 'PAYMENT_REQUIRED')
        : false;
      if (!waitForPaymentSync) break;
      await delay(450);
    }

    if (!prepared || !prepared.ok || !prepared.reportSessionId) {
      return {
        ok: false,
        message: buildPreflightMessage(prepared, '결제 확인/세션 준비에 실패했습니다.'),
      };
    }
    reportSessionId = String(prepared.reportSessionId || '');

    var preflight = null;
    for (var preflightAttempt = 0; preflightAttempt < 2; preflightAttempt += 1) {
      preflight = await premiumAuthJson('/api/premium-report/preflight', {
        reportSessionId: reportSessionId,
        reportType: VEDIC_PREMIUM_REPORT_TYPE,
        featureType: VEDIC_PREMIUM_FEATURE_TYPE,
        requestBody: requestBody || {},
        requestId: 'vedic:preflight:' + Date.now().toString(36) + ':' + preflightAttempt
      }, {
        maxAttempts: 2
      });

      if (preflight && preflight.ok) {
        return { ok: true };
      }

      var preflightCode = String((preflight && preflight.code) || '').toUpperCase();
      var isSessionMiss = preflightCode === 'REPORT_SESSION_NOT_FOUND' || preflightCode === 'PREMIUM_REPORT_SESSION_NOT_FOUND' || Number((preflight && preflight.status) || 0) === 404;
      if (!isSessionMiss || preflightAttempt > 0) {
        break;
      }

      prepared = await premiumAuthJson('/api/premium-report/prepare', {
        featureType: VEDIC_PREMIUM_FEATURE_TYPE,
        reportType: VEDIC_PREMIUM_REPORT_TYPE,
        requestBody: requestBody || {},
        requestId: 'vedic:prepare:recover:' + Date.now().toString(36)
      }, {
        maxAttempts: 2
      });

      if (!prepared || !prepared.ok || !prepared.reportSessionId) {
        return {
          ok: false,
          message: buildPreflightMessage(prepared, '세션 복구 중 실패했습니다.'),
        };
      }
      reportSessionId = String(prepared.reportSessionId || '');
    }

    if (!preflight || !preflight.ok) {
      return {
        ok: false,
        message: buildPreflightMessage(preflight, '생성 전 데이터 점검(preflight)에서 실패했습니다.'),
      };
    }

    return {
      ok: true,
      reportSessionId: reportSessionId,
      snapshotId: String((preflight && preflight.snapshotId) || (prepared && prepared.snapshotId) || ''),
      totalChapters: Number((prepared && prepared.totalChapters) || (preflight && preflight.totalChapters) || TOTAL_CHAPTERS),
      chapterPlan: Array.isArray(prepared && prepared.chapterPlan) ? prepared.chapterPlan : []
    };
  }

  function buildProfileFromCardRow(row) {
    if (!row || typeof row !== 'object') return null;
    var birth = (row.birth && typeof row.birth === 'object') ? row.birth : null;
    var parsedDate = parseDateParts((birth && birth.birthDate) || row.birthDate || row.dateOfBirth || '');
    var parsedTime = parseTimeParts((birth && birth.birthTime) || row.birthTime || '');

    var year = Number((birth && birth.year) || (parsedDate && parsedDate.year) || row.birthYear || row.year || 0);
    var month = Number((birth && birth.month) || (parsedDate && parsedDate.month) || row.birthMonth || row.month || 0);
    var day = Number((birth && birth.day) || (parsedDate && parsedDate.day) || row.birthDay || row.day || 0);
    if (!(year > 0 && month > 0 && day > 0)) return null;

    var hour = Number((birth && birth.hour) || (parsedTime && parsedTime.hour) || row.birthHour || row.hour);
    var minute = Number((birth && birth.minute) || (parsedTime && parsedTime.minute) || row.birthMinute || row.minute);
    var calType = normalizeCalType((birth && (birth.calType || birth.calendarType)) || row.calType || row.calendarType || 'solar');
    var location = (row.location && typeof row.location === 'object') ? row.location : {};

    return {
      profileId: String(row.profileId || row.id || '').trim(),
      id: String(row.id || row.profileId || '').trim(),
      name: String(row.name || row.nickname || row.profileName || '사용자'),
      gender: String(row.gender || ''),
      birthPlace: String(row.birthPlace || row.place || location.birthPlace || '').trim(),
      birth: {
        year: year,
        month: month,
        day: day,
        hour: Number.isFinite(hour) ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
        calType: calType,
        calendarType: calType,
        timeUnknown: !!((birth && (birth.timeUnknown || birth.birthTimeUnknown || birth.unknownTime)) || row.timeUnknown || row.birthTimeUnknown),
        birthDate: [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-'),
        birthTime: String(Number.isFinite(hour) ? hour : 12).padStart(2, '0') + ':' + String(Number.isFinite(minute) ? minute : 0).padStart(2, '0')
      },
      location: {
        tz: String(location.tz || row.timezone || row.tz || 'Asia/Seoul').trim() || 'Asia/Seoul',
        lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
        lng: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780),
        birthPlace: String(location.birthPlace || row.birthPlace || row.place || '').trim()
      }
    };
  }

  function getCurrentProfileFromStorage() {
    try {
      var list = safeParseJson(localStorage.getItem('FORTUNE_APP_USER_PROFILES.list') || '[]', []);
      var currentId = String(localStorage.getItem('FORTUNE_APP_USER_PROFILES.current') || '').trim();
      if (!Array.isArray(list) || !list.length) return null;
      if (currentId) {
        for (var i = 0; i < list.length; i += 1) {
          var row = list[i] || {};
          if (String(row.id || '').trim() === currentId) return buildProfileFromCardRow(row);
        }
      }
      return buildProfileFromCardRow(list[0] || null);
    } catch (_) {
      return null;
    }
  }

  function getProfileFromStorage() {
    try {
      var currentProfile = getCurrentProfileFromStorage();
      if (currentProfile) return currentProfile;

      var user = safeParseJson(localStorage.getItem('fortune_auth_user') || 'null', null);
      if (!user) return null;
      var parsedDate = parseDateParts(user.birthDate || user.dateOfBirth || '');
      var parsedTime = parseTimeParts(user.birthTime || '');
      if (!parsedDate) return null;
      var calType = normalizeCalType(user.calType || user.calendarType || 'solar');
      return {
        profileId: String(user.profileId || user.id || '').trim(),
        id: String(user.id || user.profileId || '').trim(),
        name: String(user.name || user.nickname || '사용자'),
        gender: String(user.gender || ''),
        birthPlace: String(user.birthPlace || user.place || '').trim(),
        birth: {
          year: Number(parsedDate.year),
          month: Number(parsedDate.month),
          day: Number(parsedDate.day),
          hour: parsedTime ? Number(parsedTime.hour) : 12,
          minute: parsedTime ? Number(parsedTime.minute) : 0,
          calType: calType,
          calendarType: calType,
          timeUnknown: !!(user.timeUnknown || user.birthTimeUnknown),
          birthDate: [parsedDate.year, String(parsedDate.month).padStart(2, '0'), String(parsedDate.day).padStart(2, '0')].join('-'),
          birthTime: String(parsedTime ? parsedTime.hour : 12).padStart(2, '0') + ':' + String(parsedTime ? parsedTime.minute : 0).padStart(2, '0')
        },
        location: {
          tz: String(user.timezone || user.tz || 'Asia/Seoul').trim() || 'Asia/Seoul',
          lat: 37.5665,
          lng: 126.9780,
          birthPlace: String(user.birthPlace || user.place || '').trim()
        }
      };
    } catch (_) {
      return null;
    }
  }

  function getActiveProfile() {
    var profile = null;
    try { profile = window.__cdActiveBirthProfile || null; } catch (_) { profile = null; }
    if (profile && profile.birth && Number(profile.birth.year) > 0) return profile;
    return getProfileFromStorage();
  }

  function hasProfile() {
    var p = getActiveProfile();
    return !!(p && p.birth && Number(p.birth.year) > 0 && Number(p.birth.month) > 0 && Number(p.birth.day) > 0);
  }

  function formatProfileSummary(profile) {
    if (!profile || !profile.birth) return '생년월일 정보를 찾을 수 없습니다.';
    var b = profile.birth;
    var date = [b.year, String(b.month || '').padStart(2, '0'), String(b.day || '').padStart(2, '0')].join('-');
    var time = String(Number.isFinite(Number(b.hour)) ? Number(b.hour) : 12).padStart(2, '0')
      + ':' + String(Number.isFinite(Number(b.minute)) ? Number(b.minute) : 0).padStart(2, '0');
    var cal = String(b.calType || b.calendarType || 'solar').toLowerCase();
    var calLabel = cal === 'lunar' ? '음력' : (cal === 'lunar_leap' ? '음력(윤달)' : '양력');
    return [String(profile.name || '사용자') + ' · ' + date, calLabel + ' · ' + time].join(' · ');
  }

  function showOnly(screenId) {
    var screens = ['vdStartScreen', 'vdLoadingScreen', 'vdResultScreen', 'vdErrorScreen', 'vdNoProfileScreen'];
    for (var i = 0; i < screens.length; i += 1) {
      var el = qs(screens[i]);
      if (el) el.style.display = screens[i] === screenId ? '' : 'none';
    }
  }

  function setError(message) {
    var el = qs('vdErrorMsg');
    if (el) el.textContent = String(message || '생성 중 오류가 발생했습니다.');
    showOnly('vdErrorScreen');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toParagraphHtml(text) {
    var safe = escapeHtml(text || '').replace(/\r/g, '').replace(/\n{2,}/g, '\n\n').replace(/\n/g, '<br>');
    return '<p>' + safe + '</p>';
  }

  function ensureModeUi() {
    var startScreen = qs('vdStartScreen');
    if (!startScreen) return;
    if (qs('vdModePanel')) return;

    var panel = document.createElement('div');
    panel.id = 'vdModePanel';
    panel.style.cssText = 'margin:14px 0 12px;padding:14px;border:1px solid rgba(251,146,60,0.35);border-radius:12px;background:rgba(30,15,8,0.45);';
    panel.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">',
      '  <strong style="font-size:13px;color:#fed7aa;">리포트 모드</strong>',
      '  <div style="display:flex;gap:10px;align-items:center;">',
      '    <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:#ffe7c2;cursor:pointer;">',
      '      <input type="radio" name="vdReportMode" id="vdModePersonal" value="personal" checked> 개인',
      '    </label>',
      '    <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:#ffe7c2;cursor:pointer;">',
      '      <input type="radio" name="vdReportMode" id="vdModeCompat" value="compatibility"> 궁합',
      '    </label>',
      '  </div>',
      '</div>',
      '<div id="vdPartnerWrap" style="display:none;margin-top:12px;border-top:1px dashed rgba(251,146,60,0.35);padding-top:12px;">',
      '  <p style="margin:0 0 10px;font-size:12px;color:#fcd9b6;">궁합 모드는 상대 생년월일이 필요합니다. (시간 미상 시 12:00 권장)</p>',
      '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">',
      '    <input id="vdPartnerName" type="text" placeholder="상대 이름" style="padding:10px;border-radius:10px;border:1px solid rgba(251,146,60,0.35);background:#160b04;color:#fff;">',
      '    <input id="vdPartnerBirthDate" type="date" style="padding:10px;border-radius:10px;border:1px solid rgba(251,146,60,0.35);background:#160b04;color:#fff;">',
      '    <input id="vdPartnerHour" type="number" min="0" max="23" value="12" placeholder="시(0~23)" style="padding:10px;border-radius:10px;border:1px solid rgba(251,146,60,0.35);background:#160b04;color:#fff;">',
      '    <input id="vdPartnerMinute" type="number" min="0" max="59" value="0" placeholder="분(0~59)" style="padding:10px;border-radius:10px;border:1px solid rgba(251,146,60,0.35);background:#160b04;color:#fff;">',
      '  </div>',
      '</div>'
    ].join('');

    var profileBox = startScreen.querySelector('.lb-start__profile-box');
    if (profileBox && profileBox.parentNode) {
      profileBox.parentNode.insertBefore(panel, profileBox.nextSibling);
    } else {
      startScreen.appendChild(panel);
    }

    function syncPartnerVisibility() {
      var wrap = qs('vdPartnerWrap');
      if (!wrap) return;
      wrap.style.display = getSelectedMode() === 'compatibility' ? '' : 'none';
    }

    var radios = qsa(panel, 'input[name="vdReportMode"]');
    for (var i = 0; i < radios.length; i += 1) {
      radios[i].addEventListener('change', syncPartnerVisibility);
    }
    syncPartnerVisibility();
  }

  function getSelectedMode() {
    var checked = document.querySelector('input[name="vdReportMode"]:checked');
    var mode = checked ? String(checked.value || '') : 'personal';
    return mode === 'compatibility' ? 'compatibility' : 'personal';
  }

  function readPartnerInput() {
    var dateRaw = String((qs('vdPartnerBirthDate') && qs('vdPartnerBirthDate').value) || '').trim();
    var dm = dateRaw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dm) return null;
    var hour = Number((qs('vdPartnerHour') && qs('vdPartnerHour').value) || 12);
    var minute = Number((qs('vdPartnerMinute') && qs('vdPartnerMinute').value) || 0);
    return {
      name: String((qs('vdPartnerName') && qs('vdPartnerName').value) || '').trim() || '상대',
      year: Number(dm[1]),
      month: Number(dm[2]),
      day: Number(dm[3]),
      hour: Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 12,
      minute: Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0
    };
  }

  function buildRequestBody() {
    var profile = getActiveProfile() || {};
    var birth = profile.birth || {};
    var location = profile.location || {};
    var mode = getSelectedMode();
    var profileId = String(profile.profileId || profile.id || '').trim();
    var birthDate = [
      Number(birth.year || 0),
      String(Number(birth.month || 0)).padStart(2, '0'),
      String(Number(birth.day || 0)).padStart(2, '0')
    ].join('-');
    var birthTime = String(Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : 12).padStart(2, '0')
      + ':' + String(Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0).padStart(2, '0');
    var calendarType = normalizeCalType(birth.calType || birth.calendarType || 'solar');
    var timeUnknown = !!(birth.timeUnknown || birth.birthTimeUnknown || birth.unknownTime);
    var isLunar = calendarType === 'lunar' || calendarType === 'lunar_leap';
    var birthPlace = String(profile.birthPlace || location.birthPlace || profile.place || '').trim();

    var body = {
      mode: mode,
      reportMode: mode,
      reportType: mode,
      _premiumStrictPayload: true,
      _premiumStrictValidation: true,
      includeCompatibility: mode === 'compatibility',
      profileId: profileId,
      name: String(profile.name || '사용자'),
      gender: String(profile.gender || ''),
      year: Number(birth.year || 0),
      month: Number(birth.month || 0),
      day: Number(birth.day || 0),
      hour: Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12),
      minute: Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0),
      birthDate: birthDate,
      birthTime: birthTime,
      calType: calendarType,
      calendarType: calendarType,
      timeUnknown: timeUnknown,
      isLunar: isLunar,
      birthPlace: birthPlace || undefined,
      timezoneName: String(location.tz || 'Asia/Seoul'),
      timezone: String(location.tz || 'Asia/Seoul'),
      lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
      lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780),
      birthData: {
        profileId: profileId,
        name: String(profile.name || '사용자'),
        gender: String(profile.gender || ''),
        year: Number(birth.year || 0),
        month: Number(birth.month || 0),
        day: Number(birth.day || 0),
        hour: Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12),
        minute: Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0),
        birthDate: birthDate,
        birthTime: birthTime,
        calType: calendarType,
        calendarType: calendarType,
        timeUnknown: timeUnknown,
        isLunar: isLunar,
        birthPlace: birthPlace || undefined,
        timezoneName: String(location.tz || 'Asia/Seoul'),
        timezone: String(location.tz || 'Asia/Seoul'),
        lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
        lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780)
      },
      profile: {
        profileId: profileId,
        name: String(profile.name || '사용자'),
        gender: String(profile.gender || ''),
        birthDate: birthDate,
        birthTime: birthTime,
        calendarType: calendarType,
        isLunar: isLunar,
        timeUnknown: timeUnknown,
        birthPlace: birthPlace || undefined,
        timezone: String(location.tz || 'Asia/Seoul')
      }
    };

    if (mode === 'compatibility') {
      var partner = readPartnerInput();
      if (!partner) return { ok: false, message: '궁합 모드는 상대 생년월일이 필요합니다.' };
      body.partnerName = partner.name;
      body.partnerYear = partner.year;
      body.partnerMonth = partner.month;
      body.partnerDay = partner.day;
      body.partnerHour = partner.hour;
      body.partnerMinute = partner.minute;
      body.partnerBirthData = {
        name: partner.name,
        year: partner.year,
        month: partner.month,
        day: partner.day,
        hour: partner.hour,
        minute: partner.minute,
        birthDate: [partner.year, String(partner.month).padStart(2, '0'), String(partner.day).padStart(2, '0')].join('-'),
        birthTime: String(partner.hour).padStart(2, '0') + ':' + String(partner.minute).padStart(2, '0'),
        timezoneName: String(location.tz || 'Asia/Seoul'),
        timezone: String(location.tz || 'Asia/Seoul'),
        lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
        lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780)
      };
    }

    return { ok: true, body: body };
  }

  function resetDots(activeChapter) {
    var modal = qs('vedicBookModal');
    var dots = qsa(modal, '.vd-ch-dot');
    for (var i = 0; i < dots.length; i += 1) {
      var dot = dots[i];
      var chapter = Number(dot.getAttribute('data-vdch') || 0);
      dot.classList.remove('lb-ch-dot--pending', 'lb-ch-dot--active', 'lb-ch-dot--done');
      if (chapter < 1 || chapter > TOTAL_CHAPTERS) continue;
      if (chapter < activeChapter) dot.classList.add('lb-ch-dot--done');
      else if (chapter === activeChapter) dot.classList.add('lb-ch-dot--active');
      else dot.classList.add('lb-ch-dot--pending');
    }
  }

  function setLoadingProgress(payload) {
    var currentChapter = Number(payload && payload.currentChapter || 0);
    var status = String(payload && payload.status || 'generating');
    var completed = status === 'completed' ? TOTAL_CHAPTERS : Math.max(0, Math.min(TOTAL_CHAPTERS, currentChapter));
    var nextChapter = Math.max(1, Math.min(TOTAL_CHAPTERS, currentChapter || 1));
    var progress = Math.round((completed / TOTAL_CHAPTERS) * 100);
    var flow = state.mode === 'compatibility' ? VEDIC_LOADING_FLOW_COMPAT : VEDIC_LOADING_FLOW_PERSONAL;
    var message = status === 'completed'
      ? '베다 리포트 최종 편집을 마무리하고 있습니다...'
      : String(flow[Math.max(0, Math.min(flow.length - 1, nextChapter - 1))] || '베다 챕터를 생성하는 중입니다...');

    var bar = qs('vdProgressBar');
    var text = qs('vdProgressText');
    var num = qs('vdLoadingChapterNum');
    var label = qs('vdLoadingChapter');
    var quote = qs('vdMysticQuote');

    if (bar) bar.style.width = progress + '%';
    if (text) text.textContent = completed + ' / ' + TOTAL_CHAPTERS + ' 챕터';
    if (num) num.textContent = 'Chapter ' + nextChapter;
    if (label) label.textContent = message;
    if (quote) {
      state.quoteTick += 1;
      quote.textContent = LOADING_QUOTES[state.quoteTick % LOADING_QUOTES.length];
    }
    resetDots(nextChapter);
  }

  function buildVedicGateKey(body) {
    var b = body || {};
    var mode = String(b.mode || 'personal');
    var chunks = [
      mode,
      Number(b.year || 0), Number(b.month || 0), Number(b.day || 0),
      Number(b.hour || 12), Number(b.minute || 0)
    ];
    if (mode === 'compatibility') {
      chunks.push(
        Number(b.partnerYear || 0), Number(b.partnerMonth || 0), Number(b.partnerDay || 0),
        Number(b.partnerHour || 12), Number(b.partnerMinute || 0)
      );
    }
    return chunks.join('|');
  }

  function resolveVedicCoinPolicy(body) {
    var mode = String(body && body.mode || 'personal');
    var isCompat = mode === 'compatibility';
    return {
      cost: VEDIC_COIN_BASE_COST + (isCompat ? VEDIC_COIN_COMPAT_EXTRA_COST : 0),
      featureKey: isCompat ? VEDIC_COIN_FEATURE_KEY_COMPAT : VEDIC_COIN_FEATURE_KEY,
      reason: isCompat ? VEDIC_COIN_REASON_COMPAT : VEDIC_COIN_REASON,
      modeLabel: isCompat ? '궁합' : '개인'
    };
  }

  function extractCoinGatePayload(data) {
    if (data && typeof data.data === 'object') return data.data;
    return data || {};
  }

  async function attemptVedicAutoRefund(reason) {
    if (state.refundInFlight) return false;
    var ctx = state.paymentContext;
    if (!ctx || !ctx.featureKey || !Number(ctx.cost)) return false;

    state.refundInFlight = true;
    try {
      var refundRes = await requestJson('/api/fortune/pig-coin/refund', {
        method: 'POST',
        body: {
          cost: Number(ctx.cost),
          featureKey: String(ctx.featureKey),
          sourceTransactionId: String(ctx.sourceTransactionId || ''),
          requestId: String(('refund:' + (ctx.requestId || state.reportId || Date.now())).slice(0, 120)),
          reason: String(reason || '베다 프리미엄 PDF 생성 실패 자동 환불')
        }
      });

      var payload = refundRes.data || {};
      var code = String(payload.code || '').toUpperCase();
      if (refundRes.ok || code === 'REFUND_ALREADY_PROCESSED') {
        state.paymentContext = null;
        state.paidGateKey = '';
        return true;
      }

      console.warn('[VedicBook] auto refund failed:', payload);
      return false;
    } catch (error) {
      console.warn('[VedicBook] auto refund exception:', error);
      return false;
    } finally {
      state.refundInFlight = false;
    }
  }

  async function ensureVedicCoinGate(body) {
    var gateKey = buildVedicGateKey(body);
    if (state.paidGateKey && state.paidGateKey === gateKey) return true;
    var policy = resolveVedicCoinPolicy(body);

    try {
      if (window.__cdAdminBypass === true) {
        state.paidGateKey = gateKey;
        return true;
      }
    } catch (_) {}

    if (!window.confirm('🪙 베다 프리미엄 ' + policy.modeLabel + ' 리포트 생성\n이용 시 ' + policy.cost + '코인이 차감됩니다.\n지금 생성하시겠습니까?')) {
      return false;
    }

    var requestId = 'premium-vedic:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    var res = await requestJson('/api/billing/coin-gate', {
      method: 'POST',
      body: {
        featureKey: policy.featureKey,
        reason: policy.reason,
        forceDeduct: true,
        requestId: requestId
      }
    });

    var data = (res && res.data) || {};
    var code = String((data && data.code) || '').toUpperCase();
    if (res.status === 401 || res.status === 403 || code === 'AUTH_REQUIRED') {
      if (typeof window.__cdOpenLoginRequiredModal === 'function') {
        window.__cdOpenLoginRequiredModal({
          reason: '로그인 후 베다 프리미엄 리포트를 생성할 수 있습니다.',
          redirectTo: window.location.pathname + window.location.search + window.location.hash
        });
      } else {
        window.location.href = '/login?next=%2F';
      }
      return false;
    }

    if (res.status === 402 || code === 'PAYMENT_REQUIRED' || code === 'INSUFFICIENT_COINS') {
      window.alert(String(data.message || '코인이 부족합니다. 충전 후 다시 시도해 주세요.'));
      if (typeof window.__cdOpenChargeModal === 'function') window.__cdOpenChargeModal();
      return false;
    }

    if (!res.ok || !data || data.ok === false) {
      window.alert(String(data.message || '코인 결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
      return false;
    }

    var payload = extractCoinGatePayload(data);
    var consume = payload && typeof payload.consume === 'object' ? payload.consume : {};
    var sourceTransactionId = String(consume.transactionId || payload.transactionId || '');
    var chargedCoins = Number(consume.chargedCoins || payload.chargedCoins || 0);
    var freeBySubscription = Boolean(consume.freeBySubscription || payload.freeBySubscription);
    var coinGateConfirmed = Number(res.status || 0) === 200
      && (!Number(policy.cost || 0) || !!sourceTransactionId || freeBySubscription || chargedCoins <= 0);
    if (!coinGateConfirmed) {
      window.alert('코인 결제 확인값이 부족하여 리포트 생성을 시작하지 않았습니다. 다시 시도해 주세요.');
      return false;
    }

    state.paymentContext = {
      featureKey: String(policy.featureKey || ''),
      cost: Number(policy.cost || 0),
      requestId: String(requestId || ''),
      sourceTransactionId: sourceTransactionId,
      mode: String(policy.modeLabel || '')
    };
    state.paidGateKey = gateKey;
    return true;
  }

  function buildChapterArticle(chapter, index) {
    var sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    var insights = Array.isArray(chapter.keyInsights) ? chapter.keyInsights : [];
    var advice = Array.isArray(chapter.practicalAdvice) ? chapter.practicalAdvice : [];

    var sectionsHtml = sections.map(function (section) {
      return '<section class="lb-result-article__section">'
        + '<h4>' + escapeHtml(section.heading || '') + '</h4>'
        + toParagraphHtml(section.body || '')
        + '</section>';
    }).join('');

    var insightsHtml = insights.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');
    var adviceHtml = advice.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');

    return '<article class="lb-result-article" data-vd-article="' + index + '">'
      + '<p class="lb-result-article__chapter">CHAPTER ' + index + '</p>'
      + '<h3 class="lb-result-article__title">' + escapeHtml(chapter.title || ('Chapter ' + index)) + '</h3>'
      + (chapter.subtitle ? '<p class="lb-result-article__subtitle">' + escapeHtml(chapter.subtitle) + '</p>' : '')
      + (chapter.summary ? '<div class="lb-result-article__summary">' + toParagraphHtml(chapter.summary) + '</div>' : '')
      + '<div class="lb-result-article__body">' + sectionsHtml + '</div>'
      + '<div class="lb-result-article__extras" style="display:grid;gap:12px;">'
      + '<div class="lb-result-article__list"><h5>핵심 통찰</h5><ul>' + insightsHtml + '</ul></div>'
      + '<div class="lb-result-article__list"><h5>실천 조언</h5><ul>' + adviceHtml + '</ul></div>'
      + '</div>'
      + '</article>';
  }

  function inferChapterSummary(text) {
    var source = String(text || '').trim();
    if (!source) return '';
    var compact = source.replace(/\r/g, '').replace(/\n+/g, ' ').trim();
    if (compact.length <= 220) return compact;
    return compact.slice(0, 220).trim() + '...';
  }

  function normalizePremiumChapterSections(rawSections, fallbackText) {
    var sections = Array.isArray(rawSections) ? rawSections : [];
    var normalized = sections.map(function (section) {
      var heading = String((section && (section.heading || section.title || section.name)) || '').trim();
      var body = String((section && (section.body || section.content || section.text)) || '').trim();
      if (!heading && !body) return null;
      return {
        heading: heading || '핵심 해석',
        body: body || ''
      };
    }).filter(Boolean);

    if (normalized.length) return normalized;
    var fallback = String(fallbackText || '').trim();
    if (!fallback) return [];
    return [{ heading: '핵심 해석', body: fallback }];
  }

  function normalizeVedicPremiumChapter(data, chapterId, chapterPlan) {
    var chapterJson = (data && data.chapterJson && typeof data.chapterJson === 'object') ? data.chapterJson : null;
    var chapterMeta = (data && data.chapterMeta && typeof data.chapterMeta === 'object')
      ? data.chapterMeta
      : ((Array.isArray(chapterPlan) ? chapterPlan[chapterId - 1] : null) || {});
    var text = String((data && data.text) || '').trim();
    var sections = normalizePremiumChapterSections(data && data.sections, text);
    var title = String((chapterMeta && (chapterMeta.title || chapterMeta.name)) || (chapterJson && chapterJson.title) || ('Chapter ' + chapterId)).trim();
    var subtitle = String((chapterMeta && chapterMeta.subtitle) || (chapterJson && chapterJson.subtitle) || '').trim();
    var summary = String((chapterJson && chapterJson.summary) || inferChapterSummary(text)).trim();
    var keyInsights = chapterJson
      ? (Array.isArray(chapterJson.keyInsights) ? chapterJson.keyInsights : (Array.isArray(chapterJson.cautions) ? chapterJson.cautions : []))
      : [];
    var practicalAdvice = chapterJson && Array.isArray(chapterJson.practicalAdvice) ? chapterJson.practicalAdvice : [];

    return {
      chapterIndex: chapterId,
      title: title,
      subtitle: subtitle,
      summary: summary,
      sections: sections,
      keyInsights: keyInsights,
      practicalAdvice: practicalAdvice,
      text: text,
      chapterJson: chapterJson,
      updatedAt: new Date().toISOString()
    };
  }

  async function generateVedicViaPremiumReport(requestBody, preflightInfo) {
    if (typeof window.__cdPremiumAuthJson !== 'function') {
      return { ok: false, message: '인증 모듈을 초기화하지 못했습니다.' };
    }

    var preparedInfo = preflightInfo || null;
    var reportSessionId = String((preparedInfo && preparedInfo.reportSessionId) || '').trim();
    var snapshotId = String((preparedInfo && preparedInfo.snapshotId) || '').trim();
    var chapterPlan = Array.isArray(preparedInfo && preparedInfo.chapterPlan) ? preparedInfo.chapterPlan.slice() : [];
    var totalChapters = Number((preparedInfo && preparedInfo.totalChapters) || chapterPlan.length || TOTAL_CHAPTERS);
    if (!Number.isFinite(totalChapters) || totalChapters <= 0) totalChapters = TOTAL_CHAPTERS;

    if (!reportSessionId) {
      var prepared = await premiumAuthJson('/api/premium-report/prepare', {
        featureType: VEDIC_PREMIUM_FEATURE_TYPE,
        reportType: VEDIC_PREMIUM_REPORT_TYPE,
        requestBody: requestBody || {},
        requestId: 'vedic:prepare:fallback:' + Date.now().toString(36)
      }, {
        maxAttempts: 2
      });

      if (!prepared || !prepared.ok || !prepared.reportSessionId) {
        return {
          ok: false,
          message: buildPreflightMessage(prepared, '리포트 세션 복구에 실패했습니다.')
        };
      }

      reportSessionId = String(prepared.reportSessionId || '');
      snapshotId = String(prepared.snapshotId || snapshotId || '');
      if (Array.isArray(prepared.chapterPlan) && prepared.chapterPlan.length) chapterPlan = prepared.chapterPlan.slice();
      if (Number(prepared.totalChapters) > 0) totalChapters = Number(prepared.totalChapters);
    }

    var chapters = [];

    for (var chapterId = 1; chapterId <= totalChapters; chapterId += 1) {
      setLoadingProgress({
        status: 'generating',
        currentChapter: Math.max(0, chapterId - 1),
        totalChapters: totalChapters
      });

      var chapterResult = null;
      for (var retry = 1; retry <= 4; retry += 1) {
        chapterResult = await premiumAuthJson('/api/premium-report/chapter', {
          reportSessionId: reportSessionId,
          snapshotId: snapshotId || undefined,
          chapterId: chapterId,
          reportType: VEDIC_PREMIUM_REPORT_TYPE,
          featureType: VEDIC_PREMIUM_FEATURE_TYPE,
          requestBody: requestBody || {},
          requestId: 'vedic:chapter:' + chapterId + ':' + Date.now().toString(36) + ':' + retry
        }, {
          maxAttempts: 2
        });

        if (chapterResult && chapterResult.reportSessionId) reportSessionId = String(chapterResult.reportSessionId || reportSessionId);
        if (chapterResult && chapterResult.snapshotId) snapshotId = String(chapterResult.snapshotId || snapshotId);

        if (chapterResult && chapterResult.ok) break;

        var status = Number((chapterResult && chapterResult.status) || 0);
        var code = String((chapterResult && chapterResult.code) || '').toUpperCase();
        var sessionMissing = status === 404 || code === 'PREMIUM_REPORT_SESSION_NOT_FOUND' || code === 'REPORT_SESSION_NOT_FOUND';
        var bindingMismatch = status === 409 && code === 'PREMIUM_REPORT_SESSION_BINDING_MISMATCH';
        if (sessionMissing || bindingMismatch) {
          var recovered = await premiumAuthJson('/api/premium-report/prepare', {
            featureType: VEDIC_PREMIUM_FEATURE_TYPE,
            reportType: VEDIC_PREMIUM_REPORT_TYPE,
            requestBody: requestBody || {},
            requestId: 'vedic:prepare:recover:' + Date.now().toString(36) + ':' + chapterId + ':' + retry
          }, {
            maxAttempts: 2
          });
          if (recovered && recovered.ok && recovered.reportSessionId) {
            reportSessionId = String(recovered.reportSessionId || reportSessionId);
            snapshotId = String(recovered.snapshotId || snapshotId || '');
            if (Array.isArray(recovered.chapterPlan) && recovered.chapterPlan.length) chapterPlan = recovered.chapterPlan.slice();
            if (Number(recovered.totalChapters) > 0) totalChapters = Number(recovered.totalChapters);
            await delay(220);
            continue;
          }
        }

        if (retry < 4) {
          await delay(Math.min(450 * retry, 1200));
        }
      }

      if (!chapterResult || !chapterResult.ok) {
        return {
          ok: false,
          message: String((chapterResult && chapterResult.message) || ('챕터 ' + chapterId + ' 생성에 실패했습니다.'))
        };
      }

      chapters.push(normalizeVedicPremiumChapter(chapterResult, chapterId, chapterPlan));

      setLoadingProgress({
        status: chapterId >= totalChapters ? 'completed' : 'generating',
        currentChapter: chapterId,
        totalChapters: totalChapters
      });
    }

    var pdfReady = await premiumAuthJson('/api/premium-report/pdf', {
      reportSessionId: reportSessionId,
      snapshotId: snapshotId || undefined,
      reportType: VEDIC_PREMIUM_REPORT_TYPE,
      featureType: VEDIC_PREMIUM_FEATURE_TYPE,
      requestBody: requestBody || {},
      requestId: 'vedic:pdf:' + Date.now().toString(36)
    }, {
      maxAttempts: 2
    });

    if (!pdfReady || !pdfReady.ok) {
      return {
        ok: false,
        message: String((pdfReady && pdfReady.message) || 'PDF 생성 준비 검증에 실패했습니다.')
      };
    }

    return {
      ok: true,
      reportId: reportSessionId,
      reportSessionId: reportSessionId,
      snapshotId: snapshotId,
      chapters: chapters,
      chapterPlan: chapterPlan
    };
  }

  function renderResultScreen() {
    var toc = qs('vdToc');
    var content = qs('vdChapterContent');
    var name = qs('vdResultName');
    var date = qs('vdResultDate');
    if (!toc || !content) return;

    var modeTitle = state.mode === 'compatibility' ? '베다 궁합 리포트' : '베다 인생 리포트';
    if (name) name.textContent = modeTitle;
    if (date) {
      var now = new Date();
      date.textContent = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
    }

    var chapters = Array.isArray(state.chapters) ? state.chapters.slice() : [];
    chapters.sort(function (a, b) { return Number(a.chapterIndex || 0) - Number(b.chapterIndex || 0); });

    var tocHtml = [];
    var articleHtml = [];
    for (var i = 0; i < chapters.length; i += 1) {
      var chapter = chapters[i] || {};
      var idx = Number(chapter.chapterIndex || (i + 1));
      tocHtml.push('<button type="button" class="lb-toc-item" data-vd-chapter="' + idx + '"><span>Ch.' + idx + '</span><strong>' + escapeHtml(chapter.title || ('Chapter ' + idx)) + '</strong></button>');
      articleHtml.push(buildChapterArticle(chapter, idx));
    }

    toc.innerHTML = tocHtml.join('');
    content.innerHTML = articleHtml.join('');
    showOnly('vdResultScreen');
  }

  async function pollStatusLoop() {
    for (var attempt = 0; attempt < 260; attempt += 1) {
      var res = await requestJson('/api/premium/vedic/status?reportId=' + encodeURIComponent(state.reportId) + '&includeChapters=1', { method: 'GET' });
      var data = res.data || {};
      var code = String((data && data.code) || '').toUpperCase();

      if (res.status === 401 || res.status === 403 || code === 'AUTH_REQUIRED') {
        await attemptVedicAutoRefund('베다 프리미엄 PDF 생성 중 세션 만료 자동 환불');
        if (typeof window.__cdOpenLoginRequiredModal === 'function') {
          window.__cdOpenLoginRequiredModal({
            reason: '로그인 세션이 만료되어 베다 프리미엄 리포트 생성을 중단했습니다.',
            redirectTo: window.location.pathname + window.location.search + window.location.hash
          });
        }
        setError(String(data.message || '로그인 세션이 만료되었습니다. 다시 로그인 후 시도해 주세요.'));
        return false;
      }

      if (!res.ok || !data || !data.ok) {
        var sessionMissing = Number(res.status || 0) === 404 || code === 'LEGACY_SESSION_NOT_FOUND';
        if (sessionMissing && state.lastRequestBody && typeof window.__cdPremiumAuthJson === 'function') {
          setLoadingProgress({ currentChapter: 0, status: 'generating', message: '리포트 세션을 복구하는 중...' });
          var recoveredRun = await generateVedicViaPremiumReport(state.lastRequestBody, null);
          if (recoveredRun && recoveredRun.ok) {
            state.reportId = String(recoveredRun.reportId || state.reportId || '');
            state.downloadUrl = '';
            state.chapters = Array.isArray(recoveredRun.chapters) ? recoveredRun.chapters : [];
            state.paymentContext = null;
            renderResultScreen();
            return true;
          }
        }

        if (attempt > 4) {
          await attemptVedicAutoRefund('베다 프리미엄 PDF 상태 조회 실패 자동 환불');
          setError(String(data.message || '리포트 상태 조회에 실패했습니다.'));
          return false;
        }
        await delay(POLL_INTERVAL_MS);
        continue;
      }

      state.mode = String(data.mode || state.mode || 'personal');
      state.downloadUrl = String(data.downloadUrl || state.downloadUrl || '');
      setLoadingProgress(data);

      if (String(data.status) === 'completed') {
        state.chapters = Array.isArray(data.chapters) ? data.chapters : [];
        state.paymentContext = null;
        renderResultScreen();
        return true;
      }

      if (String(data.status) === 'failed') {
        await attemptVedicAutoRefund('베다 프리미엄 PDF 생성 실패 자동 환불');
        setError(String(data.errorMessage || data.message || '리포트 생성에 실패했습니다.'));
        return false;
      }

      await delay(POLL_INTERVAL_MS);
    }

    await attemptVedicAutoRefund('베다 프리미엄 PDF 생성 미완료 자동 환불');
    setError('생성 시간이 길어지고 있습니다. 코인이 차감된 경우 자동 환불을 시도했습니다. 잠시 후 다시 시도해 주세요.');
    return false;
  }

  function updateStartUi() {
    var profile = getActiveProfile();
    var summary = qs('vdProfileSummary');
    if (summary) summary.textContent = formatProfileSummary(profile);

    var cta = qs('vdStartBtn');
    var mode = getSelectedMode();
    if (cta) cta.textContent = mode === 'compatibility' ? '💞 베다 궁합 리포트 생성하기' : '🪷 베다 인생 총람 생성하기';
  }

  function applyActiveProfileArg(profileArg) {
    if (!profileArg || !profileArg.birth) return;
    var birth = profileArg.birth;
    if (!(Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0)) return;
    try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
  }

  function blurActiveInsideModal(modal) {
    try {
      var active = document.activeElement;
      if (active && modal && modal.contains(active) && typeof active.blur === 'function') {
        active.blur();
      }
    } catch (_) {}
  }

  window.openVedicBookModal = function (profileArg) {
    var modal = qs('vedicBookModal');
    if (!modal) return;

    applyActiveProfileArg(profileArg);

    ensureModeUi();
    updateStartUi();
    showOnly(hasProfile() ? 'vdStartScreen' : 'vdNoProfileScreen');
    modal.style.display = 'flex';
    modal.style.zIndex = '100120';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
    try {
      modal.setAttribute('aria-hidden', 'false');
      var closeBtn = modal.querySelector('.lb-modal__close');
      if (closeBtn && typeof closeBtn.focus === 'function') {
        setTimeout(function () { try { closeBtn.focus(); } catch (_) {} }, 40);
      }
    } catch (_) {}
  };

  window.openVedicPremiumModal = function () { window.openVedicBookModal(); };

  window.closeVedicBookModal = function () {
    var modal = qs('vedicBookModal');
    if (!modal) return;
    blurActiveInsideModal(modal);
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.generateVedicBook = async function () {
    if (state.generating) {
      notify('이미 리포트를 생성 중입니다.');
      return;
    }
    if (!hasProfile()) {
      showOnly('vdNoProfileScreen');
      return;
    }

    ensureModeUi();
    updateStartUi();

    var requestInput = buildRequestBody();
    if (!requestInput.ok) {
      setError(requestInput.message || '입력값을 확인해 주세요.');
      return;
    }

    state.generating = true;
    state.mode = String(requestInput.body.mode || 'personal');
    state.reportId = '';
    state.downloadUrl = '';
    state.chapters = [];
    state.quoteTick = 0;
    state.lastRequestBody = requestInput.body;

    showOnly('vdLoadingScreen');
    setLoadingProgress({ currentChapter: 1, status: 'generating', message: '결제 확인 중...' });

    try {
      var gateOk = await ensureVedicCoinGate(requestInput.body);
      if (!gateOk) {
        showOnly('vdStartScreen');
        return;
      }

      setLoadingProgress({ currentChapter: 1, status: 'generating', message: '생성 전 데이터 점검 중...' });
      var preflight = await ensureVedicPremiumPreflight(requestInput.body);
      if (!preflight.ok) {
        await attemptVedicAutoRefund('베다 프리미엄 preflight 실패 자동 환불');
        state.paidGateKey = '';
        setError(String(preflight.message || '생성 전 데이터 점검에 실패했습니다.'));
        return;
      }

      setLoadingProgress({ currentChapter: 1, status: 'generating', message: '리포트 생성을 시작합니다...' });

      var res = await requestJson('/api/premium/vedic/generate', {
        method: 'POST',
        body: requestInput.body
      });

      if (!res.ok || !res.data || !res.data.ok) {
        var fallbackRun = await generateVedicViaPremiumReport(requestInput.body, preflight);
        if (fallbackRun && fallbackRun.ok) {
          state.reportId = String(fallbackRun.reportId || '');
          state.downloadUrl = '';
          state.chapters = Array.isArray(fallbackRun.chapters) ? fallbackRun.chapters : [];
          state.paymentContext = null;
          renderResultScreen();
          return;
        }
        await attemptVedicAutoRefund('베다 프리미엄 PDF 생성 시작 실패 자동 환불');
        setError(String((res.data && res.data.message) || fallbackRun && fallbackRun.message || '베다 리포트 생성 시작에 실패했습니다.'));
        return;
      }

      state.reportId = String(res.data.reportId || '');
      state.mode = String(res.data.mode || state.mode || 'personal');
      state.downloadUrl = String(res.data.downloadUrl || '');

      if (!state.reportId) {
        var reportIdFallback = await generateVedicViaPremiumReport(requestInput.body, preflight);
        if (reportIdFallback && reportIdFallback.ok) {
          state.reportId = String(reportIdFallback.reportId || '');
          state.downloadUrl = '';
          state.chapters = Array.isArray(reportIdFallback.chapters) ? reportIdFallback.chapters : [];
          state.paymentContext = null;
          renderResultScreen();
          return;
        }
        await attemptVedicAutoRefund('베다 프리미엄 PDF reportId 누락 자동 환불');
        setError(String(reportIdFallback && reportIdFallback.message || 'reportId를 받지 못했습니다. 잠시 후 다시 시도해 주세요.'));
        return;
      }

      var done = await pollStatusLoop();
      if (!done && qs('vdLoadingScreen') && qs('vdLoadingScreen').style.display !== 'none') {
        setError('리포트 생성 중 문제가 발생했습니다.');
      }
    } finally {
      state.generating = false;
    }
  };

  function buildLocalVedicPrintableHtml() {
    var profile = getActiveProfile() || {};
    var ownerName = String(profile.name || '사용자');
    var modeLabel = state.mode === 'compatibility' ? '베다 궁합 리포트' : '베다 인생 리포트';
    var now = new Date();
    var generatedAt = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
    var chapters = Array.isArray(state.chapters) ? state.chapters.slice() : [];
    chapters.sort(function (a, b) {
      return Number(a && a.chapterIndex || 0) - Number(b && b.chapterIndex || 0);
    });

    var chapterBlocks = chapters.map(function (chapter, i) {
      var chapterIndex = Number(chapter && chapter.chapterIndex || (i + 1));
      var title = String(chapter && chapter.title || ('Chapter ' + chapterIndex));
      var subtitle = String(chapter && chapter.subtitle || '');
      var summary = String(chapter && chapter.summary || '');
      var sections = Array.isArray(chapter && chapter.sections) ? chapter.sections : [];
      var advice = Array.isArray(chapter && chapter.practicalAdvice) ? chapter.practicalAdvice : [];
      var insights = Array.isArray(chapter && chapter.keyInsights) ? chapter.keyInsights : [];

      var sectionHtml = sections.map(function (section) {
        var heading = escapeHtml(section && section.heading || '핵심 해석');
        var body = toParagraphHtml(section && section.body || '');
        return '<section class="vd-print-section"><h4>' + heading + '</h4>' + body + '</section>';
      }).join('');

      var adviceHtml = advice.length
        ? '<div class="vd-print-list"><h5>실천 조언</h5><ul>' + advice.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';
      var insightsHtml = insights.length
        ? '<div class="vd-print-list"><h5>핵심 통찰</h5><ul>' + insights.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';

      return [
        '<article class="vd-print-chapter">',
        '<p class="vd-print-chip">CHAPTER ' + chapterIndex + '</p>',
        '<h2>' + escapeHtml(title) + '</h2>',
        subtitle ? '<p class="vd-print-sub">' + escapeHtml(subtitle) + '</p>' : '',
        summary ? '<div class="vd-print-summary">' + toParagraphHtml(summary) + '</div>' : '',
        sectionHtml,
        insightsHtml,
        adviceHtml,
        '</article>'
      ].join('');
    }).join('');

    return [
      '<!doctype html>',
      '<html lang="ko">',
      '<head>',
      '<meta charset="utf-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      '<title>' + escapeHtml(ownerName + '님의 ' + modeLabel) + '</title>',
      '<style>',
      'body{margin:0;padding:24px;font-family:"Noto Serif KR","Nanum Myeongjo",serif;background:#f8fafc;color:#0f172a;line-height:1.75}',
      '.vd-print-cover{padding:24px;border:1px solid #dbe5f7;border-radius:16px;background:#ffffff;margin-bottom:20px}',
      '.vd-print-cover h1{margin:0 0 8px;font-size:30px;color:#7c2d12}',
      '.vd-print-cover p{margin:2px 0;font-size:13px;color:#334155}',
      '.vd-print-chapter{margin-bottom:18px;padding:18px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;break-inside:avoid}',
      '.vd-print-chip{display:inline-block;margin:0 0 10px;padding:4px 10px;border-radius:999px;background:#ffedd5;color:#9a3412;font-weight:700;font-size:11px}',
      '.vd-print-chapter h2{margin:0 0 6px;font-size:22px;color:#111827}',
      '.vd-print-sub{margin:0 0 10px;color:#334155}',
      '.vd-print-summary{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#fff7ed;border:1px solid #fdba74}',
      '.vd-print-section{margin:0 0 10px}',
      '.vd-print-section h4{margin:0 0 6px;font-size:16px;color:#1f2937}',
      '.vd-print-list{margin-top:8px}',
      '.vd-print-list h5{margin:0 0 6px;font-size:14px;color:#1f2937}',
      '.vd-print-list ul{margin:0 0 0 18px;padding:0}',
      '.vd-print-list li{margin:0 0 5px}',
      '@media print{body{padding:0;background:#fff}.vd-print-cover,.vd-print-chapter{border:none;border-radius:0;box-shadow:none}}',
      '</style>',
      '</head>',
      '<body>',
      '<section class="vd-print-cover">',
      '<h1>' + escapeHtml(ownerName + ' · ' + modeLabel) + '</h1>',
      '<p>리포트 ID: ' + escapeHtml(String(state.reportId || 'local-preview')) + '</p>',
      '<p>생성일: ' + escapeHtml(generatedAt) + '</p>',
      '</section>',
      chapterBlocks,
      '</body>',
      '</html>'
    ].join('\n');
  }

  function openPrintWindow(html) {
    var printWindow = null;
    try {
      printWindow = window.open('', '_blank');
      if (!printWindow) return false;
      printWindow.document.open();
      printWindow.document.write(String(html || ''));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(function () {
        try { printWindow.print(); } catch (_) {}
      }, 350);
      return true;
    } catch (_) {
      return false;
    }
  }

  window.downloadVedicBookPdf = async function () {
    if (state.generating) {
      notify('아직 생성 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (!state.reportId) {
      notify('다운로드할 리포트를 찾을 수 없습니다.');
      return;
    }

    var downloadUrl = state.downloadUrl || ('/api/premium/vedic/download?reportId=' + encodeURIComponent(state.reportId));
    var headers = new Headers();
    var token = getAuthToken();
    if (token) headers.set('Authorization', 'Bearer ' + token);

    var html = '';
    var fetchError = null;
    try {
      var res = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
        headers: headers
      });

      if (!res.ok) {
        var errData = null;
        try { errData = await res.json(); } catch (_) { errData = null; }
        throw new Error(String(errData && errData.message || '다운로드에 실패했습니다.'));
      }

      var contentType = String((res.headers && res.headers.get('content-type')) || '').toLowerCase();
      if (contentType.indexOf('application/json') >= 0) {
        var payload = null;
        try { payload = await res.json(); } catch (_) { payload = null; }
        throw new Error(String(payload && payload.message || '다운로드 응답 형식이 올바르지 않습니다.'));
      }

      html = await res.text();
    } catch (error) {
      fetchError = error;
    }

    if (!html) html = buildLocalVedicPrintableHtml();
    if (!html) {
      throw (fetchError || new Error('저장 가능한 리포트 내용을 찾지 못했습니다.'));
    }

    if (openPrintWindow(html)) {
      notify('인쇄 창이 열렸습니다. 대상 프린터를 PDF로 선택해 저장해 주세요.');
      return;
    }

    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var objectUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'vedic-premium-' + (state.mode || 'personal') + '-' + (state.reportId || Date.now()) + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1200);
    notify('HTML 파일로 다운로드되었습니다. 브라우저에서 열어 인쇄 > PDF 저장을 선택해 주세요.');
  };

  window.gotoVedicPremium = function () {
    window.openVedicBookModal();
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;

    var actionEl = target.closest('[data-action]');
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      if (action === 'closeVedicBookModal') {
        window.closeVedicBookModal();
        return;
      }
    }

    var tocBtn = target.closest('[data-vd-chapter]');
    if (tocBtn) {
      var chapter = String(tocBtn.getAttribute('data-vd-chapter') || '').trim();
      var article = chapter ? document.querySelector('[data-vd-article="' + chapter + '"]') : null;
      if (article && typeof article.scrollIntoView === 'function') {
        article.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
  }, false);

  document.addEventListener('change', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    if (target.matches('input[name="vdReportMode"]')) {
      updateStartUi();
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modal = qs('vedicBookModal');
    if (modal && modal.style.display !== 'none') window.closeVedicBookModal();
  });

  function init() {
    ensureModeUi();
    updateStartUi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();