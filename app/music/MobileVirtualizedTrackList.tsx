"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaylistTrackDisplay } from "./MusicPlaylistPanel";
import { PlaylistTrackCard } from "./MusicPlaylistPanel";
import styles from "./moon-music-player.module.css";

type MobileVirtualizedTrackListProps = {
  tracks: readonly PlaylistTrackDisplay[];
  sharedTrackId: string;
  failedCoverIds: Record<string, boolean>;
  onCoverError: (trackId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onShareTrack: (trackId: string) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
};

const OVERSCAN_ROWS = 4;
const FALLBACK_ROW_STRIDE = 94; // 84px base + ~10px gap, fallback before measurement

export default function MobileVirtualizedTrackList({
  tracks,
  sharedTrackId,
  failedCoverIds,
  onCoverError,
  onSelectTrack,
  onShareTrack,
  scrollRef,
}: MobileVirtualizedTrackListProps) {
  const [rowStride, setRowStride] = useState(FALLBACK_ROW_STRIDE);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(OVERSCAN_ROWS * 2, tracks.length - 1) });
  const firstRowRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = scrollRef;
  const rafIdRef = useRef<number | null>(null);

  // Measure the actual row stride from the first mounted row.
  useEffect(() => {
    const firstRow = firstRowRef.current;
    if (!firstRow || tracks.length < 2) return;

    const updateRowStride = () => {
      if (!firstRow || !scrollContainerRef.current) return;

      const firstRect = firstRow.getBoundingClientRect();
      if (firstRect.height > 0) {
        const allRows = scrollContainerRef.current.querySelectorAll<HTMLDivElement>(
          `.${styles.playlistVirtualRow}`
        );
        if (allRows.length >= 2) {
          const secondRect = allRows[1].getBoundingClientRect();
          const calculatedStride = secondRect.top - firstRect.top;
          if (calculatedStride > 0) {
            setRowStride(calculatedStride);
            return;
          }
        }
        // Fallback: use the measured height + typical gap.
        setRowStride(firstRect.height + 10);
      }
    };

    // Wait a frame for layout to settle, then measure.
    const timer = window.setTimeout(updateRowStride, 0);
    const resizeObserver = new ResizeObserver(updateRowStride);
    resizeObserver.observe(firstRow);

    return () => {
      window.clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [scrollContainerRef, tracks.length]);

  // Recompute visible range on scroll and track-list changes.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const computeVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;

      const startIndex = Math.max(0, Math.floor(scrollTop / rowStride) - OVERSCAN_ROWS);
      const endIndex = Math.min(
        tracks.length - 1,
        Math.ceil((scrollTop + viewportHeight) / rowStride) + OVERSCAN_ROWS
      );

      setVisibleRange({ start: startIndex, end: endIndex });
    };

    const handleScroll = () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = window.requestAnimationFrame(computeVisibleRange);
    };

    computeVisibleRange();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [scrollContainerRef, rowStride, tracks.length]);

  const totalHeight = tracks.length * rowStride;
  const visibleTracks = tracks.slice(visibleRange.start, visibleRange.end + 1);

  return (
    <div className={styles.playlistVirtualCanvas} style={{ height: `${totalHeight}px` }}>
      {visibleTracks.map((track, i) => {
        const globalIndex = visibleRange.start + i;
        const isFirstRow = globalIndex === 0;

        return (
          <div
            key={track.track.id}
            ref={isFirstRow ? firstRowRef : null}
            className={styles.playlistVirtualRow}
            style={{
              transform: `translateY(${globalIndex * rowStride}px)`,
            }}
          >
            <PlaylistTrackCard
              track={track.track}
              displayIndex={globalIndex + 1}
              collectionLabel={track.collectionLabel}
              durationLabel={track.durationLabel}
              moodTag={track.moodTag}
              isPlayable={track.isPlayable}
              isSharedTrack={track.track.id === sharedTrackId}
              hasCoverError={Boolean(failedCoverIds[track.track.id])}
              onCoverError={onCoverError}
              onSelectTrack={onSelectTrack}
              onShareTrack={onShareTrack}
            />
          </div>
        );
      })}
    </div>
  );
}
