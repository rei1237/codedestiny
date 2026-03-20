// 구글 번역 언어 선택 카드 토글 기능 (DOM 로드 대기)
function initTranslateLangUI() {
  var langWrap = document.querySelector('.translate-lang-wrap');
  var langBtn = document.getElementById('translateLangToggleBtn');
  var langCard = document.getElementById('translateLangCard');
  var langLabel = document.getElementById('translateLangLabel');
  var hideTimer = null;
  var HIDE_DELAY = 30000; // 30초
  window.__cdTranslateInitAttempts = (window.__cdTranslateInitAttempts || 0) + 1;
  
  // 요소가 없으면 제한적으로 재시도 (무한 루프 방지)
  if (!langBtn || !langCard || !langWrap) {
    if (window.__cdTranslateInitAttempts < 120) {
      setTimeout(initTranslateLangUI, 100);
    }
    return;
  }
  
  // 자동 숨김 시작
  function startHideTimer() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function() {
      if (langWrap) {
        langWrap.classList.add('translate-lang-wrap--hidden');
      }
    }, HIDE_DELAY);
  }
  
  // 버튼 표시 및 타이머 리셋
  function showTranslateButton() {
    clearTimeout(hideTimer);
    if (langWrap) {
      langWrap.classList.remove('translate-lang-wrap--hidden');
    }
  }
  
  // 버튼 클릭 시 카드 토글
  langBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    langCard.classList.toggle('active');
    showTranslateButton();
  });
  
  // 바깥 클릭 시 카드 닫기
  document.addEventListener('click', function(e) {
    if (langWrap && !langWrap.contains(e.target)) {
      langCard.classList.remove('active');
    }
  });
  
  // 언어 변경 카드 버튼 핸들러
  // NOTE: Google Translate includedLanguages와 라벨 매핑을 맞춘다.
  var langCodeMap = { 'ko': 'KR', 'en': 'EN', 'ja': 'JP', 'zh-CN': 'CN', 'hi': 'HI', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'nl': 'NL', 'ms': 'MS' };
  var langCodeBtns = document.querySelectorAll('.translate-lang-code');
  Array.prototype.forEach.call(langCodeBtns, function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      var lang = btn.getAttribute('data-lang');
      if (!lang) return;
      
      // 활성 상태 업데이트
      Array.prototype.forEach.call(langCodeBtns, function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      
      // 버튼 레이블 업데이트
      if (langLabel) langLabel.textContent = langCodeMap[lang] || lang.toUpperCase();
      
      // Google Translate 드롭다운 변경 (로딩 지연/중복 인스턴스 대응)
      cdSetGoogleTranslateLanguage(lang, {
        maxAttempts: 60,
        retryDelay: 200,
        fallbackToCookieReload: true
      });
      startHideTimer();
      
      // 카드 닫기
      if (langCard) langCard.classList.remove('active');
    });
  });
}

function cdDispatchNativeChangeEvent(el) {
  if (!el) return;
  try {
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  } catch (_) {}
  try {
    var legacyEvt = document.createEvent('HTMLEvents');
    legacyEvt.initEvent('change', true, false);
    el.dispatchEvent(legacyEvt);
  } catch (_) {}
}

function cdEnsureGoogleTranslateBootstrap() {
  if (typeof window.googleTranslateElementInit === 'function') {
    try { window.googleTranslateElementInit(); } catch (_) {}
    return;
  }

  if (window.__cdGoogleTranslateScriptRequested) return;
  window.__cdGoogleTranslateScriptRequested = true;

  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.onerror = function() {
    window.__cdGoogleTranslateScriptRequested = false;
  };
  document.head.appendChild(script);
}

function cdSetGoogleTranslateLanguage(langCode, options) {
  if (!langCode) return Promise.resolve(false);

  var opts = options || {};
  var attempts = 0;
  var maxAttempts = typeof opts.maxAttempts === 'number' ? opts.maxAttempts : 60;
  var retryDelay = typeof opts.retryDelay === 'number' ? opts.retryDelay : 80;
  var useCookieFallback = opts.fallbackToCookieReload === true;

  function pickGoogleTranslateSelect() {
    var scope = document.getElementById('google_translate_element') || document;
    var selects = scope.querySelectorAll('.goog-te-combo');
    if (selects && selects.length) return selects[0];
    return null;
  }

  function fallbackByCookieOnly() {
    if (!useCookieFallback || !langCode || langCode === 'ko') return;
    var host = window.location.hostname;
    var cookieValue = '/ko/' + langCode;
    var expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
    document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; path=/; SameSite=Lax';
    if (host) {
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=' + host + '; path=/; SameSite=Lax';
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=.' + host + '; path=/; SameSite=Lax';
    }
  }

  // language change가 실제 DOM 번역으로 반영되지 않는 케이스를 대비해,
  // select 변경 전에 cookie를 먼저 세팅한다.
  function setCookieForLang(code) {
    if (!code || code === 'ko') return;
    var host = window.location.hostname;
    var cookieValue = '/ko/' + code;
    var expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
    document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; path=/; SameSite=Lax';
    if (host) {
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=' + host + '; path=/; SameSite=Lax';
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=.' + host + '; path=/; SameSite=Lax';
    }
  }

  function clearCookieForKo() {
    var host = window.location.hostname;
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + host + '; path=/; SameSite=Lax;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.' + host + '; path=/; SameSite=Lax;';
  }

  if (langCode === 'ko') clearCookieForKo();
  else setCookieForLang(langCode);

  return new Promise(function(resolve) {
    function apply() {
      cdEnsureGoogleTranslateBootstrap();
      var selectField = pickGoogleTranslateSelect();
      if (selectField) {
        selectField.value = langCode;
        // 추가 트리거: 내부 동작 타이밍에 따라 'change'만으로 늦게 반영되는 경우가 있다.
        try { selectField.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
        cdDispatchNativeChangeEvent(selectField);
        resolve(true);
        return;
      }
      if (attempts >= maxAttempts) {
        fallbackByCookieOnly();
        resolve(false);
        return;
      }
      attempts++;
      setTimeout(apply, retryDelay);
    }

    apply();
  });
}

function cdForceHideGoogleTranslateBanner() {
  try {
    var styleId = 'cd-hide-google-translate-banner-style';
    if (!document.getElementById(styleId)) {
      var st = document.createElement('style');
      st.id = styleId;
      st.textContent = ''
        + '.goog-te-banner-frame{display:none !important;visibility:hidden !important;height:0 !important;}'
        + '.skiptranslate iframe{display:none !important;}'
        + 'body{top:0 !important;position:static !important;}'
        + 'html{margin-top:0 !important;}';
      document.head.appendChild(st);
    }
  } catch (_) {}

  try {
    var frames = document.querySelectorAll('.goog-te-banner-frame, iframe.goog-te-banner-frame');
    for (var i = 0; i < frames.length; i++) {
      frames[i].style.setProperty('display', 'none', 'important');
      frames[i].style.setProperty('visibility', 'hidden', 'important');
      frames[i].style.setProperty('height', '0', 'important');
    }
    document.body.style.setProperty('top', '0px', 'important');
    document.body.style.setProperty('position', 'static', 'important');
    document.documentElement.style.setProperty('margin-top', '0px', 'important');
  } catch (_) {}
}

function cdInstallGoogleTranslateBannerGuard() {
  cdForceHideGoogleTranslateBanner();
  setTimeout(cdForceHideGoogleTranslateBanner, 120);
  setTimeout(cdForceHideGoogleTranslateBanner, 600);
  setTimeout(cdForceHideGoogleTranslateBanner, 1600);
  if (window.__cdGtBannerGuardInstalled) return;
  window.__cdGtBannerGuardInstalled = true;

  if (typeof MutationObserver === 'function' && document.documentElement) {
    try {
      var obs = new MutationObserver(function() {
        cdForceHideGoogleTranslateBanner();
      });
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    } catch (_) {}
  }
}

// DOM 준비 완료 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    cdInstallGoogleTranslateBannerGuard();
    try { initTranslateLangUI(); } catch (err) { console.warn('[translate-ui] init failed:', err); }
  });
} else {
  cdInstallGoogleTranslateBannerGuard();
  try { initTranslateLangUI(); } catch (err) { console.warn('[translate-ui] init failed:', err); }
}
function syncFeatureCardHeight(card) {
  if (!card) return;
  var detail = card.querySelector('.feature-card__detail');
  var inner = card.querySelector('.feature-card__detail-inner');
  if (!detail || !inner) return;
  if (card.classList.contains('feature-card--open')) {
    var buffer = card.classList.contains('feature-card--destiny-flower') ? 18 : 8;
    detail.style.setProperty('--fc-open-height', (inner.scrollHeight + buffer) + 'px');
  } else {
    detail.style.setProperty('--fc-open-height', '0px');
  }
}

(function() {
  var resizeTicking = false;
  function onResize() {
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(function() {
      resizeTicking = false;
      document.querySelectorAll('.feature-card').forEach(syncFeatureCardHeight);
    });
  }
  window.addEventListener('resize', onResize, { passive: true });
})();

function fcToggle(btn) {
  var card = btn.closest('.feature-card');
  function openByAction(actionName) {
    if (!card || !actionName) return false;
    var fn = window[actionName];
    if (typeof fn === 'function') {
      fn();
      return true;
    }
    var launch = card.querySelector('.feature-card__launch[data-action="' + actionName + '"]');
    if (launch && typeof launch.click === 'function') {
      launch.click();
      return true;
    }
    return false;
  }

  if (card) {
    if (card.classList.contains('feature-card--face') && openByAction('openPhysiognomyApp')) { return; }
    if (card.classList.contains('feature-card--animal') && openByAction('openMbtiModal')) { return; }
    if (card.classList.contains('feature-card--tarot-love') && openByAction('openTarotLoveModal')) { return; }
    if (card.classList.contains('feature-card--tarot-healing') && openByAction('openTarotHealingModal')) { return; }
    if (card.classList.contains('feature-card--tarot-self-esteem') && openByAction('openTarotSelfEsteemModal')) { return; }
    if (card.classList.contains('feature-card--tarot-reunion') && openByAction('openTarotReunionModal')) { return; }
    if (card.classList.contains('feature-card--tarot-year') && openByAction('openTarotYearFortuneModal')) { return; }
    if (card.classList.contains('feature-card--tarot') && openByAction('openTarotModal')) { return; }
    if (card.classList.contains('feature-card--animal-totem') && openByAction('openAnimalTotemModal')) { return; }
    if (card.classList.contains('feature-card--tazza') && openByAction('openHwatuModal')) { return; }
    if (card.classList.contains('feature-card--egypt') && openByAction('openKemetModal')) { return; }
    if (card.classList.contains('feature-card--juyuk') && openByAction('openJuyukModal')) { return; }
    if (card.classList.contains('feature-card--sukuyo') && openByAction('openSukuyoModal')) { return; }
    if (card.classList.contains('feature-card--astro-fc') && openByAction('openAstroModal')) { return; }
    if (card.classList.contains('feature-card--ziwei') && openByAction('openZiweiModal')) { return; }
    if (card.classList.contains('feature-card--destiny-flower') && openByAction('openDestinyFlower')) { return; }
    if (card.classList.contains('feature-card--astrology-flower') && openByAction('openAstrologyFlower')) { return; }
    if (card.classList.contains('feature-card--jamidusu-flower') && openByAction('openJamidusuFlower')) { return; }
    if (card.classList.contains('feature-card--sukuyo-flower') && openByAction('openSukuyoFlower')) { return; }
    if (card.classList.contains('feature-card--dream') && openByAction('openDreamModal')) { return; }
  }

  var open = card.classList.toggle('feature-card--open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', open ? 'false' : 'true');
  syncFeatureCardHeight(card);
  btn.querySelector('.feature-card__cta-label').textContent = open ? '닫기' : btn.dataset.label;
  btn.querySelector('.feature-card__cta-arrow').textContent = open ? '▲' : '▼';
}

function bindFeatureCardVisualActions() {
  var defs = [
    { cardClass: 'feature-card--face', action: 'openPhysiognomyApp' },
    { cardClass: 'feature-card--animal', action: 'openMbtiModal' },
    { cardClass: 'feature-card--tarot-love', action: 'openTarotLoveModal' },
    { cardClass: 'feature-card--tarot-healing', action: 'openTarotHealingModal' },
    { cardClass: 'feature-card--tarot-self-esteem', action: 'openTarotSelfEsteemModal' },
    { cardClass: 'feature-card--tarot-reunion', action: 'openTarotReunionModal' },
    { cardClass: 'feature-card--tarot-year', action: 'openTarotYearFortuneModal' },
    { cardClass: 'feature-card--tarot', action: 'openTarotModal' },
    { cardClass: 'feature-card--animal-totem', action: 'openAnimalTotemModal' },
    { cardClass: 'feature-card--tazza', action: 'openHwatuModal' },
    { cardClass: 'feature-card--egypt', action: 'openKemetModal' },
    { cardClass: 'feature-card--juyuk', action: 'openJuyukModal' },
    { cardClass: 'feature-card--sukuyo', action: 'openSukuyoModal' },
    { cardClass: 'feature-card--astro-fc', action: 'openAstroModal' },
    { cardClass: 'feature-card--ziwei', action: 'openZiweiModal' },
    { cardClass: 'feature-card--destiny-flower', action: 'openDestinyFlower' },
    { cardClass: 'feature-card--astrology-flower', action: 'openAstrologyFlower' },
    { cardClass: 'feature-card--jamidusu-flower', action: 'openJamidusuFlower' },
    { cardClass: 'feature-card--sukuyo-flower', action: 'openSukuyoFlower' },
    { cardClass: 'feature-card--dream', action: 'openDreamModal' }
  ];

  defs.forEach(function(def) {
    var card = document.querySelector('.feature-card.' + def.cardClass);
    if (!card) return;
    ['.feature-card__img-wrap', '.feature-card__img', '.feature-card__title', '.feature-card__desc'].forEach(function(sel) {
      card.querySelectorAll(sel).forEach(function(el) {
        if (!el.getAttribute('data-action')) {
          el.setAttribute('data-action', def.action);
        }
      });
    });
  });
}

function bindFeatureCardImageFallbacks() {
  var defs = [
    { cardClass: 'feature-card--animal-totem', fileName: 'animaltotem.webp' },
    { cardClass: 'feature-card--tarot-year', fileName: '12animals.webp' },
    { cardClass: 'feature-card--tarot-self-esteem', fileName: 'jajongam.webp' },
    { cardClass: 'feature-card--tarot-love', fileName: 'tarolove.webp' }
  ];

  defs.forEach(function(def) {
    var img = document.querySelector('.feature-card.' + def.cardClass + ' .feature-card__img');
    if (!img) return;

    var relativePath = 'fuctionassets/' + def.fileName;
    var absolutePath = '/fuctionassets/' + def.fileName;

    if (!img.dataset.fallbackBound) {
      img.dataset.fallbackBound = '1';
      img.addEventListener('error', function() {
        if (img.dataset.fallbackTried === '1') return;
        img.dataset.fallbackTried = '1';
        img.src = relativePath;
      });
    }

    img.src = absolutePath;
  });
}

function normalizeLegacyFuctionAssetImagePaths() {
  var imgs = document.querySelectorAll('img[src^="fuctionassets/"]');
  imgs.forEach(function(img) {
    var raw = img.getAttribute('src') || '';
    if (!raw || raw.indexOf('fuctionassets/') !== 0) return;
    img.setAttribute('src', '/' + raw);
  });
}

function initFeatureCardBindings() {
  normalizeLegacyFuctionAssetImagePaths();
  bindFeatureCardVisualActions();
  bindFeatureCardImageFallbacks();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFeatureCardBindings, { once: true });
} else {
  initFeatureCardBindings();
}

function __cdResolveEventElement(event) {
  if (!event || !event.target) return null;
  if (event.target instanceof Element) return event.target;
  if (event.target.parentElement instanceof Element) return event.target.parentElement;
  return null;
}

function __cdParseActionArgs(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map(function(v) { return v.trim(); })
    .filter(function(v) { return v.length > 0; });
}

function __cdCallGlobal(fnName) {
  var fn = window[fnName];
  if (typeof fn !== 'function') return undefined;
  var args = Array.prototype.slice.call(arguments, 1);
  return fn.apply(window, args);
}

var __cdLazyActionLoaders = {
  openKemetModal: function() { return __cdLoadScriptOnce('/js/oracle-kcg.js'); },
  openDreamModal: function() { return __cdLoadScriptOnce('/js/dream-ledger.js'); },
  openPsychoDreamModal: function() { return __cdLoadScriptOnce('/js/psycho-dream-analyzer-freuds-study.js'); },
  openTarotLoveModal: function() { return __cdLoadScriptOnce('/js/tarot-love-experience.js?v=20260320-tarot-uifix2'); },
  openTarotReunionModal: function() { return __cdLoadScriptOnce('/js/tarot-reunion-experience.js?v=20260320-tarot-uifix2'); },
  openTarotHealingModal: function() { return __cdLoadScriptOnce('/js/tarot-healing-experience.js?v=20260320-tarot-uifix2'); },
  openTarotSelfEsteemModal: function() { return __cdLoadScriptOnce('/js/tarot-self-esteem-experience.js?v=20260320-tarot-uifix2'); },
  openTarotYearFortuneModal: function() { return __cdLoadScriptOnce('/js/tarot-year-fortune-experience.js?v=20260320-tarot-uifix2'); }
};
var __cdLazyActionState = {};

function __cdNormalizeScriptSrc(src) {
  var raw = String(src || '').trim().replace(/^\.\//, '');
  if (!raw) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(raw) || raw.indexOf('data:') === 0 || raw.indexOf('blob:') === 0) return raw;
  if (raw.charAt(0) === '/') return raw;
  return '/' + raw;
}

