import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STATIC_POLICY_ROUTES } from '../../lib/navigation/static-policy-routes.mjs';
const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'public/_worker.js'), 'utf8');
const map = JSON.parse(source.match(/const CONSOLIDATED_PAGE_REDIRECTS = (\{[\s\S]*?\});/)[1]);
const worker = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;
// Policy canonical pages import these shared content modules; keep the source,
// while every HTTP visit to its old public address permanently redirects.
const policyAliases = new Map(STATIC_POLICY_ROUTES.flatMap(route => route.aliases.map(alias => [alias, route.canonical + '/'])));
test('every retired page redirects once to an existing destination and retains input', async () => {
  for (const [from, to] of Object.entries(map)) {
    for (const suffix of ['', '/']) {
      const response = await worker.fetch(new Request('https://code-destiny.com' + from + suffix + '?question=test&lang=ja'), {}, {});
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('location'), 'https://code-destiny.com' + to + '?question=test&lang=ja');
    }
    assert.equal(map[to.replace(/\/$/, '')], undefined);
    if (to !== '/ggulggul/') assert.ok(['js', 'tsx'].some(ext => fs.existsSync(path.join(root, 'app', to, 'page.' + ext))));
    if (!policyAliases.has(from)) assert.ok(!['js', 'tsx'].some(ext => fs.existsSync(path.join(root, 'app', from, 'page.' + ext))));
  }
});

test('policy redirects match the shared alias registry and leave localized policies alone', async () => {
  for (const [alias, canonical] of policyAliases) assert.equal(map[alias], canonical);
  for (const pathname of ['/en/privacy-policy/', '/ja/terms-of-service/', '/zh/contact/']) {
    const response = await worker.fetch(new Request('https://code-destiny.com' + pathname), assets, {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
  }
});
test('consolidation cannot swallow payment, saved results, child routes or sitemap entries', () => {
  for (const url of ['/premium-unlock', '/premium/unknown', '/records', '/life-book-ai/result', '/checkout', '/__proto__']) assert.equal(Object.hasOwn(map, url), false);
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) assert.equal(Object.hasOwn(map, new URL(match[1]).pathname.replace(/\/$/, '')), false);
  assert.match(source, /Object\.hasOwn\(CONSOLIDATED_PAGE_REDIRECTS/);
});

const assets = { ASSETS: { fetch: async () => new Response('<html>public fixture</html>', { headers: { 'Content-Type': 'text/html' } }) } };

test('public content versions collapse once without changing meaningful query bytes', async () => {
  for (const [input, expected] of [
    ['/?v=old', '/'],
    ['/index.html?v=old', '/'],
    ['/ggulggul/?v=old', '/ggulggul/'],
    ['/insights/?v=first&topic=tarot&v=second', '/insights/?topic=tarot'],
    ['/insights/?topic=tarot&v=old&ref=a%2Bb%20c', '/insights/?topic=tarot&ref=a%2Bb%20c'],
    ['/zh-tw/sukuyo/?lang=zh-TW&v=old', '/zh-tw/sukuyo/?lang=zh-TW'],
    ['/fortune/tomorrow/rat/?v=old', '/fortune/tomorrow/rat/'],
    ['/fortune/date/2026-10-17/rat/?v=old', '/fortune/date/2026-10-17/rat/'],
    ['/saju/?%76=old&action=existing', '/saju/?action=existing'],
    ['/saju/basic/?v=old&ref=article', '/saju/?ref=article'],
    ['/kkul-kkul-unse/?v=old&utm_source=naver', '/?utm_source=naver'],
  ]) for (const method of ['GET', 'HEAD']) {
    const response = await worker.fetch(new Request('https://code-destiny.com' + input, { method }), assets, {});
    assert.equal(response.status, 301, input);
    assert.equal(response.headers.get('location'), 'https://code-destiny.com' + expected, input);
    const final = await worker.fetch(new Request(response.headers.get('location'), { method }), assets, {});
    assert.equal(final.status, 200, expected);
    assert.equal(final.headers.get('location'), null, expected);
  }
});

test('cache normalization does not rewrite assets, private or unknown routes or write requests', async () => {
  for (const input of ['/assets/app.js?v=old', '/auth/callback/?v=old&code=existing', '/checkout/?v=old', '/records/?v=old', '/life-book-ai/result/?v=old&id=existing', '/ziwei/chart/?v=old', '/saju/basic/play/?v=old', '/unknown/?v=old', '/sajux/?v=old', '/insights/?v=old&signature=a%2Bb', '/saju/?v=old&paymentId=existing']) {
    const response = await worker.fetch(new Request('https://code-destiny.com' + input), assets, {});
    assert.equal(response.headers.get('location'), null, input);
  }
  for (const method of ['POST', 'PUT']) {
    const response = await worker.fetch(new Request('https://code-destiny.com/insights/?v=old', { method }), assets, {});
    assert.equal(response.headers.get('location'), null, method);
  }
});

test('root action, question and payment return compatibility keeps every input', async () => {
  for (const [input, expected] of [
    ['/?action=openTarotModal&v=old', '/ggulggul/?action=openTarotModal&v=old'],
    ['/?question=career', '/yeongnyangi/?question=career'],
    ['/?paymentId=existing&code=success&v=old', '/ggulggul/?paymentId=existing&code=success&v=old'],
  ]) {
    const response = await worker.fetch(new Request('https://code-destiny.com' + input), assets, {});
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), 'https://code-destiny.com' + expected);
  }
});
