import { parse } from "parse5";

const excluded = new Set(["script", "style", "svg", "template", "noscript", "nav", "footer", "header", "aside"]);
export const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value || "";
export function nodes(root, predicate) {
  const result = [];
  function visit(node) {
    if (predicate(node)) result.push(node);
    for (const child of node.childNodes || []) visit(child);
  }
  visit(root);
  return result;
}
export function publisherText(node, omitChrome = true, streamedIds = new Set()) {
  if (!node || excluded.has(node.tagName) && omitChrome) return "";
  if (node.attrs?.some((item) => item.name === "hidden") && !streamedIds.has(attr(node, "id")) || attr(node, "aria-hidden") === "true"
    || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attr(node, "style"))) return "";
  if (node.nodeName === "#text") return node.value;
  return (node.childNodes || []).map((child) => publisherText(child, omitChrome, streamedIds)).join(" ").replace(/\s+/g, " ").trim();
}
export function inspectPublisherDocument(html, url) {
  const doc = parse(html);
  const all = nodes(doc, (node) => Boolean(node.tagName));
  const meta = (name) => all.filter((node) => node.tagName === "meta" && attr(node, "name").toLowerCase() === name)
    .map((node) => attr(node, "content")).join(", ");
  const links = all.filter((node) => node.tagName === "a").map((node) => {
    try { return new URL(attr(node, "href"), url).href; } catch { return ""; }
  }).filter((href) => href.startsWith(new URL(url).origin + "/"));
  const bodies = all.filter((node) => attr(node, "data-article-body") === "true");
  // Server prose can be a sibling of a client-only main. Explicit article
  // markers are authoritative; otherwise inspect the body without site chrome.
  const scope = bodies.length ? bodies : all.filter((node) => node.tagName === "body");
  // React streams server-rendered HTML into hidden S:n containers, then moves it
  // into B:n boundaries. Record this dependency; do not call it browser-visible.
  const streamedIds = new Set(all.filter((node) => /^S:/.test(attr(node, "id"))
    && all.some((boundary) => boundary.tagName === "template" && attr(boundary, "id") === attr(node, "id").replace(/^S:/, "B:"))
    && /\$RC\s*\(/.test(html)).map((node) => attr(node, "id")));
  const text = scope.map((node) => publisherText(node, true, streamedIds)).join(" ");
  const noJsBodyText = all.filter((node) => node.tagName === "body").map((node) => publisherText(node)).join(" ");
  const schema = [];
  for (const node of all.filter((item) => item.tagName === "script" && attr(item, "type") === "application/ld+json")) {
    try { schema.push(JSON.parse(publisherText(node, false))); } catch { schema.push({ invalidJson: true }); }
  }
  const schemaNodes = schema.flatMap((item) => Array.isArray(item) ? item : item["@graph"] || [item]);
  const article = schemaNodes.find((item) => ["Article", "BlogPosting", "NewsArticle"].includes(item["@type"]));
  return {
    title: publisherText(all.find((node) => node.tagName === "title")),
    description: meta("description"), robots: [meta("robots"), meta("googlebot")].filter(Boolean).join(", "),
    canonical: attr(all.find((node) => node.tagName === "link" && attr(node, "rel") === "canonical") || {}, "href"),
    locale: attr(all.find((node) => node.tagName === "html") || {}, "lang"),
    headings: all.filter((node) => /^h[123]$/.test(node.tagName)).map((node) => ({ level: node.tagName, text: publisherText(node) })),
    bodyText: text, bodyChars: text.length, noJsBodyChars: noJsBodyText.length,
    streamingRequiresJs: streamedIds.size > 0, articlePresent: Boolean(article && text),
    author: article?.author || null, datePublished: article?.datePublished || null, dateModified: article?.dateModified || null,
    internalLinks: [...new Set(links)], schemaTypes: schemaNodes.map((item) => item["@type"] || "invalid"),
    hreflang: all.filter((node) => node.tagName === "link" && attr(node, "hreflang")).map((node) => ({ lang: attr(node, "hreflang"), href: attr(node, "href") })),
    reviewStatus: attr(all.find((node) => attr(node, "data-editorial-review")) || {}, "data-editorial-review") || "unknown",
  };
}
