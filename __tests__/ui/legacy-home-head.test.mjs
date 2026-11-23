import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { optimizeLegacyHomeHead } from '../../scripts/optimize-legacy-home-head.mjs';

function withFixture(run) {
  const dir = mkdtempSync(path.join(tmpdir(), 'legacy-entry-assets-'));
  const write = (file, data) => {
    const target = path.join(dir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, data);
  };
  const page = head => '<!doctype html><html lang="ko"><head><meta charset="utf-8">' + head + '</head><body><main id="cdHomeFunnel">꿀꿀운세</main></body></html>';
  try { run({ dir, write, page }); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('packaging keeps encoding, boot order, dynamic links and CSS cascade boundaries', () => withFixture(({ dir, write, page }) => {
  write('/js/core/auth-hint.js', 'window.events.push("boot");');
  write('/styles/yehwa-home.css', 'h1{color:red}');
  write('/styles/home-finder.css', 'h1{color:blue}');
  write('/styles/my-garden.css', 'h1{color:green}');
  const original = page('<script>window.events=[]</script><script src="/js/core/auth-hint.js"></script><script>window.events.push("ready")</script>' +
    '<link rel="stylesheet" href="/styles/yehwa-home.css"><link rel="stylesheet" href="/styles/home-finder.css">' +
    '<link id="dialog-style" rel="stylesheet" href="/styles/payment-moonlight.css"><link rel="stylesheet" href="/styles/my-garden.css">' +
    '<noscript><link rel="stylesheet" href="/styles/noscript.css"></noscript>');
  const packed = optimizeLegacyHomeHead(original, dir);
  const dom = new JSDOM(packed, { runScripts: 'dangerously' });
  try {
    const document = dom.window.document;
    assert.deepEqual(Array.from(dom.window.events), ['boot', 'ready']);
    assert.ok(packed.indexOf('<meta charset="utf-8">') < 1024);
    assert.deepEqual(Array.from(document.querySelectorAll('head style'), node => node.textContent),
      ['h1{color:red}\nh1{color:blue}', 'h1{color:green}']);
    assert.equal(document.querySelector('#dialog-style').getAttribute('href'), '/styles/payment-moonlight.css');
    assert.ok(packed.indexOf('id="dialog-style"') < packed.indexOf('h1{color:green}'));
    assert.ok(packed.includes('<noscript><link rel="stylesheet" href="/styles/noscript.css"></noscript>'));
    assert.equal(optimizeLegacyHomeHead(packed, dir), packed);
  } finally { dom.window.close(); }
}));

test('nested font imports register each face once at the final cascade position and conditional or relative resources remain intact', () => withFixture(({ dir, write, page }) => {
  write('/styles/core-ui.css', '@import"./brand-typography.css";.home{color:blue}');
  write('/styles/brand-typography.css', '@import"./fonts-ui.generated.css";:root{--font-body:Original}');
  write('/styles/fonts-ui.generated.css', '@font-face{font-family:Original;src:url(/fonts/original.woff2)}');
  write('/styles/home-finder.css', 'a{background:url(../art.webp)}');
  write('/styles/yehwa-home.css', '.home{color:navy}\n'.repeat(700));
  const original = page('<link rel="stylesheet" href="/styles/core-ui.css"><link rel="stylesheet" href="/styles/yehwa-home.css"><link rel="stylesheet" href="/styles/brand-typography.css"><link rel="stylesheet" href="/styles/home-finder.css"><script defer src="/js/core/auth-hint.js"></script>');
  const packed = optimizeLegacyHomeHead(original, dir);
  const dom = new JSDOM(packed);
  try {
    const document = dom.window.document;
    const bundle = document.querySelector('link[rel=stylesheet][href^="/css/shell/home-"]').getAttribute('href');
    const bytes = readFileSync(path.join(dir, bundle), 'utf8');
    assert.ok(bytes.includes(':root{--font-body:Original}'));
    assert.ok(bytes.indexOf('.home{color:blue}') < bytes.indexOf('.home{color:navy}'));
    assert.equal(bytes.split('@font-face').length - 1, 1);
    assert.ok(bytes.lastIndexOf('.home{color:navy}') < bytes.indexOf('@font-face'));
    assert.ok(bytes.indexOf('@font-face') < bytes.lastIndexOf(':root{--font-body:Original}'));
    assert.ok(!bytes.includes('@import'));
    assert.ok(document.querySelector('link[rel=stylesheet][href="/styles/home-finder.css"]'));
    assert.ok(document.querySelector('script[defer][src="/js/core/auth-hint.js"]'));
    assert.equal(optimizeLegacyHomeHead(original.replace('cdHomeFunnel', 'otherEntry'), dir), original.replace('cdHomeFunnel', 'otherEntry'));
  } finally { dom.window.close(); }
}));
