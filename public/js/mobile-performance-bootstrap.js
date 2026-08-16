const __perfCleanups = [];
let __imgOptimizationQueued = false;
let __textCollapseQueued = false;
let __lazyHydrationQueued = false;
let __viewportEventsBound = false;

function __addCleanup(fn) {
  if (typeof fn === 'function') __perfCleanups.push(fn);
}

function __isMobile() {
  return window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

function __isLikelyLowGpuDevice() {
  var dm = navigator.deviceMemory || 0;
  var cores = navigator.hardwareConcurrency || 0;
  var ua = (navigator.userAgent || '').toLowerCase();
  var oldAndroid = /android\s([0-9]+)/.exec(ua);
  var androidMajor = oldAndroid ? parseInt(oldAndroid[1], 10) : 999;

  if (dm && dm <= 4) return true;
  if (cores && cores <= 4) return true;
  if (/android/.test(ua) && androidMajor <= 10) return true;
  if (/wv\)|; wv/.test(ua)) return true; // Android WebView often has weaker GPU compositing stability
  return false;
}

function __supportsStableWebGL() {
  try {
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false }) || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

function __scheduleIdle(work, timeout) {
  const idle = window.requestIdleCallback || function(cb) {
    return setTimeout(function() {
      cb({ didTimeout: false, timeRemaining: function() { return 0; } });
    }, 16);
  };
  return idle(work, { timeout: timeout || 800 });
}

function __throttle(fn, wait) {
  let timer = null;
  let last = 0;
  let pendingArgs = null;

  return function throttled() {
    const now = Date.now();
    const remain = wait - (now - last);
    pendingArgs = arguments;

    if (remain <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now;
      fn.apply(this, pendingArgs);
      pendingArgs = null;
      return;
    }

    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        last = Date.now();
        if (pendingArgs) {
          fn.apply(this, pendingArgs);
          pendingArgs = null;
        }
      }, remain);
    }
  };
}

function __debounce(fn, wait) {
  let timer = null;
  // 화살표 함수가 debounced 의 this 를 렉시컬로 잡으므로 별도 alias 가 필요 없다
  // (no-this-alias). 호출 시점의 수신자·인자는 그대로 유지된다.
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function __getPerfTuningProfile() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const et = (conn && conn.effectiveType) ? String(conn.effectiveType).toLowerCase() : '';
  const saveData = !!(conn && conn.saveData);
  const lowEnd = __isLikelyLowGpuDevice();

  const profile = {
    preHydrateViewportMultiplier: 1.15,
    noSkeletonViewportMultiplier: 1.4,
    scrollThrottleMs: 220,
    resizeDebounceMs: 240,
    imageChunkSize: 28,
    imgIdleTimeoutMs: 900,
    textIdleTimeoutMs: 3200,
    sectionIdleTimeoutMs: 3600,
    viewportRefreshIdleMs: 900,
    viewportResizeIdleMs: 1000
  };

  if (saveData || et === 'slow-2g' || et === '2g' || lowEnd) {
    profile.preHydrateViewportMultiplier = 0.95;
    profile.noSkeletonViewportMultiplier = 1.15;
    profile.scrollThrottleMs = 320;
    profile.resizeDebounceMs = 320;
    profile.imageChunkSize = 18;
    profile.textIdleTimeoutMs = 3600;
    profile.sectionIdleTimeoutMs = 4200;
    profile.viewportRefreshIdleMs = 1200;
    profile.viewportResizeIdleMs = 1300;
    return profile;
  }

  if (et === '4g' && !lowEnd) {
    profile.preHydrateViewportMultiplier = 1.55;
    profile.noSkeletonViewportMultiplier = 1.75;
    profile.scrollThrottleMs = 150;
    profile.resizeDebounceMs = 190;
    profile.imageChunkSize = 36;
    profile.textIdleTimeoutMs = 3000;
    profile.sectionIdleTimeoutMs = 3300;
    profile.viewportRefreshIdleMs = 700;
    profile.viewportResizeIdleMs = 800;
  }

  return profile;
}