function __cdLoadScriptOnce(src) {
  return new Promise(function(resolve, reject) {
    var norm = __cdNormalizeScriptSrc(src);
    if (!norm) {
      reject(new Error('missing src'));
      return;
    }

    var all = document.querySelectorAll('script[src]');
    var fileName = norm.split('?')[0].split('/').pop();
    var existing = null;
    for (var i = 0; i < all.length; i += 1) {
      var cur = all[i].getAttribute('src') || '';
      var curBase = cur.split('?')[0];
      if (cur === norm || curBase === norm.split('?')[0] || (fileName && curBase.indexOf('/' + fileName) !== -1)) {
        existing = all[i];
        break;
      }
    }

    if (existing) {
      if (existing.dataset.loaded === '1' || existing.readyState === 'complete' || existing.readyState === 'loaded') {
        resolve();
        return;
      }
      if (existing.dataset.loading !== '1') {
        resolve();
        return;
      }
      existing.addEventListener('load', function() { resolve(); }, { once: true });
      existing.addEventListener('error', function() { reject(new Error('load failed: ' + src)); }, { once: true });
      return;
    }

    var s = document.createElement('script');
    s.src = norm;
    s.defer = true;
    s.async = true;
    s.dataset.loading = '1';
    s.onload = function() {
      s.dataset.loading = '0';
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = function() { reject(new Error('load failed: ' + src)); };
    document.head.appendChild(s);
  });
}

function __cdInvokeActionWithConfig(action, actionEl, event, args) {
  var passSelfMode = actionEl.getAttribute('data-action-pass-self');
  var passEvent = actionEl.getAttribute('data-action-pass-event') === '1';
  if (passSelfMode === 'append') return __cdCallGlobal.apply(null, [action].concat(args, [actionEl]));
  if (passSelfMode === '1' || passSelfMode === 'prepend') return __cdCallGlobal.apply(null, [action, actionEl].concat(args));
  if (passEvent) return __cdCallGlobal(action, event);
  if (args.length) return __cdCallGlobal.apply(null, [action].concat(args));
  return __cdCallGlobal(action);
}

function __cdInvokeAction(action, actionEl, event) {
  if (!action || !actionEl) return;

  var args = __cdParseActionArgs(actionEl.getAttribute('data-action-args'));
  var out = __cdInvokeActionWithConfig(action, actionEl, event, args);

  var loader = __cdLazyActionLoaders[action];
  var hasFn = typeof window[action] === 'function';
  if (!loader || hasFn || out !== undefined) return;

  if (!__cdLazyActionState[action]) {
    __cdLazyActionState[action] = loader().catch(function(err) {
      console.error('[index-inline-runtime] lazy action load failed:', action, err);
    });
  }

  __cdLazyActionState[action].then(function() {
    if (typeof window[action] !== 'function') return;
    __cdInvokeActionWithConfig(action, actionEl, event, args);
  });
}

function __cdBindActionEventFallback(root, eventName, attrName) {
  root.addEventListener(eventName, function(event) {
    var target = __cdResolveEventElement(event);
    if (!target) return;
    var actionEl = target.closest('[' + attrName + ']');
    if (!actionEl) return;
    var action = actionEl.getAttribute(attrName);
    if (!action) return;
    __cdInvokeAction(action, actionEl, event);
  });
}

function __cdBindGlobalActionsFallback() {
  if (window.__codeDestinyGlobalActionsBound) return;
  window.__codeDestinyGlobalActionsBound = 'fallback';

  var root = document;
  root.addEventListener('click', function(event) {
    var target = __cdResolveEventElement(event);
    if (!target) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    var action = actionEl.getAttribute('data-action');
    if (!action) return;

    if (action === 'closeDestinyFlowerStudio') {
      var sheet = document.getElementById('destinyFlowerStudioSheet');
      if (sheet && target && sheet.contains(target)) return;
    }

    if (actionEl.getAttribute('data-action-self-only') === '1' && target !== actionEl) {
      return;
    }

    if (actionEl.getAttribute('data-action-stop-propagation') === '1') {
      event.stopPropagation();
    }

    if (action === 'changeLanguage') {
      var lang = actionEl.getAttribute('data-lang');
      if (lang) {
        __cdCallGlobal('changeLanguage', lang, actionEl);
      }
      return;
    }

    __cdInvokeAction(action, actionEl, event);
  });

  /* 모바일: modal-top-nav 닫기 버튼 touchend 폴백 (로딩 중 발동 방지: 해당 overlay가 실제 표시 중일 때만) */
  var _cdPageLoadTime = Date.now();
  root.addEventListener('touchend', function(event) {
    var target = __cdResolveEventElement(event);
    if (!target) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var nav = actionEl.closest('.modal-top-nav');
    if (!nav) return;
    var overlay = nav.closest('[id$="ModalOverlay"]');
    if (!overlay) return;
    var computed = window.getComputedStyle ? window.getComputedStyle(overlay) : null;
    if (computed && computed.display === 'none') return;
    if (Date.now() - _cdPageLoadTime < 600) return;
    var action = actionEl.getAttribute('data-action');
    if (!action) return;
    if (action !== 'closeCurrentPage' && action !== 'closeSukuyoModal' && action !== 'closeZiweiModal' && action !== 'closeAstroModal' && action !== 'closeJuyukModal') return;
    event.preventDefault();
    __cdInvokeAction(action, actionEl, event);
  }, { passive: false });

  root.addEventListener('change', function(event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var action = target.getAttribute('data-change-action');
    if (!action) return;
    var args = __cdParseActionArgs(target.getAttribute('data-change-args'));
    __cdCallGlobal.apply(null, [action].concat(args));
  });

  __cdBindActionEventFallback(root, 'mousedown', 'data-mousedown-action');
  __cdBindActionEventFallback(root, 'mouseup', 'data-mouseup-action');
  __cdBindActionEventFallback(root, 'mouseleave', 'data-mouseleave-action');
  __cdBindActionEventFallback(root, 'touchstart', 'data-touchstart-action');
  __cdBindActionEventFallback(root, 'touchend', 'data-touchend-action');
  __cdBindActionEventFallback(root, 'touchcancel', 'data-touchcancel-action');
}

function __cdBindAnimalTotemTileDirect() {
  var sel = '.tarot-tile--animal-totem, [data-action="openAnimalTotemModal"]';
  var touchStart = null;
  var lastTouchStart = null;
  /* 모바일: 스크롤 시 미세 움직임 허용 (36px ≈ 2.5mm, Apple HIG 권장 24px보다 여유) */
  var TAP_THRESH = 36;

  function loadScriptOnce(src) {
    return new Promise(function(resolve, reject) {
      var norm = (src || '').replace(/^\.\//, '');
      var existing = document.querySelector('script[src*="' + norm.split('/').pop() + '"]');
      if (existing && (existing.dataset.loaded === '1' || existing.readyState === 'complete')) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = norm;
      s.defer = true;
      s.async = true;
      s.onload = function() { resolve(); };
      s.onerror = function() { reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function openTotemModal() {
    try {
      var overlay = document.getElementById('animalTotemOverlay');
      if (overlay && (overlay.classList.contains('is-open') || overlay.style.display === 'block')) return;
      var raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
      if (typeof window.openAnimalTotemModal === 'function') {
        raf(function() {
          try { window.openAnimalTotemModal(); } catch (e) { console.error('[totem] open error:', e); }
        });
        return;
      }
      raf(function() {
        loadScriptOnce('js/services/animal-totem-content-engine.js')
          .then(function() { return loadScriptOnce('js/animal-totem-experience.js'); })
          .then(function() {
            try {
              if (typeof window.openAnimalTotemModal === 'function') window.openAnimalTotemModal();
            } catch (e) { console.error('[totem] open error:', e); }
          })
          .catch(function(err) { console.error('[totem] load failed:', err); });
      });
    } catch (err) { console.error('[totem] openTotemModal error:', err); }
  }

  function isTotemTile(el) {
    return el && el.closest && el.closest(sel);
  }
  function handleClick(ev) {
    var target = ev && ev.target;
    if (!target || !isTotemTile(target)) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    openTotemModal();
  }
  function handleTouchStart(ev) {
    var t = ev.touches && ev.touches[0];
    if (t) lastTouchStart = { x: t.clientX, y: t.clientY };
    if (!ev.target || !isTotemTile(ev.target)) return;
    touchStart = t ? { x: t.clientX, y: t.clientY } : null;
  }
  function handleTouchCancel() {
    touchStart = null;
  }
  function handleTouchEnd(ev) {
    if (!ev.changedTouches || !ev.changedTouches[0]) return;
    var t = ev.changedTouches[0];
    var x = t.clientX, y = t.clientY;
    var start = touchStart || lastTouchStart;
    touchStart = null;
    if (start) {
      var dx = Math.abs(x - start.x);
      var dy = Math.abs(y - start.y);
      if (dx > TAP_THRESH || dy > TAP_THRESH) return;
    }
    /* touchStart로 시작했거나, elementFromPoint로 터치 위치가 토템 타일인 경우 (모바일 event.target 부정확 대비) */
    var fromStart = start && isTotemTile(ev.target);
    var elAtPoint = null;
    if (typeof document.elementFromPoint === 'function') {
      elAtPoint = document.elementFromPoint(x, y);
      if ((!elAtPoint || !isTotemTile(elAtPoint)) && lastTouchStart) {
        elAtPoint = document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
      }
    }
    var fromPoint = elAtPoint && isTotemTile(elAtPoint);
    if (fromStart || fromPoint) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      openTotemModal();
    }
  }
  document.addEventListener('click', handleClick, { capture: true });
  document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
  document.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: true });
  document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });

  /* 직접 바인딩: 위임이 실패하는 환경(오버레이/스택 컨텍스트) 대비 */
  function bindDirectToTiles() {
    var tiles = document.querySelectorAll(sel);
    tiles.forEach(function(tile) {
      if (tile._cdTotemDirectBound) return;
      tile._cdTotemDirectBound = true;
      var tileTouchStart = null;
      tile.addEventListener('click', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        openTotemModal();
      });
      tile.addEventListener('touchstart', function(ev) {
        var t = ev.touches && ev.touches[0];
        tileTouchStart = t ? { x: t.clientX, y: t.clientY } : null;
      }, { passive: true });
      tile.addEventListener('touchend', function(ev) {
        if (!ev.changedTouches || !ev.changedTouches[0]) return;
        var t = ev.changedTouches[0];
        var x = t.clientX, y = t.clientY;
        var start = tileTouchStart;
        tileTouchStart = null;
        if (start) {
          var dx = Math.abs(x - start.x);
          var dy = Math.abs(y - start.y);
          if (dx > TAP_THRESH || dy > TAP_THRESH) return;
        } else {
          /* touchstart 미수신 시 elementFromPoint로 터치 해제 위치 확인 (모바일 대응) */
          var elAt = (typeof document.elementFromPoint === 'function') ? document.elementFromPoint(x, y) : null;
          if (!elAt || !tile.contains(elAt)) return;
        }
        if (ev.cancelable) ev.preventDefault();
        openTotemModal();
      }, { passive: false });
    });
  }
  bindDirectToTiles();
  /* 동적 삽입 대비: 스플래시 제거 후 재바인딩 */
  var splash = document.getElementById('codeSplash');
  if (splash && splash.parentNode) {
    var obs = new MutationObserver(function() {
      if (!document.getElementById('codeSplash')) {
        obs.disconnect();
        bindDirectToTiles();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
}

/**
 * 운명의 꽃 타일 — 모바일 터치 직접 바인딩
 * click 이벤트가 스크롤/스와이프와 충돌해 모바일에서 미발동하는 문제 해결
 */
function __cdBindDestinyFlowerTileDirect() {
  var sel = '.tarot-tile--bloom, .tarot-tile--astro-flower, .tarot-tile--jami-flower, .tarot-tile--sukuyo-fl, [data-action="openDestinyFlowerStudio"], [data-action="openAstrologyFlowerStudio"], [data-action="openJamidusuFlowerStudio"], [data-action="openSukuyoFlowerStudio"]';
  var touchStart = null;
  var lastTouchStart = null;
  var lastOpenTime = 0;
  var TAP_THRESH = 36;
  var DEBOUNCE_MS = 400;

  function isFlowerTile(el) {
    return el && el.closest && el.closest(sel);
  }

  function openFlowerStudio(actionEl) {
    var now = Date.now();
    if (now - lastOpenTime < DEBOUNCE_MS) return;
    lastOpenTime = now;
    var action = actionEl && actionEl.getAttribute('data-action');
    if (!action) return;
    var fn = window[action];
    if (typeof fn === 'function') fn();
  }

  function handleClick(ev) {
    var target = ev && ev.target;
    if (!target || !isFlowerTile(target)) return;
    var actionEl = target.closest(sel);
    if (!actionEl) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    openFlowerStudio(actionEl);
  }

  function handleTouchStart(ev) {
    var t = ev.touches && ev.touches[0];
    if (t) lastTouchStart = { x: t.clientX, y: t.clientY };
    if (!ev.target || !isFlowerTile(ev.target)) return;
    touchStart = t ? { x: t.clientX, y: t.clientY } : null;
  }

  function handleTouchCancel() {
    touchStart = null;
  }

  function handleTouchEnd(ev) {
    if (!ev.changedTouches || !ev.changedTouches[0]) return;
    var t = ev.changedTouches[0];
    var x = t.clientX, y = t.clientY;
    var start = touchStart || lastTouchStart;
    touchStart = null;
    if (start) {
      var dx = Math.abs(x - start.x);
      var dy = Math.abs(y - start.y);
      if (dx > TAP_THRESH || dy > TAP_THRESH) return;
    }
    /* touchStart로 시작했거나, elementFromPoint로 터치 해제 위치가 꽃 타일인 경우 (모바일 event.target 부정확 대비) */
    var fromStart = start && isFlowerTile(ev.target);
    var elAtPoint = (typeof document.elementFromPoint === 'function') ? document.elementFromPoint(x, y) : null;
    var fromPoint = elAtPoint && isFlowerTile(elAtPoint);
    var actionEl = (fromStart && ev.target.closest(sel)) || (fromPoint && elAtPoint.closest(sel));
    if (actionEl) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      openFlowerStudio(actionEl);
    }
  }

  document.addEventListener('click', handleClick, { capture: true });
  document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
  document.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: true });
  document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });

  function bindDirectToTiles() {
    var tiles = document.querySelectorAll(sel);
    tiles.forEach(function(tile) {
      if (tile._cdFlowerDirectBound) return;
      tile._cdFlowerDirectBound = true;
      var tileTouchStart = null;
      tile.addEventListener('click', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        openFlowerStudio(tile);
      });
      tile.addEventListener('touchstart', function(ev) {
        var t = ev.touches && ev.touches[0];
        tileTouchStart = t ? { x: t.clientX, y: t.clientY } : null;
      }, { passive: true });
      tile.addEventListener('touchend', function(ev) {
        if (!ev.changedTouches || !ev.changedTouches[0]) return;
        var t = ev.changedTouches[0];
        var x = t.clientX, y = t.clientY;
        var start = tileTouchStart;
        tileTouchStart = null;
        if (start) {
          var dx = Math.abs(x - start.x);
          var dy = Math.abs(y - start.y);
          if (dx > TAP_THRESH || dy > TAP_THRESH) return;
        } else {
          /* touchstart 미수신 시 elementFromPoint로 터치 해제 위치 확인 (모바일 대응) */
          var elAt = (typeof document.elementFromPoint === 'function') ? document.elementFromPoint(x, y) : null;
          if (!elAt || !tile.contains(elAt)) return;
        }
        if (ev.cancelable) ev.preventDefault();
        openFlowerStudio(tile);
      }, { passive: false });
    });
  }
  bindDirectToTiles();

  var splash = document.getElementById('codeSplash');
  if (splash && splash.parentNode) {
    var obs = new MutationObserver(function() {
      if (!document.getElementById('codeSplash')) {
        obs.disconnect();
        bindDirectToTiles();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
}

function _cdEnsureMainScreenOnLoad() {
  var ids = ['juyukModalOverlay','sukuyoModalOverlay','astroModalOverlay','ziweiModalOverlay'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) el.style.display = 'none';
  }
  window.scrollTo(0, 0);
}

function _cdInitAfterSplash() {
  var splash = document.getElementById('codeSplash');
  if (splash && splash.parentNode) {
    var obs = new MutationObserver(function(mutations, observer) {
      if (!document.getElementById('codeSplash')) {
        observer.disconnect();
        _cdEnsureMainScreenOnLoad();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function() {
      obs.disconnect();
      _cdEnsureMainScreenOnLoad();
    }, 3500);
  } else {
    _cdEnsureMainScreenOnLoad();
  }
}

/* 모바일 containment 해결: transform:translateZ(0) 부모 내 fixed가 뷰포트 대신 부모 기준으로 배치되는 이슈.
   이 오버레이들은 body 직계가 아니면 모바일에서 화면에 안 보임 → body로 이동 */
function __cdEnsureModalOverlaysInBody() {
  var ids = ['tarotLoveOverlay', 'tarotHealingOverlay', 'tarotReunionOverlay', 'tarotYearFortuneOverlay',
    'dreamModalOverlay', 'psychoDreamModalOverlay', 'kemetOracleOverlay', 'tarotModalOverlay'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el && el.parentNode !== document.body) {
      try { document.body.appendChild(el); } catch (e) { /* ignore */ }
    }
  }
}
window.__cdEnsureModalOverlaysInBody = __cdEnsureModalOverlaysInBody;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    __cdEnsureModalOverlaysInBody();
    _cdInitAfterSplash();
    __cdBindAnimalTotemTileDirect();
    __cdBindDestinyFlowerTileDirect();
    setTimeout(__cdBindGlobalActionsFallback, 0);
  }, { once: true });
} else {
  __cdEnsureModalOverlaysInBody();
  _cdInitAfterSplash();
  __cdBindAnimalTotemTileDirect();
  __cdBindDestinyFlowerTileDirect();
  setTimeout(__cdBindGlobalActionsFallback, 0);
}

function _dfSafeColor(color, fallback) {
  if (typeof color !== 'string') return fallback;
  var trimmed = color.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
}

