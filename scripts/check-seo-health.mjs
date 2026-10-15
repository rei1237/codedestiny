/* eslint-disable no-console */
import { mkdir, writeFile } from 'node:fs/promises';
import { collectSitemapUrls, inspectPage, robotsAllows, sitemapDirectives } from './seo/health-policy.mjs';

const BASE = (process.env.SITE_URL || 'https://code-destiny.com').replace(/\/$/, '');
const targets = ['/ggulggul/', '/saju/', '/manse/', '/ziwei/', '/sukuyo/', '/vedic/', '/astrology/',
  '/tarot/', '/compatibility/', '/today/', '/insights/', '/guides/', '/ja/', '/en/', '/zh/',
  '/ja/saju/', '/ja/vedic/', '/ja/sukuyo/', '/ja/ziwei/',
  '/fortune/today/', '/fortune/tomorrow/', '/fortune/weekly/', '/fortune/monthly/',
  '/fortune/tomorrow/rat/', '/fortune/tomorrow/tiger/', '/fortune/tomorrow/snake/', '/fortune/tomorrow/scorpio/'];
// A Yeti user-agent probe does not prove access from verified Naver crawler IPs.
const userAgent = 'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)';
const robotsAgents = ['googlebot', 'yeti'];
const issues = [];
const rows = [];
async function get(path) {
  const url = `${BASE}${path}`;
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': userAgent } });
    return { url, status: response.status, html: await response.text(),
      xRobots: response.headers.get('x-robots-tag') || '', location: response.headers.get('location') };
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
// The root is either the 200 brand landing (then audited like any landing) or the
// legacy permanent redirect to the /ggulggul/ app entry. Anything else is a defect.
const rootRedirect = await get('/');
const rootIsLanding = rootRedirect.status === 200;
if (!rootIsLanding && (rootRedirect.status !== 301 || new URL(rootRedirect.location || '/', BASE).href !== `${BASE}/ggulggul/`)) {
  issues.push('root must be the 200 brand landing or permanently redirect to /ggulggul/');
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
const report = { checkedAt: new Date().toISOString(), base: BASE, sitemapCount: urls.length,
  coverage: 'critical landing and Naver fortune sample; robots and declared sitemap coverage for every sitemap URL',
  userAgent, robotsAgents, limitation: 'User-agent probe only; verified crawler IP access and actual indexing are not measured', declaredSitemaps,
  sitemapFiles: declared.files, rootRedirect: { status: rootRedirect.status, location: rootRedirect.location }, rows, issues };
await mkdir('seo-qa/operations', { recursive: true });
await writeFile('seo-qa/operations/health.json', JSON.stringify(report, null, 2) + '\n');
console.log(`[seo-health] ${rows.length} landings, ${urls.length} sitemap URLs, ${issues.length} issues`);
issues.forEach(issue => console.error(issue));
process.exitCode = issues.length ? 1 : 0;
