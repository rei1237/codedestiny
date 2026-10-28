// Music-video tarot card: the home-card-motion feel for a <button> that opens a dialog instead of navigating.
// onActivate runs synchronously inside the click, so showModal() and play() keep the user gesture
// (sound-on playback is refused otherwise). The 280ms draw runs underneath the opening dialog and the card
// stays drawn until release() is called when the dialog closes. Without this module the button still works.
export function attachMvCardMotion(deck, onActivate) {
  const win = deck.ownerDocument.defaultView;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = win.matchMedia('(hover: hover) and (pointer: fine)');
  const cards = [...deck.querySelectorAll('[data-mv-card]')];
  const removers = [];
  const frames = new Map();
  const bounds = new Map();
  let timer = null;
  let drawn = null;
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
    for (const key of ['rx', 'ry', 'px', 'py', 'shine-x', 'shine-y', 'shadow-x']) card.style.removeProperty(`--mv-${key}`);
  };
  const cancelTouch = () => {
    if (touch) cancelledTouch = true;
    touch = null;
    cards.forEach(resetCard);
  };
  const release = () => {
    win.clearTimeout(timer);
    timer = null;
    drawn = null;
    touch = null;
    cancelledTouch = false;
    delete deck.dataset.selecting;
    cards.forEach(card => { resetCard(card); delete card.dataset.selected; });
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
      if (drawn || reduced.matches || !fine.matches) return;
      if (!bounds.has(card)) bounds.set(card, card.getBoundingClientRect());
      card.dataset.hovered = '';
      const rect = bounds.get(card);
      const clamp = value => Math.max(-1, Math.min(1, value));
      const x = clamp((event.clientX - rect.left) / rect.width * 2 - 1);
      const y = clamp((event.clientY - rect.top) / rect.height * 2 - 1);
      win.cancelAnimationFrame(frames.get(card));
      frames.set(card, win.requestAnimationFrame(() => {
        frames.delete(card);
        card.style.setProperty('--mv-rx', `${-y * 7}deg`);
        card.style.setProperty('--mv-ry', `${x * 7}deg`);
        card.style.setProperty('--mv-px', `${x * 4}px`);
        card.style.setProperty('--mv-py', `${y * 4}px`);
        card.style.setProperty('--mv-shine-x', `${50 + x * 40}%`);
        card.style.setProperty('--mv-shine-y', `${50 + y * 40}%`);
        card.style.setProperty('--mv-shadow-x', `${x * 12}px`);
      }));
    });
    on(card, 'pointerleave', () => {
      if (touch?.card === card) { cancelledTouch = true; touch = null; }
      resetCard(card);
    });
    on(card, 'pointerdown', event => {
      if (event.button !== 0 || drawn) return;
      cancelledTouch = false;
      if (!reduced.matches) card.dataset.pressed = '';
      if (event.pointerType === 'touch') touch = { card, id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    on(card, 'pointerup', () => { delete card.dataset.pressed; touch = null; });
    on(card, 'pointercancel', cancelTouch);
  });
  on(deck, 'click', event => {
    const trigger = event.target.closest?.('[data-mv-card-trigger]');
    const card = trigger?.closest('[data-mv-card]');
    if (!card || !cards.includes(card) || event.defaultPrevented) return;
    // A scroll that started on the card is not a tap. Keyboard clicks (detail 0) always pass.
    if (cancelledTouch && event.detail !== 0) { cancelledTouch = false; event.preventDefault(); return; }
    if (drawn) return;
    onActivate(card);
    cards.forEach(resetCard);
    if (reduced.matches) return;
    drawn = card;
    deck.dataset.selecting = '';
    card.dataset.selected = '';
    timer = win.setTimeout(() => { timer = null; delete deck.dataset.selecting; }, 280);
  });
  on(win, 'scroll', cancelTouch, { passive: true });
  on(win, 'blur', cancelTouch);
  on(win, 'pagehide', release);
  on(win, 'pageshow', release);
  on(deck.ownerDocument, 'visibilitychange', () => { if (deck.ownerDocument.hidden) cancelTouch(); });
  on(reduced, 'change', () => { cards.forEach(resetCard); if (reduced.matches) delete deck.dataset.selecting; });
  // Advertise ownership only while the click handler is actually installed.
  deck.setAttribute('data-mv-card-motion', '');
  return {
    release,
    destroy: () => { release(); removers.forEach(remove => remove()); deck.removeAttribute('data-mv-card-motion'); },
  };
}
