import type { SajuNewYearSectionItem } from "@/app/_lib/saju/new-year/types";

const JSON_LIKE_RE = /^\s*[\[{]/;

export function safeNewYearText(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/about:blank/i.test(raw)) return "데이터를 재정리하는 중입니다. 잠시 후 다시 확인해 주세요.";
  if (JSON_LIKE_RE.test(raw)) return "데이터를 문장형 해석으로 변환하는 중입니다. 잠시 후 다시 확인해 주세요.";
  return raw;
}

export function buildOrderedSectionItems(
  sectionOrder: string[],
  sections: Record<string, string | undefined>,
  labels: Record<string, string>,
): SajuNewYearSectionItem[] {
  const used = new Set<string>();
  const out: SajuNewYearSectionItem[] = [];

  for (const key of sectionOrder) {
    if (used.has(key)) continue;
    used.add(key);

    const normalized = safeNewYearText(sections[key]);
    const label = labels[key] || key;
    if (!normalized) {
      out.push({
        key,
        label,
        content: "해당 항목 데이터가 아직 준비되지 않았습니다. 핵심 근거 데이터를 확인해 재생성해 주세요.",
        status: "fallback",
        source: "fallback",
      });
      continue;
    }

    out.push({
      key,
      label,
      content: normalized,
      status: "ready",
      source: "llm",
    });
  }

  return out;
}
