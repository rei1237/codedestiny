"use client";

/**
 * 막간 — 전체 화면 하나를 통째로 쓴다.
 *
 * 20장을 쭉 흘리지 않고 네 장마다 한 번 숨을 고르게 하는 장치. 스크롤이 여기 걸리면
 * 상단 레일의 현재 막도 함께 바뀐다.
 */

import DestinyIcon from "@/app/components/icons/DestinyIcon";
import CodexReveal from "./CodexReveal";
import { CODEX_ACT_ANCHOR_PREFIX, type CodexAct } from "../data/acts";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

interface CodexActInterstitialProps {
  act: CodexAct;
  forceVisible?: boolean;
}

export default function CodexActInterstitial({ act, forceVisible = false }: CodexActInterstitialProps) {
  const copy = useMasterLoveCodexCopy();
  return (
    <section
      id={`${CODEX_ACT_ANCHOR_PREFIX}${act.order}`}
      data-codex-act={act.order}
      className="flex min-h-[62svh] flex-col items-center justify-center text-center"
      aria-label={copy.actAriaLabel(act.numeral, act.title)}
    >
      <div className={styles.measure}>
        <CodexReveal forceVisible={forceVisible}>
          <span style={{ color: "var(--codex-gold)" }}>
            <DestinyIcon name={act.icon} size={30} variant="line" />
          </span>
          <p
            className={`${styles.numeral} mt-5`}
            style={{ fontSize: "clamp(2.25rem, 8vw, 3.25rem)", lineHeight: 1, color: "var(--codex-gold)" }}
          >
            {act.numeral}
          </p>
          <h2 className={`${styles.actTitle} mt-4`}>{act.title}</h2>
          <hr className={`${styles.rule} ${styles.ruleShort} mt-7`} />
          <p
            className="mx-auto mt-7 max-w-[38ch] text-[0.9375rem] leading-8"
            style={{ color: "var(--codex-ink-text-muted)" }}
          >
            {act.line}
          </p>
        </CodexReveal>
      </div>
    </section>
  );
}
