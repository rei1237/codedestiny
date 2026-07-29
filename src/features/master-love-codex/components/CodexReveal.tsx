"use client";

/**
 * 문단 단위 등장 — fade + 20px 아래에서 위로, 0.3s.
 *
 * 🔴 PDF 캡처 안전장치: html2canvas 는 현재 DOM 을 그대로 찍는다. 아직 화면에 들어오지
 * 않아 opacity 0 인 장이 있으면 그 페이지는 **백지로 저장된다**. `forceVisible` 이 켜지면
 * 애니메이션을 통째로 건너뛰고 즉시 노출한다 — 캡처 직전에 이 값을 올린다.
 * 리듀스드모션에서도 같은 경로를 탄다.
 */

import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface CodexRevealProps {
  children: ReactNode;
  /** 목록 안에서 순차 등장시킬 때 */
  index?: number;
  /** PDF 캡처 등 — 애니메이션 없이 즉시 노출 */
  forceVisible?: boolean;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}

const STAGGER_STEP_SEC = 0.06;
const MAX_STAGGER_SEC = 0.36;

export default function CodexReveal({
  children,
  index = 0,
  forceVisible = false,
  className = "",
  as = "div",
}: CodexRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const skip = forceVisible || prefersReducedMotion;

  const MotionTag = m[as];

  if (skip) {
    return <MotionTag className={className}>{children}</MotionTag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -8% 0px" }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * STAGGER_STEP_SEC, MAX_STAGGER_SEC),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}
