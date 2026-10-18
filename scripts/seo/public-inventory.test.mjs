import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLink, exclusionReason, inspectHtml, sitemapPaths, fetchPage, census, classifyPage, analyzeRows, inventoryCsv, packReport, unpackReport } from '../seo-public-inventory.mjs';

test('public links lose queries/fragments and private routes/assets are never fetched', () => {
  assert.equal(normalizeLink('/saju/?birth=19900101&token=secret#result'), '/saju/');
  assert.equal(normalizeLink('https://other.example/saju/'), null);
  assert.equal(normalizeLink('javascript:alert(1)'), null);
  assert.equal(normalizeLink(undefined), null);
  assert.equal(normalizeLink(''), null);
  for (const path of ['/api/version', '/payment/', '/yeongnyangi/result/', '/en/yeongnyangi/library/', '/gift/secret']) assert.ok(exclusionReason(path));
  assert.ok(exclusionReason('/images/yeoni.webp'));
  assert.equal(exclusionReason('/ziwei/chart/'), null);
  assert.equal(exclusionReason('/fortune/tomorrow/rat/'), null);
});

test('HTML evidence distinguishes visible text, metadata and public links', () => {
  const html = '<title>사주 &amp; 타로</title><meta name="description" content="공개 설명"><link rel="canonical" href="https://code-destiny.com/saju/"><main><h1>사주</h1><h1 class="sr-only">숨긴 제목</h1><p>고유 본문</p><script>private()</script><a href="/tarot/?question=secret">타로</a><a href="https://other.example/">외부</a></main>';
  const result = inspectHtml(html, 'https://code-destiny.com/saju/');
  assert.deepEqual(result.titles, ['사주 & 타로']);
  assert.deepEqual(result.h1, ['사주']);
  assert.deepEqual(result.canonicals, ['/saju/']);
  assert.deepEqual(result.links, ['/tarot/']);
  assert.equal(result.visibleTextLength, '사주 고유 본문 타로 외부'.length);
  assert.deepEqual(inspectHtml('<section class="sr-only"><h1>숨긴 부모</h1></section><h1>가시 제목</h1>', 'https://code-destiny.com/').h1, ['가시 제목']);
  assert.deepEqual(sitemapPaths('<url><loc>https://code-destiny.com/saju/</loc></url><loc>https://code-destiny.com/saju/</loc>'), ['/saju/']);
});

test('redirect audit stops before private endpoints and records redirect loops', async () => {
  const called = [];
  const toPrivate = await fetchPage('/legacy/', { fetchImpl: async url => {
    called.push(url); return new Response(null, { status: 301, headers: { location: '/api/private?token=secret' } });
  } });
  assert.equal(toPrivate.fetchError, 'redirect-to-excluded-route');
  assert.deepEqual(called, ['https://code-destiny.com/legacy/']);
  assert.equal(toPrivate.redirects[0].target, '/api/private');
  const loop = await fetchPage('/loop/', { fetchImpl: async () => new Response(null, { status: 301, headers: { location: '/loop/' } }) });
  assert.equal(loop.fetchError, 'redirect-loop');
});

test('census follows discovered public links with bounded concurrency and honest unknowns', async () => {
  let active = 0; let peak = 0;
  const requested = [];
  const fetchImpl = async url => {
    requested.push(new URL(url).pathname); active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1)); active--;
    const path = new URL(url).pathname;
    return new Response(`<html lang="ko"><title>${path}</title><meta name="description" content="설명"><link rel="canonical" href="${url}"><main><h1>${path}</h1><p>각 페이지 ${path}</p>${path === '/' ? '<a href="/unique/?token=secret">고유 서비스</a><a href="/api/private/">API</a>' : ''}</main></html>`, { headers: { 'content-type': 'text/html' } });
  };
  const report = await census(['/'], { live: true, concurrency: 2, fetchImpl });
  assert.ok(peak <= 2);
  assert.ok(requested.includes('/unique/'));
  assert.ok(!requested.includes('/api/private/'));
  assert.equal(report.completeWithinPublicBoundary, true);
  const unique = report.rows.find(row => row.path === '/unique/');
  assert.equal(unique.indexing, '미확인');
  assert.equal(unique.searchTraffic, '미확인');
  assert.equal(unique.backlinks, '미확인');
  assert.equal(unique.decision, '유지');
  assert.equal(unique.inboundCount, 1);
  assert.ok(inventoryCsv(report).includes('"/unique/"'));
  const packed = packReport(report);
  const restored = unpackReport(JSON.parse(JSON.stringify(packed)));
  assert.equal(restored.rows.length, report.rows.length);
  for (let index = 0; index < report.rows.length; index++) {
    for (const [key, value] of Object.entries(report.rows[index])) assert.deepEqual(restored.rows[index][key], value, `compact evidence lost ${key}`);
  }
});

