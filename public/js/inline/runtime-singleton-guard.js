(function initRuntimeSingletonGuard(globalObj) {
  'use strict';

  if (!globalObj) return;
  if (globalObj.__FORTUNE_RUNTIME_GUARD_READY__) return;

  var STATE_KEY = '__FORTUNE_RUNTIME_SINGLETONS__';
  var SCRIPT_KEY = '__FORTUNE_RUNTIME_SCRIPT_PROMISES__';
  var STYLE_KEY = '__FORTUNE_RUNTIME_STYLE_LOADED__';

  globalObj[STATE_KEY] = globalObj[STATE_KEY] || Object.create(null);
  globalObj[SCRIPT_KEY] = globalObj[SCRIPT_KEY] || Object.create(null);
  globalObj[STYLE_KEY] = globalObj[STYLE_KEY] || Object.create(null);

  function runOnce(key, fn) {
    if (!key || typeof fn !== 'function') return;
    if (globalObj[STATE_KEY][key]) return;
    globalObj[STATE_KEY][key] = 1;
    fn();
  }

  function normalizePath(path) {
    return String(path || '').replace(/^\.\//, '');
  }

  function findScriptBySrc(src) {
    var target = normalizePath(src);
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i += 1) {
      var cur = normalizePath(scripts[i].getAttribute('src') || '');
      if (cur === target || cur.indexOf(target) >= 0 || target.indexOf(cur) >= 0) return scripts[i];
    }
    return null;
  }

  function loadScriptOnce(src, opts) {
    var target = normalizePath(src);
    if (!target) return Promise.resolve();

    if (globalObj[SCRIPT_KEY][target]) return globalObj[SCRIPT_KEY][target];

    var existing = findScriptBySrc(target);
    if (existing && existing.dataset.loaded === '1') {
      globalObj[SCRIPT_KEY][target] = Promise.resolve();
      return globalObj[SCRIPT_KEY][target];
    }

    if (existing && existing.dataset.loading === '1') {
      globalObj[SCRIPT_KEY][target] = new Promise(function (resolve, reject) {
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('load failed: ' + target)); }, { once: true });
      });
      return globalObj[SCRIPT_KEY][target];
    }

    globalObj[SCRIPT_KEY][target] = new Promise(function (resolve, reject) {
      var script = existing || document.createElement('script');
      if (!existing) {
        script.src = target;
        script.defer = !opts || opts.defer !== false;
        script.async = !!(opts && opts.async);
        script.dataset.loading = '1';
        (document.head || document.body || document.documentElement).appendChild(script);
      }

      script.addEventListener('load', function () {
        script.dataset.loading = '0';
        script.dataset.loaded = '1';
        resolve();
      }, { once: true });

      script.addEventListener('error', function () {
        script.dataset.loading = '0';
        reject(new Error('load failed: ' + target));
      }, { once: true });
    });

    return globalObj[SCRIPT_KEY][target];
  }

  function loadStylesheetOnce(href) {
    var target = normalizePath(href);
    if (!target) return;
    if (globalObj[STYLE_KEY][target]) return;

    var links = document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]');
    for (var i = 0; i < links.length; i += 1) {
      var cur = normalizePath(links[i].getAttribute('href') || '');
      if (cur === target) {
        globalObj[STYLE_KEY][target] = 1;
        return;
      }
    }

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = target;
    link.media = 'print';
    link.onload = function () {
      link.media = 'all';
    };
    document.head.appendChild(link);
    globalObj[STYLE_KEY][target] = 1;
  }

  globalObj.__runOnce = runOnce;
  globalObj.__loadScriptOnce = loadScriptOnce;
  globalObj.__loadStylesheetOnce = loadStylesheetOnce;
  globalObj.__FORTUNE_RUNTIME_GUARD_READY__ = true;
})(typeof globalThis !== 'undefined' ? globalThis : window);
