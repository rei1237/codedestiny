"use client";

import styles from "../../destiny-bias.module.css";

export type ShareBarStatus = { tone: "info" | "ok" | "warn"; text: string } | null;

type Props = {
  busy: boolean;
  status: ShareBarStatus;
  onShareCard: () => void;
  onSaveImage: () => void;
  onInviteFriend: () => void;
  onShareToX: () => void;
  onShareToInstagram: () => void;
  onPickAnother: () => void;
};

/** 결과 하단 액션. 공유·저장·초대·재시도 4버튼. */
export default function ChemiShareBar({
  busy,
  status,
  onShareCard,
  onSaveImage,
  onInviteFriend,
  onShareToX,
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
        <button type="button" className={styles.ctaGhost} onClick={onInviteFriend} disabled={busy}>
          친구도 해보기
        </button>
        <button type="button" className={styles.ctaGhost} onClick={onPickAnother}>
          다른 최애와 보기
        </button>
      </div>
      <details className={styles.shareMore}>
        <summary className={styles.linkButton}>더 보기</summary>
        <div className={styles.shareMoreGrid}>
          <button type="button" className={styles.ctaGhost} onClick={onShareToX} disabled={busy}>
            X에 올리기
          </button>
          <button type="button" className={styles.ctaGhost} onClick={onShareToInstagram} disabled={busy}>
            인스타 스토리용
          </button>
        </div>
      </details>
      <p className={styles.helpText}>무료 결과는 서버에 보관하지 않아요. 필요한 카드는 이미지로 저장해 주세요.</p>
      <p className={styles.shareStatus} role="status" aria-live="polite" data-tone={status?.tone || ""}>
        {status?.text || ""}
      </p>
    </div>
  );
}
