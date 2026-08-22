"use client";

import Image from "next/image";
import { Lock, Moon, Play, Search, Share2, Sparkles } from "lucide-react";
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
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import type { ArtistKey, Track } from "./_data/musicManifest";
import { useMusicPlaybackStore } from "./_stores/useMusicPlaybackStore";
import { useIsMobileViewport } from "./_hooks/useIsMobileViewport";
import styles from "./moon-music-player.module.css";

type VisibleArtistKey = Exclude<ArtistKey, "destinycafe">;
type PlaylistTab = "all" | VisibleArtistKey;

type MusicPlaylistPanelProps = {
  tracks: readonly Track[];
  failedCoverIds: Record<string, boolean>;
  onActiveTabChange?: (tabKey: PlaylistTab) => void;
  onCoverError: (trackId: string) => void;
  onSelectTrack: (trackId: string) => void;
};

const PLAYLIST_TAB_LABELS: Array<{ key: PlaylistTab; label: string }> = [
  { key: "neo", label: "NEO" },
  { key: "yeoni", label: "YEONI" },
  { key: "dest1nova", label: "DEST1NOVA" },
  { key: "lunabloom", label: "LUNA BLOOM" },
  { key: "meditation", label: "MEDITATION" },
  { key: "all", label: "ALL" },
];

const INITIAL_VISIBLE_TRACKS = 10;
const TRACK_RENDER_BATCH_SIZE = 10;

const MUSIC_PLAYLIST_TEXT_TRANSLATIONS = {
  ko: {
    playlistAria: "음악 플레이리스트",
    kicker: "Moon Library",
    title: "달빛 음악 서고",
    tracksCount: (shown: number, total: number) => `${shown} / ${total}곡`,
    filterAria: "플레이리스트 필터",
    searchPlaceholder: "트랙 검색",
    emptyTitle: "이 달빛에는 아직 곡이 머물지 않습니다.",
    emptyBody: "다른 무드나 검색어로 다시 열어보세요.",
    shareLead: "Code Destiny 달빛 음악 라이브러리에서 들어보세요.",
    mainLabel: "Code Destiny 메인",
    playTrack: (title: string) => `${title} 재생`,
    nowPlaying: "Now Playing",
    showMore: (count: number) => `${count}곡 더 보기`,
  },
  en: {
    playlistAria: "Music playlist",
    kicker: "Moon Library",
    title: "Lunar Playlist",
    tracksCount: (shown: number, total: number) => `${shown} of ${total} tracks`,
    filterAria: "Filter playlist",
    searchPlaceholder: "Search tracks",
    emptyTitle: "No tracks found",
    emptyBody: "Try All or clear the search.",
    shareLead: "Listen inside the Code Destiny moon library.",
    mainLabel: "Code Destiny main",
    playTrack: (title: string) => `Play ${title}`,
    nowPlaying: "Now Playing",
    showMore: (count: number) => `Show ${count} more`,
  },
  ja: {
    playlistAria: "音楽プレイリスト",
    kicker: "Moon Library",
    title: "Lunar Playlist",
    tracksCount: (shown: number, total: number) => `${shown} / ${total}曲`,
    filterAria: "プレイリストを絞り込む",
    searchPlaceholder: "曲を検索",
    emptyTitle: "曲が見つかりません",
    emptyBody: "Allを選ぶか、検索語を消してください。",
    shareLead: "Code Destinyの月明かり音楽ライブラリで聴いてください。",
    mainLabel: "Code Destinyメイン",
    playTrack: (title: string) => `${title}を再生`,
    nowPlaying: "Now Playing",
    showMore: (count: number) => `さらに${count}曲`,
  },
  "zh-CN": {
    playlistAria: "音乐播放列表",
    kicker: "Moon Library",
    title: "月光歌单",
    tracksCount: (shown: number, total: number) => `${shown} / ${total} 首`,
    filterAria: "筛选播放列表",
    searchPlaceholder: "搜索曲目",
    emptyTitle: "未找到曲目",
    emptyBody: "请选择全部或清除搜索词。",
    shareLead: "在 Code Destiny 月光音乐库中收听。",
    mainLabel: "Code Destiny 首页",
    playTrack: (title: string) => `播放 ${title}`,
    nowPlaying: "正在播放",
    showMore: (count: number) => `再显示 ${count} 首`,
  },
  "zh-TW": {
    playlistAria: "音樂播放清單",
    kicker: "Moon Library",
    title: "月光歌單",
    tracksCount: (shown: number, total: number) => `${shown} / ${total} 首`,
    filterAria: "篩選播放清單",
    searchPlaceholder: "搜尋曲目",
    emptyTitle: "未找到曲目",
    emptyBody: "請選擇全部或清除搜尋字詞。",
    shareLead: "在 Code Destiny 月光音樂庫中收聽。",
    mainLabel: "Code Destiny 首頁",
    playTrack: (title: string) => `播放 ${title}`,
    nowPlaying: "正在播放",
    showMore: (count: number) => `再顯示 ${count} 首`,
  },
} as const;

