const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(text => text.includes("var mobileSajuDetailsKey ="));
assert.ok(script, 'collection navigation script exists');

test('a quick action closed by Back is not reopened by collection navigation', () => {
  const dom = new JSDOM('<body><a href="/tarot/mingri/" data-action="openTarotModal" data-cd-open-collection="tarotCollection">타로</a><div id="tarotCollection"></div><div id="tarotModalOverlay" style="display:none"></div></body>', { runScripts: 'outside-only', url: 'https://example.test/' });
  const { window } = dom;
  const pending = [];
  window.setTimeout = fn => { pending.push(fn); return pending.length; };
  window.scrollTo = () => {};
  const overlay = window.document.getElementById('tarotModalOverlay');
  let opened = 0;
  window.openTarotModal = () => {
    opened += 1;
    overlay.style.display = 'block';
    window.document.body.style.overflow = 'hidden';
  };
  window.eval(script);
  // The normal action dispatcher owns the launch; collection navigation only expands/scrolls.
  window.document.addEventListener('click', event => {
    const action = event.target.getAttribute('data-action');
    if (action) { event.preventDefault(); window[action](); }
  });
  window.document.querySelector('a').click();
  assert.equal(opened, 1);
  overlay.style.display = 'none';
  window.document.body.style.overflow = '';
  while (pending.length) pending.shift()();
  assert.equal(opened, 1, 'a queued duplicate must not reopen the feature after Back');
  assert.equal(overlay.style.display, 'none');
  assert.equal(window.document.body.style.overflow, '');
  dom.window.close();
});

test('an action requested before idle detach retains its modal until the deferred opener runs', () => {
  const lazyScript = html.match(/<script data-cd-marker="mobile-home-lazy-mount-v20260701">([\s\S]*?)<\/script>/)[1];
  const dom = new JSDOM('<body><div id="tarotModalOverlay" style="display:none"></div></body>', { runScripts: 'outside-only', url: 'https://example.test/' });
  const { window } = dom;
  const pending = [];
  window.matchMedia = () => ({ matches: true });
  window.requestIdleCallback = fn => fn();
  window.setTimeout = (fn, ms) => { if (ms === 320) pending.push(fn); return 1; };
  window.setInterval = () => 1;
  window.eval(lazyScript);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  window.__cdMobileHomeLazyMount.mount('tarotModalOverlay');
  assert.equal(pending.length, 1);
  pending.shift()();
  assert.ok(window.document.getElementById('tarotModalOverlay'), 'idle cleanup must not detach a modal already requested by the user');
  dom.window.close();
});

test('a collection-only entry still opens the mobile library', () => {
  const dom = new JSDOM('<body><button data-cd-open-collection="tarotCollection">타로 모음</button></body>', { runScripts: 'outside-only', url: 'https://example.test/' });
  const opened = [];
  dom.window.cdMobileCollectionFullscreen = { open: id => opened.push(id), isOpen: () => true };
  dom.window.eval(script);
  dom.window.document.querySelector('button').click();
  assert.deepEqual(opened, ['tarotCollection']);
  dom.window.close();
});
