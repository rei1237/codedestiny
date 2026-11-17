// Reuse the original wallet node and controller. A profile switch must return
// the live node before its previous game card is removed.
export function adoptHoneyManager(host, signal) {
  const widget = document.querySelector('[data-cd-honey-widget]');
  if (!widget || signal.aborted) return;
  const anchor = document.createComment('profile honey manager return point');
  const wasHidden = widget.hidden;
  widget.before(anchor);
  widget.classList.add('pg-honey-manager');
  widget.hidden = false;
  const details = widget.querySelector('.cdh-honey__details');
  if (details && !widget.dataset.petHoneyVisited) {
    details.open = !!host.closest('#dpListSheet[data-pet-entry="my"]');
    widget.dataset.petHoneyVisited = 'true';
  }
  host.append(widget);
  mountHoneySuggestions(host, signal);
  window.CdHoney?.refresh(false);
  signal.addEventListener('abort', () => {
    if (anchor.parentNode) anchor.replaceWith(widget);
    widget.hidden = wasHidden;
    widget.classList.remove('pg-honey-manager');
  }, { once: true });
}

// Display only: the existing catalog, wallet and confirmation controller own all prices and spending.
export function mountHoneySuggestions(host, signal) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const section = doc.createElement('section');
  section.className = 'pc-honey-suggestions';
  section.setAttribute('aria-label', '꿀방울로 보는 운세');
  host.append(section);
  let catalog, failed = false, signature = '', owned = new Set(), ownershipFailed = false;
  const make = (tag, text, className) => {
    const el = doc.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  function render() {
    if (signal.aborted) return;
    const state = win.CdHoney?.getState?.();
    const products = (catalog?.products || []).filter(item => item.serviceScope === 'GGULGGUL' && Number.isFinite(item.honeyCost) && item.honeyCost > 0);
    const nextSignature = JSON.stringify([state, failed, !!catalog, ownershipFailed, products.map(item => [item.productId, item.honeyCost, owned.has(item.featureKey)])]);
    if (signature === nextSignature) return;
    signature = nextSignature;
    section.replaceChildren(make('h3', '모은 꿀방울로 운세 보기'));
    if (!catalog) {
      section.append(make('p', failed ? '사용처를 불러오지 못했어요.' : '사용할 수 있는 운세를 확인하고 있어요.'));
      if (failed) {
        const retry = make('button', '사용처 다시 확인하기'); retry.type = 'button'; retry.onclick = load;
        section.append(retry);
      }
      return;
    }
    const balance = state && !state.guest && !state.error && Number.isFinite(state.balance) ? state.balance : null;
    const selected = products.map((item, index) => ({ item, index, owned: owned.has(item.featureKey) }))
      .sort((a, b) => Number(b.owned) - Number(a.owned) || a.item.honeyCost - b.item.honeyCost || a.index - b.index).slice(0, 3);
    if (!selected.length) section.append(make('p', '현재 사용 가능한 상품은 전체 사용처에서 확인해 주세요.'));
    const list = make('ul');
    for (const { item, owned } of selected) {
      const row = make('li'), link = make('a', '', 'pc-honey-suggestion');
      link.href = item.href || '/ggulggul/?action=' + encodeURIComponent(item.action) + '&honeyContent=' + encodeURIComponent(item.featureKey);
      link.append(make('strong', item.title));
      link.append(make('span', owned ? '열어 둔 운세 · 다시 보기' : `꿀방울 ${item.honeyCost.toLocaleString('ko-KR')}개`));
      if (!owned && balance !== null) link.append(make('small', balance >= item.honeyCost ? '지금 사용할 수 있어요' : `${(item.honeyCost - balance).toLocaleString('ko-KR')}개 더 모으면 열 수 있어요`));
      row.append(link); list.append(row);
    }
    section.append(list);
    if (ownershipFailed) section.append(make('p', '이전에 연 운세는 해당 운세 화면에서 다시 확인해 주세요.'));
    const all = make('button', '꿀방울 사용처 모두 보기'); all.type = 'button'; all.setAttribute('data-cd-sheet-open', 'cdHoneySheet');
    section.append(all);
  }
  async function load() {
    failed = false; render();
    try {
      catalog = await win.CdHoney?.getCatalog?.(); if (!catalog) failed = true;
      await loadOwned();
    }
    catch { failed = true; }
    render();
  }
  async function loadOwned() {
    try { owned = new Set(await win.CdHoney?.getUnlockedFeatureKeys?.() || []); ownershipFailed = false; }
    catch { owned = new Set(); ownershipFailed = true; }
    render();
  }
  win.addEventListener('cd:honey-state', render, { signal });
  win.addEventListener('cd:unlocks-changed', () => { void loadOwned(); }, { signal });
  void load();
}

export function petBond(affection = 0, attended = false) {
  if (affection >= 70) return { label: '달빛 단짝', greeting: attended ? '오늘 출석도 완료했어요. 함께 쌓는 시간이 참 좋아요.' : '기다리고 있었어요. 오늘의 출석 도장도 함께 남겨요.', next: 100 };
  if (affection >= 30) return { label: '반가운 친구', greeting: attended ? '오늘 도장을 찍었어요. 내일도 반갑게 만나요.' : '또 만나서 반가워요. 꿀단지에 오늘의 도장을 찍어볼까요?', next: 70 };
  return { label: '처음 만난 사이', greeting: attended ? '오늘 출석을 완료했어요. 조금씩 서로를 알아가요.' : '첫 출석 도장부터, 천천히 우리만의 시간을 쌓아요.', next: 30 };
}
