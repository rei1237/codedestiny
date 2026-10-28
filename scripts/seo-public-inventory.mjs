// Public HTML census. Default is offline/read-only; --live permits bounded public GETs,
// and --capture is the only mode that writes an evidence report. No API/form/auth calls.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parse } from 'parse5';

export const ORIGIN = 'https://code-destiny.com';
export const APPROVED_CONSOLIDATIONS = {
  '/kkul-kkul-unse/': '/', '/saju/basic/': '/saju/', '/oracle/sukuyo/': '/sukuyo/',
  '/vedic/jyotish/': '/vedic/', '/astrology/cosmic/': '/astrology/',
  '/contact-us/': '/contact/', '/privacy-policy/': '/privacy/', '/terms-of-service/': '/terms/',
};
const CORE = new Set(['/', '/ggulggul/', '/yeongnyangi/', '/saju/', '/manse/', '/tarot/', '/ziwei/', '/sukuyo/', '/vedic/', '/astrology/', '/naming-ai/', '/fortune/', '/fortune/today/', '/fortune/tomorrow/', '/fortune/weekly/', '/fortune/monthly/']);
const LOCALE = /^\/(?:en|ja|zh|zh-tw|de|es|fr|hi|ms|nl|vi)(?=\/)/;
const PRIVATE = /^\/(?:api|admin|auth|login|signup|logout|account|me|my|profile|profiles|records|payment|payments|checkout|points|gift|dev-status|test)(?:\/|$)|\/(?:result|library|play|stage|start|callback|share)(?:\/|$)/;
const ASSET = /\.(?:js|mjs|css|map|json|xml|txt|webmanifest|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|mp3|mp4|pdf|zip)$/i;

