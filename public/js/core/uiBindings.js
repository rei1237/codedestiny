function callGlobal(fnName, ...args) {
  const fn = window[fnName];
  if (typeof fn === 'function') {
    return fn(...args);
  }
  return undefined;
}

const __lazyActionLoaders = {
  openPhysiognomyApp: () => __loadScriptOnce('AnalysisEngine.js').then(() => __loadScriptOnce('PhysiognomyUI.js')),
  openHwatuModal: () => __loadScriptOnce('HwatuFortune.js'),
  openMbtiModal: () => __loadScriptOnce('js/astral-soul.js'),
  openKemetModal: () => __loadScriptOnce('/js/oracle-kcg.js'),
  openDreamModal: () => __loadScriptOnce('/js/dream-ledger.js'),
  openPsychoDreamModal: () => __loadScriptOnce('/public/js/psycho-dream-analyzer-freuds-study.js'),
  openAnimalTotemModal: () =>
    __loadScriptOnce('/js/services/animal-totem-content-engine.js').then(() =>
      __loadScriptOnce('/js/animal-totem-experience.js')
    ),
  openTarotLoveModal: () => __loadScriptOnce('/js/tarot-love-experience.js?v=20260320-tarot-uifix2'),
  openTarotReunionModal: () => __loadScriptOnce('/js/tarot-reunion-experience.js?v=20260320-tarot-uifix2'),
  openTarotHealingModal: () => __loadScriptOnce('/js/tarot-healing-experience.js?v=20260320-tarot-uifix2'),
  openTarotSelfEsteemModal: () => __loadScriptOnce('/js/tarot-self-esteem-experience.js?v=20260320-tarot-uifix2'),
  openTarotYearFortuneModal: () => __loadScriptOnce('/js/tarot-year-fortune-experience.js?v=20260320-tarot-uifix2')
};

const __lazyActionState = {};

function __loadScriptOnce(src) {
  if (!src) return Promise.reject(new Error('missing src'));
  const normSrcRaw = src.replace(/^\.\//, '');
  const normSrc =
    /^(?:[a-z]+:)?\/\//i.test(normSrcRaw) || normSrcRaw.startsWith('data:') || normSrcRaw.startsWith('blob:')
      ? normSrcRaw
      : normSrcRaw.startsWith('/')
        ? normSrcRaw
        : '/' + normSrcRaw;
  const allScripts = Array.from(document.querySelectorAll('script[src]'));
  const existingBySrc = allScripts.find((s) => {
    const cur = (s.getAttribute('src') || '').replace(/^\.\//, '');
    return cur === normSrc || cur.endsWith('/' + normSrc);
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

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = normSrc;
    s.defer = true;
    s.async = true;
    s.dataset.loading = '1';
    s.onload = () => {
      s.dataset.loading = '0';
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = () => reject(new Error('load failed: ' + src));
    document.head.appendChild(s);
  });
}

function __resolveEventElement(event) {
  if (!event || !event.target) return null;
  if (event.target instanceof Element) return event.target;
  if (event.target.parentElement instanceof Element) return event.target.parentElement;
  return null;
}

function parseArgs(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function __callActionWithConfig(action, actionEl, event, args) {
  const passSelfMode = actionEl.getAttribute('data-action-pass-self');
  const passEvent = actionEl.getAttribute('data-action-pass-event') === '1';

  if (passSelfMode === 'append') return callGlobal(action, ...args, actionEl);
  if (passSelfMode === '1' || passSelfMode === 'prepend') return callGlobal(action, actionEl, ...args);
  if (passEvent) return callGlobal(action, event);
  if (args.length) return callGlobal(action, ...args);
  return callGlobal(action);
}

function __invokeAction(action, actionEl, event) {
  const args = parseArgs(actionEl.getAttribute('data-action-args'));
  const out = __callActionWithConfig(action, actionEl, event, args);

  const loader = __lazyActionLoaders[action];
  if (!loader) return;

  const hadFunction = typeof window !== 'undefined' && typeof window[action] === 'function';

  // If the function already exists, avoid redundant lazy-loading + retry loops.
  // Note: some actions (e.g. `openAnimalTotemModal`) might exist as stubs before
  // their full experience scripts load, so we keep the previous behavior there.
  if (action !== 'openAnimalTotemModal' && hadFunction) return;
  if (out !== undefined) return;

  if (!__lazyActionState[action]) {
    __lazyActionState[action] = loader().catch((err) => {
      console.error('[uiBindings] lazy action load failed:', action, err);
    });
  }

  __lazyActionState[action].then(() => {
    let attempt = 0;
    const maxAttempts = 12;
    const retryMs = 50;

    const tryInvokeOnceWhenReady = () => {
      if (typeof window[action] !== 'function') {
        if (attempt >= maxAttempts) return;
        attempt += 1;
        setTimeout(tryInvokeOnceWhenReady, retryMs);
        return;
      }

      // Many UI open handlers intentionally return `undefined` after DOM side-effects.
      // Do not retry based on return value; just call once when the function appears.
      __callActionWithConfig(action, actionEl, event, args);
    };

    tryInvokeOnceWhenReady();
  });
}

function bindEventAction(root, eventName, attrName) {
  root.addEventListener(eventName, (event) => {
    const target = __resolveEventElement(event);
    if (!target) return;
    const actionEl = target.closest(`[${attrName}]`);
    if (!actionEl) return;

    const action = actionEl.getAttribute(attrName);
    if (!action) return;

    __invokeAction(action, actionEl, event);
  });
}

export function bindGlobalActions(root) {
  if (!root || typeof root.addEventListener !== 'function') return;
  if (typeof window !== 'undefined') {
    // Do not bind twice; a non-module fallback may already be active.
    if (window.__codeDestinyGlobalActionsBound === 'uiBindings') return;
    if (window.__codeDestinyGlobalActionsBound && window.__codeDestinyGlobalActionsBound !== 'uiBindings') return;
    window.__codeDestinyGlobalActionsBound = 'uiBindings';
  }

  root.addEventListener('click', (event) => {
    const target = __resolveEventElement(event);
    if (!target) return;
    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.getAttribute('data-action');
    if (!action) return;

    if (actionEl.getAttribute('data-action-self-only') === '1' && target !== actionEl) {
      return;
    }

    if (actionEl.getAttribute('data-action-stop-propagation') === '1') {
      event.stopPropagation();
    }

    if (action === 'changeLanguage') {
      const lang = actionEl.getAttribute('data-lang');
      if (lang) {
        callGlobal('changeLanguage', lang, actionEl);
      }
      return;
    }

    __invokeAction(action, actionEl, event);
  });

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const action = target.getAttribute('data-change-action');
    if (!action) return;
    const args = parseArgs(target.getAttribute('data-change-args'));
    callGlobal(action, ...args);
  });

  bindEventAction(root, 'mousedown', 'data-mousedown-action');
  bindEventAction(root, 'mouseup', 'data-mouseup-action');
  bindEventAction(root, 'mouseleave', 'data-mouseleave-action');
  bindEventAction(root, 'touchstart', 'data-touchstart-action');
  bindEventAction(root, 'touchend', 'data-touchend-action');
  bindEventAction(root, 'touchcancel', 'data-touchcancel-action');
}
