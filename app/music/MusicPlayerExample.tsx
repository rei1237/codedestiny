"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { ArtistChips } from "./_components/ArtistChips";
import { LyricsDrawer } from "./_components/LyricsDrawer";
import { MiniPlayer } from "./_components/MiniPlayer";
import { MusicHeader } from "./_components/MusicHeader";
import { NowPlaying } from "./_components/NowPlaying";
import { TrackList } from "./_components/TrackList";
import { tracks as allTracks } from "./_data/musicManifest";
import { canDownloadTrack, hasTrackFullAccess, useMusicAccess } from "./_hooks/useMusicAccess";
import { useMusicPlayer } from "./_hooks/useMusicPlayer";
import { getMusicCopy } from "./_lib/musicCopy";
import {
  ARTIST_FILTERS,
  buildMusicShareUrl,
  copyMusicShareText,
  doesTrackMatchFilter,
  resolveCoverUrl,
  type ArtistFilterKey,
} from "./_lib/musicFormat";
import { useMusicPlaybackStore } from "./_stores/useMusicPlaybackStore";
import styles from "./music-lounge.module.css";

// 필터 칩 카운트는 매니페스트가 정적이므로 모듈 로드 때 한 번만 센다.
const FILTER_COUNTS = ARTIST_FILTERS.reduce((acc, filter) => {
  acc[filter.key] = allTracks.filter((track) => doesTrackMatchFilter(track, filter.key)).length;
  return acc;
}, {} as Record<ArtistFilterKey, number>);

function readSharedTrackId() {
  if (typeof window === "undefined") return "";
  const trackId = new URLSearchParams(window.location.search).get("track") || "";
  return trackId && allTracks.some((track) => track.id === trackId) ? trackId : "";
}