export function normalizeLink(value, base = ORIGIN) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    if (url.origin !== ORIGIN || !['https:', 'http:'].includes(url.protocol)) return null;
    // Every audit request and saved URL excludes user input, tokens and fragments.
    return url.pathname;
  } catch { return null; }
}
export function exclusionReason(path) {
  const unlocalized = path.replace(LOCALE, '') || '/';
  if (PRIVATE.test(unlocalized)) return 'private-or-action-route-not-requested';
  if (ASSET.test(path) || /^\/(?:_next|assets|images|audio|icons|fonts|js|styles|i18n)(?:\/|$)/.test(path)) return 'asset-not-html';
  return null;
}
const tidy = value => String(value || '').replace(/\s+/g, ' ').trim();
function nodeText(node) {
  const attrs = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
  if (['script', 'style', 'noscript', 'template', 'nav', 'footer'].includes(node.tagName)
    || attrs['aria-hidden'] === 'true' || /(?:^|\s)sr-only(?:\s|$)/.test(attrs.class || '')
    || (Object.hasOwn(attrs, 'hidden') && !/^S:/.test(attrs.id || ''))) return '';
  return node.nodeName === '#text' ? node.value : (node.childNodes || []).map(nodeText).join(' ');
}
export function inspectHtml(html, pageUrl) {
  const doc = parse(html);
  const result = { titles: [], descriptions: [], h1: [], canonicals: [], robots: [], lang: null, images: { total: 0, missingAlt: [], emptyAltCount: 0, missingDimensions: [] }, hreflang: [], links: [], visibleTextLength: 0, bodyHash: null };
  const mainNodes = [];
  function visit(node, parentHidden = false) {
    const a = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
    const hidden = parentHidden || a['aria-hidden'] === 'true' || /(?:^|\s)sr-only(?:\s|$)/.test(a.class || '') || (Object.hasOwn(a, 'hidden') && !/^S:/.test(a.id || ''));
    if (node.tagName === 'html') result.lang = a.lang || null;
    if (node.tagName === 'title') result.titles.push(tidy(nodeText(node)));
    if (node.tagName === 'h1' && !hidden) { const text = tidy(nodeText(node)); if (text) result.h1.push(text); }
    if (node.tagName === 'meta' && a.name === 'description') result.descriptions.push(tidy(a.content));
    if (node.tagName === 'meta' && /^(robots|googlebot)$/i.test(a.name || '')) result.robots.push(a.content || '');
    if (node.tagName === 'link' && a.rel === 'canonical') result.canonicals.push(normalizeLink(a.href, pageUrl) || 'external-canonical');
    if (node.tagName === 'link' && (a.rel || '').split(/\s+/).includes('alternate') && a.hreflang) {
      result.hreflang.push({ language: a.hreflang, path: normalizeLink(a.href, pageUrl), absolute: /^https:\/\//i.test(a.href || '') });
    }
    if (node.tagName === 'img') {
      const index = result.images.total++;
      // Record all missing attributes without storing alt text, query strings or image payloads.
      let src = null;
      try { if (a.src) { const url = new URL(a.src, pageUrl); if (/^https?:$/.test(url.protocol)) src = url.origin === ORIGIN ? url.pathname : url.origin + url.pathname; } } catch {}
      if (!Object.hasOwn(a, 'alt')) result.images.missingAlt.push({ index, src });
      else if (!a.alt.trim()) result.images.emptyAltCount++;
      if (!(Number(a.width) > 0 && Number(a.height) > 0)) result.images.missingDimensions.push({ index, src });
    }
    if (node.tagName === 'a' && a.href) { const path = normalizeLink(a.href, pageUrl); if (path) result.links.push(path); }
    if (node.tagName === 'main') mainNodes.push(node);
    for (const child of node.childNodes || []) visit(child, hidden);
  }
  visit(doc);
  const body = tidy((mainNodes.length ? mainNodes : [doc]).map(nodeText).join(' '));
  result.visibleTextLength = body.length;
  result.bodyHash = body ? createHash('sha256').update(body).digest('hex') : null;
  result.links = [...new Set(result.links)].sort();
  return result;
}
export function sitemapPaths(xml) {
  return [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => normalizeLink(match[1])).filter(Boolean))].sort();
}
export function classifyPage(row) {
  if (APPROVED_CONSOLIDATIONS[row.path]) return { decision: '통합', target: APPROVED_CONSOLIDATIONS[row.path], reason: '승인된 동일 의도 안내 통합; 고유 본문 이전 및 301 검증', editorialReview: '통합 대상 개별 검수' };
  if (row.excluded) return { decision: '유지', target: null, reason: '개인·동작 경로 또는 자산; 검색 확장 및 HTTP 검사 대상 제외', editorialReview: '해당 없음' };
  if (row.indexDirective === 'noindex' && !row.inSitemap) return { decision: '유지', target: null, reason: '기존 noindex 도구·기록 화면의 정책 보존; SEO 본문 추가 대상 아님', editorialReview: '미확인' };
  if (row.fetchError || row.status >= 400 || row.issues?.length) return { decision: '개선 검토', target: null, reason: '현재 HTTP/메타 근거의 기술 이상 후보; 자동 삭제 금지', editorialReview: '미확인' };
  if (CORE.has(row.path)) return { decision: '개선', target: null, reason: '기존 핵심 허브 유지; 검색 의도·첫 화면·CTA 개선', editorialReview: '핵심 허브 개별 검수' };
  return { decision: '유지', target: null, reason: '독립 기능·정보 의도 보존; 고유성/유입 증거 없이 통합하지 않음', editorialReview: '미확인' };
}
export async function fetchPage(path, { fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const observedAt = new Date().toISOString();
  const redirects = [];
  const seen = new Set();
  let current = path;
  try {
    for (let step = 0; step <= 5; step++) {
      if (exclusionReason(current)) return { observedAt, redirects, finalPath: current, fetchError: 'redirect-to-excluded-route' };
      if (seen.has(current)) return { observedAt, redirects, finalPath: current, fetchError: 'redirect-loop' };
      seen.add(current);
      const response = await fetchImpl(ORIGIN + current, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'CodeDestinyPublicSeoAudit/1.0', Accept: 'text/html', 'Accept-Language': 'ko-KR,ko;q=0.9' } });
      const edgeColo = response.headers.get('cf-ray')?.split('-').at(-1) || null;
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        const target = normalizeLink(response.headers.get('location'), ORIGIN + current);
        redirects.push({ path: current, status: response.status, target: target || 'external-origin' });
        await response.body?.cancel();
        if (!target) return { observedAt, redirects, finalPath: current, status: response.status, edgeColo, fetchError: 'external-redirect-not-followed' };
        current = target;
        continue;
      }
      const contentType = response.headers.get('content-type') || '';
      const evidence = { observedAt, redirects, finalPath: current, status: response.status, contentType, edgeColo, xRobotsTag: response.headers.get('x-robots-tag') };
      if (!/text\/html/i.test(contentType)) { await response.body?.cancel(); return evidence; }
      return { ...evidence, html: inspectHtml(await response.text(), ORIGIN + current) };
    }
    return { observedAt, redirects, finalPath: current, fetchError: 'redirect-limit' };
  } catch (error) { return { observedAt, redirects, finalPath: current, fetchError: error.name === 'TimeoutError' ? 'timeout' : 'network-error' }; }
}
function issuesFor(row) {
  const issues = [];
  if (row.fetchError) issues.push(row.fetchError);
  if (row.status >= 400) issues.push(`http-${row.status}`);
  if (row.inSitemap && row.redirects?.length) issues.push('sitemap-url-redirects');
  if (row.indexDirective === 'noindex') {
    if (row.inSitemap) issues.push('sitemap-url-noindex');
    return issues;
  }
  if (!row.html) return issues;
  if (row.html.titles.length !== 1 || !row.html.titles[0]) issues.push('title-count-or-empty');
  if (row.html.descriptions.length !== 1 || !row.html.descriptions[0]) issues.push('description-count-or-empty');
  if (row.html.h1.length !== 1) issues.push('visible-h1-count');
  if (row.html.canonicals.length !== 1 || row.html.canonicals[0] !== row.finalPath) issues.push('canonical-count-or-mismatch');
  if (!row.html.lang || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(row.html.lang)) issues.push('html-lang-missing-or-invalid');
  const locale = row.finalPath.match(LOCALE)?.[0].slice(1);
  const expectedLang = locale || 'ko';
  if (row.html.lang && !languageMatches(row.html.lang, expectedLang)) issues.push('html-lang-route-mismatch');
  if (row.html.images?.missingAlt.length) issues.push('img-alt-attribute-missing');
  if (row.html.images?.missingDimensions.length) issues.push('img-intrinsic-dimensions-missing-review-css');
  const alternates = row.html.hreflang || [];
  if (new Set(alternates.map(item => item.language.toLowerCase())).size !== alternates.length) issues.push('hreflang-duplicate-language');
  if (alternates.some(item => !item.absolute || !item.path || !/^(?:x-default|[a-z]{2,3}(?:-[a-z0-9]{2,8})*)$/i.test(item.language))) issues.push('hreflang-invalid-language-or-url');
  return issues;
}
function languageMatches(actual, expected) {
  const normalized = actual.toLowerCase();
  if (expected === 'zh-tw') return ['zh-tw', 'zh-hant', 'zh-hant-tw'].includes(normalized);
  if (expected === 'zh') return ['zh', 'zh-cn', 'zh-hans', 'zh-hans-cn'].includes(normalized);
  return normalized === expected || normalized.startsWith(expected + '-');
}
export function analyzeRows(rows) {
  const bodyGroups = new Map();
  const byPath = new Map(rows.map(row => [row.path, row]));
  for (const row of rows) {
    row.indexDirective = /noindex/i.test([row.xRobotsTag, ...(row.html?.robots || [])].join(' ')) ? 'noindex' : row.html ? 'no-noindex-observed' : '미확인';
    row.issues = issuesFor(row);
    if (row.html?.bodyHash && row.status === 200 && !row.redirects?.length && row.indexDirective !== 'noindex') {
      const group = bodyGroups.get(row.html.bodyHash) || [];
      group.push(row.path); bodyGroups.set(row.html.bodyHash, group);
    }
  }
  const exactBodyDuplicateGroups = [...bodyGroups.values()].filter(group => group.length > 1);
  for (const row of rows) {
    if (row.indexDirective === 'noindex' || !row.html) continue;
    for (const alternate of row.html.hreflang || []) {
      const peer = byPath.get(alternate.path);
      if (!peer?.html) continue; // Discovery/fetch coverage is not an implicit broken-link claim.
      if (peer.indexDirective === 'noindex' || peer.status >= 400) row.issues.push('hreflang-target-not-indexable');
      if (!(peer.html.hreflang || []).some(item => item.path === row.finalPath)) row.issues.push('hreflang-return-link-missing');
    }
    row.issues = [...new Set(row.issues)];
  }
  for (const group of exactBodyDuplicateGroups) for (const path of group) rows.find(row => row.path === path).issues.push('exact-visible-main-text-duplicate-candidate');
  for (const row of rows) Object.assign(row, classifyPage(row));
  return exactBodyDuplicateGroups;
}
export async function census(seedPaths, { live = false, concurrency = 8, maxPages = 5000, fetchImpl = fetch, timeoutMs = 12000, onProgress = () => {} } = {}) {
  const rows = new Map();
  const queue = [];
  const sitemap = new Set(seedPaths);
  const add = (path, from) => {
    if (!rows.has(path)) {
      const excluded = exclusionReason(path);
      rows.set(path, { path, inSitemap: sitemap.has(path), inboundCount: 0, inboundSample: [], excluded, indexing: '미확인', searchTraffic: '미확인', backlinks: '미확인', observedAt: null });
      if (!excluded) queue.push(path);
    }
    if (from) { const row = rows.get(path); row.inboundCount++; if (row.inboundSample.length < 8) row.inboundSample.push(from); }
  };
  [...seedPaths, ...Object.keys(APPROVED_CONSOLIDATIONS)].forEach(path => add(path));
  let fetched = 0;
  if (live) {
    // Batch queue expansion avoids races where idle workers finish before new links arrive.
    while (queue.length && fetched < maxPages) {
      const batch = queue.splice(0, Math.min(concurrency, maxPages - fetched));
      const evidence = await Promise.all(batch.map(path => fetchPage(path, { fetchImpl, timeoutMs })));
      for (let index = 0; index < batch.length; index++) {
        const path = batch[index];
        Object.assign(rows.get(path), evidence[index]);
        const html = evidence[index].html;
        for (const link of new Set([...(html?.links || []), ...(html?.hreflang || []).map(item => item.path).filter(Boolean)])) add(link, path);
      }
      fetched += batch.length;
      onProgress({ fetched, pending: queue.length, discovered: rows.size });
    }
  }
  const exactBodyDuplicateGroups = analyzeRows([...rows.values()]);
  return { live, sitemapCount: sitemap.size, discoveredCount: rows.size, fetchedCount: fetched, pendingCount: live ? queue.length : null, completeWithinPublicBoundary: live && queue.length === 0, exactBodyDuplicateGroups, rows: [...rows.values()].sort((a, b) => a.path.localeCompare(b.path)) };
}
function csvCell(value) { return '"' + String(value ?? '').replaceAll('"', '""') + '"'; }
export function inventoryCsv(report) {
  const columns = ['path', 'inSitemap', 'status', 'finalPath', 'decision', 'target', 'reason', 'editorialReview', 'indexDirective', 'indexing', 'searchTraffic', 'backlinks', 'observedAt', 'inboundCount', 'lang', 'imageCount', 'missingAltCount', 'emptyAltCount', 'missingDimensionsCount', 'hreflangCount', 'issues'];
  return columns.join(',') + '\n' + report.rows.map(original => {
    const row = { ...original, lang: original.html?.lang, imageCount: original.html?.images?.total, missingAltCount: original.html?.images?.missingAlt.length, emptyAltCount: original.html?.images?.emptyAltCount, missingDimensionsCount: original.html?.images?.missingDimensions.length, hreflangCount: original.html?.hreflang?.length };
    return columns.map(key => csvCell(Array.isArray(row[key]) ? row[key].join('; ') : row[key])).join(',');
  }).join('\n') + '\n';
}
// Preserve every URL/edge/observation while deduplicating repeated URL strings and
// classifications. CSV stays readable; unpackReport restores named row objects.
export function packReport(report) {
  const urlDictionary = [...new Set(report.rows.flatMap(row => [row.path, ...row.inboundSample, ...(row.html?.links || [])]))].sort();
  const urlIds = new Map(urlDictionary.map((url, index) => [url, index]));
  const classifications = [];
  const evidenceDefaults = {};
  for (const key of ['indexing', 'searchTraffic', 'backlinks']) {
    if (report.rows.every(row => row[key] === report.rows[0]?.[key])) evidenceDefaults[key] = report.rows[0]?.[key];
  }
  const rows = report.rows.map(original => {
    const row = { ...original, inboundSampleIds: original.inboundSample.map(url => urlIds.get(url)) };
    delete row.inboundSample;
    if (original.html) { row.html = { ...original.html, linkIds: original.html.links.map(url => urlIds.get(url)) }; delete row.html.links; }
    const classification = {};
    for (const key of ['decision', 'target', 'reason', 'editorialReview']) { classification[key] = row[key]; delete row[key]; }
    let id = classifications.findIndex(value => JSON.stringify(value) === JSON.stringify(classification));
    if (id < 0) { id = classifications.length; classifications.push(classification); }
    row.classificationId = id;
    for (const key of Object.keys(evidenceDefaults)) delete row[key];
    return row;
  });
  const columns = [...new Set(rows.flatMap(Object.keys))];
  const { rows: _rows, ...metadata } = report;
  return { ...metadata, encoding: 'columnar-v1', urlDictionary, classifications, evidenceDefaults, columns, records: rows.map(row => columns.map(key => row[key] ?? null)) };
}
export function unpackReport(report) {
  if (report.encoding !== 'columnar-v1') return report;
  const { encoding: _encoding, urlDictionary, classifications, evidenceDefaults, columns, records, ...metadata } = report;
  return { ...metadata, rows: records.map(record => {
    const row = { ...evidenceDefaults, ...Object.fromEntries(columns.map((key, index) => [key, record[index]])) };
    row.inboundSample = row.inboundSampleIds.map(id => urlDictionary[id]);
    delete row.inboundSampleIds;
    Object.assign(row, classifications[row.classificationId]); delete row.classificationId;
    if (row.html) { row.html = { ...row.html, links: row.html.linkIds.map(id => urlDictionary[id]) }; delete row.html.linkIds; }
    return row;
  }) };
}
async function main() {
  const args = process.argv.slice(2);
  const option = (name, fallback) => args.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
  const live = args.includes('--live');
  const concurrency = Number(option('concurrency', '8'));
  const maxPages = Number(option('max-pages', '5000'));
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 12 || !Number.isInteger(maxPages) || maxPages < 1) throw Error('concurrency must be 1..12; max-pages must be positive');
  const startedAt = new Date().toISOString();
  const previousPath = option('previous', null);
  const previousRaw = previousPath ? readFileSync(resolve(previousPath), 'utf8') : null;
  const previous = previousRaw ? unpackReport(JSON.parse(previousRaw)) : null;
  const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const xml = readFileSync(resolve('sitemap.xml'), 'utf8');
  let lastLog = 0;
  const result = await census(sitemapPaths(xml), { live, concurrency, maxPages, onProgress: progress => {
    if (progress.fetched - lastLog >= 100) { console.log(JSON.stringify(progress)); lastLog = progress.fetched; }
  } });
  const report = { schemaVersion: 1, startedAt, finishedAt: new Date().toISOString(), timeZone: 'Asia/Seoul', observerRegion: '미확인; cf-ray edgeColo는 방문자 지역 증거가 아님', requestPolicy: 'unauthenticated public HTML GET; no API, private result, form, payment, LLM or search submission', userAgent: 'CodeDestinyPublicSeoAudit/1.0', sourceRevision, sitemapSha256: createHash('sha256').update(xml).digest('hex'), limitations: ['HTTP 접근성은 검색엔진 수집·색인·순위 증거가 아님', 'HTML 텍스트 길이·정확 중복은 검토 신호이며 자동 삭제 기준이 아님', '내부 링크는 HTTP로 전달된 HTML 기준; JS 실행 후 링크는 미확인', '검색 유입·백링크·검색엔진 선택 canonical은 별도 콘솔 확인 필요', '승인한 여덟 통합 외 삭제 판정 없음'], ...result };
  if (previous) {
    report.previousCapture = { startedAt: previous.startedAt, finishedAt: previous.finishedAt, sitemapCount: previous.sitemapCount, discoveredCount: previous.discoveredCount, fetchedCount: previous.fetchedCount, sha256: createHash('sha256').update(previousRaw).digest('hex'), note: 'Previous observation metadata only; all current HTML fields and links were fetched again at row.observedAt.' };
    const oldRows = new Map(previous.rows.map(row => [row.path, row]));
    for (const row of report.rows) row.previousObservedAt = oldRows.get(row.path)?.observedAt || null;
  }
  if (args.includes('--capture')) {
    const output = resolve(option('output', 'docs/seo/seo-url-inventory-2026-10-18.json'));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(packReport(report)) + '\n');
    writeFileSync(output.replace(/\.json$/, '') + '.csv', inventoryCsv(report));
  }
  console.log(JSON.stringify({ sitemapCount: result.sitemapCount, discoveredCount: result.discoveredCount, fetchedCount: result.fetchedCount, pendingCount: result.pendingCount, complete: result.completeWithinPublicBoundary, technicalCandidates: result.rows.filter(row => row.issues.length).length, captured: args.includes('--capture') }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
