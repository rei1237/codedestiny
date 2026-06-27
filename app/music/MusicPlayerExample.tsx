"use client";

import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,

  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { buildAssetsPublicUrl, buildMusicPublicUrl } from "@/lib/r2-public-url";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { allTracks, type ArtistKey, type Track } from "./_data/musicManifest";
import { useMusicPlayer, type RepeatMode } from "./_hooks/useMusicPlayer";
import { useMusicPlaybackStore } from "./_stores/useMusicPlaybackStore";
import MoonAlbumArtwork from "./MoonAlbumArtwork";
import MusicPlaylistPanel from "./MusicPlaylistPanel";
import styles from "./moon-music-player.module.css";

type MusicPlayerExampleProps = {
  ambientAssetKey?: string;
  presentation?: "full" | "compact";
};

type PlaylistThemeMode = "all" | ArtistKey;

type PlayerStyle = CSSProperties & {
  "--cover-image"?: string;
  "--asset-ambient-image"?: string;
  "--moon-banner-cover-fallback"?: string;
};
type AlbumImageMode = "default" | "human";

type HumanModeCoverMap = {
  yeoni: string;
  dest1novaVol1: string;
  dest1novaVol2: string;
};

const BANNER_STARS = [
  { cx: 14, cy: 18, r: 1.8, opacity: 0.32, duration: "3s", delay: "0s" },
  { cx: 28, cy: 27, r: 1.3, opacity: 0.26, duration: "4.5s", delay: "1.2s" },
  { cx: 46, cy: 22, r: 1.6, opacity: 0.4, duration: "5.2s", delay: "2.5s" },
  { cx: 66, cy: 35, r: 1.4, opacity: 0.18, duration: "3.8s", delay: "0.8s" },
  { cx: 81, cy: 16, r: 1.9, opacity: 0.25, duration: "6s", delay: "1.6s" },
  { cx: 14, cy: 66, r: 1.2, opacity: 0.22, duration: "4.9s", delay: "2.2s" },
  { cx: 57, cy: 72, r: 1.3, opacity: 0.19, duration: "5.6s", delay: "0.5s" },
  { cx: 86, cy: 70, r: 1.1, opacity: 0.3, duration: "6.4s", delay: "1.8s" },
];
const MOON_COVER_BLUR_DATA_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%230a0718'/%3E%3Ccircle cx='15' cy='9' r='7' fill='%239b7fd4' fill-opacity='.32'/%3E%3Ccircle cx='12' cy='11' r='7' fill='%23d4af7a' fill-opacity='.2'/%3E%3C/svg%3E";
const DEST1NOVA_SECOND_ALBUM_MARKER = /DEST1NOVA\/DEST1NOVA\s*2/;
const HUMAN_MODE_COVER_KEYS = {
  yeoni: "\uc5f0\uc774 \uc778\uac04 \ubaa8\ub4dc \uc568\ubc94.webp",
  dest1novaVol1: "\ub370\uc2a4\ud2f0\ub178\ubc14 \uc778\uac04\ubc84\uc804 \uc568\ubc94 \ub370\ubdd4.webp",
  dest1novaVol2: "\ub370\uc2a4\ud2f0\ub178\ubc14 \uc778\uac04\ubc84\uc804 \uc568\ubc94 2.webp",
};

const HUMAN_MODE_COVER_URLS = {
  yeoni: safeBuildMusicPublicUrl(`humanmode/${HUMAN_MODE_COVER_KEYS.yeoni}`),
  dest1novaVol1: safeBuildMusicPublicUrl(`humanmode/${HUMAN_MODE_COVER_KEYS.dest1novaVol1}`),
  dest1novaVol2: safeBuildMusicPublicUrl(`humanmode/${HUMAN_MODE_COVER_KEYS.dest1novaVol2}`),
};

function safeBuildMusicPublicUrl(objectKey: string) {
  try {
    return buildMusicPublicUrl(objectKey);
  } catch {
    return "";
  }
}

function canUseHumanCoverMode(artistKey: ArtistKey) {
  return artistKey === "yeoni" || artistKey === "dest1nova";
}

function getAlbumCoverMode(artistImageMode: Partial<Record<ArtistKey, AlbumImageMode>>, artistKey: ArtistKey) {
  if (!canUseHumanCoverMode(artistKey)) return "default" as const;
  return artistImageMode[artistKey] || "default";
}

