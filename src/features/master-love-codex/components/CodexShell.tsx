"use client";

/**
 * 코덱스 공용 셸 — 모든 단계가 같은 잉크 배경 위에 얹힌다.
 *
 * `overlay` 모드는 문서 흐름 위를 fixed 로 덮는다. 입장 라우트(/master-love-codex)에는
 * 배포 게이트 때문에 서버 렌더 설명 섹션이 남아 있어야 하는데, 몰입 단계에서 그게
 * 아래로 비치면 안 되기 때문이다. 랜딩 단계는 일반 흐름이라 그 설명이 정상적으로 읽힌다.
 */

import { useEffect, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import CodexStarfield from "./CodexStarfield";
import styles from "../styles/codex.module.css";

interface CodexShellProps {
  children: ReactNode;
  /** fixed 전면 레이어로 띄운다(몰입 단계) */
  overlay?: boolean;
  /** 금가루를 띄울지 — 읽기 화면에서는 끈다 */
  motes?: boolean;
  /** 가장자리 비네트 */
  vignette?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function CodexShell({
  children,
  overlay = false,
  motes = true,
  vignette = true,
  className = "",
  ariaLabel,
}: CodexShellProps) {
  const prefersReducedMotion = useReducedMotion();

  // 오버레이가 떠 있는 동안에는 뒤 문서가 함께 스크롤되지 않게 잠근다.
  useEffect(() => {
    if (!overlay || typeof document === "undefined") return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [overlay]);

  return (
    <div
      className={`${styles.root} ${overlay ? styles.overlay : ""} ${className}`}
      aria-label={ariaLabel}
    >
      <CodexStarfield enabled={!prefersReducedMotion} motes={motes} />
      {vignette ? <div className={styles.vignette} aria-hidden="true" /> : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
