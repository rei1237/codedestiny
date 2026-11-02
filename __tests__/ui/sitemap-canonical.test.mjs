import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSitemapPage, redirectingLinks } from '../../scripts/verify-sitemap-canonical.mjs';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { distAssets, probeEdge } from '../../scripts/seo/edge-probe.mjs';
import { RULES, inspectDist } from '../../scripts/seo/verify-dist.mjs';
import { renderRobotsTxt } from '../../lib/seo/robots-policy.mjs';

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
    if (/Mediapartners/.test(req.headers.get('user-agent'))) return new Response(res.body, { status: res.status, headers: { 'Set-Cookie': 'cd_geo_locale=en', 'Cache-Control': 'private, no-store' } });
    return res; } }`;
  const assets = { fetch: async (req) => new URL(req.url).pathname === '/saju' ? new Response('', { status: 308, headers: { Location: '/saju/' } }) : new Response('<html></html>', { status: 200 }) };
  const result = await probeEdge({ workerSource, assets });
  assert.deepEqual(result.slash308, ['/saju']);
  assert.deepEqual(result.country302, ['/ US']);
  assert.ok(result.crawlerCookie.length >= 1 && result.crawlerCookie.every((label) => label.includes('Mediapartners')));
});

test('the slash gate flags every 3xx except one absolute https 301, and never a 200 or 404', async () => {
  const workerFor = (status, location) => `export default { async fetch(req) {
    return new Response(${status === 200 || status === 404 ? "'x'" : 'null'}, { status: ${status}, headers: ${JSON.stringify(location ? { Location: location } : {})} }); } }`;
  const probe = (status, location) => probeEdge({ workerSource: workerFor(status, location), assets: { fetch: async () => new Response('', { status: 200 }) } });
  const all = ['/saju', '/en', '/ggulggul'];
  assert.deepEqual((await probe(301, '/saju/')).slash308, all, 'relative 301');
  assert.deepEqual((await probe(302, 'https://code-destiny.test/saju/')).slash308, all, '302');
  assert.deepEqual((await probe(308, 'https://code-destiny.test/saju/')).slash308, all, 'absolute 308');
  assert.deepEqual((await probe(301, 'http://code-destiny.test/saju/')).slash308, all, 'http 301');
  assert.deepEqual((await probe(301, 'https://code-destiny.test/saju/')).slash308, [], 'absolute 301');
  assert.deepEqual((await probe(200)).slash308, [], '200');
  assert.deepEqual((await probe(404)).slash308, [], '404');
});

test('crawler responses may carry cd_geo_country and private/no-cache: only cd_geo_locale or no-store is a violation', async () => {
  const workerFor = (headers) => `export default { async fetch(req, env) {
    const res = await env.ASSETS.fetch(req);
    return new Response(res.body, { status: res.status, headers: ${JSON.stringify(headers)} }); } }`;
  const assets = { fetch: async () => new Response('<html></html>', { status: 200 }) };
  const allowed = await probeEdge({ workerSource: workerFor({ 'Set-Cookie': 'cd_geo_country=US; Path=/', 'Cache-Control': 'private, no-cache' }), assets });
  assert.deepEqual(allowed.crawlerCookie, []);
  const locale = await probeEdge({ workerSource: workerFor({ 'Set-Cookie': 'cd_geo_locale=en; Path=/', 'Cache-Control': 'private' }), assets });
  assert.equal(locale.crawlerCookie.length, 4);
  const noStore = await probeEdge({ workerSource: workerFor({ 'Cache-Control': 'no-store' }), assets });
  assert.equal(noStore.crawlerCookie.length, 4);
});

test('crawler probe sends Google\'s real Search Console inspection UA, which the worker\'s bot regex does not exclude', async () => {
  const workerSource = `export default { async fetch(req, env) {
    const res = await env.ASSETS.fetch(req);
    if (/bot|crawler|spider|slurp|yeti|facebookexternalhit|kakaotalk-scrap/i.test(req.headers.get('user-agent') || '')) return res;
    return new Response(res.body, { status: res.status, headers: { 'Set-Cookie': 'cd_geo_locale=en; Path=/', 'Cache-Control': 'private, no-store' } }); } }`;
  const assets = { fetch: async () => new Response('<html></html>', { status: 200 }) };
  const { crawlerCookie } = await probeEdge({ workerSource, assets });
  assert.ok(crawlerCookie.includes('/ Google-InspectionTool'), JSON.stringify(crawlerCookie));
  assert.ok(crawlerCookie.includes('/saju/ Google-InspectionTool'), JSON.stringify(crawlerCookie));
  assert.ok(crawlerCookie.includes('/ Mediapartners-Google'), JSON.stringify(crawlerCookie));
});

// ── verify-dist: temporary dist fixtures ────────────────────────────────────────────────────────
const SITE = 'https://code-destiny.com';
const RULE_SUBSET = ['sitemap-page', 'sitemap-set', 'page-shape', 'internal-404', 'og-url'];
const KO_SAJU = '/%EC%82%AC%EC%A3%BC/';

const fixtureDirs = [];
test.after(() => { for (const dir of fixtureDirs) rmSync(dir, { recursive: true, force: true }); });

function writeDist(files) {
  const dir = mkdtempSync(join(tmpdir(), 'verify-dist-'));
  fixtureDirs.push(dir);
  for (const [path, content] of Object.entries(files)) {
    const file = join(dir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return dir;
}

const urlset = (paths) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${SITE}${p}</loc></url>`).join('')}</urlset>`;
const sitemapIndex = (names) => `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${names.map((n) => `<sitemap><loc>${SITE}/${n}</loc></sitemap>`).join('')}</sitemapindex>`;
const htmlPage = (path, { h1 = ['제목'], head = '', body = '<p>본문</p>' } = {}) =>
  `<!doctype html><html><head><title>${path}</title><link rel="canonical" href="${SITE}${path}">${head}</head><body>${h1.map((t) => `<h1>${t}</h1>`).join('')}${body}</body></html>`;

// 리디렉션 표는 dist/_worker.js 에서 읽는다. 워커 표 출발점 /moved, 동적 피드 /rss.xml, 그대로 통과시키는 fetch.
const FIXTURE_WORKER = 'const CONSOLIDATED_PAGE_REDIRECTS = {"/moved": "/a/"};\nconst DYNAMIC_FEED_PATHS = new Set(["/rss.xml"]);\nexport default { async fetch(request, env) { return env.ASSETS.fetch(request); } };\n';

function cleanFixture() {
  return {
    'sitemap.xml': urlset(['/a/', KO_SAJU]),
    'sitemap-index.xml': sitemapIndex(['sitemap-ko.xml']),
    'sitemap-ko.xml': urlset(['/a/', KO_SAJU]),
    '_redirects': '# no rules\n',
    '_worker.js': FIXTURE_WORKER,
    'a/index.html': htmlPage('/a/', {
      head: `<meta property="og:url" content="${SITE}/a/">`,
      body: '<a href="/사주/">사주</a><a href="/a/#top">위로</a><a href="/a/?action=openTarotModal">타로</a><a href="mailto:help@code-destiny.com">메일</a>',
    }),
    '사주/index.html': htmlPage(KO_SAJU, { body: '<a href="/a/">a</a>' }),
  };
}

function violatingFixture() {
  return {
    ...cleanFixture(),
    'sitemap.xml': urlset(['/a/', KO_SAJU, '/b/']),
    'a/index.html': htmlPage('/a/', {
      h1: ['하나', '둘'],
      head: `<meta property="og:url" content="${SITE}/">`,
      body: '<a href="/missing/">없는 쪽</a>',
    }),
    'b/index.html': htmlPage('/b/'),
  };
}

test('verify-dist passes a clean dist fixture', async () => {
  const dir = writeDist(cleanFixture());
  const result = await inspectDist({ distDir: dir, edge: false, rules: RULE_SUBSET });
  assert.deepEqual(result.failures, []);
  assert.equal(result.counts['internal-404'], 0);
});

test('verify-dist flags a violating page by rule id', async () => {
  const dir = writeDist(violatingFixture()); // /a/ 에 H1 2개, og:url=홈, /missing/ 링크, sitemap.xml 에만 있는 /b/
  const result = await inspectDist({ distDir: dir, edge: false, rules: RULE_SUBSET });
  assert.equal(result.counts['page-shape'], 1);
  assert.equal(result.counts['og-url'], 1);
  assert.equal(result.counts['internal-404'], 1);
  assert.equal(result.counts['sitemap-set'], 1);
});

test('og-url is a failing rule and og-home-title counts sub-pages that repeat the home og:title', async () => {
  assert.equal(RULES['og-url'], 'fail');
  assert.equal(RULES['og-home-title'], 'fail');
  const og = (title) => `<meta property="og:title" content="${title}">`;
  const files = (subTitle) => ({
    'sitemap.xml': urlset(['/', '/a/', '/b/']),
    'sitemap-index.xml': sitemapIndex(['sitemap-ko.xml']),
    'sitemap-ko.xml': urlset(['/', '/a/', '/b/']),
    '_redirects': '',
    'index.html': htmlPage('/', { head: og('꿀꿀 운세 홈') }),
    'a/index.html': htmlPage('/a/', { head: og(subTitle) }), // 홈 og:title 을 물려받은 쪽
    'b/index.html': htmlPage('/b/'), // og:title 이 없는 쪽은 상속이 아니므로 세지 않는다
  });
  const inherited = await inspectDist({ distDir: writeDist(files('꿀꿀 운세 홈')), edge: false, rules: ['og-home-title'] });
  assert.equal(inherited.counts['og-home-title'], 1, JSON.stringify(inherited.details['og-home-title']));
  assert.match(inherited.details['og-home-title'][0], /\/a\//);
  assert.equal(inherited.failures.length, 1);
  const own = await inspectDist({ distDir: writeDist(files('사주 풀이')), edge: false, rules: ['og-home-title'] });
  assert.equal(own.counts['og-home-title'], 0);
});

test('loc-to-file: percent-encoded Korean, .html and slashless locs map to their dist files', async () => {
  const locs = ['/a/', KO_SAJU, '/policy.html', '/plain'];
  const dir = writeDist({
    'sitemap.xml': urlset(locs),
    'sitemap-index.xml': sitemapIndex(['sitemap-ko.xml']),
    'sitemap-ko.xml': urlset(locs),
    '_redirects': '',
    '_worker.js': FIXTURE_WORKER,
    'a/index.html': htmlPage('/a/'),
    '사주/index.html': htmlPage(KO_SAJU),
    'policy.html': htmlPage('/policy.html'),
    'plain.html': htmlPage('/plain'),
  });
  const result = await inspectDist({ distDir: dir, edge: false, rules: ['sitemap-page', 'page-shape'] });
  assert.deepEqual(result.details['sitemap-page'], []);
  assert.deepEqual(result.failures, []);
  const missing = await inspectDist({ distDir: writeDist({ ...cleanFixture(), 'sitemap.xml': urlset(['/a/', KO_SAJU, '/gone/']) }), edge: false, rules: ['sitemap-page'] });
  assert.equal(missing.counts['sitemap-page'], 1);
  assert.match(missing.details['sitemap-page'][0], /\/gone\/: dist 파일 없음/);
});

test('internal links: fragments, functional queries, external hosts, mailto/tel, files and redirect sources are not 404', async () => {
  const dir = writeDist({
    ...cleanFixture(),
    '_redirects': '/legacy/*   /a/   301\n/old   /a/   301\n/old-guide*   /a/   301\n',
    'static.css': 'body{}',
    'plain.html': htmlPage('/plain'),
    'a/index.html': htmlPage('/a/', {
      body: [
        '<a href="#top">위로</a>', '<a href="/a/#top">위로</a>', '<a href="/a/?action=openTarotModal">타로</a>',
        '<a href="//cdn.example.com/missing/">cdn</a>', '<a href="https://example.com/missing/">외부</a>',
        '<a href="mailto:help@code-destiny.com">메일</a>', '<a href="tel:+8210">전화</a>',
        '<a href="/static.css">css</a>', '<a href="/plain">plain</a>', '<a href="/a">a</a>', `<a href="${SITE}${KO_SAJU}">사주</a>`,
        '<a href="/legacy/x/">옛</a>', '<a href="/old">옛</a>', '<a href="/old-guide/">splat</a>',
        '<a href="/moved">워커 표</a>', '<a href="/moved/">워커 표 슬래시</a>',
        '<a href="/api">api</a>', '<a href="/api/fortune?x=1">api</a>', '<a href="/rss.xml">피드</a>',
        '<a href="/missing/?ref=x">없음</a>', '<a href="/missing/#y">없음</a>',
        // `_redirects` 의 /old 는 /old/ 에 맞지 않는다(글자 그대로). /apix/ 는 /api/ 프록시가 아니다.
        '<a href="/old/">없음</a>', '<a href="/apix/">없음</a>',
      ].join(''),
    }),
  });
  const result = await inspectDist({ distDir: dir, edge: false, rules: ['internal-404'] });
  const missing = result.details['internal-404'].map((line) => line.split(' ')[0]).sort();
  assert.deepEqual(missing, ['/apix/', '/missing/', '/old/'], JSON.stringify(result.details['internal-404']));
});

test('sitemap-page flags a loc that is a worker-table source in either slash form, but not a slashed loc of an exact _redirects rule', async () => {
  const locs = ['/a/', '/moved/', '/old/'];
  const dir = writeDist({
    ...cleanFixture(),
    'sitemap.xml': urlset(locs), 'sitemap-ko.xml': urlset(locs),
    '_redirects': '/old   /a/   301\n',
    'moved/index.html': htmlPage('/moved/'), 'old/index.html': htmlPage('/old/'),
  });
  const result = await inspectDist({ distDir: dir, edge: false, rules: ['sitemap-page'] });
  assert.deepEqual(result.details['sitemap-page'], [`${SITE}/moved/: 리디렉션 출발점`]);
});

test('a dist without _redirects or _worker.js is one sitemap-page and one internal-404 failure, not a thrown stack trace', async () => {
  for (const missing of ['_redirects', '_worker.js']) {
    const { [missing]: _, ...files } = cleanFixture();
    const result = await inspectDist({ distDir: writeDist(files), edge: false, rules: ['sitemap-page', 'internal-404'] });
    assert.deepEqual(result.counts, { 'sitemap-page': 1, 'internal-404': 1 }, missing);
    assert.match(result.details['sitemap-page'][0], new RegExp(`리디렉션 표를 읽지 못함 — .*${missing.replace('.', '\\.')} 없음`));
    assert.equal(result.failures.length, 2);
  }
  const noTable = await inspectDist({ distDir: writeDist({ ...cleanFixture(), '_worker.js': 'export default {};' }), edge: false, rules: ['internal-404'] });
  assert.match(noTable.details['internal-404'][0], /CONSOLIDATED_PAGE_REDIRECTS/);
});

test('home-identity counts each missing representative page as a failure', async () => {
  const result = await inspectDist({ distDir: writeDist(cleanFixture()), edge: false, rules: ['home-identity'] });
  assert.equal(result.counts['home-identity'], 4);
  assert.equal(RULES['home-identity'], 'fail');
  assert.equal(result.failures.length, 1);
});

test('hreflang-sitemap splits HTML/sitemap differences and one-way sitemap annotations; duplicates are warnings', async () => {
  const alt = (lang, href) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${SITE}${href}" />`;
  const sitemap = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
    <url><loc>${SITE}/a/</loc>${alt('ko', '/a/')}${alt('ko-KR', '/a/')}${alt('en', '/en/a/')}${alt('x-default', '/a/')}</url>
    <url><loc>${SITE}/en/a/</loc>${alt('ko', '/a/')}${alt('en', '/en/a/')}${alt('x-default', '/a/')}</url>
    <url><loc>${SITE}/b/</loc></url>
    <url><loc>${SITE}/en/b/</loc>${alt('ko', '/b/')}${alt('en', '/en/b/')}</url></urlset>`;
  const link = (lang, href) => `<link rel="alternate" hreflang="${lang}" href="${SITE}${href}">`;
  const same = '<meta name="description" content="같은 설명">';
  const dir = writeDist({
    'sitemap.xml': sitemap, 'sitemap-index.xml': sitemapIndex(['sitemap-ko.xml']), 'sitemap-ko.xml': sitemap, '_redirects': '',
    'a/index.html': htmlPage('/a/', { head: link('ko', '/a/') + link('en', '/en/a/') + same }),
    'en/a/index.html': htmlPage('/en/a/', { head: link('ko', '/a/') + link('en', '/en/a/') + link('x-default', '/a/') + same }),
    'b/index.html': htmlPage('/b/'),
    'en/b/index.html': htmlPage('/en/b/', { head: link('ko', '/b/') + link('en', '/en/b/') }),
  });
  const result = await inspectDist({ distDir: dir, edge: false, rules: ['hreflang-sitemap', 'duplicate-title', 'duplicate-description'] });
  const kinds = result.details['hreflang-sitemap'].map((line) => line.split(' ')[0]).sort();
  assert.deepEqual(kinds, ['code-sitemap-only', 'one-way', 'xdefault-sitemap-only']);
  assert.ok(result.details['hreflang-sitemap'].includes(`one-way ${SITE}/en/b/ → ${SITE}/b/`));
  assert.equal(result.counts['duplicate-description'], 1);
  assert.equal(result.counts['duplicate-title'], 0);
  assert.deepEqual(result.failures, []);
  assert.equal(result.warnings.length, 2);
});

test('hreflang-sitemap: an HTML-only language is html-only, and a language whose href differs is one href-mismatch, not two findings', async () => {
  const alt = (lang, href) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${SITE}${href}" />`;
  const sitemap = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
    <url><loc>${SITE}/a/</loc>${alt('ko', '/a/')}${alt('en', '/en/a/')}</url>
    <url><loc>${SITE}/en/a/</loc>${alt('ko', '/a/')}${alt('en', '/en/a/')}</url></urlset>`;
  const link = (lang, href) => `<link rel="alternate" hreflang="${lang}" href="${SITE}${href}">`;
  const dir = writeDist({
    'sitemap.xml': sitemap, 'sitemap-index.xml': sitemapIndex(['sitemap-ko.xml']), 'sitemap-ko.xml': sitemap, '_redirects': '',
    'a/index.html': htmlPage('/a/', { head: link('ko', '/a/') + link('en', '/en/a/') + link('ja', '/ja/a/') }),
    'en/a/index.html': htmlPage('/en/a/', { head: link('ko', '/a/') + link('en', '/en/a2/') }),
  });
  const result = await inspectDist({ distDir: dir, edge: false, rules: ['hreflang-sitemap'] });
  assert.deepEqual(result.details['hreflang-sitemap'].sort(), [`href-mismatch ${SITE}/en/a/ [en]`, `html-only ${SITE}/a/ [ja]`]);
});

test('edge rules run the dist worker over emulated Pages assets, and are skipped without a worker', async () => {
  const dir = writeDist({
    ...cleanFixture(),
    'index.html': htmlPage('/'), 'saju/index.html': htmlPage('/saju/'), 'en/index.html': htmlPage('/en/'), 'ggulggul/index.html': htmlPage('/ggulggul/'),
    '_worker.js': 'export default { async fetch(request, env) { return env.ASSETS.fetch(request); } };',
  });
  const result = await inspectDist({ distDir: dir, rules: ['edge-slash-308', 'edge-country-302', 'edge-crawler-cookie'] });
  assert.deepEqual(result.details['edge-slash-308'], ['/saju', '/en', '/ggulggul']);
  assert.equal(result.counts['edge-country-302'], 0);
  assert.equal(result.counts['edge-crawler-cookie'], 0);
  assert.equal(result.failures.length, 1);
  assert.deepEqual(result.warnings, []);

  const skipped = await inspectDist({ distDir: dir, edge: false, rules: ['edge-slash-308'] });
  assert.deepEqual(skipped.details.edge, ['skipped']);
  assert.equal(skipped.counts['edge-slash-308'], undefined);
  const { '_worker.js': _, ...withoutWorker } = cleanFixture();
  const noWorker = await inspectDist({ distDir: writeDist(withoutWorker), rules: ['edge-slash-308'] });
  assert.deepEqual(noWorker.details.edge, ['skipped']);
});

test('distAssets emulates Pages static serving: 200 files, slashless-directory 308 with query, 404 for unknown, traversal, NUL and bad percent', async () => {
  const dir = writeDist({ ...cleanFixture(), 'plain.html': htmlPage('/plain'), 'font.woff2': 'x', 'site.webmanifest': '{}', 'clip.mp4': 'x' });
  const assets = distAssets(dir);
  const get = (path) => assets.fetch(new Request(`${SITE}${path}`));
  for (const path of ['/a/', KO_SAJU, '/plain', '/plain.html', '/a/index.html']) assert.equal((await get(path)).status, 200, path);
  const slashless = await get('/a?x=1');
  assert.equal(slashless.status, 308);
  assert.equal(slashless.headers.get('Location'), '/a/?x=1');
  for (const path of ['/nope', '/nope/', '/..%2F..%2Fetc%2Fhosts', '/%E0%A4%A', '/a%00']) assert.equal((await get(path)).status, 404, path);
  assert.equal((await get('/font.woff2')).headers.get('Content-Type'), 'font/woff2');
  assert.equal((await get('/site.webmanifest')).headers.get('Content-Type'), 'application/manifest+json');
  assert.equal((await get('/clip.mp4')).headers.get('Content-Type'), 'video/mp4');
});

test('the repository worker passes every edge rule', async () => {
  const dir = writeDist({
    'index.html': htmlPage('/'), 'saju/index.html': htmlPage('/saju/'), 'en/index.html': htmlPage('/en/'), 'ggulggul/index.html': htmlPage('/ggulggul/'),
  });
  const result = await probeEdge({ workerSource: readFileSync(new URL('../../public/_worker.js', import.meta.url), 'utf8'), assets: distAssets(dir) });
  assert.deepEqual(result, { slash308: [], country302: [], crawlerCookie: [] });
  for (const rule of ['edge-slash-308', 'edge-country-302', 'edge-crawler-cookie']) assert.equal(RULES[rule], 'fail', rule);
});

test('an unloadable dist worker is a warning, never a failure: a broken probe must not block postbuild', async () => {
  const dir = writeDist({ ...cleanFixture(), '_worker.js': 'import x from "./y.js";\nexport default app;\n' });
  const result = await inspectDist({ distDir: dir, rules: ['page-shape', 'edge-slash-308', 'edge-country-302', 'edge-crawler-cookie'] });
  assert.deepEqual(result.failures, []);
  assert.match(result.details.edge[0], /^error: /);
  for (const rule of ['edge-slash-308', 'edge-country-302', 'edge-crawler-cookie']) assert.equal(result.counts[rule], undefined);
  assert.equal(result.counts['page-shape'], 0);
  assert.ok(result.warnings.some((line) => line.startsWith('edge ')), JSON.stringify(result.warnings));
});

test('robots-policy fails when dist/robots.txt decides any sample differently from the policy module; the host is not compared', async () => {
  const policy = renderRobotsTxt();
  const check = async (robots) => inspectDist({ distDir: writeDist(robots == null ? cleanFixture() : { ...cleanFixture(), 'robots.txt': robots }), edge: false, rules: ['robots-policy'] });
  assert.equal(RULES['robots-policy'], 'fail');

  // 정본 그대로, 스테이징 호스트, 2026-11-01 운영본(그룹 18개·Host 줄)은 판정이 같다.
  for (const same of [policy, renderRobotsTxt('https://staging.example'), readFileSync(new URL('../fixtures/seo/robots-2026-11-01.txt', import.meta.url), 'utf8')]) {
    const result = await check(same);
    assert.deepEqual(result.failures, [], JSON.stringify(result.details['robots-policy']));
  }

  const dropped = await check(policy.replace(/^Disallow: \/\*\?auth=\n/m, ''));
  assert.equal(dropped.failures.length, 1);
  assert.match(dropped.details['robots-policy'].join('\n'), /\?auth=/);
  const lowerOnly = await check(`${policy}\nUser-agent: googlebot\nDisallow: /saju/\n`);
  assert.ok(lowerOnly.counts['robots-policy'] > 0, 'a lowercase googlebot group must count as Googlebot');
  const otherSitemap = await check(policy.replace('/sitemap-index.xml', '/sitemap.xml'));
  assert.match(otherSitemap.details['robots-policy'].join('\n'), /Sitemap/);
  assert.match((await check(null)).details['robots-policy'][0], /robots\.txt/);
});

// ── JSON-LD 정체성: 사이트 전체에서 @id 하나는 @type 하나, #organization 은 name 하나 ────────────
const ORG = `${SITE}/#organization`;
const WEBSITE = `${SITE}/#website`;
// 실제 빌드가 쓰는 꼴 그대로 <script> 안에서 `<` `>` `&` 를 \uXXXX 로 이스케이프한다.
const ldScript = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/[<>&]/g, (c) => '\\u' + `${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}</script>`;
const ldFixture = (pages) => {
  const paths = ['/', ...Object.keys(pages)];
  return {
    'sitemap.xml': urlset(paths),
    'sitemap-index.xml': sitemapIndex(['sitemap-ko.xml']),
    'sitemap-ko.xml': urlset(paths),
    '_redirects': '',
    'index.html': htmlPage('/'),
    ...Object.fromEntries(Object.entries(pages).map(([path, head]) => [`${path.slice(1)}index.html`, htmlPage(path, { head })])),
  };
};
const JSONLD_RULES = ['jsonld-syntax', 'jsonld-id-type', 'organization-name'];
const runLd = (pages) => inspectDist({ distDir: writeDist(ldFixture(pages)), edge: false, rules: JSONLD_RULES });

