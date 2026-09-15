import { DomainContext, FortuneError, FortuneResult } from "./contracts";
export const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "sections", "yeongnyangiComment", "cautions"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "content", "evidence"],
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          evidence: { type: "array", minItems: 1, items: { type: "string" } },
        },
      },
    },
    yeongnyangiComment: { type: "string" },
    cautions: { type: "array", items: { type: "string" } },
  },
};
function record(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw new FortuneError("INVALID_RESULT", 502);
  return x as Record<string, unknown>;
}
function text(x: unknown, max: number): string {
  if (
    typeof x !== "string" ||
    !x.trim() ||
    x.length > max ||
    /<\/?[a-z][^>]*>|100\s*%|무조건|반드시.{0,12}(성공|재회)/i.test(
      x,
    )
  )
    throw new FortuneError("INVALID_RESULT", 502);
  return x.trim();
}
export function validateResult(
  raw: unknown,
  context: DomainContext,
): FortuneResult {
  let parsed = raw;
  if (typeof raw === "string") {
    if (raw.length > 100000) throw new FortuneError("INVALID_RESULT", 502);
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new FortuneError("MALFORMED_RESULT", 502);
    }
  }
  const r = record(parsed);
  if (
    Object.keys(r).some(
      (k) =>
        ![
          "title",
          "summary",
          "sections",
          "yeongnyangiComment",
          "cautions",
        ].includes(k),
    )
  )
    throw new FortuneError("INVALID_RESULT", 502);
  if (
    !Array.isArray(r.sections) ||
    r.sections.length < 1 ||
    r.sections.length > 20 ||
    !Array.isArray(r.cautions) ||
    r.cautions.length > 12
  )
    throw new FortuneError("INVALID_RESULT", 502);
  const allowed = new Set(context.facts.map((e) => e.id));
  const contents = new Set<string>();
  const sections = r.sections.map((s) => {
    const row = record(s);
    if (
      Object.keys(row).some(
        (k) => !["title", "content", "evidence"].includes(k),
      ) ||
      !Array.isArray(row.evidence) ||
      row.evidence.length < 1 ||
      row.evidence.length > 30 ||
      row.evidence.some((id) => typeof id !== "string" || !allowed.has(id))
    )
      throw new FortuneError("INVALID_EVIDENCE", 502);
    const content = text(row.content, 12000);
    if (contents.has(content)) throw new FortuneError("DUPLICATE_SECTION", 502);
    contents.add(content);
    return {
      title: text(row.title, 100),
      content,
      evidence: [...new Set(row.evidence)] as string[],
    };
  });
  return {
    title: text(r.title, 120),
    summary: text(r.summary, 2000),
    sections,
    yeongnyangiComment: text(r.yeongnyangiComment, 2000),
    cautions: r.cautions.map((c) => text(c, 1000)),
  };
}
