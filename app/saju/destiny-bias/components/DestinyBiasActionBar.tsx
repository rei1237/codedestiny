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
      <p className="text-[10px] font-semibold tracking-[0.16em] text-white/55">SAVE & SHARE BOOTH</p>
      <h3 className="mt-1 text-base font-extrabold text-white">오늘의 최애운명을 소장해 보세요</h3>
      <p className="mt-1 text-sm text-white/75">가장 먼저 보이는 버튼으로 바로 저장하고, 공유는 그 다음에 간단하게 이어집니다.</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" onClick={onDownloadPng} className={styles.actionPrimary}>
          포토카드 저장하기
        </button>
        <button type="button" onClick={onShare} className={styles.actionPrimary}>
          인스타 스토리 공유
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
        className="mt-2 min-h-11 w-full rounded-full border border-dashed border-white/22 bg-white/5 px-4 py-3 text-sm font-semibold text-white/78 transition hover:border-white/38 hover:text-white"
      >
        다른 최애와 다시 해보기
      </button>
    </article>
  );
}
