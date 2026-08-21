/**
 * 운명의 나침반 입력 화면 — 상태별 대사 템플릿(캐릭터별 물리 분리).
 * 톤 가드레일: 꽃돼지는 이 화면에서 절대 팩폭하지 않는다(힐링·따뜻한 존댓말).
 * 사자(네오)는 입력 완료 후에만 한 마디, 짧게. 연이는 제출 트랜지션 내레이션 1줄.
 * 문구는 DestinyCompassCopy(copy.ts)에서 로케일별로 온다 — 이 파일은 상태머신 타입만 소유.
 */
import type { DestinyCompassCopy } from "../_lib/copy";

/** 입력 화면 상태 머신 */
export type MapInputPhase = "intro" | "waiting" | "typing" | "valid" | "submit";

/** 꽃돼지 표정(PigFace 표현과 1:1) */
export type PigExpr = "neutral" | "happy" | "talk" | "think" | "surprise";

export interface PigLine {
  expr: PigExpr;
  text: string;
}

/** 꽃돼지 — 상태별 위로/안내(힐링 전용). */
export function pigLines(copy: DestinyCompassCopy): Record<MapInputPhase, PigLine> {
  return copy.pigLines;
}

/** 네오(사자) — 입력이 충분히 채워졌을 때만 등장하는 한 마디. */
export function neoValidLine(copy: DestinyCompassCopy): string {
  return copy.neoValidLine;
}

/** 연이 — 제출 순간, 여정으로 넘어가는 내레이션 1줄. */
export function yeoniVoyageLine(copy: DestinyCompassCopy): string {
  return copy.yeoniVoyageLine;
}
