/* eslint-disable no-console */
import { mkdir, writeFile } from 'node:fs/promises';
import { inspectPage, robotsAllows, sitemapDirectives } from './seo/health-policy.mjs';

const BASE = (process.env.SITE_URL || 'https://code-destiny.com').replace(/\/$/, '');
const targets = ['/', '/saju/', '/manse/', '/ziwei/', '/sukuyo/', '/vedic/', '/astrology/',
  '/tarot/', '/compatibility/', '/today/', '/insights/', '/guides/', '/ja/', '/en/', '/zh/',
  '/ja/saju/', '/ja/vedic/', '/ja/sukuyo/', '/ja/ziwei/'];
const issues = [];
const rows = [];
async function get(path) {
  const url = `${BASE}${path}`;
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'CodeDestiny-SEO-Health/1.0' } });
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
const declaredUrls = new Set();
for (const url of declaredSitemaps) {
  const parsed = new URL(url);
  if (parsed.origin !== BASE || parsed.search || parsed.hash) {
    issues.push(`unexpected declared sitemap URL: ${url}`);
    continue;
  }
  const entry = url === sitemap.url ? sitemap : await get(parsed.pathname);
  if (entry.status !== 200 || !/<urlset\b/.test(entry.html)) {
    issues.push(`declared sitemap missing or invalid: ${url}`);
    continue;
  }
  for (const match of entry.html.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)) declaredUrls.add(match[1].trim());
}
for (const url of urls) {
  if (!declaredUrls.has(url)) issues.push(`URL absent from declared sitemaps: ${url}`);
}
for (const path of targets) {
  const row = await get(path);
  row.indexable = urls.includes(row.url);
  row.issues = inspectPage({ ...row, indexable: row.indexable });
  if (!row.indexable) row.issues.push('critical landing missing from sitemap');
  if (row.indexable && !robotsAllows(robots.html, path)) row.issues.push('robots blocks indexed landing');
  rows.push({ ...row, html: undefined });
  issues.push(...row.issues.map(issue => `${path}: ${issue}`));
}
for (const url of urls) {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== BASE || parsed.search || parsed.hash) issues.push(`invalid sitemap URL: ${url}`);
    if (!robotsAllows(robots.html, parsed.pathname)) issues.push(`sitemap URL blocked: ${parsed.pathname}`);
  } catch { issues.push(`invalid sitemap URL: ${url}`); }
}
const report = { checkedAt: new Date().toISOString(), base: BASE, sitemapCount: urls.length,
  coverage: 'critical landing sample plus robots and declared sitemap coverage for every sitemap URL', declaredSitemaps, rows, issues };
await mkdir('seo-qa/operations', { recursive: true });
await writeFile('seo-qa/operations/health.json', JSON.stringify(report, null, 2) + '\n');
console.log(`[seo-health] ${rows.length} landings, ${urls.length} sitemap URLs, ${issues.length} issues`);
issues.forEach(issue => console.error(issue));
process.exitCode = issues.length ? 1 : 0;
