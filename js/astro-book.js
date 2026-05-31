/**
 * Premium Astrology PDF (Cosmic Chart)
 * Local chart-first pipeline + worker premium prepare endpoint.
 */
(function () {
  'use strict';

  var ASTRO_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_BILLING_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_PREPARE_API = '/api/astro/premium/prepare';
  var ASTRO_CHAPTERS_API = '/api/astro/premium/chapters';
  var ASTRO_WESTERN_CHART_API = '/api/astro/western-chart';
  var ASTRO_TOTAL_CHAPTERS = 12;
  var ASTRO_COIN_COST = 390;
  var ASTRO_SIGN_NAMES = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var _generating = false;
  var _progressTimer = null;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;
  var _lastPremiumPayment = null;

  function _qs(id) { return document.getElementById(id); }
  function _detachModalFromResultPage(modal) {
    try {
      if (!modal || !modal.parentElement) return;
      if (typeof modal.closest === 'function' && modal.closest('#resultPage')) {
        document.body.appendChild(modal);
      }
    } catch (_) {}
  }

  function _clean(v) { return String(v || '').trim(); }

  function _logFlow(code, meta) {
    try {
      console.info('[AstroBook][Flow] ' + code, meta || {});
    } catch (_) {}
  }

  function normalizeAstroError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.parse(JSON.stringify(error));
      } catch (_) {
        return { message: String(error) };
      }
    }
    return { message: String(error) };
  }

  function _logStage(stage, meta) {
    try {
      console.info('[AstroBook][' + stage + ']', meta || {});
    } catch (_) {}
  }

  function _logError(error, meta) {
    try {
      console.error('[AstroBook][Error]', {
        stage: meta && meta.stage ? String(meta.stage) : '',
        message: String(error && error.message ? error.message : error || 'unknown'),
        status: Number(error && error.status ? error.status : 0) || null,
        code: String(error && error.code ? error.code : ''),
        details: normalizeAstroError(error),
      });
    } catch (_) {}
  }

  function _persistPremiumAccessToken(token) {
    var value = String(token || '').trim();
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function _sanitizeText(v) {
    return String(v || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|llm|api|debug|object|recovered|calculationmode|swiss_required|astro_chart_seed_failed)\b/gi, '')
      .replace(/chapter\s*1/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/internal\s*server\s*error/gi, '')
      .replace(/데이터\s*부족/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function _escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _renderAstroSectionBody(text) {
    var headingRe = /^(핵심 진단|차트 근거|현실에서 드러나는 모습|장점|주의점|상담사의 조언|실천 과제)$/;
    var src = String(text || '')
      .replace(/\r/g, '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|llm|api|debug|object|recovered|calculationmode|swiss_required|astro_chart_seed_failed)\b/gi, '')
      .replace(/internal\s*server\s*error/gi, '')
      .replace(/데이터\s*부족/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .trim();
    return src
      .split(/\n+/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (line) {
        if (headingRe.test(line)) return '<h4 class="lb-sub-head">' + _escapeHtml(line) + '</h4>';
        return '<p class="lb-sub-paragraph">' + _escapeHtml(line) + '</p>';
      })
      .join('');
  }

  function _readPremiumAccessToken() {
    var t = '';
    try { t = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { t = ''; }
    if (!t) { try { t = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { t = ''; } }
    if (!t) { try { t = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { t = ''; } }
    return t;
  }

  function _extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var i = 0; i < keys.length; i += 1) {
      var found = String(payload[keys[i]] || '').trim();
      if (found) return found;
    }
    return _extractPremiumToken(payload.data) || _extractPremiumToken(payload.payload);
  }

  function _premiumTokenMatches(reportType) {
    var token = _readPremiumAccessToken();
    if (!token || typeof atob !== 'function') return false;
    try {
      var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      var actual = _clean(payload && payload.reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var expected = _clean(reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var aliases = ['westernastrologypremium', 'westernastrology', 'astropremium'];
      var matched = actual === expected || aliases.indexOf(actual) >= 0;
      var exp = Number(payload && payload.exp);
      return matched && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
    } catch (_) {
      return false;
    }
  }

  function _markPremiumAccessVerified(ttlMs) {
    var ttl = Number(ttlMs || 0);
    if (!Number.isFinite(ttl) || ttl <= 0) ttl = 25 * 60 * 1000;
    var until = Date.now() + ttl;
    if (until > _premiumAccessVerifiedUntil) _premiumAccessVerifiedUntil = until;
    if (until > _premiumPaidUntil) _premiumPaidUntil = until;
  }

  function _hasPremiumAccessForGeneration() {
    if (Date.now() < _premiumAccessVerifiedUntil) return true;
    if (_premiumTokenMatches('westernAstrologyPremium') || Date.now() < _premiumPaidUntil) {
      _markPremiumAccessVerified(25 * 60 * 1000);
      return true;
    }
    return false;
  }

  function _recoverBirthFromDOM() {
    try {
      var birthDateEl = document.getElementById('birthDate');
      var hourEl = document.getElementById('birthHour');
      var minEl = document.getElementById('birthMinute');
      var nameEl = document.getElementById('nameInput');
      var femaleEl = document.getElementById('genderFemale');
      var countryEl = document.getElementById('birthCountry');
      if (!birthDateEl || !birthDateEl.value) return null;
      var p = birthDateEl.value.split('-');
      var y = Number(p[0]);
      var m = Number(p[1]);
      var d = Number(p[2]);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
      var isFemale = !!(femaleEl && femaleEl.checked);
      var opt = countryEl && countryEl.options ? countryEl.options[countryEl.selectedIndex] : null;
      var locationData = {
        label: opt ? (opt.textContent || '대한민국 (서울)') : '대한민국 (서울)',
        lat: parseFloat(opt && opt.getAttribute('data-lat') || '37.5665'),
        lon: parseFloat(opt && opt.getAttribute('data-lon') || '126.9780'),
        tzOffset: parseFloat(opt && opt.getAttribute('data-tz') || '9'),
        tz: (opt && opt.value) || 'Asia/Seoul',
      };
      return {
        name: (nameEl && nameEl.value && nameEl.value.trim()) || '사용자',
        gender: isFemale ? 'F' : 'M',
        birth: {
          year: y,
          month: m,
          day: d,
          hour: hourEl && String(hourEl.value || '').trim() !== '' ? Number(hourEl.value) : null,
          minute: minEl && String(minEl.value || '').trim() !== '' ? Number(minEl.value) : 0,
        },
        location: locationData,
      };
    } catch (_) {
      return null;
    }
  }

  function _getActiveBirthProfile() {
    var p = window.__cdActiveBirthProfile;
    if (p && p.birth && p.birth.year) return p;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return fromDom;
    try {
      var ns = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(ns + '.list') || '[]');
      var currId = localStorage.getItem(ns + '.current');
      var match = (currId && list.find(function (it) { return it.id === currId; })) || list[0];
      if (match && match.birth && match.birth.year) return match;
    } catch (_) {}
    return null;
  }

  function _showScreen(screenId) {
    var ids = ['abNoProfileScreen', 'abStartScreen', 'abLoadingScreen', 'abResultScreen', 'abErrorScreen'];
    ids.forEach(function (id) {
      var el = _qs(id);
      if (!el) return;
      el.style.display = (id === screenId) ? '' : 'none';
    });
  }

  function _setError(msg) {
    var message = _sanitizeText(msg);
    if (/internal\s*server\s*error|\bobject\b/i.test(String(msg || ''))) {
      message = 'PDF 생성이 완료되지 않아 사용된 코인이 자동으로 환불되었습니다. 다시 시도해 주세요.';
    }
    var el = _qs('abErrorMsg');
    if (el) el.textContent = message || '생성 중 오류가 발생했습니다.';
    _showScreen('abErrorScreen');
  }

  function _resolveAstroStoredUrl(payload) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    var fallbackArchive = p.reportId ? ('/api/premium/pdf-archive/' + encodeURIComponent(String(p.reportId))) : '';
    return _clean(
      p.downloadUrl
      || p.pdfUrl
      || p.htmlUrl
      || ready.downloadUrl
      || ready.pdfUrl
      || ready.htmlUrl
      || fallbackArchive
    );
  }

  function _isCompletedReportReady(response) {
    var payload = response || {};
    var chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
    var total = _getTotalChapters();
    var hasReportId = !!_clean(payload.reportId);
    var hasStoredUrl = !!_resolveAstroStoredUrl(payload);
    var completed = _clean(payload.status || '').toLowerCase();
    var chapterComplete = chapters.length >= total;
    return hasReportId && hasStoredUrl && chapterComplete && (!completed || completed === 'completed');
  }

  function _setStartBusy(isBusy) {
    var btn = _qs('abStartBtn');
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function _signFromIndex(index) {
    var n = Number(index);
    if (!Number.isFinite(n)) return '';
    return ASTRO_SIGN_NAMES[((Math.floor(n) % 12) + 12) % 12] || '';
  }

  function _signFromLongitude(longitude) {
    var n = Number(longitude);
    if (!Number.isFinite(n)) return '';
    return _signFromIndex(Math.floor((((n % 360) + 360) % 360) / 30));
  }

  function _readSign(node) {
    if (!node) return '';
    if (typeof node === 'string') return _clean(node);
    if (typeof node === 'number') return _signFromIndex(node);
    if (typeof node !== 'object') return '';
    var direct = _clean(node.signKo || node.signName || node.name || node.value);
    if (direct) return direct;
    if (typeof node.sign === 'string') return _clean(node.sign);
    if (typeof node.sign === 'number') return _signFromIndex(node.sign);
    if (node.sign && typeof node.sign === 'object') return _readSign(node.sign);
    return _signFromLongitude(node.longitude);
  }

  function _buildApiCandidates(pathname) {
    var path = String(pathname || '');
    if (path.charAt(0) !== '/') path = '/' + path;
    var bases = [
      '',
      (typeof window !== 'undefined' && window.__CD_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__AUTH_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.location && window.location.origin) || '',
    ];
    var seen = {};
    var out = [];
    for (var i = 0; i < bases.length; i++) {
      var base = String(bases[i] || '').trim();
      var url = base ? (base.replace(/\/+$/, '') + path) : path;
      if (seen[url]) continue;
      seen[url] = true;
      out.push(url);
    }
    return out;
  }

  function _formatBirth(profile) {
    var birth = (profile && profile.birth) || {};
    var y = Number(birth.year || 0);
    var m = Number(birth.month || 0);
    var d = Number(birth.day || 0);
    var h = Number(birth.hour);
    var mm = Number(birth.minute || 0);
    var hasTime = Number.isFinite(h);
    return {
      birthDate: [String(y).padStart(4, '0'), String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('-'),
      birthTime: hasTime ? [String(h).padStart(2, '0'), String(Number.isFinite(mm) ? mm : 0).padStart(2, '0')].join(':') : '',
    };
  }

  function _parseBirthTimeInput(rawTime, rawHour, rawMinute) {
    var text = _clean(rawTime);
    if (/모름|미상|unknown|none|na/i.test(text)) {
      return { birthTime: '', birthHour: null, birthMinute: 0, isTimeUnknown: true };
    }
    var hhmm = text.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})/);
    if (hhmm) {
      var h1 = Math.max(0, Math.min(23, Number(hhmm[1])));
      var m1 = Math.max(0, Math.min(59, Number(hhmm[2])));
      return {
        birthTime: String(h1).padStart(2, '0') + ':' + String(m1).padStart(2, '0'),
        birthHour: h1,
        birthMinute: m1,
        isTimeUnknown: false,
      };
    }
    var korean = text.match(/오(전|후)\s*(\d{1,2})(?:\s*[:시]\s*(\d{1,2}))?/);
    if (korean) {
      var isPm = korean[1] === '후';
      var h2 = Math.max(0, Math.min(23, Number(korean[2])));
      var m2 = Math.max(0, Math.min(59, Number(korean[3] || 0)));
      if (isPm && h2 < 12) h2 += 12;
      if (!isPm && h2 === 12) h2 = 0;
      return {
        birthTime: String(h2).padStart(2, '0') + ':' + String(m2).padStart(2, '0'),
        birthHour: h2,
        birthMinute: m2,
        isTimeUnknown: false,
      };
    }
    var h3 = Number(rawHour);
    var m3 = Number(rawMinute || 0);
    if (!Number.isFinite(h3) && /^\d{1,2}$/.test(text)) h3 = Number(text);
    if (Number.isFinite(h3)) {
      h3 = Math.max(0, Math.min(23, Math.trunc(h3)));
      m3 = Number.isFinite(m3) ? Math.max(0, Math.min(59, Math.trunc(m3))) : 0;
      return {
        birthTime: String(h3).padStart(2, '0') + ':' + String(m3).padStart(2, '0'),
        birthHour: h3,
        birthMinute: m3,
        isTimeUnknown: false,
      };
    }
    return { birthTime: '', birthHour: null, birthMinute: 0, isTimeUnknown: true };
  }

  function _normalizeAstroBirthInput(profile) {
    var p = profile || {};
    var b = p.birth || {};
    var l = p.location || {};
    var year = Number(b.year || 0);
    var month = Number(b.month || 0);
    var day = Number(b.day || 0);
    var parsedTime = _parseBirthTimeInput(b.time || b.birthTime || '', b.hour, b.minute);
    var tz = _clean(l.tz || l.timezone || p.timezone || 'Asia/Seoul') || 'Asia/Seoul';
    var gender = _clean(p.gender).toLowerCase();
    var normGender = 'unknown';
    if (gender === 'm' || gender === 'male' || gender.indexOf('남') >= 0) normGender = 'male';
    if (gender === 'f' || gender === 'female' || gender.indexOf('여') >= 0) normGender = 'female';
    return {
      name: _clean(p.name) || undefined,
      gender: normGender,
      birthDate: [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-'),
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthTime: parsedTime.birthTime,
      birthHour: parsedTime.birthHour,
      birthMinute: parsedTime.birthMinute,
      timezone: tz,
      birthPlace: _clean(l.label || p.birthPlace || ''),
      latitude: Number.isFinite(Number(l.lat)) ? Number(l.lat) : null,
      longitude: Number.isFinite(Number(l.lon || l.lng)) ? Number(l.lon || l.lng) : null,
      isTimeUnknown: !!parsedTime.isTimeUnknown,
    };
  }

  function _validateBirthInputBeforePayment(birthInput) {
    var hasBirthDate = !!_clean(birthInput && birthInput.birthDate);
    var hasBirthYmd = Number.isFinite(Number(birthInput && birthInput.birthYear))
      && Number.isFinite(Number(birthInput && birthInput.birthMonth))
      && Number.isFinite(Number(birthInput && birthInput.birthDay));
    var hasBirthTime = Number.isFinite(Number(birthInput && birthInput.birthHour));
    if (!hasBirthDate || !hasBirthYmd) {
      return { ok: false, message: '생년월일 정보가 확인되지 않아 점성술 PDF를 생성할 수 없습니다. 프로필 카드에서 생년월일을 먼저 입력해주세요.' };
    }
    if (!hasBirthTime || birthInput.isTimeUnknown) {
      return { ok: false, message: '점성술 PDF는 상승궁과 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.' };
    }
    return { ok: true };
  }

  function _buildChartFromLocal(profile) {
    if (typeof window.calcAstroSwissChartOrThrow !== 'function') return null;
    try {
      var birth = profile.birth || {};
      var location = profile.location || {};
      var hour = Number(birth.hour);
      if (!Number.isFinite(hour)) return null;
      var localHour = hour + Number(birth.minute || 0) / 60;
      var lat = Number(location.lat || 37.5665);
      var lon = Number(location.lon || 126.9780);
      var tz = Number(location.tzOffset || 9);
      var hs = (typeof window !== 'undefined' && window.ASTRO_HOUSE_SYSTEM) ? window.ASTRO_HOUSE_SYSTEM : 'P';
      var chart = window.calcAstroSwissChartOrThrow(
        Number(birth.year),
        Number(birth.month),
        Number(birth.day),
        localHour,
        lat,
        lon,
        tz,
        hs,
      );
      return chart;
    } catch (_) {
      return null;
    }
  }

  function _buildPlanets(chart) {
    var planets = [];
    var dict = (chart && chart.planets) ? chart.planets : {};
    var keys = Object.keys(dict || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var p = dict[k] || {};
      var signName = _readSign(p);
      planets.push({
        name: k,
        sign: signName,
        degree: Number(p.degree != null ? p.degree : (p.deg != null ? p.deg : (p.sign && p.sign.deg))),
        house: Number(p.house || 0) || undefined,
        retrograde: Boolean(p.retrograde || p.retro),
      });
    }
    return planets;
  }

  function _buildHouses(chart) {
    var houses = [];
    var h = (chart && chart.houses) ? chart.houses : {};
    if ((!h || !Object.keys(h).length) && Array.isArray(chart && chart.houseCusps)) {
      for (var c = 0; c < chart.houseCusps.length && c < 12; c++) {
        var lon = Number(chart.houseCusps[c]);
        houses.push({
          house: c + 1,
          sign: _signFromLongitude(lon),
          degree: Number.isFinite(lon) ? Math.round((((lon % 30) + 30) % 30) * 100) / 100 : undefined,
        });
      }
      return houses;
    }
    for (var i = 1; i <= 12; i++) {
      var node = h['h' + i] || {};
      houses.push({
        house: i,
        sign: _readSign(node),
        degree: Number(node.degree != null ? node.degree : (node.deg != null ? node.deg : (node.sign && node.sign.deg))),
      });
    }
    return houses;
  }

  function _buildAspects(chart) {
    var aspects = [];
    var arr = (chart && chart.natal && Array.isArray(chart.natal.aspects)) ? chart.natal.aspects : (Array.isArray(chart && chart.aspects) ? chart.aspects : []);
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i] || {};
      aspects.push({
        planetA: _clean(a.a || a.p1 || a.planetA),
        planetB: _clean(a.b || a.p2 || a.planetB),
        type: _clean(a.type || a.aspect),
        orb: Number(a.orb),
        strength: _clean(a.strength),
      });
    }
    return aspects;
  }

  function _buildAstroBaseFromChart(profile, chart) {
    var birthFmt = _formatBirth(profile);
    if (!chart) return null;

    var planetMap = (chart && chart.planets) || {};
    var sunSign = _readSign(chart.sun || chart.Sun || planetMap.Sun);
    var moonSign = _readSign(chart.moon || chart.Moon || planetMap.Moon);
    var asc = _readSign(chart.asc || chart.ascendant);
    var mc = _readSign(chart.mc || chart.midheaven);

    return {
      user: {
        name: _clean(profile.name) || '사용자',
        birthDate: birthFmt.birthDate,
        birthTime: birthFmt.birthTime,
        birthPlace: _clean(profile.location && profile.location.label) || '대한민국 (서울)',
        timezone: _clean(profile.location && profile.location.tz) || 'Asia/Seoul',
        gender: _clean(profile.gender),
      },
      chart: {
        sunSign: sunSign,
        moonSign: moonSign,
        ascendant: asc,
        midheaven: mc,
        planets: _buildPlanets(chart),
        houses: _buildHouses(chart),
        aspects: _buildAspects(chart),
      },
      timing: {
        yearlyThemes: [],
        monthlyThemes: [],
      },
    };
  }

  function _buildAstroBase(profile) {
    return _buildAstroBaseFromChart(profile, _buildChartFromLocal(profile));
  }

  function _buildWesternChartRequest(profile) {
    var birth = (profile && profile.birth) || {};
    var location = (profile && profile.location) || {};
    var hour = Number(birth.hour);
    var minute = Number(birth.minute || 0);
    return {
      year: Number(birth.year),
      month: Number(birth.month),
      day: Number(birth.day),
      hour: Number.isFinite(hour) ? hour : null,
      minute: Number.isFinite(minute) ? minute : 0,
      timezone: Number(location.tzOffset || location.timezone || 9),
      lat: Number(location.lat || 37.5665),
      lon: Number(location.lon || location.lng || 126.9780),
    };
  }

  function _fetchWesternChart(profile) {
    var endpoints = _buildApiCandidates(ASTRO_WESTERN_CHART_API);
    var body = _buildWesternChartRequest(profile);
    var idx = 0;

    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(new Error(lastErr || '점성술 계산 API 호출에 실패했습니다.'));
        return;
      }
      var url = endpoints[idx++];
      var headers = { 'Content-Type': 'application/json' };
      var authToken = '';
      try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        credentials: 'include',
        cache: 'no-store',
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok !== false) {
            resolve(pack.json);
            return;
          }
          run(resolve, reject, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (err) {
          run(resolve, reject, String(err && err.message || err || '요청 실패'));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _buildAstroBaseAsync(profile) {
    var localBase = _buildAstroBase(profile);
    if (localBase && localBase.chart && localBase.chart.sunSign && localBase.chart.moonSign && localBase.chart.ascendant) {
      _logFlow('ASTRO_SEED_OK', { source: 'local' });
      return Promise.resolve(localBase);
    }
    _logFlow('ASTRO_SEED_REMOTE_START');
    return _fetchWesternChart(profile).then(function (chart) {
      var remoteBase = _buildAstroBaseFromChart(profile, chart);
      if (!remoteBase || !remoteBase.chart || !remoteBase.chart.sunSign || !remoteBase.chart.moonSign || !remoteBase.chart.ascendant) {
        throw new Error('점성술 계산 결과가 PDF 생성에 필요한 구조와 맞지 않습니다.');
      }
      _logFlow('ASTRO_SEED_OK', { source: 'worker-western-chart' });
      return remoteBase;
    });
  }

  function _renderProfileSummary(profile) {
    var el = _qs('abProfileSummary');
    if (!el) return;
    if (!profile) {
      el.textContent = '생년월일 정보를 찾을 수 없습니다. 먼저 기본 점성술 계산을 완료해 주세요.';
      return;
    }
    var birth = profile.birth || {};
    var place = (profile.location && profile.location.label) || '대한민국 (서울)';
    var hour = Number(birth.hour);
    var minute = Number(birth.minute || 0);
    var time = Number.isFinite(hour)
      ? [String(hour).padStart(2, '0'), String(Number.isFinite(minute) ? minute : 0).padStart(2, '0')].join(':')
      : '시간 미입력';
    el.textContent = [
      (profile.name || '사용자') + ' · ' + (profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : ''),
      [birth.year, birth.month, birth.day].filter(Boolean).join('년 ') + '일 ' + time,
      place,
    ].join(' · ');
  }

  function _setLoadingProgress(step, total, title) {
    var pct = Math.max(0, Math.min(100, Math.round((step / Math.max(total, 1)) * 100)));
    var bar = _qs('abProgressBar');
    var txt = _qs('abProgressText');
    var num = _qs('abLoadingChapterNum');
    var ch = _qs('abLoadingChapter');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = step + ' / ' + total + ' 챕터 완성';
    if (num) num.textContent = 'Chapter ' + step;
    if (ch) ch.textContent = _sanitizeText(title || '점성술 코즈믹 차트 PDF를 완성하는 중입니다');

    var dots = document.querySelectorAll('.ab-ch-dot');
    Array.prototype.forEach.call(dots, function (dot) {
      var n = Number(dot.getAttribute('data-abch'));
      dot.classList.toggle('lb-ch-dot--active', n === step);
      dot.classList.toggle('lb-ch-dot--done', n < step);
    });
  }

  function _getTotalChapters() {
    var fromCanonical = Array.isArray(_canonicalChapters) ? _canonicalChapters.length : 0;
    var fromResult = Array.isArray(_chapters) ? _chapters.length : 0;
    var fromState = Number(ASTRO_TOTAL_CHAPTERS || 0);
    var total = fromCanonical || fromResult || fromState || 1;
    return Math.max(1, Math.trunc(total));
  }

  function _stopProgressAnimation() {
    if (_progressTimer) {
      clearInterval(_progressTimer);
      _progressTimer = null;
    }
  }

  function _startProgressAnimation() {
    _stopProgressAnimation();
    var titles = _canonicalChapters.length
      ? _canonicalChapters.map(function (c) { return c.title; })
      : [];
    if (!titles.length) {
      titles = [
        '태양·달·상승궁을 정리하는 중입니다',
        '행성과 하우스의 흐름을 해석하는 중입니다',
        '주요 어스펙트와 인생 과제를 구성하는 중입니다',
        '사랑·직업·재물의 방향을 정리하는 중입니다',
        '현재 시기와 회복 전략을 반영하는 중입니다',
        '점성술 코즈믹 차트 PDF를 완성하는 중입니다',
      ];
    }
    var total = _getTotalChapters();
    var idx = 1;
    _setLoadingProgress(1, total, titles[0]);
    _progressTimer = setInterval(function () {
      if (!_generating) {
        _stopProgressAnimation();
        return;
      }
      total = _getTotalChapters();
      idx += 1;
      if (idx > total) idx = total;
      _setLoadingProgress(idx, total, titles[Math.min(idx - 1, titles.length - 1)]);
      if (idx >= total) _stopProgressAnimation();
    }, 850);
  }

  function _renderResult(chapters, payload) {
    var toc = _qs('abToc');
    var content = _qs('abChapterContent');
    var n = _qs('abResultName');
    var d = _qs('abResultDate');
    if (toc) toc.innerHTML = '';
    if (content) content.innerHTML = '';
    if (n) n.textContent = '✨ ' + _sanitizeText(payload && payload.user && payload.user.name || '사용자') + '님의 코즈믹 리포트';
    if (d) d.textContent = _sanitizeText(payload && payload.user && payload.user.birthDate || '');

    chapters.forEach(function (chapter, idx) {
      if (toc) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lb-toc-item loaded';
        btn.textContent = chapter.roman + '. ' + _sanitizeText(chapter.title);
        btn.addEventListener('click', function () {
          var sec = document.getElementById('abChapter-' + (idx + 1));
          if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        toc.appendChild(btn);
      }

      if (content) {
        var section = document.createElement('section');
        section.id = 'abChapter-' + (idx + 1);
        section.className = 'lb-chapter-card';
        var html = '<h4 class="lb-chapter-title">' + chapter.roman + '. ' + _sanitizeText(chapter.title) + '</h4>';
        var cats = Array.isArray(chapter.categories) ? chapter.categories : [];
        for (var i = 0; i < cats.length; i++) {
          var c = cats[i] || {};
          html += '<article class="lb-sub-card">'
            + '<h5 class="lb-sub-title">' + _sanitizeText(c.title || ('세부 카테고리 ' + (i + 1))) + '</h5>'
            + '<div class="lb-sub-body">' + _renderAstroSectionBody(c.text || c.localSummary || '') + '</div>'
            + '</article>';
        }
        section.innerHTML = html;
        content.appendChild(section);
      }
    });
  }

  function _fetchCanonicalChapters() {
    var endpoints = _buildApiCandidates(ASTRO_CHAPTERS_API);
    var idx = 0;
    function next(resolve) {
      if (idx >= endpoints.length) return resolve([]);
      var u = endpoints[idx++];
      fetch(u)
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.chapters) && data.chapters.length) {
            resolve(data.chapters);
            return;
          }
          next(resolve);
        })
        .catch(function () { next(resolve); });
    }
    return new Promise(function (resolve) { next(resolve); });
  }

  function _postPrepare(body) {
    var endpoints = _buildApiCandidates(ASTRO_PREPARE_API);
    var idx = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();

    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(new Error(lastErr || '점성술 프리미엄 API 호출에 실패했습니다.'));
        return;
      }
      var url = endpoints[idx++];
      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;

      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) {
            _persistPremiumAccessToken(_extractPremiumToken(pack.json));
            resolve(pack.json);
            return;
          }
          run(resolve, reject, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (err) {
          run(resolve, reject, String(err && err.message || err || '요청 실패'));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _ensurePremiumPaymentAsync() {
    if (_hasPremiumAccessForGeneration()) {
      _logStage('PaymentGateStart', { featureKey: ASTRO_BILLING_FEATURE_KEY, reused: true });
      _logStage('PaymentGateSuccess', { featureKey: ASTRO_BILLING_FEATURE_KEY, reused: true });
      return Promise.resolve({ ok: true, skipped: true });
    }
    if (typeof window._cdCoinGatePerUse !== 'function') {
      return Promise.reject(new Error('결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.'));
    }
    _logStage('PaymentGateStart', { featureKey: ASTRO_BILLING_FEATURE_KEY });
    return new Promise(function (resolve, reject) {
      try {
        window._cdCoinGatePerUse(ASTRO_COIN_COST, '점성술 프리미엄 PDF 리포트 생성', function (_transactionId, data) {
          _lastPremiumPayment = data || null;
          _persistPremiumAccessToken(_extractPremiumToken(data));
          _markPremiumAccessVerified(25 * 60 * 1000);
          _logStage('PaymentGateSuccess', { featureKey: ASTRO_BILLING_FEATURE_KEY });
          resolve({ ok: true, skipped: false, data: data || {} });
        }, function () {
          reject(new Error('결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'));
        }, {
          featureKey: ASTRO_BILLING_FEATURE_KEY,
          requestId: 'astro-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  window.openAstroBookModal = function () {
    _logFlow('CARD_CLICK');
    _logStage('ModalOpen', {});
    var modal = _qs('astroBookModal');
    if (!modal) return;
    _detachModalFromResultPage(modal);

    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth || !profile.birth.year) {
      try {
        var _dpNs = 'FORTUNE_APP_USER_PROFILES';
        var _dpList = JSON.parse(localStorage.getItem(_dpNs + '.list') || '[]');
        var _dpCurrId = localStorage.getItem(_dpNs + '.current');
        var _dpMatch = (_dpCurrId && _dpList.find(function (p) { return p.id === _dpCurrId; })) || (_dpList.length && _dpList[0]) || null;
        if (_dpMatch && _dpMatch.birth && _dpMatch.birth.year) {
          window.__cdActiveBirthProfile = _dpMatch;
          profile = _dpMatch;
        }
      } catch (_dpE) {}
    }

    if (profile && profile.birth && profile.birth.year) {
      window.__cdActiveBirthProfile = profile;
      _renderProfileSummary(profile);
      _showScreen('abStartScreen');
    } else {
      _showScreen('abNoProfileScreen');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}

    _fetchCanonicalChapters().then(function (chapters) {
      if (Array.isArray(chapters) && chapters.length) {
        _canonicalChapters = chapters;
        ASTRO_TOTAL_CHAPTERS = chapters.length;
      }
    }).catch(function () {});
  };

  window.closeAstroBookModal = function () {
    var modal = _qs('astroBookModal');
    if (!modal) return;
    _stopProgressAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.gotoAstrologyPremium = function () {
    _logFlow('CARD_VISIBLE_CHECK', { card: 'gotoAstrologyPremium' });
    window.openAstroBookModal();
  };

  window.generateAstroBook = function () {
    if (_generating) return;
    var profile = _getActiveBirthProfile();
    _logStage('ProfileResolved', {
      hasBirthDate: !!(profile && profile.birth && profile.birth.year),
      hasBirthTime: !!(profile && profile.birth && Number.isFinite(Number(profile.birth.hour))),
      hasLocation: !!(profile && profile.location),
    });

    if (!profile || !profile.birth) {
      _showScreen('abNoProfileScreen');
      return;
    }

    var birthInput = _normalizeAstroBirthInput(profile);
    _logStage('BirthInputNormalized', {
      hasBirthDate: !!_clean(birthInput.birthDate),
      hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
      birthHour: Number.isFinite(Number(birthInput.birthHour)) ? Number(birthInput.birthHour) : null,
      hasTimezone: !!_clean(birthInput.timezone),
      hasLocation: !!_clean(birthInput.birthPlace),
      houseSystemUsed: true,
    });

    var valid = _validateBirthInputBeforePayment(birthInput);
    _logStage('ValidationBeforePayment', {
      ok: !!valid.ok,
      hasBirthDate: !!_clean(birthInput.birthDate),
      hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
      hasTimezone: !!_clean(birthInput.timezone),
      hasLocation: !!_clean(birthInput.birthPlace),
      houseSystemUsed: true,
    });
    if (!valid.ok) {
      _setError(valid.message);
      return;
    }

    _generating = true;
    _setStartBusy(true);
    _showScreen('abLoadingScreen');
    var total = _getTotalChapters();
    _setLoadingProgress(1, total, '프로필 정보 확인 중');
    _startProgressAnimation();
    _setLoadingProgress(2, total, '결제 및 세션 준비 중');
    _logStage('PaymentAndSessionStart', { totalChapters: total });

    _ensurePremiumPaymentAsync()
      .then(function (payment) {
        var paymentGrant = payment && payment.data && payment.data.accessGrant ? payment.data.accessGrant : (_lastPremiumPayment && _lastPremiumPayment.accessGrant ? _lastPremiumPayment.accessGrant : null);
        var paymentContext = paymentGrant ? {
          featureKey: ASTRO_BILLING_FEATURE_KEY,
          requestId: paymentGrant.requestId || paymentGrant.transactionId || '',
          purchaseId: paymentGrant.purchaseId || '',
          sessionId: paymentGrant.sessionId || paymentGrant.reportSessionId || '',
          reportSessionId: paymentGrant.reportSessionId || paymentGrant.sessionId || '',
          reportId: paymentGrant.reportId || '',
        } : undefined;
        _logStage('SessionCreateStart', {
          hasBirthDate: !!_clean(birthInput.birthDate),
          hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
        });
        var sessionId = 'astro-premium:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
        _logStage('SessionCreateSuccess', { sessionId: sessionId });
        _setLoadingProgress(total, total, '점성술 코즈믹 차트 PDF를 완성하는 중입니다');
        _logStage('PdfRequestStart', { featureKey: ASTRO_FEATURE_KEY, sessionId: sessionId });
        return _postPrepare({
          featureKey: ASTRO_FEATURE_KEY,
          reportType: 'westernAstrologyPremium',
          premiumAccessToken: _readPremiumAccessToken() || _extractPremiumToken(payment && payment.data) || undefined,
          sessionId: sessionId,
          reportSessionId: paymentGrant && (paymentGrant.reportSessionId || paymentGrant.sessionId) || sessionId,
          purchaseId: paymentGrant && paymentGrant.purchaseId || undefined,
          requestId: paymentGrant && (paymentGrant.requestId || paymentGrant.transactionId) || undefined,
          accessGrant: paymentGrant || undefined,
          payment: paymentContext ? {
            featureKey: ASTRO_BILLING_FEATURE_KEY,
            requestId: paymentContext.requestId,
            purchaseId: paymentContext.purchaseId,
            sessionId: paymentContext.sessionId,
            reportSessionId: paymentContext.reportSessionId,
            reportId: paymentContext.reportId,
          } : undefined,
          _paymentContext: paymentContext,
          birthInput: birthInput,
          profile: profile,
        });
      })
      .then(function (response) {
        if (!_isCompletedReportReady(response)) {
          throw new Error('점성술 PDF 결과가 아직 완전히 저장되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        }
        _markPremiumAccessVerified(25 * 60 * 1000);
        _resultPayload = response;
        _chapters = Array.isArray(response.chapters) ? response.chapters : [];
        if (!_chapters.length) throw new Error('점성술 챕터 데이터가 비어 있습니다.');
        ASTRO_TOTAL_CHAPTERS = _chapters.length;
        total = _getTotalChapters();
        _setLoadingProgress(total, total, '점성술 코즈믹 차트 PDF를 완성하는 중입니다');
        if (response && response.fallbackUsed && _isCompletedReportReady(response)) {
          _logStage('LLMEnhanceFailedUseLocal', { chapterCount: total });
          _setLoadingProgress(total, total, '로컬 점성술 차트 해석을 반영해 PDF를 완성하고 있습니다.');
        }
        _logStage('PdfRenderStart', { chapterCount: total });
        _setLoadingProgress(total, total, 'PDF 편집/렌더링 중');
        _renderResult(_chapters, response.payload || {});
        _setLoadingProgress(total, total, '완료');
        _logStage('PdfRequestSuccess', { chapterCount: _chapters.length, fallbackUsed: !!response.fallbackUsed });
        _showScreen('abResultScreen');
      })
      .catch(function (err) {
        _logError(err, { stage: 'generate' });
        _setError(String(err && err.message ? err.message : err || '생성 실패'));
      })
      .finally(function () {
        _generating = false;
        _setStartBusy(false);
        _stopProgressAnimation();
      });
  };

  window.downloadAstroBookPdf = function () {
    var url = _resolveAstroStoredUrl(_resultPayload);

    if (url) {
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = (_resultPayload && _resultPayload.pdfReady && _resultPayload.pdfReady.filename) || 'astro-premium-report.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    alert('리포트 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');

    if (action === 'openAstroBookModal') {
      window.openAstroBookModal();
      return;
    }
    if (action === 'closeAstroBookModal') {
      window.closeAstroBookModal();
      return;
    }
    if (action === 'gotoAstrologyPremium') {
      window.gotoAstrologyPremium();
      return;
    }
  });
})();
