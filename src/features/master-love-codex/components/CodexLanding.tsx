"use client";

/**
 * 코덱스 입장 화면.
 *
 * 카드 그리드를 쓰지 않는다 — 표지 한 장과 문장 몇 줄, 문을 여는 버튼 하나.
 * 이 화면은 일반 문서 흐름이라 아래에 서버 렌더 소개 섹션(ServiceIntroSection)이
 * 이어진다. 몰입 단계로 넘어가면 CodexShell 이 fixed 로 그 위를 덮는다.
 */

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";
import { PriceBadge } from "@/app/components/PriceBadge";
import CodexShell from "./CodexShell";
import CodexReveal from "./CodexReveal";
import { masterLoveCodexAssets } from "../data/assets";
import { MASTER_LOVE_CODEX_FEATURE_COST, MASTER_LOVE_CODEX_FEATURE_KEY, MASTER_LOVE_CODEX_TITLE } from "../constants";
import styles from "../styles/codex.module.css";

interface CodexLandingProps {
  hasSeenPrologue: boolean;
  chapterCount: number;
  onEnter: () => void;
  onReplayPrologue: () => void;
}

export default function CodexLanding({ hasSeenPrologue, chapterCount, onEnter, onReplayPrologue }: CodexLandingProps) {
  return (
    <CodexShell ariaLabel={`${MASTER_LOVE_CODEX_TITLE} 입장`}>
      <nav className="flex items-center justify-between px-[var(--codex-gutter)] pt-6" aria-label="화면 이동">
        <button type="button" onClick={() => window.history.back()} className={`${styles.quiet} inline-flex items-center gap-1`}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          돌아가기
        </button>
        <Link href="/" className={`${styles.quiet} inline-flex items-center gap-1`}>
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          홈으로
        </Link>
      </nav>

      <div className="flex min-h-[88svh] flex-col items-center justify-center py-16 text-center">
        <div className={styles.measure}>
          <CodexReveal>
            <h1 className={styles.hero}>Master Love Codex</h1>
            <p className={`${styles.actTitle} mt-5`}>{MASTER_LOVE_CODEX_TITLE}</p>
            <hr className={`${styles.rule} ${styles.ruleShort} mt-9`} />
          </CodexReveal>

          <CodexReveal index={1} className="mt-10">
            <Image
              src={masterLoveCodexAssets.cover}
              alt="신비의 도서관에서 펼쳐지는 연애 전략서"
              width={768}
              height={512}
              unoptimized
              priority
              className="mx-auto w-full max-w-[520px] object-cover"
              style={{
                borderRadius: 2,
                boxShadow: "0 0 40px -5px rgba(216,179,108,.35), 0 40px 90px -30px rgba(0,0,0,.9)",
              }}
            />
          </CodexReveal>

          <CodexReveal index={2} className="mt-12">
            <p className="mx-auto max-w-[40ch] text-[1.0625rem] leading-9">
              사주와 자미두수를 하나로 엮어, 연애 고수가 당신의 연애 인생을 {chapterCount}장에 걸쳐 읽어
              내려갑니다.
            </p>
            <p className="mx-auto mt-5 max-w-[38ch] text-[0.9375rem] leading-8" style={{ color: "var(--codex-ink-text-muted)" }}>
              운세 결과가 아니라 한 권의 책입니다. 다 읽고 나면 PDF로 소장할 수 있습니다.
            </p>
          </CodexReveal>

          <CodexReveal index={3} className="mt-14">
            <button type="button" onClick={onEnter} className={styles.cta}>
              {hasSeenPrologue ? "바로 시작하기" : "도서관에 들어가기"}
            </button>
            <div className="mt-6 flex flex-col items-center gap-3">
              <PriceBadge
                featureKey={MASTER_LOVE_CODEX_FEATURE_KEY}
                fallbackCoins={MASTER_LOVE_CODEX_FEATURE_COST}
                prefix="1회 "
                className={`${styles.numeral} text-[0.8125rem]`}
              />
              {hasSeenPrologue ? (
                <button type="button" onClick={onReplayPrologue} className={styles.quiet}>
                  프롤로그 다시 보기
                </button>
              ) : null}
            </div>
          </CodexReveal>
        </div>
      </div>
    </CodexShell>
  );
}
