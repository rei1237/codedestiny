(function(){
  'use strict';

  var TOTAL_CHAPTERS = 15;
  var FEATURE_KEY = 'premium-ziwei-report';
  var FEATURE_KEY_ALIASES = ['premium-ziwei-report', 'premium_pdf_ziwei'];
  var ZIWEI_CLIENT_EVIDENCE_SCHEMA_VERSION = 'ziwei-premium-client-evidence.v1';
  var COIN_COST = 590;
  var PREPARE_API = '/api/ziwei-book/prepare';
  var CONSULTATION_API = '/api/ziwei-book/ai-consultation';
  var ZIWEI_AI_CACHE_MARKER = 'ziwei-ai-consultation-v20260627';
  var RESULT_API = '/api/ziwei-book/result';
  var CHAPTERS_API = '/api/ziwei-book/chapters';
  var DOWNLOAD_API = '/api/ziwei-book/download';
  var PAID_SESSION_STORAGE_KEY = 'premium:ziwei:paid-session:v1';
  var COVER_IMAGE = '/fuctionassets/jamipremiun.webp';
  var PREVIOUS_PAYMENT_GATE_WINDOW_MS = 12000;
  var RESULT = null;
  var GENERATING = false;
  var DOWNLOADING = false;
  var isPaymentChecking = false;
  var isPaymentOpening = false;
  var paymentGateOpenedAt = 0;
  var pendingPaymentPromise = null;
  var pendingPaymentBirthHash = '';
  var paymentRequestId = '';
  var activePaymentBirthHash = '';
  var activeSessionId = '';
  var activeReportId = '';
  var activePaymentRequestId = '';
  var LAST_SEED = null;
  var SERVER_CHAPTER_CONTRACT = null;
  var SERVER_CHAPTER_CONTRACT_PROMISE = null;
  var RESTORE_IN_FLIGHT = false;
  var RESULT_POLL_MAX_ATTEMPTS = 150;
  var RESULT_POLL_INTERVAL_MS = 4000;
  var ZIWEI_AI_ACTIVE_CATEGORY = 'general';
  var ZIWEI_AI_LOADING_TIMER = null;
  var ZIWEI_AI_CATEGORY_DEFAULTS = {
    general: '제 자미두수 명반 기준으로 지금 가장 중요한 흐름과 선택 방향을 알려주세요.',
    core: '명궁과 신궁을 기준으로 제 성격과 인생의 큰 방향을 알려주세요.',
    career: '관록궁과 재백궁을 중심으로 제 직업운과 커리어 흐름을 봐주세요.',
    money: '재백궁과 관록궁을 기준으로 돈의 흐름과 사업 가능성을 알려주세요.',
    love: '부부궁 기준으로 연애와 결혼 인연, 관계 패턴을 알고 싶어요.',
    relationship: '노복궁과 형제궁을 중심으로 인간관계 흐름을 봐주세요.',
    family: '부모궁과 전택궁을 기준으로 가족과 삶의 기반을 알려주세요.',
    health: '질액궁과 복덕궁을 중심으로 건강과 마음의 흐름을 봐주세요.',
    business: '관록궁과 재백궁 기준으로 이직이나 창업 가능성을 봐주세요.',
    yearly: '올해 제 명반에서 강하게 열리는 기회와 주의할 흐름을 알려주세요.',
    luck: '현재 대한과 유년 흐름으로 요즘 삶이 막히는 이유와 방향을 봐주세요.',
    turning_point: '앞으로 다가올 인생 전환점과 준비해야 할 선택을 알려주세요.',
    choice: '지금의 선택 앞에서 제 명반이 가리키는 방향을 알려주세요.',
    palace_deep: '제 질문과 가장 연결되는 궁을 중심으로 깊게 해석해 주세요.'
  };
  var ZIWEI_AI_CATEGORIES = [
    ['general', '종합 리딩'],
    ['core', '명궁/신궁'],
    ['career', '직업/관록궁'],
    ['money', '재물/재백궁'],
    ['love', '연애/부부궁'],
    ['health', '건강/질액궁'],
    ['relationship', '인간관계/노복궁'],
    ['family', '가족/부모궁'],
    ['yearly', '올해 운세'],
    ['luck', '대한/유년'],
    ['business', '이직/창업'],
    ['choice', '지금의 선택'],
    ['palace_deep', '궁별 심화']
  ];
  var ZIWEI_AI_LOADING_LINES = [
    '당신의 자미두수 명반을 계산하고 있어요.',
    '명궁과 신궁의 중심 별을 읽고 있어요.',
    '12궁에 배치된 별의 흐름을 정리하고 있어요.',
    '대한과 유년이 여는 시기를 살펴보고 있어요.',
    '질문과 연결된 궁의 답을 찾고 있어요.'
  ];
  var ZIWEI_BOOK_TEXT_TRANSLATIONS = {
    ko: {
      premiumPdfTitle: '자미두수 AI 상담',
      premiumPdfReason: '자미두수 AI 상담 생성',
      coverAlt: '자미두수 AI 상담 명반 이미지',
    },
    en: {
      premiumPdfTitle: 'Zi Wei Premium PDF',
      premiumPdfReason: 'Generate Zi Wei Premium PDF',
      coverAlt: 'Zi Wei premium chart book cover',
    },
    ja: {
      premiumPdfTitle: '紫微斗数プレミアムPDF',
      premiumPdfReason: '紫微斗数プレミアムPDF生成',
      coverAlt: '紫微斗数プレミアム命盤書の表紙',
    }
  };

  function ziweiBookLocale(){
    var value = '';
    try { if (window.cdGetCurrentLanguage) value = String(window.cdGetCurrentLanguage() || ''); } catch (_) {}
    if(!value){
      try { value = String(localStorage.getItem('cd_lang') || localStorage.getItem('cd_locale') || localStorage.getItem('codeDestinyLocale') || localStorage.getItem('lang') || ''); } catch (_) { value = ''; }
    }
    value = String(value || '').trim().replace('_', '-').toLowerCase();
    if(value.indexOf('ja') === 0) return 'ja';
    if(value.indexOf('en') === 0) return 'en';
    return 'ko';
  }

  function ziweiBookText(key){
    var copy = ZIWEI_BOOK_TEXT_TRANSLATIONS[ziweiBookLocale()] || ZIWEI_BOOK_TEXT_TRANSLATIONS.ko;
    return copy[key] || ZIWEI_BOOK_TEXT_TRANSLATIONS.ko[key] || '';
  }

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
    '자미 명반 총론 — 운명의 중심 지도',
    '명궁과 신궁 — 타고난 나와 완성되는 나',
    '선천 사화 정밀 해석',
    '14주성 완전 해석',
    '보좌성과 살성의 역학 관계',
    '재백궁과 관록궁 — 돈과 사회적 성취',
    '부부궁과 자녀궁 — 사랑과 가족 리듬',
    '천이궁과 전택궁 — 이동과 기반의 운',
    '노복궁과 형제궁 — 인맥과 협업 운',
    '복덕궁과 부모궁 — 내면 회복과 뿌리',
    '질액궁 — 건강과 심리 리듬',
    '대한/대운 흐름 — 인생의 큰 전환점',
    '세운 흐름 — 올해와 가까운 미래',
    '강점·위험 패턴·개운 전략',
    '종합 상담문 — 앞으로의 선택 가이드'
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
    '질액궁의 건강과 심리 리듬을 부드럽게 정리하는 중입니다.',
    '대한과 대운의 큰 전환점을 해석하는 중입니다.',
    '올해와 가까운 미래의 흐름을 다듬는 중입니다.',
    '강점과 위험 패턴, 개운 전략을 엮는 중입니다.',
    '앞으로의 선택 가이드를 완성하는 중입니다.'
  ];

  var ZIWEI_PHASE_ORDER = ['prepare', 'calculate', 'write', 'archive'];
  var ZIWEI_PHASE_TITLES = {
    prepare: '자미두수 명반을 정리하고 있습니다.',
    calculate: '명궁과 12궁 흐름을 정리하고 있습니다.',
    write: '1챕터 상담문을 생성하고 있습니다.',
    archive: 'PDF 원고를 조판하고 있습니다.'
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

  function stripZiweiTransAttrs(el){
    if(!el) return el;
    el.removeAttribute('data-cd-trans');
    el.removeAttribute('data-cd-trans-attr');
    el.removeAttribute('data-key');
    return el;
  }

  function setZiweiScopedText(selector, value){
    var modal = $('ziweiBookModal');
    var el = modal ? modal.querySelector(selector) : null;
    if(!el) return;
    stripZiweiTransAttrs(el).textContent = value;
  }

  function ensureZiweiAIConsultationStyle(){
    if(document.getElementById('zbAiConsultationStyle')) return;
    var style = document.createElement('style');
    style.id = 'zbAiConsultationStyle';
    style.textContent = ''
      + '#ziweiBookModal[data-zb-ai="1"] .lb-start__chapters,#ziweiBookModal[data-zb-ai="1"] .lb-ch-grid,#ziweiBookModal[data-zb-ai="1"] .lb-loading-progress,#ziweiBookModal[data-zb-ai="1"] #zbProgressText,#ziweiBookModal[data-zb-ai="1"] #zbToc,#ziweiBookModal[data-zb-ai="1"] #zbPdfBtn,#ziweiBookModal[data-zb-ai="1"] #zbTopPdfBtn,#ziweiBookModal[data-zb-ai="1"] #zbBottomPdfBtn{display:none!important;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-stage-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-fields{margin:14px 0;padding:14px;border:1px solid rgba(250,204,21,.24);border-radius:8px;background:linear-gradient(135deg,rgba(32,11,61,.74),rgba(14,19,39,.88));}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-field-title{display:block;margin:0 0 9px;color:#fde68a;font-size:.82rem;font-weight:800;letter-spacing:0;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-chip-grid{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-chip{border:1px solid rgba(196,181,253,.34);background:rgba(255,255,255,.06);color:#ede9fe;border-radius:8px;min-height:34px;padding:7px 10px;font-size:.78rem;font-weight:800;cursor:pointer;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-chip[aria-pressed="true"]{border-color:rgba(250,204,21,.7);background:linear-gradient(135deg,rgba(124,58,237,.72),rgba(91,33,182,.72));color:#fff7ed;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-question{width:100%;min-height:116px;resize:vertical;border:1px solid rgba(196,181,253,.32);border-radius:8px;background:rgba(5,7,22,.72);color:#fff;padding:12px;font-family:var(--font-body);font-size:.92rem;line-height:1.65;outline:none;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-question:focus{border-color:rgba(250,204,21,.74);box-shadow:0 0 0 3px rgba(250,204,21,.12);}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-result-grid{display:grid;gap:12px;margin-top:14px;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-result-card{border:1px solid rgba(196,181,253,.22);border-radius:8px;background:linear-gradient(135deg,rgba(18,14,38,.88),rgba(42,20,72,.72));padding:14px;color:#ede9fe;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-result-card h4{margin:0 0 8px;color:#fde68a;font-size:.98rem;font-family:var(--font-body);letter-spacing:0;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-result-card p{margin:0;color:#e9d5ff;line-height:1.72;font-size:.9rem;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-result-card ul{margin:0;padding-left:18px;color:#e9d5ff;line-height:1.72;font-size:.9rem;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-result-card li+li{margin-top:6px;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-palace-list{display:grid;gap:8px;}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-palace-item{padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.045);}'
      + '#ziweiBookModal[data-zb-ai="1"] .zb-ai-palace-item strong{display:block;margin-bottom:4px;color:#fff;}'
      + '#ziweiBookModal[data-zb-ai="1"] .lb-result__actions{justify-content:center;}'
      + '@media (max-width:720px){#ziweiBookModal[data-zb-ai="1"] .zb-stage-list{grid-template-columns:1fr 1fr}#ziweiBookModal[data-zb-ai="1"] .zb-ai-chip-grid{display:grid;grid-template-columns:1fr 1fr}#ziweiBookModal[data-zb-ai="1"] .zb-ai-chip{width:100%;}}';
    document.head.appendChild(style);
  }

  function applyZiweiAIConsultationCopy(){
    var modal = $('ziweiBookModal');
    if(!modal) return;
    modal.setAttribute('data-zb-ai', '1');
    modal.setAttribute('data-zb-ai-marker', ZIWEI_AI_CACHE_MARKER);
    modal.setAttribute('aria-label', '자미두수 AI 상담');
    stripZiweiTransAttrs(modal);
    setZiweiScopedText('.lb-header-title-en', 'ZIWEI AI CONSULTATION');
    setZiweiScopedText('.lb-modal__title', '자미두수 AI 상담');
    setZiweiScopedText('.lb-modal__subtitle', '명궁, 신궁, 12궁과 사화의 흐름이 지금의 질문에 답합니다.');
    setZiweiScopedText('#zbNoProfileScreen h3', '나의 운명 카드 필요');
    var noProfileLine = modal.querySelector('#zbNoProfileScreen p');
    if(noProfileLine){
      stripZiweiTransAttrs(noProfileLine);
      noProfileLine.innerHTML = '자미두수 AI 상담을 열려면<br>생년월일과 출생시간을 먼저 확인해 주세요';
    }
    var badges = modal.querySelectorAll('#zbStartScreen .lb-trust-badge');
    var badgeTexts = ['자미두수 AI 상담', '명궁·신궁·12궁', '사화·대한·유년', '59,000원 · 1회'];
    for(var i=0; i<badges.length; i++) stripZiweiTransAttrs(badges[i]).textContent = badgeTexts[i] || badges[i].textContent;
    var headline = modal.querySelector('#zbStartScreen .lb-marketing-headline');
    if(headline){
      stripZiweiTransAttrs(headline);
      headline.innerHTML = '<span>명반의 별이</span> <strong>지금의 질문에 답합니다</strong>';
    }
    setZiweiScopedText('#zbStartScreen .lb-marketing-sub', '명궁, 신궁, 12궁, 주성, 사화, 대한과 유년 흐름을 바탕으로 삶의 방향과 선택을 상담해드립니다.');
    var desc = modal.querySelector('#zbStartScreen .lb-start-desc');
    if(desc){
      stripZiweiTransAttrs(desc);
      desc.innerHTML = '<span>자미두수 명반 핵심 데이터를 바탕으로</span> <strong>질문에 직접 답하는 AI 상담</strong><span>이 바로 열립니다.</span>';
    }
    setZiweiScopedText('#zbStartScreen .lb-coin-label strong', '59,000원');
    setZiweiScopedText('#zbStartScreen .lb-coin-label span', '· 결제 또는 이용권 확인 후 AI 상담 생성');
    setZiweiScopedText('#zbStartScreen .lb-start__note', 'PDF를 기다리지 않아도 됩니다. 명반을 바탕으로 상담 결과를 화면에서 바로 확인합니다.');
    setZiweiScopedText('#zbLoadingTitle', '자미두수 명반을 읽고 있습니다.');
    setZiweiScopedText('#zbLoadingChapterNum', 'AI 상담 생성 중');
    setZiweiScopedText('#zbLoadingChapter', ZIWEI_AI_LOADING_LINES[0]);
    setZiweiScopedText('#zbMysticQuote', ZIWEI_AI_LOADING_LINES[1]);
    var stageList = modal.querySelector('.zb-stage-list');
    if(stageList){
      stripZiweiTransAttrs(stageList).setAttribute('aria-label', '자미두수 AI 상담 생성 단계');
      var stageTexts = { prepare:'질문 확인', calculate:'명반 계산', write:'별의 흐름', archive:'상담 정리' };
      Object.keys(stageTexts).forEach(function(key){
        var pill = stageList.querySelector('[data-zb-stage="' + key + '"]');
        if(pill) stripZiweiTransAttrs(pill).textContent = stageTexts[key];
      });
    }
    setZiweiScopedText('#zbResultScreen .lb-result__title', '자미두수 상담이 열렸습니다.');
  }

  function ensureZiweiAIConsultationFields(){
    var profileBox = $('zbProfileSummary');
    if(!profileBox) return;
    if(!$('zbAiConsultFields')){
      var holder = document.createElement('div');
      holder.id = 'zbAiConsultFields';
      holder.className = 'zb-ai-fields';
      holder.innerHTML = ''
        + '<div class="zb-ai-field-group">'
        + '<p class="zb-ai-field-title">상담 주제</p>'
        + '<div class="zb-ai-chip-grid" id="zbAiCategoryGrid"></div>'
        + '</div>'
        + '<label class="zb-ai-field-title" for="zbAiQuestion">지금 묻고 싶은 질문</label>'
        + '<textarea id="zbAiQuestion" class="zb-ai-question" maxlength="1000" placeholder="예: 제 자미두수 명반 기준으로 올해 직업운과 재물운은 어떻게 흘러갈까요?"></textarea>';
      var profileSection = profileBox.closest ? profileBox.closest('.lb-start__profile-box') : profileBox.parentNode;
      if(profileSection && profileSection.parentNode) profileSection.parentNode.insertBefore(holder, profileSection.nextSibling);
    }
    var grid = $('zbAiCategoryGrid');
    if(grid && grid.dataset.zbAiReady !== '1'){
      grid.dataset.zbAiReady = '1';
      grid.innerHTML = ZIWEI_AI_CATEGORIES.map(function(item){
        return '<button type="button" class="zb-ai-chip" data-zb-ai-category="' + esc(item[0]) + '" aria-pressed="' + (item[0] === ZIWEI_AI_ACTIVE_CATEGORY ? 'true' : 'false') + '">' + esc(item[1]) + '</button>';
      }).join('');
      grid.addEventListener('click', function(event){
        var btn = event.target && event.target.closest ? event.target.closest('[data-zb-ai-category]') : null;
        if(!btn) return;
        selectZiweiAICategory(btn.getAttribute('data-zb-ai-category'));
      });
    }
    selectZiweiAICategory(ZIWEI_AI_ACTIVE_CATEGORY);
  }

  function selectZiweiAICategory(category){
    var key = ZIWEI_AI_CATEGORY_DEFAULTS[category] ? category : 'general';
    var oldDefault = ZIWEI_AI_CATEGORY_DEFAULTS[ZIWEI_AI_ACTIVE_CATEGORY] || '';
    ZIWEI_AI_ACTIVE_CATEGORY = key;
    var chips = document.querySelectorAll('#zbAiCategoryGrid [data-zb-ai-category]');
    for(var i=0; i<chips.length; i++){
      chips[i].setAttribute('aria-pressed', chips[i].getAttribute('data-zb-ai-category') === key ? 'true' : 'false');
    }
    var question = $('zbAiQuestion');
    if(question && (!text(question.value) || text(question.value) === oldDefault)){
      question.value = ZIWEI_AI_CATEGORY_DEFAULTS[key];
    }
  }

  function readZiweiAIQuestion(){
    var question = $('zbAiQuestion');
    return text(question && question.value);
  }

  function setZiweiAILoadingMessage(index){
    var safeIndex = Math.max(0, Number(index) || 0);
    var line = ZIWEI_AI_LOADING_LINES[safeIndex % ZIWEI_AI_LOADING_LINES.length];
    var percent = Math.min(92, 12 + safeIndex * 16);
    setText('zbLoadingChapterNum', 'AI 상담 생성 중');
    updateProgress(percent, line);
    setText('zbMysticQuote', line);
  }

  function startZiweiAILoading(){
    stopZiweiAILoading();
    var step = 0;
    setZiweiAILoadingMessage(step);
    ZIWEI_AI_LOADING_TIMER = window.setInterval(function(){
      step += 1;
      setZiweiAILoadingMessage(step);
    }, 2400);
  }

  function stopZiweiAILoading(){
    if(ZIWEI_AI_LOADING_TIMER){
      window.clearInterval(ZIWEI_AI_LOADING_TIMER);
      ZIWEI_AI_LOADING_TIMER = null;
    }
  }

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

  function renderZiweiLlmChapterHtml(chapter, index){
    var source = text(chapter && chapter.html);
    if(!source || source.indexOf('<article') === -1) return '';
    var safe = source
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"])[\s\S]*?\1/gi, '');
    return '<div class="lb-result-article lb-result-article--llm" id="zbChapterSection-' + (index + 1) + '">' + safe + '</div>';
  }

  function setGeneratingUiLock(isBusy, label){
    var btn = $('zbStartBtn');
    if(!btn) return;
    if(!btn.dataset.zbIdleHtml) btn.dataset.zbIdleHtml = btn.innerHTML;
    btn.disabled = !!isBusy;
    btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    if(isBusy){
      btn.classList.add('is-busy');
      btn.textContent = label || 'AI 상담 준비 중...';
      return;
    }
    btn.classList.remove('is-busy');
    btn.innerHTML = btn.dataset.zbIdleHtml || '자미두수 상담 받기<span class="cd-preparing-badge cd-preparing-badge--cta">59,000원</span>';
  }

  function setZiweiPhase(phase, title){
    var safePhase = ZIWEI_PHASE_TITLES[phase] ? phase : 'prepare';
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
    return s === 'paid' || s === 'generating' || s === 'failed_retryable' || s === 'failed' || s === 'completed';
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
      || text(context.requestId)
      || text(grant && (grant.evidenceId || grant.paymentId || grant.purchaseId || grant.transactionId || grant.merchantUid || grant.requestId))
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
      && hasPaymentEvidence(saved, saved.birthHash)
    );
  }

  function buildSessionId(birthHash){
    return 'ziwei-premium:' + text(birthHash || 'unknown') + ':' + Date.now().toString(36);
  }

  function buildReportId(sessionId){
    var safe = text(sessionId || buildSessionId('unknown')).replace(/[^a-zA-Z0-9_-]+/g, '-');
    return 'ziwei-premium-' + safe;
  }

  function resetZiweiGenerationScope(){
    activePaymentBirthHash = '';
    activeSessionId = '';
    activeReportId = '';
    activePaymentRequestId = '';
  }

  function setZiweiGenerationScope(scope){
    var next = scope && typeof scope === 'object' ? scope : {};
    activePaymentBirthHash = text(next.birthHash || activePaymentBirthHash);
    activeSessionId = text(next.sessionId || next.reportSessionId || activeSessionId);
    activeReportId = text(next.reportId || activeReportId || (activeSessionId ? buildReportId(activeSessionId) : ''));
    activePaymentRequestId = text(next.requestId || activePaymentRequestId || (activeReportId ? activeReportId + '-pay' : ''));
  }

  function getZiweiGenerationScope(birthHash){
    var hash = text(birthHash || activePaymentBirthHash || 'unknown');
    if(!activeSessionId || activePaymentBirthHash !== hash){
      activePaymentBirthHash = hash;
      activeSessionId = buildSessionId(hash);
      activeReportId = buildReportId(activeSessionId);
      activePaymentRequestId = activeReportId + '-pay';
    }
    return {
      birthHash: activePaymentBirthHash,
      sessionId: activeSessionId,
      reportSessionId: activeSessionId,
      reportId: activeReportId,
      requestId: activePaymentRequestId
    };
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

  function getZiweiLlmAssembly(data){
    var payload = data || {};
    var ready = payload.pdfReady && typeof payload.pdfReady === 'object' ? payload.pdfReady : {};
    return payload.llmAssembly && typeof payload.llmAssembly === 'object'
      ? payload.llmAssembly
      : (ready.llmAssembly && typeof ready.llmAssembly === 'object' ? ready.llmAssembly : {});
  }

  function hasZiweiV3LlmAssembly(data){
    var payload = data || {};
    var ready = payload.pdfReady && typeof payload.pdfReady === 'object' ? payload.pdfReady : {};
    var llmAssembly = getZiweiLlmAssembly(payload);
    var manuscriptSource = text(payload.manuscriptSource || ready.manuscriptSource).toLowerCase();
    var chapterCount = Number(llmAssembly.chapterCount || payload.llmChapterCount || payload.llmDraftChapterCount || 0);
    return manuscriptSource === 'llm-html-v3'
      && llmAssembly.enabled === true
      && text(llmAssembly.source).toLowerCase() === 'llm-html-v3'
      && Boolean(text(llmAssembly.provider))
      && text(llmAssembly.templateVersion) === 'ziwei-premium-html-v3.0.0'
      && llmAssembly.externalCallsAllowed === true
      && llmAssembly.externalGeneration === true
      && llmAssembly.fallbackUsed !== true
      && llmAssembly.localFallbackUsed !== true
      && chapterCount >= TOTAL_CHAPTERS;
  }

  function getZiweiContractSections(source){
    var raw = source && Array.isArray(source.sections)
      ? source.sections
      : (source && Array.isArray(source.categories) ? source.categories : []);
    return raw.map(function(section){
      return text(typeof section === 'string' ? section : (section && (section.title || section.name || section.heading)));
    }).filter(Boolean);
  }

  function normalizeZiweiContractSpec(chapter, index){
    var sections = getZiweiContractSections(chapter);
    return {
      id: text(chapter && (chapter.id || chapter.chapterId)),
      order: Number((chapter && (chapter.order || chapter.chapterNo)) || index + 1),
      title: text(chapter && (chapter.title || chapter.chapterTitle)),
      sections: sections.slice(),
      categories: sections.map(function(title, sectionIndex){
        return {
          id: 'ch' + pad2(index + 1) + '-' + pad2(sectionIndex + 1),
          order: sectionIndex + 1,
          title: title
        };
      })
    };
  }

  function validateZiweiChapterContract(chapters){
    var list = Array.isArray(chapters) ? chapters : [];
    var issues = [];
    if(list.length !== TOTAL_CHAPTERS) issues.push('chapter.count');
    var specs = [];
    for(var i = 0; i < Math.min(list.length, TOTAL_CHAPTERS); i += 1){
      var spec = normalizeZiweiContractSpec(list[i], i);
      var expectedId = 'ch' + pad2(i + 1);
      if(spec.id !== expectedId) issues.push('chapter.id.' + (i + 1));
      if(!spec.title) issues.push('chapter.title.' + (i + 1));
      if(spec.sections.length <= 0) issues.push('chapter.sections.' + (i + 1));
      specs.push(spec);
    }
    return {
      ok: issues.length === 0,
      issues: issues,
      specs: specs
    };
  }

  async function loadZiweiChapterContract(){
    if(SERVER_CHAPTER_CONTRACT && SERVER_CHAPTER_CONTRACT.ok) return SERVER_CHAPTER_CONTRACT;
    if(SERVER_CHAPTER_CONTRACT_PROMISE) return SERVER_CHAPTER_CONTRACT_PROMISE;
    SERVER_CHAPTER_CONTRACT_PROMISE = (async function(){
      var fetched = await fetchZiweiApi(CHAPTERS_API, { method: 'GET' });
      var res = fetched.res;
      var json = fetched.json || {};
      if(!res.ok || json.ok !== true || !Array.isArray(json.chapters)){
        throw buildRetryableError('자미두수 PDF 챕터 구성을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', 503, 'ZIWEI_CHAPTER_CONTRACT_UNAVAILABLE', 'generation');
      }
      var contract = validateZiweiChapterContract(json.chapters);
      if(!contract.ok){
        throw buildRetryableError('자미두수 PDF 챕터 구성이 맞지 않습니다. 잠시 후 다시 시도해 주세요.', 422, 'ZIWEI_CHAPTER_CONTRACT_INVALID', 'generation');
      }
      SERVER_CHAPTER_CONTRACT = contract;
      logFlow('ChapterContractLoaded', {
        chapterCount: contract.specs.length,
        sectionCount: contract.specs.reduce(function(sum, spec){ return sum + spec.sections.length; }, 0)
      });
      return contract;
    })();
    SERVER_CHAPTER_CONTRACT_PROMISE = SERVER_CHAPTER_CONTRACT_PROMISE.finally(function(){
      SERVER_CHAPTER_CONTRACT_PROMISE = null;
    });
    return SERVER_CHAPTER_CONTRACT_PROMISE;
  }

  function getZiweiResponseChapters(data){
    var payload = data && typeof data === 'object' ? data : {};
    var ready = payload.pdfReady && typeof payload.pdfReady === 'object' ? payload.pdfReady : {};
    var nested = payload.payload && typeof payload.payload === 'object' ? payload.payload : {};
    if(Array.isArray(payload.chapters)) return payload.chapters;
    if(Array.isArray(nested.chapters)) return nested.chapters;
    if(Array.isArray(ready.chapters)) return ready.chapters;
    return [];
  }

  function hasZiweiChapterContractMatch(data, contract){
    var activeContract = contract || SERVER_CHAPTER_CONTRACT;
    if(!activeContract || !activeContract.ok) return true;
    var chapters = getZiweiResponseChapters(data);
    if(chapters.length !== TOTAL_CHAPTERS || activeContract.specs.length !== TOTAL_CHAPTERS) return false;
    for(var i = 0; i < TOTAL_CHAPTERS; i += 1){
      var expected = activeContract.specs[i] || {};
      var chapter = chapters[i] || {};
      var chapterId = text(chapter.id || chapter.key || chapter.chapterId);
      var chapterTitle = text(chapter.title || chapter.chapterTitle);
      if(chapterId !== expected.id) return false;
      if(chapterTitle !== expected.title) return false;
      if(getZiweiContractSections(chapter).length !== expected.sections.length) return false;
    }
    return true;
  }

  function assertZiweiCompletedContract(data, contract){
    if(!hasZiweiV3LlmAssembly(data)){
      throw buildRetryableError('자미두수 PDF 원고 생성 검증을 통과하지 못했습니다. 잠시 후 다시 시도해 주세요.', 422, 'ZIWEI_LLM_REPORT_REQUIRED', 'generation');
    }
    if(!hasZiweiChapterContractMatch(data, contract)){
      throw buildRetryableError('자미두수 PDF 챕터 계약 검증을 통과하지 못했습니다. 다시 생성해 주세요.', 422, 'ZIWEI_CHAPTER_CONTRACT_MISMATCH', 'generation');
    }
  }

  function getZiweiReportReadiness(data){
    var payload = data || {};
    var ready = payload.pdfReady && typeof payload.pdfReady === 'object' ? payload.pdfReady : {};
    var chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
    var progress = getZiweiProgressPayload(payload);
    var status = normalizeZiweiServerStatus(payload.status || progress.status);
    var serverStatus = normalizeZiweiServerStatus(payload.serverStatus || status);
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
    ));
    var ok = payload.ok === true;
    var retryable = payload.retryable === true;
    var failed = status === 'failed' || serverStatus === 'failed';
    var processing = !failed && (status === 'generating' || status === 'rendering' || status === 'uploading' || serverStatus === 'generating' || serverStatus === 'rendering' || serverStatus === 'uploading');
    var successCandidate = (ok || processing || retryable || failed) && (hasReportId || hasSessionId);
    var llmReady = hasZiweiV3LlmAssembly(payload);
    return {
      ok: ok,
      processing: processing,
      retryable: retryable,
      failedRetryable: failed,
      failed: failed,
      recoverable: processing && (hasReportId || hasSessionId),
      successCandidate: successCandidate,
      completed: ok && successCandidate && (hasPdfHtml || hasStoredUrl) && chapters.length >= TOTAL_CHAPTERS && llmReady,
      llmReady: llmReady,
      hasPdfHtml: hasPdfHtml,
      hasStoredUrl: hasStoredUrl,
      chapterCount: Math.max(chapters.length, progress.completedChapters),
      completedChapters: progress.completedChapters,
      progress: progress,
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

  var ZIWEI_DEV_TRACE_LIMIT = 36;
  var ZIWEI_DEV_TRACE_EVENTS = [];

  function isZiweiDevTraceEnabled(){
    try {
      var host = String(window.location && window.location.hostname || '');
      var params = new URLSearchParams(window.location && window.location.search || '');
      return /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(host)
        || params.has('familyTest')
        || params.has('ziweiDebug')
        || params.has('debugZiwei');
    } catch(_) {
      return false;
    }
  }

  function sanitizeZiweiDevTrace(value, depth, key){
    var field = String(key || '').toLowerCase();
    if(/token|authorization|secret|password|phone|email|name|birthdate|birthinput|birthprofile|payment|transaction|purchase|accessgrant/.test(field)){
      return '[redacted]';
    }
    if(value === undefined) return undefined;
    if(value === null) return null;
    if(depth > 3) return '[truncated]';
    if(Array.isArray(value)){
      return value.slice(0, 8).map(function(item){ return sanitizeZiweiDevTrace(item, depth + 1, key); });
    }
    if(typeof value === 'object'){
      var out = {};
      Object.keys(value).slice(0, 28).forEach(function(childKey){
        var next = sanitizeZiweiDevTrace(value[childKey], depth + 1, childKey);
        if(next !== undefined) out[childKey] = next;
      });
      return out;
    }
    return value;
  }

  function stringifyZiweiDevTrace(value){
    try { return JSON.stringify(sanitizeZiweiDevTrace(value, 0, ''), null, 2); }
    catch(_) { return String(value || ''); }
  }

  function ensureZiweiDevTracePanel(){
    if(!isZiweiDevTraceEnabled() || !document || !document.body) return null;
    var panel = document.getElementById('ziweiDevTracePanel');
    if(panel) return panel;
    panel = document.createElement('aside');
    panel.id = 'ziweiDevTracePanel';
    panel.setAttribute('aria-live', 'polite');
    panel.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:16px',
      'z-index:2147483000',
      'width:min(520px,calc(100vw - 32px))',
      'max-height:42vh',
      'display:flex',
      'flex-direction:column',
      'gap:8px',
      'padding:12px',
      'border:1px solid rgba(168,85,247,.55)',
      'border-radius:14px',
      'background:rgba(18,10,38,.94)',
      'box-shadow:0 18px 48px rgba(0,0,0,.36)',
      'color:#f7f2ff',
      'font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace'
    ].join(';');
    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:Malgun Gothic,Apple SD Gothic Neo,sans-serif;">'
      + '<strong style="font-size:13px;color:#facc15;">자미두수 PDF 개발 진단</strong>'
      + '<button type="button" data-ziwei-dev-close style="border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;border-radius:8px;padding:4px 8px;cursor:pointer;">닫기</button>'
      + '</div>'
      + '<pre id="ziweiDevTraceOutput" style="margin:0;overflow:auto;white-space:pre-wrap;word-break:break-word;max-height:32vh;"></pre>';
    panel.querySelector('[data-ziwei-dev-close]').onclick = function(){
      panel.style.display = 'none';
    };
    document.body.appendChild(panel);
    return panel;
  }

  function renderZiweiDevTracePanel(){
    if(!isZiweiDevTraceEnabled()) return;
    var panel = ensureZiweiDevTracePanel();
    if(!panel) return;
    var output = document.getElementById('ziweiDevTraceOutput');
    if(!output) return;
    output.textContent = ZIWEI_DEV_TRACE_EVENTS.map(function(event){
      return '[' + event.time + '] ' + event.kind + ' ' + event.tag + '\n' + event.detail;
    }).join('\n\n');
    output.scrollTop = output.scrollHeight;
  }

  function recordZiweiDevTrace(kind, tag, payload){
    if(!isZiweiDevTraceEnabled()) return;
    var event = {
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      kind: text(kind || 'flow'),
      tag: text(tag || ''),
      payload: sanitizeZiweiDevTrace(payload || {}, 0, '')
    };
    event.detail = stringifyZiweiDevTrace(event.payload);
    ZIWEI_DEV_TRACE_EVENTS.push(event);
    if(ZIWEI_DEV_TRACE_EVENTS.length > ZIWEI_DEV_TRACE_LIMIT) ZIWEI_DEV_TRACE_EVENTS.shift();
    try {
      window.__ziweiDevTraceEvents = ZIWEI_DEV_TRACE_EVENTS.slice();
      window.__ziweiLastDevTrace = event;
      console.info('[ZiweiBook][DevTrace][' + event.tag + '] ' + event.detail);
    } catch(_) {}
    renderZiweiDevTracePanel();
  }

  function logFlow(tag, payload){
    try {
      var safePayload = payload || {};
      console.info('[ZiweiBook][' + tag + ']', safePayload);
      recordZiweiDevTrace('flow', tag, safePayload);
    } catch(_) {}
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

  function buildZiweiApiCandidates(url){
    var value = text(url);
    if(!value) return [''];
    if(!/^\/api\//.test(value)) return [value];
    var isLocal = false;
    var queryApiBase = '';
    try {
      isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(String(window.location && window.location.hostname || ''));
      var params = new URLSearchParams(window.location && window.location.search || '');
      queryApiBase = params.get('api') || params.get('apiBase') || params.get('cdApiBase') || '';
    } catch(e) {}
    var bases = [
      queryApiBase,
      window.CODE_DESTINY_API_BASE_URL || '',
      window.__CD_API_BASE_URL || '',
      window.__API_BASE_URL || '',
      window.__AUTH_API_BASE_URL || ''
    ];
    if(isLocal){
      bases.push('http://localhost:4000');
      bases.push('http://127.0.0.1:4000');
    }
    bases.push('');
    bases.push(window.location && window.location.origin || '');
    var seen = {};
    var out = [];
    bases.forEach(function(base){
      var cleanBase = text(base).replace(/\/+$/, '');
      var endpoint = cleanBase ? cleanBase + value : value;
      if(!seen[endpoint]){
        seen[endpoint] = true;
        out.push(endpoint);
      }
    });
    return out.length ? out : [value];
  }

  async function fetchZiweiApi(url, options){
    var settings = Object.assign({}, options || {});
    var parseMode = text(settings.parse) || 'json';
    if(settings.parse) delete settings.parse;
    if(!settings.credentials) settings.credentials = 'include';
    if(!settings.cache) settings.cache = 'no-store';
    var endpoints = buildZiweiApiCandidates(url);
    var lastPack = null;
    var lastError = null;
    for(var i = 0; i < endpoints.length; i += 1){
      var endpoint = endpoints[i];
      try {
        var response = await fetch(endpoint, settings);
        if(parseMode === 'blob'){
          var blob = await response.blob().catch(function(){ return null; });
          lastPack = { res: response, blob: blob, json: blob, endpoint: endpoint };
        } else if(parseMode === 'text'){
          var textValue = await response.text().catch(function(){ return ''; });
          lastPack = { res: response, text: textValue, json: { message: textValue }, endpoint: endpoint };
        } else {
          var json = await response.json().catch(function(){ return {}; });
          lastPack = { res: response, json: json, endpoint: endpoint };
        }
        recordZiweiDevTrace('network', 'API_RESPONSE', {
          endpoint: endpoint,
          status: response.status,
          ok: response.ok,
          parseMode: parseMode,
          response: ziweiPayloadSafe(lastPack && lastPack.json)
        });
        if(response.ok || response.status !== 404 || i === endpoints.length - 1) return lastPack;
      } catch(error) {
        lastError = error;
        recordZiweiDevTrace('network', 'API_EXCEPTION', {
          endpoint: endpoint,
          message: text(error && error.message ? error.message : error),
          name: text(error && error.name)
        });
        if(i === endpoints.length - 1) throw error;
      }
    }
    if(lastPack) return lastPack;
    throw lastError || new Error('Ziwei API request failed');
  }

  function buildZiweiPrepareDiagnostics(profile, seed, paymentContext, birthInput, body, endpoint){
    var palaces = Array.isArray(seed && seed.palaces) ? seed.palaces : [];
    var chartMeta = seed && seed.chartMeta && typeof seed.chartMeta === 'object' ? seed.chartMeta : {};
    var input = birthInput && typeof birthInput === 'object' ? birthInput : {};
    var payment = paymentContext && typeof paymentContext === 'object' ? paymentContext : {};
    var hasBirthDate = Boolean(input.birthDate || (profile && profile.year && profile.month && profile.day));
    var hasBirthTime = Number.isFinite(Number(input.birthHour)) || Number.isFinite(Number(profile && profile.hour));
    return {
      hasProfile: Boolean(profile && profile.year && profile.month && profile.day),
      hasBirthDate: hasBirthDate,
      hasBirthTime: hasBirthTime,
      hasGender: Boolean(text((profile && profile.gender) || input.gender)),
      hasZiweiChart: Boolean(seed && palaces.length),
      hasPalaces: palaces.length >= 12,
      palaceCount: palaces.length,
      hasMingGong: Boolean(text(chartMeta.mingGong)),
      hasShenGong: Boolean(text(chartMeta.shenGong)),
      hasFourTransformations: Boolean(Array.isArray(seed && seed.sihua) && seed.sihua.length),
      paymentMode: text(payment.accessType || payment.paymentMode || payment.mode || 'unknown'),
      unlockMode: payment.accessGrant ? 'access-grant' : (payment.premiumAccessToken ? 'premium-token' : 'payment-context'),
      requestPayloadPreview: {
        featureKey: text(body && body.featureKey),
        reportType: text(body && body.reportType),
        hasPremiumAccessToken: Boolean(text(body && body.premiumAccessToken)),
        hasAccessGrant: Boolean(body && body.accessGrant),
        hasConsume: Boolean(body && body.consume),
        sessionHash: toHexHash(text(body && (body.reportSessionId || body.sessionId))),
        reportHash: toHexHash(text(body && body.reportId)),
        birthHash: text(body && body.birthHash)
      },
      apiEndpoint: text(endpoint || PREPARE_API)
    };
  }

  function logZiweiError(stageOrError, errorOrMeta, extra){
    try {
      var stageOverride = typeof stageOrError === 'string' ? stageOrError : '';
      var error = stageOverride ? errorOrMeta : stageOrError;
      var meta = stageOverride ? (extra || {}) : (errorOrMeta || {});
      var payloadSafe = error && error.payloadSafe
        ? error.payloadSafe
        : ziweiPayloadSafe((error && error.payload) || (error && typeof error === 'object' ? error : {}));
      var safe = {
        serviceKey: 'ziwei-book',
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        stage: text(stageOverride || meta && meta.stage || error && error.stage || payloadSafe.stage) || 'unknown',
        failureType: text(error && error.failureType || payloadSafe.failureType) || undefined,
        status: Number(error && error.status || meta && meta.status || 0) || undefined,
        code: text(error && error.code || payloadSafe.code) || 'ZIWEI_CLIENT_ERROR',
        message: text(error && error.message ? error.message : error) || 'unknown',
        name: text(error && error.name) || undefined,
        stack: text(error && error.stack, 2000) || undefined,
        requestId: text(meta && meta.requestId || error && error.requestId) || undefined,
        sessionId: text(meta && meta.sessionId || error && error.sessionId || payloadSafe.sessionId) || undefined,
        reportId: text(meta && meta.reportId || error && error.reportId || payloadSafe.reportId || RESULT && RESULT.reportId) || undefined,
        executionId: text(meta && meta.executionId || error && error.executionId || payloadSafe.executionId) || undefined,
        missing: ziweiShortList(error && error.missing || payloadSafe.missing, 6),
        issues: ziweiShortList(error && error.issues || payloadSafe.issues, 6),
        causeMessage: text(error && error.cause && (error.cause.message || error.cause)) || undefined,
        payloadSafe: payloadSafe,
        extra: meta && typeof meta === 'object' ? meta : undefined,
        error: error
      };
      console.error('[ZiweiBook][Error][' + safe.stage + ']', safe);
      var printable = Object.assign({}, safe);
      delete printable.error;
      console.error('[ZiweiBook][ErrorJson][' + safe.stage + '] ' + stringifyZiweiDevTrace(printable));
      recordZiweiDevTrace('error', safe.stage, printable);
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
    if(label) setText('zbMysticQuote', label);
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
      setText('zbLoadingChapter', '자미두수 명반을 정리하고 있습니다.');
      setText('zbMysticQuote', '자미두수 명반을 정리하고 있습니다.');
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

  function normalizeZiweiServerStatus(value){
    var status = text(value).toLowerCase();
    if(status === 'processing' || status === 'queued' || status === 'running') return 'generating';
    if(status === 'failed_retryable') return 'failed';
    if(status === 'generating' || status === 'rendering' || status === 'uploading' || status === 'completed' || status === 'failed') return status;
    return 'generating';
  }

  function getZiweiProgressPayload(data){
    var payload = data && typeof data === 'object' ? data : {};
    var progress = payload.ziweiPdfProgress && typeof payload.ziweiPdfProgress === 'object'
      ? payload.ziweiPdfProgress
      : (payload.progress && typeof payload.progress === 'object' ? payload.progress : payload);
    var completed = Number(progress.completedChapters != null ? progress.completedChapters : payload.completedChapters);
    var current = Number(progress.currentChapterNumber != null ? progress.currentChapterNumber : payload.currentChapterNumber);
    var status = normalizeZiweiServerStatus(progress.status || payload.status || payload.serverStatus);
    var total = Number(progress.totalChapters != null ? progress.totalChapters : payload.totalChapters);
    total = Number.isFinite(total) ? Math.max(1, Math.min(TOTAL_CHAPTERS, Math.trunc(total))) : TOTAL_CHAPTERS;
    completed = Number.isFinite(completed) ? Math.max(0, Math.min(total, Math.trunc(completed))) : 0;
    current = Number.isFinite(current) ? Math.max(1, Math.min(total, Math.trunc(current))) : Math.min(total, completed + 1);
    var title = text(progress.currentChapterTitle || payload.currentChapterTitle || CHAPTERS[current - 1] || '');
    var category = text(progress.currentCategory || payload.currentCategory || '');
    var message = text(progress.currentStepMessage || payload.currentStepMessage || payload.message || '');
    if(!message){
      if(status === 'rendering') message = 'PDF 원고를 조판하고 있습니다.';
      else if(status === 'uploading') message = 'PDF를 저장하고 있습니다.';
      else if(status === 'completed') message = 'PDF 저장이 완료되었습니다.';
      else if(status === 'failed') message = text(progress.errorMessage || payload.errorMessage) || '자미두수 상담문 생성이 중단되었습니다.';
      else if(current === 6) message = '재백궁과 관록궁 흐름을 분석하고 있습니다.';
      else if(completed <= 0) message = '자미두수 명반을 정리하고 있습니다.';
      else message = current + '챕터 상담문을 생성하고 있습니다.';
    }
    return {
      status: status,
      totalChapters: total,
      completedChapters: completed,
      currentChapterNumber: current,
      currentChapterTitle: title,
      currentCategory: category,
      currentStepMessage: message,
      errorMessage: text(progress.errorMessage || payload.errorMessage || '')
    };
  }

  function renderZiweiServerProgress(data){
    var progress = getZiweiProgressPayload(data || {});
    var currentIndex = Math.max(0, progress.currentChapterNumber - 1);
    var completed = progress.completedChapters;
    for(var i=0; i<TOTAL_CHAPTERS; i++){
      var dot = $('zbChDot' + i);
      if(!dot) continue;
      dot.classList.toggle('lb-ch-dot--done', i < completed);
      dot.classList.toggle('lb-ch-dot--active', progress.status !== 'completed' && i === currentIndex && i >= completed);
      dot.classList.toggle('lb-ch-dot--pending', i >= completed && !(progress.status !== 'completed' && i === currentIndex));
      dot.setAttribute('aria-current', progress.status !== 'completed' && i === currentIndex ? 'step' : 'false');
    }
    var total = Math.max(1, Number(progress.totalChapters) || TOTAL_CHAPTERS);
    var countText = completed + ' / ' + total;
    var percent = progress.status === 'completed'
      ? 100
      : (completed <= 0 ? 4 : Math.max(4, Math.min(100, Math.round((completed / total) * 100))));
    var phase = progress.status === 'rendering' || progress.status === 'uploading' || progress.status === 'completed' ? 'archive' : (completed <= 0 ? 'prepare' : 'write');
    setZiweiPhase(phase, progress.currentStepMessage);
    setText('zbLoadingChapterNum', '진행률 ' + countText);
    setText('zbLoadingChapter', progress.currentStepMessage);
    setText('zbMysticQuote', progress.currentStepMessage);
    if($('zbChapterCount')) setText('zbChapterCount', countText);
    else setText('zbProgressText', countText);
    updateProgress(percent, progress.currentStepMessage);
    updateZiweiGenerationState({
      status: progress.status,
      currentChapterNo: progress.currentChapterNumber,
      completedChapters: Array.from({ length: completed }, function(_, index){ return index + 1; }),
      message: progress.currentStepMessage
    });
    return progress;
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
      throw new Error('자미두수 AI 상담을 위해 프로필 카드의 생년월일을 확인해 주세요.');
    }
    if(input.isTimeUnknown || !Number.isFinite(input.birthHour)){
      throw new Error('자미두수 AI 상담은 명궁과 12궁 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.');
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
      : (!hasTime ? '자미두수 AI 상담은 명궁과 12궁 계산을 위해 정확한 출생시가 필요합니다.' : '명반 계산 기준이 정리되었습니다.');

    if(summary){
      summary.innerHTML = ''
        + '<strong>' + esc(name) + '</strong>'
        + '<span style="display:block;margin-top:6px;color:#e9d5ff;">' + esc(dateText + ' · ' + timeText + ' · ' + placeText) + '</span>'
        + '<small style="display:block;margin-top:6px;color:' + (hasDate && hasTime ? '#a7f3d0' : '#fde68a') + ';">' + esc(notice) + '</small>';
    }

    if(btn){
      btn.dataset.zbProfileReady = hasDate && hasTime ? '1' : '0';
      if(!hasDate) setZiweiStartButtonHtml('생년월일 입력하기', 'AI 상담 전 필수');
      else if(!hasTime) setZiweiStartButtonHtml('출생시 입력하기', '정밀 명반 필수');
      else setZiweiStartButtonHtml('자미두수 상담 받기', '59,000원');
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
      throw new Error('자미두수 AI 상담을 위해 생년월일을 입력해 주세요.');
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
      if(window.__cdPremiumAccessToken) return text(window.__cdPremiumAccessToken);
    } catch(e) {}
    try {
      var keys = ['cd_premium_access_token','cd_premium_access','premiumAccessToken','cdPremiumAccessToken','ziweiPremiumAccessToken'];
      for(var i=0;i<keys.length;i++){
        var local = localStorage.getItem(keys[i]) || sessionStorage.getItem(keys[i]);
        if(local) return local;
      }
    } catch(e) {}
    return '';
  }

  function storePremiumToken(token){
    if(!token) return;
    try { window.__cdPremiumAccessToken = token; } catch(e) {}
    try {
      localStorage.setItem('cd_premium_access_token', token);
      sessionStorage.setItem('cd_premium_access_token', token);
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
    if(source.access && typeof source.access === 'object') return source.access;
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
      objectValue(raw, 'access'),
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
    var token = pick(['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token', 'jobToken']) || getPremiumToken();
    var jobToken = pick(['jobToken', 'premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token']);
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
      jobToken: jobToken || token || undefined,
      transactionId: transactionId || undefined,
      requestId: requestId || undefined,
      purchaseId: purchaseId || undefined,
      sessionId: sessionId || undefined,
      reportSessionId: reportSessionId || undefined,
      reportId: pick(['reportId']) || undefined,
      paidAt: pick(['paidAt', 'createdAt']) || undefined,
      birthHash: text(birthHash) || undefined
    };
    context.sourceTransactionId = text(pick(['sourceTransactionId']) || context.transactionId || context.purchaseId || context.requestId) || undefined;
    if(grant) context.accessGrant = grant;
    return context;
  }

  function readAuthorizedZiweiContext(birthHash){
    var candidates = [];
    try {
      candidates.push(window.__ziweiBookAuthorizedContext);
      candidates.push(window.__cdZiweiBookAuthorizedContext);
      candidates.push(window.ziweiBookAuthorizedContext);
    } catch(_) {}
    candidates.push(readPaidSession());
    for(var i = 0; i < candidates.length; i += 1){
      var source = candidates[i];
      if(!source || typeof source !== 'object') continue;
      var savedStatus = text(source.status || 'paid');
      if(source.featureKey && !isZiweiFeatureKey(source.featureKey)) continue;
      if(source.reportType && text(source.reportType) !== 'ziweiPremium') continue;
      if(text(source.birthHash) && text(source.birthHash) !== text(birthHash)) continue;
      if(savedStatus && savedStatus !== 'completed' && !isReusablePaidStatus(savedStatus) && savedStatus !== 'failed') continue;
      var context = normalizePaymentContext(source, birthHash);
      context.reportId = text(source.reportId || context.reportId);
      context.sessionId = text(source.sessionId || source.reportSessionId || context.sessionId);
      context.reportSessionId = text(source.reportSessionId || source.sessionId || context.reportSessionId || context.sessionId);
      context.requestId = text(source.requestId || context.requestId);
      context.premiumAccessToken = text(source.premiumAccessToken || source.accessToken || source.jobToken || context.premiumAccessToken);
      context.jobToken = text(source.jobToken || context.jobToken || context.premiumAccessToken);
      context.transactionId = text(source.transactionId || context.transactionId);
      context.purchaseId = text(source.purchaseId || context.purchaseId);
      context.birthHash = text(birthHash);
      if(source.accessGrant && typeof source.accessGrant === 'object') context.accessGrant = source.accessGrant;
      if(text(context.reportId) && (text(context.sessionId) || text(context.jobToken) || text(context.premiumAccessToken) || context.accessGrant)){
        return Object.assign({}, source, context, {
          ok: true,
          reused: true,
          verified: true,
          status: savedStatus || 'paid'
        });
      }
    }
    return null;
  }

  function requireZiweiPaymentContext(payment, birthHash){
    var context = normalizePaymentContext(payment || {}, birthHash || '');
    var token = text(context.premiumAccessToken || context.jobToken || payment && (payment.premiumAccessToken || payment.accessToken || payment.token || payment.jobToken));
    var transactionOrRequest = text(context.transactionId || context.purchaseId || context.requestId || context.sourceTransactionId);
    var sessionId = text(context.sessionId || context.reportSessionId);
    var reportId = text(context.reportId);
    var hash = text(context.birthHash || birthHash);
    if(!token || !transactionOrRequest || !sessionId || !reportId || !hash){
      throw buildRetryableError('생성 권한 정보가 누락되었습니다. 결제를 다시 확인해 주세요.', 403, 'PAYMENT_EVIDENCE_MISSING', 'payment');
    }
    return Object.assign({}, payment || {}, context, {
      premiumAccessToken: token,
      jobToken: text(context.jobToken || token),
      requestId: text(context.requestId || transactionOrRequest),
      transactionId: text(context.transactionId),
      purchaseId: text(context.purchaseId),
      sessionId: sessionId,
      reportSessionId: text(context.reportSessionId || sessionId),
      reportId: reportId,
      birthHash: hash
    });
  }

  async function ensurePaymentOrRestore(birthInput, options){
    var reuseOnly = Boolean(options && options.reuseOnly);
    var birthHash = makeBirthHash(birthInput || {});
    var scope = getZiweiGenerationScope(birthHash);
    var now = Date.now();

    var cached = readPaidSession();
    if(cached && isSamePaidSessionTarget(cached, birthHash)){
      var verified = await verifyPaidSessionAccess(cached);
      if(verified){
        var cachedStatus = text(cached.status);
        var useCachedGeneration = reuseOnly === true || cachedStatus !== 'failed_retryable';
        if(useCachedGeneration){
          setZiweiGenerationScope({
            birthHash: birthHash,
            sessionId: text(cached.sessionId || cached.reportSessionId) || scope.sessionId,
            reportId: text(cached.reportId) || scope.reportId,
            requestId: text(cached.requestId) || scope.requestId
          });
        } else {
          resetZiweiGenerationScope();
        }
        scope = getZiweiGenerationScope(birthHash);
        var reused = Object.assign({}, cached, {
          ok: true,
          reused: true,
          verified: true,
          sessionId: scope.sessionId,
          reportSessionId: scope.reportSessionId,
          reportId: scope.reportId,
          requestId: useCachedGeneration ? (text(cached.requestId) || scope.requestId) : scope.requestId,
          premiumAccessToken: text(cached.premiumAccessToken) || getPremiumToken(),
          birthHash: birthHash
        });
        logFlow('PaymentReuse', {
          birthHash: birthHash,
          hasToken: Boolean(text(cached && cached.premiumAccessToken)),
          verified: true,
          status: cachedStatus,
          reportType: text(cached.reportType)
        });
        return reused;
      }
      clearPaidSession();
      logFlow('PaymentReuseRejected', {
        birthHash: birthHash,
        hasToken: Boolean(text(cached && cached.premiumAccessToken)),
        status: text(cached && cached.status)
      });
      if(reuseOnly){
        throw buildRetryableError('저장된 결제 세션을 확인하지 못했습니다. 결제를 다시 확인해 주세요.', 402, 'PAYMENT_REUSE_UNVERIFIED', 'payment');
      }
    } else if(cached && isZiweiFeatureKey(cached.featureKey) && reuseOnly !== true) {
      clearPaidSession();
    }

    if(reuseOnly){
      throw buildRetryableError('저장된 결제 세션을 확인하지 못했습니다. 결제를 다시 확인해 주세요.', 402, 'PAYMENT_REUSE_UNVERIFIED', 'payment');
    }

    if(typeof window._cdOpenPaidServiceGate !== 'function' && typeof window._cdCoinGatePerUse !== 'function'){
      throw buildRetryableError('결제 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.', 503, 'PAYMENT_GATE_MISSING', 'payment');
    }

    if(pendingPaymentPromise && pendingPaymentBirthHash === birthHash){
      return pendingPaymentPromise;
    }

    if((isPaymentChecking || isPaymentOpening) && now - paymentGateOpenedAt <= PREVIOUS_PAYMENT_GATE_WINDOW_MS){
      return Promise.reject(buildRetryableError('결제창을 여는 중입니다. 잠시만 기다려 주세요.', 429, 'PAYMENT_OPEN_IN_PROGRESS', 'payment'));
    }

    var requestId = scope.requestId || (FEATURE_KEY + '-ziwei-' + now + '-' + Math.random().toString(36).slice(2, 8));
    var requestSeed = {
      title: ziweiBookText('premiumPdfTitle'),
      reason: ziweiBookText('premiumPdfReason'),
      coinPrice: COIN_COST,
      cost: COIN_COST,
      featureKey: FEATURE_KEY,
      categoryKey: 'premium-pdf',
      subFeatureKey: FEATURE_KEY,
      mode: 'personal',
      reportMode: 'personal',
      reportType: 'ziweiPremium',
      serviceKey: 'ziwei-book',
      requestId: requestId,
      reportId: scope.reportId,
      sessionId: scope.sessionId,
      reportSessionId: scope.reportSessionId
    };

    pendingPaymentBirthHash = birthHash;
    pendingPaymentPromise = (async function(){
      isPaymentChecking = true;
      isPaymentOpening = true;
      paymentRequestId = requestId;
      paymentGateOpenedAt = Date.now();

      function buildPaymentContext(result){
        var paymentContext = normalizePaymentContext(result, birthHash);
        var token = text(paymentContext.premiumAccessToken) || getPremiumToken();
        if(token) storePremiumToken(token);

        paymentContext.featureKey = FEATURE_KEY;
        paymentContext.reportType = 'ziweiPremium';
        paymentContext.birthHash = birthHash;
        paymentContext.premiumAccessToken = token || undefined;
        paymentContext.requestId = text(paymentContext.requestId) || requestId;
        paymentContext.sessionId = text(paymentContext.sessionId) || scope.sessionId;
        paymentContext.reportSessionId = text(paymentContext.reportSessionId) || paymentContext.sessionId || scope.reportSessionId;
        paymentContext.reportId = text(paymentContext.reportId) || scope.reportId;
        return paymentContext;
      }

      function finalizeGrant(result){
        var paymentContext = buildPaymentContext(result);
        paymentContext = requireZiweiPaymentContext(Object.assign({}, result || {}, paymentContext), birthHash);

        var sessionId = text(paymentContext.sessionId);
        var savedSession = writePaidSession(Object.assign({}, paymentContext, {
          sessionId: sessionId,
          premiumAccessToken: text(paymentContext.premiumAccessToken),
          transactionId: text(paymentContext.transactionId),
          paidAt: text(paymentContext.paidAt) || new Date().toISOString(),
          birthHash: birthHash,
          requestId: requestId,
          reportId: text(paymentContext.reportId) || scope.reportId,
          status: 'paid'
        }));
        logFlow('PaymentCreated', {
          birthHash: birthHash,
          requestId: requestId,
          hasToken: Boolean(text(paymentContext.premiumAccessToken)),
          status: 'paid'
        });

        return Object.assign({}, savedSession, result || {}, {
          ok: true,
          reused: false,
          verified: true,
          sessionId: sessionId,
          reportSessionId: text(paymentContext.reportSessionId) || sessionId,
          reportId: text(paymentContext.reportId) || scope.reportId,
          requestId: requestId,
          premiumAccessToken: text(paymentContext.premiumAccessToken),
          birthHash: birthHash,
          accessGrant: paymentContext.accessGrant || undefined,
          payment: paymentContext,
          _paymentContext: paymentContext
        });
      }

      try {
        var gateResult = null;
        if(typeof window._cdOpenPaidServiceGate === 'function'){
          gateResult = await Promise.resolve(window._cdOpenPaidServiceGate(Object.assign({}, requestSeed, {
            action: 'generate'
          })));
        } else {
          gateResult = await new Promise(function(resolve, reject){
            window._cdCoinGatePerUse(
              COIN_COST,
              requestSeed.title,
              function(_transactionId, data){
                resolve(Object.assign({ ok: true, transactionId: _transactionId }, data || {}));
              },
              function(error){
                reject(buildRetryableError((error && error.message) || '결제가 취소되어 생성을 중단했습니다.', 402, 'ZIWEI_PAYMENT_CANCELLED', 'payment'));
              },
              requestSeed
            );
          });
        }

        if(!gateResult || gateResult.status === 'cancelled'){
          throw buildZiweiApiError({ status: 402, body: gateResult }, gateResult && gateResult.message || '결제가 취소되어 생성을 중단했습니다.', 'payment');
        }
        if(gateResult.ok === false){
          throw buildZiweiApiError({ status: Number(gateResult.status || 403), body: gateResult }, gateResult.message || '생성 권한 확인에 실패했습니다. 다시 시도해 주세요.', 'generation');
        }

        return finalizeGrant(gateResult);
      } finally {
        isPaymentChecking = false;
        isPaymentOpening = false;
        paymentRequestId = '';
        paymentGateOpenedAt = Date.now();
      }
    })();

    var wrapped = pendingPaymentPromise.finally(function(){
      if(pendingPaymentBirthHash === birthHash){
        pendingPaymentPromise = null;
        pendingPaymentBirthHash = '';
      }
    });
    pendingPaymentPromise = wrapped;
    return wrapped;
  }

  function buildRetryableError(message, status, code, kind){
    var error = new Error(message || '자미두수 AI 상담 요청에 실패했습니다.');
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
    var fetched = await fetchZiweiApi(url, { method: 'GET' });
    var res = fetched.res;
    var json = fetched.json;
    if(!json) return null;
    var readiness = getZiweiReportReadiness(json);
    if(readiness.failed) return json;
    if(!res.ok && res.status !== 202 && !readiness.processing && !readiness.recoverable) return null;
    if(json.ok !== true && !readiness.processing && !readiness.recoverable) return null;
    return json;
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
      renderZiweiServerProgress(latest);
      var recovered = await fetchZiweiResult(baseSession, baseReport);
      if(recovered){
        latest = recovered;
        renderZiweiServerProgress(latest);
        var recoveredReadiness = getZiweiReportReadiness(recovered);
        logFlow('ReportRecovered', {
          birthHash: text(payment && payment.birthHash),
          chapterCount: Number(recoveredReadiness.chapterCount || 0),
          hasToken: Boolean(text(payment && payment.premiumAccessToken))
        });
        if(recoveredReadiness.completed) return recovered;
        if(recoveredReadiness.failed) return recovered;
        if(!recoveredReadiness.processing && !recoveredReadiness.recoverable) break;
      }
      var delay = Number((latest && (latest.pollAfterMs || latest.retryAfterMs)) || RESULT_POLL_INTERVAL_MS);
      await new Promise(function(resolve){ setTimeout(resolve, Number.isFinite(delay) && delay > 0 ? delay : RESULT_POLL_INTERVAL_MS); });
    }
    var latestReadiness = getZiweiReportReadiness(latest);
    if(latestReadiness.successCandidate || readiness.successCandidate){
      return Object.assign({}, latest || initial, {
        status: latestReadiness.failed ? 'failed' : 'generating',
        chapters: latestReadiness.completed && Array.isArray(latest && latest.chapters) ? latest.chapters : []
      });
    }
    return latest || initial;
  }

  async function postPrepare(profile, seed, payment, birthInput){
    var birthHash = text(payment && payment.birthHash) || makeBirthHash(birthInput || {});
    var scope = getZiweiGenerationScope(birthHash);
    var sessionId = text(payment && (payment.reportSessionId || payment.sessionId)) || scope.sessionId;
    var paymentContext = normalizePaymentContext(Object.assign({}, payment || {}, {
      sessionId: sessionId,
      reportSessionId: sessionId,
      reportId: text(payment && payment.reportId) || scope.reportId,
      requestId: text(payment && payment.requestId) || scope.requestId,
      birthHash: birthHash
    }), birthHash);
    var token = text(paymentContext.premiumAccessToken || paymentContext.jobToken) || (payment && (payment.premiumAccessToken || payment.accessToken || payment.jobToken)) || getPremiumToken();
    var jobToken = text(paymentContext.jobToken || payment && payment.jobToken || token);
    paymentContext.premiumAccessToken = token || undefined;
    paymentContext.jobToken = jobToken || undefined;
    paymentContext.sessionId = text(paymentContext.sessionId) || sessionId;
    paymentContext.reportSessionId = text(paymentContext.reportSessionId) || paymentContext.sessionId || sessionId;
    paymentContext.reportId = text(paymentContext.reportId) || scope.reportId;
    paymentContext.requestId = text(paymentContext.requestId) || scope.requestId;
    var accessGrant = paymentContext.accessGrant && typeof paymentContext.accessGrant === 'object' ? paymentContext.accessGrant : null;
    if(!text(paymentContext.reportId) || !hasPaymentEvidence(Object.assign({}, paymentContext, { premiumAccessToken: token, accessGrant: accessGrant }), birthHash)){
      throw buildRetryableError('생성 권한 정보가 누락되었습니다. 이전 생성 화면에서 다시 시도해 주세요.', 403, 'INVALID_AUTHORIZATION', 'generation');
    }
    var chapterContract = await loadZiweiChapterContract();
    var headers = { 'Content-Type': 'application/json' };
    if(token) headers['x-premium-access-token'] = token;
    if(jobToken) headers['x-ziwei-job-token'] = jobToken;
    var body = {
      featureKey: FEATURE_KEY,
      reportType: 'ziweiPremium',
      mode: 'personal',
      reportMode: 'personal',
      sessionId: sessionId || undefined,
      reportSessionId: paymentContext.reportSessionId || sessionId || undefined,
      idempotencyKey: 'ziwei:' + sessionId + ':' + birthHash,
      birthHash: birthHash,
      premiumAccessToken: token || '',
      jobToken: jobToken || '',
      requestId: text(paymentContext.requestId) || undefined,
      purchaseId: text(paymentContext.purchaseId) || undefined,
      transactionId: text(paymentContext.transactionId) || undefined,
      sourceTransactionId: text(paymentContext.sourceTransactionId || paymentContext.transactionId || paymentContext.purchaseId || paymentContext.requestId) || undefined,
      reportId: text(paymentContext.reportId) || undefined,
      accessGrant: accessGrant || undefined,
      consume: {
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        transactionId: text(paymentContext.transactionId || paymentContext.purchaseId || paymentContext.requestId) || undefined,
        purchaseId: text(paymentContext.purchaseId || paymentContext.transactionId) || undefined,
        requestId: text(paymentContext.requestId) || undefined,
        reportId: text(paymentContext.reportId) || undefined,
        sessionId: sessionId || undefined,
        reportSessionId: paymentContext.reportSessionId || sessionId || undefined,
        premiumAccessToken: token || undefined,
        jobToken: jobToken || undefined,
        accessGrant: accessGrant || undefined
      },
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
      chapterSpecs: chapterContract.specs,
      ziweiBase: seed
    };
    var prepareDiagnostics = buildZiweiPrepareDiagnostics(profile, seed, paymentContext, birthInput, body, PREPARE_API);
    logFlow('PrepareRequest', {
      birthHash: birthHash,
      chapterCount: 0,
      hasToken: Boolean(token),
      hasProfile: prepareDiagnostics.hasProfile,
      hasBirthDate: prepareDiagnostics.hasBirthDate,
      hasBirthTime: prepareDiagnostics.hasBirthTime,
      hasGender: prepareDiagnostics.hasGender,
      hasZiweiChart: prepareDiagnostics.hasZiweiChart,
      hasPalaces: prepareDiagnostics.hasPalaces,
      palaceCount: prepareDiagnostics.palaceCount,
      hasMingGong: prepareDiagnostics.hasMingGong,
      hasShenGong: prepareDiagnostics.hasShenGong,
      hasFourTransformations: prepareDiagnostics.hasFourTransformations,
      apiEndpoint: prepareDiagnostics.apiEndpoint
    });
    logFlow('ZIWEI_PDF_REQUEST_SENT', prepareDiagnostics);
    var fetched = await fetchZiweiApi(PREPARE_API, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    var res = fetched.res;
    var json = fetched.json;
    if(!res.ok || !json.ok){
      var readiness = getZiweiReportReadiness(json || {});
      if(json && (readiness.processing || readiness.failed) && (text(json.reportId) || text(json.sessionId))){
        return json;
      }
      var code = text(json.code || json.error || 'ZIWEI_PREPARE_FAILED');
      var message = text(json.message || json.error || ('자미두수 PDF 생성 요청에 실패했습니다. HTTP ' + res.status));
      var apiError = buildZiweiApiError({ res: res, json: json }, message, (code === 'invalid_authorization' || code === 'INVALID_AUTHORIZATION' || res.status === 403 || res.status === 422 || res.status >= 500) ? 'generation' : 'request');
      apiError.prepareDiagnostics = Object.assign({}, prepareDiagnostics, {
        apiEndpoint: text(fetched && fetched.endpoint) || prepareDiagnostics.apiEndpoint,
        responseStatus: res.status,
        responseCode: code
      });
      logZiweiError('prepare', apiError, apiError.prepareDiagnostics);
      throw apiError;
    }
    if(json.premiumAccessToken || json.accessToken) storePremiumToken(json.premiumAccessToken || json.accessToken);
    return json;
  }

  function buildZiweiAIRequestSeed(seed){
    var source = seed && typeof seed === 'object' ? seed : {};
    var chart = source.chart && typeof source.chart === 'object' ? source.chart : {};
    return {
      chart: {
        mingGong: chart.mingGong,
        shenGong: chart.shenGong,
        fiveElementBureau: chart.fiveElementBureau,
        yearStemBranch: chart.yearStemBranch,
        palaces: Array.isArray(chart.palaces) ? chart.palaces : [],
        lifePalace: chart.lifePalace || null,
        bodyPalace: chart.bodyPalace || null,
        careerPalace: chart.careerPalace || null,
        wealthPalace: chart.wealthPalace || null,
        spousePalace: chart.spousePalace || null,
        friendsPalace: chart.friendsPalace || null,
        parentsPalace: chart.parentsPalace || null,
        siblingsPalace: chart.siblingsPalace || null,
        healthPalace: chart.healthPalace || null,
        propertyPalace: chart.propertyPalace || null,
        travelPalace: chart.travelPalace || null,
        fortunePalace: chart.fortunePalace || null,
        transformations: Array.isArray(chart.transformations) ? chart.transformations : [],
        decadeLuck: Array.isArray(chart.decadeLuck) ? chart.decadeLuck : [],
        annualLuck: Array.isArray(chart.annualLuck) ? chart.annualLuck : []
      },
      localZiweiChartJson: source.localZiweiChartJson || null,
      diagnostics: source.diagnostics || null,
      lifePalace: source.lifePalace || chart.lifePalace || null,
      bodyPalace: source.bodyPalace || chart.bodyPalace || null
    };
  }

  async function postConsultation(profile, seed, payment, birthInput){
    var birthHash = text(payment && payment.birthHash) || makeBirthHash(birthInput || {});
    var scope = getZiweiGenerationScope(birthHash);
    var sessionId = text(payment && (payment.reportSessionId || payment.sessionId)) || scope.sessionId;
    var paymentContext = normalizePaymentContext(Object.assign({}, payment || {}, {
      sessionId: sessionId,
      reportSessionId: sessionId,
      reportId: text(payment && payment.reportId) || scope.reportId,
      requestId: text(payment && payment.requestId) || scope.requestId,
      birthHash: birthHash
    }), birthHash);
    var token = text(paymentContext.premiumAccessToken || paymentContext.jobToken) || (payment && (payment.premiumAccessToken || payment.accessToken || payment.jobToken)) || getPremiumToken();
    var jobToken = text(paymentContext.jobToken || payment && payment.jobToken || token);
    paymentContext.premiumAccessToken = token || undefined;
    paymentContext.jobToken = jobToken || undefined;
    paymentContext.sessionId = text(paymentContext.sessionId) || sessionId;
    paymentContext.reportSessionId = text(paymentContext.reportSessionId) || paymentContext.sessionId || sessionId;
    paymentContext.reportId = text(paymentContext.reportId) || scope.reportId;
    paymentContext.requestId = text(paymentContext.requestId) || scope.requestId;
    var accessGrant = paymentContext.accessGrant && typeof paymentContext.accessGrant === 'object' ? paymentContext.accessGrant : null;
    if(!text(paymentContext.reportId) || !hasPaymentEvidence(Object.assign({}, paymentContext, { premiumAccessToken: token, accessGrant: accessGrant }), birthHash)){
      throw buildRetryableError('상담 권한 정보가 누락되었습니다. 이전 상담 화면에서 다시 시도해 주세요.', 403, 'INVALID_AUTHORIZATION', 'generation');
    }
    var category = ZIWEI_AI_ACTIVE_CATEGORY || 'general';
    var question = readZiweiAIQuestion();
    if(question.length < 5){
      throw buildRetryableError('마음속 질문을 5자 이상 입력해 주세요.', 422, 'ZIWEI_AI_QUESTION_REQUIRED', 'input');
    }
    var headers = { 'Content-Type': 'application/json' };
    if(token) headers['x-premium-access-token'] = token;
    if(jobToken) headers['x-ziwei-job-token'] = jobToken;
    var aiSeed = buildZiweiAIRequestSeed(seed);
    var body = {
      featureKey: FEATURE_KEY,
      reportType: 'ziweiPremium',
      mode: 'personal',
      reportMode: 'personal',
      serviceType: 'ziwei_ai_consultation',
      sessionId: sessionId || undefined,
      reportSessionId: paymentContext.reportSessionId || sessionId || undefined,
      idempotencyKey: 'ziwei-ai:' + sessionId + ':' + birthHash + ':' + toHexHash(category + ':' + question),
      birthHash: birthHash,
      premiumAccessToken: token || '',
      jobToken: jobToken || '',
      requestId: text(paymentContext.requestId) || undefined,
      purchaseId: text(paymentContext.purchaseId) || undefined,
      transactionId: text(paymentContext.transactionId) || undefined,
      sourceTransactionId: text(paymentContext.sourceTransactionId || paymentContext.transactionId || paymentContext.purchaseId || paymentContext.requestId) || undefined,
      reportId: text(paymentContext.reportId) || undefined,
      consultationId: text(paymentContext.reportId || sessionId) || undefined,
      accessGrant: accessGrant || undefined,
      consume: {
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        transactionId: text(paymentContext.transactionId || paymentContext.purchaseId || paymentContext.requestId) || undefined,
        purchaseId: text(paymentContext.purchaseId || paymentContext.transactionId) || undefined,
        requestId: text(paymentContext.requestId) || undefined,
        reportId: text(paymentContext.reportId) || undefined,
        sessionId: sessionId || undefined,
        reportSessionId: paymentContext.reportSessionId || sessionId || undefined,
        premiumAccessToken: token || undefined,
        jobToken: jobToken || undefined,
        accessGrant: accessGrant || undefined
      },
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
      category: category,
      question: question,
      ziweiBase: aiSeed,
      dryRun: false
    };
    var diagnostics = buildZiweiPrepareDiagnostics(profile, seed, paymentContext, birthInput, body, CONSULTATION_API);
    logFlow('ZiweiAIConsultationRequest', Object.assign({}, diagnostics, {
      category: category,
      questionLength: question.length,
      endpoint: CONSULTATION_API
    }));
    var requestText = JSON.stringify(body);
    logFlow('ZiweiAIConsultationPayloadReady', {
      endpoint: CONSULTATION_API,
      category: category,
      questionLength: question.length,
      payloadBytes: requestText.length,
      palaceCount: aiSeed.chart && Array.isArray(aiSeed.chart.palaces) ? aiSeed.chart.palaces.length : 0
    });
    var fetched = await fetchZiweiApi(CONSULTATION_API, { method: 'POST', headers: headers, body: requestText });
    var res = fetched.res;
    var json = fetched.json;
    if(!res.ok || !json.ok){
      var code = text(json && (json.code || json.error)) || 'ZIWEI_AI_CONSULTATION_FAILED';
      var message = text(json && (json.message || json.error)) || ('자미두수 AI 상담 요청에 실패했습니다. HTTP ' + res.status);
      var apiError = buildZiweiApiError({ res: res, json: json }, message, (res.status === 401 || res.status === 402 || res.status === 403) ? 'payment' : 'generation');
      apiError.code = code;
      apiError.stage = text(json && json.stage) || 'ziwei-ai-consultation';
      apiError.paymentRetainedForRetry = Boolean(json && json.paymentRetainedForRetry);
      logZiweiError('ziwei-ai-consultation', apiError, Object.assign({}, diagnostics, {
        responseStatus: res.status,
        responseCode: code
      }));
      throw apiError;
    }
    if(json.premiumAccessToken || json.accessToken) storePremiumToken(json.premiumAccessToken || json.accessToken);
    return json;
  }

  function renderZiweiAITextBlock(value){
    var raw = text(value);
    if(!raw) return '<p>제공된 명반 데이터 범위에서 확인되는 흐름을 중심으로 상담을 이어갑니다.</p>';
    return raw.split(/\n+/).map(function(row){ return text(row); }).filter(Boolean).map(function(row){
      return '<p>' + esc(row) + '</p>';
    }).join('');
  }

  function renderZiweiAIList(items){
    var rows = Array.isArray(items) ? items.map(text).filter(Boolean) : (text(items) ? [text(items)] : []);
    if(!rows.length) return '';
    return '<ul>' + rows.map(function(row){ return '<li>' + esc(row) + '</li>'; }).join('') + '</ul>';
  }

  function renderZiweiAICard(title, bodyHtml){
    var body = text(bodyHtml) ? bodyHtml : '<p>제공된 명반 데이터 안에서 확인되는 단서를 정리하고 있습니다.</p>';
    return '<article class="zb-ai-result-card"><h4>' + esc(title) + '</h4>' + body + '</article>';
  }

  function renderZiweiAIResult(data){
    ensureZiweiAIConsultationStyle();
    ensureZiweiA11yState();
    applyZiweiAIConsultationCopy();
    var box = $('zbResultContent');
    if(!box) return;
    var result = data && data.result ? data.result : {};
    var chartCore = result.chartCore || {};
    var starPatterns = result.starPatterns || {};
    var transformations = result.transformations || {};
    var luckFlow = result.luckFlow || {};
    var timing = result.timing || {};
    var palaces = Array.isArray(result.topicPalaces) ? result.topicPalaces : [];
    var cards = [];
    cards.push(renderZiweiAICard('상담 요약', renderZiweiAITextBlock(result.summary)));
    cards.push(renderZiweiAICard('명반 핵심', ''
      + '<p><strong>명궁</strong> ' + esc(chartCore.lifePalace || (data.chartSummary && data.chartSummary.lifePalace) || '제공 데이터 없음') + '</p>'
      + '<p><strong>신궁</strong> ' + esc(chartCore.bodyPalace || (data.chartSummary && data.chartSummary.bodyPalace) || '제공 데이터 없음') + '</p>'
      + '<p><strong>오행국</strong> ' + esc(chartCore.fiveElementClass || (data.chartSummary && data.chartSummary.fiveElementClass) || '제공 데이터 없음') + '</p>'
      + renderZiweiAITextBlock(chartCore.coreInterpretation)));
    if(palaces.length){
      cards.push(renderZiweiAICard('질문과 연결된 궁', '<div class="zb-ai-palace-list">' + palaces.map(function(item){
        return '<div class="zb-ai-palace-item"><strong>' + esc(item.palaceName || '관련 궁') + '</strong><p>' + esc(item.reason || '') + '</p>' + renderZiweiAITextBlock(item.interpretation) + '</div>';
      }).join('') + '</div>'));
    }
    cards.push(renderZiweiAICard('별의 배치', ''
      + renderZiweiAIList([].concat(starPatterns.majorStars || [], starPatterns.supportingStars || [], starPatterns.challengingStars || []))
      + renderZiweiAITextBlock(starPatterns.interpretation)));
    cards.push(renderZiweiAICard('사화의 작용', ''
      + renderZiweiAIList([transformations.lu, transformations.quan, transformations.ke, transformations.ji].filter(Boolean))
      + renderZiweiAITextBlock(transformations.interpretation)));
    cards.push(renderZiweiAICard('대한과 유년 흐름', ''
      + renderZiweiAIList([luckFlow.decadeLuck, luckFlow.annualLuck].filter(Boolean))
      + renderZiweiAITextBlock(luckFlow.interpretation)));
    cards.push(renderZiweiAICard('기회와 주의할 시기', ''
      + renderZiweiAIList([].concat(timing.opportunities || [], timing.cautions || []))
      + renderZiweiAITextBlock(timing.note)));
    cards.push(renderZiweiAICard('현실적인 행동 전략', renderZiweiAIList(result.actionGuide) || renderZiweiAITextBlock('지금 통제할 수 있는 선택부터 차분히 정리해 보세요.')));
    cards.push(renderZiweiAICard('마지막 조언', renderZiweiAITextBlock(result.closingMessage)));
    cards.push(renderZiweiAICard('후속 질문 추천', renderZiweiAIList(result.followUpQuestions) || renderZiweiAITextBlock('다음에는 특정 궁이나 올해 흐름을 더 좁혀 물어보면 상담이 깊어집니다.')));
    box.innerHTML = '<div class="zb-ai-result-grid">' + cards.join('') + '</div>';
    var toc = $('zbToc');
    if(toc) toc.style.display = 'none';
    var title = $('zbResultScreen') ? $('zbResultScreen').querySelector('.lb-result__title') : null;
    if(title) stripZiweiTransAttrs(title).textContent = '자미두수 상담이 열렸습니다.';
    setText('zbResultName', text(data.categoryLabel || '자미두수 AI 상담'));
    setText('zbResultDate', '명반, 12궁, 사화, 대한과 유년 흐름 기반');
    setDisplay('zbStartScreen','none');
    setDisplay('zbLoadingScreen','none');
    setDisplay('zbErrorScreen','none');
    setDisplay('zbResultScreen','block');
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
        + '<button type="button" class="lb-result__pdf-btn" id="zbTopPdfBtn">PDF 다운로드</button>';
      header.appendChild(topActions);
    }

    var cover = '<div class="zb-result-cover"><img src="' + esc(COVER_IMAGE) + '" alt="' + esc(ziweiBookText('coverAlt')) + '"><div><p>PURPLE STAR ARCHIVE</p><h3>' + esc(ziweiBookText('premiumPdfTitle')) + '</h3><span>' + esc(chapters.length) + '챕터 생성 완료</span>' + renderZiweiQualityBadge(data) + '</div></div>';
    var v3Ready = hasZiweiV3LlmAssembly(data);
    var html = chapters.map(function(chapter, index){
      if(v3Ready){
        return renderZiweiLlmChapterHtml(chapter, index) || (
          '<article class="lb-result-article" id="zbChapterSection-' + (index + 1) + '">'
          + '<header class="lb-result-article__head"><span class="lb-result-article__chapter">Chapter ' + (index + 1) + '</span><h3 class="lb-result-article__title">' + esc(text(chapter && chapter.title) || CHAPTERS[index] || '') + '</h3></header>'
          + '<p class="lb-result-article__summary">이 장의 원고를 불러오지 못했습니다. 리포트를 다시 열어 주세요.</p>'
          + '</article>'
        );
      }
      var categories = Array.isArray(chapter.categories) ? chapter.categories : [];
      var catHtml = categories.map(function(cat){
        return '<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">' + esc(cat.title) + '</h4>' + renderZiweiCategoryText(cat.finalText || cat.text || '') + '</section>';
      }).join('');
      var chapterTitle = text(chapter.title || CHAPTERS[index] || '');
      var summary = text(chapter.summary || '해당 챕터의 핵심 흐름을 정리했습니다.');
      return ''
        + '<article class="lb-result-article" id="zbChapterSection-' + (index + 1) + '">' 
        + '<header class="lb-result-article__head"><span class="lb-result-article__chapter">Chapter ' + (index + 1) + '</span><h3 class="lb-result-article__title">' + esc(chapterTitle) + '</h3></header>'
        + '<p class="lb-result-article__summary">' + esc(summary) + '</p>'
        + catHtml
        + '</article>';
    }).join('');
    box.innerHTML = cover + html + '<div class="zb-result-bottom-download"><button type="button" class="lb-result__pdf-btn" id="zbBottomPdfBtn">PDF 다운로드</button></div>';

    var bottomActions = $('zbResultScreen') ? $('zbResultScreen').querySelector('.lb-result__actions') : null;
    if(bottomActions){
      bottomActions.innerHTML = ''
        + '<button class="lb-result__pdf-btn" id="zbPdfBtn" onclick="downloadZiweiBookPdf()">📥 PDF 다운로드</button>'
        + '<button class="lb-result__close-btn" data-action="closeZiweiBookModal">닫기</button>';
    }

    var topPdfBtn = $('zbTopPdfBtn');
    if(topPdfBtn) topPdfBtn.onclick = function(){ window.downloadZiweiBookPdf(); };
    var bottomPdfBtn = $('zbBottomPdfBtn');
    if(bottomPdfBtn) bottomPdfBtn.onclick = function(){ window.downloadZiweiBookPdf(); };

    setDisplay('zbStartScreen','none');
    setDisplay('zbLoadingScreen','none');
    setDisplay('zbResultScreen','block');
    bindResultToc();
    ensureErrorActions();
  }

  function isRestorableZiweiSession(session){
    var saved = session || {};
    var status = text(saved.status);
    return isZiweiFeatureKey(saved.featureKey)
      && text(saved.reportType) === 'ziweiPremium'
      && (status === 'generating' || status === 'paid')
      && Boolean(text(saved.sessionId || saved.reportSessionId))
      && Boolean(text(saved.reportId));
  }

  function showRestoredZiweiProgress(session){
    setDisplay('zbStartScreen','none');
    setDisplay('zbNoProfileScreen','none');
    setDisplay('zbResultScreen','none');
    setDisplay('zbErrorScreen','none');
    setDisplay('zbLoadingScreen','block');
    renderZiweiServerProgress({
      status: 'generating',
      reportId: text(session && session.reportId),
      sessionId: text(session && (session.sessionId || session.reportSessionId)),
      completedChapters: Number(session && session.completedChapters) || 0,
      currentChapterNumber: Number(session && session.currentChapterNumber) || 1,
      currentStepMessage: '자미두수 PDF를 생성하는 중입니다.'
    });
  }

  function restoreZiweiOpenSession(session){
    if(RESTORE_IN_FLIGHT) return;
    RESTORE_IN_FLIGHT = true;
    (async function(){
      var saved = session || {};
      try {
        showRestoredZiweiProgress(saved);
        var chapterContract = await loadZiweiChapterContract();
        var recovered = await recoverPendingResult({
          sessionId: text(saved.sessionId || saved.reportSessionId),
          reportId: text(saved.reportId),
          status: 'generating',
          retryable: true
        }, saved);
        var readiness = getZiweiReportReadiness(recovered);
        renderZiweiServerProgress(recovered);
        if(readiness.completed){
          assertZiweiCompletedContract(recovered, chapterContract);
          RESULT = recovered;
          writePaidSession({
            featureKey: FEATURE_KEY,
            reportType: 'ziweiPremium',
            sessionId: text(recovered.sessionId || saved.sessionId || saved.reportSessionId),
            reportSessionId: text(recovered.reportSessionId || recovered.sessionId || saved.reportSessionId || saved.sessionId),
            reportId: text(recovered.reportId || saved.reportId),
            premiumAccessToken: text(saved.premiumAccessToken || saved.accessToken || saved.jobToken),
            jobToken: text(saved.jobToken || saved.premiumAccessToken || saved.accessToken),
            transactionId: text(saved.transactionId),
            requestId: text(saved.requestId),
            birthHash: text(saved.birthHash),
            paidAt: text(saved.paidAt),
            status: 'completed'
          });
          renderResult(recovered);
          return;
        }
        if(readiness.failed){
          writePaidSession({
            status: 'failed_retryable',
            reportId: text(recovered.reportId || saved.reportId),
            sessionId: text(recovered.sessionId || saved.sessionId || saved.reportSessionId)
          });
          RESULT = recovered;
          showError(text(recovered.errorMessage || recovered.message) || '자미두수 PDF 생성이 중단되었습니다. 다시 생성해 주세요.', recovered);
          return;
        }
        writePaidSession({
          status: 'generating',
          reportId: text(recovered.reportId || saved.reportId),
          sessionId: text(recovered.sessionId || saved.sessionId || saved.reportSessionId)
        });
        RESULT = recovered;
        showRestoredZiweiProgress(Object.assign({}, saved, recovered));
      } catch(error) {
        showError(mapErrorMessage(error), error);
      } finally {
        RESTORE_IN_FLIGHT = false;
      }
    })();
  }

  async function reopenPreviousReport(){
    var saved = readPaidSession();
    if(!saved || !text(saved.reportId)){
      showError('재열람 가능한 이전 리포트가 없습니다.');
      return;
    }
    var recovered = await recoverPendingResult({
      sessionId: text(saved.sessionId),
      reportId: text(saved.reportId),
      status: text(saved.status) || 'processing',
      retryable: true
    }, saved);
    if(!recovered){
      showError('이전 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    var readiness = getZiweiReportReadiness(recovered);
    if(!readiness.completed){
      writePaidSession({
        status: 'failed_retryable',
        reportId: text(recovered.reportId || saved.reportId),
        sessionId: text(recovered.sessionId || saved.sessionId)
      });
      showError('자미두수 PDF 생성이 아직 완료되지 않았습니다. 잠시 후 다시 이어받아 주세요.', recovered);
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
    if(code === 'ZIWEI_PROCESSING') return 'processing';
    if(code === 'invalid_authorization' || code === 'INVALID_AUTHORIZATION' || code === 'PAYMENT_EVIDENCE_MISSING' || code === 'ZIWEI_REPORT_RECOVERY_REQUIRED' || code === 'ZIWEI_LLM_REPORT_REQUIRED' || code === 'ZIWEI_PREMIUM_GENERATION_FAILED' || code === 'ZIWEI_PDF_COMPLETION_INVALID' || kind === 'generation' || status === 403 || status >= 500) return 'generation';
    if(/\ud504\ub85c\ud544|\ucd9c\uc0dd \uc2dc\uac04|\ucd9c\uc0dd\uc77c|\uc785\ub825\uac12/.test(msg)) return 'input';
    if(kind === 'payment' || status === 402) return 'payment';
    if(/\uacb0\uc81c(?:\s|\S){0,12}(\ud544\uc694|\uc2e4\ud328|\ucde8\uc18c|\ub204\ub77d)|\uc774\uc6a9\uad8c(?:\s|\S){0,12}(\ud544\uc694|\ubd80\uc871|\ub9cc\ub8cc)/.test(msg)) return 'payment';
    if(/프로필|출생 시간|출생시|생년월일|입력값/.test(msg)) return 'input';
    if(kind === 'payment' || status === 402 || /결제|이용권/.test(msg)) return 'payment';
    return 'general';
  }

  function resolveZiweiErrorTitle(kind){
    if(kind === 'input') return '\ud504\ub85c\ud544 \ubcf4\uc644\uc774 \ud544\uc694\ud569\ub2c8\ub2e4';
    if(kind === 'processing') return 'AI 상담이 준비 중입니다';
    if(kind === 'generation') return 'AI 상담 생성에 실패했습니다';
    if(kind === 'recovery') return '\uc0dd\uc131 \uc0c1\ud0dc\ub97c \uc774\uc5b4\ubc1b\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4';
    return '\uc0dd\uc131 \uc0c1\ud0dc\ub97c \ud655\uc778\ud574 \uc8fc\uc138\uc694';
  }

  function ensureErrorActions(error, message){
    var screen = $('zbErrorScreen');
    if(!screen) return;
    var actions = screen.querySelector('.lb-error__actions');
    if(!actions) return;
    var errorKind = resolveZiweiErrorKind(error || {}, message || '');
    var retryBtn = actions.querySelector('.lb-error__retry:not(#zbOpenPreviousBtn)');
    if(retryBtn){
      retryBtn.removeAttribute('onclick');
      var canRetry = errorKind === 'generation' || errorKind === 'processing' || text(error && (error.status || error.serverStatus)) === 'failed';
      retryBtn.style.display = canRetry ? 'inline-flex' : 'none';
      retryBtn.onclick = function(){ window.generateZiweiBook(true); };
      retryBtn.textContent = '다시 상담 받기';
    }

    var previousBtn = $('zbOpenPreviousBtn');
    if(!previousBtn){
      previousBtn = document.createElement('button');
      previousBtn.id = 'zbOpenPreviousBtn';
      previousBtn.className = 'lb-error__retry';
      previousBtn.style.marginLeft = '8px';
      previousBtn.textContent = '이전 상담 열기';
      previousBtn.onclick = function(){ reopenPreviousReport(); };
      previousBtn.textContent = '완성된 상담 다시 열기';
      actions.appendChild(previousBtn);
    }
    var paid = readPaidSession();
    previousBtn.style.display = errorKind !== 'input' && paid && text(paid.reportId) && text(paid.status) === 'completed' ? 'inline-flex' : 'none';
  }

  function mapErrorMessage(error){
    var status = Number(error && error.status || 0);
    var kind = text(error && error.kind);
    var code = text(error && error.code);
    if(code === 'ZIWEI_PROCESSING'){
      return text(error && error.message) || '자미두수 AI 상담을 준비하는 중입니다. 잠시 후 자동으로 결과를 확인합니다.';
    }
    if(code === 'ZIWEI_REPORT_RECOVERY_REQUIRED' || code === 'ZIWEI_LLM_REPORT_REQUIRED' || code === 'ZIWEI_PREMIUM_GENERATION_FAILED' || code === 'ZIWEI_PDF_COMPLETION_INVALID' || kind === 'generation' || status >= 500){
      return text(error && error.message) || '자미두수 AI 상담 생성이 완료되지 않았습니다. 잠시 후 다시 상담을 받아 주세요.';
    }
    if(code === 'invalid_authorization' || code === 'INVALID_AUTHORIZATION' || kind === 'payment' || status === 401 || status === 402 || status === 403){
      return text(error && error.message) || 'AI 상담 권한을 확인하지 못했습니다. 이전 상담 화면에서 다시 시도해 주세요.';
    }
    if(status === 422){
      return '자미두수 명반 또는 원고 검증 단계에서 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.';
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
    recordZiweiDevTrace('ui', 'VISIBLE_ERROR', {
      kind: errorKind,
      message: msg,
      status: error && error.status,
      code: error && error.code,
      stage: error && error.stage,
      reportId: error && error.reportId,
      sessionId: error && error.sessionId
    });
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
    ensureZiweiAIConsultationStyle();
    ensureZiweiAIConsultationFields();
    applyZiweiAIConsultationCopy();

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

    var paid = readPaidSession();
    var shouldRestore = false;
    if(GENERATING){
      setDisplay('zbStartScreen','none');
      setDisplay('zbNoProfileScreen','none');
      setDisplay('zbResultScreen','none');
      setDisplay('zbErrorScreen','none');
      setDisplay('zbLoadingScreen','block');
      setZiweiAILoadingMessage(1);
    } else if(shouldRestore){
      showRestoredZiweiProgress(paid);
      restoreZiweiOpenSession(paid);
    } else if(!RESULT){
      setDisplay('zbLoadingScreen','none');
      setDisplay('zbResultScreen','none');
      setZiweiPhase('prepare', '자미두수 명반을 정리하고 있습니다.');
      updateProgress(0, '자미두수 명반을 정리하고 있습니다.');
      markChapter(-1);
    }
    ensureErrorActions();

    if(false && paid && text(paid.reportId)){
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
    ensureZiweiAIConsultationStyle();
    ensureZiweiAIConsultationFields();
    applyZiweiAIConsultationCopy();
    setZiweiPhase('prepare', '질문과 명반 기준을 확인하고 있습니다.');
    setGeneratingUiLock(true, '상담 준비 중...');
    RESULT = null;
    resetZiweiGenerationState();
    var sessionId = '';
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
      var question = readZiweiAIQuestion();
      if(question.length < 5){
        throw buildRetryableError('마음속 질문을 5자 이상 입력해 주세요.', 422, 'ZIWEI_AI_QUESTION_REQUIRED', 'input');
      }
      var currentBirthHash = makeBirthHash(resolved.birthInput);
      if(usePaidSessionOnly === true){
        var savedScope = readPaidSession();
        if(savedScope){
          setZiweiGenerationScope({
            birthHash: text(savedScope.birthHash) || currentBirthHash,
            sessionId: text(savedScope.sessionId || savedScope.reportSessionId),
            reportId: text(savedScope.reportId),
            requestId: text(savedScope.requestId)
          });
        }
      } else {
        resetZiweiGenerationScope();
      }
      var generationScope = getZiweiGenerationScope(currentBirthHash);
      updateZiweiGenerationState({ status: 'birthInputValidated' });
      logFlow('GenerationContextStart', {
        hasBirthDate: true,
        hasBirthTime: true,
        birthHour: resolved.birthInput.birthHour
      });
      logFlow('GenerationAuthorizeStart', { featureKey: FEATURE_KEY, reportId: generationScope.reportId, sessionId: generationScope.sessionId });
      setZiweiPhase('prepare', '결제 권한을 확인하고 있습니다.');
      setGeneratingUiLock(true, '결제 확인 중...');
      updateZiweiGenerationState({ status: 'authorizingGeneration' });
      var payment = await ensurePaymentOrRestore(resolved.birthInput, { reuseOnly: usePaidSessionOnly === true });
      payment = requireZiweiPaymentContext(payment, currentBirthHash);
      setZiweiGenerationScope({
        birthHash: text(payment.birthHash) || currentBirthHash,
        sessionId: text(payment.sessionId || payment.reportSessionId),
        reportId: text(payment.reportId) || generationScope.reportId,
        requestId: text(payment.requestId) || generationScope.requestId
      });
      generationScope = getZiweiGenerationScope(currentBirthHash);
      setZiweiPhase('prepare', '자미두수 명반을 정리하고 있습니다.');
      setGeneratingUiLock(true, '명반 계산 중...');
      setDisplay('zbStartScreen','none');
      setDisplay('zbResultScreen','none');
      setDisplay('zbErrorScreen','none');
      setDisplay('zbLoadingScreen','block');
      markChapter(-1);
      updateProgress(12, ZIWEI_AI_LOADING_LINES[0]);
      setZiweiPhase('calculate', '명궁과 12궁 흐름을 정리하고 있습니다.');
      updateZiweiGenerationState({ status: 'calculating' });
      var profile = resolved.profileForEngine;
      var seed = await buildZiweiSeed(profile);
      startZiweiAILoading();
      writePaidSession({
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        sessionId: generationScope.sessionId,
        reportSessionId: generationScope.reportSessionId,
        reportId: generationScope.reportId,
        requestId: generationScope.requestId,
        premiumAccessToken: text(payment.premiumAccessToken || payment.accessToken || payment.token || payment.jobToken),
        jobToken: text(payment.jobToken || payment.premiumAccessToken || payment.accessToken || payment.token),
        transactionId: text(payment.transactionId),
        paidAt: text(payment.paidAt) || new Date().toISOString(),
        birthHash: text(payment.birthHash) || currentBirthHash,
        status: 'generating_ai_consultation',
        category: ZIWEI_AI_ACTIVE_CATEGORY
      });
      logFlow('GenerationAuthorizeSuccess', {
        hasJobToken: Boolean(payment && (payment.jobToken || payment.premiumAccessToken || payment.accessToken || payment.token))
      });
      sessionId = generationScope.sessionId;
      updateZiweiGenerationState({ status: 'generating_ai_consultation', sessionId: sessionId, currentChapterNo: 1 });
      setZiweiPhase('write', '명반의 별을 읽고 상담문을 정리하고 있습니다.');
      logFlow('ZiweiAIConsultationStart', { endpoint: CONSULTATION_API, category: ZIWEI_AI_ACTIVE_CATEGORY, questionLength: question.length });
      var data = await postConsultation(profile, seed, Object.assign({}, payment, generationScope, { sessionId: sessionId }), resolved.birthInput);
      RESULT = data;
      logFlow('ZiweiAIConsultationSuccess', {
        provider: text(data && data.provider),
        model: text(data && data.model),
        isMock: Boolean(data && data.isMock),
        dryRun: Boolean(data && data.dryRun)
      });
      setZiweiPhase('archive', '자미두수 상담 결과를 정리하고 있습니다.');
      updateProgress(100, '자미두수 상담이 열렸습니다.');
      updateZiweiGenerationState({ status: 'completed_ai_consultation', reportId: text(data && (data.consultationId || data.reportId)), currentChapterNo: TOTAL_CHAPTERS });
      writePaidSession({
        featureKey: FEATURE_KEY,
        reportType: 'ziweiPremium',
        serviceType: 'ziwei_ai_consultation',
        sessionId: text(data && (data.reportSessionId || data.sessionId)) || sessionId,
        reportSessionId: text(data && (data.reportSessionId || data.sessionId)) || sessionId,
        reportId: text(data && (data.consultationId || data.reportId)) || generationScope.reportId,
        consultationId: text(data && data.consultationId),
        requestId: generationScope.requestId,
        premiumAccessToken: text(payment && (payment.premiumAccessToken || payment.accessToken || payment.token || payment.jobToken)),
        jobToken: text(payment && (payment.jobToken || payment.premiumAccessToken || payment.accessToken || payment.token)),
        transactionId: text(payment && payment.transactionId),
        birthHash: text(payment && payment.birthHash) || currentBirthHash,
        paidAt: text(payment && payment.paidAt) || new Date().toISOString(),
        status: 'completed_ai_consultation',
        category: ZIWEI_AI_ACTIVE_CATEGORY
      });
      renderZiweiAIResult(data);
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
          hasToken: Boolean(text(paid && paid.premiumAccessToken))
        });
      }
      logFlow('Error', normalizedError);
      showError(mapErrorMessage(error), error);
    } finally {
      stopZiweiAILoading();
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
      showError('아직 15챕터가 모두 준비되지 않았습니다. 생성 상태를 이어받아 다시 시도해 주세요.');
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
      var fetched = await fetchZiweiApi(downloadUrl, {
        method: 'GET',
        parse: 'blob'
      });
      var res = fetched.res;
      var blob = fetched.blob;
      if(!res.ok){
        throw new Error('download_http_' + res.status);
      }
      var contentType = text(res.headers.get('content-type'));
      if(contentType.toLowerCase().indexOf('application/pdf') === -1){
        throw new Error('download_invalid_content_type:' + contentType);
      }
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
