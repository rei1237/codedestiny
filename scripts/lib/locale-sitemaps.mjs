// Derive locale files from the canonical URL set. Preserve content dates and alternates verbatim.
export const SITEMAP_LOCALES = ["ko", "ja", "en", "zh", "zh-tw"];

export function splitLocaleSitemaps(xml) {
  const blocks = [...xml.matchAll(/\s*<url>[\s\S]*?<\/url>/g)].map(([block]) => block.trim());
  const groups = Object.fromEntries(SITEMAP_LOCALES.map((locale) => [locale, []]));
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) throw new Error("Sitemap URL has no loc");
    const segment = new URL(loc).pathname.split("/")[1];
    const locale = SITEMAP_LOCALES.includes(segment) ? segment : "ko";
    groups[locale].push(`  ${block}`);
  }
  return Object.fromEntries(Object.entries(groups).map(([locale, urls]) => [
    `sitemap-${locale}.xml`,
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.join("\n") + '\n</urlset>\n',
  ]));
}
