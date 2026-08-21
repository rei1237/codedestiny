/**
 * AI 문장화 입력 빌더 — 결정론 DirectionField(규칙 산출)에서 AI에게 넘길 구조화 데이터를 추출.
 * AI는 이 숫자·판정·근거를 "문장화"만 한다(재생성 금지). 클라이언트 순수 함수.
 */
import type { DirectionField, DirectionKey, SystemKey } from "../_engine/types";
import type { DestinyCompassCopy } from "../_lib/copy";

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

const short = (copy: DestinyCompassCopy, k: DirectionKey) => copy.directionShortLabel[k];

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

export function buildNarrationInput(field: DirectionField, question: string, copy: DestinyCompassCopy): NarrationInput {
  return {
    question: question || "",
    primaryLabel: short(copy, field.primary.key),
    primaryBand: field.primary.band,
    openLabel: short(copy, field.strongArea.key),
    blockedLabel: short(copy, field.blockedArea.key),
    tops: field.directions.slice(0, 4).map((d) => ({ label: short(copy, d.key), score: d.score })),
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

// ── 규칙 템플릿(무료 해설) ────────────────────────────────────────────
// CompassReport 이전의 MapResult 에 있던 것을 그대로 옮겨 왔다(사본 아님 — 원본은 삭제됐다).
// AI 문장화의 원문이자 폴백이다. 🔴 출력 shape 을 바꾸면 서버 isFaithful 이 primaryLabel
// 포함 여부로 판정하므로 매번 UNFAITHFUL 이 되어 다국어가 무력화된다.

/** 결정론 변주 선택(난수 금지) — 같은 시드 → 같은 문장. */
function variantIdx(seed: string, n: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
  return (h >>> 0) % n;
}

/** AI 채택 전 안전 가드 — 한국어 출력에만 성립하는 위험 소재 검사. */
export const NARRATION_RISKY = /소송|고소|진단|처방|투약|매수|매도|주식|코인|확실히 (오|올)|반드시 (오|올)/;

/**
 * 꽃돼지 규칙 템플릿 — 밴드별 4변주. 대표(dir)·쉬어갈(blocked)·강한(strong) 영역 이름을 보존하고
 * "무엇을 왜 어떻게"까지 담는다(사람이 곁에서 봐준 듯한 조언). 문장 자체는 copy.ts 의
 * pigCommentaryStrong/Caution/Steady 에서 로케일별로 온다 — 여기는 변주 선택과 영역 이름만 조립한다.
 */
export function pigCommentary(field: DirectionField, copy: DestinyCompassCopy): string {
  const dir = short(copy, field.primary.key);
  const blocked = short(copy, field.blockedArea.key);
  const strong = short(copy, field.strongArea.key);
  // 강한 영역이 대표와 다를 때만 '보조 자원'으로 언급(중복 회피).
  const ally = strong && strong !== dir ? strong : "";
  const v = variantIdx(field.seed, 4);
  if (field.primary.band === "strong") return copy.pigCommentaryStrong(dir, ally)[v];
  if (field.primary.band === "caution") return copy.pigCommentaryCaution(dir, blocked, ally)[v];
  return copy.pigCommentarySteady(dir, ally)[v];
}

/** 시스템별 상위 기여 방향(field.raw 읽기 전용). */
export function topContributions(field: DirectionField, sys: SystemKey, limit = 2): DirectionKey[] {
  const c = field.raw?.[sys];
  if (!c) return [];
  return (Object.entries(c.directions) as [DirectionKey, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/** 시스템별 대표 근거 원용어. */
export function evidenceTerm(field: DirectionField, sys: SystemKey): string | null {
  return field.raw?.[sys]?.evidence?.[0]?.term ?? null;
}

export { short as shortDirectionLabel };
