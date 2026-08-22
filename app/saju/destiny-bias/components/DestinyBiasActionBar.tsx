"use client";

import { useDestinyBiasCopy } from "../_lib/copy";

type Props = {
  onDownloadSvg: () => void;
  onDownloadPng: () => void;
  onShare: () => void;
  onShareToX: () => void;
  onShareToInstagram: () => void;
  onShareToKakao: () => void;
  onCopy: () => void;
  onRetry: () => void;
  onTryAnother: () => void;
};

export default function DestinyBiasActionBar({
  onDownloadSvg,
  onDownloadPng,
  onShare,
  onShareToX,
  onShareToInstagram,
  onShareToKakao,
  onCopy,
  onRetry,
  onTryAnother,
}: Props) {
  const copy = useDestinyBiasCopy();
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(145deg,rgba(10,19,45,0.78),rgba(25,21,68,0.58))] p-5 shadow-[0_24px_60px_rgba(2,6,23,0.42)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(244,114,182,0.24),transparent_34%),radial-gradient(circle_at_84%_80%,rgba(34,211,238,0.2),transparent_36%)]" aria-hidden />

      <div className="relative z-10">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-cyan-100/70">SAVE &amp; SHARE ✨</p>
      <h3 className="mt-1 text-lg font-black text-white">{copy.actionBarHeading}</h3>
      <p className="mt-1 text-sm text-white/75">{copy.actionBarSubtext}</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onDownloadPng}
          className="min-h-12 rounded-full bg-[linear-gradient(92deg,#22d3ee,#8b5cf6,#ec4899)] px-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(139,92,246,0.42)] transition hover:-translate-y-0.5"
        >
          {copy.savePhotocardButton}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="min-h-12 rounded-full bg-[linear-gradient(92deg,#ec4899,#8b5cf6,#22d3ee)] px-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(236,72,153,0.36)] transition hover:-translate-y-0.5"
        >
          {copy.shareButton}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={onShareToX}
          className="min-h-11 rounded-full border border-white/22 bg-white/6 px-3 text-sm font-semibold text-white/90 transition hover:border-cyan-200/65 hover:bg-cyan-300/10"
        >
          {copy.shareToXButton}
        </button>
        <button
          type="button"
          onClick={onShareToInstagram}
          className="min-h-11 rounded-full border border-white/22 bg-white/6 px-3 text-sm font-semibold text-white/90 transition hover:border-cyan-200/65 hover:bg-cyan-300/10"
        >
          {copy.shareToInstagramButton}
        </button>
        <button
          type="button"
          onClick={onShareToKakao}
          className="min-h-11 rounded-full border border-white/22 bg-white/6 px-3 text-sm font-semibold text-white/90 transition hover:border-cyan-200/65 hover:bg-cyan-300/10"
        >
          {copy.shareToKakaoButton}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button type="button" onClick={onDownloadSvg} className="min-h-11 rounded-full border border-white/22 bg-white/6 text-sm font-semibold text-white/90 transition hover:border-cyan-200/65 hover:bg-cyan-300/10">
          {copy.saveSvgButton}
        </button>
        <button type="button" onClick={onCopy} className="min-h-11 rounded-full border border-white/22 bg-white/6 text-sm font-semibold text-white/90 transition hover:border-cyan-200/65 hover:bg-cyan-300/10">
          {copy.copyTextButton}
        </button>
        <button type="button" onClick={onRetry} className="min-h-11 rounded-full border border-white/22 bg-white/6 text-sm font-semibold text-white/90 transition hover:border-cyan-200/65 hover:bg-cyan-300/10">
          {copy.viewResultAgainButton}
        </button>
      </div>

      <button
        type="button"
        onClick={onTryAnother}
        className="mt-2 min-h-11 w-full rounded-full border border-dashed border-white/22 bg-white/5 px-4 py-3 text-sm font-semibold text-white/78 transition hover:border-white/38 hover:text-white"
      >
        {copy.tryAnotherButton}
      </button>
      </div>
    </article>
  );
}
