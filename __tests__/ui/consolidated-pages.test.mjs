import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'public/_worker.js'), 'utf8');
const map = JSON.parse(source.match(/const CONSOLIDATED_PAGE_REDIRECTS = (\{[\s\S]*?\});/)[1]);
const worker = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;
test('home standalone entries skip only the marketing sheet, never tile payment gates', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const body = html.match(/function _isDirectConsultationEntry\(tile\)\{[\s\S]*?\n  \}/)[0];
  const direct = vm.runInNewContext('(' + body + ')');
  const tile = attributes => ({ matches: () => true, getAttribute: key => attributes[key] || null });
  assert.equal(direct(tile({ href: '/fortune-tea-house/' })), true);
  assert.equal(direct(tile({ href: '/neo-operation-room/', 'data-coin-cost': '100' })), false);
  assert.equal(direct(tile({ href: '/fortune-tea-house/', 'data-tile-lock-key': 'paid' })), false);
  assert.equal(direct(tile({ href: '/fortune-tea-house/', 'data-action': 'openLegacy' })), false);
  assert.equal(direct(tile({ href: '//example.com/' })), false);
});
test('every retired page redirects once to an existing destination and retains input', async () => {
  for (const [from, to] of Object.entries(map)) {
    for (const suffix of ['', '/']) {
      const response = await worker.fetch(new Request('https://code-destiny.com' + from + suffix + '?question=test&lang=ja'), {}, {});
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('location'), 'https://code-destiny.com' + to + '?question=test&lang=ja');
    }
    assert.equal(map[to.replace(/\/$/, '')], undefined);
    if (to !== '/ggulggul/') assert.ok(['js', 'tsx'].some(ext => fs.existsSync(path.join(root, 'app', to, 'page.' + ext))));
    assert.ok(!['js', 'tsx'].some(ext => fs.existsSync(path.join(root, 'app', from, 'page.' + ext))));
  }
});
test('consolidation cannot swallow payment, saved results, child routes or sitemap entries', () => {
  for (const url of ['/premium-unlock', '/premium/unknown', '/records', '/life-book-ai/result', '/checkout', '/__proto__']) assert.equal(Object.hasOwn(map, url), false);
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) assert.equal(Object.hasOwn(map, new URL(match[1]).pathname.replace(/\/$/, '')), false);
  assert.match(source, /Object\.hasOwn\(CONSOLIDATED_PAGE_REDIRECTS/);
});
