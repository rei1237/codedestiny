"use client";

/**
 * CTA 위 신뢰 요소.
 *
 * 🔴 "이미 많은 분이 선택" 류의 수치 없는 사회적 증거는 넣지 않는다 — 뒷받침할 데이터가
 *    없으면 신뢰 요소가 아니라 허위 표시다. 문구 정본은 data/premium.ts.
 */

import { ShieldCheck } from "lucide-react";
import { CODEX_TRUST_POINTS } from "../data/premium";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import { useCodexContentCopy } from "../_lib/contentCopy";
import styles from "../styles/codex.module.css";

export default function CodexTrustStrip() {
  const copy = useMasterLoveCodexCopy();
  const points = useCodexContentCopy("trustPoints", CODEX_TRUST_POINTS);
  return (
    <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3" aria-label={copy.trustStripAriaLabel}>
      {points.map((point) => (
        <li key={point} className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "var(--codex-gold-dim)" }} aria-hidden="true" />
          <span
            className={styles.numeral}
            style={{ fontSize: "var(--codex-caption)", letterSpacing: "0.02em", color: "var(--codex-silver)" }}
          >
            {point}
          </span>
        </li>
      ))}
    </ul>
  );
}
