// Display-only fields. Prices, links, identities and result evidence are never editable.
const TEXT = new Set(["title", "headline", "description", "hook", "chaptersLabel", "detail", "gain", "text", "q", "a", "question", "answer", "audience", "preparation", "label", "alt", "imageAlt"]);
const GROUPS = new Set(["contents", "storySections", "journey", "questions", "faq", "method", "inputs", "benefits", "consultationGuide", "outline", "crafted", "chapters", "outcomes", "panels"]);
const IMAGES = new Set(["image", "src"]);

export function detailCopyRecord(detail) {
  const record = {};
  function visit(value, path = []) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const next = [...path, key];
      if (typeof child === "string" && (TEXT.has(key) || IMAGES.has(key) || (Array.isArray(value) && GROUPS.has(path.at(-1))))) {
        record[next.join("/")] = { text: child };
      } else if (child && typeof child === "object" && (GROUPS.has(key) || Array.isArray(value))) {
        visit(child, next);
      }
    }
  }
  visit(detail);
  return record;
}

export function isDetailImagePath(path) {
  return IMAGES.has(path.split("/").at(-1));
}

export function safeDetailImage(value) {
  if (typeof value !== "string" || /[\\\u0000-\u0020]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["assets.code-destiny.com", "code-destiny.com"].includes(url.hostname);
  } catch { return false; }
}

export function applyDetailCopy(detail, record) {
  if (!record || typeof record !== "object") return detail;
  const allowed = detailCopyRecord(detail);
  const next = structuredClone(detail);
  for (const [path, row] of Object.entries(record)) {
    if (!Object.hasOwn(allowed, path) || typeof row?.text !== "string" || !row.text.trim()) continue;
    if (isDetailImagePath(path) && !safeDetailImage(row.text)) continue;
    const parts = path.split("/");
    const field = parts.pop();
    const target = parts.reduce((node, key) => node[key], next);
    target[field] = row.text;
    if (isDetailImagePath(path) && row.text !== allowed[path].text) {
      // Old responsive sources must not override the newly selected artwork.
      if (field === "image") delete target.heroVariants;
      if (field === "src") delete target.variants;
    }
  }
  return next;
}
