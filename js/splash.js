(function () {
  var isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MIN_VISIBLE_MS = isMobile ? (prefersReduced ? 180 : 360) : (prefersReduced ? 450 : 1800);
  var MAX_VISIBLE_MS = isMobile ? 2500 : 5000;

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

  var msgs = [
    '운명의 정렬을 계산 중입니다.',
    '별자리가 지금의 길을 정돈하고 있습니다.',
    '신호가 열릴 때까지 잠시만 기다려 주세요.',
    '기능 로딩을 준비하고 있습니다.',
    '부드러운 전환으로 다음 화면으로 이동합니다.',
    '서비스 화면 진입 중입니다. 잠시만요...'
  ];

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
    if (bar) bar.style.width = '100%';
    splash.style.display = 'none';
    splash.setAttribute('aria-hidden', 'true');
    splashStarted = false;
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
    scheduleHideSplash(activeSession, options.minMs, options.maxMs);
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

  if (isMobile) {
    var mobileSplash = getNodes().splash;
    if (mobileSplash) {
      mobileSplash.style.display = 'none';
    }
  } else {
    showSplash(msgs[0], { minMs: MIN_VISIBLE_MS, maxMs: MAX_VISIBLE_MS });

    if (document.readyState === 'complete') {
      scheduleHideSplash(activeSession, MIN_VISIBLE_MS, MAX_VISIBLE_MS);
    } else {
      window.addEventListener('load', function () {
        scheduleHideSplash(activeSession, MIN_VISIBLE_MS, MAX_VISIBLE_MS);
      }, { once: true });
    }
  }

  window.addEventListener('pageshow', function () {
    if (!isMobile) scheduleHideSplash(activeSession, MIN_VISIBLE_MS, MAX_VISIBLE_MS);
  }, { once: true });
})();

