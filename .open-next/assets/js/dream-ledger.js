(function () {
  var DREAM_ARCHIVE_KEY = 'dreamLedgerArchiveV1';
  var GOLDEN_TONE_LABELS = {
    comfort: '위로',
    motivation: '동기부여',
    coaching: '코칭'
  };
  var DREAM_LIBRARY_PAGE_SIZE = 18;
  var DREAM_LIBRARY_CATEGORY_LABELS = {
    all: '전체',
    animal: '동물 관련',
    fruit: '과일 관련',
    people: '사람 관련',
    emotion_positive: '감정(긍정)',
    emotion_anger: '감정(분노)',
    emotion_anxiety: '감정(불안)',
    emotion_loss: '감정(상실)',
    emotion_recovery: '감정(회복)',
    place: '장소 키워드',
    object: '사물 키워드',
    taemong: '태몽',
    wealth: '재물운',
    success: '합격운',
    love: '연애운',
    marriage: '결혼운'
  };
  var state = {
    reading: null,
    stageDone: { 1: false, 2: false, 3: false, 4: false },
    nextStage: 1,
    visibleStage: 1,
    textSpeed: 0.5,
    goldenTone: 'comfort',
    typingTimer: null,
    typingStage: 0,
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

  function $(id) {
    return document.getElementById(id);
  }

  function clearGoldenTimer() {
    if (!state.goldenTimer) return;
    clearTimeout(state.goldenTimer);
    state.goldenTimer = null;
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
    if (!tab) return;
    tab.hidden = !visible;
  }

  function setInteractionLocked(locked) {
    state.uiLocked = !!locked;
    var shell = document.querySelector('.dream-ledger-shell');
    if (shell) shell.classList.toggle('dream-ui-locked', state.uiLocked);

    var controls = document.querySelectorAll('[data-action="startDreamReading"], .dream-speed-btn, .dream-tone-btn, .dream-library-chip, .dream-library-btn, .dream-library-suggest-item, #dreamLibraryQuery, #dreamLibraryMoreBtn, #dreamNextStageBtn, .dream-ritual-card[data-action="revealDreamStage"]');
    controls.forEach(function (el) {
      el.disabled = state.uiLocked;
    });
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
    modeEl.textContent = '꿈의 마법책 낭독 모드 · ' + speedLabel(state.textSpeed) + 'x · 황금 톤 ' + toneLabel(state.goldenTone);
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

  function stopTyping() {
    if (state.typingTimer) {
      clearInterval(state.typingTimer);
      state.typingTimer = null;
    }
    state.typingStage = 0;
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
    var i = 0;
    var source = String(text || '');
    var baseSpeed = Number(speed) || 24;
    var interval = Math.max(8, Math.round(baseSpeed / Math.max(1, Number(state.textSpeed) || 1)));
    targetEl.textContent = '';
    state.typingTimer = setInterval(function () {
      i += 1;
      targetEl.textContent = source.slice(0, i);
      scrollStoryToLatest();
      if (i >= source.length) {
        clearInterval(state.typingTimer);
        state.typingTimer = null;
        if (typeof done === 'function') done();
      }
    }, interval);
  }

  function setLoaderText(text) {
    var loaderText = $('dreamLoaderText');
    if (loaderText) loaderText.textContent = text;
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
      metaEl.textContent = '[' + categoryLabel + ']에서 검색 결과를 찾지 못했습니다. 다른 키워드로 시도해보세요.';
      listEl.innerHTML = '<article class="dream-library-item dream-library-item--empty"><h5>검색 결과 없음</h5><p>예: 호랑이, 태몽, 합격, 재물, 연애, 결혼</p></article>';
      if (moreBtn) moreBtn.style.display = 'none';
      return;
    }

    metaEl.textContent = '총 ' + filtered.length + '건 · 카테고리: ' + categoryLabel + (queryText ? ' · 검색어: "' + queryText + '"' : '');

    listEl.innerHTML = visible.map(function (item) {
      var itemCategory = DREAM_LIBRARY_CATEGORY_LABELS[item.category] || item.category;
      return '<article class="dream-library-item">'
        + '<div class="dream-library-item-head">'
        + '<span class="dream-library-badge">' + escapeHtml(itemCategory) + '</span>'
        + '<h5>' + highlightQuery(item.title || (item.keyword + ' 꿈'), queryText) + '</h5>'
        + '</div>'
        + '<p class="dream-library-meaning">' + highlightQuery(item.meaning, queryText) + '</p>'
        + '<p class="dream-library-fortune"><strong>운세 포인트</strong> ' + highlightQuery(item.fortune, queryText) + '</p>'
        + '<p class="dream-library-tip"><strong>실천 팁</strong> ' + highlightQuery(item.tip, queryText) + '</p>'
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
        addSuggestion(keyword, 120, '핵심 키워드');
      } else if (keywordLower.indexOf(query) >= 0) {
        addSuggestion(keyword, 92, '연관 키워드');
      }

      var title = String(item.title || '').trim();
      var titleLower = title.toLowerCase();
      if (titleLower.indexOf(query) === 0) {
        addSuggestion(title, 80, '제목');
      } else if (titleLower.indexOf(query) >= 0) {
        addSuggestion(title, 62, '제목');
      }

      var tags = Array.isArray(item.tags) ? item.tags : [];
      for (var t = 0; t < tags.length; t += 1) {
        var tag = String(tags[t] || '').trim();
        var tagLower = tag.toLowerCase();
        if (!tag) continue;
        if (tagLower.indexOf(query) === 0) {
          addSuggestion(tag, 68, '태그');
        } else if (tagLower.indexOf(query) >= 0) {
          addSuggestion(tag, 48, '태그');
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
      if (nameEl) nameEl.textContent = '[' + (card.card_name || '미지의 상징') + '] 카드';
      if (symbolEl) symbolEl.textContent = card.symbol || '✦';
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
          })(artEl, card.tarot_image_url, card.card_name || '상징', card.symbol || '✦');
        } else {
          artEl.style.backgroundImage = makeKeywordArt(card.card_name || '상징', card.symbol || '✦');
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
      title: state.reading.title || '드림 타로',
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
      listEl.innerHTML = '<div class="dream-archive-item"><div class="dream-archive-meta">저장된 해몽이 없습니다. 해몽 후 [꿈 저장소]를 눌러 보관해보세요.</div></div>';
      return;
    }

    listEl.innerHTML = list.map(function (item) {
      var title = item.title || '드림 타로';
      var summary = (item.summary || '').slice(0, 72);
      return '<article class="dream-archive-item">'
        + '<div class="dream-archive-title">' + title + '</div>'
        + '<div class="dream-archive-meta">' + formatDate(item.createdAt) + ' · ' + summary + '</div>'
        + '<div class="dream-archive-actions">'
          + '<button class="dream-ledger-btn dream-ledger-btn--mini" onclick="dreamLoadArchiveAt(\'' + item.id + '\')">다시 보기</button>'
          + '<button class="dream-ledger-btn dream-ledger-btn--mini" onclick="dreamDeleteArchiveAt(\'' + item.id + '\')">삭제</button>'
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
    $('dreamStageTitle').textContent = '제1장 · 첫 번째 카드가 들려줄 서사를 열어주세요.';
    $('dreamStageText').textContent = '';
    $('dreamFinalSpell').textContent = '';
    var goldenAdviceText = $('dreamGoldenAdvice');
    if (goldenAdviceText) goldenAdviceText.textContent = '';

    var cardName4 = $('dreamCardName4');
    if (cardName4) cardName4.textContent = '[' + (reading.goldenCardName || '황금 카드') + ']';
    var cardSymbol4 = $('dreamCardSymbol4');
    if (cardSymbol4) cardSymbol4.textContent = reading.goldenCardSymbol || '✶';

    var spellWrap = $('dreamFinalSpellWrap');
    if (spellWrap) spellWrap.style.display = 'none';
    var goldenWrap = $('dreamGoldenAdviceWrap');
    if (goldenWrap) goldenWrap.style.display = 'none';
    setGoldenTabVisible(false);
    var nextBtn = $('dreamNextStageBtn');
    if (nextBtn) nextBtn.style.display = 'none';
    updateVisibleStage(1);
    setWizardLine('카드가 소환되었습니다. 꿈의 마법책이 1장부터 차례대로 이야기를 들려줍니다.');
    updateStoryModeLabel();
    renderToneButtons();
    $('dreamLoader').style.display = 'none';
    $('dreamResultWrap').style.display = 'block';
    scrollStoryToLatest();
  }

  function makeKeywordArt(keyword, symbol) {
    var k = String(keyword || '상징').slice(0, 12);
    var s = String(symbol || '✦').slice(0, 2);
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
    if (s === 1) return { title: '1단계 · 기원', text: state.reading.scene };
    if (s === 2) return { title: '2단계 · 전언', text: state.reading.symbol };
    return { title: '3단계 · 지침', text: state.reading.echo };
  }

  function normalizedFinalSpell(reading) {
    var raw = reading && reading.finalSpell ? String(reading.finalSpell) : '';
    var cleaned = raw
      .replace(/^\s*오늘의\s*행운\s*주문\s*:\s*/i, '')
      .replace(/^\s*오늘의\s*주문\s*:\s*/i, '')
      .replace(/^\s*행운\s*주문\s*:\s*/i, '')
      .trim();
    return cleaned || '나는 오늘의 용기를 내일의 길로 바꾼다.';
  }

  function normalizedGoldenAdvice(reading) {
    var raw = reading && reading.goldenAdvice ? String(reading.goldenAdvice) : '';
    var text = raw.trim();
    if (!text) {
      return '세 장의 장면은 지금 당신이 버텨온 시간을 인정하라고 말합니다. 오늘은 완벽함보다 회복을 먼저 선택하세요. 한 가지 작은 일만 끝내도 충분히 앞으로 가고 있습니다. 당신의 속도를 지키는 것이 가장 현실적인 승리입니다.';
    }
    return text;
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
    if (title) title.textContent = '4단계 · 황금 카드의 힐링 조언';

    triggerGoldenImpactFeedback();
    setGoldenTabVisible(true);
    updateVisibleStage(4);

    if (card) {
      card.classList.add('is-open');
      card.classList.remove('is-revealing');
      card.classList.remove('is-impact');
      window.requestAnimationFrame(function () {
        card.classList.add('is-revealing');
        card.classList.add('is-impact');
      });
      setTimeout(function () {
        card.classList.remove('is-revealing');
        card.classList.remove('is-impact');
      }, 900);
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
      state.typingStage = 0;
      state.stageDone[4] = true;
      state.nextStage = 5;
      sendAutoTuneSignal('completed_golden', 0.95, state.reading, { oncePerReading: true });
      setInteractionLocked(false);
      setWizardLine('황금 카드가 전한 조언까지 완성되었습니다. 오늘의 리듬을 다정하게 지켜주세요.');
    });
  }

  function scheduleGoldenStageReveal() {
    clearGoldenTimer();
    setWizardLine('세 장의 서사가 하나로 결합되는 중입니다. 1.5초 뒤 황금 카드가 열립니다.');
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
    setWizardLine('반갑습니다, 무의식의 여행자여. 마법책의 표지를 열고 오늘 밤의 장면을 적어주세요.');
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
    setInteractionLocked(false);
    hideDreamLibrarySuggestions();
    state.reading = null;
    state.outcomeSignals = {};
    $('dreamInput').value = '';
    $('dreamResultWrap').style.display = 'none';
    if ($('dreamArchivePanel')) $('dreamArchivePanel').style.display = 'none';
    $('dreamLoader').style.display = 'none';
    setLoaderText('수정구슬이 꿈의 파장을 수집 중입니다...');
    resetCards();
    renderKeywordChips([]);
    $('dreamStageTitle').textContent = '카드를 열어 숨겨진 문장을 확인하세요.';
    $('dreamStageText').textContent = '';
    $('dreamFinalSpell').textContent = '';
    var spellWrap = $('dreamFinalSpellWrap');
    if (spellWrap) spellWrap.style.display = 'none';
    var goldenWrap = $('dreamGoldenAdviceWrap');
    if (goldenWrap) goldenWrap.style.display = 'none';
    var goldenText = $('dreamGoldenAdvice');
    if (goldenText) goldenText.textContent = '';
    setWizardLine('누가(무엇이) 어떤 행동을 했고, 당신의 감정이 어떻게 흔들렸는지 적어주세요.');
    updateStoryModeLabel();
    renderToneButtons();
    renderDreamLibraryCategoryButtons();
    renderDreamLibraryList();
    syncInputEnergy();
  };

  window.startDreamReading = function startDreamReading() {
    if (state.uiLocked) return;
    var input = $('dreamInput');
    var text = input ? input.value.trim() : '';
    if (input && typeof input.blur === 'function') input.blur();

    if (!text) {
      setLoaderText('누가(무엇이) 어떤 행동을 했고 어떤 감정을 느꼈는지 함께 적어주세요.');
      $('dreamLoader').style.display = 'block';
      setTimeout(function () {
        $('dreamLoader').style.display = 'none';
      }, 1300);
      return;
    }

    var ai = window.DreamLedgerAI;
    if (!ai || typeof ai.interpretDream !== 'function') return;

    resetCards();
    ensureAudioContext();
    setInteractionLocked(true);
    $('dreamResultWrap').style.display = 'none';
    $('dreamLoader').style.display = 'block';

    syncInputEnergy();
    setWizardLine('지팡이를 들어 꿈의 장면을 소환합니다. 카드가 차례대로 서사를 들려줄 거예요.');
    setLoaderText('수정구슬이 상징의 결을 읽는 중...');
    setTimeout(function () { setLoaderText('운명의 카드에 이름을 새기는 중...'); }, 700);

    setTimeout(function () {
      try {
        var reading = ai.interpretDream(text, { goldenTone: state.goldenTone });
        hydrateReading(reading);
        setInteractionLocked(false);
        var resultWrap = $('dreamResultWrap');
        if (resultWrap && typeof resultWrap.scrollIntoView === 'function') {
          window.setTimeout(function () {
            resultWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        }
      } catch (err) {
        var msg = err && err.message ? err.message : '누가(무엇이) 어떤 행동을 했고, 어떤 감정을 느꼈는지 적어주세요.';
        setLoaderText(msg);
        setWizardLine('상징 공명이 흐려졌습니다. 입력을 다시 정돈해 주세요.');
        setTimeout(function () {
          $('dreamLoader').style.display = 'none';
          setInteractionLocked(false);
        }, 1500);
      }
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
      setWizardLine('순서를 지켜주세요. 첫 카드부터 열면 서사가 온전히 이어집니다.');
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
    typeText(target, payload.text, 17, function () {
      state.stageDone[s] = true;
      state.nextStage += 1;
      state.typingStage = 0;
      var nextBtn = $('dreamNextStageBtn');
      if (nextBtn) nextBtn.style.display = s < 3 ? 'block' : 'none';

      if (s < 3) {
        setInteractionLocked(false);
      }

      if (s === 3) {
        var spellText = '오늘의 행운 주문: ' + normalizedFinalSpell(state.reading);
        var spellWrap = $('dreamFinalSpellWrap');
        if (spellWrap) spellWrap.style.display = 'block';
        typeText($('dreamFinalSpell'), spellText, 14, function () {
          scheduleGoldenStageReveal();
        });
      }
    });

    if (s === 1) setWizardLine('첫 장이 열렸습니다. 두 번째 카드에서 현재의 전언을 받아보세요.');
    if (s === 2) setWizardLine('서사가 무르익었습니다. 마지막 카드가 내일의 방향을 밝혀줍니다.');
  };

  window.nextDreamStage = function nextDreamStage() {
    if (state.uiLocked) {
      setWizardLine('연출이 진행 중입니다. 잠시만 기다려주세요.');
      return;
    }
    if (state.typingStage) {
      setWizardLine('낭독이 끝난 뒤 다음 장으로 넘어갈 수 있어요.');
      return;
    }
    var current = state.visibleStage;
    if (!state.stageDone[current]) {
      setWizardLine('현재 카드의 문장을 먼저 열어주세요.');
      return;
    }
    if (current >= 3) return;

    var next = current + 1;
    updateVisibleStage(next);
    $('dreamStageTitle').textContent = next === 2 ? '2단계 카드를 눌러 전언을 여세요.' : '3단계 카드를 눌러 지침을 여세요.';
    $('dreamStageText').textContent = '';
    var nextBtn = $('dreamNextStageBtn');
    if (nextBtn) nextBtn.style.display = 'none';
    setWizardLine(next === 2 ? '제2장이 펼쳐졌습니다. 카드의 목소리를 들어보세요.' : '제3장이 열렸습니다. 마지막 장면이 기다립니다.');
  };

  window.dreamSetTextSpeed = function dreamSetTextSpeed(multiplier) {
    if (state.uiLocked) return;
    var value = Number(multiplier);
    if (!isFinite(value)) value = 1;
    value = Math.max(0.5, Math.min(2.5, value));
    state.textSpeed = value;
    renderSpeedButtons();
    setWizardLine('낭독 배속을 ' + speedLabel(value) + 'x로 조정했습니다.');
  };

  window.dreamSetGoldenTone = function dreamSetGoldenTone(tone) {
    if (state.uiLocked) return;
    state.goldenTone = normalizeGoldenTone(tone);
    renderToneButtons();
    setWizardLine('황금 카드 조언 톤을 ' + toneLabel(state.goldenTone) + ' 모드로 맞췄습니다.');
  };

  window.dreamLibrarySetCategory = function dreamLibrarySetCategory(category) {
    if (state.uiLocked) return;
    state.libraryCategory = normalizeLibraryCategory(category);
    state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
    hideDreamLibrarySuggestions();
    renderDreamLibraryCategoryButtons();
    renderDreamLibraryList();
    setWizardLine('꿈 해몽 라이브러리를 [' + (DREAM_LIBRARY_CATEGORY_LABELS[state.libraryCategory] || '전체') + '] 카테고리로 전환했습니다.');
  };

  window.dreamLibrarySearch = function dreamLibrarySearch() {
    if (state.uiLocked) return;
    var input = $('dreamLibraryQuery');
    state.libraryQuery = input ? String(input.value || '').trim() : '';
    state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
    hideDreamLibrarySuggestions();
    renderDreamLibraryList();
    setWizardLine(state.libraryQuery ? '키워드 [' + state.libraryQuery + ']로 꿈 상징을 탐색했습니다.' : '검색어가 비어 있어 전체 꿈 상징을 표시합니다.');
  };

  window.dreamLibrarySearchByDream = function dreamLibrarySearchByDream() {
    if (state.uiLocked) return;
    var input = $('dreamLibraryQuery');
    var inferred = deriveLibraryQueryFromDream();
    if (!inferred) {
      setWizardLine('꿈 문장에서 검색 키워드를 찾지 못했습니다. 꿈 내용을 먼저 입력하거나 직접 검색어를 입력해 주세요.');
      return;
    }
    state.libraryQuery = inferred;
    state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
    if (input) input.value = inferred;
    hideDreamLibrarySuggestions();
    renderDreamLibraryList();
    setWizardLine('현재 꿈 문장을 기반으로 [' + inferred + '] 검색을 실행했습니다.');
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
    setWizardLine('추천어 [' + value + ']를 적용해 꿈 상징을 검색했습니다.');
  };

  window.dreamLibraryClearSearch = function dreamLibraryClearSearch() {
    if (state.uiLocked) return;
    var input = $('dreamLibraryQuery');
    if (input) input.value = '';
    state.libraryQuery = '';
    state.libraryLimit = DREAM_LIBRARY_PAGE_SIZE;
    hideDreamLibrarySuggestions();
    renderDreamLibraryList();
    setWizardLine('꿈 해몽 라이브러리 검색어를 초기화했습니다.');
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
        setWizardLine('현재 해몽을 꿈 저장소에 보관했습니다.');
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
    setWizardLine('저장된 해몽을 다시 펼쳤습니다. 카드 순서대로 다시 확인해보세요.');
  };

  window.dreamDeleteArchiveAt = function dreamDeleteArchiveAt(id) {
    var list = readArchive().filter(function (it) { return it.id !== id; });
    writeArchive(list);
    renderArchiveList();
  };

  function buildShareText() {
    if (!state.reading) return '드림 타로 해몽 결과를 확인해보세요.';
    return [
      state.reading.title,
      state.reading.summary,
      '[숨겨진 근원] ' + state.reading.scene,
      '[현재의 전언] ' + state.reading.symbol,
      '[내일의 지침] ' + state.reading.echo,
      '[황금 조언] ' + normalizedGoldenAdvice(state.reading),
      '행운 주문: ' + normalizedFinalSpell(state.reading)
    ].join('\n\n');
  }

  window.dreamShareCard = function dreamShareCard() {
    var shareText = buildShareText();

    if (navigator.share) {
      navigator.share({
        title: '무의식의 마법 상점: 드림 타로',
        text: shareText
      }).then(function () {
        sendAutoTuneSignal('shared_result', 1.1, state.reading, { oncePerReading: true });
      }).catch(function () {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(function () {
        sendAutoTuneSignal('shared_result', 1.1, state.reading, { oncePerReading: true });
        alert('해몽 텍스트를 클립보드에 복사했습니다.');
      }).catch(function () {
        alert('공유를 지원하지 않는 환경입니다.');
      });
      return;
    }

    alert('공유를 지원하지 않는 환경입니다.');
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
          setWizardLine('추천어 [' + picked.text + ']를 적용해 꿈 상징을 검색했습니다.');
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

  renderSpeedButtons();
  renderToneButtons();
  renderDreamLibraryCategoryButtons();
  renderDreamLibraryList();
})();
