"use client";

import { authFetch } from "./auth-client";

export type DestinyProfileCard = {
  id?: string;
  profileId?: string;
  userId?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthDateDigits?: string;
  birthTime?: string;
  birthIso?: string;
  birthYear?: number | string;
  birthMonth?: number | string;
  birthDay?: number | string;
  birthHour?: number | string | null;
  birthMinute?: number | string | null;
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
export const ACTIVE_PROFILE_ID_KEY = "code-destiny.activeProfileId";
export const ACTIVE_PROFILE_CACHE_KEY = "code-destiny.activeProfileCache.v1";
const GUEST_PROFILE_KEY = "codeDestiny:guestProfile";
const LEGACY_PROFILE_KEYS = [
  "birthData",
  "selectedBirthData",
  "fptiProfile",
  "yeoniProfile",
  "sajuProfile",
  "fortuneProfile",
  "currentProfile",
  "profileCard",
  "profileCache",
  "selectedProfile",
  "selectedProfileId",
  "oldActiveProfile",
  "mockProfile",
  "defaultProfile",
  "sampleProfile",
];

function toProfileInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function isValidBirthDateParts(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year
    && check.getUTCMonth() === month - 1
    && check.getUTCDate() === day;
}

function parseProfileBirthDateText(value: unknown): { year: number; month: number; day: number } | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const datePart = raw.split(/[T\s]/)[0] || raw;
  if (!/[-./]/.test(datePart) && datePart.replace(/\D/g, "").length !== 8) return null;
  const matched = datePart.match(/^(\d{4})[-./]?(\d{1,2})[-./]?(\d{1,2})$/);
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  return isValidBirthDateParts(year, month, day) ? { year, month, day } : null;
}

export function resolveDestinyProfileBirthParts(profile: DestinyProfileCard | null | undefined): { year: number; month: number; day: number } | null {
  if (!profile) return null;
  const birth = profile.birth || {};
  const year = toProfileInt(birth.year ?? profile.birthYear);
  const month = toProfileInt(birth.month ?? profile.birthMonth);
  const day = toProfileInt(birth.day ?? profile.birthDay);
  if (year !== null && month !== null && day !== null && isValidBirthDateParts(year, month, day)) {
    return { year, month, day };
  }
  return parseProfileBirthDateText(profile.birthDate)
    || parseProfileBirthDateText(profile.birthIso)
    || parseProfileBirthDateText((profile as DestinyProfileCard & { birthday?: string }).birthday)
    || parseProfileBirthDateText((profile as DestinyProfileCard & { date?: string }).date);
}

