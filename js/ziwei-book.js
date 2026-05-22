(function () {
  'use strict';

  var TOTAL_CHAPTERS = 13;
  var POLL_INTERVAL_MS = 2500;
  var MAX_POLL_COUNT = 220;
  var API_TIMEOUT_MS = 420000;
  var LOADING_QUOTES = [
    '명궁·신궁 구조를 안정적으로 정렬하고 있습니다...',
    '12궁 별 배치를 챕터 문맥으로 정제하는 중입니다...',
    '사화와 대운 흐름을 보수적으로 교차 검증하고 있습니다...',
    '챕터별 품질 규칙을 검사하고 재시도하고 있습니다...'
  ];

  var PERSONAL_CHAPTERS = [
    '명궁 핵심 설계도',
    '신궁 잠재 동력',
    '12궁 별 배치 지도',
    '주성 핵심 해석',
    '관록궁 커리어 로드맵',
    '재백궁 재정 전략',
    '부처궁 관계 패턴',
    '교우궁 네트워크',
    '전택궁 공간·자산',
    '질액궁 컨디션',
    '대운 10년 파노라마',
    '유년 타이밍 전략',
    '별의 편지'
  ];

  var ZIWEI_COIN_BASE_COST = 590;
  var ZIWEI_COIN_FEATURE_KEY = 'premium-ziwei-report';
  var ZIWEI_COIN_REASON = '자미두수 프리미엄 PDF 리포트 생성';
  var ZIWEI_PREMIUM_REPORT_TYPE = 'ziweiPremium';
  var ZIWEI_PREMIUM_FEATURE_TYPE = 'jamidusu_premium';

  var state = {
    generating: false,
    mode: 'personal',
    reportId: '',
    chapters: [],
    downloadUrl: '',
    stopPolling: false,
    currentMessage: '',
    paidGateKey: '',
    paymentContext: null,
    refundInFlight: false
  };

  function qs(id) { return document.getElementById(id); }
  function qsa(root, selector) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
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

  function getAuthToken() {
    try { return String(localStorage.getItem('fortune_auth_token') || '').trim(); }
    catch (_) { return ''; }
  }

  function resolveApiUrl(input) {
    var raw = String(input || '').trim();
    if (!raw) return raw;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return raw;
    if (raw.indexOf('//') === 0) {
      try { return String(window.location.protocol || 'https:') + raw; }
      catch (_) { return raw; }
    }
    if (raw.charAt(0) === '/') {
      try {
        var origin = String(window.location.origin || '').replace(/\/$/, '');
        return origin ? (origin + raw) : raw;
      } catch (_) {
        return raw;
      }
    }
    try { return new URL(raw, window.location.href).toString(); }
    catch (_) { return raw; }
  }

  function buildApiCandidates(pathname) {
    var p = String(pathname || '');
    if (p.charAt(0) !== '/') p = '/' + p;
    var seen = {};
    var out = [];

    function pushBase(raw) {
      var b = String(raw || '').trim();
      var u = b ? (b.replace(/\/+$/, '') + p) : p;
      if (!u || seen[u]) return;
      seen[u] = true;
      out.push(u);
    }

    pushBase('');
    try { pushBase((window && window.__CD_API_BASE_URL) || ''); } catch (_) {}
    try { pushBase((window && window.CODE_DESTINY_API_BASE_URL) || ''); } catch (_) {}
    try { pushBase((window && window.__CF_PAGES_API_BASE_URL) || ''); } catch (_) {}
    try { pushBase(localStorage.getItem('fortune_api_base_url') || ''); } catch (_) {}
    try { pushBase((window && window.location && window.location.origin) || ''); } catch (_) {}

    return out.length ? out : [p];
  }

  function readPremiumAccessToken() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (token) return token;
    try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    if (token) return token;
    try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    return token;
  }

  function extractPremiumAccessTokenFromPayload(payload) {
    var source = payload && typeof payload === 'object' ? payload : {};
    var nested = source.data && typeof source.data === 'object' ? source.data : null;
    var consume = source.consume && typeof source.consume === 'object' ? source.consume : null;
    var candidates = [
      source.premiumAccessToken,
      source.premium_access_token,
      source.accessToken,
      nested && nested.premiumAccessToken,
      nested && nested.premium_access_token,
      nested && nested.accessToken,
      consume && consume.premiumAccessToken,
      consume && consume.premium_access_token,
      consume && consume.accessToken
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var token = String(candidates[i] || '').trim();
      if (token) return token;
    }
    return '';
  }

  function persistPremiumAccessToken(payload) {
    var token = extractPremiumAccessTokenFromPayload(payload);
    if (!token) return '';

    try {
      if (typeof window.__cdPersistPremiumAccessToken === 'function') {
        window.__cdPersistPremiumAccessToken(token);
        return token;
      }
    } catch (_) {}

    try { window.__cdPremiumAccessToken = token; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', token); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', token); } catch (_) {}
    return token;
  }

  function normalizePremiumPayload(raw) {
    var payload = (raw && typeof raw === 'object') ? raw : {};
    var nested = (payload.data && typeof payload.data === 'object') ? payload.data : null;
    if (!nested) return payload;

    var hasTopLevelReportState = Boolean(payload.reportId || payload.status || payload.downloadUrl || Array.isArray(payload.chapters));
    var hasNestedReportState = Boolean(nested.reportId || nested.status || nested.downloadUrl || Array.isArray(nested.chapters));
    if (!hasTopLevelReportState && hasNestedReportState) {
      var merged = Object.assign({}, nested);
      if (merged.ok == null) merged.ok = payload.ok !== false;
      return merged;
    }
    return payload;
  }

  async function requestJson(url, options) {
    var opts = options || {};
    var targetUrl = resolveApiUrl(url) || String(url || '');
    var headers = new Headers(opts.headers || {});
    headers.set('Content-Type', 'application/json');

    var token = getAuthToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = null;
    if (controller) timer = setTimeout(function () { controller.abort(); }, API_TIMEOUT_MS);

    try {
      var res = await fetch(targetUrl, {
        method: opts.method || 'GET',
        credentials: 'include',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller ? controller.signal : undefined
      });
      var data = null;
      try { data = await res.json(); } catch (_) { data = null; }
      return { ok: res.ok, status: res.status, data: data, response: res };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        data: { ok: false, message: String(error && error.message || '요청 중 오류가 발생했습니다.') },
        response: null
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function premiumAuthJson(pathname, body, options) {
    var payload = body && typeof body === 'object' ? Object.assign({}, body) : {};
    if (!payload.premiumAccessToken) {
      var premiumAccessToken = readPremiumAccessToken();
      if (premiumAccessToken) payload.premiumAccessToken = premiumAccessToken;
    }
    var targetPath = resolveApiUrl(pathname) || pathname;

    if (typeof window.__cdPremiumAuthJson === 'function') {
      try {
        return await window.__cdPremiumAuthJson(targetPath, payload, options || {});
      } catch (error) {
        try {
          console.warn('[ZiweiBook] premium auth helper fallback:', error && error.message || error);
        } catch (_) {}
      }
    }

    var candidates = buildApiCandidates(pathname).map(function (u) { return resolveApiUrl(u) || u; });
    for (var i = 0; i < candidates.length; i += 1) {
      var res = await requestJson(candidates[i], {
        method: 'POST',
        body: payload
      });
      var data = (res && res.data && typeof res.data === 'object') ? res.data : {};
      if (res.ok) return data;
    }

    return { ok: false, code: 'PREMIUM_AUTH_FALLBACK_FAILED', message: '프리미엄 인증 API 호출에 실패했습니다.' };
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

  async function ensureZiweiPremiumPreflight(requestBody) {
    var prepared = null;
    for (var attempt = 0; attempt < 3; attempt += 1) {
      prepared = await premiumAuthJson('/api/premium-report/prepare', {
        featureType: ZIWEI_PREMIUM_FEATURE_TYPE,
        reportType: ZIWEI_PREMIUM_REPORT_TYPE,
        requestBody: requestBody || {}
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

    var preflight = null;
    for (var preflightAttempt = 0; preflightAttempt < 2; preflightAttempt += 1) {
      preflight = await premiumAuthJson('/api/premium-report/preflight', {
        reportSessionId: String(prepared.reportSessionId || ''),
        reportType: ZIWEI_PREMIUM_REPORT_TYPE,
        featureType: ZIWEI_PREMIUM_FEATURE_TYPE,
        requestBody: requestBody || {},
        requestId: 'ziwei:preflight:' + Date.now().toString(36)
      }, {
        maxAttempts: 2
      });

      var preflightCode = String((preflight && preflight.code) || '').toUpperCase();
      var preflightStatus = Number((preflight && preflight.status) || 0);
      var shouldRecoverSession = !preflight || !preflight.ok
        ? (preflightStatus === 404 || preflightCode === 'PREMIUM_REPORT_SESSION_NOT_FOUND')
        : false;
      if (!shouldRecoverSession) break;

      prepared = await premiumAuthJson('/api/premium-report/prepare', {
        featureType: ZIWEI_PREMIUM_FEATURE_TYPE,
        reportType: ZIWEI_PREMIUM_REPORT_TYPE,
        requestBody: requestBody || {}
      }, {
        maxAttempts: 2
      });
      if (!prepared || !prepared.ok || !prepared.reportSessionId) break;
      await delay(250);
    }

    if (!preflight || !preflight.ok) {
      return {
        ok: false,
        message: buildPreflightMessage(preflight, '생성 전 데이터 점검(preflight)에서 실패했습니다.'),
      };
    }

    return { ok: true };
  }

  function showOnly(screenId) {
    var screens = ['zbStartScreen', 'zbLoadingScreen', 'zbResultScreen', 'zbErrorScreen', 'zbNoProfileScreen'];
    for (var i = 0; i < screens.length; i += 1) {
      var el = qs(screens[i]);
      if (el) el.style.display = screens[i] === screenId ? '' : 'none';
    }
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

  function normalizeChapterSections(chapter) {
    var rows = Array.isArray(chapter && chapter.sections) ? chapter.sections : [];
    var normalized = rows
      .map(function (section) {
        var heading = String((section && (section.heading || section.title || section.name)) || '').trim();
        var body = String((section && (section.body || section.content || section.text)) || '').trim();
        return { heading: heading || '핵심 해석', body: body };
      })
      .filter(function (section) { return !!section.body; });

    if (normalized.length > 0) return normalized;

    var fallbackText = String((chapter && (chapter.content || chapter.text || chapter.markdown)) || '').trim();
    if (!fallbackText) return [];
    return [{ heading: '핵심 해석', body: fallbackText }];
  }

  function normalizeGender(value) {
    var v = String(value || '').trim().toLowerCase();
    if (!v) return '';
    if (v === 'm' || v === 'male' || v === '남' || v === '남성') return 'male';
    if (v === 'f' || v === 'female' || v === '여' || v === '여성') return 'female';
    return String(value || '');
  }

  function normalizeCalType(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'lunar' || v === '음력' || v === 'l') return 'lunar';
    if (v === 'lunar_leap' || v === 'leap' || v === '윤달' || v === '윤') return 'lunar_leap';
    return 'solar';
  }

  function parseDateParts(raw) {
    var src = String(raw || '').trim();
    var m = src.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (!m) return null;
    return {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3])
    };
  }

  function parseTimeParts(raw) {
    var src = String(raw || '').trim();
    var m = src.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;
    return {
      hour: Number(m[1]),
      minute: Number(m[2])
    };
  }

  function buildProfileFromCardRow(row) {
    if (!row || typeof row !== 'object') return null;
    var birth = (row.birth && typeof row.birth === 'object') ? row.birth : null;
    var parsedDate = parseDateParts((birth && birth.birthDate) || row.birthDate || row.dateOfBirth);
    var parsedTime = parseTimeParts((birth && birth.birthTime) || row.birthTime);
    var year = Number((birth && birth.year) || row.birthYear || row.year || (parsedDate && parsedDate.year) || 0);
    var month = Number((birth && birth.month) || row.birthMonth || row.month || (parsedDate && parsedDate.month) || 0);
    var day = Number((birth && birth.day) || row.birthDay || row.day || (parsedDate && parsedDate.day) || 0);
    if (!(year > 0 && month > 0 && day > 0)) return null;

    var hour = Number((birth && birth.hour) || row.birthHour || row.hour || (parsedTime && parsedTime.hour));
    var minute = Number((birth && birth.minute) || row.birthMinute || row.minute || (parsedTime && parsedTime.minute));
    var calType = normalizeCalType((birth && (birth.calType || birth.calendarType)) || row.calType || row.calendarType || 'solar');
    var hasExplicitHour = Number.isFinite(hour);
    var hasExplicitMinute = Number.isFinite(minute);
    var timeUnknown = !!((birth && (birth.timeUnknown || birth.unknownTime)) || row.timeUnknown || row.birthTimeUnknown || (!hasExplicitHour && !hasExplicitMinute));
    var birthPlace = String((birth && (birth.birthPlace || birth.place || birth.locationName)) || row.birthPlace || row.place || row.city || '').trim();
    var tz = String((row.location && row.location.tz) || row.tz || row.timezone || 'Asia/Seoul').trim() || 'Asia/Seoul';
    var lat = Number((row.location && row.location.lat) || row.lat || row.latitude);
    var lng = Number((row.location && row.location.lng) || row.lng || row.longitude);

    return {
      id: String(row.id || row.profileId || '').trim(),
      profileId: String(row.profileId || row.id || '').trim(),
      name: String(row.name || row.nickname || row.profileName || '사용자'),
      gender: normalizeGender(row.gender),
      birth: {
        year: year,
        month: month,
        day: day,
        hour: Number.isFinite(hour) ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
        calType: calType,
        calendarType: calType,
        timeUnknown: timeUnknown,
        isLunar: calType === 'lunar' || calType === 'lunar_leap'
      },
      location: {
        tz: tz,
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
        birthPlace: birthPlace || undefined
      },
      birthPlace: birthPlace || undefined
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
      var parsedDate = parseDateParts(user.birthDate || user.dateOfBirth);
      var parsedTime = parseTimeParts(user.birthTime);
      if (!parsedDate) return null;
      var userTimeUnknownRaw = String(user.timeUnknown || user.birthTimeUnknown || '').trim().toLowerCase();
      var userTimeUnknown = userTimeUnknownRaw === '1' || userTimeUnknownRaw === 'true' || userTimeUnknownRaw === 'y';
      var userCalType = normalizeCalType(user.calendarType || user.calType || 'solar');
      return {
        id: String(user.profileId || user.id || '').trim(),
        profileId: String(user.profileId || user.id || '').trim(),
        name: String(user.name || user.nickname || '사용자'),
        gender: normalizeGender(user.gender),
        birth: {
          year: Number(parsedDate.year),
          month: Number(parsedDate.month),
          day: Number(parsedDate.day),
          hour: parsedTime ? Number(parsedTime.hour) : 12,
          minute: parsedTime ? Number(parsedTime.minute) : 0,
          calType: userCalType,
          calendarType: userCalType,
          timeUnknown: userTimeUnknown || !parsedTime,
          isLunar: userCalType === 'lunar' || userCalType === 'lunar_leap'
        },
        location: {
          tz: String(user.timezone || user.tz || 'Asia/Seoul').trim() || 'Asia/Seoul',
          birthPlace: String(user.birthPlace || user.place || '').trim() || undefined
        },
        birthPlace: String(user.birthPlace || user.place || '').trim() || undefined
      };
    } catch (_) {
      return null;
    }
  }

  function getActiveProfile() {
    var profile = null;
    try { profile = window.__cdActiveBirthProfile || null; } catch (_) { profile = null; }
    if (profile && profile.birth && profile.birth.year) return profile;
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
    var time = String(Number.isFinite(Number(b.hour)) ? Number(b.hour) : 12).padStart(2, '0') + ':' + String(Number.isFinite(Number(b.minute)) ? Number(b.minute) : 0).padStart(2, '0');
    var cal = normalizeCalType(b.calType || b.calendarType || 'solar');
    var calLabel = cal === 'lunar' ? '음력' : (cal === 'lunar_leap' ? '음력(윤달)' : '양력');
    return [String(profile.name || '사용자') + ' · ' + date, calLabel + ' · ' + time].join(' · ');
  }

  function getChapterTitles() {
    return PERSONAL_CHAPTERS;
  }

  function ensurePartnerSelectOptions() {
    var hourSel = qs('zbPartnerHour');
    var minSel = qs('zbPartnerMinute');
    if (hourSel && hourSel.options.length <= 1) {
      for (var h = 0; h < 24; h += 1) {
        var optH = document.createElement('option');
        optH.value = String(h);
        optH.textContent = String(h).padStart(2, '0') + '시';
        if (h === 12) optH.selected = true;
        hourSel.appendChild(optH);
      }
    }
    if (minSel && minSel.options.length <= 1) {
      for (var m = 0; m < 60; m += 5) {
        var optM = document.createElement('option');
        optM.value = String(m);
        optM.textContent = String(m).padStart(2, '0') + '분';
        if (m === 0) optM.selected = true;
        minSel.appendChild(optM);
      }
    }
  }

  function ensureModeUi() {
    var startScreen = qs('zbStartScreen');
    if (!startScreen) return;
    if (qs('zbModeCard')) return;

    var profileBox = startScreen.querySelector('.lb-start__profile-box');
    if (!profileBox || !profileBox.parentNode) return;

    var card = document.createElement('div');
    card.id = 'zbModeCard';
    card.style.cssText = 'margin-top:12px;padding:12px;border-radius:12px;border:1px solid rgba(167,139,250,0.35);background:rgba(30,27,75,0.36);';
    card.innerHTML = ''
      + '<div style="font-size:12px;color:#c4b5fd;margin-bottom:6px">리포트 모드</div>'
      + '<div style="display:inline-flex;align-items:center;gap:6px;color:#e9d5ff;font-size:13px">'
      + '  <strong style="color:#f5f3ff">개인 모드 전용</strong>'
      + '</div>'
      + '<div style="margin-top:6px;font-size:12px;color:#cbd5e1">자미두수 PDF는 개인 명반 기준으로만 생성됩니다.</div>';

    profileBox.parentNode.insertBefore(card, profileBox.nextSibling);
    state.mode = 'personal';
    var subtitle = qs('ziweiBookModal') ? qs('ziweiBookModal').querySelector('.lb-modal__subtitle') : null;
    var cta = qs('zbStartBtn');
    var heroDesc = qs('ziweiBookModal') ? qs('ziweiBookModal').querySelector('.lb-start__desc') : null;
    var chLabel = qs('ziweiBookModal') ? qs('ziweiBookModal').querySelector('.lb-start__ch-label') : null;
    if (subtitle) subtitle.textContent = '나의 명반 기반 13챕터 자미두수 인생 PDF';
    if (cta) cta.textContent = '🌌 자미두수 인생 총람 생성하기';
    if (heroDesc) heroDesc.innerHTML = '복잡한 부가 화면 없이<br>자미두수 핵심 명반을 정리해<br>최종 PDF 인생 전서를 생성합니다';
    if (chLabel) chLabel.textContent = '📖 13챕터 구성';
    renderChapterList();
  }

  function renderChapterList() {
    var root = qs('ziweiBookModal');
    if (!root) return;
    var list = root.querySelector('.lb-start__ch-list');
    if (!list) return;
    var titles = getChapterTitles();
    list.innerHTML = titles.map(function (title, idx) {
      return '<li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.' + (idx + 1) + '</span><span>' + escapeHtml(title) + '</span></li>';
    }).join('');

    var dotTitles = getChapterTitles();
    for (var i = 0; i < TOTAL_CHAPTERS; i += 1) {
      var dot = qs('zbChDot' + i);
      if (dot) dot.setAttribute('title', 'Ch.' + (i + 1) + ' ' + dotTitles[i]);
    }
  }

  function getSelectedMode() {
    return 'personal';
  }

  function readPartnerInput() {
    var dateRaw = String((qs('zbPartnerBirthDate') && qs('zbPartnerBirthDate').value) || '').trim();
    var dm = dateRaw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dm) return null;
    return {
      name: String((qs('zbPartnerName') && qs('zbPartnerName').value) || '').trim() || '상대',
      gender: normalizeGender((qs('zbPartnerGender') && qs('zbPartnerGender').value) || 'female'),
      year: Number(dm[1]),
      month: Number(dm[2]),
      day: Number(dm[3]),
      hour: Number((qs('zbPartnerHour') && qs('zbPartnerHour').value) || 12),
      minute: Number((qs('zbPartnerMinute') && qs('zbPartnerMinute').value) || 0),
      calendarType: 'solar'
    };
  }

  function convertRawZiweiToStructured(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var rows = Array.isArray(raw.palaceStarData) ? raw.palaceStarData : [];
    var diagnostics = {
      source: 'calcZiweiPalaces',
      palaceCount: rows.length,
      hasAll12Palaces: rows.length === 12,
      hasMingGong: !!String(raw.meng || '').trim(),
      hasShenGong: !!String(raw.shen || '').trim(),
      missingFields: []
    };
    if (!diagnostics.hasMingGong) diagnostics.missingFields.push('chartMeta.mingGong');
    if (!diagnostics.hasShenGong) diagnostics.missingFields.push('chartMeta.shenGong');
    if (!diagnostics.hasAll12Palaces) diagnostics.missingFields.push('palaces.length');

    var normalizedRows = rows.map(function (row) {
      return {
        palace: row && row.palace ? row.palace : '',
        branch: row && row.branch ? row.branch : '',
        dahan: row && row.dahan ? row.dahan : '',
        stars: Array.isArray(row && row.stars) ? row.stars : [],
        auxStars: Array.isArray(row && row.auxStars) ? row.auxStars : [],
        badStars: Array.isArray(row && row.badStars) ? row.badStars : []
      };
    });

    var reportPayload = {
      chartMeta: {
        mingGong: String(raw.meng || '').trim(),
        shenGong: String(raw.shen || '').trim(),
        fiveElementBureau: String(raw.juInfo || '').trim() || null,
        yearStemBranch: String(raw.yearGan || '').trim() || null,
        calcMeta: raw.calcMeta || null
      },
      palaces: normalizedRows,
      sihuaData: raw.sihuaData || {},
      luck: {
        decadeLuck: Array.isArray(raw.daHanList) ? raw.daHanList : [],
        currentDecadeLuck: null,
        annual: null,
        monthly: []
      },
      diagnostics: diagnostics
    };

    return {
      chart: {
        meng: raw.meng,
        shen: raw.shen,
        juInfo: raw.juInfo,
        yearGan: raw.yearGan || '',
        calcMeta: raw.calcMeta || null,
        palaceStarData: normalizedRows,
        daHanList: Array.isArray(raw.daHanList) ? raw.daHanList : [],
        sihuaData: raw.sihuaData || {}
      },
      reportPayload: reportPayload,
      diagnostics: diagnostics,
      meng: raw.meng,
      shen: raw.shen,
      juInfo: raw.juInfo,
      calcMeta: raw.calcMeta || null,
      palaceStarData: normalizedRows,
      daHanList: Array.isArray(raw.daHanList) ? raw.daHanList : [],
      sihuaData: raw.sihuaData || {},
      palaces: normalizedRows,
      annualLuck: null,
      monthlyLuck: []
    };
  }

  function hasZiweiReportPayloadCore(reportPayload) {
    if (!reportPayload || typeof reportPayload !== 'object') return false;
    var chartMeta = reportPayload.chartMeta;
    var palaces = reportPayload.palaces;
    var hasMing = !!String(chartMeta && chartMeta.mingGong || '').trim();
    var hasShen = !!String(chartMeta && chartMeta.shenGong || '').trim();
    return hasMing && hasShen && Array.isArray(palaces) && palaces.length === 12;
  }

  function hasZiweiRawCore(rawLike) {
    if (!rawLike || typeof rawLike !== 'object') return false;
    var rows = Array.isArray(rawLike.palaceStarData) ? rawLike.palaceStarData : [];
    if (!rows.length && Array.isArray(rawLike.palaces)) rows = rawLike.palaces;
    var hasMing = !!String(rawLike.meng || rawLike.mingGong || '').trim();
    var hasShen = !!String(rawLike.shen || rawLike.shenGong || '').trim();
    return hasMing && hasShen && rows.length === 12;
  }

  function normalizePrimaryZiweiStructured(structured) {
    if (!structured || typeof structured !== 'object') return null;

    if (hasZiweiReportPayloadCore(structured.reportPayload)) return structured;

    var rawCandidate = null;
    if (structured.chart && typeof structured.chart === 'object') rawCandidate = structured.chart;
    else if (hasZiweiRawCore(structured)) rawCandidate = structured;

    var converted = convertRawZiweiToStructured(rawCandidate);
    if (!converted) {
      return hasZiweiRawCore(structured) ? structured : null;
    }

    var merged = Object.assign({}, converted, structured);
    if (!merged.reportPayload || typeof merged.reportPayload !== 'object') merged.reportPayload = converted.reportPayload;
    if (!merged.chart || typeof merged.chart !== 'object') merged.chart = converted.chart;
    if (!Array.isArray(merged.palaceStarData)) merged.palaceStarData = converted.palaceStarData || [];
    if (!Array.isArray(merged.palaces)) merged.palaces = converted.palaces || [];
    if (!Array.isArray(merged.daHanList)) merged.daHanList = converted.daHanList || [];
    if (!merged.sihuaData || typeof merged.sihuaData !== 'object') merged.sihuaData = converted.sihuaData || {};
    if (!String(merged.meng || '').trim()) merged.meng = converted.meng || structured.mingGong || '';
    if (!String(merged.shen || '').trim()) merged.shen = converted.shen || structured.shenGong || '';
    return merged;
  }

  function hasValidZiweiStructured(structured) {
    var normalized = normalizePrimaryZiweiStructured(structured);
    if (!normalized) return false;
    if (hasZiweiReportPayloadCore(normalized.reportPayload)) return true;

    var rawLike = (normalized.chart && typeof normalized.chart === 'object')
      ? normalized.chart
      : normalized;
    return hasZiweiRawCore(rawLike);
  }

  async function ensureZiweiCoreReady() {
    if (typeof window.calcZiweiPalaces === 'function') return true;

    try {
      if (typeof __cdEnsureSukuyoZiweiCoreLoaded === 'function') {
        await __cdEnsureSukuyoZiweiCoreLoaded();
      }
    } catch (_) {}

    return typeof window.calcZiweiPalaces === 'function';
  }

  function syncZiweiBirthContext(profile) {
    if (!profile || !profile.birth) return;
    var birth = profile.birth || {};
    if (!(Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0)) return;
    try {
      var current = (window._ziweiBirth && typeof window._ziweiBirth === 'object') ? window._ziweiBirth : {};
      window._ziweiBirth = {
        year: Number(birth.year),
        month: Number(birth.month),
        day: Number(birth.day),
        hour: Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12),
        minute: Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0),
        calType: normalizeCalType(birth.calType || birth.calendarType || current.calType || 'solar')
      };
    } catch (_) {}
  }

  function rebuildPrimaryZiweiStructuredFromProfile(profile) {
    if (!profile || !profile.birth) return null;
    if (typeof window.calcZiweiPalaces !== 'function') return null;

    var birth = profile.birth || {};
    var year = Number(birth.year || 0);
    var month = Number(birth.month || 0);
    var day = Number(birth.day || 0);
    var hour = Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12);
    var minute = Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0);

    if (!(year > 0 && month > 0 && day > 0)) return null;

    try {
      var raw = window.calcZiweiPalaces(year, month, day, hour, minute);
      if (!raw || typeof raw !== 'object') return null;

      try { window._currentZiweiData = raw; } catch (_) {}
      syncZiweiBirthContext(profile);

      if (typeof window.getZiweiStructuredData === 'function') {
        var rebuilt = window.getZiweiStructuredData();
        var normalizedRebuilt = normalizePrimaryZiweiStructured(rebuilt);
        if (normalizedRebuilt) return normalizedRebuilt;
      }

      return convertRawZiweiToStructured(raw);
    } catch (_) {
      return null;
    }
  }

  function getPrimaryZiweiStructured(profile) {
    try {
      if (typeof window.getZiweiStructuredData === 'function') {
        var structured = window.getZiweiStructuredData();
        var normalizedStructured = normalizePrimaryZiweiStructured(structured);
        if (hasValidZiweiStructured(normalizedStructured)) return normalizedStructured;
        if (structured && typeof structured === 'object' && window._currentZiweiData) {
          var fromCurrent = convertRawZiweiToStructured(window._currentZiweiData);
          var normalizedFromCurrent = normalizePrimaryZiweiStructured(fromCurrent);
          if (hasValidZiweiStructured(normalizedFromCurrent)) return normalizedFromCurrent;
        }
      }
    } catch (_) {}

    var rebuiltFromProfile = normalizePrimaryZiweiStructured(rebuildPrimaryZiweiStructuredFromProfile(profile));
    if (hasValidZiweiStructured(rebuiltFromProfile)) return rebuiltFromProfile;

    if (rebuiltFromProfile && typeof rebuiltFromProfile === 'object') return rebuiltFromProfile;
    return null;
  }

  function getPartnerZiweiStructured(partner) {
    try {
      if (typeof window.calcZiweiPalaces === 'function') {
        var raw = window.calcZiweiPalaces(partner.year, partner.month, partner.day, partner.hour, partner.minute);
        return convertRawZiweiToStructured(raw);
      }
    } catch (_) {}
    return null;
  }

  function buildBasicZiweiResultPayload(profile, structured) {
    var src = (structured && typeof structured === 'object') ? structured : null;
    if (!src) return null;

    var chart = (src.chart && typeof src.chart === 'object') ? src.chart : {};
    var reportPayload = (src.reportPayload && typeof src.reportPayload === 'object') ? src.reportPayload : null;
    var chartMeta = (reportPayload && reportPayload.chartMeta && typeof reportPayload.chartMeta === 'object')
      ? reportPayload.chartMeta
      : {};

    var payloadPalaces = (reportPayload && Array.isArray(reportPayload.palaces)) ? reportPayload.palaces : [];
    var chartPalaces = Array.isArray(chart.palaces)
      ? chart.palaces
      : (Array.isArray(src.palaces)
        ? src.palaces
        : (Array.isArray(chart.palaceStarData) ? chart.palaceStarData : []));

    var palaces = payloadPalaces.length ? payloadPalaces : chartPalaces;
    if (!palaces.length) return null;

    var birth = (profile && profile.birth && typeof profile.birth === 'object') ? profile.birth : {};
    var birthDate = [birth.year, String(birth.month || '').padStart(2, '0'), String(birth.day || '').padStart(2, '0')].join('-');
    var birthTime = String(Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : 12).padStart(2, '0') + ':' + String(Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0).padStart(2, '0');
    var luck = (reportPayload && reportPayload.luck && typeof reportPayload.luck === 'object') ? reportPayload.luck : {};
    var calendarType = normalizeCalType(birth.calType || birth.calendarType || 'solar');
    var timeUnknown = !!birth.timeUnknown;
    var birthPlace = String((profile && (profile.birthPlace || (profile.location && profile.location.birthPlace) || profile.place)) || '').trim();

    return {
      ok: true,
      source: 'ziwei-ui-basic',
      input: {
        profileId: String((profile && (profile.profileId || profile.id)) || '').trim(),
        name: String((profile && profile.name) || '사용자'),
        gender: normalizeGender((profile && profile.gender) || ''),
        birthDate: birthDate,
        birthTime: birthTime,
        calendarType: calendarType,
        timezone: String(((profile && profile.location && profile.location.tz) || 'Asia/Seoul')),
        isLunar: calendarType === 'lunar',
        timeUnknown: timeUnknown,
        birthPlace: birthPlace || undefined
      },
      chart: {
        mingGong: String(chartMeta.mingGong || src.meng || chart.meng || '').trim() || null,
        shenGong: String(chartMeta.shenGong || src.shen || chart.shen || '').trim() || null,
        fiveElementBureau: chartMeta.fiveElementBureau || src.juInfo || chart.juInfo || null,
        yearStemBranch: chartMeta.yearStemBranch || src.yearGan || chart.yearGan || null,
        palaces: palaces,
        sihua: (reportPayload && reportPayload.sihua) || src.sihuaData || chart.sihuaData || {},
        luck: {
          majorPeriods: Array.isArray(luck.decadeLuck) ? luck.decadeLuck : (Array.isArray(src.daHanList) ? src.daHanList : []),
          currentMajorPeriod: luck.currentDecadeLuck || null,
          annual: luck.annual || src.annualLuck || null,
          monthly: Array.isArray(luck.monthly) ? luck.monthly : (Array.isArray(src.monthlyLuck) ? src.monthlyLuck : [])
        },
        chartMeta: chartMeta,
        sourcePayload: reportPayload || null
      },
      ziweiStructured: src,
      missingFields: []
    };
  }

  function buildRequestBody(forceRegenerate) {
    var profile = getActiveProfile() || {};
    var birth = profile.birth || {};
    var primaryStructured = normalizePrimaryZiweiStructured(getPrimaryZiweiStructured(profile));
    if (!primaryStructured || typeof primaryStructured !== 'object') {
      return { error: '기본 자미두수 계산 데이터를 자동으로 복구하지 못했습니다. 먼저 자미두수 결과를 한 번 생성한 뒤 다시 시도해 주세요.' };
    }
    if (!hasValidZiweiStructured(primaryStructured)) {
      return { error: '기본 자미두수 계산 데이터(명궁/신궁/12궁)가 부족합니다. 메인 자미두수 결과를 다시 생성한 뒤 재시도해 주세요.' };
    }
    state.mode = 'personal';

    var name = String(profile.name || '사용자');
    var gender = normalizeGender(profile.gender);
    var year = Number(birth.year || 0);
    var month = Number(birth.month || 0);
    var day = Number(birth.day || 0);
    var hour = Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12);
    var minute = Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0);
    var calendarType = normalizeCalType(birth.calType || birth.calendarType || 'solar');
    var timezone = String((profile.location && profile.location.tz) || 'Asia/Seoul');
    var lat = Number((profile.location && profile.location.lat) || 37.5665);
    var lon = Number((profile.location && profile.location.lng) || 126.9780);
    var profileId = String(profile.profileId || profile.id || '').trim();
    var birthDate = [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
    var birthTime = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
    var timeUnknown = !!birth.timeUnknown;
    var isLunar = calendarType === 'lunar' || calendarType === 'lunar_leap';
    var birthPlace = String(profile.birthPlace || (profile.location && profile.location.birthPlace) || '').trim();

    var body = {
      mode: 'personal',
      forceRegenerate: !!forceRegenerate,
      _premiumStrictPayload: true,
      _premiumStrictValidation: true,
      name: name,
      gender: gender,
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      calType: calendarType,
      calendarType: calendarType,
      profileId: profileId,
      birthDate: birthDate,
      birthTime: birthTime,
      isLunar: isLunar,
      timeUnknown: timeUnknown,
      birthPlace: birthPlace || undefined,
      timezoneName: timezone,
      timezone: timezone,
      lat: lat,
      lon: lon,
      ziweiStructured: primaryStructured,
      profile: {
        profileId: profileId,
        name: name,
        gender: gender,
        birthDate: birthDate,
        birthTime: birthTime,
        calendarType: calendarType,
        isLunar: isLunar,
        timeUnknown: timeUnknown,
        birthPlace: birthPlace || undefined,
        timezone: timezone
      },
      birthData: {
        profileId: profileId,
        name: name,
        gender: gender,
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        calType: calendarType,
        birthDate: birthDate,
        birthTime: birthTime,
        calendarType: calendarType,
        isLunar: isLunar,
        timeUnknown: timeUnknown,
        birthPlace: birthPlace || undefined,
        timezone: timezone,
        lat: lat,
        lon: lon,
        ziweiStructured: primaryStructured
      }
    };

    var basicZiweiResult = buildBasicZiweiResultPayload(profile, primaryStructured);
    if (basicZiweiResult) {
      body.basicZiweiResult = basicZiweiResult;
    }

    return { body: body };
  }

  function setError(message) {
    var msg = qs('zbErrorMsg');
    if (msg) msg.textContent = String(message || '생성 중 오류가 발생했습니다.');
    showOnly('zbErrorScreen');
  }

  function resetDots(activeChapter, doneChapter) {
    var active = Math.max(1, Math.min(TOTAL_CHAPTERS, Number(activeChapter || 1)));
    var done = Math.max(0, Math.min(TOTAL_CHAPTERS, Number(doneChapter || 0)));
    var dots = qsa(qs('ziweiBookModal'), '.lb-ch-dot');
    for (var i = 0; i < dots.length; i += 1) {
      var dot = dots[i];
      var ch = Number(dot.getAttribute('data-zbch') || 0);
      dot.classList.remove('lb-ch-dot--pending', 'lb-ch-dot--active', 'lb-ch-dot--done');
      if (ch < 1 || ch > TOTAL_CHAPTERS) {
        dot.style.display = 'none';
        continue;
      }
      dot.style.display = '';
      if (ch <= done) dot.classList.add('lb-ch-dot--done');
      else if (ch === active) dot.classList.add('lb-ch-dot--active');
      else dot.classList.add('lb-ch-dot--pending');
    }
  }

  function setLoadingProgress(currentChapter, status) {
    var done = Math.max(0, Math.min(TOTAL_CHAPTERS, Number(currentChapter || 0)));
    var active = Math.min(TOTAL_CHAPTERS, done + 1);
    var pct = done <= 0 ? 3 : Math.round((done / TOTAL_CHAPTERS) * 100);
    var titles = getChapterTitles();

    var progressBar = qs('zbProgressBar');
    var progressText = qs('zbProgressText');
    var loadingStatus = qs('zbLoadingStatus');
    var chapterNum = qs('zbLoadingChapterNum');
    var chapterTitle = qs('zbLoadingChapterTitle');
    var quote = qs('zbMysticQuote');

    if (progressBar) progressBar.style.width = String(Math.max(2, Math.min(100, pct))) + '%';
    if (progressText) progressText.textContent = done + ' / ' + TOTAL_CHAPTERS + ' 챕터';
  if (loadingStatus) loadingStatus.textContent = String(status || '자미두수 리포트를 생성하는 중...');
    if (chapterNum) chapterNum.textContent = 'Ch.' + Math.max(1, active);
    if (chapterTitle) chapterTitle.textContent = done >= TOTAL_CHAPTERS ? '완료 처리 중...' : String(titles[Math.max(0, active - 1)] || '준비 중...');
    if (quote) quote.textContent = LOADING_QUOTES[(Math.max(1, active) - 1) % LOADING_QUOTES.length];
    resetDots(active, done);
  }

  function renderResultScreen() {
    var toc = qs('zbToc');
    var content = qs('zbChapterContent');
    var resultName = qs('zbResultName');
    var resultDate = qs('zbResultDate');
    if (!toc || !content) return;

    var PALACE_KOREAN = {
      ming: '명궁(命宮)',
      parents: '부모궁(父母宮)',
      fuzang: '복덕궁(福德宮)',
      house: '전택궁(田宅宮)',
      career: '관록궁(官祿宮)',
      friends: '노복궁(奴僕宮)',
      travel: '천이궁(遷移宮)',
      health: '질액궁(疾厄宮)',
      wealth: '재백궁(財帛宮)',
      children: '자녀궁(子女宮)',
      spouse: '부처궁(夫妻宮)',
      siblings: '형제궁(兄弟宮)',
      body: '신궁(身宮)'
    };

    if (!document.getElementById('zb-premium-json-styles')) {
      var style = document.createElement('style');
      style.id = 'zb-premium-json-styles';
      style.innerHTML = [
        '.lb-result-article__badges { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0 24px 0; padding: 12px 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; }',
        '.lb-badge-group { display: flex; align-items: center; gap: 8px; }',
        '.lb-badge-label { font-size: 11px; color: #8892b0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-right: 4px; }',
        '.lb-badge { display: inline-flex; align-items: center; padding: 4px 10px; font-size: 12px; font-weight: 500; border-radius: 20px; transition: all 0.2s ease; }',
        '.lb-badge--star { background: rgba(138, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(138, 92, 246, 0.3); }',
        '.lb-badge--palace { background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }',
        '.lb-result-article__list { margin: 24px 0; padding: 20px; border-radius: 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); }',
        '.lb-result-article__list h5 { font-size: 15px; font-weight: 600; margin: 0 0 12px 0; display: flex; align-items: center; }',
        '.lb-result-article__list--advice { border-left: 4px solid #10b981; background: linear-gradient(90deg, rgba(16, 185, 129, 0.04) 0%, rgba(0, 0, 0, 0) 100%); }',
        '.lb-result-article__list--advice h5 { color: #34d399; }',
        '.lb-result-article__list--caution { border-left: 4px solid #f59e0b; background: linear-gradient(90deg, rgba(245, 158, 11, 0.04) 0%, rgba(0, 0, 0, 0) 100%); }',
        '.lb-result-article__list--caution h5 { color: #fbbf24; }',
        '.lb-result-article__list ul { margin: 0; padding-left: 20px; }',
        '.lb-result-article__list li { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 8px; }',
        '.lb-result-article__list li:last-child { margin-bottom: 0; }',
        '.lb-result-article__conclusion { margin: 32px 0; padding: 24px; border-radius: 16px; background: linear-gradient(135deg, rgba(138, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%); border: 1px solid rgba(139, 92, 246, 0.2); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2); position: relative; overflow: hidden; }',
        '.lb-result-article__conclusion::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #8a5cf6, #ec4899); }',
        '.lb-result-article__conclusion h5 { font-size: 16px; font-weight: 700; color: #f3e8ff; margin: 0 0 14px 0; }',
        '.lb-result-article__conclusion-body p { font-size: 14.5px; line-height: 1.7; color: #e2e8f0; margin: 0 0 12px 0; }',
        '.lb-result-article__conclusion-body p:last-child { margin-bottom: 0; }'
      ].join('\n');
      document.head.appendChild(style);
    }

    var profile = getActiveProfile();
    var modeLabel = state.mode === 'compatibility' ? '자미두수 궁합 리포트' : '자미두수 인생 리포트';
    if (resultName) {
      var label = profile && profile.name ? profile.name + ' · ' + modeLabel : modeLabel;
      resultName.textContent = label;
    }
    if (resultDate) {
      var d = new Date();
      resultDate.textContent = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    }

    var chapters = Array.isArray(state.chapters) ? state.chapters.slice() : [];
    chapters.sort(function (a, b) {
      return Number(a && a.chapterIndex || 0) - Number(b && b.chapterIndex || 0);
    });

    var tocHtml = [];
    var articleHtml = [];
    for (var i = 0; i < chapters.length; i += 1) {
      var chapter = chapters[i] || {};
      var chapterIndex = Number(chapter.chapterIndex || i + 1);
      var title = String(chapter.title || ('Chapter ' + chapterIndex));
      var subtitle = String(chapter.subtitle || '');
      var summary = String(chapter.summary || '');
      var sections = normalizeChapterSections(chapter);
      var advice = Array.isArray(chapter.practicalAdvice) ? chapter.practicalAdvice : [];
      var cautions = Array.isArray(chapter.cautions) ? chapter.cautions : [];
      var masterConclusion = String(chapter.masterConclusion || '');
      var coreStars = Array.isArray(chapter.coreStars) ? chapter.coreStars : [];
      var corePalaces = Array.isArray(chapter.corePalaces) ? chapter.corePalaces : [];

      tocHtml.push('<button type="button" class="lb-toc-item" data-zb-chapter="' + chapterIndex + '"><span>Ch.' + chapterIndex + '</span><strong>' + escapeHtml(title) + '</strong></button>');

      var badgesHtml = '';
      if (coreStars.length > 0 || corePalaces.length > 0) {
        badgesHtml += '<div class="lb-result-article__badges">';
        if (coreStars.length > 0) {
          badgesHtml += '<div class="lb-badge-group"><span class="lb-badge-label">핵심 주성</span>';
          badgesHtml += coreStars.map(function(s) {
            return '<span class="lb-badge lb-badge--star">🌌 ' + escapeHtml(s) + '</span>';
          }).join('');
          badgesHtml += '</div>';
        }
        if (corePalaces.length > 0) {
          badgesHtml += '<div class="lb-badge-group"><span class="lb-badge-label">영향 궁위</span>';
          badgesHtml += corePalaces.map(function(p) {
            var ko = PALACE_KOREAN[p] || p;
            return '<span class="lb-badge lb-badge--palace">🏛️ ' + escapeHtml(ko) + '</span>';
          }).join('');
          badgesHtml += '</div>';
        }
        badgesHtml += '</div>';
      }

      var sectionHtml = sections.map(function (section) {
        return '<section class="lb-result-article__section">'
          + '<h4>' + escapeHtml(section && section.heading || '') + '</h4>'
          + toParagraphHtml(section && section.body || '')
          + '</section>';
      }).join('');

      var adviceHtml = advice.length
        ? '<div class="lb-result-article__list lb-result-article__list--advice"><h5>🎯 실천 처방</h5><ul>' + advice.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';

      var cautionsHtml = cautions.length
        ? '<div class="lb-result-article__list lb-result-article__list--caution"><h5>⚠️ 경계 지침</h5><ul>' + cautions.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';
        
      var masterConclusionHtml = masterConclusion
        ? '<div class="lb-result-article__conclusion"><h5>✍️ 거장의 최종 제언</h5><div class="lb-result-article__conclusion-body">' + toParagraphHtml(masterConclusion) + '</div></div>'
        : '';

      articleHtml.push(
        '<article class="lb-result-article" data-zb-article="' + chapterIndex + '">' +
          '<p class="lb-result-article__chapter">CHAPTER ' + chapterIndex + '</p>' +
          '<h3 class="lb-result-article__title">' + escapeHtml(title) + '</h3>' +
          (subtitle ? '<p class="lb-result-article__subtitle">' + escapeHtml(subtitle) + '</p>' : '') +
          badgesHtml +
          (summary ? '<div class="lb-result-article__summary">' + toParagraphHtml(summary) + '</div>' : '') +
          '<div class="lb-result-article__body">' + sectionHtml + adviceHtml + cautionsHtml + masterConclusionHtml + '</div>' +
        '</article>'
      );
    }

    toc.innerHTML = tocHtml.join('');
    content.innerHTML = articleHtml.join('');
    showOnly('zbResultScreen');
  }

  function applyStatus(statusData) {
    var payload = normalizePremiumPayload(statusData);
    if (!payload || typeof payload !== 'object') return;
    if (payload.reportId) state.reportId = String(payload.reportId);
    if (payload.downloadUrl) state.downloadUrl = String(payload.downloadUrl);
    if (Array.isArray(payload.chapters)) state.chapters = payload.chapters.slice();
    state.currentMessage = String(payload.message || '');
    setLoadingProgress(Number(payload.currentChapter || 0), state.currentMessage);
  }

  async function pollStatusUntilDone() {
    if (!state.reportId) throw new Error('reportId가 없습니다.');

    for (var i = 0; i < MAX_POLL_COUNT; i += 1) {
      if (state.stopPolling) throw new Error('생성이 중단되었습니다.');
      var url = '/api/premium/ziwei/status?reportId=' + encodeURIComponent(state.reportId) + '&includeChapters=1';
      var res = await requestJson(url, { method: 'GET' });
      var statusData = normalizePremiumPayload(res.data);
      if (!res.ok || !statusData || !statusData.ok) {
        throw new Error(String(statusData && statusData.message || '상태 조회에 실패했습니다.'));
      }

      applyStatus(statusData);
      if (String(statusData.status) === 'completed') return statusData;
      if (String(statusData.status) === 'failed') {
        await attemptZiweiAutoRefund('자미두수 프리미엄 PDF 생성 실패 자동 환불');
        throw new Error(String(statusData.errorMessage || statusData.message || '리포트 생성에 실패했습니다.'));
      }

      await delay(POLL_INTERVAL_MS);
    }

    await attemptZiweiAutoRefund('자미두수 프리미엄 PDF 생성 미완료 자동 환불');
    throw new Error('생성 시간이 길어지고 있습니다. 코인이 차감된 경우 자동 환불을 시도했습니다. 잠시 뒤 다시 시도해 주세요.');
  }

  function resetForGenerate() {
    state.reportId = '';
    state.chapters = [];
    state.downloadUrl = '';
    state.currentMessage = '';
    state.stopPolling = false;
    setLoadingProgress(0, '자미두수 리포트를 준비하는 중...');
  }

  function buildZiweiGateKey(body) {
    var b = body || {};
    var mode = String(b.mode || 'personal');
    var birth = (b.birthData && typeof b.birthData === 'object') ? b.birthData : {};
    var partnerBirth = (b.partnerBirthData && typeof b.partnerBirthData === 'object') ? b.partnerBirthData : {};
    var chunks = [
      mode,
      Number(b.year || birth.year || 0), Number(b.month || birth.month || 0), Number(b.day || birth.day || 0),
      Number(b.hour || birth.hour || 12), Number(b.minute || birth.minute || 0)
    ];
    if (mode === 'compatibility') {
      chunks.push(
        Number(b.partnerYear || partnerBirth.year || 0), Number(b.partnerMonth || partnerBirth.month || 0), Number(b.partnerDay || partnerBirth.day || 0),
        Number(b.partnerHour || partnerBirth.hour || 12), Number(b.partnerMinute || partnerBirth.minute || 0)
      );
    }
    return chunks.join('|');
  }

  function resolveZiweiCoinPolicy(body) {
    return {
      cost: ZIWEI_COIN_BASE_COST,
      featureKey: ZIWEI_COIN_FEATURE_KEY,
      reason: ZIWEI_COIN_REASON,
      modeLabel: '개인'
    };
  }

  function extractCoinGatePayload(data) {
    if (data && typeof data.data === 'object') return data.data;
    return data || {};
  }

  async function attemptZiweiAutoRefund(reason) {
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
          reason: String(reason || '자미두수 프리미엄 PDF 생성 실패 자동 환불')
        }
      });

      var payload = refundRes.data || {};
      var code = String(payload.code || '').toUpperCase();
      if (refundRes.ok || code === 'REFUND_ALREADY_PROCESSED') {
        state.paymentContext = null;
        state.paidGateKey = '';
        return true;
      }

      console.warn('[ZiweiBook] auto refund failed:', payload);
      return false;
    } catch (error) {
      console.warn('[ZiweiBook] auto refund exception:', error);
      return false;
    } finally {
      state.refundInFlight = false;
    }
  }

  async function ensureZiweiCoinGate(body) {
    var gateKey = buildZiweiGateKey(body);
    if (state.paidGateKey && state.paidGateKey === gateKey) return true;
    var policy = resolveZiweiCoinPolicy(body);

    try {
      if (window.__cdAdminBypass === true) {
        state.paidGateKey = gateKey;
        return true;
      }
    } catch (_) {}

    if (!window.confirm('🪙 자미두수 프리미엄 ' + policy.modeLabel + ' 리포트 생성\n이용 시 ' + policy.cost + '코인이 차감됩니다.\n지금 생성하시겠습니까?')) {
      return false;
    }

    var requestId = 'premium-ziwei:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
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
    var retryableGateError = (!res.ok || data.ok === false)
      && (Number(res.status || 0) >= 500 || Number(res.status || 0) === 0 || code === 'SERVER_ERROR' || code === 'WORKER_UNHANDLED_EXCEPTION');

    if (retryableGateError) {
      res = await requestJson('/api/billing/coin-gate', {
        method: 'POST',
        body: {
          featureKey: policy.featureKey,
          reason: policy.reason,
          forceDeduct: true,
          requestId: requestId
        }
      });
      data = (res && res.data) || {};
      code = String((data && data.code) || '').toUpperCase();
    }
    if (res.status === 401 || res.status === 403 || code === 'AUTH_REQUIRED') {
      if (typeof window.__cdOpenLoginRequiredModal === 'function') {
        window.__cdOpenLoginRequiredModal({
          reason: '로그인 후 자미두수 프리미엄 리포트를 생성할 수 있습니다.',
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
    persistPremiumAccessToken(payload);
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

  async function generateZiweiBookImpl(forceRegenerate) {
    if (state.generating) {
      notify('이미 생성을 진행 중입니다. 잠시만 기다려 주세요.');
      return;
    }
    if (!hasProfile()) {
      showOnly('zbNoProfileScreen');
      return;
    }
    state.generating = true;
    resetForGenerate();
    showOnly('zbLoadingScreen');
    setLoadingProgress(0, '생성 준비 중...');

    try {
      var coreReady = await ensureZiweiCoreReady();
      if (!coreReady) {
        throw new Error('자미두수 엔진을 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
      }

      var payloadInfo = buildRequestBody(forceRegenerate);
      if (payloadInfo.error) {
        throw new Error(String(payloadInfo.error));
      }

      setLoadingProgress(0, '결제 확인 중...');
      var gateOk = await ensureZiweiCoinGate(payloadInfo.body);
      if (!gateOk) {
        showOnly('zbStartScreen');
        return;
      }

      setLoadingProgress(0, '생성 전 데이터 점검 중...');
      var preflight = await ensureZiweiPremiumPreflight(payloadInfo.body);
      if (!preflight.ok) {
        await attemptZiweiAutoRefund('자미두수 프리미엄 preflight 실패 자동 환불');
        state.paidGateKey = '';
        throw new Error(String(preflight.message || '생성 전 데이터 점검에 실패했습니다.'));
      }

      setLoadingProgress(0, '리포트 생성을 시작합니다...');

      var genData = normalizePremiumPayload(await premiumAuthJson('/api/premium/ziwei/generate', payloadInfo.body, { maxAttempts: 2 }));

      if (!genData || genData.ok === false) {
        await attemptZiweiAutoRefund('자미두수 프리미엄 PDF 생성 시작 실패 자동 환불');
        throw new Error(String(genData && genData.message || '리포트 생성 요청에 실패했습니다.'));
      }

      state.reportId = String(genData.reportId || '').trim();
      if (!state.reportId) {
        await attemptZiweiAutoRefund('자미두수 프리미엄 PDF reportId 누락 자동 환불');
        throw new Error('리포트 식별자를 받지 못했습니다.');
      }

      applyStatus(genData);
      var finalStatus = String(genData.status || '').toLowerCase() === 'completed'
        ? genData
        : await pollStatusUntilDone();

      applyStatus(finalStatus);
      setLoadingProgress(TOTAL_CHAPTERS, '리포트가 완성되었습니다.');
      state.paymentContext = null;
      renderResultScreen();
      notify('자미두수 리포트 생성이 완료되었습니다.');
    } catch (error) {
      console.error('[ZiweiBook] generate failed:', error);
      setError(String(error && error.message || '생성 중 오류가 발생했습니다.'));
    } finally {
      state.generating = false;
      state.stopPolling = false;
    }
  }

  function buildLocalZiweiPrintableHtml() {
    var profile = getActiveProfile() || {};
    var ownerName = String(profile.name || '사용자');
    var now = new Date();
    var generatedAt = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
    var chapters = Array.isArray(state.chapters) ? state.chapters.slice() : [];
    chapters.sort(function (a, b) {
      return Number(a && a.chapterIndex || 0) - Number(b && b.chapterIndex || 0);
    });

    var PALACE_KOREAN = {
      ming: '명궁(命宮)',
      parents: '부모궁(父母宮)',
      fuzang: '복덕궁(福德宮)',
      house: '전택궁(田宅宮)',
      career: '관록궁(官祿宮)',
      friends: '노복궁(奴僕宮)',
      travel: '천이궁(遷移宮)',
      health: '질액궁(疾厄宮)',
      wealth: '재백궁(財帛宮)',
      children: '자녀궁(子女宮)',
      spouse: '부처궁(夫妻宮)',
      siblings: '형제궁(兄弟宮)',
      body: '신궁(身宮)'
    };

    var chapterBlocks = chapters.map(function (chapter, i) {
      var chapterIndex = Number(chapter && chapter.chapterIndex || (i + 1));
      var title = String(chapter && chapter.title || ('Chapter ' + chapterIndex));
      var subtitle = String(chapter && chapter.subtitle || '');
      var summary = String(chapter && chapter.summary || '');
      var sections = normalizeChapterSections(chapter);
      var advice = Array.isArray(chapter && chapter.practicalAdvice) ? chapter.practicalAdvice : [];
      var cautions = Array.isArray(chapter && chapter.cautions) ? chapter.cautions : [];
      var masterConclusion = String(chapter && chapter.masterConclusion || '');
      var coreStars = Array.isArray(chapter && chapter.coreStars) ? chapter.coreStars : [];
      var corePalaces = Array.isArray(chapter && chapter.corePalaces) ? chapter.corePalaces : [];

      var badgesHtml = '';
      if (coreStars.length > 0 || corePalaces.length > 0) {
        badgesHtml += '<div class="zb-print-badges">';
        if (coreStars.length > 0) {
          badgesHtml += '<span class="zb-print-badge-label">주성:</span> ' + coreStars.map(function (s) { return '<span class="zb-print-badge zb-print-badge--star">' + escapeHtml(s) + '</span>'; }).join(' ') + ' &nbsp; ';
        }
        if (corePalaces.length > 0) {
          badgesHtml += '<span class="zb-print-badge-label">궁위:</span> ' + corePalaces.map(function (p) {
            var ko = PALACE_KOREAN[p] || p;
            return '<span class="zb-print-badge zb-print-badge--palace">' + escapeHtml(ko) + '</span>';
          }).join(' ');
        }
        badgesHtml += '</div>';
      }

      var sectionHtml = sections.map(function (section) {
        var heading = escapeHtml(section && section.heading || '핵심 해석');
        var body = toParagraphHtml(section && section.body || '');
        return '<section class="zb-print-section"><h4>' + heading + '</h4>' + body + '</section>';
      }).join('');

      var adviceHtml = advice.length
        ? '<div class="zb-print-list zb-print-list--advice"><h5>🎯 실천 처방</h5><ul>' + advice.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';
      var cautionHtml = cautions.length
        ? '<div class="zb-print-list zb-print-list--caution"><h5>⚠️ 경계 지침</h5><ul>' + cautions.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';
      var conclusionHtml = masterConclusion
        ? '<div class="zb-print-conclusion"><h5>✍️ 거장의 최종 제언</h5><div class="zb-print-conclusion-body">' + toParagraphHtml(masterConclusion) + '</div></div>'
        : '';

      return [
        '<article class="zb-print-chapter">',
        '<p class="zb-print-chip">CHAPTER ' + chapterIndex + '</p>',
        '<h2>' + escapeHtml(title) + '</h2>',
        subtitle ? '<p class="zb-print-sub">' + escapeHtml(subtitle) + '</p>' : '',
        badgesHtml,
        summary ? '<div class="zb-print-summary">' + toParagraphHtml(summary) + '</div>' : '',
        sectionHtml,
        adviceHtml,
        cautionHtml,
        conclusionHtml,
        '</article>'
      ].join('');
    }).join('');

    return [
      '<!doctype html>',
      '<html lang="ko">',
      '<head>',
      '<meta charset="utf-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      '<title>' + escapeHtml(ownerName + '님의 자미두수 인생 총람') + '</title>',
      '<style>',
      'body{margin:0;padding:24px;font-family:"Noto Serif KR","Nanum Myeongjo",serif;background:#f8fafc;color:#0f172a;line-height:1.75}',
      '.zb-print-cover{padding:24px;border:1px solid #dbe5f7;border-radius:16px;background:#ffffff;margin-bottom:20px}',
      '.zb-print-cover h1{margin:0 0 8px;font-size:30px;color:#1e1b4b}',
      '.zb-print-cover p{margin:2px 0;font-size:13px;color:#334155}',
      '.zb-print-chapter{margin-bottom:18px;padding:18px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;break-inside:avoid}',
      '.zb-print-chip{display:inline-block;margin:0 0 10px;padding:4px 10px;border-radius:999px;background:#eef2ff;color:#4338ca;font-weight:700;font-size:11px}',
      '.zb-print-chapter h2{margin:0 0 6px;font-size:22px;color:#111827}',
      '.zb-print-sub{margin:0 0 10px;color:#334155}',
      '.zb-print-summary{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0}',
      '.zb-print-section{margin:0 0 10px}',
      '.zb-print-section h4{margin:0 0 6px;font-size:16px;color:#1f2937}',
      '.zb-print-list{margin-top:8px;padding:10px;border-radius:8px}',
      '.zb-print-list h5{margin:0 0 6px;font-size:14px;color:#1f2937}',
      '.zb-print-list ul{margin:0 0 0 18px;padding:0}',
      '.zb-print-list li{margin:0 0 5px;font-size:13px;color:#334155}',
      '.zb-print-badges{margin:8px 0 12px;font-size:12px;color:#475569}',
      '.zb-print-badge-label{font-weight:700;color:#1e293b}',
      '.zb-print-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:500;font-size:11px;margin-right:4px}',
      '.zb-print-badge--star{background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe}',
      '.zb-print-badge--palace{background:#fdf2f8;color:#be185d;border:1px solid #fbcfe8}',
      '.zb-print-list--advice{border-left:3px solid #10b981;padding-left:12px;background:#f0fdf4}',
      '.zb-print-list--advice h5{color:#047857}',
      '.zb-print-list--caution{border-left:3px solid #f59e0b;padding-left:12px;background:#fffbeb}',
      '.zb-print-list--caution h5{color:#b45309}',
      '.zb-print-conclusion{margin-top:14px;padding:14px;border:1px solid #ddd6fe;border-radius:8px;background:#faf5ff;break-inside:avoid}',
      '.zb-print-conclusion h5{margin:0 0 6px;font-size:13px;color:#6d28d9}',
      '.zb-print-conclusion-body p{margin:0 0 6px;font-size:12.5px;color:#3730a3}',
      '.zb-print-conclusion-body p:last-child{margin-bottom:0}',
      '@media print{body{padding:0;background:#fff}.zb-print-cover,.zb-print-chapter{border:none;border-radius:0;box-shadow:none}}',
      '</style>',
      '</head>',
      '<body>',
      '<section class="zb-print-cover">',
      '<h1>' + escapeHtml(ownerName + ' · 자미두수 인생 총람') + '</h1>',
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

  async function downloadZiweiBookImpl() {
    if (!state.reportId) {
      notify('먼저 리포트를 생성해 주세요.');
      return;
    }

    var downloadUrl = state.downloadUrl || ('/api/premium/ziwei/download?reportId=' + encodeURIComponent(state.reportId));
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

    if (!html) html = buildLocalZiweiPrintableHtml();
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
    a.download = 'ziwei-premium-' + (state.mode || 'personal') + '-' + (state.reportId || Date.now()) + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1200);
    notify('HTML 파일로 다운로드되었습니다. 브라우저에서 열어 인쇄 > PDF 저장을 선택해 주세요.');
  }

  function applyBaseUi() {
    ensureModeUi();
    renderChapterList();

    var profile = getActiveProfile();
    var summary = qs('zbProfileSummary');
    if (summary) summary.textContent = formatProfileSummary(profile);

    state.mode = getSelectedMode();
    resetDots(1, 0);
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

  window.openZiweiBookModal = function (profileArg) {
    var modal = qs('ziweiBookModal');
    if (!modal) return;
    applyActiveProfileArg(profileArg);
    applyBaseUi();
    showOnly(hasProfile() ? 'zbStartScreen' : 'zbNoProfileScreen');
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

  window.closeZiweiBookModal = function () {
    var modal = qs('ziweiBookModal');
    if (!modal) return;
    state.stopPolling = true;
    blurActiveInsideModal(modal);
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.generateZiweiBook = function (forceRegenerate) {
    generateZiweiBookImpl(!!forceRegenerate).catch(function (error) {
      console.error('[ZiweiBook] generate crash:', error);
      setError(String(error && error.message || '생성 중 오류가 발생했습니다.'));
    });
  };

  window.downloadZiweiBookPdf = function () {
    downloadZiweiBookImpl().catch(function (error) {
      console.error('[ZiweiBook] download failed:', error);
      notify(String(error && error.message || '다운로드에 실패했습니다.'));
    });
  };

  window.gotoZiweiPremium = function () {
    window.openZiweiBookModal();
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;

    var btn = target.closest('[data-action]');
    if (btn) {
      var action = btn.getAttribute('data-action');
      if (action === 'openZiweiBookModal') {
        window.openZiweiBookModal();
        return;
      }
      if (action === 'closeZiweiBookModal') {
        window.closeZiweiBookModal();
        return;
      }
    }

    var tocItem = target.closest('.lb-toc-item[data-zb-chapter]');
    if (tocItem) {
      var chapter = Number(tocItem.getAttribute('data-zb-chapter') || 0);
      if (chapter > 0) {
        var articleWrap = qs('zbChapterContent');
        var article = articleWrap ? articleWrap.querySelector('[data-zb-article="' + chapter + '"]') : null;
        if (article && typeof article.scrollIntoView === 'function') {
          article.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modal = qs('ziweiBookModal');
    if (modal && modal.style.display !== 'none') window.closeZiweiBookModal();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBaseUi, { once: true });
  } else {
    applyBaseUi();
  }
})();