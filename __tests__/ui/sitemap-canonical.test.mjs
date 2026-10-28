import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSitemapPage, redirectingLinks } from '../../scripts/verify-sitemap-canonical.mjs';

const loc = 'https://code-destiny.com/faq/';
const page = (head) => `<html><head>${head}</head><body></body></html>`;

test('a sitemap page needs exactly one self canonical and no noindex meta', () => {
  assert.deepEqual(checkSitemapPage(page(`<link rel="canonical" href="${loc}">`), loc), []);
  assert.equal(checkSitemapPage(page('<link rel="canonical" href="https://code-destiny.com/faq">'), loc).length, 1);
  assert.equal(checkSitemapPage(page(`<link rel="canonical" href="${loc}"><link rel="canonical" href="${loc}">`), loc).length, 1);
  assert.equal(checkSitemapPage(page(''), loc).length, 1);
  assert.equal(checkSitemapPage(page(`<link rel="canonical" href="${loc}"><meta name="robots" content="noindex, follow">`), loc).length, 1);
});

test('internal links to redirect sources are caught; functional query links and other paths are not', () => {
  const sources = { exact: new Set(['/index.html', '/old-guide/']), prefixes: ['/legacy/'] };
  const html = [
    '<a href="/index.html">홈</a>',
    '<a class="x" href="https://code-destiny.com/old-guide/#top">옛 안내</a>',
    '<a href="/legacy/a/">옛 경로</a>',
    '<a href="/index.html?action=openTarotModal">타로</a>',
    '<a href="/">홈</a>',
    '<a href="//cdn.example.com/index.html">외부</a>',
    '<a href="https://example.com/index.html">외부</a>',
  ].join('');
  assert.deepEqual(redirectingLinks(html, sources), ['/index.html', '/old-guide/', '/legacy/a/']);
});
