import type { ChatConsultation, ChatDomain, ChatPersona, ChatTarotKind } from "./consultation-api";
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

/**
 * 타로 상담이 읽는 고민의 종류(6C). 이름과 질문 안내는 영냥이 타로 v2 계약(consultation-contract.ts)과 같은 말이고,
 * 서버가 받는 종류(catalog.chatTarotKinds)와 순서까지 같다. 두 사람 궁합은 이름과 관계 계약이 필요해 영냥이에만 둔다.
 */
export const TAROT_KINDS: { id: ChatTarotKind; label: string; prompt: string }[] = [
  { id: "choice", label: "지금의 선택", prompt: "지금 어떤 선택을 고민하고 있나요?" },
  { id: "love", label: "사랑과 관계", prompt: "두 사람 사이에서 이해하고 싶은 장면을 알려 주세요." },
  { id: "feelings", label: "그 사람 마음", prompt: "상대의 어떤 말이나 행동이 마음에 남았나요?" },
  { id: "contact", label: "연락의 흐름", prompt: "마지막 소통과 지금 고민하는 행동을 알려 주세요." },
  { id: "reunion", label: "재회와 관계 회복", prompt: "관계가 멀어진 이유와 다시 확인하고 싶은 점은 무엇인가요?" },
  { id: "career", label: "일과 진로", prompt: "지금의 일과 생각 중인 변화는 무엇인가요?" },
  { id: "money", label: "돈과 생활", prompt: "수입·지출·생활에서 바꾸고 싶은 습관을 알려 주세요." },
  { id: "healing", label: "마음 회복", prompt: "요즘 마음을 지치게 하는 일과 필요한 도움은 무엇인가요?" },
];

export type Art = { src: string; alt: string };

/**
 * 운세 축마다 상담자가 앉은 자리(4단계). 연이는 운세 입구 그림(consultation/*-yeoni-entry)을 그대로 쓰고,
 * 네오는 같은 다섯 장면을 별빛 전략실로 다시 그렸다(fortune-chat/neo/*). 타로(6C)는 두 사람 모두 새로 그렸다.
 */
export const DOMAIN_ART: Record<ChatPersona, Record<ChatDomain, Art>> = {
  yeoni: {
    saju: { src: "/images/consultation/saju-yeoni-entry-v2-640.webp", alt: "오행의 흐름이 담긴 책을 펼치는 연이" },
    ziwei: { src: "/images/consultation/ziwei-yeoni-entry-v1-640.webp", alt: "열두 궁의 별자리 판을 정리하는 연이" },
    sukuyo: { src: "/images/consultation/sukuyo-yeoni-entry-v1-640.webp", alt: "달빛 정원에서 스물일곱 별의 흐름을 안내하는 연이" },
    vedic: { src: "/images/consultation/vedic-yeoni-entry-v1-640.webp", alt: "천문 관측 도구와 달의 지도를 살펴보는 연이" },
    astrology: { src: "/images/consultation/astrology-yeoni-entry-v1-640.webp", alt: "아스트롤라베와 출생 천궁도를 살펴보는 연이" },
    tarot: { src: "/images/fortune-chat/yeoni/tarot-640.webp", alt: "촛불 곁에서 엎어 둔 타로 카드 석 장에 앞발을 얹은 연이" },
  },
  neo: {
    saju: { src: "/images/fortune-chat/neo/saju-640.webp", alt: "다섯 기운의 판 위에서 말을 옮기는 네오" },
    ziwei: { src: "/images/fortune-chat/neo/ziwei-640.webp", alt: "열두 궁 별자리 판을 지휘봉으로 짚는 네오" },
    sukuyo: { src: "/images/fortune-chat/neo/sukuyo-640.webp", alt: "달빛 아래 스물일곱 별의 두루마리를 읽는 네오" },
    vedic: { src: "/images/fortune-chat/neo/vedic-640.webp", alt: "관측소에서 별 지도를 재는 네오" },
    astrology: { src: "/images/fortune-chat/neo/astrology-640.webp", alt: "천궁도와 망원경 앞에서 판을 짜는 네오" },
    tarot: { src: "/images/fortune-chat/neo/tarot-640.webp", alt: "작전 지도처럼 펼친 타로 카드를 한 장 들어 살피는 네오" },
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
