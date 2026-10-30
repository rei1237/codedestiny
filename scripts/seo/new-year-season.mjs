// Yearly new-year season pages (/fortune/{YYYY}/ + 12 signs): live, indexable and in the
// sitemap, plus the manual crawl-request checklist. Read-only GET probes; never submits anything.
// IndexNow (Naver·Bing) already goes out from the production deploy for new or changed URLs.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { collectSitemapUrls, inspectPage, robotsAllows, sitemapDirectives } from './health-policy.mjs';
import { NEW_YEAR_SIGNS } from '../../lib/fortune/new-year-registry.mjs';

// The first season this site published; earlier years never had a page.
export const FIRST_SEASON_YEAR = 2027;
// "{Y+1}년 운세" demand builds from autumn, so next year's page has to be indexed before it peaks.
export const PREPARE_FROM_MONTH = 8;
export const LIVE_BY_MONTH = 10;

export function kstYearMonth(now) {
  const kst = new Date(now.getTime() + 9 * 3600000);
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 };
}
// This year's page stays live all year; next year's is a warning first, then a failure.
export function seasonTargets(now) {
  const { year, month } = kstYearMonth(now);
  const targets = [];
  if (year >= FIRST_SEASON_YEAR) targets.push({ year, severity: 'fail' });
  if (month >= PREPARE_FROM_MONTH && year + 1 >= FIRST_SEASON_YEAR) {
    targets.push({ year: year + 1, severity: month >= LIVE_BY_MONTH ? 'fail' : 'warn' });
  }
  return targets;
}
export function seasonPaths(year, signIds = NEW_YEAR_SIGNS.map(sign => sign.id)) {
  return [`/fortune/${year}/`, ...signIds.map(id => `/fortune/${year}/${id}/`)];
}
// rows[0] is the hub. An unpublished hub is one issue, not thirteen 404 lines.
export function evaluateSeason(target, rows, sitemapUrls, robotsText = '') {
  const [hub] = rows;
  if (!hub || hub.status !== 200) {
    return { ...target, live: false, issues: [`${seasonPaths(target.year, [])[0]}: HTTP ${hub?.status ?? 0} — 시즌 페이지 미발행`] };
  }
  const issues = [];
  for (const row of rows) {
    const path = new URL(row.url).pathname;
    const pageIssues = inspectPage({ ...row, indexable: true });
    if (!sitemapUrls.has(row.url)) pageIssues.push('missing from sitemap');
    for (const agent of ['googlebot', 'yeti']) {
      if (!robotsAllows(robotsText, path, agent)) pageIssues.push(`robots blocks ${agent}`);
    }
    issues.push(...pageIssues.map(issue => `${path}: ${issue}`));
  }
  return { ...target, live: true, issues };
}
export function checklist(results, base, sitemaps) {
  const lines = ['## 수동 수집 요청', '',
    '해마다 그 해 시즌 페이지가 운영에 처음 반영된 주에 한 번 요청한다. 이미 요청했으면 건너뛴다.',
    'IndexNow(네이버·Bing)는 운영 배포 워크플로가 바뀐 URL을 자동으로 보낸다. 아래는 사람이 하는 일이다.', ''];
  const live = results.filter(result => result.live && !result.issues.length);
  if (!live.length) return [...lines, '- 요청할 시즌 페이지가 아직 운영에 없다. 반영된 뒤 다시 본다.', ''];
  for (const result of live) {
    const urls = seasonPaths(result.year).map(path => `${base}${path}`);
    lines.push(`### ${result.year}년`, '',
      `- 네이버 서치어드바이저 › 요청 › 사이트맵 제출: ${sitemaps.join(', ')} 재제출`,
      '- 네이버 서치어드바이저 › 요청 › 웹 페이지 수집: 아래 13개',
      `- Google Search Console › Sitemaps: ${sitemaps.join(', ')} 재제출, URL 검사 › 색인 생성 요청: 허브부터`,
      '', ...urls.map(url => `  - ${url}`), '');
  }
  return lines;
}
export async function run(now = new Date()) {
  const base = (process.env.SITE_URL || 'https://code-destiny.com').replace(/\/$/, '');
  const userAgent = 'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)';
  const get = async path => {
    const url = `${base}${path}`;
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': userAgent } });
      return { url, status: response.status, html: await response.text(), xRobots: response.headers.get('x-robots-tag') || '' };
    } catch (error) { return { url, status: 0, html: '', error: error.message }; }
  };
  const robots = await get('/robots.txt');
  const sitemaps = sitemapDirectives(robots.html);
  const declared = await collectSitemapUrls(sitemaps, base, get);
  const results = [];
  for (const target of seasonTargets(now)) {
    const [hubPath, ...signPaths] = seasonPaths(target.year);
    const hub = await get(hubPath);
    const rows = hub.status === 200 ? [hub, ...await Promise.all(signPaths.map(get))] : [hub];
    results.push(evaluateSeason(target, rows, declared.urls, robots.html));
  }
  const { year, month } = kstYearMonth(now);
  const lines = ['# 신년 시즌 페이지 점검', '', `기준: KST ${year}-${String(month).padStart(2, '0')}. 다음 해 페이지는 ${PREPARE_FROM_MONTH}월부터 경고, ${LIVE_BY_MONTH}월부터 실패.`, '',
    ...(results.length ? results.map(r => `- ${r.year}년 (${r.severity}): ${r.issues.length ? `문제 ${r.issues.length}건` : '정상'}`) : ['- 점검 대상 연도 없음']),
    ...results.flatMap(r => r.issues.map(issue => `  - ${issue}`)), '', ...checklist(results, base, sitemaps)];
  await mkdir('seo-qa/operations', { recursive: true });
  await writeFile('seo-qa/operations/new-year-season.json', JSON.stringify({ checkedAt: now.toISOString(), base, sitemaps,
    sitemapIssues: declared.issues, results }, null, 2) + '\n');
  await writeFile('seo-qa/operations/new-year-season.md', lines.join('\n'));
  const failing = results.filter(r => r.severity === 'fail' && r.issues.length);
  console.log(`[seo-new-year] ${results.map(r => `${r.year}:${r.severity}:${r.issues.length}`).join(' ') || 'no target'}`);
  failing.flatMap(r => r.issues).forEach(issue => console.error(issue));
  // Sitemap file defects already fail the daily health check; only season pages fail here.
  process.exitCode = failing.length ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