function __runChunked(list, worker, chunkSize) {
  const arr = Array.from(list || []);
  const size = chunkSize || 24;
  let idx = 0;

  function step() {
    const end = Math.min(idx + size, arr.length);
    for (; idx < end; idx++) {
      try { worker(arr[idx], idx); } catch (e) { console.error('[mobile-bootstrap] chunk worker failed', e); }
    }
    if (idx < arr.length) {
      setTimeout(step, 0);
    }
  }

  step();
}

function __loadScriptOnce(src) {
  if (!src) return Promise.reject(new Error('missing src'));
  const normSrcRaw = src.replace(/^\.\//, '');
  const normSrc =
    /^(?:[a-z]+:)?\/\//i.test(normSrcRaw) || normSrcRaw.startsWith('data:') || normSrcRaw.startsWith('blob:')
      ? normSrcRaw
      : normSrcRaw.startsWith('/')
        ? normSrcRaw
        : '/' + normSrcRaw;

  // If script is already in DOM (static or dynamic), reuse it.
  const allScripts = Array.from(document.querySelectorAll('script[src]'));
  const existingBySrc = allScripts.find((s) => {
    try {
      const cur = (s.getAttribute('src') || '').replace(/^\.\//, '');
      return cur === normSrc || cur.endsWith('/' + normSrc);
    } catch (e) {
      return false;
    }
  });
  if (existingBySrc) {
    if (existingBySrc.dataset.loaded === '1' || existingBySrc.readyState === 'complete') {
      return Promise.resolve();
    }
    if (existingBySrc.dataset.loading !== '1' && !existingBySrc.dataset.dynSrc) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      existingBySrc.addEventListener('load', () => resolve(), { once: true });
      existingBySrc.addEventListener('error', () => reject(new Error('load failed: ' + src)), { once: true });
    });
  }

  const existing = document.querySelector('script[data-dyn-src="' + src + '"]');
  if (existing && existing.dataset.loaded === '1') return Promise.resolve();
  if (existing && existing.dataset.loading === '1') {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('load failed: ' + src)), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = normSrc;
    s.defer = true;
    s.async = true;
    s.dataset.dynSrc = normSrc;
    s.dataset.loading = '1';
    s.onload = () => {
      s.dataset.loading = '0';
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = () => {
      s.dataset.loading = '0';
      s.dataset.loaded = '0';
      s.remove();
      reject(new Error('load failed: ' + src));
    };
    document.head.appendChild(s);
  });
}

