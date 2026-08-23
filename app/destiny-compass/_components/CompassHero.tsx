"use client";
/**
 * 히어로 — 거대한 나침반 + 운명의 좌표 한 문장.
 * 다이얼을 새로 만들지 않는다. 기존 CompassDial 에 state prop 만 얹어 회전/착지를 맡긴다.
 * 소비처가 둘(처리 화면=회전, 결과 ①=착지)이라 레이아웃 래퍼를 파일로 분리했다.
 */
import { CompassDial } from "./CompassDial";
import type { DirectionKey, DirectionScore, ScoreBand } from "../_engine/types";
import type { DestinyCompassCopy } from "../_lib/copy";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";

/**
 * 밴드 × 대표 방향 → "당신은 지금 ○○" 한 문장. 결정론 문구표(난수 금지).
 * LLM 이 죽어도 이 문장은 항상 나온다. 한국어의 조사(을/를, 으로/로) 자동 선택 같은
 * 언어별 문장 구성은 copy.ts 의 coordinateSentence 가 로케일마다 직접 담당한다.
 */
export function coordinateLine(band: ScoreBand, primary: DirectionKey, copy: DestinyCompassCopy): string {
  const area = copy.directionShortLabel[primary] || "";
  return copy.coordinateSentence(band, area);
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
  const copy = useDestinyCompassCopy();
  const stars = Math.max(3, Math.min(5, Math.round(confidence * 5)));
  const pct = Math.round(confidence * 100);
  return (
    <p className={styles.heroMeta}>
      <span className={styles.heroStars} role="img" aria-label={copy.confidenceAriaLabel(stars, pct)}>
        <span aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
      </span>
      <span>{copy.confidenceLabel(pct)}</span>
    </p>
  );
}
