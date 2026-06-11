"use client";

export type DestinyProfileCard = {
  id?: string;
  profileId?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthIso?: string;
  birthYear?: number | string;
  birthMonth?: number | string;
  birthDay?: number | string;
  birthHour?: number | string;
  birthMinute?: number | string;
  calType?: string;
  calendarType?: string;
  timeUnknown?: boolean;
  birthTimeUnknown?: boolean;
  noBirthTime?: boolean;
  birthRegion?: string;
  birth?: {
    year?: number | string;
    month?: number | string;
    day?: number | string;
    hour?: number | string;
    minute?: number | string;
    calType?: string;
    timeUnknown?: boolean;
  };
  location?: {
    label?: string;
    tz?: string;
    lng?: number | string;
    lat?: number | string;
  };
};

type ProfilePredicate = (profile: DestinyProfileCard) => boolean;

const PROFILE_STORAGE_NS = "FORTUNE_APP_USER_PROFILES";
const PROFILE_BRIDGE_KEYS = ["FORTUNE_APP_USER_PROFILE", "FORTUNE_APP_VEDIC_PAYLOAD", "OLYMPUS_ORACLE_PROFILE"];

function hasAnyBirthDate(profile: DestinyProfileCard): boolean {
  const birth = profile.birth || {};
  return Boolean(
    profile.birthDate
    || profile.birthIso
    || profile.birthYear
    || (birth.year && birth.month && birth.day),
  );
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readStoredJson<T>(storage: Storage | undefined, key: string): T | null {
  if (!storage) return null;
  return safeParse<T>(storage.getItem(key));
}

function readProfileScope(): string {
  if (typeof window === "undefined") return "guest";
  const user = readStoredJson<Record<string, unknown>>(window.localStorage, "fortune_auth_user");
  return String(user?.id || user?.userId || user?._id || user?.uid || "guest").trim().toLowerCase() || "guest";
}

function getStoredAuthToken(): string {
  if (typeof window === "undefined") return "";
  const keys = ["fortune_auth_token", "cdToken"];
  for (const key of keys) {
    const token = String(window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "").trim();
    if (token) return token;
  }
  return "";
}

function pickProfileFromArray(payload: unknown[], currentId: string, predicate: ProfilePredicate): DestinyProfileCard | null {
  const profiles = payload.filter((item): item is DestinyProfileCard => Boolean(item && typeof item === "object"));
  const requested = currentId.trim();
  if (requested) {
    const matched = profiles.find((item) => String(item.id || item.profileId || "").trim() === requested);
    if (matched && predicate(matched)) return matched;
  }
  return profiles.find((item) => predicate(item)) || null;
}

export function pickDestinyProfileFromPayload(
  payload: unknown,
  currentId = "",
  predicate: ProfilePredicate = hasAnyBirthDate,
): DestinyProfileCard | null {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) return pickProfileFromArray(payload, currentId, predicate);

  const record = payload as Record<string, unknown>;
  const resolvedCurrentId = String(
    currentId
    || record.currentId
    || record.currentProfileId
    || record.selectedProfileId
    || "",
  ).trim();

  const profileList = Array.isArray(record.profiles)
    ? pickDestinyProfileFromPayload(record.profiles, resolvedCurrentId, predicate)
    : null;
  if (profileList) return profileList;

  const nested = record.profile || record.currentProfile || record.destinyProfile || record.payload;
  const nestedProfile = nested && nested !== payload
    ? pickDestinyProfileFromPayload(nested, resolvedCurrentId, predicate)
    : null;
  if (nestedProfile) return nestedProfile;

  const profile = payload as DestinyProfileCard;
  return predicate(profile) ? profile : null;
}

export function readCurrentDestinyProfile(
  eventProfile?: unknown,
  predicate: ProfilePredicate = hasAnyBirthDate,
): DestinyProfileCard | null {
  if (typeof window === "undefined") return null;

  const eventResolved = pickDestinyProfileFromPayload(eventProfile, "", predicate);
  if (eventResolved) return eventResolved;

  const getCurrent = (window as unknown as { __cdGetCurrentDestinyProfile?: () => unknown }).__cdGetCurrentDestinyProfile;
  if (typeof getCurrent === "function") {
    const current = pickDestinyProfileFromPayload(getCurrent(), "", predicate);
    if (current) return current;
  }

  const globalProfile = (window as unknown as { __cdCurrentDestinyProfile?: unknown }).__cdCurrentDestinyProfile;
  const globalResolved = pickDestinyProfileFromPayload(globalProfile, "", predicate);
  if (globalResolved) return globalResolved;

  for (const key of PROFILE_BRIDGE_KEYS) {
    const bridged = pickDestinyProfileFromPayload(readStoredJson<unknown>(window.sessionStorage, key), "", predicate)
      || pickDestinyProfileFromPayload(readStoredJson<unknown>(window.localStorage, key), "", predicate);
    if (bridged) return bridged;
  }

  const scope = readProfileScope();
  const currentKeys = [
    `${PROFILE_STORAGE_NS}.current::${scope}`,
    `${PROFILE_STORAGE_NS}.current`,
  ];
  const listKeys = [
    `${PROFILE_STORAGE_NS}.list::${scope}`,
    `${PROFILE_STORAGE_NS}.list`,
  ];
  const currentId = currentKeys
    .map((key) => String(window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "").trim())
    .find(Boolean) || "";

  for (const key of listKeys) {
    const profile = pickDestinyProfileFromPayload(readStoredJson<unknown>(window.localStorage, key), currentId, predicate)
      || pickDestinyProfileFromPayload(readStoredJson<unknown>(window.sessionStorage, key), currentId, predicate);
    if (profile) return profile;
  }

  return null;
}

function publishDestinyProfileBridge(profile: DestinyProfileCard) {
  if (typeof window === "undefined") return;
  try {
    (window as unknown as { __cdCurrentDestinyProfile?: DestinyProfileCard }).__cdCurrentDestinyProfile = profile;
    window.sessionStorage.setItem("FORTUNE_APP_USER_PROFILE", JSON.stringify(profile));
    window.localStorage.setItem("FORTUNE_APP_USER_PROFILE", JSON.stringify(profile));
  } catch {}
}

export async function fetchCurrentDestinyProfile(
  predicate: ProfilePredicate = hasAnyBirthDate,
): Promise<DestinyProfileCard | null> {
  if (typeof window === "undefined") return null;

  const local = readCurrentDestinyProfile(undefined, predicate);
  if (local) return local;

  try {
    const headers = new Headers({ Accept: "application/json" });
    const token = getStoredAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch("/api/profile", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers,
    });
    if (!response.ok) return null;

    const payload = await response.json();
    const profile = pickDestinyProfileFromPayload(payload, "", predicate);
    if (profile) publishDestinyProfileBridge(profile);
    return profile;
  } catch {
    return null;
  }
}

export function isDestinyProfileStorageKey(key: string | null): boolean {
  if (!key) return false;
  return PROFILE_BRIDGE_KEYS.includes(key) || key.startsWith(PROFILE_STORAGE_NS);
}
