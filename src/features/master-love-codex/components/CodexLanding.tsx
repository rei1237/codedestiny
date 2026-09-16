"use client";

/**
 * 코덱스 입장 화면 — 프리미엄 상담 상품 페이지.
 *
 * 진입 3초 안에 ① 유료 프리미엄 상담이라는 인지 ② 가격 ③ 그 가격의 근거가 보여야 한다.
 * 이 화면은 일반 문서 흐름이라 아래에 서버 렌더 소개 섹션(ServiceIntroSection)이
 * 이어진다. 몰입 단계로 넘어가면 CodexShell 이 fixed 로 그 위를 덮는다.
 *
 * 🔴 이 기능은 SKU 가 두 개다(개인/궁합). 한쪽 금액만 크게 박으면 다른 쪽 사용자에게
 *    거짓 가격이 되므로 두 상품을 나란히 세운다. 금액은 전부 PriceBadge(서버 조회)다.
 */

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, Home } from "lucide-react";
import CodexShell from "./CodexShell";
import CodexReveal from "./CodexReveal";
import CodexPremiumCard from "./CodexPremiumCard";
import CodexWhyPremium from "./CodexWhyPremium";
import CodexTrustStrip from "./CodexTrustStrip";
import CodexFloatingCta from "./CodexFloatingCta";
import { masterLoveCodexAssets } from "../data/assets";
import { CODEX_HERO_SPECS } from "../data/premium";
import { masterLoveCodexBilling, type MasterLoveCodexMode } from "../constants";
import { useMasterLoveCodexCopy, useMasterLoveCodexLocale } from "../_lib/copy";
import { useCodexContentCopy } from "../_lib/contentCopy";
import styles from "../styles/codex.module.css";

interface CodexLandingProps {
  hasSeenPrologue: boolean;
  chapterCount: number;
  /** 어느 상품 카드로 들어왔는지 — 입력 화면의 상대 정보 섹션이 미리 펼쳐진다 */
  onEnter: (intent?: MasterLoveCodexMode) => void;
  onReplayPrologue: () => void;
}

/** 하단 고정 바는 추천 상품(궁합)의 금액을 든다 — 눌렀을 때 시작되는 상품과 반드시 같아야 한다. */
const FLOATING_MODE: MasterLoveCodexMode = "compat";

export default function CodexLanding({ hasSeenPrologue, chapterCount, onEnter, onReplayPrologue }: CodexLandingProps) {
  const locale = useMasterLoveCodexLocale();
  const copy = useMasterLoveCodexCopy();
  const heroSpecs = useCodexContentCopy("heroSpecs", CODEX_HERO_SPECS);
  const floatingBilling = masterLoveCodexBilling(FLOATING_MODE, locale);
  const soloTitle = masterLoveCodexBilling("solo", locale).title;

  return (
    <CodexShell ariaLabel={copy.entryAriaLabel(soloTitle)}>
      <nav className="flex items-center justify-between px-[var(--codex-gutter)] pt-6" aria-label={copy.navAriaLabel}>
        <button type="button" onClick={() => window.history.back()} className={`${styles.quiet} inline-flex items-center gap-1`}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.backButton}
        </button>
        <Link href="/" className={`${styles.quiet} inline-flex min-h-11 items-center gap-1`}>
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.homeButton}
        </Link>
      </nav>

      {/* ── 히어로 ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center pb-8 pt-14 text-center">
        <div className={styles.measure}>
          <CodexReveal>
            <p
              className={`${styles.numeral} text-[0.6875rem]`}
              style={{ letterSpacing: "0.28em", color: "var(--codex-gold-dim)" }}
            >
              AI PREMIUM COMPATIBILITY CONSULTATION
            </p>
            <h2 className={`${styles.hero} mt-6`}>Master Love Codex</h2>
            <p className={`${styles.actTitle} mt-5`}>{soloTitle}</p>
            <hr className={`${styles.rule} ${styles.ruleShort} mt-9`} />
          </CodexReveal>

          <CodexReveal index={1} className="mt-9">
            <p className="mx-auto max-w-[40ch] text-[1.0625rem] leading-9">
              {copy.heroDescription(chapterCount)}
            </p>
          </CodexReveal>

          {/* 이 상담이 실제로 다루는 축 — 무엇을 사는지 목록으로 먼저 훑게 한다 */}
          <CodexReveal index={2} className="mt-9">
            <ul className="mx-auto grid max-w-[36ch] gap-x-6 gap-y-3 text-left sm:grid-cols-2">
              {heroSpecs.map((spec) => (
                <li key={spec} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0" style={{ color: "var(--codex-gold)" }} aria-hidden="true" />
                  <span style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text)" }}>{spec}</span>
                </li>
              ))}
            </ul>
          </CodexReveal>

          <CodexReveal index={3} className="mt-10">
            <p className={styles.badge}>
              PREMIUM CONSULTATION
              <span aria-label={copy.starRatingAriaLabel} style={{ letterSpacing: "0.1em" }}>★★★★★</span>
            </p>
            <p className="mt-4 leading-8" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-silver)" }}>
              AI EXPERT REPORT · {copy.expertReportSuffix(chapterCount)}
            </p>
          </CodexReveal>

          <CodexReveal index={4} className="mt-12">
            <Image
              src={masterLoveCodexAssets.cover}
              alt={copy.coverImageAlt}
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
        </div>
      </div>

      {/* ── 상품·가격 ──────────────────────────────────────────────────────── */}
      <section className={styles.section} aria-label={copy.pricingSectionAriaLabel}>
        <div className={styles.measure}>
          <CodexReveal>
            <p
              className={`${styles.numeral} text-[0.6875rem]`}
              style={{ letterSpacing: "0.28em", color: "var(--codex-gold-dim)" }}
            >
              CHOOSE YOUR READING
            </p>
            <h2 className={`${styles.actTitle} mt-4`}>{copy.pricingTitle}</h2>
            <p className="mt-5 max-w-[42ch] leading-8" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-silver)" }}>
              {copy.pricingDescription(chapterCount)}
            </p>
          </CodexReveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <CodexReveal index={1}>
              <CodexPremiumCard mode="compat" featured onSelect={onEnter} />
            </CodexReveal>
            <CodexReveal index={2}>
              <CodexPremiumCard mode="solo" onSelect={onEnter} />
            </CodexReveal>
          </div>
        </div>
      </section>

      {/* ── 왜 프리미엄인가 ─────────────────────────────────────────────────── */}
      <CodexWhyPremium />

      {/* ── 신뢰 + 최종 CTA ────────────────────────────────────────────────── */}
      <section className={`${styles.section} pt-0 text-center`} aria-label={copy.startSectionAriaLabel}>
        <div className={styles.measure}>
          <CodexReveal>
            <hr className={styles.rule} />
            <div className="mt-10">
              <CodexTrustStrip />
            </div>
          </CodexReveal>

          <CodexReveal index={1} className="mt-12">
            <button type="button" onClick={() => onEnter()} className={styles.cta}>
              {hasSeenPrologue ? copy.startNowButton : copy.enterLibraryButton}
            </button>
            {hasSeenPrologue ? (
              <div className="mt-6">
                <button type="button" onClick={onReplayPrologue} className={styles.quiet}>
                  {copy.replayPrologueButton}
                </button>
              </div>
            ) : null}
          </CodexReveal>
        </div>
      </section>

      <CodexFloatingCta
        featureKey={floatingBilling.featureKey}
        fallbackCoins={floatingBilling.cost}
        label={copy.floatingStartLabel}
        onClick={() => onEnter(FLOATING_MODE)}
      />
    </CodexShell>
  );
}
