"use client";

import styles from "../../destiny-bias.module.css";

export type ShareBarStatus = { tone: "info" | "ok" | "warn"; text: string } | null;

type Props = {
  busy: boolean;
  status: ShareBarStatus;
  onShareCard: () => void;
  onSaveImage: () => void;
  onShareToInstagram: () => void;
  onPickAnother: () => void;
};

/** 결과 하단 액션. 카드 공유(기기 공유 → 카카오 → 복사)·포토카드 이미지 저장·다른 최애. X·스레드·링크 복사는 ViralShareBar 가 맡는다. */
export default function ChemiShareBar({
  busy,
  status,
  onShareCard,
  onSaveImage,
  onShareToInstagram,
  onPickAnother,
}: Props) {
  return (
    <div className={styles.shareBar}>
      <div className={styles.shareGrid}>
        <button type="button" className={styles.ctaPrimary} onClick={onShareCard} disabled={busy} aria-busy={busy}>
          내 케미 카드 공유
        </button>
        <button type="button" className={styles.ctaSecondary} onClick={onSaveImage} disabled={busy}>
          이미지 저장
        </button>
        <button type="button" className={styles.ctaGhost} onClick={onPickAnother}>
          다른 최애와 보기
        </button>
      </div>
      <details className={styles.shareMore}>
        <summary className={styles.linkButton}>더 보기</summary>
        <div className={styles.shareMoreGrid}>
          <button type="button" className={styles.ctaGhost} onClick={onShareToInstagram} disabled={busy}>
            인스타 스토리용
          </button>
        </div>
      </details>
      <p className={styles.helpText}>무료 결과 카드는 기기에 이미지로 저장해 주세요. 구매한 상세 리포트는 계정에 보관해요.</p>
      <p className={styles.shareStatus} role="status" aria-live="polite" data-tone={status?.tone || ""}>
        {status?.text || ""}
      </p>
    </div>
  );
}
