import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const { JSDOM } = createRequire(import.meta.url)('jsdom');
const source = fs.readFileSync('public/_worker.js', 'utf8');
const worker = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;
const paused = ['/mini-games', '/destiny-poker', '/secret-house_real', '/saju/love-simulation'];
test('paused content headers cover every entry within the Pages rule limit', () => {
  for (const file of ['_headers', 'public/_headers']) {
    const text = fs.readFileSync(file, 'utf8');
    const rules = [...text.matchAll(/^(\/\S*)\r?\n((?:[ \t]+[^\r\n]+\r?\n?)*)/gm)];
    assert.ok(rules.length <= 100, file + ': ' + rules.length);
    for (const path of paused) for (const suffix of ['', '/', '.html', '/index.html']) {
      assert.ok(rules.some(([, pattern, headers]) =>
        (pattern === path + suffix || (pattern.endsWith('*') && (path + suffix).startsWith(pattern.slice(0, -1)))) &&
        /X-Robots-Tag: noindex/.test(headers)), file + ': ' + path + suffix);
    }
  }
});
test('paused content is absent from published sitemaps and poker HTML is noindex', () => {
  for (const file of ['sitemap.xml', 'public/sitemap.xml', 'sitemap-ko.xml', 'public/sitemap-ko.xml']) {
    const xml = fs.readFileSync(file, 'utf8');
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const path = new URL(match[1]).pathname.replace(/\.html$/, '').replace(/\/$/, '');
      assert.ok(!paused.includes(path), file + ': ' + path);
    }
  }
  for (const file of ['destiny-poker.html', 'public/destiny-poker.html']) {
    assert.match(fs.readFileSync(file, 'utf8'), /<meta name="robots" content="noindex, nofollow">/);
  }
});
test('paused content cannot be opened through a direct public URL', async () => {
  for (const path of paused) for (const suffix of ['', '/', '.html', '/index.html']) {
    const response = await worker.fetch(new Request('https://code-destiny.com' + path + suffix + '?action=start'), {}, {});
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), 'https://code-destiny.com/ggulggul/');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  }
});
test('normal fortune routes and archives remain accessible', async () => {
  const env = { ASSETS: { fetch: async () => new Response('fixture') } };
  for (const path of ['/records/', '/saju/', '/tarot/', '/master-love-codex/result/']) {
    const response = await worker.fetch(new Request('https://code-destiny.com' + path), env, {});
    assert.equal(response.status, 200, path);
  }
});
test('published home and curated search do not advertise paused content', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync('js/core/service-registry.js','utf8'), sandbox);
  assert.ok(!sandbox.window.__cdServiceRegistry.some(item => item.featureKey === 'love-code'));
  for (const file of ['index.html','public/index.html','public/en/index.html','public/ja/index.html','public/zh/index.html','public/zh-tw/index.html']) {
    const dom = new JSDOM(fs.readFileSync(file,'utf8'));
    for (const link of dom.window.document.querySelectorAll('a[href]')) {
      const path = new URL(link.getAttribute('href'), 'https://code-destiny.com').pathname.replace(/\.html$/, '').replace(/\/$/, '');
      assert.ok(!paused.includes(path), file + ': ' + path);
    }
    dom.window.close();
  }
});
