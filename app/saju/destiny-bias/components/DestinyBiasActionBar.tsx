"use client";

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
    <article className="rounded-[28px] border border-white/20 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={onDownloadSvg}
          className="min-h-11 rounded-full border border-cyan-200/70 bg-cyan-300/20 px-4 text-sm font-bold text-cyan-50"
        >
          SVG 저장
        </button>
        <button
          type="button"
          onClick={onDownloadPng}
          className="min-h-11 rounded-full border border-fuchsia-200/70 bg-fuchsia-300/20 px-4 text-sm font-bold text-fuchsia-50"
        >
          PNG 저장
        </button>
        <button
          type="button"
          onClick={onShare}
          className="min-h-11 rounded-full border border-violet-200/70 bg-violet-300/20 px-4 text-sm font-bold text-violet-50"
        >
          공유
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="min-h-11 rounded-full border border-white/35 bg-white/10 px-4 text-sm font-semibold text-white"
        >
          결과 복사
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-full border border-white/35 bg-white/10 px-4 text-sm font-semibold text-white"
        >
          다시 뽑기
        </button>
        <button
          type="button"
          onClick={onTryAnother}
          className="min-h-11 rounded-full border border-emerald-200/70 bg-emerald-300/20 px-4 text-sm font-bold text-emerald-50"
        >
          다른 최애로 해보기
        </button>
      </div>
    </article>
  );
}
