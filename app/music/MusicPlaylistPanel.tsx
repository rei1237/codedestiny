"use client";

import { ChevronDown, Moon, Search, Share2, Sparkles } from "lucide-react";
import {
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ArtistKey, Track } from "./_data/musicManifest";
import styles from "./moon-music-player.module.css";

type PlaylistTab = "all" | ArtistKey;

type MusicPlaylistPanelProps = {
  tracks: readonly Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  failedCoverIds: Record<string, boolean>;
  onActiveTabChange?: (tabKey: PlaylistTab) => void;
  onCoverError: (trackId: string) => void;
  onSelectTrack: (trackId: string) => void;
};

const PLAYLIST_TABS: Array<{ key: PlaylistTab; label: string }> = [
  { key: "yeoni", label: "Yeoni" },
  { key: "neo", label: "Neo" },
  { key: "dest1nova", label: "DEST1NOVA" },
  { key: "lunabloom", label: "Luna Bloom" },
  { key: "all", label: "All" },
];

const PLAYLIST_OVERSCAN_COUNT = 8;
const PLAYLIST_DEFAULT_ROW_STRIDE = 92;
type PlaylistTrackEntry = {
  track: Track;
  searchableText: string;
  collectionLabel: string;
  durationLabel: string;
  isPlayable: boolean;
};
type PlaylistTrackDisplay = {
  track: Track;
  collectionLabel: string;
  durationLabel: string;
  isPlayable: boolean;
};

function formatDuration(seconds?: number) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return "";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function getTrackCollectionLabel(track: Track) {
  if (track.artistKey === "dest1nova") return "DEST1NOVA";
  if (track.artistKey === "lunabloom") return "Luna Bloom";
  if (track.audioKey.startsWith("neosongmini1/") || track.audioKey.startsWith("yeonisongmini1/")) return "Mini Album";
  return "Moon Cut";
}

function buildShareUrl(path: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://code-destiny.com";
  return new URL(path, origin).toString();
}

function buildTrackShareUrl(trackId: string) {
  const url = new URL(buildShareUrl("/music"));
  url.searchParams.set("track", trackId);
  url.searchParams.set("from", "share");
  return url.toString();
}

async function copyShareText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

type PlaylistTrackItemProps = {
  track: Track;
  collectionLabel: string;
  durationLabel: string;
  isPlayable: boolean;
  isCurrentTrack: boolean;
  isCurrentTrackPlaying: boolean;
  isSharedTrack: boolean;
  hasCoverError: boolean;
  onCoverError: (trackId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onShareTrack: (trackId: string) => void;
};

const PlaylistTrackItem = memo(function PlaylistTrackItem({
  track,
  collectionLabel,
  durationLabel,
  isPlayable,
  isCurrentTrack,
  isCurrentTrackPlaying,
  isSharedTrack,
  hasCoverError,
  onCoverError,
  onSelectTrack,
  onShareTrack,
}: PlaylistTrackItemProps) {
  const isCurrent = isCurrentTrack;
  const coverUnavailable = !track.coverUrl || hasCoverError;
  const handleTrackSelect = useCallback(() => {
    onSelectTrack(track.id);
  }, [onSelectTrack, track.id]);
  const handleTrackCoverError = useCallback(() => {
    onCoverError(track.id);
  }, [onCoverError, track.id]);
  const handleTrackShare = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onShareTrack(track.id);
  }, [onShareTrack, track.id]);

  return (
    <div
      className={styles.playlistTrack}
      role="group"
      aria-current={isCurrent ? "true" : undefined}
      data-playlist-track="true"
      data-disabled={!isPlayable ? "true" : "false"}
      data-playing={isCurrentTrackPlaying ? "true" : "false"}
      data-artist={track.artistKey}
      data-collection={collectionLabel}
    >
      <button
        className={styles.playlistTrackButton}
        type="button"
        onClick={handleTrackSelect}
        disabled={!isPlayable}
      >
        <span className={styles.playlistThumb} data-fallback={coverUnavailable ? "true" : "false"}>
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt=""
              width={72}
              height={72}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              onError={handleTrackCoverError}
            />
          ) : null}
        </span>

        <span className={styles.playlistTrackText}>
          <span className={styles.playlistTrackTitle}>{track.title || "Untitled track"}</span>
          <span className={styles.playlistTrackSubline}>
            <span className={styles.playlistTrackArtist}>{track.artistName || "Unknown artist"}</span>
            <span className={styles.playlistTrackMood}>{collectionLabel}</span>
          </span>
        </span>

        <span className={styles.playlistTrackMeta}>
          {isCurrent ? (
            <span className={styles.equalizerIcon} aria-label={isCurrentTrackPlaying ? "Playing" : "Selected"}>
              <i />
              <i />
              <i />
            </span>
          ) : null}
          {durationLabel ? <span>{durationLabel}</span> : null}
          {isSharedTrack ? <span className={styles.playlistShareStatus}>Copied</span> : null}
        </span>
      </button>

      <button
        className={styles.playlistShareButton}
        type="button"
        onClick={handleTrackShare}
        aria-label={`Share ${track.title || "track"}`}
        data-shared={isSharedTrack ? "true" : "false"}
      >
        <Share2 size={16} aria-hidden />
      </button>
    </div>
  );
});

