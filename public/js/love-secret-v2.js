/**
 * 연애 비책 v2 — 운명의 설계도
 * 사주 기반 AI 연애 전략 canonical 리포트 + PDF 다운로드
 * CODE-DESTINY Premium
 */
(function () {
  'use strict';

  var LOVE_SECRET_CHAPTER_META = {
    solo: {
      titles: [
        '💘 본연의 연애 자아',
        '🌹 치명적 매력과 페로몬',
        '🧲 운명의 상대방 리포트',
        '🧩 연애 실패 패턴',
        '🫀 감정 중독 구조',
        '🛟 관계 회복력',
        '🏡 결혼 운과 장기 연애',
        '⚠️ 위험한 사랑 패턴',
        '🔥 현실 연애 전략',
        '🗝️ 최종 연애 로드맵'
      ],
      subtitles: [
        '일간·월지·오행·십성으로 보는 사랑의 기본 구조',
        '도화·홍염·화개와 표현 매력의 실제 힘',
        '배우자성·이성운·인연 유형으로 보는 이상형과 경계 대상',
        '반복되는 연애 붕괴 패턴과 실패 원인 추적',
        '감정 과몰입, 집착, 불안의 중독 구조 해석',
        '관계가 흔들릴 때 회복하는 정서 탄성 분석',
        '배우자궁과 장기 관계 적합도로 보는 결혼 지속력',
        '위험 인연, 금지 패턴, 경계해야 할 사랑의 구조',
        '현실적인 연애 운영법과 행동 전략 정리',
        '지금부터 실행할 최종 연애 로드맵'
      ],
      loading: [
        '사주 속 연애 자아의 기본 구조를 분석하는 중...',
        '도화·홍염·화개의 매력 코드를 해석하는 중...',
        '운명의 상대방 패턴을 프로파일링하는 중...',
        '연애 실패 패턴을 추적하는 중...',
        '감정 중독 구조를 분석하는 중...',
        '관계 회복력을 계산하는 중...',
        '결혼 운과 장기 연애 조건을 정리하는 중...',
        '위험한 사랑 패턴을 경고하는 중...',
        '현실 연애 전략을 구성하는 중...',
        '최종 연애 로드맵을 완성하는 중...'
      ],
      structured: {
        1: ['연애 자아 진단', '감정 작동 방식', '핵심 욕구', '강점 포인트', '주의 신호'],
        2: ['매력 코드', '도화·홍염·화개', '끌림 포인트', '매력 활용법', '금기 요소'],
        3: ['이상형 분석', '위험한 상대', '오래 갈 인연', '반복 인연 패턴', '회피 기준'],
        4: ['붕괴 패턴', '반복 실수', '이별 트리거', '감정 후폭풍', '패턴 전환법'],
        5: ['감정 집착', '중독 신호', '불안의 원인', '자기 소진', '회복 기준'],
        6: ['회복 탄성', '갈등 복구', '재접속 방식', '신뢰 회복', '정서 복원력'],
        7: ['결혼 태도', '장기 안정성', '현실 조건', '배우자궁 신호', '장기 전략'],
        8: ['위험 인연', '금지 패턴', '경고 신호', '반복 중독', '차단 기준'],
        9: ['현실 전략', '고백·대화', '거리 조절', '관계 운영', '실행 규칙'],
        10: ['최종 요약', '핵심 매력', '반복 약점', '행동 우선순위', '연애 로드맵']
      }
    },
    compatibility: {
      titles: [
        'Ch.1 두 사람의 인연 구조',
        'Ch.2 감정 궁합',
        'Ch.3 애정 표현 충돌',
        'Ch.4 성적/스킨십 궁합',
        'Ch.5 싸움 패턴',
        'Ch.6 이별 위기 구조',
        'Ch.7 재회 가능성',
        'Ch.8 결혼 궁합',
        'Ch.9 현실 생활 궁합',
        'Ch.10 관계 유지 전략',
        'Ch.11 karmic 관계 분석',
        'Ch.12 최종 궁합 총론'
      ],
      subtitles: [
        '두 사람을 엮는 인연의 기본 골격과 결속 구조',
        '감정 리듬, 애착 속도, 정서 공명도 분석',
        '애정 표현 방식 충돌과 오해 발생 지점',
        '신체적 친밀감과 스킨십 온도차 해석',
        '싸움이 커지는 구조와 방어 패턴',
        '관계가 깨지기 쉬운 위기 구조와 경고 신호',
        '재회 가능성과 다시 붙는 조건 분석',
        '결혼과 장기 제도권 관계 적합도',
        '현실 루틴, 생활 방식, 책임 분배 적합도',
        '관계를 오래 지키는 운영 전략',
        '업보적 연결과 karmic 반복 구조 분석',
        '전체 궁합을 묶는 최종 총론'
      ],
      loading: [
        '두 사람의 원국 구조를 비교하는 중...',
        '끌림의 핵심 신호를 해석하는 중...',
        '감정 온도차를 분석하는 중...',
        '대화와 오해 패턴을 정리하는 중...',
        '현실 생활 궁합을 점검하는 중...',
        '장기 안정 조건을 계산하는 중...',
        '갈등 패턴을 진단하는 중...',
        '재회·이별 시그널을 해석하는 중...',
        '관계 성장 포인트를 정리하는 중...',
        '타이밍 전략을 계산하는 중...',
        '90일 실행 플랜을 작성하는 중...',
        '최종 궁합 로드맵을 완성하는 중...'
      ],
      structured: {
        1: ['원국 요약', '각자의 연애 자아', '핵심 차이', '관계 기본축', '총론'],
        2: ['끌림 포인트', '상호 매력 구조', '강한 유인', '불안 스위치', '안정 장치'],
        3: ['감정 리듬', '애착 온도차', '속도 차이', '오해 포인트', '조율 전략'],
        4: ['소통 습관', '오해 구조', '갈등 언어', '대화 회복', '실행 규칙'],
        5: ['생활 루틴', '현실 역할', '책임 분배', '돈·생활 조건', '적합도'],
        6: ['장기 유지 조건', '신뢰 구조', '안정 장치', '경계선', '장기 전략'],
        7: ['갈등 트리거', '방어 반응', '반복 상처', '폭발 지점', '복구 루틴'],
        8: ['거리감 신호', '이별 위험', '재회 가능성', '되돌림 조건', '판단 기준'],
        9: ['성장 지점', '서로의 배움', '협력 구조', '보완 포인트', '관계 확장'],
        10: ['대운 흐름', '세운 변화', '좋은 타이밍', '주의 타이밍', '시기 전략'],
        11: ['첫 30일', '다음 30일', '마지막 30일', '갈등 완화', '신뢰 회복'],
        12: ['핵심 장점', '핵심 위험', '유지 전략', '정리 기준', '최종 로드맵']
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
    if (document.getElementById('cd-love-secret-inline-style')) return;
    var style = document.createElement('style');
    style.id = 'cd-love-secret-inline-style';
    style.textContent = '' +
      '.ls-modal{position:fixed;inset:0;z-index:100080;display:none;align-items:center;justify-content:center;padding:clamp(10px,2vw,22px);background:rgba(13,8,21,.7);backdrop-filter:blur(8px)}' +
      '.ls-modal__overlay{position:absolute;inset:0}' +
      '.ls-modal__panel{position:relative;width:min(1100px,96vw);max-height:94vh;overflow:auto;border-radius:24px;border:1px solid rgba(251,113,133,.28);background:radial-gradient(130% 140% at 0% 0%,rgba(253,164,175,.2),transparent 44%),radial-gradient(120% 130% at 100% 100%,rgba(196,181,253,.16),transparent 46%),linear-gradient(160deg,#fff7fb,#fff2f8 50%,#ffeef5);box-shadow:0 26px 84px rgba(60,10,30,.35)}' +
      '.ls-modal__header{position:sticky;top:0;z-index:3;padding:16px 20px 14px;border-bottom:1px solid rgba(236,72,153,.18);background:linear-gradient(180deg,rgba(255,248,252,.96),rgba(255,248,252,.86));backdrop-filter:blur(4px)}' +
      '.ls-modal__header-deco{display:flex;gap:10px;align-items:center;justify-content:center;color:#db2777;font-size:12px;opacity:.9}' +
      '.ls-header-line{height:1px;flex:0 0 52px;background:linear-gradient(90deg,transparent,#f9a8d4,transparent)}' +
      '.ls-modal__badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;border:1px solid rgba(244,114,182,.26);font-size:11px;font-weight:700;letter-spacing:.08em;color:#9d174d;background:rgba(255,255,255,.7)}' +
      '.ls-modal__title{margin:8px 0 4px;text-align:center;font-size:clamp(1.35rem,2.5vw,1.86rem);color:#831843}' +
      '.ls-modal__subtitle{margin:0;text-align:center;font-size:.94rem;color:#9f1239}' +
      '.ls-modal__close{position:absolute;right:14px;top:12px;border:1px solid rgba(236,72,153,.32);background:#fff;color:#be185d;border-radius:999px;width:34px;height:34px;cursor:pointer}' +
      '.ls-start-screen,.ls-pscreen,.ls-loading-screen,.ls-result-screen,.ls-error-screen{padding:18px 20px 20px}' +
      '.ls-preview-chapters{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin:14px 0 16px}' +
      '.ls-chapter-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid rgba(244,114,182,.22)}' +
      '.ls-ch-num{display:inline-flex;min-width:30px;justify-content:center;padding:3px 6px;border-radius:999px;background:#fce7f3;color:#9d174d;font-weight:700;font-size:.75rem}' +
      '.ls-ch-title{font-size:.9rem;line-height:1.45;color:#4a044e}' +
      '.ls-marketing-hero,.ls-why-section,.ls-recommend-section,.ls-start-desc,.ls-start-warning,.ls-pscreen__header,.ls-pscreen__preview,.ls-pscreen__form,.ls-load-quote,.ls-load-current,.ls-result-header,.ls-chapter-wrap{background:#fff;border:1px solid rgba(244,114,182,.18);border-radius:14px}' +
      '.ls-marketing-hero,.ls-start-desc,.ls-start-warning,.ls-recommend-section,.ls-pscreen__header,.ls-pscreen__preview,.ls-pscreen__form,.ls-load-quote,.ls-load-current,.ls-result-header,.ls-chapter-wrap{padding:14px 16px}' +
      '.ls-trust-badges,.ls-why-section,.ls-recommend-list,.ls-pscreen__gender,.ls-pscreen__actions,.ls-result-actions,.ls-epilogue-actions{display:flex;flex-wrap:wrap;gap:8px}' +
      '.ls-trust-badge,.ls-pscreen__coin-tag,.ls-load-pill,.ls-toc-item{padding:6px 9px;border-radius:10px;border:1px solid rgba(244,114,182,.24);background:#fff6fb;color:#9d174d;font-weight:600;font-size:.8rem}' +
      '.ls-btn-generate,.ls-btn-retry,.ls-pscreen__btn-start,.ls-pscreen__btn-solo,.ls-btn-pdf,.ls-btn-kakao{border:1px solid rgba(219,39,119,.35);border-radius:12px;padding:11px 14px;font-weight:700;cursor:pointer}' +
      '.ls-btn-generate,.ls-pscreen__btn-start,.ls-btn-pdf{background:linear-gradient(135deg,#ec4899,#be185d);color:#fff}' +
      '.ls-btn-retry,.ls-pscreen__btn-solo,.ls-btn-kakao{background:#fff;color:#9d174d}' +
      '.ls-loading-screen{text-align:center}' +
      '.ls-load-bg{position:relative;min-height:80px;overflow:hidden;border-radius:14px}' +
      '.ls-loading-title{margin:12px 0 8px;color:#831843;font-weight:700}' +
      '.ls-loading-chapter{margin:6px 0 0;color:#9f1239}' +
      '.ls-loading-progress{width:100%;height:10px;background:#ffe4ef;border-radius:999px;overflow:hidden;margin-top:12px}' +
      '.ls-progress-bar{height:100%;width:0;background:linear-gradient(90deg,#f472b6,#ec4899,#be185d);transition:width .25s ease}' +
      '.ls-progress-text{margin-top:8px;color:#9f1239;font-size:.86rem}' +
      '.ls-load-pills{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:12px}' +
      '.ls-load-pill.active{background:#fbcfe8;color:#831843;border-color:#f472b6}' +
      '.ls-load-pill.done{background:#ec4899;color:#fff;border-color:#be185d}' +
      '.ls-result-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}' +
      '.ls-result-label{margin:0 0 4px;color:#9d174d;font-size:.84rem}' +
      '.ls-result-name{margin:0;color:#831843;font-size:1.2rem}' +
      '.ls-result-date{margin:4px 0 0;color:#6b214a;font-size:.86rem}' +
      '.ls-toc{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}' +
      '.ls-toc-item.active{background:#ec4899;color:#fff;border-color:#be185d}' +
      '.ls-toc-item.loaded{box-shadow:0 0 0 2px rgba(236,72,153,.14) inset}' +
      '.ls-chapter-content{min-height:220px}' +
      '.ls-chapter-num{display:inline-block;padding:4px 8px;border-radius:999px;background:#fce7f3;color:#9d174d;font-size:.76rem;font-weight:700}' +
      '.ls-chapter-title{margin:10px 0 6px;color:#831843}' +
      '.ls-chapter-sub{margin:0;color:#9f1239}' +
      '.ls-chapter-body{margin-top:12px;color:#3f1d36;line-height:1.85}' +
      '.ls-error-screen{text-align:center}' +
      '.ls-error-icon{font-size:2rem}' +
      '.ls-error-msg{color:#9f1239}' +
      '.ls-load-heart{position:absolute;bottom:-22px;animation:lsFloatUp linear forwards}' +
      '.ls-fade{opacity:.3;transition:opacity .35s ease}' +
      '@keyframes lsFloatUp{to{transform:translateY(-180px);opacity:0}}' +
      '@media (max-width:720px){.ls-modal{padding:8px}.ls-modal__panel{width:100%;max-height:96vh;border-radius:16px}.ls-modal__header{padding:14px 12px}.ls-start-screen,.ls-pscreen,.ls-loading-screen,.ls-result-screen,.ls-error-screen{padding:14px 12px 16px}.ls-preview-chapters{grid-template-columns:1fr}.ls-result-header{flex-direction:column}.ls-result-actions{width:100%}.ls-result-actions button{flex:1}}';
    document.head.appendChild(style);
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
    return String((chapterSet.titles || [])[idx] || ('Chapter ' + (idx + 1)));
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
    var numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
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
  var _lsFetchChapterForPartialRegenerate = null;
  var _lsJobStateKey = 'cd:premium-job:love-secret';
  var LOVE_SECRET_FEATURE_KEY = 'saju_love_book_pdf';
  var LOVE_SECRET_INTERNAL_FEATURE_TYPE = 'saju_love_secret';
  var LOVE_SECRET_REASON_BY_MODE = {
    solo: '사주 프리미엄 연애운 리포트 생성',
    compatibility: '사주 프리미엄 궁합 리포트 생성'
  };
  var LOVE_BOOK_GENERATION_MESSAGES = {
    loading_helper: '연애 비책을 펼칠 준비를 하고 있습니다.',
    checking_payment: '결제 정보를 확인하고 있습니다.',
    payment_confirmed: '결제가 확인되었습니다. 생성 준비를 이어갑니다.',
    preparing_generation: '연애 비책 생성 세션을 준비하고 있습니다.',
    calculating_saju: '사주 속 연애 구조를 분석하고 있습니다.',
    building_chapters: '연애 챕터를 구성하고 있습니다.',
    writing_with_llm: '각 카테고리의 상담문을 작성하고 있습니다.',
    validating_chapters: '결과가 빠짐없이 작성되었는지 검증하고 있습니다.',
    rendering_pdf: '연애 비책 PDF를 완성하고 있습니다.',
    completed: '연애 비책 PDF가 준비되었습니다.',
    failed: '연애 비책 생성이 중단되었습니다.'
  };

  function _setLoveBookGenerationState(stateKey) {
    var key = String(stateKey || '').trim();
    var message = String(LOVE_BOOK_GENERATION_MESSAGES[key] || '').trim();
    if (!message) return;
    _logLoveSecretFlow('STATE_' + key.toUpperCase(), { state: key, message: message, reportId: _lsCurrentReportId || '' });
    var titleEl = _qs('lsLoadingTitle');
    var chapterEl = _qs('lsLoadingChapter');
    if (titleEl) titleEl.textContent = message;
    if (chapterEl && (key === 'loading_helper' || key === 'checking_payment' || key === 'payment_confirmed' || key === 'preparing_generation' || key === 'failed')) {
      chapterEl.textContent = message;
    }
  }

  function _lsBuildReportId(mode) {
    var suffix = _normalizeLoveSecretMode(mode) === 'compatibility' ? 'compatibility' : 'solo';
    return 'love_secret_' + suffix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
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
        featureKey: LOVE_SECRET_FEATURE_KEY,
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
      console.info('[SajuLoveBook][Flow] ' + String(stage || 'UNKNOWN'), payload || {});
    } catch (_) {}
  }

  async function _getLoveBookCoinGateHelper() {
    _setLoveBookGenerationState('loading_helper');
    var mod = await import('/js/coin-gate-helper.js?v=20260528-love-book');
    if (!mod || !mod.coinGateHelper) {
      throw new Error('COIN_GATE_HELPER_MISSING');
    }
    console.info('[LoveBook] helper load', { helperLoaded: true });
    return mod.coinGateHelper;
  }

  async function _runLoveSecretCoinGate(mode, reportId) {
    var normalizedMode = _normalizeLoveSecretMode(mode);
    var reason = LOVE_SECRET_REASON_BY_MODE[normalizedMode] || LOVE_SECRET_REASON_BY_MODE.solo;
    _setLoveBookGenerationState('checking_payment');
    try {
      var helper = await _getLoveBookCoinGateHelper();
      var purchase = await helper.purchaseFeature({
        featureKey: LOVE_SECRET_FEATURE_KEY,
        payload: {
          featureKey: LOVE_SECRET_FEATURE_KEY,
          mode: normalizedMode,
          reason: reason,
          reportId: reportId,
          sessionId: 'love-book:' + String(reportId || '').trim(),
          requestId: 'love-secret:' + normalizedMode + ':' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8),
          forceDeduct: true,
        },
      });
      var accessGrant = purchase && purchase.accessGrant ? purchase.accessGrant : null;
      console.info('[LoveBook] payment access', {
        featureKey: LOVE_SECRET_FEATURE_KEY,
        hasAccessGrant: Boolean(accessGrant),
      });
      if (!purchase || !purchase.ok || !accessGrant) {
        return {
          ok: false,
          status: Number((purchase && purchase.status) || 500),
          message: String((purchase && purchase.message) || '결제 확인에 실패했습니다.'),
          accessGrant: null,
          purchaseId: '',
          premiumAccessToken: String((purchase && purchase.premiumAccessToken) || '').trim(),
        };
      }
      _setLoveBookGenerationState('payment_confirmed');
      return {
        ok: true,
        status: Number(purchase.status || 200),
        message: String(purchase.message || ''),
        accessGrant: accessGrant,
        purchaseId: String(accessGrant.purchaseId || '').trim(),
        premiumAccessToken: String(purchase.premiumAccessToken || '').trim(),
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

  function _lsNormalizeProfile(raw) {
    if (!raw || typeof raw !== 'object') return null;

    var birth = raw.birth || {};
    if (!birth || typeof birth !== 'object') {
      birth = {
        year: raw.birthYear,
        month: raw.birthMonth,
        day: raw.birthDay,
        hour: raw.birthHour,
        minute: raw.birthMinute,
        calType: raw.calType
      };
      if ((!birth.year || !birth.month || !birth.day) && typeof raw.birthDate === 'string') {
        var parts = raw.birthDate.trim().split(/[-/]/);
        if (parts.length >= 3) {
          birth.year = birth.year || _lsToInt(parts[0], null);
          birth.month = birth.month || _lsToInt(parts[1], null);
          birth.day = birth.day || _lsToInt(parts[2], null);
        }
      }
      if ((birth.hour == null || birth.minute == null) && typeof raw.birthTime === 'string') {
        var tparts = raw.birthTime.trim().split(':');
        if (tparts.length >= 2) {
          if (birth.hour == null) birth.hour = _lsToInt(tparts[0], 12);
          if (birth.minute == null) birth.minute = _lsToInt(tparts[1], 0);
        }
      }
    }

    var year = _lsToInt(birth.year, 0);
    var month = _lsToInt(birth.month, 0);
    var day = _lsToInt(birth.day, 0);
    if (!year || !month || !day) return null;

    var hour = _lsToInt(birth.hour, 12);
    var minute = _lsToInt(birth.minute, 0);
    hour = Math.max(0, Math.min(23, hour));
    minute = Math.max(0, Math.min(59, minute));

    var location = raw.location || {};
    var lng = Number(location.lng);
    var lat = Number(location.lat);
    var tzOffset = Number(location.baseTzOffset || location.tzOffset);

    return {
      name: String(raw.name || raw.username || raw.displayName || '사용자').trim() || '사용자',
      gender: String(raw.gender || 'F').trim().toUpperCase() === 'M' ? 'M' : 'F',
      birth: {
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        calType: birth.calType || 'solar'
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

      var timeInput = String(window.prompt('출생 시각을 입력해 주세요. (예: 14:30, 모르면 12:00)', '12:00') || '').trim() || '12:00';
      var tParts = timeInput.split(':');
      var hour = _lsToInt(tParts[0], 12);
      var minute = _lsToInt(tParts[1], 0);

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
    _logLoveSecretFlow('DETAIL_POPUP_OPEN', { mode: 'solo', hasUserChart: hasData, hasPartnerChart: false, hasCompatibility: false, message: 'modal_open' });
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
      '<span class="ls-chapter-num">Chapter ' + ch + '</span>' +
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
    _currentChapterMode = 'solo';
    _chapters = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
    _chapterStructured = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
    _chapterMeta = _buildChapterBuffer(_getLoveSecretModeTotalChapters(_currentChapterMode));
    _showScreen('lsPartnerScreen');
    _bindPartnerScreen();
  };

  window.handleStartCompatibilityLoveBook = async function () {
    if (_generating) return;
    _currentChapterMode = 'compatibility';
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
    _logLoveSecretFlow('COMPATIBILITY_GENERATE_CLICK', { mode: 'compatibility', hasUserChart: true, hasPartnerChart: true, hasCompatibility: true, featureKey: LOVE_SECRET_FEATURE_KEY, reportId: reportId, message: 'compatibility_click' });

    var startBtn = _qs('lsPsStartBtn');
    if (startBtn) { startBtn.disabled = true; startBtn.textContent = '처리 중...'; }

    function _restorePartnerStartBtn() {
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = '💑 두 사람의 궁합 분석 시작하기';
      }
    }

    function _startWithPartnerData(accessGrant) {
      _restorePartnerStartBtn();
      var partnerData = _collectPartnerScreenData();
      _startGeneration(partnerData, accessGrant, reportId);
    }

    try {
      _logLoveSecretFlow('COIN_GATE_START', { mode: 'compatibility', hasUserChart: true, hasPartnerChart: true, hasCompatibility: true, featureKey: LOVE_SECRET_FEATURE_KEY, reportId: reportId, message: 'compatibility_gate_start' });
      var gateResult = await _runLoveSecretCoinGate('compatibility', reportId);
      if (!gateResult.ok) {
        window.alert(gateResult.message || '결제 확인에 실패했습니다.');
        return;
      }
      _logLoveSecretFlow('COIN_GATE_SUCCESS', { mode: 'compatibility', hasUserChart: true, hasPartnerChart: true, hasCompatibility: true, featureKey: LOVE_SECRET_FEATURE_KEY, reportId: reportId, purchaseId: gateResult.purchaseId || '', message: 'compatibility_gate_success' });
      _startWithPartnerData(gateResult.accessGrant || null);
    } finally {
      _restorePartnerStartBtn();
    }
  };

  window.handleStartSoloLoveBook = async function () {
    if (_generating) return;
    _currentChapterMode = 'solo';
    var reportId = _lsBuildReportId('solo');
    _logLoveSecretFlow('SOLO_GENERATE_CLICK', { mode: 'solo', hasUserChart: true, hasPartnerChart: false, hasCompatibility: false, featureKey: LOVE_SECRET_FEATURE_KEY, reportId: reportId, message: 'solo_click' });
    if (_premiumTokenMatches('loveSecret', 300)) {
      _startGeneration('', {
        ok: true,
        featureKey: LOVE_SECRET_FEATURE_KEY,
        sessionId: 'love-book:' + reportId,
        purchaseId: 'token:' + reportId,
        reportId: reportId,
        paidAt: new Date().toISOString()
      }, reportId);
      return;
    }
    _logLoveSecretFlow('COIN_GATE_START', { mode: 'solo', hasUserChart: true, hasPartnerChart: false, hasCompatibility: false, featureKey: LOVE_SECRET_FEATURE_KEY, reportId: reportId, message: 'solo_gate_start' });
    var gateResult = await _runLoveSecretCoinGate('solo', reportId);
    if (!gateResult.ok) {
      window.alert(gateResult.message || '결제 확인에 실패했습니다.');
      return;
    }
    _logLoveSecretFlow('COIN_GATE_SUCCESS', { mode: 'solo', hasUserChart: true, hasPartnerChart: false, hasCompatibility: false, featureKey: LOVE_SECRET_FEATURE_KEY, reportId: reportId, purchaseId: gateResult.purchaseId || '', message: 'solo_gate_success' });
    _startGeneration('', gateResult.accessGrant || null, reportId);
  };

  window.lsStartWithPartner = function () {
    return window.handleStartCompatibilityLoveBook();
  };

  window.lsSkipPartner = function () {
    return window.handleStartSoloLoveBook();
  };

  function _startGeneration(partnerData, accessGrant, reportId) {
    _generating = true;
    _cancelGeneration = false;
    _lsAccessGrant = accessGrant || null;
    _currentChapterMode = partnerData ? 'compatibility' : 'solo';
    _lsCurrentReportId = String(reportId || '').trim() || _lsBuildReportId(_currentChapterMode);
    _setLoveBookGenerationState('preparing_generation');
    _lsStartPremiumJob(window.__cdActiveBirthProfile || {}, _currentChapterMode, _lsAccessGrant, _lsCurrentReportId);
    _showScreen('lsLoadingScreen');
    _prepareLoveSecretUi(_currentChapterMode);
    _startLoadingAnimation();
    var sajuData = _cachedSajuData || _collectSajuData();
    var totalChapters = _getLoveSecretModeTotalChapters(_currentChapterMode);
    _chapters = _buildChapterBuffer(totalChapters);
    _chapterStructured = _buildChapterBuffer(totalChapters);
    _chapterMeta = _buildChapterBuffer(totalChapters);
    var progressBar = _qs('lsProgressBar');
    var progressText = _qs('lsProgressText');
    var chapterMsg = _qs('lsLoadingChapter');

    function _setProgress(done) {
      var pct = totalChapters > 0 ? (done / totalChapters) * 100 : 0;
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = done + ' / ' + totalChapters + ' 챕터 완성';
      if (chapterMsg && done < totalChapters) chapterMsg.textContent = _getLoveSecretLoadingMessage(done, _currentChapterMode);
      if (chapterMsg && done >= totalChapters) chapterMsg.textContent = '모든 챕터가 완성되었습니다 💕';
      _updateLoadPills(done);
    }
    _setProgress(0);

    var _lsReportId = _lsCurrentReportId;

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
      lsTitle.textContent = partnerData
        ? '두 사람의 궁합과 연애 비책을 집필하는 중입니다'
        : '연애 비책을 집필하는 중입니다';
    }
    _setLoveBookGenerationState('calculating_saju');

    function _fetchChapter(idx) {
      return new Promise(function (resolve) {
        var _settled = false;
        var _abortMsg = '응답 시간 초과 (45초). 네트워크 상태를 확인해 주세요.';
        var _endpoints = _buildApiCandidates('/api/love-secret/generate-chapter');
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

          var timeoutId = setTimeout(function () {
            if (_controller) {
              try { _controller.abort(); } catch (_) {}
            }
          }, 45000);

          fetch(_plan.url, {
            method: 'POST',
            headers: _lsHeaders,
            body: JSON.stringify({
              reportId: _lsReportId,
              requestId: 'love-secret-' + _lsReportId + '-ch' + (idx + 1) + '-a' + _plan.retry,
              sessionId: idx + 1,
              reportSessionId: String((_lsAccessGrant && _lsAccessGrant.sessionId) || ('love-book:' + _lsReportId)),
              chapter: idx + 1,
              mode: _currentChapterMode,
              featureKey: LOVE_SECRET_FEATURE_KEY,
              purchaseId: String((_lsAccessGrant && _lsAccessGrant.purchaseId) || '').trim() || undefined,
              strictNoFallback: false,
              chapterTitle: _getLoveSecretChapterTitle(idx, _currentChapterMode),
              chapterSubtitle: _getLoveSecretChapterSubtitle(idx, _currentChapterMode),
              chapterSpecificSections: Array.isArray(_getLoveSecretStructuredLabels(idx + 1, _currentChapterMode))
                ? _getLoveSecretStructuredLabels(idx + 1, _currentChapterMode).slice(0, 8)
                : [],
              accessGrant: _lsAccessGrant || undefined,
              premiumAccessToken: _lsPremiumToken || undefined,
              sajuData: sajuData,
              partnerData: partnerData || '',
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

    (async function runLoveSecretChapterPipeline() {
      var runPipeline = (typeof window.__cdRunPremiumChapterPipeline === 'function')
        ? window.__cdRunPremiumChapterPipeline
        : null;
      if (!runPipeline) {
        _setLoveBookGenerationState('failed');
        throw new Error('공통 챕터 파이프라인을 불러오지 못했습니다.');
      }

      var fallbackText = String(window.__cdPremiumChapterFallbackText || '일시적인 응답 지연으로 해석을 불러오지 못했습니다. 부분 재생성 버튼을 이용해주세요.');
      _setLoveBookGenerationState('building_chapters');
      await runPipeline({
        totalChapters: totalChapters,
        maxAttempts: 3,
        interChapterDelayMs: 3000,
        retryDelayMs: 3000,
        shouldStop: function () { return _cancelGeneration; },
        fetchChapter: function (idx) {
          if (chapterMsg) chapterMsg.textContent = _getLoveSecretLoadingMessage(idx, _currentChapterMode);
          return _fetchChapter(idx);
        },
        isSuccess: function (data) {
          return !!(data && data.ok && data.text);
        },
        onSuccess: function (idx, data) {
          _syncChapterMetaFromResponse(idx, data);
          _chapters[idx] = data.text;
          _chapterStructured[idx] = (Array.isArray(data.sections) && data.sections.length)
            ? { sections: data.sections }
            : (data.chapterJson && typeof data.chapterJson === 'object' ? data.chapterJson : null);
          _saveResult(window.__cdActiveBirthProfile || {});
        },
        onFallback: function (idx, fallbackPayload) {
          var msg = (fallbackPayload && fallbackPayload.message) ? String(fallbackPayload.message) : '알 수 없는 오류';
          _chapters[idx] = fallbackText;
          _chapterStructured[idx] = null;
          console.warn('[연애 비책] Chapter ' + (idx + 1) + ' 실패:', msg);
          _saveResult(window.__cdActiveBirthProfile || {});
        },
        onProgress: function (idx) {
          _setProgress(idx + 1);
        },
      });

      if (_cancelGeneration) return;
      _generating = false;
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
      _lsRunPremiumJob(totalChapters);
    })().catch(function (error) {
      _generating = false;
      _stopLoadingAnimation();
      var msg = String(error && error.message ? error.message : error || '챕터 생성 중 오류가 발생했습니다.');
      alert('연애 비책 생성 중 오류가 발생했습니다: ' + msg);
    });
  }

  window.downloadLoveSecretPdf = function () {
    if (!_chapters.some(Boolean)) { alert('먼저 연애 비책을 생성해 주세요.'); return; }
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
      var _meta = _getChapterMeta(i);
      bodyHtml +=
        '<div class="chapter" style="page-break-before:' + (i > 0 ? 'always' : 'auto') + '">' +
        '<div class="chapter-header">' +
        '<span class="chapter-num">Chapter ' + (i + 1) + '</span>' +
        '<h2 class="chapter-title">' + _escHtml(_meta.title) + '</h2>' +
        '<p class="chapter-sub">' + _escHtml(_meta.subtitle) + '</p>' +
        '</div>' +
        '<div class="chapter-body">' + _md2html(_chapters[i]) + '</div>' +
        '</div>';
    }

    var tocHtml = _chapters.map(function (c, i) {
      if (!c) return '';
      return '<div class="toc-item"><span class="toc-num">Chapter ' + (i + 1) + '</span><span class="toc-text">' + _escHtml(_getChapterMeta(i).title) + '</span></div>';
    }).join('');

    var fullHtml = '<!DOCTYPE html><html lang="ko"><head>' +
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

    var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var win = window.open(url, '_blank');
    if (win) {
      win.onload = function () {
        setTimeout(function () { win.print(); }, 600);
      };
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
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
