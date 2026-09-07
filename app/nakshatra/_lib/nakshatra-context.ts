"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  birthFromProfileSeed,
  cardToFormValues,
  fetchNakshatraProfileCards,
  ianaOffsetHours,
  type NakshatraBirthInput,
} from "../nakshatra-birth";
import { seedFromDestinyProfile } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import {
  fetchCurrentDestinyProfile,
  type DestinyProfileCard,
} from "@/app/_lib/profile-card-storage";


export const NAKSHATRA_RESULT_STORAGE_KEY = "nakshatra:result:v1";

export interface NakshatraNatalLabel {
  sukuyoKo: string;
  sukuyoHan: string;
  nakshatraKo: string;
  nakshatraEn: string;
}

export type NakshatraSelectionSource = "result" | "profile" | null;
export type NakshatraProfileError = "card" | "network" | "";

export interface NakshatraProfileContext {
  birth: NakshatraBirthInput | null;
  natal: NakshatraNatalLabel | null;
  profiles: DestinyProfileCard[];
  profilesLoading: boolean;
  selecting: boolean;
  ready: boolean;
  selectedProfileId: string | null;
  selectionSource: NakshatraSelectionSource;
  error: NakshatraProfileError;
  selectProfile: (profile: DestinyProfileCard) => Promise<void>;
  setGender: (gender: "male" | "female") => void;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

export function profileId(profile: DestinyProfileCard): string {
  return String(profile.id || profile.profileId || profile.name || "").trim();
}

function natalFromResult(value: unknown): NakshatraNatalLabel | null {
  const parsed = asRecord(value);
  const dongyang = asRecord(parsed.dongyang);
  const india = asRecord(parsed.india);
  const summary = asRecord(parsed.summary);
  const natal = {
    sukuyoKo: text(dongyang.nameKo),
    sukuyoHan: text(dongyang.nameHan),
    nakshatraKo: text(india.nameKo || summary.nakshatraKo),
    nakshatraEn: text(india.nameEn || summary.nakshatraEn),
  };
  return natal.sukuyoKo || natal.nakshatraKo ? natal : null;
}

function birthFromResult(value: unknown): NakshatraBirthInput | null {
  const input = asRecord(asRecord(value).input);
  if (!Number(input.year) || !Number(input.month) || !Number(input.day)) return null;
  return {
    year: Number(input.year),
    month: Number(input.month),
    day: Number(input.day),
    hour: Number(input.hour ?? 12),
    minute: Number(input.minute ?? 0),
    timezone: Number(input.timezone ?? 9),
    lat: Number(input.lat ?? 37.5665),
    lon: Number(input.lon ?? 126.978),
    timeUnknown: Boolean(input.timeUnknown),
    gender: input.gender === "male" || input.gender === "female" ? input.gender : "",
  };
}

function readStoredResult(): { birth: NakshatraBirthInput; natal: NakshatraNatalLabel | null } | null {
  try {
    const raw = sessionStorage.getItem(NAKSHATRA_RESULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const birth = birthFromResult(parsed);
    return birth ? { birth, natal: natalFromResult(parsed) } : null;
  } catch {
    return null;
  }
}

async function resolveNatal(birth: NakshatraBirthInput): Promise<NakshatraNatalLabel | null> {
  const response = await fetch("/api/nakshatra/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(birth),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) return null;
  return natalFromResult(data);
}

async function birthFromCard(profile: DestinyProfileCard): Promise<NakshatraBirthInput | null> {
  const values = await cardToFormValues(profile);
  const seed = seedFromDestinyProfile(profile);
  if (!values) return null;
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  if (!year || !month || !day) return null;
  const hour = values.timeUnknown ? 12 : Number(values.hour || 12);
  const minute = values.timeUnknown ? 0 : Number(values.minute || 0);
  return {
    year,
    month,
    day,
    hour,
    minute,
    timezone: ianaOffsetHours(year, month, day, hour, minute, values.timezone, 9),
    lat: Number(values.latitude) || 37.5665,
    lon: Number(values.longitude) || 126.978,
    timeUnknown: values.timeUnknown,
    gender: seed.gender === "male" || seed.gender === "female" ? seed.gender : "",
  };
}

export function useNakshatraProfileContext(): NakshatraProfileContext {
  const { seed: profileSeed } = useAiProfileSeed();
  const [birth, setBirth] = useState<NakshatraBirthInput | null>(null);
  const [natal, setNatal] = useState<NakshatraNatalLabel | null>(null);
  const [profiles, setProfiles] = useState<DestinyProfileCard[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectionSource, setSelectionSource] = useState<NakshatraSelectionSource>(null);
  const [error, setError] = useState<NakshatraProfileError>("");

  useEffect(() => {
    let cancelled = false;
    const stored = readStoredResult();
    if (stored) {
      setBirth(stored.birth);
      setNatal(stored.natal);
      setSelectionSource("result");
      setReady(true);
    }

    void Promise.all([
      fetchNakshatraProfileCards(),
      fetchCurrentDestinyProfile(),
    ]).then(([cards, current]) => {
      if (cancelled) return;
      setProfiles(cards);
      setProfilesLoading(false);
      if (!stored && current) {
        void birthFromCard(current).then((derived) => {
          if (cancelled || !derived) return;
          setBirth(derived);
          setSelectedProfileId(profileId(current));
          setSelectionSource("profile");
          void resolveNatal(derived).then((summary) => {
            if (!cancelled && summary) setNatal(summary);
          });
        });
      } else if (!stored && profileSeed) {
        const derived = birthFromProfileSeed(profileSeed);
        if (derived) {
          setBirth(derived);
          setSelectionSource("profile");
        }
      }
      setReady(true);
    }).catch(() => {
      if (cancelled) return;
      setProfilesLoading(false);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [profileSeed]);

  const selectProfile = useCallback(async (profile: DestinyProfileCard) => {
    if (selecting) return;
    setSelecting(true);
    setError("");
    try {
      const derived = await birthFromCard(profile);
      if (!derived) {
        setError("card");
        return;
      }
      const summary = await resolveNatal(derived);
      setBirth((previous) => ({ ...derived, gender: derived.gender || previous?.gender || "" }));
      setNatal(summary);
      setSelectedProfileId(profileId(profile));
      setSelectionSource("profile");
    } catch {
      setError("network");
    } finally {
      setSelecting(false);
    }
  }, [selecting]);

  const setGender = useCallback((gender: "male" | "female") => {
    setBirth((previous) => (previous ? { ...previous, gender } : previous));
  }, []);

  return useMemo(() => ({
    birth,
    natal,
    profiles,
    profilesLoading,
    selecting,
    ready,
    selectedProfileId,
    selectionSource,
    error,
    selectProfile,
    setGender,
  }), [birth, error, natal, profiles, profilesLoading, ready, selectProfile, selectedProfileId, selecting, selectionSource, setGender]);
}
