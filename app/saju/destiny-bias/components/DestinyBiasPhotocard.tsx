"use client";

import { m, useReducedMotion } from "framer-motion";
import { useCallback, useState, type CSSProperties, type MouseEvent, type SyntheticEvent } from "react";
import type { DestinyBiasResultViewModel } from "../lib/types";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import styles from "../destiny-bias.module.css";

const DESTINY_BIAS_CARD_EXPORT_ID = "destiny-bias-card-export";

type PhotocardSurfaceProps = {
  vm: DestinyBiasResultViewModel;
  biasImageUrl?: string;
  imageAspectRatio: number | null;
  onImageLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
  exportMode?: boolean;
};

function resolveImageWrapClass(hasImage: boolean, imageAspectRatio: number | null, exportMode = false) {
  const imageRatio = imageAspectRatio && Number.isFinite(imageAspectRatio) ? imageAspectRatio : 1;
  if (!hasImage) return "h-36";
  if (imageRatio >= 1.2) return exportMode ? "h-40" : "h-36 md:h-40";
  if (imageRatio <= 0.78) return exportMode ? "h-56" : "h-48 md:h-56";
  return exportMode ? "h-48" : "h-40 md:h-48";
}

function PhotocardSurface({
  vm,
  biasImageUrl,
  imageAspectRatio,
  onImageLoad,
  exportMode = false,
}: PhotocardSurfaceProps) {
  const hasImage = Boolean(biasImageUrl);
  const relationHeadline = `${vm.userName} x ${vm.biasName}`;
  const relationSignal = `${vm.chemistryType || "잔잔응원형"} · ${vm.totalScore}점`;
  const oneLine = String(vm.oneLineDestinyMessage || vm.chemistrySummary || "").replace(/\s+/g, " ").trim().slice(0, 45);
  const cardKeywords = (Array.isArray(vm.stageChemistryKeywords) ? vm.stageChemistryKeywords : []).filter(Boolean).slice(0, 3);
  const imageWrapClass = resolveImageWrapClass(hasImage, imageAspectRatio, exportMode);
  const bodyClassName = exportMode
    ? "relative min-h-[700px] p-5"
    : `relative p-4 md:p-5 ${hasImage ? "min-h-[620px] md:min-h-[700px]" : "aspect-[9/16]"}`;

  return (
    <div id={exportMode ? DESTINY_BIAS_CARD_EXPORT_ID : undefined} className={styles.biasCardOuter}>
      <div className={styles.biasCardInner}>
        <div className={bodyClassName}>
          <div className={styles.glassSpotLayer} aria-hidden />
          <div className={styles.glassNoiseLayer} aria-hidden />
          <div className={`pointer-events-none absolute inset-0 ${styles.photocardHolo}`} aria-hidden />
          <div className={`pointer-events-none absolute inset-0 ${styles.biasGlitterLayer}`} aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(251,113,229,0.3),transparent_38%),radial-gradient(circle_at_84%_20%,rgba(96,165,250,0.24),transparent_38%),radial-gradient(circle_at_50%_92%,rgba(34,211,238,0.2),transparent_40%)]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[72%] bg-[conic-gradient(from_90deg_at_50%_0%,transparent_29%,rgba(255,255,255,0.06)_40%,rgba(201,167,255,0.13)_50%,rgba(255,255,255,0.06)_60%,transparent_71%)]" aria-hidden />
          <div className="pointer-events-none absolute left-[6%] top-0 h-[58%] w-[28%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,95,210,0.22),transparent_76%)] blur-sm" aria-hidden />
          <div className="pointer-events-none absolute right-[5%] top-0 h-[52%] w-[25%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(64,200,255,0.18),transparent_76%)] blur-sm" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-[radial-gradient(ellipse_88%_56%_at_50%_100%,rgba(109,59,255,0.3),transparent)]" aria-hidden />
          <div className="pointer-events-none absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-white/60 shadow-[0_0_10px_5px_rgba(255,255,255,0.25),0_0_24px_12px_rgba(201,167,255,0.22),0_0_52px_22px_rgba(109,59,255,0.14)]" aria-hidden />
          <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
            <div className="absolute left-8 top-8 h-1 w-1 rounded-full bg-white/70" />
            <div className="absolute right-12 top-16 h-1.5 w-1.5 rounded-full bg-cyan-200/70" />
            <div className="absolute left-16 top-36 h-1 w-1 rounded-full bg-pink-200/70" />
            <div className="absolute right-20 top-52 h-1 w-1 rounded-full bg-white/60" />
            <div className="absolute left-10 bottom-36 h-1.5 w-1.5 rounded-full bg-cyan-100/75" />
            <div className="absolute right-10 bottom-28 h-1 w-1 rounded-full bg-pink-100/75" />
          </div>

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-start justify-between">
              <span className="rounded-full border border-pink-200/50 bg-pink-300/15 px-3 py-1 text-[10px] font-bold tracking-[0.12em] text-pink-100">FAN x BIAS LINK</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200/45 bg-cyan-300/10">
                <DestinyIcon name="star" size={14} className="text-cyan-100" variant="glow" />
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-100/80">ENERGY RELATION</p>
                <h3 className={`${styles.cardClamp1} mt-1 text-2xl font-black leading-tight text-white`}>{vm.biasName}</h3>
                <p className={`${styles.cardClamp1} mt-1 text-xs text-white/75`}>{vm.chemistryType || "잔잔응원형"}</p>
              </div>
              <div className="relative grid h-16 w-16 place-items-center">
                <div className="pointer-events-none absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.22),transparent_68%)] blur-md" aria-hidden />
                <div className="relative grid h-16 w-16 place-items-center rounded-full border border-cyan-100/65 bg-[radial-gradient(circle,rgba(56,189,248,0.48)_0%,rgba(22,78,99,0.18)_70%,transparent_100%)] shadow-[0_0_20px_rgba(56,189,248,0.55),0_0_44px_rgba(56,189,248,0.28),inset_0_1px_0_rgba(255,255,255,0.22)]">
                  <span className="text-lg font-black text-white drop-shadow-[0_0_7px_rgba(200,240,255,0.9)]">{vm.totalScore}%</span>
                </div>
              </div>
            </div>

            <div className="relative mt-5 flex-1 overflow-hidden rounded-[24px] border border-white/20 bg-[linear-gradient(160deg,rgba(7,22,45,0.74)_0%,rgba(25,19,63,0.62)_50%,rgba(8,30,55,0.72)_100%)] p-4">
              <div className={styles.uploadBlendFrame} aria-hidden />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_38%,rgba(191,219,254,0.56),transparent_30%),radial-gradient(circle_at_72%_66%,rgba(34,211,238,0.32),transparent_28%)]" aria-hidden />
              <div className="pointer-events-none absolute left-1/2 top-[48%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/35" aria-hidden />
              <div className="pointer-events-none absolute left-1/2 top-[48%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pink-100/30" aria-hidden />

              <div className={`relative z-10 mb-3 overflow-hidden rounded-2xl border border-white/25 bg-black/35 ${imageWrapClass}`}>
                {biasImageUrl ? (
                  <img
                    src={biasImageUrl}
                    alt={`${vm.biasName} 업로드 이미지`}
                    className="h-full w-full object-cover"
                    onLoad={onImageLoad}
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-[linear-gradient(140deg,rgba(30,41,89,0.75),rgba(56,189,248,0.22),rgba(219,39,119,0.24))]">
                    <p className="text-xs font-semibold tracking-[0.12em] text-white/88">NO IMAGE UPLOAD</p>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.32)_0%,rgba(255,255,255,0.08)_22%,rgba(255,255,255,0.0)_45%,rgba(255,255,255,0.2)_100%)] mix-blend-screen" aria-hidden />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.36),transparent_40%),radial-gradient(circle_at_80%_85%,rgba(125,211,252,0.2),transparent_34%)]" aria-hidden />
              </div>

              <div className="relative z-10 space-y-3">
                <p className={`${styles.cardClamp1} text-xs font-semibold tracking-[0.04em] text-white/90`}>{relationHeadline}</p>
                <p className={`${styles.cardClamp1} rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm font-semibold text-cyan-50`}>{relationSignal}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cardKeywords.map((keyword) => (
                    <span key={keyword} className="max-w-[120px] truncate rounded-full border border-cyan-200/35 bg-cyan-300/10 px-2 py-1 text-[11px] font-semibold text-cyan-100/90">
                      #{keyword}
                    </span>
                  ))}
                </div>
                <div className="rounded-xl border border-pink-100/20 bg-pink-300/10 px-3 py-2">
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-pink-100/85">ONE LINE LINK</p>
                  <p className={`${styles.cardClamp2} mt-1 break-keep text-sm leading-6 text-white/92`}>{oneLine}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/70">
              <span>{vm.destinyId}</span>
              <span>{vm.issuedAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DestinyBiasPhotocard({
  vm,
  biasImageUrl,
}: {
  vm: DestinyBiasResultViewModel;
  biasImageUrl?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [glare, setGlare] = useState({ x: 50, y: 16, tiltX: 0, tiltY: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  const handleMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const centerX = x - 50;
    const centerY = y - 50;

    setGlare({
      x,
      y,
      tiltX: Number((-centerY / 15).toFixed(2)),
      tiltY: Number((centerX / 15).toFixed(2)),
    });
  }, [reduceMotion]);

  const resetMove = useCallback(() => {
    setGlare({ x: 50, y: 16, tiltX: 0, tiltY: 0 });
  }, []);

  const handleImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    const width = target.naturalWidth || 0;
    const height = target.naturalHeight || 0;
    if (width > 0 && height > 0) setImageAspectRatio(width / height);
  }, []);

  const dynamicStyle = {
    "--card-glare-x": `${glare.x}%`,
    "--card-glare-y": `${glare.y}%`,
    transform: reduceMotion ? "none" : `perspective(1200px) rotateX(${glare.tiltX}deg) rotateY(${glare.tiltY}deg)`,
  } as CSSProperties;

  const exportWrapperStyle = {
    position: "fixed",
    left: "-10000px",
    top: 0,
    width: 420,
    pointerEvents: "none",
  } as CSSProperties;

  return (
    <>
      <m.div
        id="destiny-bias-card-preview"
        className="relative isolate mx-auto w-full max-w-[420px]"
        onMouseMove={handleMove}
        onMouseLeave={resetMove}
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95, y: reduceMotion ? 0 : 16 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
        whileHover={reduceMotion ? undefined : { scale: 1.02, y: -4 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        style={dynamicStyle}
      >
        <PhotocardSurface
          vm={vm}
          biasImageUrl={biasImageUrl}
          imageAspectRatio={imageAspectRatio}
          onImageLoad={handleImageLoad}
        />

        <p className="mt-3 text-center text-xs text-white/55">
          ✦ 이 카드엔 두 사람의 에너지 공명이 담겨 있어요
        </p>

        <div
          className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-[90%] -translate-x-1/2 rounded-full bg-fuchsia-400/30 blur-3xl"
          aria-hidden
        />
      </m.div>
      <div aria-hidden="true" style={exportWrapperStyle}>
        <PhotocardSurface
          vm={vm}
          biasImageUrl={biasImageUrl}
          imageAspectRatio={imageAspectRatio}
          exportMode
        />
      </div>
    </>
  );
}
