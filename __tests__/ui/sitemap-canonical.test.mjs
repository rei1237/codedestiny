import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSitemapPage, redirectingLinks } from '../../scripts/verify-sitemap-canonical.mjs';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
    if (/Mediapartners/.test(req.headers.get('user-agent'))) return new Response(res.body, { status: res.status, headers: { 'Set-Cookie': 'cd_geo_country=US', 'Cache-Control': 'private' } });
    return res; } }`;
  const assets = { fetch: async (req) => new URL(req.url).pathname === '/saju' ? new Response('', { status: 308, headers: { Location: '/saju/' } }) : new Response('<html></html>', { status: 200 }) };
  const result = await probeEdge({ workerSource, assets });
  assert.deepEqual(result.slash308, ['/saju']);
  assert.deepEqual(result.country302, ['/ US']);
  assert.ok(result.crawlerCookie.length >= 1 && result.crawlerCookie.every((label) => label.includes('Mediapartners')));
});

test('crawler probe sends Google\'s real Search Console inspection UA, which the worker\'s bot regex does not exclude', async () => {
  const workerSource = `export default { async fetch(req, env) {
    const res = await env.ASSETS.fetch(req);
    if (/bot|crawler|spider|slurp|yeti|facebookexternalhit|kakaotalk-scrap/i.test(req.headers.get('user-agent') || '')) return res;
    return new Response(res.body, { status: res.status, headers: { 'Set-Cookie': 'cd_geo_country=US; Path=/', 'Cache-Control': 'private, no-store' } }); } }`;
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

function writeDist(files) {
  const dir = mkdtempSync(join(tmpdir(), 'verify-dist-'));
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

function cleanFixture() {
  return {
    'sitemap.xml': urlset(['/a/', KO_SAJU]),
    'sitemap-index.xml': sitemapIndex(['sitemap-ko.xml']),
    'sitemap-ko.xml': urlset(['/a/', KO_SAJU]),
    '_redirects': '# no rules\n',
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
        '<a href="/legacy/x/">옛</a>', '<a href="/old">옛</a>', '<a href="/old/">옛</a>', '<a href="/old-guide/">splat</a>',
        '<a href="/missing/?ref=x">없음</a>', '<a href="/missing/#y">없음</a>',
      ].join(''),
    }),
  });
  const result = await inspectDist({ distDir: dir, edge: false, rules: ['internal-404'] });
  assert.equal(result.counts['internal-404'], 1, JSON.stringify(result.details['internal-404']));
  assert.match(result.details['internal-404'][0], /^\/missing\/ /);
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
  assert.equal(result.warnings.length, 1);

  // distAssets itself: percent-decoded paths, slashless directory 308, unknown path and traversal 404.
  const assets = distAssets(dir);
  const status = async (path) => (await assets.fetch(new Request(`${SITE}${path}`))).status;
  assert.equal(await status(KO_SAJU), 200);
  assert.equal(await status('/a'), 308);
  assert.equal(await status('/nope'), 404);
  assert.equal(await status('/..%2F..%2Fetc%2Fhosts'), 404);
  assert.equal(await status('/%E0%A4%A'), 404);

  const skipped = await inspectDist({ distDir: dir, edge: false, rules: ['edge-slash-308'] });
  assert.deepEqual(skipped.details.edge, ['skipped']);
  assert.equal(skipped.counts['edge-slash-308'], undefined);
  const noWorker = await inspectDist({ distDir: writeDist(cleanFixture()), rules: ['edge-slash-308'] });
  assert.deepEqual(noWorker.details.edge, ['skipped']);
});

test('an unloadable dist worker is a warning, never a failure: warn-graded edge rules must not block postbuild', async () => {
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
