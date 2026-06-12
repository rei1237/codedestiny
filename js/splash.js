(function () {
  var isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MIN_VISIBLE_MS = isMobile ? (prefersReduced ? 180 : 360) : (prefersReduced ? 450 : 1800);
  var MAX_VISIBLE_MS = isMobile ? 2500 : 5000;
  var PROFILE_READY_TIMEOUT_MS = isMobile ? 14000 : 18000;
  var STABLE_READY_TIMEOUT_MS = 4500;
  var STABLE_FRAME_GUARD_COUNT = 3;
  var MAIN_SPLASH_SESSION_KEY = '__cd_main_splash_seen';

  var splashTemplate = null;
  var splashParent = null;
  var splashStartedAt = Date.now();
  var activeSession = 0;
  var rafId = null;
  var msgTimer = null;
  var barTimer = null;
  var hideTimer = null;
  var hardHideTimer = null;
  var stars = null;
  var msgIdx = 0;
  var splashStarted = false;
  var mainSplashGateStarted = false;

  function hasMainSplashBeenSeenThisSession() {
    if (typeof sessionStorage === 'undefined') return false;
    try {
      return sessionStorage.getItem(MAIN_SPLASH_SESSION_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function setMainSplashSeenThisSession() {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(MAIN_SPLASH_SESSION_KEY, '1');
    } catch (_) {}
  }

  var msgs = [
    '운명의 결을 정돈하고 있습니다.',
    '별자리와 오늘의 흐름을 맞추는 중입니다.',
    '서비스 화면을 부드럽게 준비하고 있습니다.',
    '잠시 후 바로 이용하실 수 있습니다.',
    '달빛 카드와 주요 운세를 여는 중입니다.',
    '코드 데스티니 메인 화면으로 안내합니다.'
  ];

  msgs = [
    '프로필 별자리를 서버에서 불러오는 중입니다.',
    '오늘의 운세 흐름을 차분히 맞추고 있습니다.',
    '달빛 도서관의 첫 장을 펼치는 중입니다.',
    '저장된 운명 카드를 확인하고 있습니다.',
    '사주와 타로의 주요 실마리를 정렬하고 있습니다.',
    'Code Destiny 메인 화면으로 안내합니다.'
  ];

  function isMainServiceLoadRoute() {
    var path = (window.location && window.location.pathname ? window.location.pathname : '/').replace(/\/+$/, '');
    if (!path || path === '/' || path === '') return true;
    if (path === '/index.html') return true;
    if (/^\/(?:en|ja|zh)(?:\/|\/index\.html)?$/.test(path)) return true;
    return false;
  }

  function isHistoryRestoreNavigation() {
    try {
      if (window.performance && typeof window.performance.getEntriesByType === 'function') {
        var navs = window.performance.getEntriesByType('navigation');
        if (navs && navs.length && navs[0].type === 'back_forward') {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function waitAnimationFrames(count, callback) {
    var current = 0;
    (function tick() {
      if (current >= count) {
        callback();
        return;
      }
      current += 1;
      requestAnimationFrame(tick);
    })();
  }

  function waitForStableDomAndCss(callback) {
    var settled = false;
    var done = function () {
      if (settled) return;
      settled = true;
      callback();
    };

    var fallback = setTimeout(done, STABLE_READY_TIMEOUT_MS);

    var loadPromise = new Promise(function (resolve) {
      if (document.readyState === 'complete') {
        resolve();
        return;
      }
      window.addEventListener('load', resolve, { once: true });
    });

    var fontPromise = window.document && window.document.fonts && window.document.fonts.ready
      ? window.document.fonts.ready.catch(function () { return null; })
      : Promise.resolve();

    Promise.all([loadPromise, fontPromise]).then(function () {
      if (settled) return;
      waitAnimationFrames(STABLE_FRAME_GUARD_COUNT, done);
    }).catch(done);

    return function () {
      clearTimeout(fallback);
    };
  }

  function waitForProfileServerReady(callback) {
    var settled = false;
    var fallback = null;
    var done = function () {
      if (settled) return;
      settled = true;
      window.removeEventListener('cd:destiny-profile-server-ready', done);
      clearTimeout(fallback);
      callback();
    };
    if (window.__cdDestinyProfileServerReady === true) {
      done();
      return function () {};
    }
    window.addEventListener('cd:destiny-profile-server-ready', done);
    fallback = setTimeout(done, PROFILE_READY_TIMEOUT_MS);
    return function () {
      clearTimeout(fallback);
      window.removeEventListener('cd:destiny-profile-server-ready', done);
    };
  }

  function waitForMainSplashGate(sessionId) {
    if (mainSplashGateStarted) return;
    mainSplashGateStarted = true;
    var domReady = false;
    var profileReady = false;
    function maybeHide() {
      if (sessionId !== activeSession) return;
      if (!domReady || !profileReady) return;
      scheduleHideSplash(sessionId, MIN_VISIBLE_MS);
    }
    waitForStableDomAndCss(function () {
      domReady = true;
      maybeHide();
    });
    waitForProfileServerReady(function () {
      profileReady = true;
      maybeHide();
    });
  }

  var initSplash = document.getElementById('codeSplash');
  if (initSplash) {
    splashTemplate = initSplash.outerHTML;
    splashParent = initSplash.parentNode || document.body;
  }

  function getSplash() {
    var current = document.getElementById('codeSplash');
    if (current) return current;
    if (!splashTemplate || !splashParent) return null;

    var wrapper = document.createElement('div');
    wrapper.innerHTML = splashTemplate;
    var node = wrapper.firstElementChild;
    if (!node) return null;
    splashParent.appendChild(node);
    return node;
  }

  function getNodes() {
    var splash = getSplash();
    if (!splash) return { splash: null, msg: null, bar: null, canvas: null };
    return {
      splash: splash,
      msg: splash.querySelector('#splashMsg'),
      bar: splash.querySelector('#splashBar'),
      canvas: splash.querySelector('#splashCanvas')
    };
  }

  function stopStarLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function clearTimers() {
    clearInterval(msgTimer);
    msgTimer = null;
    clearInterval(barTimer);
    barTimer = null;
    clearTimeout(hideTimer);
    hideTimer = null;
    clearTimeout(hardHideTimer);
    hardHideTimer = null;
  }

  function startStars(canvas) {
    if (!canvas || isMobile || prefersReduced || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 56 }, function () {
      var palette = ['200,215,255', '225,235,255', '255,245,210', '220,200,255', '255,255,255'];
      var c = palette[Math.floor(Math.random() * palette.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.45 + 0.25,
        a: Math.random() * Math.PI * 2,
        spd: Math.random() * 0.013 + 0.003,
        phase: Math.random() * Math.PI * 2,
        phaseSpd: Math.random() * 0.018 + 0.004,
        base: Math.random() * 0.35 + 0.18,
        rng: Math.random() * 0.34 + 0.12,
        glow: Math.random() * 2.2 + 1.2,
        spike: Math.random() < 0.22,
        drift: Math.random() * 0.25 + 0.05,
        col: c
      };
    });

    var frame = 0;
    function drawStars() {
      frame++;
      if (frame & 1) {
        rafId = requestAnimationFrame(drawStars);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.a += s.spd;
        s.phase += s.phaseSpd;
        var alpha = s.base + Math.sin(s.a) * s.rng + Math.sin(s.phase) * 0.16;
        if (alpha < 0.04) alpha = 0.04;
        if (alpha > 0.95) alpha = 0.95;
        var dx = Math.sin((s.a + i) * 0.5) * s.drift;
        var dy = Math.cos((s.phase + i) * 0.45) * s.drift;

        ctx.globalAlpha = alpha * 0.28;
        ctx.beginPath();
        ctx.arc(s.x + dx, s.y + dy, s.r + s.glow, 0, 6.2832);
        ctx.fillStyle = 'rgb(' + s.col + ')';
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x + dx, s.y + dy, s.r, 0, 6.2832);
        ctx.fillStyle = 'rgb(' + s.col + ')';
        ctx.fill();

        if (s.spike && alpha > 0.55) {
          var spikeLen = s.r * 2.6;
          ctx.globalAlpha = alpha * 0.45;
          ctx.strokeStyle = 'rgb(' + s.col + ')';
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(s.x + dx - spikeLen, s.y + dy);
          ctx.lineTo(s.x + dx + spikeLen, s.y + dy);
          ctx.moveTo(s.x + dx, s.y + dy - spikeLen);
          ctx.lineTo(s.x + dx, s.y + dy + spikeLen);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(drawStars);
    }
    drawStars();
  }

  function hideSplash(force) {
    var nodes = getNodes();
    var splash = nodes.splash;
    var bar = nodes.bar;
    if (!splash) return;
    if (!force && !splashStarted) return;
    clearTimers();
    stopStarLoop();
    window.__cdMainSplashWaitingForProfile = false;
    if (bar) bar.style.width = '100%';
    splash.style.display = 'none';
    splash.setAttribute('aria-hidden', 'true');
    splashStarted = false;
    if (splash.parentNode) {
      splash.parentNode.removeChild(splash);
    }
  }

  function scheduleHideSplash(sessionId, minMs, maxMs) {
    clearTimeout(hideTimer);
    clearTimeout(hardHideTimer);
    hideTimer = setTimeout(function () {
      if (sessionId !== activeSession) return;
      hideSplash(true);
    }, Math.max(0, (minMs || MIN_VISIBLE_MS) - (Date.now() - splashStartedAt)));
    if (maxMs) {
      hardHideTimer = setTimeout(function () {
        if (sessionId !== activeSession) return;
        hideSplash(true);
      }, maxMs);
    }
  }

  function showSplash(message, options) {
    options = options || {};
    if (isMobile && !options.forceMobile) return false;

    var nodes = getNodes();
    var splash = nodes.splash;
    var msgEl = nodes.msg;
    var bar = nodes.bar;
    var canvas = nodes.canvas;
    if (!splash) return false;

    activeSession += 1;
    splashStartedAt = Date.now();
    splashStarted = true;
    if (options.waitForProfile === true) {
      window.__cdMainSplashWaitingForProfile = true;
    }

    clearTimers();
    stopStarLoop();

    if (canvas && !isMobile && !prefersReduced) {
      startStars(canvas);
    } else if (canvas) {
      canvas.style.display = 'none';
    }

    if (bar) {
      bar.style.width = '0%';
      if (!isMobile) {
        var barVal = 0;
        barTimer = setInterval(function () {
          barVal = Math.min(barVal + Math.random() * 18 + 5, 90);
          bar.style.width = barVal + '%';
          if (barVal >= 90) clearInterval(barTimer);
        }, 350);
      } else {
        bar.style.width = '90%';
      }
    }

    if (!isMobile && msgEl) {
      msgIdx = 0;
      if (typeof message === 'string' && message.length) {
        msgEl.textContent = message;
      }
      msgTimer = setInterval(function () {
        if (!msgEl) return;
        msgIdx = (msgIdx + 1) % msgs.length;
        msgEl.style.opacity = '0';
        msgEl.style.transition = 'opacity 0.35s';
        setTimeout(function () {
          if (!msgEl) return;
          msgEl.textContent = msgs[msgIdx];
          msgEl.style.opacity = '1';
        }, 350);
      }, 1800);
    }

    splash.style.display = 'flex';
    splash.removeAttribute('aria-hidden');
    if (options.autoHide !== false) {
      scheduleHideSplash(activeSession, options.minMs, options.maxMs);
    }
    return true;
  }

  function hideSplashNow() {
    hideSplash(true);
  }

  function showFeatureSplash(message, options) {
    return showSplash(message, options);
  }

  window.__cdServiceSplash = {
    show: showFeatureSplash,
    hide: hideSplashNow,
    isVisible: function () {
      var cur = getNodes().splash;
      return !!(cur && cur.style && cur.style.display !== 'none');
    }
  };
  window.__cdShowServiceSplash = showFeatureSplash;
  window.__cdHideServiceSplash = hideSplashNow;

  if (isMainServiceLoadRoute() && !isHistoryRestoreNavigation() && !hasMainSplashBeenSeenThisSession()) {
    var shown = showSplash(msgs[0], {
      forceMobile: true,
      autoHide: false,
      waitForProfile: true,
      minMs: MIN_VISIBLE_MS,
      maxMs: MAX_VISIBLE_MS
    });
    if (shown) {
      setMainSplashSeenThisSession();
      waitForMainSplashGate(activeSession);
    }
  } else {
    var mobileSplash = getNodes().splash;
    if (mobileSplash) {
      mobileSplash.style.display = 'none';
    }
  }

  window.addEventListener('pageshow', function () {
    if (!splashStarted) return;
    waitForMainSplashGate(activeSession);
  }, { once: true });
})();
