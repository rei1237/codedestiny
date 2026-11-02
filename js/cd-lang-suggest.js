/*
 * 언어 제안 배너 (client-only).
 * URL 이 언어를 정한다. 이 스크립트는 이동시키지 않고, 브라우저 언어가 다른 판이 있을 때 링크만 제안한다.
 * 서버 출력(SSR)에는 절대 들어가지 않는다: 같은 URL 은 모든 국가·에이전트에게 같은 HTML 이어야 한다.
 */
(function () {
  'use strict';
  if (window.__cdLangSuggestLoaded) return;
  window.__cdLangSuggestLoaded = true;

  var DISMISS_KEY = 'cd_lang_suggest_dismissed';
  var ROOT_TABLE = { en: '/en/', ja: '/ja/', 'zh-CN': '/zh/', 'zh-TW': '/zh-tw/' };
  var COPY = {
    en: ['This page is also available in English.', 'View in English', 'Close'],
    ko: ['이 페이지는 한국어로도 볼 수 있어요.', '한국어로 보기', '닫기'],
    ja: ['このページは日本語でもご覧いただけます。', '日本語で見る', '閉じる'],
    'zh-CN': ['此页面也有简体中文版。', '查看简体中文版', '关闭'],
    'zh-TW': ['此頁面也有繁體中文版。', '查看繁體中文版', '關閉']
  };

  function readStorage(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStorage(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* 기록 없음으로 본다 */ }
  }
  function hasCookie(name, value) {
    try {
      return new RegExp('(?:^|;\\s*)' + name + '=' + value + '(?:;|$)').test(document.cookie || '');
    } catch (e) { return false; }
  }

  function normalize(tag) {
    var parts = String(tag || '').toLowerCase().replace(/_/g, '-').split('-');
    var base = parts[0];
    if (!base) return '';
    if (base !== 'zh') return base;
    for (var i = 1; i < parts.length; i += 1) {
      if (parts[i] === 'tw' || parts[i] === 'hk' || parts[i] === 'mo' || parts[i] === 'hant') return 'zh-TW';
    }
    return 'zh-CN';
  }

  function currentLanguage(path) {
    var lower = path.toLowerCase();
    function under(prefix) { return lower === prefix || lower.indexOf(prefix + '/') === 0; }
    if (under('/en')) return 'en';
    if (under('/ja')) return 'ja';
    if (under('/zh-tw')) return 'zh-TW';
    if (under('/zh')) return 'zh-CN';
    return 'ko';
  }

  function pathOf(href) {
    var a = document.createElement('a');
    a.href = href;
    var path = a.pathname || '';
    return path.charAt(0) === '/' ? path : '/' + path;
  }

  function alternates(path) {
    if (path === '/') return ROOT_TABLE;
    var table = {};
    var links = document.querySelectorAll('link[rel="alternate"][hreflang]');
    for (var i = 0; i < links.length; i += 1) {
      var code = links[i].getAttribute('hreflang') || '';
      var href = links[i].getAttribute('href');
      if (!href || code.toLowerCase() === 'x-default') continue;
      var lang = normalize(code);
      if (lang && !table[lang]) table[lang] = pathOf(href);
    }
    return table;
  }

  function browserLanguages() {
    var nav = window.navigator || {};
    var list = nav.languages && nav.languages.length ? nav.languages : [nav.language];
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var lang = normalize(list[i]);
      if (lang) out.push(lang);
    }
    return out;
  }

  function choose(current, table) {
    var wanted = browserLanguages();
    for (var i = 0; i < wanted.length; i += 1) {
      if (wanted[i] === current) return null;
      if (Object.prototype.hasOwnProperty.call(table, wanted[i]) && COPY[wanted[i]]) return wanted[i];
    }
    return null;
  }

  // 상단 헤더(내비·메뉴)를 가리지 않도록 화면 맨 위에 붙은 헤더 바로 아래에 둔다. 헤더가 없으면 8px.
  function topOffset() {
    try {
      var headers = document.querySelectorAll('header');
      for (var i = 0; i < headers.length; i += 1) {
        var rect = headers[i].getBoundingClientRect();
        if (rect.height > 0 && rect.top < 20 && rect.bottom > 0 && rect.bottom < 160) return Math.round(rect.bottom) + 8;
      }
    } catch (e) { /* 기본 위치 */ }
    return 8;
  }

  // 첫 번째 보이는 h1 과 겹치고 그 h1 의 아래쪽이 화면 위쪽 절반 안이면 h1 바로 아래로 내린다. 한 번만 잰다.
  function avoidHeading(box) {
    try {
      var heads = document.querySelectorAll('h1');
      for (var i = 0; i < heads.length; i += 1) {
        var h = heads[i].getBoundingClientRect();
        if (!(h.height > 0)) continue;
        var b = box.getBoundingClientRect();
        var half = (window.innerHeight || 0) / 2;
        if (h.top < b.bottom && h.bottom > b.top && h.bottom <= half) box.style.top = Math.round(h.bottom + 8) + 'px';
        return;
      }
    } catch (e) { /* 기본 위치 */ }
  }

  function show(lang, path) {
    var copy = COPY[lang];
    var box = document.createElement('div');
    box.id = 'cd-lang-suggest';
    box.setAttribute('role', 'region');
    box.setAttribute('translate', 'no');
    box.setAttribute('lang', lang);
    box.setAttribute('aria-label', copy[0]);
    box.style.cssText = 'position:fixed;top:' + topOffset() + 'px;left:8px;right:8px;margin:0 auto;width:fit-content;z-index:100250;'
      + 'box-sizing:border-box;max-width:calc(100vw - 16px);display:flex;align-items:center;gap:8px;'
      + 'padding:8px 8px 8px 14px;border-radius:12px;background:#fff;color:#1f2430;border:1px solid rgba(31,36,48,.18);'
      + 'box-shadow:0 6px 24px rgba(0,0,0,.18);font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;';

    var body = document.createElement('div');
    body.style.cssText = 'flex:1 1 auto;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;';
    var text = document.createElement('span');
    text.textContent = copy[0];

    var link = document.createElement('a');
    link.setAttribute('href', path);
    link.setAttribute('hreflang', lang);
    link.textContent = copy[1];
    link.style.cssText = 'color:#5b3fd4;font-weight:600;text-decoration:underline;white-space:nowrap;';

    var close = document.createElement('button');
    close.setAttribute('type', 'button');
    close.setAttribute('aria-label', copy[2]);
    close.textContent = '×';
    close.style.cssText = 'flex:none;min-width:32px;height:32px;border:0;border-radius:8px;background:transparent;'
      + 'color:inherit;font:inherit;font-size:20px;line-height:1;cursor:pointer;';
    close.addEventListener('click', function () {
      writeStorage(DISMISS_KEY, '1');
      if (box.parentNode) box.parentNode.removeChild(box);
    });

    body.appendChild(text);
    body.appendChild(link);
    box.appendChild(body);
    box.appendChild(close);
    document.body.appendChild(box);
    avoidHeading(box);
  }

  function run() {
    if (window.__cdAppLanguage) return;
    if (/[?&]lang=/.test(window.location.search || '')) return;
    if (hasCookie('cd_locale_explicit', '1')) return;
    if (readStorage('cd_lang_explicit') === '1') return;
    if (readStorage(DISMISS_KEY) === '1') return;

    var path = window.location.pathname || '/';
    var current = currentLanguage(path);
    var table = alternates(path);
    var lang = choose(current, table);
    if (!lang) return;
    show(lang, table[lang]);
  }

  if (document.body) run();
  else document.addEventListener('DOMContentLoaded', run);
})();
