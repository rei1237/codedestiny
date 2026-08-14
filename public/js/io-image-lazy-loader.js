(function () {
  'use strict';

  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  }

  window.__CD_IO_LAZY_ACTIVE__ = isMobile();

  var IO_MARGIN = '360px 0px';
  var HERO_SELECTOR = 'img[data-lcp-candidate="1"]';
  var IMG_SELECTOR = 'img[data-lazy-src], img[data-lazy-srcset]';
  var BG_SELECTOR = '[data-lazy-bg]';
  var LQIP_SRC = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%223%22 viewBox=%220 0 4 3%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 x2=%221%22 y1=%220%22 y2=%221%22%3E%3Cstop stop-color=%22%231a1630%22/%3E%3Cstop offset=%221%22 stop-color=%22%23272545%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%224%22 height=%223%22 fill=%22url(%23g)%22/%3E%3C/svg%3E';
  var SRCSET_HINTS = {
    // 🔴 여기 URL 은 셸의 로고 preload(`<link rel=preload href="/icons/app-logo-512.webp">`)와
    //    **문자 그대로** 같아야 한다. 예전에는 후보 3개가 전부 같은 512px 파일을 `?v=…` 붙은
    //    경로로 가리켰다 — 디스크립터만 다르고 URL 이 같아 고르는 의미가 없는데다, preload 의
    //    버전 없는 경로와 캐시 키가 갈려 같은 그림을 두 번 받게 만들었다(2026-08-14 수정).
    //    후보를 하나로 줄여 preload·부팅 게이트·히어로·결제 오버레이가 한 URL 을 공유하게 한다.
    '/icons/app-logo-512.webp': {
      srcset: '/icons/app-logo-512.webp 512w',
      sizes: '(max-width: 360px) 78px, (max-width: 768px) 88px, 130px'
    },
    '/icons/neo.webp': {
      srcset: '/icons/neo-96.webp?v=20260511-mobile-logo-fix4 96w, /icons/neo-130.webp?v=20260511-mobile-logo-fix4 130w, /icons/neo.webp?v=20260511-mobile-logo-fix4 512w',
      sizes: '(max-width: 768px) 88px, 130px'
    },
    '/fuctionassets/flower.webp': {
      srcset: '/fuctionassets/flower-320.webp 320w, /fuctionassets/flower.webp 420w',
      sizes: '(max-width: 768px) 86vw, 420px'
    }
  };

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

    var plainImgs = document.querySelectorAll('img');
    for (var k = 0; k < plainImgs.length; k += 1) {
      applyResponsiveHintsIfPossible(plainImgs[k]);
    }

    // 모바일에서만, 최초 페인트 아래 이미지에 한정해 native lazy를 부여한다.
    if (isMobile()) {
      var allImgs = document.querySelectorAll('img:not([loading])');
      var viewportH = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0, 640);
      for (var j = 0; j < allImgs.length; j += 1) {
        var candidate = allImgs[j];
        if (!candidate || candidate.getAttribute('data-lcp-candidate') === '1') continue;
        try {
          var rect = candidate.getBoundingClientRect();
          if (rect.top > viewportH * 1.15) {
            ensureNativeLazy(candidate);
          }
        } catch (e) {}
      }
    }
  }

  function normalizePath(src) {
    if (!src) return '';
    try {
      var u = new URL(src, window.location.href);
      return u.pathname || '';
    } catch (_) {
      return src.charAt(0) === '/' ? src : '';
    }
  }

  function applyResponsiveHintsIfPossible(img) {
    if (!img || img.dataset.cdResponsiveHint === '1') return;

    var key = normalizePath(img.getAttribute('data-lazy-src') || img.getAttribute('src'));
    var hint = SRCSET_HINTS[key];
    if (hint && !img.getAttribute('srcset')) {
      img.setAttribute('srcset', hint.srcset);
      img.setAttribute('sizes', hint.sizes);
    }

    if ((img.id === 'honeypigLogo' || (img.className || '').indexOf('honeypig-logo-icon') !== -1) && !img.getAttribute('srcset')) {
      img.setAttribute('srcset', SRCSET_HINTS['/icons/app-logo-512.webp'].srcset);
      img.setAttribute('sizes', SRCSET_HINTS['/icons/app-logo-512.webp'].sizes);
    }
    if ((img.id === 'neoLogo' || (img.className || '').indexOf('neo-logo-icon') !== -1) && !img.getAttribute('srcset')) {
      img.setAttribute('srcset', SRCSET_HINTS['/icons/neo.webp'].srcset);
      img.setAttribute('sizes', SRCSET_HINTS['/icons/neo.webp'].sizes);
    }

    if (img.id === 'dfStudioImage' && !img.getAttribute('srcset')) {
      img.setAttribute('srcset', SRCSET_HINTS['/fuctionassets/flower.webp'].srcset);
      img.setAttribute('sizes', SRCSET_HINTS['/fuctionassets/flower.webp'].sizes);
    }

    img.dataset.cdResponsiveHint = '1';
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
          if (node.matches && node.matches(IMG_SELECTOR)) {
            ensureNativeLazy(node);
            applyResponsiveHintsIfPossible(node);
          }
          if (node.querySelectorAll) {
            var imgs = node.querySelectorAll(IMG_SELECTOR);
            for (var n = 0; n < imgs.length; n += 1) {
              ensureNativeLazy(imgs[n]);
              applyResponsiveHintsIfPossible(imgs[n]);
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
