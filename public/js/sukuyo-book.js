/**
 * Sukyo Premium Compatibility PDF
 * Compatibility-only + preflight-before-payment pipeline.
 */
(function () {
  'use strict';

  if (window.__cdSukuyoBookInitialized) return;
  window.__cdSukuyoBookInitialized = true;

  var SUKYO_FEATURE_KEY = 'premium-sukuyo-report-compat';
  var SUKYO_ALIAS_FEATURE_KEY = 'premium_pdf_sukyo_compat';
  var SUKYO_PREFLIGHT_API = '/api/sukuyo/premium/preflight';
  var SUKYO_PREPARE_API = '/api/sukuyo/premium/prepare';
  var SUKYO_CHAPTERS_API = '/api/sukuyo/premium/chapters';
  var SUKYO_EXECUTION_STATUS_API = '/api/sukuyo/premium/status';
  var SUKYO_ARCHIVE_API = '/api/premium/pdf-archive';
  var SUKYO_TOTAL_CHAPTERS = 15;
  var SUKYO_COIN_COST_FALLBACK = 490;
  var SUKYO_RUNNING_POLL_INTERVAL_MS = 4500;
  var SUKYO_RUNNING_POLL_MAX_ATTEMPTS = 160;
  var SUKYO_LLM_MANUSCRIPT_SOURCE = 'llm-authored';
  var SUKYO_ACCEPTED_MANUSCRIPT_SOURCES = [SUKYO_LLM_MANUSCRIPT_SOURCE, 'llm-html-v2', 'llm-workers-ai', 'llm-gemini', 'llm-workers-ai+gemini'];
  var SUKYO_FLOATING_STYLE_ID = 'skFloatingWindowStyle';
  var SUKYO_GENERATION_STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var SUKYO_BOOK_TEXT_TRANSLATIONS = {
    ko: {
      'input.yearRange': '1900~2100 사이로 입력해 주세요',
      'input.monthRange': '1~12 사이로 입력해 주세요',
      'input.dayRange': '1~31 사이로 입력해 주세요',
      'input.hourRange': '0~23 사이로 입력해 주세요',
      'input.minuteRange': '0~59 사이로 입력해 주세요',
      'loading.chapterTitle': function (step, title) { return '제' + step + '장. ' + title + ' 작성 중...'; },
      'loading.defaultChapter': '숙요 궁합 원고',
      'loading.finalizingPdf': 'PDF 저장본 확정 중입니다.',
      'loading.renderingPdf': '15장 원고를 PDF로 렌더링하고 있습니다.',
      'loading.completingArchive': '완성된 PDF 저장본을 확정하고 있습니다.',
      'loading.savingStage': '숙요점 프리미엄 궁합 PDF 저장 중',
      'loading.generatingStage': '숙요점 프리미엄 궁합 PDF 생성 중',
      'loading.savedNotice': '15장 원고를 확인했습니다. 저장 링크와 결과 화면을 여는 중입니다.',
      'loading.runningNotice': '숙요점 궁합 PDF가 생성 중입니다. 완료 상태를 확인하고 있습니다.',
      'payment.title': '숙요점 프리미엄 궁합 PDF',
      'payment.reason': function (coinLabel) { return '숙요점 프리미엄 궁합 PDF 생성 · ' + coinLabel; },
      'payment.moduleMissing': '결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.',
      'payment.cancelledStop': '결제가 취소되어 생성을 중단했습니다.',
    },
    en: {
      'input.yearRange': 'Enter a year between 1900 and 2100.',
      'input.monthRange': 'Enter a month from 1 to 12.',
      'input.dayRange': 'Enter a day from 1 to 31.',
      'input.hourRange': 'Enter an hour from 0 to 23.',
      'input.minuteRange': 'Enter minutes from 0 to 59.',
      'loading.chapterTitle': function (step, title) { return 'Chapter ' + step + '. Writing ' + title + '...'; },
      'loading.defaultChapter': 'Sukuyo compatibility manuscript',
      'loading.finalizingPdf': 'Finalizing the saved PDF.',
      'loading.renderingPdf': 'Rendering the 15-chapter manuscript as a PDF.',
      'loading.completingArchive': 'Confirming the completed saved PDF.',
      'loading.savingStage': 'Saving the Sukuyo premium compatibility PDF',
      'loading.generatingStage': 'Creating the Sukuyo premium compatibility PDF',
      'loading.savedNotice': 'The 15 chapters have been checked. Opening the saved link and result screen.',
      'loading.runningNotice': 'Your Sukuyo compatibility PDF is being created. Checking completion status.',
      'payment.title': 'Sukuyo Premium Compatibility PDF',
      'payment.reason': function (coinLabel) { return 'Create Sukuyo Premium Compatibility PDF · ' + coinLabel; },
      'payment.moduleMissing': 'Payment module not found. Please refresh the page and try again.',
      'payment.cancelledStop': 'Payment was cancelled, so generation has stopped.',
    },
    ja: {
      'input.yearRange': '1900〜2100の範囲で入力してください',
      'input.monthRange': '1〜12の範囲で入力してください',
      'input.dayRange': '1〜31の範囲で入力してください',
      'input.hourRange': '0〜23の範囲で入力してください',
      'input.minuteRange': '0〜59の範囲で入力してください',
      'loading.chapterTitle': function (step, title) { return '第' + step + '章. ' + title + 'を執筆中...'; },
      'loading.defaultChapter': '宿曜相性原稿',
      'loading.finalizingPdf': 'PDF保存版を確定しています。',
      'loading.renderingPdf': '15章の原稿をPDFにレンダリングしています。',
      'loading.completingArchive': '完成したPDF保存版を確定しています。',
      'loading.savingStage': '宿曜プレミアム相性PDFを保存中',
      'loading.generatingStage': '宿曜プレミアム相性PDFを生成中',
      'loading.savedNotice': '15章の原稿を確認しました。保存リンクと結果画面を開いています。',
      'loading.runningNotice': '宿曜相性PDFを生成中です。完了状態を確認しています。',
      'payment.title': '宿曜プレミアム相性PDF',
      'payment.reason': function (coinLabel) { return '宿曜プレミアム相性PDF生成 · ' + coinLabel; },
      'payment.moduleMissing': '決済モジュールが見つかりません。ページを更新してもう一度お試しください。',
      'payment.cancelledStop': '決済がキャンセルされたため、生成を中断しました。',
    },
    'zh-CN': {
      'input.yearRange': '请输入 1900~2100 之间的年份',
      'input.monthRange': '请输入 1~12 之间的月份',
      'input.dayRange': '请输入 1~31 之间的日期',
      'input.hourRange': '请输入 0~23 之间的小时',
      'input.minuteRange': '请输入 0~59 之间的分钟',
      'loading.chapterTitle': function (step, title) { return '第' + step + '章：正在撰写' + title + '...'; },
      'loading.defaultChapter': '宿曜相性原稿',
      'loading.finalizingPdf': '正在确认 PDF 保存版。',
      'loading.renderingPdf': '正在将 15 章原稿渲染为 PDF。',
      'loading.completingArchive': '正在确认完成的 PDF 保存版。',
      'loading.savingStage': '正在保存宿曜高级相性 PDF',
      'loading.generatingStage': '正在生成宿曜高级相性 PDF',
      'loading.savedNotice': '15 章原稿已确认。正在打开保存链接与结果画面。',
      'loading.runningNotice': '宿曜相性 PDF 正在生成中。正在确认完成状态。',
      'payment.title': '宿曜高级相性 PDF',
      'payment.reason': function (coinLabel) { return '生成宿曜高级相性 PDF · ' + coinLabel; },
      'payment.moduleMissing': '未找到付款模块。请刷新页面后重试。',
      'payment.cancelledStop': '付款已取消，生成已停止。',
    },
    'zh-TW': {
      'input.yearRange': '請輸入 1900~2100 之間的年份',
      'input.monthRange': '請輸入 1~12 之間的月份',
      'input.dayRange': '請輸入 1~31 之間的日期',
      'input.hourRange': '請輸入 0~23 之間的小時',
      'input.minuteRange': '請輸入 0~59 之間的分鐘',
      'loading.chapterTitle': function (step, title) { return '第' + step + '章：正在撰寫' + title + '...'; },
      'loading.defaultChapter': '宿曜相性原稿',
      'loading.finalizingPdf': '正在確認 PDF 保存版。',
      'loading.renderingPdf': '正在將 15 章原稿渲染為 PDF。',
      'loading.completingArchive': '正在確認完成的 PDF 保存版。',
      'loading.savingStage': '正在保存宿曜高級相性 PDF',
      'loading.generatingStage': '正在生成宿曜高級相性 PDF',
      'loading.savedNotice': '15 章原稿已確認。正在開啟保存連結與結果畫面。',
      'loading.runningNotice': '宿曜相性 PDF 正在生成中。正在確認完成狀態。',
      'payment.title': '宿曜高級相性 PDF',
      'payment.reason': function (coinLabel) { return '生成宿曜高級相性 PDF · ' + coinLabel; },
      'payment.moduleMissing': '未找到付款模組。請重新整理頁面後再試。',
      'payment.cancelledStop': '付款已取消，生成已停止。',
    },
  };

  function _sukuyoBookLang() {
    var lang = 'ko';
    try {
      if (typeof window !== 'undefined' && typeof window.cdGetCurrentLanguage === 'function') lang = window.cdGetCurrentLanguage();
      else if (typeof window !== 'undefined' && window.localStorage) lang = window.localStorage.getItem('cd_lang') || lang;
    } catch (_) {}
    lang = String(lang || 'ko').toLowerCase();
    if (lang === 'zh' || lang === 'zh-cn' || lang === 'zh-hans') return 'zh-CN';
    if (lang === 'zh-tw' || lang === 'zh-hant' || lang === 'zh-hk') return 'zh-TW';
    if (lang.indexOf('ja') === 0) return 'ja';
    if (lang.indexOf('en') === 0) return 'en';
    return 'ko';
  }

  function _sukuyoBookText(key) {
    var table = SUKYO_BOOK_TEXT_TRANSLATIONS[_sukuyoBookLang()] || SUKYO_BOOK_TEXT_TRANSLATIONS.en;
    var value = table[key] || SUKYO_BOOK_TEXT_TRANSLATIONS.en[key];
    if (typeof value === 'function') return value.apply(null, Array.prototype.slice.call(arguments, 1));
    return value || 'Translation pending';
  }

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var _generating = false;
  var _activeSessionId = '';
  var _activeReportId = '';
  var _activePaymentRequestId = '';
  var _lastPremiumPayment = null;
  var _activeChapterIndex = 0;
  var _lastLoadingStep = 0;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;
  var _resumeGenerationPromise = null;
  var SUKYO_GENERATION_STATE_KEY = 'cd:sukuyo:compat:generation:llm-v3';

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }
  function _normalizeBirthDateInput(value) {
    var raw = _clean(value);
    if (!raw) return '';
    var digits = raw.replace(/\D/g, '');
    if (digits.length === 8) {
      var y = Number(digits.slice(0, 4));
      var m = Number(digits.slice(4, 6));
      var d = Number(digits.slice(6, 8));
      var check = new Date(Date.UTC(y, m - 1, d));
      if (
        check.getUTCFullYear() === y &&
        check.getUTCMonth() === m - 1 &&
        check.getUTCDate() === d
      ) {
        return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      }
      return '';
    }
    var match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return '';
    return _normalizeBirthDateInput(match[1] + String(match[2]).padStart(2, '0') + String(match[3]).padStart(2, '0'));
  }
  function _num(value, fallback) { var n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function _profileNum(value, fallback) {
    if (value === null || value === undefined || _clean(value) === '') return fallback;
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function _readProfileDateParts(profile) {
    var source = profile || {};
    var birth = source.birth && typeof source.birth === 'object' ? source.birth : {};
    var year = _profileNum(birth.year != null ? birth.year : source.birthYear, NaN);
    var month = _profileNum(birth.month != null ? birth.month : source.birthMonth, NaN);
    var day = _profileNum(birth.day != null ? birth.day : source.birthDay, NaN);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      var dateText = _clean(source.birthDate || source.birthIso || source.birth || '');
      if (dateText.indexOf('T') >= 0 || dateText.indexOf(' ') >= 0) dateText = dateText.split(/[T\s]/)[0] || dateText;
      var normalized = _normalizeBirthDateInput(dateText);
      var parts = normalized ? normalized.split('-') : [];
      year = _profileNum(parts[0], NaN);
      month = _profileNum(parts[1], NaN);
      day = _profileNum(parts[2], NaN);
    }

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return { year: year, month: month, day: day };
  }
  function _readProfileTimeParts(profile) {
    var source = profile || {};
    var birth = source.birth && typeof source.birth === 'object' ? source.birth : {};
    var hour = _profileNum(birth.hour != null ? birth.hour : source.birthHour, NaN);
    var minute = _profileNum(birth.minute != null ? birth.minute : source.birthMinute, 0);

    if (!Number.isFinite(hour)) {
      var timeText = _clean(source.birthTime || '');
      if (!timeText && _clean(source.birthIso)) {
        var isoTime = String(source.birthIso).split(/[T\s]/)[1] || '';
        timeText = isoTime;
      }
      var parsed = _parseTimeLoose(timeText);
      hour = parsed.birthHour;
      minute = parsed.birthMinute;
    }

    if (!Number.isFinite(hour)) return { hour: null, minute: null };
    if (!Number.isFinite(minute)) minute = 0;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { hour: null, minute: null };
    return { hour: hour, minute: minute };
  }
  function _normalizeSukuyoProfile(profile, fallbackGender) {
    if (!profile || typeof profile !== 'object') return null;
    var date = _readProfileDateParts(profile);
    if (!date) return null;
    var time = _readProfileTimeParts(profile);
    var birth = Object.assign({}, profile.birth && typeof profile.birth === 'object' ? profile.birth : {}, {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: time.hour,
      minute: time.minute,
    });
    var gender = _normalizeGender(profile.gender || profile.sex || profile.genderCode || fallbackGender);
    if (gender === 'unknown' && fallbackGender) gender = _normalizeGender(fallbackGender);
    var calendarType = _normalizeCalendarType((profile.birth && profile.birth.calType) || profile.calType || profile.calendarType || 'solar');
    return Object.assign({}, profile, {
      gender: gender,
      birth: birth,
      birthYear: date.year,
      birthMonth: date.month,
      birthDay: date.day,
      birthHour: time.hour,
      birthMinute: time.minute,
      calendarType: calendarType === 'unknown' ? 'solar' : calendarType,
      birthDate: String(date.year).padStart(4, '0') + '-' + _pad2(date.month) + '-' + _pad2(date.day),
      birthTime: Number.isFinite(time.hour) ? _pad2(time.hour) + ':' + _pad2(time.minute || 0) : '',
    });
  }
  function _resolveSukuyoCoinCost() {
    var card = document.querySelector('[data-action="gotoSukuyoPremium"][data-coin-cost]');
    var cost = _num(card && card.getAttribute('data-coin-cost'), NaN);
    return Number.isFinite(cost) && cost > 0 ? Math.floor(cost) : SUKYO_COIN_COST_FALLBACK;
  }
  function _sukuyoCoinLabel() {
    return (_resolveSukuyoCoinCost() * 100).toLocaleString('ko-KR') + '원';
  }
  function _finiteNumber(value) {
    if (value === null || typeof value === 'undefined' || value === '') return NaN;
    var n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }
  function _firstFiniteNumber(fallback) {
    for (var i = 1; i < arguments.length; i += 1) {
      var n = _finiteNumber(arguments[i]);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }
  function _isAcceptedManuscriptSource(source) {
    return SUKYO_ACCEPTED_MANUSCRIPT_SOURCES.indexOf(_clean(source)) >= 0;
  }
  function _isLlmManuscriptSource(source) {
    var value = _clean(source);
    return value.indexOf('llm') === 0 || SUKYO_ACCEPTED_MANUSCRIPT_SOURCES.indexOf(value) >= 0;
  }
  function _resolveSukuyoLlmAssembly(payload, ready, nested) {
    var p = payload && typeof payload === 'object' ? payload : {};
    var r = ready && typeof ready === 'object' ? ready : {};
    var n = nested && typeof nested === 'object' ? nested : {};
    return p.llmAssembly && typeof p.llmAssembly === 'object'
      ? p.llmAssembly
      : (r.llmAssembly && typeof r.llmAssembly === 'object'
        ? r.llmAssembly
        : (n.llmAssembly && typeof n.llmAssembly === 'object' ? n.llmAssembly : {}));
  }
  function _isSukuyoLlmAssemblyReady(assembly, source) {
    var item = assembly && typeof assembly === 'object' ? assembly : {};
    var provider = _clean(item.provider);
    var manuscriptSource = _clean(item.source || source);
    return item.enabled === true
      && _isLlmManuscriptSource(manuscriptSource)
      && /workers-ai|gemini/i.test(provider)
      && item.externalGeneration === true
      && item.externalCallsAllowed === true
      && item.fallbackUsed !== true
      && Number(item.chapterCount || 0) === SUKYO_TOTAL_CHAPTERS
      && Number(item.expectedChapterCount || 0) === SUKYO_TOTAL_CHAPTERS;
  }

  function normalizeSukuyoError(error) {
    if (error instanceof Error) {
      var normalized = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      try {
        Object.keys(error).forEach(function (key) {
          normalized[key] = error[key];
        });
      } catch (_) {}
      if (error.cause) normalized.cause = normalizeSukuyoError(error.cause);
      return normalized;
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

  function _isDebugEnabled() {
    try {
      if (window.__cdDebugSukuyoBook === true) return true;
      if (String(window.__CD_ENV || '').toLowerCase() === 'development') return true;
      var host = String(window.location && window.location.hostname || '');
      return host === 'localhost' || host === '127.0.0.1';
    } catch (_) {
      return false;
    }
  }

  function _log(label, payload) {
    if (!_isDebugEnabled()) return;
    try { console.info(label, payload || {}); } catch (_) {}
  }

  function _stringifySukuyoLogPayload(payload) {
    var seen = [];
    return JSON.stringify(payload, function (_key, value) {
      if (value && typeof value === 'object') {
        if (seen.indexOf(value) >= 0) return '[Circular]';
        seen.push(value);
      }
      return value;
    }, 2);
  }

  function _logError(error, stage) {
    var normalized = normalizeSukuyoError(error);
    var original = error || {};
    var cause = original && original.cause;
    var details = normalized && normalized.details || original.details || {};
    var payload = {
      stage: _clean(stage),
      name: _clean(normalized && normalized.name) || 'Error',
      code: _clean(normalized && normalized.code || original.code || original.errorCode),
      status: _clean(normalized && normalized.status || original.status || original.statusCode),
      message: _clean(normalized && normalized.message) || 'unknown',
      reportId: _clean(normalized && normalized.reportId || original.reportId || original.executionId),
      sessionId: _clean(normalized && normalized.sessionId || original.sessionId || _activeSessionId),
      causeMessage: _clean(cause && cause.message),
      details: details,
    };
    try {
      console.error('[SukuyoBook][Error] ' + _stringifySukuyoLogPayload(payload), error);
    } catch (_) {}
  }

  function _createSukuyoError(message, details) {
    var err = new Error(_clean(message) || '숙요점 PDF 생성 중 오류가 발생했습니다.');
    var safeDetails = details && typeof details === 'object' ? details : {};
    err.details = safeDetails;
    err.code = _clean(safeDetails.code);
    err.status = _clean(safeDetails.status);
    err.reportId = _clean(safeDetails.reportId);
    err.sessionId = _clean(safeDetails.sessionId || _activeSessionId);
    return err;
  }

  function _summarizeSukuyoPayload(payload) {
    var p = payload && typeof payload === 'object' ? payload : {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    var execution = p.execution && typeof p.execution === 'object' ? p.execution : {};
    var chapters = _resolveSukuyoCompletedChapters(p);
    var nested = p.payload && typeof p.payload === 'object' ? p.payload : {};
    var llmAssembly = _resolveSukuyoLlmAssembly(p, ready, nested);
    return {
      ok: p.ok,
      code: _clean(p.code || p.errorCode || p.error),
      message: _clean(p.message || p.reasonMessage),
      status: _clean(p.status || p.serverStatus || execution.status),
      premiumStatus: _clean(p.premiumStatus || execution.premiumStatus),
      reportId: _clean(p.reportId || ready.reportId || execution.reportId),
      sessionId: _clean(p.sessionId || p.reportSessionId || execution.sessionId),
      chapterCount: Number(p.chapterCount || chapters.length || 0),
      expectedChapterCount: SUKYO_TOTAL_CHAPTERS,
      qualityStatus: _clean(p.qualityStatus),
      manuscriptSource: _clean(p.manuscriptSource || ready.manuscriptSource || llmAssembly.source),
      llmDraftChapterCount: Number(p.llmDraftChapterCount || ready.llmDraftChapterCount || llmAssembly.chapterCount || p.chapterCount || ready.chapterCount || chapters.length || 0),
      llmAssemblyOnly: p.llmAssemblyOnly === true || ready.llmAssemblyOnly === true || llmAssembly.externalGeneration === true,
      llmAssemblyReady: _isSukuyoLlmAssemblyReady(llmAssembly, p.manuscriptSource || ready.manuscriptSource),
      externalCallsAllowed: p.externalCallsAllowed === true || ready.externalCallsAllowed === true,
      hasPdfUrl: !!_clean(p.downloadUrl || p.pdfUrl || p.storedUrl || p.reportUrl || p.fileUrl || p.storageUrl || ready.downloadUrl || ready.pdfUrl),
      keys: Object.keys(p).slice(0, 30),
    };
  }

  function _describeSukuyoReadiness(payload) {
    var p = payload && typeof payload === 'object' ? payload : {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    var chapters = _resolveSukuyoCompletedChapters(p);
    var summary = _summarizeSukuyoPayload(p);
    var nested = p.payload && typeof p.payload === 'object' ? p.payload : {};
    var validation = p.pdfCompletionValidation && typeof p.pdfCompletionValidation === 'object' ? p.pdfCompletionValidation : ready.pdfCompletionValidation;
    var llmAssembly = _resolveSukuyoLlmAssembly(p, ready, nested);
    var manuscriptSource = _clean(p.manuscriptSource || ready.manuscriptSource || nested.manuscriptSource || llmAssembly.source || SUKYO_LLM_MANUSCRIPT_SOURCE);
    var llmDraftChapterCount = _firstFiniteNumber(0, p.llmDraftChapterCount, ready.llmDraftChapterCount, llmAssembly.chapterCount, p.chapterCount, ready.chapterCount, chapters.length);
    var llmAssemblyOnly = p.llmAssemblyOnly === true || ready.llmAssemblyOnly === true || llmAssembly.externalGeneration === true;
    var externalCallsAllowed = p.externalCallsAllowed === true || ready.externalCallsAllowed === true;
    var countContractOk = llmDraftChapterCount === SUKYO_TOTAL_CHAPTERS;
    var checks = {
      hasReportId: !!_clean(p.reportId),
      hasStoredUrl: !!_resolveSukuyoStoredUrl(p),
      hasAllChapters: chapters.length === SUKYO_TOTAL_CHAPTERS,
      serverCompleted: _clean(p.serverStatus) === 'completed' || _clean(p.status) === 'completed' || _clean(p.status) === 'done',
      qualityPassed: _clean(p.qualityStatus) === 'passed' || (validation && validation.ok === true),
      sourceAccepted: _isAcceptedManuscriptSource(manuscriptSource),
      sourceLlmOnly: _isLlmManuscriptSource(manuscriptSource),
      llmAssemblyReady: _isSukuyoLlmAssemblyReady(llmAssembly, manuscriptSource),
      chapterCountContract: countContractOk,
      llmAssemblyOnly: llmAssemblyOnly,
      externalCallsAllowed: externalCallsAllowed,
    };
    summary.failedChecks = Object.keys(checks).filter(function (key) { return !checks[key]; });
    summary.checks = checks;
    return summary;
  }

  function _resolveSukuyoGenerationErrorMessage(error) {
    var msg = _sanitizeText(_clean(error && error.message));
    if (msg.indexOf('환불') >= 0) {
      return '숙요점 궁합 PDF 생성이 완료되지 않았습니다. 결제 처리분은 자동 환불 확인 대상입니다. 다시 시도해 주세요.';
    }
    if (msg && !/^[A-Z0-9_:-]+$/.test(msg) && msg.length >= 8 && msg.length <= 180) {
      return msg;
    }
    var details = error && error.details && typeof error.details === 'object' ? error.details : null;
    var detailsMessage = _sanitizeText(_clean(details && (details.message || details.reasonMessage || details.error)));
    if (detailsMessage && !/^[A-Z0-9_:-]+$/.test(detailsMessage) && detailsMessage.length >= 8 && detailsMessage.length <= 180) {
      return detailsMessage;
    }
    return 'PDF 생성 결과 검증이 완료되지 않았습니다. 원화 결제 상태를 확인한 뒤 잠시 후 다시 시도해 주세요.';
  }

  function _sanitizeText(value) {
    return String(value || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|api|debug|engine|about:blank)\b/gi, '')
      .replace(/\bchapter\s*\d+\b/gi, '')
      .replace(/\b(a\(안\)|b\(괴\)|near-triad|triad|d\d+)\b/gi, '')
      .replace(/\b(internal\s+server\s+error)\b/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function _escapeSukuyoHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _chapterTitleOnly(title, chapterNo) {
    var value = _clean(title);
    var no = Number(chapterNo || 0);
    if (!value) return no ? ('제' + no + '장') : '';
    value = value.replace(/^제\s*\d+\s*장\s*[.:．。-]?\s*/i, '');
    return value || (no ? ('제' + no + '장') : '');
  }

  function _newSessionId() {
    return 'sukuyo-session-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function _getSukuyoGenerationScope() {
    var sessionId = _clean(_activeSessionId) || _newSessionId();
    _activeSessionId = sessionId;
    var reportId = _clean(_activeReportId) || ('sukyo-premium-' + sessionId);
    _activeReportId = reportId;
    var requestId = _clean(_activePaymentRequestId) || (reportId + '-pay');
    _activePaymentRequestId = requestId;
    return {
      sessionId: sessionId,
      reportSessionId: sessionId,
      reportId: reportId,
      requestId: requestId,
    };
  }

  function _extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var i = 0; i < keys.length; i += 1) {
      var found = _clean(payload[keys[i]]);
      if (found) return found;
    }
    var nestedKeys = ['data', 'payload', 'accessGrant', 'consume', 'payment', '_paymentContext'];
    for (var j = 0; j < nestedKeys.length; j += 1) {
      var nested = payload[nestedKeys[j]];
      if (nested && nested !== payload) {
        var nestedToken = _extractPremiumToken(nested);
        if (nestedToken) return nestedToken;
      }
    }
    return '';
  }

  function _extractAccessGrant(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (payload.accessGrant && typeof payload.accessGrant === 'object') return payload.accessGrant;
    return _extractAccessGrant(payload.data)
      || _extractAccessGrant(payload.payload)
      || _extractAccessGrant(payload.consume)
      || _extractAccessGrant(payload.payment)
      || _extractAccessGrant(payload._paymentContext);
  }

  function _normalizePremiumPayment(transactionId, payload) {
    var raw = payload && typeof payload === 'object' ? payload : {};
    var data = raw.data && typeof raw.data === 'object' ? raw.data : {};
    var nested = raw.payload && typeof raw.payload === 'object' ? raw.payload : {};
    var grant = _extractAccessGrant(raw);
    var token = _extractPremiumToken(raw);
    var tx = _clean(transactionId || raw.transactionId || data.transactionId || nested.transactionId || (grant && (grant.transactionId || grant.purchaseId || grant.requestId)));
    var requestId = _clean((grant && (grant.requestId || grant.transactionId)) || raw.requestId || data.requestId || nested.requestId || tx);
    var purchaseId = _clean((grant && grant.purchaseId) || raw.purchaseId || data.purchaseId || nested.purchaseId || raw.paymentId || data.paymentId || tx);
    var reportId = _clean((grant && grant.reportId) || raw.reportId || data.reportId || nested.reportId);
    var sessionId = _clean((grant && (grant.sessionId || grant.reportSessionId)) || raw.sessionId || data.sessionId || nested.sessionId || _activeSessionId);
    var reportSessionId = _clean((grant && (grant.reportSessionId || grant.sessionId)) || raw.reportSessionId || data.reportSessionId || nested.reportSessionId || sessionId);
    var context = {
      featureKey: SUKYO_FEATURE_KEY,
      aliasFeatureKey: SUKYO_ALIAS_FEATURE_KEY,
      reportType: 'sookyoPremium',
      mode: 'compatibility',
      reportMode: 'compatibility',
      premiumAccessToken: token || undefined,
      transactionId: tx || undefined,
      requestId: requestId || undefined,
      purchaseId: purchaseId || undefined,
      sessionId: sessionId || undefined,
      reportSessionId: reportSessionId || undefined,
      reportId: reportId || undefined,
    };
    if (grant) context.accessGrant = grant;
    return context;
  }

  function _bindPaymentToCurrentGeneration(payment) {
    var scope = _getSukuyoGenerationScope();
    var next = payment && typeof payment === 'object' ? payment : {};
    next.sessionId = _clean(next.sessionId || scope.sessionId) || undefined;
    next.reportSessionId = _clean(next.reportSessionId || next.sessionId || scope.reportSessionId) || undefined;
    next.reportId = _clean(next.reportId || scope.reportId) || undefined;
    next.requestId = _clean(next.requestId || scope.requestId) || undefined;
    next.purchaseId = _clean(next.purchaseId || (next.accessGrant && next.accessGrant.purchaseId) || next.transactionId || next.requestId) || undefined;
    next.transactionId = _clean(next.transactionId || next.purchaseId || next.requestId) || undefined;
    next.featureKey = SUKYO_FEATURE_KEY;
    next.aliasFeatureKey = SUKYO_ALIAS_FEATURE_KEY;
    next.reportType = 'sookyoPremium';
    next.mode = 'compatibility';
    next.reportMode = 'compatibility';
    if (next.accessGrant && typeof next.accessGrant === 'object') {
      next.accessGrant.sessionId = _clean(next.accessGrant.sessionId || next.sessionId) || undefined;
      next.accessGrant.reportSessionId = _clean(next.accessGrant.reportSessionId || next.reportSessionId) || undefined;
      next.accessGrant.reportId = _clean(next.accessGrant.reportId || next.reportId) || undefined;
      next.accessGrant.requestId = _clean(next.accessGrant.requestId || next.requestId) || undefined;
      next.accessGrant.purchaseId = _clean(next.accessGrant.purchaseId || next.purchaseId) || undefined;
      next.accessGrant.transactionId = _clean(next.accessGrant.transactionId || next.transactionId || next.purchaseId) || undefined;
      next.accessGrant.featureKey = _clean(next.accessGrant.featureKey || SUKYO_FEATURE_KEY) || SUKYO_FEATURE_KEY;
      next.accessGrant.reportType = _clean(next.accessGrant.reportType || 'sookyoPremium') || 'sookyoPremium';
    }
    return next;
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

  function _hasActivePaymentEvidence() {
    var paymentContext = _lastPremiumPayment && typeof _lastPremiumPayment === 'object' ? _lastPremiumPayment : null;
    if (!paymentContext) return false;
    var sessionId = _clean(paymentContext.reportSessionId || paymentContext.sessionId);
    if (sessionId && _activeSessionId && sessionId !== _activeSessionId) return false;
    var grant = paymentContext.accessGrant && typeof paymentContext.accessGrant === 'object' ? paymentContext.accessGrant : null;
    return Boolean(
      _extractPremiumToken(paymentContext)
      || _clean(paymentContext.transactionId)
      || _clean(paymentContext.purchaseId)
      || _clean(paymentContext.requestId)
      || _clean(grant && (grant.evidenceId || grant.paymentId || grant.purchaseId || grant.transactionId || grant.merchantUid))
    );
  }

  function _hasPremiumAccessForGeneration() {
    if (!_hasActivePaymentEvidence()) return false;
    if (Date.now() < _premiumAccessVerifiedUntil) return true;
    if (_premiumTokenMatches() || Date.now() < _premiumPaidUntil) {
      _markPremiumAccessVerified(25 * 60 * 1000);
      return true;
    }
    return false;
  }

  function _ensureFloatingWindowStyle() {
    if (_qs(SUKYO_FLOATING_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = SUKYO_FLOATING_STYLE_ID;
    style.textContent = [
      'body>#skGenerationWindow.sk-floating-window,body>#skErrorWindow{position:fixed!important;inset:0!important;z-index:10080!important;display:none;align-items:center!important;justify-content:center!important;padding:18px!important;background:rgba(6,3,18,.74)!important;backdrop-filter:blur(14px);}',
      'body>#skGenerationWindow.sk-floating-window .sk-generation-window__panel,body>#skErrorWindow .sk-error-window__panel{width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 36px);overflow:auto;border:1px solid rgba(196,181,253,.38);border-radius:8px;background:linear-gradient(135deg,rgba(18,10,42,.97),rgba(6,14,32,.97));box-shadow:0 28px 80px rgba(0,0,0,.5);padding:22px;text-align:center;color:#f9f4ff;}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__orb,#skErrorWindow .sk-error-window__orb{width:58px;height:58px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(253,230,138,.38);background:radial-gradient(circle,rgba(253,230,138,.24),rgba(124,58,237,.18));color:#fde68a;font-size:1.55rem;}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__eyebrow,#skErrorWindow .sk-error-window__eyebrow{margin:0 0 6px;color:#c4b5fd;font-size:.76rem;font-weight:800;letter-spacing:0;text-transform:uppercase;}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__title,#skErrorWindow .sk-error-window__title{margin:0 0 14px;color:#fff7ed;font-size:1.12rem;line-height:1.45;word-break:keep-all;}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__chapter{padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__chapter span{display:block;margin-bottom:5px;color:#fde68a;font-weight:800;}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__chapter p,#skErrorWindow .sk-error-window__msg{margin:0;color:#f9f4ff;font-size:.92rem;line-height:1.62;word-break:keep-all;}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__bar{height:9px;margin:14px 0 7px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__bar i{display:block;width:0%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#a78bfa,#fde68a);transition:width .28s ease;}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__progress{margin:0;color:#d8c8ed;font-size:.82rem;font-weight:800;}',
      '#skGenerationWindow.sk-floating-window .sk-generation-window__notice{margin:10px 0 0;color:#c4b5fd;font-size:.86rem;line-height:1.55;word-break:keep-all;}',
      '#skErrorWindow .sk-error-window__scrim{position:absolute;inset:0;}',
      '#skErrorWindow .sk-error-window__panel{position:relative;border-color:rgba(253,230,138,.42);}',
      '#skErrorWindow .sk-error-window__actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:18px;}',
      '#skErrorWindow .sk-error-window__btn{min-width:108px;border:1px solid rgba(196,181,253,.38);border-radius:8px;background:rgba(255,255,255,.08);color:#f9f4ff;padding:10px 14px;font-weight:800;cursor:pointer;}',
      '#skErrorWindow .sk-error-window__btn--primary{border-color:rgba(253,230,138,.48);background:linear-gradient(135deg,#6d28d9,#a16207);color:#fff7ed;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skNoProfileScreen,#sukuyoBookModal.sukuyo-book-modal--result-open #skStartScreen,#sukuyoBookModal.sukuyo-book-modal--result-open #skLoadingScreen,#sukuyoBookModal.sukuyo-book-modal--result-open #skErrorScreen{display:none!important;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skResultScreen{display:grid!important;grid-template-columns:minmax(236px,286px) minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr);grid-template-areas:"header header" "notice notice" "toc content";height:100%;min-height:0;overflow:hidden;background:linear-gradient(135deg,rgba(8,5,20,.98),rgba(13,13,42,.96));}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .lb-modal__panel{padding:0!important;overflow:hidden!important;border-color:rgba(196,181,253,.32)!important;background:linear-gradient(135deg,rgba(8,5,20,.99),rgba(15,19,48,.98))!important;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .lb-result__header{grid-area:header;position:relative;display:grid!important;grid-template-columns:48px minmax(0,1fr) auto;grid-template-rows:auto auto;grid-template-areas:"symbol title actions" "symbol meta actions";align-items:center;gap:4px 14px;padding:22px 24px 18px;border-bottom:1px solid rgba(167,139,250,.22);background:radial-gradient(circle at 12% 0%,rgba(253,230,138,.14),transparent 32%),radial-gradient(circle at 88% 8%,rgba(124,58,237,.28),transparent 38%),linear-gradient(180deg,rgba(15,10,34,.98),rgba(10,7,24,.92));}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .lb-result__symbol{grid-area:symbol;margin:0;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .lb-result__title{grid-area:title;margin:0;text-align:left;line-height:1.35;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .lb-result__meta{grid-area:meta;justify-content:flex-start;margin:2px 0 0;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skCompletionNotice.sk-result-status{grid-area:notice;margin:0;padding:12px 24px;border:0;border-bottom:1px solid rgba(251,191,36,.22);border-radius:0;background:linear-gradient(90deg,rgba(251,191,36,.15),rgba(124,58,237,.12),rgba(14,165,233,.08));box-shadow:none;color:#fef7dc;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .sk-result-status__title{display:block;margin:0 0 6px;font-size:.95rem;color:#fde68a;line-height:1.45;word-break:keep-all;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .sk-result-status__body{display:block;line-height:1.62;font-size:.86rem;color:#f8f0ff;word-break:keep-all;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .sk-result-status__badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .sk-result-status__badges b{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.08);font-size:.73rem;color:#fff7ed;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skToc{grid-area:toc;display:flex!important;flex-direction:column;gap:8px;min-height:0;overflow:auto;padding:18px 14px 20px;border-right:1px solid rgba(167,139,250,.18);border-bottom:0;background:linear-gradient(180deg,rgba(11,7,28,.92),rgba(9,6,22,.82));white-space:normal;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skToc .lb-toc-item{width:100%;min-height:auto;padding:12px 13px;border-radius:8px;text-align:left;white-space:normal;background:rgba(255,255,255,.045);border:1px solid rgba(167,139,250,.22);box-shadow:none;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skToc .lb-toc-item.active{background:linear-gradient(135deg,rgba(124,58,237,.36),rgba(30,64,175,.24));border-color:rgba(196,181,253,.7);box-shadow:0 0 0 1px rgba(196,181,253,.16),0 12px 28px rgba(124,58,237,.18);}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skToc .lb-toc-item span{display:block;margin-bottom:5px;color:#c4b5fd;font-size:.7rem;letter-spacing:.08em;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skToc .lb-toc-item strong{display:block;color:#f7f1ff;font-size:.9rem;line-height:1.35;word-break:keep-all;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skChapterContent{grid-area:content;min-height:0;overflow-y:auto;padding:26px 34px 36px;background:linear-gradient(180deg,rgba(255,255,255,.018),rgba(255,255,255,0));}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skChapterContent>.lb-chapter-card{max-width:820px;margin:0 auto;border-radius:8px!important;background:rgba(10,5,22,.52)!important;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skChapterContent .lb-sub-card{border-radius:8px!important;background:rgba(255,255,255,.035)!important;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .lb-result__actions{grid-area:actions;position:static!important;bottom:auto!important;display:flex!important;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px;margin:0!important;padding:0!important;border:0!important;background:transparent!important;backdrop-filter:none!important;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open .lb-result__actions .lb-result__pdf-btn,#sukuyoBookModal.sukuyo-book-modal--result-open .lb-result__actions .lb-result__close-btn{min-height:42px;border-radius:8px;}',
      '#sukuyoBookModal.sukuyo-book-modal--result-open #skDownloadNotice{display:none!important;}',
      '@media(max-width:820px){#sukuyoBookModal.sukuyo-book-modal--result-open #skResultScreen{grid-template-columns:1fr!important;grid-template-rows:auto auto auto minmax(0,1fr)!important;grid-template-areas:"header" "notice" "toc" "content"!important;}#sukuyoBookModal.sukuyo-book-modal--result-open .lb-result__header{grid-template-columns:42px minmax(0,1fr)!important;grid-template-rows:auto auto auto!important;grid-template-areas:"symbol title" "symbol meta" "actions actions"!important;padding:18px 16px 14px!important;}#sukuyoBookModal.sukuyo-book-modal--result-open .lb-result__actions{justify-content:flex-start!important;margin-top:12px!important;}#sukuyoBookModal.sukuyo-book-modal--result-open #skCompletionNotice.sk-result-status{padding:11px 16px!important;}#sukuyoBookModal.sukuyo-book-modal--result-open #skToc{flex-direction:row!important;overflow-x:auto!important;overflow-y:hidden!important;padding:12px 14px!important;border-right:0!important;border-bottom:1px solid rgba(167,139,250,.18)!important;white-space:nowrap!important;}#sukuyoBookModal.sukuyo-book-modal--result-open #skToc .lb-toc-item{min-width:178px;width:auto!important;}#sukuyoBookModal.sukuyo-book-modal--result-open #skChapterContent{padding:18px 14px 28px!important;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function _detachFloatingElement(element) {
    if (!element || element.parentNode === document.body) return;
    document.body.appendChild(element);
  }

  function _ensureSukuyoErrorWindow() {
    _ensureFloatingWindowStyle();
    var element = _qs('skErrorWindow');
    if (element) return element;
    element = document.createElement('div');
    element.id = 'skErrorWindow';
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    element.setAttribute('aria-hidden', 'true');
    element.style.display = 'none';
    element.innerHTML = [
      '<div class="sk-error-window__scrim" data-action="closeSukuyoErrorWindow"></div>',
      '<div class="sk-error-window__panel">',
      '<div class="sk-error-window__orb" aria-hidden="true">!</div>',
      '<p class="sk-error-window__eyebrow">MOONLIGHT PAUSE</p>',
      '<h3 class="sk-error-window__title" id="skErrorWindowTitle">생성 중 오류가 발생했습니다</h3>',
      '<p class="sk-error-window__msg" id="skErrorWindowMsg">잠시 후 다시 시도해 주세요.</p>',
      '<div class="sk-error-window__actions">',
      '<button type="button" class="sk-error-window__btn sk-error-window__btn--primary" data-action="retrySukuyoBook">다시 시도</button>',
      '<button type="button" class="sk-error-window__btn" data-action="closeSukuyoErrorWindow">닫기</button>',
      '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(element);
    return element;
  }

  function _ensureSukuyoGenerationWindow() {
    _ensureFloatingWindowStyle();
    var element = _qs('skGenerationWindow');
    if (element) return element;
    element = document.createElement('div');
    element.id = 'skGenerationWindow';
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    element.setAttribute('aria-hidden', 'true');
    element.style.display = 'none';
    element.innerHTML = [
      '<div class="sk-generation-window__panel">',
      '<div class="sk-generation-window__orb" aria-hidden="true">PDF</div>',
      '<p class="sk-generation-window__eyebrow">MOONLIGHT PDF</p>',
      '<h3 class="sk-generation-window__title" id="skGenerationTitle">숙요점 궁합 PDF 생성 중</h3>',
      '<div class="sk-generation-window__chapter">',
      '<span id="skGenerationChapterNum">준비 중</span>',
      '<p id="skGenerationChapter">두 사람의 달빛 기준을 맞추고 있습니다.</p>',
      '</div>',
      '<div class="sk-generation-window__bar" aria-hidden="true"><i id="skGenerationProgressBar"></i></div>',
      '<p class="sk-generation-window__progress" id="skGenerationProgressText">0 / 15</p>',
      '<p class="sk-generation-window__notice" id="skGenerationNotice">완성된 PDF 저장본이 확인될 때까지 창을 열어 둡니다.</p>',
      '</div>'
    ].join('');
    document.body.appendChild(element);
    return element;
  }

  function _setSukuyoErrorWindowVisible(visible, message) {
    var element = _ensureSukuyoErrorWindow();
    var msg = _qs('skErrorWindowMsg');
    if (msg && message !== undefined) msg.textContent = _sanitizeText(message) || '잠시 후 다시 시도해 주세요.';
    if (visible) _setGenerationWindowVisible(false);
    element.style.display = visible ? 'flex' : 'none';
    try { element.setAttribute('aria-hidden', visible ? 'false' : 'true'); } catch (_) {}
  }

  function _setGenerationWindowVisible(visible) {
    var element = visible ? _ensureSukuyoGenerationWindow() : _qs('skGenerationWindow');
    if (!element) return;
    _ensureFloatingWindowStyle();
    element.classList.add('sk-floating-window');
    _detachFloatingElement(element);
    if (visible) {
      var errorWindow = _qs('skErrorWindow');
      if (errorWindow) {
        errorWindow.style.display = 'none';
        try { errorWindow.setAttribute('aria-hidden', 'true'); } catch (_) {}
      }
    }
    element.style.display = visible ? 'flex' : 'none';
    element.style.position = 'fixed';
    element.style.inset = '0';
    try { element.setAttribute('aria-hidden', visible ? 'false' : 'true'); } catch (_) {}
  }

  function _hideSukuyoFloatingWindows() {
    ['skGenerationWindow', 'skErrorWindow'].forEach(function (id) {
      var element = _qs(id);
      if (!element) return;
      element.style.display = 'none';
      try { element.setAttribute('aria-hidden', 'true'); } catch (_) {}
    });
  }

  function _syncGenerationWindowProgress(step, total, title) {
    var normalizedStep = Math.max(0, Math.min(total, Number(step) || 0));
    var pct = Math.max(0, Math.min(100, Math.round((normalizedStep / Math.max(total, 1)) * 100)));
    var bar = _qs('skGenerationProgressBar');
    var text = _qs('skGenerationProgressText');
    var number = _qs('skGenerationChapterNum');
    var chapter = _qs('skGenerationChapter');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = normalizedStep <= 0 ? ('0 / ' + total) : (normalizedStep + ' / ' + total);
    if (number) number.textContent = normalizedStep <= 0 ? '준비 중' : (normalizedStep >= total ? 'PDF 저장 확인' : ('제' + normalizedStep + '장'));
    if (chapter) chapter.textContent = _sanitizeText(title || '');
  }

  function _buildApiCandidates(pathname) {
    var path = String(pathname || '');
    if (path.charAt(0) !== '/') path = '/' + path;
    var isLocal = false;
    var queryApiBase = '';
    try {
      isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(String(window.location && window.location.hostname || ''));
      var params = new URLSearchParams(window.location && window.location.search || '');
      queryApiBase = params.get('api') || params.get('apiBase') || params.get('cdApiBase') || '';
    } catch (_) {}
    var bases = [
      queryApiBase,
      window.CODE_DESTINY_API_BASE_URL || '',
      window.__CD_API_BASE_URL || '',
      window.__API_BASE_URL || '',
      window.__AUTH_API_BASE_URL || '',
    ];
    if (isLocal) {
      bases.push('http://localhost:4000');
      bases.push('http://127.0.0.1:4000');
    }
    bases.push('');
    bases.push(window.location && window.location.origin || '');
    var seen = {};
    var out = [];
    bases.forEach(function (base) {
      var cleanBase = String(base || '').trim();
      var url = cleanBase ? cleanBase.replace(/\/+$/, '') + path : path;
      if (!seen[url]) { seen[url] = true; out.push(url); }
    });
    return out;
  }

  function _resolveSukuyoApiUrl(url) {
    var value = _clean(url);
    if (!value || !/^\/api\//.test(value)) return value;
    var candidates = _buildApiCandidates(value);
    return candidates[0] || value;
  }

  function _buildQueryString(params) {
    var parts = [];
    Object.keys(params || {}).forEach(function (key) {
      var value = _clean(params[key]);
      if (value) parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    });
    return parts.length ? ('?' + parts.join('&')) : '';
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
      var maleEl = _qs('genderMale');
      if (!birthDateEl || !birthDateEl.value) return null;
      var normalizedDate = _normalizeBirthDateInput(birthDateEl.value);
      var parts = normalizedDate ? normalizedDate.split('-') : [];
      var year = _num(parts[0], NaN);
      var month = _num(parts[1], NaN);
      var day = _num(parts[2], NaN);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      var rawHour = hourEl && _clean(hourEl.value) !== '' ? _num(hourEl.value, NaN) : NaN;
      var rawMinute = minuteEl && _clean(minuteEl.value) !== '' ? _num(minuteEl.value, 0) : 0;
      return {
        name: _clean(nameEl && nameEl.value) || '사용자',
        gender: femaleEl && femaleEl.checked ? 'female' : (maleEl && maleEl.checked ? 'male' : 'unknown'),
        birth: { year: year, month: month, day: day, hour: Number.isFinite(rawHour) ? rawHour : null, minute: Number.isFinite(rawHour) ? rawMinute : null },
        calendarType: 'solar',
      };
    } catch (_) {
      return null;
    }
  }

  function _resolveSelfGender() {
    var f = _qs('skSelfGenderF');
    var m = _qs('skSelfGenderM');
    if (m && (m.classList.contains('on') || m.getAttribute('aria-pressed') === 'true')) return 'male';
    if (f && (f.classList.contains('on') || f.getAttribute('aria-pressed') === 'true')) return 'female';
    return 'unknown';
  }

  function _getSelectedSelfCalendarType() {
    var selected = document.querySelector('input[name="skSelfCalType"]:checked');
    return selected ? _normalizeCalendarType(selected.value) : 'solar';
  }

  function _readBoundedNumberInput(id, min, max, digits, required) {
    var el = _qs(id);
    var raw = _clean(el && el.value).replace(/\D/g, '');
    if (raw.length > digits) raw = raw.slice(-digits);
    if (el && el.value !== raw) el.value = raw;
    if (!raw) {
      return required ? { ok: false, value: null, empty: true } : { ok: true, value: null, empty: true };
    }
    var value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max) {
      return { ok: false, value: value, empty: false };
    }
    return { ok: true, value: value, empty: false };
  }

  function _pad2(value) {
    return String(value).padStart(2, '0');
  }

  function _readSplitBirthDate(prefix) {
    var year = _readBoundedNumberInput(prefix + 'BirthYear', 1900, 2100, 4, true);
    var month = _readBoundedNumberInput(prefix + 'BirthMonth', 1, 12, 2, true);
    var day = _readBoundedNumberInput(prefix + 'BirthDay', 1, 31, 2, true);
    var ok = year.ok && month.ok && day.ok && !year.empty && !month.empty && !day.empty;
    return {
      ok: ok,
      year: year.value,
      month: month.value,
      day: day.value,
      birthDate: ok ? String(year.value).padStart(4, '0') + '-' + _pad2(month.value) + '-' + _pad2(day.value) : '',
      birthInput: ok ? { year: year.value, month: month.value, day: day.value } : null,
    };
  }

  function _readSplitBirthTime(prefix) {
    var hourEl = _qs(prefix + 'BirthHour');
    var minuteEl = _qs(prefix + 'BirthMinute');
    var hourRaw = _clean(hourEl && hourEl.value);
    var minuteRaw = _clean(minuteEl && minuteEl.value);
    if (!hourRaw && !minuteRaw) {
      return {
        ok: true,
        birthTime: '',
        birthHour: null,
        birthMinute: null,
        isTimeUnknown: true,
        birthInput: { hour: null, minute: null },
      };
    }
    var hour = _readBoundedNumberInput(prefix + 'BirthHour', 0, 23, 2, true);
    var minute = _readBoundedNumberInput(prefix + 'BirthMinute', 0, 59, 2, false);
    var minuteValue = minute.empty ? 0 : minute.value;
    var ok = hour.ok && !hour.empty && minute.ok;
    return {
      ok: ok,
      birthTime: ok ? _pad2(hour.value) + ':' + _pad2(minuteValue) : '',
      birthHour: ok ? hour.value : null,
      birthMinute: ok ? minuteValue : null,
      isTimeUnknown: !ok,
      birthInput: { hour: ok ? hour.value : null, minute: ok ? minuteValue : null },
    };
  }

  function _setSplitBirthDate(prefix, birth) {
    birth = birth || {};
    var y = _qs(prefix + 'BirthYear');
    var m = _qs(prefix + 'BirthMonth');
    var d = _qs(prefix + 'BirthDay');
    if (y && Number.isFinite(_profileNum(birth.year, NaN))) y.value = String(_profileNum(birth.year, 0)).padStart(4, '0');
    if (m && Number.isFinite(_profileNum(birth.month, NaN))) m.value = _pad2(_profileNum(birth.month, 0));
    if (d && Number.isFinite(_profileNum(birth.day, NaN))) d.value = _pad2(_profileNum(birth.day, 0));
  }

  function _setSplitBirthTime(prefix, birth) {
    birth = birth || {};
    var h = _qs(prefix + 'BirthHour');
    var m = _qs(prefix + 'BirthMinute');
    var hour = _profileNum(birth.hour, NaN);
    var minute = _profileNum(birth.minute, 0);
    if (Number.isFinite(hour)) {
      if (h) h.value = _pad2(hour);
      if (m) m.value = _pad2(minute);
    } else {
      if (h) h.value = '';
      if (m) m.value = '';
    }
  }

  function _splitErrorId(inputId) {
    if (/Birth(?:Year|Month|Day)$/.test(inputId)) {
      return inputId.indexOf('skSelf') === 0 ? 'skSelfBirthDateError' : 'skPartnerBirthDateError';
    }
    if (/Birth(?:Hour|Minute)$/.test(inputId)) {
      return inputId.indexOf('skSelf') === 0 ? 'skSelfBirthTimeTextError' : 'skPartnerBirthTimeTextError';
    }
    return '';
  }

  function _setSplitInputError(input, message) {
    if (!input) return;
    input.classList.add('is-error', 'sk-number-inp--invalid');
    var errorEl = _qs(_splitErrorId(input.id));
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = '';
    }
  }

  function _clearSplitInputError(input) {
    if (!input) return;
    input.classList.remove('is-error', 'sk-number-inp--invalid');
    var group = input.closest('[data-sk-input-group]');
    if (group && !group.querySelector('.sk-number-inp--invalid')) {
      var errorEl = _qs(_splitErrorId(input.id));
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
    }
  }

  function _nextSplitInputId(inputId) {
    var order = ['BirthYear', 'BirthMonth', 'BirthDay', 'BirthHour', 'BirthMinute'];
    var prefix = inputId.indexOf('skSelf') === 0 ? 'skSelf' : 'skPartner';
    var suffix = inputId.replace(prefix, '');
    var idx = order.indexOf(suffix);
    if (idx < 0 || idx >= order.length - 1) return '';
    return prefix + order[idx + 1];
  }

  function _handleSplitNumberInput(input) {
    if (!input || !/^sk(?:Self|Partner)Birth(?:Year|Month|Day|Hour|Minute)$/.test(input.id || '')) return false;
    var raw = _clean(input.value).replace(/\D/g, '');
    var maxDigits = input.id.indexOf('BirthYear') >= 0 ? 4 : 2;
    if (raw.length > maxDigits) raw = raw.slice(-maxDigits);
    if (input.value !== raw) input.value = raw;

    var value = raw ? Number(raw) : NaN;
    var min = Number(input.getAttribute('min'));
    var max = Number(input.getAttribute('max'));
    var label = '';
    if (input.id.indexOf('BirthYear') >= 0) label = _sukuyoBookText('input.yearRange');
    if (input.id.indexOf('BirthMonth') >= 0) label = _sukuyoBookText('input.monthRange');
    if (input.id.indexOf('BirthDay') >= 0) label = _sukuyoBookText('input.dayRange');
    if (input.id.indexOf('BirthHour') >= 0) label = _sukuyoBookText('input.hourRange');
    if (input.id.indexOf('BirthMinute') >= 0) label = _sukuyoBookText('input.minuteRange');

    if (raw && Number.isFinite(value) && Number.isFinite(min) && Number.isFinite(max) && (value < min || value > max)) {
      _setSplitInputError(input, label);
      return true;
    }
    _clearSplitInputError(input);

    var shouldAdvance = false;
    if (input.id.indexOf('BirthYear') >= 0) shouldAdvance = raw.length === 4;
    else if (input.id.indexOf('BirthMonth') >= 0) shouldAdvance = raw.length === 2 || (raw.length === 1 && value >= 2 && value <= 9);
    else if (input.id.indexOf('BirthDay') >= 0) shouldAdvance = raw.length === 2 || (raw.length === 1 && value >= 4 && value <= 9);
    else if (input.id.indexOf('BirthHour') >= 0) shouldAdvance = raw.length === 2 || (raw.length === 1 && value >= 3 && value <= 9);
    if (shouldAdvance) {
      var next = _qs(_nextSplitInputId(input.id));
      if (next && !next.disabled && typeof next.focus === 'function') next.focus();
    }
    return true;
  }

  function _recoverBirthFromSukuyoForm() {
    try {
      var splitDate = _readSplitBirthDate('skSelf');
      if (splitDate.ok) {
        var splitTime = _readSplitBirthTime('skSelf');
        var splitNameEl = _qs('skSelfName');
        return {
          name: _clean(splitNameEl && splitNameEl.value) || '사용자',
          gender: _resolveSelfGender(),
          birth: {
            year: splitDate.year,
            month: splitDate.month,
            day: splitDate.day,
            hour: splitTime.birthHour,
            minute: splitTime.birthMinute,
          },
          calendarType: _getSelectedSelfCalendarType(),
        };
      }
      var birthDateEl = _qs('skSelfBirthDate');
      if (!birthDateEl || !birthDateEl.value) return null;

      var normalizedDate = _normalizeBirthDateInput(birthDateEl.value);
      var parts = normalizedDate ? normalizedDate.split('-') : [];
      var year = _num(parts[0], NaN);
      var month = _num(parts[1], NaN);
      var day = _num(parts[2], NaN);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

      var hourEl = _qs('skSelfHour');
      var minuteEl = _qs('skSelfMinute');
      var birthTimeTextEl = _qs('skSelfBirthTimeText');
      var timeUnknownEl = _qs('skSelfTimeUnknown');
      var nameEl = _qs('skSelfName');
      var rawTime = '';

      if (timeUnknownEl && timeUnknownEl.checked) {
        rawTime = 'unknown';
      } else if (birthTimeTextEl && _clean(birthTimeTextEl.value)) {
        rawTime = _clean(birthTimeTextEl.value);
      } else if (hourEl && _clean(hourEl.value) !== '') {
        rawTime = String(_num(hourEl.value, 0)).padStart(2, '0') + ':' + String(_num(minuteEl && minuteEl.value, 0)).padStart(2, '0');
      }

      var parsed = _parseTimeLoose(rawTime);
      return {
        name: _clean(nameEl && nameEl.value) || '사용자',
        gender: _resolveSelfGender(),
        birth: { year: year, month: month, day: day, hour: parsed.birthHour, minute: parsed.birthMinute },
        calendarType: _getSelectedSelfCalendarType(),
      };
    } catch (_) {
      return null;
    }
  }

  function _getActiveBirthProfile() {
    var fromSukuyoForm = _normalizeSukuyoProfile(_recoverBirthFromSukuyoForm());
    if (fromSukuyoForm) return fromSukuyoForm;
    var profile = _normalizeSukuyoProfile(window.__cdActiveBirthProfile);
    if (profile) return profile;
    var snap = _normalizeSukuyoProfile(window.__destinyFlowerSajuSnapshot);
    if (snap) return snap;
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return _normalizeSukuyoProfile(fromDom) || fromDom;
    try {
      var match = _normalizeSukuyoProfile((typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
        || window.__cdCurrentDestinyProfile
        || null);
      if (match) return match;
    } catch (_) {}
    return null;
  }

  function _setGenderToggle(prefix, gender) {
    var normalized = _normalizeGender(gender);
    var female = _qs(prefix + 'GenderF');
    var male = _qs(prefix + 'GenderM');
    if (male) male.classList.toggle('on', normalized === 'male');
    if (female) female.classList.toggle('on', normalized === 'female');
    _syncGenderAria(prefix);
  }

  function _syncGenderAria(prefix) {
    var female = _qs(prefix + 'GenderF');
    var male = _qs(prefix + 'GenderM');
    if (male) male.setAttribute('aria-pressed', male.classList.contains('on') ? 'true' : 'false');
    if (female) female.setAttribute('aria-pressed', female.classList.contains('on') ? 'true' : 'false');
  }

  function _syncTimeUnknownControls(prefix) {
    var timeUnknownEl = _qs(prefix + 'TimeUnknown');
    var isUnknown = !!(timeUnknownEl && timeUnknownEl.checked);
    var hourEl = _qs(prefix + 'BirthHour') || _qs(prefix + 'Hour');
    var minuteEl = _qs(prefix + 'BirthMinute') || _qs(prefix + 'Minute');
    var textEl = _qs(prefix + 'BirthTimeText');
    if (hourEl) hourEl.disabled = isUnknown;
    if (minuteEl) minuteEl.disabled = isUnknown;
    if (textEl) textEl.disabled = isUnknown;
    if (isUnknown) {
      if (hourEl) hourEl.value = '';
      if (minuteEl) minuteEl.value = '';
      _clearFieldError(prefix + 'BirthTimeText');
    }
  }

  function _setCompatibilityFormEnabled(enabled) {
    var section = _qs('skPartnerFormSection');
    if (!section) return;
    section.classList.toggle('is-disabled', !enabled);
    section.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    Array.prototype.forEach.call(section.querySelectorAll('input, select, button'), function (control) {
      control.disabled = !enabled;
    });
    if (enabled) _syncTimeUnknownControls('skPartner');
  }

  function _fillSelfFormFromProfile(profile) {
    if (!profile || !profile.birth) return;
    var birth = profile.birth || {};
    var dateEl = _qs('skSelfBirthDate');
    var nameEl = _qs('skSelfName');
    var hourEl = _qs('skSelfHour');
    var minuteEl = _qs('skSelfMinute');
    var splitHourEl = _qs('skSelfBirthHour');
    var splitMinuteEl = _qs('skSelfBirthMinute');
    var textEl = _qs('skSelfBirthTimeText');
    var timeUnknownEl = _qs('skSelfTimeUnknown');
    var calendarType = _normalizeCalendarType(profile.calendarType || 'solar');
    var y = _profileNum(birth.year, NaN);
    var m = _profileNum(birth.month, NaN);
    var d = _profileNum(birth.day, NaN);
    var hour = _profileNum(birth.hour, NaN);
    var minute = _profileNum(birth.minute, 0);
    if (nameEl && !_clean(nameEl.value)) nameEl.value = _clean(profile.name) || '사용자';
    if (dateEl && Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      dateEl.value = [String(y).padStart(4, '0'), String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('');
    }
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      _setSplitBirthDate('skSelf', birth);
      _clearFieldError('skSelfBirthDate');
    }
    Array.prototype.forEach.call(document.querySelectorAll('input[name="skSelfCalType"]'), function (input) {
      input.checked = _normalizeCalendarType(input.value) === calendarType;
    });
    _setGenderToggle('skSelf', profile.gender);
    _clearFieldError('skSelfGender');
    if (Number.isFinite(hour)) {
      _setSplitBirthTime('skSelf', birth);
      if (hourEl) hourEl.value = String(hour);
      if (minuteEl) minuteEl.value = String(minute);
      if (splitHourEl) splitHourEl.value = _pad2(hour);
      if (splitMinuteEl) splitMinuteEl.value = _pad2(minute);
      if (textEl && !_clean(textEl.value)) textEl.value = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
      if (timeUnknownEl) timeUnknownEl.checked = false;
    } else {
      _setSplitBirthTime('skSelf', {});
      if (timeUnknownEl) timeUnknownEl.checked = true;
    }
    _syncTimeUnknownControls('skSelf');
  }

  function _normalizeGender(raw) {
    var token = _clean(raw).toLowerCase();
    if (token === 'f' || token === 'female' || token === 'woman' || token === '여성' || token === '여자' || token === '여') return 'female';
    if (token === 'm' || token === 'male' || token === 'man' || token === '남성' || token === '남자' || token === '남') return 'male';
    return 'unknown';
  }

  function _normalizeCalendarType(raw) {
    var token = _clean(raw).toLowerCase();
    if (token.indexOf('lunar_leap') >= 0 || token.indexOf('lunar-leap') >= 0 || token.indexOf('leap') >= 0 || token.indexOf('\uc724') >= 0) return 'lunar_leap';
    if (token.indexOf('solar') >= 0 || token.indexOf('양') >= 0) return 'solar';
    if (token.indexOf('lunar') >= 0 || token.indexOf('음') >= 0) return 'lunar';
    return 'unknown';
  }

  function _parseDateParts(raw) {
    var value = _normalizeBirthDateInput(raw);
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
    profile = _normalizeSukuyoProfile(profile) || profile || {};
    var birth = profile && profile.birth || {};
    var birthHour = _profileNum(birth.hour, NaN);
    var birthMinute = _profileNum(birth.minute, 0);
    var hasKnownTime = Number.isFinite(birthHour);
    var birthDate = [String(_profileNum(birth.year, 0)).padStart(4, '0'), String(_profileNum(birth.month, 0)).padStart(2, '0'), String(_profileNum(birth.day, 0)).padStart(2, '0')].join('-');
    var birthTime = hasKnownTime ? [String(birthHour).padStart(2, '0'), String(birthMinute).padStart(2, '0')].join(':') : '';
    return {
      name: _clean(profile && profile.name) || '사용자',
      gender: _normalizeGender(_clean(profile && profile.gender)),
      calendarType: _normalizeCalendarType(_clean(profile && profile.calendarType) || 'solar'),
      birthDate: birthDate,
      birthYear: _num(birth.year, null),
      birthMonth: _num(birth.month, null),
      birthDay: _num(birth.day, null),
      birthTime: birthTime,
      birthHour: hasKnownTime ? birthHour : null,
      birthMinute: hasKnownTime ? birthMinute : null,
      timezone: 'Asia/Seoul',
      isTimeUnknown: !hasKnownTime,
    };
  }

  function _resolvePartnerGender() {
    var selected = document.querySelector('input[name="skPartnerGender"]:checked');
    if (selected) return _normalizeGender(selected.value);
    var f = _qs('skPartnerGenderF');
    var m = _qs('skPartnerGenderM');
    if (m && (m.classList.contains('on') || m.getAttribute('aria-pressed') === 'true')) return 'male';
    if (f && (f.classList.contains('on') || f.getAttribute('aria-pressed') === 'true')) return 'female';
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

    var birthDate = _normalizeBirthDateInput(birthDateEl && birthDateEl.value);
    var isTimeUnknownChecked = !!(timeUnknownEl && timeUnknownEl.checked);

    var freeText = _clean(birthTimeTextEl && birthTimeTextEl.value);
    var selectTime = '';
    if (hourEl && _clean(hourEl.value) !== '') {
      var selectedHour = _num(hourEl.value, NaN);
      if (Number.isFinite(selectedHour)) {
        selectTime = String(selectedHour).padStart(2, '0') + ':' + String(_num(minuteEl && minuteEl.value, 0)).padStart(2, '0');
      }
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

  function _getPartnerInputV2() {
    var nameEl = _qs('skPartnerName');
    var legacyBirthDateEl = _qs('skPartnerBirthDate');
    var legacyBirthTimeEl = _qs('skPartnerBirthTimeText');
    var timeUnknownEl = _qs('skPartnerTimeUnknown');
    var splitDate = _readSplitBirthDate('skPartner');
    var birthDate = splitDate.ok ? splitDate.birthDate : _normalizeBirthDateInput(legacyBirthDateEl && legacyBirthDateEl.value);
    var splitTime = (timeUnknownEl && timeUnknownEl.checked)
      ? {
        ok: true,
        birthTime: '',
        birthHour: null,
        birthMinute: null,
        isTimeUnknown: true,
        birthInput: { hour: null, minute: null },
      }
      : _readSplitBirthTime('skPartner');
    var parsed = splitTime.ok ? splitTime : _parseTimeLoose(_clean(legacyBirthTimeEl && legacyBirthTimeEl.value));
    return {
      name: _clean(nameEl && nameEl.value) || '상대방',
      gender: _resolvePartnerGender(),
      calendarType: _getSelectedPartnerCalendarType(),
      birthDate: birthDate,
      birthYear: splitDate.ok ? splitDate.year : null,
      birthMonth: splitDate.ok ? splitDate.month : null,
      birthDay: splitDate.ok ? splitDate.day : null,
      birthTime: parsed.birthTime,
      birthHour: parsed.birthHour,
      birthMinute: parsed.birthMinute,
      timezone: 'Asia/Seoul',
      isTimeUnknown: parsed.isTimeUnknown,
      birthInput: {
        year: splitDate.ok ? splitDate.year : null,
        month: splitDate.ok ? splitDate.month : null,
        day: splitDate.ok ? splitDate.day : null,
        hour: parsed.birthHour,
        minute: parsed.birthMinute,
      },
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
      self.birthInput = {
        year: sDate.y,
        month: sDate.m,
        day: sDate.d,
        hour: self.birthHour,
        minute: self.birthMinute,
      };
    }
    if (pDate) {
      partnerInput.birthYear = pDate.y;
      partnerInput.birthMonth = pDate.m;
      partnerInput.birthDay = pDate.d;
      partnerInput.birthInput = Object.assign({}, partnerInput.birthInput || {}, {
        year: pDate.y,
        month: pDate.m,
        day: pDate.d,
        hour: partnerInput.birthHour,
        minute: partnerInput.birthMinute,
      });
    }

    return {
      mode: 'compatibility',
      self: self,
      partner: partnerInput,
    };
  }

  function _validateBeforePayment(input) {
    var errors = [];
    var fieldErrors = {};
    if (!input || input.mode !== 'compatibility') errors.push('mode');

    var selfDate = _parseDateParts(input && input.self && input.self.birthDate);
    var partnerDate = _parseDateParts(input && input.partner && input.partner.birthDate);

    if (!selfDate) {
      errors.push('self.birthDate');
      fieldErrors.skSelfBirthDate = '나의 생년월일을 정확히 입력해 주세요.';
    }
    if (!partnerDate) {
      errors.push('partner.birthDate');
      fieldErrors.skPartnerBirthDate = '상대방 생년월일을 정확히 입력해 주세요.';
    }
    if (_normalizeGender(input && input.self && input.self.gender) === 'unknown') {
      errors.push('self.gender');
      fieldErrors.skSelfGender = '나의 성별을 남자 또는 여자로 선택해 주세요.';
    }
    if (_normalizeGender(input && input.partner && input.partner.gender) === 'unknown') {
      errors.push('partner.gender');
      fieldErrors.skPartnerGender = '상대방 성별을 남자 또는 여자로 선택해 주세요.';
    }

    return {
      ok: errors.length === 0,
      errors: errors,
      fieldErrors: fieldErrors,
      selfBirthDateReady: !!selfDate,
      partnerBirthDateReady: !!partnerDate,
    };
  }

  function _calendarLabel(value) {
    var normalized = _normalizeCalendarType(value);
    if (normalized === 'lunar') return '음력 평달';
    if (normalized === 'lunar_leap') return '음력 윤달';
    return '양력';
  }

  function _genderLabel(value) {
    var gender = _normalizeGender(value);
    if (gender === 'female') return '여자';
    if (gender === 'male') return '남자';
    return '성별 미확인';
  }

  function _timeLabel(person) {
    if (!person) return '시간 확인 전';
    if (person.isTimeUnknown) return '시간 모름';
    var time = _clean(person.birthTime);
    if (time) return time;
    if (Number.isFinite(_num(person.birthHour, NaN))) {
      return String(_num(person.birthHour, 0)).padStart(2, '0') + ':' + String(_num(person.birthMinute, 0)).padStart(2, '0');
    }
    return '시간 미입력';
  }

  function _readinessPersonLine(person, fallbackName) {
    var name = _clean(person && person.name) || fallbackName;
    var date = _clean(person && person.birthDate) || '생년월일 확인 전';
    if (date === '0000-00-00') date = '생년월일 확인 전';
    return name + ' · ' + date + ' · ' + _calendarLabel(person && person.calendarType) + ' · ' + _genderLabel(person && person.gender) + ' · ' + _timeLabel(person);
  }

  function _renderReadinessPanel(input, check, state, preflight) {
    var panel = _qs('skReadinessPanel');
    if (!panel) return;
    var statusEl = _qs('skReadinessStatus');
    var selfEl = _qs('skReadinessSelf');
    var partnerEl = _qs('skReadinessPartner');
    var qualityEl = _qs('skReadinessQuality');
    var noticeEl = _qs('skReadinessNotice');
    var safeInput = input || {};
    var safeCheck = check || _validateBeforePayment(safeInput);
    var dryRun = preflight && preflight.dryRun ? preflight.dryRun : {};
    var verified = dryRun.selfStarReady && dryRun.partnerStarReady;
    var hasUnknownTime = !!(safeInput.self && safeInput.self.isTimeUnknown) || !!(safeInput.partner && safeInput.partner.isTimeUnknown);
    var invalidMessage = _readinessInvalidMessage(safeCheck);

    if (selfEl) selfEl.textContent = _readinessPersonLine(safeInput.self, '나');
    if (partnerEl) partnerEl.textContent = _readinessPersonLine(safeInput.partner, '상대방');
    if (qualityEl) {
      qualityEl.textContent = verified
        ? '두 본명숙이 맞닿음 · 15장 인연문 개방'
        : safeCheck.ok
          ? '달빛 기준 정렬 완료 · 결제 문턱 대기'
          : '생년월일·성별의 빈자리 보완 필요';
    }
    if (statusEl) {
      statusEl.textContent = state === 'verified'
        ? '두 사람의 달빛 기준이 맞닿았습니다. ' + _sukuyoCoinLabel() + '의 문턱을 지나면 15개의 인연 장이 천천히 열려요.'
        : safeCheck.ok
          ? '상대방의 생년월일과 성별이 달의 자리 위에 놓였습니다. 결제 전 27숙의 첫 별자리를 먼저 비춰볼게요.'
          : invalidMessage;
      statusEl.classList.toggle('sk-inline-error', !safeCheck.ok);
    }
    if (noticeEl) {
      noticeEl.textContent = hasUnknownTime
        ? '태어난 시간을 모르면 같은 날짜의 달빛을 중심에 두고, 시간의 안개가 닿는 대목은 조심스러운 문장으로 남겨요.'
        : '49,000원의 전용 의식 안에서 본명숙, 관계의 이름, 서로의 거리와 회복의 리듬이 하나의 상담 흐름으로 이어져요.';
    }
  }

  function _refreshReadinessPanel() {
    var profile = _getActiveBirthProfile();
    var partner = _getPartnerInputV2();
    var normalizedInput = _normalizeCompatibilityInput(profile || {}, partner);
    var check = _validateBeforePayment(normalizedInput);
    _renderReadinessPanel(normalizedInput, check, check.ok ? 'ready' : 'invalid');
  }

  function _readinessInvalidMessage(check) {
    var errors = check && Array.isArray(check.errors) ? check.errors : [];
    var selfMissing = errors.indexOf('self.birthDate') >= 0 || errors.indexOf('self.gender') >= 0;
    var partnerMissing = errors.indexOf('partner.birthDate') >= 0 || errors.indexOf('partner.gender') >= 0;
    if (selfMissing && partnerMissing) return '나와 상대방의 생년월일과 성별을 확인해 주세요.';
    if (selfMissing) return '내 생년월일과 성별을 먼저 확인해 주세요.';
    if (partnerMissing) return '상대방 생년월일과 성별을 먼저 채워 주세요.';
    return '생년월일과 성별을 확인해 주세요.';
  }

  function _focusFirstInputError(fieldErrors) {
    var ids = Object.keys(fieldErrors || {});
    if (!ids.length) return;
    var focusMap = {
      skSelfBirthDate: 'skSelfBirthYear',
      skPartnerBirthDate: 'skPartnerBirthYear',
      skSelfBirthTimeText: 'skSelfBirthHour',
      skPartnerBirthTimeText: 'skPartnerBirthHour',
    };
    var field = _qs(focusMap[ids[0]] || ids[0]);
    if (!field || typeof field.focus !== 'function') return;
    try {
      field.focus({ preventScroll: true });
      if (typeof field.scrollIntoView === 'function') field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
      try { field.focus(); } catch (__) {}
    }
  }

  function _clearInputErrors() {
    Array.prototype.forEach.call(document.querySelectorAll('.sk-field-error'), function (el) {
      el.textContent = '';
      el.style.display = 'none';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.sk-partner-inp'), function (el) {
      el.classList.remove('is-error');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.sk-gender-toggle'), function (el) {
      el.classList.remove('is-error');
    });
  }

  function _setInputError(fieldId, message) {
    var focusMap = {
      skSelfBirthDate: 'skSelfBirthYear',
      skPartnerBirthDate: 'skPartnerBirthYear',
      skSelfBirthTimeText: 'skSelfBirthHour',
      skPartnerBirthTimeText: 'skPartnerBirthHour',
    };
    var field = _qs(focusMap[fieldId] || fieldId);
    if (field && field.classList) field.classList.add('is-error');
    var errorEl = _qs(fieldId + 'Error');
    if (errorEl) {
      errorEl.textContent = '⚠ ' + _sanitizeText(message || '입력값을 확인해 주세요.');
      errorEl.style.display = '';
    }
  }

  function _clearFieldError(fieldId) {
    var focusMap = {
      skSelfBirthDate: 'skSelfBirthYear',
      skPartnerBirthDate: 'skPartnerBirthYear',
      skSelfBirthTimeText: 'skSelfBirthHour',
      skPartnerBirthTimeText: 'skPartnerBirthHour',
    };
    var field = _qs(focusMap[fieldId] || fieldId);
    if (field && field.classList) field.classList.remove('is-error');
    var errorEl = _qs(fieldId + 'Error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  function _renderProfileSummary(profile) {
    var element = _qs('skProfileSummary');
    var manualForm = _qs('skSelfManualForm');
    var selfCard = document.querySelector('#sukuyoBookModal .sk-self-card');
    var wrapper = document.querySelector('#sukuyoBookModal .sk-self-card-wrap');
    if (!element) return;
    if (wrapper) {
      wrapper.hidden = false;
      wrapper.removeAttribute('hidden');
      wrapper.setAttribute('aria-hidden', 'false');
      wrapper.style.display = '';
    }
    if (!profile) {
      element.textContent = '나의 정보를 직접 입력해 주세요.';
      if (manualForm) manualForm.style.display = '';
      if (selfCard) selfCard.style.display = 'none';
      return;
    }
    _fillSelfFormFromProfile(profile);
    element.textContent = '저장된 나의 정보를 불러왔습니다. 필요하면 이번 리포트용으로 수정해 주세요.';
    if (manualForm) manualForm.style.display = '';
    if (selfCard) selfCard.style.display = 'none';
    var birth = profile.birth || {};
    var hasKnownTime = Number.isFinite(_profileNum(birth.hour, NaN));
    var time = hasKnownTime
      ? [String(_profileNum(birth.hour, 0)).padStart(2, '0'), String(_profileNum(birth.minute, 0)).padStart(2, '0')].join(':')
      : '시간 미상';
    var selfName = _qs('skSelfNameValue');
    var selfBirth = _qs('skSelfBirthValue');
    var selfTime = _qs('skSelfTimeValue');
    var selfGender = _qs('skSelfGenderValue');
    if (selfName) selfName.textContent = _clean(profile.name) || '사용자';
    if (selfBirth) selfBirth.textContent = [birth.year, birth.month, birth.day].filter(Boolean).join('-') || '-';
    if (selfTime) selfTime.textContent = time || '시간 미상';
    if (selfGender) selfGender.textContent = _genderLabel(profile.gender);
  }

  function _withSukuyoArchiveFormat(url, format) {
    var value = _clean(url);
    var targetFormat = _clean(format) || 'pdf';
    if (!value || value.indexOf('/api/premium/pdf-archive/') === -1) return value;
    if (/[?&]format=/i.test(value)) {
      return value.replace(/([?&]format=)[^&]+/i, '$1' + encodeURIComponent(targetFormat));
    }
    return value + (value.indexOf('?') >= 0 ? '&' : '?') + 'format=' + encodeURIComponent(targetFormat);
  }

  function _buildSukuyoArchiveUrl(reportId, format) {
    var id = _clean(reportId);
    if (!id) return '';
    return _withSukuyoArchiveFormat('/api/premium/pdf-archive/' + encodeURIComponent(id), format || 'pdf');
  }

  function _buildSukuyoAuthHeaders() {
    var headers = {};
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    if (premiumToken) headers['x-premium-access-token'] = premiumToken;
    return headers;
  }

  function _readSukuyoBlobPrefix(blob, length) {
    var part = blob && typeof blob.slice === 'function' ? blob.slice(0, length || 5) : blob;
    if (part && typeof part.text === 'function') return part.text();
    return new Promise(function (resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result || '')); };
        reader.onerror = function () { reject(reader.error || new Error('SUKUYO_BLOB_READ_FAILED')); };
        reader.readAsText(part);
      } catch (error) {
        reject(error);
      }
    });
  }

  function _downloadSukuyoBlob(blob, filename) {
    var blobUrl = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename || 'sukyo-premium-report.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { try { URL.revokeObjectURL(blobUrl); } catch (_) {} }, 3000);
  }

  function _downloadSukuyoInlineHtml(ready, reportId) {
    var html = _clean(ready && ready.html);
    if (!html) return false;
    var filename = reportId ? ('sukyo-premium-' + reportId + '.html') : 'sukyo-premium-report.html';
    _downloadSukuyoBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), filename);
    return true;
  }

  function _downloadSukuyoUrlAsBlob(url, filename, expectedFormat) {
    var targetUrl = _resolveSukuyoApiUrl(url);
    if (!targetUrl) return Promise.reject(new Error('SUKUYO_DOWNLOAD_URL_MISSING'));
    return fetch(targetUrl, {
      method: 'GET',
      headers: _buildSukuyoAuthHeaders(),
      credentials: 'include',
      cache: 'no-store',
    })
      .then(function (res) {
        if (!res.ok) {
          return res.text().catch(function () { return ''; }).then(function (text) {
            var error = new Error(text || ('SUKUYO_DOWNLOAD_HTTP_' + res.status));
            error.status = res.status;
            throw error;
          });
        }
        var contentType = _clean(res.headers && res.headers.get('content-type')).toLowerCase();
        return res.blob().then(function (blob) {
          return { blob: blob, contentType: contentType };
        });
      })
      .then(function (pack) {
        if (!pack.blob || !pack.blob.size) throw new Error('SUKUYO_DOWNLOAD_EMPTY_BLOB');
        if (pack.contentType.indexOf('application/json') >= 0) throw new Error('SUKUYO_DOWNLOAD_JSON_RESPONSE');
        if (expectedFormat === 'pdf') {
          if (pack.contentType.indexOf('text/plain') >= 0) {
            throw new Error('SUKUYO_DOWNLOAD_NOT_PDF:' + pack.contentType);
          }
          return _readSukuyoBlobPrefix(pack.blob, 5).then(function (magic) {
            if (magic !== '%PDF-') throw new Error('SUKUYO_DOWNLOAD_INVALID_PDF:' + magic);
            _downloadSukuyoBlob(pack.blob, filename);
            return true;
          });
        }
        _downloadSukuyoBlob(pack.blob, filename);
        return true;
      });
  }

  function _resolveSukuyoStoredUrl(payload) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    var nested = p.payload && typeof p.payload === 'object' ? p.payload : {};
    var reportId = _clean(p.reportId || ready.reportId || nested.reportId);
    var archiveUrl = _buildSukuyoArchiveUrl(reportId, 'pdf');
    var archivePending = p.archivePending === true
      || ready.archivePending === true
      || _clean(p.archiveStatus || ready.archiveStatus) === 'pending';
    if (archivePending && _clean(ready.html)) return 'inline:sukuyo-pdf';
    return _clean(
      p.downloadUrl
      || p.pdfUrl
      || p.storedUrl
      || p.reportUrl
      || p.fileUrl
      || p.storageUrl
      || ready.downloadUrl
      || ready.pdfUrl
      || ready.storedUrl
      || ready.reportUrl
      || ready.fileUrl
      || ready.storageUrl
      || nested.downloadUrl
      || nested.pdfUrl
      || nested.htmlUrl
      || p.htmlUrl
      || ready.htmlUrl
      || archiveUrl
    );
  }

  function _isSukuyoArchivePending(payload) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    return p.archivePending === true
      || ready.archivePending === true
      || _clean(p.archiveStatus || ready.archiveStatus) === 'pending';
  }

  function _hasInlineSukuyoHtml(payload) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    return !!_clean(ready.html);
  }

  function _setSukuyoDownloadButtonState(payload) {
    var button = _qs('skPdfBtn') || _qs('skResultPdfBtn');
    if (!button) return;
    var isTemporaryHtml = _isSukuyoArchivePending(payload) && _hasInlineSukuyoHtml(payload);
    button.textContent = isTemporaryHtml ? '📥 HTML 원고 먼저 저장하기' : '📥 PDF 저장하기';
    button.setAttribute('aria-label', isTemporaryHtml ? 'PDF 링크 준비 중, HTML 원고 먼저 저장하기' : '숙요점 궁합 PDF 저장하기');
  }

  function _renderSukuyoCompletionNotice(payload, chapters) {
    var resultScreen = _qs('skResultScreen');
    var toc = _qs('skToc');
    if (!resultScreen || !toc) return;
    var notice = _qs('skCompletionNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'skCompletionNotice';
      resultScreen.insertBefore(notice, toc);
    }
    var count = Array.isArray(chapters) ? chapters.length : 0;
    var isTemporaryHtml = _isSukuyoArchivePending(payload) && _hasInlineSukuyoHtml(payload);
    notice.className = 'sk-result-status';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.innerHTML = ''
      + '<strong class="sk-result-status__title">숙요점 프리미엄 궁합 원고가 완성되었습니다</strong>'
      + '<span class="sk-result-status__body">'
      + (isTemporaryHtml ? 'PDF 저장 링크가 열리는 동안 HTML 원고를 먼저 간직할 수 있습니다.' : '아래 저장 버튼으로 완성된 PDF 원고를 바로 간직할 수 있습니다.')
      + '</span>'
      + '<span class="sk-result-status__badges">'
      + '<b>' + count + '개 챕터</b>'
      + '<b>검증 완료</b>'
      + '<b>' + (isTemporaryHtml ? 'HTML 저장 가능' : 'PDF 저장 가능') + '</b>'
      + '</span>';
  }

  function _splitParagraphs(body) {
    return String(body || '')
      .replace(/\[(핵심 진단|숙요 고수의 정밀 관찰|관계에서 실제로 드러나는 모습|주의해야 할 흐름|실전 처방|대화 예시|7일 실천 루틴|달빛 처방)\]/g, '')
      .split(/\n{2,}/)
      .map(function (p) { return _clean(_sanitizeText(p)); })
      .filter(function (p) { return p.length > 0; });
  }

  function _extractStructuredBlocks(body) {
    return [{ title: '', body: String(body || '') }];
  }

  function _showSukuyoToast(message) {
    var text = _clean(message);
    if (!text) return;
    var toast = document.createElement('div');
    toast.textContent = text;
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '18px';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '999999';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '10px';
    toast.style.border = '1px solid rgba(196,181,253,0.45)';
    toast.style.background = 'rgba(18,10,38,0.94)';
    toast.style.color = '#f5eefe';
    toast.style.fontSize = '12px';
    toast.style.maxWidth = '92vw';
    toast.style.boxShadow = '0 12px 30px rgba(6,4,14,0.45)';
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2600);
  }

  function _applyResultLayout() {
    _ensureFloatingWindowStyle();
    var panel = document.querySelector('#sukuyoBookModal .lb-modal__panel');
    var resultScreen = _qs('skResultScreen');
    var header = document.querySelector('#skResultScreen .lb-result__header');
    var notice = _qs('skCompletionNotice');
    var toc = _qs('skToc');
    var content = _qs('skChapterContent');
    var actions = document.querySelector('#skResultScreen .lb-result__actions');
    var downloadNotice = _qs('skDownloadNotice');

    if (panel) {
      panel.style.width = 'min(1180px, calc(100vw - 28px))';
      panel.style.maxWidth = '1180px';
      panel.style.height = 'calc(100vh - 28px)';
      panel.style.maxHeight = 'calc(100vh - 28px)';
      panel.style.overflow = 'hidden';
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
    }
    if (resultScreen) {
      resultScreen.style.height = '100%';
      resultScreen.style.maxHeight = 'none';
      resultScreen.style.minHeight = '0';
      resultScreen.style.overflow = 'hidden';
      resultScreen.style.display = 'grid';
      resultScreen.style.gridTemplateColumns = 'minmax(236px, 286px) minmax(0, 1fr)';
      resultScreen.style.gridTemplateRows = 'auto auto minmax(0, 1fr)';
      resultScreen.style.gridTemplateAreas = '"header header" "notice notice" "toc content"';
      resultScreen.style.flexDirection = '';
    }
    if (header) {
      header.style.gridArea = 'header';
      header.style.flex = '';
      header.style.padding = '24px 20px 16px';
      header.style.borderBottom = '1px solid rgba(167,139,250,0.22)';
      if (actions && actions.parentNode !== header) header.appendChild(actions);
    }
    if (notice) {
      notice.style.gridArea = 'notice';
    }
    if (toc) {
      toc.style.gridArea = 'toc';
      toc.style.display = 'flex';
      toc.style.flexDirection = 'column';
      toc.style.flexWrap = 'nowrap';
      toc.style.overflowX = 'hidden';
      toc.style.overflowY = 'auto';
      toc.style.whiteSpace = 'normal';
      toc.style.WebkitOverflowScrolling = 'touch';
      toc.style.flex = '0 0 auto';
    }
    if (content) {
      content.style.gridArea = 'content';
      content.style.flex = '';
      content.style.minHeight = '0';
      content.style.maxHeight = 'none';
      content.style.overflowY = 'auto';
      content.style.padding = '26px 34px 36px';
      content.style.display = 'block';
    }
    if (actions) {
      actions.style.gridArea = 'actions';
      actions.style.position = 'static';
      actions.style.bottom = 'auto';
      actions.style.flex = '';
      actions.style.display = 'flex';
      actions.style.justifyContent = 'flex-end';
      actions.style.flexWrap = 'wrap';
      actions.style.gap = '10px';
      actions.style.marginTop = '0';
      actions.style.padding = '0';
      actions.style.background = 'transparent';
      actions.style.backdropFilter = 'none';
      actions.style.borderTop = '0';
      actions.style.zIndex = '2';
    }
    if (downloadNotice) downloadNotice.style.display = 'none';
  }

  function _applySukuyoScreenLayout(screenId) {
    var modal = _qs('sukuyoBookModal');
    var panel = document.querySelector('#sukuyoBookModal .lb-modal__panel');
    var header = document.querySelector('#sukuyoBookModal .lb-modal__header');
    var loadingScreen = _qs('skLoadingScreen');
    var isLoading = screenId === 'skLoadingScreen';
    var isResult = screenId === 'skResultScreen';

    if (modal) {
      modal.classList.toggle('sukuyo-book-modal--generating', isLoading);
      modal.classList.toggle('sukuyo-book-modal--result-open', isResult);
      modal.scrollTop = 0;
    }
    if (header) header.style.display = (isLoading || isResult) ? 'none' : '';
    if (panel) {
      panel.scrollTop = 0;
      panel.style.margin = isLoading ? 'auto' : (isResult ? '14px auto' : '');
      panel.style.width = isLoading ? 'min(520px, calc(100vw - 28px))' : (isResult ? 'min(1180px, calc(100vw - 28px))' : '');
      panel.style.maxWidth = isLoading ? '520px' : (isResult ? '1180px' : '');
      panel.style.height = isResult ? 'calc(100vh - 28px)' : '';
      panel.style.maxHeight = isLoading ? 'calc(100vh - 48px)' : (isResult ? 'calc(100vh - 28px)' : '');
      panel.style.minHeight = isLoading ? 'auto' : (isResult ? '0' : '');
      panel.style.overflow = (isLoading || isResult) ? 'hidden' : '';
      panel.style.display = isResult ? 'flex' : '';
      panel.style.flexDirection = isResult ? 'column' : '';
      if (!isResult) panel.style.padding = '';
    }
    if (loadingScreen) {
      loadingScreen.style.minHeight = isLoading ? 'auto' : '';
      loadingScreen.style.padding = isLoading ? '34px 22px 26px' : '';
    }
  }

  function _renderActiveChapterContent(chapter) {
    var content = _qs('skChapterContent');
    if (!content || !chapter) return;
    var sections = Array.isArray(chapter.sections) ? chapter.sections : [];

    var html = '';
    html += '<section class="lb-chapter-card" style="border:1px solid rgba(167,139,250,0.28);border-radius:18px;background:rgba(10,5,22,0.75);padding:16px;">';
    html += '<h4 class="lb-chapter-title" style="margin:0 0 12px;font-size:1.03rem;color:#fde68a;">제' + Number(chapter.order || 0) + '장. ' + _sanitizeText(_chapterTitleOnly(chapter.title, chapter.order)) + '</h4>';

    sections.forEach(function (section) {
      var blocks = _extractStructuredBlocks(section.body || '');
      html += '<section class="lb-sub-card" style="margin:0 0 14px;padding:14px;border:1px solid rgba(196,181,253,0.22);border-radius:14px;background:rgba(255,255,255,0.04);">';
      html += '<h5 class="lb-sub-title" style="margin:0 0 10px;font-size:0.98rem;font-weight:800;color:#fef3c7;">' + _sanitizeText(section.heading || '') + '</h5>';

      blocks.forEach(function (block) {
        if (_clean(block.title)) {
          html += '<h6 style="margin:8px 0 6px;font-size:0.84rem;letter-spacing:0.02em;color:#fcd34d;">' + _sanitizeText(block.title) + '</h6>';
        }
        _splitParagraphs(block.body || '').forEach(function (p, i) {
          var weight = i === 0 ? '600' : '500';
          html += '<p class="lb-sub-body" style="margin:0 0 12px;line-height:1.95;word-break:keep-all;overflow-wrap:break-word;color:#f3ecff;font-size:15px;font-weight:' + weight + ';">' + _sanitizeText(p) + '</p>';
        });
      });

      html += '</section>';
    });

    var adviceSource = sections.length ? sections[sections.length - 1].body || '' : '';
    var adviceParagraphs = _splitParagraphs(adviceSource);
    var chapterAdvice = adviceParagraphs.length ? adviceParagraphs[adviceParagraphs.length - 1] : '이 장의 흐름은 두 사람의 관계 리듬에 맞춰 천천히 적용해 주세요.';
    html += '<aside style="margin-top:8px;padding:12px;border-radius:12px;border:1px solid rgba(251,191,36,0.35);background:rgba(251,191,36,0.08);">';
    html += '<strong style="display:block;margin-bottom:6px;color:#fde68a;font-size:0.82rem;">이 장의 관계 운영 포인트</strong>';
    html += '<p style="margin:0;color:#f9f4ff;line-height:1.8;font-size:14px;">' + _sanitizeText(chapterAdvice) + '</p>';
    html += '</aside>';

    html += '</section>';
    content.innerHTML = html;
  }

  function _setActiveChapter(index) {
    if (!_chapters.length) return;
    _activeChapterIndex = Math.max(0, Math.min(_chapters.length - 1, Number(index) || 0));
    Array.prototype.forEach.call(document.querySelectorAll('#skToc .lb-toc-item'), function (btn, idx) {
      btn.classList.toggle('active', idx === _activeChapterIndex);
    });
    _renderActiveChapterContent(_chapters[_activeChapterIndex]);
  }

  function _resolveSukuyoCompletedChapters(payload) {
    var p = payload && typeof payload === 'object' ? payload : {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    var nested = p.payload && typeof p.payload === 'object' ? p.payload : {};
    var archive = p.archive && typeof p.archive === 'object' ? p.archive : {};
    var metadataArchive = p.metadata && p.metadata.archive && typeof p.metadata.archive === 'object' ? p.metadata.archive : {};
    if (Array.isArray(p.chapters) && p.chapters.length) return p.chapters;
    if (Array.isArray(ready.chapters) && ready.chapters.length) return ready.chapters;
    if (Array.isArray(nested.chapters) && nested.chapters.length) return nested.chapters;
    if (Array.isArray(archive.chapters) && archive.chapters.length) return archive.chapters;
    if (Array.isArray(metadataArchive.chapters) && metadataArchive.chapters.length) return metadataArchive.chapters;
    return [];
  }

  function _isSukyoReportReady(payload) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    var payloadBody = p.payload && typeof p.payload === 'object' ? p.payload : {};
    var chapters = _resolveSukuyoCompletedChapters(p);
    var hasReportId = !!_clean(p.reportId || ready.reportId || payloadBody.reportId);
    var hasStoredUrl = !!_resolveSukuyoStoredUrl(p);
    var validation = p.pdfCompletionValidation && typeof p.pdfCompletionValidation === 'object' ? p.pdfCompletionValidation : ready.pdfCompletionValidation;
    var llmAssembly = _resolveSukuyoLlmAssembly(p, ready, payloadBody);
    var manuscriptSource = _clean(p.manuscriptSource || ready.manuscriptSource || payloadBody.manuscriptSource || llmAssembly.source || SUKYO_LLM_MANUSCRIPT_SOURCE);
    var llmDraftChapterCount = _firstFiniteNumber(0, p.llmDraftChapterCount, ready.llmDraftChapterCount, payloadBody.llmDraftChapterCount, llmAssembly.chapterCount, p.chapterCount, ready.chapterCount, payloadBody.chapterCount, chapters.length);
    var sourceOk = _isAcceptedManuscriptSource(manuscriptSource);
    var sourceLlmOnly = _isLlmManuscriptSource(manuscriptSource);
    var llmAssemblyOnly = p.llmAssemblyOnly === true || ready.llmAssemblyOnly === true || llmAssembly.externalGeneration === true;
    var externalCallsAllowed = p.externalCallsAllowed === true || ready.externalCallsAllowed === true || payloadBody.externalCallsAllowed === true || llmAssembly.externalCallsAllowed === true;
    var countContractOk = Number.isFinite(llmDraftChapterCount)
      && llmDraftChapterCount >= 0
      && llmDraftChapterCount <= SUKYO_TOTAL_CHAPTERS
      && llmDraftChapterCount === SUKYO_TOTAL_CHAPTERS;
    var chapterShapeOk = chapters.length === SUKYO_TOTAL_CHAPTERS
      && chapters.every(function (chapter) {
        var sections = Array.isArray(chapter && chapter.sections) ? chapter.sections : [];
        return _clean(chapter && chapter.title)
          && sections.length >= 1
          && sections.every(function (section) { return _clean(section && section.heading) && _clean(section && section.body); });
      });
    var serverCompleted = _clean(p.serverStatus) === 'completed'
      || _clean(p.status) === 'completed'
      || _clean(p.status) === 'done';
    var qualityPassed = _clean(p.qualityStatus) === 'passed'
      || (validation && validation.ok === true)
      || (ready.pdfCompletionValidation && ready.pdfCompletionValidation.ok === true)
      || _clean(payloadBody.qualityStatus) === 'passed';
    return hasReportId
      && hasStoredUrl
      && chapterShapeOk
      && serverCompleted
      && qualityPassed
      && sourceOk
      && sourceLlmOnly
      && llmAssemblyOnly
      && externalCallsAllowed
      && _isSukuyoLlmAssemblyReady(llmAssembly, manuscriptSource)
      && countContractOk;
  }

  function _forceCompatibilityMode() {
    var compatBtn = _qs('skModeCompatBtn');
    if (compatBtn) {
      compatBtn.classList.add('on');
      compatBtn.textContent = '💞 궁합 리포트 전용';
    }

    var section = _qs('skPartnerFormSection');
    if (section) section.style.display = '';
    _setCompatibilityFormEnabled(true);

    var hint = _qs('skModeHint');
    if (hint) {
      hint.textContent = '저장된 나의 운명 카드 위로 상대의 달빛 생일이 겹치면, 두 사람만의 15장 인연 지도가 조용히 펼쳐져요.';
      hint.classList.remove('sk-inline-error');
    }

    var startDesc = _qs('skStartDesc');
    if (startDesc) startDesc.innerHTML = '두 사람의 본명숙과 관계 거리, 부딪힘 뒤에 되돌아오는 마음의 길이 <strong>15챕터 숙요점 PDF</strong> 안에서 달빛처럼 드러나요.';

    var title = _qs('skModalTitle');
    if (title) title.textContent = '💫 숙요점 프리미엄 궁합 PDF';

    var subtitle = _qs('skModalSubtitle');
    if (subtitle) subtitle.textContent = '27숙의 달빛이 두 사람의 끌림, 긴장, 회복의 길을 15개의 장으로 비춰요.';

    var startBtn = _qs('skStartBtn');
    if (startBtn) startBtn.textContent = '두 사람의 달빛 기준 맞추기';

    var coinMsg = _qs('skCompatNeedMsg');
    if (coinMsg) coinMsg.textContent = '상대방의 생년월일이 놓이면 두 사람의 숙요 궁합 문이 열려요.';
  }

  function _populateTimeSelects() {
    [
      { hourId: 'skSelfHour', minuteId: 'skSelfMinute' },
      { hourId: 'skPartnerHour', minuteId: 'skPartnerMinute' },
    ].forEach(function (pair) {
      var hourEl = _qs(pair.hourId);
      var minuteEl = _qs(pair.minuteId);

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
    });
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
    var targetScreenId = screenId === 'skSetupScreen' ? 'skNoProfileScreen' : screenId;
    ['skNoProfileScreen', 'skStartScreen', 'skLoadingScreen', 'skResultScreen', 'skErrorScreen'].forEach(function (id) {
      var element = _qs(id);
      if (element) {
        element.style.display = id === targetScreenId ? '' : 'none';
        if (id === targetScreenId) element.scrollTop = 0;
      }
    });
    _applySukuyoScreenLayout(targetScreenId);
    if (targetScreenId === 'skResultScreen') {
      _hideSukuyoFloatingWindows();
      _applyResultLayout();
    }
  }

  function _setError(message) {
    var element = _qs('skErrorMsg');
    if (element) element.textContent = _sanitizeText(message) || 'PDF 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    _showScreen('skErrorScreen');
    _setSukuyoErrorWindowVisible(true, message);
  }

  function _setStartBusy(isBusy) {
    var button = _qs('skStartBtn');
    if (!button) return;
    button.disabled = !!isBusy;
    button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function _setLoadingProgress(step, total, title) {
    var normalizedStep = Math.max(0, Math.min(total, Number(step) || 0));
    if (normalizedStep <= 0) {
      _lastLoadingStep = 0;
    } else {
      normalizedStep = Math.max(normalizedStep, _lastLoadingStep);
      _lastLoadingStep = normalizedStep;
    }
    var pct = Math.max(0, Math.min(100, Math.round((normalizedStep / Math.max(total, 1)) * 100)));
    var bar = _qs('skProgressBar');
    var text = _qs('skProgressText');
    var number = _qs('skLoadingChapterNum');
    var chapter = _qs('skLoadingChapter');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = normalizedStep <= 0 ? ('0 / ' + total + ' 준비 중') : (normalizedStep + ' / ' + total);
    if (number) number.textContent = normalizedStep <= 0 ? '준비 중' : ('제' + normalizedStep + '장');
    if (chapter) chapter.textContent = _sanitizeText(title || (normalizedStep <= 0 ? '숙요점 궁합 리포트를 준비하고 있습니다.' : '숙요점 챕터를 생성하는 중입니다'));

    _syncGenerationWindowProgress(normalizedStep, total, title);

    Array.prototype.forEach.call(document.querySelectorAll('.sk-ch-dot'), function (dot) {
      var dotNo = Number(dot.getAttribute('data-skch'));
      dot.classList.toggle('lb-ch-dot--active', normalizedStep > 0 && dotNo === normalizedStep);
      dot.classList.toggle('lb-ch-dot--done', dotNo < normalizedStep);
    });
  }

  function _persistGenerationState(state) {
    var source = state && typeof state === 'object' ? state : {};
    var now = Date.now();
    var payload = {};
    Object.keys(source).forEach(function (key) { payload[key] = source[key]; });
    payload.featureKey = _clean(payload.featureKey || SUKYO_FEATURE_KEY);
    payload.updatedAt = Number(payload.updatedAt || now) || now;
    payload.expiresAt = Number(payload.expiresAt || 0) || (payload.updatedAt + SUKYO_GENERATION_STATE_TTL_MS);
    var serialized = JSON.stringify(payload);
    try { sessionStorage.setItem(SUKYO_GENERATION_STATE_KEY, serialized); } catch (_) {}
    try { localStorage.setItem(SUKYO_GENERATION_STATE_KEY, serialized); } catch (_) {}
  }

  function _clearGenerationState() {
    try { sessionStorage.removeItem(SUKYO_GENERATION_STATE_KEY); } catch (_) {}
    try { localStorage.removeItem(SUKYO_GENERATION_STATE_KEY); } catch (_) {}
  }

  function _normalizeGenerationState(raw) {
    var source = raw && typeof raw === 'object' ? raw : {};
    var status = _clean(source.status || source.serverStatus).toLowerCase();
    if (status === 'success') status = 'completed';
    if (status === 'pending' || status === 'running') status = 'generating';
    var sessionId = _clean(source.sessionId || source.reportSessionId);
    var reportId = _clean(source.reportId);
    var now = Date.now();
    var updatedAt = Number(source.updatedAt || 0) || now;
    var expiresAt = Number(source.expiresAt || 0) || (updatedAt + SUKYO_GENERATION_STATE_TTL_MS);
    var total = Math.max(1, Number(source.totalChapters || source.expectedChapterCount || SUKYO_TOTAL_CHAPTERS) || SUKYO_TOTAL_CHAPTERS);
    var current = Math.max(0, Math.min(total, Number(source.currentChapterNo || source.chapterNo || source.step || 0) || 0));
    if (!status || (!sessionId && !reportId) || expiresAt < now) return null;
    if (status === 'completed' && !reportId) return null;
    if (['preparing', 'generating', 'completed', 'failed'].indexOf(status) < 0) return null;
    return {
      isOpen: source.isOpen !== false,
      status: status,
      currentChapterIndex: Math.max(0, current - 1),
      currentChapterNo: current || (status === 'completed' ? total : 1),
      totalChapters: total,
      completedChapters: Array.isArray(source.completedChapters) ? source.completedChapters.slice(0, total) : [],
      failedChapters: Array.isArray(source.failedChapters) ? source.failedChapters.slice(0, total) : [],
      reportId: reportId,
      sessionId: sessionId,
      featureKey: _clean(source.featureKey || SUKYO_FEATURE_KEY),
      serverStatus: _clean(source.serverStatus || status),
      qualityStatus: _clean(source.qualityStatus),
      updatedAt: updatedAt,
      expiresAt: expiresAt,
    };
  }

  function _readGenerationStateFrom(storage) {
    try {
      var raw = storage && storage.getItem(SUKYO_GENERATION_STATE_KEY);
      if (!raw) return null;
      var normalized = _normalizeGenerationState(JSON.parse(raw));
      if (!normalized && storage) storage.removeItem(SUKYO_GENERATION_STATE_KEY);
      return normalized;
    } catch (_) {
      try { if (storage) storage.removeItem(SUKYO_GENERATION_STATE_KEY); } catch (__) {}
      return null;
    }
  }

  function _readGenerationState() {
    var sessionState = null;
    var localState = null;
    try { sessionState = _readGenerationStateFrom(sessionStorage); } catch (_) {}
    try { localState = _readGenerationStateFrom(localStorage); } catch (_) {}
    if (sessionState && localState) {
      return Number(sessionState.updatedAt || 0) >= Number(localState.updatedAt || 0) ? sessionState : localState;
    }
    return sessionState || localState || null;
  }

  function _isRecoverableGenerationState(state) {
    var normalized = _normalizeGenerationState(state);
    if (!normalized) return false;
    if (normalized.status === 'completed') return !!normalized.reportId;
    return !!(normalized.sessionId || normalized.reportId);
  }

  function _applyPersistedGenerationProgress(state) {
    var normalized = _normalizeGenerationState(state);
    if (!normalized) return;
    var total = Math.max(1, Number(normalized.totalChapters || SUKYO_TOTAL_CHAPTERS) || SUKYO_TOTAL_CHAPTERS);
    var step = Math.max(0, Math.min(total, Number(normalized.currentChapterNo || 0) || 0));
    var isCompleted = normalized.status === 'completed';
    var title = isCompleted
      ? '숙요점 프리미엄 궁합 PDF 완료본을 다시 불러오는 중입니다.'
      : '진행 중이던 숙요점 프리미엄 궁합 PDF를 다시 확인하는 중입니다.';
    _lastLoadingStep = step;
    _setLoadingStage(isCompleted ? '숙요점 PDF 결과를 불러오는 중' : '숙요점 PDF 생성 이어보기');
    _setLoadingProgress(step, total, title);
    _setLoadingNotice(isCompleted
      ? '완료된 PDF 결과를 보관함에서 다시 여는 중입니다.'
      : '저장된 생성 정보를 바탕으로 현재 진행 상태를 확인하고 있습니다.');
  }

  function _resumeSukuyoGenerationFromState(state) {
    var normalized = _normalizeGenerationState(state);
    if (!_isRecoverableGenerationState(normalized) || _resumeGenerationPromise) return false;
    if (normalized.sessionId) _activeSessionId = normalized.sessionId;
    if (normalized.reportId) _activeReportId = normalized.reportId;
    _generating = normalized.status !== 'failed';
    _setStartBusy(_generating);
    _showScreen(normalized.status === 'failed' ? 'skErrorScreen' : 'skLoadingScreen');
    if (normalized.status !== 'failed') _setGenerationWindowVisible(true);
    _applyPersistedGenerationProgress(normalized);
    if (normalized.status === 'failed') {
      _setError('이전 숙요점 PDF 생성이 완료되지 않았습니다. 다시 시도해 주세요.');
      return true;
    }
    _resumeGenerationPromise = _loadSukuyoGenerationFromStatus(normalized)
      .catch(function (error) {
        _logError(error, 'resume-generation');
        if (normalized.reportId) {
          return _fetchArchivedSukuyoReport(normalized.reportId).then(_handleCompletedSukuyoResponse).catch(function (archiveError) {
            _logError(archiveError, 'resume-generation-archive');
            _clearGenerationState();
            _setGenerationWindowVisible(false);
            _setError(_resolveSukuyoGenerationErrorMessage(archiveError || error));
          });
        }
        _clearGenerationState();
        _setGenerationWindowVisible(false);
        _setError(_resolveSukuyoGenerationErrorMessage(error));
      })
      .finally(function () {
        _resumeGenerationPromise = null;
        _generating = false;
        _setStartBusy(false);
        if (_resultPayload && _clean(_resultPayload.serverStatus) === 'completed') {
          _setGenerationWindowVisible(false);
        }
      });
    return true;
  }

  function _loadSukuyoGenerationFromStatus(state) {
    var normalized = _normalizeGenerationState(state);
    if (!normalized) return Promise.reject(_createSukuyoError('저장된 숙요점 PDF 생성 정보를 확인할 수 없습니다.', { stage: 'resume-state' }));
    return _getJson(_buildExecutionStatusPath(normalized.sessionId, normalized.reportId))
      .then(function (data) {
        var execution = data && data.execution || {};
        var running = data && data.running && typeof data.running === 'object' ? data.running : null;
        var nextSessionId = _clean(execution.sessionId || (running && running.sessionId) || normalized.sessionId);
        var nextReportId = _clean(execution.reportId || (running && running.reportId) || normalized.reportId);
        if (nextSessionId) _activeSessionId = nextSessionId;
        if (nextReportId) _activeReportId = nextReportId;
        if (_isSukuyoExecutionCompleted(execution)) {
          var completedReport = _normalizeArchivedSukuyoReport(data && (data.report || data.payload || data.data || data));
          if (_isSukyoReportReady(completedReport)) return _handleCompletedSukuyoResponse(completedReport);
          return _fetchArchivedSukuyoReport(nextReportId, completedReport).then(_handleCompletedSukuyoResponse);
        }
        if (_isSukuyoExecutionFailed(execution)) {
          throw _createSukuyoError(_clean(execution.reasonMessage) || '숙요점 PDF 생성이 완료되지 않았습니다. 다시 시도해 주세요.', {
            stage: 'resume-status-failed',
            reportId: nextReportId,
            sessionId: nextSessionId,
            execution: _summarizeSukuyoPayload({ execution: execution }),
          });
        }
        _applySukuyoServerProgress(running || normalized, 1);
        return _pollSukuyoRunningResponse(running || normalized).then(_handleCompletedSukuyoResponse);
      });
  }

  function _resetGenerationState(sessionId) {
    _chapters = [];
    _resultPayload = null;
    _lastPremiumPayment = null;
    _lastLoadingStep = 0;
    _activeSessionId = _clean(sessionId) || _newSessionId();
    _activeReportId = '';
    _activePaymentRequestId = '';
    _getSukuyoGenerationScope();
    _persistGenerationState({
      isOpen: true,
      status: 'preparing',
      currentChapterIndex: 0,
      currentChapterNo: 1,
      totalChapters: SUKYO_TOTAL_CHAPTERS,
      completedChapters: [],
      failedChapters: [],
      reportId: null,
      sessionId: _activeSessionId,
      updatedAt: Date.now(),
    });
  }

  function _playChapterProgress(chapters) {
    var list = Array.isArray(chapters) ? chapters.slice() : [];
    var i = 0;
    return new Promise(function (resolve) {
      function tick() {
        if (i >= list.length) { resolve(); return; }
        var chapter = list[i] || {};
        var chapterNo = Number(chapter.order || chapter.chapterNo || (i + 1)) || (i + 1);
        var title = _sanitizeText(_chapterTitleOnly(chapter.title, chapterNo));
        _setLoadingProgress(chapterNo, SUKYO_TOTAL_CHAPTERS, '제' + chapterNo + '장. ' + title + ' 작성 중...');
        _setLoadingStage('숙요점 궁합 PDF 생성 중');
        _persistGenerationState({
          isOpen: true,
          status: 'generating',
          currentChapterIndex: chapterNo - 1,
          currentChapterNo: chapterNo,
          totalChapters: SUKYO_TOTAL_CHAPTERS,
          completedChapters: list.slice(0, chapterNo).map(function (c) { return Number(c.order || c.chapterNo || 0); }).filter(Boolean),
          failedChapters: [],
          reportId: _clean(_resultPayload && _resultPayload.reportId),
          sessionId: _activeSessionId,
          updatedAt: Date.now(),
        });
        i += 1;
        setTimeout(tick, 120);
      }
      tick();
    });
  }

  function _setLoadingStage(message) {
    var title = _qs('skLoadingTitle');
    if (title) title.textContent = _sanitizeText(message);
    var windowTitle = _qs('skGenerationTitle');
    if (windowTitle) windowTitle.textContent = _sanitizeText(message);
  }

  function _setLoadingNotice(message) {
    var quote = _qs('skMysticQuote');
    if (quote) quote.textContent = _sanitizeText(message);
    var windowNotice = _qs('skGenerationNotice');
    if (windowNotice) windowNotice.textContent = _sanitizeText(message);
  }

  function _startSukuyoAssemblyProgress() {
    var source = Array.isArray(_canonicalChapters) && _canonicalChapters.length ? _canonicalChapters : [];
    var total = Math.max(SUKYO_TOTAL_CHAPTERS, 1);
    var index15 = 0;
    var apply15 = function () {
      var step = Math.min(index15 + 1, total);
      var chapter = source[step - 1] || {};
      if (step >= total) {
        _setLoadingProgress(total, total, 'PDF 저장본 확정 중입니다.');
        _setLoadingStage('숙요점 프리미엄 궁합 PDF 저장 중');
        _setLoadingNotice('15장 원고를 확인했습니다. 저장 링크와 결과 화면을 여는 중입니다.');
        return;
      }
      _setLoadingProgress(step, total, '제' + step + '장. ' + _sanitizeText(_chapterTitleOnly(chapter.title || '숙요 궁합 원고', step)) + ' 작성 중...');
      _setLoadingStage('숙요점 프리미엄 궁합 PDF 생성 중');
      _setLoadingNotice('두 사람의 본명숙과 관계 거리를 따라 PDF 원고가 열리고 있습니다.');
      index15 += 1;
    };
    apply15();
    return setInterval(apply15, 2600);
  }

  function _stopSukuyoAssemblyProgress(timer) {
    if (timer) clearInterval(timer);
  }

  function _applySukuyoServerProgress(source, attempts) {
    var payload = source && typeof source === 'object' ? source : {};
    var progress = payload.progress || (payload.running && payload.running.progress) || {};
    var total = Math.max(1, Number(progress.totalChapters || progress.expectedChapterCount || SUKYO_TOTAL_CHAPTERS) || SUKYO_TOTAL_CHAPTERS);
    var rawStep = Number(progress.currentChapterNo || progress.chapterNo || progress.step || 0);
    var fallbackStep = Math.min(total - 1, Math.max(1, Math.floor((Number(attempts) || 1) / 2) + 1));
    var step = Math.max(1, Math.min(total, rawStep || fallbackStep));
    step = Math.max(step, _lastLoadingStep || 0);
    var stage = _clean(progress.stage || payload.status || '');
    var chapter = _canonicalChapters[step - 1] || {};
    var title = _sukuyoBookText('loading.chapterTitle', step, _sanitizeText(_chapterTitleOnly(chapter.title || _sukuyoBookText('loading.defaultChapter'), step)));
    if (step >= total) title = _sukuyoBookText('loading.finalizingPdf');
    if (stage === 'pdf-rendering') title = _sukuyoBookText('loading.renderingPdf');
    if (stage === 'archive-completing') title = _sukuyoBookText('loading.completingArchive');
    var completed = Array.isArray(progress.completedChapters) ? progress.completedChapters.slice() : [];
    if (!completed.length) {
      var doneCount = (stage === 'pdf-rendering' || stage === 'archive-completing') ? total : Math.max(0, step - 1);
      for (var done = 1; done <= doneCount; done += 1) completed.push(done);
    }
    _setLoadingStage(step >= total || stage === 'pdf-rendering' || stage === 'archive-completing'
      ? _sukuyoBookText('loading.savingStage')
      : _sukuyoBookText('loading.generatingStage'));
    _setLoadingProgress(step, total, title);
    _setLoadingNotice(payload.message || (step >= total
      ? _sukuyoBookText('loading.savedNotice')
      : _sukuyoBookText('loading.runningNotice')));
    _persistGenerationState({
      isOpen: true,
      status: 'generating',
      currentChapterIndex: Math.max(0, step - 1),
      currentChapterNo: step,
      totalChapters: total,
      completedChapters: completed,
      failedChapters: [],
      reportId: _clean(payload.reportId || _activeReportId || (_resultPayload && _resultPayload.reportId)),
      sessionId: _clean(payload.sessionId || _activeSessionId),
      serverStatus: 'running',
      updatedAt: Date.now(),
    });
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
    var attempts = [];
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();

    function run(resolve, reject, lastErr) {
      if (endpointIndex >= endpoints.length) {
        reject(_createSukuyoError(lastErr || '숙요점 API 호출에 실패했습니다.', {
          stage: 'api-post',
          method: 'POST',
          pathname: pathname,
          attempts: attempts.slice(-5),
        }));
        return;
      }

      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;

      var endpoint = endpoints[endpointIndex++];
      fetch(endpoint, {
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

          var summary = _summarizeSukuyoPayload(pack.json);
          summary.httpStatus = pack.res.status;
          summary.endpoint = endpoint;
          attempts.push(summary);
          var msg = (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status);
          if (pack.res.status === 401) {
            reject(_createSukuyoError('숙요점 PDF 생성을 위해 먼저 로그인해 주세요.', {
              stage: 'api-post',
              method: 'POST',
              pathname: pathname,
              endpoint: endpoint,
              status: pack.res.status,
              response: summary,
              attempts: attempts.slice(-5),
            }));
            return;
          }
          if (pack.res.status === 402 || pack.res.status === 403) {
            reject(_createSukuyoError('프리미엄 궁합 PDF 생성을 위해 원화 결제 또는 이용권 확인이 필요합니다.', {
              stage: 'api-post',
              method: 'POST',
              pathname: pathname,
              endpoint: endpoint,
              status: pack.res.status,
              response: summary,
              attempts: attempts.slice(-5),
            }));
            return;
          }
          if (pack.res.status === 400 || pack.res.status === 422) {
            reject(_createSukuyoError(msg || '입력 정보를 확인해 주세요.', {
              stage: 'api-post',
              method: 'POST',
              pathname: pathname,
              endpoint: endpoint,
              status: pack.res.status,
              response: summary,
              attempts: attempts.slice(-5),
            }));
            return;
          }

          run(resolve, reject, msg);
        })
        .catch(function (error) {
          attempts.push({
            endpoint: endpoint,
            message: String(error && error.message || error || '요청 실패'),
          });
          run(resolve, reject, String(error && error.message || error || '요청 실패'));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _getJson(pathname) {
    var endpoints = _buildApiCandidates(pathname);
    var endpointIndex = 0;
    var attempts = [];
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();

    function run(resolve, reject, lastErr) {
      if (endpointIndex >= endpoints.length) {
        reject(_createSukuyoError(lastErr || '숙요점 생성 상태를 확인하지 못했습니다.', {
          stage: 'api-get',
          method: 'GET',
          pathname: pathname,
          attempts: attempts.slice(-5),
        }));
        return;
      }

      var headers = {};
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;

      var endpoint = endpoints[endpointIndex++];
      fetch(endpoint, {
        method: 'GET',
        headers: headers,
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

          var summary = _summarizeSukuyoPayload(pack.json);
          summary.httpStatus = pack.res.status;
          summary.endpoint = endpoint;
          attempts.push(summary);
          var msg = (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status);
          if (pack.res.status === 401) {
            reject(_createSukuyoError('숙요점 PDF 생성을 위해 먼저 로그인해 주세요.', {
              stage: 'api-get',
              method: 'GET',
              pathname: pathname,
              endpoint: endpoint,
              status: pack.res.status,
              response: summary,
              attempts: attempts.slice(-5),
            }));
            return;
          }
          if (pack.res.status === 403) {
            reject(_createSukuyoError('숙요점 PDF 열람 권한을 확인하지 못했습니다.', {
              stage: 'api-get',
              method: 'GET',
              pathname: pathname,
              endpoint: endpoint,
              status: pack.res.status,
              response: summary,
              attempts: attempts.slice(-5),
            }));
            return;
          }
          run(resolve, reject, msg);
        })
        .catch(function (error) {
          attempts.push({
            endpoint: endpoint,
            message: String(error && error.message || error || '요청 실패'),
          });
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

  function _cloneSukuyoSeedValue(value, depth) {
    if (value == null) return value;
    var type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean') return value;
    if (type !== 'object' || depth > 6) return undefined;
    if (Array.isArray(value)) {
      return value.slice(0, 36).map(function (item) { return _cloneSukuyoSeedValue(item, depth + 1); }).filter(function (item) {
        return typeof item !== 'undefined';
      });
    }
    var out = {};
    Object.keys(value).slice(0, 120).forEach(function (key) {
      if (/^(?:element|node|ownerDocument|parentNode|innerHTML|outerHTML)$/i.test(key)) return;
      var next = _cloneSukuyoSeedValue(value[key], depth + 1);
      if (typeof next !== 'undefined') out[key] = next;
    });
    return out;
  }

  function _mansionSeedFromBasicResult(basic) {
    var source = basic && typeof basic === 'object' ? basic : {};
    var index = Number(source.mansionIdx);
    var name = _clean(source.mansion || source.nameKo || source.syukuKorean);
    if (!name && !Number.isFinite(index)) return null;
    return {
      index: Number.isFinite(index) ? index : undefined,
      nameKo: name || undefined,
      syukuKorean: name || undefined,
      traits: source.traits && typeof source.traits === 'object' ? _cloneSukuyoSeedValue(source.traits, 0) : undefined,
      guardian: source.guardian && typeof source.guardian === 'object' ? _cloneSukuyoSeedValue(source.guardian, 0) : undefined,
    };
  }

  function _mansionSeedFromCompatibilityPartner(compat) {
    var source = compat && typeof compat === 'object' ? compat : {};
    var index = Number(source.partnerIdx);
    var name = _clean(source.partnerMansion || source.partnerSyuku || source.partnerNameKo);
    if (!name && !Number.isFinite(index)) return null;
    return {
      index: Number.isFinite(index) ? index : undefined,
      nameKo: name || undefined,
      syukuKorean: name || undefined,
      traits: source.partnerTraits && typeof source.partnerTraits === 'object' ? _cloneSukuyoSeedValue(source.partnerTraits, 0) : undefined,
    };
  }

  function _buildPremiumSukuyoLocalSeed(normalizedInput) {
    var input = normalizedInput && typeof normalizedInput === 'object' ? normalizedInput : {};
    var self = input.self && typeof input.self === 'object' ? input.self : {};
    var partner = input.partner && typeof input.partner === 'object' ? input.partner : {};
    var compat = null;
    var basic = null;
    try { compat = window._syLastCompat && typeof window._syLastCompat === 'object' ? _cloneSukuyoSeedValue(window._syLastCompat, 0) : null; } catch (_) { compat = null; }
    try { basic = window._syLastSukuyoBasicResult && typeof window._syLastSukuyoBasicResult === 'object' ? _cloneSukuyoSeedValue(window._syLastSukuyoBasicResult, 0) : null; } catch (_) { basic = null; }
    if (!compat && !basic) return null;

    var enhanced = compat && compat.enhanced && typeof compat.enhanced === 'object' ? compat.enhanced : {};
    var metrics = compat && compat.distanceMetrics && typeof compat.distanceMetrics === 'object' ? compat.distanceMetrics : {};
    var chemistry = enhanced.chemistry && typeof enhanced.chemistry === 'object' ? enhanced.chemistry : {};
    var selfSukuyo = _mansionSeedFromBasicResult(basic);
    var partnerSukuyo = _mansionSeedFromCompatibilityPartner(compat);
    var forwardDistance = Number(metrics.forwardDistance);
    if (!Number.isFinite(forwardDistance)) forwardDistance = Number(compat && compat.myIdx != null && compat.partnerIdx != null ? ((Number(compat.partnerIdx) - Number(compat.myIdx) + 27) % 27) : NaN);
    var reverseDistance = Number(metrics.reverseDistance);
    if (!Number.isFinite(reverseDistance) && Number.isFinite(forwardDistance)) reverseDistance = (27 - forwardDistance) % 27;
    var shortestDistance = Number(metrics.shortestDistance);
    if (!Number.isFinite(shortestDistance) && Number.isFinite(forwardDistance) && Number.isFinite(reverseDistance)) shortestDistance = Math.min(forwardDistance, reverseDistance);

    return {
      source: 'client-basic-sukuyo',
      personA: {
        name: _clean(self.name) || '본인',
        birth: { solarDate: _clean(self.birthDate) || undefined },
        gender: _clean(self.gender) || undefined,
        sukuyo: selfSukuyo || undefined,
      },
      personB: {
        name: _clean(partner.name) || '상대',
        birth: { solarDate: _clean(partner.birthDate) || undefined },
        gender: _clean(partner.gender || compat && compat.partnerGender) || undefined,
        sukuyo: partnerSukuyo || undefined,
      },
      compatibility: {
        relationType: _clean(compat && (compat.relationType || compat.typeLabel) || enhanced.relationTypeKo),
        distance: _clean(compat && compat.distanceLabel || enhanced.distanceKo),
        distanceLabel: _clean(compat && compat.distanceLabel || enhanced.distanceKo),
        relationshipName: _clean(enhanced.relationshipName),
        relationVariant: _clean(compat && compat.relationVariant),
        forwardDistance: Number.isFinite(forwardDistance) ? forwardDistance : undefined,
        reverseDistance: Number.isFinite(reverseDistance) ? reverseDistance : undefined,
        shortestDistance: Number.isFinite(shortestDistance) ? shortestDistance : undefined,
        compatibilityIndex: Number(compat && (compat.compatibilityIndex || compat.score)) || undefined,
        score: Number(compat && (compat.compatibilityIndex || compat.score)) || undefined,
        magnetism: Number(compat && compat.magnetism || chemistry.physical) || undefined,
        temperature: Number(compat && compat.temperature) || undefined,
        chemistryScore: Number(chemistry.emotional) || undefined,
        stabilityScore: Number(chemistry.longTermPotential) || undefined,
        growthScore: Number(chemistry.recoveryPotential) || undefined,
        communicationScore: Number(chemistry.communication) || undefined,
        conflictScore: Number(chemistry.conflictRisk) || undefined,
        distanceMetrics: metrics,
        roleActionGuide: compat && compat.roleActionGuide || undefined,
        elementHarmony: compat && compat.elementHarmony || undefined,
        strengthShadowMap: compat && compat.strengthShadowMap || undefined,
        enhanced: enhanced,
        relationshipCategoryReadings: enhanced.relationshipCategoryReadings || undefined,
        relationshipRiskRoutines: enhanced.relationshipRiskRoutines || undefined,
        relationshipTiming: enhanced.relationshipTiming || undefined,
        relationshipPrescriptions: enhanced.relationshipPrescriptions || undefined,
        distanceDeep: enhanced.distanceDeep || undefined,
        expertFinal: enhanced.expertFinal || undefined,
        purposeReadings: enhanced.purposeReadings || undefined,
        pastLife: enhanced.pastLife || undefined,
      },
    };
  }

  function _buildPrepareBody(normalizedInput) {
    var scope = _getSukuyoGenerationScope();
    var sessionId = scope.sessionId;
    var paymentContext = _lastPremiumPayment && typeof _lastPremiumPayment === 'object' ? _bindPaymentToCurrentGeneration(Object.assign({}, _lastPremiumPayment)) : null;
    var token = _readPremiumAccessToken() || _extractPremiumToken(paymentContext);
    if (!paymentContext && token) {
      paymentContext = {
        featureKey: SUKYO_FEATURE_KEY,
        aliasFeatureKey: SUKYO_ALIAS_FEATURE_KEY,
        reportType: 'sookyoPremium',
        mode: 'compatibility',
        reportMode: 'compatibility',
      };
    }
    if (paymentContext) {
      paymentContext.featureKey = SUKYO_FEATURE_KEY;
      paymentContext.aliasFeatureKey = SUKYO_ALIAS_FEATURE_KEY;
      paymentContext.reportType = 'sookyoPremium';
      paymentContext.mode = 'compatibility';
      paymentContext.reportMode = 'compatibility';
      paymentContext.premiumAccessToken = token || paymentContext.premiumAccessToken || undefined;
      paymentContext.sessionId = _clean(paymentContext.sessionId || sessionId) || undefined;
      paymentContext.reportSessionId = _clean(paymentContext.reportSessionId || paymentContext.sessionId || sessionId) || undefined;
    }
    var accessGrant = paymentContext && paymentContext.accessGrant && typeof paymentContext.accessGrant === 'object' ? paymentContext.accessGrant : null;
    var reportId = _clean(paymentContext && paymentContext.reportId || accessGrant && accessGrant.reportId || scope.reportId);
    if (paymentContext) paymentContext.reportId = reportId || paymentContext.reportId || undefined;
    var localSukuyoSeed = _buildPremiumSukuyoLocalSeed(normalizedInput);
    return {
      sessionId: sessionId,
      reportSessionId: (paymentContext && paymentContext.reportSessionId) || sessionId,
      featureKey: SUKYO_FEATURE_KEY,
      premiumAccessToken: token || undefined,
      requestId: paymentContext && paymentContext.requestId || undefined,
      purchaseId: paymentContext && paymentContext.purchaseId || undefined,
      transactionId: paymentContext && paymentContext.transactionId || undefined,
      sourceTransactionId: paymentContext && paymentContext.transactionId || paymentContext && paymentContext.purchaseId || undefined,
      reportId: reportId || undefined,
      accessGrant: accessGrant || undefined,
      consume: paymentContext ? {
        featureKey: SUKYO_FEATURE_KEY,
        transactionId: paymentContext.transactionId || paymentContext.purchaseId || undefined,
        purchaseId: paymentContext.purchaseId || paymentContext.transactionId || undefined,
        requestId: paymentContext.requestId || undefined,
        reportId: reportId || undefined,
        sessionId: sessionId,
        reportSessionId: paymentContext.reportSessionId || sessionId,
        premiumAccessToken: token || undefined,
        accessGrant: accessGrant || undefined,
      } : undefined,
      payment: paymentContext || undefined,
      _paymentContext: paymentContext || undefined,
      mode: 'compatibility',
      reportMode: 'compatibility',
      reportType: 'sookyoPremium',
      self: normalizedInput.self,
      partner: normalizedInput.partner,
      user: normalizedInput.self,
      personA: normalizedInput.self,
      personB: normalizedInput.partner,
      consultationNames: {
        selfName: _clean(normalizedInput.self && normalizedInput.self.name) || '본인',
        partnerName: _clean(normalizedInput.partner && normalizedInput.partner.name) || '상대',
      },
      localSukuyoCompatibilityJson: localSukuyoSeed || undefined,
      sukuyoCompatibilityJson: localSukuyoSeed || undefined,
      compatibility: localSukuyoSeed && localSukuyoSeed.compatibility || undefined,
    };
  }

  function _normalizeArchivedSukuyoReport(report) {
    var safeReport = report && typeof report === 'object' ? report : {};
    if (safeReport.report && typeof safeReport.report === 'object') safeReport = safeReport.report;
    if (safeReport.archive && typeof safeReport.archive === 'object') safeReport = safeReport.archive;
    if (safeReport.metadata && safeReport.metadata.archive && typeof safeReport.metadata.archive === 'object') safeReport = safeReport.metadata.archive;
    var ready = safeReport.pdfReady && typeof safeReport.pdfReady === 'object' ? safeReport.pdfReady : {};
    var payload = safeReport.payload && typeof safeReport.payload === 'object' ? safeReport.payload : {};
    var reportId = _clean(safeReport.reportId || ready.reportId || payload.reportId || safeReport.executionId);
    var sessionId = _clean(safeReport.sessionId || safeReport.reportSessionId || ready.sessionId || payload.sessionId || _activeSessionId);
    var chapters = _resolveSukuyoCompletedChapters(safeReport);
    var pdfUrl = _withSukuyoArchiveFormat(_clean(safeReport.pdfUrl || ready.pdfUrl || safeReport.downloadUrl || ready.downloadUrl) || _buildSukuyoArchiveUrl(reportId, 'pdf'), 'pdf');
    var htmlUrl = _withSukuyoArchiveFormat(_clean(safeReport.htmlUrl || ready.htmlUrl) || _buildSukuyoArchiveUrl(reportId, 'html'), 'html');
    var llmAssembly = _resolveSukuyoLlmAssembly(safeReport, ready, payload);
    var manuscriptSource = _clean(safeReport.manuscriptSource || payload.manuscriptSource || ready.manuscriptSource || llmAssembly.source || SUKYO_LLM_MANUSCRIPT_SOURCE);
    var llmDraftChapterCount = _firstFiniteNumber(NaN, safeReport.llmDraftChapterCount, payload.llmDraftChapterCount, ready.llmDraftChapterCount, llmAssembly.chapterCount);
    if (!Number.isFinite(llmDraftChapterCount)) llmDraftChapterCount = chapters.length;
    var llmAssemblyOnly = safeReport.llmAssemblyOnly === true || payload.llmAssemblyOnly === true || ready.llmAssemblyOnly === true || llmAssembly.externalGeneration === true;
    var externalCallsAllowed = safeReport.externalCallsAllowed === true || payload.externalCallsAllowed === true || ready.externalCallsAllowed === true || llmAssembly.externalCallsAllowed === true;
    var archivePending = safeReport.archivePending === true
      || ready.archivePending === true
      || _clean(safeReport.archiveStatus || ready.archiveStatus) === 'pending';
    return {
      ok: true,
      serviceKey: 'sukuyo-premium',
      reportType: 'sookyoPremium',
      mode: 'compatibility',
      status: 'completed',
      serverStatus: 'completed',
      qualityStatus: 'passed',
      sessionId: sessionId,
      featureKey: SUKYO_FEATURE_KEY,
      canonicalFeatureKey: SUKYO_FEATURE_KEY,
      aliasFeatureKey: SUKYO_ALIAS_FEATURE_KEY,
      reportId: reportId,
      chapterCount: chapters.length,
      llmDraftChapterCount: llmDraftChapterCount,
      manuscriptSource: manuscriptSource,
      llmAssemblyOnly: llmAssemblyOnly,
      externalCallsAllowed: externalCallsAllowed,
      llmAssembly: llmAssembly,
      chapters: chapters,
      payload: payload,
      archivePending: archivePending,
      archiveStatus: archivePending ? 'pending' : _clean(safeReport.archiveStatus || ready.archiveStatus || 'completed'),
      pdfReady: {
        ...(ready || {}),
        reportId: reportId,
        sessionId: sessionId,
        filename: (_clean(ready.filename) || (reportId ? ('sukyo-premium-' + reportId + '.pdf') : 'sukyo-premium-report.pdf')).replace(/\.html?$/i, '.pdf'),
        pdfUrl: pdfUrl,
        downloadUrl: pdfUrl,
        htmlUrl: htmlUrl,
        mimeType: 'application/pdf',
        contentType: 'application/pdf',
        renderFormat: 'pdf-archive',
        manuscriptSource: manuscriptSource,
        llmAssemblyOnly: llmAssemblyOnly,
        externalCallsAllowed: externalCallsAllowed,
        llmDraftChapterCount: llmDraftChapterCount,
        llmAssembly: llmAssembly,
        archivePending: archivePending,
        archiveStatus: archivePending ? 'pending' : _clean(safeReport.archiveStatus || ready.archiveStatus || 'completed'),
      },
      pdfUrl: pdfUrl,
      htmlUrl: htmlUrl,
      downloadUrl: pdfUrl,
      canReopen: true,
      canDownload: !!pdfUrl,
    };
  }

  function _fetchArchivedSukuyoReport(reportId, fallbackReport) {
    var id = _clean(reportId);
    if (!id) {
      return Promise.reject(_createSukuyoError('완성된 숙요점 PDF reportId를 찾지 못했습니다.', {
        stage: 'archive-fetch',
        reason: 'missing-report-id',
      }));
    }
    var fallbackReady = _normalizeArchivedSukuyoReport(fallbackReport);
    var maxAttempts = 6;
    var delayMs = 1800;
    function run(attempt) {
      return _getJson(SUKYO_ARCHIVE_API + '/' + encodeURIComponent(id))
        .then(function (data) {
          var restored = _normalizeArchivedSukuyoReport(data && (data.report || data.payload || data.data || data));
          if (_isSukyoReportReady(restored)) return restored;
          if (attempt < maxAttempts && _isSukyoReportReady(fallbackReady)) return fallbackReady;
          if (attempt < maxAttempts) {
            return new Promise(function (resolve) { setTimeout(resolve, delayMs); }).then(function () { return run(attempt + 1); });
          }
          throw _createSukuyoError('숙요점 PDF 완료본이 아직 저장되지 않았습니다. 잠시 후 다시 확인해 주세요.', {
            stage: 'archive-ready-check',
            reportId: id,
            readiness: _describeSukuyoReadiness(restored),
          });
        })
        .catch(function (error) {
          if (attempt < maxAttempts) {
            return new Promise(function (resolve) { setTimeout(resolve, delayMs); }).then(function () { return run(attempt + 1); });
          }
          if (_isSukyoReportReady(fallbackReady)) return fallbackReady;
          throw error;
        });
    }
    return run(1)
      .then(function (restored) {
        if (!_isSukyoReportReady(restored)) {
          throw _createSukuyoError('숙요점 PDF 완료본이 아직 저장되지 않았습니다. 잠시 후 다시 확인해 주세요.', {
            stage: 'archive-ready-check',
            reportId: id,
            readiness: _describeSukuyoReadiness(restored),
          });
        }
        return restored;
      });
  }

  function _buildExecutionStatusPath(sessionId, reportId) {
    return SUKYO_EXECUTION_STATUS_API + _buildQueryString({
      sessionId: sessionId,
      reportId: reportId,
    });
  }

  function _isSukuyoExecutionCompleted(execution) {
    var status = _clean(execution && execution.status);
    var premiumStatus = _clean(execution && execution.premiumStatus);
    return status === 'success' || premiumStatus === 'completed' || !!_clean(execution && execution.completedAt);
  }

  function _isSukuyoExecutionFailed(execution) {
    var status = _clean(execution && execution.status);
    var premiumStatus = _clean(execution && execution.premiumStatus);
    return status === 'failed' || status === 'abandoned' || premiumStatus === 'failed' || premiumStatus === 'abandoned' || premiumStatus === 'refunded' || premiumStatus === 'refund_failed';
  }

  function _pollSukuyoRunningResponse(runningResponse) {
    var running = runningResponse && typeof runningResponse === 'object' ? runningResponse : {};
    var sessionId = _clean(running.sessionId || _activeSessionId);
    var reportId = _clean(running.reportId || (_resultPayload && _resultPayload.reportId));
    var progress = running.progress && typeof running.progress === 'object' ? running.progress : {};
    var total = Math.max(1, Number(progress.totalChapters || progress.expectedChapterCount || SUKYO_TOTAL_CHAPTERS) || SUKYO_TOTAL_CHAPTERS);
    var initialStep = Math.max(1, Math.min(total, Number(progress.currentChapterNo || progress.chapterNo || progress.step || 1) || 1));
    var completed = Array.isArray(progress.completedChapters) ? progress.completedChapters.slice(0, total) : [];
    if (sessionId) _activeSessionId = sessionId;
    if (reportId) _activeReportId = reportId;
    _persistGenerationState({
      isOpen: true,
      status: 'generating',
      currentChapterIndex: Math.max(0, initialStep - 1),
      currentChapterNo: initialStep,
      totalChapters: total,
      completedChapters: completed,
      failedChapters: [],
      reportId: reportId || null,
      sessionId: sessionId,
      serverStatus: 'running',
      updatedAt: Date.now(),
    });

    return new Promise(function (resolve, reject) {
      var attempts = 0;
      var pollingProgressTimer = _startSukuyoAssemblyProgress();
      function tick() {
        attempts += 1;
        _getJson(_buildExecutionStatusPath(sessionId, reportId))
          .then(function (data) {
            var execution = data && data.execution || {};
            var nextReportId = _clean(execution.reportId || reportId);
            if (_isSukuyoExecutionCompleted(execution)) {
              _stopSukuyoAssemblyProgress(pollingProgressTimer);
              pollingProgressTimer = null;
              var completedReport = _normalizeArchivedSukuyoReport(data && (data.report || data.payload || data.data || data));
              if (_isSukyoReportReady(completedReport)) {
                resolve(completedReport);
                return;
              }
              _setLoadingStage('숙요점 프리미엄 궁합 PDF 저장 중');
              _setLoadingProgress(SUKYO_TOTAL_CHAPTERS, SUKYO_TOTAL_CHAPTERS, 'PDF 저장본 확정 중입니다.');
              _setLoadingNotice('15장 원고를 확인했습니다. 저장 링크와 결과 화면을 여는 중입니다.');
              _fetchArchivedSukuyoReport(nextReportId, completedReport).then(resolve).catch(reject);
              return;
            }
            if (_isSukuyoExecutionFailed(execution)) {
              _stopSukuyoAssemblyProgress(pollingProgressTimer);
              pollingProgressTimer = null;
              reject(_createSukuyoError(_clean(execution.reasonMessage) || '숙요점 궁합 PDF 생성이 완료되지 않았습니다. 다시 시도해 주세요.', {
                stage: 'execution-status-failed',
                reportId: nextReportId,
                sessionId: sessionId,
                execution: _summarizeSukuyoPayload({ execution: execution }),
              }));
              return;
            }
            if (attempts >= SUKYO_RUNNING_POLL_MAX_ATTEMPTS) {
              _stopSukuyoAssemblyProgress(pollingProgressTimer);
              pollingProgressTimer = null;
              reject(_createSukuyoError('숙요점 궁합 PDF 생성 상태 확인 시간이 초과되었습니다. 잠시 후 다시 확인해 주세요.', {
                stage: 'execution-status-timeout',
                reportId: nextReportId,
                sessionId: sessionId,
                attempts: attempts,
                execution: _summarizeSukuyoPayload({ execution: execution }),
              }));
              return;
            }
            _applySukuyoServerProgress(data && data.running || running, attempts);
            setTimeout(tick, Number((data && data.running && data.running.pollAfterMs) || running.pollAfterMs || SUKYO_RUNNING_POLL_INTERVAL_MS) || SUKYO_RUNNING_POLL_INTERVAL_MS);
          })
          .catch(function (error) {
            if (attempts >= SUKYO_RUNNING_POLL_MAX_ATTEMPTS) {
              _stopSukuyoAssemblyProgress(pollingProgressTimer);
              pollingProgressTimer = null;
              reject(error);
              return;
            }
            _setLoadingNotice('숙요점 궁합 PDF 생성 상태를 다시 확인하는 중입니다.');
            _applySukuyoServerProgress(running, attempts);
            setTimeout(tick, Number(running.pollAfterMs || SUKYO_RUNNING_POLL_INTERVAL_MS) || SUKYO_RUNNING_POLL_INTERVAL_MS);
          });
      }
      tick();
    });
  }

  function _ensurePremiumPaymentThenStart() {
    if (_hasPremiumAccessForGeneration()) return Promise.resolve(true);
    if (typeof window._cdOpenPaidServiceGate !== 'function' && typeof window._cdCoinGatePerUse !== 'function') {
      return Promise.reject(new Error(_sukuyoBookText('payment.moduleMissing')));
    }

    var paymentScope = _getSukuyoGenerationScope();
    _log('[SukuyoBook][PaymentGateStart]', { featureKey: SUKYO_FEATURE_KEY, mode: 'compatibility', reportId: paymentScope.reportId });
    var coinCost = _resolveSukuyoCoinCost();
    var reason = _sukuyoBookText('payment.reason', _sukuyoCoinLabel());
    if (typeof window._cdOpenPaidServiceGate === 'function') {
      return Promise.resolve(window._cdOpenPaidServiceGate({
        title: _sukuyoBookText('payment.title'),
        reason: reason,
        coinPrice: coinCost,
        cost: coinCost,
        featureKey: SUKYO_FEATURE_KEY,
        categoryKey: 'premium-pdf',
        subFeatureKey: SUKYO_FEATURE_KEY,
        mode: 'compatibility',
        reportMode: 'compatibility',
        reportType: 'sookyoPremium',
        aliasFeatureKey: SUKYO_ALIAS_FEATURE_KEY,
        serviceKey: 'sukuyo-premium',
        reportId: paymentScope.reportId,
        sessionId: paymentScope.sessionId,
        reportSessionId: paymentScope.reportSessionId,
        requestId: paymentScope.requestId,
      })).then(function (gateResult) {
        if (!gateResult || gateResult.status === 'cancelled') {
          throw new Error((gateResult && gateResult.message) || _sukuyoBookText('payment.cancelledStop'));
        }
        _lastPremiumPayment = _bindPaymentToCurrentGeneration(_normalizePremiumPayment(gateResult.transactionId, gateResult.payload || gateResult));
        if (gateResult.access && typeof gateResult.access === 'object') _lastPremiumPayment.accessGateResult = gateResult.access;
        _lastPremiumPayment.featureKey = SUKYO_FEATURE_KEY;
        _lastPremiumPayment.aliasFeatureKey = SUKYO_ALIAS_FEATURE_KEY;
        _lastPremiumPayment.reportType = 'sookyoPremium';
        _lastPremiumPayment.mode = 'compatibility';
        _lastPremiumPayment.reportMode = 'compatibility';
        _lastPremiumPayment.sessionId = _clean(_lastPremiumPayment.sessionId || paymentScope.sessionId) || paymentScope.sessionId;
        _lastPremiumPayment.reportSessionId = _clean(_lastPremiumPayment.reportSessionId || paymentScope.reportSessionId) || paymentScope.reportSessionId;
        _lastPremiumPayment.reportId = _clean(_lastPremiumPayment.reportId || paymentScope.reportId) || paymentScope.reportId;
        _lastPremiumPayment.requestId = _clean(_lastPremiumPayment.requestId || paymentScope.requestId) || paymentScope.requestId;
        _lastPremiumPayment.purchaseId = _clean(_lastPremiumPayment.purchaseId || _lastPremiumPayment.transactionId || _lastPremiumPayment.requestId) || undefined;
        _persistPremiumAccessToken(_lastPremiumPayment.premiumAccessToken || _extractPremiumToken(gateResult.payload || gateResult));
        _markPremiumAccessVerified(25 * 60 * 1000);
        _log('[SukuyoBook][PaymentGateSuccess]', { featureKey: SUKYO_FEATURE_KEY, reportId: _lastPremiumPayment.reportId, status: gateResult.status });
        return _lastPremiumPayment;
      });
    }

    return new Promise(function (resolve, reject) {
      window._cdCoinGatePerUse(coinCost, reason, function (_transactionId, data) {
        _lastPremiumPayment = _bindPaymentToCurrentGeneration(_normalizePremiumPayment(_transactionId, data));
        if (!_lastPremiumPayment.transactionId && !_lastPremiumPayment.purchaseId && !_lastPremiumPayment.premiumAccessToken && !_lastPremiumPayment.accessGrant) {
          _lastPremiumPayment.adminTestMode = true;
        }
        _lastPremiumPayment.featureKey = SUKYO_FEATURE_KEY;
        _lastPremiumPayment.aliasFeatureKey = SUKYO_ALIAS_FEATURE_KEY;
        _lastPremiumPayment.reportType = 'sookyoPremium';
        _lastPremiumPayment.mode = 'compatibility';
        _lastPremiumPayment.reportMode = 'compatibility';
        _lastPremiumPayment.sessionId = _clean(_lastPremiumPayment.sessionId || paymentScope.sessionId) || paymentScope.sessionId;
        _lastPremiumPayment.reportSessionId = _clean(_lastPremiumPayment.reportSessionId || paymentScope.reportSessionId) || paymentScope.reportSessionId;
        _lastPremiumPayment.reportId = _clean(_lastPremiumPayment.reportId || paymentScope.reportId) || paymentScope.reportId;
        _lastPremiumPayment.requestId = _clean(_lastPremiumPayment.requestId || paymentScope.requestId) || paymentScope.requestId;
        _lastPremiumPayment.purchaseId = _clean(_lastPremiumPayment.purchaseId || _lastPremiumPayment.transactionId || _lastPremiumPayment.requestId) || undefined;
        _persistPremiumAccessToken(_lastPremiumPayment.premiumAccessToken || _extractPremiumToken(data));
        _markPremiumAccessVerified(25 * 60 * 1000);
        _log('[SukuyoBook][PaymentGateSuccess]', { featureKey: SUKYO_FEATURE_KEY, reportId: _lastPremiumPayment.reportId });
        resolve(_lastPremiumPayment);
      }, function () {
        reject(new Error('결제가 취소되어 생성을 중단했습니다.'));
      }, {
        featureKey: SUKYO_FEATURE_KEY,
        categoryKey: 'premium-pdf',
        subFeatureKey: SUKYO_FEATURE_KEY,
        mode: 'compatibility',
        reportMode: 'compatibility',
        reportType: 'sookyoPremium',
        aliasFeatureKey: SUKYO_ALIAS_FEATURE_KEY,
        serviceKey: 'sukuyo-premium',
        reportId: paymentScope.reportId,
        sessionId: paymentScope.sessionId,
        reportSessionId: paymentScope.reportSessionId,
        requestId: paymentScope.requestId,
      });
    });
  }

  function _renderResult(chapters, payload) {
    var toc = _qs('skToc');
    var content = _qs('skChapterContent');
    var name = _qs('skResultName');
    var date = _qs('skResultDate');
    var seed = payload && payload.payload || payload || {};

    if (toc) toc.innerHTML = '';
    if (content) content.innerHTML = '';
    _applyResultLayout();

    if (name) name.textContent = '💫 ' + _sanitizeText(seed.userProfile && seed.userProfile.name || '사용자') + ' x ' + _sanitizeText(seed.partnerProfile && seed.partnerProfile.name || '상대방');
    if (date) date.textContent = [_sanitizeText(seed.userSukyo && seed.userSukyo.nameKo || ''), _sanitizeText(seed.partnerSukyo && seed.partnerSukyo.nameKo || ''), _sanitizeText(seed.compatibility && seed.compatibility.relationType || '')].filter(Boolean).join(' · ');
    _renderSukuyoCompletionNotice(payload, chapters);
    _applyResultLayout();

    chapters.forEach(function (chapter, index) {
      if (toc) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'lb-toc-item loaded';
        button.innerHTML = '<span>CHAPTER ' + Number(chapter.order || index + 1) + '</span><strong>' + _sanitizeText(_chapterTitleOnly(chapter.title, chapter.order || index + 1)) + '</strong>';
        button.addEventListener('click', function () {
          _setActiveChapter(index);
        });
        toc.appendChild(button);
      }
    });

    _setActiveChapter(0);
    _setSukuyoDownloadButtonState(payload);
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

  function _handleCompletedSukuyoResponse(response) {
    if (!response || !response.ok) throw new Error('SESSION_CREATE_FAILED');
    _log('[SukuyoBook][SessionCreateSuccess]', { chapterCount: response.chapterCount });

    _log('[SukuyoBook][PdfRequestStart]', { chapterCount: response.chapterCount });

    var completedSessionId = _clean(response.sessionId || response.reportSessionId || _activeSessionId);
    var completedReportId = _clean(response.reportId || response.executionId || _activeReportId);
    response = _normalizeArchivedSukuyoReport(response);
    if (completedSessionId) _activeSessionId = completedSessionId;
    if (completedReportId) {
      _activeReportId = completedReportId;
      response.reportId = completedReportId;
    }
    _resultPayload = response;
    _chapters = _resolveSukuyoCompletedChapters(response);

    if (!_chapters.length || Number(response.chapterCount) !== SUKYO_TOTAL_CHAPTERS || Number(_chapters.length) !== SUKYO_TOTAL_CHAPTERS) {
      throw _createSukuyoError('숙요점 궁합 리포트의 전체 챕터 데이터가 비어 있습니다.', {
        stage: 'completed-response-chapter-check',
        reportId: _clean(response.reportId),
        readiness: _describeSukuyoReadiness(response),
      });
    }
    if (!_isSukyoReportReady(response)) {
      throw _createSukuyoError('PDF 완료 데이터 검증이 아직 끝나지 않았습니다.', {
        stage: 'completed-response-ready-check',
        reportId: _clean(response.reportId),
        readiness: _describeSukuyoReadiness(response),
      });
    }

    return _playChapterProgress(_chapters).then(function () {
      _syncDotsByChapters(_chapters);
      _setLoadingStage('숙요점 프리미엄 궁합 PDF 저장 중');
      _setLoadingProgress(SUKYO_TOTAL_CHAPTERS, SUKYO_TOTAL_CHAPTERS, 'PDF 저장본 확정 중입니다.');
      _setLoadingNotice('15장 원고와 저장 링크를 확인했습니다. 결과 화면을 여는 중입니다.');
      _renderResult(_chapters, response);

      _log('[SukuyoBook][PdfRequestSuccess]', {
        chapterCount: _chapters.length,
        manuscriptSource: response.manuscriptSource || 'unknown',
        sessionId: _activeSessionId,
      });

      _persistGenerationState({
        isOpen: true,
        status: 'completed',
        currentChapterIndex: SUKYO_TOTAL_CHAPTERS - 1,
        currentChapterNo: SUKYO_TOTAL_CHAPTERS,
        totalChapters: SUKYO_TOTAL_CHAPTERS,
        completedChapters: _chapters.map(function (c) { return Number(c.order || c.chapterNo || 0); }).filter(Boolean),
        failedChapters: [],
        reportId: _clean(response.reportId),
        sessionId: _activeSessionId,
        qualityStatus: 'passed',
        serverStatus: 'completed',
        updatedAt: Date.now(),
      });

      _setLoadingNotice('숙요점 프리미엄 궁합 PDF 저장본이 확정되었습니다.');
      _setGenerationWindowVisible(false);
      _showScreen('skResultScreen');
      _showSukuyoToast('숙요점 PDF 원고가 완성됐어요. 현재 창에서 확인하고 저장할 수 있어요.');
    });
  }

  window.openSukuyoBookModal = function () {
    var modal = _qs('sukuyoBookModal');
    if (!modal) return;

    _log('[SukuyoBook][ModalOpen]', { featureKey: SUKYO_FEATURE_KEY });

    _detachModalFromResultPage(modal);
    _setSukuyoErrorWindowVisible(false);
    _setGenerationWindowVisible(false);
    _populateTimeSelects();
    _forceCompatibilityMode();
    _syncGenderAria('skSelf');
    _syncGenderAria('skPartner');
    _syncTimeUnknownControls('skSelf');
    _syncTimeUnknownControls('skPartner');
    _applyResultLayout();

    var profile = _getActiveBirthProfile();
    if (!profile) {
      try {
        var pick = _normalizeSukuyoProfile((typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
          || window.__cdCurrentDestinyProfile
          || null);
        if (pick) {
          window.__cdActiveBirthProfile = pick;
          profile = pick;
        }
      } catch (_) {}
    }

    if (profile) {
      window.__cdActiveBirthProfile = profile;
      _renderProfileSummary(profile);
    } else {
      _renderProfileSummary(null);
    }
    if (_resultPayload && _chapters.length && _isSukyoReportReady(_resultPayload)) {
      _renderResult(_chapters, _resultPayload);
      _showScreen('skResultScreen');
    } else if (_generating) {
      _showScreen('skLoadingScreen');
      _setGenerationWindowVisible(true);
    } else {
      _clearGenerationState();
      _showScreen('skStartScreen');
    }
    _refreshReadinessPanel();

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
    _setGenerationWindowVisible(false);
    _setSukuyoErrorWindowVisible(false);
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
      _renderProfileSummary(null);
      _showScreen('skStartScreen');
    }

    _log('[SukuyoBook][ProfileResolved]', { hasBirthDate: !!_clean(_formatProfile(profile).birthDate) });

    var partner = _getPartnerInputV2();
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
    _clearInputErrors();
    _renderReadinessPanel(normalizedInput, check, check.ok ? 'ready' : 'invalid');
    if (!check.ok) {
      Object.keys(check.fieldErrors || {}).forEach(function (fieldId) {
        _setInputError(fieldId, check.fieldErrors[fieldId]);
      });
      var modeHint = _qs('skModeHint');
      if (modeHint) {
        modeHint.textContent = _readinessInvalidMessage(check);
        modeHint.classList.add('sk-inline-error');
      }
      _showScreen('skStartScreen');
      _focusFirstInputError(check.fieldErrors);
      return;
    }

    _generating = true;
    _resetGenerationState(_newSessionId());
    _setStartBusy(true);
    _showScreen('skLoadingScreen');
    _setGenerationWindowVisible(true);
    _setLoadingProgress(0, SUKYO_TOTAL_CHAPTERS, '숙요점 궁합 리포트를 준비하고 있습니다.');
    _setLoadingStage('숙요점 궁합 PDF 생성 중');
    _setLoadingNotice('두 사람의 본명숙을 정리하는 중입니다');
    var assemblyProgressTimer = null;

    _runPreflight(normalizedInput)
      .then(function (preflight) {
        _setLoadingProgress(0, SUKYO_TOTAL_CHAPTERS, '입력 산출 기준을 확인했습니다. ' + _sukuyoCoinLabel() + ' 결제 확인을 진행합니다.');
        _setLoadingStage('숙요점 궁합 PDF 생성 중');
        _setLoadingNotice('관계 유형과 거리를 해석하는 중입니다');
        _renderReadinessPanel(normalizedInput, check, 'verified', preflight);

        if (!preflight || !preflight.ok) {
          throw new Error('결제 전 입력 검증에 실패했습니다.');
        }

        if (!_hasPremiumAccessForGeneration()) {
          return _ensurePremiumPaymentThenStart();
        }

        return true;
      })
      .then(function () {
        assemblyProgressTimer = _startSukuyoAssemblyProgress();

        _log('[SukuyoBook][LocalCalculationStart]', { sessionId: _activeSessionId });

        _log('[SukuyoBook][SessionCreateStart]', { featureKey: SUKYO_FEATURE_KEY });
        return _postJson(SUKYO_PREPARE_API, _buildPrepareBody(normalizedInput));
      })
      .then(function (response) {
        _stopSukuyoAssemblyProgress(assemblyProgressTimer);
        assemblyProgressTimer = null;
        if (response && response.status === 'running' && !Array.isArray(response.chapters)) {
          _resultPayload = response;
          _setLoadingStage('숙요점 궁합 PDF 생성 중');
          _setLoadingNotice(response.message || '같은 세션의 숙요점 궁합 PDF가 생성 중입니다. 완료 상태를 확인하고 있습니다.');
          return _pollSukuyoRunningResponse(response).then(_handleCompletedSukuyoResponse);
        }
        return _handleCompletedSukuyoResponse(response);
      })
      .catch(function (error) {
        _stopSukuyoAssemblyProgress(assemblyProgressTimer);
        assemblyProgressTimer = null;
        _logError(error, 'generate');
        _setGenerationWindowVisible(false);
        _persistGenerationState({
          isOpen: true,
          status: 'failed',
          currentChapterIndex: 0,
          currentChapterNo: 1,
          totalChapters: SUKYO_TOTAL_CHAPTERS,
          completedChapters: [],
          failedChapters: [1],
          reportId: _clean(_resultPayload && _resultPayload.reportId),
          sessionId: _activeSessionId,
          updatedAt: Date.now(),
        });
        _setError(_resolveSukuyoGenerationErrorMessage(error));
      })
      .finally(function () {
        _generating = false;
        _setStartBusy(false);
        if (_resultPayload && _clean(_resultPayload.serverStatus) === 'completed') {
          _setGenerationWindowVisible(false);
        }
      });
  };

  window.downloadSukuyoBookPdf = function () {
    if (!_chapters.length || !_resultPayload) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }

    var reportId = _clean(_resultPayload && _resultPayload.reportId);
    var ready = _resultPayload && _resultPayload.pdfReady && typeof _resultPayload.pdfReady === 'object' ? _resultPayload.pdfReady : {};
    var archivePdfUrl = _buildSukuyoArchiveUrl(reportId, 'pdf');
    var archiveHtmlUrl = _buildSukuyoArchiveUrl(reportId, 'html');
    var pdfUrl = _withSukuyoArchiveFormat(_clean(
      _resultPayload && _resultPayload.pdfUrl
      || ready.pdfUrl
      || _resultPayload && _resultPayload.downloadUrl
      || ready.downloadUrl
      || archivePdfUrl
    ), 'pdf');
    var htmlUrl = _withSukuyoArchiveFormat(_clean(
      _resultPayload && _resultPayload.htmlUrl
      || ready.htmlUrl
      || _resultPayload && _resultPayload.storedUrl
      || ready.storedUrl
      || archiveHtmlUrl
    ), 'html');
    var downloadUrl = _clean(
      pdfUrl
      || _resultPayload && _resultPayload.downloadUrl
      || ready.downloadUrl
      || _resultPayload && _resultPayload.storedUrl
      || _resultPayload && _resultPayload.reportUrl
      || _resultPayload && _resultPayload.fileUrl
      || _resultPayload && _resultPayload.storageUrl
      || ready.storedUrl
      || ready.reportUrl
      || ready.fileUrl
      || ready.storageUrl
      || htmlUrl
    );
    var canDownload = Boolean(_resultPayload && _resultPayload.canDownload);
    var inlineHtml = _clean(ready.html);
    var archivePending = _resultPayload && _resultPayload.archivePending === true
      || ready.archivePending === true
      || _clean(_resultPayload && _resultPayload.archiveStatus || ready.archiveStatus) === 'pending';

    console.log('[SukuyoPremiumPDF][DownloadClick]', {
      reportId: reportId,
      pdfUrl: pdfUrl,
      downloadUrl: downloadUrl,
      htmlUrl: htmlUrl,
      canDownload: canDownload,
      archivePending: archivePending,
    });

    if (archivePending && inlineHtml) {
      var pendingBlob = new Blob([ready.html], { type: 'text/html;charset=utf-8' });
      var pendingBlobUrl = URL.createObjectURL(pendingBlob);
      var pendingAnchor = document.createElement('a');
      pendingAnchor.href = pendingBlobUrl;
      pendingAnchor.target = '_blank';
      pendingAnchor.rel = 'noopener noreferrer';
      pendingAnchor.download = (reportId ? ('sukyo-premium-' + reportId + '.html') : 'sukyo-premium-report.html');
      document.body.appendChild(pendingAnchor);
      pendingAnchor.click();
      pendingAnchor.remove();
      setTimeout(function () { URL.revokeObjectURL(pendingBlobUrl); }, 1500);
      _showSukuyoToast('PDF 저장소 반영이 지연되어 임시 HTML 원고를 먼저 다운로드했습니다. 잠시 후 PDF 저장 버튼을 다시 눌러 주세요.');
      return;
    }

    if (downloadUrl) {
      var isPdfDownload = /\.pdf(?:$|[?#])/i.test(downloadUrl) || /format=pdf(?:$|&)/i.test(downloadUrl);
      var isHtmlDownload = !isPdfDownload && (/\.html?(?:$|[?#])/i.test(downloadUrl) || /format=html(?:$|&)/i.test(downloadUrl) || /text\/html/i.test(_clean(ready.mimeType)) || downloadUrl === htmlUrl);
      var filename = _clean(ready.filename) || (reportId ? ('sukyo-premium-' + reportId + '.pdf') : 'sukyo-premium-report.pdf');
      filename = isHtmlDownload ? filename.replace(/\.pdf$/i, '.html') : filename.replace(/\.html?$/i, '.pdf');
      _showSukuyoToast(isHtmlDownload ? 'HTML 원고를 저장하고 있습니다.' : '숙요점 궁합 PDF를 저장하고 있습니다.');
      _downloadSukuyoUrlAsBlob(downloadUrl, filename, isHtmlDownload ? 'html' : 'pdf')
        .then(function () {
          _showSukuyoToast(isHtmlDownload ? 'HTML 원고 저장을 시작했습니다.' : '숙요점 궁합 PDF 저장을 시작했습니다.');
        })
        .catch(function (error) {
          console.error('[SukuyoPremiumPDF][DownloadFailed]', {
            reportId: reportId,
            downloadUrl: downloadUrl,
            status: error && error.status,
            message: String(error && error.message || error || ''),
          });
          if (error && Number(error.status) === 401) {
            _showSukuyoToast('로그인이 만료되었습니다. 다시 로그인한 뒤 PDF를 저장해 주세요.');
            return;
          }
          if (inlineHtml && _downloadSukuyoInlineHtml(ready, reportId)) {
            _showSukuyoToast('테스트 환경에서 PDF 저장소 연결이 없어 HTML 원고로 저장했어요. 파일을 열어 PDF로 저장할 수 있어요.');
            return;
          }
          _showSukuyoToast('PDF 저장 링크를 열 수 없습니다. 잠시 후 다시 시도해 주세요.');
        });
      return;
    }

    if (inlineHtml) {
      var blob = new Blob([ready.html], { type: 'text/html;charset=utf-8' });
      var blobUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = (reportId ? ('sukyo-premium-' + reportId + '.html') : 'sukyo-premium-report.html');
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 1500);
      _showSukuyoToast('PDF 링크가 아직 없어 임시 HTML 원고를 새 탭에서 열었습니다.');
      return;
    }

    alert('리포트 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var actionEl = target.closest('[data-action]');
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      if (action === 'openSukuyoBookModal') { window.openSukuyoBookModal(); return; }
      if (action === 'closeSukuyoBookModal') { window.closeSukuyoBookModal(); return; }
      if (action === 'closeSukuyoErrorWindow') { _setSukuyoErrorWindowVisible(false); return; }
      if (action === 'retrySukuyoBook') { _setSukuyoErrorWindowVisible(false); window.generateSukuyoBook(); return; }
      if (action === 'gotoSukuyoPremium') { window.gotoSukuyoPremium(); return; }
      if (action === 'generateSukuyoBook') { window.generateSukuyoBook(); return; }
    }

    if (target.id === 'skPartnerGenderF' || target.closest('#skPartnerGenderF')) {
      var f = _qs('skPartnerGenderF');
      var m = _qs('skPartnerGenderM');
      if (f) f.classList.add('on');
      if (m) m.classList.remove('on');
      _syncGenderAria('skPartner');
      _clearFieldError('skPartnerGender');
      _refreshReadinessPanel();
    }
    if (target.id === 'skPartnerGenderM' || target.closest('#skPartnerGenderM')) {
      var ff = _qs('skPartnerGenderF');
      var mm = _qs('skPartnerGenderM');
      if (ff) ff.classList.remove('on');
      if (mm) mm.classList.add('on');
      _syncGenderAria('skPartner');
      _clearFieldError('skPartnerGender');
      _refreshReadinessPanel();
    }
    if (target.id === 'skSelfGenderF' || target.closest('#skSelfGenderF')) {
      var sf = _qs('skSelfGenderF');
      var sm = _qs('skSelfGenderM');
      if (sf) sf.classList.add('on');
      if (sm) sm.classList.remove('on');
      _syncGenderAria('skSelf');
      _clearFieldError('skSelfGender');
      _refreshReadinessPanel();
    }
    if (target.id === 'skSelfGenderM' || target.closest('#skSelfGenderM')) {
      var sff = _qs('skSelfGenderF');
      var smm = _qs('skSelfGenderM');
      if (sff) sff.classList.remove('on');
      if (smm) smm.classList.add('on');
      _syncGenderAria('skSelf');
      _clearFieldError('skSelfGender');
      _refreshReadinessPanel();
    }
  });

  document.addEventListener('input', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    _handleSplitNumberInput(target);
    if (/^sk(Self|Partner)/.test(target.id || '')) _refreshReadinessPanel();
  });

  document.addEventListener('change', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    if (target.id === 'skSelfHour' || target.id === 'skPartnerHour') {
      var minuteEl = _qs(target.id === 'skSelfHour' ? 'skSelfMinute' : 'skPartnerMinute');
      if (minuteEl && _clean(target.value) && !_clean(minuteEl.value)) minuteEl.value = '0';
    }

    if (target.id === 'skSelfTimeUnknown' || target.id === 'skPartnerTimeUnknown') {
      var isSelf = target.id === 'skSelfTimeUnknown';
      _syncTimeUnknownControls(isSelf ? 'skSelf' : 'skPartner');
    }
    if (/^sk(Self|Partner)/.test(target.id || '') || target.name === 'skSelfCalType' || target.name === 'skPartnerCalType') {
      _refreshReadinessPanel();
    }
  });
})();
