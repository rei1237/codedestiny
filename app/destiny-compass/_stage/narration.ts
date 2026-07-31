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
 * "무엇을 왜 어떻게"까지 담는다(사람이 곁에서 봐준 듯한 조언).
 */
export function pigCommentary(field: DirectionField): string {
  const dir = short(field.primary.key);
  const blocked = short(field.blockedArea.key);
  const strong = short(field.strongArea.key);
  // 강한 영역이 대표와 다를 때만 '보조 자원'으로 언급(중복 회피).
  const ally = strong && strong !== dir ? strong : "";
  const v = variantIdx(field.seed, 4);
  if (field.primary.band === "strong") {
    return [
      `지금은 '${dir}' 쪽으로 길이 활짝 열려 있어요. 크게 밀어붙이기보다, 이번 주에 딱 한 걸음만 가볍게 내디뎌 보면 그 문이 더 크게 열려요.`,
      `'${dir}'의 문이 지금 활짝 열려 있어요. 준비해온 걸 믿고, 오늘 아주 작은 시작 하나만 만들어 보세요. 완벽하지 않아도 괜찮아요 — 시작이 방향을 확인시켜 줘요.`,
      ally
        ? `'${dir}' 쪽 바람이 순하게 불어와요. 든든한 '${ally}'의 힘까지 곁들이면, 지금 손대는 한 가지가 생각보다 멀리 데려다줄 거예요.`
        : `'${dir}' 쪽 바람이 순하게 불어와요. 조급함은 잠시 내려놓고, 지금 할 수 있는 한 가지부터 손대면 그 흐름을 그대로 탈 수 있어요.`,
      `'${dir}'는 지금이 밀어줄 때예요. 미뤄뒀던 일이 있다면 오늘 그 첫 문장·첫 연락·첫 정리 하나만 해두세요. 그거면 충분해요.`,
    ][v];
  }
  if (field.primary.band === "caution") {
    return [
      `'${blocked}' 쪽은 지금 잠시 안개가 짙어요. 억지로 밀지 말고, 대신 '${dir}' 쪽으로 향하는 작은 시도 하나에 마음을 실어 보면 흐름이 살며시 바뀌어요.`,
      `지금 '${blocked}'는 잠깐 쉬어가도 괜찮아요. 힘을 아꼈다가, 오늘은 '${dir}' 쪽으로 가벼운 한 걸음만 내디뎌 보세요. 마음이 한결 가벼워질 거예요.`,
      ally
        ? `'${blocked}' 쪽 안개는 곧 걷혀요. 그때까지는 '${dir}'과 든든한 '${ally}' 쪽에 힘을 모아, 오늘 할 수 있는 작은 일 하나에만 집중해요.`
        : `'${blocked}' 쪽 안개는 곧 걷혀요. 무리하지 말고, 오늘은 '${dir}' 쪽으로 향하는 작은 일 하나에만 마음을 실어 봐요.`,
      `'${blocked}'에서 자꾸 애쓰다 지치셨죠. 잠깐 내려놓아도 돼요. 그 힘을 '${dir}' 쪽 한 걸음에 옮겨 두면, 오히려 막힌 곳이 스르르 풀리기도 해요.`,
    ][v];
  }
  return [
    `'${dir}' 쪽 길이 은은하게 빛나고 있어요. 서두르지 말고, 오늘 마음이 가는 한 가지부터 시작하면 그 빛이 조금씩 또렷해져요.`,
    `'${dir}'는 지금 천천히 데워지는 중이에요. 조바심 대신, 오늘 할 수 있는 작은 한 걸음에 마음을 실어보세요. 데워진 만큼 길이 선명해져요.`,
    ally
      ? `'${dir}' 쪽으로 은은한 빛이 나 있어요. 크게 바꾸려 하기보다, 든든한 '${ally}'를 발판 삼아 매일 조금씩 방향만 지켜가도 충분해요.`
      : `'${dir}' 쪽으로 은은한 빛이 나 있어요. 크게 바꾸려 하기보다, 매일 조금씩 방향만 지켜가도 그걸로 충분해요.`,
    `'${dir}'는 요란하지 않아도 분명히 당신 편이에요. 오늘 딱 하나, 작지만 손에 잡히는 걸 정해 마무리해 보세요. 그 감각이 다음 걸음을 불러와요.`,
  ][v];
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
