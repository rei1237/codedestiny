// ⚠ 이 쿼리는 sync:public 의 캐시버스터 갱신 대상이 아니라 손으로 올려야 한다.
// 올리지 않으면 core/init.js 를 고쳐도 이 URL 이 캐시 키라서 사용자에게 영영 안 닿는다
// (실측: 배포 후에도 옛 init.js 가 서빙돼 contain-intrinsic-size 수정이 반영되지 않았다).
import { initAppShell } from './core/init.js?v=build-1e1fc2064be1';

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
let __fortuneServiceBootPromise = null;

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
    __destinyFlowerBootPromise = import('./core/bootstrapDestinyFlower.js?v=build-1e1fc2064be1')
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

function ensureFortuneServiceBootstrapped() {
  if (!__fortuneServiceBootPromise) {
    __fortuneServiceBootPromise = import('./services/fortuneService.js').catch(function (err) {
      __fortuneServiceBootPromise = null;
      console.error('[app] fortune service bootstrap failed', err);
    });
  }
  return __fortuneServiceBootPromise;
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

function warmupFortuneServiceOnFirstInteraction() {
  let warmed = false;
  const warmup = function () {
    if (warmed) return;
    warmed = true;
    window.removeEventListener('pointerdown', warmup, true);
    window.removeEventListener('keydown', warmup, true);
    window.removeEventListener('touchstart', warmup, true);
    ensureFortuneServiceBootstrapped();
  };

  window.addEventListener('pointerdown', warmup, { capture: true, passive: true, once: true });
  window.addEventListener('keydown', warmup, { capture: true, once: true });
  window.addEventListener('touchstart', warmup, { capture: true, passive: true, once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  initAppShell();
  installDestinyFlowerStubs();
  warmupDestinyFlowerOnFirstInteraction();
  warmupFortuneServiceOnFirstInteraction();

  // Avoid blocking first paint with non-critical engine bootstrap.
  scheduleIdleTask(function () {
    ensureDestinyFlowerBootstrapped();
  }, 2200);

  scheduleIdleTask(function () {
    ensureFortuneServiceBootstrapped();
  }, 2800);
});
