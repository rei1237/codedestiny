"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getGanjiSpriteRect,
  getGuardianCopy,
  getStemElement,
  normalizeGanji,
} from "@/app/_lib/fortune/ganjiGuardianSprite";

type GuardianAnimalSpriteProps = {
  ganji?: string | null;
  className?: string;
};

export default function GuardianAnimalSprite({ ganji, className = "" }: GuardianAnimalSpriteProps) {
  const normalized = useMemo(() => normalizeGanji(ganji), [ganji]);
  const rect = useMemo(() => (normalized ? getGanjiSpriteRect(normalized) : null), [normalized]);
  const stem = useMemo(() => (normalized ? getStemElement(normalized) : null), [normalized]);
  const copy = useMemo(() => (normalized ? getGuardianCopy(normalized) : null), [normalized]);

  const [spriteSrc, setSpriteSrc] = useState(rect?.src ?? "");

  useEffect(() => {
    setSpriteSrc(rect?.src ?? "");
  }, [rect?.src]);

  const handleSpriteError = useCallback(() => {
    if (!rect) return;
    if (spriteSrc !== rect.fallbackSrc) {
      setSpriteSrc(rect.fallbackSrc);
    }
  }, [rect, spriteSrc]);

  if (!normalized || !rect || !stem || !copy) {
    return (
      <div
        className={`rounded-[2rem] border border-rose-100 bg-white/80 p-6 shadow-lg shadow-rose-100/60 ${className}`}
        aria-live="polite"
      >
        <p className="text-xs font-black tracking-[0.16em] text-rose-400">GUARDIAN</p>
        <h3 className="mt-2 text-lg font-black text-slate-700">일주 정보를 아직 찾지 못했어요</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          사주 계산 결과에서 일주(day pillar)가 확인되면 60갑자 가디언 카드를 정확하게 보여드릴게요.
        </p>
      </div>
    );
  }

  const altText = `${normalized}일주 가디언 동물 ${rect.animal}`;

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl backdrop-blur-xl md:p-6 ${className}`}
      aria-label={altText}
    >
      <div className="pointer-events-none absolute -top-10 -right-12 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-sky-200/35 blur-3xl" />

      <div className="grid gap-5 md:grid-cols-[1fr,1.1fr] md:items-center">
        <div className="relative mx-auto w-full max-w-[280px]">
          <div
            className={`relative overflow-hidden rounded-[2.2rem] border-4 border-white/90 bg-gradient-to-br ${stem.gradient} p-2 shadow-2xl ${stem.glow}`}
          >
            <div className="relative overflow-hidden rounded-[1.7rem] border border-white/80 bg-white/70">
              <div className="aspect-[97/176] w-full">
                <svg
                  className="h-full w-full"
                  viewBox={`0 0 ${rect.width} ${rect.height}`}
                  role="img"
                  aria-label={altText}
                >
                  <image
                    href={spriteSrc}
                    x={-rect.x}
                    y={-rect.y}
                    width={rect.imageWidth}
                    height={rect.imageHeight}
                    preserveAspectRatio="xMinYMin slice"
                    onError={handleSpriteError}
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold">
            <span className={`rounded-full border px-3 py-1 ${stem.border} ${stem.text} bg-white/90`}>
              {normalized}일주
            </span>
            <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-slate-700">
              {rect.animal} 가디언
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-black tracking-[0.16em] text-slate-500">SAJU GUARDIAN ART</p>
          <h2 className="text-2xl font-black leading-tight text-slate-800">{copy.title}</h2>
          <p className={`text-sm font-semibold ${stem.text}`}>{copy.subtitle}</p>
          <p className="text-sm leading-relaxed text-slate-600">{copy.short}</p>
        </div>
      </div>
    </section>
  );
}
