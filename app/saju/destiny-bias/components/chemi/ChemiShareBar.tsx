"use client";

import styles from "../../destiny-bias.module.css";

export type ShareBarStatus = { tone: "info" | "ok" | "warn"; text: string } | null;

type Props = {
  busy: boolean;
  status: ShareBarStatus;
  canSaveCollection: boolean;
  savedToCollection: boolean;
  onShareCard: () => void;
  onSaveImage: () => void;
  onInviteFriend: () => void;
  onShareToX: () => void;
  onShareToInstagram: () => void;
  onPickAnother: () => void;
  onSaveCollection: () => void;
};

/** 결과 하단 액션. 공유·저장·초대·재시도 4버튼 + (로그인) 컬렉션 저장. */
export default function ChemiShareBar({
  busy,
  status,
  canSaveCollection,
  savedToCollection,
  onShareCard,
  onSaveImage,
  onInviteFriend,
  onShareToX,
  onShareToInstagram,
  onPickAnother,
  onSaveCollection,
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
      {canSaveCollection ? (
        <button type="button" className={styles.linkButton} onClick={onSaveCollection} disabled={busy || savedToCollection}>
          {savedToCollection ? "내 컬렉션에 저장됨 ✓" : "내 컬렉션에 저장 (생일 제외)"}
        </button>
      ) : (
        <p className={styles.helpText}>로그인하면 결과를 컬렉션에 저장해 다른 기기에서도 볼 수 있어요. 결과 보기와 공유는 로그인 없이 가능해요.</p>
      )}
      <p className={styles.shareStatus} role="status" aria-live="polite" data-tone={status?.tone || ""}>
        {status?.text || ""}
      </p>
    </div>
  );
}
