/* 보관함 "사주 궁합 기록" — 저장된 스냅샷의 목록·열람 시트.
 * 읽기 전용: GET /api/saju-compat-basic/archive(목록)·/archive/:id(상세)만 부른다. 생성(LLM)·결제 호출 없음.
 * 결과 화면과 같은 렌더러(js/saju-compat-render.mjs)로 그려 목록→상세 모양이 결과 화면과 같다.
 * 진입: window.openSajuCompatArchive() — 보관함 시트의 [data-action="openSajuCompatArchive"] 가 이 파일을 지연 로드한 뒤 부른다. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof window.openSajuCompatArchive === 'function') return;

  var SHEET_ID = 'cdSajuCompatArchive';
  var ARCHIVE_PATH = '/api/saju-compat-basic/archive';
  var REQUEST_TIMEOUT_MS = 22000;
  var STYLE_WAIT_MS = 7000;
  var TYPES = ['love', 'business', 'friend'];
  var GRADES = ['S', 'A', 'B', 'C', 'D', 'F'];
  /* 모듈(번역·렌더러)을 못 올렸을 때만 쓰는 최소 문구 — 정상 경로는 sajuCompat.archive.* 키(12개 사전)다. */
  var KO = {
    'sajuCompat.archive.title': '사주 궁합 기록',
    'sajuCompat.archive.loading': '기록을 불러오는 중이에요…',
    'sajuCompat.archive.error': '기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    'sajuCompat.archive.retry': '다시 불러오기',
    'sajuCompat.archive.close': '닫기'
  };

  var sheet = null;
  var bodyEl = null;
  var kit = null;
  var t = null;
  var items = null;
  var run = 0;
  var inflight = null;
  var opening = false;

  function apiBase() {
    try {
      if (window.CODE_DESTINY_API_BASE_URL) return String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, '');
      var custom = localStorage.getItem('fortune_api_base_url');
      if (custom) return String(custom).replace(/\/+$/, '');
    } catch (_) {}
    var host = String(location.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4000';
    if (host.slice(-9) === '.pages.dev') return 'https://code-destiny.com';
    return location.origin;
  }

  function authToken() {
    try { return localStorage.getItem('fortune_auth_token') || ''; } catch (_) { return ''; }
  }

  function makeT(loaded) {
    var translate = typeof window.cdTranslate === 'function'
      ? function (key, vars, fallback) { return window.cdTranslate(key, vars, fallback); }
      : undefined;
    if (loaded) return loaded.render.createSajuCompatT(translate);
    return function (key, vars) {
      var fallback = KO[key] || key;
      return translate ? String(translate(key, vars || {}, fallback)) : fallback;
    };
  }

  function esc(value) {
    if (kit) return kit.render.escapeHtml(value);
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function loadKit() {
    if (typeof window.__cdEnsureSajuCompatModules !== 'function') return Promise.reject(new Error('saju-compat-loader-missing'));
    return window.__cdEnsureSajuCompatModules();
  }

  /* 홈 셸은 전체 CSS(fortune-ui.css)를 첫 사용자 입력 뒤에 늦게 켠다. 딥링크로 열리면 입력이 없으므로 직접 켜고 로드를 기다린다. */
  function ensureStyles() {
    var link = document.querySelector('link[data-cd-noncritical-style-src*="/styles/fortune-ui.css"]');
    if (!link) return Promise.resolve();
    if (link.getAttribute('rel') === 'stylesheet' && link.sheet && link.media !== 'print') return Promise.resolve();
    return new Promise(function (resolve) {
      var done = false;
      var timer = null;
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        link.removeEventListener('load', finish);
        link.removeEventListener('error', finish);
        resolve();
      }
      link.addEventListener('load', finish);
      link.addEventListener('error', finish);
      timer = setTimeout(finish, STYLE_WAIT_MS);
      if (link.getAttribute('rel') !== 'stylesheet') link.setAttribute('rel', 'stylesheet');
      if (!link.getAttribute('href')) link.setAttribute('href', link.getAttribute('data-cd-noncritical-style-src'));
      link.media = 'all';
    });
  }

  function request(path) {
    if (inflight) { try { inflight.abort(); } catch (_) {} }
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    inflight = controller;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, REQUEST_TIMEOUT_MS);
    var headers = {};
    var token = authToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(apiBase() + path, { method: 'GET', credentials: 'include', headers: headers, signal: controller ? controller.signal : undefined })
      .then(function (response) {
        return response.json().then(function (payload) { return payload; }, function () { return {}; })
          .then(function (payload) { return { status: response.status, payload: payload }; });
      })
      .then(function (reply) { clearTimeout(timer); return reply; }, function () {
        clearTimeout(timer);
        return { status: 0, payload: { retryable: true } };
      });
  }

  function ensureSheet() {
    if (sheet && document.body.contains(sheet)) return sheet;
    sheet = document.createElement('dialog');
    sheet.className = 'cd-sheet cd-sheet--all cd-compat-archive';
    sheet.id = SHEET_ID;
    sheet.setAttribute('data-cd-sheet', '');
    sheet.setAttribute('aria-labelledby', SHEET_ID + 'Title');
    sheet.innerHTML = '<div class="cd-sheet__panel"><div class="cd-sheet__head"><h2 id="' + SHEET_ID + 'Title"></h2>'
      + '<button type="button" class="cd-sheet__close" data-cd-sheet-close><span aria-hidden="true">×</span></button></div>'
      + '<div class="cd-sheet__body cd-compat-archive__body" aria-live="polite"></div></div>';
    document.body.appendChild(sheet);
    bodyEl = sheet.querySelector('.cd-compat-archive__body');
    sheet.addEventListener('click', onClick);
    sheet.addEventListener('cd:sheet-close', function () {
      run += 1;
      if (inflight) { try { inflight.abort(); } catch (_) {} inflight = null; }
    });
    return sheet;
  }

  function applyChrome() {
    sheet.querySelector('#' + SHEET_ID + 'Title').textContent = t('sajuCompat.archive.title');
    sheet.querySelector('[data-cd-sheet-close]').setAttribute('aria-label', t('sajuCompat.archive.close'));
  }

  function setBody(html) {
    bodyEl.innerHTML = html;
    bodyEl.scrollTop = 0;
  }

  function focusIn(selector) {
    var el = bodyEl.querySelector(selector);
    if (el && typeof el.focus === 'function') {
      try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
    }
  }

  function lead() {
    return kit ? '<p class="cd-sheet__lead cd-compat-archive__lead">' + esc(t('sajuCompat.archive.lead')) + '</p>' : '';
  }

  function showLoading() {
    setBody('<p class="cd-compat-archive__state" role="status">' + esc(t('sajuCompat.archive.loading')) + '</p>');
  }

  /* kind: login | error | notFound | revoked | unreadable | empty. 상세에서는 목록으로 돌아가는 버튼을 함께 둔다. */
  function showMessage(kind, options) {
    var withBack = !!(options && options.back);
    var html = '<p class="cd-compat-archive__state cd-compat-archive__state--' + kind + '" role="status">' + esc(t('sajuCompat.archive.' + kind)) + '</p>';
    if (kind === 'login') html += '<a class="cd-compat-archive__cta" href="/login/">' + esc(t('sajuCompat.archive.loginCta')) + '</a>';
    if (kind === 'error') html += '<button type="button" class="cd-compat-archive__btn" data-cd-compat-retry>' + esc(t('sajuCompat.archive.retry')) + '</button>';
    if (withBack) html += '<button type="button" class="cd-compat-archive__btn cd-compat-archive__btn--ghost" data-cd-compat-back>' + esc(t('sajuCompat.archive.back')) + '</button>';
    setBody(html);
    focusIn('[data-cd-compat-retry],[data-cd-compat-back],.cd-compat-archive__cta');
  }

  function formatDate(value) {
    var date = new Date(value);
    if (!value || isNaN(date.getTime())) return '';
    var lang = String(document.documentElement.lang || 'ko');
    try { return date.toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' }); } catch (_) { return date.toLocaleDateString(); }
  }

  function renderList(list, focusId) {
    if (!list.length) { setBody(lead()); bodyEl.insertAdjacentHTML('beforeend', '<p class="cd-compat-archive__state cd-compat-archive__state--empty" role="status">' + esc(t('sajuCompat.archive.empty')) + '</p>'); return; }
    var rows = list.map(function (item) {
      var type = TYPES.indexOf(item.compatType) >= 0 ? item.compatType : 'love';
      var name = item.partnerName || '?';
      var date = formatDate(item.createdAt);
      var meta = item.score == null ? t('sajuCompat.archive.itemDate', { date: date }) : t('sajuCompat.archive.itemMeta', { date: date, score: item.score });
      var grade = GRADES.indexOf(item.grade) >= 0 ? '<span class="cd-compat-archive__item-grade">' + esc(t('sajuCompat.grade.' + item.grade)) + '</span>' : '';
      return '<li><button type="button" class="cd-compat-archive__item" data-cd-compat-open="' + esc(item.resultId) + '" aria-label="' + esc(t('sajuCompat.archive.itemAria', { name: name })) + '">'
        + '<span class="cd-compat-archive__item-title">' + esc(t('sajuCompat.archive.itemTitle', { type: t('sajuCompat.type.' + type), name: name })) + '</span>'
        + '<span class="cd-compat-archive__item-meta">' + esc(meta) + '</span>' + grade
        + '<span class="cd-compat-archive__item-open" aria-hidden="true">' + esc(t('sajuCompat.archive.itemOpen')) + '</span></button></li>';
    }).join('');
    setBody(lead() + '<ul class="cd-compat-archive__list">' + rows + '</ul>');
    if (focusId) {
      var buttons = bodyEl.querySelectorAll('[data-cd-compat-open]');
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].getAttribute('data-cd-compat-open') === focusId) { try { buttons[i].focus({ preventScroll: true }); } catch (_) {} break; }
      }
    }
  }

  function loadList() {
    var mine = ++run;
    showLoading();
    return request(ARCHIVE_PATH).then(function (reply) {
      if (mine !== run) return;
      var view = kit.flow.classifySajuCompatArchiveReply(reply, 'list');
      if (view.state === 'list') { items = view.items; renderList(items); return; }
      items = null;
      showMessage(view.state === 'login' ? 'login' : 'error');
    });
  }

  function openDetail(resultId) {
    var mine = ++run;
    showLoading();
    return request(kit.flow.sajuCompatArchiveDetailPath(resultId)).then(function (reply) {
      if (mine !== run) return;
      var view = kit.flow.classifySajuCompatArchiveReply(reply, 'detail');
      if (view.state === 'detail') {
        var html = kit.render.renderSajuCompat(view.result, { t: t, selfName: '' });
        if (!html) { showMessage('unreadable', { back: true }); return; }
        setBody('<div class="cd-compat-archive__detail-head"><button type="button" class="cd-compat-archive__btn cd-compat-archive__btn--ghost" data-cd-compat-back data-cd-compat-focus="' + esc(resultId) + '">'
          + esc(t('sajuCompat.archive.back')) + '</button></div><p class="cd-compat-archive__note">' + esc(t('sajuCompat.archive.detailNote')) + '</p>' + html);
        focusIn('[data-cd-compat-back]');
        return;
      }
      showMessage(view.state, { back: view.state !== 'login' });
      var retry = bodyEl.querySelector('[data-cd-compat-retry]');
      if (retry) retry.setAttribute('data-cd-compat-retry', resultId);
    });
  }

  function onClick(event) {
    var target = event.target && event.target.closest ? event.target : null;
    if (!target || !kit) {
      if (target && target.closest('[data-cd-compat-retry]')) start();
      return;
    }
    var open = target.closest('[data-cd-compat-open]');
    if (open) { openDetail(open.getAttribute('data-cd-compat-open')); return; }
    var retry = target.closest('[data-cd-compat-retry]');
    if (retry) {
      var id = retry.getAttribute('data-cd-compat-retry');
      if (id) openDetail(id); else loadList();
      return;
    }
    var back = target.closest('[data-cd-compat-back]');
    if (back) {
      var focusId = back.getAttribute('data-cd-compat-focus') || '';
      run += 1;
      if (items) renderList(items, focusId); else loadList();
    }
  }

  /* 모듈을 올리고 목록을 읽는다. 모듈이 안 올라오면 최소 문구로 오류와 재시도만 보여 준다. */
  function start() {
    showLoading();
    return loadKit().then(function (loaded) {
      kit = loaded;
      t = makeT(kit);
      applyChrome();
      return loadList();
    }, function (err) {
      console.warn('[SajuCompatArchive] module load failed:', err);
      showMessage('error');
    });
  }

  window.openSajuCompatArchive = function (opener) {
    var anchor = opener && opener.nodeType === 1 ? opener : undefined;
    if (opening || (window.CodeDestinyShellSheet && window.CodeDestinyShellSheet.isOpen(SHEET_ID))) return true;
    if (!window.CodeDestinyShellSheet) return false;
    opening = true;
    items = null;
    var loading = loadKit().then(function (loaded) { return loaded; }, function () { return null; });
    return Promise.all([loading, ensureStyles()]).then(function (results) {
      kit = results[0];
      t = makeT(kit);
      ensureSheet();
      applyChrome();
      window.CodeDestinyShellSheet.open(SHEET_ID, anchor);
      opening = false;
      if (kit) return loadList();
      showMessage('error');
      return undefined;
    }).catch(function (err) {
      opening = false;
      console.warn('[SajuCompatArchive] open failed:', err);
    });
  };
})();
