const ALLOWED_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "p",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
  "img",
  "br",
]);

function escapeAttr(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractAttr(attrs: string, name: string): string {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i");
  const matched = String(attrs || "").match(pattern);
  if (!matched) return "";
  return String(matched[2] || matched[3] || matched[4] || "").trim();
}

function sanitizeHref(rawHref: string): string {
  const href = String(rawHref || "").trim();
  if (!href) return "";

  const lowered = href.toLowerCase().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:") || lowered.startsWith("data:")) {
    return "";
  }

  if (
    lowered.startsWith("http://")
    || lowered.startsWith("https://")
    || lowered.startsWith("mailto:")
    || lowered.startsWith("tel:")
    || lowered.startsWith("/")
    || lowered.startsWith("#")
    || lowered.startsWith("?")
  ) {
    return href;
  }

  return "";
}

function sanitizeSrc(rawSrc: string): string {
  const src = String(rawSrc || "").trim();
  if (!src) return "";

  const lowered = src.toLowerCase().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:") || lowered.startsWith("data:")) {
    return "";
  }

  if (
    lowered.startsWith("http://")
    || lowered.startsWith("https://")
    || lowered.startsWith("/")
  ) {
    return src;
  }

  return "";
}

function sanitizeNumericDimension(rawValue: string): string {
  const value = Number(String(rawValue || "").trim());
  if (!Number.isFinite(value)) return "";
  const normalized = Math.max(1, Math.min(8192, Math.floor(value)));
  return String(normalized);
}

export function sanitizeInsightHtml(rawHtml: string): string {
  let html = String(rawHtml || "");

  html = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed|meta|link|base|form|input|button|textarea|select)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|meta|link|base|form|input|button|textarea|select)\b[^>]*\/?>/gi, "");

  html = html.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (fullTag, rawName, rawAttrs = "") => {
    const tagName = String(rawName || "").toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      return "";
    }

    if (fullTag.startsWith("</")) {
      return `</${tagName}>`;
    }

    if (tagName === "a") {
      const href = sanitizeHref(extractAttr(rawAttrs, "href"));
      if (!href) return "<a>";
      return `<a href="${escapeAttr(href)}" rel="noopener noreferrer nofollow" target="_blank">`;
    }

    if (tagName === "img") {
      const src = sanitizeSrc(extractAttr(rawAttrs, "src"));
      if (!src) return "";

      const alt = escapeAttr(extractAttr(rawAttrs, "alt") || "");
      const width = sanitizeNumericDimension(extractAttr(rawAttrs, "width"));
      const height = sanitizeNumericDimension(extractAttr(rawAttrs, "height"));
      const loading = String(extractAttr(rawAttrs, "loading") || "").toLowerCase() === "eager" ? "eager" : "lazy";

      const attrs = [
        `src="${escapeAttr(src)}"`,
        `alt="${alt}"`,
        `loading="${loading}"`,
      ];

      if (width) attrs.push(`width="${width}"`);
      if (height) attrs.push(`height="${height}"`);

      return `<img ${attrs.join(" ")}>`;
    }

    return `<${tagName}>`;
  });

  return html.trim();
}
