function callGlobal(fnName, ...args) {
  const fn = window[fnName];
  if (typeof fn === 'function') {
    return fn(...args);
  }
  return undefined;
}

if (typeof window !== 'undefined' && typeof window.openSajuAnimalPage !== 'function') {
  window.openSajuAnimalPage = function openSajuAnimalPage() {
    window.location.assign('/saju-picture');
  };
}

if (typeof window !== 'undefined' && typeof window.openDestinyEggPage !== 'function') {
  window.openDestinyEggPage = function openDestinyEggPage() {
    window.location.assign('/tadagochi');
  };
}

if (typeof window !== 'undefined' && typeof window.openFortuneTellerFishPage !== 'function') {
  window.openFortuneTellerFishPage = function openFortuneTellerFishPage() {
    window.location.assign('/fortune-teller-fish.html');
  };
}

const __lazyActionLoaders = {
  checkPrivacyAndCalculate: () => __ensureSajuCoreScripts(),
  agreeAndCalculate: () => __ensureSajuCoreScripts(),
  calculate: () => __ensureSajuCoreScripts(),
  runCompat: () => __ensureSajuCoreScripts(),
  openPhysiognomyApp: () => __loadScriptOnce('AnalysisEngine.js?v=20260511-physio-stallfix1').then(() => __loadScriptOnce('PhysiognomyUI.js?v=20260511-physio-stallfix1')),
  openHwatuModal: () => __loadScriptOnce('HwatuFortune.js'),
  openJuyukModal: () => __loadScriptOnce('/js/iching-modal.js'),
  openMbtiModal: () => __loadScriptOnce('js/astral-soul.js'),
  openKemetModal: () => __loadScriptOnce('/js/oracle-kcg.js'),
  openDreamModal: () => __loadScriptOnce('/lib/ai-engine.js').then(() => __loadScriptOnce('/js/dream-ledger.js')),
  openPsychoDreamModal: () => __loadScriptOnce('/js/psycho-dream-analyzer-freuds-study.js'),
  openAnimalTotemModal: () =>
    __loadScriptOnce('/js/services/animal-totem-content-engine.js').then(() =>
      __loadScriptOnce('/js/animal-totem-experience.js')
    ),
  openSajuAnimalPage: () => Promise.resolve(window.location.assign('/saju-picture')),
  openDestinyEggPage: () => Promise.resolve(window.location.assign('/tadagochi')),
  openFortuneTellerFishPage: () => Promise.resolve(window.location.assign('/fortune-teller-fish.html')),
  openTarotLoveModal: () => __loadScriptOnce('/js/tarot-love-experience.js?v=20260414-tarot-qualityfix2'),
  openTarotReunionModal: () => __loadScriptOnce('/js/tarot-reunion-experience.js?v=20260414-tarot-qualityfix2'),
  openTarotHealingModal: () => Promise.resolve(window.location.assign('/tarot/healing')),
  openTarotSelfEsteemModal: () => __loadScriptOnce('/js/tarot-self-esteem-experience.js?v=20260414-tarot-qualityfix2'),
  openTarotYearFortuneModal: () => __loadScriptOnce('/js/tarot-year-fortune-experience.js?v=20260414-tarot-qualityfix2'),
  openOlympusOracleModal: () => __loadScriptOnce('/js/olympus-oracle.js'),
  gotoZiweiPremium: () => __loadScriptOnce('/js/ziwei-book.js?v=build-1779373697155'),
  gotoAstrologyPremium: () => __loadScriptOnce('/js/astro-book.js?v=build-1779373697155'),
  gotoSukuyoPremium: () => __loadScriptOnce('/js/sukuyo-book.js?v=build-1779373697155'),
  gotoVedicPremium: () => __loadScriptOnce('/js/vedic-book.js?v=build-1779373697155'),
  gotoNamingPremium: () => Promise.resolve().then(() => {
    window.location.href = '/myungwun_final.html';
  }),
  openSibylModal: () => __loadScriptOnce('/js/sibyl-system.js?v=20260512-quantum-v4').then(() => {
    if (typeof window.openSibylModal === 'function') window.openSibylModal();
  }),
  openSajuNewYearModal: () => __loadScriptOnce('/js/saju-new-year.js?v=build-1779373697155'),
  openLifeBookModal: () => __loadScriptOnce('/js/life-book.js?v=build-1779373697155'),
  openLoveSecretModal: () => __loadScriptOnce('/js/love-secret-v2.js?v=build-1779373697155')
};

