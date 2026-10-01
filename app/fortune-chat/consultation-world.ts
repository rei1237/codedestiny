import type { ChatConsultation, ChatPersona } from "./consultation-api";

/**
 * 연이·네오 상담 세계(3단계). 결과의 정보 위계와, 상담자를 바꿔도 각자 보던 상담이 남는 보관함.
 *
 * - 연이: 마음부터 — 핵심 답변 → 요약 카드 → 근거 → 흐름 → 시기 → 행동 (2단계 계약 그대로).
 * - 네오(별빛 전략실): 판단부터 — 핵심 판단 → 지금 할 일 → 시기 → 판단 근거 → 판세 → 장별 브리핑.
 * 마무리는 두 세계 모두 맨 끝이다.
 */
export type ResultSection = "core" | "summary" | "evidence" | "flow" | "timing" | "action";

export const RESULT_ORDER: Record<ChatPersona, ResultSection[]> = {
  yeoni: ["core", "summary", "evidence", "flow", "timing", "action"],
  neo: ["core", "action", "timing", "evidence", "flow", "summary"],
};

export const SECTION_LABEL: Record<ChatPersona, Record<ResultSection | "closing", string>> = {
  yeoni: { core: "핵심 답변", summary: "요약 카드", evidence: "근거", flow: "흐름", timing: "시기", action: "행동", closing: "마무리" },
  neo: { core: "핵심 판단", summary: "장별 브리핑", evidence: "판단 근거", flow: "판세", timing: "시기", action: "지금 할 일", closing: "마무리" },
};

export type PersonaRows = Record<ChatPersona, ChatConsultation | null>;

export const EMPTY_ROWS: PersonaRows = { yeoni: null, neo: null };

/** 사용자가 연 상담(기록·새로 만들기·결제 복귀)을 그 상담자 칸에 놓는다. 다른 상담자 칸은 건드리지 않는다. */
export function showRow(rows: PersonaRows, row: ChatConsultation): PersonaRows {
  return { ...rows, [row.persona]: row };
}

/**
 * 폴링·활성화·이어 쓰기처럼 뒤늦게 도착한 응답은 그 칸이 아직 같은 상담일 때만 바꾼다.
 * 그사이 새 상담을 시작했거나 다른 상담을 열었으면 낡은 응답이 되살아나지 않는다.
 */
export function refreshRow(rows: PersonaRows, row: ChatConsultation): PersonaRows {
  return rows[row.persona]?.id === row.id ? { ...rows, [row.persona]: row } : rows;
}
