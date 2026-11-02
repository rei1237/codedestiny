/** Naver conversion SDK isolation. No private URL, DOM, referrer or user profile. */
(function () {
  'use strict';
  var origin = 'https://code-destiny.com';
  if (window.location.origin !== origin || window.parent === window) return;
  var started = false, ready = false, delivered = Object.create(null);
  function consent() {
    var cookies = String(document.cookie || '').split(';').map(function (v) { return v.trim(); });
    return cookies.filter(function (v) { return v.indexOf('cd_cookie_consent=') === 0; }).length === 1 && cookies.indexOf('cd_cookie_consent=accepted') >= 0 && cookies.indexOf('cd_analytics_revoke_pending=1') < 0;
  }
  function reply(value) { window.parent.postMessage(value,origin); }
  function initialize(value) {
    if (started || !consent()) return;
    var url;
    try { url = new URL(value); } catch (_) { return; }
    if (url.origin !== origin || url.hash || !/^\/(?:[a-z][a-z0-9-]{0,48}\/?)*$/i.test(url.pathname)) return;
    var pairs = url.search.slice(1).split('&').filter(Boolean);
    if (!pairs.every(function (pair) { return /^NaPm=[a-zA-Z0-9%|=._~-]{1,2048}$/.test(pair) || /^utm_source=naver$|^utm_medium=cpc$|^utm_campaign=(paid_20261028_(naver|brand)|ggulggul_2027_test)$|^utm_content=([A-E]_ko|yearly_[abc])$|^utm_term=K(0[1-9]|10)$/.test(pair); })) return;
    // Only this isolated document changes its virtual address; parent routing is untouched.
    window.history.replaceState(null,'',url.href);
    started = true;
    window.wcs_add = {wa:'s_2e440a175ca'};
    var script = document.createElement('script');
    script.src = 'https://wcs.naver.net/wcslog.js'; script.async = true;
    script.onload = function () {
      if (!consent() || !window.wcs || typeof window.wcs.inflow !== 'function' || typeof window.wcs_do !== 'function' || typeof window.wcs.trans !== 'function') return;
      try {
        window.wcs.inflow('code-destiny.com'); window.wcs_do();
        ready = true; reply({kind:'cd:naver:ready'});
      } catch (_) { /* A blocked SDK must not affect checkout. */ }
    };
    document.head.appendChild(script);
  }
  window.addEventListener('message',function (event) {
    if (event.origin !== origin || event.source !== window.parent || !consent()) return;
    var data = event.data || {};
    if (data.kind === 'cd:naver:init') { initialize(data.url); return; }
    if (data.kind !== 'cd:naver:purchase' || !ready) return;
    var r = data.receipt;
    if (!r || !/^[a-zA-Z0-9_-]{1,160}$/.test(r.id || '') || !Number.isSafeInteger(r.value) || r.value <= 0 || !/^[a-zA-Z0-9_-]{1,100}$/.test(r.item || '')) return;
    if (delivered[r.id]) { reply({kind:'cd:naver:ack',id:r.id,sent:true}); return; }
    var sent = false;
    try { sent = window.wcs.trans({type:'purchase',id:r.id,value:String(r.value),items:[{id:r.item,name:r.item,quantity:1,payAmount:r.value}]}) === true; } catch (_) {}
    if (sent) delivered[r.id] = true;
    reply({kind:'cd:naver:ack',id:r.id,sent:sent});
  });
})();