function __applyResponsiveSrcsetHints(img) {
  if (!img || img.dataset.responsiveHintReady === '1') return;

  var srcsetHints = {
    // 🔴 srcset 을 일부러 두지 않는다. 예전에는 96w/130w/512w 세 후보가 **전부 같은 512px 파일**을
    //    가리켰고(고를 것이 없는 degenerate srcset), 게다가 `?v=20260511-mobile-logo-fix4` 라는
    //    별도 캐시 키를 써서 셸의 맨 URL(`/icons/app-logo-512.webp`, head 에서 preload 로 데워 둔
    //    바로 그 URL)과 **다른 자산으로 취급됐다**. 그래서 히어로 로고가 두 번 내려받아졌다
    //    (프로덕션 Lighthouse 가 #honeypigLogo 를 30.5 KiB × 2 로 보고).
    //    index.html 쪽 degenerate srcset 은 커밋 5c7abb303 이 같은 이유로 이미 걷어냈는데
    //    이 사본이 남아 있었다. width/height 는 CLS 방지에 쓰이므로 그대로 둔다.
    '/icons/app-logo-512.webp': {
      width: 130,
      height: 130
    },
    '/icons/neo.webp': {
      srcset: '/icons/neo-96.webp?v=20260511-mobile-logo-fix4 96w, /icons/neo-130.webp?v=20260511-mobile-logo-fix4 130w, /icons/neo.webp?v=20260511-mobile-logo-fix4 512w',
      sizes: '(max-width: 768px) 88px, 130px',
      width: 130,
      height: 130
    },
    '/fuctionassets/flower.webp': {
      srcset: '/fuctionassets/flower-320.webp 320w, /fuctionassets/flower.webp 420w',
      sizes: '(max-width: 768px) 86vw, 420px',
      width: 420,
      height: 315
    }
  };

  function normalizePath(raw) {
    if (!raw) return '';
    try {
      var parsed = new URL(raw, window.location.href);
      return parsed.pathname || '';
    } catch (e) {
      return raw.charAt(0) === '/' ? raw : '';
    }
  }

  var cls = img.className || '';
  var id = img.id || '';
  var srcPath = normalizePath(img.getAttribute('data-lazy-src') || img.getAttribute('src'));
  var byPath = srcsetHints[srcPath];

  if (byPath && byPath.srcset && !img.getAttribute('srcset')) {
    img.setAttribute('srcset', byPath.srcset);
    img.setAttribute('sizes', byPath.sizes);
  }

  // 로고는 srcset 없이 width/height 힌트만 받는다(위 주석 참고 — 두 번 받던 원인이었다).
  if (cls.indexOf('honeypig-logo-icon') !== -1 || id === 'honeypigLogo') {
    byPath = srcsetHints['/icons/app-logo-512.webp'];
  }

  if ((cls.indexOf('neo-logo-icon') !== -1 || id === 'neoLogo') && !img.getAttribute('srcset')) {
    img.setAttribute('srcset', srcsetHints['/icons/neo.webp'].srcset);
    img.setAttribute('sizes', srcsetHints['/icons/neo.webp'].sizes);
    byPath = srcsetHints['/icons/neo.webp'];
  }

  if (id === 'dfStudioImage' && !img.getAttribute('srcset')) {
    img.setAttribute('srcset', srcsetHints['/fuctionassets/flower.webp'].srcset);
    img.setAttribute('sizes', srcsetHints['/fuctionassets/flower.webp'].sizes);
    byPath = srcsetHints['/fuctionassets/flower.webp'];
  }

  if (byPath && (!img.getAttribute('width') || !img.getAttribute('height'))) {
    img.setAttribute('width', String(byPath.width));
    img.setAttribute('height', String(byPath.height));
    if (!img.style.aspectRatio) {
      img.style.aspectRatio = byPath.width + ' / ' + byPath.height;
    }
  }

  img.dataset.responsiveHintReady = '1';
}

function __isVisibleElement(el) {
  if (!el) return false;
  try {
    var cs = window.getComputedStyle(el);
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  } catch (e) {
    return false;
  }
}

function __applyThemeAwareLcpPriority() {
  var pig = document.querySelector('img.honeypig-logo-icon');
  var neo = document.querySelector('img.neo-logo-icon');
  if (!pig && !neo) return;

  var isMobileLcp = window.matchMedia('(max-width: 768px)').matches;
  var target = null;

  if (isMobileLcp) {
    target = __isVisibleElement(neo) ? neo : (__isVisibleElement(pig) ? pig : (neo || pig));
  } else {
    target = __isVisibleElement(pig) ? pig : (__isVisibleElement(neo) ? neo : (pig || neo));
  }

  [pig, neo].forEach(function(img) {
    if (!img) return;
    __applyResponsiveSrcsetHints(img);
    if (img === target) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('fetchpriority', 'high');
    } else {
      if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
      img.setAttribute('fetchpriority', 'low');
    }
    if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
  });
}

