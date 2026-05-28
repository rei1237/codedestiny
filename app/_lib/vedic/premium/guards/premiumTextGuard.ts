export function sanitizePremiumText(input: unknown, fallback = "해석 데이터를 준비 중입니다."): string {
  const text = String(input ?? "").trim();
  if (!text) return fallback;

  const lower = text.toLowerCase();
  if (lower === "about:blank") return fallback;

  if (looksLikeJsonText(text)) return fallback;

  return dedupeRepeatedLines(text);
}

export function sanitizePremiumSections<T extends { title?: string; body?: string }>(
  sections: T[] | undefined,
  fallback = "핵심 해석 데이터를 준비 중입니다.",
): Array<{ title: string; body: string }> {
  const safeList = Array.isArray(sections) ? sections : [];
  const out: Array<{ title: string; body: string }> = [];
  const seen = new Set<string>();

  for (const item of safeList) {
    const title = sanitizePremiumText(item?.title || "핵심 해석", "핵심 해석");
    const body = sanitizePremiumText(item?.body || "", fallback);
    const key = `${title}::${body}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, body });
  }

  if (!out.length) {
    out.push({ title: "핵심 해석", body: fallback });
  }

  return out;
}

function looksLikeJsonText(text: string): boolean {
  const trimmed = text.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch (e) {
    return false;
  }
}

function dedupeRepeatedLines(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return text;

  const result: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    result.push(line);
  }

  return result.join("\n");
}
