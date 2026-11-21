"use client";

import { useCaptureShare, type CaptureShareOptions } from "./useCaptureShare";
import styles from "./scroll.module.css";

export type ScrollActionsProps = CaptureShareOptions & {
  /** 상세보기 앵커(#id). onDetail 이 있으면 그쪽이 우선. */
  detailHref?: string;
  /** 접이식 상세를 여는 등 앵커로 안 되는 경우. */
  onDetail?: () => void;
  disabled?: boolean;
};

/**
 * 두루마리 아래 액션 줄: [이미지 저장](보조) · [공유하기](주 CTA 1개) · [상세보기](있을 때만).
 * 서버 계정·링크 토큰 없이 브라우저에서 이미지로 만든다.
 */
export default function ScrollActions({ detailHref, onDetail, disabled, ...capture }: ScrollActionsProps) {
  const { busy, notice, save, share } = useCaptureShare(capture);
  return (
    <div className={styles.actions} data-scroll-actions>
      <button type="button" className={styles.actionBtn} onClick={save} disabled={disabled || busy !== null} aria-busy={busy === "save"}>
        {busy === "save" ? "만드는 중…" : "이미지 저장"}
      </button>
      <button type="button" className={`${styles.actionBtn} ${styles.actionPrimary}`} onClick={share} disabled={disabled || busy !== null} aria-busy={busy === "share"}>
        {busy === "share" ? "만드는 중…" : "공유하기"}
      </button>
      {onDetail ? (
        <button type="button" className={styles.actionBtn} onClick={onDetail}>
          상세보기
        </button>
      ) : detailHref ? (
        <a className={styles.actionBtn} href={detailHref}>
          상세보기
        </a>
      ) : null}
      <p className={styles.actionNote} role="status" aria-live="polite">
        {notice}
      </p>
    </div>
  );
}