// 얇은 오케스트레이터. 프리렌더를 위해 useSearchParams·dynamic·Suspense 를 쓰지 않는다.
// 로케일은 "ko" 로 그려 하이드레이션을 맞추고 마운트 뒤 실제 로케일로 바꾼다(기존 패턴).
export default function MusicPlayerExample() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = useMemo(() => getMusicCopy(locale), [locale]);

  const selectTrackRef = useRef<((trackId: string, options?: { play?: boolean }) => void) | null>(null);
  const access = useMusicAccess({
    copy: {
      previewLimitReached: copy.previewLimitReached,
      purchaseFailed: copy.purchaseFailed,
      priceChanged: copy.priceChanged,
    },
    selectTrackRef,
  });

  const player = useMusicPlayer(access.playbackTracks, {
    initialVolume: 0.85,
    onPreviewLimitReached: access.handlePreviewLimitReached,
  });
  const { currentTrack, isPlaying, selectTrack, play, pause } = player;
  const currentTrackId = currentTrack?.id || "";
  const setPlaybackState = useMusicPlaybackStore((state) => state.setPlaybackState);

  const [filter, setFilter] = useState<ArtistFilterKey>("all");
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [miniVisible, setMiniVisible] = useState(false);
  const nowPlayingRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    selectTrackRef.current = selectTrack;
  }, [selectTrack]);

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

  // ?track=<id> 딥링크. 훅의 localStorage 복원 효과가 먼저 돌고 이 효과가 뒤에 돌아 딥링크가 이긴다.
  useEffect(() => {
    const sharedTrackId = readSharedTrackId();
    if (sharedTrackId) selectTrack(sharedTrackId, { play: false });
  }, [selectTrack]);

  useEffect(() => {
    setPlaybackState(currentTrackId, isPlaying);
  }, [currentTrackId, isPlaying, setPlaybackState]);

  useEffect(() => {
    access.ensureTrackAccess(currentTrack);
  }, [currentTrack, access.ensureTrackAccess]);

  // NowPlaying 이 화면 밖으로 나가면 미니 플레이어를 올린다(모바일·태블릿, ≥1024px 은 CSS 로 숨김).
  useEffect(() => {
    const target = nowPlayingRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setMiniVisible(!entry.isIntersecting);
    }, { threshold: 0, rootMargin: "-56px 0px 0px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const handleToggle = useCallback(() => {
    if (isPlaying) pause();
    else void play();
  }, [isPlaying, pause, play]);

  const handleSelect = useCallback((trackId: string) => {
    const track = allTracks.find((candidate) => candidate.id === trackId);
    if (track?.accessTier === "locked_preview") {
      void access.refreshMusicAccess([track]);
    }
    selectTrack(trackId, { play: true });
  }, [access.refreshMusicAccess, selectTrack]);

  const handleCycleRepeat = useCallback(() => {
    player.setRepeat(player.repeat === "off" ? "all" : player.repeat === "all" ? "one" : "off");
  }, [player.repeat, player.setRepeat]);

  // () => Promise<void> 는 () => void 프롭에 그대로 넣을 수 있다. 래핑하면 memo 가 매 렌더 깨진다.
  const handleShare = useCallback(async () => {
    if (!currentTrack) return;
    const trackUrl = buildMusicShareUrl(currentTrack.id);
    const mainUrl = new URL("/", window.location.origin).toString();
    const text = [
      `${currentTrack.artistName} - ${currentTrack.title}`,
      copy.shareText,
      `${copy.shareMain}: ${mainUrl}`,
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: copy.shareTitle(currentTrack.title), text, url: trackUrl });
      } else {
        await copyMusicShareText(`${text}\n${trackUrl}`);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
    }
  }, [copy, currentTrack]);

  const handleOpenNowPlaying = useCallback(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    nowPlayingRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  const handlePurchase = useCallback(() => {
    if (currentTrack) void access.purchaseTrack(currentTrack);
  }, [access.purchaseTrack, currentTrack]);

  const handleDownload = useCallback(() => {
    if (currentTrack) access.downloadTrack(currentTrack);
  }, [access.downloadTrack, currentTrack]);

  const closeLyrics = useCallback(() => setLyricsOpen(false), []);
  const toggleLyrics = useCallback(() => setLyricsOpen((open) => !open), []);

  const coverUrl = resolveCoverUrl(currentTrack);
  const hasFullAccess = currentTrack ? hasTrackFullAccess(currentTrack, access.accessByTrackId, access.passCoversAll) : false;
  const canDownload = currentTrack ? canDownloadTrack(currentTrack, access.accessByTrackId) : false;

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <MusicHeader copy={copy} />

        <NowPlaying
          ref={nowPlayingRef}
          copy={copy}
          track={currentTrack}
          coverUrl={coverUrl}
          isPlaying={isPlaying}
          status={player.status}
          errorMessage={player.errorMessage || ""}
          volume={player.volume}
          muted={player.muted}
          repeat={player.repeat}
          shuffle={player.shuffle}
          hasFullAccess={hasFullAccess}
          passCoversAll={access.passCoversAll}
          canDownload={canDownload}
          isPurchasing={Boolean(currentTrackId) && access.purchasingTrackId === currentTrackId}
          accessMessage={access.musicAccessMessage}
          shared={shared}
          lyricsOpen={lyricsOpen}
          onToggle={handleToggle}
          onPrevious={player.previous}
          onNext={player.next}
          onSeek={player.seek}
          onVolume={player.setVolume}
          onToggleMute={player.toggleMute}
          onCycleRepeat={handleCycleRepeat}
          onToggleShuffle={player.toggleShuffle}
          onShare={handleShare}
          onToggleLyrics={toggleLyrics}
          onPurchase={handlePurchase}
          onDownload={handleDownload}
        />

        {lyricsOpen && currentTrack ? (
          <LyricsDrawer
            copy={copy}
            title={currentTrack.title}
            lyricsLookupKey={currentTrack.lyricsLookupKey}
            onClose={closeLyrics}
          />
        ) : null}

        <ArtistChips label={copy.filterAria} value={filter} counts={FILTER_COUNTS} onChange={setFilter} />

        <TrackList copy={copy} tracks={access.playbackTracks} filter={filter} onSelect={handleSelect} />
      </div>

      <MiniPlayer
        copy={copy}
        track={currentTrack}
        coverUrl={coverUrl}
        isPlaying={isPlaying}
        visible={miniVisible}
        onToggle={handleToggle}
        onNext={player.next}
        onOpen={handleOpenNowPlaying}
      />
    </main>
  );
}
