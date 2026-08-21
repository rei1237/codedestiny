"use client";
/**
 * 처리 화면 — 거대한 나침반이 돌고, 진행 라인이 하나씩 켜진다.
 *
 * 🔴 정직성 수정 2건:
 *  · "점성술 — 행성을 정렬하는 중" 줄을 없앴다. 어댑터가 없어 계산에 참여하지 않는데
 *    화면에만 세워 두면 있지도 않은 근거를 약속하게 된다.
 *  · 베다 줄은 "다샤를 정렬하는 중" → "바라(요일 지배성)를 세는 중". vedicAdapter 는
 *    판차앙가 5요소 중 바라만 계산한다. 다샤는 이 엔진이 하지 않는 일이었다.
 *
 * 진행 표현: 앞의 다섯 라인은 전환 연출과 같은 리듬으로 켜지고, 마지막 '종합' 라인은
 * 실제 계산이 끝날 때까지 켜진 상태로 남는다(가짜 100% 진행바를 두지 않는다).
 * 라이브 영역은 라인마다가 아니라 **요약 한 줄**이다 — 6개면 스크린리더가 지옥이 된다.
 */
import { useEffect, useMemo, useState } from "react";
import { CompassHero } from "./CompassHero";
import { processLines } from "./reportSections";
import { useFxTier } from "../_hooks/useFxTier";
import { yeoniVoyageLine } from "../_stage/mapDialogue";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";

/** 라인 간격 — 다섯 라인이 최소 노출(2.2s) 안에서 순차로 켜진다. */
const STEP_MS = 320;

export function ProcessingScene() {
  const copy = useDestinyCompassCopy();
  const fxTier = useFxTier();
  const lines = useMemo(() => processLines(copy), [copy]);
  const [lit, setLit] = useState(fxTier === "static" ? lines.length - 1 : 0);

  useEffect(() => {
    if (fxTier === "static") {
      setLit(lines.length - 1);
      return;
    }
    const timers: number[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      timers.push(window.setTimeout(() => setLit(i), STEP_MS * i));
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [fxTier, lines.length]);

  const current = lines[Math.min(lit, lines.length - 1)];

  return (
    <div className={styles.processing}>
      <div className={styles.processTitle}>{copy.processTitle}</div>
      <p className={styles.processNarration}>
        <b>{copy.pigSpeakerName}</b> &ldquo;{yeoniVoyageLine(copy)}&rdquo;
      </p>

      <CompassHero state="spinning" compact />

      <ol className={styles.processLines}>
        {lines.map((line, i) => {
          const state = i < lit ? "done" : i === lit ? "active" : "wait";
          return (
            <li key={line.key} className={styles.processLine} data-state={state}>
              <span className={styles.processMark} aria-hidden="true">{state === "done" ? "✓" : "✦"}</span>
              <span>{line.label}{state === "wait" ? "" : "…"}</span>
            </li>
          );
        })}
      </ol>

      {/* 라이브 영역은 여기 하나뿐 */}
      <p className={styles.processStatus} role="status" aria-live="polite">
        {current.label} · {Math.min(lit + 1, lines.length)}/{lines.length}
      </p>
    </div>
  );
}
