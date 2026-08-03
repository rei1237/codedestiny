(function (window) {
  'use strict';

  if (!window || window.CodeDestinyFeaturePricingStore) return;

  var cache = Object.create(null);
  var catalogPromise = null;

  function numberValue(value) {
    var number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
  }

  function normalizeEntry(entry, category) {
    if (!entry) return null;
    var featureKey = String(entry.featureKey || '').trim();
    if (!featureKey) return null;
    var amountKRW = numberValue(entry.amountKRW || entry.amountKrw || entry.paymentAmount || entry.cashPrice || entry.krwAmount);
    var coinPrice = numberValue(entry.coinPrice || entry.cost);
    var displayPrice = String(entry.displayPrice || '').trim();
    if (!displayPrice && amountKRW > 0) displayPrice = amountKRW.toLocaleString('ko-KR') + '원';
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
        displayPrice: amountKRW > 0 ? amountKRW.toLocaleString('ko-KR') + '원' : '',
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
      return cache[String(featureKey || '').trim()] || null;
    },
    getOrLoad: function (featureKey) {
      var key = String(featureKey || '').trim();
      if (!key) return Promise.resolve(null);
      seedFromMarkup(document);
      var current = cache[key];
      if (current) {
        window.__cdMobileFortuneTrace && window.__cdMobileFortuneTrace.record('pricing:cache-hit', { featureKey: key });
        return Promise.resolve(current);
      }
      return load().then(function () { return cache[key] || null; });
    },
    resetForTest: function () {
      Object.keys(cache).forEach(function (key) { delete cache[key]; });
      catalogPromise = null;
    }
  };
})(window);
