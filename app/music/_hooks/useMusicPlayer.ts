"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "../_data/musicManifest";

export type RepeatMode = "off" | "one" | "all";
export type MusicPlayerStatus = "idle" | "loading" | "canplay" | "playing" | "paused" | "error";

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_AUDIO_HELPER_TEXT = [
  "R2 audio load checklist:",
  "- R2 object key typo",
  "- audio public access issue",
  "- CORS GET/HEAD setting issue",
  "- file Content-Type issue",
  "- URL encoding issue for spaces or Korean filenames",
].join("\n");
const USER_AUDIO_ERROR_MESSAGE_SAFE = "\uC74C\uC6D0\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
const STORAGE_KEY = "code-destiny:music-player:v1";
const TIME_UPDATE_INTERVAL_MS = 250;

type SelectTrackOptions = {
  play?: boolean;
};

type UseMusicPlayerOptions = {
  initialTrackId?: string;
  initialVolume?: number;
  initialRepeat?: RepeatMode;
  initialShuffle?: boolean;
  onPreviewLimitReached?: (track: Track) => void;
};

type PersistedMusicPlayerState = {
  trackId?: string;
  volume?: number;
  repeat?: RepeatMode;
  shuffle?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isRepeatMode(value: unknown): value is RepeatMode {
  return value === "off" || value === "one" || value === "all";
}

function readPersistedState(): PersistedMusicPlayerState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedMusicPlayerState;

    return {
      trackId: typeof parsed.trackId === "string" ? parsed.trackId : undefined,
      volume: typeof parsed.volume === "number" ? clamp(parsed.volume, 0, 1) : undefined,
      repeat: isRepeatMode(parsed.repeat) ? parsed.repeat : undefined,
      shuffle: typeof parsed.shuffle === "boolean" ? parsed.shuffle : undefined,
    };
  } catch {
    return null;
  }
}

function writePersistedState(state: PersistedMusicPlayerState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return tagName === "input"
    || tagName === "textarea"
    || tagName === "select"
    || target.isContentEditable;
}

function artworkTypeFromUrl(url: string) {
  const cleanUrl = url.split("?")[0]?.toLowerCase() || "";
  if (cleanUrl.endsWith(".png")) return "image/png";
  if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) return "image/jpeg";
  return "image/webp";
}

function getUrlOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function buildAudioErrorMessage() {
  return USER_AUDIO_ERROR_MESSAGE_SAFE;
}

function buildMissingAudioUrlMessage() {
  return USER_AUDIO_ERROR_MESSAGE_SAFE;
}

function getDevAudioHelperText() {
  return IS_DEV ? DEV_AUDIO_HELPER_TEXT : null;
}

function logDevAudioError(audio: HTMLAudioElement, track?: Track) {
  if (!IS_DEV) return;

  console.groupCollapsed("[music-player] audio error");
  console.info("track id", track?.id || "");
  console.info("audioUrl", track?.audioUrl || "");
  console.info("error code", audio.error?.code ?? null);
  console.info("current src", audio.currentSrc || audio.src || "");
  console.info("networkState", audio.networkState);
  console.info("readyState", audio.readyState);
  console.groupEnd();
}

function getNextIndex(currentIndex: number, trackCount: number, shuffle: boolean) {
  if (trackCount <= 1) return 0;
  if (!shuffle) return currentIndex + 1;

  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * trackCount);
  }
  return nextIndex;
}

function getPreviousIndex(currentIndex: number, trackCount: number, shuffle: boolean) {
  if (trackCount <= 1) return 0;
  if (!shuffle) return currentIndex - 1;

  let previousIndex = currentIndex;
  while (previousIndex === currentIndex) {
    previousIndex = Math.floor(Math.random() * trackCount);
  }
  return previousIndex;
}

function getPreviewLimitSeconds(track?: Track | null) {
  const limit = Number(track?.previewLimitSeconds || 0);
  return Number.isFinite(limit) && limit > 0 ? limit : 0;
}

