"use client";

import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  ChevronDown,
  Download,
  Lock,

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
import { loadPaidServiceRuntimeGate, runBillingCoinGate } from "@/app/_lib/billing-client";
import { usePaidResume } from "@/app/hooks/usePaidResume";
import { runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { buildAssetsPublicUrl, buildMusicPublicUrl } from "@/lib/r2-public-url";
import { MUSIC_TRACK_UNLOCK_COIN_COST, MUSIC_TRACK_UNLOCK_PRICE_KRW } from "@/lib/music-access-policy";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { allTracks, type ArtistKey, type Track } from "./_data/musicManifest";
import { useMusicPlayer, type RepeatMode } from "./_hooks/useMusicPlayer";
import { useMusicPlaybackStore } from "./_stores/useMusicPlaybackStore";
import styles from "./moon-music-player.module.css";

type MusicPlayerExampleProps = {
  ambientAssetKey?: string;
  presentation?: "full" | "compact";
};

type PlaylistThemeMode = "all" | ArtistKey;

type PlayerStyle = CSSProperties & {
  "--asset-ambient-image"?: string;
};
type DockProgressStyle = CSSProperties & {
  "--cd-dock-progress"?: number;
};
type AlbumImageMode = "default" | "human";

type HumanModeCoverMap = {
  yeoni: string;
  dest1novaVol1: string;
  dest1novaVol2: string;
};
type MusicAccessEntry = {
  trackId: string;
  audioSourceKey: string;
  featureKey: string;
  hasFullAccess: boolean;
  canDownload?: boolean;
  audioUrl?: string;
  downloadUrl?: string;
  code?: string;
};
type MusicAccessMap = Record<string, MusicAccessEntry>;
type MusicAccessResponse = {
  ok?: boolean;
  passCoversAll?: boolean;
  tracks?: MusicAccessEntry[];
  reason?: unknown;
  retryable?: unknown;
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
  dest1novaVol2: "\ub370\uc2a4\ud2f0\ub178\ubc14 \uc778\uac04\ubc84\uc804 \uc568\ubc942.webp",
};

const PLAYLIST_FALLBACK_COPY: Record<"ko" | "en" | "ja" | "zh-CN" | "zh-TW", { kicker: string; title: string; subtitle: string; emptyTitle: string; emptyBody: string }> = {
  ko: {
    kicker: "달빛 선곡",
    title: "플레이리스트를 여는 중",
    subtitle: "잠시만 기다려 주세요.",
    emptyTitle: "달빛 음악실이 곧 열립니다.",
    emptyBody: "첫 곡은 바로 들을 수 있도록 준비하고 있어요.",
  },
  en: {
    kicker: "Moonlit picks",
    title: "Opening the playlist",
    subtitle: "Please wait a moment.",
    emptyTitle: "The moonlit music room is about to open.",
    emptyBody: "The first track is being prepared for instant listening.",
  },
  ja: {
    kicker: "月明かりの選曲",
    title: "プレイリストを開いています",
    subtitle: "少々お待ちください。",
    emptyTitle: "月明かりの音楽室がまもなく開きます。",
    emptyBody: "最初の曲をすぐに聴けるよう準備しています。",
  },
  "zh-CN": {
    kicker: "月光选曲",
    title: "正在打开播放列表",
    subtitle: "请稍候。",
    emptyTitle: "月光音乐室即将开启。",
    emptyBody: "第一首曲目正在准备，随时可以聆听。",
  },
  "zh-TW": {
    kicker: "月光選曲",
    title: "正在開啟播放清單",
    subtitle: "請稍候。",
    emptyTitle: "月光音樂室即將開啟。",
    emptyBody: "第一首曲目正在準備，隨時可以聆聽。",
  },
};

function getPlaylistFallbackCopy() {
  const locale = getCurrentLoadingLocale();
  return PLAYLIST_FALLBACK_COPY[locale as keyof typeof PLAYLIST_FALLBACK_COPY] || PLAYLIST_FALLBACK_COPY.en;
}

function MusicPlaylistFallback() {
  const copy = getPlaylistFallbackCopy();
  return (
    <aside className={styles.playlistPanel} aria-busy="true">
      <div className={styles.playlistHeaderButton}>
        <span className={styles.playlistHeaderText}>
          <span className={styles.playlistKicker}>
            <Moon size={13} aria-hidden />
            {copy.kicker}
          </span>
          <span className={styles.playlistTitle}>{copy.title}</span>
          <span className={styles.playlistSubtitle}>{copy.subtitle}</span>
        </span>
      </div>
      <div className={styles.playlistBody}>
        <div className={styles.playlistEmpty}>
          <strong>{copy.emptyTitle}</strong>
          <span>{copy.emptyBody}</span>
        </div>
      </div>
    </aside>
  );
}

const MusicPlaylistPanel = dynamic(() => import("./MusicPlaylistPanel"), {
  loading: MusicPlaylistFallback,
});

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

function buildMusicApiUrl(path: "audio" | "download", track: Track) {
  const searchParams = new URLSearchParams();
  searchParams.set("key", track.audioSourceKey);
  if (track.purchaseFeatureKey) {
    searchParams.set("featureKey", track.purchaseFeatureKey);
  }
  return `/api/music/${path}?${searchParams.toString()}`;
}

function triggerTrackDownload(downloadUrl: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  anchor.download = fileName;

  document.body.appendChild(anchor);
  anchor.click();

  window.setTimeout(() => {
    if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
  }, 0);
}

// passCoversAll: 서버가 "이용권이 전곡을 덮는다"고 알려준 상태. 곡별 확인 없이 전곡을 열어준다.
function hasTrackFullAccess(track: Track, accessByTrackId: MusicAccessMap, passCoversAll = false) {
  if (track.accessTier === "free_full") return true;
  if (passCoversAll) return true;
  return Boolean(track.id && accessByTrackId[track.id]?.hasFullAccess);
}

// 다운로드는 이용권 커버로 열리지 않는다 — 단건결제·월정석으로 실제 구매한 곡만 파일을 받을 수 있다.
// downloadRequiresPurchase 트랙은 재생이 free_full로 무료여도 다운로드는 서버가 확인한 구매(canDownload)에만 허용한다.
function canDownloadTrack(track: Track, accessByTrackId: MusicAccessMap) {
  if (track.accessTier === "free_full" && !track.downloadRequiresPurchase) return true;
  return Boolean(track.id && accessByTrackId[track.id]?.canDownload);
}

function buildPlaybackTrack(track: Track, accessByTrackId: MusicAccessMap, passCoversAll: boolean): Track {
  // free_full 트랙은 매니페스트 audioUrl이 이미 공개 CDN 직결이다.
  // 워커 프록시(/api/music/audio)로 재작성하면 클라→워커→R2→워커 왕복이 배가돼 첫 재생이 늦어진다.
  // 재생 지연 제거를 위해 그대로 반환한다(다운로드 결제 게이팅은 canDownload로 별도 처리).
  if (track.accessTier === "free_full") return track;
  if (!hasTrackFullAccess(track, accessByTrackId, passCoversAll)) return track;

  return {
    ...track,
    accessTier: "free_full",
    previewLimitSeconds: undefined,
    audioUrl: accessByTrackId[track.id]?.audioUrl || buildMusicApiUrl("audio", track),
  };
}

function buildDownloadUrl(track: Track, accessByTrackId: MusicAccessMap) {
  if (!canDownloadTrack(track, accessByTrackId)) return "";
  return accessByTrackId[track.id]?.downloadUrl || buildMusicApiUrl("download", track);
}

function buildFullAccessEntry(track: Track, entry: Partial<MusicAccessEntry> = {}): MusicAccessEntry {
  return {
    trackId: track.id,
    audioSourceKey: entry.audioSourceKey || track.audioSourceKey,
    featureKey: entry.featureKey || track.purchaseFeatureKey || "",
    hasFullAccess: true,
    // 이 엔트리는 단건결제/월정석 구매 성공 직후에만 만들어지므로 다운로드까지 열린다.
    canDownload: true,
    audioUrl: entry.audioUrl || buildMusicApiUrl("audio", track),
    downloadUrl: entry.downloadUrl || buildMusicApiUrl("download", track),
    code: entry.code || "FULL_ACCESS",
  };
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

function getTrackCoverShape(track: Track) {
  return track.artistKey === "neo" || track.artistKey === "dest1nova" ? "wide" : "square";
}

// 곡 수는 매니페스트에서 파생시킨다 — 문구에 숫자를 직접 적으면 곡이 늘어날 때 어긋난다.
const TOTAL_TRACK_COUNT = allTracks.length;

// 가격 문구는 정본 상수에서 만든다 — 예전에는 로케일마다 "300원"을 손으로 적어 두어,
// 가격을 올리면 화면은 구가격을 광고하면서 결제는 신가격으로 나가는 드리프트가 생겼다.
const MUSIC_TRACK_PRICE_LABEL = MUSIC_TRACK_UNLOCK_PRICE_KRW.toLocaleString("ko-KR");

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
    heroKicker: "MOON MUSIC",
    heroTitle: `달빛 아래 열린 ${TOTAL_TRACK_COUNT}곡의 운명 플레이리스트`,
    heroText: "DEST1NOVA, NEO, YEONI, LUNA BLOOM의 별빛 무드를 한곳에 모은 Code Destiny의 음악 서고.",
    heroPrimary: "전체 재생",
    heroSecondary: "무드별 탐색",
    featuredKicker: "오늘 밤 먼저 열리는 곡",
    featuredMood: "지금 이 달빛에 가장 가까운 무드가 흐릅니다.",
    save: "저장",
    saved: "저장됨",
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
    previewBadge: "40\ucd08 \ubbf8\ub9ac\ub4e3\uae30",
    fullAccessBadge: "\uc804\uccb4\ub4e3\uae30 \uc5f4\ub9bc",
    passAccessBadge: "\uc774\uc6a9\uad8c\uc73c\ub85c \uc804\uace1 \uc5f4\ub9bc",
    buyFullTrack: `\uc804\uccb4\ub4e3\uae30 ${MUSIC_TRACK_PRICE_LABEL}\uc6d0`,
    buyingFullTrack: "\uacb0\uc81c \ud655\uc778 \uc911",
    buyForDownload: `\ub2e4\uc6b4\ub85c\ub4dc \uad6c\ub9e4 ${MUSIC_TRACK_PRICE_LABEL}\uc6d0`,
    downloadTrack: "\ub2e4\uc6b4\ub85c\ub4dc",
    previewLimitReached: "40\ucd08 \ubbf8\ub9ac\ub4e3\uae30\uac00 \ub05d\ub0ac\uc2b5\ub2c8\ub2e4.",
    purchaseFailed: "\uacb0\uc81c\ub97c \uc644\ub8cc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    priceChanged: "\uac00\uaca9\uc774 \ubcc0\uacbd\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \uc0c8\ub85c\uace0\uce68 \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
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
    heroKicker: "MOON MUSIC",
    heroTitle: `${TOTAL_TRACK_COUNT} fate tracks opened under moonlight`,
    heroText: "A Code Destiny music archive gathering the starlit moods of DEST1NOVA, NEO, YEONI, and LUNA BLOOM.",
    heroPrimary: "Play all",
    heroSecondary: "Explore moods",
    featuredKicker: "First track under tonight's moon",
    featuredMood: "The mood closest to this moonlight is flowing now.",
    save: "Save",
    saved: "Saved",
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
    previewBadge: "40 sec preview",
    fullAccessBadge: "Full track open",
    passAccessBadge: "Open with your pass",
    buyFullTrack: `Full track ${MUSIC_TRACK_PRICE_LABEL} KRW`,
    buyingFullTrack: "Checking payment",
    buyForDownload: `Buy to download ${MUSIC_TRACK_PRICE_LABEL} KRW`,
    downloadTrack: "Download",
    previewLimitReached: "The 40 second preview has ended.",
    purchaseFailed: "Payment was not completed.",
    priceChanged: "The price has changed. Please refresh and try again.",
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
    heroKicker: "MOON MUSIC",
    heroTitle: `月明かりの下で開く${TOTAL_TRACK_COUNT}曲の運命プレイリスト`,
    heroText: "DEST1NOVA、NEO、YEONI、LUNA BLOOMの星明かりのムードを集めたCode Destinyの音楽書庫。",
    heroPrimary: "すべて再生",
    heroSecondary: "ムードで探す",
    featuredKicker: "今夜まず開く曲",
    featuredMood: "この月明かりにいちばん近いムードが流れています。",
    save: "保存",
    saved: "保存済み",
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
    previewBadge: "40秒プレビュー",
    fullAccessBadge: "全曲再生が開放されています",
    passAccessBadge: "利用権で全曲開放中",
    buyFullTrack: `全曲再生 ${MUSIC_TRACK_PRICE_LABEL}ウォン`,
    buyingFullTrack: "決済を確認しています",
    buyForDownload: `ダウンロード購入 ${MUSIC_TRACK_PRICE_LABEL}ウォン`,
    downloadTrack: "ダウンロード",
    previewLimitReached: "40秒プレビューが終了しました。",
    purchaseFailed: "決済が完了しませんでした。",
    priceChanged: "価格が変更されました。更新後にもう一度お試しください。",
  },
  "zh-CN": {
    lyricsAria: "当前曲目歌词",
    lyrics: "歌词",
    lyricsLoading: "歌词加载中...",
    lyricsEmpty: "歌词数据尚未准备好。",
    statusLoading: "正在唤来月光",
    statusWaiting: "等待月光开启",
    statusPlaying: "此刻流淌的月光",
    statusPaused: "月光暂时停留",
    playerAria: "Code Destiny 音乐播放器",
    pause: "暂停",
    play: "播放",
    nextTrack: "下一曲",
    previousTrack: "上一曲",
    listeningMode: "聆听模式",
    playlistHint: "✦ 月光播放列表",
    albumModeLabel: "专辑模式",
    albumModeDefault: "默认",
    albumModeHuman: "人声",
    close: "关闭",
    heroKicker: "MOON MUSIC",
    heroTitle: `月光下开启的${TOTAL_TRACK_COUNT}首命运歌单`,
    heroText: "汇聚 DEST1NOVA、NEO、YEONI、LUNA BLOOM 星光氛围的 Code Destiny 音乐书库。",
    heroPrimary: "全部播放",
    heroSecondary: "按氛围探索",
    featuredKicker: "今晚率先开启的曲目",
    featuredMood: "此刻最贴近这片月光的氛围正在流淌。",
    save: "收藏",
    saved: "已收藏",
    shareCurrent: "分享当前曲目",
    copied: "已复制",
    share: "分享",
    defaultMood: "月光时刻",
    repeat: (mode: RepeatMode) => `循环 ${mode}`,
    shuffleOn: "随机播放：开",
    shuffleOff: "随机播放：关",
    unmute: "取消静音",
    mute: "静音",
    volume: "音量",
    shareText: "在 Code Destiny 月光音乐库中聆听。",
    shareMain: "Code Destiny 首页",
    shareTitle: (title: string) => `Code Destiny Music - ${title}`,
    previewBadge: "40秒试听",
    fullAccessBadge: "已开放完整播放",
    passAccessBadge: "已用权益开放完整播放",
    buyFullTrack: `完整播放 ${MUSIC_TRACK_PRICE_LABEL}韩元`,
    buyingFullTrack: "正在确认支付",
    buyForDownload: `购买下载 ${MUSIC_TRACK_PRICE_LABEL}韩元`,
    downloadTrack: "下载",
    previewLimitReached: "40秒试听已结束。",
    purchaseFailed: "支付未完成。",
    priceChanged: "价格已变更。请刷新后重试。",
  },
  "zh-TW": {
    lyricsAria: "目前曲目歌詞",
    lyrics: "歌詞",
    lyricsLoading: "歌詞載入中...",
    lyricsEmpty: "歌詞資料尚未準備好。",
    statusLoading: "正在喚來月光",
    statusWaiting: "等待月光開啟",
    statusPlaying: "此刻流淌的月光",
    statusPaused: "月光暫時停留",
    playerAria: "Code Destiny 音樂播放器",
    pause: "暫停",
    play: "播放",
    nextTrack: "下一首",
    previousTrack: "上一首",
    listeningMode: "聆聽模式",
    playlistHint: "✦ 月光播放清單",
    albumModeLabel: "專輯模式",
    albumModeDefault: "預設",
    albumModeHuman: "人聲",
    close: "關閉",
    heroKicker: "MOON MUSIC",
    heroTitle: `月光下開啟的${TOTAL_TRACK_COUNT}首命運歌單`,
    heroText: "匯聚 DEST1NOVA、NEO、YEONI、LUNA BLOOM 星光氛圍的 Code Destiny 音樂書庫。",
    heroPrimary: "全部播放",
    heroSecondary: "依氛圍探索",
    featuredKicker: "今晚率先開啟的曲目",
    featuredMood: "此刻最貼近這片月光的氛圍正在流淌。",
    save: "收藏",
    saved: "已收藏",
    shareCurrent: "分享目前曲目",
    copied: "已複製",
    share: "分享",
    defaultMood: "月光時刻",
    repeat: (mode: RepeatMode) => `循環 ${mode}`,
    shuffleOn: "隨機播放：開",
    shuffleOff: "隨機播放：關",
    unmute: "取消靜音",
    mute: "靜音",
    volume: "音量",
    shareText: "在 Code Destiny 月光音樂庫中聆聽。",
    shareMain: "Code Destiny 首頁",
    shareTitle: (title: string) => `Code Destiny Music - ${title}`,
    previewBadge: "40秒試聽",
    fullAccessBadge: "已開放完整播放",
    passAccessBadge: "已用權益開放完整播放",
    buyFullTrack: `完整播放 ${MUSIC_TRACK_PRICE_LABEL}韓元`,
    buyingFullTrack: "正在確認付款",
    buyForDownload: `購買下載 ${MUSIC_TRACK_PRICE_LABEL}韓元`,
    downloadTrack: "下載",
    previewLimitReached: "40秒試聽已結束。",
    purchaseFailed: "付款未完成。",
    priceChanged: "價格已變更。請重新整理後再試一次。",
  },
} as const;

