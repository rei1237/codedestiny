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
  openPhysiognomyApp: () => __loadScriptOnce('AnalysisEngine.js?v=20260606-physio-accuracy').then(() => __loadScriptOnce('PhysiognomyUI.js?v=20260606-physio-accuracy')),
  openHwatuModal: () => __loadScriptOnce('HwatuFortune.js'),
  openMbtiModal: () => __loadScriptOnce('js/astral-soul.js'),
  openKemetModal: () => __loadScriptOnce('/js/oracle-kcg.js?v=build-00f18484d3e7'),
  openDreamModal: () => __loadScriptOnce('/js/dream-ledger.js?v=build-00f18484d3e7'),
  openPsychoDreamModal: () => __loadScriptOnce('/js/psycho-dream-analyzer-freuds-study.js?v=build-00f18484d3e7'),
  openAnimalTotemModal: () =>
    __loadScriptOnce('/js/services/animal-totem-content-engine.js').then(() =>
      __loadScriptOnce('/js/animal-totem-experience.js?v=build-00f18484d3e7')
    ),
  openSajuAnimalPage: () => Promise.resolve(window.location.assign('/saju-guardian')),
  openDestinyEggPage: () => Promise.resolve(window.location.assign('/tadagochi')),
  openFortuneTellerFishPage: () => Promise.resolve(window.location.assign('/fortune-teller-fish.html')),
  openTarotLoveModal: () => __loadScriptOnce('/js/tarot-love-experience.js?v=build-00f18484d3e7'),
  openTarotReunionModal: () => __loadScriptOnce('/js/tarot-reunion-experience.js?v=build-00f18484d3e7'),
  openTarotHealingPage: () => Promise.resolve(window.location.assign('/tarot/healing')),
  openTarotHealingModal: () => Promise.resolve(window.location.assign('/tarot/healing')),
  openTarotSelfEsteemModal: () => __loadScriptOnce('/js/tarot-self-esteem-experience.js?v=build-00f18484d3e7'),
  openTarotYearFortuneModal: () => __loadScriptOnce('/js/tarot-year-fortune-experience.js?v=build-00f18484d3e7'),
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
  openSibylModal: () => __loadScriptOnce('/js/sibyl-system.js?v=build-00f18484d3e7').then(() => {
    if (typeof window.openSibylModal === 'function') window.openSibylModal();
  }),
  
};

