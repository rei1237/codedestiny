/**
 * 숙요점 궁합 상담(sukuyo-compat)의 장 순서·장 메타·조판 PDF 장과 요약. 결과 화면과 보관함이 같은 규칙을 쓴다.
 * 판 1(groupPlanVersion 없음)은 저장된 sections 키 순서 그대로, 판 2는 두 별의 본성과 질문의 답(twoStars)부터 온다.
 * 화면 본문은 ConsultationReading 이 굵게 표시를 처리하므로 손대지 않고, PDF 본문만 ** 를 걷는다.
 */
import type { ConsultationBookChapter, ConsultationBookFigure, ConsultationBookSummary } from "@/lib/pdf/export-consultation-book-pdf";

export const SUKUYO_COMPAT_SPEAKER = "서한비";
export const SUKUYO_COMPAT_PRODUCT_LABEL = "숙요점 궁합";
export const SUKUYO_COMPAT_COVER_ART = "/images/service-introductions/sukuyo-compatibility-ai-960.webp";

/** 판 2 묶음(worker/lib/sukuyo-compat-delivery-v2.js의 SUKUYO_V2_SECTION_GROUPS)과 같은 순서, 부 이름은 화면·PDF의 키커다. */
const V2_PARTS: Array<{ kicker: string; sections: string[] }> = [
  { kicker: "1부 · 두 별의 본성", sections: ["twoStars", "overview", "evidence_basis"] },
  { kicker: "2부 · 끌림과 마음의 방향", sections: ["attraction", "emotionalDirection", "communication"] },
  { kicker: "3부 · 흐름과 갈등", sections: ["energyFlow", "conflict", "caution"] },
  { kicker: "4부 · 인연의 뜻", sections: ["karma", "mutualGrowth", "radiantMoment"] },
  { kicker: "5부 · 앞으로의 길", sections: ["domains", "outlook", "closingLetter"] },
];
export const SUKUYO_COMPAT_SECTION_ORDER_V2 = V2_PARTS.flatMap((part) => part.sections);
const V2_KICKER: Record<string, string> = Object.fromEntries(V2_PARTS.flatMap((part) => part.sections.map((key) => [key, part.kicker])));

type Row = Record<string, unknown>;
type Section = { title: string; body: string };
export type SukuyoCompatChapterSection = { key: string; title: string; body: string; kicker: string };
const record = (value: unknown): Row => (value && typeof value === "object" && !Array.isArray(value) ? value as Row : {});
const text = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value)).trim();

