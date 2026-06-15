"use client";

import { ChevronDown, Moon, Search, Share2, Sparkles } from "lucide-react";
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
  { key: "dest1nova", label: "DEST1NOVA" },
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

function getTrackCollectionLabel(track: Track) {
  if (track.artistKey === "dest1nova") return "DEST1NOVA";
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

export default function MusicPlaylistPanel({
  tracks,
  currentTrackId,
  isPlaying,
  failedCoverIds,
  onCoverError,
  onSelectTrack,
}: MusicPlaylistPanelProps) {
  const [activeTab, setActiveTab] = useState<PlaylistTab>("all");
  const [query, setQuery] = useState("");
  const [sharedTrackId, setSharedTrackId] = useState("");
  const normalizedQuery = normalizeSearchText(query);
  const playlistCounts = useMemo(() => {
    return PLAYLIST_TABS.reduce<Record<PlaylistTab, number>>((counts, tab) => {
      counts[tab.key] = tab.key === "all"
        ? tracks.length
        : tracks.filter((track) => track.artistKey === tab.key).length;
      return counts;
    }, { all: 0, neo: 0, yeoni: 0, dest1nova: 0 });
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      if (!track || !track.id) return false;
      if (activeTab !== "all" && track.artistKey !== activeTab) return false;
      if (!normalizedQuery) return true;

      return `${track.title} ${track.artistName} ${track.mood || ""} ${track.audioKey}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeTab, normalizedQuery, tracks]);

  async function handleShareTrack(track: Track) {
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
      window.setTimeout(() => {
        setSharedTrackId((current) => current === track.id ? "" : current);
      }, 1800);
    } catch {
    }
  }

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
              <button
                key={tab.key}
                className={styles.playlistTab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                <span className={styles.playlistTabCount}>{playlistCounts[tab.key]}</span>
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
                const collectionLabel = getTrackCollectionLabel(track);

                return (
                  <div
                    key={track.id}
                    className={styles.playlistTrack}
                    role="group"
                    aria-current={isCurrent ? "true" : undefined}
                    data-disabled={!isPlayable ? "true" : "false"}
                    data-playing={isCurrent && isPlaying ? "true" : "false"}
                    data-artist={track.artistKey}
                    data-collection={collectionLabel}
                  >
                    <button
                      className={styles.playlistTrackButton}
                      type="button"
                      onClick={() => onSelectTrack(track.id)}
                      disabled={!isPlayable}
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
                        <span className={styles.playlistTrackSubline}>
                          <span className={styles.playlistTrackArtist}>{track.artistName || "Unknown artist"}</span>
                          <span className={styles.playlistTrackMood}>{collectionLabel}</span>
                        </span>
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
                        {sharedTrackId === track.id ? <span className={styles.playlistShareStatus}>Copied</span> : null}
                      </span>
                    </button>

                    <button
                      className={styles.playlistShareButton}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleShareTrack(track);
                      }}
                      aria-label={`Share ${track.title || "track"}`}
                      data-shared={sharedTrackId === track.id ? "true" : "false"}
                    >
                      <Share2 size={16} aria-hidden />
                    </button>
                  </div>
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
