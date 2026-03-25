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

document.addEventListener('DOMContentLoaded', () => {
  initAppShell();
  bootstrapDestinyFlower(window);
  scheduleFortuneServiceLoad();
});
