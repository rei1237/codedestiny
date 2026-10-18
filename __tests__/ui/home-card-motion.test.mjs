import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { isStaticPolicyPath } from '../../lib/navigation/static-policy-routes.mjs';
import { attachHomeCardMotion } from '../../lib/navigation/home-card-motion.mjs';

// Run the actual document capture guard alongside the real deck controller.
// Navigation and React's effect lifecycle are the only mocked boundaries.
function mountShellGuard(t, f) {
  const navigations = [], cleanups = [];
  const compile = (path, globals) => {
    const exports = {};
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    runInNewContext(code, { exports, ...globals });
    return exports;
  };
  const shell = compile('../../lib/navigation/shellHome.ts', {
    window: { location: { assign: href => navigations.push(href) } },
  });
  const guard = compile('../../app/components/ShellHomeHardNavGuard.tsx', {
    window: f.win, document: f.win.document, URL: f.win.URL,
    Element: f.win.Element, HTMLAnchorElement: f.win.HTMLAnchorElement,
    require: name => {
      if (name === 'react') return { useEffect: effect => cleanups.push(effect()) };
      if (name === '@/lib/navigation/shellHome') return shell;
      if (name === '@/lib/navigation/static-policy-routes.mjs') return { isStaticPolicyPath };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  guard.default();
  t.after(() => cleanups.forEach(cleanup => cleanup()));
  return navigations;
}

test('document shell guard yields to both cards until draw completes and after cancelled touch', t => {
  const f = fixture(t), immediate = mountShellGuard(t, f);
  for (const card of f.cards) {
    f.win.dispatchEvent(new f.win.Event('pageshow'));
    f.pointer('pointerdown', card); f.pointer('pointermove', card, { clientY: 120 }); f.pointer('pointerup', card);
    f.click(card); f.tick(300);
    assert.deepEqual(immediate, []);
    assert.equal(f.deck.hasAttribute('data-selecting'), false);
    const before = f.navigations.length;
    f.pointer('pointerdown', card); f.pointer('pointerup', card); f.click(card);
    assert.equal(card.hasAttribute('data-selected'), true);
    f.click(card); f.tick(279);
    assert.deepEqual(immediate, []);
    assert.equal(f.navigations.length, before);
    f.tick(1);
    assert.equal(f.navigations.length, before + 1);
    assert.equal(f.navigations.at(-1), card.querySelector('a').href);
  }
});

test('shell guard still owns ordinary links and unmounted decks', t => {
  const f = fixture(t), immediate = mountShellGuard(t, f);
  const ordinary = f.win.document.createElement('a');
  ordinary.href = '/ggulggul/?action=saju#result';
  f.win.document.body.append(ordinary);
  ordinary.dispatchEvent(new f.win.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.deepEqual(immediate, ['/ggulggul/?action=saju#result']);
  f.cleanup();
  assert.equal(f.deck.hasAttribute('data-home-card-motion'), false);
  f.click();
  assert.deepEqual(immediate, ['/ggulggul/?action=saju#result', '/ggulggul/']);
});

function fixture(t, reduce = false) {
  const dom = new JSDOM('<ul><li data-home-card="yeoni"><a href="/ggulggul/">연이</a></li><li data-home-card="yn"><a href="/yeongnyangi/">영냥이</a></li></ul>', { url: 'https://example.test/' });
  const win = dom.window;
  const media = new win.EventTarget(); media.matches = reduce;
  win.matchMedia = query => query.includes('reduce') ? media : { matches: true };
  let clock = 0, id = 0;
  const timers = new Map(), frames = new Map(), navigations = [];
  win.setTimeout = (fn, delay) => { const key = ++id; timers.set(key, { fn, at: clock + delay }); return key; };
  win.clearTimeout = key => timers.delete(key);
  win.requestAnimationFrame = fn => { const key = ++id; frames.set(key, fn); return key; };
  win.cancelAnimationFrame = key => frames.delete(key);
  const deck = win.document.querySelector('ul'), cards = [...deck.children];
  cards.forEach(card => { card.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300 }); });
  const cleanup = attachHomeCardMotion(deck, href => navigations.push(href));
  t.after(() => { cleanup(); win.close(); });
  const pointer = (type, card = cards[0], overrides = {}) => {
    const event = new win.Event(type, { bubbles: true });
    Object.assign(event, { button: 0, pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 }, overrides);
    card.dispatchEvent(event);
  };
  const click = (card = cards[0], overrides = {}) => {
    let prevented;
    win.document.addEventListener('click', e => { prevented = e.defaultPrevented; e.preventDefault(); }, { once: true });
    card.querySelector('a').dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1, ...overrides }));
    return prevented;
  };
  const tick = ms => { clock += ms; for (const [key, entry] of timers) if (entry.at <= clock) { timers.delete(key); entry.fn(); } };
  return { win, media, deck, cards, pointer, click, tick, navigations, frames, cleanup };
}

