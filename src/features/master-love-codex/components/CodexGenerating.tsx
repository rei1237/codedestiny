"use client";

/**
 * 봉인 해독 — 생성 진행 화면.
 *
 * 배치(4장씩)가 끝날 때마다 진행률이 갱신된다. 진행률은 5~95로 클램프해 두어
 * 시작 직후에도 멈춘 것처럼 보이지 않고, 끝나기 전에 100처럼 보이지도 않는다.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { PriceBadge } from "@/app/components/PriceBadge";
import { getNarratorAsset } from "../data/assets";
import { actsForMode } from "../data/acts";
import { codexAccessLabel } from "../data/premium";
import { masterLoveCodexBilling, type MasterLoveCodexMode } from "../constants";
import { useMasterLoveCodexCopy, useMasterLoveCodexLocale } from "../_lib/copy";
import styles from "../styles/codex.module.css";

const DECRYPT_LATIN = ["Decrypting", "Reading Destiny", "Cross-checking", "Tracing Threads", "Synchronizing", "Sealing"] as const;

interface CodexGeneratingProps {
  completed: number;
  total: number;
  latestTitles: string[];
  name: string;
  /** 결제된 상품 — 막 제목과 상단 금액 배지가 이 값을 따른다 */
  mode?: MasterLoveCodexMode;
  /** ensure-access 가 준 통과 경로 — 이용권/월정석이면 금액 대신 그 사실을 적는다 */
  accessType?: string;
  /**
   * 생성이 끊겼을 때의 안내. 이 단계의 실패는 이용권 확인 실패가 아니므로 공용 결제 게이트
   * 모달로 띄우지 않고 이 화면이 직접 말한다(모달에는 재시도 수단이 없어 막다른 길이었다).
   */
  error?: string;
  /** 결제·이용권 확인을 다시 타지 않고 생성만 이어서 돌린다 */
  onRetry?: () => void;
  /** 지금까지 쓰인 장이 있을 때만 준다 — 없으면 보여줄 것이 없다 */
  onOpenStored?: () => void;
}

export default function CodexGenerating({
  completed,
  total,
  latestTitles,
  name,
  mode = "solo",
  accessType = "",
  error = "",
  onRetry,
  onOpenStored,
}: CodexGeneratingProps) {
  const locale = useMasterLoveCodexLocale();
  const copy = useMasterLoveCodexCopy();
  const [lineIndex, setLineIndex] = useState(0);
  const billing = masterLoveCodexBilling(mode, locale);
  const access = codexAccessLabel(accessType);

  // 시작 직후 0%로 멈춰 보이거나 끝나기 전에 100%로 보이지 않게 5~95로 가둔다.
  const raw = total > 0 ? Math.round((completed / total) * 100) : 0;
  const percent = completed >= total && total > 0 ? 100 : Math.min(95, Math.max(5, raw));
  // 궁합판은 막 제목이 다르다 — 개인판 목록으로 고정하면 진행 중에 엉뚱한 제목이 뜬다.
  const acts = actsForMode(mode);
  const currentAct = acts.find((act) => completed + 1 >= act.from && completed + 1 <= act.to) || acts[0];

  // 멈춘 뒤에도 문구가 계속 도는 것은 거짓말이다 — 실패 상태에서는 순환을 세운다.
  useEffect(() => {
    if (error) return undefined;
    const timer = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % DECRYPT_LATIN.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [error]);

  const lineLatin = DECRYPT_LATIN[lineIndex];
  const lineStatus = copy.generatingStatusLines[lineIndex] || copy.generatingStatusLines[0];

  return (
    <section
      className="flex min-h-[100svh] flex-col items-center justify-center py-16 text-center"
      aria-label={copy.generatingAriaLabel(Boolean(error))}
    >
      <div className={styles.measure}>
        {/* 지금 어떤 상품을 이용 중인지 대기 화면에서도 계속 보이게 한다.
            이용권/월정석으로 통과했으면 금액 대신 그 사실을 적는다. */}
        <p className={`${styles.badge} mb-10`}>
          PREMIUM CONSULTATION
          {access.showPrice ? (
            <>
              <span aria-hidden="true">·</span>
              <PriceBadge featureKey={billing.featureKey} fallbackCoins={billing.cost} className="font-bold" />
            </>
          ) : null}
          {access.note ? (
            <>
              <span aria-hidden="true">·</span>
              {access.note}
            </>
          ) : null}
        </p>

        <Image
          src={getNarratorAsset("calm")}
          alt={copy.narratorReadingAlt}
          width={360}
          height={500}
          unoptimized
          className="mx-auto h-[24svh] w-auto object-contain"
          style={{ filter: "drop-shadow(0 22px 46px rgba(0,0,0,.65))" }}
        />

        <p
          className={`${styles.numeral} mt-10 text-[clamp(1.0625rem,3.6vw,1.375rem)]`}
          style={{ letterSpacing: "0.2em", color: "var(--codex-gold)" }}
          aria-live="polite"
        >
          {error ? copy.generatingInterruptedLabel : lineLatin}
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-[0.9375rem] leading-8" style={{ color: "#ffb4b4" }}>
            {error}
          </p>
        ) : (
          <p className="mt-4 text-[0.9375rem] leading-8" style={{ color: "var(--codex-ink-text-muted)" }}>
            {lineStatus}
          </p>
        )}

        <hr className={`${styles.rule} mt-10`} />

        <div
          className="mt-6 h-px w-full"
          style={{ background: "rgba(232,213,163,.14)" }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={copy.generatingProgressAriaLabel}
        >
          <div
            className="h-px transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%`, background: "var(--codex-gold)", boxShadow: "0 0 14px 0 rgba(232,213,163,.6)" }}
          />
        </div>
        <p className={`${styles.numeral} mt-5 text-[0.875rem]`} style={{ letterSpacing: "0.14em", color: "var(--codex-gold)" }}>
          {currentAct.numeral} · {completed} / {total}
        </p>

        <p className="mt-3" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
          {name ? copy.generatingNameLine(name) : copy.generatingNamelessLine}
        </p>

        {latestTitles.length ? (
          <ul className="mx-auto mt-10 max-w-[36ch] space-y-2 text-left" aria-label={copy.generatingCompletedTitlesAriaLabel}>
            {latestTitles.slice(-3).map((title) => (
              <li
                key={title}
                className="truncate border-b border-[color:var(--codex-rule)] pb-2"
                style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}
              >
                {title}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {onRetry ? (
              <button type="button" className={styles.cta} onClick={onRetry}>{copy.retryButton}</button>
            ) : null}
            {/* .quiet 는 텍스트 링크용이라 높이가 없다 — 공용 클래스를 고치지 않고 여기서만 탭 타깃을 채운다. */}
            {onOpenStored ? (
              <button type="button" className={`${styles.quiet} inline-flex min-h-[44px] items-center px-4 underline`} onClick={onOpenStored}>
                {copy.openStoredButton}
              </button>
            ) : null}
          </div>
        ) : null}

        <p className="mt-12 leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
          {copy.generatingFooterNote}
        </p>
      </div>
    </section>
  );
}