function __ensureSajuCoreScripts() {
  return __loadScriptOnce('/js/destiny-profile.js')
    .then(() => __loadScriptOnce('/js/services/sajuService.js'))
    .then(() => __loadScriptOnce('/js/core/saju/modalProfileState.js'))
    .then(() => __loadScriptOnce('/js/admin-flower.js'));
}

const __lazyActionState = {};
const __INDEX_INLINE_RUNTIME_SRC = '/js/core/index-inline-runtime.js?v=build-1779373697155';
const __MOBILE_BACKSTACK_SRC = '/js/mobile-backstack-navigation.js?v=build-1779373697155';

function __ensureMobileBackstackLoaded() {
  return __loadScriptOnce(__MOBILE_BACKSTACK_SRC).catch((err) => {
    console.error('[uiBindings] mobile-backstack lazy load failed:', err);
  });
}

if (typeof window !== 'undefined') {
  __ensureMobileBackstackLoaded();
}

/** INP: 무거운 data-action 핸들러를 다음 태스크로 미룸 (index-inline-runtime 의 __CD_DEFER_INP_ACTIONS 와 동일) */
const __CD_DEFER_INP_ACTIONS = new Set([
  'checkPrivacyAndCalculate',
  'agreeAndCalculate',
  'calculate',
  'runCompat',
  'startTarotReading',
  'startTarotLoveReading',
  'startTarotHealingReading',
  'startTarotReunionReading',
  'startTarotSelfEsteemReading',
  'startDreamReading',
  'startKemetOracle',
  'startQuantumAnalysis',
  'startAnimalTotemRitual',
  'psychoDreamStartAnalysis',
  'showTarotFinalInterpretation',
  'showTarotLoveFinalReading',
  'showTarotHealingFinalReading',
  'showTarotReunionFinalReading',
  'showTarotSelfEsteemFinalReading',
  'dreamLibrarySearch',
  'dreamLibrarySearchByDream',
  'dreamLibraryLoadMore',
  'revealDreamStage',
  'nextDreamStage'
]);

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

function __ensureIndexInlineRuntimeLoaded() {
  return __loadScriptOnce(__INDEX_INLINE_RUNTIME_SRC);
}

function __resolveEventElement(event) {
  if (!event || !event.target) return null;
  if (event.target instanceof Element) return event.target;
  if (event.target.parentElement instanceof Element) return event.target.parentElement;
  return null;
}

const __CD_COLLECTION_TAP_GUARD = Object.freeze({
  moveThresholdPx: 8,
  moveDetectPx: 2,
  verticalBlockPx: 6,
  recentScrollBlockMs: 200,
  maxTapDurationMs: 500,
  dragSuppressMs: 200,
  ghostClickLockMs: 200
});

const __cdCollectionTapGuardState = {
  starts: new Map(),
  suppressUntil: 0,
  lastScrollAt: 0
};

function __cdIsCollectionTapGuardTarget(target) {
  if (!target || !target.closest) return false;
  if (target.closest('.fc-toggle-btn, .feat-collection__header, .tarot-collection__header')) return false;
  if (target.closest('[data-action="toggleCollection"]')) return false;
  return !!target.closest(
    '.feature-card-grid .tarot-tile, .feature-card-grid .prem-card, .feature-card-grid .lifebook-tile, .feature-card-grid .lovebible-tile, .feature-card-grid .feature-card__launch, .feature-card-grid .feature-card__cta, .feat-collection__grid .tarot-tile, .tarot-collection__grid .tarot-tile, .feat-collection__grid .prem-card, .tarot-collection__grid .prem-card, .feat-collection__grid .lifebook-tile, .feat-collection__grid .lovebible-tile, .tarot-collection__grid .lifebook-tile, .tarot-collection__grid .lovebible-tile'
  );
}

