"use client";

import Image from "next/image";
import styles from "./moon-music-player.module.css";
import type { ArtistKey } from "./_data/musicManifest";
import { useCallback, useEffect, useRef } from "react";
import type { SyntheticEvent } from "react";

type MoonAlbumArtworkProps = {
  coverUrl: string;
  title: string;
  artistKey: ArtistKey;
  artistName: string;
  coverFailed: boolean;
  onCoverLoad: () => void;
  onCoverError: () => void;
};

const MOON_ARTWORK_BLUR_DATA_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%230a0718'/%3E%3Ccircle cx='15' cy='9' r='7' fill='%239b7fd4' fill-opacity='.32'/%3E%3Ccircle cx='12' cy='11' r='7' fill='%23d4af7a' fill-opacity='.2'/%3E%3C/svg%3E";

export default function MoonAlbumArtwork({
  coverUrl,
  title,
  artistKey,
  artistName,
  coverFailed,
  onCoverLoad,
  onCoverError,
}: MoonAlbumArtworkProps) {
  const albumFrameRef = useRef<HTMLDivElement | null>(null);

  const setCoverAspectFromImage = useCallback((image: HTMLImageElement) => {
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    const ratio = naturalHeight > 0 ? naturalWidth / naturalHeight : 0;
    const albumFrame = albumFrameRef.current;

    if (!albumFrame) return;

    if (Number.isFinite(ratio) && ratio > 0) {
      albumFrame.style.setProperty("--album-cover-aspect-ratio", `${ratio.toFixed(6)}`);
      return;
    }

    albumFrame.style.removeProperty("--album-cover-aspect-ratio");
  }, []);

  const resetCoverAspect = useCallback(() => {
    const albumFrame = albumFrameRef.current;
    if (!albumFrame) return;
    albumFrame.style.removeProperty("--album-cover-aspect-ratio");
  }, []);

  useEffect(() => {
    resetCoverAspect();
  }, [coverUrl, resetCoverAspect]);

  const handleCoverLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    setCoverAspectFromImage(event.currentTarget);
    onCoverLoad();
  }, [onCoverLoad, setCoverAspectFromImage]);

  const handleCoverError = useCallback(() => {
    resetCoverAspect();
    onCoverError();
  }, [onCoverError, resetCoverAspect]);

  return (
    <div className={styles.albumStage} data-artist={artistKey}>
      <div className={styles.albumAura} aria-hidden />
      <div className={styles.albumHalo} aria-hidden />
      <div className={styles.albumMoonRing} aria-hidden />
      <div ref={albumFrameRef} className={styles.albumFrame}>
        {coverUrl ? (
          <Image
            className={styles.coverImage}
            src={coverUrl}
            alt={`${artistName} - ${title} cover`}
            width={640}
            height={640}
            sizes="(max-width: 768px) 100vw, 400px"
            priority
            decoding="async"
            placeholder="blur"
            blurDataURL={MOON_ARTWORK_BLUR_DATA_URL}
            unoptimized
            onLoad={handleCoverLoad}
            onError={handleCoverError}
            data-hidden={coverFailed ? "true" : "false"}
          />
        ) : null}
        <div className={styles.coverFallbackArt} aria-hidden />
      </div>
      <div className={styles.albumReflection} aria-hidden />
    </div>
  );
}
