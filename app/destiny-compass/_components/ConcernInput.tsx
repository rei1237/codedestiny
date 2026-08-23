"use client";
/**
 * 현재 위치 — 꽃돼지가 상태별로 위로하며 고민을 묻고, "고대의 나침반에 질문을 새기는" 입력 +
 * 나침반 6축 빠른질문 칩. 칩 hover/포커스 → 대응 지도 노드 발광(onSpotlight).
 * 입력값 = CompassInput.situation. 상태머신은 mapDialogue(PIG_LINES/NEO_VALID_LINE) 사용.
 */
import { useEffect, useRef, useState } from "react";
import { CHIP_AXES } from "./mapRegions";
import { ConstellationMark, type ConstellationVariant } from "./ConstellationMark";
import { pigLines, neoValidLine, type MapInputPhase, type PigExpr } from "../_stage/mapDialogue";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";

// 칩 축(지도 노드) → 노드 고유 톤. 성좌 마크·칩 발광이 대응 노드 색과 연동된다.
const REGION_TONE: Record<string, string> = {
  castle: "var(--cd-node-castle)",
  forest: "var(--cd-node-forest)",
  city: "var(--cd-node-city)",
  lake: "var(--cd-node-lake)",
  fog: "var(--cd-node-fog)",
};

interface ConcernInputProps {
  onSubmit: (concern: string) => void;
  /** 칩 hover/포커스 시 대응 노드 발광(null=해제) */
  onSpotlight?: (region: string | null) => void;
  /** 무입력 대기(8초) 상태 — 사자 고개 기울임 트리거 */
  onWaitingChange?: (waiting: boolean) => void;
  /** 꽃돼지 표정 동기화 */
  onPigExpr?: (expr: PigExpr) => void;
}

const IDLE_MS = 8000;
// 프레임 성좌 데코(장식) — 유니코드 룬 대신 자체 SVG 별자리.
const RUNE_VARIANTS: ConstellationVariant[] = [0, 2, 4, 1, 3, 5];

export function ConcernInput({ onSubmit, onSpotlight, onWaitingChange, onPigExpr }: ConcernInputProps) {
  const copy = useDestinyCompassCopy();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = value.trim();
  const phase: MapInputPhase = trimmed.length >= 2 ? "valid" : value.length > 0 ? "typing" : waiting ? "waiting" : "intro";
  const line = pigLines(copy)[phase];
  const fill = Math.min(value.length / 24, 1);

  // 무입력 8초 → waiting. 입력이 있으면 즉시 해제.
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (value.length === 0) {
      idleTimer.current = setTimeout(() => setWaiting(true), IDLE_MS);
    } else if (waiting) {
      setWaiting(false);
    }
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [value, waiting]);

  useEffect(() => {
    onWaitingChange?.(phase === "waiting");
  }, [phase, onWaitingChange]);

  useEffect(() => {
    onPigExpr?.(line.expr);
  }, [line.expr, onPigExpr]);

  const submit = (v: string) => {
    const t = v.trim();
    if (t) onSubmit(t);
  };

  return (
    <div className={styles.concern}>
      <div className={styles.concernIntro} aria-live="polite">
        <span>{copy.todaysQuestionLabel}</span>
        <p>{line.text}</p>
      </div>

      {/* 고대의 나침반 — 질문을 새기는 오브젝트 */}
      <form
        className={styles.oracle}
        data-focused={focused || undefined}
        data-filled={value.length > 0 || undefined}
        style={{ ["--fill" as string]: fill }}
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <span className={styles.oracleRunes} aria-hidden="true">
          {RUNE_VARIANTS.map((v, i) => (
            <span key={i} className={styles.rune}>
              <ConstellationMark variant={v} size={13} />
            </span>
          ))}
        </span>
        <input
          className={styles.oracleInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={copy.concernPlaceholder}
          aria-label={copy.concernInputAriaLabel}
          maxLength={80}
          autoComplete="off"
        />
        <button type="submit" className={styles.oracleGo} disabled={!trimmed} aria-label={copy.findDirectionAriaLabel}>
          <svg className={styles.needle} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
            <path d="M12 3.4L14.4 12 12 20.6 9.6 12z" fill="currentColor" />
            <circle cx="12" cy="12" r="1.6" fill="#12061f" />
          </svg>
          <span className={styles.oracleGoText}>{copy.findDirectionText}</span>
        </button>
      </form>

      {/* 네오 — 입력 충분할 때만 짧은 한 마디 */}
      <p className={styles.neoAside} data-on={phase === "valid" || undefined}>
        <b>{copy.neoName}</b> {neoValidLine(copy)}
      </p>

      {/* 빠른 질문 — 나침반 6축(칩→대응 노드 발광) */}
      <div className={styles.chipDeck}>
        <span className={styles.chipDeckLabel}>{copy.quickQuestionLabel}</span>
        <div className={styles.chips} role="group" aria-label={copy.quickQuestionAriaLabel}>
          {CHIP_AXES.map((c, i) => (
            <button
              key={c.key}
              type="button"
              className={styles.chip}
              style={{ ["--chip-tone" as string]: REGION_TONE[c.region] || "var(--cd-map-gold)" }}
              onMouseEnter={() => onSpotlight?.(c.region)}
              onMouseLeave={() => onSpotlight?.(null)}
              onFocus={() => onSpotlight?.(c.region)}
              onBlur={() => onSpotlight?.(null)}
              onClick={() => submit(c.seed)}
            >
              <span className={styles.chipGem} aria-hidden="true">
                <ConstellationMark variant={(i % 6) as ConstellationVariant} tone={REGION_TONE[c.region] || "var(--cd-map-gold)"} size={15} />
              </span>
              {copy.chipLabel[c.key] ?? c.key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
