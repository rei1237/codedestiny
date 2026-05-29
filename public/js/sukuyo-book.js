/**
 * Sukyo Premium Compatibility PDF
 * Compatibility-only + preflight-before-payment pipeline.
 */
(function () {
  'use strict';

  var SUKYO_FEATURE_KEY = 'premium-sukuyo-report-compat';
  var SUKYO_ALIAS_FEATURE_KEY = 'premium_pdf_sukyo_compat';
  var SUKYO_PREFLIGHT_API = '/api/sukuyo/premium/preflight';
  var SUKYO_PREPARE_API = '/api/sukuyo/premium/prepare';
  var SUKYO_CHAPTERS_API = '/api/sukuyo/premium/chapters';
  var SUKYO_TOTAL_CHAPTERS = 15;
  var SUKYO_COIN_COST = 490;

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var _generating = false;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }
  function _num(value, fallback) { var n = Number(value); return Number.isFinite(n) ? n : fallback; }

  function normalizeSukuyoError(error) {
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
        return {
          message: String(error),
        };
      }
    }

    return {
      message: String(error),
    };
  }

  function _log(label, payload) {
    try { console.info(label, payload || {}); } catch (_) {}
  }

  function _logError(error, stage) {
    try {
      console.error('[SukuyoBook][Error]', {
        stage: _clean(stage),
        error: normalizeSukuyoError(error),
      });
    } catch (_) {}
  }

  function _sanitizeText(value) {
    return String(value || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|llm|api|debug|engine)\b/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function _extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var i = 0; i < keys.length; i += 1) {
      var found = _clean(payload[keys[i]]);
      if (found) return found;
    }
    return _extractPremiumToken(payload.data) || _extractPremiumToken(payload.payload);
  }

  function _persistPremiumAccessToken(token) {
    var value = _clean(token);
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function _readPremiumAccessToken() {
    var token = '';
    try { token = _clean(window.__cdPremiumAccessToken); } catch (_) { token = ''; }
    if (!token) { try { token = _clean(sessionStorage.getItem('cd_premium_access_token')); } catch (_) { token = ''; } }
    if (!token) { try { token = _clean(localStorage.getItem('cd_premium_access_token')); } catch (_) { token = ''; } }
    return token;
  }

  function _markPremiumAccessVerified(ttlMs) {
    var ttl = Number(ttlMs || 0);
    if (!Number.isFinite(ttl) || ttl <= 0) ttl = 25 * 60 * 1000;
    var until = Date.now() + ttl;
    if (until > _premiumAccessVerifiedUntil) _premiumAccessVerifiedUntil = until;
    if (until > _premiumPaidUntil) _premiumPaidUntil = until;
  }

  function _premiumTokenMatches() {
    var token = _readPremiumAccessToken();
    if (!token || typeof atob !== 'function') return false;
    try {
      var middle = token.split('.')[1] || '';
      var payload = JSON.parse(atob(middle.replace(/-/g, '+').replace(/_/g, '/')));
      var featureKey = _clean(payload && payload.featureKey);
      var exp = Number(payload && payload.exp);
      return (featureKey === SUKYO_FEATURE_KEY || featureKey === SUKYO_ALIAS_FEATURE_KEY)
        && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
    } catch (_) {
      return false;
    }
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
    var bases = ['', window.__CD_API_BASE_URL || '', window.__API_BASE_URL || '', window.__AUTH_API_BASE_URL || '', window.location && window.location.origin || ''];
    var seen = {};
    var out = [];
    bases.forEach(function (base) {
      var cleanBase = String(base || '').trim();
      var url = cleanBase ? cleanBase.replace(/\/+$/, '') + path : path;
      if (!seen[url]) { seen[url] = true; out.push(url); }
    });
    return out;
  }

  function _detachModalFromResultPage(modal) {
    try {
      if (!modal || !modal.parentElement) return;
      if (typeof modal.closest === 'function' && modal.closest('#resultPage')) {
        document.body.appendChild(modal);
      }
    } catch (_) {}
  }

  function _recoverBirthFromDOM() {
    try {
      var birthDateEl = _qs('birthDate');
      var hourEl = _qs('birthHour');
      var minuteEl = _qs('birthMinute');
      var nameEl = _qs('nameInput');
      var femaleEl = _qs('genderFemale');
      if (!birthDateEl || !birthDateEl.value) return null;
      var parts = birthDateEl.value.split('-');
      var year = _num(parts[0], NaN);
      var month = _num(parts[1], NaN);
      var day = _num(parts[2], NaN);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      return {
        name: _clean(nameEl && nameEl.value) || '사용자',
        gender: femaleEl && femaleEl.checked ? 'F' : 'M',
        birth: { year: year, month: month, day: day, hour: hourEl ? _num(hourEl.value, 12) : 12, minute: minuteEl ? _num(minuteEl.value, 0) : 0 },
        calendarType: 'solar',
      };
    } catch (_) {
      return null;
    }
  }

  function _getActiveBirthProfile() {
    var profile = window.__cdActiveBirthProfile;
    if (profile && profile.birth && profile.birth.year) return profile;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return fromDom;
    try {
      var namespace = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(namespace + '.list') || '[]');
      var currentId = localStorage.getItem(namespace + '.current');
      var match = (currentId && list.find(function (item) { return item.id === currentId; })) || list[0];
      if (match && match.birth && match.birth.year) return match;
    } catch (_) {}
    return null;
  }

  function _normalizeGender(raw) {
    var token = _clean(raw).toLowerCase();
    if (token === 'f' || token === 'female' || token === 'woman' || token === '여성' || token === '여') return 'female';
    if (token === 'm' || token === 'male' || token === 'man' || token === '남성' || token === '남') return 'male';
    return 'unknown';
  }

  function _normalizeCalendarType(raw) {
    var token = _clean(raw).toLowerCase();
    if (token.indexOf('solar') >= 0 || token.indexOf('양') >= 0) return 'solar';
    if (token.indexOf('lunar') >= 0 || token.indexOf('음') >= 0) return 'lunar';
    return 'unknown';
  }

  function _parseDateParts(raw) {
    var value = _clean(raw);
    var match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;
    var y = Number(match[1]);
    var m = Number(match[2]);
    var d = Number(match[3]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return { y: y, m: m, d: d };
  }

  var _koreanHourMap = {
    '자시': 23, '축시': 1, '인시': 3, '묘시': 5, '진시': 7, '사시': 9,
    '오시': 11, '미시': 13, '신시': 15, '유시': 17, '술시': 19, '해시': 21,
  };

  function _parseTimeLoose(raw) {
    var value = _clean(raw);
    var lower = value.toLowerCase();
    if (!value || /모름|unknown/.test(lower)) {
      return { birthTime: '', birthHour: null, birthMinute: null, isTimeUnknown: true };
    }

    if (Number.isFinite(_koreanHourMap[value])) {
      var hh = _koreanHourMap[value];
      return { birthTime: String(hh).padStart(2, '0') + ':00', birthHour: hh, birthMinute: 0, isTimeUnknown: false };
    }

    var hour = null;
    var minute = 0;

    var hhmm = lower.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
    if (hhmm) {
      hour = Number(hhmm[1]);
      minute = Number(hhmm[2] || '0');
    }

    var korean = lower.match(/^(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
    if (korean) {
      var base = Number(korean[2]);
      var isPm = korean[1] === '오후';
      hour = base % 12;
      if (isPm) hour += 12;
      minute = Number(korean[3] || '0');
    }

    if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
      return { birthTime: '', birthHour: null, birthMinute: null, isTimeUnknown: true };
    }

    return {
      birthTime: String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0'),
      birthHour: hour,
      birthMinute: minute,
      isTimeUnknown: false,
    };
  }

  function _formatProfile(profile) {
    var birth = profile && profile.birth || {};
    var birthDate = [String(_num(birth.year, 0)).padStart(4, '0'), String(_num(birth.month, 0)).padStart(2, '0'), String(_num(birth.day, 0)).padStart(2, '0')].join('-');
    var birthTime = [String(_num(birth.hour, 12)).padStart(2, '0'), String(_num(birth.minute, 0)).padStart(2, '0')].join(':');
    return {
      name: _clean(profile && profile.name) || '사용자',
      gender: _normalizeGender(_clean(profile && profile.gender)),
      calendarType: _normalizeCalendarType(_clean(profile && profile.calendarType) || 'solar'),
      birthDate: birthDate,
      birthYear: _num(birth.year, null),
      birthMonth: _num(birth.month, null),
      birthDay: _num(birth.day, null),
      birthTime: birthTime,
      birthHour: _num(birth.hour, null),
      birthMinute: _num(birth.minute, null),
      timezone: 'Asia/Seoul',
      isTimeUnknown: false,
    };
  }

  function _resolvePartnerGender() {
    var selected = document.querySelector('input[name="skPartnerGender"]:checked');
    if (selected) return _normalizeGender(selected.value);
    var f = _qs('skPartnerGenderF');
    var m = _qs('skPartnerGenderM');
    if (f && f.classList.contains('on')) return 'female';
    if (m && m.classList.contains('on')) return 'male';
    return 'unknown';
  }

  function _getSelectedPartnerCalendarType() {
    var selected = document.querySelector('input[name="skPartnerCalType"]:checked');
    return selected ? _normalizeCalendarType(selected.value) : 'solar';
  }

  function _getPartnerInput() {
    var nameEl = _qs('skPartnerName');
    var birthDateEl = _qs('skPartnerBirthDate');
    var hourEl = _qs('skPartnerHour');
    var minuteEl = _qs('skPartnerMinute');
    var birthTimeTextEl = _qs('skPartnerBirthTimeText');
    var timeUnknownEl = _qs('skPartnerTimeUnknown');

    var birthDate = _clean(birthDateEl && birthDateEl.value);
    var isTimeUnknownChecked = !!(timeUnknownEl && timeUnknownEl.checked);

    var freeText = _clean(birthTimeTextEl && birthTimeTextEl.value);
    var selectTime = '';
    if (hourEl && _clean(hourEl.value) !== '') {
      selectTime = String(_num(hourEl.value, 12)).padStart(2, '0') + ':' + String(_num(minuteEl && minuteEl.value, 0)).padStart(2, '0');
    }

    var rawTime = isTimeUnknownChecked ? '시간 모름' : (freeText || selectTime);
    var parsed = _parseTimeLoose(rawTime);

    return {
      name: _clean(nameEl && nameEl.value) || '상대방',
      gender: _resolvePartnerGender(),
      calendarType: _getSelectedPartnerCalendarType(),
      birthDate: birthDate,
      birthYear: null,
      birthMonth: null,
      birthDay: null,
      birthTime: parsed.birthTime,
      birthHour: parsed.birthHour,
      birthMinute: parsed.birthMinute,
      timezone: 'Asia/Seoul',
      isTimeUnknown: parsed.isTimeUnknown,
    };
  }

  function _normalizeCompatibilityInput(profile, partner) {
    var self = _formatProfile(profile);
    var partnerInput = Object.assign({}, partner || {});

    var sDate = _parseDateParts(self.birthDate);
    var pDate = _parseDateParts(partnerInput.birthDate);

    if (sDate) {
      self.birthYear = sDate.y;
      self.birthMonth = sDate.m;
      self.birthDay = sDate.d;
    }
    if (pDate) {
      partnerInput.birthYear = pDate.y;
      partnerInput.birthMonth = pDate.m;
      partnerInput.birthDay = pDate.d;
    }

    return {
      mode: 'compatibility',
      self: self,
      partner: partnerInput,
    };
  }

  function _validateBeforePayment(input) {
    var errors = [];
    if (!input || input.mode !== 'compatibility') errors.push('mode');

    var selfDate = _parseDateParts(input && input.self && input.self.birthDate);
    var partnerDate = _parseDateParts(input && input.partner && input.partner.birthDate);

    if (!selfDate) errors.push('self.birthDate');
    if (!partnerDate) errors.push('partner.birthDate');

    return {
      ok: errors.length === 0,
      errors: errors,
      selfBirthDateReady: !!selfDate,
      partnerBirthDateReady: !!partnerDate,
    };
  }

  function _renderProfileSummary(profile) {
    var element = _qs('skProfileSummary');
    if (!element) return;
    if (!profile) {
      element.textContent = '생년월일 정보를 찾을 수 없습니다. 먼저 나의 운명 카드를 설정해 주세요.';
      return;
    }
    var birth = profile.birth || {};
    var time = [String(_num(birth.hour, 12)).padStart(2, '0'), String(_num(birth.minute, 0)).padStart(2, '0')].join(':');
    element.textContent = [(_clean(profile.name) || '사용자'), [birth.year, birth.month, birth.day].filter(Boolean).join('-') + ' ' + time, _clean(profile.gender)].filter(Boolean).join(' · ');
  }

  function _forceCompatibilityMode() {
    var personalBtn = _qs('skModePersonalBtn');
    var compatBtn = _qs('skModeCompatBtn');
    if (personalBtn) {
      personalBtn.classList.remove('on');
      personalBtn.setAttribute('aria-disabled', 'true');
      personalBtn.style.opacity = '0.45';
      personalBtn.style.pointerEvents = 'none';
      personalBtn.textContent = '개인 모드 비활성';
    }
    if (compatBtn) {
      compatBtn.classList.add('on');
      compatBtn.textContent = '💞 궁합 리포트 전용';
    }

    var section = _qs('skPartnerFormSection');
    if (section) section.style.display = '';

    var hint = _qs('skModeHint');
    if (hint) hint.textContent = '숙요점 프리미엄 PDF는 궁합 전용 서비스입니다. 두 사람의 생년월일 정보가 모두 필요합니다.';

    var startDesc = _qs('skStartDesc');
    if (startDesc) startDesc.innerHTML = '숙요점 프리미엄 궁합 PDF는 <strong>두 사람의 관계 해석 전용</strong>입니다. 두 사람의 생년월일과 시간을 기반으로 27숙 궁합 15챕터를 생성합니다.';

    var title = _qs('skModalTitle');
    if (title) title.textContent = '💫 숙요점 프리미엄 궁합 PDF';

    var subtitle = _qs('skModalSubtitle');
    if (subtitle) subtitle.textContent = '27개의 달별로 읽는 두 사람의 인연 지도 · 15챕터 리포트';

    var startBtn = _qs('skStartBtn');
    if (startBtn) startBtn.textContent = '숙요점 궁합 PDF 생성하기';

    var coinMsg = _qs('skCompatNeedMsg');
    if (coinMsg) coinMsg.textContent = '궁합 PDF는 두 사람의 생년월일이 모두 필요합니다.';
  }

  function _populateTimeSelects() {
    var hourEl = _qs('skPartnerHour');
    var minuteEl = _qs('skPartnerMinute');

    if (hourEl && hourEl.options.length <= 1) {
      for (var h = 0; h < 24; h += 1) {
        var opt = document.createElement('option');
        opt.value = String(h);
        opt.textContent = String(h).padStart(2, '0') + '시';
        hourEl.appendChild(opt);
      }
    }

    if (minuteEl && minuteEl.options.length <= 1) {
      [0, 10, 20, 30, 40, 50].forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = String(m);
        opt.textContent = String(m).padStart(2, '0') + '분';
        minuteEl.appendChild(opt);
      });
    }
  }

  function _renderChapterList(chapters) {
    var list = _qs('skChapterList');
    if (!list) return;
    var source = Array.isArray(chapters) && chapters.length ? chapters : _canonicalChapters;
    if (!source.length) return;
    list.innerHTML = '';
    source.forEach(function (chapter) {
      var li = document.createElement('li');
      li.className = 'lb-start__ch-item';
      var num = document.createElement('span');
      num.className = 'lb-start__ch-num';
      num.textContent = String(chapter.order || chapter.num || '');
      var title = document.createElement('span');
      title.textContent = _sanitizeText(chapter.title || '');
      li.appendChild(num);
      li.appendChild(title);
      list.appendChild(li);
    });
  }

  function _renderDots(chapters) {
    var grid = _qs('skChapterDotGrid');
    if (!grid) return;
    var source = Array.isArray(chapters) && chapters.length ? chapters : _canonicalChapters;
    if (!source.length) return;

    grid.innerHTML = '';
    source.forEach(function (chapter, index) {
      var dot = document.createElement('span');
      dot.className = 'lb-ch-dot sk-ch-dot' + (index === 0 ? ' lb-ch-dot--active' : '');
      dot.setAttribute('data-skch', String(index + 1));
      dot.title = _sanitizeText(chapter.title || '');
      dot.textContent = String(index + 1);
      grid.appendChild(dot);
    });
  }

  function _showScreen(screenId) {
    ['skNoProfileScreen', 'skStartScreen', 'skLoadingScreen', 'skResultScreen', 'skErrorScreen'].forEach(function (id) {
      var element = _qs(id);
      if (element) element.style.display = id === screenId ? '' : 'none';
    });
  }

  function _setError(message) {
    var element = _qs('skErrorMsg');
    if (element) element.textContent = _sanitizeText(message) || 'PDF 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    _showScreen('skErrorScreen');
  }

  function _setStartBusy(isBusy) {
    var button = _qs('skStartBtn');
    if (!button) return;
    button.disabled = !!isBusy;
    button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function _setLoadingProgress(step, total, title) {
    var pct = Math.max(0, Math.min(100, Math.round((step / Math.max(total, 1)) * 100)));
    var bar = _qs('skProgressBar');
    var text = _qs('skProgressText');
    var number = _qs('skLoadingChapterNum');
    var chapter = _qs('skLoadingChapter');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = step + ' / ' + total + ' 챕터 완료';
    if (number) number.textContent = 'Chapter ' + step;
    if (chapter) chapter.textContent = _sanitizeText(title || '숙요점 챕터를 생성하는 중입니다');

    Array.prototype.forEach.call(document.querySelectorAll('.sk-ch-dot'), function (dot) {
      var dotNo = Number(dot.getAttribute('data-skch'));
      dot.classList.toggle('lb-ch-dot--active', dotNo === step);
      dot.classList.toggle('lb-ch-dot--done', dotNo < step);
    });
  }

  function _setLoadingStage(message) {
    var title = _qs('skLoadingTitle');
    if (title) title.textContent = _sanitizeText(message);
  }

  function _setLoadingNotice(message) {
    var quote = _qs('skMysticQuote');
    if (quote) quote.textContent = _sanitizeText(message);
  }

  function _fetchCanonicalChapters() {
    var endpoints = _buildApiCandidates(SUKYO_CHAPTERS_API);
    var endpointIndex = 0;
    function next(resolve) {
      if (endpointIndex >= endpoints.length) return resolve([]);
      fetch(endpoints[endpointIndex++], { cache: 'no-store', credentials: 'include' })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.chapters) && data.chapters.length) { resolve(data.chapters); return; }
          next(resolve);
        })
        .catch(function () { next(resolve); });
    }
    return new Promise(function (resolve) { next(resolve); });
  }

  function _postJson(pathname, body) {
    var endpoints = _buildApiCandidates(pathname);
    var endpointIndex = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();

    function run(resolve, reject, lastErr) {
      if (endpointIndex >= endpoints.length) {
        reject(new Error(lastErr || '숙요점 API 호출에 실패했습니다.'));
        return;
      }

      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;

      fetch(endpoints[endpointIndex++], {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body || {}),
        credentials: 'include',
        cache: 'no-store',
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) {
            _persistPremiumAccessToken(_extractPremiumToken(pack.json));
            resolve(pack.json);
            return;
          }

          var msg = (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status);
          if (pack.res.status === 401) { reject(new Error('숙요점 PDF 생성을 위해 먼저 로그인해 주세요.')); return; }
          if (pack.res.status === 402 || pack.res.status === 403) { reject(new Error('프리미엄 궁합 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다.')); return; }
          if (pack.res.status === 400 || pack.res.status === 422) { reject(new Error(msg || '입력 정보를 확인해 주세요.')); return; }

          run(resolve, reject, msg);
        })
        .catch(function (error) {
          run(resolve, reject, String(error && error.message || error || '요청 실패'));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _runPreflight(normalizedInput) {
    return _postJson(SUKYO_PREFLIGHT_API, {
      mode: 'compatibility',
      self: normalizedInput.self,
      partner: normalizedInput.partner,
      reportMode: 'compatibility',
      reportType: 'sookyoPremium',
    });
  }

  function _buildPrepareBody(normalizedInput) {
    return {
      featureKey: SUKYO_FEATURE_KEY,
      premiumAccessToken: _readPremiumAccessToken() || undefined,
      mode: 'compatibility',
      reportMode: 'compatibility',
      reportType: 'sookyoPremium',
      self: normalizedInput.self,
      partner: normalizedInput.partner,
      user: normalizedInput.self,
    };
  }

  function _ensurePremiumPaymentThenStart() {
    if (_hasPremiumAccessForGeneration()) return true;
    if (typeof window._cdCoinGatePerUse !== 'function') {
      alert('결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
      return false;
    }

    _log('[SukuyoBook][PaymentGateStart]', { featureKey: SUKYO_FEATURE_KEY, mode: 'compatibility' });
    window._cdCoinGatePerUse(SUKYO_COIN_COST, '숙요점 프리미엄 궁합 PDF 생성', function (_transactionId, data) {
      _persistPremiumAccessToken(_extractPremiumToken(data));
      _markPremiumAccessVerified(25 * 60 * 1000);
      _log('[SukuyoBook][PaymentGateSuccess]', { featureKey: SUKYO_FEATURE_KEY });
      window.generateSukuyoBook();
    }, null, {
      featureKey: SUKYO_FEATURE_KEY,
      mode: 'compatibility',
      reportMode: 'compatibility',
      reportType: 'sookyoPremium',
      aliasFeatureKey: SUKYO_ALIAS_FEATURE_KEY,
      requestId: 'sukyo-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    });
    return false;
  }

  function _renderResult(chapters, payload) {
    var toc = _qs('skToc');
    var content = _qs('skChapterContent');
    var name = _qs('skResultName');
    var date = _qs('skResultDate');
    var seed = payload && payload.payload || payload || {};

    if (toc) toc.innerHTML = '';
    if (content) content.innerHTML = '';

    if (name) name.textContent = '💫 ' + _sanitizeText(seed.userProfile && seed.userProfile.name || '사용자') + ' x ' + _sanitizeText(seed.partnerProfile && seed.partnerProfile.name || '상대방');
    if (date) date.textContent = [_sanitizeText(seed.userSukyo && seed.userSukyo.nameKo || ''), _sanitizeText(seed.partnerSukyo && seed.partnerSukyo.nameKo || ''), _sanitizeText(seed.compatibility && seed.compatibility.relationType || '')].filter(Boolean).join(' · ');

    chapters.forEach(function (chapter, index) {
      if (toc) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'lb-toc-item loaded';
        button.textContent = 'Chapter ' + chapter.order + '. ' + _sanitizeText(chapter.title);
        button.addEventListener('click', function () {
          var section = document.getElementById('skChapter-' + (index + 1));
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        toc.appendChild(button);
      }

      if (content) {
        var sectionEl = document.createElement('section');
        sectionEl.id = 'skChapter-' + (index + 1);
        sectionEl.className = 'lb-chapter-card';
        var html = '<h4 class="lb-chapter-title">Chapter ' + chapter.order + '. ' + _sanitizeText(chapter.title) + '</h4>';
        var sections = Array.isArray(chapter.sections) ? chapter.sections : [];
        sections.forEach(function (section) {
          html += '<article class="lb-sub-card"><h5 class="lb-sub-title">' + _sanitizeText(section.heading || '') + '</h5><p class="lb-sub-body">' + _sanitizeText(section.body || '') + '</p></article>';
        });
        sectionEl.innerHTML = html;
        content.appendChild(sectionEl);
      }
    });
  }

  function _syncDotsByChapters(chapters) {
    var done = Array.isArray(chapters) ? chapters.length : 0;
    var total = Math.max(SUKYO_TOTAL_CHAPTERS, 1);
    for (var i = 1; i <= total; i += 1) {
      var dot = document.querySelector('.sk-ch-dot[data-skch="' + i + '"]');
      if (!dot) continue;
      dot.classList.toggle('lb-ch-dot--done', i <= done);
      dot.classList.toggle('lb-ch-dot--active', i === Math.min(done + 1, total));
    }
  }

  window.openSukuyoBookModal = function () {
    var modal = _qs('sukuyoBookModal');
    if (!modal) return;

    _detachModalFromResultPage(modal);
    _populateTimeSelects();
    _forceCompatibilityMode();

    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth || !profile.birth.year) {
      try {
        var ns = 'FORTUNE_APP_USER_PROFILES';
        var list = JSON.parse(localStorage.getItem(ns + '.list') || '[]');
        var current = localStorage.getItem(ns + '.current');
        var pick = (current && list.find(function (item) { return item.id === current; })) || list[0] || null;
        if (pick && pick.birth && pick.birth.year) {
          window.__cdActiveBirthProfile = pick;
          profile = pick;
        }
      } catch (_) {}
    }

    if (profile && profile.birth && profile.birth.year) {
      window.__cdActiveBirthProfile = profile;
      _renderProfileSummary(profile);
      _showScreen('skStartScreen');
    } else {
      _showScreen('skNoProfileScreen');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}

    _fetchCanonicalChapters().then(function (chapters) {
      if (Array.isArray(chapters) && chapters.length) {
        _canonicalChapters = chapters;
        SUKYO_TOTAL_CHAPTERS = chapters.length;
        _renderChapterList(chapters);
        _renderDots(chapters);
      }
    }).catch(function () {});
  };

  window.closeSukuyoBookModal = function () {
    var modal = _qs('sukuyoBookModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.gotoSukuyoPremium = function () {
    window.openSukuyoBookModal();
  };

  window.generateSukuyoBook = function () {
    if (_generating) return;

    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth) {
      _showScreen('skNoProfileScreen');
      return;
    }

    _log('[SukuyoBook][ProfileResolved]', { hasBirthDate: !!_clean(_formatProfile(profile).birthDate) });

    var partner = _getPartnerInput();
    _log('[SukuyoBook][PartnerInputResolved]', {
      hasBirthDate: !!_clean(partner.birthDate),
      hasBirthTime: !!_clean(partner.birthTime),
      isTimeUnknown: !!partner.isTimeUnknown,
    });

    var normalizedInput = _normalizeCompatibilityInput(profile, partner);
    _log('[SukuyoBook][CompatibilityInputNormalized]', {
      mode: normalizedInput.mode,
      selfBirthDate: !!_clean(normalizedInput.self.birthDate),
      partnerBirthDate: !!_clean(normalizedInput.partner.birthDate),
    });

    var check = _validateBeforePayment(normalizedInput);
    _log('[SukuyoBook][ValidationBeforePayment]', check);
    if (!check.ok) {
      _setError('궁합 PDF는 두 사람의 생년월일이 모두 필요합니다. 입력값을 확인해 주세요.');
      return;
    }

    _generating = true;
    _setStartBusy(true);
    _showScreen('skLoadingScreen');
    _setLoadingProgress(1, SUKYO_TOTAL_CHAPTERS, '프로필 정보 확인 중');
    _setLoadingStage('프로필 정보 확인 중');

    _runPreflight(normalizedInput)
      .then(function (preflight) {
        _setLoadingProgress(2, SUKYO_TOTAL_CHAPTERS, '상대방 정보 확인 중');
        _setLoadingStage('상대방 정보 확인 중');
        _setLoadingNotice('두 사람의 본명숙 계산 전 점검을 완료했습니다.');

        if (!preflight || !preflight.ok) {
          throw new Error('결제 전 입력 검증에 실패했습니다.');
        }

        if (!_hasPremiumAccessForGeneration()) {
          _generating = false;
          _setStartBusy(false);
          _showScreen('skStartScreen');
          _ensurePremiumPaymentThenStart();
          return Promise.reject(new Error('PAYMENT_HANDOFF'));
        }

        _setLoadingProgress(3, SUKYO_TOTAL_CHAPTERS, '두 사람의 본명숙 계산 중');
        _setLoadingStage('두 사람의 본명숙 계산 중');
        _setLoadingNotice('관계 유형과 거리 계산을 준비하고 있습니다.');

        _log('[SukuyoBook][SessionCreateStart]', { featureKey: SUKYO_FEATURE_KEY });
        return _postJson(SUKYO_PREPARE_API, _buildPrepareBody(normalizedInput));
      })
      .then(function (response) {
        if (!response || !response.ok) throw new Error('SESSION_CREATE_FAILED');
        _log('[SukuyoBook][SessionCreateSuccess]', { chapterCount: response.chapterCount });

        _setLoadingProgress(4, SUKYO_TOTAL_CHAPTERS, '관계 유형과 거리 계산 중');
        _setLoadingStage('관계 유형과 거리 계산 중');

        _log('[SukuyoBook][PdfRequestStart]', { chapterCount: response.chapterCount });

        _resultPayload = response;
        _chapters = Array.isArray(response.chapters) ? response.chapters : [];

        if (!_chapters.length || Number(response.chapterCount) !== 15) {
          throw new Error('15챕터 리포트 데이터가 비어 있습니다.');
        }

        _setLoadingProgress(8, SUKYO_TOTAL_CHAPTERS, '15챕터 로컬 원고 생성 중');
        _setLoadingStage('15챕터 로컬 원고 생성 중');
        _syncDotsByChapters(_chapters);

        _setLoadingProgress(12, SUKYO_TOTAL_CHAPTERS, 'AI 상담문 보강 중');
        _setLoadingStage('AI 상담문 보강 중');

        if (response.fallbackUsed) {
          _setLoadingNotice('AI 문장 보강이 지연되어 로컬 숙요점 궁합 계산 기반 프리미엄 원고로 PDF를 완성합니다.');
        }

        _setLoadingProgress(15, SUKYO_TOTAL_CHAPTERS, 'PDF 편집/렌더링 중');
        _setLoadingStage('PDF 편집/렌더링 중');

        _renderResult(_chapters, response);

        _log('[SukuyoBook][PdfRequestSuccess]', {
          chapterCount: _chapters.length,
          fallbackUsed: !!response.fallbackUsed,
        });

        _setLoadingNotice('완료');
        _showScreen('skResultScreen');
      })
      .catch(function (error) {
        if (_clean(error && error.message) === 'PAYMENT_HANDOFF') return;
        _logError(error, 'generate');
        _setError(_clean(error && error.message) || 'PDF 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .finally(function () {
        _generating = false;
        _setStartBusy(false);
      });
  };

  window.downloadSukuyoBookPdf = function () {
    if (!_chapters.length || !_resultPayload || !_resultPayload.pdfReady || !_resultPayload.pdfReady.html) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }

    var html = String(_resultPayload.pdfReady.html || '');
    var popup = window.open('', '_blank', 'width=980,height=760');
    if (!popup) {
      alert('팝업이 차단되어 출력 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(function () { try { popup.print(); } catch (_) {} }, 900);
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var actionEl = target.closest('[data-action]');
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      if (action === 'openSukuyoBookModal') { window.openSukuyoBookModal(); return; }
      if (action === 'closeSukuyoBookModal') { window.closeSukuyoBookModal(); return; }
      if (action === 'gotoSukuyoPremium') { window.gotoSukuyoPremium(); return; }
      if (action === 'generateSukuyoBook') { window.generateSukuyoBook(); return; }
    }

    if (target.id === 'skPartnerGenderF' || target.closest('#skPartnerGenderF')) {
      var f = _qs('skPartnerGenderF');
      var m = _qs('skPartnerGenderM');
      if (f) f.classList.add('on');
      if (m) m.classList.remove('on');
    }
    if (target.id === 'skPartnerGenderM' || target.closest('#skPartnerGenderM')) {
      var ff = _qs('skPartnerGenderF');
      var mm = _qs('skPartnerGenderM');
      if (ff) ff.classList.remove('on');
      if (mm) mm.classList.add('on');
    }
  });

  document.addEventListener('change', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    if (target.id === 'skPartnerHour') {
      var minuteEl = _qs('skPartnerMinute');
      if (minuteEl && _clean(target.value) && !_clean(minuteEl.value)) minuteEl.value = '0';
    }

    if (target.id === 'skPartnerTimeUnknown') {
      var isUnknown = !!target.checked;
      var hourEl = _qs('skPartnerHour');
      var minuteEl = _qs('skPartnerMinute');
      var textEl = _qs('skPartnerBirthTimeText');
      if (hourEl) hourEl.disabled = isUnknown;
      if (minuteEl) minuteEl.disabled = isUnknown;
      if (textEl) textEl.disabled = isUnknown;
    }
  });
})();
