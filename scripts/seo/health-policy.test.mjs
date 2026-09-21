import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPage, robotsAllows, sitemapDirectives } from './health-policy.mjs';
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
