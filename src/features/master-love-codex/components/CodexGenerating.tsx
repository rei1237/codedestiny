"use client";

/**
 * 봉인 해독 — 생성 진행 화면.
 *
 * 🔴 진행률을 화면에서 계산하지 않는다. 예전에는 `completed/total` 을 5~95로 클램프하고
 *    `completed >= total` 이면 100% 로 그렸다 — 최종 검증·완료 확정 전에 100% 가 뜨는 경로였고,
 *    상태 문구는 4.2초마다 도는 장식이라 실제 단계와 아무 관계가 없었다(2026-09-19).
 *    퍼센트·단계·현재 장은 전부 서버 generationProgress 에서 온다. 서버가 주지 않으면
 *    '구성 확인 중'으로 두고 막대를 움직이지 않는다 — 앞질러 그리지 않는다.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { PriceBadge } from "@/app/components/PriceBadge";
import { getNarratorAsset } from "../data/assets";
import { actsForMode } from "../data/acts";
import { codexAccessLabel } from "../data/premium";
import { masterLoveCodexBilling, type MasterLoveCodexMode } from "../constants";
import { codexAccessNoteText, codexStepLabel, useMasterLoveCodexCopy, useMasterLoveCodexLocale } from "../_lib/copy";
import type { CodexGenerationProgress } from "../_lib/runCodexBatches";
import styles from "../styles/codex.module.css";

/** 단계별 라틴 표식. 장식이지만 서버 단계에서 뽑는다 — 돌아가는 글자가 상태를 속이지 않게. */
const STEP_LATIN: Record<string, string> = {
  pending: "Awaiting",
  writing: "Transcribing",
  validating: "Cross-checking",
  saving: "Sealing Ink",
  retrying: "Retracing",
  finalizing: "Final Reading",
  complete: "Final Reading",
  failed: "Interrupted",
};

const AMBIENCE_INTERVAL_MS = 4200;

interface CodexGeneratingProps {
  completed: number;
  total: number;
  /** 서버가 준 진행 상황. 없으면 퍼센트·단계를 추측하지 않고 '구성 확인 중'으로 둔다. */
  progress?: CodexGenerationProgress | null;
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
  progress = null,
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
  const accessNote = codexAccessNoteText(copy, access.noteKey);

  // K / N — 둘 다 서버 값이 우선이다. 서버가 없을 때만 호출부가 준 값으로 떨어진다.
  const ready = Math.max(0, Number(progress?.validated ?? progress?.completed ?? completed) || 0);
  const expected = Math.max(0, Number(progress?.total ?? total) || 0);
  // 🔴 서버가 percent 를 주지 않으면 만들어 내지 않는다. null = 미확정(막대는 그대로).
  const rawPercent = Number(progress?.percent);
  const percent = Number.isFinite(rawPercent) ? Math.min(100, Math.max(0, Math.round(rawPercent))) : null;
  const step = percent === null ? "" : String(progress?.step || "");
  const stepLabel = error ? copy.chapterStateBlocked : codexStepLabel(copy, step);
  const current = progress?.currentChapter || null;
  // 궁합판은 막 제목이 다르다 — 개인판 목록으로 고정하면 진행 중에 엉뚱한 제목이 뜬다.
  const acts = actsForMode(mode);
  // 지금 쓰이는 장이 정본이고, 없으면 "다음에 쓰일 장" 자리다.
  const focusOrder = Number(current?.order) > 0 ? Number(current?.order) : ready + 1;
  const currentAct = acts.find((act) => focusOrder >= act.from && focusOrder <= act.to) || acts[0];

  // 멈춘 뒤에도 문구가 계속 도는 것은 거짓말이다 — 실패 상태에서는 순환을 세운다.
  // 🔴 이 순환은 **작업 방식을 설명하는 배경 문구**이고 진행 단계가 아니다. 단계 문구는 위의
  //    stepLabel(서버 step)이다. 둘을 다시 합치지 않는다.
  useEffect(() => {
    if (error) return undefined;
    const timer = window.setInterval(() => {
      setLineIndex((index) => (index + 1) % Math.max(1, copy.generatingStatusLines.length));
    }, AMBIENCE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [error, copy.generatingStatusLines.length]);

  const lineLatin = STEP_LATIN[step] || "Unsealing";
  const ambience = copy.generatingStatusLines[lineIndex] || copy.generatingStatusLines[0];

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
          {accessNote ? (
            <>
              <span aria-hidden="true">·</span>
              {accessNote}
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

        {/* 표제 글자는 장식이다 — 읽어 주는 것은 아래 단계 문구와 오류 알림이다(이중 낭독 방지). */}
        <p
          className={`${styles.numeral} mt-10 text-[clamp(1.0625rem,3.6vw,1.375rem)]`}
          style={{ letterSpacing: "0.2em", color: "var(--codex-gold)" }}
          aria-hidden="true"
        >
          {error ? copy.generatingInterruptedLabel : lineLatin}
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-[0.9375rem] leading-8" style={{ color: "#ffb4b4" }}>
            {error}
          </p>
        ) : null}

        {/* 지금 서버가 무엇을 하고 있는지 — 단계와 그 대상 장을 그대로 적는다. */}
        <p className="mt-4 text-[0.9375rem] leading-8" style={{ color: "var(--codex-ink-text-muted)" }} aria-live="polite">
          <span style={{ color: "var(--codex-gold-dim)" }}>{stepLabel}</span>
          {current?.title ? <> · {current.title}</> : null}
        </p>

        <hr className={`${styles.rule} mt-10`} />

        <div
          className="mt-6 h-px w-full"
          style={{ background: "rgba(232,213,163,.14)" }}
          role="progressbar"
          aria-valuenow={percent ?? undefined}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={percent === null ? copy.stepPreparing : undefined}
          aria-label={copy.generatingProgressAriaLabel}
        >
          <div
            className="h-px transition-[width] duration-700 ease-out"
            style={{ width: `${percent ?? 0}%`, background: "var(--codex-gold)", boxShadow: "0 0 14px 0 rgba(232,213,163,.6)" }}
          />
        </div>
        <p className={`${styles.numeral} mt-5 text-[0.875rem]`} style={{ letterSpacing: "0.14em", color: "var(--codex-gold)" }}>
          {currentAct.numeral} · {ready} / {expected}
          {percent === null ? null : <> · {percent}%</>}
        </p>

        <p className="mt-3" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
          {name ? copy.generatingNameLine(name) : copy.generatingNamelessLine}
        </p>

        {/* 배경 문구 — 어떤 작업인지 설명할 뿐, 진행 단계를 말하지 않는다. */}
        {error ? null : (
          <p className="mt-6 leading-7" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-ink-text-muted)" }}>
            {ambience}
          </p>
        )}

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
