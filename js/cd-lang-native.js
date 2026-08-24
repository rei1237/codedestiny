(function () {
  'use strict';

  var SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms'];
  var INCLUDED_GT_LANGUAGES = 'ko,en,ja,zh-CN,zh-TW,vi,fr,es,hi,de,nl,ms';
  var LABEL_BY_LANG = {
    ko: 'KR',
    en: 'ENG',
    ja: 'JPN',
    'zh-CN': 'CHN',
    'zh-TW': 'TWN',
    vi: 'VIE',
    hi: 'HIN',
    es: 'ESP',
    fr: 'FRA',
    de: 'DEU',
    nl: 'NLD',
    ms: 'MYS'
  };
  var I18N_FILE_BY_LANG = {
    en: 'en',
    ja: 'ja',
    'zh-CN': 'zh-cn',
    'zh-TW': 'zh-tw',
    vi: 'vi',
    hi: 'hi',
    es: 'es',
    fr: 'fr',
    de: 'de',
    nl: 'nl',
    ms: 'ms'
  };
  var MISSING_TEXT_BY_LANG = {
    ko: '번역을 준비 중입니다',
    en: 'Translation pending',
    ja: '翻訳を準備しています',
    'zh-CN': '翻译准备中',
    'zh-TW': '翻譯準備中',
    vi: 'Đang chuẩn bị bản dịch',
    hi: 'अनुवाद तैयार हो रहा है',
    es: 'Traducción en preparación',
    fr: 'Traduction en préparation',
    de: 'Übersetzung wird vorbereitet',
    nl: 'Vertaling wordt voorbereid',
    ms: 'Terjemahan sedang disediakan'
  };
  var dictionaryCache = {};
  var activeDictionary = null;
  var activeDictionaryLang = 'ko';
  var missingKeyLog = {};
  var applying = false;
  var nativeScriptCacheKey = detectNativeScriptCacheKey();

  function isSupportedLang(lang) {
    return SUPPORTED_LANGS.indexOf(lang) !== -1;
  }

  function normalizeLang(lang) {
    var next = String(lang || '').trim();
    var lower = next.toLowerCase().replace('_', '-');
    if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh-hans') return 'zh-CN';
    if (lower === 'zh-tw' || lower === 'zh-hant' || lower === 'zh-hk' || lower === 'zh-mo') return 'zh-TW';
    if (lower === 'vi-vn') return 'vi';
    return isSupportedLang(next) ? next : 'ko';
  }

  function getUrlLang() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var lang = params.get('lang');
      return lang ? normalizeLang(lang) : '';
    } catch (_) {}
    return '';
  }

  function detectNativeScriptCacheKey() {
    try {
      var script = document.currentScript || document.querySelector('script[src*="/js/cd-lang-native.js"]');
      var src = script && script.getAttribute('src');
      if (!src) return '';
      var params = new URL(src, window.location.href).searchParams;
      return params.get('v') || '';
    } catch (_) {}
    return '';
  }

  function getDictionaryUrl(file) {
    var url = '/i18n/' + file + '.json';
    return nativeScriptCacheKey ? url + '?v=' + encodeURIComponent(nativeScriptCacheKey) : url;
  }

  function readCookie(name) {
    try {
      var prefix = name + '=';
      var parts = String(document.cookie || '').split(';');
      for (var i = 0; i < parts.length; i += 1) {
        var item = parts[i].trim();
        if (item.indexOf(prefix) === 0) return decodeURIComponent(item.slice(prefix.length));
      }
    } catch (_) {}
    return '';
  }

  function readStoredValue(name) {
    try { return localStorage.getItem(name) || ''; } catch (_) {}
    return '';
  }

  function hasSavedLangAck() {
    return readStoredValue('cd_lang_ack') === '1' ||
      readStoredValue('cd_locale_ack') === '1' ||
      readCookie('cd_locale_ack') === '1';
  }

  function getPathPrefixLang() {
    // /ja/, /zh/, /zh-tw/, /en/ 로케일 랜딩에서는 경로만으로 기본 언어를 결정한다.
    // (일본 등 검색 유입 방문자가 쿠키 없이도 해당 언어로 첫 화면을 보게 하기 위함)
    //
    // 🔴 zh-tw 를 빠뜨리면 대만 방문자가 **번체 페이지가 한국어로 되돌아가는 것**을 본다.
    //    빌드 타임에 번역된 dist/zh-tw/index.html 이 원문을 data-cd-origin-text 로 들고 있어서,
    //    여기서 ''(=ko)로 떨어지는 순간 applyNativeTranslations('ko') 가 그 원문을 복원한다.
    //    2026-08-23 실측: dist/zh-tw/index.html 에 data-cd-origin-text 1,303개.
    try {
      var seg = String(window.location.pathname || '').split('/')[1] || '';
      if (seg === 'ja') return 'ja';
      if (seg === 'zh') return 'zh-CN';
      if (seg === 'zh-tw') return 'zh-TW';
      if (seg === 'en') return 'en';
    } catch (_) {}
    return '';
  }

  function getSavedLang() {
    var urlLang = getUrlLang();
    if (urlLang) return urlLang;
    if (hasSavedLangAck()) {
      var stored = readStoredValue('cd_lang');
      if (stored) return normalizeLang(stored);
      var cookieLang = readCookie('cd_locale');
      if (cookieLang) return normalizeLang(cookieLang);
    }
    var pathLang = getPathPrefixLang();
    if (pathLang) return pathLang;
    return 'ko';
  }

  function setSavedLang(lang) {
    try { localStorage.setItem('cd_lang', lang); } catch (_) {}
    writeCookie('cd_locale', lang, 315360000);
  }

  function markLegacyExplicitLang(lang) {
    try {
      localStorage.setItem('cd_lang_explicit', '1');
      if (lang) localStorage.setItem('cd_lang', lang);
    } catch (_) {}
  }

  function markSavedLangAck(lang) {
    try {
      localStorage.setItem('cd_lang_ack', '1');
      localStorage.setItem('cd_locale_ack', '1');
    } catch (_) {}
    markLegacyExplicitLang(lang);
    writeCookie('cd_locale_ack', '1', 315360000);
  }

  function writeCookie(name, value, maxAge) {
    var host = window.location.hostname;
    var encoded = encodeURIComponent(value);
    var attrs = '; path=/; SameSite=Lax';
    if (typeof maxAge === 'number') attrs += '; max-age=' + maxAge;
    document.cookie = name + '=' + encoded + attrs;
    if (host) {
      document.cookie = name + '=' + encoded + attrs + '; domain=' + host;
      document.cookie = name + '=' + encoded + attrs + '; domain=.' + host;
    }
  }

  function clearLegacyTranslateCookie() {
    writeCookie('goog' + 'trans', '', 0);
  }

  function updateLanguageUi(lang) {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-cd-lang', lang);
      document.documentElement.setAttribute('lang', lang === 'zh-CN' ? 'zh-CN' : lang === 'zh-TW' ? 'zh-TW' : lang);
    }
    var label = document.getElementById('langLabel') || document.getElementById('translateLangLabel');
    if (label) label.textContent = LABEL_BY_LANG[lang] || lang.toUpperCase();
    Array.prototype.forEach.call(document.querySelectorAll('.lang-btn, .cd-footer-langpick__btn'), function (btn) {
      var active = normalizeLang(btn.getAttribute('data-lang')) === lang;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
  }

  function installNativeLanguageUiGuards() {
    window.cdRefreshLangLabel = function () {
      updateLanguageUi(getSavedLang());
    };
  }

  function syncLanguageUiSoon(lang) {
    updateLanguageUi(lang);
    [60, 240, 720, 1600].forEach(function (delay) {
      window.setTimeout(function () {
        updateLanguageUi(getSavedLang());
      }, delay);
    });
  }

  function closeLanguageMenu() {
    var wrap = document.getElementById('langWrap');
    var trigger = document.getElementById('langTrigger');
    if (wrap) wrap.classList.remove('open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function shouldSkipGoogleTranslate() {
    return true;
  }

  function setNativeOnlyLanguageMode() {
    window.__cdNativeOnlyLanguage = true;
    window.__cdGoogleTranslateSuppressed = true;
    if (document.documentElement) {
      document.documentElement.setAttribute('data-cd-language-engine', 'native');
      document.documentElement.toggleAttribute('data-cd-gt-suppressed', true);
    }
  }

  function valueAtPath(source, path) {
    return String(path || '').replace(/\[(\d+)\]/g, '.$1').split('.').reduce(function (acc, key) {
      if (!acc || !key) return acc;
      return acc[key];
    }, source);
  }

  function interpolate(value, vars) {
    if (!vars || typeof vars !== 'object') return value;
    return String(value || '').replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}|\{\s*([a-zA-Z0-9_.-]+)\s*\}/g, function (_, doubleKey, singleKey) {
      var key = doubleKey || singleKey;
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : '';
    });
  }

  /**
   * `@some.dict.key` 꼴 변수값을 사전에서 풀어 준다.
   * 🔴 lib/i18n/dictionary.ts 의 resolveVars 와 **같은 동작이어야 한다**(이중 구현).
   * 왜 필요한가: 마커가 붙는 HTML 은 서버에서 한 번 렌더되고 그때는 로케일을 모른다.
   * 변수 자리에 값을 박으면 번역문 안에 한국어가 남으므로, 값 대신 키를 넣게 한다.
   * `@` 뒤가 키로 풀리지 않으면 원문을 그대로 둔다(이메일 같은 값을 삼키지 않기 위해).
   */
  function resolveVars(dictionary, vars) {
    if (!vars || typeof vars !== 'object') return vars;
    var changed = false;
    var out = {};
    Object.keys(vars).forEach(function (name) {
      var raw = vars[name];
      if (typeof raw === 'string' && raw.length > 1 && raw.charCodeAt(0) === 64) {
        var looked = valueAtPath(dictionary, raw.slice(1));
        if (typeof looked === 'string') {
          out[name] = looked;
          changed = true;
          return;
        }
      }
      out[name] = raw;
    });
    return changed ? out : vars;
  }

  function readVars(el) {
    var raw = el && el.getAttribute && el.getAttribute('data-cd-vars');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function missingText(lang) {
    return MISSING_TEXT_BY_LANG[lang] || MISSING_TEXT_BY_LANG.en;
  }

  function reportMissingKey(lang, key, attrName) {
    var id = [lang, key, attrName || 'text'].join('|');
    if (missingKeyLog[id]) return;
    missingKeyLog[id] = true;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[cd-i18n-missing]', { lang: lang, key: key, attr: attrName || 'text' });
    }
  }

  function resolveValue(dictionary, key, lang, attrName) {
    var value = valueAtPath(dictionary, key);
    if (typeof value === 'string') return value;
    reportMissingKey(lang, key, attrName);
    return missingText(lang);
  }

  /** 파일 basename 으로 사전을 받아 온다. ko 는 I18N_FILE_BY_LANG 에 없으므로 이 경로로만 얻는다. */
  function loadDictionaryFile(file) {
    if (!file) return Promise.resolve(null);
    var cacheKey = file + ':' + nativeScriptCacheKey;
    if (dictionaryCache[cacheKey]) return dictionaryCache[cacheKey];
    dictionaryCache[cacheKey] = fetch(getDictionaryUrl(file), { cache: 'force-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('i18n fetch failed: ' + file);
        return res.json();
      })
      .catch(function () {
        delete dictionaryCache[cacheKey];
        return null;
      });
    return dictionaryCache[cacheKey];
  }

  function loadDictionary(lang) {
    return loadDictionaryFile(I18N_FILE_BY_LANG[lang]);
  }

  function shouldTranslateText(el) {
    return !!(
      el &&
      (el.hasAttribute('data-cd-trans') ||
        el.hasAttribute('data-key') ||
        el.classList.contains('custom-trans'))
    );
  }

  function markNativeNodes() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cd-trans], [data-cd-trans-attr], .custom-trans'), function (el) {
      el.classList.add('notranslate');
      if (shouldTranslateText(el) && !el.hasAttribute('data-cd-origin-text')) {
        el.setAttribute('data-cd-origin-text', el.textContent || '');
      }
      var attrSpec = el.getAttribute('data-cd-trans-attr') || '';
      attrSpec.split(',').map(function (item) { return item.trim(); }).filter(Boolean).forEach(function (item) {
        var attrName = item.split(':')[0].trim();
        if (!attrName) return;
        var originName = 'data-cd-origin-attr-' + attrName.replace(/[^a-zA-Z0-9_-]/g, '-');
        if (!el.hasAttribute(originName)) {
          el.setAttribute(originName, el.getAttribute(attrName) || '');
        }
      });
    });
  }

  function applyAttributeTranslations(el, dictionary, lang, vars) {
    var attrSpec = el.getAttribute('data-cd-trans-attr') || '';
    attrSpec.split(',').map(function (item) { return item.trim(); }).filter(Boolean).forEach(function (item) {
      var parts = item.split(':');
      var attrName = String(parts.shift() || '').trim();
      var attrKey = String(parts.join(':') || '').trim();
      if (!attrName || !attrKey) return;
      var value = interpolate(resolveValue(dictionary, attrKey, lang, attrName), resolveVars(dictionary, vars));
      el.setAttribute(attrName, value);
    });
  }

  function applyNativeTranslations(lang) {
    markNativeNodes();
    if (lang === 'ko') {
      activeDictionary = null;
      activeDictionaryLang = 'ko';
      Array.prototype.forEach.call(document.querySelectorAll('[data-cd-trans], [data-cd-trans-attr], .custom-trans'), function (el) {
        if (shouldTranslateText(el) && el.hasAttribute('data-cd-origin-text')) {
          el.textContent = el.getAttribute('data-cd-origin-text') || '';
        }
        var attrSpec = el.getAttribute('data-cd-trans-attr') || '';
        attrSpec.split(',').map(function (item) { return item.trim(); }).filter(Boolean).forEach(function (item) {
          var attrName = item.split(':')[0].trim();
          if (!attrName) return;
          var originName = 'data-cd-origin-attr-' + attrName.replace(/[^a-zA-Z0-9_-]/g, '-');
          if (el.hasAttribute(originName)) el.setAttribute(attrName, el.getAttribute(originName) || '');
        });
      });
      return Promise.resolve();
    }
    return loadDictionary(lang).then(function (dictionary) {
      if (!dictionary) dictionary = {};
      activeDictionary = dictionary;
      activeDictionaryLang = lang;
      Array.prototype.forEach.call(document.querySelectorAll('[data-cd-trans], [data-cd-trans-attr], .custom-trans'), function (el) {
        var key = el.getAttribute('data-key') || el.getAttribute('data-cd-trans');
        var vars = readVars(el);
        if (key) el.textContent = interpolate(resolveValue(dictionary, key, lang, 'text'), resolveVars(dictionary, vars));
        applyAttributeTranslations(el, dictionary, lang, vars);
      });
      return repairUnmarkedKoreanText(dictionary, lang);
    });
  }

  /**
   * 마커 없는 한국어 텍스트를 한국어 원문으로 역조회해 번역한다.
   *
   * 왜 필요한가: 셸의 UI 상당수는 인라인 스크립트가 런타임에 만든다. 그 생성기들은
   * `__cdText(key, '한국어')` 로 문자열만 얻고 **마커는 남기지 않는다**. 사전 fetch 가
   * 끝나기 전에 그려지면 fallback(한국어)이 그대로 DOM 에 박히고, 언어 전환은
   * 마커 있는 노드만 훑으므로 그 노드는 영원히 한국어로 남는다. 실측으로 일본어 홈에
   * 한국어 1,162자가 이렇게 남아 있었다.
   *
   * 생성기 수백 곳에 마커를 심는 대신, ko.json(한국어 원문↔키)을 역인덱스로 만들어
   * 텍스트 자체로 키를 찾는다. 복구한 노드에는 마커를 남겨 다음 전환부터는 정상 경로를 탄다.
   */
  /**
   * 런타임 생성 UI 문구는 코어 사전이 아니라 `<lang>/shellRuntime.json` 네임스페이스에 있다.
   * 코어 사전은 첫 페인트 경로에서 바로 받으므로 수천 개를 더 얹을 수 없어 분리했다.
   * 복구 패스는 첫 화면 이후에 도는 보정이라 여기서 한 번 더 받아도 체감 지연이 없다.
   */
  var REPAIR_NAMESPACE = 'shellRuntime';

  /** 평면 키("a.b.c" 자체가 프로퍼티)와 중첩 키를 모두 지원하는 조회. */
  function lookupTranslation(source, key) {
    if (!source) return undefined;
    if (typeof source[key] === 'string') return source[key];
    return valueAtPath(source, key);
  }

  var koReverseIndex = null;
  var repairNamespaceCache = {};

  function loadRepairNamespace(langFile) {
    if (!langFile) return Promise.resolve(null);
    if (repairNamespaceCache[langFile]) return repairNamespaceCache[langFile];
    repairNamespaceCache[langFile] = loadDictionaryFile(langFile + '/' + REPAIR_NAMESPACE);
    return repairNamespaceCache[langFile];
  }

  function buildKoReverseIndex() {
    if (koReverseIndex) return Promise.resolve(koReverseIndex);
    return Promise.all([loadDictionaryFile('ko'), loadRepairNamespace('ko')]).then(function (sources) {
      var index = {};
      sources.filter(Boolean).forEach(function (source) {
        (function walk(node, path) {
          for (var key in node) {
            if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
            var value = node[key];
            var next = path ? path + '.' + key : key;
            if (typeof value === 'string') {
              var text = value.replace(/\s+/g, ' ').trim();
              // 2자까지 내린다. "추천"·"무료"·"신규" 같은 배지 라벨이 UI 크롬의 상당수라
              // 4자 하한으로는 그 구간이 통째로 한국어로 남는다. 대신 아래 repair 쪽에서
              // 입력 필드·사용자 생성 영역을 제외해 오탐을 막는다.
              if (text.length >= 2 && !Object.prototype.hasOwnProperty.call(index, text)) index[text] = next;
            } else if (value && typeof value === 'object') {
              walk(value, next);
            }
          }
        })(source, '');
      });
      koReverseIndex = index;
      return index;
    });
  }

  function repairUnmarkedKoreanText(dictionary, lang) {
    var langFile = I18N_FILE_BY_LANG[lang];
    return Promise.all([buildKoReverseIndex(), loadRepairNamespace(langFile)]).then(function (loaded) {
      var index = loaded[0];
      var namespaceDictionary = loaded[1];
      if (!index || !document.body) return;
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var pending = [];
      for (var node = walker.nextNode(); node; node = walker.nextNode()) {
        var raw = node.nodeValue || '';
        var text = raw.replace(/\s+/g, ' ').trim();
        if (!text || !/[가-힣]/.test(text)) continue;
        var parent = node.parentElement;
        if (!parent) continue;
        if (parent.closest('script, style, template, noscript, [data-cd-no-trans]')) continue;
        // 🔴 마커가 있는 노드도 건너뛰지 않는다.
        // 생성기가 번역이 끝난 뒤 마킹된 노드를 한국어 리터럴로 덮어쓰는 경우가 있다
        // (예: syncMembershipStatus 가 heroTitle.textContent 에 한국어를 직접 대입).
        // 마커가 있는데도 한국어가 보인다면 그건 언제나 잘못된 상태이므로 고치는 편이 옳다.
        // ko 로케일에서는 이 패스 자체가 돌지 않으므로 원문이 훼손될 일은 없다.
        // 사용자가 넣은 값이 우리 UI 문구와 우연히 같을 수 있는 자리는 건드리지 않는다.
        // (프로필 이름, 입력 미리보기, 상담 답변 등)
        // select 는 제외하지 않는다 — <option> 은 우리가 쓴 UI 라벨이지 사용자 입력이 아니다.
        if (parent.closest('input, textarea, [contenteditable], [data-cd-user-content]')) continue;
        var key = index[text];
        if (!key) continue;
        // 코어 사전 → shellRuntime 네임스페이스 순으로 찾는다.
        // 네임스페이스 파일은 점을 포함한 **평면 키**일 수도, 중첩일 수도 있어 둘 다 본다.
        var translated = lookupTranslation(dictionary, key);
        if (typeof translated !== 'string') translated = lookupTranslation(namespaceDictionary, key);
        if (typeof translated !== 'string' || !translated || translated === text) continue;
        pending.push({ node: node, raw: raw, text: text, key: key, translated: translated, parent: parent });
      }
      pending.forEach(function (item) {
        // 앞뒤 공백을 보존해야 인접 인라인 요소와의 간격이 무너지지 않는다
        var lead = item.raw.match(/^\s*/)[0];
        var tail = item.raw.match(/\s*$/)[0];
        item.node.nodeValue = lead + item.translated + tail;
        // 부모가 이 텍스트만 가지면 마커를 남겨 다음 전환부터 정상 경로를 타게 한다
        if (item.parent.childNodes.length === 1 && !item.parent.hasAttribute('data-cd-trans')) {
          item.parent.setAttribute('data-cd-trans', item.key);
          item.parent.setAttribute('data-cd-origin-text', item.text);
          item.parent.classList.add('notranslate');
        }
      });
      return pending.length;
    });
  }

  /**
   * 늦게 그려지는 DOM 을 위한 복구 재실행.
   * 홈 셸은 컬렉션·모달·프로필 카드를 스크롤·클릭 시점에 만든다. 최초 적용 한 번으로는
   * 그 노드들을 못 잡으므로 DOM 변화를 보고 복구 패스를 다시 돌린다.
   * 관찰은 하나만 건다 — 이미 걸려 있으면 새로 만들지 않는다(중첩 방지).
   */
  var repairTimer = null;
  function installRepairObserver() {
    if (window.__cdKoRepairObserverBound || typeof MutationObserver !== 'function' || !document.body) return;
    window.__cdKoRepairObserverBound = true;
    new MutationObserver(function () {
      if (activeDictionaryLang === 'ko' || !activeDictionary) return;
      if (repairTimer) clearTimeout(repairTimer);
      repairTimer = setTimeout(function () {
        repairTimer = null;
        repairUnmarkedKoreanText(activeDictionary, activeDictionaryLang);
      }, 400);
    }).observe(document.body, { childList: true, subtree: true });
  }

  function nativeChangeLanguage(langCode, btn) {
    var lang = normalizeLang(langCode || (btn && btn.getAttribute && btn.getAttribute('data-lang')));
    if (applying) return;
    applying = true;
    setNativeOnlyLanguageMode();
    clearLegacyTranslateCookie();
    setSavedLang(lang);
    markSavedLangAck(lang);
    syncLanguageUiSoon(lang);
    closeLanguageMenu();
    applyNativeTranslations(lang).finally(function () {
      syncLanguageUiSoon(lang);
      applying = false;
    });
  }

  window.changeLanguage = nativeChangeLanguage;
  window.cdApplyNativeTranslations = applyNativeTranslations;
  window.cdGetCurrentLanguage = getSavedLang;
  window.cdTranslate = function (key, vars, fallback) {
    var lang = getSavedLang();
    if (lang === 'ko') return typeof fallback === 'string' ? interpolate(fallback, vars || {}) : key;
    if (!activeDictionary || activeDictionaryLang !== lang) return typeof fallback === 'string' ? interpolate(fallback, vars || {}) : missingText(lang);
    return interpolate(resolveValue(activeDictionary, key, lang, 'text'), resolveVars(activeDictionary, vars || {}));
  };
  window.__cdShouldSkipGoogleTranslate = shouldSkipGoogleTranslate;
  window.__cdNativeLangBound = true;
  window.__cdNativeIncludedLanguages = INCLUDED_GT_LANGUAGES;

  function init() {
    setNativeOnlyLanguageMode();
    clearLegacyTranslateCookie();
    installNativeLanguageUiGuards();
    if (document.documentElement) {
      document.documentElement.setAttribute('data-cd-native-lang', 'ready');
    }
    markNativeNodes();
    var lang = getSavedLang();
    if (getUrlLang()) {
      setSavedLang(lang);
      markSavedLangAck(lang);
    } else if (lang !== 'ko' && hasSavedLangAck()) {
      setSavedLang(lang);
      markSavedLangAck(lang);
    }
    syncLanguageUiSoon(lang);
    applyNativeTranslations(lang).finally(function () {
      syncLanguageUiSoon(lang);
      installRepairObserver();
    });
    if (!window.__cdNativeLangClickBound) {
      window.__cdNativeLangClickBound = true;
      document.addEventListener('click', function (event) {
        var target = event && event.target;
        if (!target || !target.closest) return;
        var btn = target.closest('.lang-btn[data-lang]');
        if (!btn) return;
        event.preventDefault();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        else event.stopPropagation();
        nativeChangeLanguage(btn.getAttribute('data-lang'), btn);
      }, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
