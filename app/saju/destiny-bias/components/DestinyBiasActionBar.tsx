"use client";

import styles from "../destiny-bias.module.css";

type Props = {
  onDownloadSvg: () => void;
  onDownloadPng: () => void;
  onShare: () => void;
  onCopy: () => void;
  onRetry: () => void;
  onTryAnother: () => void;
};

export default function DestinyBiasActionBar({
  onDownloadSvg,
  onDownloadPng,
  onShare,
  onCopy,
  onRetry,
  onTryAnother,
}: Props) {
  return (
    <article className={styles.actionBar}>
      <p className="mb-3 text-[10px] font-semibold tracking-[0.16em] text-white/55">COLLECTIBLE ACTIONS</p>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onDownloadPng} className={styles.actionPrimary}>
          🖼 포토카드 저장
        </button>
        <button type="button" onClick={onShare} className={styles.actionPrimary}>
          ✦ 최애운명 공유
        </button>
      </div>

      {/* Secondary actions */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={onDownloadSvg} className={styles.actionSecondary}>
          SVG 저장
        </button>
        <button type="button" onClick={onCopy} className={styles.actionSecondary}>
          결과 복사
        </button>
        <button type="button" onClick={onRetry} className={styles.actionSecondary}>
          다시 뽑기
        </button>
      </div>

      <button
        type="button"
        onClick={onTryAnother}
        className="mt-2 w-full rounded-2xl border border-dashed border-white/20 py-3 text-sm font-semibold text-white/70 transition hover:border-white/35 hover:text-white/90"
      >
        ↩ 다른 최애로 해보기
      </button>
    </article>
  );
}
