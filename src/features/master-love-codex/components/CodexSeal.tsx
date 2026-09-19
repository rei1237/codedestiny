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
import { CODEX_LIBRARY_ANCHOR } from "./CodexLibrary";
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
            YOUR CODEX LIBRARY
          </p>
          <div className="mt-7">
            {/*
              다 읽은 책은 다른 상품이 아니라 **자기 보관함**으로 돌아간다. 보관함은 라우트가
              아니라 랜딩 단계에서만 렌더되는 섹션이라 목적지가 `/master-love-codex#앵커` 다
              (MasterLoveCodexPage 의 phase === "landing" 분기). 없는 경로를 만들지 않는다.
            */}
            <Link href={`/master-love-codex#${CODEX_LIBRARY_ANCHOR}`} className={styles.cta}>
              {copy.libraryNavLink}
            </Link>
          </div>
        </CodexReveal>
      </div>
    </section>
  );
}
