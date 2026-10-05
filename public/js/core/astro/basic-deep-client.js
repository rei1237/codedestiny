/* Account-authorized detail delivery. No prose generator, paid body cache or automatic purchase. */
(function (root) {
  'use strict';
  var FEATURE = 'astro_basic_deep_pack';
  var active = null;

  function inputOf(birth) {
    function two(value) { return String(value).padStart(2, '0'); }
    return {
      date: birth.year + '-' + two(birth.month) + '-' + two(birth.day),
      time: two(birth.hour == null ? 12 : birth.hour) + ':' + two(birth.minute == null ? 0 : birth.minute),
      timeKnown: !(birth.unknownHour === true || birth.timeDefault === true || birth.hour == null),
      timezone: birth.tz == null ? 9 : birth.tz,
      latitude: Number(birth.lat == null ? 37.6 : birth.lat),
      longitude: Number(birth.lon == null ? 127.0 : birth.lon)
    };
  }
  function currentInput() { return inputOf(root._astroBirth || root._ziweiBirth || {}); }
  function current(state) {
    return active === state && state.host.isConnected && state.key === JSON.stringify(currentInput());
  }
  function clear(state) {
    state.version += 1;
    if (state.frame) { state.frame.remove(); state.frame = null; }
    state.body.replaceChildren();
    state.pdf.hidden = true;
    state.buy.hidden = true;
    state.read.disabled = false;
    state.host.removeAttribute('aria-busy');
  }
  function invalidate() {
    if (!active) return;
    clear(active);
    active.status.textContent = '계정이나 출생 정보가 바뀌었어요. 상세 해석을 다시 확인해 주세요.';
  }
  function button(text) {
    var el = document.createElement('button');
    el.type = 'button'; el.className = 'as-detail-button'; el.textContent = text;
    return el;
  }
  async function read(state) {
    if (!current(state)) { invalidate(); return null; }
    clear(state);
    var version = state.version;
    state.read.disabled = true;
    state.status.textContent = '구매 권한과 상세 해석을 확인하고 있어요.';
    state.host.setAttribute('aria-busy', 'true');
    var timer;
    try {
      if (typeof root._cdAIPromptRequestJson !== 'function') throw new Error('requester unavailable');
      var result = await Promise.race([
        root._cdAIPromptRequestJson('/api/astro/basic-deep', {
          method: 'POST', cache: 'no-store', body: JSON.stringify(state.input)
        }),
        new Promise(function (_, reject) { timer = setTimeout(function () { reject(new Error('timeout')); }, 20000); })
      ]);
      if (!current(state) || state.version !== version) return null;
      var data = result.payload || {};
      if (result.ok && data.ok === true && data.unlocked === true && data.featureKey === FEATURE && typeof data.html === 'string' && data.html.trim()) {
        // Only this authenticated response supplies detailed HTML; local unlock flags never supply a body.
        state.body.innerHTML = data.html;
        // The free summary already has this ID. Keep the server story inside its own detail region.
        var story = state.body.querySelector('#asStory');
        if (story) story.id = 'asAuthorizedStory';
        state.status.textContent = '상세 해석을 확인했어요. PDF로도 저장할 수 있어요.';
        state.pdf.hidden = false;
        return data.html;
      }
      if (result.status === 401) {
        state.status.textContent = '로그인 후 상세 해석 다시 보기를 눌러 주세요. 무료 차트와 요약은 계속 볼 수 있어요.';
      } else if (result.status === 402 && data.featureKey === FEATURE) {
        state.status.textContent = '기본 상세 해석은 기존 이용권·월정석·단건 결제로 열 수 있어요. 이미 구매했다면 구매한 계정으로 확인해 주세요.';
        // Price comes from the existing server registry, never from a new client policy.
        if (Number.isFinite(data.coinPrice) && data.coinPrice > 0 && Number.isFinite(data.amountKRW) && data.amountKRW > 0) {
          state.buy.setAttribute('data-unlock-cost', String(data.coinPrice));
          state.buy.textContent = data.amountKRW.toLocaleString('ko-KR') + '원 · 상세 해석 열기';
          state.buy.hidden = false;
        }
      } else {
        state.status.textContent = result.status === 400 ? '출생 정보를 확인한 뒤 차트를 다시 열어 주세요.' : '상세 해석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요. 구매 권리는 그대로 유지됩니다.';
      }
      return null;
    } catch (_) {
      if (current(state) && state.version === version) state.status.textContent = '상세 해석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
      return null;
    } finally {
      clearTimeout(timer);
      if (current(state) && state.version === version) {
        state.read.disabled = false;
        state.host.removeAttribute('aria-busy');
      }
    }
  }
  async function printPdf(state) {
    // Recheck at export time; a stale screen or a restored local flag is not an export grant.
    var html = await read(state);
    if (!html || !current(state)) return;
    var frame = document.createElement('iframe');
    frame.className = 'as-detail-print-frame'; frame.title = '점성술 상세 해석 PDF 저장';
    state.frame = frame;
    var version = state.version;
    frame.onload = function () {
      if (!current(state) || state.version !== version) { frame.remove(); return; }
      var doc = frame.contentDocument;
      doc.querySelectorAll('details').forEach(function (el) { el.open = true; });
      frame.contentWindow.onafterprint = function () { frame.remove(); };
      frame.contentWindow.focus(); frame.contentWindow.print();
    };
    frame.srcdoc = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>점성술 상세 해석</title><link rel="stylesheet" href="/styles/astro-reading.css"><style>@page{size:A4;margin:18mm}body{background:white;color:#111;margin:0}details>*{display:block!important}summary{list-style:none}*{color:#111!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}h2,h3,h4,summary{break-after:avoid}svg{max-width:100%}</style></head><body>' + html + '</body></html>';
    document.body.appendChild(frame);
  }
  function mount(area, birth) {
    if (active) clear(active);
    var host = area.querySelector('[data-astro-server-detail]');
    if (!host) return;
    host.replaceChildren();
    var title = document.createElement('h3'); title.className = 'as-h3'; title.textContent = '나의 점성술 상세 해석';
    var status = document.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    var readButton = button('상세 해석 다시 보기');
    var buy = button('상세 해석 열기'); buy.hidden = true;
    buy.setAttribute('data-action', 'unlockPremiumFeature'); buy.setAttribute('data-unlock-key', FEATURE); buy.setAttribute('data-service-key', 'astrology');
    var pdf = button('PDF 저장하기'); pdf.hidden = true;
    var body = document.createElement('div'); body.className = 'as-authorized-detail';
    var actions = document.createElement('div'); actions.className = 'as-detail-actions'; actions.append(readButton, buy, pdf);
    host.append(title, status, actions, body);
    var input = inputOf(birth);
    var state = { host: host, input: input, key: JSON.stringify(input), status: status, read: readButton, buy: buy, pdf: pdf, body: body, version: 0 };
    active = state;
    readButton.addEventListener('click', function () { void read(state); });
    pdf.addEventListener('click', function () { void printPdf(state); });
    void read(state);
  }
  root.addEventListener('cd:auth-changed', invalidate);
  document.addEventListener('cd:profile-card-published', invalidate);
  root.addEventListener('cd:unlocks-changed', function () { if (active && current(active)) void read(active); });
  root.AstroBasicDeep = { mount: mount, inputOf: inputOf };
})(window);
