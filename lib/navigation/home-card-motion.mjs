// Progressive enhancement only: hrefs, modified clicks and reduced motion stay native.
export function attachHomeCardMotion(deck, navigate) {
  const win = deck.ownerDocument.defaultView;
  const go = navigate || (href => win.location.assign(href));
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = win.matchMedia('(hover: hover) and (pointer: fine)');
  const cards = [...deck.querySelectorAll('[data-home-card]')];
  const removers = [];
  const frames = new Map();
  const bounds = new Map();
  let timer = null;
  let destination = null;
  let navigated = false;
  let touch = null;
  let cancelledTouch = false;
  const on = (node, type, handler, options) => {
    node.addEventListener(type, handler, options);
    removers.push(() => node.removeEventListener(type, handler, options));
  };
  const resetCard = card => {
    win.cancelAnimationFrame(frames.get(card));
    frames.delete(card);
    bounds.delete(card);
    delete card.dataset.hovered;
    delete card.dataset.pressed;
    for (const key of ['rx', 'ry', 'px', 'py', 'shine-x', 'shine-y', 'shadow-x']) card.style.removeProperty(`--hm-${key}`);
  };
  const cancelTouch = () => {
    if (touch) cancelledTouch = true;
    touch = null;
    cards.forEach(resetCard);
  };
  const reset = () => {
    win.clearTimeout(timer);
    timer = null;
    destination = null;
    navigated = false;
    touch = null;
    cancelledTouch = false;
    delete deck.dataset.selecting;
    cards.forEach(card => { resetCard(card); delete card.dataset.selected; });
  };
  const finish = () => {
    const href = destination;
    timer = null;
    if (href && !navigated) { navigated = true; go(href); }
  };

  cards.forEach(card => {
    on(card, 'pointermove', event => {
      if (event.pointerType === 'touch') {
        if (touch && touch.id === event.pointerId && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 8) {
          cancelledTouch = true;
          delete card.dataset.pressed;
        }
        return;
      }
      if (destination || reduced.matches || !fine.matches) return;
      if (!bounds.has(card)) bounds.set(card, card.getBoundingClientRect());
      card.dataset.hovered = '';
      const rect = bounds.get(card);
      const clamp = value => Math.max(-1, Math.min(1, value));
      const x = clamp((event.clientX - rect.left) / rect.width * 2 - 1);
      const y = clamp((event.clientY - rect.top) / rect.height * 2 - 1);
      win.cancelAnimationFrame(frames.get(card));
      frames.set(card, win.requestAnimationFrame(() => {
        frames.delete(card);
        card.style.setProperty('--hm-rx', `${-y * 7}deg`);
        card.style.setProperty('--hm-ry', `${x * 7}deg`);
        card.style.setProperty('--hm-px', `${x * 4}px`);
        card.style.setProperty('--hm-py', `${y * 4}px`);
        card.style.setProperty('--hm-shine-x', `${50 + x * 40}%`);
        card.style.setProperty('--hm-shine-y', `${50 + y * 40}%`);
        card.style.setProperty('--hm-shadow-x', `${x * 12}px`);
      }));
    });
    on(card, 'pointerleave', () => {
      if (touch?.card === card) { cancelledTouch = true; touch = null; }
      resetCard(card);
    });
    on(card, 'pointerdown', event => {
      if (event.button !== 0 || destination) return;
      cancelledTouch = false;
      if (!reduced.matches) card.dataset.pressed = '';
      if (event.pointerType === 'touch') touch = { card, id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    on(card, 'pointerup', () => { delete card.dataset.pressed; touch = null; });
    on(card, 'pointercancel', cancelTouch);
  });
  on(deck, 'click', event => {
    const link = event.target.closest?.('a');
    const card = link?.closest('[data-home-card]');
    if (!card || !cards.includes(card) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    if (cancelledTouch && event.detail !== 0) { event.preventDefault(); return; }
    if (destination) { event.preventDefault(); return; }
    if (reduced.matches) return;
    event.preventDefault();
    destination = link.href;
    cards.forEach(resetCard);
    deck.dataset.selecting = '';
    card.dataset.selected = '';
    timer = win.setTimeout(finish, 280);
  });
  on(win, 'scroll', cancelTouch, { passive: true });
  on(win, 'blur', cancelTouch);
  on(win, 'pagehide', reset);
  on(win, 'pageshow', reset);
  on(deck.ownerDocument, 'visibilitychange', () => { if (deck.ownerDocument.hidden) cancelTouch(); });
  on(reduced, 'change', () => {
    cards.forEach(resetCard);
    if (reduced.matches && destination) { win.clearTimeout(timer); finish(); }
  });
  // Advertise ownership only while the click handler is actually installed.
  deck.setAttribute('data-home-card-motion', '');
  return () => { reset(); removers.forEach(remove => remove()); deck.removeAttribute('data-home-card-motion'); };
}
