export function uniqueNonEmptyLines(lines: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const text = String(raw || "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function safeSectionText(value: unknown, fallback = "데이터 준비 중입니다."): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}
