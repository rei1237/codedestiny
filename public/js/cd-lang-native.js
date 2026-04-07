/**
 * cd-lang-native.js  v2.0.0
 * ──────────────────────────────────────────────────────────────────────
 * 구글 번역 위젯을 자체 네이티브 언어 라우팅으로 완전 대체.
 *
 * 동작 원리:
 *  - 언어 버튼 클릭 → 해당 로케일 경로(/en-us, /ja-jp, …)로 navigate
 *  - 한국어(ko) 선택 → 루트(/) 로 navigate
 *  - 현재 URL pathname을 파싱해 active 버튼을 자동 표시
 *  - cd_lang (localStorage) + cd_locale_ack (cookie) 를 저장해 미들웨어와 연동
 *  - Google Translate 스크립트를 일절 로드하지 않음
 *
 * 지원 언어 (위젯 기준 10개):
 *  ko, en, ja, zh-CN, hi, es, fr, de, nl, ms
 * ──────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── 1. 언어코드 ↔ 로케일 슬러그 매핑 ─────────────────────── */
  var LANG_TO_SLUG = {
    'ko':    '',        // → /
    'en':    'en-us',
    'ja':    'ja-jp',
    'zh-CN': 'zh-cn',
    'hi':    'hi-in',
    'es':    'es-es',
    'fr':    'fr-fr',
    'de':    'de-de',
    'nl':    'nl-nl',
    'ms':    'ms-my'
  };

  var SLUG_TO_LANG = {};
  for (var k in LANG_TO_SLUG) {
    if (LANG_TO_SLUG[k]) SLUG_TO_LANG[LANG_TO_SLUG[k]] = k;
  }

  var LABEL_MAP = {
    'ko': 'KR', 'en': 'EN', 'ja': 'JP',
    'zh-CN': 'CN', 'hi': 'HI', 'es': 'ES',
    'fr': 'FR', 'de': 'DE', 'nl': 'NL', 'ms': 'MS'
  };

  /* ── 2. 현재 활성 언어 감지 ─────────────────────────────────── */
  function detectCurrentLang() {
    var path = (window.location.pathname || '/').toLowerCase().replace(/^\//, '');
    var topSlug = path.split('/')[0] || '';
    if (SLUG_TO_LANG[topSlug]) return SLUG_TO_LANG[topSlug];
    // localStorage 폴백
    try { var stored = localStorage.getItem('cd_lang'); if (stored) return stored; } catch (_) {}
    return 'ko';
  }

  /* ── 3. 쿠키 유틸 ──────────────────────────────────────────── */
  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 86400000);
      expires = '; expires=' + d.toUTCString();
    }
    document.cookie = name + '=' + value + expires + '; path=/; SameSite=Lax';
  }

  /* ── 4. UI 업데이트 ─────────────────────────────────────────── */
  function updateUI(langCode) {
    var label = document.getElementById('langLabel') || document.getElementById('translateLangLabel');
    if (label) label.textContent = LABEL_MAP[langCode] || langCode.toUpperCase();

    var btns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var btnLang = btn.getAttribute('data-lang');
      if (btnLang === langCode) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'true');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    }
  }

  /* ── 5. 언어 변경 (핵심 — Google Translate 완전 대체) ─────── */
  function nativeChangeLanguage(langCode, _btn) {
    // 저장
    try { localStorage.setItem('cd_lang', langCode); } catch (_) {}
    // 미들웨어의 Accept-Language 자동 리다이렉트를 억제하는 쿠키
    setCookie('cd_locale_ack', '1', 365);

    var slug = LANG_TO_SLUG[langCode];
    var targetPath = slug ? '/' + slug : '/';
    var currentPath = window.location.pathname;

    // 이미 해당 로케일 경로에 있으면 UI만 갱신
    var normalizedCurrent = currentPath.toLowerCase().replace(/\/$/, '') || '/';
    var normalizedTarget = targetPath.replace(/\/$/, '') || '/';
    if (normalizedCurrent === normalizedTarget ||
        normalizedCurrent.startsWith(normalizedTarget + '/')) {
      updateUI(langCode);
      var wrap = document.getElementById('langWrap');
      if (wrap) wrap.classList.remove('open');
      return;
    }

    // 다른 로케일 경로로 이동
    updateUI(langCode);
    window.location.href = targetPath;
  }

  /* ── 6. 기존 changeLanguage 오버라이드 ─────────────────────── */
  // index-inline-runtime.js 가 먼저 로드되어 window.changeLanguage 를 정의한 뒤
  // 이 파일이 로드되므로, 여기서 덮어씁니다.
  window.changeLanguage = nativeChangeLanguage;

  // Google Translate 부트스트랩 함수들을 무효화 (외부 스크립트 차단)
  window.googleTranslateElementInit = function () { /* noop — native mode */ };
  window.__cdGoogleTranslateInited = true;              // 이미 초기화된 것처럼 처리
  window.__cdGoogleTranslateScriptRequested = true;     // 스크립트 요청 방지

  /* ── 7. 초기화 ─────────────────────────────────────────────── */
  function init() {
    var lang = detectCurrentLang();
    updateUI(lang);

    // Google Translate 로더 스크립트 태그들을 비활성화 (이미 로드된 경우 무시)
    var scripts = document.querySelectorAll('script[src*="translate.google.com"]');
    for (var i = 0; i < scripts.length; i++) {
      try { scripts[i].parentNode.removeChild(scripts[i]); } catch (_) {}
    }

    // #google_translate_element div 숨김 (화면 점유 방지)
    var gtEl = document.getElementById('google_translate_element');
    if (gtEl) {
      gtEl.style.display = 'none';
      gtEl.setAttribute('aria-hidden', 'true');
    }

    // lang 버튼 클릭에 대한 이벤트 델리게이션 — 중복 등록 방지
    if (window.__cdNativeLangBound) return;
    window.__cdNativeLangBound = true;

    document.addEventListener('click', function (e) {
      var target = e && e.target;
      if (!target) return;
      var btn = target.closest ? target.closest('.lang-btn[data-lang]') : null;
      if (!btn) return;
      var lang = btn.getAttribute('data-lang');
      if (!lang) return;
      e.preventDefault();
      e.stopPropagation();
      nativeChangeLanguage(lang, btn);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