test('organization-name counts extra #organization names across pages, whether JSON-LD is an @graph, an array, or has angle brackets escaped', async () => {
  const result = await runLd({
    '/a/': ldScript({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Organization', '@id': ORG, name: '꿀꿀 운세' }] }),
    '/b/': ldScript([{ '@context': 'https://schema.org', '@type': 'Organization', '@id': ORG, name: 'CODE DESTINY', description: '<b>a & b</b>' }]),
    '/c/': ldScript({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Organization', '@id': ORG, name: '꿀꿀 운세' }] }),
  });
  assert.equal(result.counts['organization-name'], 1, JSON.stringify(result.details['organization-name']));
  assert.match(result.details['organization-name'][0], /\/b\/.*CODE DESTINY/); // 소수 쪽 값과 그 페이지를 가리킨다
  assert.equal(result.counts['jsonld-syntax'], 0);
  assert.equal(result.counts['jsonld-id-type'], 0);
});

test('jsonld-id-type counts one per @id declared with different @type sets; reference-only nodes and type order do not count', async () => {
  const result = await runLd({
    '/a/': ldScript({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite', '@id': WEBSITE, name: '꿀꿀 운세' }] }),
    '/b/': ldScript([{ '@context': 'https://schema.org', '@type': 'WebPage', '@id': WEBSITE }]),
    '/c/': ldScript({ '@type': 'WebPage', isPartOf: { '@id': WEBSITE }, publisher: { '@id': ORG } }), // 참조만
    '/d/': ldScript([{ '@type': ['Organization', 'LocalBusiness'], '@id': ORG }]),
    '/e/': ldScript({ '@graph': [{ '@type': ['LocalBusiness', 'Organization'], '@id': ORG }] }),
  });
  assert.equal(result.counts['jsonld-id-type'], 1, JSON.stringify(result.details['jsonld-id-type']));
  assert.match(result.details['jsonld-id-type'][0], /#website.*WebPage.*WebSite|#website.*WebSite.*WebPage/);
  assert.match(result.details['jsonld-id-type'][0], /\/a\/.*\/b\/|\/b\/.*\/a\//);
  assert.equal(result.counts['organization-name'], 0);
});

test('a JSON-LD declaration nested under a node (publisher with its own @id) is aggregated', async () => {
  const result = await runLd({
    '/a/': ldScript({ '@type': 'Article', publisher: { '@type': 'Organization', '@id': ORG, name: 'CODE DESTINY' } }),
    '/b/': ldScript({ '@graph': [{ '@type': 'Organization', '@id': ORG, name: '꿀꿀 운세' }] }),
  });
  assert.equal(result.counts['organization-name'], 1, JSON.stringify(result.details['organization-name']));
});

test('jsonld-syntax counts each unparsable JSON-LD script with its page', async () => {
  const broken = '<script type="application/ld+json">{"@type": "Organization", </script>';
  const result = await runLd({ '/a/': `${broken}${broken}`, '/b/': ldScript({ '@type': 'WebPage' }) });
  assert.equal(result.counts['jsonld-syntax'], 2, JSON.stringify(result.details['jsonld-syntax']));
  assert.match(result.details['jsonld-syntax'][0], /\/a\//);
});

test('references only: a site whose pages never declare @id nodes has no JSON-LD identity findings', async () => {
  const result = await runLd({ '/a/': ldScript({ '@type': 'WebPage', isPartOf: { '@id': WEBSITE }, publisher: { '@id': ORG } }) });
  assert.deepEqual(result.counts, { 'jsonld-syntax': 0, 'jsonld-id-type': 0, 'organization-name': 0 });
});

// ── jsonld-dates: datePublished·dateModified 는 ISO 8601 이고 검사 시각(now) 이하 ─────────────────
test('jsonld-dates counts future and unparsable dates on any node; valid, boundary and dateless pages are not counted', async () => {
  const now = new Date('2026-10-31T15:30:00Z'); // 2026-11-01 00:30 KST
  const pages = {
    '/a/': ldScript({ '@type': 'Article', datePublished: '2026-11-02T00:00:00+09:00', dateModified: '2026-11-01T00:30:00+09:00' }), // 미래 1
    '/b/': ldScript({ '@graph': [{ '@type': 'WebPage', publisher: { '@type': 'Organization' }, mainEntity: { '@type': 'Article', dateModified: '2026-13-45' } }] }), // 중첩·없는 날짜 1
    '/c/': ldScript([{ '@type': 'Article', datePublished: 'November 1, 2026' }]), // ISO 아님 1
    '/d/': ldScript({ '@type': 'WebPage', name: '날짜 없음' }),
    // 날짜만 있으면 그날 00:00 KST — UTC 자정(09:00 KST)으로 읽으면 미래가 된다.
    '/e/': ldScript({ '@type': 'Article', datePublished: '2026-06-21', dateModified: '2026-11-01' }),
    // 오프셋이 없으면 KST 로 읽는다(기계 시간대와 무관). now 와 같은 순간은 통과.
    '/f/': ldScript({ '@type': 'Article', datePublished: '2026-11-01T00:29:00', dateModified: '2026-10-31T15:30:00.000Z' }),
    // 날짜만 있는 원본을 new Date().toISOString() 으로 내보낸 값(UTC 자정 = 09:00 KST). 검사일과 같은 KST 날이면 통과.
    '/g/': ldScript({ '@type': 'Article', datePublished: '2026-11-01T00:00:00.000Z', dateModified: '2026-11-01T08:59:59+09:00' }),
  };
  const result = await inspectDist({ distDir: writeDist(ldFixture(pages)), edge: false, rules: ['jsonld-dates'], now });
  assert.equal(result.counts['jsonld-dates'], 3, JSON.stringify(result.details['jsonld-dates']));
  const joined = result.details['jsonld-dates'].join('\n');
  assert.match(joined, /\/a\/.*datePublished.*2026-11-02/);
  assert.match(joined, /\/b\/.*dateModified.*2026-13-45/);
  assert.match(joined, /\/c\/.*datePublished.*November/);
  assert.doesNotMatch(joined, /\/[defg]\//);
  // 같은 산출물을 하루 뒤에 검사하면 /a/ 도 과거다.
  const later = await inspectDist({ distDir: writeDist(ldFixture(pages)), edge: false, rules: ['jsonld-dates'], now: new Date('2026-11-02T00:00:00Z') });
  assert.equal(later.counts['jsonld-dates'], 2, JSON.stringify(later.details['jsonld-dates']));
});

// 등급을 바꾸는 커밋은 이 표도 함께 바꿔야 한다. fail 로 올리기 전에는 실제 build:cf dist 에서 0건인지 먼저 본다.
test('RULES grades are pinned rule by rule', () => {
  assert.deepEqual(RULES, {
    'sitemap-page': 'fail', 'sitemap-set': 'fail', 'page-shape': 'fail', 'internal-404': 'fail', 'home-identity': 'fail',
    'duplicate-title': 'warn', 'duplicate-description': 'warn', 'og-url': 'fail', 'og-home-title': 'fail', 'hreflang-sitemap': 'warn',
    'robots-policy': 'fail', 'jsonld-syntax': 'fail', 'jsonld-id-type': 'fail', 'organization-name': 'fail', 'jsonld-dates': 'fail',
    'edge-slash-308': 'fail', 'edge-country-302': 'fail', 'edge-crawler-cookie': 'fail',
  });
});

test('organization-name ties keep the first-seen name as the majority and report the other one', async () => {
  const result = await runLd({
    '/a/': ldScript({ '@graph': [{ '@type': 'Organization', '@id': ORG, name: '꿀꿀 운세' }] }),
    '/b/': ldScript({ '@graph': [{ '@type': 'Organization', '@id': ORG, name: 'CODE DESTINY' }] }),
  });
  assert.equal(result.counts['organization-name'], 1, JSON.stringify(result.details['organization-name']));
  assert.match(result.details['organization-name'][0], /\/b\/.*"CODE DESTINY" ≠ 최다 "꿀꿀 운세"/);
});

test('the same @id declared with the same @type on two pages is not a jsonld-id-type finding', async () => {
  const node = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': WEBSITE, name: '꿀꿀 운세' };
  const result = await runLd({ '/a/': ldScript(node), '/b/': ldScript({ '@graph': [node] }) });
  assert.deepEqual(result.counts, { 'jsonld-syntax': 0, 'jsonld-id-type': 0, 'organization-name': 0 });
});
