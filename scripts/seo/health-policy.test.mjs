import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectSitemapUrls, getCanonical, getH1s, getHreflang, getInternalLinks, getJsonLd, getMeta, getTitle,
  hasNoindex, inspectPage, parseHeaderRobotsRules, parseSitemapAlternates, robotsAllows, sitemapDirectives,
} from './health-policy.mjs';

test('declared index reaches child URLs without treating sitemap files as pages', async () => {
  const base = 'https://example.com';
  const fixtures = {
    '/index.xml': '<sitemapindex><sitemap><loc>https://example.com/ko.xml</loc></sitemap><sitemap><loc>https://example.com/index.xml</loc></sitemap></sitemapindex>',
    '/ko.xml': '<urlset><url><loc>https://example.com/saju/</loc></url></urlset>',
  };
  const fetched = [];
  const result = await collectSitemapUrls([`${base}/index.xml`], base, async path => {
    fetched.push(path);
    return { status: 200, html: fixtures[path] };
  });
  assert.deepEqual([...result.urls], [`${base}/saju/`]);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(fetched, ['/index.xml', '/ko.xml']);
});

test('foreign children are not fetched and failing child responses remain errors', async () => {
  const result = await collectSitemapUrls(['https://other.test/map.xml', 'https://example.com/missing.xml'],
    'https://example.com', async path => {
      assert.equal(path, '/missing.xml');
      return { status: 404, html: '<html>Not found</html>' };
    });
  assert.equal(result.issues.length, 2);
  assert.equal(result.urls.size, 0);
});
test('locale sitemap declarations are accepted; comments and substring mentions are not', () => {
  assert.deepEqual(sitemapDirectives('# Sitemap: https://example.com/sitemap.xml\nSitemap: https://example.com/sitemap-ko.xml\nsitemap: https://example.com/sitemap-ja.xml # locale\nSitemap: https://example.com/sitemap-ko.xml'),
    ['https://example.com/sitemap-ko.xml', 'https://example.com/sitemap-ja.xml']);
  assert.deepEqual(sitemapDirectives('Allow: /sitemap.xml\nSitemap: /relative.xml'), []);
});
const url = 'https://code-destiny.com/saju/';
const html = `<html><head><title>Saju</title><link href='${url}' rel='canonical'><meta content='Guide' name='description'></head></html>`;
test('200 is insufficient: header and meta noindex are detected', () => {
  assert.deepEqual(inspectPage({ url, status: 200, html }), []);
  assert.ok(inspectPage({ url, status: 200, html, xRobots: 'noindex' }).includes('unexpected noindex'));
  assert.ok(inspectPage({ url, status: 200, html: html.replace('</head>', '<meta content="none" name="googlebot"></head>') }).includes('unexpected noindex'));
});
test('redirect, duplicate and foreign canonical fail', () => {
  assert.ok(inspectPage({ url, status: 301, html }).length);
  assert.ok(inspectPage({ url, status: 200, html: html.replace(url, 'https://example.com/') }).length);
  assert.ok(inspectPage({ url, status: 200, html: html.replace('</head>', `<link rel="canonical" href="${url}"></head>`) }).length);
});
test('crawler-specific group, longest path and allow tie', () => {
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /saju/', '/saju/'), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nUser-agent: Googlebot\nAllow: /', '/saju/'), true);
  assert.equal(robotsAllows('User-agent: *\nAllow: /\nDisallow: /saju/', '/saju/'), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /saju/\nAllow: /saju/', '/saju/'), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /*?v=', '/about/?v=123'), false);
  assert.equal(robotsAllows('User-agent: Googlebot\nDisallow:\nUser-agent: *\nDisallow: /', '/saju/'), true);
});

test('Yeti exclusions are checked independently of Googlebot and wildcard access', () => {
  const robots = 'User-agent: *\nAllow: /\nUser-agent: Googlebot\nAllow: /\nUser-agent: Yeti\nDisallow: /fortune/\nAllow: /fortune/tomorrow/rat/';
  assert.equal(robotsAllows(robots, '/fortune/tomorrow/tiger/', 'googlebot'), true);
  assert.equal(robotsAllows(robots, '/fortune/tomorrow/tiger/', 'Yeti'), false);
  assert.equal(robotsAllows(robots, '/fortune/tomorrow/rat/', 'yeti'), true);
});

test('duplicate metadata is detected without counting scripts or comments', () => {
  const duplicate = html.replace('</head>', '<TITLE>Other</TITLE><meta name="DESCRIPTION" content="Other"></head>');
  const issues = inspectPage({ url, status: 200, html: duplicate });
  assert.ok(issues.includes('title count 2'));
  assert.ok(issues.includes('description count 2'));
  const quoted = html.replace('</head>', '<!-- <title>comment</title> --><script>const example = "<title>example</title>";</script></head>');
  assert.deepEqual(inspectPage({ url, status: 200, html: quoted }), []);
});