function setupImageOptimization() {
  if (window.__CD_IO_LAZY_ACTIVE__ === true) return;

  const imgs = document.querySelectorAll('img:not([data-mobile-opt-ready="1"])');
  if (!imgs.length) return;

  const viewportH = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0, 640);
  let highAssigned = 0;

  function isLikelyHeroImage(img) {
    if (!img) return false;
    try {
      const rect = img.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return false;

      const area = rect.width * rect.height;
      const inOrNearFirstViewport = rect.top < (viewportH * 1.1) && rect.bottom > -20;
      const meaningfulSize = area >= 160 * 120;
      return inOrNearFirstViewport && meaningfulSize;
    } catch (e) {
      return false;
    }
  }

  function isFarBelowFold(img) {
    if (!img) return false;
    try {
      const rect = img.getBoundingClientRect();
      return rect.top > (viewportH * 1.8);
    } catch (e) {
      return false;
    }
  }

  const styleId = 'mobileImgOptStyle';
  if (!document.getElementById(styleId)) {
    const st = document.createElement('style');
    st.id = styleId;
    st.textContent = '' +
      '.img-ph{background:linear-gradient(110deg,#f0f2f5 8%,#e7ebef 18%,#f0f2f5 33%);background-size:200% 100%;animation:imgPhShimmer 1.25s linear infinite;}' +
      'body.neo-mode .img-ph{background:linear-gradient(110deg,#1e2229 8%,#282e38 18%,#1e2229 33%);background-size:200% 100%;}' +
      '@keyframes imgPhShimmer{to{background-position-x:-200%;}}';
    document.head.appendChild(st);
  }

  const tuning = __getPerfTuningProfile();

  __runChunked(imgs, (img, idx) => {
    img.dataset.mobileOptReady = '1';
    __applyResponsiveSrcsetHints(img);
    const likelyHero = isLikelyHeroImage(img);
    if (!img.getAttribute('loading')) img.setAttribute('loading', likelyHero ? 'eager' : 'lazy');
    if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.getAttribute('fetchpriority')) {
      if (likelyHero && highAssigned < 1) {
        img.setAttribute('fetchpriority', 'high');
        highAssigned += 1;
      } else if (isFarBelowFold(img)) {
        img.setAttribute('fetchpriority', 'low');
      }
    }
    if (!img.classList.contains('img-ph') && !img.complete) img.classList.add('img-ph');
    img.addEventListener('load', () => img.classList.remove('img-ph'), { passive: true, once: true });
    img.addEventListener('error', () => img.classList.remove('img-ph'), { passive: true, once: true });
  }, tuning.imageChunkSize);
}

function setupGpuSafety() {
  if (!__isMobile()) return;

  /* 클래스·스타일은 index.html 본문 최상단 인라인 스크립트에서 선적용(첫 페인트·CLS 완화). 여기서는 동일 로직으로 보정·메타만 설정. */
  document.documentElement.classList.add('mobile-safe-render');

  var lowGpu = __isLikelyLowGpuDevice();
  var noWebGL = !__supportsStableWebGL();
  var forceLite = lowGpu || noWebGL || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (forceLite) {
    document.documentElement.classList.add('mobile-gpu-lite');
  }

  window.__gpuSafeInfo = {
    forceLite: forceLite,
    lowGpu: lowGpu,
    noWebGL: noWebGL,
    deviceMemory: navigator.deviceMemory || null,
    cores: navigator.hardwareConcurrency || null
  };

  const styleId = 'mobileSafeRenderStyle';
  if (!document.getElementById(styleId)) {
    const st = document.createElement('style');
    st.id = styleId;
    st.textContent = '' +
      '.mobile-safe-render .saju-book,.mobile-safe-render .saju-vortex,.mobile-safe-render .orb,.mobile-safe-render .feature-card,.mobile-safe-render .dw-item,.mobile-safe-render .ts-card,.mobile-safe-render .tarot-card,.mobile-safe-render .oracle-card-m{will-change:auto !important;}' +
      '.mobile-safe-render .feature-card:hover .feature-card__img{transform:none !important;}' +
      '.mobile-safe-render .tarot-focus-overlay,.mobile-safe-render .astral-modal-overlay{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}' +
      '.mobile-safe-render .tarot-healing-overlay,.mobile-safe-render .tarot-year-overlay{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}' +
      '.mobile-gpu-lite .card,.mobile-gpu-lite .theme-switch-wrapper,.mobile-gpu-lite .astral-ritual-bar,.mobile-gpu-lite .dp-sheet,.mobile-gpu-lite .dp-toast,.mobile-gpu-lite .result-box{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}' +
      '.mobile-gpu-lite .smoke-layer,.mobile-gpu-lite .flickering-lamp,.mobile-gpu-lite .saju-vortex,.mobile-gpu-lite .saju-vortex::before,.mobile-gpu-lite .saju-vortex::after{animation:none !important;filter:none !important;}' +
      '.mobile-gpu-lite .totem-card,.mobile-gpu-lite .feature-card,.mobile-gpu-lite .result-box,.mobile-gpu-lite .dp-sheet{box-shadow:0 2px 10px rgba(0,0,0,0.28) !important;}' +
      '.mobile-gpu-lite .orb,.mobile-gpu-lite .ritual-particle,.mobile-gpu-lite .q-back-element-emoji,.mobile-gpu-lite .cs-class-icon{display:none !important;}';
    document.head.appendChild(st);
  }
}

