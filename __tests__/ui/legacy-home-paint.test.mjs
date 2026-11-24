import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { digest, homeStructure, optimizeLegacyHomePaint } from '../../scripts/optimize-legacy-home-paint.mjs';

test('the recorded home keeps layout, first-action styles and the original cascade fallback', async () => {
  const dir = mkdtempSync(path.join(tmpdir(),'ggul-paint-'));
  try {
    const href = '/css/shell/home-0123456789abcdef.css';
    mkdirSync(path.join(dir,'css/shell'),{recursive:true});
    const first = '.heading{font-size:30px}';
    const css = first + '.closed{display:none}.yh-smile{color:pink}@keyframes blink{to{opacity:0}}' + '.unopened{color:red}'.repeat(40);
    writeFileSync(path.join(dir,href),css);
    const html = '<!DOCTYPE html><html><head><link data-cd-home-preload rel="preload" as="style" href="' + href + '"><link rel="stylesheet" href="' + href + '"></head><body><main id="cdHomeFunnel"><h1 class="heading">연이</h1></main></body></html>';
    const original = new JSDOM(html,{includeNodeLocations:true});
    const structure = homeStructure(original.window.document);
    original.window.close();
    const profile = {structure,styles:{[href]:{sha256:digest(css),ranges:[[0,first.length]]}}};
    const result = optimizeLegacyHomePaint(html,dir,profile);
    assert.notEqual(result,html);
    assert.equal(optimizeLegacyHomePaint(result,dir,profile),result);
    const page = new JSDOM(result,{runScripts:'dangerously',url:'https://local.invalid/ggulggul/'});
    const doc = page.window.document;
    const reduced = doc.querySelector('link[rel=stylesheet]').getAttribute('href');
    assert.equal(doc.querySelector('link[rel=preload]').getAttribute('href'),reduced);
    const sheet = readFileSync(path.join(dir,reduced),'utf8');
    assert.ok(sheet.includes('.heading') && sheet.includes('.closed') && sheet.includes('.yh-smile') && sheet.includes('@keyframes'));
    assert.ok(!sheet.includes('.unopened'));
    assert.ok(doc.querySelector('noscript').textContent.includes(href));
    page.window.dispatchEvent(new page.window.Event('keydown'));
    assert.equal(doc.querySelector('link[rel=stylesheet]').nextElementSibling.getAttribute('href'),href);
    assert.equal(doc.querySelector('template'),null);
    await new Promise(resolve => page.window.addEventListener('load',resolve,{once:true}));
    page.window.close();
    const shared = new JSDOM(result,{runScripts:'dangerously',url:'https://local.invalid/ggulggul/?action=consult'});
    assert.equal(shared.window.document.querySelector('template'),null);
    await new Promise(resolve => shared.window.addEventListener('load',resolve,{once:true}));
    shared.window.close();
    assert.equal(optimizeLegacyHomePaint(html.replace('class="heading"','class="new"'),dir,profile),html.replace('class="heading"','class="new"'));
    writeFileSync(path.join(dir,href),css + '.new-rule{color:blue}');
    assert.equal(optimizeLegacyHomePaint(html,dir,profile),html);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('deferred workflows keep their CSS import base and only the short sheet is preloaded', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ggul-style-hints-'));
  try {
    mkdirSync(path.join(dir,'styles'), {recursive:true});
    const full = '/styles/saju-reading.css', base = '/styles/cosmic-main.css';
    const needed = 'p{color:blue}';
    const imported = '@import"./saju-compact.css";' + needed + '.hidden-reading{color:grey}'.repeat(40);
    const cosmic = needed + '.distant{color:grey}'.repeat(40);
    writeFileSync(path.join(dir,full),imported);
    writeFileSync(path.join(dir,base),cosmic);
    const html = '<html><head><link data-cd-home-preload rel="preload" as="style" href="' + base + '"><link rel="preload" href="' + base + '" as="style"><link rel="stylesheet" href="' + base + '"><link rel="stylesheet" href="' + full + '" media="print" onload="this.onload=null;this.media=\'all\'"></head><body><p id="cdHomeFunnel">운세</p></body></html>';
    const before = new JSDOM(html,{includeNodeLocations:true});
    const structure = homeStructure(before.window.document);
    before.window.close();
    const profile = {structure,styles:{
      [base]:{sha256:digest(cosmic),ranges:[[0,needed.length]]},
      [full]:{sha256:digest(imported),ranges:[[imported.indexOf(needed),imported.indexOf(needed)+needed.length]]},
    }};
    const rendered = new JSDOM(optimizeLegacyHomePaint(html,dir,profile));
    const doc = rendered.window.document;
    assert.equal(doc.querySelectorAll('link[rel=preload]').length,1);
    assert.equal(doc.querySelector('link[rel=preload]').getAttribute('href'),doc.querySelector('link[rel=stylesheet]').getAttribute('href'));
    const partial = doc.querySelector('link[media="print"]').getAttribute('href');
    assert.ok(partial.startsWith('/styles/first-'));
    assert.ok(readFileSync(path.join(dir,partial),'utf8').includes('@import"./saju-compact.css";'));
    assert.equal(doc.querySelector('link[media="print"]').nextElementSibling.content.firstElementChild.getAttribute('href'),full);
    rendered.window.close();
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