function __cdSetCollectionTapSuppressed(durationMs) {
  const until = Date.now() + Math.max(0, Number(durationMs) || 0);
  if (until > __cdCollectionTapGuardState.suppressUntil) {
    __cdCollectionTapGuardState.suppressUntil = until;
  }
}

function __cdShouldSuppressCollectionTapEvent(event, target) {
  const resolvedTarget = target || __resolveEventElement(event);
  if (!__cdIsCollectionTapGuardTarget(resolvedTarget)) return false;
  if (event && event.type === 'click' && typeof event.detail === 'number' && event.detail === 0) return false;
  if (Date.now() - __cdCollectionTapGuardState.lastScrollAt < __CD_COLLECTION_TAP_GUARD.recentScrollBlockMs) {
    return true;
  }
  return Date.now() < __cdCollectionTapGuardState.suppressUntil;
}

function __cdBindCollectionTapGuard(root) {
  if (!root || root.__cdCollectionTapGuardBound) return;
  root.__cdCollectionTapGuardBound = true;

  const handleTouchStart = (event) => {
    const target = __resolveEventElement(event);
    if (!__cdIsCollectionTapGuardTarget(target)) return;
    if (!event.touches || !event.touches.length) return;

    for (let i = 0; i < event.touches.length; i += 1) {
      const t = event.touches[i];
      __cdCollectionTapGuardState.starts.set(t.identifier, {
        x: t.clientX,
        y: t.clientY,
        startedAt: Date.now(),
        moved: false,
        hadMoveEvent: false,
        maxDx: 0,
        maxDy: 0
      });
    }
  };

  const handleTouchMove = (event) => {
    if (!event.changedTouches || !event.changedTouches.length) return;
    let movedAny = false;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      const t = event.changedTouches[i];
      const start = __cdCollectionTapGuardState.starts.get(t.identifier);
      if (!start) continue;
      const dx = Math.abs(t.clientX - start.x);
      const dy = Math.abs(t.clientY - start.y);
      if (dx > start.maxDx) start.maxDx = dx;
      if (dy > start.maxDy) start.maxDy = dy;
      if (dx > __CD_COLLECTION_TAP_GUARD.moveDetectPx || dy > __CD_COLLECTION_TAP_GUARD.moveDetectPx) {
        start.hadMoveEvent = true;
      }
      if (start.moved) continue;
      if (dx > __CD_COLLECTION_TAP_GUARD.moveThresholdPx || dy > __CD_COLLECTION_TAP_GUARD.moveThresholdPx) {
        start.moved = true;
        movedAny = true;
        continue;
      }
      if (dy >= __CD_COLLECTION_TAP_GUARD.verticalBlockPx && dy >= dx) {
        start.moved = true;
        movedAny = true;
      }
    }
    if (movedAny) {
      __cdSetCollectionTapSuppressed(__CD_COLLECTION_TAP_GUARD.dragSuppressMs);
    }
  };

  const handleTouchEndLike = (event) => {
    if (!event.changedTouches || !event.changedTouches.length) return;
    let movedAny = false;
    const now = Date.now();
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      const t = event.changedTouches[i];
      const start = __cdCollectionTapGuardState.starts.get(t.identifier);
      if (start) {
        const duration = start.startedAt ? (now - start.startedAt) : 0;
        const verticalDominant = start.maxDy >= __CD_COLLECTION_TAP_GUARD.verticalBlockPx && start.maxDy >= start.maxDx;
        if (
          start.moved
          || start.hadMoveEvent
          || verticalDominant
          || duration > __CD_COLLECTION_TAP_GUARD.maxTapDurationMs
          || (now - __cdCollectionTapGuardState.lastScrollAt) < __CD_COLLECTION_TAP_GUARD.recentScrollBlockMs
        ) {
          movedAny = true;
        }
      }
      __cdCollectionTapGuardState.starts.delete(t.identifier);
    }
    if (movedAny) {
      __cdSetCollectionTapSuppressed(__CD_COLLECTION_TAP_GUARD.ghostClickLockMs);
    }
  };

  const markScroll = () => {
    __cdCollectionTapGuardState.lastScrollAt = Date.now();
    __cdSetCollectionTapSuppressed(__CD_COLLECTION_TAP_GUARD.recentScrollBlockMs);
  };

  root.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
  root.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
  root.addEventListener('touchend', handleTouchEndLike, { capture: true, passive: true });
  root.addEventListener('touchcancel', handleTouchEndLike, { capture: true, passive: true });
  root.addEventListener('scroll', markScroll, { capture: true, passive: true });

  if (typeof window !== 'undefined' && !window.__cdCollectionTapScrollGuardBound) {
    window.__cdCollectionTapScrollGuardBound = true;
    window.addEventListener('scroll', markScroll, { capture: true, passive: true });
  }

  if (typeof window !== 'undefined' && !window.__cdCollectionTapClickGuardBound) {
    window.__cdCollectionTapClickGuardBound = true;
    window.addEventListener('click', (event) => {
      const target = __resolveEventElement(event);
      if (!target || !__cdShouldSuppressCollectionTapEvent(event, target)) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    }, { capture: true, passive: false });
  }

  if (typeof window !== 'undefined') {
    window.__cdShouldSuppressCollectionClick = function __cdShouldSuppressCollectionClick(event, target) {
      return __cdShouldSuppressCollectionTapEvent(event, target || __resolveEventElement(event));
    };
  }
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

  if ((typeof window !== 'undefined') && !window.__cdMobileNav) {
    __ensureMobileBackstackLoaded();
  }

  try {
    if (typeof window !== 'undefined' && window.__cdMobileNav && typeof window.__cdMobileNav.onActionInvoke === 'function') {
      window.__cdMobileNav.onActionInvoke(action, actionEl || null);
    }
  } catch (_) {}

  const run = () => {
    const out = __callActionWithConfig(action, actionEl, event, args);

    const hadFunction = typeof window !== 'undefined' && typeof window[action] === 'function';

    const loader = __lazyActionLoaders[action];

    // Legacy runtime is now delayed; if an action is missing, load once and retry.
    if (!loader && !hadFunction && out === undefined) {
      const fallbackKey = '__index_inline_runtime__';
      if (!__lazyActionState[fallbackKey]) {
        __lazyActionState[fallbackKey] = __ensureIndexInlineRuntimeLoaded().catch((err) => {
          console.error('[uiBindings] index-inline-runtime lazy load failed:', err);
        });
      }

      __lazyActionState[fallbackKey].then(() => {
        if (typeof window[action] === 'function') {
          __callActionWithConfig(action, actionEl, event, args);
        }
      });
      return;
    }

    if (!loader) return;

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
          if (attempt >= maxAttempts) {
            if (action === 'openOlympusOracleModal') {
              if (typeof window.openFortuneFromProfile === 'function') {
                window.openFortuneFromProfile('olympus');
              } else if (typeof window._dpOpenFortuneType === 'function') {
                window._dpOpenFortuneType('olympus');
              }
            }
            return;
          }
          attempt += 1;
          setTimeout(tryInvokeOnceWhenReady, retryMs);
          return;
        }

        // Many UI open handlers intentionally return `undefined` after DOM side-effects.
        // Do not retry based on return value; just call once when the function appears.
        try {
          __callActionWithConfig(action, actionEl, event, args);
        } catch (err) {
          if (action === 'openOlympusOracleModal') {
            if (typeof window.openFortuneFromProfile === 'function') {
              window.openFortuneFromProfile('olympus');
            } else if (typeof window._dpOpenFortuneType === 'function') {
              window._dpOpenFortuneType('olympus');
            }
          } else {
            throw err;
          }
        }
      };

      tryInvokeOnceWhenReady();
    });
  };

  if (__CD_DEFER_INP_ACTIONS.has(action)) {
    setTimeout(run, 0);
    return;
  }
  run();
}

