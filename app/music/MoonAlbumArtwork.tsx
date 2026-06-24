"use client";

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
          <img
            className={styles.coverImage}
            src={coverUrl}
            alt={`${artistName} - ${title} cover`}
            loading="eager"
            decoding="async"
            fetchPriority="high"
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
