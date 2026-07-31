(function () {
  var DREAM_LEDGER_TEXT_TRANSLATIONS = {
    ko: {
      toneComfort: '위로',
      toneMotivation: '동기부여',
      toneCoaching: '코칭',
      categoryAll: '전체',
      categoryAnimal: '동물 관련',
      categoryFruit: '과일 관련',
      categoryPeople: '사람 관련',
      categoryPositiveEmotion: '감정(긍정)',
      categoryAngerEmotion: '감정(분노)',
      categoryAnxietyEmotion: '감정(불안)',
      categoryLossEmotion: '감정(상실)',
      categoryRecoveryEmotion: '감정(회복)',
      categoryPlace: '장소 키워드',
      categoryObject: '사물 키워드',
      categoryTaemong: '태몽',
      categoryWealth: '재물운',
      categorySuccess: '합격운',
      categoryLove: '연애운',
      categoryMarriage: '결혼운',
      dreamPromptTitle: '꿈 프롬프트 생성서',
      stageSceneTitle: '1장 · 꿈 장면 정리',
      stageSymbolTitle: '2장 · 상징과 감정 단서',
      stageQuestionTitle: '3장 · AI에게 건넬 질문',
      inputGuide: '누가(무엇이) 어떤 행동을 했고, 어떤 감정을 느꼈는지 적어주세요.',
      shareTitle: '무의식의 마법 상점: 드림 타로',
      tarotBackAria: '타로 카드 뒷면',
      copiedPrompt: '꿈 프롬프트를 클립보드에 복사했습니다.',
      shareUnsupported: '공유를 지원하지 않는 환경입니다.',
      defaultShareText: '꿈 프롬프트를 확인해보세요.',
      hiddenRoot: '숨겨진 근원',
      currentMessage: '현재의 전언',
      tomorrowGuidance: '내일의 지침',
      sealedAdvice: '봉인 조언',
      luckSpell: '행운 주문',
      cardFallback: '카드',
      reversed: '역방향'
    },
    en: {
      toneComfort: 'Comfort',
      toneMotivation: 'Motivation',
      toneCoaching: 'Coaching',
      categoryAll: 'All',
      categoryAnimal: 'Animals',
      categoryFruit: 'Fruit',
      categoryPeople: 'People',
      categoryPositiveEmotion: 'Emotion (positive)',
      categoryAngerEmotion: 'Emotion (anger)',
      categoryAnxietyEmotion: 'Emotion (anxiety)',
      categoryLossEmotion: 'Emotion (loss)',
      categoryRecoveryEmotion: 'Emotion (recovery)',
      categoryPlace: 'Place keywords',
      categoryObject: 'Object keywords',
      categoryTaemong: 'Birth dream',
      categoryWealth: 'Wealth fortune',
      categorySuccess: 'Success fortune',
      categoryLove: 'Love fortune',
      categoryMarriage: 'Marriage fortune',
      dreamPromptTitle: 'Dream Prompt Generator',
      stageSceneTitle: 'Chapter 1 · Dream Scene Notes',
      stageSymbolTitle: 'Chapter 2 · Symbols and Emotional Clues',
      stageQuestionTitle: 'Chapter 3 · Questions for AI',
      inputGuide: 'Please describe who or what acted, what happened, and what emotion you felt.',
      shareTitle: 'Unconscious Magic Shop: Dream Tarot',
      tarotBackAria: 'Tarot card back',
      copiedPrompt: 'Dream prompt copied to clipboard.',
      shareUnsupported: 'Sharing is not supported in this environment.',
      defaultShareText: 'Review your dream prompt.',
      hiddenRoot: 'Hidden root',
      currentMessage: 'Current message',
      tomorrowGuidance: 'Tomorrow guidance',
      sealedAdvice: 'Sealed advice',
      luckSpell: 'Luck spell',
      cardFallback: 'Card',
      reversed: 'Reversed'
    },
    ja: {
      toneComfort: '慰め',
      toneMotivation: '動機づけ',
      toneCoaching: 'コーチング',
      categoryAll: 'すべて',
      categoryAnimal: '動物関連',
      categoryFruit: '果物関連',
      categoryPeople: '人物関連',
      categoryPositiveEmotion: '感情(肯定)',
      categoryAngerEmotion: '感情(怒り)',
      categoryAnxietyEmotion: '感情(不安)',
      categoryLossEmotion: '感情(喪失)',
      categoryRecoveryEmotion: '感情(回復)',
      categoryPlace: '場所キーワード',
      categoryObject: '物キーワード',
      categoryTaemong: '胎夢',
      categoryWealth: '金運',
      categorySuccess: '合格運',
      categoryLove: '恋愛運',
      categoryMarriage: '結婚運',
      dreamPromptTitle: '夢プロンプト生成書',
      stageSceneTitle: '第1章 · 夢の場面整理',
      stageSymbolTitle: '第2章 · 象徴と感情の手がかり',
      stageQuestionTitle: '第3章 · AIへ渡す質問',
      inputGuide: '誰が、または何がどんな行動をし、どんな感情を感じたのかを書いてください。',
      shareTitle: '無意識の魔法店: ドリームプロンプト',
      tarotBackAria: 'タロットカード裏面',
      copiedPrompt: '夢プロンプトをクリップボードにコピーしました。',
      shareUnsupported: 'この環境では共有に対応していません。',
      defaultShareText: '夢プロンプトを確認してください。',
      hiddenRoot: '隠れた根源',
      currentMessage: '現在の伝言',
      tomorrowGuidance: '明日の指針',
      sealedAdvice: '封印された助言',
      luckSpell: '幸運の呪文',
      cardFallback: 'カード',
      reversed: '逆位置'
    },
    'zh-CN': {
      toneComfort: '安慰',
      toneMotivation: '激励',
      toneCoaching: '教练式指引',
      categoryAll: '全部',
      categoryAnimal: '动物相关',
      categoryFruit: '水果相关',
      categoryPeople: '人物相关',
      categoryPositiveEmotion: '情绪(积极)',
      categoryAngerEmotion: '情绪(愤怒)',
      categoryAnxietyEmotion: '情绪(焦虑)',
      categoryLossEmotion: '情绪(失落)',
      categoryRecoveryEmotion: '情绪(恢复)',
      categoryPlace: '地点关键词',
      categoryObject: '物品关键词',
      categoryTaemong: '胎梦',
      categoryWealth: '财运',
      categorySuccess: '成功运',
      categoryLove: '恋爱运',
      categoryMarriage: '婚姻运',
      dreamPromptTitle: '梦境提示词生成书',
      stageSceneTitle: '第1章 · 整理梦境场景',
      stageSymbolTitle: '第2章 · 象征与情绪线索',
      stageQuestionTitle: '第3章 · 交给 AI 的问题',
      inputGuide: '请写下谁或什么做了什么，以及你感受到了什么情绪。',
      shareTitle: '无意识魔法商店：梦境塔罗',
      tarotBackAria: '塔罗牌背面',
      copiedPrompt: '梦境提示词已复制到剪贴板。',
      shareUnsupported: '当前环境不支持分享。',
      defaultShareText: '请查看梦境提示词。',
      hiddenRoot: '隐藏根源',
      currentMessage: '当前讯息',
      tomorrowGuidance: '明日指引',
      sealedAdvice: '封印建议',
      luckSpell: '幸运咒语',
      cardFallback: '牌',
      reversed: '逆位'
    },
    'zh-TW': {
      toneComfort: '安慰',
      toneMotivation: '激勵',
      toneCoaching: '教練式指引',
      categoryAll: '全部',
      categoryAnimal: '動物相關',
      categoryFruit: '水果相關',
      categoryPeople: '人物相關',
      categoryPositiveEmotion: '情緒(積極)',
      categoryAngerEmotion: '情緒(憤怒)',
      categoryAnxietyEmotion: '情緒(焦慮)',
      categoryLossEmotion: '情緒(失落)',
      categoryRecoveryEmotion: '情緒(恢復)',
      categoryPlace: '地點關鍵詞',
      categoryObject: '物品關鍵詞',
      categoryTaemong: '胎夢',
      categoryWealth: '財運',
      categorySuccess: '成功運',
      categoryLove: '戀愛運',
      categoryMarriage: '婚姻運',
      dreamPromptTitle: '夢境提示詞生成書',
      stageSceneTitle: '第1章 · 整理夢境場景',
      stageSymbolTitle: '第2章 · 象徵與情緒線索',
      stageQuestionTitle: '第3章 · 交給 AI 的問題',
      inputGuide: '請寫下誰或什麼做了什麼，以及你感受到了什麼情緒。',
      shareTitle: '無意識魔法商店：夢境塔羅',
      tarotBackAria: '塔羅牌背面',
      copiedPrompt: '夢境提示詞已複製到剪貼簿。',
      shareUnsupported: '目前環境不支援分享。',
      defaultShareText: '請查看夢境提示詞。',
      hiddenRoot: '隱藏根源',
      currentMessage: '目前訊息',
      tomorrowGuidance: '明日指引',
      sealedAdvice: '封印建議',
      luckSpell: '幸運咒語',
      cardFallback: '牌',
      reversed: '逆位'
    }
  };

  function normalizeDreamLedgerLocale(value) {
    var normalized = String(value || 'ko').trim().toLowerCase().replace('_', '-');
    if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh-CN';
    if (normalized === 'zh-tw' || normalized === 'zh-hant' || normalized === 'zh-hk' || normalized === 'zh-mo') return 'zh-TW';
    if (normalized === 'ja-jp') return 'ja';
    if (normalized === 'en-us' || normalized === 'en-gb') return 'en';
    if (normalized === 'ko' || normalized === 'en' || normalized === 'ja') return normalized;
    return 'en';
  }

  function currentDreamLedgerLocale() {
    try {
      if (window.cdGetCurrentLanguage) return normalizeDreamLedgerLocale(window.cdGetCurrentLanguage());
    } catch (_) {}
    try {
      var queryLang = new URLSearchParams(window.location.search || '').get('lang');
      if (queryLang) return normalizeDreamLedgerLocale(queryLang);
    } catch (_) {}
    try {
      var stored = window.localStorage && window.localStorage.getItem('cd_lang');
      if (stored) return normalizeDreamLedgerLocale(stored);
    } catch (_) {}
    try {
      var match = document.cookie.match(/(?:^|;\s*)cd_locale=([^;]+)/);
      if (match && match[1]) return normalizeDreamLedgerLocale(decodeURIComponent(match[1]));
    } catch (_) {}
    return 'ko';
  }

  function dreamLedgerText(key) {
    var locale = currentDreamLedgerLocale();
    return (DREAM_LEDGER_TEXT_TRANSLATIONS[locale] && DREAM_LEDGER_TEXT_TRANSLATIONS[locale][key])
      || (DREAM_LEDGER_TEXT_TRANSLATIONS.en && DREAM_LEDGER_TEXT_TRANSLATIONS.en[key])
      || DREAM_LEDGER_TEXT_TRANSLATIONS.ko[key]
      || '';
  }

  var DREAM_ARCHIVE_KEY = 'dreamLedgerArchiveV1';
  var GOLDEN_TONE_LABELS = {
    comfort: dreamLedgerText('toneComfort'),
    motivation: dreamLedgerText('toneMotivation'),
    coaching: dreamLedgerText('toneCoaching')
  };
  var DREAM_LIBRARY_PAGE_SIZE = 18;
  var DREAM_LIBRARY_CATEGORY_LABELS = {
    all: dreamLedgerText('categoryAll'),
    animal: dreamLedgerText('categoryAnimal'),
    fruit: dreamLedgerText('categoryFruit'),
    people: dreamLedgerText('categoryPeople'),
    emotion_positive: dreamLedgerText('categoryPositiveEmotion'),
    emotion_anger: dreamLedgerText('categoryAngerEmotion'),
    emotion_anxiety: dreamLedgerText('categoryAnxietyEmotion'),
    emotion_loss: dreamLedgerText('categoryLossEmotion'),
    emotion_recovery: dreamLedgerText('categoryRecoveryEmotion'),
    place: dreamLedgerText('categoryPlace'),
    object: dreamLedgerText('categoryObject'),
    taemong: dreamLedgerText('categoryTaemong'),
    wealth: dreamLedgerText('categoryWealth'),
    success: dreamLedgerText('categorySuccess'),
    love: dreamLedgerText('categoryLove'),
    marriage: dreamLedgerText('categoryMarriage')
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

  var DREAM_TAROT_API_TIMEOUT_MS = 8000;
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

    // 낭독 중에도 배속 변경은 허용한다.
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
      guide.textContent = '카드가 준비되면 첫 장부터 꿈의 서사를 열어주세요.';
      return;
    }
    if (state.visibleStage === 4) {
      guide.textContent = '봉인 카드가 전하는 오늘의 조언입니다. 지금 붙잡을 선택 하나를 정해보세요.';
      return;
    }
    if (!state.stageDone[state.visibleStage]) {
      guide.textContent = state.autoReveal
        ? state.visibleStage + '번째 카드의 문장을 여는 중입니다.'
        : state.visibleStage + '번째 카드를 눌러 꿈의 다음 문장을 확인하세요.';
      return;
    }
    if (state.visibleStage < 3) {
      guide.textContent = state.autoReveal
        ? '다음 꿈 장면으로 부드럽게 이어집니다.'
        : '다음 카드 보기 버튼으로 다음 장면을 열어주세요.';
      return;
    }
    guide.textContent = '세 장이 모두 열렸습니다. 봉인 카드가 곧 마지막 조언을 건넵니다.';
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
    modeEl.textContent = '꿈 상징 리딩 · ' + speedLabel(state.textSpeed) + 'x · 조언 톤 ' + toneLabel(state.goldenTone);
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
      btn.textContent = state.autoReveal ? '자동 펼치기 ON' : '자동 펼치기 OFF';
      btn.setAttribute('aria-pressed', state.autoReveal ? 'true' : 'false');
    }
    var status = $('dreamAutoRevealState');
    if (status) {
      status.textContent = state.autoReveal
        ? '자동 모드: 카드가 순서대로 이어서 열립니다.'
        : '수동 모드: 원하는 타이밍에 카드를 직접 열 수 있습니다.';
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
          throw new Error('타로 카드 응답을 읽지 못했습니다.');
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

  function uniquePromptItems(items, limit) {
    var seen = {};
    var out = [];
    (items || []).forEach(function (item) {
      var value = String(item || '').trim();
      if (!value || seen[value]) return;
      seen[value] = true;
      out.push(value);
    });
    return out.slice(0, limit || 8);
  }

  function extractPromptContextLines(context) {
    if (!Array.isArray(context)) return [];
    return context.slice(0, 5).map(function (entry) {
      if (!entry) return '';
      var keyword = String(entry.keyword || entry.title || '').trim();
      var meaning = String(entry.meaning || entry.summary || entry.description || '').trim();
      if (keyword && meaning) return keyword + ': ' + meaning;
      return keyword || meaning;
    }).filter(Boolean);
  }

  function buildDreamPromptCards(dreamText, localReading, context) {
    var dream = String(dreamText || '').trim();
    var reading = localReading || {};
    var keywords = uniquePromptItems([].concat(
      Array.isArray(reading.keywords) ? reading.keywords : [],
      extractPromptContextLines(context).map(function (line) { return line.split(':')[0]; }),
      dream.split(/\s+/).filter(function (word) { return word.length >= 2; }).slice(0, 5)
    ), 9);

    var scene = String(reading.scene || reading.summary || dream || '').trim();
    var symbol = String(reading.symbol || '').trim();
    var echo = String(reading.echo || '').trim();
    var questionSeed = keywords.slice(0, 3).join(' · ') || '장면 · 감정 · 선택';

    return [
      {
        card_name: '꿈 장면 정리',
        symbol: '☾',
        energy_keyword: uniquePromptItems(['장면', '인물', '장소'].concat(keywords), 5).join(' · '),
        message: scene || '꿈의 첫 장면이 조용히 떠오릅니다.'
      },
      {
        card_name: '상징과 감정 단서',
        symbol: '✦',
        energy_keyword: uniquePromptItems(['감정', '상징', '잔향'].concat(keywords.slice(1)), 5).join(' · '),
        message: symbol || '반복되는 상징과 깨어난 뒤의 감정이 프롬프트의 중심을 이룹니다.'
      },
      {
        card_name: 'AI에게 건넬 질문',
        symbol: '✶',
        energy_keyword: uniquePromptItems(['질문', '통찰', '정리'].concat(keywords.slice(2)), 5).join(' · '),
        message: echo || questionSeed + '의 결을 따라 지금 필요한 질문이 열립니다.'
      }
    ];
  }

  function buildDreamPromptText(dreamText, tone, cards, localReading, context) {
    var dream = String(dreamText || '').trim();
    var reading = localReading || {};
    var cardList = Array.isArray(cards) ? cards : [];
    var contextLines = extractPromptContextLines(context);
    var cardLines = cardList.map(function (card, idx) {
      return (idx + 1) + '. ' + String(card.card_name || '').trim()
        + ' — ' + String(card.message || card.energy_keyword || '').trim();
    }).filter(Boolean);
    var focus = tone === 'career' ? '일, 선택, 현실 리듬'
      : tone === 'love' ? '관계, 마음의 거리, 감정의 진심'
      : '회복, 안정, 내면의 균형';

    return [
      '당신은 꿈 상징 해석가입니다. 아래 꿈의 장면을 바탕으로, 꿈속 상징과 깨어난 뒤의 감정이 지금 삶에서 무엇을 비추는지 다정하고 신비롭게 풀어주세요.',
      '',
      '[꿈 원문]',
      dream || '기억나는 꿈의 장면이 흐릿하게 남아 있습니다.',
      '',
      '[상담의 초점]',
      focus,
      '',
      '[카드 단서]',
      cardLines.join('\n') || '- 꿈 장면 정리 — 아직 선명하지 않은 장면을 먼저 조용히 붙잡아 주세요.',
      '',
      contextLines.length ? '[상징 사전 단서]\n' + contextLines.join('\n') + '\n' : '',
      '[상담의 그릇]',
      '1. 꿈에서 가장 강하게 떠오르는 상징 3가지를 짚어 주세요.',
      '2. 그 상징이 감정, 관계, 일상 선택에 어떻게 흐르는지 비춰 주세요.',
      '3. 오늘 바로 붙잡을 수 있는 작은 행동 3가지를 제안해 주세요.',
      '4. 마지막에는 한 문장의 봉인 문장을 남겨 주세요.',
      '',
      '[봉인할 경계]',
      '미래를 단정하거나 불안을 키우지 말고, 제작 과정이나 도구 이름은 장막 뒤에 두세요.'
    ].filter(Boolean).join('\n');
  }

  function buildLocalDreamPromptRecord(dreamText, tone, localReading, context) {
    var reading = localReading || {};
    var cards = buildDreamPromptCards(dreamText, reading, context);
    var promptText = buildDreamPromptText(dreamText, tone, cards, reading, context);
    var keywords = uniquePromptItems([].concat(
      Array.isArray(reading.keywords) ? reading.keywords : [],
      cards.map(function (card) { return card.card_name; })
    ), 10);

    return {
      kind: 'dream_prompt',
      title: dreamLedgerText('dreamPromptTitle'),
      summary: String(reading.summary || '꿈의 장면과 감정의 잔향이 AI에게 건넬 질문으로 모입니다.').trim(),
      scene: cards[0].message,
      symbol: cards[1].message,
      echo: cards[2].message,
      keywords: keywords,
      cards: cards,
      promptText: promptText,
      aiConsultMarkdown: promptText,
      goldenAdvice: '이 프롬프트는 꿈의 잔향을 과장하지 않고, 지금 마음이 붙잡은 상징을 차분히 비추도록 봉인되었습니다.',
      finalSpell: '나는 꿈의 언어를 분명한 질문으로 봉인한다.',
      goldenCardName: '최종 프롬프트',
      goldenCardSymbol: '✶',
      goldenTone: tone || state.goldenTone,
      usedDreamText: dreamText
    };
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
      title: state.reading.title || '꿈 프롬프트',
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
      listEl.innerHTML = '<div class="dream-archive-item"><div class="dream-archive-meta">저장된 꿈 프롬프트가 없습니다. 생성 후 [프롬프트 저장소]를 눌러 보관해보세요.</div></div>';
      return;
    }

    listEl.innerHTML = list.map(function (item) {
      var title = item.title || '꿈 프롬프트';
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
    $('dreamStageTitle').textContent = '첫 번째 카드가 꿈 장면을 정리합니다.';
    $('dreamStageText').textContent = '';
    $('dreamFinalSpell').textContent = '';
    var goldenAdviceText = $('dreamGoldenAdvice');
    if (goldenAdviceText) goldenAdviceText.textContent = '';
    var finalConsultText = $('dreamFinalConsult');
    if (finalConsultText) finalConsultText.textContent = '';

    var cardName4 = $('dreamCardName4');
    if (cardName4) cardName4.textContent = '[' + (reading.goldenCardName || '최종 프롬프트') + ']';
    var cardSymbol4 = $('dreamCardSymbol4');
    if (cardSymbol4) cardSymbol4.textContent = reading.goldenCardSymbol || '✶';

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
    setWizardLine('세 장의 카드가 준비되었습니다. 꿈의 장면이 첫 카드부터 차례로 열립니다.');
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
    if (s === 1) return { title: dreamLedgerText('stageSceneTitle'), text: state.reading.scene };
    if (s === 2) return { title: dreamLedgerText('stageSymbolTitle'), text: state.reading.symbol };
    return { title: dreamLedgerText('stageQuestionTitle'), text: state.reading.echo };
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
      return '세 장의 장면은 지금 당신이 버텨온 시간을 조용히 비춥니다. 오늘은 완벽함보다 회복을 먼저 선택하세요. 한 가지 작은 일만 끝내도 충분히 앞으로 가고 있습니다. 당신의 속도를 지키는 것이 가장 현실적인 승리입니다.';
    }
    return text;
  }

  function buildFinalConsulting(reading) {
    if (!reading) return '';
    if (reading.promptText) {
      return String(reading.promptText || '').trim();
    }
    var title = String(reading.title || '오늘의 꿈');
    var summary = String(reading.summary || '').trim();
    var finalSpell = normalizedFinalSpell(reading);
    var aiConsult = String(reading.aiConsultMarkdown || '').trim();
    var keywords = Array.isArray(reading.keywords)
      ? reading.keywords.slice(0, 3).filter(Boolean)
      : [];
    var aiActions = Array.isArray(reading.aiActionPlan) ? reading.aiActionPlan.slice(0, 3) : [];
    var keyLine = keywords.length ? '핵심 키워드: ' + keywords.join(' · ') : '핵심 키워드: 감정, 관계, 선택의 방향';

    if (aiConsult) {
      return [
        '■ 꿈 프롬프트 — ' + title,
        '',
        aiConsult,
        '',
        '【꿈의 핵심 장면】',
        summary || '현재 꿈의 상징은 내면의 불안을 인식하고 삶의 방향을 재정비하라는 신호로 해석됩니다.',
        '',
        '【카드가 비춘 상징】',
        keyLine,
        aiActions.length ? '' : '',
        aiActions.length ? '【오늘의 작은 선택 3가지】' : '',
        aiActions.length ? ('- ' + aiActions.join('\n- ')) : '',
        '',
        '【마무리 확언】',
        finalSpell
      ].filter(Boolean).join('\n');
    }

    return [
      '■ 꿈 프롬프트 — ' + title,
      '',
      '【꿈의 첫 문장】',
      summary || '현재 꿈의 상징은 내면의 불안을 인식하고 삶의 방향을 재정비하라는 신호로 해석됩니다.',
      '',
      '【카드가 비춘 상징】',
      keyLine,
      '',
      '【오늘의 작은 선택】',
      '① 감정 정리: 오늘 가장 마음을 흔든 감정을 한 문장으로 기록하고, 이를 누그러뜨릴 작은 행동 1가지를 실행하세요.',
      '② 리듬 고정: 72시간 이내 관계·업무·건강 중 우선순위 1개를 정해 15분 루틴으로 안정화하세요.',
      '③ 점진적 회복: 완벽한 해결보다 이번 주 반복 가능한 작은 성취를 3회 이상 쌓아 마음의 중심을 회복하세요.',
      '',
      '【마무리 확언】',
      finalSpell
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
    if (title) title.textContent = '4장 · 최종 프롬프트 봉인';

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
        setWizardLine('최종 프롬프트가 봉인되었습니다. 마음에 맞는 AI에게 그대로 건네보세요.');
        return;
      }

      state.typingStage = 5;
      typeText(finalConsultText, buildFinalConsulting(state.reading), 12, function () {
        state.typingStage = 0;
        state.stageDone[4] = true;
        state.nextStage = 5;
        sendAutoTuneSignal('completed_golden', 0.95, state.reading, { oncePerReading: true });
        setInteractionLocked(false);
        setWizardLine('꿈의 잔향이 하나의 프롬프트로 엮였습니다. 필요한 곳에 그대로 건네보세요.');
      });
    });
  }

  function scheduleGoldenStageReveal() {
    clearGoldenTimer();
    setWizardLine('세 장의 단서가 하나로 모이는 중입니다. 곧 최종 프롬프트가 열립니다.');
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
    setWizardLine('반갑습니다, 무의식의 여행자여. 꿈의 잔향을 AI에게 건넬 문장으로 봉인해보세요.');
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
    setLoaderText('카드가 꿈의 잔향을 프롬프트로 엮는 중입니다...');
    resetCards();
    renderKeywordChips([]);
    $('dreamStageTitle').textContent = '카드를 열어 꿈이 남긴 프롬프트 단서를 확인하세요.';
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
    setWizardLine('누가 또는 무엇이 나타났고, 그 장면에서 마음이 어떻게 흔들렸는지 적어주세요.');
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

    // 뽑힌 실제 타로 카드 정보로 카드 이름·이미지·키워드 업데이트
    if (Array.isArray(localReading.cards)) {
      for (var i = 0; i < Math.min(localReading.cards.length, apiCards.length); i++) {
        var ac = apiCards[i];
        var lc = localReading.cards[i];
        if (!ac || !lc) continue;
        var orientLabel = ac.orientation === 'reversed' ? ' (역방향)' : '';
        if (ac.nameKr || ac.name) {
          lc.card_name = (ac.nameKr || ac.name) + orientLabel;
        }
        var imgUrl = ac.localImageUrl || ac.imageUrl || ac.proxyImageUrl || '';
        if (imgUrl) lc.tarot_image_url = imgUrl;
        if (Array.isArray(ac.keywords) && ac.keywords.length) {
          lc.energy_keyword = ac.keywords.slice(0, 2).join(' · ');
        }
      }
    }

    // 타로 카드 해석을 각 단계 서사로 자연스럽게 합친다.
    function cardOrientLabel(card) {
      if (!card) return '';
      return card.orientation === 'reversed' ? '역방향' : '정방향';
    }

    function cardLabel(idx) {
      var ac = apiCards[idx];
      return ac && (ac.nameKr || ac.name) ? (ac.nameKr || ac.name) : (idx + 1) + '번째 카드';
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
      var keywords = Array.isArray(ac.keywords) ? ac.keywords.slice(0, 3).join(' · ') : '';
      var header = cardName + (orient ? ' (' + orient + ')' : '')
        + (keywords ? '가 꿈 위에 남긴 빛의 단서는 ' + keywords + '입니다.' : '가 꿈의 흐름을 선명하게 비춥니다.');
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

    // 타로 종합 조언을 봉인 카드 조언에 통합
    if (apiReadingObj.advice) {
      localReading.goldenAdvice = (localReading.goldenAdvice || '')
        + '\n\n【카드가 남긴 종합 조언】\n' + apiReadingObj.advice;
    }

    return localReading;
  }

  function buildConsultCardsPayload(reading, drawData) {
    var apiCards = drawData && Array.isArray(drawData.cards) ? drawData.cards : [];
    if (apiCards.length) {
      return apiCards.slice(0, 3).map(function (card, idx) {
        var name = String(card.nameKr || card.name || ('카드 ' + (idx + 1))).trim();
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
        .split(/\s*·\s*/)
        .map(function (v) { return String(v || '').trim(); })
        .filter(Boolean)
        .slice(0, 5);
      return {
        name: String(card.card_name || ('카드 ' + (idx + 1))).trim(),
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

    if (consultRecord.title) {
      merged.title = String(consultRecord.title || '').trim() || merged.title;
    }
    if (consultRecord.summary) {
      merged.summary = String(consultRecord.summary || '').trim() || merged.summary;
    }
    if (consultRecord.promptText) {
      merged.promptText = String(consultRecord.promptText || '').trim();
      merged.aiConsultMarkdown = merged.promptText;
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
    if (Array.isArray(consultRecord.cards) && consultRecord.cards.length) {
      merged.cards = consultRecord.cards.slice(0, 3).map(function (card, idx) {
        var fallback = merged.cards && merged.cards[idx] ? merged.cards[idx] : {};
        var energyKeyword = Array.isArray(card.keywords)
          ? card.keywords.slice(0, 5).join(' · ')
          : String(card.energy_keyword || card.keywords || fallback.energy_keyword || '').trim();
        return {
          card_name: String(card.card_name || card.name || fallback.card_name || ('프롬프트 카드 ' + (idx + 1))).trim(),
          symbol: String(card.symbol || fallback.symbol || '✦').trim(),
          energy_keyword: energyKeyword,
          message: String(card.message || fallback.message || '').trim(),
          tarot_image_url: String(card.tarot_image_url || fallback.tarot_image_url || '').trim()
        };
      });
    }
    if (consultRecord.model) {
      merged.aiModel = String(consultRecord.model || '').trim();
    }
    if (consultRecord.kind) {
      merged.kind = String(consultRecord.kind || '').trim();
    }
    if (consultRecord.finalSpell) {
      merged.finalSpell = String(consultRecord.finalSpell || '').trim() || merged.finalSpell;
    }
    if (consultRecord.goldenCardName) {
      merged.goldenCardName = String(consultRecord.goldenCardName || '').trim() || merged.goldenCardName;
    }
    if (consultRecord.goldenCardSymbol) {
      merged.goldenCardSymbol = String(consultRecord.goldenCardSymbol || '').trim() || merged.goldenCardSymbol;
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
      setLoaderText('누가(무엇이) 어떤 행동을 했고 어떤 감정을 느꼈는지 함께 적어주세요.');
      $('dreamLoader').style.display = 'block';
      setTimeout(function () {
        $('dreamLoader').style.display = 'none';
      }, 1300);
      return;
    }

    var ai = window.DreamLedgerAI;
    if (!ai || typeof ai.interpretDream !== 'function') {
      setLoaderText('드림 타로의 문을 여는 중입니다...');
      $('dreamLoader').style.display = 'block';
      ensureDreamLedgerAiReady().then(function (loadedAi) {
        if (loadedAi && typeof loadedAi.interpretDream === 'function') {
          window.startDreamReading();
          return;
        }
        setLoaderText('드림 타로의 문이 잠시 닫혀 있습니다. 잠시 후 다시 시도해 주세요.');
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
    setWizardLine('꿈의 장면을 조용히 펼칩니다. 카드가 프롬프트 단서로 차례차례 정리됩니다.');
    setLoaderText('꿈의 장면을 프롬프트 단서로 정리하는 중...');
    setTimeout(function () { setLoaderText('세 장의 카드에 AI에게 건넬 질문을 새기는 중...'); }, 700);

    setTimeout(function () {
      var reading;
      try {
        reading = ai.interpretDream(text, { goldenTone: state.goldenTone });
      } catch (err) {
        var msg = err && err.message ? err.message : dreamLedgerText('inputGuide');
        setLoaderText(msg);
        setWizardLine('상징 공명이 흐려졌습니다. 입력을 다시 정돈해 주세요.');
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
          setWizardLine('일부 전언이 늦어져, 꿈의 기본 단서로 프롬프트를 완성했습니다.');
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

      var pipelineFallbacks = [];
      var dreamLibraryContext = buildDreamLibraryContext(text);
      var localPromptRecord = buildLocalDreamPromptRecord(text, state.goldenTone, reading, dreamLibraryContext);

      setLoaderText('꿈의 잔향을 AI 프롬프트로 봉인하는 중입니다...');
      callDreamApi('prompt-maker', {
        dreamText: text,
        tone: state.goldenTone,
        localReading: {
          title: String(reading.title || '').trim(),
          summary: String(reading.summary || '').trim(),
          scene: String(reading.scene || '').trim(),
          symbol: String(reading.symbol || '').trim(),
          echo: String(reading.echo || '').trim(),
          keywords: Array.isArray(reading.keywords) ? reading.keywords.slice(0, 8) : []
        },
        dreamLibraryContext: dreamLibraryContext
      })
        .then(function (promptData) {
          if (promptData && promptData.record) {
            reading = mergeDreamConsultIntoReading(localPromptRecord, promptData.record);
          } else {
            pipelineFallbacks.push('prompt:record-missing');
            reading = localPromptRecord;
          }
          reading._pipelineFallbacks = pipelineFallbacks.slice();
          finalizeReading(reading);
        })
        .catch(function (error) {
          pipelineFallbacks.push('prompt:' + String(error && error.message || 'failed'));
          console.warn('[DreamPrompt] prompt-fallback', error);
          reading = localPromptRecord;
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
          setWizardLine('낭독이 완료되었습니다. 자동으로 다음 단계로 이어집니다.');
          queueAutoReveal(420);
        } else {
          setWizardLine('낭독이 완료되었습니다. 충분히 읽으신 후 "다음 카드 보기"를 눌러 진행해 주세요.');
        }
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
    setWizardLine('낭독 배속을 ' + speedLabel(value) + 'x로 조정했습니다.');
  };

  window.dreamSetGoldenTone = function dreamSetGoldenTone(tone) {
    if (state.uiLocked) return;
    state.goldenTone = normalizeGoldenTone(tone);
    renderToneButtons();
    setWizardLine('봉인 카드 조언 톤을 ' + toneLabel(state.goldenTone) + ' 모드로 맞췄습니다.');
  };

  window.dreamToggleAutoReveal = function dreamToggleAutoReveal() {
    if (state.uiLocked) return;
    state.autoReveal = !state.autoReveal;
    updateAutoRevealUi();
    if (!state.autoReveal) {
      clearAutoRevealTimer();
      setWizardLine('수동 모드로 전환했습니다. 원하는 타이밍에 카드를 직접 여세요.');
      return;
    }
    setWizardLine('자동 모드로 전환했습니다. 카드가 순서대로 이어집니다.');
    queueAutoReveal(260);
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
        setWizardLine('현재 꿈 프롬프트를 저장소에 보관했습니다.');
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
    setWizardLine('저장된 꿈 프롬프트를 다시 펼쳤습니다. 카드 순서대로 단서를 확인해보세요.');
  };

  window.dreamDeleteArchiveAt = function dreamDeleteArchiveAt(id) {
    var list = readArchive().filter(function (it) { return it.id !== id; });
    writeArchive(list);
    renderArchiveList();
  };

  function buildShareText() {
    if (!state.reading) return dreamLedgerText('defaultShareText');
    if (state.reading.promptText) return String(state.reading.promptText || '').trim();
    return [
      state.reading.title,
      state.reading.summary,
      '[' + dreamLedgerText('hiddenRoot') + '] ' + state.reading.scene,
      '[' + dreamLedgerText('currentMessage') + '] ' + state.reading.symbol,
      '[' + dreamLedgerText('tomorrowGuidance') + '] ' + state.reading.echo,
      '[' + dreamLedgerText('sealedAdvice') + '] ' + normalizedGoldenAdvice(state.reading),
      dreamLedgerText('luckSpell') + ': ' + normalizedFinalSpell(state.reading)
    ].join('\n\n');
  }

  window.dreamShareCard = function dreamShareCard() {
    var shareText = buildShareText();

    if (navigator.share) {
      navigator.share({
        title: dreamLedgerText('shareTitle'),
        text: shareText
      }).then(function () {
        sendAutoTuneSignal('shared_result', 1.1, state.reading, { oncePerReading: true });
      }).catch(function () {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(function () {
        sendAutoTuneSignal('shared_result', 1.1, state.reading, { oncePerReading: true });
        alert(dreamLedgerText('copiedPrompt'));
      }).catch(function () {
        alert(dreamLedgerText('shareUnsupported'));
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

  var dreamPromptV2 = {
    stage: 'input',
    dreamInput: '',
    drawnCards: [],
    dreamThemes: [],
    analysisNote: '',
    dreamPrompt: '',
    isCopied: false,
    isPrompting: false,
    timers: []
  };

  function clearDreamPromptV2Timers() {
    while (dreamPromptV2.timers.length) {
      clearTimeout(dreamPromptV2.timers.pop());
    }
  }

  function queueDreamPromptV2Timer(fn, delay) {
    var timer = setTimeout(function () {
      dreamPromptV2.timers = dreamPromptV2.timers.filter(function (item) { return item !== timer; });
      fn();
    }, delay);
    dreamPromptV2.timers.push(timer);
    return timer;
  }

  function getDreamCardCount() {
    var checked = document.querySelector('input[name="dreamCardCount"]:checked');
    var count = parseInt(checked && checked.value ? checked.value : '3', 10);
    if (!Number.isFinite(count)) return 3;
    return Math.max(1, Math.min(5, count));
  }

  function setDreamPromptLoader(message, visible) {
    setLoaderText(message || '');
    var loader = $('dreamLoader');
    if (loader) loader.style.display = visible ? 'block' : 'none';
  }

  function setDreamPromptStage(stage) {
    dreamPromptV2.stage = stage;
    renderDreamPromptV2();
  }

  function normalizeDreamV2Card(card, idx) {
    var source = card && card.card ? card.card : card;
    source = source || {};
    var nameKo = String(source.nameKo || source.nameKr || source.name || ('카드 ' + (idx + 1))).trim();
    var keywords = Array.isArray(source.keywords) ? source.keywords.slice(0, 4) : [];
    // 정/역방향은 서버가 꿈 원문 시드로 확정한다. 클라이언트가 다시 뽑으면
    // 화면의 역방향 배지와 서버가 만든 프롬프트 문구가 어긋난다.
    var reversedFlag = typeof source.isReversed === 'boolean'
      ? source.isReversed
      : (typeof card.isReversed === 'boolean' ? card.isReversed : false);
    return {
      card: {
        id: source.id,
        code: String(source.code || source.id || '').trim(),
        name: String(source.name || '').trim(),
        nameKo: nameKo,
        arcana: String(source.arcana || 'major').trim(),
        suit: String(source.suit || '').trim(),
        element: String(source.element || '').trim(),
        number: source.number,
        keywords: keywords.length ? keywords : ['무의식', '상징'],
        uprightKeywords: Array.isArray(source.uprightKeywords) ? source.uprightKeywords.slice(0, 5) : [],
        reversedKeywords: Array.isArray(source.reversedKeywords) ? source.reversedKeywords.slice(0, 5) : [],
        dreamMeaning: String(source.dreamMeaning || '').trim(),
        uprightMeaning: String(source.uprightMeaning || '').trim(),
        reversedMeaning: String(source.reversedMeaning || '').trim(),
        imageUrl: String(source.imageUrl || source.localImageUrl || source.tarot_image_url || '').trim(),
        imageFallbackUrl: String(source.imageFallbackUrl || '').trim()
      },
      isReversed: reversedFlag,
      isRevealed: Boolean(card.isRevealed)
    };
  }

  // 서버(worker/routes/dream.js buildDreamTarotConsultPrompt)와 같은 문안이어야 한다.
  // 바닐라 스크립트라 워커 모듈을 import 할 수 없어 구조적으로 중복이며, 한쪽만 고치면 안 된다.
  function buildDreamV2ClientPrompt() {
    var compact = String(dreamPromptV2.dreamInput || '').replace(/\s+/g, ' ').trim();
    if (compact.length > 1200) compact = compact.slice(0, 1199) + '…';
    var themes = dreamPromptV2.dreamThemes.length ? dreamPromptV2.dreamThemes.join(', ') : '무의식, 감정의 잔향';
    var cardCount = dreamPromptV2.drawnCards.length;
    var cardLines = [];
    dreamPromptV2.drawnCards.forEach(function (entry, idx) {
      var card = entry.card || {};
      var orientation = entry.isReversed ? '역방향' : '정방향';
      var facets = card.arcana === 'major'
        ? ['메이저 아르카나 ' + card.number, '수비학 ' + card.number]
        : [(card.suit || '') + ' ' + card.number, '원소 ' + (card.element || ''), '수비학 ' + card.number];
      cardLines.push((idx + 1) + '. ' + card.nameKo + ' (' + (card.name || '') + ') · ' + orientation + ' · ' + facets.join(' · '));
      var upright = (card.uprightKeywords && card.uprightKeywords.length ? card.uprightKeywords : card.keywords).join(', ');
      var reversed = (card.reversedKeywords || []).join(', ');
      if (upright) cardLines.push('   정방향 키워드: ' + upright);
      if (reversed) cardLines.push('   역방향 키워드: ' + reversed);
      if (card.dreamMeaning) cardLines.push('   꿈에서의 결: ' + card.dreamMeaning);
    });

    return [
      '# 역할',
      '당신은 30년 이상 실전 경험을 가진 세계 최고 수준의 타로 마스터이자 꿈 해몽 전문가입니다.',
      'Rider-Waite 78장을 기준 덱으로 삼되 Marseille·Thoth의 상징 체계를 함께 이해하고 있으며,',
      'Carl Jung의 상징심리학을 해석의 뼈대로 사용합니다.',
      '지금부터 아래 자료를 바탕으로, 실제 전문 타로 상담사가 진행하는 수준의 꿈 상담을 해 주세요.',
      '',
      '# 상담 자료',
      '[꿈 원문]',
      compact,
      '',
      '[감지된 중심 주제] ' + themes,
      '[뽑힌 카드] ' + cardCount + '장'
    ].concat(cardLines).concat([
      '',
      '# 분석 순서 (반드시 이 순서를 지켜 주세요)',
      '① 꿈의 핵심 상징 분석 — 아래 항목으로 체계적으로 분류하되, 꿈에 실제로 등장한 것만 다룹니다.',
      '   인물 / 장소 / 동물 / 자연물 / 물 / 불 / 하늘 / 색 / 숫자 / 방향 / 날씨 / 건물 / 탈것 /',
      '   문 / 열쇠 / 음식 / 죽음 / 탄생 / 추락 / 비행 / 시험 / 학교 / 직장',
      '② 가장 중요한 감정 분석 — 꿈은 사건보다 감정이 중요합니다.',
      '   두려움 / 기쁨 / 안도 / 분노 / 슬픔 / 후회 / 죄책감 / 기대 / 설렘 중 어떤 감정이',
      '   꿈에서 어떤 역할을 했는지, 깨어난 뒤 어떤 여운으로 남았는지 먼저 짚습니다.',
      '③ 반복되는 상징 확인 — 같은 이미지·장면·감정이 되풀이되는지 살핍니다.',
      '④ 현재 현실과 연결 — 상징의 사전 뜻보다 이 사람의 개인 맥락이 우선입니다.',
      '⑤ 무의식의 메시지 추론',
      '⑥ 가장 적합한 타로 스프레드 선택 — 아래에서 고르고 선택 이유를 반드시 설명합니다.',
      '   불안한 꿈 → 3 Card Shadow Spread / 재회 꿈 → Relationship Spread /',
      '   돈 꿈 → Prosperity Spread / 직장 꿈 → Career Spread /',
      '   반복되는 꿈 → Cross Spread / 인생 전환 → Celtic Cross',
      '   뽑힌 카드가 ' + cardCount + '장이므로 ' + cardCount + '장으로 운용 가능한 스프레드를 고르거나,',
      '   ' + cardCount + '개의 자리 의미를 직접 정의하고 그 근거를 밝혀 주세요.',
      '⑦ 카드별 질문 설계 — 카드를 읽기 전에 물어야 할 질문을 먼저 세웁니다.',
      '   이 꿈은 무엇을 알려주려 하는가 / 내가 지금 놓치고 있는 것은 무엇인가 /',
      '   현재 가장 중요한 선택은 무엇인가 / 무의식이 경고하는 부분은 어디인가 /',
      '   앞으로 어떤 행동이 필요한가',
      '⑧ 카드 의미를 꿈과 연결',
      '⑨ 실질적인 조언',
      '⑩ 종합 메시지',
      '',
      '# 카드 해석 원칙',
      '각 카드마다 반드시 이 순서를 따릅니다. 단순한 카드 설명 나열은 금지합니다.',
      '  카드의 기본 상징 → 꿈속 상징과 연결 → 현재 상황과 연결 → 심리적 의미 → 행동 조언 → 주의사항',
      '정방향과 역방향을 정확히 구분합니다. 역방향은 \'나쁨\'이 아니라 방향·강도·내향화의 차이입니다.',
      '카드 이름만 보고 단편적으로 해석하지 말고, 상징·슈트·원소·수비학·점성술 대응·색채·',
      '인물이 향한 방향·배경 요소를 종합해 읽어 주세요.',
      '꿈속 상징과 슈트를 적극적으로 연결합니다.',
      '  물·감정 → Cups / 불·열정 → Wands / 돈·현실 → Pentacles / 갈등·생각 → Swords',
      '',
      '# 꿈 유형 분류',
      '먼저 이 꿈이 어떤 유형인지 분류하고, 유형에 따라 상담 방향을 달리합니다.',
      '  예지성 / 심리적 / 불안 / 희망 / 소망 / 스트레스 / 무의식 / 트라우마 / 성장 / 관계 / 치유',
      '',
      '# 융 심리학 관점',
      '가능한 경우 그림자, 아니마·아니무스, 개성화, 집단무의식, 원형(archetype)의 관점을 함께 참고합니다.',
      '단, 단정하지 말고 가능성으로 설명해 주세요.',
      '',
      '# 금지 사항',
      '- 카드 의미만 나열하기',
      '- 꿈 의미만 설명하고 카드와 연결하지 않기',
      '- 긍정적인 말만 반복하기',
      '- 모든 꿈을 길몽으로 해석하기',
      '- 모든 역방향을 나쁘게 해석하기',
      '- 근거 없는 예언, 단정적인 미래 예측',
      '',
      '# 출력 형식',
      '1. 꿈 유형 분류와 그 근거',
      '2. 상징 분석 (분류 / 등장한 것 / 상징적 의미 / 개인 맥락을 확인할 질문)',
      '3. 감정 지도 (감정 / 꿈에서의 역할 / 현실에서의 대응)',
      '4. 선택한 스프레드와 선택 이유, 각 자리의 의미',
      '5. 카드별 해석 (위 6단계 순서를 그대로 지킬 것)',
      '6. 카드 조합이 만드는 하나의 서사',
      '7. 융의 관점에서 본 무의식의 메시지 (단정 없이 가능성으로)',
      '8. 지금 붙잡아야 할 한 문장',
      '9. 앞으로 48시간 안에 실행할 수 있는 구체적인 행동 1가지',
      '10. 스스로에게 던질 질문 3가지',
      '',
      '읽는 사람이 "정말 상담을 받은 것 같다"고 느끼도록, 실제 프리미엄 타로 상담의 깊이와 일관성으로 작성해 주세요.'
    ]).join('\n');
  }

  function renderDreamV2Card(entry, idx) {
    var card = entry.card || {};
    var delay = dreamPromptV2.stage === 'drawing' ? ' style="--deal-delay:' + (idx * 0.15) + 's"' : '';
    var flipped = entry.isRevealed ? ' flipped' : '';
    var reversed = entry.isReversed ? '1' : '0';
    var keywords = Array.isArray(card.keywords) ? card.keywords.slice(0, 3) : [];
    // 카드 노출은 이미 순차 리빌 타이머로 게이트돼 있다. 여기에 loading="lazy" 를 겹치면
    // 지연 장치가 이중으로 걸려 뒤집었을 때 빈 카드가 보인다.
    var image;
    if (card.imageUrl) {
      var onError = card.imageFallbackUrl
        ? " onerror=\"if(this.dataset.fb){this.onerror=null;this.replaceWith(document.createTextNode(this.alt));return;}this.dataset.fb='1';this.src='" + escapeHtml(card.imageFallbackUrl) + "';\""
        : ' onerror="this.onerror=null;this.replaceWith(document.createTextNode(this.alt));"';
      image = '<img src="' + escapeHtml(card.imageUrl) + '" alt="' + escapeHtml(card.nameKo || card.name || '') + '" loading="eager" decoding="async"' + onError + '>';
    } else {
      image = '<span>' + escapeHtml(card.nameKo || card.name || 'Tarot') + '</span>';
    }
    return [
      '<article class="dream-v2-card"' + delay + '>',
        '<div class="card-flip' + flipped + '">',
          '<div class="card-back" aria-label="' + escapeHtml(dreamLedgerText('tarotBackAria')) + '"><span></span></div>',
          '<div class="card-front" data-reversed="' + reversed + '">',
            '<div class="dream-v2-card-art">' + image + '</div>',
            '<div class="dream-v2-card-info">',
              '<strong class="dream-v2-card-name">' + escapeHtml(card.nameKo || card.name || (dreamLedgerText('cardFallback') + ' ' + (idx + 1))) + '</strong>',
              entry.isReversed ? '<span class="reversed-badge">' + escapeHtml(dreamLedgerText('reversed')) + '</span>' : '',
              '<div class="dream-v2-keywords">' + keywords.map(function (kw) {
                return '<span>' + escapeHtml(kw) + '</span>';
              }).join('') + '</div>',
            '</div>',
          '</div>',
        '</div>',
      '</article>'
    ].join('');
  }

  function renderDreamPromptV2() {
    var stage = dreamPromptV2.stage;
    var inputScreen = $('dreamInputScreen');
    var resultWrap = $('dreamResultWrap');
    var cardStage = $('dreamV2CardStage');
    var promptPanel = $('dreamV2PromptPanel');
    var promptOutput = $('dreamPromptOutput');
    var summaryWrap = $('dreamV2CardsSummary');
    var copyHint = $('dreamCopyHint');
    var copyBtn = $('dreamCopyPromptBtn');
    var title = $('dreamCardTitle');
    var summary = $('dreamCardSummary');

    if (inputScreen) inputScreen.style.display = stage === 'input' ? 'block' : 'none';
    if (resultWrap) resultWrap.style.display = (stage === 'drawing' || stage === 'revealing' || stage === 'result') ? 'block' : 'none';
    if (cardStage) {
      cardStage.dataset.stage = stage;
      cardStage.innerHTML = dreamPromptV2.drawnCards.map(renderDreamV2Card).join('');
    }
    if (promptPanel) promptPanel.style.display = stage === 'result' ? 'block' : 'none';
    if (promptOutput) promptOutput.value = dreamPromptV2.dreamPrompt || '';
    if (summaryWrap) {
      summaryWrap.innerHTML = dreamPromptV2.drawnCards.map(function (entry) {
        return '<span class="card-chip"><span>' + escapeHtml(entry.card.nameKo) + '</span>' + (entry.isReversed ? '<b>역</b>' : '') + '</span>';
      }).join('');
    }
    if (copyHint) copyHint.style.display = dreamPromptV2.isCopied ? 'block' : 'none';
    if (copyBtn) copyBtn.textContent = dreamPromptV2.isCopied ? '복사됨' : '프롬프트 복사하기';

    if (title) {
      if (stage === 'drawing') title.textContent = '카드가 꿈의 문 앞에 놓입니다';
      else if (stage === 'revealing') title.textContent = '타로 상징이 하나씩 열립니다';
      else if (stage === 'result') title.textContent = '당신의 꿈을 위한 해몽 프롬프트';
      else title.textContent = 'Dream Tarot';
    }
    if (summary) {
      summary.textContent = stage === 'result'
        ? '복사해 원하는 AI에 건네면 꿈의 상징을 더 깊이 이어갈 수 있습니다.'
        : (dreamPromptV2.analysisNote || '꿈의 잔향과 맞닿은 카드가 펼쳐집니다.');
    }

    renderKeywordChips(stage === 'input' ? [] : dreamPromptV2.dreamThemes);
  }

  function revealDreamPromptV2Cards() {
    setDreamPromptStage('revealing');
    setDreamPromptLoader('', false);
    dreamPromptV2.drawnCards.forEach(function (_, idx) {
      queueDreamPromptV2Timer(function () {
        if (!dreamPromptV2.drawnCards[idx]) return;
        dreamPromptV2.drawnCards[idx].isRevealed = true;
        renderDreamPromptV2();
        if (idx === dreamPromptV2.drawnCards.length - 1) {
          queueDreamPromptV2Timer(generateDreamPromptV2, 650);
        }
      }, 360 + idx * 620);
    });
  }

  function startDreamPromptV2Drawing(data) {
    var sourceCards = Array.isArray(data && data.cards) && data.cards.length
      ? data.cards
      : ((data && Array.isArray(data.selectedCardIds)) ? data.selectedCardIds.map(function (id, idx) {
        return { id: id, nameKo: '카드 ' + (idx + 1), keywords: ['상징', '무의식'] };
      }) : []);
    dreamPromptV2.drawnCards = sourceCards.slice(0, getDreamCardCount()).map(function (card, idx) {
      return normalizeDreamV2Card({ card: card, isRevealed: false }, idx);
    });
    dreamPromptV2.dreamThemes = Array.isArray(data && data.dreamThemes) ? data.dreamThemes.slice(0, 5) : [];
    dreamPromptV2.analysisNote = String(data && data.analysisNote ? data.analysisNote : '').trim();
    setDreamPromptStage('drawing');
    setDreamPromptLoader('운명의 카드를 소환하고 있어요...', true);
    preloadDreamCardArt();
    queueDreamPromptV2Timer(revealDreamPromptV2Cards, 620 + dreamPromptV2.drawnCards.length * 150);
  }

  // 카드가 뒤집히기 전에 아트를 미리 받아 둔다(뒤집었을 때 빈 카드 방지).
  function preloadDreamCardArt() {
    dreamPromptV2.drawnCards.forEach(function (entry) {
      var url = entry && entry.card && entry.card.imageUrl;
      if (!url) return;
      var probe = new Image();
      probe.decoding = 'async';
      probe.src = url;
    });
  }

  function generateDreamPromptV2() {
    dreamPromptV2.isPrompting = true;
    setDreamPromptLoader('타로의 메시지를 프롬프트로 엮는 중이에요...', true);
    var cards = dreamPromptV2.drawnCards.map(function (entry) {
      return {
        id: entry.card.id,
        code: entry.card.code,
        nameKo: entry.card.nameKo,
        isReversed: entry.isReversed,
        keywords: entry.card.keywords,
        dreamMeaning: entry.card.dreamMeaning
      };
    });
    callDreamApi('dream-prompt', {
      dreamText: dreamPromptV2.dreamInput,
      dreamContent: dreamPromptV2.dreamInput,
      dreamThemes: dreamPromptV2.dreamThemes,
      cards: cards
    }).then(function (data) {
      dreamPromptV2.dreamPrompt = String((data && (data.dreamPrompt || data.promptText)) || '').trim() || buildDreamV2ClientPrompt();
    }).catch(function () {
      dreamPromptV2.dreamPrompt = buildDreamV2ClientPrompt();
    }).finally(function () {
      dreamPromptV2.isPrompting = false;
      setDreamPromptLoader('', false);
      setInteractionLocked(false);
      setDreamPromptStage('result');
      setWizardLine('카드가 남긴 결이 하나의 프롬프트로 봉인되었습니다.');
    });
  }

  var legacyCloseDreamModal = window.closeDreamModal;

  window.openDreamModal = function openDreamModal() {
    var overlay = $('dreamModalOverlay');
    if (!overlay) return;
    window.dreamReset();
    overlay.style.display = 'block';
    overlay.scrollTop = 0;
    setBodyLock(true);
    ensureAudioContext();
    window.requestAnimationFrame(function () {
      overlay.classList.add('dream-ledger-overlay--show');
    });
    syncInputEnergy();
    setWizardLine('꿈의 첫 장면과 깨어난 뒤 남은 감정을 적어 주세요. 무의식의 상점이 어울리는 카드를 조용히 꺼냅니다.');
    window.setTimeout(function () {
      var input = $('dreamInput');
      if (!input) return;
      try {
        input.focus({ preventScroll: false });
      } catch (_) {
        input.focus();
      }
    }, 120);
  };

  window.closeDreamModal = function closeDreamModal() {
    clearDreamPromptV2Timers();
    if (typeof legacyCloseDreamModal === 'function') {
      legacyCloseDreamModal();
      return;
    }
    var overlay = $('dreamModalOverlay');
    if (overlay) overlay.style.display = 'none';
    setBodyLock(false);
  };

  window.dreamReset = function dreamReset() {
    clearDreamPromptV2Timers();
    stopTyping();
    clearGoldenTimer();
    clearAutoRevealTimer();
    setInteractionLocked(false);
    dreamPromptV2.stage = 'input';
    dreamPromptV2.dreamInput = '';
    dreamPromptV2.drawnCards = [];
    dreamPromptV2.dreamThemes = [];
    dreamPromptV2.analysisNote = '';
    dreamPromptV2.dreamPrompt = '';
    dreamPromptV2.isCopied = false;
    dreamPromptV2.isPrompting = false;
    var input = $('dreamInput');
    if (input) input.value = '';
    var loader = $('dreamLoader');
    if (loader) loader.style.display = 'none';
    var resultWrap = $('dreamResultWrap');
    if (resultWrap) resultWrap.style.display = 'none';
    var promptPanel = $('dreamV2PromptPanel');
    if (promptPanel) promptPanel.style.display = 'none';
    setDreamPromptLoader('', false);
    renderDreamPromptV2();
    syncInputEnergy();
    setWizardLine('꿈의 첫 장면과 깨어난 뒤 남은 감정을 적어 주세요. 무의식의 상점이 어울리는 카드를 조용히 꺼냅니다.');
  };

  window.startDreamReading = function startDreamReading() {
    if (state.uiLocked || dreamPromptV2.isPrompting) return;
    var input = $('dreamInput');
    var text = input ? input.value.trim() : '';
    if (input && typeof input.blur === 'function') input.blur();
    if (!text) {
      setDreamPromptLoader('꿈의 장면을 먼저 적어 주세요.', true);
      queueDreamPromptV2Timer(function () { setDreamPromptLoader('', false); }, 1200);
      return;
    }
    clearDreamPromptV2Timers();
    setInteractionLocked(true);
    dreamPromptV2.dreamInput = text;
    dreamPromptV2.drawnCards = [];
    dreamPromptV2.dreamPrompt = '';
    dreamPromptV2.isCopied = false;
    setDreamPromptStage('analyzing');
    setDreamPromptLoader('꿈의 상징을 읽는 중이에요...', true);
    callDreamApi('dream-tarot', {
      dreamText: text,
      dreamContent: text,
      cardCount: getDreamCardCount()
    }).then(function (data) {
      startDreamPromptV2Drawing(data || {});
    }).catch(function () {
      setInteractionLocked(false);
      setDreamPromptStage('input');
      setDreamPromptLoader('꿈의 문이 잠시 닫혔습니다. 다시 시도해 주세요.', true);
      queueDreamPromptV2Timer(function () { setDreamPromptLoader('', false); }, 1600);
    });
  };

  window.dreamCopyPrompt = function dreamCopyPrompt() {
    var text = dreamPromptV2.dreamPrompt || (($('dreamPromptOutput') && $('dreamPromptOutput').value) || '');
    if (!text) return;
    function markCopied() {
      dreamPromptV2.isCopied = true;
      renderDreamPromptV2();
      queueDreamPromptV2Timer(function () {
        dreamPromptV2.isCopied = false;
        renderDreamPromptV2();
      }, 3000);
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(markCopied).catch(markCopied);
      return;
    }
    var output = $('dreamPromptOutput');
    if (output && typeof output.select === 'function') {
      output.select();
      try { document.execCommand('copy'); } catch (_) {}
    }
    markCopied();
  };

  window.dreamShareCard = window.dreamCopyPrompt;

  bindDirectTapAction('#dreamModalOverlay [data-action="dreamCopyPrompt"]', function () {
    window.dreamCopyPrompt();
  });
  bindDirectTapAction('#dreamModalOverlay [data-action="dreamReset"]', function () {
    window.dreamReset();
  });

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
