(function (window) {
  'use strict';

  if (!window || window.CodeDestinyFeaturePricingStore) return;

  var cache = Object.create(null);
  var catalogPromise = null;

  function numberValue(value) {
    var number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
  }

  // 🔴 `/api/billing/features` 는 displayPrice 를 "30,000원" 으로 굳혀 보낸다. 그 응답은
  //    가격이 국가 불변이라 캐시되므로 **서버에서 로케일별 문자열을 만들 수 없다** — 만들면
  //    캐시가 로케일마다 갈라진다. 그래서 금액 문구는 여기서, 결제창과 같은 정본
  //    (js/core/checkout-entry.js formatKrwAmount)으로 다시 그린다. 그러지 않으면 영어·일본어
  //    화면의 타일 배지에 "30,000원" 이 그대로 나간다.
  //    모듈이 아직 안 붙었으면 종전 동작(한국어 표기)으로 물러난다 — 가격을 빈칸으로 두지 않는다.
  function formatAmountLabel(amountKRW) {
    if (!(amountKRW > 0)) return '';
    var api;
    try { api = window.__cdCheckoutEntry || null; } catch (_checkoutEntryError) { api = null; }
    if (api && typeof api.formatKrwAmount === 'function') {
      try { return api.formatKrwAmount(amountKRW, '{amount}원'); } catch (_formatKrwError) { /* 폴백으로 흡수 */ }
    }
    return amountKRW.toLocaleString('ko-KR') + '원';
  }

  /**
   * 저장된 금액으로 라벨을 read 시점에 다시 그린다.
   * seedFromMarkup 은 checkout-entry 가 붙기 전에 돌 수 있어 store 시점 포맷만으로는 부족하다.
   * amountKRW 가 정본이고 포맷은 멱등이라 제자리 수정이 안전하다(객체 동일성 유지).
   */
  function withCurrentLocaleLabel(entry) {
    if (!entry) return entry;
    var label = formatAmountLabel(entry.amountKRW);
    if (label) entry.displayPrice = label;
    return entry;
  }

  function normalizeEntry(entry, category) {
    if (!entry) return null;
    var featureKey = String(entry.featureKey || '').trim();
    if (!featureKey) return null;
    var amountKRW = numberValue(entry.amountKRW || entry.amountKrw || entry.paymentAmount || entry.cashPrice || entry.krwAmount);
    var coinPrice = numberValue(entry.coinPrice || entry.cost);
    var displayPrice = formatAmountLabel(amountKRW) || String(entry.displayPrice || '').trim();
    return {
      featureKey: featureKey,
      displayPrice: displayPrice,
      amountKRW: amountKRW,
      coinPrice: coinPrice,
      cost: coinPrice,
      paymentMode: String(entry.paymentMode || 'single_purchase'),
      billingType: String(entry.billingType || entry.accessKind || ''),
      pricingPolicy: entry.pricingPolicy || null,
      categoryKey: String(entry.categoryKey || (category && category.categoryKey) || ''),
      source: 'worker-registry'
    };
  }

  function addEntry(entry, category) {
    var normalized = normalizeEntry(entry, category);
    if (normalized) cache[normalized.featureKey] = normalized;
  }

  // Existing card metadata is generated from the Worker registry and is
  // enough to render a matching price. Seed it before considering a network
  // catalog request so each card does not trigger billing/features.
  function seedFromMarkup(root) {
    var scope = root && root.querySelectorAll ? root : document;
    if (!scope || !scope.querySelectorAll) return cache;
    scope.querySelectorAll('[data-feature-key][data-coin-cost],[data-feature-key][data-price-krw]').forEach(function (tile) {
      var featureKey = String(tile.getAttribute('data-feature-key') || '').trim();
      if (!featureKey || cache[featureKey]) return;
      var coinPrice = numberValue(tile.getAttribute('data-coin-cost') || tile.getAttribute('data-tile-lock-cost'));
      var amountKRW = numberValue(tile.getAttribute('data-price-krw') || tile.getAttribute('data-payment-amount-krw'));
      if (!amountKRW && coinPrice > 0) amountKRW = coinPrice * 100;
      if (!coinPrice && amountKRW > 0) coinPrice = Math.ceil(amountKRW / 100);
      if (!coinPrice && !amountKRW) return;
      cache[featureKey] = {
        featureKey: featureKey,
        displayPrice: formatAmountLabel(amountKRW),
        amountKRW: amountKRW,
        coinPrice: coinPrice,
        cost: coinPrice,
        paymentMode: 'single_purchase',
        billingType: '',
        pricingPolicy: null,
        categoryKey: '',
        source: 'worker-registry-markup'
      };
      tile.setAttribute('data-price-krw', String(amountKRW || 0));
      tile.setAttribute('data-payment-amount-krw', String(amountKRW || 0));
      tile.setAttribute('data-cd-price-source', 'worker-registry-markup');
    });
    return cache;
  }

  function indexCatalog(payload) {
    var data = payload && payload.data ? payload.data : payload;
    var categories = data && data.categories;
    if (Array.isArray(categories)) {
      categories.forEach(function (category) {
        if (!category) return;
        addEntry(category, category);
        var subFeatures = Array.isArray(category.subFeatures) ? category.subFeatures : [];
        subFeatures.forEach(function (entry) { addEntry(entry, category); });
      });
    }
    var legacy = data && data.legacyFeatureTable;
    if (Array.isArray(legacy)) legacy.forEach(function (entry) { addEntry(entry, null); });
    return cache;
  }

  function load() {
    if (catalogPromise) {
      window.__cdMobileFortuneTrace && window.__cdMobileFortuneTrace.record('pricing:dedupe', { source: 'worker-registry' });
      return catalogPromise;
    }
    catalogPromise = window.fetch('/api/billing/features', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    }).then(function (response) {
      if (!response || !response.ok) throw new Error('billing catalog unavailable');
      return response.json();
    }).then(function (payload) {
      indexCatalog(payload);
      window.__cdMobileFortuneTrace && window.__cdMobileFortuneTrace.record('pricing:catalog-loaded', {
        entryCount: Object.keys(cache).length,
        source: 'worker-registry'
      });
      return cache;
    }).finally(function () {
      catalogPromise = null;
    });
    return catalogPromise;
  }

  window.CodeDestinyFeaturePricingStore = {
    cache: cache,
    load: load,
    seedFromMarkup: seedFromMarkup,
    get: function (featureKey) {
      seedFromMarkup(document);
      return withCurrentLocaleLabel(cache[String(featureKey || '').trim()] || null);
    },
    getOrLoad: function (featureKey) {
      var key = String(featureKey || '').trim();
      if (!key) return Promise.resolve(null);
      seedFromMarkup(document);
      var current = cache[key];
      if (current) {
        window.__cdMobileFortuneTrace && window.__cdMobileFortuneTrace.record('pricing:cache-hit', { featureKey: key });
        return Promise.resolve(withCurrentLocaleLabel(current));
      }
      return load().then(function () { return withCurrentLocaleLabel(cache[key] || null); });
    },
    resetForTest: function () {
      Object.keys(cache).forEach(function (key) { delete cache[key]; });
      catalogPromise = null;
    }
  };
})(window);
