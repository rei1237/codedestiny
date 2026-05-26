/**
 * 숙요점 프리미엄 (Sukuyo 宿曜占 — Premium Life Report)
 * CODE-DESTINY v1.1  •  개인 12챕터 / 궁합 8챕터 프리미엄 리포트
 */
(function () {
  'use strict';

  var PERSONAL_CHAPTER_META = [
    { title: 'Chapter 1. 나의 별이 말하는 운명의 본질', subtitle: '타고난 성향과 운명의 핵심 원형' },
    { title: 'Chapter 2. 타고난 성격과 내면의 결', subtitle: '겉모습과 내면 패턴의 구조' },
    { title: 'Chapter 3. 재능과 성공 가능성', subtitle: '강점과 성공 조건의 현실 해석' },
    { title: 'Chapter 4. 일과 사회적 운명', subtitle: '사회 역할과 커리어 흐름' },
    { title: 'Chapter 5. 돈과 현실 감각', subtitle: '재물 습관과 안정 전략' },
    { title: 'Chapter 6. 사랑과 인연의 방식', subtitle: '연애 패턴과 관계 유지 전략' },
    { title: 'Chapter 7. 인간관계와 귀인운', subtitle: '귀인/소모 관계 판별과 운영' },
    { title: 'Chapter 8. 감정의 그림자와 마음의 회복', subtitle: '내면 소진 패턴과 회복법' },
    { title: 'Chapter 9. 인생의 전환점과 운의 흐름', subtitle: '시기별 변화 신호와 대응' },
    { title: 'Chapter 10. 건강한 생활 리듬과 에너지 관리', subtitle: '생활 루틴 기반 에너지 운영' },
    { title: 'Chapter 11. 올해와 가까운 미래의 운용 전략', subtitle: '월별/분기별 실전 운용 가이드' },
    { title: 'Chapter 12. 숙요점 인생 마스터플랜', subtitle: '최종 통합 전략 봉서' },
  ];

  var COMPAT_CHAPTER_META = [
    { title: 'I. 두 사람의 숙요 궁합 총론', subtitle: '인연의 기본 구조를 진단합니다.' },
    { title: 'II. 27숙 개별 성향 분석', subtitle: '서로의 본질 차이를 해석합니다.' },
    { title: 'III. 숙요 관계 유형 분석', subtitle: '명·업태·영친·우쇠·안괴·위성 구조를 풉니다.' },
    { title: 'IV. 거리 관계 분석', subtitle: '근거리·중거리·원거리 체감을 정리합니다.' },
    { title: 'V. 첫 끌림과 운명적 인연감', subtitle: '초기 반응과 경계 조건을 해석합니다.' },
    { title: 'VI. 감정 궁합', subtitle: '마음이 통하는 방식과 어긋남을 분석합니다.' },
    { title: 'VII. 연애 궁합', subtitle: '관계 운영 방식과 속도를 점검합니다.' },
    { title: 'VIII. 결혼 궁합', subtitle: '함께 살아갈 현실 적합성을 평가합니다.' },
    { title: 'IX. 갈등 구조 분석', subtitle: '무너지는 지점과 회복법을 제시합니다.' },
    { title: 'X. 안괴·위험 관계 집중 분석', subtitle: '강한 끌림과 파괴성을 점검합니다.' },
    { title: 'XI. 영친·업태·우쇠 집중 분석', subtitle: '오래 가는 인연의 조건을 해석합니다.' },
    { title: 'XII. 속궁합과 친밀감', subtitle: '몸과 마음의 밀착도를 다룹니다.' },
    { title: 'XIII. 재회·이별·미련 분석', subtitle: '끊어짐과 재접속 가능성을 분석합니다.' },
    { title: 'XIV. 관계의 시기와 흐름', subtitle: '가까워질 때와 조심할 때를 구분합니다.' },
    { title: 'XV. 현실 궁합', subtitle: '돈·일·생활·가족 문제를 정리합니다.' },
    { title: 'XVI. 최종 궁합 리포트', subtitle: '관계 운영 최종 전략을 확정합니다.' },
  ];

  var PERSONAL_LOADING_MSGS = [
    '운명의 본질을 정밀하게 해석하는 중...',
    '성격과 내면 결을 분석하는 중...',
    '재능과 성공 조건을 추출하는 중...',
    '일과 사회적 역할 패턴을 정리하는 중...',
    '돈과 현실 감각 리듬을 해석하는 중...',
    '사랑과 인연 패턴을 구성하는 중...',
    '인간관계와 귀인운 흐름을 분석하는 중...',
    '감정 그림자와 회복 루틴을 정리하는 중...',
    '인생 전환점과 운의 흐름을 해석하는 중...',
    '생활 리듬과 에너지 관리 전략을 설계하는 중...',
    '올해와 가까운 미래 운용 전략을 작성하는 중...',
    '마스터플랜 봉서를 완성하는 중...',
  ];

  var COMPAT_LOADING_MSGS = [
    '두 사람의 인연 기본 구조를 정밀 분석하는 중...',
    '27숙 기질 차이와 매력 포인트를 해석하는 중...',
    '숙요 관계 유형의 핵심 역학을 정리하는 중...',
    '거리 관계와 체감 온도를 계산하는 중...',
    '첫 끌림과 운명감 패턴을 추적하는 중...',
    '감정 궁합과 회복 대화법을 구성하는 중...',
    '연애 운영 방식과 속도 차이를 분석하는 중...',
    '결혼/동거 현실 적합성을 점검하는 중...',
    '갈등 붕괴 패턴과 완충 전략을 정리하는 중...',
    '안괴·위험 관계 리스크를 집중 해석하는 중...',
    '영친·업태·우쇠 장기 조건을 분석하는 중...',
    '친밀감과 속궁합 밀착도를 계산하는 중...',
    '이별·재회·미련 흐름을 정리하는 중...',
    '관계 시기별 주의 구간을 매핑하는 중...',
    '돈·일·생활 현실 궁합을 조정하는 중...',
    '최종 관계 운영 리포트를 완성하는 중...',
  ];

  var MYSTIC_QUOTES = [
    '숙요(宿曜)는 달이 하늘을 여행하며 만나는 27개의 별자리 여관입니다.',
    '에도 막부가 민간 사용을 금지했던 이유 — 너무 정확했기 때문입니다.',
    '달이 태어날 때 머물던 별자리가 영혼의 첫 인장을 새깁니다.',
    '성(成)·친(親)·화(和)·쇠(衰)·괴(壞)·살(殺) — 달빛이 관계를 분류하는 방식.',
    '27수는 불교 밀교가 천년 동안 숨겨온 운명 해독의 열쇠입니다.',
    '달의 주기와 함께하면 모든 것이 저항 없이 흐릅니다.',
    '숙요 재능 지수는 이 별자리 태생이 가진 선천적 강점입니다.',
    '달빛 전략가는 물처럼 흐르며 기회를 만납니다.',
    '반복되는 패턴을 아는 사람만이 같은 시련을 끊을 수 있습니다.',
    '만트라는 영혼이 스스로에게 보내는 진동 코드입니다.',
  ];

  var _chapters = Array(PERSONAL_CHAPTER_META.length).fill(null);
  var _sukuyoChart = null;
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;
  var PREMIUM_SUKUYO_COST = 390;
  var PREMIUM_SUKUYO_COMPAT_EXTRA_COST = 300;
  var PREMIUM_SUKUYO_FEATURE_KEY = 'premium-sukuyo-report';
  var PREMIUM_SUKUYO_COMPAT_FEATURE_KEY = 'premium-sukuyo-compat-extra';
  var PREMIUM_SUKUYO_TX_KEY = 'cd_premium_tx_sukuyo';
  var PREMIUM_SUKUYO_COMPAT_TX_KEY = 'cd_premium_tx_sukuyo_compat_extra';
  var PREMIUM_SUKUYO_REPORT_FEATURE_KEY = 'premium-sukuyo-report';
  var SUKUYO_PDF_FEATURE_KEY = 'premium-sukuyo-report';
  var PREMIUM_SUKUYO_REPORT_REASON = '숙요점 프리미엄 PDF 리포트 생성';
  var _reportMode = 'personal';
  var _totalChapters = COMPAT_CHAPTER_META.length;
  var _reportId = '';
  var _canonicalSukuyoCompatibility = null;
  var _chapterMetaRuntime = Array(_totalChapters).fill(null);
  var _sukuyoPaymentContext = null;
  var _executionHeartbeatTimer = null;
  var _executionPayload = null;

  function _clearExecutionHeartbeat() {
    if (!_executionHeartbeatTimer) return;
    clearInterval(_executionHeartbeatTimer);
    _executionHeartbeatTimer = null;
  }

  function _buildExecutionPayload() {
    var ctx = _sukuyoPaymentContext && typeof _sukuyoPaymentContext === 'object' ? _sukuyoPaymentContext : null;
    var sourceTransactionId = String(ctx && (ctx.transactionId || ctx.sourceTransactionId) || '').trim();
    if (!sourceTransactionId) return null;
    var reportId = String(_reportId || '').trim();
    if (!reportId) reportId = Date.now().toString(36);
    return {
      serviceKey: 'sukuyo-book-pdf',
      featureKey: SUKUYO_PDF_FEATURE_KEY,
      executionKey: 'sukuyo-book-pdf:' + reportId + ':' + sourceTransactionId,
      sourceTransactionId: sourceTransactionId,
      metadata: {
        mode: String(_reportMode || 'personal'),
        reportId: reportId
      }
    };
  }

  function _requestExecutionAction(action, body, useKeepalive) {
    if (!body || !body.executionKey || !body.sourceTransactionId) return Promise.resolve(false);
    return fetch('/api/billing/executions/' + String(action || '').trim(), {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: !!useKeepalive
    }).then(function (res) {
      return !!(res && res.ok);
    }).catch(function () {
      return false;
    });
  }

  function _startExecutionLifecycle() {
    var payload = _buildExecutionPayload();
    if (!payload) {
      _executionPayload = null;
      _clearExecutionHeartbeat();
      return Promise.resolve(false);
    }
    return _requestExecutionAction('start', payload, false).then(function (ok) {
      if (!ok) return false;
      _executionPayload = payload;
      _clearExecutionHeartbeat();
      _executionHeartbeatTimer = setInterval(function () {
        if (!_executionPayload) return;
        _requestExecutionAction('heartbeat', _executionPayload, false).catch(function () {});
      }, 20000);
      return true;
    });
  }

  function _completeExecutionLifecycle() {
    if (!_executionPayload) return Promise.resolve(false);
    var payload = _executionPayload;
    _clearExecutionHeartbeat();
    _executionPayload = null;
    return _requestExecutionAction('complete', payload, false);
  }

  function _failExecutionLifecycle(reason, useKeepalive) {
    if (!_executionPayload) return Promise.resolve(false);
    var payload = Object.assign({}, _executionPayload, {
      reason: String(reason || 'generation_failed').trim() || 'generation_failed'
    });
    _clearExecutionHeartbeat();
    _executionPayload = null;
    return _requestExecutionAction('fail', payload, useKeepalive === true);
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', function () {
      if (!_executionPayload) return;
      _failExecutionLifecycle('client_unload', true).catch(function () {});
    });
  }

  function _qs(id) { return document.getElementById(id); }

  function _getActiveChapterMeta() {
    return _reportMode === 'compatibility' ? COMPAT_CHAPTER_META : PERSONAL_CHAPTER_META;
  }

  function _getActiveLoadingMessages() {
    return _reportMode === 'compatibility' ? COMPAT_LOADING_MSGS : PERSONAL_LOADING_MSGS;
  }

  function _getReportDisplayTitle() {
    return _reportMode === 'compatibility' ? '숙요점 프리미엄 2인 궁합 리포트' : '숙요점 프리미엄 인생 리포트';
  }

  function _getChapterMetaAt(idx) {
    var fallback = _getActiveChapterMeta();
    var runtime = _chapterMetaRuntime[idx];
    return runtime || fallback[idx] || { title: 'Chapter ' + (idx + 1), subtitle: '' };
  }

  function _resetChapterState() {
    _totalChapters = _getActiveChapterMeta().length;
    _chapters = Array(_totalChapters).fill(null);
    _chapterMetaRuntime = Array(_totalChapters).fill(null);
    _reportId = '';
    _canonicalSukuyoCompatibility = null;
    _sukuyoPaymentContext = null;
  }

  function _syncReportModeSelector(mode) {
    var off = document.getElementById('skCompatOff');
    var on = document.getElementById('skCompatOn');
    if (off) off.checked = mode !== 'compatibility';
    if (on) on.checked = mode === 'compatibility';
  }

  function _buildApiCandidates(pathname) {
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

  function _resolveApiUrl(input) {
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

  function _postPremiumAuthFallback(pathname, payload) {
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;

    var endpoints = _buildApiCandidates(pathname).map(function (u) { return _resolveApiUrl(u) || u; });
    return new Promise(function (resolve) {
      function run(at) {
        if (at >= endpoints.length) {
          resolve({ ok: false, code: 'PREMIUM_AUTH_FALLBACK_FAILED', message: '프리미엄 인증 API 호출에 실패했습니다.' });
          return;
        }
        fetch(endpoints[at], {
          method: 'POST',
          headers: headers,
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify(payload || {}),
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            var merged = data && typeof data === 'object' ? data : {};
            if (res.ok) {
              if (merged.ok == null) merged.ok = true;
              resolve(merged);
              return;
            }
            if (merged.ok == null) merged.ok = false;
            if (merged.status == null) merged.status = res.status;
            resolve(merged);
          });
        }).catch(function () {
          run(at + 1);
        });
      }
      run(0);
    });
  }

  function _premiumAuthJson(pathname, body, options) {
    var targetPath = _resolveApiUrl(pathname) || pathname;
    if (typeof window.__cdPremiumAuthJson === 'function') {
      return window.__cdPremiumAuthJson(targetPath, body || {}, options || {}).catch(function (error) {
        try {
          console.warn('[숙요 프리미엄 PDF] 인증 헬퍼 fallback:', error && error.message || error);
        } catch (_) {}
        return _postPremiumAuthFallback(pathname, body || {});
      });
    }
    return _postPremiumAuthFallback(pathname, body || {});
  }

  function _logSukuyoBookStage(stage, extra) {
    try {
      console.info('[SukuyoBook] ' + String(stage || 'UNKNOWN_STAGE'), extra || {});
    } catch (_) {}
  }

  function _buildSukuyoPremiumPreparePayload(profile, partner, reportMode, reportId) {
    var p = profile || {};
    var b = p.birth || {};
    var selectedMode = String(reportMode || 'personal').toLowerCase() === 'compatibility' ? 'compatibility' : 'personal';
    var lunarHint = _resolveExistingLunarHint(p);
    var profileId = String(p.profileId || p.id || '').trim();
    var location = p.location || {};
    var calendarType = String(b.calType || b.calendarType || 'solar').trim().toLowerCase();
    var birthDate = [
      Number(b.year || 0),
      String(Number(b.month || 0)).padStart(2, '0'),
      String(Number(b.day || 0)).padStart(2, '0')
    ].join('-');
    var birthTime = String(Number.isFinite(Number(b.hour)) ? Number(b.hour) : 12).padStart(2, '0')
      + ':' + String(Number.isFinite(Number(b.minute)) ? Number(b.minute) : 0).padStart(2, '0');
    var timeUnknown = !!(b.timeUnknown || b.birthTimeUnknown || b.unknownTime);
    var isLunar = calendarType === 'lunar' || calendarType === 'lunar_leap';
    var safePartner = partner || {};

    return {
      year: b.year,
      month: b.month,
      day: b.day,
      hour: b.hour !== undefined ? b.hour : 12,
      chapter: 1,
      name: p.name || '사용자',
      gender: p.gender || undefined,
      profileId: profileId || undefined,
      birthDate: birthDate,
      birthTime: birthTime,
      calType: calendarType,
      calendarType: calendarType,
      isLunar: isLunar,
      timeUnknown: timeUnknown,
      timezoneName: String(location.tz || 'Asia/Seoul'),
      timezone: String(location.tz || 'Asia/Seoul'),
      lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
      lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780),
      reportId: reportId || undefined,
      reportType: selectedMode,
      reportMode: selectedMode,
      includeCompatibility: selectedMode === 'compatibility',
      payment: _sukuyoPaymentContext || undefined,
      lunarMonth: lunarHint ? lunarHint.lunarMonth : undefined,
      lunarDay: lunarHint ? lunarHint.lunarDay : undefined,
      isLeap: lunarHint ? lunarHint.isLeap : undefined,
      partnerName: safePartner.name || undefined,
      partnerYear: safePartner.year || undefined,
      partnerMonth: safePartner.month || undefined,
      partnerDay: safePartner.day || undefined,
      partnerHour: safePartner.hour !== null ? safePartner.hour : undefined,
      partnerMinute: safePartner.minute !== null ? safePartner.minute : undefined,
      partnerGender: safePartner.gender || undefined,
      partnerCalType: safePartner.calType || undefined,
      _premiumStrictPayload: true,
      _premiumStrictValidation: true,
      _premiumFailOpen: false
    };
  }

  function ensureSukuyoPremiumReportValidation(options) {
    var opts = options || {};
    var profile = opts.profile || {};
    var partner = opts.partner || {};
    var reportMode = opts.reportMode || 'personal';
    var reportId = opts.reportId || '';
    var payload = _buildSukuyoPremiumPreparePayload(profile, partner, reportMode, reportId);

    _logSukuyoBookStage('INPUT_NORMALIZE_START', { mode: reportMode });
    _logSukuyoBookStage('PAYLOAD_NORMALIZE_START', { mode: reportMode });

    return _premiumAuthJson('/api/premium-report/prepare', {
      featureType: 'sookyo_premium',
      reportType: 'sookyoPremium',
      preflightOnly: true,
      requestBody: payload,
    }).then(function (prepared) {
      if (prepared && prepared.ok) {
        _logSukuyoBookStage('INPUT_NORMALIZE_SUCCESS', { mode: reportMode });
        _logSukuyoBookStage('PAYLOAD_NORMALIZE_SUCCESS', {
          mode: reportMode,
          chapterCount: Number(prepared.totalChapters || 0),
        });
        return prepared;
      }
      return prepared || { ok: false, message: '입력 검증에 실패했습니다.' };
    }).catch(function () {
      return { ok: false, message: '입력 검증에 실패했습니다.' };
    });
  }

  function _isSukuyoTextBanned(text) {
    var src = String(text || '').toLowerCase();
    if (!src) return true;
    var banned = [
      '자동 복구 생성',
      'chapter 1',
      '기본 해석',
      '데이터가 부족합니다',
      'gemini api',
      'stack trace',
      'raw json',
      'payload'
    ];
    for (var i = 0; i < banned.length; i++) {
      if (src.indexOf(String(banned[i]).toLowerCase()) >= 0) return true;
    }
    return false;
  }

  function _sanitizeSukuyoChapterText(text, chapterIndex) {
    var normalized = String(text || '').trim();
    if (!normalized) return '';
    var meta = _getChapterMetaAt(Number(chapterIndex || 0));
    normalized = normalized.replace(/^#\s*Chapter\s*\d+\b.*$/im, '# ' + String(meta.title || '').trim());
    normalized = normalized.replace(/^#\s*Chapter\s*[ivx]+\b.*$/im, '# ' + String(meta.title || '').trim());
    return normalized.trim();
  }

  function _syncUserPoints(payload) {
    try {
      var points = Number(payload && (payload.remainingPoints != null ? payload.remainingPoints : (payload.user && payload.user.points)));
      if (!isFinite(points)) return;
      var raw = localStorage.getItem('fortune_auth_user');
      if (!raw) return;
      var user = JSON.parse(raw);
      user.points = points;
      localStorage.setItem('fortune_auth_user', JSON.stringify(user));
      if (typeof window.__cdSetGoldenBalance === 'function') window.__cdSetGoldenBalance(points);
    } catch (_) {}
  }

  function _readSukuyoPremiumAccessToken() {
    try { var t = window.__cdPremiumSukuyoAccessToken; if (t) return String(t); } catch (_) {}
    try { var t2 = sessionStorage.getItem('cd_premium_token_sukuyo'); if (t2) return String(t2); } catch (_) {}
    return '';
  }

  function _persistSukuyoPremiumAccessToken(token) {
    if (!token) return;
    try { window.__cdPremiumSukuyoAccessToken = String(token); } catch (_) {}
    try { sessionStorage.setItem('cd_premium_token_sukuyo', String(token)); } catch (_) {}
  }

  function _ensureBaseSukuyoCoinGate() {
    try {
      var existing = sessionStorage.getItem(PREMIUM_SUKUYO_TX_KEY);
      var existingToken = _readSukuyoPremiumAccessToken();
      if (existing || existingToken) return Promise.resolve({ ok: true, alreadyCharged: true, premiumAccessToken: existingToken });
    } catch (_) {}

    var reportLabel = _reportMode === 'compatibility' ? '숙요점 궁합 인생 총람' : '숙요점 인생 총람';
    if (!window.confirm('🪙 ' + reportLabel + ' 생성\n이용 시 ' + PREMIUM_SUKUYO_COST + '코인이 차감됩니다.\n지금 생성하시겠습니까?')) {
      return Promise.resolve({ ok: false, cancelled: true, message: '생성이 취소되었습니다.' });
    }

    var requestId = 'premium-sukuyo:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;

    function _doGateRequest(reqId) {
      return fetch(_resolveApiUrl('/api/billing/coin-gate'), {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          featureKey: PREMIUM_SUKUYO_REPORT_FEATURE_KEY,
          reason: PREMIUM_SUKUYO_REPORT_REASON,
          forceDeduct: true,
          requestId: reqId
        })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (raw) {
          return { ok: res.ok, status: res.status, raw: raw };
        });
      });
    }

    return _doGateRequest(requestId).then(function (result) {
      if (!result.ok && (Number(result.status || 0) >= 500 || Number(result.status || 0) === 0)) {
        return _doGateRequest(requestId);
      }
      return result;
    }).then(function (result) {
      var raw = result.raw || {};
      var innerData = (raw.data && typeof raw.data === 'object') ? raw.data : raw;
      var code = String((innerData.code || raw.code || '')).toUpperCase();
      var status = Number(result.status || 0);
      if (!result.ok || raw.ok === false) {
        if (status === 401 || status === 403) {
          if (typeof window.__cdOpenLoginRequiredModal === 'function') window.__cdOpenLoginRequiredModal({ reason: '숙요 프리미엄 리포트 결제를 위해 로그인이 필요합니다.' });
          else if (typeof window.openLoginModal === 'function') window.openLoginModal();
          return { ok: false, message: '로그인이 필요합니다.' };
        }
        if (status === 402 || code === 'INSUFFICIENT_COINS' || code === 'COIN_SHORTAGE' || code === 'NOT_ENOUGH_COINS') {
          if (typeof window.openCoinChargeModal === 'function') window.openCoinChargeModal();
          return { ok: false, message: String(innerData.message || raw.message || '코인이 부족합니다. 충전 후 다시 시도해 주세요.') };
        }
        return { ok: false, message: String(innerData.message || raw.message || '코인 차감에 실패했습니다.') };
      }
      _syncUserPoints(innerData);
      var premiumAccessToken = String(
        (innerData.premiumAccessToken) ||
        (innerData.consume && innerData.consume.premiumAccessToken) ||
        (raw.premiumAccessToken) || ''
      ).trim();
      _persistSukuyoPremiumAccessToken(premiumAccessToken);
      var transactionId = String(
        (innerData.consume && innerData.consume.transactionId) ||
        innerData.transactionId || raw.transactionId || ''
      ).trim();
      var receiptId = String(
        (innerData.consume && innerData.consume.receiptId) ||
        innerData.receiptId || raw.receiptId || ''
      ).trim();
      var orderId = String(
        (innerData.consume && innerData.consume.orderId) ||
        innerData.orderId || raw.orderId || ''
      ).trim();
      if (transactionId) {
        try { sessionStorage.setItem(PREMIUM_SUKUYO_TX_KEY, transactionId); } catch (_) {}
      }
      _sukuyoPaymentContext = {
        featureKey: SUKUYO_PDF_FEATURE_KEY,
        transactionId: transactionId || undefined,
        receiptId: receiptId || undefined,
        orderId: orderId || undefined,
      };
      return {
        ok: true,
        premiumAccessToken: premiumAccessToken,
        transactionId: transactionId,
        receiptId: receiptId,
        orderId: orderId,
        featureKey: SUKUYO_PDF_FEATURE_KEY,
      };
    }).catch(function (err) {
      console.error('[숙요 프리미엄 PDF][coin-gate] 오류:', err);
      return { ok: false, message: '코인 차감 중 오류가 발생했습니다.' };
    });
  }

  function _getReportMode() {
    var on = document.getElementById('skCompatOn');
    if (on && on.checked) return 'compatibility';
    return 'personal';
  }

  function _applyReportModeUi() {
    var partnerBox = document.getElementById('skPartnerFormSection');
    var startBtn = document.getElementById('skStartBtn');
    var mode = _getReportMode();
    var previousMode = _reportMode;
    _reportMode = mode;
    _totalChapters = _getActiveChapterMeta().length;
    if (partnerBox) partnerBox.style.display = mode === 'compatibility' ? '' : 'none';
    if (startBtn) {
      startBtn.textContent = mode === 'compatibility'
        ? '💞 숙요 궁합 인생 총람 생성하기 (690코인)'
        : '🌙 숙요 인생 총람 생성하기 (390코인)';
    }
    if (previousMode !== _reportMode) {
      _renderDetailedChapterPreview();
      _renderToc();
    }
  }

  function _ensureReportModeSelector() {
    var host = document.getElementById('skStartScreen');
    if (!host || document.getElementById('skReportModeBox')) {
      _applyReportModeUi();
      return;
    }
    var profileBox = host.querySelector('.lb-start__profile-box');
    var modeBox = document.createElement('div');
    modeBox.id = 'skReportModeBox';
    modeBox.className = 'lb-start__profile-box';
    modeBox.style.marginTop = '12px';
    modeBox.innerHTML = ''+
      '<div class="lb-start__profile-label">🧭 리포트 모드</div>'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;padding-top:4px;color:#e0f2fe;">'+
        '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" id="skCompatOff" name="skReportMode" checked> <span>개인 리포트</span></label>'+
        '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" id="skCompatOn" name="skReportMode"> <span>2인 궁합 리포트</span></label>'+
      '</div>';
    if (profileBox && profileBox.parentNode) profileBox.parentNode.insertBefore(modeBox, profileBox.nextSibling);
    else host.insertBefore(modeBox, host.firstChild);
    var off = document.getElementById('skCompatOff');
    var on = document.getElementById('skCompatOn');
    if (off && !off._skBound) {
      off._skBound = true;
      off.addEventListener('change', _applyReportModeUi);
    }
    if (on && !on._skBound) {
      on._skBound = true;
      on.addEventListener('change', _applyReportModeUi);
    }
    _applyReportModeUi();
  }

  function _ensureCompatibilitySurchargeIfNeeded(profile, partner) {
    if (_reportMode !== 'compatibility') return Promise.resolve({ ok: true, skipped: true });
    if (!partner || !partner.year || !partner.month || !partner.day) {
      return Promise.resolve({ ok: false, message: '궁합 모드에서는 상대방 생년월일이 필요합니다.' });
    }
    try {
      var existing = sessionStorage.getItem(PREMIUM_SUKUYO_COMPAT_TX_KEY);
      if (existing) return Promise.resolve({ ok: true, alreadyCharged: true });
    } catch (_) {}

    var requestId = [
      'premium-sukuyo-compat-extra',
      (profile && profile.birth ? [profile.birth.year, profile.birth.month, profile.birth.day].join('-') : 'na'),
      [partner.year, partner.month, partner.day].join('-')
    ].join(':');
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
    var consumeHeaders = { 'Content-Type': 'application/json' };
    if (token) consumeHeaders.Authorization = 'Bearer ' + token;

    var endpoints = _buildApiCandidates('/api/fortune/pig-coin/consume');
    return new Promise(function (resolve) {
      function run(at) {
        if (at >= endpoints.length) {
          resolve({ ok: false, message: '궁합 추가 코인 차감 API 호출에 실패했습니다.' });
          return;
        }
        fetch(endpoints[at], {
          method: 'POST',
          headers: consumeHeaders,
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({
            cost: PREMIUM_SUKUYO_COMPAT_EXTRA_COST,
            reason: '숙요점 궁합 확장 분석 추가',
            featureKey: PREMIUM_SUKUYO_COMPAT_FEATURE_KEY,
            forceDeduct: true,
            requestId: requestId,
            inputHash: requestId,
            reportJobId: requestId
          })
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) {
              resolve({ ok: false, message: String((data && data.message) || ('HTTP ' + res.status)) });
              return;
            }
            _syncUserPoints(data);
            try {
              if (data && data.transactionId) sessionStorage.setItem(PREMIUM_SUKUYO_COMPAT_TX_KEY, String(data.transactionId));
            } catch (_) {}
            resolve({ ok: true, data: data });
          });
        }).catch(function () {
          run(at + 1);
        });
      }
      run(0);
    });
  }

  function _autoRefundPremium(cost, featureKey, label, txStorageKey) {
    var reasonText = String(label || '');
    if (!/LOCAL_REPORT_FAILED|로컬\s*리포트\s*실패|SUKUYO_LOCAL_CALCULATION_FAILED/i.test(reasonText)) {
      return Promise.resolve(false);
    }
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
    var refundHeaders = {
      'Content-Type': 'application/json',
    };
    if (token) refundHeaders.Authorization = 'Bearer ' + token;

    var sourceTransactionId = '';
    try { sourceTransactionId = sessionStorage.getItem(txStorageKey) || ''; } catch (_) {}
    var requestId = 'premium-refund:' + featureKey + ':' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

    return fetch('/api/fortune/pig-coin/refund', {
      method: 'POST',
      headers: refundHeaders,
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({
        cost: cost,
        featureKey: featureKey,
        sourceTransactionId: sourceTransactionId || undefined,
        requestId: requestId,
        reason: label + ' 생성 실패 자동 환급',
      }),
    })
    .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (payload) {
      if (!payload.ok && !payload.data?.alreadyRefunded) return false;
      var pts = Number(payload.data?.user?.points);
      if (isFinite(pts)) {
        try {
          var user = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null') || {};
          user.points = pts;
          localStorage.setItem('fortune_auth_user', JSON.stringify(user));
        } catch (_) {}
        if (typeof window.__cdSetGoldenBalance === 'function') window.__cdSetGoldenBalance(pts);
      }
      try { sessionStorage.removeItem(txStorageKey); } catch (_) {}
      return true;
    })
    .catch(function () { return false; });
  }

  function _formatPremiumFailureMessage(data, fallback) {
    var status = Number((data && data.status) || 0);
    var code = String((data && data.code) || '').toUpperCase();
    if (status === 400 || code === 'SUKYO_INPUT_REQUIRED') {
      return '숙요점 계산에 필요한 출생 정보가 부족합니다. 생년월일/달력 기준을 다시 확인해 주세요.';
    }
    if (status === 401 || code === 'AUTH_REQUIRED' || code === 'UNAUTHORIZED') {
      return '로그인이 필요하거나 세션이 만료되었습니다. 다시 로그인 후 시도해 주세요.';
    }
    if (status === 402 || status === 403 || code === 'INSUFFICIENT_COINS' || code === 'COIN_SHORTAGE') {
      return '코인/결제 상태 확인에 실패했습니다. 결제 상태를 확인한 뒤 다시 시도해 주세요.';
    }
    if (status === 422 || code === 'SUKYO_REPORT_PAYLOAD_INCOMPLETE' || code === 'SUKYO_CHAPTER_SOURCE_INCOMPLETE') {
      return '숙요점 차트 데이터 생성에 실패했습니다. 코인은 차감되지 않았거나 자동 환급됩니다.';
    }
    if (status === 502 || code === 'SUKYO_CHAPTER_GENERATION_FAILED' || code === 'SUKYO_FORBIDDEN_CONTENT_DETECTED') {
      return 'PDF 본문 생성 중 일부 챕터가 실패했습니다. 자동 복구 본문은 허용되지 않아 생성을 중단했습니다. 다시 시도해 주세요.';
    }
    if (status === 500) {
      return 'PDF 렌더링 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    var base = (data && (data.message || data.error)) ? String(data.message || data.error) : String(fallback || '요청에 실패했습니다.');
    var missing = (data && Array.isArray(data.missingFields)) ? data.missingFields : [];
    if (missing.length) base += '\n누락 필드: ' + missing.slice(0, 5).join(', ');
    return base;
  }

  function _applySukuyoTheme(modal) {
    if (!modal || !modal.style) return;
    modal.style.setProperty('--lb-void', '#020b16');
    modal.style.setProperty('--lb-deep', '#031226');
    modal.style.setProperty('--lb-dark', '#0a1b35');
    modal.style.setProperty('--lb-surface', '#102848');
    modal.style.setProperty('--lb-border-bright', 'rgba(125, 211, 252, 0.5)');
    modal.style.setProperty('--lb-gold', '#67e8f9');
    modal.style.setProperty('--lb-gold-dim', 'rgba(103, 232, 249, 0.64)');
    modal.style.setProperty('--lb-amethyst', '#38bdf8');
    modal.style.setProperty('--lb-violet', '#0ea5e9');
    modal.style.setProperty('--lb-lilac', '#bae6fd');
    modal.style.setProperty('--lb-glow-violet', 'rgba(14, 165, 233, 0.45)');
    modal.style.setProperty('--lb-glow-gold', 'rgba(103, 232, 249, 0.36)');
  }

  function _escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _md2html(text) {
    if (!text) return '';
    var h = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    h = h.replace(/^&gt; (.+)$/gm,'<blockquote class="zb-md-blockquote">$1</blockquote>');
    h = h.replace(/<\/blockquote>\n<blockquote class="zb-md-blockquote">/g,'<br>');
    h = h.replace(/^#### (.+)$/gm,'<h4 class="zb-md-h4">$1</h4>');
    h = h.replace(/^### (.+)$/gm,'<h3 class="zb-md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm,'<h2 class="zb-md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm,'<h1 class="zb-md-h1">$1</h1>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g,'<em>$1</em>');
    h = h.replace(/^---+$/gm,'<hr class="zb-md-hr">');
    h = h.replace(/^[*-] (.+)$/gm,'<li class="zb-md-li">$1</li>');
    h = h.replace(/(<li[\s\S]*?<\/li>(\n|$))+/g,function(m){return '<ul class="zb-md-ul">'+m+'</ul>';});
    h = h.replace(/^\d+\. (.+)$/gm,'<li class="zb-md-li zb-md-oli">$1</li>');
    h = h.replace(/\n\n+/g,'\n\n');
    var lines=h.split('\n'), result=[];
    for (var i=0;i<lines.length;i++) {
      var line=lines[i].trim();
      if (!line){result.push('');continue;}
      if (/^<(h[1-4]|ul|li|hr|blockquote)/.test(line)||/<\/(h[1-4]|ul|li|hr|blockquote)>$/.test(line)) result.push(line);
      else result.push('<p class="zb-md-p">'+line+'</p>');
    }
    return result.join('\n');
  }

  function _getActiveBirthProfile() {
    var p=window.__cdActiveBirthProfile;
    if (p&&p.birth&&p.birth.year) return p;
    var snap=window.__destinyFlowerSajuSnapshot;
    if (snap&&snap.birth&&snap.birth.year) return snap;
    try {
      var ns='FORTUNE_APP_USER_PROFILES';
      var list=JSON.parse(localStorage.getItem(ns+'.list')||'[]');
      var currId=localStorage.getItem(ns+'.current');
      var match=(currId&&list.find(function(p2){return p2.id===currId;}))||(list.length&&list[0])||null;
      if (match&&match.birth&&match.birth.year) return match;
    } catch(_){}
    try {
      var dateEl=document.getElementById('birthDate');
      if (dateEl&&dateEl.value) {
        var parts=dateEl.value.split('-');
        if (parts.length>=3) {
          var y=Number(parts[0]),m=Number(parts[1]),d=Number(parts[2]);
          if (y&&m&&d) {
            var nameEl=document.getElementById('nameInput');
            var isFemale=document.querySelector('#btnF.on')!==null;
            var hourEl=document.getElementById('birthHour');
            return {name:(nameEl&&nameEl.value.trim())||'사용자',gender:isFemale?'F':'M',birth:{year:y,month:m,day:d,hour:hourEl?Number(hourEl.value):12,minute:0}};
          }
        }
      }
    } catch(_){}
    return null;
  }

  function _resolveExistingLunarHint(profile) {
    var p = profile || {};
    var b = p.birth || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var sameBirth = !!(snap && snap.birth && b &&
      Number(snap.birth.year) === Number(b.year) &&
      Number(snap.birth.month) === Number(b.month) &&
      Number(snap.birth.day) === Number(b.day));
    if (!sameBirth) return null;

    var lm = Number(snap.lunarMonth);
    var ld = Number(snap.lunarDay);
    if (!Number.isFinite(lm) || !Number.isFinite(ld)) return null;
    return {
      lunarMonth: lm,
      lunarDay: ld,
      isLeap: !!snap.isLeap,
    };
  }

  var _SK_STORE_VER='sk_v1_';
  function _skMakeKey(p){var b=(p&&p.birth)||{};return _SK_STORE_VER+(b.year||'0')+'_'+(b.month||'0')+'_'+(b.day||'0')+'_'+((p&&p.gender)||'u');}
  function _skSaveResult(p){try{sessionStorage.setItem(_skMakeKey(p),JSON.stringify({chapters:_chapters,chart:_sukuyoChart,name:(p&&p.name)||'사용자',birth:(p&&p.birth)||{},gender:(p&&p.gender)||'',reportMode:_reportMode,totalChapters:_totalChapters,reportId:_reportId||'',canonicalSukuyoCompatibility:_canonicalSukuyoCompatibility||null,chapterMetaRuntime:_chapterMetaRuntime||[],savedAt:new Date().toISOString()}));}catch(_){} }
  function _skLoadSaved(p){try{var raw=sessionStorage.getItem(_skMakeKey(p));return raw?JSON.parse(raw):null;}catch(_){return null;}}

  function _showScreen(id){
    var screens=['skNoProfileScreen','skStartScreen','skLoadingScreen','skResultScreen','skErrorScreen'];
    for(var i=0;i<screens.length;i++){var el=_qs(screens[i]);if(el)el.style.display=(screens[i]===id)?'':'none';}
  }

  function _ensurePremiumCinematicStyles(){
    if(document.getElementById('cdPremiumLoadingCinematicStyles'))return;
    var style=document.createElement('style');
    style.id='cdPremiumLoadingCinematicStyles';
    style.textContent=
      '.lb-loading--cinematic{position:relative;overflow:hidden;--cd-glow-a:#7c3aed;--cd-glow-b:#4338ca;--cd-ring:rgba(129,140,248,0.45);}' +
      '.lb-loading--cinematic::before{content:"";position:absolute;inset:-20% -10% auto -10%;height:65%;background:radial-gradient(circle at center,var(--cd-ring),transparent 68%);pointer-events:none;opacity:.85;filter:blur(2px);}' +
      '.lb-loading--cinematic .lb-loading__symbol{position:relative;display:inline-flex;align-items:center;justify-content:center;width:86px;height:86px;border-radius:999px;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.35),transparent 40%),linear-gradient(135deg,var(--cd-glow-a),var(--cd-glow-b));box-shadow:0 14px 40px rgba(15,23,42,.45),0 0 34px var(--cd-ring);animation:cd-premium-orb-pulse 2.8s ease-in-out infinite;}' +
      '.lb-loading--cinematic .lb-loading__symbol::before,.lb-loading--cinematic .lb-loading__symbol::after{content:"";position:absolute;inset:-10px;border-radius:999px;border:1px solid var(--cd-ring);}' +
      '.lb-loading--cinematic .lb-loading__symbol::before{animation:cd-premium-ring-spin 7.2s linear infinite;}' +
      '.lb-loading--cinematic .lb-loading__symbol::after{inset:-16px;border-style:dashed;opacity:.7;animation:cd-premium-ring-spin 10.5s linear infinite reverse;}' +
      '.lb-loading--cinematic .lb-progress__bar{background:linear-gradient(90deg,var(--cd-glow-a),#f8fafc,var(--cd-glow-b));background-size:200% 100%;animation:cd-premium-bar-shimmer 2.4s linear infinite;}' +
      '.lb-loading--cinematic .lb-loading__chapter{animation:cd-premium-float 1.8s ease-in-out infinite;}' +
      '@keyframes cd-premium-orb-pulse{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2px) scale(1.04)}}' +
      '@keyframes cd-premium-ring-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
      '@keyframes cd-premium-bar-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}' +
      '@keyframes cd-premium-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}';
    document.head.appendChild(style);
  }

  function _activateCinematicLoading(screenId,glowA,glowB,ring){
    _ensurePremiumCinematicStyles();
    var screen=_qs(screenId);
    if(!screen)return;
    screen.classList.add('lb-loading--cinematic');
    if(glowA)screen.style.setProperty('--cd-glow-a',glowA);
    if(glowB)screen.style.setProperty('--cd-glow-b',glowB);
    if(ring)screen.style.setProperty('--cd-ring',ring);
  }

  function _renderDetailedChapterPreview(){
    var start=document.getElementById('skStartScreen');
    if(!start)return;
    var chapterMeta=_getActiveChapterMeta();
    var wrap=start.querySelector('.lb-start__chapters');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='lb-start__chapters';
      wrap.innerHTML=
        '<div class="lb-start__ch-label">📖 '+chapterMeta.length+'챕터 구성</div>'+
        '<ul class="lb-start__ch-list" id="skChapterPreviewList"></ul>';
      var anchor=start.querySelector('.lb-start__note');
      if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(wrap,anchor.nextSibling);
      else start.appendChild(wrap);
    }
    var labelEl = wrap.querySelector('.lb-start__ch-label');
    if (labelEl) labelEl.textContent = '📖 ' + chapterMeta.length + '챕터 구성';
    var list=document.getElementById('skChapterPreviewList')||wrap.querySelector('.lb-start__ch-list');
    if(!list)return;
    var html='';
    for(var i=0;i<chapterMeta.length;i++){
      var meta = chapterMeta[i] || { title: 'Chapter ' + (i + 1), subtitle: '' };
      html+='<li class="lb-start__ch-item lb-start__ch-item--detail">'+
        '<div class="lb-start__ch-head" style="display:flex;gap:8px;align-items:flex-start;">'+
          '<span class="lb-start__ch-num">Ch.'+(i+1)+'</span>'+
          '<span class="lb-start__ch-title">'+_escHtml(meta.title)+'</span>'+
        '</div>'+
        '<p class="lb-start__ch-sub" style="margin:6px 0 0 58px;font-size:0.85rem;line-height:1.55;color:#cffafe;">'+_escHtml(meta.subtitle||'')+'</p>'+
      '</li>';
    }
    list.innerHTML=html;
  }

  var SK_ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI'];

  function _renderToc(){
    var nav=document.getElementById('skToc');
    if(!nav)return;
    var existing = nav.querySelectorAll('[data-sk-chapter]');
    if(existing.length===_totalChapters && existing.length>0)return;
    var html='';
    for(var i=1;i<=_totalChapters;i++) html+='<button type="button" class="lb-toc-item sk-toc-item'+(i===1?' active':'')+'" data-sk-chapter="'+i+'">'+(SK_ROMAN[i-1]||String(i))+'</button>';
    nav.innerHTML=html;
  }

  function _bindToc(){
    var nav=document.getElementById('skToc');
    if(!nav)return;
    _renderToc();
    if(nav._skBound)return;
    nav._skBound=true;
    nav.addEventListener('click',function(e){
      var btn=e.target.closest('[data-sk-chapter]');
      if(!btn)return;
      var ch=Number(btn.getAttribute('data-sk-chapter'));
      if(!ch||!_chapters[ch-1])return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.sk-toc-item'),function(b){
        b.classList.toggle('active',b===btn);
        b.classList.toggle('loaded',!!_chapters[Number(b.getAttribute('data-sk-chapter'))-1]);
      });
    });
  }

  function _numOrText(v, suffix){
    var n=Number(v);
    if(!isFinite(n)) return '정보 없음';
    var rounded=Math.round(n*10)/10;
    return String(rounded)+(suffix||'');
  }

  function _renderSukuyoChartCard(chart){
    if(!chart||!chart.core) return '';
    var core=chart.core||{};
    var phase=chart.moonPhase||{};
    var rel=chart.relation||{};
    var wheel=Array.isArray(chart.wheel)?chart.wheel:[];
    var chips='';
    for(var i=0;i<wheel.length;i++){
      var node=wheel[i]||{};
      var isPrimary=!!node.isPrimary;
      var isPartner=!!node.isPartner;
      var bg=isPrimary?'rgba(56,189,248,0.35)':(isPartner?'rgba(186,230,253,0.3)':'rgba(8,47,73,0.44)');
      var border=isPrimary?'rgba(125,211,252,0.9)':(isPartner?'rgba(186,230,253,0.8)':'rgba(125,211,252,0.24)');
      chips+='<span style="display:inline-flex;align-items:center;gap:3px;padding:4px 8px;border-radius:999px;background:'+bg+';border:1px solid '+border+';font-size:11px;color:#ecfeff;">'+
        '<strong style="font-weight:700;">'+_escHtml(String(node.mansion||'?'))+'</strong>'+
        '<span style="opacity:0.85">'+_escHtml(String(node.mansionCh||''))+'</span>'+
      '</span>';
    }
    return '<section style="margin:0 0 16px;padding:14px 14px 12px;border-radius:14px;border:1px solid rgba(125,211,252,0.34);background:linear-gradient(135deg,rgba(2,6,23,0.76),rgba(8,47,73,0.7));">'+
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">'+
        '<div><p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;color:#bae6fd;text-transform:uppercase;">SUKUYO ORIENTAL CHART</p><h3 style="margin:0;font-size:16px;color:#e0f2fe;">'+_escHtml(String(core.primaryMansion||'본명숙 정보 없음'))+'</h3></div>'+
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:6px 10px;font-size:12px;color:#e0f2fe;">'+
          '<span>방위: <strong>'+_escHtml(String(core.primaryDirection||'정보 없음'))+'</strong></span>'+
          '<span>오행: <strong>'+_escHtml(String(core.primaryElement||'정보 없음'))+'</strong></span>'+
          '<span>월상: <strong>'+_escHtml(String(phase.label||'정보 없음'))+'</strong></span>'+
          '<span>삭망각: <strong>'+_escHtml(_numOrText(phase.phaseAngle,'도'))+'</strong></span>'+
          '<span>조도: <strong>'+_escHtml(_numOrText(phase.illumination,'%'))+'</strong></span>'+
          '<span>관계축: <strong>'+_escHtml(String(rel.label||'개인 리포트'))+'</strong></span>'+
        '</div>'+
      '</div>'+
      '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(125,211,252,0.35);display:flex;flex-wrap:wrap;gap:6px;">'+chips+'</div>'+
    '</section>';
  }

  function _renderChapter(ch){
    var content=_qs('skChapterContent');
    if(!content)return;
    var idx=ch-1, data=_chapters[idx];
    if(!data){content.innerHTML='<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';return;}
    var chapterMeta = _getChapterMetaAt(idx);
    var chartHtml=(ch===1)?_renderSukuyoChartCard(_sukuyoChart):'';
    content.innerHTML='<div class="zb-chapter-wrap"><div class="zb-chapter-header"><span class="zb-chapter-num">Chapter '+ch+'</span><h2 class="zb-chapter-title">'+_escHtml(chapterMeta.title)+'</h2><p class="zb-chapter-sub">'+_escHtml(chapterMeta.subtitle||'')+'</p></div>'+chartHtml+'<div class="zb-chapter-body">'+_md2html(data)+'</div></div>';
    content.scrollTop=0;
  }

  function _updateTocState(){
    _renderToc();
    Array.prototype.forEach.call(document.querySelectorAll('#skToc .sk-toc-item'),function(btn){
      var ch=Number(btn.getAttribute('data-sk-chapter'));
      btn.classList.toggle('loaded',!!_chapters[ch-1]);
      btn.classList.toggle('active',ch===1);
    });
  }

  window.openSukuyoBookModal = function(profileArg){
    // 로그인 세션 확인 — 비로그인(게스트) 상태에서는 서비스 진입 차단
    if (typeof window.__dpHasLoginSession === 'function' && !window.__dpHasLoginSession()) {
      if (typeof window.__cdOpenLoginRequiredModal === 'function') {
        window.__cdOpenLoginRequiredModal({ reason: 'login_required', redirectTo: window.location.pathname });
      }
      return;
    }
    var modal=_qs('sukuyoBookModal');
    if(!modal){console.error('[숙요점 프리미엄] sukuyoBookModal 요소를 찾을 수 없습니다.');return;}
    _applySukuyoTheme(modal);
    var _pvwEl=document.getElementById('tilePvwOverlay');if(_pvwEl){_pvwEl.classList.remove('pvw-open');_pvwEl.style.opacity='0';_pvwEl.style.pointerEvents='none';_pvwEl.style.visibility='hidden';setTimeout(function(){_pvwEl.style.opacity='';_pvwEl.style.pointerEvents='';_pvwEl.style.visibility='';},400);}
    if (profileArg && profileArg.birth && profileArg.birth.year) {
      try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
    }
    var profile=(profileArg && profileArg.birth && profileArg.birth.year) ? profileArg : _getActiveBirthProfile();
    if(!profile){
      modal.style.display='flex'; modal.style.zIndex='100120';
      document.body.style.overflow='hidden';
      document.body.classList.add('lb-modal-open');
      try{modal.setAttribute('aria-hidden','false');}catch(_){ }
      _showScreen('skNoProfileScreen');
      return;
    }
    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
    var saved=_skLoadSaved(profile);
    if(saved&&saved.chapters&&saved.chapters.some(Boolean)){
      _reportMode = (saved.reportMode === 'compatibility') ? 'compatibility' : 'personal';
      _syncReportModeSelector(_reportMode);
      _applyReportModeUi();
      _totalChapters = Number(saved.totalChapters) || _getActiveChapterMeta().length;
      _chapters=saved.chapters;
      if (_chapters.length !== _totalChapters) {
        _chapters = _chapters.slice(0, _totalChapters);
        while (_chapters.length < _totalChapters) _chapters.push(null);
      }
      _sukuyoChart=saved.chart||null;
      _reportId = String(saved.reportId || '');
      _canonicalSukuyoCompatibility = saved.canonicalSukuyoCompatibility || null;
      _chapterMetaRuntime = Array.isArray(saved.chapterMetaRuntime) ? saved.chapterMetaRuntime.slice(0, _totalChapters) : Array(_totalChapters).fill(null);
      while (_chapterMetaRuntime.length < _totalChapters) _chapterMetaRuntime.push(null);
      _currentChapter=1;
      _showScreen('skResultScreen');
      _updateTocState(); _renderChapter(1); _bindToc();
      var nameEl=_qs('skResultName'),dateEl=_qs('skResultDate');
      if(nameEl) nameEl.textContent='💫 '+(saved.name||'사용자')+'님의 '+_getReportDisplayTitle();
      if(dateEl){var b=saved.birth||{};var sd=saved.savedAt?new Date(saved.savedAt).toLocaleDateString('ko-KR'):'';dateEl.textContent=[b.year,b.month,b.day].filter(Boolean).join('.')+(sd?' · 💾 '+sd+' 저장':'');}
      modal.style.display='flex'; modal.style.zIndex='100120'; document.body.style.overflow='hidden';
      document.body.classList.add('lb-modal-open');
      try{modal.setAttribute('aria-hidden','false');}catch(_){}
      return;
    }
    _reportMode = _getReportMode();
    _resetChapterState();
    _sukuyoChart=null;
    _currentChapter=1;
    _showScreen('skStartScreen');
    _ensureReportModeSelector();
    modal.style.display='flex'; modal.style.zIndex='100120';
    document.body.style.overflow='hidden';
    document.body.classList.add('lb-modal-open');
    try{modal.setAttribute('aria-hidden','false');var cb=modal.querySelector('.lb-modal__close');if(cb)setTimeout(function(){cb.focus();},60);}catch(_){}
    _prefillSukuyoProfile(profile);
    _renderDetailedChapterPreview();
    _populatePartnerSelects();
    _bindPartnerGenderToggle();
  };

  function _prefillSukuyoProfile(profile){
    if(!profile)return;
    var b=profile.birth||{};
    var infoEl=_qs('skProfileSummary');
    if(infoEl&&b.year){
      infoEl.textContent=(profile.name||'사용자')+' · '+(profile.gender==='F'?'여성':profile.gender==='M'?'남성':'')+' · '+b.year+'년 '+(b.month||'')+'월 '+(b.day||'')+'일 '+(b.hour!==undefined?b.hour+'시':'')+(b.minute&&b.minute>0?' '+b.minute+'분':'')+'생';
      infoEl.style.display='';
    }
  }

  var _partnerSelectsPopulated=false;
  function _populatePartnerSelects(){
    if(_partnerSelectsPopulated)return;
    _partnerSelectsPopulated=true;
    var hourSel=document.getElementById('skPartnerHour');
    var minSel=document.getElementById('skPartnerMinute');
    if(hourSel&&hourSel.options.length<=1){
      for(var h=0;h<24;h++){
        var opt=document.createElement('option');
        opt.value=String(h);
        opt.textContent=(h<10?'0':'')+h+'시';
        hourSel.appendChild(opt);
      }
    }
    if(minSel&&minSel.options.length<=1){
      for(var m=0;m<60;m++){
        var mopt=document.createElement('option');
        mopt.value=String(m);
        mopt.textContent=(m<10?'0':'')+m+'분';
        minSel.appendChild(mopt);
      }
    }
  }

  function _bindPartnerGenderToggle(){
    var btnF=document.getElementById('skPartnerGenderF');
    var btnM=document.getElementById('skPartnerGenderM');
    if(!btnF||!btnM||btnF._skBound)return;
    btnF._skBound=true;
    btnF.addEventListener('click',function(){btnF.classList.add('on');btnM.classList.remove('on');});
    btnM.addEventListener('click',function(){btnM.classList.add('on');btnF.classList.remove('on');});
  }

  function _readPartnerData(){
    if (_reportMode !== 'compatibility') {
      return { name: '', year: null, month: null, day: null, hour: null, minute: null, gender: 'F', calType: 'solar' };
    }
    var nameEl=document.getElementById('skPartnerName');
    var dateEl=document.getElementById('skPartnerBirthDate');
    var hourEl=document.getElementById('skPartnerHour');
    var minEl=document.getElementById('skPartnerMinute');
    var calTypeEls=document.querySelectorAll('[name="skPartnerCalType"]');
    var genderF=document.getElementById('skPartnerGenderF');
    var calType='solar';
    for(var i=0;i<calTypeEls.length;i++){if(calTypeEls[i].checked){calType=calTypeEls[i].value;break;}}
    var dateVal=dateEl?dateEl.value:'';
    var parts=dateVal?dateVal.split('-'):[];
    return {
      name:(nameEl&&nameEl.value.trim())||'',
      year:parts[0]?Number(parts[0]):null,
      month:parts[1]?Number(parts[1]):null,
      day:parts[2]?Number(parts[2]):null,
      hour:hourEl&&hourEl.value!==''?Number(hourEl.value):null,
      minute:minEl&&minEl.value!==''?Number(minEl.value):null,
      gender:(genderF&&genderF.classList.contains('on'))?'F':'M',
      calType:calType
    };
  }

  window.closeSukuyoBookModal = function(){
    var modal=_qs('sukuyoBookModal');
    if(!modal)return;
    if(_mysticTimer){clearInterval(_mysticTimer);_mysticTimer=null;}
    modal.style.display='none';
    document.body.style.overflow='';
    document.body.classList.remove('lb-modal-open');
    try{modal.setAttribute('aria-hidden','true');}catch(_){}
  };

  window.generateSukuyoBook = function(){
    if(_generating)return;
    var profile=_getActiveBirthProfile();
    if(!profile){alert('사주/숙요 계산을 먼저 완료해 주세요.');return;}
    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
    var b=profile.birth||{};
    if(!b.year||!b.month||!b.day){alert('생년월일을 확인할 수 없습니다. 사주 계산 후 다시 시도해 주세요.');return;}

    _reportMode = _getReportMode();
    var partner=_readPartnerData();
    if (_reportMode === 'compatibility' && (!partner.year || !partner.month || !partner.day)) {
      alert('궁합 모드에서는 상대방 생년월일을 입력해 주세요.');
      return;
    }

    _generating=true;
    _showScreen('skLoadingScreen');
    var _preBar=_qs('skProgressBar');
    var _preText=_qs('skProgressText');
    var _preChapter=_qs('skLoadingChapter');
    if(_preBar)_preBar.style.width='4%';
    if(_preText)_preText.textContent='입력 검증 중...';
    if(_preChapter)_preChapter.textContent='입력 검증 중...';

    _logSukuyoBookStage('REQUEST_START', { mode: _reportMode });
    _logSukuyoBookStage('MODE_DETECTED', { mode: _reportMode });
    ensureSukuyoPremiumReportValidation({
      profile: profile,
      partner: partner,
      reportMode: _reportMode,
      reportId: _reportId,
    }).then(function (validationResult) {
      if (!validationResult || !validationResult.ok) {
        _generating=false;
        _showScreen('skStartScreen');
        if (!validationResult || !validationResult.cancelled) alert((validationResult && validationResult.message) || '숙요점 차트 데이터 생성에 필요한 입력값이 부족합니다.');
        return;
      }

      _logSukuyoBookStage('PAYMENT_CHECK_START', { mode: _reportMode });
      _ensureBaseSukuyoCoinGate(profile, partner).then(function (gateResult) {
      var _premiumAccessToken = '';
      if (!gateResult || !gateResult.ok) {
        _logSukuyoBookStage('PAYMENT_CHECK_FAILED', { mode: _reportMode });
        _generating=false;
        _showScreen('skStartScreen');
        if (!gateResult || !gateResult.cancelled) alert((gateResult && gateResult.message) || '코인 결제에 실패했습니다.');
        return;
      }
      _logSukuyoBookStage('PAYMENT_CHECK_SUCCESS', { mode: _reportMode });
      _premiumAccessToken = String(gateResult.premiumAccessToken || _readSukuyoPremiumAccessToken() || '');
      return _ensureCompatibilitySurchargeIfNeeded(profile, partner).then(function (chargeResult) {
        if (!chargeResult || !chargeResult.ok) {
          _generating=false;
          _showScreen('skStartScreen');
          alert((chargeResult && chargeResult.message) || '궁합 추가 코인 차감에 실패했습니다.');
          return;
        }

      return _startExecutionLifecycle().then(function () {

      _generating=true;
      _resetChapterState();
      _sukuyoChart=null;
      _showScreen('skLoadingScreen');
      _activateCinematicLoading('skLoadingScreen','#67e8f9','#0369a1','rgba(34,211,238,0.46)');

    var progressBar=_qs('skProgressBar'),progressText=_qs('skProgressText');
    var stageEl=_qs('skLoadingStageText');
    if(!stageEl&&progressText&&progressText.parentElement){
      stageEl=document.createElement('div');
      stageEl.id='skLoadingStageText';
      stageEl.style.cssText='margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(56,189,248,0.12);border:1px solid rgba(125,211,252,0.35);font-size:0.83rem;color:#cffafe;line-height:1.45;';
      progressText.parentElement.appendChild(stageEl);
    }
    var chapterMsg=_qs('skLoadingChapter'),chapterNumEl=_qs('skLoadingChapterNum');
    var mysticEl=_qs('skMysticQuote');
    var PDF_STAGE_LABELS = [
      '프로필 데이터 확인 중',
      '음력/양력 정보 확인 중',
      '숙요점 27수 계산 중',
      'PDF 데이터 정규화 중',
      '결제 정보 확인 중',
      'Gemini 해석 생성 중',
      'PDF 렌더링 중',
      '다운로드 준비 중'
    ];

    function _setStage(step, detail) {
      var idx = Math.max(1, Math.min(PDF_STAGE_LABELS.length, Number(step) || 1));
      if (!stageEl) return;
      var label = PDF_STAGE_LABELS[idx - 1] || PDF_STAGE_LABELS[0];
      stageEl.textContent = '진행 단계 ' + idx + '/' + PDF_STAGE_LABELS.length + ': ' + label + (detail ? ' · ' + detail : '');
    }

    if(_mysticTimer)clearInterval(_mysticTimer);
    var _mqIdx=0;
    if(mysticEl){mysticEl.textContent=MYSTIC_QUOTES[0];mysticEl.classList.remove('lb-fade-out');}
    _mysticTimer=setInterval(function(){
      _mqIdx=(_mqIdx+1)%MYSTIC_QUOTES.length;
      if(mysticEl){mysticEl.classList.add('lb-fade-out');setTimeout(function(){if(mysticEl){mysticEl.textContent=MYSTIC_QUOTES[_mqIdx];mysticEl.classList.remove('lb-fade-out');}},420);}
    },3600);

    var chDots=document.querySelectorAll('.sk-ch-dot');
    Array.prototype.forEach.call(chDots,function(d){d.classList.remove('zb-ch-dot--done','zb-ch-dot--active','lb-ch-dot--done','lb-ch-dot--active','lb-ch-dot--just-done');});
    if(chDots[0])chDots[0].classList.add('zb-ch-dot--active','lb-ch-dot--active');

    var chapterWrap = chapterNumEl && chapterNumEl.parentElement && chapterNumEl.parentElement.classList && chapterNumEl.parentElement.classList.contains('lb-loading__chapter')
      ? chapterNumEl.parentElement
      : null;
    var activeLoading = _getActiveLoadingMessages();

    function _setProgress(done){
      var pct=Math.round((done/_totalChapters)*100);
      if(progressBar)progressBar.style.width=pct+'%';
      if(progressText)progressText.textContent=done+' / '+_totalChapters+' 챕터 완성 ('+pct+'%)';
      var _chapterMeta = _getChapterMetaAt(done);
      var _subtitle = done < _totalChapters
        ? ((_chapterMeta && _chapterMeta.subtitle) || ('Chapter ' + (done + 1)))
        : '전체 챕터 정리를 완료했습니다.';
      _setStage(done < _totalChapters ? 6 : 7, _subtitle);
      if(chapterMsg&&done<_totalChapters)chapterMsg.textContent=activeLoading[done]||'분석 중...';
      if(chapterMsg&&done>=_totalChapters)chapterMsg.textContent='프리미엄 리포트가 완성되었습니다.';
      if(chapterNumEl)chapterNumEl.textContent=done<_totalChapters?'Chapter '+(done+1):'✦ 완성 ✦';
      if (chapterMsg) {
        chapterMsg.classList.remove('lb-loading__status--pulse');
        void chapterMsg.offsetWidth;
        chapterMsg.classList.add('lb-loading__status--pulse');
      }
      if (chapterWrap) {
        chapterWrap.classList.remove('is-updating');
        void chapterWrap.offsetWidth;
        chapterWrap.classList.add('is-updating');
      }
      Array.prototype.forEach.call(chDots,function(d){
        var ch=Number(d.getAttribute('data-skch'));
        var isDone=ch<=done;
        var isActive=ch===done+1&&done<_totalChapters;
        var isPending=!isDone&&!isActive;
        var wasDone=d.classList.contains('zb-ch-dot--done')||d.classList.contains('lb-ch-dot--done');
        d.classList.toggle('zb-ch-dot--done',isDone);
        d.classList.toggle('zb-ch-dot--active',isActive);
        d.classList.toggle('lb-ch-dot--done',isDone);
        d.classList.toggle('lb-ch-dot--active',isActive);
        d.classList.toggle('lb-ch-dot--pending',isPending);
        if(!wasDone&&isDone){
          d.classList.add('lb-ch-dot--just-done');
          setTimeout(function(){ d.classList.remove('lb-ch-dot--just-done'); }, 760);
          d.style.animation='none';requestAnimationFrame(function(){requestAnimationFrame(function(){d.style.animation='';});});
        }
      });
    }

    _setProgress(0);
    _setStage(1, '세션 상태를 확인하고 있습니다.');

    var _premiumReportSessionId = '';
    var _premiumReportType = 'sookyoPremium';
    var _premiumFeatureType = 'sookyo_premium';
    var _premiumPreparePayload = null;
    var _recoveryPasses = 0;

    function _isValidChapterText(txt) {
      var content = String(txt || '').trim();
      return content.length >= 900 && !/^⚠️/.test(content) && !_isSukuyoTextBanned(content);
    }

    function _buildSukuyoChapterPayload(idx) {
      var lunarHint = _resolveExistingLunarHint(profile);
      var profileId = String(profile.profileId || profile.id || '').trim();
      var location = profile.location || {};
      var calendarType = String(b.calType || b.calendarType || 'solar').trim().toLowerCase();
      var birthDate = [
        Number(b.year || 0),
        String(Number(b.month || 0)).padStart(2, '0'),
        String(Number(b.day || 0)).padStart(2, '0')
      ].join('-');
      var birthTime = String(Number.isFinite(Number(b.hour)) ? Number(b.hour) : 12).padStart(2, '0')
        + ':' + String(Number.isFinite(Number(b.minute)) ? Number(b.minute) : 0).padStart(2, '0');
      var timeUnknown = !!(b.timeUnknown || b.birthTimeUnknown || b.unknownTime);
      var isLunar = calendarType === 'lunar' || calendarType === 'lunar_leap';
      var previousChapterTexts = _chapters.slice(0, idx).filter(function (t) { return typeof t === 'string' && t.trim(); });
      return {
        year:b.year,month:b.month,day:b.day,hour:b.hour!==undefined?b.hour:12,chapter:idx+1,
        name: profile.name || '사용자',
        gender: profile.gender || undefined,
        profileId: profileId || undefined,
        birthDate: birthDate,
        birthTime: birthTime,
        calType: calendarType,
        calendarType: calendarType,
        isLunar: isLunar,
        timeUnknown: timeUnknown,
        timezoneName: String(location.tz || 'Asia/Seoul'),
        timezone: String(location.tz || 'Asia/Seoul'),
        lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
        lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780),
        reportId:_reportId||undefined,
        reportType:_reportMode,
        reportMode:_reportMode,
        includeCompatibility:_reportMode==='compatibility',
        payment:_sukuyoPaymentContext||undefined,
        previousChapterTexts: previousChapterTexts,
        lunarMonth:lunarHint?lunarHint.lunarMonth:undefined,
        lunarDay:lunarHint?lunarHint.lunarDay:undefined,
        isLeap:lunarHint?lunarHint.isLeap:undefined,
        partnerName:partner.name||undefined,
        partnerYear:partner.year||undefined,
        partnerMonth:partner.month||undefined,
        partnerDay:partner.day||undefined,
        partnerHour:partner.hour!==null?partner.hour:undefined,
        partnerMinute:partner.minute!==null?partner.minute:undefined,
        partnerGender:partner.gender||undefined,
        partnerCalType:partner.calType||undefined,
        birthData: {
          profileId: profileId || undefined,
          name: profile.name || '사용자',
          gender: profile.gender || undefined,
          year: b.year,
          month: b.month,
          day: b.day,
          hour: b.hour!==undefined?b.hour:12,
          minute: b.minute!==undefined?b.minute:0,
          birthDate: birthDate,
          birthTime: birthTime,
          calType: calendarType,
          calendarType: calendarType,
          isLunar: isLunar,
          timeUnknown: timeUnknown,
          timezoneName: String(location.tz || 'Asia/Seoul'),
          timezone: String(location.tz || 'Asia/Seoul'),
          lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
          lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780)
        },
        profile: {
          profileId: profileId || undefined,
          name: profile.name || '사용자',
          gender: profile.gender || undefined,
          birthDate: birthDate,
          birthTime: birthTime,
          calendarType: calendarType,
          isLunar: isLunar,
          timeUnknown: timeUnknown,
          timezone: String(location.tz || 'Asia/Seoul')
        },
        selectedProfile: {
          profileId: profileId || undefined,
          name: profile.name || '사용자',
          gender: profile.gender || undefined,
          birthDate: birthDate,
          birthTime: birthTime,
          calendarType: calendarType,
          isLunar: isLunar,
          timeUnknown: timeUnknown,
          timezone: String(location.tz || 'Asia/Seoul')
        },
        selectedProfileId: profileId || undefined,
        selectedProfileName: profile.name || '사용자',
        _premiumStrictPayload: true,
        _premiumStrictValidation: true,
        _premiumFailOpen: false
      };
    }

    function _getSukuyoPreparePayload() {
      if (_premiumPreparePayload) return _premiumPreparePayload;
      _premiumPreparePayload = _buildSukuyoChapterPayload(0);
      return _premiumPreparePayload;
    }

    function _ensurePremiumReportSession() {
      if (_premiumReportSessionId) {
        return Promise.resolve({ ok: true, reportSessionId: _premiumReportSessionId });
      }
      return _premiumAuthJson('/api/premium-report/prepare', {
        featureType: _premiumFeatureType,
        reportType: _premiumReportType,
        premiumAccessToken: _premiumAccessToken || _readSukuyoPremiumAccessToken() || undefined,
        requestBody: _getSukuyoPreparePayload()
      }).then(function(prepared) {
        if (prepared && prepared.ok && prepared.reportSessionId) {
          _setStage(2, '결제/접근 권한을 확인했습니다.');
          _premiumReportSessionId = String(prepared.reportSessionId);
          var preparedTotal = Number(prepared.totalChapters);
          if (preparedTotal > 0) {
            _totalChapters = preparedTotal;
            _chapters = Array(_totalChapters).fill(null);
            _chapterMetaRuntime = Array(_totalChapters).fill(null);
          }
          if (Array.isArray(prepared.chapterPlan) && prepared.chapterPlan.length) {
            for (var _cp = 0; _cp < prepared.chapterPlan.length && _cp < _totalChapters; _cp++) {
              var _row = prepared.chapterPlan[_cp] || {};
              _chapterMetaRuntime[_cp] = {
                title: String(_row.title || ('Chapter ' + (_cp + 1))),
                subtitle: String(_row.subtitle || _row.goal || '')
              };
            }
          }
          _setStage(3, '기본 계산 데이터를 확보했습니다.');
          _setStage(4, '챕터 생성용 데이터 구조를 정규화했습니다.');
          return prepared;
        }
        return prepared || { ok: false, message: '프리미엄 세션 준비에 실패했습니다.' };
      });
    }

    function _ensurePremiumReportValidation() {
      return _premiumAuthJson('/api/premium-report/prepare', {
        featureType: _premiumFeatureType,
        reportType: _premiumReportType,
        preflightOnly: true,
        requestBody: _getSukuyoPreparePayload()
      }).then(function(prepared) {
        if (prepared && prepared.ok) {
          _setStage(2, '입력 검증을 완료했습니다.');
          _setStage(3, '숙요점 27수 계산이 가능한 상태입니다.');
          _setStage(4, 'PDF 데이터 구조를 정규화했습니다.');
          return prepared;
        }
        return prepared || { ok: false, message: '입력 검증에 실패했습니다.' };
      });
    }

    function _fetchChapter(idx){
      function _attempt(tryNo){
        return new Promise(function(resolve){
          var tid=setTimeout(function(){resolve({ok:false,message:'응답 시간 초과 (120초).'});},120000);
          _ensurePremiumReportSession().then(function(prepared) {
            if (!prepared || !prepared.ok || !_premiumReportSessionId) {
              clearTimeout(tid);
              resolve(prepared || { ok: false, message: '프리미엄 세션 준비에 실패했습니다.' });
              return;
            }
            _premiumAuthJson('/api/premium-report/chapter', {
              reportSessionId: _premiumReportSessionId,
              chapterId: idx + 1,
              reportType: _premiumReportType,
              featureType: _premiumFeatureType,
              requestBody: _getSukuyoPreparePayload(),
              requestId: 'sukuyo:chapter:' + (idx + 1) + ':' + Date.now().toString(36) + ':' + tryNo,
            }, {
              maxAttempts: 2,
            }).then(function(data) {
              clearTimeout(tid);
              resolve(data);
            }).catch(function(err) {
              clearTimeout(tid);
              resolve({ok:false,message:String(err&&err.message?err.message:err)});
            });
          }).catch(function(err){clearTimeout(tid);resolve({ok:false,message:String(err&&err.message?err.message:err)});});
        }).then(function(data){
          var code = String((data && data.code) || '').toUpperCase();
          var status = Number((data && data.status) || 0);
          var maxTry = 4;
          if (status === 401 || code === 'UNAUTHORIZED' || code === 'AUTH_REQUIRED' || code === 'LOGIN_REQUIRED') {
            data = data || { ok: false };
            data.fatal = true;
            data.errorCode = 'AUTH_REQUIRED';
            return data;
          }
          if (data && data.reportSessionId) {
            _premiumReportSessionId = String(data.reportSessionId);
          }
          if (
            status === 422
            || code === 'MISSING_CALCULATION_DATA'
            || code === 'PREMIUM_REPORT_DATA_INCOMPLETE'
            || code === 'PREMIUM_REPORT_CHAPTER_DATA_MISSING'
          ) {
            data = data || { ok: false };
            data.fatal = true;
            data.errorCode = 'DATA_INCOMPLETE';
            data.message = _formatPremiumFailureMessage(data, '계산 데이터가 부족해 리포트를 생성할 수 없습니다.');
            return data;
          }
          if (status === 404 || code === 'PREMIUM_REPORT_SESSION_NOT_FOUND') {
            _premiumReportSessionId = '';
            if (tryNo < maxTry) return _attempt(tryNo + 1);
            return data;
          }
          if(data&&data.ok&&data.text) return data;
          if(tryNo>=maxTry) return data;
          return _attempt(tryNo+1);
        });
      }
      return _attempt(1);
    }

    var _failCount=0;
    (function generateNext(idx){
      if(idx>=_totalChapters){
        _setStage(6, '챕터 조합을 정리하고 있습니다.');
        if (_recoveryPasses < 1) {
          var _missing = [];
          for (var _ri = 0; _ri < _totalChapters; _ri++) {
            if (!_isValidChapterText(_chapters[_ri])) _missing.push(_ri);
          }
          if (_missing.length) {
            _recoveryPasses += 1;
            if (chapterMsg) chapterMsg.textContent = '누락된 챕터를 복구하는 중...';
            (function recoverMissing(pos) {
              if (pos >= _missing.length) {
                generateNext(_totalChapters);
                return;
              }
              var targetIdx = _missing[pos];
              _fetchChapter(targetIdx).then(function (data) {
                var _retryText = data && typeof data.text === 'string' ? data.text.trim() : '';
                if (data && data.ok && _retryText.length >= 900) {
                  _chapters[targetIdx] = data.text;
                }
                _setProgress(_chapters.filter(_isValidChapterText).length);
                recoverMissing(pos + 1);
              }).catch(function () {
                recoverMissing(pos + 1);
              });
            })(0);
            return;
          }
        }

        clearInterval(_mysticTimer);_mysticTimer=null;_generating=false;
        var validCount=_chapters.filter(_isValidChapterText).length;
        if(validCount<_totalChapters){
          var errEl=_qs('skErrorMsg');
          if(errEl)errEl.textContent='챕터 생성이 불완전합니다 ('+validCount+'/'+_totalChapters+'). 자동 환급을 시도합니다. 잠시 후 다시 시도해 주세요.';
          _showScreen('skErrorScreen');
          _failExecutionLifecycle('incomplete_chapters', false).catch(function () {});
          _autoRefundPremium(PREMIUM_SUKUYO_COST, PREMIUM_SUKUYO_FEATURE_KEY, 'LOCAL_REPORT_FAILED: 숙요 프리미엄 PDF', PREMIUM_SUKUYO_TX_KEY)
            .then(function(){
              if (_reportMode === 'compatibility') {
                return _autoRefundPremium(PREMIUM_SUKUYO_COMPAT_EXTRA_COST, PREMIUM_SUKUYO_COMPAT_FEATURE_KEY, 'LOCAL_REPORT_FAILED: 숙요 궁합 추가 결제', PREMIUM_SUKUYO_COMPAT_TX_KEY);
              }
              return false;
            })
            .then(function(refunded){ if(refunded) window.alert('숙요 프리미엄 결제가 자동 환급되었습니다.'); });
          return;
        }
        try { sessionStorage.removeItem(PREMIUM_SUKUYO_TX_KEY); } catch (_) {}
        try { sessionStorage.removeItem(PREMIUM_SUKUYO_COMPAT_TX_KEY); } catch (_) {}
        _setStage(7, '리포트 다운로드 준비가 완료되었습니다.');
        _completeExecutionLifecycle().catch(function () {});
        _showScreen('skResultScreen');
        _updateTocState();_renderChapter(1);_bindToc();
        var prof=window.__cdActiveBirthProfile||{};
        var _nameEl=_qs('skResultName'),_dateEl=_qs('skResultDate');
        if(_nameEl)_nameEl.textContent='💫 '+(prof.name||'사용자')+'님의 '+_getReportDisplayTitle();
        if(_dateEl){var _b=prof.birth||{};_dateEl.textContent=[_b.year,_b.month,_b.day].filter(Boolean).join('.')+'생 · 🗓️ '+new Date().toLocaleDateString('ko-KR')+' 발행';}
        _skSaveResult(prof);
        return;
      }
      if(chapterMsg)chapterMsg.textContent=activeLoading[idx]||'분석 중...';
      _fetchChapter(idx).then(function(data){
        var statusCode = Number((data && data.status) || 0);
        var errorCode = String((data && data.code) || '').toUpperCase();
        var isSessionMissing = statusCode === 404 || errorCode === 'PREMIUM_REPORT_SESSION_NOT_FOUND' || errorCode === 'REPORT_SESSION_NOT_FOUND';
        if (data && data.reportSessionId) _premiumReportSessionId = String(data.reportSessionId);
        if (data && data.fatal && data.errorCode === 'AUTH_REQUIRED') {
          console.error('[숙요 프리미엄 PDF][AUTH_REQUIRED]', {
            chapter: idx + 1,
            code: String((data && data.code) || ''),
            status: Number((data && data.status) || 0),
            message: String((data && data.message) || ''),
            requestId: String((data && data.requestId) || ''),
            reportSessionId: String((data && data.reportSessionId) || ''),
          });
          _generating = false;
          if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
          var authErrEl = _qs('skErrorMsg');
          if (authErrEl) authErrEl.textContent = '로그인 세션이 만료되어 리포트 생성을 중단했습니다. 다시 로그인 후 재시도해 주세요.';
          _showScreen('skErrorScreen');
          if (typeof window.__cdOpenLoginRequiredModal === 'function') {
            window.__cdOpenLoginRequiredModal({ reason: '프리미엄 리포트 생성 중 세션이 만료되었습니다.' });
          }
          _failExecutionLifecycle('auth_required', false).catch(function () {});
          return;
        }
        if (data && data.fatal && data.errorCode === 'DATA_INCOMPLETE') {
          console.error('[숙요 프리미엄 PDF][DATA_INCOMPLETE]', {
            chapter: idx + 1,
            code: String((data && data.code) || ''),
            status: Number((data && data.status) || 0),
            message: String((data && data.message) || ''),
            missingData: Array.isArray(data && data.missingData) ? data.missingData : [],
            missingFields: Array.isArray(data && data.missingFields) ? data.missingFields : [],
            requestId: String((data && data.requestId) || ''),
            reportSessionId: String((data && data.reportSessionId) || ''),
          });
          _generating = false;
          if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
          var dataErrEl = _qs('skErrorMsg');
          if (dataErrEl) dataErrEl.textContent = _formatPremiumFailureMessage(data, 'PDF 생성에 필요한 계산 데이터가 부족합니다. 데이터를 다시 확인해 주세요.');
          _showScreen('skErrorScreen');
          _failExecutionLifecycle('data_incomplete', false).catch(function () {});
          _autoRefundPremium(PREMIUM_SUKUYO_COST, PREMIUM_SUKUYO_REPORT_FEATURE_KEY, 'LOCAL_REPORT_FAILED: 숙요 프리미엄 PDF', PREMIUM_SUKUYO_TX_KEY)
            .then(function(){
              if (_reportMode === 'compatibility') {
                return _autoRefundPremium(PREMIUM_SUKUYO_COMPAT_EXTRA_COST, PREMIUM_SUKUYO_COMPAT_FEATURE_KEY, 'LOCAL_REPORT_FAILED: 숙요 궁합 추가 결제', PREMIUM_SUKUYO_COMPAT_TX_KEY);
              }
              return false;
            })
            .then(function(refunded){ if(refunded) window.alert('숙요 프리미엄 결제가 자동 환급되었습니다.'); });
          return;
        }
        if (isSessionMissing || statusCode === 402 || statusCode === 503) {
          console.error('[숙요 프리미엄 PDF][BLOCKED]', {
            chapter: idx + 1,
            code: errorCode,
            status: statusCode,
            isSessionMissing: isSessionMissing,
            message: String((data && data.message) || ''),
            requestId: String((data && data.requestId) || ''),
            reportSessionId: String((data && data.reportSessionId) || ''),
          });
          _generating = false;
          if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
          var blockedErrEl = _qs('skErrorMsg');
          if (blockedErrEl) {
            blockedErrEl.textContent = isSessionMissing
              ? '리포트 세션이 만료되어 리포트 생성을 이어갈 수 없습니다. 다시 생성해 주세요.'
              : (statusCode === 402
                ? '결제 상태 확인에 실패해 리포트 생성을 중단했습니다. 잠시 후 다시 시도해 주세요.'
                : '외부 API 응답 지연으로 리포트를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          }
          _showScreen('skErrorScreen');
          _failExecutionLifecycle('generation_blocked', false).catch(function () {});
          _autoRefundPremium(PREMIUM_SUKUYO_COST, PREMIUM_SUKUYO_REPORT_FEATURE_KEY, 'LOCAL_REPORT_FAILED: 숙요 프리미엄 PDF', PREMIUM_SUKUYO_TX_KEY)
            .then(function(){
              if (_reportMode === 'compatibility') {
                return _autoRefundPremium(PREMIUM_SUKUYO_COMPAT_EXTRA_COST, PREMIUM_SUKUYO_COMPAT_FEATURE_KEY, 'LOCAL_REPORT_FAILED: 숙요 궁합 추가 결제', PREMIUM_SUKUYO_COMPAT_TX_KEY);
              }
              return false;
            })
            .then(function(refunded){ if(refunded) window.alert('숙요 프리미엄 결제가 자동 환급되었습니다.'); });
          return;
        }
        if(data&&data.ok&&data.text){
          var _sanitizedText = _sanitizeSukuyoChapterText(data.text, idx);
          if (_isValidChapterText(_sanitizedText)) {
            _chapters[idx]=_sanitizedText;
          } else {
            _failCount++;
          }
          if(!_sukuyoChart&&data.chart) _sukuyoChart=data.chart;
          if(data.chapterMeta) _chapterMetaRuntime[idx]=data.chapterMeta;
          if(data.reportId) _reportId=String(data.reportId);
          if(data.canonicalSukuyoCompatibility) _canonicalSukuyoCompatibility=data.canonicalSukuyoCompatibility;
        }
        else{
          _failCount++;
          var msg=(data&&(data.error||data.message))?data.error||data.message:'알 수 없는 오류';
          console.error('[숙요 프리미엄 PDF][CHAPTER_FAILED]', {
            chapter: idx + 1,
            status: Number((data && data.status) || 0),
            code: String((data && data.code) || ''),
            chapterStatus: String((data && data.chapterStatus) || ''),
            retryable: Boolean(data && data.retryable),
            attemptsUsed: Number((data && data.attemptsUsed) || 0),
            maxChapterAttempts: Number((data && data.maxChapterAttempts) || 0),
            lengthValidation: data && data.lengthValidation ? data.lengthValidation : null,
            missingData: Array.isArray(data && data.missingData) ? data.missingData : [],
            missingFields: Array.isArray(data && data.missingFields) ? data.missingFields : [],
            requestId: String((data && data.requestId) || ''),
            reportSessionId: String((data && data.reportSessionId) || ''),
            raw: data || null,
          });
          console.warn('[숙요] Chapter '+(idx+1)+' 실패:',msg);
          _chapters[idx]='⚠️ **이 챕터의 분석을 불러오는 데 실패했습니다.**\n\n오류: '+msg+'\n\n잠시 후 다시 시도해 주세요.';
        }
        _setProgress(idx+1);
        generateNext(idx+1);
      });
    })(0);
      });
      });
    }).catch(function (err) {
      _generating=false;
      _showScreen('skStartScreen');
      _failExecutionLifecycle(String((err && err.message) || 'generation_failed'), false).catch(function () {});
      alert(String((err && err.message) || '숙요 PDF 생성 준비 중 오류가 발생했습니다.'));
    });
    });
  };

  function _buildSukuyoCalcSummaryRows(profile){
    var birth = (profile && profile.birth) || {};
    var canonical = _canonicalSukuyoCompatibility || {};
    var personA = canonical.personA || {};
    var sukuyo = personA.sukuyo || {};
    var comp = canonical.compatibility || {};
    var source = canonical.calculationMeta || {};
    var rows = [
      ['양력 생일', [birth.year,birth.month,birth.day].filter(Boolean).join('-') || '정보 없음'],
      ['음력 생일', (personA.birth && personA.birth.lunarDate) || '정보 없음'],
      ['윤달 여부', (personA.birth && personA.birth.isLeapMonth != null) ? String(!!personA.birth.isLeapMonth) : '정보 없음'],
      ['본명숙', (sukuyo.nameKo && sukuyo.nameHan) ? (sukuyo.nameKo + '宿 / ' + sukuyo.nameHan + '宿') : '정보 없음'],
      ['27숙 index', sukuyo.index != null ? String(sukuyo.index) : '정보 없음'],
      ['월상', (_sukuyoChart && _sukuyoChart.moonPhase && _sukuyoChart.moonPhase.label) || '정보 없음'],
      ['조도', (_sukuyoChart && _sukuyoChart.moonPhase && _sukuyoChart.moonPhase.illumination != null) ? (Math.round(Number(_sukuyoChart.moonPhase.illumination) * 10) / 10) + '%' : '정보 없음'],
      ['삭망각', (_sukuyoChart && _sukuyoChart.moonPhase && _sukuyoChart.moonPhase.phaseAngle != null) ? (Math.round(Number(_sukuyoChart.moonPhase.phaseAngle) * 10) / 10) + '도' : '정보 없음'],
      ['방향', sukuyo.direction || '정보 없음'],
      ['속성', sukuyo.element || '정보 없음'],
      ['핵심 키워드', Array.isArray(sukuyo.keywords) ? sukuyo.keywords.join(', ') : '정보 없음'],
      ['계산 소스', source.calendarSource || source.engine || '정보 없음']
    ];
    if (_reportMode === 'compatibility') {
      rows.push(['관계 유형', comp.relationType || '정보 없음']);
      rows.push(['거리', comp.shortestDistance != null ? String(comp.shortestDistance) : '정보 없음']);
      rows.push(['궁합 지수', comp.compatibilityIndex != null ? String(comp.compatibilityIndex) : '정보 없음']);
      rows.push(['거리 상세', comp.distanceMetrics ? ('A→B ' + comp.distanceMetrics.forwardDistance + ' / B→A ' + comp.distanceMetrics.reverseDistance + ' / 최단 ' + comp.distanceMetrics.shortestDistance + (comp.distanceMetrics.resonanceCode ? (' · ' + comp.distanceMetrics.resonanceCode) : '')) : '정보 없음']);
      rows.push(['역할 액션', comp.roleActionGuide ? ((comp.roleActionGuide.meAction || '') + (comp.roleActionGuide.otherAction ? (' / ' + comp.roleActionGuide.otherAction) : '')) : '정보 없음']);
      rows.push(['오행 합', comp.elementHarmony ? (comp.elementHarmony.summary || (String(comp.elementHarmony.relation || '') + ' (' + String(comp.elementHarmony.harmonyScore || '') + ')')) : '정보 없음']);
      rows.push(['강점-그림자 보완', comp.strengthShadowMap ? (comp.strengthShadowMap.complementSummary || '정보 없음') : '정보 없음']);
    }
    return rows;
  }

  function _renderSukuyoCalcSummaryHtml(profile){
    var rows = _buildSukuyoCalcSummaryRows(profile);
    var tr='';
    for(var i=0;i<rows.length;i++){
      tr += '<tr><th>'+_escHtml(rows[i][0])+'</th><td>'+_escHtml(rows[i][1])+'</td></tr>';
    }
    return '<section class="calc-summary page-break"><h2>계산 데이터 요약표</h2><table><thead><tr><th>항목</th><th>값</th></tr></thead><tbody>'+tr+'</tbody></table></section>';
  }

  window.downloadSukuyoBookPdf = function(){
    if(!_chapters.some(Boolean)){alert('먼저 '+_getReportDisplayTitle()+'을(를) 생성해 주세요.');return;}
    var profile=window.__cdActiveBirthProfile||{};
    var reportTitle = _getReportDisplayTitle();
    var name=(profile.name||'사용자')+'님의 '+reportTitle;
    var birth=profile.birth||{};
    var issued=new Date().toLocaleDateString('ko-KR');
    var tocItems='';
    var bodyHtml='';
    for(var i=0;i<_totalChapters;i++){
      if(!_chapters[i])continue;
      var meta = _getChapterMetaAt(i);
      tocItems += '<li><span>Chapter '+(i+1)+'</span><strong>'+_escHtml(meta.title)+'</strong></li>';
      bodyHtml+='<section class="chapter page-break"><div class="chapter-header"><span class="chapter-num">Chapter '+(i+1)+'</span><h2 class="chapter-title">'+_escHtml(meta.title)+'</h2><p class="chapter-sub">'+_escHtml(meta.subtitle||'')+'</p></div><div class="chapter-body">'+_md2html(_chapters[i])+'</div></section>';
    }
    var fullHtml='<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>'+_escHtml(name)+'</title>' +
      '<style>@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;700&display=swap");' +
      '@page{size:A4;margin:18mm 16mm 20mm;}' +
      'html,body{margin:0;padding:0;background:#fff;color:#0f172a;}' +
      'body{font-family:"Noto Serif KR","Noto Sans KR",serif;line-height:1.8;word-break:keep-all;line-break:strict;overflow-wrap:anywhere;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(150deg,#020817 0%,#0f172a 45%,#082f49 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:11px;letter-spacing:.2em;color:#7dd3fc;margin-bottom:14px;text-transform:uppercase;}' +
      '.cover-title{font-size:38px;font-weight:700;margin:0 0 10px;color:#fff;}' +
      '.cover-name{font-size:24px;color:#bae6fd;margin:10px 0 6px;}' +
      '.cover-info{font-size:13px;color:#cbd5e1;}' +
      '.toc{padding:4mm 0 0;page-break-after:always;}' +
      '.toc h2{font-size:24px;margin:0 0 14px;color:#0c4a6e;}' +
      '.toc ol{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr;gap:8px;}' +
      '.toc li{display:flex;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:10px;background:#f0f9ff;border:1px solid #bae6fd;font-size:13px;}' +
      '.calc-summary{padding-top:2mm;page-break-after:always;}' +
      '.calc-summary h2{font-size:22px;margin:0 0 12px;color:#0c4a6e;}' +
      'table{width:100%;border-collapse:collapse;font-size:13px;page-break-inside:auto;}' +
      'thead{display:table-header-group;} tr{page-break-inside:avoid;page-break-after:auto;}' +
      'th,td{border:1px solid #cbd5e1;padding:8px 10px;vertical-align:top;} th{background:#eff6ff;text-align:left;width:30%;}' +
      '.chapter{padding-top:2mm;}' +
      '.chapter-header{border-bottom:2px solid #7dd3fc;margin-bottom:16px;padding-bottom:12px;}' +
      '.chapter-num{font-size:11px;letter-spacing:.18em;color:#0284c7;text-transform:uppercase;}' +
      '.chapter-title{font-size:24px;font-weight:700;color:#0f172a;margin:6px 0 4px;}' +
      '.chapter-sub{font-size:13px;color:#0369a1;margin:0;}' +
      '.chapter-body h1,.chapter-body h2,.chapter-body h3,.chapter-body h4{color:#0f172a;margin-top:16px;}' +
      '.chapter-body p{margin:0 0 10px;color:#111827;}' +
      '.chapter-body blockquote{border-left:3px solid #38bdf8;padding:8px 14px;background:#f0f9ff;margin:14px 0;}' +
      '.chapter-body ul,.chapter-body ol{padding-left:1.4em;}' +
      '.chapter-body li{margin-bottom:5px;}' +
      '.page-break{page-break-before:always;}' +
      '.page-footer{position:fixed;left:0;right:0;bottom:4mm;text-align:center;font-size:10px;color:#94a3b8;}' +
      '.page-footer:after{content:"Page " counter(page);}' +
      '</style></head><body>' +
      '<div class="cover"><p class="cover-badge">SUKUYO 宿曜占 PREMIUM</p>' +
      '<h1 class="cover-title">'+_escHtml(reportTitle)+'</h1>' +
      '<p style="font-size:15px;color:#bae6fd;margin-bottom:14px;">정확한 본명숙 계산값 기반 '+_totalChapters+'챕터 리포트</p>' +
      '<div style="width:64px;height:1px;background:rgba(125,211,252,0.45);margin:0 auto 16px;"></div>' +
      '<p class="cover-name">'+_escHtml((profile.name||'사용자'))+'님의 숙요 리포트</p>' +
      '<p class="cover-info">'+([birth.year,birth.month,birth.day].filter(Boolean).join('년 ')+(birth.day?'일':'')||'생년월일 미상')+'</p>' +
      '<p class="cover-info" style="margin-top:8px;">발행일 '+issued+'</p></div>' +
      '<section class="toc"><h2>목차</h2><ol>'+tocItems+'</ol></section>' +
      bodyHtml +
      '<div class="page-footer"></div>' +
      '</body></html>';

    var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    var blobUrl = URL.createObjectURL(blob);
    var win = window.open(blobUrl, '_blank', 'width=940,height=760');
    if (!win) {
      URL.revokeObjectURL(blobUrl);
      alert('팝업이 차단되어 PDF 생성 창을 열 수 없습니다.\n브라우저 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    var revokeLater = setTimeout(function(){ try{ URL.revokeObjectURL(blobUrl); }catch(_){} }, 120000);
    var triggerPrint = function(){
      try { win.focus(); } catch (_) {}
      try { win.print(); } catch (_) {}
    };
    try {
      win.addEventListener('load', function(){ setTimeout(triggerPrint, 700); });
      win.onafterprint = function(){
        clearTimeout(revokeLater);
        setTimeout(function(){ try{ URL.revokeObjectURL(blobUrl); }catch(_){} }, 1000);
      };
    } catch (_) {
      setTimeout(triggerPrint, 1200);
    }
  };

  document.addEventListener('click',function(e){
    var el=e.target; if(!el)return;
    var node=el.closest?el.closest('[data-action]'):null; if(!node)return;
    var act=node.getAttribute('data-action');
    if(act==='closeSukuyoBookModal'){window.closeSukuyoBookModal();e.stopPropagation();}
  });

  window.gotoSukuyoPremium = function(profileArg){
    var profile=(profileArg && profileArg.birth && profileArg.birth.year) ? profileArg : _getActiveBirthProfile();
    if (profile) {
      try { sessionStorage.removeItem(_skMakeKey(profile)); } catch (_) {}
    }
    _resetChapterState();
    _sukuyoChart=null;
    _reportId='';
    _canonicalSukuyoCompatibility=null;
    _chapterMetaRuntime=[];
    _reportMode='personal';
    window.openSukuyoBookModal(profileArg);
  };
  _ensureReportModeSelector();
})();
