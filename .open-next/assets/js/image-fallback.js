(function () {
  'use strict';

  var TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  function lockRenderedSize(img) {
    if (!img || typeof img.getBoundingClientRect !== 'function') return;
    var rect = img.getBoundingClientRect();

    // Preserve current rendered box to avoid layout shifts when fallback is applied.
    if (rect.width > 0 && !img.getAttribute('width') && !img.style.width) {
      img.style.width = Math.round(rect.width) + 'px';
    }
    if (rect.height > 0 && !img.getAttribute('height') && !img.style.height) {
      img.style.height = Math.round(rect.height) + 'px';
    }
  }

  function applyFallbackBackground(img) {
    if (!img || !img.parentElement) return;
    var bg = (img.getAttribute('data-img-error-bg') || '').trim();
    if (!bg) return;
    img.parentElement.style.background = bg;
  }

  function handleImageError(img) {
    if (!img || img.dataset.fallbackApplied === '1') return;

    img.dataset.fallbackApplied = '1';
    lockRenderedSize(img);

    img.onerror = null;
    img.classList.add('img-fallback-broken');
    img.style.objectFit = img.style.objectFit || 'cover';
    applyFallbackBackground(img);
    img.src = TRANSPARENT_PIXEL;
  }

  // Expose globally for inline onerror compatibility.
  window.handleImageError = handleImageError;

  function bindImage(img) {
    if (!img || img.dataset.fallbackBound === '1') return;

    img.dataset.fallbackBound = '1';
    img.addEventListener('error', function () {
      handleImageError(img);
    }, { passive: true });

    // Handle already-failed images restored from cache/history.
    if (img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src)) {
      handleImageError(img);
    }
  }

  function bindAllImages(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var list = scope.querySelectorAll('img');
    for (var i = 0; i < list.length; i++) {
      bindImage(list[i]);
    }
  }

  // Capture phase fallback to catch any image error globally.
  document.addEventListener('error', function (evt) {
    var target = evt && evt.target;
    if (target && target.tagName === 'IMG') {
      handleImageError(target);
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bindAllImages(document);
    }, { once: true });
  } else {
    bindAllImages(document);
  }

  // Keep fallback active for lazy-loaded or dynamically inserted images.
  var mo = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (!node || node.nodeType !== 1) continue;

        if (node.tagName === 'IMG') {
          bindImage(node);
        } else if (node.querySelectorAll) {
          bindAllImages(node);
        }
      }
    }
  });

  function startObserver() {
    var root = document.documentElement || document.body;
    if (!root) return;
    mo.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }

  window.addEventListener('pagehide', function () {
    try { mo.disconnect(); } catch (e) {}
  }, { once: true });
})();
