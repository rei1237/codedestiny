import { initAppShell } from './core/init.js';
import './services/fortuneService.js';

const DESTINY_FLOWER_ACTIONS = [
  'openDestinyFlowerStudio',
  'openDestinyFlower',
  'openAstrologyFlower',
  'openJamidusuFlower',
  'openSukuyoFlower',
  'openAstrologyFlowerStudio',
  'openJamidusuFlowerStudio',
  'openSukuyoFlowerStudio'
];

let __destinyFlowerBootPromise = null;

function scheduleIdleTask(task, timeout) {
  const idle = window.requestIdleCallback || function (cb) {
    return setTimeout(function () {
      cb({ didTimeout: false, timeRemaining: function () { return 0; } });
    }, 1);
  };
  return idle(task, { timeout: timeout || 1600 });
}

function ensureDestinyFlowerBootstrapped() {
  if (window.__cdDestinyFlowerBootstrapped) {
    return Promise.resolve();
  }
  if (!__destinyFlowerBootPromise) {
    __destinyFlowerBootPromise = import('./core/bootstrapDestinyFlower.js')
      .then(function (mod) {
        if (!mod || typeof mod.bootstrapDestinyFlower !== 'function') return;
        mod.bootstrapDestinyFlower(window);
        window.__cdDestinyFlowerBootstrapped = true;
      })
      .catch(function (err) {
        __destinyFlowerBootPromise = null;
        console.error('[app] destiny flower bootstrap failed', err);
      });
  }
  return __destinyFlowerBootPromise;
}

function installDestinyFlowerStubs() {
  DESTINY_FLOWER_ACTIONS.forEach(function (actionName) {
    if (typeof window[actionName] === 'function') return;

    const deferredEntry = function () {
      const args = arguments;
      return ensureDestinyFlowerBootstrapped().then(function () {
        const fn = window[actionName];
        if (typeof fn === 'function' && fn !== deferredEntry) {
          return fn.apply(window, args);
        }
        return undefined;
      });
    };

    window[actionName] = deferredEntry;
  });
}

function warmupDestinyFlowerOnFirstInteraction() {
  let warmed = false;
  const warmup = function () {
    if (warmed) return;
    warmed = true;
    window.removeEventListener('pointerdown', warmup, true);
    window.removeEventListener('keydown', warmup, true);
    window.removeEventListener('touchstart', warmup, true);
    ensureDestinyFlowerBootstrapped();
  };

  window.addEventListener('pointerdown', warmup, { capture: true, passive: true, once: true });
  window.addEventListener('keydown', warmup, { capture: true, once: true });
  window.addEventListener('touchstart', warmup, { capture: true, passive: true, once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  initAppShell();
  installDestinyFlowerStubs();
  warmupDestinyFlowerOnFirstInteraction();

  // Avoid blocking first paint with non-critical engine bootstrap.
  scheduleIdleTask(function () {
    ensureDestinyFlowerBootstrapped();
  }, 2200);
});
