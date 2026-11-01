import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSitemapPage, redirectingLinks } from '../../scripts/verify-sitemap-canonical.mjs';
import { probeEdge } from '../../scripts/seo/edge-probe.mjs';

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

test('edge probe reports slash 308, country 302 and crawler cookies from a worker', async () => {
  const workerSource = `export default { async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/' && req.cf?.country === 'US' && !/bot|Mediapartners/i.test(req.headers.get('user-agent'))) return new Response('', { status: 302, headers: { Location: '/en/' } });
    const res = await env.ASSETS.fetch(req);
    if (/Mediapartners/.test(req.headers.get('user-agent'))) return new Response(res.body, { status: res.status, headers: { 'Set-Cookie': 'cd_geo_country=US', 'Cache-Control': 'private' } });
    return res; } }`;
  const assets = { fetch: async (req) => new URL(req.url).pathname === '/saju' ? new Response('', { status: 308, headers: { Location: '/saju/' } }) : new Response('<html></html>', { status: 200 }) };
  const result = await probeEdge({ workerSource, assets });
  assert.deepEqual(result.slash308, ['/saju']);
  assert.deepEqual(result.country302, ['/ US']);
  assert.ok(result.crawlerCookie.length >= 1 && result.crawlerCookie.every((label) => label.includes('Mediapartners')));
});