const PLAYLIST_COVER_BLUR_DATA_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%230a0718'/%3E%3Ccircle cx='15' cy='9' r='7' fill='%239b7fd4' fill-opacity='.32'/%3E%3Ccircle cx='12' cy='11' r='7' fill='%23d4af7a' fill-opacity='.2'/%3E%3C/svg%3E";
const DEST1NOVA_SECOND_ALBUM_MARKER = /DEST1NOVA\/DEST1NOVA\s*2/;

function musicPlaylistCopy(locale: LoadingLocale) {
  return MUSIC_PLAYLIST_TEXT_TRANSLATIONS[locale as keyof typeof MUSIC_PLAYLIST_TEXT_TRANSLATIONS] || MUSIC_PLAYLIST_TEXT_TRANSLATIONS.en;
}

type PlaylistTrackEntry = {
  track: Track;
  searchableText: string;
  collectionLabel: string;
  durationLabel: string;
  moodTag: string;
  isPlayable: boolean;
};
type PlaylistTrackDisplay = {
  track: Track;
  collectionLabel: string;
  durationLabel: string;
  moodTag: string;
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
  if (track.artistKey === "destinycafe") return "Yeoni's destiny cafe";
  if (track.artistKey === "dest1nova") return "DEST1NOVA";
  if (track.artistKey === "lunabloom") return "Luna Bloom";
  if (track.artistKey === "meditation") return "Meditation";
  if (track.audioKey.startsWith("neosongmini1/") || track.audioKey.startsWith("yeonisongmini1/")) return "Mini Album";
  return "Moon Cut";
}

function getTrackMoodTag(track: Track) {
  if (track.artistKey === "neo") return "neon tarot";
  if (track.artistKey === "yeoni") return "soft bloom";
  if (track.artistKey === "destinycafe") return "moon tea";
  if (track.artistKey === "dest1nova") return DEST1NOVA_SECOND_ALBUM_MARKER.test(track.audioKey) ? "starlight rush" : "cosmic pop";
  if (track.artistKey === "lunabloom") return "lucid dream";
  if (track.artistKey === "meditation") return "calm meditation";
  return "moon pop";
}