function _dfHexToRgba(hex, alpha) {
  var raw = String(hex || '').replace('#', '');
  if (raw.length === 3) {
    raw = raw.charAt(0) + raw.charAt(0) + raw.charAt(1) + raw.charAt(1) + raw.charAt(2) + raw.charAt(2);
  }
  if (raw.length !== 6) {
    return 'rgba(244,114,182,' + alpha + ')';
  }
  var r = parseInt(raw.slice(0, 2), 16);
  var g = parseInt(raw.slice(2, 4), 16);
  var b = parseInt(raw.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function _dfNormalizeHex6(hex, fallback) {
  var raw = String(hex || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    raw = raw.charAt(0) + raw.charAt(0) + raw.charAt(1) + raw.charAt(1) + raw.charAt(2) + raw.charAt(2);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    return _dfNormalizeHex6(fallback || '#f472b6', '#f472b6');
  }
  return '#' + raw.toLowerCase();
}

function _dfHexToRgbParts(hex) {
  var safe = _dfNormalizeHex6(hex, '#f472b6').replace('#', '');
  return {
    r: parseInt(safe.slice(0, 2), 16),
    g: parseInt(safe.slice(2, 4), 16),
    b: parseInt(safe.slice(4, 6), 16)
  };
}

function _dfMixHex(aHex, bHex, ratio) {
  var t = Number(ratio);
  if (!Number.isFinite(t)) t = 0.5;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  var a = _dfHexToRgbParts(aHex);
  var b = _dfHexToRgbParts(bHex);
  var r = Math.round(a.r * (1 - t) + b.r * t);
  var g = Math.round(a.g * (1 - t) + b.g * t);
  var bl = Math.round(a.b * (1 - t) + b.b * t);
  var toHex = function(v) { return v.toString(16).padStart(2, '0'); };
  return '#' + toHex(r) + toHex(g) + toHex(bl);
}

function _dfHashText(input) {
  var text = String(input || 'destiny-flower');
  var hash = 2166136261;
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0);
}

function _dfBuildFlowerSvgMarkup(source, primaryHex, secondaryHex, seed, label) {
  var primary = _dfNormalizeHex6(primaryHex, '#f472b6');
  var secondary = _dfNormalizeHex6(secondaryHex, '#22d3ee');
  var accent = _dfMixHex(primary, secondary, 0.5);
  var deep = _dfMixHex(primary, '#0f172a', 0.24);
  var pale = _dfMixHex(secondary, '#ffffff', 0.42);
  var centerX = 160;
  var centerY = 130;
  var petalCount = 10;
  var petalRy = 66;
  var petalRx = 20;
  var baseSpin = seed % 360;

  if (source === 'astrology') {
    petalCount = 12;
    petalRy = 72;
    petalRx = 16;
  } else if (source === 'jamidusu') {
    petalCount = 14;
    petalRy = 62;
    petalRx = 15;
  } else if (source === 'sukuyo') {
    petalCount = 9;
    petalRy = 64;
    petalRx = 21;
  }

  var petals = '';
  for (var i = 0; i < petalCount; i++) {
    var angle = (360 / petalCount) * i + baseSpin;
    var localTone = (i % 2 === 0) ? primary : secondary;
    var localGlow = (i % 2 === 0) ? accent : pale;
    petals += '<ellipse cx="' + centerX + '" cy="' + centerY + '" rx="' + petalRx + '" ry="' + petalRy + '" '
      + 'fill="url(#petalGrad' + i + ')" transform="rotate(' + angle.toFixed(2) + ' ' + centerX + ' ' + centerY + ')" />'
      + '<defs><linearGradient id="petalGrad' + i + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="' + localGlow + '" stop-opacity="0.95" />'
      + '<stop offset="100%" stop-color="' + localTone + '" stop-opacity="0.86" />'
      + '</linearGradient></defs>';
  }

  var extra = '';
  if (source === 'astrology') {
    for (var s = 0; s < 18; s++) {
      var sx = 18 + ((seed + s * 37) % 286);
      var sy = 12 + ((Math.floor(seed / (s + 3)) + s * 19) % 96);
      var sr = 1 + ((seed + s * 13) % 3);
      extra += '<circle cx="' + sx + '" cy="' + sy + '" r="' + sr + '" fill="' + pale + '" fill-opacity="0.72" />';
    }
  } else if (source === 'jamidusu') {
    extra += '<circle cx="' + centerX + '" cy="' + centerY + '" r="96" fill="none" stroke="' + _dfMixHex(accent, '#ffffff', 0.35) + '" stroke-opacity="0.45" stroke-width="1.8" />';
    extra += '<path d="M72 52 L98 34 L126 52 L160 30 L194 52 L222 34 L248 52" fill="none" stroke="' + pale + '" stroke-opacity="0.6" stroke-width="2.4" stroke-linecap="round" />';
  } else if (source === 'sukuyo') {
    extra += '<circle cx="242" cy="58" r="30" fill="' + pale + '" fill-opacity="0.56" />';
    extra += '<circle cx="254" cy="58" r="26" fill="' + _dfMixHex(deep, '#020617', 0.7) + '" fill-opacity="0.92" />';
    extra += '<circle cx="160" cy="130" r="104" fill="none" stroke="' + _dfMixHex(secondary, '#e2e8f0', 0.4) + '" stroke-opacity="0.36" stroke-width="1.4" />';
  }

  var symbol = source === 'astrology' ? 'ASTRO' : (source === 'jamidusu' ? 'ZIWEI' : (source === 'sukuyo' ? 'SUKUYO' : 'SAJU'));
  var safeLabel = String(label || '').replace(/[<>&"']/g, '');

  return ''
    + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="' + safeLabel + '">'
    + '<defs>'
    + '<radialGradient id="bg" cx="50%" cy="40%" r="70%">'
    + '<stop offset="0%" stop-color="' + _dfMixHex(primary, '#ffffff', 0.44) + '" stop-opacity="0.94" />'
    + '<stop offset="52%" stop-color="' + _dfMixHex(secondary, '#0ea5e9', 0.36) + '" stop-opacity="0.66" />'
    + '<stop offset="100%" stop-color="' + _dfMixHex(deep, '#020617', 0.6) + '" stop-opacity="0.84" />'
    + '</radialGradient>'
    + '<linearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0%" stop-color="' + _dfMixHex(primary, '#ffffff', 0.4) + '" />'
    + '<stop offset="100%" stop-color="' + _dfMixHex(secondary, '#fde047', 0.24) + '" />'
    + '</linearGradient>'
    + '</defs>'
    + '<rect width="320" height="240" rx="20" fill="url(#bg)" />'
    + '<g opacity="0.96">' + petals + '</g>'
    + '<circle cx="' + centerX + '" cy="' + centerY + '" r="34" fill="url(#coreGrad)" />'
    + '<circle cx="' + centerX + '" cy="' + centerY + '" r="14" fill="' + _dfMixHex(accent, '#ffffff', 0.5) + '" fill-opacity="0.9" />'
    + extra
    + '<text x="16" y="222" fill="' + _dfMixHex(pale, '#ffffff', 0.3) + '" fill-opacity="0.82" font-size="14" font-family="Noto Sans KR, sans-serif" letter-spacing="2">' + symbol + '</text>'
    + '</svg>';
}

function _dfBuildFlowerDataUri(selection, sourceOverride) {
  var source = sourceOverride || (selection && selection.source) || 'saju';
  var flower = (selection && selection.flower) || {};
  var primary = (selection && selection.primary) || (flower && flower.primary_color) || '#f472b6';
  var secondary = (selection && selection.secondary) || (flower && flower.secondary_color) || '#22d3ee';
  var key = [
    source,
    flower.id || flower.name || '',
    flower.scientific_name || '',
    Array.isArray(selection && selection.keywords) ? selection.keywords.join('|') : '',
    (selection && selection.matched && selection.matched.narrative) || ''
  ].join('|');
  var seed = _dfHashText(key);
  var svg = _dfBuildFlowerSvgMarkup(source, primary, secondary, seed, flower.name || 'destiny flower');
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function _dfApplyGeneratedFlowerImage(imageEl, selection, sourceOverride) {
  if (!imageEl || !selection) return;
  try {
    imageEl.src = _dfBuildFlowerDataUri(selection, sourceOverride);
    if (typeof imageEl.removeAttribute === 'function') {
      imageEl.removeAttribute('srcset');
    }
  } catch (e) {
    console.warn('[DestinyFlower] 동적 SVG 생성 실패:', e);
  }
}

function _dfEnsureCardOpen(card) {
  if (!card) return;
  card.classList.add('feature-card--open');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', 'false');
  var cta = card.querySelector('.feature-card__cta');
  if (cta) {
    cta.setAttribute('aria-expanded', 'true');
    var labelEl = cta.querySelector('.feature-card__cta-label');
    if (labelEl) labelEl.textContent = '🌸 운명의 꽃 다시 피우기';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '✦';
  }
  syncFeatureCardHeight(card);
}

function _dfRenderPetals(container, primary, secondary) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 14; i++) {
    var petal = document.createElement('span');
    petal.className = 'destiny-flower-petal';
    petal.style.setProperty('--x', (4 + Math.random() * 88).toFixed(2) + '%');
    petal.style.setProperty('--y', (8 + Math.random() * 72).toFixed(2) + '%');
    petal.style.setProperty('--rot', (Math.random() * 46 - 23).toFixed(1) + 'deg');
    petal.style.setProperty('--dur', (2.8 + Math.random() * 1.8).toFixed(2) + 's');
    petal.style.setProperty('--delay', (Math.random() * 1.6).toFixed(2) + 's');
    petal.style.setProperty('--petal-start', _dfHexToRgba(secondary, 0.92));
    petal.style.setProperty('--petal-end', _dfHexToRgba(primary, 0.72));
    container.appendChild(petal);
  }
}

var _DF_ASTRO_SIGNS_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function _dfPickNumber(candidates, fallback, requirePositive) {
  for (var i = 0; i < candidates.length; i++) {
    var n = Number(candidates[i]);
    if (!Number.isFinite(n)) continue;
    if (requirePositive && n <= 0) continue;
    return n;
  }
  return fallback;
}

function _dfHasBirthCore(birth) {
  return !!(birth && Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0);
}

function _dfNormalizeAstroSign(raw) {
  var text = String(raw || '').trim();
  if (!text) return '';

  var englishMatch = text.match(/Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces/i);
  if (englishMatch && englishMatch[0]) {
    var found = englishMatch[0].toLowerCase();
    return found.charAt(0).toUpperCase() + found.slice(1);
  }

  var map = {
    '양자리': 'Aries',
    '황소자리': 'Taurus',
    '쌍둥이자리': 'Gemini',
    '게자리': 'Cancer',
    '사자자리': 'Leo',
    '처녀자리': 'Virgo',
    '천칭자리': 'Libra',
    '전갈자리': 'Scorpio',
    '사수자리': 'Sagittarius',
    '염소자리': 'Capricorn',
    '물병자리': 'Aquarius',
    '물고기자리': 'Pisces'
  };
  var keys = Object.keys(map);
  for (var i = 0; i < keys.length; i++) {
    if (text.indexOf(keys[i]) !== -1) return map[keys[i]];
  }

  return '';
}

function _dfAstroSignFromNode(nodeLike) {
  if (!nodeLike) return '';
  var idx = Number(nodeLike.idx);
  if (Number.isFinite(idx) && idx >= 0 && idx < _DF_ASTRO_SIGNS_EN.length) {
    return _DF_ASTRO_SIGNS_EN[idx];
  }
  return _dfNormalizeAstroSign(nodeLike._baseSign || nodeLike.sign || '');
}

function _dfResolveBirthContext(payload) {
  var pBirth = (payload && payload.birth) || {};
  var iBirth = (payload && payload.identity && payload.identity.birth) || {};
  var location = (payload && payload.location) || {};
  var astroBirth = window._astroBirth || {};
  var ziweiBirth = window._ziweiBirth || {};

  var year = _dfPickNumber([pBirth.year, iBirth.year, astroBirth.year, ziweiBirth.year], 0, true);
  var month = _dfPickNumber([pBirth.month, iBirth.month, astroBirth.month, ziweiBirth.month], 0, true);
  var day = _dfPickNumber([pBirth.day, iBirth.day, astroBirth.day, ziweiBirth.day], 0, true);
  var hour = _dfPickNumber([pBirth.hour, iBirth.hour, astroBirth.hour, ziweiBirth.hour], 12, false);
  var minute = _dfPickNumber([pBirth.minute, iBirth.minute, astroBirth.minute, ziweiBirth.minute], 0, false);
  var lat = _dfPickNumber([pBirth.lat, pBirth.latitude, iBirth.lat, iBirth.latitude, astroBirth.lat, location.lat], 37.6, false);
  var lon = _dfPickNumber([pBirth.lon, pBirth.lng, iBirth.lon, iBirth.lng, astroBirth.lon, location.lng, location.lon], 127, false);
  var tz = _dfPickNumber([pBirth.tz, pBirth.tzOffset, iBirth.tz, iBirth.tzOffset, astroBirth.tz, location.tzOffset, location.baseTzOffset], 9, false);

  // 자미두수·점성술 등은 양력 기준. 음력 입력 시 양력으로 변환하여 명궁 등이 정확히 계산되도록 함.
  var calType = pBirth.calType || iBirth.calType || 'solar';
  if ((calType === 'lunar' || calType === 'lunar_leap') && year && month && day &&
      window.KasiEngine && typeof window.KasiEngine.lunarToSolar === 'function') {
    try {
      var conv = window.KasiEngine.lunarToSolar(year, month, day, calType === 'lunar_leap');
      if (conv && conv.year && conv.month && conv.day) {
        year = Number(conv.year);
        month = Number(conv.month);
        day = Number(conv.day);
      }
    } catch (e) {
      console.warn('[DestinyFlower] 음력→양력 변환 실패, 원본 사용:', e);
    }
  }

  return {
    year: year,
    month: month,
    day: day,
    hour: hour,
    minute: minute,
    lat: lat,
    lon: lon,
    tz: tz
  };
}

function _dfExtractAstroLiveData(birthCtx) {
  if (!_dfHasBirthCore(birthCtx) || typeof window.calcAstroApiChartOrThrow !== 'function') return null;
  try {
    var chart = window.calcAstroApiChartOrThrow(
      Number(birthCtx.year),
      Number(birthCtx.month),
      Number(birthCtx.day),
      Number(birthCtx.hour) + Number(birthCtx.minute) / 60,
      Number(birthCtx.lat),
      Number(birthCtx.lon),
      Number(birthCtx.tz),
      window.ASTRO_HOUSE_SYSTEM || 'P'
    );
    return {
      sunSign: _dfAstroSignFromNode(chart && chart.sun),
      moonSign: _dfAstroSignFromNode(chart && chart.moon),
      risingSign: _dfAstroSignFromNode(chart && chart.asc)
    };
  } catch (e) {
    console.warn('[DestinyFlower] 점성술 브리지 계산 실패:', e);
  }
  return null;
}

function _dfExtractZiweiLiveRaw(birthCtx) {
  // 생년월일이 있으면 항상 해당 데이터로 재계산. _currentZiweiData는 이전 사용자/모달 조회 캐시이므로
  // 운명의 꽃 아틀리에에서는 사용하지 않음(잘못된 명궁 결과 방지).
  if (!_dfHasBirthCore(birthCtx) || typeof window.calcZiweiPalaces !== 'function') return null;
  try {
    return window.calcZiweiPalaces(
      Number(birthCtx.year),
      Number(birthCtx.month),
      Number(birthCtx.day),
      Number(birthCtx.hour),
      Number(birthCtx.minute)
    );
  } catch (e) {
    console.warn('[DestinyFlower] 자미두수 브리지 계산 실패:', e);
  }
  return null;
}

function _dfDeriveZiweiDomain(ziweiRaw) {
  if (!ziweiRaw || typeof ziweiRaw !== 'object') return null;

  var palaceIdx = -1;
  if (Array.isArray(ziweiRaw.palacesByIndex)) {
    palaceIdx = ziweiRaw.palacesByIndex.indexOf('명궁');
  }
  if (palaceIdx < 0) palaceIdx = 0;

  var palace = (Array.isArray(ziweiRaw.palacesByIndex) && ziweiRaw.palacesByIndex[palaceIdx]) || '명궁';
  var starRows = (ziweiRaw.palaceStarData && ziweiRaw.palaceStarData[palaceIdx] && ziweiRaw.palaceStarData[palaceIdx].stars) || [];
  var starNames = starRows.map(function(row) {
    return row && row.name ? String(row.name) : '';
  }).filter(Boolean);

  if (!starNames.length && ziweiRaw.stars && ziweiRaw.stars[palaceIdx] && Array.isArray(ziweiRaw.stars[palaceIdx].main)) {
    starNames = ziweiRaw.stars[palaceIdx].main.map(function(name) {
      return String(name || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
  }

  var brightness = '';
  if (starRows[0] && starRows[0].strength) brightness = String(starRows[0].strength);

  return {
    mainStar: starNames.join(' · '),
    palace: palace,
    brightness: brightness,
    stars: starNames
  };
}

function _dfExtractSukuyoLiveData(birthCtx) {
  if (!_dfHasBirthCore(birthCtx) || typeof window.calcSukuyoData !== 'function') return null;

  var lunarObj = null;
  try {
    if (window.KasiEngine && typeof window.KasiEngine.solarToLunar === 'function') {
      lunarObj = window.KasiEngine.solarToLunar(new Date(
        Number(birthCtx.year),
        Number(birthCtx.month) - 1,
        Number(birthCtx.day),
        Number(birthCtx.hour),
        Number(birthCtx.minute),
        0,
        0
      ));
    }
  } catch (e) {
    console.warn('[DestinyFlower] 숙요 달력 변환 실패:', e);
  }

  if (!lunarObj) return null;

  try {
    var sData = window.calcSukuyoData(lunarObj);
    if (!sData) return null;

    var phase = '';
    if (typeof window.getDailyKarmicGuidance === 'function') {
      var daily = window.getDailyKarmicGuidance(lunarObj, sData.mansion);
      phase = (daily && daily.moon && daily.moon.label) ? String(daily.moon.label) : '';
    }

    return {
      mansion: sData.mansion || '',
      mansionIndex: Number(sData.mansionIdx) + 1,
      phase: phase
    };
  } catch (e2) {
    console.warn('[DestinyFlower] 숙요 브리지 계산 실패:', e2);
  }

  return null;
}

function _dfApplyLiveDomainBridge(payload, birthCtx) {
  if (!payload || typeof payload !== 'object') return payload;

  var astro = _dfExtractAstroLiveData(birthCtx);
  if (astro && (astro.sunSign || astro.moonSign || astro.risingSign)) {
    payload.astrology = Object.assign({}, payload.astrology || {}, {
      sunSign: astro.sunSign,
      sun_sign: astro.sunSign,
      moonSign: astro.moonSign,
      moon_sign: astro.moonSign,
      risingSign: astro.risingSign,
      rising_sign: astro.risingSign
    });
    if (payload.domains && payload.domains.astrology) {
      payload.domains.astrology = Object.assign({}, payload.domains.astrology, {
        enabled: true,
        sun_sign: astro.sunSign || payload.domains.astrology.sun_sign || '',
        moon_sign: astro.moonSign || payload.domains.astrology.moon_sign || '',
        rising_sign: astro.risingSign || payload.domains.astrology.rising_sign || ''
      });
    }
  }

  var ziweiRaw = _dfExtractZiweiLiveRaw(birthCtx);
  var ziwei = _dfDeriveZiweiDomain(ziweiRaw);
  if (ziwei && (ziwei.mainStar || ziwei.palace)) {
    payload.ziwei = Object.assign({}, payload.ziwei || {}, {
      mainStar: ziwei.mainStar,
      main_star: ziwei.mainStar,
      palace: ziwei.palace,
      brightness: ziwei.brightness,
      stars: ziwei.stars
    });
    if (payload.domains && payload.domains.ziwei) {
      payload.domains.ziwei = Object.assign({}, payload.domains.ziwei, {
        enabled: true,
        main_star: ziwei.mainStar || payload.domains.ziwei.main_star || '',
        palace: ziwei.palace || payload.domains.ziwei.palace || '',
        brightness: ziwei.brightness || payload.domains.ziwei.brightness || '',
        stars: Array.isArray(ziwei.stars) ? ziwei.stars : (payload.domains.ziwei.stars || [])
      });
    }
  }

  var sukuyo = _dfExtractSukuyoLiveData(birthCtx);
  if (sukuyo && (sukuyo.mansion || Number.isFinite(Number(sukuyo.mansionIndex)))) {
    payload.sukuyo = Object.assign({}, payload.sukuyo || {}, {
      mansion: sukuyo.mansion,
      name: sukuyo.mansion,
      mansionIndex: sukuyo.mansionIndex,
      index: sukuyo.mansionIndex,
      phase: sukuyo.phase
    });
    if (payload.domains && payload.domains.sukuyo) {
      payload.domains.sukuyo = Object.assign({}, payload.domains.sukuyo, {
        enabled: true,
        mansion: sukuyo.mansion || payload.domains.sukuyo.mansion || '',
        mansion_index: Number.isFinite(Number(sukuyo.mansionIndex))
          ? Number(sukuyo.mansionIndex)
          : Number(payload.domains.sukuyo.mansion_index || 0),
        phase: sukuyo.phase || payload.domains.sukuyo.phase || ''
      });
    }
  }

  return payload;
}

function _dfGetProfilePayload() {
  function getCurrentProfile() {
    try {
      if (window.DestinyProfileManager && window.DestinyProfileManager.storage && typeof window.DestinyProfileManager.storage.current === 'function') {
        return window.DestinyProfileManager.storage.current() || {};
      }
    } catch (e) {
      console.warn('[DestinyFlower] 프로필 로드 실패:', e);
    }
    return {};
  }

  function sameBirth(a, b) {
    if (!a || !b) return false;
    return Number(a.year || 0) === Number(b.year || 0)
      && Number(a.month || 0) === Number(b.month || 0)
      && Number(a.day || 0) === Number(b.day || 0);
  }

  function pickSajuSnapshot(baseProfile) {
    var snap = window.__destinyFlowerSajuSnapshot;
    if (!snap || typeof snap !== 'object') return null;
    var weights = snap.elementWeights || (snap.analysis && snap.analysis.elementWeights) || (snap.saju && snap.saju.elementWeights);
    if (!weights || typeof weights !== 'object') return null;
    var baseBirth = baseProfile && baseProfile.birth;
    var snapBirth = snap.birth;
    if (baseBirth && snapBirth && !sameBirth(baseBirth, snapBirth)) return null;
    return snap;
  }

  function isMeaningfulSnapshot(snapshot) {
    if (!snapshot) return false;
    var weights = snapshot.elementWeights || (snapshot.analysis && snapshot.analysis.elementWeights) || (snapshot.saju && snapshot.saju.elementWeights);
    if (!weights || typeof weights !== 'object') return false;
    var values = ['wood', 'fire', 'earth', 'metal', 'water'].map(function(key) {
      return Number(weights[key] || 0);
    });
    var allSame = values.every(function(v) { return Math.abs(v - values[0]) < 0.05; });
    var looksDefault = allSame && Math.abs(values[0] - 20) < 0.2;
    return !looksDefault;
  }

  function mergePayload(baseProfile, snapshot) {
    if (!snapshot) return baseProfile || {};
    var merged = Object.assign({}, baseProfile || {}, snapshot || {});
    merged.birth = Object.assign({}, (baseProfile && baseProfile.birth) || {}, snapshot.birth || {});
    merged.analysis = Object.assign({}, (baseProfile && baseProfile.analysis) || {}, snapshot.analysis || {});
    merged.saju = Object.assign({}, (baseProfile && baseProfile.saju) || {}, snapshot.saju || {});
    if (!merged.name && baseProfile && baseProfile.name) merged.name = baseProfile.name;
    if (!merged.gender && baseProfile && baseProfile.gender) merged.gender = baseProfile.gender;
    return merged;
  }

  var current = getCurrentProfile();
  var payload = current || {};
  var snapshot = pickSajuSnapshot(current);
  if (snapshot && isMeaningfulSnapshot(snapshot)) {
    payload = mergePayload(current, snapshot);
  }

  if (payload && payload.birth && typeof window.computeProfileForModal === 'function') {
    try {
      window.computeProfileForModal(payload);
      snapshot = pickSajuSnapshot(payload);
      if (snapshot) payload = mergePayload(payload, snapshot);
    } catch (e2) {
      console.warn('[DestinyFlower] 사주 재계산 실패:', e2);
    }
  }

  var birthCtx = _dfResolveBirthContext(payload || {});
  if (payload && typeof payload === 'object') {
    payload.birth = Object.assign({}, payload.birth || {}, {
      year: birthCtx.year,
      month: birthCtx.month,
      day: birthCtx.day,
      hour: birthCtx.hour,
      minute: birthCtx.minute
    });
    if (!Number.isFinite(Number(payload.birth.lat)) && Number.isFinite(Number(birthCtx.lat))) payload.birth.lat = birthCtx.lat;
    if (!Number.isFinite(Number(payload.birth.lon)) && Number.isFinite(Number(birthCtx.lon))) payload.birth.lon = birthCtx.lon;
    if (!Number.isFinite(Number(payload.birth.tz)) && Number.isFinite(Number(birthCtx.tz))) payload.birth.tz = birthCtx.tz;
  }

  return _dfApplyLiveDomainBridge(payload || {}, birthCtx);
}

function _dfResolveSelection() {
  var payload = _dfGetProfilePayload();
  var birthCtx = _dfResolveBirthContext(payload || {});

  // 생년월일 핵심 정보가 전혀 없으면 운명의 꽃을 계산하지 않는다.
  // (빈 상태에서는 어떤 꽃도 노출하지 않고 안내 문구만 보여주기 위함)
  if (!_dfHasBirthCore(birthCtx)) {
    return null;
  }

  var matched = null;
  var theme = null;

  try {
    if (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchDestinyFlower === 'function') {
      matched = window.DestinyFlowerEngine.matchDestinyFlower(payload, { limit: 5 });
      if (typeof window.DestinyFlowerEngine.updateFlowerTheme === 'function') {
        theme = window.DestinyFlowerEngine.updateFlowerTheme(payload, {});
      }
    } else if (typeof window.matchDestinyFlower === 'function') {
      matched = window.matchDestinyFlower(payload, { limit: 5 });
    }
  } catch (e2) {
    console.warn('[DestinyFlower] 매칭 실패:', e2);
  }

  var flower = matched && (matched.flower || matched.flowerSymbology);
  if (!flower && window.flowerSymbology) {
    flower = window.flowerSymbology.LOTUS || null;
  }
  if (!flower) {
    flower = {
      name: '연꽃',
      scientific_name: 'Nelumbo nucifera',
      symbolism: '탁함 속에서도 투명하게 피어나는 재생의 상징',
      primary_color: '#f472b6',
      secondary_color: '#22d3ee',
      keywords: ['rebirth', 'purity', 'flow'],
      particle_type: 'petal'
    };
  }

  var primary = _dfSafeColor((flower.primary_color || (theme && theme.palette && theme.palette.primary)), '#f472b6');
  var secondary = _dfSafeColor((flower.secondary_color || (theme && theme.palette && theme.palette.secondary)), '#22d3ee');
  var keywords = Array.isArray(flower.keywords) && flower.keywords.length
    ? flower.keywords.slice(0, 4)
    : [flower.particle_type || 'petal', 'balance', 'bloom'];

  return {
    source: 'saju',
    payload: payload,
    matched: matched,
    theme: theme,
    flowerData: matched && matched.flower_data ? matched.flower_data : null,
    flower: flower,
    primary: primary,
    secondary: secondary,
    keywords: keywords
  };
}

function _afResolveSelection() {
  var payload = _dfGetProfilePayload();
  var matched = null;

  try {
    if (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchAstrologyFlower === 'function') {
      matched = window.DestinyFlowerEngine.matchAstrologyFlower(payload, { source: 'astrology' });
    } else if (typeof window.matchAstrologyFlower === 'function') {
      matched = window.matchAstrologyFlower(payload, { source: 'astrology' });
    } else if (typeof window.getAstrologyFlower === 'function') {
      matched = window.getAstrologyFlower((payload && payload.astrology) || {});
    }
  } catch (e) {
    console.warn('[AstrologyFlower] 매칭 실패:', e);
  }

  var flower = matched && matched.flower;
  if (!flower) {
    flower = {
      id: 'astro_lavender',
      name: '성운 라벤더',
      scientific_name: 'Lavandula nebula',
      symbolism: '별빛의 결을 따라 흐르는 청명한 직관',
      primary_color: '#8D99FF',
      secondary_color: '#C77DFF',
      keywords: ['nebula', 'zodiac', 'stardust'],
      particle_type: 'stardust_air',
      vibe_message: '별의 리듬을 따라 호흡하면 직관이 선명해집니다.'
    };
  }

  var theme = matched && matched.theme ? matched.theme : {};
  var primary = _dfSafeColor((flower.primary_color || (theme.palette && theme.palette.primary)), '#8D99FF');
  var secondary = _dfSafeColor((flower.secondary_color || (theme.palette && theme.palette.secondary)), '#C77DFF');
  var keywords = Array.isArray(flower.keywords) && flower.keywords.length
    ? flower.keywords.slice(0, 4)
    : ['zodiac', 'nebula', 'stardust'];

  return {
    source: 'astrology',
    payload: payload,
    matched: matched,
    theme: theme,
    flowerData: matched && matched.flower_data ? matched.flower_data : null,
    flower: flower,
    primary: primary,
    secondary: secondary,
    keywords: keywords
  };
}

function _afRenderStardust(container, primary, secondary) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 22; i++) {
    var star = document.createElement('span');
    star.className = 'astrology-stardust';
    star.style.setProperty('--x', (4 + Math.random() * 92).toFixed(2) + '%');
    star.style.setProperty('--y', (6 + Math.random() * 80).toFixed(2) + '%');
    star.style.setProperty('--size', (2 + Math.random() * 3.4).toFixed(2) + 'px');
    star.style.setProperty('--dur', (2.6 + Math.random() * 2.6).toFixed(2) + 's');
    star.style.setProperty('--delay', (Math.random() * 2.2).toFixed(2) + 's');
    star.style.setProperty('--star-a', _dfHexToRgba(primary, 0.84));
    star.style.setProperty('--star-b', _dfHexToRgba(secondary, 0.94));
    container.appendChild(star);
  }
}

function _afEnsureCardOpen(card) {
  if (!card) return;
  card.classList.add('feature-card--open');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', 'false');
  var cta = card.querySelector('.feature-card__cta');
  if (cta) {
    cta.setAttribute('aria-expanded', 'true');
    var labelEl = cta.querySelector('.feature-card__cta-label');
    if (labelEl) labelEl.textContent = '✨ 점성술 꽃 다시 소환하기';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '✦';
  }
  syncFeatureCardHeight(card);
}

function _afApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var matched = selection.matched || {};
  var flowerData = selection.flowerData || matched.flower_data || {};
  var chart = matched.chart || {};
  var stage = card.querySelector('.astrology-flower-stage');
  var nameEl = document.getElementById('afCardName');
  var symbolismEl = document.getElementById('afCardSymbolism');
  var keywordsEl = document.getElementById('afCardKeywords');
  var sunBadgeEl = document.getElementById('afCardSunBadge');
  var risingBadgeEl = document.getElementById('afCardRisingBadge');
  var moonBadgeEl = document.getElementById('afCardMoonBadge');
  var dataLineEl = document.getElementById('afCardDataLine');
  var stardust = card.querySelector('.astrology-stardust-field');
  var nebula = card.querySelector('.astrology-flower-nebula');
  var image = card.querySelector('.astrology-flower-stage__image');
  var heroImage = card.querySelector('.astrology-flower-hero-image');
  if (!stage || !nameEl || !symbolismEl || !keywordsEl) return;

  card.style.setProperty('--af-primary', selection.primary);
  card.style.setProperty('--af-secondary', selection.secondary);
  if (matched.theme && matched.theme.palette) {
    if (matched.theme.palette.moonGlowInner) card.style.setProperty('--af-glow-inner', matched.theme.palette.moonGlowInner);
    if (matched.theme.palette.moonGlowOuter) card.style.setProperty('--af-glow-outer', matched.theme.palette.moonGlowOuter);
  }

  nameEl.textContent = selection.flower.name + ' · ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = matched.astro_verdict || matched.narrative || '점성술 차트 기반 운명꽃을 판독 중입니다.';
  keywordsEl.textContent = 'zodiac flower keywords · ' + selection.keywords.join(' • ');
  if (sunBadgeEl) sunBadgeEl.textContent = chart.sun_sign ? ('태양궁 ' + chart.sun_sign) : '태양궁 미확인';
  if (risingBadgeEl) risingBadgeEl.textContent = chart.rising_sign ? ('상승궁 ' + chart.rising_sign) : '상승궁 미확인';
  if (moonBadgeEl) moonBadgeEl.textContent = chart.moon_sign ? ('달궁 ' + chart.moon_sign) : '달궁 미확인';
  if (dataLineEl) {
    dataLineEl.textContent = (flowerData.focus_signal || '차트 시그널 대기') + ' · ' + (flowerData.ritual_tip || '별의 리듬을 고정 중입니다.');
  }

  if (nebula) {
    nebula.style.background =
      'radial-gradient(circle at 24% 40%, ' + _dfHexToRgba(selection.primary, 0.38) + ', transparent 58%),'
      + 'radial-gradient(circle at 72% 24%, ' + _dfHexToRgba(selection.secondary, 0.34) + ', transparent 56%),'
      + 'radial-gradient(circle at 50% 86%, var(--af-glow-inner, rgba(141,153,255,0.22)), transparent 60%)';
  }

  _afRenderStardust(stardust, selection.primary, selection.secondary);
  _dfApplyGeneratedFlowerImage(image, selection, 'astrology');
  _dfApplyGeneratedFlowerImage(heroImage, selection, 'astrology');

  if (!card.__afPointerBound) {
    card.__afPointerBound = true;
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--af-pointer-x', x.toFixed(2) + '%');
      card.style.setProperty('--af-pointer-y', y.toFixed(2) + '%');
    });
    card.addEventListener('mouseleave', function() {
      card.style.setProperty('--af-pointer-x', '50%');
      card.style.setProperty('--af-pointer-y', '42%');
    });
  }

  stage.classList.remove('is-bloomed');
  void stage.offsetWidth;
  stage.classList.add('is-bloomed');
}

function _jfResolveSelection() {
  var payload = _dfGetProfilePayload();
  var birthCtx = _dfResolveBirthContext(payload || {});
  if (!_dfHasBirthCore(birthCtx)) return null;

  var matched = null;

  try {
    // NOTE: 자미두수 운명의 꽃은 "명궁(main)" 데이터만 반영하도록 입력을 고정한다.
    // (렌더/재계산 타이밍에 aux/기타 궁 데이터가 섞여 결과가 변하는 문제 방지)
    if (typeof window !== 'undefined' && typeof window.calcZiweiPalaces === 'function') {
      try {
        var zw = window.calcZiweiPalaces(
          Number(birthCtx.year),
          Number(birthCtx.month),
          Number(birthCtx.day),
          Number(birthCtx.hour),
          Number(birthCtx.minute)
        );
        if (zw && zw.palacesByIndex && zw.stars) {
          var mingIdx = zw.palacesByIndex.indexOf('명궁');
          var mainStar = '';
          var brightness = '';
          if (mingIdx >= 0 && zw.stars[mingIdx] && zw.stars[mingIdx].main && zw.stars[mingIdx].main.length) {
            mainStar = zw.stars[mingIdx].main[0] || '';
          }
          if (mingIdx >= 0 && zw.palaceStarData && zw.palaceStarData[mingIdx] && zw.palaceStarData[mingIdx].stars && zw.palaceStarData[mingIdx].stars[0]) {
            brightness = String(zw.palaceStarData[mingIdx].stars[0].strength || '');
          }
          payload = payload && typeof payload === 'object' ? payload : {};
          payload.ziwei = { mainStar: mainStar, palace: '명궁', brightness: brightness, stars: mainStar ? [mainStar] : [] };
          payload.domains = payload.domains && typeof payload.domains === 'object' ? payload.domains : {};
          payload.domains.ziwei = { main_star: mainStar, palace: '명궁', brightness: brightness, stars: mainStar ? [mainStar] : [] };
        }
      } catch (eFix) {
        // ignore
      }
    }

    if (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchJamidusuFlower === 'function') {
      matched = window.DestinyFlowerEngine.matchJamidusuFlower(payload, { source: 'jamidusu' });
    } else if (typeof window.matchJamidusuFlower === 'function') {
      matched = window.matchJamidusuFlower(payload, { source: 'jamidusu' });
    } else if (typeof window.getJamidusuFlower === 'function') {
      matched = window.getJamidusuFlower((payload && payload.ziwei) || {});
    }
  } catch (e) {
    console.warn('[JamidusuFlower] 매칭 실패:', e);
  }

  var flower = matched && matched.flower;
  if (!flower) {
    flower = {
      id: 'peony_ziwei',
      name: '모란',
      scientific_name: 'Paeonia suffruticosa',
      symbolism: '제왕의 기품과 중심의 힘',
      primary_color: '#D946EF',
      secondary_color: '#F9A8D4',
      keywords: ['제왕', '기품', '중심'],
      particle_type: 'imperial_petal',
      vibe_message: '중심을 지키는 태도가 결국 가장 멀리 갑니다.'
    };
  }

  var theme = matched && matched.theme ? matched.theme : {};
  var primary = _dfSafeColor((flower.primary_color || (theme.palette && theme.palette.primary)), '#D946EF');
  var secondary = _dfSafeColor((flower.secondary_color || (theme.palette && theme.palette.secondary)), '#F9A8D4');
  var keywords = Array.isArray(flower.keywords) && flower.keywords.length
    ? flower.keywords.slice(0, 5)
    : ['ziwei', 'minggong', 'flower'];

  return {
    source: 'jamidusu',
    payload: payload,
    matched: matched,
    theme: theme,
    flowerData: matched && matched.flower_data ? matched.flower_data : null,
    flower: flower,
    primary: primary,
    secondary: secondary,
    keywords: keywords
  };
}

function _jfRenderPetals(container, primary, secondary, shouldFall) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 18; i++) {
    var petal = document.createElement('span');
    petal.className = 'jamidusu-petal';
    if (shouldFall) petal.classList.add('is-fall');
    petal.style.setProperty('--x', (4 + Math.random() * 92).toFixed(2) + '%');
    petal.style.setProperty('--y', (6 + Math.random() * 72).toFixed(2) + '%');
    petal.style.setProperty('--size', (8 + Math.random() * 8).toFixed(2) + 'px');
    petal.style.setProperty('--dur', (2.6 + Math.random() * 2.2).toFixed(2) + 's');
    petal.style.setProperty('--delay', (Math.random() * 2.2).toFixed(2) + 's');
    petal.style.setProperty('--petal-a', _dfHexToRgba(primary, 0.76));
    petal.style.setProperty('--petal-b', _dfHexToRgba(secondary, 0.88));
    container.appendChild(petal);
  }
}

