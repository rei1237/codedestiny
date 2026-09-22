import { DomainContext, DomainId } from "./shared/contracts";
import { MasterAnalysis, Signal, Theme } from "./book-contracts";
export function analyze(
  contexts: Partial<Record<DomainId, DomainContext>>,
): MasterAnalysis {
  const signals: Signal[] = [];
  // Domain-local facts remain distinct. Absence is never a negative signal.
  for (const c of Object.values(contexts))
    for (const f of c.facts) {
      if (
        c.domain === "saju" &&
        f.label === "tenGods" &&
        f.value &&
        typeof f.value === "object"
      ) {
        const v = f.value as Record<string, number>;
        const groups = [
          ["wealth", (v["정재"] || 0) + (v["편재"] || 0)],
          ["career", (v["정관"] || 0) + (v["편관"] || 0)],
          ["self", (v["비견"] || 0) + (v["겁재"] || 0)],
        ] as const;
        const highest = Math.max(...groups.map(([, weight]) => weight));
        for (const [theme, weight] of groups)
          if (weight > 0 && weight === highest)
            signals.push({
              theme,
              domain: c.domain,
              direction: "support",
              source: f.id,
              label: "기존 십성 가중치에서 부각되는 주제 · 성패 판단 아님",
            });
      }
      if (
        c.domain === "saju" &&
        f.label === "strengthHeuristic" &&
        f.value &&
        typeof f.value === "object"
      ) {
        const v = f.value as { isStrong?: boolean };
        if (typeof v.isStrong === "boolean")
          signals.push({
            theme: "self",
            domain: c.domain,
            direction: v.isStrong ? "support" : "tension",
            source: f.id,
            label: v.isStrong ? "주도성·에너지 분배" : "외부 지원·회복 리듬",
          });
      }
      if (
        c.domain === "ziwei" &&
        f.label === "palaces" &&
        Array.isArray(f.value)
      )
        for (const p of f.value) {
          const theme: Theme | undefined = (
            {
              재백궁: "wealth",
              관록궁: "career",
              부부궁: "love",
              노복궁: "relations",
            } as Record<string, Theme>
          )[p.name];
          if (!theme) continue;
          if (p.assistantStars?.length)
            signals.push({
              theme,
              domain: c.domain,
              direction: "support",
              source: f.id,
              label: `${p.name} 보조성`,
            });
          if (p.maleficStars?.length)
            signals.push({
              theme,
              domain: c.domain,
              direction: "tension",
              source: f.id,
              label: `${p.name} 긴장 요소`,
            });
        }
      if (
        c.domain === "vedic" &&
        f.label === "planets" &&
        Array.isArray(f.value)
      )
        for (const p of f.value) {
          if (p.name === "Jupiter" && [2, 11].includes(p.house))
            signals.push({
              theme: "wealth",
              domain: c.domain,
              direction: "support",
              source: f.id,
              label: "2·11하우스 목성",
            });
        }
    }
  const themes: Theme[] = [
    "self",
    "wealth",
    "love",
    "career",
    "relations",
    "timing",
    "cross",
    "action",
  ];
  return {
    contexts,
    signals,
    themes: themes.map((theme) => {
      const relevant = signals.filter((s) => s.theme === theme);
      const agreement = new Set(
        relevant.filter((s) => s.direction === "support").map((s) => s.domain),
      ).size;
      return {
        theme,
        agreement,
        confidence: relevant.some((s) => s.direction === "tension")
          ? "mixed"
          : agreement >= 2
            ? "supported"
            : "limited",
        sources: [...new Set(relevant.map((s) => s.source))],
      };
    }),
  };
}
