(function () {
  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isLikelyLowGpu() {
    var dm = navigator.deviceMemory || 0;
    var cores = navigator.hardwareConcurrency || 0;
    var ua = (navigator.userAgent || '').toLowerCase();
    var oldAndroid = /android\s([0-9]+)/.exec(ua);
    var androidMajor = oldAndroid ? parseInt(oldAndroid[1], 10) : 999;
    if (dm && dm <= 4) return true;
    if (cores && cores <= 4) return true;
    if (/android/.test(ua) && androidMajor <= 10) return true;
    if (/wv\)|; wv/.test(ua)) return true;
    return false;
  }

  function supportsStableWebGL() {
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl', { antialias: false, alpha: false }) || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  if (!isMobile()) return;

  var root = document.documentElement;
  root.classList.add('mobile-safe-render');

  var forceLite = isLikelyLowGpu() || !supportsStableWebGL() || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (forceLite) root.classList.add('mobile-gpu-lite');

  if (document.getElementById('mobileSafeRenderStyle')) return;

  var st = document.createElement('style');
  st.id = 'mobileSafeRenderStyle';
  st.textContent = ''
    + '.mobile-safe-render .saju-book,.mobile-safe-render .saju-vortex,.mobile-safe-render .orb,.mobile-safe-render .feature-card,.mobile-safe-render .dw-item,.mobile-safe-render .ts-card,.mobile-safe-render .tarot-card,.mobile-safe-render .oracle-card-m{will-change:auto !important;}'
    + '.mobile-safe-render .feature-card:hover .feature-card__img{transform:none !important;}'
    + '.mobile-safe-render .tarot-focus-overlay,.mobile-safe-render .astral-modal-overlay{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}'
    + '.mobile-safe-render .tarot-healing-overlay,.mobile-safe-render .tarot-year-overlay{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}'
    + '.mobile-gpu-lite .card,.mobile-gpu-lite .theme-switch-wrapper,.mobile-gpu-lite .astral-ritual-bar,.mobile-gpu-lite .dp-sheet,.mobile-gpu-lite .dp-toast,.mobile-gpu-lite .result-box{backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}'
    + '.mobile-gpu-lite .smoke-layer,.mobile-gpu-lite .flickering-lamp,.mobile-gpu-lite .saju-vortex,.mobile-gpu-lite .saju-vortex::before,.mobile-gpu-lite .saju-vortex::after{animation:none !important;filter:none !important;}'
    + '.mobile-gpu-lite .totem-card,.mobile-gpu-lite .feature-card,.mobile-gpu-lite .result-box,.mobile-gpu-lite .dp-sheet{box-shadow:0 2px 10px rgba(0,0,0,0.28) !important;}'
    + '.mobile-gpu-lite .orb,.mobile-gpu-lite .ritual-particle,.mobile-gpu-lite .q-back-element-emoji,.mobile-gpu-lite .cs-class-icon{display:none !important;}';

  document.head.appendChild(st);
})();
