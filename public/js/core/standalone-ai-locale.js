(function (win) {
  'use strict';
  var supported = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms'];
  function normalize(value) {
    var parts = String(value || '').trim().toLowerCase().replace(/_/g, '-').split('-');
    if (parts[0] === 'jp') return 'ja';
    if (parts[0] === 'zh') return parts.some(function (p) { return ['hant', 'tw', 'hk', 'mo'].indexOf(p) >= 0; }) ? 'zh-TW' : 'zh-CN';
    return supported.indexOf(parts[0]) >= 0 ? parts[0] : 'ko';
  }
  function current() {
    // Native selection can supersede the initial URL. A fixed html lang cannot.
    if (win.__cdNativeLangBound && typeof win.cdGetCurrentLanguage === 'function' && win.cdGetCurrentLanguage !== current) return normalize(win.cdGetCurrentLanguage());
    try {
      var query = new URLSearchParams(win.location.search || '').get('lang');
      if (query) return normalize(query);
      var prefix = (win.location.pathname || '').split('/')[1];
      if (/^(ko|en|ja|zh|zh-cn|zh-tw|vi|hi|es|fr|de|nl|ms)$/i.test(prefix)) return normalize(prefix);
    } catch (_) {}
    try {
      var saved = win.localStorage.getItem('cd_lang');
      if (saved) return normalize(saved);
    } catch (_) {}
    try {
      var cookie = win.document.cookie.match(/(?:^|;\s*)cd_locale=([^;]*)/);
      if (cookie) return normalize(decodeURIComponent(cookie[1]));
    } catch (_) {}
    return 'ko';
  }
  win.cdStandaloneAiLocale = { normalize: normalize, current: current };
  // Existing checkout resume descriptors read this shared language accessor.
  if (typeof win.cdGetCurrentLanguage !== 'function') win.cdGetCurrentLanguage = current;
})(window);
