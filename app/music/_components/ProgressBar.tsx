"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMusicProgressStore } from "../_stores/useMusicProgressStore";
import { formatTime } from "../_lib/musicFormat";
import styles from "../music-lounge.module.css";

type ProgressBarProps = {
  seek: (seconds: number) => void;
  label: string;
  valueText: (current: string, total: string) => string;
};

// 진행률 store(4Hz)를 구독하는 유일한 지점. 드래그 중에는 로컬 값을 쓰고 놓을 때만 seek 한다.
export function ProgressBar({ seek, label, valueText }: ProgressBarProps) {
  const currentTime = useMusicProgressStore((state) => state.currentTime);
  const duration = useMusicProgressStore((state) => state.duration);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const shown = dragValue ?? currentTime;
  const max = duration > 0 ? duration : 0;
  const ratio = max > 0 ? Math.min(1, shown / max) : 0;

  const commit = useCallback(() => {
    if (dragRef.current !== null) {
      seek(dragRef.current);
      dragRef.current = null;
      setDragValue(null);
    }
  }, [seek]);

  useEffect(() => () => { dragRef.current = null; }, []);

  return (
    <div className={styles.progress}>
      <span className={styles.time}>{formatTime(shown)}</span>
      <input
        className={styles.range}
        type="range"
        min={0}
        max={max || 1}
        step={0.5}
        value={max > 0 ? shown : 0}
        disabled={max <= 0}
        aria-label={label}
        aria-valuetext={valueText(formatTime(shown), formatTime(max))}
        style={{ "--fill": `${ratio * 100}%` } as React.CSSProperties}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          dragRef.current = next;
          setDragValue(next);
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <span className={styles.time}>{formatTime(max)}</span>
    </div>
  );
}

// 미니 플레이어용 1px 라인. 합성만 일어나도록 transform 으로 채운다.
export function MiniProgress() {
  const currentTime = useMusicProgressStore((state) => state.currentTime);
  const duration = useMusicProgressStore((state) => state.duration);
  const ratio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  return (
    <span className={styles.miniProgress} aria-hidden="true">
      <span className={styles.miniProgressFill} style={{ transform: `scaleX(${ratio})` }} />
    </span>
  );
}
