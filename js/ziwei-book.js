(function(){
  'use strict';

  var TOTAL_CHAPTERS = 15;
  var FEATURE_KEY = 'premium-ziwei-report';
  var FEATURE_KEY_ALIASES = ['premium-ziwei-report', 'premium_pdf_ziwei'];
  var ZIWEI_CLIENT_EVIDENCE_SCHEMA_VERSION = 'ziwei-premium-client-evidence.v1';
  var COIN_COST = 590;
  var PREPARE_API = '/api/ziwei-book/prepare';
  var RESULT_API = '/api/ziwei-book/result';
  var DOWNLOAD_API = '/api/ziwei-book/download';
  var PAID_SESSION_STORAGE_KEY = 'premium:ziwei:paid-session:v1';
  var COVER_IMAGE = '/fuctionassets/jamipremiun.webp';
  var RESULT = null;
  var GENERATING = false;
  var DOWNLOADING = false;
  var LAST_SEED = null;
  var RESULT_POLL_MAX_ATTEMPTS = 150;
  var RESULT_POLL_INTERVAL_MS = 4000;
  var ZIWEI_GENERATION_STATE = {
    isOpen: false,
    status: 'idle',
    currentChapterNo: 1,
    totalChapters: TOTAL_CHAPTERS,
    completedChapters: [],
    failedChapters: [],
    sessionId: null,
    reportId: null,
    message: ''
  };

  var CHAPTERS = [
    'Chapter 1. 자미 명반 총론 — 운명의 중심 지도',
    'Chapter 2. 명궁과 신궁 — 타고난 나와 완성되는 나',
    'Chapter 3. 선천 사화 정밀 해석',
    'Chapter 4. 14주성 완전 해석',
    'Chapter 5. 보좌성과 살성의 역학 관계',
    'Chapter 6. 재백궁과 관록궁 — 돈과 사회적 성취',
    'Chapter 7. 부부궁과 자녀궁 — 사랑과 가족 리듬',
    'Chapter 8. 천이궁과 전택궁 — 이동과 기반의 운',
    'Chapter 9. 노복궁과 형제궁 — 인맥과 협업 운',
    'Chapter 10. 복덕궁과 부모궁 — 내면 회복과 뿌리',
    'Chapter 11. 질액궁 — 몸과 마음의 취약 신호',
    'Chapter 12. 대한 정밀 분석 — 10년 주기의 방향',
    'Chapter 13. 유년 로드맵 — 올해의 운 흐름',
    'Chapter 14. 생애 마스터플랜 — 전환점과 장기 전략',
    'Chapter 15. 자미 거장의 최종 전략 제언'
  ];

  var CHAPTER_PROGRESS_LINES = [
    '자미 명반의 중심 지도를 정리하는 중입니다.',
    '명궁과 신궁의 흐름을 정밀하게 맞추는 중입니다.',
    '선천 사화가 움직이는 방향을 읽는 중입니다.',
    '14주성의 핵심 별빛을 펼치는 중입니다.',
    '보좌성과 살성의 긴장을 해석하는 중입니다.',
    '재백궁과 관록궁의 성취 흐름을 엮는 중입니다.',
    '부부궁과 자녀궁의 인연 리듬을 정리하는 중입니다.',
    '천이궁과 전택궁의 이동·기반 운을 점검하는 중입니다.',
    '노복궁과 형제궁의 인맥 흐름을 읽는 중입니다.',
    '복덕궁과 부모궁의 내면 뿌리를 살피는 중입니다.',
    '질액궁의 몸과 마음 신호를 부드럽게 정리하는 중입니다.',
    '대한 10년 주기의 큰 방향을 해석하는 중입니다.',
    '유년 흐름의 올해 전략을 다듬는 중입니다.',
    '생애 전환점과 장기 전략을 엮는 중입니다.',
    '15챕터 자미 거장의 최종 제언을 완성하는 중입니다.'
  ];

  var FINALIZE_PROGRESS_LINES = [
    '명반 기반 15챕터를 최종 점검하는 중입니다.',
    'PDF 문서로 정리하는 중입니다.'
  ];
  var ZIWEI_PHASE_ORDER = ['profile', 'payment', 'calculate', 'write', 'archive'];
  var ZIWEI_PHASE_TITLES = {
    profile: '프로필 정보를 확인하고 있습니다.',
    payment: '결제 확인 중입니다. 완료 후 생성이 시작됩니다.',
    calculate: '결제가 확인되었습니다. 명궁과 12궁을 계산합니다.',
    write: '15챕터 상담문을 정리하고 있습니다.',
    archive: 'PDF 저장과 다운로드 준비를 마무리합니다.'
  };

  var PALACE_KEY_BY_NAME = {
    '명궁': 'ming',
    '형제궁': 'siblings',
    '부처궁': 'spouse',
    '부부궁': 'spouse',
    '자녀궁': 'children',
    '재백궁': 'wealth',
    '질액궁': 'health',
    '천이궁': 'travel',
    '노복궁': 'friends',
    '교우궁': 'friends',
    '관록궁': 'career',
    '전택궁': 'property',
    '복덕궁': 'fortune',
    '부모궁': 'parents'
  };

  var REQUIRED_PALACE_ORDER = [
    'ming', 'siblings', 'spouse', 'children', 'wealth', 'health',
    'travel', 'friends', 'career', 'property', 'fortune', 'parents'
  ];

  var PALACE_NAME_BY_KEY = {
    ming: '명궁',
    siblings: '형제궁',
    spouse: '부부궁',
    children: '자녀궁',
    wealth: '재백궁',
    health: '질액궁',
    travel: '천이궁',
    friends: '노복궁',
    career: '관록궁',
    property: '전택궁',
    fortune: '복덕궁',
    parents: '부모궁'
  };

  function $(id){ return document.getElementById(id); }
  function detachModalFromResultPage(modal){
    try {
      if (!modal || !modal.parentElement) return;
      if (typeof modal.closest === 'function' && modal.closest('#resultPage')) {
        document.body.appendChild(modal);
      }
    } catch (_) {}
  }
  function text(value){ return String(value == null ? '' : value).trim(); }
  function esc(value){
    return text(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function pad2(value){ return String(Number(value) || 0).padStart(2, '0'); }
  function setText(id, value){ var el = $(id); if(el) el.textContent = value; }
  function setDisplay(id, value){ var el = $(id); if(el) el.style.display = value; }

  function formatDateStamp(dateLike){
    var date = dateLike ? new Date(dateLike) : new Date();
    if(Number.isNaN(date.getTime())) date = new Date();
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return '' + y + m + d;
  }

  function buildZiweiPdfFilename(dateLike){
    return '자미두수_프리미엄_리포트_' + formatDateStamp(dateLike) + '.pdf';
  }

  function getChapterProgressLine(index){
    var safe = Math.max(0, Math.min(TOTAL_CHAPTERS - 1, Number(index) || 0));
    return CHAPTER_PROGRESS_LINES[safe] || '자미두수 명반을 정리하는 중입니다.';
  }

  function renderZiweiCategoryText(value){
    var source = text(value);
    if(!source) return '<p class="lb-result-article__section-body"></p>';
    var labels = ['핵심 근거', '상담 해석', '실행 전략', '주의 흐름', '다음 점검'];
    var pattern = /(^|\n)(핵심 근거|상담 해석|실행 전략|주의 흐름|다음 점검)\s*\n/g;
    var matches = [];
    var match;
    while((match = pattern.exec(source)) !== null){
      matches.push({ label: match[2], start: match.index + match[1].length, bodyStart: pattern.lastIndex });
    }
    if(!matches.length){
      return '<p class="lb-result-article__section-body">' + esc(source) + '</p>';
    }
    return matches.map(function(item, index){
      var end = index + 1 < matches.length ? matches[index + 1].start : source.length;
      var body = text(source.slice(item.bodyStart, end));
      var bodyHtml;
      if(item.label === '실행 전략'){
        var steps = body.split(/\n+/).map(function(row){ return text(row).replace(/^\d+\.\s*/, ''); }).filter(Boolean);
        bodyHtml = '<ol class="lb-result-article__steps">' + steps.map(function(row){ return '<li>' + esc(row) + '</li>'; }).join('') + '</ol>';
      } else {
        bodyHtml = body.split(/\n+/).map(function(row){ return text(row); }).filter(Boolean).map(function(row){
          return '<p class="lb-result-article__section-body">' + esc(row) + '</p>';
        }).join('');
      }
      return '<div class="lb-result-article__detail"><h5 class="lb-result-article__detail-title">' + esc(item.label) + '</h5>' + bodyHtml + '</div>';
    }).join('');
  }

  function setGeneratingUiLock(isBusy, label){
    var btn = $('zbStartBtn');
    if(!btn) return;
    if(!btn.dataset.zbIdleHtml) btn.dataset.zbIdleHtml = btn.innerHTML;
    btn.disabled = !!isBusy;
    btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    if(isBusy){
      btn.classList.add('is-busy');
      btn.textContent = label || 'PDF 생성 준비 중...';
      return;
    }
    btn.classList.remove('is-busy');
    btn.innerHTML = btn.dataset.zbIdleHtml || '자미두수 PDF 생성하기<span class="cd-preparing-badge cd-preparing-badge--cta">590코인</span>';
  }

  function setZiweiPhase(phase, title){
    var safePhase = ZIWEI_PHASE_TITLES[phase] ? phase : 'profile';
    var activeIndex = ZIWEI_PHASE_ORDER.indexOf(safePhase);
    var phaseTitle = title || ZIWEI_PHASE_TITLES[safePhase];
    setText('zbLoadingTitle', phaseTitle);
    ZIWEI_PHASE_ORDER.forEach(function(key, index){
      var pill = document.querySelector('#ziweiBookModal [data-zb-stage="' + key + '"]');
      if(!pill) return;
      pill.classList.toggle('is-active', key === safePhase);
      pill.classList.toggle('is-done', index < activeIndex);
      pill.setAttribute('aria-current', key === safePhase ? 'step' : 'false');
    });
    updateZiweiGenerationState({ phase: safePhase, phaseLabel: text(phaseTitle) });
  }

  function ensureZiweiA11yState(){
    var loading = $('zbLoadingScreen');
    if(loading){
      loading.setAttribute('role', 'status');
      loading.setAttribute('aria-live', 'polite');
    }
    var progress = $('zbProgressBar');
    if(progress){
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
      if(!progress.getAttribute('aria-valuenow')) progress.setAttribute('aria-valuenow', '0');
    }
    var progressText = $('zbProgressText');
    if(progressText) progressText.setAttribute('aria-live', 'polite');
    ZIWEI_PHASE_ORDER.forEach(function(key){
      var pill = document.querySelector('#ziweiBookModal [data-zb-stage="' + key + '"]');
      if(pill && !pill.getAttribute('role')) pill.setAttribute('role', 'listitem');
    });
    var result = $('zbResultScreen');
    if(result) result.setAttribute('aria-live', 'polite');
    var error = $('zbErrorScreen');
    if(error) error.setAttribute('aria-live', 'assertive');
  }

  function ensureZiweiResultStyle(){
    if(document.getElementById('zbQualityStyle')) return;
    var style = document.createElement('style');
    style.id = 'zbQualityStyle';
    style.textContent = '.zb-quality-badge{display:inline-flex;flex-direction:column;gap:2px;margin-top:10px;padding:8px 10px;border:1px solid rgba(250,204,21,.32);border-radius:10px;background:rgba(16,8,33,.46);color:#fef3c7;font-size:12px;line-height:1.35}.zb-quality-badge strong{font-size:13px;color:#fde68a}.zb-quality-badge span{color:#ddd6fe}';
    document.head.appendChild(style);
  }

  function setZiweiDownloadLock(isBusy, label){
    var ids = ['zbTopPdfBtn', 'zbPdfBtn', 'zbBottomPdfBtn'];
    for(var i = 0; i < ids.length; i++){
      var btn = $(ids[i]);
      if(!btn) continue;
      if(!btn.dataset.zbIdleText) btn.dataset.zbIdleText = btn.textContent || 'PDF 다운로드';
      btn.disabled = !!isBusy;
      btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
      btn.textContent = isBusy ? (label || 'PDF 확인 중...') : btn.dataset.zbIdleText;
    }
  }

  async function readBlobPrefix(blob, length){
    var head = blob && blob.slice ? blob.slice(0, length || 5) : blob;
    if(!head || !head.arrayBuffer) return '';
    var bytes = new Uint8Array(await head.arrayBuffer());
    var out = '';
    for(var i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return out;
  }

  function toHexHash(input){
    var src = text(input);
    var hash = 2166136261;
    for(var i = 0; i < src.length; i++){
      hash ^= src.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  function makeBirthHash(birthInput){
    var safe = birthInput || {};
    var token = [
      text(safe.birthDate),
      pad2(safe.birthHour),
      pad2(safe.birthMinute),
      text(safe.gender).toLowerCase(),
      text(safe.calendarType).toLowerCase()
    ].join('|');
    return 'bh-' + toHexHash(token);
  }

  function readPaidSession(){
    try {
      var raw = localStorage.getItem(PAID_SESSION_STORAGE_KEY) || sessionStorage.getItem(PAID_SESSION_STORAGE_KEY) || '';
      if(!raw) return null;
      var parsed = JSON.parse(raw);
      if(!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch(_) {
      return null;
    }
  }

  function writePaidSession(patch){
    var current = readPaidSession() || {};
    var next = Object.assign({}, current, patch || {});
    try {
      localStorage.setItem(PAID_SESSION_STORAGE_KEY, JSON.stringify(next));
      sessionStorage.setItem(PAID_SESSION_STORAGE_KEY, JSON.stringify(next));
    } catch(_) {}
    return next;
  }

  function clearPaidSession(){
    try {
      localStorage.removeItem(PAID_SESSION_STORAGE_KEY);
      sessionStorage.removeItem(PAID_SESSION_STORAGE_KEY);
    } catch(_) {}
  }

  function isReusablePaidStatus(status){
    var s = text(status);
    return s === 'generating' || s === 'failed_retryable';
  }

  function isZiweiFeatureKey(value){
    var key = text(value);
    for(var i = 0; i < FEATURE_KEY_ALIASES.length; i += 1){
      if(key === FEATURE_KEY_ALIASES[i]) return true;
    }
    return false;
  }

  function hasPaymentEvidence(source, birthHash){
    var context = normalizePaymentContext(source || {}, birthHash || '');
    var grant = context.accessGrant && typeof context.accessGrant === 'object' ? context.accessGrant : null;
    return Boolean(
      text(context.premiumAccessToken)
      || text(context.transactionId)
      || text(context.purchaseId)
      || text(grant && (grant.evidenceId || grant.paymentId || grant.purchaseId || grant.transactionId || grant.merchantUid))
    );
  }

  function isSamePaidSessionTarget(session, birthHash){
    var saved = session || {};
    return isZiweiFeatureKey(saved.featureKey)
      && text(saved.reportType) === 'ziweiPremium'
      && text(saved.birthHash) === text(birthHash)
      && isReusablePaidStatus(saved.status)
      && hasPaymentEvidence(saved, birthHash);
  }

  async function verifyPaidSessionAccess(saved){
    return Boolean(
      saved
      && isReusablePaidStatus(saved.status)
      && text(saved.sessionId)
      && (text(saved.premiumAccessToken) || text(saved.transactionId) || text(saved.purchaseId))
    );
  }

  function buildSessionId(birthHash){
    return 'ziwei-premium:' + text(birthHash || 'unknown') + ':' + Date.now().toString(36);
  }

  function updateZiweiGenerationState(patch){
    ZIWEI_GENERATION_STATE = Object.assign({}, ZIWEI_GENERATION_STATE, patch || {});
    try { window.__ziweiPdfGenerationState = ZIWEI_GENERATION_STATE; } catch (_) {}
  }

  function resetZiweiGenerationState(){
    updateZiweiGenerationState({
      isOpen: true,
      status: 'preparing',
      currentChapterNo: 1,
      totalChapters: TOTAL_CHAPTERS,
      completedChapters: [],
      failedChapters: [],
      sessionId: null,
      reportId: null,
      message: ''
    });
  }

  function getZiweiReportReadiness(data){
    var payload = data || {};
    var ready = payload.pdfReady && typeof payload.pdfReady === 'object' ? payload.pdfReady : {};
    var chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
    var status = text(payload.status);
    var serverStatus = text(payload.serverStatus);
    var hasSessionId = Boolean(text(payload.sessionId));
    var hasReportId = Boolean(text(payload.reportId));
    var hasPdfHtml = Boolean(text(ready.html));
    var hasStoredUrl = Boolean(text(
      payload.directDownloadUrl
      || payload.downloadUrl
      || payload.pdfUrl
      || payload.storedUrl
      || payload.reportUrl
      || ready.directDownloadUrl
      || ready.downloadUrl
      || ready.pdfUrl
      || ready.storedUrl
      || ready.reportUrl
      || ready.htmlUrl
    ));
    var ok = payload.ok === true;
    var retryable = payload.retryable === true;
    var failedRetryable = serverStatus === 'failed_retryable' || status === 'failed_retryable';
    var processing = status === 'processing' || serverStatus === 'processing' || retryable || failedRetryable;
    var successCandidate = (ok || processing || retryable) && (hasReportId || hasSessionId);
    return {
      ok: ok,
      processing: processing,
      retryable: retryable,
      failedRetryable: failedRetryable,
      recoverable: processing && (hasReportId || hasSessionId),
      successCandidate: successCandidate,
      completed: ok && successCandidate && (hasPdfHtml || hasStoredUrl) && chapters.length >= TOTAL_CHAPTERS,
      hasPdfHtml: hasPdfHtml,
      hasStoredUrl: hasStoredUrl,
      chapterCount: chapters.length,
      hasReportId: hasReportId,
      hasSessionId: hasSessionId
    };
  }

  function isZiweiReportReady(data){
    return getZiweiReportReadiness(data).completed;
  }

  function getZiweiResponsePayload(data){
    var payload = data && data.payload && typeof data.payload === 'object' ? data.payload : {};
    var ziweiPayload = data && data.ziweiPayload && typeof data.ziweiPayload === 'object' ? data.ziweiPayload : {};
    return Object.assign({}, ziweiPayload, payload);
  }

  function getZiweiResponseProfile(data){
    var payload = getZiweiResponsePayload(data);
    var master = data && data.ziweiMasterJson && typeof data.ziweiMasterJson === 'object' ? data.ziweiMasterJson : {};
    var candidates = [
      payload.profile,
      payload.birthProfile,
      data && data.birthProfile,
      master.birthProfile,
      window.__cdActiveBirthProfile
    ];
    for(var i = 0; i < candidates.length; i++){
      if(candidates[i] && typeof candidates[i] === 'object') return candidates[i];
    }
    return {};
  }

  function getZiweiConsultationQuality(data){
    var payload = getZiweiResponsePayload(data);
    var candidates = [
      data && data.diagnostics && data.diagnostics.consultationQuality,
      data && data.pdfReady && data.pdfReady.quality && data.pdfReady.quality.consultationQuality,
      data && data.ziweiJsonV2 && data.ziweiJsonV2.quality && data.ziweiJsonV2.quality.consultationQuality,
      payload && payload.ziweiJsonV2 && payload.ziweiJsonV2.quality && payload.ziweiJsonV2.quality.consultationQuality
    ];
    for(var i = 0; i < candidates.length; i++){
      if(candidates[i] && typeof candidates[i] === 'object') return candidates[i];
    }
    return null;
  }

  function renderZiweiQualityBadge(data){
    var quality = getZiweiConsultationQuality(data);
    if(!quality || !Number.isFinite(Number(quality.score))) return '';
    var label = quality.status === 'excellent' ? '명반 근거 검수 완료' : '상담 기준 확인 완료';
    return '<div class="zb-quality-badge" role="note">'
      + '<strong>' + esc(label) + '</strong>'
      + '<span>' + esc('성요·궁위·대한 흐름을 확인했습니다.') + '</span>'
      + '</div>';
  }

  function getZiweiDownloadUrl(data){
    var ready = data && data.pdfReady && typeof data.pdfReady === 'object' ? data.pdfReady : {};
    return text(
      ready.downloadUrl
      || ready.pdfUrl
      || ready.storedUrl
      || data.downloadUrl
      || data.pdfUrl
      || data.storedUrl
      || data.reportUrl
      || data.directDownloadUrl
      || ready.directDownloadUrl
    );
  }

  function logFlow(tag, payload){
    try { console.info('[ZiweiBook][' + tag + ']', payload || {}); } catch(_) {}
  }

  function normalizeZiweiError(error){
    if(error instanceof Error){
      return { name: error.name, message: error.message, stack: error.stack, status: error.status, code: error.code, stage: error.stage, payloadSafe: error.payloadSafe };
    }
    if(typeof error === 'object' && error !== null){
      try { return JSON.parse(JSON.stringify(error)); }
      catch(_) { return { message: String(error) }; }
    }
    return { message: String(error) };
  }

  function ziweiShortList(value, limit){
    var source = Array.isArray(value) ? value : [];
    return source.map(function(item){ return text(item); }).filter(Boolean).slice(0, Math.max(1, Number(limit || 6)));
  }

  function ziweiPayloadSafe(payload){
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.error && typeof data.error === 'object' ? data.error : {};
    var debugSafe = data.debugSafe && typeof data.debugSafe === 'object' ? data.debugSafe : {};
    return {
      code: text(data.code || nested.code || data.errorCode || nested.errorCode) || undefined,
      message: text(data.message || nested.message || data.reasonMessage || nested.reasonMessage || data.error) || undefined,
      stage: text(data.stage || data.failureStage || debugSafe.stage || nested.stage || nested.failureStage) || undefined,
      failureType: text(data.failureType || debugSafe.failureType || nested.failureType) || undefined,
      reportId: text(data.reportId || debugSafe.reportId || nested.reportId) || undefined,
      sessionId: text(data.sessionId || debugSafe.sessionId || nested.sessionId) || undefined,
      executionId: text(data.executionId || debugSafe.executionId || nested.executionId) || undefined,
      missing: ziweiShortList(data.missing || nested.missing || data.hardMissingFields, 6),
      issues: ziweiShortList(data.issues || nested.issues || data.errors || nested.errors, 6),
      debugSafe: Object.keys(debugSafe).length ? debugSafe : undefined
    };
  }

  function buildZiweiApiError(pack, fallbackMessage, kind){
    var res = pack && pack.res ? pack.res : {};
    var payload = pack && pack.json && typeof pack.json === 'object'
      ? pack.json
      : (pack && pack.body && typeof pack.body === 'object' ? pack.body : {});
    var status = Number((pack && pack.status) || res.status || payload.status || payload.statusCode || 0);
    var safe = ziweiPayloadSafe(payload);
    var error = buildRetryableError(text(safe.message || fallbackMessage || ('HTTP ' + (status || ''))), status || 500, text(safe.code) || 'ZIWEI_PREPARE_FAILED', kind || 'generation');
    error.stage = text(safe.stage) || (kind === 'payment' ? 'billing' : 'prepare');
    error.failureType = text(safe.failureType);
    error.reportId = text(safe.reportId || payload.reportId);
    error.sessionId = text(safe.sessionId || payload.sessionId);
    error.executionId = text(safe.executionId);
    error.missing = safe.missing;
    error.issues = safe.issues;
    error.payloadSafe = safe;
    error.payload = payload;
    return error;
  }

  function logZiweiError(error, meta){
    try {
      var payloadSafe = error && error.payloadSafe
        ? error.payloadSafe
        : ziweiPayloadSafe((error && error.payload) || (error && typeof error === 'object' ? error : {}));
      var safe = {
        serviceKey: 'ziwei-book',
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        stage: text(meta && meta.stage || error && error.stage || payloadSafe.stage) || 'unknown',
        failureType: text(error && error.failureType || payloadSafe.failureType) || undefined,
        status: Number(error && error.status || meta && meta.status || 0) || undefined,
        code: text(error && error.code || payloadSafe.code) || 'ZIWEI_CLIENT_ERROR',
        message: text(error && error.message ? error.message : error) || 'unknown',
        requestId: text(meta && meta.requestId || error && error.requestId) || undefined,
        sessionId: text(meta && meta.sessionId || error && error.sessionId || payloadSafe.sessionId) || undefined,
        reportId: text(meta && meta.reportId || error && error.reportId || payloadSafe.reportId || RESULT && RESULT.reportId) || undefined,
        executionId: text(meta && meta.executionId || error && error.executionId || payloadSafe.executionId) || undefined,
        missing: ziweiShortList(error && error.missing || payloadSafe.missing, 6),
        issues: ziweiShortList(error && error.issues || payloadSafe.issues, 6),
        causeMessage: text(error && error.cause && (error.cause.message || error.cause)) || undefined,
        payloadSafe: payloadSafe
      };
      console.error('[ZiweiBook][Error][' + safe.stage + ']', safe);
    } catch(_) {}
  }

  var EARTHLY_BRANCH_HOUR = {
    '자': 23, '축': 1, '인': 3, '묘': 5, '진': 7, '사': 9,
    '오': 11, '미': 13, '신': 15, '유': 17, '술': 19, '해': 21
  };

  function firstNonEmpty(){
    for(var i=0;i<arguments.length;i++){
      var v = text(arguments[i]);
      if(v) return v;
    }
    return '';
  }

  function normalizeGender(value){
    var raw = text(value).toLowerCase();
    if(raw === 'm' || raw === 'male' || raw === 'man' || raw === '남' || raw === '남성') return 'male';
    if(raw === 'f' || raw === 'female' || raw === 'woman' || raw === '여' || raw === '여성') return 'female';
    return 'unknown';
  }

  function normalizeCalendarType(value){
    var raw = text(value).toLowerCase();
    if(raw === 'solar' || raw === '양력' || raw === '양') return 'solar';
    if(raw === 'lunar' || raw === '음력' || raw === '음' || raw === 'lunar_leap' || raw === '윤달') return 'lunar';
    return 'unknown';
  }

  function isUnknownTime(value){
    var raw = text(value).toLowerCase();
    if(!raw) return false;
    return /모름|미상|unknown|없음|미기재|n\/a|na|not\s*known|모르/.test(raw);
  }

  function toFiniteInt(value){
    var n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  }

  function parseDateParts(value){
    var raw = text(value);
    if(!raw) return null;
    var m = raw.match(/^(\d{4})[-./\s](\d{1,2})[-./\s](\d{1,2})$/);
    if(!m) return null;
    var y = toFiniteInt(m[1]);
    var mo = toFiniteInt(m[2]);
    var d = toFiniteInt(m[3]);
    if(!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    if(mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { year: y, month: mo, day: d };
  }

  function parseBirthTime(value){
    var raw = text(value);
    if(!raw) return null;
    if(isUnknownTime(raw)) return { unknown: true };
    var branch = raw.match(/([자축인묘진사오미신유술해])\s*시/);
    if(branch && EARTHLY_BRANCH_HOUR.hasOwnProperty(branch[1])) return { hour: EARTHLY_BRANCH_HOUR[branch[1]], minute: 0 };
    var hm = raw.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
    if(hm){
      var hour = toFiniteInt(hm[1]);
      var minute = Number.isFinite(toFiniteInt(hm[2])) ? toFiniteInt(hm[2]) : 0;
      if(/오후|pm|PM/.test(raw) && hour < 12) hour += 12;
      if(/오전|am|AM/.test(raw) && hour === 12) hour = 0;
      if(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour: hour, minute: minute };
    }
    var ho = raw.match(/^(오전|오후|am|pm|AM|PM)?\s*(\d{1,2})\s*시?$/);
    if(ho){
      var hh = toFiniteInt(ho[2]);
      if(/오후|pm|PM/.test(ho[1] || '') && hh < 12) hh += 12;
      if(/오전|am|AM/.test(ho[1] || '') && hh === 12) hh = 0;
      if(hh >= 0 && hh <= 23) return { hour: hh, minute: 0 };
    }
    return null;
  }

  function updateProgress(percent, label){
    var fill = $('zbProgressBar');
    var safePercent = Math.max(0, Math.min(100, percent));
    if(fill){
      fill.style.width = safePercent + '%';
      fill.setAttribute('aria-valuenow', String(Math.round(safePercent)));
    }
    setText('zbLoadingChapter', label || '자미두수 명반을 준비하는 중입니다.');
    updateZiweiGenerationState({ message: text(label || ''), totalChapters: TOTAL_CHAPTERS });
  }

  function markChapter(index){
    var rawIndex = Number(index);
    if(!Number.isFinite(rawIndex) || rawIndex < 0){
      for(var p=0; p<TOTAL_CHAPTERS; p++){
        var pendingDot = $('zbChDot' + p);
        if(!pendingDot) continue;
        pendingDot.classList.remove('lb-ch-dot--done', 'lb-ch-dot--active');
        pendingDot.classList.add('lb-ch-dot--pending');
        pendingDot.setAttribute('aria-current', 'false');
      }
      setText('zbLoadingChapterNum', '진행률 0 / ' + TOTAL_CHAPTERS);
      setText('zbLoadingChapter', '결제 완료 전에는 명반 생성이 시작되지 않습니다.');
      setText('zbMysticQuote', '결제가 확인되면 명궁과 12궁 계산을 시작합니다.');
      if($('zbChapterCount')) setText('zbChapterCount', '0 / ' + TOTAL_CHAPTERS);
      else setText('zbProgressText', '0 / ' + TOTAL_CHAPTERS);
      updateZiweiGenerationState({
        currentChapterNo: 0,
        completedChapters: []
      });
      return;
    }
    var safeIndex = Math.max(0, Math.min(TOTAL_CHAPTERS - 1, rawIndex));
    var chapterNo = Math.max(1, safeIndex + 1);
    for(var i=0; i<TOTAL_CHAPTERS; i++){
      var dot = $('zbChDot' + i);
      if(!dot) continue;
      dot.classList.toggle('lb-ch-dot--done', i < chapterNo - 1);
      dot.classList.toggle('lb-ch-dot--active', i === chapterNo - 1);
      dot.classList.toggle('lb-ch-dot--pending', i > chapterNo - 1);
      dot.setAttribute('aria-current', i === chapterNo - 1 ? 'step' : 'false');
    }
    var currentLine = getChapterProgressLine(chapterNo - 1);
    var countText = chapterNo + ' / ' + TOTAL_CHAPTERS;
    setText('zbLoadingChapterNum', '진행률 ' + countText);
    setText('zbLoadingChapter', currentLine);
    setText('zbMysticQuote', currentLine);
    if($('zbChapterCount')) setText('zbChapterCount', countText);
    else setText('zbProgressText', countText);
    var completed = [];
    for(var c = 1; c <= chapterNo - 1; c++) completed.push(c);
    updateZiweiGenerationState({
      currentChapterNo: chapterNo,
      completedChapters: completed
    });
  }

  function getField(ids){
    for(var i=0;i<ids.length;i++){
      var el = $(ids[i]);
      if(el && text(el.value)) return text(el.value);
    }
    return '';
  }

  function snapshotFormProfile(){
    var birthDate = getField(['birthDate','birthdate','birthday','solarDate','lunarDate','date','birth_date']);
    var dateParts = parseDateParts(birthDate);
    var year = toFiniteInt(getField(['birthYear','year','yyyy']));
    var month = toFiniteInt(getField(['birthMonth','month','mm']));
    var day = toFiniteInt(getField(['birthDay','day','dd']));
    if(!Number.isFinite(year) && dateParts) year = dateParts.year;
    if(!Number.isFinite(month) && dateParts) month = dateParts.month;
    if(!Number.isFinite(day) && dateParts) day = dateParts.day;
    return {
      source: 'form',
      name: getField(['userName','name','birthName','profileName','nameInput']),
      gender: getField(['gender','sex','userGender','birthGender']),
      calendarType: getField(['calendarType','calendar','birthCalendarType']),
      birthDate: birthDate,
      year: year,
      month: month,
      day: day,
      birthTime: getField(['birthTime','birthtime','time','timeText','birth_time']),
      hour: toFiniteInt(getField(['birthHour','birth_hour','hour','hh'])),
      minute: toFiniteInt(getField(['birthMinute','minute','mi'])),
      timezone: 'Asia/Seoul',
      birthplace: getField(['birthplace','birthPlace'])
    };
  }

  function profileFromObject(obj, sourceName){
    var source = (obj && typeof obj === 'object') ? obj : {};
    var birth = (source.birth && typeof source.birth === 'object') ? source.birth : {};
    var birthDateRaw = firstNonEmpty(source.birthDate, source.birthday, source.solarDate, source.lunarDate, source.date, birth.birthDate, birth.solarDate, birth.lunarDate, birth.date);
    var dateParts = parseDateParts(birthDateRaw);
    var year = Number.isFinite(toFiniteInt(source.year)) ? toFiniteInt(source.year) : (Number.isFinite(toFiniteInt(birth.year)) ? toFiniteInt(birth.year) : (dateParts ? dateParts.year : NaN));
    var month = Number.isFinite(toFiniteInt(source.month)) ? toFiniteInt(source.month) : (Number.isFinite(toFiniteInt(birth.month)) ? toFiniteInt(birth.month) : (dateParts ? dateParts.month : NaN));
    var day = Number.isFinite(toFiniteInt(source.day)) ? toFiniteInt(source.day) : (Number.isFinite(toFiniteInt(birth.day)) ? toFiniteInt(birth.day) : (dateParts ? dateParts.day : NaN));
    return {
      source: sourceName,
      name: firstNonEmpty(source.name, source.profileName),
      gender: firstNonEmpty(source.gender, source.sex, birth.gender, birth.sex, window.GENDER),
      calendarType: firstNonEmpty(source.calendarType, source.calendar, source.calType, birth.calType, birth.calendarType),
      birthDate: birthDateRaw,
      year: year,
      month: month,
      day: day,
      birthTime: firstNonEmpty(source.birthTime, source.time, source.timeText, source.hourText, birth.birthTime, birth.time),
      hour: Number.isFinite(toFiniteInt(source.birthHour)) ? toFiniteInt(source.birthHour) : (Number.isFinite(toFiniteInt(source.birth_hour)) ? toFiniteInt(source.birth_hour) : (Number.isFinite(toFiniteInt(source.hour)) ? toFiniteInt(source.hour) : toFiniteInt(birth.hour))),
      minute: Number.isFinite(toFiniteInt(source.birthMinute)) ? toFiniteInt(source.birthMinute) : (Number.isFinite(toFiniteInt(source.minute)) ? toFiniteInt(source.minute) : toFiniteInt(birth.minute)),
      timezone: firstNonEmpty(source.timezone, birth.timezone, 'Asia/Seoul'),
      birthplace: firstNonEmpty(source.birthplace, source.birthPlace, birth.birthplace, birth.birthPlace)
    };
  }

  function readStorageProfile(){
    try {
      var selected = (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
        || window.__cdCurrentDestinyProfile
        || null;
      if(selected) return profileFromObject(selected, 'storageProfile');
    } catch(_) {}
    try {
      var pre = JSON.parse(localStorage.getItem('premium:ziwei:session:v1') || 'null');
      if(pre && pre.birthProfile) return profileFromObject(pre.birthProfile, 'storageSession');
    } catch(_) {}
    return null;
  }

  async function readApiProfile(){
    try {
      var res = await fetch('/api/profile', { method: 'GET', credentials: 'include' });
      if(!res.ok) return null;
      var data = await res.json().catch(function(){ return {}; });
      var profiles = Array.isArray(data && data.profiles) ? data.profiles : [];
      var currentId = text(data && data.currentId);
      var selected = (currentId && profiles.find(function(p){ return p && (p.id === currentId || p.profileId === currentId); })) || profiles[0] || null;
      if(!selected) return null;
      return profileFromObject(selected, 'profileApi');
    } catch(_) {
      return null;
    }
  }

  function mergeProfilesByPriority(sources){
    var merged = {
      name: '사용자', gender: 'unknown', calendarType: 'unknown', birthDate: '', year: NaN, month: NaN, day: NaN,
      birthTime: '', hour: NaN, minute: NaN, timezone: 'Asia/Seoul', birthplace: '대한민국', pickedFrom: []
    };
    function pickString(key){
      for(var i=0;i<sources.length;i++){
        var v = text(sources[i] && sources[i][key]);
        if(v){ merged.pickedFrom.push(key + ':' + (sources[i].source || ('s'+i))); return v; }
      }
      return '';
    }
    function pickNumber(key){
      for(var i=0;i<sources.length;i++){
        var n = toFiniteInt(sources[i] && sources[i][key]);
        if(Number.isFinite(n)){ merged.pickedFrom.push(key + ':' + (sources[i].source || ('s'+i))); return n; }
      }
      return NaN;
    }
    merged.name = pickString('name') || '사용자';
    merged.gender = pickString('gender') || 'unknown';
    merged.calendarType = pickString('calendarType') || 'unknown';
    merged.birthDate = pickString('birthDate');
    merged.year = pickNumber('year');
    merged.month = pickNumber('month');
    merged.day = pickNumber('day');
    merged.birthTime = pickString('birthTime');
    merged.hour = pickNumber('hour');
    merged.minute = pickNumber('minute');
    merged.timezone = pickString('timezone') || 'Asia/Seoul';
    merged.birthplace = pickString('birthplace') || '대한민국';
    if((!Number.isFinite(merged.year) || !Number.isFinite(merged.month) || !Number.isFinite(merged.day)) && merged.birthDate){
      var d = parseDateParts(merged.birthDate);
      if(d){
        if(!Number.isFinite(merged.year)) merged.year = d.year;
        if(!Number.isFinite(merged.month)) merged.month = d.month;
        if(!Number.isFinite(merged.day)) merged.day = d.day;
      }
    }
    return merged;
  }

  function normalizeBirthInput(merged){
    var parsedTime = parseBirthTime(merged.birthTime);
    var hour = Number.isFinite(merged.hour) ? merged.hour : (parsedTime && !parsedTime.unknown ? parsedTime.hour : NaN);
    var minute = Number.isFinite(merged.minute) ? merged.minute : (parsedTime && !parsedTime.unknown ? parsedTime.minute : 0);
    var isTimeUnknown = Boolean(isUnknownTime(merged.birthTime) || (parsedTime && parsedTime.unknown));
    var birthDate = Number.isFinite(merged.year) && Number.isFinite(merged.month) && Number.isFinite(merged.day)
      ? merged.year + '-' + pad2(merged.month) + '-' + pad2(merged.day)
      : text(merged.birthDate);
    return {
      name: text(merged.name),
      gender: normalizeGender(merged.gender),
      calendarType: normalizeCalendarType(merged.calendarType),
      birthDate: birthDate,
      birthYear: Number.isFinite(merged.year) ? merged.year : NaN,
      birthMonth: Number.isFinite(merged.month) ? merged.month : NaN,
      birthDay: Number.isFinite(merged.day) ? merged.day : NaN,
      birthTime: Number.isFinite(hour) ? (pad2(hour) + ':' + pad2(minute)) : text(merged.birthTime),
      birthHour: Number.isFinite(hour) ? hour : null,
      birthMinute: Number.isFinite(minute) ? minute : 0,
      timezone: text(merged.timezone) || 'Asia/Seoul',
      isTimeUnknown: isTimeUnknown
    };
  }

  function validateBirthInputOrThrow(input){
    if(!Number.isFinite(input.birthYear) || !Number.isFinite(input.birthMonth) || !Number.isFinite(input.birthDay)){
      throw new Error('자미두수 프리미엄 PDF 생성을 위해 프로필 카드의 생년월일을 확인해 주세요.');
    }
    if(input.isTimeUnknown || !Number.isFinite(input.birthHour)){
      throw new Error('자미두수 PDF는 명궁과 12궁 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.');
    }
    if(input.birthHour < 0 || input.birthHour > 23 || input.birthMinute < 0 || input.birthMinute > 59){
      throw new Error('출생 시간 형식을 확인해 주세요. 예: 07:00, 오전 7시, 인시');
    }
  }

  function ensureZiweiStartButtonHandler(){
    var btn = $('zbStartBtn');
    if(!btn || btn.dataset.zbHandlerReady === '1') return;
    btn.dataset.zbHandlerReady = '1';
    btn.removeAttribute('onclick');
    btn.addEventListener('click', function(){
      if(btn.dataset.zbProfileReady !== '1'){
        window.goToZiweiProfileSetup();
        return;
      }
      window.generateZiweiBook();
    });
  }

  function setZiweiStartButtonHtml(label, badge){
    var btn = $('zbStartBtn');
    if(!btn) return;
    btn.innerHTML = esc(label) + '<span class="cd-preparing-badge cd-preparing-badge--cta">' + esc(badge) + '</span>';
    btn.dataset.zbIdleHtml = btn.innerHTML;
    btn.disabled = false;
  }

  function renderZiweiProfileReadiness(resolved){
    ensureZiweiStartButtonHandler();
    var summary = $('zbProfileSummary');
    var btn = $('zbStartBtn');
    var input = resolved && resolved.birthInput ? resolved.birthInput : normalizeBirthInput((resolved && resolved.merged) || {});
    var engine = (resolved && resolved.profileForEngine) || {};
    var merged = (resolved && resolved.merged) || {};
    var hasDate = Number.isFinite(input.birthYear) && Number.isFinite(input.birthMonth) && Number.isFinite(input.birthDay);
    var hasTime = !input.isTimeUnknown && Number.isFinite(Number(input.birthHour));
    var name = text(input.name || merged.name || engine.name) || '사용자';
    var dateText = hasDate ? (input.birthYear + '년 ' + input.birthMonth + '월 ' + input.birthDay + '일') : '생년월일 미입력';
    var timeText = hasTime ? (pad2(input.birthHour) + ':' + pad2(input.birthMinute || 0)) : '출생시 미입력';
    var placeText = text(engine.birthplace || merged.birthplace) || '대한민국';
    var notice = !hasDate
      ? '생년월일이 확인되어야 명반 계산을 시작할 수 있습니다.'
      : (!hasTime ? '자미두수 PDF는 명궁과 12궁 계산을 위해 정확한 출생시가 필요합니다.' : '결제 전 분석 기준이 확인되었습니다.');

    if(summary){
      summary.innerHTML = ''
        + '<strong>' + esc(name) + '</strong>'
        + '<span style="display:block;margin-top:6px;color:#e9d5ff;">' + esc(dateText + ' · ' + timeText + ' · ' + placeText) + '</span>'
        + '<small style="display:block;margin-top:6px;color:' + (hasDate && hasTime ? '#a7f3d0' : '#fde68a') + ';">' + esc(notice) + '</small>';
    }

    if(btn){
      btn.dataset.zbProfileReady = hasDate && hasTime ? '1' : '0';
      if(!hasDate) setZiweiStartButtonHtml('생년월일 입력하기', 'PDF 생성 전 필수');
      else if(!hasTime) setZiweiStartButtonHtml('출생시 입력하기', '정밀 명반 필수');
      else setZiweiStartButtonHtml('자미두수 PDF 생성하기', '590코인');
    }
  }

  async function resolveBirthInput(){
    var formProfile = snapshotFormProfile();
    var activeProfile = profileFromObject(window.__cdActiveBirthProfile || window._cdCurrentProfile || window.currentProfile || window._currentProfile || {}, 'activeProfile');
    var apiProfile = await readApiProfile();
    var storageProfile = readStorageProfile();
    var merged = mergeProfilesByPriority([activeProfile, apiProfile || {}, storageProfile || {}, formProfile]);
    var birthInput = normalizeBirthInput(merged);
    var profileForEngine = {
      name: birthInput.name || '사용자',
      gender: birthInput.gender,
      year: birthInput.birthYear,
      month: birthInput.birthMonth,
      day: birthInput.birthDay,
      hour: birthInput.birthHour,
      minute: birthInput.birthMinute,
      birthDate: birthInput.birthDate,
      birthTime: birthInput.birthTime,
      calendarType: birthInput.calendarType,
      timezone: birthInput.timezone,
      birthplace: merged.birthplace || '대한민국'
    };
    return { birthInput: birthInput, profileForEngine: profileForEngine, merged: merged };
  }

  function normalizeStrengthName(value){
    var raw = text(value);
    if(/묘|廟|◎/.test(raw)) return '묘';
    if(/왕|旺|득|得|○|O/.test(raw)) return '득';
    if(/리|利|약|▲/.test(raw)) return '리';
    if(/평|平|△/.test(raw)) return '평';
    if(/함|실|陷|불|쇠|×|X/i.test(raw)) return '함';
    return '평';
  }

  function strengthSymbol(value){
    var normalized = normalizeStrengthName(value);
    if(normalized === '묘') return '◎';
    if(normalized === '득') return 'O';
    if(normalized === '리') return '▲';
    if(normalized === '평') return '△';
    return 'X';
  }

  function normalizeStar(raw){
    if(!raw) return null;
    if(typeof raw === 'string'){
      var clean = raw.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      var sihua = (clean.match(/화록|화권|화과|화기/) || [''])[0];
      var symbol = (clean.match(/[◎○O▲△X×]/) || [''])[0];
      var name = clean
        .replace(/\(차성\)/g,'')
        .replace(/화록|화권|화과|화기/g,'')
        .replace(/[◎○O▲△X×]/g,'')
        .trim()
        .split(' ')[0];
      if(!name) return null;
      var strengthName = normalizeStrengthName(symbol);
      return { name: name, strengthName: strengthName, strengthSymbol: strengthSymbol(strengthName), sihua: sihua, borrowed: /차성/.test(clean) };
    }
    var nameObj = text(raw.name || raw.nameKo || raw.starName);
    if(!nameObj) return null;
    var strength = normalizeStrengthName(raw.strength || raw.strengthName || raw.symbol || raw.strengthSymbol || raw.brightness);
    return {
      name: nameObj,
      strengthName: strength,
      strengthSymbol: strengthSymbol(strength),
      sihua: text(raw.sihua || raw.transform || raw.transformation),
      borrowed: raw.borrowed === true
    };
  }

  function normalizeStars(list){
    if(!Array.isArray(list)) return [];
    return list.map(normalizeStar).filter(Boolean);
  }

  function normalizePalaceName(name){
    var raw = text(name);
    if(raw === '부처궁') return '부부궁';
    return raw;
  }

  function summarizeStrength(stars){
    var rows = Array.isArray(stars) ? stars : [];
    var tally = { '◎': 0, 'O': 0, '▲': 0, '△': 0, 'X': 0 };
    for(var i = 0; i < rows.length; i++){
      var symbol = text(rows[i] && rows[i].strengthSymbol);
      if(symbol === '○') symbol = 'O';
      if(tally.hasOwnProperty(symbol)) tally[symbol] += 1;
    }
    return {
      miao: tally['◎'],
      de: tally['O'],
      li: tally['▲'],
      ping: tally['△'],
      xian: tally['X'],
      legend: '◎ O ▲ △ X'
    };
  }

  function fillMissingPalaces(palaces){
    var source = Array.isArray(palaces) ? palaces.slice() : [];
    var byKey = {};
    for(var i = 0; i < source.length; i++){
      var key = text(source[i] && source[i].key);
      if(key && !byKey[key]) byKey[key] = source[i];
    }
    var finalPalaces = [];
    for(var idx = 0; idx < REQUIRED_PALACE_ORDER.length; idx++){
      var reqKey = REQUIRED_PALACE_ORDER[idx];
      var item = byKey[reqKey] || null;
      if(!item){
        item = {
          key: reqKey,
          nameKo: PALACE_NAME_BY_KEY[reqKey],
          branch: '',
          index: idx,
          mainStars: [],
          auxStars: [],
          maleficStars: [],
          transformations: []
        };
      }
      var allStars = [].concat(item.mainStars || [], item.auxStars || [], item.maleficStars || []);
      item.strengthSummary = summarizeStrength(allStars);
      finalPalaces.push(item);
    }
    return finalPalaces;
  }

  function normalizePalaces(chart){
    var source = [];
    if(Array.isArray(chart && chart.palaces)) source = chart.palaces;
    else if(Array.isArray(chart && chart.palaceStarData)) source = chart.palaceStarData;
    else if(chart && chart.palacesByIndex){
      source = Object.keys(chart.palacesByIndex).map(function(key){ return chart.palacesByIndex[key]; });
    }
    var mapped = source.map(function(p, index){
      var name = normalizePalaceName(p.nameKo || p.name || p.palace || p.gung || p.palaceName);
      var key = text(p.key || p.id || PALACE_KEY_BY_NAME[name]);
      var mainStars = normalizeStars(p.mainStars || p.stars || p.main || []);
      var auxStars = normalizeStars(p.auxStars || p.auxiliaryStars || p.aux || []);
      var maleficStars = normalizeStars(p.maleficStars || p.badStars || p.bad || []);
      var allStars = [].concat(mainStars, auxStars, maleficStars);
      return {
        key: key,
        nameKo: name,
        branch: text(p.branch || p.zhi || p.earthlyBranch),
        index: index,
        mainStars: mainStars,
        auxStars: auxStars,
        maleficStars: maleficStars,
        transformations: Array.isArray(p.transformations) ? p.transformations : [],
        strengthSummary: summarizeStrength(allStars)
      };
    });
    return fillMissingPalaces(mapped);
  }

  async function ensureZiweiEngine(){
    if(typeof window.calcZiweiPalaces === 'function') return;
    if(typeof window.__cdEnsureSajuCoreLoaded === 'function'){
      await window.__cdEnsureSajuCoreLoaded();
    }
    if(typeof window.calcZiweiPalaces !== 'function'){
      throw new Error('자미두수 계산 엔진을 불러오지 못했습니다. 기본 사주 결과를 먼저 계산한 뒤 다시 시도해 주세요.');
    }
  }

  async function buildZiweiSeed(profile){
    await ensureZiweiEngine();
    if(!profile.year || !profile.month || !profile.day){
      throw new Error('자미두수 PDF 생성을 위해 생년월일을 입력해 주세요.');
    }
    var genderForEngine = profile.gender === 'male' ? 'M' : (profile.gender === 'female' ? 'F' : 'OTHER');
    window._ziweiBirth = {
      year: profile.year,
      month: profile.month,
      day: profile.day,
      hour: profile.hour,
      minute: profile.minute,
      gender: genderForEngine
    };
    if(genderForEngine) window.GENDER = genderForEngine;
    var raw = window.calcZiweiPalaces(profile.year, profile.month, profile.day, profile.hour, profile.minute);
    if(!raw || !raw.palaceStarData){
      throw new Error('자미두수 명반 계산 결과가 비어 있습니다. 입력값을 확인해 주세요.');
    }
    window._currentZiweiData = raw;
    var structured = null;
    try {
      if(typeof window.getZiweiStructuredData === 'function') structured = window.getZiweiStructuredData();
    } catch(e) {
      structured = null;
    }
    var reportPayload = structured && (structured.reportPayload || structured.ziweiBase || structured.chart);
    var palaces = normalizePalaces(reportPayload || raw);
    if(palaces.length < 12) palaces = normalizePalaces(raw);
    var chartMeta = (reportPayload && reportPayload.chartMeta) || raw.calcMeta || {};
    var seed = {
      profile: profile,
      chartMeta: {
        mingGong: text(chartMeta.mingGong || raw.meng),
        shenGong: text(chartMeta.shenGong || raw.shen),
        fiveElementBureau: text(chartMeta.fiveElementBureau || (raw.juInfo && raw.juInfo.label) || raw.ju),
        yearStemBranch: text(chartMeta.yearStemBranch || raw.yearGan || '')
      },
      palaces: palaces,
      sihua: Array.isArray((reportPayload || {}).sihua) ? reportPayload.sihua : (raw.sihuaData || []),
      luck: {
        decadeLuck: Array.isArray((reportPayload || {}).luck && reportPayload.luck.decadeLuck) ? reportPayload.luck.decadeLuck : (raw.daHanList || raw.daHan || []),
        annual: Array.isArray((reportPayload || {}).luck && reportPayload.luck.annual) ? reportPayload.luck.annual : []
      },
      diagnostics: {
        palaceCount: palaces.length,
        generatedBy: 'calcZiweiPalaces',
        generatedAt: new Date().toISOString()
      }
    };
    logFlow('SeedValidated', {
      birthHash: toHexHash([profile.year, profile.month, profile.day, profile.hour, profile.minute, profile.gender].join('|')),
      palaceCount: palaces.length,
      hasToken: Boolean(getPremiumToken())
    });
    LAST_SEED = seed;
    return seed;
  }

  function buildZiweiClientEvidenceJson(seed, birthInput){
    var source = seed && typeof seed === 'object' ? seed : {};
    var palaces = Array.isArray(source.palaces) ? source.palaces : [];
    var sihua = Array.isArray(source.sihua) ? source.sihua : [];
    var decadeLuck = Array.isArray(source.luck && source.luck.decadeLuck) ? source.luck.decadeLuck : [];
    var annualLuck = Array.isArray(source.luck && source.luck.annual) ? source.luck.annual : [];
    var chartMeta = source.chartMeta && typeof source.chartMeta === 'object' ? source.chartMeta : {};
    var input = birthInput && typeof birthInput === 'object' ? birthInput : {};
    return {
      schemaVersion: ZIWEI_CLIENT_EVIDENCE_SCHEMA_VERSION,
      source: 'browser-ziwei-book',
      featureKey: FEATURE_KEY,
      generatedAt: new Date().toISOString(),
      hasBirthInput: Boolean(input.birthDate || (input.year && input.month && input.day)),
      chartAvailable: Boolean(source && palaces.length),
      hasZiweiBase: Boolean(source && palaces.length),
      hasPalaces: palaces.length >= 12,
      hasMingGong: Boolean(text(chartMeta.mingGong)),
      hasShenGong: Boolean(text(chartMeta.shenGong)),
      evidenceCount: palaces.length + sihua.length + decadeLuck.length + annualLuck.length,
      chartSummary: {
        palaceCount: palaces.length,
        sihuaCount: sihua.length,
        decadeLuckCount: decadeLuck.length,
        annualLuckCount: annualLuck.length,
        mingGong: text(chartMeta.mingGong),
        shenGong: text(chartMeta.shenGong),
        fiveElementBureau: text(chartMeta.fiveElementBureau),
        yearStemBranch: text(chartMeta.yearStemBranch)
      },
      diagnostics: source.diagnostics || null
    };
  }

  function getPremiumToken(){
    try {
      var keys = ['cd_premium_access','premiumAccessToken','cdPremiumAccessToken','ziweiPremiumAccessToken'];
      for(var i=0;i<keys.length;i++){
        var local = localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i]);
        if(local) return local;
      }
    } catch(e) {}
    return '';
  }

  function storePremiumToken(token){
    if(!token) return;
    try {
      localStorage.setItem('ziweiPremiumAccessToken', token);
      sessionStorage.setItem('ziweiPremiumAccessToken', token);
    } catch(e) {}
  }

  function objectValue(source, key){
    return source && typeof source[key] === 'object' && source[key] !== null ? source[key] : {};
  }

  function extractAccessGrant(source){
    if(!source || typeof source !== 'object') return null;
    if(source.accessGrant && typeof source.accessGrant === 'object') return source.accessGrant;
    return extractAccessGrant(source.data) || extractAccessGrant(source.payload) || extractAccessGrant(source.payment) || extractAccessGrant(source._paymentContext) || extractAccessGrant(source.paymentContext) || extractAccessGrant(source.consume);
  }

  function normalizePaymentContext(source, birthHash){
    var raw = source && typeof source === 'object' ? source : {};
    var grant = extractAccessGrant(raw);
    var sources = [
      grant || {},
      raw,
      objectValue(raw, 'data'),
      objectValue(raw, 'payload'),
      objectValue(raw, 'payment'),
      objectValue(raw, '_paymentContext'),
      objectValue(raw, 'paymentContext'),
      objectValue(raw, 'consume')
    ];
    function pick(keys){
      for(var i = 0; i < sources.length; i += 1){
        for(var k = 0; k < keys.length; k += 1){
          var found = text(sources[i] && sources[i][keys[k]]);
          if(found) return found;
        }
      }
      return '';
    }
    var token = pick(['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token']) || getPremiumToken();
    var transactionId = pick(['transactionId', 'paymentId', 'purchaseId', 'requestId']);
    var requestId = pick(['requestId', 'transactionId']) || transactionId;
    var purchaseId = pick(['purchaseId', 'paymentId', 'transactionId']) || transactionId;
    var sessionId = pick(['sessionId', 'reportSessionId']) || buildSessionId(birthHash);
    var reportSessionId = pick(['reportSessionId', 'sessionId']) || sessionId;
    var context = {
      featureKey: FEATURE_KEY,
      featureAliases: FEATURE_KEY_ALIASES.slice(),
      reportType: 'ziweiPremium',
      premiumAccessToken: token || undefined,
      transactionId: transactionId || undefined,
      requestId: requestId || undefined,
      purchaseId: purchaseId || undefined,
      sessionId: sessionId || undefined,
      reportSessionId: reportSessionId || undefined,
      reportId: pick(['reportId']) || undefined,
      paidAt: pick(['paidAt', 'createdAt']) || undefined,
      birthHash: text(birthHash) || undefined
    };
    if(grant) context.accessGrant = grant;
    return context;
  }

  async function ensurePaymentOrRestore(birthInput, options){
    var reuseOnly = Boolean(options && options.reuseOnly);
    var birthHash = makeBirthHash(birthInput || {});
    var saved = readPaidSession();
    if(reuseOnly && isSamePaidSessionTarget(saved, birthHash)){
      var verified = await verifyPaidSessionAccess(saved);
      if(verified){
        logFlow('PaymentReuse', {
          birthHash: birthHash,
          hasToken: Boolean(text(saved && saved.premiumAccessToken)),
          palaceCount: Number((LAST_SEED && LAST_SEED.diagnostics && LAST_SEED.diagnostics.palaceCount) || 0),
          verified: true
        });
        return Object.assign({}, saved, {
          ok: true,
          reused: true,
          verified: true,
          sessionId: text(saved.sessionId) || buildSessionId(birthHash),
          premiumAccessToken: text(saved.premiumAccessToken) || getPremiumToken(),
          birthHash: birthHash
        });
      }
      clearPaidSession();
      logFlow('PaymentReuseRejected', {
        birthHash: birthHash,
        hasToken: Boolean(text(saved && saved.premiumAccessToken))
      });
      if(reuseOnly){
        throw buildRetryableError('결제 내역을 확인하지 못했습니다. 생성 버튼에서 결제를 다시 확인해 주세요.', 402, 'PAYMENT_REUSE_UNVERIFIED', 'payment');
      }
    } else if(saved && isZiweiFeatureKey(saved.featureKey) && reuseOnly !== true) {
      clearPaidSession();
    }

    if(typeof window._cdCoinGatePerUse !== 'function'){
      throw new Error('결제 모듈을 찾을 수 없습니다. 로그인 상태와 결제 수단을 확인해 주세요.');
    }

    return new Promise(function(resolve, reject){
      var settled = false;
      function finish(result){
        if(settled) return;
        settled = true;
        if(result && result.ok === false){
          var paymentError = buildZiweiApiError({ status: Number(result.status || 402), body: result }, result.message || '코인 결제 확인이 필요합니다.', 'payment');
          logZiweiError(paymentError, { stage: 'billing', requestId: result && result.requestId });
          reject(paymentError);
          return;
        }
        var paymentContext = normalizePaymentContext(result, birthHash);
        var token = text(paymentContext.premiumAccessToken) || getPremiumToken();
        if(token) storePremiumToken(token);
        var sessionId = text(paymentContext.sessionId) || buildSessionId(birthHash);
        paymentContext.sessionId = sessionId;
        paymentContext.reportSessionId = text(paymentContext.reportSessionId) || sessionId;
        paymentContext.premiumAccessToken = token || undefined;
        if(!hasPaymentEvidence(Object.assign({}, result || {}, paymentContext), birthHash)){
          reject(new Error('결제 확인 정보가 누락되었습니다. 다시 결제를 진행해 주세요.'));
          return;
        }
        var savedSession = writePaidSession(Object.assign({}, paymentContext, {
          featureKey: FEATURE_KEY,
          reportType: 'ziweiPremium',
          sessionId: sessionId,
          premiumAccessToken: token,
          transactionId: text(paymentContext.transactionId),
          paidAt: text(paymentContext.paidAt) || new Date().toISOString(),
          birthHash: birthHash,
          status: 'paid'
        }));
        logFlow('PaymentCreated', {
          birthHash: birthHash,
          hasToken: Boolean(token),
          palaceCount: Number((LAST_SEED && LAST_SEED.diagnostics && LAST_SEED.diagnostics.palaceCount) || 0)
        });
        resolve(Object.assign({}, savedSession, result || {}, {
          ok: true,
          premiumAccessToken: token,
          sessionId: sessionId,
          birthHash: birthHash,
          accessGrant: paymentContext.accessGrant || undefined,
          payment: paymentContext,
          _paymentContext: paymentContext
        }));
      }
      try {
        var immediate = window._cdCoinGatePerUse(COIN_COST, '자미두수 프리미엄 PDF 리포트 생성', function(_transactionId, data){
          finish(Object.assign({ ok: true, transactionId: _transactionId }, data || {}));
        }, function(error){
          finish(Object.assign({ ok: false, status: 402, code: 'ZIWEI_PAYMENT_CANCELLED', message: (error && error.message) || '코인 결제 확인이 필요합니다.' }, error || {}));
        }, {
          featureKey: FEATURE_KEY,
          serviceKey: 'ziwei-book',
          reportType: 'ziweiPremium',
          requestId: FEATURE_KEY + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
        });
        if(immediate && typeof immediate.then === 'function'){
          immediate.then(finish).catch(function(error){ finish({ ok: false, message: error && error.message }); });
        } else if(immediate && immediate.ok === false) {
          finish(immediate);
        }
      } catch(error) {
        finish({ ok: false, message: error && error.message });
      }
    });
  }

  function buildRetryableError(message, status, code, kind){
    var error = new Error(message || '자미두수 PDF 생성 요청에 실패했습니다.');
    error.status = Number(status || 500);
    error.code = text(code || 'ZIWEI_PREPARE_FAILED') || 'ZIWEI_PREPARE_FAILED';
    error.kind = text(kind || 'generation') || 'generation';
    return error;
  }

  async function fetchZiweiResult(sessionId, reportId){
    var query = [];
    if(text(sessionId)) query.push('sessionId=' + encodeURIComponent(text(sessionId)));
    if(text(reportId)) query.push('reportId=' + encodeURIComponent(text(reportId)));
    if(!query.length) return null;
    var url = RESULT_API + '?' + query.join('&');
    var res = await fetch(url, { method: 'GET', credentials: 'include' });
    var json = await res.json().catch(function(){ return {}; });
    if(!res.ok && res.status !== 202) return null;
    if(!json) return null;
    var readiness = getZiweiReportReadiness(json);
    if(json.ok !== true && !readiness.processing && !readiness.recoverable) return null;
    return json;
  }

  function ensureChapterFallback(chapters){
    var base = Array.isArray(chapters) ? chapters.slice(0, TOTAL_CHAPTERS) : [];
    var fallbackTitles = ['핵심 성요 신호', '궁 연결 해석', '시기별 실행 전략', '관계/일/재정 실전 조언'];
    for(var i = base.length; i < TOTAL_CHAPTERS; i++){
      base.push({
        title: CHAPTERS[i] || ('Chapter ' + (i + 1)),
        categories: fallbackTitles.map(function(title){
          return { title: title, finalText: '현재 생성 중인 리포트입니다. 잠시 후 재조회하면 완성본이 반영됩니다.' };
        })
      });
    }
    return base;
  }

  async function recoverPendingResult(data, payment){
    var initial = data || {};
    var baseSession = text(initial.sessionId) || text(payment && payment.sessionId);
    var baseReport = text(initial.reportId) || text(payment && payment.reportId);
    var readiness = getZiweiReportReadiness(initial);
    if(readiness.completed){
      return initial;
    }
    if(!baseSession && !baseReport){
      return initial;
    }
    var latest = initial;
    for(var attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt++){
      var percent = Math.min(92, 56 + Math.round((attempt / Math.max(1, RESULT_POLL_MAX_ATTEMPTS - 1)) * 34));
      updateProgress(percent, '로컬 명반 원고와 PDF 저장 상태를 확인하는 중입니다.');
      var recovered = await fetchZiweiResult(baseSession, baseReport);
      if(recovered){
        latest = recovered;
        var recoveredReadiness = getZiweiReportReadiness(recovered);
        logFlow('ReportRecovered', {
          birthHash: text(payment && payment.birthHash),
          chapterCount: Number(recoveredReadiness.chapterCount || 0),
          hasToken: Boolean(text(payment && payment.premiumAccessToken))
        });
        if(recoveredReadiness.completed) return recovered;
        if(!recoveredReadiness.processing && !recoveredReadiness.recoverable) break;
      }
      await new Promise(function(resolve){ setTimeout(resolve, RESULT_POLL_INTERVAL_MS); });
    }
    var latestReadiness = getZiweiReportReadiness(latest);
    if(latestReadiness.successCandidate || readiness.successCandidate){
      return Object.assign({}, latest || initial, {
        status: 'processing',
        chapters: ensureChapterFallback((latest && latest.chapters) || initial.chapters)
      });
    }
    return latest || initial;
  }

  async function postPrepare(profile, seed, payment, birthInput){
    var sessionId = text(payment && payment.sessionId) || buildSessionId(text(payment && payment.birthHash));
    var birthHash = text(payment && payment.birthHash) || makeBirthHash(birthInput || {});
    var paymentContext = normalizePaymentContext(Object.assign({}, payment || {}, { sessionId: sessionId, birthHash: birthHash }), birthHash);
    var token = text(paymentContext.premiumAccessToken) || (payment && (payment.premiumAccessToken || payment.accessToken)) || getPremiumToken();
    paymentContext.premiumAccessToken = token || undefined;
    paymentContext.sessionId = text(paymentContext.sessionId) || sessionId;
    paymentContext.reportSessionId = text(paymentContext.reportSessionId) || paymentContext.sessionId || sessionId;
    var accessGrant = paymentContext.accessGrant && typeof paymentContext.accessGrant === 'object' ? paymentContext.accessGrant : null;
    if(!hasPaymentEvidence(Object.assign({}, paymentContext, { premiumAccessToken: token, accessGrant: accessGrant }), birthHash)){
      throw buildRetryableError('결제 확인 정보가 누락되었습니다. 다시 결제를 진행해 주세요.', 402, 'PAYMENT_EVIDENCE_MISSING', 'payment');
    }
    var headers = { 'Content-Type': 'application/json' };
    if(token) headers['x-premium-access-token'] = token;
    var body = {
      featureKey: FEATURE_KEY,
      reportType: 'ziweiPremium',
      sessionId: sessionId || undefined,
      reportSessionId: paymentContext.reportSessionId || sessionId || undefined,
      idempotencyKey: 'ziwei:' + sessionId + ':' + birthHash,
      birthHash: birthHash,
      premiumAccessToken: token || '',
      requestId: text(paymentContext.requestId) || undefined,
      purchaseId: text(paymentContext.purchaseId) || undefined,
      reportId: text(paymentContext.reportId) || undefined,
      accessGrant: accessGrant || undefined,
      payment: paymentContext,
      _paymentContext: paymentContext,
      paymentContext: paymentContext,
      birthProfile: profile,
      birthInput: birthInput,
      year: profile.year,
      month: profile.month,
      day: profile.day,
      hour: profile.hour,
      minute: profile.minute,
      gender: profile.gender,
      calendarType: profile.calendarType,
      birthplace: profile.birthplace,
      ziweiClientEvidenceJson: buildZiweiClientEvidenceJson(seed, birthInput),
      ziweiBase: seed
    };
    logFlow('PrepareRequest', {
      birthHash: birthHash,
      chapterCount: 0,
      hasToken: Boolean(token)
    });
    var res = await fetch(PREPARE_API, { method: 'POST', credentials: 'include', headers: headers, body: JSON.stringify(body) });
    var json = await res.json().catch(function(){ return {}; });
    if(!res.ok || !json.ok){
      if(json && json.retryable && text(json.status) === 'processing' && (text(json.reportId) || text(json.sessionId) || Array.isArray(json.chapters))){
        return json;
      }
      var code = text(json.code || json.error || 'ZIWEI_PREPARE_FAILED');
      var message = text(json.message || json.error || ('자미두수 PDF 생성 요청에 실패했습니다. HTTP ' + res.status));
      if(res.status === 401 || res.status === 402 || res.status === 403){
        throw buildZiweiApiError({ res: res, json: json }, message, 'payment');
      }
      if(res.status === 422 || res.status >= 500){
        throw buildZiweiApiError({ res: res, json: json }, message, 'generation');
      }
      throw buildZiweiApiError({ res: res, json: json }, message, 'request');
    }
    if(json.premiumAccessToken || json.accessToken) storePremiumToken(json.premiumAccessToken || json.accessToken);
    return json;
  }

  function scrollResultToChapter(chapterNo){
    var target = $('zbChapterSection-' + Number(chapterNo || 0));
    if(!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindResultToc(){
    var toc = $('zbToc');
    if(!toc) return;
    toc.onclick = function(event){
      var target = event.target;
      if(!(target instanceof Element)) return;
      var item = target.closest('.lb-toc-item');
      if(!item) return;
      var chapter = Number(item.getAttribute('data-zb-chapter') || 0);
      if(chapter <= 0) return;
      Array.prototype.forEach.call(toc.querySelectorAll('.lb-toc-item'), function(btn){
        btn.classList.toggle('active', btn === item);
      });
      scrollResultToChapter(chapter);
    };
  }

  function renderResult(data){
    ensureZiweiResultStyle();
    ensureZiweiA11yState();
    var box = $('zbResultContent');
    if(!box) return;
    var chapters = Array.isArray(data.chapters) ? data.chapters : [];
    var toc = $('zbToc');
    if(toc){
      toc.innerHTML = chapters.map(function(chapter, index){
        var title = text(chapter && chapter.title) || CHAPTERS[index] || ('Chapter ' + (index + 1));
        return '<button type="button" class="lb-toc-item loaded' + (index === 0 ? ' active' : '') + '" data-zb-chapter="' + (index + 1) + '"><span>CHAPTER ' + (index + 1) + '</span><strong>' + esc(title.replace(/^Chapter\s*\d+\.?\s*/i, '')) + '</strong></button>';
      }).join('');
    }

    var profile = getZiweiResponseProfile(data);
    var issuedAt = text((data && data.pdfReady && data.pdfReady.generatedAt) || data.generatedAt || new Date().toISOString());
    var summaryName = text(profile.name || profile.birthName || profile.profileName || (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.name) || '사용자');
    setText('zbResultName', summaryName + ' 님');
    setText('zbResultDate', new Date(issuedAt).toLocaleDateString('ko-KR') + ' 생성');

    var header = $('zbResultScreen') ? $('zbResultScreen').querySelector('.lb-result__header') : null;
    if(header && !header.querySelector('.lb-result__top-actions')){
      var topActions = document.createElement('div');
      topActions.className = 'lb-result__top-actions';
      topActions.innerHTML = ''
        + '<button type="button" class="lb-result__pdf-btn" id="zbTopPdfBtn">PDF 다운로드</button>'
        + '<button type="button" class="lb-result__rerun-btn" id="zbTopRegenBtn">결제 내역으로 복구</button>';
      header.appendChild(topActions);
    }

    var cover = '<div class="zb-result-cover"><img src="' + esc(COVER_IMAGE) + '" alt="자미두수 프리미엄 명반서 표지"><div><p>PURPLE STAR ARCHIVE</p><h3>자미두수 프리미엄 PDF</h3><span>' + esc(chapters.length) + '챕터 생성 완료</span>' + renderZiweiQualityBadge(data) + '</div></div>';
    var html = chapters.map(function(chapter, index){
      var categories = Array.isArray(chapter.categories) ? chapter.categories : [];
      var catHtml = categories.map(function(cat){
        return '<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">' + esc(cat.title) + '</h4>' + renderZiweiCategoryText(cat.finalText || cat.text || '') + '</section>';
      }).join('');
      var chapterTitle = text(chapter.title || CHAPTERS[index] || '');
      var summary = text(chapter.summary || '해당 챕터의 핵심 흐름을 정리했습니다.');
      var advice = text(chapter.practicalAdvice || '실전 조언은 기준을 줄이고 반복 루틴을 고정하는 것입니다.');
      var caution = text(chapter.cautionFlow || '주의 흐름은 속도 과열과 감정 과부하입니다.');
      return ''
        + '<article class="lb-result-article" id="zbChapterSection-' + (index + 1) + '">' 
        + '<header class="lb-result-article__head"><span class="lb-result-article__chapter">Chapter ' + (index + 1) + '</span><h3 class="lb-result-article__title">' + esc(chapterTitle) + '</h3></header>'
        + '<p class="lb-result-article__summary">' + esc(summary) + '</p>'
        + catHtml
        + '<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">실전 조언</h4><p class="lb-result-article__section-body">' + esc(advice) + '</p></section>'
        + '<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">주의 흐름</h4><p class="lb-result-article__section-body">' + esc(caution) + '</p></section>'
        + '</article>';
    }).join('');
    box.innerHTML = cover + html + '<div class="zb-result-bottom-download"><button type="button" class="lb-result__pdf-btn" id="zbBottomPdfBtn">PDF 다운로드</button></div>';

    var bottomActions = $('zbResultScreen') ? $('zbResultScreen').querySelector('.lb-result__actions') : null;
    if(bottomActions){
      bottomActions.innerHTML = ''
        + '<button class="lb-result__pdf-btn" id="zbPdfBtn" onclick="downloadZiweiBookPdf()">📥 PDF 다운로드</button>'
        + '<button class="lb-result__rerun-btn" id="zbRegenBtn" onclick="generateZiweiBook(true)">결제 내역으로 이어서 생성</button>'
        + '<button class="lb-result__close-btn" data-action="closeZiweiBookModal">닫기</button>';
    }

    var topPdfBtn = $('zbTopPdfBtn');
    if(topPdfBtn) topPdfBtn.onclick = function(){ window.downloadZiweiBookPdf(); };
    var topRegenBtn = $('zbTopRegenBtn');
    if(topRegenBtn) topRegenBtn.onclick = function(){ window.generateZiweiBook(true); };
    var bottomPdfBtn = $('zbBottomPdfBtn');
    if(bottomPdfBtn) bottomPdfBtn.onclick = function(){ window.downloadZiweiBookPdf(); };

    setDisplay('zbStartScreen','none');
    setDisplay('zbLoadingScreen','none');
    setDisplay('zbResultScreen','block');
    bindResultToc();
    ensureErrorActions();
  }

  async function reopenPreviousReport(){
    var saved = readPaidSession();
    if(!saved || !text(saved.reportId)){
      showError('재열람 가능한 이전 리포트가 없습니다.');
      return;
    }
    var recovered = await fetchZiweiResult(text(saved.sessionId), text(saved.reportId));
    if(!recovered){
      showError('이전 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    RESULT = recovered;
    renderResult(recovered);
    logFlow('ReportRecovered', {
      birthHash: text(saved.birthHash),
      chapterCount: Number((Array.isArray(recovered.chapters) ? recovered.chapters.length : 0) || 0),
      hasToken: Boolean(text(saved.premiumAccessToken))
    });
  }

  function resolveZiweiErrorKind(error, message){
    var status = Number(error && error.status || 0);
    var kind = text(error && error.kind);
    var code = text(error && error.code);
    var msg = text(message || (error && error.message));
    if(/프로필|출생 시간|출생시|생년월일|입력값/.test(msg)) return 'input';
    if(code === 'ZIWEI_PROCESSING' || code === 'ZIWEI_REPORT_RECOVERY_REQUIRED' || kind === 'generation' || status >= 500) return 'recovery';
    if(kind === 'payment' || status === 401 || status === 402 || status === 403 || /결제|이용권/.test(msg)) return 'payment';
    return 'general';
  }

  function resolveZiweiErrorTitle(kind){
    if(kind === 'input') return '프로필 보완이 필요합니다';
    if(kind === 'payment') return '결제 확인이 필요합니다';
    if(kind === 'recovery') return '생성 상태를 이어받을 수 있습니다';
    return '생성 상태를 확인해 주세요';
  }

  function ensureErrorActions(error, message){
    var screen = $('zbErrorScreen');
    if(!screen) return;
    var actions = screen.querySelector('.lb-error__actions');
    if(!actions) return;
    var errorKind = resolveZiweiErrorKind(error || {}, message || '');
    var retryBtn = actions.querySelector('.lb-error__retry');
    if(retryBtn){
      retryBtn.removeAttribute('onclick');
      if(errorKind === 'input'){
        retryBtn.textContent = '프로필 카드 보완하기';
        retryBtn.onclick = function(){ window.goToZiweiProfileSetup(); };
      } else if(errorKind === 'payment'){
        retryBtn.textContent = '결제 다시 확인하기';
        retryBtn.onclick = function(){ window.generateZiweiBook(false); };
      } else {
        retryBtn.textContent = '결제 내역으로 이어서 생성';
        retryBtn.onclick = function(){ window.generateZiweiBook(true); };
      }
    }

    var previousBtn = $('zbOpenPreviousBtn');
    if(!previousBtn){
      previousBtn = document.createElement('button');
      previousBtn.id = 'zbOpenPreviousBtn';
      previousBtn.className = 'lb-error__retry';
      previousBtn.style.marginLeft = '8px';
      previousBtn.textContent = '이전 PDF 열기';
      previousBtn.onclick = function(){ reopenPreviousReport(); };
      actions.insertBefore(previousBtn, actions.firstChild);
    }
    var paid = readPaidSession();
    previousBtn.style.display = errorKind !== 'input' && paid && text(paid.reportId) ? 'inline-flex' : 'none';
  }

  function mapErrorMessage(error){
    var status = Number(error && error.status || 0);
    var kind = text(error && error.kind);
    var code = text(error && error.code);
    if(kind === 'payment' || status === 401 || status === 402 || status === 403){
      return '결제 또는 이용권 확인이 필요합니다. 로그인 상태와 결제 내역을 확인해 주세요.';
    }
    if(code === 'ZIWEI_PROCESSING' || code === 'ZIWEI_REPORT_RECOVERY_REQUIRED'){
      return text(error && error.message) || '결제는 확인되었습니다. 로컬 명반 원고와 PDF 저장이 아직 진행 중입니다. 결제 내역으로 이어받아 주세요.';
    }
    if(status === 422){
      return '명반 계산 또는 입력값 검증 단계에서 오류가 발생했습니다. 프로필 정보를 확인한 뒤 다시 시도해 주세요.';
    }
    if(status >= 500){
      return '결제는 확인되었습니다. 생성 상태를 이어받습니다.';
    }
    return text(error && error.message) || '생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  function showError(message, error){
    setDisplay('zbLoadingScreen','none');
    setDisplay('zbStartScreen','none');
    setDisplay('zbErrorScreen','block');
    var msg = message || mapErrorMessage(error || {});
    var errorKind = resolveZiweiErrorKind(error || {}, msg);
    setText('zbErrorTitle', resolveZiweiErrorTitle(errorKind));
    setText('zbErrorMsg', msg);
    ensureErrorActions(error || {}, msg);
    updateZiweiGenerationState({
      status: 'failed',
      failedChapters: ZIWEI_GENERATION_STATE.failedChapters.concat([Math.max(1, Number(ZIWEI_GENERATION_STATE.currentChapterNo || 1))]),
      message: msg
    });
    if(window.showToast) window.showToast(msg, 'error');
    else alert(msg);
  }

  window.openZiweiBookModal = function(){
    var modal = $('ziweiBookModal');
    if(!modal) return;
    detachModalFromResultPage(modal);
    ensureZiweiA11yState();
    ensureZiweiResultStyle();

    var profile = profileFromObject(window.__cdActiveBirthProfile || window._cdCurrentProfile || window.currentProfile || window._currentProfile || {}, 'activeProfile');
    if (!profile || !profile.year || !profile.month) {
      try {
        var _dpMatch = (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
          || window.__cdCurrentDestinyProfile
          || null;
        if (_dpMatch && _dpMatch.birth && _dpMatch.birth.year) {
          window.__cdActiveBirthProfile = _dpMatch;
          profile = profileFromObject(_dpMatch, 'activeProfile');
        }
      } catch (_dpE) {}
    }

    if (profile && profile.year && profile.month) {
      if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) {
        window.__cdActiveBirthProfile = profile;
      }
      setDisplay('zbStartScreen','block');
      setDisplay('zbNoProfileScreen','none');
    } else {
      setDisplay('zbStartScreen','none');
      setDisplay('zbNoProfileScreen','block');
    }

    var quickMerged = mergeProfilesByPriority([profile || {}, readStorageProfile() || {}, snapshotFormProfile()]);
    renderZiweiProfileReadiness({
      birthInput: normalizeBirthInput(quickMerged),
      profileForEngine: { name: quickMerged.name, birthplace: quickMerged.birthplace || '대한민국' },
      merged: quickMerged
    });
    resolveBirthInput().then(function(resolved){
      renderZiweiProfileReadiness(resolved);
    }).catch(function(){
      renderZiweiProfileReadiness({ merged: quickMerged });
    });

    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    updateZiweiGenerationState({ isOpen: true, totalChapters: TOTAL_CHAPTERS });
    logFlow('ModalOpen', {
      hasProfile: Boolean(profile && profile.year && profile.month),
      hasBirthDate: Boolean(profile && profile.birthDate),
      hasBirthTime: Boolean(profile && profile.birthTime)
    });

    if(!RESULT){
      setDisplay('zbLoadingScreen','none');
      setDisplay('zbResultScreen','none');
      setZiweiPhase('profile', '프로필 정보를 확인하고 있습니다.');
      updateProgress(0, '자미두수 명반을 준비합니다.');
      markChapter(-1);
    }
    ensureErrorActions();

    var paid = readPaidSession();
    if(paid && text(paid.reportId)){
      var openPrev = $('zbOpenPreviousBtn');
      if(openPrev) openPrev.style.display = 'inline-flex';
    }
  };

  window.closeZiweiBookModal = function(){
    var modal = $('ziweiBookModal');
    if(modal){
      modal.classList.remove('active');
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
    updateZiweiGenerationState({ isOpen: false, status: GENERATING ? 'generating' : ZIWEI_GENERATION_STATE.status });
  };

  window.goToZiweiProfileSetup = function(){
    window.closeZiweiBookModal();
    var target = document.getElementById('destinyCardForm');
    if(target && typeof target.scrollIntoView === 'function'){
      try { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { target.scrollIntoView(); }
      var firstInput = target.querySelector('input, select, textarea, button');
      if(firstInput && typeof firstInput.focus === 'function'){
        setTimeout(function(){
          try { firstInput.focus({ preventScroll: true }); } catch (_) { firstInput.focus(); }
        }, 380);
      }
    }
    try { window.history.replaceState(null, '', '#destinyCardForm'); } catch (_) { window.location.hash = 'destinyCardForm'; }
  };

  window.gotoZiweiPremium = function(){
    window.openZiweiBookModal();
  };

  window.generateZiweiBook = async function(usePaidSessionOnly){
    if(GENERATING){
      if(window.showToast) window.showToast('이미 생성 중입니다. 잠시만 기다려 주세요.', 'warning');
      return;
    }
    GENERATING = true;
    ensureZiweiA11yState();
    setZiweiPhase('profile', '프로필 정보를 확인하는 중입니다.');
    setGeneratingUiLock(true, '프로필 확인 중...');
    RESULT = null;
    resetZiweiGenerationState();
    try {
      setDisplay('zbResultScreen','none');
      setDisplay('zbErrorScreen','none');
      setDisplay('zbLoadingScreen','none');
      markChapter(-1);
      var resolved = await resolveBirthInput();
      renderZiweiProfileReadiness(resolved);
      logFlow('ProfileResolved', {
        hasBirthDate: Boolean(resolved.birthInput.birthDate),
        hasBirthTime: Boolean(resolved.birthInput.birthTime),
        birthHour: resolved.birthInput.birthHour,
        pickedCount: Array.isArray(resolved.merged.pickedFrom) ? resolved.merged.pickedFrom.length : 0
      });
      logFlow('BirthInputNormalized', {
        gender: resolved.birthInput.gender,
        calendarType: resolved.birthInput.calendarType,
        birthHour: resolved.birthInput.birthHour,
        isTimeUnknown: resolved.birthInput.isTimeUnknown
      });
      validateBirthInputOrThrow(resolved.birthInput);
      updateZiweiGenerationState({ status: 'birthInputValidated' });
      logFlow('ValidationBeforePayment', {
        hasBirthDate: true,
        hasBirthTime: true,
        birthHour: resolved.birthInput.birthHour
      });
      logFlow('PaymentGateStart', { featureKey: FEATURE_KEY, coinCost: COIN_COST });
      setZiweiPhase('payment', '결제 확인 중입니다. 완료 후 생성이 시작됩니다.');
      setGeneratingUiLock(true, '결제 확인 중...');
      setDisplay('zbStartScreen','none');
      setDisplay('zbResultScreen','none');
      setDisplay('zbErrorScreen','none');
      setDisplay('zbLoadingScreen','block');
      markChapter(-1);
      updateProgress(4, '결제 완료 전에는 명반 생성이 시작되지 않습니다.');
      updateZiweiGenerationState({ status: 'paymentChecking' });
      var payment = await ensurePaymentOrRestore(resolved.birthInput, { reuseOnly: usePaidSessionOnly === true });
      if(usePaidSessionOnly === true && !payment.reused){
        throw buildRetryableError('결제 내역을 찾지 못했습니다. 먼저 결제를 완료해 주세요.', 402, 'PAYMENT_REUSE_MISSING', 'payment');
      }
      setZiweiPhase('calculate', '결제가 확인되었습니다. 명궁과 12궁을 계산합니다.');
      setGeneratingUiLock(true, '명반 계산 중...');
      updateProgress(10, '명궁 12궁 계산을 위한 출생 정보를 정리하는 중입니다.');
      updateProgress(18, '명궁의 중심 흐름을 정리하는 중입니다.');
      updateZiweiGenerationState({ status: 'calculating' });
      var profile = resolved.profileForEngine;
      var seed = await buildZiweiSeed(profile);
      writePaidSession({
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        sessionId: text(payment.sessionId),
        premiumAccessToken: text(payment.premiumAccessToken || payment.accessToken || payment.token),
        transactionId: text(payment.transactionId),
        paidAt: text(payment.paidAt) || new Date().toISOString(),
        birthHash: text(payment.birthHash),
        status: 'generating'
      });
      logFlow('PaymentGateSuccess', {
        hasPaymentToken: Boolean(payment && (payment.premiumAccessToken || payment.accessToken || payment.token))
      });
      updateProgress(40, getChapterProgressLine(0));
      updateProgress(52, getChapterProgressLine(1));
      setZiweiPhase('write', '15챕터 상담문을 정리하고 있습니다.');
      updateZiweiGenerationState({ status: 'drafting' });
      var sessionId = text(payment && payment.sessionId) || buildSessionId(text(payment && payment.birthHash));
      updateZiweiGenerationState({ status: 'generating', sessionId: sessionId, currentChapterNo: 1 });
      logFlow('SessionCreateStart', { endpoint: PREPARE_API, hasPaymentToken: Boolean(payment && (payment.premiumAccessToken || payment.accessToken)) });
      logFlow('PdfRequestStart', { endpoint: PREPARE_API, chapterTarget: TOTAL_CHAPTERS });
      var data = await postPrepare(profile, seed, Object.assign({}, payment, { sessionId: sessionId }), resolved.birthInput);
      var readiness = getZiweiReportReadiness(data);
      if(!readiness.completed){
        var recoveredData = await recoverPendingResult(data, payment);
        readiness = getZiweiReportReadiness(recoveredData);
        if(readiness.processing){
          writePaidSession({
            status: 'failed_retryable',
            reportId: text(recoveredData.reportId || data.reportId),
            sessionId: text(recoveredData.sessionId || sessionId)
          });
          RESULT = recoveredData;
          throw buildRetryableError('결제는 확인되었습니다. 로컬 명반 원고와 PDF 저장이 아직 진행 중입니다. 결제 내역으로 이어받아 주세요.', 202, 'ZIWEI_PROCESSING', 'generation');
        }
        data = recoveredData;
      }
      if(!isZiweiReportReady(data)){
        writePaidSession({ status: 'failed_retryable', reportId: text(data && data.reportId), sessionId: text(data && data.sessionId) || sessionId });
        RESULT = data;
        throw buildRetryableError('결제는 확인되었습니다. 로컬 명반 결과를 아직 PDF로 확정하지 못했습니다. 결제 내역으로 이어받아 주세요.', 202, 'ZIWEI_REPORT_RECOVERY_REQUIRED', 'generation');
      }
      var manuscriptSource = text(data && data.manuscriptSource).toLowerCase();
      var localAssembly = data && data.localAssembly && typeof data.localAssembly === 'object' ? data.localAssembly : {};
      var localAssemblyChapterCount = Number(localAssembly.chapterCount || 0);
      if(
        manuscriptSource !== 'premium-local-expert'
        || localAssembly.enabled !== true
        || localAssembly.qualityTier !== 'premium-local-expert'
        || localAssembly.externalCallsAllowed !== false
        || localAssembly.externalGeneration === true
        || localAssembly.fallbackUsed === true
        || localAssembly.fallbackAllowed === true
        || localAssemblyChapterCount < TOTAL_CHAPTERS
      ){
        throw buildRetryableError('자미두수 PDF가 로컬 전문가 원고 검증을 통과하지 못했습니다. 결제 내역으로 이어받아 주세요.', 422, 'ZIWEI_LOCAL_EXPERT_REQUIRED', 'generation');
      }
      logFlow('SessionCreateSuccess', {
        chapterCount: Array.isArray(data && data.chapters) ? data.chapters.length : 0,
        qualityStatus: text(data && data.qualityStatus)
      });
      var localDraftCount = Number((data && data.localDraftChapterCount) || 0);
      var chapterProgressCount = Math.max(0, Math.min(TOTAL_CHAPTERS, localDraftCount || Number((data && data.chapterCount) || 0)));
      updateProgress(66, FINALIZE_PROGRESS_LINES[0]);
      for(var i=0; i<chapterProgressCount; i++){
        markChapter(i);
        updateProgress(68 + Math.round(((i + 1) / TOTAL_CHAPTERS) * 12), getChapterProgressLine(i));
        logFlow('LocalExpertProgress', { chapterDone: i + 1, chapterTotal: TOTAL_CHAPTERS });
        logFlow('ChapterGenerated', {
          birthHash: text(payment && payment.birthHash),
          chapterCount: i + 1,
          hasToken: Boolean(text(payment && (payment.premiumAccessToken || payment.accessToken || payment.token)))
        });
      }
      setZiweiPhase('archive', '15챕터를 PDF 저장본으로 확정합니다.');
      updateProgress(84, FINALIZE_PROGRESS_LINES[1]);
      updateZiweiGenerationState({ status: 'enhancing' });
      setZiweiPhase('archive', 'PDF 저장과 다운로드 준비를 마무리합니다.');
      updateProgress(95, '생성된 리포트를 보관하는 중입니다.');
      updateZiweiGenerationState({ status: 'savingPdf' });
      RESULT = data;
      logFlow('PdfRequestSuccess', {
        chapterCount: Array.isArray(data && data.chapters) ? data.chapters.length : 0,
        localDraftChapterCount: localDraftCount,
        qualityStatus: text(data && data.qualityStatus)
      });
      markChapter(TOTAL_CHAPTERS - 1);
      setZiweiPhase('archive', '자미두수 프리미엄 PDF가 완성되었습니다.');
      updateProgress(100, '자미두수 프리미엄 리포트가 완성되었습니다.');
      updateZiweiGenerationState({ status: 'completed', reportId: text(data && data.reportId), currentChapterNo: TOTAL_CHAPTERS });
      writePaidSession({
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        sessionId: text(data && data.sessionId) || sessionId,
        reportId: text(data && data.reportId),
        premiumAccessToken: text(payment && (payment.premiumAccessToken || payment.accessToken || payment.token)),
        transactionId: text(payment && payment.transactionId),
        birthHash: text(payment && payment.birthHash),
        paidAt: text(payment && payment.paidAt) || new Date().toISOString(),
        status: 'completed'
      });
      logFlow('PdfRendered', {
        birthHash: text(payment && payment.birthHash),
        chapterCount: Number((Array.isArray(data && data.chapters) ? data.chapters.length : 0) || 0),
        hasToken: Boolean(text(payment && (payment.premiumAccessToken || payment.accessToken || payment.token)))
      });
      renderResult(data);
    } catch(error) {
      var normalizedError = normalizeZiweiError(error);
      logZiweiError(error, { stage: text(error && error.stage) || 'generate', sessionId: sessionId, reportId: text(RESULT && RESULT.reportId) });
      if((Number(error && error.status || 0) >= 422 && Number(error && error.status || 0) !== 401 && Number(error && error.status || 0) !== 402 && Number(error && error.status || 0) !== 403) || text(error && error.kind) === 'generation'){
        var paid = readPaidSession();
        if(paid){
          writePaidSession({ status: 'failed_retryable' });
        }
        logFlow('PrepareFailedRetryable', {
          birthHash: text(paid && paid.birthHash),
          chapterCount: Number((Array.isArray(RESULT && RESULT.chapters) ? RESULT.chapters.length : 0) || 0),
          hasToken: Boolean(text(paid && paid.premiumAccessToken))
        });
      }
      logFlow('Error', normalizedError);
      showError(mapErrorMessage(error), error);
    } finally {
      GENERATING = false;
      setGeneratingUiLock(false);
    }
  };

  function parseFilenameFromDisposition(disposition){
    var src = text(disposition);
    if(!src) return '';
    var utf = src.match(/filename\*=UTF-8''([^;]+)/i);
    if(utf && utf[1]){
      try { return decodeURIComponent(utf[1]); } catch(_) { return utf[1]; }
    }
    var basic = src.match(/filename="?([^";]+)"?/i);
    return basic && basic[1] ? basic[1] : '';
  }

  function withZiweiPdfArchiveFormat(url, format){
    var value = text(url);
    var targetFormat = text(format) || 'pdf';
    if(!value || value.indexOf('/api/premium/pdf-archive/') === -1) return value;
    if(/[?&]format=/i.test(value)){
      return value.replace(/([?&]format=)[^&]+/i, '$1' + encodeURIComponent(targetFormat));
    }
    return value + (value.indexOf('?') === -1 ? '?' : '&') + 'format=' + encodeURIComponent(targetFormat);
  }

  window.downloadZiweiBookPdf = async function(){
    if(DOWNLOADING) return;
    if(!RESULT){
      showError('먼저 자미두수 PDF를 생성해 주세요.');
      return;
    }
    var chapters = Array.isArray(RESULT.chapters) ? RESULT.chapters : [];
    var readiness = getZiweiReportReadiness(RESULT);
    if(chapters.length < TOTAL_CHAPTERS && !readiness.hasStoredUrl){
      showError('아직 15챕터가 모두 준비되지 않았습니다. 결제 내역으로 이어받아 복구해 주세요.');
      return;
    }
    var reportId = text(RESULT && RESULT.reportId);
    if(!reportId){
      var paid = readPaidSession();
      reportId = text(paid && paid.reportId);
    }
    if(!reportId){
      showError('PDF 파일을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    DOWNLOADING = true;
    var failMessage = 'PDF 파일을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    try {
      setZiweiDownloadLock(true, 'PDF 확인 중...');
      var downloadUrl = getZiweiDownloadUrl(RESULT);
      if(downloadUrl && downloadUrl.indexOf('/api/premium/pdf-archive/') !== -1){
        downloadUrl = withZiweiPdfArchiveFormat(downloadUrl, 'pdf');
      }
      if(!downloadUrl){
        downloadUrl = DOWNLOAD_API + '?reportId=' + encodeURIComponent(reportId);
      }
      var res = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include'
      });
      if(!res.ok){
        throw new Error('download_http_' + res.status);
      }
      var contentType = text(res.headers.get('content-type'));
      if(contentType.toLowerCase().indexOf('application/pdf') === -1){
        throw new Error('download_invalid_content_type:' + contentType);
      }
      var blob = await res.blob();
      if(!blob || blob.size < 500){
        throw new Error('download_pdf_too_small:' + (blob ? blob.size : 0));
      }
      var magic = await readBlobPrefix(blob, 5);
      if(magic !== '%PDF-'){
        throw new Error('download_invalid_pdf_magic:' + magic);
      }
      var fileName = parseFilenameFromDisposition(res.headers.get('content-disposition')) || buildZiweiPdfFilename((RESULT.pdfReady && RESULT.pdfReady.generatedAt) || new Date());
      var blobUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(blobUrl); }, 3000);
      if(window.showToast) window.showToast('PDF 다운로드를 시작했습니다.', 'success');
    } catch(error){
      console.error('[ZiweiPremiumPDF][DownloadFailed]', {
        reportId: reportId,
        reason: normalizeZiweiError(error)
      });
      if(window.showToast) window.showToast(failMessage, 'error');
      else alert(failMessage);
    } finally {
      DOWNLOADING = false;
      setZiweiDownloadLock(false);
    }
  };

  window.__ziweiBookState = function(){ return { result: RESULT, seed: LAST_SEED, generating: GENERATING }; };
})();
