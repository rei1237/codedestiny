/* 운명 구조도(DESTINY ANATOMY) 부트 — 무료 사주 결과 안의 섹션을 켜고 잇는다.
 *
 * 🔴 플래그(DESTINY_ANATOMY_ENABLED)는 이 파일이 정본이다. 꺼진 호스트에서는 엔진·문구·화면·CSS 를 내려받지 않는다.
 *    2026-10-07 요청: 사주 명식 아래 진입 카드 노출. 운영 배포는 별도 승인 경계를 유지한다.
 * 🔴 사주를 다시 계산하지 않고, 출생정보를 다시 묻지 않는다. 셸 calculate() 가 끝나며 쏘는 cd:saju-summary-ready 를 받아
 *    셸 전역을 읽기만 한다. HD·베다는 로그인 사용자만 기존 API 를 재사용하고, 사용자가 "자세히 보기"를 연 뒤에만 부른다.
 * 🔴 어떤 실패도 사주 결과·결제·저장으로 번지지 않는다 — 이 카드 안에서 "다시 불러오기"로만 바뀐다.
 * 지연 자산 URL 은 index.html 카드의 data-da-* 에 있고, sync:public 이 ?v= 를 내용 해시로 찍는다. */
(function (root) {
  'use strict';

  var PRODUCTION_ENABLED = true;
  // pages.dev·workers.dev 는 운영 프로젝트 별칭일 수 있어 넣지 않는다.
  var STAGING_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|staging\.code-destiny\.com)$/i;
  var VARIANTS = ['A', 'B', 'C', 'D'];
  var VARIANT_KEY = 'cd_da_hero_v1';
  var FETCH_TIMEOUT_MS = 15000;
  // 서버 narrate 예산(24초)보다 길게 — 서버가 결정론으로 답할 시간을 준다.
  var NARRATE_TIMEOUT_MS = 32000;
  var NARRATE_URL = '/api/destiny-anatomy/narrate';
  // 문장은 copy.js 정적 문구가 정본이다(10-06 결정: LLM 최소). false 면 narrate 요청을 아예 보내지 않는다.
  // 켜려면 이 상수와 워커 ENABLE_DESTINY_ANATOMY_REAL_LLM 둘 다 바꾸고, 실호출은 별도 1회 승인을 받는다.
  var NARRATE_ENABLED = false;
  var FALLBACK_UI = {
    ko: {error: '운명 구조도를 불러오지 못했어요', retry: '다시 불러오기'},
    en: {error: 'We could not load your Destiny Anatomy', retry: 'Try again'}
  };

  function isEnabled(host) {
    if (PRODUCTION_ENABLED) return true;
    var h = host;
    if (h == null) { try { h = root.location && root.location.hostname; } catch (e) { h = ''; } }
    return STAGING_HOSTS.test(String(h || ''));
  }

  function pickVariant(storage, rand) {
    var v = null;
    try { v = storage && storage.getItem(VARIANT_KEY); } catch (e) { v = null; }
    if (VARIANTS.indexOf(v) >= 0) return v;
    v = VARIANTS[Math.floor((rand || Math.random)() * VARIANTS.length) % VARIANTS.length];
    try { if (storage) storage.setItem(VARIANT_KEY, v); } catch (e) { /* 저장 불가여도 이번 화면은 같은 값으로 간다 */ }
    return v;
  }

  /* 셸 _astroBirth(양력 환산 완료) → HD·베다 요청 본문. 시간 미상·시간대 없음이면 null(조회 생략). */
  function birthRequest(birth, timezone, gender, locale) {
    if (!birth || birth.unknownHour || !timezone) return null;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var y = Number(birth.year), mo = Number(birth.month), d = Number(birth.day), h = Number(birth.hour), mi = Number(birth.minute) || 0;
    if (!(y > 0 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && h >= 0 && h <= 23)) return null;
    var date = y + '-' + pad(mo) + '-' + pad(d);
    var time = pad(h) + ':' + pad(mi);
    var lat = Number(birth.lat), lon = Number(birth.lon);
    var place = isFinite(lat) && isFinite(lon) ? {latitude: lat, longitude: lon, timezone: timezone} : null;
    var hd = {birthDate: date, birthTime: time, timezone: timezone, calendar: 'solar'};
    if (place) { hd.latitude = lat; hd.longitude = lon; }
    var vedic = place ? {gender: gender === 'M' ? 'male' : 'female', birthDate: date, birthTime: time, calendarType: 'solar', birthPlace: place, timezone: timezone, locale: locale} : null;
    return {key: [date, time, timezone, place ? lat.toFixed(4) + ',' + lon.toFixed(4) : '', gender].join('|'), hd: hd, vedic: vedic};
  }

  /* 문장 다듬기(LLM) — 열린 뒤에만, 서버 플래그가 켜진 스테이징에서만 실제로 바뀐다. 결정론 문장이 정본이고
     어떤 실패(플래그 꺼짐·한도·충실도·시간 초과)도 조용히 결정론을 유지한다. 키는 로케일+원문이라 대운이 늦게 와도 문장이 같으면 다시 부르지 않는다. */
  function narrateBase(m) {
    var t = m && m.text;
    if (!t || !t.mindLine) return null;
    var names = (t.engines || []).slice(0, 3).map(function (e) { return e.name; });
    if (t.hd && t.hd.typeName) names.push(t.hd.typeName);
    if (t.hd && t.hd.authorityName) names.push(t.hd.authorityName);
    var base = {mindLine: t.mindLine, insights: (t.insights || []).slice(0, 3).map(function (i) { return {title: i.title, body: i.body}; })};
    return {key: m.locale + '|' + base.mindLine + '|' + base.insights.map(function (i) { return i.body; }).join('|'), base: base, names: names.filter(Boolean).slice(0, 5)};
  }
  function acceptNarration(res, count) {
    var ok = res && res.ok === true && res.source === 'llm' && typeof res.mindLine === 'string' && res.mindLine &&
      Array.isArray(res.insights) && res.insights.length === count &&
      res.insights.every(function (x) { return typeof x === 'string' && x; });
    return ok ? {mindLine: res.mindLine, insights: res.insights.slice()} : null;
  }
  function mergeNarration(m, hit) {
    m.text.mindLine = hit.mindLine;
    if (m.fusion) m.fusion.summary = hit.mindLine;
    if (m.share) m.share.headline = hit.mindLine;
    (m.text.insights || []).forEach(function (ins, i) { if (hit.insights[i]) ins.body = hit.insights[i]; });
    m.narrated = true;
    return m;
  }

  var api = {isEnabled: isEnabled, PRODUCTION_ENABLED: PRODUCTION_ENABLED, pickVariant: pickVariant, birthRequest: birthRequest,
    narrateBase: narrateBase, acceptNarration: acceptNarration, mergeNarration: mergeNarration, NARRATE_ENABLED: NARRATE_ENABLED};
  root.DestinyAnatomyBoot = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  var doc = root.document;
  if (!doc || !isEnabled()) return;

  var card = null;
  var assets = null;
  var model = null;
  var gen = 0;
  var layers = {status: 'idle', hd: null, vedic: null, key: ''};
  var layerCache = {};
  var narrations = {};
  var lit = {};
  var fired = {};
  var observer = null;
  var state = {variant: 'A', open: false, thoughtsOpen: false, view: 'hd', copied: false, askStatus: '', askView: false};

  function lang() {
    try { if (typeof root._sajuEngineCurrentLang === 'function') return root._sajuEngineCurrentLang(); } catch (e) { /* 셸 언어 판정 실패 */ }
    return (doc.documentElement && doc.documentElement.lang) || 'ko';
  }
  function ui() {
    var C = root.DestinyAnatomyCopy;
    try { if (C) return C.COPY[C.resolveLocale(lang())].ui; } catch (e) { /* 문구 파일이 없으면 아래 대체 */ }
    return lang().indexOf('ko') === 0 ? FALLBACK_UI.ko : FALLBACK_UI.en;
  }

  // 분석 — 모든 이벤트에 hero_variant 를 싣는다. 실패는 삼킨다(analytics.js 도 그렇다).
  function cdTrack(name, extra) {
    var params = {hero_variant: state.variant, locale: model ? model.locale : lang()};
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) params[k] = extra[k];
    try { if (typeof root.cdTrack === 'function') root.cdTrack(name, params); } catch (e) { /* 계측 실패는 화면에 영향 없음 */ }
  }
  function once(key, fn) { if (!fired[key]) { fired[key] = true; fn(); } }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = src;
      s.async = false; // 순서 보장: engine → hd-copy → copy → render
      s.onload = function () { resolve(); };
      s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); reject(new Error('load ' + src)); };
      doc.head.appendChild(s);
    });
  }
  function ensureAssets() {
    if (assets) return assets;
    var ds = card.dataset;
    if (ds.daCss && !doc.querySelector('link[data-da-style]')) {
      var link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = ds.daCss;
      link.setAttribute('data-da-style', '');
      doc.head.appendChild(link);
    }
    var list = [ds.daEngine, ds.daHdcopy, ds.daCopy, ds.daRender].filter(Boolean);
    var shareSrc = ds.daShare;
    assets = Promise.all(list.map(loadScript)).then(function () {
      if (!root.DestinyAnatomyEngine || !root.DestinyAnatomyCopy || !root.DestinyAnatomyRender) throw new Error('destiny-anatomy assets missing');
      if (shareSrc) loadScript(shareSrc).catch(function () { /* 공유 카드가 없으면 링크 공유로 대체 */ });
    });
    assets.catch(function () { assets = null; }); // 다시 불러오기가 처음부터 시도하도록
    return assets;
  }

  function build() {
    return root.DestinyAnatomyEngine.buildDestinyAnatomy({scope: root, lang: lang(), hdChart: layers.hd, vedicBasis: layers.vedic});
  }
  function layerState() {
    if (model && model.timeUnknown) return 'timeUnknown';
    return layers.status === 'idle' ? 'loading' : layers.status;
  }

  function paint() {
    var focus = doc.activeElement;
    var focusEntry = focus && card.contains(focus) && focus.hasAttribute('data-da-trigger');
    var focusView = focus && card.contains(focus) ? focus.getAttribute("data-da-view") : null;
    var openEngines = [];
    var prev = card.querySelectorAll('details[data-da-engine][open]');
    for (var i = 0; i < prev.length; i++) openEngines.push(prev[i].getAttribute('data-da-engine'));
    root.DestinyAnatomyRender.render(card, model, {variant: state.variant, open: state.open, thoughtsOpen: state.thoughtsOpen,
      view: state.view, layer: layerState(), copied: state.copied, askStatus: state.askStatus, askView: state.askView});
    openEngines.forEach(function (axis) {
      var d = card.querySelector('details[data-da-engine="' + axis + '"]');
      if (d) d.open = true;
    });
    if (focusView) { var focusButton = card.querySelector('[data-da-view="' + focusView + '"]'); if (focusButton) focusButton.focus({preventScroll: true}); }
    if (focusEntry) { var entry = card.querySelector('[data-da-trigger]'); if (entry) entry.focus({preventScroll: true}); }
    observeSections();
    fitMeme();
  }

  /* 밈 뇌구조 칸 글자가 넘치면 render.fitMeme 이 단계를 낮춘다. 폭이 바뀌거나 글꼴이 늦게 붙으면 다시 잰다. */
  var memeWatch = null;
  function fitMeme() {
    var R = root.DestinyAnatomyRender;
    if (!R || typeof R.fitMeme !== 'function') return;
    try { R.fitMeme(card); } catch (e) { /* 맞춤 실패는 그림만 그대로 둔다 */ }
    if (memeWatch) return;
    memeWatch = true;
    if (typeof root.ResizeObserver === 'function') {
      var lastW = 0;
      new root.ResizeObserver(function (entries) {
        var w = Math.round(entries[0].contentRect.width);
        if (w !== lastW) { lastW = w; try { R.fitMeme(card); } catch (e) { /* 무시 */ } }
      }).observe(card);
    }
    if (doc.fonts && doc.fonts.ready && typeof doc.fonts.ready.then === 'function') {
      doc.fonts.ready.then(function () { try { R.fitMeme(card); } catch (e) { /* 무시 */ } });
    }
  }

  function showError() {
    var R = root.DestinyAnatomyRender;
    var u = ui();
    if (R) { R.renderError(card, u); return; }
    card.innerHTML = '<div class="da-sec da-sec--error" role="alert"><p></p><button type="button" class="da-btn da-btn--ghost" data-da-act="retry"></button></div>';
    card.querySelector('p').textContent = u.error;
    card.querySelector('button').textContent = u.retry;
  }

  function refresh() {
    try {
      var next = build();
      if (!next) { card.hidden = true; return; }
      model = next;
      applyNarration();
      paint();
      narrate();
    } catch (e) {
      if (root.console && root.console.warn) root.console.warn('[destiny-anatomy] render failed', e);
      showError();
    }
  }

  /* 셸은 요약 이벤트 뒤 지연 작업에서 대운(G_DAEWUN)을 채우고 따로 알리지 않는다. 채워지면 한 번 다시 그린다.
     출생시간 미상이면 셸이 대운을 만들지 않으므로 기다리지 않는다. 최대 약 10초. */
  function waitForLuck(my, tries) {
    if (my !== gen || !model || root.__cdSajuTimeUnknown === true || (model.luck && model.luck.available)) return;
    if (Array.isArray(root.G_DAEWUN) && root.G_DAEWUN.length) { refresh(); return; }
    if (tries >= 25) return;
    root.setTimeout(function () { waitForLuck(my, tries + 1); }, 400);
  }

  function start() {
    card = card || doc.getElementById('destinyAnatomyCard');
    if (!card || !root.G_PILLARS) return;
    var my = ++gen;
    model = null;
    layers = {status: 'idle', hd: null, vedic: null, key: ''};
    state.open = false;
    state.thoughtsOpen = false;
    state.copied = false;
    card.hidden = false;
    try { root.DestinyAnatomyRender ? root.DestinyAnatomyRender.renderSkeleton(card) : (card.innerHTML = '<div class="da-skeleton" aria-busy="true"><span class="da-skel da-skel--title"></span><span class="da-skel da-skel--brain"></span></div>'); } catch (e) { /* 스켈레톤 실패는 무시 */ }
    ensureAssets().then(function () {
      if (my !== gen) return;
      refresh();
      if (model) once('impression-armed:' + my, function () { watchImpression(my); });
      waitForLuck(my, 0);
    }, function (e) {
      if (my !== gen) return;
      if (root.console && root.console.warn) root.console.warn('[destiny-anatomy] assets failed', e);
      showError();
    });
  }

  /* HD·베다 — 로그인 + 출생시간 있음일 때만. 둘 다 기존 워커 라우트이며 HD 는 응답을 사용자 HD 보관함에 남긴다(기존 동작). */
  function postJson(url, body, signal) {
    return root.fetch(url, {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: signal})
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { var err = new Error('auth'); err.auth = true; throw err; }
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      });
  }
  function withTimeout(fn, ms) {
    var ctl = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = root.setTimeout(function () { if (ctl) ctl.abort(); }, ms || FETCH_TIMEOUT_MS);
    return fn(ctl ? ctl.signal : undefined).then(function (v) { root.clearTimeout(timer); return v; }, function (e) { root.clearTimeout(timer); throw e; });
  }
  function applyNarration() {
    var nb = narrateBase(model);
    if (!nb) return;
    model.narrationKey = nb.key;
    var hit = narrations[nb.key];
    if (hit && typeof hit === 'object') mergeNarration(model, hit);
  }
  function narrate() {
    if (!NARRATE_ENABLED || !state.open || !model || model.narrated || typeof root.fetch !== 'function') return;
    var nb = narrateBase(model);
    if (!nb || narrations[nb.key]) return;
    narrations[nb.key] = 'pending';
    var my = gen;
    var body = {fingerprint: model.fingerprint, locale: model.locale, axes: (model.saju && model.saju.ranked || []).slice(0, 3), names: nb.names, base: nb.base};
    try {
      withTimeout(function (signal) { return postJson(NARRATE_URL, body, signal); }, NARRATE_TIMEOUT_MS).then(function (res) {
        var hit = acceptNarration(res, nb.base.insights.length);
        narrations[nb.key] = hit || 'none';
        if (hit && my === gen && model && model.narrationKey === nb.key) refresh();
      }, function () { narrations[nb.key] = 'none'; });
    } catch (e) { narrations[nb.key] = 'none'; }
  }

  function loadLayers() {
    if (!model || model.timeUnknown || layers.status === 'loading' || layers.status === 'ready') return;
    var signedIn = false;
    try { signedIn = typeof root.__dpHasLoginSession === 'function' && !!root.__dpHasLoginSession(); } catch (e) { signedIn = false; }
    if (!signedIn) { layers.status = 'login'; paint(); return; }
    var tzEl = doc.getElementById('birthCountry');
    var req = birthRequest(root._astroBirth, tzEl && tzEl.value, root.GENDER, model.locale);
    if (!req) { layers.status = 'failed'; paint(); return; }
    var my = gen;
    if (layerCache[req.key]) { applyLayers(my, req.key, layerCache[req.key]); return; }
    layers.status = 'loading';
    paint();
    var hdP = withTimeout(function (signal) { return postJson('/api/human-design/chart', req.hd, signal); })
      .then(function (j) { return j && j.ok !== false && j.chart ? j.chart : null; });
    var vedicP = req.vedic ? withTimeout(function (signal) { return postJson('/api/vedic-ai/basis', req.vedic, signal); })
      .then(function (j) { return j && j.ok !== false ? j : null; }) : Promise.resolve(null);
    Promise.all([settle(hdP), settle(vedicP)]).then(function (res) {
      var out = {hd: res[0].value || null, vedic: res[1].value || null, auth: !!(res[0].error && res[0].error.auth)};
      if (out.hd || out.vedic) layerCache[req.key] = out;
      applyLayers(my, req.key, out);
    });
  }
  function settle(p) { return p.then(function (v) { return {value: v}; }, function (e) { return {error: e}; }); }
  function applyLayers(my, key, out) {
    if (my !== gen) return;
    layers = {status: out.hd ? 'ready' : (out.auth ? 'login' : 'failed'), hd: out.hd, vedic: out.vedic, key: key};
    if (!out.hd) state.view = 'chakra';
    refresh();
  }

  /* 관찰 — 노출·뇌 지도·융합 노출과 섹션 점등(is-lit). 다시 그려도 한 번만 센다. */
  function watchImpression(my) {
    if (typeof root.IntersectionObserver !== 'function') { cdTrack('destiny_anatomy_impression', {}); return; }
    var io = new root.IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting || my !== gen) return;
        io.disconnect();
        once('impression', function () { cdTrack('destiny_anatomy_impression', {time_unknown: !!(model && model.timeUnknown)}); });
      });
    }, {threshold: 0.25});
    io.observe(card);
  }
  function observeSections() {
    var secs = card.querySelectorAll('[data-da-sec]');
    for (var i = 0; i < secs.length; i++) if (lit[secs[i].getAttribute('data-da-sec')]) secs[i].classList.add('is-lit');
    if (typeof root.IntersectionObserver !== 'function') {
      for (var j = 0; j < secs.length; j++) secs[j].classList.add('is-lit');
      return;
    }
    if (observer) observer.disconnect();
    observer = new root.IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.getAttribute('data-da-sec');
        lit[id] = true;
        en.target.classList.add('is-lit');
        observer.unobserve(en.target);
        if (id === 'brain') once('brain_view', function () { cdTrack('destiny_anatomy_brain_view', {}); });
        if (id === 'fusion') once('fusion_view', function () { cdTrack('destiny_anatomy_fusion_view', {with_hd: !!(model && model.text && model.text.hd)}); });
      });
    }, {threshold: 0.2});
    for (var k = 0; k < secs.length; k++) observer.observe(secs[k]);
  }

  // 50% 스크롤 — 카드 높이의 절반을 지나면 한 번.
  var scrollQueued = false;
  function onScroll() {
    if (scrollQueued || fired.scroll_50 || !model || !card || card.hidden) return;
    scrollQueued = true;
    root.requestAnimationFrame(function () {
      scrollQueued = false;
      var r = card.getBoundingClientRect();
      if (r.height > 0 && (root.innerHeight - r.top) / r.height >= 0.5) {
        once('scroll_50', function () { cdTrack('destiny_anatomy_scroll_50', {open: state.open}); });
      }
    });
  }

  function shareUrl() { return root.location.origin + '/saju/destiny-anatomy/?from=da_share'; }
  function setShareStatus(text) {
    var el = card.querySelector('.da-share__status');
    if (el) el.textContent = text;
  }
  function copyLink() {
    var url = shareUrl();
    var done = function () {
      state.copied = true;
      setShareStatus(ui().copied);
      cdTrack('destiny_anatomy_share_success', {method: 'copy'});
    };
    try {
      if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
        root.navigator.clipboard.writeText(url).then(done, function () { setShareStatus(url); });
        return;
      }
    } catch (e) { /* 아래 대체 */ }
    setShareStatus(url);
  }
  function share(method) {
    cdTrack('destiny_anatomy_share_click', {method: method});
    if (method === 'copy') { copyLink(); return; }
    var SC = root.DestinyAnatomyShareCard;
    if (SC && typeof SC.share === 'function') {
      Promise.resolve(SC.share(model, {mode: method, url: shareUrl(), lang: model.locale})).then(function (result) {
        var status = result && result.status;
        if (status === 'shared' || status === 'saved') {
          cdTrack('destiny_anatomy_share_success', {method: status === 'saved' ? 'save' : method});
          setShareStatus(model.text.recovery[status]);
        } else if (status === 'cancelled') setShareStatus(model.text.recovery.cancelled);
      }, function () { setShareStatus(model.text.recovery.failed); });
      return;
    }
    var nav = root.navigator;
    if (method === 'share' && nav && typeof nav.share === 'function') {
      nav.share({title: model.text.ui.title, text: model.share.headline, url: shareUrl()}).then(function () {
        cdTrack('destiny_anatomy_share_success', {method: 'share'});
      }, function (err) { setShareStatus(model.text.recovery[err && err.name === 'AbortError' ? 'cancelled' : 'failed']); });
      return;
    }
    copyLink();
  }

  /* 클립보드 복사 — 막힌 브라우저는 숨긴 textarea 로 한 번 더, 그래도 안 되면 false(질문 전문을 펼쳐 직접 복사하게 한다). */
  function copyText(text) {
    return new Promise(function (resolve) {
      var legacy = function () {
        try {
          var ta = doc.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.top = '-1000px';
          ta.style.opacity = '0';
          doc.body.appendChild(ta);
          ta.select();
          var ok = typeof doc.execCommand === 'function' && doc.execCommand('copy');
          doc.body.removeChild(ta);
          resolve(!!ok);
        } catch (e) { resolve(false); }
      };
      try {
        if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
          root.navigator.clipboard.writeText(text).then(function () { resolve(true); }, legacy);
          return;
        }
      } catch (e) { /* 아래 대체 */ }
      legacy();
    });
  }
  function setAskStatus(text) {
    state.askStatus = text;
    var el = card.querySelector('.da-ask__status');
    if (el) el.textContent = text;
  }
  /* "나는 어떤 사람이야?" — 복사를 먼저 시작하고 같은 탭 동작 안에서 새 탭을 연다(팝업 차단 회피).
   * noopener 로 연 창은 늘 null 을 돌려주므로 차단 여부를 반환값으로 판정하지 않는다 — 안내 문구가 확인 방법을 알려 준다. */
  function askAi(target) {
    var R = root.DestinyAnatomyRender;
    var ai = target !== 'copy' && R && R.AI_TARGETS ? R.AI_TARGETS[target] : null;
    var u = ui();
    cdTrack('destiny_anatomy_ai_prompt', {target: ai ? target : 'copy'});
    var copying = copyText(model.text.aiPrompt || '');
    if (ai) {
      try { root.open(ai.url, '_blank', 'noopener,noreferrer'); } catch (e) { /* 새 탭 실패는 안내 문구가 대신한다 */ }
    }
    copying.then(function (ok) {
      if (!ok) {
        state.askView = true;
        var view = card.querySelector('.da-ask__view');
        if (view) view.open = true;
        setAskStatus(u.askCopyFail);
        return;
      }
      setAskStatus(ai ? u.askOpened.replace('{ai}', ai.label) : u.askCopied);
    });
  }

  function scrollToId(id) {
    var el = doc.getElementById(id);
    if (!el) return;
    var reduce = false;
    try { reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduce = false; }
    el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'});
  }

  function onClick(ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-da-act]') : null;
    if (!btn || !card.contains(btn)) return;
    var act = btn.getAttribute('data-da-act');
    try {
      if (act === 'retry') {
        if (!model) { start(); return; }
        if (layers.status === 'failed') { layers.status = 'idle'; loadLayers(); return; }
        refresh();
      } else if (act === 'collapse') {
        var report = card.querySelector('[data-da-report]');
        if (report) { report.open = false; state.open = false; report.querySelector('summary').focus(); }
      } else if (act === 'thoughts') {
        state.thoughtsOpen = !state.thoughtsOpen;
        paint();
      } else if (act === 'view') {
        state.view = btn.getAttribute('data-da-view') || 'hd';
        if (state.view === 'chakra') cdTrack('destiny_anatomy_chakra_view', {view: state.view});
        else cdTrack('destiny_anatomy_hd_view', {view: state.view});
        paint();
      } else if (act === 'login') {
        var next = root.location.pathname + root.location.search + '#destinyAnatomyCard';
        if (typeof root.__cdOpenLoginRequiredModal === 'function') root.__cdOpenLoginRequiredModal({reason: 'destiny_anatomy', nextPath: next});
        else root.location.href = '/login/?next=' + encodeURIComponent(next);
      } else if (act === 'ask') {
        askAi(btn.getAttribute('data-da-ai') || 'copy');
      } else if (act === 'share' || act === 'save' || act === 'copy') {
        share(act);
      } else if (act === 'cta') {
        var id = btn.getAttribute('data-da-cta');
        cdTrack('destiny_anatomy_paid_cta_click', {cta: id});
        var target = btn.getAttribute('data-da-scroll');
        if (target) { ev.preventDefault(); scrollToId(target); }
      }
    } catch (e) {
      if (root.console && root.console.warn) root.console.warn('[destiny-anatomy] action failed', act, e);
      showError();
    }
  }

  var chapterOpen = {};
  function onToggle(ev) {
    var d = ev.target;
    if (d && d.matches && d.matches('details[data-da-report]')) {
      if (d.open === state.open) return;
      state.open = d.open;
      if (state.open) { cdTrack('destiny_anatomy_open', {}); loadLayers(); narrate(); fitMeme(); }
      return;
    }
    if (d && d.matches && d.matches('details[data-da-chapter]')) {
      var id = d.getAttribute('data-da-chapter');
      if (d.open && !chapterOpen[id]) cdTrack('destiny_anatomy_chapter_open', {chapter: id});
      chapterOpen[id] = d.open;
      if (d.open) fitMeme();
      return;
    }
    if (d && d.matches && d.matches('details.da-ask__view')) { state.askView = d.open; return; }
    if (!d || !d.matches || !d.matches('details[data-da-engine]') || !d.open) return;
    cdTrack('destiny_anatomy_engine_click', {engine: d.getAttribute('data-da-engine')});
  }

  function wire() {
    card = doc.getElementById('destinyAnatomyCard');
    if (!card) return;
    try { state.variant = pickVariant(root.localStorage); } catch (e) { state.variant = 'A'; }
    card.addEventListener('click', onClick);
    card.addEventListener('toggle', onToggle, true);
    root.addEventListener('scroll', onScroll, {passive: true});
    root.addEventListener('cd:saju-summary-ready', function () { start(); });
    root.addEventListener('cd:locale-ready', function () { if (model) refresh(); });
    if (root.G_PILLARS && root.G_PILLARS.d) start();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', wire);
  else wire();
})(typeof window === 'undefined' ? globalThis : window);
