(function () {
  var DREAM_ARCHIVE_KEY = 'dreamLedgerArchiveV1';
  var GOLDEN_TONE_LABELS = {
    comfort: '?„ë¡œ',
    motivation: '?™ê¸°ë¶€??,
    coaching: 'ì½”ì¹­'
  };
  var DREAM_LIBRARY_PAGE_SIZE = 18;
  var DREAM_LIBRARY_CATEGORY_LABELS = {
    all: '?„ì²´',
    animal: '?™ë¬¼ ê´€??,
    fruit: 'ê³¼ì¼ ê´€??,
    people: '?¬ëŒ ê´€??,
    emotion_positive: 'ê°ì •(ê¸ì •)',
    emotion_anger: 'ê°ì •(ë¶„ë…¸)',
    emotion_anxiety: 'ê°ì •(ë¶ˆì•ˆ)',
    emotion_loss: 'ê°ì •(?ì‹¤)',
    emotion_recovery: 'ê°ì •(?Œë³µ)',
    place: '?¥ì†Œ ?¤ì›Œ??,
    object: '?¬ë¬¼ ?¤ì›Œ??,
    taemong: '?œëª½',
    wealth: '?¬ë¬¼??,
    success: '?©ê²©??,
    love: '?°ì• ??,
    marriage: 'ê²°í˜¼??
  };
  var state = {
    reading: null,
    stageDone: { 1: false, 2: false, 3: false, 4: false },
    nextStage: 1,
    visibleStage: 1,
    autoReveal: true,
    autoRevealTimer: null,
    textSpeed: 1,
    goldenTone: 'comfort',
    typingTimer: null,
    typingStage: 0,
    typingContext: null,
    uiLocked: false,
    goldenTimer: null,
    audioCtx: null,
    goldenAudioBus: null,
    libraryCategory: 'all',
    libraryQuery: '',
    libraryLimit: DREAM_LIBRARY_PAGE_SIZE,
    librarySuggestions: [],
    librarySuggestIndex: -1,
    outcomeSignals: {}
  };

  var bodyLockState = {
    locked: false,
    overflow: '',
    position: '',
    top: '',
    width: '',
    htmlOverflow: ''
  };

  var DREAM_TAROT_API_TIMEOUT_MS = 22000;
  var dreamAiLoadPromise = null;

  function $(id) {
    return document.getElementById(id);
  }

  function clearGoldenTimer() {
    if (!state.goldenTimer) return;
    clearTimeout(state.goldenTimer);
    state.goldenTimer = null;
  }

  function clearAutoRevealTimer() {
    if (!state.autoRevealTimer) return;
    clearTimeout(state.autoRevealTimer);
    state.autoRevealTimer = null;
  }

  function isMobileLikeDevice() {
    var ua = (navigator.userAgent || '').toLowerCase();
    if (/android|iphone|ipad|ipod|mobile/.test(ua)) return true;
    if ((navigator.maxTouchPoints || 0) >= 2) return true;
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }

  function triggerMobileHaptic(pattern) {
    if (!isMobileLikeDevice()) return;
    if (!navigator.vibrate) return;
    try {
      navigator.vibrate(pattern || [20, 40, 28, 36, 86]);
    } catch (_) {}
  }

  function ensureAudioContext() {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!state.audioCtx) {
      try {
        state.audioCtx = new AudioCtx();
      } catch (_) {
        return null;
      }
    }

    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume().catch(function () {});
    }

    return state.audioCtx;
  }

  function buildReverbImpulse(ctx, seconds, decay) {
    var duration = Math.max(0.7, Number(seconds) || 1.6);
    var curve = Math.max(1.4, Number(decay) || 2.2);
    var length = Math.floor(ctx.sampleRate * duration);
    var impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch += 1) {
      var data = impulse.getChannelData(ch);
      for (var i = 0; i < length; i += 1) {
        var amp = Math.pow(1 - i / length, curve);
        data[i] = (Math.random() * 2 - 1) * amp;
      }
    }
    return impulse;
  }

  function ensureGoldenAudioBus(ctx) {
    if (state.goldenAudioBus && state.goldenAudioBus.ctx === ctx) {
      return state.goldenAudioBus;
    }

    var input = ctx.createGain();
    var dry = ctx.createGain();
    var convolver = ctx.createConvolver();
    var wet = ctx.createGain();
    var limiter = ctx.createDynamicsCompressor();

    input.gain.value = 0.82;
    dry.gain.value = 0.78;
    wet.gain.value = 0.34;
    convolver.buffer = buildReverbImpulse(ctx, 1.9, 2.4);
    limiter.threshold.value = -18;
    limiter.knee.value = 16;
    limiter.ratio.value = 10;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.24;

    input.connect(dry);
    input.connect(convolver);
    convolver.connect(wet);
    dry.connect(limiter);
    wet.connect(limiter);
    limiter.connect(ctx.destination);

    state.goldenAudioBus = {
      ctx: ctx,
      input: input
    };
    return state.goldenAudioBus;
  }

  function scheduleImpactOscillator(ctx, target, config) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var start = config.start;
    var attack = Math.max(0.001, config.attack || 0.02);
    var peak = Math.max(0.001, config.peak || 0.12);
    var release = Math.max(0.06, config.release || 0.26);

    osc.type = config.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(40, config.hz || 220), start);
    if (config.slideTo && config.slideTo > 0) {
      osc.frequency.exponentialRampToValueAtTime(config.slideTo, start + release);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + release);

    osc.connect(gain);
    gain.connect(target);
    osc.start(start);
    osc.stop(start + release + 0.02);
  }

  function playGoldenImpactShimmer(ctx, target, start) {
    var duration = 0.52;
    var size = Math.floor(ctx.sampleRate * duration);
    var noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < size; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / size, 1.8);
    }

    var source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    var band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(2800, start);
    band.Q.value = 0.9;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(band);
    band.connect(gain);
    gain.connect(target);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function playGoldenImpactChime() {
    var ctx = ensureAudioContext();
    if (!ctx) return;

    var now = ctx.currentTime;
    var bus = ensureGoldenAudioBus(ctx);
    var destination = bus.input;

    scheduleImpactOscillator(ctx, destination, {
      type: 'triangle',
      hz: 110,
      slideTo: 72,
      start: now,
      attack: 0.014,
      peak: 0.24,
      release: 0.25
    });

    var bells = [622, 932, 1244, 1568];
    bells.forEach(function (hz, idx) {
      scheduleImpactOscillator(ctx, destination, {
        type: idx % 2 === 0 ? 'sine' : 'triangle',
        hz: hz,
        start: now + 0.05 + idx * 0.055,
        attack: 0.018,
        peak: 0.12 - idx * 0.015,
        release: 0.34 + idx * 0.06
      });
    });

    scheduleImpactOscillator(ctx, destination, {
      type: 'sine',
      hz: 1975,
      start: now + 0.1,
      attack: 0.011,
      peak: 0.045,
      release: 0.24
    });

    playGoldenImpactShimmer(ctx, destination, now + 0.08);
  }

  function triggerGoldenImpactFeedback() {
    triggerMobileHaptic([22, 42, 30, 38, 92]);
    playGoldenImpactChime();
  }

  function setGoldenTabVisible(visible) {
    var tab = document.querySelector('.dream-stage-tab--gold');
    if (tab) tab.hidden = !visible;
    var stage4 = document.querySelector('.dream-stage-progress-item[data-stage-progress="4"]');
    if (stage4) stage4.hidden = !visible;
  }

  function setInteractionLocked(locked) {
    state.uiLocked = !!locked;
    var shell = document.querySelector('.dream-ledger-shell');
    if (shell) shell.classList.toggle('dream-ui-locked', state.uiLocked);

    // ??… ì¤‘ì—??ë°°ì† ë³€ê²½ì? ?ˆìš©?œë‹¤.
    var controls = document.querySelectorAll('[data-action="startDreamReading"], [data-action="dreamToggleAutoReveal"], .dream-tone-btn, .dream-library-chip, .dream-library-btn, .dream-library-suggest-item, #dreamLibraryQuery, #dreamLibraryMoreBtn, #dreamNextStageBtn, .dream-ritual-card[data-action="revealDreamStage"]');
    controls.forEach(function (el) {
      el.disabled = state.uiLocked;
    });
  }

  function renderStageProgress() {
    var nodes = document.querySelectorAll('.dream-stage-progress-item');
    if (!nodes || !nodes.length) return;
    nodes.forEach(function (node) {
      var stage = Number(node.getAttribute('data-stage-progress'));
      var done = !!state.stageDone[stage];
      var active = state.visibleStage === stage;
      node.classList.toggle('is-done', done);
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-current', active ? 'step' : 'false');
    });
  }

  function updateDrawGuide() {
    var guide = $('dreamDrawGuide');
    if (!guide) return;
    if (!state.reading) {
      guide.textContent = 'ì¹´ë“œê°€ ì¤€ë¹„ë˜ë©?1?¨ê³„ë¶€???´ì–´ ?œì‚¬ë¥??œì‘?˜ì„¸??';
      return;
    }
    if (state.visibleStage === 4) {
      guide.textContent = '?©ê¸ˆ ì¹´ë“œ ?ë‹´ ?¨ê³„?…ë‹ˆ?? ?¤ëŠ˜ ?¤í–‰????ê°€ì§€ë¥??•í•´ë³´ì„¸??';
      return;
    }
    if (!state.stageDone[state.visibleStage]) {
      guide.textContent = state.autoReveal
        ? state.visibleStage + '?¨ê³„ ì¹´ë“œë¥??ë™?¼ë¡œ ?¬ëŠ” ì¤‘ì…?ˆë‹¤.'
        : state.visibleStage + '?¨ê³„ ì¹´ë“œë¥??ŒëŸ¬ ?¤ìŒ ë¬¸ì¥???•ì¸?˜ì„¸??';
      return;
    }
    if (state.visibleStage < 3) {
      guide.textContent = state.autoReveal
        ? '?ë™ ëª¨ë“œë¡??¤ìŒ ì¹´ë“œë¡??´ì–´ì§‘ë‹ˆ??'
        : '?¤ìŒ ì¹´ë“œ ë³´ê¸° ë²„íŠ¼?¼ë¡œ ?¤ìŒ ?¨ê³„ë¡??´ë™?˜ì„¸??';
      return;
    }
    guide.textContent = '???¥ì´ ëª¨ë‘ ?´ë ¸?µë‹ˆ?? ?©ê¸ˆ ì¹´ë“œê°€ ê³??˜í??©ë‹ˆ??';
  }

  function setBodyLock(locked) {
    if (locked) {
      if (bodyLockState.locked) return;
      var docEl = document.documentElement;
      bodyLockState.overflow = document.body.style.overflow || '';
      bodyLockState.position = document.body.style.position || '';
      bodyLockState.top = document.body.style.top || '';
      bodyLockState.width = document.body.style.width || '';
      bodyLockState.htmlOverflow = docEl ? (docEl.style.overflow || '') : '';
      document.body.style.overflow = 'hidden';
      if (docEl) docEl.style.overflow = 'hidden';
      bodyLockState.locked = true;
      return;
    }

    if (!bodyLockState.locked) return;
    var docEl2 = document.documentElement;
    document.body.style.overflow = bodyLockState.overflow;
    document.body.style.position = bodyLockState.position;
    document.body.style.top = bodyLockState.top;
    document.body.style.width = bodyLockState.width;
    if (docEl2) docEl2.style.overflow = bodyLockState.htmlOverflow;
    bodyLockState.locked = false;
  }

  function speedLabel(mult) {
    var n = Number(mult) || 1;
    if (Math.round(n * 10) % 10 === 0) return String(Math.round(n));
    return n.toFixed(1).replace(/\.0$/, '');
  }

  function normalizeGoldenTone(tone) {
    var t = String(tone || '').toLowerCase();
    if (t === 'motivation' || t === 'coaching') return t;
    return 'comfort';
  }

  function toneLabel(tone) {
    var key = normalizeGoldenTone(tone);
    return GOLDEN_TONE_LABELS[key] || GOLDEN_TONE_LABELS.comfort;
  }

  function updateStoryModeLabel() {
    var modeEl = $('dreamStoryMode');
    if (!modeEl) return;
    modeEl.textContent = 'ê¿ˆì˜ ë§ˆë²•ì±???… ëª¨ë“œ Â· ' + speedLabel(state.textSpeed) + 'x Â· ?©ê¸ˆ ??' + toneLabel(state.goldenTone);
  }

  function renderSpeedButtons() {
    var buttons = document.querySelectorAll('.dream-speed-btn');
    buttons.forEach(function (btn) {
      var v = Number(btn.getAttribute('data-action-args'));
      btn.classList.toggle('is-active', Math.abs(v - state.textSpeed) < 0.01);
    });
    updateStoryModeLabel();
  }

  function renderToneButtons() {
    var buttons = document.querySelectorAll('.dream-tone-btn');
    buttons.forEach(function (btn) {
      var tone = normalizeGoldenTone(btn.getAttribute('data-action-args'));
      btn.classList.toggle('is-active', tone === state.goldenTone);
    });
    updateStoryModeLabel();
  }

  function updateAutoRevealUi() {
    var btn = $('dreamAutoRevealBtn');
    if (btn) {
      btn.classList.toggle('is-active', state.autoReveal);
      btn.textContent = state.autoReveal ? '?ë™ ?¼ì¹˜ê¸?ON' : '?ë™ ?¼ì¹˜ê¸?OFF';
      btn.setAttribute('aria-pressed', state.autoReveal ? 'true' : 'false');
    }
    var status = $('dreamAutoRevealState');
    if (status) {
      status.textContent = state.autoReveal
        ? '?ë™ ëª¨ë“œ: ì¹´ë“œê°€ ?œì„œ?€ë¡??´ì–´???´ë¦½?ˆë‹¤.'
        : '?˜ë™ ëª¨ë“œ: ?í•˜???€?´ë°??ì¹´ë“œë¥?ì§ì ‘ ?????ˆìŠµ?ˆë‹¤.';
    }
    updateDrawGuide();
  }

  function queueAutoReveal(delayMs) {
    clearAutoRevealTimer();
    if (!state.autoReveal) return;
    state.autoRevealTimer = setTimeout(function () {
      state.autoRevealTimer = null;
      window.dreamAutoAdvance();
    }, Math.max(120, Number(delayMs) || 360));
  }

  window.dreamAutoAdvance = function dreamAutoAdvance() {
    if (!state.autoReveal) return;
    if (state.uiLocked || state.typingStage || !state.reading) return;
    if (state.visibleStage >= 4) return;

    var current = state.visibleStage;
    if (!state.stageDone[current]) {
      window.revealDreamStage(current);
      return;
    }

    if (current < 3) {
      window.nextDreamStage();
      queueAutoReveal(300);
    }
  };

  function stopTyping() {
    if (state.typingTimer) {
      clearInterval(state.typingTimer);
      state.typingTimer = null;
    }
    state.typingStage = 0;
    state.typingContext = null;
  }

  function scrollStoryToLatest(includePanel) {
    var scrollWrap = $('dreamStoryScroll');
    if (scrollWrap) {
      scrollWrap.scrollTop = scrollWrap.scrollHeight;
    }
    var panel = includePanel ? document.querySelector('.dream-stage-panel') : null;
    if (panel && typeof panel.scrollIntoView === 'function') {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function resetCards() {
    stopTyping();
    clearGoldenTimer();
    clearAutoRevealTimer();
    var cards = document.querySelectorAll('.dream-ritual-card');
    cards.forEach(function (card) {
      card.classList.remove('is-open');
      card.classList.remove('is-active-card');
      card.classList.remove('is-flipping');
      card.classList.remove('is-revealing');
      card.classList.remove('is-impact');
    });
    state.stageDone = { 1: false, 2: false, 3: false, 4: false };
    state.nextStage = 1;
    state.visibleStage = 1;
    state.typingStage = 0;
    setInteractionLocked(false);
    setGoldenTabVisible(false);

    var goldenWrap = $('dreamGoldenAdviceWrap');
    if (goldenWrap) goldenWrap.style.display = 'none';
    var goldenText = $('dreamGoldenAdvice');
    if (goldenText) goldenText.textContent = '';

    var nextBtn = $('dreamNextStageBtn');
    if (nextBtn) nextBtn.style.display = 'none';
    updateVisibleStage(1);
    renderStageProgress();
    updateDrawGuide();
  }

  function updateStageTabs(stage) {
    var tabs = document.querySelectorAll('.dream-stage-tab');
    tabs.forEach(function (tab) {
      var s = Number(tab.getAttribute('data-stage-tab'));
      tab.classList.toggle('is-active', s === stage);
    });
  }

  function updateVisibleStage(stage) {
    state.visibleStage = stage;
    if (stage === 4) setGoldenTabVisible(true);
    var cards = document.querySelectorAll('.dream-ritual-card');
    cards.forEach(function (card) {
      var s = Number(card.getAttribute('data-dream-stage'));
      card.classList.toggle('is-active-card', s === stage);
      if (s === stage) {
        card.classList.remove('is-summoned');
        window.requestAnimationFrame(function () {
          card.classList.add('is-summoned');
        });
      }
    });
    updateStageTabs(stage);
    renderStageProgress();
    updateDrawGuide();
    scrollStoryToLatest(true);
  }

  function setWizardLine(text) {
    var line = $('dreamWizardLine');
    if (line) line.textContent = text;
  }

  function typeText(targetEl, text, speed, done) {
    if (state.typingTimer) {
      clearInterval(state.typingTimer);
      state.typingTimer = null;
    }
    var source = String(text || '');
    var baseSpeed = Number(speed) || 32;
    targetEl.textContent = '';
    state.typingContext = {
      targetEl: targetEl,
      source: source,
      baseSpeed: baseSpeed,
      index: 0,
      done: typeof done === 'function' ? done : null
    };
    restartTypingTimer();
  }

  function restartTypingTimer() {
    if (!state.typingContext) return;
    if (state.typingTimer) {
      clearInterval(state.typingTimer);
      state.typingTimer = null;
    }
    var ctx = state.typingContext;
    var speedMult = Number(state.textSpeed) || 1;
    var interval = Math.max(12, Math.round((ctx.baseSpeed * 5) / speedMult));
    state.typingTimer = setInterval(function () {
      if (!state.typingContext) return;
      var current = state.typingContext;
      current.index += 1;
      current.targetEl.textContent = current.source.slice(0, current.index);
      scrollStoryToLatest();
      if (current.index >= current.source.length) {
        clearInterval(state.typingTimer);
        state.typingTimer = null;
        state.typingContext = null;
        if (current.done) current.done();
      }
    }, interval);
  }

  function setLoaderText(text) {
    var loaderText = $('dreamLoaderText');
    if (loaderText) loaderText.textContent = text;
  }

  function normalizeApiBase(raw) {
    var value = String(raw || '').trim();
    if (!value) return '';
    return value.replace(/\/+$/, '');
  }

  function getRuntimeEnvApiBase() {
    try {
      if (typeof process !== 'undefined' && process.env) {
        var envBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.CLOUDFLARE_API_BASE_URL || process.env.API_BASE_URL;
        if (envBase) return normalizeApiBase(envBase);
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined') {
        if (window.__ENV__ && window.__ENV__.NEXT_PUBLIC_API_BASE_URL) {
          return normalizeApiBase(window.__ENV__.NEXT_PUBLIC_API_BASE_URL);
        }
        if (window.__CF_PAGES_API_BASE_URL) {
          return normalizeApiBase(window.__CF_PAGES_API_BASE_URL);
        }
        var meta = document.querySelector('meta[name="code-destiny-api-base"]');
        if (meta && meta.content) return normalizeApiBase(meta.content);
      }
    } catch (_) {}

    return '';
  }

  function getDreamTarotApiBase() {
    var runtimeBase = getRuntimeEnvApiBase();
    if (runtimeBase) return runtimeBase;

    try {
      if (typeof getFortuneApiBaseUrl === 'function') {
        var base = getFortuneApiBaseUrl();
        if (base) return normalizeApiBase(base);
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined') {
        if (window.CODE_DESTINY_API_BASE_URL) return normalizeApiBase(window.CODE_DESTINY_API_BASE_URL);
        var custom = localStorage.getItem('fortune_api_base_url');
        if (custom) return normalizeApiBase(custom);
      }
    } catch (_) {}

    try {
      var host = String(location.host || '').toLowerCase();
      if (host === 'api.code-destiny.com') return location.origin || '';
      if (host.endsWith('.pages.dev') || host.endsWith('.workers.dev')) {
        return 'https://code-destiny.com';
      }
    } catch (_) {}

    return '';
  }

  function buildDreamTarotApiBaseCandidates() {
    var out = [];
    function add(base) {
      var normalized = normalizeApiBase(base);
      if (normalized && out.indexOf(normalized) === -1) out.push(normalized);
    }

    out.push('');
    try {
      if (location && location.origin) add(location.origin);
    } catch (_) {}

    add(getRuntimeEnvApiBase());
    add(getDreamTarotApiBase());
    add('https://code-destiny.com');
    return out;
  }

  function isRetriableApiError(error) {
    if (!error) return false;
    if (error.name === 'AbortError') return true;
    var msg = String(error.message || '').toLowerCase();
    if (msg.indexOf('timeout') !== -1) return true;
    if (msg.indexOf('network') !== -1) return true;

    var status = Number(error.status || 0);
    if (status >= 500) return true;
    if (status === 408 || status === 425 || status === 429) return true;

    if (!status && error instanceof TypeError) return true;
    return false;
  }

  function isAcceptableApiPayload(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.ok === true || data.success === true) return true;
    if (Array.isArray(data.cards)) return true;
    if (data.reading && typeof data.reading === 'object') return true;
    if (data.record && typeof data.record === 'object') return true;
    return false;
  }

  function fetchJsonWithTimeout(url, payload) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, DREAM_TAROT_API_TIMEOUT_MS);

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify(payload || {}),
      signal: controller ? controller.signal : undefined
    })
    .then(function (res) {
      return res.text().then(function (body) {
        var data = null;
        if (body) {
          try {
            data = JSON.parse(body);
          } catch (_) {
            data = null;
          }
        }
        if (!res.ok) {
          var httpErr = new Error('Tarot API HTTP error: ' + res.status);
          httpErr.status = res.status;
          httpErr.responseBody = body || '';
          throw httpErr;
        }
        if (!isAcceptableApiPayload(data)) {
          throw new Error('Invalid tarot API response payload');
        }
        return data;
      });
    })
    .catch(function (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('Tarot API timeout');
      }
      throw error;
    })
    .finally(function () {
      clearTimeout(timer);
    });
  }

  function callDreamTarotApi(endpoint, payload) {
    var bases = buildDreamTarotApiBaseCandidates();
    var lastError = null;
    var index = 0;

    function tryNext() {
      if (index >= bases.length) {
        throw lastError || new Error('Tarot API request failed');
      }

      var base = bases[index++];
      var url = (base ? base + '/api/tarot/' : '/api/tarot/') + endpoint;

      return fetchJsonWithTimeout(url, payload).catch(function (error) {
        lastError = error;
        if (!isRetriableApiError(error)) {
          throw error;
        }
        return tryNext();
      });
    }

    return Promise.resolve().then(tryNext);
  }

  function callDreamApi(endpoint, payload) {
    var bases = buildDreamTarotApiBaseCandidates();
    var lastError = null;
    var index = 0;

    function tryNext() {
      if (index >= bases.length) {
        throw lastError || new Error('Dream API request failed');
      }

      var base = bases[index++];
      var url = (base ? base + '/api/dream/' : '/api/dream/') + endpoint;

      return fetchJsonWithTimeout(url, payload).catch(function (error) {
        lastError = error;
        if (!isRetriableApiError(error)) {
          throw error;
        }
        return tryNext();
      });
    }

    return Promise.resolve().then(tryNext);
  }

  function buildDreamLibraryContext(dreamText) {
    var text = String(dreamText || '').trim();
    if (!text) return [];
    try {
      var utils = window.DreamMeaningLibraryUtils;
      if (utils && typeof utils.findMatches === 'function') {
        return utils.findMatches(text, 6);
      }
    } catch (_) {}
    return [];
  }

  function loadScriptOnce(src) {
    var norm = String(src || '').trim();
    if (!norm) return Promise.reject(new Error('missing src'));

    var all = document.querySelectorAll('script[src]');
    var normBase = norm.split('?')[0];
    var fileName = normBase.split('/').pop();
    var existing = null;
    for (var i = 0; i < all.length; i += 1) {
      var cur = all[i].getAttribute('src') || '';
      var curBase = cur.split('?')[0];
      if (cur === norm || curBase === normBase || (fileName && curBase.indexOf('/' + fileName) !== -1)) {
        existing = all[i];
        break;
      }
    }

    if (existing) {
      if (existing.dataset.loaded === '1' || existing.readyState === 'complete' || existing.readyState === 'loaded') {
        return Promise.resolve();
      }
      if (existing.dataset.loading !== '1') return Promise.resolve();
      return new Promise(function (resolve, reject) {
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('load failed: ' + src)); }, { once: true });
      });
    }

    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = norm;
      s.defer = true;
      s.async = true;
      s.dataset.loading = '1';
      s.onload = function () {
        s.dataset.loading = '0';
        s.dataset.loaded = '1';
        resolve();
      };
      s.onerror = function () { reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureDreamLedgerAiReady() {
    var ai = window.DreamLedgerAI;
    if (ai && typeof ai.interpretDream === 'function') return Promise.resolve(ai);

    if (!dreamAiLoadPromise) {
      dreamAiLoadPromise = loadScriptOnce('/lib/ai-engine.js').catch(function () {
        return null;
      });
    }

    return dreamAiLoadPromise.then(function () {
      var loadedAi = window.DreamLedgerAI;
      if (loadedAi && typeof loadedAi.interpretDream === 'function') return loadedAi;
      return null;
    });
  }

  function syncInputEnergy() {
    var input = $('dreamInput');
    var shell = document.querySelector('.dream-ledger-shell');
    if (!input || !shell) return;
    var len = (input.value || '').trim().length;
    var energy = Math.min(1.35, 0.55 + len / 90);
    shell.style.setProperty('--dream-energy', String(energy));
  }

  function renderKeywordChips(keywords) {
    var wrap = $('dreamKeywordChips');
    if (!wrap) return;
    var list = Array.isArray(keywords) ? keywords.slice(0, 12) : [];
    wrap.innerHTML = list.map(function (kw) {
      return '<span class="dream-keyword-chip">' + kw + '</span>';
    }).join('');
  }

  function normalizeLibraryCategory(category) {
    var key = String(category || 'all').toLowerCase();
    if (DREAM_LIBRARY_CATEGORY_LABELS[key]) return key;
    return 'all';
  }

  function dreamLibraryEntries() {
    var list = window.DREAM_MEANING_LIBRARY;
    return Array.isArray(list) ? list : [];
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegExp(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function tokenizeLibraryQuery(query) {
    return String(query || '')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(function (token) {
        return token && token.length > 0;
      });
  }

  function highlightQuery(text, query) {
    var source = String(text || '');
    var tokens = tokenizeLibraryQuery(query);
    if (!tokens.length) return escapeHtml(source);
    var escaped = escapeHtml(source);
    for (var i = 0; i < tokens.length; i += 1) {
      var pattern = new RegExp('(' + escapeRegExp(tokens[i]) + ')', 'gi');
      escaped = escaped.replace(pattern, '<mark>$1</mark>');
    }
    return escaped;
  }

  function scoreDreamLibraryItem(item, tokens, rawQuery) {
    if (!tokens.length) return 1;

    var keyword = String(item.keyword || '').toLowerCase();
    var title = String(item.title || '').toLowerCase();
    var tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
    var meaning = String(item.meaning || '').toLowerCase();
    var fortune = String(item.fortune || '').toLowerCase();
    var tip = String(item.tip || '').toLowerCase();
    var haystack = [keyword, title, tags, meaning, fortune, tip].join(' ');

    var score = 0;
    var matched = false;

    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i];
      if (!token) continue;

      if (keyword === token) {
        score += 120;
        matched = true;
        continue;
      }

      if (keyword.indexOf(token) === 0) {
        score += 80;
        matched = true;
      } else if (keyword.indexOf(token) >= 0) {
        score += 60;
        matched = true;
      }

      if (title.indexOf(token) >= 0) {
        score += 46;
        matched = true;
      }

      if (tags.indexOf(token) >= 0) {
        score += 34;
        matched = true;
      }

      if (meaning.indexOf(token) >= 0) {
        score += 18;
        matched = true;
      }

      if (fortune.indexOf(token) >= 0) {
        score += 14;
        matched = true;
      }

      if (tip.indexOf(token) >= 0) {
        score += 10;
        matched = true;
      }
    }

    if (rawQuery && (keyword.indexOf(rawQuery) === 0 || title.indexOf(rawQuery) === 0)) {
      score += 20;
      matched = true;
    }

    if (!matched && haystack.indexOf(rawQuery) >= 0) {
      score += 12;
      matched = true;
    }

    return matched ? score : 0;
  }

  function filterDreamLibraryEntries() {
    var entries = dreamLibraryEntries();
    var category = normalizeLibraryCategory(state.libraryCategory);
    var query = String(state.libraryQuery || '').trim().toLowerCase();
    var tokens = tokenizeLibraryQuery(query);
    var scored = [];

    for (var i = 0; i < entries.length; i += 1) {
      var item = entries[i];
      if (category !== 'all' && String(item.category || '') !== category) continue;
      var score = scoreDreamLibraryItem(item, tokens, query);
      if (score <= 0) continue;
      scored.push({ item: item, score: score });
    }

    scored.sort(function (a, b) {
      if (a.score !== b.score) return b.score - a.score;
      return String(a.item.keyword || '').localeCompare(String(b.item.keyword || ''), 'ko');
    });

    return scored.map(function (row) {
      return row.item;
    });
  }

  function renderDreamLibraryCategoryButtons() {
    var wrap = $('dreamLibraryCategoryChips');
    if (!wrap) return;
    var category = normalizeLibraryCategory(state.libraryCategory);
    var chips = wrap.querySelectorAll('.dream-library-chip');
    chips.forEach(function (chip) {
      var v = normalizeLibraryCategory(chip.getAttribute('data-action-args'));
      chip.classList.toggle('is-active', v === category);
    });
  }

  function renderDreamLibraryList() {
    var listEl = $('dreamLibraryList');
    var metaEl = $('dreamLibraryMeta');
    var moreBtn = $('dreamLibraryMoreBtn');
    if (!listEl || !metaEl) return;

    var category = normalizeLibraryCategory(state.libraryCategory);
    var filtered = filterDreamLibraryEntries();
    var visible = filtered.slice(0, state.libraryLimit);
    var queryText = String(state.libraryQuery || '').trim();
    var categoryLabel = DREAM_LIBRARY_CATEGORY_LABELS[category] || DREAM_LIBRARY_CATEGORY_LABELS.all;

    if (!filtered.length) {
      metaEl.textContent = '[' + categoryLabel + ']?ì„œ ê²€??ê²°ê³¼ë¥?ì°¾ì? ëª»í–ˆ?µë‹ˆ?? ?¤ë¥¸ ?¤ì›Œ?œë¡œ ?œë„?´ë³´?¸ìš”.';
      listEl.innerHTML = '<article class="dream-library-item dream-library-item--empty"><h5>ê²€??ê²°ê³¼ ?†ìŒ</h5><p>?? ?¸ë‘?? ?œëª½, ?©ê²©, ?¬ë¬¼, ?°ì• , ê²°í˜¼</p></article>';
      if (moreBtn) moreBtn.style.display = 'none';
      return;
    }

    metaEl.textContent = 'ì´?' + filtered.length + 'ê±?Â· ì¹´í…Œê³ ë¦¬: ' + categoryLabel + (queryText ? ' Â· ê²€?‰ì–´: "' + queryText + '"' : '');

    listEl.innerHTML = visible.map(function (item) {
      var itemCategory = DREAM_LIBRARY_CATEGORY_LABELS[item.category] || item.category;
      return '<article class="dream-library-item">'
        + '<div class="dream-library-item-head">'
        + '<span class="dream-library-badge">' + escapeHtml(itemCategory) + '</span>'
        + '<h5>' + highlightQuery(item.title || (item.keyword + ' ê¿?), queryText) + '</h5>'
        + '</div>'
        + '<p class="dream-library-meaning">' + highlightQuery(item.meaning, queryText) + '</p>'
        + '<p class="dream-library-fortune"><strong>?´ì„¸ ?¬ì¸??/strong> ' + highlightQuery(item.fortune, queryText) + '</p>'
        + '<p class="dream-library-tip"><strong>?¤ì²œ ??/strong> ' + highlightQuery(item.tip, queryText) + '</p>'
      + '</article>';
    }).join('');

    if (moreBtn) {
      moreBtn.style.display = filtered.length > visible.length ? 'block' : 'none';
    }
  }

  function hideDreamLibrarySuggestions() {
    var suggestEl = $('dreamLibrarySuggest');
    state.librarySuggestions = [];
    state.librarySuggestIndex = -1;
    if (!suggestEl) return;
    suggestEl.innerHTML = '';
    suggestEl.style.display = 'none';
  }

  function buildDreamLibrarySuggestions() {
    var query = String(state.libraryQuery || '').trim().toLowerCase();
    if (!query) return [];

    var entries = dreamLibraryEntries();
    var category = normalizeLibraryCategory(state.libraryCategory);
    var table = {};

    function addSuggestion(text, score, kind) {
      var value = String(text || '').trim();
      if (!value) return;
      var key = value.toLowerCase();
      if (!table[key]) {
        table[key] = {
          text: value,
          score: score,
          kind: kind
        };
        return;
      }
      if (score > table[key].score) {
        table[key].score = score;
        table[key].kind = kind;
      }
    }

    for (var i = 0; i < entries.length; i += 1) {
      var item = entries[i];
      if (category !== 'all' && String(item.category || '') !== category) continue;

      var keyword = String(item.keyword || '').trim();
      var keywordLower = keyword.toLowerCase();
      if (keywordLower.indexOf(query) === 0) {
        addSuggestion(keyword, 120, '?µì‹¬ ?¤ì›Œ??);
      } else if (keywordLower.indexOf(query) >= 0) {
        addSuggestion(keyword, 92, '?°ê? ?¤ì›Œ??);
      }

      var title = String(item.title || '').trim();
      var titleLower = title.toLowerCase();
      if (titleLower.indexOf(query) === 0) {
        addSuggestion(title, 80, '?œëª©');
      } else if (titleLower.indexOf(query) >= 0) {
        addSuggestion(title, 62, '?œëª©');
      }

      var tags = Array.isArray(item.tags) ? item.tags : [];
      for (var t = 0; t < tags.length; t += 1) {
        var tag = String(tags[t] || '').trim();
        var tagLower = tag.toLowerCase();
        if (!tag) continue;
        if (tagLower.indexOf(query) === 0) {
          addSuggestion(tag, 68, '?œê·¸');
        } else if (tagLower.indexOf(query) >= 0) {
          addSuggestion(tag, 48, '?œê·¸');
        }
      }
    }

    var suggestions = Object.keys(table).map(function (key) {
      return table[key];
    });

    suggestions.sort(function (a, b) {
      if (a.score !== b.score) return b.score - a.score;
      if (a.text.length !== b.text.length) return a.text.length - b.text.length;
      return a.text.localeCompare(b.text, 'ko');
    });

    return suggestions.slice(0, 10);
  }

  function renderDreamLibrarySuggestions() {
    var suggestEl = $('dreamLibrarySuggest');
    if (!suggestEl) return;

    var suggestions = buildDreamLibrarySuggestions();
    state.librarySuggestions = suggestions;

    if (!suggestions.length) {
      hideDreamLibrarySuggestions();
      return;
    }

    if (state.librarySuggestIndex >= suggestions.length) {
      state.librarySuggestIndex = suggestions.length - 1;
    }

    suggestEl.innerHTML = suggestions.map(function (item, idx) {
      var activeClass = idx === state.librarySuggestIndex ? ' is-active' : '';
      return '<button type="button" class="dream-library-suggest-item' + activeClass + '" role="option" aria-selected="' + (idx === state.librarySuggestIndex ? 'true' : 'false') + '" data-action="dreamLibraryPickSuggestion" data-action-pass-self="append" data-suggest="' + escapeHtml(item.text) + '">'
        + '<span class="dream-library-suggest-main">' + highlightQuery(item.text, state.libraryQuery) + '</span>'
        + '<span class="dream-library-suggest-kind">' + escapeHtml(item.kind) + '</span>'
      + '</button>';
    }).join('');
    suggestEl.style.display = 'grid';
  }

  function moveDreamLibrarySuggestion(step) {
    if (!state.librarySuggestions.length) return;
    var next = state.librarySuggestIndex + step;
    if (next < 0) next = state.librarySuggestions.length - 1;
    if (next >= state.librarySuggestions.length) next = 0;
    state.librarySuggestIndex = next;
    renderDreamLibrarySuggestions();
  }

  function deriveLibraryQueryFromDream() {
    var input = $('dreamInput');
    var dreamText = input ? String(input.value || '').trim() : '';
    var tokens = [];
    var seen = {};

    function pushToken(token) {
      var v = String(token || '').trim();
      if (!v || seen[v]) return;
      seen[v] = true;
      tokens.push(v);
    }

    if (state.reading && Array.isArray(state.reading.keywords)) {
      state.reading.keywords.slice(0, 4).forEach(pushToken);
    }

    if (dreamText) {
      var entries = dreamLibraryEntries();
      var lowered = dreamText.toLowerCase();
      for (var i = 0; i < entries.length; i += 1) {
        var kw = String(entries[i].keyword || '').toLowerCase();
        if (kw && lowered.indexOf(kw) >= 0) {
          pushToken(entries[i].keyword);
          if (tokens.length >= 5) break;
        }
      }
    }

    if (!tokens.length && dreamText) {
      var quick = dreamText
        .replace(/[.,!?\-_/]+/g, ' ')
        .split(/\s+/)
        .filter(function (w) {
          return w && w.length >= 2;
        })
        .slice(0, 5);
      quick.forEach(pushToken);
    }

    if (!tokens.length) return '';
    return tokens.slice(0, 5).join(' ');
  }

  function renderCardFaces(reading) {
    if (!reading || !Array.isArray(reading.cards)) return;
    for (var i = 0; i < 3; i += 1) {
      var card = reading.cards[i] || {};
      var nameEl = $('dreamCardName' + (i + 1));
      var symbolEl = $('dreamCardSymbol' + (i + 1));
      var artEl = $('dreamCardArt' + (i + 1));
      if (nameEl) nameEl.textContent = '[' + (card.card_name || 'ë¯¸ì????ì§•') + '] ì¹´ë“œ';
      if (symbolEl) symbolEl.textContent = card.symbol || '??;
      if (artEl) {
        if (card.tarot_image_url) {
          (function (el, url, keyword, sym) {
            var probe = new Image();
            probe.onload = function () {
              el.style.backgroundImage = 'url("' + url + '")';
            };
            probe.onerror = function () {
              el.style.backgroundImage = makeKeywordArt(keyword, sym);
            };
            probe.src = url;
          })(artEl, card.tarot_image_url, card.card_name || '?ì§•', card.symbol || '??);
        } else {
          artEl.style.backgroundImage = makeKeywordArt(card.card_name || '?ì§•', card.symbol || '??);
        }
      }
    }
  }

  function readArchive() {
    try {
      var raw = localStorage.getItem(DREAM_ARCHIVE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function writeArchive(items) {
    try {
      localStorage.setItem(DREAM_ARCHIVE_KEY, JSON.stringify(items || []));
    } catch (_) {}
  }

  function formatDate(ts) {
    var d = new Date(ts || Date.now());
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
  }

  function ensureReadingSessionKey(reading) {
    if (!reading || typeof reading !== 'object') return '';
    if (!reading._autoTuneSessionKey) {
      reading._autoTuneSessionKey = Date.now() + '-' + Math.random().toString(16).slice(2, 10);
    }
    return String(reading._autoTuneSessionKey);
  }

  function sendAutoTuneSignal(signal, engagementScore, reading, options) {
    var targetReading = reading || state.reading;
    if (!targetReading) return false;

    var ai = window.DreamLedgerAI;
    if (!ai || typeof ai.registerConsultationOutcome !== 'function') return false;

    var opts = options || {};
    var oncePerReading = opts.oncePerReading !== false;
    if (oncePerReading) {
      var key = ensureReadingSessionKey(targetReading) + ':' + String(signal || '');
      if (state.outcomeSignals[key]) return false;
      state.outcomeSignals[key] = true;
    }

    try {
      return !!ai.registerConsultationOutcome({
        signal: signal,
        engagementScore: Number(engagementScore) || 0.45,
        reading: targetReading
      });
    } catch (_) {
      return false;
    }
  }

  function saveCurrentReadingToArchive() {
    if (!state.reading) return false;
    var list = readArchive();
    var id = Date.now() + '-' + Math.random().toString(16).slice(2, 8);
    list.unshift({
      id: id,
      createdAt: Date.now(),
      title: state.reading.title || '?œë¦¼ ?€ë¡?,
      summary: state.reading.summary || '',
      reading: state.reading
    });
    if (list.length > 30) list = list.slice(0, 30);
    writeArchive(list);
    return true;
  }

  function renderArchiveList() {
    var listEl = $('dreamArchiveList');
    if (!listEl) return;

    var list = readArchive();
    if (!list.length) {
      listEl.innerHTML = '<div class="dream-archive-item"><div class="dream-archive-meta">?€?¥ëœ ?´ëª½???†ìŠµ?ˆë‹¤. ?´ëª½ ??[ê¿??€?¥ì†Œ]ë¥??ŒëŸ¬ ë³´ê??´ë³´?¸ìš”.</div></div>';
      return;
    }

    listEl.innerHTML = list.map(function (item) {
      var title = item.title || '?œë¦¼ ?€ë¡?;
      var summary = (item.summary || '').slice(0, 72);
      return '<article class="dream-archive-item">'
        + '<div class="dream-archive-title">' + title + '</div>'
        + '<div class="dream-archive-meta">' + formatDate(item.createdAt) + ' Â· ' + summary + '</div>'
        + '<div class="dream-archive-actions">'
          + '<button class="dream-ledger-btn dream-ledger-btn--mini" onclick="dreamLoadArchiveAt(\'' + item.id + '\')">?¤ì‹œ ë³´ê¸°</button>'
          + '<button class="dream-ledger-btn dream-ledger-btn--mini" onclick="dreamDeleteArchiveAt(\'' + item.id + '\')">?? œ</button>'
        + '</div>'
      + '</article>';
    }).join('');
  }

  function hydrateReading(reading) {
    if (!reading) return;
    state.goldenTone = normalizeGoldenTone(reading.goldenTone || state.goldenTone);
    state.reading = reading;
    ensureReadingSessionKey(state.reading);
    $('dreamCardTitle').textContent = state.reading.title;
    $('dreamCardSummary').textContent = state.reading.summary;
    renderKeywordChips(state.reading.keywords);
    renderCardFaces(state.reading);
    $('dreamStageTitle').textContent = '????Â· ì²?ë²ˆì§¸ ì¹´ë“œê°€ ?¤ë ¤ì¤??œì‚¬ë¥??´ì–´ì£¼ì„¸??';
    $('dreamStageText').textContent = '';
    $('dreamFinalSpell').textContent = '';
    var goldenAdviceText = $('dreamGoldenAdvice');
    if (goldenAdviceText) goldenAdviceText.textContent = '';
    var finalConsultText = $('dreamFinalConsult');
    if (finalConsultText) finalConsultText.textContent = '';

    var cardName4 = $('dreamCardName4');
    if (cardName4) cardName4.textContent = '[' + (reading.goldenCardName || '?©ê¸ˆ ì¹´ë“œ') + ']';
    var cardSymbol4 = $('dreamCardSymbol4');
    if (cardSymbol4) cardSymbol4.textContent = reading.goldenCardSymbol || '??;

    var spellWrap = $('dreamFinalSpellWrap');
    if (spellWrap) spellWrap.style.display = 'none';
    var goldenWrap = $('dreamGoldenAdviceWrap');
    if (goldenWrap) goldenWrap.style.display = 'none';
    var finalConsultWrap = $('dreamFinalConsultWrap');
    if (finalConsultWrap) finalConsultWrap.style.display = 'none';
    setGoldenTabVisible(false);
    var nextBtn = $('dreamNextStageBtn');
    if (nextBtn) nextBtn.style.display = 'none';
    updateVisibleStage(1);
    setWizardLine('ì¹´ë“œê°€ ?Œí™˜?˜ì—ˆ?µë‹ˆ?? ê¿ˆì˜ ë§ˆë²•ì±…ì´ 1?¥ë???ì°¨ë??€ë¡??´ì•¼ê¸°ë? ?¤ë ¤ì¤ë‹ˆ??');
    updateAutoRevealUi();
    updateStoryModeLabel();
    renderToneButtons();
    $('dreamLoader').style.display = 'none';
    $('dreamResultWrap').style.display = 'block';
    scrollStoryToLatest();

    if (state.autoReveal) {
      queueAutoReveal(260);
    }
  }

  function makeKeywordArt(keyword, symbol) {
    var k = String(keyword || '?ì§•').slice(0, 12);
    var s = String(symbol || '??).slice(0, 2);
    var palette = [
      ['#ffd9a1', '#79c7ff', '#2a3b68'],
      ['#ffcf91', '#95b5ff', '#3b2f66'],
      ['#ffe0b8', '#85d6ff', '#32416f'],
      ['#ffd3a9', '#9cd0ff', '#2e3860']
    ];
    var idx = (k.length + s.charCodeAt(0)) % palette.length;
    var c = palette[idx];
    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 230">',
      '<defs>',
      '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0%" stop-color="' + c[2] + '"/>',
      '<stop offset="100%" stop-color="#1f2b4f"/>',
      '</linearGradient>',
      '<radialGradient id="r" cx="0.2" cy="0.2" r="0.8">',
      '<stop offset="0%" stop-color="' + c[0] + '" stop-opacity="0.95"/>',
      '<stop offset="100%" stop-color="' + c[1] + '" stop-opacity="0.05"/>',
      '</radialGradient>',
      '</defs>',
      '<rect width="420" height="230" fill="url(#g)"/>',
      '<rect width="420" height="230" fill="url(#r)"/>',
      '<circle cx="355" cy="48" r="38" fill="' + c[1] + '" fill-opacity="0.2"/>',
      '<circle cx="62" cy="184" r="48" fill="' + c[0] + '" fill-opacity="0.18"/>',
      '<text x="210" y="122" text-anchor="middle" font-size="92" fill="#f4fbff" fill-opacity="0.94">' + s + '</text>',
      '<text x="210" y="196" text-anchor="middle" font-size="28" fill="#fff3df" font-family="serif">' + k + '</text>',
      '</svg>'
    ].join('');
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  }

  function stagePayload(s) {
    if (!state.reading) return { title: '', text: '' };
    if (s === 1) return { title: '1´Ü°è ¡¤ ÇöÀç »óÈ²', text: state.reading.currentSituation || state.reading.scene };
    if (s === 2) return { title: '2´Ü°è ¡¤ ¿Ö ÀÌ·± ÀÏÀÌ »ı°å´Â°¡', text: state.reading.whyThisHappens || state.reading.symbol };
    return { title: '3´Ü°è ¡¤ ½ÇÁ¦ Çàµ¿ Á¶¾ğ', text: state.reading.actionAdvice || state.reading.echo };
  }
  function normalizedFinalSpell(reading) {
    var raw = reading && reading.finalSpell ? String(reading.finalSpell) : '';
    var cleaned = raw
      .replace(/^\s*?¤ëŠ˜??s*?‰ìš´\s*ì£¼ë¬¸\s*:\s*/i, '')
      .replace(/^\s*?¤ëŠ˜??s*ì£¼ë¬¸\s*:\s*/i, '')
      .replace(/^\s*?‰ìš´\s*ì£¼ë¬¸\s*:\s*/i, '')
      .trim();
    return cleaned || '?˜ëŠ” ?¤ëŠ˜???©ê¸°ë¥??´ì¼??ê¸¸ë¡œ ë°”ê¾¼??';
  }

  function normalizedGoldenAdvice(reading) {
    var raw = reading && reading.goldenAdvice ? String(reading.goldenAdvice) : '';
    var text = raw.trim();
    if (!text) {
      return '???¥ì˜ ?¥ë©´?€ ì§€ê¸??¹ì‹ ??ë²„í…¨???œê°„???¸ì •?˜ë¼ê³?ë§í•©?ˆë‹¤. ?¤ëŠ˜?€ ?„ë²½?¨ë³´???Œë³µ??ë¨¼ì? ? íƒ?˜ì„¸?? ??ê°€ì§€ ?‘ì? ?¼ë§Œ ?ë‚´??ì¶©ë¶„???ìœ¼ë¡?ê°€ê³??ˆìŠµ?ˆë‹¤. ?¹ì‹ ???ë„ë¥?ì§€?¤ëŠ” ê²ƒì´ ê°€???„ì‹¤?ì¸ ?¹ë¦¬?…ë‹ˆ??';
    }
    return text;
  }

  function buildFinalConsulting(reading) {
    if (!reading) return '';
    var title = String(reading.title || '¿À´ÃÀÇ »ó´ã');
    var summary = String(reading.summary || '').trim();
    var finalSpell = normalizedFinalSpell(reading);
    var currentSituation = String(reading.currentSituation || reading.scene || summary || '').trim();
    var whyThisHappens = String(reading.whyThisHappens || reading.symbol || '').trim();
    var biggestRisk = String(reading.biggestRisk || '').trim();
    var bestChoice = String(reading.bestChoice || '').trim();
    var actionAdvice = String(reading.actionAdvice || reading.echo || finalSpell).trim();
    var oneLineConclusion = String(reading.oneLineConclusion || finalSpell).trim();
    var aiConsult = String(reading.aiConsultMarkdown || '').trim();
    var keywords = Array.isArray(reading.keywords)
      ? reading.keywords.slice(0, 3).filter(Boolean)
      : [];
    var aiActions = Array.isArray(reading.aiActionPlan) ? reading.aiActionPlan.slice(0, 3) : [];
    var keyLine = keywords.length ? 'ÇÙ½É Å°¿öµå ¡¤ ' + keywords.join(' ¡¤ ') : 'ÇÙ½É Å°¿öµå ¡¤ °¨Á¤, °ü°è, ¼±ÅÃ';

    if (currentSituation || whyThisHappens || biggestRisk || bestChoice || actionAdvice || oneLineConclusion) {
      return [
        '»ó´ãÇü °á·Ğ ¡¤ ' + title,
        '',
        'ÇöÀç »óÈ²',
        currentSituation || summary || 'Áö±İÀÇ Èå¸§Àº ¾ÆÁ÷ Á¤¸®µÇÁö ¾Ê¾Ò½À´Ï´Ù.',
        '',
        '¿Ö ÀÌ·± ÀÏÀÌ »ı°å´Â°¡',
        whyThisHappens || summary || '°ÑÀ¸·Î º¸ÀÌ´Â Ä«µåº¸´Ù, ³»ºÎÀÇ ¹İÀÀ ÆĞÅÏÀÌ ¸ÕÀú Èå¸§À» ¸¸µé°í ÀÖ½À´Ï´Ù.',
        '',
        'Áö±İ °¡Àå À§ÇèÇÑ ¼±ÅÃ',
        biggestRisk || 'Áö±İÀÇ ºÒ¾ÈÀ» ±Ù°Å·Î °á·ĞÀ» ³Ê¹« »¡¸® ³»¸®´Â °Í',
        '',
        'Áö±İ °¡Àå ÁÁÀº ¼±ÅÃ',
        bestChoice || 'ÇÑ ¹ø¿¡ ¹Ù²ÙÁö ¸»°í, ¿À´Ã ½ÇÇàÇÒ ¼ö ÀÖ´Â °¡Àå ÀÛÀº Çàµ¿ºÎÅÍ ½ÃÀÛÇÏ´Â °Í',
        '',
        '½ÇÁ¦ Çàµ¿ Á¶¾ğ',
        actionAdvice || finalSpell,
        '',
        'ÇÑÁÙ °á·Ğ',
        oneLineConclusion || finalSpell,
        '',
        keyLine
      ].join('\n');
    }

    if (aiConsult) {
      return [
        'Ä«µå ±â¹İ Gemini »ó´ã ¸®Æ÷Æ® ¡¤ ' + title,
        '',
        aiConsult,
        '',
        '¿ä¾à',
        summary || 'Áö±İÀÇ Èå¸§Àº ºÒ¾ÈÀÌ ¾Æ´Ï¶ó, ¹æÇâÀ» ´Ù½Ã ¸ÂÃß¶ó´Â ½ÅÈ£·Î ÀĞÈü´Ï´Ù.',
        '',
        'ÇÙ½É Å°¿öµå',
        keyLine,
        aiActions.length ? '' : '',
        aiActions.length ? 'Áö±İ ¹Ù·Î ÇÒ ÀÏ' : '',
        aiActions.length ? ('- ' + aiActions.join('\n- ')) : '',
        '',
        '¸¶¹«¸® ÇÑÁÙ',
        finalSpell
      ].filter(Boolean).join('\n');
    }

    return [
      '»ó´ãÇü °á·Ğ ¡¤ ' + title,
      '',
      'ÇöÀç »óÈ²',
      summary || 'Áö±İÀÇ Èå¸§Àº ¾ÆÁ÷ Á¤¸®µÇÁö ¾Ê¾Ò½À´Ï´Ù.',
      '',
      '½ÇÁ¦ Çàµ¿ Á¶¾ğ',
      finalSpell,
      '',
      keyLine
    ].join('\n');
  }
  function revealGoldenStage() {
    if (!state.reading) {
      setInteractionLocked(false);
      return;
    }

    var card = document.querySelector('.dream-ritual-card[data-dream-stage="4"]');
    var title = $('dreamStageTitle');
    var nextBtn = $('dreamNextStageBtn');
    var stageText = $('dreamStageText');
    var goldenWrap = $('dreamGoldenAdviceWrap');
    var goldenText = $('dreamGoldenAdvice');

    if (nextBtn) nextBtn.style.display = 'none';
    if (stageText) stageText.textContent = '';
    if (title) title.textContent = '4?¨ê³„ Â· ?©ê¸ˆ ì¹´ë“œ???ë§ ì¡°ì–¸';

    triggerGoldenImpactFeedback();
    setGoldenTabVisible(true);
    updateVisibleStage(4);

    if (card) {
      card.classList.add('is-open');
      card.classList.remove('is-revealing');
      card.classList.remove('is-impact');
      card.classList.add('is-crowning');
      window.requestAnimationFrame(function () {
        card.classList.add('is-revealing');
        card.classList.add('is-impact');
      });
      setTimeout(function () {
        card.classList.remove('is-revealing');
        card.classList.remove('is-impact');
      }, 900);
      setTimeout(function () {
        card.classList.remove('is-crowning');
      }, 2600);
    }

    if (goldenWrap) goldenWrap.style.display = 'block';
    if (!goldenText) {
      state.typingStage = 0;
      state.stageDone[4] = true;
      state.nextStage = 5;
      sendAutoTuneSignal('completed_golden', 0.95, state.reading, { oncePerReading: true });
      setInteractionLocked(false);
      return;
    }
    state.typingStage = 4;
    typeText(goldenText, normalizedGoldenAdvice(state.reading), 13, function () {
      var finalConsultWrap = $('dreamFinalConsultWrap');
      var finalConsultText = $('dreamFinalConsult');
      if (finalConsultWrap) finalConsultWrap.style.display = 'block';

      if (!finalConsultWrap || !finalConsultText) {
        state.typingStage = 0;
        state.stageDone[4] = true;
        state.nextStage = 5;
        sendAutoTuneSignal('completed_golden', 0.95, state.reading, { oncePerReading: true });
        setInteractionLocked(false);
        setWizardLine('?©ê¸ˆ ì¹´ë“œê°€ ?„í•œ ì¡°ì–¸ê¹Œì? ?„ì„±?˜ì—ˆ?µë‹ˆ?? ?¤ëŠ˜??ë¦¬ë“¬???¤ì •?˜ê²Œ ì§€ì¼œì£¼?¸ìš”.');
        return;
      }

      state.typingStage = 5;
      typeText(finalConsultText, buildFinalConsulting(state.reading), 12, function () {
        state.typingStage = 0;
        state.stageDone[4] = true;
        state.nextStage = 5;
        sendAutoTuneSignal('completed_golden', 0.95, state.reading, { oncePerReading: true });
        setInteractionLocked(false);
        setWizardLine('?©ê¸ˆ ì¹´ë“œ ì¡°ì–¸ê³?ìµœì¢… ì»¨ì„¤?…ì´ ëª¨ë‘ ?„ì„±?˜ì—ˆ?µë‹ˆ?? ì§€ê¸?ë°”ë¡œ ?¤í–‰????ê°€ì§€ë¥??•í•´ë³´ì„¸??');
      });
    });
  }

  function scheduleGoldenStageReveal() {
    clearGoldenTimer();
    setWizardLine('???¥ì˜ ?œì‚¬ê°€ ?˜ë‚˜ë¡?ê²°í•©?˜ëŠ” ì¤‘ì…?ˆë‹¤. 1.5ì´????©ê¸ˆ ì¹´ë“œê°€ ?´ë¦½?ˆë‹¤.');
    state.goldenTimer = setTimeout(function () {
      state.goldenTimer = null;
      revealGoldenStage();
    }, 1500);
  }

  window.openDreamModal = function openDreamModal() {
    var overlay = $('dreamModalOverlay');
    if (!overlay) return;

    // Always enter through the question input step, not the previous result state.
    if (typeof window.dreamReset === 'function') {
      window.dreamReset();
    }

    overlay.style.display = 'block';
    overlay.scrollTop = 0;
    setBodyLock(true);
    ensureAudioContext();
    window.requestAnimationFrame(function () {
      overlay.classList.add('dream-ledger-overlay--show');
    });
    syncInputEnergy();
    setWizardLine('ë°˜ê°‘?µë‹ˆ?? ë¬´ì˜?ì˜ ?¬í–‰?ì—¬. ë§ˆë²•ì±…ì˜ ?œì?ë¥??´ê³  ?¤ëŠ˜ ë°¤ì˜ ?¥ë©´???ì–´ì£¼ì„¸??');
    renderSpeedButtons();
    renderToneButtons();
    renderDreamLibraryCategoryButtons();
    renderDreamLibraryList();

    // On mobile, move viewport to the input area and open keyboard quickly.
    window.setTimeout(function () {
      var input = $('dreamInput');
      if (!input) return;
      try {
        input.focus({ preventScroll: false });
      } catch (_) {
        input.focus();
      }
      if (typeof input.scrollIntoView === 'function') {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  window.closeDreamModal = function closeDreamModal() {
    stopTyping();
    clearGoldenTimer();
    setInteractionLocked(false);
    var overlay = $('dreamModalOverlay');
    if (!overlay) return;
    overlay.classList.remove('dream-ledger-overlay--show');
    window.setTimeout(function () {
      if (!overlay.classList.contains('dream-ledger-overlay--show')) {
        overlay.style.display = 'none';
      }
    }, 220);
    setBodyLock(false);
  };

  window.dreamReset = function dreamReset() {
    stopTyping();
    clearGoldenTimer();
    clearAutoRevealTimer();
    setInteractionLocked(false);
    hideDreamLibrarySuggestions();
    state.reading = null;
    state.outcomeSignals = {};
    $('dreamInput').value = '';
    $('dreamResultWrap').style.display = 'none';
    if ($('dreamArchivePanel')) $('dreamArchivePanel').style.display = 'none';
    $('dreamLoader').style.display = 'none';
    setLoaderText('?˜ì •êµ¬ìŠ¬??ê¿ˆì˜ ?Œì¥???˜ì§‘ ì¤‘ì…?ˆë‹¤...');
    resetCards();
    renderKeywordChips([]);
    $('dreamStageTitle').textContent = 'ì¹´ë“œë¥??´ì–´ ?¨ê²¨ì§?ë¬¸ì¥???•ì¸?˜ì„¸??';
    $('dreamStageText').textContent = '';
    $('dreamFinalSpell').textContent = '';
    var spellWrap = $('dreamFinalSpellWrap');
    if (spellWrap) spellWrap.style.display = 'none';
    var goldenWrap = $('dreamGoldenAdviceWrap');
    if (goldenWrap) goldenWrap.style.display = 'none';
    var goldenText = $('dreamGoldenAdvice');
    if (goldenText) goldenText.textContent = '';
    var finalConsultWrap = $('dreamFinalConsultWrap');
    if (finalConsultWrap) finalConsultWrap.style.display = 'none';
    var finalConsultText = $('dreamFinalConsult');
    if (finalConsultText) finalConsultText.textContent = '';
    setWizardLine('?„ê?(ë¬´ì—‡?? ?´ë–¤ ?‰ë™???ˆê³ , ?¹ì‹ ??ê°ì •???´ë–»ê²??”ë“¤?¸ëŠ”ì§€ ?ì–´ì£¼ì„¸??');
    updateAutoRevealUi();
    updateStoryModeLabel();
    renderToneButtons();
    renderDreamLibraryCategoryButtons();
    renderDreamLibraryList();
    syncInputEnergy();
  };

  function mergeTarotApiIntoReading(localReading, drawData, readingData) {
    var apiCards = Array.isArray(drawData.cards) ? drawData.cards : [];
    var apiReadingObj = (readingData && readingData.reading) ? readingData.reading : {};
    var cardNarratives = Array.isArray(apiReadingObj.cardNarratives)
      ? apiReadingObj.cardNarratives
      : [];

    // ë½‘íŒ ?¤ì œ ?€ë¡?ì¹´ë“œ ?•ë³´ë¡?ì¹´ë“œ ?´ë¦„Â·?´ë?ì§€Â·?¤ì›Œ???…ë°?´íŠ¸
    if (Array.isArray(localReading.cards)) {
      for (var i = 0; i < Math.min(localReading.cards.length, apiCards.length); i++) {
        var ac = apiCards[i];
        var lc = localReading.cards[i];
        if (!ac || !lc) continue;
        var orientLabel = ac.orientation === 'reversed' ? ' (??°©??' : '';
        if (ac.nameKr || ac.name) {
          lc.card_name = (ac.nameKr || ac.name) + orientLabel;
        }
        var imgUrl = ac.localImageUrl || ac.imageUrl || ac.proxyImageUrl || '';
        if (imgUrl) lc.tarot_image_url = imgUrl;
        if (Array.isArray(ac.keywords) && ac.keywords.length) {
          lc.energy_keyword = ac.keywords.slice(0, 2).join(' Â· ');
        }
      }
    }

    // ?€ë¡?ì¹´ë“œ ?´ì„??ê°??¨ê³„ ?œì‚¬ë¡??ì—°?¤ëŸ½ê²??©ì¹œ??
    function cardOrientLabel(card) {
      if (!card) return '';
      return card.orientation === 'reversed' ? '??°©?? : '?•ë°©??;
    }

    function cardLabel(idx) {
      var ac = apiCards[idx];
      return ac && (ac.nameKr || ac.name) ? (ac.nameKr || ac.name) : (idx + 1) + 'ë²ˆì§¸ ì¹´ë“œ';
    }

    function buildStageText(baseText, idx) {
      var base = String(baseText || '').trim();
      var narrative = cardNarratives[idx] && cardNarratives[idx].interpretation
        ? String(cardNarratives[idx].interpretation || '').trim()
        : '';
      if (!narrative) return base;
      var ac = apiCards[idx] || {};
      var cardName = cardLabel(idx);
      var orient = cardOrientLabel(ac);
      var keywords = Array.isArray(ac.keywords) ? ac.keywords.slice(0, 3).join(' Â· ') : '';
      var header = '?€ë¡?' + cardName + (orient ? ' (' + orient + ')' : '')
        + (keywords ? '???µì‹¬ ?¤ì›Œ?œëŠ” ' + keywords + ' ?…ë‹ˆ??' : '???ë¦„??? ëª…?©ë‹ˆ??');
      if (!base) return header + '\n' + narrative;
      return header + '\n' + narrative + '\n\n' + base;
    }

    if (cardNarratives[0] && cardNarratives[0].interpretation) {
      localReading.scene = buildStageText(localReading.scene, 0);
    }
    if (cardNarratives[1] && cardNarratives[1].interpretation) {
      localReading.symbol = buildStageText(localReading.symbol, 1);
    }
    if (cardNarratives[2] && cardNarratives[2].interpretation) {
      localReading.echo = buildStageText(localReading.echo, 2);
    }

    // ?€ë¡?ì¢…í•© ì¡°ì–¸???©ê¸ˆ ì¹´ë“œ ì¡°ì–¸???µí•©
    if (apiReadingObj.advice) {
      localReading.goldenAdvice = (localReading.goldenAdvice || '')
        + '\n\n?í?ë¡?ì¢…í•© ì¡°ì–¸??n' + apiReadingObj.advice;
    }

    return localReading;
  }

  function buildConsultCardsPayload(reading, drawData) {
    var apiCards = drawData && Array.isArray(drawData.cards) ? drawData.cards : [];
    if (apiCards.length) {
      return apiCards.slice(0, 3).map(function (card, idx) {
        var name = String(card.nameKr || card.name || ('ì¹´ë“œ ' + (idx + 1))).trim();
        var orientation = card.orientation === 'reversed' ? 'reversed' : 'upright';
        var keywords = Array.isArray(card.keywords) ? card.keywords.slice(0, 5) : [];
        return {
          name: name,
          orientation: orientation,
          keywords: keywords,
          imageUrl: String(card.localImageUrl || card.imageUrl || card.proxyImageUrl || '').trim(),
          symbol: String(card.symbol || '').trim()
        };
      });
    }

    var localCards = reading && Array.isArray(reading.cards) ? reading.cards : [];
    return localCards.slice(0, 3).map(function (card, idx) {
      var keywords = String(card.energy_keyword || '')
        .split(/\s*Â·\s*/)
        .map(function (v) { return String(v || '').trim(); })
        .filter(Boolean)
        .slice(0, 5);
      return {
        name: String(card.card_name || ('ì¹´ë“œ ' + (idx + 1))).trim(),
        orientation: 'upright',
        keywords: keywords,
        imageUrl: String(card.tarot_image_url || '').trim(),
        symbol: String(card.symbol || '').trim()
      };
    });
  }

  function mergeDreamConsultIntoReading(localReading, consultRecord) {
    if (!localReading || !consultRecord) return localReading;
    var merged = localReading;

    if (consultRecord.summary) {
      merged.summary = String(consultRecord.summary || '').trim() || merged.summary;
    }
    if (consultRecord.goldenAdvice) {
      merged.goldenAdvice = String(consultRecord.goldenAdvice || '').trim() || merged.goldenAdvice;
    }
    if (consultRecord.consultingText) {
      merged.aiConsultMarkdown = String(consultRecord.consultingText || '').trim();
    }
    if (Array.isArray(consultRecord.actionPlan)) {
      merged.aiActionPlan = consultRecord.actionPlan.slice(0, 3).map(function (item) {
        return String(item || '').trim();
      }).filter(Boolean);
    }
    if (consultRecord.model) {
      merged.aiModel = String(consultRecord.model || '').trim();
    }

    var stageReadings = consultRecord.stageReadings && typeof consultRecord.stageReadings === 'object'
      ? consultRecord.stageReadings
      : null;
    if (stageReadings) {
      if (stageReadings.scene) merged.scene = String(stageReadings.scene || '').trim() || merged.scene;
      if (stageReadings.symbol) merged.symbol = String(stageReadings.symbol || '').trim() || merged.symbol;
      if (stageReadings.echo) merged.echo = String(stageReadings.echo || '').trim() || merged.echo;
    }

    if (consultRecord.usedDreamText) {
      merged.usedDreamText = String(consultRecord.usedDreamText || '').trim();
    }
    if (Array.isArray(consultRecord.usedTarotCards)) {
      merged.usedTarotCards = consultRecord.usedTarotCards.slice(0, 3);
    }
    if (Array.isArray(consultRecord.keywords)) {
      merged.keywords = consultRecord.keywords.slice(0, 12);
    }

    return merged;
  }

  window.startDreamReading = function startDreamReading() {
    if (state.uiLocked) return;
    var input = $('dreamInput');
    var text = input ? input.value.trim() : '';
    if (input && typeof input.blur === 'function') input.blur();

    if (!text) {
      setLoaderText('?„ê?(ë¬´ì—‡?? ?´ë–¤ ?‰ë™???ˆê³  ?´ë–¤ ê°ì •???ê¼ˆ?”ì? ?¨ê»˜ ?ì–´ì£¼ì„¸??');
      $('dreamLoader').style.display = 'block';
      setTimeout(function () {
        $('dreamLoader').style.display = 'none';
      }, 1300);
      return;
    }

    var ai = window.DreamLedgerAI;
    if (!ai || typeof ai.interpretDream !== 'function') {
      setLoaderText('?œë¦¼ ?€ë¡??”ì§„??ë¶ˆëŸ¬?¤ëŠ” ì¤‘ì…?ˆë‹¤...');
      $('dreamLoader').style.display = 'block';
      ensureDreamLedgerAiReady().then(function (loadedAi) {
        if (loadedAi && typeof loadedAi.interpretDream === 'function') {
          window.startDreamReading();
          return;
        }
        setLoaderText('?œë¦¼ ?€ë¡??”ì§„??ì´ˆê¸°?”í•˜ì§€ ëª»í–ˆ?µë‹ˆ?? ? ì‹œ ???¤ì‹œ ?œë„??ì£¼ì„¸??');
        setTimeout(function () {
          $('dreamLoader').style.display = 'none';
        }, 1500);
      });
      return;
    }

    resetCards();
    ensureAudioContext();
    setInteractionLocked(true);
    $('dreamResultWrap').style.display = 'none';
    $('dreamLoader').style.display = 'block';

    syncInputEnergy();
    setWizardLine('ì§€?¡ì´ë¥??¤ì–´ ê¿ˆì˜ ?¥ë©´???Œí™˜?©ë‹ˆ?? ì¹´ë“œê°€ ì°¨ë??€ë¡??œì‚¬ë¥??¤ë ¤ì¤?ê±°ì˜ˆ??');
    setLoaderText('?˜ì •êµ¬ìŠ¬???ì§•??ê²°ì„ ?½ëŠ” ì¤?..');
    setTimeout(function () { setLoaderText('?¤ì œ ?€ë¡?ì¹´ë“œ??ê¿ˆì˜ ?œì‚¬ë¥??ˆê¸°??ì¤?..'); }, 700);

    setTimeout(function () {
      var reading;
      try {
        reading = ai.interpretDream(text, { goldenTone: state.goldenTone });
      } catch (err) {
        var msg = err && err.message ? err.message : '?„ê?(ë¬´ì—‡?? ?´ë–¤ ?‰ë™???ˆê³ , ?´ë–¤ ê°ì •???ê¼ˆ?”ì? ?ì–´ì£¼ì„¸??';
        setLoaderText(msg);
        setWizardLine('?ì§• ê³µëª…???ë ¤ì¡ŒìŠµ?ˆë‹¤. ?…ë ¥???¤ì‹œ ?•ëˆ??ì£¼ì„¸??');
        setTimeout(function () {
          $('dreamLoader').style.display = 'none';
          setInteractionLocked(false);
        }, 1500);
        return;
      }

      function finalizeReading(enhancedReading) {
        if (Array.isArray(enhancedReading._pipelineFallbacks) && enhancedReading._pipelineFallbacks.length) {
          enhancedReading.fallbackReason = enhancedReading._pipelineFallbacks.join(' | ');
          console.warn('[DreamTarot] partial-fallback', {
            reasons: enhancedReading._pipelineFallbacks,
            fallbackReason: enhancedReading.fallbackReason
          });
          setWizardLine('?¼ë? ì¹´ë“œ ?ë‹´??ì§€?°ë˜??ë¡œì»¬ ?´ëª½ê³?ë³‘í•©??ë§ˆë²•ì±…ì„ ?„ì„±?ˆìŠµ?ˆë‹¤.');
        }
        hydrateReading(enhancedReading);
        setInteractionLocked(false);
        var resultWrap = $('dreamResultWrap');
        if (resultWrap && typeof resultWrap.scrollIntoView === 'function') {
          window.setTimeout(function () {
            resultWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        }
      }

      // ?€ë¡?APIë¡??¤ì œ ì¹´ë“œ ë½‘ê¸° ??ë¦¬ë”© ê°•í™” ??dream ?ë‹´ ë³‘í•© ??ìµœì¢…??      var pipelineFallbacks = [];
      var dreamLibraryContext = buildDreamLibraryContext(text);

      setLoaderText('?€ë¡?ì¹´ë“œê°€ ê¿ˆì˜ ?¸ì–´ë¥??½ëŠ” ì¤‘ì…?ˆë‹¤...');
      callDreamTarotApi('draw', { spreadType: 'three_card_past_present_future' })
        .then(function (drawData) {
          if (!drawData || !Array.isArray(drawData.cards) || drawData.cards.length < 3) {
            pipelineFallbacks.push('draw:cards-missing');
            return null;
          }
          return callDreamTarotApi('reading', {
            category: 'dream_tarot',
            spreadType: 'three_card_past_present_future',
            cards: drawData.cards,
            dreamText: text,
            userQuestion: '??ê¿ˆì˜ ?µì‹¬ ?ì§•???€ë¡?3?¥ìœ¼ë¡?êµ¬ì²´ ?´ì„?´ì¤˜: ' + text,
            userContext: {
              dreamText: text,
              localSummary: String(reading.summary || '').trim(),
              localStageReadings: {
                scene: String(reading.scene || '').trim(),
                symbol: String(reading.symbol || '').trim(),
                echo: String(reading.echo || '').trim()
              },
              dreamLibraryContext: dreamLibraryContext,
              tone: state.goldenTone
            }
          })
          .then(function (readingData) {
            return { drawData: drawData, readingData: readingData };
          })
          .catch(function (error) {
            pipelineFallbacks.push('reading:' + String(error && error.message || 'failed'));
            console.warn('[DreamTarot] reading-fallback', error);
            return { drawData: drawData, readingData: null };
          });
        })
        .then(function (apiResult) {
          var drawData = apiResult && apiResult.drawData ? apiResult.drawData : null;
          var readingData = apiResult && apiResult.readingData ? apiResult.readingData : null;
          var consultCards = buildConsultCardsPayload(reading, drawData);

          if (apiResult && apiResult.drawData) {
            reading = mergeTarotApiIntoReading(reading, drawData, readingData);
          } else {
            pipelineFallbacks.push('draw:skipped');
          }

          setLoaderText('ì¹´ë“œ ì¡°í•©?¼ë¡œ ?ë‹´ ë©”ì‹œì§€ë¥??•ë¦¬?˜ëŠ” ì¤?..');
          return callDreamApi('tarot-consult', {
            dreamText: text,
            spreadType: 'three_card_past_present_future',
            tone: state.goldenTone,
            cards: consultCards,
            summary: reading.summary,
            localReading: {
              title: String(reading.title || '').trim(),
              summary: String(reading.summary || '').trim(),
              scene: String(reading.scene || '').trim(),
              symbol: String(reading.symbol || '').trim(),
              echo: String(reading.echo || '').trim(),
              keywords: Array.isArray(reading.keywords) ? reading.keywords.slice(0, 8) : []
            },
            tarotNarratives: readingData && readingData.reading && Array.isArray(readingData.reading.cardNarratives)
              ? readingData.reading.cardNarratives.slice(0, 3)
              : [],
            dreamLibraryContext: dreamLibraryContext
          })
          .then(function (consultData) {
            if (consultData && consultData.record) {
              reading = mergeDreamConsultIntoReading(reading, consultData.record);
            }
            reading._pipelineFallbacks = pipelineFallbacks.slice();
            finalizeReading(reading);
          })
          .catch(function (error) {
            pipelineFallbacks.push('consult:' + String(error && error.message || 'failed'));
            console.warn('[DreamTarot] consult-fallback', error);
            reading._pipelineFallbacks = pipelineFallbacks.slice();
            finalizeReading(reading);
          });
        })
        .catch(function (error) {
          pipelineFallbacks.push('pipeline:' + String(error && error.message || 'failed'));
          console.warn('[DreamTarot] pipeline-fallback', error);
          reading._pipelineFallbacks = pipelineFallbacks.slice();
          finalizeReading(reading);
        });
    }, 1450);
  };

  window.revealDreamStage = function revealDreamStage(stage) {
    var s = Number(stage);
    if (state.uiLocked) return;
    if (s < 1 || s > 3) return;
    if (!state.reading || state.stageDone[s]) return;
    if (state.typingStage) return;
    if (s !== state.visibleStage) return;
    if (s !== state.nextStage) {
      setWizardLine('?œì„œë¥?ì§€ì¼œì£¼?¸ìš”. ì²?ì¹´ë“œë¶€???´ë©´ ?œì‚¬ê°€ ?¨ì „???´ì–´ì§‘ë‹ˆ??');
      return;
    }

    setInteractionLocked(true);

    var card = document.querySelector('.dream-ritual-card[data-dream-stage="' + s + '"]');
    var target = $('dreamStageText');
    var title = $('dreamStageTitle');
    if (!target) {
      setInteractionLocked(false);
      return;
    }

    var payload = stagePayload(s);
    if (title) title.textContent = payload.title;
    if (card) {
      card.classList.add('is-flipping');
      card.classList.add('is-open');
      card.classList.remove('is-revealing');
      card.classList.remove('is-impact');
      window.requestAnimationFrame(function () {
        card.classList.add('is-revealing');
        card.classList.add('is-impact');
      });
      setTimeout(function () {
        card.classList.remove('is-flipping');
        card.classList.remove('is-revealing');
        card.classList.remove('is-impact');
      }, 800);
    }

    state.typingStage = s;
    scrollStoryToLatest(true);
    typeText(target, payload.text, 17, function () {
      state.stageDone[s] = true;
      state.nextStage += 1;
      state.typingStage = 0;
      renderStageProgress();
      updateDrawGuide();
      var nextBtn = $('dreamNextStageBtn');
      if (nextBtn) nextBtn.style.display = s < 3 ? 'block' : 'none';

      if (s < 3) {
        setInteractionLocked(false);
        if (state.autoReveal) {
          setWizardLine('??…???„ë£Œ?˜ì—ˆ?µë‹ˆ?? ?ë™?¼ë¡œ ?¤ìŒ ?¨ê³„ë¡??´ì–´ì§‘ë‹ˆ??');
          queueAutoReveal(420);
        } else {
          setWizardLine('??…???„ë£Œ?˜ì—ˆ?µë‹ˆ?? ì¶©ë¶„???½ìœ¼????"?¤ìŒ ì¹´ë“œ ë³´ê¸°"ë¥??ŒëŸ¬ ì§„í–‰??ì£¼ì„¸??');
        }
      }

      if (s === 3) {
        var spellText = '?¤ëŠ˜???‰ìš´ ì£¼ë¬¸: ' + normalizedFinalSpell(state.reading);
        var spellWrap = $('dreamFinalSpellWrap');
        if (spellWrap) spellWrap.style.display = 'block';
        typeText($('dreamFinalSpell'), spellText, 14, function () {
          scheduleGoldenStageReveal();
        });
      }
    });

    if (s === 1) setWizardLine('ì²??¥ì´ ?´ë ¸?µë‹ˆ?? ??ë²ˆì§¸ ì¹´ë“œ?ì„œ ?„ì¬???„ì–¸??ë°›ì•„ë³´ì„¸??');
    if (s === 2) setWizardLine('?œì‚¬ê°€ ë¬´ë¥´?µì—ˆ?µë‹ˆ?? ë§ˆì?ë§?ì¹´ë“œê°€ ?´ì¼??ë°©í–¥??ë°í?ì¤ë‹ˆ??');
  };

  window.nextDreamStage = function nextDreamStage() {
    if (state.uiLocked) {
      setWizardLine('?°ì¶œ??ì§„í–‰ ì¤‘ì…?ˆë‹¤. ? ì‹œë§?ê¸°ë‹¤?¤ì£¼?¸ìš”.');
      return;
    }
    if (state.typingStage) {
      setWizardLine('??…???ë‚œ ???¤ìŒ ?¥ìœ¼ë¡??˜ì–´ê°????ˆì–´??');
      return;
    }
    var current = state.visibleStage;
    if (!state.stageDone[current]) {
      setWizardLine('?„ì¬ ì¹´ë“œ??ë¬¸ì¥??ë¨¼ì? ?´ì–´ì£¼ì„¸??');
      return;
    }
    if (current >= 3) return;

    var next = current + 1;
    updateVisibleStage(next);
    $('dreamStageTitle').textContent = next === 2 ? '2?¨ê³„ ì¹´ë“œë¥??ŒëŸ¬ ?„ì–¸???¬ì„¸??' : '3?¨ê³„ ì¹´ë“œë¥??ŒëŸ¬ ì§€ì¹¨ì„ ?¬ì„¸??';
    $('dreamStageText').textContent = '';
    var nextBtn = $('dreamNextStageBtn');
    if (nextBtn) nextBtn.style.display = 'none';
    setWizardLine(next === 2 ? '???¥ì´ ?¼ì³ì¡ŒìŠµ?ˆë‹¤. ì¹´ë“œ??ëª©ì†Œë¦¬ë? ?¤ì–´ë³´ì„¸??' : '???¥ì´ ?´ë ¸?µë‹ˆ?? ë§ˆì?ë§??¥ë©´??ê¸°ë‹¤ë¦½ë‹ˆ??');

    if (state.autoReveal) {
      queueAutoReveal(320);
    }
  };

  window.dreamSetTextSpeed = function dreamSetTextSpeed(multiplier) {
    var value = Number(multiplier);
    if (!isFinite(value)) value = 1;
    value = Math.max(0.5, Math.min(2.5, value));
    state.textSpeed = value;
    renderSpeedButtons();
    if (state.typingTimer && state.typingContext) restartTypingTimer();
    setWizardLine('??… ë°°ì†??' + speedLabel(value) + 'xë¡?ì¡°ì •?ˆìŠµ?ˆë‹¤.');
  };

  window.dreamSetGoldenTone = function dreamSetGoldenTone(tone) {
    if (state.uiLocked) return;
    state.goldenTone = normalizeGoldenTone(tone);
    renderToneButtons();
    setWizardLine('?©ê¸ˆ ì¹´ë“œ ì¡°ì–¸ ?¤ì„ ' + toneLabel(state.goldenTone) + ' ëª¨ë“œë¡?ë§ì·„?µë‹ˆ??');
  };

  window.dreamToggleAutoReveal = function dreamToggleAutoReveal() {
    if (state.uiLocked) return;
    state.autoReveal = !state.autoReveal;
    updateAutoRevealUi();
    if (!state.autoReveal) {
      clearAutoRevealTimer();
      setWizardLine('?˜ë™ ëª¨ë“œë¡??„í™˜?ˆìŠµ?ˆë‹¤. ?í•˜???€?´ë°??ì¹´ë“œë¥?ì§ì ‘ ?¬ì„¸??');
      return;
    }
    setWizardLine('?ë™ ëª¨ë“œë¡??„í™˜?ˆìŠµ?ˆë‹¤. ì¹´ë“œê°€ ?œì„œ?€ë¡??´ì–´ì§‘ë‹ˆ??');
    queueAutoReveal(260);
  };

  window.dreamLibrarySetCategory = function dreamLibrarySetCategory(category) {
    if (state.uiLocked) return;
    state.libraryCategory = normalizeLibraryCategory(category);
    state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
    hideDreamLibrarySuggestions();
    renderDreamLibraryCategoryButtons();
    renderDreamLibraryList();
    setWizardLine('ê¿??´ëª½ ?¼ì´ë¸ŒëŸ¬ë¦¬ë? [' + (DREAM_LIBRARY_CATEGORY_LABELS[state.libraryCategory] || '?„ì²´') + '] ì¹´í…Œê³ ë¦¬ë¡??„í™˜?ˆìŠµ?ˆë‹¤.');
  };

  window.dreamLibrarySearch = function dreamLibrarySearch() {
    if (state.uiLocked) return;
    var input = $('dreamLibraryQuery');
    state.libraryQuery = input ? String(input.value || '').trim() : '';
    state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
    hideDreamLibrarySuggestions();
    renderDreamLibraryList();
    setWizardLine(state.libraryQuery ? '?¤ì›Œ??[' + state.libraryQuery + ']ë¡?ê¿??ì§•???ìƒ‰?ˆìŠµ?ˆë‹¤.' : 'ê²€?‰ì–´ê°€ ë¹„ì–´ ?ˆì–´ ?„ì²´ ê¿??ì§•???œì‹œ?©ë‹ˆ??');
  };

  window.dreamLibrarySearchByDream = function dreamLibrarySearchByDream() {
    if (state.uiLocked) return;
    var input = $('dreamLibraryQuery');
    var inferred = deriveLibraryQueryFromDream();
    if (!inferred) {
      setWizardLine('ê¿?ë¬¸ì¥?ì„œ ê²€???¤ì›Œ?œë? ì°¾ì? ëª»í–ˆ?µë‹ˆ?? ê¿??´ìš©??ë¨¼ì? ?…ë ¥?˜ê±°??ì§ì ‘ ê²€?‰ì–´ë¥??…ë ¥??ì£¼ì„¸??');
      return;
    }
    state.libraryQuery = inferred;
    state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
    if (input) input.value = inferred;
    hideDreamLibrarySuggestions();
    renderDreamLibraryList();
    setWizardLine('?„ì¬ ê¿?ë¬¸ì¥??ê¸°ë°˜?¼ë¡œ [' + inferred + '] ê²€?‰ì„ ?¤í–‰?ˆìŠµ?ˆë‹¤.');
  };

  window.dreamLibraryPickSuggestion = function dreamLibraryPickSuggestion(actionEl) {
    if (state.uiLocked) return;
    var value = '';
    if (actionEl && typeof actionEl.getAttribute === 'function') {
      value = String(actionEl.getAttribute('data-suggest') || '').trim();
    }
    if (!value) return;

    var input = $('dreamLibraryQuery');
    if (input) input.value = value;

    state.libraryQuery = value;
    state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
    hideDreamLibrarySuggestions();
    renderDreamLibraryList();
    setWizardLine('ì¶”ì²œ??[' + value + ']ë¥??ìš©??ê¿??ì§•??ê²€?‰í–ˆ?µë‹ˆ??');
  };

  window.dreamLibraryClearSearch = function dreamLibraryClearSearch() {
    if (state.uiLocked) return;
    var input = $('dreamLibraryQuery');
    if (input) input.value = '';
    state.libraryQuery = '';
    state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
    hideDreamLibrarySuggestions();
    renderDreamLibraryList();
    setWizardLine('ê¿??´ëª½ ?¼ì´ë¸ŒëŸ¬ë¦?ê²€?‰ì–´ë¥?ì´ˆê¸°?”í–ˆ?µë‹ˆ??');
  };

  window.dreamLibraryLoadMore = function dreamLibraryLoadMore() {
    if (state.uiLocked) return;
    state.libraryLimit += DREAM_LIBRARY_PAGE_SIZE;
    renderDreamLibraryList();
  };

  window.dreamOpenArchive = function dreamOpenArchive() {
    var panel = $('dreamArchivePanel');
    if (!panel) return;
    if (state.reading) {
      var saved = saveCurrentReadingToArchive();
      if (saved) {
        sendAutoTuneSignal('saved_archive', 1.15, state.reading, { oncePerReading: true });
        setWizardLine('?„ì¬ ?´ëª½??ê¿??€?¥ì†Œ??ë³´ê??ˆìŠµ?ˆë‹¤.');
      }
    }
    renderArchiveList();
    panel.style.display = 'block';
    if (typeof panel.scrollIntoView === 'function') {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  window.dreamCloseArchive = function dreamCloseArchive() {
    var panel = $('dreamArchivePanel');
    if (!panel) return;
    panel.style.display = 'none';
  };

  window.dreamLoadArchiveAt = function dreamLoadArchiveAt(id) {
    var list = readArchive();
    var found = list.find(function (it) { return it.id === id; });
    if (!found || !found.reading) return;
    resetCards();
    hydrateReading(found.reading);
    sendAutoTuneSignal('revisit_archive', 1.0, found.reading, { oncePerReading: true });
    setWizardLine('?€?¥ëœ ?´ëª½???¤ì‹œ ?¼ì³¤?µë‹ˆ?? ì¹´ë“œ ?œì„œ?€ë¡??¤ì‹œ ?•ì¸?´ë³´?¸ìš”.');
  };

  window.dreamDeleteArchiveAt = function dreamDeleteArchiveAt(id) {
    var list = readArchive().filter(function (it) { return it.id !== id; });
    writeArchive(list);
    renderArchiveList();
  };

  function buildShareText() {
    if (!state.reading) return '?œë¦¼ ?€ë¡??´ëª½ ê²°ê³¼ë¥??•ì¸?´ë³´?¸ìš”.';
    return [
      state.reading.title,
      state.reading.summary,
      '[?¨ê²¨ì§?ê·¼ì›] ' + state.reading.scene,
      '[?„ì¬???„ì–¸] ' + state.reading.symbol,
      '[?´ì¼??ì§€ì¹? ' + state.reading.echo,
      '[?©ê¸ˆ ì¡°ì–¸] ' + normalizedGoldenAdvice(state.reading),
      '?‰ìš´ ì£¼ë¬¸: ' + normalizedFinalSpell(state.reading)
    ].join('\n\n');
  }

  window.dreamShareCard = function dreamShareCard() {
    var shareText = buildShareText();

    if (navigator.share) {
      navigator.share({
        title: 'ë¬´ì˜?ì˜ ë§ˆë²• ?ì : ?œë¦¼ ?€ë¡?,
        text: shareText
      }).then(function () {
        sendAutoTuneSignal('shared_result', 1.1, state.reading, { oncePerReading: true });
      }).catch(function () {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(function () {
        sendAutoTuneSignal('shared_result', 1.1, state.reading, { oncePerReading: true });
        alert('?´ëª½ ?ìŠ¤?¸ë? ?´ë¦½ë³´ë“œ??ë³µì‚¬?ˆìŠµ?ˆë‹¤.');
      }).catch(function () {
        alert('ê³µìœ ë¥?ì§€?í•˜ì§€ ?ŠëŠ” ?˜ê²½?…ë‹ˆ??');
      });
      return;
    }

    alert('ê³µìœ ë¥?ì§€?í•˜ì§€ ?ŠëŠ” ?˜ê²½?…ë‹ˆ??');
  };

  document.addEventListener('input', function (event) {
    var target = event.target;
    if (!target) return;
    if (target.id === 'dreamInput') {
      syncInputEnergy();
      return;
    }
    if (target.id === 'dreamLibraryQuery') {
      state.libraryQuery = String(target.value || '').trim();
      state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
      state.librarySuggestIndex = -1;
      renderDreamLibrarySuggestions();
      renderDreamLibraryList();
    }
  });

  document.addEventListener('keydown', function (event) {
    var target = event.target;
    if (!target || target.id !== 'dreamLibraryQuery') return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveDreamLibrarySuggestion(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveDreamLibrarySuggestion(-1);
      return;
    }
    if (event.key === 'Escape') {
      hideDreamLibrarySuggestions();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (state.librarySuggestions.length && state.librarySuggestIndex >= 0) {
        var picked = state.librarySuggestions[state.librarySuggestIndex];
        if (picked && picked.text) {
          var input = $('dreamLibraryQuery');
          if (input) input.value = picked.text;
          state.libraryQuery = picked.text;
          state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
          hideDreamLibrarySuggestions();
          renderDreamLibraryList();
          setWizardLine('ì¶”ì²œ??[' + picked.text + ']ë¥??ìš©??ê¿??ì§•??ê²€?‰í–ˆ?µë‹ˆ??');
          return;
        }
      }
      window.dreamLibrarySearch();
    }
  });

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var inSuggest = target.closest('#dreamLibrarySuggest');
    var inSearch = target.closest('.dream-library-search-row');
    if (inSuggest || inSearch) return;
    hideDreamLibrarySuggestions();
  });

  function bindDirectTapAction(selector, handler) {
    var nodes = document.querySelectorAll(selector);
    if (!nodes || !nodes.length) return;
    nodes.forEach(function (node) {
      if (!node || node.dataset.cdTapBound === '1') return;
      node.dataset.cdTapBound = '1';
      var firedAt = 0;
      function fire(ev) {
        var now = Date.now();
        if (now - firedAt < 260) return;
        firedAt = now;
        if (ev && ev.cancelable) ev.preventDefault();
        if (ev) ev.stopPropagation();
        handler();
      }
      node.addEventListener('click', fire, { passive: false });
      node.addEventListener('touchend', fire, { passive: false });
      node.addEventListener('pointerup', function (ev) {
        if (ev.pointerType && ev.pointerType !== 'touch') return;
        fire(ev);
      }, { passive: false });
    });
  }

  bindDirectTapAction('#dreamModalOverlay .dream-ledger-close, #dreamModalOverlay [data-action="closeDreamModal"]', function () {
    window.closeDreamModal();
  });
  bindDirectTapAction('#dreamModalOverlay [data-action="startDreamReading"]', function () {
    window.startDreamReading();
  });
  bindDirectTapAction('#dreamModalOverlay [data-action="dreamToggleAutoReveal"]', function () {
    window.dreamToggleAutoReveal();
  });

  renderSpeedButtons();
  renderToneButtons();
  updateAutoRevealUi();
  renderDreamLibraryCategoryButtons();
  renderDreamLibraryList();
})();
