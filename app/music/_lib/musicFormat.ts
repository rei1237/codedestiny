import { buildMusicPublicUrl, buildResizedAssetUrl } from "@/lib/r2-public-url";
import type { ArtistKey, Track } from "../_data/musicManifest";

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function buildMusicShareUrl(trackId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://code-destiny.com";
  const url = new URL("/music", origin);
  url.searchParams.set("track", trackId);
  url.searchParams.set("from", "share");
  return url.toString();
}

export async function copyMusicShareText(text: string) {
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

function safeBuildMusicPublicUrl(objectKey: string) {
  try {
    return buildMusicPublicUrl(objectKey);
  } catch {
    return "";
  }
}

// 인간 모드 커버(옛 "앨범 모드" 토글의 인간 쪽). 사용자 결정(2026-09-16): 토글을 없애고
// 인간 커버가 있는 아티스트(yeoni, dest1nova)는 항상 인간 커버, 없으면 매니페스트 커버를 쓴다.
const HUMAN_MODE_COVER_KEYS = {
  yeoni: "연이 인간 모드 앨범.webp",
  dest1novaVol1: "데스티노바 인간버전 앨범 데뷔.webp",
  dest1novaVol2: "데스티노바 인간버전 앨범2.webp",
};
const DEST1NOVA_SECOND_ALBUM_MARKER = /DEST1NOVA\/DEST1NOVA\s*2/;

export const HUMAN_MODE_COVER_URLS = {
  yeoni: safeBuildMusicPublicUrl(`humanmode/${HUMAN_MODE_COVER_KEYS.yeoni}`),
  dest1novaVol1: safeBuildMusicPublicUrl(`humanmode/${HUMAN_MODE_COVER_KEYS.dest1novaVol1}`),
  dest1novaVol2: safeBuildMusicPublicUrl(`humanmode/${HUMAN_MODE_COVER_KEYS.dest1novaVol2}`),
};

export function resolveCoverUrl(track: Track | null) {
  if (!track) return "";

  if (track.artistKey === "yeoni" && HUMAN_MODE_COVER_URLS.yeoni) {
    return HUMAN_MODE_COVER_URLS.yeoni;
  }

  if (track.artistKey === "dest1nova") {
    const isSecondAlbum = DEST1NOVA_SECOND_ALBUM_MARKER.test(track.audioKey);
    if (isSecondAlbum && HUMAN_MODE_COVER_URLS.dest1novaVol2) return HUMAN_MODE_COVER_URLS.dest1novaVol2;
    if (HUMAN_MODE_COVER_URLS.dest1novaVol1) return HUMAN_MODE_COVER_URLS.dest1novaVol1;
  }

  return track.coverUrl;
}

// 커버는 96px 박스에 들어가므로 원본(183KB) 대신 Cloudflare Image Resizing 으로 줄인다.
// 2026-09-16 HEAD 실측: music.code-destiny.com 원본 183,562B → width=192 변환 10,314B(jpeg), cf-resized ok.
// 실패하면 <img onError> 로 원본 URL 로 되돌린다.
export const COVER_RENDER_WIDTH = 192;

export function buildCoverSrc(coverUrl: string) {
  if (!coverUrl) return "";
  return buildResizedAssetUrl(coverUrl, { width: COVER_RENDER_WIDTH });
}

export type ArtistFilterKey = "all" | ArtistKey;

export const ARTIST_FILTERS: ReadonlyArray<{ key: ArtistFilterKey; label: string }> = [
  { key: "all", label: "ALL" },
  { key: "neo", label: "NEO" },
  { key: "yeoni", label: "YEONI" },
  { key: "dest1nova", label: "DEST1NOVA" },
  { key: "lunabloom", label: "LUNA BLOOM" },
  { key: "meditation", label: "MEDITATION" },
];

// destinycafe 는 YEONI 칩에 포함한다(옛 MusicPlaylistPanel 과 동일).
export function doesTrackMatchFilter(track: Track, filter: ArtistFilterKey) {
  if (filter === "all") return true;
  if (filter === "yeoni") return track.artistKey === "yeoni" || track.artistKey === "destinycafe";
  return track.artistKey === filter;
}

export function normalizeSearchText(value: string) {
  return value.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}