function _jfEnsureCardOpen(card) {
  if (!card) return;
  card.classList.add('feature-card--open');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', 'false');
  var cta = card.querySelector('.feature-card__cta');
  if (cta) {
    cta.setAttribute('aria-expanded', 'true');
    var labelEl = cta.querySelector('.feature-card__cta-label');
    if (labelEl) labelEl.textContent = '🌺 자미두수 꽃 다시 소환하기';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '✦';
  }
  syncFeatureCardHeight(card);
}

function _jfApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var matched = selection.matched || {};
  var flowerData = selection.flowerData || matched.flower_data || {};
  var ziwei = matched.ziwei || {};
  var intensity = matched.visual_intensity || { glow: 0.7, saturation: 0.8, mist: 0.2, brightness_label: '평(平)' };
  var stage = card.querySelector('.jamidusu-flower-stage');
  var nameEl = document.getElementById('jfCardName');
  var symbolismEl = document.getElementById('jfCardSymbolism');
  var keywordsEl = document.getElementById('jfCardKeywords');
  var starBadgeEl = document.getElementById('jfCardStarBadge');
  var brightBadgeEl = document.getElementById('jfCardBrightnessBadge');
  var palaceBadgeEl = document.getElementById('jfCardPalaceBadge');
  var dataLineEl = document.getElementById('jfCardDataLine');
  var petals = card.querySelector('.jamidusu-petal-field');
  var mist = card.querySelector('.jamidusu-mist');
  var image = card.querySelector('.jamidusu-flower-stage__image');
  var heroImage = card.querySelector('.jamidusu-flower-hero-image');
  if (!stage || !nameEl || !symbolismEl || !keywordsEl) return;

  card.style.setProperty('--jf-primary', selection.primary);
  card.style.setProperty('--jf-secondary', selection.secondary);
  card.style.setProperty('--jf-glow-strength', String(intensity.glow || 0.7));
  card.style.setProperty('--jf-mist-opacity', String(intensity.mist || 0.2));
  stage.style.setProperty('--jf-saturation', String(intensity.saturation || 0.8));

  nameEl.textContent = selection.flower.name + ' · ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = matched.jamidusu_verdict || matched.narrative || '오늘의 강한 별 기반 운명꽃을 판독 중입니다.';
  keywordsEl.textContent = 'ziwei flower keywords · ' + selection.keywords.join(' • ');
  if (starBadgeEl) {
    var starLine = Array.isArray(ziwei.primary_stars) ? ziwei.primary_stars.join('·') : '주성 미확인';
    starBadgeEl.textContent = '오늘의 강한 별 ' + starLine;
  }
  if (brightBadgeEl) brightBadgeEl.textContent = '별 밝기 ' + (ziwei.brightness || intensity.brightness_label || '평(平)');
  if (palaceBadgeEl) palaceBadgeEl.textContent = ziwei.palace || '미확인';
  if (dataLineEl) {
    dataLineEl.textContent = (flowerData.focus_signal || '주성 시그널 대기') + ' · ' + (flowerData.ritual_tip || '별의 기운을 정렬 중입니다.');
  }

  if (mist) {
    mist.style.background =
      'radial-gradient(circle at 22% 38%, ' + _dfHexToRgba(selection.primary, 0.24) + ', transparent 56%),'
      + 'radial-gradient(circle at 72% 64%, ' + _dfHexToRgba(selection.secondary, 0.22) + ', transparent 60%)';
  }

  var shouldFall = Array.isArray(ziwei.primary_stars) && ziwei.primary_stars.some(function(s) {
    return /천기|태음/.test(String(s || ''));
  });
  _jfRenderPetals(petals, selection.primary, selection.secondary, shouldFall);
  _dfApplyGeneratedFlowerImage(image, selection, 'jamidusu');
  _dfApplyGeneratedFlowerImage(heroImage, selection, 'jamidusu');

  card.__jfKeywords = selection.keywords || [];

  if (!card.__jfPopupBound) {
    card.__jfPopupBound = true;
    var popupEl = document.getElementById('jfCardKeywordPopup');
    stage.addEventListener('click', function() {
      if (!popupEl) return;
      popupEl.textContent = (card.__jfKeywords || []).join(' · ') || '제왕의 기품';
      popupEl.classList.add('is-show');
      setTimeout(function() {
        popupEl.classList.remove('is-show');
      }, 1800);
    });
  }

  stage.classList.remove('is-bloomed');
  void stage.offsetWidth;
  stage.classList.add('is-bloomed');
}

function _sfResolveSelection() {
  var payload = _dfGetProfilePayload();
  var birthCtx = _dfResolveBirthContext(payload || {});
  if (!_dfHasBirthCore(birthCtx)) return null;

  var matched = null;

  try {
    if (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchSukuyoFlower === 'function') {
      matched = window.DestinyFlowerEngine.matchSukuyoFlower(payload, { source: 'sukuyo' });
    } else if (typeof window.matchSukuyoFlower === 'function') {
      matched = window.matchSukuyoFlower(payload, { source: 'sukuyo' });
    } else if (typeof window.calculateSukyoFlower === 'function') {
      var b = (payload && payload.birth) || (payload && payload.identity && payload.identity.birth) || {};
      var idx = (((Number(b.year || 2000) * 372 + Number(b.month || 1) * 31 + Number(b.day || 1) + 13) % 27) + 27) % 27 + 1;
      matched = window.calculateSukyoFlower(idx, payload && payload.sukuyo && payload.sukuyo.phase);
    }
  } catch (e) {
    console.warn('[SukuyoFlower] 매칭 실패:', e);
  }

  var flower = matched && matched.flower;
  if (!flower) {
    flower = {
      id: 'moon_lily',
      name: '백합',
      scientific_name: 'Lilium candidum',
      symbolism: '달빛 속에서 맑게 피어나는 수호의 꽃',
      primary_color: '#F8FAFC',
      secondary_color: '#93C5FD',
      keywords: ['달빛', '수호', '정화'],
      particle_type: 'lunar_pollen',
      vibe_message: '오늘 밤 달의 호흡과 리듬을 맞추면 선택이 더 선명해집니다.'
    };
  }

  var theme = matched && matched.theme ? matched.theme : {};
  var primary = _dfSafeColor((flower.primary_color || (theme.palette && theme.palette.primary)), '#F8FAFC');
  var secondary = _dfSafeColor((flower.secondary_color || (theme.palette && theme.palette.secondary)), '#93C5FD');
  var sukuyo = (matched && matched.sukuyo) || {};
  var keywords = Array.isArray(flower.keywords) && flower.keywords.length
    ? flower.keywords.slice(0, 5)
    : [sukuyo.mansion_name || '숙요', sukuyo.guardian_animal || '수호동물', sukuyo.moon_phase || '달위상'];

  return {
    source: 'sukuyo',
    payload: payload,
    matched: matched,
    theme: theme,
    flowerData: matched && matched.flower_data ? matched.flower_data : null,
    flower: flower,
    primary: primary,
    secondary: secondary,
    keywords: keywords
  };
}

function _sfRenderStarfall(container, primary, secondary) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 20; i++) {
    var star = document.createElement('span');
    star.className = 'sukuyo-starfall';
    star.style.setProperty('--x', (3 + Math.random() * 94).toFixed(2) + '%');
    star.style.setProperty('--y', (4 + Math.random() * 54).toFixed(2) + '%');
    star.style.setProperty('--len', (10 + Math.random() * 16).toFixed(2) + 'px');
    star.style.setProperty('--dur', (1.6 + Math.random() * 2.6).toFixed(2) + 's');
    star.style.setProperty('--delay', (Math.random() * 1.8).toFixed(2) + 's');
    star.style.setProperty('--star-a', _dfHexToRgba(primary, 0.72));
    star.style.setProperty('--star-b', _dfHexToRgba(secondary, 0.94));
    container.appendChild(star);
  }
}

function _sfRenderOrbit(container, primary, secondary) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 27; i++) {
    var dot = document.createElement('span');
    dot.className = 'sukuyo-orbit-dot';
    dot.style.setProperty('--i', String(i));
    dot.style.setProperty('--orbit-color-a', _dfHexToRgba(primary, 0.76));
    dot.style.setProperty('--orbit-color-b', _dfHexToRgba(secondary, 0.84));
    container.appendChild(dot);
  }
}

function _sfEnsureCardOpen(card) {
  if (!card) return;
  card.classList.add('feature-card--open');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', 'false');
  var cta = card.querySelector('.feature-card__cta');
  if (cta) {
    cta.setAttribute('aria-expanded', 'true');
    var labelEl = cta.querySelector('.feature-card__cta-label');
    if (labelEl) labelEl.textContent = '🌙 숙요 꽃 다시 소환하기';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '✦';
  }
  syncFeatureCardHeight(card);
}

function _sfApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var matched = selection.matched || {};
  var flowerData = selection.flowerData || matched.flower_data || {};
  var sukuyo = matched.sukuyo || {};
  var intensity = matched.visual_intensity || { glow: 0.72, halo: 0.56, moon_style: 'lunar_flow', moon_label: '상현/하현달' };
  var theme = matched.theme || {};

  var stage = card.querySelector('.sukuyo-flower-stage');
  var nameEl = document.getElementById('sfCardName');
  var symbolismEl = document.getElementById('sfCardSymbolism');
  var keywordsEl = document.getElementById('sfCardKeywords');
  var mansionBadgeEl = document.getElementById('sfCardMansionBadge');
  var phaseBadgeEl = document.getElementById('sfCardPhaseBadge');
  var guardianBadgeEl = document.getElementById('sfCardGuardianBadge');
  var dataLineEl = document.getElementById('sfCardDataLine');
  var starfall = card.querySelector('.sukuyo-starfall-field');
  var orbit = card.querySelector('.sukuyo-orbit-field');
  var constellationPath = document.getElementById('sfCardConstellationPath');
  var image = card.querySelector('.sukuyo-flower-stage__image');
  var heroImage = card.querySelector('.sukuyo-flower-hero-image');
  if (!stage || !nameEl || !symbolismEl || !keywordsEl) return;

  card.style.setProperty('--sf-primary', selection.primary);
  card.style.setProperty('--sf-secondary', selection.secondary);
  card.style.setProperty('--sf-glow', String(intensity.glow || 0.72));
  card.style.setProperty('--sf-halo', String(intensity.halo || 0.56));
  if (theme.palette && theme.palette.bgGradient) {
    stage.style.setProperty('--sf-lunar-bg', theme.palette.bgGradient);
  }

  nameEl.textContent = selection.flower.name + ' · ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = matched.sukuyo_verdict || matched.narrative || '숙요 27숙 기반 운명꽃을 판독 중입니다.';
  keywordsEl.textContent = 'sukuyo flower keywords · ' + selection.keywords.join(' • ');
  if (mansionBadgeEl) {
    var mansionLabel = _dfNormalizeSukuyoMansionLabel(sukuyo.mansion_name);
    var groupLabel = _dfNormalizeSukuyoGroupLabel(sukuyo.group);
    mansionBadgeEl.textContent = (mansionLabel || '숙 미확인') + (groupLabel ? (' · ' + groupLabel) : '');
  }
  if (phaseBadgeEl) phaseBadgeEl.textContent = '달 위상 ' + (sukuyo.moon_phase || intensity.moon_label || '판정 대기');
  if (guardianBadgeEl) guardianBadgeEl.textContent = '수호동물 ' + (sukuyo.guardian_animal || '미확인');
  if (dataLineEl) {
    dataLineEl.textContent = (flowerData.focus_signal || '숙요 시그널 대기') + ' · ' + (flowerData.ritual_tip || '달의 리듬을 동기화 중입니다.');
  }

  if (constellationPath) {
    var points = (sukuyo.constellation_points || (theme && theme.constellation_points) || []).slice(0, 10);
    if (points.length >= 2) {
      var d = 'M ' + points[0][0] + ' ' + points[0][1];
      for (var i = 1; i < points.length; i++) d += ' L ' + points[i][0] + ' ' + points[i][1];
      constellationPath.setAttribute('d', d);
    }
  }

  _sfRenderStarfall(starfall, selection.primary, selection.secondary);
  _sfRenderOrbit(orbit, selection.primary, selection.secondary);
  _dfApplyGeneratedFlowerImage(image, selection, 'sukuyo');
  _dfApplyGeneratedFlowerImage(heroImage, selection, 'sukuyo');

  stage.classList.remove('is-eclipse', 'is-full-glow', 'is-lunar-flow', 'is-bloomed');
  if (intensity.moon_style === 'eclipse') stage.classList.add('is-eclipse');
  else if (intensity.moon_style === 'full_glow') stage.classList.add('is-full-glow');
  else stage.classList.add('is-lunar-flow');

  if (!card.__sfTiltBound) {
    card.__sfTiltBound = true;
    var image = card.querySelector('.sukuyo-flower-stage__image');
    card.addEventListener('mousemove', function(e) {
      if (!image) return;
      var rect = card.getBoundingClientRect();
      var rx = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
      var ry = ((e.clientX - rect.left) / rect.width - 0.5) * 7;
      image.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale(1.02)';
    });
    card.addEventListener('mouseleave', function() {
      if (image) image.style.transform = '';
    });
    card.addEventListener('touchmove', function() {
      if (image) image.style.transform = 'scale(1.015)';
    }, { passive: true });
    card.addEventListener('touchend', function() {
      if (image) image.style.transform = '';
    }, { passive: true });
  }

  void stage.offsetWidth;
  stage.classList.add('is-bloomed');
}

function _dfApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var source = _dfNormalizeSource(selection.source || _dfStudioState.activeSource || 'saju');
  selection.source = source;
  var sourceMeta = _DF_SOURCE_META[source] || _DF_SOURCE_META.saju;
  var stageContent = _dfGetUnifiedStageContent(selection);
  var sajuVerdict = _dfGetSajuVerdict(selection);
  var flowerData = selection.flowerData || (selection.matched && selection.matched.flower_data) || {};
  var stage = card.querySelector('.destiny-flower-stage');
  var nameEl = card.querySelector('.destiny-flower-stage__name');
  var symbolismEl = card.querySelector('.destiny-flower-stage__symbolism');
  var keywordsEl = card.querySelector('.destiny-flower-stage__keywords');
  var descEl = document.getElementById('dfUnifiedCardDesc');
  var dayMasterBadgeEl = document.getElementById('dfCardDayMasterBadge');
  var seasonBadgeEl = document.getElementById('dfCardSeasonBadge');
  var environmentBadgeEl = document.getElementById('dfCardEnvironmentBadge');
  var scenarioTitleEl = document.getElementById('dfCardScenarioTitle');
  var dataLineEl = document.getElementById('dfCardDataLine');
  var backdrop = card.querySelector('.destiny-flower-backdrop');
  var glow = card.querySelector('.destiny-flower-glow');
  var particles = card.querySelector('.destiny-flower-particles');
  var image = card.querySelector('.destiny-flower-stage__image');
  var heroImage = card.querySelector('.destiny-flower-hero-image');
  if (!stage || !nameEl || !symbolismEl || !keywordsEl) return;

  _dfSyncSourceTabs(source);
  _dfSyncSourceStickers(source);

  card.style.setProperty('--df-primary', selection.primary);
  card.style.setProperty('--df-secondary', selection.secondary);
  stage.setAttribute('data-source', source);
  if (selection.theme && selection.theme.background && selection.theme.background.gradient) {
    card.style.setProperty('--df-env-gradient', selection.theme.background.gradient);
  }
  if (selection.theme && selection.theme.background && selection.theme.background.season_tint) {
    card.style.setProperty('--df-season-tint', selection.theme.background.season_tint);
  }

  nameEl.textContent = selection.flower.name + ' · ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = stageContent.symbolism || sajuVerdict;
  keywordsEl.textContent = sourceMeta.labelKo + ' 키워드 · ' + (_dfToArray(selection.keywords).join(' • ') || sourceMeta.fallbackKeyword);
  if (descEl) descEl.textContent = sourceMeta.description;
  if (dayMasterBadgeEl) dayMasterBadgeEl.textContent = stageContent.badge1;
  if (seasonBadgeEl) seasonBadgeEl.textContent = stageContent.badge2;
  if (environmentBadgeEl) environmentBadgeEl.textContent = stageContent.badge3;
  if (scenarioTitleEl) scenarioTitleEl.textContent = stageContent.scenarioTitle;
  if (dataLineEl) dataLineEl.textContent = stageContent.dataLine;

  if (backdrop) {
    backdrop.style.background =
      'radial-gradient(circle at 22% 50%, ' + _dfHexToRgba(selection.primary, 0.46) + ', transparent 56%),'
      + 'radial-gradient(circle at 72% 34%, ' + _dfHexToRgba(selection.secondary, 0.40) + ', transparent 60%)';
  }
  if (glow) {
    glow.style.background = 'radial-gradient(circle, ' + _dfHexToRgba(selection.secondary, 0.62) + ', rgba(255,255,255,0))';
  }

  _dfRenderPetals(particles, selection.primary, selection.secondary);
  _dfApplyGeneratedFlowerImage(image, selection, source);
  _dfApplyGeneratedFlowerImage(heroImage, selection, source);
  stage.classList.remove('is-motion-wood', 'is-motion-water', 'is-motion-fire');
  if (source === 'astrology' || source === 'sukuyo') {
    stage.classList.add('is-motion-water');
  } else if (source === 'jamidusu') {
    stage.classList.add('is-motion-fire');
  } else if (flowerData.motion_preset === 'water-flow') {
    stage.classList.add('is-motion-water');
  } else if (flowerData.motion_preset === 'fire-bloom') {
    stage.classList.add('is-motion-fire');
  } else {
    stage.classList.add('is-motion-wood');
  }
  stage.classList.remove('is-bloomed');
  void stage.offsetWidth;
  stage.classList.add('is-bloomed');
}

function _dfSetBodyLock(locked) {
  if (window._perf && typeof window._perf.lockBody === 'function' && typeof window._perf.unlockBody === 'function') {
    if (locked) window._perf.lockBody();
    else window._perf.unlockBody();
    return;
  }
  if (locked) {
    if (!document.body.dataset.dfPrevOverflow) {
      document.body.dataset.dfPrevOverflow = document.body.style.overflow || '';
    }
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = document.body.dataset.dfPrevOverflow || '';
    delete document.body.dataset.dfPrevOverflow;
  }
}

var _DF_STUDIO_HISTORY_KEY = 'destinyFlowerStudioHistory.v1';
var _DF_STUDIO_HISTORY_LIMIT = 12;
var _DF_ACTIVE_SOURCE_KEY = 'destinyFlowerActiveSource.v1';
var _DF_SOURCE_ORDER = ['saju', 'astrology', 'jamidusu', 'sukuyo'];
var _DF_SOURCE_ALIAS = {
  astro: 'astrology',
  zodiac: 'astrology',
  ziwei: 'jamidusu',
  jami: 'jamidusu',
  suk: 'sukuyo',
  lunar: 'sukuyo',
  bazi: 'saju',
  fourpillars: 'saju'
};
var _DF_SOURCE_META = {
  saju: {
    labelKo: '사주',
    stickerMain: '四柱',
    stickerSub: 'Native',
    description: '',
    fallbackKeyword: 'saju • bloom • destiny'
  },
  astrology: {
    labelKo: '점성술',
    stickerMain: 'Zodiac',
    stickerSub: 'Star',
    description: '',
    fallbackKeyword: 'zodiac • nebula • stardust'
  },
  jamidusu: {
    labelKo: '자미두수',
    stickerMain: '紫微',
    stickerSub: 'Purple Star',
    description: '',
    fallbackKeyword: 'ziwei • ming-gong • imperial bloom'
  },
  sukuyo: {
    labelKo: '숙요점',
    stickerMain: '27-Suk',
    stickerSub: '宿曜',
    description: '',
    fallbackKeyword: 'sukuyo • lunar mansion • moon bloom'
  }
};

var _dfStudioState = {
  selection: null,
  history: [],
  flowerData: null,
  activeSource: 'saju'
};

function _dfToArray(v) {
  return Array.isArray(v) ? v.filter(function(item) { return !!item; }) : [];
}

function _dfNormalizeSource(source) {
  var value = String(source || '').trim().toLowerCase();
  if (_DF_SOURCE_ORDER.indexOf(value) >= 0) return value;
  if (_DF_SOURCE_ALIAS[value]) return _DF_SOURCE_ALIAS[value];
  return 'saju';
}

function _dfLoadActiveSource() {
  try {
    return _dfNormalizeSource(localStorage.getItem(_DF_ACTIVE_SOURCE_KEY) || 'saju');
  } catch (e) {
    return 'saju';
  }
}

function _dfPersistActiveSource(source) {
  try {
    localStorage.setItem(_DF_ACTIVE_SOURCE_KEY, _dfNormalizeSource(source));
  } catch (e) {}
}

