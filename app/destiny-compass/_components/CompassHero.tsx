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

export function coordinateLine(band: ScoreBand, primary: DirectionKey): string {
  const area = DIRECTION_LABEL_KO[primary]?.split("·")[0] || "";
  if (band === "strong") return `${area}의 문 앞, ${COORDINATE_BY_BAND.strong}`;
  if (band === "caution") return `${area}을 잠시 내려놓는, ${COORDINATE_BY_BAND.caution}`;
  return `${area}으로 기우는, ${COORDINATE_BY_BAND.steady}`;
}

interface CompassHeroProps {
  directions?: DirectionScore[];
  primary?: DirectionKey;
  band?: ScoreBand;
  /** 0..1 */
  confidence?: number;
  state?: "idle" | "spinning" | "settling";
  /** 좌표 문장을 h1 으로 그릴지(결과 ①) — 처리 화면에서는 문장을 그리지 않는다. */
  showCoordinate?: boolean;
}

export function CompassHero({ directions, primary, band, confidence, state, showCoordinate }: CompassHeroProps) {
  const stars = typeof confidence === "number" ? Math.max(3, Math.min(5, Math.round(confidence * 5))) : null;

  return (
    <div className={styles.heroWrap}>
      <CompassDial mode="result" directions={directions} primary={primary} state={state} />
      {showCoordinate && band && primary && (
        <>
          <span className={styles.heroLead}>당신은 지금</span>
          <h1 className={styles.heroCoordinate}>{coordinateLine(band, primary)}</h1>
          {stars != null && (
            <p className={styles.heroMeta}>
              <span
                className={styles.heroStars}
                role="img"
                aria-label={`방향 일치도 5점 만점에 ${stars}점 · 신뢰도 ${Math.round((confidence as number) * 100)}%`}
              >
                <span aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
              </span>
              <span>신뢰도 {Math.round((confidence as number) * 100)}%</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
