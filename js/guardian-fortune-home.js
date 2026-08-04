(function (window, document) {
  'use strict';

  var FEATURE_FLAG = 'ENABLE_MAIN_GUARDIAN_FORTUNE';
  var UI_FEATURE_FLAG = 'ENABLE_GUARDIAN_FORTUNE_UI';
  var MOCK_FLOW_FLAG = 'ENABLE_GUARDIAN_FORTUNE_MOCK_FLOW';
  var API_FLOW_FLAG = 'ENABLE_GUARDIAN_FORTUNE_API';
  var SHARE_FLOW_FLAG = 'ENABLE_GUARDIAN_FORTUNE_SHARE';
  var root;
  var mock;
  var state = {
    mode: 'yeoni',
    topic: 'daily',
    category: '',
    flow: 'disabled',
    usage: 'guest-available',
    usageStatus: null,
    usageLoading: false,
    usageError: null,
    status: 'idle',
    result: null,
    shareEnabled: false,
    shareDraftToken: '',
    shareState: { status: 'idle' },
    sharePromise: null,
    chatQuestion: '',
    timer: null,
    abortController: null
  };

  /* Guardian Fortune uses the established human Neo from the strategy room.
     The transformation/lion sheet belongs to another surface and must not leak
     into this consultation stage. */
  var NEO_HUMAN_SPRITE_SRC = '/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp';
  var NEO_HUMAN_FRAME_BASE_SRC = '/neo-operation-room/sprites/transparent/neo-transparent-s1-f';
  var NEO_HUMAN_FRAME_MS = 1800;
  var NEO_HUMAN_FRAME_SEQUENCES = {
    idle: [1],
    loading: [1, 2, 1],
    success: [3, 1, 3],
    limit: [4, 1],
    error: [5, 1],
    validation: [6, 1]
  };
  var YEONI_FRAME_BASE_SRC = '/images/guardian-fortune/yeoni/flower-pig-f';
  var YEONI_FRAME_MS = 1800;
  var YEONI_FRAME_SEQUENCES = {
    idle: [16, 4, 16],
    loading: [4, 16, 4],
    success: [16, 4, 16],
    limit: [16],
    error: [16],
    validation: [16, 4]
  };
  var yeoniSpriteState = { key: '', index: 0, timer: null };
  var neoSpriteState = { key: '', index: 0, timer: null };
  var spriteVisibilityBound = false;

  var DUO_DIALOGUES = {
    daily: {
      yeoni: '오늘 하루는 마음이 편해지는 쪽부터 같이 살펴볼게요.',
      neo: '좋아. 오늘은 에너지 배분이 핵심이야. 힘 줄 곳만 고르자.'
    },
    love: {
      yeoni: '연애 흐름은 마음이 먼저 흔들리니까, 연이가 부드럽게 안아볼게요.',
      neo: '상대 마음을 단정하진 말자. 대신 지금 보이는 신호만 정리하면 돼.'
    },
    money_work: {
      yeoni: '돈과 일은 조급해지기 쉬워요. 오늘은 작게 안정되는 길을 찾아볼게요.',
      neo: '결과보다 구조. 오늘 한 가지를 정리하면 내일이 편해져.'
    },
    relationship: {
      yeoni: '관계는 말의 온도가 중요해요. 가까워지는 속도를 같이 맞춰봐요.',
      neo: '불필요한 해석은 줄이고, 선을 어디에 둘지만 분명히 하자.'
    },
    mind: {
      yeoni: '마음이 복잡한 날엔 먼저 숨을 고르면 좋아요. 연이가 곁에 있을게요.',
      neo: '생각이 많을수록 기준은 짧게. 오늘 할 일 하나만 남겨.'
    },
    decision: {
      yeoni: '선택 앞에서 떨리는 마음까지 함께 읽어볼게요.',
      neo: '완벽한 답보다 후회가 적은 기준. 거기서부터 판단하자.'
    },
    loading: {
      yeoni: '찻잔에 달빛을 데우는 중이에요. 조금만 기다려줘요.',
      neo: '근거를 정리 중이야. 말은 짧게, 핵심은 정확하게.'
    },
    success: {
      yeoni: '다 읽었어요. 오늘 마음에 남길 문장부터 천천히 봐요.',
      neo: '결론은 나왔어. 특히 오늘의 행동 힌트는 놓치지 마.'
    },
    limit: {
      yeoni: '오늘 무료 상담은 여기까지예요. 그래도 마음은 놓고 가도 돼요.',
      neo: '더 보려면 로그인이나 대화권 흐름으로 이어가면 돼. 결제 압박은 없어.'
    },
    validation: {
      yeoni: '필수 정보만 살짝 채워주면 연이가 더 섬세하게 읽어볼게요.',
      neo: '입력값을 정리하면 바로 시작할 수 있어. 생시까지 입력해야 상담 체계별 해석을 정확히 맞출 수 있어.'
    },
    error: {
      yeoni: '잠깐 흐름이 흐려졌어요. 실패한 요청은 결과처럼 남기지 않을게요.',
      neo: '서버가 삐끗했어. 조금 뒤 다시 시도하면 돼.'
    }
  };

  function isLocalDevelopment() {
    try {
      return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(String(window.location.hostname || '').toLowerCase());
    } catch (_) {
      return false;
    }
  }

  function flags() {
    try {
      return window.__CD_FEATURE_FLAGS__ || {};
    } catch (_) {
      return {};
    }
  }

  function enabled(name) {
    var value = flags()[name];
    return value === true || String(value || '').toLowerCase() === 'true';
  }

  function readFeatureFlow() {
    var local = isLocalDevelopment();
    var hasUiFlag = enabled(FEATURE_FLAG) || enabled(UI_FEATURE_FLAG);
    var apiFlag = enabled(API_FLOW_FLAG);
    var mockFlag = enabled(MOCK_FLOW_FLAG);
    if (hasUiFlag) {
      if (apiFlag) return 'api';
      if (mockFlag || local) return 'mock';
      return 'disabled';
    }
    if (!local) return 'disabled';
    try {
      var params = new URLSearchParams(window.location.search || '');
      if (params.get('guardianFortuneApi') === '1') return 'api';
      if (params.get('guardianFortune') === '1' || window.localStorage.getItem('__CD_ENABLE_MAIN_GUARDIAN_FORTUNE__') === '1') return 'mock';
    } catch (_) {}
    return 'disabled';
  }

  function readDebugFlag() {
    if (!isLocalDevelopment()) return false;
    try {
      var params = new URLSearchParams(window.location.search || '');
      return params.get('guardianFortuneDebug') === '1' || window.localStorage.getItem('__CD_GUARDIAN_FORTUNE_DEBUG__') === '1';
    } catch (_) {
      return false;
    }
  }

  function qs(selector) {
    return root ? root.querySelector(selector) : null;
  }

  function qsa(selector) {
    return root ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
  }

  function setText(selector, value) {
    var element = qs(selector);
    if (element) element.textContent = String(value == null ? '' : value);
  }

  function announce(message) {
    setText('[data-guardian-live]', message || '');
  }

  function showToast(message) {
    var toast = qs('[data-guardian-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.hidden = true;
    }, 2600);
  }

  function currentMode() {
    return mock.modes[state.mode];
  }

  function currentTopic() {
    return mock.topics[state.topic];
  }

  function prefersReducedMotion() {
    try {
      return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {
      return false;
    }
  }

  function yeoniFrameUrl(frame) {
    return YEONI_FRAME_BASE_SRC + String(frame).padStart(2, '0') + '.webp';
  }

  function clearYeoniTimer() {
    if (yeoniSpriteState.timer) {
      window.clearInterval(yeoniSpriteState.timer);
      yeoniSpriteState.timer = null;
    }
  }

  function setYeoniFrame(sprite, frame) {
    if (!sprite) return;
    sprite.style.backgroundImage = 'url("' + yeoniFrameUrl(frame) + '")';
    sprite.setAttribute('data-sprite-frame', String(frame));
  }

  function currentYeoniSpriteKey() {
    if (state.status === 'loading' || state.usageLoading) return 'loading';
    if (state.status === 'success') return 'success';
    if (state.status === 'limit') return 'limit';
    if (state.status === 'validation') return 'validation';
    if (state.status === 'error' || state.usageError) return 'error';
    return 'idle';
  }

  function stopYeoniSprite(sprite) {
    clearYeoniTimer();
    yeoniSpriteState.key = '';
    yeoniSpriteState.index = 0;
    if (sprite) {
      sprite.setAttribute('data-playing', 'false');
      setYeoniFrame(sprite, 16);
    }
  }

  function updateYeoniSprite() {
    var sprite = qs('[data-guardian-sprite="yeoni"]');
    if (!sprite) return;
    var key = currentYeoniSpriteKey();
    var sequence = YEONI_FRAME_SEQUENCES[key] || YEONI_FRAME_SEQUENCES.idle;
    var canAnimate = state.mode === 'yeoni' && !root.hidden && !document.hidden && !prefersReducedMotion();
    sprite.setAttribute('data-sprite-state', key);
    sprite.setAttribute('data-playing', canAnimate ? 'true' : 'false');
    if (yeoniSpriteState.key !== key) {
      clearYeoniTimer();
      yeoniSpriteState.key = key;
      yeoniSpriteState.index = 0;
      setYeoniFrame(sprite, sequence[0] || 16);
    }
    if (!canAnimate || sequence.length < 2) {
      clearYeoniTimer();
      if (!canAnimate) setYeoniFrame(sprite, sequence[0] || 16);
      return;
    }
    if (yeoniSpriteState.timer) return;
    yeoniSpriteState.timer = window.setInterval(function () {
      if (state.mode !== 'yeoni' || root.hidden || document.hidden || prefersReducedMotion()) {
        updateYeoniSprite();
        return;
      }
      yeoniSpriteState.index = (yeoniSpriteState.index + 1) % sequence.length;
      setYeoniFrame(sprite, sequence[yeoniSpriteState.index] || 1);
    }, YEONI_FRAME_MS);
  }

  function neoFrameUrl(frame) {
    return NEO_HUMAN_FRAME_BASE_SRC + String(frame).padStart(2, '0') + '.webp';
  }

  function clearNeoTimer() {
    if (neoSpriteState.timer) {
      window.clearTimeout(neoSpriteState.timer);
      neoSpriteState.timer = null;
    }
  }

  function setNeoFrame(sprite, frame, key) {
    sprite.style.backgroundImage = 'url("' + neoFrameUrl(frame) + '")';
    sprite.setAttribute('data-sprite-frame', String(frame));
    sprite.setAttribute('data-sprite-state', key);
  }

  function stopNeoSprite() {
    clearNeoTimer();
    neoSpriteState.key = '';
    neoSpriteState.index = 0;
  }

  function currentNeoSpriteKey() {
    if (state.status === 'loading' || state.usageLoading) return 'loading';
    if (state.status === 'success') return 'success';
    if (state.status === 'limit') return 'limit';
    if (state.status === 'error' || state.status === 'validation' || state.usageError) return 'error';
    return 'idle';
  }

  function updateNeoSprite() {
    var sprite = qs('[data-guardian-sprite="neo"]');
    if (!sprite) return;
    var key = currentNeoSpriteKey();
    var sequence = NEO_HUMAN_FRAME_SEQUENCES[key] || NEO_HUMAN_FRAME_SEQUENCES.idle;
    var canAnimate = state.mode === 'neo' && !root.hidden && !document.hidden && !prefersReducedMotion();
    sprite.setAttribute('data-playing', canAnimate ? 'true' : 'false');
    sprite.setAttribute('data-sprite-src', NEO_HUMAN_SPRITE_SRC);
    if (!canAnimate) {
      stopNeoSprite();
      setNeoFrame(sprite, sequence[0] || 1, key);
      return;
    }
    if (neoSpriteState.key !== key) {
      clearNeoTimer();
      neoSpriteState.key = key;
      neoSpriteState.index = 0;
    }
    setNeoFrame(sprite, sequence[neoSpriteState.index % sequence.length], key);
    if (!neoSpriteState.timer) {
      neoSpriteState.timer = window.setTimeout(function tickNeo() {
        neoSpriteState.timer = null;
        if (state.mode !== 'neo' || root.hidden || document.hidden || prefersReducedMotion()) {
          stopNeoSprite();
          return;
        }
        neoSpriteState.index = (neoSpriteState.index + 1) % sequence.length;
        updateNeoSprite();
      }, NEO_HUMAN_FRAME_MS);
    }
  }

  function updateCharacterStage() {
    qsa('[data-guardian-character]').forEach(function (character) {
      var isActive = character.getAttribute('data-guardian-character') === state.mode;
      character.hidden = !isActive;
      character.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
    root.setAttribute('data-guardian-motion-state', state.usageError ? 'error' : state.status || 'idle');
    updateYeoniSprite();
    updateNeoSprite();
  }

  function currentDuoDialogue() {
    if (state.status === 'validation') return DUO_DIALOGUES.validation;
    if (state.usageError || state.status === 'error') return DUO_DIALOGUES.error;
    if (state.status === 'loading' || state.usageLoading) return DUO_DIALOGUES.loading;
    if (state.status === 'success' && state.result) return DUO_DIALOGUES.success;
    if (state.status === 'limit') return DUO_DIALOGUES.limit;
    return DUO_DIALOGUES[state.topic] || DUO_DIALOGUES.daily;
  }

  function updateDuoDialogue() {
    updateCharacterStage();
    var chat = qs('[data-guardian-duo-chat]');
    var dialogue = currentDuoDialogue();
    if (chat) {
      var dialogueState = state.usageError ? 'error' : state.status === 'validation' ? 'error' : state.status || 'idle';
      chat.setAttribute('data-active-speaker', state.mode);
      chat.setAttribute('data-dialogue-state', dialogueState);
    }
    setText('[data-guardian-dialogue="yeoni"]', dialogue.yeoni);
    setText('[data-guardian-dialogue="neo"]', dialogue.neo);
    qsa('[data-guardian-dialogue]').forEach(function (node) {
      var isActive = node.getAttribute('data-guardian-dialogue') === state.mode;
      var bubble = node.closest ? node.closest('.guardian-fortune__duo-bubble') : node.parentNode;
      if (bubble) {
        bubble.hidden = !isActive;
        bubble.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      }
    });
  }

  function currentMockUsage() {
    return mock.usageStates[state.usage] || mock.usageStates['guest-available'];
  }

  function normalizeUsage(payload) {
    var value = payload && payload.usage ? payload.usage : payload;
    if (!value || typeof value !== 'object') return null;
    var isLoggedIn = Boolean(value.isLoggedIn);
    var dailyFreeRemaining = Math.max(0, Number(value.dailyFreeRemaining || 0));
    var paidCreditsRemaining = Math.max(0, Number(value.paidCreditsRemaining || 0));
    var guestFreeRemaining = Math.max(0, Number(value.guestFreeRemaining || 0));
    var canGenerate = Boolean(value.canGenerate);
    var isDisabled = String(value.generationSource || '') === 'blocked' && String(value.nextAction || '') === 'wait_tomorrow';
    var kind = isDisabled ? 'disabled' : !isLoggedIn ? 'guest' : dailyFreeRemaining > 0 ? 'auth' : paidCreditsRemaining > 0 ? 'credit' : 'exhausted';
    return {
      isLoggedIn: isLoggedIn,
      guestFreeLimit: Number(value.guestFreeLimit || 0),
      guestFreeUsed: Number(value.guestFreeUsed || 0),
      guestFreeRemaining: guestFreeRemaining,
      dailyFreeLimit: Number(value.dailyFreeLimit || 0),
      dailyFreeUsed: Number(value.dailyFreeUsed || 0),
      dailyFreeRemaining: dailyFreeRemaining,
      paidCreditsRemaining: paidCreditsRemaining,
      canGenerate: canGenerate,
      generationSource: String(value.generationSource || (canGenerate ? 'generate' : 'blocked')),
      nextAction: String(value.nextAction || (canGenerate ? 'generate' : isLoggedIn ? 'buy_credits' : 'login')),
      message: String(value.message || ''),
      kind: kind,
      isFeatureDisabled: isDisabled
    };
  }

  function getUsage() {
    if (state.flow === 'mock') return currentMockUsage();
    if (state.usageStatus) return state.usageStatus;
    return {
      isLoggedIn: false,
      canGenerate: false,
      nextAction: 'wait_tomorrow',
      message: '오늘의 상담 가능 횟수를 확인하는 중이에요…',
      kind: 'loading'
    };
  }

  function setMode(mode) {
    if (!mock.modes[mode]) return;
    state.mode = mode;
    root.setAttribute('data-guardian-mode', mode);
    qsa('[data-guardian-mode-button]').forEach(function (button) {
      var selected = button.getAttribute('data-guardian-mode-button') === mode;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    qsa('[data-mode-image]').forEach(function (image) {
      image.hidden = image.getAttribute('data-mode-image') !== mode;
    });
    var modeInfo = currentMode();
    setText('[data-guardian-room-label]', mode === 'neo' ? 'NEO STRATEGY ROOM' : 'LIVE MOON CONSULT');
    setText('[data-guardian-mode-title]', modeInfo.title);
    setText('[data-guardian-mode-description]', modeInfo.description);
    if (state.status !== 'loading') updateGenerateButton();
    else setLoadingCopy();
    updateDuoDialogue();
  }

  function setTopic(topic) {
    if (!mock.topics[topic]) return;
    state.topic = topic;
    qsa('[data-guardian-topic]').forEach(function (button) {
      var selected = button.getAttribute('data-guardian-topic') === topic;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    setText('[data-guardian-topic-description]', currentTopic().description);
    updateDuoDialogue();
  }

  function setCategory(category) {
    if (category && (!mock.categories || !mock.categories[category])) return;
    state.category = category || '';
    qsa('[data-guardian-category]').forEach(function (button) {
      var selected = button.getAttribute('data-guardian-category') === state.category;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    var description = qs('[data-guardian-category-description]');
    if (description) description.textContent = state.category
      ? mock.categories[state.category].description
      : '상담에 사용할 운세 체계 하나를 선택해 주세요.';
    var placeField = qs('[data-guardian-birth-place-field]');
    if (placeField) placeField.hidden = state.category !== 'vedic' && state.category !== 'astrology';
    updateGenerateButton();
  }

  function setLoadingCopy() {
    var generate = qs('[data-guardian-generate]');
    if (generate) generate.textContent = currentMode().loading;
  }

  function usageCopy(usage) {
    if (!usage) return '오늘의 상담 가능 횟수를 확인하는 중이에요.';
    if (usage.kind === 'loading') return '오늘의 상담 가능 횟수를 확인하는 중이에요.';
    if (!usage) return '오늘의 상담 가능 횟수를 확인하는 중이에요…';
    if (usage.message) return usage.message;
    if (!usage.isLoggedIn) {
      return usage.guestFreeRemaining > 0
        ? '첫 1회는 로그인 없이 무료로 볼 수 있어요.'
        : '첫 무료 상담을 이미 사용했어요. 로그인하면 하루 최대 3번까지 연이와 네오에게 물어볼 수 있어요.';
    }
    if (usage.dailyFreeRemaining > 0) return '오늘 남은 무료 상담 ' + usage.dailyFreeRemaining + '회';
    if (usage.paidCreditsRemaining > 0) return '오늘의 무료 상담은 모두 사용했어요. 보유 대화권 ' + usage.paidCreditsRemaining + '회 중 1회를 사용할 수 있어요.';
    return '오늘 이용 가능한 무료 상담을 모두 사용했어요. 대화권을 구매하면 더 물어볼 수 있어요.';
  }

  function setError(message) {
    setText('[data-guardian-error]', message || '');
    announce(message || '');
  }

  function setChatTyping(active) {
    var typing = qs('[data-guardian-chat-typing]');
    if (typing) typing.hidden = !active;
  }

  function setChatQuestion(question) {
    state.chatQuestion = String(question || '').trim();
    var message = qs('[data-guardian-chat-user]');
    var text = qs('[data-guardian-chat-user-text]');
    if (text) text.textContent = state.chatQuestion;
    if (message) message.hidden = !state.chatQuestion;
  }

  function updateUsage() {
    var usage = getUsage();
    var banner = qs('[data-guardian-usage]');
    var dataState = state.usageLoading ? 'loading' : state.usageError ? 'error' : usage.canGenerate ? 'available' : 'blocked';
    if (banner) {
      banner.setAttribute('data-state', dataState);
      banner.textContent = state.usageError ? '사용량을 확인하지 못했어요. 아래 버튼을 다시 눌러 주세요.' : usageCopy(usage);
    }
    if (banner && state.usageError) {
      banner.textContent = '사용량을 확인하지 못했어요. 아래 버튼을 다시 눌러 주세요.';
    }
    updateGenerateButton();
    renderCTA(usage);
    updateDuoDialogue();
  }

  function updateGenerateButton() {
    var generate = qs('[data-guardian-generate]');
    if (!generate) return;
    if (state.status === 'loading') {
      generate.disabled = true;
      setLoadingCopy();
      return;
    }
    if (state.flow === 'disabled') {
      generate.disabled = true;
      generate.textContent = '곧 다시 열릴 예정이에요';
      return;
    }
    if (state.usageLoading) {
      generate.disabled = true;
      generate.textContent = '사용량을 확인하는 중이에요…';
      return;
    }
    if (state.usageError) {
      generate.disabled = false;
      generate.textContent = '사용량 다시 확인하기';
      return;
    }
    var usage = getUsage();
    generate.disabled = !usage.canGenerate || !state.category;
    if (usage.canGenerate && !state.category) generate.textContent = '운세 카테고리를 먼저 골라주세요';
    else if (usage.canGenerate) generate.textContent = currentMode().button;
    else if (usage.nextAction === 'login') generate.textContent = '로그인하고 하루 최대 3회 보기';
    else if (usage.nextAction === 'buy_credits') generate.textContent = '대화권 보러가기';
    else generate.textContent = '곧 다시 열릴 예정이에요';
  }

  function addCTAButton(container, label, primary, action) {
    /* 대화권은 이용권·family 이용권·무료/이벤트권·잔여 크레딧으로 구매할 수 없으며, 홈 CTA는 상점 이동만 수행한다. */
    var element = action === 'login' || action === 'buy_credits' ? document.createElement('a') : document.createElement('button');
    element.className = 'guardian-fortune__cta-button' + (primary ? ' guardian-fortune__cta-button--primary' : '');
    element.setAttribute('data-guardian-cta-button', 'true');
    if (action) element.setAttribute('data-guardian-cta-action', action);
    element.textContent = label;
    if (action === 'login') element.href = '/auth/login';
    else if (action === 'buy_credits') element.href = '/points?source=guardian-fortune-credits#guardian-fortune-credit-heading';
    else if (action === 'premium') element.type = 'button';
    container.appendChild(element);
  }

  function renderCTA(usage) {
    var cta = qs('[data-guardian-cta]');
    if (!cta) return;
    var title = qs('[data-guardian-cta-title]');
    var description = qs('[data-guardian-cta-description]');
    var actions = qs('[data-guardian-cta-actions]');
    if (!title || !description || !actions) return;
    actions.innerHTML = '';
    if (!usage || state.usageLoading || state.usageError || usage.kind === 'disabled' || (usage.kind === 'guest' && usage.canGenerate)) {
      cta.hidden = true;
      return;
    }
    cta.hidden = false;
    if (usage.kind === 'guest') {
      title.textContent = '로그인하면 상담을 더 이어갈 수 있어요';
      description.textContent = '로그인하면 하루 최대 3번까지 연이와 네오에게 물어볼 수 있어요.';
      addCTAButton(actions, '가입하고 하루 최대 3회 보기', true, 'login');
      addCTAButton(actions, '로그인하고 이어서 보기', false, 'login');
      return;
    }
    if (usage.dailyFreeRemaining > 0) {
      title.textContent = '오늘 아직 ' + usage.dailyFreeRemaining + '번 더 물어볼 수 있어요.';
      description.textContent = '다른 분야를 골라 보거나 상담자를 바꿔서 이어서 살펴보세요.';
      addCTAButton(actions, '다른 상담 체계 고르기', true, 'focus-category');
      addCTAButton(actions, usage.kind === 'auth' ? '다른 모드로 보기' : '연이·네오 바꿔보기', false, 'focus-mode');
      return;
    }
    if (usage.paidCreditsRemaining > 0) {
      title.textContent = '무료 상담을 모두 사용했어요';
      description.textContent = '보유 대화권 ' + usage.paidCreditsRemaining + '회로 계속 물어볼 수 있어요.';
      addCTAButton(actions, '대화권 1회 사용해서 더 보기', true, 'generate');
      return;
    }
    title.textContent = '오늘의 무료 상담을 모두 사용했어요';
    description.textContent = '대화권을 구매하면 연이와 네오에게 더 물어볼 수 있어요.';
    addCTAButton(actions, '3회 대화권 보기', true, 'buy_credits');
    addCTAButton(actions, '10회 대화권 보기', false, 'buy_credits');
    addCTAButton(actions, '프리미엄 상담 보러가기', false, 'premium');
  }

  function readInput() {
    var date = qs('[data-guardian-input="birthDate"]');
    var time = qs('[data-guardian-input="birthTime"]');
    var gender = qs('[data-guardian-input="gender"]');
    var nickname = qs('[data-guardian-input="nickname"]');
    var concern = qs('[data-guardian-chat-input]') || qs('[data-guardian-input="concern"]');
    var calendar = qs('[data-guardian-calendar]:checked');
    var timeUnknown = qs('[data-guardian-input="birthTimeUnknown"]');
    var place = qs('[data-guardian-input="birthPlace"]');
    var placeOption = place && place.selectedIndex >= 0 ? place.options[place.selectedIndex] : null;
    return {
      birthDate: date ? date.value.trim() : '',
      birthTime: time && !(timeUnknown && timeUnknown.checked) ? time.value.trim() : '',
      birthTimeUnknown: Boolean(timeUnknown && timeUnknown.checked),
      birthPlace: placeOption && placeOption.value ? {
        city: placeOption.textContent.trim(),
        country: placeOption.getAttribute('data-country') || undefined,
        latitude: Number(placeOption.getAttribute('data-lat')),
        longitude: Number(placeOption.getAttribute('data-lon')),
        timezone: placeOption.getAttribute('data-timezone') || ''
      } : undefined,
      calendarType: calendar ? calendar.value : 'solar',
      gender: gender ? gender.value : 'unknown',
      nickname: nickname ? nickname.value.trim() : '',
      concern: concern ? concern.value.trim() : ''
    };
  }

  function getKoreaDateKey() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      var values = {};
      parts.forEach(function (part) { values[part.type] = part.value; });
      if (values.year && values.month && values.day) return values.year + '-' + values.month + '-' + values.day;
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (_) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function validateInput(input) {
    if (!state.category || !mock.categories[state.category]) return '운세 카테고리 하나를 선택해 주세요.';
    if (!input.birthDate) return mock.copy.validationMissingBirthDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) return mock.copy.validationBirthDateFormat;
    var date = new Date(input.birthDate + 'T00:00:00');
    if (Number.isNaN(date.getTime()) || date > new Date()) return '생년월일을 다시 확인해 주세요.';
    if (!input.birthTime && !input.birthTimeUnknown) return '생시를 입력하거나 “생시를 몰라요”를 선택해 주세요.';
    if (input.birthTime && !/^\d{2}:\d{2}$/.test(input.birthTime)) return '생시 형식을 한 번만 확인해 주세요.';
    if (input.concern.length > 120) return mock.copy.validationConcernLength;
    if (qs('[data-guardian-chat-input]') && input.concern.length < 2) return '연이에게 전할 오늘의 질문을 2자 이상 적어 주세요.';
    if (input.nickname.length > 20) return '닉네임은 20자 안에서 적어주세요.';
    if (['solar', 'lunar'].indexOf(input.calendarType) < 0) return '달력 기준을 선택해 주세요.';
    if (['female', 'male', 'unknown'].indexOf(input.gender) < 0) return '성별 선택을 다시 확인해 주세요.';
    return '';
  }

  function buildInput(input) {
    var request = {
      birthDate: input.birthDate,
      calendarType: input.calendarType,
      gender: input.gender || 'unknown',
      topic: state.topic,
      category: state.category,
      mode: 'yeoni',
      locale: 'ko-KR',
      targetDate: getKoreaDateKey()
    };
    if (input.birthTime) request.birthTime = input.birthTime;
    if (input.birthPlace) request.birthPlace = input.birthPlace;
    if (input.nickname) request.nickname = input.nickname;
    if (input.concern) request.concern = input.concern;
    return request;
  }

  function mockResult(raw) {
    var topicResult = mock.results[state.topic] || mock.results.daily;
    var categoryResult = mock.categoryResults && mock.categoryResults[state.category];
    var shared = mock.sharedCore;
    return {
      title: (raw && raw.title) || ('오늘의 ' + currentTopic().label + '을 읽어봤어요'),
      openingLine: (raw && raw.openingLine) || mock.copy.resultOpening[state.mode],
      innerState: (raw && raw.innerState) || shared.innerState,
      coreReading: (raw && raw.coreReading) || (categoryResult && categoryResult.coreReading) || topicResult.coreReading,
      topicAdvice: (raw && raw.topicAdvice) || topicResult.topicAdvice,
      cautionPattern: (raw && raw.cautionPattern) || shared.cautionPattern,
      luckyAction: (raw && raw.luckyAction) || shared.luckyAction,
      premiumCta: (raw && raw.premiumCta) || shared.cta,
      shareText: (raw && raw.shareText) || '오늘의 귀인 운세에서 내 흐름을 살펴봤어요.'
    };
  }

  function renderResult(raw, shareDraftToken) {
    var result = mockResult(raw);
    state.result = result;
    state.shareDraftToken = String(shareDraftToken || '');
    state.shareState = { status: 'idle' };
    state.sharePromise = null;
    var mode = currentMode();
    var resultRoot = qs('[data-guardian-result]');
    if (!resultRoot) return;
    resultRoot.hidden = false;
    resultRoot.setAttribute('aria-busy', 'false');
    qsa('[data-result-mode-image]').forEach(function (image) {
      image.hidden = image.getAttribute('data-result-mode-image') !== state.mode;
    });
    setText('[data-result-opening]', result.openingLine);
    setText('[data-result-inner-state]', result.innerState);
    setText('[data-result-core-reading]', result.coreReading);
    setText('[data-result-topic-advice]', result.topicAdvice);
    setText('[data-result-caution]', result.cautionPattern);
    setText('[data-result-action]', result.luckyAction);
    qsa('[data-result-cta-reason]').forEach(function (element) {
      element.textContent = result.premiumCta && result.premiumCta.reason ? result.premiumCta.reason : '';
    });
    setText('[data-result-mode-label]', mode.label + (state.flow === 'api' ? ' 상담 결과' : '의 mock 상담 결과'));
    setText('[data-result-title]', result.title);
    setText('[data-result-cta-label]', result.premiumCta && result.premiumCta.label ? result.premiumCta.label : '다른 상담 체계로 보기');
    setText('[data-result-provider]', state.flow === 'api' ? 'API mock preview' : 'mock preview');
    var fusionActions = qs('[data-result-cta] .guardian-fortune__cta-actions');
    if (fusionActions && !fusionActions.querySelector('[data-guardian-fusion-handoff]')) {
      var fusionLink = document.createElement('a');
      fusionLink.className = 'guardian-fortune__cta-button guardian-fortune__cta-button--primary';
      fusionLink.href = '/fusion-fortune';
      fusionLink.setAttribute('data-guardian-fusion-handoff', 'true');
      fusionLink.textContent = '초융합 사주로 더 깊게 보기';
      fusionActions.appendChild(fusionLink);
    }
    updateShareControls();
    updateUsage();
    setChatTyping(false);
    try {
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced && typeof resultRoot.scrollIntoView === 'function') resultRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {}
  }

  function decrementMockUsage() {
    if (state.usage === 'guest-available') state.usage = 'guest-used';
    else if (state.usage === 'auth-3') state.usage = 'auth-2';
    else if (state.usage === 'auth-2') state.usage = 'auth-1';
    else if (state.usage === 'auth-1') state.usage = 'auth-exhausted';
    else if (state.usage === 'auth-credit-5') state.usage = 'auth-credit-3';
    else if (state.usage === 'auth-credit-3') state.usage = 'auth-exhausted';
    else if (state.usage === 'auth-credit-10') state.usage = 'auth-credit-5';
  }

  function generateMock() {
    if (state.status === 'loading') return;
    var usage = currentMockUsage();
    if (!usage.canGenerate) {
      state.status = 'limit';
      setError(mock.copy.limitError);
      updateUsage();
      return;
    }
    var input = readInput();
    var validationError = validateInput(input);
    if (validationError) {
      state.status = 'validation';
      setError(validationError);
      var date = qs('[data-guardian-input="birthDate"]');
      if (date && !input.birthDate) date.focus();
      return;
    }
    state.status = 'loading';
    setError('');
    setChatQuestion(input.concern);
    hideResult();
    setChatTyping(true);
    setLoadingCopy();
    updateUsage();
    announce(currentMode().loading);
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(function () {
      if (state.usage === 'mock-error') {
        state.status = 'error';
        setChatTyping(false);
        setError(mock.copy.mockError);
        updateUsage();
        return;
      }
      state.status = 'success';
      decrementMockUsage();
      renderResult(null);
      announce(mock.copy.mockSuccessAnnouncement);
    }, 650);
  }

  function mapApiError(error) {
    var code = error && String(error.code || '');
    if (code === 'GUARDIAN_FORTUNE_FEATURE_DISABLED') return '오늘의 귀인 운세는 준비 중이에요.';
    if (code === 'GUARDIAN_FORTUNE_INVALID_INPUT') return '입력 내용을 한 번 확인해 주세요.';
    if (code === 'GUARDIAN_FORTUNE_GUEST_LIMIT_EXCEEDED') return '첫 무료 상담을 이미 사용했어요. 로그인하면 하루 최대 3번까지 연이와 네오에게 물어볼 수 있어요.';
    if (code === 'GUARDIAN_FORTUNE_DAILY_LIMIT_EXCEEDED' || code === 'GUARDIAN_FORTUNE_NO_CREDITS') return '오늘의 무료 상담을 모두 사용했어요. 대화권을 구매하면 더 물어볼 수 있어요.';
    if (code === 'GUARDIAN_FORTUNE_REQUEST_IN_PROGRESS') return '같은 상담을 준비하고 있어요. 잠시만 기다려 주세요.';
    if (code === 'GUARDIAN_FORTUNE_CONTEXT_FAILED' || code === 'GUARDIAN_FORTUNE_GENERATION_FAILED' || code === 'GUARDIAN_FORTUNE_RESULT_INVALID' || code === 'GUARDIAN_FORTUNE_USAGE_COMMIT_FAILED') return '지금은 귀인이 흐름을 읽는 데 문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
    if (error && error.name === 'AbortError') return '상담 요청이 취소되었어요.';
    return '연결이 불안정해요. 잠시 후 다시 시도해 주세요.';
  }

  function hideResult() {
    var result = qs('[data-guardian-result]');
    if (result) {
      result.hidden = true;
      result.setAttribute('aria-busy', 'true');
    }
    state.result = null;
    state.shareDraftToken = '';
    state.shareState = { status: 'idle' };
    state.sharePromise = null;
    setChatTyping(false);
    updateShareControls();
  }

  function getApiClient() {
    return window.CDGuardianFortuneApi;
  }

  async function loadUsage() {
    if (state.flow !== 'api') return;
    var api = getApiClient();
    if (!api || typeof api.fetchGuardianFortuneUsage !== 'function') {
      state.usageError = new Error('Guardian Fortune API client unavailable');
      state.usageLoading = false;
      updateUsage();
      return;
    }
    state.usageLoading = true;
    state.usageError = null;
    updateUsage();
    try {
      var payload = await api.fetchGuardianFortuneUsage();
      state.usageStatus = normalizeUsage(payload);
      state.usageError = null;
      state.status = 'idle';
    } catch (error) {
      state.usageError = error;
      if (error && error.usage) state.usageStatus = normalizeUsage(error.usage);
    } finally {
      state.usageLoading = false;
      updateUsage();
    }
  }

  async function generateApi() {
    if (state.status === 'loading') return;
    if (state.usageError) {
      await loadUsage();
      return;
    }
    var usage = state.usageStatus;
    if (!usage || !usage.canGenerate) {
      state.status = 'limit';
      setError(usageCopy(usage));
      updateUsage();
      return;
    }
    var formInput = readInput();
    var validationError = validateInput(formInput);
    if (validationError) {
      state.status = 'validation';
      setError(validationError);
      var date = qs('[data-guardian-input="birthDate"]');
      if (date && !formInput.birthDate) date.focus();
      return;
    }
    var input = buildInput(formInput);
    state.status = 'loading';
    setError('');
    setChatQuestion(formInput.concern);
    hideResult();
    setChatTyping(true);
    setLoadingCopy();
    updateUsage();
    announce(currentMode().loading);
    state.abortController = typeof window.AbortController === 'function' ? new window.AbortController() : null;
    try {
      var api = getApiClient();
      var payload = api && typeof api.generateGuardianFortuneChat === 'function'
        ? await api.generateGuardianFortuneChat(input, {
          signal: state.abortController && state.abortController.signal,
          onEvent: function (event) {
            if (event === 'status') announce('연이가 답변을 준비하고 있어요.');
          }
        })
        : await api.generateGuardianFortune(input, { signal: state.abortController && state.abortController.signal });
      state.status = 'success';
      state.usageStatus = normalizeUsage(payload.usage);
      state.usageError = null;
      renderResult(payload.result, payload.shareDraftToken);
      announce('오늘의 귀인 운세 결과가 준비되었어요.');
    } catch (error) {
      state.status = error && (error.code === 'GUARDIAN_FORTUNE_GUEST_LIMIT_EXCEEDED' || error.code === 'GUARDIAN_FORTUNE_DAILY_LIMIT_EXCEEDED' || error.code === 'GUARDIAN_FORTUNE_NO_CREDITS') ? 'limit' : 'error';
      if (error && error.usage) state.usageStatus = normalizeUsage(error.usage);
      hideResult();
      setError(mapApiError(error));
      announce(mapApiError(error));
    } finally {
      state.abortController = null;
      setChatTyping(false);
      updateUsage();
    }
  }

  function generate() {
    if (state.flow === 'disabled') {
      setError('오늘의 귀인 운세는 준비 중이에요.');
      updateUsage();
      return Promise.resolve();
    }
    if (state.flow === 'api') return generateApi();
    if (state.flow === 'mock') return generateMock();
    setError('오늘의 귀인 운세는 준비 중이에요.');
    updateUsage();
    return Promise.resolve();
  }

  function bindModeButtons() {
    qsa('[data-guardian-mode-button]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (state.status === 'loading') return;
        setMode(button.getAttribute('data-guardian-mode-button'));
      });
    });
  }

  function bindTopics() {
    qsa('[data-guardian-topic]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (state.status === 'loading') return;
        setTopic(button.getAttribute('data-guardian-topic'));
      });
    });
  }

  function bindCategories() {
    qsa('[data-guardian-category]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (state.status === 'loading') return;
        setCategory(button.getAttribute('data-guardian-category'));
      });
    });
  }

  function populateBirthPlaces() {
    var select = qs('[data-guardian-input="birthPlace"]');
    if (!select || select.getAttribute('data-populated') === 'true') return;
    var groups = Array.isArray(window.BIRTH_PLACE_GROUPS) ? window.BIRTH_PLACE_GROUPS : [];
    if (!groups.length) {
      groups = [{ label: '대한민국', places: [{ label: '대한민국 · 서울', tz: 'Asia/Seoul', lon: 126.978, lat: 37.5665 }] }];
    }
    groups.forEach(function (group) {
      var optgroup = document.createElement('optgroup');
      optgroup.label = String(group.label || '출생지');
      (Array.isArray(group.places) ? group.places : []).forEach(function (place) {
        if (!place || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lon)) || !place.tz) return;
        var option = document.createElement('option');
        option.value = String(place.label || place.tz);
        option.textContent = String(place.label || place.tz);
        option.setAttribute('data-country', String(place.label || '').split('·')[0].trim());
        option.setAttribute('data-lat', String(Number(place.lat)));
        option.setAttribute('data-lon', String(Number(place.lon)));
        option.setAttribute('data-timezone', String(place.tz));
        optgroup.appendChild(option);
      });
      if (optgroup.children.length) select.appendChild(optgroup);
    });
    select.setAttribute('data-populated', 'true');
  }

  function bindBirthPrecisionInputs() {
    var unknown = qs('[data-guardian-input="birthTimeUnknown"]');
    var time = qs('[data-guardian-input="birthTime"]');
    if (unknown && time) {
      var syncTimeState = function () {
        time.disabled = unknown.checked;
        if (unknown.checked) time.value = '';
      };
      unknown.addEventListener('change', syncTimeState);
      syncTimeState();
    }
    populateBirthPlaces();
  }

  function bindForm() {
    var form = qs('[data-guardian-form]');
    if (form) form.addEventListener('submit', function (event) {
      event.preventDefault();
      generate();
    });
  }

  function bindCharacterMotion() {
    if (spriteVisibilityBound) return;
    spriteVisibilityBound = true;
    document.addEventListener('visibilitychange', updateCharacterStage);
  }

  function applyQueryDefaults() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var queryTopic = params.get('guardianTopic');
      if (queryTopic && mock.topics[queryTopic]) state.topic = queryTopic;
      var queryCategory = params.get('guardianCategory');
      if (queryCategory && mock.categories && mock.categories[queryCategory]) state.category = queryCategory;
    } catch (_) {}
  }

  function shareImageUrl() {
    var path = state.mode === 'neo'
      ? NEO_HUMAN_SPRITE_SRC
      : '/images/fortune-tea-house/flower-pig-honey-hug.webp';
    try { return new URL(path, window.location.origin).toString(); } catch (_) { return path; }
  }

  function updateShareControls() {
    var hasResult = Boolean(state.result);
    var hasToken = Boolean(state.shareDraftToken);
    var isCreating = state.shareState && state.shareState.status === 'creating';
    var canShare = state.flow === 'api' && state.shareEnabled && hasResult && hasToken && !isCreating;
    qsa('[data-guardian-share-button]').forEach(function (button) {
      button.disabled = !canShare;
      button.setAttribute('aria-disabled', canShare ? 'false' : 'true');
    });
    var note = qs('[data-guardian-share-note]');
    if (note) {
      if (!state.shareEnabled) note.textContent = '공유 기능은 곧 연결될 예정이에요.';
      else if (hasResult && !hasToken) note.textContent = '이 결과는 공유 링크를 준비할 수 없는 상태예요.';
      else if (state.shareState && state.shareState.shareUrl) note.textContent = '공유 링크가 준비되었어요.';
      else note.textContent = '';
    }
    var fallback = qs('[data-guardian-share-fallback]');
    var urlInput = qs('[data-guardian-share-url]');
    var shareUrl = state.shareState && state.shareState.shareUrl ? state.shareState.shareUrl : '';
    if (fallback) fallback.hidden = !shareUrl || !(state.shareState.status === 'failed');
    if (urlInput && shareUrl) urlInput.value = shareUrl;
  }

  async function ensureShareSnapshot() {
    if (state.shareState && state.shareState.shareUrl) return state.shareState;
    if (state.sharePromise) return state.sharePromise;
    if (!state.shareDraftToken || !state.shareEnabled) throw new Error('GUARDIAN_FORTUNE_SHARE_UNAVAILABLE');
    var api = getApiClient();
    if (!api || typeof api.createGuardianFortuneShare !== 'function') throw new Error('GUARDIAN_FORTUNE_SHARE_CLIENT_UNAVAILABLE');
    state.shareState = { status: 'creating' };
    updateShareControls();
    state.sharePromise = api.createGuardianFortuneShare(state.shareDraftToken).then(function (payload) {
      state.shareState = {
        status: 'ready',
        shareId: String(payload.shareId || ''),
        shareUrl: String(payload.shareUrl || ''),
      };
      updateShareControls();
      return state.shareState;
    }).catch(function (error) {
      state.shareState = { status: 'failed', error: 'GUARDIAN_FORTUNE_SHARE_CREATE_FAILED' };
      state.sharePromise = null;
      updateShareControls();
      throw error;
    });
    return state.sharePromise;
  }

  async function shareResult(method) {
    if (state.status === 'loading' || !state.result || !state.shareEnabled) return;
    try {
      var shareInfo = await ensureShareSnapshot();
      var shareClient = window.CDGuardianFortuneShare;
      if (!shareClient || typeof shareClient.sharePreferred !== 'function') throw new Error('GUARDIAN_FORTUNE_SHARE_CLIENT_UNAVAILABLE');
      state.shareState = {
        status: 'sharing',
        shareId: shareInfo.shareId,
        shareUrl: shareInfo.shareUrl,
      };
      updateShareControls();
      var shared = await shareClient.sharePreferred(method, {
        title: state.result.title,
        text: state.result.shareText,
        url: shareInfo.shareUrl,
        imageUrl: shareImageUrl(),
      });
      state.shareState.status = 'ready';
      updateShareControls();
      if (shared && shared.cancelled) {
        announce('공유를 취소했어요. 결과는 그대로 남아 있어요.');
        return;
      }
      showToast(shared && shared.method === 'copy' ? '공유 링크가 복사되었어요.' : '공유할 준비가 되었어요.');
      announce('공유 링크가 준비되었어요.');
    } catch (_) {
      state.shareState.status = 'failed';
      updateShareControls();
      showToast('공유 링크를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
      announce('공유 링크를 준비하지 못했어요.');
    }
  }

  function bindShares() {
    qsa('[data-guardian-share-button]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (state.flow !== 'api') {
          showToast(mock.copy.shareToast);
          announce(mock.copy.shareAnnouncement);
          return;
        }
        shareResult(button.getAttribute('data-guardian-share-button'));
      });
    });
    updateShareControls();
  }

  function bindCTAs() {
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-guardian-cta-button], [data-guardian-result-cta]');
      if (!button || !root.contains(button)) return;
      var action = button.getAttribute('data-guardian-cta-action');
      if (action === 'generate') {
        event.preventDefault();
        generate();
        return;
      }
      if (action === 'buy_credits') {
        showToast('달빛 이용권 상점의 대화권 섹션으로 이동해요.');
        announce('대화권은 단건 결제로만 구매할 수 있어요.');
        return;
      }
      if (action === 'premium') {
        showToast('프리미엄 상담 연결은 다음 단계에서 진행돼요.');
        return;
      }
    if (action === 'focus-topic') {
        var topicList = qs('[data-guardian-topic]');
        if (topicList) topicList.focus();
      return;
    }
    if (action === 'focus-category') {
      var categoryButton = qs('[data-guardian-category]');
      if (categoryButton) categoryButton.focus();
      return;
    }
      if (action === 'focus-mode') {
        var modeButton = qs('[data-guardian-mode-button]');
        if (modeButton) modeButton.focus();
        return;
      }
      if (!button.href) showToast(mock.copy.ctaMockToast);
    });
  }

  function bindChatDialogs() {
    var trigger = qs('[data-guardian-intro-dialog-open]');
    var dialog = qs('[data-guardian-intro-dialog]');
    if (trigger && dialog && typeof dialog.showModal === 'function') {
      trigger.addEventListener('click', function () { dialog.showModal(); });
    }
  }

  function storeFusionHandoff() {
    if (!state.result) return;
    try {
      window.sessionStorage.setItem('cdGuardianFusionHandoffV1', JSON.stringify({
        version: 1,
        source: 'guardian',
        topic: state.topic,
        category: state.category,
        createdAt: Date.now()
      }));
    } catch (_) {}
  }

  function bindDebugUsage() {
    var debug = qs('[data-guardian-debug]');
    var select = qs('[data-guardian-debug-usage]');
    if (!debug || !select) return;
    if (state.flow !== 'mock') return;
    if (readDebugFlag()) debug.classList.add('is-visible');
    select.value = state.usage;
    select.addEventListener('change', function () {
      state.usage = select.value;
      state.status = 'idle';
      state.usageError = null;
      setError('');
      updateUsage();
    });
  }

  function enableFeature() {
    var legacy = document.getElementById('cdTodayHub');
    root = document.getElementById('guardianFortuneSection');
    mock = window.CDGuardianFortuneMock;
    if (!root || !mock) return;
    state.flow = readFeatureFlow();
    state.shareEnabled = state.flow === 'api' && (enabled(SHARE_FLOW_FLAG) || (isLocalDevelopment() && (function () {
      try { return new URLSearchParams(window.location.search || '').get('guardianFortuneShare') === '1'; } catch (_) { return false; }
    })()));
    if (legacy && state.flow !== 'disabled') {
      legacy.hidden = true;
      legacy.setAttribute('aria-hidden', 'true');
      legacy.setAttribute('data-guardian-replaced', 'true');
    }
    if (state.flow === 'disabled') return;
    root.hidden = false;
    state.mode = 'yeoni';
    root.setAttribute('data-guardian-chat-journey', 'true');
    root.setAttribute('data-guardian-mode', state.mode);
    root.setAttribute('data-guardian-flow', state.flow);
    root.setAttribute('data-guardian-share-enabled', state.shareEnabled ? 'true' : 'false');
    applyQueryDefaults();
    bindModeButtons();
    bindTopics();
    bindCategories();
    bindBirthPrecisionInputs();
    bindForm();
    bindCharacterMotion();
    bindShares();
    bindCTAs();
    bindChatDialogs();
    bindDebugUsage();
    setMode(state.mode);
    setTopic(state.topic);
    setCategory(state.category);
    updateUsage();
    if (state.flow === 'api') loadUsage();
    root.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('[data-guardian-fusion-handoff]') : null;
      if (link && root.contains(link)) storeFusionHandoff();
    });
  }

  function boot() {
    enableFeature();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
