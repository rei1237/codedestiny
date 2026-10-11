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