type PlaylistTabButtonProps = {
  tab: (typeof PLAYLIST_TABS)[number];
  isActive: boolean;
  count: number;
  onSelectTab: (tabKey: PlaylistTab) => void;
};

const PlaylistTabButton = memo(function PlaylistTabButton({
  tab,
  isActive,
  count,
  onSelectTab,
}: PlaylistTabButtonProps) {
  const handleClick = useCallback(() => {
    onSelectTab(tab.key);
  }, [onSelectTab, tab.key]);

  return (
    <button
      className={styles.playlistTab}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={handleClick}
    >
      <span>{tab.label}</span>
      <span className={styles.playlistTabCount}>{count}</span>
    </button>
  );
});

const MusicPlaylistPanel = memo(function MusicPlaylistPanel({
  tracks,
  currentTrackId,
  isPlaying,
  failedCoverIds,
  onActiveTabChange,
  onCoverError,
  onSelectTrack,
}: MusicPlaylistPanelProps) {
  const [activeTab, setActiveTab] = useState<PlaylistTab>("all");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sharedTrackId, setSharedTrackId] = useState("");
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const [virtualViewportHeight, setVirtualViewportHeight] = useState(516);
  const [virtualRowStride, setVirtualRowStride] = useState(PLAYLIST_DEFAULT_ROW_STRIDE);
  const sharedTrackResetTimerRef = useRef<number | null>(null);
  const playlistScrollRef = useRef<HTMLDivElement | null>(null);
  const virtualScrollRafRef = useRef<number | null>(null);
  const normalizedQuery = normalizeSearchText(query);
  const deferredQuery = useDeferredValue(normalizedQuery);
  const [, startSearchTransition] = useTransition();

  const playlistCounts = useMemo(() => {
    const baseCounts = {
      all: tracks.length,
      neo: 0,
      yeoni: 0,
      dest1nova: 0,
      lunabloom: 0,
    } as Record<PlaylistTab, number>;

    tracks.forEach((track) => {
      if (track.artistKey === "neo") baseCounts.neo += 1;
      else if (track.artistKey === "yeoni") baseCounts.yeoni += 1;
      else if (track.artistKey === "dest1nova") baseCounts.dest1nova += 1;
      else if (track.artistKey === "lunabloom") baseCounts.lunabloom += 1;
    });

    return baseCounts;
  }, [tracks]);

  const searchableTracks = useMemo<PlaylistTrackEntry[]>(() => {
    return tracks.map((track) => ({
      track,
      searchableText: `${track.title} ${track.artistName} ${track.mood || ""} ${track.audioKey}`.toLowerCase(),
      collectionLabel: getTrackCollectionLabel(track),
      durationLabel: formatDuration(track.durationSeconds),
      isPlayable: Boolean(track.audioUrl),
    }));
  }, [tracks]);

  const filteredTracks = useMemo<PlaylistTrackDisplay[]>(() => {
    return searchableTracks
      .filter((entry) => {
        const track = entry.track;
        if (!track || !track.id) return false;
        if (activeTab !== "all" && track.artistKey !== activeTab) return false;
        if (!deferredQuery) return true;

        return entry.searchableText.includes(deferredQuery);
      })
      .map((entry) => ({
        track: entry.track,
        collectionLabel: entry.collectionLabel,
        durationLabel: entry.durationLabel,
        isPlayable: entry.isPlayable,
      }));
  }, [activeTab, deferredQuery, searchableTracks]);

  const virtualWindow = useMemo(() => {
    if (!filteredTracks.length) {
      return {
        startIndex: 0,
        endIndex: 0,
        paddingTop: 0,
        paddingBottom: 0,
        tracks: [] as PlaylistTrackDisplay[],
      };
    }

    const rowStride = Math.max(1, virtualRowStride);
    const viewportHeight = Math.max(1, virtualViewportHeight);
    const startIndex = Math.max(0, Math.floor(virtualScrollTop / rowStride) - PLAYLIST_OVERSCAN_COUNT);
    const visibleCount = Math.ceil(viewportHeight / rowStride) + PLAYLIST_OVERSCAN_COUNT * 2;
    const endIndex = Math.min(filteredTracks.length, startIndex + visibleCount);

    return {
      startIndex,
      endIndex,
      paddingTop: startIndex * rowStride,
      paddingBottom: Math.max(0, (filteredTracks.length - endIndex) * rowStride),
      tracks: filteredTracks.slice(startIndex, endIndex),
    };
  }, [filteredTracks, virtualRowStride, virtualScrollTop, virtualViewportHeight]);

  const handleTrackSelect = useCallback((trackId: string) => {
    onSelectTrack(trackId);
  }, [onSelectTrack]);

  const handleTrackCoverError = useCallback((trackId: string) => {
    onCoverError(trackId);
  }, [onCoverError]);

  const handleTabSelect = useCallback((tabKey: PlaylistTab) => {
    setActiveTab(tabKey);
    onActiveTabChange?.(tabKey);
  }, [onActiveTabChange]);

  const trackById = useMemo(() => {
    const map = new Map<string, Track>();
    tracks.forEach((track) => {
      map.set(track.id, track);
    });
    return map;
  }, [tracks]);

  const clearSharedTrackResetTimer = useCallback(() => {
    if (sharedTrackResetTimerRef.current !== null) {
      window.clearTimeout(sharedTrackResetTimerRef.current);
      sharedTrackResetTimerRef.current = null;
    }
  }, []);

  const handleTrackShare = useCallback((trackId: string) => {
    const track = trackById.get(trackId);
    if (!track) return;

    const trackTitle = track.title || "Untitled track";
    const artistName = track.artistName || "Code Destiny";
    const trackUrl = buildTrackShareUrl(track.id);
    const mainUrl = buildShareUrl("/");
    const text = [
      `${artistName} - ${trackTitle}`,
      "Listen inside the Code Destiny moon library.",
      `Code Destiny main: ${mainUrl}`,
    ].join("\n");
    const copiedText = `${text}\n${trackUrl}`;

    void (async () => {
      try {
        if (navigator.share) {
          await navigator.share({
            title: `Code Destiny Music - ${trackTitle}`,
            text,
            url: trackUrl,
          });
        } else {
          await copyShareText(copiedText);
        }

        setSharedTrackId(track.id);
        clearSharedTrackResetTimer();
        sharedTrackResetTimerRef.current = window.setTimeout(() => {
          setSharedTrackId((current) => current === track.id ? "" : current);
        }, 1800);
      } catch {
      }
    })();
  }, [clearSharedTrackResetTimer, trackById]);

  useEffect(() => {
    startSearchTransition(() => {
      setVirtualScrollTop(0);
    });
    if (playlistScrollRef.current) {
      playlistScrollRef.current.scrollTop = 0;
    }
  }, [activeTab, deferredQuery, tracks, startSearchTransition]);

  useEffect(() => {
    return () => {
      clearSharedTrackResetTimer();
      if (virtualScrollRafRef.current !== null) {
        window.cancelAnimationFrame(virtualScrollRafRef.current);
        virtualScrollRafRef.current = null;
      }
    };
  }, [clearSharedTrackResetTimer]);

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.currentTarget.value);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      startSearchTransition(() => {
        setQuery(normalizeSearchText(searchInput));
      });
    }, 130);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [searchInput, startSearchTransition]);

  const syncVirtualMetrics = useCallback(() => {
    const listElement = playlistScrollRef.current;
    if (!listElement) return;

    const firstTrack = listElement.querySelector<HTMLElement>("[data-playlist-track='true']");
    const listStyle = window.getComputedStyle(listElement);
    const gap = Number.parseFloat(listStyle.rowGap || listStyle.gap || "0") || 0;
    const fallbackStride = window.matchMedia("(max-width: 640px)").matches
      ? 84
      : window.matchMedia("(max-width: 1119px)").matches
        ? 100
        : PLAYLIST_DEFAULT_ROW_STRIDE;
    const nextRowStride = Math.max(1, (firstTrack?.offsetHeight || fallbackStride) + gap);
    const nextViewportHeight = listElement.clientHeight || 516;

    setVirtualViewportHeight((current) => Math.abs(current - nextViewportHeight) > 1 ? nextViewportHeight : current);
    setVirtualRowStride((current) => Math.abs(current - nextRowStride) > 1 ? nextRowStride : current);
  }, []);

  const handlePlaylistScroll = useCallback(() => {
    const listElement = playlistScrollRef.current;
    if (!listElement || virtualScrollRafRef.current !== null) return;

    virtualScrollRafRef.current = window.requestAnimationFrame(() => {
      virtualScrollRafRef.current = null;
      const currentListElement = playlistScrollRef.current;
      if (!currentListElement) return;

      setVirtualScrollTop(currentListElement.scrollTop);
      setVirtualViewportHeight(currentListElement.clientHeight || 516);
    });
  }, []);

  useEffect(() => {
    syncVirtualMetrics();
  }, [syncVirtualMetrics, virtualWindow.tracks.length, activeTab, deferredQuery]);

  useEffect(() => {
    const listElement = playlistScrollRef.current;
    if (!listElement || typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(syncVirtualMetrics);
    resizeObserver.observe(listElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [syncVirtualMetrics]);

  return (
    <aside className={styles.playlistPanel} data-playlist-mode={activeTab} aria-label="Music playlist">
      <details className={styles.playlistDetails} open>
        <summary className={styles.playlistHeaderButton}>
          <span className={styles.playlistHeaderText}>
            <span className={styles.playlistKicker}>
              <Moon size={13} aria-hidden />
              Moon Library
            </span>
            <span className={styles.playlistTitle}>Lunar Playlist</span>
            <span className={styles.playlistSubtitle}>{filteredTracks.length} of {tracks.length} tracks</span>
          </span>
          <span className={styles.playlistHeaderMeta}>
            <Sparkles className={styles.playlistHeaderIcon} size={18} aria-hidden />
            <span className={styles.playlistCount}>{filteredTracks.length}</span>
            <ChevronDown className={styles.playlistToggleIcon} size={18} aria-hidden />
          </span>
        </summary>

        <div className={styles.playlistBody}>
          <div className={styles.playlistTabs} role="tablist" aria-label="Filter playlist">
            {PLAYLIST_TABS.map((tab) => (
              <PlaylistTabButton
                key={tab.key}
                tab={tab}
                isActive={activeTab === tab.key}
                count={playlistCounts[tab.key]}
                onSelectTab={handleTabSelect}
              />
            ))}
          </div>

          <label className={styles.playlistSearch}>
            <Search size={16} aria-hidden />
            <input
              type="search"
              value={searchInput}
              placeholder="Search tracks"
              onChange={handleQueryChange}
            />
          </label>

          <div className={styles.playlistScroll} ref={playlistScrollRef} onScroll={handlePlaylistScroll}>
            {filteredTracks.length ? (
              <>
                {virtualWindow.paddingTop ? (
                  <div className={styles.playlistVirtualSpacer} style={{ height: virtualWindow.paddingTop }} aria-hidden />
                ) : null}
                {virtualWindow.tracks.map((track) => (
                  <PlaylistTrackItem
                    key={track.track.id}
                    track={track.track}
                    collectionLabel={track.collectionLabel}
                    durationLabel={track.durationLabel}
                    isPlayable={track.isPlayable}
                    isCurrentTrack={track.track.id === currentTrackId}
                    isCurrentTrackPlaying={track.track.id === currentTrackId && isPlaying}
                    isSharedTrack={track.track.id === sharedTrackId}
                    hasCoverError={Boolean(failedCoverIds[track.track.id])}
                    onCoverError={handleTrackCoverError}
                    onSelectTrack={handleTrackSelect}
                    onShareTrack={handleTrackShare}
                  />
                ))}
                {virtualWindow.paddingBottom ? (
                  <div className={styles.playlistVirtualSpacer} style={{ height: virtualWindow.paddingBottom }} aria-hidden />
                ) : null}
              </>
            ) : (
              <div className={styles.playlistEmpty}>
                <strong>No tracks found</strong>
                <span>Try All or clear the search.</span>
              </div>
            )}
          </div>
        </div>
      </details>
    </aside>
  );
});

export default MusicPlaylistPanel;

