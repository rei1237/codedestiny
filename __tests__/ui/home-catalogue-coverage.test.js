// Exercise the real source, including the mobile collection's detached cards.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const art = JSON.parse(read('lib/marketing/service-introduction-art.json'));

async function boot(detach) {
  const dom = new JSDOM(read('index.html'), { url: 'https://code-destiny.com/ggulggul/', runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
  const { window } = dom;
  if (detach) {
    window.document.querySelectorAll('.feat-collection[id],.tarot-collection[id]').forEach(collection => {
      collection.__cdLazyCards = Array.from(collection.querySelectorAll('.tarot-tile,.feature-card'));
      collection.__cdLazyCards.forEach(card => card.remove());
    });
  }
  window.eval(read('js/core/service-registry.js'));
  window.eval(read('js/core/home-service-finder.js'));
  if (window.document.readyState === 'loading') await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
  return dom;
}

// Independent destinations, not every payment SKU or alternate entry to the same report.
const experts = [
  ['life-fortune-ai-consultation', 'saju', 'life-fortune-ai'],
  ['sukuyo-compatibility-ai', 'sukuyo', 'sukuyo-compatibility-ai'],
  ['ziwei-ai-consultation', 'ziwei', 'ziwei-ai'],
  ['astrology-ai-consultation', 'astrology', 'astrology-ai'],
  ['vedic-ai-consultation', 'vedic', 'vedic-ai'],
  ['nakshatra-ai-consultation', 'vedic', 'nakshatra-ai'],
  ['nakshatra-vvip-codex', 'sukuyo', 'nakshatra-vvip-codex'],
  ['neo-email-consultation', 'saju', 'neo-consultation'],
];

for (const detached of [false, true]) test(`all source services retain classification and assigned art (${detached ? 'mobile detached' : 'desktop'})`, async () => {
  const dom = await boot(detached);
  try {
    const { window } = dom;
    const filter = window.CodeDestinyAllFortunes.filter;
    const all = filter({});
    assert.ok(all.length >= 86, `unexpected catalogue shrink: ${all.length}`);
    for (const item of all) {
      assert.ok(item.tagged && item.methods.length && item.purposes.length, `unclassified: ${item.name}`);
      for (const method of item.methods) assert.ok(filter({ methods: [method] }).some(entry => entry === item), `${item.name}: ${method}`);
      if (item.image) assert.ok(fs.existsSync(path.join(root, 'public', item.image)), `missing art: ${item.name}`);
    }
    for (const [featureKey, method, artId] of experts) {
      const item = filter({ methods: [method] }).find(entry => entry.featureKey === featureKey);
      assert.ok(item, `${featureKey} missing in ${method}`);
      assert.equal(item.image, art[artId].cardImage);
      assert.ok(filter({ methods: [method], query: item.name }).some(entry => entry === item));
    }
    assert.ok(filter({methods:['etc']}).some(item => item.id === 'omikuji'));
    assert.ok(filter({methods:['ziwei']}).some(item => item.id === 'master-love-codex'));
    for (const method of ['saju','ziwei','vedic','astrology']) assert.ok(filter({methods:[method]}).some(item => item.id === 'neo-operation-room'));
    for (const method of ['saju','ziwei','vedic','astrology','tarot','sukuyo']) assert.ok(filter({methods:[method]}).some(item => item.id === 'fortune-chat'));
    for (const id of ['saju-compatibility','saju-fpti']) assert.ok(filter({methods:['saju']}).some(item => item.id === id));
    assert.ok(!all.some(item => item.id === 'love-code' || /love-simulation/.test(item.href)));
  } finally { dom.window.close(); }
});

test('legacy tools reuse their own existing artwork rather than another service illustration', async () => {
  const { extractObjectLiteral } = await import('../../scripts/lib/feature-marketing-extract.mjs');
  const shell = read('index.html');
  const details = extractObjectLiteral(shell, 'D');
  const finder = read('js/core/home-service-finder.js');
  const legacy = extractObjectLiteral(finder.replace('var LEGACY_SERVICE_IMAGES = {','var LEGACY_SERVICE_IMAGES={'), 'LEGACY_SERVICE_IMAGES');
  assert.equal(legacy['saju-fpti'], details.openSajuFptiTest.img);
  const doc = new JSDOM(shell, { virtualConsole: new VirtualConsole() });
  try {
    assert.ok(doc.window.document.querySelector(`img[src="${legacy['saju-compatibility']}"]`), 'original compatibility preview image');
    for (const image of Object.values(legacy)) assert.ok(fs.existsSync(path.join(root, 'public', image)));
  } finally { doc.window.close(); }
});

test('source taxonomy rejects misspelled tags rather than silently losing services', async () => {
  const dom = await boot(false);
  try {
    const meta = dom.window.__cdServiceRegistryMeta;
    for (const tile of dom.window.document.querySelectorAll('[data-cd-methods]')) {
      for (const [attr, allowed] of [['data-cd-methods', meta.methods], ['data-cd-purposes', meta.purposes]]) {
        const tags = tile.getAttribute(attr).split(/\s+/);
        assert.ok(tags.length);
        for (const tag of tags) assert.ok(allowed.includes(tag), `${tile.textContent.trim()}: ${attr}=${tag}`);
      }
    }
  } finally { dom.window.close(); }
});
