"use client";

import { useCallback, useEffect, useState } from "react";
import { readAiProfileSeed, seedFromDestinyProfile, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { fetchCurrentDestinyProfile, isDestinyProfileStorageKey } from "@/app/_lib/profile-card-storage";

function hasSeedContent(seed: AiPrefillSeed | null | undefined): seed is AiPrefillSeed {
  if (!seed) return false;
  return Boolean(seed.birthDate || seed.name || seed.birthTime || seed.gender);
}

/**
 * 프로필 카드 시드 공용 훅.
 * - 초기값: 로컬 저장소 동기 조회(readAiProfileSeed)
 * - 마운트 후: 로컬 시드가 없을 때만 /api/profile 서버 hydrate (서버에만 있는 카드도 반영)
 * - destinyProfileChanged / storage 이벤트 구독으로 카드 변경 실시간 반영
 * - reload(): "프로필 카드에서 불러오기" 버튼용 명시적 재조회
 */
export function useAiProfileSeed(): {
  seed: AiPrefillSeed | null;
  seedVersion: number;
  reload: () => Promise<AiPrefillSeed | null>;
} {
  const [seed, setSeed] = useState<AiPrefillSeed | null>(null);
  const [seedVersion, setSeedVersion] = useState(0);

  const publishSeed = useCallback((next: AiPrefillSeed | null): AiPrefillSeed | null => {
    if (!hasSeedContent(next)) return null;
    setSeed(next);
    setSeedVersion((version) => version + 1);
    return next;
  }, []);

  const reload = useCallback(async () => {
    try {
      const profile = await fetchCurrentDestinyProfile();
      return publishSeed(seedFromDestinyProfile(profile));
    } catch {
      return null;
    }
  }, [publishSeed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const localSeed = readAiProfileSeed();
    publishSeed(localSeed);

    const hydrateFromApi = () => {
      void fetchCurrentDestinyProfile().then((profile) => {
        if (cancelled || !profile) return;
        publishSeed(seedFromDestinyProfile(profile));
      }).catch(() => {});
    };

    const handleProfileStorage = (event: StorageEvent) => {
      if (event.key && !isDestinyProfileStorageKey(event.key) && event.key !== "fortune_auth_user") return;
      hydrateFromApi();
    };
    const handleProfileChanged = () => hydrateFromApi();

    // 🔴 로컬 시드가 이미 있으면 마운트 시점의 무조건 서버 재조회를 생략한다. 이 재조회가 결제
    // 게이트 클릭(/api/sukuyo-compatibility-ai/prepare, /api/billing/coin-gate 등)과 같은 순간에
    // 겹치면 5-커넥션 Mongo 풀을 다투다 coin-gate 인증 조회가 503으로 죽는 사례가 실측됐다
    // (2026-08-10, worker/lib/auth.js:357-371의 2026-08-09 사례와 동일 클래스). 멀티기기에서 카드를
    // 전환한 드문 경우 이 기기 반영이 늦어질 수 있지만, 카드 전환·재진입 시 destinyProfileChanged/
    // storage 이벤트가 그대로 재조회를 트리거하므로 실제 영향은 작다.
    if (!hasSeedContent(localSeed)) hydrateFromApi();
    window.addEventListener("destinyProfileChanged", handleProfileChanged);
    document.addEventListener("destinyProfileChanged", handleProfileChanged);
    window.addEventListener("storage", handleProfileStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("destinyProfileChanged", handleProfileChanged);
      document.removeEventListener("destinyProfileChanged", handleProfileChanged);
      window.removeEventListener("storage", handleProfileStorage);
    };
    // 마운트 1회 구독 — publishSeed는 안정 참조
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { seed, seedVersion, reload };
}