function resolveTrackAlbumCoverUrl(track: Track, mode: AlbumImageMode, humanModeCoverUrls: HumanModeCoverMap) {
  if (!track) return "";

  if (mode !== "human") {
    return track.coverUrl;
  }

  if (track.artistKey === "yeoni" && humanModeCoverUrls.yeoni) {
    return humanModeCoverUrls.yeoni;
  }

  if (track.artistKey === "dest1nova") {
    const isSecondAlbum = DEST1NOVA_SECOND_ALBUM_MARKER.test(track.audioKey);
    if (isSecondAlbum && humanModeCoverUrls.dest1novaVol2) return humanModeCoverUrls.dest1novaVol2;
    if (humanModeCoverUrls.dest1novaVol1) return humanModeCoverUrls.dest1novaVol1;
  }

  return track.coverUrl;
}

const MUSIC_PLAYER_TEXT_TRANSLATIONS = {
  ko: {
    lyricsAria: "현재 곡 가사",
    lyrics: "가사",
    lyricsLoading: "가사 로딩 중...",
    lyricsEmpty: "가사 데이터가 아직 준비되지 않았습니다.",
    statusLoading: "달빛을 불러오는 중",
    statusWaiting: "달빛이 열리기를 기다리는 중",
    statusPlaying: "지금 흐르는 달빛",
    statusPaused: "달빛이 잠시 머무는 중",
    playerAria: "Code Destiny 음악 플레이어",
    pause: "일시정지",
    play: "재생",
    nextTrack: "다음 곡",
    previousTrack: "이전 곡",
    listeningMode: "음악 감상 모드",
    playlistHint: "✦ 달빛 플레이리스트",
    albumModeLabel: "앨범 모드",
    albumModeDefault: "기본",
    albumModeHuman: "인간",
    close: "닫기",
    heroKicker: "MOON LIBRARY",
    heroTitle: "달빛 플레이리스트",
    heroText: "네오와 연이의 감성 무드로 이어지는 플레이 리스트.",
    shareCurrent: "현재 곡 공유",
    copied: "복사됨",
    share: "공유",
    defaultMood: "달빛 세션",
    repeat: (mode: RepeatMode) => `반복 ${mode}`,
    shuffleOn: "셔플 켜짐",
    shuffleOff: "셔플 꺼짐",
    unmute: "음소거 해제",
    mute: "음소거",
    volume: "볼륨",
    shareText: "Code Destiny 달빛 라이브러리에서 들어보세요.",
    shareMain: "Code Destiny 메인",
    shareTitle: (title: string) => `Code Destiny Music - ${title}`,
  },
  en: {
    lyricsAria: "Current track lyrics",
    lyrics: "Lyrics",
    lyricsLoading: "Loading lyrics...",
    lyricsEmpty: "Lyrics are not ready yet.",
    statusLoading: "Calling in the moonlight",
    statusWaiting: "Waiting for the moonlight to open",
    statusPlaying: "Moonlight is playing now",
    statusPaused: "Moonlight is resting for a moment",
    playerAria: "Code Destiny music player",
    pause: "Pause",
    play: "Play",
    nextTrack: "Next track",
    previousTrack: "Previous track",
    listeningMode: "Listening mode",
    playlistHint: "✦ Moonlit playlist",
    albumModeLabel: "Album mode",
    albumModeDefault: "Default",
    albumModeHuman: "Human",
    close: "Close",
    heroKicker: "MOON LIBRARY",
    heroTitle: "Moonlit Playlist",
    heroText: "A playlist woven through Neo and Yeoni's emotional moods.",
    shareCurrent: "Share current track",
    copied: "Copied",
    share: "Share",
    defaultMood: "moonlight session",
    repeat: (mode: RepeatMode) => `Repeat ${mode}`,
    shuffleOn: "Shuffle on",
    shuffleOff: "Shuffle off",
    unmute: "Unmute",
    mute: "Mute",
    volume: "Volume",
    shareText: "Listen inside the Code Destiny moon library.",
    shareMain: "Code Destiny main",
    shareTitle: (title: string) => `Code Destiny Music - ${title}`,
  },
  ja: {
    lyricsAria: "現在の曲の歌詞",
    lyrics: "歌詞",
    lyricsLoading: "歌詞を読み込んでいます...",
    lyricsEmpty: "歌詞データはまだ準備されていません。",
    statusLoading: "月明かりを呼び込んでいます",
    statusWaiting: "月明かりが開くのを待っています",
    statusPlaying: "いま流れている月明かり",
    statusPaused: "月明かりが少し留まっています",
    playerAria: "Code Destiny 音楽プレイヤー",
    pause: "一時停止",
    play: "再生",
    nextTrack: "次の曲",
    previousTrack: "前の曲",
    listeningMode: "音楽鑑賞モード",
    playlistHint: "✦ 月明かりプレイリスト",
    albumModeLabel: "アルバムモード",
    albumModeDefault: "デフォルト",
    albumModeHuman: "ヒューマン",
    close: "閉じる",
    heroKicker: "MOON LIBRARY",
    heroTitle: "月明かりプレイリスト",
    heroText: "ネオとヨニの感性ムードでつながるプレイリスト。",
    shareCurrent: "現在の曲を共有",
    copied: "コピー済み",
    share: "共有",
    defaultMood: "月明かりセッション",
    repeat: (mode: RepeatMode) => `リピート ${mode}`,
    shuffleOn: "シャッフル オン",
    shuffleOff: "シャッフル オフ",
    unmute: "ミュート解除",
    mute: "ミュート",
    volume: "音量",
    shareText: "Code Destinyの月明かりライブラリで聴いてみてください。",
    shareMain: "Code Destiny メイン",
    shareTitle: (title: string) => `Code Destiny Music - ${title}`,
  },
} as const;