function setupTextCollapse() {
  const targets = document.querySelectorAll('.prem-text,.feature-card__detail-text,.res-text,.q-explanation,.compat-fact-body,.compat-advice-body');
  __runChunked(targets, (el) => {
    if (!el || el.dataset.collapsedReady === '1') return;
    const txt = (el.textContent || '').trim();
    if (txt.length < 240) return;

    el.dataset.collapsedReady = '1';
    el.style.maxHeight = '6.2em';
    el.style.overflow = 'hidden';
    el.style.position = 'relative';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-sub';
    btn.style.marginTop = '8px';
    btn.style.padding = '8px 12px';
    btn.style.fontSize = '0.82rem';
    btn.textContent = 'More';

    let open = false;
    btn.addEventListener('click', () => {
      open = !open;
      el.style.maxHeight = open ? 'none' : '6.2em';
      btn.textContent = open ? 'Less' : 'More';
    }, { passive: true });

    el.insertAdjacentElement('afterend', btn);
  }, 20);
}

function __canWarmupHeavyFeature() {
  try {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const et = (conn && conn.effectiveType) ? String(conn.effectiveType).toLowerCase() : '';
    if (conn && conn.saveData) return false;
    if (et === 'slow-2g' || et === '2g') return false;
    if (__isLikelyLowGpuDevice()) return false;
  } catch (e) {
    return false;
  }
  return true;
}

function __queuePostPaintOptimizations() {
  if (!__isMobile()) return;

  const tuning = __getPerfTuningProfile();

  // Prioritize image hints first; defer heavier DOM mutations to protect LCP.
  setupImageOptimization();

  if (!__imgOptimizationQueued) {
    __imgOptimizationQueued = true;
    __scheduleIdle(() => {
      setupImageOptimization();
      __imgOptimizationQueued = false;
    }, tuning.imgIdleTimeoutMs);
  }

  if (!__textCollapseQueued) {
    __textCollapseQueued = true;
    __scheduleIdle(() => {
      setupTextCollapse();
      __textCollapseQueued = false;
    }, tuning.textIdleTimeoutMs);
  }

  if (__isMobile() && !__lazyHydrationQueued) {
    __lazyHydrationQueued = true;
    __scheduleIdle(() => {
      setupLazySectionHydration();
      __lazyHydrationQueued = false;
    }, tuning.sectionIdleTimeoutMs);
  }

}

function setupViewportEventOptimizations() {
  if (window.__CD_IO_LAZY_ACTIVE__ === true) return;
  if (__viewportEventsBound) return;
  __viewportEventsBound = true;

  const tuning = __getPerfTuningProfile();

  const onScroll = __throttle(() => {
    __scheduleIdle(() => {
      setupImageOptimization();
    }, tuning.viewportRefreshIdleMs);
  }, tuning.scrollThrottleMs);

  const onResize = __debounce(() => {
    __scheduleIdle(() => {
      setupImageOptimization();
    }, tuning.viewportResizeIdleMs);
  }, tuning.resizeDebounceMs);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  __addCleanup(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    __viewportEventsBound = false;
  });
}

