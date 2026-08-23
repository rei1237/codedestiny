"use client";
/**
 * 리포트 섹션 셸 — pending / arrived / failed / locked 네 상태만 다루는 얇은 껍데기.
 * 9곳에서 같은 마크업을 반복하지 않기 위한 것이고, 내용은 전부 children 이 그린다.
 *
 * 계약 3가지:
 *  · 루트에 data-pdf-section — Phase 3 의 exportResultPdf 캡처 대상.
 *  · 제목은 항상 h2(h1 은 ① 좌표 하나뿐) — 헤딩 건너뜀 방지.
 *  · 생성 중에는 aria-busy 만 켠다. 라이브 영역은 리포트 전체에 하나뿐이다(9개면 스크린리더 지옥).
 */
import { forwardRef, type ReactNode } from "react";
import type { ReportSectionSpec } from "./reportSections";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";

export type SectionState = "pending" | "arrived" | "failed" | "locked";

interface ReportSectionProps {
  spec: ReportSectionSpec;
  state: SectionState;
  children?: ReactNode;
  /** locked 상태의 해금 버튼 */
  onUnlock?: () => void;
  unlockLabel?: string;
  unlockBusy?: boolean;
  /** failed 상태의 재시도 */
  onRetry?: () => void;
  /** pending 스켈레톤 줄 수 */
  ghostLines?: number;
  /**
   * ① 좌표만 h1 이다. 나머지는 h2.
   * 🔴 h1 을 섹션 '안'에서 그리면 헤더의 h2 뒤에 h1 이 와 헤딩이 역전된다 — 제목 자체를 h1 으로 올린다.
   */
  headingLevel?: 1 | 2;
  /** 제목 자리에 다른 문장을 세울 때(①은 운명 좌표 한 문장이 제목이다). spec.title 은 킥커 아래 보조로 내려간다. */
  titleOverride?: string;
  /** 제목 위 보조 라벨(예: "당신은 지금") */
  eyebrow?: string;
  /** 제목보다 위에 놓는 시각 요소(①의 거대한 나침반). */
  media?: ReactNode;
}

export const ReportSection = forwardRef<HTMLHeadingElement, ReportSectionProps>(function ReportSection(
  { spec, state, children, onUnlock, unlockLabel, unlockBusy, onRetry, ghostLines = 5, headingLevel = 2, titleOverride, eyebrow, media },
  titleRef,
) {
  const copy = useDestinyCompassCopy();
  const headingId = `cd-report-${spec.id}`;
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const headingText = titleOverride || spec.title;
  return (
    <section
      className={`${styles.reportSectionRoot} ${state === "arrived" ? styles.reportArrived : ""}`}
      data-pdf-section
      data-section={spec.id}
      aria-labelledby={headingId}
      aria-busy={state === "pending"}
    >
      {media}
      <header className={styles.reportSectionHead}>
        <span className={styles.reportKicker}>{titleOverride ? spec.title : spec.kicker}</span>
        {eyebrow && <span className={styles.heroLead}>{eyebrow}</span>}
        {/* tabIndex=-1 — 결제 해금 직후에만 프로그램적으로 포커스를 옮긴다(평소엔 탭 순서에 없다). */}
        <Heading
          className={headingLevel === 1 ? styles.heroCoordinate : styles.reportTitle}
          id={headingId}
          ref={titleRef}
          tabIndex={-1}
        >
          {headingText}
        </Heading>
      </header>

      {state === "pending" && (
        <div className={styles.reportBody}>
          <div className={styles.reportGhost} aria-hidden="true">
            {Array.from({ length: ghostLines }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
      )}

      {state === "arrived" && <div className={styles.reportBody}>{children}</div>}

      {state === "locked" && (
        <div className={styles.reportLocked}>
          <p className={styles.reportTeaser}>{spec.teaser}</p>
          {onUnlock && (
            <button type="button" className={styles.resultCta} onClick={onUnlock} disabled={unlockBusy}>
              {unlockBusy ? copy.sectionUnlockBusy : unlockLabel || copy.sectionDefaultUnlockLabel}
            </button>
          )}
        </div>
      )}

      {state === "failed" && (
        // 한 섹션이 실패해도 리포트 전체를 죽이지 않는다 — 나머지는 그대로 읽힌다.
        <div className={styles.reportFailed} role="status">
          <p>{copy.sectionFailedText}</p>
          {onRetry && (
            <button type="button" className={styles.resultCtaGhost} onClick={onRetry}>
              {copy.sectionRetryButton}
            </button>
          )}
        </div>
      )}
    </section>
  );
});
