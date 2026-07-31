"use client";
/**
 * 히어로 — 거대한 나침반 + 운명의 좌표 한 문장.
 * 다이얼을 새로 만들지 않는다. 기존 CompassDial 에 state prop 만 얹어 회전/착지를 맡긴다.
 * 소비처가 둘(처리 화면=회전, 결과 ①=착지)이라 레이아웃 래퍼를 파일로 분리했다.
 */
import { CompassDial } from "./CompassDial";
import type { DirectionKey, DirectionScore, ScoreBand } from "../_engine/types";
import { DIRECTION_LABEL_KO } from "../_engine/constants";
import styles from "./map.module.css";

/**
 * 밴드 × 대표 방향 → "당신은 지금 ○○" 한 문장. 결정론 문구표(난수 금지).
 * LLM 이 죽어도 이 문장은 항상 나온다.
 */
const COORDINATE_BY_BAND: Record<ScoreBand, string> = {
  strong: "결단의 시기",
  steady: "성장의 갈림길",
  caution: "휴식의 계절",
};

/** 받침 유무 판정. 한글이 아니면 받침 없음으로 본다. */
function hasFinalConsonant(word: string): { has: boolean; isRieul: boolean } {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return { has: false, isRieul: false };
  const jong = (code - 0xac00) % 28;
  return { has: jong !== 0, isRieul: jong === 8 };
}

/** 조사 자동 선택 — "연애으로"/"재물를" 같은 문장이 화면에 나가지 않게. */
function josa(word: string, kind: "euro" | "eul" | "i"): string {
  const { has, isRieul } = hasFinalConsonant(word);
  if (kind === "euro") return has && !isRieul ? "으로" : "로";
  if (kind === "eul") return has ? "을" : "를";
  return has ? "이" : "가";
}

export function coordinateLine(band: ScoreBand, primary: DirectionKey): string {
  const area = DIRECTION_LABEL_KO[primary]?.split("·")[0] || "";
  if (band === "strong") return `${area}의 문 앞, ${COORDINATE_BY_BAND.strong}`;
  if (band === "caution") return `${area}${josa(area, "eul")} 잠시 내려놓는, ${COORDINATE_BY_BAND.caution}`;
  return `${area}${josa(area, "euro")} 기우는, ${COORDINATE_BY_BAND.steady}`;
}

interface CompassHeroProps {
  directions?: DirectionScore[];
  primary?: DirectionKey;
  band?: ScoreBand;
  /** 0..1 */
  confidence?: number;
  state?: "idle" | "spinning" | "settling";
  /** 처리 화면처럼 좁은 자리에서는 다이얼을 줄인다. */
  compact?: boolean;
}

/**
 * 🔴 좌표 문장은 여기서 그리지 않는다 — 섹션 제목(h1)이 그 문장이다.
 *    예전엔 여기서 h1 을 그려 섹션 헤더(h2)보다 뒤에 h1 이 오는 헤딩 역전이 났다.
 */
export function CompassHero({ directions, primary, state, compact }: CompassHeroProps) {
  return (
    <div className={styles.heroWrap}>
      <CompassDial mode="result" directions={directions} primary={primary} state={state} compact={compact} />
    </div>
  );
}

/** 신뢰도 별점 — ① 좌표 아래에 붙는다. */
export function ConfidenceMeta({ confidence }: { confidence: number }) {
  const stars = Math.max(3, Math.min(5, Math.round(confidence * 5)));
  const pct = Math.round(confidence * 100);
  return (
    <p className={styles.heroMeta}>
      <span className={styles.heroStars} role="img" aria-label={`방향 일치도 5점 만점에 ${stars}점 · 신뢰도 ${pct}%`}>
        <span aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
      </span>
      <span>신뢰도 {pct}%</span>
    </p>
  );
}
