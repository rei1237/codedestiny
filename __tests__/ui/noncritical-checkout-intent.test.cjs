const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'js/noncritical-defer-loader.js'), 'utf8');

function boot(markup, mobile = true) {
  const dom = new JSDOM(
    '<html><head><link data-cd-noncritical-style-src="/styles/fortune-ui.css" ' +
      'data-cd-mobile-delay="1" media="print"></head><body>' + markup + '</body></html>',
    { url: 'https://fixture.invalid/ggulggul/', runScripts: 'outside-only' }
  );
  const w = dom.window;
  w.matchMedia = () => ({ matches: mobile });
  Object.defineProperty(w.document, 'readyState', { value: 'complete' });
  const timers = [];
  w.setTimeout = (fn, ms) => {
    timers.push({ fn, ms });
    return timers.length;
  };
  w.requestIdleCallback = (fn) => { fn(); return 1; };
  w.eval(source);
  return { w, timers, dom, link: w.document.querySelector('link') };
}

const pay = '<button class="cd-bundle-offer__pay" data-action="unlockPremiumFeature" ' +
  'data-unlock-key="saju_lifetime_bundle"><span>Pay</span></button>';

for (const event of ['pointerdown', 'touchstart', 'keydown']) {
  test('exact mobile bundle ' + event + ' leaves unrelated styles deferred', () => {
    const t = boot(pay);
    t.w.document.querySelector('span').dispatchEvent(new t.w.Event(event, { bubbles: true }));
    assert.equal(t.link.getAttribute('href'), null);
    t.dom.window.close();
  });
}

for (const [label, markup] of [
  ['other key', pay.replace('saju_lifetime_bundle', 'section_summary')],
  ['other class', pay.replace('cd-bundle-offer__pay', 'different')],
  ['other action', pay.replace('unlockPremiumFeature', 'cdOneStepFreeSajuEntry')],
  ['ordinary feature', '<button data-action="openTarot">Open</button>'],
  ['profile master', '<div id="dpMasterCard"><button>Profile</button></div>'],
]) {
  test(label + ' retains normal preparation', () => {
    const t = boot(markup);
    t.w.document.querySelector('button').dispatchEvent(new t.w.Event('pointerdown', { bubbles: true }));
    assert.equal(t.link.getAttribute('href'), '/styles/fortune-ui.css');
    t.dom.window.close();
  });
}

test('desktop bundle keeps normal loading', () => {
  const t = boot(pay, false);
  t.w.document.querySelector('button').dispatchEvent(new t.w.Event('pointerdown', { bubbles: true }));
  assert.equal(t.link.media, 'all');
  t.dom.window.close();
});

test('45 second mobile fallback remains intact', () => {
  const t = boot(pay);
  t.w.document.querySelector('button').dispatchEvent(new t.w.Event('pointerdown', { bubbles: true }));
  assert.equal(t.link.getAttribute('href'), null);
  const timer = t.timers.find((t) => t.ms === 45000);
  assert.ok(timer);
  timer.fn();
  assert.equal(t.link.media, 'all');
  t.dom.window.close();
});

test('collection-open still prepares styles', () => {
  const t = boot(pay);
  t.w.document.dispatchEvent(new t.w.CustomEvent('cd:collection-toggle', { detail: { isOpen: true } }));
  assert.equal(t.link.media, 'all');
  t.dom.window.close();
});

test('existing result stylesheet is never removed by checkout intent', () => {
  const t = boot(pay);
  t.link.href = '/styles/fortune-ui.css';
  t.link.media = 'all';
  t.w.document.querySelector('button').dispatchEvent(new t.w.Event('pointerdown', { bubbles: true }));
  assert.equal(t.link.getAttribute('href'), '/styles/fortune-ui.css');
  assert.equal(t.link.media, 'all');
  t.dom.window.close();
});

test('new saju calculation explicitly awaits result styles', async () => {
  const engine = fs.readFileSync(path.join(root, 'js/saju-engine.js'), 'utf8');
  assert.ok(engine.includes('await _sajuCalculationWait(_cdEnsureFortuneUiStyles(5000), run, 0);'));
  const start = engine.indexOf('function _cdEnsureFortuneUiStyles(');
  const end = engine.indexOf('function _sajuCalculationWait(', start);
  assert.ok(start >= 0 && end > start);
  const t = boot(pay);
  t.w.eval(engine.slice(start, end));
  const ready = t.w._cdEnsureFortuneUiStyles();
  assert.equal(t.link.getAttribute('href'), '/styles/fortune-ui.css');
  assert.equal(t.link.media, 'all');
  t.link.dispatchEvent(new t.w.Event('load'));
  await ready;
  t.dom.window.close();
});
