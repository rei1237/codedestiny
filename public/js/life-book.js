/**
 * 인생의 책(Life Book) 프리미엄 사주 심층 분석 + PDF 다운로드
 * CODE-DESTINY v1.0
 */
(function () {
  'use strict';

  var LIFEBOOK_TOTAL_CHAPTERS = 13;
  var LIFE_BOOK_FEATURE_KEY = 'saju_life_book_pdf';
  var LIFE_BOOK_REASON = '인생의 책 생성 (13챕터)';
  var LIFEBOOK_API_PREPARE_PATH = '/api/premium/saju-lifebook/prepare';
  var LIFEBOOK_API_STATUS_PATH = '/api/premium/saju-lifebook/status';
  var LIFEBOOK_TARGET_YEAR_MIN = 1900;
  var LIFEBOOK_TARGET_YEAR_MAX = 2099;
  var LIFE_BOOK_TEXT_TRANSLATIONS = {
    ko: {
      'access.unverified': '결제 접근 권한을 확인하지 못했습니다.',
      'access.notConfirmed': '결제 또는 이용권 확인이 완료되지 않았습니다. 결제창을 닫았다면 다시 생성 버튼을 눌러 주세요. 이미 결제되었다면 결제 내역 확인 후 문의해 주세요.',
      'birthCountry.seoul': '대한민국(서울)',
      'payment.cancelled': '결제가 취소되었습니다.',
      'payment.confirmError': '결제 확인 중 오류가 발생했습니다.',
      'payment.checkHistoryRetry': '결제 내역을 확인한 뒤 다시 시도해 주세요.',
      'validation.birthDate': '생년월일 정보를 확인해 주세요. 출생 정보가 있어야 인생의 책을 생성할 수 있습니다.',
      'validation.exactBirthTime': '인생의 책 PDF는 정확한 태어난 시·분이 필요합니다. 낮 12시 보수 계산 또는 출생시간 모름 상태로는 생성할 수 없습니다.',
      'validation.needBirthTime': '인생의 책 PDF는 시주와 대운 흐름까지 정밀하게 보기 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 입력해 주세요.',
      'validation.needSaju': '사주 계산을 먼저 완료해 주세요.',
    },
    en: {
      'access.unverified': 'We could not verify your payment access.',
      'access.notConfirmed': 'Payment or pass access has not been confirmed. If you closed the payment window, press the generate button again. If payment was already completed, check your payment history and contact support.',
      'birthCountry.seoul': 'South Korea (Seoul)',
      'payment.cancelled': 'Payment was cancelled.',
      'payment.confirmError': 'An error occurred while confirming payment.',
      'payment.checkHistoryRetry': 'Please check your payment history, then try again.',
      'validation.birthDate': 'Please check your birth date. Birth information is required to create your Life Book.',
      'validation.exactBirthTime': 'The Life Book PDF needs an exact birth hour and minute. It cannot be created with the conservative noon calculation or an unknown birth time.',
      'validation.needBirthTime': 'The Life Book PDF needs your birth time to read the hour pillar and major fortune flow precisely. Please enter your birth time in the profile card.',
      'validation.needSaju': 'Please complete the Saju calculation first.',
    },
    ja: {
      'access.unverified': '決済アクセス権限を確認できませんでした。',
      'access.notConfirmed': '決済または利用券の確認が完了していません。決済画面を閉じた場合は、もう一度生成ボタンを押してください。すでに決済済みの場合は、決済履歴を確認してお問い合わせください。',
      'birthCountry.seoul': '韓国（ソウル）',
      'payment.cancelled': '決済がキャンセルされました。',
      'payment.confirmError': '決済確認中にエラーが発生しました。',
      'payment.checkHistoryRetry': '決済履歴を確認してから、もう一度お試しください。',
      'validation.birthDate': '生年月日情報を確認してください。人生の書を生成するには出生情報が必要です。',
      'validation.exactBirthTime': '人生の書PDFには正確な出生時刻（時・分）が必要です。正午の保守計算や出生時刻不明の状態では生成できません。',
      'validation.needBirthTime': '人生の書PDFでは時柱と大運の流れまで精密に見るため、出生時刻が必要です。プロフィールカードで出生時刻を入力してください。',
      'validation.needSaju': '先に四柱推命の計算を完了してください。',
    },
    'zh-CN': {
      'access.unverified': '未能确认付款访问权限。',
      'access.notConfirmed': '付款或使用券确认尚未完成。如果关闭了付款窗口，请再次点击生成按钮。若已完成付款，请确认付款记录后联系客服。',
      'birthCountry.seoul': '韩国（首尔）',
      'payment.cancelled': '付款已取消。',
      'payment.confirmError': '确认付款时发生错误。',
      'payment.checkHistoryRetry': '请确认付款记录后再次尝试。',
      'validation.birthDate': '请确认出生日期信息。生成生命之书需要出生信息。',
      'validation.exactBirthTime': '生命之书 PDF 需要准确的出生时、分。使用中午 12 点保守计算或出生时间未知状态时无法生成。',
      'validation.needBirthTime': '生命之书 PDF 需要出生时间，以便精细查看时柱与大运流向。请在个人资料卡中输入出生时间。',
      'validation.needSaju': '请先完成四柱命理计算。',
    },
    'zh-TW': {
      'access.unverified': '未能確認付款存取權限。',
      'access.notConfirmed': '付款或使用券確認尚未完成。如果關閉了付款視窗，請再次點擊生成按鈕。若已完成付款，請確認付款紀錄後聯絡客服。',
      'birthCountry.seoul': '韓國（首爾）',
      'payment.cancelled': '付款已取消。',
      'payment.confirmError': '確認付款時發生錯誤。',
      'payment.checkHistoryRetry': '請確認付款紀錄後再次嘗試。',
      'validation.birthDate': '請確認出生日期資訊。生成生命之書需要出生資訊。',
      'validation.exactBirthTime': '生命之書 PDF 需要準確的出生時、分。使用中午 12 點保守計算或出生時間未知狀態時無法生成。',
      'validation.needBirthTime': '生命之書 PDF 需要出生時間，以便精細查看時柱與大運流向。請在個人資料卡中輸入出生時間。',
      'validation.needSaju': '請先完成四柱命理計算。',
    },
  };

  function _lifeBookLang() {
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

  function _lifeBookText(key) {
    var table = LIFE_BOOK_TEXT_TRANSLATIONS[_lifeBookLang()] || LIFE_BOOK_TEXT_TRANSLATIONS.en;
    return table[key] || LIFE_BOOK_TEXT_TRANSLATIONS.en[key] || 'Translation pending';
  }

  var CHAPTER_TITLES = [
    '프롤로그 - 내 인생의 핵심 코드',
    '원국 해석 - 태어난 순간의 구조',
    '일간과 월지 - 내가 세상을 살아가는 기본 방식',
    '오행 균형 - 넘치는 기운과 부족한 기운',
    '십성 구조 - 성격, 재능, 욕망의 패턴',
    '용신·희신·기신 - 나를 살리는 방향과 피해야 할 방향',
    '격국과 삶의 큰 틀 - 인생이 풀리는 방식',
    '연애와 관계 - 사랑, 결혼, 친밀감의 패턴',
    '직업과 재물 - 돈이 들어오는 방식과 커리어 방향',
    '건강과 생활 리듬 - 몸과 마음의 관리법',
    '대운 분석 - 인생의 큰 계절 변화',
    '선택 연도와 가까운 미래 - 세운·월운 기반 실전 조언',
    '마스터플랜 - 앞으로의 선택과 실행 전략',
  ];

  var CHAPTER_SUBTITLES = [
    '원국 전체를 하나의 핵심 문장으로 묶어 삶의 첫 방향을 엽니다.',
    '년주, 월주, 일주, 시주의 배치 속에서 태어난 순간의 구조가 드러납니다.',
    '일간의 본질과 월지의 계절성을 함께 보아 삶의 작동 방식을 해석합니다.',
    '목화토금수의 과다와 부족을 정리해 강점, 피로, 보완 루틴을 찾습니다.',
    '비겁, 식상, 재성, 관성, 인성의 흐름 속에서 반복 패턴이 떠오릅니다.',
    '사주의 균형을 회복시키는 방향과 조심해야 할 흐름을 나눕니다.',
    '격국과 계절의 큰 틀을 통해 일이 열리고 막히는 방식을 해석합니다.',
    '친밀감, 애착, 결혼관, 관계 회복 방식을 상담형 문장으로 정리합니다.',
    '재성, 관성, 식상의 작동을 통해 돈과 일의 흐름을 현실적으로 연결합니다.',
    '오행 균형과 조후를 바탕으로 생활 리듬과 회복 루틴을 제안합니다.',
    '현재 대운과 다음 대운의 전환 속에서 인생의 큰 계절이 열립니다.',
    '세운과 월운의 가까운 흐름을 실행 가능한 조언으로 바꿉니다.',
    '전체 해석을 하나의 선택 기준과 실행 전략으로 묶어 마무리합니다.',
  ];

  var LOADING_MSGS = [
    '사주 원국의 팔자 8글자와 기본 뼈대를 읽는 중...',
    '오행·십성·조후와 기질의 흐름을 분석하는 중...',
    '용신·희신·기신의 균형 기준을 정리하는 중...',
    '대운의 큰 흐름과 현재 시기를 정밀 분석하는 중...',
    '격국과 사회적 역할의 방향을 읽는 중...',
    '궁합과 인연 관계의 법칙을 펼치는 중...',
    '연애와 결혼 구조, 이상적 관계 패턴을 분석하는 중...',
    '재물과 현실 기반, 수익 구조를 계산하는 중...',
    '직업·사업·커리어 전환 시그널을 정리하는 중...',
    '건강과 멘탈, 에너지 관리 지점을 분석하는 중...',
    '내면의 숨은 기운과 전환 전략을 정리하는 중...',
    '세운과 월운의 12개월 실행 조건을 탐색하는 중...',
    '최종 선택 기준을 완성하는 중...',
  ];

  var MYSTIC_QUOTES = [
    '팔자 여덟 글자 속에 당신만의 계절이 열리고 있습니다.',
    '태어난 시간의 하늘 기운이 지금의 삶과 조용히 맞물립니다.',
    '천간과 지지가 엮어 온 운명의 결을 차분히 펼칩니다.',
    '용신의 빛이 당신의 강점과 회복의 길을 밝히고 있습니다.',
    '대운은 인생의 계절입니다. 지금 머무는 계절의 뜻이 깊게 드러납니다.',
    '음양의 균형 속에서 당신에게 필요한 선택의 기준을 찾습니다.',
    '오행의 흐름은 몸과 마음, 일과 사랑의 리듬을 함께 비춥니다.',
    '격국은 하늘이 당신에게 부여한 사회적 무대의 윤곽입니다.',
    '관계의 자리에서 인연의 법칙과 회복의 문장을 발견합니다.',
    '재성의 위치가 당신의 부와 현실 감각이 모이는 길을 말해줍니다.',
    '세운이 다가오는 시기와 장소를 세밀하게 계산하고 있습니다.',
    '삶의 파도를 읽어 오직 당신을 위한 전략으로 엮습니다.',
    '신강과 신약의 경계에서 진짜 강점이 드러납니다.',
    '타고난 구조와 지금의 흐름을 당신의 언어로 기록합니다.',
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
    9: ['적성 직업군', '업무 환경 적합도', '선택 연도 커리어 패턴', '조직·프리랜서·사업 판단', '장기 커리어 설계'],
    10: ['생활 기반 건강 취약점', '스트레스 반응 패턴', '번아웃 신호와 회복', '생활 리듬 처방', '멘탈 회복 루틴'],
    11: ['도화·역마·귀문 해석', '삶에서의 발현 방식', '강점으로 쓰는 법', '위험 구간과 트리거', '실전 조절법'],
    12: ['선택 연도 핵심 흐름', '월별 주의 포인트', '기회가 강한 시기', '선택 연도 결정 타이밍', '12개월 행동 전략'],
    13: ['사주 핵심 요약', '붙잡아야 할 방향', '버려야 할 반복 패턴', '3일·5주·10개월 로드맵', '최종 상담 메시지'],
  };

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

function _syncLifeBookDownloadButtons() {
  var targets = _getLifeBookDownloadTargets();
  var hasPdf = !!_clean(targets.pdfUrl);
  var hasHtml = !!(_clean(targets.htmlUrl) || _clean(targets.html));
  var pdfBtn = document.getElementById('lbPdfBtn');
  var htmlBtn = document.getElementById('lbHtmlBtn');
  if (pdfBtn) {
    pdfBtn.style.display = hasPdf ? '' : 'none';
    pdfBtn.disabled = !hasPdf;
  }
  if (htmlBtn) {
    htmlBtn.style.display = hasHtml ? '' : 'none';
    htmlBtn.disabled = !hasHtml;
  }
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
  var _lbCurrentTargetYear = new Date().getFullYear();
  var _lbLastRequestContext = {};
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

  function _resolveLifeBookTargetYear(rawYear) {
    var input = document.getElementById('lbTargetYear');
    var raw = rawYear !== undefined && rawYear !== null && String(rawYear).trim() !== '' ? Number(rawYear) : (input ? Number(input.value) : NaN);
    var fallback = new Date().getFullYear();
    var year = Number.isFinite(raw) ? Math.trunc(raw) : fallback;
    if (year < LIFEBOOK_TARGET_YEAR_MIN) year = LIFEBOOK_TARGET_YEAR_MIN;
    if (year > LIFEBOOK_TARGET_YEAR_MAX) year = LIFEBOOK_TARGET_YEAR_MAX;
    if (input) input.value = String(year);
    return year;
  }

  function _lbStartPremiumJob(profile, targetYear) {
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
        targetYear: Number(targetYear || new Date().getFullYear()),
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

  function _clearPremiumAccessToken(expectedToken) {
    var expected = String(expectedToken || '').trim();
    try {
      if (!expected || String(window.__cdPremiumAccessToken || '').trim() === expected) window.__cdPremiumAccessToken = '';
    } catch (_) {}
    try {
      if (!expected || String(sessionStorage.getItem('cd_premium_access_token') || '').trim() === expected) sessionStorage.removeItem('cd_premium_access_token');
    } catch (_) {}
    try {
      if (!expected || String(localStorage.getItem('cd_premium_access_token') || '').trim() === expected) localStorage.removeItem('cd_premium_access_token');
    } catch (_) {}
  }

  function _persistLifeBookAccessGrant(accessGrant, premiumToken, profileKey) {
    if (!accessGrant || typeof accessGrant !== 'object') return;
    var record = {
      accessGrant: accessGrant,
      premiumAccessToken: String(premiumToken || '').trim(),
      profileKey: _clean(profileKey),
      savedAt: new Date().toISOString()
    };
    try { sessionStorage.setItem('cd_lifebook_access_grant', JSON.stringify(record)); } catch (_) {}
    try { localStorage.setItem('cd_lifebook_access_grant', JSON.stringify(record)); } catch (_) {}
  }

  function _readLifeBookAccessGrant(expectedProfileKey) {
    var raw = '';
    try { raw = sessionStorage.getItem('cd_lifebook_access_grant') || ''; } catch (_) { raw = ''; }
    if (!raw) { try { raw = localStorage.getItem('cd_lifebook_access_grant') || ''; } catch (_) { raw = ''; } }
    if (!raw) return null;
    try {
      var record = JSON.parse(raw);
      var savedAt = record && record.savedAt ? Date.parse(record.savedAt) : 0;
      if (!record || !record.accessGrant || !Number.isFinite(savedAt) || Date.now() - savedAt > 30 * 60 * 1000) return null;
      var expected = _clean(expectedProfileKey);
      if (expected && _clean(record.profileKey) !== expected) return null;
      return record;
    } catch (_) {
      return null;
    }
  }

  function _clearLifeBookAccessGrant() {
    try { sessionStorage.removeItem('cd_lifebook_access_grant'); } catch (_) {}
    try { localStorage.removeItem('cd_lifebook_access_grant'); } catch (_) {}
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

  async function _runLifeBookCoinGate(reportId, profileKey) {
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
          if (accessGrant) _persistLifeBookAccessGrant(accessGrant, issuedToken, profileKey);
          resolve({
            ok: !!accessGrant,
            status: accessGrant ? 200 : 500,
            message: accessGrant ? '' : _lifeBookText('access.unverified'),
            accessGrant: accessGrant,
            premiumAccessToken: issuedToken,
            requestId: requestId,
          });
        }
        function cancel() {
          if (settled) return;
          settled = true;
          resolve({ ok: false, status: 402, message: _lifeBookText('payment.cancelled'), requestId: requestId });
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
    if (accessGrant) _persistLifeBookAccessGrant(accessGrant, issuedToken, profileKey);
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
        var err = new Error(message || '인생의 책 LLM 생성 요청에 실패했습니다.');
        if (meta && typeof meta === 'object') {
          err.status = Number(meta.status || 0);
          err.code = String(meta.code || '').trim();
        }
        reject(err);
      }

      function runNext() {
        if (idx >= endpoints.length) {
          doneFail(lastErr || '인생의 책 LLM 생성 요청에 실패했습니다.');
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
            lastErr = err instanceof Error ? err : new Error(_normalizeLifeBookErrorMessage(err, '상태 조회 요청이 중단되었습니다.'));
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

  function _collectLifeBookQuantumMyeongriJson(profile, targetYear) {
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var pillars = window.G_PILLARS || {};
    var power = window.G_POWER || {};
    var johu = window.G_JOHU || {};
    var jong = window.G_JONG || {};
    var daewunList = _normalizeLifeBookDaewunList(window.G_DAEWUN || window.G_DAEUN || []);
    var birth = (profile && profile.birth) || snap.birth || {};
    var resolvedTargetYear = Number(targetYear);
    if (!Number.isFinite(resolvedTargetYear) || resolvedTargetYear < 1900 || resolvedTargetYear > 2200) resolvedTargetYear = new Date().getFullYear();
    var currentDaewunNode = null;
    var nextDaewunNode = null;
    if (Array.isArray(daewunList) && daewunList.length && birth && birth.year) {
      var targetAge = resolvedTargetYear - Number(birth.year || 0) + 1;
      for (var di = 0; di < daewunList.length; di++) {
        var row = daewunList[di] || {};
        var nextRow = daewunList[di + 1] || null;
        var startAge = Number(row.age || row.startAge || 0);
        var endAge = nextRow ? Number(nextRow.age || nextRow.startAge || 999) : 999;
        if (targetAge >= startAge && targetAge < endAge) {
          currentDaewunNode = row;
          nextDaewunNode = nextRow;
          break;
        }
      }
      if (!currentDaewunNode) currentDaewunNode = daewunList[daewunList.length - 1] || null;
    }
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
          current: currentDaewunNode || daewunList[0] || null,
          next: nextDaewunNode || null,
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

  function _collectLifeBookAnalysisSignals(profile, targetYear) {
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
      var resolvedTargetYear = Number(targetYear);
      if (!Number.isFinite(resolvedTargetYear) || resolvedTargetYear < 1900 || resolvedTargetYear > 2200) resolvedTargetYear = new Date().getFullYear();
      var currentAge = resolvedTargetYear - Number(profile.birth.year || 0) + 1;
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
    if (/^[A-Z0-9_:-]+$/.test(raw) || /\b(SEED|JSON|PAYLOAD|SCHEMA|UNDEFINED|NULL|NAN)\b/i.test(raw)) {
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

  /* 모달 화면 제어 */
  function _showScreen(id) {
    var screens = ['lbStartScreen', 'lbLoadingScreen', 'lbResultScreen', 'lbErrorScreen'];
    for (var i = 0; i < screens.length; i++) {
      var el = _qs(screens[i]);
      if (el) el.style.display = (screens[i] === id) ? '' : 'none';
    }
    if (id === 'lbResultScreen') {
      setTimeout(_syncLifeBookDownloadButtons, 0);
    }
  }

  function _mergeLifeBookRequestContext(context) {
    if (!context || typeof context !== 'object') return _lbLastRequestContext || {};
    _lbLastRequestContext = Object.assign({}, _lbLastRequestContext || {}, context);
    if (_clean(context.reportId)) _lbCurrentReportId = _clean(context.reportId);
    return _lbLastRequestContext;
  }

  function _formatLifeBookRequestContext(context) {
    var ctx = context && typeof context === 'object' ? context : (_lbLastRequestContext || {});
    var parts = [];
    if (_clean(ctx.reportId || _lbCurrentReportId)) parts.push('reportId ' + _clean(ctx.reportId || _lbCurrentReportId));
    if (_clean(ctx.sessionId)) parts.push('sessionId ' + _clean(ctx.sessionId));
    if (_clean(ctx.requestId)) parts.push('requestId ' + _clean(ctx.requestId));
    return parts.join(' · ');
  }

  function _showLifeBookError(message, context) {
    var ctx = _mergeLifeBookRequestContext(context);
    var msgEl = _qs('lbErrorMsg');
    if (msgEl) {
      msgEl.textContent = String(message || '인생의 책 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.').trim();
      msgEl.style.whiteSpace = 'pre-line';
    }
    var detailEl = _qs('lbErrorDetail');
    if (detailEl) {
      var detail = _formatLifeBookRequestContext(ctx);
      detailEl.textContent = detail ? detail : '';
      detailEl.style.display = detail ? '' : 'none';
    }
    _showScreen('lbErrorScreen');
  }

  function _parseLifeBookBirthDateInput(value) {
    var raw = String(value || '').trim();
    if (!raw) return null;
    var datePart = raw.split(/[T\s]/)[0] || raw;
    var parts = datePart.indexOf('-') >= 0 || datePart.indexOf('/') >= 0 || datePart.indexOf('.') >= 0
      ? datePart.split(/[-/.]/)
      : [datePart.replace(/\D/g, '').slice(0, 4), datePart.replace(/\D/g, '').slice(4, 6), datePart.replace(/\D/g, '').slice(6, 8)];
    if (parts.length < 3 || String(parts[0] || '').length < 4) return null;
    var y = Number(parts[0]);
    var m = Number(parts[1]);
    var d = Number(parts[2]);
    return y && m && d ? { year: y, month: m, day: d } : null;
  }

  /** DOM 입력값에서 생년월일 복구 */
  function _recoverBirthFromDOM() {
    try {
      var dateEl = document.getElementById('birthDate');
      var nameEl = document.getElementById('nameInput');
      var isFemale = document.querySelector('#btnF.on') !== null;
      if (!dateEl || !dateEl.value) return null;
      var parts = _parseLifeBookBirthDateInput(dateEl.value);
      if (!parts) return null;
      var y = Number(parts.year), m = Number(parts.month), d = Number(parts.day);
      if (!y || !m || !d) return null;
      var hourEl = document.getElementById('birthHour');
      var minEl = document.getElementById('birthMinute');
      /* 출생지는 모달 전용 선택기를 우선 사용하고 없으면 기본값을 사용 */
      var locationData = { label: _lifeBookText('birthCountry.seoul'), lng: 127.0, lat: 37.6, tz: 'Asia/Seoul', tzOffset: 9, baseTzOffset: 9 };
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

  /** 사주 데이터 유효성 확인 */
  function _getActiveBirthProfile() {
    var p = window.__cdActiveBirthProfile;
    if (p && p.birth && p.birth.year) return p;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return fromDom;
    return null;
  }

  function _isLifeBookUnknownBirthTimeProfile(profile) {
    var birth = (profile && profile.birth) || {};
    if (birth.birthTimeKnown === false || birth.timeKnown === false || birth.timeUnknown === true || birth.isTimeUnknown === true) return true;
    if (profile && (profile.birthTimeKnown === false || profile.timeUnknown === true || profile.isTimeUnknown === true)) return true;
    try {
      var hourEl = document.getElementById('birthHour');
      var minuteEl = document.getElementById('birthMinute');
      var hour = Number(birth.hour);
      var domHour = hourEl ? Number(hourEl.value) : NaN;
      var markedUnknown = window.__cdBirthTimeUnknown === true
        || (hourEl && hourEl.getAttribute('data-cd-time-unknown') === '1')
        || (minuteEl && minuteEl.getAttribute('data-cd-time-unknown') === '1');
      return markedUnknown && Number.isFinite(hour) && hour === 12 && (!Number.isFinite(domHour) || domHour === 12);
    } catch (_) {
      return false;
    }
  }

  function _validateLifeBookProfileForGeneration(profile) {
    if (!profile) {
      return { ok: false, message: _lifeBookText('validation.needSaju') };
    }
    var birth = (profile && profile.birth) || {};
    if (!birth.year || !birth.month || !birth.day) {
      return { ok: false, message: _lifeBookText('validation.birthDate') };
    }
    if (_isLifeBookUnknownBirthTimeProfile(profile)) {
      return {
        ok: false,
        code: 'BIRTH_TIME_REQUIRED',
        message: _lifeBookText('validation.exactBirthTime')
      };
    }
    var hour = Number(birth.hour);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
      return {
        ok: false,
        code: 'BIRTH_TIME_REQUIRED',
        message: _lifeBookText('validation.needBirthTime')
      };
    }
    return { ok: true };
  }

  var _LB_STORE_VER = 'lb_v2_';

  function _lbStoreKeyPart(value) {
    var text = _clean(value);
    return encodeURIComponent(text || '0').replace(/%/g, '~');
  }

  function _lbResolveProfileLocationKey(profile) {
    var location = profile && profile.location && typeof profile.location === 'object' ? profile.location : {};
    return _clean(location.label || location.name || location.city || profile && (profile.birthplace || profile.birthPlace || profile.locationLabel));
  }

  function _lbBuildProfileCacheKey(profile) {
    var p = profile && typeof profile === 'object' ? profile : {};
    var b = (p.birth && typeof p.birth === 'object') ? p.birth : {};
    var hour = b.hour;
    if (hour === undefined || hour === null || hour === '') hour = p.birthHour;
    if (hour === undefined || hour === null || hour === '') hour = p.hour;
    var minute = b.minute;
    if (minute === undefined || minute === null || minute === '') minute = b.minutes;
    if (minute === undefined || minute === null || minute === '') minute = p.birthMinute;
    if (minute === undefined || minute === null || minute === '') minute = p.minute;
    var calendarType = b.calendarType || p.calendarType || p.lunarSolar || 'solar';
    return [
      b.year || p.year || '0',
      b.month || p.month || '0',
      b.day || p.day || '0',
      hour === undefined || hour === null || hour === '' ? 'unknownHour' : hour,
      minute === undefined || minute === null || minute === '' ? 'unknownMinute' : minute,
      calendarType,
      p.gender || 'u',
      _lbResolveProfileLocationKey(p) || 'unknownPlace',
      _lbCurrentTargetYear || new Date().getFullYear()
    ].map(_lbStoreKeyPart).join('_');
  }

  function _lbMakeKey(profile) {
    return _LB_STORE_VER + _lbBuildProfileCacheKey(profile);
  }

  function _lbSaveResult(profile) {
    try {
      localStorage.setItem(_lbMakeKey(profile), JSON.stringify({
        chapters: _chapters,
        reportId: _lbCurrentReportId || '',
        pdfUrl: _lbPendingPdfUrl || '',
        htmlUrl: _lbPendingHtmlUrl || '',
        reportUrl: _lbPendingReportUrl || '',
        pdfHtml: _lbPendingPdfHtml || '',
        name: (profile && profile.name) || '사용자',
        birth: (profile && profile.birth) || {},
        gender: (profile && profile.gender) || '',
        targetYear: _lbCurrentTargetYear || new Date().getFullYear(),
        savedAt: new Date().toISOString()
      }));
    } catch (e) { /* 저장 용량 초과 또는 브라우저 제한 */ }
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
    _lbCurrentReportId = String(saved.reportId || '').trim();
    _lbPendingPdfUrl = String(saved.pdfUrl || '').trim();
    _lbPendingHtmlUrl = String(saved.htmlUrl || '').trim();
    _lbPendingReportUrl = String(saved.reportUrl || '').trim();
    _lbPendingPdfHtml = String(saved.pdfHtml || '').trim();
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
    var targetYearInput = document.getElementById('lbTargetYear');
    if (targetYearInput && !String(targetYearInput.value || '').trim()) {
      targetYearInput.value = String(new Date().getFullYear());
    }
    _lbCurrentTargetYear = _resolveLifeBookTargetYear();

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
      // 입력 영역으로 스크롤 유도
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

    // 복구된 프로필이 있으면 window에 주입
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

    /* 출생지 선택기 초기화 */
    if (typeof window.populateCountrySelectById === 'function') {
      var locLabel = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.location && window.__cdActiveBirthProfile.location.label)
        ? window.__cdActiveBirthProfile.location.label : _lifeBookText('birthCountry.seoul');
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
    llm_draft: 'LLM 전용 인생의 책 본문 생성 준비 중',
    llm_chapters_start: 'LLM 전용 인생의 책 본문 생성 준비 중',
    llm_writing: '인생의 책 원고를 정리하는 중',
    writing_llm: '인생의 책 원고를 정리하는 중',
    calculation_validated: '사주 계산 완료 · LLM 원고 생성 시작',
    rendering_pdf: 'PDF 편집과 렌더링 중',
    done: '완료',
    llm_reinforce: '부족한 장을 보강하는 중',
  };

  Object.assign(_lbStateMessages, {
    llm_draft: 'LLM 전용 인생의 책 본문 생성 준비 중',
    llm_chapters_start: 'LLM 전용 인생의 책 본문 생성 준비 중',
    llm_writing: '인생의 책 원고를 LLM으로 정리하는 중',
    writing_llm: '인생의 책 원고를 LLM으로 정리하는 중',
    calculation_validated: '사주 계산 완료 · LLM 원고 생성 시작',
    llm_reinforce: '인생의 책 원고를 보강하는 중',
  });

  window.generateLifeBook = function (options) {
    if (_isLifeBookGenerationBusy()) return;

    var opts = options && typeof options === 'object' ? options : {};
    var inputReportId = String(opts.reportId || '').trim();
    var inputAccessGrant = (opts.accessGrant && typeof opts.accessGrant === 'object') ? opts.accessGrant : null;
    var inputPremiumToken = String(opts.premiumAccessToken || '').trim();
    var targetYear = _resolveLifeBookTargetYear(opts.targetYear);
    _lbCurrentTargetYear = targetYear;
    var profile = _getActiveBirthProfile();
    var profileCheck = _validateLifeBookProfileForGeneration(profile);
    if (!profileCheck.ok) {
      _showLifeBookError(profileCheck.message || '사주 계산 정보를 확인해 주세요.');
      return;
    }
    var profileCacheKey = _lbBuildProfileCacheKey(profile);
    _mergeLifeBookRequestContext({ profileKey: profileCacheKey, targetYear: targetYear });

    if (!inputAccessGrant) {
      var gateReportId = inputReportId || ('lifebook_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8));
      var gateSessionId = 'life-book:' + gateReportId;
      _mergeLifeBookRequestContext({ reportId: gateReportId, sessionId: gateSessionId, profileKey: profileCacheKey, targetYear: targetYear });
      var savedGrant = _readLifeBookAccessGrant(profileCacheKey);
      if (savedGrant && savedGrant.accessGrant) {
        window.generateLifeBook({
          reportId: String(savedGrant.accessGrant.reportId || gateReportId),
          accessGrant: savedGrant.accessGrant,
          premiumAccessToken: String(savedGrant.premiumAccessToken || '').trim(),
          targetYear: targetYear,
        });
        return;
      }
      _flowLog('COIN_GATE_START', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: gateReportId, message: 'lifebook-gate-start' });
      _lifeBookLog('PaymentGateStart', { reportId: gateReportId });
      (async function runLifeBookGateThenGenerate() {
        try {
          var gate = await _runLifeBookCoinGate(gateReportId, profileCacheKey);
          if (!gate.ok || !gate.accessGrant) {
            var failMsg = String(gate && gate.message ? gate.message : _lifeBookText('access.notConfirmed'));
            _flowLog('PAYMENT_ACCESS_CHECK', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: gateReportId, ok: false, status: Number(gate && gate.status || 500), message: failMsg });
            _logLifeBookError(gate || { message: failMsg }, { stage: 'billing', reportId: gateReportId });
            _showLifeBookError(failMsg, { reportId: gateReportId, sessionId: gateSessionId, requestId: String(gate && gate.requestId || ''), profileKey: profileCacheKey });
            return;
          }
          _mergeLifeBookRequestContext({
            reportId: String(gate.accessGrant.reportId || gateReportId),
            sessionId: String(gate.accessGrant.sessionId || gateSessionId),
            purchaseId: String(gate.accessGrant.purchaseId || ''),
            requestId: String(gate.accessGrant.requestId || gate.requestId || ''),
            profileKey: profileCacheKey,
          });
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
            targetYear: targetYear,
          });
        } catch (error) {
          var message = String(error && error.message ? error.message : _lifeBookText('payment.confirmError'));
          _flowLog('PAYMENT_ACCESS_CHECK', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: gateReportId, ok: false, status: 500, message: message });
          _logLifeBookError(error, { stage: 'billing', reportId: gateReportId });
          _showLifeBookError(message + ' ' + _lifeBookText('payment.checkHistoryRetry'), { reportId: gateReportId, sessionId: gateSessionId, profileKey: profileCacheKey });
        }
      })();
      return;
    }

    _lifeBookLog('ProfileResolved', {
      hasBirthDate: Boolean(profile && profile.birth && profile.birth.year),
      hasBirthTime: Boolean(profile && profile.birth && Number.isFinite(Number(profile.birth.hour))),
      gender: String((profile && profile.gender) || ''),
    });
    // 복구한 프로필 주입
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
        /* 선택한 위치로 사주 원국 재계산 */
        if (typeof window.computeProfileForModal === 'function') {
          window.computeProfileForModal(profile);
        }
      }
    }

    _startLifeBookGenerationState();
    _lbCurrentAccessGrant = inputAccessGrant;
    _lbCurrentPremiumToken = inputPremiumToken;
    _persistLifeBookAccessGrant(inputAccessGrant, inputPremiumToken, profileCacheKey);
    _mergeLifeBookRequestContext({
      reportId: String(inputAccessGrant.reportId || inputReportId || ''),
      sessionId: String(inputAccessGrant.sessionId || ''),
      purchaseId: String(inputAccessGrant.purchaseId || ''),
      requestId: String(inputAccessGrant.requestId || ''),
      profileKey: profileCacheKey,
    });
    _lbStartPremiumJob(profile, targetYear);
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
      targetYear: targetYear,
    });
    _flowLog('SAJU_DATA_READY', {
      featureKey: LIFE_BOOK_FEATURE_KEY,
      hasSajuData: Boolean(sajuData && sajuData.length >= 30),
      hasAccessGrant: Boolean(_lbCurrentAccessGrant),
    });

    // 핵심 출생 정보가 유효할 때만 서버 계산 seed(JSON)로 생성 진행
    var _hasBirthCore = Boolean(profile && profile.birth && profile.birth.year && profile.birth.month && profile.birth.day);
    if (!_hasBirthCore) {
      _clearLifeBookGenerationState();
      _lifeBookLog('ValidationBeforePayment', { ok: false, reason: 'missing_birth_core' });
      _showLifeBookError('생년월일 정보를 확인해 주세요. 출생 정보가 있어야 인생의 책을 생성할 수 있습니다.');
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

    // 준비 멘트 인터벌 시작
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
    _lbRunPremiumJob(LIFEBOOK_TOTAL_CHAPTERS);

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
      _flowLog('FRONT_PIPELINE_SETUP_FAILED', { featureKey: LIFE_BOOK_FEATURE_KEY, message: String(_prepErr && _prepErr.message || '생성 준비 중 오류가 발생했습니다.') });
      _lifeBookLog('ValidationBeforePayment', { ok: false, reason: 'generation-setup-failed' });
      _showLifeBookError('생성 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    (async function runLifeBookSinglePass() {
      var _lbReportId = inputReportId || 'lifebook_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      _lbCurrentReportId = _lbReportId;
      _mergeLifeBookRequestContext({ reportId: _lbReportId, profileKey: profileCacheKey });

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
      _lifeBookLog('CalculationStart', { reportId: _lbReportId });
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
      var _birthTimeKnown = Number.isFinite(_birthHourRaw) && _birthHourRaw >= 0 && _birthHourRaw <= 23 && !_isLifeBookUnknownBirthTimeProfile(profile);
      var _payload = {
        serviceKey: 'saju-lifebook',
        productKey: LIFE_BOOK_FEATURE_KEY,
        featureKey: LIFE_BOOK_FEATURE_KEY,
        generationMode: 'llm-only',
        calculationSource: 'local-saju-engine',
        authoringMode: 'llm-only',
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
        targetYear: targetYear,
        analysisYear: targetYear,
        hour: _birthTimeKnown ? _birthHourRaw : 12,
        minute: _birthTimeKnown ? Number.isFinite(_birthMinuteRaw) ? _birthMinuteRaw : 0 : 0,
        birthplace: String((profile && profile.location && profile.location.label) || '대한민국'),
        sajuData: String(sajuData || ''),
        analysisSignals: _collectLifeBookAnalysisSignals(profile, targetYear),
        quantumMyeongriJson: _collectLifeBookQuantumMyeongriJson(profile, targetYear),
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
          _setGenerationState('writing_llm');
        }
        if (Number.isFinite(_current) && _current > 0) {
          _setProgress(Math.min(LIFEBOOK_TOTAL_CHAPTERS, Math.max(0, _current)));
          _lifeBookLog('LlmChapterProgress', {
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
        try {
          _prepare = await _postLifeBookPrepare(_payload, _headers);
        } catch (_retryErr) {
          _clearLifeBookAccessGrant();
          _clearPremiumAccessToken(_lbPremiumToken);
          throw _retryErr;
        }
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
        _setGenerationState('llm_writing');
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
      var _manuscriptSource = String((_data && _data.manuscriptSource) || ((_data && _data.pdfReady && _data.pdfReady.metadata && _data.pdfReady.metadata.manuscriptSource) || 'life-book-llm-v1')).trim();
      _lifeBookLog('ManuscriptSourceResolved', { source: _manuscriptSource || 'life-book-llm-v1' });
      var _serverChapters = Array.isArray(_data.chapters) ? _data.chapters : [];
      if (_serverChapters.length !== LIFEBOOK_TOTAL_CHAPTERS) {
        throw new Error('LIFE_BOOK_CHAPTER_COUNT_INVALID:' + _serverChapters.length);
      }
      _flowLog('LIFE_BOOK_CHAPTERS_BUILT', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: _lbReportId, chapterCount: _serverChapters.length });
      _mergeLifeBookRequestContext({
        reportId: _lbReportId,
        sessionId: _clean(_data && (_data.sessionId || _data.reportSessionId)),
        profileKey: profileCacheKey,
      });

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
        _lifeBookLog('LlmDraftProgress', { chapterDone: _i + 1, total: LIFEBOOK_TOTAL_CHAPTERS });
        await new Promise(function (r) { setTimeout(r, 90); });
      }

      _setGenerationState('writing_llm');
      _flowLog('LIFE_BOOK_LLM_MANUSCRIPT_READY', { featureKey: LIFE_BOOK_FEATURE_KEY, reportId: _lbReportId });
      _lifeBookLog('LlmManuscriptReady', { reportId: _lbReportId });
      var _llmAssembly = (_data && _data.llmAssembly && typeof _data.llmAssembly === 'object')
        ? _data.llmAssembly
        : ((_data && _data.pdfReady && _data.pdfReady.llmAssembly && typeof _data.pdfReady.llmAssembly === 'object') ? _data.pdfReady.llmAssembly : {});
      if (
        !/llm/i.test(_manuscriptSource)
        || _llmAssembly.enabled !== true
        || _llmAssembly.externalGeneration !== true
        || _llmAssembly.fallbackUsed === true
        || Number(_llmAssembly.chapterCount || 0) !== LIFEBOOK_TOTAL_CHAPTERS
        || Number(_llmAssembly.expectedChapterCount || 0) !== LIFEBOOK_TOTAL_CHAPTERS
      ) {
        throw new Error('LIFE_BOOK_LLM_ASSEMBLY_REQUIRED');
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
      _showLifeBookError('인생의 책 생성 중 오류가 발생했습니다.\n\n' + errMsg + '\n\n잠시 후 다시 시도해 주세요.', {
        reportId: _lbCurrentReportId,
        profileKey: profileCacheKey,
      });
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

  function _lifeBookContextParams() {
    var ctx = _lbLastRequestContext || {};
    var params = new URLSearchParams();
    params.set('service', 'saju-lifebook');
    params.set('feature', LIFE_BOOK_FEATURE_KEY);
    if (_clean(ctx.reportId || _lbCurrentReportId)) params.set('reportId', _clean(ctx.reportId || _lbCurrentReportId));
    if (_clean(ctx.sessionId)) params.set('sessionId', _clean(ctx.sessionId));
    if (_clean(ctx.requestId)) params.set('requestId', _clean(ctx.requestId));
    return params;
  }

  function _copyLifeBookText(text) {
    var value = _clean(text);
    if (!value) return Promise.resolve(false);
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(value).then(function () { return true; }).catch(function () { return false; });
    }
    try {
      var area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(area);
      return Promise.resolve(!!ok);
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  window.openLifeBookBillingHistory = function () {
    window.location.href = '/points/history?' + _lifeBookContextParams().toString();
  };

  window.openLifeBookCharge = function () {
    var chargeBtn = document.querySelector('[data-action="openGoldenGrainCharge"]');
    if (chargeBtn && typeof chargeBtn.click === 'function') {
      chargeBtn.click();
      return;
    }
    window.location.href = '/points?service=saju-lifebook';
  };

  window.openLifeBookSupport = function () {
    window.location.href = '/contact-us?' + _lifeBookContextParams().toString();
  };

  window.copyLifeBookReportId = function () {
    var ctxText = _formatLifeBookRequestContext(_lbLastRequestContext);
    _copyLifeBookText(ctxText).then(function (ok) {
      alert(ok ? '인생의 책 요청 정보가 복사되었습니다.' : '복사할 요청 정보가 아직 없습니다.');
    });
  };

  window.downloadLifeBookPdf = async function () {
    var targets = _getLifeBookDownloadTargets();
    var fileBase = _lbCurrentReportId ? ('life-book-' + _lbCurrentReportId) : 'life-book';
    var pdfUrl = _clean(targets.pdfUrl);
    if (await _downloadLifeBookUrlWithFallback(pdfUrl, fileBase + '.pdf')) {
      return;
    }

    alert(pdfUrl
      ? 'PDF 파일 다운로드가 아직 준비되지 않았습니다. HTML 열람본 저장 버튼으로 먼저 보관할 수 있습니다.'
      : 'PDF 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  };

  window.downloadLifeBookHtml = async function () {
    var targets = _getLifeBookDownloadTargets();
    var fileBase = _lbCurrentReportId ? ('life-book-' + _lbCurrentReportId) : 'life-book';
    var htmlUrl = _clean(targets.htmlUrl);
    if (await _downloadLifeBookUrlWithFallback(htmlUrl, fileBase + '.html')) return;

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
    if (!htmlUrl && _clean(_lbPendingPdfHtml) && await _downloadLifeBookUrlWithFallback('data:text/html;charset=utf-8,' + encodeURIComponent(_lbPendingPdfHtml), fileBase + '.html')) {
      return;
    }

    if (!_chapters.length) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }

    alert('HTML 열람본이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var btn = target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'openLifeBookModal') {
      // 유료 게이트 없이 타일 클릭 시 직접 모달 열기
      window.openLifeBookModal();
      return;
    }
    if (action === 'closeLifeBookModal') {
      window.closeLifeBookModal();
      return;
    }
    if (action === 'generateLifeBook') {
      // 이미 생성 중이면 결제 처리 전에 즉시 차단
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
    if (action === 'downloadLifeBookHtml') {
      window.downloadLifeBookHtml();
      return;
    }
    if (action === 'openLifeBookBillingHistory') {
      window.openLifeBookBillingHistory();
      return;
    }
    if (action === 'openLifeBookCharge') {
      window.openLifeBookCharge();
      return;
    }
    if (action === 'copyLifeBookReportId') {
      window.copyLifeBookReportId();
      return;
    }
    if (action === 'openLifeBookSupport') {
      window.openLifeBookSupport();
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

  // 모달 오버레이 클릭으로 닫기
  var _overlay = document.querySelector('#lifeBookModal .lb-modal__overlay');
  if (_overlay) {
    _overlay.addEventListener('click', function () { window.closeLifeBookModal(); });
  }

})();
