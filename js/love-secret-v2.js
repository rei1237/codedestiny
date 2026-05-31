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
        '두 사람의 사랑 구조 총론',
        '나의 연애 성향 요약',
        '상대의 연애 성향 요약',
        '일간 궁합과 기본 기질',
        '일지 궁합과 관계의 뿌리',
        '배우자성으로 보는 사랑의 기대치',
        '오행 균형으로 보는 감정 궁합',
        '조후로 보는 속궁합과 친밀감',
        '대화와 표현 궁합',
        '갈등과 화해 패턴',
        '이별과 재회 가능성',
        '결혼과 장기 관계 궁합',
        '현실 문제와 관계 유지 전략',
        '두 사람의 운 흐름과 타이밍',
        '두 사람을 위한 최종 사랑 전략'
      ],
      subtitles: [
        '궁합의 핵심 결을 한눈에 정리',
        '관계를 읽는 나의 기본 렌즈',
        '상대를 이해하는 핵심 포인트',
        '두 사람 기질의 상호작용',
        '생활 밀착 영역의 궁합 진단',
        '서로가 관계에서 바라는 기준',
        '감정 온도와 안정감의 균형',
        '정서적 밀착과 몸의 편안함',
        '말의 결이 맞는 지점과 엇갈림',
        '충돌의 구조와 회복의 방식',
        '관계 지속의 조건과 한계',
        '현실 생활로 이어질 가능성',
        '돈·일·가족·생활의 실제 조율',
        '대운·세운으로 보는 전환점',
        '관계를 이어가거나 정리할 기준'
      ],
      loading: [
        '두 사람의 사랑 구조를 총론하는 중입니다',
        '나의 연애 성향을 정리하는 중입니다',
        '상대의 연애 성향을 분석하는 중입니다',
        '두 일간 기질의 상호작용을 해석하는 중입니다',
        '일지 궁합과 관계의 뿌리를 진단하는 중입니다',
        '배우자성으로 보는 기대치를 비교하는 중입니다',
        '오행 균형과 감정 궁합을 분석하는 중입니다',
        '조후로 보는 속궁합을 집필하는 중입니다',
        '대화와 표현 궁합을 정리하는 중입니다',
        '갈등과 화해 패턴을 진단하는 중입니다',
        '이별과 재회 가능성을 분석하는 중입니다',
        '결혼과 장기 관계 궁합을 점검하는 중입니다',
        '현실 문제와 관계 전략을 구성하는 중입니다',
        '대운·세운의 운 흐름을 계산하는 중입니다',
        '두 사람의 최종 사랑 전략을 완성하는 중입니다'
      ],
      structured: {
        1: ['두 사람의 일간 관계', '일지가 만드는 기본 분위기', '오행 균형과 에너지 흐름', '이 관계의 핵심 강점', '이 관계에서 가장 조심해야 할 점'],
        2: ['나의 사랑 태도', '내가 원하는 관계의 조건', '불안할 때 보이는 반응', '나의 방어기제', '나를 더 사랑스럽게 만드는 태도'],
        3: ['상대의 사랑 태도', '상대가 원하는 관계의 조건', '상대가 멀어질 때 보이는 신호', '상대를 이해하는 핵심 포인트', '상대를 존중하는 방법'],
        4: ['두 일간이 만드는 분위기', '서로에게 자극이 되는 부분', '서로를 어렵게 느끼는 부분', '기질 차이를 조화시키는 법', '일간 궁합의 실전 적용'],
        5: ['두 사람의 일지 관계', '편안함을 느끼는 부분', '반복되는 감정 충돌', '가까워질수록 드러나는 문제', '관계의 뿌리를 안정시키는 방법'],
        6: ['내가 원하는 사랑의 기준', '상대가 원하는 사랑의 기준', '기대가 맞는 부분', '기대가 어긋나는 부분', '기대 차이를 줄이는 방법'],
        7: ['두 사람의 오행 구성', '부족한 기운을 채워주는 부분', '과한 기운이 충돌하는 부분', '감정이 뜨거워지는 순간', '감정 균형을 맞추는 방법'],
        8: ['두 사람의 명식 온도 차이', '서로에게 따뜻함을 주는 방식', '긴장과 이완이 생기는 지점', '몸과 마음의 친밀감이 맞는 부분', '속궁합을 건강하게 유지하는 법'],
        9: ['말이 잘 통하는 부분', '말이 엇갈리는 부분', '서운함을 표현하는 방식', '침묵이 생기는 이유', '관계를 살리는 대화법'],
        10: ['가장 자주 부딪히는 문제', '서로를 오해하는 지점', '감정이 폭발하는 순간', '화해가 어려워지는 이유', '갈등을 줄이는 현실적인 방법'],
        11: ['이 관계가 멀어지는 이유', '이별 후에도 마음이 남는 이유', '다시 이어질 수 있는 조건', '재회 후 반복될 수 있는 문제', '재회를 원할 때 가장 중요한 태도'],
        12: ['오래 만날수록 안정되는 부분', '결혼 후 드러날 수 있는 차이', '생활 리듬의 궁합', '책임과 역할 분담의 문제', '장기 관계로 가기 위한 조건'],
        13: ['돈과 현실 감각의 차이', '일과 사랑의 우선순위', '가족과 주변 사람의 영향', '생활 습관에서 생기는 문제', '현실 문제를 함께 해결하는 법'],
        14: ['지금 두 사람의 관계 운', '가까워지기 좋은 시기', '조심해야 할 시기', '관계가 바뀌는 전환점', '타이밍을 잘 쓰는 방법'],
        15: ['이 관계의 최종 핵심 메시지', '관계를 망치는 행동', '관계를 살리는 행동', '서로에게 꼭 필요한 태도', '앞으로의 선택을 위한 조언']
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
  var LOVE_SECRET_REQUIRED_COINS_BY_MODE = {
    solo: 300,
    compatibility: 400
  };
  var LOVE_BOOK_GENERATION_MESSAGES = {
    loading_helper: '연애 비책을 펼칠 준비를 하고 있습니다.',
    checking_payment: '결제 정보를 확인하고 있습니다.',
    payment_confirmed: '결제가 확인되었습니다. 생성 준비를 이어갑니다.',
    preparing_generation: '프로필 정보 확인 중',
    calculating_saju: '사랑의 원국을 정리하는 중입니다',
    validating_partner: '궁합 모드일 경우 상대방 사주 확인 중',
    building_chapters: '연애 패턴과 표현 방식을 정리하는 중입니다',
    writing_with_llm: '로컬 사주 해석으로 각 장의 본문을 구성하는 중입니다',
    validating_chapters: '대운과 세운의 연애 흐름을 반영하는 중입니다',
    rendering_pdf: '연애 비책 PDF를 완성하고 있습니다.',
    completed: '연애 비책 PDF가 준비되었습니다.',
    llm_failed_use_local: '저장된 리포트를 정리하고 있습니다',
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
    if (chapterEl && (key === 'loading_helper' || key === 'checking_payment' || key === 'payment_confirmed' || key === 'preparing_generation' || key === 'validating_partner' || key === 'failed' || key === 'llm_failed_use_local')) {
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
    var coins = Number(LOVE_SECRET_REQUIRED_COINS_BY_MODE[normalizedMode]);
    return Number.isFinite(coins) && coins > 0 ? coins : 300;
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
      var exp = Number(payload && payload.exp);
      var paid = Number(payload && payload.chargedCoins || 0);
      return String(payload && payload.reportType || '') === reportType
        && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000)
        && (!Number.isFinite(Number(minCoins)) || paid >= Number(minCoins));
    } catch (_) {
      return false;
    }
  }

  function _logLoveSecretFlow(stage, payload) {
    try {
      console.info('[LoveBook][' + String(stage || 'Unknown') + ']', payload || {});
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
          script.src = '/js/coin-gate-helper.js?v=20260529-love-book';
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
          mode: normalizedMode,
          reason: reason,
          reportId: reportId,
          sessionId: 'love-book:' + String(reportId || '').trim(),
          requestId: 'love-secret:' + normalizedMode + ':' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8),
          forceDeduct: true,
        },
      });
      var accessGrant = purchase && purchase.accessGrant ? purchase.accessGrant : null;
      var _issuedPremiumToken = String(purchase.premiumAccessToken || '').trim();
      var _rawPurchaseId = String(purchase.purchaseId || '').trim();
      console.info('[LoveBook] payment access', {
        featureKey: featureKey,
        hasAccessGrant: Boolean(accessGrant),
        hasPremiumToken: Boolean(_issuedPremiumToken),
        hasPurchaseId: Boolean(_rawPurchaseId),
      });
      if (!purchase || !purchase.ok) {
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
          purchaseId: _rawPurchaseId,
          sessionId: 'love-book:' + String(reportId || '').trim(),
          featureKey: featureKey,
          paidAt: new Date().toISOString(),
        };
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
      console.info('[LoveBook] helper load', { helperLoaded: false, message: String(error && error.message ? error.message : error) });
      return {
        ok: false,
        status: 500,
        message: String(error && error.message ? error.message : 'COIN_GATE_HELPER_MISSING'),
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
    if (!year || !month || !day || hourIdx < 0) return null;
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
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
      latitude: 37.6,
      longitude: 127.0,
    };
  }

  function _resolveLoveSecretStoredUrl(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    return String(data.downloadUrl || data.pdfUrl || data.htmlUrl || (((data.pdfReady || {}).downloadUrl) || ((data.pdfReady || {}).pdfUrl) || ((data.pdfReady || {}).htmlUrl) || '')).trim();
  }

  function _hasLoveSecretStoredUrl(payload) {
    return !!_resolveLoveSecretStoredUrl(payload);
  }

  function _ensureLoveSecretStoredUrlOrFail(payload) {
    if (_hasLoveSecretStoredUrl(payload)) return true;
    _generating = false;
    _stopLoadingAnimation();
    _setLoveBookGenerationState('failed');
    _setError('리포트 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
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
      '@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Gowun+Dodum&display=swap");' +
      'body{font-family:"Noto Serif KR","Gowun Dodum",serif;color:#1a0a1e;background:#fff;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#1a0010 0%,#3d0030 50%,#1a0010 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:.75rem;letter-spacing:.2em;color:#f9a8d4;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:3rem;font-weight:700;margin:0 0 12px;color:#fce7f3;letter-spacing:.05em;}' +
      '.cover-subtitle{font-size:1.1rem;color:#f472b6;margin:0 0 32px;}' +
      '.cover-name{font-size:1.7rem;color:#fde68a;margin:0 0 8px;}' +
      '.cover-info{font-size:.9rem;color:#fbb6ce;margin:0 0 10px;}' +
      '.cover-deco{font-size:1.5rem;color:#ec4899;letter-spacing:.3em;margin-top:32px;}' +
      '.toc{padding:48px 56px;page-break-after:always;}' +
      '.toc-title{font-size:1.4rem;color:#9d174d;margin-bottom:32px;border-bottom:2px solid #ec4899;padding-bottom:12px;}' +
      '.toc-item{display:flex;align-items:baseline;gap:8px;margin-bottom:16px;font-size:1rem;}' +
      '.toc-num{color:#ec4899;font-weight:700;min-width:80px;}' +
      '.toc-text{color:#4a0030;}' +
      '.chapter{padding:48px 56px;}' +
      '.chapter-header{border-bottom:1px solid #fce7f3;margin-bottom:32px;padding-bottom:24px;}' +
      '.chapter-num{font-size:.75rem;letter-spacing:.2em;color:#ec4899;text-transform:uppercase;display:block;margin-bottom:8px;}' +
      '.chapter-title{font-size:1.8rem;font-weight:700;color:#4a0030;margin:0 0 8px;}' +
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

      var timeInput = String(window.prompt('출생 시각을 입력해 주세요. (예: 14:30)', '') || '').trim();
      var parsedPromptTime = _lsParseFlexibleBirthTime(timeInput, null, null);
      if (parsedPromptTime.isUnknown || !Number.isFinite(parsedPromptTime.hour)) {
        alert('연애 비책 프리미엄 생성에는 출생 시각이 필요합니다.');
        return null;
      }
      var hour = _lsToInt(parsedPromptTime.hour, null);
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
      var ns = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(ns + '.list') || '[]');
      var curId = localStorage.getItem(ns + '.current');
      var pick = (curId && Array.isArray(list) && list.find(function (x) { return x && x.id === curId; })) || (Array.isArray(list) ? list[0] : null);
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
    var modal = _qs('loveSecretModal');
    if (!modal) return;
    var hasData = _lsAdoptBirthProfile({ allowPrompt: true });
    if (!hasData) {
      var _oLsFormEl = document.getElementById('birthDate') || document.getElementById('run-btn') || document.getElementById('loveSecretModal');
      if (_oLsFormEl) { try { _oLsFormEl.scrollIntoView({behavior:'smooth',block:'center'}); } catch(_){} }
      alert('💕 연애 비책 생성을 위해 생년월일 정보가 필요합니다. 정보 입력 후 다시 시도해 주세요.');
      return;
    }

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
      alert('공통 챕터 파이프라인을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (!_lsCurrentReportId || typeof fetchChapter !== 'function') {
      alert('현재 세션 정보가 부족해 부분 재생성을 시작할 수 없습니다. 리포트를 다시 생성한 뒤 시도해 주세요.');
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
      alert('연애 비책 부분 재생성 중 오류가 발생했습니다: ' + msg);
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

  /* ── 모듈 레벨 사주 데이터 저장 ───────────────────────────── */
  var _cachedSajuData = '';
  var _cachedSajuBase = null;

    window.generateLoveSecret = function () {
    if (_generating) return;
    // 프로필 복구: __cdActiveBirthProfile 없으면 localStorage DP에서 시도
    _lsAdoptBirthProfile({ allowPrompt: true });
    var hasData = !!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year);
    if (!hasData) { alert('생년월일 정보를 확인할 수 없어 연애 비책 생성을 시작할 수 없습니다.'); return; }
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
      return { ok: false, message: '생년월일과 출생 시간이 모두 필요합니다. 정보를 확인한 뒤 다시 시도해 주세요.' };
    }
    if (String(mode || 'solo') === 'compatibility' && !hasPartner) {
      return { ok: false, message: '궁합 모드는 상대방 생년월일과 출생 시간 입력이 필요합니다.' };
    }
    return { ok: true };
  }

  window.handleStartCompatibilityLoveBook = async function () {
    if (_generating) return;
    _currentChapterMode = 'compatibility';
    _logLoveSecretFlow('ModeResolved', { mode: 'compatibility' });
    var year = parseInt((_qs('lsPsYear') || {}).value || '0', 10);
    var month = parseInt((_qs('lsPsMonth') || {}).value || '0', 10);
    var day = parseInt((_qs('lsPsDay') || {}).value || '0', 10);
    if (!year || !month || !day) {
      var yearEl = _qs('lsPsYear');
      if (yearEl) {
        yearEl.focus();
        yearEl.style.borderColor = 'rgba(239,68,68,0.8)';
        setTimeout(function () { yearEl.style.borderColor = ''; }, 2000);
      }
      return;
    }

    var reportId = _lsBuildReportId('compatibility');
    var prePartnerBirthInput = _collectPartnerBirthInput();
    _logLoveSecretFlow('PartnerInputResolved', { hasPartnerInput: !!prePartnerBirthInput });
    var preValidation = _validateLoveBookInputBeforePayment('compatibility', prePartnerBirthInput);
    if (!preValidation.ok) {
      window.alert(preValidation.message || '입력값 확인이 필요합니다.');
      return;
    }
    _logLoveSecretFlow('BirthInputNormalized', { mode: 'compatibility', hasSelfBirth: true, hasPartnerBirth: true });

    var startBtn = _qs('lsPsStartBtn');
    if (startBtn) { startBtn.disabled = true; startBtn.textContent = '처리 중...'; }

    function _restorePartnerStartBtn() {
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = '💑 두 사람의 궁합 분석 시작하기';
      }
    }

    function _startWithPartnerData(paymentContext) {
      _restorePartnerStartBtn();
      var partnerBirthInput = _collectPartnerBirthInput();
      _logLoveSecretFlow('PartnerInputResolved', { hasPartnerInput: !!partnerBirthInput });
      _startGeneration(partnerBirthInput, paymentContext, reportId);
    }

    try {
      _logLoveSecretFlow('PaymentGateStart', { mode: 'compatibility', reportId: reportId });
      var gateResult = await _runLoveSecretCoinGate('compatibility', reportId);
      if (!gateResult.ok) {
        window.alert(gateResult.message || '결제 확인에 실패했습니다.');
        return;
      }
      _logLoveSecretFlow('PaymentGateSuccess', { mode: 'compatibility', reportId: reportId, purchaseId: gateResult.purchaseId || '' });
      _startWithPartnerData(gateResult);
    } finally {
      _restorePartnerStartBtn();
    }
  };

  window.handleStartSoloLoveBook = async function () {
    if (_generating) return;
    _currentChapterMode = 'solo';
    _logLoveSecretFlow('ModeResolved', { mode: 'solo' });
    var reportId = _lsBuildReportId('solo');
    var _soloFeatureKey = _getLoveSecretFeatureKey('solo');
    var preValidation = _validateLoveBookInputBeforePayment('solo', null);
    if (!preValidation.ok) {
      window.alert(preValidation.message || '입력값 확인이 필요합니다.');
      return;
    }
    _logLoveSecretFlow('BirthInputNormalized', { mode: 'solo', hasSelfBirth: true, hasPartnerBirth: false });
    if (_premiumTokenMatches('loveSecret', _getLoveSecretRequiredCoins('solo'))) {
      var _tokenAccessGrant = {
        ok: true,
        featureKey: _soloFeatureKey,
        sessionId: 'love-book:' + reportId,
        purchaseId: 'token:' + reportId,
        reportId: reportId,
        paidAt: new Date().toISOString()
      };
      _startGeneration(null, { ok: true, accessGrant: _tokenAccessGrant, purchaseId: 'token:' + reportId, premiumAccessToken: '' }, reportId);
      return;
    }
    _logLoveSecretFlow('PaymentGateStart', { mode: 'solo', reportId: reportId });
    var gateResult = await _runLoveSecretCoinGate('solo', reportId);
    if (!gateResult.ok) {
      window.alert(gateResult.message || '결제 확인에 실패했습니다.');
      return;
    }
    _logLoveSecretFlow('PaymentGateSuccess', { mode: 'solo', reportId: reportId, purchaseId: gateResult.purchaseId || '' });
    _startGeneration(null, gateResult, reportId);
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
    _setLoveBookGenerationState('preparing_generation');
    _showScreen('lsLoadingScreen');
    _prepareLoveSecretUi(_currentChapterMode);
    _startLoadingAnimation();
    var birthInput = _buildLoveSecretBirthInputFromProfile(window.__cdActiveBirthProfile || {}, '사용자');
    if (!birthInput) {
      _generating = false;
      _stopLoadingAnimation();
      _setLoveBookGenerationState('failed');
      alert('생년월일과 출생 시간이 모두 필요합니다. 정보를 확인한 뒤 다시 시도해 주세요.');
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

    function _buildLocalFallbackContext(partnerRaw) {
      var dominant = (((sajuBase || {}).elementBalance || {}).dominant || '') || '균형';
      var deficient = (((sajuBase || {}).elementBalance || {}).deficient || '') || '없음';
      var dayMaster = (((sajuBase || {}).core || {}).dayMaster || '') || '일간 미상';
      var strengthLabel = (((sajuBase || {}).strength || {}).label || '') || '중립';
      var useful = ((((sajuBase || {}).yongshin || {}).usefulElements) || []).slice(0, 3);
      var partnerHint = String(partnerRaw || '').trim();
      var isCompat = _currentChapterMode === 'compatibility';
      return {
        dominant: String(dominant),
        deficient: String(deficient),
        dayMaster: String(dayMaster),
        strengthLabel: String(strengthLabel),
        useful: useful.length ? useful.join(', ') : '용신 정보 없음',
        partnerHint: partnerHint,
        relationFocus: isCompat
          ? '두 사람의 상호작용과 감정 리듬'
          : '사용자 단독 연애 패턴과 실행 전략',
      };
    }

    function _buildLocalFallbackSectionBody(chapterNo, label, reason, context) {
      var p1 = label + '는 현재 관계에서 무엇을 지켜야 하는지 분명하게 알려주는 항목입니다. 감정이 커질수록 기준이 흐려지기 쉬우므로, 이 구간에서는 마음의 크기보다 관계의 방향을 먼저 점검해야 합니다. 서둘러 결론을 내리기보다 지금의 말투와 반응이 신뢰를 쌓는 방향인지 확인하면 관계 피로를 크게 줄일 수 있습니다.';
      var p2 = '일간 ' + context.dayMaster + '과 강도 ' + context.strengthLabel + ' 흐름에서는 표현의 선명함이 장점으로 작동합니다. 다만 우세 오행 ' + context.dominant + '이 과열되면 상대를 이해하기보다 판단하려는 태도가 커질 수 있고, 부족한 ' + context.deficient + ' 기운이 약할 때는 감정 완충이 늦어질 수 있습니다. 보완 포인트인 ' + context.useful + ' 성향을 생활 루틴에 반영하면 관계 안정성이 올라갑니다.';
      var p3 = '관계가 잘 풀릴 때는 서로의 기준을 숨기지 않고도 편안하게 대화가 이어집니다. 이때는 상대를 바꾸려 하기보다 나의 말의 온도와 순서를 조정하는 것만으로도 매력이 선명해집니다. 특히 작은 약속을 지키는 반복은 신뢰를 빠르게 올리고, 장기적으로 결혼과 생활의 현실 궁합까지 탄탄하게 만드는 힘이 됩니다.';
      var p4 = '흔들릴 때는 침묵으로 버티거나 단정적인 말로 관계를 밀어내기 쉬우므로, 먼저 감정을 한 문장으로 확인하고 그다음 요구를 말하는 순서를 지켜야 합니다. 오늘은 대화 하나를 짧게라도 마무리하고, 내일은 고쳐야 할 습관 한 가지를 기록해 실천해 보세요. 이 작은 반복이 사랑을 오래 지키는 가장 현실적인 전략이 됩니다.';
      if (context.partnerHint && _currentChapterMode === 'compatibility') {
        p4 += ' 두 사람의 속도 차이가 느껴질수록 결론을 늦추고 합의 문장을 먼저 만드는 방식이 관계를 지키는 데 유리합니다.';
      }
      return [p1, p2, p3, p4].join('\n\n');
    }

    function _buildLocalFallbackChapter(idx, reason, partnerRaw) {
      var chapterNo = idx + 1;
      var labels = _getLoveSecretStructuredLabels(chapterNo, _currentChapterMode);
      if (!Array.isArray(labels) || !labels.length) {
        labels = ['핵심 진단', '감정 흐름', '리스크', '실행 전략', '체크포인트'];
      }
      var context = _buildLocalFallbackContext(partnerRaw);
      var sections = labels.map(function (label) {
        return {
          title: String(label),
          body: _buildLocalFallbackSectionBody(chapterNo, String(label), reason, context),
        };
      });
      var text = sections.map(function (row) {
        return '## ' + row.title + '\n' + row.body;
      }).join('\n\n');

      return {
        title: _getLoveSecretChapterTitle(idx, _currentChapterMode),
        subtitle: _getLoveSecretChapterSubtitle(idx, _currentChapterMode),
        text: text,
        sections: sections,
      };
    }

    function _fillLocalFallbackChapters(reason, partnerRaw, forceAll) {
      for (var i = 0; i < totalChapters; i++) {
        if (!forceAll && (_chapters[i] || _chapterStructured[i])) continue;
        var localChapter = _buildLocalFallbackChapter(i, reason, partnerRaw);
        _chapterMeta[i] = {
          title: String(localChapter.title || _getLoveSecretChapterTitle(i, _currentChapterMode)),
          subtitle: String(localChapter.subtitle || _getLoveSecretChapterSubtitle(i, _currentChapterMode)),
          isSkeleton: true,
        };
        _chapters[i] = String(localChapter.text || '').trim();
        _chapterStructured[i] = { sections: localChapter.sections || [] };
      }
      _setProgress(totalChapters);
      _logLoveSecretFlow('LOCAL_FALLBACK_RENDERED', {
        mode: _currentChapterMode,
        reportId: _lsCurrentReportId,
        reason: String(reason || 'unknown'),
      });
    }

    var _lsReportId = _lsCurrentReportId;
    var _lsFeatureKey = _getLoveSecretFeatureKey(_currentChapterMode);
    var _lsSessionId = String((_lsAccessGrant && _lsAccessGrant.sessionId) || ('love-book:' + _lsReportId)).trim();

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
            _done({ ok: false, message: _lastMsg || '모든 API 엔드포인트 시도에 실패했습니다.' });
            return;
          }

          var _plan = _attemptPlan[at];
          var _controller = (typeof AbortController === 'function') ? new AbortController() : null;
          if (_controller) _activeRequestController = _controller;
          var _lsPremiumToken = _lsReadPremiumAccessToken();
          var _lsHeaders = { 'Content-Type': 'application/json' };
          if (_lsPremiumToken) _lsHeaders['x-premium-access-token'] = _lsPremiumToken;
          _setLoveBookGenerationState('writing_with_llm');
          if (!_llmStartLogged) {
            _llmStartLogged = true;
            _logLoveSecretFlow('LocalChapterBuildStart', { mode: _currentChapterMode, reportId: _lsReportId });
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
            body: JSON.stringify({
              reportId: _lsReportId,
              requestId: _gateRequestId || _chapterRequestId,
              chapterRequestId: _chapterRequestId,
              sessionId: _lsSessionId,
              reportSessionId: _lsSessionId,
              chapterSessionId: 'love-secret-chapter-' + (idx + 1),
              chapter: idx + 1,
              mode: _currentChapterMode,
              featureKey: _lsFeatureKey,
              purchaseId: _purchaseId || undefined,
              strictNoFallback: false,
              chapterTitle: _getLoveSecretChapterTitle(idx, _currentChapterMode),
              chapterSubtitle: _getLoveSecretChapterSubtitle(idx, _currentChapterMode),
              chapterSpecificSections: Array.isArray(_getLoveSecretStructuredLabels(idx + 1, _currentChapterMode))
                ? _getLoveSecretStructuredLabels(idx + 1, _currentChapterMode).slice(0, 8)
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
            }),
            signal: _controller ? _controller.signal : undefined,
          })
            .then(function (res) {
              if (!res.ok) {
                return res.json().catch(function () { return {}; }).then(function (e) {
                  return { ok: false, message: (e && e.message) || ('HTTP ' + res.status) };
                });
              }
              return res.json().catch(function () { return { ok: false, message: 'JSON 파싱 오류' }; });
            })
            .then(function (data) {
              clearTimeout(timeoutId);
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
      if (payload && (payload.manuscriptSource === 'local-only' || payload.fallbackUsed)) {
        _setLoveBookGenerationState('llm_failed_use_local');
        _logLoveSecretFlow('LocalOnlyResultReady', {
          mode: _currentChapterMode,
          manuscriptSource: String(payload.manuscriptSource || 'local-only'),
          fallbackUsed: !!payload.fallbackUsed,
        });
      }
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
                throw new Error((pack.body && pack.body.message) || ('HTTP ' + pack.status));
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
                reject(new Error(String(body.errorMessage || body.message || '연애 비책 생성에 실패했습니다.')));
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
        return;
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
    }

    async function _runDirectChapterGeneration(reason) {
      _logLoveSecretFlow('ASYNC_TO_DIRECT_FALLBACK', {
        mode: _currentChapterMode,
        reportId: _lsReportId,
        reason: String(reason || ''),
      });
      if (chapterMsg) {
        chapterMsg.textContent = '서버 대기열 상태가 불안정하여 직접 챕터 생성으로 전환합니다...';
      }
      _setLoveBookGenerationState('writing_with_llm');

      for (var i = 0; i < totalChapters; i++) {
        if (_cancelGeneration) {
          throw new Error('사용자가 생성을 중단했습니다.');
        }
        try {
          var data = await _fetchChapter(i);
          if (!data || !data.ok) {
            var chapterReason = (data && data.message) || ('Chapter ' + (i + 1) + ' 생성 실패');
            var localFallback = _buildLocalFallbackChapter(i, chapterReason, partnerBirthInput ? _collectPartnerScreenData() : '');
            _chapterMeta[i] = {
              title: String(localFallback.title),
              subtitle: String(localFallback.subtitle),
              isSkeleton: true,
            };
            _chapters[i] = String(localFallback.text || '').trim();
            _chapterStructured[i] = { sections: localFallback.sections || [] };
          } else {
            _syncChapterMetaFromResponse(i, data);
            _chapters[i] = String(data.text || '').trim();
            _chapterStructured[i] = (Array.isArray(data.sections) && data.sections.length)
              ? { sections: data.sections }
              : (data.chapterJson && typeof data.chapterJson === 'object' ? data.chapterJson : null);
          }
        } catch (chapterError) {
          var chapterMsg = String(chapterError && chapterError.message ? chapterError.message : chapterError || ('Chapter ' + (i + 1) + ' 생성 실패'));
          var localChapter = _buildLocalFallbackChapter(i, chapterMsg, partnerBirthInput ? _collectPartnerScreenData() : '');
          _chapterMeta[i] = {
            title: String(localChapter.title),
            subtitle: String(localChapter.subtitle),
            isSkeleton: true,
          };
          _chapters[i] = String(localChapter.text || '').trim();
          _chapterStructured[i] = { sections: localChapter.sections || [] };
        }
        _setProgress(i + 1);
      }
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
      };

      _setLoveBookGenerationState('building_chapters');
      _logLoveSecretFlow('SessionCreateStart', { mode: _currentChapterMode, reportId: _lsReportId, sessionId: _lsSessionId, flow: 'sync-prepare' });
      var syncPrepareRes = await fetch('/api/love-secret/prepare', {
        method: 'POST',
        credentials: 'include',
        headers: submitHeaders,
        body: JSON.stringify(preparePayload),
      });
      var syncPrepareBody = await syncPrepareRes.json().catch(function () { return {}; });
      if (syncPrepareRes.ok && syncPrepareBody && syncPrepareBody.ok && Array.isArray(syncPrepareBody.chapters) && _hasLoveSecretStoredUrl(syncPrepareBody)) {
        _logLoveSecretFlow('SessionCreateSuccess', {
          mode: _currentChapterMode,
          reportId: _lsReportId,
          sessionId: _lsSessionId,
          flow: 'sync-prepare',
        });
        _applyCompletedResult(syncPrepareBody);
        if (_cancelGeneration) return;
        _setLoveBookGenerationState('completed');
        _finalizeGenerationSuccess();
        _logLoveSecretFlow('PdfRequestSuccess', { mode: _currentChapterMode, reportId: _lsReportId, flow: 'sync-prepare' });
        return;
      }

      _setLoveBookGenerationState('building_chapters');
      _logLoveSecretFlow('SessionCreateStart', { mode: _currentChapterMode, reportId: _lsReportId, sessionId: _lsSessionId });
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
        _finalizeGenerationSuccess();
        return;
      }
      if (!submitRes.ok || !submitBody || !submitBody.ok || !submitBody.jobId) {
        var submitMsg = (submitBody && submitBody.message) || ('HTTP ' + submitRes.status);
        if (_isDbQueueFailure(submitMsg, submitRes.status, submitBody && submitBody.code)) {
          await _runDirectChapterGeneration(submitMsg);
          if (_cancelGeneration) return;
          _finalizeGenerationSuccess();
          return;
        }
        throw new Error(submitMsg);
      }

      _logLoveSecretFlow('SessionCreateSuccess', {
        mode: _currentChapterMode,
        reportId: _lsReportId,
        sessionId: _lsSessionId,
        jobId: String(submitBody.jobId || ''),
      });

      _setLoveBookGenerationState('writing_with_llm');
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
          await _runDirectChapterGeneration(pollMsg);
          if (_cancelGeneration) return;
          _finalizeGenerationSuccess();
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
      _finalizeGenerationSuccess();
      _logLoveSecretFlow('PdfRequestSuccess', { mode: _currentChapterMode, reportId: _lsReportId });
    })().catch(function (error) {
      var msg = String(error && error.message ? error.message : error || '챕터 생성 중 오류가 발생했습니다.');
      _logLoveSecretFlow('Error', { mode: _currentChapterMode, message: msg, reportId: _lsReportId });
      if (_cancelGeneration) {
        _generating = false;
        _stopLoadingAnimation();
        _setLoveBookGenerationState('failed');
        return;
      }
      _fillLocalFallbackChapters(msg, partnerBirthInput ? _collectPartnerScreenData() : '', true);
      _setLoveBookGenerationState('llm_failed_use_local');
      _logLoveSecretFlow('LocalOnlyResultReady', { mode: _currentChapterMode, message: msg });
      _finalizeGenerationSuccess();
      _logLoveSecretFlow('PdfRequestSuccess', { mode: _currentChapterMode, reportId: _lsReportId, fallback: true });
    });
  }

  window.downloadLoveSecretPdf = function () {
    if (!_chapters.some(Boolean)) { alert('먼저 연애 비책을 생성해 주세요.'); return; }
    var storedUrl = _resolveLoveSecretStoredUrl(_lsResultPayload);
    if (storedUrl) {
      try {
        window.open(storedUrl, '_blank', 'noopener,noreferrer');
        return;
      } catch (_) {}
    }
    alert('리포트 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
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

})();