function _dfSyncSourceTabs(source) {
  var normalized = _dfNormalizeSource(source);
  var tabs = document.querySelectorAll('.df-source-tab[data-df-source-tab]');
  if (!tabs || !tabs.length) return;
  tabs.forEach(function(tab) {
    var tabSource = _dfNormalizeSource(tab.getAttribute('data-df-source-tab'));
    var active = tabSource === normalized;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function _dfApplySourceBadgeStyles(el, baseClass, source, mainText, subText) {
  if (!el) return;
  var normalized = _dfNormalizeSource(source);
  var cls = baseClass === 'hero' ? 'df-source-badge--' : 'df-stage-source-sticker--';
  _DF_SOURCE_ORDER.forEach(function(src) {
    el.classList.remove(cls + src);
  });
  el.classList.add(cls + normalized);
  el.innerHTML = '<b>' + _dfEscapeHtml(mainText || '') + '</b><em>' + _dfEscapeHtml(subText || '') + '</em>';
}

function _dfSyncSourceStickers(source) {
  var normalized = _dfNormalizeSource(source);
  var meta = _DF_SOURCE_META[normalized] || _DF_SOURCE_META.saju;
  var heroSticker = document.getElementById('dfHeroSourceSticker');
  var stageSticker = document.getElementById('dfStageSourceSticker');
  _dfApplySourceBadgeStyles(heroSticker, 'hero', normalized, meta.stickerMain, meta.stickerSub);
  _dfApplySourceBadgeStyles(stageSticker, 'stage', normalized, meta.stickerMain, meta.stickerSub);
}

function _dfSetActiveSource(source) {
  var normalized = _dfNormalizeSource(source);
  _dfStudioState.activeSource = normalized;
  _dfPersistActiveSource(normalized);
  _dfSyncSourceTabs(normalized);
  _dfSyncSourceStickers(normalized);
  return normalized;
}

function _dfResolveSelectionBySource(source) {
  var normalized = _dfNormalizeSource(source);
  if (normalized === 'astrology') return _afResolveSelection();
  if (normalized === 'jamidusu') return _jfResolveSelection();
  if (normalized === 'sukuyo') return _sfResolveSelection();
  return _dfResolveSelection();
}

function _dfBuildUnifiedFlowerData(forceRefresh) {
  if (!forceRefresh && _dfStudioState.flowerData && _dfStudioState.flowerData.sources) {
    return _dfStudioState.flowerData;
  }

  var sources = {};
  _DF_SOURCE_ORDER.forEach(function(src) {
    try {
      var selection = _dfResolveSelectionBySource(src);
      if (selection) selection.source = _dfNormalizeSource(selection.source || src);
      sources[src] = selection;
    } catch (e) {
      console.warn('[DestinyFlower] 통합 데이터 계산 실패 (' + src + '):', e);
      sources[src] = null;
    }
  });

  _dfStudioState.flowerData = {
    updatedAt: Date.now(),
    sources: sources
  };
  return _dfStudioState.flowerData;
}

function _dfGetUnifiedSelection(source, forceRefresh) {
  var normalized = _dfNormalizeSource(source);
  var data = _dfBuildUnifiedFlowerData(!!forceRefresh);
  var selection = data && data.sources ? data.sources[normalized] : null;
  if (!selection) {
    selection = _dfResolveSelectionBySource(normalized);
  }
  if (!selection) {
    selection = _dfResolveSelection();
  }
  if (selection) selection.source = _dfNormalizeSource(selection.source || normalized);
  return selection;
}

_dfStudioState.activeSource = _dfLoadActiveSource();

function _dfGetSajuVerdict(selection) {
  if (!selection) return '운명의 꽃 판정을 준비 중입니다.';
  var matched = selection.matched || {};
  if (matched.sukuyo_verdict) return matched.sukuyo_verdict;
  if (matched.jamidusu_verdict) return matched.jamidusu_verdict;
  if (matched.astro_verdict) return matched.astro_verdict;
  if (matched.saju_verdict) return matched.saju_verdict;
  if (matched.verdict) return matched.verdict;
  var flower = selection.flower || {};
  var flowerName = flower.name || '운명의 꽃';
  var latin = flower.scientific_name ? ' (' + flower.scientific_name + ')' : '';
  if (selection.source === 'sukuyo') {
    return '숙요점으로 볼 때 당신의 꽃은 ' + flowerName + latin + ' 입니다.';
  }
  if (selection.source === 'jamidusu') {
    return '자미두수로 볼 때 당신의 꽃은 ' + flowerName + latin + ' 입니다.';
  }
  if (selection.source === 'astrology') {
    return '점성술로 볼 때 당신의 꽃은 ' + flowerName + latin + ' 입니다.';
  }
  return '사주로 볼 때 당신의 꽃은 ' + flowerName + latin + ' 입니다.';
}

function _dfElementLabelKo(raw) {
  var map = {
    wood: '목(木)',
    fire: '화(火)',
    earth: '토(土)',
    metal: '금(金)',
    water: '수(水)',
    Wood: '목(木)',
    Fire: '화(火)',
    Earth: '토(土)',
    Metal: '금(金)',
    Water: '수(水)'
  };
  return map[String(raw || '').trim()] || String(raw || '').trim();
}

function _dfJohuLabel(raw) {
  var v = String(raw || '').trim().toLowerCase();
  if (!v) return '판정 대기';
  if (v === 'hot' || v === 'warm') return '온조(溫燥)';
  if (v === 'cold' || v === 'cool') return '한습(寒濕)';
  if (v === 'temperate' || v === 'balanced') return '중화(中和)';
  return String(raw || '').trim();
}

function _dfJoinElementLabels(list) {
  var arr = _dfToArray(list).map(_dfElementLabelKo).filter(Boolean);
  return arr.length ? arr.join(' · ') : '판정 대기';
}

function _dfNormalizeSukuyoMansionLabel(raw) {
  var text = String(raw || '').trim();
  if (!text) return '';
  text = text.replace(/^숙\s+/, '').trim();
  if (text.indexOf('·') >= 0) text = text.split('·')[0].trim();
  if (text.indexOf('|') >= 0) text = text.split('|')[0].trim();
  return text;
}

function _dfNormalizeSukuyoGroupLabel(raw) {
  var text = String(raw || '').trim();
  if (!text) return '';
  text = text.replace(/^그룹\s+/, '').trim();
  if (/그룹$/.test(text)) return text;
  text = text.replace(/숙$/, '').trim();
  return text ? (text + ' 그룹') : '';
}

function _dfGetSajuBadges(selection) {
  var saved = selection && selection.saju_badges;
  if (saved && typeof saved === 'object' && saved.mode === 'sukuyo') {
    return {
      mode: 'sukuyo',
      mansion: _dfNormalizeSukuyoMansionLabel(saved.mansion) || '미확인',
      group: _dfNormalizeSukuyoGroupLabel(saved.group || ''),
      phase: saved.phase || '미확인',
      guardian: saved.guardian || '미확인'
    };
  }
  if (saved && typeof saved === 'object' && saved.mode === 'jamidusu') {
    return {
      mode: 'jamidusu',
      star: saved.star || '미확인',
      brightness: saved.brightness || '미확인',
      palace: saved.palace || '미확인'
    };
  }
  if (saved && typeof saved === 'object' && saved.mode === 'astrology') {
    return {
      mode: 'astrology',
      sun: saved.sun || '미확인',
      rising: saved.rising || '미확인',
      moon: saved.moon || '미확인'
    };
  }
  if (saved && typeof saved === 'object' && saved.mode !== 'astrology') {
    return {
      mode: 'saju',
      strength: saved.strength || '판정 대기',
      yongshin: saved.yongshin || '판정 대기',
      johu: saved.johu || '판정 대기'
    };
  }

  var matched = selection && selection.matched ? selection.matched : {};
  if ((selection && selection.source === 'sukuyo') || matched.source === 'sukuyo') {
    var sy = matched.sukuyo || {};
    return {
      mode: 'sukuyo',
      mansion: _dfNormalizeSukuyoMansionLabel(sy.mansion_name) || '미확인',
      group: _dfNormalizeSukuyoGroupLabel(sy.group || ''),
      phase: sy.moon_phase || (matched.visual_intensity && matched.visual_intensity.moon_label) || '미확인',
      guardian: sy.guardian_animal || '미확인'
    };
  }
  if ((selection && selection.source === 'jamidusu') || matched.source === 'jamidusu') {
    var ziwei = matched.ziwei || {};
    var stars = Array.isArray(ziwei.primary_stars) ? ziwei.primary_stars.join('·') : '';
    return {
      mode: 'jamidusu',
      star: stars || '미확인',
      brightness: ziwei.brightness || (matched.visual_intensity && matched.visual_intensity.brightness_label) || '미확인',
      palace: ziwei.palace || '미확인'
    };
  }
  if ((selection && selection.source === 'astrology') || matched.source === 'astrology') {
    var chart = matched.chart || {};
    return {
      mode: 'astrology',
      sun: chart.sun_sign || '미확인',
      rising: chart.rising_sign || '미확인',
      moon: chart.moon_sign || '미확인'
    };
  }

  var payload = selection && selection.payload ? selection.payload : {};
  var analysis = payload.analysis || {};
  var saju = payload.saju || {};

  var strength = '';
  if (analysis.power_label) strength = String(analysis.power_label);
  else if (saju.power_label) strength = String(saju.power_label);
  else if (typeof analysis.isStrong === 'boolean') strength = analysis.isStrong ? '신강' : '신약';
  else if (typeof saju.is_strong === 'boolean') strength = saju.is_strong ? '신강' : '신약';
  else strength = '판정 대기';

  var yongshin = _dfJoinElementLabels(saju.yongshin_elements || analysis.yongshin_elements || []);
  var johu = _dfJohuLabel(saju.johu_type || saju.johuType || analysis.johuType || analysis.johu_type || '');

  return {
    mode: 'saju',
    strength: strength,
    yongshin: yongshin,
    johu: johu
  };
}

function _dfGetUnifiedStageContent(selection) {
  var source = _dfNormalizeSource(selection && selection.source);
  var matched = (selection && selection.matched) || {};
  var flowerData = (selection && selection.flowerData) || matched.flower_data || {};
  var badges = _dfGetSajuBadges(selection || {});

  if (source === 'astrology') {
    return {
      badge1: '태양궁 ' + (badges.sun || '미확인'),
      badge2: '상승궁 ' + (badges.rising || '미확인'),
      badge3: '달궁 ' + (badges.moon || '미확인'),
      scenarioTitle: matched.astro_verdict || matched.narrative || '점성술 별자리 개화 시나리오를 계산 중입니다.',
      dataLine: (flowerData.focus_signal || '차트 시그널 대기') + ' · ' + (flowerData.ritual_tip || '성운 리듬을 정렬 중입니다.'),
      symbolism: matched.astro_verdict || matched.narrative || ''
    };
  }

  if (source === 'jamidusu') {
    return {
      badge1: '오늘의 강한 별 ' + (badges.star || '미확인'),
      badge2: '별 밝기 ' + (badges.brightness || '미확인'),
      badge3: '궁위 ' + (badges.palace || '미확인'),
      scenarioTitle: matched.jamidusu_verdict || matched.narrative || '자미두수 주성 개화 시나리오를 계산 중입니다.',
      dataLine: (flowerData.focus_signal || '주성 시그널 대기') + ' · ' + (flowerData.ritual_tip || '제왕의 기운을 조율 중입니다.'),
      symbolism: matched.jamidusu_verdict || matched.narrative || ''
    };
  }

  if (source === 'sukuyo') {
    return {
      badge1: badges.mansion || '미확인',
      badge2: '달 위상 ' + (badges.phase || '미확인'),
      badge3: '수호동물 ' + (badges.guardian || '미확인'),
      scenarioTitle: matched.sukuyo_verdict || matched.narrative || '숙요 달빛 개화 시나리오를 계산 중입니다.',
      dataLine: (flowerData.focus_signal || '숙요 시그널 대기') + ' · ' + (flowerData.ritual_tip || '달의 리듬을 동기화 중입니다.'),
      symbolism: matched.sukuyo_verdict || matched.narrative || ''
    };
  }

  return {
    badge1: flowerData.day_master_badge || '일간 판독 대기',
    badge2: (flowerData.season_label || '계절') + ' 결',
    badge3: (flowerData.environment_label || '환경') + ' 무드',
    scenarioTitle: flowerData.scenario_title || '일간-환경 개화 시나리오를 계산 중입니다.',
    dataLine: (flowerData.ritual_tip || '') + ((flowerData.ritual_tip && flowerData.focus_signal) ? ' · ' : '') + (flowerData.focus_signal || '꽃 데이터 시트를 준비 중입니다.'),
    symbolism: flowerData.scenario_reason || ''
  };
}

function _dfAnimateUnifiedCardSwitch(card, selection) {
  if (!card || !selection) return;
  var syncCardHeight = function() {
    if (typeof syncFeatureCardHeight === 'function') {
      syncFeatureCardHeight(card);
    }
  };
  var stage = card.querySelector('.destiny-flower-stage');
  if (!stage) {
    _dfApplyCardVisual(card, selection);
    syncCardHeight();
    return;
  }
  syncCardHeight();
  if (card.__dfSwitchTimer) clearTimeout(card.__dfSwitchTimer);
  stage.classList.remove('is-switching-in', 'is-switching-out', 'is-switching');
  stage.classList.add('is-switching', 'is-switching-out');
  card.__dfSwitchTimer = setTimeout(function() {
    _dfApplyCardVisual(card, selection);
    syncCardHeight();
    stage.classList.remove('is-switching-out');
    stage.classList.add('is-switching-in');
    setTimeout(function() {
      stage.classList.remove('is-switching-in', 'is-switching');
      syncCardHeight();
    }, 390);
  }, 170);
}

function _dfBurstButtonPetals(button) {
  if (!button || !button.getBoundingClientRect) return;
  var count = 7;
  for (var i = 0; i < count; i++) {
    var petal = document.createElement('span');
    petal.className = 'df-click-petal';
    var dx = (Math.random() * 42 - 21).toFixed(1) + 'px';
    var dy = (-18 - Math.random() * 34).toFixed(1) + 'px';
    var dr = (Math.random() * 80 - 40).toFixed(1) + 'deg';
    petal.style.setProperty('--dx', dx);
    petal.style.setProperty('--dy', dy);
    petal.style.setProperty('--dr', dr);
    petal.style.left = (24 + Math.random() * 52).toFixed(2) + '%';
    petal.style.top = (36 + Math.random() * 34).toFixed(2) + '%';
    button.appendChild(petal);
    setTimeout(function(node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }, 920, petal);
  }
}

function _dfBindBloomingInteractions() {
  if (window.__dfBloomBound) return;
  window.__dfBloomBound = true;

  document.addEventListener('click', function(e) {
    var target = e.target && e.target.closest ? e.target.closest('.df-bloom-btn') : null;
    if (!target) return;
    _dfBurstButtonPetals(target);
  });

  var card = document.querySelector('.feature-card.feature-card--destiny-flower');
  if (!card || card.__dfHoverBound) return;
  card.__dfHoverBound = true;

  card.addEventListener('mousemove', function(e) {
    var rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var nx = (e.clientX - rect.left) / rect.width;
    var ny = (e.clientY - rect.top) / rect.height;
    var tiltY = ((nx - 0.5) * 5.6).toFixed(2) + 'deg';
    var tiltX = ((0.5 - ny) * 4.6).toFixed(2) + 'deg';
    card.style.setProperty('--df-tilt-x', tiltX);
    card.style.setProperty('--df-tilt-y', tiltY);
  });
  card.addEventListener('mouseleave', function() {
    card.style.setProperty('--df-tilt-x', '0deg');
    card.style.setProperty('--df-tilt-y', '0deg');
  });
}

function _dfRunIntroBloom() {
  var card = document.querySelector('.feature-card.feature-card--destiny-flower');
  if (!card || card.classList.contains('is-intro-bloom')) return;
  card.classList.add('is-intro-bloom');
  setTimeout(function() {
    card.classList.remove('is-intro-bloom');
  }, 1800);
}

function _dfRenderSajuBadges(selection) {
  var wrap = document.getElementById('dfStudioSajuBadges');
  if (!wrap) return;

  var badges = _dfGetSajuBadges(selection);
  var rows = badges.mode === 'sukuyo'
    ? [
      { cls: 'is-strength', label: '숙', value: badges.mansion },
      { cls: 'is-yongshin', label: '달 위상', value: badges.phase },
      { cls: 'is-johu', label: '수호동물', value: badges.guardian }
    ]
    : (badges.mode === 'jamidusu'
      ? [
        { cls: 'is-strength', label: '오늘의 강한 별', value: badges.star },
        { cls: 'is-yongshin', label: '별 밝기', value: badges.brightness },
        { cls: 'is-johu', label: '궁위', value: badges.palace }
      ]
      : (badges.mode === 'astrology'
        ? [
          { cls: 'is-strength', label: '태양궁', value: badges.sun },
          { cls: 'is-yongshin', label: '상승궁', value: badges.rising },
          { cls: 'is-johu', label: '달궁', value: badges.moon }
        ]
        : [
          { cls: 'is-strength', label: '신강/신약', value: badges.strength },
          { cls: 'is-yongshin', label: '용신', value: badges.yongshin },
          { cls: 'is-johu', label: '조후', value: badges.johu }
        ]));

  wrap.innerHTML = rows.map(function(row) {
    return '<span class="df-saju-badge ' + row.cls + '"><b>' + _dfEscapeHtml(row.label) + '</b><em>' + _dfEscapeHtml(row.value || '판정 대기') + '</em></span>';
  }).join('');
}

function _dfFormatSavedAt(ts) {
  var d = new Date(ts || Date.now());
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  var hh = String(d.getHours()).padStart(2, '0');
  var mm = String(d.getMinutes()).padStart(2, '0');
  return y + '.' + m + '.' + day + ' ' + hh + ':' + mm;
}

function _dfBuildSnapshot(selection) {
  if (!selection || !selection.flower) return null;
  var flower = selection.flower;
  var badges = _dfGetSajuBadges(selection);
  var flowerData = selection.flowerData || (selection.matched && selection.matched.flower_data) || null;
  var matched = selection.matched || {};
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    savedAt: Date.now(),
    savedAtLabel: _dfFormatSavedAt(Date.now()),
    name: flower.name || 'Unknown flower',
    scientific_name: flower.scientific_name || 'Unknown species',
    symbolism: flower.symbolism || '',
    keywords: _dfToArray(selection.keywords),
    primary: selection.primary || '#f472b6',
    secondary: selection.secondary || '#22d3ee',
    particle_type: flower.particle_type || 'petal',
    source: selection.source || 'saju',
    astrology_chart: matched.chart || null,
    ziwei_data: matched.ziwei || null,
    sukuyo_data: matched.sukuyo || null,
    visual_intensity: matched.visual_intensity || null,
    day_master_badge: flowerData && flowerData.day_master_badge ? flowerData.day_master_badge : '',
    flower_data: flowerData,
    saju_badges: badges,
    saju_verdict: _dfGetSajuVerdict(selection),
    narrative: (selection.matched && selection.matched.narrative) || '',
    guidance: flower.vibe_message || '오늘은 결과보다 리듬을 먼저 맞추면 개화 속도가 빨라집니다.'
  };
}

function _dfSelectionFromSnapshot(snapshot) {
  var keywords = _dfToArray(snapshot && snapshot.keywords);
  var savedBadges = (snapshot && snapshot.saju_badges && typeof snapshot.saju_badges === 'object') ? snapshot.saju_badges : null;
  return {
    source: (snapshot && snapshot.source) || 'saju',
    matched: {
      narrative: (snapshot && snapshot.narrative) || '',
      saju_verdict: (snapshot && snapshot.saju_verdict) || '',
      flower_data: (snapshot && snapshot.flower_data) || null,
      chart: (snapshot && snapshot.astrology_chart) || null,
      ziwei: (snapshot && snapshot.ziwei_data) || null,
      sukuyo: (snapshot && snapshot.sukuyo_data) || null,
      visual_intensity: (snapshot && snapshot.visual_intensity) || null
    },
    flower: {
      name: (snapshot && snapshot.name) || 'Unknown flower',
      scientific_name: (snapshot && snapshot.scientific_name) || 'Unknown species',
      symbolism: (snapshot && snapshot.symbolism) || '',
      keywords: keywords,
      particle_type: (snapshot && snapshot.particle_type) || 'petal',
      vibe_message: (snapshot && snapshot.guidance) || ''
    },
    primary: (snapshot && snapshot.primary) || '#f472b6',
    secondary: (snapshot && snapshot.secondary) || '#22d3ee',
    keywords: keywords,
    flowerData: (snapshot && snapshot.flower_data) || null,
    saju_badges: savedBadges
  };
}

function _dfLoadHistory() {
  try {
    var raw = localStorage.getItem(_DF_STUDIO_HISTORY_KEY);
    var parsed = raw ? JSON.parse(raw) : [];
    _dfStudioState.history = Array.isArray(parsed) ? parsed.slice(0, _DF_STUDIO_HISTORY_LIMIT) : [];
  } catch (e) {
    _dfStudioState.history = [];
  }
  return _dfStudioState.history;
}

function _dfPersistHistory() {
  try {
    localStorage.setItem(_DF_STUDIO_HISTORY_KEY, JSON.stringify(_dfStudioState.history.slice(0, _DF_STUDIO_HISTORY_LIMIT)));
  } catch (e) {
    console.warn('[DestinyFlower] 히스토리 저장 실패:', e);
  }
}

function _dfSetStudioStatus(message) {
  var el = document.getElementById('dfStudioStatus');
  if (el) el.textContent = message || '';
}

function _dfEscapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _dfBuildShareText(snapshot) {
  if (!snapshot) return '운명의 꽃 결과를 준비 중입니다.';
  var sourceLabel = snapshot.source === 'sukuyo'
    ? '숙요점'
    : (snapshot.source === 'jamidusu' ? '자미두수' : (snapshot.source === 'astrology' ? '점성술' : '사주'));
  var sajuVerdict = snapshot.saju_verdict || (sourceLabel + '로 볼 때 당신의 꽃은 ' + snapshot.name + ' 입니다.');
  var lines = [
    '🌸 운명의 꽃 아틀리에 결과',
    '',
    sajuVerdict,
    snapshot.name + ' (' + snapshot.scientific_name + ')',
    snapshot.day_master_badge ? ((snapshot.source === 'astrology' ? '차트 배지: ' : (snapshot.source === 'jamidusu' ? '주성 배지: ' : (snapshot.source === 'sukuyo' ? '숙요 배지: ' : '일간 배지: '))) + snapshot.day_master_badge) : '',
    snapshot.symbolism,
    '키워드: ' + _dfToArray(snapshot.keywords).join(' • '),
    '팔레트: ' + snapshot.primary + ' / ' + snapshot.secondary,
    '입자 무드: ' + snapshot.particle_type
  ];
  if (snapshot.narrative) lines.push('', snapshot.narrative);
  lines.push('', window.location.href);
  return lines.join('\n');
}

function _dfOneLineText(value, fallback) {
  var line = String(value || '').replace(/\s+/g, ' ').trim();
  return line || (fallback || '');
}

function _dfGetSourceLabel(source) {
  return source === 'sukuyo'
    ? '숙요점'
    : (source === 'jamidusu' ? '자미두수' : (source === 'astrology' ? '점성술' : '사주'));
}

function _dfGetPromptArtDirection(source) {
  if (source === 'astrology') {
    return {
      mood: '별빛 성운과 네온 글로우가 감도는 몽환적 플로럴',
      lighting: 'moonlit rim light, cosmic dust volumetric light',
      background: 'deep navy nebula sky with subtle zodiac traces',
      composition: 'hero blossom centered, spiral petal motion, celestial particles'
    };
  }
  if (source === 'jamidusu') {
    return {
      mood: '제왕의 품격과 궁중의 정제미가 공존하는 플로럴',
      lighting: 'royal soft spotlight, silky ambient glow',
      background: 'imperial jade and plum gradient with star map motif',
      composition: 'symmetrical ceremonial bloom, layered velvet petals'
    };
  }
  if (source === 'sukuyo') {
    return {
      mood: '달빛 명상과 고요한 수면 같은 청명한 플로럴',
      lighting: 'silver moon halo, soft mist backlight',
      background: 'midnight blue sky with lunar mansion orbit lines',
      composition: 'single moon-bloom portrait, floating pollen and orbit arcs'
    };
  }
  return {
    mood: '오행의 결을 따라 피어나는 서정적 동양 플로럴',
    lighting: 'soft dawn light, translucent petal glow',
    background: 'seasonal gradient inspired by wood fire earth metal water',
    composition: 'centered blossom portrait, elegant negative space, subtle petal drift'
  };
}

function _dfAstroElementFromSign(sign) {
  var v = String(sign || '').trim().toLowerCase();
  if (!v) return '';
  if (/aries|leo|sagittarius|양자리|사자자리|사수자리/.test(v)) return 'fire';
  if (/taurus|virgo|capricorn|황소자리|처녀자리|염소자리/.test(v)) return 'earth';
  if (/gemini|libra|aquarius|쌍둥이자리|천칭자리|물병자리/.test(v)) return 'air';
  if (/cancer|scorpio|pisces|게자리|전갈자리|물고기자리/.test(v)) return 'water';
  return '';
}

function _dfExtractFiveElements(text) {
  var src = String(text || '');
  var list = [];
  ['목', '화', '토', '금', '수'].forEach(function(el) {
    if (src.indexOf(el) >= 0) list.push(el);
  });
  return list;
}

function _dfBuildYongshinCareLine(yongshinText) {
  var careByElement = {
    '목': '아침 햇살이 드는 동쪽 창가에서 8분 스트레칭으로 생장점을 깨우기',
    '화': '남향 빛을 5분 쬐며 오늘의 목표를 소리 내어 선언하기',
    '토': '작업 공간 한 구역을 정리해 중심 축을 단단히 세우기',
    '금': '우선순위 3가지를 적고 불필요한 약속을 과감히 가지치기',
    '수': '저녁 10분 산책과 수분 보충으로 감정의 순환로 열기'
  };
  var elements = _dfExtractFiveElements(yongshinText);
  if (!elements.length) {
    return '빛(오전)과 수분(저녁) 루틴을 고정해 기초 생육 리듬을 먼저 안정화하세요.';
  }
  return elements.slice(0, 2).map(function(el) {
    return careByElement[el] || '';
  }).filter(Boolean).join(' + ');
}

function _dfBuildSynergyPaletteText(source, primaryHex, secondaryHex) {
  var primary = _dfSafeColor(primaryHex, '#f472b6');
  var secondary = _dfSafeColor(secondaryHex, '#22d3ee');
  var accent = _dfMixHex(primary, secondary, 0.5);
  var materials = source === 'astrology'
    ? '유리 화기, 실버 프레임, 미세 조명'
    : (source === 'jamidusu'
      ? '새틴 패브릭, 브론즈 오브제, 대칭형 세라믹'
      : (source === 'sukuyo'
        ? '서리 유리, 달빛 톤 린넨, 물결 무늬 트레이'
        : '무광 세라믹, 내추럴 우드, 잔잔한 패턴 패브릭'));
  return '추천 컬러: Primary ' + primary + ', Secondary ' + secondary + ', Accent ' + accent + ' / 추천 소재: ' + materials + '.';
}

function _dfBuildAtelierExtension(selection, sourceLabel, badges, flowerData, sajuVerdict) {
  var source = _dfNormalizeSource(selection && selection.source);
  var flower = (selection && selection.flower) || {};
  var primary = _dfSafeColor(selection && selection.primary, '#f472b6');
  var secondary = _dfSafeColor(selection && selection.secondary, '#22d3ee');
  var scenarioTitle = flowerData.scenario_title || (sourceLabel + ' 개화 시나리오');
  var growthCycle = flowerData.growth_cycle || '개화 사이클 계산 대기';
  var ritualTip = flowerData.ritual_tip || '오늘의 실천 루틴을 계산 중입니다.';
  var relation = flowerData.relationship_theme || '';
  var career = flowerData.career_theme || '';
  var matrix = [];
  var sectionTitle = '';
  var observationLog = '';
  var secretRecipe = '';
  var flowerLanguage = '';
  var gardenerWord = '';
  var particleMood = '';

  if (source === 'astrology') {
    var sun = badges.sun || '미확인';
    var rising = badges.rising || sun;
    var moon = badges.moon || sun;
    var risingEl = _dfAstroElementFromSign(rising) || _dfAstroElementFromSign(sun) || 'air';
    var moonEl = _dfAstroElementFromSign(moon) || risingEl;
    var lighting = risingEl === 'fire'
      ? '한여름 정오처럼 각도가 높은 강렬한 태양광'
      : (risingEl === 'earth'
        ? '늦은 오후의 황금빛이 오래 머무는 안정형 광량'
        : (risingEl === 'water'
          ? '새벽녘의 차가운 푸른 빛이 천천히 번지는 조도'
          : '바람결처럼 기울어진 사선광이 공간을 가볍게 여는 조도'));
    var humidity = moonEl === 'water'
      ? '감성 습도가 높은 실버 미스트 상태'
      : (moonEl === 'fire'
        ? '열기를 품은 드라이 에어, 감정 반응이 빠른 상태'
        : (moonEl === 'earth'
          ? '안정적인 토분 습도, 감정이 서서히 농익는 상태'
          : '가볍고 유동적인 브리즈 습도, 아이디어가 빠르게 환기되는 상태'));
    var cosmicSeason = risingEl === 'fire'
      ? '개화 가속기: 실행과 발표가 꽃봉오리를 밀어 올리는 구간'
      : (risingEl === 'water'
        ? '내면 양분기: 휴식과 직관이 뿌리층을 채우는 구간'
        : '균형 조율기: 구조와 감성이 교차하며 다음 꽃눈을 준비하는 구간');

    sectionTitle = '천체의 조도와 에너지';
    matrix = [
      '☀️ 천체의 조도: ' + lighting,
      '💧 대기의 습도: ' + humidity,
      '🪐 우주의 계절: ' + cosmicSeason
    ];
    observationLog = '정원사의 관찰 일지: 태양궁 ' + sun + '의 방향성과 상승궁 ' + rising + '의 빛이 꽃대의 각도를 잡아줍니다. 달궁 ' + moon + '의 습도 조절이 감정 잎맥을 부드럽게 열며, 이번 주는 기회가 먼저 보이는 개화 전조 구간입니다.';
    secretRecipe = '비밀 레시피: 밤 9시 이후 창가 조명을 한 단계 낮추고, 내일 실행할 한 가지를 노트 첫 줄에 적어 두세요. 아침 첫 12분은 그 한 가지에만 집중하면 별빛 리듬이 가장 빠르게 맞춰집니다.';
    flowerLanguage = '운명의 꽃말: 별의 각도를 믿고 한 걸음을 먼저 내딛는 용기.';
    gardenerWord = '이 꽃을 위한 가드너의 한 마디: 오늘의 직감은 과장이 아니라 예보입니다. 작은 실행이 성운을 현실의 꽃밭으로 바꿉니다.';
    particleMood = sourceLabel + '의 광량을 입자로 번역하면 "' + (flower.particle_type || 'stardust') + '" 결이 가장 안정적으로 빛납니다.';
  } else if (source === 'jamidusu') {
    var star = badges.star || '미확인';
    var brightness = badges.brightness || '미확인';
    var palace = badges.palace || '미확인';
    var structure = /자미|zi ?wei/i.test(star)
      ? '자미성 계열의 황실 기품이 깃든 단단한 꽃대'
      : (/칠살|파군|qisha|pogun/i.test(star)
        ? '돌파형 장군 기질이 만든 굵고 강직한 줄기'
        : (/태음|tai ?yin|천기|tian ?ji/i.test(star)
          ? '유연하지만 쉽게 꺾이지 않는 세밀한 복층 꽃잎'
          : '균형형 주성이 만든 정제된 대칭 구조의 꽃골격'));
    var social = palace + ' 주변으로 나비와 벌이 순환하듯, 가까운 인연이 역할 분담을 나눠 성장을 돕는 흐름입니다.';
    var thorns = /함|陷|한|閑/.test(brightness)
      ? '방어력이 높은 짧은 가시가 촘촘해 경계를 세워주는 시기'
      : '빛을 반사하는 결 무늬가 가시 역할을 대신해 품격 있게 자신을 보호하는 시기';

    sectionTitle = '꽃의 품격과 형태';
    matrix = [
      '🏛️ 꽃의 골격: ' + structure,
      '🦋 나비와 벌: ' + social,
      '🌵 수호의 가시: ' + thorns
    ];
    observationLog = '정원사의 관찰 일지: 오늘의 강한 별 ' + star + '이 줄기 중심을 곧게 세우고, 별 밝기 ' + brightness + '가 꽃잎의 윤기를 조정합니다. 지금은 화려함보다 구조적 완성도가 성과를 키우는 시기입니다.';
    secretRecipe = '비밀 레시피: 책상 왼쪽에 메탈 계열 오브제를 하나 두고, 오늘의 기준 1개와 양보선 1개를 동시에 기록하세요. 경계가 선명해질수록 꽃은 더 우아하게 핍니다.';
    flowerLanguage = '운명의 꽃말: 품격은 단단한 구조에서 피어나는 가장 조용한 광채.';
    gardenerWord = '이 꽃을 위한 가드너의 한 마디: 화려함을 서두르지 마세요. 기준을 지킨 하루가 결국 가장 오래가는 꽃대를 만듭니다.';
    particleMood = sourceLabel + '의 위계를 입자로 번역하면 "' + (flower.particle_type || 'imperial') + '" 무드가 질서를 가장 아름답게 드러냅니다.';
  } else if (source === 'sukuyo') {
    var mansion = badges.mansion || '미확인';
    var phase = badges.phase || '미확인';
    var guardian = badges.guardian || '수호동물 미확인';
    var scent = /친|友|friend/i.test(mansion)
      ? '달빛 아래 번지는 은은한 화이트 머스크 계열'
      : (/업|危|danger/i.test(mansion)
        ? '짙고 깊은 침향 계열, 집중력을 끌어올리는 향'
        : '청명한 허브 플로럴 계열, 관계의 온도를 부드럽게 맞추는 향');
    var dew = /보름|full/i.test(phase)
      ? '밤이슬이 가장 충만해 영감과 감정 표현이 동시에 풍성한 상태'
      : (/삭|new/i.test(phase)
        ? '이슬이 얇게 맺히는 신월 구간으로, 관찰과 준비가 우선인 상태'
        : '적당한 이슬량으로 감정의 균형과 실행력이 함께 자라는 상태');
    var companion = /용|dragon/i.test(guardian)
      ? '등나무와 블루세이지 조합, 큰 확장 흐름을 지지'
      : (/개|dog/i.test(guardian)
        ? '로즈메리와 캐모마일 조합, 관계 안정과 회복 탄력 강화'
        : (/호랑이|tiger/i.test(guardian)
          ? '유칼립투스와 루드베키아 조합, 결단력과 보호 본능 강화'
          : '라벤더와 아이비 조합, 정서 안정과 장기 성장 동시 지원'));

    sectionTitle = '인연의 향기와 이슬';
    matrix = [
      '🌙 운명의 향기: ' + scent,
      '💦 밤이슬의 양: ' + dew,
      '🌿 동반 식물: ' + companion
    ];
    observationLog = '정원사의 관찰 일지: ' + mansion + '의 관계성은 향기로 먼저 드러나고, 달 위상 ' + phase + '은 이슬의 밀도로 감정 리듬을 조절합니다. 지금은 인연의 속도를 재촉하기보다 결을 맞추는 세심함이 꽃을 오래 지킵니다.';
    secretRecipe = '비밀 레시피: 자기 전 물 한 잔을 천천히 마신 뒤, 오늘 고마웠던 이름 1개를 조용히 적어두세요. 달의 수분 리듬이 안정되며 관계 운이 부드럽게 열립니다.';
    flowerLanguage = '운명의 꽃말: 조용한 공감이 가장 멀리 퍼지는 향기가 된다.';
    gardenerWord = '이 꽃을 위한 가드너의 한 마디: 서두르지 않아도 괜찮습니다. 밤이슬이 모이듯, 당신의 인연도 정확한 타이밍에 선명해집니다.';
    particleMood = sourceLabel + '의 달빛 리듬을 입자로 번역하면 "' + (flower.particle_type || 'lunar') + '" 무드가 가장 포근하게 감싸줍니다.';
  } else {
    var strength = badges.strength || '판정 대기';
    var johu = badges.johu || '판정 대기';
    var yongshin = badges.yongshin || '';
    var soil = johu.indexOf('한습') >= 0
      ? '수분을 머금은 습지형 옥토'
      : (johu.indexOf('온조') >= 0
        ? '배수성이 높은 따뜻한 자갈 혼합토'
        : '입자가 고르고 미네랄이 안정된 비옥한 옥토');
    var root = strength.indexOf('신강') >= 0
      ? '뿌리가 깊게 박혀 외부 변화에도 중심을 지키는 단계'
      : (strength.indexOf('신약') >= 0
        ? '섬세한 잔뿌리가 먼저 퍼지며 지지대를 필요로 하는 단계'
        : '중간 깊이 뿌리가 고르게 확장되는 균형 단계');
    var nutrient = _dfBuildYongshinCareLine(yongshin);

    sectionTitle = '성장의 토양과 뿌리';
    matrix = [
      '🪨 토양의 성분: ' + soil,
      '🌱 뿌리의 깊이: ' + root,
      '🧪 가드너의 영양제: ' + nutrient
    ];
    observationLog = '정원사의 관찰 일지: 오늘 정원은 ' + soil + '의 결을 띠며, ' + root + ' 흐름으로 생장 에너지가 움직입니다. 겉으로 조용해 보여도 뿌리층에서는 다음 개화를 위한 힘이 단단히 저장되고 있습니다.';
    secretRecipe = '비밀 레시피: 북쪽 또는 동쪽 창가에 푸른 잎 식물을 두고, 아침 10분은 몸을 풀고 저녁 10분은 호흡을 고르세요. 하루 두 번의 리듬 고정이 용신 기운을 가장 빠르게 끌어올립니다.';
    flowerLanguage = '운명의 꽃말: 단단한 뿌리는 늦어 보여도 결국 가장 높게 핀다.';
    gardenerWord = '이 꽃을 위한 가드너의 한 마디: 조급함보다 축적을 믿으세요. 오늘의 작은 관리가 다음 계절의 큰 결실을 만듭니다.';
    particleMood = sourceLabel + ' 기운의 미세한 움직임을 입자로 번역하면 "' + (flower.particle_type || 'petal') + '" 무드가 가장 조화롭습니다.';
  }

  return {
    dataSummary: '[' + sectionTitle + '] ' + scenarioTitle + ' · ' + growthCycle,
    ritualLine: ritualTip,
    themesLine: [relation, career].filter(Boolean).join(' · ') || '관계/일 테마를 분석 중입니다.',
    sourceMatrix: matrix,
    observationLog: observationLog,
    secretRecipe: secretRecipe,
    flowerLanguage: flowerLanguage,
    synergyPalette: _dfBuildSynergyPaletteText(source, primary, secondary),
    gardenerWord: gardenerWord,
    particleMood: particleMood,
    oneLineGuidance: sourceLabel + ' 운명꽃 실천 가이드: ' + (flower.vibe_message || sajuVerdict)
  };
}

function _dfBuildPromptBadgeLine(selection) {
  var badges = _dfGetSajuBadges(selection || {});
  if (badges.mode === 'sukuyo') {
    return '숙요 배지: ' + _dfOneLineText(badges.mansion, '미확인') + ' / 달 위상 ' + _dfOneLineText(badges.phase, '미확인') + ' / 수호동물 ' + _dfOneLineText(badges.guardian, '미확인');
  }
  if (badges.mode === 'jamidusu') {
    return '자미두수 배지: 오늘의 강한 별 ' + _dfOneLineText(badges.star, '미확인') + ' / 별 밝기 ' + _dfOneLineText(badges.brightness, '미확인') + ' / 궁위 ' + _dfOneLineText(badges.palace, '미확인');
  }
  if (badges.mode === 'astrology') {
    return '점성술 배지: 태양궁 ' + _dfOneLineText(badges.sun, '미확인') + ' / 상승궁 ' + _dfOneLineText(badges.rising, '미확인') + ' / 달궁 ' + _dfOneLineText(badges.moon, '미확인');
  }
  return '사주 배지: 신강/신약 ' + _dfOneLineText(badges.strength, '판정 대기') + ' / 용신 ' + _dfOneLineText(badges.yongshin, '판정 대기') + ' / 조후 ' + _dfOneLineText(badges.johu, '판정 대기');
}

function _dfBuildArtPrompt(selection) {
  if (!selection || !selection.flower) {
    return 'Elegant symbolic flower portrait, soft cinematic lighting, premium botanical illustration, centered composition, no text.';
  }

  var flower = selection.flower || {};
  var source = selection.source || 'saju';
  var sourceLabel = _dfGetSourceLabel(source);
  var direction = _dfGetPromptArtDirection(source);
  var flowerData = selection.flowerData || (selection.matched && selection.matched.flower_data) || {};
  var nameKo = _dfOneLineText(flower.name, '운명의 꽃');
  var latin = _dfOneLineText(flower.scientific_name, 'Unknown species');
  var symbolism = _dfOneLineText(flower.symbolism, '운명의 흐름을 상징하는 꽃');
  var narrative = _dfOneLineText((selection.matched && selection.matched.narrative) || _dfGetSajuVerdict(selection), '운명의 꽃 서사');
  var scenario = _dfOneLineText(flowerData.scenario_reason || flowerData.scenario_title, '개화 시나리오 기반 연출');
  var keywords = _dfToArray(selection.keywords).slice(0, 8).map(function(word) {
    return _dfOneLineText(word, '');
  }).filter(Boolean);
  var keywordLine = keywords.length ? keywords.join(', ') : 'bloom, destiny, aura';
  var palette = (_dfSafeColor(selection.primary, '#f472b6')) + ' and ' + (_dfSafeColor(selection.secondary, '#22d3ee'));
  var badgeLine = _dfBuildPromptBadgeLine(selection);

  return [
    'Korean premium floral editorial illustration, masterpiece, ultra-detailed petals, poetic and elegant tone-and-manner.',
    'Fortune source: ' + sourceLabel + '.',
    'Main subject: ' + nameKo + ' (' + latin + ') symbolic flower portrait.',
    'Symbolism: ' + symbolism + '.',
    'Narrative mood: ' + narrative + '.',
    'Scenario cue: ' + scenario + '.',
    badgeLine + '.',
    'Color palette focus: ' + palette + '.',
    'Keywords: ' + keywordLine + '.',
    'Art direction: ' + direction.mood + '; ' + direction.background + '; ' + direction.composition + '.',
    'Lighting: ' + direction.lighting + '.',
    'Render style: botanical painting + fantasy concept art hybrid, refined brush texture, high detail, 4k, clean background.',
    'Aspect ratio hint: 4:5 portrait.'
  ].join('\n');
}

function _dfBuildNegativePrompt() {
  return [
    'lowres, blurry, noisy, jpeg artifacts, pixelated, out of focus',
    'deformed flower, distorted petals, duplicate main flower, cropped subject, bad composition',
    'text, letters, logo, watermark, signature, frame, collage, split screen, ui overlay',
    'muddy color, overexposed highlight, harsh clipping, dirty background, horror, gore'
  ].join(', ');
}

function _dfBuildPromptPack(selection) {
  return '[Main Prompt]\n' + _dfBuildArtPrompt(selection) + '\n\n[Negative Prompt]\n' + _dfBuildNegativePrompt();
}

function _dfUpdateStudioPrompt(selection) {
  var guideEl = document.getElementById('dfStudioPromptGuide');
  var promptEl = document.getElementById('dfStudioArtPrompt');
  var negativeEl = document.getElementById('dfStudioNegativePrompt');
  if (!guideEl && !promptEl && !negativeEl) return;

  var source = (selection && selection.source) || 'saju';
  var sourceLabel = _dfGetSourceLabel(source);
  var direction = _dfGetPromptArtDirection(source);
  if (guideEl) {
    guideEl.textContent = sourceLabel + ' 톤 디렉션: ' + direction.mood + ' / ' + direction.background;
  }
  if (promptEl) promptEl.value = _dfBuildArtPrompt(selection);
  if (negativeEl) negativeEl.value = _dfBuildNegativePrompt();
}

function _dfClipboardWrite(text, onDoneMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function() { _dfSetStudioStatus(onDoneMessage || '클립보드에 복사되었습니다.'); })
      .catch(function() { _dfSetStudioStatus('복사 권한이 없어 수동 복사가 필요합니다.'); });
    return;
  }

  var ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', 'readonly');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    var ok = document.execCommand('copy');
    _dfSetStudioStatus(ok ? (onDoneMessage || '클립보드에 복사되었습니다.') : '복사에 실패했습니다.');
  } catch (e) {
    _dfSetStudioStatus('복사에 실패했습니다.');
  }
  document.body.removeChild(ta);
}

