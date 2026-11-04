/* 사주 영구 묶음(saju_lifetime_bundle) 안내.
   포함 항목 목록·예시·29,000원·영구 소장 설명·결제 버튼을 한 곳에서 보여 준다.
   - open({source}): 안내를 연다. 저장 프로필이 없으면 프로필 저장 안내를 먼저 보여 준다.
   - isOpen(): 묶음이 해금됐는지(= isTileKeyUnlocked('saju_lifetime_bundle')).
   - renderInline(host): 결과 화면의 한 줄 성향 아래에 붙는 짧은 안내 카드.
   - handleBillingError(status, payload): 결제 응답이 판매 종료(PRODUCT_SALE_ENDED)면 안내를 열고 true.
   결제는 새로 만들지 않는다. 버튼은 index.html 의 data-action="unlockPremiumFeature" 길(tryUnlockFeature)을 그대로 쓴다. */
(function (root) {
  'use strict';

  var BUNDLE_KEY = 'saju_lifetime_bundle';
  var PRICE_LABEL = '29,000원';
  var COIN_COST = 290;
  var OVERLAY_ID = 'cdBundleOffer';
  var INLINE_ATTR = 'data-cd-bundle-inline';

  function t(key, fallback) {
    try {
      if (typeof root.cdTranslate === 'function') {
        var value = root.cdTranslate(key, {}, fallback);
        if (value && value !== key) return String(value);
      }
    } catch (_e) { /* 번역이 없으면 한국어 원문 */ }
    return fallback;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 포함 항목. 회당 상담·궁합 상담·AI 질문 프롬프트 등 생성 모델을 부르는 카드는 넣지 않는다.
  var INCLUDED = [
    '원국 해석 (일주·십성·조후·억부·절기)',
    '라이트 사주 풀이와 대운 분석',
    '궁합 풀이 (정적 섹션)',
    '퀀텀 명리 엔진 · 나의 매력 클래스 · 인생 스킬 트리',
    '명리 건강 리포트 · 에너지 원정 리포트 · 빌런 블랙리스트',
    '오늘의 일진·월운 · 편지 · 오늘의 운명 · 닮은 유명인',
    '로또 번호와 달빛 럭키 리추얼 리포트',
    '극T 기본 · 테토/에겐 (상세 리포트 포함) · 사주 네컷 · 도파민 리포트',
    '내 뇌구조 (휴먼 디자인 해석 포함)',
    '나의 일 스타일 · 동물 운명 테스트 · 시크릿 하우스 입장'
  ];

  var SAMPLE = '예시 · 겉으로는 차분해 보여도 결정 앞에서는 근거를 오래 모으는 편이에요. 그 신중함이 언제 힘이 되고 언제 발목을 잡는지 장별로 풀어 드려요.';

  function isOpen() {
    try {
      return typeof root.isTileKeyUnlocked === 'function' && root.isTileKeyUnlocked(BUNDLE_KEY) === true;
    } catch (_e) {
      return false;
    }
  }

  // 묶음 또는 그 키 자체의 보유로 열리는지. 로또 번호·테토/에겐 상세처럼 키별 보유가 있는 카드가 쓴다.
  function isKeyOpen(key) {
    if (isOpen()) return true;
    try {
      return typeof root.isTileKeyUnlocked === 'function' && root.isTileKeyUnlocked(key) === true;
    } catch (_e) {
      return false;
    }
  }
  function isLottoOpen() {
    return isKeyOpen('rpt_lottoCard') || isKeyOpen('fun.quantumLotto.ritualReport');
  }

  // 잠긴 쪽 정리. 다른 프로필·직접 입력으로 바뀌었을 때 앞 프로필의 카드 내용이 남지 않게 비우고 숨긴다.
  var CARD_GROUPS = {
    bundle: [['dailyMonthlyCard', ['dailyPanel', 'monthlyPanel']], ['letterBox', ['letterContent']], ['similarCelebCard', ['similarCelebResult']], ['destinySection', []]],
    lotto: [['lottoCard', ['lottoSection']]],
    shared: [['tTestCard', ['tTestResult']], ['dopamineCard', ['dopamineResult']], ['sajuFourCutCard', ['sajuFourCutResult']]],
    hormone: [['hormone-vibe-section', ['hormoneVibeResult']]]
  };
  function clearCards(group) {
    var doc = root.document;
    var list = CARD_GROUPS[group];
    if (!doc || !list) return;
    for (var i = 0; i < list.length; i += 1) {
      var card = doc.getElementById(list[i][0]);
      if (card) card.style.display = 'none';
      for (var j = 0; j < list[i][1].length; j += 1) {
        var inner = doc.getElementById(list[i][1][j]);
        if (inner) inner.innerHTML = '';
      }
    }
    if (group === 'lotto') { try { root.__cdLottoRitualState = null; } catch (_e) { /* 선택 */ } }
    if (group === 'bundle') { try { root.quantumProfile = null; } catch (_e) { /* 선택 */ } }
  }

  function savedProfileId() {
    try {
      return typeof root.cdBirthScopeCurrentProfileId === 'function' ? String(root.cdBirthScopeCurrentProfileId() || '').trim() : '';
    } catch (_e) {
      return '';
    }
  }

  function notice(message) {
    try {
      if (typeof root.showToast === 'function') root.showToast(message);
    } catch (_e) { /* 토스트가 없으면 패널 안 문구만 쓴다 */ }
  }

  function payButtonHtml() {
    return '<button type="button" class="cd-bundle-offer__pay" data-action="unlockPremiumFeature"'
      + ' data-unlock-key="' + BUNDLE_KEY + '" data-unlock-cost="' + COIN_COST + '">'
      + esc(t('saju.bundle.pay', PRICE_LABEL + '으로 영구 소장하기')) + '</button>';
  }

  function saveButtonHtml() {
    return '<button type="button" class="cd-bundle-offer__save" data-cd-bundle-save-profile>'
      + esc(t('saju.bundle.saveProfile', '이 출생 정보를 프로필로 저장하기')) + '</button>';
  }

  function detailHtml(profileMissing) {
    var items = INCLUDED.map(function (line) { return '<li>' + esc(t('saju.bundle.item.' + INCLUDED.indexOf(line), line)) + '</li>'; }).join('');
    var guidance = profileMissing
      ? '<p class="cd-bundle-offer__guide" role="status" data-cd-bundle-profile-guide>'
        + esc(t('payment.birthScope.saveProfileFirst', '프로필을 저장한 뒤 구매해 주세요'))
        + ' ' + esc(t('saju.bundle.saveProfileHint', '출생 정보를 프로필 카드로 저장하면 이 사주에 묶음이 영구히 붙어요.')) + '</p>'
      : '';
    return '<div class="cd-bundle-offer__panel" role="dialog" aria-modal="true" aria-labelledby="cdBundleOfferTitle">'
      + '<button type="button" class="cd-bundle-offer__close" data-cd-bundle-close aria-label="' + esc(t('saju.bundle.close', '닫기')) + '">×</button>'
      + '<h3 id="cdBundleOfferTitle" class="cd-bundle-offer__title">' + esc(t('saju.bundle.title', '사주 전체 풀이 묶음')) + '</h3>'
      + '<p class="cd-bundle-offer__price"><strong>' + PRICE_LABEL + '</strong> · ' + esc(t('saju.bundle.once', '한 번 결제로 영구 소장')) + '</p>'
      + '<ul class="cd-bundle-offer__list">' + items + '</ul>'
      + '<p class="cd-bundle-offer__sample">' + esc(t('saju.bundle.sample', SAMPLE)) + '</p>'
      + '<p class="cd-bundle-offer__own">' + esc(t('saju.bundle.own', '구매한 생년월일의 사주에 영구히 붙고, 이용 기간이나 다시 결제할 일이 없어요. 상담·궁합 상담처럼 그때그때 만드는 콘텐츠는 묶음에 포함되지 않아요.')) + '</p>'
      + guidance
      + (profileMissing ? saveButtonHtml() : payButtonHtml())
      + '</div>';
  }

  var STYLE_ID = 'cdBundleOfferStyle';
  function ensureStyle() {
    if (!root.document || root.document.getElementById(STYLE_ID)) return;
    var style = root.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '#' + OVERLAY_ID + '{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,8,24,.62)}'
      + '#' + OVERLAY_ID + '[hidden]{display:none}'
      + '.cd-bundle-offer__panel{position:relative;width:min(440px,100%);max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;padding:22px 18px;border-radius:16px;background:#fff;color:#1f1b2d;box-shadow:0 18px 60px rgba(0,0,0,.4)}'
      + '.cd-bundle-offer__close{position:absolute;top:8px;right:10px;min-width:44px;min-height:44px;border:0;background:transparent;font-size:1.5rem;cursor:pointer;color:inherit}'
      + '.cd-bundle-offer__title{margin:0 40px 6px 0;font-size:1.1rem}'
      + '.cd-bundle-offer__price{margin:0 0 10px;font-size:.92rem}.cd-bundle-offer__price strong{font-size:1.2rem}'
      + '.cd-bundle-offer__list{margin:0 0 10px;padding-left:18px;font-size:.86rem;line-height:1.6;word-break:keep-all}'
      + '.cd-bundle-offer__sample,.cd-bundle-offer__own,.cd-bundle-offer__guide{margin:0 0 10px;font-size:.82rem;line-height:1.6;word-break:keep-all;color:#4b4560}'
      + '.cd-bundle-offer__pay,.cd-bundle-offer__more,.cd-bundle-offer__save{display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;border:0;border-radius:10px;font-weight:800;font-size:.9rem;cursor:pointer;background:linear-gradient(90deg,#ffd54f,#ff8c00);color:#1a0a3a}'
      + '.cd-bundle-inline{margin:12px 0;padding:14px;border-radius:14px;border:1px solid rgba(187,163,113,.5);background:rgba(255,248,230,.6);color:#1f1b2d}'
      + '.cd-bundle-inline__title{margin:0 0 4px;font-size:.98rem}.cd-bundle-inline__desc{margin:0 0 10px;font-size:.84rem;line-height:1.55;word-break:keep-all}';
    root.document.head.appendChild(style);
  }

  function close() {
    var el = root.document && root.document.getElementById(OVERLAY_ID);
    if (el) el.hidden = true;
  }

  // 프로필 저장 뒤 안내로 돌아오기 위한 대기 상태. 저장 흐름은 기존 dpSaveProfile(프로필 카드 저장)을 그대로 쓴다.
  var pendingReturn = null;
  var RETURN_POLL_MS = 300;
  var RETURN_MAX_POLLS = 40;
  function resumeAfterProfile() {
    if (!pendingReturn) return;
    if (!savedProfileId()) return;
    var source = pendingReturn.source;
    pendingReturn = null;
    open({ source: source || 'profile-saved' });
  }
  function pollForProfile(token) {
    if (!pendingReturn || pendingReturn.token !== token) return;
    if (savedProfileId()) { resumeAfterProfile(); return; }
    pendingReturn.polls += 1;
    if (pendingReturn.polls >= RETURN_MAX_POLLS) { pendingReturn = null; return; }
    root.setTimeout(function () { pollForProfile(token); }, RETURN_POLL_MS);
  }
  function startProfileSave(source) {
    if (typeof root.dpSaveProfile !== 'function') {
      notice(t('saju.bundle.saveProfileUnavailable', '프로필 카드 화면에서 출생 정보를 저장해 주세요.'));
      return false;
    }
    var token = String(Date.now()) + Math.random().toString(36).slice(2, 6);
    pendingReturn = { source: source, token: token, polls: 0 };
    close();
    try {
      root.dpSaveProfile();
    } catch (_e) {
      pendingReturn = null;
      return false;
    }
    pollForProfile(token);
    return true;
  }
  if (root.addEventListener) {
    ['cd:profile-changed', 'cd:profile-card-published', 'destinyProfileChanged'].forEach(function (name) {
      root.addEventListener(name, function () { try { resumeAfterProfile(); } catch (_e) { /* 안내 복귀는 선택 */ } });
      if (root.document && root.document.addEventListener) root.document.addEventListener(name, function () { try { resumeAfterProfile(); } catch (_e) { /* 선택 */ } });
    });
  }

  function open(options) {
    var doc = root.document;
    if (!doc || !doc.body) return;
    if (isOpen()) {
      notice(t('saju.bundle.already', '이미 묶음을 소장하고 있어요.'));
      return;
    }
    ensureStyle();
    var source = options && options.source ? String(options.source).slice(0, 60) : '';
    var profileMissing = !savedProfileId() || (options && options.requireProfile === true);
    var el = doc.getElementById(OVERLAY_ID);
    if (!el) {
      el = doc.createElement('div');
      el.id = OVERLAY_ID;
      el.addEventListener('click', function (event) {
        var target = event.target;
        if (target === el || (target && target.closest && target.closest('[data-cd-bundle-close]'))) { close(); return; }
        // 결제 길(tryUnlockFeature)이 자기 결제창을 띄우므로 안내는 먼저 걷는다.
        if (target && target.closest && target.closest('.cd-bundle-offer__pay')) close();
        if (target && target.closest && target.closest('[data-cd-bundle-save-profile]')) startProfileSave(el.getAttribute('data-source') || '');
      });
      doc.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });
      doc.body.appendChild(el);
    }
    el.setAttribute('data-source', source);
    el.innerHTML = detailHtml(profileMissing);
    el.hidden = false;
    if (profileMissing) {
      notice(t('payment.birthScope.saveProfileFirst', '프로필을 저장한 뒤 구매해 주세요'));
      try { root.dispatchEvent(new CustomEvent('cd:saju-bundle-profile-guidance', { detail: { source: source } })); } catch (_e) { /* 구독자가 없어도 된다 */ }
    }
    try {
      var focusTarget = el.querySelector('.cd-bundle-offer__pay,[data-cd-bundle-close]');
      if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
    } catch (_e) { /* 포커스는 선택 */ }
  }

  function renderInline(host) {
    if (!host || !root.document) return null;
    if (isOpen()) { removeInline(host); return null; }
    ensureStyle();
    var card = host.querySelector('[' + INLINE_ATTR + ']');
    if (!card) {
      card = root.document.createElement('section');
      card.className = 'cd-bundle-inline';
      card.setAttribute(INLINE_ATTR, '1');
      host.appendChild(card);
    }
    card.innerHTML = '<h3 class="cd-bundle-inline__title">' + esc(t('saju.bundle.inlineTitle', '내 사주를 끝까지 읽어 보고 싶다면')) + '</h3>'
      + '<p class="cd-bundle-inline__desc">' + esc(t('saju.bundle.inlineDesc', '원국 해석, 대운, 오늘의 운세와 재미 콘텐츠까지 한 번 결제로 영구히 열려요.')) + ' (' + PRICE_LABEL + ')</p>'
      + '<button type="button" class="cd-bundle-offer__more" data-cd-bundle-open>' + esc(t('saju.bundle.inlineCta', '묶음 자세히 보기')) + '</button>';
    var more = card.querySelector('[data-cd-bundle-open]');
    if (more && !more._cdBundleBound) {
      more._cdBundleBound = true;
      more.addEventListener('click', function () { open({ source: 'inline' }); });
    }
    return card;
  }

  function removeInline(host) {
    var scope = host || (root.document && root.document);
    if (!scope || !scope.querySelectorAll) return;
    var nodes = scope.querySelectorAll('[' + INLINE_ATTR + ']');
    for (var i = 0; i < nodes.length; i += 1) if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
  }

  function readCode(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var err = payload.error && typeof payload.error === 'object' ? payload.error : null;
    return String(payload.code || (err && err.code) || '').trim();
  }

  function readBundleKey(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var err = payload.error && typeof payload.error === 'object' ? payload.error : null;
    var data = payload.data && typeof payload.data === 'object' ? payload.data : null;
    return String(payload.bundleFeatureKey || (err && err.bundleFeatureKey) || (data && data.bundleFeatureKey) || '').trim();
  }

  function isProfileRequired(status, payload) {
    if (!payload || typeof payload !== 'object') return false;
    var err = payload.error && typeof payload.error === 'object' ? payload.error : null;
    var data = payload.data && typeof payload.data === 'object' ? payload.data : null;
    if (payload.requiresProfile === true || (err && err.requiresProfile === true) || (data && data.requiresProfile === true)) return true;
    var code = readCode(payload);
    return (Number(status) === 400 || Number(status) === 403) && (code === 'MISSING_PROFILE_ID' || code === 'PROFILE_REQUIRED' || code === 'INVALID_PROFILE');
  }

  // 판매 종료 응답(409 PRODUCT_SALE_ENDED + bundleFeatureKey)이면 안내를 열고 true 를 돌려준다.
  // 묶음 또는 판매 종료 키의 결제가 프로필 없음(requiresProfile)으로 막힌 경우도 같은 안내의 프로필 저장 단계로 보낸다(context.featureKey).
  function handleBillingError(status, payload, context) {
    var ctxKey = context && context.featureKey ? String(context.featureKey).trim() : '';
    if (ctxKey && (ctxKey === BUNDLE_KEY || isSaleClosedKey(ctxKey)) && isProfileRequired(status, payload)) {
      open({ source: 'profile-required', requireProfile: true });
      return true;
    }
    var code = readCode(payload);
    if (code !== 'PRODUCT_SALE_ENDED' && !(Number(status) === 409 && readBundleKey(payload) === BUNDLE_KEY)) return false;
    open({ source: 'sale-ended' });
    return true;
  }

  // 해금되면 안내를 걷는다.
  function onUnlocksChanged() {
    if (!isOpen()) return;
    close();
    removeInline();
  }
  if (root.addEventListener) {
    root.addEventListener('cd:unlocks-changed', onUnlocksChanged);
    root.addEventListener('cd:tile-locks-updated', onUnlocksChanged);
  }

  // worker/lib/saju-bundle-policy.js SAJU_BUNDLE_SALE_CLOSED_KEYS 와 같은 목록. 개별 판매가 끝난 키다.
  // 이미 산 사람의 접근은 이 목록이 아니라 기존 잠금 판정(isTileKeyUnlocked)이 지킨다.
  var SALE_CLOSED_KEYS = {
    section_summary: 1, section_daewun: 1, section_compat: 1,
    rpt_quantumCard: 1, rpt_specialCharmCard: 1, rpt_skillTreeCard: 1, rpt_healthReportCard: 1,
    rpt_energyCoordCard: 1, rpt_villainCard: 1, rpt_secretHouseEntryCard: 1,
    'animal-destiny-unlock': 1, 'saju-career-style': 1,
    tetogen_deep_report: 1, 'fun.quantumLotto.ritualReport': 1,
    rpt_lottoCard: 1, // 서버 상품은 아니지만 로또 번호 타일은 묶음 안에 있다(화면 정책).
    travelDestiny: 1, healthReport: 1, rpgCharacter: 1, secretHouseEpisodes: 1
  };
  function isSaleClosedKey(featureKey) {
    var key = String(featureKey || '').trim();
    return !!key && Object.prototype.hasOwnProperty.call(SALE_CLOSED_KEYS, key);
  }

  root.CdSajuBundleOffer = {
    BUNDLE_KEY: BUNDLE_KEY,
    isSaleClosedKey: isSaleClosedKey,
    PRICE_LABEL: PRICE_LABEL,
    open: open,
    close: close,
    isOpen: isOpen,
    isKeyOpen: isKeyOpen,
    isLottoOpen: isLottoOpen,
    clearCards: clearCards,
    isProfileRequired: isProfileRequired,
    startProfileSave: startProfileSave,
    renderInline: renderInline,
    removeInline: removeInline,
    handleBillingError: handleBillingError
  };
})(typeof window !== 'undefined' ? window : globalThis);