test('each destination remains a real link and activates once after 280ms', t => {
  const f = fixture(t);
  for (const [index, path] of ['/ggulggul/', '/yeongnyangi/'].entries()) {
    f.win.dispatchEvent(new f.win.Event('pageshow'));
    assert.equal(f.cards[index].querySelector('a').getAttribute('href'), path);
    assert.equal(f.click(f.cards[index]), true);
    assert.equal(f.click(f.cards[1 - index]), true);
    f.tick(279); assert.equal(f.navigations.length, index);
    f.tick(1); assert.equal(f.navigations[index], `https://example.test${path}`);
    f.tick(1000); assert.equal(f.navigations.length, index + 1);
  }
});

test('modified clicks, new tabs and downloads retain native navigation', t => {
  const f = fixture(t);
  const immediate = mountShellGuard(t, f);
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) assert.equal(f.click(undefined, options), false);
  const link = f.cards[0].querySelector('a');
  link.target = '_blank'; assert.equal(f.click(), false); link.removeAttribute('target');
  link.setAttribute('download', ''); assert.equal(f.click(), false);
  f.tick(1000); assert.deepEqual(f.navigations, []);
  assert.deepEqual(immediate, []);
});

test('touch scroll and cancellation never select; a fresh tap works', t => {
  const f = fixture(t);
  f.pointer('pointerdown'); f.pointer('pointermove', undefined, { clientY: 115 }); f.pointer('pointerup');
  assert.equal(f.click(), true); f.tick(500); assert.deepEqual(f.navigations, []);
  f.pointer('pointerdown'); f.pointer('pointercancel');
  assert.equal(f.click(), true); f.tick(500); assert.deepEqual(f.navigations, []);
  f.pointer('pointerdown'); f.win.dispatchEvent(new f.win.Event('scroll')); f.pointer('pointerup');
  assert.equal(f.click(), true); f.tick(500); assert.deepEqual(f.navigations, []);
  f.pointer('pointerdown'); f.pointer('pointerup'); f.click(); f.tick(280);
  assert.equal(f.navigations.length, 1);
});

test('pointer tracking is bounded and leaving cancels the pending frame', t => {
  const f = fixture(t), card = f.cards[0];
  f.pointer('pointermove', card, { pointerType: 'mouse', clientX: 999, clientY: -99 });
  for (const fn of [...f.frames.values()]) fn();
  assert.equal(card.style.getPropertyValue('--hm-rx'), '7deg');
  assert.equal(card.style.getPropertyValue('--hm-ry'), '7deg');
  assert.equal(card.style.getPropertyValue('--hm-px'), '4px');
  f.frames.clear();
  f.pointer('pointermove', card, { pointerType: 'mouse' });
  f.pointer('pointerleave', card, { pointerType: 'mouse' });
  assert.equal(f.frames.size, 0);
  assert.equal(card.style.getPropertyValue('--hm-rx'), '');
  assert.equal(card.hasAttribute('data-hovered'), false);
});

test('page restoration and unmount cancel navigation and remove selection', t => {
  const f = fixture(t);
  f.click(); f.win.dispatchEvent(new f.win.Event('pagehide')); f.tick(300);
  assert.deepEqual(f.navigations, []); assert.equal(f.deck.hasAttribute('data-selecting'), false);
  f.click(); f.win.dispatchEvent(new f.win.Event('pageshow')); f.tick(300);
  assert.deepEqual(f.navigations, []);
  f.click(); f.cleanup(); f.tick(300); assert.deepEqual(f.navigations, []);
});

test('reduced motion uses the native link; Enter still works after a cancelled gesture', t => {
  const f = fixture(t, true);
  const immediate = mountShellGuard(t, f);
  assert.equal(f.click(), false); assert.equal(f.deck.hasAttribute('data-selecting'), false);
  assert.deepEqual(immediate, []);
  f.media.matches = false; f.media.dispatchEvent(new f.win.Event('change'));
  f.pointer('pointerdown'); f.pointer('pointercancel');
  assert.equal(f.click(undefined, { detail: 0 }), true);
  f.media.matches = true; f.media.dispatchEvent(new f.win.Event('change'));
  assert.equal(f.navigations.length, 1);
  f.tick(300); assert.equal(f.navigations.length, 1);
});
