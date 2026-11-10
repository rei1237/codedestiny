/** Profile selection uses the home catalogue and its existing preview/payment entry points. */
const OPEN_PREVIEW_SELECTOR = '#tilePvwOverlay[data-cd-detail-overlay="open"][aria-hidden="false"]';
export function waitForProfileFortuneCatalogue(win) {
  if (win.CodeDestinyAllFortunes) return Promise.resolve(win.CodeDestinyAllFortunes);
  const doc = win.document;
  const script = doc.querySelector('script[src*="/js/core/home-service-finder.js"]');
  if (!script || doc.readyState === 'complete') return Promise.reject(new Error('Fortune catalogue unavailable'));
  // Reuse the shell's ordered defer scripts, not another downloader or a polling loop.
  return new Promise((resolve, reject) => {
    function finish() {
      script.removeEventListener('load', finish);
      script.removeEventListener('error', finish);
      doc.removeEventListener('DOMContentLoaded', finish);
      win.removeEventListener('load', finish);
      if (win.CodeDestinyAllFortunes) resolve(win.CodeDestinyAllFortunes);
      else reject(new Error('Fortune catalogue unavailable'));
    }
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', finish, { once: true });
    doc.addEventListener('DOMContentLoaded', finish, { once: true });
    win.addEventListener('load', finish, { once: true });
  });
}

export function matchesBudget(item, budget) {
  if (budget === '' || budget == null) return true;
  const maximum = Number(budget);
  if (!Number.isFinite(maximum) || maximum < 0) return false;
  if ((item.buckets || []).includes('free')) return true;
  const amounts = String(item.price || '').replace(/,/g, '').match(/\d+(?=원)/g);
  return Boolean(amounts && Math.min(...amounts.map(Number)) <= maximum);
}

export function restoreProfileFocusOnPreviewDismiss(preview, returnFocus) {
  if (!preview || preview.__dpProfileFocusRestore) return;
  const doc = preview.ownerDocument;
  const win = doc.defaultView;
  const controller = new win.AbortController();
  let advancing = false;
  preview.__dpProfileFocusRestore = true;
  preview.addEventListener('click', event => {
    if (event.target.closest('#tilePvwClose,#tilePvwBd')) advancing = false;
    if (event.target.closest('#tilePvwCtaBtn')) advancing = true;
  }, { capture: true, signal: controller.signal });
  win.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !preview.matches(OPEN_PREVIEW_SELECTOR)) return;
    const close = preview.querySelector('#tilePvwClose');
    if (!close) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    // Reuse the original close/history path, but do not also dismiss the parent profile sheet.
    close.click();
  }, { capture: true, signal: controller.signal });
  const observer = new win.MutationObserver(() => {
    if (preview.isConnected && preview.matches(OPEN_PREVIEW_SELECTOR)) return;
    observer.disconnect();
    controller.abort();
    delete preview.__dpProfileFocusRestore;
    if (advancing) return;
    // Let the original close handler release inert and attempt its own restoration first.
    // Only repair its detached-trigger fallback, never a newer modal or deliberate focus.
    const active = doc.activeElement;
    const fallback = '#cdMobileFortuneOverview .cd-fov__cat, #cdMobileBottomNav [data-nav-key="fortunes"], #cdMobileBottomNav a';
    if (active && active !== doc.body && !preview.contains(active) && !active.matches(fallback)) return;
    const candidates = [returnFocus, ...doc.querySelectorAll('.dp-mc-load-btn')];
    const target = candidates.find(node => node && node.isConnected && !node.disabled
      && !node.closest('[hidden],[inert],[aria-hidden="true"]') && node.getClientRects().length);
    // Back, swipe and the original close handler all arrive here without requiring
    // event-order guesses. A newer feature dialog still owns focus, even before it focuses an input.
    const newerDialog = target && [...doc.querySelectorAll('[role="dialog"],[aria-modal="true"]')]
      .some(node => node !== preview && !node.contains(target) && node.getClientRects().length
        && !node.closest('[hidden],[aria-hidden="true"]'));
    if (newerDialog) return;
    if (target) target.focus({ preventScroll: true });
  });
  observer.observe(preview, { attributes: true, attributeFilter: ['data-cd-detail-overlay', 'aria-hidden'] });
  observer.observe(doc.body, { childList: true, subtree: true });
}

