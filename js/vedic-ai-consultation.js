/**
 * Vedic AI Consultation.
 * Converts the visible Vedic entry into an immediate LLM consultation flow.
 */
(function () {
  'use strict';

  var VEDIC_AI_API = '/api/vedic/ai-consultation';
  var VEDIC_FEATURE_KEY = 'premium_pdf_vedic';
  var VEDIC_COIN_COST = 390;
  var CACHE_MARKER = 'vedic-ai-consultation-v20260627';
  var CATEGORY_QUESTIONS = {
    general: '제 베다 차트 기준으로 지금 삶의 흐름과 중요한 선택을 봐주세요.',
    career: '제 베다 차트 기준으로 앞으로 직업운이 어떻게 흘러갈까요?',
    money: '올해 돈의 흐름과 사업 기회를 베다점으로 봐주세요.',
    love: '연애와 결혼운이 언제쯤 좋아질지 베다 차트로 알고 싶어요.',
    relationship: '지금 인간관계에서 제가 조심해야 할 흐름은 무엇인가요?',
    family: '가족과 부모와의 관계에서 반복되는 흐름을 봐주세요.',
    health: '현재 다샤 흐름에서 마음과 컨디션을 어떻게 관리하면 좋을까요?',
    study: '공부와 시험운에서 집중해야 할 방향을 알려주세요.',
    business: '사업이나 창업을 해도 되는 시기인지 알고 싶어요.',
    karma: '요즘 인생이 막히는 이유를 베다점으로 봐주세요.',
    dasha: '현재 다샤 흐름에서 제가 가장 조심해야 할 것은 무엇인가요?',
    yearly: '앞으로 1년 동안 중요한 기회와 주의할 시기를 알려주세요.',
    choice: '지금의 선택에서 어느 방향이 제 차트와 더 잘 맞을까요?'
  };
  var CATEGORY_LABELS = [
    ['general', '종합 리딩'],
    ['career', '직업'],
    ['money', '재물'],
    ['love', '연애/결혼'],
    ['relationship', '인간관계'],
    ['family', '가족'],
    ['health', '건강/멘탈'],
    ['study', '공부/시험'],
    ['business', '이직/창업'],
    ['karma', '카르마'],
    ['dasha', '다샤 흐름'],
    ['yearly', '올해 운세'],
    ['choice', '지금의 선택']
  ];
  var LOADING_MESSAGES = [
    '태어난 순간의 하늘을 계산하고 있어요.',
    '라그나와 나크샤트라의 결을 읽고 있어요.',
    '현재 다샤가 여는 삶의 주제를 정리하고 있어요.',
    '질문에 맞는 베다 점성술 해석을 준비하고 있어요.'
  ];
  var _loadingTimer = null;
  var _loadingIndex = 0;
  var _isGenerating = false;
  var _lastPayment = null;
  var _lastResult = null;

  function qs(id) { return document.getElementById(id); }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function finiteNumber(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  function apiCandidates(path) {
    var urls = [path];
    try {
      var base = typeof getFortuneApiBaseUrl === 'function' ? getFortuneApiBaseUrl() : '';
      if (base) urls.push(String(base).replace(/\/+$/, '') + path);
    } catch (_) {}
    return urls.filter(function (value, index, arr) { return value && arr.indexOf(value) === index; });
  }
  function authHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    try {
      var token = clean(localStorage.getItem('fortune_auth_token'));
      if (token) headers.Authorization = 'Bearer ' + token;
    } catch (_) {}
    var premiumToken = readPremiumAccessToken();
    if (premiumToken) headers['x-premium-access-token'] = premiumToken;
    return headers;
  }
  function postJson(path, body) {
    var endpoints = apiCandidates(path);
    var index = 0;
    function run(lastError) {
      if (index >= endpoints.length) return Promise.reject(lastError || new Error('요청을 처리하지 못했습니다.'));
      var url = endpoints[index++];
      return fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(body || {})
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (payload) {
          if (res.ok && payload && payload.ok !== false) return payload;
          var err = new Error(clean(payload.message || payload.code) || ('HTTP ' + res.status));
          err.status = res.status;
          err.code = clean(payload.code);
          err.payload = payload;
          throw err;
        });
      }).catch(function (error) {
        if (error && (error.status === 401 || error.status === 402 || error.status === 403 || error.status === 422 || error.status === 503)) {
          throw error;
        }
        return run(error);
      });
    }
    return run(null);
  }
  function persistPremiumAccessToken(token) {
    var value = clean(token);
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }
  function readPremiumAccessToken() {
    var token = '';
    try { token = clean(window.__cdPremiumAccessToken); } catch (_) {}
    if (!token) { try { token = clean(sessionStorage.getItem('cd_premium_access_token')); } catch (_) {} }
    if (!token) { try { token = clean(localStorage.getItem('cd_premium_access_token')); } catch (_) {} }
    return token;
  }
  function extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var i = 0; i < keys.length; i += 1) {
      if (clean(payload[keys[i]])) return clean(payload[keys[i]]);
    }
    return extractPremiumToken(payload.data)
      || extractPremiumToken(payload.payload)
      || extractPremiumToken(payload.payment)
      || extractPremiumToken(payload._paymentContext)
      || extractPremiumToken(payload.paymentContext)
      || extractPremiumToken(payload.consume)
      || extractPremiumToken(payload.accessGrant);
  }
  function extractAccessGrant(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (payload.accessGrant && typeof payload.accessGrant === 'object') return payload.accessGrant;
    if (payload.access && typeof payload.access === 'object') return payload.access;
    return extractAccessGrant(payload.data)
      || extractAccessGrant(payload.payload)
      || extractAccessGrant(payload.payment)
      || extractAccessGrant(payload._paymentContext)
      || extractAccessGrant(payload.paymentContext)
      || extractAccessGrant(payload.consume);
  }
  function normalizePayment(payload) {
    var raw = payload && typeof payload === 'object' ? payload : {};
    var grant = extractAccessGrant(raw);
    var token = extractPremiumToken(raw) || readPremiumAccessToken();
    var payment = {
      featureKey: VEDIC_FEATURE_KEY,
      reportType: 'vedicPremium',
      premiumAccessToken: token || undefined,
      transactionId: clean(raw.transactionId || raw.purchaseId || raw.requestId || (grant && (grant.transactionId || grant.purchaseId || grant.requestId))) || undefined,
      purchaseId: clean(raw.purchaseId || raw.paymentId || (grant && grant.purchaseId)) || undefined,
      requestId: clean(raw.requestId || (grant && grant.requestId)) || undefined,
      accessGrant: grant || undefined,
      consume: raw.consume && typeof raw.consume === 'object' ? raw.consume : undefined,
      payment: raw.payment && typeof raw.payment === 'object' ? raw.payment : undefined,
      _paymentContext: raw._paymentContext && typeof raw._paymentContext === 'object' ? raw._paymentContext : undefined
    };
    persistPremiumAccessToken(token);
    return payment;
  }
  function ensurePayment() {
    if (_lastPayment && (_lastPayment.premiumAccessToken || _lastPayment.accessGrant || _lastPayment.consume || _lastPayment.transactionId || _lastPayment.purchaseId)) {
      return Promise.resolve(_lastPayment);
    }
    var requestId = 'vedic-ai-consultation:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
    var gateOptions = {
      featureKey: VEDIC_FEATURE_KEY,
      subFeatureKey: VEDIC_FEATURE_KEY,
      categoryKey: 'premium-pdf',
      coinPrice: VEDIC_COIN_COST,
      cost: VEDIC_COIN_COST,
      reportType: 'vedicPremium',
      serviceKey: 'vedic-ai-consultation',
      actionType: 'ai_consultation',
      action: 'generateVedicAIConsultation',
      reason: '베다점 AI 상담 결과 생성',
      requestId: requestId,
      mode: 'personal'
    };
    if (typeof window._cdOpenPaidServiceGate === 'function') {
      return Promise.resolve(window._cdOpenPaidServiceGate(gateOptions)).then(function (result) {
        if (result === false || (result && result.cancelled)) throw new Error('결제가 취소되었습니다.');
        _lastPayment = normalizePayment(result || {});
        if (!_lastPayment.requestId) _lastPayment.requestId = requestId;
        return _lastPayment;
      });
    }
    if (typeof window._cdCoinGatePerUse === 'function') {
      return new Promise(function (resolve, reject) {
        window._cdCoinGatePerUse(VEDIC_COIN_COST, '베다점 AI 상담 결과 생성 · 39,000원', function (transactionId, data) {
          _lastPayment = normalizePayment(Object.assign({}, data || {}, { transactionId: transactionId, requestId: requestId }));
          resolve(_lastPayment);
        }, function () {
          reject(new Error('결제가 취소되었습니다.'));
        }, gateOptions);
      });
    }
    return Promise.reject(new Error('결제 모듈을 사용할 수 없습니다.'));
  }
  function showScreen(screenId) {
    ['vdStartScreen', 'vdLoadingScreen', 'vdResultScreen', 'vdErrorScreen'].forEach(function (id) {
      var element = qs(id);
      if (element) element.style.display = id === screenId ? '' : 'none';
    });
  }
  function setStatus(message, tone) {
    var el = qs('vdStatusText');
    if (!el) return;
    el.textContent = clean(message);
    el.dataset.tone = tone || 'info';
  }
  function setBusy(isBusy) {
    _isGenerating = !!isBusy;
    var btn = qs('vdStartBtn');
    if (btn) {
      btn.disabled = _isGenerating;
      btn.setAttribute('aria-busy', _isGenerating ? 'true' : 'false');
    }
  }
  function startLoading() {
    stopLoading();
    _loadingIndex = 0;
    var message = qs('vdLoadingMessage');
    if (message) message.textContent = LOADING_MESSAGES[0];
    _loadingTimer = setInterval(function () {
      _loadingIndex = (_loadingIndex + 1) % LOADING_MESSAGES.length;
      var el = qs('vdLoadingMessage');
      if (el) el.textContent = LOADING_MESSAGES[_loadingIndex];
    }, 1400);
  }
  function stopLoading() {
    if (_loadingTimer) clearInterval(_loadingTimer);
    _loadingTimer = null;
  }
  function parseBirthDateParts(value) {
    var match = clean(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  }
  function dateFromBirth(birth) {
    var year = Number(birth && birth.year);
    var month = Number(birth && birth.month);
    var day = Number(birth && birth.day);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
    return [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
  }
  function normalizeProfile(profile) {
    var source = profile && typeof profile === 'object' ? profile : {};
    var birth = source.birth && typeof source.birth === 'object' ? source.birth : {};
    var birthInput = source.birthInput && typeof source.birthInput === 'object' ? source.birthInput : {};
    var location = source.location && typeof source.location === 'object' ? source.location : {};
    return {
      name: clean(source.name || birthInput.name),
      gender: clean(source.gender || source.sex || birthInput.gender),
      birthDate: clean(source.birthDate || birthInput.birthDate || dateFromBirth(birth)),
      birthTime: clean(source.birthTime || birthInput.birthTime || (Number.isFinite(Number(birth.hour)) ? String(Number(birth.hour)).padStart(2, '0') + ':' + String(Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0).padStart(2, '0') : '')),
      birthPlace: clean(source.birthPlace || birthInput.birthPlace || location.label || location.name),
      timezone: clean(source.timezone || birthInput.timezone || location.tz || location.timezone),
      latitude: finiteNumber(source.latitude != null ? source.latitude : (birthInput.latitude != null ? birthInput.latitude : location.lat)),
      longitude: finiteNumber(source.longitude != null ? source.longitude : (birthInput.longitude != null ? birthInput.longitude : (location.lon != null ? location.lon : location.lng)))
    };
  }
  function readStoredProfile() {
    var candidates = [];
    try { if (typeof window.__cdGetCurrentDestinyProfile === 'function') candidates.push(window.__cdGetCurrentDestinyProfile()); } catch (_) {}
    try { candidates.push(window.__cdActiveBirthProfile, window.__cdCurrentDestinyProfile, window.__cdCurrentProfile, window.__destinyFlowerSajuSnapshot); } catch (_) {}
    try { candidates.push(JSON.parse(localStorage.getItem('FORTUNE_APP_USER_PROFILE') || '{}')); } catch (_) {}
    try { candidates.push(JSON.parse(sessionStorage.getItem('FORTUNE_APP_USER_PROFILE') || '{}')); } catch (_) {}
    try { candidates.push(JSON.parse(localStorage.getItem('destiny_profile') || '{}')); } catch (_) {}
    try { candidates.push(JSON.parse(sessionStorage.getItem('destiny_profile') || '{}')); } catch (_) {}
    for (var i = 0; i < candidates.length; i += 1) {
      var profile = normalizeProfile(candidates[i]);
      if (profile.birthDate) return profile;
    }
    return null;
  }
  function fetchProfile() {
    var stored = readStoredProfile();
    if (stored) return Promise.resolve(stored);
    var urls = apiCandidates('/api/auth/me');
    var index = 0;
    function next() {
      if (index >= urls.length) return Promise.resolve(null);
      return fetch(urls[index++], { method: 'GET', headers: authHeaders(), credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (payload) {
          var profile = normalizeProfile(payload && (payload.profile || payload.user || payload.data || payload));
          return profile.birthDate ? profile : next();
        })
        .catch(next);
    }
    return next();
  }
  function setInputValue(id, value, overwrite) {
    var el = qs(id);
    if (!el) return;
    if (!overwrite && clean(el.value)) return;
    el.value = value == null ? '' : String(value);
  }
  function prefillProfile(profile) {
    if (!profile) {
      setStatus('프로필이 없으면 아래에 출생 정보를 직접 입력해 주세요.', 'info');
      return;
    }
    setInputValue('vdNameInput', profile.name, false);
    setInputValue('vdGenderInput', profile.gender, false);
    setInputValue('vdBirthDateInput', profile.birthDate, false);
    setInputValue('vdBirthTimeInput', profile.birthTime, false);
    setInputValue('vdBirthPlaceInput', profile.birthPlace, false);
    setInputValue('vdTimezoneInput', profile.timezone || 'Asia/Seoul', false);
    setInputValue('vdLatitudeInput', profile.latitude == null ? '' : profile.latitude, false);
    setInputValue('vdLongitudeInput', profile.longitude == null ? '' : profile.longitude, false);
    setStatus('프로필 정보를 불러왔습니다. 출생지와 좌표가 맞는지 확인해 주세요.', 'success');
  }
  function renderCategories() {
    var root = qs('vdCategoryChips');
    if (!root || root.dataset.rendered === '1') return;
    root.dataset.rendered = '1';
    root.innerHTML = CATEGORY_LABELS.map(function (entry, index) {
      return '<button type="button" class="vd-ai-chip' + (index === 0 ? ' is-active' : '') + '" data-vd-category="' + entry[0] + '">' + escapeHtml(entry[1]) + '</button>';
    }).join('');
    root.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-vd-category]') : null;
      if (!btn) return;
      root.querySelectorAll('[data-vd-category]').forEach(function (item) { item.classList.toggle('is-active', item === btn); });
      var question = qs('vdQuestionInput');
      var category = clean(btn.getAttribute('data-vd-category')) || 'general';
      if (question && !clean(question.value)) question.value = CATEGORY_QUESTIONS[category] || CATEGORY_QUESTIONS.general;
    });
  }
  function selectedCategory() {
    var active = document.querySelector('#vdCategoryChips [data-vd-category].is-active');
    return clean(active && active.getAttribute('data-vd-category')) || 'general';
  }
  function readForm() {
    var timeUnknown = !!(qs('vdBirthTimeUnknownInput') && qs('vdBirthTimeUnknownInput').checked);
    var date = clean(qs('vdBirthDateInput') && qs('vdBirthDateInput').value);
    var time = clean(qs('vdBirthTimeInput') && qs('vdBirthTimeInput').value);
    var dateParts = parseBirthDateParts(date);
    var timeParts = time.match(/^(\d{1,2}):(\d{2})$/);
    return {
      category: selectedCategory(),
      question: clean(qs('vdQuestionInput') && qs('vdQuestionInput').value),
      birthInput: {
        name: clean(qs('vdNameInput') && qs('vdNameInput').value),
        gender: clean(qs('vdGenderInput') && qs('vdGenderInput').value),
        birthDate: date,
        birthYear: dateParts && dateParts.year,
        birthMonth: dateParts && dateParts.month,
        birthDay: dateParts && dateParts.day,
        birthTime: timeUnknown ? '' : time,
        birthHour: !timeUnknown && timeParts ? Number(timeParts[1]) : null,
        birthMinute: !timeUnknown && timeParts ? Number(timeParts[2]) : 0,
        birthTimeUnknown: timeUnknown,
        isTimeUnknown: timeUnknown,
        birthPlace: clean(qs('vdBirthPlaceInput') && qs('vdBirthPlaceInput').value),
        timezone: clean(qs('vdTimezoneInput') && qs('vdTimezoneInput').value),
        latitude: finiteNumber(qs('vdLatitudeInput') && qs('vdLatitudeInput').value),
        longitude: finiteNumber(qs('vdLongitudeInput') && qs('vdLongitudeInput').value)
      }
    };
  }
  function validateForm(payload) {
    var b = payload.birthInput || {};
    if (!payload.question || payload.question.length < 5) return '질문을 5자 이상 입력해 주세요.';
    if (!b.birthDate) return '생년월일을 입력해 주세요.';
    if (!b.birthTimeUnknown && !b.birthTime) return '출생시간을 입력하거나 모름을 선택해 주세요.';
    if (!b.birthPlace) return '출생지를 입력해 주세요.';
    if (!b.timezone) return '시간대를 입력해 주세요.';
    if (!Number.isFinite(Number(b.latitude)) || !Number.isFinite(Number(b.longitude))) return '출생지의 위도와 경도를 입력해 주세요.';
    return '';
  }
  function paymentBody(payment) {
    var value = payment || {};
    return {
      accessGrant: value.accessGrant,
      premiumAccessToken: value.premiumAccessToken || readPremiumAccessToken() || undefined,
      consume: value.consume,
      payment: value.payment || value,
      _paymentContext: value._paymentContext || value,
      transactionId: value.transactionId,
      purchaseId: value.purchaseId,
      requestId: value.requestId
    };
  }
  function renderCard(title, body) {
    var text = Array.isArray(body) ? body.filter(Boolean).join('\n') : clean(body);
    if (!text) return '';
    return '<article class="vd-ai-result-card"><h4>' + escapeHtml(title) + '</h4><div>' + escapeHtml(text).replace(/\n/g, '<br>') + '</div></article>';
  }
  function renderResult(payload) {
    _lastResult = payload;
    var result = payload && payload.result || {};
    var summary = payload && payload.chartSummary || {};
    var content = qs('vdConsultationResult');
    var meta = qs('vdResultMeta');
    if (meta) {
      var parts = [
        summary.lagna ? '라그나 ' + summary.lagna : '',
        summary.moonSign ? '문 ' + summary.moonSign : '',
        summary.nakshatra ? '나크샤트라 ' + summary.nakshatra : '',
        summary.currentMahadasha ? '다샤 ' + summary.currentMahadasha : ''
      ].filter(Boolean);
      meta.textContent = parts.join(' · ') || '제공된 베다 차트 계산값을 바탕으로 상담했습니다.';
    }
    if (content) {
      content.innerHTML = [
        renderCard('상담 요약', result.summary),
        renderCard('나의 베다 차트 핵심', result.chartCore),
        renderCard('현재 다샤 흐름', result.dashaFlow),
        renderCard('질문 주제별 해석', result.topicAnswer),
        renderCard('기회와 주의할 시기', result.timing),
        renderCard('현실적인 행동 전략', result.actionGuide),
        renderCard('마음가짐과 상징적 리추얼', result.symbolicRitual),
        renderCard('마지막 조언', result.closingMessage),
        renderCard('후속 질문 추천', result.followUpQuestions)
      ].join('');
    }
    showScreen('vdResultScreen');
  }
  function handleGenerate() {
    if (_isGenerating) return;
    var payload = readForm();
    var validation = validateForm(payload);
    if (validation) {
      setStatus(validation, 'error');
      return;
    }
    setBusy(true);
    setStatus('결제 권한을 확인하고 있어요.', 'info');
    var paymentVerified = false;
    ensurePayment()
      .then(function (payment) {
        paymentVerified = true;
        showScreen('vdLoadingScreen');
        startLoading();
        var body = Object.assign({}, payload, paymentBody(payment), {
          featureKey: VEDIC_FEATURE_KEY,
          reportType: 'vedicPremium',
          requestId: clean(payment && payment.requestId) || ('vedic-ai-consultation:' + Date.now().toString(36))
        });
        return postJson(VEDIC_AI_API, body);
      })
      .then(function (response) {
        persistPremiumAccessToken(extractPremiumToken(response));
        renderResult(response);
        setStatus('베다점 상담이 열렸습니다.', 'success');
      })
      .catch(function (error) {
        var payloadSafe = error && error.payload || {};
        if (error && (error.status === 402 || error.code === 'PAYMENT_REQUIRED')) _lastPayment = null;
        if (!paymentVerified) {
          showScreen('vdStartScreen');
          setStatus(clean(payloadSafe.message || error && error.message) || '결제가 완료되지 않아 상담을 시작하지 않았습니다.', 'error');
          return;
        }
        showScreen('vdErrorScreen');
        var msg = qs('vdErrorMsg');
        if (msg) msg.textContent = clean(payloadSafe.message || error && error.message) || '베다점 상담을 열지 못했습니다. 잠시 후 다시 시도해 주세요.';
      })
      .finally(function () {
        stopLoading();
        setBusy(false);
      });
  }
  function bindForm() {
    ensureConsultationMarkup();
    renderCategories();
    var btn = qs('vdStartBtn');
    if (btn && btn.dataset.bound !== '1') {
      btn.dataset.bound = '1';
      btn.addEventListener('click', handleGenerate);
    }
    var retry = qs('vdRetryBtn');
    if (retry && retry.dataset.bound !== '1') {
      retry.dataset.bound = '1';
      retry.addEventListener('click', function () {
        showScreen('vdStartScreen');
        handleGenerate();
      });
    }
    var timeUnknown = qs('vdBirthTimeUnknownInput');
    var timeInput = qs('vdBirthTimeInput');
    if (timeUnknown && timeInput && timeUnknown.dataset.bound !== '1') {
      timeUnknown.dataset.bound = '1';
      timeUnknown.addEventListener('change', function () {
        timeInput.disabled = timeUnknown.checked;
        if (timeUnknown.checked) timeInput.value = '';
      });
    }
    var question = qs('vdQuestionInput');
    if (question && !clean(question.value)) question.value = CATEGORY_QUESTIONS.general;
  }
  function ensureConsultationMarkup() {
    var modal = qs('vedicBookModal');
    if (!modal || modal.dataset.vedicAiMarkup === '1') return;
    modal.dataset.vedicAiMarkup = '1';
    modal.setAttribute('aria-label', '베다점 AI 상담');
    modal.setAttribute('data-cd-marker', CACHE_MARKER);
    modal.innerHTML = ''
      + '<div class="lb-modal__overlay" data-action="closeVedicBookModal"></div>'
      + '<div class="lb-modal__panel vd-ai-panel">'
      +   '<div class="vd-ai-shell">'
      +     '<header class="vd-ai-hero">'
      +       '<button class="vd-ai-close" type="button" data-action="closeVedicBookModal" aria-label="닫기">×</button>'
      +       '<p class="vd-ai-kicker">VEDIC JYOTISH AI</p>'
      +       '<h2>베다점 AI 상담</h2>'
      +       '<p>태어난 순간의 하늘과 현재 다샤 흐름을 바탕으로, 지금 가장 궁금한 질문에 답합니다.</p>'
      +       '<p class="vd-ai-hero-note">라그나, 나크샤트라, 행성의 배치가 보여주는 삶의 방향을 확인해보세요.</p>'
      +     '</header>'
      +     '<section id="vdStartScreen" class="vd-ai-screen">'
      +       '<div class="vd-ai-form-grid">'
      +         '<label>이름 또는 닉네임<input id="vdNameInput" autocomplete="name" placeholder="이름"></label>'
      +         '<label>성별<select id="vdGenderInput"><option value="">선택 안 함</option><option value="female">여성</option><option value="male">남성</option><option value="unknown">기타/미입력</option></select></label>'
      +         '<label>생년월일<input id="vdBirthDateInput" type="date"></label>'
      +         '<label>출생시간<input id="vdBirthTimeInput" type="time"></label>'
      +         '<label class="vd-ai-check"><input id="vdBirthTimeUnknownInput" type="checkbox"> 출생시간을 모릅니다</label>'
      +         '<label>출생지<input id="vdBirthPlaceInput" placeholder="예: Seoul, South Korea"></label>'
      +         '<label>시간대<input id="vdTimezoneInput" placeholder="Asia/Seoul"></label>'
      +         '<label>위도<input id="vdLatitudeInput" inputmode="decimal" placeholder="37.5665"></label>'
      +         '<label>경도<input id="vdLongitudeInput" inputmode="decimal" placeholder="126.9780"></label>'
      +       '</div>'
      +       '<p class="vd-ai-help">출생시간이 없으면 라그나와 하우스 해석은 제한됩니다. 출생지는 임의 도시로 대체하지 않습니다.</p>'
      +       '<div class="vd-ai-topic-wrap"><p>상담 주제</p><div id="vdCategoryChips" class="vd-ai-chips"></div></div>'
      +       '<label class="vd-ai-question">질문<textarea id="vdQuestionInput" maxlength="1000" placeholder="예: 제 베다 차트 기준으로 올해 직업운과 돈의 흐름은 어떻게 될까요?"></textarea></label>'
      +       '<div class="vd-ai-actions"><button id="vdStartBtn" type="button">베다점 상담 받기</button><span id="vdStatusText" class="vd-ai-status">출생 정보와 질문을 입력하면 베다 차트로 상담을 열어드립니다.</span></div>'
      +     '</section>'
      +     '<section id="vdLoadingScreen" class="vd-ai-screen vd-ai-loading" style="display:none;">'
      +       '<div class="vd-ai-mandala" aria-hidden="true"></div>'
      +       '<h3>라그나와 나크샤트라를 읽고 있어요</h3>'
      +       '<p id="vdLoadingMessage">태어난 순간의 하늘을 계산하고 있어요.</p>'
      +     '</section>'
      +     '<section id="vdResultScreen" class="vd-ai-screen" style="display:none;">'
      +       '<div class="vd-ai-result-head"><p>베다점 상담이 열렸습니다.</p><h3>베다 차트, 나크샤트라, 다샤 흐름을 바탕으로 생성된 AI 상담입니다.</h3><span id="vdResultMeta"></span></div>'
      +       '<div id="vdConsultationResult" class="vd-ai-result-grid"></div>'
      +       '<div class="vd-ai-actions"><button type="button" data-action="closeVedicBookModal">닫기</button><button type="button" onclick="generateVedicBook()">다시 상담 받기</button></div>'
      +     '</section>'
      +     '<section id="vdErrorScreen" class="vd-ai-screen vd-ai-error" style="display:none;">'
      +       '<h3>상담을 열지 못했습니다</h3>'
      +       '<p id="vdErrorMsg">잠시 후 다시 시도해 주세요.</p>'
      +       '<div class="vd-ai-actions"><button id="vdRetryBtn" type="button">다시 시도</button><button type="button" data-action="closeVedicBookModal">닫기</button></div>'
      +     '</section>'
      +   '</div>'
      + '</div>';
    injectConsultationStyles();
  }
  function injectConsultationStyles() {
    if (document.getElementById('vedic-ai-consultation-style')) return;
    var style = document.createElement('style');
    style.id = 'vedic-ai-consultation-style';
    style.textContent = ''
      + '#vedicBookModal{position:fixed!important;inset:0!important;z-index:10050!important;display:none;align-items:center;justify-content:center;width:100vw!important;height:100vh!important;padding:16px;background:rgba(3,7,18,.76);box-sizing:border-box}'
      + '#vedicBookModal[aria-hidden="false"]{display:flex!important}'
      + '#vedicBookModal .lb-modal__overlay{position:absolute;inset:0;background:rgba(3,7,18,.68)}'
      + '#vedicBookModal .vd-ai-panel{--lb-accent:#e7b85b;--lb-accent2:#2557a7;width:min(100vw,1120px);max-height:min(94vh,920px);overflow:auto;background:#071026;color:#f8efe2;border:1px solid rgba(231,184,91,.4);border-radius:8px;box-shadow:0 28px 80px rgba(0,0,0,.5)}'
      + '#vedicBookModal .vd-ai-shell{position:relative;min-height:620px;background:radial-gradient(circle at 76% 8%,rgba(231,184,91,.22),transparent 25%),radial-gradient(circle at 18% 12%,rgba(55,99,180,.28),transparent 26%),linear-gradient(145deg,#071026 0%,#121b3d 54%,#170f26 100%);padding:22px}'
      + '#vedicBookModal .vd-ai-close{position:absolute;right:16px;top:14px;z-index:2;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.1);color:#fff;font-size:24px;cursor:pointer}'
      + '#vedicBookModal .vd-ai-hero{position:relative;overflow:hidden;padding:22px 48px 22px 16px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background-image:linear-gradient(90deg,rgba(7,16,38,.98) 0%,rgba(7,16,38,.88) 52%,rgba(7,16,38,.35) 100%),url("/fuctionassets/veda.webp");background-size:cover;background-position:center right}'
      + '#vedicBookModal .vd-ai-kicker{margin:0 0 6px;color:#f6d88a;font-size:.74rem;font-weight:900;letter-spacing:.18em}'
      + '#vedicBookModal .vd-ai-hero h2{margin:0;color:#fff7df;font-family:var(--font-display,var(--font-body));font-size:clamp(1.7rem,3vw,3rem);line-height:1.12;letter-spacing:0}'
      + '#vedicBookModal .vd-ai-hero p{max-width:760px;margin:10px 0 0;color:#f3dfb5;line-height:1.7;word-break:keep-all}'
      + '#vedicBookModal .vd-ai-hero-note{color:#c9d8ff!important}'
      + '#vedicBookModal .vd-ai-screen{padding:18px 0 0}'
      + '#vedicBookModal .vd-ai-form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}'
      + '#vedicBookModal .vd-ai-form-grid label,#vedicBookModal .vd-ai-question{display:grid;gap:6px;color:#f6d88a;font-size:.78rem;font-weight:900}'
      + '#vedicBookModal input,#vedicBookModal select,#vedicBookModal textarea{width:100%;min-height:42px;border:1px solid rgba(246,216,138,.34);border-radius:8px;background:rgba(255,255,255,.94);color:#111827;padding:10px 11px;font:inherit;box-sizing:border-box}'
      + '#vedicBookModal textarea{min-height:122px;resize:vertical;line-height:1.6}'
      + '#vedicBookModal .vd-ai-check{align-self:end;display:flex;align-items:center;gap:8px;min-height:42px;padding:0 10px;border:1px solid rgba(246,216,138,.22);border-radius:8px;background:rgba(255,255,255,.08);color:#fff1c2}'
      + '#vedicBookModal .vd-ai-check input{width:auto;min-height:0}'
      + '#vedicBookModal .vd-ai-help{margin:10px 0 0;color:#d6e2ff;font-size:.82rem;line-height:1.55}'
      + '#vedicBookModal .vd-ai-topic-wrap{margin-top:16px}'
      + '#vedicBookModal .vd-ai-topic-wrap p{margin:0 0 8px;color:#f6d88a;font-weight:900;font-size:.82rem}'
      + '#vedicBookModal .vd-ai-chips{display:flex;flex-wrap:wrap;gap:7px}'
      + '#vedicBookModal .vd-ai-chip{border:1px solid rgba(246,216,138,.34);border-radius:999px;background:rgba(255,255,255,.08);color:#fff4cf;padding:8px 11px;font-weight:800;cursor:pointer}'
      + '#vedicBookModal .vd-ai-chip.is-active{background:linear-gradient(135deg,#f8dc92,#d09b42);color:#17110a;border-color:#f8dc92}'
      + '#vedicBookModal .vd-ai-question{margin-top:14px}'
      + '#vedicBookModal .vd-ai-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}'
      + '#vedicBookModal .vd-ai-actions button,#vedicBookModal #vdStartBtn{border:1px solid rgba(248,220,146,.72);border-radius:8px;background:linear-gradient(135deg,#f8dc92,#c7832e);color:#17110a;padding:11px 16px;font-weight:950;cursor:pointer;min-height:42px}'
      + '#vedicBookModal .vd-ai-actions button:disabled{opacity:.58;cursor:not-allowed}'
      + '#vedicBookModal .vd-ai-status{color:#d6e2ff;font-size:.82rem;line-height:1.5}'
      + '#vedicBookModal .vd-ai-status[data-tone="error"]{color:#fecaca}'
      + '#vedicBookModal .vd-ai-status[data-tone="success"]{color:#bbf7d0}'
      + '#vedicBookModal .vd-ai-loading{text-align:center;min-height:360px;display:grid;place-items:center;align-content:center;gap:12px}'
      + '#vedicBookModal .vd-ai-mandala{width:118px;height:118px;border-radius:50%;border:1px solid rgba(248,220,146,.55);background:repeating-conic-gradient(from 0deg,rgba(248,220,146,.82) 0 8deg,rgba(59,130,246,.35) 8deg 16deg);box-shadow:0 0 42px rgba(248,220,146,.2);animation:vdAiSpin 9s linear infinite}'
      + '@keyframes vdAiSpin{to{transform:rotate(360deg)}}'
      + '#vedicBookModal .vd-ai-loading h3{margin:0;color:#fff7df;font-size:1.25rem}'
      + '#vedicBookModal .vd-ai-loading p{margin:0;color:#d6e2ff}'
      + '#vedicBookModal .vd-ai-result-head{padding:14px;border:1px solid rgba(248,220,146,.28);border-radius:8px;background:rgba(255,255,255,.08)}'
      + '#vedicBookModal .vd-ai-result-head p{margin:0 0 4px;color:#f6d88a;font-weight:900}'
      + '#vedicBookModal .vd-ai-result-head h3{margin:0;color:#fff7df;font-size:1rem;line-height:1.5}'
      + '#vedicBookModal .vd-ai-result-head span{display:block;margin-top:8px;color:#d6e2ff;font-size:.82rem}'
      + '#vedicBookModal .vd-ai-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}'
      + '#vedicBookModal .vd-ai-result-card{border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.08);padding:13px;min-height:120px}'
      + '#vedicBookModal .vd-ai-result-card h4{margin:0 0 8px;color:#f8dc92;font-size:.92rem}'
      + '#vedicBookModal .vd-ai-result-card div{color:#fff5df;line-height:1.72;font-size:.9rem;word-break:keep-all;overflow-wrap:anywhere}'
      + '#vedicBookModal .vd-ai-error{max-width:620px;margin:0 auto;text-align:center;padding:42px 0}'
      + '#vedicBookModal .vd-ai-error h3{color:#fecaca}'
      + '#vedicBookModal .vd-ai-error p{color:#fff1f2;line-height:1.6}'
      + '@media(max-width:760px){#vedicBookModal .vd-ai-panel{width:100vw;max-height:100vh;border-radius:0}#vedicBookModal .vd-ai-shell{padding:16px;min-height:100vh}#vedicBookModal .vd-ai-form-grid,#vedicBookModal .vd-ai-result-grid{grid-template-columns:1fr}#vedicBookModal .vd-ai-hero{padding-right:42px}#vedicBookModal .vd-ai-actions{align-items:stretch}#vedicBookModal .vd-ai-actions button,#vedicBookModal #vdStartBtn{width:100%}}';
    document.head.appendChild(style);
  }
  window.openVedicBookModal = function () {
    var modal = qs('vedicBookModal');
    if (!modal) return;
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    ensureConsultationMarkup();
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    bindForm();
    showScreen('vdStartScreen');
    fetchProfile().then(prefillProfile).catch(function () {
      setStatus('출생 정보를 직접 입력해 주세요.', 'info');
    });
  };
  window.closeVedicBookModal = function () {
    var modal = qs('vedicBookModal');
    stopLoading();
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  window.gotoVedicPremium = function () {
    window.openVedicBookModal();
  };
  window.generateVedicBook = handleGenerate;
  window.downloadVedicBookPdf = function () {
    window.openVedicBookModal();
  };
  window.__cdVedicAIConsultationMarker = CACHE_MARKER;

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');
    if (action === 'openVedicBookModal' || action === 'gotoVedicPremium') window.openVedicBookModal();
    if (action === 'closeVedicBookModal') window.closeVedicBookModal();
  });
})();