export function parseSukuyoCompatStructured(content: string): Row | null {
  const source = String(content || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(source.slice(start, end + 1)) as Row;
    return parsed && typeof parsed.sections === "object" && parsed.sections ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 판 2 여부: 결과 API의 groupPlanVersion, 저장 문서의 llmMeta, 또는(보관함은 llmMeta를 걷으므로) 판 2만 첫 키가 twoStars인 sections 순서로 안다.
 * 판 1은 essence 묶음(overview 먼저)부터 저장된다.
 */
export function isSukuyoCompatChapterPlanV2(source: unknown, sections?: unknown): boolean {
  const row = record(source);
  if (Number(row.groupPlanVersion) === 2 || Number(record(row.llmMeta).groupPlanVersion) === 2) return true;
  if (Number(row.groupPlanVersion) === 1) return false;
  return Object.keys(record(sections)).find((key) => text(record(record(sections)[key]).body)) === "twoStars";
}

/** 화면 장 목록. 판 1은 저장 순서·빈 장 포함 그대로(예전 화면), 판 2는 판 2 순서로 본문 있는 장만, 모르는 키는 뒤에 붙인다. */
export function orderSukuyoCompatSections(sections: Record<string, Section> | Row, planV2: boolean): SukuyoCompatChapterSection[] {
  const source = record(sections);
  const toSection = (key: string): SukuyoCompatChapterSection => {
    const section = record(source[key]);
    return { key, title: text(section.title) || key, body: typeof section.body === "string" ? section.body : text(section.body), kicker: planV2 ? V2_KICKER[key] || "" : "" };
  };
  if (!planV2) return Object.keys(source).map(toSection);
  const known = SUKUYO_COMPAT_SECTION_ORDER_V2.filter((key) => key in source);
  const rest = Object.keys(source).filter((key) => !V2_KICKER[key]);
  return [...known, ...rest].map(toSection).filter((section) => text(section.body));
}

/** "☯ 總論 — 종합 궁합 총평" 같은 화면 제목에서 기호·한자 머리를 떼고 한글 이름만 PDF 제목으로 쓴다. */
export function sukuyoCompatBookTitle(title: string) {
  const value = text(title);
  const dash = value.split(/\s+[—–-]\s+/);
  return text(dash.length > 1 ? dash.slice(1).join(" — ") : value.replace(/^[^\p{L}\p{N}]+\s*/u, "")) || value;
}

// 화면용 굵은 소제목 줄은 PDF 소제목(●)으로, 문장 속 굵게 표시는 기호만 걷는다.
export function toSukuyoCompatBookBody(value: string) {
  return String(value || "").replace(/\r\n/g, "\n").split("\n").map((line) => {
    const heading = line.trim().match(/^(?:#{1,3}\s*)?\*\*([^*]+)\*\*[:：]?$/);
    return heading ? `● ${heading[1].trim()}` : line.replace(/\*\*/g, "");
  }).join("\n").trim();
}

function latestAnswer(source: Row) {
  const messages = Array.isArray(source.messages) ? source.messages as Array<{ role?: string; content?: string }> : [];
  return [...messages].reverse().filter((message) => message?.role === "assistant").map((message) => text(message.content)).find(Boolean) || "";
}

/** 받은 숙요점 궁합 상담 전체를 조판 PDF 장 목록으로. 화면과 같은 순서이고 빈 장은 뺀다. 구조화되지 않은 예전 답변은 한 장이 된다. */
export function buildSukuyoCompatPdfChapters(source: Row): ConsultationBookChapter[] {
  const answer = latestAnswer(source);
  if (!answer) return [];
  const structured = parseSukuyoCompatStructured(answer);
  if (!structured) {
    if (/^\s*[{[]/.test(answer)) return [];
    return [{ kicker: "", title: "숙요점 상담", body: toSukuyoCompatBookBody(answer), speaker: SUKUYO_COMPAT_SPEAKER }];
  }
  const planV2 = isSukuyoCompatChapterPlanV2(source, structured.sections);
  return orderSukuyoCompatSections(record(structured.sections), planV2)
    .filter((section) => text(section.body))
    .map((section) => ({ kicker: section.kicker, title: sukuyoCompatBookTitle(section.title), body: toSukuyoCompatBookBody(section.body), speaker: SUKUYO_COMPAT_SPEAKER }));
}

const SCORE_LABELS: Array<[string, string]> = [["destiny", "운명 인연"], ["harmony", "기질 조화"], ["emotion", "감정 공명"], ["growth", "성장 시너지"], ["stability", "장기 안정"]];
const AXIS_LABELS: Array<[string, string]> = [
  ["emotionBond", "감정 궁합"], ["trust", "신뢰"], ["dialogue", "대화"], ["longevity", "장기 지속성"],
  ["marriage", "결혼 적합도"], ["conflictRisk", "갈등 위험도(낮을수록 좋음)"], ["growth", "상호 성장"], ["karmaBond", "카르마 연결"],
];
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);

/**
 * 결과 화면 앞머리(한 줄 요약·종합 점수·다섯 지표·관계 점수 8축)를 조판 PDF 요약 쪽으로 옮긴다.
 * 저장된 meta 값만 쓰고 생성 문장에서 숫자를 추정하지 않는다. 그릴 것이 없으면 null.
 */
export function buildSukuyoCompatPdfSummary(source: Row): ConsultationBookSummary | null {
  const structured = parseSukuyoCompatStructured(latestAnswer(source));
  const meta = record(structured?.meta);
  const a = record(meta.person_a);
  const b = record(meta.person_b);
  const relation = record(meta.relation);
  const scores = record(meta.scores);
  const axes = record(meta.axes);
  const notes = record(structured?.scoreNotes);
  const figures: ConsultationBookFigure[] = [];
  const headline = text(structured?.headline);
  const insight = toSukuyoCompatBookBody(text(structured?.insight));
  const people = [a, b].filter((person) => text(person.name)).map((person) => `${text(person.name)} · ${text(person.sukuyo)}`.replace(/ · $/, ""));
  const total = finite(scores.total) ? `종합 궁합 ${scores.total}/100` : "";
  if (headline || insight || people.length) {
    figures.push({ kind: "lead", title: "두 사람의 달빛 궁합", text: headline || total || people.join(" · "), body: insight || undefined, meta: [...people, text(relation.type_a_to_b), headline ? total : ""].filter(Boolean) });
  }
  const radar = SCORE_LABELS.filter(([key]) => finite(scores[key])).map(([key, label]) => ({ label, score: Number(scores[key]) * 5 }));
  if (radar.length >= 3) figures.push({ kind: "radar", title: "궁합 다섯 지표", axes: radar, caption: "지표마다 20점 만점을 백분율로 옮겼습니다." });
  const bars = AXIS_LABELS.filter(([key]) => finite(record(axes[key]).score)).map(([key, label]) => ({ label, value: Number(record(axes[key]).score), note: text(notes[key]) || undefined }));
  if (bars.length) figures.push({ kind: "bars", title: "관계 점수", rows: bars });
  return figures.length ? { kicker: "요약", title: "한눈에 보는 두 사람", figures } : null;
}
