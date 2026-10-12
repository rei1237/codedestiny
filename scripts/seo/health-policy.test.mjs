import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectSitemapUrls, inspectPage, robotsAllows, sitemapDirectives } from './health-policy.mjs';

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