function setupLazySectionHydration() {
  const heavyIds = [
    'compatCard',
    'energyCoordCard',
    // Keep health/teto/hormone cards always hydrated to prevent white-gap regressions.
    // lottoCard has runtime-bound button handlers; keep DOM stable to preserve interactions.
    'egyptCard',
    'shareSection',
    'emailSubBox'
  ];

  const cache = new Map();
  let io = null;

  function makeSkeleton(host) {
    const sk = document.createElement('div');
    sk.className = 'mobile-lazy-skeleton';
    sk.innerHTML = '<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>';
    host.innerHTML = '';
    host.appendChild(sk);
  }

  function sectionHost(section) {
    if (!section) return null;
    const host = section.querySelector(':scope > div[id], :scope > #compatResult, :scope > #skillTreeSection, :scope > #energyCoordSection, :scope > #healthReportSection, :scope > #lottoSection, :scope > #egyptSection, :scope > #hormoneVibeResult, :scope > #tTestResult');
    return host || null;
  }

  function prime(section) {
    if (!section || section.dataset.lazyPrimed === '1') return;
    const host = sectionHost(section);
    if (!host) return;

    const html = host.innerHTML;
    if (!html || html.trim().length < 80) return;

    cache.set(section.id, html);
    makeSkeleton(host);
    section.dataset.lazyPrimed = '1';
  }

  function hydrate(section) {
    if (!section) return;
    const html = cache.get(section.id);
    if (!html) return;

    const host = sectionHost(section);
    if (!host) return;

    host.innerHTML = html;
    cache.delete(section.id);
    section.dataset.lazyHydrated = '1';
  }

  if (!('IntersectionObserver' in window)) {
    heavyIds.forEach((id) => {
      const section = document.getElementById(id);
      if (!section) return;
      if (getComputedStyle(section).display !== 'none') {
        prime(section);
        hydrate(section);
      }
    });
    return;
  }

  io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const section = entry.target;
      if (section.dataset.lazyPrimed === '1' && section.dataset.lazyHydrated !== '1') {
        hydrate(section);
      }
    });
  }, { root: null, rootMargin: '280px 0px', threshold: 0.01 });

  heavyIds.forEach((id) => {
    const section = document.getElementById(id);
    if (!section) return;
    io.observe(section);

    if (getComputedStyle(section).display !== 'none') {
      prime(section);
    }
  });

  const resultPage = document.getElementById('resultPage');
  if (resultPage) {
    let syncTimer = null;
    const mo = new MutationObserver(() => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        heavyIds.forEach((id) => {
          const section = document.getElementById(id);
          if (!section) return;
          if (section.dataset.lazyPrimed === '1' || section.dataset.lazyHydrated === '1') return;
          if (getComputedStyle(section).display === 'none') return;
          prime(section);
        });
        __scheduleIdle(() => {
          setupTextCollapse();
          setupImageOptimization();
        }, 1200);
      }, 90);
    });
    mo.observe(resultPage, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
    __addCleanup(() => {
      clearTimeout(syncTimer);
      mo.disconnect();
    });
  }

  __addCleanup(() => {
    if (io) io.disconnect();
    io = null;
    cache.clear();
  });
}

function setupFeatureCodeSplit() {
  const loaders = {
    physiognomy: () => __loadScriptOnce('AnalysisEngine.js?v=hf747a853acdb').then(() => __loadScriptOnce('PhysiognomyUI.js?v=h97518fb47ef8')),
    pastLifeFace: () => __loadScriptOnce('AnalysisEngine.js?v=hf747a853acdb').then(() => __loadScriptOnce('PastLifeFaceUI.js?v=hc1c3840957e8')),
    mbti: () => __loadScriptOnce('js/astral-soul.js'),
    hwatu: () => __loadScriptOnce('HwatuFortune.js?v=h9ee7eacf3957')
  };

  const state = { physiognomy: null, pastLifeFace: null, mbti: null, hwatu: null };

  function ensure(key) {
    if (!loaders[key]) return Promise.resolve();
    if (!state[key]) {
      state[key] = loaders[key]().catch((error) => {
        state[key] = null;
        throw error;
      });
    }
    return state[key];
  }

  window.openPhysiognomyApp = async function openPhysiognomyAppProxy() {
    try { await ensure('physiognomy'); } catch (e) { console.error('[mobile-bootstrap] physiognomy load failed', e); }
    if (typeof window.openPhysiognomyApp === 'function' && window.openPhysiognomyApp !== openPhysiognomyAppProxy) {
      return window.openPhysiognomyApp.apply(window, arguments);
    }
    return null;
  };

  // 전생 관상은 관상과 별개 모듈이다. 관상처럼 idle 프리워밍에는 넣지 않는다 —
  // 초기 로딩 비용을 늘리지 않도록 클릭 시점에만 받는다.
  //
  // 관상 결과 화면의 유도 배너가 PastLifeFaceUI.js 를 먼저 로드했을 수 있다. 그 경우
  // 프록시를 덮어씌우면 실제 구현이 사라지고 프록시가 자기 자신만 보게 되어 기능이 죽는다.
  if (typeof window.openPastLifeFaceApp !== 'function') {
    window.openPastLifeFaceApp = async function openPastLifeFaceAppProxy() {
      try { await ensure('pastLifeFace'); } catch (e) { console.error('[mobile-bootstrap] past-life face load failed', e); }
      if (typeof window.openPastLifeFaceApp === 'function' && window.openPastLifeFaceApp !== openPastLifeFaceAppProxy) {
        return window.openPastLifeFaceApp.apply(window, arguments);
      }
      return null;
    };
  }

  window.openMbtiModal = async function openMbtiModalProxy() {
    try { await ensure('mbti'); } catch (e) { console.error('[mobile-bootstrap] mbti load failed', e); }
    if (typeof window.openMbtiModal === 'function' && window.openMbtiModal !== openMbtiModalProxy) {
      return window.openMbtiModal.apply(window, arguments);
    }
    return null;
  };

  window.openHwatuModal = async function openHwatuModalProxy() {
    try { await ensure('hwatu'); } catch (e) { console.error('[mobile-bootstrap] hwatu load failed', e); }
    if (typeof window.openHwatuModal === 'function' && window.openHwatuModal !== openHwatuModalProxy) {
      return window.openHwatuModal.apply(window, arguments);
    }
    return null;
  };

  __scheduleIdle(() => {
    if (!__canWarmupHeavyFeature()) return;
    ensure('physiognomy').catch(() => {});
  }, 4500);
}

