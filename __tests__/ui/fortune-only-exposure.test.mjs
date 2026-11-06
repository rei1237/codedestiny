import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const { JSDOM } = createRequire(import.meta.url)('jsdom');
const source = fs.readFileSync('public/_worker.js', 'utf8');
const worker = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;
// scripts/generate-sitemap.mjs noindexPathPrefixes 의 "선택형/놀이형 콘텐츠 임시 비노출" 항목을 옮겨 적은 것.
// 그쪽에 일시중지 경로를 더하면 여기에도 더한다(사이트맵·llms 단언은 사이트맵 소속으로도 한 번 더 막는다).
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
test('asset cache rules do not cover HTML directory routes', () => {
  for (const file of ['_headers', 'public/_headers']) {
    const text = fs.readFileSync(file, 'utf8');
    // Pages 는 같은 패턴의 블록을 모두 적용하므로 마지막 블록만 남기지 않고 이어 붙인다.
    const rules = new Map();
    for (const [, pattern, headers] of text.matchAll(/^(\/\S*)\r?\n((?:[ \t]+[^\r\n]+\r?\n?)*)/gm)) rules.set(pattern, (rules.get(pattern) ?? '') + headers);
    for (const pattern of ['/music/*', '/neo-operation-room/*', '/audio/*', '/DestinyCafe/*']) assert.ok(!rules.has(pattern), file + ': broad ' + pattern);
    for (const pattern of ['/neo-operation-room/*.webp', '/neo-operation-room/*.json']) {
      assert.match(rules.get(pattern) ?? '', /^[ \t]+Cache-Control: public, max-age=2592000/m, file + ': ' + pattern);
      assert.match(rules.get(pattern) ?? '', /^[ \t]+CDN-Cache-Control: public, max-age=604800\r?$/m, file + ': CDN ' + pattern);
    }
    assert.match(rules.get('/neo-operation-room/strategy-books*') ?? '', /^[ \t]+Cache-Control: no-store/m, file + ': strategy-books no-store');
    assert.match(rules.get('/neo-operation-room/strategy-books*') ?? '', /^[ \t]+CDN-Cache-Control: no-store/m, file + ': strategy-books CDN no-store');
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
test('verified SNULIFE reading context can enter Secret House without reopening other paused routes', async () => {
  const requested = [];
  const env = { ASSETS: { fetch: async request => { requested.push(new URL(request.url)); return new Response('secret-house'); } } };
  const response = await worker.fetch(new Request('https://code-destiny.com/secret-house_real.html?entry=snulife&profileId=gift'), env, {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'secret-house');
  assert.equal(requested.length, 1);
  assert.equal(requested[0].pathname, '/secret-house_real.html');
  const other = await worker.fetch(new Request('https://code-destiny.com/destiny-poker.html?entry=snulife'), env, {});
  assert.equal(other.status, 302);
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
test('llms files list only sitemap URLs and no paused path', () => {
  const sitemap = new Set([...fs.readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname.replace(/\/$/, '')));
  for (const file of ['llms.txt', 'llms-full.txt', 'public/llms.txt', 'public/llms-full.txt']) {
    // 마크다운 링크 `(https://…)`와 맨 URL `: https://…` 를 모두 센다. `#refund-policy` 같은 앵커는 pathname만 본다.
    // 맨 URL 바로 뒤 문장 부호(`… /about/.`)는 URL 이 아니므로 마지막 글자에서 뺀다.
    for (const [, url] of fs.readFileSync(file, 'utf8').matchAll(/(https:\/\/code-destiny\.com(?:[^\s)]*[^\s).,;:!?'"])?)/g)) {
      const path = new URL(url).pathname.replace(/\/$/, '');
      assert.ok(!paused.includes(path), file + ': ' + path);
      assert.ok(path === '' || sitemap.has(path), file + ': 사이트맵 밖 ' + path);
    }
  }
});
