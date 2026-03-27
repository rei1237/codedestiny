(function () {
  'use strict';

  var SELECTOR = 'script[data-cd-noncritical-src]';
  var STARTED = false;

  function loadSequentially(nodes, idx) {
    if (!nodes || idx >= nodes.length) return;
    var tag = nodes[idx];
    var src = tag.getAttribute('data-cd-noncritical-src');
    if (!src) {
      loadSequentially(nodes, idx + 1);
      return;
    }

    if (document.querySelector('script[src="' + src + '"]')) {
      loadSequentially(nodes, idx + 1);
      return;
    }

    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.async = false;
    s.onload = function () { loadSequentially(nodes, idx + 1); };
    s.onerror = function () { loadSequentially(nodes, idx + 1); };
    document.body.appendChild(s);
  }

  function start() {
    if (STARTED) return;
    STARTED = true;
    var nodes = document.querySelectorAll(SELECTOR);
    if (!nodes.length) return;
    loadSequentially(nodes, 0);
  }

  function boot() {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(start, { timeout: 3500 });
    } else {
      setTimeout(start, 2200);
    }

    var events = ['pointerdown', 'touchstart', 'keydown', 'scroll'];
    for (var i = 0; i < events.length; i += 1) {
      window.addEventListener(events[i], start, { once: true, passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
