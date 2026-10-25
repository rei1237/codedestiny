/* 사주 종합(section_summary)·대운 풀이(section_daewun)·퀀텀 명리 엔진(rpt_quantumCard)·
   극T 관계 회로(sukuyo-extreme-t-relationship)·숙요 인연 도감(sukuyo-relationship-encyclopedia)·
   숙요 본성 심화 해석(sukuyo-nature-deep-dive)·숙요 기본/정밀 궁합(compat-sukuyo-compatibility·premium-sukuyo-compat-extra, 회당 결제)·
   리포트 대시보드 유료 카드(CARDS)·자미두수 명반 상세 유료 장(loadZiwei) 본문 배달.
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
  var quantum = { key: '', state: '', seq: 0, failedAt: 0, quiet: false };
  var extremeT = { key: '', state: '', seq: 0, area: null, options: null, timer: 0 };
  var EXTREME_T_KEY = 'sukuyo-extreme-t-relationship';
  var encyclopedia = { key: '', state: '', seq: 0, host: null, input: null, options: null, timer: 0, node: null, notice: null };
  var ENCYCLOPEDIA_KEY = 'sukuyo-relationship-encyclopedia';
  var nature = { key: '', state: '', seq: 0, host: null, options: null, timer: 0, node: null, notice: null };
  var NATURE_KEY = 'sukuyo-nature-deep-dive';
  // 이용권 결제 직후에는 화면이 먼저 열리고 서버 기록은 뒤에서 쓴다(index.html _cdMembershipPassRecordDelays 와 같은 간격).
  // 그 사이 402 가 오면 바로 '구매 기록 없음'을 띄우지 않고 이 간격으로 다시 묻는다(극T·인연 도감).
  var PASS_RECORD_RETRY_MS = [4000, 12000, 30000];

  function byId(id) { return document.getElementById(id); }
  function profileId() {
    try { return String((root.cdBirthScopeCurrentProfileId && root.cdBirthScopeCurrentProfileId()) || '').trim(); } catch (_) { return ''; }
  }
  // 2026-10-13: 풀이 화자(연이/영냥이)는 라이트·다크 테마와 따로 cdSajuPersonaV1 에 둔다.
  // 'neo' 는 영냥이의 내부 값이다 — 서버 API·패리티 픽스처가 이 이름을 쓴다.
  function mode() { try { return root.localStorage.getItem('cdSajuPersonaV1') === 'neo' ? 'neo' : 'pig'; } catch (_) { return 'pig'; } }
  function lang() {
    try { return String((root.cdGetCurrentLanguage && root.cdGetCurrentLanguage()) || 'ko').slice(0, 8); } catch (_) { return 'ko'; }
  }
  // 입력은 js/saju-engine.js 계산이 끝날 때 남기는 스냅샷이다. 프로필이 있으면 서버는 카드의 생년월일·성별만 쓴다.
  function requestBody(featureKey, row) {
    var input = root.__cdSajuSectionInput;
    if (!input || !input.birth) return null;
    var body = {
      featureKey: featureKey, birth: input.birth, gender: input.gender, name: input.name,
      place: input.place, mode: mode(), lang: lang()
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
        if (!el.firstChild) show(el, statusNode('라이트 사주 풀이를 불러오고 있어요.'));
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
    if (!hasBody(el)) show(el, statusNode('라이트 사주 풀이를 불러오고 있어요.'));
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
        if (lang() === 'ko' && root.SajuReadingRich) root.SajuReadingRich.decorateDelivered(el, null, root.G_PILLARS);
        if (lang() === 'ko') {
          var next = document.createElement('aside'); next.className = 'cd-saju-expert-next';
          next.innerHTML = '<h3>내 성향을 알았다면, 지금의 고민을 풀어볼 차례예요.</h3><p>이직할지 남을지, 관계에서 무엇을 바꿀지. 사주 전문가 AI 상담은 내 질문과 현재 상황을 바탕으로 판단 근거와 실천 방향을 더 구체적으로 짚어드려요.</p><p>질문에 대한 핵심 답변 · 현재 고민과 명식의 연결 · 선택 전략 · 30일 실천 가이드</p><a href="#sajuConsultationEntry">내 고민으로 전문가 상담하기</a>';
          next.querySelector('a').addEventListener('click', function (event) {
            var entry = document.querySelector('[data-consultation-open]');
            if (entry) { event.preventDefault(); entry.click(); }
          });
          el.appendChild(next);
        }
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
        if (lang() === 'ko' && root.SajuReadingRich) root.SajuReadingRich.decorateDelivered(detail, row, root.G_PILLARS);
        detail.classList.add('show');
        try { if (typeof root._bindDaewunDetailTapGuards === 'function') root._bindDaewunDetailTapGuards(); } catch (_) {}
        notify('section_daewun');
        return;
      }
      fail(failureText(result));
    }, function () { fail(failureText(null)); });
  }
  // 퀀텀 명리 엔진: 카드를 열 때(또는 AI 프롬프트가 해금 본문을 찾을 때) 받는다.
  // 받기 전에는 무료 스텁(renderQuantumStrategyStub)이 그대로 남는다. quiet 요청은 스텁을 덮지 않는다.
  function loadQuantum(options) {
    var opts = options || {};
    var area = byId('quantumSection');
    var card = byId('quantumCard');
    if (!area || !card) return false;
    var body = requestBody('rpt_quantumCard');
    if (!body) return false;
    var key = keyOf(body);
    if (!opts.force && quantum.key === key) {
      if (quantum.state === 'done' && hasBody(area)) return true;
      if (quantum.state === 'loading') return false;
      if (quantum.state === 'failed' && opts.quiet && Date.now() - quantum.failedAt < FAILED_QUIET_MS) return false;
    }
    var mine = ++seq;
    quantum = { key: key, state: 'loading', seq: mine, failedAt: 0, quiet: !!opts.quiet };
    if (!opts.quiet) {
      show(area, statusNode('퀀텀 명리 엔진을 불러오고 있어요.'));
      card.style.display = 'block';
    }
    function current() { return quantum.seq === mine && keyOf(requestBody('rpt_quantumCard')) === key; }
    function fail(text) {
      if (!current()) return;
      quantum.state = 'failed';
      quantum.failedAt = Date.now();
      if (!opts.quiet) show(area, statusNode(text, function () { loadQuantum({ force: true }); }));
    }
    request(body).then(function (result) {
      if (!current()) return;
      var data = result.payload || {};
      if (result.ok && delivered('rpt_quantumCard', data)) {
        quantum.state = 'done';
        area.innerHTML = data.html;
        card.style.display = 'block';
        root.__cdQuantumRendered = true;
        notify('rpt_quantumCard');
        return;
      }
      fail(failureText(result));
    }, function () { fail(failureText(null)); });
    return false;
  }

  // 극T 관계 회로: 무료 카드(renderTTest)가 비워 둔 자리 3곳(main·sajuBase·prescription)을 서버 본문으로 채운다.
  // 해금 여부는 서버가 다시 확인한다 — 화면의 해금 표시만으로는 본문이 오지 않는다.
  // 안내 칸은 어두운 숙요 화면용이다(극T·인연 도감).
  function extremeTStatus(text, retry) {
    var node = statusNode(text, retry);
    node.style.cssText = 'grid-column:1/-1;padding:18px 16px;border-radius:14px;background:rgba(15,23,42,0.55);border:1px solid rgba(148,163,184,0.35);color:#e2e8f0;font-size:14px;line-height:1.7;text-align:center;';
    return node;
  }
  function recentPassGrant(featureKey) {
    try { return typeof root.syRecentPaidGateAccess === 'function' && !!root.syRecentPaidGateAccess(featureKey); } catch (_) { return false; }
  }
  function loadExtremeT(area, options) {
    var opts = options || {};
    if (!area) return false;
    var main = area.querySelector('[data-sy-extreme-t-slot="main"]');
    if (!main) return false;
    var body = requestBody(EXTREME_T_KEY);
    clearTimeout(extremeT.timer);
    var mine = ++seq;
    extremeT = { key: keyOf(body), state: 'loading', seq: mine, area: area, options: opts, timer: 0 };
    show(main, extremeTStatus('해금된 극T 풀이를 불러오고 있어요.'));
    function current() { return extremeT.seq === mine && extremeT.area === area && area.isConnected !== false && area.contains(main); }
    function fail(text) {
      if (!current()) return;
      extremeT.state = 'failed';
      show(main, extremeTStatus(text, function () { loadExtremeT(area, opts); }));
    }
    function attempt(tries) {
      request(body).then(function (result) {
        if (!current()) return;
        var data = result.payload || {};
        if (result.ok && delivered(EXTREME_T_KEY, data)) {
          extremeT.state = 'done';
          main.innerHTML = data.html;
          var sajuSlot = area.querySelector('[data-sy-extreme-t-slot="sajuBase"]');
          if (sajuSlot) sajuSlot.outerHTML = typeof data.sajuBaseHtml === 'string' ? data.sajuBaseHtml : '';
          var prescriptionSlot = area.querySelector('[data-sy-extreme-t-slot="prescription"]');
          if (prescriptionSlot) prescriptionSlot.outerHTML = typeof data.prescriptionHtml === 'string' ? data.prescriptionHtml : '';
          notify(EXTREME_T_KEY);
          try { if (typeof opts.onDelivered === 'function') opts.onDelivered(); } catch (_) {}
          return;
        }
        var status = result && result.status;
        var retryable = (status === 402 && recentPassGrant(EXTREME_T_KEY)) || !status || status >= 500;
        if (retryable && tries < PASS_RECORD_RETRY_MS.length) {
          extremeT.state = 'waiting';
          extremeT.timer = setTimeout(function () { if (current()) attempt(tries + 1); }, PASS_RECORD_RETRY_MS[tries]);
          return;
        }
        fail(failureText(result));
      }, function () {
        if (!current()) return;
        if (tries < PASS_RECORD_RETRY_MS.length) {
          extremeT.state = 'waiting';
          extremeT.timer = setTimeout(function () { if (current()) attempt(tries + 1); }, PASS_RECORD_RETRY_MS[tries]);
          return;
        }
        fail(failureText(null));
      });
    }
    if (!body) { fail(failureText(null)); return false; }
    attempt(0);
    return false;
  }

  // 숙요 인연 도감: 해금 화면의 27숙 전체를 서버 본문으로 채운다. 무료 미리보기(5숙)는 화면이 직접 그린다.
  // 도감은 사주 원국을 쓰지 않는다 — 화면이 그린 본명숙·이름만 보낸다(input = syBindSukuyoEncyclopedia 의 buildInput()).
  function encyclopediaBody(input) {
    var body = {
      featureKey: ENCYCLOPEDIA_KEY, lang: lang(),
      encyclopedia: { userName: String(input.userName || ''), userMansionIdx: Number(input.userMansionIdx), userMansion: String(input.userMansion || '') }
    };
    var pid = profileId();
    if (pid) body.profileId = pid;
    return body;
  }
  function loadEncyclopedia(host, input, options) {
    var opts = options || {};
    if (!host || !input) return false;
    var body = encyclopediaBody(input);
    var key = keyOf(body);
    // 같은 요청이 진행 중이거나 이미 배달한 본문이 그대로 있으면 다시 묻지 않는다(잠금 해제 이벤트가 여러 번 올 수 있다).
    if (!opts.force && encyclopedia.key === key && encyclopedia.host === host) {
      if (encyclopedia.state === 'loading' || encyclopedia.state === 'waiting') {
        if (encyclopedia.notice && !host.contains(encyclopedia.notice)) show(host, encyclopedia.notice);
        return false;
      }
      if (encyclopedia.state === 'done' && encyclopedia.node && host.contains(encyclopedia.node)) return true;
    }
    clearTimeout(encyclopedia.timer);
    var mine = ++seq;
    var notice = extremeTStatus('해금된 숙요 인연 도감을 불러오고 있어요.');
    encyclopedia = { key: key, state: 'loading', seq: mine, host: host, input: input, options: opts, timer: 0, node: null, notice: notice };
    show(host, notice);
    function current() { return encyclopedia.seq === mine && host.isConnected !== false; }
    function fail(text) {
      if (!current()) return;
      encyclopedia.state = 'failed';
      encyclopedia.notice = null;
      show(host, extremeTStatus(text, function () { loadEncyclopedia(host, input, Object.assign({}, opts, { force: true })); }));
      try { if (typeof opts.onFailed === 'function') opts.onFailed(text); } catch (_) {}
    }
    function later(tries) {
      encyclopedia.state = 'waiting';
      encyclopedia.timer = setTimeout(function () { if (current()) attempt(tries + 1); }, PASS_RECORD_RETRY_MS[tries]);
    }
    function attempt(tries) {
      request(body).then(function (result) {
        if (!current()) return;
        var data = result.payload || {};
        if (result.ok && delivered(ENCYCLOPEDIA_KEY, data)) {
          encyclopedia.state = 'done';
          encyclopedia.notice = null;
          host.innerHTML = data.html;
          encyclopedia.node = host.firstElementChild;
          notify(ENCYCLOPEDIA_KEY);
          try { if (typeof opts.onDelivered === 'function') opts.onDelivered(); } catch (_) {}
          return;
        }
        var status = result && result.status;
        var retryable = (status === 402 && recentPassGrant(ENCYCLOPEDIA_KEY)) || !status || status >= 500;
        if (retryable && tries < PASS_RECORD_RETRY_MS.length) { later(tries); return; }
        fail(failureText(result));
      }, function () {
        if (!current()) return;
        if (tries < PASS_RECORD_RETRY_MS.length) { later(tries); return; }
        fail(failureText(null));
      });
    }
    attempt(0);
    return false;
  }

  // 숙요 본성 심화 해석: 본명숙은 서버가 출생 정보로 다시 계산한다 — 화면의 본명숙·달 황경은 보내지 않는다.
  // 출생 정보는 사주 계산 스냅샷(__cdSajuSectionInput)을, 없으면 숙요 화면이 넘긴 출생 순간(options.birth·place)을 쓴다.
  // 프로필이 있으면 서버는 그 카드의 생년월일만 쓴다.
  function natureBody(opts) {
    var input = root.__cdSajuSectionInput;
    var body = { featureKey: NATURE_KEY, lang: lang() };
    if (input && input.birth) { body.birth = input.birth; body.place = input.place; body.gender = input.gender; }
    else { if (opts.birth) body.birth = opts.birth; if (opts.place) body.place = opts.place; }
    var pid = profileId();
    if (pid) body.profileId = pid;
    return body;
  }
  function loadNatureDeepDive(host, options) {
    var opts = options || {};
    if (!host) return false;
    var body = natureBody(opts);
    var key = keyOf(body);
    if (!opts.force && nature.key === key && nature.host === host) {
      if (nature.state === 'loading' || nature.state === 'waiting') {
        if (nature.notice && !host.contains(nature.notice)) show(host, nature.notice);
        return false;
      }
      if (nature.state === 'done' && nature.node && host.contains(nature.node)) return true;
    }
    clearTimeout(nature.timer);
    var mine = ++seq;
    var notice = extremeTStatus('해금된 본성 심화 해석을 불러오고 있어요.');
    nature = { key: key, state: 'loading', seq: mine, host: host, options: opts, timer: 0, node: null, notice: notice };
    show(host, notice);
    function current() { return nature.seq === mine && host.isConnected !== false; }
    function fail(text) {
      if (!current()) return;
      nature.state = 'failed';
      nature.notice = null;
      show(host, extremeTStatus(text, function () { loadNatureDeepDive(host, Object.assign({}, opts, { force: true })); }));
      try { if (typeof opts.onFailed === 'function') opts.onFailed(text); } catch (_) {}
    }
    function later(tries) {
      nature.state = 'waiting';
      nature.timer = setTimeout(function () { if (current()) attempt(tries + 1); }, PASS_RECORD_RETRY_MS[tries]);
    }
    function attempt(tries) {
      request(body).then(function (result) {
        if (!current()) return;
        var data = result.payload || {};
        if (result.ok && delivered(NATURE_KEY, data)) {
          nature.state = 'done';
          nature.notice = null;
          host.innerHTML = data.html;
          nature.node = host.firstElementChild;
          notify(NATURE_KEY);
          try { if (typeof opts.onDelivered === 'function') opts.onDelivered(data); } catch (_) {}
          return;
        }
        var status = result && result.status;
        var retryable = (status === 402 && recentPassGrant(NATURE_KEY)) || !status || status >= 500;
        if (retryable && tries < PASS_RECORD_RETRY_MS.length) { later(tries); return; }
        fail(failureText(result));
      }, function () {
        if (!current()) return;
        if (tries < PASS_RECORD_RETRY_MS.length) { later(tries); return; }
        fail(failureText(null));
      });
    }
    attempt(0);
    return false;
  }

  // 숙요 기본 궁합·정밀 궁합 확장(회당 결제). 서버가 이번 결제(게이트 requestId)를 확인하고 두 사람의 수(宿)를
  // 출생 정보로 다시 계산해 본문을 만든다 — 결제 1건 = 상대 조합 1건(서버가 조합까지 묶는다).
  // opts: { featureKey, access(게이트 기록: profileId·requestId·accessMethod), partner{date,calType,hour,minute,gender},
  //         birth·place·gender(사주 계산 스냅샷이 없을 때 쓸 내 출생 순간) }. 받은 payload 로 resolve, 실패 문구(error.status)로 reject.
  var COMPAT_KEYS = { 'compat-sukuyo-compatibility': 'html', 'premium-sukuyo-compat-extra': 'precisionHtml' };
  function loadSukuyoCompat(options) {
    var opts = options || {};
    var featureKey = String(opts.featureKey || '');
    var field = COMPAT_KEYS[featureKey];
    if (!field) return Promise.reject(new Error('지원하지 않는 항목입니다.'));
    var input = root.__cdSajuSectionInput;
    var access = opts.access && typeof opts.access === 'object' ? opts.access : null;
    var body = { featureKey: featureKey, lang: lang(), partner: opts.partner || {} };
    if (input && input.birth) { body.birth = input.birth; body.place = input.place; body.gender = input.gender; }
    else { if (opts.birth) body.birth = opts.birth; if (opts.place) body.place = opts.place; body.gender = opts.gender; }
    // 결제한 그 카드·requestId 로 묻는다. 게이트 기록이 없으면(관리자 우회 등) 현재 카드로 묻고 서버가 예전 고정값으로 찾는다.
    var pid = access && access.requestId ? String(access.profileId || '') : profileId();
    if (pid) body.profileId = pid;
    if (access && access.requestId) body.requestId = String(access.requestId);
    if (access && access.accessMethod) body.accessMethod = String(access.accessMethod);
    return requestPerUse(body, featureKey, field);
  }

  // 회당 결제 본문 요청. 이용권 기록이 늦게 붙는 402·5xx·네트워크 오류는 같은 결제로 몇 번 다시 묻는다(재결제 없음).
  function requestPerUse(body, featureKey, field) {
    return new Promise(function (resolve, reject) {
      // status: 0 = 네트워크·시간 초과. 화면은 5xx·0 이면 같은 결제로 다시 묻게 한다(재결제 없음).
      function failWith(text, status) { var error = new Error(text); error.status = status || 0; reject(error); }
      function attempt(tries) {
        request(body).then(function (result) {
          var data = result.payload || {};
          if (result.ok && data.ok === true && data.unlocked === true && data.featureKey === featureKey && typeof data[field] === 'string' && data[field].trim()) {
            notify(featureKey);
            resolve(data);
            return;
          }
          var status = result && result.status;
          var retryable = (status === 402 && recentPassGrant(featureKey)) || !status || status >= 500;
          if (retryable && tries < PASS_RECORD_RETRY_MS.length) { setTimeout(function () { attempt(tries + 1); }, PASS_RECORD_RETRY_MS[tries]); return; }
          if (status === 409 && data.message) { failWith(String(data.message), status); return; }
          if (status === 402) { failWith('이번 궁합 결제 기록을 찾지 못했어요. 결제가 끝났다면 잠시 후 다시 시도해 주세요.', status); return; }
          failWith(failureText(result), status);
        }, function () {
          if (tries < PASS_RECORD_RETRY_MS.length) { setTimeout(function () { attempt(tries + 1); }, PASS_RECORD_RETRY_MS[tries]); return; }
          failWith(failureText(null), 0);
        });
      }
      attempt(0);
    });
  }

  // 자미두수 궁합(회당 결제). 서버가 이번 결제(게이트 requestId)를 확인하고 내 명반(자미 모달 입력)과 상대 입력으로
  // 리포트를 만든다 — 결제 1건 = 내 출생·상대 조합 1건(서버가 조합까지 묶는다).
  // opts: { access(게이트 기록: profileId·requestId·accessMethod), partner{date,time,gender,city{name,timezone,longitude,latitude,baseTzOffset}} }.
  // 받은 payload(html·correctionMsg·correctedTime·archive·llm …)로 resolve, 실패 문구(error.status)로 reject.
  function loadZiweiCompat(options) {
    var opts = options || {};
    var featureKey = 'compat-ziwei-compatibility';
    var body = ziweiBody(featureKey);
    if (!body) {
      var missing = new Error('내 명반 정보가 없어 궁합 계산을 진행할 수 없습니다.');
      missing.status = 400;
      return Promise.reject(missing);
    }
    delete body.mode;
    body.partner = opts.partner || {};
    var access = opts.access && typeof opts.access === 'object' ? opts.access : null;
    if (access && access.requestId) {
      if (access.profileId) body.profileId = String(access.profileId); else delete body.profileId;
      body.requestId = String(access.requestId);
      if (access.accessMethod) body.accessMethod = String(access.accessMethod);
    }
    return requestPerUse(body, featureKey, 'html');
  }

  // ── 리포트 대시보드 유료 카드 ──
  // 카드를 열 때 받는다. 받기 전에는 무료 스텁(data-cd-summary-fallback 표시)이 그대로 남는다.
  // area·card: 본문 칸과 카드 id. loading: 받는 동안의 안내. extra·delivered: 카드별 요청 보탬과 배달 뒤 처리.
  var CARDS = {
    rpt_energyCoordCard: {
      area: 'energyCoordSection', card: 'energyCoordCard', styleId: 'energyRouletteStyles',
      loading: '에너지 원정 리포트를 불러오고 있어요.',
      extra: function (body) { body.energy = { recent: readIds(ENERGY_RECENT_KEY, 60) }; },
      delivered: function (area, data, body) { energyDelivered(area, data, body); }
    },
    rpt_villainCard: {
      area: 'villainResult', card: 'villainCard', styleId: 'villainDossierStyleV20260612',
      loading: '요주의 빌런 블랙리스트를 불러오고 있어요.',
      delivered: function (area) { bindVillainResult(area); }
    },
    rpt_healthReportCard: {
      area: 'healthReportSection', card: 'healthReportCard', styleId: 'cd-health-r2-fonts',
      loading: '명리 헬스 리포트를 불러오고 있어요.',
      delivered: function (area) { healthDelivered(area); }
    },
    // 나의 매력 클래스: 카드 틀(#specialCharmCard)은 js/saju-engine.js renderSpecialCharm 이 깔고, 본문은 그 안 칸에 들어간다.
    rpt_specialCharmCard: {
      area: 'specialCharmBody', card: 'specialCharmCard',
      loading: '나의 매력 클래스를 불러오고 있어요.'
    },
    // 인생 스킬 트리: 시트 스타일과 무료 스텁(#skillTreeBody)은 js/saju-engine.js renderSkillTree 가 깔고, 그 아래 퀘스트 칸은
    // js/entertain-engine.js 오버라이드가 붙인다. 서버 본문(클래스 시트)은 스텁 칸에만 들어가 퀘스트 칸을 지우지 않는다.
    rpt_skillTreeCard: {
      area: 'skillTreeBody', card: 'skillTreeCard', styleId: 'cd-skilltree-rpg-style-v20260613',
      loading: '인생 스킬 트리를 불러오고 있어요.',
      delivered: function () { skillTreeDelivered(); }
    }
  };
  var cards = {};
  function readIds(key, max) {
    try {
      var parsed = JSON.parse(root.localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed.filter(function (id) { return typeof id === 'string'; }).slice(0, max) : [];
    } catch (_) { return []; }
  }
  function writeIds(key, ids) {
    try { if (Array.isArray(ids)) root.localStorage.setItem(key, JSON.stringify(ids)); } catch (_) {}
  }
  function ensureStyle(id, css) {
    if (!id || !css || byId(id)) return;
    var style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
  function loadCard(featureKey, options) {
    var spec = CARDS[featureKey];
    if (!spec) return false;
    var opts = options || {};
    var area = byId(spec.area);
    var card = byId(spec.card);
    if (!area || !card) return false;
    // 같은 사람·같은 화면 설정이면 같은 요청이다(카드별 보탬은 배달 뒤 바뀌므로 키에 넣지 않는다).
    var key = keyOf(requestBody(featureKey));
    if (!key) return false;
    var st = cards[featureKey];
    if (!opts.force && st && st.key === key) {
      if (st.state === 'done' && hasBody(area)) return true;
      if (st.state === 'loading') return false;
      if (st.state === 'failed' && opts.quiet && Date.now() - st.failedAt < FAILED_QUIET_MS) return false;
    }
    var body = requestBody(featureKey);
    if (spec.extra) spec.extra(body);
    var mine = ++seq;
    cards[featureKey] = st = { key: key, state: 'loading', seq: mine, failedAt: 0, quiet: !!opts.quiet };
    // 모바일 지연 하이드레이션(js/mobile-performance-bootstrap.js)이 캐시해 둔 스텁으로 본문을 되덮지 않게 한다.
    if (card.dataset) card.dataset.lazyHydrated = '1';
    if (!opts.quiet) {
      show(area, statusNode(spec.loading));
      card.style.display = 'block';
    }
    function current() { return cards[featureKey] === st && keyOf(requestBody(featureKey)) === key; }
    function fail(text) {
      if (!current()) return;
      st.state = 'failed';
      st.failedAt = Date.now();
      if (!opts.quiet) show(area, statusNode(text, function () { loadCard(featureKey, { force: true }); }));
    }
    request(body).then(function (result) {
      if (!current()) return;
      var data = result.payload || {};
      if (result.ok && delivered(featureKey, data)) {
        st.state = 'done';
        ensureStyle(spec.styleId, data.css);
        area.innerHTML = data.html;
        card.style.display = 'block';
        if (card.dataset) card.dataset.lazyHydrated = '1';
        if (spec.delivered) spec.delivered(area, data, body);
        notify(featureKey);
        return;
      }
      fail(failureText(result));
    }, function () { fail(failureText(null)); });
    return false;
  }

  // 인생 스킬 트리: 시트가 들어와 카드 길이가 바뀌었으니 대시보드 카드 높이를 다시 맞춘다
  // (원본 js/entertain-engine.js syncRpgLayoutHeight 와 같은 시점 — 바로, 120ms, 420ms 뒤).
  function skillTreeDelivered() {
    var card = byId('skillTreeCard');
    if (!card || typeof root.syncReportHeightFromNode !== 'function') return;
    root.syncReportHeightFromNode(card);
    setTimeout(function () { root.syncReportHeightFromNode(card); }, 120);
    setTimeout(function () { root.syncReportHeightFromNode(card); }, 420);
  }

  // 명리 헬스 리포트: 장(<details>)을 펼칠 때 대시보드 카드 높이를 다시 맞춘다.
  // 원본(js/entertain-engine.js renderHealthReport 오버라이드·bindHealthChapterHeightSync)의 연결 코드 그대로다(w → root).
  function healthDelivered(area) {
    var card = byId('healthReportCard');
    bindHealthChapterHeightSync(area, card);
    if (typeof root.syncReportHeightFromNode === 'function') {
      root.syncReportHeightFromNode(card);
      setTimeout(function () { root.syncReportHeightFromNode(card); }, 240);
    }
  }
  // reportDashboard 의 MutationObserver 는 attributeFilter 가 ['style','class'] 라 <details> 의
  // open 속성 변경을 보지 못하고, ResizeObserver 하나만 안전망으로 남는다. 그 사각지대를 직접 메운다.
  function bindHealthChapterHeightSync(area, card) {
    if (!area || !card || typeof area.querySelectorAll !== 'function') return;
    var chapters = area.querySelectorAll('details.cd-health-chapter');
    if (!chapters || !chapters.length) return;
    Array.prototype.forEach.call(chapters, function (chapter) {
      chapter.addEventListener('toggle', function () {
        if (typeof root.syncReportHeightFromNode !== 'function') return;
        root.syncReportHeightFromNode(card);
        setTimeout(function () { root.syncReportHeightFromNode(card); }, 240);
      });
    });
  }

  // 요주의 빌런 블랙리스트: 긴급 차단 멘트 복사·관계 방어 자가진단 버튼. 원본(renderVillain)의 연결 코드 그대로다.
  function bindVillainResult(resultArea) {
    resultArea.querySelectorAll('[data-villain-copy]').forEach(function(copyBtn) {
      copyBtn.onclick = function() {
        var text = copyBtn.getAttribute('data-copy-text') || '';
        var done = function() {
          var prev = copyBtn.textContent;
          copyBtn.textContent = '복사 완료';
          copyBtn.classList.add('is-copied');
          setTimeout(function() {
            copyBtn.textContent = prev;
            copyBtn.classList.remove('is-copied');
          }, 1300);
        };
        if (typeof window.copyToClipboard === 'function') {
          window.copyToClipboard(text, '긴급 차단 멘트를 복사했어요.');
          done();
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (_e) {}
            document.body.removeChild(ta);
          });
          return;
        }
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (_e) {}
        document.body.removeChild(ta);
      };
    });

    resultArea.querySelectorAll('.villain-submit-btn').forEach(function(submitBtn) {
      submitBtn.onclick = function() {
        var wrap = submitBtn.closest ? submitBtn.closest('.villain-checklist-wrap') : null;
        var feedbackEl = wrap ? wrap.querySelector('.villain-feedback') : null;
        if (!wrap || !feedbackEl) return;
        var checks = wrap.querySelectorAll('.villain-check-input');
        var checked = 0;
        checks.forEach(function(chk) { if (chk.checked) checked += 1; });

        var msg = '';
        var gradeCls = 'mid';
        if (checked >= 4) {
          gradeCls = 'good';
          msg = '방어선이 꽤 안정적입니다. (' + checked + '/5) 지금처럼 기준을 문자와 행동으로 남기면 관계 피로를 크게 줄일 수 있어요.';
        } else if (checked >= 2) {
          gradeCls = 'mid';
          msg = '경계선이 흔들릴 수 있는 구간입니다. (' + checked + '/5) 즉답을 줄이고, 부탁·돈·감정 요구는 하루 뒤 다시 판단하세요.';
        } else {
          gradeCls = 'danger';
          msg = '지금은 관계 방어 매뉴얼을 먼저 켜야 합니다. (' + checked + '/5) 연락 빈도를 낮추고, 돈·시간·감정 노동의 한도를 다시 세우세요.';
        }

        feedbackEl.classList.remove('is-show', 'is-good', 'is-mid', 'is-danger');
        feedbackEl.innerHTML = '<strong>자가진단 결과</strong><br>' + msg;
        feedbackEl.classList.add('is-show', 'is-' + gradeCls);

        // 모바일에서 피드백 박스 하단이 가려지지 않도록 안전하게 스크롤 보정
        setTimeout(async function() {
          try {
            feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch (_e) {}
        }, 30);
      };
    });
  }

  // 에너지 원정 리포트: 최근에 보여 준 여행지(화면 중복 방지)와 프로필별 룰렛 당첨 기록은 이 브라우저에 둔다.
  // 룰렛 추첨은 서버가 같은 화면(같은 요청 본문·같은 renderedAt)을 다시 만들어 회차만큼 돌린다 — 회전 각도가 회차에 달려 있다.
  // 당첨은 원본처럼 Math.random 이고, 당첨 기록은 마지막 회차만 이 브라우저의 기록(요청 값)에 더해 돌려준다.
  var ENERGY_RECENT_KEY = 'energyCoordRecentDestinationsV1';
  var energy = null;
  function hashEnergyRouletteKey(raw){
    var str=String(raw||'anonymous');
    var h=2166136261;
    for(var idx=0;idx<str.length;idx++){
      h^=str.charCodeAt(idx);
      h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);
    }
    return (h>>>0).toString(36);
  }
  // 원본(renderEnergyCoord)의 저장 키 그대로 — 서버 이전 전에 쌓인 룰렛 기록을 이어 쓴다.
  function getEnergyRouletteStorageKey(){
    var raw='';
    try{
      var manager=root.DestinyProfileManager&&root.DestinyProfileManager.storage;
      var current=manager&&typeof manager.current==='function'?manager.current():null;
      if(current&&current.id)raw='profile|'+current.id;
    }catch(_e){}
    if(!raw){
      try{
        var active=root.__cdActiveBirthProfile||{};
        var b=active.birth||{};
        var activeGender=(typeof GENDER!=='undefined'?GENDER:'')||((typeof root!=='undefined'&&root._gender)||'');
        raw=['birth',b.year||'',b.month||'',b.day||'',b.hour||'',b.minute||'',active.gender||activeGender].join('|');
      }catch(_e2){}
    }
    if(!raw){
      var birthDate=(byId('birthDate')||{}).value||'';
      var birthHour=(byId('birthHour')||{}).value||'';
      var birthMinute=(byId('birthMinute')||{}).value||'';
      var safeGender=(typeof GENDER!=='undefined'?GENDER:'')||((typeof root!=='undefined'&&root._gender)||'');
      raw=['form',birthDate,birthHour,birthMinute,safeGender].join('|');
    }
    return 'code-destiny-energy-roulette-'+hashEnergyRouletteKey(raw);
  }
  function energyDelivered(area, data, body) {
    var info = data.energy || {};
    writeIds(ENERGY_RECENT_KEY, info.recent);
    energy = { area: area, body: body, renderedAt: String(info.renderedAt || ''), spin: 0, busy: false, storageKey: getEnergyRouletteStorageKey() };
    if (area.__cdEnergyRouletteBound) return;
    area.__cdEnergyRouletteBound = true;
    area.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('[data-energy-roulette-mode],[data-energy-roulette-reroll]') : null;
      if (!target || !area.contains(target)) return;
      spinEnergyRoulette(target.getAttribute('data-energy-roulette-mode') || target.getAttribute('data-energy-roulette-reroll') || 'mixed');
    });
  }
  function spinEnergyRoulette(mode) {
    var s = energy;
    if (!s || s.busy || !s.area.contains(byId('energyRouletteCard'))) return;
    var roulette = byId('energyRouletteCard');
    var wheel = byId('energyRouletteWheel');
    var deck = byId('energyRouletteDeck');
    var result = byId('energyRouletteResult');
    var buttons = roulette.querySelectorAll('[data-energy-roulette-mode]');
    var spin = s.spin + 1;
    function setButtons(disabled) {
      Array.prototype.forEach.call(buttons, function (row) { row.disabled = disabled; row.style.opacity = disabled ? '.72' : '1'; });
    }
    function finish() {
      s.busy = false;
      if (wheel) wheel.classList.remove('is-spinning');
      if (deck) deck.classList.remove('is-shuffling');
      setButtons(false);
    }
    s.busy = true;
    if (wheel) wheel.classList.add('is-spinning');
    if (deck) deck.classList.add('is-shuffling');
    setButtons(true);
    var body = JSON.parse(JSON.stringify(s.body));
    body.energy.renderedAt = s.renderedAt;
    body.energy.roulette = { mode: mode, spin: spin, recent: readIds(s.storageKey, 7) };
    request(body).then(function (res) {
      if (energy !== s) return;
      var data = res.payload || {};
      if (!(res.ok && delivered('rpt_energyCoordCard', data))) {
        finish();
        if (result) show(result, statusNode(failureText(res)));
        return;
      }
      s.spin = spin;
      var info = data.energy || {};
      if (wheel && info.transform) wheel.style.transform = info.transform;
      // 원본처럼 원판이 도는 520ms 뒤에 결과를 연다.
      setTimeout(function () {
        if (energy !== s) return;
        if (result) result.innerHTML = data.html;
        writeIds(s.storageKey, info.roulette);
        finish();
      }, 520);
    }, function () {
      if (energy !== s) return;
      finish();
      if (result) show(result, statusNode(failureText(null)));
    });
  }

  // 자미두수 명반 상세 유료 장(js/saju-engine.js _cdZwServerSlot 칸). 입력은 명반 모달 계산(computeProfileForModal)의 스냅샷이다.
  // 같은 요청은 동시에 한 번만 보내고 칸마다 제 몫을 넣는다 — 1년운 안쪽 10년운 칸(#ziweiDecadeLuckGate)은 decadeHtml,
  // 나머지는 html. 응답은 들고 있지 않는다(모달을 다시 열면 다시 받는다).
  var ziweiInFlight = Object.create(null);
  function ziweiBody(featureKey) {
    var input = root.__cdZiweiSectionInput;
    if (!input || !input.birth) return null;
    var body = { featureKey: featureKey, birth: input.birth, gender: input.gender, name: input.name, place: input.place, mode: mode(), lang: lang() };
    var pid = profileId();
    if (pid) body.profileId = pid;
    return body;
  }
  function loadZiwei(slot) {
    if (!slot || !slot.getAttribute) return false;
    var featureKey = String(slot.getAttribute('data-cd-zw-server-body') || '');
    var body = ziweiBody(featureKey);
    function fail(result) {
      slot.setAttribute('data-cd-zw-state', 'failed');
      show(slot, statusNode(failureText(result), function () { slot.removeAttribute('data-cd-zw-state'); loadZiwei(slot); }));
    }
    if (!body) { fail(null); return false; }
    var key = keyOf(body);
    var pending = ziweiInFlight[key];
    if (!pending) {
      pending = ziweiInFlight[key] = request(body).then(function (result) {
        delete ziweiInFlight[key];
        if (result.ok && delivered(featureKey, result.payload || {})) return result.payload;
        throw result;
      }, function () { delete ziweiInFlight[key]; throw null; });
    }
    slot.setAttribute('data-cd-zw-state', 'loading');
    show(slot, statusNode('풀이를 불러오고 있어요.'));
    pending.then(function (data) {
      var part = slot.closest && slot.closest('#ziweiDecadeLuckGate') ? data.decadeHtml : data.html;
      if (typeof part !== 'string') { fail(null); return; }
      slot.innerHTML = part;
      slot.setAttribute('data-cd-zw-state', 'done');
      try { if (typeof root.__cdZwServerBodyDelivered === 'function') root.__cdZwServerBodyDelivered(slot, featureKey, data); } catch (_) {}
      notify(featureKey);
    }, fail);
    return false;
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
    if (quantum.state === 'failed') loadQuantum({ quiet: quantum.quiet, force: true });
    // 결제 기록이 늦게 들어온 경우: 기다리던 극T 요청은 바로 다시 묻는다.
    if ((extremeT.state === 'failed' || extremeT.state === 'waiting') && extremeT.area) loadExtremeT(extremeT.area, extremeT.options);
    if ((encyclopedia.state === 'failed' || encyclopedia.state === 'waiting') && encyclopedia.host) {
      loadEncyclopedia(encyclopedia.host, encyclopedia.input, Object.assign({}, encyclopedia.options, { force: true }));
    }
    if ((nature.state === 'failed' || nature.state === 'waiting') && nature.host) {
      loadNatureDeepDive(nature.host, Object.assign({}, nature.options, { force: true }));
    }
    Object.keys(cards).forEach(function (featureKey) {
      if (cards[featureKey].state === 'failed') loadCard(featureKey, { quiet: cards[featureKey].quiet, force: true });
    });
    try {
      document.querySelectorAll('[data-cd-zw-server-body][data-cd-zw-state="failed"]').forEach(function (slot) { loadZiwei(slot); });
    } catch (_) {}
  });

  root.CdSajuSectionClient = { loadSummary: loadSummary, showDaewun: showDaewun, refreshDaewun: refreshDaewun, loadQuantum: loadQuantum, loadExtremeT: loadExtremeT, loadEncyclopedia: loadEncyclopedia, loadNatureDeepDive: loadNatureDeepDive, loadSukuyoCompat: loadSukuyoCompat, loadZiweiCompat: loadZiweiCompat, loadCard: loadCard, loadZiwei: loadZiwei };
})(window);
