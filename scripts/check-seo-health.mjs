/* eslint-disable no-console */
import { mkdir, writeFile } from 'node:fs/promises';
import { collectSitemapUrls, inspectPage, robotsAllows, sitemapDirectives } from './seo/health-policy.mjs';

const BASE = (process.env.SITE_URL || 'https://code-destiny.com').replace(/\/$/, '');
const targets = ['/ggulggul/', '/about/', '/faq/', '/methodology/', '/yeongnyangi/', '/fusion-fortune/', '/fortune/2027/', '/saju/', '/manse/', '/ziwei/', '/sukuyo/', '/vedic/', '/astrology/',
  '/tarot/', '/compatibility/', '/today/', '/insights/', '/guides/', '/ja/', '/en/', '/zh/',
  '/ja/saju/', '/ja/vedic/', '/ja/sukuyo/', '/ja/ziwei/',
  '/fortune/today/', '/fortune/tomorrow/', '/fortune/weekly/', '/fortune/monthly/',
  '/fortune/tomorrow/rat/', '/fortune/tomorrow/tiger/', '/fortune/tomorrow/snake/', '/fortune/tomorrow/scorpio/'];
// A Yeti user-agent probe does not prove access from verified Naver crawler IPs.
const userAgent = 'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)';
const robotsAgents = ['googlebot', 'bingbot', 'yeti', 'oai-searchbot', 'perplexitybot'];
const privatePaths = ['/api/billing/', '/admin/', '/account/', '/checkout/', '/points/', '/results/', '/records/', '/yeongnyangi/library/', '/yeongnyangi/room/'];
const issues = [];
const rows = [];
async function get(path, probeUserAgent = userAgent) {
  const url = `${BASE}${path}`;
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': probeUserAgent } });
    return { url, status: response.status, html: await response.text(),
      xRobots: response.headers.get('x-robots-tag') || '', location: response.headers.get('location'),
      challenge: response.headers.get('cf-mitigated') };
  } catch (error) { return { url, status: 0, html: '', error: error.message }; }
}
const robots = await get('/robots.txt');
const sitemap = await get('/sitemap.xml');
if (robots.status !== 200 || !/^User-agent:/im.test(robots.html)) issues.push('robots missing or invalid');
if (sitemap.status !== 200 || !/<urlset\b/.test(sitemap.html)) issues.push('sitemap missing or invalid');
const urls = [...sitemap.html.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m => m[1].trim());
if (!urls.length || new Set(urls).size !== urls.length) issues.push('empty or duplicate sitemap URLs');
const declaredSitemaps = sitemapDirectives(robots.html);
if (!declaredSitemaps.length) issues.push('robots sitemap directive missing');
const declared = await collectSitemapUrls(declaredSitemaps, BASE,
  path => path === '/sitemap.xml' ? Promise.resolve(sitemap) : get(path));
const declaredUrls = declared.urls;
issues.push(...declared.issues);
// The canonical brand home is the root; a redirect to the app would lose this hub.
const rootRedirect = await get('/');
const rootIsLanding = rootRedirect.status === 200;
if (!rootIsLanding) issues.push('root must be the 200 canonical brand landing');
for (const path of privatePaths) {
  if (urls.some(url => new URL(url).pathname.startsWith(path))) issues.push(`private path in sitemap: ${path}`);
  for (const agent of robotsAgents) {
    if (robotsAllows(robots.html, path, agent)) issues.push(`private path allowed for ${agent}: ${path}`);
  }
}
for (const url of urls) {
  if (!declaredUrls.has(url)) issues.push(`URL absent from declared sitemaps: ${url}`);
}
for (const path of rootIsLanding ? ['/', ...targets] : targets) {
  const row = await get(path);
  row.indexable = urls.includes(row.url);
  row.issues = inspectPage({ ...row, indexable: row.indexable });
  if (!row.indexable) row.issues.push('critical landing missing from sitemap');
  for (const agent of robotsAgents) {
    if (row.indexable && !robotsAllows(robots.html, path, agent)) row.issues.push(`robots blocks indexed landing for ${agent}`);
  }
  rows.push({ ...row, html: undefined });
  issues.push(...row.issues.map(issue => `${path}: ${issue}`));
}
for (const url of urls) {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== BASE || parsed.search || parsed.hash) issues.push(`invalid sitemap URL: ${url}`);
    for (const agent of robotsAgents) {
      if (!robotsAllows(robots.html, parsed.pathname, agent)) issues.push(`sitemap URL blocked for ${agent}: ${parsed.pathname}`);
    }
  } catch { issues.push(`invalid sitemap URL: ${url}`); }
}
const crawlerProbes = [];
if (process.argv.includes('--probe-crawlers')) {
  for (const agent of robotsAgents) for (const path of ['/', '/faq/', '/saju/']) {
    const response = await get(path, agent);
    const probe = { agent, path, status: response.status, challenge: response.challenge || null,
      hasHtmlBody: /<body\b/i.test(response.html), hasBrand: response.html.includes('꿀꿀'),
      error: response.error || null };
    crawlerProbes.push(probe);
    if (probe.status !== 200 || probe.challenge === 'challenge' || !probe.hasHtmlBody) issues.push(`crawler UA probe failed: ${agent} ${path} HTTP ${probe.status}`);
  }
}
const report = { checkedAt: new Date().toISOString(), base: BASE, sitemapCount: urls.length,
  coverage: 'brand, service, locale and fortune landings; public and private robots rules for five search crawlers; declared sitemap coverage for every URL',
  userAgent, robotsAgents, limitation: 'User-agent probe only; verified crawler IP access and actual indexing are not measured', declaredSitemaps,
  sitemapFiles: declared.files, crawlerProbes, rootRedirect: { status: rootRedirect.status, location: rootRedirect.location }, rows, issues };
await mkdir('seo-qa/operations', { recursive: true });
await writeFile('seo-qa/operations/health.json', JSON.stringify(report, null, 2) + '\n');
console.log(`[seo-health] ${rows.length} landings, ${urls.length} sitemap URLs, ${issues.length} issues`);
issues.forEach(issue => console.error(issue));
process.exitCode = issues.length ? 1 : 0;