export function mountProfileFortuneFinder(root, api) {
  if (!root || !api || root.dataset.mounted) return;
  root.dataset.mounted = 'true';
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const input = root.querySelector('[data-fsel-query]');
  const budget = root.querySelector('[data-fsel-budget]');
  const results = root.querySelector('[data-fsel-results]');
  const summary = root.querySelector('[data-fsel-summary]');
  const empty = root.querySelector('[data-fsel-empty]');
  const more = root.querySelector('[data-fsel-more]');
  let method = '';
  let limit = 6;
  let composing = false;

  function render() {
    const invalid = !budget.validity.valid;
    budget.setAttribute('aria-invalid', String(invalid));
    const list = invalid ? [] : api.filter({ query: input.value, methods: method ? [method] : [] })
      .filter(item => matchesBudget(item, budget.value));
    results.replaceChildren();
    summary.textContent = invalid ? '최대 가격은 0 이상의 정수로 입력해 주세요.' : '조건에 맞는 운세 ' + list.length + '개';
    empty.hidden = list.length > 0 || invalid;
    more.hidden = list.length <= limit;
    list.slice(0, limit).forEach(item => {
      const card = api.createOpener(item, 'dp-fsel-result');
      const image = doc.createElement('img');
      image.src = item.image || '/images/home/finder-moon.svg';
      image.alt = '';
      image.loading = 'lazy';
      image.width = 64;
      image.height = 72;
      image.addEventListener('error', () => { image.hidden = true; }, { once: true });
      const copy = doc.createElement('span');
      copy.className = 'dp-fsel-result-copy';
      const title = doc.createElement('strong');
      title.setAttribute('data-pvw-title', '');
      title.textContent = item.name;
      const description = doc.createElement('span');
      description.textContent = item.desc;
      const price = doc.createElement('b');
      price.textContent = item.priceFrom ? item.price.split('원')[0] + '원부터' : (item.price || '상세에서 이용 조건 확인');
      copy.append(title, description, price);
      const arrow = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrow.setAttribute('viewBox', '0 0 24 24');
      arrow.setAttribute('width', '14');
      arrow.setAttribute('height', '14');
      arrow.setAttribute('fill', 'none');
      arrow.setAttribute('stroke', 'currentColor');
      arrow.setAttribute('stroke-width', '1.5');
      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M6 18 18 6M6 6h12v12');
      arrow.append(path);
      arrow.setAttribute('aria-hidden', 'true');
      card.append(image, copy, arrow);
      results.append(card);
    });
  }
  function update() { limit = 6; render(); }
  function reset() {
    input.value = '';
    budget.value = '';
    method = '';
    root.querySelectorAll('[data-fsel-price],[data-fsel-method]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.fselPrice === '' || button.dataset.fselMethod === ''));
    });
    update();
    input.focus({ preventScroll: true });
  }
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; update(); });
  input.addEventListener('input', () => { if (!composing) update(); });
  budget.addEventListener('input', () => {
    root.querySelectorAll('[data-fsel-price]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.fselPrice === budget.value));
    });
    update();
  });
  root.querySelectorAll('[data-fsel-price]').forEach(button => button.addEventListener('click', () => {
    budget.value = button.dataset.fselPrice;
    root.querySelectorAll('[data-fsel-price]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    update();
  }));
  root.querySelectorAll('[data-fsel-method]').forEach(button => button.addEventListener('click', () => {
    method = button.dataset.fselMethod;
    root.querySelectorAll('[data-fsel-method]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    update();
  }));
  root.querySelectorAll('[data-fsel-reset]').forEach(button => button.addEventListener('click', reset));
  more.addEventListener('click', () => {
    const previousCount = results.children.length;
    limit += 12;
    render();
    if (results.children[previousCount]) results.children[previousCount].focus();
  });
  // Drop the high-z-index profile dialog before the existing delegated preview or action opens.
  // Do not call a payment action here: the home dispatcher's permissions and preview remain authoritative.
  function closeForResult() {
    const overlay = root.closest('.dp-fsel-overlay');
    if (overlay) {
      restoreProfileFocusOnPreviewDismiss(doc.querySelector(OPEN_PREVIEW_SELECTOR), overlay.__dpReturnFocus);
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      win.setTimeout(() => { overlay.remove(); }, 0);
      if (win._dpFortuneSelEl === overlay) win._dpFortuneSelEl = null;
    }
  }
  const resultSelector = '[data-fsel-results] a,[data-fsel-results] button';
  root.addEventListener('click', event => {
    if (event.target.closest(resultSelector)) closeForResult();
  });
  // The mobile bridge handles some actions at document capture and stops propagation.
  const controller = new win.AbortController();
  win.addEventListener('click', event => {
    if (!root.contains(event.target) || !event.target.closest(resultSelector)) return;
    win.setTimeout(() => {
      if (event.__cdMobileBridgeHandled || doc.querySelector(OPEN_PREVIEW_SELECTOR)) closeForResult();
    }, 0);
  }, { capture: true, signal: controller.signal });
  const observer = new win.MutationObserver(() => {
    if (!root.isConnected) { controller.abort(); observer.disconnect(); }
  });
  observer.observe(doc.body, { childList: true });
  render();
}
