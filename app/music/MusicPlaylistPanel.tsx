"use client";

import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ArtistKey, Track } from "./_data/musicManifest";
import styles from "./moon-music-player.module.css";

type PlaylistTab = "all" | ArtistKey;

type MusicPlaylistPanelProps = {
  tracks: readonly Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  failedCoverIds: Record<string, boolean>;
  onCoverError: (trackId: string) => void;
  onSelectTrack: (trackId: string) => void;
};

const PLAYLIST_TABS: Array<{ key: PlaylistTab; label: string }> = [
  { key: "yeoni", label: "Yeoni" },
  { key: "neo", label: "Neo" },
  { key: "all", label: "All" },
];

function formatDuration(seconds?: number) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return "";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

export default function MusicPlaylistPanel({
  tracks,
  currentTrackId,
  isPlaying,
  failedCoverIds,
  onCoverError,
  onSelectTrack,
}: MusicPlaylistPanelProps) {
  const [activeTab, setActiveTab] = useState<PlaylistTab>("yeoni");
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearchText(query);

  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      if (!track || !track.id) return false;
      if (activeTab !== "all" && track.artistKey !== activeTab) return false;
      if (!normalizedQuery) return true;

      return `${track.title} ${track.artistName} ${track.mood || ""}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeTab, normalizedQuery, tracks]);

  return (
    <aside className={styles.playlistPanel} aria-label="Music playlist">
      <details className={styles.playlistDetails} open>
        <summary className={styles.playlistHeaderButton}>
          <span className={styles.playlistHeaderText}>
            <span className={styles.playlistKicker}>Moon Library</span>
            <span className={styles.playlistTitle}>Playlist</span>
          </span>
          <span className={styles.playlistHeaderMeta}>
            <span className={styles.playlistCount}>{filteredTracks.length}</span>
            <ChevronDown className={styles.playlistToggleIcon} size={18} aria-hidden />
          </span>
        </summary>

        <div className={styles.playlistBody}>
          <div className={styles.playlistTabs} role="tablist" aria-label="Filter playlist by artist">
            {PLAYLIST_TABS.map((tab) => (
              <button
                key={tab.key}
                className={styles.playlistTab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className={styles.playlistSearch}>
            <Search size={16} aria-hidden />
            <input
              type="search"
              value={query}
              placeholder="Search tracks"
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>

          <div className={styles.playlistScroll}>
            {filteredTracks.length ? (
              filteredTracks.map((track) => {
                const isCurrent = track.id === currentTrackId;
                const coverUnavailable = !track.coverUrl || Boolean(failedCoverIds[track.id]);
                const durationLabel = formatDuration(track.durationSeconds);
                const isPlayable = Boolean(track.audioUrl);

                return (
                  <button
                    key={track.id}
                    className={styles.playlistTrack}
                    type="button"
                    onClick={() => onSelectTrack(track.id)}
                    aria-current={isCurrent ? "true" : undefined}
                    disabled={!isPlayable}
                    data-playing={isCurrent && isPlaying ? "true" : "false"}
                  >
                    <span className={styles.playlistThumb} data-fallback={coverUnavailable ? "true" : "false"}>
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={() => onCoverError(track.id)}
                        />
                      ) : null}
                    </span>

                    <span className={styles.playlistTrackText}>
                      <span className={styles.playlistTrackTitle}>{track.title || "Untitled track"}</span>
                      <span className={styles.playlistTrackArtist}>{track.artistName || "Unknown artist"}</span>
                    </span>

                    <span className={styles.playlistTrackMeta}>
                      {isCurrent ? (
                        <span className={styles.equalizerIcon} aria-label={isPlaying ? "Playing" : "Selected"}>
                          <i />
                          <i />
                          <i />
                        </span>
                      ) : null}
                      {durationLabel ? <span>{durationLabel}</span> : null}
                    </span>
                  </button>
                );
              })
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
}