function doesTrackMatchTab(track: Track, tab: PlaylistTab) {
  if (tab === "all") return true;
  if (tab === "yeoni") return track.artistKey === "yeoni" || track.artistKey === "destinycafe";
  return track.artistKey === tab;
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

type PlaylistTrackCardProps = {
  track: Track;
  displayIndex: number;
  collectionLabel: string;
  durationLabel: string;
  moodTag: string;
  isPlayable: boolean;
  isSharedTrack: boolean;
  hasCoverError: boolean;
  onCoverError: (trackId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onShareTrack: (trackId: string) => void;
};

const PlaylistTrackCard = memo(function PlaylistTrackCard({
  track,
  displayIndex,
  collectionLabel,
  durationLabel,
  moodTag,
  isPlayable,
  isSharedTrack,
  hasCoverError,
  onCoverError,
  onSelectTrack,
  onShareTrack,
}: PlaylistTrackCardProps) {
  const isCurrent = useMusicPlaybackStore(useCallback((state) => state.currentTrackId === track.id, [track.id]));
  const isCurrentTrackPlaying = useMusicPlaybackStore(
    useCallback((state) => state.currentTrackId === track.id && state.isPlaying, [track.id]),
  );
  const coverUnavailable = !track.coverUrl || hasCoverError;
  const isLockedPreview = track.accessTier === "locked_preview";
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
        aria-label={musicPlaylistCopy(getCurrentLoadingLocale()).playTrack(track.title || "Untitled track")}
      >
        <span className={styles.playlistTrackIndex} aria-hidden={!isCurrent}>
          {isCurrent ? (
            <span className={styles.equalizerIcon} aria-label={isCurrentTrackPlaying ? "Playing" : "Selected"}>
              <i />
              <i />
              <i />
            </span>
          ) : (
            <span>{displayIndex}</span>
          )}
        </span>
        <span className={styles.playlistThumb} data-fallback={coverUnavailable ? "true" : "false"}>
          {track.coverUrl ? (
            <Image
              src={track.coverUrl}
              alt=""
              width={72}
              height={72}
              sizes="72px"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              placeholder="blur"
              blurDataURL={PLAYLIST_COVER_BLUR_DATA_URL}
              unoptimized
              onError={handleTrackCoverError}
            />
          ) : null}
          <span className={styles.playlistThumbGlyph} aria-hidden />
        </span>

        <span className={styles.playlistTrackText}>
          <span className={styles.playlistTrackTitle}>{track.title || "Untitled track"}</span>
          <span className={styles.playlistTrackSubline}>
            <span className={styles.playlistTrackArtist}>{track.artistName || "Unknown artist"}</span>
            <span className={styles.playlistTrackMood}>{collectionLabel}</span>
          </span>
          <span className={styles.playlistMoodTag}>{moodTag}</span>
          <span className={styles.playlistAccessBadge} data-access={isLockedPreview ? "preview" : "full"}>
            {isLockedPreview ? (
              <>
                <Lock size={12} aria-hidden />
                <span>40 sec preview</span>
              </>
            ) : (
              <span>Full track</span>
            )}
          </span>
        </span>

        <span className={styles.playlistTrackMeta}>
          <span>{durationLabel || `#${String(displayIndex).padStart(2, "0")}`}</span>
          {isCurrent ? <span className={styles.playlistCurrentLabel}>Now Playing</span> : null}
          {isSharedTrack ? <span className={styles.playlistShareStatus}>Copied</span> : null}
        </span>
        <span className={styles.playlistPlayIcon} aria-hidden>
          <Play size={16} />
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
}, (prev, next) => {
  return (
    prev.track.id === next.track.id
    && prev.track.title === next.track.title
    && prev.track.artistKey === next.track.artistKey
    && prev.track.artistName === next.track.artistName
    && prev.track.coverUrl === next.track.coverUrl
    && prev.track.accessTier === next.track.accessTier
    && prev.displayIndex === next.displayIndex
    && prev.collectionLabel === next.collectionLabel
    && prev.durationLabel === next.durationLabel
    && prev.moodTag === next.moodTag
    && prev.isPlayable === next.isPlayable
    && prev.isSharedTrack === next.isSharedTrack
    && prev.hasCoverError === next.hasCoverError
    && prev.onCoverError === next.onCoverError
    && prev.onSelectTrack === next.onSelectTrack
    && prev.onShareTrack === next.onShareTrack
  );
});

type PlaylistTabButtonProps = {
  tab: (typeof PLAYLIST_TAB_LABELS)[number];
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
      data-tab={tab.key}
      onClick={handleClick}
    >
      <span>{tab.label}</span>
      <span className={styles.playlistTabCount}>{count}</span>
    </button>
  );
});

