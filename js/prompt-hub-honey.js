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
  function locale() { return root.cdGetCurrentLanguage?.() || document.documentElement.lang || 'ko'; }
  function tr(key, fallback, vars) {
    vars = vars || {};
    return root.cdTranslate?.('honeyUI.' + key, vars, fallback) || fallback.replace(/\{(\w+)\}/g, function (_, name) { return vars[name] ?? ''; });
  }
  function number(value) { return Number(value).toLocaleString(locale()); }
  function itemText(item, field) { return tr('products.' + item.featureKey + '.' + field, item[field]); }
  function groupText(group) { var keys = { '사주': 'saju', '점성술': 'astrology', '자미두수': 'ziwei', '숙요': 'sukuyo', '베다': 'vedic', '타로': 'tarot' }; return tr('groups.' + keys[group], group); }
  async function api(path, body) {
    var init = { method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'include', headers: { Accept: 'application/json' } };
    if (body) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    var result;
    if (typeof root._cdAIPromptRequestJson === 'function') result = await root._cdAIPromptRequestJson(path, init);
    else { var token; try { token = localStorage.getItem('fortune_auth_token'); } catch (_) {} if (token) init.headers.Authorization = 'Bearer ' + token; var response = await fetch(path, init); result = { ok: response.ok, status: response.status, payload: await response.json() }; }
    if (!result.ok || result.payload?.ok !== true) throw Object.assign(new Error(result.payload?.message || tr("retryLater", "잠시 후 다시 확인해 주세요.")), { status: result.status });
    return result.payload;
  }
  function getCatalog() {
    if (catalog) return Promise.resolve(catalog);
    if (!catalogJob) catalogJob = api('/api/honey/catalog').then(function (data) { catalog = data; refreshLabels(); return data; }).finally(function () { catalogJob = null; });
    return catalogJob;
  }
  var confirmationPending = false, confirmationItem;
  function renderConfirmation() {
    var item = confirmationItem, dialog = document.getElementById('cdHoneyUnlockSheet');
    if (!item || !dialog) return;
    text(dialog.querySelector('[data-honey-confirm-title]'), itemText(item, 'title'));
    text(dialog.querySelector('[data-honey-confirm-cost]'), tr('costBalance', '꿀방울 {cost}개 · 현재 보유 {balance}개', { cost: number(item.honeyCost), balance: number(state.balance) }));
    text(dialog.querySelector('[data-honey-confirm-condition]'), item.billingType === 'per_use' ? tr('perUseCondition', '이번 요청에 꿀방울을 사용해요. 새 궁합이나 새 카드 해석에는 다시 필요해요.') : tr('birthCondition', '선택한 프로필의 출생정보로 이 콘텐츠를 엽니다. 같은 계정·출생정보로 다시 볼 때는 추가로 쓰지 않아요.'));
    text(dialog.querySelector('[data-honey-confirm]'), tr('openCost', '꿀방울 {cost}개로 열기', { cost: number(item.honeyCost) }));
  }
  function confirmUnlock(item) {
    if (item.billingType === 'birth_unlock' && root.isTileKeyUnlocked?.(item.featureKey)) return Promise.resolve(true);
    if (confirmationPending) return Promise.resolve(false);
    var dialog = document.getElementById('cdHoneyUnlockSheet');
    if (!dialog || !root.CodeDestinyShellSheet) return Promise.resolve(root.confirm(tr("confirm", "{title}을 꿀방울 {cost}개로 열까요?", { title: itemText(item, "title"), cost: number(item.honeyCost) })));
    confirmationPending = true;
    confirmationItem = item;
    renderConfirmation();
    var button = dialog.querySelector('[data-honey-confirm]');
    return new Promise(function (resolve) {
      var done = false;
      function finish(accepted) {
        if (done) return; done = true; confirmationPending = false; confirmationItem = null;
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
    text(widget.querySelector('[data-cd-honey-balance]'), state?.guest ? tr("loginBalance", "로그인 후 확인") : state?.error ? tr("failed", "조회 실패") : state ? tr("count", "{count}개", { count: number(state.balance) }) : tr("loading", "확인 중"));
    text(button, state?.attended ? tr("attended", "오늘 출석 체크 완료") : tr("attend", "출석 체크 하기"));
    button.setAttribute('aria-busy', String(busy));
    button.disabled = busy || !state || Boolean(state?.attended || state?.error);
    text(widget.querySelector('[data-cd-honey-status]'), state?.error ? tr("balanceError", "꿀방울을 불러오지 못했어요. 다시 확인해 주세요.") : '');
    widget.querySelector('[data-cd-honey-retry]').hidden = !state?.error;
  }
  var collectionAnimations = [], collectionLayer, collectionTimer;
  function announceCollection(amount) {
    var status = document.querySelector('[data-cd-honey-status]');
    text(status, tr("collected", "꿀방울 {amount}개를 모았어요! 현재 {balance}개예요.", { amount: number(amount), balance: number(state.balance) }));
  }
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
    if (collected && version === revision) { announceCollection(state.balance - previousBalance); try { celebrateCollection(); } catch (_) { clearCollection(); } }
  }
  function scheduleMidnight() {
    clearTimeout(midnightTimer);
    var shifted = new Date(Date.now() + 9 * 3600000);
    var tomorrow = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1) - 9 * 3600000;
    midnightTimer = setTimeout(function () { void refresh(false); }, Math.max(1000, tomorrow - Date.now() + 1000));
  }
  var playPrices = new Map(), playVersion = 0;
  function priceLabel(item) {
    var play = root.__cdPlayDisplayPrice;
    if (play?.isApp()) {
      if (!playPrices.has(item.featureKey)) {
        var version = playVersion;
        playPrices.set(item.featureKey, null);
        void play.read({ featureKey: item.featureKey }).then(function (result) {
          if (version !== playVersion) return;
          playPrices.set(item.featureKey, result); refreshLabels();
        });
      }
      return play.label(playPrices.get(item.featureKey));
    }
    return root.__cdCheckoutEntry?.formatKrwAmount(item.cashPriceKRW, '{amount}원') || (locale().startsWith('ko') ? number(item.cashPriceKRW) + '원' : 'KRW ' + number(item.cashPriceKRW));
  }
  function buttonLabel(button, title, value) {
    if (button.dataset.honeyBusy) return;
    if (button.querySelector('[data-honey-label]')?.textContent === title && button.querySelector('[data-honey-value]')?.textContent === value) return;
    var heading = node('span', title), amount = node('strong', value);
    heading.dataset.honeyLabel = ''; amount.dataset.honeyValue = ''; button.replaceChildren(heading, amount);
    if (button.hasAttribute('data-honey-open')) button.prepend(node('span', tr("eligible", "꿀방울 사용 가능처"), 'cd-honey-eligible'));
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
          text(overlay.querySelector('.cd-section-gate__title'), itemText(item, "title"));
          text(overlay.querySelector('.cd-section-gate__desc'), itemText(item, "description"));
          text(overlay.querySelector('.cd-section-gate__badge'), tr("choice", "바로 열거나, 출석으로 모아 열어보세요"));
        }
      }
      var card = button.closest('.rpt-v2-block');
      if (card) card.querySelectorAll('.rpt-v2-price-badge').forEach(function (badge) { text(badge, owns ? tr("unlocked", "해금 완료") : tr("cashOrHoney", "{price} 또는 꿀방울 {cost}개", { price: priceLabel(item), cost: number(item.honeyCost) })); });
      if ((button.dataset.action === 'unlockPremiumFeature' || button.hasAttribute('data-honey-cash-key')) && !button.disabled && !owns) {
        buttonLabel(button, tr("openNow", "바로 열기"), priceLabel(item));
        button.setAttribute('aria-label', tr("cashLabel", "{title} · {price}으로 바로 열기", { title: itemText(item, "title"), price: priceLabel(item) }));
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
      honeyButton.setAttribute('aria-label', tr("honeyLabel", "{title} · 꿀방울 {cost}개로 열기", { title: itemText(item, "title"), cost: number(item.honeyCost) }));
      buttonLabel(honeyButton, tr("openHoney", "꿀방울로 열기"), tr("count", "{count}개", { count: number(item.honeyCost) }));
      if (requestedContent === item.featureKey && button.getClientRects().length) {
        requestedContent = null; button.scrollIntoView({ block: 'center' }); button.focus({ preventScroll: true });
      }
    });
  }
  async function unlock(button, item, use) {
    var pid = profileId(), version = revision;
    if (!pid) { root.alert(tr("profileNeeded", "출생정보를 프로필로 저장하거나 저장된 내 프로필을 선택해 주세요.")); return false; }
    if (state?.guest) { root.location.assign('/login/?next=' + encodeURIComponent(root.location.pathname + root.location.search)); return false; }
    var key = pid + ':' + item.productId;
    if (button.dataset.honeyBusy) return false;
    button.dataset.honeyBusy = '1'; button.disabled = true;
    var previous = button.textContent; text(button, tr("unlocking", "해금 확인 중…"));
    if (!requests.has(key)) requests.set(key, crypto.randomUUID());
    try {
      var balanceState = await api('/api/honey/attendance');
      if (revision !== version || pid !== profileId()) return false;
      state = balanceState; render();
      if (!await confirmUnlock(item)) return false;
      if (revision !== version || pid !== profileId()) return false;
      var data = await api('/api/honey/unlocks', { productId: item.productId, profileId: pid, requestId: use ? use.requestId : requests.get(key), input: use ? use.input : undefined });
      if (revision !== version || pid !== profileId()) return false;
      if (data.unlocked !== true || data.featureKey !== item.featureKey) throw Error(tr("unlockError", "해금 결과를 다시 확인해 주세요."));
      state = data.honey; render();
      if (!use) root._cdFinalizeUnlockState?.(item.featureKey, data);
      root.dispatchEvent(new CustomEvent('cd:honey-updated', { detail: { featureKey: item.featureKey, profileId: pid } }));
      try { localStorage.setItem('cd:honey-refresh', String(Date.now())); } catch (_) {}
      requests.delete(key);
      return use ? data : true;
    } catch (error) {
      if (version === revision) {
        if (error.status === 401) root.location.assign('/login/?next=' + encodeURIComponent(root.location.pathname + root.location.search));
        else root.alert((locale().startsWith('ko') ? error.message : tr("retryLater", "잠시 후 다시 확인해 주세요.")) + ' ' + (error.status === 402 ? tr("collectHint", "메인의 출석 카드에서 매일 모을 수 있어요.") : tr("retryButtonHint", "같은 버튼으로 다시 확인해 주세요.")));
      }
      return false;
    } finally { delete button.dataset.honeyBusy; button.disabled = false; text(button, previous); refreshLabels(); }
  }
  async function showUses() {
    var host = document.querySelector('[data-cd-honey-uses]'), status = document.querySelector('[data-cd-honey-sheet-state]');
    if (!host) return;
    var version = revision, pid = profileId(); text(status, tr("usesLoading", "사용처와 해금 상태를 확인하고 있어요.")); host.replaceChildren();
    try {
      var data = await getCatalog(), owned = [], ownershipError = false;
      if (!state?.guest && pid) {
        try { owned = (await api('/api/honey/unlocks?profileId=' + encodeURIComponent(pid))).featureKeys; }
        catch (_) { ownershipError = true; }
      }
      if (version !== revision) return;
      text(status, state?.guest ? tr("guestHint", "로그인하면 보유량을 확인할 수 있어요.") : state?.error || !state ? tr("balanceRetry", "보유량을 확인하지 못했어요. 출석 카드에서 다시 확인해 주세요.") : tr("balance", "보유 꿀방울 {balance}개", { balance: number(state.balance) }) + (pid ? ' · ' + tr("selectedProfile", "선택한 프로필 기준") : ' · ' + tr("chooseProfile", "프로필 선택 후 해금 상태 확인")));
      var groups = new Map();
      data.products.forEach(function (item) {
        var group = ['기본 사주', '재미 사주'].includes(item.group) ? '사주' : item.group;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(item);
      });
      groups.forEach(function (items, group) {
        var section = node('details', '', 'cd-honey-use-group'), summary = node('summary'), list = node('div', '', 'cd-honey-use-list');
        var costs = items.map(function (item) { return item.honeyCost; }), min = Math.min.apply(null, costs), max = Math.max.apply(null, costs);
        summary.append(node('strong', groupText(group)), node('span', tr("groupCount", "{count}종 · {range}개", { count: number(items.length), range: min === max ? number(min) : number(min) + "–" + number(max) })));
        section.append(summary, list); host.append(section);
        items.forEach(function (item) {
          var row = node('article', '', 'cd-honey-use'), info = node('div');
          var perUse = item.billingType === 'per_use', unlocked = !perUse && owned.includes(item.featureKey);
          info.append(node('span', tr("eligible", "꿀방울 사용 가능처"), 'cd-honey-eligible'), node('h4', itemText(item, "title")), node('p', itemText(item, "description")));
          info.append(node('p', unlocked ? tr("unlockedNoExtra", "해금 완료 · 추가 사용 없음") : tr("cost", "꿀방울 {cost}개", { cost: number(item.honeyCost) }), 'cd-honey-use__meta'));
          info.append(node('p', perUse ? tr("perUseShort", "새 궁합·새 카드 해석을 요청할 때마다 사용") : tr("birthShort", "같은 계정·출생정보로 다시 볼 때 추가 사용 없음"), 'cd-honey-use__condition'));
          if (!unlocked && state && !state.guest && !state.error && Number.isFinite(state.balance) && state.balance < item.honeyCost) info.append(node('p', tr("shortfall", "{count}개 더 모으면 열 수 있어요.", { count: number(item.honeyCost - state.balance) }), 'cd-honey-use__condition'));
          if (ownershipError) info.append(node('p', tr("ownershipError", "해금 상태는 운세 화면에서 다시 확인해 주세요."), 'cd-honey-use__condition'));
          if (item.condition) info.append(node('p', item.condition, 'cd-honey-use__condition'));
          var link = node('a', unlocked ? tr("viewUnlocked", "해금한 해석 보기") : tr("viewGroup", "{group}에서 보기", { group: groupText(group) }));
          link.setAttribute('aria-label', itemText(item, "title") + ' · ' + link.textContent);
          link.href = item.href || '/?action=' + encodeURIComponent(item.action) + '&honeyContent=' + encodeURIComponent(item.featureKey);
          row.append(info, link); list.append(row);
        });
      });
    } catch (_) { text(status, tr("usesError", "사용처를 불러오지 못했어요.")); var retry = node('button', tr("retry", "다시 확인하기")); retry.type = 'button'; retry.onclick = showUses; host.append(retry); }
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
      }).catch(function () { root.alert(tr("usageError", "사용 방법을 확인하지 못했어요. 잠시 후 다시 눌러 주세요.")); });
    }, true);
    var scheduled = false;
    new MutationObserver(function () { if (!scheduled) { scheduled = true; requestAnimationFrame(function () { scheduled = false; refreshLabels(); }); } }).observe(document.body, { childList: true, subtree: true });
    void getCatalog().catch(function () {}); void refresh(false);
  }
  function invalidate() { clearCollection(); revision++; busy = false; state = null; requests.clear(); render(); void refresh(false); }
  root.addEventListener('cd:locale-ready', function () { render(); refreshLabels(); renderConfirmation(); if (document.getElementById('cdHoneySheet')?.open) void showUses(); });
  root.addEventListener('cd:play-prices-changed', function () { playVersion++; playPrices.clear(); refreshLabels(); });
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
