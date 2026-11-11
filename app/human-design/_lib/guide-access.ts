"use client";

// 정적 생활 해석은 무료다. 로그인한 계정의 저장 프로필과 차트 출생정보 일치를 유지한다.
import { useEffect, useState, useRef } from "react";
import { authFetch, AUTH_SESSION_INVALIDATED_EVENT } from "@/app/_lib/auth-client";
import type { AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";

export type GuideApi = typeof import("../_copy/living-guide");
export type HdGuide = NonNullable<ReturnType<GuideApi["buildGuide"]>>;
export type GuideBirth = { birthDate: string; birthTime: string; timezone: string; calendar: string };
export type GuideState = "locked" | "checking" | "open";

export const HD_GUIDE_FEATURE_KEY = "human_design_reading";

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

/** Read-only ownership check. No purchase, balance or entitlement request. */
export async function fetchGuideProfileOwned(profileId: string): Promise<boolean> {
  try {
    const response = await authFetch('/api/yeongnyangi/profiles', { method: 'GET', cache: 'no-store' }, { retryOn401: false, forceFresh: true });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.ok === true && Array.isArray(data.profiles) && data.profiles.some((profile: { profileId?: string; id?: string }) => String(profile.profileId || profile.id || '') === profileId);
  } catch { return false; }
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
  const revision = useRef(0);
  const [authEpoch, setAuthEpoch] = useState(0);
  useEffect(() => {
    const clear = () => { revision.current++; setOwned(null); setApi(null); setAuthEpoch(value => value + 1); };
    const events = ['cd:auth-changed', AUTH_SESSION_INVALIDATED_EVENT, 'storage'];
    events.forEach(name => window.addEventListener(name, clear));
    return () => { revision.current++; events.forEach(name => window.removeEventListener(name, clear)); };
  }, []);

  useEffect(() => {
    if (!eligible) return undefined;
    let cancelled = false;
    const version = revision.current;
    void fetchGuideProfileOwned(profileId).then((open) => {
      if (!cancelled && version === revision.current) setOwned({ profileId, open });
    });
    return () => { cancelled = true; };
  }, [eligible, profileId, authEpoch]);

  const granted = eligible && owned?.profileId === profileId && owned.open;

  useEffect(() => {
    if (!granted) return undefined;
    let cancelled = false;
    const version = revision.current;
    void loadGuideApi().then((mod) => {
      if (!cancelled && version === revision.current) setApi(mod);
    }).catch(() => { /* 읽지 못하면 잠긴 채로 둔다. 차트는 그대로 보인다. */ });
    return () => { cancelled = true; };
  }, [granted]);

  const guideApi = granted ? api : null;
  let state: GuideState = "locked";
  if (guideApi) state = "open";
  else if (eligible && (!owned || owned.profileId !== profileId || owned.open)) state = "checking";
  return { state, guideApi };
}
