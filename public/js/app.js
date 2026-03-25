import { initAppShell } from './core/init.js';
import { bootstrapDestinyFlower } from './core/bootstrapDestinyFlower.js';

function loadFortuneServiceFacade() {
  return import('./services/fortuneService.js').catch(function (err) {
    console.warn('[perf] fortuneService facade lazy-load failed', err);
  });
}

function scheduleFortuneServiceLoad() {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(function () {
      loadFortuneServiceFacade();
    }, { timeout: 2200 });
    return;
  }
  setTimeout(loadFortuneServiceFacade, 900);
}

function bootstrapOnce() {
  if (typeof window !== 'undefined') {
    window.__FORTUNE_APP_BOOTSTRAPPED__ = window.__FORTUNE_APP_BOOTSTRAPPED__ || false;
    if (window.__FORTUNE_APP_BOOTSTRAPPED__) return;
    window.__FORTUNE_APP_BOOTSTRAPPED__ = true;
  }

  initAppShell();
  bootstrapDestinyFlower(window);
  scheduleFortuneServiceLoad();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapOnce, { once: true });
} else {
  bootstrapOnce();
}