test('shared parsers read canonical, hreflang, H1 and meta as arrays', () => {
  const html = '<title> A  B </title><link rel="canonical" href="https://code-destiny.com/a/"><link rel="alternate" hreflang="ko" href="https://code-destiny.com/a/"><meta property="og:url" content="https://code-destiny.com/"><h1>x</h1><h1>y</h1>';
  assert.equal(getTitle(html), 'A B');
  assert.equal(getTitle('<p>no title</p>'), '');
  assert.deepEqual(getCanonical(html), ['https://code-destiny.com/a/']);
  assert.deepEqual(getHreflang(html), [{ lang: 'ko', href: 'https://code-destiny.com/a/' }]);
  assert.deepEqual(getH1s(html), ['x', 'y']);
  assert.deepEqual(getMeta(html, 'og:url'), ['https://code-destiny.com/']);
});
test('getJsonLd flattens arrays and @graph, keeps escaped text, and reports parse errors', () => {
  const ld = (s) => `<script type="application/ld+json">${s}</script>`;
  const { nodes, errors } = getJsonLd(ld('[{"@id":"#a","@type":"Thing"}]') + ld('{"@graph":[{"@id":"#b","name":"\\u003c/script>"}]}') + ld('{bad'));
  assert.deepEqual(nodes.map((n) => n['@id']), ['#a', '#b']);
  assert.equal(nodes[1].name, '</script>');
  assert.equal(errors.length, 1);
});
test('getInternalLinks ignores fragments, functional schemes and other hosts', () => {
  const html = ['/a/', '#top', '/a/#x', 'mailto:x@y', 'tel:1', '//cdn.example.com/a', 'https://example.com/b', 'https://code-destiny.com/c/?action=openTarotModal']
    .map((href) => `<a href="${href}">x</a>`).join('');
  assert.deepEqual(getInternalLinks(html, 'https://code-destiny.com'), ['/a/', '/a/', '/c/?action=openTarotModal']);
});
test('getInternalLinks reads href itself, not data-*-href attributes that follow it', () => {
  const html = '<a class="tile" href="/palm-reading/" data-fallback-href="/x/" data-service-detail-href="/services/palm-reading/">손금</a>';
  assert.deepEqual(getInternalLinks(html, 'https://code-destiny.com'), ['/palm-reading/']);
});
test('getInternalLinks skips markup built inside <script> strings', () => {
  const html = `<script>el.innerHTML = '<a class="x" href="' + safeUrl + '">공유</a>';</script><a href="/real/">진짜</a>`;
  assert.deepEqual(getInternalLinks(html, 'https://code-destiny.com'), ['/real/']);
});
test('parseSitemapAlternates maps each loc to its xhtml:link alternates', () => {
  const xml = '<url><loc>https://code-destiny.com/a/</loc><xhtml:link rel="alternate" hreflang="x-default" href="https://code-destiny.com/a/"/></url>';
  assert.deepEqual(parseSitemapAlternates(xml).get('https://code-destiny.com/a/'), [{ lang: 'x-default', href: 'https://code-destiny.com/a/' }]);
});
test('hasNoindex reads robots and googlebot meta in either attribute order', () => {
  assert.equal(hasNoindex('<meta name="robots" content="index,follow">'), false);
  assert.equal(hasNoindex('<meta content="NOINDEX, nofollow" name="robots">'), true);
  assert.equal(hasNoindex('<meta name="googlebot" content="noindex">'), true);
});
test('parseHeaderRobotsRules keeps only X-Robots-Tag rules on path patterns', () => {
  const text = '# c\n/private/*\n  X-Robots-Tag: NoIndex\n/other\n  Cache-Control: no-store\n*.js\n  X-Robots-Tag: none\n';
  assert.deepEqual(parseHeaderRobotsRules(text), [{ pattern: '/private/*', value: 'noindex' }]);
});

test('getHreflang decodes entities like getCanonical and sitemap alternates', () => {
  const html = '<link rel="canonical" href="https://code-destiny.com/a/?b=1&amp;c=2"><link rel="alternate" hreflang="ko" href="https://code-destiny.com/a/?b=1&amp;c=2">';
  assert.deepEqual(getHreflang(html), [{ lang: 'ko', href: 'https://code-destiny.com/a/?b=1&c=2' }]);
  assert.equal(getHreflang(html)[0].href, getCanonical(html)[0]);
});
test('getJsonLd keeps nested @graph shapes: arrays, graph in graph, bare containers dropped, containers with properties kept', () => {
  const ld = (s) => `<script type="application/ld+json">${s}</script>`;
  const html = ld('[{"@graph":[{"@id":"#in-array"}]}]')
    + ld('{"@graph":[{"@id":"#outer","@graph":[{"@id":"#inner"}]}]}')
    + ld('{"@context":"https://schema.org","@graph":[{"@id":"#ctx-child"}]}')
    + ld('{"name":"own-props","@graph":[{"@id":"#own-child"}]}');
  const { nodes, errors } = getJsonLd(html);
  assert.deepEqual(errors, []);
  assert.deepEqual(nodes.map((n) => n['@id'] ?? n.name), ['#in-array', '#outer', '#inner', '#ctx-child', 'own-props', '#own-child']);
});
