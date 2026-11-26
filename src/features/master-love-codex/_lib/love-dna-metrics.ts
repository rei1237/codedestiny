import type { CodexLoveDna } from "../components/CodexLoveDna";

export function loveDnaMetrics(loveDna: CodexLoveDna) {
  if (!Array.isArray(loveDna.metrics)) return [];
  return loveDna.metrics.flatMap(metric => {
    const label = typeof metric?.label === "string" ? metric.label.trim() : "";
    const raw: unknown = metric?.score;
    const score = typeof raw === "string" && raw.trim() ? Number(raw) : raw;
    if (!label || typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return [];
    return [{ ...metric, label, score: Math.round(score) }];
  });
}
