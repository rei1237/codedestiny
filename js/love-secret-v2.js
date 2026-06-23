/**
 * 연애 비책 v2 — 운명의 설계도
 * 사주 기반 AI 연애 전략 canonical 리포트 + PDF 다운로드
 * CODE-DESTINY Premium
 */
(function () {
  'use strict';

  if (typeof window !== 'undefined' && window.__cdLoveSecretV2Initialized) {
    return;
  }
  if (typeof window !== 'undefined') {
    window.__cdLoveSecretV2Initialized = true;
  }

  var LOVE_SECRET_CHAPTER_META = {
    solo: {
      titles: [
        '나의 사랑 원형',
        '끌림의 공식',
        '연애 패턴 분석',
        '표현과 소통',
        '연애에서의 불안과 집착',
        '결혼운과 배우자운',
        '이별과 재회 패턴',
        '조후로 보는 친밀감과 속궁합',
        '좋은 인연을 만나는 시기와 조건',
        '나를 위한 연애 마스터플랜'
      ],
      subtitles: [
        '나는 어떤 방식으로 사랑하는가',
        '내가 끌리는 사람과 나를 끌어당기는 사람',
        '반복되는 사랑의 흐름',
        '말, 침묵, 감정 전달법',
        '사랑받고 싶은 마음과 안정감의 리듬',
        '오래 함께할 사람의 조건',
        '멀어지는 이유와 다시 이어지는 조건',
        '관계의 온도와 정서적 밀착 리듬',
        '대운·세운으로 보는 만남의 창',
        '앞으로의 사랑을 위한 실전 전략'
      ],
      loading: [
        '사랑의 원국을 정리하는 중입니다',
        '일지와 배우자궁의 흐름을 해석하는 중입니다',
        '연애 패턴과 표현 방식을 정리하는 중입니다',
        '감정 표현과 소통 방식을 집필하는 중입니다',
        '연애의 불안과 집착 패턴을 진단하는 중입니다',
        '결혼운과 배우자궁을 해석하는 중입니다',
        '이별과 재회 패턴을 분석하는 중입니다',
        '조후와 친밀감 속궁합을 집필하는 중입니다',
        '인연의 시기와 조건을 계산하는 중입니다',
        '연애 마스터플랜을 완성하는 중입니다'
      ],
      structured: {
        1: ['일간으로 보는 사랑의 기본 태도', '일지로 보는 마음의 방어선', '월지가 만드는 연애 욕구', '천간에 드러난 표현 방식', '지지에 숨어 있는 관계 본능', '이 명식의 사랑 한 줄 해석'],
        2: ['배우자성으로 보는 이상형', '나를 흔드는 상대의 특징', '겉으로 끌리는 사람과 실제로 맞는 사람', '관계 초반에 강하게 작동하는 패턴', '피해야 할 매력의 함정', '오래 갈 수 있는 사람의 조건'],
        3: ['사랑이 시작되는 방식', '마음을 여는 속도', '가까워질수록 드러나는 모습', '자존심이 개입되는 순간', '반복되는 오해와 거리감', '관계를 안정시키는 핵심 습관'],
        4: ['식상으로 보는 표현 방식', '말이 강해지는 순간', '침묵으로 마음을 숨기는 패턴', '상대가 오해하기 쉬운 표현', '갈등을 풀어내는 대화법', '사랑을 지키는 말의 온도'],
        5: ['사랑받고 있는지 확인하고 싶어지는 순간', '불안이 커지는 관계 조건', '집착처럼 보일 수 있는 행동', '마음이 식어 보이는 이유', '안정감을 회복하는 방법'],
        6: ['일지로 보는 배우자궁', '배우자성과 현실 조건', '결혼에 유리한 관계 구조', '결혼 후 반복될 수 있는 갈등', '오래 가는 파트너십의 조건'],
        7: ['관계가 멀어지는 이유', '이별 후 마음이 남는 구조', '미련이 남는 이유', '다시 이어질 수 있는 조건', '관계를 회복시키는 현실 전략'],
        8: ['내 명식의 온도와 친밀감 방식', '마음이 가까워질 때 반응하는 방식', '따뜻함이 필요한 사람인지 거리가 필요한 사람인지', '속궁합에서 중요하게 느끼는 안정감', '건강한 친밀감을 유지하는 법'],
        9: ['인연운이 열리는 흐름', '대운에서 사랑이 들어오는 방식', '세운에서 조심해야 할 관계', '좋은 사람을 알아보는 기준', '사랑운을 살리는 현실 전략'],
        10: ['내 연애의 최종 핵심 메시지', '반드시 버려야 할 연애 습관', '반드시 키워야 할 사랑의 태도', '나에게 맞는 사람을 선택하는 법', '앞으로의 사랑을 위한 실전 조언']
      }
    },
    compatibility: {
      titles: [
        '두 사람의 관계 코드',
        '첫 끌림과 호감 조건',
        '감정 궁합',
        '대화와 표현 궁합',
        '갈등 패턴',
        '화해와 회복력',
        '현실 조건 궁합',
        '장기 관계 가능성',
        '올해의 관계 흐름',
        '최종 궁합 비책'
      ],
      subtitles: [
        '각자의 사주가 만났을 때 생기는 기본 결',
        '서로에게 끌리는 지점과 조심할 기대',
        '정서적 안정감과 반응 속도의 차이',
        '말의 결, 침묵의 의미, 오해의 방향',
        '부딪히는 순간 드러나는 각자의 방어 방식',
        '다시 가까워지는 데 필요한 조건',
        '생활, 책임, 돈, 시간의 조율',
        '오래 가는 관계로 이어질 때 필요한 약속',
        '올해 두 사람에게 강해지는 기회와 주의점',
        '두 사람이 함께 지킬 30일 관계 루틴'
      ],
      loading: [
        '두 사람의 관계 코드를 정리하는 중입니다',
        '첫 끌림과 호감 조건을 분석하는 중입니다',
        '감정 궁합과 안정감을 살피는 중입니다',
        '대화와 표현의 결을 정리하는 중입니다',
        '갈등이 생기는 구조를 진단하는 중입니다',
        '화해와 회복의 순서를 구성하는 중입니다',
        '현실 조건 궁합을 점검하는 중입니다',
        '장기 관계 가능성을 해석하는 중입니다',
        '올해의 관계 흐름을 계산하는 중입니다',
        '최종 궁합 비책을 완성하는 중입니다'
      ],
      structured: {
        1: ['첫눈에 느껴지는 관계의 결', '일간·일지·월지 핵심 궁합', '끌림과 안정감의 균형', '관계를 흔드는 반복 신호', '두 사람의 생활 박자', '처음부터 조율해야 할 약점', '두 사람의 최종 궁합 한 문장'],
        2: ['처음 호감이 생기는 이유', '기질 차이가 매력으로 보이는 지점', '기질 차이가 상처가 되는 지점', '상대에게 끌리는 지점', '좋은 호감을 유지하는 기준', '위험한 기대와 착각', '호감이 안정감으로 바뀌는 조건'],
        3: ['정서적 안정감', '불안이 커지는 순간', '감정 속도 차이', '서로를 안심시키는 방식', '질투와 비교심이 생기는 지점', '편안함을 느끼는 감정 리듬', '감정 궁합을 살리는 습관'],
        4: ['말이 잘 통하는 지점', '오해가 생기는 표현', '침묵이 서운함이 되는 순간', '서운함을 안전하게 말하는 순서', '상대가 듣고 싶어 하는 확인 문장', '화해를 여는 문장', '관계를 살리는 대화 루틴'],
        5: ['갈등이 시작되는 원인', '싸울 때 각자 보이는 반응', '방어 반응의 차이', '상처가 깊어지는 금지 문장', '자주 부딪히는 현실 문제', '갈등을 줄이는 기준', '갈등 후 반복하면 안 되는 행동'],
        6: ['다시 가까워지는 순서', '사과와 인정의 언어', '회복 가능한 신호', '재충돌을 막는 약속', '화해가 쉬워지는 타이밍', '90일 관계 회복 루틴', '화해 후 지켜야 할 태도'],
        7: ['돈과 현실 감각의 차이', '일과 사랑의 우선순위', '가족과 주변 사람의 영향', '생활 습관의 차이', '역할 기대가 부담으로 바뀌는 순간', '현실 문제를 사랑의 편으로 돌리는 법', '현실 문제를 함께 다루는 법'],
        8: ['장기 관계로 이어질 수 있는 힘', '결혼 현실성의 강점', '가족·일·돈에서 조율할 지점', '약속이 무거워지는 시기', '함께 살아도 사랑이 남는 방식', '서로를 지치게 하지 않는 약속', '장기 관계의 품격 있는 기준'],
        9: ['올해 관계 운', '가까워지기 좋은 시기', '조심해야 할 전환점', '관계 결정에 유리한 때', '각자의 운이 엇갈릴 때의 운영', '함께 운을 살리는 공동 행동', '타이밍을 잘 쓰는 방법'],
        10: ['두 사람의 최종 궁합 메시지', '반드시 지켜야 할 태도', '반드시 피해야 할 습관', '30일 관계 회복 루틴', '90일 관계 성장 루틴', '관계를 이어가거나 정리할 품격 있는 기준', '최종 선택 기준']
      }
    }
  };

  var LS_LOVE_QUOTES = [
    '사주의 여덟 글자 속에는<br>당신이 사랑할 사람의 그림자가 담겨 있습니다',
    '사랑은 우연처럼 만나지만,<br>사주는 처음부터 알고 있었습니다',
    '일지(日支) 배우자궁에는<br>이미 운명의 상대가 새겨져 있습니다',
    '紅塵十丈<br>붉은 먼지 열 길의 세상에서도 인연은 반드시 만납니다',
    '용신(用神)이 강해지는 계절,<br>반드시 인연의 문이 열립니다',
    '합(合)이 있는 곳에 인연이 있고<br>충(沖)이 있는 곳에 열정이 있습니다',
    '木은 火를 기르듯,<br>진정한 사랑은 서로를 자라게 합니다',
    '도화살(桃花煞)은 꽃의 살이 아니라<br>사람을 끌어당기는 향기입니다',
    '두 사주가 만나면<br>그것은 우연이 아니라 오행의 끌림입니다',
    '천간(天干)은 마음을 보여주고<br>지지(地支)는 본성을 드러냅니다',
    '이별은 기신운(忌神運)이 만든 파도이고<br>재회는 용신운(用神運)이 여는 문입니다',
    '내 사주팔자가 당신을 기다리고 있었습니다<br>우리의 만남은 오행이 연출한 운명입니다',
    '사랑의 타이밍도 사주에 새겨져 있습니다<br>지금 당신의 연애 비책을 해독하는 중입니다',
    '조후(調候)가 맞으면,<br>두 사람 사이에 자연스러운 온기가 흐릅니다',
    '일주(日柱)가 합(合)을 이루는 순간<br>운명은 조용히 미소 짓습니다',
  ];

  function _normalizeLoveSecretMode(mode) {
    return String(mode || '').trim() === 'compatibility' ? 'compatibility' : 'solo';
  }

  function _ensureLoveSecretUiStyles() {
    // 7048a9d 기준 생성창 스타일은 /styles/love-secret.css에서 단일 소스로 관리.
    // 런타임 인라인 스타일 주입을 비활성화해 기준 UI와 일치시킨다.
    return;
  }

  function _getLoveSecretModeTotalChapters(mode) {
    var chapterMeta = LOVE_SECRET_CHAPTER_META[_normalizeLoveSecretMode(mode)] || LOVE_SECRET_CHAPTER_META.solo;
    return Array.isArray(chapterMeta.titles) ? chapterMeta.titles.length : 0;
  }

  function _buildChapterBuffer(totalChapters) {
    return Array(Math.max(0, Number(totalChapters || 0))).fill(null);
  }

  function _getLoveSecretChapterSet(mode) {
    return LOVE_SECRET_CHAPTER_META[_normalizeLoveSecretMode(mode)] || LOVE_SECRET_CHAPTER_META.solo;
  }

  function _getLoveSecretChapterTitle(idx, mode) {
    var chapterSet = _getLoveSecretChapterSet(mode);
    return String((chapterSet.titles || [])[idx] || ('제' + (idx + 1) + '장'));
  }

  function _getLoveSecretChapterSubtitle(idx, mode) {
    var chapterSet = _getLoveSecretChapterSet(mode);
    return String((chapterSet.subtitles || [])[idx] || '');
  }

  function _getLoveSecretLoadingMessage(idx, mode) {
    var chapterSet = _getLoveSecretChapterSet(mode);
    return String((chapterSet.loading || [])[idx] || '분석 중...');
  }

  function _getLoveSecretStructuredLabels(chapter, mode) {
    var chapterSet = _getLoveSecretChapterSet(mode);
    return chapterSet.structured && chapterSet.structured[Number(chapter)] ? chapterSet.structured[Number(chapter)] : [];
  }

  function _toRoman(value) {
    var numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
    return numerals[Number(value || 0) - 1] || String(value || '');
  }

  function _renderPreviewChapters(mode) {
    var wrap = document.querySelector('.ls-preview-chapters');
    if (!wrap) return;
    var chapterSet = _getLoveSecretChapterSet(mode);
    var titles = Array.isArray(chapterSet.titles) ? chapterSet.titles : [];
    var html = [];
    for (var i = 0; i < titles.length; i++) {
      html.push('<div class="ls-chapter-item"><span class="ls-ch-num">' + _toRoman(i + 1) + '</span><span class="ls-ch-title">' + _escHtml(titles[i]) + '</span></div>');
    }
    if (html.length) wrap.innerHTML = html.join('');
  }

  function _renderLoadPills(totalChapters) {
    var host = _qs('lsLoadPills');
    if (!host) return;
    var total = Math.max(1, Number(totalChapters || 0));
    var html = [];
    for (var chapter = 1; chapter <= total; chapter++) {
      html.push('<span class="ls-load-pill" data-ch="' + chapter + '">' + _toRoman(chapter) + '</span>');
    }
    host.innerHTML = html.join('');
  }

  function _syncResultLabel(mode) {
    var labelEl = document.querySelector('.ls-result-label');
    if (!labelEl) return;
    labelEl.textContent = _normalizeLoveSecretMode(mode) === 'compatibility'
      ? '두 사람을 위한 궁합 연애 리포트'
      : '나만을 위한 운명의 연애 리포트';
  }

  function _prepareLoveSecretUi(mode) {
    var normalizedMode = _normalizeLoveSecretMode(mode);
    var total = _getLoveSecretModeTotalChapters(normalizedMode);
    _ensureLoveSecretUiStyles();
    _renderPreviewChapters(normalizedMode);
    _renderLoadPills(total);
    var progressText = _qs('lsProgressText');
    if (progressText) progressText.textContent = '0 / ' + total + ' 챕터 완성';
    _syncResultLabel(normalizedMode);
  }

  var _currentChapterMode = 'solo';
  var _chapters = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
  var _chapterStructured = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
  var _chapterMeta = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
  var _generating = false;
  var _paymentGateInFlight = null;
  var _quoteTimer = null;
  var _heartTimer = null;
  var _quoteIdx = 0;
  var _activeRequestController = null;
  var _cancelGeneration = false;
  var _lsCurrentReportId = '';
  var _lsAccessGrant = null;
  var _lsGatePurchaseId = '';
  var _lsResultPayload = null;
  var _lsFetchChapterForPartialRegenerate = null;
  var _lsJobStateKey = 'cd:premium-job:love-secret';
  var _lsLastStateKey = '';
  var LOVE_SECRET_FEATURE_KEY = 'premium_pdf_saju_love_secret';
  var LOVE_SECRET_FEATURE_KEY_BY_MODE = {
    solo: 'premium_pdf_saju_love_secret',
    compatibility: 'premium_pdf_saju_love_secret_compat'
  };
  var LOVE_SECRET_INTERNAL_FEATURE_TYPE = 'saju_love_secret';
  var LOVE_SECRET_REASON_BY_MODE = {
    solo: '사주 프리미엄 연애운 리포트 생성',
    compatibility: '사주 프리미엄 궁합 리포트 생성'
  };
  var LOVE_SECRET_PRICE_FALLBACK_BY_MODE = {
    solo: 300,
    compatibility: 400
  };
  var _loveSecretPriceCache = {};
  var LOVE_BOOK_GENERATION_MESSAGES = {
    loading_helper: '연애 비책을 펼칠 준비를 하고 있습니다.',
    checking_payment: '결제 정보를 확인하고 있습니다.',
    payment_confirmed: '결제가 확인되었습니다. 생성 준비를 이어갑니다.',
    preparing_generation: '프로필 정보 확인 중',
    calculating_saju: '사랑의 원국을 정리하는 중입니다',
    validating_partner: '궁합 모드일 경우 상대방 사주 확인 중',
    building_chapters: '연애 패턴과 표현 방식을 정리하는 중입니다',
    writing_llm: '\uD504\uB9AC\uBBF8\uC5C4\uC5C4 \uC6D0\uACE0\uB97C \uC791\uC131\uD558\uB294 \uC911\uC785\uB2C8\uB2E4',
    validating_chapters: '대운과 세운의 연애 흐름을 반영하는 중입니다',
    rendering_pdf: '연애 비책 PDF를 완성하고 있습니다.',
    completed: '연애 비책 PDF가 준비되었습니다.',
    llm_result_ready: '\uC800\uC7A5\uB41C PDF \uB9AC\uD3EC\uD2B8\uB97C \uC815\uB9AC\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4',
    failed: '연애 비책 생성이 중단되었습니다.'
  };

  function _setLoveBookGenerationState(stateKey) {
    var key = String(stateKey || '').trim();
    var message = String(LOVE_BOOK_GENERATION_MESSAGES[key] || '').trim();
    if (!message) return;
    if (_lsLastStateKey !== key) {
      _logLoveSecretFlow('STATE_' + key.toUpperCase(), { state: key, message: message, reportId: _lsCurrentReportId || '' });
      _lsLastStateKey = key;
    }
    var titleEl = _qs('lsLoadingTitle');
    var chapterEl = _qs('lsLoadingChapter');
    if (titleEl) titleEl.textContent = message;
    if (chapterEl && (key === 'loading_helper' || key === 'checking_payment' || key === 'payment_confirmed' || key === 'preparing_generation' || key === 'validating_partner' || key === 'llm_result_ready' || key === 'failed')) {
      chapterEl.textContent = message;
    }
  }

  function _lsBuildReportId(mode) {
    var suffix = _normalizeLoveSecretMode(mode) === 'compatibility' ? 'compatibility' : 'solo';
    return 'love_secret_' + suffix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function _getLoveSecretFeatureKey(mode) {
    var normalizedMode = _normalizeLoveSecretMode(mode);
    return LOVE_SECRET_FEATURE_KEY_BY_MODE[normalizedMode] || LOVE_SECRET_FEATURE_KEY_BY_MODE.solo;
  }

  function _getLoveSecretRequiredCoins(mode) {
    var normalizedMode = _normalizeLoveSecretMode(mode);
    var coins = Number(_loveSecretPriceCache[normalizedMode] || LOVE_SECRET_PRICE_FALLBACK_BY_MODE[normalizedMode]);
    return Number.isFinite(coins) && coins > 0 ? coins : 300;
  }

  function _normalizeLoveSecretPaymentContext(source, mode, reportId) {
    var normalizedMode = _normalizeLoveSecretMode(mode);
    var featureKey = _getLoveSecretFeatureKey(normalizedMode);
    var ctx = source && typeof source === 'object' ? source : {};
    var grant = ctx.accessGrant && typeof ctx.accessGrant === 'object' ? ctx.accessGrant : {};
    var raw = ctx.raw && typeof ctx.raw === 'object' ? ctx.raw : {};
    var rawData = raw.data && typeof raw.data === 'object' ? raw.data : raw;
    var rawGrant = rawData.accessGrant && typeof rawData.accessGrant === 'object' ? rawData.accessGrant : {};
    var consume = rawData.consume && typeof rawData.consume === 'object' ? rawData.consume : {};
    var normalizedReportId = String(reportId || ctx.reportId || grant.reportId || rawData.reportId || '').trim();
    var sessionId = String(
      grant.sessionId
      || rawGrant.sessionId
      || ctx.sessionId
      || ctx.reportSessionId
      || rawData.sessionId
      || rawData.reportSessionId
      || (normalizedReportId ? 'love-book:' + normalizedReportId : '')
    ).trim();
    var requestId = String(
      grant.requestId
      || rawGrant.requestId
      || ctx.requestId
      || rawData.requestId
      || consume.requestId
      || ''
    ).trim();
    var purchaseId = String(
      ctx.purchaseId
      || grant.purchaseId
      || grant.evidenceId
      || grant.paymentId
      || grant.transactionId
      || rawGrant.purchaseId
      || rawGrant.evidenceId
      || rawData.purchaseId
      || rawData.transactionId
      || rawData.paymentId
      || consume.transactionId
      || consume.purchaseId
      || consume.paymentId
      || consume._id
      || requestId
      || ''
    ).trim();
    var premiumAccessToken = String(
      ctx.premiumAccessToken
      || grant.premiumAccessToken
      || rawGrant.premiumAccessToken
      || rawData.premiumAccessToken
      || ''
    ).trim();
    var serverGranted = Boolean(
      ctx.ok === true
      || rawData.ok === true
      || rawData.canAccess === true
      || rawData.unlocked === true
      || rawData.accessGranted === true
      || (rawData.accessDecision && rawData.accessDecision.accessGranted === true)
      || grant.ok === true
      || rawGrant.ok === true
    );
    var hasAccessEvidence = Boolean(
      purchaseId
      || premiumAccessToken
      || serverGranted
      || grant.evidenceId
      || grant.paymentId
      || grant.transactionId
      || rawGrant.evidenceId
      || rawGrant.paymentId
      || rawGrant.transactionId
      || rawData.transactionId
      || rawData.paymentId
      || consume.transactionId
      || consume.paymentId
      || consume.purchaseId
    );
    if (!hasAccessEvidence) {
      return {
        accessGrant: null,
        purchaseId: '',
        premiumAccessToken: '',
        sessionId: sessionId,
        requestId: requestId,
        featureKey: featureKey,
        reportId: normalizedReportId,
      };
    }
    var accessGrant = Object.assign({}, rawGrant, grant);
    if (normalizedReportId) accessGrant.reportId = normalizedReportId;
    if (sessionId) accessGrant.sessionId = sessionId;
    if (requestId) accessGrant.requestId = requestId;
    if (purchaseId) accessGrant.purchaseId = purchaseId;
    if (featureKey) accessGrant.featureKey = featureKey;
    if (premiumAccessToken) accessGrant.premiumAccessToken = premiumAccessToken;
    if (Object.keys(accessGrant).length) accessGrant.ok = accessGrant.ok === false ? false : true;
    return {
      accessGrant: Object.keys(accessGrant).length ? accessGrant : null,
      purchaseId: purchaseId,
      premiumAccessToken: premiumAccessToken,
      sessionId: sessionId,
      requestId: requestId,
      featureKey: featureKey,
      reportId: normalizedReportId,
    };
  }

  function _getLoveSecretTargetYear() {
    var year = new Date().getFullYear();
    return Number.isFinite(year) && year >= 2026 ? year : 2026;
  }

  function _formatLoveSecretCoinLabel(coins) {
    var amount = Math.max(0, Math.floor(Number(coins || 0)));
    return amount > 0 ? (amount * 100).toLocaleString('ko-KR') + '원' : '결제 확인';
  }

  function _readLoveSecretFeatureCost(payload) {
    var sources = [];
    if (payload && typeof payload === 'object') {
      sources.push(payload);
      if (payload.data && typeof payload.data === 'object') sources.push(payload.data);
      if (payload.feature && typeof payload.feature === 'object') sources.push(payload.feature);
      if (payload.data && payload.data.feature && typeof payload.data.feature === 'object') sources.push(payload.data.feature);
    }
    for (var i = 0; i < sources.length; i++) {
      var src = sources[i];
      var value = Number(src.coinPrice || src.cost || src.coinCost || src.priceCoin || src.requiredCoins || src.requiredCoin || src.coins || 0);
      if (Number.isFinite(value) && value > 0) return Math.floor(value);
    }
    return 0;
  }

  function _applyLoveSecretPriceLabels() {
    var solo = _getLoveSecretRequiredCoins('solo');
    var compatibility = _getLoveSecretRequiredCoins('compatibility');
    var delta = Math.max(0, compatibility - solo);
    document.querySelectorAll('[data-ls-price-mode]').forEach(function (node) {
      var mode = _normalizeLoveSecretMode(node.getAttribute('data-ls-price-mode'));
      node.textContent = _formatLoveSecretCoinLabel(_getLoveSecretRequiredCoins(mode));
    });
    document.querySelectorAll('[data-ls-price-delta]').forEach(function (node) {
      node.textContent = '+' + _formatLoveSecretCoinLabel(delta);
    });
    document.querySelectorAll('[data-ls-price-button]').forEach(function (node) {
      var mode = _normalizeLoveSecretMode(node.getAttribute('data-ls-price-button'));
      node.setAttribute('data-coin-cost', String(_getLoveSecretRequiredCoins(mode)));
    });
  }

  async function _refreshLoveSecretPriceLabels() {
    _applyLoveSecretPriceLabels();
    await Promise.all(['solo', 'compatibility'].map(async function (mode) {
      var featureKey = _getLoveSecretFeatureKey(mode);
      try {
        var res = await fetch('/api/billing/features?featureKey=' + encodeURIComponent(featureKey), {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' }
        });
        if (!res || !res.ok) return;
        var json = await res.json();
        var cost = _readLoveSecretFeatureCost(json);
        if (cost > 0) _loveSecretPriceCache[_normalizeLoveSecretMode(mode)] = cost;
      } catch (_) {}
    }));
    _applyLoveSecretPriceLabels();
  }

  function _beginLoveSecretPaymentGate(mode, reportId) {
    if (_generating || _paymentGateInFlight) return false;
    _paymentGateInFlight = {
      mode: _normalizeLoveSecretMode(mode),
      reportId: String(reportId || '').trim(),
      startedAt: Date.now(),
    };
    return true;
  }

  function _endLoveSecretPaymentGate(reportId) {
    if (!_paymentGateInFlight) return;
    var currentReportId = String(reportId || '').trim();
    if (currentReportId && _paymentGateInFlight.reportId && currentReportId !== _paymentGateInFlight.reportId) return;
    _paymentGateInFlight = null;
  }

  function _lsCleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function _lsFieldValue(id) {
    var el = _qs(id);
    return _lsCleanText(el && 'value' in el ? el.value : '');
  }

  function _lsSelectedText(id, fallback) {
    var el = _qs(id);
    if (!el) return _lsCleanText(fallback);
    var option = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
    return _lsCleanText((option && (option.getAttribute('data-context') || option.textContent)) || el.value || fallback);
  }

  function _ensureLoveSecretContextPanel() {
    var existingPanel = _qs('lsLoveContextPanel');
    if (existingPanel && existingPanel.parentNode) existingPanel.parentNode.removeChild(existingPanel);
  }

  function _collectLoveSecretUserContext(mode, partnerBirthInput) {
    var normalizedMode = _normalizeLoveSecretMode(mode);
    var isCompatibility = normalizedMode === 'compatibility';
    var partnerName = _lsCleanText((partnerBirthInput && partnerBirthInput.name) || _lsFieldValue('lsPsName') || '\uc0c1\ub300\ubc29');
    var loveStatus = _lsSelectedText('lsLoveStatus', isCompatibility
      ? '\uc0c1\ub300\uc640\uc758 \uad00\uacc4 \ud750\ub984, \uad81\ud569, \uac10\uc815\uc758 \uc628\ub3c4\uc640 \uc9c0\uc18d \uac00\ub2a5\uc131\uc744 \ud568\uaed8 \ubcf4\uace0 \uc2f6\uc740 \uc0c1\ud0dc'
      : '\ud604\uc7ac \uc5f0\uc560 \ud750\ub984, \uc778\uc5f0\uc758 \uc2dc\uae30, \uad00\uacc4 \uc120\ud0dd\uc744 \ud568\uaed8 \ubcf4\uace0 \uc2f6\uc740 \uc0c1\ud0dc');
    var desiredOutcome = _lsSelectedText('lsLoveDesiredOutcome', '\ub098\uc5d0\uac8c \ub9de\ub294 \uc0ac\ub791\uc758 \ubc29\ud5a5\uacfc \ud604\uc2e4\uc801\uc778 \uad00\uacc4 \uc804\ub7b5\uc744 \uc54c\uace0 \uc2f6\ub2e4');
    var concern = _lsFieldValue('lsLoveConcern') || desiredOutcome;
    var idealType = _lsFieldValue('lsLoveIdealType') || (isCompatibility ? partnerName : '\uc0ac\uc8fc \uc6d0\uad6d\uacfc \uc624\ud589 \uade0\ud615\uc5d0 \ub9de\ub294 \uc790\uc5f0\uc2a4\ub7ec\uc6b4 \uc778\uc5f0');
    return {
      loveStatus: loveStatus,
      currentConcern: concern,
      idealType: idealType,
      pastLovePattern: '\ubc18\ubcf5\ub418\ub294 \ub04c\ub9bc, \uac70\ub9ac\uac10, \ud0c0\uc774\ubc0d\uc744 \uc810\uac80\ud558\uace0 \uc2f6\uc740 \ud328\ud134',
      desiredOutcome: desiredOutcome,
      partnerName: isCompatibility ? partnerName : '',
      wantsMarriageAnalysis: desiredOutcome.indexOf('\uacb0\ud63c') >= 0 || desiredOutcome.indexOf('\uc624\ub798') >= 0,
      wantsReunionAnalysis: loveStatus.indexOf('\uc7ac\ud68c') >= 0 || desiredOutcome.indexOf('\uc7ac\ud68c') >= 0
    };
  }

  function _validateLoveSecretGenerationContract(payload, mode) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var normalizedMode = _normalizeLoveSecretMode(mode);
    var errors = [];
    if (!data.clientFlow || data.clientFlow.schemaVersion !== 'love-secret-client-flow.v1') errors.push('clientFlow');
    if (!Number(data.targetYear || 0)) errors.push('targetYear');
    if (!data.serviceContext || !_lsCleanText(data.serviceContext.currentConcern || data.currentConcern)) errors.push('serviceContext.currentConcern');
    if (!data.serviceContext || !_lsCleanText(data.serviceContext.loveStatus || data.loveStatus)) errors.push('serviceContext.loveStatus');
    if (normalizedMode === 'compatibility') {
      if (!data.relationshipContext || !_lsCleanText(data.relationshipContext.relationshipType || data.relationshipType)) errors.push('relationshipContext.relationshipType');
      if (!data.relationshipContext || !_lsCleanText(data.relationshipContext.desiredOutcome || data.desiredOutcome)) errors.push('relationshipContext.desiredOutcome');
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function _lsGetJobClient() {
    return (typeof window !== 'undefined' && window.CDPremiumPdfJobClient) ? window.CDPremiumPdfJobClient : null;
  }

  function _lsStartPremiumJob(profile, mode, accessGrant, reportId) {
    var client = _lsGetJobClient();
    if (!client) return;
    var birth = (profile && profile.birth) ? profile.birth : {};
    var normalizedMode = _normalizeLoveSecretMode(mode);
    client.start({
      stateKey: _lsJobStateKey,
      reportType: 'loveSecret',
      featureType: LOVE_SECRET_INTERNAL_FEATURE_TYPE,
      idempotencyKey: String(reportId || '').trim() || undefined,
      requestBody: {
        mode: normalizedMode,
        featureKey: _getLoveSecretFeatureKey(normalizedMode),
        reportId: String(reportId || '').trim() || undefined,
        accessGrant: accessGrant || undefined,
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

  function _lsResumePremiumJob() {
    var client = _lsGetJobClient();
    if (!client) return;
    client.resume({ stateKey: _lsJobStateKey }).catch(function () {});
  }

  function _lsRunPremiumJob(totalChapters) {
    var client = _lsGetJobClient();
    if (!client) return;
    client.run({
      stateKey: _lsJobStateKey,
      startChapter: 1,
      endChapter: Number(totalChapters || 1),
      stopOnFailure: false,
    }).catch(function () {});
  }

  function _logLoveSecretFlow(stage, payload) {
    try {
      console.info('[LoveBook][' + String(stage || 'Unknown') + ']', payload || {});
    } catch (_) {}
  }

  function _lsShortList(value, limit) {
    var source = Array.isArray(value) ? value : [];
    return source.map(function (item) { return String(item || '').trim(); }).filter(Boolean).slice(0, Math.max(1, Number(limit || 6)));
  }

  function _lsPayloadSafe(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.error && typeof data.error === 'object' ? data.error : {};
    var debugSafe = data.debugSafe && typeof data.debugSafe === 'object' ? data.debugSafe : {};
    return {
      code: String(data.code || nested.code || data.errorCode || nested.errorCode || '').trim() || undefined,
      message: String(data.message || nested.message || data.reasonMessage || nested.reasonMessage || '').trim() || undefined,
      stage: String(data.stage || data.failureStage || debugSafe.stage || nested.stage || nested.failureStage || '').trim() || undefined,
      failureType: String(data.failureType || debugSafe.failureType || nested.failureType || '').trim() || undefined,
      reportId: String(data.reportId || debugSafe.reportId || nested.reportId || '').trim() || undefined,
      executionId: String(data.executionId || debugSafe.executionId || nested.executionId || '').trim() || undefined,
      missing: _lsShortList(data.missing || nested.missing || data.hardMissingFields, 6),
      issues: _lsShortList(data.issues || nested.issues || data.errors || nested.errors, 6),
      debugSafe: Object.keys(debugSafe).length ? debugSafe : undefined
    };
  }

  function _buildLoveSecretApiError(pack, fallbackMessage, context) {
    var res = pack && pack.res ? pack.res : {};
    var payload = pack && pack.json && typeof pack.json === 'object'
      ? pack.json
      : (pack && pack.body && typeof pack.body === 'object' ? pack.body : {});
    var status = Number((pack && pack.status) || res.status || payload.status || payload.statusCode || 0);
    var safe = _lsPayloadSafe(payload);
    var message = String(safe.message || fallbackMessage || ('HTTP ' + (status || ''))).trim();
    var err = new Error(message || '연애 비책 PDF 요청을 처리하지 못했습니다.');
    err.status = status || undefined;
    err.code = String(safe.code || 'LOVE_SECRET_REQUEST_FAILED').trim();
    err.stage = String(safe.stage || (context && context.stage) || 'prepare').trim();
    err.failureType = String(safe.failureType || '').trim();
    err.reportId = String(safe.reportId || (context && context.reportId) || _lsCurrentReportId || '').trim();
    err.sessionId = String(context && context.sessionId || '').trim();
    err.executionId = String(safe.executionId || '').trim();
    err.missing = safe.missing;
    err.issues = safe.issues;
    err.payloadSafe = safe;
    err.payload = payload;
    return err;
  }

  function _logLoveSecretError(error, context) {
    try {
      var payloadSafe = error && error.payloadSafe
        ? error.payloadSafe
        : _lsPayloadSafe((error && error.payload) || (error && typeof error === 'object' ? error : {}));
      var mode = _normalizeLoveSecretMode((context && context.mode) || _currentChapterMode);
      var safe = {
        serviceKey: 'saju-love-secret',
        featureKey: _getLoveSecretFeatureKey(mode),
        reportType: mode === 'compatibility' ? 'sajuLoveSecretCompatibility' : 'sajuLoveSecretSolo',
        mode: mode,
        stage: String((context && context.stage) || (error && error.stage) || payloadSafe.stage || 'unknown').trim(),
        failureType: String((error && error.failureType) || payloadSafe.failureType || '').trim() || undefined,
        status: Number(error && error.status || context && context.status || 0) || undefined,
        code: String((error && (error.code || error.name)) || payloadSafe.code || 'LOVE_SECRET_CLIENT_ERROR').trim(),
        message: String(error && error.message ? error.message : error || 'unknown').trim(),
        requestId: String(context && context.requestId || error && error.requestId || '').trim() || undefined,
        sessionId: String(context && context.sessionId || error && error.sessionId || '').trim() || undefined,
        reportId: String(context && context.reportId || error && error.reportId || payloadSafe.reportId || _lsCurrentReportId || '').trim() || undefined,
        executionId: String(context && context.executionId || error && error.executionId || payloadSafe.executionId || '').trim() || undefined,
        missing: _lsShortList(error && error.missing || payloadSafe.missing, 6),
        issues: _lsShortList(error && error.issues || payloadSafe.issues, 6),
        causeMessage: String(error && error.cause && (error.cause.message || error.cause) || '').trim() || undefined,
        payloadSafe: payloadSafe
      };
      console.error('[LoveBook][Error][' + safe.stage + ']', safe);
    } catch (_) {}
  }

  async function _getLoveBookCoinGateHelper() {
    _setLoveBookGenerationState('loading_helper');
    
    // Load coin-gate-helper script if not already loaded
    if (!globalThis.__cdCoinGateHelperSingleton) {
      await new Promise((resolve, reject) => {
        var scriptEl = document.querySelector('script[src*="coin-gate-helper.js"]');
        if (scriptEl) {
          // Script already exists, wait for initialization
          var attempts = 0;
          var checkInit = setInterval(() => {
            if (globalThis.__cdCoinGateHelperInitialized && globalThis.__cdCoinGateHelperSingleton) {
              clearInterval(checkInit);
              resolve();
            } else if (attempts++ > 100) {
              clearInterval(checkInit);
              reject(new Error('COIN_GATE_HELPER_TIMEOUT'));
            }
          }, 50);
        } else {
          // Create and load the script
          var script = document.createElement('script');
          script.src = '/js/coin-gate-helper.js?v=build-20260616-love-secret-access';
          var loadTimeout = setTimeout(() => {
            reject(new Error('COIN_GATE_HELPER_TIMEOUT'));
          }, 5000);
          script.onload = () => {
            // Wait a bit to ensure initialization is complete
            var attempts = 0;
            var checkInit = setInterval(() => {
              if (globalThis.__cdCoinGateHelperInitialized && globalThis.__cdCoinGateHelperSingleton) {
                clearTimeout(loadTimeout);
                clearInterval(checkInit);
                resolve();
              } else if (attempts++ > 100) {
                clearTimeout(loadTimeout);
                clearInterval(checkInit);
                reject(new Error('COIN_GATE_HELPER_INIT_TIMEOUT'));
              }
            }, 50);
          };
          script.onerror = () => {
            clearTimeout(loadTimeout);
            reject(new Error('COIN_GATE_HELPER_LOAD_FAILED'));
          };
          document.head.appendChild(script);
        }
      });
    }
    
    var helper = globalThis.__cdCoinGateHelperSingleton;
    if (!helper || typeof helper !== 'object') {
      throw new Error('COIN_GATE_HELPER_MISSING');
    }
    console.info('[LoveBook] helper load', { helperLoaded: true, initialized: !!globalThis.__cdCoinGateHelperInitialized });
    return helper;
  }

  async function _runLoveSecretCoinGate(mode, reportId) {
    var normalizedMode = _normalizeLoveSecretMode(mode);
    var featureKey = _getLoveSecretFeatureKey(normalizedMode);
    var reason = LOVE_SECRET_REASON_BY_MODE[normalizedMode] || LOVE_SECRET_REASON_BY_MODE.solo;
    _setLoveBookGenerationState('checking_payment');
    try {
      var helper = await _getLoveBookCoinGateHelper();
      var purchase = await helper.purchaseFeature({
        featureKey: featureKey,
        payload: {
          featureKey: featureKey,
          subFeatureKey: featureKey,
          categoryKey: 'premium-report',
          mode: normalizedMode,
          reason: reason,
          coinPrice: _getLoveSecretRequiredCoins(normalizedMode),
          cost: _getLoveSecretRequiredCoins(normalizedMode),
          reportId: reportId,
          sessionId: 'love-book:' + String(reportId || '').trim(),
          reportSessionId: 'love-book:' + String(reportId || '').trim(),
          requestId: 'love-secret:' + normalizedMode + ':' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8),
          forceDeduct: true,
        },
      });
      var normalizedAccess = _normalizeLoveSecretPaymentContext(purchase, normalizedMode, reportId);
      var accessGrant = normalizedAccess.accessGrant;
      var _issuedPremiumToken = String(normalizedAccess.premiumAccessToken || '').trim();
      var _rawPurchaseId = String(normalizedAccess.purchaseId || '').trim();
      console.info('[LoveBook] payment access', {
        featureKey: featureKey,
        hasAccessGrant: Boolean(accessGrant),
        hasPremiumToken: Boolean(_issuedPremiumToken),
        hasPurchaseId: Boolean(_rawPurchaseId),
      });
      var paymentGateDefaultMessage = '결제 확인에 실패했습니다. 다시 시도해 주세요.';
      var accessGateDefaultMessage = '접근 권한을 확인하지 못했습니다. 결제 확인 후 다시 시도해 주세요.';
      if (!purchase) purchase = { status: 500, message: paymentGateDefaultMessage };
      if (!String(purchase.message || '').trim()) purchase.message = paymentGateDefaultMessage;
      if (!purchase || (!purchase.ok && !accessGrant && !_issuedPremiumToken && !_rawPurchaseId)) {
        return {
          ok: false,
          status: Number((purchase && purchase.status) || 500),
          message: String((purchase && purchase.message) || '결제 확인에 실패했습니다.'),
          accessGrant: null,
          purchaseId: '',
          premiumAccessToken: _issuedPremiumToken,
        };
      }
      // 결제 성공이지만 accessGrant가 없는 경우: purchaseId 또는 premiumAccessToken으로 최소 accessGrant 구성
      if (!accessGrant && (_issuedPremiumToken || _rawPurchaseId)) {
        accessGrant = {
          ok: true,
          purchaseId: _rawPurchaseId || undefined,
          sessionId: 'love-book:' + String(reportId || '').trim(),
          featureKey: featureKey,
          reportId: String(reportId || '').trim(),
          premiumAccessToken: _issuedPremiumToken || undefined,
          paidAt: new Date().toISOString(),
        };
      }
      if (!accessGrant && String(purchase.message || '') === paymentGateDefaultMessage) {
        purchase.message = accessGateDefaultMessage;
      }
      if (!accessGrant) {
        return {
          ok: false,
          status: Number((purchase && purchase.status) || 402),
          message: String((purchase && purchase.message) || '결제 확인에 실패했습니다.'),
          accessGrant: null,
          purchaseId: '',
          premiumAccessToken: _issuedPremiumToken,
        };
      }
      if (_issuedPremiumToken) {
        try { window.__cdPremiumAccessToken = _issuedPremiumToken; } catch (_) {}
        try { sessionStorage.setItem('cd_premium_access_token', _issuedPremiumToken); } catch (_) {}
        try { localStorage.setItem('cd_premium_access_token', _issuedPremiumToken); } catch (_) {}
      }
      _setLoveBookGenerationState('payment_confirmed');
      return {
        ok: true,
        status: Number(purchase.status || 200),
        message: String(purchase.message || ''),
        accessGrant: accessGrant,
        purchaseId: String(accessGrant.purchaseId || _rawPurchaseId).trim(),
        premiumAccessToken: _issuedPremiumToken,
      };
    } catch (error) {
      var rawGateMessage = String(error && error.message ? error.message : error || 'COIN_GATE_HELPER_MISSING');
      var gateMessage = rawGateMessage.indexOf('COIN_GATE_HELPER_') === 0
        ? '결제 창을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'
        : rawGateMessage;
      console.info('[LoveBook] helper load', { helperLoaded: false, message: rawGateMessage });
      return {
        ok: false,
        status: 500,
        message: gateMessage,
        accessGrant: null,
        purchaseId: '',
        premiumAccessToken: '',
      };
    }
  }

  function _abortActiveRequest() {
    if (_activeRequestController) {
      try { _activeRequestController.abort(); } catch (_) {}
      _activeRequestController = null;
    }
  }

  /* ── localStorage 저장/복원 ──────────────────────────────── */
  var _STORE_VER = 'ls_v1_';

  function _makeKey(profile) {
    var b = (profile && profile.birth) || {};
    return _STORE_VER + (b.year || '0') + '_' + (b.month || '0') + '_' + (b.day || '0') + '_' + ((profile && profile.gender) || 'u');
  }

  function _saveResult(profile) {
    try {
      localStorage.setItem(_makeKey(profile), JSON.stringify({
        chapters: _chapters,
        name: (profile && profile.name) || '사용자',
        birth: (profile && profile.birth) || {},
        gender: (profile && profile.gender) || '',
        savedAt: new Date().toISOString()
      }));
    } catch (e) { /* 용량 수 한 또는 일반 브라우저 제한 */ }
  }

  function _loadSaved(profile) {
    try {
      var raw = localStorage.getItem(_makeKey(profile));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function _clearSaved(profile) {
    try { localStorage.removeItem(_makeKey(profile)); } catch (e) {}
  }

  /* ── 결과 헤더 렌더 ───────────────────────────────────────── */
  function _renderResultHeader(name, birth, gender, savedDate, isNew) {
    var nameEl = document.getElementById('lsResultName');
    var dateEl = document.getElementById('lsResultDate');
    if (nameEl) nameEl.textContent = '💕 ' + (name || '사용자') + '님의 연애 비책';
    if (dateEl) {
      var b = birth || {};
      var dateStr = savedDate ? savedDate.toLocaleDateString('ko-KR') : new Date().toLocaleDateString('ko-KR');
      var icon = isNew ? '🗓️ ' : '💾 ';
      var label = isNew ? '발행' : '저장';
      dateEl.textContent =
        [b.year, b.month, b.day].filter(Boolean).join('. ') +
        ' 생 · ' +
        (gender === 'F' ? '여성' : gender === 'M' ? '남성' : '') +
        ' · ' + icon + dateStr + ' ' + label;
    }
  }

  function _qs(id) { return document.getElementById(id); }

  function _buildApiCandidates(pathname, options) {
    var _path = String(pathname || '');
    if (_path.charAt(0) !== '/') _path = '/' + _path;
    var _opts = options && typeof options === 'object' ? options : {};
    var _sameOriginOnly = !!_opts.sameOriginOnly;
    var _preferSameOrigin = !!_opts.preferSameOrigin;
    var _origin = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    var _bases = [
      '',
      _origin,
      _sameOriginOnly ? '' : ((typeof window !== 'undefined' && window.__CD_API_BASE_URL) || ''),
      _sameOriginOnly ? '' : ((typeof window !== 'undefined' && window.__API_BASE_URL) || ''),
      _sameOriginOnly ? '' : ((typeof window !== 'undefined' && window.__AUTH_API_BASE_URL) || '')
    ];
    if (_preferSameOrigin) {
      _bases = [
        '',
        _origin,
        _sameOriginOnly ? '' : ((typeof window !== 'undefined' && window.__CD_API_BASE_URL) || ''),
        _sameOriginOnly ? '' : ((typeof window !== 'undefined' && window.__API_BASE_URL) || ''),
        _sameOriginOnly ? '' : ((typeof window !== 'undefined' && window.__AUTH_API_BASE_URL) || '')
      ];
    }
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

  function _escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _getChapterMeta(idx) {
    var base = _chapterMeta[idx] || {};
    return {
      title: String(base.title || _getLoveSecretChapterTitle(idx, _currentChapterMode)),
      subtitle: String(base.subtitle || _getLoveSecretChapterSubtitle(idx, _currentChapterMode)),
    };
  }

  function _syncChapterMetaFromResponse(idx, data) {
    if (!data || typeof data !== 'object') return;
    var chapterMeta = data.chapterMeta && typeof data.chapterMeta === 'object' ? data.chapterMeta : null;
    _chapterMeta[idx] = {
      title: String((chapterMeta && chapterMeta.title) || _getLoveSecretChapterTitle(idx, _currentChapterMode)),
      subtitle: String((chapterMeta && chapterMeta.subtitle) || _getLoveSecretChapterSubtitle(idx, _currentChapterMode)),
      isSkeleton: false,
    };
  }

  function _buildChapterSkeleton(idx, reason) {
    var meta = _getChapterMeta(idx);
    return [
      '## ' + meta.title,
      meta.subtitle ? ('> ' + meta.subtitle) : '',
      '',
      '### 챕터 구조 복구',
      '- 일시적인 응답 문제로 기본 구조를 우선 생성했습니다.',
      '- 동일 reportId로 재생성하면 본문이 자동 보강됩니다.',
      '',
      '### 관계 포인트',
      '- 감정 패턴 요약',
      '- 갈등 트리거 정리',
      '- 실전 대화 액션 1개',
      '',
      reason ? ('### 참고\n- 원인: ' + String(reason)) : '',
      ''
    ].filter(Boolean).join('\n');
  }

  function _md2html(text) {
    if (!text) return '';
    var h = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    h = h.replace(/^#### (.+)$/gm, '<h4 class="ls-md-h4">$1</h4>');
    h = h.replace(/^### (.+)$/gm, '<h3 class="ls-md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2 class="ls-md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1 class="ls-md-h1">$1</h1>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/^---+$/gm, '<hr class="ls-md-hr">');
    h = h.replace(/^[*-] (.+)$/gm, '<li class="ls-md-li">$1</li>');
    h = h.replace(/(<li class="ls-md-li">[\s\S]*?<\/li>\n?)+/g, function (m) {
      return '<ul class="ls-md-ul">' + m + '</ul>';
    });
    var lines = h.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { result.push(''); continue; }
      if (/^<(h[1-4]|ul|li|hr)/.test(line) || /<\/(h[1-4]|ul|li|hr)>$/.test(line)) {
        result.push(line);
      } else {
        result.push('<p class="ls-md-p">' + line + '</p>');
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
    var labels = _getLoveSecretStructuredLabels(chapter, _currentChapterMode);
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
    var G = window.G_PILLARS;
    if (G) {
      lines.push('\n【사주 원국(四柱)】');
      if (G.y) lines.push('년주(年柱): ' + (G.y.g || '') + (G.y.j || '') + (G.y.gE ? ' [' + G.y.gE + '/' + G.y.jE + ']' : ''));
      if (G.m) lines.push('월주(月柱): ' + (G.m.g || '') + (G.m.j || '') + (G.m.gE ? ' [' + G.m.gE + '/' + G.m.jE + ']' : ''));
      if (G.d) lines.push('일주(日柱): ' + (G.d.g || '') + (G.d.j || '') + (G.d.gE ? ' [' + G.d.gE + '/' + G.d.jE + ']' : ''));
      if (G.h) lines.push('시주(時柱): ' + (G.h.g || '') + (G.h.j || '') + (G.h.gE ? ' [' + G.h.gE + '/' + G.h.jE + ']' : ''));
    }
    var analysis = snap.analysis || snap.saju || {};
    if (analysis.elementWeights) {
      var w = analysis.elementWeights;
      lines.push('\n【오행(五行) 분포】');
      lines.push('목(木):' + (w.wood || 0) + ' 화(火):' + (w.fire || 0) + ' 토(土):' + (w.earth || 0) + ' 금(金):' + (w.metal || 0) + ' 수(水):' + (w.water || 0));
    }
    if (analysis.yongshin_elements && analysis.yongshin_elements.length) {
      lines.push('용신(用神): ' + analysis.yongshin_elements.join(', '));
    }
    if (analysis.dayStem) lines.push('일간(日干): ' + analysis.dayStem);
    if (analysis.power_label) lines.push('신강/신약: ' + analysis.power_label);
    if (analysis.johuType) lines.push('조후(調候): ' + analysis.johuType);
    if (analysis.isJong) lines.push('종격(從格): ' + (analysis.jongName || '종격'));
    var GP = window.G_POWER;
    if (GP) {
      if (GP.groups) {
        lines.push('\n【십성(十星) 분포】');
        var gk = Object.keys(GP.groups);
        for (var gi = 0; gi < gk.length; gi++) lines.push(gk[gi] + ': ' + GP.groups[gk[gi]]);
      }
      if (GP.yongshin) {
        lines.push('용신: ' + (Array.isArray(GP.yongshin) ? GP.yongshin.join(', ') : GP.yongshin));
      }
    }
    // ─── 신살(神殺) 계산 — AI가 직접 계산하면 오류가 생기므로 정확한 결과를 명시 ───
    if (G && G.d) {
      var _ssDay = (G.d.g || '') + (G.d.j || '');
      var _ssJArr = [G.y && G.y.j, G.m && G.m.j, G.d.j, G.h && G.h.j];
      var _sinsalNames = [];
      // 홍염살 — 일주 기준 (甲午 丙寅 丁未 戊辰 庚戌 辛酉 壬子)
      var _ssHong = ['甲午','丙寅','丁未','戊辰','庚戌','辛酉','壬子'];
      if (_ssHong.indexOf(_ssDay) >= 0) _sinsalNames.push('홍염살(紅艶殺)[일주 '+_ssDay+']');
      // 괴강살 — 일주 기준 (庚辰 庚戌 壬辰 壬戌 戊戌)
      var _ssGoe = ['庚辰','庚戌','壬辰','壬戌','戊戌'];
      if (_ssGoe.indexOf(_ssDay) >= 0) _sinsalNames.push('괴강살(魁罡殺)[일주 '+_ssDay+']');
      // 양인살 — 양간(甲丙戊庚壬)에만 존재. 음간(乙丁己辛癸)은 해당 없음
      var _ssYangMap = {'甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子'};
      if (G.d.g && _ssYangMap[G.d.g] && G.d.j === _ssYangMap[G.d.g]) _sinsalNames.push('양인살(羊刃殺)[일주 '+_ssDay+']');
      // 도화살 — 지지 子午卯酉
      var _ssTao = ['子','午','卯','酉'];
      var _taoPos = _ssJArr.filter(function(b){return b&&_ssTao.indexOf(b)>=0;});
      if (_taoPos.length > 0) _sinsalNames.push('도화살(桃花殺)');
      // 역마살 — 지지 寅申巳亥
      var _ssYem = ['寅','申','巳','亥'];
      var _yemPos = _ssJArr.filter(function(b){return b&&_ssYem.indexOf(b)>=0;});
      if (_yemPos.length > 0) _sinsalNames.push('역마살(驛馬殺)');
      // 화개살 — 지지 辰戌丑未
      var _ssHwa = ['辰','戌','丑','未'];
      var _hwaPos = _ssJArr.filter(function(b){return b&&_ssHwa.indexOf(b)>=0;});
      if (_hwaPos.length > 0) _sinsalNames.push('화개살(華蓋殺)');
      // 간여지동
      var _ssGyn = ['甲寅','乙卯','丙午','丁巳','戊辰','戊戌','己丑','己未','庚申','辛酉','壬子','癸亥'];
      if (_ssGyn.indexOf(_ssDay) >= 0) _sinsalNames.push('간여지동(干與支同)[일주 '+_ssDay+']');
      lines.push('\n【신살(神殺) 계산 결과 — 정확한 로직으로 도출】');
      if (_sinsalNames.length > 0) {
        lines.push('보유 신살: ' + _sinsalNames.join(', '));
      } else {
        lines.push('보유 신살: 없음 (주요 신살에 해당하지 않는 순수 오행 에너지의 사주)');
      }
      lines.push('※ 주의: 위 목록에 없는 신살(예: 辛酉 양인살, 辛酉 괴강살 등)은 존재하지 않으므로 언급하지 말 것');
    }
    var GD = window.G_DAEWUN || window.G_DAEUN;
    // G_DAEWUN 없으면 Solar 라이브러리로 직접 계산 (성별 방향 포함)
    if ((!GD || !GD.length) && birth.year && typeof Solar !== 'undefined') {
      try {
        var _dwSolar = Solar.fromYmdHms(birth.year, birth.month || 1, birth.day || 1, birth.hour || 12, birth.minute || 0, 0);
        var _dwBazi = _dwSolar.getLunar().getEightChar();
        var _dwGenderNum = (gender === 'M') ? 1 : 0;
        var _dwYun = _dwBazi.getYun(_dwGenderNum);
        var _dwList = _dwYun.getDaYun();
        GD = [];
        for (var _dwi = 1; _dwi < _dwList.length; _dwi++) {
          var _dw2 = _dwList[_dwi];
          var _gz2 = _dw2.getGanZhi ? _dw2.getGanZhi() : [];
          var _ag2 = _dw2.getStartAge ? _dw2.getStartAge() : 0;
          if (_gz2 && _gz2.length >= 2 && _ag2 > 0) {
            GD.push({age:_ag2, g:_gz2[0], j:_gz2[1]});
          }
        }
        if (GD.length > 0) window.G_DAEWUN = GD;
      } catch(_dwErr) { GD = null; }
    }
    if (GD && Array.isArray(GD) && GD.length) {
      lines.push('\n【대운(大運) 흐름 — 성별 방향 반영 (양남음녀 순행, 음남양녀 역행)】');
      lines.push('성별: ' + (gender === 'M' ? '남성' : '여성'));
      for (var di = 0; di < Math.min(GD.length, 10); di++) {
        var dw = GD[di];
        if (dw) lines.push((dw.age || '') + '세: ' + (dw.g || '') + (dw.j || '') + (dw.gE ? ' [' + dw.gE + ']' : ''));
      }
    }
    if (birth.year) {
      var currentAge = new Date().getFullYear() - birth.year + 1;
      lines.push('\n현재 나이: ' + currentAge + '세 (만 ' + (currentAge - 1) + '세)');
    }
    return lines.join('\n');
  }

  function _collectSajuBase() {
    var profile = window.__cdActiveBirthProfile || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var G = window.G_PILLARS || {};
    var counts = analysis.elementWeights || analysis.counts || {};
    var tenGodCounts = (window.G_POWER && window.G_POWER.groups) ? window.G_POWER.groups : {};
    var birth = profile.birth || snap.birth || {};

    function _clean(v) { return String(v || '').trim(); }
    function _safeNum(v) { var n = Number(v); return Number.isFinite(n) ? n : 0; }
    function _birthDate() {
      var y = Number(birth.year || 0);
      var m = Number(birth.month || 0);
      var d = Number(birth.day || 0);
      if (!y || !m || !d) return '';
      return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    }

    return {
      user: {
        name: _clean(profile.name || snap.name || '사용자'),
        gender: _clean(profile.gender || snap.gender || ''),
        birthDate: _birthDate(),
        birthTime: (birth.hour !== undefined && birth.minute !== undefined)
          ? (String(birth.hour).padStart(2, '0') + ':' + String(birth.minute).padStart(2, '0'))
          : '',
        calendarType: _clean(birth.calType || 'solar') || 'solar'
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
        counts: {
          wood: _safeNum(counts.wood),
          fire: _safeNum(counts.fire),
          earth: _safeNum(counts.earth),
          metal: _safeNum(counts.metal),
          water: _safeNum(counts.water)
        },
        dominant: _clean(analysis.dominantElement || analysis.dominant || ''),
        deficient: _clean(analysis.weakElement || analysis.deficient || ''),
        balanceScore: _safeNum(analysis.balanceScore || 0)
      },
      tenGods: {
        counts: tenGodCounts,
        dominantTenGod: _clean(analysis.dominantTenGod || ''),
        topTenGods: []
      },
      strength: {
        isStrong: !!(window.G_POWER && window.G_POWER.isStrong),
        label: _clean(analysis.power_label || ''),
        reason: _clean((window.G_POWER && window.G_POWER.reason) || '')
      },
      johu: snap.johu || analysis.johu || null,
      yongshin: {
        usefulElements: Array.isArray(analysis.yongshin_elements) ? analysis.yongshin_elements.slice(0, 5) : []
      },
      specialStars: {
        tao: _safeNum(analysis.taoPct || 0),
        hwa: _safeNum(analysis.hwaPct || 0),
        yeokma: _safeNum(analysis.yeokmaPct || 0),
        gwimun: !!analysis.hasGwimun
      },
      timing: {
        daeun: window.G_DAEWUN || window.G_DAEUN || []
      }
    };
  }

  function _collectQuantumMyeongriJson() {
    var base = _collectSajuBase();
    return {
      schemaVersion: 'love-secret-client-evidence.v1',
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

  function _collectPartnerData() {
    var section = _qs('lsPartnerSection');
    if (!section || !section.classList.contains('open')) return '';
    return '';
  }

  /* ── 전용 파트너 화면에서 데이터 수집 ─────────────────────── */
  function _collectPartnerScreenData() {
    var name = (_qs('lsPsName') || {}).value || '';
    var year = parseInt((_qs('lsPsYear') || {}).value || '0', 10);
    var month = parseInt((_qs('lsPsMonth') || {}).value || '0', 10);
    var day = parseInt((_qs('lsPsDay') || {}).value || '0', 10);
    var hourEl = _qs('lsPsHour');
    var hourVal = hourEl ? hourEl.value : '';
    var gm = _qs('lsPsGenderM');
    var gf = _qs('lsPsGenderF');
    var genderCode = (gm && gm.classList.contains('active')) ? 'M' : (gf && gf.classList.contains('active')) ? 'F' : 'F';
    var genderLabel = genderCode === 'M' ? '남성' : '여성';

    if (!year || !month || !day) return '';

    var jiHourMap = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    var jiHourNames = ['자시(23-01시)', '축시(01-03시)', '인시(03-05시)', '묘시(05-07시)', '진시(07-09시)',
      '사시(09-11시)', '오시(11-13시)', '미시(13-15시)', '신시(15-17시)', '유시(17-19시)', '술시(19-21시)', '해시(21-23시)'];
    var hourIdx = (hourVal !== '') ? parseInt(hourVal, 10) : -1;
    var birthHour = (hourIdx >= 0 && hourIdx < 12) ? jiHourMap[hourIdx] : 12;
    var hourDisplay = (hourIdx >= 0) ? jiHourNames[hourIdx] : '미상';

    var lines = ['【상대방 정보】'];
    if (name) lines.push('이름: ' + name);
    lines.push('성별: ' + genderLabel);
    lines.push('생년월일: ' + year + '년 ' + month + '월 ' + day + '일');
    lines.push('출생 시각: ' + hourDisplay);

    if (typeof window.computeProfileForModal === 'function') {
      var partnerProfile = {
        name: name || '상대방',
        gender: genderCode,
        birth: { year: year, month: month, day: day, hour: birthHour, minute: 0, calType: 'solar' },
        location: { lat: 37.6, lng: 127.0, tz: 'Asia/Seoul', baseTzOffset: 9 }
      };
      try {
        window.computeProfileForModal(partnerProfile);
        var GP = window.G_PILLARS;
        var GW = window.G_POWER;
        var snap = window.__destinyFlowerSajuSnapshot || {};
        var analysis = snap.analysis || snap.saju || {};

        if (GP) {
          lines.push('\n【상대방 사주 원국(四柱)】');
          if (GP.y) lines.push('년주(年柱): ' + (GP.y.g || '') + (GP.y.j || '') + (GP.y.gE ? ' [' + GP.y.gE + '/' + GP.y.jE + ']' : ''));
          if (GP.m) lines.push('월주(月柱): ' + (GP.m.g || '') + (GP.m.j || '') + (GP.m.gE ? ' [' + GP.m.gE + '/' + GP.m.jE + ']' : ''));
          if (GP.d) lines.push('일주(日柱): ' + (GP.d.g || '') + (GP.d.j || '') + (GP.d.gE ? ' [' + GP.d.gE + '/' + GP.d.jE + ']' : ''));
          if (GP.h && hourIdx >= 0) lines.push('시주(時柱): ' + (GP.h.g || '') + (GP.h.j || '') + (GP.h.gE ? ' [' + GP.h.gE + '/' + GP.h.jE + ']' : ''));
        }
        if (analysis.elementWeights) {
          var w = analysis.elementWeights;
          lines.push('\n【상대방 오행(五行) 분포】');
          lines.push('목(木):' + (w.wood || 0) + ' 화(火):' + (w.fire || 0) + ' 토(土):' + (w.earth || 0) + ' 금(金):' + (w.metal || 0) + ' 수(水):' + (w.water || 0));
        }
        if (analysis.dayStem) lines.push('일간(日干): ' + analysis.dayStem);
        if (analysis.power_label) lines.push('신강/신약: ' + analysis.power_label);
        if (analysis.johuType) lines.push('조후(調候): ' + analysis.johuType);
        if (analysis.isJong) lines.push('종격(從格): ' + (analysis.jongName || '종격'));
        if (analysis.yongshin_elements && analysis.yongshin_elements.length) {
          lines.push('용신(用神): ' + analysis.yongshin_elements.join(', '));
        }
        if (GW && GW.groups) {
          lines.push('\n【상대방 십성(十星) 분포】');
          var gk = Object.keys(GW.groups);
          for (var gi = 0; gi < gk.length; gi++) lines.push(gk[gi] + ': ' + GW.groups[gk[gi]]);
        }
      } catch (e) { /* 엔진 오류 시 기본 텍스트만 사용 */ } finally {
        var origProfile = window.__cdActiveBirthProfile;
        if (origProfile && origProfile.birth) {
          try { window.computeProfileForModal(origProfile); } catch (_) {}
        }
      }
    }
    return lines.join('\n');
  }

  /* ── 파트너 화면 실시간 사주 미리보기 ─────────────────────── */
  var _psPreviewTimer = null;
  function _schedulePartnerPreview() {
    clearTimeout(_psPreviewTimer);
    _psPreviewTimer = setTimeout(_renderPartnerPreview, 420);
  }

  function _renderPartnerPreview() {
    var year = parseInt((_qs('lsPsYear') || {}).value || '0', 10);
    var month = parseInt((_qs('lsPsMonth') || {}).value || '0', 10);
    var day = parseInt((_qs('lsPsDay') || {}).value || '0', 10);
    var card = _qs('lsPsCard');
    var pillarsEl = _qs('lsPsPillars');
    var infoEl = _qs('lsPsInfo');

    if (!year || !month || !day || year < 1920 || year > 2020 || month < 1 || month > 12 || day < 1 || day > 31) {
      if (card) card.classList.remove('visible');
      var origP = window.__cdActiveBirthProfile;
      if (origP && origP.birth && typeof window.computeProfileForModal === 'function') {
        try { window.computeProfileForModal(origP); } catch (_) {}
      }
      return;
    }
    if (typeof window.computeProfileForModal !== 'function') return;

    var hourEl = _qs('lsPsHour');
    var hourIdx = (hourEl && hourEl.value !== '') ? parseInt(hourEl.value, 10) : -1;
    var jiHourMap = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    var birthHour = hourIdx >= 0 ? jiHourMap[hourIdx] : 12;
    var gm = _qs('lsPsGenderM');
    var genderCode = (gm && gm.classList.contains('active')) ? 'M' : 'F';

    try {
      window.computeProfileForModal({
        name: (_qs('lsPsName') || {}).value || '상대방',
        gender: genderCode,
        birth: { year: year, month: month, day: day, hour: birthHour, minute: 0, calType: 'solar' },
        location: { lat: 37.6, lng: 127.0, tz: 'Asia/Seoul', baseTzOffset: 9 }
      });

      var GP = window.G_PILLARS;
      if (GP && card && pillarsEl) {
        var LABELS = ['년주', '월주', '일주', '시주'];
        var KEYS = ['y', 'm', 'd', 'h'];
        var html = '';
        for (var i = 0; i < 4; i++) {
          var p = GP[KEYS[i]];
          if (i === 3 && hourIdx < 0) {
            html += '<div class="ls-pscreen__pillar-card ls-pscreen__pillar-card--dim">' +
              '<span class="ls-pscreen__pillar-lbl">' + LABELS[i] + '</span>' +
              '<span class="ls-pscreen__pillar-stem">?</span>' +
              '<span class="ls-pscreen__pillar-branch">?</span>' +
              '<span class="ls-pscreen__pillar-ten">시불명</span></div>';
            continue;
          }
          if (!p) continue;
          html += '<div class="ls-pscreen__pillar-card">' +
            '<span class="ls-pscreen__pillar-lbl">' + LABELS[i] + '</span>' +
            '<span class="ls-pscreen__pillar-stem">' + _escHtml(p.g || '') + '</span>' +
            '<span class="ls-pscreen__pillar-branch">' + _escHtml(p.j || '') + '</span>' +
            '<span class="ls-pscreen__pillar-ten">' + _escHtml(p.gE || '') + '</span>' +
            '</div>';
        }
        pillarsEl.innerHTML = html;

        var snap = window.__destinyFlowerSajuSnapshot || {};
        var an = snap.analysis || snap.saju || {};
        if (infoEl) {
          var parts = [];
          if (an.dayStem) parts.push('일간 ' + an.dayStem);
          if (an.power_label) parts.push(an.power_label);
          if (an.yongshin_elements && an.yongshin_elements.length) parts.push('용신 ' + an.yongshin_elements.join('·'));
          infoEl.textContent = parts.join(' · ');
        }
        card.classList.add('visible');
      }
    } catch (e) {
      if (card) card.classList.remove('visible');
    } finally {
      var orig = window.__cdActiveBirthProfile;
      if (orig && orig.birth) {
        try { window.computeProfileForModal(orig); } catch (_) {}
      }
    }
  }

  /* ── 파트너 화면 이벤트 바인딩 ───────────────────────────── */
  function _bindPartnerScreen() {
    // 성별 버튼
    var gm = _qs('lsPsGenderM');
    var gf = _qs('lsPsGenderF');
    if (gm) gm.addEventListener('click', function () {
      gm.classList.add('active'); gf && gf.classList.remove('active');
      _schedulePartnerPreview();
    });
    if (gf) gf.addEventListener('click', function () {
      gf.classList.add('active'); gm && gm.classList.remove('active');
      _schedulePartnerPreview();
    });
    // 생년월일·시각 실시간 미리보기
    ['lsPsYear', 'lsPsMonth', 'lsPsDay', 'lsPsHour'].forEach(function (id) {
      var el = _qs(id);
      if (el) el.addEventListener('input', _schedulePartnerPreview);
      if (el) el.addEventListener('change', _schedulePartnerPreview);
    });
    // 초기 상태 리셋
    var card = _qs('lsPsCard');
    if (card) card.classList.remove('visible');
    ['lsPsYear', 'lsPsMonth', 'lsPsDay', 'lsPsName'].forEach(function (id) {
      var el = _qs(id);
      if (el) el.value = '';
    });
    var hourEl = _qs('lsPsHour');
    if (hourEl) hourEl.selectedIndex = 0;
    if (gf) { gf.classList.add('active'); }
    if (gm) { gm.classList.remove('active'); }
  }

  function _bindPartnerSection() {
    // 레거시 호환 — 신규 화면에서는 사용 안 함
  }

  /* ── 로딩 애니메이션 ──────────────────────────────────────── */
  function _startLoadingAnimation() {
    _stopLoadingAnimation();
    _quoteIdx = Math.floor(Math.random() * LS_LOVE_QUOTES.length);
    var el = _qs('lsLoadQuoteText');
    if (el) el.innerHTML = LS_LOVE_QUOTES[_quoteIdx];
    _quoteTimer = setTimeout(_rotateQuote, 6000);
    _spawnHearts();
    _updateLoadPills(0);
  }

  function _stopLoadingAnimation() {
    clearTimeout(_quoteTimer);
    clearInterval(_heartTimer);
    _quoteTimer = null;
    _heartTimer = null;
    var bg = _qs('lsLoadBg');
    if (bg) bg.innerHTML = '';
  }

  function _rotateQuote() {
    var el = _qs('lsLoadQuoteText');
    if (!el) return;
    el.classList.add('ls-fade');
    _quoteTimer = setTimeout(function () {
      _quoteIdx = (_quoteIdx + 1) % LS_LOVE_QUOTES.length;
      el.innerHTML = LS_LOVE_QUOTES[_quoteIdx];
      el.classList.remove('ls-fade');
      _quoteTimer = setTimeout(_rotateQuote, 6000);
    }, 450);
  }

  function _spawnHearts() {
    var bg = _qs('lsLoadBg');
    if (!bg) return;
    var symbols = ['♡', '♥', '✦', '✿', '❋', '◈', '✸'];
    function _spawn() {
      var sp = document.createElement('span');
      sp.className = 'ls-load-heart';
      sp.setAttribute('aria-hidden', 'true');
      sp.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      sp.style.left = (5 + Math.random() * 90) + '%';
      var dur = 8 + Math.random() * 9;
      sp.style.fontSize = (0.55 + Math.random() * 0.65).toFixed(2) + 'rem';
      sp.style.animationDuration = dur + 's';
      sp.style.color = 'rgba(236,72,153,' + (0.12 + Math.random() * 0.25).toFixed(2) + ')';
      bg.appendChild(sp);
      setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, (dur + 0.3) * 1000);
    }
    _spawn();
    _heartTimer = setInterval(_spawn, 2000);
  }

  function _updateLoadPills(done) {
    var pills = document.querySelectorAll('.ls-load-pill');
    var totalChapters = Math.max(_chapters.length, pills.length);
    Array.prototype.forEach.call(pills, function (p, i) {
      p.classList.remove('done', 'active');
      if (i < done) {
        p.classList.add('done');
      } else if (i === done && done < totalChapters) {
        p.classList.add('active');
      }
    });
  }

  function _showScreen(id) {
    var screens = ['lsStartScreen', 'lsPartnerScreen', 'lsLoadingScreen', 'lsResultScreen', 'lsErrorScreen'];
    for (var i = 0; i < screens.length; i++) {
      var el = _qs(screens[i]);
      if (el) el.style.display = (screens[i] === id) ? '' : 'none';
    }
  }

  function _ensureLoveSecretModalMounted() {
    var modal = _qs('loveSecretModal');
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    return modal;
  }

  function _renderTocButtons(totalChapters) {
    var nav = document.querySelector('.ls-toc');
    if (!nav) return;
    nav.innerHTML = '';
    for (var chapter = 1; chapter <= totalChapters; chapter++) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'ls-toc-item' + (chapter === 1 ? ' active' : '');
      button.setAttribute('data-ls-chapter', String(chapter));
      button.textContent = _toRoman(chapter);
      nav.appendChild(button);
    }
  }

  function _lsToInt(value, fallback) {
    var n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function _lsParseFlexibleBirthTime(rawTime, rawHour, rawMinute) {
    var unknownTokens = ['시간 모름', '모름', '미상', 'unknown', 'na', 'n/a', '-'];
    var zodiacHour = {
      '자시': 23, '축시': 1, '인시': 3, '묘시': 5,
      '진시': 7, '사시': 9, '오시': 11, '미시': 13,
      '신시': 15, '유시': 17, '술시': 19, '해시': 21
    };

    var hourNum = Number(rawHour);
    var minuteNum = Number(rawMinute);
    if (Number.isFinite(hourNum)) {
      var hh = Math.max(0, Math.min(23, Math.floor(hourNum)));
      var mm = Number.isFinite(minuteNum) ? Math.max(0, Math.min(59, Math.floor(minuteNum))) : 0;
      return { hour: hh, minute: mm, isUnknown: false };
    }

    var text = String(rawTime || '').trim();
    if (!text) {
      return { hour: null, minute: null, isUnknown: true };
    }
    var lower = text.toLowerCase();
    if (unknownTokens.indexOf(lower) >= 0) {
      return { hour: null, minute: null, isUnknown: true };
    }
    if (zodiacHour[text] !== undefined) {
      return { hour: zodiacHour[text], minute: 0, isUnknown: false };
    }

    var hhmm = text.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
    if (hhmm) {
      var h1 = Number(hhmm[1]);
      var m1 = Number(hhmm[2]);
      if (h1 >= 0 && h1 <= 23 && m1 >= 0 && m1 <= 59) {
        return { hour: h1, minute: m1, isUnknown: false };
      }
    }

    var korean = text.match(/^(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
    if (korean) {
      var marker = korean[1];
      var h2 = Number(korean[2]);
      var m2 = korean[3] ? Number(korean[3]) : 0;
      if (h2 >= 1 && h2 <= 12) {
        if (marker === '오전') {
          if (h2 === 12) h2 = 0;
        } else if (h2 !== 12) {
          h2 += 12;
        }
        if (!(m2 >= 0 && m2 <= 59)) m2 = 0;
        return { hour: h2, minute: m2, isUnknown: false };
      }
    }

    var hourText = text.match(/^(\d{1,2})\s*시$/);
    if (hourText) {
      var h3 = Number(hourText[1]);
      if (h3 >= 0 && h3 <= 23) {
        return { hour: h3, minute: 0, isUnknown: false };
      }
    }

    var numOnly = text.match(/^(\d{1,2})$/);
    if (numOnly) {
      var h4 = Number(numOnly[1]);
      if (h4 >= 0 && h4 <= 23) {
        return { hour: h4, minute: 0, isUnknown: false };
      }
    }

    return { hour: null, minute: null, isUnknown: true };
  }

  function _lsNormalizeProfile(raw) {
    if (!raw || typeof raw !== 'object') return null;

    var birth = raw.birth || raw.birthInput || raw.profileBirth || {};
    if (!birth || typeof birth !== 'object') {
      birth = {
        year: raw.birthYear || raw.year,
        month: raw.birthMonth || raw.month,
        day: raw.birthDay || raw.day,
        hour: raw.birthHour || raw.hour,
        minute: raw.birthMinute || raw.minute,
        calType: raw.calType || raw.calendarType || raw.calendar
      };
      if ((!birth.year || !birth.month || !birth.day) && typeof (raw.birthDate || raw.birthday || raw.date || raw.solarDate || raw.lunarDate) === 'string') {
        var birthDateText = String(raw.birthDate || raw.birthday || raw.date || raw.solarDate || raw.lunarDate || '').trim();
        var parts = birthDateText.split(/[-/.]/);
        if (parts.length >= 3) {
          birth.year = birth.year || _lsToInt(parts[0], null);
          birth.month = birth.month || _lsToInt(parts[1], null);
          birth.day = birth.day || _lsToInt(parts[2], null);
        }
      }
      if (birth.hour == null || birth.minute == null) {
        var parsed = _lsParseFlexibleBirthTime(raw.birthTime || raw.time, raw.birth_hour || raw.hour, raw.birthMinute || raw.minute);
        birth.hour = parsed.hour;
        birth.minute = parsed.minute;
      }
    }

    var year = _lsToInt(birth.year, 0);
    var month = _lsToInt(birth.month, 0);
    var day = _lsToInt(birth.day, 0);
    if (!year || !month || !day) return null;

    var parsedTime = _lsParseFlexibleBirthTime(birth.birthTime || birth.time || raw.birthTime || raw.time, birth.hour, birth.minute);
    var isTimeUnknown = !!parsedTime.isUnknown;
    var hour = isTimeUnknown ? null : _lsToInt(parsedTime.hour, null);
    var minute = isTimeUnknown ? null : _lsToInt(parsedTime.minute, 0);
    if (!isTimeUnknown) {
      hour = Math.max(0, Math.min(23, hour));
      minute = Math.max(0, Math.min(59, minute));
    }

    var location = raw.location || {};
    var lng = Number(location.lng);
    var lat = Number(location.lat);
    var tzOffset = Number(location.baseTzOffset || location.tzOffset);

    return {
      name: String(raw.name || raw.username || raw.displayName || '사용자').trim() || '사용자',
      gender: String(raw.gender || raw.sex || 'F').trim().toUpperCase() === 'M' ? 'M' : 'F',
      birth: {
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        calType: birth.calType || raw.calendarType || raw.calendar || 'solar',
        isTimeUnknown: isTimeUnknown
      },
      location: {
        label: String(location.label || '대한민국 (서울)'),
        tz: String(location.tz || 'Asia/Seoul'),
        lng: Number.isFinite(lng) ? lng : 127.0,
        lat: Number.isFinite(lat) ? lat : 37.6,
        tzOffset: Number.isFinite(tzOffset) ? tzOffset : 9,
        baseTzOffset: Number.isFinite(tzOffset) ? tzOffset : 9
      }
    };
  }

  function _buildLoveSecretBirthInputFromProfile(rawProfile, fallbackName) {
    var profile = _lsNormalizeProfile(rawProfile || null);
    if (!profile || !profile.birth || !profile.birth.year || !profile.birth.month || !profile.birth.day) return null;
    if (profile.birth.isTimeUnknown) return null;
    var birth = profile.birth;
    var location = profile.location || {};
    var birthDate = String(birth.year).padStart(4, '0') + '-' + String(birth.month).padStart(2, '0') + '-' + String(birth.day).padStart(2, '0');
    var birthTime = String(birth.hour || 0).padStart(2, '0') + ':' + String(birth.minute || 0).padStart(2, '0');
    return {
      name: String(profile.name || fallbackName || '사용자').trim() || String(fallbackName || '사용자'),
      gender: String(profile.gender || 'F').trim().toUpperCase() === 'M' ? 'M' : 'F',
      birthDate: birthDate,
      birthTime: birthTime,
      calendarType: String(birth.calType || 'solar').trim() || 'solar',
      timezone: String(location.tz || 'Asia/Seoul').trim() || 'Asia/Seoul',
      latitude: Number(location.lat),
      longitude: Number(location.lng)
    };
  }

  function _collectPartnerBirthInput() {
    var year = parseInt((_qs('lsPsYear') || {}).value || '0', 10);
    var month = parseInt((_qs('lsPsMonth') || {}).value || '0', 10);
    var day = parseInt((_qs('lsPsDay') || {}).value || '0', 10);
    var hourEl = _qs('lsPsHour');
    var hourIdx = (hourEl && hourEl.value !== '') ? parseInt(hourEl.value, 10) : -1;
    if (!year || !month || !day) return null;
    var jiHourMap = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
    var birthHour = (hourIdx >= 0 && hourIdx < jiHourMap.length) ? jiHourMap[hourIdx] : 12;
    var gm = _qs('lsPsGenderM');
    var gf = _qs('lsPsGenderF');
    var gender = (gm && gm.classList.contains('active')) ? 'M' : (gf && gf.classList.contains('active')) ? 'F' : 'F';
    return {
      name: String(((_qs('lsPsName') || {}).value) || '상대방').trim() || '상대방',
      gender: gender,
      birthDate: String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'),
      birthTime: String(birthHour).padStart(2, '0') + ':00',
      unknownTime: hourIdx < 0,
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
      latitude: 37.6,
      longitude: 127.0,
    };
  }

  function _resolveLoveSecretStoredUrl(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var pdfReady = data.pdfReady && typeof data.pdfReady === 'object' ? data.pdfReady : {};
    var directUrl = String(
      data.storedUrl ||
      data.downloadUrl ||
      data.pdfUrl ||
      data.htmlUrl ||
      data.reportUrl ||
      data.fileUrl ||
      data.storageUrl ||
      pdfReady.storedUrl ||
      pdfReady.downloadUrl ||
      pdfReady.pdfUrl ||
      pdfReady.htmlUrl ||
      pdfReady.reportUrl ||
      pdfReady.fileUrl ||
      pdfReady.storageUrl ||
      ''
    ).trim();
    if (directUrl) return directUrl;

    var reportId = String(data.reportId || pdfReady.reportId || _lsCurrentReportId || '').trim();
    var completed = String(data.status || data.serverStatus || '').toLowerCase() === 'completed';
    if (reportId && (data.canDownload || data.canReopen || completed)) {
      return '/api/premium/pdf-archive/' + encodeURIComponent(reportId);
    }
    return '';
  }

  function _hasLoveSecretStoredUrl(payload) {
    return !!_resolveLoveSecretStoredUrl(payload);
  }

  function _ensureLoveSecretStoredUrlOrFail(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var storedUrl = _resolveLoveSecretStoredUrl(data);
    if (storedUrl) {
      _lsResultPayload = Object.assign({}, data, {
        ok: data.ok !== false,
        status: data.status || 'completed',
        serverStatus: data.serverStatus || 'completed',
        reportId: String(data.reportId || _lsCurrentReportId || '').trim(),
        storedUrl: storedUrl,
        downloadUrl: data.downloadUrl || storedUrl,
        pdfUrl: data.pdfUrl || storedUrl,
        htmlUrl: data.htmlUrl || storedUrl,
        canDownload: true,
        canReopen: true,
      });
      return true;
    }

    _logLoveSecretFlow('StoredReportUrlMissing', {
      mode: _currentChapterMode,
      reportId: String(data.reportId || _lsCurrentReportId || '').trim(),
      hasChapters: _chapters.some(function (chapter) { return String(chapter || '').trim(); }),
    });
    return false;
  }

  function _buildLoveSecretPrintHtml() {
    var profile = window.__cdActiveBirthProfile || {};
    var birth = profile.birth || {};
    var birthStr = birth.year
      ? birth.year + '년 ' + (birth.month || '') + '월 ' + (birth.day || '') + '일'
      : '';
    var genderStr = profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : '';
    var issued = new Date().toLocaleDateString('ko-KR');
    var bodyHtml = '';
    for (var i = 0; i < _chapters.length; i++) {
      if (!_chapters[i]) continue;
      var meta = _getChapterMeta(i);
      bodyHtml +=
        '<div class="chapter" style="page-break-before:' + (i > 0 ? 'always' : 'auto') + '">' +
        '<div class="chapter-header">' +
        '<span class="chapter-num">제' + (i + 1) + '장</span>' +
        '<h2 class="chapter-title">' + _escHtml(meta.title) + '</h2>' +
        '<p class="chapter-sub">' + _escHtml(meta.subtitle) + '</p>' +
        '</div>' +
        '<div class="chapter-body">' + _md2html(_chapters[i]) + '</div>' +
        '</div>';
    }

    var tocHtml = _chapters.map(function (chapter, index) {
      if (!chapter) return '';
      return '<div class="toc-item"><span class="toc-num">제' + (index + 1) + '장</span><span class="toc-text">' + _escHtml(_getChapterMeta(index).title) + '</span></div>';
    }).join('');

    return '<!DOCTYPE html><html lang="ko"><head>' +
      '<meta charset="UTF-8">' +
      '<title>' + _escHtml((profile.name || '사용자') + '님의 연애 비책') + '</title>' +
      '<style>' +
      '@font-face{font-family:"CodeDestinyPremium";src:url("https://assets.code-destiny.com/The%20Jamsil%20OTF%204%20Medium.otf") format("opentype");font-weight:500;font-style:normal;font-display:optional;}' +
      'body{font-family:"Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;color:#1a0a1e;background:#fff;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#1a0010 0%,#3d0030 50%,#1a0010 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:.75rem;letter-spacing:.2em;color:#f9a8d4;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-family:"CodeDestinyPremium","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;font-size:3rem;font-weight:700;margin:0 0 12px;color:#fce7f3;letter-spacing:.03em;}' +
      '.cover-subtitle{font-size:1.1rem;color:#f472b6;margin:0 0 32px;}' +
      '.cover-name{font-size:1.7rem;color:#fde68a;margin:0 0 8px;}' +
      '.cover-info{font-size:.9rem;color:#fbb6ce;margin:0 0 10px;}' +
      '.cover-deco{font-size:1.5rem;color:#ec4899;letter-spacing:.3em;margin-top:32px;}' +
      '.toc{padding:48px 56px;page-break-after:always;}' +
      '.toc-title{font-family:"CodeDestinyPremium","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;font-size:1.4rem;color:#9d174d;margin-bottom:32px;border-bottom:2px solid #ec4899;padding-bottom:12px;}' +
      '.toc-item{display:flex;align-items:baseline;gap:8px;margin-bottom:16px;font-size:1rem;}' +
      '.toc-num{color:#ec4899;font-weight:700;min-width:80px;}' +
      '.toc-text{color:#4a0030;}' +
      '.chapter{padding:48px 56px;}' +
      '.chapter-header{border-bottom:1px solid #fce7f3;margin-bottom:32px;padding-bottom:24px;}' +
      '.chapter-num{font-size:.75rem;letter-spacing:.2em;color:#ec4899;text-transform:uppercase;display:block;margin-bottom:8px;}' +
      '.chapter-title{font-family:"CodeDestinyPremium","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;font-size:1.8rem;font-weight:700;color:#4a0030;margin:0 0 8px;}' +
      '.chapter-sub{font-size:.95rem;color:#be185d;margin:0;}' +
      '.chapter-body{line-height:1.9;font-size:.98rem;color:#2d1a2e;}' +
      '.ls-md-h1,.ls-md-h2{font-size:1.3rem;font-weight:700;color:#4a0030;margin:28px 0 12px;border-left:4px solid #ec4899;padding-left:12px;}' +
      '.ls-md-h3{font-size:1.1rem;font-weight:700;color:#831843;margin:20px 0 8px;}' +
      '.ls-md-h4{font-size:1rem;font-weight:700;color:#9d174d;margin:16px 0 6px;}' +
      '.ls-md-p{margin:0 0 14px;line-height:1.9;}' +
      '.ls-md-ul{margin:0 0 14px;padding-left:24px;}' +
      '.ls-md-li{margin-bottom:6px;line-height:1.7;}' +
      '.ls-md-hr{border:none;border-top:1px solid #fce7f3;margin:24px 0;}' +
      '@page{size:A4;margin:14mm;}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.cover{min-height:auto;padding:60px 40px;}}' +
      '</style></head><body>' +
      '<div class="cover">' +
      '<p class="cover-badge">✦ CODE DESTINY · 연애 비책 — 운명의 설계도 ✦</p>' +
      '<h1 class="cover-title">💕 연애 비책</h1>' +
      '<p class="cover-subtitle">運命이 설계한 사랑의 지도</p>' +
      '<h2 class="cover-name">' + _escHtml(profile.name || '사용자') + ' 님</h2>' +
      '<p class="cover-info">' + _escHtml(birthStr) + (genderStr ? ' · ' + _escHtml(genderStr) : '') + '</p>' +
      '<p class="cover-info">발행일: ' + _escHtml(issued) + '</p>' +
      '<div class="cover-deco">♡ ◈ ♡</div>' +
      '</div>' +
      '<div class="toc"><h2 class="toc-title">목 차 (Table of Contents)</h2>' + tocHtml + '</div>' +
      bodyHtml +
      '</body></html>';
  }

  function _openLoveSecretHtml(html, shouldPrint) {
    var win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) return false;
    try {
      win.document.open();
      win.document.write(String(html || ''));
      win.document.close();
    } catch (_) {
      return false;
    }
    if (shouldPrint) {
      win.onload = function () {
        setTimeout(function () {
          try { win.focus(); } catch (_) {}
          try { win.print(); } catch (_) {}
        }, 600);
      };
    }
    return true;
  }

  function _lsPromptBaseProfile() {
    try {
      var dateInput = String(window.prompt('연애 비책 생성을 위해 생년월일을 입력해 주세요. (예: 1994-08-16)', '') || '').trim();
      if (!dateInput) return null;
      var dParts = dateInput.split(/[-/]/);
      if (dParts.length < 3) return null;
      var year = _lsToInt(dParts[0], 0);
      var month = _lsToInt(dParts[1], 0);
      var day = _lsToInt(dParts[2], 0);
      if (!year || !month || !day) return null;

      var timeInput = String(window.prompt('출생 시각을 입력해 주세요. 모르면 비워두세요. (예: 14:30)', '') || '').trim();
      var parsedPromptTime = _lsParseFlexibleBirthTime(timeInput, null, null);
      var hour = (parsedPromptTime.isUnknown || !Number.isFinite(parsedPromptTime.hour))
        ? 12
        : _lsToInt(parsedPromptTime.hour, 12);
      var minute = _lsToInt(parsedPromptTime.minute, 0);

      var genderInput = String(window.prompt('성별을 입력해 주세요. (M/F)', 'F') || 'F').trim().toUpperCase();
      var gender = genderInput === 'M' ? 'M' : 'F';

      return _lsNormalizeProfile({
        name: '사용자',
        gender: gender,
        birth: { year: year, month: month, day: day, hour: hour, minute: minute, calType: 'solar' },
        location: { label: '대한민국 (서울)', tz: 'Asia/Seoul', lng: 127.0, lat: 37.6, tzOffset: 9, baseTzOffset: 9 }
      });
    } catch (_) {
      return null;
    }
  }

  function _lsAdoptBirthProfile(options) {
    var opt = options || {};
    var allowPrompt = !!opt.allowPrompt;

    var active = _lsNormalizeProfile(window.__cdActiveBirthProfile || null);
    if (active) {
      window.__cdActiveBirthProfile = active;
      return true;
    }

    var candidates = [];

    try {
      var dateEl = document.getElementById('birthDate');
      if (dateEl && dateEl.value) {
        var p = String(dateEl.value).split('-');
        var y = _lsToInt(p[0], 0);
        var m = _lsToInt(p[1], 0);
        var d = _lsToInt(p[2], 0);
        if (y && m && d) {
          var isFemale = document.querySelector('#btnF.on') !== null;
          var hEl = document.getElementById('birthHour');
          var minEl = document.getElementById('birthMinute');
          var cSel = document.getElementById('birthCountry');
          var loc = { label: '대한민국 (서울)', lng: 127.0, lat: 37.6, tz: 'Asia/Seoul', tzOffset: 9, baseTzOffset: 9 };
          if (cSel && cSel.selectedIndex >= 0) {
            var op = cSel.options[cSel.selectedIndex];
            if (op) {
              loc = {
                label: (op.textContent || op.text || '').trim(),
                lng: parseFloat(op.getAttribute('data-long') || '127.0'),
                lat: parseFloat(op.getAttribute('data-lat') || '37.6'),
                tz: op.value || 'Asia/Seoul',
                tzOffset: parseFloat(op.getAttribute('data-tz') || '9'),
                baseTzOffset: parseFloat(op.getAttribute('data-base-tz') || '9')
              };
            }
          }
          candidates.push({
            name: ((document.getElementById('nameInput') || {}).value || '사용자').trim() || '사용자',
            gender: isFemale ? 'F' : 'M',
            birth: { year: y, month: m, day: d, hour: hEl ? _lsToInt(hEl.value, 12) : 12, minute: minEl ? _lsToInt(minEl.value, 0) : 0, calType: 'solar' },
            location: loc
          });
        }
      }
    } catch (_) {}

    try {
      var pick = (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
        || window.__cdCurrentDestinyProfile
        || null;
      if (pick) candidates.push(pick);
    } catch (_) {}

    try { candidates.push(JSON.parse(localStorage.getItem('FORTUNE_APP_USER_PROFILE') || 'null')); } catch (_) {}
    try { candidates.push(JSON.parse(sessionStorage.getItem('FORTUNE_APP_USER_PROFILE') || 'null')); } catch (_) {}
    try { candidates.push(JSON.parse(localStorage.getItem('FORTUNE_APP_VEDIC_PAYLOAD') || 'null')); } catch (_) {}
    try { candidates.push(JSON.parse(sessionStorage.getItem('FORTUNE_APP_VEDIC_PAYLOAD') || 'null')); } catch (_) {}
    try { candidates.push(window.FORTUNE_APP_VEDIC_PAYLOAD || null); } catch (_) {}

    try {
      var ziwei = JSON.parse(localStorage.getItem('premium:ziwei:session:v1') || 'null');
      if (ziwei) {
        candidates.push({
          name: '사용자',
          gender: 'F',
          birth: {
            year: _lsToInt(ziwei.birthYear, 0),
            month: _lsToInt(ziwei.birthMonth, 0),
            day: _lsToInt(ziwei.birthDay, 0),
            hour: _lsToInt(ziwei.birthHour, 12),
            minute: 0,
            calType: 'solar'
          },
          location: { label: '대한민국 (서울)', tz: 'Asia/Seoul', lng: 127.0, lat: 37.6, tzOffset: 9, baseTzOffset: 9 }
        });
      }
    } catch (_) {}

    try {
      var sp = new URLSearchParams(window.location.search);
      var vp = sp.get('vp');
      if (vp) candidates.push(JSON.parse(decodeURIComponent(vp)));
    } catch (_) {}

    for (var i = 0; i < candidates.length; i++) {
      var normalized = _lsNormalizeProfile(candidates[i]);
      if (!normalized) continue;
      window.__cdActiveBirthProfile = normalized;
      try {
        sessionStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(normalized));
        localStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(normalized));
      } catch (_) {}
      return true;
    }

    if (allowPrompt) {
      var prompted = _lsPromptBaseProfile();
      if (prompted) {
        window.__cdActiveBirthProfile = prompted;
        try {
          sessionStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(prompted));
          localStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(prompted));
        } catch (_) {}
        return true;
      }
    }
    return false;
  }

  window.openLoveSecretModal = function () {
    _prepareLoveSecretUi('solo');
    _refreshLoveSecretPriceLabels();
    var modal = _ensureLoveSecretModalMounted();
    if (!modal) return;
    _ensureLoveSecretContextPanel();
    var hasData = _lsAdoptBirthProfile({ allowPrompt: false });
    _setLoveSecretInputNotice(hasData
      ? '⚠️ 분석에는 약 2~3분이 소요됩니다. 유형을 선택하면 결제 확인 후 생성됩니다.'
      : '생년월일을 입력하지 않아도 구성을 먼저 확인할 수 있습니다. 생성 전에는 생년월일이 필요합니다.');

    _lsResumePremiumJob();

    if (_generating) {
      _showScreen('lsLoadingScreen');
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
      return;
    }

    _currentChapterMode = 'solo';
    _chapters = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
    _chapterStructured = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
    _chapterMeta = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
    _logLoveSecretFlow('ModalOpen', { mode: 'solo', hasUserChart: hasData });
    _logLoveSecretFlow('ModeResolved', { mode: 'solo' });
    _logLoveSecretFlow('ProfileResolved', { hasProfile: hasData });
    _showScreen('lsStartScreen');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try {
      modal.setAttribute('aria-hidden', 'false');
      var closeBtn = modal.querySelector('.ls-modal__close');
      if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
    } catch (_) {}
  };

  window.closeLoveSecretModal = function () {
    var modal = _qs('loveSecretModal');
    if (!modal) return;
    if (!_generating) _stopLoadingAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  function _bindToc() {
    var nav = document.querySelector('.ls-toc');
    if (!nav) return;
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ls-chapter]');
      if (!btn) return;
      var ch = Number(btn.getAttribute('data-ls-chapter'));
      if (!ch || !_chapters[ch - 1]) return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.ls-toc-item'), function (b) {
        b.classList.toggle('active', b === btn);
        b.classList.toggle('loaded', !!_chapters[Number(b.getAttribute('data-ls-chapter')) - 1]);
      });
    });
  }

  function _resolveLoveSecretActiveChapter() {
    var activeBtn = document.querySelector('.ls-toc-item.active[data-ls-chapter]');
    var ch = Number(activeBtn ? activeBtn.getAttribute('data-ls-chapter') : 1);
    if (!Number.isFinite(ch) || ch < 1 || ch > _chapters.length) ch = 1;
    return ch;
  }

  function _regenerateLoveSecretCurrentChapter() {
    var chapter = _resolveLoveSecretActiveChapter();
    var idx = chapter - 1;
    var fetchChapter = _lsFetchChapterForPartialRegenerate;
    var runPipeline = (typeof window.__cdRunPremiumChapterPipeline === 'function')
      ? window.__cdRunPremiumChapterPipeline
      : null;
    if (!runPipeline) {
      _showLoveSecretInlineError('공통 챕터 파이프라인을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (!_lsCurrentReportId || typeof fetchChapter !== 'function') {
      _showLoveSecretInlineError('현재 세션 정보가 부족해 부분 재생성을 시작할 수 없습니다. 리포트를 다시 생성한 뒤 시도해 주세요.');
      return;
    }

    runPipeline({
      totalChapters: 1,
      maxAttempts: 3,
      retryDelayMs: 3000,
      fetchChapter: function () {
        return fetchChapter(idx);
      },
      isSuccess: function (data) {
        return !!(data && data.ok && data.text);
      },
      onSuccess: function (_, data) {
        _syncChapterMetaFromResponse(idx, data);
        _chapters[idx] = String(data.text || '').trim();
        _chapterStructured[idx] = (Array.isArray(data.sections) && data.sections.length)
          ? { sections: data.sections }
          : (data.chapterJson && typeof data.chapterJson === 'object' ? data.chapterJson : null);
        _saveResult(window.__cdActiveBirthProfile || {});
        _renderChapter(chapter);
      },
      onFallback: function (_, fallbackPayload) {
        var fallbackText = String(window.__cdPremiumChapterFallbackText || '일시적인 응답 지연으로 해석을 불러오지 못했습니다. 부분 재생성 버튼을 이용해주세요.');
        var msg = (fallbackPayload && fallbackPayload.message) ? String(fallbackPayload.message) : '알 수 없는 오류';
        _chapters[idx] = fallbackText;
        _chapterStructured[idx] = null;
        console.warn('[연애 비책] Chapter ' + chapter + ' 부분 재생성 실패:', msg);
        _saveResult(window.__cdActiveBirthProfile || {});
        _renderChapter(chapter);
      },
    }).catch(function (error) {
      var msg = String(error && error.message ? error.message : error || '부분 재생성 중 오류가 발생했습니다.');
      _logLoveSecretError(error, { stage: 'partial-regenerate', mode: _currentChapterMode, reportId: _lsCurrentReportId });
      _showLoveSecretInlineError('연애 비책 부분 재생성 중 오류가 발생했습니다: ' + msg);
    });
  }

  function _ensureLoveSecretPartialRegenerateControl() {
    if (typeof window.__cdAttachPartialRegenerateControl !== 'function') return;
    window.__cdAttachPartialRegenerateControl({
      scopeSelector: '.ls-toc',
      buttonId: 'lsPartialRegenerateBtn',
      buttonText: '현재 챕터 재생성',
      onClick: _regenerateLoveSecretCurrentChapter,
    });
  }

  function _renderChapter(ch) {
    var content = _qs('lsChapterContent');
    if (!content) return;
    var idx = ch - 1;
    var data = _chapters[idx];
    var structured = _chapterStructured[idx];
    if (!data && !structured) {
      content.innerHTML = '<p class="ls-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';
      return;
    }
    var bodyHtml = _renderStructuredChapterBody(ch, structured);
    if (!bodyHtml && data) bodyHtml = _md2html(data);
    if (!bodyHtml && structured) bodyHtml = _md2html(_deriveTextFromChapterJson(structured));
    content.innerHTML =
      '<div class="ls-chapter-wrap">' +
      '<div class="ls-chapter-header">' +
      '<span class="ls-chapter-num">제' + ch + '장</span>' +
      '<h2 class="ls-chapter-title">' + _escHtml(_getChapterMeta(idx).title) + '</h2>' +
      '<p class="ls-chapter-sub">' + _escHtml(_getChapterMeta(idx).subtitle) + '</p>' +
      '</div>' +
      '<div class="ls-chapter-body">' + bodyHtml + '</div>' +
      '</div>';
    content.scrollTop = 0;
    _updateTocState(ch);
  }

  function _updateTocState(activeChapter) {
    var current = Number(activeChapter || 1);
    var items = document.querySelectorAll('.ls-toc-item');
    Array.prototype.forEach.call(items, function (btn) {
      var ch = Number(btn.getAttribute('data-ls-chapter'));
      btn.classList.toggle('loaded', !!_chapters[ch - 1]);
      btn.classList.toggle('active', ch === current);
    });
  }

  function _setLoveSecretInputNotice(message) {
    var notice = _qs('lsInputNotice');
    if (!notice) return;
    notice.textContent = String(message || '⚠️ 분석에는 약 2~3분이 소요됩니다. 생년월일 입력 후 결제와 생성으로 진행됩니다.');
  }

  function _showLoveSecretBirthRequiredNotice() {
    _setLoveSecretInputNotice('생년월일을 먼저 입력해 주세요. 출생 시간을 모르면 낮 12시 기준으로 보수 해석합니다.');
    _showScreen('lsStartScreen');
    var target = document.getElementById('birthDate') || document.getElementById('run-btn') || _qs('loveSecretModal');
    if (target) {
      try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
      try { if (typeof target.focus === 'function') target.focus({ preventScroll: true }); } catch (_) {}
    }
  }

  function _setLoveSecretButtonBusy(button, busy, busyText) {
    if (!button) return;
    if (busy) {
      if (!button.getAttribute('data-ls-original-html')) button.setAttribute('data-ls-original-html', button.innerHTML);
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = String(busyText || '처리 중...');
      return;
    }
    var originalHtml = button.getAttribute('data-ls-original-html');
    if (originalHtml) button.innerHTML = originalHtml;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }

  function _showLoveSecretInlineError(message) {
    var text = String(message || '연애 비책 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    var msgEl = _qs('lsErrorMsg');
    if (msgEl) {
      msgEl.textContent = text;
      _showScreen('lsErrorScreen');
      return;
    }
    var chapterMsg = _qs('lsChapterMsg');
    if (chapterMsg) chapterMsg.textContent = text;
    try { console.warn('[LoveBook][InlineError]', text); } catch (_) {}
  }

  /* ── 모듈 레벨 사주 데이터 저장 ───────────────────────────── */
  var _cachedSajuData = '';
  var _cachedSajuBase = null;

    window.generateLoveSecret = function () {
    if (_generating) return;
    _ensureLoveSecretContextPanel();
    // 프로필 복구: __cdActiveBirthProfile 없으면 localStorage DP에서 시도
    _lsAdoptBirthProfile({ allowPrompt: false });
    var hasData = !!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year);
    if (!hasData) { _showLoveSecretBirthRequiredNotice(); return; }
    // 사주 분석 화면과 100% 일치하도록 G_PILLARS 등 전역 변수 재계산
    if (typeof window.computeProfileForModal === 'function' && window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth) {
      try { window.computeProfileForModal(window.__cdActiveBirthProfile); } catch (_cpE) {}
    }
    _cachedSajuData = _collectSajuData();
    _cachedSajuBase = _collectSajuBase();
    _currentChapterMode = 'solo';
    _chapters = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
    _chapterStructured = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
    _chapterMeta = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
    _showScreen('lsPartnerScreen');
    _bindPartnerScreen();
  };

  function _validateLoveBookInputBeforePayment(mode, partnerBirthInput) {
    var selfBirthInput = _buildLoveSecretBirthInputFromProfile(window.__cdActiveBirthProfile || {}, '사용자');
    var hasSelf = !!selfBirthInput;
    var hasPartner = !!partnerBirthInput;
    _logLoveSecretFlow('ValidationBeforePayment', {
      mode: String(mode || 'solo'),
      hasSelf: hasSelf,
      hasPartner: hasPartner,
    });
    if (!hasSelf) {
      return { ok: false, message: '생년월일 정보가 필요합니다. 출생 시간을 모르면 낮 12시 기준으로 보수 해석합니다.' };
    }
    if (String(mode || 'solo') === 'compatibility' && !hasPartner) {
      return { ok: false, message: '궁합 모드는 상대방 생년월일이 필요합니다. 출생 시각은 모름으로 진행할 수 있습니다.' };
    }
    return { ok: true };
  }

  window.handleStartCompatibilityLoveBook = async function () {
    if (_generating || _paymentGateInFlight) return;
    _currentChapterMode = 'compatibility';
    _logLoveSecretFlow('ModeResolved', { mode: 'compatibility' });
    var year = parseInt((_qs('lsPsYear') || {}).value || '0', 10);
    var month = parseInt((_qs('lsPsMonth') || {}).value || '0', 10);
    var day = parseInt((_qs('lsPsDay') || {}).value || '0', 10);
    if (!year || !month || !day) {
      var missingEl = !year ? _qs('lsPsYear') : (!month ? _qs('lsPsMonth') : _qs('lsPsDay'));
      var infoEl = _qs('lsPsInfo');
      if (infoEl) infoEl.textContent = '궁합 PDF 생성에는 상대방 생년월일이 필요합니다. 출생 시각은 모름으로 진행할 수 있습니다.';
      if (missingEl) {
        missingEl.focus();
        missingEl.style.borderColor = 'rgba(239,68,68,0.8)';
        setTimeout(function () { missingEl.style.borderColor = ''; }, 2000);
      }
      return;
    }

    var reportId = _lsBuildReportId('compatibility');
    var prePartnerBirthInput = _collectPartnerBirthInput();
    _logLoveSecretFlow('PartnerInputResolved', { hasPartnerInput: !!prePartnerBirthInput });
    var preValidation = _validateLoveBookInputBeforePayment('compatibility', prePartnerBirthInput);
    if (!preValidation.ok) {
      if (!window.__cdActiveBirthProfile) _showLoveSecretBirthRequiredNotice();
      else _showLoveSecretInlineError(preValidation.message || '입력값 확인이 필요합니다.');
      return;
    }
    _logLoveSecretFlow('BirthInputNormalized', { mode: 'compatibility', hasSelfBirth: true, hasPartnerBirth: true });

    var startBtn = _qs('lsPsStartBtn');
    _setLoveSecretButtonBusy(startBtn, true, '결제 확인 중...');
    if (!_beginLoveSecretPaymentGate('compatibility', reportId)) {
      _restorePartnerStartBtn();
      return;
    }

    function _restorePartnerStartBtn() {
      _setLoveSecretButtonBusy(startBtn, false);
    }

    function _startWithPartnerData(paymentContext) {
      _restorePartnerStartBtn();
      var partnerBirthInput = _collectPartnerBirthInput();
      _logLoveSecretFlow('PartnerInputResolved', { hasPartnerInput: !!partnerBirthInput });
      _endLoveSecretPaymentGate(reportId);
      _startGeneration(partnerBirthInput, paymentContext, reportId);
    }

    try {
      _logLoveSecretFlow('PaymentGateStart', { mode: 'compatibility', reportId: reportId });
      var gateResult = await _runLoveSecretCoinGate('compatibility', reportId);
      if (!gateResult.ok) {
        _showLoveSecretInlineError(gateResult.message || '결제 확인에 실패했습니다.');
        return;
      }
      _logLoveSecretFlow('PaymentGateSuccess', { mode: 'compatibility', reportId: reportId, purchaseId: gateResult.purchaseId || '' });
      _startWithPartnerData(gateResult);
    } finally {
      if (!_generating) _endLoveSecretPaymentGate(reportId);
      _restorePartnerStartBtn();
    }
  };

  window.handleStartSoloLoveBook = async function () {
    if (_generating || _paymentGateInFlight) return;
    _currentChapterMode = 'solo';
    _logLoveSecretFlow('ModeResolved', { mode: 'solo' });
    var reportId = _lsBuildReportId('solo');
    var preValidation = _validateLoveBookInputBeforePayment('solo', null);
    if (!preValidation.ok) {
      _showLoveSecretBirthRequiredNotice();
      return;
    }
    _logLoveSecretFlow('BirthInputNormalized', { mode: 'solo', hasSelfBirth: true, hasPartnerBirth: false });
    var soloBtn = document.querySelector('[data-action="lsSkipPartner"]');
    _setLoveSecretButtonBusy(soloBtn, true, '결제 확인 중...');
    if (!_beginLoveSecretPaymentGate('solo', reportId)) {
      _setLoveSecretButtonBusy(soloBtn, false);
      return;
    }
    _logLoveSecretFlow('PaymentGateStart', { mode: 'solo', reportId: reportId });
    try {
      var gateResult = await _runLoveSecretCoinGate('solo', reportId);
      if (!gateResult.ok) {
        _showLoveSecretInlineError(gateResult.message || '결제 확인에 실패했습니다.');
        return;
      }
      _logLoveSecretFlow('PaymentGateSuccess', { mode: 'solo', reportId: reportId, purchaseId: gateResult.purchaseId || '' });
      _endLoveSecretPaymentGate(reportId);
      _startGeneration(null, gateResult, reportId);
    } finally {
      if (!_generating) _endLoveSecretPaymentGate(reportId);
      _setLoveSecretButtonBusy(soloBtn, false);
    }
  };

  window.lsStartWithPartner = function () {
    return window.handleStartCompatibilityLoveBook();
  };

  window.lsSkipPartner = function () {
    return window.handleStartSoloLoveBook();
  };

  function _startGeneration(partnerBirthInput, paymentContext, reportId) {
    _generating = true;
    _cancelGeneration = false;
    _lsLastStateKey = '';
    var _paymentCtx = paymentContext && typeof paymentContext === 'object' ? paymentContext : {};
    // paymentContext가 gate result 형태({accessGrant, purchaseId, ...})인지 직접 accessGrant 형태인지 판별
    if ('accessGrant' in _paymentCtx) {
      _lsAccessGrant = _paymentCtx.accessGrant || null;
      _lsGatePurchaseId = String(_paymentCtx.purchaseId || (_paymentCtx.accessGrant && _paymentCtx.accessGrant.purchaseId) || '').trim();
    } else {
      // 레거시: 직접 accessGrant 객체를 전달한 경우
      _lsAccessGrant = Object.keys(_paymentCtx).length > 0 ? _paymentCtx : null;
      _lsGatePurchaseId = String((_paymentCtx && _paymentCtx.purchaseId) || '').trim();
    }
    _lsResultPayload = null;
    _currentChapterMode = partnerBirthInput ? 'compatibility' : 'solo';
    _logLoveSecretFlow('ModeResolved', { mode: _currentChapterMode });
    _logLoveSecretFlow('ProfileResolved', { hasProfile: !!window.__cdActiveBirthProfile });
    if (_currentChapterMode === 'compatibility') {
      _setLoveBookGenerationState('validating_partner');
      _logLoveSecretFlow('PartnerInputResolved', { hasPartnerInput: !!partnerBirthInput });
    }
    _lsCurrentReportId = String(reportId || '').trim() || _lsBuildReportId(_currentChapterMode);
    var normalizedPaymentCtx = _normalizeLoveSecretPaymentContext(_paymentCtx, _currentChapterMode, _lsCurrentReportId);
    if (normalizedPaymentCtx.accessGrant || normalizedPaymentCtx.premiumAccessToken || normalizedPaymentCtx.purchaseId) {
      _lsAccessGrant = normalizedPaymentCtx.accessGrant;
      _lsGatePurchaseId = String(normalizedPaymentCtx.purchaseId || '').trim();
      if (normalizedPaymentCtx.premiumAccessToken) {
        try { window.__cdPremiumAccessToken = normalizedPaymentCtx.premiumAccessToken; } catch (_) {}
        try { sessionStorage.setItem('cd_premium_access_token', normalizedPaymentCtx.premiumAccessToken); } catch (_) {}
        try { localStorage.setItem('cd_premium_access_token', normalizedPaymentCtx.premiumAccessToken); } catch (_) {}
      }
    }
    _setLoveBookGenerationState('preparing_generation');
    _showScreen('lsLoadingScreen');
    _prepareLoveSecretUi(_currentChapterMode);
    _startLoadingAnimation();
    var birthInput = _buildLoveSecretBirthInputFromProfile(window.__cdActiveBirthProfile || {}, '사용자');
    if (!birthInput) {
      _generating = false;
      _stopLoadingAnimation();
      _setLoveBookGenerationState('failed');
      _showLoveSecretBirthRequiredNotice();
      return;
    }
    var sajuData = _cachedSajuData || _collectSajuData();
    var sajuBase = _cachedSajuBase || _collectSajuBase();
    var totalChapters = _getLoveSecretModeTotalChapters(_currentChapterMode);
    _chapters = _buildChapterBuffer(totalChapters);
    _chapterStructured = _buildChapterBuffer(totalChapters);
    _chapterMeta = _buildChapterBuffer(totalChapters);
    var progressBar = _qs('lsProgressBar');
    var progressText = _qs('lsProgressText');
    var chapterMsg = _qs('lsLoadingChapter');
    var _llmStartLogged = false;
    var _pdfStartLogged = false;

    function _setProgress(done) {
      var pct = totalChapters > 0 ? (done / totalChapters) * 100 : 0;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / ' + totalChapters + ' 챕터 완성';
      if (chapterMsg && done < totalChapters) chapterMsg.textContent = _getLoveSecretLoadingMessage(done, _currentChapterMode);
      if (chapterMsg && done >= totalChapters) chapterMsg.textContent = '모든 챕터가 완성되었습니다 💕';
      _updateLoadPills(done);
      _logLoveSecretFlow('LocalDraftProgress', {
        mode: _currentChapterMode,
        completed: done,
        total: totalChapters,
      });
    }
    _setProgress(0);

    var _lsReportId = _lsCurrentReportId;
    var _lsFeatureKey = _getLoveSecretFeatureKey(_currentChapterMode);
    var _lsSessionId = String((_lsAccessGrant && _lsAccessGrant.sessionId) || ('love-book:' + _lsReportId)).trim();

    function _buildLoveSecretGenerationContext(mode, birthInput, partnerBirthInput) {
      var normalizedMode = _normalizeLoveSecretMode(mode);
      var isCompatibility = normalizedMode === 'compatibility';
      var selfName = _clean((birthInput && birthInput.name) || ((window.__cdActiveBirthProfile || {}).name) || '\uc0ac\uc6a9\uc790') || '\uc0ac\uc6a9\uc790';
      var partnerName = _clean((partnerBirthInput && partnerBirthInput.name) || '\uc0c1\ub300\ubc29') || '\uc0c1\ub300\ubc29';
      var targetYear = _getLoveSecretTargetYear();
      var userContext = _collectLoveSecretUserContext(normalizedMode, partnerBirthInput);
      var soloLoveStatus = '\ud604\uc7ac \uc5f0\uc560 \ud750\ub984, \uc778\uc5f0\uc758 \uc2dc\uae30, \uad00\uacc4 \uc120\ud0dd\uc744 \ud568\uaed8 \ubcf4\uace0 \uc2f6\uc740 \uc0c1\ud0dc';
      var compatLoveStatus = '\uc0c1\ub300\uc640\uc758 \uad00\uacc4 \ud750\ub984, \uad81\ud569, \uac10\uc815\uc758 \uc628\ub3c4\uc640 \uc9c0\uc18d \uac00\ub2a5\uc131\uc744 \ud568\uaed8 \ubcf4\uace0 \uc2f6\uc740 \uc0c1\ud0dc';
      var soloConcern = selfName + ' - ' + '\ub098\uc5d0\uac8c \ub9de\ub294 \uc0ac\ub791\uc758 \ubc29\ud5a5\uacfc \ud604\uc2e4\uc801\uc778 \uad00\uacc4 \uc804\ub7b5\uc744 \uc54c\uace0 \uc2f6\ub2e4';
      var compatConcern = selfName + ' / ' + partnerName + ' - ' + '\ub450 \uc0ac\ub78c\uc758 \uad81\ud569, \uac10\uc815 \ud750\ub984, \uad00\uacc4 \uc9c0\uc18d \uac00\ub2a5\uc131, \uc18c\ud1b5 \ubc29\uc2dd\uc744 \uc54c\uace0 \uc2f6\ub2e4';
      var idealType = _clean(userContext.idealType) || (isCompatibility ? partnerName : '\uc0ac\uc8fc \uc6d0\uad6d\uacfc \uc624\ud589 \uade0\ud615\uc5d0 \ub9de\ub294 \uc790\uc5f0\uc2a4\ub7ec\uc6b4 \uc778\uc5f0');
      var pastPattern = _clean(userContext.pastLovePattern) || '\ubc18\ubcf5\ub418\ub294 \ub04c\ub9bc, \uac70\ub9ac\uac10, \ud0c0\uc774\ubc0d\uc744 \uc810\uac80\ud558\uace0 \uc2f6\uc740 \ud328\ud134';
      var currentConcern = _clean(userContext.currentConcern) || (isCompatibility ? compatConcern : soloConcern);
      var loveStatus = _clean(userContext.loveStatus) || (isCompatibility ? compatLoveStatus : soloLoveStatus);
      var desiredOutcome = _clean(userContext.desiredOutcome) || (isCompatibility
        ? '\uc11c\ub85c\uc5d0\uac8c \ub9de\ub294 \uc18c\ud1b5\uacfc \uad00\uacc4 \uc9c0\uc18d \uc804\ub7b5\uc744 \uc54c\uace0 \uc2f6\ub2e4'
        : '\ub098\uc5d0\uac8c \ub9de\ub294 \uc0ac\ub791\uc758 \ubc29\ud5a5\uacfc \ud604\uc2e4\uc801\uc778 \uad00\uacc4 \uc804\ub7b5\uc744 \uc54c\uace0 \uc2f6\ub2e4');
      var clientFlow = {
        schemaVersion: 'love-secret-client-flow.v1',
        source: 'main-shell-love-secret-modal',
        mode: normalizedMode,
        chapterCount: _getLoveSecretModeTotalChapters(normalizedMode),
        selfName: selfName,
        partnerName: isCompatibility ? partnerName : ''
      };
      var baseContext = {
        mode: normalizedMode,
        targetYear: targetYear,
        loveStatus: loveStatus,
        relationshipStatus: loveStatus,
        currentLoveStatus: loveStatus,
        currentConcern: currentConcern,
        concern: currentConcern,
        question: currentConcern,
        idealType: idealType,
        preferredPartner: idealType,
        pastLovePattern: pastPattern,
        relationshipPattern: pastPattern,
        wantsMarriageAnalysis: userContext.wantsMarriageAnalysis !== false,
        includeMarriageAnalysis: userContext.wantsMarriageAnalysis !== false,
        wantsReunionAnalysis: userContext.wantsReunionAnalysis !== false,
        includeReunionAnalysis: userContext.wantsReunionAnalysis !== false,
        relationshipType: isCompatibility ? 'compatibility' : 'solo',
        status: isCompatibility ? 'relationship_or_interest' : 'single_or_reviewing_love_flow',
        desiredOutcome: desiredOutcome,
        tone: 'professional-mystical',
        writingStyle: 'professional-mystical',
        productTier: 'premium',
        tier: 'premium',
        userLoveContext: userContext,
        clientFlow: clientFlow
      };
      return Object.assign({}, baseContext, {
        serviceContext: Object.assign({}, baseContext, {
          birthInput: birthInput || undefined,
          profile: window.__cdActiveBirthProfile || {}
        }),
        relationshipContext: Object.assign({}, baseContext, {
          partnerBirthInput: partnerBirthInput || undefined,
          partnerName: isCompatibility ? partnerName : ''
        })
      });
    }

    function _attachLoveSecretGenerationContext(payload, context) {
      var base = payload && typeof payload === 'object' ? payload : {};
      var ctx = context && typeof context === 'object' ? context : {};
      var merged = Object.assign({}, base, ctx);
      merged.serviceContext = Object.assign({}, ctx.serviceContext || {}, base.serviceContext || {});
      merged.relationshipContext = Object.assign({}, ctx.relationshipContext || {}, base.relationshipContext || {});
      merged.clientFlow = Object.assign({}, ctx.clientFlow || {}, base.clientFlow || {});
      return merged;
    }

    var _lsGenerationContext = _buildLoveSecretGenerationContext(_currentChapterMode, birthInput, partnerBirthInput);
    var _lsContractCheck = _validateLoveSecretGenerationContract(_lsGenerationContext, _currentChapterMode);
    if (!_lsContractCheck.ok) {
      _generating = false;
      _stopLoadingAnimation();
      _setLoveBookGenerationState('failed');
      _logLoveSecretFlow('ContractValidationFailed', {
        mode: _currentChapterMode,
        missing: _lsContractCheck.errors,
        reportId: _lsCurrentReportId,
      });
      _showLoveSecretInlineError('연애 비책 생성 정보가 충분하지 않아요. 관계의 흐름과 가장 궁금한 질문을 확인한 뒤 다시 시도해 주세요.');
      return;
    }

    function _lsReadPremiumAccessToken() {
      var token = '';
      try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
      if (!token) {
        try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
      }
      if (!token) {
        try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
      }
      return token;
    }
    var lsTitle = _qs('lsLoadingTitle');
    if (lsTitle) {
      lsTitle.textContent = partnerBirthInput
        ? '두 사람의 궁합과 연애 비책을 집필하는 중입니다'
        : '연애 비책을 집필하는 중입니다';
    }
    _setLoveBookGenerationState('calculating_saju');
    _logLoveSecretFlow('LocalCalculationStart', { mode: _currentChapterMode, totalChapters: totalChapters });

    function _fetchChapter(idx) {
      return new Promise(function (resolve) {
        var _settled = false;
        var _chapterRequestTimeoutMs = 180000;
        var _abortMsg = '응답 시간 초과 (180초). 네트워크 상태를 확인해 주세요.';
        var _endpoints = _buildApiCandidates('/api/love-secret/generate-chapter', {
          sameOriginOnly: true,
          preferSameOrigin: true,
        });
        var _attemptPlan = [];
        var _lastMsg = '';
        var _lastError = null;

        for (var _ei = 0; _ei < _endpoints.length; _ei++) {
          for (var _ri = 0; _ri < 2; _ri++) {
            _attemptPlan.push({ url: _endpoints[_ei], retry: _ri + 1 });
          }
        }

        function _done(payload) {
          if (_settled) return;
          _settled = true;
          _abortActiveRequest();
          resolve(payload);
        }

        function _runAttempt(at) {
          if (_cancelGeneration) {
            _done({ ok: false, message: '사용자가 생성을 중단했습니다.' });
            return;
          }
          if (at >= _attemptPlan.length) {
            _logLoveSecretError(_lastError || { message: _lastMsg || '모든 API 엔드포인트 시도에 실패했습니다.' }, {
              stage: 'chapter',
              mode: _currentChapterMode,
              reportId: _lsReportId,
              sessionId: _lsSessionId
            });
            _done({ ok: false, message: _lastMsg || '모든 API 엔드포인트 시도에 실패했습니다.' });
            return;
          }

          var _plan = _attemptPlan[at];
          var _controller = (typeof AbortController === 'function') ? new AbortController() : null;
          if (_controller) _activeRequestController = _controller;
          var _lsPremiumToken = _lsReadPremiumAccessToken();
          var _lsHeaders = { 'Content-Type': 'application/json' };
          if (_lsPremiumToken) _lsHeaders['x-premium-access-token'] = _lsPremiumToken;
          _setLoveBookGenerationState('writing_llm');
          if (!_llmStartLogged) {
            _llmStartLogged = true;
            _logLoveSecretFlow('LlmChapterBuildStart', { mode: _currentChapterMode, reportId: _lsReportId });
          }

          var timeoutId = setTimeout(function () {
            if (_controller) {
              try { _controller.abort(); } catch (_) {}
            }
          }, _chapterRequestTimeoutMs);

          var _chapterRequestId = 'love-secret-' + _lsReportId + '-ch' + (idx + 1) + '-a' + _plan.retry;
          var _gateRequestId = String((_lsAccessGrant && _lsAccessGrant.requestId) || '').trim();
          var _purchaseId = String((_lsAccessGrant && _lsAccessGrant.purchaseId) || _lsGatePurchaseId || '').trim();

          fetch(_plan.url, {
            method: 'POST',
            credentials: 'include',
            headers: _lsHeaders,
            body: JSON.stringify(_attachLoveSecretGenerationContext({
              reportId: _lsReportId,
              requestId: _gateRequestId || _chapterRequestId,
              chapterRequestId: _chapterRequestId,
              sessionId: _lsSessionId,
              reportSessionId: _lsSessionId,
              chapterSessionId: 'love-secret-chapter-' + (idx + 1),
              chapter: idx + 1,
              mode: _currentChapterMode,
              generationMode: 'llm-only',
              authoringMode: 'premium-llm',
              featureKey: _lsFeatureKey,
              purchaseId: _purchaseId || undefined,
              strictNoFallback: true,
              chapterTitle: _getLoveSecretChapterTitle(idx, _currentChapterMode),
              chapterSubtitle: _getLoveSecretChapterSubtitle(idx, _currentChapterMode),
              chapterSpecificSections: Array.isArray(_getLoveSecretStructuredLabels(idx + 1, _currentChapterMode))
                ? _getLoveSecretStructuredLabels(idx + 1, _currentChapterMode).slice(0, 12)
                : [],
              accessGrant: _lsAccessGrant || undefined,
              premiumAccessToken: _lsPremiumToken || undefined,
              payment: {
                requestId: _gateRequestId || undefined,
                purchaseId: _purchaseId || undefined,
                sessionId: _lsSessionId,
                reportSessionId: _lsSessionId,
              },
              _paymentContext: {
                requestId: _gateRequestId || undefined,
                purchaseId: _purchaseId || undefined,
                sessionId: _lsSessionId,
                reportSessionId: _lsSessionId,
              },
              birthInput: birthInput,
              profile: window.__cdActiveBirthProfile || {},
              partnerBirthInput: partnerBirthInput || undefined,
              partnerData: partnerBirthInput ? _collectPartnerScreenData() : '',
            }, _lsGenerationContext)),
            signal: _controller ? _controller.signal : undefined,
          })
            .then(function (res) {
              if (!res.ok) {
                return res.json().catch(function () { return {}; }).then(function (e) {
                  return _buildLoveSecretApiError({ res: res, json: e }, (e && e.message) || ('HTTP ' + res.status), {
                    stage: 'chapter',
                    reportId: _lsReportId,
                    sessionId: _lsSessionId
                  });
                });
              }
              return res.json().catch(function () { return { ok: false, message: 'JSON 파싱 오류' }; });
            })
            .then(function (data) {
              clearTimeout(timeoutId);
              if (data instanceof Error) {
                _lastError = data;
                _lastMsg = data.message;
                _runAttempt(at + 1);
                return;
              }
              _lsResultPayload = data && typeof data === 'object' ? data : null;
              if (_activeRequestController === _controller) _activeRequestController = null;
              if (data && data.ok) {
                _done(data);
                return;
              }
              _lastMsg = (data && data.message) ? data.message : 'API 응답 실패';
              _runAttempt(at + 1);
            })
            .catch(function (err) {
              clearTimeout(timeoutId);
              if (_activeRequestController === _controller) _activeRequestController = null;
              if (err && err.name === 'AbortError') {
                _lastMsg = _cancelGeneration ? '사용자가 생성을 중단했습니다.' : _abortMsg;
              } else {
                _lastMsg = String(err && err.message ? err.message : err);
              }
              _lastError = err instanceof Error ? err : new Error(_lastMsg);
              _runAttempt(at + 1);
            });
        }

        _runAttempt(0);
      });
    }
    _lsFetchChapterForPartialRegenerate = _fetchChapter;

    function _applyCompletedResult(resultPayload) {
      var payload = resultPayload && typeof resultPayload === 'object' ? resultPayload : {};
      _lsResultPayload = payload;
      var manuscriptSource = String(payload.manuscriptSource || '').toLowerCase();
      var llmAssembly = payload.llmAssembly && typeof payload.llmAssembly === 'object' ? payload.llmAssembly : {};
      if (payload.fallbackUsed || manuscriptSource !== 'love-secret-premium-llm-only' || llmAssembly.enabled !== true || llmAssembly.externalGeneration !== true || llmAssembly.fallbackUsed === true) {
        throw _buildLoveSecretApiError({ body: payload, status: 422 }, '\uC5F0\uC560 \uBE44\uBC00 PDF\uAC00 LLM \uC6D0\uACE0 \uAC80\uC99D\uC744 \uD1B5\uACFC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.', {
          stage: 'llm-premium-result',
          mode: _currentChapterMode,
          reportId: _lsReportId,
          sessionId: _lsSessionId
        });
      }
      var list = Array.isArray(payload.chapters) ? payload.chapters : [];
      for (var i = 0; i < totalChapters; i++) {
        var chapter = list[i] || null;
        if (!chapter) continue;
        _chapterMeta[i] = {
          title: String(chapter.title || _getLoveSecretChapterTitle(i, _currentChapterMode)),
          subtitle: String(chapter.subtitle || _getLoveSecretChapterSubtitle(i, _currentChapterMode)),
          isSkeleton: false,
        };
        _chapters[i] = String(chapter.text || '').trim();
        _chapterStructured[i] = (Array.isArray(chapter.sections) && chapter.sections.length)
          ? { sections: chapter.sections }
          : null;
      }
      _setProgress(Math.max(0, Math.min(totalChapters, list.length || totalChapters)));
      _setLoveBookGenerationState('llm_result_ready');
      _logLoveSecretFlow('LlmPremiumResultReady', {
        mode: _currentChapterMode,
        manuscriptSource: String(payload.manuscriptSource || 'love-secret-premium-llm-only'),
        fallbackUsed: false,
      });
    }

    function _startStatusPolling(jobId, pollAfterMs) {
      return new Promise(function (resolve, reject) {
        var stopped = false;
        var pollTimer = null;
        var pollingMs = Number(pollAfterMs || 4000);
        var startedAt = Date.now();
        var hardTimeoutMs = 12 * 60 * 1000;
        var transientFailures = 0;
        var maxTransientFailures = 3;
        if (!Number.isFinite(pollingMs) || pollingMs < 3000) pollingMs = 4000;

        function _stop() {
          stopped = true;
          if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
          }
        }

        function _scheduleNext() {
          if (stopped) return;
          pollTimer = setTimeout(_pollOnce, pollingMs);
        }

        function _pollOnce() {
          if (stopped || _cancelGeneration) {
            _stop();
            reject(new Error('사용자가 생성을 중단했습니다.'));
            return;
          }

          if ((Date.now() - startedAt) >= hardTimeoutMs) {
            _stop();
            _setLoveBookGenerationState('failed');
            reject(new Error('연애 비책 생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'));
            return;
          }

          var statusUrl = '/api/love-secret/status?id=' + encodeURIComponent(String(jobId || '').trim());
          fetch(statusUrl, { method: 'GET', credentials: 'include' })
            .then(function (res) {
              return res.json().catch(function () { return {}; }).then(function (body) {
                return { ok: res.ok, status: res.status, body: body };
              });
            })
            .then(function (pack) {
              if (!pack.ok || !pack.body || !pack.body.ok) {
                throw _buildLoveSecretApiError(pack, (pack.body && pack.body.message) || ('HTTP ' + pack.status), {
                  stage: 'status',
                  reportId: _lsReportId,
                  sessionId: _lsSessionId
                });
              }

              var body = pack.body;
              var completed = Number(body.completedChapters || 0);
              var stageMsg = String(body.message || '').trim();
              _setProgress(completed);
              if (chapterMsg && stageMsg) chapterMsg.textContent = stageMsg;
              transientFailures = 0;

              var status = String(body.status || '').trim();
              if (status === 'completed') {
                _stop();
                _setLoveBookGenerationState('completed');
                var result = body.result && typeof body.result === 'object' ? body.result : null;
                if (!result) {
                  reject(new Error('완료 응답에 결과 데이터가 없습니다.'));
                  return;
                }
                if (!_hasLoveSecretStoredUrl(result)) {
                  reject(new Error('저장된 리포트 URL이 없어 완료 처리할 수 없습니다.'));
                  return;
                }
                resolve(result);
                return;
              }

              if (status === 'failed') {
                _stop();
                _setLoveBookGenerationState('failed');
                reject(_buildLoveSecretApiError({ status: body.statusCode || 500, body: body }, String(body.errorMessage || body.message || '연애 비책 생성에 실패했습니다.'), {
                  stage: 'status',
                  reportId: _lsReportId,
                  sessionId: _lsSessionId
                }));
                return;
              }

              _scheduleNext();
            })
            .catch(function (error) {
              transientFailures += 1;
              if (transientFailures > maxTransientFailures) {
                _stop();
                reject(error);
                return;
              }
              if (chapterMsg) {
                chapterMsg.textContent = '상태를 다시 확인하는 중입니다... (' + transientFailures + '/' + maxTransientFailures + ')';
              }
              _scheduleNext();
            });
        }

        _pollOnce();
      });
    }

    function _isDbQueueFailure(msg, status, code) {
      var text = String(msg || '').toLowerCase();
      var safeCode = String(code || '').toLowerCase();
      var sc = Number(status || 0);
      if (safeCode === 'database_unavailable' || safeCode === 'internal_server_error') return true;
      if (text.indexOf('database is temporarily unavailable') >= 0) return true;
      if (text.indexOf('internal server error') >= 0) return true;
      if (text.indexOf('db') >= 0 && text.indexOf('unavailable') >= 0) return true;
      return sc >= 500;
    }

    function _finalizeGenerationSuccess() {
      if (!_ensureLoveSecretStoredUrlOrFail(_lsResultPayload)) {
        _generating = false;
        _stopLoadingAnimation();
        _setLoveBookGenerationState('failed');
        if (chapterMsg) {
          chapterMsg.textContent = '연애 비책 PDF가 생성되었지만 다운로드 정보를 확인하지 못했습니다. 다시 불러오기를 시도해 주세요.';
        }
        return false;
      }
      _generating = false;
      _setLoveBookGenerationState('completed');
      _stopLoadingAnimation();
      _showScreen('lsResultScreen');
      _renderTocButtons(totalChapters);
      _updateTocState(1);
      _renderChapter(1);
      _bindToc();
      _ensureLoveSecretPartialRegenerateControl();
      var profile = window.__cdActiveBirthProfile || {};
      _saveResult(profile);
      _renderResultHeader(profile.name, profile.birth, profile.gender, new Date(), true);
      return true;
    }

    async function _runDirectChapterGeneration(reason) {
      _logLoveSecretFlow('ASYNC_TO_DIRECT_LOCAL_CHAPTERS', {
        mode: _currentChapterMode,
        reportId: _lsReportId,
        reason: String(reason || ''),
      });
      if (chapterMsg) {
        chapterMsg.textContent = '서버 대기열 상태를 다시 확인하고 있습니다...';
      }
      _setLoveBookGenerationState('writing_llm');

      for (var i = 0; i < totalChapters; i++) {
        if (_cancelGeneration) {
          throw new Error('사용자가 생성을 중단했습니다.');
        }
        var data = await _fetchChapter(i);
        if (!data || !data.ok) {
          throw new Error((data && data.message) || ('Chapter ' + (i + 1) + ' 생성 실패'));
        }
        _syncChapterMetaFromResponse(i, data);
        _chapters[i] = String(data.text || '').trim();
        _chapterStructured[i] = (Array.isArray(data.sections) && data.sections.length)
          ? { sections: data.sections }
          : (data.chapterJson && typeof data.chapterJson === 'object' ? data.chapterJson : null);
        _setProgress(i + 1);
      }
    }

    async function _runSyncPrepareGeneration(reason, preparePayload, submitHeaders) {
      _logLoveSecretFlow('ASYNC_TO_SYNC_PREPARE', {
        mode: _currentChapterMode,
        reportId: _lsReportId,
        reason: String(reason || ''),
      });
      if (chapterMsg) {
        chapterMsg.textContent = '연애 비책 PDF를 즉시 조립하고 있습니다...';
      }
      _setLoveBookGenerationState('writing_llm');
      var syncPayload = Object.assign({}, preparePayload || {}, {
        generationMode: 'llm-only',
        authoringMode: 'premium-llm',
        strictNoFallback: true,
      });
      var syncRes = await fetch('/api/love-secret/prepare', {
        method: 'POST',
        credentials: 'include',
        headers: submitHeaders || { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload),
      });
      var syncBody = await syncRes.json().catch(function () { return {}; });
      if (!syncRes.ok || !syncBody || !syncBody.ok || !_hasLoveSecretStoredUrl(syncBody)) {
        throw _buildLoveSecretApiError({ res: syncRes, json: syncBody }, (syncBody && syncBody.message) || ('HTTP ' + syncRes.status), {
          stage: 'prepare-sync',
          mode: _currentChapterMode,
          reportId: _lsReportId,
          sessionId: _lsSessionId
        });
      }
      _applyCompletedResult(syncBody);
    }

    (async function runLoveSecretAsyncPollingFlow() {
      var _lsPremiumToken = _lsReadPremiumAccessToken();
      var submitHeaders = { 'Content-Type': 'application/json' };
      if (_lsPremiumToken) submitHeaders['x-premium-access-token'] = _lsPremiumToken;

      var preparePayload = {
        reportId: _lsReportId,
        sessionId: _lsSessionId,
        reportSessionId: _lsSessionId,
        mode: _currentChapterMode,
        generationMode: 'llm-only',
        authoringMode: 'premium-llm',
        strictNoFallback: true,
        featureKey: _lsFeatureKey,
        purchaseId: String((_lsAccessGrant && _lsAccessGrant.purchaseId) || _lsGatePurchaseId || '').trim() || undefined,
        accessGrant: _lsAccessGrant || undefined,
        premiumAccessToken: _lsPremiumToken || undefined,
        payment: {
          requestId: String((_lsAccessGrant && _lsAccessGrant.requestId) || '').trim() || undefined,
          purchaseId: String((_lsAccessGrant && _lsAccessGrant.purchaseId) || _lsGatePurchaseId || '').trim() || undefined,
          sessionId: _lsSessionId,
          reportSessionId: _lsSessionId,
        },
        _paymentContext: {
          requestId: String((_lsAccessGrant && _lsAccessGrant.requestId) || '').trim() || undefined,
          purchaseId: String((_lsAccessGrant && _lsAccessGrant.purchaseId) || _lsGatePurchaseId || '').trim() || undefined,
          sessionId: _lsSessionId,
          reportSessionId: _lsSessionId,
        },
        birthInput: birthInput,
        profile: window.__cdActiveBirthProfile || {},
        partnerBirthInput: partnerBirthInput || undefined,
        partnerData: partnerBirthInput ? _collectPartnerScreenData() : '',
        quantumMyeongriJson: _collectQuantumMyeongriJson(),
      };
      preparePayload = _attachLoveSecretGenerationContext(preparePayload, _lsGenerationContext);

      _setLoveBookGenerationState('building_chapters');
      _logLoveSecretFlow('SessionCreateStart', { mode: _currentChapterMode, reportId: _lsReportId, sessionId: _lsSessionId, flow: 'prepare-async' });
      var submitRes = await fetch('/api/love-secret/prepare-async', {
        method: 'POST',
        credentials: 'include',
        headers: submitHeaders,
        body: JSON.stringify(preparePayload),
      });

      var submitBody = await submitRes.json().catch(function () { return {}; });
      if (submitRes.ok && submitBody && submitBody.ok && Array.isArray(submitBody.chapters) && !submitBody.jobId && _hasLoveSecretStoredUrl(submitBody)) {
        _applyCompletedResult(submitBody);
        if (_cancelGeneration) return;
        if (!_finalizeGenerationSuccess()) return;
        return;
      }
      if (!submitRes.ok || !submitBody || !submitBody.ok || !submitBody.jobId) {
        var submitMsg = (submitBody && submitBody.message) || ('HTTP ' + submitRes.status);
        if (_isDbQueueFailure(submitMsg, submitRes.status, submitBody && submitBody.code)) {
          await _runSyncPrepareGeneration(submitMsg, preparePayload, submitHeaders);
          if (_cancelGeneration) return;
          if (!_finalizeGenerationSuccess()) return;
          return;
        }
        throw _buildLoveSecretApiError({ res: submitRes, json: submitBody }, submitMsg, {
          stage: 'prepare-async',
          mode: _currentChapterMode,
          reportId: _lsReportId,
          sessionId: _lsSessionId
        });
      }

      _logLoveSecretFlow('SessionCreateSuccess', {
        mode: _currentChapterMode,
        reportId: _lsReportId,
        sessionId: _lsSessionId,
        flow: 'prepare-async',
        jobId: String(submitBody.jobId || ''),
      });

      _setLoveBookGenerationState('writing_llm');
      if (!_llmStartLogged) {
        _llmStartLogged = true;
        _logLoveSecretFlow('StoredReportPollingStart', { mode: _currentChapterMode, reportId: _lsReportId });
      }
      var result;
      try {
        result = await _startStatusPolling(submitBody.jobId, submitBody.pollAfterMs);
      } catch (pollError) {
        var pollMsg = String(pollError && pollError.message ? pollError.message : pollError || 'polling_error');
        if (_isDbQueueFailure(pollMsg, 500, '')) {
          await _runSyncPrepareGeneration(pollMsg, preparePayload, submitHeaders);
          if (_cancelGeneration) return;
          if (!_finalizeGenerationSuccess()) return;
          return;
        }
        throw pollError;
      }
      if (_cancelGeneration) return;

      _applyCompletedResult(result);
      if (!_pdfStartLogged) {
        _pdfStartLogged = true;
        _logLoveSecretFlow('PdfRenderStart', { mode: _currentChapterMode, reportId: _lsReportId });
      }
      if (!_finalizeGenerationSuccess()) return;
      _logLoveSecretFlow('PdfRequestSuccess', { mode: _currentChapterMode, reportId: _lsReportId });
    })().catch(function (error) {
      var msg = String(error && error.message ? error.message : error || '챕터 생성 중 오류가 발생했습니다.');
      _logLoveSecretError(error, { stage: error && error.stage || 'generate', mode: _currentChapterMode, reportId: _lsReportId, sessionId: _lsSessionId });
      _logLoveSecretFlow('Error', { mode: _currentChapterMode, message: msg, reportId: _lsReportId });
      if (_cancelGeneration) {
        _generating = false;
        _stopLoadingAnimation();
        _setLoveBookGenerationState('failed');
        return;
      }
      _generating = false;
      _stopLoadingAnimation();
      _setLoveBookGenerationState('failed');
      if (chapterMsg) {
        chapterMsg.textContent = msg;
      }
      _showLoveSecretInlineError(msg);
    });
  }

  window.downloadLoveSecretPdf = function () {
    if (!_chapters.some(Boolean)) {
      _showLoveSecretInlineError('먼저 연애 비책을 생성해 주세요.');
      return;
    }
    var storedUrl = _resolveLoveSecretStoredUrl(_lsResultPayload);
    if (storedUrl) {
      try {
        window.open(storedUrl, '_blank', 'noopener,noreferrer');
        return;
      } catch (_) {}
    }
    _showLoveSecretInlineError('리포트 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  };

  window.openLoveSecretLatestReport = function () {
    var storedUrl = _resolveLoveSecretStoredUrl(_lsResultPayload);
    if (storedUrl) {
      try {
        window.open(storedUrl, '_blank', 'noopener,noreferrer');
        return;
      } catch (_) {}
    }
    _showLoveSecretInlineError('현재 세션에서 다시 열 수 있는 연애 비책 완성본을 찾지 못했습니다. 생성이 완료된 뒤 다운로드 버튼을 이용해 주세요.');
  };

  /* ── 클릭 핸들러 (data-action 디스패치) ──────────────────── */
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var btn = target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (action === 'openLoveSecretModal')  { window.openLoveSecretModal();  return; }
    if (action === 'closeLoveSecretModal') { window.closeLoveSecretModal(); return; }
    if (action === 'generateLoveSecret')  { window.generateLoveSecret();  return; }
    if (action === 'lsStartWithPartner')  { window.lsStartWithPartner();  return; }
    if (action === 'lsSkipPartner')       { window.lsSkipPartner();       return; }
    if (action === 'downloadLoveSecretPdf') { window.downloadLoveSecretPdf(); return; }
    if (action === 'openLoveSecretLatestReport') { window.openLoveSecretLatestReport(); return; }
    if (action === 'shareLoveSecretKakao') {
      if (typeof window.shareLoveSecretKakao === 'function') window.shareLoveSecretKakao();
      return;
    }
  }, false);

  /* ESC 키로 모달 닫기 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = _qs('loveSecretModal');
      if (modal && modal.style.display !== 'none') window.closeLoveSecretModal();
    }
  });

  _refreshLoveSecretPriceLabels();

})();
