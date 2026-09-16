"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import type { Track } from "../_data/musicManifest";
import type { MusicCopy } from "../_lib/musicCopy";
import type { ArtistFilterKey } from "../_lib/musicFormat";
import { doesTrackMatchFilter, formatTime, normalizeSearchText } from "../_lib/musicFormat";
import { useMusicPlaybackStore } from "../_stores/useMusicPlaybackStore";
import styles from "../music-lounge.module.css";

type TrackRowProps = {
  track: Track;
  index: number;
  copy: MusicCopy;
  onSelect: (trackId: string) => void;
};

// 행은 자기 current/playing 만 store 에서 구독한다 → 곡이 바뀌면 이전·새 행 2개만 리렌더.
const TrackRow = memo(function TrackRow({ track, index, copy, onSelect }: TrackRowProps) {
  const isCurrent = useMusicPlaybackStore((state) => state.currentTrackId === track.id);
  const isPlaying = useMusicPlaybackStore((state) => state.currentTrackId === track.id && state.isPlaying);
  const locked = track.accessTier === "locked_preview";

  return (
    <li className={styles.row} data-current={isCurrent ? "true" : "false"} data-playing={isPlaying ? "true" : "false"}>
      <button
        type="button"
        className={styles.rowBtn}
        onClick={() => onSelect(track.id)}
        aria-current={isCurrent ? "true" : undefined}
        aria-label={copy.playTrack(track.title, track.artistName)}
      >
        <span className={styles.rowIdx}>
          {isPlaying ? (
            <span className={styles.bars} aria-hidden="true"><i /><i /><i /></span>
          ) : (
            String(index + 1).padStart(2, "0")
          )}
        </span>
        <span className={styles.rowMeta}>
          <span className={styles.rowTitle}>{track.title}</span>
          <span className={styles.rowArtist}>{track.artistName}</span>
        </span>
        {locked ? <span className={styles.rowTag}>{copy.previewBadge}</span> : null}
        {track.durationSeconds ? <span className={styles.rowTime}>{formatTime(track.durationSeconds)}</span> : null}
      </button>
    </li>
  );
});

type TrackListProps = {
  copy: MusicCopy;
  tracks: readonly Track[];
  filter: ArtistFilterKey;
  onSelect: (trackId: string) => void;
};

export const TrackList = memo(function TrackList({ copy, tracks, filter, onSelect }: TrackListProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(() => {
    const needle = normalizeSearchText(deferredQuery);
    return tracks.filter((track) => {
      if (!doesTrackMatchFilter(track, filter)) return false;
      if (!needle) return true;
      return normalizeSearchText(`${track.title} ${track.artistName}`).includes(needle);
    });
  }, [tracks, filter, deferredQuery]);

  return (
    <section className={styles.list} aria-label={copy.playlistAria}>
      <div className={styles.listHead}>
        <input
          className={styles.search}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchAria}
          autoComplete="off"
          enterKeyHint="search"
        />
        <span className={styles.listCount}>{copy.tracksCount(visible.length, tracks.length)}</span>
      </div>
      {visible.length ? (
        <ol className={styles.rows}>
          {visible.map((track, index) => (
            <TrackRow key={track.id} track={track} index={index} copy={copy} onSelect={onSelect} />
          ))}
        </ol>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{copy.emptyTitle}</p>
          <p className={styles.emptyBody}>{copy.emptyBody}</p>
        </div>
      )}
    </section>
  );
});
