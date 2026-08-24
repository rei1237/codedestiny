"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./analysis-basis.module.css";
import { currentFortuneSharedCopy } from "./_lib/fortune-shared-copy";

const COPY = currentFortuneSharedCopy();

interface GlossaryTermProps {
  /** 화면에 보이는 말 (보통 근거 항목의 label) */
  children: string;
  /** 한 줄 풀이. 없으면 툴팁 없이 평범한 텍스트로 렌더한다. */
  hint?: string;
  /** 더 깊은 설명. 있으면 툴팁 아래에 덧붙는다. */
  detail?: string;
}

/**
 * 전문용어에 점선 밑줄을 긋고, 탭/포커스로 풀이를 여는 작은 팝오버.
 * 운세를 처음 보는 사람이 용어에서 막히지 않게 하되, 화면을 설명으로 채우지는 않는다.
 */
export default function GlossaryTerm({ children, hint, detail }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!hint) return <>{children}</>;

  return (
    <span className={styles.term} ref={wrapRef}>
      <button
        type="button"
        className={styles.termButton}
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        aria-label={COPY.glossaryAria(String(children))}
        onClick={() => setOpen((previous) => !previous)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </button>
      {open && (
        <span className={styles.termPopover} id={popoverId} role="tooltip">
          {hint}
          {detail && <span className={styles.termPopoverDetail}>{detail}</span>}
        </span>
      )}
    </span>
  );
}
