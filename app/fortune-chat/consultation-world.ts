import type { ChatConsultation, ChatDomain, ChatPersona } from "./consultation-api";
import type { PersonaMood } from "./personaSprite";

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

export type Art = { src: string; alt: string };

/**
 * 운세 축마다 상담자가 앉은 자리(4단계). 연이는 운세 입구 그림(consultation/*-yeoni-entry)을 그대로 쓰고,
 * 네오는 같은 다섯 장면을 별빛 전략실로 다시 그렸다(fortune-chat/neo/*).
 */
export const DOMAIN_ART: Record<ChatPersona, Record<ChatDomain, Art>> = {
  yeoni: {
    saju: { src: "/images/consultation/saju-yeoni-entry-v2-640.webp", alt: "오행의 흐름이 담긴 책을 펼치는 연이" },
    ziwei: { src: "/images/consultation/ziwei-yeoni-entry-v1-640.webp", alt: "열두 궁의 별자리 판을 정리하는 연이" },
    sukuyo: { src: "/images/consultation/sukuyo-yeoni-entry-v1-640.webp", alt: "달빛 정원에서 스물일곱 별의 흐름을 안내하는 연이" },
    vedic: { src: "/images/consultation/vedic-yeoni-entry-v1-640.webp", alt: "천문 관측 도구와 달의 지도를 살펴보는 연이" },
    astrology: { src: "/images/consultation/astrology-yeoni-entry-v1-640.webp", alt: "아스트롤라베와 출생 천궁도를 살펴보는 연이" },
  },
  neo: {
    saju: { src: "/images/fortune-chat/neo/saju-640.webp", alt: "다섯 기운의 판 위에서 말을 옮기는 네오" },
    ziwei: { src: "/images/fortune-chat/neo/ziwei-640.webp", alt: "열두 궁 별자리 판을 지휘봉으로 짚는 네오" },
    sukuyo: { src: "/images/fortune-chat/neo/sukuyo-640.webp", alt: "달빛 아래 스물일곱 별의 두루마리를 읽는 네오" },
    vedic: { src: "/images/fortune-chat/neo/vedic-640.webp", alt: "관측소에서 별 지도를 재는 네오" },
    astrology: { src: "/images/fortune-chat/neo/astrology-640.webp", alt: "천궁도와 망원경 앞에서 판을 짜는 네오" },
  },
};

/** 기다림·빈 기록·오류 순간의 그림. 의미는 늘 옆의 글이 전하므로 그림은 장식(alt 없음)이고, 상담자의 세계를 이어 준다. */
export type RoomMoment = "loading" | "empty" | "error";

export const MOMENT_ART: Record<ChatPersona, Record<RoomMoment, string>> = {
  yeoni: {
    loading: "/images/fortune-chat/moments/yeoni-loading.webp",
    empty: "/images/fortune-chat/moments/yeoni-empty.webp",
    error: "/images/fortune-chat/moments/yeoni-error.webp",
  },
  neo: {
    loading: "/images/fortune-chat/moments/neo-loading.webp",
    empty: "/images/fortune-chat/moments/neo-empty.webp",
    error: "/images/fortune-chat/moments/neo-error.webp",
  },
};

/**
 * 상담 단계별 표정. 오류 → 생각, 질문 전 → 인사, 질문을 쓰는 중·결제 전 → 듣기, 쓰는 중 → 읽기, 완료 → 응원.
 * 환불된 상담은 생각하는 얼굴로 둔다.
 */
export function poseFor(row: ChatConsultation | null, { failed = false, drafting = false } = {}): PersonaMood {
  if (failed) return "think";
  if (!row) return drafting ? "listen" : "greet";
  if (row.state === "COMPLETED") return "cheer";
  if (row.state === "REFUNDED") return "think";
  return row.paid ? "read" : "listen";
}