function _dfShareSnapshot(snapshot) {
  var text = _dfBuildShareText(snapshot);
  var isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  if (!isMobile) {
    _dfClipboardWrite(text, 'PC 환경에서는 카카오톡 링크를 클립보드에 복사했습니다. 카카오톡에 붙여넣어 공유하세요.');
    return;
  }

  var encoded = encodeURIComponent(text);
  var kakaoUrl = 'kakaotalk://send?text=' + encoded;
  var anchor = document.createElement('a');
  anchor.href = kakaoUrl;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);

  var fallbackTimer = setTimeout(function() {
    _dfClipboardWrite(text, '카카오톡 실행이 확인되지 않아 요약을 클립보드에 복사했습니다. 카카오톡에 붙여넣어 공유하세요.');
  }, 1000);

  try {
    anchor.click();
    _dfSetStudioStatus('카카오톡 공유를 여는 중입니다...');
  } catch (e) {
    clearTimeout(fallbackTimer);
    _dfClipboardWrite(text, '카카오톡 공유를 열지 못해 요약을 클립보드에 복사했습니다.');
  }

  setTimeout(function() {
    if (anchor && anchor.parentNode) anchor.parentNode.removeChild(anchor);
  }, 1200);
}

function _dfRenderHistoryList() {
  var listEl = document.getElementById('dfStudioHistoryList');
  if (!listEl) return;
  var history = _dfStudioState.history;
  if (!history.length) {
    listEl.innerHTML = '';
    _dfSetStudioStatus('아직 저장된 개화 기록이 없습니다. 현재 결과를 저장해보세요.');
    return;
  }

  var html = history.map(function(item) {
    return '<article class="df-history-item" role="listitem">'
      + '<div class="df-history-item-head">'
      + '<p class="df-history-item-name">' + _dfEscapeHtml(item.name) + '</p>'
      + '<span class="df-history-item-time">' + _dfEscapeHtml(item.savedAtLabel || _dfFormatSavedAt(item.savedAt)) + '</span>'
      + '</div>'
      + '<p class="df-history-item-keywords">' + _dfEscapeHtml(_dfToArray(item.keywords).join(' • ')) + '</p>'
      + '<div class="df-history-item-actions">'
      + '<button type="button" class="df-history-btn df-history-btn--restore" data-action="restoreDestinyFlowerSnapshot" data-action-args="' + item.id + '">불러오기</button>'
        + '<button type="button" class="df-history-btn df-history-btn--share" data-action="shareDestinyFlowerSnapshotById" data-action-args="' + item.id + '">카카오 공유</button>'
        + '<button type="button" class="df-history-btn df-history-btn--delete" data-action="deleteDestinyFlowerSnapshot" data-action-args="' + item.id + '">삭제</button>'
      + '</div>'
      + '</article>';
  }).join('');

  listEl.innerHTML = html;
}

function _dfApplyStudioSelection(selection) {
  if (!selection || !selection.flower) return;
  var flower = selection.flower;
  var sourceLabel = selection.source === 'sukuyo'
    ? '숙요점'
    : (selection.source === 'jamidusu' ? '자미두수' : (selection.source === 'astrology' ? '점성술' : '사주'));
  var sourceShort = selection.source === 'sukuyo'
    ? '숙요'
    : (selection.source === 'jamidusu' ? '자미두수' : (selection.source === 'astrology' ? '차트' : '사주'));
  var sajuVerdict = _dfGetSajuVerdict(selection);
  var badges = _dfGetSajuBadges(selection);
  var flowerData = selection.flowerData || (selection.matched && selection.matched.flower_data) || {};
  var extension = _dfBuildAtelierExtension(selection, sourceLabel, badges, flowerData, sajuVerdict);
  var nameEl = document.getElementById('dfStudioName');
  var latinEl = document.getElementById('dfStudioLatin');
  var dayMasterEl = document.getElementById('dfStudioDayMasterBadge');
  var sourceDescEl = document.getElementById('dfStudioSourceDesc');
  var symbolismEl = document.getElementById('dfStudioSymbolism');
  var keywordsEl = document.getElementById('dfStudioKeywords');
  var narrativeEl = document.getElementById('dfStudioNarrative');
  var dataSummaryEl = document.getElementById('dfStudioDataSummary');
  var dataRitualEl = document.getElementById('dfStudioDataRitual');
  var dataThemesEl = document.getElementById('dfStudioDataThemes');
  var sourceMatrixEl = document.getElementById('dfStudioSourceMatrix');
  var journalEl = document.getElementById('dfStudioJournal');
  var recipeEl = document.getElementById('dfStudioRecipe');
  var flowerLanguageEl = document.getElementById('dfStudioFlowerLanguage');
  var synergyEl = document.getElementById('dfStudioSynergy');
  var gardenerWordEl = document.getElementById('dfStudioGardenerWord');
  var auraEl = document.getElementById('dfStudioAura');
  var primaryDot = document.getElementById('dfStudioPrimaryDot');
  var secondaryDot = document.getElementById('dfStudioSecondaryDot');
  var primaryText = document.getElementById('dfStudioPrimaryText');
  var secondaryText = document.getElementById('dfStudioSecondaryText');
  var particleEl = document.getElementById('dfStudioParticle');
  var guidanceEl = document.getElementById('dfStudioGuidance');
  var imageEl = document.getElementById('dfStudioImage');

  if (nameEl) nameEl.textContent = flower.name;
  _dfRenderSajuBadges(selection);
  if (latinEl) latinEl.textContent = flower.scientific_name || 'Unknown species';
  if (sourceDescEl) {
    var meta = _DF_SOURCE_META[_dfNormalizeSource(selection.source || 'saju')] || _DF_SOURCE_META.saju;
    sourceDescEl.textContent = meta.description || '';
  }
  if (dayMasterEl) {
    dayMasterEl.textContent = flowerData.day_master_badge || (selection.source === 'jamidusu' ? '주성 판독 대기' : (selection.source === 'sukuyo' ? '숙요 판독 대기' : '일간 판독 대기'));
  }
  if (symbolismEl) {
    symbolismEl.textContent = sajuVerdict + ' ' + (flowerData.scenario_reason || (flower.symbolism ? ('이 꽃은 ' + flower.symbolism + '을 상징합니다.') : '이 꽃이 당신의 현재 운세 흐름과 강하게 공명합니다.'));
  }
  if (keywordsEl) keywordsEl.textContent = sourceLabel + ' 키워드 · ' + _dfToArray(selection.keywords).join(' • ');
  if (narrativeEl) {
    narrativeEl.textContent = (selection.matched && selection.matched.narrative)
      || (sajuVerdict + ' ' + sourceShort + ' 균형을 기준으로 지금의 개화 포인트를 정렬했습니다.');
  }
  if (dataSummaryEl) {
    dataSummaryEl.textContent = extension.dataSummary;
  }
  if (dataRitualEl) {
    dataRitualEl.textContent = extension.ritualLine;
  }
  if (dataThemesEl) {
    dataThemesEl.textContent = extension.themesLine;
  }
  if (sourceMatrixEl) {
    sourceMatrixEl.innerHTML = (extension.sourceMatrix || []).map(function(line) {
      return '<li>' + _dfEscapeHtml(line) + '</li>';
    }).join('');
  }
  if (journalEl) journalEl.textContent = extension.observationLog;
  if (recipeEl) recipeEl.textContent = extension.secretRecipe;
  if (flowerLanguageEl) flowerLanguageEl.textContent = extension.flowerLanguage;
  if (synergyEl) synergyEl.textContent = extension.synergyPalette;
  if (gardenerWordEl) gardenerWordEl.textContent = extension.gardenerWord;
  if (primaryDot) primaryDot.style.background = selection.primary;
  if (secondaryDot) secondaryDot.style.background = selection.secondary;
  if (primaryText) primaryText.textContent = 'Primary ' + selection.primary;
  if (secondaryText) secondaryText.textContent = 'Secondary ' + selection.secondary;
  if (particleEl) {
    particleEl.textContent = extension.particleMood;
  }
  if (guidanceEl) {
    guidanceEl.textContent = extension.oneLineGuidance;
  }
  _dfUpdateStudioPrompt(selection);
  _dfApplyGeneratedFlowerImage(imageEl, selection, selection.source || 'saju');
  if (auraEl) {
    auraEl.style.background =
      'radial-gradient(circle at 22% 50%, ' + _dfHexToRgba(selection.primary, 0.44) + ', transparent 58%),'
      + 'radial-gradient(circle at 74% 34%, ' + _dfHexToRgba(selection.secondary, 0.34) + ', transparent 60%)';
  }
  if (imageEl && imageEl.style) {
    imageEl.style.filter = 'drop-shadow(0 12px 26px ' + _dfHexToRgba(selection.primary, 0.24) + ') saturate(1.08)';
  }
}

function openAstrologyFlower() {
  _dfSetActiveSource('astrology');
  return openDestinyFlower(false);
}

function openJamidusuFlower() {
  _dfSetActiveSource('jamidusu');
  return openDestinyFlower(false);
}

function openSukuyoFlower() {
  _dfSetActiveSource('sukuyo');
  return openDestinyFlower(false);
}

function openAstrologyFlowerStudio() {
  _dfSetActiveSource('astrology');
  return openDestinyFlowerStudio();
}