export function normalizeDestinyProfileCard(profile: DestinyProfileCard | null | undefined): DestinyProfileCard | null {
  if (!profile || typeof profile !== "object") return null;
  const parts = resolveDestinyProfileBirthParts(profile);
  if (!parts) return { ...profile };
  const birth = profile.birth || {};
  const birthDate = `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  return {
    ...profile,
    birthDate,
    birthDateDigits: birthDate.replace(/\D/g, ""),
    birthYear: parts.year,
    birthMonth: parts.month,
    birthDay: parts.day,
    birth: {
      ...birth,
      year: parts.year,
      month: parts.month,
      day: parts.day,
    },
  };
}

function hasAnyBirthDate(profile: DestinyProfileCard): boolean {
  const normalized = normalizeDestinyProfileCard(profile) || profile;
  const birth = normalized.birth || {};
  return Boolean(
    normalized.birthDate
    || normalized.birthIso
    || normalized.birthYear
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

function isLoggedInProfileScope(scope = readProfileScope()): boolean {
  return Boolean(scope && scope !== "guest");
}

function scopedActiveProfileIdKey(scope = readProfileScope()): string {
  return `${ACTIVE_PROFILE_ID_KEY}::${scope || "guest"}`;
}

function scopedActiveProfileCacheKey(scope = readProfileScope()): string {
  return `${ACTIVE_PROFILE_CACHE_KEY}::${scope || "guest"}`;
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
  const profiles = payload
    .map((item) => normalizeDestinyProfileCard(item as DestinyProfileCard))
    .filter((item): item is DestinyProfileCard => Boolean(item && typeof item === "object"));
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

  const profile = normalizeDestinyProfileCard(payload as DestinyProfileCard);
  return profile && predicate(profile) ? profile : null;
}

export function readCurrentDestinyProfile(
  eventProfile?: unknown,
  predicate: ProfilePredicate = hasAnyBirthDate,
): DestinyProfileCard | null {
  if (typeof window === "undefined") return null;
  const scope = readProfileScope();
  const loggedIn = isLoggedInProfileScope(scope);

  const eventResolved = pickDestinyProfileFromPayload(eventProfile, "", predicate);
  if (eventResolved) return eventResolved;

  if (!loggedIn) {
    const getCurrent = (window as unknown as { __cdGetCurrentDestinyProfile?: () => unknown }).__cdGetCurrentDestinyProfile;
    if (typeof getCurrent === "function") {
      const current = pickDestinyProfileFromPayload(getCurrent(), "", predicate);
      if (current) return current;
    }

    const globalProfile = (window as unknown as { __cdCurrentDestinyProfile?: unknown }).__cdCurrentDestinyProfile;
    const globalResolved = pickDestinyProfileFromPayload(globalProfile, "", predicate);
    if (globalResolved) return globalResolved;
  }

  const activeCached = pickDestinyProfileFromPayload(readStoredJson<unknown>(window.localStorage, scopedActiveProfileCacheKey(scope)), "", predicate)
    || pickDestinyProfileFromPayload(readStoredJson<unknown>(window.sessionStorage, scopedActiveProfileCacheKey(scope)), "", predicate);
  if (activeCached) return activeCached;

  if (!loggedIn) {
    for (const key of [GUEST_PROFILE_KEY, ...PROFILE_BRIDGE_KEYS]) {
      const bridged = pickDestinyProfileFromPayload(readStoredJson<unknown>(window.sessionStorage, key), "", predicate)
        || pickDestinyProfileFromPayload(readStoredJson<unknown>(window.localStorage, key), "", predicate);
      if (bridged) return bridged;
    }
  }

  const currentKeys = [
    `${PROFILE_STORAGE_NS}.current::${scope}`,
    ...(loggedIn ? [] : [`${PROFILE_STORAGE_NS}.current`]),
  ];
  const listKeys = [
    `${PROFILE_STORAGE_NS}.list::${scope}`,
    ...(loggedIn ? [] : [`${PROFILE_STORAGE_NS}.list`]),
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

export function clearLegacyProfileSelectionKeys(deletedProfileId = "") {
  if (typeof window === "undefined") return;
  const stores = [window.localStorage, window.sessionStorage];
  for (const store of stores) {
    for (const key of LEGACY_PROFILE_KEYS) {
      try {
        store.removeItem(key);
      } catch {}
    }
  }
}

export function publishDestinyProfileBridge(profile: DestinyProfileCard) {
  if (typeof window === "undefined") return;
  try {
    const scope = readProfileScope();
    const normalized = normalizeDestinyProfileCard(profile) || profile;
    (window as unknown as { __cdCurrentDestinyProfile?: DestinyProfileCard }).__cdCurrentDestinyProfile = normalized;
    const payload = JSON.stringify(normalized);
    const profileId = String(normalized.id || normalized.profileId || "").trim();
    window.localStorage.setItem(scopedActiveProfileIdKey(scope), profileId);
    window.localStorage.setItem(scopedActiveProfileCacheKey(scope), payload);
    window.sessionStorage.setItem(scopedActiveProfileCacheKey(scope), payload);
    if (!isLoggedInProfileScope(scope)) {
      window.localStorage.setItem(GUEST_PROFILE_KEY, payload);
      window.sessionStorage.setItem(GUEST_PROFILE_KEY, payload);
      window.sessionStorage.setItem("FORTUNE_APP_USER_PROFILE", payload);
      window.localStorage.setItem("FORTUNE_APP_USER_PROFILE", payload);
    } else {
      window.localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
      window.localStorage.removeItem(ACTIVE_PROFILE_CACHE_KEY);
      window.localStorage.removeItem("FORTUNE_APP_USER_PROFILE");
      window.sessionStorage.removeItem("FORTUNE_APP_USER_PROFILE");
    }
  } catch {}
}

export function publishDestinyProfileList(profiles: DestinyProfileCard[], currentId = "") {
  if (typeof window === "undefined") return;
  const scope = readProfileScope();
  const safeProfiles = profiles
    .map((profile) => normalizeDestinyProfileCard(profile))
    .filter((profile): profile is DestinyProfileCard => Boolean(profile && (profile.id || profile.profileId)));
  const nextCurrentId = String(currentId || safeProfiles[0]?.id || safeProfiles[0]?.profileId || "").trim();
  const active = safeProfiles.find((profile) => String(profile.id || profile.profileId || "").trim() === nextCurrentId)
    || safeProfiles[0]
    || null;

  try {
    const payload = JSON.stringify(safeProfiles);
    for (const store of [window.localStorage, window.sessionStorage]) {
      store.setItem(`${PROFILE_STORAGE_NS}.list::${scope}`, payload);
      store.setItem(`${PROFILE_STORAGE_NS}.current::${scope}`, nextCurrentId);
      if (!isLoggedInProfileScope(scope)) {
        store.setItem(`${PROFILE_STORAGE_NS}.list`, payload);
        store.setItem(`${PROFILE_STORAGE_NS}.current`, nextCurrentId);
      } else {
        store.removeItem(`${PROFILE_STORAGE_NS}.list`);
        store.removeItem(`${PROFILE_STORAGE_NS}.current`);
      }
    }
    if (active) {
      publishDestinyProfileBridge(active);
    } else {
      clearActiveDestinyProfileCache();
    }
  } catch {}
}

export function clearActiveDestinyProfileCache(deletedProfileId = "") {
  if (typeof window === "undefined") return;
  try {
    const activeId = String(window.localStorage.getItem(ACTIVE_PROFILE_ID_KEY) || "").trim();
    const scopedActiveId = String(window.localStorage.getItem(scopedActiveProfileIdKey()) || "").trim();
    const currentProfile = (window as unknown as { __cdCurrentDestinyProfile?: DestinyProfileCard }).__cdCurrentDestinyProfile;
    const currentId = String(currentProfile?.id || currentProfile?.profileId || "").trim();
    if (!deletedProfileId || activeId === deletedProfileId || scopedActiveId === deletedProfileId || currentId === deletedProfileId) {
      delete (window as unknown as { __cdCurrentDestinyProfile?: DestinyProfileCard }).__cdCurrentDestinyProfile;
      window.localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
      window.localStorage.removeItem(ACTIVE_PROFILE_CACHE_KEY);
      window.localStorage.removeItem(scopedActiveProfileIdKey());
      window.localStorage.removeItem(scopedActiveProfileCacheKey());
      window.sessionStorage.removeItem(scopedActiveProfileCacheKey());
      window.localStorage.removeItem("FORTUNE_APP_USER_PROFILE");
      window.sessionStorage.removeItem("FORTUNE_APP_USER_PROFILE");
    }
    clearLegacyProfileSelectionKeys(deletedProfileId);
  } catch {}
}

export async function fetchCurrentDestinyProfile(
  predicate: ProfilePredicate = hasAnyBirthDate,
): Promise<DestinyProfileCard | null> {
  if (typeof window === "undefined") return null;
  const localFallback = () => (isLoggedInProfileScope() ? null : readCurrentDestinyProfile(undefined, predicate));

  try {
    const headers = new Headers({ Accept: "application/json" });
    const token = getStoredAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    // 🔴 여기는 raw fetch 였다. 그래서 auth-client 의 authGetInFlight 단일비행 밖에 있었고
    //    (허용목록 authGetDedupeKey 에 /api/profile 이 이미 들어 있는데도) 같은 순간 다른
    //    소비자가 /api/profile 을 부르면 네트워크 요청이 그대로 두 발이 됐다.
    //    실측 2026-08-21: 로그인 홈 진입 150초 창에 /api/profile 5회.
    //    Authorization 은 위에서 직접 넣는다 — buildAuthRequest 는 이미 있는 헤더를 덮지 않으므로
    //    웹의 레거시 토큰 경로가 종전 그대로 유지된다.
    const response = await authFetch("/api/profile", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers,
    });
    if (!response.ok) return localFallback();

    const payload = await response.json();
    const currentId = String(payload?.currentId || "").trim();
    const localProfileId = String(window.localStorage.getItem(scopedActiveProfileIdKey()) || "").trim();
    if (localProfileId && currentId && localProfileId !== currentId) {
      console.warn("[ProfileSync] local profile mismatch. Server profile will be used.", {
        serverProfileId: currentId,
        localProfileId,
        fields: ["profileId"],
      });
    }
    if (Array.isArray(payload?.profiles)) publishDestinyProfileList(payload.profiles, currentId);
    const profile = pickDestinyProfileFromPayload(payload, currentId, predicate);
    if (profile) publishDestinyProfileBridge(profile);
    return profile || localFallback();
  } catch {
    return localFallback();
  }
}

export function isDestinyProfileStorageKey(key: string | null): boolean {
  if (!key) return false;
  return key === ACTIVE_PROFILE_ID_KEY
    || key === ACTIVE_PROFILE_CACHE_KEY
    || key.startsWith(`${ACTIVE_PROFILE_ID_KEY}::`)
    || key.startsWith(`${ACTIVE_PROFILE_CACHE_KEY}::`)
    || PROFILE_BRIDGE_KEYS.includes(key)
    || key === GUEST_PROFILE_KEY
    || LEGACY_PROFILE_KEYS.includes(key)
    || key.startsWith(PROFILE_STORAGE_NS);
}
