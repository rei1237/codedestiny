"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { ChevronDown, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { buildAssetsPublicUrl } from "@/lib/r2-public-url";
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
};

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

export default function MusicPlayerExample({ ambientAssetKey, presentation = "full" }: MusicPlayerExampleProps) {
  const player = useMusicPlayer(allTracks, { initialVolume: 0.85 });
  const progressMax = player.duration || 0;
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, boolean>>({});
  const [isListeningModeOpen, setIsListeningModeOpen] = useState(presentation === "full");
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const currentTrackId = player.currentTrack?.id || "";
  const coverFailed = Boolean(!player.currentTrack?.coverUrl || (currentTrackId && failedCoverIds[currentTrackId]));
  const artistThemeClass = player.currentTrack?.artistKey === "yeoni" ? styles.yeoniMode : styles.neoMode;
  const isCompact = presentation === "compact";
  const ambientAssetUrl = useMemo(() => {
    if (!ambientAssetKey) return "";

    try {
      return buildAssetsPublicUrl(ambientAssetKey);
    } catch {
      return "";
    }
  }, [ambientAssetKey]);
  const playerStyle: PlayerStyle = {};

  if (player.currentTrack && !coverFailed) {
    playerStyle["--cover-image"] = `url("${player.currentTrack.coverUrl}")`;
  }

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

  if (isCompact && !isListeningModeOpen && player.currentTrack) {
    return (
      <section
        className={`${styles.miniPlayerShell} ${artistThemeClass} ${coverFailed ? styles.coverFallback : ""}`}
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
          <button className={styles.smallButton} type="button" onClick={player.isPlaying ? player.pause : player.play} aria-label={player.isPlaying ? "Pause" : "Play"}>
            {player.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button className={styles.smallButton} type="button" onClick={player.next} aria-label="Next track">
            <SkipForward size={18} />
          </button>
          <button className={styles.listenModeButton} type="button" onClick={() => setIsListeningModeOpen(true)}>
            음악 감상 모드
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${styles.playerShell} ${isCompact ? styles.listeningOverlay : ""} ${artistThemeClass} ${player.isPlaying ? styles.isPlaying : styles.isPaused} ${coverFailed ? styles.coverFallback : ""}`}
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
      <div className={styles.stars} aria-hidden />
      <div className={styles.mist} aria-hidden />

      {player.currentTrack ? (
        <div className={styles.playerFrame}>
          <div className={styles.playerMain}>
            <MoonAlbumArtwork
              coverUrl={player.currentTrack.coverUrl}
              title={player.currentTrack.title}
              artistKey={player.currentTrack.artistKey}
              artistName={player.currentTrack.artistName}
              coverFailed={coverFailed}
              onCoverLoad={markCoverLoaded}
              onCoverError={markCoverFailed}
            />

            <div className={styles.trackMeta}>
              <span className={styles.artistName}>{player.currentTrack.artistName}</span>
              <h2>{player.currentTrack.title}</h2>
              <p>{player.currentTrack.mood || "moonlight session"}</p>
            </div>

            <div className={styles.controlRow}>
              <button className={styles.iconButton} type="button" onClick={player.previous} aria-label="Previous track">
                <SkipBack size={18} />
              </button>
              <button className={styles.playButton} type="button" onClick={player.isPlaying ? player.pause : player.play} aria-label={player.isPlaying ? "Pause" : "Play"}>
                {player.isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button className={styles.iconButton} type="button" onClick={player.next} aria-label="Next track">
                <SkipForward size={18} />
              </button>
            </div>

            <label className={styles.progressArea}>
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
              <button className={styles.smallButton} type="button" onClick={() => player.setRepeat(getNextRepeatMode(player.repeat))} aria-label={`Repeat ${player.repeat}`} data-active={player.repeat !== "off"}>
                {player.repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
              </button>
              <button className={styles.smallButton} type="button" onClick={player.toggleShuffle} aria-label={player.shuffle ? "Shuffle on" : "Shuffle off"} aria-pressed={player.shuffle} data-active={player.shuffle}>
                <Shuffle size={18} />
              </button>
              <button className={styles.smallButton} type="button" onClick={player.toggleMute} aria-label={player.muted ? "Unmute" : "Mute"} data-active={player.muted}>
                {player.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <label className={styles.volumeControl}>
                <span>Volume {Math.round(player.volume * 100)}</span>
                <input
                  className={styles.volumeInput}
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={player.volume}
                  onChange={(event) => player.setVolume(Number(event.currentTarget.value))}
                />
              </label>
            </div>

            <div className={styles.statusLine}>{player.isLoading ? "Loading moonlight..." : player.canPlay ? player.status : "Preparing..."}</div>

            {player.errorMessage ? (
              <p className={styles.errorText} role="alert">{player.errorMessage}</p>
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
                <span>가사 보기</span>
                <ChevronDown
                  className={`${styles.lyricsToggleIcon} ${isLyricsOpen ? styles.lyricsToggleIconOpen : ""}`}
                  size={16}
                  aria-hidden
                />
              </button>
              <div className={`${styles.lyricsBody} ${isLyricsOpen ? styles.lyricsBodyOpen : ""}`} aria-hidden={!isLyricsOpen}>
                {lyricsText ? <pre className={styles.lyricsText}>{lyricsText}</pre> : <p className={styles.lyricsEmpty}>이 곡의 가사가 아직 준비되지 않았어요.</p>}
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