function getMusicPlayerCopy(locale: LoadingLocale) {
  return MUSIC_PLAYER_TEXT_TRANSLATIONS[locale as keyof typeof MUSIC_PLAYER_TEXT_TRANSLATIONS] || MUSIC_PLAYER_TEXT_TRANSLATIONS.en;
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

const MOON_LIBRARY_BADGES = ["5 moods", "Moon curated", "DEST1NOVA vol.2"] as const;
const WAVEFORM_BARS = Array.from({ length: 28 }, (_, index) => index);

type MoonWaveformProps = {
  isPlaying: boolean;
};

function MoonWaveform({ isPlaying }: MoonWaveformProps) {
  return (
    <span className={styles.moonWaveform} data-playing={isPlaying ? "true" : "false"} aria-hidden>
      {WAVEFORM_BARS.map((bar) => (
        <i key={bar} style={{ "--wave-index": bar } as CSSProperties} />
      ))}
    </span>
  );
}

type MoonLibraryHeroProps = {
  tracksCount: number;
  copy: ReturnType<typeof getMusicPlayerCopy>;
  onPlayAll: () => void;
  onExploreMoods: () => void;
};

function MoonLibraryHero({ tracksCount, copy, onPlayAll, onExploreMoods }: MoonLibraryHeroProps) {
  return (
    <section className={styles.libraryHero} aria-label={copy.heroKicker}>
      <div className={styles.libraryHeroCopy}>
        <span className={styles.libraryHeroKicker}>{copy.heroKicker}</span>
        <h1 className={styles.libraryHeroTitle}>{copy.heroTitle}</h1>
        <p className={styles.libraryHeroText}>{copy.heroText}</p>
        <div className={styles.libraryHeroActions}>
          <button className={styles.libraryHeroPrimary} type="button" onClick={onPlayAll}>
            <Play size={18} aria-hidden />
            <span>{copy.heroPrimary}</span>
          </button>
          <button className={styles.libraryHeroSecondary} type="button" onClick={onExploreMoods}>
            <Moon size={17} aria-hidden />
            <span>{copy.heroSecondary}</span>
          </button>
        </div>
        <div className={styles.libraryHeroMeta} aria-label="Moon Music metadata">
          <span>{tracksCount} tracks</span>
          {MOON_LIBRARY_BADGES.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

type FeaturedTrackCardProps = {
  track: Track;
  coverUrl: string;
  coverFailed: boolean;
  isPlaying: boolean;
  isSaved: boolean;
  hasFullAccess: boolean;
  canDownload: boolean;
  isPurchasing: boolean;
  listeningStatusLabel: string;
  copy: ReturnType<typeof getMusicPlayerCopy>;
  canToggleAlbumMode: boolean;
  albumModeSwitchLabel: string;
  currentTrackAlbumMode: AlbumImageMode;
  nowPlayingShared: boolean;
  onAlbumModeToggle: () => void;
  onCoverLoad: () => void;
  onCoverError: () => void;
  onPlayToggle: () => void;
  onPurchase: () => void;
  onDownload: () => void;
  onSaveToggle: () => void;
  onShare: () => void;
};

function FeaturedTrackCard({
  track,
  coverUrl,
  coverFailed,
  isPlaying,
  isSaved,
  hasFullAccess,
  canDownload,
  isPurchasing,
  listeningStatusLabel,
  copy,
  canToggleAlbumMode,
  albumModeSwitchLabel,
  currentTrackAlbumMode,
  nowPlayingShared,
  onAlbumModeToggle,
  onCoverLoad,
  onCoverError,
  onPlayToggle,
  onPurchase,
  onDownload,
  onSaveToggle,
  onShare,
}: FeaturedTrackCardProps) {
  const isLockedPreview = !hasFullAccess && track.accessTier === "locked_preview";

  return (
    <section className={styles.featuredTrackCard} data-playing={isPlaying ? "true" : "false"} data-artist={track.artistKey}>
      <div className={styles.featuredCover} data-cover-shape={getTrackCoverShape(track)} data-fallback={coverFailed || !coverUrl ? "true" : "false"}>
        {coverUrl ? (
          <Image
            className={styles.featuredCoverImage}
            src={coverUrl}
            alt={`${track.artistName} - ${track.title} cover`}
            width={320}
            height={320}
            sizes="(max-width: 640px) 120px, 220px"
            placeholder="blur"
            blurDataURL={MOON_COVER_BLUR_DATA_URL}
            unoptimized
            data-hidden={coverFailed ? "true" : "false"}
            onLoad={onCoverLoad}
            onError={onCoverError}
          />
        ) : null}
        <span className={styles.featuredCoverFallback} aria-hidden />
      </div>

      <div className={styles.featuredCopy}>
        <span className={styles.featuredKicker}>
          <span className={styles.equalizerIcon} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          {copy.featuredKicker}
        </span>
        <h2>{track.title}</h2>
        <p className={styles.featuredArtist}>{track.artistName}</p>
        <p className={styles.featuredMood}>{track.mood || copy.featuredMood}</p>
        <span className={styles.musicAccessBadge} data-access={hasFullAccess ? "full" : "preview"}>
          {/* 배지는 재생 접근만 표시한다 — 다운로드 구매 여부는 아래 구매/다운로드 버튼으로 구분된다. */}
          {hasFullAccess ? copy.fullAccessBadge : copy.previewBadge}
        </span>
        <MoonWaveform isPlaying={isPlaying} />
        <span className={styles.featuredStatus} aria-live="polite">{listeningStatusLabel}</span>
      </div>

      <div className={styles.featuredActions}>
        <button className={styles.featuredPlayButton} type="button" onClick={onPlayToggle} aria-label={isPlaying ? copy.pause : copy.play}>
          {isPlaying ? <Pause size={22} aria-hidden /> : <Play size={22} aria-hidden />}
        </button>
        <button
          className={styles.featuredSaveButton}
          type="button"
          onClick={onSaveToggle}
          aria-label={isSaved ? copy.saved : copy.save}
          aria-pressed={isSaved}
          data-saved={isSaved ? "true" : "false"}
        >
          <Bookmark size={18} aria-hidden />
          <span>{isSaved ? copy.saved : copy.save}</span>
        </button>
        {isLockedPreview || !canDownload ? (
          <button
            className={styles.purchaseTrackButton}
            type="button"
            onClick={onPurchase}
            disabled={isPurchasing}
          >
            <Lock size={16} aria-hidden />
            <span>{isPurchasing ? copy.buyingFullTrack : (isLockedPreview ? copy.buyFullTrack : copy.buyForDownload)}</span>
          </button>
        ) : (
          <button
            className={styles.downloadTrackButton}
            type="button"
            onClick={onDownload}
          >
            <Download size={16} aria-hidden />
            <span>{copy.downloadTrack}</span>
          </button>
        )}
        {canToggleAlbumMode ? (
          <button
            className={styles.albumModeButton}
            type="button"
            onClick={onAlbumModeToggle}
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
          onClick={onShare}
          aria-label={copy.shareCurrent}
          data-shared={nowPlayingShared ? "true" : "false"}
        >
          <Share2 size={16} aria-hidden />
          <span>{nowPlayingShared ? copy.copied : copy.share}</span>
        </button>
      </div>
    </section>
  );
}

type StickyMoonPlayerProps = {
  track: Track;
  isPlaying: boolean;
  muted: boolean;
  progressPercent: number;
  copy: ReturnType<typeof getMusicPlayerCopy>;
  onPrevious: () => void;
  onPlayToggle: () => void;
  onNext: () => void;
  onMuteToggle: () => void;
};

function StickyMoonPlayer({
  track,
  isPlaying,
  muted,
  progressPercent,
  copy,
  onPrevious,
  onPlayToggle,
  onNext,
  onMuteToggle,
}: StickyMoonPlayerProps) {
  return (
    <aside className={styles.nowPlayingDock} data-playing={isPlaying ? "true" : "false"} aria-label={copy.playerAria}>
      <span className={styles.nowPlayingDockGlow} aria-hidden />
      <span className={styles.nowPlayingDockCover} aria-hidden>
        <span className={styles.nowPlayingDockFallback} />
      </span>
      <span className={styles.nowPlayingDockMeta}>
        <span className={styles.nowPlayingDockTitle}>
          <span>{track.title}</span>
        </span>
        <span className={styles.nowPlayingDockArtist}>{track.artistName}</span>
      </span>
      <span className={styles.nowPlayingDockControls}>
        <button type="button" onClick={onPrevious} aria-label={copy.previousTrack}>
          <SkipBack size={18} aria-hidden />
        </button>
        <button className={styles.nowPlayingDockPlay} type="button" onClick={onPlayToggle} aria-label={isPlaying ? copy.pause : copy.play}>
          {isPlaying ? <Pause size={20} aria-hidden /> : <Play size={20} aria-hidden />}
        </button>
        <button type="button" onClick={onNext} aria-label={copy.nextTrack}>
          <SkipForward size={18} aria-hidden />
        </button>
        <button type="button" onClick={onMuteToggle} aria-label={muted ? copy.unmute : copy.mute}>
          {muted ? <VolumeX size={17} aria-hidden /> : <Volume2 size={17} aria-hidden />}
        </button>
      </span>
      <span className={styles.nowPlayingDockProgress} aria-hidden>
        <span style={{ "--cd-dock-progress": progressPercent / 100 } as DockProgressStyle} />
      </span>
    </aside>
  );
}

export default function MusicPlayerExample({ ambientAssetKey, presentation = "full" }: MusicPlayerExampleProps) {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getMusicPlayerCopy(locale);
  const sharedTrackId = searchParams?.get("track") || undefined;
  const initialSharedTrackId = useMemo(() => {
    return sharedTrackId && allTracks.some((track) => track.id === sharedTrackId) ? sharedTrackId : undefined;
  }, [sharedTrackId]);
  const [accessByTrackId, setAccessByTrackId] = useState<MusicAccessMap>({});
  const [passCoversAll, setPassCoversAll] = useState(false);
  const [purchasingTrackId, setPurchasingTrackId] = useState("");
  // 결제 중복 클릭 가드. purchasingTrackId(state)는 리렌더 뒤에야 버튼을 비활성화하므로 늦다.
  const purchaseBusyRef = useRef(false);
  const [musicAccessMessage, setMusicAccessMessage] = useState("");
  const accessRefreshTrackIdsRef = useRef<Record<string, string>>({});
  const refreshMusicAccess = useCallback(async (tracksToRefresh: readonly Track[] = allTracks) => {
    // 잠금 미리듣기 트랙 + 재생은 무료지만 다운로드 구매가 필요한 트랙의 곡별 다운로드 권한을 서버에서 받아온다.
    const gatedTracks = tracksToRefresh.filter((track) => (
      Boolean(track.purchaseFeatureKey) && (track.accessTier === "locked_preview" || track.downloadRequiresPurchase)
    ));
    if (!gatedTracks.length) return;
    const gatedTrackById = new Map(gatedTracks.map((track) => [track.id, track]));

    // 일시적 DB 장애(503)가 "이용권 없음"으로 굳어 전곡이 미리듣기로 떨어지지 않게 짧게 재시도한다.
    // 확정 실패(401/402 등)는 재시도하지 않고 그대로 반영한다.
    const payload = await runAccessCheckWithTransientRetry(async () => {
      const response = await fetch("/api/music/access", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: gatedTracks.map((track) => ({
            trackId: track.id,
            audioSourceKey: track.audioSourceKey,
            featureKey: track.purchaseFeatureKey,
          })),
        }),
      });
      const data = await response.json().catch(() => null) as MusicAccessResponse | null;
      return { status: response.status, data };
    }, { maxAttempts: 3, baseDelayMs: 700 }).then((result) => result.data).catch(() => null);

    if (!Array.isArray(payload?.tracks)) return;

    if (payload?.passCoversAll === true) setPassCoversAll(true);

    setAccessByTrackId((current) => {
      const next = { ...current };
      for (const entry of payload.tracks || []) {
        if (!entry?.trackId) continue;
        const currentEntry = current[entry.trackId];
        if (currentEntry?.hasFullAccess && entry.hasFullAccess !== true) continue;
        const sourceTrack = gatedTrackById.get(entry.trackId);
        next[entry.trackId] = entry.hasFullAccess && sourceTrack
          ? { ...buildFullAccessEntry(sourceTrack, entry), canDownload: entry.canDownload === true }
          : entry;
      }
      return next;
    });
  }, []);
  const markTrackFullAccess = useCallback((track: Track) => {
    if (!track.id || !track.purchaseFeatureKey) return;

    setAccessByTrackId((current) => ({
      ...current,
      [track.id]: buildFullAccessEntry(track, current[track.id]),
    }));
  }, []);
  // 접근권이 갱신돼도 잠금 상태가 그대로인 트랙은 같은 객체 참조를 유지해야 한다.
  // 참조가 매번 바뀌면 useMusicPlayer의 소스 전환 이펙트가 재실행돼 재생 중인 오디오가 리셋된다.
  const playbackTrackCacheRef = useRef(new Map<string, { source: Track; result: Track }>());
  const playbackTracks = useMemo(() => {
    const cache = playbackTrackCacheRef.current;
    return allTracks.map((track) => {
      const built = buildPlaybackTrack(track, accessByTrackId, passCoversAll);
      const cached = cache.get(track.id);
      if (cached && cached.source === track && cached.result.audioUrl === built.audioUrl && cached.result.accessTier === built.accessTier) {
        return cached.result;
      }
      cache.set(track.id, { source: track, result: built });
      return built;
    });
  }, [accessByTrackId, passCoversAll]);
  const handlePreviewLimitReached = useCallback((track: Track) => {
    setMusicAccessMessage(getMusicPlayerCopy(getCurrentLoadingLocale()).previewLimitReached);
    // 미리듣기 URL은 접근 판정을 거치지 않고 서빙된다(성능 최적화). 초기 접근 조회가 일시 장애로
    // 실패했다면 이용권 보유자도 여기서 40초에 끊기므로, 이 순간 한 번 더 접근권을 확인해 자가 복구한다.
    if (track?.id) delete accessRefreshTrackIdsRef.current[track.id];
    void refreshMusicAccess(allTracks);
  }, [refreshMusicAccess]);
  const player = useMusicPlayer(playbackTracks, {
    initialVolume: 0.85,
    initialTrackId: initialSharedTrackId,
    onPreviewLimitReached: handlePreviewLimitReached,
  });
  const setPlaybackState = useMusicPlaybackStore((state) => state.setPlaybackState);
  const selectTrack = player.selectTrack;
  const sharedTrackSyncAttemptsRef = useRef(0);
  const rawProgressMax = player.duration || 0;
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, boolean>>({});
  const [isListeningModeOpen, setIsListeningModeOpen] = useState(presentation === "full");
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [nowPlayingShared, setNowPlayingShared] = useState(false);
  const [savedTrackIds, setSavedTrackIds] = useState<Record<string, true>>({});
  const [playlistThemeMode, setPlaylistThemeMode] = useState<PlaylistThemeMode>("all");
  const [albumImageModeByArtist, setAlbumImageModeByArtist] = useState<Partial<Record<ArtistKey, AlbumImageMode>>>({});
  const currentTrack = player.currentTrack;
  const currentTrackId = currentTrack?.id || "";
  const isCurrentTrackSaved = Boolean(currentTrackId && savedTrackIds[currentTrackId]);
  const currentTrackAlbumMode = currentTrack ? getAlbumCoverMode(albumImageModeByArtist, currentTrack.artistKey) : "default";
  const coverFailed = Boolean(!currentTrack || !resolveTrackAlbumCoverUrl(currentTrack, currentTrackAlbumMode, HUMAN_MODE_COVER_URLS) || (currentTrackId && failedCoverIds[currentTrackId]));
  const playlistTracks = useMemo(() => {
    return player.tracks.map((track) => ({
      ...track,
      coverUrl: "",
    }));
  }, [player.tracks]);
  const effectiveArtistTheme = playlistThemeMode === "all" ? player.currentTrack?.artistKey : playlistThemeMode;
  const artistThemeClass = effectiveArtistTheme === "dest1nova"
    ? styles.dest1novaMode
    : effectiveArtistTheme === "lunabloom"
      ? styles.lunabloomMode
      : effectiveArtistTheme === "yeoni" || effectiveArtistTheme === "destinycafe"
        ? styles.yeoniMode
        : styles.neoMode;
  const isCompact = presentation === "compact";
  const canToggleAlbumMode = Boolean(currentTrack && canUseHumanCoverMode(currentTrack.artistKey));
  const albumModeSwitchLabel = currentTrackAlbumMode === "human" ? copy.albumModeDefault : copy.albumModeHuman;

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

  // 결제 런타임(/js/destiny-profile.js)은 구매 버튼을 누른 뒤에야 내려받으므로, 클릭~결제창 사이에
  // 스크립트 다운로드가 통째로 끼어든다. useCoinGate 와 같은 방식으로 미리 받아 두되, 유휴 시점으로
  // 미뤄 초기 렌더·오디오 재생을 방해하지 않는다(이 페이지는 useCoinGate 를 쓰지 않아 프리워밍이 없었다).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prewarm = () => { void loadPaidServiceRuntimeGate(); };
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      const handle = idle(prewarm, { timeout: 4000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(prewarm, 2000);
    return () => window.clearTimeout(timer);
  }, []);

  // 서버가 전곡을 Mongo 왕복 2회로 한 번에 판정하므로, 우선 12곡 → 7초 뒤 전곡으로 나눠 부르던
  // 2단계 조회를 전곡 1회로 합친다(요청 2회 → 1회, 이용권 보유자는 곡별 확인 자체가 사라진다).
  useEffect(() => {
    if (typeof window === "undefined") return;
    void refreshMusicAccess(allTracks);
  }, [refreshMusicAccess]);

  useEffect(() => {
    if (passCoversAll) return;

    const track = player.currentTrack;
    if (!track || track.accessTier !== "locked_preview" || !track.purchaseFeatureKey) return;
    if (accessByTrackId[track.id]?.hasFullAccess) return;

    const refreshKey = `${track.id}:${track.purchaseFeatureKey}`;
    if (accessRefreshTrackIdsRef.current[track.id] === refreshKey) return;
    accessRefreshTrackIdsRef.current[track.id] = refreshKey;
    void refreshMusicAccess([track]);
  }, [accessByTrackId, passCoversAll, player.currentTrack, refreshMusicAccess]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const resetMusicAccess = () => {
      accessRefreshTrackIdsRef.current = {};
      setAccessByTrackId({});
      setPassCoversAll(false);
      window.setTimeout(() => {
        void refreshMusicAccess(allTracks);
      }, 0);
    };
    const handleAuthChanged = () => resetMusicAccess();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "fortune_auth_user" || event.key === "fortune_auth_token") resetMusicAccess();
    };

    window.addEventListener("cd:auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("cd:auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshMusicAccess]);

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
  const playerStyle: PlayerStyle = {};
  const currentTrackCoverUrl = currentTrack ? resolveTrackAlbumCoverUrl(currentTrack, currentTrackAlbumMode, HUMAN_MODE_COVER_URLS) : "";

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

    if (!isLyricsOpen) {
      setLyricsText("");
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
  }, [isLyricsOpen, player.currentTrack?.id, player.currentTrack?.lyricsLookupKey]);

  useEffect(() => {
    if (!isLyricsOpen) return;
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
  }, [isLyricsOpen, player.currentIndex, player.tracks]);
  const currentTrackHasFullAccess = currentTrack ? hasTrackFullAccess(currentTrack, accessByTrackId, passCoversAll) : false;
  const currentTrackCanDownload = currentTrack ? canDownloadTrack(currentTrack, accessByTrackId) : false;
  const currentTrackPreviewLimit = !currentTrackHasFullAccess ? Number(currentTrack?.previewLimitSeconds || 0) : 0;
  const progressMax = currentTrackPreviewLimit > 0
    ? Math.min(rawProgressMax || currentTrackPreviewLimit, currentTrackPreviewLimit)
    : rawProgressMax;
  const listeningStatusLabel = getListeningStatusLabel(player.isLoading, player.canPlay, player.isPlaying, copy);
  const progressPercent = progressMax > 0
    ? Math.min(100, Math.max(0, (Math.min(player.currentTime, progressMax) / progressMax) * 100))
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
    const track = allTracks.find((candidate) => candidate.id === trackId);
    if (track?.accessTier === "locked_preview") {
      void refreshMusicAccess([track]);
    }
    player.selectTrack(trackId, { play: true });
  }, [player.selectTrack, refreshMusicAccess]);

  const handlePlayToggle = useCallback(() => {
    if (player.isPlaying) {
      player.pause();
    } else {
      void player.play();
    }
  }, [player]);

  const handlePlayAll = useCallback(() => {
    const firstTrack = player.tracks[0];
    if (!firstTrack) return;
    player.selectTrack(firstTrack.id, { play: true });
  }, [player.selectTrack, player.tracks]);

  // 모바일 PortOne 리다이렉트로 handlePurchaseCurrentTrack 의 await 가 죽은 뒤, 복귀한 새 문서에서
  // 해금 반영을 이어받는다. 🔴 kind 는 곡마다 갈리는 featureKey 가 아니라 고정값이고 곡은 args 로 넘긴다
  //    — 복귀 문서는 첫 곡으로 마운트되므로 현재 곡에서 키를 다시 만들면 다른 곡이 열린다.
  const buildResume = usePaidResume("music-track", async (args) => {
    const trackId = typeof args.trackId === "string" ? args.trackId : "";
    const track = trackId ? allTracks.find((candidate) => candidate.id === trackId) : undefined;
    if (!track) return false;
    markTrackFullAccess(track);
    await refreshMusicAccess([track]);
    // 방금 산 곡을 띄워 준다(자동재생은 하지 않는다 — 복귀 직후 재생은 브라우저가 막고 소리가 갑자기 난다).
    player.selectTrack(track.id, { play: false });
    setMusicAccessMessage("");
    return true;
  });

  const handlePurchaseCurrentTrack = useCallback(async () => {
    const track = player.currentTrack;
    if (!track?.purchaseFeatureKey || canDownloadTrack(track, accessByTrackId)) return;
    // 🔴 이 화면은 useCoinGate 를 쓰지 않아 훅의 inFlightRef 백스톱이 없고, 방어가 setPurchasingTrackId
    //    상태 하나뿐이라 리렌더 전의 두 번째 클릭이 그대로 두 번째 결제창을 열 수 있었다.
    if (purchaseBusyRef.current) return;
    purchaseBusyRef.current = true;

    // 이용권으로 이미 재생은 열려 있는데 다운로드만 남은 경우 = 다운로드 구매.
    // 다운로드는 이용권 결제 대상이 아니므로(프로필 카드와 같은 pass 제외 유형) 이용권 선검사를 건너뛰고
    // 곧바로 결제창을 연다 — 단, 단건결제와 월정석은 그대로 동등 노출한다.
    const isDownloadOnlyPurchase = hasTrackFullAccess(track, accessByTrackId, passCoversAll);

    setPurchasingTrackId(track.id);
    setMusicAccessMessage("");
    try {
      const purchaseRequestId = `music-track:${track.purchaseFeatureKey}:${Date.now()}`;
      const result = await runBillingCoinGate({
        featureKey: track.purchaseFeatureKey,
        categoryKey: "music-track",
        reason: "Code Destiny music full track unlock",
        productId: `unlock.${track.purchaseFeatureKey}`,
        productType: "music_track",
        serviceType: "music_track",
        cost: track.coinCost || MUSIC_TRACK_UNLOCK_COIN_COST,
        amountKRW: track.priceKRW || MUSIC_TRACK_UNLOCK_PRICE_KRW,
        membershipCreditCost: (track.coinCost || MUSIC_TRACK_UNLOCK_COIN_COST) * 10,
        ...(isDownloadOnlyPurchase
          ? {
            allowedPaymentModes: ["direct", "monthly"],
            disablePassFirst: true,
            disablePassChoice: true,
            skipPassProbe: true,
          }
          : {}),
        requestId: purchaseRequestId,
        idempotencyKey: purchaseRequestId,
        resume: buildResume({ trackId: track.id }),
      });

      if (result.ok) {
        markTrackFullAccess(track);
        await refreshMusicAccess([track]);
        return;
      }

      // 실패 원인을 한 문장으로 뭉개면 결제준비 실패·PortOne 설정 누락·PG 거부가 구분되지 않아
      // 사용자도 우리도 "그냥 안 된다"만 보게 된다. 서버/런타임이 준 메시지를 그대로 살린다.
      const failureCode = String(result.error?.code || "").toUpperCase();
      if (failureCode === "PAYMENT_CANCELLED") return;
      if (failureCode === "CLIENT_AMOUNT_MISMATCH") {
        setMusicAccessMessage(copy.priceChanged);
        return;
      }
      setMusicAccessMessage(result.message || copy.purchaseFailed);
    } catch {
      setMusicAccessMessage(copy.purchaseFailed);
    } finally {
      setPurchasingTrackId("");
      purchaseBusyRef.current = false;
    }
  }, [accessByTrackId, copy.priceChanged, copy.purchaseFailed, markTrackFullAccess, passCoversAll, player.currentTrack, refreshMusicAccess]);

  const handleDownloadCurrentTrack = useCallback(() => {
    const track = player.currentTrack;
    if (!track || !canDownloadTrack(track, accessByTrackId)) return;

    const downloadUrl = buildDownloadUrl(track, accessByTrackId);
    if (!downloadUrl || typeof document === "undefined") return;

    triggerTrackDownload(downloadUrl, track.downloadFileName || "code-destiny-track.mp3");
  }, [accessByTrackId, player.currentTrack]);

  const handleExploreMoods = useCallback(() => {
    if (typeof document === "undefined") return;
    const moodFilter = document.querySelector<HTMLElement>("[data-mood-filter-nav='true']");
    moodFilter?.scrollIntoView({ behavior: "smooth", block: "center" });
    moodFilter?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, []);

  const handleFeaturedSaveToggle = useCallback(() => {
    const trackId = player.currentTrack?.id;
    if (!trackId) return;

    setSavedTrackIds((current) => {
      if (current[trackId]) {
        const next = { ...current };
        delete next[trackId];
        return next;
      }

      return { ...current, [trackId]: true };
    });
  }, [player.currentTrack?.id]);

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
          <div className={`${styles.moonLibraryFrame} mx-auto animate-fade-in-up`}>
            <MoonLibraryHero
              tracksCount={player.tracks.length}
              copy={copy}
              onPlayAll={handlePlayAll}
              onExploreMoods={handleExploreMoods}
            />

            <FeaturedTrackCard
              track={currentTrack}
              coverUrl={currentTrackCoverUrl}
              coverFailed={coverFailed}
              isPlaying={player.isPlaying}
              isSaved={isCurrentTrackSaved}
              hasFullAccess={currentTrackHasFullAccess}
              canDownload={currentTrackCanDownload}
              isPurchasing={purchasingTrackId === currentTrack.id}
              listeningStatusLabel={listeningStatusLabel}
              copy={copy}
              canToggleAlbumMode={canToggleAlbumMode}
              albumModeSwitchLabel={albumModeSwitchLabel}
              currentTrackAlbumMode={currentTrackAlbumMode}
              nowPlayingShared={nowPlayingShared}
              onAlbumModeToggle={handleAlbumModeToggle}
              onCoverLoad={markCoverLoaded}
              onCoverError={markCoverFailed}
              onPlayToggle={handlePlayToggle}
              onPurchase={handlePurchaseCurrentTrack}
              onDownload={handleDownloadCurrentTrack}
              onSaveToggle={handleFeaturedSaveToggle}
              onShare={() => void handleShareNowPlaying()}
            />

            <div className={styles.libraryContent}>
              <div className={styles.libraryControlRail}>
                <div className={`${styles.controlDeck} shadow-violet-neon`}>
                  <div className={styles.controlRow}>
                    <button className={styles.iconButton} type="button" onClick={player.previous} aria-label={copy.previousTrack}>
                      <SkipBack size={18} />
                    </button>
                    <button
                      className={`${styles.playButton} shadow-violet-neon-focus`}
                      type="button"
                      onClick={handlePlayToggle}
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
                    <span>{formatTime(progressMax)}</span>
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

                {musicAccessMessage ? (
                  <p className={styles.musicAccessMessage} role="status">
                    {musicAccessMessage}
                  </p>
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
                tracks={playlistTracks}
                failedCoverIds={failedCoverIds}
                onActiveTabChange={setPlaylistThemeMode}
                onCoverError={handlePlaylistCoverError}
                onSelectTrack={handlePlaylistTrackSelect}
              />
            </div>
          </div>
          <StickyMoonPlayer
            track={currentTrack}
            isPlaying={player.isPlaying}
            muted={player.muted}
            progressPercent={progressPercent}
            copy={copy}
            onPrevious={player.previous}
            onPlayToggle={handlePlayToggle}
            onNext={player.next}
            onMuteToggle={player.toggleMute}
          />
        </>
      ) : null}
    </section>
  );
}

