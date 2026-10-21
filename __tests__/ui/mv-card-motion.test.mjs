import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { attachMvCardMotion } from '../../lib/navigation/mv-card-motion.mjs';

// 뮤직비디오 카드는 링크가 아니라 극장 <dialog>를 여는 버튼이다. showModal()·play()가 사용자 제스처 안에
// 있어야 소리 있는 재생이 막히지 않으므로, 활성화는 280ms 뽑기를 기다리지 않고 클릭 안에서 바로 일어나야 한다.
function fixture(t, reduce = false) {
  const dom = new JSDOM('<div><article data-mv-card="heaven-light"><h2><button type="button" data-mv-card-trigger>HEAVEN LIGHT</button></h2></article></div>', { url: 'https://example.test/' });
  const win = dom.window;
  const media = new win.EventTarget(); media.matches = reduce;
  win.matchMedia = query => query.includes('reduce') ? media : { matches: true };
  let clock = 0, id = 0;
  const timers = new Map(), frames = new Map(), activations = [];
  win.setTimeout = (fn, delay) => { const key = ++id; timers.set(key, { fn, at: clock + delay }); return key; };
  win.clearTimeout = key => timers.delete(key);
  win.requestAnimationFrame = fn => { const key = ++id; frames.set(key, fn); return key; };
  win.cancelAnimationFrame = key => frames.delete(key);
  const deck = win.document.querySelector('div'), card = deck.querySelector('[data-mv-card]');
  card.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300 });
  const motion = attachMvCardMotion(deck, activated => activations.push(activated));
  t.after(() => { motion.destroy(); win.close(); });
  const pointer = (type, overrides = {}) => {
    const event = new win.Event(type, { bubbles: true });
    Object.assign(event, { button: 0, pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 }, overrides);
    card.dispatchEvent(event);
  };
  const click = (overrides = {}) => {
    const event = new win.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1, ...overrides });
    card.querySelector('button').dispatchEvent(event);
    return event.defaultPrevented;
  };
  const tick = ms => { clock += ms; for (const [key, entry] of timers) if (entry.at <= clock) { timers.delete(key); entry.fn(); } };
  return { win, media, deck, card, motion, pointer, click, tick, frames, activations };
}

test('activation happens inside the click, then the card stays drawn until release', t => {
  const f = fixture(t);
  f.pointer('pointerdown'); f.pointer('pointerup');
  assert.equal(f.click(), false);
  assert.deepEqual(f.activations, [f.card]);
  assert.equal(f.card.hasAttribute('data-selected'), true);
  assert.equal(f.deck.hasAttribute('data-selecting'), true);
  f.tick(280);
  assert.equal(f.deck.hasAttribute('data-selecting'), false);
  f.click(); assert.equal(f.activations.length, 1);
  f.motion.release();
  assert.equal(f.card.hasAttribute('data-selected'), false);
  f.click(); assert.equal(f.activations.length, 2);
});

test('a touch that moves more than 8px is a scroll, not a tap; Enter still opens', t => {
  const f = fixture(t);
  f.pointer('pointerdown'); f.pointer('pointermove', { clientY: 109 }); f.pointer('pointerup');
  assert.equal(f.click(), true);
  assert.deepEqual(f.activations, []);
  f.pointer('pointerdown'); f.pointer('pointercancel');
  assert.equal(f.click({ detail: 0 }), false);
  assert.equal(f.activations.length, 1);
});

test('tilt is bounded and leaving the card clears it', t => {
  const f = fixture(t);
  f.pointer('pointermove', { pointerType: 'mouse', clientX: 999, clientY: -99 });
  for (const fn of [...f.frames.values()]) fn();
  assert.equal(f.card.style.getPropertyValue('--mv-rx'), '7deg');
  assert.equal(f.card.style.getPropertyValue('--mv-ry'), '7deg');
  assert.equal(f.card.style.getPropertyValue('--mv-px'), '4px');
  assert.equal(f.card.style.getPropertyValue('--mv-shine-x'), '90%');
  f.pointer('pointerleave', { pointerType: 'mouse' });
  assert.equal(f.card.style.getPropertyValue('--mv-rx'), '');
  assert.equal(f.card.hasAttribute('data-hovered'), false);
});

test('reduced motion opens without the draw or tilt', t => {
  const f = fixture(t, true);
  f.pointer('pointermove', { pointerType: 'mouse' });
  assert.equal(f.frames.size, 0);
  f.click();
  assert.equal(f.activations.length, 1);
  assert.equal(f.card.hasAttribute('data-selected'), false);
  assert.equal(f.deck.hasAttribute('data-selecting'), false);
});

test('pagehide and destroy reset the deck', t => {
  const f = fixture(t);
  f.click(); f.win.dispatchEvent(new f.win.Event('pagehide'));
  assert.equal(f.card.hasAttribute('data-selected'), false);
  assert.equal(f.deck.hasAttribute('data-selecting'), false);
  f.click(); f.motion.destroy();
  assert.equal(f.card.hasAttribute('data-selected'), false);
  assert.equal(f.deck.hasAttribute('data-mv-card-motion'), false);
  f.click(); assert.equal(f.activations.length, 2);
});