test('low traffic/short content never causes deletion and request ceilings stay explicit', async () => {
  assert.equal(classifyPage({ path: '/ziwei/chart/', status: 200, issues: [], html: { visibleTextLength: 50 }, searchTraffic: 0 }).decision, '유지');
  assert.equal(classifyPage({ path: '/kkul-kkul-unse/' }).target, '/');
  const report = await census(['/'], { live: true, maxPages: 1, fetchImpl: async () => new Response('', { status: 404 }) });
  assert.equal(report.fetchedCount, 1);
  assert.equal(report.completeWithinPublicBoundary, false);
  assert.ok(report.pendingCount > 0);
});

test('intentional noindex tools are preserved; sitemap/noindex conflicts are actionable', () => {
  const rows = [
    { path: '/calculator/', status: 200, inSitemap: false, xRobotsTag: 'noindex, follow', html: { robots: [], titles: [], descriptions: [], h1: [], canonicals: [] } },
    { path: '/published/', status: 200, inSitemap: true, xRobotsTag: 'noindex', html: { robots: [] } },
  ];
  analyzeRows(rows);
  assert.equal(rows[0].decision, '유지');
  assert.deepEqual(rows[0].issues, []);
  assert.deepEqual(rows[1].issues, ['sitemap-url-noindex']);
});

test('language, image attribute and alternate-link evidence distinguishes missing from decorative', () => {
  const html = `<html lang="zh-Hant"><head><title>命運</title><meta name="description" content="說明"><link rel="canonical" href="https://code-destiny.com/zh-tw/"><link rel="alternate" hreflang="ko" href="https://code-destiny.com/"><link rel="alternate" hreflang="zh-TW" href="https://code-destiny.com/zh-tw/"></head><body><main><h1>命運</h1><img src="/images/decor.webp?token=secret" alt="" width="100" height="80"><img src="/images/missing.webp?private=value"><img src="/images/fill.webp" alt="吉祥物" style="aspect-ratio:1"></main></body></html>`;
  const evidence = inspectHtml(html, 'https://code-destiny.com/zh-tw/');
  assert.equal(evidence.lang, 'zh-Hant');
  assert.equal(evidence.images.total, 3);
  assert.equal(evidence.images.emptyAltCount, 1);
  assert.deepEqual(evidence.images.missingAlt, [{ index: 1, src: '/images/missing.webp' }]);
  assert.deepEqual(evidence.images.missingDimensions.map(image => image.index), [1, 2]);
  assert.equal(JSON.stringify(evidence).includes('secret'), false);
  const rows = [{ path: '/zh-tw/', finalPath: '/zh-tw/', status: 200, html: evidence }];
  analyzeRows(rows);
  assert.ok(!rows[0].issues.includes('html-lang-route-mismatch'));
  assert.ok(rows[0].issues.includes('img-alt-attribute-missing'));
  assert.ok(rows[0].issues.includes('img-intrinsic-dimensions-missing-review-css'));
  assert.ok(!rows[0].issues.includes('hreflang-return-link-missing'), 'unobserved target is not evidence of a missing return link');
});

test('alternate language pairs require a reciprocal link and indexable fetched target', () => {
  const make = (path, lang, head) => ({ path, finalPath: path, status: 200, html: inspectHtml(`<html lang="${lang}"><title>Public ${path}</title><meta name="description" content="Description"><link rel="canonical" href="https://code-destiny.com${path}">${head}<main><h1>${path}</h1></main></html>`, `https://code-destiny.com${path}`) });
  const rows = [make('/', 'ko', '<link rel="alternate" hreflang="en" href="https://code-destiny.com/en/">'), make('/en/', 'en', '<meta name="robots" content="noindex">')];
  analyzeRows(rows);
  assert.ok(rows[0].issues.includes('hreflang-target-not-indexable'));
  assert.ok(rows[0].issues.includes('hreflang-return-link-missing'));
  rows[1] = make('/en/', 'en', '<link rel="alternate" hreflang="ko" href="https://code-destiny.com/">');
  analyzeRows(rows);
  assert.deepEqual(rows[0].issues, []);
  assert.deepEqual(rows[1].issues, []);
});
