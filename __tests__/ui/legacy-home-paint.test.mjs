import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import { homeSignatures, optimizeLegacyHomePaint, ruleKey } from '../../scripts/optimize-legacy-home-paint.mjs';

// A capture: every element of html is known, and each rule of the sheets whose
// selector is not listed in used was seen and never ran.
function record(html, sheets, used) {
  const dom = new JSDOM(html);
  const elements = homeSignatures(dom.window.document);
  dom.window.close();
  const unused = new Set();
  for (const css of sheets) postcss.parse(css).walkRules(rule => {
    if (!rule.parent?.name?.endsWith('keyframes') && !used.includes(rule.selector)) unused.add(ruleKey(rule));
  });
  return { version: 2, elements, unused: [...unused] };
}

const href = '/css/shell/home-0123456789abcdef.css';
const css = '.heading{font-size:30px}.closed{display:none}.yh-smile{color:pink}@keyframes blink{to{opacity:0}}'
  + '.unopened{color:red}'.repeat(400) + '.unopened .label{color:red}'.repeat(300);
const html = '<!DOCTYPE html><html><head><link data-cd-home-preload rel="preload" as="style" href="' + href + '"><link rel="stylesheet" href="' + href + '"></head><body><main id="cdHomeFunnel"><h1 class="heading">연이</h1></main></body></html>';

function withDist(run) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ggul-paint-'));
  try {
    mkdirSync(path.join(dir, 'css/shell'), { recursive: true });
    writeFileSync(path.join(dir, href), css);
    return run(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const firstSheet = (dir, result) => {
  const dom = new JSDOM(result);
  const reduced = dom.window.document.querySelector('link[rel=stylesheet]').getAttribute('href');
  dom.window.close();
  return readFileSync(path.join(dir, reduced), 'utf8');
};

test('the recorded home keeps layout, first-action styles and the original cascade fallback', async () => {
  await withDist(async dir => {
    const profile = record(html, [css], ['.heading']);
    const result = optimizeLegacyHomePaint(html, dir, profile);
    assert.notEqual(result, html);
    assert.equal(optimizeLegacyHomePaint(result, dir, profile), result);
    const page = new JSDOM(result, { runScripts: 'dangerously', url: 'https://local.invalid/ggulggul/' });
    const doc = page.window.document;
    const reduced = doc.querySelector('link[rel=stylesheet]').getAttribute('href');
    assert.equal(doc.querySelector('link[rel=preload]').getAttribute('href'), reduced);
    const sheet = firstSheet(dir, result);
    assert.ok(sheet.includes('.heading') && sheet.includes('.closed') && sheet.includes('.yh-smile') && sheet.includes('@keyframes'));
    assert.ok(!sheet.includes('.unopened'));
    assert.ok(doc.querySelector('noscript').textContent.includes(href));
    page.window.dispatchEvent(new page.window.Event('keydown'));
    assert.equal(doc.querySelector('link[rel=stylesheet]').nextElementSibling.getAttribute('href'), href);
    assert.equal(doc.querySelector('template'), null);
    await new Promise(resolve => page.window.addEventListener('load', resolve, { once: true }));
    page.window.close();
    const shared = new JSDOM(result, { runScripts: 'dangerously', url: 'https://local.invalid/ggulggul/?action=consult' });
    assert.equal(shared.window.document.querySelector('template'), null);
    await new Promise(resolve => shared.window.addEventListener('load', resolve, { once: true }));
    shared.window.close();
  });
});

test('after load the full sheets are prefetched before any gesture', async () => {
  await withDist(async dir => {
    const result = optimizeLegacyHomePaint(html, dir, record(html, [css], ['.heading']));
    const page = new JSDOM(result, { runScripts: 'dangerously', url: 'https://local.invalid/ggulggul/' });
    await new Promise(resolve => page.window.addEventListener('load', resolve, { once: true }));
    await new Promise(resolve => setTimeout(resolve, 300));
    const hint = page.window.document.querySelector('link[rel=prefetch]');
    assert.equal(hint?.getAttribute('href'), href);
    assert.ok(page.window.document.querySelector('template[data-home-workflow-css]'));
    page.window.close();
  });
});

test('edits after the capture keep the CSS they may need instead of switching the split off', () => {
  withDist(dir => {
    const profile = record(html, [css], ['.heading']);
    // New markup that is the first user of an old, unused rule.
    const added = html.replace('</h1>', '</h1><p class="unopened"><b class="label">새 안내</b></p>');
    const kept = firstSheet(dir, optimizeLegacyHomePaint(added, dir, profile));
    assert.ok(kept.includes('.unopened{') && kept.includes('.unopened .label'));
    // A rule written after the capture is unknown to it and stays.
    writeFileSync(path.join(dir, href), css + '.new-rule{color:blue}');
    const grown = firstSheet(dir, optimizeLegacyHomePaint(html, dir, profile));
    assert.ok(grown.includes('.new-rule') && !grown.includes('.unopened'));
  });
});

test('a recording in the old format never shortens anything', () => {
  withDist(dir => {
    const old = { structure: 'x', styles: {} };
    assert.equal(optimizeLegacyHomePaint(html, dir, old), html);
  });
});

test('deferred workflows keep their CSS import base and only the short sheet is preloaded', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ggul-style-hints-'));
  try {
    mkdirSync(path.join(dir, 'styles'), { recursive: true });
    const full = '/styles/saju-reading.css', base = '/styles/cosmic-main.css';
    const imported = '@import"./saju-compact.css";p{color:blue}' + '.hidden-reading{color:grey}'.repeat(40);
    const cosmic = 'p{color:blue}' + '.distant{color:grey}'.repeat(800);
    writeFileSync(path.join(dir, full), imported);
    writeFileSync(path.join(dir, base), cosmic);
    const page = '<html><head><link data-cd-home-preload rel="preload" as="style" href="' + base + '"><link rel="preload" href="' + base + '" as="style"><link rel="stylesheet" href="' + base + '"><link rel="stylesheet" href="' + full + '" media="print" onload="this.onload=null;this.media=\'all\'"></head><body><p id="cdHomeFunnel">운세</p></body></html>';
    const rendered = new JSDOM(optimizeLegacyHomePaint(page, dir, record(page, [imported, cosmic], ['p'])));
    const doc = rendered.window.document;
    assert.equal(doc.querySelectorAll('link[rel=preload]').length, 1);
    assert.equal(doc.querySelector('link[rel=preload]').getAttribute('href'), doc.querySelector('link[rel=stylesheet]').getAttribute('href'));
    const partial = doc.querySelector('link[media="print"]').getAttribute('href');
    assert.ok(partial.startsWith('/styles/first-'));
    assert.ok(readFileSync(path.join(dir, partial), 'utf8').includes('@import"./saju-compact.css";'));
    assert.equal(doc.querySelector('link[media="print"]').nextElementSibling.content.firstElementChild.getAttribute('href'), full);
    rendered.window.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
