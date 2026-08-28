function callGlobal(fnName, ...args) {
  const fn = window[fnName];
  if (typeof fn === 'function') {
    return fn(...args);
  }
  return undefined;
}

if (typeof window !== 'undefined' && typeof window.openSajuAnimalPage !== 'function') {
  window.openSajuAnimalPage = function openSajuAnimalPage() {
    window.location.assign('/saju-guardian');
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

if (typeof window !== 'undefined' && typeof window.goLoveSecretAi !== 'function') {
  window.goLoveSecretAi = function goLoveSecretAi() {
    window.location.assign('/love-secret-ai');
  };
}

function __ensureSukuyoAIConsultationReady() {
  return new Promise((resolve) => {
    let attempts = 0;
    const tick = () => {
      if (
        window.__sukyoAiConsultationPatchActive === true &&
        (typeof window.gotoSukuyoPremium === 'function' || typeof window.openSukuyoBookModal === 'function')
      ) {
        resolve(true);
        return;
      }
      attempts += 1;
      if (attempts >= 40) {
        resolve(false);
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

const __lazyActionLoaders = {
  checkPrivacyAndCalculate: () => __ensureSajuCoreScripts(),
  agreeAndCalculate: () => __ensureSajuCoreScripts(),
  calculate: () => __ensureSajuCoreScripts(),
  runCompat: () => __ensureSajuCoreScripts(),
  openPhysiognomyApp: () => __loadScriptOnce('AnalysisEngine.js?v=h96b7981840e2').then(() => __loadScriptOnce('PhysiognomyUI.js?v=hfe1d5855449d')),
  openPastLifeFaceApp: () => __loadScriptOnce('AnalysisEngine.js?v=h96b7981840e2').then(() => __loadScriptOnce('PastLifeFaceUI.js?v=hc1c3840957e8')),
  openHwatuModal: () => __loadScriptOnce('HwatuFortune.js?v=h9ee7eacf3957'),
  openMbtiModal: () => __loadScriptOnce('js/astral-soul.js'),
  openKemetModal: () => __loadScriptOnce('/js/oracle-kcg.js?v=build-5a0f4838ab33'),
  openDreamModal: () => __loadScriptOnce('/js/dream-ledger.js?v=build-5a0f4838ab33'),
  openPsychoDreamModal: () => __loadScriptOnce('/js/psycho-dream-analyzer-freuds-study.js?v=build-5a0f4838ab33'),
  openAnimalTotemModal: () =>
    __loadScriptOnce('/js/services/animal-totem-content-engine.js').then(() =>
      __loadScriptOnce('/js/animal-totem-experience.js?v=build-5a0f4838ab33')
    ),
  openSajuAnimalPage: () => Promise.resolve(window.location.assign('/saju-guardian')),
  openDestinyEggPage: () => Promise.resolve(window.location.assign('/tadagochi')),
  openFortuneTellerFishPage: () => Promise.resolve(window.location.assign('/fortune-teller-fish.html')),
  openTarotLoveModal: () => __loadScriptOnce('/js/tarot-love-experience.js?v=build-5a0f4838ab33'),
  openTarotReunionModal: () => __loadScriptOnce('/js/tarot-reunion-experience.js?v=build-5a0f4838ab33'),
  openTarotHealingPage: () => Promise.resolve(window.location.assign('/tarot/healing')),
  openTarotHealingModal: () => Promise.resolve(window.location.assign('/tarot/healing')),
  openTarotSelfEsteemModal: () => __loadScriptOnce('/js/tarot-self-esteem-experience.js?v=build-5a0f4838ab33'),
  openTarotYearFortuneModal: () => __loadScriptOnce('/js/tarot-year-fortune-experience.js?v=build-5a0f4838ab33'),
  openLifeBookModal: () => Promise.resolve(window.location.assign('/life-book-ai')),
  closeLifeBookModal: () => Promise.resolve(),
  generateLifeBook: () => Promise.resolve(window.location.assign('/life-book-ai')),
  openAstroBookModal: () => Promise.resolve(window.location.assign('/astrology-ai')),
  closeAstroBookModal: () => Promise.resolve(true),
  generateAstroBook: () => Promise.resolve(window.location.assign('/astrology-ai')),
  downloadAstroBookPdf: () => Promise.resolve(window.location.assign('/astrology-ai')),
  gotoAstrologyPremium: () => Promise.resolve(window.location.assign('/astrology-ai')),
  gotoZiweiPremium: () => __gotoZiweiAi(),
  openSajuNewYearModal: () => { window.location.assign('/new-year-ai-consultation'); return Promise.resolve(true); },
  closeSajuNewYearModal: () => Promise.resolve(true),
  generateSajuNewYear: () => { window.location.assign('/new-year-ai-consultation'); return Promise.resolve(true); },
  downloadSajuNewYearPdf: () => { window.location.assign('/new-year-ai-consultation'); return Promise.resolve(true); },
  openVedicBookModal: () => { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  closeVedicBookModal: () => { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  generateVedicBook: () => { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  downloadVedicBookPdf: () => { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  gotoVedicPremium: () => { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  openSukuyoBookModal: () => __ensureSukuyoAIConsultationReady(),
  closeSukuyoBookModal: () => __ensureSukuyoAIConsultationReady(),
  generateSukuyoBook: () => __ensureSukuyoAIConsultationReady(),
  downloadSukuyoBookPdf: () => __ensureSukuyoAIConsultationReady(),
  gotoSukuyoPremium: () => __ensureSukuyoAIConsultationReady(),
  goLoveSecretAi: () => Promise.resolve(window.location.assign('/love-secret-ai')),
  openLoveSecretModal: () => Promise.resolve(window.location.assign('/love-secret-ai')),
  closeLoveSecretModal: () => Promise.resolve(),
  generateLoveSecret: () => Promise.resolve(window.location.assign('/love-secret-ai')),
  openOlympusOracleModal: () => __loadScriptOnce('/js/olympus-oracle.js'),
  openRuneOracle: () => Promise.resolve(window.location.assign('/oracle/rune/')),
  openSibylModal: () => __loadScriptOnce('/js/sibyl-system.js?v=build-5a0f4838ab33').then(() => {
    if (typeof window.openSibylModal === 'function') window.openSibylModal();
  }),
  
};

function __ensureSajuCoreScripts() {
  return __loadScriptOnce('/js/destiny-profile.js?v=build-5a0f4838ab33')
    .then(() => __loadScriptOnce('/js/services/sajuService.js'))
    .then(() => __loadScriptOnce('/js/core/saju/modalProfileState.js'))
    .then(() => __loadScriptOnce('/js/admin-flower.js'));
}

const __lazyActionState = {};

function __gotoZiweiAi() {
  window.location.assign('/ziwei-ai');
  return Promise.resolve(true);
}

window.gotoZiweiPremium = function gotoZiweiPremium() {
  return __gotoZiweiAi();
};

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
      existingBySrc.addEventListener('error', () => {
        existingBySrc.dataset.loading = '0';
        existingBySrc.dataset.loaded = '0';
        if (existingBySrc.dataset.dynSrc) existingBySrc.remove();
        reject(new Error('load failed: ' + src));
      }, { once: true });
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
    s.onerror = () => {
      s.dataset.loading = '0';
      s.dataset.loaded = '0';
      s.remove();
      reject(new Error('load failed: ' + src));
    };
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

function __scheduleAfterActionScroll(actionEl) {
  if (!actionEl || !actionEl.getAttribute) return;
  const targetId = actionEl.getAttribute('data-after-action-scroll-target');
  if (!targetId) return;
  window.setTimeout(() => {
    const focusTarget = document.getElementById(targetId);
    if (!focusTarget || typeof focusTarget.scrollIntoView !== 'function') return;
    focusTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const firstInput = focusTarget.querySelector('input, select, textarea, button');
    if (firstInput && typeof firstInput.focus === 'function') {
      try { firstInput.focus({ preventScroll: true }); } catch (_) { firstInput.focus(); }
    }
  }, 220);
}

function __invokeAction(action, actionEl, event) {
  const args = parseArgs(actionEl.getAttribute('data-action-args'));

  const run = () => {
    const out = __callActionWithConfig(action, actionEl, event, args);
    __scheduleAfterActionScroll(actionEl);

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
        __lazyActionState[action] = null;
        console.error('[uiBindings] lazy action load failed:', action, err);
        throw err;
      });
    }

    __lazyActionState[action].then(() => {
      let attempt = 0;
      const maxAttempts = 12;
      const retryMs = 50;

      const tryInvokeOnceWhenReady = () => {
        if (typeof window[action] !== 'function') {
          if (attempt >= maxAttempts) {
            if (action === 'openOlympusOracleModal' && typeof window._dpOpenFortuneType === 'function') {
              window._dpOpenFortuneType('olympus');
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
          if (action === 'openOlympusOracleModal' && typeof window._dpOpenFortuneType === 'function') {
            window._dpOpenFortuneType('olympus');
          } else {
            throw err;
          }
        }
      };

      tryInvokeOnceWhenReady();
    }).catch(() => {});
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

    const action = actionEl.getAttribute(attrName);
    if (!action) return;

    __invokeAction(action, actionEl, event);
  });
}

const __COLLECTION_R2_ASSET_BASE = 'https://assets.code-destiny.com/';
const __COLLECTION_LOCAL_ASSET_KEYS = new Set([
  'saju-guardian-animal-v20260615.webp',
  // R2 에 올라가 있지 않아 리사이즈·원본이 모두 404 다. 로컬 경로로 바로 간다.
  'comprehensive-fortune-prompt.webp'
]);

function __splitCollectionImagePath(src) {
  const raw = String(src || '').trim();
  const queryIndex = raw.indexOf('?');
  const hashIndex = raw.indexOf('#');
  let suffixIndex = -1;
  if (queryIndex >= 0 && hashIndex >= 0) suffixIndex = Math.min(queryIndex, hashIndex);
  else suffixIndex = Math.max(queryIndex, hashIndex);
  if (suffixIndex < 0) return { path: raw, suffix: '' };
  return { path: raw.slice(0, suffixIndex), suffix: raw.slice(suffixIndex) };
}

function __encodeCollectionAssetKey(objectKey) {
  return String(objectKey || '').replace(/^\/+/, '').split('/').map((part) => {
    try {
      return encodeURIComponent(decodeURIComponent(part));
    } catch {
      return encodeURIComponent(part);
    }
  }).join('/');
}

function __buildR2CollectionAssetUrl(objectKey, suffix = '') {
  let decodedKey = String(objectKey || '').replace(/^\/+/, '');
  try {
    decodedKey = decodeURIComponent(decodedKey);
  } catch {}
  if (__COLLECTION_LOCAL_ASSET_KEYS.has(decodedKey)) return '';
  const encodedKey = __encodeCollectionAssetKey(objectKey);
  if (!encodedKey) return '';
  return `${__COLLECTION_R2_ASSET_BASE}${encodedKey}${suffix}`;
}

// R2 원본(가로 1300~1500px, 장당 150~200KB)을 카드 크기에 맞춰 Cloudflare Image Resizing 으로
// 줄여 받는다(장당 20~40KB). 폭은 80px 버킷으로 반올림해 CDN 캐시가 잘게 쪼개지지 않게 한다.
// 실패하면 __bindCollectionImageFallback 이 원본 R2 주소로 되돌린다.
function __buildResizedCollectionImageUrl(r2Url, wrap) {
  const raw = String(r2Url || '');
  if (!raw.startsWith(__COLLECTION_R2_ASSET_BASE)) return '';
  if (raw.includes('/cdn-cgi/')) return '';
  let dpr = 1;
  let cssWidth = 0;
  let maxCss = 400;
  try {
    dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    cssWidth = (wrap && wrap.clientWidth) || 0;
    // 하이드레이션이 2열 레이아웃 확정 전에 돌면 clientWidth 가 1열 기준으로 잡힌다 — 뷰포트로 상한
    const isNarrow = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    maxCss = isNarrow ? Math.ceil(window.innerWidth / 2) : window.innerWidth;
  } catch {}
  if (!cssWidth) cssWidth = maxCss;
  cssWidth = Math.min(cssWidth, maxCss);
  let target = Math.ceil((cssWidth * dpr) / 80) * 80;
  if (target < 240) target = 240;
  if (target > 960) target = 960;
  return `${__COLLECTION_R2_ASSET_BASE}cdn-cgi/image/width=${target},quality=72,format=auto/${raw.slice(__COLLECTION_R2_ASSET_BASE.length)}`;
}

function __resolveCollectionImageSrc(src) {
  const raw = String(src || '').trim();
  if (!raw) return raw;
  if (raw.startsWith(__COLLECTION_R2_ASSET_BASE)) return raw;
  const { path, suffix } = __splitCollectionImagePath(raw);
  if (path.startsWith('/fuctionassets/')) return __buildR2CollectionAssetUrl(path.slice('/fuctionassets/'.length), suffix) || raw;
  if (path.startsWith('fuctionassets/')) return __buildR2CollectionAssetUrl(path.slice('fuctionassets/'.length), suffix) || raw;
  if (path.startsWith('/images/')) return __buildR2CollectionAssetUrl(path.slice('/images/'.length), suffix) || raw;
  if (path.startsWith('images/')) return __buildR2CollectionAssetUrl(path.slice('images/'.length), suffix) || raw;
  try {
    const url = new URL(raw, window.location.href);
    if (url.origin === 'https://code-destiny.com' || url.origin === window.location.origin) {
      if (url.pathname.startsWith('/fuctionassets/')) return __buildR2CollectionAssetUrl(url.pathname.slice('/fuctionassets/'.length), `${url.search}${url.hash}`) || raw;
      if (url.pathname.startsWith('/images/')) return __buildR2CollectionAssetUrl(url.pathname.slice('/images/'.length), `${url.search}${url.hash}`) || raw;
    }
  } catch {}
  return raw;
}

/* 폴백은 하나가 아니라 순서 있는 목록이다.
   예전에는 "리사이즈 → R2 원본" 한 단계뿐이라, R2 에 올라가지 않은 자산은
   두 주소가 모두 404 가 되면서 마크업에 원래 박혀 있던(그리고 실제로는 200 인)
   /fuctionassets/… 경로로 되돌아갈 길이 없어 이미지가 통째로 사라졌다. */
function __bindCollectionImageFallback(img, fallbackSrc, placeholder, skeleton) {
  if (!img) return;
  const chain = (Array.isArray(fallbackSrc) ? fallbackSrc : [fallbackSrc])
    .map((src) => String(src || '').trim())
    .filter(Boolean)
    .filter((src, index, list) => list.indexOf(src) === index && src !== img.getAttribute('src'));
  img.__cdImgFallbackChain = chain;
  // 이 속성을 읽는 다른 코드가 있어 첫 후보는 그대로 노출한다.
  if (chain.length) img.setAttribute('data-cd-img-fallback-src', chain[0]);
  else img.removeAttribute('data-cd-img-fallback-src');
  if (skeleton) {
    img.addEventListener('load', () => { skeleton.remove(); }, { once: true });
  }
  if (img.dataset && img.dataset.cdCollectionFallbackBound === '1') return;
  if (img.dataset) img.dataset.cdCollectionFallbackBound = '1';
  img.addEventListener('error', () => {
    const next = (img.__cdImgFallbackChain || []).shift();
    if (next) {
      const rest = img.__cdImgFallbackChain || [];
      if (rest.length) img.setAttribute('data-cd-img-fallback-src', rest[0]);
      else img.removeAttribute('data-cd-img-fallback-src');
      img.src = next;
      return;
    }
    if (skeleton) skeleton.remove();
    img.remove();
    if (placeholder) placeholder.style.display = '';
  });
}

function __scheduleCollectionTask(run) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 350 });
    return;
  }
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(run);
    return;
  }
  setTimeout(run, 0);
}

function __scheduleCollectionHydration(collection, forceHydrateAll = false) {
  __scheduleCollectionTask(() => __hydrateCollectionImagesChunked(collection, forceHydrateAll));
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

function __hydrateCollectionImagesChunked(collection, forceHydrateAll = false) {
  if (!collection) return;
  // 모바일에서도 데스크톱과 동일하게 전 컬렉션의 이미지를 하이드레이션한다.
  // (목록형 7개 컬렉션을 걸러내던 분기 제거 — index-inline-runtime.js 의 같은 함수와 짝을 맞춘다)
  const wraps = collection.querySelectorAll('.tarot-tile__img-wrap[data-img-src]');
  const ioEnabled = typeof IntersectionObserver !== 'undefined';

  const hydrateWrap = (wrap) => {
    if (!wrap) return;
    const src = wrap.getAttribute('data-img-src');
    if (!src) return;
    const resolvedSrc = __resolveCollectionImageSrc(src);
    const fallbackSrc = resolvedSrc === src ? '' : src;
    const alt = wrap.getAttribute('data-img-alt') || '';
    const placeholder = wrap.querySelector('.tarot-tile__img-placeholder');

    const existingImg = wrap.querySelector('img.tarot-tile__img');
    if (existingImg) {
      const existingSrc = existingImg.getAttribute('src') || src;
      const resolvedExistingSrc = __resolveCollectionImageSrc(existingSrc);
      // 마크업에 박힌 정적 <img> 도 같은 리사이즈 경로를 태운다(원본 80~200KB 를 그대로 받고 있었다)
      const resizedExisting = __buildResizedCollectionImageUrl(resolvedExistingSrc, wrap);
      // 리사이즈 → R2 원본 → 마크업에 박혀 있던 원래 경로 순으로 물러난다.
      // 마지막 후보가 있어야 R2 에 아직 안 올라간 자산도 화면에서 사라지지 않는다.
      const existingFallback = [resizedExisting ? resolvedExistingSrc : '', existingSrc];
      const nextSrc = resizedExisting || resolvedExistingSrc;
      if (nextSrc && nextSrc !== existingSrc) {
        // 체인은 "바인딩 시점의 src" 와 같은 후보를 걸러낸다. 먼저 바인딩하면 마크업의 원래
        // 경로(/fuctionassets/…)가 아직 현재 src 라 체인에서 빠지고, R2 에 없는 자산은
        // 리사이즈·R2 원본이 모두 404 라 물러날 곳이 없어 img 가 통째로 제거된다.
        existingImg.loading = 'eager';
        existingImg.src = nextSrc;
        __bindCollectionImageFallback(existingImg, existingFallback, placeholder, null);
      } else if (nextSrc && !(existingImg.complete && existingImg.naturalWidth > 0)) {
        // 닫힌 컬렉션 안에서 파싱된 loading="lazy" 이미지는 열려도 요청이 다시 걸리지 않는다 — 노드를 새로 붙여 깨운다
        const revived = existingImg.cloneNode(false);
        revived.loading = 'eager';
        if (revived.dataset) delete revived.dataset.cdCollectionFallbackBound;
        __bindCollectionImageFallback(revived, existingFallback, placeholder, null);
        existingImg.parentNode.replaceChild(revived, existingImg);
      }
      return;
    }

    if (placeholder) placeholder.style.display = 'none';

    const skeleton = document.createElement('div');
    skeleton.className = 'tarot-tile__img-skeleton';
    wrap.insertBefore(skeleton, wrap.firstChild);

    const isPriorityImage = Boolean(wrap.closest && wrap.closest('.cd-prompt-feature-spotlight'));
    const img = document.createElement('img');
    img.className = 'tarot-tile__img';
    // IntersectionObserver 가 이미 지연로딩을 끝낸 뒤라 loading="lazy" 를 또 걸면 요청이 영영 안 나간다
    img.loading = 'eager';
    img.fetchPriority = isPriorityImage ? 'high' : 'low';
    img.decoding = 'async';
    img.width = 200;
    img.height = 150;
    img.alt = alt;
    const resizedSrc = __buildResizedCollectionImageUrl(resolvedSrc, wrap);
    __bindCollectionImageFallback(img, [resizedSrc ? resolvedSrc : '', fallbackSrc, src], placeholder, skeleton);
    img.src = resizedSrc || resolvedSrc;
    wrap.insertBefore(img, wrap.firstChild);
  };

  if (!ioEnabled || forceHydrateAll) {
    __runChunked(wraps, (wrap) => {
      hydrateWrap(wrap);
    }, { minBatch: 2, maxBatch: 8, budgetMs: 7 });
    return;
  }

  const grid = collection.querySelector('.feat-collection__grid, .tarot-collection__grid');
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
      root: grid || null,
      rootMargin: '96px 0px',
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
}

/* 인라인 런타임의 __cdScheduleCollectionToggleWork 와 같은 것이다 — 열기·닫기가 같은 사다리를 타고,
   지연 실행 시점에 data-collection-open 을 다시 읽어 상태가 뒤집혔으면 건너뛴다. */
function __scheduleCollectionToggleWork(collection, isOpen) {
  __scheduleCollectionTask(() => {
    if ((collection.getAttribute('data-collection-open') === 'true') !== isOpen) return;
    if (isOpen) __hydrateCollectionImagesChunked(collection, true);
    else __releaseCollectionImagesChunked(collection);
  });
}

/* 🔴 가드 플래그 이름은 인라인 런타임 쌍둥이(index-inline-runtime.js)와 **같아야** 한다. 예전에는
   __cdUiCollectionToggleHydrationBound 와 __cdCollectionToggleHydrationBound 로 갈려 있어 서로를
   못 막았고, 토글 한 번에 하이드레이션/해제가 통째로 두 벌 돌았다. */
function __bindCollectionToggleHydration(root) {
  if (!root || typeof root.addEventListener !== 'function') return;
  if (typeof window !== 'undefined' && window.__cdCollectionToggleHydrationBound) return;
  if (typeof window !== 'undefined') window.__cdCollectionToggleHydrationBound = true;
  root.addEventListener('cd:collection-toggle', (event) => {
    const detail = event && event.detail ? event.detail : {};
    const targetId = String(detail.targetId || '').trim();
    if (!targetId) return;
    const collection = document.getElementById(targetId);
    if (!collection) return;
    if (detail.isOpen === true) {
      __scheduleCollectionToggleWork(collection, true);
    } else if (detail.isOpen === false) {
      __scheduleCollectionToggleWork(collection, false);
    }
  });
}

function __schedulePromptSpotlightHydration(root) {
  if (typeof document === 'undefined') return;
  const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
  const start = () => {
    const spotlights = scope.querySelectorAll('.cd-prompt-feature-spotlight');
    __runChunked(spotlights, (spotlight) => {
      __scheduleCollectionHydration(spotlight, true);
    }, { minBatch: 1, maxBatch: 3, budgetMs: 4 });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
    return;
  }
  start();
}

function __releaseCollectionImagesChunked(collection) {
  if (!collection) return;
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
  if (typeof window !== 'undefined') {
    // Do not bind twice; a non-module fallback may already be active.
    if (window.__codeDestinyGlobalActionsBound === 'uiBindings') return;
    if (window.__codeDestinyGlobalActionsBound && window.__codeDestinyGlobalActionsBound !== 'uiBindings') return;
    window.__codeDestinyGlobalActionsBound = 'uiBindings';
  }

  __bindCollectionToggleHydration(root);
  __schedulePromptSpotlightHydration(root);

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

    if (action === 'toggleCollection') {
      // 모바일 "모든 운세" 오버레이가 이미 이 컬렉션을 열고 있으면 그쪽이 유일한 소유자다.
      if (window.cdMobileCollectionFullscreen && window.cdMobileCollectionFullscreen.isOpen()) return;
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

      /* 🔴 여기서 하이드레이션/해제를 다시 부르지 않는다 — 바로 위 dispatch 가 이미
         __bindCollectionToggleHydration 의 리스너를 깨워 같은 일을 시킨다(같은 bindGlobalActions
         안에서 등록되므로 이 분기가 도는 시점엔 항상 붙어 있다). */
      return;
    }

    // 시빌라 진입 타일과 타로/기능 컬렉션 타일은 SEO/크롤용 <a href>이지만 모달·프리뷰를
    // 제자리에서 열어야 한다. 앵커 기본 이동을 막지 않으면 클릭 시 제자리 오픈과 전체 페이지
    // 이동이 동시에 발생해 리딩이 안 열리는 회귀가 생긴다(커밋 49118133에서 button→a 전환 후 노출).
    // 단, 실제로 열어줄 모달/액션 핸들러가 없는 순수 이동형 타일(무료 심리테스트 허브 등)까지
    // preventDefault로 막으면 클릭이 아무 반응 없이 죽는다 — 핸들러 존재 여부를 함께 확인한다.
    const hasRealActionHandler = !!__lazyActionLoaders[action] || typeof window[action] === 'function';
    if (hasRealActionHandler
      && actionEl.tagName === 'A'
      && actionEl.getAttribute('href')
      && event && event.cancelable
      && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      && (event.button === undefined || event.button === 0)
      && (action === 'openSibylModal'
        || actionEl.closest('.tarot-collection__grid, .feat-collection__grid'))) {
      event.preventDefault();
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
