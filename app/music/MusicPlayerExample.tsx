"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,

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
import { allTracks } from "./_data/musicManifest";
import { useMusicPlayer, type RepeatMode } from "./_hooks/useMusicPlayer";
import MoonAlbumArtwork from "./MoonAlbumArtwork";
import MusicPlaylistPanel from "./MusicPlaylistPanel";
import styles from "./moon-music-player.module.css";

type MusicPlayerExampleProps = {
  ambientAssetKey?: string;
  presentation?: "full" | "compact";
};

type PlayerStyle = CSSProperties & {
  "--cover-image"?: string;
  "--asset-ambient-image"?: string;
  "--moon-banner-cover-fallback"?: string;
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

function getListeningStatusLabel(isLoading: boolean, canPlay: boolean, isPlaying: boolean) {
  if (isLoading) return "달빛을 불러오는 중";
  if (!canPlay) return "달빛이 열리기를 기다리는 중";
  return isPlaying ? "지금 흐르는 달빛" : "달빛이 잠시 머무는 중";
}

export default function MusicPlayerExample({ ambientAssetKey, presentation = "full" }: MusicPlayerExampleProps) {
  const player = useMusicPlayer(allTracks, { initialVolume: 0.85 });
  const selectTrack = player.selectTrack;
  const hasAppliedSharedTrackRef = useRef(false);
  const progressMax = player.duration || 0;
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, boolean>>({});
  const [isListeningModeOpen, setIsListeningModeOpen] = useState(presentation === "full");
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [nowPlayingShared, setNowPlayingShared] = useState(false);
  const currentTrackId = player.currentTrack?.id || "";
  const coverFailed = Boolean(!player.currentTrack?.coverUrl || (currentTrackId && failedCoverIds[currentTrackId]));
  const artistThemeClass = player.currentTrack?.artistKey === "dest1nova"
    ? styles.dest1novaMode
    : player.currentTrack?.artistKey === "yeoni"
      ? styles.yeoniMode
      : styles.neoMode;
  const isCompact = presentation === "compact";
  const hasCurrentTrack = Boolean(player.currentTrack);

  useEffect(() => {
    if (hasAppliedSharedTrackRef.current || typeof window === "undefined") return;

    const sharedTrackId = new URLSearchParams(window.location.search).get("track");
    const hasSharedTrack = Boolean(sharedTrackId && allTracks.some((track) => track.id === sharedTrackId));
    hasAppliedSharedTrackRef.current = true;

    if (hasSharedTrack && sharedTrackId) {
      selectTrack(sharedTrackId);
    }
  }, [selectTrack]);

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
    if (!hasCurrentTrack) {
      return "url('/music-covers/yeoni-1st-album.webp')";
    }

    try {
      return `url("${buildMusicPublicUrl("yeonisong/꽃돼지 1집.png")}")`;
    } catch {
      return "url('/music-covers/yeoni-1st-album.webp')";
    }
  }, [hasCurrentTrack]);
  const playerStyle: PlayerStyle = {};

  if (player.currentTrack && !coverFailed) {
    playerStyle["--cover-image"] = `url("${player.currentTrack.coverUrl}")`;
  }
  playerStyle["--moon-banner-cover-fallback"] = bannerFallbackCover;

  if (ambientAssetUrl) {
    playerStyle["--asset-ambient-image"] = `url("${ambientAssetUrl}")`;
  }

  const markCoverLoaded = () => {
    setFailedCoverIds((current) => {
      const trackId = player.currentTrack?.id || "";
      if (!trackId || !current[trackId]) return current;

      const next = { ...current };
      delete next[trackId];
      return next;
    });
  };

  const markCoverFailed = () => {
    setFailedCoverIds((current) => ({ ...current, [player.currentTrack?.id || ""]: true }));
  };
  const lyricsText = player.currentTrack?.lyrics?.trim() || "";
  const listeningStatusLabel = getListeningStatusLabel(player.isLoading, player.canPlay, player.isPlaying);
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
      "Listen inside the Code Destiny moon library.",
      `Code Destiny main: ${mainUrl}`,
    ].join("\n");
    const copiedText = `${text}\n${trackUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Code Destiny Music - ${track.title}`,
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

  if (isCompact && !isListeningModeOpen && player.currentTrack) {
    return (
      <section
        className={`${styles.miniPlayerShell} ${artistThemeClass} ${coverFailed ? styles.coverFallback : ""} font-body`}
        data-artist-mode={player.currentTrack.artistKey}
        style={playerStyle}
        aria-label="Code Destiny music player"
      >
        <div className={styles.miniCoverWrap}>
          {player.currentTrack.coverUrl ? (
            <img
              className={styles.miniCover}
              src={player.currentTrack.coverUrl}
              alt={`${player.currentTrack.artistName} - ${player.currentTrack.title} cover`}
              loading="lazy"
              decoding="async"
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
            aria-label={player.isPlaying ? "Pause" : "Play"}
          >
            {player.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button className={styles.smallButton} type="button" onClick={player.next} aria-label="Next track">
            <SkipForward size={18} />
          </button>
          <button className={styles.listenModeButton} type="button" onClick={() => setIsListeningModeOpen(true)}>
            <ListenModeHeadphonesIcon className={styles.listenModeIcon} />
            음악 감상 모드
          </button>
        </div>
        <p className={styles.listenModeHint}>✦ 달빛 플레이리스트</p>
      </section>
    );
  }

  return (
    <section
      className={`${styles.playerShell} ${isCompact ? styles.listeningOverlay : ""} ${artistThemeClass} ${player.isPlaying ? styles.isPlaying : styles.isPaused} ${coverFailed ? styles.coverFallback : ""} font-body`}
      data-artist-mode={player.currentTrack?.artistKey || "neo"}
      style={playerStyle}
    >
      {isCompact ? (
        <button className={styles.closeListeningMode} type="button" onClick={() => setIsListeningModeOpen(false)}>
          닫기
        </button>
      ) : null}

      <div className={styles.assetAmbient} aria-hidden />
      <div className={styles.coverAmbient} aria-hidden />
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

      {player.currentTrack ? (
        <div className={`${styles.playerFrame} mx-auto animate-fade-in-up`}>
          <div className={`${styles.playerHero} font-display`}>
            <span className={`${styles.playerHeroKicker} font-decorative`}>MOON LIBRARY</span>
            <h1 className={`${styles.playerHeroTitle} font-display`}>달빛 플레이리스트</h1>
            <p className={`${styles.playerHeroText} font-premium`}>네오와 연이의 감성 무드로 이어지는 플레이 리스트.</p>
          </div>
          <div className={`${styles.playerMain} rounded-[8px]`}>
            <div className={`${styles.albumChamber} relative`}>
              <MoonAlbumArtwork
                coverUrl={player.currentTrack.coverUrl}
                title={player.currentTrack.title}
                artistKey={player.currentTrack.artistKey}
                artistName={player.currentTrack.artistName}
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
                <span className={`${styles.artistName} font-decorative`}>{player.currentTrack.artistName}</span>
                <button
                  className={styles.nowPlayingShareButton}
                  type="button"
                  onClick={() => void handleShareNowPlaying()}
                  aria-label="현재 곡 공유"
                  data-shared={nowPlayingShared ? "true" : "false"}
                >
                  <Share2 size={16} aria-hidden />
                  <span>{nowPlayingShared ? "Copied" : "Share"}</span>
                </button>
              </div>
              <h2 className="font-display">{player.currentTrack.title}</h2>
              <p>{player.currentTrack.mood || "moonlight session"}</p>
            </div>

            <div className={`${styles.controlDeck} shadow-violet-neon`}>
              <div className={styles.controlRow}>
                <button className={styles.iconButton} type="button" onClick={player.previous} aria-label="Previous track">
                  <SkipBack size={18} />
                </button>
                <button
                  className={`${styles.playButton} shadow-violet-neon-focus`}
                  type="button"
                  onClick={player.isPlaying ? player.pause : player.play}
                  aria-label={player.isPlaying ? "Pause" : "Play"}
                >
                  {player.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button className={styles.iconButton} type="button" onClick={player.next} aria-label="Next track">
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
                  aria-label={`Repeat ${player.repeat}`}
                  data-active={player.repeat !== "off"}
                >
                  {player.repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
                <button
                  className={styles.smallButton}
                  type="button"
                  onClick={player.toggleShuffle}
                  aria-label={player.shuffle ? "Shuffle on" : "Shuffle off"}
                  aria-pressed={player.shuffle}
                  data-active={player.shuffle}
                >
                  <Shuffle size={18} />
                </button>
                <button
                  className={styles.smallButton}
                  type="button"
                  onClick={player.toggleMute}
                  aria-label={player.muted ? "Unmute" : "Mute"}
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
                    aria-label="Volume"
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

            <section className={styles.lyricsPanel} aria-label="Current track lyrics">
              <button
                className={styles.lyricsToggle}
                type="button"
                aria-expanded={isLyricsOpen}
                onClick={() => setIsLyricsOpen((current) => !current)}
              >
                <span>가사</span>
                <ChevronDown
                  className={`${styles.lyricsToggleIcon} ${isLyricsOpen ? styles.lyricsToggleIconOpen : ""}`}
                  size={16}
                  aria-hidden
                />
              </button>
              <div className={`${styles.lyricsBody} ${isLyricsOpen ? styles.lyricsBodyOpen : ""}`} aria-hidden={!isLyricsOpen}>
                {lyricsText ? <pre className={styles.lyricsText}>{lyricsText}</pre> : <p className={styles.lyricsEmpty}>가사 데이터가 아직 준비되지 않았습니다.</p>}
              </div>
            </section>
          </div>

          <MusicPlaylistPanel
            tracks={player.tracks}
            currentTrackId={player.currentTrack?.id}
            isPlaying={player.isPlaying}
            failedCoverIds={failedCoverIds}
            onCoverError={(trackId) => {
              setFailedCoverIds((current) => ({ ...current, [trackId]: true }));
            }}
            onSelectTrack={(trackId) => {
              player.selectTrack(trackId, { play: true });
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
