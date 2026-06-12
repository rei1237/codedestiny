/**
 * ?몄깮??梨?(Life Book) ???꾨━誘몄뾼 ?ъ＜ ?ъ링 遺꾩꽍 + PDF ?ㅼ슫濡쒕뱶
 * CODE-DESTINY v1.0
 */
(function () {
  'use strict';

  var LIFEBOOK_TOTAL_CHAPTERS = 13;
  var LIFE_BOOK_FEATURE_KEY = 'saju_life_book_pdf';
  var LIFE_BOOK_REASON = '인생의 책 생성 (13챕터)';
  var LIFEBOOK_API_PREPARE_PATH = '/api/premium/saju-lifebook/prepare';
  var LIFEBOOK_API_STATUS_PATH = '/api/premium/saju-lifebook/status';

  /* ??????????????? ?곸닔 ??????????????? */
  var CHAPTER_TITLES = [
    '사주 원국 완전 해설 - 팔자 8글자의 비밀',
    '나의 설계도 - 오행·십성·조후와 기질의 뿌리',
    '숨겨진 무기 - 용신·희신과 나만의 안내서',
    '대운 정밀 분석 - 인생의 큰 파도',
    '격국과 사회적 운명 - 나의 성공 방정식',
    '관계의 전략 - 인연의 법칙과 파트너십',
    '연애·결혼 완전 분석 - 사랑의 구조',
    '재물과 현실 기반 - 돈이 모이는 구조',
    '직업·사업·커리어 - 세상에서 살아나는 무기',
    '건강·멘탈·에너지 관리 - 무너지지 않는 몸과 마음',
    '내면과 특수 기운 - 운명의 숨은 위치',
    '세운·월운 사용법 - 가까운 미래 전략',
    '최종 인생 로드맵 - 나답게 살아가는 법',
  ];

  var CHAPTER_SUBTITLES = [
    '연주·월주·일주·시주와 천간·지지 상호작용의 기본 구조',
    '오행·십성·조후를 중심으로 본 기질과 현실 적응 패턴',
    '용신·희신 사용법과 반복 리스크를 줄이는 실천 무기',
    '현재 대운과 다음 대운의 전환 시그널 및 장기 전략',
    '격국과 중심 구조, 사회적 역할과 성취 방식의 연결',
    '관계 패턴과 갈등 지점을 읽고 강점으로 바꾸는 실전 가이드',
    '연애 구조, 배우자궁, 이별과 회복, 지속 전략의 통합 분석',
    '재성 구조, 소비와 저축, 투자 성향과 현실 수익 설계',
    '직업, 사업, 판단과 결정에 필요한 커리어 생존 로드맵',
    '생활 리듬을 기반으로 건강·멘탈·번아웃 회복을 조율하는 법',
    '변화, 귀문, 도화, 역마 등 내면의 숨은 기운과 리스크 관리',
    '해마다 달마다 흐름에 맞춘 12개월 실행 타이밍 전략',
    '핵심 요약, 반복 패턴 정리, 3일·5주·10개월 실천 계획',
  ];

  var LOADING_MSGS = [
    '사주 원국의 팔자 8글자와 기본 뼈대를 읽는 중...',
    '오행·십성·조후와 기질의 흐름을 분석하는 중...',
    '용신·희신과 천직 강점을 탐색하는 중...',
    '대운의 큰 흐름과 현재 시기를 정밀 분석하는 중...',
    '격국과 사회적 운명의 방향을 읽는 중...',
    '궁합과 인연 관계의 법칙을 펼치는 중...',
    '연애와 결혼 구조, 이상적 관계 패턴을 분석하는 중...',
    '재물과 현실 기반, 수익 구조를 계산하는 중...',
    '직업·사업·커리어 전환 시그널을 정리하는 중...',
    '건강과 멘탈, 에너지 관리 지점을 분석하는 중...',
    '내면의 숨은 기운과 전환 전략을 정리하는 중...',
    '세운과 월운의 12개월 실행 조건을 탐색하는 중...',
    '최종 인생 로드맵을 완성하는 중...',
  ];

  var MYSTIC_QUOTES = [
    '팔자 여덟 글자 속에 당신만의 계절이 열리고 있습니다.',
    '태어난 시간의 하늘 기운이 지금의 삶과 조용히 맞물립니다.',
    '천간과 지지가 엮어 온 운명의 결을 차분히 펼칩니다.',
    '용신의 빛이 당신의 강점과 회복의 길을 밝히고 있습니다.',
    '대운은 인생의 계절입니다. 지금 머무는 계절의 뜻을 읽습니다.',
    '음양의 균형 속에서 당신에게 필요한 선택의 기준을 찾습니다.',
    '오행의 흐름은 몸과 마음, 일과 사랑의 리듬을 함께 비춥니다.',
    '격국은 하늘이 당신에게 부여한 사회적 무대의 윤곽입니다.',
    '관계의 자리에서 인연의 법칙과 회복의 문장을 발견합니다.',
    '재성의 위치가 당신의 부와 현실 감각이 모이는 길을 말해줍니다.',
    '세운이 다가오는 시기와 장소를 세밀하게 계산하고 있습니다.',
    '삶의 파도를 읽어 오직 당신을 위한 전략으로 엮습니다.',
    '신강과 신약의 경계에서 진짜 강점이 드러납니다.',
    '하늘이 남긴 천기를 당신의 이름으로 기록합니다.',
  ];

  var CHAPTER_STRUCTURED_LABELS = {
    1: ['원국 핵심 진단', '기본 뼈대 해석', '강점 구조', '주의 신호', '실행 포인트'],
    2: ['설계도 요약', '기질 분석', '의사결정 성향', '환경 적합도', '개선 전략'],
    3: ['용신 가능성', '리스크 요인', '돌파 열쇠', '성장 리듬', '실전 액션'],
    4: ['대운 흐름', '상승 구간', '주의 구간', '전환 시점', '전략 제안'],
    5: ['소명 진단', '커리어 방향', '성과 조건', '작업 방식', '도약 타이밍'],
    6: ['관계 패턴', '갈등 트리거', '경계 설정', '소통 전략', '회복 가이드'],
    7: ['연애 성향', '결혼 시그널', '관계 선택', '위험 신호', '행동 처방'],
    8: ['재물 구조', '직업 적합도', '수입 전략', '지출 관리', '축적 플랜'],
    9: ['적성 직업군', '업무 환경 적합도', '올해 커리어 패턴', '조직·프리랜서·사업 판단', '장기 커리어 설계'],
    10: ['생활 기반 건강 취약점', '스트레스 반응 패턴', '번아웃 신호와 회복', '생활 리듬 처방', '멘탈 회복 루틴'],
    11: ['도화·역마·귀문 해석', '삶에서의 발현 방식', '강점으로 쓰는 법', '위험 구간과 트리거', '실전 조절법'],
    12: ['올해 핵심 흐름', '월별 주의 포인트', '기회가 강한 시기', '올해 결정 타이밍', '12개월 행동 전략'],
    13: ['사주 핵심 요약', '붙잡아야 할 방향', '버려야 할 반복 패턴', '3일·5주·10개월 로드맵', '최종 상담 메시지'],
  };

  /* ??????????????? ?곹깭 ??????????????? */
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

  function _lifeBookShortList(value, limit) {
    var source = Array.isArray(value) ? value : [];
    return source.map(function (item) { return _clean(item); }).filter(Boolean).slice(0, Math.max(1, Number(limit || 6)));
  }

  function _lifeBookPayloadSafe(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.error && typeof data.error === 'object' ? data.error : {};
    var debugSafe = data.debugSafe && typeof data.debugSafe === 'object' ? data.debugSafe : {};
    return {
      code: _clean(data.code || nested.code || data.errorCode || nested.errorCode) || undefined,
      message: _clean(data.message || nested.message || data.reason || data.reasonMessage || nested.reasonMessage) || undefined,
      stage: _clean(data.stage || data.failureStage || debugSafe.stage || nested.stage || nested.failureStage) || undefined,
      failureType: _clean(data.failureType || debugSafe.failureType || nested.failureType) || undefined,
      reportId: _clean(data.reportId || debugSafe.reportId || nested.reportId) || undefined,
      executionId: _clean(data.executionId || debugSafe.executionId || nested.executionId) || undefined,
      missing: _lifeBookShortList(data.missing || nested.missing || data.hardMissingFields, 6),
      issues: _lifeBookShortList(data.issues || nested.issues || data.errors || nested.errors, 6),
      debugSafe: Object.keys(debugSafe).length ? debugSafe : undefined
    };
  }

  function _buildLifeBookApiError(pack, fallbackMessage) {
    var res = pack && pack.res ? pack.res : {};
    var payload = pack && pack.json && typeof pack.json === 'object' ? pack.json : {};
    var safe = _lifeBookPayloadSafe(payload);
    var message = _clean(safe.message || fallbackMessage || ('HTTP ' + (res.status || '')));
    var err = new Error(message || '인생의 책 PDF 요청을 처리하지 못했습니다.');
    err.status = Number(res.status || payload.status || payload.statusCode || 0) || undefined;
    err.code = _clean(safe.code) || 'LIFE_BOOK_REQUEST_FAILED';
    err.stage = _clean(safe.stage) || 'prepare';
    err.failureType = _clean(safe.failureType);
    err.reportId = _clean(safe.reportId);
    err.executionId = _clean(safe.executionId);
    err.missing = safe.missing;
    err.issues = safe.issues;
    err.payloadSafe = safe;
    err.payload = payload;
    return err;
  }

  function _logLifeBookError(error, meta) {
    try {
      var payloadSafe = error && error.payloadSafe
        ? error.payloadSafe
        : _lifeBookPayloadSafe((error && error.payload) || (error && typeof error === 'object' ? error : {}));
      var safe = {
        serviceKey: 'saju-lifebook',
        featureKey: LIFE_BOOK_FEATURE_KEY,
        reportType: 'sajuLifeBook',
        stage: _clean(meta && meta.stage || error && error.stage || payloadSafe.stage) || 'unknown',
        failureType: _clean(error && error.failureType || payloadSafe.failureType) || undefined,
        status: Number(error && error.status || meta && meta.status || 0) || undefined,
        code: _clean(error && (error.code || error.name) || payloadSafe.code) || 'LIFE_BOOK_CLIENT_ERROR',
        message: _clean(error && error.message ? error.message : error) || 'unknown',
        requestId: _clean(meta && meta.requestId || error && error.requestId) || undefined,
        sessionId: _clean(meta && meta.sessionId || error && error.sessionId) || undefined,
        reportId: _clean(meta && meta.reportId || error && error.reportId || payloadSafe.reportId || _lbCurrentReportId) || undefined,
        executionId: _clean(meta && meta.executionId || error && error.executionId || payloadSafe.executionId) || undefined,
        missing: _lifeBookShortList(error && error.missing || payloadSafe.missing, 6),
        issues: _lifeBookShortList(error && error.issues || payloadSafe.issues, 6),
        causeMessage: _clean(error && error.cause && (error.cause.message || error.cause)) || undefined,
        payloadSafe: payloadSafe
      };
      console.error('[LifeBook][Error][' + safe.stage + ']', safe);
    } catch (_) {}
  }

  function _resolveLifeBookStoredUrl(payload) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    return _clean(
      ready.downloadUrl
      || ready.pdfUrl
      || p.downloadUrl
      || p.pdfUrl
      || ready.htmlUrl
      || p.htmlUrl
    );
  }

function _buildArchiveFormatUrl(rawUrl, format) {
  var url = _clean(rawUrl || '');
  if (!url || format !== 'pdf' && format !== 'html') return url;
  if (!/\/api\/premium\/pdf-archive\//.test(url)) return url;
  if (/[?&]format=(pdf|html)/i.test(url)) return url;
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'format=' + encodeURIComponent(format);
}

function _isElementVisible(el) {
  if (!el) return false;
  if (el.style && el.style.display === 'none') return false;
  var cs = window.getComputedStyle(el);
  if (!cs || cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function _getLifeBookDownloadTargets() {
  var rawPdf = _lbPendingPdfUrl || _lbPendingReportUrl || '';
  var rawHtml = _lbPendingHtmlUrl || _lbPendingReportUrl || '';
  var baseUrl = _clean(_lbCurrentReportId)
      ? '/api/premium/pdf-archive/' + encodeURIComponent(_lbCurrentReportId)
      : '';
  var pdfUrl = _buildArchiveFormatUrl(rawPdf, 'pdf');
  var htmlUrl = _buildArchiveFormatUrl(rawHtml, 'html');
  if (!/\/api\/premium\/pdf-archive\//i.test(pdfUrl) && baseUrl) {
    pdfUrl = _buildArchiveFormatUrl(baseUrl, 'pdf');
  }
  if (!/\/api\/premium\/pdf-archive\//i.test(htmlUrl) && baseUrl) {
    htmlUrl = _buildArchiveFormatUrl(baseUrl, 'html');
  }

  return {
    pdfUrl: pdfUrl,
    htmlUrl: htmlUrl,
    html: _lbPendingPdfHtml || _buildLifeBookResultHtmlForDownload(),
  };
}

function _buildLifeBookResultHtmlForDownload() {
  if (!Array.isArray(_chapters) || !_chapters.length) return '';
  var hasRendered = _chapters.filter(function (c) { return typeof c === 'string' && c.trim().length >= 120; }).length;
  if (!hasRendered) return '';

  var safeName = _escHtml((window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.name) || '인생의 책');
  var parts = [];
  for (var i = 0; i < _chapters.length; i++) {
    var title = String((window.CD_CHAPTER_TITLES && window.CD_CHAPTER_TITLES[i]) || ('Chapter ' + (i + 1))).trim();
    var text = _md2html(String(_chapters[i] || '').trim() || '내용 준비 중...');
    parts.push(
      '<section style="margin:10px 0;border-top:1px solid rgba(255,255,255,.12);padding-top:10px;">' +
      '<h2 style="margin:0 0 8px;font-size:18px;color:#f8fafc;">' + _escHtml(title) + '</h2>' +
      '<div style="font-size:13px;line-height:1.85;color:#dce8fb;">' + text + '</div>' +
      '</section>'
    );
  }

  return [
    '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + safeName + ' PDF 저장본</title>',
    '<style>',
    'body{margin:24px;background:#0f172a;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;line-height:1.8;}',
    'h1{font-size:26px;line-height:1.3;margin:0 0 8px;}',
    '.meta{opacity:.75;margin-bottom:16px;font-size:12px;}',
    'section{margin-top:18px;}',
    'h2{margin:0 0 8px;font-size:17px;}',
    '</style></head><body><div style="max-width:860px;margin:0 auto;">',
    '<h1>' + safeName + ' 결과</h1>',
    '<div class="meta">생성 시각: ' + _escHtml(new Date().toLocaleString('ko-KR')) + '</div>',
    _buildResultOverviewHtml ? _buildResultOverviewHtml() : '',
    parts.join(''),
    '</div></body></html>'
  ].join('');
}

function _attemptDownloadUrl(url, filename) {
    var targetUrl = _clean(url);
    if (!targetUrl) return false;
    try {
      var a = document.createElement('a');
      a.href = targetUrl;
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
      if (filename) a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (_) {}
    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return true;
    } catch (_) {}
    return false;
  }

  function _downloadBlobContent(content, filename, mime) {
    if (!content) return false;
    try {
      var blob = content instanceof Blob ? content : new Blob([content], { type: mime });
      var blobUrl = URL.createObjectURL(blob);
      var ok = _attemptDownloadUrl(blobUrl, filename);
      setTimeout(function () {
        try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      }, 1200);
      return ok;
    } catch (_) {
      return false;
    }
  }

function _downloadLifeBookUrlAsBlob(url, filename) {
  var targetUrl = _clean(url);
  if (!targetUrl) return Promise.resolve(false);
  try {
    var target = new URL(targetUrl, window.location.href);
    if (target.origin === window.location.origin) {
      return fetch(target.toString(), { credentials: 'include', cache: 'no-store' }).then(function (response) {
        if (!response || !response.ok) return false;
        return response.blob().then(function (blob) {
          if (!blob || !blob.size) return false;
          var fileType = response.headers && response.headers.get('content-type') || '';
          if (/\bpdf\b/i.test(String(filename || '')) && !/pdf|octet-stream/i.test(fileType) && /text\/html/i.test(fileType)) return false;
          return _downloadBlobContent(blob, filename, fileType) || false;
        });
      }).catch(function () {
        return false;
      });
    }
  } catch (_) {}
  return Promise.resolve(false);
}

function _downloadLifeBookUrlWithFallback(url, filename) {
  return _downloadLifeBookUrlAsBlob(url, filename).then(function (ok) {
    if (ok) return true;
    return _attemptDownloadUrl(url, filename);
  });
}

var _generating = false;
var _lbGenerationStartedAt = 0;
var _currentChapter = 1;
  var _mysticTimer = null;
  var _activeRequestController = null;
  var _cancelGeneration = false;
  var _lbPendingSavedResult = null;
  var _lbPendingPdfUrl = '';
  var _lbPendingHtmlUrl = '';
  var _lbPendingPdfHtml = '';
  var _lbPendingReportUrl = '';
  var _lbJobStateKey = 'cd:premium-job:life-book';
  var _lbCurrentReportId = '';
  var _lbCurrentAccessGrant = null;
  var _lbCurrentPremiumToken = '';
  var _lbGenerationRunId = '';
  var _lbGenerationStartAt = 0;
  var _lbPartialFetchChapter = null;

function _startLifeBookGenerationState() {
  _lbGenerationStartAt = Date.now();
  _lbGenerationStartedAt = _lbGenerationStartAt;
  _lbGenerationRunId = 'lb-run-' + _lbGenerationStartAt + '-' + Math.random().toString(36).slice(2, 8);
  _generating = true;
  _cancelGeneration = false;
}

function _clearLifeBookGenerationState() {
  _generating = false;
  _lbGenerationStartedAt = 0;
  _lbGenerationRunId = '';
  _lbGenerationStartAt = 0;
}

var _LB_LIFE_BOOK_BUSY_TIMEOUT_MS = 12 * 60 * 1000;

function _isLifeBookGenerationBusy() {
  if (!_generating) return false;
  var loading = _qs('lbLoadingScreen');
  var loadingVisible = _isElementVisible(loading);
  if (loadingVisible) return true;
  if (_mysticTimer) return true;
  if (!_lbGenerationStartAt) {
    _clearLifeBookGenerationState();
    return false;
  }
  if (Date.now() - _lbGenerationStartAt < 800) return true;
  if (Date.now() - _lbGenerationStartAt > _LB_LIFE_BOOK_BUSY_TIMEOUT_MS) {
    _clearLifeBookGenerationState();
    return false;
  }
  return true;
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

    if (typeof window._cdOpenPaidServiceGate === 'function') {
      var gateResult = await new Promise(function(resolve) {
        var settled = false;
        function finish(payload) {
          if (settled) return;
          settled = true;
          var raw = payload && typeof payload === 'object' ? payload : {};
          var data = raw && raw.data && typeof raw.data === 'object'
            ? raw.data
            : (raw && raw.payload && typeof raw.payload === 'object')
              ? raw.payload
              : raw;
          var issuedToken = String(data.premiumAccessToken || raw.premiumAccessToken || '').trim();
          if (issuedToken) _persistPremiumAccessToken(issuedToken);
          var accessGrant = _normalizeLifeBookAccessGrant(data, reportId, requestId);
          resolve({
            ok: !!accessGrant,
            status: accessGrant ? 200 : 500,
            message: accessGrant ? '' : '결제 접근 권한을 확인하지 못했습니다.',
            accessGrant: accessGrant,
            premiumAccessToken: issuedToken,
            requestId: requestId,
          });
        }
        function cancel() {
          if (settled) return;
          settled = true;
          resolve({ ok: false, status: 402, message: '결제가 취소되었습니다.', requestId: requestId });
        }
        function fail(error) {
          if (settled) return;
          settled = true;
          resolve({
            ok: false,
            status: Number(error && error.status || 0),
            message: String(error && error.message || '결제 게이트를 불러오지 못했습니다.'),
            requestId: requestId,
            fallback: true,
          });
        }
        try {
          var gate = window._cdOpenPaidServiceGate({
            categoryKey: 'premium-report',
            featureKey: LIFE_BOOK_FEATURE_KEY,
            title: LIFE_BOOK_REASON,
            reason: LIFE_BOOK_REASON,
            coinPrice: 500,
            cost: 500,
            reportId: String(reportId || '').trim() || undefined,
            sessionId: String(reportId || '').trim() ? ('life-book:' + String(reportId).trim()) : undefined,
            reportSessionId: String(reportId || '').trim() ? ('life-book:' + String(reportId).trim()) : undefined,
            requestId: requestId,
            onGranted: function(_transactionId, payload) { finish(payload); },
            onPassApplied: function(access) { finish((access && (access.payload || access.rawPayload)) || access || {}); },
            onCancel: cancel
          });
          if (gate && typeof gate.then === 'function') gate.then(function(payload) {
            if (payload === null || payload === undefined || (payload && payload.status === 'cancelled')) cancel();
            else finish(payload);
          }).catch(fail);
          else if (!gate) fail(new Error('결제 게이트를 불러오지 못했습니다.'));
        } catch (_) {
          fail(_);
        }
      });
      if (gateResult.ok || Number(gateResult.status) === 402 || !gateResult.fallback) return gateResult;
    }

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

  function _abortActiveRequest() {
    if (_activeRequestController) {
      try { _activeRequestController.abort(); } catch (_) {}
      _activeRequestController = null;
    }
  }

  /* ??????????????? ?좏떥 ??????????????? */
  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }

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
      var lastErr = null;

      function doneOk(out) {
        if (settled) return;
        settled = true;
        resolve(out);
      }

      function doneFail(message, meta) {
        if (settled) return;
        settled = true;
        if (message instanceof Error) {
          reject(message);
          return;
        }
        var err = new Error(message || '인생의 책 로컬 생성 요청에 실패했습니다.');
        if (meta && typeof meta === 'object') {
          err.status = Number(meta.status || 0);
          err.code = String(meta.code || '').trim();
        }
        reject(err);
      }

      function runNext() {
        if (idx >= endpoints.length) {
          doneFail(lastErr || '인생의 책 로컬 생성 요청에 실패했습니다.');
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
              var hardCode = String((pack.json && (pack.json.code || (pack.json.error && pack.json.error.code))) || '').trim();
              var hardMessage = String(
                (pack.json && (pack.json.message || pack.json.reason || pack.json.code))
                || (pack.res.status === 401 ? '로그인이 필요합니다.' : '프리미엄 결제 확인이 필요합니다.')
              );
              doneFail(_buildLifeBookApiError(pack, hardMessage), { status: Number(pack.res.status || 0), code: hardCode });
              return;
            }

            var msg = pack && pack.json
              ? (pack.json.message || pack.json.reason || pack.json.code || '')
              : '';
            lastErr = _buildLifeBookApiError(pack, String(msg || ('HTTP ' + (pack && pack.res ? pack.res.status : 'ERR'))));
            runNext();
          })
          .catch(function (err) {
            clearTimeout(timerId);
            lastErr = err instanceof Error ? err : new Error(_normalizeLifeBookErrorMessage(err, '요청이 중단되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.'));
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
      var lastErr = null;

      function doneOk(out) {
        if (settled) return;
        settled = true;
        resolve(out);
      }

      function doneFail(message) {
        if (settled) return;
        settled = true;
        if (message instanceof Error) {
          reject(message);
          return;
        }
        reject(new Error(message || '인생의 책 생성 상태 조회에 실패했습니다.'));
      }

      function runNext() {
        if (idx >= endpoints.length) {
          doneFail(lastErr || '인생의 책 생성 상태 조회에 실패했습니다.');
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
              doneFail(_buildLifeBookApiError(pack, String((pack.json && (pack.json.message || pack.json.reason || pack.json.code)) || '인증 또는 결제 상태를 확인해 주세요.')));
              return;
            }
            lastErr = _buildLifeBookApiError(pack, String(
              (pack && pack.json && (pack.json.message || pack.json.code))
              || ('HTTP ' + (pack && pack.res ? pack.res.status : 'ERR'))
            ));
            runNext();
          })
          .catch(function (err) {
            clearTimeout(timerId);
            lastErr = err instanceof Error ? err : new Error(_normalizeLifeBookErrorMessage(err, '?곹깭 議고쉶 ?붿껌??以묐떒?섏뿀?듬땲??'));
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
        // ?곹깭 議고쉶 ?ㅽ뙣??理쒖쥌 prepare ?묐떟?쇰줈 蹂듦뎄 媛?ν븯誘濡??대쭅? 吏?랁븳??
      }
      if (typeof shouldStop === 'function' && shouldStop()) return;
      await new Promise(function (r) { setTimeout(r, 1800); });
    }
  }

  function _extractLifeBookChaptersFromData(data) {
    var source = data && typeof data === 'object' ? data : {};
    if (Array.isArray(source.chapters)) return source.chapters;
    if (source.pdfReady && Array.isArray(source.pdfReady.chapters)) return source.pdfReady.chapters;
    if (source.data && Array.isArray(source.data.chapters)) return source.data.chapters;
    if (source.data && source.data.pdfReady && Array.isArray(source.data.pdfReady.chapters)) return source.data.pdfReady.chapters;
    return [];
  }

  function _isLifeBookRunningData(data) {
    var source = data && typeof data === 'object' ? data : {};
    var status = String(source.status || source.serverStatus || (source.data && (source.data.status || source.data.serverStatus)) || '').toLowerCase();
    return status === 'running' || status === 'queued' || status === 'processing' || status === 'generating' || status === 'pending';
  }

  function _normalizeLifeBookDoneData(data) {
    var source = data && typeof data === 'object' ? data : {};
    var nested = source.data && typeof source.data === 'object' ? source.data : {};
    var pdfReady = source.pdfReady || nested.pdfReady || null;
    var chapters = _extractLifeBookChaptersFromData(source);
    return Object.assign({}, nested, source, {
      chapters: chapters,
      pdfReady: pdfReady,
      pdfUrl: source.pdfUrl || nested.pdfUrl || (pdfReady && (pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)) || '',
      htmlUrl: source.htmlUrl || nested.htmlUrl || (pdfReady && pdfReady.htmlUrl) || '',
      canDownload: Boolean(source.canDownload || nested.canDownload || (pdfReady && (pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl))),
    });
  }

  async function _waitLifeBookStatusDone(sessionId, headers, onProgress, shouldStop) {
    var startedAt = Date.now();
    var maxWaitMs = 20 * 60 * 1000;
    for (;;) {
      if (typeof shouldStop === 'function' && shouldStop()) throw new Error('LIFE_BOOK_CANCELLED');
      var data = await _fetchLifeBookStatus(sessionId, headers);
      if (data && typeof onProgress === 'function') onProgress(data);
      var normalized = _normalizeLifeBookDoneData(data);
      var status = String((data && data.status) || normalized.status || '').toLowerCase();
      var chapters = _extractLifeBookChaptersFromData(normalized);
      if (status === 'done' || status === 'completed' || (chapters.length === LIFEBOOK_TOTAL_CHAPTERS && normalized.canDownload)) {
        return normalized;
      }
      if (status === 'failed') {
        var failed = new Error(String((data && data.error && data.error.message) || 'LIFE_BOOK_BACKGROUND_FAILED'));
        failed.code = String((data && data.error && data.error.code) || 'LIFE_BOOK_BACKGROUND_FAILED');
        failed.payload = data;
        throw failed;
      }
      if (Date.now() - startedAt > maxWaitMs) {
        var timeout = new Error('LIFE_BOOK_BACKGROUND_TIMEOUT');
        timeout.code = 'LIFE_BOOK_BACKGROUND_TIMEOUT';
        throw timeout;
      }
      await new Promise(function (r) { setTimeout(r, 1800); });
    }
  }

  function _buildResultOverviewHtml() {
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var profile = window.__cdActiveBirthProfile || {};
    var powerLabel = String(
      analysis.power_label
      || ((window.G_POWER && window.G_POWER.isStrong) ? '강한 기운' : (window.G_POWER ? '약한 기운' : '기본'))
    );
    var yongshin = '';
    if (Array.isArray(analysis.yongshin_elements) && analysis.yongshin_elements.length) {
      yongshin = analysis.yongshin_elements.join('·');
    } else if (window.G_POWER && Array.isArray(window.G_POWER.yongshin) && window.G_POWER.yongshin.length) {
      yongshin = window.G_POWER.yongshin.join('·');
    }

    var weights = analysis.elementWeights || {};
    var elemRows = [
      { key: 'wood', label: '목', value: Number(weights.wood || 0) },
      { key: 'fire', label: '화', value: Number(weights.fire || 0) },
      { key: 'earth', label: '토', value: Number(weights.earth || 0) },
      { key: 'metal', label: '금', value: Number(weights.metal || 0) },
      { key: 'water', label: '수', value: Number(weights.water || 0) },
    ];
    elemRows.sort(function (a, b) { return b.value - a.value; });
    var dominant = elemRows[0] || { label: '-', value: 0 };
    var completed = _chapters.filter(function (c) { return typeof c === 'string' && c.trim().length > 0; }).length;
    var completionPct = Math.round((completed / LIFEBOOK_TOTAL_CHAPTERS) * 100);
    var name = String(profile.name || '고객님');

    return '' +
      '<section style="margin-bottom:14px;padding:14px;border:1px solid rgba(148,163,184,.35);border-radius:14px;background:linear-gradient(155deg,rgba(15,23,42,.95),rgba(30,41,59,.95));">' +
      '  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
      '    <span style="font-size:11px;font-weight:700;letter-spacing:.05em;padding:4px 8px;border-radius:999px;background:rgba(99,102,241,.22);border:1px solid rgba(99,102,241,.45);color:#e2e8f0;">PRECISION SNAPSHOT</span>' +
      '    <span style="font-size:12px;opacity:.88;">' + _escHtml(name) + ' · 완료율 ' + completionPct + '%</span>' +
      '  </div>' +
      '  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-bottom:8px;">' +
      '    <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);">' +
      '      <div style="font-size:11px;opacity:.7;letter-spacing:.04em;">강약</div>' +
      '      <div style="font-size:16px;font-weight:700;margin-top:4px;">' + _escHtml(powerLabel) + '</div>' +
      '    </div>' +
      '    <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);">' +
      '      <div style="font-size:11px;opacity:.7;letter-spacing:.04em;">지배기운</div>' +
      '      <div style="font-size:16px;font-weight:700;margin-top:4px;">' + _escHtml(dominant.label + ' (' + dominant.value + '%)') + '</div>' +
      '    </div>' +
      '    <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);">' +
      '      <div style="font-size:11px;opacity:.7;letter-spacing:.04em;">용신</div>' +
      '      <div style="font-size:16px;font-weight:700;margin-top:4px;">' + _escHtml(yongshin || '정보 없음') + '</div>' +
      '    </div>' +
      '  </div>' +
      '  <div style="font-size:12px;line-height:1.6;opacity:.9;padding:8px 2px 0;border-top:1px solid rgba(255,255,255,.12);">5행성 분포: ' +
      '    ' + _escHtml(elemRows.map(function (item) { return item.label + ' ' + item.value + '%'; }).join(' | ')) +
      '  </div>' +
      '</section>';
  }

  /**
   * Markdown ?띿뒪?몃? 媛꾨떒?섍쾶 HTML濡?蹂??   */
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
      var title = String(row.title || row.label || labels[i] || ('?듭떖 ??ぉ ' + (i + 1)));
      out.push('<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">' + _escHtml(title) + '</h4><div class="lb-result-article__section-body">' + _md2html(body) + '</div></section>');
    }
    if (!out.length) return '';
    return '<div class="lb-result-article__structured">' + out.join('') + '</div>';
  }

  /**
   * ?ъ＜ ?곗씠???섏쭛 ??window.__destinyFlowerSajuSnapshot, __cdActiveBirthProfile ??   */
  /*
  function _collectSajuData() {
    var profile = window.__cdActiveBirthProfile || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};

    var name = profile.name || snap.name || '?ъ슜??;
    var gender = profile.gender || snap.gender || '';
    var birth = profile.birth || snap.birth || {};

    var lines = [];
    lines.push('?먮텇??????뺣낫??);
    lines.push('?대쫫: ' + name);
    lines.push('?깅퀎: ' + (gender === 'F' ? '?ъ꽦' : gender === 'M' ? '?⑥꽦' : gender || '誘몄긽'));

    if (birth.year) {
      lines.push('?앸뀈?붿씪: ' + birth.year + '??' + (birth.month || '') + '??' + (birth.day || '') + '??);
      lines.push('異쒖깮 ?쒓컖: ' + (birth.hour !== undefined ? birth.hour + '??' : '') + (birth.minute !== undefined ? birth.minute + '遺? : ''));
    }

    if (profile.location && profile.location.label) {
      lines.push('異쒖깮吏: ' + profile.location.label);
    }

    // ?먭뎅 ?ъ＜ 湲곕뫁
    var G = window.G_PILLARS;
    if (G) {
      lines.push('\n?먯궗二??먭뎅(?쎿윶)??);
      if (G.y) lines.push('?꾩＜(亮닸윶): ' + (G.y.g || '') + (G.y.j || '') + (G.y.gE ? ' [' + G.y.gE + '/' + G.y.jE + ']' : ''));
      if (G.m) lines.push('?붿＜(?덃윶): ' + (G.m.g || '') + (G.m.j || '') + (G.m.gE ? ' [' + G.m.gE + '/' + G.m.jE + ']' : ''));
      if (G.d) lines.push('?쇱＜(?ζ윶): ' + (G.d.g || '') + (G.d.j || '') + (G.d.gE ? ' [' + G.d.gE + '/' + G.d.jE + ']' : ''));
      if (G.h) lines.push('?쒖＜(?귝윶): ' + (G.h.g || '') + (G.h.j || '') + (G.h.gE ? ' [' + G.h.gE + '/' + G.h.jE + ']' : ''));
    }

    // ?? ?ㅽ뻾 遺꾪룷
    var analysis = snap.analysis || snap.saju || {};
    if (analysis.elementWeights) {
      var w = analysis.elementWeights;
      lines.push('\n?먯삤??雅붻죱) 遺꾪룷 ???? 紐낅━ ?붿쭊??);
      lines.push('紐???: ' + (w.wood || 0) + '% | ????: ' + (w.fire || 0) + '% | ????: ' + (w.earth || 0) + '% | 湲???: ' + (w.metal || 0) + '% | ??麗?: ' + (w.water || 0) + '%');
      // 理쒓컯/理쒖빟 ?ㅽ뻾
      var elArr = [['紐???',w.wood||0],['????',w.fire||0],['????',w.earth||0],['湲???',w.metal||0],['??麗?',w.water||0]];
      elArr.sort(function(a,b){return b[1]-a[1];});
      lines.push('理쒓컯 ?ㅽ뻾: ' + elArr[0][0] + ' (' + elArr[0][1] + '%) ??怨쇰떎 ??湲곗떊 ?묒슜 二쇱쓽');
      lines.push('理쒖빟 ?ㅽ뻾: ' + elArr[4][0] + ' (' + elArr[4][1] + '%) ??寃고븤 湲곗슫, ?⑹떊 ?꾨낫');
    }

    // ?? [1遺 ?섏쓽 ?ㅺ퀎?? ?붿?쨌?쇨컙쨌吏吏 ?ы솕
    var G_PILLARS_R = window.G_PILLARS;
    if (G_PILLARS_R) {
      lines.push('\n??遺. ?섏쓽 ?ㅺ퀎?????붿?쨌?쇨컙쨌吏吏 ?뺣? 遺꾩꽍??);
      if (G_PILLARS_R.m && G_PILLARS_R.m.j) {
        lines.push('?붿?(?덃뵱): ' + G_PILLARS_R.m.j + (G_PILLARS_R.m.jE ? ' [' + G_PILLARS_R.m.jE + ']' : '') + ' ???쒖뼱??怨꾩젅쨌?섍꼍??湲곗슫. ?띠쓽 臾대?? ?쒖씠?꾨? 寃곗젙');
      }
      if (G_PILLARS_R.d) {
        lines.push('?쇨컙(?ε묾): ' + (G_PILLARS_R.d.g||'') + (G_PILLARS_R.d.gE ? ' [' + G_PILLARS_R.d.gE + ']' : '') + ' ???섏쓽 ?듭떖 ?뺤껜?? 二쇰룄??vs ?묒“??湲곗쭏??洹쇱썝');
        lines.push('?쇱?(?ζ뵱): ' + (G_PILLARS_R.d.j||'') + (G_PILLARS_R.d.jE ? ' [' + G_PILLARS_R.d.jE + ']' : '') + ' ???섏쓽 ?대㈃ ?ъ꽦, 諛곗슦?먭턿, 媛먯젙??寃?);
      }
      // 吏吏 4媛??????몄깮 諛섎났 ?⑦꽩
      var zhiList = [];
      ['y','m','d','h'].forEach(function(k){
        if (G_PILLARS_R[k] && G_PILLARS_R[k].j) zhiList.push(G_PILLARS_R[k].j + (G_PILLARS_R[k].jE ? '['+G_PILLARS_R[k].jE+']' : ''));
      });
      if (zhiList.length) lines.push('吏吏(?경뵱) ?꾩껜: ' + zhiList.join(' 쨌 ') + ' ???띠뿉 諛섎났 異쒗쁽?섎뒗 ?곹솴 ?⑦꽩');
      // 怨꾩젅(議고썑)
      var johuType = (window.G_JOHU && window.G_JOHU.type) ? window.G_JOHU.type : (analysis.johuType || analysis.johu_type || '');
      if (johuType) lines.push('議고썑(沃욕? ?먯젙: ' + johuType + (johuType==='hot'?' ???④굅???щ쫫 ?ъ＜, 麗는룬뇫 ?섍꼍?먯꽌 ?λ젰 理쒕???:johuType==='cold'?' ??李④???寃⑥슱 ?ъ＜, ?ヂ룡쑉 ?섍꼍?먯꽌 ?λ젰 理쒕???:johuType==='warm'?' ???곕쑜??遊??щ쫫 ?ъ＜':johuType==='cool'?' ???좎꽑??媛??寃⑥슱 ?ъ＜':''));
    }

    // ?? [2遺 ?④꺼吏?臾닿린] ?⑹떊쨌?ъ떊쨌Specialist vs Generalist
    var G_POWER = window.G_POWER;
    var G_JOHU = window.G_JOHU;
    lines.push('\n??遺. ?④꺼吏?臾닿린 ???⑹떊쨌?ъ떊쨌泥쒖쭅 ?뱀꽦 遺꾩꽍??);
    if (analysis.yongshin_elements && analysis.yongshin_elements.length) {
      lines.push('?⑹떊(?①쪥): ' + analysis.yongshin_elements.join(', ') + ' ???닿? 媛?????????덈뒗 ?꾩궡湲??ㅽ뻾');
    }
    if (analysis.kishin_elements && analysis.kishin_elements.length) {
      lines.push('湲곗떊(恙뚨쪥): ' + analysis.kishin_elements.join(', ') + ' ???먮꼫吏瑜??뚯쭊?쒗궎???μ븷 ?ㅽ뻾');
    }
    if (G_POWER) {
      if (G_POWER.yongshin) lines.push('?⑹떊 ?곸꽭: ' + (Array.isArray(G_POWER.yongshin) ? G_POWER.yongshin.join(', ') : G_POWER.yongshin));
      if (G_POWER.kijishin && G_POWER.kijishin.length) lines.push('湲곗떊 ?곸꽭: ' + G_POWER.kijishin.join(', '));
    }
    // ?쇨컙/?좉컯?좎빟
    if (analysis.dayStem) lines.push('?쇨컙(?ε묾): ' + analysis.dayStem);
    if (analysis.power_label) lines.push('?좉컯/?좎빟: ' + analysis.power_label + (analysis.power_label==='?좉컯'?' ???먭린 二쇰룄??媛? ?먮꼫吏 怨쇰떎 二쇱쓽. ?곴?쨌?앹떊?쇰줈 諛쒖궛 沅뚯옣':' ??吏吏 湲곕컲 ?꾩슂. ?몄꽦쨌鍮꾧쾪 ?댁뿉??鍮꾩빟???깆옣'));
    if (analysis.isJong) lines.push('寃??먯젙: ' + (analysis.jongName || '醫낃꺽') + ' ??醫낃꺽? ?⑹떊???곕Ⅴ??諛⑺뼢?쇰줈 嫄곗뒪瑜댁? 留?寃?);

    // Specialist vs Generalist ?먮퀎
    // G_POWER.groups??calcPower() 諛섑솚媛믪뿉 ?놁쑝誘濡?G_PILLARS 湲곕컲?쇰줈 吏곸젒 怨꾩궛
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
        if (t && t !== '?' && t !== '?쇨컙') _tgGroups[t] = (_tgGroups[t] || 0) + 1;
      });
    } else if (G_POWER && G_POWER.groups) {
      _tgGroups = G_POWER.groups;
    }
    if (_tgGroups && Object.keys(_tgGroups).length > 0) {
      lines.push('\n?먯떗???곫삜) 遺꾪룷 ??Specialist/Generalist ?먮퀎 湲곕컲??);
      var gk = Object.keys(_tgGroups);
      for (var gi = 0; gi < gk.length; gi++) {
        lines.push(gk[gi] + ': ' + _tgGroups[gk[gi]]);
      }
      // Specialist: 愿??媛뺥븯怨?鍮꾧쾪 ??/ Generalist: ?앹긽 媛뺥븯怨??ъ꽦 諛쒕떖
      var grp = _tgGroups;
      var hasStrongKwan = (grp['?뺢?']||0) + (grp['?멸?']||0) > 2;
      var hasStrongSik = (grp['?앹떊']||0) + (grp['?곴?']||0) > 2;
      var hasStrongJae = (grp['?뺤옱']||0) + (grp['?몄옱']||0) > 2;
      lines.push('泥쒖쭅 湲곗쭏: ' + (hasStrongKwan && !hasStrongSik ? 'Specialist??????遺꾩빞???꾨Ц ?μ씤, 泥닿퀎쨌洹쒕쾾쨌議곗쭅 ?덉뿉??鍮쏅궓' : hasStrongSik && hasStrongJae ? 'Generalist(李쎌뾽媛)?????꾩씠?붿뼱瑜??덉쑝濡??꾪솚, ?먯쓣 ?볧엳???ъ뾽媛' : '洹좏삎?????꾨Ц?깃낵 ?좎뿰?깆쓣 ?④퍡 諛쒗쐶'));
    }

    // ?? [3遺 愿怨꾩쓽 ?꾨왂] ?곸땐쨌?㈑룹쑁??    lines.push('\n??遺. 愿怨꾩쓽 ?꾨왂 ???곸땐쨌?㈑룹쑁??遺꾩꽍??);
    if (G_PILLARS_R) {
      // 泥쒓컙???먯깋
      var GAN_PAIRS = [['??,'藥?],['阿?,'佯?],['訝?,'渦?],['訝?,'鶯?],['??,'??]];
      var GAN_PAIR_EL = ['????','湲???','??麗?','紐???','????'];
      var ganList = ['y','m','d','h'].map(function(k){ return G_PILLARS_R[k] && G_PILLARS_R[k].g || ''; });
      var hapFound = [];
      GAN_PAIRS.forEach(function(p,i){
        var cnt0 = ganList.filter(function(g){return g===p[0];}).length;
        var cnt1 = ganList.filter(function(g){return g===p[1];}).length;
        if (cnt0 > 0 && cnt1 > 0) hapFound.push(p[0]+'쨌'+p[1]+' 泥쒓컙????'+GAN_PAIR_EL[i]+' ?뷀빀, ?꾨왂???뚰듃?덉떗 湲곗슫');
      });
      if (hapFound.length) lines.push('泥쒓컙??鸚⒴묾??: ' + hapFound.join(' / '));
      // 吏吏異??먯깋
      var JI_CHUNG = [['耶?,'??],['訝?,'??],['野?,'??],['??,'??],['渦?,'??],['藥?,'雅?]];
      var jiList = ['y','m','d','h'].map(function(k){ return G_PILLARS_R[k] && G_PILLARS_R[k].j || ''; });
      var chungFound = [];
      JI_CHUNG.forEach(function(p){
        var c0 = jiList.filter(function(j){return j===p[0];}).length;
        var c1 = jiList.filter(function(j){return j===p[1];}).length;
        if (c0>0 && c1>0) chungFound.push(p[0]+'쨌'+p[1]+' 異?亦?');
      });
      if (chungFound.length) lines.push('吏吏異??경뵱亦?: ' + chungFound.join(' / ') + ' ??蹂?붿쓽 ?먭레, ?깆옣 ?몃━嫄곗씠???덇린移?紐삵븳 蹂???좏샇');
      else lines.push('吏吏異? ?먭뎅 ??二쇱슂 異??놁쓬 ??鍮꾧탳???덉젙???먮쫫');
      // ?쇳빀/?≫빀 ?먯깋
      var YUKHAP = [['耶?,'訝?],['野?,'雅?],['??,'??],['渦?,'??],['藥?,'??],['??,'??]];
      var yukFound = [];
      YUKHAP.forEach(function(p){
        if (jiList.indexOf(p[0])>=0 && jiList.indexOf(p[1])>=0) yukFound.push(p[0]+'쨌'+p[1]+' ?≫빀(??릦)');
      });
      if (yukFound.length) lines.push('?≫빀(??릦): ' + yukFound.join(' / ') + ' ???뚰듃?덉떗쨌?쒗쑕?먯꽌 媛뺣젰???쒕꼫吏');
    }
    // ?≪떊(??쪥) ????몄씠 蹂대뒗 ??vs ?닿? 諛붾씪蹂대뒗 ?몄긽
    if (_tgGroups && Object.keys(_tgGroups).length > 0) {
      var g = _tgGroups;
      var topStar = '';
      var topVal = 0;
      Object.keys(g).forEach(function(k){ if((g[k]||0)>topVal){topVal=g[k];topStar=k;} });
      var starDesc = {
        '?뺢?': '????됯?: 梨낆엫媛??덇퀬 ?좊ː?????덈뒗 ?щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: 洹쒕쾾쨌吏덉꽌쨌紐낆삁媛 理쒖슦??,
        '?멸?': '????됯?: 媛뺣젹?섍퀬 移대━?ㅻ쭏 ?덈뒗 ?щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: ?꾩쟾쨌洹밸났쨌由щ뜑??씠 ?띠쓽 ?댁쑀',
        '?뺤옱': '????됯?: ?깆떎?섍퀬 誘우쓬吏곹븳 ?щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: ?덉젙???먯궛怨??꾩떎 寃곌낵媛 媛??以묒슂',
        '?몄옱': '????됯?: 留ㅻ젰?곸씠怨??ш탳?곸씤 ?щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: 湲고쉶쨌?뺤옣쨌?먯쑀濡쒖슫 ?щЪ ?먮쫫',
        '?앹떊': '????됯?: ?⑦솕?섍퀬 ?щ뒫 ?덈뒗 ?щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: ?쒗쁽쨌李쎌“쨌利먭굅????띠쓽 ?듭떖',
        '?곴?': '????됯?: 媛쒖꽦 媛뺥븯怨??낆갹?곸씤 ?щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: 湲곗〈 ???源⑤뒗 ?곸떊怨??먯쑀',
        '鍮꾧껄': '????됯?: 二쇨?쨌?낅┰?ъ씠 媛뺥븳 ?щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: 寃쎌웳怨??먮┰???깆옣???먮룞??,
        '寃곸옱': '????됯?: ?꾩쟾?곸씠怨?異붿쭊???덈뒗 ?щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: ?밸?쨌?곸랬쨌??룞??蹂??,
        '?뺤씤': '????됯?: 吏?깆쟻?닿퀬 諛곕젮 源딆? ?щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: ?숇Ц쨌諛곗?쨌?대㈃ ?깆닕???띠쓽 紐⑹쟻',
        '?몄씤': '????됯?: ?좊퉬濡?퀬 ?낇듅???щ엺. ?닿? 諛붾씪蹂대뒗 ?몄긽: 吏곴?쨌?곸쟻 ?듭같쨌鍮꾩＜瑜섏쟻 媛移?
      };
      if (topStar && starDesc[topStar]) {
        lines.push('二쇰룄 ??꽦(?≪떊): ' + topStar + ' ??' + starDesc[topStar]);
      }
    }

    // ?? [4遺 ?ы쉶???뚮챸] 寃⑷뎅쨌?곸떊쨌援ъ떊
    lines.push('\n??遺. ?ы쉶???뚮챸 ??寃⑷뎅쨌?곸떊쨌援ъ떊 遺꾩꽍??);
    if (snap.saju && snap.saju.notes && snap.saju.notes.length) {
      lines.push('寃??먯젙 ?명듃: ' + snap.saju.notes.join(' / '));
    }
    if (johuType) lines.push('議고썑(沃욕?: ' + johuType);
    // 寃⑷뎅 異붾줎 (?붿? 湲곕컲)
    if (G_PILLARS_R && G_PILLARS_R.m) {
      var monthG = G_PILLARS_R.m.g || '';
      var monthJ = G_PILLARS_R.m.j || '';
      lines.push('寃⑷뎅 湲곕컲 ?붿＜: ' + monthG + monthJ + ' ?????붿＜媛 寃⑷뎅(?쇔?)怨?吏곸뾽?곸꽦쨌?ы쉶??洹몃쫯?????寃곗젙');
    }
    lines.push('?곸떊(?며쪥): ?⑹떊???뺣뒗 議곕젰 ?ㅽ뻾 = ' + (analysis.yongshin_elements ? analysis.yongshin_elements.join(' 怨꾩뿴') + ' 愿???몃㎘쨌?섍꼍쨌吏곸뾽' : '?ъ＜ ?곸꽭 遺꾩꽍 ?꾩슂'));
    lines.push('援ъ떊(餓뉒쪥): 湲곗떊(恙뚨쪥) ' + (analysis.kishin_elements ? analysis.kishin_elements.join(', ') : '') + ' ??怨좊궃 ?앹뿉 寃곌뎅 ??寃껋씠 ?섎뒗 ??꽕??寃곌낵 ?ㅽ뻾 ??洹밸났 ??理쒕? 臾닿린濡??꾪솚');

    // ?? [5遺 遺? ?щ옉] ?щЪ?는룹븷?뺤슫쨌嫄닿컯??    lines.push('\n??遺. 遺? ?щ옉 ???щЪ?는룹븷?뺤슫쨌嫄닿컯?담?);
    if (_tgGroups && Object.keys(_tgGroups).length > 0) {
      var gg = _tgGroups;
      var jaeTotal = (gg['?뺤옱']||0) + (gg['?몄옱']||0);
      var gwanTotal = (gg['?뺢?']||0) + (gg['?멸?']||0);
      var sikTotal = (gg['?앹떊']||0) + (gg['?곴?']||0);
      lines.push('?щЪ 洹몃쫯(?ъ꽦 珥앸웾): ' + jaeTotal + '媛???' + (jaeTotal >= 3 ? '?ъ꽦 ?띾?. ?? 寃곸옱媛 媛뺥븯硫??щЪ ?좎텧 二쇱쓽' : jaeTotal >= 1 ? '?곸젙 ?щЪ 湲곗슫. ?앹긽 ?쒖꽦?????щЪ???곕쫫' : '?ъ꽦 ?? ?꾨Ц 湲곗닠(?앹긽)??癒쇱? ?ㅼ썙???щЪ???대┝'));
      lines.push('?덇렇由?紐⑥뼇: ' + (gg['?몄옱']||0 > gg['?뺤옱']||0 ? '?몄옱????怨듦꺽???ъ옄?? ?ъ뾽쨌二쇱떇쨌遺?숈궛 ??蹂?숈꽦 ?먯궛??媛뺤젏' : '?뺤옱?????덉젙???異뺥삎, 袁몄????섏엯쨌?덉쟾 ?먯궛 ?좏샇'));
      lines.push('?좎젙 援ъ“: ' + (gwanTotal > 0 ? '愿??諛쒕떖 ??梨낆엫 湲곕컲 ?곗븷, 吏꾩???愿怨?吏?? : sikTotal > 2 ? '?앹긽 媛???留ㅻ젰쨌?쒗쁽???섏튂???곗븷, ?먯쑀濡쒖슫 媛먯젙 ?쒗쁽' : '鍮꾧쾪 媛????낅┰??媛뺥빐 二쇱껜???곗븷, ?곷?諛?議댁쨷??愿怨꾩쓽 ?댁뇿'));
    }
    if (analysis.elementWeights) {
      var hw = analysis.elementWeights;
      var weakEl = '';
      var minV = 999;
      [['紐???',hw.wood||0],['????',hw.fire||0],['????',hw.earth||0],['湲???',hw.metal||0],['??麗?',hw.water||0]].forEach(function(e){ if(e[1]<minV){minV=e[1];weakEl=e[0];} });
      lines.push('嫄닿컯 痍⑥빟 ?ㅽ뻾: ' + weakEl + ' ??' + {'紐???':'媛꽷룸떞쨌洹쇱쑁쨌??怨꾩뿴 二쇱쓽, ?ㅽ듃?덉뒪 ?댁냼 ?꾩닔', '????':'?ъ옣쨌?뚯옣쨌?덇?쨌?뺤떊 ?먮꼫吏 ?뚯쭊 二쇱쓽', '????':'?뚰솕湲걔룸퉬?꽷룹톸?? 怨쇱떇쨌遺덇퇋移??앹궗 二쇱쓽', '湲???':'?먃룸??Β룻뵾遺쨌?명씉湲?二쇱쓽, ?섏젅湲?嫄닿컯 愿由?, '??麗?':'?좎옣쨌諛⑷킅쨌?앹떇湲걔룸펷 二쇱쓽, ?섎텇 蹂댁땐 以묒슂'}[weakEl]);
      lines.push('?怨좊궃 ?먮꼫吏 珥앸웾: ' + (analysis.power_label === '?좉컯' ? '?좉컯(翁ュ성) ???먮꼫吏媛 ?섏퀜 怨쇰줈쨌踰덉븘??二쇱쓽. ?뺢린???대룞怨??댁셿 ?꾩닔' : '?좎빟(翁ュ선) ???먮꼫吏 ?⑥쑉??遺꾨같 ?꾩슂. 臾대━???ㅼ쨷 ??븷蹂대떎 ?좏깮怨?吏묒쨷??嫄닿컯???듭떖'));
    }

    // ?? [6遺 2026 ?ㅼ쟾 濡쒕뱶留?
    lines.push('\n??遺. 2026 訝쇿뜄 ?ㅼ쟾 濡쒕뱶留????좊뀈 ?됰룞 吏移ⓦ?);
    lines.push('2026???몄슫(閭꿴걢): 訝쇿뜄亮???泥쒓컙 訝?蹂???쨌吏吏 ??????. ???? 湲곗슫??泥쒖?瑜??ㅻ뜮????);
    // ?⑹떊/湲곗떊???곕Ⅸ 2026 ?먮떒
    var yong = analysis.yongshin_elements || [];
    var ki = analysis.kishin_elements || [];
    var is2026Good = yong.indexOf('??) >= 0 || yong.indexOf('??) >= 0 || yong.indexOf('fire') >= 0;
    var is2026Bad = ki.indexOf('??) >= 0 || ki.indexOf('??) >= 0 || ki.indexOf('fire') >= 0;
    lines.push('2026 ?⑹떊/湲곗떊 ?먯젙: ' + (is2026Good ? '?뵦 訝쇿뜄 ??湲곗슫???⑹떊 ??2026?꾩? ?곴레 ?됰룞???? Go ?쒖쫵' : is2026Bad ? '?좑툘 訝쇿뜄 ??湲곗슫??湲곗떊 ??2026?꾩? ?댁떎 媛뺥솕???? Stop?믩궡怨?異뺤쟻' : '?? 以묐┰ ??2026?꾩? ?꾨왂???좊퀎 ?됰룞????));
    lines.push('??대컢 ?꾨왂(Go/Stop): ' + (is2026Good ? '遊?1~3?? ?⑥븮 ?ш린 ???щ쫫(5~7?? ??컻 ?깆옣 ??媛??9~10?? ?섑솗. 臾대━???뺤옣蹂대떎 ?듭떖 1媛??밸?' : '?곷컲湲?議곗떖(異⑸룎쨌怨쇱냼鍮?湲덉?), ?섎컲湲?2027 以鍮?湲곌컙. 訝쇿뜄異??먭뎅 ?덉쑝硫??섍꼍 蹂???鍮?));
    lines.push('2026???듭떖 ?ㅼ썙?? ' + (is2026Good ? '媛?쒖꽦쨌?꾩쟾쨌?ы쉶???몄젙쨌愿怨??뺤옣' : is2026Bad ? '?댁떎쨌?덉젣쨌?꾨Ц???ы솕쨌?ъ젙 ?덉젙' : '洹좏삎쨌?좏깮怨?吏묒쨷쨌愿怨??뺣━쨌?듭떖 ??웾'));
    // ?붾퀎 ?뺣낫 湲곕컲 (?꾩옱 ?곕룄/??
    var nowMonth = new Date().getMonth() + 1; // 1~12
    lines.push('?꾩옱 ??2026??' + nowMonth + '?? 湲곗슫: ?ы빐 媛??二쇱쓽??????湲곗떊 ?ㅽ뻾??媛뺥빐吏??????????寃곗젙 ?먯젣, ?⑹떊 ?ъ뿉 ?밸?');

    // ?? ???    var G_DAEWUN = window.G_DAEWUN || window.G_DAEUN;
    if (G_DAEWUN && Array.isArray(G_DAEWUN) && G_DAEWUN.length) {
      lines.push('\n?먮???鸚㏝걢) ?꾩껜 ?먮쫫 ???앹븷 留덉뒪?고뵆??湲곕컲??);
      for (var di = 0; di < Math.min(G_DAEWUN.length, 12); di++) {
        var dw = G_DAEWUN[di];
        if (dw) {
          lines.push((dw.age || '') + '????? ' + (dw.g || '') + (dw.j || '') + (dw.gE ? ' [' + dw.gE + ']' : '') + (dw.jE ? '/' + dw.jE : ''));
        }
      }
    }

    // ?? ?꾩옱 ?섏씠 + ?꾩옱 ???鸚㏝걢) ?앸퀎
    if (birth.year) {
      var currentAge = new Date().getFullYear() - birth.year + 1;
      lines.push('\n?꾩옱 ?섏씠: ' + currentAge + '??(留?' + (currentAge - 1) + '??');
      lines.push('?꾩옱 湲곗?亮? 2026??訝쇿뜄亮?);
      // ?꾩옱 吏꾪뻾 以묒씤 ????앸퀎
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
          lines.push('\n?먥춴 ?꾩옱 吏꾪뻾 以묒씤 ???鸚㏝걢) ???듭떖 遺꾩꽍 ??곥?);
          lines.push('?꾩옱 ??? ' + (currentDw.g || '') + (currentDw.j || '') +
            (currentDw.gE ? ' [' + currentDw.gE + '/' + currentDw.jE + ']' : ''));
          lines.push('???吏꾩엯 ?섏씠: ' + currentDw.age + '?????꾩옱 ?섏씠 ' + currentAge + '??(???寃쎄낵: ' + (currentAge - currentDw.age) + '??');
        }
      }
    }

    return lines.join('\n');
  }
  */

  function _collectSajuData() {
    var profile = window.__cdActiveBirthProfile || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var birth = profile.birth || snap.birth || {};
    var pillars = window.G_PILLARS || {};
    var power = window.G_POWER || {};
    var johu = window.G_JOHU || {};
    var daewun = window.G_DAEWUN || window.G_DAEUN || [];
    var lines = [];
    var name = String(profile.name || snap.name || '사용자').trim() || '사용자';
    var gender = String(profile.gender || snap.gender || '').trim();

    lines.push('인생의 책 사주 계산 근거');
    lines.push('이름: ' + name);
    lines.push('성별: ' + (gender === 'F' || gender === 'female' ? '여성' : gender === 'M' || gender === 'male' ? '남성' : (gender || '미상')));
    if (birth.year) {
      lines.push('생년월일: ' + birth.year + '년 ' + (birth.month || '') + '월 ' + (birth.day || '') + '일');
      lines.push('출생시간: ' + (birth.hour !== undefined ? birth.hour + '시' : '미상') + (birth.minute !== undefined ? ' ' + birth.minute + '분' : ''));
    }
    if (profile.location && profile.location.label) lines.push('출생지: ' + profile.location.label);

    if (pillars && (pillars.y || pillars.m || pillars.d || pillars.h)) {
      lines.push('\n사주 원국');
      if (pillars.y) lines.push('연주: ' + (pillars.y.g || '') + (pillars.y.j || '') + _formatElementPair(pillars.y));
      if (pillars.m) lines.push('월주: ' + (pillars.m.g || '') + (pillars.m.j || '') + _formatElementPair(pillars.m));
      if (pillars.d) lines.push('일주: ' + (pillars.d.g || '') + (pillars.d.j || '') + _formatElementPair(pillars.d));
      if (pillars.h) lines.push('시주: ' + (pillars.h.g || '') + (pillars.h.j || '') + _formatElementPair(pillars.h));
    }

    if (analysis.elementWeights) {
      var w = analysis.elementWeights;
      lines.push('\n오행 분포');
      lines.push('목 ' + (w.wood || 0) + '% | 화 ' + (w.fire || 0) + '% | 토 ' + (w.earth || 0) + '% | 금 ' + (w.metal || 0) + '% | 수 ' + (w.water || 0) + '%');
    }

    var yongshin = analysis.yongshin_elements || power.yongshin || [];
    var kishin = analysis.kishin_elements || power.kijishin || [];
    if (analysis.power_label) lines.push('신강/신약: ' + analysis.power_label);
    if (analysis.dayStem) lines.push('일간: ' + analysis.dayStem);
    if (yongshin && yongshin.length) lines.push('용신: ' + yongshin.join(', '));
    if (kishin && kishin.length) lines.push('기신: ' + kishin.join(', '));
    if (johu && johu.type) lines.push('조후: ' + johu.type);

    if (Array.isArray(daewun) && daewun.length) {
      lines.push('\n대운 흐름');
      daewun.slice(0, 12).forEach(function (row) {
        if (!row) return;
        lines.push((row.age || row.startAge || '') + '세 대운: ' + (row.g || row.stem || '') + (row.j || row.branch || '') + (row.gE ? ' [' + row.gE + ']' : ''));
      });
    }

    return lines.join('\n');
  }

  function _formatElementPair(pillar) {
    if (!pillar) return '';
    return pillar.gE || pillar.jE ? ' [' + (pillar.gE || '') + (pillar.jE ? '/' + pillar.jE : '') + ']' : '';
  }

  function _lbJsonClone(value, fallback) {
    try {
      if (value === undefined || value === null) return fallback;
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return fallback;
    }
  }

  function _normalizeLifeBookPillar(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var stem = String(src.g || src.stem || src.stemKo || '').trim();
    var branch = String(src.j || src.branch || src.branchKo || '').trim();
    return {
      stem: stem,
      branch: branch,
      ganji: String(stem + branch).trim(),
      stemElement: String(src.gE || src.stemElement || '').trim(),
      branchElement: String(src.jE || src.branchElement || '').trim(),
    };
  }

  function _normalizeLifeBookDaewunList(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 16).map(function (row) {
      var item = row && typeof row === 'object' ? row : {};
      return {
        age: Number(item.age || item.startAge || 0) || 0,
        startAge: Number(item.startAge || item.age || 0) || 0,
        stem: String(item.g || item.stem || '').trim(),
        branch: String(item.j || item.branch || '').trim(),
        label: String(item.label || ((item.g || '') + (item.j || ''))).trim(),
        element: String(item.element || item.el || '').trim(),
      };
    });
  }

  function _collectLifeBookQuantumMyeongriJson(profile) {
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var pillars = window.G_PILLARS || {};
    var power = window.G_POWER || {};
    var johu = window.G_JOHU || {};
    var jong = window.G_JONG || {};
    var daewunList = _normalizeLifeBookDaewunList(window.G_DAEWUN || window.G_DAEUN || []);
    var birth = (profile && profile.birth) || snap.birth || {};
    var input = {
      name: String((profile && profile.name) || snap.name || '').trim(),
      gender: _normalizeGenderForApi((profile && profile.gender) || snap.gender || ''),
      calendarType: _resolveCalendarTypeForApi(profile || {}),
      birthDate: birth && birth.year ? [birth.year, String(birth.month || '').padStart(2, '0'), String(birth.day || '').padStart(2, '0')].join('-') : '',
      birthTime: birth && birth.hour !== undefined ? String(birth.hour).padStart(2, '0') + ':' + String(birth.minute || 0).padStart(2, '0') : '',
      birthPlace: String((profile && profile.location && profile.location.label) || '').trim(),
      timezone: String((profile && profile.location && profile.location.tz) || 'Asia/Seoul').trim(),
    };
    var fourPillars = {
      year: _normalizeLifeBookPillar(pillars.y),
      month: _normalizeLifeBookPillar(pillars.m),
      day: _normalizeLifeBookPillar(pillars.d),
      hour: _normalizeLifeBookPillar(pillars.h),
    };
    var elementWeights = analysis.elementWeights && typeof analysis.elementWeights === 'object'
      ? {
          wood: Number(analysis.elementWeights.wood || 0),
          fire: Number(analysis.elementWeights.fire || 0),
          earth: Number(analysis.elementWeights.earth || 0),
          metal: Number(analysis.elementWeights.metal || 0),
          water: Number(analysis.elementWeights.water || 0),
        }
      : null;
    var yongshinElements = Array.isArray(analysis.yongshin_elements) && analysis.yongshin_elements.length
      ? analysis.yongshin_elements.slice(0, 4)
      : Array.isArray(power.yongshin) ? power.yongshin.slice(0, 4) : [];
    var gishinElements = Array.isArray(analysis.kishin_elements) && analysis.kishin_elements.length
      ? analysis.kishin_elements.slice(0, 4)
      : Array.isArray(power.kijishin) ? power.kijishin.slice(0, 4) : [];
    var tenGodByPillar = power && power.pillarTenGods && typeof power.pillarTenGods === 'object'
      ? _lbJsonClone(power.pillarTenGods, {})
      : {};
    return {
      version: 'life-book-client-quantum-myeongri-v1',
      sourceTrace: {
        source: 'js/life-book.js',
        engines: ['official-saju-engine', 'quantum-myeongri-engine'],
        hasPillars: Boolean(pillars.y && pillars.m && pillars.d && pillars.h),
        hasPower: Boolean(window.G_POWER),
        hasJohu: Boolean(window.G_JOHU),
        hasDaewun: daewunList.length > 0,
      },
      input: input,
      structuredAdvancedReport: {
        metadata: {
          engineVersion: 'client-quantum-myeongri-v1',
          timezone: input.timezone,
          hourPillarTimePolicy: 'TRUE_SOLAR_TIME',
          dayChangePolicy: 'MIDNIGHT',
        },
        input: input,
        fourPillars: fourPillars,
        strengthAnalysis: {
          dayMasterStrength: String(analysis.power_label || analysis.powerLabel || (power && typeof power.isStrong === 'boolean' ? (power.isStrong ? '신강' : '신약') : '')).trim(),
          isStrong: Boolean(power && power.isStrong),
          jongName: String(analysis.jongName || jong.name || '').trim(),
        },
        climateAnalysis: {
          primaryClimateIssue: String(analysis.johuType || analysis.johu_type || johu.type || '').trim(),
          climateYongshin: _lbJsonClone(johu.yongshin || johu.need || [], []),
        },
        yongshin: {
          primary: String(yongshinElements[0] || '').trim(),
          secondary: String(yongshinElements[1] || '').trim(),
          huishin: yongshinElements.slice(1),
          gishin: gishinElements,
          reasoning: String((power && power.reason) || (johu && johu.reason) || '').trim(),
        },
        gyeokguk: {
          primary: String(analysis.gyeokguk || analysis.gyeok || '').trim(),
          reasoning: String(analysis.gyeokgukReason || '').trim(),
        },
        daewoon: {
          current: daewunList[0] || null,
          cycles: daewunList,
        },
        sewoon: {
          currentYear: {
            label: String(analysis.currentYearPillar || '').trim(),
            ganji: String(analysis.currentYearPillar || '').trim(),
          },
          analysis: String(analysis.yearlyLuckSummary || '').trim(),
        },
        dochungAnalysis: _lbJsonClone(analysis.dochungAnalysis || analysis.doChungAnalysis || {}, {}),
        combinationTransformation: _lbJsonClone(analysis.combinationTransformation || {}, {}),
        clashAnalysis: _lbJsonClone(analysis.clashAnalysis || {}, {}),
        lifeDomains: {
          relationships: String(analysis.relationshipSignal || '').trim(),
          romance: String(analysis.spouseSignal || '').trim(),
          career: String(analysis.careerSignal || '').trim(),
          wealth: String(analysis.wealthSignal || '').trim(),
          healthMind: String(analysis.healthSignal || '').trim(),
        },
      },
      pillars: fourPillars,
      power: _lbJsonClone(power, {}),
      johu: _lbJsonClone(johu, {}),
      jong: _lbJsonClone(jong, {}),
      elementWeights: elementWeights,
      tenGodCounts: _lbJsonClone((power && power.groups) || analysis.tenGodCounts || null, null),
      tenGodByPillar: tenGodByPillar,
      daewunCycles: daewunList,
    };
  }

  function _collectLifeBookAnalysisSignals(profile) {
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var power = window.G_POWER || {};
    var johu = window.G_JOHU || {};
    var pillars = window.G_PILLARS || {};
    var daewunList = _normalizeLifeBookDaewunList(window.G_DAEWUN || window.G_DAEUN || []);

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
    var currentDaeunNode = null;
    var nextDaeunNode = null;
    if (Array.isArray(daewunList) && daewunList.length && profile && profile.birth && profile.birth.year) {
      var currentAge = new Date().getFullYear() - Number(profile.birth.year || 0) + 1;
      for (var i = 0; i < daewunList.length; i++) {
        var cur = daewunList[i] || {};
        var next = daewunList[i + 1] || null;
        var ageStart = Number(cur.age || 0);
        var ageEnd = next ? Number(next.age || 999) : 999;
        if (currentAge >= ageStart && currentAge < ageEnd) {
          currentDaewun = String(cur.label || ((cur.stem || '') + (cur.branch || ''))).trim();
          currentDaeunNode = cur;
          nextDaeunNode = next;
          break;
        }
      }
      if (!currentDaewun) {
        var last = daewunList[daewunList.length - 1] || {};
        currentDaewun = String(last.label || ((last.stem || '') + (last.branch || ''))).trim();
        currentDaeunNode = last;
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
      tenGodByPillar: power && power.pillarTenGods && typeof power.pillarTenGods === 'object' ? _lbJsonClone(power.pillarTenGods, {}) : null,
      currentDaewun: currentDaewun,
      daewunCycles: daewunList,
      currentDaeunNode: currentDaeunNode,
      nextDaeunNode: nextDaeunNode,
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
    if (/^[A-Z0-9_:-]+$/.test(raw) || /\b(LLM|SEED|JSON|PAYLOAD|SCHEMA|UNDEFINED|NULL|NAN)\b/i.test(raw)) {
      return '인생의 책 원고를 완성하는 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.';
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

  /* ??????????????? 紐⑤떖 ?쒖뼱 ??????????????? */
  function _showScreen(id) {
    var screens = ['lbStartScreen', 'lbLoadingScreen', 'lbResultScreen', 'lbErrorScreen'];
    for (var i = 0; i < screens.length; i++) {
      var el = _qs(screens[i]);
      if (el) el.style.display = (screens[i] === id) ? '' : 'none';
    }
  }

  /** DOM ?낅젰媛믪뿉???앸뀈?붿씪 蹂듦뎄 */
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
      /* 異쒖깮吏: 紐⑤떖 ?꾩슜 ?좏깮湲곕? ?곗꽑, ?놁쑝硫?硫붿씤 ???좏깮湲??ъ슜 */
      var locationData = { label: '대한민국(서울)', lng: 127.0, lat: 37.6, tz: 'Asia/Seoul', tzOffset: 9, baseTzOffset: 9 };
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

  /** ?ъ＜ ?곗씠???좏슚???뺤씤 (?щ윭 ?뚯뒪 ?쒖꽌?濡?泥댄겕) */
  function _getActiveBirthProfile() {
    // 1?쒖쐞: window.__cdActiveBirthProfile (?ъ＜ 怨꾩궛 ???ㅼ젙)
    var p = window.__cdActiveBirthProfile;
    if (p && p.birth && p.birth.year) return p;
    // 2?쒖쐞: destiny flower ?ㅻ깄??    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    // 3?쒖쐞: DOM ?낅젰媛?吏곸젒 ?쎄린
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return fromDom;
    return null;
  }

  /* ?? localStorage ???蹂듭썝 ?? */
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
    } catch (e) { /* ?⑸웾 珥덇낵 ?먮뒗 釉뚮씪?곗? ?쒗븳 */ }
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
      dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' · '
        + (saved.gender === 'F' ? '여성' : saved.gender === 'M' ? '남성' : '')
        + (savedDate ? ' · 저장 ' + savedDate : '');
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
    var fallbackText = String(window.__cdPremiumChapterFallbackText || '일시적인 응답 지연으로 해석을 불러오지 못했습니다. 부분 재생성 버튼을 이용해 주세요.');
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
      btn.textContent = '📖 저장된 사주 전략 열기';
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
    if (!profile) {
      try {
        var _dpMatch = (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
          || window.__cdCurrentDestinyProfile
          || null;
        if (_dpMatch && _dpMatch.birth && _dpMatch.birth.year) {
          window.__cdActiveBirthProfile = _dpMatch;
          profile = _dpMatch;
        }
      } catch (_dpE) {}
    }
    if (!profile) {
      // ?낅젰 ?쇱쑝濡??ㅽ겕濡??좊룄
      var _lbFormEl = document.getElementById('birthDate') || document.getElementById('run-btn');
      if (_lbFormEl) { try { _lbFormEl.scrollIntoView({behavior:'smooth',block:'center'}); } catch(_){} }
      alert('인생의 책을 생성하려면 생년월일과 출생 시간을 입력하고 사주 분석을 먼저 완료해 주세요.');
      return;
    }

    _lifeBookLog('ProfileResolved', {
      hasBirthDate: Boolean(profile && profile.birth && profile.birth.year),
      hasBirthTime: Boolean(profile && profile.birth && Number.isFinite(Number(profile.birth.hour))),
      gender: String((profile && profile.gender) || ''),
    });

    // 蹂듦뎄???꾨줈?꾩씠 ?덉쑝硫?window??二쇱엯
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }

    _lbResumePremiumJob();

    if (_isLifeBookGenerationBusy()) {
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

    /* 異쒖깮吏 ?좏깮湲?珥덇린??*/
    if (typeof window.populateCountrySelectById === 'function') {
      var locLabel = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.location && window.__cdActiveBirthProfile.location.label)
        ? window.__cdActiveBirthProfile.location.label : '??쒕?援?(?쒖슱)';
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

  /* ??????????????? TOC ?ㅻ퉬寃뚯씠????????????????? */
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
      content.innerHTML = '<p class="lb-ch-empty">이 챕터는 아직 생성되지 않았습니다.</p>';
      return;
    }
    var bodyHtml = _renderStructuredChapterBody(ch, structured);
    if (!bodyHtml && data) bodyHtml = _md2html(data);
    if (!bodyHtml && structured) bodyHtml = _md2html(_deriveTextFromChapterJson(structured));
    var html =
      '<div class="lb-chapter-wrap">' +
      _buildResultOverviewHtml() +
      '<div class="lb-chapter-header">' +
      '<span class="lb-chapter-num">??' + ch + '??/span>' +
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
      title: String(base.title || CHAPTER_TITLES[idx] || ('제' + (idx + 1) + '장')),
      subtitle: String(base.subtitle || CHAPTER_SUBTITLES[idx] || ''),
    };
  }

  function _syncChapterMetaFromResponse(idx, data) {
    if (!data || typeof data !== 'object') return;
    var chapterMeta = data.chapterMeta && typeof data.chapterMeta === 'object' ? data.chapterMeta : null;
    _chapterMeta[idx] = {
      title: String((chapterMeta && chapterMeta.title) || CHAPTER_TITLES[idx] || ('제' + (idx + 1) + '장')),
      subtitle: String((chapterMeta && chapterMeta.subtitle) || CHAPTER_SUBTITLES[idx] || ''),
      isSkeleton: false,
    };
  }

  var _lbStateMessages = {
    profile_check: '프로필 정보 확인 중',
    calculating_saju: '사주 원국 계산 중',
    daewoon_calc: '대운과 세운의 흐름 계산 중',
    local_draft: '로컬 명리 엔진으로 13챕터 원고 구성 시작',
    local_chapters_start: '로컬 명리 엔진으로 13챕터 원고 구성 시작',
    local_writing: '인생의 책 원고를 정리하는 중',
    writing_local: '인생의 책 원고를 정리하는 중',
    calculation_validated: '사주 계산 완료 · 로컬 원고 구성 시작',
    llm_writing: '인생의 책 원고를 정리하는 중',
    llm_reviewing: '최종 원고 품질 검수 중',
    rendering_pdf: 'PDF 편집과 렌더링 중',
    done: '완료',
    local_reinforce: '부족한 장을 보강하는 중',
  };

  /* ??????????????? ?앹꽦 濡쒖쭅 ??????????????? */
  window.generateLifeBook = function (options) {
    if (_isLifeBookGenerationBusy()) return;

    var opts = options && typeof options === 'object' ? options : {};
    var inputReportId = String(opts.reportId || '').trim();
    var inputAccessGrant = (opts.accessGrant && typeof opts.accessGrant === 'object') ? opts.accessGrant : null;
    var inputPremiumToken = String(opts.premiumAccessToken || '').trim();

    if (!inputAccessGrant) {
      var gateReportId = inputReportId || ('lifebook_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8));
      _flowLog('COIN_GATE_START', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: gateReportId, message: 'lifebook-gate-start' });
      _lifeBookLog('PaymentGateStart', { reportId: gateReportId });
      (async function runLifeBookGateThenGenerate() {
        try {
          var gate = await _runLifeBookCoinGate(gateReportId);
          if (!gate.ok || !gate.accessGrant) {
            var failMsg = String(gate && gate.message ? gate.message : '결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            _flowLog('PAYMENT_ACCESS_CHECK', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: gateReportId, ok: false, status: Number(gate && gate.status || 500), message: failMsg });
            _logLifeBookError(gate || { message: failMsg }, { stage: 'billing', reportId: gateReportId });
            alert(failMsg);
            return;
          }
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
          _logLifeBookError(error, { stage: 'billing', reportId: gateReportId });
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
    // 蹂듦뎄???꾨줈??二쇱엯
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
      window.__cdActiveBirthProfile = profile;
    }

    /* 紐⑤떖 異쒖깮吏 ?좏깮湲?媛믪쑝濡??꾩튂 ?ъ꽕??*/
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
        /* ?좏깮???꾩튂濡??ъ＜ ?먭뎅 ?ш퀎??*/
        if (typeof window.computeProfileForModal === 'function') {
          window.computeProfileForModal(profile);
        }
      }
    }

    _startLifeBookGenerationState();
    _lbCurrentAccessGrant = inputAccessGrant;
    _lbCurrentPremiumToken = inputPremiumToken;
    _flowLog('GENERATE_CLICK', { message: 'generation-started' });
    try {
      _chapters = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
      _chapterStructured = Array(LIFEBOOK_TOTAL_CHAPTERS).fill(null);
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

    // ?듭떖 異쒖깮 ?뺣낫留??좏슚?섎㈃ ?쒕쾭 濡쒖뺄 怨꾩궛 seed(JSON)濡??앹꽦??吏꾪뻾?쒕떎.
    var _hasBirthCore = Boolean(profile && profile.birth && profile.birth.year && profile.birth.month && profile.birth.day);
    if (!_hasBirthCore) {
      _clearLifeBookGenerationState();
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

    // ?좊퉬 硫섑듃 ?명꽣踰??쒖옉
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
      // 梨뺥꽣 ?꾩씠肄??낅뜲?댄듃
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

    var _setGenerationState = function (stateKey) {
      var msg = _lbStateMessages[String(stateKey || '')] || '인생의 책을 생성하고 있습니다.';
      if (chapterMsg) chapterMsg.textContent = msg;
      if (chapterNumEl) chapterNumEl.textContent = '진행 상태';
      _flowLog('GENERATION_STATE', { state: stateKey, message: msg });
    };

    _flowLog('LIFE_BOOK_FLOW_START', {
      featureKey: LIFE_BOOK_FEATURE_KEY,
      hasAccessGrant: Boolean(_lbCurrentAccessGrant),
      hasPremiumToken: Boolean(_lbCurrentPremiumToken),
    });
    _lifeBookLog('SessionCreateStart', {});
    } catch (_prepErr) {
      _clearLifeBookGenerationState();
      _showScreen('lbStartScreen');
      _flowLog('FRONT_PIPELINE_SETUP_FAILED', { featureKey: LIFE_BOOK_FEATURE_KEY, message: String(_prepErr && _prepErr.message || '생성 준비 중 오류가 발생했습니다.') });
      _lifeBookLog('ValidationBeforePayment', { ok: false, reason: 'generation-setup-failed' });
      alert('생성 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

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
        generationMode: 'local-assembled',
        calculationSource: 'local-saju-engine',
        authoringMode: 'local-assembled',
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
        quantumMyeongriJson: _collectLifeBookQuantumMyeongriJson(profile),
      };

      _setGenerationState('calculation_validated');
      var _statusPollingStop = false;
      var _handleStatusProgress = function (_statusData) {
        if (!_statusData || typeof _statusData !== 'object') return;
        var _stateKey = String(((_statusData.progress || {}).stateKey) || '').trim();
        var _status = String(_statusData.status || '').trim();
        var _current = Number(((_statusData.progress || {}).currentChapterNo) || 0);
        var _total = Number(((_statusData.progress || {}).totalChapters) || LIFEBOOK_TOTAL_CHAPTERS);
        if (_stateKey) _setGenerationState(_stateKey);
        if (_status === 'running' || _status === 'queued' || _status === 'processing' || _status === 'generating') {
          _setGenerationState('writing_local');
        }
        if (Number.isFinite(_current) && _current > 0) {
          _setProgress(Math.min(LIFEBOOK_TOTAL_CHAPTERS, Math.max(0, _current)));
          _lifeBookLog('LocalChapterProgress', {
            chapterDone: Math.min(LIFEBOOK_TOTAL_CHAPTERS, Math.max(0, _current)),
            total: Number.isFinite(_total) && _total > 0 ? _total : LIFEBOOK_TOTAL_CHAPTERS,
          });
        }
        if (_status === 'done' || _status === 'completed') {
          _setProgress(LIFEBOOK_TOTAL_CHAPTERS);
        }
      };
      var _statusPollingPromise = _pollLifeBookStatus(
        _sessionId,
        _headers,
        _handleStatusProgress,
        function () { return _statusPollingStop; }
      );

      var _prepare;
      try {
        _prepare = await _postLifeBookPrepare(_payload, _headers);
      } catch (_prepareErr) {
        var _prepareStatus = Number(_prepareErr && _prepareErr.status || 0);
        var _prepareCode = String(_prepareErr && _prepareErr.code || '').toUpperCase();
        var _prepareMsg = String(_prepareErr && _prepareErr.message || '');
        var _isPaymentAccessFail = _prepareStatus === 401 || _prepareStatus === 402 || _prepareStatus === 403
          || _prepareCode.indexOf('PAYMENT') >= 0
          || _prepareCode.indexOf('PREMIUM') >= 0
          || /결제|프리미엄|권한/.test(_prepareMsg);
        if (!_isPaymentAccessFail || !_accessGrant) throw _prepareErr;

        _flowLog('PAYMENT_ACCESS_RETRY', {
          featureKey: LIFE_BOOK_FEATURE_KEY,
          reportId: _lbReportId,
          status: _prepareStatus,
          code: _prepareCode,
          message: _prepareMsg,
        });
        await new Promise(function (r) { setTimeout(r, 600); });
        _prepare = await _postLifeBookPrepare(_payload, _headers);
      } finally {
        _statusPollingStop = true;
        await _statusPollingPromise.catch(function () {});
      }
      var _res = _prepare.res;
      var _json = _prepare.json;

    var _data = (_json && _json.data && typeof _json.data === 'object') ? _json.data : _json;
    _data = _normalizeLifeBookDoneData(_data);
      if (_isLifeBookRunningData(_data) && _extractLifeBookChaptersFromData(_data).length !== LIFEBOOK_TOTAL_CHAPTERS) {
        _flowLog('LIFE_BOOK_BACKGROUND_STATUS_WAIT', { reportId: _lbReportId, sessionId: _sessionId });
        _setGenerationState('local_writing');
        _data = await _waitLifeBookStatusDone(
          _sessionId,
          _headers,
          _handleStatusProgress,
          function () { return _cancelGeneration; }
        );
        _flowLog('LIFE_BOOK_BACKGROUND_STATUS_DONE', { reportId: _lbReportId, sessionId: _sessionId });
      }
      _lbPendingPdfHtml = String((_data && _data.pdfReady && _data.pdfReady.html) || '');
      _lbPendingPdfUrl = _clean(
        (_data && _data.pdfReady && typeof _data.pdfReady === 'object' && (_data.pdfReady.downloadUrl || _data.pdfReady.pdfUrl || _data.pdfReady.download_url || '')) ||
        (_data && _data.downloadUrl) ||
        (_data && _data.pdfUrl) ||
        ''
      );
      _lbPendingHtmlUrl = _clean(
        (_data && _data.pdfReady && typeof _data.pdfReady === 'object' && (_data.pdfReady.htmlUrl || '')) ||
        (_data && _data.htmlUrl) ||
        ''
      );
      _lbPendingReportUrl = _resolveLifeBookStoredUrl(_data);
      var _manuscriptSource = String((_data && _data.manuscriptSource) || ((_data && _data.pdfReady && _data.pdfReady.metadata && _data.pdfReady.metadata.manuscriptSource) || 'life-book-local-v1')).trim();
      _lifeBookLog('ManuscriptSourceResolved', { source: _manuscriptSource || 'life-book-local-v1' });
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
          title: String(_ch.title || CHAPTER_TITLES[_i] || ('제' + (_i + 1) + '장')),
          subtitle: String(_ch.subtitle || CHAPTER_SUBTITLES[_i] || ''),
          isSkeleton: false,
        };
        if (chapterMsg) chapterMsg.textContent = '제 ' + (_i + 1) + '장 정리 완료 · 다음 챕터를 준비하고 있습니다...';
        _setProgress(_i + 1);
        _lifeBookLog('LocalDraftProgress', { chapterDone: _i + 1, total: LIFEBOOK_TOTAL_CHAPTERS });
        await new Promise(function (r) { setTimeout(r, 90); });
      }

      _setGenerationState('writing_local');
      _flowLog('LIFE_BOOK_LOCAL_ASSEMBLED_MANUSCRIPT_READY', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: _lbReportId });
      _lifeBookLog('LocalManuscriptReady', { reportId: _lbReportId });
      if (_data && _data.fallbackUsed) {
        throw new Error('LIFE_BOOK_LOCAL_COMPLETION_REQUIRED');
      }
      if (_data && (_data.llmUsed || _data.llmEnabled || /gemini|llm/i.test(_manuscriptSource))) {
        throw new Error('LIFE_BOOK_LOCAL_ASSEMBLY_REQUIRED');
      }

      _setGenerationState('rendering_pdf');
      _flowLog('LIFE_BOOK_PDF_RENDER_START', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: _lbReportId, chapterCount: LIFEBOOK_TOTAL_CHAPTERS });
      _lifeBookLog('PdfRenderStart', { reportId: _lbReportId });

      if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
      _clearLifeBookGenerationState();

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
        dateEl.textContent = [b.year, b.month, b.day].filter(Boolean).join('. ') + ' · ' + (prof.gender === 'F' ? '여성' : prof.gender === 'M' ? '남성' : '') + ' · ' + new Date().toLocaleDateString('ko-KR') + ' 발행';
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
      _logLifeBookError(error, { stage: 'generate', reportId: _lbCurrentReportId });
      _lifeBookLog('Error', { stage: 'generate', message: errMsg });

      _clearLifeBookGenerationState();
      _showScreen('lbStartScreen');
      alert('인생의 책 생성 중 오류가 발생했습니다.\n\n' + errMsg + '\n\n잠시 후 다시 시도해 주세요.');
    }).finally(function () {
      if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
      if (_activeRequestController) _activeRequestController = null;
      _clearLifeBookGenerationState();
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

  /* ??????????????? PDF ?ㅼ슫濡쒕뱶 ??????????????? */
  window.downloadLifeBookPdf = async function () {
    var targets = _getLifeBookDownloadTargets();
    var fileBase = _lbCurrentReportId ? ('life-book-' + _lbCurrentReportId) : 'life-book';
    var pdfUrl = _clean(targets.pdfUrl);
    var htmlUrl = _clean(targets.htmlUrl);
    if (await _downloadLifeBookUrlWithFallback(pdfUrl, fileBase + '.pdf')) {
      return;
    }

    if (await _downloadLifeBookUrlWithFallback(htmlUrl, fileBase + '.html')) {
      return;
    }

    if (_clean(targets.html)) {
      var ok = _downloadBlobContent(
        targets.html,
        fileBase + '.html',
        'text/html;charset=utf-8'
      );
      if (ok) return;
      if (_attemptDownloadUrl('data:text/html;charset=utf-8,' + encodeURIComponent(targets.html), fileBase + '.html')) return;
      return;
    }
    if (!pdfUrl && !htmlUrl && _clean(_lbPendingPdfHtml) && await _downloadLifeBookUrlWithFallback('data:text/html;charset=utf-8,' + encodeURIComponent(_lbPendingPdfHtml), fileBase + '.html')) {
      return;
    }

    if (!_chapters.length) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }

    alert('리포트 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  };

  /* ??????????????? ?대깽???꾩엫 諛붿씤????????????????? */
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var btn = target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'openLifeBookModal') {
      // 肄붿씤 寃뚯씠???놁씠 ????대┃ ??吏곸젒 紐⑤떖 ?ㅽ뵂 (寃곗젣???앹꽦?섍린 踰꾪듉?먯꽌 泥섎━)
      window.openLifeBookModal();
      return;
    }
    if (action === 'closeLifeBookModal') {
      window.closeLifeBookModal();
      return;
    }
    if (action === 'generateLifeBook') {
      // ?대? ?앹꽦 以묒씠硫?肄붿씤 李④컧 ?꾩뿉 利됱떆 李⑤떒
      if (_isLifeBookGenerationBusy()) {
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

  // ESC ?ㅻ줈 紐⑤떖 ?リ린
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = _qs('lifeBookModal');
      if (modal && modal.style.display !== 'none') {
        window.closeLifeBookModal();
      }
    }
  });

  // 紐⑤떖 ?ㅻ쾭?덉씠 ?대┃?쇰줈 ?リ린 (?대? data-action?쇰줈 泥섎━?섏?留?蹂댄뿕??
  var _overlay = document.querySelector('#lifeBookModal .lb-modal__overlay');
  if (_overlay) {
    _overlay.addEventListener('click', function () { window.closeLifeBookModal(); });
  }

})();
