/* Display only: the server selects the SKU; Play supplies the buyer's currency and price. */
(function (root, factory) {
  var context = typeof module !== 'undefined' && module.exports ? require('./app-context.js') : root.__cdAppContext;
  var api = root.__cdPlayDisplayPrice || factory(root, context);
  root.__cdPlayDisplayPrice = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root, context) {
  'use strict';
  var queries = new Map(), products = new Map(), generation = 0;
  var fields = ['featureKey', 'subFeatureKey', 'categoryKey', 'reason', 'passTier', 'passPolicyVersion'];
  function isApp() { return Boolean((context || root.__cdAppContext)?.isApp()); }
  function queryKey(input) {
    var params = new URLSearchParams();
    fields.forEach(function (key) { if (input[key]) params.set(key, String(input[key])); });
    return params.toString();
  }
  async function read(input, request) {
    if (!isApp() || root.Capacitor?.getPlatform?.() === 'ios') return null;
    var key = queryKey(input), bridge = root.CodeDestinyNative, version = generation;
    if (!key || typeof bridge?.queryProducts !== 'function') return null;
    if (!queries.has(key)) queries.set(key, (async function () {
      try {
        var response = await (request || root.fetch.bind(root))('/api/app-store/products?' + key, { method: 'GET', cache: 'no-store', credentials: 'include' });
        if (!response.ok) return null;
        var payload = await response.json(), product = payload?.data?.product;
        if (version !== generation || payload?.ok !== true || payload.data?.provider !== 'GOOGLE_PLAY') return null;
        if (product?.freeInApp === true) return { freeInApp: true, formattedPrice: '' };
        var id = product?.productId;
        if (!id) return null;
        if (!products.has(id)) products.set(id, bridge.queryProducts({ productIds: [id], productType: 'inapp' }));
        var result = await products.get(id);
        var detail = result?.ok === true && result.products?.find(function (item) { return item.productId === id; });
        if (version !== generation || !detail || !String(detail.formattedPrice || '').trim() || !/^[A-Z]{3}$/.test(detail.priceCurrencyCode || '') || !(Number(detail.priceAmountMicros) > 0)) return null;
        return { productId: id, formattedPrice: detail.formattedPrice, priceCurrencyCode: detail.priceCurrencyCode, freeInApp: false };
      } catch (_) { return null; }
    })());
    return queries.get(key);
  }
  function translate(key, fallback) { return root.cdTranslate?.(key, {}, fallback) || fallback; }
  function label(result) { return result?.freeInApp ? translate('home.concernPick.price.free', '무료') : result?.formattedPrice || translate('preview.priceUnknown', '가격 확인 필요'); }
  function inputOf(el) {
    return { featureKey: el.getAttribute('data-cd-play-feature') || el.getAttribute('data-cd-price-key'), reason: el.getAttribute('data-cd-play-reason') || el.getAttribute('data-cd-price-reason'), passTier: el.getAttribute('data-cd-play-pass'), passPolicyVersion: el.getAttribute('data-cd-play-policy') };
  }
  function refresh() {
    if (!isApp() || !root.document) return;
    var version = generation;
    root.document.querySelectorAll('[data-cd-play-price],.tarot-tile__coin-badge[data-cd-price-key]').forEach(function (el) {
      var input = inputOf(el);
      // A Play-only display must never present the web KRW amount while it loads.
      if (!el.hasAttribute('data-cd-play-resolved')) {
        var pending = label(null); if (el.textContent !== pending) el.textContent = pending;
      }
      var endKey = el.getAttribute('data-cd-price-key-to');
      void Promise.all([read(input), endKey ? read({ featureKey: endKey, reason: el.getAttribute('data-cd-price-reason-to') }) : null]).then(function (results) {
        if (version !== generation || !el.isConnected) return;
        var result = results[0], next = label(result);
        if (endKey) next = result && results[1] ? next + ' – ' + label(results[1]) : label(null);
        var kind = el.getAttribute('data-cd-play-kind');
        if (result && !result.freeInApp && ['from', 'unlock', 'perUse'].includes(kind)) {
          var fallback = { from: '{price}부터', unlock: '{price}로 해금', perUse: '1회 {price}' }[kind];
          next = translate('home.playPrice.' + kind, fallback).replace(/\{price\}/g, next);
        }
        el.setAttribute('data-cd-play-resolved', '');
        if (el.textContent !== next) el.textContent = next;
      });
    });
  }
  function invalidate() {
    generation++; queries.clear(); products.clear();
    root.document?.querySelectorAll('[data-cd-play-resolved]').forEach(function (el) { el.removeAttribute('data-cd-play-resolved'); });
    refresh();
    root.dispatchEvent?.(new root.CustomEvent('cd:play-prices-changed'));
  }
  if (root.document) {
    var scheduled = false;
    function schedule() { if (!scheduled) { scheduled = true; root.queueMicrotask(function () { scheduled = false; refresh(); }); } }
    function boot() {
      refresh();
      new root.MutationObserver(schedule).observe(root.document.body, { childList: true, subtree: true, characterData: true });
    }
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
    root.addEventListener('cd:locale-ready', refresh);
    root.addEventListener('cd:native-ready', invalidate);
    root.addEventListener('focus', invalidate);
  }
  return { isApp: isApp, read: read, label: label, invalidate: invalidate, refresh: refresh };
});
