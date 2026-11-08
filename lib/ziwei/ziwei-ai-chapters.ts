/**
 * 자미두수 상담(ziwei-ai)의 섹션 순서·장 메타·조판 PDF 장 목록. 결과 화면과 보관함이 같은 규칙을 쓴다.
 * 판 1(groupPlanVersion 없음)은 예전 순서 그대로, 판 2는 타고난 본성·공감과 질문의 답이 먼저 온다.
 * 본문 글자는 고치지 않는다.
 */
import type { ConsultationBookChapter } from "@/lib/pdf/export-consultation-book-pdf";

export const ZIWEI_AI_SPEAKER = "무성";

export const ZIWEI_AI_SECTION_ORDER_V1 = [
  "core_answer", "personality_profile", "structure_core", "influence_factors", "evidence_basis", "essence",
  "flow", "triad_axis", "twelve_palaces", "career", "wealth", "relationship", "dayun_now", "timing_strategy",
  "caution", "domain_matrix", "action_plan", "prescription", "reading_guide",
] as const;

/** 판 2 묶음(worker/lib/ziwei-ai-delivery-v2.js의 ZIWEI_V2_GROUP_SPECS)과 같은 순서, 부 이름은 화면·PDF의 키커다. */
const V2_PARTS: Array<{ kicker: string; sections: string[] }> = [
  { kicker: "1부 · 타고난 본성", sections: ["personality_profile", "essence", "core_answer"] },
  { kicker: "2부 · 명반의 뼈대", sections: ["reading_guide", "structure_core", "influence_factors", "evidence_basis"] },
  { kicker: "3부 · 사화와 궁의 흐름", sections: ["flow", "triad_axis", "twelve_palaces"] },
  { kicker: "4부 · 일과 재물", sections: ["career", "wealth", "domain_matrix"] },
  { kicker: "5부 · 인연과 때", sections: ["relationship", "dayun_now", "timing_strategy"] },
  { kicker: "6부 · 처방", sections: ["caution", "action_plan", "prescription"] },
];
export const ZIWEI_AI_SECTION_ORDER_V2 = V2_PARTS.flatMap((part) => part.sections);
const V2_KICKER: Record<string, string> = Object.fromEntries(V2_PARTS.flatMap((part) => part.sections.map((key) => [key, part.kicker])));

export const ZIWEI_AI_SECTION_GLYPHS: Record<string, string> = {
  reading_guide: "序", personality_profile: "性", structure_core: "核", influence_factors: "影", evidence_basis: "據",
  essence: "命", flow: "化", triad_axis: "合", twelve_palaces: "宮", career: "官", wealth: "財", relationship: "緣",
  dayun_now: "運", timing_strategy: "時", caution: "忌", domain_matrix: "域", core_answer: "問", action_plan: "行", prescription: "策",
};

export type ZiweiAiSection = { key: string; title: string; body: string; glyph: string; isGuide: boolean; kicker: string };
type Row = Record<string, unknown>;
const record = (value: unknown): Row => (value && typeof value === "object" && !Array.isArray(value) ? value as Row : {});
const text = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value)).trim();

/** 판 2 여부: 결과 API의 groupPlanVersion, 저장 문서의 llmMeta, 또는 판 2에만 있는 nature 묶음으로 안다. */
export function isZiweiAiPlanV2(source: unknown): boolean {
  const row = record(source);
  if (Number(row.groupPlanVersion) === 2 || Number(record(row.llmMeta).groupPlanVersion) === 2) return true;
  return Boolean(record(row.groups).nature || record(record(row.llmMeta).groups).nature);
}

export function parseZiweiAiStructured(content: string): { meta?: Row; sections: Row } | null {
  const normalized = String(content || "").replace(/\r\n/g, "\n").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(normalized.slice(start, end + 1)) as { meta?: Row; sections?: unknown };
    return parsed?.sections && typeof parsed.sections === "object" ? { meta: record(parsed.meta), sections: record(parsed.sections) } : null;
  } catch {
    return null;
  }
}

/** 구조화 본문을 판에 맞는 순서의 섹션 목록으로. 본문이 있는 키만 남는다(예전 상담의 빠진 키 폴백). */
export function orderZiweiAiSections(sections: Row, planV2: boolean): ZiweiAiSection[] {
  const order: readonly string[] = planV2 ? ZIWEI_AI_SECTION_ORDER_V2 : ZIWEI_AI_SECTION_ORDER_V1;
  return order.filter((key) => text(record(sections[key]).body)).map((key) => {
    const section = record(sections[key]);
    return {
      key,
      title: text(section.title) || key,
      body: text(section.body),
      glyph: ZIWEI_AI_SECTION_GLYPHS[key] || "星",
      isGuide: key === "reading_guide",
      kicker: planV2 ? V2_KICKER[key] || "" : "",
    };
  });
}

// 화면용 굵은 소제목 줄은 PDF 소제목(●)으로, 문장 속 굵게 표시는 기호만 걷는다.
function toBookBody(value: string) {
  return value.replace(/\r\n/g, "\n").split("\n").map((line) => {
    const heading = line.trim().match(/^(?:#{1,3}\s*)?\*\*([^*]+)\*\*[:：]?$/);
    return heading ? `● ${heading[1].trim()}` : line.replace(/\*\*/g, "");
  }).join("\n");
}

/**
 * 받은 자미두수 상담 전체를 조판 PDF 장 목록으로. 화면과 같은 순서이고, 읽는 법(reading_guide)은 판 1에서 맨 끝에 둔다.
 * 구조화되지 않은 예전 답변은 통째로 한 장이 된다.
 */
export function buildZiweiAiPdfChapters(source: { messages?: Array<{ role?: string; content?: string }> | null } & Row): ConsultationBookChapter[] {
  const messages = Array.isArray(source.messages) ? source.messages : [];
  const answer = messages.filter((message) => message?.role === "assistant").map((message) => text(message.content)).find(Boolean) || "";
  if (!answer) return [];
  const structured = parseZiweiAiStructured(answer);
  if (!structured) return [{ kicker: "", title: "자미두수 상담", body: toBookBody(answer), speaker: ZIWEI_AI_SPEAKER }];
  const planV2 = isZiweiAiPlanV2(source);
  return orderZiweiAiSections(structured.sections, planV2)
    .map((section) => ({ kicker: section.kicker, title: section.title, body: toBookBody(section.body), speaker: ZIWEI_AI_SPEAKER }));
}