function setupCoreCodeSplitHooks() {
  const wrap = (name, handler) => {
    const fn = window[name];
    if (typeof fn !== 'function' || fn.__mobileWrapped) return;
    const wrapped = handler(fn);
    wrapped.__mobileWrapped = true;
    window[name] = wrapped;
  };

  wrap('calculate', (original) => async function mobileWrappedCalculate() {
    let sajuChunk = null;
    try {
      sajuChunk = await import('./chunks/saju-analysis.chunk.js');
      if (sajuChunk && typeof sajuChunk.beforeCoreCalculate === 'function') {
        sajuChunk.beforeCoreCalculate();
      }
    } catch (e) {
      console.error('[mobile-bootstrap] saju-analysis chunk load failed', e);
    }
    try {
      const out = await original.apply(this, arguments);
      try {
        const extraChunk = await import('./chunks/extra-fortune.chunk.js');
        if (extraChunk && typeof extraChunk.bindExtraFortuneLazy === 'function') {
          extraChunk.bindExtraFortuneLazy();
        }
      } catch (e) {
        console.error('[mobile-bootstrap] extra-fortune chunk load failed', e);
      }
      return out;
    } finally {
      if (sajuChunk && typeof sajuChunk.afterCoreCalculate === 'function') {
        sajuChunk.afterCoreCalculate();
      }
      setupLazySectionHydration();
      __queuePostPaintOptimizations();
    }
  });

  wrap('runCompat', (original) => async function mobileWrappedRunCompat() {
    let compatChunk = null;
    try {
      compatChunk = await import('./chunks/compat.chunk.js');
      if (compatChunk && typeof compatChunk.beforeCompatRender === 'function') {
        compatChunk.beforeCompatRender();
      }
    } catch (e) {
      console.error('[mobile-bootstrap] compat chunk load failed', e);
    }
    const out = await original.apply(this, arguments);
    if (compatChunk && typeof compatChunk.afterCompatRender === 'function') {
      compatChunk.afterCompatRender();
    }
    return out;
  });
}

function init() {
  setupFeatureCodeSplit();
  __applyThemeAwareLcpPriority();

  if (!__isMobile()) {
    return;
  }

  setupGpuSafety();
  setupCoreCodeSplitHooks();
  setupViewportEventOptimizations();
  __queuePostPaintOptimizations();

  window.addEventListener('pagehide', () => {
    __perfCleanups.splice(0).forEach((fn) => {
      try { fn(); } catch (e) {}
    });
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
