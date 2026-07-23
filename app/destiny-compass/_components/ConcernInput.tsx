"use client";
/**
 * 현재 위치 — 꽃돼지가 상태별로 위로하며 고민을 묻고, "고대의 나침반에 질문을 새기는" 입력 +
 * 나침반 6축 빠른질문 칩. 칩 hover/포커스 → 대응 지도 노드 발광(onSpotlight).
 * 입력값 = CompassInput.situation. 상태머신은 mapDialogue(PIG_LINES/NEO_VALID_LINE) 사용.
 */
import { useEffect, useRef, useState } from "react";
import { CHIP_AXES } from "./mapRegions";
import { PIG_LINES, NEO_VALID_LINE, type MapInputPhase, type PigExpr } from "../_stage/mapDialogue";
import styles from "./map.module.css";

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
const RUNES = ["✦", "◇", "✧", "◇", "✦", "◇"]; // 프레임 룬 데코(장식)

export function ConcernInput({ onSubmit, onSpotlight, onWaitingChange, onPigExpr }: ConcernInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = value.trim();
  const phase: MapInputPhase = trimmed.length >= 2 ? "valid" : value.length > 0 ? "typing" : waiting ? "waiting" : "intro";
  const line = PIG_LINES[phase];
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
      {/* 꽃돼지 말풍선 — 위(현재 위치 꽃돼지)로 꼬리, 상태별 대사 크로스페이드 */}
      <div className={styles.bubbleWrap}>
        <div className={styles.speechBubble} aria-live="polite">
          <span key={phase} className={styles.bubbleLine}>{line.text}</span>
        </div>
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
          {RUNES.map((r, i) => (
            <span key={i} className={styles.rune}>{r}</span>
          ))}
        </span>
        <input
          className={styles.oracleInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="예: 창업을 해야 할까요?"
          aria-label="지금의 고민을 입력하세요"
          maxLength={80}
          autoComplete="off"
        />
        <button type="submit" className={styles.oracleGo} disabled={!trimmed} aria-label="길 찾기">
          <svg className={styles.needle} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
            <path d="M12 3.4L14.4 12 12 20.6 9.6 12z" fill="currentColor" />
            <circle cx="12" cy="12" r="1.6" fill="#12061f" />
          </svg>
          <span className={styles.oracleGoText}>길 찾기</span>
        </button>
      </form>

      {/* 네오 — 입력 충분할 때만 짧은 한 마디 */}
      <p className={styles.neoAside} data-on={phase === "valid" || undefined}>
        <b>네오</b> {NEO_VALID_LINE}
      </p>

      {/* 빠른 질문 — 나침반 6축(칩→대응 노드 발광) */}
      <div className={styles.chipDeck}>
        <span className={styles.chipDeckLabel}>빠른 질문</span>
        <div className={styles.chips} role="group" aria-label="빠른 질문 6축">
          {CHIP_AXES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={styles.chip}
              onMouseEnter={() => onSpotlight?.(c.region)}
              onMouseLeave={() => onSpotlight?.(null)}
              onFocus={() => onSpotlight?.(c.region)}
              onBlur={() => onSpotlight?.(null)}
              onClick={() => submit(c.seed)}
            >
              <span className={styles.chipGem} aria-hidden="true" />
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
