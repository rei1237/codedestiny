/**
 * Vedic Premium PDF (Jyotish)
 * Worker-native local-first premium pipeline.
 */
(function () {
  'use strict';

  var VEDIC_FEATURE_KEY = 'premium_pdf_vedic';
  var VEDIC_PREPARE_API = '/api/vedic/premium/prepare';
  var VEDIC_CHAPTERS_API = '/api/vedic/premium/chapters';
  var VEDIC_PLANETS_API = '/api/vedic/planets';
  var VEDIC_TOTAL_CHAPTERS = 12;
  var VEDIC_COIN_COST = 390;

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var _generating = false;
  var _progressTimer = null;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;
  var _currentVedicSessionId = '';

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }

  function _detachModalFromResultPage(modal) {
    try {
      if (!modal || !modal.parentElement) return;
      if (typeof modal.closest === 'function' && modal.closest('#resultPage')) {
        document.body.appendChild(modal);
      }
    } catch (_) {}
  }

  function _logStage(stage, meta) {
    try { console.info('[VedicBook][' + stage + ']', meta || {}); } catch (_) {}
  }

  function normalizeVedicError(error) {
    if (error instanceof Error) {
      return { name: error.name, message: error.message, stack: error.stack };
    }
    if (typeof error === 'object' && error !== null) {
      try { return JSON.parse(JSON.stringify(error)); } catch (_) { return { message: String(error) }; }
    }
    return { message: String(error) };
  }

  function _logError(error, meta) {
    var stage = _clean(meta && meta.stage) || 'unknown';
    var message = _clean(error && error.message) || _clean(error) || 'unknown';
    var status = Number(error && error.status);
    var code = _clean(error && error.code);
    try {
      console.error('[VedicBook][Error]', {
        stage: stage,
        message: message,
        status: Number.isFinite(status) ? status : null,
        code: code || null,
        details: normalizeVedicError(error),
      });
    } catch (_) {}
  }

  function _sanitizeText(value) {
    return String(value || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|llm|api|debug|internal\s*server\s*error|object|calculationmode|recovered|about:blank)\b/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/chapter\s*1\s*chapter\s*1/gi, '')
      .replace(/데이터가\s*부족합니다/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function _persistPremiumAccessToken(token) {
    var value = String(token || '').trim();
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function _readPremiumAccessToken() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) { try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    return token;
  }

  function _extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var index = 0; index < keys.length; index += 1) {
      var found = String(payload[keys[index]] || '').trim();
      if (found) return found;
    }
    return _extractPremiumToken(payload.data) || _extractPremiumToken(payload.payload);
  }

  function _premiumTokenMatches() {
    var token = _readPremiumAccessToken();
    if (!token || typeof atob !== 'function') return false;
    try {
      var middle = token.split('.')[1] || '';
      var payload = JSON.parse(atob(middle.replace(/-/g, '+').replace(/_/g, '/')));
      var actual = _clean(payload && payload.reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var aliases = ['vedicpremium', 'vedic', 'premiumvedicreport', 'premiumvedic'];
      var exp = Number(payload && payload.exp);
      return aliases.indexOf(actual) >= 0 && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
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
    if (_premiumTokenMatches() || Date.now() < _premiumPaidUntil) {
      _markPremiumAccessVerified(25 * 60 * 1000);
      return true;
    }
    return false;
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
    for (var index = 0; index < bases.length; index += 1) {
      var base = String(bases[index] || '').trim();
      var url = base ? (base.replace(/\/+$/, '') + path) : path;
      if (seen[url]) continue;
      seen[url] = true;
      out.push(url);
    }
    return out;
  }

  function _recoverBirthFromDOM() {
    try {
      var birthDateEl = document.getElementById('birthDate');
      var hourEl = document.getElementById('birthHour');
      var minuteEl = document.getElementById('birthMinute');
      var nameEl = document.getElementById('nameInput');
      var femaleEl = document.getElementById('genderFemale');
      var countryEl = document.getElementById('birthCountry');
      if (!birthDateEl || !birthDateEl.value) return null;
      var parts = birthDateEl.value.split('-');
      var year = Number(parts[0]);
      var month = Number(parts[1]);
      var day = Number(parts[2]);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      var option = countryEl && countryEl.options ? countryEl.options[countryEl.selectedIndex] : null;
      var h = hourEl ? Number(hourEl.value) : NaN;
      var m = minuteEl ? Number(minuteEl.value) : 0;
      return {
        name: (nameEl && nameEl.value && nameEl.value.trim()) || '사용자',
        gender: femaleEl && femaleEl.checked ? 'F' : 'M',
        birth: {
          year: year,
          month: month,
          day: day,
          hour: Number.isFinite(h) ? h : null,
          minute: Number.isFinite(m) ? m : 0,
        },
        location: {
          label: option ? (option.textContent || '대한민국 (서울)') : '대한민국 (서울)',
          lat: parseFloat(option && option.getAttribute('data-lat') || '37.5665'),
          lon: parseFloat(option && option.getAttribute('data-lon') || '126.9780'),
          tzOffset: parseFloat(option && option.getAttribute('data-tz') || '9'),
          tz: (option && option.value) || 'Asia/Seoul',
        },
      };
    } catch (_) {
      return null;
    }
  }

  function _hasValidBirthProfile(profile) {
    return Boolean(profile && profile.birth && Number(profile.birth.year) > 1800 && Number(profile.birth.month) > 0 && Number(profile.birth.day) > 0);
  }

  function _readBirthProfileFromStorage() {
    try {
      var namespace = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(namespace + '.list') || '[]');
      var currentId = localStorage.getItem(namespace + '.current');
      var match = (currentId && list.find(function (item) { return item.id === currentId; })) || list[0] || null;
      if (_hasValidBirthProfile(match)) return match;
    } catch (_) {}

    try {
      var payload = JSON.parse(localStorage.getItem('destiny_profile') || sessionStorage.getItem('destiny_profile') || '{}');
      if (payload && payload.birth && payload.birth.year) return payload;
    } catch (_) {}

    return null;
  }

  function _toProfileFromAuthMe(raw) {
    var source = (raw && (raw.profile || raw.user || raw.data || raw)) || {};
    var birth = source.birth || source.birthInput || {};
    var location = source.location || {};
    var year = Number(source.birthYear != null ? source.birthYear : birth.year);
    var month = Number(source.birthMonth != null ? source.birthMonth : birth.month);
    var day = Number(source.birthDay != null ? source.birthDay : birth.day);
    var hour = Number(source.birthHour != null ? source.birthHour : birth.hour);
    var minute = Number(source.birthMinute != null ? source.birthMinute : birth.minute);
    if (!_hasValidBirthProfile({ birth: { year: year, month: month, day: day } })) return null;

    return {
      name: source.name || source.nickname || '사용자',
      gender: source.gender || source.sex || 'unknown',
      birth: {
        year: year,
        month: month,
        day: day,
        hour: Number.isFinite(hour) ? hour : null,
        minute: Number.isFinite(minute) ? minute : 0,
      },
      location: {
        label: source.birthPlace || source.place || source.locationName || location.label || '대한민국 (서울)',
        lat: Number(source.latitude != null ? source.latitude : (source.lat != null ? source.lat : location.lat)),
        lon: Number(source.longitude != null ? source.longitude : (source.lng != null ? source.lng : (source.lon != null ? source.lon : location.lon))),
        tz: source.timezone || source.tz || location.tz || 'Asia/Seoul',
      },
    };
  }

  function _fetchBirthProfileFromAuthApi() {
    var endpoints = _buildApiCandidates('/api/auth/me');
    var endpointIndex = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }

    function run(resolve) {
      if (endpointIndex >= endpoints.length) { resolve(null); return; }
      var headers = {};
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      fetch(endpoints[endpointIndex++], { method: 'GET', headers: headers, credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          var profile = _toProfileFromAuthMe(data);
          if (_hasValidBirthProfile(profile)) { resolve(profile); return; }
          run(resolve);
        })
        .catch(function () { run(resolve); });
    }

    return new Promise(function (resolve) { run(resolve); });
  }

  function _getActiveBirthProfile() {
    var profile = window.__cdActiveBirthProfile;
    if (_hasValidBirthProfile(profile)) return profile;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (_hasValidBirthProfile(snap)) return snap;
    var storageProfile = _readBirthProfileFromStorage();
    if (_hasValidBirthProfile(storageProfile)) return storageProfile;
    var fromDom = _recoverBirthFromDOM();
    if (_hasValidBirthProfile(fromDom)) return fromDom;
    return null;
  }

  function _resolveBirthProfile() {
    var active = _getActiveBirthProfile();
    if (_hasValidBirthProfile(active)) return Promise.resolve(active);
    return _fetchBirthProfileFromAuthApi().then(function (apiProfile) {
      if (_hasValidBirthProfile(apiProfile)) return apiProfile;
      return _getActiveBirthProfile();
    });
  }

  function _normalizeGender(value) {
    var token = _clean(value).toLowerCase();
    if (token === 'm' || token === 'male' || token === '남' || token === '남자' || token === '남성') return 'male';
    if (token === 'f' || token === 'female' || token === '여' || token === '여자' || token === '여성') return 'female';
    return 'unknown';
  }

  function _toTimezoneOffset(timezone) {
    var raw = _clean(timezone);
    if (!raw) return 9;
    var n = Number(raw);
    if (Number.isFinite(n)) return n;
    var lower = raw.toLowerCase();
    if (lower === 'asia/seoul' || lower === 'asia/tokyo') return 9;
    if (lower === 'utc' || lower === 'etc/utc' || lower === 'gmt') return 0;
    return 9;
  }

  function _normalizeBirthInput(profile) {
    var birth = (profile && profile.birth) || {};
    var location = (profile && profile.location) || {};
    var year = Number(birth.year);
    var month = Number(birth.month);
    var day = Number(birth.day);
    var hasDate = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) && year > 1800;

    var hour = Number(birth.hour);
    var minute = Number(birth.minute);
    if (!Number.isFinite(minute)) minute = 0;
    var isTimeUnknown = !Number.isFinite(hour);
    if (!isTimeUnknown) {
      hour = Math.max(0, Math.min(23, Math.floor(hour)));
      minute = Math.max(0, Math.min(59, Math.floor(minute)));
    }

    return {
      name: _clean(profile && profile.name) || undefined,
      gender: _normalizeGender(profile && profile.gender),
      birthDate: hasDate ? [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-') : '',
      birthYear: hasDate ? year : null,
      birthMonth: hasDate ? month : null,
      birthDay: hasDate ? day : null,
      birthTime: isTimeUnknown ? '' : [String(hour).padStart(2, '0'), String(minute).padStart(2, '0')].join(':'),
      birthHour: isTimeUnknown ? null : hour,
      birthMinute: minute,
      timezone: _clean(location.tz) || 'Asia/Seoul',
      birthPlace: _clean(location.label) || undefined,
      latitude: Number.isFinite(Number(location.lat)) ? Number(location.lat) : null,
      longitude: Number.isFinite(Number(location.lon || location.lng)) ? Number(location.lon || location.lng) : null,
      isTimeUnknown: isTimeUnknown,
    };
  }

  function _validateBeforePayment(birthInput) {
    if (!_clean(birthInput && birthInput.birthDate)) {
      var dateErr = new Error('베다점 PDF 생성을 위해 생년월일 정보가 필요합니다. 프로필 카드를 먼저 확인해주세요.');
      dateErr.code = 'BIRTH_DATE_REQUIRED';
      dateErr.status = 422;
      throw dateErr;
    }
    if (birthInput && (birthInput.isTimeUnknown || birthInput.birthHour == null)) {
      var timeErr = new Error('베다점 PDF는 라그나와 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.');
      timeErr.code = 'BIRTH_TIME_REQUIRED';
      timeErr.status = 422;
      throw timeErr;
    }
  }

  function _buildVedicChartRequest(profile, birthInput) {
    var birth = (profile && profile.birth) || {};
    var location = (profile && profile.location) || {};
    var normalized = birthInput || _normalizeBirthInput(profile || {});
    return {
      year: Number(normalized.birthYear || birth.year),
      month: Number(normalized.birthMonth || birth.month),
      day: Number(normalized.birthDay || birth.day),
      hour: Number(normalized.birthHour != null ? normalized.birthHour : (birth.hour || 12)),
      minute: Number(normalized.birthMinute != null ? normalized.birthMinute : (birth.minute || 0)),
      timezone: Number(location.tzOffset != null ? location.tzOffset : _toTimezoneOffset(normalized.timezone || location.tz || location.timezone)),
      lat: Number(normalized.latitude != null ? normalized.latitude : (location.lat || 37.5665)),
      lon: Number(normalized.longitude != null ? normalized.longitude : (location.lon || location.lng || 126.9780)),
    };
  }

  function _fetchVedicChart(profile, birthInput) {
    var endpoints = _buildApiCandidates(VEDIC_PLANETS_API);
    var body = _buildVedicChartRequest(profile, birthInput);
    var endpointIndex = 0;
    function run(resolve, reject, lastErr) {
      if (endpointIndex >= endpoints.length) {
        reject(new Error(lastErr || '베다점 계산 API 호출에 실패했습니다.'));
        return;
      }
      var url = endpoints[endpointIndex++];
      var headers = { 'Content-Type': 'application/json' };
      var authToken = '';
      try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; }); })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok !== false) { resolve(pack.json); return; }
          run(resolve, reject, (pack.json && (pack.json.message || pack.json.error || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (error) { run(resolve, reject, String(error && error.message || error || '요청 실패')); });
    }
    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _buildVedicBase(profile, chart, birthInput) {
    var normalized = birthInput || _normalizeBirthInput(profile || {});
    return {
      birthInput: normalized,
      user: {
        name: _clean(normalized.name) || '사용자',
        birthDate: _clean(normalized.birthDate),
        birthTime: _clean(normalized.birthTime),
        birthPlace: _clean(normalized.birthPlace) || '대한민국 (서울)',
        timezone: _clean(normalized.timezone) || 'Asia/Seoul',
        gender: _clean(normalized.gender),
      },
      chart: {
        planets: (chart && chart.planets) || {},
        retrograde: (chart && chart.retrograde) || {},
        ayanamsa: chart && chart.ayanamsa,
        ascendantSidereal: chart && chart.ascendantSidereal,
        source: _clean(chart && chart.source) || 'worker-vedic-planets',
      },
      location: {
        lat: Number(normalized.latitude != null ? normalized.latitude : 37.5665),
        lon: Number(normalized.longitude != null ? normalized.longitude : 126.9780),
      },
    };
  }

  function _showScreen(screenId) {
    ['vdNoProfileScreen', 'vdStartScreen', 'vdLoadingScreen', 'vdResultScreen', 'vdErrorScreen'].forEach(function (id) {
      var element = _qs(id);
      if (!element) return;
      element.style.display = id === screenId ? '' : 'none';
    });
  }

  function _setError(message) {
    var element = _qs('vdErrorMsg');
    var safe = _sanitizeText(message);
    if (/internal\s*server\s*error/i.test(String(message || ''))) {
      safe = 'AI 문장 보강이 지연되어 로컬 베다점 차트 기반 프리미엄 원고로 PDF를 완성합니다.';
    }
    if (element) element.textContent = safe || '생성 중 오류가 발생했습니다.';
    _showScreen('vdErrorScreen');
  }

  function _setStartBusy(isBusy) {
    var button = _qs('vdStartBtn');
    if (!button) return;
    button.disabled = !!isBusy;
    button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function _renderProfileSummary(profile) {
    var element = _qs('vdProfileSummary');
    if (!element) return;
    if (!profile) {
      element.textContent = '생년월일 정보를 찾을 수 없습니다. 먼저 나의 운명 카드를 설정해 주세요.';
      return;
    }
    var birth = profile.birth || {};
    var place = (profile.location && profile.location.label) || '대한민국 (서울)';
    var hour = Number(birth.hour);
    var minute = Number(birth.minute);
    var time = Number.isFinite(hour)
      ? [String(Math.max(0, Math.min(23, Math.floor(hour)))).padStart(2, '0'), String(Number.isFinite(minute) ? Math.max(0, Math.min(59, Math.floor(minute))) : 0).padStart(2, '0')].join(':')
      : '시간 미입력';
    element.textContent = [(profile.name || '사용자') + ' · ' + (profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : ''), [birth.year, birth.month, birth.day].filter(Boolean).join('년 ') + '일 ' + time, place].join(' · ');
  }

  function _setLoadingProgress(step, total, title) {
    var pct = Math.max(0, Math.min(100, Math.round((step / Math.max(total, 1)) * 100)));
    var bar = _qs('vdProgressBar');
    var text = _qs('vdProgressText');
    var number = _qs('vdLoadingChapterNum');
    var chapter = _qs('vdLoadingChapter');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = step + ' / ' + total + ' 챕터 완성';
    if (number) number.textContent = '제' + step + '장';
    if (chapter) chapter.textContent = _sanitizeText(title || '베다점 챕터를 생성하는 중입니다');
    var dots = document.querySelectorAll('.vd-ch-dot');
    Array.prototype.forEach.call(dots, function (dot) {
      var dotNo = Number(dot.getAttribute('data-vdch'));
      dot.classList.toggle('lb-ch-dot--active', dotNo === step);
      dot.classList.toggle('lb-ch-dot--done', dotNo < step);
    });
  }

  function _stopProgressAnimation() {
    if (_progressTimer) {
      clearInterval(_progressTimer);
      _progressTimer = null;
    }
  }

  function _startProgressAnimation() {
    _stopProgressAnimation();
    var titles = ['프로필 정보 확인 중', '베다 차트 계산 중', '12챕터 로컬 원고 생성 중'];
    var index = 1;
    _setLoadingProgress(1, VEDIC_TOTAL_CHAPTERS, titles[0]);
    _progressTimer = setInterval(function () {
      if (!_generating) { _stopProgressAnimation(); return; }
      index += 1;
      if (index > VEDIC_TOTAL_CHAPTERS) index = VEDIC_TOTAL_CHAPTERS;
      var titleIndex = index <= 1 ? 0 : (index <= 2 ? 1 : 2);
      _setLoadingProgress(index, VEDIC_TOTAL_CHAPTERS, titles[titleIndex]);
      if (index >= VEDIC_TOTAL_CHAPTERS) _stopProgressAnimation();
    }, 850);
  }

  function _renderResult(chapters, payload) {
    var toc = _qs('vdToc');
    var content = _qs('vdChapterContent');
    var name = _qs('vdResultName');
    var date = _qs('vdResultDate');
    if (toc) toc.innerHTML = '';
    if (content) content.innerHTML = '';
    if (name) name.textContent = '🪷 ' + _sanitizeText(payload && payload.user && payload.user.name || '사용자') + '님의 베다점 리포트';
    if (date) date.textContent = _sanitizeText(payload && payload.user && payload.user.birthDate || '');
    chapters.forEach(function (chapter, index) {
      var chapterNo = Number(chapter && (chapter.order || chapter.chapterNo || (index + 1))) || (index + 1);
      var heading = _sanitizeText(String(chapter && chapter.title || '').split('—')[0]) || ('제' + chapterNo + '장');
      if (toc) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'lb-toc-item loaded';
        button.textContent = '제' + chapterNo + '장 ' + heading;
        button.addEventListener('click', function () {
          var section = document.getElementById('vdChapter-' + (index + 1));
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        toc.appendChild(button);
      }
      if (content) {
        var sectionEl = document.createElement('section');
        sectionEl.id = 'vdChapter-' + (index + 1);
        sectionEl.className = 'lb-chapter-card';
        var html = '<h4 class="lb-chapter-title">제' + chapterNo + '장 ' + heading + '</h4>';
        var categories = Array.isArray(chapter.categories) ? chapter.categories : [];
        for (var categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
          var category = categories[categoryIndex] || {};
          html += '<article class="lb-sub-card"><h5 class="lb-sub-title">' + _sanitizeText(category.title || ('세부 카테고리 ' + (categoryIndex + 1))) + '</h5><p class="lb-sub-body">' + _sanitizeText(category.text || category.localSummary || '') + '</p></article>';
        }
        sectionEl.innerHTML = html;
        content.appendChild(sectionEl);
      }
    });
  }

  function _fetchCanonicalChapters() {
    var endpoints = _buildApiCandidates(VEDIC_CHAPTERS_API);
    var endpointIndex = 0;
    function next(resolve) {
      if (endpointIndex >= endpoints.length) return resolve([]);
      var url = endpoints[endpointIndex++];
      fetch(url)
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.chapters) && data.chapters.length) { resolve(data.chapters); return; }
          next(resolve);
        })
        .catch(function () { next(resolve); });
    }
    return new Promise(function (resolve) { next(resolve); });
  }

  function _postPrepare(body) {
    var endpoints = _buildApiCandidates(VEDIC_PREPARE_API);
    var endpointIndex = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();
    function run(resolve, reject, lastErr) {
      if (endpointIndex >= endpoints.length) { reject(new Error(lastErr || '베다점 프리미엄 API 호출에 실패했습니다.')); return; }
      var url = endpoints[endpointIndex++];
      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;
      fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; }); })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) { _persistPremiumAccessToken(_extractPremiumToken(pack.json)); resolve(pack.json); return; }
          run(resolve, reject, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (error) { run(resolve, reject, String(error && error.message || error || '요청 실패')); });
    }
    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _ensurePremiumPaymentThenStart() {
    if (_hasPremiumAccessForGeneration()) return true;
    if (typeof window._cdCoinGatePerUse !== 'function') {
      alert('결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
      return false;
    }
    _logStage('PaymentGateStart', { featureKey: VEDIC_FEATURE_KEY });
    window._cdCoinGatePerUse(VEDIC_COIN_COST, '베다 점성술 프리미엄 PDF 리포트 생성', function (_transactionId, data) {
      _persistPremiumAccessToken(_extractPremiumToken(data));
      _markPremiumAccessVerified(25 * 60 * 1000);
      _logStage('PaymentGateSuccess', { featureKey: VEDIC_FEATURE_KEY });
      window.generateVedicBook();
    }, null, {
      featureKey: VEDIC_FEATURE_KEY,
      requestId: 'vedic-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    });
    return false;
  }

  window.openVedicBookModal = function () {
    _logStage('CardClick');
    var modal = _qs('vedicBookModal');
    if (!modal) return;
    _detachModalFromResultPage(modal);

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}

    _logStage('ModalOpen');
    _resolveBirthProfile().then(function (profile) {
      if (_hasValidBirthProfile(profile)) {
        window.__cdActiveBirthProfile = profile;
        _renderProfileSummary(profile);
        _showScreen('vdStartScreen');
        return;
      }
      _showScreen('vdNoProfileScreen');
    }).catch(function () {
      _showScreen('vdNoProfileScreen');
    });

    _fetchCanonicalChapters().then(function (chapters) {
      if (Array.isArray(chapters) && chapters.length) {
        _canonicalChapters = chapters;
        VEDIC_TOTAL_CHAPTERS = chapters.length;
      }
    }).catch(function () {});
  };

  window.closeVedicBookModal = function () {
    var modal = _qs('vedicBookModal');
    if (!modal) return;
    _stopProgressAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.gotoVedicPremium = function () {
    _logStage('CardVisibleCheck', { card: 'gotoVedicPremium' });
    window.openVedicBookModal();
  };

  window.generateVedicBook = function () {
    if (_generating) return;

    _resolveBirthProfile().then(function (profile) {
    if (!profile || !profile.birth) {
      _showScreen('vdNoProfileScreen');
      return;
    }

    var birthInput = _normalizeBirthInput(profile);
    _logStage('ProfileResolved', {
      hasBirthDate: Boolean(_clean(birthInput.birthDate)),
      hasBirthTime: Boolean(_clean(birthInput.birthTime)),
      birthHour: birthInput.birthHour,
      hasTimezone: Boolean(_clean(birthInput.timezone)),
      hasLocation: Boolean(_clean(birthInput.birthPlace)),
    });
    _logStage('BirthInputNormalized', {
      birthDate: _clean(birthInput.birthDate),
      birthYear: birthInput.birthYear,
      birthMonth: birthInput.birthMonth,
      birthDay: birthInput.birthDay,
      birthHour: birthInput.birthHour,
      birthMinute: birthInput.birthMinute,
      timezone: _clean(birthInput.timezone),
    });

    try {
      _validateBeforePayment(birthInput);
      _logStage('ValidationBeforePayment', {
        hasBirthDate: Boolean(_clean(birthInput.birthDate)),
        hasBirthTime: Boolean(_clean(birthInput.birthTime)),
        birthHour: birthInput.birthHour,
      });
    } catch (error) {
      _logError(error, { stage: 'ValidationBeforePayment' });
      _setError(String(error && error.message ? error.message : error || '입력값 검증 실패'));
      return;
    }

    if (!_hasPremiumAccessForGeneration()) {
      if (!_ensurePremiumPaymentThenStart()) return;
      return;
    }

    _currentVedicSessionId = 'vedic-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    _generating = true;
    _setStartBusy(true);
    _showScreen('vdLoadingScreen');
    _setLoadingProgress(1, VEDIC_TOTAL_CHAPTERS, '프로필 정보 확인 중');
    _startProgressAnimation();

    _fetchVedicChart(profile, birthInput)
      .then(function (chart) {
        var vedicBase = _buildVedicBase(profile, chart, birthInput);
        _setLoadingProgress(2, VEDIC_TOTAL_CHAPTERS, '베다 차트 계산 중');
        _setLoadingProgress(VEDIC_TOTAL_CHAPTERS, VEDIC_TOTAL_CHAPTERS, '12챕터 로컬 원고 생성 중');
        _logStage('SessionCreateStart', { endpoint: VEDIC_PREPARE_API, featureKey: VEDIC_FEATURE_KEY });
        return _postPrepare({
          sessionId: _currentVedicSessionId,
          featureKey: VEDIC_FEATURE_KEY,
          premiumAccessToken: _readPremiumAccessToken() || undefined,
          vedicBase: vedicBase,
        }).then(function (data) {
          _logStage('SessionCreateSuccess', {
            chapterCount: Number(data && data.chapterCount || 0),
            fallbackUsed: Boolean(data && data.fallbackUsed),
          });
          _logStage('PdfRequestStart', {
            chapterCount: Number(data && data.chapterCount || 0),
          });
          return { data: data, vedicBase: vedicBase };
        });
      })
      .then(function (pack) {
        var response = (pack && pack.data) || {};
        var vedicBase = (pack && pack.vedicBase) || null;

        if (response && response.status === 'running') {
          throw new Error('이미 같은 세션의 베다점 PDF 생성이 진행 중입니다. 잠시 후 다시 확인해주세요.');
        }

        _markPremiumAccessVerified(25 * 60 * 1000);
        _resultPayload = response;
        _chapters = Array.isArray(response.chapters) ? response.chapters : [];
        if (!_chapters.length) throw new Error('베다점 챕터 데이터가 비어 있습니다.');

        _setLoadingProgress(VEDIC_TOTAL_CHAPTERS, VEDIC_TOTAL_CHAPTERS, 'AI 상담문 보강 중');
        _setLoadingProgress(VEDIC_TOTAL_CHAPTERS, VEDIC_TOTAL_CHAPTERS, 'PDF 편집/렌더링 중');
        _setLoadingProgress(VEDIC_TOTAL_CHAPTERS, VEDIC_TOTAL_CHAPTERS, '완료');
        _renderResult(_chapters, response.payload || vedicBase);
        _logStage('PdfRequestSuccess', { chapterCount: _chapters.length, fallbackUsed: !!response.fallbackUsed });

        if (response && response.fallbackUsed && typeof window.showToast === 'function') {
          window.showToast('AI 문장 보강이 지연되어 로컬 베다점 계산 기반 프리미엄 원고로 PDF를 완성합니다.', 'info');
        }

        _showScreen('vdResultScreen');
      })
      .catch(function (error) {
        _logError(error, { stage: 'generate' });
        _setError(String(error && error.message ? error.message : error || '생성 실패'));
      })
      .finally(function () {
        _generating = false;
        _currentVedicSessionId = '';
        _setStartBusy(false);
        _stopProgressAnimation();
      });
    }).catch(function (error) {
      _logError(error, { stage: 'resolve-profile' });
      _setError(String(error && error.message ? error.message : error || '생성 실패'));
    });
  };

  window.downloadVedicBookPdf = function () {
    if (!_chapters || !_chapters.length || !_resultPayload || !_resultPayload.pdfReady || !_resultPayload.pdfReady.html) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }
    var html = String(_resultPayload.pdfReady.html || '');
    if (!html) {
      alert('PDF 본문을 생성하지 못했습니다. 다시 시도해 주세요.');
      return;
    }
    var url = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    var popup = window.open(url, '_blank', 'width=980,height=760');
    if (!popup) {
      alert('팝업이 차단되어 출력 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    popup.focus();
    setTimeout(function () { try { popup.print(); } catch (_) {} }, 1200);
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');
    if (action === 'openVedicBookModal') { window.openVedicBookModal(); return; }
    if (action === 'closeVedicBookModal') { window.closeVedicBookModal(); return; }
    if (action === 'gotoVedicPremium') { window.gotoVedicPremium(); }
  });
})();