export function useMusicPlayer(tracks: readonly Track[], options: UseMusicPlayerOptions = {}) {
  const initialIndex = useMemo(() => {
    const foundIndex = options.initialTrackId
      ? tracks.findIndex((track) => track.id === options.initialTrackId)
      : 0;
    return foundIndex >= 0 ? foundIndex : 0;
  }, [options.initialTrackId, tracks]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef(tracks);
  const currentIndexRef = useRef(initialIndex);
  const isPlayingRef = useRef(false);
  const repeatRef = useRef<RepeatMode>(options.initialRepeat || "off");
  const shuffleRef = useRef(Boolean(options.initialShuffle));
  const hasUserInteractedRef = useRef(false);
  const playAfterSourceChangeRef = useRef(false);
  const hasRestoredStateRef = useRef(false);
  const wantsPlaybackRef = useRef(false);
  const timeUpdateRafRef = useRef<number | null>(null);
  const lastTimeUpdateRef = useRef(0);
  const onPreviewLimitReachedRef = useRef(options.onPreviewLimitReached);
  const previewLimitReachedTrackIdRef = useRef("");

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => clamp(options.initialVolume ?? 1, 0, 1));
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>(options.initialRepeat || "off");
  const [shuffle, setShuffle] = useState(Boolean(options.initialShuffle));
  const [status, setStatus] = useState<MusicPlayerStatus>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioDebugHelperText, setAudioDebugHelperText] = useState<string | null>(null);

  const currentTrack = tracks[currentIndex] || null;
  const nextTrack = tracks.length
    ? tracks[((currentIndex + 1) % tracks.length + tracks.length) % tracks.length]
    : null;

  const playCurrentAudio = useCallback(async () => {
    const audio = audioRef.current;
    const track = tracksRef.current[currentIndexRef.current];
    if (!audio || !track) return false;

    if (!track.audioUrl) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsLoading(false);
      setCanPlay(false);
      setStatus("error");
      setErrorMessage(buildMissingAudioUrlMessage());
      setAudioDebugHelperText(getDevAudioHelperText());
      return false;
    }

    hasUserInteractedRef.current = true;
    wantsPlaybackRef.current = true;
    setErrorMessage(null);
    setAudioDebugHelperText(null);

    try {
      if (audio.src !== track.audioUrl) {
        audio.pause();
        audio.src = track.audioUrl;
        audio.preload = "metadata";
        audio.load();
        setCurrentTime(0);
        setDuration(0);
        setCanPlay(false);
        setIsLoading(true);
        setStatus("loading");
      } else {
        audio.preload = "metadata";
        const previewLimit = getPreviewLimitSeconds(track);
        if (previewLimit && audio.currentTime >= previewLimit) {
          audio.currentTime = 0;
          setCurrentTime(0);
          previewLimitReachedTrackIdRef.current = "";
        }
      }
      await audio.play();
      isPlayingRef.current = true;
      setIsPlaying(true);
      setStatus("playing");
      return true;
    } catch {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsLoading(false);
      setStatus("error");
      logDevAudioError(audio, track);
      setErrorMessage(USER_AUDIO_ERROR_MESSAGE_SAFE);
      setAudioDebugHelperText(getDevAudioHelperText());
      return false;
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    isPlayingRef.current = false;
    wantsPlaybackRef.current = false;
    setIsPlaying(false);
    setStatus("paused");
  }, []);

  const play = useCallback(() => {
    return playCurrentAudio();
  }, [playCurrentAudio]);

  const setTrackIndex = useCallback((nextIndex: number, shouldPlay: boolean) => {
    const trackCount = tracksRef.current.length;
    if (!trackCount) return;

    const normalizedIndex = ((nextIndex % trackCount) + trackCount) % trackCount;
    playAfterSourceChangeRef.current = shouldPlay;
    previewLimitReachedTrackIdRef.current = "";
    currentIndexRef.current = normalizedIndex;
    setCurrentIndex(normalizedIndex);

    if (shouldPlay) {
      hasUserInteractedRef.current = true;
    }
  }, []);

  const next = useCallback(() => {
    const trackCount = tracksRef.current.length;
    if (!trackCount) return;

    const nextIndex = getNextIndex(currentIndexRef.current, trackCount, shuffleRef.current);
    const shouldPlay = hasUserInteractedRef.current && (isPlayingRef.current || wantsPlaybackRef.current);
    if (nextIndex === currentIndexRef.current) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      if (shouldPlay) {
        void playCurrentAudio();
      }
      return;
    }
    setTrackIndex(nextIndex, shouldPlay);
  }, [playCurrentAudio, setTrackIndex]);

  const previous = useCallback(() => {
    const trackCount = tracksRef.current.length;
    if (!trackCount) return;

    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const previousIndex = getPreviousIndex(currentIndexRef.current, trackCount, shuffleRef.current);
    const shouldPlay = hasUserInteractedRef.current && (isPlayingRef.current || wantsPlaybackRef.current);
    if (previousIndex === currentIndexRef.current) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      if (shouldPlay) {
        void playCurrentAudio();
      }
      return;
    }
    setTrackIndex(previousIndex, shouldPlay);
  }, [playCurrentAudio, setTrackIndex]);

  const selectTrack = useCallback((trackId: string, selectOptions: SelectTrackOptions = {}) => {
    const nextIndex = tracksRef.current.findIndex((track) => track.id === trackId);
    if (nextIndex < 0) return;

    const shouldPlay = Boolean(selectOptions.play);
    if (nextIndex === currentIndexRef.current) {
      if (shouldPlay) {
        hasUserInteractedRef.current = true;
        void playCurrentAudio();
      }
      return;
    }

    setTrackIndex(nextIndex, shouldPlay);
  }, [playCurrentAudio, setTrackIndex]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const track = tracksRef.current[currentIndexRef.current];
    const previewLimit = getPreviewLimitSeconds(track);
    const maxDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const maxTime = previewLimit ? Math.min(previewLimit, maxDuration || previewLimit) : maxDuration;
    const nextTime = clamp(seconds, 0, maxTime);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  const seekBy = useCallback((deltaSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const track = tracksRef.current[currentIndexRef.current];
    const previewLimit = getPreviewLimitSeconds(track);
    const maxDuration = Number.isFinite(audio.duration) ? audio.duration : Number.POSITIVE_INFINITY;
    const maxTime = previewLimit ? Math.min(previewLimit, maxDuration) : maxDuration;
    const nextTime = clamp((audio.currentTime || 0) + deltaSeconds, 0, maxTime);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const normalizedVolume = clamp(nextVolume, 0, 1);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = normalizedVolume;
      if (normalizedVolume > 0 && audio.muted) {
        audio.muted = false;
        setMuted(false);
      }
    }
    setVolumeState(normalizedVolume);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    const nextMuted = !muted;
    if (audio) {
      audio.muted = nextMuted;
    }
    setMuted(nextMuted);
  }, [muted]);

  const setRepeatMode = useCallback((nextRepeat: RepeatMode) => {
    repeatRef.current = nextRepeat;
    setRepeat(nextRepeat);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((current) => {
      const nextShuffle = !current;
      shuffleRef.current = nextShuffle;
      return nextShuffle;
    });
  }, []);

  useEffect(() => {
    if (!hasRestoredStateRef.current || !currentTrack) return;

    writePersistedState({
      trackId: currentTrack.id,
      volume,
      repeat,
      shuffle,
    });
  }, [currentTrack, volume, repeat, shuffle]);

  useEffect(() => {
    if (hasRestoredStateRef.current || !tracks.length) return;

    const persistedState = readPersistedState();
    if (!persistedState) {
      hasRestoredStateRef.current = true;
      return;
    }

    if (typeof persistedState.volume === "number") {
      setVolume(persistedState.volume);
    }

    if (persistedState.repeat) {
      repeatRef.current = persistedState.repeat;
      setRepeat(persistedState.repeat);
    }

    if (typeof persistedState.shuffle === "boolean") {
      shuffleRef.current = persistedState.shuffle;
      setShuffle(persistedState.shuffle);
    }

    if (persistedState.trackId && !options.initialTrackId) {
      const restoredIndex = tracks.findIndex((track) => track.id === persistedState.trackId);
      if (restoredIndex >= 0) {
        setTrackIndex(restoredIndex, false);
      }
    }

    hasRestoredStateRef.current = true;
  }, [options.initialTrackId, setTrackIndex, setVolume, tracks]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    onPreviewLimitReachedRef.current = options.onPreviewLimitReached;
  }, [options.onPreviewLimitReached]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = clamp(options.initialVolume ?? 1, 0, 1);
    audio.muted = false;
    audioRef.current = audio;

    const handleLoadStart = () => {
      setIsLoading(true);
      setCanPlay(false);
      setStatus("loading");
      setErrorMessage(null);
      setAudioDebugHelperText(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setCanPlay(true);
      setStatus(isPlayingRef.current ? "playing" : "canplay");
    };

    const handleTimeUpdate = () => {
      const track = tracksRef.current[currentIndexRef.current];
      const previewLimit = getPreviewLimitSeconds(track);
      if (track && previewLimit && audio.currentTime >= previewLimit) {
        audio.currentTime = previewLimit;
        audio.pause();
        isPlayingRef.current = false;
        wantsPlaybackRef.current = false;
        setIsPlaying(false);
        setCurrentTime(previewLimit);
        setStatus("paused");
        if (previewLimitReachedTrackIdRef.current !== track.id) {
          previewLimitReachedTrackIdRef.current = track.id;
          onPreviewLimitReachedRef.current?.(track);
        }
        return;
      }

      const now = performance.now();
      if (audio.paused) return;
      if (typeof document !== "undefined" && document.hidden) return;
      if (timeUpdateRafRef.current !== null || now - lastTimeUpdateRef.current < TIME_UPDATE_INTERVAL_MS) return;

      timeUpdateRafRef.current = window.requestAnimationFrame(() => {
        timeUpdateRafRef.current = null;
        lastTimeUpdateRef.current = performance.now();
        setCurrentTime(audio.currentTime || 0);
      });
    };

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      const trackCount = tracksRef.current.length;
      if (!trackCount) return;

      if (repeatRef.current === "one") {
        audio.currentTime = 0;
        if (hasUserInteractedRef.current) {
          playAfterSourceChangeRef.current = true;
          void playCurrentAudio();
        }
        return;
      }

      const isLastTrack = currentIndexRef.current >= trackCount - 1;
      if (repeatRef.current === "off" && isLastTrack && !shuffleRef.current) {
        isPlayingRef.current = false;
        wantsPlaybackRef.current = false;
        setIsPlaying(false);
        setStatus("paused");
        return;
      }

      const nextIndex = getNextIndex(currentIndexRef.current, trackCount, shuffleRef.current);
      if (nextIndex === currentIndexRef.current) {
        audio.currentTime = 0;
        if (hasUserInteractedRef.current) {
          void playCurrentAudio();
        }
        return;
      }

      setTrackIndex(nextIndex, hasUserInteractedRef.current);
    };

    const handleError = () => {
      setIsLoading(false);
      setCanPlay(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setStatus("error");
      logDevAudioError(audio, tracksRef.current[currentIndexRef.current]);
      setErrorMessage(buildAudioErrorMessage());
      setAudioDebugHelperText(getDevAudioHelperText());
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      if (timeUpdateRafRef.current !== null) {
        window.cancelAnimationFrame(timeUpdateRafRef.current);
        timeUpdateRafRef.current = null;
      }
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [options.initialVolume, playCurrentAudio, setTrackIndex]);

  // 의존을 트랙 객체가 아니라 id + audioUrl로 좁힌다. 접근권(이용권/구매) 갱신으로 트랙 객체가
  // 새로 만들어져도 재생 중인 오디오가 리셋되지 않게 하기 위함이다.
  const currentTrackId = currentTrack?.id || "";
  const currentTrackAudioUrl = currentTrack?.audioUrl || "";
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrackId) return;

    const shouldPlayAfterLoad = playAfterSourceChangeRef.current || (hasUserInteractedRef.current && isPlayingRef.current);
    playAfterSourceChangeRef.current = false;
    audio.pause();

    if (!currentTrackAudioUrl) {
      audio.removeAttribute("src");
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      setCanPlay(false);
      setIsLoading(false);
      setStatus("error");
      setErrorMessage(buildMissingAudioUrlMessage());
      setAudioDebugHelperText(getDevAudioHelperText());
      return;
    }

    previewLimitReachedTrackIdRef.current = "";
    setCurrentTime(0);
    setDuration(0);
    setCanPlay(false);
    setIsLoading(false);
    setStatus("idle");
    setErrorMessage(null);
    setAudioDebugHelperText(null);

    // 곧바로 재생할 때는 여기서 src를 비우고 load()하지 않는다.
    // playCurrentAudio가 src를 세팅하며 다시 load()하므로 이중 로드(불필요한 요청 1회)가 됐다.
    if (shouldPlayAfterLoad) {
      void playCurrentAudio();
      return;
    }

    audio.removeAttribute("src");
    audio.preload = "none";
    audio.load();
  }, [currentTrackAudioUrl, currentTrackId, playCurrentAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (typeof document === "undefined" || !nextTrack?.audioUrl) return;

    const origin = getUrlOrigin(nextTrack.audioUrl);
    if (!origin) return;

    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    link.dataset.musicPlayerPreconnect = "true";
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [nextTrack?.audioUrl]);

  useEffect(() => {
    if (
      typeof navigator === "undefined"
      || !("mediaSession" in navigator)
      || typeof MediaMetadata === "undefined"
      || !currentTrack
    ) return;

    const artwork = currentTrack.coverUrl
      ? [
          {
            src: currentTrack.coverUrl,
            sizes: "512x512",
            type: artworkTypeFromUrl(currentTrack.coverUrl),
          },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artistName,
      album: "Code Destiny Music",
      artwork,
    });
  }, [currentTrack]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? "playing" : currentTrack ? "paused" : "none";
  }, [currentTrack, isPlaying, status]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const setActionHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
      }
    };

    setActionHandler("play", () => {
      void play();
    });
    setActionHandler("pause", pause);
    setActionHandler("previoustrack", previous);
    setActionHandler("nexttrack", next);
    setActionHandler("seekbackward", () => seekBy(-5));
    setActionHandler("seekforward", () => seekBy(5));

    return () => {
      setActionHandler("play", null);
      setActionHandler("pause", null);
      setActionHandler("previoustrack", null);
      setActionHandler("nexttrack", null);
      setActionHandler("seekbackward", null);
      setActionHandler("seekforward", null);
    };
  }, [next, pause, play, previous, seekBy]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableShortcutTarget(event.target)) return;

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        if (isPlayingRef.current) {
          pause();
        } else {
          void play();
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(5);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setVolume(volume + 0.05);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setVolume(volume - 0.05);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pause, play, seekBy, setVolume, volume]);

  return {
    audioRef,
    tracks,
    currentTrack,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    repeat,
    shuffle,
    status,
    isLoading,
    canPlay,
    errorMessage,
    audioDebugHelperText,
    play,
    pause,
    next,
    previous,
    selectTrack,
    seek,
    seekBy,
    setVolume,
    setMuted,
    toggleMute,
    setRepeat: setRepeatMode,
    setShuffle,
    toggleShuffle,
  };
}