const MusicPlaylistPanel = memo(function MusicPlaylistPanel({
  tracks,
  failedCoverIds,
  onActiveTabChange,
  onCoverError,
  onSelectTrack,
}: MusicPlaylistPanelProps) {
  const [activeTab, setActiveTab] = useState<PlaylistTab>("all");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sharedTrackId, setSharedTrackId] = useState("");
  const [visibleTrackCount, setVisibleTrackCount] = useState(INITIAL_VISIBLE_TRACKS);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const isMobile = useIsMobileViewport(980);
  const copy = musicPlaylistCopy(locale);
  const sharedTrackResetTimerRef = useRef<number | null>(null);
  const playlistScrollRef = useRef<HTMLDivElement | null>(null);
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
      meditation: 0,
    } as Record<PlaylistTab, number>;

    tracks.forEach((track) => {
      if (track.artistKey === "neo") baseCounts.neo += 1;
      else if (track.artistKey === "yeoni" || track.artistKey === "destinycafe") baseCounts.yeoni += 1;
      else if (track.artistKey === "dest1nova") baseCounts.dest1nova += 1;
      else if (track.artistKey === "lunabloom") baseCounts.lunabloom += 1;
      else if (track.artistKey === "meditation") baseCounts.meditation += 1;
    });

    return baseCounts;
  }, [tracks]);

  const searchableTracks = useMemo<PlaylistTrackEntry[]>(() => {
    return tracks.map((track) => ({
      track,
      searchableText: `${track.title} ${track.artistName} ${track.mood || ""} ${track.audioKey}`.toLowerCase(),
      collectionLabel: getTrackCollectionLabel(track),
      durationLabel: formatDuration(track.durationSeconds),
      moodTag: getTrackMoodTag(track),
      isPlayable: Boolean(track.audioUrl),
    }));
  }, [tracks]);

  const filteredTracks = useMemo<PlaylistTrackDisplay[]>(() => {
    return searchableTracks
      .filter((entry) => {
        const track = entry.track;
        if (!track || !track.id) return false;
        if (!doesTrackMatchTab(track, activeTab)) return false;
        if (!deferredQuery) return true;

        return entry.searchableText.includes(deferredQuery);
      })
      .map((entry) => ({
        track: entry.track,
        collectionLabel: entry.collectionLabel,
        durationLabel: entry.durationLabel,
        moodTag: entry.moodTag,
        isPlayable: entry.isPlayable,
      }));
  }, [activeTab, deferredQuery, searchableTracks]);

  const handleTrackSelect = useCallback((trackId: string) => {
    onSelectTrack(trackId);
  }, [onSelectTrack]);

  const visibleTracks = useMemo(() => {
    const limit = isMobile ? Math.max(visibleTrackCount, 30) : visibleTrackCount;
    return filteredTracks.slice(0, limit);
  }, [filteredTracks, visibleTrackCount, isMobile]);

  const remainingTrackCount = Math.max(0, filteredTracks.length - visibleTracks.length);
  const nextVisibleTrackCount = Math.min(TRACK_RENDER_BATCH_SIZE, remainingTrackCount);

  const handleShowMoreTracks = useCallback(() => {
    setVisibleTrackCount((current) => Math.min(current + TRACK_RENDER_BATCH_SIZE, filteredTracks.length));
  }, [filteredTracks.length]);

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
      copy.shareLead,
      `${copy.mainLabel}: ${mainUrl}`,
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
  }, [clearSharedTrackResetTimer, copy.mainLabel, copy.shareLead, trackById]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  useEffect(() => {
    if (playlistScrollRef.current) {
      playlistScrollRef.current.scrollTop = 0;
    }
    if (!isMobile) {
      setVisibleTrackCount(INITIAL_VISIBLE_TRACKS);
    }
  }, [activeTab, deferredQuery, tracks, isMobile]);

  useEffect(() => {
    return () => {
      clearSharedTrackResetTimer();
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

  return (
    <aside className={styles.playlistPanel} data-playlist-mode={activeTab} aria-label={copy.playlistAria}>
      <div className={styles.playlistHeaderButton}>
        <span className={styles.playlistHeaderText}>
          <span className={styles.playlistKicker}>
            <Moon size={13} aria-hidden />
            {copy.kicker}
          </span>
          <span className={styles.playlistTitle}>{copy.title}</span>
          <span className={styles.playlistSubtitle}>
            {copy.tracksCount(isMobile ? filteredTracks.length : visibleTracks.length, tracks.length)}
          </span>
        </span>
        <span className={styles.playlistHeaderMeta}>
          <Sparkles className={styles.playlistHeaderIcon} size={18} aria-hidden />
          <span className={styles.playlistCount}>{filteredTracks.length}</span>
        </span>
      </div>

      <div className={styles.playlistBody}>
        <div className={styles.playlistTabs} role="tablist" aria-label={copy.filterAria} data-mood-filter-nav="true">
          {PLAYLIST_TAB_LABELS.map((tab) => (
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
            placeholder={copy.searchPlaceholder}
            onChange={handleQueryChange}
          />
        </label>

        <div className={styles.playlistScroll} ref={playlistScrollRef}>
          {filteredTracks.length ? (
            <div className={styles.playlistGrid}>
              {visibleTracks.map((track, index) => (
                <PlaylistTrackCard
                  key={track.track.id}
                  track={track.track}
                  displayIndex={index + 1}
                  collectionLabel={track.collectionLabel}
                  durationLabel={track.durationLabel}
                  moodTag={track.moodTag}
                  isPlayable={track.isPlayable}
                  isSharedTrack={track.track.id === sharedTrackId}
                  hasCoverError={Boolean(failedCoverIds[track.track.id])}
                  onCoverError={handleTrackCoverError}
                  onSelectTrack={handleTrackSelect}
                  onShareTrack={handleTrackShare}
                />
              ))}
              {remainingTrackCount > 0 ? (
                <button
                  className={styles.playlistMoreButton}
                  type="button"
                  onClick={handleShowMoreTracks}
                >
                  {copy.showMore(nextVisibleTrackCount)}
                </button>
              ) : null}
            </div>
          ) : (
            <div className={styles.playlistEmpty}>
              <strong>{copy.emptyTitle}</strong>
              <span>{copy.emptyBody}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});

export default MusicPlaylistPanel;

