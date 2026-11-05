"use client";

// 휴먼 디자인 '풀이 문장'의 열람 권한. 사주 영구 묶음을 가진 저장 프로필의 차트에서만 열린다.
//
// 🔴 열림 조건은 셋이 모두 맞을 때뿐이다.
//    1) 저장 프로필(seed.profileId)이 있다 — 직접 입력은 잠긴다.
//    2) 지금 보는 차트가 그 저장 프로필의 출생 정보로 만든 것이다.
//    3) 서버(/api/access/unlocks)가 그 프로필의 묶음 행을 돌려줬다. 조회가 실패하면 잠긴 채로 둔다.
// 🔴 `_copy/living-guide` 는 열림이 확인된 뒤에만 동적 import 로 읽는다. 정적 import 를 두면
//    풀이 문장이 이 화면의 첫 번들에 실려 잠금이 의미를 잃는다. 단, 문장은 공개 JS 청크에
//    있으므로 청크 주소를 직접 아는 사람이 내려받는 것까지 막지는 못한다(화면 잠금의 한계).
import { useEffect, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import type { AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";

export type GuideApi = typeof import("../_copy/living-guide");
export type HdGuide = NonNullable<ReturnType<GuideApi["buildGuide"]>>;
export type GuideBirth = { birthDate: string; birthTime: string; timezone: string; calendar: string };
export type GuideState = "locked" | "checking" | "open";

export const HD_GUIDE_BUNDLE_KEY = "saju_lifetime_bundle";

/** 차트를 만든 출생 정보가 저장 프로필의 것과 같은가. 시간대는 프로필에 있을 때만 비교한다. */
export function birthMatchesSeed(birth: GuideBirth | null, seed: AiPrefillSeed | null): boolean {
  if (!birth || !seed || !seed.birthDate) return false;
  const seedCalendar = seed.calendarType === "lunar" ? (seed.isLeapMonth ? "lunar-leap" : "lunar") : "solar";
  const seedTime = seed.birthTimeUnknown ? "" : seed.birthTime || "";
  if (birth.birthDate !== seed.birthDate) return false;
  if (birth.birthTime !== seedTime) return false;
  if (birth.calendar !== seedCalendar) return false;
  if (seed.timezone && birth.timezone !== seed.timezone) return false;
  return true;
}

/** 저장 프로필에 묶음 권한이 있는가. 실패·미로그인·응답 이상은 모두 false. */
export async function fetchBundleUnlocked(profileId: string): Promise<boolean> {
  try {
    const url = `/api/access/unlocks?profileId=${encodeURIComponent(profileId)}&serviceKey=saju`;
    const response = await authFetch(url, { method: "GET", cache: "no-store" }, { retryOn401: false, forceFresh: true });
    if (!response.ok) return false;
    const data = (await response.json()) as {
      ok?: boolean;
      unlocks?: Record<string, { unlocked?: boolean } | undefined>;
      unlockedContentKeys?: string[];
    };
    if (!data || data.ok !== true) return false;
    if (data.unlocks?.[HD_GUIDE_BUNDLE_KEY]?.unlocked === true) return true;
    return Array.isArray(data.unlockedContentKeys) && data.unlockedContentKeys.includes(HD_GUIDE_BUNDLE_KEY);
  } catch {
    return false;
  }
}

/** 풀이 문장 모듈은 열림이 확인된 뒤에만 읽는다. */
export function loadGuideApi(): Promise<GuideApi> {
  return import("../_copy/living-guide");
}

export function useHumanDesignGuide(seed: AiPrefillSeed | null, birth: GuideBirth | null) {
  const profileId = String(seed?.profileId || "").trim();
  const eligible = Boolean(profileId && birth && birthMatchesSeed(birth, seed));

  // 조회 결과는 어느 프로필에 대한 것인지와 함께 둔다. 프로필이 바뀌면 이전 결과는 쓰지 않는다.
  const [owned, setOwned] = useState<{ profileId: string; open: boolean } | null>(null);
  const [api, setApi] = useState<GuideApi | null>(null);

  useEffect(() => {
    if (!eligible) return undefined;
    let cancelled = false;
    void fetchBundleUnlocked(profileId).then((open) => {
      if (!cancelled) setOwned({ profileId, open });
    });
    return () => { cancelled = true; };
  }, [eligible, profileId]);

  const granted = eligible && owned?.profileId === profileId && owned.open;

  useEffect(() => {
    if (!granted) return undefined;
    let cancelled = false;
    void loadGuideApi().then((mod) => {
      if (!cancelled) setApi(mod);
    }).catch(() => { /* 읽지 못하면 잠긴 채로 둔다. 차트는 그대로 보인다. */ });
    return () => { cancelled = true; };
  }, [granted]);

  const guideApi = granted ? api : null;
  let state: GuideState = "locked";
  if (guideApi) state = "open";
  else if (eligible && (!owned || owned.profileId !== profileId || owned.open)) state = "checking";
  return { state, guideApi };
}
