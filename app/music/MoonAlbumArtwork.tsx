"use client";

import styles from "./moon-music-player.module.css";

type MoonAlbumArtworkProps = {
  coverUrl: string;
  title: string;
  artistKey: "neo" | "yeoni";
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
  return (
    <div className={styles.albumStage} data-artist={artistKey}>
      <div className={styles.albumAura} aria-hidden />
      <div className={styles.albumHalo} aria-hidden />
      <div className={styles.albumMoonRing} aria-hidden />
      <div className={styles.albumFrame}>
        {coverUrl ? (
          <img
            className={styles.coverImage}
            src={coverUrl}
            alt={`${artistName} - ${title} cover`}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={onCoverLoad}
            onError={onCoverError}
            data-hidden={coverFailed ? "true" : "false"}
          />
        ) : null}
        <div className={styles.coverFallbackArt} aria-hidden />
      </div>
      <div className={styles.albumReflection} aria-hidden />
    </div>
  );
}
