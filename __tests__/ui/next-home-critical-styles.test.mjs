import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initialStyles, optimizeNextHomeStyles } from '../../scripts/optimize-next-home-styles.mjs';

test('critical home styles retain matching states, module interactions and Unicode font subsets', () => {
  const source = [
    '.home_page__123{color:navy}',
    '.home_dialog__456{color:plum}',
    '.md\\:grid:hover{display:grid}',
    ':where(.other,p){font-size:16px}',
    '.entirely-unused{color:red}',
    '@media(min-width:900px){.absent{display:none}}',
    '@font-face{font-family:display;src:url(ordinary.woff2);unicode-range:U+AC00-D7A3}',
    '@font-face{font-family:display;src:url(other.woff2);unicode-range:U+0400-04FF}',
    '@keyframes fade{from{opacity:0}to{opacity:1}}',
  ].join('');
  const output = initialStyles(source, new Set(['home_page__123','home_*','md:grid']), ['달'.codePointAt(0)]);
  assert.match(output, /home_dialog__456/);
  assert.ok(output.includes('.md\\:grid:hover'));
  assert.ok(output.includes(':where(.other,p)'));
  assert.match(output, /ordinary\.woff2/);
  assert.match(output, /@keyframes fade/);
  assert.doesNotMatch(output, /entirely-unused|\.absent|other\.woff2/);
});

test('home export leaves original sheets dormant and styles the first-visit consent banner', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'next-home-styles-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['yeongnyangi', '_next/static/css', 'assets/fonts/home']) mkdirSync(path.join(root, dir), { recursive: true });
  const cssPath = '/_next/static/css/abc.css';
  const original = '<link rel="stylesheet" href="' + cssPath + '" data-precedence="next"/>';
  const html = '<html><head>' + original + '</head><body><main class="home">오늘</main></body></html>';
  writeFileSync(path.join(root, cssPath), '.home{color:#111}.AnalyticsConsent_banner__abc{position:fixed}.unused{color:red}');
  for (const route of ['index.html', 'yeongnyangi/index.html']) writeFileSync(path.join(root, route), html);
  for (const page of ['entry', 'yeongnyangi']) writeFileSync(path.join(root, 'assets/fonts/home', page + '.css'), '');
  optimizeNextHomeStyles(root);
  const result = readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(result, /rel="stylesheet" media="print" disabled data-cd-home-deferred/, 'print media keeps dormant sheets behind the LCP image');
  assert.ok(result.includes('<noscript>' + original + '</noscript>'));
  assert.ok(result.indexOf('preloadHomeFloral') > -1 && result.indexOf('preloadHomeFloral') < result.indexOf('data-cd-home-critical'), 'floral hint runs before the blocking sheet');
  assert.doesNotMatch(readFileSync(path.join(root, 'yeongnyangi/index.html'), 'utf8'), /preloadHomeFloral/);
  const href = result.match(/data-cd-home-critical href="([^"]+)"/)[1];
  assert.match(readFileSync(path.join(root, href), 'utf8'), /AnalyticsConsent_banner__abc\{position:fixed\}/);
  assert.doesNotMatch(readFileSync(path.join(root, href), 'utf8'), /\.unused\{/);
});

test('server-rendered popular TOP5 skeleton keeps its whole block and the glyphs of rows rendered after hydration', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'next-home-pop5-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['yeongnyangi', '_next/static/css', 'assets/fonts/home']) mkdirSync(path.join(root, dir), { recursive: true });
  const cssPath = '/_next/static/css/def.css';
  const link = '<link rel="stylesheet" href="' + cssPath + '" data-precedence="next"/>';
  const page = body => '<html><head>' + link + '</head><body><main class="home">' + body + '</main></body></html>';
  writeFileSync(path.join(root, cssPath), [
    '.home{color:#111}.cd-pop5{min-height:1px}.cd-pop5__rank{color:gold}.cd-pop5__tag{color:plum}',
    '.cd-pop5:not([data-cd-pop5-state=ready]) .cd-pop5__title{font-family:system-ui}',
    '@font-face{font-family:CodeDestinyBody;src:url(tag.woff2);unicode-range:U+CD94}',
    '@font-face{font-family:CodeDestinySerifKR;src:url(serif-tag.woff2);unicode-range:U+CD94}',
  ].join(''));
  writeFileSync(path.join(root, 'index.html'), page('<section class="cd-pop5"><h2 class="cd-pop5__title">TOP</h2></section>'));
  writeFileSync(path.join(root, 'yeongnyangi/index.html'), page('달'));
  for (const name of ['entry', 'yeongnyangi']) writeFileSync(path.join(root, 'assets/fonts/home', name + '.css'), '');
  optimizeNextHomeStyles(root);
  const critical = name => {
    const href = readFileSync(path.join(root, name), 'utf8').match(/data-cd-home-critical href="([^"]+)"/)[1];
    return readFileSync(path.join(root, href), 'utf8');
  };
  const home = critical('index.html');
  assert.match(home, /.cd-pop5__rank{color:gold}/);
  assert.match(home, /.cd-pop5__tag{color:plum}/);
  assert.match(home, /:not\(\[data-cd-pop5-state=ready\]\) \.cd-pop5__title\{font-family:system-ui\}/,'skeleton title keeps a device font before hydration');
  assert.match(home, /tag.woff2/, '"추천" glyph range stays although the skeleton never shows it');
  assert.doesNotMatch(home, /serif-tag.woff2/, 'families the TOP5 never draws drop its late glyph ranges');
  assert.doesNotMatch(critical('yeongnyangi/index.html'), /cd-pop5|tag.woff2/);
});
