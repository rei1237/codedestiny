/* 점성술 상담 유료 본문(커리어·재능·관계·과제 심화 분석, 봉인된 별의 방 네 방) 배달.
   본문은 서버(/api/astro/section)가 출생 단위 해금을 확인하고 서버 차트로 만든다.
   이 파일은 요청과 표시만 한다 — 유료 문장·생성기·본문 캐시가 없다. localStorage 해금 표시는 요청할지 고르는 힌트일 뿐이다. */
(function (root) {
  'use strict';
  var ENDPOINT = '/api/astro/section';
  var TIMEOUT_MS = 20000;
  var FAILED_QUIET_MS = 10000;
  var KEYS = {
    astro_career_talent_deep: true,
    astro_talent_attraction_deep: true,
    astro_relationship_deep: true,
    astro_growth_shadow_deep: true,
    astro_stellar_career_room: true,
    astro_stellar_talent_room: true,
    astro_stellar_relationship_room: true,
    astro_stellar_growth_room: true,
    astro_yearly_transit: true
  };
  var states = Object.create(null);

  function handles(key) { return KEYS[String(key || '')] === true; }
  function two(value) { return String(value).padStart(2, '0'); }
  function birthInput() {
    var birth = root._astroBirth || root._ziweiBirth || {};
    return {
      date: birth.year + '-' + two(birth.month) + '-' + two(birth.day),
      time: two(birth.hour == null ? 12 : birth.hour) + ':' + two(birth.minute == null ? 0 : birth.minute),
      timeKnown: !(birth.unknownHour === true || birth.timeDefault === true || birth.hour == null),
      timezone: birth.tz == null ? 9 : birth.tz,
      latitude: Number(birth.lat == null ? 37.6 : birth.lat),
      longitude: Number(birth.lon == null ? 127.0 : birth.lon)
    };
  }
  function profileId() {
    try { return String((root.cdBirthScopeCurrentProfileId && root.cdBirthScopeCurrentProfileId()) || '').trim(); } catch (_) { return ''; }
  }
  function lang() {
    try { return String((root.cdGetCurrentLanguage && root.cdGetCurrentLanguage()) || 'ko'); } catch (_) { return 'ko'; }
  }
  function requestOf(key) {
    var body = Object.assign({ featureKey: key }, birthInput(), { lang: lang() });
    var id = profileId();
    if (id) body.profileId = id;
    /* 앞으로 12개월은 기기 시간대의 오늘부터 센다 — 날짜는 서버 시계로 정하고 시간대만 넘긴다. */
    if (key === 'astro_yearly_transit') body.transitTz = -new Date().getTimezoneOffset() / 60;
    return body;
  }
  function notice(body, text, retry) {
    var p = document.createElement('p');
    p.className = 'astro-section-notice';
    p.setAttribute('role', 'status');
    p.textContent = text;
    body.replaceChildren(p);
    if (retry) {
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'cd-section-gate__btn astro-section-retry'; button.textContent = '다시 불러오기';
      button.addEventListener('click', function () { void load(retry.gate, retry.key, true); });
      body.appendChild(button);
    }
  }

  async function load(gate, key, force) {
    if (!gate || !handles(key) || !gate.isConnected) return;
    var body = gate.querySelector('.cd-section-gate__body');
    if (!body) return;
    var request = requestOf(key);
    var signature = JSON.stringify(request);
    var state = states[key] || (states[key] = { signature: '', status: '', failedAt: 0, seq: 0 });
    if (!force && state.signature === signature && body.getAttribute('data-astro-section') === 'ready') return;
    // A rerender replaces the body while the request/state can still be alive.
    // Only suppress repeat work for the same DOM destination, never a new empty gate.
    if (state.body === body && state.status === 'loading' && state.signature === signature) return;
    if (state.body === body && !force && state.status === 'failed' && state.signature === signature && Date.now() - state.failedAt < FAILED_QUIET_MS) return;
    var seq = state.seq += 1;
    state.signature = signature; state.status = 'loading'; state.body = body;
    body.setAttribute('data-astro-section', 'loading');
    body.setAttribute('aria-busy', 'true');
    notice(body, '구매 권한과 심화 분석을 확인하고 있어요.');
    var timer;
    var fresh = function () { return states[key] === state && state.seq === seq && gate.isConnected && JSON.stringify(requestOf(key)) === signature; };
    try {
      if (typeof root._cdAIPromptRequestJson !== 'function') throw new Error('requester unavailable');
      var result = await Promise.race([
        root._cdAIPromptRequestJson(ENDPOINT, { method: 'POST', cache: 'no-store', body: signature }),
        new Promise(function (_, reject) { timer = setTimeout(function () { reject(new Error('timeout')); }, TIMEOUT_MS); })
      ]);
      if (!fresh()) return;
      var data = result.payload || {};
      if (result.ok && data.ok === true && data.unlocked === true && data.featureKey === key && typeof data.html === 'string' && data.html.trim()) {
        state.status = 'ready';
        body.setAttribute('data-astro-section', 'ready');
        body.innerHTML = data.html;
        return;
      }
      state.status = 'failed'; state.failedAt = Date.now();
      body.setAttribute('data-astro-section', 'failed');
      if (result.status === 401) notice(body, '로그인 후 다시 열어 주세요. 구매한 계정으로 로그인하면 바로 보여요.', { gate: gate, key: key });
      else if (result.status === 402) notice(body, '이 생년월일로 구매한 기록을 찾지 못했어요. 구매한 계정과 프로필인지 확인해 주세요.', { gate: gate, key: key });
      else if ((result.status === 400 || result.status === 403) && data.requiresProfile === true) notice(body, '심화 분석은 저장된 내 프로필 기준으로 열려요. 이 출생 정보를 프로필로 저장하거나 저장된 프로필을 선택해 주세요.', { gate: gate, key: key });
      else notice(body, '심화 분석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요. 구매 권리는 그대로 유지됩니다.', { gate: gate, key: key });
    } catch (_) {
      if (!fresh()) return;
      state.status = 'failed'; state.failedAt = Date.now();
      body.setAttribute('data-astro-section', 'failed');
      notice(body, '심화 분석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', { gate: gate, key: key });
    } finally {
      clearTimeout(timer);
      if (state.seq === seq) body.removeAttribute('aria-busy');
    }
  }

  function reset() { states = Object.create(null); }
  root.addEventListener('cd:auth-changed', reset);
  document.addEventListener('cd:profile-card-published', reset);
  root.AstroSection = { handles: handles, fill: function (gate, key) { void load(gate, key, false); } };
})(window);
