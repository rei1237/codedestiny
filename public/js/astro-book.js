/**
 * Premium Astrology AI Consultation (Cosmic Chart)
 * Local chart-first profile handling + worker AI consultation endpoint.
 */
(function () {
  'use strict';

  var ASTRO_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_BILLING_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_AI_CONSULTATION_API = '/api/astro/ai-consultation';
  var ASTRO_PREPARE_API = '/api/astro/premium/prepare';
  var ASTRO_VERIFY_ACCESS_API = '/api/astro/premium/verify-access';
  var ASTRO_CREATE_JOB_API = '/api/astro/premium/create-job';
  var ASTRO_GENERATE_MOCK_API = '/api/astro/premium/generate-mock';
  var ASTRO_STATUS_API = '/api/astro/premium/status';
  var ASTRO_RESULT_API = '/api/astro/premium/result';
  var ASTRO_CHAPTERS_API = '/api/astro/premium/mock-chapters';
  var ASTRO_WESTERN_CHART_API = '/api/astro/western-chart';
  var ASTRO_TOTAL_CHAPTERS = 12;
  var ASTRO_COIN_COST = 390;
  var ASTRO_PREPARE_TIMEOUT_MS = 90000;
  var ASTRO_DOWNLOAD_TIMEOUT_MS = 60000;
  var ASTRO_STATUS_POLL_MS = 1200;
  var ASTRO_MOCK_JOB_STORAGE_KEY = 'currentAstrologyPdfJobId';
  var ASTRO_SIGN_NAMES = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];
  var ASTRO_AI_DEFAULT_CATEGORY = 'general';
  var ASTRO_AI_CATEGORIES = [
    ['general', '종합 리딩', '제 네이탈 차트와 현재 흐름을 종합해서 지금 가장 중요한 방향을 알려주세요.'],
    ['personality', '성격/재능', '제 차트에서 가장 강한 재능과 반복되는 성향 패턴은 무엇인가요?'],
    ['career', '직업', '제 네이탈 차트 기준으로 앞으로 커리어가 어떻게 흘러갈까요?'],
    ['money', '재물', '제 차트에서 돈이 열리는 방식과 주의할 재정 패턴을 알려주세요.'],
    ['love', '연애/결혼', '올해 연애와 결혼운이 제 차트와 현재 흐름에서 어떻게 보이나요?'],
    ['relationship', '인간관계', '제 관계 패턴이 반복되는 이유를 점성술로 알려주세요.'],
    ['family', '감정 패턴', '제 감정 패턴과 안정감을 찾는 방식을 차트로 봐주세요.'],
    ['yearly', '올해 운세', '앞으로 1년 동안 중요한 기회와 주의할 시기를 알려주세요.'],
    ['transit', '현재 트랜짓', '요즘 인생이 막히는 이유를 현재 트랜짓으로 봐주세요.'],
    ['turning_point', '전환점', '지금이 인생 전환점인지, 어떤 선택을 해야 할지 알려주세요.'],
    ['choice', '지금의 선택', '지금 고민하는 선택에서 별의 흐름이 가리키는 방향을 알고 싶어요.']
  ];
  var ASTRO_AI_LOADING_LINES = [
    '태어난 순간의 별 지도를 계산하고 있어요.',
    '태양, 달, 상승궁의 균형을 읽고 있어요.',
    '현재 행성의 흐름을 정리하고 있어요.',
    '질문에 맞는 점성술 상담을 준비하고 있어요.'
  ];

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var _generating = false;
  var _progressTimer = null;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;
  var _lastPremiumPayment = null;
  var ASTRO_PAYMENT_GATE_WINDOW_MS = 12000;
  var _paymentChecking = false;
  var _paymentOpening = false;
  var _paymentGateOpenedAt = 0;
  var _pendingPaymentPromise = null;
  var _pendingPaymentSessionId = '';
  var _currentAstroSessionId = '';
  var _currentAstroReportId = '';
  var _currentAstroPaymentRequestId = '';
  var _selectedAstrologyAICategory = ASTRO_AI_DEFAULT_CATEGORY;

  function _qs(id) { return document.getElementById(id); }
  function _detachModalFromResultPage(modal) {
    try {
      if (!modal || !modal.parentElement) return;
      if (typeof modal.closest === 'function' && modal.closest('#resultPage')) {
        document.body.appendChild(modal);
      }
    } catch (_) {}
  }

  function _clean(v) { return String(v || '').trim(); }

  var ASTRO_BOOK_TEXT_TRANSLATIONS = {
    ko: {
      defaultLocation: '대한민국 (서울)',
      defaultUser: '사용자',
      missingProfile: '생년월일 정보를 찾을 수 없습니다. 먼저 기본 점성술 계산을 완료해 주세요.',
      missingBirthPlace: '출생지 미입력',
      missingTime: '시간 미입력',
      female: '여성',
      male: '남성',
      dateYear: '년 ',
      dateDay: '일 ',
      chapterProgress: function (_step, _total, done) { return done ? '점성술 상담이 열렸습니다.' : '네이탈 차트와 현재 하늘을 읽고 있어요.'; },
      loadingFallback: '점성술 AI 상담을 준비하는 중입니다',
      birthDateRequired: '생년월일 정보가 확인되지 않아 점성술 AI 상담을 시작할 수 없습니다. 프로필 카드에서 생년월일을 먼저 입력해주세요.',
      birthTimeRequired: '출생시간이 없으면 상승궁과 하우스 해석은 제한됩니다. 모름 옵션으로 계속 진행할 수 있습니다.',
      timezoneRequired: '점성술 AI 상담은 정확한 하우스 계산을 위해 출생지 시간대가 필요합니다. 프로필 카드에서 태어난 지역을 다시 선택해주세요.',
      birthplaceRequired: '점성술 AI 상담은 상승궁·하우스·천정점 계산을 위해 출생지가 필요합니다. 프로필 카드에서 태어난 지역을 먼저 선택해주세요.',
      statusCheckFailed: '상태 확인 실패',
      progressLocal: '행성 좌표와 하우스의 삶의 장면을 정리하는 중입니다',
      progressSeed: '차트의 핵심 상징을 상담 목차로 엮는 중입니다',
      progressWriting: '질문에 맞는 상담 흐름을 엮는 중입니다',
      progressValidated: '상담 문장의 결을 마지막으로 살피는 중입니다',
      progressRendering: '점성술 상담 결과를 정리하는 중입니다',
      progressRendered: '상담 결과를 여는 중입니다',
      progressFailed: '코즈믹 리포트 작성이 완료되지 않았습니다',
      completed: '완료',
      progressPreparing: '점성술 AI 상담을 준비하는 중입니다',
      animationTitles: ASTRO_AI_LOADING_LINES,
      checkingProfile: '프로필 정보 확인 중',
      preparingPayment: '결제 및 세션 준비 중',
      requestingChart: '출생 차트 계산 요청 중',
      manuscriptNotReady: '점성술 프리미엄 원고 검증이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.',
      resultNotSaved: '점성술 상담 결과가 아직 완전히 열리지 않았습니다. 잠시 후 다시 시도해 주세요.',
      emptyChapters: '점성술 상담 결과가 비어 있습니다.',
      checkingPdfArchive: '상담 결과를 확인하는 중입니다',
      renderingPdf: '상담 결과 정리 중',
      generationFailed: '생성 실패',
      statusGenerationFailed: '점성술 AI 상담 생성에 실패했습니다.',
      generationTimeout: '점성술 AI 상담 생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
      downloadUrlMissing: '상담 결과가 아직 준비되지 않았습니다.',
      downloadRequestFailed: function (status) { return '상담 결과 요청에 실패했습니다. HTTP ' + status; },
      paymentModuleMissing: '결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.',
      premiumFeatureName: '점성술 AI 상담',
      paymentConfirmFailed: '결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      paymentModuleUnavailable: '결제 모듈을 사용할 수 없습니다.',
      downloadNotReady: '점성술 상담 결과가 아직 열리지 않았습니다. 잠시 후 다시 시도해 주세요.',
      downloadAuthFailed: '상담 결과 권한을 확인하지 못했습니다. 로그인 상태를 확인한 뒤 다시 시도해 주세요.',
      reportUrlNotReady: '상담 결과가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.'
    },
    en: {
      defaultLocation: 'South Korea (Seoul)',
      defaultUser: 'User',
      missingProfile: 'Birth information could not be found. Please complete the basic astrology calculation first.',
      missingBirthPlace: 'Birthplace not entered',
      missingTime: 'Birth time not entered',
      female: 'Female',
      male: 'Male',
      dateYear: '-',
      dateDay: ' ',
      chapterProgress: function (step, total, done) { return step + ' / ' + total + ' chapters ' + (done ? 'complete' : 'in progress'); },
      loadingFallback: 'Completing your cosmic astrology PDF report',
      birthDateRequired: 'Your birth date is missing, so the astrology PDF cannot be created. Please enter your birth date in the profile card first.',
      birthTimeRequired: 'The astrology PDF needs your birth time to calculate the ascendant and houses. Please enter your birth time in the profile card first.',
      timezoneRequired: 'The astrology PDF needs the birthplace time zone for accurate house calculation. Please choose your birth region again in the profile card.',
      birthplaceRequired: 'The astrology PDF needs your birthplace to calculate the ascendant, houses, and midheaven. Please choose your birth region first.',
      statusCheckFailed: 'Status check failed',
      progressLocal: 'Arranging the planetary coordinates and life scenes of the houses',
      progressSeed: 'Weaving the chart’s core symbols into a consultation outline',
      progressWriting: 'Writing the 12 consultation chapters in order',
      progressValidated: 'Giving the chapter flow and sentences one final review',
      progressRendering: 'Editing the cosmic report PDF',
      progressRendered: 'Checking the PDF save path',
      progressFailed: 'The cosmic report was not completed',
      completed: 'Complete',
      progressPreparing: 'Preparing your cosmic astrology PDF report',
      animationTitles: ['Checking birth information', 'Opening the report session', 'Calculating planetary coordinates and houses'],
      checkingProfile: 'Checking profile information',
      preparingPayment: 'Preparing payment and session',
      requestingChart: 'Requesting birth chart calculation',
      manuscriptNotReady: 'The premium astrology manuscript has not finished validation. Please try again shortly.',
      resultNotSaved: 'The astrology PDF result has not been fully saved yet. Please try again shortly.',
      emptyChapters: 'The astrology chapter data is empty.',
      checkingPdfArchive: 'Checking PDF save information',
      renderingPdf: 'Editing/rendering PDF',
      generationFailed: 'Generation failed',
      statusGenerationFailed: 'Astrology PDF generation failed.',
      generationTimeout: 'Astrology PDF generation timed out. Please try again shortly.',
      downloadUrlMissing: 'The PDF download URL is not ready yet.',
      downloadRequestFailed: function (status) { return 'PDF download request failed. HTTP ' + status; },
      paymentModuleMissing: 'The payment module could not be found. Please refresh the page and try again.',
      premiumFeatureName: 'Astrology AI Consultation',
      paymentConfirmFailed: 'A problem occurred while confirming payment. Please try again shortly.',
      paymentModuleUnavailable: 'Payment module is not available.',
      downloadNotReady: 'The premium astrology manuscript and PDF save are not complete yet. Please try again shortly.',
      downloadAuthFailed: 'Could not verify PDF download permission. Please check your login status and try again.',
      reportUrlNotReady: 'The report save URL is not ready yet. Please try again shortly.'
    },
    ja: {
      defaultLocation: '韓国（ソウル）',
      defaultUser: 'ユーザー',
      missingProfile: '生年月日情報が見つかりません。先に基本の占星術計算を完了してください。',
      missingBirthPlace: '出生地未入力',
      missingTime: '出生時間未入力',
      female: '女性',
      male: '男性',
      dateYear: '年 ',
      dateDay: '日 ',
      chapterProgress: function (step, total, done) { return step + ' / ' + total + 'チャプター ' + (done ? '完成' : '進行中'); },
      loadingFallback: '占星術コズミックレポートPDFを仕上げています',
      birthDateRequired: '生年月日情報が確認できないため、占星術PDFを作成できません。プロフィールカードで生年月日を先に入力してください。',
      birthTimeRequired: '占星術PDFはアセンダントとハウス計算のために出生時間が必要です。プロフィールカードで出生時間を先に入力してください。',
      timezoneRequired: '占星術PDFは正確なハウス計算のために出生地のタイムゾーンが必要です。プロフィールカードで出生地域をもう一度選択してください。',
      birthplaceRequired: '占星術PDFはアセンダント・ハウス・天頂点計算のために出生地が必要です。プロフィールカードで出生地域を先に選択してください。',
      statusCheckFailed: '状態確認に失敗しました',
      progressLocal: '惑星座標とハウスが映す人生の場面を整えています',
      progressSeed: 'チャートの核心象徴を相談目次へ編んでいます',
      progressWriting: '12章の相談文を順番に紡いでいます',
      progressValidated: '章の流れと言葉の質感を最後に見つめています',
      progressRendering: 'コズミックレポートPDFを編集しています',
      progressRendered: 'PDF保存先を確認しています',
      progressFailed: 'コズミックレポートの作成が完了しませんでした',
      completed: '完了',
      progressPreparing: '占星術コズミックレポートPDFを準備しています',
      animationTitles: ['出生情報を確認しています', 'レポートセッションを開いています', '惑星座標とハウスを計算しています'],
      checkingProfile: 'プロフィール情報を確認中',
      preparingPayment: '決済とセッションを準備中',
      requestingChart: '出生チャート計算を依頼中',
      manuscriptNotReady: '占星術プレミアム原稿の検証がまだ完了していません。しばらくしてからもう一度お試しください。',
      resultNotSaved: '占星術PDF結果がまだ完全に保存されていません。しばらくしてからもう一度お試しください。',
      emptyChapters: '占星術チャプターデータが空です。',
      checkingPdfArchive: 'PDF保存情報を確認しています',
      renderingPdf: 'PDFを編集/レンダリング中',
      generationFailed: '生成に失敗しました',
      statusGenerationFailed: '占星術PDFの生成に失敗しました。',
      generationTimeout: '占星術PDFの生成時間が超過しました。しばらくしてからもう一度お試しください。',
      downloadUrlMissing: 'PDFダウンロードURLがまだ準備されていません。',
      downloadRequestFailed: function (status) { return 'PDFダウンロードリクエストに失敗しました。HTTP ' + status; },
      paymentModuleMissing: '決済モジュールが見つかりません。ページを再読み込みしてからもう一度お試しください。',
      premiumFeatureName: '占星術AI相談',
      paymentConfirmFailed: '決済確認中に問題が発生しました。しばらくしてからもう一度お試しください。',
      paymentModuleUnavailable: '決済モジュールを利用できません。',
      downloadNotReady: '占星術プレミアム原稿とPDF保存がまだ完了していません。しばらくしてからもう一度お試しください。',
      downloadAuthFailed: 'PDFダウンロード権限を確認できませんでした。ログイン状態を確認してからもう一度お試しください。',
      reportUrlNotReady: 'レポート保存URLがまだ準備されていません。しばらくしてからもう一度お試しください。'
    },
    'zh-CN': {
      defaultLocation: '韩国（首尔）',
      defaultUser: '用户',
      missingProfile: '找不到出生年月日信息。请先完成基础占星计算。',
      missingBirthPlace: '未输入出生地',
      missingTime: '未输入出生时间',
      female: '女性',
      male: '男性',
      dateYear: '年',
      dateDay: '日 ',
      chapterProgress: function (step, total, done) { return step + ' / ' + total + ' 章 ' + (done ? '完成' : '进行中'); },
      loadingFallback: '正在完成占星宇宙报告 PDF',
      birthDateRequired: '未确认出生日期信息，因此无法生成占星 PDF。请先在资料卡中输入出生日期。',
      birthTimeRequired: '占星 PDF 需要出生时间来计算上升星座与宫位。请先在资料卡中输入出生时间。',
      timezoneRequired: '占星 PDF 需要出生地时区才能准确计算宫位。请在资料卡中重新选择出生地区。',
      birthplaceRequired: '占星 PDF 需要出生地来计算上升、宫位与天顶。请先在资料卡中选择出生地区。',
      statusCheckFailed: '状态检查失败',
      progressLocal: '正在整理行星坐标与宫位映照的人生场景',
      progressSeed: '正在将星盘核心象征编成咨询目录',
      progressWriting: '正在依次撰写 12 个咨询章节',
      progressValidated: '正在最后确认章节流向与文字质感',
      progressRendering: '正在编辑宇宙报告 PDF',
      progressRendered: '正在确认 PDF 保存路径',
      progressFailed: '宇宙报告未能完成',
      completed: '完成',
      progressPreparing: '正在准备占星宇宙报告 PDF',
      animationTitles: ['正在确认出生信息', '正在开启报告会话', '正在计算行星坐标与宫位'],
      checkingProfile: '正在确认资料信息',
      preparingPayment: '正在准备支付与会话',
      requestingChart: '正在请求出生星盘计算',
      manuscriptNotReady: '占星高级稿件验证尚未完成。请稍后再试。',
      resultNotSaved: '占星 PDF 结果尚未完全保存。请稍后再试。',
      emptyChapters: '占星章节数据为空。',
      checkingPdfArchive: '正在确认 PDF 保存信息',
      renderingPdf: '正在编辑/渲染 PDF',
      generationFailed: '生成失败',
      statusGenerationFailed: '占星 PDF 生成失败。',
      generationTimeout: '占星 PDF 生成超时。请稍后再试。',
      downloadUrlMissing: 'PDF 下载 URL 尚未准备好。',
      downloadRequestFailed: function (status) { return 'PDF 下载请求失败。HTTP ' + status; },
      paymentModuleMissing: '找不到支付模块。请刷新页面后重试。',
      premiumFeatureName: '占星 AI 咨询',
      paymentConfirmFailed: '确认支付时发生问题。请稍后再试。',
      paymentModuleUnavailable: '支付模块不可用。',
      downloadNotReady: '占星高级稿件与 PDF 保存尚未完成。请稍后再试。',
      downloadAuthFailed: '无法确认 PDF 下载权限。请检查登录状态后重试。',
      reportUrlNotReady: '报告保存 URL 尚未准备好。请稍后再试。'
    },
    'zh-TW': {
      defaultLocation: '韓國（首爾）',
      defaultUser: '使用者',
      missingProfile: '找不到出生年月日資訊。請先完成基礎占星計算。',
      missingBirthPlace: '未輸入出生地',
      missingTime: '未輸入出生時間',
      female: '女性',
      male: '男性',
      dateYear: '年',
      dateDay: '日 ',
      chapterProgress: function (step, total, done) { return step + ' / ' + total + ' 章 ' + (done ? '完成' : '進行中'); },
      loadingFallback: '正在完成占星宇宙報告 PDF',
      birthDateRequired: '未確認出生日期資訊，因此無法生成占星 PDF。請先在資料卡中輸入出生日期。',
      birthTimeRequired: '占星 PDF 需要出生時間來計算上升星座與宮位。請先在資料卡中輸入出生時間。',
      timezoneRequired: '占星 PDF 需要出生地時區才能準確計算宮位。請在資料卡中重新選擇出生地區。',
      birthplaceRequired: '占星 PDF 需要出生地來計算上升、宮位與天頂。請先在資料卡中選擇出生地區。',
      statusCheckFailed: '狀態檢查失敗',
      progressLocal: '正在整理行星座標與宮位映照的人生場景',
      progressSeed: '正在將星盤核心象徵編成諮詢目錄',
      progressWriting: '正在依序撰寫 12 個諮詢章節',
      progressValidated: '正在最後確認章節流向與文字質感',
      progressRendering: '正在編輯宇宙報告 PDF',
      progressRendered: '正在確認 PDF 儲存路徑',
      progressFailed: '宇宙報告未能完成',
      completed: '完成',
      progressPreparing: '正在準備占星宇宙報告 PDF',
      animationTitles: ['正在確認出生資訊', '正在開啟報告會話', '正在計算行星座標與宮位'],
      checkingProfile: '正在確認資料資訊',
      preparingPayment: '正在準備付款與會話',
      requestingChart: '正在請求出生星盤計算',
      manuscriptNotReady: '占星進階稿件驗證尚未完成。請稍後再試。',
      resultNotSaved: '占星 PDF 結果尚未完全儲存。請稍後再試。',
      emptyChapters: '占星章節資料為空。',
      checkingPdfArchive: '正在確認 PDF 儲存資訊',
      renderingPdf: '正在編輯/渲染 PDF',
      generationFailed: '生成失敗',
      statusGenerationFailed: '占星 PDF 生成失敗。',
      generationTimeout: '占星 PDF 生成逾時。請稍後再試。',
      downloadUrlMissing: 'PDF 下載 URL 尚未準備好。',
      downloadRequestFailed: function (status) { return 'PDF 下載請求失敗。HTTP ' + status; },
      paymentModuleMissing: '找不到付款模組。請重新整理頁面後再試。',
      premiumFeatureName: '占星 AI 諮詢',
      paymentConfirmFailed: '確認付款時發生問題。請稍後再試。',
      paymentModuleUnavailable: '付款模組無法使用。',
      downloadNotReady: '占星進階稿件與 PDF 儲存尚未完成。請稍後再試。',
      downloadAuthFailed: '無法確認 PDF 下載權限。請檢查登入狀態後再試。',
      reportUrlNotReady: '報告儲存 URL 尚未準備好。請稍後再試。'
    }
  };

  function _astroBookLocale() {
    try {
      var stored = localStorage.getItem('cd_lang');
      if (stored) return _normalizeAstroBookLocale(stored);
    } catch (_) {}
    try {
      var cookie = String(document.cookie || '').match(/(?:^|;\s*)cd_locale=([^;]+)/);
      if (cookie && cookie[1]) return _normalizeAstroBookLocale(decodeURIComponent(cookie[1]));
    } catch (_) {}
    try {
      var lang = document.documentElement && (document.documentElement.getAttribute('data-cd-lang') || document.documentElement.lang);
      if (lang) return _normalizeAstroBookLocale(lang);
    } catch (_) {}
    return 'ko';
  }

  function _normalizeAstroBookLocale(locale) {
    var value = String(locale || '').trim().toLowerCase().replace('_', '-');
    if (value === 'en' || value.indexOf('en-') === 0) return 'en';
    if (value === 'ja' || value.indexOf('ja-') === 0) return 'ja';
    if (value === 'zh' || value === 'zh-cn' || value === 'zh-hans') return 'zh-CN';
    if (value === 'zh-tw' || value === 'zh-hant' || value === 'zh-hk' || value === 'zh-mo') return 'zh-TW';
    return 'ko';
  }

  function _astroBookText() {
    var locale = _astroBookLocale();
    return ASTRO_BOOK_TEXT_TRANSLATIONS[locale] || ASTRO_BOOK_TEXT_TRANSLATIONS.ko;
  }

  function _withPdfArchiveFormat(url, format) {
    var value = _clean(url);
    var targetFormat = _clean(format) || 'pdf';
    if (!value || value.indexOf('/api/premium/pdf-archive/') < 0) return value;
    if (/[?&]format=/i.test(value)) {
      return value.replace(/([?&]format=)[^&]+/i, '$1' + encodeURIComponent(targetFormat));
    }
    return value + (value.indexOf('?') >= 0 ? '&' : '?') + 'format=' + encodeURIComponent(targetFormat);
  }

  function _fetchWithTimeout(url, options, timeoutMs) {
    var ms = Math.max(1000, Number(timeoutMs || 0) || 30000);
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = null;
    var requestOptions = options || {};
    if (controller) {
      requestOptions = Object.assign({}, requestOptions, { signal: controller.signal });
      timer = setTimeout(function () { controller.abort(); }, ms);
    }
    return fetch(url, requestOptions).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  function _logFlow(code, meta) {
    try {
      console.info('[AstroBook][Flow] ' + code, meta || {});
    } catch (_) {}
  }

  function normalizeAstroError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        status: error.status,
        code: error.code,
        originalCode: error.originalCode,
        stage: error.stage,
        payloadSafe: error.payloadSafe,
        details: _safeDiagnosticValue(error.details || (error.payloadSafe && error.payloadSafe.details), 3),
      };
    }
    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.parse(JSON.stringify(error));
      } catch (_) {
        return { message: String(error) };
      }
    }
    return { message: String(error) };
  }

  function _shortList(value, limit) {
    var source = Array.isArray(value) ? value : [];
    return source.map(function (item) { return _clean(item); }).filter(Boolean).slice(0, Math.max(1, Number(limit || 6)));
  }

  function _safeDiagnosticValue(value, depth) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      var text = _clean(value);
      return text ? text.slice(0, 500) : undefined;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      return value.slice(0, 12).map(function (item) {
        return _safeDiagnosticValue(item, Math.max(0, Number(depth || 0) - 1));
      }).filter(function (item) { return item !== undefined; });
    }
    if (typeof value === 'object') {
      if (Number(depth || 0) <= 0) return '[object]';
      var out = {};
      Object.keys(value).slice(0, 24).forEach(function (key) {
        var safeKey = _clean(key);
        if (!safeKey || /(token|authorization|password|secret|api[_-]?key|access[_-]?grant)/i.test(safeKey)) return;
        var safeValue = _safeDiagnosticValue(value[key], Number(depth || 0) - 1);
        if (safeValue !== undefined) out[safeKey] = safeValue;
      });
      return Object.keys(out).length ? out : undefined;
    }
    return _clean(value) || undefined;
  }

  function _payloadSafe(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.error && typeof data.error === 'object' ? data.error : {};
    var debugSafe = data.debugSafe && typeof data.debugSafe === 'object' ? data.debugSafe : {};
    return {
      code: _clean(data.code || nested.code || data.errorCode || nested.errorCode) || undefined,
      originalCode: _clean(data.originalCode || debugSafe.originalCode || nested.originalCode || data.errorCode || nested.errorCode) || undefined,
      message: _clean(data.message || nested.message || data.reasonMessage || nested.reasonMessage) || undefined,
      stage: _clean(data.stage || data.failureStage || debugSafe.stage || nested.stage || nested.failureStage) || undefined,
      failureType: _clean(data.failureType || debugSafe.failureType || nested.failureType) || undefined,
      reportId: _clean(data.reportId || debugSafe.reportId || nested.reportId) || undefined,
      sessionId: _clean(data.sessionId || debugSafe.sessionId || nested.sessionId) || undefined,
      executionId: _clean(data.executionId || debugSafe.executionId || nested.executionId) || undefined,
      missing: _shortList(data.missing || nested.missing || data.hardMissingFields, 6),
      issues: _shortList(data.issues || nested.issues || data.errors || nested.errors, 6),
      debugSafe: _safeDiagnosticValue(debugSafe, 3),
      details: _safeDiagnosticValue(data.details || nested.details || data.debug || nested.debug || data.attempts || nested.attempts, 3)
    };
  }

  function _buildAstroApiError(pack, fallbackMessage, context) {
    var res = pack && pack.res ? pack.res : {};
    var payload = pack && pack.json && typeof pack.json === 'object'
      ? pack.json
      : (pack && pack.body && typeof pack.body === 'object' ? pack.body : {});
    var status = Number((pack && pack.status) || res.status || payload.status || payload.statusCode || 0);
    var safe = _payloadSafe(payload);
    var err = new Error(_clean(safe.message || fallbackMessage || ('HTTP ' + (status || ''))) || 'Astrology AI consultation request failed.');
    err.status = status || undefined;
    err.code = _clean(safe.code) || 'ASTRO_PREMIUM_REQUEST_FAILED';
    err.originalCode = _clean(safe.originalCode);
    err.stage = _clean(safe.stage || context && context.stage) || 'prepare';
    err.failureType = _clean(safe.failureType);
    err.reportId = _clean(safe.reportId || context && context.reportId);
    err.sessionId = _clean(safe.sessionId || context && context.sessionId);
    err.executionId = _clean(safe.executionId);
    err.missing = safe.missing;
    err.issues = safe.issues;
    err.details = safe.details;
    err.payloadSafe = safe;
    err.payload = payload;
    return err;
  }

  function _logStage(stage, meta) {
    try {
      console.info('[AstroBook][' + stage + ']', meta || {});
    } catch (_) {}
  }

  function _logError(error, meta) {
    try {
      var payloadSafe = error && error.payloadSafe
        ? error.payloadSafe
        : _payloadSafe((error && error.payload) || (error && typeof error === 'object' ? error : {}));
      console.error('[AstroBook][Error]', {
        serviceKey: 'astro-premium',
        featureKey: ASTRO_FEATURE_KEY,
        billingFeatureKey: ASTRO_BILLING_FEATURE_KEY,
        reportType: 'westernAstrologyPremium',
        stage: _clean(meta && meta.stage || error && error.stage || payloadSafe.stage) || 'unknown',
        message: String(error && error.message ? error.message : error || 'unknown'),
        status: Number(error && error.status ? error.status : 0) || null,
        code: _clean(error && error.code || payloadSafe.code) || 'ASTRO_PREMIUM_CLIENT_ERROR',
        originalCode: _clean(error && error.originalCode || payloadSafe.originalCode) || undefined,
        failureType: _clean(error && error.failureType || payloadSafe.failureType) || undefined,
        reportId: _clean(error && error.reportId || payloadSafe.reportId || meta && meta.reportId) || undefined,
        sessionId: _clean(error && error.sessionId || payloadSafe.sessionId || meta && meta.sessionId) || undefined,
        executionId: _clean(error && error.executionId || payloadSafe.executionId || meta && meta.executionId) || undefined,
        missing: _shortList(error && error.missing || payloadSafe.missing, 6),
        issues: _shortList(error && error.issues || payloadSafe.issues, 6),
        causeMessage: _clean(error && error.cause && (error.cause.message || error.cause)) || undefined,
        debugSafe: payloadSafe.debugSafe,
        payloadSafe: payloadSafe,
        details: _safeDiagnosticValue(error && error.details || payloadSafe.details || normalizeAstroError(error), 3),
      });
    } catch (_) {}
  }

  function _persistPremiumAccessToken(token) {
    var value = String(token || '').trim();
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function _sanitizeText(v) {
    return String(v || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|api|debug|object|recovered|calculationmode|swiss_required|astro_chart_seed_failed)\b/gi, '')
      .replace(/chapter\s*1/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/internal\s*server\s*error/gi, '')
      .replace(/데이터\s*부족/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function _escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _renderAstroSectionBody(text) {
    var headingRe = /^(핵심 진단|차트 근거|현실에서 드러나는 모습|장점|주의점|상담사의 조언|실천 과제)$/;
    var src = String(text || '')
      .replace(/\r/g, '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|api|debug|object|recovered|calculationmode|swiss_required|astro_chart_seed_failed)\b/gi, '')
      .replace(/internal\s*server\s*error/gi, '')
      .replace(/데이터\s*부족/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .trim();
    return src
      .split(/\n+/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (line) {
        if (headingRe.test(line)) return '<h4 class="lb-sub-head">' + _escapeHtml(line) + '</h4>';
        return '<p class="lb-sub-paragraph">' + _escapeHtml(line) + '</p>';
      })
      .join('');
  }

  function _readPremiumAccessToken() {
    var t = '';
    try { t = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { t = ''; }
    if (!t) { try { t = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { t = ''; } }
    if (!t) { try { t = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { t = ''; } }
    return t;
  }

  function _extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var i = 0; i < keys.length; i += 1) {
      var found = String(payload[keys[i]] || '').trim();
      if (found) return found;
    }
    return _extractPremiumToken(payload.data)
      || _extractPremiumToken(payload.payload)
      || _extractPremiumToken(payload.payment)
      || _extractPremiumToken(payload._paymentContext)
      || _extractPremiumToken(payload.paymentContext)
      || _extractPremiumToken(payload.consume)
      || _extractPremiumToken(payload.access)
      || _extractPremiumToken(payload.accessGrant);
  }

  function _extractAccessGrant(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (payload.accessGrant && typeof payload.accessGrant === 'object') return payload.accessGrant;
    if (payload.access && typeof payload.access === 'object') return payload.access;
    return _extractAccessGrant(payload.data)
      || _extractAccessGrant(payload.payload)
      || _extractAccessGrant(payload.payment)
      || _extractAccessGrant(payload._paymentContext)
      || _extractAccessGrant(payload.paymentContext)
      || _extractAccessGrant(payload.consume);
  }

  function _normalizePremiumPayment(transactionId, payload) {
    var raw = payload && typeof payload === 'object' ? payload : {};
    var data = raw.data && typeof raw.data === 'object' ? raw.data : {};
    var nested = raw.payload && typeof raw.payload === 'object' ? raw.payload : {};
    var payment = raw.payment && typeof raw.payment === 'object' ? raw.payment : {};
    var context = raw._paymentContext && typeof raw._paymentContext === 'object' ? raw._paymentContext : {};
    var paymentContext = raw.paymentContext && typeof raw.paymentContext === 'object' ? raw.paymentContext : {};
    var consume = raw.consume && typeof raw.consume === 'object' ? raw.consume : {};
    var access = raw.access && typeof raw.access === 'object' ? raw.access : {};
    var grant = _extractAccessGrant(raw);
    var token = _extractPremiumToken(raw) || _readPremiumAccessToken();
    var tx = _clean(transactionId || raw.transactionId || data.transactionId || nested.transactionId || payment.transactionId || context.transactionId || paymentContext.transactionId || consume.transactionId || access.transactionId || raw.paymentId || data.paymentId || (grant && (grant.transactionId || grant.purchaseId || grant.requestId)));
    var requestId = _clean((grant && (grant.requestId || grant.transactionId)) || raw.requestId || data.requestId || nested.requestId || payment.requestId || context.requestId || paymentContext.requestId || consume.requestId || access.requestId || tx);
    var purchaseId = _clean((grant && grant.purchaseId) || raw.purchaseId || data.purchaseId || nested.purchaseId || payment.purchaseId || context.purchaseId || paymentContext.purchaseId || consume.purchaseId || access.purchaseId || raw.paymentId || data.paymentId || tx);
    var sessionId = _clean((grant && (grant.sessionId || grant.reportSessionId)) || raw.sessionId || data.sessionId || nested.sessionId || payment.sessionId || context.sessionId || paymentContext.sessionId || consume.sessionId || access.sessionId);
    var reportSessionId = _clean((grant && (grant.reportSessionId || grant.sessionId)) || raw.reportSessionId || data.reportSessionId || nested.reportSessionId || payment.reportSessionId || context.reportSessionId || paymentContext.reportSessionId || consume.reportSessionId || access.reportSessionId || sessionId);
    var reportId = _clean((grant && grant.reportId) || raw.reportId || data.reportId || nested.reportId || payment.reportId || context.reportId || paymentContext.reportId || consume.reportId || access.reportId);
    var normalized = {
      featureKey: ASTRO_BILLING_FEATURE_KEY,
      reportType: 'westernAstrologyPremium',
      premiumAccessToken: token || undefined,
      transactionId: tx || undefined,
      requestId: requestId || undefined,
      purchaseId: purchaseId || undefined,
      sessionId: sessionId || undefined,
      reportSessionId: reportSessionId || undefined,
      reportId: reportId || undefined,
    };
    if (grant) normalized.accessGrant = grant;
    if (Object.keys(consume).length) normalized.consume = consume;
    return normalized;
  }

  function _premiumTokenMatches(reportType) {
    var token = _readPremiumAccessToken();
    if (!token || typeof atob !== 'function') return false;
    try {
      var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      var actual = _clean(payload && payload.reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var expected = _clean(reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var aliases = ['westernastrologypremium', 'westernastrology', 'astropremium'];
      var matched = actual === expected || aliases.indexOf(actual) >= 0;
      var exp = Number(payload && payload.exp);
      return matched && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
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

  function _ensureCurrentAstroGenerationIds() {
    if (!_currentAstroSessionId) {
      _currentAstroSessionId = 'astrology_session_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }
    if (!_currentAstroReportId) {
      _currentAstroReportId = _currentAstroSessionId.replace(/^astrology_session_/, 'astrology_');
    }
    if (!_currentAstroPaymentRequestId) {
      _currentAstroPaymentRequestId = _currentAstroSessionId + ':pay';
    }
    return {
      sessionId: _currentAstroSessionId,
      reportId: _currentAstroReportId,
      requestId: _currentAstroPaymentRequestId
    };
  }

  function _bindPaymentToCurrentGeneration(payment) {
    var context = _ensureCurrentAstroGenerationIds();
    var next = payment && typeof payment === 'object' ? payment : {};
    next.sessionId = _clean(next.sessionId || context.sessionId) || undefined;
    next.reportSessionId = _clean(next.reportSessionId || next.sessionId || context.sessionId) || undefined;
    next.reportId = _clean(next.reportId || context.reportId) || undefined;
    next.requestId = _clean(next.requestId || context.requestId) || undefined;
    next.purchaseId = _clean(next.purchaseId || (next.accessGrant && next.accessGrant.purchaseId) || next.transactionId) || undefined;
    next.transactionId = _clean(next.transactionId || next.purchaseId || next.requestId) || undefined;
    next.featureKey = _clean(next.featureKey || ASTRO_BILLING_FEATURE_KEY) || ASTRO_BILLING_FEATURE_KEY;
    next.reportType = _clean(next.reportType || 'westernAstrologyPremium') || 'westernAstrologyPremium';
    if (next.accessGrant && typeof next.accessGrant === 'object') {
      next.accessGrant.sessionId = _clean(next.accessGrant.sessionId || next.sessionId) || undefined;
      next.accessGrant.reportSessionId = _clean(next.accessGrant.reportSessionId || next.reportSessionId) || undefined;
      next.accessGrant.reportId = _clean(next.accessGrant.reportId || next.reportId) || undefined;
      next.accessGrant.requestId = _clean(next.accessGrant.requestId || next.requestId) || undefined;
      next.accessGrant.purchaseId = _clean(next.accessGrant.purchaseId || next.purchaseId) || undefined;
      next.accessGrant.transactionId = _clean(next.accessGrant.transactionId || next.transactionId || next.purchaseId) || undefined;
      next.accessGrant.featureKey = _clean(next.accessGrant.featureKey || ASTRO_BILLING_FEATURE_KEY) || ASTRO_BILLING_FEATURE_KEY;
      next.accessGrant.reportType = _clean(next.accessGrant.reportType || 'westernAstrologyPremium') || 'westernAstrologyPremium';
    }
    if (next.consume && typeof next.consume === 'object') {
      next.consume.sessionId = _clean(next.consume.sessionId || next.sessionId) || undefined;
      next.consume.reportSessionId = _clean(next.consume.reportSessionId || next.reportSessionId) || undefined;
      next.consume.reportId = _clean(next.consume.reportId || next.reportId) || undefined;
      next.consume.requestId = _clean(next.consume.requestId || next.requestId) || undefined;
      next.consume.purchaseId = _clean(next.consume.purchaseId || next.purchaseId) || undefined;
      next.consume.transactionId = _clean(next.consume.transactionId || next.transactionId || next.purchaseId) || undefined;
      next.consume.featureKey = _clean(next.consume.featureKey || ASTRO_BILLING_FEATURE_KEY) || ASTRO_BILLING_FEATURE_KEY;
      next.consume.reportType = _clean(next.consume.reportType || 'westernAstrologyPremium') || 'westernAstrologyPremium';
    }
    return next;
  }

  function _paymentMatchesCurrentGeneration(payment) {
    var context = _ensureCurrentAstroGenerationIds();
    var value = payment && typeof payment === 'object' ? payment : {};
    if (value.adminTestMode === true || value.adminBypass === true) return true;
    var hasPaymentEvidence = Boolean(value.transactionId || value.purchaseId || value.requestId || value.premiumAccessToken || value.accessGrant || value.consume);
    if (!hasPaymentEvidence) return false;
    var sessionId = _clean(value.sessionId || value.reportSessionId || value.accessGrant && (value.accessGrant.sessionId || value.accessGrant.reportSessionId) || value.consume && (value.consume.sessionId || value.consume.reportSessionId));
    var reportId = _clean(value.reportId || value.accessGrant && value.accessGrant.reportId || value.consume && value.consume.reportId);
    return sessionId === context.sessionId && reportId === context.reportId;
  }

  function _hasPremiumAccessForGeneration() {
    if (Date.now() < _premiumAccessVerifiedUntil && _paymentMatchesCurrentGeneration(_lastPremiumPayment)) return true;
    if (_premiumTokenMatches('westernAstrologyPremium') || Date.now() < _premiumPaidUntil) {
      _lastPremiumPayment = _bindPaymentToCurrentGeneration(_normalizePremiumPayment('', _lastPremiumPayment || {}));
      _markPremiumAccessVerified(25 * 60 * 1000);
      return true;
    }
    return false;
  }

  function _parseAstroBirthDateInput(value) {
    var raw = _clean(value);
    if (!raw) return null;
    var datePart = raw.split(/[T\s]/)[0] || raw;
    var parts = datePart.indexOf('-') >= 0 || datePart.indexOf('/') >= 0 || datePart.indexOf('.') >= 0
      ? datePart.split(/[-/.]/)
      : [datePart.replace(/\D/g, '').slice(0, 4), datePart.replace(/\D/g, '').slice(4, 6), datePart.replace(/\D/g, '').slice(6, 8)];
    if (parts.length < 3 || String(parts[0] || '').length < 4) return null;
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? { year: year, month: month, day: day }
      : null;
  }

  function _recoverBirthFromDOM() {
    try {
      var birthDateEl = document.getElementById('birthDate');
      var hourEl = document.getElementById('birthHour');
      var minEl = document.getElementById('birthMinute');
      var nameEl = document.getElementById('nameInput');
      var femaleEl = document.getElementById('genderFemale');
      var countryEl = document.getElementById('birthCountry');
      if (!birthDateEl || !birthDateEl.value) return null;
      var dateParts = _parseAstroBirthDateInput(birthDateEl.value);
      var y = Number(dateParts && dateParts.year);
      var m = Number(dateParts && dateParts.month);
      var d = Number(dateParts && dateParts.day);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
      var isFemale = !!(femaleEl && femaleEl.checked);
      var locationData = _readAstroDomLocation();
      if (!locationData || !_clean(locationData.label) || !Number.isFinite(Number(locationData.lat)) || !Number.isFinite(Number(locationData.lon))) return null;
      return {
        name: (nameEl && nameEl.value && nameEl.value.trim()) || _astroBookText().defaultUser,
        gender: isFemale ? 'F' : 'M',
        birth: {
          year: y,
          month: m,
          day: d,
          hour: hourEl && String(hourEl.value || '').trim() !== '' ? Number(hourEl.value) : null,
          minute: minEl && String(minEl.value || '').trim() !== '' ? Number(minEl.value) : 0,
        },
        location: locationData,
      };
    } catch (_) {
      return null;
    }
  }

  function _readAstroDomLocation() {
    try {
      var countryEl = document.getElementById('birthCountry');
      var opt = countryEl && countryEl.options ? countryEl.options[countryEl.selectedIndex] : null;
      if (!opt) return null;
      var lon = parseFloat(opt.getAttribute('data-long') || opt.getAttribute('data-lon') || opt.getAttribute('data-lng') || '126.9780');
      var lat = parseFloat(opt.getAttribute('data-lat') || '37.5665');
      var tzOffset = parseFloat(opt.getAttribute('data-tz') || opt.getAttribute('data-base-tz') || '9');
      return {
        label: _clean(opt.textContent || opt.getAttribute('data-label') || '') || '대한민국 (서울)',
        lat: Number.isFinite(lat) ? lat : 37.5665,
        lon: Number.isFinite(lon) ? lon : 126.9780,
        lng: Number.isFinite(lon) ? lon : 126.9780,
        tzOffset: Number.isFinite(tzOffset) ? tzOffset : 9,
        baseTzOffset: Number.isFinite(tzOffset) ? tzOffset : 9,
        tz: (opt && opt.value) || 'Asia/Seoul',
      };
    } catch (_) {
      return null;
    }
  }

  function _hasAstroBirth(candidate) {
    return !!(candidate && candidate.birth && Number.isFinite(Number(candidate.birth.year)));
  }

  function _scoreAstroProfileCandidate(candidate) {
    if (!_hasAstroBirth(candidate)) return -1;
    var birth = candidate.birth || {};
    var location = candidate.location || {};
    var score = 1;
    if (Number.isFinite(Number(birth.hour))) score += 2;
    if (_clean(location.label || candidate.birthPlace || candidate.locationName || candidate.place)) score += 2;
    if (Number.isFinite(Number(location.lat || candidate.latitude || candidate.lat))) score += 2;
    if (Number.isFinite(Number(location.lon != null ? location.lon : (location.lng != null ? location.lng : (candidate.longitude != null ? candidate.longitude : candidate.lng))))) score += 2;
    if (_clean(location.tz || location.timezone || candidate.timezone) || Number.isFinite(Number(location.tzOffset || candidate.tzOffset || candidate.timezoneOffsetHours))) score += 2;
    if (candidate === window.__cdCurrentDestinyProfile) score += 1;
    return score;
  }

  function _getActiveBirthProfile() {
    var candidates = [];
    try {
      if (typeof window.__cdGetCurrentDestinyProfile === 'function') candidates.push(window.__cdGetCurrentDestinyProfile());
    } catch (_) {}
    try { candidates.push(window.__cdCurrentDestinyProfile || null); } catch (_) {}
    candidates.push(_recoverBirthFromDOM());
    try { candidates.push(window.__cdActiveBirthProfile || null); } catch (_) {}
    try { candidates.push(window.__destinyFlowerSajuSnapshot || null); } catch (_) {}
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < candidates.length; i += 1) {
      var score = _scoreAstroProfileCandidate(candidates[i]);
      if (score > bestScore) {
        best = candidates[i];
        bestScore = score;
      }
    }
    return bestScore >= 0 ? best : null;
  }

  function _showScreen(screenId) {
    var ids = ['abNoProfileScreen', 'abStartScreen', 'abLoadingScreen', 'abResultScreen', 'abErrorScreen'];
    ids.forEach(function (id) {
      var el = _qs(id);
      if (!el) return;
      el.style.display = (id === screenId) ? '' : 'none';
    });
  }

  function _setError(msg) {
    var raw = String(msg || '');
    var message = _sanitizeText(msg);
    if (/PAYMENT_CONFIRMED_BUT_ACCESS_MISSING|결제는 확인되었지만/i.test(raw)) {
      message = '결제는 확인되었지만 생성 권한 연결이 아직 완료되지 않았습니다. 잠시 후 다시 시도하면 중복 결제 없이 이어서 확인합니다.';
    } else if (/ASTRO_PAYMENT_CANCELLED|결제\s*취소|payment\s*cancel/i.test(raw)) {
      message = '결제가 완료되지 않았습니다. 결제 내역은 생성되지 않았으며, 원하실 때 다시 생성할 수 있습니다.';
    } else if (/internal\s*server\s*error|\bobject\b|ASTRO_PREMIUM|ASTRO_REPORT|ASTRO_CHART|PDF 결과|원고|검증|시간이 초과|생성 실패|생성 오류|HTTP\s*5/i.test(raw)) {
      message = '점성술 AI 상담이 완료되지 않았습니다. 결제 권한은 보존되며, 잠시 후 결제 내역을 확인한 뒤 다시 시도해 주세요.';
    }
    var el = _qs('abErrorMsg');
    if (el) el.textContent = message || '생성 중 오류가 발생했습니다.';
    _showScreen('abErrorScreen');
  }

  function _resolveAstroStoredUrl(payload) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    var fallbackArchive = p.reportId ? ('/api/premium/pdf-archive/' + encodeURIComponent(String(p.reportId))) : '';
    return _withPdfArchiveFormat(_clean(
      p.downloadUrl
      || p.pdfUrl
      || p.htmlUrl
      || ready.downloadUrl
      || ready.pdfUrl
      || ready.htmlUrl
      || fallbackArchive
    ), 'pdf');
  }

  function _isCompletedReportReady(response) {
    var payload = response || {};
    var chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
    var total = _getTotalChapters();
    var hasReportId = !!_clean(payload.reportId);
    var hasStoredUrl = !!_resolveAstroStoredUrl(payload);
    var completed = _clean(payload.status || '').toLowerCase();
    var chapterComplete = chapters.length >= total;
    if (payload.isMock === true || _clean(payload.provider).toLowerCase() === 'mock') {
      return hasReportId && hasStoredUrl && chapterComplete && completed === 'completed';
    }
    return hasReportId && hasStoredUrl && chapterComplete && completed === 'completed' && _hasAstroLlmOnlyReady(payload, total);
  }

  function _hasAstroLlmOnlyReady(payload, totalOverride) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    if (p.isMock === true || ready.isMock === true || _clean(p.provider || ready.provider).toLowerCase() === 'mock') {
      return Number(p.tokensUsed || ready.tokensUsed || 0) === 0 && Number(p.cost || ready.cost || 0) === 0;
    }
    var total = Number(totalOverride || _getTotalChapters() || ASTRO_TOTAL_CHAPTERS || 15);
    var llmAssembly = p.llmAssembly && typeof p.llmAssembly === 'object'
      ? p.llmAssembly
      : (ready.llmAssembly && typeof ready.llmAssembly === 'object' ? ready.llmAssembly : {});
    var quality = p.quality && typeof p.quality === 'object' ? p.quality : {};
    var pdfQuality = p.pdfQuality && typeof p.pdfQuality === 'object' ? p.pdfQuality : {};
    var validation = p.validation && typeof p.validation === 'object' ? p.validation : {};
    var completion = p.pdfCompletionValidation && typeof p.pdfCompletionValidation === 'object'
      ? p.pdfCompletionValidation
      : (ready.pdfCompletionValidation && typeof ready.pdfCompletionValidation === 'object' ? ready.pdfCompletionValidation : {});
    var source = _clean(p.manuscriptSource || ready.manuscriptSource || quality.manuscriptSource || llmAssembly.source).toLowerCase();
    var llmDraftChapterCount = Number(p.llmDraftChapterCount || ready.llmDraftChapterCount || llmAssembly.chapterCount || p.chapterCount || ready.chapterCount || 0);
    var expectedChapterCount = Number(p.expectedChapterCount || ready.expectedChapterCount || llmAssembly.expectedChapterCount || total);
    var qualityOk = quality.ok !== false && pdfQuality.ok !== false && validation.ok !== false && completion.ok !== false;
    var sourceOk = source === 'astrology-premium-llm-only' || p.llmAssemblyOnly === true || ready.llmAssemblyOnly === true;
    return sourceOk
      && llmDraftChapterCount === total
      && expectedChapterCount === total
      && qualityOk
      && llmAssembly.enabled === true
      && llmAssembly.externalGeneration === true
      && llmAssembly.fallbackUsed !== true
      && Number(llmAssembly.chapterCount || 0) === total
      && Number(llmAssembly.expectedChapterCount || 0) === total
      && _clean(llmAssembly.promptVersion || p.generationMode || ready.manuscriptSource);
  }

  function _setStartBusy(isBusy) {
    var btn = _qs('abStartBtn');
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function _signFromIndex(index) {
    var n = Number(index);
    if (!Number.isFinite(n)) return '';
    return ASTRO_SIGN_NAMES[((Math.floor(n) % 12) + 12) % 12] || '';
  }

  function _signFromLongitude(longitude) {
    var n = Number(longitude);
    if (!Number.isFinite(n)) return '';
    return _signFromIndex(Math.floor((((n % 360) + 360) % 360) / 30));
  }

  function _readSign(node) {
    if (!node) return '';
    if (typeof node === 'string') return _clean(node);
    if (typeof node === 'number') return _signFromIndex(node);
    if (typeof node !== 'object') return '';
    var direct = _clean(node.signKo || node.signName || node.name || node.value);
    if (direct) return direct;
    if (typeof node.sign === 'string') return _clean(node.sign);
    if (typeof node.sign === 'number') return _signFromIndex(node.sign);
    if (node.sign && typeof node.sign === 'object') return _readSign(node.sign);
    return _signFromLongitude(node.longitude);
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
    for (var i = 0; i < bases.length; i++) {
      var base = String(bases[i] || '').trim();
      var url = base ? (base.replace(/\/+$/, '') + path) : path;
      if (seen[url]) continue;
      seen[url] = true;
      out.push(url);
    }
    return out;
  }

  function _formatBirth(profile) {
    var birth = (profile && profile.birth) || {};
    var y = Number(birth.year || 0);
    var m = Number(birth.month || 0);
    var d = Number(birth.day || 0);
    var h = Number(birth.hour);
    var mm = Number(birth.minute || 0);
    var hasTime = Number.isFinite(h);
    return {
      birthDate: [String(y).padStart(4, '0'), String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('-'),
      birthTime: hasTime ? [String(h).padStart(2, '0'), String(Number.isFinite(mm) ? mm : 0).padStart(2, '0')].join(':') : '',
    };
  }

  function _parseBirthTimeInput(rawTime, rawHour, rawMinute) {
    var text = _clean(rawTime);
    if (/모름|미상|unknown|none|na/i.test(text)) {
      return { birthTime: '', birthHour: null, birthMinute: 0, isTimeUnknown: true };
    }
    var hhmm = text.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})/);
    if (hhmm) {
      var h1 = Math.max(0, Math.min(23, Number(hhmm[1])));
      var m1 = Math.max(0, Math.min(59, Number(hhmm[2])));
      return {
        birthTime: String(h1).padStart(2, '0') + ':' + String(m1).padStart(2, '0'),
        birthHour: h1,
        birthMinute: m1,
        isTimeUnknown: false,
      };
    }
    var korean = text.match(/오(전|후)\s*(\d{1,2})(?:\s*[:시]\s*(\d{1,2}))?/);
    if (korean) {
      var isPm = korean[1] === '후';
      var h2 = Math.max(0, Math.min(23, Number(korean[2])));
      var m2 = Math.max(0, Math.min(59, Number(korean[3] || 0)));
      if (isPm && h2 < 12) h2 += 12;
      if (!isPm && h2 === 12) h2 = 0;
      return {
        birthTime: String(h2).padStart(2, '0') + ':' + String(m2).padStart(2, '0'),
        birthHour: h2,
        birthMinute: m2,
        isTimeUnknown: false,
      };
    }
    var h3 = Number(rawHour);
    var m3 = Number(rawMinute || 0);
    if (!Number.isFinite(h3) && /^\d{1,2}$/.test(text)) h3 = Number(text);
    if (Number.isFinite(h3)) {
      h3 = Math.max(0, Math.min(23, Math.trunc(h3)));
      m3 = Number.isFinite(m3) ? Math.max(0, Math.min(59, Math.trunc(m3))) : 0;
      return {
        birthTime: String(h3).padStart(2, '0') + ':' + String(m3).padStart(2, '0'),
        birthHour: h3,
        birthMinute: m3,
        isTimeUnknown: false,
      };
    }
    return { birthTime: '', birthHour: null, birthMinute: 0, isTimeUnknown: true };
  }

  function _parseTimezoneOffsetLiteral(value) {
    if (value === 0) return 0;
    var raw = _clean(value);
    if (!raw) return NaN;
    var direct = Number(raw);
    if (Number.isFinite(direct)) return direct;
    var lower = raw.toLowerCase();
    if (lower === 'asia/seoul' || lower === 'asia/jeju' || lower === 'kst' || lower === 'korea standard time' || lower === 'korean standard time') return 9;
    if (lower === 'asia/tokyo' || lower === 'jst' || lower === 'japan standard time') return 9;
    if (lower === 'utc' || lower === 'gmt' || lower === 'z' || lower === 'zulu') return 0;
    var match = raw.match(/^(?:utc|gmt)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i);
    if (!match) return NaN;
    var hour = Number(match[2]);
    var minute = Number(match[3] || 0);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
    return (match[1] === '-' ? -1 : 1) * (hour + minute / 60);
  }

  function _resolveTimezoneOffsetHours(timezone, parts) {
    var literal = _parseTimezoneOffsetLiteral(timezone);
    if (Number.isFinite(literal)) return literal;
    var raw = _clean(timezone);
    if (!raw || raw.indexOf('/') < 0 || typeof Intl === 'undefined' || !Intl.DateTimeFormat) return NaN;
    try {
      var p = parts || {};
      var year = Number(p.year || p.birthYear);
      var month = Number(p.month || p.birthMonth);
      var day = Number(p.day || p.birthDay);
      var hour = Number(p.hour != null ? p.hour : p.birthHour);
      var minute = Number(p.minute != null ? p.minute : p.birthMinute);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return NaN;
      var date = new Date(Date.UTC(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0));
      var formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: raw,
        timeZoneName: 'shortOffset',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(date);
      for (var i = 0; i < formatted.length; i += 1) {
        if (formatted[i].type === 'timeZoneName') return _parseTimezoneOffsetLiteral(formatted[i].value);
      }
    } catch (_) {}
    return NaN;
  }

  function _pickAstroTimezoneOffset(profile, location) {
    var p = profile || {};
    var l = location || {};
    var values = [
      l.tzOffset,
      l.tzOffsetHours,
      l.timezoneOffsetHours,
      l.timezoneOffsetHour,
      l.timezoneOffset,
      l.utcOffsetHours,
      l.utcOffset,
      l.baseTzOffset,
      l.baseTimezoneOffset,
      p.timezoneOffsetHours,
      p.timezoneOffsetHour,
      p.tzOffsetHours,
      p.tzOffset,
      p.utcOffsetHours,
      p.utcOffset,
      p.baseTzOffset,
      p.baseTimezoneOffset
    ];
    for (var i = 0; i < values.length; i += 1) {
      if (values[i] == null || values[i] === '') continue;
      return values[i];
    }
    return null;
  }

  function _normalizeAstroBirthInput(profile) {
    var p = profile || {};
    var b = p.birth || {};
    var domLocation = _readAstroDomLocation() || {};
    var l = Object.assign({}, domLocation, p.location || {});
    var year = Number(b.year || p.birthYear || 0);
    var month = Number(b.month || p.birthMonth || 0);
    var day = Number(b.day || p.birthDay || 0);
    var parsedTime = _parseBirthTimeInput(
      b.time || b.birthTime || p.birthTime || '',
      b.hour != null ? b.hour : p.birthHour,
      b.minute != null ? b.minute : p.birthMinute
    );
    var tz = _clean(l.tz || l.timezone || p.timezone || '');
    var rawTzOffset = _pickAstroTimezoneOffset(p, l);
    var tzOffset = Number(rawTzOffset);
    if (!Number.isFinite(tzOffset)) {
      tzOffset = _resolveTimezoneOffsetHours(tz, {
        year: year,
        month: month,
        day: day,
        hour: parsedTime.birthHour,
        minute: parsedTime.birthMinute
      });
    }
    if (!tz && Number.isFinite(tzOffset)) tz = String(tzOffset);
    var gender = _clean(p.gender).toLowerCase();
    var normGender = 'unknown';
    if (gender === 'm' || gender === 'male' || gender.indexOf('남') >= 0) normGender = 'male';
    if (gender === 'f' || gender === 'female' || gender.indexOf('여') >= 0) normGender = 'female';
    return {
      name: _clean(p.name) || undefined,
      gender: normGender,
      birthDate: [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-'),
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthTime: parsedTime.birthTime,
      birthHour: parsedTime.birthHour,
      birthMinute: parsedTime.birthMinute,
      timezone: tz,
      timezoneOffsetHours: Number.isFinite(tzOffset) ? tzOffset : null,
      baseTzOffset: Number.isFinite(tzOffset) ? tzOffset : null,
      birthPlace: _clean(l.label || l.name || p.birthPlace || p.place || p.locationName || ''),
      latitude: Number.isFinite(Number(l.lat != null ? l.lat : (l.latitude != null ? l.latitude : p.latitude))) ? Number(l.lat != null ? l.lat : (l.latitude != null ? l.latitude : p.latitude)) : null,
      longitude: Number.isFinite(Number(l.lon != null ? l.lon : (l.lng != null ? l.lng : (l.longitude != null ? l.longitude : (p.longitude != null ? p.longitude : (p.lng != null ? p.lng : p.lon)))))) ? Number(l.lon != null ? l.lon : (l.lng != null ? l.lng : (l.longitude != null ? l.longitude : (p.longitude != null ? p.longitude : (p.lng != null ? p.lng : p.lon))))) : null,
      isTimeUnknown: !!parsedTime.isTimeUnknown,
    };
  }

  function _validateBirthInputBeforePayment(birthInput) {
    var hasBirthDate = !!_clean(birthInput && birthInput.birthDate);
    var hasBirthYmd = Number.isFinite(Number(birthInput && birthInput.birthYear))
      && Number.isFinite(Number(birthInput && birthInput.birthMonth))
      && Number.isFinite(Number(birthInput && birthInput.birthDay));
    if (!hasBirthDate || !hasBirthYmd) {
      return { ok: false, message: _astroBookText().birthDateRequired };
    }
    if (!_clean(birthInput && birthInput.birthPlace)
      || !Number.isFinite(Number(birthInput && birthInput.latitude))
      || !Number.isFinite(Number(birthInput && birthInput.longitude))) {
      return { ok: false, message: _astroBookText().birthplaceRequired };
    }
    if (!Number.isFinite(Number(birthInput && birthInput.timezoneOffsetHours))) {
      return { ok: false, message: _astroBookText().timezoneRequired };
    }
    return { ok: true };
  }

  function _buildChartFromLocal(profile) {
    if (typeof window.calcAstroSwissChartOrThrow !== 'function') return null;
    try {
      var birth = profile.birth || {};
      var location = profile.location || {};
      var hour = Number(birth.hour);
      if (!Number.isFinite(hour)) return null;
      var localHour = hour + Number(birth.minute || 0) / 60;
      var lat = Number(location.lat != null ? location.lat : 37.5665);
      var lon = Number(location.lon != null ? location.lon : (location.lng != null ? location.lng : 126.9780));
      var rawTz = location.tzOffset != null ? location.tzOffset : (location.timezoneOffset != null ? location.timezoneOffset : (location.utcOffset != null ? location.utcOffset : location.timezone || location.tz));
      var tz = _resolveTimezoneOffsetHours(rawTz, {
        year: birth.year,
        month: birth.month,
        day: birth.day,
        hour: birth.hour,
        minute: birth.minute
      });
      if (!Number.isFinite(tz)) return null;
      var hs = (typeof window !== 'undefined' && window.ASTRO_HOUSE_SYSTEM) ? window.ASTRO_HOUSE_SYSTEM : 'P';
      var chart = window.calcAstroSwissChartOrThrow(
        Number(birth.year),
        Number(birth.month),
        Number(birth.day),
        localHour,
        lat,
        lon,
        tz,
        hs,
      );
      return chart;
    } catch (_) {
      return null;
    }
  }

  function _buildPlanets(chart) {
    var planets = [];
    var dict = (chart && chart.planets) ? chart.planets : {};
    var keys = Object.keys(dict || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var p = dict[k] || {};
      var signName = _readSign(p);
      planets.push({
        name: k,
        sign: signName,
        degree: Number(p.degree != null ? p.degree : (p.deg != null ? p.deg : (p.sign && p.sign.deg))),
        house: Number(p.house || 0) || undefined,
        retrograde: Boolean(p.retrograde || p.retro),
      });
    }
    return planets;
  }

  function _buildHouses(chart) {
    var houses = [];
    var h = (chart && chart.houses) ? chart.houses : {};
    if ((!h || !Object.keys(h).length) && Array.isArray(chart && chart.houseCusps)) {
      for (var c = 0; c < chart.houseCusps.length && c < 12; c++) {
        var lon = Number(chart.houseCusps[c]);
        houses.push({
          house: c + 1,
          sign: _signFromLongitude(lon),
          degree: Number.isFinite(lon) ? Math.round((((lon % 30) + 30) % 30) * 100) / 100 : undefined,
        });
      }
      return houses;
    }
    for (var i = 1; i <= 12; i++) {
      var node = h['h' + i] || {};
      houses.push({
        house: i,
        sign: _readSign(node),
        degree: Number(node.degree != null ? node.degree : (node.deg != null ? node.deg : (node.sign && node.sign.deg))),
      });
    }
    return houses;
  }

  function _buildAspects(chart) {
    var aspects = [];
    var arr = (chart && chart.natal && Array.isArray(chart.natal.aspects)) ? chart.natal.aspects : (Array.isArray(chart && chart.aspects) ? chart.aspects : []);
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i] || {};
      aspects.push({
        planetA: _clean(a.a || a.p1 || a.planetA),
        planetB: _clean(a.b || a.p2 || a.planetB),
        type: _clean(a.type || a.aspect),
        orb: Number(a.orb),
        strength: _clean(a.strength),
      });
    }
    return aspects;
  }

  function _buildAstroBaseFromChart(profile, chart) {
    var birthFmt = _formatBirth(profile);
    if (!chart) return null;

    var planetMap = (chart && chart.planets) || {};
    var sunSign = _readSign(chart.sun || chart.Sun || planetMap.Sun);
    var moonSign = _readSign(chart.moon || chart.Moon || planetMap.Moon);
    var asc = _readSign(chart.asc || chart.ascendant);
    var mc = _readSign(chart.mc || chart.midheaven);

    return {
      user: {
        name: _clean(profile.name) || '사용자',
        birthDate: birthFmt.birthDate,
        birthTime: birthFmt.birthTime,
        birthPlace: _clean(profile.location && profile.location.label) || '대한민국 (서울)',
        timezone: _clean(profile.location && profile.location.tz) || 'Asia/Seoul',
        gender: _clean(profile.gender),
      },
      chart: {
        sunSign: sunSign,
        moonSign: moonSign,
        ascendant: asc,
        midheaven: mc,
        planets: _buildPlanets(chart),
        houses: _buildHouses(chart),
        aspects: _buildAspects(chart),
      },
      timing: {
        yearlyThemes: [],
        monthlyThemes: [],
      },
    };
  }

  function _buildAstroBase(profile) {
    return _buildAstroBaseFromChart(profile, _buildChartFromLocal(profile));
  }

  function _buildWesternChartRequest(profile) {
    var birth = (profile && profile.birth) || {};
    var location = (profile && profile.location) || {};
    var hour = Number(birth.hour);
    var minute = Number(birth.minute || 0);
    var rawTzOffset = _pickAstroTimezoneOffset(profile, location) || location.timezone || location.tz;
    var tzOffset = _resolveTimezoneOffsetHours(rawTzOffset, {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      minute: birth.minute
    });
    return {
      year: Number(birth.year),
      month: Number(birth.month),
      day: Number(birth.day),
      hour: Number.isFinite(hour) ? hour : null,
      minute: Number.isFinite(minute) ? minute : 0,
      timezone: Number.isFinite(tzOffset) ? tzOffset : NaN,
      lat: Number(location.lat != null ? location.lat : 37.5665),
      lon: Number(location.lon != null ? location.lon : (location.lng != null ? location.lng : 126.9780)),
    };
  }

  function _fetchWesternChart(profile) {
    var endpoints = _buildApiCandidates(ASTRO_WESTERN_CHART_API);
    var body = _buildWesternChartRequest(profile);
    var idx = 0;

    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(new Error(lastErr || '점성술 계산 API 호출에 실패했습니다.'));
        return;
      }
      var url = endpoints[idx++];
      var headers = { 'Content-Type': 'application/json' };
      var authToken = '';
      try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        credentials: 'include',
        cache: 'no-store',
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok !== false) {
            resolve(pack.json);
            return;
          }
          run(resolve, reject, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (err) {
          run(resolve, reject, String(err && err.message || err || '요청 실패'));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _buildAstroBaseAsync(profile) {
    var localBase = _buildAstroBase(profile);
    if (localBase && localBase.chart && localBase.chart.sunSign && localBase.chart.moonSign && localBase.chart.ascendant) {
      _logFlow('ASTRO_SEED_OK', { source: 'local' });
      return Promise.resolve(localBase);
    }
    _logFlow('ASTRO_SEED_REMOTE_START');
    return _fetchWesternChart(profile).then(function (chart) {
      var remoteBase = _buildAstroBaseFromChart(profile, chart);
      if (!remoteBase || !remoteBase.chart || !remoteBase.chart.sunSign || !remoteBase.chart.moonSign || !remoteBase.chart.ascendant) {
        throw new Error('점성술 계산 결과가 PDF 생성에 필요한 구조와 맞지 않습니다.');
      }
      _logFlow('ASTRO_SEED_OK', { source: 'worker-western-chart' });
      return remoteBase;
    });
  }

  function _buildAstroClientEvidenceJson(profile, birthInput) {
    var localBase = _buildAstroBase(profile) || {};
    var chart = localBase.chart || {};
    var planets = Array.isArray(chart.planets) ? chart.planets : [];
    var houses = Array.isArray(chart.houses) ? chart.houses : [];
    var aspects = Array.isArray(chart.aspects) ? chart.aspects : [];
    var evidence = [
      chart.sunSign,
      chart.moonSign,
      chart.ascendant,
      chart.midheaven,
    ].concat(
      planets.slice(0, 12).map(function (planet) {
        return _clean(planet.name) + ' ' + _clean(planet.sign) + (planet.house ? ' ' + planet.house + 'H' : '');
      }),
      houses.slice(0, 12).map(function (house) {
        return _clean(house.house || house.number) + 'H ' + _clean(house.sign);
      }),
      aspects.slice(0, 16).map(function (aspect) {
        return _clean(aspect.pair || aspect.type || aspect.aspect);
      })
    ).map(_clean).filter(Boolean);

    return {
      schemaVersion: 'astro-premium-client-evidence.v1',
      source: 'browser-local-astro',
      chartAvailable: Boolean(chart.sunSign && chart.moonSign && chart.ascendant),
      evidenceCount: evidence.length,
      birthInput: {
        birthDate: _clean(birthInput && birthInput.birthDate),
        birthTime: _clean(birthInput && birthInput.birthTime),
        timezone: _clean(birthInput && birthInput.timezone),
        timezoneOffsetHours: Number.isFinite(Number(birthInput && birthInput.timezoneOffsetHours)) ? Number(birthInput.timezoneOffsetHours) : null,
        birthPlace: _clean(birthInput && birthInput.birthPlace),
      },
      coreSigns: {
        sun: _clean(chart.sunSign),
        moon: _clean(chart.moonSign),
        ascendant: _clean(chart.ascendant),
        midheaven: _clean(chart.midheaven),
      },
      planetCount: planets.length,
      houseCount: houses.length,
      aspectCount: aspects.length,
      evidence: evidence.slice(0, 40),
    };
  }

  function _renderProfileSummary(profile) {
    var el = _qs('abProfileSummary');
    if (!el) return;
    var copy = _astroBookText();
    if (!profile) {
      el.textContent = copy.missingProfile;
      return;
    }
    var birth = profile.birth || {};
    var place = (profile.location && profile.location.label) || copy.missingBirthPlace;
    var hour = Number(birth.hour);
    var minute = Number(birth.minute || 0);
    var time = Number.isFinite(hour)
      ? [String(hour).padStart(2, '0'), String(Number.isFinite(minute) ? minute : 0).padStart(2, '0')].join(':')
      : copy.missingTime;
    el.textContent = [
      (profile.name || copy.defaultUser) + ' · ' + (profile.gender === 'F' ? copy.female : profile.gender === 'M' ? copy.male : ''),
      [birth.year, birth.month, birth.day].filter(Boolean).join(copy.dateYear) + copy.dateDay + time,
      place,
    ].join(' · ');
  }

  function _setLoadingProgress(step, total, title, done, progressPercent) {
    var safeTotal = Math.max(1, Math.trunc(Number(total || 1)));
    var safeStep = Math.max(0, Math.min(safeTotal, Math.trunc(Number(step || 0))));
    var isDone = done === true;
    var pct = Number.isFinite(Number(progressPercent))
      ? Math.max(0, Math.min(100, Math.round(Number(progressPercent))))
      : Math.max(0, Math.min(100, Math.round((safeStep / safeTotal) * 100)));
    if (!isDone) pct = Math.min(92, pct);
    var bar = _qs('abProgressBar');
    var txt = _qs('abProgressText');
    var num = _qs('abLoadingChapterNum');
    var ch = _qs('abLoadingChapter');
    var copy = _astroBookText();
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = copy.chapterProgress(safeStep, safeTotal, isDone);
    if (num) num.textContent = 'Chapter ' + Math.max(1, safeStep || 1);
    if (ch) ch.textContent = _sanitizeText(title || copy.loadingFallback);

    var dots = document.querySelectorAll('.ab-ch-dot');
    Array.prototype.forEach.call(dots, function (dot) {
      var n = Number(dot.getAttribute('data-abch'));
      if (!Number.isFinite(n)) return;
      dot.style.display = n > safeTotal ? 'none' : '';
      dot.classList.toggle('lb-ch-dot--active', !isDone && n === Math.max(1, safeStep || 1));
      dot.classList.toggle('lb-ch-dot--done', isDone ? n <= safeStep : n < safeStep);
    });
  }

  function _getTotalChapters() {
    var fromCanonical = Array.isArray(_canonicalChapters) ? _canonicalChapters.length : 0;
    var fromResult = Array.isArray(_chapters) ? _chapters.length : 0;
    var fromState = Number(ASTRO_TOTAL_CHAPTERS || 0);
    var total = fromCanonical || fromResult || fromState || 1;
    return Math.max(1, Math.trunc(total));
  }

  function _stopProgressAnimation() {
    if (_progressTimer) {
      clearInterval(_progressTimer);
      _progressTimer = null;
    }
  }

  function _startProgressAnimation() {
    _stopProgressAnimation();
    var titles = _astroBookText().animationTitles;
    var total = _getTotalChapters();
    var idx = 0;
    _setLoadingProgress(0, total, titles[0]);
    _progressTimer = setInterval(function () {
      if (!_generating) {
        _stopProgressAnimation();
        return;
      }
      total = _getTotalChapters();
      idx = (idx + 1) % titles.length;
      _setLoadingProgress(0, total, titles[idx]);
    }, 2400);
  }

  function _renderResult(chapters, payload) {
    var toc = _qs('abToc');
    var content = _qs('abChapterContent');
    var n = _qs('abResultName');
    var d = _qs('abResultDate');
    if (toc) toc.innerHTML = '';
    if (content) content.innerHTML = '';
    if (n) n.textContent = '✨ ' + _sanitizeText(payload && payload.user && payload.user.name || '사용자') + '님의 코즈믹 리포트';
    if (d) d.textContent = _sanitizeText(payload && payload.user && payload.user.birthDate || '');

    chapters.forEach(function (chapter, idx) {
      if (toc) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lb-toc-item loaded';
        var tocLabel = _sanitizeText(chapter.roman || (String(chapter.order || (idx + 1)) + '장'));
        btn.textContent = tocLabel + '. ' + _sanitizeText(chapter.title);
        btn.addEventListener('click', function () {
          var sec = document.getElementById('abChapter-' + (idx + 1));
          if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        toc.appendChild(btn);
      }

      if (content) {
        var section = document.createElement('section');
        section.id = 'abChapter-' + (idx + 1);
        section.className = 'lb-chapter-card';
        var chapterLabel = _sanitizeText(chapter.roman || (String(chapter.order || (idx + 1)) + '장'));
        var html = '<h4 class="lb-chapter-title">' + chapterLabel + '. ' + _sanitizeText(chapter.title) + '</h4>';
        var cats = Array.isArray(chapter.categories) ? chapter.categories : [];
        for (var i = 0; i < cats.length; i++) {
          var c = cats[i] || {};
          html += '<article class="lb-sub-card">'
            + '<h5 class="lb-sub-title">' + _sanitizeText(c.title || ('세부 카테고리 ' + (i + 1))) + '</h5>'
            + '<div class="lb-sub-body">' + _renderAstroSectionBody(c.text || c.localSummary || '') + '</div>'
            + '</article>';
        }
        if (!cats.length && _clean(chapter.content)) {
          html += '<article class="lb-sub-card">'
            + '<div class="lb-sub-body">' + _renderAstroSectionBody(chapter.content) + '</div>'
            + '</article>';
        }
        section.innerHTML = html;
        content.appendChild(section);
      }
    });
  }

  function _fetchCanonicalChapters() {
    var endpoints = _buildApiCandidates(ASTRO_CHAPTERS_API);
    var idx = 0;
    function next(resolve) {
      if (idx >= endpoints.length) return resolve([]);
      var u = endpoints[idx++];
      fetch(u)
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.chapters) && data.chapters.length) {
            resolve(data.chapters);
            return;
          }
          next(resolve);
        })
        .catch(function () { next(resolve); });
    }
    return new Promise(function (resolve) { next(resolve); });
  }

  function _postPrepare(body) {
    var endpoints = _buildApiCandidates(ASTRO_PREPARE_API);
    var idx = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();

    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(lastErr instanceof Error ? lastErr : new Error(lastErr || '점성술 프리미엄 API 호출에 실패했습니다.'));
        return;
      }
      var url = endpoints[idx++];
      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;

      _fetchWithTimeout(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      }, ASTRO_PREPARE_TIMEOUT_MS)
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) {
            _persistPremiumAccessToken(_extractPremiumToken(pack.json));
            resolve(pack.json);
            return;
          }
          run(resolve, reject, _buildAstroApiError(pack, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status), {
            stage: 'prepare',
            sessionId: body && body.sessionId,
            reportId: body && body.reportId
          }));
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') {
            if (idx < endpoints.length) {
              run(resolve, reject, err);
              return;
            }
            _fetchAstroStatus(body && body.sessionId, body && body.reportId)
              .then(function (payload) {
                var data = _statusData(payload);
                if (data.status === 'done' && data.result) {
                  resolve({ ok: true, status: 'done', result: data.result, sessionId: data.sessionId, reportId: data.reportId });
                  return;
                }
                if (data.status === 'running') {
                  resolve({
                    ok: true,
                    status: 'running',
                    sessionId: data.sessionId || (body && body.sessionId),
                    reportId: data.reportId || (body && body.reportId),
                    timeoutRecovery: true,
                  });
                  return;
                }
                reject(_buildAstroApiError({ status: data.statusCode || 500, body: data }, (data.error && data.error.message) || data.message || '점성술 PDF 생성 상태를 확인하지 못했습니다.', {
                  stage: 'prepare-timeout',
                  sessionId: body && body.sessionId,
                  reportId: body && body.reportId
                }));
              })
              .catch(function (statusErr) {
                reject(statusErr instanceof Error ? statusErr : new Error(String(statusErr && statusErr.message || statusErr || '상태 확인 실패')));
              });
            return;
          }
          reject(err instanceof Error ? err : new Error(String(err && err.message || err || '요청 실패')));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _postAstrologyMockApi(pathname, body, stage) {
    var endpoints = _buildApiCandidates(pathname);
    var idx = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();

    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(lastErr instanceof Error ? lastErr : new Error(lastErr || '점성술 AI 상담 API 호출에 실패했습니다.'));
        return;
      }
      var url = endpoints[idx++];
      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;

      _fetchWithTimeout(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body || {}),
      }, ASTRO_PREPARE_TIMEOUT_MS)
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok !== false) {
            _persistPremiumAccessToken(_extractPremiumToken(pack.json));
            resolve(pack.json);
            return;
          }
          run(resolve, reject, _buildAstroApiError(pack, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status), { stage: stage || 'mock-api' }));
        })
        .catch(function (err) {
          run(resolve, reject, err instanceof Error ? err : new Error(String(err && err.message || err || '요청 실패')));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _getAstrologyMockApi(pathname, query, stage) {
    var suffix = [];
    var params = query || {};
    Object.keys(params).forEach(function (key) {
      var value = _clean(params[key]);
      if (value) suffix.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    });
    var endpoints = _buildApiCandidates(pathname + (suffix.length ? '?' + suffix.join('&') : ''));
    var idx = 0;
    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(lastErr instanceof Error ? lastErr : new Error(lastErr || _astroBookText().statusCheckFailed));
        return;
      }
      fetch(endpoints[idx++], { method: 'GET', headers: _astroStatusHeaders() })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok !== false) {
            resolve(pack.json);
            return;
          }
          run(resolve, reject, _buildAstroApiError(pack, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status), { stage: stage || 'mock-status' }));
        })
        .catch(function (err) {
          run(resolve, reject, err instanceof Error ? err : new Error(String(err && err.message || err || _astroBookText().statusCheckFailed)));
        });
    }
    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _postAstrologyVerifyAccess(body) {
    return _postAstrologyMockApi(ASTRO_VERIFY_ACCESS_API, body, 'verify-access');
  }

  function _postAstrologyCreateJob(body) {
    return _postAstrologyMockApi(ASTRO_CREATE_JOB_API, body, 'create-job');
  }

  function _postAstrologyGenerateMock(jobId) {
    return _postAstrologyMockApi(ASTRO_GENERATE_MOCK_API, { jobId: jobId }, 'generate-mock');
  }

  function _fetchAstrologyResult(jobId) {
    return _getAstrologyMockApi(ASTRO_RESULT_API, { jobId: jobId }, 'result');
  }

  function _astroStatusHeaders() {
    var headers = {};
    var authToken = '';
    var premiumToken = _readPremiumAccessToken();
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    if (premiumToken) headers['x-premium-access-token'] = premiumToken;
    return headers;
  }

  function _fetchAstroStatus(sessionId, reportId, jobId) {
    var jid = _clean(jobId);
    if (jid) {
      return _getAstrologyMockApi(ASTRO_STATUS_API, { jobId: jid }, 'status');
    }
    var sid = _clean(sessionId);
    var rid = _clean(reportId);
    if (!sid && !rid) return Promise.reject(new Error('점성술 생성 세션을 확인할 수 없습니다.'));
    var query = [];
    if (sid) query.push('sessionId=' + encodeURIComponent(sid));
    if (rid) query.push('reportId=' + encodeURIComponent(rid));
    var endpoints = _buildApiCandidates(ASTRO_STATUS_API + '?' + query.join('&'));
    var idx = 0;
    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(lastErr instanceof Error ? lastErr : new Error(lastErr || '점성술 생성 상태를 확인할 수 없습니다.'));
        return;
      }
      fetch(endpoints[idx++], { method: 'GET', headers: _astroStatusHeaders() })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) {
            resolve(pack.json);
            return;
          }
          run(resolve, reject, _buildAstroApiError(pack, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status), {
            stage: 'status',
            sessionId: sid
          }));
        })
        .catch(function (err) {
          run(resolve, reject, err instanceof Error ? err : new Error(String(err && err.message || err || _astroBookText().statusCheckFailed)));
        });
    }
    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _statusData(payload) {
    if (payload && payload.data && typeof payload.data === 'object') return payload.data;
    return payload || {};
  }

  function _statusRetryDelay(statusData) {
    var ms = Number(statusData && statusData.retryAfterMs);
    if (!Number.isFinite(ms) || ms < 1000) return ASTRO_STATUS_POLL_MS;
    return Math.min(10000, Math.max(1000, Math.trunc(ms)));
  }

  function _saveAstrologyMockJobId(jobId) {
    var value = _clean(jobId);
    if (!value) return;
    try { localStorage.setItem(ASTRO_MOCK_JOB_STORAGE_KEY, value); } catch (_) {}
  }

  function _readAstrologyMockJobId() {
    try { return _clean(localStorage.getItem(ASTRO_MOCK_JOB_STORAGE_KEY)); } catch (_) { return ''; }
  }

  function _clearAstrologyMockJobId() {
    try { localStorage.removeItem(ASTRO_MOCK_JOB_STORAGE_KEY); } catch (_) {}
  }

  function _chapterStatusLabel(status) {
    var value = _clean(status).toLowerCase();
    if (value === 'completed') return '완료';
    if (value === 'generating') return '생성 중';
    if (value === 'failed') return '실패';
    return '대기';
  }

  function _ensureAstrologyChapterStatusList() {
    var list = _qs('abChapterStatusList');
    if (list) return list;
    var progressText = _qs('abProgressText');
    if (!progressText || !progressText.parentElement) return null;
    list = document.createElement('div');
    list.id = 'abChapterStatusList';
    list.className = 'lb-progress-text';
    list.setAttribute('aria-live', 'polite');
    list.style.textAlign = 'left';
    list.style.maxWidth = '520px';
    list.style.margin = '14px auto 0';
    list.style.lineHeight = '1.7';
    progressText.parentElement.insertBefore(list, progressText.nextSibling);
    return list;
  }

  function _renderAstrologyChapterStatusList(chapters) {
    var list = _ensureAstrologyChapterStatusList();
    if (!list) return;
    var source = Array.isArray(chapters) ? chapters : [];
    if (!source.length) {
      list.textContent = '';
      return;
    }
    list.innerHTML = '';
    source.forEach(function (chapter) {
      var row = document.createElement('div');
      row.textContent = '[' + _chapterStatusLabel(chapter.status) + '] ' + Number(chapter.order || 0) + '장 ' + _sanitizeText(chapter.title || '');
      list.appendChild(row);
    });
  }

  function _progressTitle(progress, statusData) {
    var state = _clean((progress && progress.stateKey) || (statusData && statusData.status));
    var title = _clean(progress && progress.currentChapterTitle);
    var copy = _astroBookText();
    if (state === 'access_verifying') return '결제 검증 중입니다.';
    if (state === 'access_verified' || state === 'queued') return '점성술 PDF 생성 준비 중입니다.';
    if (state === 'generating' || state === 'chapter_generating') {
      var order = Number((progress && progress.currentChapterOrder) || (statusData && statusData.currentChapterOrder) || 0);
      return title ? ((Number.isFinite(order) && order > 0 ? order + '장 ' : '') + title + ' 생성 중...') : '점성술 PDF 챕터를 생성하는 중입니다.';
    }
    if (state === 'rendering') return 'PDF 문서를 렌더링하고 있습니다.';
    if (state === 'saving') return 'PDF 파일을 저장하고 있습니다.';
    if (state === 'local_calculation') return copy.progressLocal;
    if (state === 'writing_seed') return copy.progressSeed;
    if (state === 'writing_llm') return title ? title : copy.progressWriting;
    if (state === 'manuscript_validated') return copy.progressValidated;
    if (state === 'pdf_rendering') return copy.progressRendering;
    if (state === 'pdf_rendered') return copy.progressRendered;
    if (state === 'failed') return copy.progressFailed;
    if (state === 'completed' || state === 'done') return copy.completed;
    return title || copy.progressPreparing;
  }

  function _applyAstroStatusProgress(statusPayload) {
    var data = _statusData(statusPayload);
    if (data && (data.serviceType === 'astrology_pdf' || data.isMock === true)) {
      var mockTotal = Number(data.totalChapters || ASTRO_TOTAL_CHAPTERS || 12);
      var completed = Number(data.completedChapters || 0);
      var mockProgress = {
        stateKey: data.status,
        currentChapterTitle: data.currentChapterTitle,
        currentChapterOrder: data.currentChapterOrder,
      };
      if (Number.isFinite(mockTotal) && mockTotal > 0) ASTRO_TOTAL_CHAPTERS = Math.trunc(mockTotal);
      if (Array.isArray(data.chapters) && data.chapters.length) _canonicalChapters = data.chapters;
      _setLoadingProgress(
        Number.isFinite(completed) ? completed : 0,
        _getTotalChapters(),
        _progressTitle(mockProgress, data),
        data.status === 'completed',
        data.progressPercent
      );
      _renderAstrologyChapterStatusList(data.chapters);
      return data;
    }
    var progress = data.progress && typeof data.progress === 'object' ? data.progress : {};
    var total = Number(progress.totalChapters || data.chapterCount || ASTRO_TOTAL_CHAPTERS || 15);
    var current = Number(progress.currentChapterNo || data.llmAssembly && data.llmAssembly.chapterCount || 0);
    var state = _clean(progress.stateKey || data.status);
    if (Number.isFinite(total) && total > 0) ASTRO_TOTAL_CHAPTERS = Math.trunc(total);
    _setLoadingProgress(
      Number.isFinite(current) ? current : 0,
      _getTotalChapters(),
      _progressTitle(progress, data),
      state === 'completed' || state === 'done'
    );
    return data;
  }

  function _startAstroStatusPolling(sessionId, reportId) {
    _stopProgressAnimation();
    function tick() {
      if (!_generating) {
        _stopProgressAnimation();
        return;
      }
      _fetchAstroStatus(sessionId, reportId)
        .then(function (payload) {
          var data = _applyAstroStatusProgress(payload);
          if (data.status === 'done' || data.status === 'failed') _stopProgressAnimation();
        })
        .catch(function () {});
    }
    tick();
    _progressTimer = setInterval(tick, ASTRO_STATUS_POLL_MS);
  }

  function _waitForAstroCompletion(sessionId, reportId) {
    var started = Date.now();
    var timeoutMs = 12 * 60 * 1000;
    function wait() {
      return _fetchAstroStatus(sessionId, reportId).then(function (payload) {
        var data = _applyAstroStatusProgress(payload);
        if (data.status === 'done' && data.result) return data.result;
        if (data.status === 'failed') throw _buildAstroApiError({ status: data.statusCode || 500, body: data }, (data.error && data.error.message) || data.message || _astroBookText().statusGenerationFailed, {
          stage: 'status',
          sessionId: sessionId,
          reportId: data.reportId
        });
        if (Date.now() - started > timeoutMs) throw new Error(_astroBookText().generationTimeout);
        return new Promise(function (resolve) { setTimeout(resolve, _statusRetryDelay(data)); }).then(wait);
      });
    }
    return wait();
  }

  function _waitForAstrologyMockCompletion(jobId) {
    var started = Date.now();
    var timeoutMs = 12 * 60 * 1000;
    function wait() {
      return _fetchAstroStatus('', '', jobId).then(function (payload) {
        var data = _applyAstroStatusProgress(payload);
        if (data.status === 'completed') {
          return _fetchAstrologyResult(jobId).then(function (resultPayload) {
            var resultData = _statusData(resultPayload);
            return resultData.result || resultData;
          });
        }
        if (data.status === 'failed' || data.status === 'cancelled') {
          throw _buildAstroApiError({ status: 500, body: data }, data.errorMessage || '점성술 PDF 생성 중 문제가 발생했습니다. 결제 내역은 보존됩니다. 다시 시도하거나 고객센터에 문의해주세요.', {
            stage: 'status',
            reportId: jobId
          });
        }
        if (Date.now() - started > timeoutMs) throw new Error(_astroBookText().generationTimeout);
        return new Promise(function (resolve) { setTimeout(resolve, _statusRetryDelay(data)); }).then(wait);
      });
    }
    return wait();
  }

  function _recoverAstrologyMockJob() {
    var jobId = _readAstrologyMockJobId();
    if (!jobId || _generating) return Promise.resolve(false);
    return _fetchAstroStatus('', '', jobId).then(function (payload) {
      var data = _applyAstroStatusProgress(payload);
      if (!data || !data.status || data.status === 'failed' || data.status === 'cancelled') {
        if (data && (data.status === 'failed' || data.status === 'cancelled')) _setError(data.errorMessage || '점성술 PDF 생성 중 문제가 발생했습니다.');
        return true;
      }
      if (data.status === 'completed') {
        return _fetchAstrologyResult(jobId).then(function (resultPayload) {
          var result = _statusData(resultPayload);
          var response = result.result || result;
          _resultPayload = response;
          _chapters = Array.isArray(response.chapters) ? response.chapters : [];
          ASTRO_TOTAL_CHAPTERS = _chapters.length || ASTRO_TOTAL_CHAPTERS;
          _renderResult(_chapters, response.payload || {});
          _showScreen('abResultScreen');
          return true;
        });
      }
      _generating = true;
      _setStartBusy(true);
      _showScreen('abLoadingScreen');
      return _waitForAstrologyMockCompletion(jobId).then(function (response) {
        _resultPayload = response;
        _chapters = Array.isArray(response.chapters) ? response.chapters : [];
        ASTRO_TOTAL_CHAPTERS = _chapters.length || ASTRO_TOTAL_CHAPTERS;
        _renderResult(_chapters, response.payload || {});
        _showScreen('abResultScreen');
        return true;
      }).finally(function () {
        _generating = false;
        _setStartBusy(false);
        _stopProgressAnimation();
      });
    }).catch(function () {
      return false;
    });
  }

  function _downloadAstroBookUrl(url, filename) {
    var safeUrl = _clean(url);
    if (!safeUrl) return Promise.reject(new Error(_astroBookText().downloadUrlMissing));
    return _fetchWithTimeout(safeUrl, {
      method: 'GET',
      headers: _astroStatusHeaders(),
    }, ASTRO_DOWNLOAD_TIMEOUT_MS)
      .then(function (res) {
        if (!res.ok) {
          return res.text().catch(function () { return ''; }).then(function (text) {
            var err = new Error(text || _astroBookText().downloadRequestFailed(res.status));
            err.status = res.status;
            throw err;
          });
        }
        return res.blob();
      })
      .then(function (blob) {
        var objectUrl = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename || 'astro-premium-report.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          try { URL.revokeObjectURL(objectUrl); } catch (_) {}
        }, 1500);
      });
  }

  function _ensurePremiumPaymentAsync() {
    if (_hasPremiumAccessForGeneration()) {
      _logStage('PaymentGateStart', { featureKey: ASTRO_BILLING_FEATURE_KEY, reused: true });
      _logStage('PaymentGateSuccess', { featureKey: ASTRO_BILLING_FEATURE_KEY, reused: true });
      return Promise.resolve({ ok: true, skipped: true });
    }
    if (typeof window._cdCoinGatePerUse !== 'function') {
      var missingPaymentError = new Error(_astroBookText().paymentModuleMissing);
      missingPaymentError.status = 503;
      missingPaymentError.code = 'ASTRO_PAYMENT_MODULE_MISSING';
      missingPaymentError.stage = 'billing';
      _logError(missingPaymentError, { stage: 'billing' });
      return Promise.reject(missingPaymentError);
    }
    _logStage('PaymentGateStart', { featureKey: ASTRO_BILLING_FEATURE_KEY });
    return new Promise(function (resolve, reject) {
      try {
        window._cdCoinGatePerUse(ASTRO_COIN_COST, _astroBookText().premiumFeatureName, function (_transactionId, data) {
          _lastPremiumPayment = _normalizePremiumPayment(_transactionId, data);
          _persistPremiumAccessToken(_lastPremiumPayment.premiumAccessToken || _extractPremiumToken(data));
          _markPremiumAccessVerified(25 * 60 * 1000);
          _logStage('PaymentGateSuccess', { featureKey: ASTRO_BILLING_FEATURE_KEY });
          resolve({ ok: true, skipped: false, data: _lastPremiumPayment });
        }, function () {
          var billingError = new Error(_astroBookText().paymentConfirmFailed);
          billingError.status = 402;
          billingError.code = 'ASTRO_PAYMENT_CANCELLED';
          billingError.stage = 'billing';
          _logError(billingError, { stage: 'billing' });
          reject(billingError);
        }, {
          featureKey: ASTRO_BILLING_FEATURE_KEY,
          requestId: 'astro-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  _ensurePremiumPaymentAsync = function () {
    var context = _ensureCurrentAstroGenerationIds();
    if (_hasPremiumAccessForGeneration()) {
      _logStage('PaymentGateStart', { featureKey: ASTRO_BILLING_FEATURE_KEY, reused: true, sessionId: context.sessionId, reportId: context.reportId });
      _logStage('PaymentGateSuccess', { featureKey: ASTRO_BILLING_FEATURE_KEY, reused: true, sessionId: context.sessionId, reportId: context.reportId });
      return Promise.resolve({ ok: true, skipped: true, data: _lastPremiumPayment || {} });
    }
    if (_pendingPaymentPromise && _pendingPaymentSessionId === context.sessionId) return _pendingPaymentPromise;
    if ((_paymentChecking || _paymentOpening) && Date.now() - _paymentGateOpenedAt < ASTRO_PAYMENT_GATE_WINDOW_MS) return Promise.reject(new Error('ASTRO_PAYMENT_GATE_ALREADY_OPEN'));

    var gateOptions = {
      featureKey: ASTRO_BILLING_FEATURE_KEY,
      subFeatureKey: ASTRO_BILLING_FEATURE_KEY,
      categoryKey: 'premium-consultation',
      allowedPaymentModes: ['pass', 'monthly', 'direct'],
      coinPrice: ASTRO_COIN_COST,
      cost: ASTRO_COIN_COST,
      reportType: 'westernAstrologyPremium',
      serviceKey: 'astro-premium',
      actionType: 'ai-consultation',
      action: 'generateAstrologyAIConsultation',
      requestId: context.requestId,
      reportId: context.reportId,
      sessionId: context.sessionId,
      reportSessionId: context.sessionId,
      mode: 'personal'
    };

    _pendingPaymentSessionId = context.sessionId;
    _pendingPaymentPromise = new Promise(function (resolve, reject) {
      function complete(transactionId, data) {
        _lastPremiumPayment = _bindPaymentToCurrentGeneration(_normalizePremiumPayment(transactionId, data));
        if (!_lastPremiumPayment.transactionId && !_lastPremiumPayment.purchaseId && !_lastPremiumPayment.premiumAccessToken && !_lastPremiumPayment.accessGrant && !_lastPremiumPayment.consume) {
          _lastPremiumPayment.adminTestMode = true;
        }
        _persistPremiumAccessToken(_lastPremiumPayment.premiumAccessToken || _extractPremiumToken(data));
        _markPremiumAccessVerified(25 * 60 * 1000);
        _logStage('PaymentGateSuccess', { featureKey: ASTRO_BILLING_FEATURE_KEY, sessionId: context.sessionId, reportId: context.reportId });
        resolve({ ok: true, skipped: false, data: _lastPremiumPayment });
      }

      function cancel(error) {
        var billingError = error instanceof Error ? error : new Error('ASTRO_PAYMENT_CANCELLED');
        billingError.status = billingError.status || 402;
        billingError.code = billingError.code || 'ASTRO_PAYMENT_CANCELLED';
        billingError.stage = billingError.stage || 'billing';
        _lastPremiumPayment = null;
        _logError(billingError, { stage: 'billing' });
        _logStage('PaymentGateCancel', { featureKey: ASTRO_BILLING_FEATURE_KEY });
        reject(billingError);
      }

      _paymentChecking = true;
      _paymentOpening = true;
      _paymentGateOpenedAt = Date.now();
      _logStage('PaymentGateStart', { featureKey: ASTRO_BILLING_FEATURE_KEY, sessionId: context.sessionId, reportId: context.reportId });

      try {
        if (typeof window._cdOpenPaidServiceGate === 'function') {
          Promise.resolve(window._cdOpenPaidServiceGate(gateOptions)).then(function (result) {
            if (result === false || result && result.cancelled) {
              cancel(new Error('ASTRO_PAYMENT_CANCELLED'));
              return;
            }
            complete(_clean(result && (result.transactionId || result.purchaseId || result.requestId)), result || {});
          }).catch(cancel);
          return;
        }

        if (typeof window._cdCoinGatePerUse === 'function') {
          window._cdCoinGatePerUse(ASTRO_COIN_COST, _astroBookText().premiumFeatureName, complete, function () {
            cancel(new Error('ASTRO_PAYMENT_CANCELLED'));
          }, gateOptions);
          return;
        }

        var missingPaymentError = new Error(_astroBookText().paymentModuleUnavailable);
        missingPaymentError.status = 503;
        missingPaymentError.code = 'ASTRO_PAYMENT_MODULE_MISSING';
        missingPaymentError.stage = 'billing';
        cancel(missingPaymentError);
      } catch (error) {
        cancel(error);
      }
    }).finally(function () {
      _paymentChecking = false;
      _paymentOpening = false;
      _pendingPaymentPromise = null;
      _pendingPaymentSessionId = '';
    });

    return _pendingPaymentPromise;
  };

  function _removeAstroTransAttrs(node) {
    if (!node || !node.removeAttribute) return;
    node.removeAttribute('data-cd-trans');
    node.removeAttribute('data-key');
    node.removeAttribute('data-cd-trans-attr');
  }

  function _setAstroText(id, text) {
    var el = _qs(id);
    if (!el) return;
    _removeAstroTransAttrs(el);
    el.textContent = text;
  }

  function _installAstrologyAIStyle() {
    if (document.getElementById('abAiConsultationStyle')) return;
    var style = document.createElement('style');
    style.id = 'abAiConsultationStyle';
    style.textContent = [
      '#astroBookModal[data-astro-ai-consultation="1"] .lb-start__chapters{display:none!important}',
      '#astroBookModal[data-astro-ai-consultation="1"] .lb-ch-grid{display:none!important}',
      '#astroBookModal[data-astro-ai-consultation="1"] #abPdfBtn{display:none!important}',
      '.ab-ai-controls{margin:18px 0 4px;padding:18px;border:1px solid rgba(251,191,36,.24);background:rgba(18,16,38,.66);border-radius:14px}',
      '.ab-ai-label{display:block;margin:0 0 10px;color:#f8e7b0;font-weight:800;font-size:.9rem}',
      '.ab-ai-chip-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}',
      '.ab-ai-chip{border:1px solid rgba(251,191,36,.34);background:rgba(255,255,255,.06);color:#eadcff;border-radius:999px;padding:8px 12px;font-size:.82rem;cursor:pointer}',
      '.ab-ai-chip.is-active{background:linear-gradient(135deg,rgba(251,191,36,.28),rgba(168,85,247,.26));color:#fff7d6;border-color:rgba(251,191,36,.68)}',
      '.ab-ai-question{width:100%;min-height:118px;resize:vertical;border:1px solid rgba(196,181,253,.28);background:rgba(4,8,22,.72);color:#fff;border-radius:12px;padding:13px 14px;font-family:var(--font-body);line-height:1.65}',
      '.ab-ai-help{margin:8px 0 0;color:rgba(229,221,255,.72);font-size:.8rem;line-height:1.55}',
      '.ab-ai-result-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}',
      '.ab-ai-result-card{border:1px solid rgba(251,191,36,.22);background:linear-gradient(180deg,rgba(20,18,42,.88),rgba(8,12,28,.86));border-radius:14px;padding:18px;color:#f8f4ff}',
      '.ab-ai-result-card h4{margin:0 0 10px;color:#fde68a;font-size:1rem;font-weight:900}',
      '.ab-ai-result-card p{margin:0;color:#ede7ff;line-height:1.78;white-space:pre-line}',
      '.ab-ai-result-card ul{margin:10px 0 0;padding-left:18px;color:#ede7ff;line-height:1.72}',
      '.ab-ai-chart-strip{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}',
      '.ab-ai-chart-strip span{border:1px solid rgba(196,181,253,.24);border-radius:999px;padding:6px 10px;color:#f6e6b9;background:rgba(255,255,255,.05);font-size:.82rem}',
      '@media(max-width:640px){.ab-ai-controls{padding:14px}.ab-ai-chip{font-size:.78rem;padding:7px 10px}.ab-ai-result-card{padding:15px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function _defaultAstrologyAIQuestion(category) {
    for (var i = 0; i < ASTRO_AI_CATEGORIES.length; i += 1) {
      if (ASTRO_AI_CATEGORIES[i][0] === category) return ASTRO_AI_CATEGORIES[i][2];
    }
    return ASTRO_AI_CATEGORIES[0][2];
  }

  function _ensureAstrologyAIControls() {
    _installAstrologyAIStyle();
    var existing = _qs('abConsultationControls');
    if (existing) return existing;
    var profileSummary = _qs('abProfileSummary');
    var anchor = profileSummary && profileSummary.closest ? profileSummary.closest('.lb-start__profile-box') : null;
    var startInfo = document.querySelector('#astroBookModal .lb-start-info');
    var host = document.createElement('div');
    host.id = 'abConsultationControls';
    host.className = 'ab-ai-controls';
    host.setAttribute('data-cd-marker', 'astrology-ai-consultation-controls-v20260627');
    host.innerHTML = '<label class="ab-ai-label" for="abAiQuestion">상담 주제</label>'
      + '<div class="ab-ai-chip-row" id="abAiCategoryRow">'
      + ASTRO_AI_CATEGORIES.map(function (item) {
        return '<button type="button" class="ab-ai-chip' + (item[0] === _selectedAstrologyAICategory ? ' is-active' : '') + '" data-ab-ai-category="' + _escapeHtml(item[0]) + '">' + _escapeHtml(item[1]) + '</button>';
      }).join('')
      + '</div>'
      + '<label class="ab-ai-label" for="abAiQuestion">지금 묻고 싶은 질문</label>'
      + '<textarea id="abAiQuestion" class="ab-ai-question" maxlength="1000" placeholder="예: 제 네이탈 차트 기준으로 올해 직업운과 연애운은 어떻게 흘러갈까요?"></textarea>'
      + '<p class="ab-ai-help" id="abAiTimeNotice">출생시간을 모르면 상승궁, MC, 하우스 해석은 제한되어 열립니다.</p>';
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(host, anchor.nextSibling);
    else if (startInfo && startInfo.parentNode) startInfo.parentNode.insertBefore(host, startInfo);
    else {
      var startScreen = _qs('abStartScreen');
      if (startScreen) startScreen.appendChild(host);
    }
    var textarea = _qs('abAiQuestion');
    if (textarea && !_clean(textarea.value)) textarea.value = _defaultAstrologyAIQuestion(_selectedAstrologyAICategory);
    host.addEventListener('click', function (event) {
      var button = event.target && event.target.closest ? event.target.closest('[data-ab-ai-category]') : null;
      if (!button) return;
      _selectedAstrologyAICategory = _clean(button.getAttribute('data-ab-ai-category')) || ASTRO_AI_DEFAULT_CATEGORY;
      Array.prototype.forEach.call(host.querySelectorAll('[data-ab-ai-category]'), function (node) {
        node.classList.toggle('is-active', node === button);
      });
      var q = _qs('abAiQuestion');
      if (q && (!_clean(q.value) || ASTRO_AI_CATEGORIES.some(function (item) { return _clean(q.value) === item[2]; }))) {
        q.value = _defaultAstrologyAIQuestion(_selectedAstrologyAICategory);
      }
    });
    return host;
  }

  function _applyAstrologyAIConsultationCopy(profile) {
    var modal = _qs('astroBookModal');
    if (!modal) return;
    _installAstrologyAIStyle();
    modal.setAttribute('data-astro-ai-consultation', '1');
    modal.setAttribute('data-cd-marker', 'astrology-ai-consultation-v20260627');
    modal.setAttribute('aria-label', '점성술 AI 상담');
    var headerKicker = modal.querySelector('.lb-header-title-en');
    if (headerKicker) {
      _removeAstroTransAttrs(headerKicker);
      headerKicker.textContent = 'ASTROLOGY AI CONSULTATION';
    }
    var title = modal.querySelector('.lb-modal__title');
    if (title) {
      _removeAstroTransAttrs(title);
      title.textContent = '점성술 AI 상담';
    }
    var subtitle = modal.querySelector('.lb-modal__subtitle');
    if (subtitle) {
      _removeAstroTransAttrs(subtitle);
      subtitle.textContent = '태어난 순간의 별 지도와 현재 행성의 흐름을 바탕으로, 지금 가장 궁금한 질문에 답합니다.';
    }
    var badges = modal.querySelectorAll('#abStartScreen .lb-trust-badge');
    ['네이탈 차트 계산', '태양·달·상승궁', '하우스·애스펙트·트랜짓', '39,000원 · 1회'].forEach(function (text, index) {
      if (badges[index]) {
        _removeAstroTransAttrs(badges[index]);
        badges[index].textContent = text;
      }
    });
    var headline = modal.querySelector('#abStartScreen .lb-marketing-headline');
    if (headline) {
      _removeAstroTransAttrs(headline);
      headline.textContent = '태어난 순간의 별 지도가 지금의 질문에 답합니다';
    }
    var sub = modal.querySelector('#abStartScreen .lb-marketing-sub');
    if (sub) {
      _removeAstroTransAttrs(sub);
      sub.textContent = '태양, 달, 상승궁, 하우스와 현재 트랜짓이 보여주는 삶의 방향을 화면에서 바로 확인하세요.';
    }
    var whyItems = modal.querySelectorAll('#abStartScreen .lb-why-item');
    var whyCopy = [
      ['네이탈 차트 기반 상담', '태양과 달, 상승궁이 삶의 중심성과 감정, 세상에 드러나는 방식을 비춥니다.'],
      ['하우스와 애스펙트', '사랑, 일, 돈, 감정의 반복 패턴을 계산된 차트 데이터 위에서 읽습니다.'],
      ['현재 하늘의 흐름', '지금 움직이는 행성의 주제를 질문과 연결해 현실적인 선택 방향으로 정리합니다.']
    ];
    Array.prototype.forEach.call(whyItems, function (item, index) {
      var strong = item.querySelector('strong');
      var span = item.querySelector('span:not(.lb-why-icon)');
      if (strong && whyCopy[index]) {
        _removeAstroTransAttrs(strong);
        strong.textContent = whyCopy[index][0];
      }
      if (span && whyCopy[index]) {
        _removeAstroTransAttrs(span);
        span.textContent = whyCopy[index][1];
      }
    });
    var desc = modal.querySelector('#abStartScreen .lb-start-desc');
    if (desc) {
      _removeAstroTransAttrs(desc);
      desc.innerHTML = '네이탈 차트와 현재 하늘의 흐름을 바탕으로 <strong>질문에 직접 답하는 AI 상담</strong>이 열립니다.';
    }
    var coin = modal.querySelector('#abStartScreen .lb-coin-label');
    if (coin) {
      _removeAstroTransAttrs(coin);
      coin.innerHTML = '<strong>39,000원</strong> · 결제 또는 이용권 확인 후 AI 상담 생성';
    }
    var cta = _qs('abStartBtn');
    if (cta) {
      _removeAstroTransAttrs(cta);
      cta.innerHTML = '<span>점성술 상담 받기</span>';
    }
    var note = modal.querySelector('#abStartScreen .lb-start__note');
    if (note) {
      _removeAstroTransAttrs(note);
      note.textContent = 'PDF를 기다리지 않아도 됩니다. 결제 확인 뒤 화면에서 바로 상담 결과를 확인합니다.';
    }
    _setAstroText('abLoadingChapterNum', 'AI 상담');
    _setAstroText('abLoadingChapter', ASTRO_AI_LOADING_LINES[0]);
    _setAstroText('abMysticQuote', ASTRO_AI_LOADING_LINES[1]);
    _setAstroText('abProgressText', '네이탈 차트와 현재 하늘을 읽고 있어요.');
    _setAstroText('abResultName', '');
    _setAstroText('abResultDate', '');
    var resultTitle = modal.querySelector('#abResultScreen .lb-result__title');
    if (resultTitle) {
      _removeAstroTransAttrs(resultTitle);
      resultTitle.textContent = '점성술 상담이 열렸습니다.';
    }
    var toc = _qs('abToc');
    if (toc) {
      toc.setAttribute('aria-label', '점성술 상담 섹션');
      _removeAstroTransAttrs(toc);
    }
    var copyBtn = _qs('abPdfBtn') || _qs('abCopyBtn');
    if (copyBtn) {
      copyBtn.id = 'abCopyBtn';
      copyBtn.removeAttribute('onclick');
      copyBtn.onclick = function () { window.copyAstroConsultationResult(); };
      copyBtn.innerHTML = '<span>상담 결과 복사하기</span>';
    }
    _ensureAstrologyAIControls();
    var timeNotice = _qs('abAiTimeNotice');
    if (timeNotice && profile && profile.birth && !Number.isFinite(Number(profile.birth.hour))) {
      timeNotice.textContent = '출생시간이 없어 상승궁, MC, 하우스 해석은 제한되어 열립니다.';
    } else if (timeNotice) {
      timeNotice.textContent = '출생시간과 출생지가 정확할수록 상승궁, MC, 하우스 해석이 선명해집니다.';
    }
  }

  function _getAstrologyAIQuestion() {
    var textarea = _qs('abAiQuestion');
    return _clean(textarea && textarea.value) || _defaultAstrologyAIQuestion(_selectedAstrologyAICategory);
  }

  function _buildAstrologyAIRequestBody(profile, birthInput, paymentContext, accessResponse, astroBase, astroClientEvidenceJson) {
    var context = _normalizePremiumPayment('', paymentContext || {});
    var ids = _ensureCurrentAstroGenerationIds();
    context.sessionId = _clean(context.sessionId || ids.sessionId) || undefined;
    context.reportSessionId = _clean(context.reportSessionId || context.sessionId || ids.sessionId) || undefined;
    context.reportId = _clean(context.reportId || ids.reportId) || undefined;
    context.requestId = _clean(context.requestId || ids.requestId) || undefined;
    context.premiumAccessToken = _readPremiumAccessToken() || context.premiumAccessToken || undefined;
    var paymentGrant = context.accessGrant && typeof context.accessGrant === 'object' ? context.accessGrant : null;
    var paymentConsume = context.consume && typeof context.consume === 'object' ? context.consume : {};
    var sourceTransactionId = _clean(context.transactionId || context.purchaseId || context.requestId);
    return {
      featureKey: ASTRO_FEATURE_KEY,
      reportType: 'westernAstrologyPremium',
      serviceType: 'astrology_ai_consultation',
      premiumAccessToken: context.premiumAccessToken || undefined,
      sessionId: context.sessionId || ids.sessionId,
      reportSessionId: context.reportSessionId || ids.sessionId,
      reportId: context.reportId || ids.reportId,
      requestId: context.requestId || ids.requestId,
      transactionId: context.transactionId || undefined,
      sourceTransactionId: sourceTransactionId || undefined,
      purchaseId: context.purchaseId || undefined,
      accessGrant: paymentGrant || (accessResponse && accessResponse.access) || undefined,
      verifiedAccess: accessResponse && accessResponse.access || undefined,
      consume: Object.assign({}, paymentConsume, {
        featureKey: ASTRO_BILLING_FEATURE_KEY,
        reportType: 'westernAstrologyPremium',
        transactionId: paymentConsume.transactionId || context.transactionId || sourceTransactionId || undefined,
        purchaseId: paymentConsume.purchaseId || context.purchaseId || undefined,
        requestId: paymentConsume.requestId || context.requestId || ids.requestId || undefined,
        sessionId: paymentConsume.sessionId || context.sessionId || ids.sessionId || undefined,
        reportSessionId: paymentConsume.reportSessionId || context.reportSessionId || ids.sessionId || undefined,
        reportId: paymentConsume.reportId || context.reportId || ids.reportId || undefined,
        premiumAccessToken: context.premiumAccessToken || undefined,
        accessGrant: paymentGrant || undefined
      }),
      payment: context,
      _paymentContext: context,
      paymentContext: context,
      birthInput: birthInput,
      profile: profile,
      astroBase: astroBase && astroBase.chart ? astroBase : undefined,
      astroClientEvidenceJson: astroClientEvidenceJson,
      category: _selectedAstrologyAICategory || ASTRO_AI_DEFAULT_CATEGORY,
      question: _getAstrologyAIQuestion(),
      dryRun: false
    };
  }

  function _postAstrologyAIConsultation(body) {
    return _postAstrologyMockApi(ASTRO_AI_CONSULTATION_API, body, 'ai-consultation');
  }

  function _startAstrologyAILoading() {
    _stopProgressAnimation();
    var idx = 0;
    var bar = _qs('abProgressBar');
    var txt = _qs('abProgressText');
    var num = _qs('abLoadingChapterNum');
    var ch = _qs('abLoadingChapter');
    var quote = _qs('abMysticQuote');
    function tick() {
      var pct = Math.min(92, 16 + idx * 14);
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = ASTRO_AI_LOADING_LINES[idx % ASTRO_AI_LOADING_LINES.length];
      if (num) num.textContent = idx < 2 ? '네이탈 차트' : 'AI 상담';
      if (ch) ch.textContent = ASTRO_AI_LOADING_LINES[(idx + 1) % ASTRO_AI_LOADING_LINES.length];
      if (quote) quote.textContent = ASTRO_AI_LOADING_LINES[(idx + 2) % ASTRO_AI_LOADING_LINES.length];
      idx = (idx + 1) % ASTRO_AI_LOADING_LINES.length;
    }
    tick();
    _progressTimer = setInterval(tick, 1700);
  }

  function _renderAstrologyAIList(items) {
    var list = Array.isArray(items) ? items.map(_clean).filter(Boolean) : [];
    if (!list.length) return '';
    return '<ul>' + list.map(function (item) { return '<li>' + _escapeHtml(item) + '</li>'; }).join('') + '</ul>';
  }

  function _renderAstrologyAIParagraph(text) {
    var value = _clean(text);
    if (!value) return '';
    return '<p>' + _renderAstroSectionBody(value) + '</p>';
  }

  function _buildAstrologyAISections(result) {
    var r = result || {};
    var core = r.chartCore || {};
    var patterns = r.chartPatterns || {};
    var transit = r.transitFlow || {};
    var timing = r.timing || {};
    return [
      { title: '상담 요약', body: r.summary },
      { title: '나의 별 지도 핵심', body: [core.sunSign ? '태양 ' + core.sunSign : '', core.moonSign ? '달 ' + core.moonSign : '', core.ascendant ? '상승궁 ' + core.ascendant : '', core.midheaven ? 'MC ' + core.midheaven : '', core.coreInterpretation || ''].filter(Boolean).join('\n') },
      { title: '차트의 강한 패턴', body: patterns.interpretation, items: [].concat(patterns.dominantElements || [], patterns.dominantModes || [], patterns.majorAspects || []) },
      { title: '현재 트랜짓 흐름', body: transit.interpretation, items: transit.highlights || [] },
      { title: '질문 주제별 해석', body: r.topicAnswer },
      { title: '기회와 주의할 시기', body: timing.note, items: [].concat(timing.opportunities || [], timing.cautions || []) },
      { title: '현실적인 행동 전략', items: r.actionGuide || [] },
      { title: '마지막 조언', body: r.closingMessage },
      { title: '후속 질문 추천', items: r.followUpQuestions || [] }
    ].filter(function (section) {
      return _clean(section.body) || (Array.isArray(section.items) && section.items.length);
    });
  }

  function _renderAstrologyAIConsultationResult(payload) {
    _resultPayload = payload || {};
    var result = _resultPayload.result || {};
    var chartSummary = _resultPayload.chartSummary || {};
    var core = chartSummary.coreSigns || {};
    var profile = chartSummary.birthInfo || {};
    var toc = _qs('abToc');
    var content = _qs('abChapterContent');
    var n = _qs('abResultName');
    var d = _qs('abResultDate');
    if (n) n.textContent = '점성술 상담이 열렸습니다.';
    if (d) d.textContent = [profile.birthDate, profile.birthTimeKnown ? profile.birthTime : '출생시간 모름', _resultPayload.provider].filter(Boolean).join(' · ');
    var sections = _buildAstrologyAISections(result);
    if (!sections.length && _clean(result.rawText)) sections = [{ title: '점성술 AI 상담', body: result.rawText }];
    var strip = '<div class="ab-ai-chart-strip">'
      + (core.sunSign ? '<span>태양 ' + _escapeHtml(core.sunSign) + '</span>' : '')
      + (core.moonSign ? '<span>달 ' + _escapeHtml(core.moonSign) + '</span>' : '')
      + (core.ascendant ? '<span>상승궁 ' + _escapeHtml(core.ascendant) + '</span>' : '')
      + (core.midheaven ? '<span>MC ' + _escapeHtml(core.midheaven) + '</span>' : '')
      + (!profile.birthTimeKnown ? '<span>출생시간 미상 · 하우스 제한</span>' : '')
      + '</div>';
    if (toc) {
      toc.innerHTML = sections.map(function (section, index) {
        return '<button type="button" class="lb-toc-item' + (index === 0 ? ' active' : '') + '" data-ab-ai-section="' + index + '"><span>' + String(index + 1).padStart(2, '0') + '</span><strong>' + _escapeHtml(section.title) + '</strong></button>';
      }).join('');
    }
    if (content) {
      content.innerHTML = strip + '<div class="ab-ai-result-grid">' + sections.map(function (section, index) {
        return '<article class="ab-ai-result-card" data-ab-ai-result-section="' + index + '"' + (index ? ' style="display:none;"' : '') + '><h4>' + _escapeHtml(section.title) + '</h4>'
          + _renderAstrologyAIParagraph(section.body)
          + _renderAstrologyAIList(section.items)
          + '</article>';
      }).join('') + '</div>';
    }
    if (toc) {
      Array.prototype.forEach.call(toc.querySelectorAll('[data-ab-ai-section]'), function (button) {
        button.addEventListener('click', function () {
          var index = Number(button.getAttribute('data-ab-ai-section') || 0);
          Array.prototype.forEach.call(toc.querySelectorAll('.lb-toc-item'), function (item) { item.classList.remove('active'); });
          button.classList.add('active');
          if (content) {
            Array.prototype.forEach.call(content.querySelectorAll('[data-ab-ai-result-section]'), function (node) {
              node.style.display = Number(node.getAttribute('data-ab-ai-result-section') || 0) === index ? '' : 'none';
            });
          }
        });
      });
    }
    var bar = _qs('abProgressBar');
    var txt = _qs('abProgressText');
    if (bar) bar.style.width = '100%';
    if (txt) txt.textContent = '점성술 상담이 열렸습니다.';
  }

  window.openAstroBookModal = function () {
    _logFlow('CARD_CLICK');
    _logStage('ModalOpen', {});
    var modal = _qs('astroBookModal');
    if (!modal) return;
    _detachModalFromResultPage(modal);

    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth || !profile.birth.year) {
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

    if (profile && profile.birth && profile.birth.year) {
      window.__cdActiveBirthProfile = profile;
      _applyAstrologyAIConsultationCopy(profile);
      _renderProfileSummary(profile);
      _showScreen('abStartScreen');
    } else {
      _applyAstrologyAIConsultationCopy(null);
      _showScreen('abNoProfileScreen');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}

    _canonicalChapters = [];
  };

  window.closeAstroBookModal = function () {
    var modal = _qs('astroBookModal');
    if (!modal) return;
    _stopProgressAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.gotoAstrologyPremium = function () {
    _logFlow('CARD_VISIBLE_CHECK', { card: 'gotoAstrologyPremium' });
    window.openAstroBookModal();
  };

  window.generateAstroBook = function () {
    if (_generating) return;
    _clearAstrologyMockJobId();
    _currentAstroSessionId = '';
    _currentAstroReportId = '';
    _currentAstroPaymentRequestId = '';

    var profile = _getActiveBirthProfile();
    _logStage('ProfileResolved', {
      hasBirthDate: !!(profile && profile.birth && profile.birth.year),
      hasBirthTime: !!(profile && profile.birth && Number.isFinite(Number(profile.birth.hour))),
      hasLocation: !!(profile && profile.location),
    });

    if (!profile || !profile.birth) {
      _showScreen('abNoProfileScreen');
      return;
    }

    var birthInput = _normalizeAstroBirthInput(profile);
    var valid = _validateBirthInputBeforePayment(birthInput);
    _logStage('ValidationBeforePayment', {
      ok: !!valid.ok,
      hasBirthDate: !!_clean(birthInput.birthDate),
      hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
      hasTimezone: !!_clean(birthInput.timezone),
      hasLocation: !!_clean(birthInput.birthPlace),
      houseSystemUsed: true,
    });
    if (!valid.ok) {
      _setError(valid.message);
      return;
    }

    _applyAstrologyAIConsultationCopy(profile);
    var question = _getAstrologyAIQuestion();
    if (!_clean(question) || _clean(question).length < 5) {
      _setError('지금 묻고 싶은 질문을 5자 이상 입력해 주세요.');
      return;
    }

    var astroBase = birthInput.isTimeUnknown ? null : _buildAstroBase(profile);
    var astroClientEvidenceJson = _buildAstroClientEvidenceJson(profile, birthInput);
    var generationContext = _ensureCurrentAstroGenerationIds();
    var sessionId = generationContext.sessionId;
    var reportId = generationContext.reportId;
    var requestId = generationContext.requestId;

    function buildRequestBody(paymentContext, accessResponse) {
      var body = _buildAstrologyAIRequestBody(profile, birthInput, paymentContext, accessResponse, astroBase, astroClientEvidenceJson);
      body.sessionId = _clean(body.sessionId || sessionId) || undefined;
      body.reportSessionId = _clean(body.reportSessionId || sessionId) || undefined;
      body.reportId = _clean(body.reportId || reportId) || undefined;
      body.requestId = _clean(body.requestId || requestId) || undefined;
      body.question = question;
      body.category = _selectedAstrologyAICategory || ASTRO_AI_DEFAULT_CATEGORY;
      return body;
    }

    function verifyAccess(paymentPayload) {
      var source = paymentPayload && paymentPayload.data ? paymentPayload.data : (paymentPayload || _lastPremiumPayment || {});
      var body = buildRequestBody(source, null);
      return _postAstrologyVerifyAccess(body).then(function (accessResponse) {
        return {
          accessResponse: accessResponse,
          requestBody: buildRequestBody(source, accessResponse),
        };
      });
    }

    function verifyAccessWithPaymentFallback() {
      _setAstroText('abProgressText', '결제 권한을 확인하고 있어요.');
      return verifyAccess(null).catch(function (err) {
        var status = Number(err && err.status || 0);
        if (status !== 402) throw err;
        _setAstroText('abProgressText', '결제 또는 이용권을 확인하고 있어요.');
        return _ensurePremiumPaymentAsync().then(function (payment) {
          return verifyAccess(payment);
        });
      });
    }

    _generating = true;
    _setStartBusy(true);
    _showScreen('abLoadingScreen');
    _startAstrologyAILoading();
    _logStage('AIConsultationStart', { category: _selectedAstrologyAICategory, questionLength: question.length });

    verifyAccessWithPaymentFallback()
      .then(function (verified) {
        _markPremiumAccessVerified(25 * 60 * 1000);
        _setAstroText('abProgressText', '네이탈 차트로 상담을 준비하고 있어요.');
        _logStage('AccessVerified', { featureKey: ASTRO_FEATURE_KEY, sessionId: sessionId, reportId: reportId });
        return _postAstrologyAIConsultation(verified.requestBody);
      })
      .then(function (response) {
        _resultPayload = response;
        if (!response || response.ok === false || !response.result) throw new Error(_astroBookText().resultNotSaved);
        _chapters = [];
        _canonicalChapters = [];
        _renderAstrologyAIConsultationResult(response);
        _logStage('AIConsultationSuccess', { provider: response.provider || 'unknown', category: response.category || _selectedAstrologyAICategory });
        _showScreen('abResultScreen');
      })
      .catch(function (err) {
        _logError(err, { stage: 'generate' });
        _setError(String(err && err.message ? err.message : err || _astroBookText().generationFailed));
      })
      .finally(function () {
        _generating = false;
        _setStartBusy(false);
        _stopProgressAnimation();
      });
  };

  window.copyAstroConsultationResult = function () {
    var raw = _clean(_resultPayload && _resultPayload.result && (_resultPayload.result.rawText || _resultPayload.result.summary));
    if (!raw) {
      _setError(_astroBookText().downloadNotReady);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(raw).catch(function () {});
    }
  };

  window.downloadAstroBookPdf = function () {
    window.copyAstroConsultationResult();
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');

    if (action === 'openAstroBookModal') {
      window.openAstroBookModal();
      return;
    }
    if (action === 'closeAstroBookModal') {
      window.closeAstroBookModal();
      return;
    }
    if (action === 'gotoAstrologyPremium') {
      window.gotoAstrologyPremium();
      return;
    }
  });
})();
