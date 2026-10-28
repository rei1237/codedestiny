export type Fields = Record<string, unknown>;
export interface VisualField { path: string[]; value: string; image: boolean }

export function visualFields(fields: Fields): VisualField[] {
  const result: VisualField[] = [];
  const walk = (value: unknown, path: string[]) => {
    if (typeof value === "string" && value.trim()) {
      result.push({ path, value, image: path[0] === "record" && /(?:^|\/)(?:image|src)$/.test(path[1] || "") });
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (key !== "beatSpeakers") walk(child, [...path, key]);
      }
    }
  };
  walk(fields, []);
  return result;
}

export function replaceVisualField(fields: Fields, path: string[], value: string): Fields {
  const next = structuredClone(fields);
  let cursor: Record<string, unknown> = next;
  for (const key of path.slice(0, -1)) cursor = cursor[key] as Record<string, unknown>;
  cursor[path[path.length - 1]] = value;
  return next;
}

export function previewPath(ns: string, key: string): string {
  if (ns === "fortune-sign") return `/fortune/today/${encodeURIComponent(key)}/`;
  if (ns === "famous-saju") return `/insights/famous-saju/${encodeURIComponent(key)}/`;
  if (ns === "daily-fortune") return "/fortune/today/aries/";
  if (ns === "hat-reading") return "/yeongnyangi/#sorting-hat";
  if (ns === "feature-detail") return `/features/${encodeURIComponent(key)}/`;
  if (ns === "light-novel") return `/stories/${encodeURIComponent(key)}/`;
  if (ns === "page-copy" && key === "about") return "/about/";
  if (ns === "faq") return "/faq/";
  if (ns === "feature-copy") return key.startsWith("fortune-tea-house:") ? "/fortune-tea-house/" : "/fortune-chat/";
  if (ns === "saju-animal") return "/saju/animal-destiny/";
  if (ns === "saju-guardian") return "/saju-guardian/";
  return "/ggulggul/";
}

export function safePreviewPath(input: string, origin: string): string | null {
  try {
    const url = new URL(input, origin);
    if (url.origin !== origin || url.username || url.password) return null;
    if (/^\/(?:admin|api|checkout|records|account|login)(?:\/|$)/.test(url.pathname) ||
        /^\/yeongnyangi\/(?:library|account)(?:\/|$)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

/** Search displayed prose, including unedited defaults and multi-line Korean copy. */
export function matchesCopy(query: string, ...values: unknown[]): boolean {
  const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");
  const text = normalize(values.map((value) => typeof value === "string" ? value : JSON.stringify(value ?? "")).join(" "));
  return query.trim().split(/\s+/).every((word) => text.includes(normalize(word)));
}

/** Partial CMS records inherit untouched rows/fields, just as the public renderer does. */
export function mergeCopy(base: Fields, ...layers: Array<Fields | undefined>): Fields {
  const next: Fields = { ...base };
  for (const layer of layers) for (const [key, value] of Object.entries(layer || {})) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    next[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergeCopy((next[key] && typeof next[key] === "object" && !Array.isArray(next[key]) ? next[key] : {}) as Fields, value as Fields)
      : value;
  }
  return next;
}

export function prefersResultCopy(ns: string): boolean {
  return ["daily-fortune", "hat-reading", "saju-reading", "saju-animal", "saju-guardian", "sukuyo-calendar", "sukuyo-mansion", "ziwei-basic", "ziwei-deep", "vedic-nakshatra", "vedic-reading", "phrase-pool"].includes(ns);
}
