"use client";

import { memo } from "react";
import type { Track } from "../_data/musicManifest";
import type { MusicCopy } from "../_lib/musicCopy";
import { buildCoverSrc } from "../_lib/musicFormat";
import styles from "../music-lounge.module.css";
import { NextIcon, PauseIcon, PlayIcon } from "./MusicIcons";
import { MiniProgress } from "./ProgressBar";

type MiniPlayerProps = {
  copy: MusicCopy;
  track: Track | null;
  coverUrl: string;
  isPlaying: boolean;
  visible: boolean;
  onToggle: () => void;
  onNext: () => void;
  onOpen: () => void;
};

// 모바일 하단 고정 도크. NowPlaying 이 화면에서 벗어났을 때만 올라온다. backdrop-filter 없음.
export const MiniPlayer = memo(function MiniPlayer({ copy, track, coverUrl, isPlaying, visible, onToggle, onNext, onOpen }: MiniPlayerProps) {
  const src = buildCoverSrc(coverUrl);
  return (
    <div className={styles.mini} data-visible={visible ? "true" : "false"} aria-hidden={!visible}>
      <MiniProgress />
      <button type="button" className={styles.miniOpen} onClick={onOpen} aria-label={copy.miniOpen} tabIndex={visible ? 0 : -1}>
        {src ? (
          <img className={styles.miniCover} src={src} alt="" width={40} height={40} loading="lazy" decoding="async" />
        ) : (
          <span className={styles.miniCover} data-empty="true" aria-hidden="true">🌙</span>
        )}
        <span className={styles.miniMeta}>
          <span className={styles.miniTitle}>{track?.title || "—"}</span>
          <span className={styles.miniArtist}>{track?.artistName || ""}</span>
        </span>
      </button>
      <button
        type="button"
        className={styles.iconBtn}
        onClick={onToggle}
        aria-label={isPlaying ? copy.pause : copy.play}
        disabled={!track}
        tabIndex={visible ? 0 : -1}
      >
        {isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
      </button>
      <button type="button" className={styles.iconBtn} onClick={onNext} aria-label={copy.nextTrack} disabled={!track} tabIndex={visible ? 0 : -1}>
        <NextIcon size={22} />
      </button>
    </div>
  );
});
