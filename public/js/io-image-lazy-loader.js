(function () {
  'use strict';

  var IO_MARGIN = '360px 0px';
  var HERO_SELECTOR = 'img[data-lcp-candidate="1"]';
  var IMG_SELECTOR = 'img[data-lazy-src], img[data-lazy-srcset]';
  var BG_SELECTOR = '[data-lazy-bg]';
  var LQIP_SRC = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%223%22 viewBox=%220 0 4 3%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 x2=%221%22 y1=%220%22 y2=%221%22%3E%3Cstop stop-color=%22%231a1630%22/%3E%3Cstop offset=%221%22 stop-color=%22%23272545%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%224%22 height=%223%22 fill=%22url(%23g)%22/%3E%3C/svg%3E';

  function markHero() {
    var hero = document.querySelector(HERO_SELECTOR);
    if (!hero) return;
    hero.setAttribute('loading', 'eager');
    hero.setAttribute('fetchpriority', 'high');
    hero.setAttribute('decoding', 'async');
  }

  function ensureNativeLazy(img) {
    if (!img || img.getAttribute('data-lcp-candidate') === '1') return;
    if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.getAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
  }

  function hydrateImg(img) {
    if (!img || img.dataset.lazyLoaded === '1') return;
    var src = img.getAttribute('data-lazy-src');
    var srcset = img.getAttribute('data-lazy-srcset');
    if (srcset) img.setAttribute('srcset', srcset);
    if (src) img.setAttribute('src', src);
    img.dataset.lazyLoaded = '1';
    img.classList.add('io-lazy-img');
    img.addEventListener('load', function () {
      img.classList.add('is-loaded');
    }, { once: true });
    img.addEventListener('error', function () {
      img.classList.add('is-loaded');
    }, { once: true });
  }

  function hydrateBg(el) {
    if (!el || el.dataset.bgLazyLoaded === '1') return;
    var bg = el.getAttribute('data-lazy-bg');
    if (!bg) return;
    el.style.backgroundImage = 'url(' + JSON.stringify(bg).slice(1, -1) + ')';
    el.dataset.bgLazyLoaded = '1';
    el.classList.add('is-bg-loaded');
  }

  function prepare() {
    var lazyImgs = document.querySelectorAll(IMG_SELECTOR);
    for (var i = 0; i < lazyImgs.length; i += 1) {
      var img = lazyImgs[i];
      ensureNativeLazy(img);
      if (!img.getAttribute('src')) {
        img.setAttribute('src', LQIP_SRC);
      }
    }

    var allImgs = document.querySelectorAll('img');
    for (var j = 0; j < allImgs.length; j += 1) {
      ensureNativeLazy(allImgs[j]);
    }
  }

  function observe() {
    var lazyImgs = document.querySelectorAll(IMG_SELECTOR);
    var lazyBgs = document.querySelectorAll(BG_SELECTOR);

    if (typeof IntersectionObserver === 'undefined') {
      for (var i = 0; i < lazyImgs.length; i += 1) hydrateImg(lazyImgs[i]);
      for (var j = 0; j < lazyBgs.length; j += 1) hydrateBg(lazyBgs[j]);
      return;
    }

    var io = new IntersectionObserver(function (entries, observer) {
      for (var k = 0; k < entries.length; k += 1) {
        var entry = entries[k];
        if (!entry.isIntersecting) continue;
        var target = entry.target;
        if (target.matches(IMG_SELECTOR)) {
          hydrateImg(target);
        } else if (target.matches(BG_SELECTOR)) {
          hydrateBg(target);
        }
        observer.unobserve(target);
      }
    }, {
      root: null,
      rootMargin: IO_MARGIN,
      threshold: 0.01
    });

    for (var a = 0; a < lazyImgs.length; a += 1) {
      io.observe(lazyImgs[a]);
    }
    for (var b = 0; b < lazyBgs.length; b += 1) {
      io.observe(lazyBgs[b]);
    }
  }

  function watchDomChanges() {
    if (!document.body || typeof MutationObserver === 'undefined') return;
    var mo = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i += 1) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j += 1) {
          var node = added[j];
          if (!node || node.nodeType !== 1) continue;
          if (node.matches && node.matches('img')) {
            ensureNativeLazy(node);
          }
          if (node.querySelectorAll) {
            var imgs = node.querySelectorAll('img');
            for (var n = 0; n < imgs.length; n += 1) {
              ensureNativeLazy(imgs[n]);
            }
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    markHero();
    prepare();
    observe();
    watchDomChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
