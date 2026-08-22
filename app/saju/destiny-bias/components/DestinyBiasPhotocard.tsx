"use client";

import { m, useReducedMotion } from "framer-motion";
import { useCallback, useState, type CSSProperties, type MouseEvent, type SyntheticEvent } from "react";
import type { DestinyBiasResultViewModel } from "../lib/types";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import styles from "../destiny-bias.module.css";
import { useDestinyBiasCopy, type DestinyBiasCopy } from "../_lib/copy";

const DESTINY_BIAS_CARD_EXPORT_ID = "destiny-bias-card-export";

type PhotocardSurfaceProps = {
  vm: DestinyBiasResultViewModel;
  biasImageUrl?: string;
  imageAspectRatio: number | null;
  onImageLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
  exportMode?: boolean;
  copy: DestinyBiasCopy;
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
  copy,
}: PhotocardSurfaceProps) {
  const hasImage = Boolean(biasImageUrl);
  const relationHeadline = `${vm.userName} x ${vm.biasName}`;
  const relationSignal = `${vm.chemistryType || copy.defaultChemistryType} · ${vm.totalScore}${copy.scoreSuffix ?? " pts"}`;
  const oneLine = String(vm.cardCaption || vm.chemistryType || "").replace(/\s+/g, " ").trim();
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(255,217,138,0.22),transparent_40%),radial-gradient(circle_at_84%_22%,rgba(201,167,255,0.2),transparent_38%),radial-gradient(circle_at_50%_96%,rgba(109,59,255,0.26),transparent_44%)]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[68%] bg-[conic-gradient(from_90deg_at_50%_0%,transparent_31%,rgba(255,243,208,0.09)_42%,rgba(255,217,138,0.14)_50%,rgba(255,243,208,0.09)_58%,transparent_69%)]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] bg-[radial-gradient(ellipse_88%_56%_at_50%_100%,rgba(109,59,255,0.28),transparent)]" aria-hidden />
          <div className={styles.cardFoilFrame} aria-hidden />
          <div className={`${styles.cardFoilCorner} ${styles.cardFoilCornerTL}`} aria-hidden />
          <div className={`${styles.cardFoilCorner} ${styles.cardFoilCornerBR}`} aria-hidden />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-start justify-between">
              <span className="rounded-full border border-[var(--bias-gold)]/45 bg-[var(--bias-gold)]/10 px-3 py-1 text-[10px] font-bold tracking-[0.12em] text-[var(--bias-gold)]">FAN x BIAS LINK</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--bias-gold)]/40 bg-[var(--bias-gold)]/8">
                <DestinyIcon name="star" size={14} className="text-[var(--bias-gold)]" variant="glow" />
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={styles.cardEyebrow}>ENERGY RELATION</p>
                <h3 className={`${styles.cardClamp1} mt-1.5 text-2xl font-black leading-tight text-white`}>{vm.biasName}</h3>
                <p className={`${styles.cardClamp1} mt-1 text-xs text-white/72`}>{vm.chemistryType || copy.defaultChemistryType}</p>
              </div>
              <div className={styles.scoreGem}>
                <span className={styles.scoreGemText}>{vm.totalScore}%</span>
              </div>
            </div>

            <div className={`${styles.auroraDiv} mt-4`} aria-hidden />

            <div className="relative mt-4 flex-1 overflow-hidden rounded-[24px] border border-white/16 bg-[linear-gradient(160deg,rgba(26,11,63,0.72)_0%,rgba(13,7,34,0.66)_52%,rgba(26,11,63,0.7)_100%)] p-4">
              <div className={styles.uploadBlendFrame} aria-hidden />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_32%_30%,rgba(255,243,208,0.22),transparent_34%),radial-gradient(circle_at_74%_70%,rgba(255,95,210,0.16),transparent_32%)]" aria-hidden />

              <div className={`${styles.cardPortraitFrame} relative z-10 mb-3 ${imageWrapClass}`}>
                {biasImageUrl ? (
                  <img
                    src={biasImageUrl}
                    alt={`${vm.biasName} ${copy.photocardUploadedImageAltSuffix}`}
                    className="h-full w-full object-cover"
                    onLoad={onImageLoad}
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-[linear-gradient(140deg,rgba(26,11,63,0.82),rgba(109,59,255,0.24),rgba(255,217,138,0.16))]">
                    <p className="text-xs font-semibold tracking-[0.12em] text-white/85">NO IMAGE UPLOAD</p>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0.06)_24%,rgba(255,255,255,0.0)_48%,rgba(255,243,208,0.16)_100%)] mix-blend-screen" aria-hidden />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.3),transparent_40%)]" aria-hidden />
              </div>

              <div className="relative z-10 space-y-3">
                <p className={`${styles.cardClamp1} text-xs font-semibold tracking-[0.04em] text-white/90`}>{relationHeadline}</p>
                <p className={`${styles.cardClamp1} rounded-xl border border-[var(--bias-gold)]/22 bg-black/25 px-3 py-2 text-sm font-semibold text-[var(--bias-gold)]`}>{relationSignal}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cardKeywords.map((keyword) => (
                    <span key={keyword} className={`${styles.keywordChip} max-w-[120px] truncate`}>
                      #{keyword}
                    </span>
                  ))}
                </div>
                <div className="rounded-xl border border-white/14 bg-white/6 px-3 py-2">
                  <p className={styles.cardEyebrow}>ONE LINE LINK</p>
                  <p className={`${styles.cardClamp2} mt-1.5 break-keep text-sm leading-6 text-white/92`}>{oneLine}</p>
                </div>
              </div>
            </div>

            <div className={styles.serialStrip}>
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
  const copy = useDestinyBiasCopy();
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
          copy={copy}
        />

        <p className="mt-3 text-center text-xs text-white/55">
          {copy.photocardBottomNote}
        </p>

        <div
          className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-[90%] -translate-x-1/2 rounded-full bg-[var(--bias-purple)]/28 blur-3xl"
          aria-hidden
        />
      </m.div>
      <div aria-hidden="true" style={exportWrapperStyle}>
        <PhotocardSurface
          vm={vm}
          biasImageUrl={biasImageUrl}
          imageAspectRatio={imageAspectRatio}
          exportMode
          copy={copy}
        />
      </div>
    </>
  );
}