function getMusicPlayerCopy(locale: LoadingLocale) {
  return MUSIC_PLAYER_TEXT_TRANSLATIONS[locale as "ko" | "en" | "ja"] || MUSIC_PLAYER_TEXT_TRANSLATIONS.ko;
}

let musicLyricsModulePromise: Promise<{ lyricsFromAudioFileName: (audioFileName: string) => string | undefined }>|null = null;
const lyricsTextCache = new Map<string, string>();

function getMusicLyricsModule() {
  if (!musicLyricsModulePromise) {
    musicLyricsModulePromise = import("./_data/musicLyrics");
  }
  return musicLyricsModulePromise;
}

function ListenModeHeadphonesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 15a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2l0 -3" />
      <path d="M15 15a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2l0 -3" />
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    </svg>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getNextRepeatMode(repeat: RepeatMode): RepeatMode {
  if (repeat === "off") return "one";
  if (repeat === "one") return "all";
  return "off";
}

function buildMusicShareUrl(trackId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://code-destiny.com";
  const url = new URL("/music", origin);
  url.searchParams.set("track", trackId);
  url.searchParams.set("from", "share");
  return url.toString();
}

async function copyMusicShareText(text: string) {
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

function getListeningStatusLabel(isLoading: boolean, canPlay: boolean, isPlaying: boolean, copy: ReturnType<typeof getMusicPlayerCopy>) {
  if (isLoading) return copy.statusLoading;
  if (!canPlay) return copy.statusWaiting;
  return isPlaying ? copy.statusPlaying : copy.statusPaused;
}

type LyricsPanelProps = {
  isOpen: boolean;
  isLoading: boolean;
  lyricsText: string;
  onToggle: () => void;
  copy: ReturnType<typeof getMusicPlayerCopy>;
};

const LyricsPanel = memo(function LyricsPanel({ isOpen, isLoading, lyricsText, onToggle, copy }: LyricsPanelProps) {
  return (
    <section className={styles.lyricsPanel} aria-label={copy.lyricsAria}>
      <button
        className={styles.lyricsToggle}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{copy.lyrics}</span>
        <ChevronDown
          className={`${styles.lyricsToggleIcon} ${isOpen ? styles.lyricsToggleIconOpen : ""}`}
          size={16}
          aria-hidden
        />
      </button>
      <div className={`${styles.lyricsBody} ${isOpen ? styles.lyricsBodyOpen : ""}`} aria-hidden={!isOpen}>
        {isLoading ? (
          <p className={styles.lyricsEmpty}>{copy.lyricsLoading}</p>
        ) : lyricsText ? (
          <pre className={styles.lyricsText}>{lyricsText}</pre>
        ) : (
          <p className={styles.lyricsEmpty}>{copy.lyricsEmpty}</p>
        )}
      </div>
    </section>
  );
});

export default function MusicPlayerExample({ ambientAssetKey, presentation = "full" }: MusicPlayerExampleProps) {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getMusicPlayerCopy(locale);
  const sharedTrackId = searchParams?.get("track") || undefined;
  const initialSharedTrackId = useMemo(() => {
    return sharedTrackId && allTracks.some((track) => track.id === sharedTrackId) ? sharedTrackId : undefined;
  }, [sharedTrackId]);
  const player = useMusicPlayer(allTracks, { initialVolume: 0.85, initialTrackId: initialSharedTrackId });
  const setPlaybackState = useMusicPlaybackStore((state) => state.setPlaybackState);
  const selectTrack = player.selectTrack;
  const sharedTrackSyncAttemptsRef = useRef(0);
  const progressMax = player.duration || 0;
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, boolean>>({});
  const [isListeningModeOpen, setIsListeningModeOpen] = useState(presentation === "full");
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [nowPlayingShared, setNowPlayingShared] = useState(false);
  const [playlistThemeMode, setPlaylistThemeMode] = useState<PlaylistThemeMode>("all");
  const [albumImageModeByArtist, setAlbumImageModeByArtist] = useState<Partial<Record<ArtistKey, AlbumImageMode>>>({});
  const currentTrack = player.currentTrack;
  const currentTrackId = currentTrack?.id || "";
  const currentTrackAlbumMode = currentTrack ? getAlbumCoverMode(albumImageModeByArtist, currentTrack.artistKey) : "default";
  const coverFailed = Boolean(!currentTrack || !resolveTrackAlbumCoverUrl(currentTrack, currentTrackAlbumMode, HUMAN_MODE_COVER_URLS) || (currentTrackId && failedCoverIds[currentTrackId]));
  const displayedTracks = useMemo(() => {
    return player.tracks.map((track) => ({
      ...track,
      coverUrl: resolveTrackAlbumCoverUrl(track, getAlbumCoverMode(albumImageModeByArtist, track.artistKey), HUMAN_MODE_COVER_URLS),
    }));
  }, [albumImageModeByArtist, player.tracks]);
  const effectiveArtistTheme = playlistThemeMode === "all" ? player.currentTrack?.artistKey : playlistThemeMode;
  const artistThemeClass = effectiveArtistTheme === "dest1nova"
    ? styles.dest1novaMode
    : effectiveArtistTheme === "lunabloom"
      ? styles.lunabloomMode
      : effectiveArtistTheme === "yeoni"
        ? styles.yeoniMode
        : styles.neoMode;
  const isCompact = presentation === "compact";
  const canToggleAlbumMode = Boolean(currentTrack && canUseHumanCoverMode(currentTrack.artistKey));
  const albumModeSwitchLabel = currentTrackAlbumMode === "human" ? copy.albumModeDefault : copy.albumModeHuman;

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  useEffect(() => {
    setPlaybackState(currentTrackId, player.isPlaying);
  }, [currentTrackId, player.isPlaying, setPlaybackState]);

  useEffect(() => {
    const hasSharedTrack = Boolean(sharedTrackId && allTracks.some((track) => track.id === sharedTrackId));
    if (!hasSharedTrack || !sharedTrackId || currentTrackId === sharedTrackId) return;
    if (sharedTrackSyncAttemptsRef.current >= 2) return;

    sharedTrackSyncAttemptsRef.current += 1;
    selectTrack(sharedTrackId);
  }, [currentTrackId, selectTrack, sharedTrackId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const desktopMediaQuery = window.matchMedia("(min-width: 1120px)");
    const syncLyricsLayout = () => setIsLyricsOpen(desktopMediaQuery.matches);

    syncLyricsLayout();
    desktopMediaQuery.addEventListener("change", syncLyricsLayout);
    return () => desktopMediaQuery.removeEventListener("change", syncLyricsLayout);
  }, []);

  const ambientAssetUrl = useMemo(() => {
    if (!ambientAssetKey) return "";

    try {
      return buildAssetsPublicUrl(ambientAssetKey);
    } catch {
      return "";
    }
  }, [ambientAssetKey]);
  const bannerFallbackCover = useMemo(() => {
    if (!currentTrack) {
      return "url('/music-covers/yeoni-1st-album.webp')";
    }

    const coverUrl = resolveTrackAlbumCoverUrl(currentTrack, currentTrackAlbumMode, HUMAN_MODE_COVER_URLS);
    return coverUrl ? `url("${coverUrl}")` : "url('/music-covers/yeoni-1st-album.webp')";
  }, [currentTrack, currentTrackAlbumMode]);
  const playerStyle: PlayerStyle = {};
  const currentTrackCoverUrl = currentTrack ? resolveTrackAlbumCoverUrl(currentTrack, currentTrackAlbumMode, HUMAN_MODE_COVER_URLS) : "";

  if (currentTrack && currentTrackCoverUrl && !coverFailed) {
    playerStyle["--cover-image"] = `url("${currentTrackCoverUrl}")`;
  }
  playerStyle["--moon-banner-cover-fallback"] = bannerFallbackCover;

  if (ambientAssetUrl) {
    playerStyle["--asset-ambient-image"] = `url("${ambientAssetUrl}")`;
  }

  const markCoverLoaded = useCallback(() => {
    const trackId = player.currentTrack?.id || "";
    setFailedCoverIds((current) => {
      if (!trackId || !current[trackId]) return current;

      const next = { ...current };
      delete next[trackId];
      return next;
    });
  }, [player.currentTrack?.id]);

  const markCoverFailed = useCallback(() => {
    const trackId = player.currentTrack?.id || "";
    if (!trackId) return;

    setFailedCoverIds((current) => ({ ...current, [trackId]: true }));
  }, [player.currentTrack?.id]);

  const clearCoverFailuresForArtist = useCallback((artistKey: ArtistKey) => {
    setFailedCoverIds((current) => {
      const next = { ...current };
      let hasChanges = false;

      for (const track of player.tracks) {
        if (track.artistKey !== artistKey) continue;
        if (!next[track.id]) continue;
        delete next[track.id];
        hasChanges = true;
      }

      return hasChanges ? next : current;
    });
  }, [player.tracks]);

  const handleAlbumModeToggle = useCallback(() => {
    const track = player.currentTrack;
    if (!track || !canUseHumanCoverMode(track.artistKey)) return;

    setAlbumImageModeByArtist((current) => {
      const currentMode = getAlbumCoverMode(current, track.artistKey);
      return {
        ...current,
        [track.artistKey]: currentMode === "human" ? "default" : "human",
      };
    });
    clearCoverFailuresForArtist(track.artistKey);
  }, [clearCoverFailuresForArtist, player.currentTrack]);

  const toggleLyricsOpen = useCallback(() => {
    setIsLyricsOpen((current) => !current);
  }, []);

  const [lyricsText, setLyricsText] = useState("");
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  useEffect(() => {
    const track = player.currentTrack;
    if (!track?.lyricsLookupKey) {
      setLyricsText("");
      setIsLyricsLoading(false);
      return;
    }
    const lyricsLookupKey = track.lyricsLookupKey;

    if (lyricsTextCache.has(lyricsLookupKey)) {
      setLyricsText(lyricsTextCache.get(lyricsLookupKey) || "");
      setIsLyricsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLyricsLoading(true);
    setLyricsText("");

    void getMusicLyricsModule()
      .then((module) => {
        if (cancelled) return;
        const nextLyrics = module.lyricsFromAudioFileName(lyricsLookupKey);
        const nextLyricsText = typeof nextLyrics === "string" ? nextLyrics.trim() : "";
        lyricsTextCache.set(lyricsLookupKey, nextLyricsText);
        setLyricsText(nextLyricsText);
      })
      .catch(() => {
        if (!cancelled) {
          lyricsTextCache.set(lyricsLookupKey, "");
          setLyricsText("");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLyricsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [player.currentTrack?.id, player.currentTrack?.lyricsLookupKey]);

  useEffect(() => {
    if (!player.currentTrack || !player.tracks.length) return;

    const cacheKeys = new Set<string>();
    const collectKey = (index: number) => {
      const candidate = player.tracks[index];
      if (candidate?.lyricsLookupKey) {
        cacheKeys.add(candidate.lyricsLookupKey);
      }
    };

    const currentIndex = player.currentIndex;
    collectKey(currentIndex);
    if (player.tracks.length > 1) {
      collectKey((currentIndex + 1) % player.tracks.length);
      collectKey((currentIndex - 1 + player.tracks.length) % player.tracks.length);
    }

    const remainingKeys = Array.from(cacheKeys).filter((lyricsLookupKey) => !lyricsTextCache.has(lyricsLookupKey));
    if (!remainingKeys.length) return;

    let cancelled = false;
    const preloadIdleId = window.setTimeout(() => {
      void getMusicLyricsModule()
        .then((module) => {
          if (cancelled) return;

          for (const lyricsLookupKey of remainingKeys) {
            const nextLyrics = module.lyricsFromAudioFileName(lyricsLookupKey);
            lyricsTextCache.set(lyricsLookupKey, typeof nextLyrics === "string" ? nextLyrics.trim() : "");
          }
        })
        .catch(() => {
          if (cancelled) return;

          for (const lyricsLookupKey of remainingKeys) {
            if (!lyricsTextCache.has(lyricsLookupKey)) {
              lyricsTextCache.set(lyricsLookupKey, "");
            }
          }
        });
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(preloadIdleId);
    };
  }, [player.currentIndex, player.tracks]);
  const listeningStatusLabel = getListeningStatusLabel(player.isLoading, player.canPlay, player.isPlaying, copy);
  const progressPercent = progressMax > 0
    ? Math.min(100, Math.max(0, (player.currentTime / progressMax) * 100))
    : 0;

  async function handleShareNowPlaying() {
    if (!player.currentTrack) return;

    const track = player.currentTrack;
    const trackUrl = buildMusicShareUrl(track.id);
    const mainUrl = typeof window !== "undefined" ? new URL("/", window.location.origin).toString() : "https://code-destiny.com/";
    const text = [
      `${track.artistName} - ${track.title}`,
      copy.shareText,
      `${copy.shareMain}: ${mainUrl}`,
    ].join("\n");
    const copiedText = `${text}\n${trackUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: copy.shareTitle(track.title),
          text,
          url: trackUrl,
        });
      } else {
        await copyMusicShareText(copiedText);
      }

      setNowPlayingShared(true);
      window.setTimeout(() => setNowPlayingShared(false), 1800);
    } catch {
    }
  }

  const handlePlaylistCoverError = useCallback((trackId: string) => {
    setFailedCoverIds((current) => ({ ...current, [trackId]: true }));
  }, []);

  const handlePlaylistTrackSelect = useCallback((trackId: string) => {
    player.selectTrack(trackId, { play: true });
  }, [player.selectTrack]);

  if (isCompact && !isListeningModeOpen && player.currentTrack) {
    return (
      <section
        className={`${styles.miniPlayerShell} ${artistThemeClass} ${coverFailed ? styles.coverFallback : ""} font-body`}
        data-artist-mode={effectiveArtistTheme || player.currentTrack.artistKey}
        style={playerStyle}
        aria-label={copy.playerAria}
      >
        <div className={styles.miniCoverWrap}>
          {currentTrackCoverUrl ? (
            <Image
              className={styles.miniCover}
              src={currentTrackCoverUrl}
              alt={`${player.currentTrack.artistName} - ${player.currentTrack.title} cover`}
              width={64}
              height={64}
              sizes="64px"
              loading="lazy"
              decoding="async"
              placeholder="blur"
              blurDataURL={MOON_COVER_BLUR_DATA_URL}
              unoptimized
              data-hidden={coverFailed ? "true" : "false"}
              onLoad={markCoverLoaded}
              onError={markCoverFailed}
            />
          ) : null}
          <span className={styles.miniCoverFallback} aria-hidden />
        </div>

        <div className={styles.miniTrackMeta}>
          <span>{player.currentTrack.artistName}</span>
          <strong>{player.currentTrack.title}</strong>
        </div>

        <div className={styles.miniControls}>
          <button
            className={styles.smallButton}
            type="button"
            onClick={player.isPlaying ? player.pause : player.play}
            aria-label={player.isPlaying ? copy.pause : copy.play}
          >
            {player.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button className={styles.smallButton} type="button" onClick={player.next} aria-label={copy.nextTrack}>
            <SkipForward size={18} />
          </button>
          <button className={styles.listenModeButton} type="button" onClick={() => setIsListeningModeOpen(true)}>
            <ListenModeHeadphonesIcon className={styles.listenModeIcon} />
            {copy.listeningMode}
          </button>
        </div>
        <p className={styles.listenModeHint}>{copy.playlistHint}</p>
      </section>
    );
  }

  return (
    <section
      className={`${styles.playerShell} ${isCompact ? styles.listeningOverlay : ""} ${artistThemeClass} ${player.isPlaying ? styles.isPlaying : styles.isPaused} ${coverFailed ? styles.coverFallback : ""} font-body`}
      data-artist-mode={effectiveArtistTheme || "neo"}
      style={playerStyle}
    >
      {isCompact ? (
        <button className={styles.closeListeningMode} type="button" onClick={() => setIsListeningModeOpen(false)}>
          {copy.close}
        </button>
      ) : null}

      <div className={styles.assetAmbient} aria-hidden />
      <div className={styles.coverAmbient} aria-hidden />
      <div className={styles.stars} aria-hidden />
      <div className={styles.moon} aria-hidden />
      <div className={styles.moonbeam} aria-hidden />
      <div className={styles.bannerGlowLeft} aria-hidden />
      <div className={styles.bannerGlowRight} aria-hidden />
      <svg className={styles.bannerStars} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {BANNER_STARS.map((star) => (
          <circle
            key={`${star.cx}-${star.cy}`}
            className={styles.bannerStar}
            cx={`${star.cx}%`}
            cy={`${star.cy}%`}
            r={star.r}
            fill="white"
            style={{
              animationDuration: star.duration,
              animationDelay: star.delay,
              opacity: star.opacity,
            }}
          />
        ))}
      </svg>
      <svg className={styles.bannerCrescent} viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 2a10 10 0 1 0 10 10A8 8 0 1 1 12 2Zm2.9 2.9a5.9 5.9 0 0 0 4.6 9.2v-.2A6.1 6.1 0 0 1 14.9 4.9Z"
          fill="rgba(196, 181, 253, 0.35)"
          fillRule="evenodd"
        />
      </svg>
      <div className={styles.mist} aria-hidden />

      {currentTrack ? (
        <>
        <div className={`${styles.playerFrame} mx-auto animate-fade-in-up`}>
          <div className={`${styles.playerHero} font-display`}>
            <span className={`${styles.playerHeroKicker} font-decorative`}>{copy.heroKicker}</span>
            <h1 className={`${styles.playerHeroTitle} font-display`}>{copy.heroTitle}</h1>
            <p className={`${styles.playerHeroText} font-premium`}>{copy.heroText}</p>
          </div>
          <div className={`${styles.playerMain} rounded-[8px]`}>
            <div className={`${styles.albumChamber} relative`}>
              <MoonAlbumArtwork
                coverUrl={currentTrackCoverUrl}
                title={currentTrack.title}
                artistKey={currentTrack.artistKey}
                artistName={currentTrack.artistName}
                coverFailed={coverFailed}
                onCoverLoad={markCoverLoaded}
                onCoverError={markCoverFailed}
              />
              <span
                className={`${styles.albumStatusBadge} font-premium`}
                data-playing={player.isPlaying ? "true" : "false"}
                aria-live="polite"
              >
                {listeningStatusLabel}
              </span>
            </div>

            <div className={`${styles.nowPlayingPanel} shadow-violet-neon`}>
              <div className={styles.nowPlayingHeader}>
                <span className={`${styles.artistName} font-decorative`}>{currentTrack.artistName}</span>
                {canToggleAlbumMode ? (
                  <button
                    className={styles.albumModeButton}
                    type="button"
                    onClick={handleAlbumModeToggle}
                    data-mode={currentTrackAlbumMode}
                    aria-label={`${copy.albumModeLabel}: ${albumModeSwitchLabel}`}
                  >
                    <Moon size={14} aria-hidden />
                    <span className={styles.albumModeButtonText}>{albumModeSwitchLabel}</span>
                    <span className={styles.albumModeButtonGlow} aria-hidden />
                  </button>
                ) : null}
                <button
                  className={styles.nowPlayingShareButton}
                  type="button"
                  onClick={() => void handleShareNowPlaying()}
                  aria-label={copy.shareCurrent}
                  data-shared={nowPlayingShared ? "true" : "false"}
                >
                  <Share2 size={16} aria-hidden />
                  <span>{nowPlayingShared ? copy.copied : copy.share}</span>
                </button>
              </div>
              <h2 className="font-display">{currentTrack.title}</h2>
              <p>{currentTrack.mood || copy.defaultMood}</p>
            </div>

            <div className={`${styles.controlDeck} shadow-violet-neon`}>
              <div className={styles.controlRow}>
                <button className={styles.iconButton} type="button" onClick={player.previous} aria-label={copy.previousTrack}>
                  <SkipBack size={18} />
                </button>
                <button
                  className={`${styles.playButton} shadow-violet-neon-focus`}
                  type="button"
                  onClick={player.isPlaying ? player.pause : player.play}
                  aria-label={player.isPlaying ? copy.pause : copy.play}
                >
                  {player.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button className={styles.iconButton} type="button" onClick={player.next} aria-label={copy.nextTrack}>
                  <SkipForward size={18} />
                </button>
              </div>

              <label
                className={styles.progressArea}
                data-playing={player.isPlaying ? "true" : "false"}
                style={{ "--moon-progress": `${progressPercent}%` } as CSSProperties}
              >
                <span>{formatTime(player.currentTime)}</span>
                <input
                  className={styles.progressInput}
                  type="range"
                  min="0"
                  max={progressMax}
                  step="0.1"
                  value={Math.min(player.currentTime, progressMax)}
                  onChange={(event) => player.seek(Number(event.currentTarget.value))}
                />
                <span>{formatTime(player.duration)}</span>
              </label>

              <div className={styles.secondaryControls}>
                <button
                  className={styles.smallButton}
                  type="button"
                  onClick={() => player.setRepeat(getNextRepeatMode(player.repeat))}
                  aria-label={copy.repeat(player.repeat)}
                  data-active={player.repeat !== "off"}
                >
                  {player.repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
                <button
                  className={styles.smallButton}
                  type="button"
                  onClick={player.toggleShuffle}
                  aria-label={player.shuffle ? copy.shuffleOn : copy.shuffleOff}
                  aria-pressed={player.shuffle}
                  data-active={player.shuffle}
                >
                  <Shuffle size={18} />
                </button>
                <button
                  className={styles.smallButton}
                  type="button"
                  onClick={player.toggleMute}
                  aria-label={player.muted ? copy.unmute : copy.mute}
                  data-active={player.muted}
                >
                  {player.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <label className={styles.volumeControl}>
                  <span>{Math.round(player.volume * 100)}</span>
                  <input
                    className={styles.volumeInput}
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={player.volume}
                    onChange={(event) => player.setVolume(Number(event.currentTarget.value))}
                    aria-label={copy.volume}
                  />
                </label>
              </div>
            </div>

            {player.errorMessage ? (
              <p className={styles.errorText} role="alert">
                {player.errorMessage}
              </p>
            ) : null}

            {player.audioDebugHelperText ? (
              <pre className={styles.errorText}>{player.audioDebugHelperText}</pre>
            ) : null}

            <LyricsPanel
              isOpen={isLyricsOpen}
              isLoading={isLyricsLoading}
              lyricsText={lyricsText}
              onToggle={toggleLyricsOpen}
              copy={copy}
            />
          </div>

          <MusicPlaylistPanel
            tracks={displayedTracks}
            failedCoverIds={failedCoverIds}
            onActiveTabChange={setPlaylistThemeMode}
            onCoverError={handlePlaylistCoverError}
            onSelectTrack={handlePlaylistTrackSelect}
          />
        </div>
        <aside
          className={styles.nowPlayingDock}
          data-playing={player.isPlaying ? "true" : "false"}
          aria-label={copy.playerAria}
        >
          <span className={styles.nowPlayingDockGlow} aria-hidden />
          <span className={styles.nowPlayingDockCover} data-fallback={coverFailed ? "true" : "false"}>
            {currentTrackCoverUrl ? (
              <Image
                src={currentTrackCoverUrl}
                alt={`${currentTrack.artistName} - ${currentTrack.title} cover`}
                width={64}
                height={64}
                sizes="64px"
                placeholder="blur"
                blurDataURL={MOON_COVER_BLUR_DATA_URL}
                unoptimized
                onLoad={markCoverLoaded}
                onError={markCoverFailed}
              />
            ) : null}
            <span className={styles.nowPlayingDockFallback} aria-hidden />
          </span>
          <span className={styles.nowPlayingDockMeta}>
            <span className={styles.nowPlayingDockTitle}>
              <span>{currentTrack.title}</span>
            </span>
            <span className={styles.nowPlayingDockArtist}>{currentTrack.artistName}</span>
          </span>
          <span className={styles.nowPlayingDockControls}>
            <button type="button" onClick={player.previous} aria-label={copy.previousTrack}>
              <SkipBack size={18} aria-hidden />
            </button>
            <button
              className={styles.nowPlayingDockPlay}
              type="button"
              onClick={player.isPlaying ? player.pause : player.play}
              aria-label={player.isPlaying ? copy.pause : copy.play}
            >
              {player.isPlaying ? <Pause size={20} aria-hidden /> : <Play size={20} aria-hidden />}
            </button>
            <button type="button" onClick={player.next} aria-label={copy.nextTrack}>
              <SkipForward size={18} aria-hidden />
            </button>
          </span>
          <span className={styles.nowPlayingDockProgress} aria-hidden>
            <span style={{ width: `${progressPercent}%` }} />
          </span>
        </aside>
        </>
      ) : null}
    </section>
  );
}