function openJamidusuFlowerStudio() {
  _dfSetActiveSource('jamidusu');
  return openDestinyFlowerStudio();
}

function openSukuyoFlowerStudio() {
  _dfSetActiveSource('sukuyo');
  return openDestinyFlowerStudio();
}

function openDestinyFlower(forceRefreshData) {
  var card = document.querySelector('.feature-card.feature-card--destiny-flower');
  if (!card) return;

  _dfEnsureCardOpen(card);
  var activeSource = _dfSetActiveSource(_dfStudioState.activeSource || 'saju');
  var refresh = forceRefreshData !== false;
  var selection = _dfGetUnifiedSelection(activeSource, refresh);
  _dfAnimateUnifiedCardSwitch(card, selection);
  if (typeof syncFeatureCardHeight === 'function') {
    syncFeatureCardHeight(card);
    requestAnimationFrame(function() {
      syncFeatureCardHeight(card);
    });
  }
  _dfStudioState.selection = selection;

  document.body.classList.add('destiny-flower-focus');
  if (window.__destinyFlowerFocusTimer) {
    clearTimeout(window.__destinyFlowerFocusTimer);
  }
  window.__destinyFlowerFocusTimer = setTimeout(function() {
    document.body.classList.remove('destiny-flower-focus');
  }, 2800);

  return selection;
}

function openDestinyFlowerStudio() {
  var overlay = document.getElementById('destinyFlowerStudioOverlay');
  if (!overlay) return;
  if (overlay.style.display === 'block' && overlay.classList.contains('is-show')) return;

  var sheet = document.getElementById('destinyFlowerStudioSheet');
  var main = document.querySelector('.df-studio-main');
  var panels = document.querySelector('.df-studio-panels');
  var historySection = document.querySelector('.df-studio-history');

  try {
  if (!overlay.__dfCloseBridgeBound) {
    overlay.__dfCloseBridgeBound = '1';
    overlay.addEventListener('click', function(e) {
      var clickTarget = __cdResolveEventElement(e);
      if (!clickTarget) return;
      var closeTrigger = clickTarget.closest('[data-action="closeDestinyFlowerStudio"], .df-studio-close, .df-studio-btn--secondary');
      if (closeTrigger) {
        e.preventDefault();
        e.stopPropagation();
        closeDestinyFlowerStudio();
        return;
      }
      if (sheet && sheet.contains(clickTarget)) return;
      if (clickTarget === overlay) {
        e.preventDefault();
        e.stopPropagation();
        closeDestinyFlowerStudio();
      }
    });
  }

  if (sheet && !sheet.__dfTabBound) {
    sheet.__dfTabBound = true;
    sheet.addEventListener('click', function(e) {
      var tab = e.target && e.target.closest ? e.target.closest('.df-source-tab[data-df-source-tab]') : null;
      if (!tab) return;
      var source = tab.getAttribute('data-df-source-tab');
      if (!source) return;
      e.preventDefault();
      e.stopPropagation();
      setDestinyFlowerSourceTab(source);
    }, true);
  }

  var selection = openDestinyFlower(true) || _dfGetUnifiedSelection(_dfStudioState.activeSource || 'saju', true);

  if (!selection) {
    // 생년월일 정보가 없어 운명의 꽃을 계산할 수 없는 상태
    _dfStudioState.selection = null;
    if (main) main.style.display = 'none';
    if (panels) panels.style.display = 'none';
    if (historySection) historySection.style.display = 'none';
    _dfSetStudioStatus(_dfGetNoBirthMessage(_dfStudioState.activeSource || 'saju'));
  } else {
    _dfStudioState.selection = selection;
    _dfApplyStudioSelection(selection);
    _dfLoadHistory();
    _dfRenderHistoryList();
    _dfSetStudioStatus(_dfGetSajuVerdict(selection) + ' 결과를 저장하거나 카카오톡으로 공유할 수 있습니다.');
    if (main) main.style.display = '';
    if (panels) panels.style.display = '';
    if (historySection) historySection.style.display = '';
  }

  overlay.style.display = 'block';
  overlay.scrollTop = 0;
  if (sheet) sheet.scrollTop = 0;
  _dfSetBodyLock(true);
  requestAnimationFrame(function() {
    overlay.classList.add('is-show');
  });
  } catch (err) {
    if (typeof console !== 'undefined' && console.error) console.error('[DestinyFlower]', err);
    overlay.style.display = 'none';
    _dfSetBodyLock(false);
  }
}

/* 프로필 카드 → 운명의 꽃 진입용: 정의 직후 window에 노출 (스크립트 후반 오류 시에도 사용 가능) */
window.openDestinyFlowerStudio = openDestinyFlowerStudio;
window.openDestinyFlower = openDestinyFlower;

function _dfGetNoBirthMessage(source) {
  var normalized = _dfNormalizeSource(source);
  if (normalized === 'jamidusu') return '자미두수 꽃을 보려면 생년월일을 입력해주세요.';
  if (normalized === 'sukuyo') return '숙요점 꽃을 보려면 생년월일을 입력해주세요.';
  return '이름과 생년월일 정보를 먼저 입력하면, 나만의 운명의 꽃이 여기에서 피어납니다.';
}

function setDestinyFlowerSourceTab(source) {
  var normalized = _dfSetActiveSource(source);
  var overlay = document.getElementById('destinyFlowerStudioOverlay');
  var isStudioOpen = overlay && overlay.style.display !== 'none';
  var selection = _dfGetUnifiedSelection(normalized, false);
  if (!selection) selection = _dfGetUnifiedSelection(normalized, true);
  _dfStudioState.selection = selection;

  if (isStudioOpen) {
    var main = document.querySelector('.df-studio-main');
    var panels = document.querySelector('.df-studio-panels');
    var historySection = document.querySelector('.df-studio-history');
    if (!selection) {
      if (main) main.style.display = 'none';
      if (panels) panels.style.display = 'none';
      if (historySection) historySection.style.display = 'none';
      _dfSetStudioStatus(_dfGetNoBirthMessage(normalized));
    } else {
      _dfApplyStudioSelection(selection);
      if (main) main.style.display = '';
      if (panels) panels.style.display = '';
      if (historySection) historySection.style.display = '';
      _dfSetStudioStatus(_dfGetSajuVerdict(selection) + ' 기준으로 탭과 프롬프트를 갱신했습니다.');
    }
  } else {
    var card = document.querySelector('.feature-card.feature-card--destiny-flower');
    if (card) {
      _dfEnsureCardOpen(card);
      if (selection) {
        _dfAnimateUnifiedCardSwitch(card, selection);
      } else {
        var stage = card.querySelector('.destiny-flower-stage');
        var nameEl = card.querySelector('.destiny-flower-stage__name');
        var symbolismEl = card.querySelector('.destiny-flower-stage__symbolism');
        if (stage && nameEl && symbolismEl) {
          nameEl.textContent = '생년월일 입력 대기';
          symbolismEl.textContent = _dfGetNoBirthMessage(normalized);
        }
      }
      if (typeof syncFeatureCardHeight === 'function') {
        syncFeatureCardHeight(card);
        requestAnimationFrame(function() {
          syncFeatureCardHeight(card);
        });
      }
    }
  }

  return selection;
}

function closeDestinyFlowerStudio() {
  var overlay = document.getElementById('destinyFlowerStudioOverlay');
  if (!overlay) return;
  overlay.classList.remove('is-show');
  setTimeout(function() {
    if (!overlay.classList.contains('is-show')) {
      overlay.style.display = 'none';
    }
  }, 220);
  _dfSetBodyLock(false);
}

function goHomeFromDestinyFlower() {
  closeDestinyFlowerStudio();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveDestinyFlowerSnapshot() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var snapshot = _dfBuildSnapshot(selection);
  if (!snapshot) return;

  _dfLoadHistory();
  _dfStudioState.history = _dfStudioState.history.filter(function(item) {
    return !(item.name === snapshot.name && item.primary === snapshot.primary && item.secondary === snapshot.secondary);
  });
  _dfStudioState.history.unshift(snapshot);
  _dfStudioState.history = _dfStudioState.history.slice(0, _DF_STUDIO_HISTORY_LIMIT);
  _dfPersistHistory();
  _dfRenderHistoryList();
  _dfSetStudioStatus('개화 기록이 저장되었습니다: ' + snapshot.name + ' (' + snapshot.savedAtLabel + ')');
}

function restoreDestinyFlowerSnapshot(snapshotId) {
  if (!snapshotId) return;
  _dfLoadHistory();
  var target = null;
  for (var i = 0; i < _dfStudioState.history.length; i++) {
    if (_dfStudioState.history[i].id === snapshotId) {
      target = _dfStudioState.history[i];
      break;
    }
  }
  if (!target) {
    _dfSetStudioStatus('해당 기록을 찾을 수 없습니다.');
    return;
  }

  var selection = _dfSelectionFromSnapshot(target);
  _dfSetActiveSource(selection.source || 'saju');
  _dfStudioState.selection = selection;
  _dfApplyStudioSelection(selection);
  var card = document.querySelector('.feature-card.feature-card--destiny-flower');
  if (card) {
    _dfEnsureCardOpen(card);
    _dfAnimateUnifiedCardSwitch(card, selection);
  }
  _dfSetStudioStatus('저장한 개화 기록을 불러왔습니다: ' + target.name);
}

function deleteDestinyFlowerSnapshot(snapshotId) {
  if (!snapshotId) return;
  _dfLoadHistory();
  var before = _dfStudioState.history.length;
  _dfStudioState.history = _dfStudioState.history.filter(function(item) {
    return item.id !== snapshotId;
  });
  if (_dfStudioState.history.length === before) {
    _dfSetStudioStatus('삭제할 기록을 찾지 못했습니다.');
    return;
  }
  _dfPersistHistory();
  _dfRenderHistoryList();
  _dfSetStudioStatus('선택한 개화 기록을 삭제했습니다.');
}

function clearDestinyFlowerSnapshots() {
  _dfLoadHistory();
  if (!_dfStudioState.history.length) {
    _dfSetStudioStatus('삭제할 개화 기록이 없습니다.');
    return;
  }
  var ok = window.confirm('저장된 운명의 꽃 기록을 모두 삭제할까요?');
  if (!ok) return;
  _dfStudioState.history = [];
  _dfPersistHistory();
  _dfRenderHistoryList();
  _dfSetStudioStatus('저장된 개화 기록을 모두 삭제했습니다.');
}

function shareDestinyFlowerSnapshot() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var snapshot = _dfBuildSnapshot(selection);
  _dfShareSnapshot(snapshot);
}

function shareDestinyFlowerSnapshotById(snapshotId) {
  if (!snapshotId) return;
  _dfLoadHistory();
  var target = null;
  for (var i = 0; i < _dfStudioState.history.length; i++) {
    if (_dfStudioState.history[i].id === snapshotId) {
      target = _dfStudioState.history[i];
      break;
    }
  }
  if (!target) {
    _dfSetStudioStatus('공유할 기록을 찾을 수 없습니다.');
    return;
  }
  _dfShareSnapshot(target);
}

function copyDestinyFlowerSummary() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var snapshot = _dfBuildSnapshot(selection);
  var text = _dfBuildShareText(snapshot);
  _dfClipboardWrite(text, '요약을 클립보드에 복사했습니다.');
}

function copyDestinyFlowerArtPrompt() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var text = _dfBuildArtPrompt(selection);
  _dfClipboardWrite(text, 'AI 꽃 메인 프롬프트를 클립보드에 복사했습니다.');
}

function copyDestinyFlowerPromptPack() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var text = _dfBuildPromptPack(selection);
  _dfClipboardWrite(text, '메인/네거티브 프롬프트 세트를 클립보드에 복사했습니다.');
}

window.openDestinyFlower = openDestinyFlower;
window.openAstrologyFlower = openAstrologyFlower;
window.openJamidusuFlower = openJamidusuFlower;
window.openSukuyoFlower = openSukuyoFlower;
window.openDestinyFlowerStudio = openDestinyFlowerStudio;
window.openAstrologyFlowerStudio = openAstrologyFlowerStudio;
window.openJamidusuFlowerStudio = openJamidusuFlowerStudio;
window.openSukuyoFlowerStudio = openSukuyoFlowerStudio;
window.setDestinyFlowerSourceTab = setDestinyFlowerSourceTab;
window.closeDestinyFlowerStudio = closeDestinyFlowerStudio;
window.goHomeFromDestinyFlower = goHomeFromDestinyFlower;
window.saveDestinyFlowerSnapshot = saveDestinyFlowerSnapshot;
window.restoreDestinyFlowerSnapshot = restoreDestinyFlowerSnapshot;
window.deleteDestinyFlowerSnapshot = deleteDestinyFlowerSnapshot;
window.clearDestinyFlowerSnapshots = clearDestinyFlowerSnapshots;
window.shareDestinyFlowerSnapshot = shareDestinyFlowerSnapshot;
window.shareDestinyFlowerSnapshotById = shareDestinyFlowerSnapshotById;
window.copyDestinyFlowerSummary = copyDestinyFlowerSummary;
window.copyDestinyFlowerArtPrompt = copyDestinyFlowerArtPrompt;
window.copyDestinyFlowerPromptPack = copyDestinyFlowerPromptPack;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    _dfSyncSourceTabs(_dfStudioState.activeSource || 'saju');
    _dfSyncSourceStickers(_dfStudioState.activeSource || 'saju');
    _dfBindBloomingInteractions();
    _dfRunIntroBloom();
  }, { once: true });
} else {
  _dfSyncSourceTabs(_dfStudioState.activeSource || 'saju');
  _dfSyncSourceStickers(_dfStudioState.activeSource || 'saju');
  _dfBindBloomingInteractions();
  _dfRunIntroBloom();
}

if (!window.__destinyFlowerEscBound) {
  window.__destinyFlowerEscBound = true;
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var overlay = document.getElementById('destinyFlowerStudioOverlay');
    if (!overlay || overlay.style.display === 'none') return;
    closeDestinyFlowerStudio();
  });
}

function _dpStorage() {
  return window.DestinyProfileManager ? window.DestinyProfileManager.storage : null;
}
function _dpEsc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _dpZodiac(y) {
  return ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐎', '🐑', '🐒', '🐓', '🐕', '🐖'][(y - 4 + 120) % 12];
}

var _dpSwitchPending = null;

function _dpShowSwitchConfirm(profile, onYes) {
  _dpSwitchPending = { profile: profile, onYes: onYes };
  var b = profile.birth || {}, l = profile.location || {};
  var cal = b.calType === 'solar' ? '양력' : (b.calType === 'lunar_leap' ? '음력(윤)' : '음력');
  var dateStr = cal + ' ' + b.year + '.'
    + String(b.month || 1).padStart(2, '0') + '.' + String(b.day || 1).padStart(2, '0')
    + ' · ' + String(b.hour != null ? b.hour : 12).padStart(2, '0')
    + ':' + String(b.minute != null ? b.minute : 0).padStart(2, '0');
  var iconEl = document.getElementById('dpSwIcon');
  var nameEl = document.getElementById('dpSwName');
  var detailEl = document.getElementById('dpSwDetail');
  var locEl = document.getElementById('dpSwLoc');
  if (iconEl) iconEl.textContent = _dpZodiac(b.year);
  if (nameEl) nameEl.textContent = profile.name || '';
  if (detailEl) detailEl.textContent = dateStr;
  if (locEl) locEl.textContent = l.label ? '📍 ' + l.label : '';
  var ov = document.getElementById('dpSwitchConfirmOverlay');
  if (!ov) return;
  ov.style.display = 'flex';
  ov.classList.remove('dp-switch-overlay--in');
  requestAnimationFrame(function() { ov.classList.add('dp-switch-overlay--in'); });
}

function dpSwitchConfirmYes() {
  var ov = document.getElementById('dpSwitchConfirmOverlay');
  if (ov) {
    ov.classList.remove('dp-switch-overlay--in');
    setTimeout(function() { ov.style.display = 'none'; }, 300);
  }
  if (_dpSwitchPending) {
    var cb = _dpSwitchPending.onYes, p = _dpSwitchPending.profile;
    _dpSwitchPending = null;
    try { cb(p); } catch (e) { console.error('[dpSwitchConfirm] 콜백 오류:', e); }
  }
}

function dpSwitchConfirmNo() {
  var ov = document.getElementById('dpSwitchConfirmOverlay');
  if (ov) {
    ov.classList.remove('dp-switch-overlay--in');
    setTimeout(function() { ov.style.display = 'none'; }, 300);
  }
  _dpSwitchPending = null;
}

function _dpSelect(id, type) {
  var s = _dpStorage(); if (!s) return;
  var list = s.list(), profile = null;
  for (var i = 0; i < list.length; i++) { if (list[i].id === id) { profile = list[i]; break; } }
  if (!profile) return;
  _dpShowSwitchConfirm(profile, function(p) {
    s.setCurrent(id);
    if (type === 'saju') {
      if (typeof window.dpRunWithProfile === 'function') window.dpRunWithProfile(id);
    } else {
      _ModalProfileState.dispatch(p, type);
    }
  });
}

