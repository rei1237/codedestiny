"use client";

/**
 * 마지막 봉인 — 코덱스는 여기서 끝난다.
 *
 * 아래에 서비스 설명·주의사항을 두지 않는다. 읽기 라우트(/master-love-codex/result)는
 * 사이트맵에 없어 서버 렌더 텍스트 하한(1,800자) 대상이 아니다.
 */

import Link from "next/link";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import CodexReveal from "./CodexReveal";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

interface CodexSealProps {
  forceVisible?: boolean;
}

export default function CodexSeal({ forceVisible = false }: CodexSealProps) {
  const copy = useMasterLoveCodexCopy();
  return (
    <section className="flex min-h-[72svh] flex-col items-center justify-center text-center" aria-label={copy.sealAriaLabel}>
      <div className={styles.measure}>
        <CodexReveal forceVisible={forceVisible}>
          <span style={{ color: "var(--codex-gold)" }}>
            <DestinyIcon name="seal" size={34} variant="line" />
          </span>
          <hr className={`${styles.rule} ${styles.ruleShort} mt-10`} />
          <p
            className={`${styles.numeral} py-8`}
            style={{ fontSize: "clamp(1.0625rem, 3.4vw, 1.375rem)", letterSpacing: "0.12em", color: "var(--codex-gold)" }}
          >
            The Codex has been sealed.
          </p>
          <hr className={`${styles.rule} ${styles.ruleShort}`} />
        </CodexReveal>

        <CodexReveal forceVisible={forceVisible} index={1} className="mt-24">
          <p
            className={styles.numeral}
            style={{ fontSize: "0.75rem", letterSpacing: "0.28em", color: "var(--codex-ink-text-muted)" }}
          >
            CONTINUE YOUR DESTINY
          </p>
          <div className="mt-7">
            <Link href="/destiny-island.html" className={styles.cta}>
              {copy.continueDestinyButton}
            </Link>
          </div>
        </CodexReveal>
      </div>
    </section>
  );
}
