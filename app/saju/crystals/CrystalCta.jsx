"use client";

import { trackEvent } from "@/lib/analytics";
import styles from "./crystals.module.css";

export const CRYSTAL_START_PATH = "/saju/crystals/start/";

/** 질문 흐름으로 가는 실제 링크. 진입 위치(from)만 쿼리와 이벤트에 싣는다. */
export default function CrystalCta({ from, children = "나에게 맞는 원석 찾기", variant = "primary" }) {
  return (
    <a
      className={variant === "primary" ? styles.cta : styles.ghost}
      href={`${CRYSTAL_START_PATH}?from=${encodeURIComponent(from)}`}
      onClick={() => trackEvent("crystal_entry_click", { from })}
    >
      {children}
    </a>
  );
}
