/**
 * 운명의 지도 입력 화면 — 상태별 대사 템플릿(캐릭터별 물리 분리).
 * 톤 가드레일: 꽃돼지는 이 화면에서 절대 팩폭하지 않는다(힐링·따뜻한 존댓말).
 * 사자(네오)는 입력 완료 후에만 한 마디, 짧게. 연이는 제출 트랜지션 내레이션 1줄.
 */

/** 입력 화면 상태 머신 */
export type MapInputPhase = "intro" | "waiting" | "typing" | "valid" | "submit";

/** 꽃돼지 표정(PigFace 표현과 1:1) */
export type PigExpr = "neutral" | "happy" | "talk" | "think" | "surprise";

export interface PigLine {
  expr: PigExpr;
  text: string;
}

/** 꽃돼지 — 상태별 위로/안내(힐링 전용). */
export const PIG_LINES: Record<MapInputPhase, PigLine> = {
  intro: { expr: "talk", text: "지금 마음에 걸리는 걸, 한 가지만 들려주세요." },
  waiting: { expr: "think", text: "천천히 괜찮아요. 떠오르는 그대로 적어도 돼요." },
  typing: { expr: "happy", text: "좋아요. 그 마음, 지도가 듣고 있어요." },
  valid: { expr: "happy", text: "준비됐어요. 함께 길을 찾아볼까요?" },
  submit: { expr: "surprise", text: "자, 안개 너머로 가볼게요." },
};

/** 네오(사자) — 입력이 충분히 채워졌을 때만 등장하는 한 마디. */
export const NEO_VALID_LINE = "방향은 내가 잡아줄게. 눌러.";

/** 연이 — 제출 순간, 여정으로 넘어가는 내레이션 1줄. */
export const YEONI_VOYAGE_LINE = "숨을 고르고, 별빛을 따라가 봐요.";