function bindEventAction(root, eventName, attrName) {
  root.addEventListener(eventName, (event) => {
    const target = __resolveEventElement(event);
    if (!target) return;
    const actionEl = target.closest(`[${attrName}]`);
    if (!actionEl) return;

    if ((eventName === 'touchend' || eventName === 'mouseup') && __cdShouldSuppressCollectionTapEvent(event, actionEl)) {
      if (event.cancelable) event.preventDefault();
      return;
    }

    const action = actionEl.getAttribute(attrName);
    if (!action) return;

    __invokeAction(action, actionEl, event);
  });
}

function __scheduleCollectionHydration(collection) {
  const start = () => __hydrateCollectionImagesChunked(collection);
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 350 });
    return;
  }
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(start);
    return;
  }
  setTimeout(start, 0);
}

function __runChunked(listLike, fn, opts = {}) {
  const items = Array.from(listLike || []);
  if (!items.length) return Promise.resolve();

  const minBatch = Math.max(1, Number(opts.minBatch) || 4);
  const maxBatch = Math.max(minBatch, Number(opts.maxBatch) || 16);
  const budgetMs = Math.max(2, Number(opts.budgetMs) || 6);
  let index = 0;

  return new Promise((resolve) => {
    const step = () => {
      const startedAt = performance.now();
      let processed = 0;

      while (index < items.length && processed < maxBatch) {
        fn(items[index], index);
        index += 1;
        processed += 1;
        if (processed >= minBatch && (performance.now() - startedAt) >= budgetMs) {
          break;
        }
      }

      if (index < items.length) {
        setTimeout(step, 0);
      } else {
        resolve();
      }
    };

    step();
  });
}

