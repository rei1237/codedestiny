"use client";

import { forwardRef, memo, useEffect, useState } from "react";
import type { Track } from "../_data/musicManifest";
import type { MusicPlayerStatus, RepeatMode } from "../_hooks/useMusicPlayer";
import type { MusicCopy } from "../_lib/musicCopy";
import { buildCoverSrc } from "../_lib/musicFormat";
import styles from "../music-lounge.module.css";
import {
  DownloadIcon,
  LockIcon,
  LyricsIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  ShareIcon,
  ShuffleIcon,
  VolumeIcon,
} from "./MusicIcons";
import { ProgressBar } from "./ProgressBar";

export type NowPlayingProps = {
  copy: MusicCopy;
  track: Track | null;
  coverUrl: string;
  isPlaying: boolean;
  status: MusicPlayerStatus;
  errorMessage: string;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  hasFullAccess: boolean;
  passCoversAll: boolean;
  canDownload: boolean;
  isPurchasing: boolean;
  accessMessage: string;
  shared: boolean;
  lyricsOpen: boolean;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolume: (volume: number) => void;
  onToggleMute: () => void;
  onCycleRepeat: () => void;
  onToggleShuffle: () => void;
  onShare: () => void;
  onToggleLyrics: () => void;
  onPurchase: () => void;
  onDownload: () => void;
};

// 커버 슬롯은 항상 같은 크기(CLS 0). 리사이즈 URL 실패 → 원본 → 글리프 순으로 물러난다.
function Cover({ coverUrl, title }: { coverUrl: string; title: string }) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  useEffect(() => { setStage(0); }, [coverUrl]);

  const src = stage === 0 ? buildCoverSrc(coverUrl) : stage === 1 ? coverUrl : "";
  if (!src) {
    return <span className={styles.cover} data-empty="true" aria-hidden="true">🌙</span>;
  }
  return (
    <img
      className={styles.cover}
      src={src}
      alt={title}
      width={96}
      height={96}
      decoding="async"
      fetchPriority="high"
      onError={() => setStage((current) => (current === 0 ? 1 : 2))}
    />
  );
}

export const NowPlaying = memo(forwardRef<HTMLElement, NowPlayingProps>(function NowPlaying(props, ref) {
  const { copy, track } = props;
  const isLockedPreview = Boolean(track) && !props.hasFullAccess && track?.accessTier === "locked_preview";
  const statusLabel = props.status === "loading"
    ? copy.statusLoading
    : props.isPlaying ? copy.statusPlaying : copy.statusPaused;
  const badge = props.hasFullAccess
    ? (props.passCoversAll && track?.accessTier === "locked_preview" ? copy.passAccessBadge : copy.fullAccessBadge)
    : copy.previewBadge;
  const message = props.errorMessage || props.accessMessage;

  return (
    <section ref={ref} className={styles.now} aria-label={copy.playerAria}>
      <div className={styles.nowTop}>
        <Cover coverUrl={props.coverUrl} title={track?.title || ""} />
        <div className={styles.nowMeta}>
          <p className={styles.nowTitle}>{track?.title || "—"}</p>
          <p className={styles.nowArtist}>{track?.artistName || ""}</p>
          <p className={styles.nowStatus}>
            <span className={styles.badge} data-locked={isLockedPreview ? "true" : "false"}>{badge}</span>
            <span aria-live="polite">{statusLabel}</span>
          </p>
        </div>
      </div>

      <div className={styles.transport}>
        <button type="button" className={styles.iconBtn} onClick={props.onPrevious} aria-label={copy.previousTrack} disabled={!track}>
          <PrevIcon size={22} />
        </button>
        <button
          type="button"
          className={styles.playBtn}
          onClick={props.onToggle}
          aria-label={props.isPlaying ? copy.pause : copy.play}
          disabled={!track}
        >
          {props.isPlaying ? <PauseIcon size={26} /> : <PlayIcon size={26} />}
        </button>
        <button type="button" className={styles.iconBtn} onClick={props.onNext} aria-label={copy.nextTrack} disabled={!track}>
          <NextIcon size={22} />
        </button>
      </div>

      <ProgressBar seek={props.onSeek} label={copy.seek} valueText={copy.seekValue} />

      <div className={styles.aux}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={props.onToggleMute}
          aria-label={props.muted ? copy.unmute : copy.mute}
          aria-pressed={props.muted}
        >
          {props.muted || props.volume === 0 ? <MuteIcon /> : <VolumeIcon />}
        </button>
        <input
          className={`${styles.range} ${styles.volume}`}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={props.muted ? 0 : props.volume}
          aria-label={copy.volume}
          style={{ "--fill": `${(props.muted ? 0 : props.volume) * 100}%` } as React.CSSProperties}
          onChange={(event) => props.onVolume(Number(event.currentTarget.value))}
        />
        <span className={styles.auxSpacer} />
        <button
          type="button"
          className={styles.iconBtn}
          onClick={props.onCycleRepeat}
          aria-label={copy.repeat(props.repeat)}
          aria-pressed={props.repeat !== "off"}
        >
          <RepeatIcon one={props.repeat === "one"} />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={props.onToggleShuffle}
          aria-label={props.shuffle ? copy.shuffleOn : copy.shuffleOff}
          aria-pressed={props.shuffle}
        >
          <ShuffleIcon />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={props.onShare}
          aria-label={props.shared ? copy.copied : copy.share}
          disabled={!track}
        >
          <ShareIcon />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={props.onToggleLyrics}
          aria-label={copy.lyrics}
          aria-pressed={props.lyricsOpen}
          aria-expanded={props.lyricsOpen}
          disabled={!track}
        >
          <LyricsIcon />
        </button>
      </div>

      <div className={styles.access}>
        {/* 옛 FeaturedTrackCard 와 같은 분기: 잠금 미리듣기이거나 다운로드 권한이 없으면 구매, 아니면 다운로드. */}
        {isLockedPreview || !props.canDownload ? (
          <button
            type="button"
            className={styles.accessBtn}
            onClick={props.onPurchase}
            disabled={!track || props.isPurchasing}
          >
            <LockIcon size={16} />
            <span>{props.isPurchasing ? copy.buyingFullTrack : (isLockedPreview ? copy.buyFullTrack : copy.buyForDownload)}</span>
          </button>
        ) : (
          <button type="button" className={styles.accessBtn} onClick={props.onDownload} disabled={!track}>
            <DownloadIcon size={16} />
            <span>{copy.downloadTrack}</span>
          </button>
        )}
        <p className={styles.message} role="status">{message}</p>
      </div>
    </section>
  );
}));
