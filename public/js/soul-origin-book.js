(function () {
  'use strict';

  if (typeof window !== 'undefined' && window.__cdSoulOriginBookInitialized) {
    return;
  }
  if (typeof window !== 'undefined') {
    window.__cdSoulOriginBookInitialized = true;
  }

  var FEATURE_KEY = 'premium_pdf_soul_origin';
  var REPORT_TYPE = 'soulOriginKarma';
  var ARCHIVE_REPORT_TYPE = 'soul_origin_karma';
  var EXPECTED_CHAPTER_COUNT = 12;
  var REPORT_TYPE_ALIASES = [
    'premium_pdf_soul_origin',
    REPORT_TYPE,
    ARCHIVE_REPORT_TYPE,
    'soul-origin',
    'premium-soul-origin-report',
  ];
  var FEATURE_ALIASES = [
    REPORT_TYPE,
    ARCHIVE_REPORT_TYPE,
    'soul-origin',
    'premium-soul-origin-report',
  ];
  var COIN_COST = 690;
  var PREPARE_API = '/api/soul-origin';
  var AI_CONSULTATION_API = '/api/soul-origin/ai-consultation';
  var AI_CONSULTATION_SERVICE_TYPE = 'soul_origin_ai_consultation';
  var AI_CONSULTATION_MARKER = 'soul-origin-ai-consultation-v20260627';
  var VERIFY_ACCESS_API = '/api/soul-origin/verify-access';
  var CREATE_JOB_API = '/api/soul-origin/create-job';
  var GENERATE_MOCK_API = '/api/soul-origin/generate-mock';
  var STATUS_API = '/api/soul-origin/status';
  var READ_API = '/api/soul-origin/report';
  var RESULT_API = '/api/soul-origin/result';
  var SOUL_ORIGIN_FETCH_TIMEOUT_MS = 180000;
  var SOUL_ORIGIN_STATUS_TIMEOUT_MS = 360000;
  var SOUL_ORIGIN_STATUS_INITIAL_DELAY_MS = 2500;
  var SOUL_ORIGIN_STATUS_MAX_DELAY_MS = 8000;
  var SOUL_ORIGIN_LOADING_TICK_MS = 4800;
  var SOUL_ORIGIN_STATUS_MESSAGE_HOLD_MS = 5200;
  var STORAGE_KEY = 'premium:soul-origin:last:v1';
  var JOB_STORAGE_KEY = 'premium:soul-origin:current-job:v1';
  var REQUEST_ID_KEY = 'premium:soul-origin:last-request-id:v1';
  var SESSION_ID_KEY = 'premium:soul-origin:last-session-id:v1';
  var TONE_PRESETS = {
    default: 1,
    emotion_first: 1,
    direct_action: 1,
    relationship_focus: 1,
    money_focus: 1,
    destiny_focus: 1,
  };
  var DEFAULT_TONE_PRESET = 'default';
  var DEFAULT_TONE_INTENSITY = 2;

  var _result = null;
  var _loadingTimer = null;
  var _loadingMessageHoldUntil = 0;
  var _statusPreviewStop = null;
  var _isGenerating = false;
  var _resolvedCoinCost = COIN_COST;
  var _selectedKarmaCategory = 'general';
  var _questionTouched = false;

  var KARMA_AI_CATEGORIES = [
    { key: 'general', label: '종합 업 리딩', question: '왜 제 인생에는 비슷한 고비가 반복되는 것 같을까요? 제가 풀어야 할 운명의 업은 무엇인가요?' },
    { key: 'repeat_crisis', label: '반복되는 고비', question: '제 삶에서 반복되는 고비의 뿌리와 지금 넘어설 수 있는 방향을 알려주세요.' },
    { key: 'relationship', label: '관계의 업', question: '제 관계에서 반복되는 업이나 인연의 패턴을 사주, 베다점, 점성술로 함께 봐주세요.' },
    { key: 'family', label: '가족의 과제', question: '가족과의 갈등이 제 운명에서 어떤 과제로 드러나는지 알고 싶어요.' },
    { key: 'money', label: '돈의 막힘', question: '돈과 성공이 막히는 이유를 사주, 베다점, 점성술로 통합해서 봐주세요.' },
    { key: 'career', label: '직업과 사명', question: '제 직업과 사명의 방향에서 반복되는 숙제와 해방 전략을 알려주세요.' },
    { key: 'love_attachment', label: '사랑과 집착', question: '사랑에서 반복되는 집착이나 두려움의 패턴을 알고 싶어요.' },
    { key: 'self_sabotage', label: '자기방해', question: '제가 스스로를 막는 방식과 그것을 넘어서는 현실적인 방향을 알려주세요.' },
    { key: 'liberation_timing', label: '해방의 시기', question: '앞으로 언제쯤 삶의 흐름이 바뀔 수 있을지 가능한 범위에서 알려주세요.' },
    { key: 'choice', label: '지금의 선택', question: '지금 제가 넘어서야 할 가장 큰 인생 숙제와 선택의 방향은 무엇인가요?' },
  ];

  var SOUL_ORIGIN_BOOK_TEXT_TRANSLATIONS = {
    ko: {
      loadingTexts: [
        '사주와 별의 흐름을 함께 읽고 있어요.',
        '반복되는 삶의 패턴을 찾고 있어요.',
        '라후와 케투, 노드의 방향을 살펴보고 있어요.',
        '대운, 다샤, 트랜짓의 공통 주제를 정리하고 있어요.',
        '당신이 넘어설 수 있는 운명의 매듭을 찾고 있어요.',
      ],
      oneTime: '1회',
      revisitAvailable: '결과 재열람 가능',
      qualityVeryClear: '매우 선명함',
      qualityStable: '안정적으로 선명함',
      qualityCore: '핵심 흐름 확인됨',
      qualityPassed: '검수 완료',
      qualityReviewing: '상담 검수 진행 중',
      qualitySummaryPrefix: '상담 검수',
      qualitySummarySuffix: '장별 근거와 실천 처방 확인',
      practiceFallback: '오늘 바로 바꿀 수 있는 작은 선택부터 정리하고, 같은 반응이 반복되는 장면을 하나씩 다르게 지나가 보세요.',
      symbolicSentence: '상징 문장',
      mainSymbolFallback: '운명의 핵심 상징',
      resultSummaryTitle: '상담 핵심 요약',
      chapterUnit: '장',
      sectionCount: '개 세부 카테고리',
      coreJudgment: '핵심 판정',
      coreJudgmentFallback: '운명의 업 흐름을 장별로 정리했습니다.',
      symbolicAxis: '상징 축',
      symbolicAxisFallback: '사주와 대운의 교차 흐름',
      practicePrescription: '실천 처방',
      selectedChapter: '선택 챕터',
      itemPrefix: '항목',
      pdfDetailNotice: '계산 데이터가 열어준 범위 안에서 상담이 이어졌습니다.',
      paymentCanceled: '결제가 취소되었습니다.',
      krwPaymentFailed: '원화 결제 확인에 실패했습니다.',
      paymentTitle: '운명의 업 AI 상담',
    },
    en: {
      loadingTexts: [
        'Gathering the core themes across five destiny currents.',
        'Reading repeated patterns in the natal chart and decade cycle.',
        'Organizing the destiny structure of Zi Wei life and body palaces.',
        'Reflecting timing flows from Western and Vedic astrology.',
        'Integrating Sukuyo relationship karma.',
        'Completing your premium karma of destiny report.',
      ],
      oneTime: 'one time',
      revisitAvailable: 'result can be reopened',
      qualityVeryClear: 'very clear',
      qualityStable: 'steadily clear',
      qualityCore: 'core flow confirmed',
      qualityPassed: 'review complete',
      qualityReviewing: 'consultation review in progress',
      qualitySummaryPrefix: 'consultation review',
      qualitySummarySuffix: 'chapter evidence and practice guidance checked',
      practiceFallback: 'Begin with one small choice you can change today, then adjust repeated reactions one by one.',
      symbolicSentence: 'symbolic sentence',
      mainSymbolFallback: 'core destiny symbol',
      resultSummaryTitle: 'Core Consultation Summary',
      chapterUnit: 'chapters',
      sectionCount: 'detailed sections',
      coreJudgment: 'Core Judgment',
      coreJudgmentFallback: 'The karma flow of destiny has been organized by chapter.',
      symbolicAxis: 'Symbolic Axis',
      symbolicAxisFallback: 'intersection of saju and decade cycles',
      practicePrescription: 'Practice Prescription',
      selectedChapter: 'Selected Chapter',
      itemPrefix: 'Item',
      pdfDetailNotice: 'The consultation follows only the calculated data that was available.',
      paymentCanceled: 'Payment was canceled.',
      krwPaymentFailed: 'KRW payment verification failed.',
      paymentTitle: 'Karma of Destiny AI Consultation',
    },
    ja: {
      loadingTexts: [
        '五つの占術の流れから核心テーマを整えています。',
        '四柱原局と大運に繰り返される型を読み解いています。',
        '紫微斗数の命宮と身宮に宿る運命構造を整理しています。',
        '西洋占星術とヴェーダ占星術の時期の流れを反映しています。',
        '宿曜占星術の縁のカルマを統合しています。',
        '運命のカルマ・プレミアムリポートを仕上げています。',
      ],
      oneTime: '1回',
      revisitAvailable: '結果の再閲覧が可能',
      qualityVeryClear: 'とても鮮明',
      qualityStable: '安定して鮮明',
      qualityCore: '核心の流れを確認済み',
      qualityPassed: '検収完了',
      qualityReviewing: '相談内容を検収中',
      qualitySummaryPrefix: '相談検収',
      qualitySummarySuffix: '章ごとの根拠と実践処方を確認',
      practiceFallback: '今日すぐ変えられる小さな選択から整え、同じ反応が繰り返される場面を一つずつ変えてみてください。',
      symbolicSentence: '象徴文',
      mainSymbolFallback: '運命の核心象徴',
      resultSummaryTitle: '相談の核心要約',
      chapterUnit: '章',
      sectionCount: '個の詳細カテゴリ',
      coreJudgment: '核心判定',
      coreJudgmentFallback: '運命のカルマの流れを章ごとに整理しました。',
      symbolicAxis: '象徴軸',
      symbolicAxisFallback: '四柱と大運が交差する流れ',
      practicePrescription: '実践処方',
      selectedChapter: '選択した章',
      itemPrefix: '項目',
      pdfDetailNotice: '計算されたデータの範囲内で相談が続きました。',
      paymentCanceled: '決済がキャンセルされました。',
      krwPaymentFailed: 'ウォン決済の確認に失敗しました。',
      paymentTitle: '運命のカルマAI相談',
    }
  };

  function getSoulOriginBookLocale() {
    var value = '';
    try { if (window.cdGetCurrentLanguage) value = String(window.cdGetCurrentLanguage() || ''); } catch (_) {}
    if (!value) {
      try { value = String(localStorage.getItem('cd_lang') || localStorage.getItem('cd_locale') || localStorage.getItem('codeDestinyLocale') || localStorage.getItem('lang') || ''); } catch (_) { value = ''; }
    }
    value = String(value || '').trim().replace('_', '-').toLowerCase();
    if (value.indexOf('ja') === 0) return 'ja';
    if (value.indexOf('en') === 0) return 'en';
    return 'ko';
  }

  function getSoulOriginBookCopy() {
    return SOUL_ORIGIN_BOOK_TEXT_TRANSLATIONS[getSoulOriginBookLocale()] || SOUL_ORIGIN_BOOK_TEXT_TRANSLATIONS.ko;
  }

  function $(id) { return document.getElementById(id); }
  function clean(value) { return String(value == null ? '' : value).trim(); }

  function formatCoinCost(value) {
    var cost = Math.max(0, Math.floor(Number(value || COIN_COST)));
    return (cost * 100).toLocaleString('ko-KR') + '원';
  }

  function updateSoulOriginCoinCost(cost) {
    _resolvedCoinCost = Math.max(0, Math.floor(Number(cost || COIN_COST)));
    var copy = getSoulOriginBookCopy();
    var label = formatCoinCost(_resolvedCoinCost);
    var badge = $('soCoinCostBadge');
    var notice = $('soCoinCostLabel');
    if (badge) badge.textContent = label + ' · ' + copy.oneTime;
    if (notice) notice.textContent = label + ' · ' + copy.revisitAvailable;
  }

  function setDisplay(id, value) {
    var el = $(id);
    if (el) el.style.display = value;
  }

  function makeRequestId() {
    return 'soul-origin-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function makeSessionId() {
    return 'soul-origin:session:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
  }

  function readSessionValue(key) {
    try { return clean(sessionStorage.getItem(key) || ''); } catch (_) { return ''; }
  }

  function writeSessionValue(key, value) {
    try { sessionStorage.setItem(key, clean(value)); } catch (_) {}
  }

  function logStage(stage, extras) {
    var payload = Object.assign({
      stage: clean(stage) || 'unknown',
      reportType: REPORT_TYPE,
      productKey: FEATURE_KEY,
      requestId: readSessionValue(REQUEST_ID_KEY),
      sessionId: readSessionValue(SESSION_ID_KEY),
      errorCode: '',
    }, extras || {});
    var tag = '[DestinyPrayerBook] ' + payload.stage;
    if (payload.errorCode) {
      console.error(tag, payload);
      return;
    }
    console.info(tag, payload);
  }

  function shortList(value, limit) {
    var source = Array.isArray(value) ? value : [];
    return source.map(function (item) { return clean(item); }).filter(Boolean).slice(0, Math.max(1, Number(limit || 6)));
  }

  function payloadSafe(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.error && typeof data.error === 'object' ? data.error : {};
    var debugSafe = data.debugSafe && typeof data.debugSafe === 'object' ? data.debugSafe : {};
    return {
      code: clean(data.code || nested.code || data.errorCode || nested.errorCode || data.error) || undefined,
      message: clean(data.message || nested.message || data.reasonMessage || nested.reasonMessage || data.error) || undefined,
      stage: clean(data.stage || data.failureStage || debugSafe.stage || nested.stage || nested.failureStage) || undefined,
      failureType: clean(data.failureType || debugSafe.failureType || nested.failureType) || undefined,
      reportId: clean(data.reportId || debugSafe.reportId || nested.reportId) || undefined,
      sessionId: clean(data.sessionId || debugSafe.sessionId || nested.sessionId) || undefined,
      executionId: clean(data.executionId || debugSafe.executionId || nested.executionId) || undefined,
      missing: shortList(data.missing || nested.missing || data.hardMissingFields, 6),
      issues: shortList(data.issues || nested.issues || data.errors || nested.errors, 6),
      debugSafe: Object.keys(debugSafe).length ? debugSafe : undefined
    };
  }

  function buildApiError(pack, fallbackMessage, context) {
    var payload = pack && pack.data && typeof pack.data === 'object'
      ? pack.data
      : (pack && pack.body && typeof pack.body === 'object' ? pack.body : {});
    var status = Number((pack && pack.status) || payload.statusCode || payload.status || 0);
    var safe = payloadSafe(payload);
    var error = new Error(clean(safe.message || fallbackMessage || ('HTTP ' + (status || ''))) || 'Soul origin PDF request failed.');
    error.status = status || undefined;
    error.code = clean(safe.code) || 'SOUL_ORIGIN_REQUEST_FAILED';
    error.stage = clean(safe.stage || context && context.stage) || 'prepare';
    error.failureType = clean(safe.failureType);
    error.reportId = clean(safe.reportId || context && context.reportId);
    error.sessionId = clean(safe.sessionId || context && context.sessionId);
    error.executionId = clean(safe.executionId);
    error.missing = safe.missing;
    error.issues = safe.issues;
    error.payloadSafe = safe;
    error.payload = payload;
    return error;
  }

  function logExactError(error, extras) {
    try {
      var safePayload = error && error.payloadSafe
        ? error.payloadSafe
        : payloadSafe((error && error.payload) || (error && typeof error === 'object' ? error : {}));
      var safe = {
        serviceKey: 'soul-origin',
        featureKey: FEATURE_KEY,
        reportType: REPORT_TYPE,
        stage: clean(extras && extras.stage || error && error.stage || safePayload.stage) || 'unknown',
        failureType: clean(error && error.failureType || safePayload.failureType) || undefined,
        status: Number(error && error.status || extras && extras.status || 0) || undefined,
        code: clean(error && error.code || safePayload.code) || 'SOUL_ORIGIN_CLIENT_ERROR',
        message: clean(error && error.message ? error.message : error) || 'unknown',
        requestId: clean(extras && extras.requestId || error && error.requestId || readSessionValue(REQUEST_ID_KEY)) || undefined,
        sessionId: clean(extras && extras.sessionId || error && error.sessionId || safePayload.sessionId || readSessionValue(SESSION_ID_KEY)) || undefined,
        reportId: clean(extras && extras.reportId || error && error.reportId || safePayload.reportId) || undefined,
        executionId: clean(extras && extras.executionId || error && error.executionId || safePayload.executionId) || undefined,
        missing: shortList(error && error.missing || safePayload.missing, 6),
        issues: shortList(error && error.issues || safePayload.issues, 6),
        causeMessage: clean(error && error.cause && (error.cause.message || error.cause)) || undefined,
        payloadSafe: safePayload
      };
      console.error('[SoulOriginBook][Error][' + safe.stage + ']', safe);
    } catch (_) {}
  }

  function showScreen(name) {
    setDisplay('soStartScreen', name === 'start' ? '' : 'none');
    setDisplay('soLoadingScreen', name === 'loading' ? '' : 'none');
    setDisplay('soResultScreen', name === 'result' ? '' : 'none');
    setDisplay('soErrorScreen', name === 'error' ? '' : 'none');
  }

  function setLoadingMessage(message, options) {
    var el = $('soLoadingMessage');
    var text = clean(message);
    if (el && text) el.textContent = text;
    var holdMs = Number(options && options.holdMs || 0);
    if (holdMs > 0) _loadingMessageHoldUntil = Date.now() + holdMs;
  }

  function statusPayloadValue(payload, key) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.data && typeof data.data === 'object' ? data.data : {};
    return data[key] || nested[key];
  }

  function soulOriginStageMessage(status) {
    var step = clean(status).toLowerCase();
    if (step === 'access_verifying') return '결제 검증 중입니다.';
    if (step === 'access_verified') return '운명의 업 상담을 준비하고 있습니다.';
    if (step === 'created') return '운명의 업 상담을 준비하고 있습니다.';
    if (step === 'queued') return '운명의 업 상담을 준비하고 있습니다.';
    if (step === 'pending') return '상담 원고를 열기 전, 결제 권한과 요청 정보를 차분히 맞추고 있습니다.';
    if (step === 'validating') return '태어난 시간과 기본 정보를 다시 맞추며 운명의 업 상담을 여는 중입니다.';
    if (step === 'calculating') return '사주 원국, 자미두수 명궁, 점성술 차트와 베다 라그나의 신호를 모으고 있습니다.';
    if (step === 'generating') return '계산된 신호를 따라 운명의 업 상담사가 장별 원고를 집필하고 있습니다.';
    if (step === 'chapter_generating') return '기존 운명의 업 챕터 순서에 따라 장별 원고를 생성하고 있습니다.';
    if (step === 'rendering') return 'PDF 문서를 렌더링하고 있습니다.';
    if (step === 'saving') return 'PDF 파일을 저장하고 있습니다.';
    if (step === 'completed') return '운명의 업 상담서가 완성되었습니다. 곧 결과를 열어드립니다.';
    if (step === 'failed') return '운명의 업 상담 생성 중 문제가 발생했습니다.';
    return '사주·자미두수·점성술·베다·숙요의 흐름을 한 권의 상담서로 엮고 있습니다.';
  }

  function generationStatusLabel(status) {
    var step = clean(status).toLowerCase();
    if (step === 'completed') return '완료';
    if (step === 'generating') return '생성 중';
    if (step === 'chapter_generating') return '생성 중';
    if (step === 'failed') return '실패';
    if (step === 'rendering') return '렌더링';
    if (step === 'saving') return '저장 중';
    return '대기';
  }

  function ensureGenerationProgressEl() {
    var screen = $('soLoadingScreen');
    if (!screen) return null;
    var box = $('soGenerationProgress');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'soGenerationProgress';
    box.style.cssText = 'margin:18px auto 0;max-width:520px;text-align:left;color:#f8fafc;font-size:13px;line-height:1.6;';
    box.innerHTML = '<div id="soProgressMeta" style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;color:#fde68a;"></div><div style="height:8px;border-radius:999px;background:rgba(255,255,255,.16);overflow:hidden;"><div id="soProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#facc15,#fb7185);transition:width .28s ease;"></div></div><div id="soChapterStatusList" style="margin-top:12px;display:grid;gap:5px;"></div>';
    screen.appendChild(box);
    return box;
  }

  function renderGenerationProgress(payload) {
    var box = ensureGenerationProgressEl();
    if (!box) return;
    var progress = normalizePercent(statusPayloadValue(payload, 'progressPercent') || statusPayloadValue(payload, 'progress') || 0);
    var total = Number(statusPayloadValue(payload, 'totalChapters') || statusPayloadValue(payload, 'chapterCount') || EXPECTED_CHAPTER_COUNT);
    var completed = Number(statusPayloadValue(payload, 'completedChapters') || 0);
    var chapters = statusPayloadValue(payload, 'chapters');
    var meta = $('soProgressMeta');
    var bar = $('soProgressBar');
    var list = $('soChapterStatusList');
    if (meta) {
      meta.innerHTML = '<span>현재 상태 ' + generationStatusLabel(statusPayloadValue(payload, 'generationStatus') || statusPayloadValue(payload, 'status')) + '</span><span>' + Math.max(0, completed) + ' / ' + Math.max(0, total) + '장 · ' + progress + '%</span>';
    }
    if (bar) bar.style.width = progress + '%';
    if (!list) return;
    list.innerHTML = '';
    if (!Array.isArray(chapters) || !chapters.length) return;
    chapters.forEach(function (chapter, index) {
      var item = document.createElement('div');
      var status = clean(chapter && chapter.status).toLowerCase();
      var label = status === 'completed' ? '완료' : (status === 'generating' ? '생성 중' : (status === 'failed' ? '실패' : '대기'));
      var color = status === 'completed' ? '#bbf7d0' : (status === 'generating' ? '#fde68a' : (status === 'failed' ? '#fecaca' : '#cbd5e1'));
      item.style.cssText = 'display:flex;gap:8px;align-items:flex-start;border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:6px 8px;background:rgba(15,23,42,.32);';
      item.innerHTML = '<span style="min-width:56px;color:' + color + ';">[' + label + ']</span><span>' + (Number(chapter.order || index + 1)) + '장 ' + clean(chapter.title || ('챕터 ' + (index + 1))) + '</span>';
      list.appendChild(item);
    });
  }

  function applySoulOriginGenerationStatus(payload, options) {
    var status = clean(statusPayloadValue(payload, 'generationStatus') || statusPayloadValue(payload, 'currentStep') || statusPayloadValue(payload, 'status') || statusPayloadValue(payload, 'serverStatus'));
    var title = clean(statusPayloadValue(payload, 'currentChapterTitle'));
    var progress = Number(statusPayloadValue(payload, 'progress') || 0);
    if (!status && !title && !progress) return false;
    var message = soulOriginStageMessage(status);
    if (title) message += ' 지금은 "' + title + '" 장을 생성 중입니다.';
    if (progress > 0 && progress < 100) message += ' ' + Math.max(1, Math.min(99, Math.round(progress))) + '%까지 이어졌습니다.';
    setLoadingMessage(message, { holdMs: Number(options && options.holdMs || SOUL_ORIGIN_STATUS_MESSAGE_HOLD_MS) });
    renderGenerationProgress(payload);
    return true;
  }

  function getApiBaseCandidates(path) {
    var p = String(path || '');
    if (p.charAt(0) !== '/') p = '/' + p;
    var out = [];
    var seen = {};
    function push(base) {
      var b = clean(base).replace(/\/+$/, '');
      var u = b ? (b + p) : p;
      if (seen[u]) return;
      seen[u] = true;
      out.push(u);
    }
    push('');
    push(window.__CD_API_BASE_URL || '');
    push(window.__API_BASE_URL || '');
    push(window.__AUTH_API_BASE_URL || '');
    push(window.location && window.location.origin ? window.location.origin : '');
    return out;
  }

  function parseDateParts(dateStr) {
    var m = clean(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;
    var parts = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
    if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return null;
    return parts;
  }

  function isValidBirthDateParts(year, month, day, calendarType) {
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    if (String(calendarType || '').indexOf('lunar') === 0) return day <= 30;
    var date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function parseTimeParts(timeStr) {
    var m = clean(timeStr).match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;
    var parts = { hour: Number(m[1]), minute: Number(m[2]) };
    if (parts.hour < 0 || parts.hour > 23 || parts.minute < 0 || parts.minute > 59) return null;
    return parts;
  }

  function inferTimezoneOffsetHours(timezone) {
    if (!clean(timezone)) return 9;
    if (/seoul|tokyo/i.test(timezone)) return 9;
    if (/utc/i.test(timezone)) return 0;
    return 9;
  }

  function normalizeCalendarType(value) {
    var raw = clean(value || 'solar').toLowerCase();
    if (raw.indexOf('lunar') >= 0 || raw.indexOf('음') >= 0) {
      return raw.indexOf('leap') >= 0 || raw.indexOf('윤') >= 0 ? 'lunar_leap' : 'lunar';
    }
    return 'solar';
  }

  function normalizeTonePreset(value) {
    var raw = clean(value).toLowerCase().replace(/[\s]/g, '_');
    if (!raw || !TONE_PRESETS[raw]) {
      return DEFAULT_TONE_PRESET;
    }
    return raw;
  }

  function normalizeToneIntensity(value) {
    var parsed = Number(clean(value));
    if (!Number.isFinite(parsed)) return DEFAULT_TONE_INTENSITY;
    var next = Math.round(parsed);
    if (next < 1 || next > 5) return DEFAULT_TONE_INTENSITY;
    return next;
  }

  function normalizeToneWeightValue(value) {
    var parsed = Number(clean(value));
    if (!Number.isFinite(parsed)) return null;
    var next = Math.round(parsed);
    if (next < 0 || next > 10) return null;
    return next;
  }

  function readSoulOriginToneWeightsFromQuery(params) {
    var result = {};
    var parsedWeights = {};

    try {
      if (typeof params.get === 'function') {
        var packed = clean(params.get('toneWeights'));
        if (packed) {
          var parsed = JSON.parse(packed);
          if (parsed && typeof parsed === 'object') {
            parsedWeights = parsed;
          }
        }
      }
    } catch (_) {
      parsedWeights = {};
    }

    var direct = {
      love: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightLove')) || ''),
      career: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightCareer')) || ''),
      money: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightMoney')) || ''),
      fortune: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightFortune')) || ''),
      identity: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightIdentity')) || ''),
    };
    var pLove = normalizeToneWeightValue(parsedWeights.love);
    var pCareer = normalizeToneWeightValue(parsedWeights.career);
    var pMoney = normalizeToneWeightValue(parsedWeights.money);
    var pFortune = normalizeToneWeightValue(parsedWeights.fortune);
    var pIdentity = normalizeToneWeightValue(parsedWeights.identity);
    var globalWeights = {};
    try { globalWeights = window.__cdSoulOriginToneWeights && typeof window.__cdSoulOriginToneWeights === 'object' ? window.__cdSoulOriginToneWeights : {}; } catch (_) { globalWeights = {}; }

    var gLove = normalizeToneWeightValue(globalWeights.love);
    var gCareer = normalizeToneWeightValue(globalWeights.career);
    var gMoney = normalizeToneWeightValue(globalWeights.money);
    var gFortune = normalizeToneWeightValue(globalWeights.fortune);
    var gIdentity = normalizeToneWeightValue(globalWeights.identity);

    if (pLove !== null || gLove !== null || direct.love !== null) result.love = direct.love !== null ? direct.love : (gLove !== null ? gLove : pLove);
    if (pCareer !== null || gCareer !== null || direct.career !== null) result.career = direct.career !== null ? direct.career : (gCareer !== null ? gCareer : pCareer);
    if (pMoney !== null || gMoney !== null || direct.money !== null) result.money = direct.money !== null ? direct.money : (gMoney !== null ? gMoney : pMoney);
    if (pFortune !== null || gFortune !== null || direct.fortune !== null) result.fortune = direct.fortune !== null ? direct.fortune : (gFortune !== null ? gFortune : pFortune);
    if (pIdentity !== null || gIdentity !== null || direct.identity !== null) result.identity = direct.identity !== null ? direct.identity : (gIdentity !== null ? gIdentity : pIdentity);

    if (Object.keys(result).length <= 0) return {};
    return result;
  }

  function readSoulOriginToneSettings() {
    var params = {};
    try {
      params = new URLSearchParams(window.location && window.location.search ? window.location.search : '');
    } catch (_) {
      params = {};
    }

    var preset = normalizeTonePreset(
      (typeof params.get === 'function' && clean(params.get('tonePreset'))) ||
      (typeof params.get === 'function' && clean(params.get('counselingTonePreset'))) ||
      (typeof params.get === 'function' && clean(params.get('toneMode'))) ||
      window.__cdSoulOriginTonePreset ||
      '',
    );

    var intensity = normalizeToneIntensity(
      (typeof params.get === 'function' && params.get('toneIntensity')) ||
      (typeof params.get === 'function' && params.get('toneWeight')) ||
      (typeof params.get === 'function' && params.get('toneStrength')) ||
      window.__cdSoulOriginToneIntensity,
    );
    var toneWeights = readSoulOriginToneWeightsFromQuery(params);

    return {
      tonePreset: preset,
      toneIntensity: intensity,
      toneWeights: toneWeights,
    };
  }

  function readStorageProfile() {
    try {
      var selected = (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
        || window.__cdCurrentDestinyProfile
        || null;
      if (!selected) return null;
      var birth = selected.birth || {};
      var storageBirthDate = clean(selected.birthDate || selected.birthday || birth.birthDate || '');
      var hasStorageBirthDateParts = birth.year && birth.month && birth.day;
      if (!storageBirthDate && hasStorageBirthDateParts) {
        storageBirthDate = [String(birth.year).padStart(4, '0'), String(birth.month).padStart(2, '0'), String(birth.day).padStart(2, '0')].join('-');
      }
      var storageBirthTime = clean(selected.birthTime || selected.time || '');
      var hasStorageBirthHour = Number.isFinite(Number(birth.hour));
      if (!storageBirthTime && hasStorageBirthHour) {
        storageBirthTime = [String(Number(birth.hour)).padStart(2, '0'), String(Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0).padStart(2, '0')].join(':');
      }
      return {
        name: clean(selected.name || selected.profileName || '사용자') || '사용자',
        gender: clean(selected.gender || selected.sex || 'unknown') || 'unknown',
        birthDate: storageBirthDate,
        birthTime: storageBirthTime,
        birthPlace: resolveSoulOriginBirthPlace(selected),
        calendarType: clean(selected.calendarType || selected.calendar || selected.calType || birth.calendarType || birth.calendar || birth.calType || 'solar') || 'solar',
        timezone: clean(selected.timezone || (selected.location && selected.location.tz) || 'Asia/Seoul') || 'Asia/Seoul',
        latitude: Number(selected.latitude != null ? selected.latitude : (selected.location && selected.location.lat)),
        longitude: Number(selected.longitude != null ? selected.longitude : (selected.location && (selected.location.lon != null ? selected.location.lon : selected.location.lng))),
      };
    } catch (_) {
      return null;
    }
  }

  function resolveSoulOriginBirthPlace(profile, fallbackProfile) {
    var src = profile || {};
    var loc = src.location && typeof src.location === 'object' ? src.location : {};
    var fallback = fallbackProfile || {};
    var fallbackLoc = fallback.location && typeof fallback.location === 'object' ? fallback.location : {};
    return clean(
      src.birthPlace
      || src.birthplace
      || src.place
      || src.locationName
      || loc.label
      || loc.name
      || loc.city
      || fallback.birthPlace
      || fallback.birthplace
      || fallback.place
      || fallback.locationName
      || fallbackLoc.label
      || fallbackLoc.name
      || fallbackLoc.city
      || ''
    );
  }

  function readActiveProfile() {
    var profile = window.__cdActiveBirthProfile || {};
    var birth = profile.birth || {};
    var storageProfile = readStorageProfile();
    if (birth.year && birth.month && birth.day) {
      var hasHour = Number.isFinite(Number(birth.hour));
      var hour = hasHour ? Number(birth.hour) : null;
      var minute = Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0;
      var date = [String(birth.year).padStart(4, '0'), String(birth.month).padStart(2, '0'), String(birth.day).padStart(2, '0')].join('-');
      var time = hasHour ? [String(hour).padStart(2, '0'), String(minute).padStart(2, '0')].join(':') : '';
      return {
        name: clean(profile.name || (storageProfile && storageProfile.name) || '사용자') || '사용자',
        gender: clean(profile.gender || (storageProfile && storageProfile.gender) || 'unknown') || 'unknown',
        birthDate: date,
        birthTime: time,
        birthPlace: resolveSoulOriginBirthPlace(profile, storageProfile),
        calendarType: clean(profile.calendarType || profile.calendar || profile.calType || birth.calendarType || birth.calendar || birth.calType || (storageProfile && storageProfile.calendarType) || 'solar') || 'solar',
        timezone: clean(profile.timezone || (profile.location && profile.location.tz) || (storageProfile && storageProfile.timezone) || 'Asia/Seoul') || 'Asia/Seoul',
        latitude: Number(profile.latitude != null ? profile.latitude : (profile.location && profile.location.lat) != null ? profile.location.lat : storageProfile && storageProfile.latitude),
        longitude: Number(profile.longitude != null ? profile.longitude : (profile.location && (profile.location.lon != null ? profile.location.lon : profile.location.lng)) != null ? (profile.location.lon != null ? profile.location.lon : profile.location.lng) : storageProfile && storageProfile.longitude),
      };
    }

    return storageProfile;
  }

  function normalizeInput(raw) {
    var src = raw || {};
    var date = parseDateParts(src.birthDate || '');
    var time = parseTimeParts(src.birthTime || '');
    if (!date) return null;

    var fallbackHour = Number(src.birthHour);
    var fallbackMinute = Number(src.birthMinute);
    if ((!time || !Number.isFinite(time.hour)) && Number.isFinite(fallbackHour)) {
      time = {
        hour: fallbackHour,
        minute: Number.isFinite(fallbackMinute) ? fallbackMinute : 0,
      };
    }

    if (!time || !Number.isFinite(time.hour)) return null;

    var lat = Number(src.latitude);
    var lon = Number(src.longitude);
    if (!Number.isFinite(lat)) lat = 37.5665;
    if (!Number.isFinite(lon)) lon = 126.978;

    var timezone = clean(src.timezone || 'Asia/Seoul') || 'Asia/Seoul';
    var calendarType = normalizeCalendarType(src.calendarType || src.calendar || src.calType || 'solar');
    if (!isValidBirthDateParts(date.year, date.month, date.day, calendarType)) return null;

    return {
      name: clean(src.name || '사용자') || '사용자',
      gender: clean(src.gender || 'unknown') || 'unknown',
      birthDate: [String(date.year).padStart(4, '0'), String(date.month).padStart(2, '0'), String(date.day).padStart(2, '0')].join('-'),
      birthTime: [String(time.hour).padStart(2, '0'), String(time.minute).padStart(2, '0')].join(':'),
      birthPlace: resolveSoulOriginBirthPlace(src) || '대한민국',
      calendarType: calendarType,
      timezone: timezone,
      timezoneOffset: inferTimezoneOffsetHours(timezone),
      latitude: lat,
      longitude: lon,
      year: date.year,
      month: date.month,
      day: date.day,
      hour: time.hour,
      minute: time.minute,
      birthHour: time.hour,
      birthMinute: time.minute,
    };
  }

  function ensureSoulOriginAIStyles() {
    if (document.getElementById('soAIConsultationStyles')) return;
    var style = document.createElement('style');
    style.id = 'soAIConsultationStyles';
    style.textContent = [
      '.so-ai-panel{margin:18px 0;padding:18px;border:1px solid rgba(245,200,111,.24);border-radius:8px;background:rgba(15,23,42,.38);display:grid;gap:14px}',
      '.so-ai-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
      '.so-ai-field{display:grid;gap:6px;color:#f8fafc;font-size:.86rem}',
      '.so-ai-field span{color:#fde68a;font-weight:800}',
      '.so-ai-field input,.so-ai-field select,.so-ai-field textarea{width:100%;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(2,6,23,.42);color:#fff;padding:10px 11px;font:inherit;box-sizing:border-box}',
      '.so-ai-field textarea{min-height:104px;resize:vertical;line-height:1.55}',
      '.so-ai-inline{display:flex;align-items:center;gap:8px;color:#f8fafc;font-size:.86rem}',
      '.so-ai-inline input{width:auto}',
      '.so-ai-topic{display:flex;flex-wrap:wrap;gap:8px}',
      '.so-ai-chip{border:1px solid rgba(245,200,111,.3);border-radius:999px;background:rgba(255,255,255,.06);color:#fff0c7;padding:8px 11px;font-weight:800;cursor:pointer}',
      '.so-ai-chip.is-active{background:#f5c86f;color:#24150f;border-color:#f5c86f}',
      '.so-ai-note{margin:0;color:#d1d5db;font-size:.82rem;line-height:1.6}',
      '.so-ai-limitations{margin:0 0 14px;padding:12px 14px;border:1px solid rgba(245,158,11,.35);border-radius:8px;background:rgba(120,53,15,.24);color:#fde68a;line-height:1.6}',
      '.so-ai-result-card{border:1px solid rgba(245,200,111,.18);border-radius:8px;background:rgba(15,23,42,.42);padding:16px;margin:0 0 12px;color:#f8fafc}',
      '.so-ai-result-card h4{margin:0 0 8px;color:#fde68a;font-size:1rem;letter-spacing:0}',
      '.so-ai-result-card p{margin:0;color:#e5e7eb;line-height:1.75;white-space:pre-wrap}',
      '.so-ai-result-card ul{margin:8px 0 0;padding-left:18px;color:#e5e7eb;line-height:1.7}',
      '@media(max-width:720px){.so-ai-grid{grid-template-columns:1fr}.so-ai-panel{padding:14px}.so-ai-chip{padding:7px 9px;font-size:.82rem}}',
    ].join('');
    document.head.appendChild(style);
  }

  function setSoulOriginCategory(categoryKey, forceQuestion) {
    var key = clean(categoryKey) || 'general';
    var selected = KARMA_AI_CATEGORIES.filter(function (item) { return item.key === key; })[0] || KARMA_AI_CATEGORIES[0];
    _selectedKarmaCategory = selected.key;
    try {
      document.querySelectorAll('#soKarmaTopicChips .so-ai-chip').forEach(function (btn) {
        btn.classList.toggle('is-active', clean(btn.getAttribute('data-karma-category')) === selected.key);
      });
    } catch (_) {}
    var questionEl = $('soQuestionInput');
    if (questionEl && (forceQuestion || !_questionTouched || !clean(questionEl.value))) {
      questionEl.value = selected.question;
      _questionTouched = false;
    }
  }

  function ensureSoulOriginAIConsultationUI() {
    ensureSoulOriginAIStyles();
    var start = $('soStartScreen');
    if (!start) return;
    if (!document.getElementById('soAIInputPanel')) {
      var panel = document.createElement('div');
      panel.id = 'soAIInputPanel';
      panel.className = 'so-ai-panel';
      panel.setAttribute('data-cd-marker', AI_CONSULTATION_MARKER);
      panel.innerHTML = [
        '<div class="so-ai-grid">',
          '<label class="so-ai-field"><span>이름 또는 닉네임</span><input id="soBirthName" type="text" autocomplete="name" placeholder="사용자"></label>',
          '<label class="so-ai-field"><span>성별</span><select id="soBirthGender"><option value="unknown">선택 안 함</option><option value="female">여성</option><option value="male">남성</option><option value="other">기타</option></select></label>',
          '<label class="so-ai-field"><span>생년월일</span><input id="soBirthDate" type="date"></label>',
          '<label class="so-ai-field"><span>출생시간</span><input id="soBirthTime" type="time"></label>',
          '<label class="so-ai-field"><span>출생지</span><input id="soBirthPlace" type="text" placeholder="예: 서울, 대한민국"></label>',
          '<label class="so-ai-field"><span>Timezone</span><input id="soBirthTimezone" type="text" placeholder="Asia/Seoul"></label>',
          '<label class="so-ai-field"><span>위도</span><input id="soBirthLatitude" type="number" step="0.000001" placeholder="37.5665"></label>',
          '<label class="so-ai-field"><span>경도</span><input id="soBirthLongitude" type="number" step="0.000001" placeholder="126.9780"></label>',
          '<label class="so-ai-field"><span>양력/음력</span><select id="soCalendarType"><option value="solar">양력</option><option value="lunar">음력</option><option value="lunar_leap">음력 윤달</option></select></label>',
          '<label class="so-ai-inline"><input id="soBirthTimeUnknown" type="checkbox"> 출생시간 모름</label>',
        '</div>',
        '<div>',
          '<p class="so-ai-note">출생시간 또는 출생지 정보가 부족한 경우 일부 해석은 제한적으로 제공됩니다. 없는 운세 데이터는 임의로 만들지 않습니다.</p>',
        '</div>',
        '<div id="soKarmaTopicChips" class="so-ai-topic"></div>',
        '<label class="so-ai-field"><span>질문</span><textarea id="soQuestionInput" maxlength="1000" placeholder="예: 왜 제 인생에는 비슷한 고비가 반복되는 것 같을까요? 제가 풀어야 할 운명의 업은 무엇인가요?"></textarea></label>',
      ].join('');
      var profileBox = start.querySelector('.lb-start__profile-box');
      if (profileBox && profileBox.parentNode) profileBox.parentNode.insertBefore(panel, profileBox.nextSibling);
      else start.appendChild(panel);
      var chips = $('soKarmaTopicChips');
      if (chips) {
        KARMA_AI_CATEGORIES.forEach(function (item) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'so-ai-chip';
          btn.setAttribute('data-karma-category', item.key);
          btn.textContent = item.label;
          btn.onclick = function () { setSoulOriginCategory(item.key, !_questionTouched); };
          chips.appendChild(btn);
        });
      }
      var questionEl = $('soQuestionInput');
      if (questionEl) {
        questionEl.addEventListener('input', function () {
          _questionTouched = true;
        });
      }
      var unknownEl = $('soBirthTimeUnknown');
      var timeEl = $('soBirthTime');
      if (unknownEl && timeEl) {
        unknownEl.addEventListener('change', function () {
          timeEl.disabled = unknownEl.checked;
          if (unknownEl.checked) timeEl.value = '';
        });
      }
    }
    var chapters = start.querySelector('.lb-start__chapters');
    if (chapters) chapters.style.display = 'none';
    var headline = start.querySelector('.lb-marketing-headline');
    if (headline) headline.innerHTML = '반복되는 삶의 패턴, 이제는 <strong>읽고 넘어설 시간</strong>';
    var sub = start.querySelector('.lb-marketing-sub');
    if (sub) sub.textContent = '사주, 베다점, 서양 점성술의 공통 흐름을 바탕으로 삶에서 반복되는 과제와 해방의 방향을 상담해드립니다.';
    var note = start.querySelector('.lb-start__note');
    if (note) note.textContent = 'PDF를 기다리지 않아도 됩니다. 결제 확인 뒤 화면에서 바로 상담 결과를 확인합니다.';
    var cta = start.querySelector('.lb-start__cta');
    if (cta) cta.textContent = '운명의 업 상담 받기';
    setSoulOriginCategory(_selectedKarmaCategory, false);
  }

  function setInputValue(id, value) {
    var el = $(id);
    if (el && !clean(el.value)) el.value = clean(value);
  }

  function prefillSoulOriginAIForm(profileRaw) {
    ensureSoulOriginAIConsultationUI();
    var profile = profileRaw || {};
    setInputValue('soBirthName', profile.name || '사용자');
    if ($('soBirthGender')) $('soBirthGender').value = clean(profile.gender || 'unknown') || 'unknown';
    setInputValue('soBirthDate', profile.birthDate || '');
    setInputValue('soBirthTime', profile.birthTime || '');
    setInputValue('soBirthPlace', resolveSoulOriginBirthPlace(profile) || '');
    setInputValue('soBirthTimezone', profile.timezone || 'Asia/Seoul');
    if (Number.isFinite(Number(profile.latitude))) setInputValue('soBirthLatitude', String(Number(profile.latitude)));
    if (Number.isFinite(Number(profile.longitude))) setInputValue('soBirthLongitude', String(Number(profile.longitude)));
    if ($('soCalendarType')) $('soCalendarType').value = normalizeCalendarType(profile.calendarType || 'solar');
    var unknownEl = $('soBirthTimeUnknown');
    var timeEl = $('soBirthTime');
    if (unknownEl && timeEl) {
      if (clean(timeEl.value)) {
        unknownEl.checked = false;
        timeEl.disabled = false;
      } else {
        unknownEl.checked = true;
        timeEl.disabled = true;
      }
    }
  }

  function readSoulOriginAIFormInput(profileRaw) {
    ensureSoulOriginAIConsultationUI();
    var profile = profileRaw || {};
    var dateValue = clean(($('soBirthDate') && $('soBirthDate').value) || profile.birthDate || '');
    var date = parseDateParts(dateValue);
    if (!date) {
      var dateError = new Error('생년월일을 입력해 주세요.');
      dateError.code = 'BIRTH_DATE_REQUIRED';
      throw dateError;
    }
    var timeValue = clean(($('soBirthTime') && $('soBirthTime').value) || profile.birthTime || '');
    var unknown = Boolean($('soBirthTimeUnknown') && $('soBirthTimeUnknown').checked);
    var time = timeValue ? parseTimeParts(timeValue) : null;
    if (!unknown && !time) {
      var timeError = new Error('출생시간을 입력하거나 출생시간 모름을 선택해 주세요.');
      timeError.code = 'BIRTH_TIME_OR_UNKNOWN_REQUIRED';
      throw timeError;
    }
    var calendarType = normalizeCalendarType((($('soCalendarType') && $('soCalendarType').value) || profile.calendarType || 'solar'));
    if (!isValidBirthDateParts(date.year, date.month, date.day, calendarType)) {
      var inputError = new Error('생년월일 형식을 확인해 주세요.');
      inputError.code = 'BIRTH_INPUT_INVALID';
      throw inputError;
    }
    var lat = Number(($('soBirthLatitude') && $('soBirthLatitude').value) || profile.latitude);
    var lon = Number(($('soBirthLongitude') && $('soBirthLongitude').value) || profile.longitude);
    var hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
    var birthInput = {
      name: clean(($('soBirthName') && $('soBirthName').value) || profile.name || '사용자') || '사용자',
      gender: clean(($('soBirthGender') && $('soBirthGender').value) || profile.gender || 'unknown') || 'unknown',
      birthDate: [String(date.year).padStart(4, '0'), String(date.month).padStart(2, '0'), String(date.day).padStart(2, '0')].join('-'),
      birthTime: unknown ? '' : [String(time.hour).padStart(2, '0'), String(time.minute).padStart(2, '0')].join(':'),
      birthPlace: clean(($('soBirthPlace') && $('soBirthPlace').value) || resolveSoulOriginBirthPlace(profile) || ''),
      calendarType: calendarType,
      timezone: clean(($('soBirthTimezone') && $('soBirthTimezone').value) || profile.timezone || 'Asia/Seoul') || 'Asia/Seoul',
      timezoneOffset: inferTimezoneOffsetHours((($('soBirthTimezone') && $('soBirthTimezone').value) || profile.timezone || 'Asia/Seoul')),
      birthTimeUnknown: unknown,
      isTimeUnknown: unknown,
      year: date.year,
      month: date.month,
      day: date.day,
      hour: unknown ? null : time.hour,
      minute: unknown ? 0 : time.minute,
      birthHour: unknown ? null : time.hour,
      birthMinute: unknown ? 0 : time.minute,
    };
    if (hasCoords) {
      birthInput.latitude = lat;
      birthInput.longitude = lon;
    }
    return birthInput;
  }

  function readSoulOriginAIQuestion() {
    var value = clean(($('soQuestionInput') && $('soQuestionInput').value) || '');
    if (!value) {
      var selected = KARMA_AI_CATEGORIES.filter(function (item) { return item.key === _selectedKarmaCategory; })[0] || KARMA_AI_CATEGORIES[0];
      value = selected.question;
    }
    if (value.length < 5 || value.length > 1000) {
      var error = new Error('질문은 5자 이상 1000자 이하로 입력해 주세요.');
      error.code = 'QUESTION_INVALID';
      throw error;
    }
    return value;
  }

  function withArchiveFormat(value, format) {
    var url = clean(value);
    var targetFormat = clean(format).toLowerCase();
    if (!url || !targetFormat || url.indexOf('/api/premium/pdf-archive/') < 0) return url;
    try {
      var parsed = new URL(url, window.location.origin);
      parsed.searchParams.set('format', targetFormat);
      if (/^https?:\/\//i.test(url)) return parsed.toString();
      return parsed.pathname + parsed.search + parsed.hash;
    } catch (_) {
      var joiner = url.indexOf('?') >= 0 ? '&' : '?';
      return url.replace(/([?&])format=[^&#]*/i, '$1format=' + targetFormat) + (/[?&]format=/i.test(url) ? '' : joiner + 'format=' + targetFormat);
    }
  }

  function resolveReportUrl(payload, preferred) {
    var pdfReady = payload && payload.pdfReady && typeof payload.pdfReady === 'object' ? payload.pdfReady : {};
    if (preferred === 'html') {
      return withArchiveFormat(clean(
        (payload && payload.htmlUrl)
        || pdfReady.htmlUrl
        || (payload && payload.pdfUrl)
        || (payload && payload.downloadUrl)
        || pdfReady.pdfUrl
        || pdfReady.downloadUrl
      ), 'html');
    }
    if (preferred === 'pdf') {
      return withArchiveFormat(clean(
        (payload && payload.pdfUrl)
        || (payload && payload.downloadUrl)
        || pdfReady.pdfUrl
        || pdfReady.downloadUrl
        || (payload && payload.htmlUrl)
        || pdfReady.htmlUrl
      ), 'pdf');
    }
    return clean(
      (payload && payload.pdfUrl)
      || (payload && payload.downloadUrl)
      || (payload && payload.htmlUrl)
      || pdfReady.pdfUrl
      || pdfReady.downloadUrl
      || pdfReady.htmlUrl
    );
  }

  function isSoulOriginReportReady(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var pdfReady = data.pdfReady && typeof data.pdfReady === 'object' ? data.pdfReady : {};
    var chapters = Array.isArray(data.chapters) ? data.chapters : [];
    var reportedCount = Number(data.chapterCount || 0);
    var status = clean(data.status).toLowerCase();
    var serverStatus = clean(data.serverStatus).toLowerCase();
    var qualityStatus = clean(data.qualityStatus).toLowerCase();
    var manuscriptSource = clean(data.manuscriptSource || pdfReady.manuscriptSource).toLowerCase();
    var chapterAuthoringSource = clean(data.chapterAuthoringSource).toLowerCase();
    var summarySource = clean(data.summarySource).toLowerCase();
    var llmAssembly = (data.llmAssembly && typeof data.llmAssembly === 'object')
      ? data.llmAssembly
      : (pdfReady.llmAssembly && typeof pdfReady.llmAssembly === 'object' ? pdfReady.llmAssembly : {});
    var llmAssemblyOnly = data.llmAssemblyOnly === true || pdfReady.llmAssemblyOnly === true;
    var externalGeneration = llmAssembly.externalGeneration === true;
    var fallbackUsed = data.fallbackUsed === true || llmAssembly.fallbackUsed === true;
    var hasReportId = !!clean(data.reportId);
    var hasStoredUrl = !!resolveReportUrl(data, 'pdf') && !!resolveReportUrl(data, 'html');
    var isCompleted = (!status && !serverStatus) || status === 'completed' || serverStatus === 'completed';
    var hasExpectedChapters = chapters.length >= EXPECTED_CHAPTER_COUNT || reportedCount >= EXPECTED_CHAPTER_COUNT;
    var hasPassedQuality = qualityStatus === 'passed';
    var hasAcceptedManuscript = manuscriptSource === 'llm-authored';
    var hasAcceptedChapters = !chapterAuthoringSource || chapterAuthoringSource === 'llm-authored';
    var hasAcceptedSummary = !summarySource || summarySource === 'llm-authored';
    return hasReportId && hasStoredUrl && hasExpectedChapters && hasPassedQuality && isCompleted && hasAcceptedManuscript && hasAcceptedChapters && hasAcceptedSummary && llmAssemblyOnly && externalGeneration && !fallbackUsed;
  }

  function isSoulOriginRunning(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.data && typeof data.data === 'object' ? data.data : {};
    var status = clean(data.generationStatus || nested.generationStatus || data.status || data.serverStatus || nested.status).toLowerCase();
    return status === 'running'
      || status === 'processing'
      || status === 'created'
      || status === 'access_verifying'
      || status === 'access_verified'
      || status === 'queued'
      || status === 'generating'
      || status === 'chapter_generating'
      || status === 'pending'
      || status === 'validating'
      || status === 'calculating'
      || status === 'rendering'
      || status === 'saving';
  }

  function isSoulOriginFailed(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var status = clean(data.status || data.serverStatus).toLowerCase();
    var premiumStatus = clean(data.premiumStatus || (data.execution && data.execution.premiumStatus)).toLowerCase();
    var code = clean(data.code).toUpperCase();
    if (status === 'not_found' || code.indexOf('EXECUTION_NOT_FOUND') >= 0) return false;
    return data.ok === false || status === 'failed' || premiumStatus === 'failed' || premiumStatus === 'abandoned' || premiumStatus === 'refunded' || premiumStatus === 'refund_failed';
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, Math.max(0, Number(ms || 0)));
    });
  }

  function buildStatusPath(context) {
    var params = [];
    function add(key, value) {
      var text = clean(value);
      if (text) params.push(encodeURIComponent(key) + '=' + encodeURIComponent(text));
    }
    add('reportId', context && context.reportId);
    add('sessionId', context && context.sessionId);
    add('requestId', context && context.requestId);
    return STATUS_API + (params.length ? ('?' + params.join('&')) : '');
  }

  function callStatusApi(context, token) {
    var endpoints = getApiBaseCandidates(buildStatusPath(context));
    var idx = 0;
    var lastError = null;
    return new Promise(function (resolve, reject) {
      function run() {
        if (idx >= endpoints.length) {
          var error = lastError || new Error('운명의 업 상담 상태를 확인하지 못했습니다.');
          error.code = clean(error.code) || 'SOUL_ORIGIN_STATUS_LOOKUP_FAILED';
          reject(error);
          return;
        }
        var headers = {};
        var premiumToken = clean(token || readPremiumToken());
        var authToken = readAuthToken();
        if (premiumToken) headers['x-premium-access-token'] = premiumToken;
        if (authToken) headers.Authorization = 'Bearer ' + authToken;
        fetchJsonWithTimeout(endpoints[idx], { method: 'GET', headers: headers }, 20000)
          .then(function (pack) {
            if (pack.ok && pack.data) {
              resolve(pack.data);
              return;
            }
            if (pack.data) {
              var status = clean(pack.data.status || pack.data.serverStatus).toLowerCase();
              var code = clean(pack.data.code).toUpperCase();
              if (status === 'not_found' || code.indexOf('EXECUTION_NOT_FOUND') >= 0) {
                resolve(pack.data);
                return;
              }
            }
            if (pack.data && isSoulOriginFailed(pack.data)) {
              var failed = buildApiError(pack, clean(pack.data.message || pack.data.code) || '운명의 업 상담 생성 중 문제가 발생했습니다.', {
                stage: 'status',
                reportId: clean(context && context.reportId),
                sessionId: clean(context && context.sessionId)
              });
              failed.code = clean(failed.code) || 'SOUL_ORIGIN_STATUS_FAILED';
              reject(failed);
              return;
            }
            lastError = buildApiError(pack, clean(pack.data && (pack.data.message || pack.data.code)) || ('HTTP ' + pack.status), {
              stage: 'status',
              reportId: clean(context && context.reportId),
              sessionId: clean(context && context.sessionId)
            });
            idx += 1;
            run();
          })
          .catch(function (error) {
            lastError = error instanceof Error ? error : new Error(clean(error && error.message) || '상태 확인 실패');
            idx += 1;
            run();
          });
      }
      run();
    });
  }

  async function pollSoulOriginStatus(context, token) {
    var started = Date.now();
    var delay = SOUL_ORIGIN_STATUS_INITIAL_DELAY_MS;
    while (Date.now() - started < SOUL_ORIGIN_STATUS_TIMEOUT_MS) {
      await sleep(delay);
      logStage('StatusPollStart', {
        requestId: clean(context && context.requestId),
        sessionId: clean(context && context.sessionId),
        reportId: clean(context && context.reportId),
      });
      var data = await callStatusApi(context, token);
      applySoulOriginGenerationStatus(data);
      if (isSoulOriginReportReady(data)) {
        logStage('StatusPollSuccess', {
          requestId: clean(context && context.requestId),
          sessionId: clean(data && data.sessionId) || clean(context && context.sessionId),
          reportId: clean(data && data.reportId) || clean(context && context.reportId),
        });
        return data;
      }
      if (isSoulOriginFailed(data)) {
        var failed = buildApiError({ status: Number(data && data.statusCode || 500), data: data }, clean(data && (data.message || data.code)) || '운명의 업 상담 생성 중 문제가 발생했습니다.', {
          stage: 'status',
          reportId: clean(context && context.reportId),
          sessionId: clean(context && context.sessionId)
        });
        failed.code = clean(failed.code) || 'SOUL_ORIGIN_GENERATION_FAILED';
        throw failed;
      }
      delay = Math.min(SOUL_ORIGIN_STATUS_MAX_DELAY_MS, delay + 1000);
    }
    var timeout = new Error('운명의 업 상담 생성이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.');
    timeout.code = 'SOUL_ORIGIN_STATUS_TIMEOUT';
    throw timeout;
  }

  async function restoreCurrentSoulOriginJob(context) {
    var saved = context || readCurrentJob();
    if (!saved) return false;
    var token = readPremiumToken();
    showScreen('loading');
    startLoadingTicker();
    setLoadingMessage('저장된 운명의 업 상담 상태를 확인하는 중입니다.', { holdMs: SOUL_ORIGIN_STATUS_MESSAGE_HOLD_MS });
    try {
      var statusData = await callStatusApi(saved, token);
      applySoulOriginGenerationStatus(statusData);
      if (isSoulOriginReportReady(statusData)) {
        clearCurrentJob();
        persistResult(statusData);
        renderResult(statusData);
        return true;
      }
      if (isSoulOriginFailed(statusData)) {
        clearCurrentJob();
        var failedMsg = clean(statusData && (statusData.message || statusData.errorMessage)) || '운명의 업 상담 생성 중 문제가 발생했습니다.';
        var errEl = $('soErrorMsg');
        if (errEl) errEl.textContent = failedMsg;
        showScreen('error');
        return true;
      }
      if (isSoulOriginRunning(statusData)) {
        var nextContext = {
          reportId: clean(statusData.reportId || saved.reportId),
          jobId: clean(statusData.jobId || statusData.reportId || saved.reportId),
          sessionId: clean(statusData.sessionId || saved.sessionId),
          requestId: clean(statusData.requestId || saved.requestId),
        };
        persistCurrentJob(nextContext);
        var completed = await pollSoulOriginStatus(nextContext, token);
        clearCurrentJob();
        persistResult(completed);
        renderResult(completed);
        return true;
      }
    } catch (error) {
      var msg = mapSoulOriginUserMessage(error);
      var target = $('soErrorMsg');
      if (target) target.textContent = msg;
      showScreen('error');
      return true;
    } finally {
      stopLoadingTicker();
    }
    clearCurrentJob();
    showScreen('start');
    return false;
  }

  function stopSoulOriginStatusPreview() {
    if (_statusPreviewStop) {
      try { _statusPreviewStop(); } catch (_) {}
      _statusPreviewStop = null;
    }
  }

  function startSoulOriginStatusPreview(context, token) {
    stopSoulOriginStatusPreview();
    var stopped = false;
    var timer = null;
    var delay = SOUL_ORIGIN_STATUS_INITIAL_DELAY_MS;
    function schedule() {
      if (stopped) return;
      timer = setTimeout(run, delay);
      delay = Math.min(SOUL_ORIGIN_STATUS_MAX_DELAY_MS, delay + 1000);
    }
    async function run() {
      if (stopped) return;
      try {
        var data = await callStatusApi(context, token);
        applySoulOriginGenerationStatus(data);
        if (isSoulOriginReportReady(data) || isSoulOriginFailed(data)) return;
      } catch (_) {}
      schedule();
    }
    schedule();
    _statusPreviewStop = function () {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    return _statusPreviewStop;
  }

  function shouldRecoverWithStatus(error) {
    var code = clean(error && error.code).toUpperCase();
    var msg = clean(error && error.message).toLowerCase();
    return code === 'REQUEST_FAILED'
      || code.indexOf('TIMEOUT') >= 0
      || msg.indexOf('abort') >= 0
      || msg.indexOf('timeout') >= 0
      || msg.indexOf('network') >= 0
      || msg.indexOf('failed to fetch') >= 0;
  }

  function renderResultActions(payload) {
    var openUrl = resolveReportUrl(payload, 'html');
    var downloadUrl = resolveReportUrl(payload, 'pdf');
    var openBtn = $('soOpenReportBtn');
    var downloadBtn = $('soDownloadReportBtn');

    if (openBtn) {
      openBtn.style.display = openUrl ? '' : 'none';
      openBtn.onclick = openUrl ? function () { window.open(openUrl, '_blank', 'noopener'); } : null;
    }

    if (downloadBtn) {
      downloadBtn.style.display = downloadUrl ? '' : 'none';
      downloadBtn.onclick = downloadUrl ? function () { window.open(downloadUrl, '_blank', 'noopener'); } : null;
    }
  }

  function persistResult(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        reportId: clean(data && data.reportId),
        payload: data || null,
      }));
    } catch (_) {}
  }

  function persistCurrentJob(data) {
    try {
      var payload = data && typeof data === 'object' ? data : {};
      var reportId = clean(payload.reportId || payload.jobId);
      var sessionId = clean(payload.sessionId || payload.reportSessionId);
      if (!reportId || !sessionId) return;
      localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        reportId: reportId,
        jobId: reportId,
        sessionId: sessionId,
        reportSessionId: sessionId,
        requestId: clean(payload.requestId || ''),
      }));
    } catch (_) {}
  }

  function clearCurrentJob() {
    try { localStorage.removeItem(JOB_STORAGE_KEY); } catch (_) {}
  }

  function readCurrentJob() {
    try {
      var parsed = JSON.parse(localStorage.getItem(JOB_STORAGE_KEY) || 'null');
      if (!parsed || !clean(parsed.reportId || parsed.jobId) || !clean(parsed.sessionId || parsed.reportSessionId)) return null;
      return {
        reportId: clean(parsed.reportId || parsed.jobId),
        jobId: clean(parsed.jobId || parsed.reportId),
        sessionId: clean(parsed.sessionId || parsed.reportSessionId),
        reportSessionId: clean(parsed.reportSessionId || parsed.sessionId),
        requestId: clean(parsed.requestId || ''),
      };
    } catch (_) {
      return null;
    }
  }

  function readPersisted() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && parsed.payload ? parsed.payload : null;
    } catch (_) {
      return null;
    }
  }

  function normalizePercent(value) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, Math.round(parsed)));
  }

  function qualityLabelFromScore(score) {
    var copy = getSoulOriginBookCopy();
    var value = normalizePercent(score);
    if (value >= 90) return copy.qualityVeryClear;
    if (value >= 82) return copy.qualityStable;
    if (value > 0) return copy.qualityCore;
    return copy.qualityPassed;
  }

  function buildQualitySummary(quality) {
    var copy = getSoulOriginBookCopy();
    var status = clean(quality && quality.status).toLowerCase();
    if (status && status !== 'passed') return copy.qualityReviewing;
    return copy.qualitySummaryPrefix + ' · ' + qualityLabelFromScore(quality && quality.score) + ' · ' + copy.qualitySummarySuffix;
  }

  function extractPreviewParagraph(value, maxLength) {
    var limit = Math.max(120, Number(maxLength || 280));
    var text = clean(value).replace(/\s+/g, ' ').trim();
    if (!text || text.length <= limit) return text;
    return text.slice(0, limit).replace(/\s+\S*$/, '') + '…';
  }

  function pickResultPracticeText(chapters) {
    var list = Array.isArray(chapters) ? chapters : [];
    for (var i = 0; i < list.length; i += 1) {
      var sections = Array.isArray(list[i] && list[i].sections) ? list[i].sections : [];
      for (var j = 0; j < sections.length; j += 1) {
        var body = clean(sections[j] && sections[j].body);
        if (!body) continue;
        var sentences = body.split(/[.!?。]|다\./).map(function (item) { return clean(item); }).filter(Boolean);
        for (var k = 0; k < sentences.length; k += 1) {
          if (sentences[k].indexOf('실천') >= 0 || sentences[k].indexOf('처방') >= 0 || sentences[k].indexOf('순서') >= 0) {
            return extractPreviewParagraph(sentences[k] + '다.', 180);
          }
        }
      }
    }
    return getSoulOriginBookCopy().practiceFallback;
  }

  function renderSymbolicProfile(payload) {
    var profile = payload && payload.symbolicProfile && typeof payload.symbolicProfile === 'object' ? payload.symbolicProfile : {};
    var cardWrap = $('soSymbolCards');
    var metricWrap = $('soMetricGraph');
    var quality = payload && payload.qualityReport && typeof payload.qualityReport === 'object' ? payload.qualityReport : {};
    if (cardWrap) {
      cardWrap.innerHTML = '';
      var cards = Array.isArray(profile.symbolSentences) ? profile.symbolSentences : [];
      for (var i = 0; i < cards.length; i += 1) {
        var card = cards[i] || {};
        var el = document.createElement('div');
        el.className = 'so-symbol-card';
        var title = document.createElement('b');
        title.textContent = clean(card.title || getSoulOriginBookCopy().symbolicSentence);
        var body = document.createElement('p');
        body.textContent = clean(card.body || '');
        el.appendChild(title);
        el.appendChild(body);
        cardWrap.appendChild(el);
      }
      cardWrap.style.display = cards.length ? '' : 'none';
    }

    if (metricWrap) {
      metricWrap.innerHTML = '';
      var items = Array.isArray(profile.metrics) ? profile.metrics : [];
      var heading = document.createElement('div');
      heading.className = 'so-metric-summary';
      heading.textContent = clean(profile.mainSymbol || getSoulOriginBookCopy().mainSymbolFallback) + ' · ' + buildQualitySummary(quality);
      metricWrap.appendChild(heading);
      for (var j = 0; j < items.length; j += 1) {
        var item = items[j] || {};
        var value = normalizePercent(item.value);
        var row = document.createElement('div');
        row.className = 'so-metric-row';
        var label = document.createElement('span');
        label.textContent = clean(item.label || '');
        var track = document.createElement('i');
        var bar = document.createElement('em');
        bar.style.width = value + '%';
        track.appendChild(bar);
        var score = document.createElement('strong');
        score.textContent = String(value);
        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(score);
        metricWrap.appendChild(row);
      }
      metricWrap.style.display = items.length ? '' : 'none';
    }
  }

  function renderResultSummaryCards(payload) {
    var listEl = $('soResultContent');
    if (!listEl) return;
    var chapters = Array.isArray(payload && payload.chapters) ? payload.chapters : [];
    var sectionCount = chapters.reduce(function (sum, chapter) {
      return sum + (Array.isArray(chapter && chapter.sections) ? chapter.sections.length : 0);
    }, 0);
    var quality = payload && payload.qualityReport && typeof payload.qualityReport === 'object' ? payload.qualityReport : {};
    var profile = payload && payload.symbolicProfile && typeof payload.symbolicProfile === 'object' ? payload.symbolicProfile : {};
    var copy = getSoulOriginBookCopy();
    var article = document.createElement('article');
    article.className = 'lb-result-article';
    var title = document.createElement('h3');
    title.className = 'lb-result-article__title';
    title.textContent = copy.resultSummaryTitle;
    var subtitle = document.createElement('p');
    subtitle.className = 'lb-result-article__subtitle';
    var locale = getSoulOriginBookLocale();
    var chapterText = locale === 'en' ? chapters.length + ' ' + copy.chapterUnit : chapters.length + copy.chapterUnit;
    var sectionText = locale === 'en' ? sectionCount + ' ' + copy.sectionCount : sectionCount + copy.sectionCount;
    subtitle.textContent = chapterText + ' · ' + sectionText + ' · ' + qualityLabelFromScore(quality.score);
    article.appendChild(title);
    article.appendChild(subtitle);

    [
      { title: copy.coreJudgment, body: extractPreviewParagraph(payload && payload.summary, 220) || copy.coreJudgmentFallback },
      { title: copy.symbolicAxis, body: clean(profile.mainSymbol || copy.mainSymbolFallback) + ' · ' + clean(profile.axis || copy.symbolicAxisFallback) },
      { title: copy.practicePrescription, body: pickResultPracticeText(chapters) },
    ].forEach(function (item) {
      var sectionEl = document.createElement('section');
      sectionEl.className = 'lb-result-article__section';
      var h4 = document.createElement('h4');
      h4.className = 'lb-result-article__section-title';
      h4.textContent = item.title;
      var body = document.createElement('p');
      body.className = 'lb-result-article__section-body';
      body.textContent = item.body;
      sectionEl.appendChild(h4);
      sectionEl.appendChild(body);
      article.appendChild(sectionEl);
    });
    listEl.appendChild(article);
  }

  function renderChapterPreview(previewEl, chapter) {
    if (!previewEl) return;
    previewEl.innerHTML = '';
    if (!chapter) return;
    var article = document.createElement('article');
    article.className = 'lb-result-article so-chapter-preview';
    var h3 = document.createElement('h3');
    h3.className = 'lb-result-article__title';
    h3.textContent = clean(chapter.title || getSoulOriginBookCopy().selectedChapter);
    var subtitle = document.createElement('p');
    subtitle.className = 'lb-result-article__subtitle';
    subtitle.textContent = clean(chapter.subtitle || '');
    article.appendChild(h3);
    article.appendChild(subtitle);
    var sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    for (var i = 0; i < sections.length; i += 1) {
      var sec = sections[i] || {};
      var sectionEl = document.createElement('section');
      sectionEl.className = 'lb-result-article__section';
      var h4 = document.createElement('h4');
      h4.className = 'lb-result-article__section-title';
      h4.textContent = clean(sec.title || (getSoulOriginBookCopy().itemPrefix + ' ' + (i + 1)));
      var body = document.createElement('p');
      body.className = 'lb-result-article__section-body';
      body.textContent = extractPreviewParagraph(sec.body || '', 320);
      sectionEl.appendChild(h4);
      sectionEl.appendChild(body);
      article.appendChild(sectionEl);
    }
    if (sections.length) {
      var note = document.createElement('p');
      note.className = 'lb-result-article__subtitle';
      note.textContent = getSoulOriginBookCopy().pdfDetailNotice;
      article.appendChild(note);
    }
    previewEl.appendChild(article);
  }

  function renderChapterNavigator(chapters) {
    var navEl = $('soChapterNav');
    var previewEl = $('soChapterPreview');
    if (!navEl || !previewEl) return false;
    navEl.innerHTML = '';
    var list = Array.isArray(chapters) ? chapters : [];
    if (!list.length) {
      previewEl.innerHTML = '';
      return true;
    }
    list.forEach(function (chapter, index) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = index === 0 ? 'so-chapter-nav__btn is-active' : 'so-chapter-nav__btn';
      btn.textContent = String(index + 1).padStart(2, '0');
      btn.title = clean(chapter && chapter.title || '');
      btn.onclick = function () {
        var active = navEl.querySelector('.is-active');
        if (active) active.classList.remove('is-active');
        btn.classList.add('is-active');
        renderChapterPreview(previewEl, chapter);
      };
      navEl.appendChild(btn);
    });
    renderChapterPreview(previewEl, list[0]);
    return true;
  }

  function isSoulOriginAIConsultationPayload(payload) {
    return clean(payload && payload.serviceType) === AI_CONSULTATION_SERVICE_TYPE
      || Boolean(payload && payload.result && (payload.result.summary || payload.result.rawText));
  }

  function appendSoulOriginAIList(parent, items) {
    var list = Array.isArray(items) ? items.map(function (item) { return clean(item); }).filter(Boolean) : [];
    if (!list.length) return;
    var ul = document.createElement('ul');
    list.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    parent.appendChild(ul);
  }

  function appendSoulOriginAICard(parent, title, body, items) {
    if (!parent) return;
    var bodyText = clean(body);
    var list = Array.isArray(items) ? items.map(function (item) { return clean(item); }).filter(Boolean) : [];
    if (!bodyText && !list.length) return;
    var card = document.createElement('article');
    card.className = 'so-ai-result-card';
    var h4 = document.createElement('h4');
    h4.textContent = title;
    card.appendChild(h4);
    if (bodyText) {
      var p = document.createElement('p');
      p.textContent = bodyText;
      card.appendChild(p);
    }
    appendSoulOriginAIList(card, list);
    parent.appendChild(card);
  }

  function renderAIConsultationResult(payload) {
    _result = payload;
    var result = payload && payload.result && typeof payload.result === 'object' ? payload.result : (payload || {});
    var titleEl = $('soResultTitle');
    var summaryEl = $('soResultSummary');
    var listEl = $('soResultContent');
    var limitations = Array.isArray(payload && payload.dataLimitations) ? payload.dataLimitations : (Array.isArray(result.dataLimitations) ? result.dataLimitations : []);

    if (titleEl) titleEl.textContent = '운명의 업 상담이 열렸습니다.';
    if (summaryEl) summaryEl.textContent = '아래 결과는 사주, 베다점, 서양 점성술의 계산 데이터를 바탕으로 생성된 AI 통합 상담입니다.';
    setDisplay('soSymbolCards', 'none');
    setDisplay('soMetricGraph', 'none');
    setDisplay('soChapterNav', 'none');
    setDisplay('soChapterPreview', 'none');
    var openBtn = $('soOpenReportBtn');
    var downloadBtn = $('soDownloadReportBtn');
    if (openBtn) openBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = 'none';
    try {
      document.querySelectorAll('[onclick*="restoreSoulOriginReport"]').forEach(function (btn) {
        btn.style.display = 'none';
      });
    } catch (_) {}

    if (listEl) {
      listEl.innerHTML = '';
      if (limitations.length) {
        var note = document.createElement('p');
        note.className = 'so-ai-limitations';
        note.textContent = limitations.map(function (item) { return clean(item); }).filter(Boolean).join(' ');
        listEl.appendChild(note);
      }
      appendSoulOriginAICard(listEl, '상담 요약', result.summary);
      appendSoulOriginAICard(listEl, clean(result.coreKnot && result.coreKnot.title) || '운명의 핵심 매듭', result.coreKnot && result.coreKnot.interpretation);
      appendSoulOriginAICard(listEl, '사주가 말하는 업', result.sajuKarma && result.sajuKarma.interpretation, result.sajuKarma && result.sajuKarma.keyPatterns);
      appendSoulOriginAICard(listEl, '베다점이 말하는 카르마', result.vedicKarma && result.vedicKarma.interpretation, result.vedicKarma && result.vedicKarma.keyPatterns);
      appendSoulOriginAICard(listEl, '점성술이 말하는 그림자', result.astrologyShadow && result.astrologyShadow.interpretation, result.astrologyShadow && result.astrologyShadow.keyPatterns);
      appendSoulOriginAICard(listEl, '세 체계의 공통 메시지', '', result.commonMessages);
      var timing = result.liberationTiming || {};
      appendSoulOriginAICard(listEl, '해방의 시기와 전환점', clean(timing.note), []
        .concat(Array.isArray(timing.opportunities) ? timing.opportunities : [])
        .concat(Array.isArray(timing.cautions) ? timing.cautions : []));
      appendSoulOriginAICard(listEl, '현실적인 행동 전략', '', result.actionGuide);
      var releaseAndHold = result.releaseAndHold || {};
      appendSoulOriginAICard(listEl, '내려놓아야 할 것과 붙잡아야 할 것', '', []
        .concat((Array.isArray(releaseAndHold.release) ? releaseAndHold.release : []).map(function (item) { return '내려놓기: ' + item; }))
        .concat((Array.isArray(releaseAndHold.hold) ? releaseAndHold.hold : []).map(function (item) { return '붙잡기: ' + item; })));
      appendSoulOriginAICard(listEl, '마지막 조언', result.closingMessage);
      appendSoulOriginAICard(listEl, '후속 질문 추천', '', result.followUpQuestions);
      if (!listEl.children.length && clean(result.rawText)) {
        appendSoulOriginAICard(listEl, '운명의 업 상담', result.rawText);
      }
    }
    showScreen('result');
  }

  function renderResult(payload) {
    if (isSoulOriginAIConsultationPayload(payload)) {
      renderAIConsultationResult(payload);
      return;
    }
    _result = payload;
    var titleEl = $('soResultTitle');
    var summaryEl = $('soResultSummary');
    var listEl = $('soResultContent');

    if (titleEl) titleEl.textContent = clean(payload && payload.title) || '운명의 업 프리미엄 리포트';
    if (summaryEl) summaryEl.textContent = clean(payload && payload.summary) || '운명의 업 리포트가 열렸습니다.';
    renderSymbolicProfile(payload || {});

    if (listEl) {
      listEl.innerHTML = '';
      var chapters = Array.isArray(payload && payload.chapters) ? payload.chapters : [];
      renderResultSummaryCards(payload || {});
      if (renderChapterNavigator(chapters)) {
        renderResultActions(payload || {});
        showScreen('result');
        return;
      }
      for (var i = 0; i < chapters.length; i += 1) {
        var chapter = chapters[i] || {};
        var article = document.createElement('article');
        article.className = 'lb-result-article';

        var h3 = document.createElement('h3');
        h3.className = 'lb-result-article__title';
        h3.textContent = clean(chapter.title || ('Chapter ' + (i + 1)));
        article.appendChild(h3);

        var subtitle = document.createElement('p');
        subtitle.className = 'lb-result-article__subtitle';
        subtitle.textContent = clean(chapter.subtitle || '');
        article.appendChild(subtitle);

        var sections = Array.isArray(chapter.sections) ? chapter.sections : [];
        for (var j = 0; j < sections.length; j += 1) {
          var sec = sections[j] || {};
          var sectionEl = document.createElement('section');
          sectionEl.className = 'lb-result-article__section';

          var h4 = document.createElement('h4');
          h4.className = 'lb-result-article__section-title';
          h4.textContent = clean(sec.title || ('항목 ' + (j + 1)));

          var body = document.createElement('p');
          body.className = 'lb-result-article__section-body';
          body.textContent = clean(sec.body || '');

          sectionEl.appendChild(h4);
          sectionEl.appendChild(body);
          article.appendChild(sectionEl);
        }

        listEl.appendChild(article);
      }
    }

    renderResultActions(payload || {});
    showScreen('result');
  }

  function stopLoadingTicker() {
    if (_loadingTimer) {
      clearInterval(_loadingTimer);
      _loadingTimer = null;
    }
    _loadingMessageHoldUntil = 0;
  }

  function startLoadingTicker() {
    stopLoadingTicker();
    var idx = 0;
    var el = $('soLoadingMessage');
    if (!el) return;
    var loadingTexts = getSoulOriginBookCopy().loadingTexts;
    el.textContent = loadingTexts[0];
    _loadingTimer = setInterval(function () {
      if (Date.now() < _loadingMessageHoldUntil) return;
      idx = (idx + 1) % loadingTexts.length;
      el.textContent = loadingTexts[idx];
    }, SOUL_ORIGIN_LOADING_TICK_MS);
  }

  function readPremiumToken() {
    var token = '';
    try { token = clean(window.__cdPremiumAccessToken || ''); } catch (_) { token = ''; }
    if (!token) { try { token = clean(sessionStorage.getItem('cd_premium_access_token') || ''); } catch (_) { token = ''; } }
    if (!token) { try { token = clean(localStorage.getItem('cd_premium_access_token') || ''); } catch (_) { token = ''; } }
    return token;
  }

  function readAuthToken() {
    var token = '';
    try { token = clean(localStorage.getItem('fortune_auth_token') || ''); } catch (_) { token = ''; }
    return token;
  }

  function storePremiumToken(token) {
    var value = clean(token);
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function fetchJsonWithTimeout(url, init, timeoutMs) {
    var controller = (typeof AbortController === 'function') ? new AbortController() : null;
    var timerId = null;
    if (controller) {
      timerId = setTimeout(function () {
        try { controller.abort(); } catch (_) {}
      }, Math.max(1000, Number(timeoutMs || SOUL_ORIGIN_FETCH_TIMEOUT_MS)));
    }

    return fetch(url, Object.assign({}, init || {}, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    }))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: Number(res.status || 0), data: data };
        });
      })
      .finally(function () {
        if (timerId) clearTimeout(timerId);
      });
  }

  function isRetryableStatus(status) {
    var code = Number(status || 0);
    return code >= 500 || code === 408 || code === 425 || code === 429;
  }

  function isAuthOrPaymentFailure(status, payload) {
    var code = clean(payload && (payload.code || payload.error || payload.message)).toUpperCase();
    if (status === 401 || status === 402 || status === 403) return true;
    return code.indexOf('AUTH') >= 0
      || code.indexOf('UNAUTHORIZED') >= 0
      || code.indexOf('FORBIDDEN') >= 0
      || code.indexOf('PAYMENT') >= 0
      || code.indexOf('PREMIUM') >= 0;
  }

  function mapSoulOriginUserMessage(error) {
    var status = Number(error && error.status || 0);
    var code = clean(error && error.code).toUpperCase();
    var stage = clean(error && error.stage).toUpperCase();
    var raw = clean(error && error.message);

    if (status === 401 || code.indexOf('UNAUTHORIZED') >= 0 || code.indexOf('AUTH') >= 0) {
      return '로그인 후 운명의 업 AI 상담을 받을 수 있습니다.';
    }
    if (code.indexOf('PAYMENT_CONFIRMED_BUT_ACCESS_MISSING') >= 0) {
      return '결제는 확인되었습니다. 중복 차감 없이 생성 권한을 다시 연결 중이니 잠시 후 다시 시도해 주세요.';
    }
    if (code.indexOf('SOUL_ORIGIN_PRICING_LOOKUP_FAILED') >= 0) {
      return '결제 금액을 서버에서 확인하지 못했습니다. 추가 결제 없이 잠시 후 다시 시도해 주세요.';
    }
    if (status >= 500
      || code.indexOf('SERVICE_UNAVAILABLE') >= 0
      || code.indexOf('DB_UNAVAILABLE') >= 0
      || raw.toLowerCase().indexOf('database is temporarily unavailable') >= 0
      || raw.toLowerCase().indexOf('mongodb') >= 0
    ) {
      return '결제 서버 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (status === 402 || code.indexOf('PAYMENT_REQUIRED') >= 0 || code.indexOf('INSUFFICIENT') >= 0 || code.indexOf('COIN') >= 0 || code.indexOf('POINT') >= 0) {
      return '운명의 업 AI 상담을 위해 결제 또는 이용권 확인이 필요합니다.';
    }
    if (code.indexOf('BIRTH_') >= 0 || raw.indexOf('태어난 시간') >= 0 || raw.indexOf('생년월일') >= 0) {
      return '생년월일시 정보를 확인한 뒤 다시 시도해 주세요.';
    }
    if (code.indexOf('REPORT_SAVE_URL_MISSING') >= 0 || code.indexOf('SOUL_ORIGIN_REPORT_NOT_READY') >= 0) {
      return '상담 결과가 아직 열리지 않았습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code.indexOf('SOUL_ORIGIN_PDF_COMPLETION_VALIDATION_FAILED') >= 0 || code.indexOf('SOUL_ORIGIN_QUALITY_VALIDATION_FAILED') >= 0) {
      return '상담서 품질 검수에서 통과하지 못해 PDF를 열지 않았습니다. 결제 내역은 보존되니 잠시 후 다시 불러와 주세요.';
    }
    if (code.indexOf('SOUL_ORIGIN_STATUS_TIMEOUT') >= 0) {
      return '운명의 업 상담 생성이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code.indexOf('LLM_NOT_CONFIGURED') >= 0
      || code.indexOf('LLM_REQUEST_FAILED') >= 0
      || code.indexOf('LLM_TIMEOUT') >= 0
      || code.indexOf('LLM_PROVIDER') >= 0
    ) {
      return '운명의 업 AI 상담 생성이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code.indexOf('INVALID_LLM_RESPONSE') >= 0
      || code.indexOf('QUALITY_VALIDATION_FAILED') >= 0
      || code.indexOf('SOUL_ORIGIN_GENERATION_FAILED') >= 0
      || code.indexOf('SOUL_ORIGIN_MANUSCRIPT_INVALID') >= 0
    ) {
      return '운명의 업 AI 상담 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.';
    }
    if (code.indexOf('SOUL_ORIGIN_ARCHIVE_URL_MISSING') >= 0) {
      return '상담 원고가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.';
    }
    return raw || '운명의 업 AI 상담을 여는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  function normalizeAccessGrant(raw, reportId, requestId, sessionId) {
    var data = raw && typeof raw === 'object' ? raw : {};
    var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : (data.access && typeof data.access === 'object' ? data.access : {});
    var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};

    var normalizedReportId = clean(accessGrant.reportId || data.reportId || reportId);
    var normalizedRequestId = clean(accessGrant.requestId || data.requestId || consume.requestId || requestId);
    var normalizedSessionId = clean(accessGrant.sessionId || accessGrant.reportSessionId || data.sessionId || data.reportSessionId || consume.sessionId || consume.reportSessionId || sessionId);
    var purchaseId = clean(accessGrant.purchaseId || data.purchaseId || data.transactionId || consume.purchaseId || consume.transactionId);

    if (!normalizedReportId || !normalizedSessionId || !normalizedRequestId || !purchaseId) return null;

    return {
      ok: true,
      featureKey: FEATURE_KEY,
      reportId: normalizedReportId,
      sessionId: normalizedSessionId,
      reportSessionId: normalizedSessionId,
      requestId: normalizedRequestId,
      purchaseId: purchaseId,
      transactionId: clean(accessGrant.transactionId || data.transactionId || consume.transactionId || purchaseId) || undefined,
      paidAt: clean(accessGrant.paidAt || data.paidAt || new Date().toISOString()),
    };
  }

  function buildPaymentContext(payment, accessGrant, token, reportId, requestId, sessionId) {
    var source = payment && typeof payment === 'object' ? payment : {};
    var grant = accessGrant && typeof accessGrant === 'object' ? accessGrant : (source.accessGrant && typeof source.accessGrant === 'object' ? source.accessGrant : {});
    var nestedPayment = source.payment && typeof source.payment === 'object' ? source.payment : {};
    var nestedContext = source._paymentContext && typeof source._paymentContext === 'object' ? source._paymentContext : {};
    var nestedPaymentContext = source.paymentContext && typeof source.paymentContext === 'object' ? source.paymentContext : {};
    var consume = source.consume && typeof source.consume === 'object' ? source.consume : {};
    var access = source.access && typeof source.access === 'object' ? source.access : {};
    if (!Object.keys(grant).length && Object.keys(access).length) grant = access;
    var normalizedSessionId = clean(grant.sessionId || grant.reportSessionId || source.sessionId || source.reportSessionId || nestedPayment.sessionId || nestedContext.sessionId || nestedPaymentContext.sessionId || consume.sessionId || consume.reportSessionId || sessionId);
    var context = {
      featureKey: FEATURE_KEY,
      reportType: REPORT_TYPE,
      premiumAccessToken: clean(token || source.premiumAccessToken || source.accessToken || source.token || nestedPayment.premiumAccessToken || nestedContext.premiumAccessToken || nestedPaymentContext.premiumAccessToken || consume.premiumAccessToken || readPremiumToken()) || undefined,
      requestId: clean(grant.requestId || source.requestId || nestedPayment.requestId || nestedContext.requestId || nestedPaymentContext.requestId || consume.requestId || requestId) || undefined,
      purchaseId: clean(grant.purchaseId || source.purchaseId || source.paymentId || source.transactionId || nestedPayment.purchaseId || nestedContext.purchaseId || nestedPaymentContext.purchaseId || consume.purchaseId || consume.transactionId) || undefined,
      transactionId: clean(source.transactionId || grant.transactionId || nestedPayment.transactionId || nestedContext.transactionId || nestedPaymentContext.transactionId || consume.transactionId) || undefined,
      sessionId: normalizedSessionId || undefined,
      reportSessionId: clean(grant.reportSessionId || grant.sessionId || source.reportSessionId || nestedPayment.reportSessionId || nestedContext.reportSessionId || nestedPaymentContext.reportSessionId || consume.reportSessionId || consume.sessionId || normalizedSessionId || sessionId) || undefined,
      reportId: clean(grant.reportId || source.reportId || nestedPayment.reportId || nestedContext.reportId || nestedPaymentContext.reportId || consume.reportId || reportId) || undefined,
    };
    context.sourceTransactionId = clean(source.sourceTransactionId || context.transactionId || context.purchaseId || context.requestId) || undefined;
    if (Object.keys(grant).length) context.accessGrant = grant;
    context.consume = Object.assign({}, consume, {
      featureKey: FEATURE_KEY,
      reportType: REPORT_TYPE,
      transactionId: clean(consume.transactionId || context.transactionId || context.sourceTransactionId) || undefined,
      purchaseId: clean(consume.purchaseId || context.purchaseId) || undefined,
      requestId: clean(consume.requestId || context.requestId) || undefined,
      sessionId: clean(consume.sessionId || context.sessionId) || undefined,
      reportSessionId: clean(consume.reportSessionId || context.reportSessionId || context.sessionId) || undefined,
      reportId: clean(consume.reportId || context.reportId) || undefined,
      premiumAccessToken: context.premiumAccessToken || undefined,
      accessGrant: context.accessGrant || undefined
    });
    return context;
  }

  function runServerCoinGate(reportId, requestId, sessionId) {
    var endpoints = getApiBaseCandidates('/api/billing/coin-gate');
    var idx = 0;

    function next(resolve, reject, lastMessage) {
      if (idx >= endpoints.length) {
        reject(lastMessage instanceof Error ? lastMessage : new Error(lastMessage || '원화 결제 확인에 실패했습니다.'));
        return;
      }

      var token = readPremiumToken();
      var authToken = readAuthToken();
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['x-premium-access-token'] = token;
      if (authToken) headers.Authorization = 'Bearer ' + authToken;

      fetchJsonWithTimeout(endpoints[idx++], {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          categoryKey: 'premium-report',
          featureKey: FEATURE_KEY,
          reason: '운명의 업 AI 상담',
          reportType: REPORT_TYPE,
          mode: 'soul-origin',
          reportId: reportId,
          sessionId: sessionId,
          reportSessionId: sessionId,
          requestId: requestId,
          forceDeduct: true,
        }),
      }, SOUL_ORIGIN_FETCH_TIMEOUT_MS)
        .then(function (pack) {
          var payload = pack && pack.data ? pack.data : {};
          var data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
          var premiumToken = clean((data && (data.premiumAccessToken || data.accessToken || data.token)) || (payload && (payload.premiumAccessToken || payload.accessToken || payload.token)));
          if (premiumToken) storePremiumToken(premiumToken);

          var grant = normalizeAccessGrant(data, reportId, requestId, sessionId);
          if (pack.ok && payload.ok !== false && grant) {
            resolve({
              ok: true,
              premiumAccessToken: premiumToken || readPremiumToken(),
              accessGrant: grant,
              requestId: grant.requestId,
              sessionId: grant.sessionId,
            });
            return;
          }

          if (isAuthOrPaymentFailure(pack.status, payload)) {
            var accessErr = buildApiError({ status: pack.status, data: payload }, clean(payload.message || payload.error || payload.code) || '결제는 완료되었지만 생성 권한 연결이 지연되었습니다. 다시 시도해 주세요.', {
              stage: 'billing',
              reportId: reportId,
              sessionId: sessionId
            });
            accessErr.code = clean(accessErr.code) || 'PAYMENT_REQUIRED';
            reject(accessErr);
            return;
          }

          if (!isRetryableStatus(pack.status)) {
            reject(buildApiError({ status: pack.status, data: payload }, clean(payload.message || payload.error || payload.code) || ('HTTP ' + pack.status), {
              stage: 'billing',
              reportId: reportId,
              sessionId: sessionId
            }));
            return;
          }

          next(resolve, reject, buildApiError({ status: pack.status, data: payload }, clean(payload.message || payload.error || payload.code), {
            stage: 'billing',
            reportId: reportId,
            sessionId: sessionId
          }));
        })
        .catch(function (error) {
          next(resolve, reject, error instanceof Error ? error : new Error(clean(error && error.message)));
        });
    }

    return new Promise(function (resolve, reject) { next(resolve, reject, ''); });
  }

  function extractSoulOriginServerCoinCost(payload) {
    var source = payload && payload.data && typeof payload.data === 'object' ? payload.data : (payload || {});
    var pricing = source && source.pricing && typeof source.pricing === 'object' ? source.pricing : {};
    var value = Number(pricing.cost || pricing.coinPrice || pricing.priceCoin || pricing.finalCoinPrice);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function resolveSoulOriginCoinCost() {
    var endpoints = getApiBaseCandidates('/api/billing/features?featureKey=' + encodeURIComponent(FEATURE_KEY));
    var idx = 0;
    function next() {
      if (idx >= endpoints.length) return Promise.resolve(0);
      var headers = {};
      var authToken = readAuthToken();
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      return fetchJsonWithTimeout(endpoints[idx++], { method: 'GET', headers: headers }, 12000)
        .then(function (pack) {
          if (pack && pack.ok && pack.data) {
            var serverCost = extractSoulOriginServerCoinCost(pack.data);
            if (serverCost > 0) return serverCost;
          }
          return next();
        })
        .catch(function () { return next(); });
    }
    return next().then(function (cost) {
      var effectiveCost = Number(cost || COIN_COST);
      if (!cost) logStage('ProductLookupFallback', { fallbackCoinCost: effectiveCost });
      updateSoulOriginCoinCost(effectiveCost);
      return _resolvedCoinCost;
    });
  }

  function ensurePayment(coinCost) {
    var resolvedCoinCost = Math.max(0, Math.floor(Number(coinCost || COIN_COST)));
    var requestId = readSessionValue(REQUEST_ID_KEY) || makeRequestId();
    var sessionId = readSessionValue(SESSION_ID_KEY) || makeSessionId();
    var paymentReportId = 'soul-origin:' + Date.now().toString(36);
    writeSessionValue(REQUEST_ID_KEY, requestId);
    writeSessionValue(SESSION_ID_KEY, sessionId);

    if (typeof window._cdCoinGatePerUse !== 'function') {
      if (typeof window._cdOpenPaidServiceGate === 'function') {
        return new Promise(function(resolve, reject) {
          var reportId = paymentReportId;
          var settled = false;
          function finish(payload) {
            if (settled) return;
            settled = true;
            var raw = payload && typeof payload === 'object' ? payload : {};
            var data = raw && raw.data && typeof raw.data === 'object' ? raw.data : raw;
            var token = clean((data && (data.premiumAccessToken || data.accessToken || data.token)) || (raw && (raw.premiumAccessToken || raw.accessToken || raw.token)));
            if (token) storePremiumToken(token);
            var grant = normalizeAccessGrant(data, reportId, requestId, sessionId);
            var paymentContext = buildPaymentContext(data, grant, token, reportId, requestId, sessionId);
            resolve({
              ok: true,
              premiumAccessToken: token || readPremiumToken(),
              accessGrant: grant || undefined,
              consume: paymentContext.consume || undefined,
              sourceTransactionId: paymentContext.sourceTransactionId || paymentContext.transactionId || paymentContext.purchaseId || paymentContext.requestId || undefined,
              requestId: paymentContext.requestId || requestId,
              sessionId: paymentContext.sessionId || sessionId,
              reportSessionId: paymentContext.reportSessionId || paymentContext.sessionId || sessionId,
              purchaseId: paymentContext.purchaseId || undefined,
              transactionId: paymentContext.transactionId || undefined,
              reportId: paymentContext.reportId || reportId,
              payment: paymentContext,
              _paymentContext: paymentContext,
              paymentContext: paymentContext,
            });
          }
          function cancel(error) {
            if (settled) return;
            settled = true;
            reject(error instanceof Error ? error : new Error(clean(error && error.message) || getSoulOriginBookCopy().paymentCanceled));
          }
          function fail(error) {
            if (settled) return;
            settled = true;
            runServerCoinGate(reportId, requestId, sessionId)
              .then(resolve)
              .catch(function (fallbackError) {
                reject(fallbackError || error || new Error(getSoulOriginBookCopy().krwPaymentFailed));
              });
          }
          try {
            var gate = window._cdOpenPaidServiceGate({
              categoryKey: 'premium-pdf',
              featureKey: FEATURE_KEY,
              subFeatureKey: FEATURE_KEY,
              title: getSoulOriginBookCopy().paymentTitle,
              reason: getSoulOriginBookCopy().paymentTitle,
              coinPrice: resolvedCoinCost,
              cost: resolvedCoinCost,
              serviceKey: 'soul-origin',
              actionType: 'ai_consultation',
              action: 'generateSoulOriginAIConsultation',
              reportType: REPORT_TYPE,
              reportId: reportId,
              sessionId: sessionId,
              reportSessionId: sessionId,
              requestId: requestId,
              onGranted: function(_transactionId, payload) { finish(payload); },
              onPassApplied: function(access) { finish((access && (access.payload || access.rawPayload)) || access || {}); },
              onCancel: cancel
            });
            if (gate && typeof gate.then === 'function') gate.then(function(payload) {
              if (payload === null || payload === undefined) cancel();
              else finish(payload);
            }).catch(fail);
          } catch (error) {
            fail(error);
          }
        });
      }
      var gateError = new Error('결제 게이트를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      gateError.status = 503;
      gateError.code = 'SOUL_ORIGIN_PAYMENT_GATE_MISSING';
      gateError.stage = 'billing';
      logExactError(gateError, { stage: 'billing', requestId: requestId, sessionId: sessionId });
      return Promise.reject(gateError);
    }

    return new Promise(function (resolve, reject) {
      var settled = false;
      function done(payload) {
        if (settled) return;
        settled = true;
        if (payload && payload.ok === false) {
          var failError = buildApiError({ status: Number(payload.status || payload.httpStatus || 0), data: payload }, clean(payload.message) || '결제 접근 권한을 확인하지 못했습니다. 다시 시도해 주세요.', {
            stage: 'billing',
            requestId: requestId,
            sessionId: sessionId
          });
          failError.stage = clean(payload.stage || failError.stage || 'billing');
          logExactError(failError, { stage: 'billing', requestId: requestId, sessionId: sessionId });
          reject(failError);
          return;
        }
        var token = clean((payload && (payload.premiumAccessToken || payload.accessToken || payload.token)) || '');
        if (token) storePremiumToken(token);
        var reportId = clean((payload && (payload.reportId || (payload.accessGrant && payload.accessGrant.reportId))) || '') || paymentReportId;
        var grant = normalizeAccessGrant(payload, reportId, requestId, sessionId);
        var paymentContext = buildPaymentContext(payload, grant, token, reportId, requestId, sessionId);
        resolve(Object.assign({}, payload || { ok: true, premiumAccessToken: readPremiumToken() }, {
          requestId: paymentContext.requestId || clean((payload && payload.requestId) || requestId),
          sessionId: paymentContext.sessionId || clean((payload && (payload.sessionId || payload.reportSessionId)) || sessionId),
          reportSessionId: paymentContext.reportSessionId || paymentContext.sessionId || sessionId,
          purchaseId: paymentContext.purchaseId || undefined,
          reportId: paymentContext.reportId || reportId,
          premiumAccessToken: token || readPremiumToken(),
          accessGrant: grant || undefined,
          consume: paymentContext.consume || undefined,
          sourceTransactionId: paymentContext.sourceTransactionId || paymentContext.transactionId || paymentContext.purchaseId || paymentContext.requestId || undefined,
          payment: paymentContext,
          _paymentContext: paymentContext,
          paymentContext: paymentContext,
        }));
      }

      try {
        logStage('CoinGateStart');
        var immediate = window._cdCoinGatePerUse(
          resolvedCoinCost,
          '운명의 업 AI 상담',
          function (transactionId, data) {
            logStage('CoinGateSuccess', {
              sessionId: clean((data && (data.sessionId || data.reportSessionId)) || readSessionValue(SESSION_ID_KEY)),
              requestId: clean((data && data.requestId) || readSessionValue(REQUEST_ID_KEY)),
            });
            done(Object.assign({ ok: true, transactionId: transactionId }, data || {}));
          },
          function (error) {
            logStage('Failed', { stage: 'CoinGateFailed', errorCode: clean(error && error.code) || 'COIN_GATE_FAILED' });
            done({
              ok: false,
              message: clean(error && error.message) || '원화 결제 확인이 필요합니다.',
              code: clean(error && error.code) || 'COIN_GATE_FAILED',
              status: Number(error && error.status || 0) || undefined,
              stage: 'CoinGateFailed',
            });
          },
          {
            featureKey: FEATURE_KEY,
            subFeatureKey: FEATURE_KEY,
            reportType: REPORT_TYPE,
            serviceKey: 'soul-origin',
            actionType: 'ai_consultation',
            action: 'generateSoulOriginAIConsultation',
            reportId: paymentReportId,
            sessionId: sessionId,
            reportSessionId: sessionId,
            requestId: requestId,
          },
        );

        if (immediate && typeof immediate.then === 'function') {
          immediate.then(done).catch(function (error) {
            done({
              ok: false,
              message: clean(error && error.message),
              code: clean(error && error.code),
              status: Number(error && error.status || 0) || undefined,
              stage: 'CoinGateFailed',
            });
          });
        }
      } catch (error) {
        logStage('Failed', { stage: 'CoinGateException', errorCode: clean(error && error.code) || 'COIN_GATE_EXCEPTION' });
        done({
          ok: false,
          message: clean(error && error.message),
          code: clean(error && error.code) || 'COIN_GATE_EXCEPTION',
          status: Number(error && error.status || 0) || undefined,
          stage: 'CoinGateException',
        });
      }
    });
  }

  function callApi(path, payload, token) {
    var endpoints = getApiBaseCandidates(path);
    var idx = 0;
    var lastClientError = '';
    var lastStage = '';
    var lastError = null;

    return new Promise(function (resolve, reject) {
      function run() {
        if (idx >= endpoints.length) {
          var finalError = lastError || new Error(lastClientError || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          finalError.code = clean(finalError.code) || 'REQUEST_FAILED';
          if (lastStage) finalError.stage = lastStage;
          reject(finalError);
          return;
        }

        var headers = { 'Content-Type': 'application/json' };
        var premiumToken = clean(token || readPremiumToken());
        var authToken = readAuthToken();
        if (premiumToken) headers['x-premium-access-token'] = premiumToken;
        if (authToken) headers.Authorization = 'Bearer ' + authToken;

        fetchJsonWithTimeout(endpoints[idx], {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
        }, SOUL_ORIGIN_FETCH_TIMEOUT_MS)
          .then(function (pack) {
            if (pack.ok && pack.data && pack.data.ok) {
              resolve(pack.data);
              return;
            }

            if (isAuthOrPaymentFailure(pack.status, pack.data || {}) || (pack.status >= 400 && pack.status < 500 && !isRetryableStatus(pack.status))) {
              var message = clean(pack.data && (pack.data.message || pack.data.error || pack.data.code));
              var remoteStage = clean(pack.data && pack.data.debugSafe && pack.data.debugSafe.stage);
              lastClientError = message || '입력값 또는 결제 상태를 확인해 주세요.';
              var reqError = buildApiError(pack, lastClientError, {
                stage: remoteStage || 'prepare',
                reportId: payload && payload.reportId,
                sessionId: payload && payload.sessionId
              });
              reqError.code = clean(reqError.code || pack.data && (pack.data.code || pack.data.error || 'REQUEST_FAILED'));
              if (remoteStage) {
                reqError.stage = remoteStage;
                lastStage = remoteStage;
              }
              reject(reqError);
              return;
            }

            lastStage = clean(pack.data && pack.data.debugSafe && pack.data.debugSafe.stage);
            lastError = buildApiError(pack, clean(pack.data && (pack.data.message || pack.data.error || pack.data.code)) || ('HTTP ' + pack.status), {
              stage: lastStage || 'prepare',
              reportId: payload && payload.reportId,
              sessionId: payload && payload.sessionId
            });

            idx += 1;
            run();
          })
          .catch(function (error) {
            var reason = clean(error && error.message);
            if (reason && !lastClientError) lastClientError = reason;
            if (error && error.stage) lastStage = clean(error.stage);
            lastError = error instanceof Error ? error : new Error(reason || '요청 실패');
            idx += 1;
            run();
          });
      }
      run();
    });
  }

  function setSoulOriginStartDisabled(disabled) {
    try {
      document.querySelectorAll('[onclick*="generateSoulOriginReport"]').forEach(function (btn) {
        btn.disabled = !!disabled;
        btn.setAttribute('aria-busy', disabled ? 'true' : 'false');
      });
    } catch (_) {}
  }

  async function generateSoulOrigin() {
    if (_isGenerating) return;
    _isGenerating = true;
    setSoulOriginStartDisabled(true);
    var requestId = makeRequestId();
    var sessionId = makeSessionId();
    writeSessionValue(REQUEST_ID_KEY, requestId);
    writeSessionValue(SESSION_ID_KEY, sessionId);

    try {
      ensureSoulOriginAIConsultationUI();
      var profileRaw = readActiveProfile();
      var input = readSoulOriginAIFormInput(profileRaw || {});
      var question = readSoulOriginAIQuestion();
      var category = clean(_selectedKarmaCategory || 'general') || 'general';

      showScreen('loading');
      startLoadingTicker();
      setLoadingMessage('운명의 업 AI 상담 금액과 이용 권한을 확인하는 중입니다.');

      logStage('ProductLookupStart', { requestId: requestId, sessionId: sessionId });
      if (!FEATURE_KEY || !REPORT_TYPE) {
        logStage('ProductLookupFailed', {
          requestId: requestId,
          sessionId: sessionId,
          errorCode: 'MISSING_PRODUCT_MAPPING',
        });
        throw new Error('결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      }
      logStage('ProductLookupSuccess', { requestId: requestId, sessionId: sessionId });

      var resolvedCoinCost = await resolveSoulOriginCoinCost();
      setLoadingMessage('결제 권한을 확인하고 운명의 업 상담을 준비하고 있어요.');
      var payment = await ensurePayment(resolvedCoinCost);
      var token = clean((payment && (payment.premiumAccessToken || payment.accessToken || payment.token)) || readPremiumToken());
      var paymentRequestId = clean((payment && payment.requestId) || requestId);
      var paymentSessionId = clean((payment && (payment.sessionId || payment.reportSessionId)) || sessionId);
      var accessGrant = payment && payment.accessGrant && typeof payment.accessGrant === 'object' ? payment.accessGrant : null;
      writeSessionValue(REQUEST_ID_KEY, paymentRequestId || requestId);
      writeSessionValue(SESSION_ID_KEY, paymentSessionId || sessionId);

      var reportId = clean((accessGrant && accessGrant.reportId) || (payment && (payment.reportId || (payment.payment && payment.payment.reportId) || (payment._paymentContext && payment._paymentContext.reportId))) || '') || ('soul-origin-ai:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8));
      var paymentContext = buildPaymentContext(payment, accessGrant, token, reportId, paymentRequestId || requestId, paymentSessionId || sessionId);
      var sourceTransactionId = clean(paymentContext.sourceTransactionId || paymentContext.transactionId || paymentContext.purchaseId || paymentContext.requestId);
      var toneSettings = readSoulOriginToneSettings();
      var payload = {
        mode: 'personal',
        featureKey: FEATURE_KEY,
        productKey: FEATURE_KEY,
        reportType: REPORT_TYPE,
        canonicalReportType: REPORT_TYPE,
        archiveReportType: ARCHIVE_REPORT_TYPE,
        reportTypeAliases: REPORT_TYPE_ALIASES.slice(),
        featureAliases: FEATURE_ALIASES.slice(),
        requestId: paymentRequestId || requestId,
        sessionId: paymentSessionId || sessionId,
        reportSessionId: paymentSessionId || sessionId,
        reportId: reportId,
        transactionId: paymentContext.transactionId || undefined,
        sourceTransactionId: sourceTransactionId || undefined,
        purchaseId: paymentContext.purchaseId || undefined,
        input: input,
        birthInput: input,
        category: category,
        question: question,
        premiumAccessToken: token || undefined,
        _premiumAccessToken: token || undefined,
        accessGrant: accessGrant || undefined,
        consume: paymentContext.consume || undefined,
        payment: paymentContext,
        _paymentContext: paymentContext,
        paymentContext: paymentContext,
        tonePreset: toneSettings.tonePreset,
        toneIntensity: toneSettings.toneIntensity,
        toneWeights: toneSettings.toneWeights,
        tone: {
          preset: toneSettings.tonePreset,
          intensity: toneSettings.toneIntensity,
          weights: toneSettings.toneWeights,
        },
        toneProfile: {
          preset: toneSettings.tonePreset,
          intensity: toneSettings.toneIntensity,
          weights: toneSettings.toneWeights,
        },
      };

      setLoadingMessage('사주와 별의 흐름을 함께 읽고 있어요.', { holdMs: SOUL_ORIGIN_STATUS_MESSAGE_HOLD_MS });
      logStage('AIConsultationStart', { requestId: payload.requestId, sessionId: payload.sessionId, reportId: payload.reportId });
      var data = await callApi(AI_CONSULTATION_API, payload, token);
      if (!data || data.ok !== true || !data.result) {
        var resultError = new Error('운명의 업 AI 상담 결과가 아직 열리지 않았습니다. 잠시 후 다시 시도해 주세요.');
        resultError.code = 'KARMA_AI_RESULT_MISSING';
        throw resultError;
      }
      clearCurrentJob();
      logStage('AIConsultationSuccess', {
        requestId: payload.requestId,
        sessionId: clean(data && data.sessionId) || sessionId,
        reportId: clean(data && data.reportId) || reportId,
        provider: clean(data && data.provider),
      });
      persistResult(data);
      renderResult(data);
    } catch (error) {
      logStage('Failed', {
        stage: 'Failed',
        requestId: requestId,
        sessionId: sessionId,
        errorCode: clean(error && error.code) || 'DESTINY_PRAYER_BOOK_FAILED',
      });
      logExactError(error, { stage: clean(error && error.stage) || 'generate', requestId: requestId, sessionId: sessionId });
      var msg = mapSoulOriginUserMessage(error);
      var errEl = $('soErrorMsg');
      if (errEl) errEl.textContent = msg;
      showScreen('error');
    } finally {
      stopSoulOriginStatusPreview();
      stopLoadingTicker();
      _isGenerating = false;
      setSoulOriginStartDisabled(false);
    }
  }

  function closeModal() {
    var modal = $('soulOriginModal');
    if (!modal) return;
    modal.style.display = 'none';
    stopSoulOriginStatusPreview();
    stopLoadingTicker();
    document.body.classList.remove('lb-modal-open');
    document.body.style.overflow = '';
  }

  function openModal() {
    var modal = $('soulOriginModal');
    if (!modal) return;
    modal.style.display = 'flex';
    logStage('OpenModal', { requestId: readSessionValue(REQUEST_ID_KEY), sessionId: readSessionValue(SESSION_ID_KEY) });
    document.body.classList.add('lb-modal-open');
    document.body.style.overflow = 'hidden';
    updateSoulOriginCoinCost(_resolvedCoinCost);
    resolveSoulOriginCoinCost().catch(function () {});
    ensureSoulOriginAIConsultationUI();
    clearCurrentJob();

    var persisted = readPersisted();
    if (persisted && isSoulOriginAIConsultationPayload(persisted)) {
      renderResult(persisted);
    } else {
      showScreen('start');
    }

    var rawProfile = readActiveProfile() || {};
    prefillSoulOriginAIForm(rawProfile);
    var summaryEl = $('soProfileSummary');
    if (summaryEl) {
      if (rawProfile && clean(rawProfile.birthDate)) {
        var birthTimeText = clean(rawProfile.birthTime) || '태어난 시간 미입력';
        summaryEl.textContent = [
          clean(rawProfile.name || '사용자'),
          clean(rawProfile.birthDate),
          birthTimeText,
          resolveSoulOriginBirthPlace(rawProfile) || '출생지 미입력',
        ].filter(Boolean).join(' · ');
      } else {
        summaryEl.textContent = '프로필을 선택하거나 아래에서 출생 정보를 직접 입력해 주세요.';
      }
    }
  }

  function restoreByReportId() {
    var reportId = clean(prompt('불러올 reportId를 입력해주세요.'));
    if (!reportId) return;

    var endpoints = getApiBaseCandidates(RESULT_API + '/' + encodeURIComponent(reportId))
      .concat(getApiBaseCandidates(READ_API + '?reportId=' + encodeURIComponent(reportId)));
    var idx = 0;
    function run() {
      if (idx >= endpoints.length) {
        alert('요청한 운명의 업 리포트를 찾지 못했습니다.');
        return;
      }
      var headers = {};
      var authToken = readAuthToken();
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      fetchJsonWithTimeout(endpoints[idx], { method: 'GET', headers: headers }, 15000)
        .then(function (pack) {
          if (pack.ok && pack.data && pack.data.ok && isSoulOriginReportReady(pack.data)) {
            persistResult(pack.data);
            renderResult(pack.data);
            return;
          }
          idx += 1;
          run();
        })
        .catch(function () {
          idx += 1;
          run();
        });
    }
    run();
  }

  window.openSoulOriginModal = openModal;
  window.closeSoulOriginModal = closeModal;
  window.generateSoulOriginReport = generateSoulOrigin;
  window.restoreSoulOriginReport = restoreByReportId;

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var btn = target.closest('[data-action]');
    if (!btn) return;

    var action = clean(btn.getAttribute('data-action'));

    if (action === 'openSoulOriginModal' || action === 'gotoSoulOriginPremium') {
      event.preventDefault();
      openModal();
      return;
    }
    if (action === 'closeSoulOriginModal') {
      event.preventDefault();
      closeModal();
      return;
    }
  }, true);
})();
