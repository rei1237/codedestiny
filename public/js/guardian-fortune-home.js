(function (window, document) {
  'use strict';

  var FEATURE_FLAG = 'ENABLE_MAIN_GUARDIAN_FORTUNE';
  var root;
  var mock;
  var state = {
    mode: 'yeoni',
    topic: 'daily',
    usage: 'guest-available',
    status: 'idle',
    timer: null
  };

  function isLocalDevelopment() {
    try {
      return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(String(window.location.hostname || '').toLowerCase());
    } catch (_) {
      return false;
    }
  }

  function readFlag() {
    try {
      var flags = window.__CD_FEATURE_FLAGS__;
      if (flags && flags[FEATURE_FLAG] === true) return true;
      if (!isLocalDevelopment()) return false;
      var params = new URLSearchParams(window.location.search || '');
      return params.get('guardianFortune') === '1' || window.localStorage.getItem('__CD_ENABLE_MAIN_GUARDIAN_FORTUNE__') === '1';
    } catch (_) {
      return false;
    }
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
    setText('[data-guardian-live]', message);
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

  function currentUsage() {
    return mock.usageStates[state.usage] || mock.usageStates['guest-available'];
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
    setText('[data-guardian-mode-title]', modeInfo.title);
    setText('[data-guardian-mode-description]', modeInfo.description);
    var generate = qs('[data-guardian-generate]');
    if (generate && state.status !== 'loading') generate.textContent = modeInfo.button;
    if (state.status === 'loading') setLoadingCopy();
  }

  function setTopic(topic) {
    if (!mock.topics[topic]) return;
    state.topic = topic;
    qsa('[data-guardian-topic]').forEach(function (button) {
      var selected = button.getAttribute('data-guardian-topic') === topic;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    setText('[data-guardian-topic-description]', currentTopic().description);
  }

  function setLoadingCopy() {
    var generate = qs('[data-guardian-generate]');
    if (generate) generate.textContent = currentMode().loading;
  }

  function updateUsage() {
    var usage = currentUsage();
    var banner = qs('[data-guardian-usage]');
    if (banner) {
      banner.setAttribute('data-state', usage.canGenerate ? 'available' : 'blocked');
      banner.textContent = usage.copy;
    }
    var generate = qs('[data-guardian-generate]');
    if (generate) {
      generate.disabled = state.status === 'loading' || !usage.canGenerate;
      if (state.status !== 'loading') {
        generate.textContent = usage.canGenerate ? currentMode().button : '오늘은 더 물어보려면 대화권이 필요해요';
      }
    }
    renderCTA(usage);
  }

  function renderCTA(usage) {
    var cta = qs('[data-guardian-cta]');
    if (!cta) return;
    var title = qs('[data-guardian-cta-title]');
    var description = qs('[data-guardian-cta-description]');
    var actions = qs('[data-guardian-cta-actions]');
    if (!title || !description || !actions) return;
    actions.innerHTML = '';
    if (usage.kind === 'guest' && usage.canGenerate) {
      cta.hidden = true;
      return;
    }
    cta.hidden = false;
    if (usage.kind === 'guest') {
      title.textContent = '내 흐름을 더 이어서 보고 싶다면';
      description.textContent = '로그인하면 하루 3번까지 연이와 네오에게 물어볼 수 있어요.';
      addCTAButton(actions, '무료로 가입하고 3회 받기', true);
      addCTAButton(actions, '로그인하고 이어서 보기', false);
      return;
    }
    if (usage.kind === 'auth' || usage.kind === 'credit') {
      cta.hidden = true;
      return;
    }
    title.textContent = '오늘의 상담을 더 깊게 이어가려면';
    description.textContent = '대화권을 구매하면 연이와 네오에게 다른 분야도 더 물어볼 수 있어요.';
    addCTAButton(actions, '3회 대화권 보기', true);
    addCTAButton(actions, '10회 대화권 보기', false);
    addCTAButton(actions, '프리미엄 상담 보러가기', false);
  }

  function addCTAButton(container, label, primary) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'guardian-fortune__cta-button' + (primary ? ' guardian-fortune__cta-button--primary' : '');
    button.setAttribute('data-guardian-cta-button', 'true');
    button.textContent = label;
    container.appendChild(button);
  }

  function setError(message) {
    setText('[data-guardian-error]', message || '');
    announce(message || '');
  }

  function readInput() {
    var date = qs('[data-guardian-input="birthDate"]');
    var time = qs('[data-guardian-input="birthTime"]');
    var unknown = qs('[data-guardian-input="birthTimeUnknown"]');
    var gender = qs('[data-guardian-input="gender"]');
    var nickname = qs('[data-guardian-input="nickname"]');
    var concern = qs('[data-guardian-input="concern"]');
    var calendar = qs('[data-guardian-calendar]:checked');
    return {
      birthDate: date ? date.value.trim() : '',
      birthTime: unknown && unknown.checked ? '' : (time ? time.value.trim() : ''),
      calendarType: calendar ? calendar.value : 'solar',
      gender: gender ? gender.value : 'unknown',
      nickname: nickname ? nickname.value.trim() : '',
      concern: concern ? concern.value.trim() : ''
    };
  }

  function validateInput(input) {
    if (!input.birthDate) return '생년월일을 알려주면 오늘의 흐름을 더 구체적으로 볼 수 있어요.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) return '생년월일 형식을 한 번만 확인해 주세요.';
    if (input.concern.length > 120) return '고민 한 줄은 120자 안에서 적어주세요.';
    return '';
  }

  function decrementMockUsage() {
    if (state.usage === 'guest-available') {
      state.usage = 'guest-used';
      return;
    }
    if (state.usage === 'auth-3') state.usage = 'auth-2';
    else if (state.usage === 'auth-2') state.usage = 'auth-1';
    else if (state.usage === 'auth-1') state.usage = 'auth-exhausted';
    else if (state.usage === 'auth-credit-5') state.usage = 'auth-credit-3';
    else if (state.usage === 'auth-credit-3') state.usage = 'auth-exhausted';
    else if (state.usage === 'auth-credit-10') state.usage = 'auth-credit-5';
  }

  function renderResult() {
    var result = mock.results[state.topic] || mock.results.daily;
    var mode = currentMode();
    var shared = mock.sharedCore;
    var resultRoot = qs('[data-guardian-result]');
    if (!resultRoot) return;
    resultRoot.hidden = false;
    qsa('[data-result-mode-image]').forEach(function (image) {
      image.hidden = image.getAttribute('data-result-mode-image') !== state.mode;
    });
    setText('[data-result-opening]', state.mode === 'neo'
      ? '네오가 보기엔, 지금 문제는 운이 없는 게 아니라 이미 알고 있는 답을 확인받고 싶어 한다는 점이야.'
      : '연이가 보기엔, 오늘 너는 괜찮은 척하면서도 마음속으로는 이미 중요한 답을 거의 정해둔 상태에 가까워 보여.');
    setText('[data-result-inner-state]', shared.innerState);
    setText('[data-result-core-reading]', result.coreReading);
    setText('[data-result-topic-advice]', result.topicAdvice);
    setText('[data-result-caution]', shared.cautionPattern);
    setText('[data-result-action]', shared.luckyAction);
    qsa('[data-result-cta-reason]').forEach(function (element) {
      element.textContent = shared.cta.reason;
    });
    setText('[data-result-mode-label]', mode.label + '의 mock 상담 결과');
    var resultTitle = qs('[data-result-title]');
    if (resultTitle) resultTitle.textContent = '오늘의 ' + currentTopic().label + '을 읽어봤어요';
    var resultCta = qs('[data-result-cta-label]');
    if (resultCta) resultCta.textContent = shared.cta.label;
    updateUsage();
    try {
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced && typeof resultRoot.scrollIntoView === 'function') resultRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {}
  }

  function generateMock() {
    if (state.status === 'loading') return;
    var usage = currentUsage();
    if (!usage.canGenerate) {
      state.status = 'limit';
      setError('오늘 사용할 수 있는 상담을 모두 사용했어요. 아래 안내에서 다음 방법을 확인해 주세요.');
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
    setLoadingCopy();
    updateUsage();
    announce(currentMode().loading);
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(function () {
      state.status = 'success';
      decrementMockUsage();
      renderResult();
      announce('mock 상담 결과가 준비되었어요.');
      updateUsage();
    }, 650);
  }

  function bindModeButtons() {
    qsa('[data-guardian-mode-button]').forEach(function (button) {
      button.addEventListener('click', function () {
        setMode(button.getAttribute('data-guardian-mode-button'));
      });
    });
  }

  function bindTopics() {
    qsa('[data-guardian-topic]').forEach(function (button) {
      button.addEventListener('click', function () {
        setTopic(button.getAttribute('data-guardian-topic'));
      });
    });
  }

  function bindForm() {
    var form = qs('[data-guardian-form]');
    if (form) form.addEventListener('submit', function (event) {
      event.preventDefault();
      generateMock();
    });
    var unknown = qs('[data-guardian-input="birthTimeUnknown"]');
    var time = qs('[data-guardian-input="birthTime"]');
    if (unknown && time) unknown.addEventListener('change', function () {
      time.disabled = unknown.checked;
      if (unknown.checked) time.value = '';
    });
  }

  function bindShares() {
    qsa('[data-guardian-share-button]').forEach(function (button) {
      button.addEventListener('click', function () {
        showToast('공유 기능은 다음 단계에서 연결될 예정이에요.');
        announce('공유 기능은 아직 mock 상태예요.');
      });
    });
  }

  function bindCTAs() {
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-guardian-cta-button], [data-guardian-result-cta]');
      if (!button || !root.contains(button)) return;
      showToast('이 CTA는 mock 상태예요. 실제 가입·결제 연결은 다음 단계에서 진행합니다.');
    });
  }

  function bindDebugUsage() {
    var debug = qs('[data-guardian-debug]');
    var select = qs('[data-guardian-debug-usage]');
    if (!debug || !select) return;
    if (readDebugFlag()) debug.classList.add('is-visible');
    select.value = state.usage;
    select.addEventListener('change', function () {
      state.usage = select.value;
      state.status = 'idle';
      setError('');
      updateUsage();
    });
  }

  function enableFeature() {
    var legacy = document.getElementById('cdTodayHub');
    root = document.getElementById('guardianFortuneSection');
    mock = window.CDGuardianFortuneMock;
    if (!root || !mock) return;
    if (legacy) {
      legacy.hidden = true;
      legacy.setAttribute('aria-hidden', 'true');
      legacy.setAttribute('data-guardian-replaced', 'true');
    }
    root.hidden = false;
    root.setAttribute('data-guardian-mode', state.mode);
    bindModeButtons();
    bindTopics();
    bindForm();
    bindShares();
    bindCTAs();
    bindDebugUsage();
    setMode(state.mode);
    setTopic(state.topic);
    updateUsage();
  }

  function boot() {
    if (!readFlag()) return;
    enableFeature();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
