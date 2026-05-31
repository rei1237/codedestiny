/**
 * 인생의 책 (Life Book) — 프리미엄 사주 심층 분석 + PDF 다운로드
 * CODE-DESTINY v1.0
 */
(function () {
  'use strict';

  var LIFEBOOK_TOTAL_CHAPTERS = 13;
  var LIFE_BOOK_FEATURE_KEY = 'saju_life_book_pdf';
  var LIFE_BOOK_REASON = '인생의 책 생성 (13챕터)';
  var LIFEBOOK_API_PREPARE_PATH = '/api/premium/saju-lifebook/prepare';
  var LIFEBOOK_API_STATUS_PATH = '/api/premium/saju-lifebook/status';

  /* ─────────────── 상수 ─────────────── */
  var CHAPTER_TITLES = [
    '🌌 사주 원국 완전 해설 — 팔자 8글자의 비밀',
    '🏛️ 나의 설계도 — 월지·일간·조후와 기질의 뿌리',
    '⚔️ 숨겨진 무기 — 용신·희신과 나만의 필살기',
    '🌀 대운 정밀 분석 — 인생의 큰 파도',
    '👑 격국과 사회적 소명 — 나의 성공 방정식',
    '🤝 관계의 전략 — 인연의 법칙과 파트너십',
    '💑 연애·결혼 완전 분석 — 사랑의 구조',
    '💰 재물과 현실 기반 — 돈이 모이는 구조',
    '🧭 직업·사업·커리어 — 세상에서 살아남는 무기',
    '🩺 건강·멘탈·에너지 관리 — 무너지지 않는 몸과 마음',
    '🔮 신살과 특수 기운 — 운명의 숨은 장치',
    '📅 세운·월운 활용법 — 가까운 미래 전략',
    '🕯️ 최종 인생 로드맵 — 나답게 살아가는 법',
  ];

  var CHAPTER_SUBTITLES = [
    '연주·월주·일주·시주와 천간·지지 상호작용의 핵심 구조',
    '월지·일간·조후를 중심으로 본 기질과 현실 적응 패턴',
    '용신·희신 운용법과 반복 리스크를 다루는 실행 무기',
    '현재 대운과 다음 대운의 전환 포인트 및 장기 전략',
    '격국/중심 구조와 사회적 역할·성취 방식의 연결',
    '관계 패턴·갈등 지점·협업 강점에 대한 실전 가이드',
    '연애 구조·배우자궁·이별 회복·지속 전략을 통합 분석',
    '재성 구조·소비/저축/투자 성향과 실전 수익 설계',
    '직업형/사업형 판단과 장기 커리어 생존 로드맵',
    '오행 불균형 기반 건강·멘탈·번아웃 회복 루틴',
    '도화·역마·화개·귀문 등 신살의 활용과 리스크 관리',
    '올해·월별 흐름에 맞춘 12개월 실행 타이밍 전략',
    '핵심 요약·반복 패턴 정리·3년/5년/10년 실천 계획',
  ];

  var LOADING_MSGS = [
    '사주 원국 팔자 8글자와 기둥별 의미를 해독하는 중...',
    '월지·일간·조후·신강신약을 분석하는 중...',
    '용신·희신·기신과 천직 강점을 탐색하는 중...',
    '대운 전체 흐름과 현재 대운을 정밀 분석하는 중...',
    '격국·상신·사회적 소명을 해독하는 중...',
    '충·합·육신 관계 역학을 매핑하는 중...',
    '연애·결혼 구조와 이상형 프로파일을 분석하는 중...',
    '재성·식상·부의 그릇과 직업 전략을 계산하는 중...',
    '직업/사업/커리어 전환 포인트를 정리하는 중...',
    '오행별 건강 지도와 심신 에너지를 분석하는 중...',
    '위기 패턴과 전환 전략을 정리하는 중...',
    '귀인운과 숨은 복의 활성 조건을 탐색하는 중...',
    '최종 운명 로드맵을 완성하는 중...',
  ];

  var MYSTIC_QUOTES = [
    '팔자(八字) 여덟 글자 속에 당신만의 우주가 담겨 있습니다.',
    '태어난 순간의 하늘 기운이 지금도 당신 안에서 흐르고 있습니다.',
    '천간(天干)과 지지(地支)가 엮어낸 운명의 실타래를 풀어냅니다.',
    '용신(用神)의 빛이 당신이 가야 할 길을 밝히고 있습니다.',
    '대운(大運)은 인생의 계절입니다. 지금 어느 계절을 지나고 있는지 읽습니다.',
    '음양(陰陽)의 균형 속에서 당신만의 해답이 나타나고 있습니다.',
    '오행(五行)의 흐름이 당신의 건강·재물·사랑을 결정합니다.',
    '격국(格局)은 하늘이 당신에게 부여한 사회적 사명입니다.',
    '충(沖)과 합(合)의 자리에서 인연의 법칙을 발견합니다.',
    '재성(財星)의 위치가 당신의 부(富)의 그릇을 말해줍니다.',
    '귀인(貴人)이 나타나는 시기와 장소를 계산하고 있습니다.',
    '삶의 파도를 읽어 오직 당신을 위한 전략으로 엮겠습니다.',
    '신강신약(身强身弱)의 경계에서 당신의 진짜 강점이 드러납니다.',
    '하늘이 숨긴 천기(天機)를 펼쳐 당신의 이름으로 기록합니다.',
  ];

  var CHAPTER_STRUCTURED_LABELS = {
    1: ['원국 핵심 진단', '기둥별 해석', '강점 구조', '주의 신호', '실행 포인트'],
    2: ['설계도 요약', '기질 분석', '의사결정 성향', '환경 적합도', '개선 전략'],
    3: ['숨은 재능', '리스크 요인', '돌파 레버', '성장 루틴', '실전 액션'],
    4: ['대운 흐름', '상승 구간', '주의 구간', '전환 시점', '전략 제안'],
    5: ['소명 진단', '커리어 방향', '성과 확대', '협업 방식', '도약 타이밍'],
    6: ['관계 패턴', '갈등 트리거', '경계 설정', '소통 전략', '회복 가이드'],
    7: ['연애 성향', '결혼 운 포인트', '관계 유지', '위험 신호', '행동 처방'],
    8: ['재물 구조', '직업 적합성', '수입 전략', '지출 관리', '축적 플랜'],
    9: ['적성 직업군', '업무 환경 적합도', '피해야 할 커리어 패턴', '조직/프리랜서/사업형 판단', '장기 커리어 설계'],
    10: ['오행 기반 건강 취약점', '스트레스 반응 패턴', '번아웃 신호와 회복', '생활 리듬 처방', '멘탈 회복 루틴'],
    11: ['도화·역마·화개·귀문 해석', '삶에서의 발현 방식', '장점으로 쓰는 법', '위험 구간과 트리거', '실전 조절법'],
    12: ['올해 핵심 흐름', '월별 주의 포인트', '기회가 강한 시기', '피해야 할 결정 타이밍', '12개월 행동 전략'],
    13: ['사주 핵심 요약', '붙잡아야 할 방향', '버려야 할 반복 패턴', '3년·5년·10년 로드맵', '최종 상담 메시지'],
  };

  /* ─────────────── 상태 ─────────────── */
  var _chapters = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
  var _chapterStructured = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
  var _chapterMeta = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
    function _flowLog(stage, extra) {
      try {
        console.info('[SajuLifeBook][Flow] ' + String(stage || 'UNKNOWN'), Object.assign({
          featureKey: LIFE_BOOK_FEATURE_KEY,
          chapterCount: LIFEBOOK_TOTAL_CHAPTERS,
        }, extra || {}));
      } catch (_) {}
    }

  function _lifeBookLog(tag, extra) {
    try {
      console.info('[LifeBook][' + String(tag || 'Log') + ']', extra || {});
    } catch (_) {}
  }

  function _resolveLifeBookStoredUrl(payload) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    return _clean(
      p.pdfUrl
      || p.htmlUrl
      || p.downloadUrl
      || ready.pdfUrl
      || ready.htmlUrl
      || ready.downloadUrl
    );
  }

  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;
  var _activeRequestController = null;
  var _cancelGeneration = false;
  var _premiumPaidUntil = 0;
  var _premiumAccessVerifiedUntil = 0;
  var _lbPendingSavedResult = null;
  var _lbPendingPdfHtml = '';
  var _lbPendingReportUrl = '';
  var _lbJobStateKey = 'cd:premium-job:life-book';
  var _lbCurrentReportId = '';
  var _lbCurrentAccessGrant = null;
  var _lbCurrentPremiumToken = '';
  var _lbPartialFetchChapter = null;

  function _markPremiumAccessVerified(ttlMs) {
    var ttl = Number(ttlMs || 0);
    if (!Number.isFinite(ttl) || ttl <= 0) ttl = 25 * 60 * 1000;
    var until = Date.now() + ttl;
    if (until > _premiumAccessVerifiedUntil) _premiumAccessVerifiedUntil = until;
    if (until > _premiumPaidUntil) _premiumPaidUntil = until;
  }

  function _hasPremiumAccessForGeneration() {
    if (Date.now() < _premiumAccessVerifiedUntil) return true;
    if (_premiumTokenMatches('lifeBook', 500) || Date.now() < _premiumPaidUntil) {
      _markPremiumAccessVerified(25 * 60 * 1000);
      return true;
    }
    return false;
  }

  function _lbGetJobClient() {
    return (typeof window !== 'undefined' && window.CDPremiumPdfJobClient) ? window.CDPremiumPdfJobClient : null;
  }

  function _lbStartPremiumJob(profile) {
    var client = _lbGetJobClient();
    if (!client) return;
    var birth = (profile && profile.birth) ? profile.birth : {};
    client.start({
      stateKey: _lbJobStateKey,
      reportType: 'lifeBook',
      featureType: LIFE_BOOK_FEATURE_KEY,
      requestBody: {
        name: String((profile && profile.name) || '사용자'),
        gender: String((profile && profile.gender) || ''),
        year: Number(birth.year || 0),
        month: Number(birth.month || 0),
        day: Number(birth.day || 0),
        hour: Number(birth.hour || 12),
        minute: Number(birth.minute || 0),
      },
    }).catch(function () {});
  }

  function _lbResumePremiumJob() {
    var client = _lbGetJobClient();
    if (!client) return;
    client.resume({ stateKey: _lbJobStateKey }).catch(function () {});
  }

  function _lbRunPremiumJob(totalChapters) {
    var client = _lbGetJobClient();
    if (!client) return;
    client.run({
      stateKey: _lbJobStateKey,
      startChapter: 1,
      endChapter: Number(totalChapters || LIFEBOOK_TOTAL_CHAPTERS),
      stopOnFailure: false,
    }).catch(function () {});
  }

  function _readPremiumTokenForReport() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) { try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    return token;
  }

  function _premiumTokenMatches(reportType, minCoins) {
    var token = _readPremiumTokenForReport();
    if (!token || typeof atob !== 'function') return false;
    try {
      var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      var tokenReportType = String(payload && payload.reportType || '').trim();
      var expected = String(reportType || '').trim();
      var aliases = {
        lifeBook: ['lifebook', 'saju_lifebook', 'sajulifebook'],
        loveSecret: ['lovesecret', 'saju_love_secret', 'saju-love-secret'],
      };
      var normalizedExpected = expected.toLowerCase().replace(/[^a-z0-9]/g, '');
      var normalizedActual = tokenReportType.toLowerCase().replace(/[^a-z0-9]/g, '');
      var expectedAliases = aliases[expected] || [];
      var reportTypeMatched = normalizedActual === normalizedExpected;
      if (!reportTypeMatched) {
        for (var ai = 0; ai < expectedAliases.length; ai++) {
          if (normalizedActual === String(expectedAliases[ai]).toLowerCase().replace(/[^a-z0-9]/g, '')) {
            reportTypeMatched = true;
            break;
          }
        }
      }
      var exp = Number(payload && payload.exp);
      var charged = Number(payload && payload.chargedCoins || 0);
      var coinMatched = !Number.isFinite(Number(minCoins)) || charged >= Number(minCoins);
      return reportTypeMatched
        && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000)
        && coinMatched;
    } catch (_) {
      return false;
    }
  }

  function _persistPremiumAccessToken(token) {
    var value = String(token || '').trim();
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function _normalizeLifeBookAccessGrant(raw, reportId, fallbackRequestId) {
    var data = raw && typeof raw === 'object' ? raw : {};
    var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};
    var normalizedReportId = String(accessGrant.reportId || data.reportId || reportId || '').trim();
    var purchaseId = String(accessGrant.purchaseId || data.purchaseId || data.transactionId || consume.transactionId || '').trim();
    var sessionId = String(accessGrant.sessionId || data.sessionId || data.reportSessionId || (normalizedReportId ? ('life-book:' + normalizedReportId) : '')).trim();
    var requestId = String(accessGrant.requestId || data.requestId || consume.requestId || fallbackRequestId || '').trim();

    // Allow if we have reportId and either purchaseId or requestId; if no reportId, generate one
    if (!normalizedReportId && !requestId) return null;
    if (!normalizedReportId) {
      normalizedReportId = 'lifebook_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }
    return {
      ok: true,
      featureKey: LIFE_BOOK_FEATURE_KEY,
      sessionId: sessionId || undefined,
      purchaseId: purchaseId || undefined,
      requestId: requestId || undefined,
      reportId: normalizedReportId,
      paidAt: String(accessGrant.paidAt || data.paidAt || new Date().toISOString()),
    };
  }

  async function _runLifeBookCoinGate(reportId) {
    var requestId = 'life-book:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
    var premiumToken = _readPremiumTokenForReport();
    var headers = { 'Content-Type': 'application/json' };
    if (premiumToken) headers['x-premium-access-token'] = premiumToken;

    var response = await fetch('/api/billing/coin-gate', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify({
        categoryKey: 'premium-report',
        featureKey: LIFE_BOOK_FEATURE_KEY,
        reason: LIFE_BOOK_REASON,
        mode: 'life-book',
        reportId: String(reportId || '').trim() || undefined,
        sessionId: String(reportId || '').trim() ? ('life-book:' + String(reportId).trim()) : undefined,
        reportSessionId: String(reportId || '').trim() ? ('life-book:' + String(reportId).trim()) : undefined,
        requestId: requestId,
        forceDeduct: true,
      }),
    });

    var payload = {};
    try { payload = await response.json(); } catch (_) { payload = {}; }
    var data = (payload && payload.data && typeof payload.data === 'object') ? payload.data : payload;
    var issuedToken = String(data.premiumAccessToken || payload.premiumAccessToken || '').trim();
    if (issuedToken) _persistPremiumAccessToken(issuedToken);

    var accessGrant = _normalizeLifeBookAccessGrant(data, reportId, requestId);
    return {
      ok: !!response.ok && !!(payload && payload.ok !== false) && !!accessGrant,
      status: Number(response.status || 0),
      message: String((payload && payload.message) || ''),
      accessGrant: accessGrant,
      premiumAccessToken: issuedToken,
      requestId: requestId,
    };
  }

  function _ensurePremiumPaymentThenStart() {
    if (_hasPremiumAccessForGeneration()) return true;
    if (typeof window._cdCoinGatePerUse !== 'function') {
      alert('결제 확인 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
      return false;
    }
    _flowLog('COIN_GATE_START', { message: 'premium-check-before-generate' });
    window._cdCoinGatePerUse(500, '인생의 책 생성 (13챕터)', function () {
      _markPremiumAccessVerified(25 * 60 * 1000);
      _flowLog('COIN_GATE_SUCCESS', { message: 'coin-gate-approved' });
      window.generateLifeBook();
    }, null, {
      featureKey: LIFE_BOOK_FEATURE_KEY,
      requestId: LIFE_BOOK_FEATURE_KEY + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    });
    return false;
  }

  function _abortActiveRequest() {
    if (_activeRequestController) {
      try { _activeRequestController.abort(); } catch (_) {}
      _activeRequestController = null;
    }
  }

  /* ─────────────── 유틸 ─────────────── */
  function _qs(id) { return document.getElementById(id); }

  function _buildApiCandidates(pathname) {
    var _path = String(pathname || '');
    if (_path.charAt(0) !== '/') _path = '/' + _path;
    var _bases = [
      '',
      (typeof window !== 'undefined' && window.__CD_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__AUTH_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.location && window.location.origin) || ''
    ];
    var _seen = {};
    var _urls = [];
    for (var i = 0; i < _bases.length; i++) {
      var _base = String(_bases[i] || '').trim();
      var _url = _base ? (_base.replace(/\/+$/, '') + _path) : _path;
      if (_seen[_url]) continue;
      _seen[_url] = true;
      _urls.push(_url);
    }
    return _urls.length ? _urls : [_path];
  }

  function _buildLifeBookPrepareCandidates() {
    // Use worker-native lifebook route only; do not retry legacy mirror routes.
    return _buildApiCandidates(LIFEBOOK_API_PREPARE_PATH);
  }

  function _buildLifeBookStatusCandidates(sessionId) {
    var _sid = encodeURIComponent(String(sessionId || '').trim());
    return _buildApiCandidates(LIFEBOOK_API_STATUS_PATH + '?sessionId=' + _sid);
  }

  function _isAuthOrPaymentFailure(status, payload) {
    var code = String((payload && (payload.code || (payload.error && payload.error.code))) || '').toUpperCase();
    if (status === 401 || status === 402 || status === 403) return true;
    if (!code) return false;
    return code.indexOf('AUTH') >= 0
      || code.indexOf('UNAUTHORIZED') >= 0
      || code.indexOf('FORBIDDEN') >= 0
      || code.indexOf('PAYMENT') >= 0
      || code.indexOf('PREMIUM') >= 0;
  }

  function _postLifeBookPrepare(payload, headers) {
    return new Promise(function (resolve, reject) {
      var endpoints = _buildLifeBookPrepareCandidates();
      var settled = false;
      var idx = 0;
      var lastErr = '';

      function doneOk(out) {
        if (settled) return;
        settled = true;
        resolve(out);
      }

      function doneFail(message) {
        if (settled) return;
        settled = true;
        reject(new Error(message || '인생의 책 엔드포인트 호출에 실패했습니다.'));
      }

      function runNext() {
        if (idx >= endpoints.length) {
          doneFail(lastErr || '인생의 책 엔드포인트 호출에 실패했습니다.');
          return;
        }

        var endpoint = endpoints[idx++];
        var controller = (typeof AbortController === 'function') ? new AbortController() : null;
        var timerId = setTimeout(function () {
          if (controller) {
            try { controller.abort(); } catch (_) {}
          }
        }, 420000);

        fetch(endpoint, {
          method: 'POST',
          headers: headers,
          credentials: 'include',
          body: JSON.stringify(payload),
          signal: controller ? controller.signal : undefined,
        })
          .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (json) {
              return { res: res, json: json, endpoint: endpoint };
            });
          })
          .then(function (pack) {
            clearTimeout(timerId);
            if (pack.res && pack.res.ok && pack.json && pack.json.ok) {
              doneOk(pack);
              return;
            }

            if (pack && pack.res && _isAuthOrPaymentFailure(Number(pack.res.status || 0), pack.json || {})) {
              var hardMessage = String(
                (pack.json && (pack.json.message || pack.json.reason || pack.json.code))
                || (pack.res.status === 401 ? '로그인이 필요합니다.' : '프리미엄 결제 확인이 필요합니다.')
              );
              doneFail(hardMessage);
              return;
            }

            var msg = pack && pack.json
              ? (pack.json.message || pack.json.reason || pack.json.code || '')
              : '';
            lastErr = String(msg || ('HTTP ' + (pack && pack.res ? pack.res.status : 'ERR')));
            runNext();
          })
          .catch(function (err) {
            clearTimeout(timerId);
            lastErr = _normalizeLifeBookErrorMessage(err, '요청이 중단되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
            runNext();
          });
      }

      runNext();
    });
  }

  function _fetchLifeBookStatus(sessionId, headers) {
    return new Promise(function (resolve, reject) {
      var _sid = String(sessionId || '').trim();
      if (!_sid) {
        resolve(null);
        return;
      }

      var endpoints = _buildLifeBookStatusCandidates(_sid);
      var settled = false;
      var idx = 0;
      var lastErr = '';

      function doneOk(out) {
        if (settled) return;
        settled = true;
        resolve(out);
      }

      function doneFail(message) {
        if (settled) return;
        settled = true;
        reject(new Error(message || '인생의 책 상태 조회에 실패했습니다.'));
      }

      function runNext() {
        if (idx >= endpoints.length) {
          doneFail(lastErr || '인생의 책 상태 조회에 실패했습니다.');
          return;
        }
        var endpoint = endpoints[idx++];
        var controller = (typeof AbortController === 'function') ? new AbortController() : null;
        var timerId = setTimeout(function () {
          if (controller) {
            try { controller.abort(); } catch (_) {}
          }
        }, 15000);

        fetch(endpoint, {
          method: 'GET',
          headers: headers,
          credentials: 'include',
          cache: 'no-store',
          signal: controller ? controller.signal : undefined,
        })
          .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (json) {
              return { res: res, json: json };
            });
          })
          .then(function (pack) {
            clearTimeout(timerId);
            if (pack.res && pack.res.ok && pack.json && pack.json.ok) {
              doneOk(pack.json && pack.json.data ? pack.json.data : null);
              return;
            }
            if (pack && pack.res && _isAuthOrPaymentFailure(Number(pack.res.status || 0), pack.json || {})) {
              doneFail(String((pack.json && (pack.json.message || pack.json.reason || pack.json.code)) || '인증 또는 결제 상태를 확인해 주세요.'));
              return;
            }
            lastErr = String(
              (pack && pack.json && (pack.json.message || pack.json.code))
              || ('HTTP ' + (pack && pack.res ? pack.res.status : 'ERR'))
            );
            runNext();
          })
          .catch(function (err) {
            clearTimeout(timerId);
            lastErr = _normalizeLifeBookErrorMessage(err, '상태 조회 요청이 중단되었습니다.');
            runNext();
          });
      }

      runNext();
    });
  }

  async function _pollLifeBookStatus(sessionId, headers, onProgress, shouldStop) {
    var _sid = String(sessionId || '').trim();
    if (!_sid) return;
    for (;;) {
      if (typeof shouldStop === 'function' && shouldStop()) return;
      try {
        var data = await _fetchLifeBookStatus(_sid, headers);
        if (data && typeof onProgress === 'function') onProgress(data);
      } catch (_) {
        // 상태 조회 실패는 최종 prepare 응답으로 복구 가능하므로 폴링은 지속한다.
      }
      if (typeof shouldStop === 'function' && shouldStop()) return;
      await new Promise(function (r) { setTimeout(r, 1800); });
    }
  }

  function _buildResultOverviewHtml() {
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var profile = window.__cdActiveBirthProfile || {};
    var powerLabel = String(
      analysis.power_label
      || ((window.G_POWER && window.G_POWER.isStrong) ? '신강' : (window.G_POWER ? '신약' : '판정 대기'))
    );
    var yongshin = '';
    if (Array.isArray(analysis.yongshin_elements) && analysis.yongshin_elements.length) {
      yongshin = analysis.yongshin_elements.join(' · ');
    } else if (window.G_POWER && Array.isArray(window.G_POWER.yongshin) && window.G_POWER.yongshin.length) {
      yongshin = window.G_POWER.yongshin.join(' · ');
    }

    var weights = analysis.elementWeights || {};
    var elemRows = [
      { key: 'wood', label: '목', val: Number(weights.wood || 0) },
      { key: 'fire', label: '화', val: Number(weights.fire || 0) },
      { key: 'earth', label: '토', val: Number(weights.earth || 0) },
      { key: 'metal', label: '금', val: Number(weights.metal || 0) },
      { key: 'water', label: '수', val: Number(weights.water || 0) },
    ];
    elemRows.sort(function (a, b) { return b.val - a.val; });
    var dominant = elemRows[0] || { label: '-', val: 0 };
    var completed = _chapters.filter(function (c) { return typeof c === 'string' && c.trim().length > 0; }).length;
    var completionPct = Math.round((completed / LIFEBOOK_TOTAL_CHAPTERS) * 100);
    var name = String(profile.name || '사용자');

    return '' +
      '<div style="margin-bottom:14px;padding:14px;border:1px solid rgba(167,139,250,.35);border-radius:14px;background:linear-gradient(155deg,rgba(26,14,36,.9),rgba(37,22,56,.92));">' +
      '  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;">' +
      '    <span style="font-size:12px;letter-spacing:.08em;padding:4px 8px;border-radius:999px;background:rgba(139,92,246,.18);border:1px solid rgba(139,92,246,.45);">PRECISION SNAPSHOT</span>' +
      '    <span style="font-size:12px;padding:4px 8px;border-radius:999px;background:rgba(30,64,175,.22);border:1px solid rgba(96,165,250,.4);">' + _escHtml(name) + '</span>' +
      '    <span style="font-size:12px;padding:4px 8px;border-radius:999px;background:rgba(22,163,74,.18);border:1px solid rgba(74,222,128,.35);">챕터 완성 ' + completionPct + '%</span>' +
      '  </div>' +
      '  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">' +
      '    <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);"><div style="font-size:11px;opacity:.78;">신강/신약</div><div style="font-weight:700;">' + _escHtml(powerLabel) + '</div></div>' +
      '    <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);"><div style="font-size:11px;opacity:.78;">주도 오행</div><div style="font-weight:700;">' + _escHtml(dominant.label + ' (' + dominant.val + '%)') + '</div></div>' +
      '    <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);"><div style="font-size:11px;opacity:.78;">핵심 용신</div><div style="font-weight:700;">' + _escHtml(yongshin || '분석 데이터 준비 중') + '</div></div>' +
      '  </div>' +
      '</div>';
  }

  /**
   * Markdown 텍스트를 간단하게 HTML로 변환
   */
  function _md2html(text) {
    if (!text) return '';
    // escape HTML first
    var h = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // blockquote (must run before > is treated as escaped)
    h = h.replace(/^&gt; (.+)$/gm, '<blockquote class="lb-md-blockquote">$1</blockquote>');
    // merge consecutive blockquotes
    h = h.replace(/<\/blockquote>\n<blockquote class="lb-md-blockquote">/g, '<br>');

    // headings
    h = h.replace(/^#### (.+)$/gm, '<h4 class="lb-md-h4">$1</h4>');
    h = h.replace(/^### (.+)$/gm, '<h3 class="lb-md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2 class="lb-md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1 class="lb-md-h1">$1</h1>');

    // bold/italic
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // horizontal rule
    h = h.replace(/^---+$/gm, '<hr class="lb-md-hr">');

    // unordered lists
    h = h.replace(/^[*-] (.+)$/gm, '<li class="lb-md-li">$1</li>');
    h = h.replace(/(<li[\s\S]*?<\/li>(\n|$))+/g, function(m) {
      return '<ul class="lb-md-ul">' + m + '</ul>';
    });

    // ordered lists
    h = h.replace(/^\d+\. (.+)$/gm, '<li class="lb-md-li lb-md-oli">$1</li>');

    // paragraphs
    h = h.replace(/\n\n+/g, '\n\n');
    var lines = h.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) {
        result.push('');
        continue;
      }
      if (/^<(h[1-4]|ul|li|hr|blockquote)/.test(line) || /<\/(h[1-4]|ul|li|hr|blockquote)>$/.test(line)) {
        result.push(line);
      } else {
        result.push('<p class="lb-md-p">' + line + '</p>');
      }
    }
    return result.join('\n');
  }

  function _deriveTextFromChapterJson(chapterJson) {
    if (!chapterJson || !Array.isArray(chapterJson.sections)) return '';
    return chapterJson.sections
      .filter(function (row) { return row && String(row.body || row.content || '').trim(); })
      .map(function (row) {
        var body = String(row.body || row.content || '').trim();
        var title = String(row.title || row.label || '').trim();
        return title ? ('## ' + title + '\n' + body) : body;
      })
      .join('\n\n');
  }

  function _renderStructuredChapterBody(chapter, chapterJson) {
    if (!chapterJson || !Array.isArray(chapterJson.sections) || !chapterJson.sections.length) return '';
    var labels = CHAPTER_STRUCTURED_LABELS[Number(chapter)] || [];
    var out = [];
    for (var i = 0; i < chapterJson.sections.length; i++) {
      var row = chapterJson.sections[i] || {};
      var body = String(row.body || row.content || '').trim();
      if (!body) continue;
      var title = String(row.title || row.label || labels[i] || ('핵심 항목 ' + (i + 1)));
      out.push('<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">' + _escHtml(title) + '</h4><div class="lb-result-article__section-body">' + _md2html(body) + '</div></section>');
    }
    if (!out.length) return '';
    return '<div class="lb-result-article__structured">' + out.join('') + '</div>';
  }

  /**
   * 사주 데이터 수집 — window.__destinyFlowerSajuSnapshot, __cdActiveBirthProfile 등
   */
  function _collectSajuData() {
    var profile = window.__cdActiveBirthProfile || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};

    var name = profile.name || snap.name || '사용자';
    var gender = profile.gender || snap.gender || '';
    var birth = profile.birth || snap.birth || {};

    var lines = [];
    lines.push('【분석 대상 정보】');
    lines.push('이름: ' + name);
    lines.push('성별: ' + (gender === 'F' ? '여성' : gender === 'M' ? '남성' : gender || '미상'));

    if (birth.year) {
      lines.push('생년월일: ' + birth.year + '년 ' + (birth.month || '') + '월 ' + (birth.day || '') + '일');
      lines.push('출생 시각: ' + (birth.hour !== undefined ? birth.hour + '시 ' : '') + (birth.minute !== undefined ? birth.minute + '분' : ''));
    }

    if (profile.location && profile.location.label) {
      lines.push('출생지: ' + profile.location.label);
    }

    // 원국 사주 기둥
    var G = window.G_PILLARS;
    if (G) {
      lines.push('\n【사주 원국(四柱)】');
      if (G.y) lines.push('년주(年柱): ' + (G.y.g || '') + (G.y.j || '') + (G.y.gE ? ' [' + G.y.gE + '/' + G.y.jE + ']' : ''));
      if (G.m) lines.push('월주(月柱): ' + (G.m.g || '') + (G.m.j || '') + (G.m.gE ? ' [' + G.m.gE + '/' + G.m.jE + ']' : ''));
      if (G.d) lines.push('일주(日柱): ' + (G.d.g || '') + (G.d.j || '') + (G.d.gE ? ' [' + G.d.gE + '/' + G.d.jE + ']' : ''));
      if (G.h) lines.push('시주(時柱): ' + (G.h.g || '') + (G.h.j || '') + (G.h.gE ? ' [' + G.h.gE + '/' + G.h.jE + ']' : ''));
    }

    // ── 오행 분포
    var analysis = snap.analysis || snap.saju || {};
    if (analysis.elementWeights) {
      var w = analysis.elementWeights;
      lines.push('\n【오행(五行) 분포 — 퀀텀 명리 엔진】');
      lines.push('목(木): ' + (w.wood || 0) + '% | 화(火): ' + (w.fire || 0) + '% | 토(土): ' + (w.earth || 0) + '% | 금(金): ' + (w.metal || 0) + '% | 수(水): ' + (w.water || 0) + '%');
      // 최강/최약 오행
      var elArr = [['목(木)',w.wood||0],['화(火)',w.fire||0],['토(土)',w.earth||0],['금(金)',w.metal||0],['수(水)',w.water||0]];
      elArr.sort(function(a,b){return b[1]-a[1];});
      lines.push('최강 오행: ' + elArr[0][0] + ' (' + elArr[0][1] + '%) → 과다 시 기신 작용 주의');
      lines.push('최약 오행: ' + elArr[4][0] + ' (' + elArr[4][1] + '%) → 결핍 기운, 용신 후보');
    }

    // ── [1부 나의 설계도] 월지·일간·지지 심화
    var G_PILLARS_R = window.G_PILLARS;
    if (G_PILLARS_R) {
      lines.push('\n【1부. 나의 설계도 — 월지·일간·지지 정밀 분석】');
      if (G_PILLARS_R.m && G_PILLARS_R.m.j) {
        lines.push('월지(月支): ' + G_PILLARS_R.m.j + (G_PILLARS_R.m.jE ? ' [' + G_PILLARS_R.m.jE + ']' : '') + ' → 태어난 계절·환경의 기운. 삶의 무대와 난이도를 결정');
      }
      if (G_PILLARS_R.d) {
        lines.push('일간(日干): ' + (G_PILLARS_R.d.g||'') + (G_PILLARS_R.d.gE ? ' [' + G_PILLARS_R.d.gE + ']' : '') + ' → 나의 핵심 정체성, 주도적 vs 협조적 기질의 근원');
        lines.push('일지(日支): ' + (G_PILLARS_R.d.j||'') + (G_PILLARS_R.d.jE ? ' [' + G_PILLARS_R.d.jE + ']' : '') + ' → 나의 내면 심성, 배우자궁, 감정의 결');
      }
      // 지지 4개 — 내 인생 반복 패턴
      var zhiList = [];
      ['y','m','d','h'].forEach(function(k){
        if (G_PILLARS_R[k] && G_PILLARS_R[k].j) zhiList.push(G_PILLARS_R[k].j + (G_PILLARS_R[k].jE ? '['+G_PILLARS_R[k].jE+']' : ''));
      });
      if (zhiList.length) lines.push('지지(地支) 전체: ' + zhiList.join(' · ') + ' → 삶에 반복 출현하는 상황 패턴');
      // 계절(조후)
      var johuType = (window.G_JOHU && window.G_JOHU.type) ? window.G_JOHU.type : (analysis.johuType || analysis.johu_type || '');
      if (johuType) lines.push('조후(調候) 판정: ' + johuType + (johuType==='hot'?' — 뜨거운 여름 사주, 水·金 환경에서 능력 최대화':johuType==='cold'?' — 차가운 겨울 사주, 火·木 환경에서 능력 최대화':johuType==='warm'?' — 따뜻한 봄/여름 사주':johuType==='cool'?' — 선선한 가을/겨울 사주':''));
    }

    // ── [2부 숨겨진 무기] 용신·희신·Specialist vs Generalist
    var G_POWER = window.G_POWER;
    var G_JOHU = window.G_JOHU;
    lines.push('\n【2부. 숨겨진 무기 — 용신·희신·천직 특성 분석】');
    if (analysis.yongshin_elements && analysis.yongshin_elements.length) {
      lines.push('용신(用神): ' + analysis.yongshin_elements.join(', ') + ' → 내가 가장 잘 쓸 수 있는 필살기 오행');
    }
    if (analysis.kishin_elements && analysis.kishin_elements.length) {
      lines.push('기신(忌神): ' + analysis.kishin_elements.join(', ') + ' → 에너지를 소진시키는 장애 오행');
    }
    if (G_POWER) {
      if (G_POWER.yongshin) lines.push('용신 상세: ' + (Array.isArray(G_POWER.yongshin) ? G_POWER.yongshin.join(', ') : G_POWER.yongshin));
      if (G_POWER.kijishin && G_POWER.kijishin.length) lines.push('기신 상세: ' + G_POWER.kijishin.join(', '));
    }
    // 일간/신강신약
    if (analysis.dayStem) lines.push('일간(日干): ' + analysis.dayStem);
    if (analysis.power_label) lines.push('신강/신약: ' + analysis.power_label + (analysis.power_label==='신강'?' — 자기 주도성 강, 에너지 과다 주의. 상관·식신으로 발산 권장':' — 지지 기반 필요. 인성·비겁 운에서 비약적 성장'));
    if (analysis.isJong) lines.push('격 판정: ' + (analysis.jongName || '종격') + ' — 종격은 용신을 따르는 방향으로 거스르지 말 것');

    // Specialist vs Generalist 판별
    // G_POWER.groups는 calcPower() 반환값에 없으므로 G_PILLARS 기반으로 직접 계산
    var _tgGroups = null;
    if (G_PILLARS_R && G_PILLARS_R.d && G_PILLARS_R.d.g && typeof window.getTenGod === 'function') {
      var _dg = G_PILLARS_R.d.g;
      _tgGroups = {};
      [
        G_PILLARS_R.y && G_PILLARS_R.y.g, G_PILLARS_R.y && G_PILLARS_R.y.j,
        G_PILLARS_R.m && G_PILLARS_R.m.g, G_PILLARS_R.m && G_PILLARS_R.m.j,
        G_PILLARS_R.d && G_PILLARS_R.d.j,
        G_PILLARS_R.h && G_PILLARS_R.h.g, G_PILLARS_R.h && G_PILLARS_R.h.j
      ].forEach(function (c) {
        if (!c) return;
        var t = window.getTenGod(_dg, c);
        if (t && t !== '?' && t !== '일간') _tgGroups[t] = (_tgGroups[t] || 0) + 1;
      });
    } else if (G_POWER && G_POWER.groups) {
      _tgGroups = G_POWER.groups;
    }
    if (_tgGroups && Object.keys(_tgGroups).length > 0) {
      lines.push('\n【십성(十星) 분포 — Specialist/Generalist 판별 기반】');
      var gk = Object.keys(_tgGroups);
      for (var gi = 0; gi < gk.length; gi++) {
        lines.push(gk[gi] + ': ' + _tgGroups[gk[gi]]);
      }
      // Specialist: 관성 강하고 비겁 약 / Generalist: 식상 강하고 재성 발달
      var grp = _tgGroups;
      var hasStrongKwan = (grp['정관']||0) + (grp['편관']||0) > 2;
      var hasStrongSik = (grp['식신']||0) + (grp['상관']||0) > 2;
      var hasStrongJae = (grp['정재']||0) + (grp['편재']||0) > 2;
      lines.push('천직 기질: ' + (hasStrongKwan && !hasStrongSik ? 'Specialist형 — 한 분야의 전문 장인, 체계·규범·조직 안에서 빛남' : hasStrongSik && hasStrongJae ? 'Generalist(창업가)형 — 아이디어를 돈으로 전환, 판을 넓히는 사업가' : '균형형 — 전문성과 유연성을 함께 발휘'));
    }

    // ── [3부 관계의 전략] 상충·합·육신
    lines.push('\n【3부. 관계의 전략 — 상충·합·육신 분석】');
    if (G_PILLARS_R) {
      // 천간합 탐색
      var GAN_PAIRS = [['甲','己'],['乙','庚'],['丙','辛'],['丁','壬'],['戊','癸']];
      var GAN_PAIR_EL = ['토(土)','금(金)','수(水)','목(木)','화(火)'];
      var ganList = ['y','m','d','h'].map(function(k){ return G_PILLARS_R[k] && G_PILLARS_R[k].g || ''; });
      var hapFound = [];
      GAN_PAIRS.forEach(function(p,i){
        var cnt0 = ganList.filter(function(g){return g===p[0];}).length;
        var cnt1 = ganList.filter(function(g){return g===p[1];}).length;
        if (cnt0 > 0 && cnt1 > 0) hapFound.push(p[0]+'·'+p[1]+' 천간합 → '+GAN_PAIR_EL[i]+' 화합, 전략적 파트너십 기운');
      });
      if (hapFound.length) lines.push('천간합(天干合): ' + hapFound.join(' / '));
      // 지지충 탐색
      var JI_CHUNG = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
      var jiList = ['y','m','d','h'].map(function(k){ return G_PILLARS_R[k] && G_PILLARS_R[k].j || ''; });
      var chungFound = [];
      JI_CHUNG.forEach(function(p){
        var c0 = jiList.filter(function(j){return j===p[0];}).length;
        var c1 = jiList.filter(function(j){return j===p[1];}).length;
        if (c0>0 && c1>0) chungFound.push(p[0]+'·'+p[1]+' 충(沖)');
      });
      if (chungFound.length) lines.push('지지충(地支沖): ' + chungFound.join(' / ') + ' → 변화의 자극, 성장 트리거이자 예기치 못한 변동 신호');
      else lines.push('지지충: 원국 내 주요 충 없음 — 비교적 안정적 흐름');
      // 삼합/육합 탐색
      var YUKHAP = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
      var yukFound = [];
      YUKHAP.forEach(function(p){
        if (jiList.indexOf(p[0])>=0 && jiList.indexOf(p[1])>=0) yukFound.push(p[0]+'·'+p[1]+' 육합(六合)');
      });
      if (yukFound.length) lines.push('육합(六合): ' + yukFound.join(' / ') + ' → 파트너십·제휴에서 강력한 시너지');
    }
    // 육신(六神) — 타인이 보는 나 vs 내가 바라보는 세상
    if (_tgGroups && Object.keys(_tgGroups).length > 0) {
      var g = _tgGroups;
      var topStar = '';
      var topVal = 0;
      Object.keys(g).forEach(function(k){ if((g[k]||0)>topVal){topVal=g[k];topStar=k;} });
      var starDesc = {
        '정관': '타인 평가: 책임감 있고 신뢰할 수 있는 사람. 내가 바라보는 세상: 규범·질서·명예가 최우선',
        '편관': '타인 평가: 강렬하고 카리스마 있는 사람. 내가 바라보는 세상: 도전·극복·리더십이 삶의 이유',
        '정재': '타인 평가: 성실하고 믿음직한 사람. 내가 바라보는 세상: 안정된 자산과 현실 결과가 가장 중요',
        '편재': '타인 평가: 매력적이고 사교적인 사람. 내가 바라보는 세상: 기회·확장·자유로운 재물 흐름',
        '식신': '타인 평가: 온화하고 재능 있는 사람. 내가 바라보는 세상: 표현·창조·즐거움이 삶의 핵심',
        '상관': '타인 평가: 개성 강하고 독창적인 사람. 내가 바라보는 세상: 기존 틀을 깨는 혁신과 자유',
        '비견': '타인 평가: 주관·독립심이 강한 사람. 내가 바라보는 세상: 경쟁과 자립이 성장의 원동력',
        '겁재': '타인 평가: 도전적이고 추진력 있는 사람. 내가 바라보는 세상: 승부·쟁취·역동적 변화',
        '정인': '타인 평가: 지성적이고 배려 깊은 사람. 내가 바라보는 세상: 학문·배움·내면 성숙이 삶의 목적',
        '편인': '타인 평가: 신비롭고 독특한 사람. 내가 바라보는 세상: 직관·영적 통찰·비주류적 가치'
      };
      if (topStar && starDesc[topStar]) {
        lines.push('주도 십성(육신): ' + topStar + ' — ' + starDesc[topStar]);
      }
    }

    // ── [4부 사회적 소명] 격국·상신·구신
    lines.push('\n【4부. 사회적 소명 — 격국·상신·구신 분석】');
    if (snap.saju && snap.saju.notes && snap.saju.notes.length) {
      lines.push('격 판정 노트: ' + snap.saju.notes.join(' / '));
    }
    if (johuType) lines.push('조후(調候): ' + johuType);
    // 격국 추론 (월지 기반)
    if (G_PILLARS_R && G_PILLARS_R.m) {
      var monthG = G_PILLARS_R.m.g || '';
      var monthJ = G_PILLARS_R.m.j || '';
      lines.push('격국 기반 월주: ' + monthG + monthJ + ' → 이 월주가 격국(格局)과 직업적성·사회적 그릇의 틀을 결정');
    }
    lines.push('상신(相神): 용신을 돕는 조력 오행 = ' + (analysis.yongshin_elements ? analysis.yongshin_elements.join(' 계열') + ' 관련 인맥·환경·직업' : '사주 상세 분석 필요'));
    lines.push('구신(仇神): 기신(忌神) ' + (analysis.kishin_elements ? analysis.kishin_elements.join(', ') : '') + ' → 고난 끝에 결국 내 것이 되는 역설적 결과 오행 — 극복 후 최대 무기로 전환');

    // ── [5부 부와 사랑] 재물운·애정운·건강운
    lines.push('\n【5부. 부와 사랑 — 재물운·애정운·건강운】');
    if (_tgGroups && Object.keys(_tgGroups).length > 0) {
      var gg = _tgGroups;
      var jaeTotal = (gg['정재']||0) + (gg['편재']||0);
      var gwanTotal = (gg['정관']||0) + (gg['편관']||0);
      var sikTotal = (gg['식신']||0) + (gg['상관']||0);
      lines.push('재물 그릇(재성 총량): ' + jaeTotal + '개 — ' + (jaeTotal >= 3 ? '재성 풍부. 단, 겁재가 강하면 재물 유출 주의' : jaeTotal >= 1 ? '적정 재물 기운. 식상 활성화 시 재물이 따름' : '재성 약. 전문 기술(식상)을 먼저 키워야 재물이 열림'));
      lines.push('돈그릇 모양: ' + (gg['편재']||0 > gg['정재']||0 ? '편재형 — 공격적 투자형, 사업·주식·부동산 등 변동성 자산에 강점' : '정재형 — 안정적 저축형, 꾸준한 수입·안전 자산 선호'));
      lines.push('애정 구조: ' + (gwanTotal > 0 ? '관성 발달 — 책임 기반 연애, 진지한 관계 지향' : sikTotal > 2 ? '식상 강 — 매력·표현력 넘치는 연애, 자유로운 감정 표현' : '비겁 강 — 독립심 강해 주체적 연애, 상대방 존중이 관계의 열쇠'));
    }
    if (analysis.elementWeights) {
      var hw = analysis.elementWeights;
      var weakEl = '';
      var minV = 999;
      [['목(木)',hw.wood||0],['화(火)',hw.fire||0],['토(土)',hw.earth||0],['금(金)',hw.metal||0],['수(水)',hw.water||0]].forEach(function(e){ if(e[1]<minV){minV=e[1];weakEl=e[0];} });
      lines.push('건강 취약 오행: ' + weakEl + ' — ' + {'목(木)':'간·담·근육·눈 계열 주의, 스트레스 해소 필수', '화(火)':'심장·소장·혈관·정신 에너지 소진 주의', '토(土)':'소화기·비위·췌장, 과식·불규칙 식사 주의', '금(金)':'폐·대장·피부·호흡기 주의, 환절기 건강 관리', '수(水)':'신장·방광·생식기·뼈 주의, 수분 보충 중요'}[weakEl]);
      lines.push('타고난 에너지 총량: ' + (analysis.power_label === '신강' ? '신강(身强) — 에너지가 넘쳐 과로·번아웃 주의. 정기적 운동과 이완 필수' : '신약(身弱) — 에너지 효율적 분배 필요. 무리한 다중 역할보다 선택과 집중이 건강의 핵심'));
    }

    // ── [6부 2026 실전 로드맵]
    lines.push('\n【6부. 2026 丙午 실전 로드맵 — 신년 행동 지침】');
    lines.push('2026년 세운(歲運): 丙午年 — 천간 丙(병,火)·지지 午(오,火). 화(火) 기운이 천지를 뒤덮는 해');
    // 용신/기신에 따른 2026 판단
    var yong = analysis.yongshin_elements || [];
    var ki = analysis.kishin_elements || [];
    var is2026Good = yong.indexOf('火') >= 0 || yong.indexOf('화') >= 0 || yong.indexOf('fire') >= 0;
    var is2026Bad = ki.indexOf('火') >= 0 || ki.indexOf('화') >= 0 || ki.indexOf('fire') >= 0;
    lines.push('2026 용신/기신 판정: ' + (is2026Good ? '🔥 丙午 火 기운이 용신 — 2026년은 적극 행동의 해! Go 시즌' : is2026Bad ? '⚠️ 丙午 火 기운이 기신 — 2026년은 내실 강화의 해. Stop→내공 축적' : '🌀 중립 — 2026년은 전략적 선별 행동의 해'));
    lines.push('타이밍 전략(Go/Stop): ' + (is2026Good ? '봄(1~3월) 씨앗 심기 → 여름(5~7월) 폭발 성장 → 가을(9~10월) 수확. 무리한 확장보다 핵심 1개 승부' : '상반기 조심(충돌·과소비 금지), 하반기 2027 준비 기간. 丙午충 원국 있으면 환경 변동 대비'));
    lines.push('2026년 핵심 키워드: ' + (is2026Good ? '가시성·도전·사회적 인정·관계 확장' : is2026Bad ? '내실·절제·전문성 심화·재정 안정' : '균형·선택과 집중·관계 정리·핵심 역량'));
    // 월별 정보 기반 (현재 연도/월)
    var nowMonth = new Date().getMonth() + 1; // 1~12
    lines.push('현재 월(2026년 ' + nowMonth + '월) 기운: 올해 가장 주의할 월 — 기신 오행이 강해지는 달(月)에 큰 결정 자제, 용신 달에 승부');

    // ── 대운
    var G_DAEWUN = window.G_DAEWUN || window.G_DAEUN;
    if (G_DAEWUN && Array.isArray(G_DAEWUN) && G_DAEWUN.length) {
      lines.push('\n【대운(大運) 전체 흐름 — 생애 마스터플랜 기반】');
      for (var di = 0; di < Math.min(G_DAEWUN.length, 12); di++) {
        var dw = G_DAEWUN[di];
        if (dw) {
          lines.push((dw.age || '') + '세 대운: ' + (dw.g || '') + (dw.j || '') + (dw.gE ? ' [' + dw.gE + ']' : '') + (dw.jE ? '/' + dw.jE : ''));
        }
      }
    }

    // ── 현재 나이 + 현재 대운(大運) 식별
    if (birth.year) {
      var currentAge = new Date().getFullYear() - birth.year + 1;
      lines.push('\n현재 나이: ' + currentAge + '세 (만 ' + (currentAge - 1) + '세)');
      lines.push('현재 기준年: 2026년 丙午年');
      // 현재 진행 중인 대운 식별
      if (G_DAEWUN && Array.isArray(G_DAEWUN) && G_DAEWUN.length) {
        var currentDw = null;
        for (var cdi = 0; cdi < G_DAEWUN.length - 1; cdi++) {
          var dwCur = G_DAEWUN[cdi];
          var dwNext = G_DAEWUN[cdi + 1];
          if (dwCur && dwNext && dwCur.age <= currentAge && currentAge < dwNext.age) {
            currentDw = dwCur;
            break;
          }
        }
        if (!currentDw && G_DAEWUN.length > 0) currentDw = G_DAEWUN[G_DAEWUN.length - 1];
        if (currentDw) {
          lines.push('\n【⭐ 현재 진행 중인 대운(大運) — 핵심 분석 대상】');
          lines.push('현재 대운: ' + (currentDw.g || '') + (currentDw.j || '') +
            (currentDw.gE ? ' [' + currentDw.gE + '/' + currentDw.jE + ']' : ''));
          lines.push('대운 진입 나이: ' + currentDw.age + '세 → 현재 나이 ' + currentAge + '세 (대운 경과: ' + (currentAge - currentDw.age) + '년)');
        }
      }
    }

    return lines.join('\n');
  }

  function _collectLifeBookAnalysisSignals(profile) {
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var power = window.G_POWER || {};
    var johu = window.G_JOHU || {};
    var pillars = window.G_PILLARS || {};
    var daewunList = window.G_DAEWUN || window.G_DAEUN || [];

    var elementWeights = analysis.elementWeights && typeof analysis.elementWeights === 'object'
      ? {
          wood: Number(analysis.elementWeights.wood || 0),
          fire: Number(analysis.elementWeights.fire || 0),
          earth: Number(analysis.elementWeights.earth || 0),
          metal: Number(analysis.elementWeights.metal || 0),
          water: Number(analysis.elementWeights.water || 0),
        }
      : null;

    var yongList = [];
    if (Array.isArray(analysis.yongshin_elements)) yongList = analysis.yongshin_elements.slice(0, 4);
    if (!yongList.length && Array.isArray(power.yongshin)) yongList = power.yongshin.slice(0, 4);

    var kiList = [];
    if (Array.isArray(analysis.kishin_elements)) kiList = analysis.kishin_elements.slice(0, 4);
    if (!kiList.length && Array.isArray(power.kijishin)) kiList = power.kijishin.slice(0, 4);

    var tenGods = null;
    if (power && power.groups && typeof power.groups === 'object') {
      tenGods = Object.assign({}, power.groups);
    }

    var currentDaewun = '';
    if (Array.isArray(daewunList) && daewunList.length && profile && profile.birth && profile.birth.year) {
      var currentAge = new Date().getFullYear() - Number(profile.birth.year || 0) + 1;
      for (var i = 0; i < daewunList.length; i++) {
        var cur = daewunList[i] || {};
        var next = daewunList[i + 1] || null;
        var ageStart = Number(cur.age || 0);
        var ageEnd = next ? Number(next.age || 999) : 999;
        if (currentAge >= ageStart && currentAge < ageEnd) {
          currentDaewun = String((cur.g || '') + (cur.j || '')).trim();
          break;
        }
      }
      if (!currentDaewun) {
        var last = daewunList[daewunList.length - 1] || {};
        currentDaewun = String((last.g || '') + (last.j || '')).trim();
      }
    }

    return {
      dayMaster: String((analysis.dayStem || (pillars.d && pillars.d.g) || '') || '').trim(),
      monthBranch: String(((pillars.m && pillars.m.j) || '') || '').trim(),
      powerLabel: String((analysis.power_label || analysis.powerLabel || '') || '').trim(),
      johuType: String((analysis.johuType || analysis.johu_type || johu.type || '') || '').trim(),
      yongshinElements: yongList,
      kishinElements: kiList,
      elementWeights: elementWeights,
      tenGodCounts: tenGods,
      currentDaewun: currentDaewun,
      isJong: Boolean(analysis.isJong),
      jongName: String(analysis.jongName || ''),
    };
  }

  function _normalizeLifeBookErrorMessage(error, fallback) {
    var raw = String(error && error.message ? error.message : error || '').trim();
    var defaultMsg = String(fallback || '요청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    if (!raw) return defaultMsg;
    if (/abort|aborted|AbortError|without reason/i.test(raw)) return defaultMsg;
    if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) {
      return '네트워크 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.';
    }
    return raw;
  }

  function _normalizeGenderForApi(rawGender) {
    var g = String(rawGender || '').trim().toLowerCase();
    if (g === 'f' || g === 'female' || g === 'woman' || g === '여' || g === '여성') return 'female';
    if (g === 'm' || g === 'male' || g === 'man' || g === '남' || g === '남성') return 'male';
    return 'unknown';
  }

  function _resolveCalendarTypeForApi(profile) {
    var raw = String(
      (profile && profile.birth && profile.birth.calendarType)
      || (profile && profile.calendarType)
      || 'solar'
    ).trim().toLowerCase();
    if (raw === 'lunar' || raw === '음력' || raw === 'moon') return 'lunar';
    return 'solar';
  }

  /* ─────────────── 모달 제어 ─────────────── */
  function _showScreen(id) {
    var screens = ['lbStartScreen', 'lbLoadingScreen', 'lbResultScreen', 'lbErrorScreen'];
    for (var i = 0; i < screens.length; i++) {
      var el = _qs(screens[i]);
      if (el) el.style.display = (screens[i] === id) ? '' : 'none';
    }
  }

  /** DOM 입력값에서 생년월일 복구 */
  function _recoverBirthFromDOM() {
    try {
      var dateEl = document.getElementById('birthDate');
      var nameEl = document.getElementById('nameInput');
      var isFemale = document.querySelector('#btnF.on') !== null;
      if (!dateEl || !dateEl.value) return null;
      var parts = dateEl.value.split('-');
      if (parts.length < 3) return null;
      var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
      if (!y || !m || !d) return null;
      var hourEl = document.getElementById('birthHour');
      var minEl = document.getElementById('birthMinute');
      /* 출생지: 모달 전용 선택기를 우선, 없으면 메인 폼 선택기 사용 */
      var locationData = { label: '대한민국 (서울)', lng: 127.0, lat: 37.6, tz: 'Asia/Seoul', tzOffset: 9, baseTzOffset: 9 };
      var countrySel = document.getElementById('lbBirthCountry') || document.getElementById('birthCountry');
      if (countrySel && countrySel.selectedIndex >= 0) {
        var opt = countrySel.options[countrySel.selectedIndex];
        if (opt) {
          locationData = {
            label: (opt.textContent || opt.text || '').trim(),
            lng: parseFloat(opt.getAttribute('data-long') || '127.0'),
            lat: parseFloat(opt.getAttribute('data-lat') || '37.6'),
            tz: opt.value || 'Asia/Seoul',
            tzOffset: parseFloat(opt.getAttribute('data-tz') || '9'),
            baseTzOffset: parseFloat(opt.getAttribute('data-base-tz') || '9')
          };
        }
      }
      return {
        name: (nameEl && nameEl.value.trim()) || '사용자',
        gender: isFemale ? 'F' : 'M',
        birth: {
          year: y, month: m, day: d,
          hour: hourEl ? Number(hourEl.value) : 12,
          minute: minEl ? Number(minEl.value) : 0
        },
        location: locationData
      };
    } catch (_) { return null; }
  }

  /** 사주 데이터 유효성 확인 (여러 소스 순서대로 체크) */
  function _getActiveBirthProfile() {
    // 1순위: window.__cdActiveBirthProfile (사주 계산 후 설정)
    var p = window.__cdActiveBirthProfile;
    if (p && p.birth && p.birth.year) return p;
    // 2순위: destiny flower 스냅샷
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    // 3순위: DOM 입력값 직접 읽기
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return fromDom;
    return null;
  }

  /* ── localStorage 저장/복원 ── */
  var _LB_STORE_VER = 'lb_v1_';

  function _lbMakeKey(profile) {
    var b = (profile && profile.birth) || {};
    return _LB_STORE_VER + (b.year || '0') + '_' + (b.month || '0') + '_' + (b.day || '0') + '_' + ((profile && profile.gender) || 'u');
  }

  function _lbSaveResult(profile) {
    try {
      localStorage.setItem(_lbMakeKey(profile), JSON.stringify({
        chapters: _chapters,
        name: (profile && profile.name) || '사용자',
        birth: (profile && profile.birth) || {},
        gender: (profile && profile.gender) || '',
        savedAt: new Date().toISOString()
      }));
    } catch (e) { /* 용량 초과 또는 브라우저 제한 */ }
  }

  function _lbLoadSaved(profile) {
    try {
      var raw = localStorage.getItem(_lbMakeKey(profile));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function _lbClearSaved(profile) {
    try { localStorage.removeItem(_lbMakeKey(profile)); } catch (e) {}
  }

  function _lbHasSavedContent(saved) {
    if (!saved || !Array.isArray(saved.chapters)) return false;
    var validCount = saved.chapters.filter(function (c) {
      return typeof c === 'string' && c.trim().length >= 500 && !/^⚠️/.test(c.trim());
    }).length;
    return validCount >= 10;
  }

  function _lbApplySavedResult(saved, modal) {
    if (!saved || !modal) return;
    _chapters = Array.isArray(saved.chapters) ? saved.chapters : Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
    _chapterMeta = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
    _currentChapter = 1;
    _showScreen('lbResultScreen');
    _updateTocState();
    _renderChapter(1);
    _bindToc();
    var nameEl = _qs('lbResultName');
    var dateEl = _qs('lbResultDate');
    if (nameEl) nameEl.textContent = '📜 ' + (saved.name || '사용자') + '님의 인생의 책';
    if (dateEl) {
      var b = saved.birth || {};
      var savedDate = saved.savedAt ? new Date(saved.savedAt).toLocaleDateString('ko-KR') : '';
      dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' 생 · '
        + (saved.gender === 'F' ? '여성' : saved.gender === 'M' ? '남성' : '')
        + (savedDate ? ' · 💾 ' + savedDate + ' 저장' : '');
    }
    var lbEpBannerSaved = _qs('lbEpilogueBanner');
    if (lbEpBannerSaved) lbEpBannerSaved.style.display = '';
    _lbEnsurePartialRegenerateControl();
  }

  function _lbResolveActiveChapter() {
    var activeBtn = document.querySelector('.lb-toc .lb-toc-item.active[data-lb-chapter]');
    var byUi = activeBtn ? Number(activeBtn.getAttribute('data-lb-chapter')) : 0;
    if (Number.isFinite(byUi) && byUi >= 1) return byUi;
    return Math.max(1, Number(_currentChapter || 1));
  }

  function _lbRegenerateChapter(chapter) {
    var idx = Number(chapter) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= LIFEBOOK_TOTAL_CHAPTERS) {
      return Promise.reject(new Error('유효하지 않은 챕터입니다.'));
    }
    if (!_lbCurrentReportId || typeof _lbPartialFetchChapter !== 'function') {
      return Promise.reject(new Error('재생성 컨텍스트가 준비되지 않았습니다.'));
    }
    var runPipeline = (typeof window.__cdRunPremiumChapterPipeline === 'function')
      ? window.__cdRunPremiumChapterPipeline
      : null;
    if (!runPipeline) {
      return Promise.reject(new Error('공통 챕터 파이프라인을 찾을 수 없습니다.'));
    }
    var fallbackText = String(window.__cdPremiumChapterFallbackText || '일시적인 응답 지연으로 해석을 불러오지 못했습니다. 부분 재생성 버튼을 이용해주세요.');
    return runPipeline({
      totalChapters: 1,
      maxAttempts: 3,
      interChapterDelayMs: 0,
      retryDelayMs: 3000,
      fetchChapter: function () { return _lbPartialFetchChapter(idx); },
      isSuccess: function (data) {
        var text = data && typeof data.text === 'string' ? data.text.trim() : '';
        return !!(data && data.ok && text.length >= 500);
      },
      onSuccess: function (_chapterIdx, data) {
        _syncChapterMetaFromResponse(idx, data);
        _chapters[idx] = String(data.text || '').trim();
        _chapterStructured[idx] = (Array.isArray(data.sections) && data.sections.length)
          ? { sections: data.sections }
          : (data.chapterJson && typeof data.chapterJson === 'object' ? data.chapterJson : null);
        _lbSaveResult(window.__cdActiveBirthProfile || {});
      },
      onFallback: function () {
        _chapters[idx] = fallbackText;
        _chapterStructured[idx] = null;
        _lbSaveResult(window.__cdActiveBirthProfile || {});
      }
    }).then(function () {
      _currentChapter = idx + 1;
      _updateTocState();
      _renderChapter(idx + 1);
    });
  }

  function _lbEnsurePartialRegenerateControl() {
    if (typeof window.__cdAttachPartialRegenerateControl !== 'function') return;
    window.__cdAttachPartialRegenerateControl({
      key: 'life-book',
      mountSelector: '.lb-toc',
      buttonLabel: '현재 챕터 부분 재생성',
      getActiveChapter: _lbResolveActiveChapter,
      onRegenerate: _lbRegenerateChapter
    });
  }

  function _lbEnsureHistoryButton(modal) {
    var startScreen = _qs('lbStartScreen');
    if (!startScreen || !modal) return;
    var btn = _qs('lbViewSavedBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'lbViewSavedBtn';
      btn.className = 'lb-btn-generate lb-btn-history';
      btn.textContent = '📂 지난 사주 전략서 열기';
      startScreen.appendChild(btn);
      btn.addEventListener('click', function () {
        if (!_lbPendingSavedResult) return;
        _lbApplySavedResult(_lbPendingSavedResult, modal);
      });
    }
    btn.style.display = _lbPendingSavedResult ? '' : 'none';
  }

  window.openLifeBookModal = function () {
    var modal = _qs('lifeBookModal');
    if (!modal) {
      console.error('[인생의 책] lifeBookModal 요소를 찾을 수 없습니다.');
      return;
    }

    _flowLog('DETAIL_POPUP_OPEN', { message: 'open-only' });
    _lifeBookLog('ModalOpen', {});
    var profile = _getActiveBirthProfile();
    // ★ 프로필 없으면 localStorage 운명 카드(Destiny Profile)에서 복구 시도
    if (!profile) {
      try {
        var _dpNs = 'FORTUNE_APP_USER_PROFILES';
        var _dpList = JSON.parse(localStorage.getItem(_dpNs + '.list') || '[]');
        var _dpCurrId = localStorage.getItem(_dpNs + '.current');
        var _dpMatch = (_dpCurrId && _dpList.find(function(p){return p.id===_dpCurrId;})) || (_dpList.length && _dpList[0]) || null;
        if (_dpMatch && _dpMatch.birth && _dpMatch.birth.year) {
          window.__cdActiveBirthProfile = _dpMatch;
          profile = _dpMatch;
        }
      } catch (_dpE) {}
    }
    if (!profile) {
      // 입력 폼으로 스크롤 유도
      var _lbFormEl = document.getElementById('birthDate') || document.getElementById('run-btn');
      if (_lbFormEl) { try { _lbFormEl.scrollIntoView({behavior:'smooth',block:'center'}); } catch(_){} }
      alert('📜 인생의 책을 생성하려면 생년월일 · 출생 시간을 입력하고 "사주 분석 시작"을 눌러주세요.');
      return;
    }

    _lifeBookLog('ProfileResolved', {
      hasBirthDate: Boolean(profile && profile.birth && profile.birth.year),
      hasBirthTime: Boolean(profile && profile.birth && Number.isFinite(Number(profile.birth.hour))),
      gender: String((profile && profile.gender) || ''),
    });

    // 복구된 프로필이 있으면 window에 주입
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }

    _lbResumePremiumJob();

    if (_generating) {
      _showScreen('lbLoadingScreen');
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
      return;
    }

    var saved = _lbLoadSaved(profile);
    _lbPendingSavedResult = _lbHasSavedContent(saved) ? saved : null;

    _chapters = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
    _chapterStructured = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
    _chapterMeta = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
    _currentChapter = 1;
    _showScreen('lbStartScreen');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    _lbEnsureHistoryButton(modal);

    /* 출생지 선택기 초기화 */
    if (typeof window.populateCountrySelectById === 'function') {
      var locLabel = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.location && window.__cdActiveBirthProfile.location.label)
        ? window.__cdActiveBirthProfile.location.label : '대한민국 (서울)';
      window.populateCountrySelectById('lbBirthCountry', locLabel);
    }

    try {
      modal.setAttribute('aria-hidden', 'false');
      var closeBtn = modal.querySelector('.lb-modal__close');
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
    } catch (_) {}
  };

  window.closeLifeBookModal = function () {
    var modal = _qs('lifeBookModal');
    if (!modal) return;
    if (!_generating && _mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  /* ─────────────── TOC 네비게이션 ─────────────── */
  function _bindToc() {
    var nav = document.querySelector('.lb-toc');
    if (!nav) return;
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lb-chapter]');
      if (!btn) return;
      var ch = Number(btn.getAttribute('data-lb-chapter'));
      if (!ch || !_chapters[ch - 1]) return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.lb-toc-item'), function (b) {
        b.classList.toggle('active', b === btn);
        b.classList.toggle('loaded', !!_chapters[Number(b.getAttribute('data-lb-chapter')) - 1]);
      });
    });
  }

  function _renderChapter(ch) {
    var content = _qs('lbChapterContent');
    if (!content) return;
    var idx = ch - 1;
    var data = _chapters[idx];
    var structured = _chapterStructured[idx];
    if (!data && !structured) {
      content.innerHTML = '<p class="lb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';
      return;
    }
    var bodyHtml = _renderStructuredChapterBody(ch, structured);
    if (!bodyHtml && data) bodyHtml = _md2html(data);
    if (!bodyHtml && structured) bodyHtml = _md2html(_deriveTextFromChapterJson(structured));
    var html =
      '<div class="lb-chapter-wrap">' +
      _buildResultOverviewHtml() +
      '<div class="lb-chapter-header">' +
      '<span class="lb-chapter-num">제 ' + ch + '장</span>' +
      '<h2 class="lb-chapter-title">' + _escHtml(_getChapterMeta(idx).title) + '</h2>' +
      '<p class="lb-chapter-sub">' + _escHtml(_getChapterMeta(idx).subtitle) + '</p>' +
      '</div>' +
      '<div class="lb-chapter-body">' + bodyHtml + '</div>' +
      '</div>';
    content.innerHTML = html;
    content.scrollTop = 0;
    _currentChapter = Math.max(1, Math.min(LIFEBOOK_TOTAL_CHAPTERS, Number(ch || 1)));
    _updateTocState();
  }

  function _escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _getChapterMeta(idx) {
    var base = _chapterMeta[idx] || {};
    return {
      title: String(base.title || CHAPTER_TITLES[idx] || ('제 ' + (idx + 1) + '장')),
      subtitle: String(base.subtitle || CHAPTER_SUBTITLES[idx] || ''),
    };
  }

  function _syncChapterMetaFromResponse(idx, data) {
    if (!data || typeof data !== 'object') return;
    var chapterMeta = data.chapterMeta && typeof data.chapterMeta === 'object' ? data.chapterMeta : null;
    _chapterMeta[idx] = {
      title: String((chapterMeta && chapterMeta.title) || CHAPTER_TITLES[idx] || ('제 ' + (idx + 1) + '장')),
      subtitle: String((chapterMeta && chapterMeta.subtitle) || CHAPTER_SUBTITLES[idx] || ''),
      isSkeleton: false,
    };
  }

  /* ─────────────── 생성 로직 ─────────────── */
  window.generateLifeBook = function (options) {
    if (_generating) return;

    var opts = options && typeof options === 'object' ? options : {};
    var inputReportId = String(opts.reportId || '').trim();
    var inputAccessGrant = (opts.accessGrant && typeof opts.accessGrant === 'object') ? opts.accessGrant : null;
    var inputPremiumToken = String(opts.premiumAccessToken || '').trim();

    if (!_hasPremiumAccessForGeneration() && !inputAccessGrant) {
      var gateReportId = inputReportId || ('lifebook_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8));
      _flowLog('COIN_GATE_START', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: gateReportId, message: 'lifebook-gate-start' });
      _lifeBookLog('PaymentGateStart', { reportId: gateReportId });
      (async function runLifeBookGateThenGenerate() {
        try {
          var gate = await _runLifeBookCoinGate(gateReportId);
          if (!gate.ok || !gate.accessGrant) {
            var failMsg = String(gate && gate.message ? gate.message : '결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            _flowLog('PAYMENT_ACCESS_CHECK', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: gateReportId, ok: false, status: Number(gate && gate.status || 500), message: failMsg });
            alert(failMsg);
            return;
          }
          _markPremiumAccessVerified(25 * 60 * 1000);
          _flowLog('PAYMENT_CONFIRMED', {
            featureKey: LIFE_BOOK_FEATURE_KEY,
            reportId: gateReportId,
            purchaseId: String(gate.accessGrant.purchaseId || ''),
            sessionId: String(gate.accessGrant.sessionId || ''),
            requestId: String(gate.accessGrant.requestId || gate.requestId || ''),
          });
          _lifeBookLog('PaymentGateSuccess', {
            reportId: gateReportId,
            sessionId: String(gate.accessGrant.sessionId || ''),
          });
          window.generateLifeBook({
            reportId: String(gate.accessGrant.reportId || gateReportId),
            accessGrant: gate.accessGrant,
            premiumAccessToken: String(gate.premiumAccessToken || '').trim(),
          });
        } catch (error) {
          var message = String(error && error.message ? error.message : '결제 확인 중 오류가 발생했습니다.');
          _flowLog('PAYMENT_ACCESS_CHECK', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: gateReportId, ok: false, status: 500, message: message });
          alert(message);
        }
      })();
      return;
    }

    var profile = _getActiveBirthProfile();
    if (!profile) {
      alert('사주 계산을 먼저 완료해 주세요.');
      return;
    }
    _lifeBookLog('ProfileResolved', {
      hasBirthDate: Boolean(profile && profile.birth && profile.birth.year),
      hasBirthTime: Boolean(profile && profile.birth && Number.isFinite(Number(profile.birth.hour))),
      gender: String((profile && profile.gender) || ''),
    });
    // 복구된 프로필 주입
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }

    /* 모달 출생지 선택기 값으로 위치 재설정 */
    var lbCountrySel = document.getElementById('lbBirthCountry');
    if (lbCountrySel && lbCountrySel.selectedIndex >= 0) {
      var _selOpt = lbCountrySel.options[lbCountrySel.selectedIndex];
      if (_selOpt) {
        var _newLoc = {
          label: (_selOpt.textContent || _selOpt.text || '').trim(),
          lng: parseFloat(_selOpt.getAttribute('data-long') || '127.0'),
          lat: parseFloat(_selOpt.getAttribute('data-lat') || '37.6'),
          tz: _selOpt.value || 'Asia/Seoul',
          tzOffset: parseFloat(_selOpt.getAttribute('data-tz') || '9'),
          baseTzOffset: parseFloat(_selOpt.getAttribute('data-base-tz') || '9')
        };
        profile.location = _newLoc;
        if (window.__cdActiveBirthProfile) window.__cdActiveBirthProfile.location = _newLoc;
        /* 선택된 위치로 사주 원국 재계산 */
        if (typeof window.computeProfileForModal === 'function') {
          window.computeProfileForModal(profile);
        }
      }
    }

    _generating = true;
    _cancelGeneration = false;
  _lbCurrentAccessGrant = inputAccessGrant;
  _lbCurrentPremiumToken = inputPremiumToken;
    _flowLog('GENERATE_CLICK', { message: 'generation-started' });
    _chapters = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
    _chapterStructured = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
    // 사주 분석 화면과 100% 일치하도록 G_PILLARS 등 전역 변수 재계산
    if (typeof window.computeProfileForModal === 'function' && profile && profile.birth) {
      try { window.computeProfileForModal(profile); } catch (_cpE) {}
    }
    var sajuData = _collectSajuData();
    _lifeBookLog('BirthInputNormalized', {
      hasBirthDate: Boolean(profile && profile.birth && profile.birth.year),
      hasBirthTime: Boolean(profile && profile.birth && Number.isFinite(Number(profile.birth.hour))),
      birthHour: Number(profile && profile.birth ? profile.birth.hour : NaN),
      gender: String(profile && profile.gender || ''),
      calendarType: 'solar',
    });
    _flowLog('SAJU_DATA_READY', {
      featureKey: LIFE_BOOK_FEATURE_KEY,
      hasSajuData: Boolean(sajuData && sajuData.length >= 30),
      hasAccessGrant: Boolean(_lbCurrentAccessGrant),
    });

    // 핵심 출생 정보만 유효하면 서버 로컬 계산 seed(JSON)로 생성을 진행한다.
    var _hasBirthCore = Boolean(profile && profile.birth && profile.birth.year && profile.birth.month && profile.birth.day);
    if (!_hasBirthCore) {
      _generating = false;
      _lifeBookLog('ValidationBeforePayment', { ok: false, reason: 'missing_birth_core' });
      alert('생년월일 정보를 확인해 주세요. 출생 정보가 있어야 인생의 책을 생성할 수 있습니다.');
      return;
    }
    if (!sajuData || sajuData.length < 30) {
      _lifeBookLog('ValidationBeforePayment', {
        ok: true,
        reason: 'sparse_saju_data_continue_with_server_seed',
        sajuDataLength: Number((sajuData || '').length || 0)
      });
    } else {
      _lifeBookLog('ValidationBeforePayment', { ok: true });
    }

    _showScreen('lbLoadingScreen');

    var progressBar = _qs('lbProgressBar');
    var progressText = _qs('lbProgressText');
    var chapterMsg = _qs('lbLoadingChapter');
    var chapterNumEl = _qs('lbLoadingChapterNum');
    var mysticEl = _qs('lbMysticQuote');

    // 신비 멘트 인터벌 시작
    if (_mysticTimer) clearInterval(_mysticTimer);
    var _mqIdx = 0;
    if (mysticEl) {
      mysticEl.textContent = MYSTIC_QUOTES[0];
      mysticEl.classList.remove('lb-fade-out');
    }
    _mysticTimer = setInterval(function () {
      _mqIdx = (_mqIdx + 1) % MYSTIC_QUOTES.length;
      if (mysticEl) {
        mysticEl.classList.add('lb-fade-out');
        setTimeout(function () {
          if (mysticEl) {
            mysticEl.textContent = MYSTIC_QUOTES[_mqIdx];
            mysticEl.classList.remove('lb-fade-out');
          }
        }, 420);
      }
    }, 3600);

    // 챕터 아이콘 초기화
    var chDots = document.querySelectorAll('.lb-ch-dot');
    Array.prototype.forEach.call(chDots, function (d) {
      d.classList.remove('lb-ch-dot--done', 'lb-ch-dot--active');
    });
    if (chDots[0]) chDots[0].classList.add('lb-ch-dot--active');

    function _setProgress(done) {
      var pct = (done / LIFEBOOK_TOTAL_CHAPTERS) * 100;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / ' + LIFEBOOK_TOTAL_CHAPTERS + ' 챕터 완성';
      if (chapterMsg && done < LIFEBOOK_TOTAL_CHAPTERS) chapterMsg.textContent = LOADING_MSGS[done] || '분석 중...';
      if (chapterMsg && done >= LIFEBOOK_TOTAL_CHAPTERS) chapterMsg.textContent = '모든 챕터가 완성되었습니다 ✦';
      if (chapterNumEl) {
        chapterNumEl.textContent = done < LIFEBOOK_TOTAL_CHAPTERS ? ('제 ' + (done + 1) + '장') : '완료';
      }
      // 챕터 아이콘 업데이트
      Array.prototype.forEach.call(chDots, function (d) {
        var ch = Number(d.getAttribute('data-lbch'));
        var wasDone = d.classList.contains('lb-ch-dot--done');
        d.classList.toggle('lb-ch-dot--done', ch <= done);
        d.classList.toggle('lb-ch-dot--active', ch === done + 1 && done < LIFEBOOK_TOTAL_CHAPTERS);
        if (!wasDone && ch <= done) {
          d.style.animation = 'none';
          requestAnimationFrame(function(){requestAnimationFrame(function(){d.style.animation='';});});
        }
      });
    }

    _setProgress(0);

    var _lbStateMessages = {
      profile_check: '프로필 정보 확인 중',
      calculating_saju: '사주 원국 계산 중',
      daewoon_calc: '대운·세운 흐름 계산 중',
      local_draft: '사주 시드(JSON) 구성 완료 · 13챕터 LLM 생성 시작',
      seed_ready_llm_start: '사주 시드(JSON) 구성 완료 · 13챕터 LLM 생성 시작',
      writing_with_llm: 'AI 상담문 보강 중',
      rendering_pdf: 'PDF 편집/렌더링 중',
      done: '완료',
      llm_failed_local: 'AI 상담문 생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
    };

    function _setGenerationState(stateKey) {
      var msg = _lbStateMessages[String(stateKey || '')] || '인생의 책을 생성하고 있습니다.';
      if (chapterMsg) chapterMsg.textContent = msg;
      if (chapterNumEl) chapterNumEl.textContent = '진행 상태';
      _flowLog('GENERATION_STATE', { state: stateKey, message: msg });
    }

    _flowLog('LIFE_BOOK_FLOW_START', {
      featureKey: LIFE_BOOK_FEATURE_KEY,
      hasAccessGrant: Boolean(_lbCurrentAccessGrant),
      hasPremiumToken: Boolean(_lbCurrentPremiumToken),
    });
    _lifeBookLog('SessionCreateStart', {});

    (async function runLifeBookSinglePass() {
      var _lbReportId = inputReportId || 'lifebook_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      _lbCurrentReportId = _lbReportId;

      var _lbAuthToken = '';
      try { _lbAuthToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
      var _lbPremiumToken = String(_lbCurrentPremiumToken || '').trim();
      if (!_lbPremiumToken) {
        try { _lbPremiumToken = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { _lbPremiumToken = ''; }
      }
      if (!_lbPremiumToken) {
        try { _lbPremiumToken = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { _lbPremiumToken = ''; }
      }
      if (!_lbPremiumToken) {
        try { _lbPremiumToken = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { _lbPremiumToken = ''; }
      }

      var _fallbackRequestId = 'lifebook:' + _lbReportId + ':' + Date.now().toString(36);
      var _accessGrant = _lbCurrentAccessGrant && typeof _lbCurrentAccessGrant === 'object'
        ? Object.assign({}, _lbCurrentAccessGrant)
        : null;
      var _sessionId = String((_accessGrant && _accessGrant.sessionId) || ('life-book:' + _lbReportId)).trim();
      var _purchaseId = String((_accessGrant && _accessGrant.purchaseId) || '').trim();
      var _requestId = String((_accessGrant && _accessGrant.requestId) || _fallbackRequestId).trim();
      if (_accessGrant && !_accessGrant.reportId) _accessGrant.reportId = _lbReportId;
      if (_accessGrant && !_accessGrant.featureKey) _accessGrant.featureKey = LIFE_BOOK_FEATURE_KEY;

      console.info('[SajuLifeBook] access check', {
        featureKey: LIFE_BOOK_FEATURE_KEY,
        hasAccessGrant: Boolean(_accessGrant),
        hasSessionId: Boolean(_accessGrant && _accessGrant.sessionId),
        hasPurchaseId: Boolean(_accessGrant && _accessGrant.purchaseId),
        hasReportId: Boolean(_accessGrant && _accessGrant.reportId),
      });

      _setGenerationState('profile_check');
      _flowLog('PAYMENT_ACCESS_CHECK', {
        featureKey: LIFE_BOOK_FEATURE_KEY,
        reportId: _lbReportId,
        hasAccessGrant: Boolean(_accessGrant),
        hasSessionId: Boolean(_sessionId),
        hasPurchaseId: Boolean(_purchaseId),
      });
      _lifeBookLog('PaymentGateSuccess', { reportId: _lbReportId });
      _setGenerationState('calculating_saju');
      _lifeBookLog('LocalCalculationStart', { reportId: _lbReportId });
      _setGenerationState('daewoon_calc');
      _flowLog('LIFE_BOOK_GENERATION_SESSION_CREATED', {
        featureKey: LIFE_BOOK_FEATURE_KEY,
        reportId: _lbReportId,
        sessionId: _sessionId,
        purchaseId: _purchaseId,
        requestId: _requestId,
      });
      _lifeBookLog('SessionCreateSuccess', { reportId: _lbReportId, sessionId: _sessionId });

      var _headers = { 'Content-Type': 'application/json' };
      if (_lbAuthToken) _headers.Authorization = 'Bearer ' + _lbAuthToken;
      if (_lbPremiumToken) _headers['x-premium-access-token'] = _lbPremiumToken;

      var _birthHourRaw = Number(profile && profile.birth ? profile.birth.hour : NaN);
      var _birthMinuteRaw = Number(profile && profile.birth ? profile.birth.minute : NaN);
      var _birthTimeKnown = Number.isFinite(_birthHourRaw) && _birthHourRaw >= 0 && _birthHourRaw <= 23;
      var _payload = {
        serviceKey: 'saju-lifebook',
        productKey: LIFE_BOOK_FEATURE_KEY,
        featureKey: LIFE_BOOK_FEATURE_KEY,
        generationMode: 'llm-only-interpretation',
        seedSource: 'local-calculation-json',
        reportId: _lbReportId,
        sessionId: _sessionId,
        reportSessionId: _sessionId,
        purchaseId: _purchaseId || undefined,
        accessGrant: _accessGrant || undefined,
        premiumAccessToken: _lbPremiumToken || undefined,
        payment: {
          requestId: _requestId,
          purchaseId: _purchaseId || undefined,
          sessionId: _sessionId,
          reportSessionId: _sessionId,
          reportId: _lbReportId,
        },
        _paymentContext: {
          requestId: _requestId,
          purchaseId: _purchaseId || undefined,
          sessionId: _sessionId,
          reportSessionId: _sessionId,
          reportId: _lbReportId,
        },
        reason: LIFE_BOOK_REASON,
        name: String((profile && profile.name) || '사용자'),
        gender: _normalizeGenderForApi(profile && profile.gender),
        calendarType: _resolveCalendarTypeForApi(profile),
        birthDate: [profile.birth.year, String(profile.birth.month).padStart(2, '0'), String(profile.birth.day).padStart(2, '0')].join('-'),
        birthTimeKnown: _birthTimeKnown,
        hour: _birthTimeKnown ? _birthHourRaw : 12,
        minute: _birthTimeKnown ? Number.isFinite(_birthMinuteRaw) ? _birthMinuteRaw : 0 : 0,
        birthplace: String((profile && profile.location && profile.location.label) || '대한민국'),
        sajuData: String(sajuData || ''),
        analysisSignals: _collectLifeBookAnalysisSignals(profile),
      };

      _setGenerationState('seed_ready_llm_start');
      var _statusPollingStop = false;
      var _statusPollingPromise = _pollLifeBookStatus(
        _sessionId,
        _headers,
        function (_statusData) {
          if (!_statusData || typeof _statusData !== 'object') return;
          var _stateKey = String(((_statusData.progress || {}).stateKey) || '').trim();
          var _status = String(_statusData.status || '').trim();
          var _current = Number(((_statusData.progress || {}).currentChapterNo) || 0);
          var _total = Number(((_statusData.progress || {}).totalChapters) || LIFEBOOK_TOTAL_CHAPTERS);
          if (_stateKey) _setGenerationState(_stateKey);
          if (_status === 'running') {
            _setGenerationState('writing_with_llm');
          }
          if (Number.isFinite(_current) && _current > 0) {
            _setProgress(Math.min(LIFEBOOK_TOTAL_CHAPTERS, Math.max(0, _current)));
            _lifeBookLog('LLMEnhanceProgress', {
              chapterDone: Math.min(LIFEBOOK_TOTAL_CHAPTERS, Math.max(0, _current)),
              total: Number.isFinite(_total) && _total > 0 ? _total : LIFEBOOK_TOTAL_CHAPTERS,
            });
          }
          if (_status === 'done') {
            _setProgress(LIFEBOOK_TOTAL_CHAPTERS);
          }
        },
        function () { return _statusPollingStop; }
      );

      var _prepare;
      try {
        _prepare = await _postLifeBookPrepare(_payload, _headers);
      } finally {
        _statusPollingStop = true;
        await _statusPollingPromise.catch(function () {});
      }
      var _res = _prepare.res;
      var _json = _prepare.json;

      var _data = (_json && _json.data && typeof _json.data === 'object') ? _json.data : _json;
      _lbPendingPdfHtml = String((_data && _data.pdfReady && _data.pdfReady.html) || '');
      _lbPendingReportUrl = _resolveLifeBookStoredUrl(_data);
      var _manuscriptSource = String((_data && _data.manuscriptSource) || '').trim();
      if (_manuscriptSource !== 'llm-only-interpretation') {
        throw new Error('LIFE_BOOK_LLM_ONLY_REQUIRED');
      }
      var _serverChapters = Array.isArray(_data.chapters) ? _data.chapters : [];
      if (_serverChapters.length !== LIFEBOOK_TOTAL_CHAPTERS) {
        throw new Error('LIFE_BOOK_CHAPTER_COUNT_INVALID:' + _serverChapters.length);
      }
      _flowLog('LIFE_BOOK_CHAPTERS_BUILT', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: _lbReportId, chapterCount: _serverChapters.length });

      _chapters = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
      _chapterStructured = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
      _chapterMeta = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);

      for (var _i = 0; _i < LIFEBOOK_TOTAL_CHAPTERS; _i++) {
        var _ch = _serverChapters[_i] || {};
        var _text = String(_ch.text || _ch.contentMarkdown || '').trim();
        if (!_text && Array.isArray(_ch.categories)) {
          _text = _ch.categories.map(function (_cat) {
            var _title = String((_cat && _cat.title) || '').trim();
            var _body = String((_cat && (_cat.finalText || _cat.localSummary)) || '').trim();
            if (!_body) return '';
            return _title ? ('## ' + _title + '\n' + _body) : _body;
          }).filter(Boolean).join('\n\n');
        }
        _chapters[_i] = _text;
        if (!_chapters[_i] || _chapters[_i].length < 120) {
          throw new Error('LIFE_BOOK_CHAPTER_TEXT_INVALID:' + (_i + 1));
        }
        _chapterStructured[_i] = (_ch.chapterJson && typeof _ch.chapterJson === 'object')
          ? _ch.chapterJson
          : (Array.isArray(_ch.categories) ? { sections: _ch.categories.map(function (_cat) {
            return {
              title: String((_cat && _cat.title) || ''),
              body: String((_cat && (_cat.finalText || _cat.localSummary)) || ''),
            };
          }) } : null);
        _chapterMeta[_i] = {
          title: String(_ch.title || CHAPTER_TITLES[_i] || ('제 ' + (_i + 1) + '장')),
          subtitle: String(_ch.subtitle || CHAPTER_SUBTITLES[_i] || ''),
          isSkeleton: false,
        };
        if (chapterMsg) chapterMsg.textContent = 'Chapter ' + (_i + 1) + ' 정리 완료 · 다음 챕터를 준비하고 있습니다...';
        _setProgress(_i + 1);
        _lifeBookLog('LocalDraftProgress', { chapterDone: _i + 1, total: LIFEBOOK_TOTAL_CHAPTERS });
        await new Promise(function (r) { setTimeout(r, 90); });
      }

      _setGenerationState('writing_with_llm');
      _flowLog('LIFE_BOOK_LLM_ENHANCE_START', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: _lbReportId });
      _lifeBookLog('LLMEnhanceStart', { reportId: _lbReportId });
      if (_data && _data.fallbackUsed) {
        _setGenerationState('llm_failed_local');
        _lifeBookLog('LLMEnhanceFailedUseLocal', { reportId: _lbReportId });
      }

      _setGenerationState('rendering_pdf');
      _flowLog('LIFE_BOOK_PDF_RENDER_START', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: _lbReportId, chapterCount: LIFEBOOK_TOTAL_CHAPTERS });
      _lifeBookLog('PdfRenderStart', { reportId: _lbReportId });

      if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
      _generating = false;

      _showScreen('lbResultScreen');
      _updateTocState();
      _renderChapter(1);
      _bindToc();
      _lbEnsurePartialRegenerateControl();

      var prof = window.__cdActiveBirthProfile || {};
      var nameEl = _qs('lbResultName');
      var dateEl = _qs('lbResultDate');
      if (nameEl) nameEl.textContent = '📜 ' + (prof.name || '사용자') + '님의 인생의 책';
      if (dateEl) {
        var b = prof.birth || {};
        dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' 생 · ' + (prof.gender === 'F' ? '여성' : prof.gender === 'M' ? '남성' : '') + ' · 🗓️ ' + new Date().toLocaleDateString('ko-KR') + ' 발행';
      }

      _lbSaveResult(prof);
      var lbEpBanner = _qs('lbEpilogueBanner');
      if (lbEpBanner) lbEpBanner.style.display = '';
  _flowLog('LIFE_BOOK_PDF_DONE', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: _lbReportId, chapterCount: LIFEBOOK_TOTAL_CHAPTERS });
      _setGenerationState('done');
      _lifeBookLog('PdfRequestSuccess', { reportId: _lbReportId });
      _flowLog('FRONT_PREVIEW_READY', { message: 'single-pass-complete', categoryCount: LIFEBOOK_TOTAL_CHAPTERS * 6 });
    })().catch(function (error) {
      var errMsg = _normalizeLifeBookErrorMessage(error, '네트워크 요청이 중단되었습니다. 잠시 후 다시 시도해 주세요.');
      _flowLog('FRONT_PIPELINE_FAILED', { message: errMsg });
      _lifeBookLog('Error', { stage: 'generate', message: errMsg });

      _generating = false;
      _showScreen('lbStartScreen');
      alert('인생의 책 생성 중 오류가 발생했습니다.\n\n' + errMsg + '\n\n잠시 후 다시 시도해 주세요.');
    }).finally(function () {
      if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
      if (_activeRequestController) _activeRequestController = null;
      _generating = false;
      if (_cancelGeneration) {
        _flowLog('LIFE_BOOK_FLOW_CANCELLED', { reportId: _lbCurrentReportId || '' });
      }
    });
    return;
  };

  function _updateTocState() {
    var items = document.querySelectorAll('.lb-toc-item');
    var active = Math.max(1, Math.min(LIFEBOOK_TOTAL_CHAPTERS, Number(_currentChapter || 1)));
    Array.prototype.forEach.call(items, function (btn) {
      var ch = Number(btn.getAttribute('data-lb-chapter'));
      btn.classList.toggle('loaded', !!_chapters[ch - 1]);
      btn.classList.toggle('active', ch === active);
    });
  }

  /* ─────────────── PDF 다운로드 ─────────────── */
  window.downloadLifeBookPdf = function () {
    var storedUrl = _clean(_lbPendingReportUrl || '');
    if (storedUrl) {
      window.open(storedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!_chapters.length) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }

    alert('리포트 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  };

  /* ─────────────── 이벤트 위임 바인딩 ─────────────── */
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var btn = target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'openLifeBookModal') {
      // 코인 게이트 없이 타일 클릭 시 직접 모달 오픈 (결제는 생성하기 버튼에서 처리)
      window.openLifeBookModal();
      return;
    }
    if (action === 'closeLifeBookModal') {
      window.closeLifeBookModal();
      return;
    }
    if (action === 'generateLifeBook') {
      // 이미 생성 중이면 코인 차감 전에 즉시 차단
      if (_generating) {
        window.alert('인생의 책이 이미 생성 중입니다. 잠시만 기다려 주세요.');
        return;
      }
      _flowLog('GENERATE_CLICK', { message: 'button-click' });
      window.generateLifeBook();
      return;
    }
    if (action === 'downloadLifeBookPdf') {
      window.downloadLifeBookPdf();
      return;
    }
    if (action === 'shareLifeBookKakao') {
      if (typeof window.shareLifeBookKakao === 'function') window.shareLifeBookKakao();
      return;
    }
  }, false);

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = _qs('lifeBookModal');
      if (modal && modal.style.display !== 'none') {
        window.closeLifeBookModal();
      }
    }
  });

  // 모달 오버레이 클릭으로 닫기 (이미 data-action으로 처리되지만 보험용)
  var _overlay = document.querySelector('#lifeBookModal .lb-modal__overlay');
  if (_overlay) {
    _overlay.addEventListener('click', function () { window.closeLifeBookModal(); });
  }

})();
