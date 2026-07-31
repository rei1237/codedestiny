"use client";

import { BookOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./book-open-cover.module.css";

type BookOpenCoverProps = {
  attemptId: string;
  title: string;
  subtitle: string;
  ownerName: string;
  onOpened: () => void;
};

const OPEN_ANIMATION_MS = 820;

function alreadyOpened(attemptId: string) {
  if (typeof window === "undefined" || !attemptId) return true;
  try {
    // 🔴 재열람 기능이다 — 매번 8초 애니메이션을 보게 하면 학대다. 세션당 1회만 재생한다.
    return window.sessionStorage.getItem(`lifeBookOpened:${attemptId}`) === "1";
  } catch {
    return false;
  }
}

function markOpened(attemptId: string) {
  try {
    window.sessionStorage.setItem(`lifeBookOpened:${attemptId}`, "1");
  } catch {
    // best-effort
  }
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function BookOpenCover({ attemptId, title, subtitle, ownerName, onOpened }: BookOpenCoverProps) {
  const [phase, setPhase] = useState<"closed" | "opening" | "done">("closed");
  const skipRef = useRef<HTMLButtonElement | null>(null);

  const finish = useCallback(() => {
    markOpened(attemptId);
    setPhase("done");
    onOpened();
  }, [attemptId, onOpened]);

  useEffect(() => {
    if (alreadyOpened(attemptId) || prefersReducedMotion()) {
      finish();
      return undefined;
    }
    // 키보드 사용자가 가장 먼저 닿는 곳이 "바로 읽기"여야 한다.
    skipRef.current?.focus();
    const timer = window.setTimeout(() => setPhase("opening"), 420);
    return () => window.clearTimeout(timer);
  }, [attemptId, finish]);

  useEffect(() => {
    if (phase !== "opening") return undefined;
    const timer = window.setTimeout(finish, OPEN_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [phase, finish]);

  if (phase === "done") return null;

  return (
    <div className={styles.stage} data-phase={phase} role="presentation">
      <div className={styles.cover}>
        <div className={styles.spine} aria-hidden="true" />
        <div className={styles.plate}>
          <BookOpen className={styles.emblem} aria-hidden="true" />
          <p className={styles.kicker}>인생의 책</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          <p className={styles.owner}>主人公 · {ownerName}</p>
        </div>
      </div>
      <button ref={skipRef} type="button" onClick={finish} className={styles.skip} aria-label="표지를 건너뛰고 본문으로">
        바로 읽기
      </button>
    </div>
  );
}