function closeAllMysticModalsToHome() {
  if (typeof closeSukuyoModal === 'function') closeSukuyoModal();
  if (typeof closeZiweiModal === 'function') closeZiweiModal();
  if (typeof closeAstroModal === 'function') closeAstroModal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function _dpPickerHTML(profiles, type, theme, backFn) {
  var h = '<div style="padding:16px 0 8px;">'
    + '<div style="text-align:center;margin-bottom:22px;padding:0 8px;">'
    + '<div style="font-size:2.5rem;margin-bottom:10px;">' + theme.icon + '</div>'
    + '<div style="font-family:\'Gowun Dodum\',serif;font-size:1rem;color:' + theme.ac + ';letter-spacing:2px;font-weight:700;margin-bottom:6px;">' + theme.title + '</div>'
    + '<div style="font-size:0.8rem;color:rgba(255,255,255,0.4);line-height:1.6;">' + (theme.sub || '운명 카드를 선택하면 바로 결과를 확인할 수 있습니다') + '</div>'
    + '</div><div style="display:flex;flex-direction:column;gap:10px;">';
  profiles.forEach(function(p) {
    var b = p.birth, l = p.location || {};
    var zodiac = _dpZodiac(b.year);
    var cal = b.calType === 'solar' ? '양력' : (b.calType === 'lunar_leap' ? '음력(윤)' : '음력');
    var gbadge = p.gender === 'M'
      ? '<span style="font-size:0.63rem;color:#93c5fd;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);padding:1px 6px;border-radius:10px;">♂</span>'
      : '<span style="font-size:0.63rem;color:#f9a8d4;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);padding:1px 6px;border-radius:10px;">♀</span>';
    h += '<div data-action="_dpSelect" data-action-args="' + p.id + ',' + type + '" '
      + 'style="display:flex;align-items:center;gap:13px;padding:13px 15px;cursor:pointer;'
      + 'background:rgba(255,255,255,0.03);border:1px solid rgba(' + theme.br + ',0.22);'
      + 'border-radius:14px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;">'
      + '<div style="font-size:1.9rem;flex-shrink:0;">' + zodiac + '</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-family:\'Gowun Dodum\',serif;font-size:0.92rem;color:rgba(255,255,255,0.88);font-weight:700;margin-bottom:3px;">'
      + _dpEsc(p.name) + '&nbsp;' + gbadge + '</div>'
      + '<div style="font-size:0.76rem;color:rgba(255,255,255,0.45);">'
      + cal + '&nbsp;' + b.year + '.' + String(b.month).padStart(2, '0') + '.' + String(b.day).padStart(2, '0')
      + '&nbsp;&middot;&nbsp;' + String(b.hour != null ? b.hour : 12).padStart(2, '0') + ':' + String(b.minute != null ? b.minute : 0).padStart(2, '0') + '</div>'
      + (l.label ? '<div style="font-size:0.7rem;color:rgba(255,255,255,0.28);margin-top:2px;">📍&nbsp;' + _dpEsc(l.label) + '</div>' : '')
      + '</div>'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + theme.ac + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7;"><polyline points="9 18 15 12 9 6"/></svg>'
      + '</div>';
  });
  h += '</div>'
    + '<div style="text-align:center;margin-top:18px;">'
    + '<button data-action="' + (backFn || 'closeAllMysticModalsToHome') + '" '
    + 'style="background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.4);'
    + 'padding:9px 18px;border-radius:10px;font-family:\'Gowun Dodum\',serif;font-size:0.8rem;cursor:pointer;touch-action:manipulation;">' + (backFn ? '← 닫기' : '← 홈으로') + '</button>'
    + '</div></div>';
  return h;
}

function _dpEmptyHTML(theme) {
  return '<div style="text-align:center;padding:60px 20px;">'
    + '<div style="font-size:3rem;margin-bottom:16px;">' + theme.icon + '</div>'
    + '<h3 style="color:' + theme.ac + ';margin-bottom:8px;font-family:\'Gowun Dodum\',serif;">나의 운명 카드 필요</h3>'
    + '<p style="color:#9ca3af;line-height:1.6;margin-bottom:24px;">' + theme.desc + '</p>'
    + '<button data-action="closeAllMysticModalsToHome" '
    + 'style="background:' + theme.bb + ';border:1px solid rgba(' + theme.br + ',0.5);color:' + theme.ac + ';'
    + 'padding:12px 24px;border-radius:12px;font-family:\'Gowun Dodum\',serif;font-size:0.9rem;cursor:pointer;touch-action:manipulation;">← 카드 설정하러 가기</button>'
    + '</div>';
}

function openSukuyoModal() {
  var overlay = document.getElementById('sukuyoModalOverlay');
  if (!overlay) return;
  var s = _dpStorage();
  var profiles = s ? s.list() : [];
  var profile = s ? s.current() : null;
  overlay.style.display = 'block';
  setTimeout(function() { overlay.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  var noProfile = document.getElementById('sukuyoNoProfile');
  var card = document.getElementById('sukuyoCard');
  var theme = { icon: '💫', ac: '#c4b5fd', br: '167,139,250', bb: 'linear-gradient(135deg,#1a0e3b,#2d1b6b)', title: '💫 宿曜占 · 숙요점', desc: '숙요점을 보려면 메인 화면에서<br>나의 운명 카드를 먼저 설정해주세요' };
  _ModalProfileState.subscribe('sukuyo', _renderSukuyoSection);
  if (!profile || !profile.birth) {
    if (card) card.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = profiles.length > 0 ? _dpPickerHTML(profiles, 'sukuyo', theme) : _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.dispatch(profile, 'sukuyo');
}
function closeSukuyoModal() {
  var o = document.getElementById('sukuyoModalOverlay'); if (o) o.style.display = 'none';
  _ModalProfileState.unsubscribe('sukuyo');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateToVedic() {
  var profile = typeof window.dpGetDataForVedic === 'function' ? window.dpGetDataForVedic() : null;
  if (!profile) {
    try {
      var listRaw = localStorage.getItem('FORTUNE_APP_USER_PROFILES.list');
      var currentId = localStorage.getItem('FORTUNE_APP_USER_PROFILES.current');
      if (listRaw) {
        var arr = JSON.parse(listRaw);
        if (Array.isArray(arr) && arr.length) {
          profile = currentId ? arr.find(function(p) { return p.id === currentId; }) : null;
          if (!profile) profile = arr[0];
        }
      }
    } catch (e) {}
  }
  if (profile) {
    try {
      sessionStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(profile));
      localStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(profile));
    } catch (e) {}
  }
  window.location.href = '/vedic-astrology.html';
}

function openZiweiModal() {
  var overlay = document.getElementById('ziweiModalOverlay');
  if (!overlay) return;
  var s = _dpStorage();
  var profiles = s ? s.list() : [];
  var profile = s ? s.current() : null;
  overlay.style.display = 'block';
  setTimeout(function() { overlay.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  var noProfile = document.getElementById('ziweiNoProfile');
  var card = document.getElementById('ziweiModalCard');
  var theme = { icon: '🌌', ac: '#e879f9', br: '232,121,249', bb: 'linear-gradient(135deg,#2b0545,#4a0a7a)', title: '🌌 紫微斗數 · 자미두수', desc: '자미두수 명반을 보려면<br>메인 화면에서 나의 운명 카드를 먼저 설정해주세요' };
  _ModalProfileState.subscribe('ziwei', _renderZiweiSection);
  if (!profile || !profile.birth) {
    if (card) card.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = profiles.length > 0 ? _dpPickerHTML(profiles, 'ziwei', theme) : _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.dispatch(profile, 'ziwei');
}
function closeZiweiModal() {
  var o = document.getElementById('ziweiModalOverlay'); if (o) o.style.display = 'none';
  _ModalProfileState.unsubscribe('ziwei');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openAstroModal() {
  var overlay = document.getElementById('astroModalOverlay');
  if (!overlay) return;
  var s = _dpStorage();
  var profiles = s ? s.list() : [];
  var profile = s ? s.current() : null;
  overlay.style.display = 'block';
  setTimeout(function() { overlay.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  var noProfile = document.getElementById('astroNoProfile');
  var cardWrap = document.getElementById('astroCardWrap');
  var theme = { icon: '✨', ac: '#d1c4e9', br: '125,42,232', bb: 'linear-gradient(135deg,#1e003b,#300063)', title: '✨ Cosmic Chart · 점성술', desc: '점성술 분석을 보려면 메인 화면에서<br>나의 운명 카드를 먼저 설정해주세요' };
  _ModalProfileState.subscribe('astro', _renderAstroSection);
  if (!profile || !profile.birth) {
    if (cardWrap) cardWrap.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = profiles.length > 0 ? _dpPickerHTML(profiles, 'astro', theme) : _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.dispatch(profile, 'astro');
}
function closeAstroModal() {
  var o = document.getElementById('astroModalOverlay'); if (o) o.style.display = 'none';
  _ModalProfileState.unsubscribe('astro');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeCurrentPage() {
  var overlayMap = [
    { id: 'tarotLoveOverlay', closeFn: 'closeTarotLoveModal' },
    { id: 'tarotHealingOverlay', closeFn: 'closeTarotHealingModal' },
    { id: 'tarotReunionOverlay', closeFn: 'closeTarotReunionModal' },
    { id: 'tarotSelfEsteemOverlay', closeFn: 'closeTarotSelfEsteemModal' },
    { id: 'tarotYearFortuneOverlay', closeFn: 'closeTarotYearFortuneModal' },
    { id: 'animalTotemOverlay', closeFn: 'closeAnimalTotemModal' },
    { id: 'dreamModalOverlay', closeFn: 'closeDreamModal' },
    { id: 'psychoDreamModalOverlay', closeFn: 'closePsychoDreamModal' },
    { id: 'kemetOracleOverlay', closeFn: 'closeKemetModal' },
    { id: 'destinyFlowerStudioOverlay', closeFn: 'closeDestinyFlowerStudio' },
    { id: 'juyukModalOverlay', closeFn: 'closeJuyukModal' },
    { id: 'sukuyoModalOverlay', closeFn: 'closeSukuyoModal' },
    { id: 'astroModalOverlay', closeFn: 'closeAstroModal' },
    { id: 'ziweiModalOverlay', closeFn: 'closeZiweiModal' }
  ];

  for (var i = 0; i < overlayMap.length; i++) {
    var item = overlayMap[i];
    var overlay = document.getElementById(item.id);
    if (!overlay) continue;
    var computed = window.getComputedStyle ? window.getComputedStyle(overlay) : null;
    var isHidden = overlay.style.display === 'none' || (computed && computed.display === 'none');
    if (isHidden) continue;

    if (typeof window[item.closeFn] === 'function') {
      window[item.closeFn]();
    } else {
      overlay.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.closeCurrentPage = closeCurrentPage;

var _animalTotemPool = [
  { category: '기본', name: '고양이', icon: '🐱', keyword: '독립심과 직관', advice: '당신만의 페이스로 걸어가도 괜찮아요. 야옹!' },
  { category: '기본', name: '다람쥐', icon: '🐿️', keyword: '준비와 활기', advice: '작은 노력이 큰 결실이 될 거예요. 도토리를 모으듯 차근차근!' },
  { category: '기본', name: '파랑새', icon: '🐦', keyword: '희망과 소식', advice: '행운은 멀리 있지 않아요. 바로 당신의 어깨 위에 있죠.' },
  { category: '기본', name: '강아지', icon: '🐶', keyword: '충성심과 사랑', advice: '당신은 혼자가 아니에요. 곁에 있는 소중한 인연을 믿으세요.' },
  { category: '기본', name: '토끼', icon: '🐰', keyword: '도약과 풍요', advice: '겁내지 말고 폴짝 뛰어보세요. 새로운 세상이 기다려요!' },
  { category: '지상', name: '늑대', icon: '🐺', keyword: '직관, 자유', advice: '자신의 본능을 믿으세요. 공동체와 함께하되 개성을 잃지 마세요.' },
  { category: '지상', name: '곰', icon: '🐻', keyword: '성찰, 치유', advice: '지금은 내면으로 들어갈 시간입니다. 휴식을 통해 힘을 회복하세요.' },
  { category: '지상', name: '사슴', icon: '🦌', keyword: '부드러움, 민감', advice: '강함보다 부드러움이 필요한 때입니다. 주변의 변화를 예민하게 살피세요.' },
  { category: '지상', name: '호랑이', icon: '🐯', keyword: '용기, 의지력', advice: '당신은 충분한 힘을 가졌습니다. 목표를 향해 집중하고 돌진하세요.' },
  { category: '공중', name: '올빼미', icon: '🦉', keyword: '지혜, 통찰', advice: '겉모습 너머의 진실을 보세요. 밤의 어둠 속에서도 길을 찾을 수 있습니다.' },
  { category: '공중', name: '독수리', icon: '🦅', keyword: '고결, 시야', advice: '사소한 문제에서 벗어나 더 넓은 시야로 인생의 큰 그림을 그리세요.' },
  { category: '공중', name: '나비', icon: '🦋', keyword: '변화, 가벼움', advice: '변화는 아름다운 것입니다. 과거의 허물을 벗고 새로운 모습으로 날아오르세요.' },
  { category: '공중', name: '까마귀', icon: '🐦‍⬛', keyword: '마법, 창조', advice: '우연한 일들에 주목하세요. 지금 당신 주변에는 변화의 마법이 일어나고 있습니다.' },
  { category: '물/기타', name: '돌고래', icon: '🐬', keyword: '조화, 유희', advice: '삶을 너무 심각하게 생각하지 마세요. 호흡하고, 즐기고, 소통하세요.' },
  { category: '물/기타', name: '거북이', icon: '🐢', keyword: '인내, 보호', advice: '천천히 가도 괜찮습니다. 자신의 속도를 유지하며 꾸준히 나아가세요.' },
  { category: '물/기타', name: '뱀', icon: '🐍', keyword: '재생, 생명력', advice: '낡은 감정을 벗어던질 때입니다. 생명 에너지를 회복하고 다시 태어나세요.' },
  { category: '물/기타', name: '여우', icon: '🦊', keyword: '기지, 적응', advice: '상황에 맞춰 유연하게 대처하세요. 지혜로운 관찰이 문제를 해결해 줄 것입니다.' }
];
var _animalTotemDeck = [];
var _animalTotemMeditationTimer = null;
var _animalTotemMeditationRunning = false;
var _animalTotemReadLocked = false;
var _animalTotemSelected = null;
var _animalTotemCategoryWeights = {
  '기본': 0.2,
  '지상': 0.33,
  '공중': 0.27,
  '물/기타': 0.2
};

function _pickAnimalTotemDeck(size) {
  var grouped = {};
  _animalTotemPool.forEach(function(item) {
    var cat = item.category || '기본';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  Object.keys(grouped).forEach(function(cat) {
    var list = grouped[cat];
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
  });

  var picked = [];
  var guard = 0;
  while (picked.length < size && guard < 120) {
    guard += 1;
    var candidates = [];
    var total = 0;
    Object.keys(grouped).forEach(function(cat) {
      if (!grouped[cat] || grouped[cat].length === 0) return;
      var w = _animalTotemCategoryWeights[cat];
      var weight = typeof w === 'number' && w > 0 ? w : 0.1;
      candidates.push({ cat: cat, weight: weight });
      total += weight;
    });
    if (!candidates.length) break;
    var r = Math.random() * total;
    var selectedCat = candidates[0].cat;
    var acc = 0;
    for (var c = 0; c < candidates.length; c++) {
      acc += candidates[c].weight;
      if (r <= acc) {
        selectedCat = candidates[c].cat;
        break;
      }
    }
    var card = grouped[selectedCat].pop();
    if (card) picked.push(card);
  }
  return picked;
}

function _clearAnimalTotemTimer() {
  if (_animalTotemMeditationTimer) {
    clearInterval(_animalTotemMeditationTimer);
    _animalTotemMeditationTimer = null;
  }
  _animalTotemMeditationRunning = false;
}

function _renderAnimalTotemDeck() {
  _animalTotemDeck = _pickAnimalTotemDeck(5);
  for (var i = 0; i < 5; i++) {
    var iconEl = document.querySelector('[data-animal-totem-icon="' + i + '"]');
    var nameEl = document.querySelector('[data-animal-totem-name="' + i + '"]');
    var item = _animalTotemDeck[i] || _animalTotemPool[i];
    if (iconEl) iconEl.textContent = item.icon;
    if (nameEl) nameEl.textContent = item.name;
  }
}

function _setAnimalTotemMeditationStatus(text) {
  var statusEl = document.getElementById('animalTotemMeditationStatus');
  if (statusEl) statusEl.textContent = text;
}

function resetAnimalTotemFlow() {
  _clearAnimalTotemTimer();
  _animalTotemReadLocked = false;
  _animalTotemSelected = null;
  var meditationStage = document.getElementById('animalTotemMeditationStage');
  var drawStage = document.getElementById('animalTotemDrawStage');
  var result = document.getElementById('animalTotemResult');
  var btn = document.getElementById('animalTotemMeditationBtn');
  if (meditationStage) meditationStage.style.display = 'block';
  if (drawStage) drawStage.style.display = 'none';
  if (result) result.style.display = 'none';
  if (btn) {
    btn.disabled = false;
    btn.textContent = '🧘 10초 명상 시작하기';
  }
  _setAnimalTotemMeditationStatus('아직 명상을 시작하지 않았어요.');
  document.querySelectorAll('.animal-totem-card').forEach(function(card) {
    card.classList.remove('is-flipped');
    card.classList.remove('is-muted');
    card.disabled = false;
  });
  _renderAnimalTotemDeck();
}
window.resetAnimalTotemFlow = resetAnimalTotemFlow;

function startAnimalTotemMeditation() {
  if (_animalTotemMeditationRunning) return;
  var btn = document.getElementById('animalTotemMeditationBtn');
  var drawStage = document.getElementById('animalTotemDrawStage');
  var meditationStage = document.getElementById('animalTotemMeditationStage');
  if (!btn || !drawStage || !meditationStage) return;

  _animalTotemMeditationRunning = true;
  btn.disabled = true;
  var remain = 10;
  _setAnimalTotemMeditationStatus('명상 진행 중... ' + remain + '초');
  btn.textContent = '호흡 유지 중...';

  _animalTotemMeditationTimer = setInterval(function() {
    remain -= 1;
    if (remain > 0) {
      _setAnimalTotemMeditationStatus('명상 진행 중... ' + remain + '초');
      return;
    }
    _clearAnimalTotemTimer();
    _setAnimalTotemMeditationStatus('명상 완료! 이제 타로 카드를 선택해 주세요.');
    meditationStage.style.display = 'none';
    drawStage.style.display = 'block';
  }, 1000);
}
window.startAnimalTotemMeditation = startAnimalTotemMeditation;

function drawAnimalTotemCard(btn, idxRaw) {
  var idx = parseInt(idxRaw, 10);
  if (_animalTotemReadLocked || Number.isNaN(idx)) return;
  var drawStage = document.getElementById('animalTotemDrawStage');
  var result = document.getElementById('animalTotemResult');
  if (!drawStage || drawStage.style.display === 'none' || !result) return;

  var picked = _animalTotemDeck[idx];
  if (!picked) return;
  _animalTotemReadLocked = true;
  _animalTotemSelected = picked;
  if (btn) btn.classList.add('is-flipped');

  document.querySelectorAll('.animal-totem-card').forEach(function(card) {
    if (card !== btn) {
      card.classList.add('is-muted');
      card.disabled = true;
    }
  });

  setTimeout(function() {
    var nameEl = document.getElementById('animalTotemName');
    var keywordEl = document.getElementById('animalTotemKeyword');
    var adviceEl = document.getElementById('animalTotemAdvice');
    if (nameEl) nameEl.textContent = picked.icon + ' ' + picked.name;
    if (keywordEl) keywordEl.textContent = (picked.category || '토템') + ' · ' + picked.keyword;
    if (adviceEl) adviceEl.textContent = '“' + picked.advice + '”';
    result.style.display = 'block';
  }, 450);
}
window.drawAnimalTotemCard = drawAnimalTotemCard;

function shareAnimalTotemResult() {
  if (!_animalTotemSelected) return;
  var picked = _animalTotemSelected;
  var text =
    '🧸 오늘의 애니멀 토템\n\n' +
    picked.icon + ' ' + picked.name + '\n' +
    '분류: ' + (picked.category || '토템') + '\n' +
    '키워드: ' + picked.keyword + '\n' +
    '메시지: "' + picked.advice + '"\n\n' +
    'https://code-destiny.com';

  if (navigator.share) {
    navigator.share({
      title: '애니멀 토템 리딩 결과',
      text: text
    }).catch(function() {});
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function() { alert('토템 결과 문구를 복사했어요!'); })
      .catch(function() { alert(text); });
    return;
  }

  alert(text);
}
window.shareAnimalTotemResult = shareAnimalTotemResult;

function openAnimalTotemModal() {
  var overlay = document.getElementById('animalTotemOverlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  if (overlay.classList) overlay.classList.add('is-open');
  resetAnimalTotemFlow();
  if (window._perf && window._perf.lockBody) window._perf.lockBody();
  else document.body.style.overflow = 'hidden';
}
window.openAnimalTotemModal = openAnimalTotemModal;

function closeAnimalTotemModal() {
  var overlay = document.getElementById('animalTotemOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  if (overlay.classList) overlay.classList.remove('is-open');
  _clearAnimalTotemTimer();
  if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
  else document.body.style.overflow = '';
}
window.closeAnimalTotemModal = closeAnimalTotemModal;

function _resetTarotUI() {
  if (typeof window.invalidateTarotFlow === 'function') window.invalidateTarotFlow();
  var tarotResultEl = document.getElementById('tarotResultContainer');
  if (tarotResultEl) tarotResultEl.style.display = 'none';
  var cardEl = document.getElementById('tarotCardEl');
  if (cardEl) cardEl.classList.remove('flipped');
  var ritualMsgEl = document.getElementById('tarotRitualMsg');
  if (ritualMsgEl) ritualMsgEl.innerText = '"당신의 간절한 고민을 선택해주세요..."';
  document.querySelectorAll('.oracle-cat-btn-m').forEach(function(btn) { btn.classList.remove('active'); });
  document.querySelectorAll('.tarot-spread-card').forEach(function(el) { el.classList.remove('flipped'); });
  var finalBtn = document.getElementById('tarotFinalBtn');
  if (finalBtn) finalBtn.disabled = true;
  window.curTarotCat = null;
  window.isReading = false;
  if (window.tarotThreeCardState) window.tarotThreeCardState = { cards: [], revealedIndex: -1 };
}
function resetTarotForCategorySelection() {
  var overlay = document.getElementById('tarotModalOverlay');
  if (!overlay || overlay.style.display === 'none') return;
  _resetTarotUI();
  if (typeof window.setTarotMode === 'function') window.setTarotMode(window.tarotSpreadMode || 'one');
}
window.resetTarotForCategorySelection = resetTarotForCategorySelection;
function openTarotModal() {
  var overlay = document.getElementById('tarotModalOverlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  if (typeof window.setTarotMode === 'function') window.setTarotMode(window.tarotSpreadMode || 'one');
  if (window._perf && window._perf.lockBody) window._perf.lockBody();
  else document.body.style.overflow = 'hidden';
  var w = window.innerWidth || document.documentElement.clientWidth;
  var req = overlay.requestFullscreen || overlay.webkitRequestFullscreen || overlay.mozRequestFullScreen || overlay.msRequestFullscreen;
  if (req && w > 768) {
    req.call(overlay).catch(function() {});
  }
}
function closeTarotModal() {
  var isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  if (isFs) {
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exit) exit.call(document);
  } else {
    var overlay = document.getElementById('tarotModalOverlay');
    if (overlay) overlay.style.display = 'none';
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = '';
    _resetTarotUI();
  }
}
// Ensure uiBindings `data-action` routing can always find these handlers on `window`.
window.openTarotModal = openTarotModal;
window.closeTarotModal = closeTarotModal;
(function() {
  function onFsChange() {
    var isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (!isFs) {
      var overlay = document.getElementById('tarotModalOverlay');
      if (overlay && overlay.style.display !== 'none') {
        overlay.style.display = 'none';
        if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
        else document.body.style.overflow = '';
        _resetTarotUI();
      }
    }
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('mozfullscreenchange', onFsChange);
  document.addEventListener('MSFullscreenChange', onFsChange);
})();

function switchMysticTab(tabId, btnTarget) {
  if (typeof closeJuyukModal === 'function') closeJuyukModal();
  var container = btnTarget.closest('.mystic-tabs-wrapper');
  container.querySelectorAll('.mystic-tab-content').forEach(function(el) { el.classList.remove('active'); });
  container.querySelectorAll('.mystic-tab-btn').forEach(function(el) { el.classList.remove('active'); });

  document.getElementById(tabId).classList.add('active');
  btnTarget.classList.add('active');
}

function updateCompatUI() {
  var t = document.getElementById('compatType');
  var desc = document.getElementById('compatTypeDesc');
  var btn = document.getElementById('compatRunBtn');
  if (!t || !desc || !btn) return;
  var v = t.value || 'love';
  if (v === 'love') {
    desc.textContent = '연애/결혼: 감정, 온기, 일지·십성 간의 조화에 초점을 맞춘 분석을 제공합니다.';
    btn.innerHTML = '💗 연애 궁합 분석하기';
  } else if (v === 'business') {
    desc.textContent = '사업/동업: 역할·책임·용신·상극을 중심으로 실무적·재무적 적합성을 평가합니다.';
    btn.innerHTML = '💼 사업 궁합 분석하기';
  } else {
    desc.textContent = '친구/동료: 우정·협업·에너지 호흡을 중심으로 편안함과 시너지 포인트를 안내합니다.';
    btn.innerHTML = '🤝 우정/동료 궁합 분석하기';
  }
}
var compatTypeEl = document.getElementById('compatType');
if (compatTypeEl) compatTypeEl.addEventListener('change', updateCompatUI);
if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(updateCompatUI, 50);

window.googleTranslateElementInit = window.googleTranslateElementInit || function googleTranslateElementInit() {
  if (!window.google || !google.translate || !google.translate.TranslateElement) return;
  if (window.__cdGoogleTranslateInited) return;
  window.__cdGoogleTranslateInited = true;
  new google.translate.TranslateElement({
    pageLanguage: 'ko',
    includedLanguages: 'ko,en,ja,zh-CN,zh-TW,fr,es,hi,de,nl,ms',
    autoDisplay: false
  }, 'google_translate_element');
};

/* 기능(로더/모달/오버레이) 동작 중에는 언어 버튼 자동 숨김, 종료 시 다시 표시 */
var _langWrapFeatureOverlayIds = [
  'sajuLoaderOverlay', 'privacy-modal-overlay', 'destinyFlowerStudioOverlay',
  'tarotModalOverlay', 'tarotFocusOverlay', 'tarotSelfEsteemOverlay',
  'tarotLoveOverlay', 'tarotHealingOverlay', 'tarotReunionOverlay', 'tarotYearFortuneOverlay',
  'animalTotemOverlay', 'dreamModalOverlay', 'dreamLoader', 'psychoDreamModalOverlay',
  'juyukModalOverlay', 'sukuyoModalOverlay', 'astroModalOverlay', 'ziweiModalOverlay',
  'dpSwitchConfirmOverlay', 'dpListOverlay', 'kemetOracleOverlay', 'kemetLoader',
  'astralModal'
];

var _langLabelMap = { 'ko': 'KR', 'en': 'EN', 'ja': 'JP', 'zh-CN': 'CN', 'hi': 'HI', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'nl': 'NL', 'ms': 'MS' };

// 언어 선택(구글 번역 서비스 사용) 후 일정 시간 뒤 위젯 자동 숨김
var __cdLangWrapHideTimer = null;
var __cdLangWrapHideDelayMs = 30000; // 30초

function __cdCancelLangWrapHide() {
  if (__cdLangWrapHideTimer) clearTimeout(__cdLangWrapHideTimer);
  __cdLangWrapHideTimer = null;
  var wrap = document.getElementById('langWrap');
  if (wrap) wrap.classList.remove('lang-wrap--hidden');
}

function __cdScheduleLangWrapHide() {
  if (__cdLangWrapHideTimer) clearTimeout(__cdLangWrapHideTimer);
  __cdLangWrapHideTimer = setTimeout(function() {
    var wrap = document.getElementById('langWrap');
    if (wrap) {
      wrap.classList.add('lang-wrap--hidden');
      wrap.classList.remove('open');
    }
    var trigger = document.getElementById('langTrigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }, __cdLangWrapHideDelayMs);
}

function cdGetContentTranslateTargets() {
  return Array.prototype.slice.call(document.querySelectorAll('[data-cd-translate="deepl"]'));
}

function cdAllowGoogleTranslateForContent() {
  var nodes = cdGetContentTranslateTargets();
  nodes.forEach(function(el) {
    if (!el) return;
    el.classList.remove('notranslate');
    try { el.removeAttribute('data-cd-translate'); } catch (_) {}
  });
}

function changeLanguage(langCode, btn) {
  __cdCancelLangWrapHide();

  var btns = document.querySelectorAll('.lang-btn');
  btns.forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');

  var label = document.getElementById('langLabel');
  if (label) label.textContent = _langLabelMap[langCode] || langCode.toUpperCase();

  try { localStorage.setItem('cd_lang', langCode); } catch (_) {}

  var applyPromise = cdSetGoogleTranslateLanguage(langCode, {
    maxAttempts: 60,
    retryDelay: 80,
    fallbackToCookieReload: true
  });
  if (applyPromise && typeof applyPromise.then === 'function') {
    applyPromise.then(function() {
      cdAllowGoogleTranslateForContent();
    });
  } else {
    cdAllowGoogleTranslateForContent();
  }

  if (langCode === 'ko') {
    var domain = window.location.hostname;
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + domain + '; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.' + domain + '; path=/;';
  }

  // 번역 선택 직후 드롭다운 닫고, 30초 후 위젯을 자동 숨김
  var wrap = document.getElementById('langWrap');
  if (wrap) {
    wrap.classList.remove('open');
  }
  var trigger = document.getElementById('langTrigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');

  __cdScheduleLangWrapHide();
}

function toggleLangDropdown() {
  var wrap = document.getElementById('langWrap');
  if (!wrap) return;

  var isOpen = wrap.classList.contains('open');
  if (isOpen) {
    wrap.classList.remove('open');
  } else {
    // 위젯을 다시 사용하려는 시점이므로 숨김/타이머를 해제하고, 다시 30초 후 숨김 예약
    __cdCancelLangWrapHide();
    wrap.classList.add('open');
    __cdScheduleLangWrapHide();
  }

  var trigger = document.getElementById('langTrigger');
  if (trigger) trigger.setAttribute('aria-expanded', String(!isOpen));

  if (!window.__cdLangDropdownOutsideBound) {
    window.__cdLangDropdownOutsideBound = true;
    document.addEventListener('click', function(e) {
      if (!wrap.classList.contains('open')) return;
      if (wrap.contains(e.target)) return;
      wrap.classList.remove('open');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }, true);

    document.addEventListener('keydown', function(e) {
      if (!wrap.classList.contains('open')) return;
      if (e && (e.key === 'Escape' || e.key === 'Esc')) {
        wrap.classList.remove('open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    }, true);
  }
}

window.addEventListener('load', function() {
  if (!window.__cdLangWrapAutoHideScheduled) {
    window.__cdLangWrapAutoHideScheduled = true;
    __cdScheduleLangWrapHide();
  }
  setTimeout(function() {
    var googCookie = document.cookie.match(/(^|;\\s*)googtrans=([^;]*)/);
    var lang = 'ko';
    if (googCookie && googCookie[2]) {
      lang = googCookie[2].split('/').pop();
    }

    var btns = document.querySelectorAll('.lang-btn');
    btns.forEach(function(b) {
      b.classList.remove('active');
      if (b.getAttribute('data-lang') === lang) b.classList.add('active');
    });
    var label = document.getElementById('langLabel');
    if (label) label.textContent = _langLabelMap[lang] || 'KR';
  }, 1000);
});

// Auto-select language by IP/region on first visit (no saved preference)
window.addEventListener('load', function() {
  setTimeout(function() {
    try {
      var saved = localStorage.getItem('cd_lang');
      if (saved) return;
    } catch (_) {}

    fetch('/api/geo', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(p) {
        if (!p || !p.widgetLang) return;
        var nextLang = String(p.widgetLang);
        if (!nextLang || nextLang === 'ko') return;
        try { localStorage.setItem('cd_lang', nextLang); } catch (_) {}
        changeLanguage(nextLang);
      })
      .catch(function() {});
  }, 1200);
});

(function() {
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var modal = document.getElementById('ios-install-modal');
  if (modal) {
    var iosGuide = document.getElementById('ios-guide');
    var andGuide = document.getElementById('android-guide');
    if (isIos) {
      if (iosGuide) iosGuide.style.display = 'block';
    } else {
      if (andGuide) andGuide.style.display = 'block';
    }
  }
})();
