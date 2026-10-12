/* 사주 종합(section_summary)·대운 풀이(section_daewun) 본문 배달.
   본문은 서버(/api/saju/section)가 계정·프로필 해금을 확인한 뒤에만 만든다.
   이 파일은 요청과 표시만 한다 — 유료 문장·생성기·본문 캐시가 없다. */
(function (root) {
  'use strict';
  var ENDPOINT = '/api/saju/section';
  var TIMEOUT_MS = 20000;
  // 실패 직후 index.html 재시도 루프가 같은 요청을 연달아 보내지 않게 한다(재시도 버튼은 바로 보낸다).
  var FAILED_QUIET_MS = 10000;
  var seq = 0;
  var summary = { key: '', state: '', seq: 0, failedAt: 0 };
  var daewun = { key: '', state: '', seq: 0, row: null };

  function byId(id) { return document.getElementById(id); }
  function profileId() {
    try { return String((root.cdBirthScopeCurrentProfileId && root.cdBirthScopeCurrentProfileId()) || '').trim(); } catch (_) { return ''; }
  }
  function mode() { return document.body && document.body.classList.contains('neo-mode') ? 'neo' : 'pig'; }
  function lang() {
    try { return String((root.cdGetCurrentLanguage && root.cdGetCurrentLanguage()) || 'ko').slice(0, 8); } catch (_) { return 'ko'; }
  }
  // 입력은 js/saju-engine.js 계산이 끝날 때 남기는 스냅샷이다. 프로필이 있으면 서버는 카드의 생년월일·성별만 쓴다.
  function requestBody(featureKey, row) {
    var input = root.__cdSajuSectionInput;
    if (!input || !input.birth) return null;
    var body = {
      featureKey: featureKey, birth: input.birth, gender: input.gender, name: input.name,
      place: input.place, jongDecision: input.jongDecision, mode: mode(), lang: lang()
    };
    var pid = profileId();
    if (pid) body.profileId = pid;
    if (row) body.daewun = { age: Number(row.age), gan: String(row.gan), zhi: String(row.zhi) };
    return body;
  }
  function keyOf(body) { return body ? JSON.stringify(body) : ''; }

  function request(body) {
    var timer;
    if (typeof root._cdAIPromptRequestJson !== 'function') return Promise.reject(new Error('requester unavailable'));
    return Promise.race([
      root._cdAIPromptRequestJson(ENDPOINT, { method: 'POST', cache: 'no-store', body: JSON.stringify(body) }),
      new Promise(function (_, reject) { timer = setTimeout(function () { reject(new Error('timeout')); }, TIMEOUT_MS); })
    ]).then(function (result) { clearTimeout(timer); return result || {}; }, function (error) { clearTimeout(timer); throw error; });
  }
  function delivered(featureKey, data) {
    return data && data.ok === true && data.unlocked === true && data.featureKey === featureKey && typeof data.html === 'string' && data.html.trim();
  }
  function failureText(result) {
    var data = (result && result.payload) || {};
    var status = result && result.status;
    if (status === 401) return '로그인 후 다시 확인해 주세요. 구매한 계정으로 로그인하면 바로 열립니다.';
    if (status === 402) {
      return (data.requiresProfile ? '저장된 내 프로필로 확인해 주세요. ' : '') +
        '이 생년월일의 구매 기록을 찾지 못했어요. 이미 구매했다면 구매한 계정·프로필로 확인해 주세요.';
    }
    if ((status === 400 || status === 403) && data.message) return String(data.message);
    return '풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요. 결제가 다시 진행되지는 않습니다.';
  }
  // 안내·로딩 칸은 data-cd-summary-fallback 표시를 달아 "배달된 본문"으로 세지 않는다(index.html 게이트 latch).
  function statusNode(text, retry) {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-cd-summary-fallback', '1');
    wrap.setAttribute('role', 'status');
    wrap.className = 'cd-saju-section-status';
    wrap.style.cssText = 'padding:20px 16px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;font-size:14px;line-height:1.7;text-align:center;';
    var msg = document.createElement('p');
    msg.style.cssText = 'margin:0;font-weight:700;';
    msg.textContent = text;
    wrap.appendChild(msg);
    if (retry) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'cd-saju-section-retry';
      button.textContent = '다시 불러오기';
      button.style.cssText = 'margin-top:12px;border:0;border-radius:999px;background:#111827;color:#fff;padding:10px 20px;font-weight:800;font-size:14px;cursor:pointer;';
      button.addEventListener('click', function () { button.disabled = true; retry(); });
      wrap.appendChild(button);
    }
    return wrap;
  }
  function show(el, node) { el.replaceChildren(node); }
  function notify(featureKey) {
    try { root.dispatchEvent(new CustomEvent('cd:saju-section-delivered', { detail: { featureKey: featureKey } })); } catch (_) {}
  }
  function hasBody(el) {
    return !!el && !el.querySelector('[data-cd-summary-fallback="1"]') && String(el.textContent || '').trim().length > 0;
  }

  function loadSummary(options) {
    var opts = options || {};
    var el = byId('summaryArea');
    if (!el) return false;
    var body = requestBody('section_summary');
    if (!body) return false;
    var key = keyOf(body);
    if (!opts.force && summary.key === key) {
      if (summary.state === 'loading') {
        if (!el.firstChild) show(el, statusNode('종합 풀이를 불러오고 있어요.'));
        return false;
      }
      if (summary.state === 'done' && hasBody(el)) return true;
      if (summary.state === 'failed' && Date.now() - summary.failedAt < FAILED_QUIET_MS) {
        if (summary.notice && !el.contains(summary.notice)) show(el, summary.notice);
        return false;
      }
    }
    var mine = ++seq;
    summary = { key: key, state: 'loading', seq: mine, failedAt: 0 };
    // 같은 사람의 화면 모드 전환이면 새 본문이 올 때까지 기존 본문을 둔다.
    if (!hasBody(el)) show(el, statusNode('종합 풀이를 불러오고 있어요.'));
    function current() { return summary.seq === mine && keyOf(requestBody('section_summary')) === key; }
    function fail(text) {
      if (!current()) return;
      summary.state = 'failed';
      summary.failedAt = Date.now();
      summary.notice = statusNode(text, function () { loadSummary({ force: true }); });
      show(el, summary.notice);
    }
    request(body).then(function (result) {
      if (!current()) return;
      var data = result.payload || {};
      if (result.ok && delivered('section_summary', data)) {
        summary.state = 'done';
        el.innerHTML = data.html;
        notify('section_summary');
        return;
      }
      fail(failureText(result));
    }, function () { fail(failureText(null)); });
    return false;
  }

  function showDaewun(age, gan, zhi, options) {
    var opts = options || {};
    var detail = byId('dwDetail');
    if (!detail) return;
    var row = { age: Number(age), gan: String(gan), zhi: String(zhi) };
    var body = requestBody('section_daewun', row);
    var mine = ++seq;
    daewun = { key: keyOf(body), state: 'loading', seq: mine, row: row };
    if (!opts.keep) {
      show(detail, statusNode('대운 풀이를 불러오고 있어요.'));
      detail.classList.add('show');
      setTimeout(function () { try { detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {} }, 100);
    }
    function current() { return daewun.seq === mine && keyOf(requestBody('section_daewun', row)) === daewun.key; }
    function fail(text) {
      if (!current()) return;
      daewun.state = 'failed';
      show(detail, statusNode(text, function () { showDaewun(row.age, row.gan, row.zhi); }));
    }
    if (!body) { fail(failureText(null)); return; }
    request(body).then(function (result) {
      if (!current()) return;
      var data = result.payload || {};
      if (result.ok && delivered('section_daewun', data)) {
        daewun.state = 'done';
        detail.innerHTML = data.html;
        detail.classList.add('show');
        try { if (typeof root._bindDaewunDetailTapGuards === 'function') root._bindDaewunDetailTapGuards(); } catch (_) {}
        notify('section_daewun');
        return;
      }
      fail(failureText(result));
    }, function () { fail(failureText(null)); });
  }
  // 화면 모드(연냥이·네오) 전환: 펼친 대운을 새 모드로 다시 받는다.
  function refreshDaewun() {
    var detail = byId('dwDetail');
    if (!daewun.row || !detail || !detail.classList.contains('show')) return;
    showDaewun(daewun.row.age, daewun.row.gan, daewun.row.zhi, { keep: true });
  }

  // 해금이 바뀌면 실패 안내만 다시 받는다. 이미 배달한 본문은 그대로 둔다.
  root.addEventListener('cd:unlocks-changed', function () {
    if (summary.state === 'failed') {
      summary.failedAt = 0;
      try { if (typeof root._cdSajuGateUnlocked !== 'function' || root._cdSajuGateUnlocked('section_summary')) loadSummary(); } catch (_) {}
    }
    if (daewun.state === 'failed') refreshDaewun();
  });

  root.CdSajuSectionClient = { loadSummary: loadSummary, showDaewun: showDaewun, refreshDaewun: refreshDaewun };
})(window);