function __ensureSajuCoreScripts() {
  return __loadScriptOnce('/js/destiny-profile.js?v=build-00f18484d3e7')
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

/** INP: 臾닿굅??data-action ?몃뱾?щ? ?ㅼ쓬 ?쒖뒪?щ줈 誘몃８ (index-inline-runtime ??__CD_DEFER_INP_ACTIONS ? ?숈씪) */
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
  // R2 ???щ씪媛 ?덉? ?딆븘 由ъ궗?댁쫰쨌?먮낯??紐⑤몢 404 ?? 濡쒖뺄 寃쎈줈濡?諛붾줈 媛꾨떎.
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

// R2 ?먮낯(媛濡?1300~1500px, ?λ떦 150~200KB)??移대뱶 ?ш린??留욎떠 Cloudflare Image Resizing ?쇰줈
// 以꾩뿬 諛쏅뒗???λ떦 20~40KB). ??? 80px 踰꾪궥?쇰줈 諛섏삱由쇳빐 CDN 罹먯떆媛 ?섍쾶 履쇨컻吏吏 ?딄쾶 ?쒕떎.
// ?ㅽ뙣?섎㈃ __bindCollectionImageFallback ???먮낯 R2 二쇱냼濡??섎룎由곕떎.
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
    // ?섏씠?쒕젅?댁뀡??2???덉씠?꾩썐 ?뺤젙 ?꾩뿉 ?뚮㈃ clientWidth 媛 1??湲곗??쇰줈 ?≫엺????酉고룷?몃줈 ?곹븳
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

/* ?대갚? ?섎굹媛 ?꾨땲???쒖꽌 ?덈뒗 紐⑸줉?대떎.
   ?덉쟾?먮뒗 "由ъ궗?댁쫰 ??R2 ?먮낯" ???④퀎肉먯씠?? R2 ???щ씪媛吏 ?딆? ?먯궛?
   ??二쇱냼媛 紐⑤몢 404 媛 ?섎㈃??留덊겕?낆뿉 ?먮옒 諛뺥? ?덈뜕(洹몃━怨??ㅼ젣濡쒕뒗 200 ??
   /fuctionassets/??寃쎈줈濡??섎룎?꾧컝 湲몄씠 ?놁뼱 ?대?吏媛 ?듭㎏濡??щ씪議뚮떎. */
function __bindCollectionImageFallback(img, fallbackSrc, placeholder, skeleton) {
  if (!img) return;
  const chain = (Array.isArray(fallbackSrc) ? fallbackSrc : [fallbackSrc])
    .map((src) => String(src || '').trim())
    .filter(Boolean)
    .filter((src, index, list) => list.indexOf(src) === index && src !== img.getAttribute('src'));
  img.__cdImgFallbackChain = chain;
  // ???띿꽦???쎈뒗 ?ㅻⅨ 肄붾뱶媛 ?덉뼱 泥??꾨낫??洹몃?濡??몄텧?쒕떎.
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

function __scheduleCollectionHydration(collection, forceHydrateAll = false) {
  const start = () => __hydrateCollectionImagesChunked(collection, forceHydrateAll);
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

function __hydrateCollectionImagesChunked(collection, forceHydrateAll = false) {
  if (!collection) return;
  // 紐⑤컮?쇱뿉?쒕룄 ?곗뒪?ы넲怨??숈씪?섍쾶 ??而щ젆?섏쓽 ?대?吏瑜??섏씠?쒕젅?댁뀡?쒕떎.
  // (紐⑸줉??7媛?而щ젆?섏쓣 嫄몃윭?대뜕 遺꾧린 ?쒓굅 ??index-inline-runtime.js ??媛숈? ?⑥닔? 吏앹쓣 留욎텣??
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
      // 留덊겕?낆뿉 諛뺥엺 ?뺤쟻 <img> ??媛숈? 由ъ궗?댁쫰 寃쎈줈瑜??쒖슫???먮낯 80~200KB 瑜?洹몃?濡?諛쏄퀬 ?덉뿀??
      const resizedExisting = __buildResizedCollectionImageUrl(resolvedExistingSrc, wrap);
      // 由ъ궗?댁쫰 ??R2 ?먮낯 ??留덊겕?낆뿉 諛뺥? ?덈뜕 ?먮옒 寃쎈줈 ?쒖쑝濡?臾쇰윭?쒕떎.
      // 留덉?留??꾨낫媛 ?덉뼱??R2 ???꾩쭅 ???щ씪媛??먯궛???붾㈃?먯꽌 ?щ씪吏吏 ?딅뒗??
      const existingFallback = [resizedExisting ? resolvedExistingSrc : '', existingSrc];
      const nextSrc = resizedExisting || resolvedExistingSrc;
      if (nextSrc && nextSrc !== existingSrc) {
        // 泥댁씤? "諛붿씤???쒖젏??src" ? 媛숈? ?꾨낫瑜?嫄몃윭?몃떎. 癒쇱? 諛붿씤?⑺븯硫?留덊겕?낆쓽 ?먮옒
        // 寃쎈줈(/fuctionassets/??媛 ?꾩쭅 ?꾩옱 src ??泥댁씤?먯꽌 鍮좎?怨? R2 ???녿뒗 ?먯궛?
        // 由ъ궗?댁쫰쨌R2 ?먮낯??紐⑤몢 404 ??臾쇰윭??怨녹씠 ?놁뼱 img 媛 ?듭㎏濡??쒓굅?쒕떎.
        existingImg.loading = 'eager';
        existingImg.src = nextSrc;
        __bindCollectionImageFallback(existingImg, existingFallback, placeholder, null);
      } else if (nextSrc && !(existingImg.complete && existingImg.naturalWidth > 0)) {
        // ?ロ엺 而щ젆???덉뿉???뚯떛??loading="lazy" ?대?吏???대젮???붿껌???ㅼ떆 嫄몃━吏 ?딅뒗?????몃뱶瑜??덈줈 遺숈뿬 源⑥슫??        const revived = existingImg.cloneNode(false);
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
    // IntersectionObserver 媛 ?대? 吏?곕줈?⑹쓣 ?앸궦 ?ㅻ씪 loading="lazy" 瑜???嫄몃㈃ ?붿껌???곸쁺 ???섍컙??    img.loading = 'eager';
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

function __bindCollectionToggleHydration(root) {
  if (!root || typeof root.addEventListener !== 'function') return;
  if (typeof window !== 'undefined' && window.__cdUiCollectionToggleHydrationBound) return;
  if (typeof window !== 'undefined') window.__cdUiCollectionToggleHydrationBound = true;
  root.addEventListener('cd:collection-toggle', (event) => {
    const detail = event && event.detail ? event.detail : {};
    const targetId = String(detail.targetId || '').trim();
    if (!targetId) return;
    const collection = document.getElementById(targetId);
    if (!collection) return;
    if (detail.isOpen === true) {
      __scheduleCollectionHydration(collection, true);
    } else if (detail.isOpen === false) {
      __releaseCollectionImagesChunked(collection);
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
          ? actionEl.getAttribute('aria-label').replace(/?닿린|?リ린/, newState ? '?リ린' : '?닿린')
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

    // ?쒕퉴??吏꾩엯 ??쇨낵 ?濡?湲곕뒫 而щ젆????쇱? SEO/?щ·??<a href>?댁?留?紐⑤떖쨌?꾨━酉곕?
    // ?쒖옄由ъ뿉???댁뼱???쒕떎. ?듭빱 湲곕낯 ?대룞??留됱? ?딆쑝硫??대┃ ???쒖옄由??ㅽ뵂怨??꾩껜 ?섏씠吏
    // ?대룞???숈떆??諛쒖깮??由щ뵫?????대━???뚭?媛 ?앷릿??而ㅻ컠 49118133?먯꽌 button?뭓 ?꾪솚 ???몄텧).
    // ?? ?ㅼ젣濡??댁뼱以?紐⑤떖/?≪뀡 ?몃뱾?ш? ?녿뒗 ?쒖닔 ?대룞?????臾대즺 ?щ━?뚯뒪???덈툕 ??源뚯?
    // preventDefault濡?留됱쑝硫??대┃???꾨Т 諛섏쓳 ?놁씠 二쎈뒗?????몃뱾??議댁옱 ?щ?瑜??④퍡 ?뺤씤?쒕떎.
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