function __hydrateCollectionImagesChunked(collection) {
  if (!collection) return;
  const wraps = collection.querySelectorAll('.tarot-tile__img-wrap[data-img-src]');
  const ioEnabled = typeof IntersectionObserver !== 'undefined';

  const hydrateWrap = (wrap) => {
    if (!wrap || wrap.querySelector('img.tarot-tile__img')) return;
    const src = wrap.getAttribute('data-img-src');
    if (!src) return;
    const alt = wrap.getAttribute('data-img-alt') || '';
    const placeholder = wrap.querySelector('.tarot-tile__img-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    const skeleton = document.createElement('div');
    skeleton.className = 'tarot-tile__img-skeleton';
    wrap.insertBefore(skeleton, wrap.firstChild);

    const img = document.createElement('img');
    img.className = 'tarot-tile__img';
    img.loading = 'lazy';
    img.fetchPriority = 'low';
    img.decoding = 'async';
    img.width = 200;
    img.height = 150;
    img.alt = alt;
    img.onload = () => { skeleton.remove(); };
    img.onerror = () => { skeleton.remove(); };
    img.src = src;
    wrap.insertBefore(img, wrap.firstChild);
  };

  if (!ioEnabled) {
    __runChunked(wraps, (wrap) => {
      hydrateWrap(wrap);
    }, { minBatch: 2, maxBatch: 8, budgetMs: 7 });
    return;
  }

  let observer = collection.__cdCollectionImageObserver;
  if (!observer) {
    observer = new IntersectionObserver((entries, obs) => {
      for (let i = 0; i < entries.length; i += 1) {
        if (!entries[i].isIntersecting) continue;
        const wrap = entries[i].target;
        obs.unobserve(wrap);
        if (wrap && wrap.dataset) {
          delete wrap.dataset.cdImgObserved;
        }
        hydrateWrap(wrap);
      }
    }, {
      // Use viewport root for stable behavior on mobile where container-root IO can miss callbacks.
      root: null,
      rootMargin: '120px 0px',
      threshold: 0.01
    });
    collection.__cdCollectionImageObserver = observer;
  }

  __runChunked(wraps, (wrap) => {
    if (!wrap || wrap.querySelector('img.tarot-tile__img')) return;
    if (wrap.dataset && wrap.dataset.cdImgObserved === '1') return;
    if (wrap.dataset) wrap.dataset.cdImgObserved = '1';
    observer.observe(wrap);
  }, { minBatch: 2, maxBatch: 10, budgetMs: 7 });

  if (collection.__cdCollectionImageFallbackTimer) {
    clearTimeout(collection.__cdCollectionImageFallbackTimer);
  }
  collection.__cdCollectionImageFallbackTimer = setTimeout(() => {
    collection.__cdCollectionImageFallbackTimer = null;
    if (collection.getAttribute('data-collection-open') !== 'true') return;
    __runChunked(wraps, (wrap) => {
      if (!wrap || wrap.querySelector('img.tarot-tile__img')) return;
      if (wrap.dataset) delete wrap.dataset.cdImgObserved;
      hydrateWrap(wrap);
    }, { minBatch: 2, maxBatch: 8, budgetMs: 7 });
  }, 420);
}

function __releaseCollectionImagesChunked(collection) {
  if (!collection) return;
  if (collection.__cdCollectionImageFallbackTimer) {
    clearTimeout(collection.__cdCollectionImageFallbackTimer);
    collection.__cdCollectionImageFallbackTimer = null;
  }
  const observer = collection.__cdCollectionImageObserver;
  if (observer && typeof observer.disconnect === 'function') {
    observer.disconnect();
  }
  collection.__cdCollectionImageObserver = null;

  const observedWraps = collection.querySelectorAll('.tarot-tile__img-wrap[data-img-src][data-cd-img-observed]');
  __runChunked(observedWraps, (wrap) => {
    if (!wrap || !wrap.dataset) return;
    delete wrap.dataset.cdImgObserved;
  }, { minBatch: 12, maxBatch: 30, budgetMs: 5 });

  const imgs = collection.querySelectorAll('.tarot-tile__img-wrap img.tarot-tile__img');
  const skeletons = collection.querySelectorAll('.tarot-tile__img-wrap .tarot-tile__img-skeleton');
  const placeholders = collection.querySelectorAll('.tarot-tile__img-wrap .tarot-tile__img-placeholder');

  __runChunked(imgs, (img) => {
    img.remove();
  }, { minBatch: 8, maxBatch: 24, budgetMs: 6 }).then(() => {
    return __runChunked(skeletons, (sk) => {
      sk.remove();
    }, { minBatch: 8, maxBatch: 24, budgetMs: 6 });
  }).then(() => {
    return __runChunked(placeholders, (placeholder) => {
      placeholder.style.display = '';
    }, { minBatch: 8, maxBatch: 30, budgetMs: 6 });
  });
}

export function bindGlobalActions(root) {
  if (!root || typeof root.addEventListener !== 'function') return;
  __cdBindCollectionTapGuard(root);

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

    if (__cdShouldSuppressCollectionTapEvent(event, actionEl)) {
      if (event.cancelable) event.preventDefault();
      return;
    }

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

    if (action === 'toggleCollection') {
      const targetId = actionEl.getAttribute('data-target');
      const collection = document.getElementById(targetId);
      if (!collection) return;

      const isOpen = collection.getAttribute('data-collection-open') === 'true';
      const newState = !isOpen;

      collection.setAttribute('data-collection-open', String(newState));
      actionEl.setAttribute('aria-expanded', String(newState));
      if (typeof window !== 'undefined' && typeof window.cdApplyCollectionToggleHintTexts === 'function') {
        window.cdApplyCollectionToggleHintTexts(typeof window.cdGetCurrentLang === 'function' ? window.cdGetCurrentLang() : null);
      }
      actionEl.setAttribute('aria-label',
        actionEl.getAttribute('aria-label')
          ? actionEl.getAttribute('aria-label').replace(/열기|닫기/, newState ? '닫기' : '열기')
          : '');

      document.dispatchEvent(new CustomEvent('cd:collection-toggle', {
        detail: { targetId, isOpen: newState }
      }));

      if (newState) {
        __scheduleCollectionHydration(collection);
      } else {
        __releaseCollectionImagesChunked(collection);
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
