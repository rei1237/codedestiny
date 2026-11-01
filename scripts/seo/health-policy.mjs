// Head metadata probe; the existing build audit remains responsible for full HTML.
export function sitemapDirectives(text) {
  return [...new Set(text.split(/\r?\n/).map(line =>
    line.replace(/#.*/, '').trim().match(/^sitemap:\s*(https?:\/\/\S+)$/i)?.[1]
  ).filter(Boolean))];
}

// Read declared indexes as well as URL sets; never follow an off-site reference.
export async function collectSitemapUrls(declared, base, get) {
  const pending = [...declared];
  const visited = new Set();
  const urls = new Set();
  const issues = [];
  const files = [];
  while (pending.length) {
    const url = pending.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    if (visited.size > 50) { issues.push('sitemap file budget exceeded (50)'); break; }
    let parsed;
    try { parsed = new URL(url); } catch { issues.push(`invalid sitemap URL: ${url}`); continue; }
    if (parsed.origin !== base || parsed.search || parsed.hash) {
      issues.push(`unexpected declared sitemap URL: ${url}`);
      continue;
    }
    const entry = await get(parsed.pathname);
    const isIndex = /<sitemapindex\b/.test(entry.html);
    const isUrlset = /<urlset\b/.test(entry.html);
    if (entry.status !== 200 || (!isIndex && !isUrlset)) {
      issues.push(`declared sitemap missing or invalid: ${url}`);
      continue;
    }
    const locations = [...entry.html.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m => m[1].trim());
    files.push({ url, status: entry.status, type: isIndex ? 'index' : 'urlset', count: locations.length });
    if (isIndex) pending.push(...locations);
    else locations.forEach(location => urls.add(location));
  }
  return { urls, issues, files };
}

export function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/\s([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map(m => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4]]));
}
export function inspectPage({ url, status, html, xRobots = '', indexable = true }) {
  if (status !== 200) return [`HTTP ${status}: ${url}`];
  const issues = [];
  const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '')
    .replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  if (!head) issues.push('missing HTML head');
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(m => attributes(m[0]));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(m => attributes(m[0]));
  const robots = [xRobots, ...metas.filter(m => /^(robots|googlebot)$/i.test(m.name || '')).map(m => m.content)].join(',');
  if (indexable && /\b(noindex|none)\b/i.test(robots)) issues.push('unexpected noindex');
  if (!indexable && !/\b(noindex|none)\b/i.test(robots)) issues.push('missing expected noindex');
  const canonical = links.filter(l => /(?:^|\s)canonical(?:\s|$)/i.test(l.rel || ''));
  if (canonical.length !== 1) issues.push(`canonical count ${canonical.length}`);
  else if (canonical[0].href !== url) issues.push(`canonical mismatch: ${canonical[0].href}`);
  const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  if (!titles.some(m => m[1].trim())) issues.push('missing title');
  if (titles.length > 1) issues.push(`title count ${titles.length}`);
  const descriptions = metas.filter(m => m.name?.toLowerCase() === 'description');
  if (!descriptions.some(m => m.content?.trim())) issues.push('missing description');
  if (descriptions.length > 1) issues.push(`description count ${descriptions.length}`);
  return issues;
}
export function robotsAllows(text, pathname, agent = 'googlebot') {
  agent = agent.toLowerCase();
  const groups = [];
  let group = { agents: [], rules: [], hasDirectives: false };
  for (const line of text.split(/\r?\n/)) {
    const match = line.replace(/#.*/, '').trim().match(/^(user-agent|allow|disallow):\s*(.*)$/i);
    if (!match) continue;
    const [, rawKey, value] = match;
    if (rawKey.toLowerCase() === 'user-agent') {
      if (group.hasDirectives) { groups.push(group); group = { agents: [], rules: [], hasDirectives: false }; }
      group.agents.push(value.toLowerCase());
    } else {
      group.hasDirectives = true;
      if (value) group.rules.push({ allow: rawKey.toLowerCase() === 'allow', value });
    }
  }
  groups.push(group);
  const specific = groups.filter(g => g.agents.includes(agent));
  const selected = specific.length ? specific : groups.filter(g => g.agents.includes('*'));
  const rules = selected.flatMap(g => g.rules).filter(rule => {
    const pattern = rule.value.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${pattern}`).test(pathname);
  }).sort((a, b) => b.value.replace(/[*$]/g, '').length - a.value.replace(/[*$]/g, '').length || Number(b.allow) - Number(a.allow));
  return rules[0]?.allow ?? true;
}

// Shared HTML / sitemap / header parsers. Pure string functions: no network, no filesystem.
export function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function decodeHtml(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, ' ')
    .trim();
}

const tagAttributes = (html, tag) => [...html.matchAll(new RegExp(`<${tag}(?=[\\s/>])[^>]*>`, 'gi'))].map(m => attributes(m[0]));
const hasRelToken = (attrs, token) => (attrs.rel || '').toLowerCase().split(/\s+/).includes(token);

export function getTitle(html) {
  return decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ');
}

export function getCanonical(html) {
  return tagAttributes(html, 'link')
    .filter(a => hasRelToken(a, 'canonical') && a.href)
    .map(a => decodeHtml(a.href));
}

export function getHreflang(html) {
  return tagAttributes(html, 'link')
    .filter(a => hasRelToken(a, 'alternate') && a.hreflang && a.href)
    .map(a => ({ lang: decodeHtml(a.hreflang), href: decodeHtml(a.href) }));
}

// <script> 본문의 문자열 마크업(innerHTML 조립, RSC·JSON 페이로드)은 문서 구조도 링크도 아니다.
const withoutScripts = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

export function getH1s(html) {
  return [...withoutScripts(html).matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => stripTags(m[1]));
}

// Arrays and @graph containers are flattened; a container is kept only if it carries its own properties.
function flattenJsonLd(value, nodes = []) {
  if (Array.isArray(value)) value.forEach(item => flattenJsonLd(item, nodes));
  else if (value && typeof value === 'object') {
    const isContainer = '@graph' in value && Object.keys(value).every(key => key === '@graph' || key === '@context');
    if (!isContainer) nodes.push(value);
    if ('@graph' in value) flattenJsonLd(value['@graph'], nodes);
  }
  return nodes;
}

export function getJsonLd(html) {
  const nodes = [];
  const errors = [];
  for (const m of html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { flattenJsonLd(JSON.parse(m[1].trim()), nodes); } catch (error) { errors.push(error.message); }
  }
  return { nodes, errors };
}

// Same-origin pathname(+search) of every <a href>, in document order and without de-duplication.
export function getInternalLinks(html, origin) {
  const links = [];
  // 속성 이름으로 읽는다. 태그 정규식으로 href= 를 찾으면 뒤따르는 data-*-href 를 대신 집는다.
  // <script> 본문의 문자열 마크업은 크롤러가 따라가는 링크가 아니므로 먼저 걷어 낸다.
  for (const a of tagAttributes(withoutScripts(html), 'a')) {
    const href = decodeHtml(a.href || '');
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      const url = new URL(href, `${origin}/`);
      if (url.origin === origin) links.push(url.pathname + url.search);
    } catch { /* unparsable href is not an internal link */ }
  }
  return links;
}

// `key` may be a meta name or property (og:url, description, robots, ...). Returns every content value.
export function getMeta(html, key) {
  const wanted = key.toLowerCase();
  return tagAttributes(html, 'meta')
    .filter(a => [a.name, a.property].some(v => v?.toLowerCase() === wanted) && a.content !== undefined)
    .map(a => decodeHtml(a.content));
}

export function hasNoindex(html) {
  return [...getMeta(html, 'robots'), ...getMeta(html, 'googlebot')].join(',').toLowerCase().includes('noindex');
}

// Cloudflare `_headers`: unindented lines are path patterns, indented lines are that pattern's headers.
// Only X-Robots-Tag on path patterns is returned; precedence is deliberately not reproduced.
export function parseHeaderRobotsRules(headersText) {
  const rules = [];
  let current = null;
  for (const rawLine of headersText.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^\s/.test(rawLine)) {
      const match = trimmed.match(/^X-Robots-Tag:\s*(.+)$/i);
      if (match && current) current.value = match[1].trim().toLowerCase();
      continue;
    }
    current = { pattern: trimmed, value: '' };
    rules.push(current);
  }
  return rules.filter(rule => rule.value && rule.pattern.startsWith('/'));
}

// Sitemap `xhtml:link rel="alternate"` entries per <loc> (both decoded), keyed by the loc URL.
export function parseSitemapAlternates(xml) {
  const map = new Map();
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const loc = block[1].match(/<loc>([^<]+)<\/loc>/i)?.[1];
    if (!loc) continue;
    const alternates = [...block[1].matchAll(/<xhtml:link\b[^>]*>/gi)]
      .map(m => attributes(m[0]))
      .filter(a => a.hreflang && a.href)
      .map(a => ({ lang: a.hreflang, href: decodeHtml(a.href) }));
    map.set(decodeHtml(loc), alternates);
  }
  return map;
}
