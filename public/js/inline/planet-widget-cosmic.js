// ==========================================
// Cosmic Google Translate Widget (Performance Optimized)
// ==========================================

(function() {
  'use strict';

  var widget = document.getElementById('google_translate_element');
  if (!widget || widget.dataset.cdTranslateBooted === '1') return;
  widget.dataset.cdTranslateBooted = '1';

  var pendingOpenMenu = false;

  var langMap = {
    'ko': '🇰🇷 한국어',
    'en': '🇺🇸 English',
    'ja': '🇯🇵 日本語',
    'zh-CN': '🇨🇳 简体中文',
    'zh-TW': '🇹🇼 繁體中文',
    'fr': '🇫🇷 Français',
    'es': '🇪🇸 Español',
    'hi': '🇮🇳 हिन्दी',
    'de': '🇩🇪 Deutsch',
    'nl': '🇳🇱 Nederlands',
    'ms': '🇲🇾 Melayu'
  };

  var langDesc = {
    'ko': 'Korean',
    'en': 'English',
    'ja': 'Japanese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'fr': 'French',
    'es': 'Spanish',
    'de': 'German',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'ms': 'Malay'
  };

  var scriptPromise = null;
  var initPromise = null;

  injectBaseCss();
  injectBrandOverrides();
  preparePlaceholder();
  markNonTranslatableAreas();
  scheduleTranslateLoad();

  function injectBrandOverrides() {
    if (document.getElementById('cd-gt-brand-override')) return;
    var style = document.createElement('style');
    style.id = 'cd-gt-brand-override';
    style.textContent = `
      /* Brand override: Deep Space Violet minimal translate widget */
      #google_translate_element {
        --cdgt-bg: linear-gradient(140deg, rgba(24,11,54,.96) 0%, rgba(56,25,112,.92) 54%, rgba(34,53,126,.92) 100%);
        --cdgt-border: rgba(219, 187, 255, .34);
        --cdgt-text: #f7f0ff;
        --cdgt-glow: rgba(151, 92, 255, .45);
        --cdgt-glow-strong: rgba(190, 120, 255, .64);
        --cdgt-shadow: 0 12px 30px rgba(9, 6, 26, .52), 0 0 0 1px rgba(228, 204, 255, .08) inset;
        isolation: isolate;
      }

      #google_translate_element .cosmic-wrapper {
        border-radius: 999px !important;
        border: 1px solid var(--cdgt-border) !important;
        background: var(--cdgt-bg) !important;
        box-shadow: var(--cdgt-shadow), 0 0 24px var(--cdgt-glow) !important;
        backdrop-filter: blur(8px) saturate(1.08) !important;
        -webkit-backdrop-filter: blur(8px) saturate(1.08) !important;
        transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease !important;
      }

      #google_translate_element .cosmic-wrapper:hover {
        transform: translateY(-1px) scale(1.045) !important;
        border-color: rgba(244, 226, 255, .58) !important;
        box-shadow: 0 16px 36px rgba(10, 8, 30, .56), 0 0 34px var(--cdgt-glow-strong) !important;
      }

      #google_translate_element .cosmic-wrapper::before {
        content: '🌐' !important;
        left: 12px !important;
        font-size: 15px !important;
        opacity: .95 !important;
        filter: drop-shadow(0 0 8px rgba(215, 171, 255, .92)) !important;
      }

      #google_translate_element .cosmic-wrapper::after {
        content: '✦' !important;
        right: 12px !important;
        font-size: 11px !important;
        color: #ffd8ff !important;
        opacity: .96 !important;
        text-shadow: 0 0 10px rgba(255, 210, 255, .9) !important;
        animation: cdGtSparkle 1.9s ease-in-out infinite !important;
      }

      @keyframes cdGtSparkle {
        0%, 100% { transform: translateY(-50%) scale(1); opacity: .86; }
        50% { transform: translateY(-50%) scale(1.18); opacity: 1; }
      }

      #google_translate_element .cosmic-toggle {
        width: 42px !important;
        height: 42px !important;
        left: 0 !important;
        opacity: 0 !important;
      }

      #google_translate_element .cosmic-lang-label {
        color: var(--cdgt-text) !important;
        font-size: 12px !important;
        letter-spacing: .12em !important;
        text-shadow: 0 0 9px rgba(255, 228, 255, .56) !important;
      }

      #google_translate_element .goog-te-combo {
        appearance: none !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        background: transparent !important;
        background-image: none !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        width: 116px !important;
        min-width: 116px !important;
        min-height: 42px !important;
        height: 42px !important;
        padding: 10px 38px 10px 44px !important;
        color: transparent !important;
        text-shadow: none !important;
        cursor: pointer !important;
      }

      #google_translate_element .goog-te-combo::-ms-expand {
        display: none !important;
      }

      #google_translate_element .cd-gt-custom-menu {
        background: linear-gradient(160deg, rgba(17,13,44,.97) 0%, rgba(31,17,76,.97) 52%, rgba(19,33,88,.97) 100%) !important;
        border: 1px solid rgba(216, 188, 255, .28) !important;
        box-shadow: 0 20px 48px rgba(7, 4, 20, .58), 0 0 26px rgba(160, 102, 255, .22) !important;
      }

      #google_translate_element .cd-gt-menu-item {
        border: 1px solid transparent !important;
        color: #f7f0ff !important;
        font-size: 12px !important;
        letter-spacing: .03em !important;
        transition: background .2s ease, transform .2s ease, border-color .2s ease, box-shadow .2s ease !important;
      }

      #google_translate_element .cd-gt-menu-item:hover {
        background: linear-gradient(135deg, rgba(140, 78, 244, .26), rgba(75, 130, 255, .22)) !important;
        border-color: rgba(216, 188, 255, .34) !important;
        transform: translateX(1px) !important;
        box-shadow: 0 0 15px rgba(151, 92, 255, .24) !important;
      }

      /* Remove all default Google translate chrome and banners */
      .goog-logo-link,
      .goog-te-gadget-icon,
      .goog-te-gadget span,
      .goog-te-gadget img,
      .goog-te-balloon-frame,
      #goog-gt-tt,
      .goog-tooltip,
      .goog-text-highlight {
        display: none !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .goog-te-banner-frame.skiptranslate,
      .VIpgJd-ZVi9od-ORHb-OEVmcd,
      iframe.goog-te-banner-frame,
      .skiptranslate iframe {
        display: none !important;
        visibility: hidden !important;
        max-height: 0 !important;
        height: 0 !important;
      }

      body { top: 0 !important; position: static !important; }
      html { margin-top: 0 !important; }

      @media (max-width: 768px) {
        #google_translate_element { top: max(12px, env(safe-area-inset-top)) !important; right: max(12px, env(safe-area-inset-right)) !important; }
        #google_translate_element .goog-te-combo { width: 110px !important; min-width: 110px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function injectBaseCss() {
    if (document.getElementById('cd-gt-style')) return;
    var style = document.createElement('style');
    style.id = 'cd-gt-style';
    style.textContent = `
      /* 애니메이션 */
      @keyframes cosmicFloat {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
        100% { transform: translateY(0px); }
      }

      @keyframes starGlow {
        0% { box-shadow: 0 0 10px #4c1d95, 0 0 20px #1e3a8a; }
        50% { box-shadow: 0 0 20px #7e22ce, 0 0 35px #3b82f6; }
        100% { box-shadow: 0 0 10px #4c1d95, 0 0 20px #1e3a8a; }
      }

      /* 접근성: 모션 감소 설정 존중 */
      @media (prefers-reduced-motion: reduce) {
        @keyframes cosmicFloat { 0%, 100% { transform: translateY(0px); } }
        @keyframes starGlow { 0%, 100% { box-shadow: 0 0 10px #4c1d95, 0 0 20px #1e3a8a; } }
      }

      /* 위젯 컨테이너 */
      #google_translate_element {
        position: fixed !important;
        top: max(20px, env(safe-area-inset-top));
        right: max(20px, env(safe-area-inset-right));
        z-index: 9999;
        transition: opacity 0.3s ease, transform 0.25s ease;
        text-align: center;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        min-width: 108px;
        min-height: 44px;
        contain: layout paint style;
      }

      /* 모바일 landscape */
      @media (max-height: 500px) {
        #google_translate_element {
          top: max(10px, env(safe-area-inset-top));
          right: max(10px, env(safe-area-inset-right));
        }
      }

      /* Select 요소 스타일 */
      #google_translate_element select.goog-te-combo {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background:
          radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.42) 0%, rgba(255,255,255,0) 34%),
          linear-gradient(135deg, #321449 0%, #6d2d7d 48%, #2a2c7d 100%);
        color: #f9f4ff;
        font-weight: 700;
        font-size: 15px;
        padding: 12px 42px 12px 20px;
        border: 1px solid rgba(255, 232, 246, 0.45);
        border-radius: 999px;
        cursor: pointer;
        outline: none;
        animation: starGlow 4s ease-in-out infinite;
        text-shadow: 0 0 8px rgba(255, 236, 252, 0.75);
        letter-spacing: 0.05em;
        box-sizing: border-box;
        min-height: 44px;
        min-width: 108px;
        width: 108px;
        -webkit-tap-highlight-color: transparent;
        -webkit-user-select: none;
        user-select: none;
        text-align: center;
        text-align-last: center;
        color: transparent !important;
        text-shadow: none !important;
        box-shadow:
          0 8px 24px rgba(105, 62, 152, 0.35),
          inset 0 1px 1px rgba(255,255,255,0.36),
          inset 0 -2px 10px rgba(34, 23, 68, 0.45);
        font-family: "Inter", "Avenir Next", "Segoe UI", Arial, sans-serif;
      }

      #google_translate_element select.goog-te-combo option {
        color: #111 !important;
        background: #fff !important;
        text-align: center;
      }

      #google_translate_element select.goog-te-combo:hover {
        background:
          radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.52) 0%, rgba(255,255,255,0) 40%),
          linear-gradient(135deg, #3f1859 0%, #7f3691 48%, #303595 100%);
        border-color: rgba(255, 244, 250, 0.72);
        transform: translateY(-1px);
      }

      #google_translate_element select.goog-te-combo:focus {
        border-color: rgba(255, 249, 252, 0.92);
        box-shadow:
          0 0 0 2px rgba(255, 255, 255, 0.35),
          0 0 22px rgba(240, 148, 222, 0.6);
        outline: none;
      }

      #google_translate_element select.goog-te-combo:active {
        border-color: rgba(224, 174, 255, 0.9);
        box-shadow: inset 0 2px 6px rgba(34, 18, 64, 0.44);
      }

      /* 드롭다운 화살표/글로브 아이콘 wrapper */
      .cosmic-wrapper {
        position: relative;
        display: inline-block;
        animation: cosmicFloat 4s ease-in-out infinite;
        filter: drop-shadow(0 10px 18px rgba(102, 40, 130, 0.35));
      }

      .cosmic-wrapper:hover { animation-duration: 3.2s; }

      @media (hover: none), (pointer: coarse) {
        .cosmic-wrapper {
          animation: none !important;
          transform: none !important;
          filter: drop-shadow(0 8px 14px rgba(102, 40, 130, 0.28));
        }
        #google_translate_element select.goog-te-combo { transform: none !important; }
      }

      .cosmic-wrapper .goog-te-combo {
        position: relative;
        z-index: 2;
      }

      .cosmic-lang-label {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 12;
        pointer-events: none;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        color: #f9f4ff !important;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.08em;
        line-height: 1;
        white-space: nowrap;
        text-shadow: 0 0 8px rgba(255, 240, 253, 0.62);
        font-family: "Inter", "Avenir Next", "Segoe UI", Arial, sans-serif;
      }

      .cosmic-wrapper::before {
        content: '🌐';
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        font-size: 17px;
        filter: drop-shadow(0 0 4px rgba(255,255,255,0.9));
        z-index: 10;
      }

      /* 실제 클릭 타겟(🌐) - pseudo-element는 클릭 타겟이 아니어서 select을 열기 위해 오버레이를 둠 */
      .cosmic-toggle {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 44px;
        height: 44px;
        z-index: 999999;
        pointer-events: auto;
        background: transparent;
        border: none;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .cosmic-wrapper::after {
        content: '✦';
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        font-size: 12px;
        filter: drop-shadow(0 0 8px rgba(255, 246, 255, 0.95));
        color: #ffd9f8;
        z-index: 10;
      }

      .cosmic-wrapper::selection { background: transparent; }

      /* 툴팁 */
      .cosmic-tooltip {
        position: absolute;
        display: none;
        background: rgba(30, 30, 40, 0.95);
        color: #fff;
        font-size: 13px;
        font-weight: bold;
        padding: 8px 14px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
        bottom: 110%;
        left: 50%;
        transform: translateX(-50%);
      }

      .cosmic-tooltip.visible {
        display: block;
        opacity: 1;
      }

      /* 커스텀 언어 메뉴 (select 드롭다운이 안 열리는 브라우저 대응) */
      .cd-gt-custom-menu {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        z-index: 10001;
        display: none;
        background: rgba(15, 23, 42, 0.98);
        border: 1px solid rgba(255, 232, 246, 0.18);
        border-radius: 14px;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
        padding: 8px;
        min-width: 190px;
        max-width: 230px;
        backdrop-filter: blur(10px);
      }

      .cd-gt-custom-menu.cd-gt-open {
        display: block;
      }

      .cd-gt-menu-item {
        appearance: none;
        border: none;
        background: transparent;
        color: #f8f5ff;
        font-weight: 800;
        font-size: 13px;
        letter-spacing: 0.02em;
        padding: 10px 12px;
        border-radius: 12px;
        cursor: pointer;
        text-align: left;
        width: 100%;
        -webkit-tap-highlight-color: transparent;
      }

      .cd-gt-menu-item:hover {
        background: rgba(255, 255, 255, 0.10);
      }

      /* 구글 번역 기본 요소 숨김 */
      .goog-logo-link,
      .goog-te-gadget span,
      .goog-te-gadget img { display: none !important; }

      .goog-te-gadget { color: transparent !important; font-size: 0; line-height: 0 !important; }
      .goog-te-gadget * { -webkit-touch-callout: none; }

      /* 로딩 placeholder(스켈레톤) - 실제 버튼이 올라오기 전 깜빡임 방지 */
      #google_translate_element.cd-gt-loading {
        background: linear-gradient(90deg, rgba(49,46,129,.6), rgba(91,33,182,.65), rgba(49,46,129,.6));
        background-size: 200% 100%;
        border-radius: 999px;
      }
      @keyframes cdGtShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      #google_translate_element.cd-gt-loading { animation: cdGtShimmer 1.2s linear infinite; }
    `;
    document.head.appendChild(style);
  }

  function preparePlaceholder() {
    widget.classList.add('notranslate', 'cd-gt-loading');
    widget.setAttribute('translate', 'no');
    if (widget.querySelector('.cosmic-lang-label')) return;
    var label = document.createElement('span');
    label.className = 'cosmic-lang-label';
    label.textContent = 'LANG';
    widget.appendChild(label);

    // 초기 로딩 전에도 즉시 클릭 가능한 🌐 버튼을 먼저 구성
    // (번역 콤보/래퍼가 늦게 생성되는 경우를 대비)
    if (!widget.querySelector('.cosmic-toggle')) {
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'cosmic-toggle';
      toggle.setAttribute('aria-label', 'Select language');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '🌐';
      widget.appendChild(toggle);

      toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        pendingOpenMenu = true;
        try {
          if (typeof window.__cdOpenTranslateMenu === 'function') window.__cdOpenTranslateMenu();
        } catch (_) {}
        try { bootGoogleTranslate(); } catch (_) {}
      }, { passive: false });
    }

    // 커스텀 메뉴 컨테이너도 미리 만들어서 hydrate 단계에서 재사용
    if (!widget.querySelector('.cd-gt-custom-menu')) {
      var menu = document.createElement('div');
      menu.className = 'cd-gt-custom-menu notranslate';
      menu.setAttribute('translate', 'no');
      widget.appendChild(menu);
    }
  }

  function markNonTranslatableAreas() {
    // Heavy/meaningless nodes are excluded from Google Translate scanning.
    var selector = [
      'img', 'svg', 'canvas', 'video', 'audio', 'iframe',
      'pre', 'code', 'kbd', 'samp',
      '.material-icons', '.fa', '[class*="icon"]',
      '[data-no-translate]'
    ].join(',');
    var targets = document.querySelectorAll(selector);
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      if (el.classList) el.classList.add('notranslate');
      el.setAttribute('translate', 'no');
    }
  }

  function requestIdle(cb, timeout) {
    if (typeof window.requestIdleCallback === 'function') {
      return window.requestIdleCallback(cb, { timeout: timeout || 1500 });
    }
    return setTimeout(cb, Math.min(timeout || 1500, 400));
  }

  function afterLcpThenIdle(cb) {
    if (document.readyState !== 'complete') {
      window.addEventListener('load', function() { requestIdle(cb, 1800); }, { once: true, passive: true });
      return;
    }
    requestIdle(cb, 1200);
  }

  function scheduleTranslateLoad() {
    var activated = false;
    function activateNow() {
      if (activated) return;
      activated = true;
      cleanupActivationListeners();
      bootGoogleTranslate();
    }

    function cleanupActivationListeners() {
      document.removeEventListener('pointerdown', activateNow, true);
      document.removeEventListener('keydown', activateNow, true);
      widget.removeEventListener('mouseenter', activateNow, true);
      widget.removeEventListener('touchstart', activateNow, true);
    }

    // First user intent: load immediately.
    document.addEventListener('pointerdown', activateNow, { once: true, passive: true, capture: true });
    document.addEventListener('keydown', activateNow, { once: true, passive: true, capture: true });
    widget.addEventListener('mouseenter', activateNow, { once: true, passive: true, capture: true });
    widget.addEventListener('touchstart', activateNow, { once: true, passive: true, capture: true });

    // Fallback: auto-load after LCP/idle.
    afterLcpThenIdle(activateNow);
  }

  function ensureTranslateScript() {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise(function(resolve, reject) {
      var existing = document.querySelector('script[data-cd-google-translate="1"]');
      if (existing) {
        existing.addEventListener('load', function() { resolve(); }, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      var script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.dataset.cdGoogleTranslate = '1';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.onload = function() { resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return scriptPromise;
  }

  function waitForCombo(maxMs) {
    return new Promise(function(resolve, reject) {
      var done = false;
      var start = Date.now();
      var observer = null;
      var timer = setInterval(function() {
        var combo = widget.querySelector('.goog-te-combo');
        if (combo) finish(combo);
        else if (Date.now() - start > maxMs) fail(new Error('combo_timeout'));
      }, 120);

      function finish(combo) {
        if (done) return;
        done = true;
        clearInterval(timer);
        if (observer) observer.disconnect();
        resolve(combo);
      }
      function fail(err) {
        if (done) return;
        done = true;
        clearInterval(timer);
        if (observer) observer.disconnect();
        reject(err);
      }

      if (typeof MutationObserver === 'function') {
        observer = new MutationObserver(function() {
          var combo = widget.querySelector('.goog-te-combo');
          if (combo) finish(combo);
        });
        observer.observe(widget, { childList: true, subtree: true });
      }
    });
  }

  function bootGoogleTranslate() {
    if (initPromise) return initPromise;
    initPromise = ensureTranslateScript()
      .then(function() {
        if (typeof window.googleTranslateElementInit === 'function') {
          try { window.googleTranslateElementInit(); } catch (_) {}
        }
        return waitForCombo(8000);
      })
      .then(function(combo) {
        hydrateCombo(combo);
      })
      .catch(function() {
        widget.classList.remove('cd-gt-loading');
      });
    return initPromise;
  }

  function hydrateCombo(combo) {
    if (!combo || combo.dataset.cdBound === '1') return;
    combo.dataset.cdBound = '1';

    widget.classList.remove('cd-gt-loading');
    widget.classList.add('cd-gt-ready');

    // Google Translate 콤보를 기존 코스믹 버튼 래퍼 구조로 감싸서
    // (이모지/애니메이션/툴팁) UI를 이전 디자인과 동일하게 복원합니다.
    var parent = combo.parentNode;
    var wrapper = parent;
    if (!wrapper || !wrapper.classList || !wrapper.classList.contains('cosmic-wrapper')) {
      wrapper = document.createElement('div');
      wrapper.className = 'cosmic-wrapper';
      if (parent) parent.insertBefore(wrapper, combo);
      wrapper.appendChild(combo);
    }

    // 언어 옵션 텍스트(드롭다운 표시) 커스터마이즈
    function updateOptions() {
      var hasPlaceholder = false;
      Array.from(combo.options).forEach(function(option) {
        var code = option.value;
        if (!code) {
          option.textContent = 'LANG';
          hasPlaceholder = true;
          return;
        }
        if (langMap[code]) {
          option.textContent = langMap[code];
          option.dataset.desc = langDesc[code] || '';
        }
      });
      if (!hasPlaceholder) {
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'LANG';
        combo.insertBefore(placeholder, combo.firstChild);
      }
    }

    updateOptions();

    // 중앙 LANG 라벨
    var overlay = wrapper.querySelector('.cosmic-lang-label');
    if (!overlay) {
      // placeholder가 widget 안에 있다면 wrapper로 이동
      overlay = widget.querySelector('.cosmic-lang-label');
      if (overlay && overlay.parentNode !== wrapper) overlay.parentNode.removeChild(overlay);
      if (!overlay) overlay = document.createElement('div');
      overlay.className = 'cosmic-lang-label';
      overlay.textContent = 'LANG';
      wrapper.appendChild(overlay);
    }

    // 툴팁
    var tooltip = wrapper.querySelector('.cosmic-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'cosmic-tooltip';
      wrapper.appendChild(tooltip);
    }

    // 🌐 클릭 타겟(초기 단계에서 widget에 생성될 수도 있음)
    var toggle = wrapper.querySelector('.cosmic-toggle') || widget.querySelector('.cosmic-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'cosmic-toggle';
      toggle.setAttribute('aria-label', 'Select language');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '🌐';
      wrapper.appendChild(toggle);
    }

    // 커스텀 메뉴 컨테이너(초기 단계에서 widget에 생성될 수도 있음)
    var menu = wrapper.querySelector('.cd-gt-custom-menu') || widget.querySelector('.cd-gt-custom-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'cd-gt-custom-menu notranslate';
      menu.setAttribute('translate', 'no');
      wrapper.appendChild(menu);
    }

    function closeMenu() {
      menu.classList.remove('cd-gt-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function buildMenuItems() {
      menu.innerHTML = '';
      var opts = Array.prototype.slice.call(combo.options || []);
      for (var i = 0; i < opts.length; i++) {
        var opt = opts[i];
        var code = opt && opt.value;
        if (!code) continue;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cd-gt-menu-item notranslate';
        btn.setAttribute('translate', 'no');
        btn.dataset.value = code;
        btn.textContent = (opt.textContent || '').trim() || code;
        btn.addEventListener('click', function(ev) {
          var next = ev && ev.currentTarget ? ev.currentTarget.dataset.value : '';
          if (!next) return;
          try { combo.value = next; } catch (_) {}
          try { combo.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
          // Google Translate가 실제로 DOM을 번역할 수 있도록, 번역 대상 영역에서 notranslate 제거
          try {
            var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-cd-translate="deepl"]'));
            nodes.forEach(function(el) {
              if (!el) return;
              el.classList.remove('notranslate');
              try { el.removeAttribute('data-cd-translate'); } catch (_) {}
            });
          } catch (_) {}
          // 쿠키를 같이 세팅 (위젯 내부 처리 지연/차단 케이스 보완)
          try {
            var host = window.location.hostname;
            var expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
            if (next === 'ko') {
              document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + host + '; path=/;';
              document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.' + host + '; path=/;';
            } else {
              var cookieValue = '/ko/' + next;
              document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; path=/; SameSite=Lax';
              document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=' + host + '; path=/; SameSite=Lax';
              document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=.' + host + '; path=/; SameSite=Lax';
            }
          } catch (_) {}
          // 앱 내부 언어 변경 로직(추가 API 번역 등)도 같이 트리거
          try {
            if (typeof window.changeLanguage === 'function') window.changeLanguage(next, null);
          } catch (_) {}
          try { updateOptions(); } catch (_) {}
          try { hideTooltip(); } catch (_) {}
          closeMenu();
        }, { passive: true });
        menu.appendChild(btn);
      }
    }

    var menuOpen = false;
    function openMenu() {
      if (menuOpen) return;
      menuOpen = true;
      buildMenuItems();
      menu.classList.add('cd-gt-open');
      toggle.setAttribute('aria-expanded', 'true');
      var openedAt = Date.now();
      // 외부 클릭 시 닫기
      window.addEventListener('click', function onWinClick(e) {
        if (!menuOpen) return;
        if (Date.now() - openedAt < 250) return;
        if (wrapper.contains(e.target) || (menu && menu.contains && menu.contains(e.target)) || (toggle && toggle.contains && toggle.contains(e.target))) return;
        closeMenu();
        window.removeEventListener('click', onWinClick);
        menuOpen = false;
      }, { passive: true });

      window.addEventListener('keydown', function onKey(e) {
        if (!menuOpen) return;
        if (e && (e.key === 'Escape' || e.key === 'Esc')) {
          closeMenu();
          menuOpen = false;
          window.removeEventListener('keydown', onKey);
        }
      }, { passive: true });
    }

    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      if (menuOpen) {
        closeMenu();
        menuOpen = false;
      } else {
        openMenu();
      }
    }, { passive: false });

    // 외부(초기 클릭)에서 열기 호출용 핸들러
    try { window.__cdOpenTranslateMenu = openMenu; } catch (_) {}

    // 툴팁 표시(마우스/포인터 오버)
    function updateTooltip() {
      var code = combo.value || 'ko';
      var desc = langDesc[code] || '';
      if (!desc) return tooltip.classList.remove('visible');
      tooltip.textContent = code.toUpperCase() + ' — ' + desc;
      tooltip.classList.add('visible');
    }

    function hideTooltip() {
      tooltip.classList.remove('visible');
    }

    combo.addEventListener('mousemove', updateTooltip, { passive: true });
    combo.addEventListener('mouseleave', hideTooltip, { passive: true });
    combo.addEventListener('focus', hideTooltip, { passive: true });

    // 사용자 선택 시 옵션 텍스트/툴팁 정보를 갱신
    combo.addEventListener('change', function() {
      updateOptions();
      try {
        if (overlay) overlay.textContent = langMap[combo.value] || (combo.value ? combo.value.toUpperCase() : 'LANG');
      } catch (_) {}
      hideTooltip();
    }, { passive: true });

    // 초기 클릭에서 pendingOpenMenu가 켜져있었다면, 콤보 준비 즉시 메뉴 오픈
    if (pendingOpenMenu) {
      pendingOpenMenu = false;
      openMenu();
    }
  }
})();