/**
 * Saju New Year AI consultation flow.
 * Single contract: paid gate -> one Gemini consultation API -> result cards.
 */
(function () {
  'use strict';
  if (window.__cdSajuNewYearFlowLoaded) return;
  window.__cdSajuNewYearFlowLoaded = true;

  var SERVICE_KEY = 'saju-new-year';
  var FEATURE_KEY = 'premium_pdf_saju_new_year';
  var REASON = '사주 신년운세 AI 상담';
  var AI_CONSULTATION_API = '/api/saju-new-year/ai-consultation';
  var COIN_COST = 300;
  var DEFAULT_QUESTION = '선택한 해에 제 직업운과 수입 흐름은 어떻게 될까요?';
  var CATEGORY_QUESTIONS = {
    '종합운': '올해 전반적인 신년운세와 가장 중요한 선택 기준을 알려주세요.',
    '연애/재회': '올해 연애운과 재회 가능성, 관계에서 조심해야 할 흐름이 궁금해요.',
    '직업/이직': '올해 직업운, 이직운, 커리어 전환 타이밍을 봐주세요.',
    '재물/수입': '올해 재물운과 수입 흐름, 지출에서 조심할 시기를 알려주세요.',
    '건강/멘탈': '올해 건강운과 멘탈 흐름에서 조심해야 할 부분을 봐주세요.',
    '가족/인간관계': '올해 가족과 인간관계에서 좋은 흐름과 조심할 흐름을 알려주세요.',
    '월별 흐름': '월별로 좋은 시기와 피해야 할 시기를 정리해 주세요.',
    '조심해야 할 시기': '신년운세 기준으로 올해 특히 조심해야 할 시기와 이유를 알려주세요.',
    '올해의 행동 전략': '올해 제 명식과 세운 흐름에 맞는 현실적인 행동 전략을 알려주세요.'
  };

  var _generating = false;
  var _selectedCategory = '종합운';
  var _lastPending = null;
  var _lastPayment = null;
  var _resultPayload = null;
  var _billingSnapshot = {
    cost: COIN_COST,
    balance: null,
    balanceKnown: false,
    authenticated: null,
    pricingKnown: false,
    source: 'fallback'
  };

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }
  function _pad2(value) { return String(Number(value || 0)).padStart(2, '0'); }
  function _esc(value) {
    return _clean(value).replace(/[&<>"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] || ch;
    });
  }
  function _log(stage, meta) {
    try { console.info('[NewYearAIConsultation][' + String(stage || 'Unknown') + ']', meta || {}); } catch (_) {}
  }
  function _logError(error, meta) {
    try {
      console.error('[NewYearAIConsultation][Error][' + _clean(meta && meta.stage || error && error.stage || 'unknown') + ']', {
        serviceKey: SERVICE_KEY,
        featureKey: FEATURE_KEY,
        code: _clean(error && (error.code || error.name)) || undefined,
        status: Number(error && error.status || error && error.httpStatus || 0) || undefined,
        message: _clean(error && error.message ? error.message : error),
        reportId: _clean(meta && meta.reportId || error && error.reportId) || undefined,
        requestUrl: _clean(error && error.requestUrl) || undefined
      });
    } catch (_) {}
  }

  function _coinNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number) || number < 0) return null;
    return Math.floor(number);
  }
  function _formatCoins(value, fallback) {
    var number = _coinNumber(value);
    if (number === null) return fallback || '결제창 확인';
    var won = Math.max(0, number) * 100;
    try { return won.toLocaleString('ko-KR') + '원'; } catch (_) { return String(won) + '원'; }
  }
  function _firstCoinValue(payload, keys) {
    var roots = [];
    function add(value) {
      if (value && typeof value === 'object' && roots.indexOf(value) < 0) roots.push(value);
    }
    add(payload);
    add(payload && payload.data);
    add(payload && payload.pricing);
    add(payload && payload.paymentDecision);
    add(payload && payload.user);
    add(payload && payload.data && payload.data.pricing);
    add(payload && payload.data && payload.data.paymentDecision);
    add(payload && payload.data && payload.data.user);
    for (var i = 0; i < roots.length; i += 1) {
      for (var j = 0; j < keys.length; j += 1) {
        var number = _coinNumber(roots[i][keys[j]]);
        if (number !== null) return number;
      }
    }
    return null;
  }
  function _mergeBillingSnapshot(payload, source) {
    var next = Object.assign({}, _billingSnapshot);
    var data = payload && payload.data && typeof payload.data === 'object' ? payload.data : {};
    var cost = _firstCoinValue(payload, ['finalCoinPrice', 'coinPrice', 'requiredCoins', 'coinCost', 'cost', 'priceCoin', 'price']);
    var balance = _firstCoinValue(payload, ['balance', 'coinBalance', 'coins', 'currentCoins', 'remainingCoins', 'points', 'point']);
    if (cost !== null && cost > 0) {
      next.cost = cost;
      next.pricingKnown = true;
    }
    if (balance !== null) {
      next.balance = balance;
      next.balanceKnown = true;
    }
    if (payload && payload.authenticated === false || data && data.authenticated === false) next.authenticated = false;
    if (payload && payload.authenticated === true || data && data.authenticated === true) next.authenticated = true;
    next.source = source || next.source;
    _billingSnapshot = next;
    _updateBillingLabels();
    return next;
  }
  function _billingCost() {
    var cost = _coinNumber(_billingSnapshot.cost);
    return cost || COIN_COST;
  }
  function _updateBillingLabels() {
    var costLabel = _formatCoins(_billingSnapshot.cost, '결제창 확인');
    var coinLabel = _qs('nyCoinLabel');
    var generateCoin = _qs('nyGenerateCoin');
    var badge = _qs('nyTileCoinBadge');
    if (coinLabel) coinLabel.innerHTML = '<strong>' + _esc(costLabel) + '</strong> · 결제/이용권 확인 후 AI 상담 생성';
    if (generateCoin) generateCoin.textContent = '🪙 ' + costLabel;
    if (badge) badge.textContent = '🪙 ' + costLabel;
  }

  function _readPremiumAccessToken() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) { try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    return token;
  }
  function _persistPremiumAccessToken(token) {
    var value = _clean(token);
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }
  function _readAuthToken() {
    var token = '';
    try { token = String(localStorage.getItem('fortune_auth_token') || '').trim(); } catch (_) { token = ''; }
    if (!token) { try { token = String(localStorage.getItem('cd_access_token') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('authToken') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('cdToken') || '').trim(); } catch (_) { token = ''; } }
    return token;
  }
  function _buildAuthHeaders(baseHeaders) {
    var headers = Object.assign({}, baseHeaders || {});
    var premiumToken = _readPremiumAccessToken();
    var authToken = _readAuthToken();
    if (premiumToken) headers['x-premium-access-token'] = premiumToken;
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    return headers;
  }
  function _extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var i = 0; i < keys.length; i += 1) {
      var found = _clean(payload[keys[i]]);
      if (found) return found;
    }
    var nestedKeys = ['data', 'payload', 'rawPayload', 'raw', 'access', 'accessGrant', 'accessDecision', 'consume', 'payment', '_paymentContext'];
    for (var j = 0; j < nestedKeys.length; j += 1) {
      var nested = payload[nestedKeys[j]];
      if (nested && nested !== payload) {
        var nestedToken = _extractPremiumToken(nested);
        if (nestedToken) return nestedToken;
      }
    }
    return '';
  }

  function _paymentPayloadData(payload) {
    var source = payload && typeof payload === 'object' ? payload : {};
    if (source.data && typeof source.data === 'object') return source.data;
    if (source.payload && typeof source.payload === 'object') return source.payload;
    return source;
  }
  function _paymentPayloadLayers(payload) {
    var source = payload && typeof payload === 'object' ? payload : {};
    var data = _paymentPayloadData(source);
    var layers = [];
    function push(obj) {
      if (obj && typeof obj === 'object' && layers.indexOf(obj) < 0) layers.push(obj);
    }
    push(source);
    push(source.data);
    push(source.payload);
    push(source.rawPayload);
    push(source.raw);
    push(source.access);
    push(source.access && source.access.payload);
    push(source.access && source.access.rawPayload);
    push(data);
    push(data.accessGrant);
    push(data.accessDecision);
    push(data.consume);
    push(data.payment);
    push(data._paymentContext);
    layers.slice().forEach(function (item) {
      push(item && item.data);
      push(item && item.payload);
      push(item && item.rawPayload);
      push(item && item.accessGrant);
      push(item && item.accessDecision);
      push(item && item.consume);
      push(item && item.payment);
      push(item && item._paymentContext);
    });
    return layers;
  }
  function _firstPaymentObject(layers, key) {
    for (var i = 0; i < layers.length; i += 1) {
      var value = layers[i] && layers[i][key];
      if (value && typeof value === 'object') return value;
    }
    return {};
  }
  function _firstPaymentString(layers, keys) {
    var list = Array.isArray(keys) ? keys : [keys];
    for (var i = 0; i < layers.length; i += 1) {
      for (var j = 0; j < list.length; j += 1) {
        var value = _clean(layers[i] && layers[i][list[j]]);
        if (value) return value;
      }
    }
    return '';
  }
  function _isPassAccessPayload(layers, data) {
    var source = data && typeof data === 'object' ? data : {};
    if (source.freeBySubscription === true || source.__cdPassGateResolved === true) return true;
    for (var i = 0; i < layers.length; i += 1) {
      var item = layers[i] || {};
      var accessType = _clean(item.accessType || item.transactionType || item.type).toLowerCase();
      var accessMethod = _clean(item.accessMethod || item.paymentMethod || item.method).toLowerCase();
      var status = _clean(item.status || item.reason).toLowerCase();
      var passTier = _clean(item.passTier || item.tier || item.licenseTier).toLowerCase();
      if (/^(membership_pass|family|family_pass|usage_pass|subscription_pass|pass)$/.test(accessType)) return true;
      if (/^(pass|family|membership_pass)$/.test(accessMethod)) return true;
      if (/^(pass_applied|pass_covered|pass_free|family_all_access|license_coin_limit)$/.test(status)) return true;
      if (passTier === 'family') return true;
    }
    return false;
  }
  function _normalizeAccessGrant(raw, reportId, fallbackRequestId) {
    var data = raw && typeof raw === 'object' ? raw : {};
    var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};
    var access = data.access && typeof data.access === 'object' ? data.access : {};
    var payment = data.payment && typeof data.payment === 'object' ? data.payment : {};
    var context = data._paymentContext && typeof data._paymentContext === 'object' ? data._paymentContext : {};
    var featureKey = _clean(accessGrant.featureKey || consume.featureKey || access.featureKey || payment.featureKey || context.featureKey || data.featureKey || FEATURE_KEY) || FEATURE_KEY;
    var transactionId = _clean(accessGrant.transactionId || accessGrant.sourceTransactionId || accessGrant.paymentId || accessGrant.evidenceId || consume.transactionId || consume.paymentId || data.transactionId || data.paymentId || fallbackRequestId);
    var requestId = _clean(accessGrant.requestId || consume.requestId || payment.requestId || context.requestId || data.requestId || fallbackRequestId);
    var sessionId = _clean(accessGrant.sessionId || accessGrant.reportSessionId || consume.sessionId || context.sessionId || data.sessionId || ('saju-new-year:' + reportId));
    return {
      ok: data.ok !== false,
      featureKey: featureKey,
      reportType: 'sajuNewYear',
      reportId: _clean(accessGrant.reportId || consume.reportId || payment.reportId || context.reportId || data.reportId || reportId),
      sessionId: sessionId,
      reportSessionId: sessionId,
      requestId: requestId,
      purchaseId: _clean(accessGrant.purchaseId || consume.purchaseId || payment.purchaseId || context.purchaseId || data.purchaseId || transactionId || requestId),
      transactionId: transactionId,
      sourceTransactionId: transactionId,
      paymentId: _clean(accessGrant.paymentId || consume.paymentId || payment.paymentId || context.paymentId || transactionId),
      accessType: _clean(accessGrant.accessType || consume.accessType || access.accessType || payment.accessType || context.accessType || data.accessType || data.transactionType),
      transactionType: _clean(accessGrant.transactionType || consume.transactionType || data.transactionType || data.accessType),
      accessMethod: _clean(accessGrant.accessMethod || consume.accessMethod || access.accessMethod || payment.accessMethod || context.accessMethod || data.accessMethod || data.paymentMethod),
      paymentMethod: _clean(accessGrant.paymentMethod || consume.paymentMethod || data.paymentMethod),
      premiumAccessToken: _extractPremiumToken(data)
    };
  }
  function _buildPaidEvidence(rawPayload, reportId, fallbackRequestId) {
    var data = _paymentPayloadData(rawPayload);
    var layers = _paymentPayloadLayers(rawPayload);
    var grant = _normalizeAccessGrant(data, reportId, fallbackRequestId);
    var accessDecision = _firstPaymentObject(layers, 'accessDecision');
    var consume = _firstPaymentObject(layers, 'consume');
    var payment = _firstPaymentObject(layers, 'payment');
    var context = _firstPaymentObject(layers, '_paymentContext');
    var premiumAccessToken = _extractPremiumToken(rawPayload) || _firstPaymentString(layers, ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token']);
    var requestId = _clean(grant.requestId || _firstPaymentString(layers, ['requestId', 'idempotencyKey']) || fallbackRequestId);
    var sessionId = _clean(grant.sessionId || _firstPaymentString(layers, ['sessionId', 'reportSessionId']) || ('saju-new-year:' + reportId));
    var purchaseId = _clean(grant.purchaseId || _firstPaymentString(layers, ['purchaseId', 'transactionId', 'paymentId', 'ledgerId', 'evidenceId']) || requestId);
    var passAccess = _isPassAccessPayload(layers, data);
    grant.requestId = requestId;
    grant.sessionId = sessionId;
    grant.reportSessionId = sessionId;
    grant.reportId = reportId;
    grant.purchaseId = purchaseId;
    if (premiumAccessToken) grant.premiumAccessToken = premiumAccessToken;
    if (premiumAccessToken && payment && typeof payment === 'object') payment.premiumAccessToken = payment.premiumAccessToken || premiumAccessToken;
    return {
      requestId: requestId,
      premiumAccessToken: premiumAccessToken || undefined,
      accessGrant: grant,
      accessDecision: accessDecision,
      consume: consume,
      payment: payment,
      freeBySubscription: passAccess || data.freeBySubscription === true,
      rawPayload: rawPayload,
      _paymentContext: Object.assign({}, context, {
        requestId: requestId,
        reportId: reportId,
        sessionId: sessionId,
        reportSessionId: sessionId,
        purchaseId: purchaseId,
        transactionId: _clean(grant.transactionId || purchaseId),
        accessType: _clean(grant.accessType),
        accessMethod: _clean(grant.accessMethod),
        premiumAccessToken: premiumAccessToken || undefined
      })
    };
  }

  function _parseBirthTime(rawTime, rawHour, rawMinute) {
    var token = _clean(rawTime).toLowerCase();
    if (!token && (rawHour === null || rawHour === undefined || rawHour === '')) {
      return { birthTime: '', birthHour: null, birthMinute: null, isTimeUnknown: true };
    }
    if (/(모름|unknown|미상|없음)/.test(token)) {
      return { birthTime: '', birthHour: null, birthMinute: null, isTimeUnknown: true };
    }
    var hour = Number(rawHour);
    var minute = Number(rawMinute);
    var hm = token.match(/(?:오전|오후)?\s*(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*(?:분)?/);
    if (hm) {
      hour = Number(hm[1]);
      minute = hm[2] ? Number(hm[2]) : 0;
    }
    if (token.indexOf('오후') >= 0 && Number.isFinite(hour) && hour < 12) hour += 12;
    if (token.indexOf('오전') >= 0 && hour === 12) hour = 0;
    if (!Number.isFinite(hour)) return { birthTime: '', birthHour: null, birthMinute: null, isTimeUnknown: true };
    if (!Number.isFinite(minute)) minute = 0;
    hour = Math.max(0, Math.min(23, Math.trunc(hour)));
    minute = Math.max(0, Math.min(59, Math.trunc(minute)));
    return { birthTime: _pad2(hour) + ':' + _pad2(minute), birthHour: hour, birthMinute: minute, isTimeUnknown: false };
  }
  function _parseSajuNewYearDateInput(value) {
    var raw = _clean(value);
    if (!raw) return null;
    var datePart = raw.split(/[T\s]/)[0] || raw;
    var digits = datePart.replace(/\D/g, '');
    var parts = datePart.indexOf('-') >= 0 || datePart.indexOf('/') >= 0 || datePart.indexOf('.') >= 0
      ? datePart.split(/[-/.]/)
      : [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)];
    if (parts.length < 3 || String(parts[0] || '').length < 4) return null;
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    return year && month && day ? { year: year, month: month, day: day } : null;
  }
  function _recoverBirthFromDom() {
    try {
      var birthDateEl = _qs('birthDate');
      if (!birthDateEl || !birthDateEl.value) return null;
      var dateParts = _parseSajuNewYearDateInput(birthDateEl.value);
      if (!dateParts) return null;
      var nameEl = _qs('nameInput');
      var hourEl = _qs('birthHour');
      var minuteEl = _qs('birthMinute');
      var femaleEl = _qs('genderFemale');
      return {
        name: _clean(nameEl && nameEl.value) || '사용자',
        gender: femaleEl && femaleEl.checked ? 'F' : 'M',
        birth: {
          year: dateParts.year,
          month: dateParts.month,
          day: dateParts.day,
          hour: Number(hourEl && hourEl.value || 12),
          minute: Number(minuteEl && minuteEl.value || 0),
          calendarType: 'solar'
        }
      };
    } catch (_) {
      return null;
    }
  }
  function _recoverBirthFromStorage() {
    try {
      return typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile()
        || window.__cdCurrentDestinyProfile
        || null;
    } catch (_) {
      return null;
    }
  }
  function _getActiveBirthProfile() {
    var profile = window.__cdActiveBirthProfile;
    if (profile && profile.birth && profile.birth.year) return profile;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    var domProfile = _recoverBirthFromDom();
    if (domProfile) return domProfile;
    var stored = _recoverBirthFromStorage();
    if (stored && stored.birth && stored.birth.year) return stored;
    return null;
  }
  function _normalizeBirthInput(profile) {
    var birth = profile && profile.birth ? profile.birth : {};
    var year = Number(birth.year || profile.birthYear || 0);
    var month = Number(birth.month || profile.birthMonth || 0);
    var day = Number(birth.day || profile.birthDay || 0);
    var time = _parseBirthTime(birth.birthTime || profile.birthTime || '', birth.hour, birth.minute);
    return {
      name: _clean(profile && profile.name) || '사용자',
      gender: _clean(profile && profile.gender) || '',
      calendarType: _clean(birth.calendarType || birth.calType || profile.calendarType || 'solar') || 'solar',
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthDate: year && month && day ? String(year).padStart(4, '0') + '-' + _pad2(month) + '-' + _pad2(day) : '',
      birthTime: time.birthTime,
      birthHour: time.birthHour,
      birthMinute: time.birthMinute,
      isTimeUnknown: time.isTimeUnknown
    };
  }
  function _collectSajuBase() {
    var profile = _getActiveBirthProfile() || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var G = window.G_PILLARS || {};
    var counts = analysis.elementWeights || analysis.counts || {};
    var tenGodCounts = window.G_POWER && window.G_POWER.groups ? window.G_POWER.groups : {};
    var birth = profile.birth || snap.birth || {};
    function birthDate() {
      if (!birth.year || !birth.month || !birth.day) return '';
      return String(birth.year).padStart(4, '0') + '-' + _pad2(birth.month) + '-' + _pad2(birth.day);
    }
    return {
      user: {
        name: _clean(profile.name || snap.name || '사용자'),
        gender: _clean(profile.gender || snap.gender || ''),
        birthDate: birthDate(),
        birthTime: birth.hour !== undefined ? (_pad2(birth.hour) + ':' + _pad2(birth.minute || 0)) : '',
        calendarType: _clean(birth.calendarType || birth.calType || 'solar') || 'solar'
      },
      pillars: {
        year: { gan: _clean(G.y && G.y.g), zhi: _clean(G.y && G.y.j) },
        month: { gan: _clean(G.m && G.m.g), zhi: _clean(G.m && G.m.j) },
        day: { gan: _clean(G.d && G.d.g), zhi: _clean(G.d && G.d.j) },
        hour: { gan: _clean(G.h && G.h.g), zhi: _clean(G.h && G.h.j) }
      },
      core: {
        dayMaster: _clean((G.d && G.d.g) || analysis.dayStem || ''),
        dayBranch: _clean((G.d && G.d.j) || ''),
        monthBranch: _clean((G.m && G.m.j) || ''),
        season: _clean(analysis.season || '')
      },
      elementBalance: {
        wood: Number(counts.wood || counts.목 || 0),
        fire: Number(counts.fire || counts.화 || 0),
        earth: Number(counts.earth || counts.토 || 0),
        metal: Number(counts.metal || counts.금 || 0),
        water: Number(counts.water || counts.수 || 0)
      },
      tenGods: tenGodCounts,
      strength: analysis.strength || window.G_STRENGTH || null,
      johu: window.G_JOHU || analysis.johu || null,
      yongshin: analysis.yongshin || window.G_YONGSHIN || null,
      specialStars: analysis.specialStars || window.G_SPECIAL_STARS || null,
      timing: {
        daeun: window.G_DAEWUN || window.G_DAEUN || analysis.daeun || []
      }
    };
  }
  function _collectQuantumMyeongriJson() {
    var base = _collectSajuBase();
    return {
      schemaVersion: 'saju-new-year-client-evidence.v2',
      calculationSource: 'main-shell-saju-engine',
      evidencePolicy: 'supplemental_only_worker_engine_is_source_of_truth',
      sajuBase: base,
      pillars: base.pillars,
      core: base.core,
      elementBalance: base.elementBalance,
      tenGods: base.tenGods,
      strength: base.strength,
      johu: window.G_JOHU || base.johu || null,
      yongshin: base.yongshin,
      specialStars: base.specialStars,
      timing: base.timing,
      quantumRuntime: {
        power: window.G_POWER || null,
        daeun: window.G_DAEWUN || window.G_DAEUN || [],
        analysis: (window.__destinyFlowerSajuSnapshot && (window.__destinyFlowerSajuSnapshot.analysis || window.__destinyFlowerSajuSnapshot.saju)) || null
      }
    };
  }

  function _showScreen(id) {
    ['nyStartScreen', 'nyLoadingScreen', 'nyResultScreen', 'nyErrorScreen'].forEach(function (screenId) {
      var el = _qs(screenId);
      if (el) el.style.display = screenId === id ? '' : 'none';
    });
  }
  function _setStage(stage) {
    var active = _clean(stage);
    var pills = document.querySelectorAll('#sajuNewYearModal .ny-stage-pill');
    Array.prototype.forEach.call(pills, function (pill) {
      pill.classList.toggle('is-active', _clean(pill.getAttribute('data-ny-stage')) === active);
    });
    var title = _qs('nyLoadingTitle');
    var titles = {
      billing: '결제 권한을 확인하는 중입니다',
      calculate: '명식과 올해의 세운을 읽고 있어요.',
      write: 'Gemini가 상담문을 정리하고 있어요.',
      archive: '상담 결과를 카드로 정리하고 있어요.'
    };
    if (title && titles[active]) title.textContent = titles[active];
  }
  function _setLoading(message, stage, step) {
    _setStage(stage || '');
    var chapter = _qs('nyLoadingChapter');
    var quote = _qs('nyMysticQuote');
    var num = _qs('nyLoadingChapterNum');
    var text = _qs('nyProgressText');
    if (chapter) chapter.textContent = message || '질문에 맞는 올해의 흐름을 정리하고 있어요.';
    if (quote) quote.textContent = message || '대운과 세운의 결을 맞춰보고 있어요.';
    if (num) num.textContent = step || '상담';
    if (text) text.textContent = stage === 'billing' ? '결제 확인 중' : 'AI 상담 생성 중';
  }
  function _setBusy(isBusy) {
    var btn = _qs('nyGenerateBtn');
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }
  function _setError(message, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var el = _qs('nyErrorMsg');
    if (el) el.textContent = _clean(message) || '신년운세 AI 상담 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    var detail = _qs('nyErrorDetail');
    if (detail) {
      var detailText = _clean(opts.detail || '');
      detail.textContent = detailText;
      detail.style.display = detailText ? '' : 'none';
    }
    var birthBtn = _qs('nyBirthInputBtn');
    if (birthBtn) birthBtn.style.display = opts.showBirthInput ? '' : 'none';
    var chargeBtn = _qs('nyChargeBtn');
    if (chargeBtn) chargeBtn.style.display = opts.showCharge ? '' : 'none';
    var loginBtn = _qs('nyLoginBtn');
    if (loginBtn) loginBtn.style.display = opts.showLogin ? '' : 'none';
    var retryBtn = _qs('nyRetryBtn');
    if (retryBtn) {
      retryBtn.style.display = opts.hideRetry ? 'none' : '';
      retryBtn.textContent = _clean(opts.retryText) || '다시 시도';
    }
    _showScreen('nyErrorScreen');
  }
  function _publicErrorMessage(error, fallback) {
    var code = _clean(error && (error.code || error.name)).toUpperCase();
    var messages = {
      AUTH_REQUIRED: '신년운세 AI 상담을 위해 먼저 로그인해 주세요.',
      SESSION_INVALID: '로그인 세션이 만료되었습니다. 결제창에서 권한을 다시 확인해 주세요.',
      ENTITLEMENT_REQUIRED: '신년운세 AI 상담 권한이 필요합니다. 결제 또는 이용권을 확인해 주세요.',
      NEW_YEAR_AI_PAYMENT_TOKEN_EXPIRED: '결제 확인 시간이 만료되었습니다. 결제창에서 권한을 다시 확인해 주세요.',
      NEW_YEAR_AI_PAYMENT_TOKEN_INVALID: '결제 권한을 확인하지 못했습니다. 결제창에서 다시 확인해 주세요.',
      NEW_YEAR_AI_PAYMENT_TOKEN_MISSING: '이용권 적용은 확인됐지만 상담 생성 권한이 전달되지 않았습니다. 신년운세 AI 상담 받기를 다시 눌러 권한을 갱신해 주세요.',
      NEW_YEAR_AI_AUTH_SERVICE_ERROR: '결제 권한 확인 중 문제가 발생했습니다. 신년운세 AI 상담 받기를 다시 눌러 권한을 확인해 주세요.',
      WORKER_UNHANDLED_EXCEPTION: '결제 권한 확인 중 문제가 발생했습니다. 신년운세 AI 상담 받기를 다시 눌러 권한을 확인해 주세요.',
      INTERNAL_SERVER_ERROR: '결제 권한 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      NEW_YEAR_AI_LLM_FAILED: '현재 신년운세 AI 상담 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      GEMINI_NOT_CONFIGURED: '현재 Gemini 설정을 확인하지 못해 상담을 생성할 수 없습니다.'
    };
    if (messages[code]) return messages[code];
    var payload = error && error.payload && typeof error.payload === 'object' ? error.payload : {};
    var payloadCode = _clean(payload.code || payload.error).toUpperCase();
    if (messages[payloadCode]) return messages[payloadCode];
    var message = _clean(payload.message || payload.errorMessage || (error && error.message ? error.message : error));
    if (/Authentication service error/i.test(message)) return messages.NEW_YEAR_AI_AUTH_SERVICE_ERROR;
    if (!message || message === '[object Object]' || /^HTTP\s*5\d\d/i.test(message)) return fallback || '신년운세 AI 상담 생성 중 오류가 발생했습니다.';
    return message;
  }
  function _errorOptions(error) {
    var status = Number(error && error.status || 0);
    var code = _clean(error && (error.code || error.name)).toUpperCase();
    if (code === 'NEW_YEAR_AI_AUTH_SERVICE_ERROR' || code === 'WORKER_UNHANDLED_EXCEPTION' || code === 'INTERNAL_SERVER_ERROR') {
      return { retryText: '권한 다시 확인' };
    }
    if (status === 401 || code === 'AUTH_REQUIRED') {
      return { showLogin: true, retryText: '로그인 후 다시 시도' };
    }
    if (status === 402 || code === 'ENTITLEMENT_REQUIRED') {
      return { showCharge: true, retryText: '결제 다시 확인' };
    }
    if (code === 'INVALID_INPUT') {
      return { showBirthInput: true, retryText: '입력 다시 확인' };
    }
    return { retryText: '상담 다시 시도' };
  }

  function _targetYear() {
    var el = _qs('nyTargetYear');
    var year = Number(el && el.value || 0);
    var now = new Date().getFullYear();
    if (!year) year = now + 1;
    if (year < now) year = now;
    if (year > now + 10) year = now + 10;
    if (el) el.value = String(year);
    return year;
  }
  function _questionInput() { return _qs('nyQuestion'); }
  function _currentQuestion() {
    var value = _clean(_questionInput() && _questionInput().value);
    return value || CATEGORY_QUESTIONS[_selectedCategory] || DEFAULT_QUESTION;
  }
  function _currentCategory() { return _selectedCategory || '종합운'; }
  function _setCategory(category, updateQuestion) {
    var next = _clean(category) || '종합운';
    _selectedCategory = next;
    Array.prototype.forEach.call(document.querySelectorAll('#sajuNewYearModal .ny-category-chip'), function (chip) {
      chip.classList.toggle('is-active', _clean(chip.getAttribute('data-ny-category')) === next);
    });
    var input = _questionInput();
    if (input && updateQuestion) input.value = CATEGORY_QUESTIONS[next] || DEFAULT_QUESTION;
  }
  function _updateProfileStatus(profile) {
    var el = _qs('nyProfileStatus');
    if (!el) return;
    if (!profile || !profile.birth || !profile.birth.year) {
      el.innerHTML = '<strong>생년월일 정보가 필요합니다.</strong><br>먼저 운명 카드에서 생년월일과 출생시간을 입력해 주세요.';
      return;
    }
    var birth = profile.birth;
    el.innerHTML = '<strong>' + _esc(profile.name || '사용자') + '</strong> · ' + _esc(birth.year + '. ' + birth.month + '. ' + birth.day) + ' 생 · ' + _esc(birth.hour === undefined ? '출생시간 모름' : _pad2(birth.hour) + ':' + _pad2(birth.minute || 0));
  }
  function _buildReportId(targetYear) {
    return 'saju-new-year-ai-' + targetYear + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }
  function _buildPendingGeneration() {
    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth || !profile.birth.year) {
      _updateProfileStatus(null);
      _setError('정확한 신년운세 계산을 위해 생년월일 정보를 확인해 주세요.', {
        showBirthInput: true,
        hideRetry: true,
        detail: '사주 원국이 확인되어야 대상 연도의 세운과 월운을 정확히 계산할 수 있습니다.'
      });
      return null;
    }
    var targetYear = _targetYear();
    var normalizedBirth = _normalizeBirthInput(profile);
    if (!normalizedBirth.birthDate) {
      _setError('정확한 신년운세 계산을 위해 생년월일 정보를 확인해 주세요.', {
        showBirthInput: true,
        hideRetry: true
      });
      return null;
    }
    var question = _currentQuestion();
    if (question.length < 5) {
      _setError('신년운세에서 궁금한 질문을 먼저 입력해 주세요.', {
        hideRetry: true,
        detail: '예: 선택한 해에 제 직업운과 수입 흐름은 어떻게 될까요?'
      });
      return null;
    }
    if (typeof window.computeProfileForModal === 'function') {
      try { window.computeProfileForModal(profile); } catch (_) {}
    }
    return {
      reportId: _buildReportId(targetYear),
      targetYear: targetYear,
      profile: profile,
      normalizedBirth: normalizedBirth,
      question: question,
      category: _currentCategory()
    };
  }

  function _runPaidGate(pending) {
    if (typeof window._cdOpenPaidServiceGate !== 'function') {
      return Promise.reject(Object.assign(new Error('결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'), { code: 'PAYMENT_GATE_MISSING', status: 500 }));
    }
    var requestId = 'saju-new-year-ai:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
    var cost = _billingCost();
    _log('PaymentGateOpen', { featureKey: FEATURE_KEY, reportId: pending.reportId });
    return new Promise(function (resolve, reject) {
      var settled = false;
      function finish(rawPayload, access) {
        if (settled) return;
        settled = true;
        var raw = Object.assign(
          {},
          access && access.rawPayload && typeof access.rawPayload === 'object' ? access.rawPayload : {},
          access && access.payload && typeof access.payload === 'object' ? access.payload : {},
          rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
        );
        if (access && typeof access === 'object') raw.access = access;
        var token = _extractPremiumToken(raw);
        if (token) _persistPremiumAccessToken(token);
        _mergeBillingSnapshot(raw, 'paid-gate');
        var evidence = _buildPaidEvidence(raw, pending.reportId, requestId);
        if (!evidence.accessGrant && !evidence.premiumAccessToken) {
          reject(Object.assign(new Error('결제 권한 확인 결과가 비어 있습니다. 다시 시도해 주세요.'), { code: 'PAYMENT_EVIDENCE_MISSING', status: 402 }));
          return;
        }
        _lastPayment = evidence;
        resolve(evidence);
      }
      function cancel() {
        if (settled) return;
        settled = true;
        reject(Object.assign(new Error('결제가 취소되었습니다.'), { code: 'PAYMENT_CANCELLED', status: 402 }));
      }
      try {
        var gate = window._cdOpenPaidServiceGate({
          categoryKey: 'premium-report',
          featureKey: FEATURE_KEY,
          serviceType: SERVICE_KEY,
          productKey: FEATURE_KEY,
          reportType: 'sajuNewYear',
          paymentPurpose: 'ai_consultation',
          action: 'openSajuNewYearModal',
          forcePassFirst: true,
          forceDeduct: false,
          allowedPaymentModes: ['direct', 'monthly', 'membership_pass', 'pass'],
          title: REASON,
          reason: REASON,
          coinPrice: cost,
          cost: cost,
          amountKrw: cost * 100,
          amountKRW: cost * 100,
          paymentAmount: cost * 100,
          reportId: pending.reportId,
          sessionId: 'saju-new-year:' + pending.reportId,
          reportSessionId: 'saju-new-year:' + pending.reportId,
          requestId: requestId,
          onGranted: function (transactionId, payload, access) {
            var granted = payload && typeof payload === 'object' ? payload : {};
            var txId = _clean((granted && (granted.purchaseId || granted.transactionId)) || transactionId);
            finish(Object.assign({}, granted, txId ? { purchaseId: txId, transactionId: txId } : {}), access);
          },
          onPassApplied: function (access) {
            finish((access && (access.payload || access.rawPayload)) || access || {}, access);
          },
          onCancel: cancel
        });
        if (gate && typeof gate.then === 'function') {
          gate.then(function (payload) {
            if (payload === null || payload === undefined || payload && payload.status === 'cancelled') cancel();
            else finish(payload);
          }).catch(function (error) {
            if (settled) return;
            settled = true;
            reject(error);
          });
        } else if (!gate) {
          reject(Object.assign(new Error('결제 게이트를 불러오지 못했습니다.'), { code: 'PAYMENT_GATE_MISSING', status: 500 }));
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  function _buildAIConsultationPayload(pending, evidence) {
    var grant = evidence && evidence.accessGrant || {};
    var paymentToken = _clean(evidence && (evidence.premiumAccessToken || evidence._premiumAccessToken) || grant.premiumAccessToken || _readPremiumAccessToken());
    var sessionId = _clean(grant.sessionId || grant.reportSessionId || ('saju-new-year:' + pending.reportId));
    var requestId = _clean(evidence && evidence.requestId || grant.requestId || ('saju-new-year-ai:' + pending.reportId));
    var payload = {
      serviceKey: SERVICE_KEY,
      serviceType: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      apiFeatureKey: FEATURE_KEY,
      billingFeatureKey: FEATURE_KEY,
      paymentPurpose: 'ai_consultation',
      reason: REASON,
      reportId: pending.reportId,
      sessionId: sessionId,
      reportSessionId: sessionId,
      requestId: requestId,
      targetYear: pending.targetYear,
      selectedYear: pending.targetYear,
      question: pending.question,
      category: pending.category,
      questionCategory: pending.category,
      profile: pending.profile,
      birthInput: pending.normalizedBirth,
      name: pending.normalizedBirth.name,
      gender: pending.normalizedBirth.gender,
      calendarType: pending.normalizedBirth.calendarType,
      birthDate: pending.normalizedBirth.birthDate,
      birthTime: pending.normalizedBirth.birthTime,
      birthTimeKnown: !pending.normalizedBirth.isTimeUnknown,
      hour: pending.normalizedBirth.birthHour,
      minute: pending.normalizedBirth.birthMinute,
      sajuBase: _collectSajuBase(),
      quantumMyeongriJson: _collectQuantumMyeongriJson(),
      accessGrant: grant,
      accessDecision: evidence && evidence.accessDecision || undefined,
      consume: evidence && evidence.consume || undefined,
      payment: evidence && evidence.payment || undefined,
      _paymentContext: Object.assign({}, evidence && evidence._paymentContext || {}, {
        requestId: requestId,
        reportId: pending.reportId,
        sessionId: sessionId,
        reportSessionId: sessionId,
        premiumAccessToken: paymentToken || undefined
      }),
      freeBySubscription: evidence && evidence.freeBySubscription === true,
      premiumAccessToken: paymentToken || undefined,
      dryRun: false
    };
    if (paymentToken) {
      payload._premiumAccessToken = paymentToken;
      payload.accessGrant = Object.assign({}, payload.accessGrant || {}, { premiumAccessToken: paymentToken });
      payload.payment = Object.assign({}, payload.payment || {}, { premiumAccessToken: paymentToken });
    }
    return payload;
  }
  async function _postConsultation(payload) {
    var headers = _buildAuthHeaders({ 'Content-Type': 'application/json' });
    if (payload && payload.premiumAccessToken) headers['x-premium-access-token'] = payload.premiumAccessToken;
    _log('NetworkRequestStart', {
      stage: 'ai-consultation',
      url: AI_CONSULTATION_API,
      hasPremiumAccessToken: !!headers['x-premium-access-token']
    });
    var response = await fetch(AI_CONSULTATION_API, {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify(payload)
    });
    var body = await response.json().catch(function () { return {}; });
    _log('NetworkRequestEnd', {
      stage: 'ai-consultation',
      status: response.status,
      ok: response.ok && body && body.ok !== false,
      code: _clean(body && (body.code || body.error)),
      provider: _clean(body && (body.provider || body.providerName)),
      isMock: body && body.isMock === true
    });
    if (!response.ok || !body || body.ok === false) {
      var error = new Error(_clean(body && (body.message || body.errorMessage || body.error)) || ('HTTP ' + response.status));
      error.status = response.status;
      error.code = _clean(body && (body.code || body.error)) || 'NEW_YEAR_AI_CONSULTATION_FAILED';
      error.payload = body;
      error.requestUrl = AI_CONSULTATION_API;
      throw error;
    }
    return body;
  }

  function _textBlockHtml(value) {
    var text = _clean(value);
    if (!text) return '<p>상담문을 정리하지 못했습니다.</p>';
    return text.split(/\n{2,}/).map(function (part) {
      return '<p>' + _esc(part).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  function _listBlockHtml(items) {
    var list = Array.isArray(items) ? items.map(function (item) { return _clean(item); }).filter(Boolean) : [];
    if (!list.length) return '';
    return '<ul>' + list.map(function (item) { return '<li>' + _esc(item) + '</li>'; }).join('') + '</ul>';
  }
  function _timingBlockHtml(timing) {
    var data = timing && typeof timing === 'object' ? timing : {};
    var monthly = Array.isArray(data.monthlyNotes) ? data.monthlyNotes : [];
    var html = '';
    if (data.goodPeriods && data.goodPeriods.length) html += '<div class="ny-ai-period"><strong>좋은 시기</strong>' + _listBlockHtml(data.goodPeriods) + '</div>';
    if (data.cautionPeriods && data.cautionPeriods.length) html += '<div class="ny-ai-period"><strong>조심할 시기</strong>' + _listBlockHtml(data.cautionPeriods) + '</div>';
    if (monthly.length) {
      html += '<div class="ny-ai-month-grid">' + monthly.map(function (item) {
        return '<div class="ny-ai-month"><strong>' + _esc(item && item.month || '시기') + '</strong><span>' + _esc(item && item.note) + '</span></div>';
      }).join('') + '</div>';
    }
    return html || '<p>월운 데이터가 충분하지 않아 구체 월별 단정보다는 분기와 계절 흐름 중심으로 상담합니다.</p>';
  }
  function _chapterSectionsHtml(sections) {
    var list = Array.isArray(sections) ? sections : [];
    if (!list.length) return '';
    return '<div class="ny-ai-chapter-sections">' + list.map(function (section) {
      var title = _clean(section && section.title);
      var body = _clean(section && section.body);
      if (!body) return '';
      return '<section class="ny-ai-chapter-section">' + (title ? '<h5>' + _esc(title) + '</h5>' : '') + _textBlockHtml(body) + '</section>';
    }).join('') + '</div>';
  }
  function _chapterConsultationsHtml(chapters) {
    var list = Array.isArray(chapters) ? chapters : [];
    if (!list.length) return '';
    return '<section class="ny-ai-result-card ny-ai-result-card--chapters"><h4>신년운세 전체 상담</h4><div class="ny-ai-chapter-list">' + list.map(function (chapter, index) {
      var no = Number(chapter && chapter.no || index + 1);
      var title = _clean(chapter && chapter.title) || (no + '장 신년운세 상담');
      var overview = _clean(chapter && chapter.overview);
      var takeaways = Array.isArray(chapter && chapter.keyTakeaways) ? chapter.keyTakeaways : [];
      var actions = Array.isArray(chapter && chapter.actionItems) ? chapter.actionItems : [];
      return '<article class="ny-ai-chapter-card">'
        + '<div class="ny-ai-chapter-kicker">' + _esc(no + '장') + '</div>'
        + '<h5>' + _esc(title) + '</h5>'
        + (overview ? _textBlockHtml(overview) : '')
        + _chapterSectionsHtml(chapter && chapter.sections)
        + (takeaways.length ? '<div class="ny-ai-chapter-notes"><strong>핵심 포인트</strong>' + _listBlockHtml(takeaways) + '</div>' : '')
        + (actions.length ? '<div class="ny-ai-chapter-notes"><strong>행동 조언</strong>' + _listBlockHtml(actions) + '</div>' : '')
        + '</article>';
    }).join('') + '</div></section>';
  }
  function _renderAIConsultationResult(response, profile, targetYear) {
    _resultPayload = response;
    var result = response && response.result && typeof response.result === 'object' ? response.result : {};
    var cards = _qs('nyConsultationResultCards');
    var nameEl = _qs('nyResultName');
    var dateEl = _qs('nyResultDate');
    if (nameEl) nameEl.textContent = targetYear + ' 신년운세 AI 상담';
    if (dateEl && profile && profile.birth) {
      dateEl.textContent = (profile.name || '사용자') + ' · ' + profile.birth.year + '. ' + profile.birth.month + '. ' + profile.birth.day + ' 생 · ' + new Date().toLocaleDateString('ko-KR') + ' 상담';
    }
    if (!cards) return;
    var followUps = Array.isArray(result.followUpQuestions) ? result.followUpQuestions : [];
    cards.innerHTML = [
      '<section class="ny-ai-result-card"><h4>상담 요약</h4>' + _textBlockHtml(result.summary) + '</section>',
      '<section class="ny-ai-result-card"><h4>올해의 큰 흐름</h4>' + _textBlockHtml(result.yearlyFlow) + '</section>',
      '<section class="ny-ai-result-card"><h4>질문 주제별 답변</h4>' + _textBlockHtml(result.topicAnswer || result.rawText) + '</section>',
      '<section class="ny-ai-result-card"><h4>좋은 시기와 조심할 시기</h4>' + _timingBlockHtml(result.timing) + '</section>',
      _chapterConsultationsHtml(result.chapterConsultations),
      '<section class="ny-ai-result-card"><h4>현실적인 조언</h4>' + (_listBlockHtml(result.actionGuide) || _textBlockHtml(result.actionGuide)) + '</section>',
      '<section class="ny-ai-result-card"><h4>마지막 한마디</h4>' + _textBlockHtml(result.closingMessage) + '</section>',
      '<section class="ny-ai-result-card ny-ai-result-card--follow"><h4>이어 물어보기</h4>' + (followUps.length ? '<div class="ny-followup-list">' + followUps.map(function (item) { return '<button type="button" class="ny-followup-chip" data-ny-followup="' + _esc(item) + '">' + _esc(item) + '</button>'; }).join('') + '</div>' : '<p>올해 가장 궁금한 주제를 하나 더 좁혀 물어보면 흐름이 더 섬세하게 열립니다.</p>') + '</section>'
    ].filter(Boolean).join('');
    Array.prototype.forEach.call(cards.querySelectorAll('.ny-followup-chip'), function (btn) {
      btn.addEventListener('click', function () {
        var input = _questionInput();
        if (input) {
          input.value = btn.getAttribute('data-ny-followup') || '';
          input.focus();
        }
        _showScreen('nyStartScreen');
      });
    });
  }

  async function _runBillingAndGeneration(pending) {
    _setStage('billing');
    var evidence = await _runPaidGate(pending);
    _setLoading('결제 권한이 확인되었습니다. 명식과 올해의 세운을 읽고 있어요.', 'calculate', '상담 준비');
    _showScreen('nyLoadingScreen');
    var payload = _buildAIConsultationPayload(pending, evidence);
    _setLoading('Gemini가 질문에 맞는 신년운세 상담을 생성하고 있어요.', 'write', 'AI 상담');
    var result = await _postConsultation(payload);
    if (!result || result.ok === false || !result.result) {
      throw Object.assign(new Error('신년운세 AI 상담 결과를 확인하지 못했습니다.'), { code: 'NEW_YEAR_AI_RESULT_MISSING', status: 502 });
    }
    _setLoading('상담 결과를 카드로 정리하고 있어요.', 'archive', '결과 정리');
    _renderAIConsultationResult(result, pending.profile, pending.targetYear);
    _showScreen('nyResultScreen');
    return result;
  }

  function _bindQuestionControls() {
    Array.prototype.forEach.call(document.querySelectorAll('#sajuNewYearModal .ny-category-chip'), function (chip) {
      if (chip.dataset.nyBound === '1') return;
      chip.dataset.nyBound = '1';
      chip.addEventListener('click', function () {
        _setCategory(chip.getAttribute('data-ny-category'), true);
      });
    });
    _setCategory(_selectedCategory || '종합운', false);
  }
  function _bindGenerateButton() {
    var btn = _qs('nyGenerateBtn');
    if (!btn || btn.dataset.nyAiGenerateBound === '1') return;
    btn.dataset.nyAiGenerateBound = '1';
    btn.addEventListener('click', function (event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
      window.generateSajuNewYear();
    });
  }
  function _initModal() {
    _targetYear();
    _updateProfileStatus(_getActiveBirthProfile());
    _updateBillingLabels();
    _bindQuestionControls();
    _bindGenerateButton();
    var input = _questionInput();
    if (input && !_clean(input.value)) input.value = DEFAULT_QUESTION;
  }

  window.openSajuNewYearModal = function () {
    var modal = _qs('sajuNewYearModal');
    if (!modal) return;
    _initModal();
    modal.style.display = '';
    modal.classList.add('active', 'show');
    _showScreen('nyStartScreen');
  };
  window.closeSajuNewYearModal = function () {
    var modal = _qs('sajuNewYearModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('active', 'show');
  };
  window.gotoSajuNewYearPremium = function () {
    var chargeAction = document.querySelector('[data-action="openHoneyPassShop"],[data-action="openMembership"]');
    if (chargeAction && typeof chargeAction.click === 'function') {
      window.closeSajuNewYearModal();
      chargeAction.click();
      return;
    }
    _setError('결제 창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.', {
      detail: '상단의 이용권 상점에서 원화 결제 또는 이용권 상태를 확인해 주세요.',
      retryText: '다시 확인'
    });
  };
  window.openSajuNewYearLogin = function () {
    window.closeSajuNewYearModal();
    var nextPath = (window.location.pathname || '/') + (window.location.search || '') + (window.location.hash || '');
    if (typeof window.__cdOpenLoginRequiredModal === 'function') {
      window.__cdOpenLoginRequiredModal({ nextPath: nextPath, reason: 'saju_new_year_ai_consultation' });
      return;
    }
    window.location.href = '/login?next=' + encodeURIComponent(nextPath || '/');
  };
  window.generateSajuNewYear = function () {
    if (_generating) return;
    var pending = _buildPendingGeneration();
    if (!pending) return;
    _lastPending = pending;
    _generating = true;
    _setBusy(true);
    _runBillingAndGeneration(pending).catch(function (error) {
      _logError(error, { stage: error && error.stage || 'ai-consultation', reportId: pending.reportId });
      _setError(_publicErrorMessage(error, '신년운세 AI 상담 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'), _errorOptions(error));
    }).finally(function () {
      _generating = false;
      _setBusy(false);
    });
  };
  window.confirmSajuNewYearPayment = window.generateSajuNewYear;
  window.retrySajuNewYearAIConsultation = function () {
    if (_generating) return;
    if (_lastPending && _lastPayment) {
      _generating = true;
      _setBusy(true);
      _showScreen('nyLoadingScreen');
      _setLoading('기존 결제 권한으로 상담문을 다시 생성하고 있어요.', 'write', '재생성');
      _postConsultation(_buildAIConsultationPayload(_lastPending, _lastPayment)).then(function (result) {
        _renderAIConsultationResult(result, _lastPending.profile, _lastPending.targetYear);
        _showScreen('nyResultScreen');
      }).catch(function (error) {
        _setError(_publicErrorMessage(error), _errorOptions(error));
      }).finally(function () {
        _generating = false;
        _setBusy(false);
      });
      return;
    }
    window.generateSajuNewYear();
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');
    if (action === 'openSajuNewYearModal') { window.openSajuNewYearModal(); return; }
    if (action === 'closeSajuNewYearModal') { window.closeSajuNewYearModal(); return; }
    if (action === 'generateSajuNewYear') {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      window.generateSajuNewYear();
      return;
    }
    if (action === 'confirmSajuNewYearPayment') { window.confirmSajuNewYearPayment(); return; }
    if (action === 'gotoSajuNewYearPremium') { window.gotoSajuNewYearPremium(); return; }
    if (action === 'openSajuNewYearLogin') { window.openSajuNewYearLogin(); return; }
  });

  document.addEventListener('DOMContentLoaded', _initModal);
  if (document.readyState !== 'loading') _initModal();
})();
