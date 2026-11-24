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
