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
}

export const ReportSection = forwardRef<HTMLHeadingElement, ReportSectionProps>(function ReportSection(
  { spec, state, children, onUnlock, unlockLabel, unlockBusy, onRetry, ghostLines = 5 },
  titleRef,
) {
  const headingId = `cd-report-${spec.id}`;
  return (
    <section
      className={`${styles.reportSectionRoot} ${state === "arrived" ? styles.reportArrived : ""}`}
      data-pdf-section
      data-section={spec.id}
      aria-labelledby={headingId}
      aria-busy={state === "pending"}
    >
      <header className={styles.reportSectionHead}>
        <span className={styles.reportKicker}>{spec.kicker}</span>
        {/* tabIndex=-1 — 결제 해금 직후에만 프로그램적으로 포커스를 옮긴다(평소엔 탭 순서에 없다). */}
        <h2 className={styles.reportTitle} id={headingId} ref={titleRef} tabIndex={-1}>
          {spec.title}
        </h2>
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
              {unlockBusy ? "확인하는 중…" : unlockLabel || "열어보기"}
            </button>
          )}
        </div>
      )}

      {state === "failed" && (
        // 한 섹션이 실패해도 리포트 전체를 죽이지 않는다 — 나머지는 그대로 읽힌다.
        <div className={styles.reportFailed} role="status">
          <p>이 부분을 불러오지 못했어요. 다시 시도하면 이어서 채워집니다.</p>
          {onRetry && (
            <button type="button" className={styles.resultCtaGhost} onClick={onRetry}>
              다시 시도
            </button>
          )}
        </div>
      )}
    </section>
  );
});
