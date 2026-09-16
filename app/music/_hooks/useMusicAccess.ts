"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadPaidServiceRuntimeGate, runBillingCoinGate } from "@/app/_lib/billing-client";
import { usePaidResume } from "@/app/hooks/usePaidResume";
import { runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { MUSIC_TRACK_UNLOCK_COIN_COST, MUSIC_TRACK_UNLOCK_PRICE_KRW } from "@/lib/music-access-policy";
import { allTracks, type Track } from "../_data/musicManifest";

// /music 의 접근권·구매·다운로드 로직. MusicPlayerExample.tsx 에 있던 원문을 그대로 옮겼다(2026-09-16).
// 결제 계약(paid-gate-auditor 감사 항목)은 여기서만 바뀐다:
// - runBillingCoinGate 의 categoryKey "music-track" 리터럴, requestId === idempotencyKey
// - 다운로드 전용 분기에서만 allowedPaymentModes/disablePassChoice
// - usePaidResume("music-track") 고정 kind + args.trackId
// - purchaseBusyRef 단일 인스턴스, 결제는 사용자 클릭에서만

export type MusicAccessEntry = {
  trackId: string;
  audioSourceKey: string;
  featureKey: string;
  hasFullAccess: boolean;
  canDownload?: boolean;
  audioUrl?: string;
  downloadUrl?: string;
  code?: string;
};
export type MusicAccessMap = Record<string, MusicAccessEntry>;
type MusicAccessResponse = {
  ok?: boolean;
  passCoversAll?: boolean;
  tracks?: MusicAccessEntry[];
  reason?: unknown;
  retryable?: unknown;
};

export type MusicAccessCopy = {
  previewLimitReached: string;
  purchaseFailed: string;
  priceChanged: string;
};

type SelectTrackFn = (trackId: string, options?: { play?: boolean }) => void;

type UseMusicAccessOptions = {
  copy: MusicAccessCopy;
  // 플레이어 훅은 이 훅의 playbackTracks 를 입력으로 받으므로, 결제 복귀 시 곡을 띄우는 selectTrack 은
  // ref 로 늦게 연결한다(오케스트레이터가 useMusicPlayer 뒤에 채운다).
  selectTrackRef: { current: SelectTrackFn | null };
};

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
export function hasTrackFullAccess(track: Track, accessByTrackId: MusicAccessMap, passCoversAll = false) {
  if (track.accessTier === "free_full") return true;
  if (passCoversAll) return true;
  return Boolean(track.id && accessByTrackId[track.id]?.hasFullAccess);
}

// 다운로드는 이용권 커버로 열리지 않는다 — 단건결제·월정석으로 실제 구매한 곡만 파일을 받을 수 있다.
// downloadRequiresPurchase 트랙은 재생이 free_full로 무료여도 다운로드는 서버가 확인한 구매(canDownload)에만 허용한다.
export function canDownloadTrack(track: Track, accessByTrackId: MusicAccessMap) {
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

export function useMusicAccess({ copy, selectTrackRef }: UseMusicAccessOptions) {
  const copyRef = useRef(copy);
  copyRef.current = copy;

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
    setMusicAccessMessage(copyRef.current.previewLimitReached);
    // 미리듣기 URL은 접근 판정을 거치지 않고 서빙된다(성능 최적화). 초기 접근 조회가 일시 장애로
    // 실패했다면 이용권 보유자도 여기서 40초에 끊기므로, 이 순간 한 번 더 접근권을 확인해 자가 복구한다.
    if (track?.id) delete accessRefreshTrackIdsRef.current[track.id];
    void refreshMusicAccess(allTracks);
  }, [refreshMusicAccess]);

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

  // 현재 곡이 잠금 미리듣기이고 아직 열리지 않았으면 곡당 한 번만 접근권을 다시 묻는다.
  const ensureTrackAccess = useCallback((track: Track | null) => {
    if (passCoversAll) return;
    if (!track || track.accessTier !== "locked_preview" || !track.purchaseFeatureKey) return;
    if (accessByTrackId[track.id]?.hasFullAccess) return;

    const refreshKey = `${track.id}:${track.purchaseFeatureKey}`;
    if (accessRefreshTrackIdsRef.current[track.id] === refreshKey) return;
    accessRefreshTrackIdsRef.current[track.id] = refreshKey;
    void refreshMusicAccess([track]);
  }, [accessByTrackId, passCoversAll, refreshMusicAccess]);

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

  // 모바일 PortOne 리다이렉트로 purchaseTrack 의 await 가 죽은 뒤, 복귀한 새 문서에서
  // 해금 반영을 이어받는다. 🔴 kind 는 곡마다 갈리는 featureKey 가 아니라 고정값이고 곡은 args 로 넘긴다
  //    — 복귀 문서는 첫 곡으로 마운트되므로 현재 곡에서 키를 다시 만들면 다른 곡이 열린다.
  const buildResume = usePaidResume("music-track", async (args) => {
    const trackId = typeof args.trackId === "string" ? args.trackId : "";
    const track = trackId ? allTracks.find((candidate) => candidate.id === trackId) : undefined;
    if (!track) return false;
    markTrackFullAccess(track);
    await refreshMusicAccess([track]);
    // 방금 산 곡을 띄워 준다(자동재생은 하지 않는다 — 복귀 직후 재생은 브라우저가 막고 소리가 갑자기 난다).
    selectTrackRef.current?.(track.id, { play: false });
    setMusicAccessMessage("");
    return true;
  });

  const purchaseTrack = useCallback(async (track: Track | null) => {
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
        setMusicAccessMessage(copyRef.current.priceChanged);
        return;
      }
      setMusicAccessMessage(result.message || copyRef.current.purchaseFailed);
    } catch {
      setMusicAccessMessage(copyRef.current.purchaseFailed);
    } finally {
      setPurchasingTrackId("");
      purchaseBusyRef.current = false;
    }
  }, [accessByTrackId, buildResume, markTrackFullAccess, passCoversAll, refreshMusicAccess]);

  const downloadTrack = useCallback((track: Track | null) => {
    if (!track || !canDownloadTrack(track, accessByTrackId)) return;

    const downloadUrl = buildDownloadUrl(track, accessByTrackId);
    if (!downloadUrl || typeof document === "undefined") return;

    triggerTrackDownload(downloadUrl, track.downloadFileName || "code-destiny-track.mp3");
  }, [accessByTrackId]);

  return {
    accessByTrackId,
    passCoversAll,
    playbackTracks,
    purchasingTrackId,
    musicAccessMessage,
    setMusicAccessMessage,
    refreshMusicAccess,
    ensureTrackAccess,
    handlePreviewLimitReached,
    purchaseTrack,
    downloadTrack,
  };
}
