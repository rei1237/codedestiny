/* Daily honey, product discovery and profile-scoped unlocks. Prices come only from the server catalog. */
(function (root) {
  'use strict';
  var catalog, catalogJob, state, revision = 0, busy = false, requests = new Map(), midnightTimer;
  var requestedContent = new URLSearchParams(root.location.search).get('honeyContent');
  var selector = '[data-unlock-key],[data-tile-lock-key],[data-feature-key],[data-honey-cash-key]';
  function keyOf(el) { return el.getAttribute('data-unlock-key') || el.getAttribute('data-tile-lock-key') || el.getAttribute('data-feature-key') || el.getAttribute('data-honey-cash-key') || ''; }
  function profileId() { return String(root.cdHoneyCurrentProfileId?.() || root.cdBirthScopeCurrentProfileId?.() || ''); }
  function text(el, value) { if (el && el.textContent !== value) el.textContent = value; }
  function node(tag, value, cls) { var el = document.createElement(tag); if (value) el.textContent = value; if (cls) el.className = cls; return el; }
  async function api(path, body) {
    var init = { method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'include', headers: { Accept: 'application/json' } };
    if (body) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    var result;
    if (typeof root._cdAIPromptRequestJson === 'function') result = await root._cdAIPromptRequestJson(path, init);
    else { var token; try { token = localStorage.getItem('fortune_auth_token'); } catch (_) {} if (token) init.headers.Authorization = 'Bearer ' + token; var response = await fetch(path, init); result = { ok: response.ok, status: response.status, payload: await response.json() }; }
    if (!result.ok || result.payload?.ok !== true) throw Object.assign(new Error(result.payload?.message || '잠시 후 다시 확인해 주세요.'), { status: result.status });
    return result.payload;
  }
  function getCatalog() {
    if (catalog) return Promise.resolve(catalog);
    if (!catalogJob) catalogJob = api('/api/honey/catalog').then(function (data) { catalog = data; refreshLabels(); return data; }).finally(function () { catalogJob = null; });
    return catalogJob;
  }
  var confirmationPending = false;
  function confirmUnlock(item) {
    if (root.isTileKeyUnlocked?.(item.featureKey)) return Promise.resolve(true);
    if (confirmationPending) return Promise.resolve(false);
    var dialog = document.getElementById('cdHoneyUnlockSheet');
    if (!dialog || !root.CodeDestinyShellSheet) return Promise.resolve(root.confirm(item.title + '을 꿀방울 ' + item.honeyCost + '개로 열까요?'));
    confirmationPending = true;
    text(dialog.querySelector('[data-honey-confirm-title]'), item.title);
    text(dialog.querySelector('[data-honey-confirm-cost]'), '꿀방울 ' + item.honeyCost + '개 · 현재 보유 ' + state.balance + '개');
    var button = dialog.querySelector('[data-honey-confirm]');
    text(button, '꿀방울 ' + item.honeyCost + '개로 열기');
    return new Promise(function (resolve) {
      var done = false;
      function finish(accepted) {
        if (done) return; done = true; confirmationPending = false;
        button.removeEventListener('click', accept); dialog.removeEventListener('close', cancel); dialog.removeEventListener('cancel', cancel);
        root.CodeDestinyShellSheet.close(dialog.id); resolve(accepted);
      }
      function accept() { finish(true); } function cancel() { finish(false); }
      button.addEventListener('click', accept); dialog.addEventListener('close', cancel); dialog.addEventListener('cancel', cancel);
      root.CodeDestinyShellSheet.open(dialog.id);
    });
  }
  function product(key) { return catalog?.products.find(function (item) { return item.featureKey === key; }); }
  function render() {
    var widget = document.querySelector('[data-cd-honey-widget]'); if (!widget) return;
    var button = widget.querySelector('[data-cd-honey-attend]');
    text(widget.querySelector('[data-cd-honey-balance]'), state?.guest ? '로그인 후 확인' : state?.error ? '조회 실패' : state ? state.balance + '개' : '확인 중');
    text(button, state?.attended ? '오늘 출석 체크 완료' : '출석 체크 하기');
    button.setAttribute('aria-busy', String(busy));
    button.disabled = busy || !state || Boolean(state?.attended || state?.error);
    text(widget.querySelector('[data-cd-honey-status]'), state?.error ? '꿀방울을 불러오지 못했어요. 다시 확인해 주세요.' : '');
    widget.querySelector('[data-cd-honey-retry]').hidden = !state?.error;
  }
  var collectionAnimations = [], collectionLayer, collectionTimer;
  function clearCollection() {
    clearTimeout(collectionTimer);
    collectionAnimations.forEach(function (animation) { animation.cancel(); });
    collectionAnimations = [];
    if (collectionLayer) collectionLayer.remove();
    collectionLayer = null;
  }
  function celebrateCollection() {
    clearCollection();
    if (document.hidden || root.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    var widget = document.querySelector('.cdh-honey');
    var destination = widget?.querySelector('.cdh-honey__wallet > img');
    var origin = widget?.querySelector('.cdh-honey__yeoni');
    if (!origin || !destination || typeof destination.animate !== 'function') return;
    var box = widget.getBoundingClientRect(), from = origin.getBoundingClientRect(), to = destination.getBoundingClientRect();
    if (!box.width || !box.height) return;
    var startX = from.left - box.left + from.width / 2 - 16;
    var startY = from.top - box.top + from.height * .6 - 16;
    var endX = to.left - box.left + to.width / 2 - 16;
    var endY = to.top - box.top + to.height / 2 - 16;
    collectionLayer = node('span', '', 'cdh-honey__collection');
    collectionLayer.setAttribute('aria-hidden', 'true');
    widget.append(collectionLayer);
    // Decorative droplets indicate movement, not the quantity credited by the server.
    for (var i = 0; i < 4; i++) {
      var drop = document.createElement('img');
      drop.src = destination.getAttribute('src'); drop.alt = ''; drop.width = 32; drop.height = 32;
      collectionLayer.append(drop);
      collectionAnimations.push(drop.animate([
        { transform: 'translate(' + (startX + i * 5) + 'px,' + (startY - i * 7) + 'px) scale(.45)', opacity: 0 },
        { transform: 'translate(' + (startX + (endX - startX) * .25) + 'px,' + (Math.min(startY, endY) - 24 - i * 9) + 'px) scale(1)', opacity: 1, offset: .35 },
        { transform: 'translate(' + endX + 'px,' + endY + 'px) scale(.25)', opacity: 0 }
      ], { duration: 700, delay: i * 55, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }));
    }
    collectionAnimations.push(destination.animate([
      { transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: .5 }, { transform: 'scale(1)' }
    ], { duration: 320, delay: 550, easing: 'ease-out' }));
    collectionTimer = setTimeout(clearCollection, 950);
  }
  async function refresh(attend) {
    if (busy) return;
    var version = revision, previousBalance = state?.balance, collected = false; busy = true; render();
    try { var data = await api('/api/honey/attendance', attend ? {} : null); if (version === revision) { collected = Boolean(attend && data.attended && Number.isFinite(previousBalance) && data.balance > previousBalance); state = data; if (attend) { try { localStorage.setItem('cd:honey-refresh', String(Date.now())); } catch (_) {} } } }
    catch (error) { if (version === revision) state = error.status === 401 ? { guest: true } : { error: true }; }
    finally { if (version === revision) { busy = false; render(); scheduleMidnight(); } }
    // Optional presentation must never turn a successful credit into an error state.
    if (collected && version === revision) { try { celebrateCollection(); } catch (_) { clearCollection(); } }
  }
  function scheduleMidnight() {
    clearTimeout(midnightTimer);
    var shifted = new Date(Date.now() + 9 * 3600000);
    var tomorrow = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1) - 9 * 3600000;
    midnightTimer = setTimeout(function () { void refresh(false); }, Math.max(1000, tomorrow - Date.now() + 1000));
  }
  function priceLabel(item) { return Number(item.cashPriceKRW).toLocaleString('ko-KR') + '원'; }
  function buttonLabel(button, title, value) {
    if (button.dataset.honeyBusy) return;
    if (button.querySelector('[data-honey-label]')?.textContent === title && button.querySelector('[data-honey-value]')?.textContent === value) return;
    var heading = node('span', title), amount = node('strong', value);
    heading.dataset.honeyLabel = ''; amount.dataset.honeyValue = ''; button.replaceChildren(heading, amount);
  }
  function refreshLabels() {
    if (!catalog) return;
    document.querySelectorAll('button' + selector.split(',').join(',button')).forEach(function (button) {
      var item = product(keyOf(button)); if (!item || item.billingType === 'per_use') return;
      button.dataset.honeyProduct = item.productId;
      var gate = button.closest('.cd-section-gate');
      var owns = gate?.classList.contains('cd-section-gate--unlocked') || root.isTileKeyUnlocked?.(item.featureKey);
      if (gate) {
        gate.dataset.honeyGate = '';
        gate.style.minHeight = ''; gate.style.overflow = '';
        var overlay = gate.querySelector(':scope > .cd-section-gate__overlay');
        if (overlay) {
          overlay.style.background = ''; overlay.style.padding = ''; overlay.style.gap = '';
          text(overlay.querySelector('.cd-section-gate__title'), item.title);
          text(overlay.querySelector('.cd-section-gate__desc'), item.description);
          text(overlay.querySelector('.cd-section-gate__badge'), '바로 열거나, 출석으로 모아 열어보세요');
        }
      }
      var card = button.closest('.rpt-v2-block');
      if (card) card.querySelectorAll('.rpt-v2-price-badge').forEach(function (badge) { text(badge, owns ? '해금 완료' : priceLabel(item) + ' 또는 꿀방울 ' + item.honeyCost + '개'); });
      if ((button.dataset.action === 'unlockPremiumFeature' || button.hasAttribute('data-honey-cash-key')) && !button.disabled && !owns) {
        buttonLabel(button, '바로 열기', priceLabel(item));
        button.setAttribute('aria-label', item.title + ' · ' + priceLabel(item) + '으로 바로 열기');
      }
      if (button.dataset.action !== 'unlockPremiumFeature' && !button.hasAttribute('data-tile-lock-key') && !button.hasAttribute('data-honey-cash-key')) return;
      var options = button.parentElement;
      if (!options.classList.contains('cd-honey-options')) {
        options = node('div', '', 'cd-honey-options'); button.before(options); options.append(button);
        var honey = node('button', '', 'cd-honey-option'); honey.type = 'button'; honey.dataset.honeyOpen = item.productId;
        honey.__honeyTarget = button; options.append(honey);
      }
      var honeyButton = options.querySelector('[data-honey-open]');
      honeyButton.hidden = Boolean(owns || button.hidden);
      if (!honeyButton.dataset.honeyBusy) honeyButton.disabled = Boolean(button.disabled && !owns);
      honeyButton.setAttribute('aria-label', item.title + ' · 꿀방울 ' + item.honeyCost + '개로 열기');
      buttonLabel(honeyButton, '꿀방울로 열기', item.honeyCost + '개');
      if (requestedContent === item.featureKey && button.getClientRects().length) {
        requestedContent = null; button.scrollIntoView({ block: 'center' }); button.focus({ preventScroll: true });
      }
    });
  }
  async function unlock(button, item, use) {
    var pid = profileId(), version = revision;
    if (!pid) { root.alert('출생정보를 프로필로 저장하거나 저장된 내 프로필을 선택해 주세요.'); return false; }
    if (state?.guest) { root.location.assign('/login/?next=' + encodeURIComponent(root.location.pathname + root.location.search)); return false; }
    var key = pid + ':' + item.productId;
    if (button.dataset.honeyBusy) return false;
    button.dataset.honeyBusy = '1'; button.disabled = true;
    var previous = button.textContent; text(button, '해금 확인 중…');
    if (!requests.has(key)) requests.set(key, crypto.randomUUID());
    try {
      var balanceState = await api('/api/honey/attendance');
      if (revision !== version || pid !== profileId()) return false;
      state = balanceState; render();
      if (!await confirmUnlock(item)) return false;
      if (revision !== version || pid !== profileId()) return false;
      var data = await api('/api/honey/unlocks', { productId: item.productId, profileId: pid, requestId: use ? use.requestId : requests.get(key), input: use ? use.input : undefined });
      if (revision !== version || pid !== profileId()) return false;
      if (data.unlocked !== true || data.featureKey !== item.featureKey) throw Error('해금 결과를 다시 확인해 주세요.');
      state = data.honey; render();
      if (!use) root._cdFinalizeUnlockState?.(item.featureKey, data);
      root.dispatchEvent(new CustomEvent('cd:honey-updated', { detail: { featureKey: item.featureKey, profileId: pid } }));
      try { localStorage.setItem('cd:honey-refresh', String(Date.now())); } catch (_) {}
      requests.delete(key);
      return use ? data : true;
    } catch (error) {
      if (version === revision) {
        if (error.status === 401) root.location.assign('/login/?next=' + encodeURIComponent(root.location.pathname + root.location.search));
        else root.alert(error.message + (error.status === 402 ? ' 메인의 출석 카드에서 매일 모을 수 있어요.' : ' 같은 버튼으로 다시 확인해 주세요.'));
      }
      return false;
    } finally { delete button.dataset.honeyBusy; button.disabled = false; text(button, previous); refreshLabels(); }
  }
  async function showUses() {
    var host = document.querySelector('[data-cd-honey-uses]'), status = document.querySelector('[data-cd-honey-sheet-state]');
    if (!host) return;
    var version = revision, pid = profileId(); text(status, '사용처와 해금 상태를 확인하고 있어요.'); host.replaceChildren();
    try {
      var data = await getCatalog(), owned = [], ownershipError = false;
      if (!state?.guest && pid) {
        try { owned = (await api('/api/honey/unlocks?profileId=' + encodeURIComponent(pid))).featureKeys; }
        catch (_) { ownershipError = true; }
      }
      if (version !== revision) return;
      text(status, state?.guest ? '로그인하면 보유량을 확인할 수 있어요.' : state?.error || !state ? '보유량을 확인하지 못했어요. 출석 카드에서 다시 확인해 주세요.' : '보유 꿀방울 ' + state.balance + '개' + (pid ? ' · 선택한 프로필 기준' : ' · 프로필 선택 후 해금 상태 확인'));
      var groups = new Map();
      data.products.concat(data.otherUses).forEach(function (item) {
        var group = item.group === '재미 사주' ? '재미 콘텐츠' : item.featureKey ? '기본 운세 확장' : item.group;
        if (!groups.has(group)) { var section = node('section', '', 'cd-honey-use-group'); section.append(node('h3', group)); host.append(section); groups.set(group, section); }
        var row = node('article', '', 'cd-honey-use'), info = node('div');
        info.append(node('h4', item.title), node('p', item.description));
        var unlocked = item.featureKey && owned.includes(item.featureKey);
        info.append(node('p', (unlocked ? '해금 완료' : (item.cashPriceKRW ? '바로 열기 ' + priceLabel(item) + ' · ' : '') + '꿀방울 ' + item.honeyCost + '개') + (item.featureKey && ownershipError ? ' · 해금 상태 조회 실패' : item.featureKey && !pid ? ' · 저장된 프로필 필요' : ''), 'cd-honey-use__meta'));
        if (item.condition) info.append(node('p', item.condition, 'cd-honey-use__condition'));
        var link = node('a', unlocked ? '결과 열기' : '바로가기');
        link.href = item.href || '/?action=' + encodeURIComponent(item.action) + '&honeyContent=' + encodeURIComponent(item.featureKey);
        row.append(info, link); groups.get(group).append(row);
      });
    } catch (_) { text(status, '사용처를 불러오지 못했어요.'); var retry = node('button', '다시 확인하기'); retry.type = 'button'; retry.onclick = showUses; host.append(retry); }
  }
  function boot() {
    var widget = document.querySelector('[data-cd-honey-widget]');
    if (widget) {
      widget.querySelector('[data-cd-honey-attend]').addEventListener('click', function () {
        if (state?.guest) root.location.assign('/login/?next=' + encodeURIComponent('/'));
        else void refresh(true);
      });
      widget.querySelector('[data-cd-honey-retry]').addEventListener('click', function () { void refresh(false); });
    }
    root.addEventListener('click', function (event) {
      if (event.target.closest?.('[data-cd-sheet-open="cdHoneySheet"]')) void showUses();
      var go = event.target.closest?.('[data-cd-basic-detail-go]');
      if (go) {
        var key = go.getAttribute('data-cd-basic-detail-go');
        var target = Array.from(document.querySelectorAll('button[data-unlock-key],button[data-tile-lock-key],button[data-honey-cash-key]')).find(function (button) { return keyOf(button) === key; });
        if (target) { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); target.focus({ preventScroll: true }); }
      }

      var honeyButton = event.target.closest?.('[data-honey-open]');
      if (!honeyButton || honeyButton.disabled) return;
      event.preventDefault(); event.stopImmediatePropagation();
      getCatalog().then(async function () {
        var item = product(honeyButton.dataset.honeyOpen); if (!item) return;
        var ok = await unlock(honeyButton, item);
        var original = honeyButton.__honeyTarget;
        if (ok && (original?.hasAttribute('data-tile-lock-key') || original?.hasAttribute('data-honey-cash-key'))) original.click();
      }).catch(function () { root.alert('사용 방법을 확인하지 못했어요. 잠시 후 다시 눌러 주세요.'); });
    }, true);
    var scheduled = false;
    new MutationObserver(function () { if (!scheduled) { scheduled = true; requestAnimationFrame(function () { scheduled = false; refreshLabels(); }); } }).observe(document.body, { childList: true, subtree: true });
    void getCatalog().catch(function () {}); void refresh(false);
  }
  function invalidate() { clearCollection(); revision++; busy = false; state = null; requests.clear(); render(); void refresh(false); }
  root.addEventListener('pagehide', clearCollection);
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearCollection(); });
  root.addEventListener('cd:auth-changed', invalidate);
  root.addEventListener('cd:profile-changed', invalidate);
  document.addEventListener('cd:profile-card-published', invalidate);
  root.addEventListener('storage', function (event) { if (event.key === 'cd:honey-refresh') void refresh(false); });
  root.addEventListener('focus', function () { void refresh(false); });
  root.CdHoney = { unlockUse: async function (button, featureKey, input, requestId) { await getCatalog(); var item = product(featureKey); if (!item || item.serviceScope !== 'GGULGGUL' || item.billingType !== 'per_use') return false; return unlock(button, item, { input: input, requestId: requestId }); }, getCatalog: getCatalog, refresh: refresh, refreshLabels: refreshLabels, getProduct: product };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})(window);
