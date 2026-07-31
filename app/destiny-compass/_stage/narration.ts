/**
 * AI 문장화 입력 빌더 — 결정론 DirectionField(규칙 산출)에서 AI에게 넘길 구조화 데이터를 추출.
 * AI는 이 숫자·판정·근거를 "문장화"만 한다(재생성 금지). 클라이언트 순수 함수.
 */
import type { DirectionField, DirectionKey, SystemKey } from "../_engine/types";
import { DIRECTION_LABEL_KO } from "../_engine/constants";

export interface NarrationEvidence {
  system: SystemKey;
  term: string;
}
export interface NarrationInput {
  question: string;
  primaryLabel: string;
  primaryBand: string;
  openLabel: string;
  blockedLabel: string;
  tops: { label: string; score: number }[];
  evidence: NarrationEvidence[];
  confidencePct: number;
  sources: SystemKey[];
}

const short = (k: DirectionKey) => DIRECTION_LABEL_KO[k].split("·")[0];

/**
 * field.raw의 각 시스템 **대표 근거 1개**를 평탄화(원 용어 화이트리스트 — AI는 이 밖 용어 생성 금지).
 *
 * 🔴 체계당 evidence[0] 만 담는다. 무료 /narrate 라우트가 받은 근거를 8개로 자르는데
 *    (worker/routes/destiny-compass.js 의 evidence.slice(0, 8)), 심층 리포트용으로 늘어난
 *    항목까지 전부 밀어 넣으면 앞쪽 사주 근거만 남고 자미·숙요·타로·베다 근거가
 *    조용히 사라진다. 심층 리포트는 collectDeepEvidence(_engine/evidence) 를 따로 쓴다.
 */
export function collectEvidence(field: DirectionField): NarrationEvidence[] {
  const out: NarrationEvidence[] = [];
  for (const sys of field.sources) {
    const head = field.raw?.[sys]?.evidence?.[0];
    if (head) out.push({ system: head.system, term: head.term });
  }
  return out;
}

export function buildNarrationInput(field: DirectionField, question: string): NarrationInput {
  return {
    question: question || "",
    primaryLabel: short(field.primary.key),
    primaryBand: field.primary.band,
    openLabel: short(field.strongArea.key),
    blockedLabel: short(field.blockedArea.key),
    tops: field.directions.slice(0, 4).map((d) => ({ label: short(d.key), score: d.score })),
    evidence: collectEvidence(field),
    confidencePct: Math.round(field.confidence * 100),
    sources: field.sources,
  };
}

/** 결정론 32-bit 해시(캐시키용) — field.seed에 없는 고민(situation) 오염 방지(버그2). */
export function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return (h >>> 0).toString(36);
}
